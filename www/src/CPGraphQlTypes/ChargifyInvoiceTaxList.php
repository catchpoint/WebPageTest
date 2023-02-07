<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceTax;

/**
 *
 * @implements IteratorAggregate<ChargifyInvoiceTax>
 * @implements Countable<ChargifyInvoiceTax
 *
 **/
class ChargifyInvoiceTaxList implements IteratorAggregate, Countable
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

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }
}
