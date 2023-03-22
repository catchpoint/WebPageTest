<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyAddressInput;

class ChargifySubscriptionInputType
{
    private string $plan_handle;
    private string $payment_token;
    private ChargifyAddressInput $shipping_address;
    private ChargifyAddressInput $billing_address;

    public function __construct(string $plan_handle, string $payment_token, ChargifyAddressInput $address)
    {
        $this->plan_handle = $plan_handle;
        $this->payment_token = $payment_token;
        $this->shipping_address = $address;
        $this->billing_address = $address;
    }

    public function toArray(): array
    {
        return [
            'planHandle' => $this->plan_handle,
            'paymentToken' => $this->payment_token,
            'shippingAddress' => $this->shipping_address->toArray(),
            'billingAddress' => $this->billing_address->toArray()
        ];
    }
}
