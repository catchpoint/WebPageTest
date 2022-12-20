<!DOCTYPE html>
<html>

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
    global $test_is_private;
    global $noanalytics;
    global $page_title;
    global $page_description;
    global $cdnPath;
    global $support_link;

    $page_title ??= 'WebPageTest';
    $body_class = $body_class ? ' class="' . $body_class . '"' : '';

    ?>
    <title><?= $page_title; ?></title>
    <?php require_once __DIR__ . '/head.inc'; ?>
</head>

<body<?php echo $body_class; ?>>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <div id="main">
        <?php require_once __DIR__ . '/main_hed.inc'; ?>
        <?php echo $template_output; ?>
        <?php require_once __DIR__ . '/../../footer.inc'; ?>
    </div>
    </body>

</html>