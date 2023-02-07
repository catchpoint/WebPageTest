<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceRefund;

/**
 * @implements IteratorAggregate<ChargifyInvoiceRefund>
 * @implements Countable<ChargifyInvoiceRefund>
 */
class ChargifyInvoiceRefundList implements IteratorAggregate, Countable
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

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }
}
