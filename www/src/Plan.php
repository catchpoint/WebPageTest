<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\Discount;

class Plan
{
    private string $billing_frequency;
    private float $price;
    private string $monthly_price;
    private string $annual_price;
    private string $other_annual;
    private int $runs;
    private string $id;
    private string $name;
    private ?Discount $discount;
    private float $annual_savings = 5.0 / 4.0; // Monthly costs 25% more than annual per year

    public function __construct(array $options = [])
    {
        $bf = $options['billingFrequency'] == 1 ? "Monthly" : "Annually";
        $monthly_price = $bf == "Monthly" ? $options['price'] : $options['price'] / 12;
        $annual_price =  $bf == "Monthly" ? $options['price'] * 12 : $options['price'];
        $monthly_extra = $annual_price * (1 / $this->annual_savings);
        $annual_savings = $annual_price * $this->annual_savings;
        $other_annual = $bf == "Monthly" ?  $monthly_extra : $annual_savings;

        $this->billing_frequency = $bf;
        $this->price = $options['price'];
        $this->monthly_price = number_format(($monthly_price), 2, ".", ",");
        $this->annual_price = number_format(($annual_price), 2, ".", ",");
        $this->other_annual = number_format(($other_annual), 2, ".", ",");
        $this->runs = (int) filter_var($options['name'], FILTER_SANITIZE_NUMBER_INT);
        $this->id = $options['id'];
        $this->name = $options['name'];
        $this->discount = isset($options['discount']) ? new Discount($options['discount']) : null;
    }

    public function getBillingFrequency(): string
    {
        return $this->billing_frequency;
    }

    public function getPrice(): float
    {
        return $this->price;
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

    public function getDiscount(): Discount
    {
        return $this->discount;
    }
}
