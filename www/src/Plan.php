<?php

declare(strict_types=1);

namespace WebPageTest;

class Plan
{
    private string $billing_frequency;
    private int $price_in_cents;
    private string $monthly_price;
    private string $annual_price;
    private string $other_annual;
    private int $runs;
    private string $id;
    private string $name;
    private float $annual_savings = 5.0 / 4.0; // Monthly costs 25% more than annual per year

    public function __construct(array $options = [])
    {
        $bf = $options['billingFrequency'] == 1 ? "Monthly" : "Annually";
        $monthly_price_in_cents = $bf == "Monthly" ? $options['priceInCents'] : $options['priceInCents'] / 12;
        $annual_price_in_cents =  $bf == "Monthly" ? $options['priceInCents'] * 12 : $options['priceInCents'];
        $monthly_extra_in_cents = $annual_price_in_cents * (1 / $this->annual_savings);
        $annual_savings_in_cents = $annual_price_in_cents * $this->annual_savings;
        $other_annual = $bf == "Monthly" ?  $monthly_extra_in_cents : $annual_savings_in_cents;

        $this->billing_frequency = $bf;
        $this->price_in_cents = $options['priceInCents'];
        $this->monthly_price = number_format(($monthly_price_in_cents / 100), 2, ".", ",");
        $this->annual_price = number_format(($annual_price_in_cents / 100), 2, ".", ",");
        $this->other_annual = number_format(($other_annual / 100), 2, ".", ",");
        $this->runs = $options['runs'];
        $this->id = $options['id'];
        $this->name = $options['name'];
    }

    public function getBillingFrequency(): string
    {
        return $this->billing_frequency;
    }

    public function getPrice(): float
    {
        return $this->price_in_cents;
    }

    public function getMonthlyPrice(): string
    {
        return $this->monthly_price;
    }

    public function getAnnualPrice(): string
    {
        return $this->annual_price;
    }

    public function getOtherAnnual(): string
    {
        return $this->other_annual;
    }

    public function getRuns(): int
    {
        return $this->runs;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function isUpgrade(Plan $currentPlan): bool
    {
        $currentRuns = $currentPlan->getRuns();
        $isCurrentAnnual = $currentPlan->getBillingFrequency() == "Annually";
        $newRuns = $this->getRuns();
        $isNewAnnual = $this->getBillingFrequency() == "Annually";
        // upgrade if:
        // monthly low to monthly higher
        if (!$isCurrentAnnual && !$isNewAnnual) {
            return $newRuns > $currentRuns;
        }
        // monthly to annual (same runs or above)
        if (!$isCurrentAnnual && $isNewAnnual) {
            // return  $newRuns >= $currentRuns ? 'monthly and annual $newRuns >= $currentRuns' :
            // 'monthly and annual $newRuns < $currentRuns';
            return $newRuns >= $currentRuns;
        }
        // annual to annual higher
        if ($isCurrentAnnual && $isNewAnnual) {
            // return  $newRuns > $currentRuns ? 'annual and annual $newRuns > $currentRuns' :
            // 'annual and  annual $newRuns < $currentRuns';
            return $newRuns > $currentRuns;
        }
        // annual to monthly (any)
        // return "annual to monthly";
        return false;
    }
}
