<?php

namespace GraphQL;

use GraphQL\Exception\QueryError;
use Psr\Http\Message\ResponseInterface;

/**
 * Class Result
 *
 * @package GraphQl
 */
class Results
{
    /**
     * @var string
     */
    protected $responseBody;

    /**
     * @var ResponseInterface
     */
    protected $responseObject;

    /**
     * @var array|object
     */
    protected $results;

    /**
     * Result constructor.
     *
     * Receives json response from GraphQL api response and parses it as associative array or nested object accordingly
     *
     * @param ResponseInterface $response
     * @param bool              $asArray
     *
     * @throws QueryError
     */
    public function __construct(ResponseInterface $response, $asArray = false)
    {
        $this->responseObject = $response;
        $this->responseBody   = $this->responseObject->getBody()->getContents();
        $this->results        = json_decode($this->responseBody, $asArray);

        // Check if any errors exist, and throw exception if they do
        if ($asArray) $containsErrors = array_key_exists('errors', $this->results);
        else $containsErrors = isset($this->results->errors);

        if ($containsErrors) {

            // Reformat results to an array and use it to initialize exception object
            $this->reformatResults(true);
            throw new QueryError($this->results);
        }
    }

    /**
     * @param bool $asArray
     */
    public function reformatResults(bool $asArray): void
    {
        $this->results = json_decode($this->responseBody, (bool) $asArray);
    }

    /**
     * Returns only parsed data objects in the requested format
     *
     * @return array|object
     */
    public function getData()
    {
        if (is_array($this->results)) {
            return $this->results['data'];
        }

        return $this->results->data;
    }

    /**
     * Returns entire parsed results in the requested format
     *
     * @return array|object
     */
    public function getResults()
    {
        return $this->results;
    }

    /**
     * @return string
     */
    public function getResponseBody()
    {
        return $this->responseBody;
    }

    /**
     * @return ResponseInterface
     */
    public function getResponseObject()
    {
        return $this->responseObject;
    }
}