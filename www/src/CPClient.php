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
use WebPageTest\CPGraphQlTypes\ApiKey;
use WebPageTest\CPGraphQlTypes\ApiKeyList;
use WebPageTest\CPGraphQlTypes\ChargifyAddressInput as ShippingAddress;
use WebPageTest\CPGraphQlTypes\ChargifySubscriptionPreviewResponse as SubscriptionPreview;
use WebPageTest\CPGraphQlTypes\Customer as CPCustomer;
use WebPageTest\CPGraphQlTypes\EnterpriseCustomer;
use WebPageTest\TestRecord;
use WebPageTest\Util;
use WebPageTest\Util\Cache;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceResponseType;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceResponseTypeList;
use WebPageTest\CPGraphQlTypes\ChargifyInvoicePayment;
use WebPageTest\CPGraphQlTypes\ChargifyInvoicePaymentList;
use WebPageTest\CPGraphQlTypes\ChargifySubscriptionInputType;
use WebPageTest\CPGraphQlTypes\ContactUpdateInput;
use WebPageTest\CPGraphQlTypes\SubscriptionCancellationInputType;
use WebPageTest\PaidPageInfo;
use WebPageTest\PlanList;
use WebPageTest\PlanListSet;

class CPClient
{
    private GuzzleClient $auth_client;
    private GuzzleClient $auth_verification_client;
    private GraphQLClient $graphql_client;
    public ?string $client_id;
    public ?string $client_secret;
    private ?string $access_token;
    private $handler; // For unit tests

