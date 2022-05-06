<?php

declare(strict_types=1);

namespace WebPageTest;

class Discount
{
    private float $amount;
    private string $display_amount;
    private int $number_of_billing_cycles;

    public function __construct(array $options = [])
    {
        $this->amount = $options['amount'];
        $this->display_amount = number_format(($options['amount']), 2, ".", ",");
        $this->number_of_billing_cycles = $options['numberOfBillingCycles'];
    }

    public function getAmount(): float
    {
        return $this->amount;
    }

    public function getDisplayAmount(): string
    {
        return $this->display_amount;
    }

    public function getNumberOfBillingCycles(): int
    {
        return $this->number_of_billing_cycles;
    }
}
