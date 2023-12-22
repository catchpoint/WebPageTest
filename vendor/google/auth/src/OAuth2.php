<?php
/*
 * Copyright 2015 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

namespace Google\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Google\Auth\HttpHandler\HttpClientCache;
use Google\Auth\HttpHandler\HttpHandlerFactory;
use GuzzleHttp\Psr7\Query;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Utils;
use InvalidArgumentException;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\UriInterface;

/**
 * OAuth2 supports authentication by OAuth2 2-legged flows.
 *
 * It primary supports
 * - service account authorization
 * - authorization where a user already has an access token
 */
class OAuth2 implements FetchAuthTokenInterface
{
    const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour
    const DEFAULT_SKEW_SECONDS = 60; // 1 minute
    const JWT_URN = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
    const STS_URN = 'urn:ietf:params:oauth:grant-type:token-exchange';
    private const STS_REQUESTED_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';

    /**
     * TODO: determine known methods from the keys of JWT::methods.
     *
     * @var array<string>
     */
    public static $knownSigningAlgorithms = [
        'HS256',
        'HS512',
        'HS384',
        'RS256',
    ];

    /**
     * The well known grant types.
     *
     * @var array<string>
     */
    public static $knownGrantTypes = [
        'authorization_code',
        'refresh_token',
        'password',
        'client_credentials',
    ];

    /**
     * - authorizationUri
     *   The authorization server's HTTP endpoint capable of
     *   authenticating the end-user and obtaining authorization.
     *
     * @var ?UriInterface
     */
    private $authorizationUri;

    /**
     * - tokenCredentialUri
     *   The authorization server's HTTP endpoint capable of issuing
     *   tokens and refreshing expired tokens.
     *
     * @var UriInterface
     */
    private $tokenCredentialUri;

    /**
     * The redirection URI used in the initial request.
     *
     * @var ?string
     */
    private $redirectUri;

    /**
     * A unique identifier issued to the client to identify itself to the
     * authorization server.
     *
     * @var string
     */
    private $clientId;

    /**
     * A shared symmetric secret issued by the authorization server, which is
     * used to authenticate the client.
     *
     * @var string
     */
    private $clientSecret;

    /**
     * The resource owner's username.
     *
     * @var ?string
     */
    private $username;

    /**
     * The resource owner's password.
     *
     * @var ?string
     */
    private $password;

    /**
     * The scope of the access request, expressed either as an Array or as a
     * space-delimited string.
     *
     * @var ?array<string>
     */
    private $scope;

    /**
     * An arbitrary string designed to allow the client to maintain state.
     *
     * @var string
     */
    private $state;

    /**
     * The authorization code issued to this client.
     *
     * Only used by the authorization code access grant type.
     *
     * @var ?string
     */
    private $code;

    /**
     * The issuer ID when using assertion profile.
     *
     * @var ?string
     */
    private $issuer;

    /**
     * The target audience for assertions.
     *
     * @var string
     */
    private $audience;

    /**
     * The target sub when issuing assertions.
     *
     * @var string
     */
    private $sub;

    /**
     * The number of seconds assertions are valid for.
     *
     * @var int
     */
    private $expiry;

    /**
     * The signing key when using assertion profile.
     *
     * @var ?string
     */
    private $signingKey;

    /**
     * The signing key id when using assertion profile. Param kid in jwt header
     *
     * @var string
     */
    private $signingKeyId;

    /**
     * The signing algorithm when using an assertion profile.
     *
     * @var ?string
     */
    private $signingAlgorithm;

    /**
     * The refresh token associated with the access token to be refreshed.
     *
     * @var ?string
     */
    private $refreshToken;

    /**
     * The current access token.
     *
     * @var string
     */
    private $accessToken;

    /**
     * The current ID token.
     *
     * @var string
     */
    private $idToken;

    /**
     * The scopes granted to the current access token
     *
     * @var string
     */
    private $grantedScope;

    /**
     * The lifetime in seconds of the current access token.
     *
     * @var ?int
     */
    private $expiresIn;

    /**
     * The expiration time of the access token as a number of seconds since the
     * unix epoch.
     *
     * @var ?int
     */
    private $expiresAt;

    /**
     * The issue time of the access token as a number of seconds since the unix
     * epoch.
     *
     * @var ?int
     */
    private $issuedAt;

    /**
     * The current grant type.
     *
     * @var ?string
     */
    private $grantType;

    /**
     * When using an extension grant type, this is the set of parameters used by
     * that extension.
     *
     * @var array<mixed>
     */
    private $extensionParams;

    /**
     * When using the toJwt function, these claims will be added to the JWT
     * payload.
     *
     * @var array<mixed>
     */
    private $additionalClaims;

    /**
     * The code verifier for PKCE for OAuth 2.0. When set, the authorization
     * URI will contain the Code Challenge and Code Challenge Method querystring
     * parameters, and the token URI will contain the Code Verifier parameter.
     *
     * @see https://datatracker.ietf.org/doc/html/rfc7636
     * @var ?string
     */
    private $codeVerifier;

    /**
     * For STS requests.
     * A URI that indicates the target service or resource where the client
     * intends to use the requested security token.
     */
    private ?string $resource;

