<?php

declare(strict_types=1);

namespace WebPageTest;

use DateTime;
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
use WebPageTest\CPGraphQlTypes\ChargifyAddressInput as ShippingAddress;
use WebPageTest\CPGraphQlTypes\ChargifySubscriptionPreviewResponse as SubscriptionPreview;
use WebPageTest\CPGraphQlTypes\Customer as CPCustomer;
use WebPageTest\Customer;
use WebPageTest\TestRecord;
use WebPageTest\Util;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceResponseType;
use WebPageTest\CPGraphQlTypes\ChargifyInvoicePayment;
use WebPageTest\CPGraphQlTypes\ChargifyInvoicePaymentList;
use WebPageTest\CPGraphQlTypes\SubscriptionCancellationInputType;

class CPClient
{
    private GuzzleClient $auth_client;
    private GraphQLClient $graphql_client;
    public ?string $client_id;
    public ?string $client_secret;
    private ?string $access_token;
    private $handler; // For unit tests

    public function __construct(string $host, array $options = [])
    {
        $auth_client_options = $options['auth_client_options'] ?? array();
        $graphql_client_options = array(
            'timeout' => 30,
            'connect_timeout' => 30
        );

        $this->client_id = $auth_client_options['client_id'] ?? null;
        $this->client_secret = $auth_client_options['client_secret'] ?? null;
        $this->handler = $auth_client_options['handler'] ?? null;
        $this->auth_client = new GuzzleClient($auth_client_options);

        $this->access_token = null;

        if (isset($this->handler)) {
            $graphql_client_options['handler'] = $this->handler;
        }
        $this->graphql_client = new GraphQLClient($host, [], $graphql_client_options);

        $this->host = $host;
    }

