<?php
require_once('./common.inc');
if (array_key_exists('original', $_REQUEST) && array_key_exists('optimized', $_REQUEST)) {
    $original = $_REQUEST['original'];
    $optimized = $_REQUEST['optimized'];
    if (ValidateTestId($original) && ValidateTestId($optimized)) {
        // Write out the fake testinfo (use the original test as a template)
        $today = new DateTime("now", new DateTimeZone('UTC'));
        $test = json_decode(gz_file_get_contents('./' . GetTestPath($original) . '/testinfo.json'), true);
        if (isset($test) && is_array($test) && count($test)) {
            $test['id'] = $today->format('ymd') . '_PSS_' . md5(uniqid(rand(), true));
            $test['path'] = './' . GetTestPath($test['id']);
            $test['batch'] = 1;
            $test['label'] = 'PageSpeed Service Comparison';
            if (array_key_exists('url', $test) && strlen($test['url']))
                $test['label'] .= ' for ' . $test['url'];
            $test['view'] = 'pss';
            if( !is_dir($test['path']) )
                mkdir($test['path'], 0777, true);
            gz_file_put_contents("./{$test['path']}/testinfo.json", json_encode($test));
            
            // write out the bulk test data
            $tests = array();
            $tests['variations'] = array();
            $tests['urls'] = array();
            $tests['urls'][] = array('u' => $test['url'], 'l' => 'Original', 'id' => $original);
            $tests['urls'][] = array('u' => $test['url'], 'l' => 'Optimized', 'id' => $optimized);
            gz_file_put_contents("./{$test['path']}/bulk.json", json_encode($tests));
            
            // redirect
            $url = "/results.php?test={$test['id']}";
            if (FRIENDLY_URLS)
                $url = "/result/{$test['id']}/";

            header("Location: http://{$_SERVER['HTTP_HOST']}$url");    
        } else {
            echo "Invalid Test.  Should be /create_pss.php?original=&LT;original test ID&GT;&optimized=&LT;optimized test ID&GT;";
        }            
    } else {
        echo "Invalid Test IDs.  Should be /create_pss.php?original=&LT;original test ID&GT;&optimized=&LT;optimized test ID&GT;";
    }
} else {
    echo "Invalid request.  Should be /create_pss.php?original=&LT;original test ID&GT;&optimized=&LT;optimized test ID&GT;";
}
?>