    /**
     * For STS requests.
     * A fetcher for the "subject_token", which is a security token that
     * represents the identity of the party on behalf of whom the request is
     * being made.
     */
    private ?ExternalAccountCredentialSourceInterface $subjectTokenFetcher;

    /**
     * For STS requests.
     * An identifier, that indicates the type of the security token in the
     * subjectToken parameter.
     */
    private ?string $subjectTokenType;

    /**
     * For STS requests.
     * A security token that represents the identity of the acting party.
     */
    private ?string $actorToken;

    /**
     * For STS requests.
     * An identifier that indicates the type of the security token in the
     * actorToken parameter.
     */
    private ?string $actorTokenType;

    /**
     * From STS response.
     * An identifier for the representation of the issued security token.
     */
    private ?string $issuedTokenType = null;

    /**
     * Create a new OAuthCredentials.
     *
     * The configuration array accepts various options
     *
     * - authorizationUri
     *   The authorization server's HTTP endpoint capable of
     *   authenticating the end-user and obtaining authorization.
     *
     * - tokenCredentialUri
     *   The authorization server's HTTP endpoint capable of issuing
     *   tokens and refreshing expired tokens.
     *
     * - clientId
     *   A unique identifier issued to the client to identify itself to the
     *   authorization server.
     *
     * - clientSecret
     *   A shared symmetric secret issued by the authorization server,
     *   which is used to authenticate the client.
     *
     * - scope
     *   The scope of the access request, expressed either as an Array
     *   or as a space-delimited String.
     *
     * - state
     *   An arbitrary string designed to allow the client to maintain state.
     *
     * - redirectUri
     *   The redirection URI used in the initial request.
     *
     * - username
     *   The resource owner's username.
     *
     * - password
     *   The resource owner's password.
     *
     * - issuer
     *   Issuer ID when using assertion profile
     *
     * - audience
     *   Target audience for assertions
     *
     * - expiry
     *   Number of seconds assertions are valid for
     *
     * - signingKey
     *   Signing key when using assertion profile
     *
     * - signingKeyId
     *   Signing key id when using assertion profile
     *
     * - refreshToken
     *   The refresh token associated with the access token
     *   to be refreshed.
     *
     * - accessToken
     *   The current access token for this client.
     *
     * - idToken
     *   The current ID token for this client.
     *
     * - extensionParams
     *   When using an extension grant type, this is the set of parameters used
     *   by that extension.
     *
     * - codeVerifier
     *   The code verifier for PKCE for OAuth 2.0.
     *
     * - resource
     *   The target service or resource where the client ntends to use the
     *   requested security token.
     *
     * - subjectTokenFetcher
     *    A fetcher for the "subject_token", which is a security token that
     *    represents the identity of the party on behalf of whom the request is
     *    being made.
     *
     * - subjectTokenType
     *   An identifier that indicates the type of the security token in the
     *   subjectToken parameter.
     *
     * - actorToken
     *   A security token that represents the identity of the acting party.
     *
     * - actorTokenType
     *   An identifier for the representation of the issued security token.
     *
     * @param array<mixed> $config Configuration array
     */
    public function __construct(array $config)
    {
        $opts = array_merge([
            'expiry' => self::DEFAULT_EXPIRY_SECONDS,
            'extensionParams' => [],
            'authorizationUri' => null,
            'redirectUri' => null,
            'tokenCredentialUri' => null,
            'state' => null,
            'username' => null,
            'password' => null,
            'clientId' => null,
            'clientSecret' => null,
            'issuer' => null,
            'sub' => null,
            'audience' => null,
            'signingKey' => null,
            'signingKeyId' => null,
            'signingAlgorithm' => null,
            'scope' => null,
            'additionalClaims' => [],
            'codeVerifier' => null,
            'resource' => null,
            'subjectTokenFetcher' => null,
            'subjectTokenType' => null,
            'actorToken' => null,
            'actorTokenType' => null,
        ], $config);

        $this->setAuthorizationUri($opts['authorizationUri']);
        $this->setRedirectUri($opts['redirectUri']);
        $this->setTokenCredentialUri($opts['tokenCredentialUri']);
        $this->setState($opts['state']);
        $this->setUsername($opts['username']);
        $this->setPassword($opts['password']);
        $this->setClientId($opts['clientId']);
        $this->setClientSecret($opts['clientSecret']);
        $this->setIssuer($opts['issuer']);
        $this->setSub($opts['sub']);
        $this->setExpiry($opts['expiry']);
        $this->setAudience($opts['audience']);
        $this->setSigningKey($opts['signingKey']);
        $this->setSigningKeyId($opts['signingKeyId']);
        $this->setSigningAlgorithm($opts['signingAlgorithm']);
        $this->setScope($opts['scope']);
        $this->setExtensionParams($opts['extensionParams']);
        $this->setAdditionalClaims($opts['additionalClaims']);
        $this->setCodeVerifier($opts['codeVerifier']);

        // for STS
        $this->resource = $opts['resource'];
        $this->subjectTokenFetcher = $opts['subjectTokenFetcher'];
        $this->subjectTokenType = $opts['subjectTokenType'];
        $this->actorToken = $opts['actorToken'];
        $this->actorTokenType = $opts['actorTokenType'];

        $this->updateToken($opts);
    }

