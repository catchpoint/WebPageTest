<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\CPClient;
use WebPageTest\AuthToken;
use WebPageTest\Exception\ClientException;
use WebPageTest\Exception\UnauthorizedException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Middleware;

final class CPClientTest extends TestCase
{
    public function testConstructorSetsDefaults(): void
    {
        $host = 'http://127.0.0.1';

        $client = new CPClient($host, array());

        $this->assertNull($client->client_id);
        $this->assertNull($client->client_secret);
    }

    public function testConstructorSetsValues(): void
    {
        $auth_client_options = array(
            'client_id' => '123',
            'client_secret' => '345'
        );
        $host = 'http://127.0.0.1';

        $client = new CPClient($host, array(
            'auth_client_options' => $auth_client_options
        ));

        $this->assertEquals('123', $client->client_id);
        $this->assertEquals('345', $client->client_secret);
    }

    public function testAuthenticateSetsAccessToken(): void
    {
        $host = 'http://127.0.0.1';
        $token = "ABCDEF123";

        $client = new CPClient($host, array());
        $this->assertFalse($client->isAuthenticated());
        $client->authenticate($token);
        $this->assertEquals($token, $client->getAccessToken());
        $this->assertTrue($client->isAuthenticated());
    }

    public function testLoginCallsCorrectEndpointWithBody(): void
    {
        $results = [];
        $handler = $this->createRequestMock($results);
        $host = "http://webpagetest.org";
        $code = "janet";
        $verify = "janet2";
        $redirect_uri = "{$host}/ihaveapassword";
        $base = 'http://127.0.0.1';
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'base_uri' => $base,
                'client_id' => '123',
                'client_secret' => '345',
                'handler' => $handler
            ]
        ));
        try {
            $client->login($code, $verify, $redirect_uri);
        } catch (Exception $e) {
            // this tries to live hit your local machine, kill it instantly
        }

        $this->assertCount(1, $results);
        $transaction = $results[0];
        $expected_method = 'POST';
        $expected_body = 'client_id=123&client_secret=345&grant_type=authorization_code&code=janet&code_verifier=janet2&scope=openid+Symphony+offline_access&redirect_uri=http%3A%2F%2Fwebpagetest.org%2Fihaveapassword';
        $expected_uri = "{$base}/auth/connect/token";

        $this->assertEquals($expected_method, $transaction['request']->getMethod());
        $this->assertEquals($expected_body, $transaction['request']->getBody());
        $this->assertEquals($expected_uri, $transaction['request']->getURI());
    }

    public function testLoginRespondsWithAuthToken(): void
    {
        $handler = $this->createMockResponse(200, '{
      "access_token": "abcdef123",
      "expires_in": 4,
      "refresh_token": "bcedef1234",
      "scope": "ohno",
      "token_type": "id"
    }');
        $host = "http://webpagetest.org";
        $code = "janet";
        $verify = "janet2";
        $redirect_uri = "{$host}/ihaveapassword";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'handler' => $handler
            ]
        ));

        $auth_token = $client->login($code, $verify, $redirect_uri);
        $this->assertInstanceOf(AuthToken::class, $auth_token);
        $this->assertEquals('abcdef123', $auth_token->access_token);
    }

    public function testBadLoginResponse(): void
    {
        $handler = $this->createMockResponse(400, '{ "error": "invalid" }');
        $host = "http://webpagetest.org";
        $code = "janet";
        $verify = "janet2";
        $redirect_uri = "{$host}/ihaveapassword";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'handler' => $handler
            ]
        ));

        $this->expectException(ClientException::class);
        $client->login($code, $verify, $redirect_uri);
    }

    public function testRefreshAuthTokenCallsCorrectEndpoint(): void
    {
        $results = [];
        $handler = $this->createRequestMock($results);
        $host = "http://webpagetest.org";
        $refresh_token = "janetno";
        $base = 'http://127.0.0.1';
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'base_uri' => $base,
                'client_id' => '123',
                'client_secret' => '345',
                'grant_type' => 'refresh_token',
                'handler' => $handler
            ]
        ));
        try {
            $client->refreshAuthToken($refresh_token);
        } catch (Exception $e) {
            // this tries to live hit your local machine, kill it instantly
        }

        $this->assertCount(1, $results);
        $transaction = $results[0];
        $expected_method = 'POST';
        $expected_body = 'client_id=123&client_secret=345&grant_type=refresh_token&refresh_token=janetno';
        $expected_uri = "{$base}/auth/connect/token";

        $this->assertEquals($expected_method, $transaction['request']->getMethod());
        $this->assertEquals($expected_body, $transaction['request']->getBody());
        $this->assertEquals($expected_uri, $transaction['request']->getURI());
    }

    public function testRefreshAuthTokenRespondsWithAuthToken(): void
    {
        $handler = $this->createMockResponse(200, '{
    "access_token": "123",
    "expires_in": 4,
    "id_token": "abcdef139",
    "refresh_token": "DEF",
    "scope": "openid",
    "token_type": "sure"
    }');
        $host = "http://webpagetest.org";
        $refresh_token = "janetno";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'grant_type' => 'refresh_token',
                'handler' => $handler
            ]
        ));

        $auth_token = $client->refreshAuthToken($refresh_token);
        $this->assertInstanceOf(AuthToken::class, $auth_token);
        $this->assertEquals('123', $auth_token->access_token);
    }

    public function testRefreshAuthTokenBadResponse(): void
    {
        $handler = $this->createMockResponse(400, '{ "error": "invalid" }');
        $host = "http://webpagetest.org";
        $refresh_token = "janetno";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'grant_type' => 'refresh_token',
                'handler' => $handler
            ]
        ));

        $this->expectException(UnauthorizedException::class);
        $client->refreshAuthToken($refresh_token);
    }

    public function testRevokeTokenCallsCorrectEndpoint(): void
    {
        $results = [];
        $handler = $this->createRequestMock($results);
        $host = "http://webpagetest.org";
        $token = "janetno";
        $base = 'http://127.0.0.1';
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'base_uri' => $base,
                'client_id' => '123',
                'client_secret' => '345',
                'handler' => $handler
            ]
        ));
        try {
            $client->revokeToken($token);
        } catch (Exception $e) {
            // this tries to live hit your local machine, kill it instantly
        }

        $this->assertCount(1, $results);
        $transaction = $results[0];
        $expected_method = 'POST';
        $expected_body = 'token=janetno&token_type_hint=access_token&client_id=123&client_secret=345';
        $expected_uri = "{$base}/auth/connect/revocation";

        $this->assertEquals($expected_method, $transaction['request']->getMethod());
        $this->assertEquals($expected_body, $transaction['request']->getBody());
        $this->assertEquals($expected_uri, $transaction['request']->getURI());
    }

    public function testRevokeTokenThrowsNoErrorOnOk(): void
    {
        $handler = $this->createMockResponse(200, '');
        $host = "http://webpagetest.org";
        $token = "janetno";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'handler' => $handler
            ]
        ));

        $this->assertNull($client->revokeToken($token));
    }

    public function testRevokeTokenBadResponse(): void
    {
        $handler = $this->createMockResponse(400, '{ "error": "invalid" }');
        $host = "http://webpagetest.org";
        $token = "janetno";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'handler' => $handler
            ]
        ));

        $this->expectException(ClientException::class);
        $client->revokeToken($token);
    }

    public function testGetUser(): void
    {
        $handler = $this->createMockResponse(200, '{
            "data": {
              "userIdentity": {
                "activeContact": {
                  "id": 263425,
                  "firstName": "Alice",
                  "lastName": "Bob",
                  "email": "alicebob@catchpoint.com",
                  "isWptPaidUser": true,
                  "isWptAccountVerified": true,
                  "companyName": null
                },
                "levelSummary": {
                  "levelId": 3,
                  "isWptEnterpriseClient": false
                }
              },
              "wptCustomer": {
                "remainingRuns": 300,
                "monthlyRuns": 3000,
                "subscriptionId": "518235",
                "planRenewalDate": "2125-12-25",
                "status": "ACTIVE"
              }
            }
            }');
        $host = "http://webpagetest.org";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'grant_type' => 'these are good to have',
                'handler' => $handler
            ]
        ));

        $user = $client->getUser();
        $this->assertEquals('263425', $user->getUserId());
        $this->assertEquals('Alice', $user->getFirstName());
        $this->assertEquals('Bob', $user->getLastName());
        $this->assertEquals('', $user->getCompanyName());
        $this->assertEquals('alicebob@catchpoint.com', $user->getEmail());
        $this->assertEquals(new DateTime('2125-12-25'), $user->getRunRenewalDate());
        $this->assertTrue($user->isPaid());
        $this->assertTrue($user->isVerified());
        $this->assertFalse($user->isWptEnterpriseClient());
    }

    public function testGetUserWithError(): void
    {
        $handler = $this->createMockResponse(200, '{
            "errors":[
              {
                "message":"Invalid data. This is an error, man",
                "locations":[
                  {
                    "line":1,
                    "column":2
                  }
                ],
                "extensions":{
                  "code":"GRAPHQL_VALIDATION_FAILED",
                  "exception":{
                    "stacktrace":[
                      "Errors all over the place"
                    ]
                  }
                }
              }
            ]
          }');
        $host = "http://webpagetest.org";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'grant_type' => 'these are good to have',
                'handler' => $handler
            ]
        ));

        $this->expectException(ClientException::class);
        $client->getUser();
    }

    public function testGetUserContactInfo(): void
    {
        $handler = $this->createMockResponse(200, '{
            "data": {
              "contact": [
                {
                  "companyName": "catchpoint",
                  "firstName": "Janet",
                  "lastName": "Jones"
                }
              ]
            }
        }');
        $host = "http://webpagetest.org";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'grant_type' => 'these are good to have',
                'handler' => $handler
            ]
        ));

        $data = $client->getUserContactInfo(12345);
        $this->assertEquals('catchpoint', $data['companyName']);
    }

    public function testGetUserContactInfoWithError(): void
    {
        $handler = $this->createMockResponse(200, '{
          "errors":[
            {
              "message":"Invalid data. This is an error, man",
              "locations":[
                {
                  "line":1,
                  "column":2
                }
              ],
              "extensions":{
                "code":"GRAPHQL_VALIDATION_FAILED",
                "exception":{
                  "stacktrace":[
                    "Errors all over the place"
                  ]
                }
              }
            }
          ]
        }');
        $host = "http://webpagetest.org";
        $client = new CPClient($host, array(
            'auth_client_options' => [
                'client_id' => '123',
                'client_secret' => '345',
                'grant_type' => 'these are good to have',
                'handler' => $handler
            ]
        ));

        $this->expectException(ClientException::class);
        $client->getUserContactInfo(12345);
    }

    public function testGetWptPlans(): void
    {
        $handler = $this->createMockResponse(200, '{
            "data": {
              "wptPlan": [
                {
                  "name": "MP1",
                  "priceInCents": 1874,
                  "description": "MP1",
                  "interval": 1,
                  "monthlyTestRuns": 1200
                },
                {
                  "name": "MP2",
                  "priceInCents": 500,
                  "description": "MP2",
                  "interval": 1,
                  "monthlyTestRuns": 5000
                },
                {
                  "name": "MP3",
                  "priceInCents": 12499,
                  "description": "MP3",
                  "interval": 1,
                  "monthlyTestRuns": 12000
                },
                {
                  "name": "AP1",
                  "priceInCents": 17988,
                  "description": "AP1",
                  "interval": 12,
                  "monthlyTestRuns": 1200
                },
                {
                  "name": "MP4",
                  "priceInCents": 24999,
                  "description": "MP4",
                  "interval": 1,
                  "monthlyTestRuns": 25000
                },
                {
                  "name": "AP2",
                  "priceInCents": 59988,
                  "description": "AP2",
                  "interval": 12,
                  "monthlyTestRuns": 5000
                },
                {
                  "name": "AP3",
                  "priceInCents": 119988,
                  "description": "AP3",
                  "interval": 12,
                  "monthlyTestRuns": 12000
                },
                {
                  "name": "AP4",
                  "priceInCents": 158388,
                  "description": "",
                  "interval": 12,
                  "monthlyTestRuns": 25000
                },
                {
                  "name": "AP5",
                  "priceInCents": 158388,
                  "description": "",
                  "interval": 12,
                  "monthlyTestRuns": 25000
                },
                {
                  "name": "AP6",
                  "priceInCents": 158388,
                  "description": "",
                  "interval": 12,
                  "monthlyTestRuns": 25000
                },
                {
                  "name": "MP7",
                  "priceInCents": 158388,
                  "description": "",
                  "interval": 12,
                  "monthlyTestRuns": 25000
                }
              ]
            }
          }');

          $host = "http://webpagetest.org";
          $client = new CPClient($host, array(
              'auth_client_options' => [
                  'client_id' => '123',
                  'client_secret' => '345',
                  'grant_type' => 'these are good to have',
                  'handler' => $handler
              ]
          ));

          $plans = $client->getWptPlans();
          $this->assertEquals(3, count($plans));
    }


    /**
    public function getPaidAccountPageInfo(): PaidPageInfo
        "wptApiKey": [
            {
                "id": 673,
                "name": "webpagetest",
                "apiKey": "12581d97-7b8b-4519-b02f-b404f401a973",
                "createDate": "2022-03-23T09:12:57.937",
                "changeDate": "2022-04-28T08:39:16.023"
    },
    "wptCustomer": {
    }
        ],
    public function getPaidEnterpriseAccountPageInfo(): array
    public function updateUserContactInfo(string $id, array $options): array
    public function changePassword(string $new_pass, string $current_pass): array
    public function createApiKey(string $name): array
    public function deleteApiKey(array $ids): array
    public function addWptSubscription(ChargifySubscriptionInputType $subscription): array
    public function cancelWptSubscription(
    public function resendEmailVerification()
    public function getTestHistory(int $days = 1): array
    public function getTotalRunsSince(DateTime $date): int
    public function getChargifySubscriptionPreview(string $plan, ShippingAddress $shipping_address): SubscriptionPreview
    public function getWptCustomer(): CPCustomer
    public function getInvoices(string $subscription_id): ChargifyInvoiceResponseTypeList
    public function getTransactionHistory(string $subscription_id): ChargifyInvoicePaymentList
    public function getApiKeys(): array
    public function updatePlan(string $subscription_id, string $next_plan_handle): bool
     */
    private function createMockResponse(int $status, string $body): HandlerStack
    {
        $mock = new MockHandler([new Response($status, [], $body)]);
        return HandlerStack::create($mock);
    }

    private function createRequestMock(array &$results): HandlerStack
    {
        $history = Middleware::history($results);
        $handler = HandlerStack::create();
        $handler->push($history);
        return $handler;
    }
}
