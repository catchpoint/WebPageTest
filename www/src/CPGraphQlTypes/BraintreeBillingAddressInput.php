<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use Exception;

class BraintreeBillingAddressInput
{
    private string $city;
    private string $country;
    private string $state;
    private string $street_address;
    private string $zipcode;

    public function __construct(array $options = [])
    {
        if (
            !isset($options['city']) ||
            !isset($options['country']) ||
            !isset($options['state']) ||
            !isset($options['street_address']) ||
            !isset($options['zipcode'])
        ) {
            throw new Exception("City, country, State, Street Address, and Zip Code are all required");
        }
        $this->city = $options['city'];
        $this->country = $options['country'];
        $this->state = $options['state'];
        $this->street_address = $options['street_address'];
        $this->zipcode = $options['zipcode'];
    }

    public function getCity(): string
    {
        return $this->city;
    }

    public function getCountry(): string
    {
        return $this->country;
    }

    public function getState(): string
    {
        return $this->state;
    }

    public function getStreetAddress(): string
    {
        return $this->street_address;
    }

    public function getZipCode(): string
    {
        return $this->zipcode;
    }

  /*
   * returns Array in format expected by CP servers
   */
    public function toArray(): array
    {
        return [
        "city" => $this->city,
        "country" => $this->country,
        "state" => $this->state,
        "streetAddress" => $this->street_address,
        "zipcode" => $this->zipcode
        ];
    }
}
