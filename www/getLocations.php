<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

use WebPageTest\Util;

if (Util::getSetting('cp_auth')) {
  $user = $request_context->getUser();
  if (!(isset($user) && $user->isAdmin())) {
    header('403 Forbidden');
    exit();
  }
} elseif (!$admin) {
    header('403 Forbidden');
    exit();
}

$remote_cache = array();
if ($CURL_CONTEXT !== false) {
  curl_setopt($CURL_CONTEXT, CURLOPT_CONNECTTIMEOUT, 30);
  curl_setopt($CURL_CONTEXT, CURLOPT_TIMEOUT, 30);
}

// load the locations
$locations = LoadLocations();

// get the backlog for each location
foreach( $locations as $id => &$location )
{
  if (strlen($location['relayServer']) && strlen($location['relayLocation'])) {
    $location['PendingTests'] = GetRemoteBacklog($location['relayServer'], $location['relayLocation']);
  } else {
    $location['PendingTests'] = GetBacklog($location['localDir'], $location['location']);
  }

  // calculate the ratio of pending tests to agents
  if (isset($location['PendingTests']['Total'])) {
    $location['PendingTests']['TestAgentRatio'] = $location['PendingTests']['Total'];
    $agent_count = 0;
    if (isset($location['PendingTests']['Testing']))
      $agent_count += $location['PendingTests']['Testing'];
    if (isset($location['PendingTests']['Idle']))
      $agent_count += $location['PendingTests']['Idle'];
    if ($agent_count > 0) {
      $location['PendingTests']['TestAgentRatio'] = floatval($location['PendingTests']['Total']) / floatval($agent_count);
    }
  }


  // strip out any sensitive data
  unset($location['localDir']);
}

// kick out the data
if( array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'json' ) {
  $ret = array();
  $ret['statusCode'] = 200;
  $ret['statusText'] = 'Ok';
  if (array_key_exists('location', $_REQUEST)) {
    if ($locations[$_REQUEST['location']]) {
      $ret['data'] = $locations[$_REQUEST['location']];
    } else {
      $ret['data']['error'] = "Invalid location specified.";
    }
  } else {
    $ret['data'] = $locations;
  }
  
  json_response($ret);
} elseif( array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'html' ) {
  $refresh = 240;
  $title = 'WebPageTest - Location Status';
  include 'admin_header.inc';
  if (array_key_exists('location', $_REQUEST) && !$locations[$_REQUEST['location']]) {
      echo "Invalid location";
  } else {
    echo "<table class=\"table\">\n";
    echo "<tr>
            <th class=\"location\">Location ID</th>
            <th>Description</th>
            <th>Idle Testers</th>
            <th>Total Tests</th>
            <th>Being Tested</th>
            <th>High Priority</th>
            <th>P1</th>
            <th>P2</th>
            <th>P3</th>
            <th>P4</th>
            <th>P5</th>
            <th>P6</th>
            <th>P7</th>
            <th>P8</th>
            <th>P9</th>
          </tr>\n";
      if (array_key_exists('location', $_REQUEST)) {
        outputHTMLRow($locations[$_REQUEST['location']]);
      } else {
        foreach( $locations as $name => &$location ) {
          outputHTMLRow($location);
        }
      }   

    echo "</table>\n";
    include 'admin_footer.inc';
  }
  
} else {
  header ('Content-type: text/xml');
  echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
  echo "<?xml-stylesheet type=\"text/xsl\" encoding=\"UTF-8\" href=\"getLocations.xsl\" version=\"1.0\"?>\n";
  echo "<response>\n";
  echo "<statusCode>200</statusCode>\n";
  echo "<statusText>Ok</statusText>\n";
  if( isset($_REQUEST['r']) && strlen($_REQUEST['r']) )
      echo "<requestId>{$_REQUEST['r']}</requestId>\n";
  echo "<data>\n";
  if (array_key_exists('location', $_REQUEST) && !$locations[$_REQUEST['location']]) {
    echo "<error>\n";
    echo "Invalid location\n";
    echo "</error>\n";
  } else if (array_key_exists('location', $_REQUEST)) {
    outputXMLRow($locations[$_REQUEST['location']]);
  } else {
    foreach ($locations as $name => &$location) {
      outputXMLRow($location);
    }
  }
  

  echo "</data>\n";
  echo "</response>\n";
}

/**
 * Output XML row for locations
 */
function outputXMLRow($location) {
  $name = $location['location'];
  echo "<location>\n";
  echo "<id>$name</id>\n";
  foreach ($location as $key => &$value) {
    if (is_array($value)) {
      echo "<$key>\n";
      foreach ($value as $k => &$v) {
        if (htmlspecialchars($v)!=$v)
          echo "<$k><![CDATA[$v]]></$k>\n";
        else
          echo "<$k>$v</$k>\n";
      }
      echo "</$key>\n";
    } else {
      if (htmlspecialchars($value)!=$value)
        echo "<$key><![CDATA[$value]]></$key>\n";
      else
        echo "<$key>$value</$key>\n";
    }
  }
  echo "</location>\n";
}

/**
 * Output table row for HTML view of locations
 */
