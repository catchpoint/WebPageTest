<fg-modal id="contact-info-modal" class="contact-info-modal fg-modal">
    <form method="POST" action="/account">
        <fieldset>
            <legend class="modal_title">Contact Information</legend>
            <div class="input-set">
                <div class="section">
                    <div>
                        <label class="required" for="first-name">First Name</label>
                        <input type="text" name="first-name" maxlength=32 pattern="<?= $validation_pattern; ?>" value="<?= htmlspecialchars($first_name); ?>" title="Do not use <, >, or &#" required />
                    </div>
                </div>
                <div class="section">
                    <div>
                        <label class="required" for="last-name">Last Name</label>
                        <input type="text" name="last-name" maxlength=32 pattern="<?= $validation_pattern; ?>" title="Do not use <, >, or &#" value="<?= htmlspecialchars($last_name); ?>" required />
                    </div>
                </div>
                <div class="section">
                    <label for="company-name">Company Name</label>
                    <input type="text" name="company-name" maxlength=32 pattern="<?= $validation_pattern; ?>" title="Do not use <, >, or &#" value="<?= htmlspecialchars($company_name); ?>" />
                </div>
                <div class="section">
                    <label class="required disabled" for="email">Email</label>
                    <input type="email" name="email" disabled required value="<?= htmlspecialchars($email); ?>" />
                </div>
                <input type="hidden" name="id" value="<?= $id; ?>" />
                <input type="hidden" name="type" value="contact_info" />
                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                <div class="save-button">
                    <button type="submit" class="pill-button blue">Save</button>
                </div>
            </div>
        </fieldset>
    </form>
</fg-modal>