    public function __construct(string $host, array $options = [])
    {
        $auth_client_options = $options['auth_client_options'] ?? array();
        $graphql_client_options = array(
            'timeout' => 5,
            'connect_timeout' => 5
        );

        $this->client_id = $auth_client_options['client_id'] ?? null;
        $this->client_secret = $auth_client_options['client_secret'] ?? null;
        $this->handler = $auth_client_options['handler'] ?? null;
        $this->auth_client = new GuzzleClient($auth_client_options);

        if (!empty($auth_client_options['auth_login_verification_host'])) {
            $auth_client_options['base_uri'] = $auth_client_options['auth_login_verification_host'];
        }
        $this->auth_verification_client = new GuzzleClient($auth_client_options);

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
            $response = $this->auth_verification_client->request('POST', '/auth/connect/token', $body);
        } catch (GuzzleException $e) {
            if ($e->getCode() == 401 || $e->getCode() == 403) {
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
            $response = $this->auth_verification_client->request('POST', '/auth/connect/token', $body);
        } catch (GuzzleException $e) {
            if ($e->getCode() == 400 || $e->getCode() == 401 || $e->getCode() == 403) {
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
            $this->auth_verification_client->request('POST', '/auth/connect/revocation', $body);
        } catch (GuzzleException $e) {
            if ($e->getCode() == 401 || $e->getCode() == 403) {
                throw new UnauthorizedException();
            }
            throw new ClientException($e->getMessage());
        } catch (BaseException $e) {
            throw new ClientException($e->getMessage());
        }
    }

    public function getUser(): User
    {
        $gql = (new Query())
            ->setSelectionSet([
                (new Query('userIdentity'))
                    ->setSelectionSet([
                        'id',
                        (new Query('activeContact'))
                            ->setSelectionSet([
                                'id',
                                'firstName',
                                'lastName',
                                'companyName',
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
                (new Query('wptCustomer'))
                    ->setSelectionSet([
                        'remainingRuns',
                        'monthlyRuns',
                        'subscriptionId',
                        'planRenewalDate',
                        'nextBillingDate',
                        'status'
                    ])
            ]);

        try {
            $account_details = $this->graphql_client->runQuery($gql, true);
            $data = $account_details->getData();

            $user = new User();
            $remaining_runs = (int)$data['wptCustomer']['remainingRuns'];
            $user->setRemainingRuns($remaining_runs);
            $monthly_runs = (int)$data['wptCustomer']['monthlyRuns'];
            $user->setMonthlyRuns($monthly_runs);
            $run_renewal_date = $data['wptCustomer']['planRenewalDate'];
            // monthly users have next billing date set but not run renewal when they sign up
            if (is_null($run_renewal_date) && !is_null($data['wptCustomer']['nextBillingDate'])) {
                $run_renewal_date = $data['wptCustomer']['nextBillingDate'];
            }
            $user->setRunRenewalDate($run_renewal_date);
            $user->setSubscriptionId($data['wptCustomer']['subscriptionId']);
            $user->setUserId($data['userIdentity']['id']);
            $user->setContactId($data['userIdentity']['activeContact']['id']);
            $user->setEmail($data['userIdentity']['activeContact']['email']);
            $user->setPaidClient($data['userIdentity']['activeContact']['isWptPaidUser']);
            $user->setPaymentStatus($data['wptCustomer']['status']);
            $user->setVerified($data['userIdentity']['activeContact']['isWptAccountVerified']);
            $user->setFirstName($data['userIdentity']['activeContact']['firstName']);
            $user->setLastName($data['userIdentity']['activeContact']['lastName']);
            $user->setCompanyName($data['userIdentity']['activeContact']['companyName']);
            $user->setOwnerId($data['userIdentity']['levelSummary']['levelId']);
            $user->setEnterpriseClient(!!$data['userIdentity']['levelSummary']['isWptEnterpriseClient']);

            return $user;
        } catch (GuzzleException $e) {
            if ($e->getCode() == 401 || $e->getCode() == 403) {
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

    public function getFullWptPlanSet(): PlanListSet
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
        $all_plans = array_map(function ($data): Plan {
            $options = [
                'id' => $data['name'],
                'name' => $data['description'],
                'priceInCents' => $data['priceInCents'],
                'billingFrequency' => $data['interval'],
                'runs' => $data['monthlyTestRuns']
            ];

            return new Plan($options);
        }, $results->getData()['wptPlan'] ?? []);

          $current_plans = array_filter($all_plans, function (Plan $plan) {
              /** This is a bit of a hack for now. These are our approved plans for new
               * customers to be able to use. We will better handle this from the backend
               * */
                return strtolower($plan->getId()) == 'ap5' ||
                     strtolower($plan->getId()) == 'ap6' ||
                     strtolower($plan->getId()) == 'ap7' ||
                     strtolower($plan->getId()) == 'ap8' ||
                     strtolower($plan->getId()) == 'mp5' ||
                     strtolower($plan->getId()) == 'mp6' ||
                     strtolower($plan->getId()) == 'mp7' ||
                     strtolower($plan->getId()) == 'mp8';
          });
        $set = new PlanListSet();
        $set->setAllPlans(new PlanList(...$all_plans));
        $set->setCurrentPlans(new PlanList(...$current_plans));
        return $set;
    }

    public function getWptPlans(): PlanList
    {
        $fetched = Cache::fetchWptPlans();
        if (!empty($fetched)) {
            return $fetched;
        }
        $gql = (new Query('wptPlan'))
            ->setSelectionSet([
                'name',
                'priceInCents',
                'description',
                'interval',
                'monthlyTestRuns'
            ]);

        $results = $this->graphql_client->runQuery($gql, true);
        $plans = array_map(function ($data): Plan {
            $options = [
                'id' => $data['name'],
                'name' => $data['description'],
                'priceInCents' => $data['priceInCents'],
                'billingFrequency' => $data['interval'],
                'runs' => $data['monthlyTestRuns']
            ];

            return new Plan($options);
        }, $results->getData()['wptPlan'] ?? []);

        /** This is a bit of a hack for now. These are our approved plans for new
         * customers to be able to use. We will better handle this from the backend
         *
         */
        $active_current_sellable_plans = array_filter(
            explode(',', Util::getSetting('active_current_sellable_plans', '')),
            function ($str) {
                return strlen($str);
            }
        ) ?: ['ap5', 'ap6', 'ap7', 'ap8', 'mp5', 'mp6', 'mp7', 'mp8'];

        $plans = array_filter($plans, function (Plan $plan) use ($active_current_sellable_plans): bool {
            return in_array(strtolower($plan->getId()), $active_current_sellable_plans);
        });

        $plan_list = new PlanList(...$plans);
        if (count($plan_list) > 0) {
            Cache::storeWptPlans($plan_list);
        }
        return $plan_list;
    }

    public function getPaidAccountPageInfo(): PaidPageInfo
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
                        'creditCardType',
                        'nextBillingDate',
                        'numberOfBillingCycles',
                        'ccExpirationDate',
                        'ccImageUrl',
                        'status',
                        'remainingRuns',
                        'monthlyRuns',
                        'planRenewalDate',
                        'billingFrequency',
                        'wptPlanName',
                        'nextWptPlanId',
                        'creditCardBillingAddress',
                        'creditCardBillingAddress2',
                        'creditCardBillingCity',
                        'creditCardBillingState',
                        'creditCardBillingZip',
                        'creditCardBillingCountry'
                    ])
            ]);

        try {
            $results = $this->graphql_client->runQuery($gql, true);
            $customer = $results->getData()['wptCustomer'];
            $api_keys = array_map(function ($key): ApiKey {
                return new ApiKey($key);
            }, $results->getData()['wptApiKey']);
            return new PaidPageInfo(new CPCustomer($customer), new ApiKeyList(...$api_keys));
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    public function getPaidEnterpriseAccountPageInfo(): EnterprisePaidPageInfo
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
                        'wptPlanId',
                        'status',
                        'remainingRuns',
                        'monthlyRuns',
                        'planRenewalDate',
                        'billingPeriodEndDate'
                    ])
            ]);
        try {
            $results = $this->graphql_client->runQuery($gql, true);
            $api_keys = array_map(function ($key): ApiKey {
                return new ApiKey($key);
            }, $results->getData()['wptApiKey']);
            $customer = new EnterpriseCustomer($results->getData()['wptCustomer']);
            return new EnterprisePaidPageInfo($customer, new ApiKeyList(...$api_keys));
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    /**
     * @return array|object
     */
    public function updateUserContactInfo(string $id, array $options)
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

        $contact_update = new ContactUpdateInput(array_merge([], ['id' => $id], $options));
        $variables_array = [
            'contact' => $contact_update->toArray()
        ];

        $results = $this->graphql_client->runQuery($gql, true, $variables_array);
        return $results->getData();
    }

