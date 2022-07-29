<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

class ChargifyInvoiceAddressType
{
    private ?string $street;
    private ?string $line2;
    private ?string $city;
    private ?string $state;
    private ?string $zip;
    private ?string $country;

    public function __construct(array $options)
    {
        $this->street = $options['street'] ?? null;
        $this->line2 = $options['line2'] ?? null;
        $this->city = $options['city'] ?? null;
        $this->state = $options['state'] ?? null;
        $this->zip = $options['zip'] ?? null;
        $this->country = $options['country'] ?? null;
    }

    public function getStreet(): ?string
    {
        return $this->street;
    }

    public function getLine2(): ?string
    {
        return $this->line2;
    }

    public function getCity(): ?string
    {
        return $this->city;
    }

    public function getState(): ?string
    {
        return $this->state;
    }

    public function getZip(): ?string
    {
        return $this->zip;
    }

    public function getCountry(): ?string
    {
        return $this->country;
    }
}
