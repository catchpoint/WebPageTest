<div class="box card-section">
    <h3>Subscription Plan</h3>
    <?php if ($is_paid) : ?>
        <div class="card-section-subhed card-section-subhed__grid">
            <span class="plan-name">
                <?= $wptCustomer->getWptPlanName() ?>
        <?php if (!$is_wpt_enterprise) : ?>
                <?= $billing_frequency  ?>
                Pro
        <?php endif; ?>
                <?php if ($is_canceled) : ?>
                    <span class="status status__red"><?= $status; ?></span>
                <?php else : ?>
                    <span class="status"><?= $status; ?></span>
                <?php endif; ?>
            </span>
            <?php if (!$is_canceled && !$is_wpt_enterprise) : ?>
                <div class="account-cta">
                    <label class="dropdown">
                        <input type="checkbox" class="dd-input" id="test">
                        <div class="dd-button">
                            Update Subscription
                        </div>
                        <ul class="dd-menu">
                            <li><a href="/account/update_plan">Update Subscription</a></li>
                            <li><a href="#" id="cancel-subscription">Cancel Subscription</a> </li>
                        </ul>
                    </label>
                </div>
            <?php endif; ?>
        </div>

        <ul>
            <li><strong>Runs per month:</strong> <?= $wptCustomer->getMonthlyRuns() ?></li>
            <li><strong>Remaining runs:</strong> <?= $wptCustomer->getRemainingRuns() ?> </li>
            <li><strong>Run Renewal:</strong>
                <?php
                $date = new DateTime('now');
                $date->modify('first day of next month')->modify('+6 day');
                echo $date->format('F d, Y') ?>
            </li>
        <?php if (!$is_wpt_enterprise) : ?>
            <li><strong>Price:</strong> $<?= number_format(($wptCustomer->getSubscriptionPrice() / 100), 2, '.', ',') ?></li>
            <li><strong>Billing Cycle:</strong> <?= $billing_frequency ?></li>
            <?php if (!isset($upcoming_plan) && !$is_canceled) : ?>
                <li><strong>Plan Renewal:</strong> <?= $plan_renewal ?: "N/A" ?></li>
            <?php endif; ?>
        <?php endif; ?>
        </ul>
        <?php if (isset($upcoming_plan)) : ?>
            <h3>Upcoming Subscription</h3>
            <div class="card-section-subhed card-section-subhed__grid">
                <span class="plan-name">
                    <?= $upcoming_plan->getBillingFrequency() ?> Pro
                    <span class="status status__info">Subscription Begins: <?= $plan_renewal ?></span>
                </span>
            </div>
            <ul>
                <li><strong>Runs per month:</strong><?= $upcoming_plan->getRuns() ?> </li>
                <li><strong>Price:</strong> $<?= number_format(($upcoming_plan->getPrice() / 100), 2, '.', ',') ?> </li>
                <li><strong>Billing Cycle:</strong> <?= $upcoming_plan->getBillingFrequency() ?></li>
            </ul>
        <?php endif; ?>
    <?php else : ?>
        <div class="card-section-subhed card-section-subhed__grid">
            <span class="plan-name">Starter<span class="status">Active</span></span>

            <div class="account-cta">
                <a href="/account/update_plan" class="pill-button yellow">Upgrade Plan</a>
            </div>
        </div>
        <ul>
            <li><strong>Runs per month:</strong> 300</li>
            <li><strong>Remaining runs:</strong> <?= $remainingRuns ?> </li>
            <li><strong>Run Renewal:</strong>
                <?php
                $date = new DateTime('now');
                $date->modify('first day of next month')->modify('+6 day');
                echo $date->format('F d, Y') ?>
            </li>
        </ul>
    <?php endif; ?>
</div>
