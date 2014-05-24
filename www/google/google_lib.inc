<?php

require_once('./object_detail.inc');

/**
 * Function for parsing the CSI data for a given run
 */
function ParseCsiInfo($id, $testPath, $run, $cached, $getAll, $generate = true) {
  $params = null;
  $cacheFile = "$testPath/csi.json";
  if (gz_is_file($cacheFile)) {
    $cache = json_decode(gz_file_get_contents($cacheFile), true);
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
	    $secure;
	    $haveLocations;
	    $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
      $params = array();
	    foreach ( $requests as &$request ) {
		    // Parse the individual url parts.
		    $url_parts = parse_url('http://' . $request['host'] . $request['url']);
		    if ($url_parts['path'] == '/csi' ||
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
