<?php

namespace GraphQL\Exception;

use RunTimeException;

/**
 * Class AwsRegionNotSetException
 *
 * @package GraphQL\Exception
 */
class AwsRegionNotSetException extends RunTimeException
{
    public function __construct()
    {
        parent::__construct("AWS region not set.");
    }
}
