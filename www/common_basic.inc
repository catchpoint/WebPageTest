<?php
/**
* Figure out the test path (relative) for the given test id
* 
* @param mixed $id
*/
function GetTestPath($id)
{
    $base = 'results';
    // see if it is a relay test (includes the key)
    if( strpos($id, '.') !== false ) {
        $parts = explode('.', $id);
        if( count($parts) == 2 ) {
            $key = trim($parts[0]);
            if( strlen($key) ) {
                $base .= "/relay/$key";
                $id = trim($parts[1]);
            }
        }
    }
    
    $testPath = "$base/$id";
    if( strpos($id, '_') == 6 ) {
        $parts = explode('_', $id);
        
        // see if we have an extra level of hashing
        $dir = $parts[1];
        if( count($parts) > 2 && strlen($parts[2]))
            $dir .= '/' . $parts[2];
        
        $testPath = "$base/" . substr($parts[0], 0, 2) . '/' . substr($parts[0], 2, 2) . '/' . substr($parts[0], 4, 2) . '/' . $dir;
    } else {
      global $settings;
      if( strlen($settings['olddir']) ) {
        if( $settings['oldsubdir'] )
            $testPath = "$base/{$settings['olddir']}/_" . strtoupper(substr($id, 0, 1)) . "/$id";
        else
            $testPath = "$base/{$settings['olddir']}/$id";
      }
    }

    return $testPath;
}

/**
* Get the key for a given location (and cache it if possible)
* 
* @param mixed $location
*/
function GetLocationKey($location) {
  $key = null;
  if (isset($location) && strlen($location)) {
    if (function_exists('apc_fetch') &&
        function_exists('apc_store')) {
      $key = apc_fetch("key_$location");
      if ($key === false) {
        $key = '';
        $locations = parse_ini_file('./settings/locations.ini', true);
        if ($locations !== false &&
            is_array($locations) &&
            array_key_exists($location, $locations) &&
            array_key_exists('key', $locations[$location]))
          $key = $locations[$location]['key'];
        apc_store("key_$location", $key, 60);
      }
    } else {
      $locations = parse_ini_file('./settings/locations.ini', true);
      if ($locations !== false &&
          is_array($locations) &&
          array_key_exists($location, $locations) &&
          array_key_exists('key', $locations[$location]))
        $key = $locations[$location]['key'];
    }
  }
  return $key;
}
?>