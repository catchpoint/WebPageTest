<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyAddressInput;
use Exception;

class ChargifySubscription
{
    private string $plan_handle;
    private string $payment_token;
    private ChargifyAddressInput $shipping_address;
    private ChargifyAddressInput $billing_address;

    public function __construct(array $options, ChargifyAddressInput $address)
    {
        if (
            !isset($options['plan_handle']) ||
            !isset($options['payment_token'])
        ) {
            throw new Exception('Plan Handle and Payment Token must be set');
        }

        $this->plan_handle = $options['plan_handle'];
        $this->payment_token = $options['payment_token'];
        $this->shipping_address = $address;
        $this->billing_address = $address;
    }

    public function toArray(): array
    {
        return [
        "planHandle" => $this->plan_handle,
        "paymentToken" => $this->payment_token,
        "shippingAddress" => $this->shipping_address->toArray(),
        "billingAddress" => $this->billing_address->toArray()
        ];
    }
}
