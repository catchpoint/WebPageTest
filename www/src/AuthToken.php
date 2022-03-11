<?php

declare(strict_types=1);

namespace WebPageTest;

class AuthToken
{
    public string $access_token;
    public int $expires_in;
    public string $refresh_token;
    public string $scope;
    public string $token_type;

    public function __construct(array $options)
    {
        $this->access_token = $options['access_token'];
        $this->expires_in = $options['expires_in'];
        $this->refresh_token = $options['refresh_token'];
        $this->scope = $options['scope'];
        $this->token_type = $options['token_type'];
    }
}
