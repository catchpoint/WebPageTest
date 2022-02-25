<div class="page theme-c">
    <div class="container">
        <div class="subhed">
            <div><a href="https://www.webpagetest.org/"><img src="/images/wpt-logo.svg" alt="WebPageTest, by Catchpoint"></a></div>
            <h1>Log in</h1>
            <?php if ($has_error): ?>
            <div class="error-text">
                <span>Incorrect email address or password.</span>
                <span>Please try again.</span>
            </div>
            <?php endif; ?>
        </div>
        <form method="POST" action="/login" class="form-login">
            <fieldset>
                <legend class="a11y-hidden">
                    WebPageTest Login Credentials
                </legend>
                <div class="inputs">
                    <div>
                        <label for="email">Email Address</label>
                        <input name="email" type="email" class="form-field email" required />
                    </div>
                    <div class="container-password">
                        <div class="container-password-label">
                          <label for="password">Password</label>
                        </div>
                        <input name="password" type="password" class="form-field password" required />
                        <a class="link-forgot-password" href="/forgot-password">Forgot Password?</a>
                    </div>
                    <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
                </div><!-- /.inputs -->
                <div class="container-submit">
                    <button type="submit">Login</button>
                </div>
            </fieldset>
        </form>
        <div class="container-signup-link">
          New User? <a href="/signup">Try for Free →</a>
        </div>
    </div>
</div>
