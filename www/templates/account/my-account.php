<?php
global $support_link;
?>
<!-- VERIFIED EMAIL NOTICE ---->
<?php if (!$is_verified) : ?>
    <div class="resend-email-verification-container">
        <div>
            <p>Please verify your email address in order to utilize key features of your WebPageTest Account</p>
            <form method="POST" action="/account" class="form__pulse-wait">
                <input type="hidden" name="type" value="resend-verification-email" />
                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                <button type="submit" class="button pill-button grey-outline white"><span>Resend Verification Email</span></button>
            </form>
        </div>
    </div>
<?php endif; ?>

<div class="my-account-page page_content">

    <!-- form notifications -->
    <?php
    include_once __DIR__ . '/../includes/form-notifications.php';
    ?>
    <div class="subhed">
        <h1>My Account</h1>
        <?php if ($is_paid) : ?>
            <div class="contact-support-button">
              <a href="<?= $support_link ?>"><span>Contact Support</span></a>
            </div>
        <?php endif; ?>
    </div>

    <!-- account tabs for Settings, Invoices and APIs -->
    <div class="tabs-container">
        <!-- radio buttons control the JS-less tabs-->
        <input type="radio" name="account-tabs" id="account-settings" value="account settings" checked />
        <!-- these sections only exist for paid users-->
        <?php if (($is_paid || $is_canceled) && !$is_wpt_enterprise) : ?>
            <input type="radio" name="account-tabs" id="payments-invoices" value="payments and invoices" />
        <?php endif; ?>
        <?php if ($is_paid) : ?>
            <input type="radio" name="account-tabs" id="api-consumers" value="api consumers" />
        <?php endif; ?>

        <!-- these link to sections on the account page, but have subpages for modifications,  use hash deep linking -->
        <div class="tab-labels" data-id="tab-labels">
            <label for="account-settings">Account Settings</label>
            <!-- these sections only exist for paid users-->
            <?php if (($is_paid || $is_canceled) && !$is_wpt_enterprise) : ?>
                <label for="payments-invoices">Payments and Invoices</label>
            <?php endif; ?>
            <?php if ($is_paid) : ?>
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
                            <p><?= htmlspecialchars($company_name); ?></p>
                            <p><?= htmlspecialchars($email) ?></p>
                        </div>
                    </div>
                </div>
                <div class="card-section">
                    <div class="edit-button">
                        <button><span>Edit Contact Info</span></button>
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
                        <button><span>Edit Password</span></button>
                    </div>
                </div>
            </div>

            <div class="box card subscription-plan">
              <?php require_once __DIR__ . '/includes/subscription-plan.php'; ?>
            </div>
        </div>


        <!-- PAYING ONLY: Billing Invoice tab -->
        <?php if (($is_paid || $is_canceled) && !$is_wpt_enterprise) : ?>
            <div class="tab-content" id="billing-settings-content">
            <?php include_once __DIR__ . '/billing/invoice-history.php'; ?>
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
?>
<?php if ($is_paid && !$is_wpt_enterprise) {
    include_once __DIR__ . '/includes/modals/cancel-subscription.php';
} ?>
<!-- /Modals -->

<script>
    (() => {
        function setHash(e) {
            history.pushState({}, "", "#" + e.target.id);
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                var openTab = window.location.hash.replace('#', '');
                if (openTab) {
                    document.getElementById(openTab).checked = "true";
                }
                document.querySelectorAll("input[name='account-tabs']").forEach((input) => {
                    input.addEventListener('change', setHash)
                });
            });
        }
    })();
</script>