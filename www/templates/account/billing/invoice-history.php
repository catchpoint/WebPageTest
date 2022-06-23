<div class="box">
    <h2>Payment &amp; Invoices</h2>
    <a href="/account/update_billing" class="button">Upgrade Plan</a>
    <div class="card payment-info" data-modal="payment-info-modal">
        <div class="card-section user-info">
            <div class="cc-type image">
                <img src="<?= $braintreeCustomerDetails['ccImageUrl'] ?>" alt="card-type" width="80px" height="54px" />
            </div>
            <div class="cc-details">
                <div class="cc-number"><?= $braintreeCustomerDetails['maskedCreditCard']; ?></div>
                <div class="cc-expiration">Expires: <?= $braintreeCustomerDetails['ccExpirationDate']; ?></div>
            </div>
        </div>
        <div class="card-section">
            <div class="edit-button">
                <button><span>Edit</span></button>
            </div>
        </div>
    </div>

    <?php if (!$is_wpt_enterprise) : ?>
        <div class=" billing-history">
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
</div>