<div class="card-section">
    <h3>Subscription Plan</h3>
    <?php if ($is_paid) : ?>
        <div class="card-section-subhed card-section-subhed__grid">
            <span class="plan-name">
                <?= $wptCustomer->getWptPlanName() ?>
                <?php if (!$is_wpt_enterprise) : ?>
                    <?= $billing_frequency  ?>
                    Pro
                <?php endif; ?>
                <?php if ($is_pending) : ?>
                    <span class="status status__red"><?= $status; ?></span>
                <?php else : ?>
                    <span class="status"><?= $status; ?></span>
                <?php endif; ?>
            </span>
        </div>

        <ul class="subscription-plan-details">
            <li><strong>Runs per month</strong> <?= $monthly_runs ?></li>
            <li><strong>Remaining runs</strong> <?= $remaining_runs ?> </li>
            <li><strong>Run Renewal</strong> <?= $run_renewal_date ?></li>
        <?php if (!$is_wpt_enterprise) : ?>
            <li><strong>Price</strong> $<?= $wptCustomer->getFormattedSubscriptionPrice() ?> (+ applicable taxes)</li>
            <li><strong>Billing Cycle</strong> <?= $billing_frequency ?></li>
            <?php if (!isset($upcoming_plan)) : ?>
                <?php if ($is_pending) : ?>
                    <li><strong>End Date</strong> <?= $next_billing_date ?: "N/A" ?></li>
                <?php else : ?>
                    <li><strong>Plan Renewal</strong> <?= $next_billing_date ?: "N/A" ?></li>
                <?php endif; ?>
            <?php endif; ?>
        <?php endif; ?>
        </ul>
        <?php if (isset($upcoming_plan)) : ?>
            <h3>Upcoming Subscription</h3>
            <div class="card-section-subhed card-section-subhed__grid">
                <span class="plan-name">
                    <?= $upcoming_plan->getBillingFrequency() ?> Pro
                    <span class="status status__info">Subscription Begins: <?= $next_billing_date ?></span>
                </span>
            </div>
            <ul class="subscription-plan-details">
                <li><strong>Runs per month</strong><?= $upcoming_plan->getRuns() ?> </li>
                <li><strong>Price</strong> $<?= number_format(($upcoming_plan->getPrice() / 100), 2, '.', ',') ?> </li>
                <li><strong>Billing Cycle</strong> <?= $upcoming_plan->getBillingFrequency() ?></li>
            </ul>
        <?php endif; ?>
    <?php else : ?>
        <div class="card-section-subhed card-section-subhed__grid">
            <span class="plan-name">Starter<span class="status">Active</span></span>

        </div>
        <ul class="subscription-plan-details">
            <li><strong>Runs per month</strong> <?= $monthly_runs ?></li>
            <li><strong>Remaining runs</strong> <?= $remaining_runs ?> </li>
            <li><strong>Run Renewal</strong> <?= $run_renewal_date ?></li>
        </ul>
    <?php endif; ?>
</div>
<?php if (!$is_wpt_enterprise) : ?>
    <?php if ($is_paid && !$is_pending) : ?>
    <div class="card-section">
        <div class="account-cta">
            <label class="dropdown">
                <input type="checkbox" class="dd-input" id="test">
                <div class="dd-button">
                    Update Subscription
                </div>
                <ul class="dd-menu">
                    <li><a href="/account/update_plan">Update Subscription</a></li>
                    <li><a href="/account/update_payment_method">Edit Billing Info</a></li>
                    <li><a href="#" id="cancel-subscription">Cancel Subscription</a> </li>
                </ul>
            </label>
        </div>
    </div>
    <?php elseif ((!$is_paid && !$is_canceled) || ($is_paid && $is_pending)) :
// only pending users can restart their plans currently ?>
    <div class="card-section">
        <div class="account-cta">
            <a href="/account/update_plan" class="pill-button yellow">Upgrade Plan</a>
        </div>
    </div>
    <?php else : ?>
    <div class="card-section">
        <div class="account-cta">
            <a href="<?= $support_link ?>" class="pill-button yellow">Contact Support to Upgrade</a>
        </div>
    </div>
    <?php endif; ?>
<?php endif; ?>
