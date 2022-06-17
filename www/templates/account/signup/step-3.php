<section class="payment-details">
    <div class="content">
        <h1>Payment Details</h1>
        <form method="POST" action="/signup" id="wpt-signup-paid-account">
<?php if ($use_chargify): ?>
<h4>Payment</h4>
<div>
    <div>
        <div id="cc_number"></div>
    </div>
    <div>
        <span id="cc_month"></span>
        <span id="cc_year"></span>
        <span id="cc_cvv"></span>
    </div>
</div>
<h4>Billing Address</h4>
<div>
    <div class="form-input address">
        <label for="street-address">Street Address</label>
        <div>
            <input name="street-address" type="text" value="<?= $street_address ?>" data-chargify="address" required />
        </div>
    </div>
    <div class="form-input city">
        <label for="city">City</label>
        <input name="city" type="text" value="<?= $city ?>" data-chargify="city" required />
    </div>
    <div class="form-input state">
        <label for="state">State</label>
        <div id="regionalArea">
            <select name="state" data-chargify="state" required>
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
        <select name="country" data-chargify="country" required>
            <?php foreach ($country_list as $country) : ?>
                <option value="<?= $country["code"] ?>" <?php ($country["code"] === "US") ? 'selected' : '' ?>>
                    <?= $country["name"]; ?>
                </option>
            <?php endforeach; ?>
        </select>
    </div>
    <div class="form-input zip">
        <label for="zipcode">Postal Code</label>
        <div>
            <input type="text" name="zipcode" value="<?= $zipcode ?>" required data-chargify="zip" />
        </div>
    </div>
</div>
<?php else: ?>
            <div class="braintree-card-container">
                <div id="braintree-container"></div>
            </div> <!-- /.braintree-card-container -->
            <div class="billing-address-information-container">
                <div class="form-input address">
                    <label for="street-address">Street Address</label>
                    <div>
                        <input name="street-address" type="text" value="<?= $street_address ?>" required />
                    </div>
                </div>
                <div class="form-input city">
                    <label for="city">City</label>
                    <input name="city" type="text" value="<?= $city ?>" required />
                </div>
                <div class="form-input state">
                    <label for="state">State</label>
                    <div id="regionalArea">
                        <select name="state" required>
                            <?php

                            foreach ($state_list as $stateAbbr => $stateText) : ?>
                                <option value="<?= $stateAbbr ?>">
                                                                <?= $stateText; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                <div class="form-input country">
                    <label for="country">Country</label>
                    <select name="country">
                        <?php foreach ($country_list as $country) : ?>
                            <option value="<?= $country["key"] ?>" <?php ($country["key"] === "United States") ? 'selected' : '' ?>>
                                <?= $country["text"]; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-input zip">
                    <label for="zipcode">Postal Code</label>
                    <div>
                        <input type="text" name="zipcode" value="<?= $zipcode ?>" required />
                    </div>
                </div>
            </div> <!-- /.billing-address-information-container -->
<?php endif; ?>
            <input type="hidden" id="hidden-nonce-input" name="nonce" />

<?php if($use_chargify): ?>
            <input type="hidden" name="first-name" data-chargify="firstName" value="<?= $first_name ?>" />
            <input type="hidden" name="last-name" data-chargify="lastName" value="<?= $last_name ?>" />
<?php else: ?>
            <input type="hidden" name="first-name" value="<?= $first_name ?>" />
            <input type="hidden" name="last-name" value="<?= $last_name ?>" />
<?php endif; ?>
            <input type="hidden" name="email" value="<?= $email ?>" />
            <input type="hidden" name="company" value="<?= $company_name ?>" />
            <input type="hidden" name="password" value="<?= $password ?>" />
            <input type="hidden" name="plan" value="<?= $plan ?>" />
            <input type="hidden" name="step" value="3" />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />

            <div class="form-input">
                <button type="submit">Sign Up</button>
            </div>

            <p class="disclaimer">By signing up I agree to WebPageTest's <a href="/terms.php" target="_blank" rel="noopener">Terms of Service</a> and <a href="https://www.catchpoint.com/trust#privacy" target="_blank" rel="noopener">Privacy Statement</a>.</p>
        </form>
    </div><!-- /.content -->
