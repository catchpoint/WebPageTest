<div class="my-account-page page_content">
    <ul class="breadcrumbs">
        <li><a href="/account#payments-invoices">Payment & Invoices</a></li>
        <li> Update Billing Cycle</li>
    </ul>
    <div class="subhed">
        <h1>Update Billing Cycle</h1>
        <?php if ($is_paid) : ?>
            <div class="contact-support-button">
                <a href="https://support.webpagetest.org"><span>Contact Support</span></a>
            </div>
        <?php endif; ?>
    </div>
    <form>
        <div class="box card-section">
            <h2> New Billing Summary</h2>
            <p><strong>Billing Cycle:</strong> Annual</p>
            <ul class="plan-summary-list" id="plan-summary">
                <li><strong>Price:</strong> <s>old amount</s> $newAmount</li>
                <li><strong>Due Today</strong> $0.0</li>
                <li><strong>Next Payment:</strong> Date here</li>
            </ul>
            <hr />
            <h3>Payment Method</h3>
            <div class=" radiobutton-tabs__container">
                <?php if ($is_paid) : ?>
                    <!-- assume there is a CC on file if it's a paid account: so show tabs -->

                    <legend for="payment-selection" class="visually-hidden"> Choose payment method:</legend>
                    <input id="existing-card" type="radio" name="payment" value="existing-card" checked />
                    <label for="existing-card">
                        Existing payment method
                    </label>
                    <input id="new-card" type="radio" name="payment" value="new-card" />
                    <label for="new-card">
                        New payment method
                    </label>


                    <div class="card payment-info radiobutton-tabs__tab-content" data-modal="payment-info-modal" data-tab="existing-card">
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
                                <button><span>Edit</span></button>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
                <div class="radiobutton-tabs__tab-content" data-tab="new-card">

                    <!-- copied from sign up, oh god... I forgot about the iframes -->
                    <div class="signup-card-body">
                        A new card!
                        <div>
                            <span id="cc_cardholder_first_name"></span>
                            <span id="cc_cardholder_last_name"></span>
                        </div>
                        <div>
                            <div id="cc_number"></div>
                        </div>
                        <div>
                            <span id="cc_month"></span>
                            <span id="cc_year"></span>
                            <span id="cc_cvv"></span>
                        </div>
                    </div>
                </div>
            </div>
            <!-- .radiobutton-tab-container__notcss -->

            <input type="hidden" name="plan" value="" />
            <input type="hidden" name="nonce" id="hidden-nonce-input" required />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />
        </div>
        <div class="add-subscription-button-wrapper">
            <button type="submit" class="pill-button yellow" disabled>Update billing cycle</button>
        </div>
    </form>
</div>