<?php

declare(strict_types=1);

namespace WebPageTest;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use WebPageTest\SignupToken;
use GraphQL\Client as GraphQLClient;
use Exception as BaseException;
use GraphQL\Exception\QueryError;
use GraphQL\Query;
use GraphQL\Mutation;
use GraphQL\Variable;
use WebPageTest\Plan;
use WebPageTest\Customer;

class CPSignupClient
{
    private GraphQLClient $graphql_client;
    private string $base_uri;
    private string $client_id;
    private string $client_secret;
    private string $grant_type;
    private string $gql_uri;

    public function __construct(array $options = [])
    {
        $base_uri = $options['base_uri'] ?? null;
        $client_id = $options['client_id'] ?? null;
        $client_secret = $options['client_secret'] ?? null;
        $grant_type = $options['grant_type'] ?? null;

        $gql_uri = $options['gql_uri'] ?? null;

        if (
            is_null($base_uri) ||
            is_null($gql_uri) ||
            is_null($client_id) ||
            is_null($client_secret) ||
            is_null($grant_type)
        ) {
            throw new BaseException('base_uri, client_id, client_secret, and grant_type are all required');
        }

        $this->access_token = null;
        $this->graphql_client = new GraphQLClient($gql_uri);
        $this->base_uri = $base_uri;
        $this->gql_uri = $gql_uri;
        $this->client_id = $client_id;
        $this->client_secret = $client_secret;
        $this->grant_type = $grant_type;
    }

    public function authenticate(string $access_token): void
    {
        $this->graphql_client = new GraphQLClient(
            $this->gql_uri,
            ['Authorization' => "Bearer {$access_token}"]
        );
    }

    public function getAuthUrl(string $login_verification_id): string
    {
        return "{$this->base_uri}/auth/WptAccount/Signup?token={$login_verification_id}";
    }

    public function getAuthToken(): SignupToken
    {
        $uri = "/auth/connect/token";
        $basic_token = base64_encode(urlencode($this->client_id) . ":" . urlencode($this->client_secret));
        $body = array(
        'grant_type' => $this->grant_type
        );
        $headers = array(
        'Authorization' => "Basic {$basic_token}"
        );
        $data = $this->makeRequest('POST', $uri, $headers, $body);
        return new SignupToken($data);
    }

    public function signup(array $options, ?Customer $customer = null): array
    {
        $first_name = $options['first_name'] ?? null;
        $last_name = $options['last_name'] ?? null;
        $company = $options['company'] ?? null;
        $email = $options['email'] ?? null;
        $password = $options['password'] ?? null;
        $customer = $customer ?? null;

        if (is_null($first_name) || is_null($last_name) || is_null($email) || is_null($password)) {
            throw new BaseException('first_name, last_name, email, and password are all required');
        }

        $gql = (new Mutation('wptAccountCreate'))
        ->setVariables([
        new Variable('wptAccount', 'WptSignupInputType', true)
        ])
        ->setArguments([
        'wptAccount' => '$wptAccount'
        ])
        ->setSelectionSet([
        'firstName',
        'lastName',
        'company',
        'email',
        'loginVerificationId'
        ]);

        $wpt_account = [
        'email' => $email,
        'firstName' => $first_name,
        'lastName' => $last_name,
        'company' => $company,
        'password' => $password
        ];

        if (!is_null($customer)) {
            $wpt_account['customer'] = $customer->toArray();
        }

        $variables_array = array('wptAccount' => $wpt_account);

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables_array);
            return $results->getData()['wptAccountCreate'];
        } catch (QueryError $e) {
            throw new \WebPageTest\Exception\ClientException($e->getMessage());
        }
    }

    /**
     * return Plan[]
     */
    public function getWptPlans(): array
    {
        $gql = (new Query('wptPlans'))
          ->setSelectionSet([
            'id',
            'name',
            'price',
            'billingFrequency',
            'billingDayOfMonth',
            'currencyIsoCode',
            'numberOfBillingCycles',
            'trialDuration',
            'trialPeriod',
            (new Query('discount'))
              ->setSelectionSet([
                'amount',
                'numberOfBillingCycles'
              ])
          ]);

        $results = $this->graphql_client->runQuery($gql, true);
        return array_map(function ($data): Plan {
            return new Plan($data);
        }, $results->getData()['wptPlans']);
    }

    private function makeRequest(string $method, string $url, array $headers, array $body): array
    {
        $client = new Client(array(
        'base_uri' => $this->base_uri
        ));
        $options = [
        'form_params' => $body,
        'headers' => $headers
        ];
        try {
            $response = $client->request($method, $url, $options);
            $body = (string) $response->getBody();
            return json_decode($body, true);
        } catch (ClientException $e) {
            throw $e;
        }
    }
}
