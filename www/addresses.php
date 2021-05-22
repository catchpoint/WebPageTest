<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
if (isset($_REQUEST['k'])) {
  $keys_file = __DIR__ . '/settings/keys.ini';
  if (file_exists(__DIR__ . '/settings/common/keys.ini'))
    $keys_file = __DIR__ . '/settings/common/keys.ini';
  if (file_exists(__DIR__ . '/settings/server/keys.ini'))
    $keys_file = __DIR__ . '/settings/server/keys.ini';
  $keys = parse_ini_file($keys_file, true);
  if (isset($keys['server']['key']) && $_REQUEST['k'] == $keys['server']['key']) {
    $admin = true;
  }
}
$remote_cache = array();
if ($CURL_CONTEXT !== false) {
  curl_setopt($CURL_CONTEXT, CURLOPT_CONNECTTIMEOUT, 30);
  curl_setopt($CURL_CONTEXT, CURLOPT_TIMEOUT, 30);
}

// load the locations
$addresses = GetAllAddresses($admin);

// kick out the data
if( array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'json' ) {
  $ret = array();
  $ret['statusCode'] = 200;
  $ret['statusText'] = 'Ok';
  $ret['data'] = $addresses;
  json_response($ret);
} else {
  $title = 'WebPageTest - Tester IP Addresses';
  include 'admin_header.inc';
  echo "<table class=\"table\">\n";
  echo "<tr><th nowrap class=\"header\">Location</th><th nowrap class=\"header\">IP Addresses</th></tr>";
  foreach( $addresses as $name => $location ) {
    echo "<tr id=\"$name\"><td nowrap>" . htmlspecialchars($name);
    if (isset($location['label'])) {
      echo ' : ' . htmlspecialchars($location['label']);
    }
    echo "</td><td>";
    $first = true;
    foreach($location['addresses'] as $address) {
        if (!$first)
            echo ', ';
        echo htmlspecialchars($address);
        $first = false;
    }
    echo "</td></tr>";
  }
  echo "</table>\n";
  include 'admin_footer.inc';
}

/**
* Load the location information and extract just the end nodes
*
*/
function GetAllAddresses($include_sensitive = true) {
  $locations = array();
  $loc = LoadLocationsIni();

  if (isset($_REQUEST['location'])) {
    $location = $_REQUEST['location'];
    $new = array('locations' => array('1' => 'group', 'default' => 'group'),
                 'group' => array('1' => $location, 'default' => $location, 'label' => 'placeholder'));
    if (isset($loc[$_REQUEST['location']]))
      $new[$_REQUEST['location']] = $loc[$_REQUEST['location']];
    $loc = $new;
  }

  BuildLocations($loc);
  FilterLocations($loc, $include_sensitive);

  $i = 1;
  while (isset($loc['locations'][$i])) {
    $group = &$loc[$loc['locations'][$i]];
    $j = 1;
    while (isset($group[$j])) {
      if (isset($loc[$group[$j]]['relayServer']) && strlen($loc[$group[$j]]['relayServer']) &&
          isset($loc[$group[$j]]['relayLocation']) && strlen($loc[$group[$j]]['relayLocation'])) {
        $locations[$loc[$group[$j]]['location']] = GetRemoteTesters($loc[$group[$j]]['relayServer'], $loc[$group[$j]]['relayLocation']);
      } else {
        $locations[$loc[$group[$j]]['location']] = GetTesters($loc[$group[$j]]['location'], false, $include_sensitive);
        if (isset($loc[$group[$j]]['label'])) {
          $label = $loc[$group[$j]]['label'];
          $index = strpos($label, ' - ');
          if ($index > 0)
            $label = substr($label, 0, $index);
          $locations[$loc[$group[$j]]['location']]['label'] = $label;
        }
        if (isset($loc[$group[$j]]['scheduler_node']))
          $locations[$loc[$group[$j]]['location']]['node'] = $loc[$group[$j]]['scheduler_node'];
      }

      $j++;
    }

    $i++;
  }

  // Go through and build a list of IP addresses for each location
  $addresses = array();
  foreach( $locations as $name => $location ) {
    $addresses[$name] = array('id' => $name, 'addresses' => array());
    if (isset($location['label'])) {
      $addresses[$name]['label'] = $location['label'];
    }
    if (isset($location['testers'])) {
      foreach($location['testers'] as $tester) {
        if (isset($tester['ip']) && !in_array($tester['ip'], $addresses[$name]['addresses'])) {
            $addresses[$name]['addresses'][] = $tester['ip'];
        }
      }
    }
  }

  return $addresses;
}

/**
* Get the tester information for a remote location
*/
function GetRemoteTesters($server, $remote_location) {
  $testers = array();
  global $remote_cache;

  $server_hash = md5($server);

  if (isset($_REQUEST['relay']) && $_REQUEST['relay']) {
    // see if we need to populate the cache from the remote server
    if (!isset($remote_cache[$server_hash])) {
      $xml = http_fetch("$server/getTesters.php?hidden=1");
      if ($xml) {
        $remote = json_decode(json_encode((array)simplexml_load_string($xml)), true);
        if (is_array($remote) && isset($remote['data']['location'])) {
          $cache_entry = array();
          foreach($remote['data']['location'] as &$location) {
            if (isset($location['testers']['tester'])) {
              $parts = explode(':', $location['id']);
              $id = $parts[0];
              if (isset($location['testers']['tester'][0]))
                $cache_entry[$id] = array('elapsed' => $location['elapsed'], 'testers' => $location['testers']['tester']);
              else
                $cache_entry[$id] = array('elapsed' => $location['elapsed'], 'testers' => array($location['testers']['tester']));
            }
          }
          $remote_cache[$server_hash] = $cache_entry;
        }
      }
    }

    if (isset($remote_cache[$server_hash][$remote_location]))
      $testers = $remote_cache[$server_hash][$remote_location];
  }

  return $testers;
}
?>
