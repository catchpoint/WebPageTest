<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/common.inc';
require_once('page_data.inc');

if (array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'json') {
    include 'jsonResult.php';
} elseif (array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'xml') {
    include 'xmlResult.php';
} else {
    $pageData = loadAllPageData($testPath);

    // if we don't have an URL, try to get it from the page results
    if (!strlen($url) && isset($pageData[1][0]['URL'])) {
        $url = $pageData[1][0]['URL'];
    }
    if (isset($test['testinfo']['spam']) && $test['testinfo']['spam']) {
        include 'resultSpam.inc.php';
    } else {
        if (
            (isset($test['test']) && ( $test['test']['batch'] || $test['test']['batch_locations'] )) ||
            (!array_key_exists('test', $test) && array_key_exists('testinfo', $test) && $test['testinfo']['batch'])
        ) {
            include 'resultBatch.inc';
        } elseif (isset($test['testinfo']['cancelled'])) {
            include 'testcancelled.inc';
        } elseif (isset($test['test']['completeTime']) || file_exists("$testPath/test.complete")) {
            if (isset($test['test']['type']) && @$test['test']['type'] == 'traceroute') {
                include 'resultTraceroute.inc';
            } elseif (isset($test['test']['type']) && @$test['test']['type'] == 'lighthouse') {
                include 'lighthouse.php';
            } else {
                if (isset($_REQUEST['view']) && $_REQUEST['view'] == 'webvitals') {
                    include 'vitals.php';
                } else {
                    include 'result.inc';
                }
            }
        } else {
            include 'running.inc';
        }
    }
}
