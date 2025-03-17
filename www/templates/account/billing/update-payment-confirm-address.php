<div class="my-account-page page_content">
    <ul class="breadcrumbs">
        <li><a href="/account">Account Settings</a></li>
        <li>Edit Billing Information</li>
    </ul>

    <div class="subhed">
        <h1>Edit Billing Information</h1>
        <div class="contact-support-button">
            <a href="<?= $support_link ?>"><span>Contact Support</span></a>
        </div>
    </div>
    <form action="/account" method="post">
        <div class="plan-billing-container card box">
            <div class="billing-container">
                <h3>Billing Address</h3>
                <div class="billing-info-section">
                    <div class="info-container street-address">
                        <label for="street-address">Street Address</label>
                        <div>
                            <input name="street-address" type="text" value="<?= $street_address ?>" required />
                        </div>
                    </div>
                    <div class="info-container city">
                        <label for="city">City</label>
                        <div>
                            <input name="city" type="text" value="<?= $city ?>" required />
                        </div>
                    </div>
                    <div class="info-container state">
                        <label for="state">State</label>
                        <div>
                            <select autocomplete="off" name="state" data-country-selector="state-selector" required>
                                <?php foreach ($state_list as $state): ?>
                                    <option value="<?= $state['code'] ?>">
                                        <?= $state['name']; ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="info-container country">
                        <label for="country">Country</label>
                        <select autocomplete="off" name="country" data-country-selector="selector" required>
                            <?php foreach ($country_list as $country): ?>
                                <option value="<?= $country["code"] ?>">
                                    <?= $country["name"]; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="info-container zipcode">
                        <label for="zipcode">Zip Code</label>
                        <div>
                            <input type="text" name="zipcode" value="<?= $zipcode ?>" required />
                        </div>
                    </div>
                </div> <!-- /.billing-info-section -->
            </div> <!-- /.billing-container -->
        </div>
        <input type="hidden" name="plan" value="<?= $plan ?>" />
        <input type="hidden" name="renewaldate" value="<?= $renewaldate ?>" />
        <input type="hidden" name="type" value="update-payment-method-confirm-billing" />
        <button class="yellow pill-button" type="submit">Confirm Billing Address</button>
    </form>
    <script defer src="/assets/js/country-list/country-list.js?v=<?= constant('VER_JS_COUNTRY_LIST') ?>"></script>
    <script>
        (() => {
            const countryList = <?= $country_list_json_blob ?>;
            const initialCountry = "<?= $country_code ?>";
            const initialState = "<?= $state_code ?>";
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => {
                    const countrySelectorEl = document.querySelector("[data-country-selector=selector]");
                    const divisionSelectorEl = document.querySelector("[data-country-selector=state-selector]");

                    new CountrySelector(countrySelectorEl, divisionSelectorEl, countryList, initialCountry, initialState);
                });
            } else {
                const countrySelectorEl = document.querySelector("[data-country-selector=selector]");
                const divisionSelectorEl = document.querySelector("[data-country-selector=state-selector]");
                new CountrySelector(countrySelectorEl, divisionSelectorEl, countryList, initialCountry, initialState);
            }
        })();
    </script>
</div>