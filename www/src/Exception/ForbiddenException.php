<?php

declare(strict_types=1);

namespace WebPageTest\Exception;

use WebPageTest\Exception\ClientException;

class ForbiddenException extends ClientException
{
    public function __construct(
        string $route = '/'
    ) {
        $message = "Forbidden";
        $code = 403;
        $previous = null;
        parent::__construct($message, $route, $code, $previous);
    }
}