    /**
     * Verifies the idToken if present.
     *
     * - if none is present, return null
     * - if present, but invalid, raises DomainException.
     * - otherwise returns the payload in the idtoken as a PHP object.
     *
     * The behavior of this method varies depending on the version of
     * `firebase/php-jwt` you are using. In versions 6.0 and above, you cannot
     * provide multiple $allowed_algs, and instead must provide an array of Key
     * objects as the $publicKey.
     *
     * @param string|Key|Key[] $publicKey The public key to use to authenticate the token
     * @param string|array<string> $allowed_algs algorithm or array of supported verification algorithms.
     *        Providing more than one algorithm will throw an exception.
     * @throws \DomainException if the token is missing an audience.
     * @throws \DomainException if the audience does not match the one set in
     *         the OAuth2 class instance.
     * @throws \UnexpectedValueException If the token is invalid
     * @throws \InvalidArgumentException If more than one value for allowed_algs is supplied
     * @throws \Firebase\JWT\SignatureInvalidException If the signature is invalid.
     * @throws \Firebase\JWT\BeforeValidException If the token is not yet valid.
     * @throws \Firebase\JWT\ExpiredException If the token has expired.
     * @return null|object
     */
    public function verifyIdToken($publicKey = null, $allowed_algs = [])
    {
        $idToken = $this->getIdToken();
        if (is_null($idToken)) {
            return null;
        }

        $resp = $this->jwtDecode($idToken, $publicKey, $allowed_algs);
        if (!property_exists($resp, 'aud')) {
            throw new \DomainException('No audience found the id token');
        }
        if ($resp->aud != $this->getAudience()) {
            throw new \DomainException('Wrong audience present in the id token');
        }

        return $resp;
    }

    /**
     * Obtains the encoded jwt from the instance data.
     *
     * @param array<mixed> $config array optional configuration parameters
     * @return string
     */
    public function toJwt(array $config = [])
    {
        if (is_null($this->getSigningKey())) {
            throw new \DomainException('No signing key available');
        }
        if (is_null($this->getSigningAlgorithm())) {
            throw new \DomainException('No signing algorithm specified');
        }
        $now = time();

        $opts = array_merge([
            'skew' => self::DEFAULT_SKEW_SECONDS,
        ], $config);

        $assertion = [
            'iss' => $this->getIssuer(),
            'exp' => ($now + $this->getExpiry()),
            'iat' => ($now - $opts['skew']),
        ];
        foreach ($assertion as $k => $v) {
            if (is_null($v)) {
                throw new \DomainException($k . ' should not be null');
            }
        }
        if (!(is_null($this->getAudience()))) {
            $assertion['aud'] = $this->getAudience();
        }

        if (!(is_null($this->getScope()))) {
            $assertion['scope'] = $this->getScope();
        }

        if (empty($assertion['scope']) && empty($assertion['aud'])) {
            throw new \DomainException('one of scope or aud should not be null');
        }

        if (!(is_null($this->getSub()))) {
            $assertion['sub'] = $this->getSub();
        }
        $assertion += $this->getAdditionalClaims();

        return JWT::encode(
            $assertion,
            $this->getSigningKey(),
            $this->getSigningAlgorithm(),
            $this->getSigningKeyId()
        );
    }

    /**
     * Generates a request for token credentials.
     *
     * @param callable $httpHandler callback which delivers psr7 request
     * @return RequestInterface the authorization Url.
     */
    public function generateCredentialsRequest(callable $httpHandler = null)
    {
        $uri = $this->getTokenCredentialUri();
        if (is_null($uri)) {
            throw new \DomainException('No token credential URI was set.');
        }

        $grantType = $this->getGrantType();
        $params = ['grant_type' => $grantType];
        switch ($grantType) {
            case 'authorization_code':
                $params['code'] = $this->getCode();
                $params['redirect_uri'] = $this->getRedirectUri();
                if ($this->codeVerifier) {
                    $params['code_verifier'] = $this->codeVerifier;
                }
                $this->addClientCredentials($params);
                break;
            case 'password':
                $params['username'] = $this->getUsername();
                $params['password'] = $this->getPassword();
                $this->addClientCredentials($params);
                break;
            case 'refresh_token':
                $params['refresh_token'] = $this->getRefreshToken();
                $this->addClientCredentials($params);
                break;
            case self::JWT_URN:
                $params['assertion'] = $this->toJwt();
                break;
            case self::STS_URN:
                $token = $this->subjectTokenFetcher->fetchSubjectToken($httpHandler);
                $params['subject_token'] = $token;
                $params['subject_token_type'] = $this->subjectTokenType;
                $params += array_filter([
                    'resource'             => $this->resource,
                    'audience'             => $this->audience,
                    'scope'                => $this->getScope(),
                    'requested_token_type' => self::STS_REQUESTED_TOKEN_TYPE,
                    'actor_token'          => $this->actorToken,
                    'actor_token_type'     => $this->actorTokenType,
                ]);
                break;
            default:
                if (!is_null($this->getRedirectUri())) {
                    # Grant type was supposed to be 'authorization_code', as there
                    # is a redirect URI.
                    throw new \DomainException('Missing authorization code');
                }
                unset($params['grant_type']);
                if (!is_null($grantType)) {
                    $params['grant_type'] = $grantType;
                }
                $params = array_merge($params, $this->getExtensionParams());
        }

        $headers = [
            'Cache-Control' => 'no-store',
            'Content-Type' => 'application/x-www-form-urlencoded',
        ];

        return new Request(
            'POST',
            $uri,
            $headers,
            Query::build($params)
        );
    }

