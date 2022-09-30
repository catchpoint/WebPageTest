<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

class ChargifyInvoiceRefund
{
    private int $transaction_id;
    private int $payment_id;
    private string $memo;
    private string $original_amount;
    private string $applied_amount;
    private ?string $gateway_transaction_id;

    public function __construct(array $options)
    {
        $this->transaction_id = $options['transactionId'];
        $this->payment_id = $options['paymentId'];
        $this->memo = $options['memo'];
        $this->original_amount = $options['originalAmount'];
        $this->applied_amount = $options['appliedAmount'];
        $this->gateway_transaction_id = $options['gatewayTransactionId'] ?? null;
    }

    public function getTransactionId(): int
    {
        return $this->transaction_id;
    }

    public function getPaymentId(): int
    {
        return $this->payment_id;
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

    public function getGatewayTransactionid(): ?string
    {
        return $this->gateway_transaction_id;
    }
}
