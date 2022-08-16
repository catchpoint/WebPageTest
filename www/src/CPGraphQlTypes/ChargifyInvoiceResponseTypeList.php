<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyInvoiceResponseType;

class ChargifyInvoiceResponseTypeList
{
    private array $list;

    public function __construct(ChargifyInvoiceResponseType ...$invoice)
    {
        $this->list = $invoice;
    }

    public function add(ChargifyInvoiceResponseType $invoice)
    {
        $this->list[] = $invoice;
    }

    public function toArray(): array
    {
        return $this->list;
    }
}
