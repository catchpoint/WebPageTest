<!DOCTYPE html>
<html class="signup-flow-layout">

<head>
    <?php
      require_once __DIR__ . '/../../common.inc';

      use WebPageTest\Util;

      global $USER_EMAIL;
      global $supportsAuth;
      global $supportsSaml;
      global $notification_alert;

      $page_title = $page_title ? $page_title : 'WebPageTest';
      ?>
    <title><?php echo $page_title; ?></title>
    <?php require_once __DIR__ . '/head.inc'; ?>
    <link href="/css/account.css" rel="stylesheet" />
</head>

<body>
    <?php
      $alert = $notification_alert ?? Util::getSetting('alert');
      if ($alert) {
            echo '<div class="alert-banner">' . $alert . '</div>';
      }
      ?>
    <wpt-header>
        <header>
            <a class="wptheader_logo" href="/">
                <img src="https://webpagetest.org/images/wpt-logo.svg" alt="WebPageTest, by Catchpoint" />
            </a>
            <?php if ($is_plan_free) : ?>
            <ol class="free-plan">
                <?php else : ?>
                <ol>
                    <?php endif; ?>
                    <?php if ($step == 2) : ?>
                    <li>Choose Plan</li>
                    <li class="selected">Account Details</li>
                    <?php if (!$is_plan_free) : ?>
                    <li>Payment Details</li>
                    <?php endif; ?>
                    <?php else : ?>
                    <li>Choose Plan</li>
                    <li>Account Details</li>
                    <?php if (!$is_plan_free) : ?>
                    <li class="selected">Payment Details</li>
                    <?php endif; ?>
                    <?php endif; ?>
                </ol>
        </header>
    </wpt-header>
    <main>
        <?php echo $template_output; ?>
    </main>
</body>

</html>