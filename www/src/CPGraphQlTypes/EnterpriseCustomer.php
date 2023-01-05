<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use DateTime;

class EnterpriseCustomer
{
    private string $wpt_plan_id;
    private string $status;
    private int $monthly_runs;
    private ?DateTime $billing_period_end_date;
    private ?int $remaining_runs;
    private ?DateTime $plan_renewal_date;

    public function __construct(array $options)
    {
        if (
            !(isset($options['wptPlanId']) &&
                isset($options['status']) &&
                isset($options['monthlyRuns'])
            )
        ) {
            throw new \Exception('Fields required are not set when getting customer information');
        }

        $this->wpt_plan_id = $options['wptPlanId'];
        $this->billing_period_end_date = $options['billingPeriodEndDate']
            ? new DateTime($options['billingPeriodEndDate'])
            : null;
        $this->status = $options['status'];
        $this->monthly_runs = $options['monthlyRuns'];
        $this->remaining_runs = $options['remainingRuns'] ?? null;
        $this->plan_renewal_date = isset($options['planRenewalDate']) ?
            new DateTime($options['planRenewalDate']) : null;
    }

    public function getCustomerId(): ?string
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

    public function getSubscriptionId(): ?string
    {
        return $this->subscription_id;
    }

    public function getWptPlanId(): ?string
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
    public function getSubscriptionPrice(): ?float
    {
        return $this->subscription_price;
    }
    public function getStatus(): string
    {
        return $this->status;
    }
    public function getWptPlanName(): string
    {
        return $this->wpt_plan_name ?? $this->wpt_plan_id;
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

    public function isCanceled(): bool
    {
        return str_contains($this->status, 'CANCEL');
    }

    public function getNextPlanStartDate(): ?DateTime
    {
        return isset($this->plan_renewal_date) ? $this->plan_renewal_date : $this->billing_period_end_date;
    }
}
