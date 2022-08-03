<div class="my-account-page page_content">
    <ul class="breadcrumbs">
        <li><a href="/account">Account Settings</a></li>
        <li><a href="/account/update_plan">Update Plan</a></li>
        <li>Plan summary</li>
    </ul>
    <div class="subhed">
        <h1>Purchase Summary</h1>
    </div>
    <!-- Address form -->
    <form id="plan-summary-address-form">
        <div class="box card-section">
            <h3>Billing Address</h3>
            <div>
                <div class="form-input address">
                    <label for="street-address">Billing Address</label>
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
                    <div>
                        <select name="state" data-country-selector="state-selector" required>
                            <?php foreach ($state_list as $state) : ?>
                                <option value="<?= $state['code'] ?>">
                                    <?= $state['name']; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                <div class="form-input country">
                    <label for="country">Country</label>
                    <select name="country" data-country-selector="selector" required>
                            <?php foreach ($country_list as $country) : ?>
                            <option value="<?= $country["code"] ?>" <?php ($country["code"] === "US") ? 'selected' : '' ?>>
                                <?= $country["name"]; ?>
                            </option>
                            <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-input zip">
                    <label for="zipcode">Postal Code</label>
                    <div>
                        <input type="text" name="zipcode" value="<?= $zipcode ?>" required />
                    </div>
                </div>
            </div>
            <input type="hidden" name="type" value="account-signup-preview" />
            <input type="hidden" name="plan" value="<?= $plan->getId() ?>" />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />
            <div class="add-subscription-button-wrapper">
                <button type="submit" class="pill-button yellow">Add Billing Address</button>
            </div>

        </div>
    </form>
    <!-- main form -->
    <form id="wpt-account-upgrade" method="post" action="/account">
        <input type='hidden' name='type' value='upgrade-plan-2' />
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


<script src="/js/country-list/country-list.js"></script>
<script>
    (() => {
        const countryList = <?= $country_list_json_blob ?>;
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                const countrySelectorEl = document.querySelector("[data-country-selector=selector]");
                const divisionSelectorEl = document.querySelector("[data-country-selector=state-selector]");

                new CountrySelector(countrySelectorEl, divisionSelectorEl, countryList);
            });
        } else {
            const countrySelectorEl = document.querySelector("[data-country-selector=selector]");
            const divisionSelectorEl = document.querySelector("[data-country-selector=state-selector]");

            new CountrySelector(countrySelectorEl, divisionSelectorEl, countryList);
        }
    })();
</script>

<script defer src="/js/estimate-taxes.js?v=asas<?= constant('VER_JS_ACCOUNT') ?>"></script>

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