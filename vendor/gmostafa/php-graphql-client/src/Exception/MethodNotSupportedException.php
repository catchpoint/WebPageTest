<?php

namespace GraphQL\Exception;

use RunTimeException;

/**
 * Class MethodNotSupportedException
 *
 * @package GraphQL\Exception
 */
class MethodNotSupportedException extends RunTimeException
{
    public function __construct($requestMethod)
    {
        parent::__construct("Method \"$requestMethod\" is currently unsupported by client.");
    }
}