    /**
     * Fetches the auth tokens based on the current state.
     *
     * @param callable $httpHandler callback which delivers psr7 request
     * @return array<mixed> the response
     */
    public function fetchAuthToken(callable $httpHandler = null)
    {
        if (is_null($httpHandler)) {
            $httpHandler = HttpHandlerFactory::build(HttpClientCache::getHttpClient());
        }

        $response = $httpHandler($this->generateCredentialsRequest($httpHandler));
        $credentials = $this->parseTokenResponse($response);
        $this->updateToken($credentials);
        if (isset($credentials['scope'])) {
            $this->setGrantedScope($credentials['scope']);
        }

        return $credentials;
    }

    /**
     * Obtains a key that can used to cache the results of #fetchAuthToken.
     *
     * The key is derived from the scopes.
     *
     * @return ?string a key that may be used to cache the auth token.
     */
    public function getCacheKey()
    {
        if (is_array($this->scope)) {
            return implode(':', $this->scope);
        }

        if ($this->audience) {
            return $this->audience;
        }

        // If scope has not set, return null to indicate no caching.
        return null;
    }

    /**
     * Parses the fetched tokens.
     *
     * @param ResponseInterface $resp the response.
     * @return array<mixed> the tokens parsed from the response body.
     * @throws \Exception
     */
    public function parseTokenResponse(ResponseInterface $resp)
    {
        $body = (string)$resp->getBody();
        if ($resp->hasHeader('Content-Type') &&
            $resp->getHeaderLine('Content-Type') == 'application/x-www-form-urlencoded'
        ) {
            $res = [];
            parse_str($body, $res);

            return $res;
        }

        // Assume it's JSON; if it's not throw an exception
        if (null === $res = json_decode($body, true)) {
            throw new \Exception('Invalid JSON response');
        }

        return $res;
    }

    /**
     * Updates an OAuth 2.0 client.
     *
     * Example:
     * ```
     * $oauth->updateToken([
     *     'refresh_token' => 'n4E9O119d',
     *     'access_token' => 'FJQbwq9',
     *     'expires_in' => 3600
     * ]);
     * ```
     *
     * @param array<mixed> $config
     *  The configuration parameters related to the token.
     *
     *  - refresh_token
     *    The refresh token associated with the access token
     *    to be refreshed.
     *
     *  - access_token
     *    The current access token for this client.
     *
     *  - id_token
     *    The current ID token for this client.
     *
     *  - expires_in
     *    The time in seconds until access token expiration.
     *
     *  - expires_at
     *    The time as an integer number of seconds since the Epoch
     *
     *  - issued_at
     *    The timestamp that the token was issued at.
     * @return void
     */
    public function updateToken(array $config)
    {
        $opts = array_merge([
            'extensionParams' => [],
            'access_token' => null,
            'id_token' => null,
            'expires_in' => null,
            'expires_at' => null,
            'issued_at' => null,
            'scope' => null,
        ], $config);

        $this->setExpiresAt($opts['expires_at']);
        $this->setExpiresIn($opts['expires_in']);
        // By default, the token is issued at `Time.now` when `expiresIn` is set,
        // but this can be used to supply a more precise time.
        if (!is_null($opts['issued_at'])) {
            $this->setIssuedAt($opts['issued_at']);
        }

        $this->setAccessToken($opts['access_token']);
        $this->setIdToken($opts['id_token']);

        // The refresh token should only be updated if a value is explicitly
        // passed in, as some access token responses do not include a refresh
        // token.
        if (array_key_exists('refresh_token', $opts)) {
            $this->setRefreshToken($opts['refresh_token']);
        }

        // Required for STS response. An identifier for the representation of
        // the issued security token.
        if (array_key_exists('issued_token_type', $opts)) {
            $this->issuedTokenType = $opts['issued_token_type'];
        }
    }

    /**
     * Builds the authorization Uri that the user should be redirected to.
     *
     * @param array<mixed> $config configuration options that customize the return url.
     * @return UriInterface the authorization Url.
     * @throws InvalidArgumentException
     */
    public function buildFullAuthorizationUri(array $config = [])
    {
        if (is_null($this->getAuthorizationUri())) {
            throw new InvalidArgumentException(
                'requires an authorizationUri to have been set'
            );
        }

        $params = array_merge([
            'response_type' => 'code',
            'access_type' => 'offline',
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'state' => $this->state,
            'scope' => $this->getScope(),
        ], $config);

        // Validate the auth_params
        if (is_null($params['client_id'])) {
            throw new InvalidArgumentException(
                'missing the required client identifier'
            );
        }
        if (is_null($params['redirect_uri'])) {
            throw new InvalidArgumentException('missing the required redirect URI');
        }
        if (!empty($params['prompt']) && !empty($params['approval_prompt'])) {
            throw new InvalidArgumentException(
                'prompt and approval_prompt are mutually exclusive'
            );
        }
        if ($this->codeVerifier) {
            $params['code_challenge'] = $this->getCodeChallenge($this->codeVerifier);
            $params['code_challenge_method'] = $this->getCodeChallengeMethod();
        }

        // Construct the uri object; return it if it is valid.
        $result = clone $this->authorizationUri;
        $existingParams = Query::parse($result->getQuery());

        $result = $result->withQuery(
            Query::build(array_merge($existingParams, $params))
        );

        if ($result->getScheme() != 'https') {
            throw new InvalidArgumentException(
                'Authorization endpoint must be protected by TLS'
            );
        }

        return $result;
    }

