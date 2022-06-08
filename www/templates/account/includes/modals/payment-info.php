<fg-modal id="payment-info-modal" class="payment-info-modal fg-modal">
    <form method="POST" action="/account" id="update-payment-form">
        <fieldset>
            <legend class="modal_title">Payment Information</legend>

            <div class="braintree-card-container">
                <div id="braintree-container"></div>
            </div> <!-- /.braintree-card-container -->
            <div class="billing-address-information-container">
                <div class="form-input address">
                    <label for="streetAddress">Street Address</label>
                    <div>
                        <input name="streetAddress" type="text" required />
                    </div>
                </div>
                <div class="form-input city">
                    <label for="city">City</label>
                    <input name="city" type="text" required />
                </div>
                <div class="form-input state">
                    <label for="state">State</label>
                    <input name="state" type="text" required />
                </div>
                <div class="form-input country">
                    <label for="country">Country</label>
                    <select name="country">
                        <?php foreach ($country_list as $country) : ?>
                            <option value="<?= $country["key"] ?>"><?= $country["text"]; ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-input zip">
                    <label for="zipcode">Postal Code</label>
                    <div>
                        <input type="text" name="zipcode" required />
                    </div>
                </div>
            </div> <!-- /.billing-address-information-container -->

            <input type="hidden" id="hidden-nonce-input" name="nonce" />
            <input type="hidden" name="type" value="update-payment-method" />
            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />

            <div class="save-button">
                <button type="submit" class="pill-button blue">Save</button>
            </div>
        </fieldset>
    </form>
</fg-modal>

<script src="https://js.braintreegateway.com/web/3.85.2/js/client.min.js"></script>
<script src="https://js.braintreegateway.com/web/dropin/1.33.0/js/dropin.min.js"></script>


<script>
    braintree.dropin.create({
        authorization: "<?= $bt_client_token ?>",
        container: '#braintree-container',
        card: {
            cardholderName: {
                required: true
            }
        }
    }, (error, dropinInstance) => {
        var hiddenNonceInput = document.querySelector('#hidden-nonce-input');
        var form = document.querySelector("#update-payment-form");

        form.addEventListener('submit', function(event) {
            event.preventDefault();

            dropinInstance.requestPaymentMethod(function(err, payload) {
                if (err) {
                    // handle error
                    console.error(err);
                    return;
                }

                hiddenNonceInput.value = payload.nonce;
                form.submit();
            });
        });
    });
</script>