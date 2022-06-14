<!DOCTYPE html>
<html class="account-layout">

<head>
    <?php
    require_once __DIR__ . '/../../common.inc';

    global $USER_EMAIL;
    global $supportsAuth;
    global $supportsSaml;
    global $supportsCPAuth;
    global $request_context;
    global $_SESSION;
    global $client_error;
    global $site_js_loaded;

    $page_title = $page_title ? $page_title : 'WebPageTest';
    ?>
    <title><?= $page_title ?></title>
    <?php require_once __DIR__ . '/head.inc'; ?>
    <link rel="stylesheet" href="/css/button.css?v=<?= constant('VER_BUTTON_CSS') ?>" />
    <link rel="stylesheet" href="/css/account.css?v=<?= constant('VER_ACCOUNT_CSS') ?>" />
    <script defer src="/js/account.js?v=<?= constant('VER_JS_ACCOUNT') ?>"></script>
</head>
<body>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <div id="main">
        <?php require_once __DIR__ . '/main_hed.inc'; ?>
        <?= $template_output ?>
    </div>
    <?php require_once __DIR__ . '/footer.inc'; ?>
</body>
</html>