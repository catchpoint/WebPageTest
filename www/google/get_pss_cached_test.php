<?php
chdir('..');
include 'common.inc';

// response will always be JSON/JSONP
$id = null;
$ret = array();
if (array_key_exists('url', $_REQUEST) && strlen($_REQUEST['url'])) {
    $id = PSS_GetCacheEntry($_REQUEST['url']);
}

if (isset($id) && strlen($id)) {
    $host  = $_SERVER['HTTP_HOST'];
    $ret['statusCode'] = 200;
    $ret['statusText'] = 'Ok';
    $ret['data'] = array();
    $ret['data']['testId'] = $id;
    $ret['data']['jsonUrl'] = "http://$host/results.php?test=$id&f=json";
    if (FRIENDLY_URLS) {
        $ret['data']['xmlUrl'] = "http://$host/xmlResult/$id/";
        $ret['data']['userUrl'] = "http://$host/result/$id/";
    } else {
        $ret['data']['xmlUrl'] = "http://$host/xmlResult.php?test=$id";
        $ret['data']['userUrl'] = "http://$host/results.php?test=$id";
    }
} else {
    $ret['statusCode'] = 404;
    $ret['statusText'] = 'Not Found';
}
json_response($ret);


/**
* Get a cached test result
*/
function PSS_GetCacheEntry($url) {
    $id = null;
    $cache_lock = fopen('./tmp/pss.cache.lock', 'w+');
    if ($cache_lock) {
        if (flock($cache_lock, LOCK_EX)) {
            if (is_file('./tmp/pss.cache')) {
                $cache = json_decode(file_get_contents('./tmp/pss.cache'), true);

                // delete stale cache entries
                $now = time();
                $dirty = false;
                foreach($cache as $cache_key => &$cache_entry) {
                    if ( $cache_entry['expires'] < $now) {
                        $dirty = true;
                        unset($cache[$cache_key]);
                    }
                }
                if ($dirty) {
                    file_put_contents('./tmp/pss.cache', json_encode($cache));
                }
                $key = md5($url);
                if (array_key_exists($key, $cache) && array_key_exists('id', $cache[$key])) {
                    $id = $cache[$key]['id'];
                }
            }
            flock($cache_lock, LOCK_UN);
        }
        fclose($cache_lock);
    }
    return $id;
}

?>