    public function authenticate(string $access_token): void
    {
        $this->access_token = $access_token;

        $options = array();
        if (isset($this->handler)) {
            $options['handler'] = $this->handler;
        }

        $this->graphql_client = new GraphQLClient(
            $this->host,
            ['Authorization' => "Bearer {$access_token}"],
            $options
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
        $gql = (new Query())
            ->setSelectionSet([
                (new Query('userIdentity'))
                    ->setSelectionSet([
                        (new Query('activeContact'))
                            ->setSelectionSet([
                                'id',
                                'name',
                                'email',
                                'isWptPaidUser',
                                'isWptAccountVerified'
                            ]),
                        (new Query('levelSummary'))
                            ->setSelectionSet([
                                'levelId',
                                'levelType',
                                'levelName',
                                'isWptEnterpriseClient'
                            ]),

                    ]),
                (new Query('braintreeCustomerDetails'))
                    ->setSelectionSet([
                        'remainingRuns',
                        'monthlyRuns'
                    ])
            ]);

        try {
            $account_details = $this->graphql_client->runQuery($gql, true);
            return $account_details->getData();
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

        try {
            $contact_info = $this->graphql_client->runQuery($gql, true, $variables_array);
            return $contact_info->getData()['contact'][0];
        } catch (BaseException $e) {
            throw new ClientException($e->getMessage());
        }
    }

    /**
     * @return array WebPageTest\Plan[]
     */
    public function getWptPlans(): array
    {
        $gql = (new Query('wptPlan'))
        ->setSelectionSet([
            'name',
            'priceInCents',
            'description',
            'interval',
            'monthlyTestRuns'
        ]);

        $results = $this->graphql_client->runQuery($gql, true);
        return array_map(function ($data): Plan {
            $options = [
            'id' => $data['name'],
            'name' => $data['description'],
            'priceInCents' => $data['priceInCents'],
            'billingFrequency' => $data['interval'],
            'runs' => $data['monthlyTestRuns']
            ];

            return new Plan($options);
        }, $results->getData()['wptPlan']);
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
                (new Query('wptCustomer'))
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
                        'monthlyRuns',
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

    public function getPaidEnterpriseAccountPageInfo(): array
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
                        'monthlyRuns',
                        'planRenewalDate',
                        'billingFrequency',
                        'wptPlanName'
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

    public function deleteApiKey(array $ids): array
    {
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

    public function addWptSubscription(Customer $customer): array
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

        $variables_array = array('customer' => $customer->toArray());

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables_array);
            return $results->getData()['wptAddSubscription'];
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function cancelWptSubscription(string $subscription_id, string $reason = "", string $suggestion = ""): array
    {
        $wpt_api_subscription_cancellation = new SubscriptionCancellationInputType($subscription_id, $reason, $suggestion);

        $gql = (new Mutation('wptCancelSubscription'))
            ->setVariables([
                new Variable('wptApiSubscriptionCancellation', 'WptSubscriptionCancellationInputType', true)
            ])
            ->setArguments([
                'wptApiSubscriptionCancellation' => '$wptApiSubscriptionCancellation'
            ]);

        $variables = [
          'wptApiSubscriptionCancellation' => $wpt_api_subscription_cancellation->toArray()
        ];

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables);
            return $results->getData();
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function updateWptSubscription(CustomerPaymentUpdateInput $customer)
    {

        $gql = (new Mutation('braintreeUpdatePayment'))
            ->setVariables([
                new Variable('wptUpdatePaymentDetails', 'CustomerPaymentUpdateInputType', true)
            ])
            ->setArguments([
                'braintreeCustomer' => '$wptUpdatePaymentDetails'
            ]);

        $variables_array = array('wptUpdatePaymentDetails' => $customer->toArray());

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables_array);
            return $results->getData();
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function resendEmailVerification()
    {
        $gql = (new Mutation('wptResendVerificationMail'));
        try {
            $results = $this->graphql_client->runQuery($gql, true);
            return $results->getData();
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function getTestHistory(int $days = 1): array
    {
        $view_hours = $days * 24;
        $gql = (new Query('wptTestHistory'))
            ->setVariables([
                new Variable('viewHours', 'Int', true)
            ])
            ->setArguments([
                'viewHours' => '$viewHours'
            ])
            ->setSelectionSet([
                'id',
                'testId',
                'url',
                'location',
                'label',
                'testStartTime',
                'user',
                'apiKey',
                'testRuns'
            ]);

        $variables = [
            'viewHours' => $view_hours
        ];

        $response = $this->graphql_client->runQuery($gql, true, $variables);
        $data = $response->getData()['wptTestHistory'];
        $test_history = array_map(function ($record): TestRecord {
            try {
                return new TestRecord($record);
            } catch (\Exception $e) {
                error_log($e->getMessage());
            }
        }, $data);
        return $test_history;
    }

    /**
     * Using this to get the total non-exempt runs a user has made since a passed
     * $date (DateTime object). This will mostly be used to go from the first
     * of the month UTC.
     */
    public function getTotalRunsSince(DateTime $date): int
    {
        $current_time = time();
        $since_time = $date->getTimestamp();

        $seconds_since = $current_time - $since_time;
        $view_hours = ($seconds_since / 60) / 60;


        $gql = (new Query('wptTestHistory'))
            ->setVariables([
                new Variable('viewHours', 'Int', true)
            ])
            ->setArguments([
                'viewHours' => '$viewHours'
            ])
            ->setSelectionSet([
                'url',
                'testRuns'
            ]);

        $variables = [
            'viewHours' => $view_hours
        ];

        $response = $this->graphql_client->runQuery($gql, true, $variables);
        $data = $response->getData()['wptTestHistory'];

        // filter exempt hosts so we don't count that against the user
        $nonExemptRuns = array_filter($data, function ($val) {
            $url = $val['url'];
            $host = preg_replace('/www\./', '', parse_url($url, PHP_URL_HOST));
            return $host != Util::getExemptHost();
        });

        $sum = array_reduce(array_map(function ($val) {
            return $val['testRuns'];
        }, $nonExemptRuns), function ($carry, $item) {
            $carry += $item;
            return $carry;
        }, 0);

        return $sum;
    }

    public function getChargifySubscriptionPreview(string $plan, ShippingAddress $shipping_address): SubscriptionPreview
    {
        $gql = (new Query('wptSubscriptionPreview'))
            ->setVariables([
                new Variable('wptPlanHandle', 'String', true),
                new Variable('shippingAddress', 'ChargifyAddressInputType', true)
            ])
            ->setArguments([
                'wptPlanHandle' => '$wptPlanHandle',
                'shippingAddress' => '$shippingAddress'
            ])
            ->setSelectionSet([
                'totalInCents',
                'subTotalInCents',
                'taxInCents'
            ]);

        $variables = [
            'wptPlanHandle' => $plan,
            'shippingAddress' => $shipping_address->toArray()
        ];

        $response = $this->graphql_client->runQuery($gql, true, $variables);
        $data = $response->getData()['wptSubscriptionPreview'];

        return new SubscriptionPreview([
          "total_in_cents" => $data['totalInCents'],
          "sub_total_in_cents" => $data['subTotalInCents'],
          "tax_in_cents" => $data['taxInCents']
        ]);
    }

    public function getWptCustomer(): CPCustomer
    {
          $gql = (new Query('wptCustomer'))
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
                  'remainingRuns',
                  'monthlyRuns',
                  'planRenewalDate',
                  'billingFrequency',
                  'wptPlanName'
              ]);
        $response = $this->graphql_client->runQuery($gql, true);
        $data = $response->getData()['wptCustomer'];
        return new CPCustomer($data);
    }

    public function getInvoice(string $subscription_id): ChargifyInvoiceResponseType
    {

        $gql = (new Query('invoice'))
          ->setVariables([
              new Variable('subscriptionId', 'String', true),
          ])
          ->setArguments([
              'subscriptionId' => '$subscriptionId',
          ])
          ->setSelectionSet([
              'number',
              'issueDate',
              'dueDate',
              'status',
              'currency',
              'productName',
              'memo',
              'subtotalAmount',
              'discountAmount',
              'taxAmount',
              'totalAmount',
              'creditAmount',
              'refundAmount',
              'paidAmount',
              'dueAmount',
              (new Query('seller'))
                  ->setSelectionSet([
                      'name',
                      'phone',
                      (new Query('address'))
                          ->setSelectionSet([
                              'street',
                              'line2',
                              'city',
                              'state',
                              'zip',
                              'country'
                          ])
                  ]),
              (new Query('customer'))
                  ->setSelectionSet([
                      'chargifyId',
                      'firstName',
                      'lastName',
                      'email',
                      'organization'
                  ]),
              (new Query('billingAddress'))
                  ->setSelectionSet([
                      'street',
                      'line2',
                      'city',
                      'state',
                      'zip',
                      'country'
                  ]),
              (new Query('shippingAddress'))
                  ->setSelectionSet([
                      'street',
                      'line2',
                      'city',
                      'state',
                      'zip',
                      'country'
                  ]),
              (new Query('lineItems'))
                  ->setSelectionSet([
                      'title',
                      'description',
                      'quantity',
                      'subtotalAmount',
                      'unitPrice',
                      'periodRangeStart',
                      'periodRangeEnd'
                  ]),
              (new Query('taxes'))
                  ->setSelectionSet([
                      'title',
                      'sourceType',
                      'sourceId',
                      'totalAmount',
                      'percentage',
                      'taxAmount'
                ]),
              (new Query('credits'))
                  ->setSelectionSet([
                      'creditNoteNumber',
                      'transactionTime',
                      'memo',
                      'originalAmount',
                      'appliedAmount'
                ]),
              (new Query('refunds'))
                  ->setSelectionSet([
                      'transactionId',
                      'paymentId',
                      'memo',
                      'originalAmount',
                      'appliedAmount',
                      'gatewayTransactionId'
                  ]),
              (new Query('payments'))
                  ->setSelectionSet([
                      'transactionId',
                      'transactionTime',
                      'memo',
                      'originalAmount',
                      'appliedAmount',
                      'prepayment',
                      'gatewayTransactionId',
                      (new Query('paymentMethod'))
                          ->setSelectionSet([
                              'details',
                              'kind',
                              'memo',
                              'type',
                              'cardBrand',
                              'cardExpiration',
                              'maskedCardNumber',
                              'lastFour'
                          ])
                  ])
          ]);


        $variables = [
            'subscriptionId' => $subscription_id
        ];

        $results = $this->graphql_client->runQuery($gql, true, $variables);
        $data = $results->getData('invoice');
        return new ChargifyInvoiceResponseType($data);
    }

    public function getTransactionHistory(string $subscription_id): ChargifyInvoicePaymentList
    {
        $gql = (new Query('invoice'))
          ->setVariables([
              new Variable('subscriptionId', 'String', true),
          ])
          ->setArguments([
              'subscriptionId' => '$subscriptionId',
          ])
          ->setSelectionSet([
              (new Query('payments'))
                        ->setSelectionSet([
                            'transactionId',
                            'transactionTime',
                            'memo',
                            'originalAmount',
                            'appliedAmount',
                            'prepayment',
                            'gatewayTransactionId',
                            (new Query('paymentMethod'))
                                ->setSelectionSet([
                                    'details',
                                    'kind',
                                    'memo',
                                    'type',
                                    'cardBrand',
                                    'cardExpiration',
                                    'maskedCardNumber',
                                    'lastFour'
                                ])
                        ])
          ]);

        $variables = [
          'subscriptionId' => $subscription_id
        ];

        $results = $this->graphql_client->runQuery($gql, true, $variables);
        $data = $results->getData('invoice');
        $payment_list = new ChargifyInvoicePaymentList();
        foreach ($data['payments'] as $payment) {
            $payment_list->add(new ChargifyInvoicePayment($payment));
        }

        return $payment_list;
    }
}
