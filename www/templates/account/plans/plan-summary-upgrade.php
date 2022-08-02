<div class="my-account-page page_content">
    <ul class="breadcrumbs">
        <li><a href="/account">Account Settings</a></li>
        <li><a href="/account/update_plan">Update Plan</a></li>
        <li>Plan summary</li>
    </ul>
    <div class="subhed">
        <h1>Purchase Summary</h1>
        <div class="contact-support-button">
            <a href="https://support.webpagetest.org"><span>Contact Support</span></a>
        </div>
    </div>
    <!-- main form -->
    <form id="wpt-account-upgrade" method="post" action="/account">
        <input type='hidden' name='type' value='upgrade-plan-2' />
        <!-- payment -->
        <div class="box card-section">
            <h3>Payment Method</h3>
            <div class="radiobutton-tabs__container">
                <div class="card payment-info radiobutton-tabs__tab-content" data-modal="payment-info-modal" data-tab="existing-card">
                    <div class="card-section user-info">
                        <div class="cc-type image">
                            <img src="<?= $cc_image_url ?>" alt="card-type" width="80px" height="54px" />
                        </div>
                        <div class="cc-details">
                            <div class="cc-number"><?= $masked_cc; ?></div>
                            <div class="cc-expiration">Expires: <?= $cc_expiration; ?></div>
                        </div>
                    </div>
                    <div class="card-section">
                        <div class="edit-button">
                            <button><span>Edit</span></button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- .radiobutton-tab-container__notcss -->

            <input type="hidden" name="plan" value="<?= $plan->getId() ?>" />
            <input type="hidden" name="subscription_id" value="<?= $wptCustomer->getSubscriptionId() ?>" />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />
        </div>

        <div class="box card-section">
            <h2>Selected Plan</h2>
            <div class="card-section-subhed">
                Pro <?= $plan->getBillingFrequency() ?>
            </div>
            <ul class="plan-summary-list" id="plan-summary">
                <li><strong>Runs per month:</strong> <?= $plan->getRuns() ?></li>
<?php if($plan->getBillingFrequency() == 'Monthly'): ?>
                <li><strong>Monthly Price:</strong> $<?= $plan->getMonthlyPrice() ?></li>
<?php else: ?>
                <li><strong>Yearly Price:</strong> $<?= $plan->getAnnualPrice() ?></li>
<?php endif; ?>
            </ul>
        </div>

        <div class="add-subscription-button-wrapper">
            <button type="submit" class="pill-button yellow">Upgrade Plan</button>
        </div>
    </form>
</div>
