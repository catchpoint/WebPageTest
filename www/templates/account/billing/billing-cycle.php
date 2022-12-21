<?php
global $support_link;
?>
<div class="my-account-page page_content">
    <ul class="breadcrumbs">
        <li><a href="/account#payments-invoices">Payment & Invoices</a></li>
        <li> Update Billing Cycle</li>
    </ul>
    <div class="subhed">
        <h1>Update Billing Cycle</h1>
        <?php if ($is_paid) : ?>
            <div class="contact-support-button">
              <a href="<?= $support_link ?>"><span>Contact Support</span></a>
            </div>
        <?php endif; ?>
    </div>
    <!-- main form -->
    <form id="wpt-account-upgrade" method="post" action="/account">
        <!-- payment -->
        <div class="box card-section">
            <h3>Payment Method</h3>
            <div class="radiobutton-tabs__container">
                <div class="card payment-info radiobutton-tabs__tab-content" data-modal="payment-info-modal">
                    <div class="card-section user-info">
                        <div class="cc-type image">
                            <img src="<?= $cc_image_url ?>" alt="card-type" width="80px" height="54px" />
                        </div>
                        <div class="cc-details">
                            <div class="cc-number"><?= $masked_cc; ?></div>
                            <div class="cc-expiration">Expires: <?= $cc_expiration; ?></div>
                        </div>
                    </div>

                </div>
            </div>
            <!-- .radiobutton-tab-container__notcss -->

            <input type="hidden" name="plan" value="<?= $newPlan->getId() ?>" />
            <input type='hidden' name='type' value='upgrade-plan-2' />
            <input type="hidden" name="subscription_id" value="<?= $wptCustomer->getSubscriptionId() ?>" />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />
        </div>

        <div class="box card-section">
            <h2> New Billing Summary</h2>
            <p><strong>Billing Cycle:</strong> Annual</p>

            <ul class="plan-summary-list" id="plan-summary">

                <li><strong>Price:</strong> <del>$<?= $oldPlan->getAnnualPrice() ?></del> $<?= $newPlan->getAnnualPrice() ?></li>

                <li><strong>Tax:</strong> $<?= $tax ?></li>

                <li class="total__due-today">
                    <strong>Due today:</strong> $<?= $total ?>
                </li>

                <li><strong>Next Payment:</strong> <?= $renewaldate ?></li>
            </ul>
        </div>

        <div class="add-subscription-button-wrapper">
            <button type="submit" class="pill-button yellow">Update billing cycle</button>
        </div>
    </form>
</div>