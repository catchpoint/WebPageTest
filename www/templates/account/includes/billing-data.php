<div class="card subscription-plan" data-modal="subscription-plan-modal">
  <div class="card-section">
    <h3>Subscription Plan</h3>
    <div class="info">
      <ul>
        <li><strong>Plan</strong> <?= "{$braintreeCustomerDetails['wptPlanName']}"; ?></li>
        <?php echo isset($braintreeCustomerDetails['remainingRuns']) ? "<li><strong>Remaining Runs</strong> {$braintreeCustomerDetails['remainingRuns']}</li>" : "" ?>
        <?php echo isset($runs_renewal) ? "<li><strong>Runs Renewal</strong> {$runs_renewal}</li>" : "" ?>
        <li><strong>Price</strong> <?= "\${$braintreeCustomerDetails['subscriptionPrice']}"; ?></li>
        <li><strong>Payment</strong> <?= $billing_frequency ?></li>
        <li><strong>Plan Renewal</strong> <?= $plan_renewal ?></li>
        <li><strong>Status</strong> <?= $braintreeCustomerDetails['status']; ?></li>
      </ul>
    </div>
  </div>
  <div class="card-section">
    <div class="edit-button">
      <button><span>Edit</span></button>
    </div>
  </div>
</div>

<div class="card payment-info" data-modal="payment-info-modal">
  <div class="card-section">
    <div class="info">
      <div class="cc-type">
      <img src="<?= $braintreeCustomerDetails['ccImageUrl'] ?>" alt="card-type" width="80px" height="54px" />
      </div>
      <div class="cc-details">
        <div class="cc-number"><?= $braintreeCustomerDetails['maskedCreditCard']; ?></div>
        <div class="cc-expiration">Expires: <?= $braintreeCustomerDetails['ccExpirationDate']; ?></div>
      </div>
    </div>
  </div>
  <div class="card-section">
    <div class="edit-button">
      <button><span>Edit</span></button>
    </div>
  </div>
</div>

<div class="card billing-history">
  <h3>Billing History</h3>
  <div class="info">
    <table>
      <thead>
        <tr>
          <th>Date Time Stamp</th>
          <th>Credit Card</th>
          <th>Card Number</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
<?php foreach($braintreeTransactionHistory as $row) {
  echo "<tr>
          <td>{$row['transactionDate']}</td>
          <td>{$row['cardType']}</td>
          <td>{$row['maskedCreditCard']}</td>
          <td>{$row['amount']}</td>
        </tr>";
} ?>
      </tbody>
    </table>
  </div>
</div>

<div class="card api-consumers">
  <h3>API Consumers</h3>
  <div>
    <form method="POST" action="/account">
      <input type="text" name="api-key-name" required />
      <button type="submit">Create API key</button>
      <input type="hidden" name="type" value="create-api-key" />
      <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
    </form>
  </div>
  <div class="info">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>API Key</th>
          <th>Create Date</th>
          <th>Last Updated</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
<?php foreach($wptApiKey as $row): ?>
<tr>
  <td><?= $row['name'] ?></td>
  <td><?= $row['apiKey'] ?></td>
  <td><?= date_format(date_create($row['createDate']), 'M d Y H:i:s e') ?></td>
  <td><?= date_format(date_create($row['changeDate']), 'M d Y H:i:s e') ?></td>
  <td>
  <form method='POST' action='/account'>
    <input type='hidden' name='api-key-id' value='<?= $row['id'] ?>' />
    <input type='hidden' name='type' value='delete-api-key' />
    <input type='hidden' name='csrf_token' value='<?= $csrf_token ?>' />
    <button type='submit'>Delete</button>
  </form>
</td>
</tr>
<?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
