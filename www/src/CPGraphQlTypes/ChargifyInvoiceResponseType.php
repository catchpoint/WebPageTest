<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use DateTime;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceSellerType;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceAddressType;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceLineItemList;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceTaxList;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceCreditList;
use WebPageTest\CPGraphQlTypes\ChargifyInvoiceRefundList;
use WebPageTest\CPGraphQlTypes\ChargifyInvoicePaymentList;

class ChargifyInvoiceResponseType
{
    private string $number;
    private DateTime $issue_date;
    private DateTime $due_date;
    private string $status;
    private string $currency;
    private string $product_name;
    private string $memo;
    private string $subtotal_amount;
    private string $discount_amount;
    private string $tax_amount;
    private string $total_amount;
    private string $credit_amount;
    private string $refund_amount;
    private string $paid_amount;
    private string $due_amount;
    private ChargifyInvoiceSellerType $seller;
    private ChargifyInvoiceCustomerType $customer;
    private ChargifyInvoiceAddressType $billing_address;
    private ChargifyInvoiceAddressType $shipping_address;
    private ChargifyInvoiceLineItemList $line_items;
    private ChargifyInvoiceTaxList $taxes;
    private ChargifyInvoiceCreditList $credits;
    private ChargifyInvoiceRefundList $refunds;
    private ChargifyInvoicePaymentList $payments;

    public function __construct(array $options)
    {
        $this->number = $options['number'];
        $this->issue_date = new DateTime($options['issueDate']);
        $this->due_date = new DateTime($options['dueDate']);
        $this->status = $options['status'];
        $this->currency = $options['currency'];
        $this->product_name = $options['productName'];
        $this->memo = $options['memo'];
        $this->subtotal_amount = $options['subtotalAmount'];
        $this->discount_amount = $options['discountAmount'];
        $this->tax_amount = $options['taxAmount'];
        $this->credit_amount = $options['creditAmount'];
        $this->refund_amount = $options['refundAmount'];
        $this->paid_amount = $options['paidAmount'];
        $this->due_amount = $options['dueAmount'];

        $seller_name = $options['seller']['name'];
        $seller_phone = $options['seller']['phone'];
        $seller_addr = new ChargifyInvoiceAddressType($options['seller']['address']);
        $this->seller = new ChargifyInvoiceSellerType($seller_name, $seller_phone, $seller_addr);

        $this->customer = new ChargifyInvoiceCustomerType($options['customer']);
        $this->billing_address = new ChargifyInvoiceAddressType($options['billingAddress']);
        $this->shipping_address = new ChargifyInvoiceAddressType($options['shippingAddress']);

        $line_items = new ChargifyInvoiceLineItemList();
        foreach ($options['lineItems'] as $line_item) {
            $line_items->add(new ChargifyInvoiceLineItem($line_item));
        }
        $this->line_items = $line_items;

        $taxes = new ChargifyInvoiceTaxList();
        foreach ($options['taxes'] as $tax) {
            $taxes->add(new ChargifyInvoiceTax($tax));
        }
        $this->taxes = $taxes;

        $credits = new ChargifyInvoiceCreditList();
        foreach ($options['credits'] as $credit) {
            $credits->add(new ChargifyInvoiceCredit($credit));
        }
        $this->credits = $credits;

        $refunds = new ChargifyInvoiceRefundList();
        foreach ($options['refunds'] as $refund) {
            $refunds->add(new ChargifyInvoiceRefund($refund));
        }
        $this->refunds = $refunds;

        $payments = new ChargifyInvoicePaymentList();
        foreach ($options['payments'] as $payment) {
            $payments->add(new ChargifyInvoicePayment($payment));
        }
        $this->payments = $payments;
    }

    public function getNumber(): string
    {
        return $this->number;
    }

    public function getIssueDate(): DateTime
    {
        return $this->issue_date;
    }

    public function getDueDate(): DateTime
    {
        return $this->due_date;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getProductName(): string
    {
        return $this->product_name;
    }

    public function getMemo(): string
    {
        return $this->memo;
    }

    public function getSubtotalAmount(): string
    {
        return $this->subtotal_amount;
    }

    public function getDiscountAmount(): string
    {
        return $this->discount_amount;
    }

    public function getTaxAmount(): string
    {
        return $this->tax_amount;
    }

    public function getTotalAmount(): string
    {
        return $this->total_amount;
    }

    public function getCreditAmount(): string
    {
        return $this->credit_amount;
    }

    public function getRefundAmount(): string
    {
        return $this->refund_amount;
    }

    public function getPaidAmount(): string
    {
        return $this->paid_amount;
    }

    public function getDueAmount(): string
    {
        return $this->due_amount;
    }

    public function getSeller(): ChargifyInvoiceSellerType
    {
        return $this->seller;
    }

    public function getCustomer(): ChargifyInvoiceCustomerType
    {
        return $this->customer;
    }

    public function getBillingAddress(): ChargifyInvoiceAddressType
    {
        return $this->billing_address;
    }

    public function getShippingAddress(): ChargifyInvoiceAddressType
    {
        return $this->shipping_address;
    }

    public function getLineItems(): ChargifyInvoiceLineItemList
    {
        return $this->line_items;
    }

    public function getTaxes(): ChargifyInvoiceTaxList
    {
        return $this->taxes;
    }

    public function getCredits(): ChargifyInvoiceCreditList
    {
        return $this->credits;
    }

    public function getRefunds(): ChargifyInvoiceRefundList
    {
        return $this->refunds;
    }

    public function getPayments(): ChargifyInvoicePaymentList
    {
        return $this->payments;
    }
}
