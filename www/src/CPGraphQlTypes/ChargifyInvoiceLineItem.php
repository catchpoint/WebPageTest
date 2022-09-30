<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use DateTime;

class ChargifyInvoiceLineItem
{
    private string $title;
    private string $description;
    private string $quantity;
    private string $subtotal_amount;
    private string $unit_price;
    private DateTime $period_range_start;
    private DateTime $period_range_end;

    public function __construct(array $options)
    {
        $this->title = $options['title'];
        $this->description = $options['description'];
        $this->quantity = $options['quantity'];
        $this->subtotal_amount = $options['subtotalAmount'];
        $this->unit_price = $options['unitPrice'];
        $this->period_range_start = new DateTime($options['periodRangeStart']);
        $this->period_range_end = new DateTime($options['periodRangeEnd']);
    }

    public function getTitle(): string
    {
        return $this->title;
    }
    public function getDescription(): string
    {
        return $this->description;
    }
    public function getQuantity(): string
    {
        return $this->quantity;
    }
    public function getSubtotalAmount(): string
    {
        return $this->subtotal_amount;
    }
    public function getUnitPrice(): string
    {
        return $this->unit_price;
    }
    public function getPeriodRangeStart(): DateTime
    {
        return $this->period_range_start;
    }
    public function getPeriodRangeEnd(): DateTime
    {
        return $this->period_range_end;
    }
}
