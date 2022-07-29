<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyInvoiceLineItem;

class ChargifyInvoiceLineItemList
{
    private array $list;

    public function __construct(ChargifyInvoiceLineItem ...$line_item)
    {
        $this->list = $line_item;
    }

    public function add(ChargifyInvoiceLineItem $line_item)
    {
        $this->list[] = $line_item;
    }

    public function toArray(): array
    {
        return $this->list;
    }
}