    /**
     * @return string|null
     */
    public function getCodeVerifier(): ?string
    {
        return $this->codeVerifier;
    }

    /**
     * A cryptographically random string that is used to correlate the
     * authorization request to the token request.
     *
     * The code verifier for PKCE for OAuth 2.0. When set, the authorization
     * URI will contain the Code Challenge and Code Challenge Method querystring
     * parameters, and the token URI will contain the Code Verifier parameter.
     *
     * @see https://datatracker.ietf.org/doc/html/rfc7636
     *
     * @param string|null $codeVerifier
     */
    public function setCodeVerifier(?string $codeVerifier): void
    {
        $this->codeVerifier = $codeVerifier;
    }

    /**
     * Generates a random 128-character string for the "code_verifier" parameter
     * in PKCE for OAuth 2.0. This is a cryptographically random string that is
     * determined using random_int, hashed using "hash" and sha256, and base64
     * encoded.
     *
     * When this method is called, the code verifier is set on the object.
     *
     * @return string
     */
    public function generateCodeVerifier(): string
    {
        return $this->codeVerifier = $this->generateRandomString(128);
    }

    private function getCodeChallenge(string $randomString): string
    {
        return rtrim(strtr(base64_encode(hash('sha256', $randomString, true)), '+/', '-_'), '=');
    }

    private function getCodeChallengeMethod(): string
    {
        return 'S256';
    }

    private function generateRandomString(int $length): string
    {
        $validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
        $validCharsLen = strlen($validChars);
        $str = '';
        $i = 0;
        while ($i++ < $length) {
            $str .= $validChars[random_int(0, $validCharsLen - 1)];
        }
        return $str;
    }

    /**
     * Sets the authorization server's HTTP endpoint capable of authenticating
     * the end-user and obtaining authorization.
     *
     * @param string $uri
     * @return void
     */
    public function setAuthorizationUri($uri)
    {
        $this->authorizationUri = $this->coerceUri($uri);
    }

    /**
     * Gets the authorization server's HTTP endpoint capable of authenticating
     * the end-user and obtaining authorization.
     *
     * @return ?UriInterface
     */
    public function getAuthorizationUri()
    {
        return $this->authorizationUri;
    }

    /**
     * Gets the authorization server's HTTP endpoint capable of issuing tokens
     * and refreshing expired tokens.
     *
     * @return ?UriInterface
     */
    public function getTokenCredentialUri()
    {
        return $this->tokenCredentialUri;
    }

    /**
     * Sets the authorization server's HTTP endpoint capable of issuing tokens
     * and refreshing expired tokens.
     *
     * @param string $uri
     * @return void
     */
    public function setTokenCredentialUri($uri)
    {
        $this->tokenCredentialUri = $this->coerceUri($uri);
    }

    /**
     * Gets the redirection URI used in the initial request.
     *
     * @return ?string
     */
    public function getRedirectUri()
    {
        return $this->redirectUri;
    }

    /**
     * Sets the redirection URI used in the initial request.
     *
     * @param ?string $uri
     * @return void
     */
    public function setRedirectUri($uri)
    {
        if (is_null($uri)) {
            $this->redirectUri = null;

            return;
        }
        // redirect URI must be absolute
        if (!$this->isAbsoluteUri($uri)) {
            // "postmessage" is a reserved URI string in Google-land
            // @see https://developers.google.com/identity/sign-in/web/server-side-flow
            if ('postmessage' !== (string)$uri) {
                throw new InvalidArgumentException(
                    'Redirect URI must be absolute'
                );
            }
        }
        $this->redirectUri = (string)$uri;
    }

    /**
     * Gets the scope of the access requests as a space-delimited String.
     *
     * @return ?string
     */
    public function getScope()
    {
        if (is_null($this->scope)) {
            return $this->scope;
        }

        return implode(' ', $this->scope);
    }

    /**
     * Sets the scope of the access request, expressed either as an Array or as
     * a space-delimited String.
     *
     * @param string|array<string>|null $scope
     * @return void
     * @throws InvalidArgumentException
     */
    public function setScope($scope)
    {
        if (is_null($scope)) {
            $this->scope = null;
        } elseif (is_string($scope)) {
            $this->scope = explode(' ', $scope);
        } elseif (is_array($scope)) {
            foreach ($scope as $s) {
                $pos = strpos($s, ' ');
                if ($pos !== false) {
                    throw new InvalidArgumentException(
                        'array scope values should not contain spaces'
                    );
                }
            }
            $this->scope = $scope;
        } else {
            throw new InvalidArgumentException(
                'scopes should be a string or array of strings'
            );
        }
    }

