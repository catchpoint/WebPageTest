<div class="card subscribe">
  <div class="card-section">
    <div class="info">
      <p>The WebPageTest API gives full access to the power and depth of WebPageTest's analysis, letting you pull performance data into your existing workflows and processes.</p>
    </div>
  </div>
</div>
<form id="wpt-account-signup" method="post" action="/account">
  <fieldset class="wpt-plans">
    <legend class="sr-only">Choose a Plan</legend>
    <input id="annual-plans" type="radio" name="plan-type" value="annual" checked />
    <input id="monthly-plans" type="radio" name="plan-type" value="monthly" />
    <div class="radiobutton-group">
      <label for="annual-plans">Annual Plans</label>
      <label for="monthly-plans">Monthly Plans</label>
    </div>
    <div class="wpt-plan-set annual-plans">
      <?php foreach($annual_plans as $plan):
$plan_block = <<<HTML
      <div class="form-wrapper-radio">
        <input type="radio" id="annual-{$plan['id']}" name="plan" value="{$plan['id']}" required />
        <label class="wpt-plan card" for="annual-{$plan['id']}">
          <h5>{$plan['name']}</h5>
          <div><strong>\${$plan['monthly_price']}</strong>/Month</div>
          <span aria-hidden="true" class="select-indicator">Select</span>
        </label>
      </div>
HTML;
echo $plan_block;
    endforeach; ?>
    </div>
    <div class="wpt-plan-set monthly-plans">
      <?php foreach($monthly_plans as $plan):
$plan_block = <<<HTML
      <div class="form-wrapper-radio">
        <input type="radio" id="monthly-{$plan['id']}" name="plan" value="{$plan['id']}" required />
        <label class="card wpt-plan" for="monthly-{$plan['id']}">
          <h5>{$plan['name']}</h5>
          <div><strong>\${$plan['price']}</strong>/Month</div>
          <span aria-hidden="true" class="select-indicator">Select</span>
        </label>
      </div>
HTML;
echo $plan_block;
    endforeach; ?>
    </div>
  </fieldset>
  <div class="card">
    <div>Looking to run more than 20,000 tests in a month?</div>
    <div><a href="#">Contact Us</a></div>
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
            <?php foreach($country_list as $country): ?>
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
      <h3>All Plans Include</h3>
      <ul>
        <li>Access to real browsers in real locations with the latest OS versions.</li>
        <li>Test on real connection speeds.</li>
        <li>Run page level and user journey tests including custom scripts.</li>
        <li>Access to test history for 13 months.</li>
        <li>Access to API integrations (Github Action, NodeJS wrapper, Slackbot and community-built integrations)</li>
        <li>Access to support and expert documentation.&nbsp;<a href="https://docs.webpagetest.org/api" target="_blank" rel="noopener">Learn More</a>.</li>
      </ul>
      <div>To learn more about <b>Custom Enterprise Plan</b>, please&nbsp;<a href="https://www.product.webpagetest.org/contact" target="_blank" rel="noopener noreferrer">Contact Us</a>.</div>
    </div> <!-- /.plan-details-container -->
  </div> <!-- /.plan-billing-container -->

  <input type="hidden" name="nonce" id="hidden-nonce-input" required />
  <input type="hidden" name="type" value="account-signup" required />
  <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />

  <div class="add-subscription-button-wrapper">
    <button type="submit">Add Subscription</button>
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

      form.addEventListener('submit', function (event) {
        event.preventDefault();

        dropinInstance.requestPaymentMethod(function (err, payload) {
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
