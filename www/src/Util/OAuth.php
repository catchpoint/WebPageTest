<?php

declare(strict_types=1);

namespace WebPageTest\Util;

use RandomLib\Factory;

class OAuth
{
    private string $scope = "openid Symphony offline_access";
    private string $response_type = "code id_token";
    public static string $cp_access_token_cookie_key = 'cp_access_token';
    public static string $cp_refresh_token_cookie_key = 'cp_refresh_token';

    private string $code_verifier;
    private string $code_challenge;
    private string $provider;
    private string $nonce;
    private string $client_id;

    public function __construct(string $auth_host, string $client_id)
    {
        $this->provider = "{$auth_host}/auth";
        $this->client_id = $client_id;
        $this->code_verifier = $this->generateCodeVerifier();
        $this->code_challenge = $this->generateCodeChallenge();
        $this->nonce = $this->generateNonce();
    }

    public function getCodeVerifier(): string
    {
        return $this->code_verifier;
    }

    public function getNonce(): string
    {
        return $this->nonce;
    }

    public function buildAuthorizeRequest(string $redirect_uri): string
    {
        $params = array(
        'client_id' => $this->client_id,
        'response_type' => $this->response_type,
        'scope' => $this->scope,
        'response_mode' => 'form_post',
        'nonce' => $this->nonce,
        'code_challenge' => $this->code_challenge,
        'code_challenge_method' => 'S256',
        'redirect_uri' => $redirect_uri
        );

        $query = http_build_query($params, "", "&", PHP_QUERY_RFC3986);
        return "{$this->provider}/connect/authorize?{$query}";
    }

    /**
     * Generates an Oauth2/OpenID code_verifier string
     *
     * Rules:
     * 1) must be between 43 and 128 characters
     * 2) must be ascii characters only
     */
    private function generateCodeVerifier(): string
    {
        $ascii_chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._~';
        $factory = new Factory();
        $generator = $factory->getLowStrengthGenerator();
        $length = $generator->generateInt(43, 128);
        $str = $generator->generateString($length, $ascii_chars);
        return $str;
    }

    /**
     * Generates a code_challenge from an Oauth2/OpenID code_verifier
     *
     * returns a base64 url encoded byte string of a sha256 hashed string
     *
     */
    private function generateCodeChallenge(): string
    {
        $hash = hash("sha256", $this->code_verifier);
        return $this->base64UrlEncode(pack('H*', $hash));
    }

    /**
     * Encodes in Base64Url, which is missing from PHP
     *
     */
    private function base64UrlEncode(string $str): string
    {
        return rtrim(strtr(base64_encode($str), '+/', '-_'), '=');
    }

    /**
     * Generate nonce for passing
     */
    private function generateNonce(): string
    {
        $ascii_chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._~';
        $factory = new Factory();
        $generator = $factory->getLowStrengthGenerator();
        $str = $generator->generateString(32, $ascii_chars);
        return $str;
    }

    /**
     * Verifies whether the nonce in a passed id_token matches a value
     */
    public static function verifyNonce(string $token, string $nonce): bool
    {
        $jwt = self::decodeJWT($token);
        $sent_nonce = $jwt['nonce'];
        return $sent_nonce == $nonce;
    }

    /**
     * Takes a JWT and returns an associative array
     */
    private static function decodeJWT(string $token): array
    {
        $base64Decoded = base64_decode(str_replace('_', '/', str_replace('-', '+', explode('.', $token)[1])));
        return (array) json_decode($base64Decoded);
    }
}
