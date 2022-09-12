<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use Exception;

class ChargifyAddressInput
{
    private string $street_address;
    private string $city;
    private string $state;
    private string $country;
    private string $zipcode;

    /**
     * @param array $options The list of values that must be passed. This includes `street_address`, `city`,
     * `state` (which is ISO 3166-2 compliant), `country` (ISO 3166-1), and `zipcode`
     */
    public function __construct(array $options)
    {
        if (
            !(isset($options['street_address'])) ||
            !(isset($options['city'])) ||
            !(isset($options['state'])) ||
            !(isset($options['country'])) ||
            !(isset($options['zipcode']))
        ) {
            throw new Exception("Street address, city, state, country, and zip must all be set");
        }

        $this->street_address = $options['street_address'];
        $this->city = $options['city'];
        $this->state = $options['state'];
        $this->country = $options['country'];
        $this->zipcode = $options['zipcode'];
    }

    public function getStreetAddress(): string
    {
        return $this->street_address;
    }

    public function getCity(): string
    {
        return $this->city;
    }

    public function getState(): string
    {
        return $this->state;
    }

    public function getCountry(): string
    {
        return $this->country;
    }

    public function getZipcode(): string
    {
        return $this->zipcode;
    }

    public function toArray(): array
    {
        return [
        "streetAddress" => $this->street_address,
        "city" => $this->city,
        "isoState" => $this->state,
        "isoCountry" => $this->country,
        "zipcode" => $this->zipcode
        ];
    }

    public static function fromChargifyInvoiceAddress(ChargifyInvoiceAddressType $address): self
    {
        return new self([
            'street_address' => $address->getStreet(),
            'city' => $address->getCity(),
            'state' => $address->getState(),
            'country' => $address->getCountry(),
            'zipcode' => $address->getZip()
        ]);
    }
}
