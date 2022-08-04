<div class="my-account-page page_content">
    <?php include_once __DIR__ . '/includes/breadcrumbs.php'; ?>
    <?php include_once __DIR__ . '/includes/subhed.php'; ?>
    <?php include_once __DIR__ . '/includes/billing-address-form.php'; ?>
    <!-- main form -->
    <form id="wpt-account-upgrade" method="post" action="/account">
        <!--
            Add address inputs
                                    -->
        <input name="street-address" type="hidden" value="<?= $street_address ?>" data-chargify="address" required />
        <input name="city" type="hidden" value="<?= $city ?>" data-chargify="city" required />
        <input name="state" type="hidden" value="<?= $state_code ?>" data-chargify="state" required />
        <input name="country" type="hidden" value="<?= $country_code ?>" data-chargify="country" required />
        <input name="zipcode" type="hidden" value="<?= $zipcode ?>" required data-chargify="zip" />

        <!-- payment -->
        <div class="box card-section">
            <h3>Payment Method</h3>
            <div class=" radiobutton-tabs__container">
                <div class="radiobutton-tabs__tab-content" data-tab="new-card">
                    <div class="signup-card-body">
                        A new card!
                        <div>
                            <span id="cc_cardholder_first_name"></span>
                            <span id="cc_cardholder_last_name"></span>
                        </div>
                        <div>
                            <div id="cc_number"></div>
                        </div>
                        <div>
                            <span id="cc_month"></span>
                            <span id="cc_year"></span>
                            <span id="cc_cvv"></span>
                        </div>
                    </div>
                </div>
            </div>
            <!-- .radiobutton-tab-container__notcss -->

            <input type="hidden" name="plan" value="<?= $plan->getId() ?>" />
            <input type="hidden" name="nonce" id="hidden-nonce-input" required />
            <input type="hidden" name="type" value="account-signup" required />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />
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
            <button type="submit" class="pill-button yellow">Upgrade Plan</button>
        </div>
    </form>
</div>


<script src="https://js.chargify.com/latest/chargify.js"></script>
<script>
        var chargify = new Chargify();

chargify.load({
    publicKey: "<?= $ch_client_token ?>",
    type: 'card',
    serverHost: "<?= $ch_site ?>", //'https://acme.chargify.com'
    hideCardImage: true,
    optionalLabel: ' ',
    requiredLabel: '*',
    style: {
        input: {
            fontSize: '1rem',
            border: '1px solid #999999',
            padding: '.375rem 0.75rem',
            lineHeight: '1.5',
            backgroundColor: "#ffffff"
        },
        label: {
            backgroundColor: 'transparent',
            paddingTop: '0px',
            paddingBottom: '1px',
            fontSize: '16px',
            fontWeight: '400',
            color: '#ffffff'
        }
    },
    fields: {
            firstName: {
                selector: '#cc_cardholder_first_name',
                label: 'Cardholder first name',
                required: true
            },
            lastName: {
                selector: '#cc_cardholder_last_name',
                label: 'Cardholder last name',
                required: true
            },
            number: {
                selector: '#cc_number',
                label: 'Card Number',
                placeholder: 'Card Number',
                message: 'Invalid Card',
                required: true,
                style: {
                  input: {
                    padding: '8px 48px',
                    width: '494px'
                  }
                }
            },
            month: {
                selector: '#cc_month',
                label: 'Month',
                placeholder: 'MM',
                message: 'Invalid Month',
                required: true,
                style: {
                  input: {
                    width: '158px'
                  }
                }
            },
            year: {
                selector: '#cc_year',
                label: 'Year',
                placeholder: 'YYYY',
                message: 'Invalid Year',
                required: true,
                style: {
                  input: {
                    width: '158px'
                  }
                }
            },
            cvv: {
                selector: '#cc_cvv',
                label: 'CVC',
                placeholder: 'CVC',
                required: true,
                message: 'Invalid CVC',
                required: true,
                style: {
                  input: {
                    width: '158px'
                  }
                }
            }
        }
});

var hiddenNonceInput = document.querySelector('#hidden-nonce-input');
var form = document.querySelector("#wpt-account-upgrade");

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
});
})();
</script>

<style>
.signup-card-container {
    border: 1px solid #334870;
    border-radius: 8px;
}

.signup-card-hed,
.signup-card-body {
    padding: 0 24px;
}
.signup-card-hed {
    border-bottom: 1px solid #334870;
}
.signup-card-hed h4 {
    font-weight: 400;
    margin: 0;
}
#cc_cardholder_first_name iframe,
#cc_cardholder_last_name iframe {
    width: 235px !important;
}
#cc_year iframe,
#cc_month iframe,
#cc_cvv iframe {
    width: 158px !important;
}
</style>