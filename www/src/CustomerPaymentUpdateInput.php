<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\BillingAddress;

class CustomerPaymentUpdateInput
{
    private string $payment_method_nonce;
    private BillingAddress $billing_address_model;

    public function __construct(array $options = [])
    {
        $this->payment_method_nonce = $options['payment_method_nonce'];
        $this->billing_address_model = $options['billing_address_model'];
    }

    public function getPaymentMethodNonce(): string
    {
        return $this->payment_method_nonce;
    }

    public function getBillingAddressModel(): BillingAddress
    {
        return $this->billing_address_model;
    }

  /*
   * returns Array in format expected by CP servers
   */
    public function toArray(): array
    {
        return [
        "paymentMethodNonce" => $this->getPaymentMethodNonce(),
        "billingAddressModel" =>  $this->getBillingAddressModel()->toArray()
        ];
    }
}
