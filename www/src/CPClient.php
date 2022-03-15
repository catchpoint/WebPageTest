<?php

declare(strict_types=1);

namespace WebPageTest;

use Exception as BaseException;
use GraphQL\Query;
use GraphQL\Exception\QueryError;
use GraphQL\Mutation;
use GraphQL\Variable;
use GraphQL\Client as GraphQLClient;
use GuzzleHttp\Client as GuzzleClient;
use WebPageTest\AuthToken;
use WebPageTest\Exception\ClientException;
use WebPageTest\Exception\UnauthorizedException;
use GuzzleHttp\Exception\ClientException as GuzzleException;

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
        } catch (GuzzleException $e) {
            if ($e->getCode() == 401) {
                throw new UnauthorizedException();
            }
            throw new ClientException($e->getMessage());
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
        } catch (GuzzleException $e) {
            if ($e->getCode() == 401) {
                throw new UnauthorizedException();
            }
            throw new ClientException($e->getMessage());
        } catch (BaseException $e) {
            throw new ClientException($e->getMessage());
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
        } catch (GuzzleException $e) {
            if ($e->getCode() == 401) {
                throw new UnauthorizedException();
            }
            throw new ClientException($e->getMessage());
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
        } catch (GuzzleException $e) {
            if ($e->getCode() == 401) {
                throw new UnauthorizedException();
            }
            throw new ClientException($e->getMessage());
        } catch (BaseException $e) {
            throw new ClientException($e->getMessage());
        }
    }

    public function getUserContactInfo(int $id): array
    {
        $gql = (new Query('contact'))
        ->setVariables([
        new Variable('id', 'ID', true)
        ])
        ->setArguments(['id' => '$id'])
        ->setSelectionSet([
        'companyName',
        'firstName',
        'lastName'
        ]);

        $variables_array = array('id' => $id);
        $contact_info = $this->graphql_client->runQuery($gql, true, $variables_array);
        return $contact_info->getData()['contact'][0];
    }

    public function getUnpaidAccountpageInfo(): array
    {
        $gql = (new Query())
        ->setSelectionSet([
        'braintreeClientToken',
        (new Query('wptPlans'))
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
          ])
        ]);
        $page_info = $this->graphql_client->runQuery($gql, true);
        return $page_info->getData();
    }

    public function getPaidAccountPageInfo(): array
    {
        $gql = (new Query())
        ->setSelectionSet([
          (new Query('wptApiKey'))
            ->setSelectionSet([
              'id',
              'name',
              'apiKey',
              'createDate',
              'changeDate'
            ]),
          (new Query('braintreeCustomerDetails'))
              ->setSelectionSet([
                  'customerId',
                  'wptPlanId',
                  'subscriptionId',
                  'ccLastFour',
                  'daysPastDue',
                  'subscriptionPrice',
                  'maskedCreditCard',
                  'nextBillingDate',
                  'billingPeriodEndDate',
                  'numberOfBillingCycles',
                  'ccExpirationDate',
                  'ccImageUrl',
                  'status',
                  (new Query('discount'))
                    ->setSelectionSet([
                      'amount',
                      'numberOfBillingCycles'
                    ]),
                  'remainingRuns',
                  'planRenewalDate',
                  'billingFrequency',
                  'wptPlanName'
              ]),
          (new Query('braintreeTransactionHistory'))
              ->setSelectionSet([
                  'amount',
                  'cardType',
                  'ccLastFour',
                  'maskedCreditCard',
                  'transactionDate'
              ])
        ]);

        try {
            $results = $this->graphql_client->runQuery($gql, true);
            return $results->getData();
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function updateUserContactInfo(string $id, array $options): array
    {
        $gql = (new Mutation('wptContactUpdate'))
        ->setVariables([
        new Variable('contact', 'ContactUpdateInputType', true)
        ])
        ->setArguments([
        'contact' => '$contact'
        ])
        ->setSelectionSet([
        'id',
        'firstName',
        'lastName',
        'companyName',
        'email'
        ]);

        $variables_array = array('contact' => [
        'id' => $id,
        'email' => $options['email'],
        'firstName' => $options['first_name'],
        'lastName' => $options['last_name'],
        'companyName' => $options['company_name']
        ]);

        $results = $this->graphql_client->runQuery($gql, true, $variables_array);
        return $results->getData();
    }

    public function changePassword(string $new_pass, string $current_pass): array
    {
        $gql = (new Mutation('userPasswordChange'))
        ->setVariables([
        new Variable('passwordChangedInput', 'UserPasswordChangeInputType', true)
        ])
        ->setArguments([
        'changePassword' => '$passwordChangedInput'
        ])
        ->setSelectionSet([
          'id',
          'lastPasswordChangedDate'
        ]);

        $variables_array = array('passwordChangedInput' => [
            'newPassword' => $new_pass,
            'currentPassword' => $current_pass
        ]);

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables_array);
            return $results->getData();
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function createApiKey(string $name): array
    {
        $gql = (new Mutation('wptApiKeyCreate'))
        ->setVariables([
          new Variable('wptApiKey', 'WptApiKeyCreateInputType', true)
        ])
        ->setArguments([
          'wptApiKey' => '$wptApiKey'
        ])
        ->setSelectionSet([
          'id',
          'name',
          'apiKey',
          'createDate',
          'changeDate'
        ]);

        $variables_array = array('wptApiKey' => [
            'name' => $name,
        ]);

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables_array);
            return $results->getData();
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function deleteApiKey(int $id): array
    {
        $ids = [$id];

        $gql = (new Mutation('wptApiKeyBulkDelete'))
        ->setVariables([
          new Variable('ids', '[Int!]', true)
        ])
        ->setArguments([
          'ids' => '$ids'
        ])
        ->setSelectionSet([
          'id'
        ]);

        $variables_array = array('ids' => $ids);

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables_array);
            return $results->getData();
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function addWptSubscription(string $nonce, string $plan, array $billing_address): array
    {
        $gql = (new Mutation('wptAddSubscription'))
        ->setVariables([
          new Variable('customer', 'CustomerInputType', true)
        ])
        ->setArguments([
          'customer' => '$customer'
        ])
        ->setSelectionSet([
          'company',
          'firstName',
          'lastName',
          'email',
          'loginVerificationId'
        ]);

        $variables_array = array('customer' => [
          "paymentMethodNonce" => $nonce,
          "subscriptionPlanId" => $plan,
          "billingAddressModel" => array(
            "city" => $billing_address['city'],
            "country" => $billing_address['country'],
            "state" => $billing_address['state'],
            "streetAddress" => $billing_address['street_address'],
            "zipcode" => $billing_address['zipcode']
          )
        ]);

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables_array);
            return $results->getData();
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }
}
