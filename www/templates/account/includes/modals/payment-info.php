<fg-modal id="payment-info-modal" class="payment-info-modal fg-modal">
    <form method="POST" action="/account" id="update-payment-form">
        <h3 class="modal_title">Payment Information</h3>

        <?php require_once __DIR__ . '/../chargify-payment-form.php'; ?>

        <div class="save-button">
            <button type="submit" class="pill-button blue">Save</button>
        </div>
    </form>
</fg-modal>