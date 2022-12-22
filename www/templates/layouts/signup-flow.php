<!DOCTYPE html>
<html class="signup-flow-layout">

<head>
    <?php

    require_once __DIR__ . '/../../common.inc';

    use WebPageTest\Util;

    global $USER_EMAIL;
    global $supportsAuth;
    global $supportsSaml;
    global $client_error;
    global $support_link;

    $page_title = $page_title ? $page_title : 'WebPageTest';
    ?>
    <title><?php echo $page_title; ?></title>
    <?php require_once __DIR__ . '/head.inc'; ?>
    <link href="/assets/css/account.css?v=<?= constant('VER_ACCOUNT_CSS') ?>" rel="stylesheet">
    <script defer src="/assets/js/address-state.js?v=<?= constant('VER_JS_ACCOUNT') ?>"></script>
</head>

<body>
    <?php
    $alert = Util::getSetting('alert');
    $alert_expiration = Util::getSetting('alert_expiration');
    if (isset($client_error)) {
        echo '<div class="error-banner">' . $client_error . '</div>';
    } elseif ($alert && $alert_expiration && new DateTime() < new DateTime($alert_expiration)) {
        echo '<div class="alert-banner">' . $alert . '</div>';
    } elseif ($alert && empty($alert_expiration)) {
        echo '<div class="alert-banner">' . $alert . '</div>';
    }
    ?>
    <wpt-header>
        <header>
            <a class="wptheader_logo" href="/">
                <img src="/assets/images/wpt-logo.svg" alt="WebPageTest, by Catchpoint">
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