<?php declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\CPClient;
use WebPageTest\AuthToken;
use WebPageTest\Exception\ClientException;

use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Middleware;

final class CPClientTest extends TestCase {
  public function testConstructorSetsDefaults () : void {
    $host = 'http://127.0.0.1';

    $client = new CPClient($host, array());

    $this->assertNull($client->client_id);
    $this->assertNull($client->client_secret);
  }

  public function testConstructorSetsValues () : void {
    $auth_client_options = array (
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

  public function testLoginCallsCorrectEndpointWithBody () : void {
    $results = [];
    $handler = $this->createRequestMock($results);
    $host = "http://webpagetest.org";
    $code = "janet";
    $verify = "janet2";
    $redirect_uri = "{$host}/ihaveapassword";
    $base = 'http://127.0.0.1';
    $client = new CPClient($host, array( 'auth_client_options' => [
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

  public function testLoginRespondsWithAuthToken () : void {
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

  public function testBadLoginResponse () : void {
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

  public function testRefreshAuthTokenCallsCorrectEndpoint () : void {
    $results = [];
    $handler = $this->createRequestMock($results);
    $host = "http://webpagetest.org";
    $refresh_token = "janetno";
    $base = 'http://127.0.0.1';
    $client = new CPClient($host, array( 'auth_client_options' => [
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

  public function testRefreshAuthTokenRespondsWithAuthToken () : void {
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

  public function testRefreshAuthTokenBadResponse () : void {
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

    $this->expectException(ClientException::class);
    $client->refreshAuthToken($refresh_token);
  }

  public function testRevokeTokenCallsCorrectEndpoint () : void {
    $results = [];
    $handler = $this->createRequestMock($results);
    $host = "http://webpagetest.org";
    $token = "janetno";
    $base = 'http://127.0.0.1';
    $client = new CPClient($host, array( 'auth_client_options' => [
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

  public function testRevokeTokenThrowsNoErrorOnOk () : void {
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

  public function testRevokeTokenBadResponse () : void {
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

  public function testGetUserDetails () : void {
    $handler = $this->createMockResponse(200, '{
    "data": {
      "userIdentity": {
        "activeContact": {
          "id": 263425,
          "name": "Alice Bob",
          "email": "alicebob@catchpoint.com",
          "isWptPaidUser": true,
          "isWptAccountVerified": true
        }
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

    $data = $client->getUserDetails();
    $this->assertEquals('263425', $data['activeContact']['id']);
  }

  public function testGetUserDetailsWithError () : void {
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
    $client->getUserDetails();
  }

  public function testGetUserContactInfo () : void {
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

  public function testGetUserContactInfoWithError () : void {
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

  public function testGetUnpaidAccountpageInfo () : void {
    $handler = $this->createMockResponse(200, '{
    "data": {
      "braintreeClientToken": "abcdef",
      "wptPlans": [
        {
          "id": "ap7",
          "name": "10,000 runs",
          "price": 1620.00,
          "billingFrequency": 12,
          "billingDayOfMonth": null,
          "currencyIsoCode": "USD",
          "numberOfBillingCycles": null,
          "trialDuration": null,
          "trialPeriod": false,
          "discount": null
        },
        {
          "id": "mp7",
          "name": "10,000 runs",
          "price": 168.75,
          "billingFrequency": 1,
          "billingDayOfMonth": null,
          "currencyIsoCode": "USD",
          "numberOfBillingCycles": null,
          "trialDuration": null,
          "trialPeriod": false,
          "discount": null
        },
        {
          "id": "ap5",
          "name": "1,000 runs",
          "price": 180.00,
          "billingFrequency": 12,
          "billingDayOfMonth": null,
          "currencyIsoCode": "USD",
          "numberOfBillingCycles": null,
          "trialDuration": null,
          "trialPeriod": false,
          "discount": null
        },
        {
          "id": "mp5",
          "name": "1000 runs",
          "price": 18.75,
          "billingFrequency": 1,
          "billingDayOfMonth": null,
          "currencyIsoCode": "USD",
          "numberOfBillingCycles": null,
          "trialDuration": null,
          "trialPeriod": false,
          "discount": null
        },
        {
          "id": "ap8",
          "name": "20,000 runs",
          "price": 3000.00,
          "billingFrequency": 12,
          "billingDayOfMonth": null,
          "currencyIsoCode": "USD",
          "numberOfBillingCycles": null,
          "trialDuration": null,
          "trialPeriod": false,
          "discount": null
        },
        {
          "id": "mp8",
          "name": "20,000 runs",
          "price": 312.50,
          "billingFrequency": 1,
          "billingDayOfMonth": null,
          "currencyIsoCode": "USD",
          "numberOfBillingCycles": null,
          "trialDuration": null,
          "trialPeriod": false,
          "discount": null
        },
        {
          "id": "ap6",
          "name": "5,000 runs",
          "price": 840.00,
          "billingFrequency": 12,
          "billingDayOfMonth": null,
          "currencyIsoCode": "USD",
          "numberOfBillingCycles": null,
          "trialDuration": null,
          "trialPeriod": false,
          "discount": null
        },
        {
          "id": "mp6",
          "name": "5,000 runs",
          "price": 87.50,
          "billingFrequency": 1,
          "billingDayOfMonth": null,
          "currencyIsoCode": "USD",
          "numberOfBillingCycles": null,
          "trialDuration": null,
          "trialPeriod": false,
          "discount": null
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

    $data = $client->getUnpaidAccountpageInfo();
    $this->assertEquals(8, count($data['wptPlans']));
  }

  private function createMockResponse (int $status, string $body) : HandlerStack {
    $mock = new MockHandler([new Response($status, [], $body)]);
    return HandlerStack::create($mock);
  }

  private function createRequestMock (array &$results) : HandlerStack {
    $history = Middleware::history($results);
    $handler = HandlerStack::create();
    $handler->push($history);
    return $handler;
  }
}

?>
