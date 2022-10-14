<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

class SubscriptionCancellationInputType
{
    private string $subscription_id;
    private string $cancellation_reason;
    private string $suggestion;

    public function __construct(string $subscription_id, string $cancellation_reason = "", string $suggestion = "")
    {
        $this->subscription_id = $subscription_id;
        $this->cancellation_reason = $cancellation_reason;
        $this->suggestion = $suggestion;
    }

    public function toArray(): array
    {
        return [
        'subscriptionId' => $this->subscription_id,
        'cancellationReason' => $this->cancellation_reason,
        'suggestion' => $this->suggestion
        ];
    }
}
