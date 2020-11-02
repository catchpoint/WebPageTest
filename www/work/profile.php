<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
// This processes profiler data uploaded from agents as JSON and logs it to the dat directory for further processing
chdir('..');
require_once('common.inc');

// Load the profile data, parse it (to make sure it is valid) and then write it out to the log
if (GetSetting('profile_data')) {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $obj = json_decode($raw, true);
        if ($obj) {
            $json = json_encode($obj);
            if (isset($json) && is_string($json) && strlen($json)) {
                $json .= "\n";
                $log_file = __DIR__ . '/../dat/profile.log';
                error_log($json, 3, $log_file);
            }
        }
    }
}