<div class="my-account-page page_content">

    <div class="box card-section">
        <h2>Plan Summary</h2>
        <div class="card-section-subhed">
            Pro
        </div>
        <ul>
            <li><strong>Runs per month:</strong> 50</li>
            <li><strong>Billing Cycle:</strong></li>
            <li><strong>Price:</strong> /li>
            <li><strong>Plan Renewal:</strong> </li>
        </ul>
    </div>

    <form id="wpt-account-upgrade" method="post" action="/account">
        <input type='hidden' name='type' value='upgrade-plan-2' />
        <div class="box card-section">
            <h2>Payment Method</h2>
            <?php if ($is_paid) : ?>
                <fieldset class="radiobutton-tab-container">
                    <legend for="payment-selection" class="visually-hidden"> Choose payment method:</legend>
                    <label for="existing-card">
                        <input id="existing-card" type="radio" name="payment" value="existing-card" checked />
                        Existing payment method
                    </label>
                    <label for="new-card">
                        <input id="new-card" type="radio" name="payment" value="new-card" />
                        New payment method
                    </label>
                </fieldset>


                <div class="card payment-info tab-content" data-modal="payment-info-modal">
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
            <?php endif; ?>
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
                        <div class="info-container state">
                            <label for="state">State</label>
                            <div>
                                <input name="state" type="text" required />
                            </div>
                        </div>
                        <div class="info-container country">
                            <label for="country">Country</label>
                            <div>
                                <select name="country">
                                    <?php foreach ($country_list as $country) : ?>
                                        <option value="<?= $country["key"] ?>"><?= $country["text"]; ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
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
            <input type="hidden" name="plan" value="<?= $plan; ?>" />
            <input type="hidden" name="nonce" id="hidden-nonce-input" required />
            <input type="hidden" name="type" value="account-signup" required />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />

            <div class="add-subscription-button-wrapper">
                <button type="submit" class="pill-button blue">Upgrade Plan</button>
            </div>
        </div>
    </form>
</div>

<script src="https://js.braintreegateway.com/web/3.85.2/js/client.min.js"></script>
<script src="https://js.braintreegateway.com/web/dropin/1.33.0/js/dropin.min.js"></script>

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