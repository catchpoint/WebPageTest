<div class="box">
    <div class="card-section-subhed card-section-subhed__grid">
        <h3>Payment &amp; Invoices</h3>
        <?php if (strtolower($billing_frequency) == "monthly") : ?>
            <div class="account-cta">
                <a href="/account/update_billing" class="two-tone-pill-button "> <span class="two-tone-pill-button__left">Upgrade to Annual Billing</span>
                    <span class="two-tone-pill-button__right">Save 20%</span>
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
        <div class="card-section">
            <div class="edit-button">
                <a href="/account/update_payment_method"><span>Edit Billing Info</span></a>
            </div>
        </div>
    </div>

    <?php if (!$is_wpt_enterprise) : ?>
        <div class="billing-history">
            <div class="info">
            <p>If you need an invoice that you do not see in your account please reach out to <a href="<?= $support_link ?>">our support team</a></p>
        <?php if (!empty($transactionHistory)) : ?>
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
                            <th>
                                Download
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($transactionHistory as $txn) : ?>
                            <tr>
                                <td data-th="DateTime"><?= date_format($txn->getTransactionTime(), 'F d Y') ?></td>
                                <td data-th="Credit Card"><?= $txn->getPaymentMethod()->getCardBrand() ?></td>
                                <td data-th="Card No."><?= $txn->getPaymentMethod()->getMaskedCardNumber() ?></td>
                                <td data-th="Amount">$<?= $txn->getAppliedAmount() ?></td>
                                <td data-th="Download"><a href="<?= $txn->getInvoiceLink() ?>" target="_blank" rel="noopener noreferrer">Link</a></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
        <?php endif; ?>
            </div>
        </div>
    <?php endif; // (!$is_wpt_enterprise):
    ?>
</div>