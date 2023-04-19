<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

class ChargifyInvoicePaymentMethodType
{
    private string $details;
    private string $kind;
    private string $memo;
    private string $type;
    private string $card_brand;
    private string $card_expiration;
    private string $masked_card_number;
    private ?string $last_four;

    public function __construct(array $options)
    {
        $this->details = $options['details'] ?? "";
        $this->kind = $options['kind'] ?? "";
        $this->memo = $options['memo'] ?? "";
        $this->type = $options['type'] ?? "";
        $this->card_brand = $options['cardBrand'] ?? "";
        $this->card_expiration = $options['cardExpiration'] ?? "";
        $this->masked_card_number = $options['maskedCardNumber'] ?? "";
        $this->last_four = $options['lastFour'] ?? null;
    }

    public function getDetails(): string
    {
        return $this->details;
    }

    public function getKind(): string
    {
        return $this->kind;
    }

    public function getMemo(): string
    {
        return $this->memo;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getCardBrand(): string
    {
        return $this->card_brand;
    }

    public function getCardExpiration(): string
    {
        return $this->card_expiration;
    }

    public function getMaskedCardNumber(): string
    {
        return $this->masked_card_number;
    }

    public function getLastFour(): ?string
    {
        return $this->last_four;
    }
}
