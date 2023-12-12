<fg-modal id="password-modal" class="password-modal fg-modal">
    <form method="POST" action="/account">
        <h3 class="modal_title">Change your password</h3>
        <p class="details">The requirements are at least 8 characters, including a number, lowercase letter, uppercase letter and symbol. No &lt;, &gt;.</p>
        <div class="input-set">
            <div class="section">
                <label class="required" for="current-password">Current Password</label>
                <input type="password" name="current-password" required />
            </div>
            <div class="section">
                <label class="required" for="new-password">New Password</label>
                <input type="password" name="new-password" minlength="8" title="The requirements are at least 8 characters, including a number, lowercase letter, uppercase letter and symbol. No &lt;, &gt;." pattern="<?= $validation_pattern_password ?>" required />
            </div>
            <div class="section">
                <label class="required" for="confirm-new-password">Confirm New Password</label>
                <input type="password" name="confirm-new-password" minlength="8" title="The requirements are at least 8 characters, including a number, lowercase letter, uppercase letter and symbol. No &lt;, &gt;." pattern="<?= $validation_pattern_password ?>" required />
            </div>
            <div class="section">
                <div class="save-button">
                    <button type="submit" class="pill-button blue">Save</button>
                </div>
                <div class="cancel-button">
                    <button class="pill-button grey-outline">Cancel</button>
                </div>
            </div>
        </div>
        <input type="hidden" name="type" value="password" />
        <input type="hidden" name="id" value="<?= $id ?>" />
        <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
    </form>
</fg-modal>