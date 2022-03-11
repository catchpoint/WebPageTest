<?php

namespace GraphQL;

use GraphQL\Auth\AuthInterface;
use GraphQL\Auth\HeaderAuth;
use GraphQL\Exception\QueryError;
use GraphQL\Exception\MethodNotSupportedException;
use GraphQL\QueryBuilder\QueryBuilderInterface;
use GraphQL\Util\GuzzleAdapter;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Utils;
use Psr\Http\Client\ClientInterface;
use TypeError;

/**
 * Class Client
 *
 * @package GraphQL
 */
class Client
{
    /**
     * @var string
     */
    protected $endpointUrl;

    /**
     * @var ClientInterface
     */
    protected $httpClient;

    /**
     * @var array
     */
    protected $httpHeaders;

    /**
     * @var array
     */
    protected $options;

    /**
     * @var string
     */
    protected $requestMethod;

    /**
     * @var AuthInterface
     */
    protected $auth;

    /**
     * Client constructor.
     *
     * @param string $endpointUrl
     * @param array $authorizationHeaders
     * @param array $httpOptions
     * @param ClientInterface|null $httpClient
     * @param string $requestMethod
     * @param AuthInterface|null $auth
     */
    public function __construct(
        string $endpointUrl,
        array $authorizationHeaders = [],
        array $httpOptions = [],
        ClientInterface $httpClient = null,
        string $requestMethod = 'POST',
        AuthInterface $auth = null
    ) {
        $headers = array_merge(
            $authorizationHeaders,
            $httpOptions['headers'] ?? [],
            ['Content-Type' => 'application/json']
        );
        /**
         * All headers will be set on the request objects explicitly,
         * Guzzle doesn't have to care about them at this point, so to avoid any conflicts
         * we are removing the headers from the options
         */
        unset($httpOptions['headers']);
        $this->options = $httpOptions;
        if ($auth) {
            $this->auth = $auth;
        }

        $this->endpointUrl          = $endpointUrl;
        $this->httpClient           = $httpClient ?? new GuzzleAdapter(new \GuzzleHttp\Client($httpOptions));
        $this->httpHeaders          = $headers;
        if ($requestMethod !== 'POST') {
            throw new MethodNotSupportedException($requestMethod);
        }
        $this->requestMethod        = $requestMethod;
    }

    /**
     * @param Query|QueryBuilderInterface $query
     * @param bool                        $resultsAsArray
     * @param array                       $variables
     *
     * @return Results
     * @throws QueryError
     */
    public function runQuery($query, bool $resultsAsArray = false, array $variables = []): Results
    {
        if ($query instanceof QueryBuilderInterface) {
            $query = $query->getQuery();
        }

        if (!$query instanceof Query) {
            throw new TypeError('Client::runQuery accepts the first argument of type Query or QueryBuilderInterface');
        }

        return $this->runRawQuery((string) $query, $resultsAsArray, $variables);
    }

    /**
     * @param string $queryString
     * @param bool   $resultsAsArray
     * @param array  $variables
     * @param
     *
     * @return Results
     * @throws QueryError
     */
    public function runRawQuery(string $queryString, $resultsAsArray = false, array $variables = []): Results
    {
        $request = new Request($this->requestMethod, $this->endpointUrl);

        foreach($this->httpHeaders as $header => $value) {
            $request = $request->withHeader($header, $value);
        }

        // Convert empty variables array to empty json object
        if (empty($variables)) $variables = (object) null;
        // Set query in the request body
        $bodyArray = ['query' => (string) $queryString, 'variables' => $variables];
        $request = $request->withBody(Utils::streamFor(json_encode($bodyArray)));

        if ($this->auth) {
            $request = $this->auth->run($request, $this->options);
        }

        // Send api request and get response
        try {
            $response = $this->httpClient->sendRequest($request);
        }
        catch (ClientException $exception) {
            $response = $exception->getResponse();

            // If exception thrown by client is "400 Bad Request ", then it can be treated as a successful API request
            // with a syntax error in the query, otherwise the exceptions will be propagated
            if ($response->getStatusCode() !== 400) {
                throw $exception;
            }
        }

        // Parse response to extract results
        return new Results($response, $resultsAsArray);
    }
}
