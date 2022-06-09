<div class="my-account-page">
  <?php if (!$is_verified): ?>
  <div class="resend-email-verification-container">
    <div class="resend-email-verification-hed">
      <h3>A verification link was sent to your email</h3>
    </div>
    <div>Please click on the link that was sent to your email to complete your registration process.</div>
    <div class="resend-link-container">
      <span>Didn’t receive an email?</span>
      <form method="POST" action="/account">
        <input type="hidden" name="type" value="resend-verification-email" />
        <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
        <button type="submit">Resend Verification Link</button>
      </form>
    </div>
  </div>
  <?php endif; ?>

  <div class="subhed">
    <h1>My Account</h1>
    <?php if ($is_paid): ?>
    <div class="contact-support-button">
      <a href="https://support.webpagetest.org"><span>Contact Support</span></a>
    </div>
    <?php endif; ?>
  </div>

  <div class="card contact-info" data-modal="contact-info-modal">
    <div class="card-section">
      <h3><?= htmlspecialchars($first_name) . ' ' . htmlspecialchars($last_name) ?></h3>
      <div class="info">
        <div><?= htmlspecialchars($email) ?></div>
      </div>
    </div>
    <div class="card-section">
      <div class="edit-button">
        <button><span>Edit</span></button>
      </div>
    </div>
  </div>

  <div class="card password" data-modal="password-modal">
    <div class="card-section">
      <h3>Password</h3>
      <div class="info">
        <div>************</div>
      </div>
    </div>
    <div class="card-section">
      <div class="edit-button">
        <button><span>Edit</span></button>
      </div>
    </div>
  </div>

<?php if ($is_paid) {
  include_once __DIR__ . '/includes/billing-data.php';
  include_once __DIR__ . '/includes/modals/subscription-plan.php';
  include_once __DIR__ . '/includes/modals/payment-info.php';
} else {
  include_once __DIR__ . '/includes/signup.php';
} ?>
</div>


<!-- Modals -->
<?php
include_once __DIR__ . '/includes/modals/contact-info.php';
include_once __DIR__ . '/includes/modals/password.php';
?>
<!-- /Modals -->
