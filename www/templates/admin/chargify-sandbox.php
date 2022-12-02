<style>
label,
input {
  display: block;
}

select,
input[type="text"] {
  border: 1px solid black;
}
</style>
<div class="my-account-page page_content">

  <h1>Chargify Sandbox</h1>

  <section class="payment-details">
      <div class="content">
          <h1>Payment Details</h1>
          <form method="POST" action="/" id="sandbox">
              <div id="notification-banner-container"></div>
              <?php require_once __DIR__ . '/../account/includes/chargify-payment-form.php'; ?>
              <div class="form-input address">
                  <label for="street-address">Address</label>
                  <input name="street-address" type="text" data-chargify="address" required />
              </div>
              <div class="form-input city">
                  <label for="city">City</label>
                  <input name="city" type="text" data-chargify="city" required />
              </div>
              <div class="form-input state">
                  <label for="state">State</label>

                  <select name="state" data-country-selector="state-selector" data-chargify="state" required>
                      <?php foreach ($state_list as $state) : ?>
                          <option value="<?= $state['code'] ?>">
                              <?= $state['name']; ?>
                          </option>
                      <?php endforeach; ?>
                  </select>

              </div>
              <div class="form-input country">
                  <label for="country">Country</label>
                  <select name="country" data-country-selector="selector" data-chargify="country" required>
                      <?php foreach ($country_list as $country) : ?>
                          <option value="<?= $country["code"] ?>" <?php ($country["code"] === "US") ? 'selected' : '' ?>>
                              <?= $country["name"]; ?>
                          </option>
                      <?php endforeach; ?>
                  </select>
              </div>
              <div class="form-input zip">
                  <label for="zipcode">Postal Code</label>
                  <input name="zipcode" type="text" required data-chargify="zip" />
              </div>
              <div class="form-input plan">
                  <label for="plan">Plan</label>
                  <input type="text" name="plan" value="ap1" />
              </div>

              <div class="form-input">
                  <button type="submit">Get Token</button>
              </div>


              <h3>Token:</h3>
              <div id="hidden-nonce-input"></div>
          </form>
      </div><!-- /.content -->
  </section>


  <script src="/assets/js/braintree-error-parser.js"></script>

  <script>
  (() => {
      let hiddenNonceInput = document.querySelector('#hidden-nonce-input');
      const form = document.querySelector("#sandbox");

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        let button = event.target.querySelector('button[type=submit]');
        button.disabled = true;
        button.setAttribute('disabled', 'disabled');
        button.innerText = 'Submitted';

        chargify.token(
            form,
            function success(token) {
                hiddenNonceInput.innerHTML = token;
                button.disabled = false;
                button.removeAttribute('disabled');
                button.innerText = 'Get Token';
            },
            function error(err) {
                button.disabled = false;
                button.removeAttribute('disabled');
                button.innerText = 'Get Token';
                const signupError = new CustomEvent("cc-signup-error", {
                  bubbles: true,
                  detail: BraintreeErrorParser.parse(err.errors)
                });
                event.target.dispatchEvent(signupError);
            }
        );
      });
  })();
  </script>
  <script>
      (() => {
          document.addEventListener('cc-signup-error', e => {
              const el = document.createElement('div');
              el.classList.add('notification-banner', 'notification-banner__error');
              el.innerHTML = `<h4>Billing Error: ${e.detail.text}</h4><p>${e.detail.implication}</p>`;
              document.querySelector('#notification-banner-container').appendChild(el);

          });
      })();
  </script>
</div>
