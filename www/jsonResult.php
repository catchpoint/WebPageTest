<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
// Do a really quick check for a pending test to significantly reduce overhead
if (
    isset($_REQUEST['noposition']) &&
    $_REQUEST['noposition'] &&
    isset($_REQUEST['test']) &&
    strpos($_REQUEST['test'], '_') == 6
) {
    $base = __DIR__ . '/results';
    $parts = explode('_', $_REQUEST['test']);
    $dir = $parts[1];
    if (count($parts) > 2 && strlen($parts[2])) {
        $dir .= '/' . $parts[2];
    }
    $y = substr($parts[0], 0, 2);
    $m = substr($parts[0], 2, 2);
    $d = substr($parts[0], 4, 2);
    $pendingFile = "$base/$y/$m/$d/$dir/test.waiting";
    if (is_file($pendingFile)) {
        header("Content-type: application/json; charset=utf-8");
        header("Cache-Control: no-cache, must-revalidate", true);
        header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

        if (array_key_exists('callback', $_REQUEST) && strlen($_REQUEST['callback'])) {
            echo "{$_REQUEST['callback']}(";
        }
        echo "{\"statusCode\":101,\"statusText\":\"Test pending\",\"id\":\"{$_REQUEST['test']}\"";
        if (isset($_REQUEST['r'])) {
            echo ",\"requestId\":\"{$_REQUEST['r']}\"";
        }
        echo "}";
        if (isset($_REQUEST['callback']) && strlen($_REQUEST['callback'])) {
            echo ");";
        }
        exit;
    }
}

require_once('common.inc');
require_once INCLUDES_PATH . '/page_data.inc';
require_once INCLUDES_PATH . '/testStatus.inc';
require_once INCLUDES_PATH . '/video/visualProgress.inc.php';
require_once INCLUDES_PATH . '/breakdown.inc';
require_once INCLUDES_PATH . '/devtools.inc.php';
require_once INCLUDES_PATH . '/archive.inc';

require_once INCLUDES_PATH . '/include/JsonResultGenerator.php';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestResults.php';

if (isset($test['test']['batch']) && $test['test']['batch']) {
    $_REQUEST['f'] = 'json';
    include 'resultBatch.inc';
} else {
    $ret = array('data' => GetTestStatus($id));
    $ret['statusCode'] = $ret['data']['statusCode'];
    $ret['statusText'] = $ret['data']['statusText'];

    if ($ret['statusCode'] == 200) {
        $protocol = getUrlProtocol();
        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
        $urlStart = "$protocol://$host$uri";

        $testInfo = TestInfo::fromValues($id, $testPath, $test);
        $testResults = TestResults::fromFiles($testInfo);

        $infoFlags = getRequestInfoFlags();

        $jsonResultGenerator = new JsonResultGenerator($testInfo, $urlStart, new FileHandler(), $infoFlags, FRIENDLY_URLS);

        if (!empty($_REQUEST["multistepFormat"])) {
            $jsonResultGenerator->forceMultistepFormat(true);
        }

        if (defined("VER_WEBPAGETEST")) {
            $ret["webPagetestVersion"] = VER_WEBPAGETEST;
        }

        $type = $testInfo->getTestType();
        if ($type === 'lighthouse') {
            $json_file = "./$testPath/lighthouse.json";
            $ret['data'] = array('html_result_url' => "$urlStart/results.php?test=$id");
            if (gz_is_file($json_file)) {
                $ret['data']['lighthouse'] = json_decode(gz_file_get_contents($json_file), true);
            }
        } else {
            $ret['data'] = $jsonResultGenerator->resultDataArray($testResults, $median_metric);
        }

        ArchiveApi($id);
    }

    if (!empty($_REQUEST['highlight'])) {
        echo view('jsonhighlight', [
            'json' => json_encode($ret, JSON_PRETTY_PRINT),
        ]);
    } else {
        json_response($ret);
    }
}

function getRequestInfoFlags()
{
    $getFlags = array(
    "average" => JsonResultGenerator::WITHOUT_AVERAGE,
    "standard" => JsonResultGenerator::WITHOUT_STDDEV,
    "median" => JsonResultGenerator::WITHOUT_MEDIAN,
    "runs" => JsonResultGenerator::WITHOUT_RUNS,
    "requests" => JsonResultGenerator::WITHOUT_REQUESTS,
    "console" => JsonResultGenerator::WITHOUT_CONSOLE,
    "lighthouse" => JsonResultGenerator::WITHOUT_LIGHTHOUSE,
    "rv" => JsonResultGenerator::WITHOUT_REPEAT_VIEW
    );

    $infoFlags = array();
    foreach ($getFlags as $key => $flag) {
        if (isset($_GET[$key]) && $_GET[$key] == 0) {
            $infoFlags[] = $flag;
        }
    }
    if (!empty($_REQUEST["basic"])) {
        $infoFlags[] = JsonResultGenerator::BASIC_INFO_ONLY;
    }
    return $infoFlags;
}
