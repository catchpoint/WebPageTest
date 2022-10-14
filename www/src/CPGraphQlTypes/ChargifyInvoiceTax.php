<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

class ChargifyInvoiceTax
{
    private string $title;
    private string $source_type;
    private int $source_id;
    private string $total_amount;
    private string $percentage;
    private string $tax_amount;

    public function __construct(array $options)
    {
        $this->title = $options['title'];
        $this->source_type = $options['sourceType'];
        $this->source_id = $options['sourceId'];
        $this->total_amount = $options['totalAmount'];
        $this->percentage = $options['percentage'];
        $this->tax_amount = $options['taxAmount'];
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getSourceType(): string
    {
        return $this->source_type;
    }

    public function getSourceId(): int
    {
        return $this->source_id;
    }

    public function getTotalAmount(): string
    {
        return $this->total_amount;
    }

    public function getPercentage(): string
    {
        return $this->percentage;
    }

    public function getTaxAmount(): string
    {
        return $this->tax_amount;
    }
}
