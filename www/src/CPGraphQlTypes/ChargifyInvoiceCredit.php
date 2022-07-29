<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use DateTime;

class ChargifyInvoiceCredit
{
    private string $credit_note_number;
    private DateTime $transaction_time;
    private string $memo;
    private string $original_amount;
    private string $applied_amount;

    public function __construct(array $options)
    {
        $this->credit_note_number = $options['credit_note_number'];
        $this->transaction_time = new DateTime($options['transaction_time']);
        $this->memo = $options['memo'];
        $this->original_amount = $options['original_amount'];
        $this->applied_amount = $options['applied_amount'];
    }

    public function getCreditNoteNumber(): string
    {
        return $this->credit_note_number;
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
}
