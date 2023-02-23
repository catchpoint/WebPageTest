<fg-modal id="subscription-plan-modal" class="subscription-plan-modal fg-modal" data-modal="subscription-plan-modal-confirm">
    <h3 class="modal_title">Subscription Details</h3>
    <p>Active Plan: <?= $wptCustomer->getWptPlanName() ?></p>
    <p>Cancelling your Pro subscription will downgrade your account to a free Starter plan.</p>
    <p>Please <a href="<?= $support_link ?>">contact support</a> with for any upgrades or other changes to your plan.</p>
    <div class="cancel-subscription-button">
        <button class="pill-button red">Cancel Subscription</button>
    </div>
</fg-modal>

<fg-modal id="subscription-plan-modal-confirm" class="subscription-plan-modal-confirm fg-modal">
    <form method="POST" action="/account">
        <h3>Subscription Details</h3>
        <p>Active Plan: <?= $wptCustomer->getWptPlanName() ?></p>
        <p>These changes will take effect at the end of your billing period. You can resubscribe at any time.</p>
        <button type="submit" class="pill-button red">Cancel Subscription</button>
        <input type="hidden" name="type" value="cancel-subscription" />
        <input type="hidden" name="subscription-id" value="<?= $wptCustomer->getSubscriptionId() ?>" />
        <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
    </form>
</fg-modal>