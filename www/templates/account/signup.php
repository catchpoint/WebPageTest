<div>
<h1>Signup</h1>
<form method="POST" action="/signup">
<input type="text" name="first-name" required />
<input type="text" name="last-name" required  />
<input type="text" name="company-name" />
<input type="email" name="email" required  />
<input type="email" name="confirm-email" required  />
<input type="password" name="password" required  />
<input type="password" name="confirm-password" required  />

<p>By clicking "Sign Up" you are agreeing to our <a href="/terms.php" target="_blank" rel="noopener">terms of service</a> and <a href="https://www.catchpoint.com/trust#privacy" target="_blank" rel="noopener">privacy policy</a>.</p>
<input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
<button type="submit">Sign Up</button>
</form>
</div>
