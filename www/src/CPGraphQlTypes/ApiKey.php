<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use DateTime;

class ApiKey
{
    private int $id;
    private string $name;
    private string $api_key;
    private ?string $client_id;
    private ?DateTime $expiration_date;
    private ?DateTime $change_date;
    private ?DateTime $create_date;

    public function __construct(array $options)
    {
        $this->id = $options['id'];
        $this->name = $options['name'];
        $this->api_key = $options['apiKey'];
        $this->client_id = $options['clientId'] ?? null;
        $this->expiration_date = isset($options['expirationDate']) ? new DateTime($options['expirationDate']) : null;
        $this->change_date = isset($options['changeDate']) ? new DateTime($options['changeDate']) : null;
        $this->create_date = isset($options['createDate']) ? new DateTime($options['createDate']) : null;
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getApiKey(): string
    {
        return $this->api_key;
    }

    public function getClientId(): ?string
    {
        return $this->client_id;
    }

    public function getExpirationDate(): ?DateTime
    {
        return $this->expiration_date;
    }

    public function getChangeDate(): ?DateTime
    {
        return $this->change_date;
    }

    public function getCreateDate(): ?DateTime
    {
        return $this->create_date;
    }
}
