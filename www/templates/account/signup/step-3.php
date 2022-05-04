<div>
<form method="POST" action="/signup" id="wpt-signup-paid-account">
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
  </div> <!-- /.plan-billing-container -->
  <input type="hidden" id="hidden-nonce-input" name="nonce" />
  <input type="hidden" name="first-name" value="<?= $first_name ?>" />
  <input type="hidden" name="last-name" value="<?= $last_name ?>" />
  <input type="hidden" name="email" value="<?= $email ?>" />
  <input type="hidden" name="company" value="<?= $company_name ?>" />
  <input type="hidden" name="password" value="<?= $password ?>" />
  <input type="hidden" name="plan" value="<?= $plan ?>" />
  <input type="hidden" name="step" value="3" />
  <button type="submit">Sign Up</button>
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
      var form = document.querySelector("#wpt-signup-paid-account");

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
