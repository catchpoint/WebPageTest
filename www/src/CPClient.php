<?php

declare(strict_types=1);

namespace WebPageTest;

use Exception as BaseException;
use GraphQL\Query;
use GraphQL\Client as GraphQLClient;
use GuzzleHttp\Client as GuzzleClient;
use WebPageTest\AuthToken;
use WebPageTest\Exception\ClientException;
use WebPageTest\Exception\UnauthorizedException;
use GraphQL\Exception\QueryError;

class CPClient
{
    private GuzzleClient $auth_client;
    private GraphQLClient $graphql_client;
    public ?string $client_id;
    public ?string $client_secret;
    private ?string $access_token;

    public function __construct(string $host, array $options = [])
    {
        $auth_client_options = $options['auth_client_options'] ?? array();
        $this->client_id = $auth_client_options['client_id'] ?? null;
        $this->client_secret = $auth_client_options['client_secret'] ?? null;
        $this->auth_client = new GuzzleClient($auth_client_options);
        $this->graphql_client = new GraphQLClient($host);
        $this->access_token = null;

        $this->host = $host;
    }

    public function authenticate(string $access_token): void
    {
        $this->access_token = $access_token;
        $this->graphql_client = new GraphQLClient(
            $this->host,
            ['Authorization' => "Bearer {$access_token}"]
        );
    }

    public function getAccessToken(): string
    {
        return $this->access_token;
    }

    public function isAuthenticated(): bool
    {
        return !!$this->access_token;
    }

    public function login(string $code, string $code_verifier, string $redirect_uri): AuthToken
    {
        if (is_null($this->client_id) || is_null($this->client_secret)) {
            throw new BaseException("Client ID and Client Secret must be set in order to login");
        }

        $form_params = array(
            'client_id' => $this->client_id,
            'client_secret' => $this->client_secret,
            'grant_type' => 'authorization_code',
            'code' => $code,
            'code_verifier' => $code_verifier,
            'scope' => 'openid Symphony offline_access',
            'redirect_uri' => $redirect_uri
        );


        $body = array('form_params' =>  $form_params);
        try {
            $response = $this->auth_client->request('POST', '/auth/connect/token', $body);
        } catch (BaseException $e) {
            throw new ClientException($e->getMessage());
        }
        $json = json_decode((string)$response->getBody());
        return new AuthToken((array)$json);
    }

    public function refreshAuthToken(string $refresh_token): AuthToken
    {
        if (is_null($this->client_id) || is_null($this->client_secret)) {
            throw new BaseException("Client ID and Client Secret all must be set in order to login");
        }

        $body = array(
            'form_params' => array(
                'client_id' => $this->client_id,
                'client_secret' => $this->client_secret,
                'grant_type' => 'refresh_token',
                'refresh_token' => $refresh_token
            )
        );
        try {
            $response = $this->auth_client->request('POST', '/auth/connect/token', $body);
        } catch (QueryError $e) {
            throw new ClientException($e->getMessage());
        } catch (BaseException $e) {
            throw new UnauthorizedException();
        }
        $json = json_decode((string)$response->getBody());
        return new AuthToken((array)$json);
    }

    public function revokeToken(string $token, string $type = 'access_token'): void
    {
        $body = array(
            'form_params' => array(
                'token' => $token,
                'token_type_hint' => $type,
                'client_id' => $this->client_id,
                'client_secret' => $this->client_secret
            )
        );
        try {
            $this->auth_client->request('POST', '/auth/connect/revocation', $body);
        } catch (BaseException $e) {
            throw new ClientException($e->getMessage());
        }
    }

    public function getUserDetails(): array
    {
        $gql = (new Query('userIdentity'))
              ->setSelectionSet([
                (new Query('activeContact'))
                  ->setSelectionSet([
                    'id',
                    'name',
                    'email',
                    'isWptPaidUser',
                    'isWptAccountVerified'
                  ])
              ]);

        try {
            $account_details = $this->graphql_client->runQuery($gql, true);
            return $account_details->getData()['userIdentity']['activeContact'];
        } catch (QueryError $e) {
            error_log($e->getMessage());
            throw new ClientException($e->getMessage());
        } catch (BaseException $e) {
            throw new UnauthorizedException();
        }
    }
}
