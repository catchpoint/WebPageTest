<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use JsonSerializable;
use Exception;

class ChargifySubscriptionPreviewResponse implements JsonSerializable
{
    private int $total_in_cents;
    private int $sub_total_in_cents;
    private int $tax_in_cents;

    /**
     * @param array $options This is a list consisting of three integers: `total_in_cents`, `sub_total_in_cents`,
     * and `tax_in_cents`. All are required.
     */
    public function __construct(array $options)
    {
        if (
            !
            (isset($options['total_in_cents'])) &&
            (isset($options['sub_total_in_cents'])) &&
            (isset($options['tax_in_cents']))
        ) {
            throw new Exception("Total, subtotal, and tax must all be passed");
        }

        $this->total_in_cents = $options['total_in_cents'];
        $this->sub_total_in_cents = $options['sub_total_in_cents'];
        $this->tax_in_cents = $options['tax_in_cents'];
    }

    public function getTotalInCents(): int
    {
        return $this->total_in_cents;
    }

    public function getSubTotalInCents(): int
    {
        return $this->sub_total_in_cents;
    }

    public function getTaxInCents(): int
    {
        return $this->tax_in_cents;
    }

    public function jsonSerialize(): array
    {
        return [
            "totalInCents" => $this->total_in_cents,
            "subTotalInCents" => $this->sub_total_in_cents,
            "taxInCents" => $this->tax_in_cents
        ];
    }
}
