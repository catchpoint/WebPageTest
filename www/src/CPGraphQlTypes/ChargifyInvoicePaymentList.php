<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use WebPageTest\CPGraphQlTypes\ChargifyInvoicePayment;

/**
 *
 * @implements IteratorAggregate<ChargifyInvoicePayment>
 * @implements Countable<ChargifyInvoicePayment>
 *
 **/
class ChargifyInvoicePaymentList implements IteratorAggregate, Countable
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

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }
}
