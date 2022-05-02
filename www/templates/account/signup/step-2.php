<div>
<h1>Signup</h1>
<form method="POST" action="/signup">
<label for="first-name">First Name</label>
<input type="text" name="first-name" required />
<label for="last-name">Last Name</label>
<input type="text" name="last-name" required  />
<label for="company-name">Company</label>
<input type="text" name="company-name" />
<label for="email">email</label>
<input type="email" name="email" required  />
<label for="password">password</label>
<input type="password" name="password" required  />
<label for="confirm-password">confirm password</label>
<input type="password" name="confirm-password" required  />

<p>By clicking "Sign Up" you are agreeing to our <a href="/terms.php" target="_blank" rel="noopener">terms of service</a> and <a href="https://www.catchpoint.com/trust#privacy" target="_blank" rel="noopener">privacy policy</a>.</p>
<input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
<input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
<input type="hidden" name="plan" value="<?= $plan ?>" />
<input type="hidden" name="step" value="2" />
<?php $btntxt =  $is_plan_free ? "Sign Up" : "Continue"; ?>
<button type="submit"><?= $btntxt ?></button>
</form>
</div>
