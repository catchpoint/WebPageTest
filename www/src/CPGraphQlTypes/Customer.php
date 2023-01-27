<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use DateTime;

class Customer
{
    private string $customer_id;
    private string $subscription_id;
    private string $wpt_plan_id;
    private ?DateTime $billing_period_end_date;
    private float $subscription_price;
    private string $formatted_subscription_price;
    private string $status;
    private string $wpt_plan_name;
    private ?string $next_wpt_plan_id;
    private int $monthly_runs;
    private ?string $masked_credit_card;
    private ?string $cc_last_four;
    private ?string $credit_card_type;
    private ?DateTime $next_billing_date;
    private ?int $days_past_due;
    private ?int $number_of_billing_cycles;
    private ?string $cc_image_url;
    private ?string $cc_expiration_date;
    private ?int $remaining_runs;
    private ?int $billing_frequency;
    private ?DateTime $plan_renewal_date;
    private ?ChargifyInvoiceAddressType $address;

    public function __construct(array $options)
    {
        if (
            !(isset($options['customerId']) &&
                isset($options['subscriptionId']) &&
                isset($options['wptPlanId']) &&
                isset($options['subscriptionPrice']) &&
                isset($options['status']) &&
                isset($options['wptPlanName']) &&
                isset($options['monthlyRuns'])
            )
        ) {
            throw new \Exception('Fields required are not set when getting customer information');
        }

        $this->customer_id = $options['customerId'];
        $this->subscription_id = $options['subscriptionId'];
        $this->wpt_plan_id = $options['wptPlanId'];
        $this->billing_period_end_date = isset($options['billingPeriodEndDate']) ?
          new DateTime($options['billingPeriodEndDate']) : null;
        $this->subscription_price = $options['subscriptionPrice'];
        $this->formatted_subscription_price = number_format(($options['subscriptionPrice'] / 100), 2, '.', ',');
        $this->status = $options['status'];
        $this->wpt_plan_name = $options['wptPlanName'];
        $this->monthly_runs = $options['monthlyRuns'];
        $this->next_billing_date = isset($options['nextBillingDate']) ?
            new DateTime($options['nextBillingDate']) : null;
        $this->days_past_due = $options['daysPastDue'] ?? null;
        $this->number_of_billing_cycles = $options['numberOfBillingCycles'] ?? null;
        $this->masked_credit_card = $options['maskedCreditCard'] ?? null;
        $this->cc_last_four = $options['ccLastFour'] ?? null;
        $this->credit_card_type = $options['creditCardType'] ?? null;
        $this->cc_image_url = $options['ccImageUrl'] ?? null;
        $this->cc_expiration_date = $options['ccExpirationDate'] ?? null;
        $this->remaining_runs = $options['remainingRuns'] ?? null;
        $this->billing_frequency = $options['billingFrequency'] ?? null;
        $this->plan_renewal_date = isset($options['planRenewalDate']) ?
            new DateTime($options['nextBillingDate']) : null;
        $this->next_wpt_plan_id = $options['nextWptPlanId'] ?? null;
        $this->address = null;
        if (
            isset($options['creditCardBillingCountry']) &&
            isset($options['creditCardBillingZip']) &&
            isset($options['creditCardBillingState']) &&
            isset($options['creditCardBillingCity']) &&
            isset($options['creditCardBillingAddress'])
        ) {
            $address_data = [
              'street' => $options['creditCardBillingAddress'],
              'city' => $options['creditCardBillingCity'],
              'state' => $options['creditCardBillingState'],
              'zip' => $options['creditCardBillingZip'],
              'country' => $options['creditCardBillingCountry']
            ];
            $address_data['line2'] = $options['creditCardBillingAddress2'] ?? null;
            $this->address = new ChargifyInvoiceAddressType($address_data);
        }
    }

    public function getCustomerId(): string
    {
        return $this->customer_id;
    }

    public function getMaskedCreditCard(): ?string
    {
        return $this->masked_credit_card;
    }

    public function getCCLastFour(): ?string
    {
        return $this->cc_last_four;
    }

    public function getCardType(): ?string
    {
        return $this->credit_card_type;
    }

    public function getSubscriptionId(): string
    {
        return $this->subscription_id;
    }

    public function getWptPlanId(): string
    {
        return $this->wpt_plan_id;
    }

    public function getNextWptPlanId(): ?string
    {
        return $this->next_wpt_plan_id;
    }

    public function getBillingPeriodEndDate(): ?DateTime
    {
        return $this->billing_period_end_date;
    }
    public function getSubscriptionPrice(): float
    {
        return $this->subscription_price;
    }
    public function getFormattedSubscriptionPrice(): string
    {
        return $this->formatted_subscription_price;
    }
    public function getStatus(): string
    {
        return $this->isCanceled() ? 'CANCELED' : $this->status;
    }
    public function getWptPlanName(): string
    {
        return $this->wpt_plan_name;
    }
    public function getMonthlyRuns(): int
    {
        return $this->monthly_runs;
    }
    public function getNextBillingDate(): ?DateTime
    {
        return $this->next_billing_date;
    }
    public function getDaysPastDue(): ?int
    {
        return $this->days_past_due;
    }
    public function getNumberOfBillingCycles(): ?int
    {
        return $this->number_of_billing_cycles;
    }
    public function getCCImageUrl(): ?string
    {
        return $this->cc_image_url;
    }
    public function getCCExpirationDate(): ?string
    {
        return $this->cc_expiration_date;
    }
    public function getRemainingRuns(): int
    {
        if (is_null($this->remaining_runs)) {
            return $this->monthly_runs;
        }
        return $this->remaining_runs;
    }
    public function getBillingFrequency(): ?int
    {
        return $this->billing_frequency;
    }
    public function getPlanRenewalDate(): ?DateTime
    {
        return $this->plan_renewal_date;
    }

    public function isPendingCancelation(): bool
    {
        return str_contains($this->status, 'PENDING');
    }

    public function isCanceled(): bool
    {
        return str_contains($this->status, 'CANCEL');
    }

    public function getNextPlanStartDate(): ?DateTime
    {
        return $this->plan_renewal_date ?? $this->billing_period_end_date;
    }

    public function getAddress(): ?ChargifyInvoiceAddressType
    {
        return $this->address;
    }
}
