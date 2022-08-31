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

    $page_title = $page_title ?? 'WebPageTest';
    $body_class = !empty($body_class) ? ' class=' . $body_class : '';

    ?>
    <title>{{ $page_title }}</title>
    <?php require_once __DIR__ . '/../../templates/layouts/head.inc'; ?>
    @yield('style')
</head>

<body {{$body_class }}>
    <?php require_once __DIR__ . '/../../templates/layouts/header.inc'; ?>
    <div id="main">
        <?php require_once __DIR__ . '/../../templates/layouts/main_hed.inc'; ?>
        <?php echo $results_header; ?>
        @yield('content')
        <?php require_once __DIR__ . '/../../footer.inc'; ?>
    </div>
</body>

</html>