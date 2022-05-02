<div>

<div class="card">
  <form method="POST" action="/signup">
    <fieldset>
      <legend>Starter</legend>
      <h3>50 Runs/mo</h3>
      <div class="price">Free</div>
      <input type="hidden" name="plan" value="free" />
      <input type="hidden" name="step" value="1" />
      <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
      <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
      <button type="submit">Select Plan</button>
    </fieldset>
  </form>
</div>

<div class="card">
  <form method="POST" action="/signup">
    <fieldset>
      <legend>Pro</legend>
      <select name="plan">
        <?php foreach($wpt_plans as $plan): ?>
        <option value="<?= $plan['id'] ?>"><?= $plan['name'] ?></option>
        <?php endforeach; ?>
      </select>
      <div class="price">$250/mo</div>
      <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
      <input type="hidden" name="auth_token" value="<?= $auth_token ?>" />
      <input type="hidden" name="step" value="1" />
      <button type="submit">Select Plan</button>
    </fieldset>
  </form>
</div>

</div>
