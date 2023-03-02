<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once('common.inc');
set_time_limit(300);
$usingAPI = false;
$usingApi2 = false;
$forceValidate = false;
$apiKey = null;
$user_api_key = $request_context->getApiKeyInUse();
$error = null;

// load the secret key (if there is one)
$server_secret = GetServerSecret();
$api_keys = null;
if (!empty($user_api_key)) {
    $keys_file = SETTINGS_PATH . '/keys.ini';
    if (file_exists(SETTINGS_PATH . '/common/keys.ini')) {
        $keys_file = SETTINGS_PATH . '/common/keys.ini';
    }
    if (file_exists(SETTINGS_PATH . '/server/keys.ini')) {
        $keys_file = SETTINGS_PATH . '/server/keys.ini';
    }
    $api_keys = parse_ini_file($keys_file, true);
}
$ret = array();

if ($redis_server = GetSetting('redis_api_keys')) {
    // Check the redis-based API keys if it wasn't a local key
    try {
        $redis = new Redis();
        if ($redis->connect($redis_server, 6379, 30)) {
            $account = CacheFetch("APIkey_$user_api_key");
            if (!isset($account)) {
                $response = $redis->get("API_$user_api_key");
                if ($response && strlen($response)) {
                    $account = json_decode($response, true);
                    if (isset($account) && is_array($account)) {
                        CacheStore("APIkey_$user_api_key", $account, 60);
                    }
                }
            }
            if ($account && is_array($account) && isset($account['accountId']) && isset($account['expiration'])) {
              // Check the expiration (with a 2-day buffer)
                if (time() <= $account['expiration'] + 172800) {
                  // Check the balance
                    $response = $redis->get("C_{$account['accountId']}");
                    if (isset($response) && $response !== false && is_string($response) && strlen($response) && is_numeric($response)) {
                        $runs = array();
                        $runs['remaining'] = intval($response);
                        $ret['data'] = $runs;
                    } else {
                        $error = 'Error validating API Key Account';
                    }
                } else {
                    $error = 'API key expired';
                }
            } else {
                $error = 'Error validating API Key Account';
            }
        } else {
            $error = 'Error validating API Key Account';
        }
    } catch (Exception $e) {
        $error = 'Error validating API Key Account';
    }
}

if ($error !== null) {
    $ret['data']['error'] =  $error;
}
// spit out the response in the correct format
if (isset($_REQUEST['f']) && $_REQUEST['f'] == 'xml') {
    header('Content-type: text/xml');
    print_r(array2xml($ret, false));
} else {
    json_response($ret);
}
