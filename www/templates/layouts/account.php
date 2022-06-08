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
    global $VER_CSS;

    $page_title = $page_title ? $page_title : 'WebPageTest';
    ?>
    <title><?php echo $page_title; ?></title>
    <?php require_once __DIR__ . '/head.inc'; ?>
    <link rel="stylesheet" href="<?= "/css/button.css?v={$VER_CSS}" ?>" />
    <link rel="stylesheet" href="<?= "/css/account.css?v={$VER_CSS}" ?>" />
    <script defer src="/js/account.js"></script>
</head>

<body>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <div id="main">
        <?php require_once __DIR__ . '/main_hed.inc'; ?>
        <?php echo $template_output; ?>
        <?php require_once __DIR__ . '/footer.inc'; ?>
</body>

</html>