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
<?php if ($is_canceled): ?>
        <li><strong>Plan Renewal</strong> <s><?= $plan_renewal ?></s></li>
        <li class="cancel"><strong>Status</strong> <span><?= $braintreeCustomerDetails['status']; ?></span></li>
<?php else: ?>
        <li><strong>Plan Renewal</strong> <?= $plan_renewal ?></li>
        <li><strong>Status</strong> <?= $braintreeCustomerDetails['status']; ?></li>
<?php endif; ?>
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
  <div class="info">
    <table class="sortable">
      <caption>
        <h3>Billing History</h3>
        <span class="sr-only">, column headers with buttons are sortable.</span>
      </caption>
      <thead>
        <tr>
          <th aria-sort="ascending">
            <button>
              Date Time Stamp
              <span aria-hidden="true"></span>
            </button>
          </th>
          <th>
            <button>
              Credit Card
              <span aria-hidden="true"></span>
            </button>
          </th>
          <th>
            <button>
              Card Number
              <span aria-hidden="true"></span>
            </button>
          </th>
          <th>
            <button>
              Amount
              <span aria-hidden="true"></span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
      <?php foreach($braintreeTransactionHistory as $row): ?>
        <tr>
          <td><?= date_format(date_create($row['transactionDate']), 'M d Y H:i:s e') ?></td>
          <td><?= $row['cardType'] ?></td>
          <td><?= $row['maskedCreditCard'] ?></td>
          <td>$<?= $row['amount'] ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<div class="card api-consumers">
  <div>
    <form method="POST" action="/account">
      <input type="text" name="api-key-name" required />
      <button type="submit">Create API key</button>
      <input type="hidden" name="type" value="create-api-key" />
      <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
    </form>
  </div>
  <div class="info">
    <table class="sortable">
      <caption>
        <h3>API Consumers</h3>
        <span class="sr-only">, column headers with buttons are sortable.</span>
      </caption>
      <thead>
        <tr>
          <th aria-sort="ascending">
            <button>
              Name
              <span aria-hidden="true"></span>
            </button>
          </th>
          <th>
            <button>
              API Key
              <span aria-hidden="true"></span>
            </button>
          </th>
          <th>
            <button>
              Create Date
              <span aria-hidden="true"></span>
            </button>
          </th>
          <th>
            <button>
              Last Updated
              <span aria-hidden="true"></span>
            </button>
          </th>
          <th class="no-sort">Delete</th>
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
