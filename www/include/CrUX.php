<?php
// Helper to get the CrUX data for a given URL
function GetCruxDataForURL($url, $mobile=FALSE) {
    $crux_data = null;
    $api_key = GetSetting('crux_api_key', null);
    if (isset($api_key) && strlen($api_key) && strlen($url)) {
        if (substr($url, 0, 4) != 'http') {
            $url = 'http://' . $url;
        }

        $cache_key = sha1($url);
        if ($mobile)
            $cache_key .= '.mobile';
        $crux_data = GetCachedCruxData($cache_key);

        if (!isset($crux_data)) {
            $options = array(
                'url'=> $url,
                'formFactor' => $mobile ? 'PHONE' : 'DESKTOP'
            );
            $result = http_post_raw(
                "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$api_key",
                json_encode($options),
                'application/json',
                true);
            if (isset($result) && is_string($result))
                $crux_data = $result;
                
            CacheCruxData($cache_key, $crux_data);
        }
    }
    return $crux_data;
}

function GetCachedCruxData($cache_key) {
    $crux_data = null;
    $today = gmdate('Ymd');
    $cache_path = __DIR__ . "/../results/crux_cache/$today/" . substr($cache_key, 0, 2) . "/$cache_key.json";
    if (file_exists($cache_path))
        $crux_data = file_get_contents($cache_path);

    return $crux_data;
}

function CacheCruxData($cache_key, $crux_data) {
    if (isset($crux_data) && strlen($crux_data)) {
        $today = gmdate('Ymd');
        $cache_path = __DIR__ . "/../results/crux_cache/$today/" . substr($cache_key, 0, 2);
        mkdir($cache_path, 0777, true);
        $cache_path .= "/$cache_key.json";
        file_put_contents($cache_path, $crux_data);
    }
}

// Delete any cache directories that don't match the current date
function PruneCruxCache() {
    $cache_path = __DIR__ . '/../results/crux_cache';
    if (is_dir($cache_path)) {
        $today = gmdate('Ymd');
        $files = scandir($cache_path);
        foreach($files as $file) {
            if ($file !== '.' && $file != '..' && $file != $today) {
                delTree("$cache_path/$file");
            }
        }
    }
}
