<div class="signup-feature">
  <div class="signup-hed-contain">
    <div class="signup-hed">
      <h1>Ready to go Sign Up?</h1>
      <div>All the WebPageTest features you already love</div>
      <div><strong>plus API Access!</strong></div>
      <div>Plans start at just <span class="signup-hed-price">$5/mo</span></div>
    </div><!-- ./signup-hed -->
  </div><!-- ./signup-hed-contain -->
</div><!-- ./signup-feature -->

<div class="signup-step-1-content">
  <div class="billing-frequency-selector">
    <h3>Save 25% by paying annually!</h3>
    <div class="radiobutton-group" id="paid-plan-selector">
      <input type="radio" id="annual-plans" name="plans" value="annual" checked />
      <label for="annual-plans">Annual</label>
      <input type="radio" id="monthly-plans" name="plans" value="monthly" />
      <label for="monthly-plans">Monthly</label>
    </div>
  </div>
  <div class="card-container">
    <div class="card">
      <form method="POST" action="/signup">
        <fieldset>
          <legend>Starter</legend>
          <h3><strong>50 Runs</strong>/mo</h3>
          <div class="price">Free</div>
          <input type="hidden" name="plan" value="free" />
          <input type="hidden" name="step" value="1" />
          <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
          <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
          <button type="submit">Select Plan</button>
        </fieldset>
      </form>
      <div class="benefits-list">
        <ul>
          <li>300 Free Manual Tests</li>
          <li>All Browsers</li>
          <li>All Connection Speeds</li>
          <li>30 Locations</li>
          <li>Real Mobile Devices</li>
          <li>Custom Scripts</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="annual selected">
        <form method="POST" action="/signup">
          <fieldset>
            <legend>Paid</legend>
            <select name="plan">
              <?php foreach($annual_plans as $plan): ?>
              <option value="<?= $plan->getId() ?>" data-price="<?= $plan->getMonthlyPrice() ?>"><?= $plan->getRuns() ?>/mo</option>
              <?php endforeach; ?>
            </select>
            <div class="price">$<span><?= $annual_plans[0]->getMonthlyPrice() ?></span>/mo</div>
            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
            <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
            <input type="hidden" name="step" value="1" />
            <button type="submit">Select Plan</button>
          </fieldset>
        </form>
        <div class="benefits-list">
          <h5>Everything in Starter plus:</h5>
          <ul>
            <li>More Manual Tests</li>
            <li>Premium Test Locations</li>
            <li>WebPageTest API</li>
            <li>Faster Test Results</li>
          </ul>
        </div>
      </div>

      <div class="monthly">
        <form method="POST" action="/signup">
          <fieldset>
            <legend>Paid</legend>
            <select name="plan">
              <?php foreach($monthly_plans as $plan): ?>
              <option value="<?= $plan->getId() ?>" data-price="<?= $plan->getMonthlyPrice() ?>"><?= $plan->getRuns() ?>/mo</option>
              <?php endforeach; ?>
            </select>
            <div class="price">$<span><?= $monthly_plans[0]->getMonthlyPrice() ?></span>/mo</div>
            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
            <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
            <input type="hidden" name="step" value="1" />
            <button type="submit">Select Plan</button>
          </fieldset>
        </form>
        <div class="benefits-list">
          <h5>Everything in Starter plus:</h5>
          <ul>
            <li>More Manual Tests</li>
            <li>Premium Test Locations</li>
            <li>WebPageTest API</li>
            <li>Faster Test Results</li>
          </ul>
        </div>
      </div>
    </div>
  </div><!-- /.card-container -->
</div><!-- /.signup-step-1-content -->
