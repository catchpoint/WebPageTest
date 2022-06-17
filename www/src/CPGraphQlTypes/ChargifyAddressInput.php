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

    public function __construct(array $options)
    {
        if(
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
}
