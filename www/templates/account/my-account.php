<div class="my-account-page page_content">
    <h3><?= htmlspecialchars($pagefoo) ?></h3>
    <!-- VERIFIED EMAIL NOTICE ---->
    <?php if (!$is_verified) : ?>
        <div class="resend-email-verification-container">
            <div class="resend-email-verification-hed">
                <h3>A verification link was sent to your email</h3>
            </div>
            <div>Please click on the link that was sent to your email to complete your registration process.</div>
            <div class="resend-link-container">
                <span>Didn’t receive an email?</span>
                <form method="POST" action="/account">
                    <input type="hidden" name="type" value="resend-verification-email" />
                    <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                    <button type="submit">Resend Verification Link</button>
                </form>
            </div>
        </div>
    <?php endif; ?>

    <div class="subhed">
        <h1>My Account</h1>
        <?php if ($is_paid) : ?>
            <div class="contact-support-button">
                <a href="https://support.webpagetest.org"><span>Contact Support</span></a>
            </div>
        <?php endif; ?>
    </div>

    <!-- account tabs for Settings, Invoices and APIs -->
    <div class="tabs-container">
        <!-- radio buttons control the JS-less tabs-->
        <input type="radio" name="account-tabs" id="account-settings" value="account settings" checked />
        <!-- these sections only exist for paid users-->
        <?php if ($is_paid) : ?>
            <input type="radio" name="account-tabs" id="payments-invoices" value="payments and invoices" />
            <input type="radio" name="account-tabs" id="api-consumers" value="api consumers" />
        <?php endif; ?>

        <!-- these link to sections on the account page, but have subpages for modifications,  use hash deep linking -->
        <div class="tab-labels">
            <label for="account-settings">Account Settings</label>
            <!-- these sections only exist for paid users-->
            <?php if ($is_paid) : ?>
                <label for="payments-invoices">Payments and Invoices</label>
                <label for="api-consumers">Api Consumers</label>
            <?php endif; ?>
        </div>

        <!-- account settings tab -->
        <div class="tab-content" id="account-settings-content">
            <div class="box card contact-info" data-modal="contact-info-modal">
                <div class="card-section user-info">
                    <span class="dot image"><?= htmlspecialchars($first_name)[0] . ' ' . htmlspecialchars($last_name)[0] ?> </span>
                    <div>
                        <h3><?= htmlspecialchars($first_name) . ' ' . htmlspecialchars($last_name) ?></h3>
                        <div class="info">
                            <div><?= htmlspecialchars($email) ?></div>
                        </div>
                    </div>
                </div>
                <div class="card-section">
                    <div class="edit-button">
                        <button><span>Edit</span></button>
                    </div>
                </div>
            </div>

            <div class="box card password" data-modal="password-modal">
                <div class="card-section">
                    <h3>Password</h3>
                    <div class="info">
                        <div>************</div>
                    </div>
                </div>
                <div class="card-section">
                    <div class="edit-button">
                        <button><span>Edit</span></button>
                    </div>
                </div>
            </div>
        </div>

        <?php if (!$is_wpt_enterprise): ?>
            <div class="box card-section">
                <h3>Current Plan</h3>
                <?php if ($is_paid) : ?>
                    <div class="card-section-subhed">
                        <?= "{$braintreeCustomerDetails['wptPlanName']}"; ?>
                        <?php if ($is_canceled) : ?>
                            <span class="status"><?= $braintreeCustomerDetails['status']; ?></span>
                        <?php else : ?>
                            <span class="status"><?= $braintreeCustomerDetails['status']; ?></span>
                        <?php endif; ?>

                        <a href="/account/update_plan" class="pill-button yellow">Change Plan</a>
                    </div>

                    <ul>
                        <li><strong>Runs per month:</strong> 50</li>
                        <li><strong>Remaining runs:</strong> <?= $braintreeCustomerDetails['remainingRuns'] ?> </li>
                        <li><strong>Run renewal:</strong> date here</li>
                        <li><strong>Price:</strong> <?= $braintreeCustomerDetails['subscriptionPrice'] ?></li>
                        <li><strong>Billing Cycle:</strong> <?= $billing_frequency ?></li>
                        <li><strong>Plan Renewal:</strong> <?= $runs_renewal ?></li>
                    </ul>
                <?php else : ?>
                    <div class="card-section-subhed">
                        Starter
                        <span class="status">Active</span>
                        <a href="/account/update_plan" class="pill-button yellow">Upgrade Plan</a>
                    </div>
                    <ul>
                        <li><strong>Runs per month:</strong> 50</li>
                        <li><strong>Remaining runs:</strong> 50</li>
                        <li><strong>Run renewal:</strong> date here</li>
                    </ul>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>


        <!-- PAYING ONLY: Billing Invoice tab -->
        <?php if ($is_paid) : ?>
            <div class="tab-content" id="billing-settings-content">
                <?php if ($is_paid) {
                    if (!$is_wpt_enterprise) {
                        include_once __DIR__ . '/billing/invoice-history.php';
                    }
                } else {
                    include_once __DIR__ . '/includes/signup.php';
                } ?>
            </div>
        <?php endif; ?>


        <!-- PAYING ONLY:  API tab -->
        <?php if ($is_paid) : ?>
            <div class="tab-content" id="api-settings-content">
                <?php include_once __DIR__ . '/includes/api-keys.php'; ?>
            </div>
        <?php endif; ?>
    </div>
</div>


<!-- Modals -->

<?php
include_once __DIR__ . '/includes/modals/contact-info.php';
include_once __DIR__ . '/includes/modals/password.php';

if ($is_paid) {
    include_once __DIR__ . '/includes/modals/cancel-subscription.php';
    include_once __DIR__ . '/includes/modals/payment-info.php';
}
?>
<!-- /Modals -->