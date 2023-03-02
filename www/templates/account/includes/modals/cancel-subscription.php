<fg-modal id="subscription-plan-modal" class="subscription-plan-modal fg-modal">
    <form method="POST" action="/account">
        <h3 class="modal_title">Subscription Details</h3>
        <p>Active Plan: <?= $wptCustomer->getWptPlanName() ?></p>
        <p>Cancelling your Pro subscription will downgrade your account to a free Starter plan.</p>
        <p>These changes will take effect at the end of your billing period. You can resubscribe at any time.</p>
        <input type="hidden" name="type" value="cancel-subscription" />
        <input type="hidden" name="subscription-id" value="<?= $wptCustomer->getSubscriptionId() ?>" />
        <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
        <div class="cancel-subscription-button">
            <button class="pill-button red">Cancel Subscription</button>
        </div>
    </form>
</fg-modal>