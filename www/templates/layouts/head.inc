<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
?>
<?php if (!isset($noanalytics)) {
    require_once __DIR__ . '/google-tag-manager.inc';
} ?>

<meta http-equiv="Content-type" content="text/html;charset=UTF-8">

<?php if (isset($page_keywords) && count($page_keywords)) : ?>
    <meta name="keywords" content="<?= implode(',', $page_keywords) ?>" />
<?php endif; ?>
<?php if (isset($page_description) && strlen($page_description)) : ?>
    <meta name="description" content="<?= $page_description ?>" />
<?php endif; ?>
<meta http-equiv="X-UA-Compatible" content="IE=Edge">
<meta name="viewport" content="width=device-width, initial-scale=1">


<link rel="apple-touch-icon" sizes="96x96" href="/assets/images/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="96x96" href="/assets/images/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">



<style>
    @font-face {
        font-family: 'Open Sans';
        src: url('/assets/fonts/opensans-light-webfont.woff2') format('woff2'),
            url('/assets/fonts/opensans-light-webfont.woff') format('woff');
        font-weight: 300;
        font-style: normal;
        font-display: swap;
    }

    @font-face {
        font-family: 'Open Sans';
        src: url('/assets/fonts/opensans-regular-webfont.woff2') format('woff2'),
            url('/assets/fonts/opensans-regular-webfont.woff') format('woff');
        font-weight: 500;
        font-style: normal;
        font-display: swap;
    }

    @font-face {
        font-family: 'Open Sans';
        src: url('/assets/fonts/opensans-bold-webfont.woff2') format('woff2'),
            url('/assets/fonts/opensans-bold-webfont.woff') format('woff');
        font-weight: 700;
        font-style: normal;
        font-display: swap;
    }
</style>
<?php

if (file_exists(SETTINGS_PATH . '/server/customhead.inc.php')) {
    include(SETTINGS_PATH . '/server/customhead.inc.php');
} elseif (file_exists(SETTINGS_PATH . '/common/customhead.inc.php')) {
    include(SETTINGS_PATH . '/common/customhead.inc.php');
} elseif (file_exists(SETTINGS_PATH . '/customhead.inc.php')) {
    include(SETTINGS_PATH . '/customhead.inc.php');
}
?>

<link rel="stylesheet" href="<?= "{$GLOBALS['cdnPath']}/assets/css/typography.css?v=" . constant('VER_TYPOGRAPHY_CSS') ?>">
<link rel="stylesheet" href="<?= "{$GLOBALS['cdnPath']}/assets/css/layout.css?v=" . constant('VER_LAYOUT_CSS') ?>">
<link rel="stylesheet" href="<?= "{$GLOBALS['cdnPath']}/assets/css/pagestyle2.css?v=" . constant('VER_CSS') ?>">
<link rel="stylesheet" href="<?= "{$GLOBALS['cdnPath']}/assets/css/wpt-header.css?v=" . constant('VER_HEADER_CSS') ?>">
<script src="<?= "{$GLOBALS['cdnPath']}/assets/js/wpt-header.js?v=" . constant('VER_JS') ?>" defer></script>


<?php
echo "<style>\n";

// switch to the private install logo if we're not running on webpagetest
$privateInstall = true;
$server_host = !is_null($request_context) ? $request_context->getHost() : null;
$server_host ??= isset($_SERVER) && isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
if (stristr($server_host, 'webpagetest.org') !== false) {
    $privateInstall = false;
}

$blkLogo = false;
if (isset($_REQUEST['color'])) {
    $color = html2rgb($_REQUEST['color']);
    if ($color) {
        echo "body {background-color: #{$_REQUEST['color']};}";
        $max = max($color[0], $color[1], $color[2]);
        if ($max >= 192) {
            $blkLogo = true;
        }
    }
}

if ($privateInstall) {
    if ($blkLogo) {
        echo ".logo a {background-image: url(/assets/images/logo_private_blk.png);}";
    } else {
        echo ".logo a {background-image: url(/assets/images/logo_private.png);}";
    }
} elseif ($blkLogo) {
    echo ".logo a {background-image: url(/assets/images/logo_blk.png);}";
}

// include a custom style if one exists
if (is_file(SETTINGS_PATH . '/custom.css')) {
    include(SETTINGS_PATH . '/custom.css');
}

echo "\n</style>\n";

// include the analytics code if it is appropriate
if (!isset($noanalytics)) {
    echo '<script>';
    require_once ASSETS_PATH . '/js/vendor/catchpoint-rum.js';
    echo '</script>';
}

if (isset($test_is_private) && !$test_is_private) {
    include INCLUDES_PATH . '/include/social_meta.php';
}

?>