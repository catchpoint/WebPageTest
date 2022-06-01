<section>
    <div class="content">
        <h1>Account Details</h1>
        <form method="POST" action="/signup" id=<?= $is_plan_free ? "starter-plan-signup" : "pro-plan-signup"; ?>>
            <div class="form-input">
                <label for="first-name">First Name</label>
                <input type="text" name="first-name" pattern="<?= $contact_info_pattern ?>" required />
            </div>
            <div class="form-input">
                <label for="last-name">Last Name</label>
                <input type="text" name="last-name" pattern="<?= $contact_info_pattern ?>" required />
            </div>
            <div class="form-input">
                <label for="company-name">Company</label>
                <input type="text" name="company-name" pattern="<?= $contact_info_pattern ?>" />
            </div>
            <div class="form-input">
                <label for="email">Email</label>
                <input type="email" name="email" required />
            </div>
            <div class="form-input">
                <label for="password">Password</label>
                <input type="password" name="password" pattern="<?= $password_pattern ?>" minlength="8" maxlength="32" required />
                <p class="description">Must have at least 8 characters, including a number, lowercase letter, uppercase
                    letter
                    and symbol. No &lt;, &gt;.</p>
            </div>
            <div class="form-input">
                <label for="confirm-password">Confirm Password</label>
                <input type="password" name="confirm-password" pattern="<?= $password_pattern ?>" minlength="8" maxlength="32" required />
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
    <div class="plan-name"><?= $is_plan_free ? "STARTER" : "PRO"; ?></div>
    <div class="plan-details">
        <table>
            <thead>
                <?php if (!$is_plan_free) : ?>
                    <th>Runs per month</th>
                <?php endif; ?>
                <th>Price</th>
            </thead>
            <tbody>
                <tr>
                    <?php if ($is_plan_free) : ?>
                        <td>Free</td>
                    <?php else : ?>
                        <td><?= $runs ?></td>
                        <?php if ($billing_frequency == "Monthly") : ?>
                            <td>$<?= "{$monthly_price} {$billing_frequency}" ?></td>
                        <?php else : ?>
                            <td><s>$<?= $other_annual ?></s> $<?= "{$annual_price} {$billing_frequency}" ?></td>
                        <?php endif; ?>
                    <?php endif; ?>
                </tr>
            </tbody>
        </table>
    </div> <!-- /.plan-details -->
    <div class="plan-benefits">
        <h4>Plan Benefits</h4>
        <?php if ($is_plan_free) : ?>
            <ul>
                <li>Access to real browsers in real locations around the world, always running the latest versions.</li>
                <li>Testing on real connection speeds with gold-standard, accurate throttling.</li>
                <li>Custom scripting to let you interact with the page or script user journey flows.</li>
                <li>Access to test history for 13 months to allow for easy comparisons and over time.</li>
                <li>Opportunities report [NEW] to help you zero in on ways to improve the overall effectiveness of your websites.</li>
            </ul>
        <?php else : ?>
            <ul>
                <li>Everything in the Starter plan, including real browsers in real locations, custom scripting for page level and user journey measurements, access to 13 months of test history, and the all new Opportunities report to help you zero in on areas of improvement. </li>
                <li>Access to all new no-code Experiments </li>
                <li>API access for easier integration into your CI/CD, visualizations, alerting and more </li>
                <li>High priority tests to help you jump the queue and experience lower wait times </li>
                <li>Access to new and exclusive, premium-only, test locations </li>
                <li>Dedicated support to help you get back to work faster </li>
                <li>Bulk testing to enable testing of many pages at once </li>
                <li>Private tests for ensuring your private test results stay that way</li>
            </ul>
        <?php endif; ?>
    </div> <!-- /.plan-benefits -->
</aside>