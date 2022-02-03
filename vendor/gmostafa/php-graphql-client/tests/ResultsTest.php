<?php

namespace GraphQL\Tests;

use GraphQL\Exception\QueryError;
use GraphQL\Results;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use stdClass;

/**
 * Class ResultsTest
 *
 * @package GraphQL\Tests
 */
class ResultsTest extends TestCase
{
    /**
     * @var Client
     */
    protected $client;

    /**
     * @var MockHandler
     */
    protected $mockHandler;

    /**
     *
     */
    protected function setUp(): void
    {
        $this->mockHandler = new MockHandler();
        $this->client      = new Client(['handler' => $this->mockHandler]);
    }

    /**
     * @covers \GraphQL\Results::__construct
     * @covers \GraphQL\Results::getResponseObject
     * @covers \GraphQL\Results::getResponseBody
     * @covers \GraphQL\Results::getResults
     * @covers \GraphQL\Results::getData
     */
    public function testGetSuccessResponseAsObject()
    {
        $body = json_encode([
            'data' => [
                'someField' => [
                    [
                        'data' => 'value',
                    ],
                    [
                        'data' => 'value',
                    ]
                ]
            ]
        ]);
        $response = new Response(200, [], $body);
        $this->mockHandler->append($response);

        $response = $this->client->post('', []);
        $results  = new Results($response);

        $this->assertEquals($response, $results->getResponseObject());
        $this->assertEquals($body, $results->getResponseBody());

        $object = new stdClass();
        $object->data = new stdClass();
        $object->data->someField = [];
        $object->data->someField[] = new stdClass();
        $object->data->someField[] = new stdClass();
        $object->data->someField[0]->data = 'value';
        $object->data->someField[1]->data = 'value';
        $this->assertEquals(
            $object,
            $results->getResults()
        );
        $this->assertEquals(
            $object->data,
            $results->getData()
        );
    }

    /**
     * @covers \GraphQL\Results::__construct
     * @covers \GraphQL\Results::getResponseObject
     * @covers \GraphQL\Results::getResponseBody
     * @covers \GraphQL\Results::getResults
     * @covers \GraphQL\Results::getData
     */
    public function testGetSuccessResponseAsArray()
    {
        $body = json_encode([
            'data' => [
                'someField' => [
                    [
                        'data' => 'value',
                    ],
                    [
                        'data' => 'value',
                    ]
                ]
            ]
        ]);
        $originalResponse = new Response(200, [], $body);
        $this->mockHandler->append($originalResponse);

        $response = $this->client->post('', []);
        $results  = new Results($response, true);

        $this->assertEquals($originalResponse, $results->getResponseObject());
        $this->assertEquals($body, $results->getResponseBody());
        $this->assertEquals(
            [
                'data' => [
                    'someField' => [
                        [
                            'data' => 'value',
                        ],
                        [
                            'data' => 'value',
                        ]
                    ]
                ]
            ],
            $results->getResults()
        );
        $this->assertEquals(
            [
                'someField' => [
                        [
                            'data' => 'value',
                        ],
                        [
                            'data' => 'value',
                        ]
                    ]
            ],
            $results->getData()
        );
    }

    /**
     * @covers \GraphQL\Results::__construct
     */
    public function testGetQueryInvalidSyntaxError()
    {
        $body = json_encode([
            'errors' => [
                [
                    'message' => 'some syntax error',
                    'location' => [
                        [
                            'line' => 1,
                            'column' => 3,
                        ]
                    ],
                ]
            ]
        ]);
        $originalResponse = new Response(200, [], $body);
        $this->mockHandler->append($originalResponse);

        $response = $this->client->post('', []);
        $this->expectException(QueryError::class);
        new Results($response);
    }

    /**
     * @covers \GraphQL\Results::__construct
     * @covers \GraphQL\Results::reformatResults
     * @covers \GraphQL\Results::getResponseObject
     * @covers \GraphQL\Results::getResponseBody
     * @covers \GraphQL\Results::getResults
     * @covers \GraphQL\Results::getData
     */
    public function testReformatResultsFromObjectToArray()
    {
        $body = json_encode([
            'data' => [
                'someField' => [
                    [
                        'data' => 'value',
                    ],
                    [
                        'data' => 'value',
                    ]
                ]
            ]
        ]);
        $originalResponse = new Response(200, [], $body);
        $this->mockHandler->append($originalResponse);

        $response = $this->client->post('', []);
        $results  = new Results($response);
        $results->reformatResults(true);

        $this->assertEquals(
            [
                'data' => [
                    'someField' => [
                        [
                            'data' => 'value',
                        ],
                        [
                            'data' => 'value',
                        ]
                    ]
                ]
            ],
            $results->getResults()
        );
        $this->assertEquals(
            [
                'someField' => [
                    [
                        'data' => 'value',
                    ],
                    [
                        'data' => 'value',
                    ]
                ]
            ],
            $results->getData()
        );
    }

    /**
     * @covers \GraphQL\Results::__construct
     * @covers \GraphQL\Results::reformatResults
     * @covers \GraphQL\Results::getResponseObject
     * @covers \GraphQL\Results::getResponseBody
     * @covers \GraphQL\Results::getResults
     * @covers \GraphQL\Results::getData
     */
    public function testReformatResultsFromArrayToObject()
    {
        $body = json_encode([
            'data' => [
                'someField' => [
                    [
                        'data' => 'value',
                    ],
                    [
                        'data' => 'value',
                    ]
                ]
            ]
        ]);
        $originalResponse = new Response(200, [], $body);
        $this->mockHandler->append($originalResponse);

        $response = $this->client->post('', []);
        $results  = new Results($response, true);
        $results->reformatResults(false);

        $object = new stdClass();
        $object->data = new stdClass();
        $object->data->someField = [];
        $object->data->someField[] = new stdClass();
        $object->data->someField[] = new stdClass();
        $object->data->someField[0]->data = 'value';
        $object->data->someField[1]->data = 'value';
        $this->assertEquals(
            $object,
            $results->getResults()
        );
        $this->assertEquals(
            $object->data,
            $results->getData()
        );
    }
}