<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use DateTime;
use WebPageTest\CPGraphQlTypes\ChargifyInvoicePaymentMethodType;

class ChargifyInvoicePayment
{
    private int $transaction_id;
    private DateTime $transaction_time;
    private string $memo;
    private string $original_amount;
    private string $applied_amount;
    private bool $prepayment;
    private ?string $gateway_transaction_id;
    private ChargifyInvoicePaymentMethodType $payment_method;

    public function __construct(array $options)
    {
        $this->transaction_id = $options['transactionId'];
        $this->transaction_time = $options['transactionTime'];
        $this->memo = $options['memo'];
        $this->original_amount = $options['originalAmount'];
        $this->applied_amount = $options['appliedAmount'];
        $this->prepayment = $options['prepayment'];
        $this->gateway_transaction_id = $options['gatewayTransactionId'];
        $this->payment_method = new ChargifyInvoicePaymentMethodType($options['paymentMethod']);
    }

    public function getTransactionId(): int
    {
        return $this->transaction_id;
    }

    public function getTransactionTime(): DateTime
    {
        return $this->transaction_time;
    }

    public function getMemo(): string
    {
        return $this->memo;
    }

    public function getOriginalAmount(): string
    {
        return $this->original_amount;
    }

    public function getAppliedAmount(): string
    {
        return $this->applied_amount;
    }

    public function getPrepayment(): bool
    {
        return $this->prepayment;
    }

    public function getGatewayTransactionId(): ?string
    {
        return $this->gateway_transaction_id;
    }

    public function getPaymentMethod(): ChargifyInvoicePaymentMethodType
    {
        return $this->payment_method;
    }
}
