<?php

declare(strict_types=1);

namespace WebPageTest\Exception;

class ClientException extends \Exception
{
    private string $route;

    public function __construct(string $message, string $route = '/', int $code = 400, \Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
        $this->route = $route;
    }

    public function getRoute(): string
    {
        return $this->route;
    }
}
