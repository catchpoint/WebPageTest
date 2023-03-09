<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\CPSignupClient;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Middleware;

final class CPSignupClientTest extends TestCase
{
    public function testGetWptPlans(): void
    {
        $auth_handler = $this->createMockResponse(200, '{
                "access_token": "123456",
                "scope": "fooby",
                "expires_in": "sure"
        }');

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

          //$host = "http://webpagetest.org";
          $client = new CPSignupClient([
              'base_uri' => '127.0.0.2',
              'redirect_base_uri' => '127.0.0.3',
              'gql_uri' => '127.0.0.4',
              'client_id' => '123',
              'client_secret' => '345',
              'grant_type' => 'these are good to have',
              'auth_handler' => $auth_handler,
              'handler' => $handler
          ]);

          $plans = $client->getWptPlans();
          $this->assertEquals(3, count($plans));
    }

    private function createMockResponse(int $status, string $body): HandlerStack
    {
        $mock = new MockHandler([new Response($status, [], $body)]);
        return HandlerStack::create($mock);
    }

    /*
     * @param array { status: int, body: string } $resps
     *
     */
    private function createMockResponses(array $resps): HandlerStack
    {
        //@var array { Response } $responses
        $responses = array_map(function ($resp) {
            return new Response($resp['status'], [], $resp['body']);
        }, $resps);
        $mock = new MockHandler($responses);
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
