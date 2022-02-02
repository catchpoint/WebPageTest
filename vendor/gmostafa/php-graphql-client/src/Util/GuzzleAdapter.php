<?php

namespace GraphQL\Util;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Http\Client;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;

class GuzzleAdapter implements Client\ClientInterface
{
    /**
     * @var ClientInterface
     */
    private $client;

    /**
     * GuzzleAdapter constructor.
     *
     * @param ClientInterface $client
     */
    public function __construct(ClientInterface $client)
    {
        $this->client = $client;
    }

    /**
     * @param RequestInterface $request
     *
     * @return ResponseInterface
     * @throws GuzzleException
     */
    public function sendRequest(RequestInterface $request): ResponseInterface
    {
        /**
         * We are not catching and converting the guzzle exceptions to psr-18 exceptions
         * for backward-compatibility sake
         */

        return $this->client->send($request);
    }
}
