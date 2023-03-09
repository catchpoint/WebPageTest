<div class="my-account-page page_content">
    <div class="subhed">
        <ul class="breadcrumbs">
            <li><a href="/account">Account Settings</a></li>
            <li>Edit Billing Information</li>
        </ul>
        <div class="contact-support-button">
          <a href="<?= $support_link ?>"><span>Contact Support</span></a>
        </div>
    </div>
    <h1>Edit Billing Information</h1>
    <div id="notification-banner-container"></div>
    <form action="/account" method="post" id="wpt-update-payment-method">
        <div class="plan-billing-container card box">
            <div class="billing-container">
                <h3>Payment Method</h3>
                <input name="street-address" type="hidden" value="<?= $street_address ?>" data-chargify="address" required />
                <input name="city" type="hidden" value="<?= $city ?>" data-chargify="city" required />
                <input name="state" type="hidden" data-chargify="state" value="<?= $state ?>" required />
                <input name="country" type="hidden" value="<?= $country ?>" data-chargify="country" required>
                <input name="zipcode" type="hidden" value="<?= $zipcode ?>" data-chargify="zip" required />
                <input name="type" type="hidden" value="update-payment-method" />
                <input type="hidden" id="hidden-nonce-input" name="nonce" />
                <?php require_once __DIR__ . '/../includes/chargify-payment-form.php'; ?>
            </div>
        </div>
<?php if (!$is_canceled) : ?>
        <div class="box">
            <h3>Estimated Monthly Payment</h3>
            <ul class="plan-summary-list">
                <li><strong>Subtotal</strong> $<?= $subtotal ?></li>
                <li><strong>Estimated Taxes</strong> $<?= $tax ?></li>
                <li>
                    <strong>Due today:</strong> $0.00
                    <br>
                    <strong>Due at the next billing date<?= isset($renewaldate) && !empty($renewaldate) ? ' (' . $renewaldate . ')' : '' ?>:</strong> $<?= $total ?>
                </li>
            </ul>
            <div class="info-notice">Updating your account's billing address can result in new tax fees.</div>
        </div>
<?php endif; ?>
        <button class="yellow pill-button" type="submit">Update Billing Information</button>
    </form>

    <script src="/assets/js/braintree-error-parser.js"></script>

    <script>
    (() => {
        let hiddenNonceInput = document.querySelector('#hidden-nonce-input');
        const form = document.querySelector("#wpt-update-payment-method");

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
                  button.innerText = 'Update Billing Information';
                  const signupError = new CustomEvent("cc-update-payment-error", {
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
            document.addEventListener('cc-update-payment-error', e => {
                const el = document.createElement('div');
                el.classList.add('notification-banner', 'notification-banner__error');
                el.innerHTML = `<h4>Billing Error: ${e.detail.text}</h4><p>${e.detail.implication}</p>`;
                document.querySelector('#notification-banner-container').appendChild(el);

            });
        })();
    </script>
</div>
