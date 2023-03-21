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
    private ?string $vat_number;

    public function __construct(
        string $plan_handle,
        string $payment_token,
        ChargifyAddressInput $address,
        ?string $vat_number = null
    ) {
        $this->plan_handle = $plan_handle;
        $this->payment_token = $payment_token;
        $this->shipping_address = $address;
        $this->billing_address = $address;
        $this->vat_number = $vat_number;
    }

    public function toArray(): array
    {
        $arr = [
            'planHandle' => $this->plan_handle,
            'paymentToken' => $this->payment_token,
            'shippingAddress' => $this->shipping_address->toArray(),
            'billingAddress' => $this->billing_address->toArray()
        ];

        if ($this->vat_number) {
            $arr['vatNumber'] = $this->vat_number;
        }

        return $arr;
    }
}
