<?php
require_once('./settings.inc');

$res = array();

// see if there is an existing test we are working with
if (LoadResults($res)) {
    echo "Preparing urls to be re-submitted\r\n";

        // go through and submit tests for any url where we don't have a test ID or where the test failed
    if (count($res)) {
        $count = 0;
        foreach ($res as &$result) {
            if (!array_key_exists('id', $result) ||
                !strlen($result['id']) || 
                !array_key_exists('result', $result) ||
                !strlen($result['result']) || 
                ($result['result'] != 0 && 
                 $result['result'] != 99999) ||
                 !$result['bytes'] ||
                 !$result['docComplete'] ||
                 !$result['ttfb'] ||
                 $result['ttfb'] > $result['docComplete'] ||
                 (isset($maxBandwidth) && $maxBandwidth && (($result['bytes'] * 8) / $result['docComplete']) > $maxBandwidth)) {
                $entry = array();
                $entry['url'] = $result['url'];
                $entry['location'] = $result['location'];
                $result = $entry;
                $count++;
            }
        }

        if ($count) {
            echo "$count tests prepared to be re-submitted\r\n";

            // store the results
            StoreResults($res);
            
            // now run the normal submit code
            include './submit.php';
        } else {
            echo "No tests need to be re-submitted\r\n";
        }
    } else {
        echo "No current test results found\r\n";
    }
}
