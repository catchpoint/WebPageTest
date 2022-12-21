<!DOCTYPE html>
<html class="account-layout">

<head>
    <?php

    global $USER_EMAIL;
    global $supportsAuth;
    global $supportsSaml;
    global $supportsCPAuth;
    global $request_context;
    global $_SESSION;
    global $client_error;
    global $site_js_loaded;
    global $page_title;
    global $page_description;
    global $cdnPath;
    global $experiments_paid;
    global $support_link;


    $page_title ??= 'WebPageTest';

    ?>
    <title><?= $page_title ?></title>
    <?php require_once __DIR__ . '/head.inc'; ?>
    <link rel="stylesheet" href="/assets/css/button.css?v=<?= constant('VER_BUTTON_CSS') ?>">
    <link rel="stylesheet" href="/assets/css/account.css?v=<?= constant('VER_ACCOUNT_CSS') ?>">
    <script defer src="/assets/js/account.js?v=<?= constant('VER_JS_ACCOUNT') ?>"></script>
    <script defer src="/assets/js/address-state.js?v=<?= constant('VER_JS_ACCOUNT') ?>"></script>
    <script defer src="/assets/js/estimate-taxes.js?v=<?= constant('VER_JS_ESTIMATE_TAXES') ?>"></script>

</head>

<body>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <div class="account-page-content" id="main">
        <?php require_once __DIR__ . '/main_hed.inc'; ?>
        <?= $template_output ?>
    </div>
    <?php require_once __DIR__ . '/../../footer.inc'; ?>
</body>

</html>