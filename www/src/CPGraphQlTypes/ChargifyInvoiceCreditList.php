<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyInvoiceCredit;

class ChargifyInvoiceCreditList
{
    private array $list;

    public function __construct(ChargifyInvoiceCredit ...$credit)
    {
        $this->list = $credit;
    }

    public function add(ChargifyInvoiceCredit $credit)
    {
        $this->list[] = $credit;
    }

    public function toArray(): array
    {
        return $this->list;
    }
}
