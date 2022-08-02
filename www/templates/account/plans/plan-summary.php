<div class="my-account-page page_content">
    <ul class="breadcrumbs">
        <li><a href="/account">Account Settings</a></li>
        <li><a href="/account/update_plan">Update Plan</a></li>
        <li>Plan summary</li>
    </ul>
    <div class="subhed">
        <h1>Purchase Summary</h1>
        <?php if ($is_paid) : ?>
            <div class="contact-support-button">
                <a href="https://support.webpagetest.org"><span>Contact Support</span></a>
            </div>
        <?php endif; ?>
    </div>
    <!-- Address form -->
    <form id="plan-summary-address-form">
        <div class="box card-section">
            <h3>Billing Address</h3>
            <div class="plan-billing-container tab-content">
                <div class="card billing-container">
                    <div id="braintree-container"></div>
                    <div class="billing-info-section">
                        <div class="info-container street-address">
                            <label for="street-address">Street Address</label>
                            <div>
                                <input name="street-address" type="text" required />
                            </div>
                        </div>
                        <div class="info-container city">
                            <label for="city">City</label>
                            <div>
                                <input name="city" type="text" required />
                            </div>
                        </div>
                        <div class="form-input state">
                            <label for="state">State</label>
                            <div>
                                <select name="state" data-country-selector="state-selector" required>
                                    <?php foreach ($state_list as $state) : ?>
                                        <option value="<?= $state['code'] ?>">
                                            <?= $state['name']; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="form-input country">
                            <label for="country">Country</label>
                            <select name="country" data-country-selector="selector" required>
                                <?php foreach ($country_list as $country) : ?>
                                    <option value="<?= $country["code"] ?>" <?php ($country["code"] === "US") ? 'selected' : '' ?>>
                                        <?= $country["name"]; ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="info-container zipcode">
                            <label for="zipcode">Zip Code</label>
                            <div>
                                <input type="text" name="zipcode" required />
                            </div>
                        </div>
                    </div> <!-- /.billing-info-section -->
                </div> <!-- /.billing-container -->
            </div> <!-- /.plan-billing-container -->
            <div class="add-subscription-button-wrapper">
                <button type="submit" class="pill-button yellow">Add Billing Address</button>
            </div>

        </div>
    </form>
    <!-- main form -->
    <form id="wpt-account-upgrade" method="post" action="/account">
        <input type='hidden' name='type' value='upgrade-plan-2' />
        <!--
            Add address inputs
                                    -->
        <input name="street-address" type="hidden" value="<?= $street_address ?>" data-chargify="address" required />
        <input name="city" type="hidden" value="<?= $city ?>" data-chargify="city" required />
        <input name="state" type="hidden" value="<?= $state_code ?>" data-chargify="state" required />
        <input name="country" type="hidden" value="<?= $country_code ?>" data-chargify="country" required />
        <input name="zipcode" type="hidden" value="<?= $zipcode ?>" required data-chargify="zip" />

        <!-- payment -->
        <div class="box card-section">
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

            <input type="hidden" name="plan" value="<?= $plan->getId() ?>" />
            <input type="hidden" name="nonce" id="hidden-nonce-input" required />
            <input type="hidden" name="type" value="account-signup" required />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />
        </div>

        <div class="box card-section">
            <h2>Selected Plan</h2>
            <div class="card-section-subhed">
                Pro <?= $plan->getBillingFrequency() == 1 ? 'Monthly' : 'Annual'; ?>
            </div>
            <ul class="plan-summary-list" id="plan-summary">
                <li><strong>Runs per month:</strong> <?= $plan->getName() ?></li>
<?php if($plan->getBillingFrequency() == 'Monthly'): ?>
                <li><strong>Monthly Price:</strong> $<?= $plan->getMonthlyPrice() ?></li>
<?php else: ?>
                <li><strong>Yearly Price:</strong> $<?= $plan->getAnnualPrice() ?></li>
<?php endif; ?>
                <li><strong>Estimated Taxes:</strong> <span data-id="taxes">--</span> </li>
                <li class="plan-summary-list__total"><strong>Total including tax:</strong> <span data-id="total">--</span></li>
            </ul>
        </div>

        <div class="add-subscription-button-wrapper">
            <button type="submit" class="pill-button yellow" disabled>Upgrade Plan</button>
        </div>
    </form>
</div>


<script src="/js/country-list/country-list.js"></script>
<script>
    (() => {
        const countryList = <?= $country_list_json_blob ?>;
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                const countrySelectorEl = document.querySelector("[data-country-selector=selector]");
                const divisionSelectorEl = document.querySelector("[data-country-selector=state-selector]");

                new CountrySelector(countrySelectorEl, divisionSelectorEl, countryList);
            });
        } else {
            const countrySelectorEl = document.querySelector("[data-country-selector=selector]");
            const divisionSelectorEl = document.querySelector("[data-country-selector=state-selector]");

            new CountrySelector(countrySelectorEl, divisionSelectorEl, countryList);
        }
    })();
</script>

<script src="https://js.braintreegateway.com/web/3.85.2/js/client.min.js"></script>
<script src="https://js.braintreegateway.com/web/dropin/1.33.0/js/dropin.min.js"></script>
<script defer src="/js/estimate-taxes.js?v=asas<?= constant('VER_JS_ACCOUNT') ?>"></script>
<script>
    braintree.dropin.create({
        authorization: "<?= $bt_client_token ?>",
        container: '#braintree-container',
        card: {
            cardholderName: {
                required: true
            }
        }
    }, (error, dropinInstance) => {
        var hiddenNonceInput = document.querySelector('#hidden-nonce-input');
        var form = document.querySelector("#wpt-account-signup");

        form.addEventListener('submit', function(event) {
            event.preventDefault();

            dropinInstance.requestPaymentMethod(function(err, payload) {
                if (err) {
                    // handle error
                    console.error(err);
                    return;
                }

                hiddenNonceInput.value = payload.nonce;
                form.submit();
            });
        });
    });
</script>