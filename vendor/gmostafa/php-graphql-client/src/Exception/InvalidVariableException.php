<?php

namespace GraphQL\Exception;

use InvalidArgumentException;

/**
 * Class InvalidVariableException
 *
 * @package GraphQL\Exception
 */
class InvalidVariableException extends InvalidArgumentException
{
    /**
     * InvalidVariableException constructor.
     *
     * @param string $message
     */
    public function __construct($message = "")
    {
        parent::__construct($message);
    }
}