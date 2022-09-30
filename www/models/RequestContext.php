<?php

declare(strict_types=1);

namespace WebPageTest;

class RequestContext
{
    private array $raw;

    function __construct(array $global_request)
    {
        $this->raw = $global_request;
    }

    function getRaw(): array
    {
        return $this->raw;
    }
}
