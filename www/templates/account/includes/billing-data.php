<div class="card subscription-plan" data-modal="subscription-plan-modal">
    <div class="card-section">
        <h3>Subscription Plan</h3>
        <div class="info">
            <ul>
                <li><strong>Plan</strong> <?= "{$braintreeCustomerDetails['wptPlanName']}"; ?></li>
                <?php echo isset($braintreeCustomerDetails['remainingRuns']) ? "<li><strong>Remaining Runs</strong> {$braintreeCustomerDetails['remainingRuns']}</li>" : "" ?>
                <?php echo isset($runs_renewal) ? "<li><strong>Runs Renewal</strong> {$runs_renewal}</li>" : "" ?>
                <li><strong>Price</strong> <?= "\${$braintreeCustomerDetails['subscriptionPrice']}"; ?></li>
                <li><strong>Payment</strong> <?= $billing_frequency ?></li>
                <?php if ($is_canceled) : ?>
                    <li><strong>Plan Renewal</strong> <s><?= $plan_renewal ?></s></li>
                    <li class="cancel"><strong>Status</strong> <span><?= $braintreeCustomerDetails['status']; ?></span></li>
                <?php else : ?>
                    <li><strong>Plan Renewal</strong> <?= $plan_renewal ?></li>
                    <li><strong>Status</strong> <?= $braintreeCustomerDetails['status']; ?></li>
                <?php endif; ?>
            </ul>
        </div>
    </div>
    <div class="card-section">
        <div class="edit-button">
            <button><span>Edit</span></button>
        </div>
    </div>
</div>

<div class="card payment-info" data-modal="payment-info-modal">
    <div class="card-section">
        <div class="info">
            <div class="cc-type">
                <img src="<?= $braintreeCustomerDetails['ccImageUrl'] ?>" alt="card-type" width="80px" height="54px" />
            </div>
            <div class="cc-details">
                <div class="cc-number"><?= $braintreeCustomerDetails['maskedCreditCard']; ?></div>
                <div class="cc-expiration">Expires: <?= $braintreeCustomerDetails['ccExpirationDate']; ?></div>
            </div>
        </div>
    </div>
    <div class="card-section">
        <div class="edit-button">
            <button><span>Edit</span></button>
        </div>
    </div>
</div>

<?php if (!$is_wpt_enterprise) : ?>
    <div class="card billing-history">
        <div class="info">
            <table class="sortable responsive-vertical-table">
                <caption>
                    <h3>Billing History</h3>
                    <span class="sr-only">, column headers with buttons are sortable.</span>
                </caption>
                <thead>
                    <tr>
                        <th aria-sort="ascending">
                            <button>
                                Date Time Stamp
                                <span aria-hidden="true"></span>
                            </button>
                        </th>
                        <th>
                            <button>
                                Credit Card
                                <span aria-hidden="true"></span>
                            </button>
                        </th>
                        <th>
                            <button>
                                Card Number
                                <span aria-hidden="true"></span>
                            </button>
                        </th>
                        <th>
                            <button>
                                Amount
                                <span aria-hidden="true"></span>
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($braintreeTransactionHistory as $row) : ?>
                        <tr>
                            <td data-th="DateTime"><?= date_format(date_create($row['transactionDate']), 'M d Y H:i:s e') ?></td>
                            <td data-th="Credit Card"><?= $row['cardType'] ?></td>
                            <td data-th="Card No."><?= $row['maskedCreditCard'] ?></td>
                            <td data-th="Amount">$<?= $row['amount'] ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
<?php endif; // (!$is_wpt_enterprise):
?>

<div class="card api-consumers">
    <h3>API Consumers</h3>
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
            <table class="sortable">
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
                    <?php foreach ($wptApiKey as $row) : ?>
                        <tr>
                            <td>
                                <input type='checkbox' data-apikeybox="individual" name='api-key-id[]' value='<?= $row['id'] ?>' />
                            </td>
                            <td><?= $row['name'] ?></td>
                            <td class="hidden-content">
                                <button type="button" class="view-button">View</button>
                                <span class="hidden-area closed">
                                    <span class="api-key"><?= $row['apiKey'] ?></span>
                                    <button type="button" class="hide-button"><span class="sr-only">Close</span></button>
                            </td>
                            </span>
                            <td><?= date_format(date_create($row['createDate']), 'M d Y H:i:s e') ?></td>
                            <td><?= date_format(date_create($row['changeDate']), 'M d Y H:i:s e') ?></td>
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