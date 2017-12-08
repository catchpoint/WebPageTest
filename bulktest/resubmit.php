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
            $stddev = 0;
            if (array_key_exists('docTime', $result) &&
                array_key_exists('docTime.stddev', $result) &&
                $result['docTime'] > 0)
                $stddev = ($result['docTime.stddev'] / $result['docTime']) * 100;
            if (!array_key_exists('id', $result) ||
                !strlen($result['id']) || 
                !array_key_exists('result', $result) ||
                !strlen($result['result']) || 
                ($result['result'] != 0 && 
                 $result['result'] != 99999) ||
                 !$result['bytesInDoc'] ||
                 !$result['docTime'] ||
                 !$result['TTFB'] ||
                 $result['TTFB'] > $result['docTime'] ||
                 $stddev > $maxVariancePct || // > 10% variation in results
                 (isset($maxBandwidth) && $maxBandwidth && (($result['bytesInDoc'] * 8) / $result['docTime']) > $maxBandwidth) ||
                 ($video && (!$result['SpeedIndex'] || !$result['render'] || !$result['visualComplete']))) {
                $result['resubmit'] = true;
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
