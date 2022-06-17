<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\CustomerInput;
use WebPageTest\CPGraphQlTypes\ChargifySubscription;

use Exception;

class CPSignupInput
{
    private string $first_name;
    private string $last_name;
    private ?string $company;
    private string $email;
    private string $password;
    private CustomerInput $customer;
    private ChargifySubscription $subscription;

    /**
     * @param array $options An array consisting of user data: `first_name`, `last_name`, `email`, `password`, and `company`. All but `company` are required
     *
     */
    public function __construct(array $options, CustomerInput $customer_input, ChargifySubscription $chargify_subscription)
    {
        if(
          !isset($options['first_name']) ||
          !isset($options['last_name']) ||
          !isset($options['email']) ||
          !isset($options['password'])
        ) {
          throw new Exception("First name, last name, email, and password must be set");
        }

        $this->first_name = $options['first_name'];
        $this->last_name = $options['last_name'];
        $this->company = $options['company'] ?? null;
        $this->email = $options['email'];
        $this->password = $options['password'];
        $this->customer = $customer_input;
        $this->subscription = $chargify_subscription;
    }

    public function toArray(): array
    {
      $val = [
        "firstName" => $this->first_name,
        "lastName" => $this->last_name,
        "email" => $this->email,
        "password" => $this->password,
        "customer" => $this->customer->toArray(),
        "subscription" => $this->subscription->toArray()
      ];

      if (isset($this->company)) {
        $val['company'] = $this->company;
      }

      return $val;
    }
}
