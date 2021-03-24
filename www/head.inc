<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
if( count($page_keywords) )
    echo '<meta name="keywords" content="' . implode(',', $page_keywords) . "\">\n";  //"
if( strlen($page_description) )
    echo "<meta name=\"description\" content=\"$page_description\">\n";
?>
<meta name="author" content="Patrick Meenan">
<meta http-equiv="X-UA-Compatible" content="IE=Edge"> 

<link rel="apple-touch-icon" sizes="192x192" href="/images/icons-192.png">
<link rel="icon" type="image/png" sizes="96x96" href="/images/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">

<?php 
    if(!isset($noanalytics) && extension_loaded('newrelic'))
        echo @newrelic_get_browser_timing_header();
    if (file_exists('./settings/server/customhead.inc.php')) {
        include('./settings/server/customhead.inc.php');
    } elseif (file_exists('./settings/common/customhead.inc.php')) {
        include('./settings/common/customhead.inc.php');
    } elseif (file_exists('./settings/customhead.inc.php')) {
        include('./settings/customhead.inc.php');
    }
    echo "<script type=\"text/javascript\">\n";
    if (is_file('./js/user-timing-min.js'))
      include('./js/user-timing-min.js');
    if (!isset($noanalytics) && is_file('./js/user-timing-rum-min.js'))
      include('./js/user-timing-rum-min.js');
    echo "\n</script>\n";
    echo "<link rel=\"stylesheet\" href=\"{$GLOBALS['cdnPath']}/pagestyle2.css?v=" . VER_CSS . "\" type=\"text/css\">\n";
    echo "<style type=\"text/css\">\n";
    
    // switch to the private install logo if we're not running on webpagetest
    $privateInstall = true;
    if( stristr($_SERVER['HTTP_HOST'] , 'webpagetest.org') !== false )
        $privateInstall = false;

    $blkLogo = false;
    if (isset($_REQUEST['color'])) {
        $color = html2rgb($_REQUEST['color']);
        if ($color) {
            echo "body {background-color: #{$_REQUEST['color']};}";
            $max = max($color[0], $color[1], $color[2]);
            if( $max >= 192 )
                $blkLogo = true;
        }
    }
            
    if( $privateInstall )
    {
        if( $blkLogo )
            echo ".logo a {background-image: url(/images/logo_private_blk.png);}";
        else
            echo ".logo a {background-image: url(/images/logo_private.png);}";
    }
    elseif( $blkLogo )
    {
        echo ".logo a {background-image: url(/images/logo_blk.png);}";
    }

    // include a custom style if one exists
    if( is_file('./settings/custom.css') )
        include('./settings/custom.css');

    echo "\n</style>\n";
        
    // include the analytics code if it is appropriate
    if (!isset($noanalytics))
        include('analytics.inc');
        
?>
