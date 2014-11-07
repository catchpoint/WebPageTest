<?php

function header_link($url, $title) {
    $url_parts = explode('?', $url);
    $class = ($url_parts[0] == $_SERVER['SCRIPT_NAME'] ? 'active' : 'inactive');

    echo '<li class="' . $class . '"><a href="' . $url . '">' . $title . '</a></li>';
}


?><!doctype html>
<html>
    <head>
        <title><?=$title?></title>
        <link rel="stylesheet" href="/css/vendor/bootstrap-3.1.1.min.css">

        <?php
        if (!empty($refresh)) { ?>
            <noscript>
                <meta http-equiv="refresh" content="<?=$refresh?>" />
            </noscript>
            <script type="text/javascript">
                setTimeout("window.location.reload(true)", <?=$refresh*1000?>);
            </script>
        <?php
        } ?>

    </head>
    <body>
        <div id="wrap">
            <div class="navbar navbar-default" role="navigation">
                <div class="container">
                    <div class="navbar-header">
                        <a class="navbar-brand ff-semibold" href="/">WebPagetest Admin</a>
                    </div>
                    <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
                        <ul class="nav navbar-nav">
                            <?=header_link('/getLocations.php?f=html', 'Locations');?>
                            <?=header_link('/getTesters.php?f=html', 'Testers');?>
                            <?=header_link('/usage.php', 'Usage');?>
                            <?=header_link('/checkURLs.php', 'Check URLs');?>
                            <?=header_link('/checkIPs.php', 'Check IPs');?>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="container">