    /**
     * Gets the current grant type.
     *
     * @return ?string
     */
    public function getGrantType()
    {
        if (!is_null($this->grantType)) {
            return $this->grantType;
        }

        // Returns the inferred grant type, based on the current object instance
        // state.
        if (!is_null($this->code)) {
            return 'authorization_code';
        }

        if (!is_null($this->refreshToken)) {
            return 'refresh_token';
        }

        if (!is_null($this->username) && !is_null($this->password)) {
            return 'password';
        }

        if (!is_null($this->issuer) && !is_null($this->signingKey)) {
            return self::JWT_URN;
        }

        if (!is_null($this->subjectTokenFetcher) && !is_null($this->subjectTokenType)) {
            return self::STS_URN;
        }

        return null;
    }

    /**
     * Sets the current grant type.
     *
     * @param string $grantType
     * @return void
     * @throws InvalidArgumentException
     */
    public function setGrantType($grantType)
    {
        if (in_array($grantType, self::$knownGrantTypes)) {
            $this->grantType = $grantType;
        } else {
            // validate URI
            if (!$this->isAbsoluteUri($grantType)) {
                throw new InvalidArgumentException(
                    'invalid grant type'
                );
            }
            $this->grantType = (string)$grantType;
        }
    }

    /**
     * Gets an arbitrary string designed to allow the client to maintain state.
     *
     * @return string
     */
    public function getState()
    {
        return $this->state;
    }

    /**
     * Sets an arbitrary string designed to allow the client to maintain state.
     *
     * @param string $state
     * @return void
     */
    public function setState($state)
    {
        $this->state = $state;
    }

    /**
     * Gets the authorization code issued to this client.
     *
     * @return string
     */
    public function getCode()
    {
        return $this->code;
    }

    /**
     * Sets the authorization code issued to this client.
     *
     * @param string $code
     * @return void
     */
    public function setCode($code)
    {
        $this->code = $code;
    }

    /**
     * Gets the resource owner's username.
     *
     * @return string
     */
    public function getUsername()
    {
        return $this->username;
    }

    /**
     * Sets the resource owner's username.
     *
     * @param string $username
     * @return void
     */
    public function setUsername($username)
    {
        $this->username = $username;
    }

    /**
     * Gets the resource owner's password.
     *
     * @return string
     */
    public function getPassword()
    {
        return $this->password;
    }

    /**
     * Sets the resource owner's password.
     *
     * @param string $password
     * @return void
     */
    public function setPassword($password)
    {
        $this->password = $password;
    }

    /**
     * Sets a unique identifier issued to the client to identify itself to the
     * authorization server.
     *
     * @return string
     */
    public function getClientId()
    {
        return $this->clientId;
    }

    /**
     * Sets a unique identifier issued to the client to identify itself to the
     * authorization server.
     *
     * @param string $clientId
     * @return void
     */
    public function setClientId($clientId)
    {
        $this->clientId = $clientId;
    }

    /**
     * Gets a shared symmetric secret issued by the authorization server, which
     * is used to authenticate the client.
     *
     * @return string
     */
    public function getClientSecret()
    {
        return $this->clientSecret;
    }

    /**
     * Sets a shared symmetric secret issued by the authorization server, which
     * is used to authenticate the client.
     *
     * @param string $clientSecret
     * @return void
     */
    public function setClientSecret($clientSecret)
    {
        $this->clientSecret = $clientSecret;
    }

    /**
     * Gets the Issuer ID when using assertion profile.
     *
     * @return ?string
     */
    public function getIssuer()
    {
        return $this->issuer;
    }

    /**
     * Sets the Issuer ID when using assertion profile.
     *
     * @param string $issuer
     * @return void
     */
    public function setIssuer($issuer)
    {
        $this->issuer = $issuer;
    }

    /**
     * Gets the target sub when issuing assertions.
     *
     * @return ?string
     */
    public function getSub()
    {
        return $this->sub;
    }

    /**
     * Sets the target sub when issuing assertions.
     *
     * @param string $sub
     * @return void
     */
    public function setSub($sub)
    {
        $this->sub = $sub;
    }

    /**
     * Gets the target audience when issuing assertions.
     *
     * @return ?string
     */
    public function getAudience()
    {
        return $this->audience;
    }

    /**
     * Sets the target audience when issuing assertions.
     *
     * @param string $audience
     * @return void
     */
    public function setAudience($audience)
    {
        $this->audience = $audience;
    }

    /**
     * Gets the signing key when using an assertion profile.
     *
     * @return ?string
     */
    public function getSigningKey()
    {
        return $this->signingKey;
    }

    /**
     * Sets the signing key when using an assertion profile.
     *
     * @param string $signingKey
     * @return void
     */
    public function setSigningKey($signingKey)
    {
        $this->signingKey = $signingKey;
    }

    /**
     * Gets the signing key id when using an assertion profile.
     *
     * @return ?string
     */
    public function getSigningKeyId()
    {
        return $this->signingKeyId;
    }

