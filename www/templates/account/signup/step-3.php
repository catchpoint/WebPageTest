<section class="payment-details">
    <div class="content">
        <h1>Payment Details</h1>
        <form method="POST" action="/signup" id="wpt-signup-paid-account">
            <div class="signup-card-container">
                <div class="signup-card-hed">
                  <h4>Pay with card</h4>
                </div>
                <div class="signup-card-body">
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
            <input name="street-address" type="hidden" value="<?= $street_address ?>" data-chargify="address" required />
            <input name="city" type="hidden" value="<?= $city ?>" data-chargify="city" required />
            <input name="state" type="hidden" value="<?= $state_code ?>" data-chargify="state" required />
            <input name="country" type="hidden" value="<?= $country_code ?>" data-chargify="country" required />
            <input name="zipcode" type="hidden" value="<?= $zipcode ?>" required data-chargify="zip" />
            <input type="hidden" name="first-name" value="<?= $first_name ?>" />
            <input type="hidden" name="last-name" value="<?= $last_name ?>" />
            <input type="hidden" id="hidden-nonce-input" name="nonce" />
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
                <?php if (!$is_plan_free) : ?>
                <th>Estimated Taxes</th>
                <th>Total including tax</th>
                <?php endif; ?>
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
                        <td><?= $estimated_tax ?></td>
                        <td><?= $total_including_tax ?></td>
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
        var form = document.querySelector("#wpt-signup-paid-account");

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
