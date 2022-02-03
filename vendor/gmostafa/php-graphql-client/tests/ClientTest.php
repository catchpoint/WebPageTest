<?php

namespace GraphQL\Tests;

use GraphQL\Client;
use GraphQL\Exception\QueryError;
use GraphQL\Exception\MethodNotSupportedException;
use GraphQL\QueryBuilder\QueryBuilder;
use GraphQL\RawObject;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use TypeError;

/**
 * Class ClientTest
 *
 * @package GraphQL\Tests
 */
class ClientTest extends TestCase
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
        $handler = HandlerStack::create($this->mockHandler);
        $this->client      = new Client('', [], ['handler' => $handler]);
    }

    /**
     * @covers \GraphQL\Client::__construct
     * @covers \GraphQL\Client::runRawQuery
     * @covers \GraphQL\Util\GuzzleAdapter::__construct
     * @covers \GraphQL\Util\GuzzleAdapter::sendRequest
     */
    public function testConstructClient()
    {
        $mockHandler = new MockHandler();
        $handler     = HandlerStack::create($mockHandler);
        $container   = [];
        $history     = Middleware::history($container);
        $handler->push($history);

        $mockHandler->append(new Response(200));
        $mockHandler->append(new Response(200));
        $mockHandler->append(new Response(200));
        $mockHandler->append(new Response(200));
        $mockHandler->append(new Response(200));

        $client = new Client('', [], ['handler' => $handler]);
        $client->runRawQuery('query_string');

        $client = new Client('', ['Authorization' => 'Basic xyz'], ['handler' => $handler]);
        $client->runRawQuery('query_string');

        $client = new Client('', [], ['handler' => $handler]);
        $client->runRawQuery('query_string',  false, ['name' => 'val']);

        $client = new Client('', ['Authorization' => 'Basic xyz'], ['handler' => $handler, 'headers' => [ 'Authorization' => 'Basic zyx', 'User-Agent' => 'test' ]]);
        $client->runRawQuery('query_string');

        /** @var Request $firstRequest */
        $firstRequest = $container[0]['request'];
        $this->assertEquals('{"query":"query_string","variables":{}}', $firstRequest->getBody()->getContents());
        $this->assertSame('POST', $firstRequest->getMethod());

        /** @var Request $thirdRequest */
        $thirdRequest = $container[1]['request'];
        $this->assertNotEmpty($thirdRequest->getHeader('Authorization'));
        $this->assertEquals(
            ['Basic xyz'],
            $thirdRequest->getHeader('Authorization')
        );

        /** @var Request $secondRequest */
        $secondRequest = $container[2]['request'];
        $this->assertEquals('{"query":"query_string","variables":{"name":"val"}}', $secondRequest->getBody()->getContents());

        /** @var Request $fourthRequest */
        $fourthRequest = $container[3]['request'];
        $this->assertNotEmpty($fourthRequest->getHeader('Authorization'));
        $this->assertNotEmpty($fourthRequest->getHeader('User-Agent'));
        $this->assertEquals(['Basic zyx'], $fourthRequest->getHeader('Authorization'));
        $this->assertEquals(['test'], $fourthRequest->getHeader('User-Agent'));
    }

    /**
     * @covers \GraphQL\Client::__construct
     * @covers \GraphQL\Exception\MethodNotSupportedException
     */
    public function testConstructClientWithGetRequestMethod()
    {
        $this->expectException(MethodNotSupportedException::class);
        $client = new Client('', [], [], null, 'GET');
    }

    /**
     * @covers \GraphQL\Client::runQuery
     */
    public function testRunQueryBuilder()
    {
        $this->mockHandler->append(new Response(200, [], json_encode([
            'data' => [
                'someData'
            ]
        ])));

        $response = $this->client->runQuery((new QueryBuilder('obj'))->selectField('field'));
        $this->assertNotNull($response->getData());
    }

    /**
     * @covers \GraphQL\Client::runQuery
     */
    public function testRunInvalidQueryClass()
    {
        $this->expectException(TypeError::class);
        $this->client->runQuery(new RawObject('obj'));
    }

    /**
     * @covers \GraphQL\Client::runRawQuery
     */
    public function testValidQueryResponse()
    {
        $this->mockHandler->append(new Response(200, [], json_encode([
            'data' => [
                'someField' => [
                    [
                        'data' => 'value',
                    ], [
                        'data' => 'value',
                    ]
                ]
            ]
        ])));

        $objectResults = $this->client->runRawQuery('');
        $this->assertIsObject($objectResults->getResults());
    }

    /**
     * @covers \GraphQL\Client::runRawQuery
     */
    public function testValidQueryResponseToArray()
    {
        $this->mockHandler->append(new Response(200, [], json_encode([
            'data' => [
                'someField' => [
                    [
                        'data' => 'value',
                    ], [
                        'data' => 'value',
                    ]
                ]
            ]
        ])));

        $arrayResults = $this->client->runRawQuery('', true);
        $this->assertIsArray($arrayResults->getResults());
    }

    /**
     * @covers \GraphQL\Client::runRawQuery
     */
    public function testInvalidQueryResponseWith200()
    {
        $this->mockHandler->append(new Response(200, [], json_encode([
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
        ])));

        $this->expectException(QueryError::class);
        $this->client->runRawQuery('');
    }

    /**
     * @covers \GraphQL\Client::runRawQuery
     */
    public function testInvalidQueryResponseWith400()
    {
        $this->mockHandler->append(new ClientException('', new Request('post', ''),
                new Response(400, [], json_encode([
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
        ]))));

        $this->expectException(QueryError::class);
        $this->client->runRawQuery('');
    }

    /**
     * @covers \GraphQL\Client::runRawQuery
     */
    public function testUnauthorizedResponse()
    {
        $this->mockHandler->append(new ClientException('', new Request('post', ''),
                new Response(401, [], json_encode('Unauthorized'))
        ));

        $this->expectException(ClientException::class);
        $this->client->runRawQuery('');
    }

    /**
     * @covers \GraphQL\Client::runRawQuery
     */
    public function testNotFoundResponse()
    {
        $this->mockHandler->append(new ClientException('', new Request('post', ''), new Response(404, [])));

        $this->expectException(ClientException::class);
        $this->client->runRawQuery('');
    }

    /**
     * @covers \GraphQL\Client::runRawQuery
     */
    public function testInternalServerErrorResponse()
    {
        $this->mockHandler->append(new ServerException('', new Request('post', ''), new Response(500, [])));

        $this->expectException(ServerException::class);
        $this->client->runRawQuery('');
    }

    /**
     * @covers \GraphQL\Client::runRawQuery
     */
    public function testConnectTimeoutResponse()
    {
        $this->mockHandler->append(new ConnectException('Time Out', new Request('post', '')));
        $this->expectException(ConnectException::class);
        $this->client->runRawQuery('');
    }
}
