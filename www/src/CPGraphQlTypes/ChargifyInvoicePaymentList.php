<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyInvoicePayment;

class ChargifyInvoicePaymentList
{
    private array $list;

    public function __construct(ChargifyInvoicePayment ...$payment)
    {
        $this->list = $payment;
    }

    public function add(ChargifyInvoicePayment $payment)
    {
        $this->list[] = $payment;
    }

    public function toArray(): array
    {
        return $this->list;
    }
}
