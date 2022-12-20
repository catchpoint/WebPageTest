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
                            <select name="state" data-country-selector="state-selector" required>

                                <?php foreach ($state_list as $state) : ?>
                                    <option value="<?= $state['code'] ?>" <?php if ($state['code'] == $state_code) {
                                        echo 'selected';
                                                   } ?>>
                                        <?= $state['name']; ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="info-container country">
                        <label for="country">Country</label>
                        <select name="country" data-country-selector="selector" required>
                            <?php foreach ($country_list as $country) : ?>
                                <?php
                                  $current_code = $country["code"];
                                  $selected_country = false;
                                if (isset($country_code) && !is_null($country_code)) {
                                    if ($current_code == $country_code) {
                                        $selected_country = true;
                                    }
                                } else {
                                    if ($current_code == 'US') {
                                        $selected_country = true;
                                    }
                                }
                                ?>
                                <option value="<?= $country["code"] ?>" <?= $selected_country ? 'selected' : '' ?>>
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
</div>
