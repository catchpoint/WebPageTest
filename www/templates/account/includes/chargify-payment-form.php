<div class="signup-card-container">
    <div class="signup-card-hed">
        <h4>Pay with card</h4>
    </div>
    <div class="signup-card-body">
        <div class="cardholder-name-container">
            <div class="cardholder-name">
                <span id="cc_cardholder_first_name"></span>
            </div>
            <div class="cardholder-name">
                <span id="cc_cardholder_last_name"></span>
            </div>
        </div>
        <div>
            <div id="cc_number"></div>
        </div>
        <div class="cc-detail-container">
            <div class="cc-detail">
                <span id="cc_month"></span>
            </div>
            <div class="cc-detail">
                <span id="cc_year"></span>
            </div>
            <div class="cc-detail">
                <span id="cc_cvv"></span>
            </div>
        </div>
    </div>
</div>
<script src="https://js.chargify.com/latest/chargify.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        var chargify = new Chargify();
        var textColor = document.querySelectorAll('.my-account-page').length > 0 ? '#111111' : '#ffffff';
        chargify.load({
            publicKey: "<?= $ch_client_token ?>",
            type: 'card',
            serverHost: "<?= $ch_site ?>", //'https://acme.chargify.com'
            hideCardImage: false,
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
                    color: textColor
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

        window.chargify = chargify;
    });
</script>