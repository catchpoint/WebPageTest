<section>
  <div class="content">
    <h1>Account Details</h1>
    <form method="POST" action="/signup">
      <div class="form-input">
        <label for="first-name">First Name</label>
        <input type="text" name="first-name" pattern="<?= $contact_info_pattern ?>" required />
      </div>
      <div class="form-input">
        <label for="last-name">Last Name</label>
        <input type="text" name="last-name" pattern="<?= $contact_info_pattern ?>" required  />
      </div>
      <div class="form-input">
        <label for="company-name">Company</label>
        <input type="text" name="company-name" pattern="<?= $contact_info_pattern ?>" />
      </div>
      <div class="form-input">
        <label for="email">Email</label>
        <input type="email" name="email" required  />
      </div>
      <div class="form-input">
        <label for="password">Password</label>
        <input type="password" name="password" pattern="<?= $password_pattern ?>" minlength="8" maxlength="32" required />
        <p class="description">Must have at least 8 characters, including a number, lowercase letter, uppercase letter and symbol. No &lt;, &gt;.</p>
      </div>
      <div class="form-input">
        <label for="confirm-password">Confirm Password</label>
        <input type="password" name="confirm-password" pattern="<?= $password_pattern ?>" minlength="8" maxlength="32" required  />
      </div>
      <div class="form-input">
        <?php $btntxt =  $is_plan_free ? "Sign Up" : "Continue"; ?>
        <button type="submit"><?= $btntxt ?></button>
      </div>

      <p class="disclaimer">By signing up I agree to WebPageTest's <a href="/terms.php" target="_blank" rel="noopener">Terms of Service</a> and <a href="https://www.catchpoint.com/trust#privacy" target="_blank" rel="noopener">Privacy Statement</a>.</p>
      <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
      <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
      <input type="hidden" name="plan" value="<?= $plan ?>" />
      <input type="hidden" name="step" value="2" />
    </form>
  </div><!-- /.content -->
</section>
<aside>
  <h3>Selected Plan</h3>
  <div class="plan-name"><?= $is_plan_free ? "Free" : "Pro"; ?></div>
  <div class="plan-details">
    <table>
      <thead>
        <th>Runs per month</th>
        <th>Price</th>
      </thead>
      <tbody>
        <tr>
          <td><?= $runs ?></td>
          <td>$<?= "{$price} {$billing_frequency}" ?></td>
        </tr>
      </tbody>
    </table>
  </div> <!-- /.plan-details -->
  <div class="plan-benefits">
    <h4>Plan Benefits</h4>
    <ul>
      <li>Access to real browsers in real locations with the latest OS versions.</li>
      <li>Test on real connection speeds.</li>
      <li>Run page level and user journey tests including custom scripts.</li>
      <li>Access to test history for 13 months.</li>
    </ul>
  </div> <!-- /.plan-benefits -->
</aside>
