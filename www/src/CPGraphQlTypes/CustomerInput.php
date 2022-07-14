<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\BraintreeBillingAddressInput;
use Exception;

class CustomerInput
{
    private string $payment_method_nonce;
    private string $subscription_plan_id;
    private BraintreeBillingAddressInput $billing_address_model;

    public function __construct(array $options, BraintreeBillingAddressInput $billing_address_model)
    {
        if (
            !isset($options['payment_method_nonce']) ||
            !isset($options['subscription_plan_id'])
        ) {
            throw new Exception('Payment Nonce and Subscription Plan must be passed');
        }

        $this->payment_method_nonce = $options['payment_method_nonce'];
        $this->subscription_plan_id = $options['subscription_plan_id'];
        $this->billing_address_model = $billing_address_model;
    }

    public function toArray(): array
    {
        return [
        "paymentMethodNonce" => $this->payment_method_nonce,
        "billingAddressModel" => $this->billing_address_model->toArray(),
        "subscriptionPlanId" => $this->subscription_plan_id
        ];
    }
}
