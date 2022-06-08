<!DOCTYPE html>
<html class="signup-flow-step-1-layout">
<?php
global $USER_EMAIL;
global $supportsAuth;
global $supportsSaml;
global $supportsCPAuth;
global $request_context;
global $_SESSION;
global $client_error;

$page_title = $page_title ? $page_title : 'WebPageTest';
?>
<title><?php echo $page_title; ?></title>
<?php require_once __DIR__ . '/head.inc'; ?>
<link href="/css/account.css?v=<?= constant('VER_ACCOUNT_CSS') ?>" rel="stylesheet" />
<script defer src="/js/accessible-faq.js"></script>
<script defer src="/js/signup-price-changer.js"></script>
</head>

<body>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <main>
        <?php echo $template_output; ?>
    </main>
    <?php require_once __DIR__ . '/footer.inc'; ?>
</body>

</html>