<?php

declare(strict_types=1);

namespace WebPageTest;

class SignupToken
{
    public string $access_token;

    public function __construct(array $options = [])
    {
        $this->access_token = $options['access_token'];
        $this->scope = $options['scope'];
        $this->expires = $options['expires_in'];
    }
}
