<section>
    <div class="content">
        <h1>Account Details</h1>
        <form method="POST" action="/signup" id=<?= $is_plan_free ? "starter-plan-signup" : "pro-plan-signup"; ?>>
            <div class="form-input">
                <label for="first-name">First Name</label>
                <input type="text" name="first-name" pattern="<?= $contact_info_pattern ?>" required />
            </div>
            <div class="form-input">
                <label for="last-name">Last Name</label>
                <input type="text" name="last-name" pattern="<?= $contact_info_pattern ?>" required />
            </div>
            <div class="form-input">
                <label for="company-name">Company</label>
                <input type="text" name="company-name" pattern="<?= $contact_info_pattern ?>" />
            </div>
            <div class="form-input">
                <label for="email">Email</label>
                <input type="email" name="email" required />
            </div>
            <div class="form-input">
                <label for="password">Password</label>
                <input type="password" name="password" pattern="<?= $password_pattern ?>" minlength="8" maxlength="32" required />
                <p class="description">Must have at least 8 characters, including a number, lowercase letter, uppercase
letter and symbol. No &lt;, &gt;.</p>
            </div>
            <div class="form-input">
                <label for="confirm-password">Confirm Password</label>
                <input type="password" name="confirm-password" pattern="<?= $password_pattern ?>" minlength="8" maxlength="32" required />
            </div>
            <?php if (!$is_plan_free) : ?>
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
            <?php endif; ?>
            <div class="form-input">
                <?php

                $btntxt =  $is_plan_free ? "Sign Up" : "Continue"; ?>
                <button type="submit"><?= $btntxt ?></button>
            </div>

            <p class="disclaimer">By signing up I agree to WebPageTest's <a href="/terms.php" target="_blank" rel="noopener">Terms of Service</a> and <a href="https://www.catchpoint.com/trust#privacy" target="_blank" rel="noopener">Privacy Statement</a>.</p>
            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
            <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
            <input type="hidden" name="plan" value="<?= $plan ?>" />
            <input type="hidden" name="step" value="2" />
        </form>
    </div><!-- /.content -->
</section>
<aside>
    <h3>Selected Plan</h3>
    <div class="plan-name">
        <?= $is_plan_free ? "STARTER" : '<div class="heading wpt-pro-logo"> <span class="visually-hidden">WebPageTest <em class="new-banner">Pro</em></span></div>' ?>
    </div>
    <div class="plan-details">
        <table>
            <?php if (!$is_plan_free) : ?>
            <tr>
                <th>Pay Plan:</th>
                <td><?= $billing_frequency ?></td>
            </tr>
            <?php endif; ?>
            <tr>
                <th>Runs/mo:</th>
                <td><?= $runs ?? 300; ?></td>
            </tr>
            <tr>
                <th>Price:</th>
                <?php if ($is_plan_free) : ?>
                    <td>Free</td>
                <?php else : ?>
                    <?php if ($billing_frequency == "Monthly") : ?>
                        <td>$<?= "{$monthly_price}/mo" ?></td>
                    <?php else : ?>
                        <td><s>$<?= $other_annual ?></s> $<?= "{$annual_price}/yr" ?></td>
                    <?php endif; ?>
                <?php endif; ?>
            </tr>
            <tr>
                <th>Estimated Taxes</th>
                <td><?= $estimated_tax ?? "--" ?></td>
            </tr>
            <tr>
                <th>Total including tax</th>
                <td><?= $total_including_tax ?? "--" ?></td>
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

<?php if (!$is_plan_free) : ?>
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
<?php endif; ?>
