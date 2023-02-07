<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceResponseType;

/**
 *
 * @implements IteratorAggregate<ChargifyInvoiceResponseType>
 * @implements Countable<ChargifyInvoiceResponseType>
 *
 * */
class ChargifyInvoiceResponseTypeList implements IteratorAggregate, Countable
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

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }
}
