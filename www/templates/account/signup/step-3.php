<section class="payment-details">
    <div class="content">
        <h1>Payment Details</h1>
        <form method="POST" action="/signup" id="wpt-signup-paid-account">
            <div id="notification-banner-container"></div>
            <?php include __DIR__ . '/../includes/chargify-payment-form.php'; ?>
            <input name="street-address" type="hidden" value="<?= $street_address ?>" data-chargify="address" required />
            <input name="city" type="hidden" value="<?= $city ?>" data-chargify="city" required />
            <input name="state" type="hidden" value="<?= $state_code ?>" data-chargify="state" required />
            <input name="country" type="hidden" value="<?= $country_code ?>" data-chargify="country" required />
            <input name="zipcode" type="hidden" value="<?= $zipcode ?>" required data-chargify="zip" />
            <input type="hidden" name="first-name" value="<?= $first_name ?>" />
            <input type="hidden" name="last-name" value="<?= $last_name ?>" />
            <input type="hidden" id="hidden-nonce-input" name="nonce" />
            <input type="hidden" name="email" value="<?= $email ?>" />
            <input type="hidden" name="company-name" value="<?= $company_name ?>" />
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

<?php require_once __DIR__ . '/includes/sidebar.php'; ?>


<script src="/assets/js/braintree-error-parser.js"></script>

<script>
(() => {
    let hiddenNonceInput = document.querySelector('#hidden-nonce-input');
    const form = document.querySelector("#wpt-signup-paid-account");

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      let button = event.target.querySelector('button[type=submit]');
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
