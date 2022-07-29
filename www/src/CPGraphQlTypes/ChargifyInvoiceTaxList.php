<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyInvoiceTax;

class ChargifyInvoiceTaxList
{
    private array $list;

    public function __construct(ChargifyInvoiceTax ...$tax)
    {
        $this->list = $tax;
    }

    public function add(ChargifyInvoiceTax $tax)
    {
        $this->list[] = $tax;
    }

    public function toArray(): array
    {
        return $this->list;
    }
}
