<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\User;
use WebPageTest\CPClient;

class RequestContext
{
    private array $raw;
    private ?User $user;
    private ?CPClient $client;

    public function __construct(array $global_request)
    {
        $this->raw = $global_request;
        $this->user = null;
        $this->client = null;
    }

    public function getRaw(): array
    {
        return $this->raw;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): void
    {
        if (isset($user)) {
            $this->user = $user;
        }
    }

    public function getClient(): ?CPClient
    {
        return $this->client;
    }

    public function setClient(?CPClient $client): void
    {
        if (isset($client)) {
            $this->client = $client;
        }
    }
}
