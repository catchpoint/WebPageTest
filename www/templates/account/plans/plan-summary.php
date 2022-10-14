<div class="my-account-page page_content">
    <?php require_once __DIR__ . '/includes/breadcrumbs.php'; ?>
    <?php require_once __DIR__ . '/includes/subhed.php'; ?>
    <?php require_once __DIR__ . '/includes/billing-address-form.php'; ?>
    <!-- main form -->
    <form id="wpt-account-upgrade" method="post" action="/account">
        <!-- payment -->
        <div class="box card-section">
            <div class="contents-container">
              <h3>Payment Method</h3>
                <?php require_once __DIR__ . '/../includes/chargify-payment-form.php' ?>
                <input type="hidden" name="plan" value="<?= $plan->getId() ?>" />
                <input type="hidden" name="nonce" id="hidden-nonce-input" required />
                <input type="hidden" name="type" value="account-signup" required />
                <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />
                <input name="street-address" type="hidden" value="<?= $street_address ?>" data-chargify="address" required />
                <input name="city" type="hidden" value="<?= $city ?>" data-chargify="city" required />
                <input name="state" type="hidden" value="<?= $state_code ?>" data-chargify="state" required />
                <input name="country" type="hidden" value="<?= $country_code ?>" data-chargify="country" required />
                <input name="zipcode" type="hidden" value="<?= $zipcode ?>" required data-chargify="zip" />
            </div>

        </div>

        <div class="box card-section">
            <h2>Selected Plan</h2>
            <div class="card-section-subhed">
                Pro <?= $plan->getBillingFrequency() ?>
            </div>
            <ul class="plan-summary-list" id="plan-summary">
                <li><strong>Runs per month:</strong> <?= $plan->getRuns() ?></li>
                <?php if ($plan->getBillingFrequency() == 'Monthly') : ?>
                    <li><strong>Monthly Price:</strong> $<?= $plan->getMonthlyPrice() ?></li>
                <?php else : ?>
                    <li><strong>Yearly Price:</strong> $<?= $plan->getAnnualPrice() ?></li>
                <?php endif; ?>
                <li><strong>Estimated Taxes:</strong> <span data-id="taxes">--</span> </li>
                <li class="plan-summary-list__total"><strong>Total including tax:</strong> <span data-id="total">--</span></li>
            </ul>
        </div>

        <div class="add-subscription-button-wrapper">
            <button type="submit" class="pill-button yellow" disabled>Upgrade Plan</button>
        </div>
    </form>
</div>


<script>
    var hiddenNonceInput = document.querySelector('#hidden-nonce-input');
    var form = document.querySelector("#wpt-account-upgrade");

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        // did they even add an address?
        var getAddressForm = document.getElementById('plan-summary-address-form');
        if (getAddressForm.checkValidity() == false) {
            getAddressForm.querySelector('button[type=submit]').click(); // this should trigger the html5 validation
        }
        var button = event.target.querySelector('button[type=submit]');
        button.disabled = true;
        button.setAttribute('disabled', 'disabled');
        button.innerText = 'Submitted';

        window.chargify.token(
            form,
            function success(token) {
                hiddenNonceInput.value = token;
                form.submit();
            },
            function error(err) {
                button.disabled = false;
                button.removeAttribute('disabled');
                button.innerText = 'Upgrade Plan';
                console.log('token ERROR - err: ', err);
            }
        );
    });
</script>

<script>
    (() => {
        document.addEventListener('taxes-updated', e => {
            // update values for chargify form
            const data = Object.fromEntries(e.detail);
            const form = document.querySelector("#wpt-account-upgrade");
            const cityInput = form.querySelector('input[name=city]');
            cityInput.value = data.city;
            const countryInput = form.querySelector('input[name=country]');
            countryInput.value = data.country;
            const stateInput = form.querySelector('input[name=state]');
            stateInput.value = data.state;
            const streetAddressInput = form.querySelector('input[name=street-address]');
            streetAddressInput.value = data['street-address'];
            const zipInput = form.querySelector('input[name=zipcode]');
            zipInput.value = data['zipcode'];
            const submitButton = form.querySelector('button[type=submit]');
            submitButton.disabled = false;
            submitButton.removeAttribute('disabled');
        });
    })();
</script>