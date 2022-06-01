<section class="payment-details">
  <div class="content">
    <h1>Payment Details</h1>
    <form method="POST" action="/signup" id="wpt-signup-paid-account">
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
          <input name="state" type="text" value="<?= $state ?>" required />
        </div>
        <div class="form-input country">
          <label for="country">Country</label>
          <select name="country">
          <?php foreach($country_list as $country): ?>
          <option value="<?= $country["key"] ?>"><?= $country["text"]; ?></option>
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

      <input type="hidden" id="hidden-nonce-input" name="nonce" />
      <input type="hidden" name="first-name" value="<?= $first_name ?>" />
      <input type="hidden" name="last-name" value="<?= $last_name ?>" />
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
  <div class="plan-name"><?= $is_plan_free ? "Free" : "Pro"; ?></div>
  <div class="plan-details">
    <table>
      <thead>
        <?php if (!$is_plan_free) : ?>
        <th>Runs per month</th>
        <?php endif; ?>
        <th>Price</th>
      </thead>
            <tbody>
                <tr>
                    <?php if ($is_plan_free) : ?>
                        <td>Free</td>
                    <?php else : ?>
                        <td><?= $runs ?></td>
                        <?php if ($billing_frequency == "Monthly") : ?>
                        <td>$<?= "{$monthly_price} {$billing_frequency}" ?></td>
                        <?php else : ?>
                        <td><s>$<?= $other_annual ?></s> $<?= "{$annual_price} {$billing_frequency}" ?></td>
                        <?php endif; ?>
                    <?php endif; ?>
                </tr>
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
      var form = document.querySelector("#wpt-signup-paid-account");

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var button = event.target.querySelector('button[type=submit]');
        button.disabled = true;
        button.setAttribute('disabled', 'disabled');
        button.innerText = 'Submitted';

        dropinInstance.requestPaymentMethod(function (err, payload) {
          if (err) {
            // handle error
            button.disabled = false;
            button.removeAttribute('disabled');
            button.innerText = 'Sign Up';
            console.error(err);
            return;
          }

          hiddenNonceInput.value = payload.nonce;
          form.submit();
        });
      });
    });
</script>
