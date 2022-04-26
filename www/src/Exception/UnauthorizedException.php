<?php

declare(strict_types=1);

namespace WebPageTest\Exception;

class UnauthorizedException extends \Exception
{
    private string $route;

    public function __construct(
        string $message = "Unauthorized",
        string $route = '/',
        int $code = 401,
        \Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->route = $route;
    }

    public function getRoute(): string
    {
        return $this->route;
    }
}