</section>
<aside>
    <h3>Selected Plan</h3>
    <div class="plan-name">
        <?= $is_plan_free ? "STARTER" : '<div class="heading wpt-pro-logo"> <span class="visually-hidden">WebPageTest <em class="new-banner">Pro</em></span></div>' ?>
    </div>
    <div class="plan-details">
        <table>
            <?php if (!$is_plan_free) : ?>
            <tr>
                <th>Pay Plan:</th>
                <td><?= $billing_frequency ?></td>
            </tr>
            <?php endif; ?>
            <tr>
                <th>Runs/mo:</th>
                <td><?= $runs ? $runs : 300; ?></td>                
            </tr>
            <tr>
                <th>Price:</th>
                <?php if ($is_plan_free) : ?>
                    <td>Free</td>
                <?php else : ?>
                    <?php if ($billing_frequency == "Monthly") : ?>
                        <td>$<?= "{$monthly_price}/mo" ?></td>
                    <?php else : ?>
                        <td><s>$<?= $other_annual ?></s> $<?= "{$annual_price}/yr" ?></td>
                    <?php endif; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div> <!-- /.plan-details -->
    <div class="plan-benefits">
        <h4>Plan Benefits</h4>
        <?php if ($is_plan_free) : ?>
            <ul>
                <li>Access to real browsers in real locations around the world, always running the latest versions.</li>
                <li>Testing on real connection speeds with gold-standard, accurate throttling.</li>
                <li>Custom scripting to let you interact with the page or script user journey flows.</li>
                <li>Access to test history for 13 months to allow for easy comparisons and over time.</li>
                <li>Opportunities report [NEW] to help you zero in on ways to improve the overall effectiveness of your websites.</li>
            </ul>
        <?php else : ?>
            <ul>
                <li>Everything in the Starter plan, including real browsers in real locations, custom scripting for page level and user journey measurements, access to 13 months of test history, and the all new Opportunities report to help you zero in on areas of improvement. </li>
                <li>Access to all new no-code Experiments </li>
                <li>API access for easier integration into your CI/CD, visualizations, alerting and more </li>
                <li>High priority tests to help you jump the queue and experience lower wait times </li>
                <li>Access to new and exclusive, premium-only, test locations </li>
                <li>Dedicated support to help you get back to work faster </li>
                <li>Bulk testing to enable testing of many pages at once </li>
                <li>Private tests for ensuring your private test results stay that way</li>
            </ul>
        <?php endif; ?>
    </div> <!-- /.plan-benefits -->
</aside>

<script src="https://js.chargify.com/latest/chargify.js"></script>
<script>
        var chargify = new Chargify();

chargify.load({
    publicKey: "<?= $ch_client_token ?>",
    type: 'card',
    serverHost: "<?= $ch_site ?>", //'https://acme.chargify.com'
    hideCardImage: false,
    optionalLabel: ' ',
    requiredLabel: '*',
    addressDropdowns: true,
    style: {
        input: {
            fontSize: '1rem',
            border: '1px solid #ced4da',
            padding: '.375rem 0.75rem',
            lineHeight: '1.5'
        },
        label: {
            backgroundColor: 'transparent',
            paddingTop: '0px',
            paddingBottom: '1px',
            fontSize: '16px',
            fontWeight: '400'
        }
    },
    fields: {
            number: {
                selector: '#cc_number',
                label: 'Card Number',
                placeholder: 'Card Number',
                message: 'Invalid Card',
                required: true,
                style: {
                  input: {
                    padding: '8px 48px'
                  }
                }
            },
            month: {
                selector: '#cc_month',
                label: '',
                placeholder: 'MM',
                message: 'Invalid Month',
                required: true
            },
            year: {
                selector: '#cc_year',
                label: '',
                placeholder: 'YYYY',
                message: 'Invalid Year',
                required: true
            },
            cvv: {
                selector: '#cc_cvv',
                label: 'CVC',
                placeholder: 'CVC',
                required: false,
                message: 'Invalid CVC',
                required: true
            }
        }
});

        var hiddenNonceInput = document.querySelector('#hidden-nonce-input');
        var form = document.querySelector("#wpt-signup-paid-account");

        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var button = event.target.querySelector('button[type=submit]');
          button.disabled = true;
          button.setAttribute('disabled', 'disabled');
          button.innerText = 'Submitted';

          chargify.token(
              form,
              function success(token) {
                  hiddenNonceInput.value = token;
                  form.submit();
              },
              function error(err) {
                  button.disabled = false;
                  button.removeAttribute('disabled');
                  button.innerText = 'Sign Up';
                  console.log('token ERROR - err: ', err);
              }
          );
        });
</script>
