<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyInvoiceRefund;

class ChargifyInvoiceRefundList
{
    private array $list;

    public function __construct(ChargifyInvoiceRefund ...$refund)
    {
        $this->list = $refund;
    }

    public function add(ChargifyInvoiceRefund $refund)
    {
        $this->list[] = $refund;
    }

    public function toArray(): array
    {
        return $this->list;
    }
}