    /**
     * Sets the signing key id when using an assertion profile.
     *
     * @param string $signingKeyId
     * @return void
     */
    public function setSigningKeyId($signingKeyId)
    {
        $this->signingKeyId = $signingKeyId;
    }

    /**
     * Gets the signing algorithm when using an assertion profile.
     *
     * @return ?string
     */
    public function getSigningAlgorithm()
    {
        return $this->signingAlgorithm;
    }

    /**
     * Sets the signing algorithm when using an assertion profile.
     *
     * @param ?string $signingAlgorithm
     * @return void
     */
    public function setSigningAlgorithm($signingAlgorithm)
    {
        if (is_null($signingAlgorithm)) {
            $this->signingAlgorithm = null;
        } elseif (!in_array($signingAlgorithm, self::$knownSigningAlgorithms)) {
            throw new InvalidArgumentException('unknown signing algorithm');
        } else {
            $this->signingAlgorithm = $signingAlgorithm;
        }
    }

    /**
     * Gets the set of parameters used by extension when using an extension
     * grant type.
     *
     * @return array<mixed>
     */
    public function getExtensionParams()
    {
        return $this->extensionParams;
    }

    /**
     * Sets the set of parameters used by extension when using an extension
     * grant type.
     *
     * @param array<mixed> $extensionParams
     * @return void
     */
    public function setExtensionParams($extensionParams)
    {
        $this->extensionParams = $extensionParams;
    }

    /**
     * Gets the number of seconds assertions are valid for.
     *
     * @return int
     */
    public function getExpiry()
    {
        return $this->expiry;
    }

    /**
     * Sets the number of seconds assertions are valid for.
     *
     * @param int $expiry
     * @return void
     */
    public function setExpiry($expiry)
    {
        $this->expiry = $expiry;
    }

    /**
     * Gets the lifetime of the access token in seconds.
     *
     * @return int
     */
    public function getExpiresIn()
    {
        return $this->expiresIn;
    }

    /**
     * Sets the lifetime of the access token in seconds.
     *
     * @param ?int $expiresIn
     * @return void
     */
    public function setExpiresIn($expiresIn)
    {
        if (is_null($expiresIn)) {
            $this->expiresIn = null;
            $this->issuedAt = null;
        } else {
            $this->issuedAt = time();
            $this->expiresIn = (int)$expiresIn;
        }
    }

    /**
     * Gets the time the current access token expires at.
     *
     * @return ?int
     */
    public function getExpiresAt()
    {
        if (!is_null($this->expiresAt)) {
            return $this->expiresAt;
        }

        if (!is_null($this->issuedAt) && !is_null($this->expiresIn)) {
            return $this->issuedAt + $this->expiresIn;
        }

        return null;
    }

    /**
     * Returns true if the acccess token has expired.
     *
     * @return bool
     */
    public function isExpired()
    {
        $expiration = $this->getExpiresAt();
        $now = time();

        return !is_null($expiration) && $now >= $expiration;
    }

    /**
     * Sets the time the current access token expires at.
     *
     * @param int $expiresAt
     * @return void
     */
    public function setExpiresAt($expiresAt)
    {
        $this->expiresAt = $expiresAt;
    }

    /**
     * Gets the time the current access token was issued at.
     *
     * @return ?int
     */
    public function getIssuedAt()
    {
        return $this->issuedAt;
    }

    /**
     * Sets the time the current access token was issued at.
     *
     * @param int $issuedAt
     * @return void
     */
    public function setIssuedAt($issuedAt)
    {
        $this->issuedAt = $issuedAt;
    }

    /**
     * Gets the current access token.
     *
     * @return ?string
     */
    public function getAccessToken()
    {
        return $this->accessToken;
    }

    /**
     * Sets the current access token.
     *
     * @param string $accessToken
     * @return void
     */
    public function setAccessToken($accessToken)
    {
        $this->accessToken = $accessToken;
    }

    /**
     * Gets the current ID token.
     *
     * @return ?string
     */
    public function getIdToken()
    {
        return $this->idToken;
    }

    /**
     * Sets the current ID token.
     *
     * @param string $idToken
     * @return void
     */
    public function setIdToken($idToken)
    {
        $this->idToken = $idToken;
    }

    /**
     * Get the granted space-separated scopes (if they exist) for the last
     * fetched token.
     *
     * @return string|null
     */
    public function getGrantedScope()
    {
        return $this->grantedScope;
    }

    /**
     * Sets the current ID token.
     *
     * @param string $grantedScope
     * @return void
     */
    public function setGrantedScope($grantedScope)
    {
        $this->grantedScope = $grantedScope;
    }

    /**
     * Gets the refresh token associated with the current access token.
     *
     * @return ?string
     */
    public function getRefreshToken()
    {
        return $this->refreshToken;
    }

    /**
     * Sets the refresh token associated with the current access token.
     *
     * @param string $refreshToken
     * @return void
     */
    public function setRefreshToken($refreshToken)
    {
        $this->refreshToken = $refreshToken;
    }

    /**
     * Sets additional claims to be included in the JWT token
     *
     * @param array<mixed> $additionalClaims
     * @return void
     */
    public function setAdditionalClaims(array $additionalClaims)
    {
        $this->additionalClaims = $additionalClaims;
    }

