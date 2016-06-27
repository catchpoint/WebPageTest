<?php

require_once __DIR__ . '/../object_detail.inc';

/**
 * Function for parsing the CSI data for a given run
 */
function ParseCsiInfo($id, $testPath, $run, $cached, $getAll, $generate = true) {
  if (!isset($testPath) || !strlen($testPath))
    $testPath = './' . GetTestPath($id);
  $localPaths = new TestPaths($testPath, $run, $cached);
  $rootUrlGenerator = UrlGenerator::create(false, "", $id, $run, $cached);
  return ParseCsiInfoForStep($rootUrlGenerator, $localPaths, $getAll, $generate);
}

/**
 * @param UrlGenerator $rootUrlGenerator To generate root URLS (without protocol & host) for this run / step
 * @param TestPaths $localPaths Paths of run or step to get the CSI Info for
 * @param $getAll
 * @param bool $generate
 * @return array|null
 */
function ParseCsiInfoForStep($rootUrlGenerator, $localPaths, $getAll, $generate = true) {
  $params = null;
  $cacheFile = $localPaths->csiCacheFile();
  $run = $localPaths->getRunNumber();
  $cached = $localPaths->isCachedResult() ? 1 : 0;
  if (gz_is_file($cacheFile)) {
    $cache = json_decode(gz_file_get_contents($cacheFile), true);
    // TODO(sburnicki): Adjust for multistep
    if (isset($cache) &&
        is_array($cache) &&
        array_key_exists($run, $cache) &&
        array_key_exists($cached, $cache[$run]))
      $params = $cache[$run][$cached];
  }
  if (!isset($params) && $generate) {
    $lock = Lock("CSI $cacheFile");
    if (isset($lock)) {
      if (gz_is_file($cacheFile))
        $cache = json_decode(gz_file_get_contents($cacheFile), true);
      if (!isset($cache) || !is_array($cache))
        $cache = array();
        
	    // Secure and haveLocations are not used but required by getRequests function.
	    $secure = null;
	    $haveLocations = null;
	    $requests = getRequestsForStep($localPaths, $rootUrlGenerator, $secure, $haveLocations, false);
      $params = array();
	    foreach ( $requests as &$request ) {
		    // Parse the individual url parts.
		    $url_parts = parse_url('http://' . $request['host'] . $request['url']);
		    if ($url_parts['path'] == '/csi' || $url_parts['path'] == '/csi_204' ||
            ($url_parts['path'] == '/gen_204' &&
             strpos($request['url'], 'atyp=csi') !== false)) {
			    $csi_query = $url_parts['query'];
			    parse_str($csi_query, $params);
			    foreach ($params as $param_name => $param_value) {
				    if ($param_name == 'rt' ||
                $param_name == 'it' ||
                $param_name == 'irt' ) {
					    ParseSubParams($params, $param_name);
              if( !$getAll ) {
                Unlock($lock);
                return $params;
              }
				    }
			    }
		    }
	    }
      if (!array_key_exists($run, $cache))
        $cache[$run] = array();
      // TODO(sburnicki): Adjust for multistep
      $cache[$run][$cached] = $params;
      gz_file_put_contents($cacheFile, json_encode($cache));
      Unlock($lock);
    }
  }
  return $params;
}

/***
 * Parse the parameters embedded in query params as comma-separated pairs.
 */
function ParseSubParams(&$params, $combined_pairs) {
	$combined_pair_list = explode(',', $params[$combined_pairs]);
	foreach ($combined_pair_list as $item) {
		$pair = explode('.', $item);
		$params[$pair[0]] = $pair[1];
	}
}

function TailorRtParamsForVisualization($params, $filter) {
    $info = array();
    if( array_key_exists('srt', $params) ) {
        $info['srt'] = $params['srt'];
        if (count($filter) > 0 ) { 
            foreach ($params as $name => $value) {
                if( array_key_exists($name, $filter) ) {
                    $info[$name] = $value + $info['srt'];
                }
            }
        }
    }
    return $info;
}

?>
