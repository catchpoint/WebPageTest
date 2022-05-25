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
        <th>Runs per month</th>
        <th>Price</th>
      </thead>
            <tbody>
                <tr>
                    <?php if ($is_plan_free) : ?>
                        <td>300</td>
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
    <ul>
      <li>Access to real browsers in real locations with the latest OS versions.</li>
      <li>Test on real connection speeds.</li>
      <li>Run page level and user journey tests including custom scripts.</li>
      <li>Access to test history for 13 months.</li>
    </ul>
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
