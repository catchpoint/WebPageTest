<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
// Synchronize dynamic data between servers. Currently consists of:
// secret: Shared secret to validate requests
// key: API Key used
// runs: Number of runs used by the given API key
// history: Test history log entry
require_once('common_lib.inc');
$secret = GetSetting('sync-secret');
if ($secret === false || !isset($_REQUEST['secret']) || $_REQUEST['secret'] != $secret) {
    http_response_code(403);
    die('Forbidden');
}

// API key usage
if (isset($_REQUEST['key']) && isset($_REQUEST['runs'])) {
    $key = $_REQUEST['key'];
    $runcount = intval($_REQUEST['runs']);
    $lock = Lock("API Keys");
    if( isset($lock) ) {
        $keyfile = './dat/keys_' . gmdate('Ymd') . '.dat';
        $usage = null;
        if( is_file($keyfile) )
          $usage = json_decode(file_get_contents($keyfile), true);
        if( !isset($usage) )
          $usage = array();
        if( isset($usage[$key]) )
          $used = (int)$usage[$key];
        else
          $used = 0;

        $used += $runcount;
        $usage[$key] = $used;
        file_put_contents($keyfile, json_encode($usage));

        Unlock($lock);
    }
}

// test history entry
if (isset($_REQUEST['history'])) {
    $filename = "./logs/" . gmdate("Ymd") . ".log";
    $log = $_REQUEST['history'];
    if (strlen($log)) {
        $log .= "\r\n";
        error_log($log, 3, $filename);
    }
}

?>