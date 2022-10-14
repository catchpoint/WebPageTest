<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

class ChargifyInvoiceCustomerType
{
    private int $chargify_id;
    private string $first_name;
    private string $last_name;
    private string $email;
    private ?string $organization;

    /**
     * @param array $options Has required values (int) `chargifyId`, (string)`firstName`, (string)`lastName`,
     * and (string)`email`.
     * Also optionally (string) `organization`
     */
    public function __construct(array $options)
    {
        if (
            !(
            isset($options['chargifyId']) &&
            isset($options['firstName']) &&
            isset($options['lastName']) &&
            isset($options['email'])
            )
        ) {
            throw new \Exception('chargifyId, firstName, lastName, and email are all required');
        }

        $this->chargify_id = $options['chargifyId'];
        $this->first_name = $options['firstName'];
        $this->last_name = $options['lastName'];
        $this->email = $options['email'];
        $this->organization = $options['organization'] ?? null;
    }

    public function getChargifyId(): int
    {
        return $this->chargify_id;
    }

    public function getFirstName(): string
    {
        return $this->first_name;
    }

    public function getLastName(): string
    {
        return $this->last_name;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getOrganization(): ?string
    {
        return $this->organization;
    }
}
