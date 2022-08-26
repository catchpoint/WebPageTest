<?php

use WebPageTest\ApiKeyList;

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
        <div class="tab-labels" data-id="tab-labels">
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
                            <p><?= htmlspecialchars($company_name); ?></p>
                            <p><?= htmlspecialchars($email) ?></p>
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




            <div class="box card-section">
                <h3>Current Plan</h3>
                <?php if ($is_paid) : ?>
                    <div class="card-section-subhed card-section-subhed__grid">
                        <span class="plan-name">
                            <?= $wptCustomer->getWptPlanName() ?>
                            <?= $billing_frequency  ?>
                            Pro
                            <?php if ($is_canceled) : ?>
                                <span class="status status__red"><?= $status; ?></span>
                            <?php else : ?>
                                <span class="status"><?= $status; ?></span>
                            <?php endif; ?>
                        </span>
                        <?php if (!$is_canceled) : ?>
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
                        <li><strong>Price:</strong> $<?= number_format(($wptCustomer->getSubscriptionPrice() / 100), 2, '.', ',') ?></li>
                        <li><strong>Billing Cycle:</strong> <?= $billing_frequency ?></li>
                        <li><strong>Plan Renewal:</strong> <?= $wptCustomer->getPlanRenewalDate()->format('m/d/Y') ?></li>
                    </ul>
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
        </div>


        <!-- PAYING ONLY: Billing Invoice tab -->
        <?php if ($is_paid) : ?>
            <div class="tab-content" id="billing-settings-content">
                <?php if ($is_paid) {
                    include_once __DIR__ . '/billing/invoice-history.php';
                } else {
                    include_once __DIR__ . '/includes/signup.php';
                } ?>
            </div>
        <?php endif; ?>


        <!-- PAYING ONLY:  API tab -->
        <?php if ($is_paid) : ?>
            <div class="tab-content" id="api-settings-content">
                <div class="box card api-consumers">
                    <h2>API Consumers</h2>
                    <div class="create-key-container">
                        <div class="create-delete-button-container">
                            <button type="button" class="new-api-key" data-toggle="open" data-targetid="create-api-key-toggle-area">New Api Key</button>
                            <label for="delete-api-key-submit-input" class="delete-key disabled" data-apikeybox="delete-button" disabled>Delete</label>
                        </div>
                        <div class="toggleable" id="create-api-key-toggle-area">
                            <form method="POST" action="/account">
                                <label for="api-key-name" class="sr-only">API Key Name</label>
                                <input type="text" name="api-key-name" placeholder="Enter Application Name" required />
                                <button type="submit">Save</button>
                                <button type="button" class="cancel" data-toggle="close" data-targetid="create-api-key-toggle-area">Cancel</button>
                                <input type="hidden" name="type" value="create-api-key" />
                                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                            </form>
                        </div>
                    </div>
                    <div class="info">
                        <form method='POST' action='/account'>
                            <table class="sortable responsive-vertical-table selectable-table">
                                <caption>
                                    <span class="sr-only">API Consumers table, column headers with buttons are sortable.</span>
                                </caption>
                                <thead>
                                    <tr>
                                        <th class="no-sort select-all-box"><label class="sr-only" for="select-all-api-keys">Select all api keys</label><input type="checkbox" name="select-all-api-keys" data-apikeybox="select-all" /></th>
                                        <th aria-sort="ascending">
                                            <button>
                                                Name
                                                <span aria-hidden="true"></span>
                                            </button>
                                        </th>
                                        <th>
                                            <button>
                                                API Key
                                                <span aria-hidden="true"></span>
                                            </button>
                                        </th>
                                        <th>
                                            <button>
                                                Create Date
                                                <span aria-hidden="true"></span>
                                            </button>
                                        </th>
                                        <th>
                                            <button>
                                                Last Updated
                                                <span aria-hidden="true"></span>
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($api_keys as $key) : ?>
                                        <tr>
                                            <td data-th="Select">
                                                <input type='checkbox' data-apikeybox="individual" name='api-key-id[]' value='<?= $key->getId() ?>' />
                                            </td>
                                            <td data-th="Name"><?= $key->getName() ?></td>
                                            <td data-th="API key" class="hidden-content">
                                                <button type="button" class="view-button">View</button>
                                                <span class="hidden-area closed">
                                                    <span class="api-key"><?= $key->getApiKey() ?></span>
                                                    <button type="button" class="hide-button"><span class="sr-only">Close</span></button>
                                            </td>
                                            </span>
                                            <td data-th="Created"><?= date_format($key->getCreateDate(), 'M d Y H:i:s e') ?></td>
                                            <td data-th="Updated"><?= date_format($key->getChangeDate(), 'M d Y H:i:s e') ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                            <input type='hidden' name='type' value='delete-api-key' />
                            <input type='hidden' name='csrf_token' value='<?= $csrf_token ?>' />
                            <input type="submit" id="delete-api-key-submit-input" class="sr-only" />
                        </form>
                    </div>
                </div>
            </div>
        <?php endif; ?>
    </div>
</div>


<!-- Modals -->

<?php
include_once __DIR__ . '/includes/modals/contact-info.php';
include_once __DIR__ . '/includes/modals/password.php';
?>
<?php if ($is_paid) {
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