    /**
     * Gets the additional claims to be included in the JWT token.
     *
     * @return array<mixed>
     */
    public function getAdditionalClaims()
    {
        return $this->additionalClaims;
    }

    /**
     * Gets the additional claims to be included in the JWT token.
     *
     * @return ?string
     */
    public function getIssuedTokenType()
    {
        return $this->issuedTokenType;
    }

    /**
     * The expiration of the last received token.
     *
     * @return array<mixed>|null
     */
    public function getLastReceivedToken()
    {
        if ($token = $this->getAccessToken()) {
            // the bare necessity of an auth token
            $authToken = [
                'access_token' => $token,
                'expires_at' => $this->getExpiresAt(),
            ];
        } elseif ($idToken = $this->getIdToken()) {
            $authToken = [
                'id_token' => $idToken,
                'expires_at' => $this->getExpiresAt(),
            ];
        } else {
            return null;
        }

        if ($expiresIn = $this->getExpiresIn()) {
            $authToken['expires_in'] = $expiresIn;
        }
        if ($issuedAt = $this->getIssuedAt()) {
            $authToken['issued_at'] = $issuedAt;
        }
        if ($refreshToken = $this->getRefreshToken()) {
            $authToken['refresh_token'] = $refreshToken;
        }

        return $authToken;
    }

    /**
     * Get the client ID.
     *
     * Alias of {@see Google\Auth\OAuth2::getClientId()}.
     *
     * @param callable $httpHandler
     * @return string
     * @access private
     */
    public function getClientName(callable $httpHandler = null)
    {
        return $this->getClientId();
    }

    /**
     * @todo handle uri as array
     *
     * @param ?string $uri
     * @return null|UriInterface
     */
    private function coerceUri($uri)
    {
        if (is_null($uri)) {
            return null;
        }

        return Utils::uriFor($uri);
    }

    /**
     * @param string $idToken
     * @param Key|Key[]|string|string[] $publicKey
     * @param string|string[] $allowedAlgs
     * @return object
     */
    private function jwtDecode($idToken, $publicKey, $allowedAlgs)
    {
        $keys = $this->getFirebaseJwtKeys($publicKey, $allowedAlgs);

        // Default exception if none are caught. We are using the same exception
        // class and message from firebase/php-jwt to preserve backwards
        // compatibility.
        $e = new \InvalidArgumentException('Key may not be empty');
        foreach ($keys as $key) {
            try {
                return JWT::decode($idToken, $key);
            } catch (\Exception $e) {
                // try next alg
            }
        }
        throw $e;
    }

    /**
     * @param Key|Key[]|string|string[] $publicKey
     * @param string|string[] $allowedAlgs
     * @return Key[]
     */
    private function getFirebaseJwtKeys($publicKey, $allowedAlgs)
    {
        // If $publicKey is instance of Key, return it
        if ($publicKey instanceof Key) {
            return [$publicKey];
        }

        // If $allowedAlgs is empty, $publicKey must be Key or Key[].
        if (empty($allowedAlgs)) {
            $keys = [];
            foreach ((array) $publicKey as $kid => $pubKey) {
                if (!$pubKey instanceof Key) {
                    throw new \InvalidArgumentException(sprintf(
                        'When allowed algorithms is empty, the public key must'
                        . 'be an instance of %s or an array of %s objects',
                        Key::class,
                        Key::class
                    ));
                }
                $keys[$kid] = $pubKey;
            }
            return $keys;
        }

        $allowedAlg = null;
        if (is_string($allowedAlgs)) {
            $allowedAlg = $allowedAlgs;
        } elseif (is_array($allowedAlgs)) {
            if (count($allowedAlgs) > 1) {
                throw new \InvalidArgumentException(
                    'To have multiple allowed algorithms, You must provide an'
                    . ' array of Firebase\JWT\Key objects.'
                    . ' See https://github.com/firebase/php-jwt for more information.');
            }
            $allowedAlg = array_pop($allowedAlgs);
        } else {
            throw new \InvalidArgumentException('allowed algorithms must be a string or array.');
        }

        if (is_array($publicKey)) {
            // When publicKey is greater than 1, create keys with the single alg.
            $keys = [];
            foreach ($publicKey as $kid => $pubKey) {
                if ($pubKey instanceof Key) {
                    $keys[$kid] = $pubKey;
                } else {
                    $keys[$kid] = new Key($pubKey, $allowedAlg);
                }
            }
            return $keys;
        }

        return [new Key($publicKey, $allowedAlg)];
    }

    /**
     * Determines if the URI is absolute based on its scheme and host or path
     * (RFC 3986).
     *
     * @param string $uri
     * @return bool
     */
    private function isAbsoluteUri($uri)
    {
        $uri = $this->coerceUri($uri);

        return $uri->getScheme() && ($uri->getHost() || $uri->getPath());
    }

    /**
     * @param array<mixed> $params
     * @return array<mixed>
     */
    private function addClientCredentials(&$params)
    {
        $clientId = $this->getClientId();
        $clientSecret = $this->getClientSecret();

        if ($clientId && $clientSecret) {
            $params['client_id'] = $clientId;
            $params['client_secret'] = $clientSecret;
        }

        return $params;
    }
}
