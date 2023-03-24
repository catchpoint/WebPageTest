<?php

declare(strict_types=1);

namespace WebPageTest\Exception;

use WebPageTest\Exception\ClientException;

class PortalException extends ClientException
{
    private int $error_number;

    public function __construct(string $message, ?int $error_number = 1000)
    {
        $this->error_number = $error_number;
        parent::__construct($message);
    }

    public function getErrorNumber(): int
    {
        return $this->error_number;
    }
}
