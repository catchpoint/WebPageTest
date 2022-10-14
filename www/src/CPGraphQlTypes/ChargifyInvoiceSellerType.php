<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use WebPageTest\CPGraphQlTypes\ChargifyInvoiceAddressType;

class ChargifyInvoiceSellerType
{
    private string $name;
    private string $phone;
    private ChargifyInvoiceAddressType $address;

    public function __construct(string $name, string $phone, ChargifyInvoiceAddressType $address)
    {
        $this->name = $name;
        $this->phone = $phone;
        $this->address = $address;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getPhone(): string
    {
        return $this->phone;
    }

    public function getAddress(): ChargifyInvoiceAddressType
    {
        return $this->address;
    }
}