    /**
     * @return array|object
     */
    public function changePassword(string $new_pass, string $current_pass)
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

    /**
     * @return array|object
     */
    public function createApiKey(string $name)
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

    /**
     * @return array|object
     */
    public function deleteApiKey(array $ids)
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

    public function addWptSubscription(ChargifySubscriptionInputType $subscription): array
    {
        $gql = (new Mutation('wptCreateSubscription'))
            ->setVariables([
                new Variable('subscription', 'ChargifySubscriptionInputType', true)
            ])
            ->setArguments([
                'subscription' => '$subscription'
            ])
            ->setSelectionSet([
                'company',
                'firstName',
                'lastName',
                'email',
                'loginVerificationId'
            ]);

        $variables = array('subscription' => $subscription->toArray());

        try {
            $results = $this->graphql_client->runQuery($gql, true, $variables);
            return $results->getData()['wptCreateSubscription'];
        } catch (QueryError $e) {
            throw new ClientException(implode(",", $e->getErrorDetails()));
        }
    }

    /**
     * @return array|object
     */
    public function cancelWptSubscription(
        string $subscription_id,
        string $reason = "",
        string $suggestion = ""
    ) {
        $wpt_api_subscription_cancellation =
            new SubscriptionCancellationInputType($subscription_id, $reason, $suggestion);

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
                'creditCardType',
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
                'wptPlanName',
                'nextWptPlanId',
                'creditCardBillingAddress',
                'creditCardBillingAddress2',
                'creditCardBillingCity',
                'creditCardBillingState',
                'creditCardBillingZip',
                'creditCardBillingCountry'
            ]);
        $response = $this->graphql_client->runQuery($gql, true);
        $data = $response->getData()['wptCustomer'];
        return new CPCustomer($data);
    }

    public function getInvoices(string $subscription_id): ChargifyInvoiceResponseTypeList
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
        $invoices = array_map(function ($invoice): ChargifyInvoiceResponseType {
            return new ChargifyInvoiceResponseType($invoice);
        }, $results->getData()['invoice']);
        return new ChargifyInvoiceResponseTypeList(...$invoices);
    }

    public function getTransactionHistory(string $subscription_id): ChargifyInvoicePaymentList
    {
        $gql = (new Query('invoices'))
            ->setVariables([
                new Variable('subscriptionId', 'String', true),
            ])
            ->setArguments([
                'subscriptionId' => '$subscriptionId',
            ])
            ->setSelectionSet([
                'publicUrl',
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
        $payments = array_map(function ($invoice): array {
            $public_url = $invoice['publicUrl'];
            return array_map(function ($payment) use ($public_url): ChargifyInvoicePayment {
                $cip = new ChargifyInvoicePayment($payment);
                $cip->setInvoiceLink($public_url);
                return $cip;
            }, $invoice['payments']);
        }, $results->getData()['invoices']) ?? [];
        return new ChargifyInvoicePaymentList(...array_merge([], ...array_values($payments)));
    }

    public function getApiKeys(): array
    {
        $gql = (new Query('wptApiKey'))
            ->setSelectionSet([
                'id',
                'name',
                'apiKey',
                'createDate',
                'changeDate'
            ]);

        $results = $this->graphql_client->runQuery($gql, true);
        $data = $results->getData()['wptApiKey'];
        return $data;
    }

    public function updatePlan(string $subscription_id, string $next_plan_handle, bool $is_upgrade = true): bool
    {
        $mutation_name = $is_upgrade ? 'upgradeSubscription' : 'downgradeSubscription';
        $gql = (new Mutation($mutation_name))
            ->setVariables([
                new Variable('subscriptionId', 'String', true),
                new Variable('nextPlanHandle', 'String', true)
            ])
            ->setArguments([
                'subscriptionId' => '$subscriptionId',
                'nextPlanHandle' => '$nextPlanHandle'
            ]);

        $variables = [
            'subscriptionId' => $subscription_id,
            'nextPlanHandle' => $next_plan_handle
        ];

        $results = $this->graphql_client->runQuery($gql, true, $variables);
        return $results->getData()[$mutation_name];
    }

    public function updatePaymentMethod(string $token, ShippingAddress $address): bool
    {
        $gql = (new Mutation('wptUpdateSubscriptionPayment'))
        ->setVariables([
          new Variable('paymentToken', 'String', true),
          new Variable('shippingAddress', 'ChargifyAddressInputType', true)
        ])
        ->setArguments([
          'paymentToken' => '$paymentToken',
          'shippingAddress' => '$shippingAddress'
        ]);

        $variables = [
          'paymentToken' => $token,
          'shippingAddress' => $address->toArray()
        ];

        $results = $this->graphql_client->runQuery($gql, true, $variables);
        return $results->getData()['wptUpdateSubscriptionPayment'];
    }
}
