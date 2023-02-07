<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceCredit;

/**
 *
 * @implements IteratorAggregate<ChargifyInvoiceCredit>
 * @implements Countable<ChargifyInvoiceCredit>
 *
 **/
class ChargifyInvoiceCreditList implements IteratorAggregate, Countable
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

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }
}