function outputHTMLRow($location) {
  $error = '';
  $name = $location['location'];
  if (isset($location['PendingTests']['Total']) && $location['PendingTests']['Total'] > 1)
    $error = ' warning';
  if (!isset($location['status']) || $location['status'] == 'OFFLINE')
    $error = ' danger';
  echo "<tr id=\"$name\" class=\"$error\">";
  echo "<td class=\"location\">" . @htmlspecialchars($name) . "</td>" . PHP_EOL;
  $label = $location['labelShort'];
  if (isset($location['node'])) {
    $label .= " ({$location['node']})";
  }
  echo "<td>" . @htmlspecialchars($label) . "</td>" . PHP_EOL;
  if (array_key_exists('PendingTests', $location)) {
    echo "<td>" . @htmlspecialchars($location['PendingTests']['Idle']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['Total']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['Testing']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['HighPriority']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p1']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p2']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p3']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p4']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p5']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p6']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p7']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p8']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($location['PendingTests']['p9']) . "</td>" . PHP_EOL;
  }
  echo "</tr>";
}
/**
* Load the location information and extract just the end nodes
*
*/
function LoadLocations()
{
  $locations = array();
  $loc = LoadLocationsIni();
  if (isset($_REQUEST['k'])) {
    foreach ($loc as $name => $location) {
      if (isset($location['browser']) && isset($location['noapi'])) {
        unset($loc[$name]);
      }
    }
  }
  FilterLocations($loc);
  BuildLocations($loc);

  if( isset($loc['locations']['default']) )
    $default = $loc['locations']['default'];
  else
    $default = $loc['locations'][1];

  $i = 1;
  while( isset($loc['locations'][$i]) )
  {
    $group = &$loc[$loc['locations'][$i]];
    if (!isset($group['hidden']) || !$group['hidden'] || $_REQUEST['hidden']) {
      $label = $group['label'];

      if( isset($group['default']) )
          $def = $group['default'];
      else
          $def = $group[1];

      $j = 1;
      while( isset($group[$j]) )
      {
        if (isset($loc[$group[$j]]['location'])) {
          $loc_name = $loc[$group[$j]]['location'];
          if (!isset($loc[$group[$j]]['hidden']) || !$loc[$group[$j]]['hidden'] || $_REQUEST['hidden']) {
            if (isset($locations[$loc_name])) {
              $locations[$loc_name]['Browsers'] .= ',' . $loc[$group[$j]]['browser'];
            } else {
              $locations[$loc_name] = array( 'Label' => $label,
                                              'location' => $loc[$group[$j]]['location'],
                                              'Browsers' => $loc[$group[$j]]['browser'],
                                              'localDir' => $loc[$group[$j]]['localDir'],
                                              'status' => @$loc[$group[$j]]['status'],
                                              'labelShort' => $loc[$loc_name]['label'],
                                              );

              if (isset($loc[$group[$j]]['scheduler_node']))
                $locations[$loc_name]['node'] = $loc[$group[$j]]['scheduler_node'];
              if (isset($loc[$group[$j]]['relayServer']))
                $locations[$loc_name]['relayServer'] = $loc[$group[$j]]['relayServer'];
              if (isset($loc[$group[$j]]['relayLocation']))
                $locations[$loc_name]['relayLocation'] = $loc[$group[$j]]['relayLocation'];

              if ($default == $loc['locations'][$i] && $def == $group[$j])
                $locations[$loc_name]['default'] = true;

              if (isset($group['group']))
                $locations[$loc_name]['group'] = $group['group'];
            }
          }
        }
        $j++;
      }
    }
    $i++;
  }

  return $locations;
}

/**
* Get the backlog for the given directory
*
* @param mixed $dir
*/
function GetBacklog($dir, $locationId)
{
    $backlog = array();

    $userCount = 0;
    $lowCount = 0;
    $testing = 0;
    $idle = 0;
    for($i = 1; $i <= 9; $i++)
        $backlog["p$i"] = 0;

    $queue = GetQueueLengths($locationId);
    if (count($queue)) {
        $userCount = $queue[0];
        for( $i = 1; $i <= 9; $i++ ) {
            $backlog["p$i"] = $queue[$i];
            $lowCount += $queue[$i];
        }
        $ui_priority = intval(GetSetting('user_priority', 0));
        $backlog['Blocking'] = 0;
        for ($p = 0; $p <= $ui_priority; $p++) {
          if (isset($queue[$p])) {
            $backlog['Blocking'] += $queue[$p];
          }
      }
}

    $testers = GetTesters($locationId);
    if (isset($testers) && is_array($testers) && array_key_exists('testers', $testers)) {
        foreach($testers['testers'] as &$tester) {
            if( $tester['busy'] )
                $testing++;
            else
                $idle++;
        }
    }

    $backlog['Total'] = $userCount + $lowCount + $testing;
    $backlog['Queued'] = $userCount + $lowCount;
    $backlog['Blocking'] += $testing;
    $backlog['HighPriority'] = $userCount;
    $backlog['LowPriority'] = $lowCount;
    $backlog['Testing'] = $testing;
    $backlog['Idle'] = $idle;

    return $backlog;
}

/**
* Pull the location information from a remote server
*/
function GetRemoteBacklog($server, $remote_location) {
  $backlog = array();
  global $remote_cache;

  $server_hash = md5($server);

  if (array_key_exists('relay', $_REQUEST) && $_REQUEST['relay']) {
    // see if we need to populate the cache from the remote server
    if (!array_key_exists($server_hash, $remote_cache)) {
      $xml = http_fetch("$server/getLocations.php?hidden=1");
      if ($xml) {
        $remote = json_decode(json_encode((array)simplexml_load_string($xml)), true);
        if (is_array($remote) && array_key_exists('data', $remote) && array_key_exists('location', $remote['data'])) {
          $cache_entry = array();
          foreach($remote['data']['location'] as &$location) {
            $parts = explode(':', $location['id']);
            $id = $parts[0];
            $cache_entry[$id] = $location['PendingTests'];
          }
          $remote_cache[$server_hash] = $cache_entry;
        }
      }
    }

    if (array_key_exists($server_hash, $remote_cache) && array_key_exists($remote_location,$remote_cache[$server_hash])) {
        $backlog = $remote_cache[$server_hash][$remote_location];
    }
  }

  return $backlog;
}
?>
