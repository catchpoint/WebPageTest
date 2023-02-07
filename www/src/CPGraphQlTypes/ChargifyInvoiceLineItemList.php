<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceLineItem;

/**
 *
 * @implements IteratorAggregate<ChargifyInvoiceLineItem>
 * @implements Countable<ChargifyInvoiceLineItem>
 *
 * */
class ChargifyInvoiceLineItemList implements IteratorAggregate, Countable
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

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }
}
