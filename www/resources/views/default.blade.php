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
    global $socialDesc;
    global $useScreenshot;
    global $socialTitle;
    global $socialImage;
    global $pageURI;
    global $support_link;

    $page_title = $page_title ? $page_title : 'WebPageTest';
    if ($_REQUEST['screenshot']) {
        if ($body_class) {
            $body_class .= " screenshot";
        } else {
            $body_class = "screenshot";
        }
    }

    $body_class = $body_class ? ' class="' . $body_class . '"' : '';

    ?>
    <title>{{ $page_title ?? 'WebPageTest' }}</title>
    <?php require_once __DIR__ . '/../../templates/layouts/head.inc'; ?>
    @yield('style')
</head>

<body {!!$body_class !!}>
    <?php require_once __DIR__ . '/../../templates/layouts/header.inc'; ?>
    <div id="main">
        <?php require_once __DIR__ . '/../../templates/layouts/main_hed.inc'; ?>
        <?php echo $results_header; ?>
        @yield('content')
        <?php require_once __DIR__ . '/../../footer.inc'; ?>
    </div>
    </body>

</html>