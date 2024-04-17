<fg-modal id="contact-info-modal" class="contact-info-modal fg-modal">
    <form method="POST" action="/account">
        <h3 class="modal_title">Contact Information</h3>
        <div class="input-set">
            <div class="section">
                <div>
                    <label class="required" for="first-name">First Name</label>
                    <input type="text" name="first-name" maxlength=32 pattern="<?= $validation_pattern; ?>" value="<?= htmlspecialchars($first_name); ?>" title="Do not use <, >, or &#" required <?= $is_verified ? '' :'disabled'; ?> />
                </div>
            </div>
            <div class="section">
                <div>
                    <label class="required" for="last-name">Last Name</label>
                    <input type="text" name="last-name" maxlength=32 pattern="<?= $validation_pattern; ?>" title="Do not use <, >, or &#" value="<?= htmlspecialchars($last_name); ?>" required <?= $is_verified ? '' :'disabled'; ?>/>
                </div>
            </div>
            <div class="section">
                <label for="company-name">Company Name</label>
                <input type="text" name="company-name" maxlength=32 pattern="<?= $validation_pattern; ?>" title="Do not use <, >, or &#" value="<?= htmlspecialchars($company_name); ?>" <?= $is_verified ? '' :'disabled'; ?>/>
            </div>
<?php if ($is_paid) : ?>
            <div class="section">
                <label for="vat-number">VAT Number</label>
                <input name="vat-number" type="text" maxlength=32 pattern="<?= $validation_pattern; ?>" title="Please insert a valid VAT number" value="<?= htmlspecialchars($vat_number); ?>" required <?= $is_verified ? '' :'disabled'; ?>/>
            </div>
<?php endif; ?>
            <div class="section">
                <label class="required disabled" for="email">Email</label>
                <input type="email" name="email" disabled required value="<?= htmlspecialchars($email); ?>" />
            </div>
            <input type="hidden" name="id" value="<?= $id; ?>" />
            <input type="hidden" name="type" value="contact-info" />
            <?php if ($is_verified) : ?>
                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                <div class="save-button">
                    <button type="submit" class="pill-button blue">Save</button>
                </div>
            <?php endif; ?>
        </div>
    </form>
</fg-modal>