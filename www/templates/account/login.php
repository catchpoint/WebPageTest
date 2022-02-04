<div>
    <div><a href="https://www.webpagetest.org/">
            <!--TODO LOGO --><span>LOGO</span>
        </a></div>
</div>
<div>
    <form method="POST" action="/login">
        <fieldset>
            <legend>
                WPT Credentials
            </legend>
            <div class="inputs">
                <div>
                    <label for="email">Email</label>
                    <input name="email" type="email" class="form-field email" placeholder="Email" />
                </div>
                <div>
                    <label for="password">Password</label>
                    <input name="password" type="password" class="form-field password" placeholder="Password" />
                </div>
                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
            </div><!-- /.inputs -->
            <div>
                <button type="submit">Login</button>
            </div>
        </fieldset>
    </form>
    <div>
        <button class="forgot-password">Forgot Password</button>
    </div>
</div>
