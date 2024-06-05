<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
use WebPageTest\Util;
use WebPageTest\Util\OAuth as CPOauth;
include 'common.inc';

$urls = $_REQUEST['url'];
$labels = $_REQUEST['label'];
$ids = array();
$ip = $_SERVER['REMOTE_ADDR'];
$headless = false;
if (GetSetting('headless')) {
    $headless = true;
}

$duplicates = false;
foreach ($urls as $index => $url) {
    $url = trim($url);
    if (strlen($url)) {
        foreach ($urls as $index2 => $url2) {
            $url2 = trim($url2);
            if ($index != $index2 && $url == $url2) {
                $duplicates = true;
            }
        }
    }
}

// Found duplicated url, display error
if ($duplicates) {
    DisplayError('Compared urls must be different.');
    exit();
}

if (!$duplicates && !$headless) {
    foreach ($urls as $index => $url) {
        $url = trim($url);
        if (strlen($url)) {
            $id = SubmitTest($url, $labels[$index]);
            if ($id && strlen($id)) {
                $ids[] = $id;
            }
        }
    }

    // now add the industry URLs
    if (isset($_REQUEST['t']) && is_array($_REQUEST['t']) && count($_REQUEST['t'])) {
        foreach ($_REQUEST['t'] as $tid) {
            $tid = trim($tid);
            if (strlen($tid)) {
                $ids[] = $tid;
            }
        }
    }
}

// if we were successful, redirect to the result page
if (count($ids)) {
    $idStr = '';
    if ($_GET['tid']) {
        $idStr = $_GET['tid'];
        if ($_GET['tidlabel']) {
            $idStr .= '-l:' . urlencode($_GET['tidlabel']);
        }
    }
    foreach ($ids as $id) {
        if (strlen($idStr)) {
            $idStr .= ',';
        }
        $idStr .= $id;
    }

    $protocol = getUrlProtocol();
    $compareUrl = "$protocol://" . $_SERVER['HTTP_HOST'] . "/video/compare.php?tests=$idStr";
    header("Location: $compareUrl");
} else {
    DisplayError();
}

/**
 * Submit a video test request with the appropriate parameters
 *
 * @param mixed $url
 * @param mixed $label
 */
function SubmitTest($url, $label)
{
    global $uid;
    global $user;
    global $ip;
    $id = null;

    $protocol = getUrlProtocol();
    $testUrl = "$protocol://" . $_SERVER['HTTP_HOST'] . '/runtest.php?';
    $testUrl .= 'f=xml&priority=2&runs=3&video=1&mv=1&fvonly=1&url=' . urlencode($url);
    if ($label && strlen($label)) {
        $testUrl .= '&label=' . urlencode($label);
    }
    if (
        isset($_REQUEST['profile']) && strlen($_REQUEST['profile']) &&
        (file_exists(__DIR__ . '/../settings/profiles.ini') ||
            file_exists(__DIR__ . '/../settings/common/profiles.ini') ||
            file_exists(__DIR__ . '/../settings/server/profiles.ini'))
    ) {
        $testUrl .= "&profile={$_REQUEST['profile']}";
    }
    if ($ip) {
        $testUrl .= "&addr=$ip";
    }
    if ($uid) {
        $testUrl .= "&uid=$uid";
    }
    if ($user) {
        $testUrl .= '&user=' . urlencode($uid);
    }
    $saml_cookie = GetSetting('saml_cookie', 'samlu');
    if (isset($_COOKIE[$saml_cookie])) {
        $testUrl .= '&samlu=' . urlencode($_COOKIE[$saml_cookie]);
    }

    if ($_REQUEST['vo']) {
        $testUrl .= "&vo={$_REQUEST['vo']}";
    }
    if ($_REQUEST['vd']) {
        $testUrl .= "&vd=" . urlencode($_REQUEST['vd']);
    }
    if ($_REQUEST['vh']) {
        $testUrl .= "&vh={$_REQUEST['vh']}";
    }

    $token_name = Util::getCookieName(CPOauth::$cp_access_token_cookie_key);
    $token_value = $_COOKIE[$token_name];
    if (isset($token_name) && isset($token_value)) {
        $context = stream_context_create(array("http" => array("header" => 'Cookie: ' . $token_name . '=' . $token_value . "\r\n"), "ignore_errors" => true, ));
        libxml_set_streams_context($context);
    }

    ini_set('user_agent', $_SERVER['HTTP_USER_AGENT']);

    // submit the request
    $result = simplexml_load_file($testUrl, 'SimpleXMLElement', LIBXML_NOERROR);
    if ($result && $result->data) {
        $id = (string) $result->data->testId;
    }

    return $id;
}

/**
 * Something went wrong, give them an error message
 *
 */
function DisplayError($message = 'There was an error running the test(s).')
{
    ?>
    <!DOCTYPE html>
    <html lang="en-us">
    <head>
        <title>WebPageTest - Visual Comparison</title>
        <?php include ('head.inc'); ?>
    </head>
    <body class='history'>
        <?php
        $tab = null;
        include 'header.inc';
        ?>

        <h1>
            <?php echo $message ?>
        </h1>

        <?php include ('footer.inc'); ?>
        </div>
    </body>
    </html>
    <?php
}
?>