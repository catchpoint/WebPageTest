<fg-modal id="subscription-plan-modal" class="subscription-plan-modal fg-modal" data-modal="subscription-plan-modal-confirm">
    <h3 class="modal_title">Subscription Details</h3>
    <p>Active Plan: <?= "{$braintreeCustomerDetails['wptPlanName']}" ?></p>
    <p>Please <a href="https://support.webpagetest.org">contact support</a> with for any upgrades or other changes to your plan.</p>
    <div class="cancel-subscription-button">
        <button class="pill-button red">Cancel Subscription</button>
    </div>
</fg-modal>

<fg-modal id="subscription-plan-modal-confirm" class="subscription-plan-modal-confirm fg-modal">
    <form method="POST" action="/account">
        <fieldset>
            <legend class="modal_title">Subscription Details</legend>
            <p>Active Plan: <?= "{$braintreeCustomerDetails['wptPlanName']}" ?></p>
            <button type="submit" class="pill-button red">Cancel Subscription</button>
            <input type="hidden" name="type" value="cancel-subscription" />
            <input type="hidden" name="subscription-id" value="<?= $braintreeCustomerDetails['subscriptionId'] ?>" />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
        </fieldset>
    </form>
</fg-modal>