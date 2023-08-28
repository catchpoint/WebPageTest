<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

class ContactUpdateInput
{
    private string $id;
    private string $first_name;
    private string $last_name;
    private string $email;
    private ?string $company_name;
    private ?string $vat_number;

    public function __construct(array $options)
    {
        if (
            !
            ((isset($options['id'])) &&
            (isset($options['first_name'])) &&
            (isset($options['email'])) &&
            (isset($options['last_name']))
            )
        ) {
            throw new \Exception("Required fields are missing");
        }

        $this->id = $options['id'];
        $this->first_name = $options['first_name'];
        $this->last_name = $options['last_name'];
        $this->email = $options['email'];
        $this->company_name = $options['company_name'] ?? null;
        $this->vat_number = $options['vat_number'] ?? null;
    }

    public function toArray(): array
    {
        $arr = [
            "id" => $this->id,
            "email" => $this->email,
            "firstName" => $this->first_name,
            "lastName" => $this->last_name
        ];

        if ($this->company_name) {
            $arr['organization'] = $this->company_name;
        }

        if ($this->vat_number) {
            $arr['vatNumber'] = $this->vat_number;
        }

        return $arr;
    }
}
