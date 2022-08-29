<!-- Address form -->
<form id="plan-summary-address-form">
    <div class="box card-section signup-flow-layout">
        <h3>Billing Address</h3>

        <div class="form-input address">
            <label for="street-address">Billing Address</label>
            <input name="street-address" type="text" value="<?= $street_address ?>" required />
        </div>

        <div class="form-input city">
            <label for="city">City</label>
            <input name="city" type="text" value="<?= $city ?>" required />
        </div>
        <div class="form-input state">
            <label for="state">State</label>
            <select name="state" data-country-selector="state-selector" required>
                <?php foreach ($state_list as $state) : ?>
                    <option value="<?= $state['code'] ?>">
                        <?= $state['name']; ?>
                    </option>
                <?php endforeach; ?>
            </select>
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
            <input type="text" name="zipcode" value="<?= $zipcode ?>" required />
        </div>

        <input type="hidden" name="type" value="account-signup-preview" />
        <input type="hidden" name="plan" value="<?= $plan->getId() ?>" />
        <input type="hidden" name="csrf_token" value="<?= $csrf_token; ?>" />
        <div class="add-subscription-button-wrapper form-input">
            <button type="submit" class="pill-button yellow"><span data-id="pulse"></span><span data-id="button-text">Add Billing Address</span></button>
        </div>

    </div>
</form>

<script defer src="/assets/js/country-list/country-list.js?v=<?= constant('VER_JS_COUNTRY_LIST') ?>"></script>
<script>
    (() => {
        // state dropdown
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

<script defer src="/assets/js/estimate-taxes.js?v=<?= constant('VER_JS_ESTIMATE_TAXES') ?>"></script>