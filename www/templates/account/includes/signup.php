<div class="card subscribe">
    <div class="card-section">
        <div class="info">
            <p style="line-height: 1.5">WebPageTest Pro plans bring full access to the power and depth of WebPageTest's analysis, letting you pull performance data into your existing workflows and processes. It also includes access to No-Code Experiments, the WebPageTest API, bulk testing, and more!</p>
            <h3>Plan Features Comparison</h3>
            <img style="max-width: 100%" src="/images/plans-breakdown.png" alt="Pro Plan table breakdown: temporarily an image as we work through launch day hiccups. major apologies! fix coming.">
        </div>
    </div>
</div>
<form id="wpt-account-signup" method="post" action="/account">
    <h3>Save 20% by paying annually!</h3>
    <fieldset class="wpt-plans radiobutton-tab-container">
        <legend for="pro-plan-selector" class="visually-hidden"> Choose payment plan frequency:</legend>
        <input id="annual-plans" type="radio" name="plans" value="annual" checked />
        <input id="monthly-plans" type="radio" name="plans" value="monthly" />
        <div class="radiobutton-group subscription-type-selector" id="pro-plan-selector">
            <div class="radio-button">
                <label for="annual-plans">Annual</label>
            </div>
            <div class="radio-button">
                <label for="monthly-plans">Monthly</label>
            </div>
        </div>
        <div class="wpt-plan-set annual-plans">
            <?php foreach ($annual_plans as $plan) :
                $plan_block = <<<HTML
      <div class="form-wrapper-radio">
        <input type="radio" id="annual-{$plan['id']}" name="plan" value="{$plan['id']}" required />
        <label class="wpt-plan card" for="annual-{$plan['id']}">
          <h5>{$plan['name']}</h5>
          <div><strong>\${$plan['annual_price']}</strong>/Year</div>
          <span aria-hidden="true" class="pill-button yellow">Select</span>
        </label>
      </div>
HTML;
                echo $plan_block;
            endforeach; ?>
        </div>
        <div class="wpt-plan-set monthly-plans">
            <?php foreach ($monthly_plans as $plan) :
                $plan_block = <<<HTML
      <div class="form-wrapper-radio">
        <input type="radio" id="monthly-{$plan['id']}" name="plan" value="{$plan['id']}" required />
        <label class="card wpt-plan" for="monthly-{$plan['id']}">
          <h5>{$plan['name']}</h5>
          <div><strong>\${$plan['price']}</strong>/Month</div>
          <span aria-hidden="true" class="pill-button yellow">Select</span>
        </label>
      </div>
HTML;
                echo $plan_block;
            endforeach; ?>
        </div>
    </fieldset>
    <div class="card">
        <div>Looking to run more than 20,000 tests in a month?</div>
        <div><a href=" https://www.product.webpagetest.org/contact">Contact Us</a></div>
    </div>
    <div class="plan-billing-container">
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

        <div class="card plan-details-container">
            <h3>WebPageTest Pro plans include</h3>
            <ul>
                <li>Everything in the Starter plan, including real browsers in real locations, custom scripting for page level and user journey measurements, access to 13 months of test history, and the all new Opportunities report to help you zero in on areas of improvement. </li>
                <li>Access to all new no-code Experiments</li>
                <li>API access for easier integration into your CI/CD, visualizations, alerting and more </li>
                <li>High priority tests to help you jump the queue and experience lower wait times </li>
                <li>Access to new and exclusive, premium-only, test locations </li>
                <li>Dedicated support to help you get back to work faster </li>
                <li>Bulk testing to enable testing of many pages at once </li>
                <li>Private tests for ensuring your private test results stay that way</li>
            </ul>
        </div> <!-- /.plan-details-container -->
    </div> <!-- /.plan-billing-container -->

    <input type="hidden" name="nonce" id="hidden-nonce-input" required />
    <input type="hidden" name="type" value="account-signup" required />
    <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />

    <div class="add-subscription-button-wrapper">
        <button type="submit" class="pill-button blue">Add Subscription</button>
    </div>
</form>

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