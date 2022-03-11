<?php

namespace GraphQL\Exception;

use InvalidArgumentException;

/**
 * Class InvalidSelectionException
 *
 * @package GraphQL\Exception
 */
class InvalidSelectionException extends InvalidArgumentException
{
    public function __construct($message = "")
    {
        parent::__construct($message);
    }
}