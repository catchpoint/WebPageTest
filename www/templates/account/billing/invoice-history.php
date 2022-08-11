<div class="box">
    <div class="card-section-subhed card-section-subhed__grid">
        <h3>Payment &amp; Invoices</h3>
        <?php if (strtolower($billing_frequency) == "monthly") : ?>
            <div class="account-cta">
                <a href="/account/update_billing" class="two-tone-pill-button ">
                    <span class="two-tone-pill-button__left">Upgrade to Annual Billing</span>
                    <span class="two-tone-pill-button__right">Save 25%</span>
                </a>
            </div>
        <?php endif; ?>
    </div>
    <div class="card payment-info">
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

    <?php if (!$is_wpt_enterprise) : ?>
        <div class=" billing-history">
            <div class="info">
                <table class="sortable responsive-vertical-table">
                    <caption>
                        <span class="sr-only">, column headers with buttons are sortable.</span>
                    </caption>
                    <thead>
                        <tr>
                            <th aria-sort="ascending">
                                <button>
                                    Month
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
                        <?php foreach ($transactionHistory->toArray() as $row) : ?>
                            <tr>
                                <td data-th="DateTime"><?= date_format($row->getTransactionTime(), 'F d Y') ?></td>
                                <td data-th="Credit Card"><?= $row->getPaymentMethod()->getType() ?></td>
                                <td data-th="Card No."><?= $row->getPaymentMethod()->getMaskedCardNumber() ?></td>
                                <td data-th="Amount">$<?= $row->getAppliedAmount() ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; // (!$is_wpt_enterprise):
    ?>
</div>