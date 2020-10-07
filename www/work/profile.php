<?php
// This processes profiler data uploaded from agents as JSON and logs it to the dat directory for further processing

// Load the profile data, parse it (to make sure it is valid) and then write it out to the log
$raw = file_get_contents('php://input');
if ($raw) {
    $obj = json_decode($raw, true);
    if ($obj) {
        $json = json_encode($obj);
        if (isset($json) && is_string($json) && strlen($json)) {
            $json .= "\n";
            $log_file = __DIR__ . '/../dat/' . date('ymd') . '_profile.json';
            error_log($json, 3, $log_file);
        }
    }
}