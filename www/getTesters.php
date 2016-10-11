<?php

include 'common.inc';
$remote_cache = array();
if ($CURL_CONTEXT !== false) {
  curl_setopt($CURL_CONTEXT, CURLOPT_CONNECTTIMEOUT, 30);
  curl_setopt($CURL_CONTEXT, CURLOPT_TIMEOUT, 30);
}

// load the locations
$locations = GetAllTesters();

// kick out the data
if( array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'json' ) {
  $ret = array();
  $ret['statusCode'] = 200;
  $ret['statusText'] = 'Ok';
  $ret['data'] = $locations;
  json_response($ret);
} elseif( array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'html' ) {
  $refresh = 240;
  $title = 'WebPagetest - Tester Status';
  include 'admin_header.inc';
  echo "<table class=\"table\">\n";
  foreach( $locations as $name => &$location ) {
    $error = ' danger';
    $elapsed = '';
    if (array_key_exists('elapsed', $location)) {
      $elapsed = " ({$location['elapsed']} minutes)";
      if ($location['elapsed'] < 30)
        $error = ' success';
    }
    echo "<tr id=\"$name\"><th class=\"header$error\" colspan=\"16\">" . htmlspecialchars($name) . "$elapsed</th></tr>\n";
    if (array_key_exists('testers', $location)) {
      echo "<tr><th class=\"tester\">Tester</th><th>Busy?</th><th>Last Check (minutes)</th><th>Last Work (minutes)</th><th>Version</th><th>PC</th><th>EC2 Instance</th><th>CPU Utilization</th><th>Error Rate</th><th>Free Disk (GB)</th><th>Screen Size</th>";
      echo "<th>IE Version</th><th>Windows Version</th><th>GPU?</th><th>IP</th><th>DNS Server(s)</th></tr>\n";
      $count = 0;
      foreach($location['testers'] as $tester) {
        $count++;
        echo "<tr><td class=\"tester\">$count</td>";
        echo "<td>" . @htmlspecialchars($tester['busy']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['elapsed']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['last']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['version']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['pc']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['ec2']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['cpu']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['errors']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['freedisk']) . "</td>";
        if (empty($tester['screenwidth']) || empty($tester['screenwidth'])) {
          echo "<td></td>";
        } else {
          echo "<td>" . @htmlspecialchars($tester['screenwidth']) . "x" . @htmlspecialchars($tester['screenheight']) . "</td>";
        }
        echo "<td>" . @htmlspecialchars($tester['ie']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['winver']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['GPU']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['ip']) . "</td>";
        echo "<td>" . @htmlspecialchars($tester['dns']) . "</td>";
        echo "</tr>";
      }
    }
  }
  echo "</table>\n";
  include 'admin_footer.inc';

} else {
    header ('Content-type: text/xml');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<?xml-stylesheet type=\"text/xsl\" encoding=\"UTF-8\" href=\"getTesters.xsl\" version=\"1.0\"?>\n";
    echo "<response>\n";
    echo "<statusCode>200</statusCode>\n";
    echo "<statusText>Ok</statusText>\n";
    if( array_key_exists('r', $_REQUEST) && strlen($_REQUEST['r']) )
        echo "<requestId>{$_REQUEST['r']}</requestId>\n";
    echo "<data>\n";

    foreach( $locations as $name => &$location )
    {
        echo "<location>\n";
        echo "<id>$name</id>\n";
        foreach( $location as $key => &$value )
        {
            if( is_array($value) )
            {
                echo "<testers>\n";
                foreach( $value as $index => &$tester )
                {
                    echo "<tester>\n";
                    $count = $index + 1;
                    echo "<index>$count</index>\n";
                    foreach( $tester as $k => &$v )
                    {
                        if (is_array($v))
                          $v = '';
                        if (htmlspecialchars($v)!=$v)
                            echo "<$k><![CDATA[$v]]></$k>\n";
                        else
                            echo "<$k>$v</$k>\n";
                    }
                    echo "</tester>\n";
                }
                echo "</testers>\n";
            }
            else
            {
                if (htmlspecialchars($value)!=$value)
                    echo "<$key><![CDATA[$value]]></$key>\n";
                else
                    echo "<$key>$value</$key>\n";
            }
        }
        echo "</location>\n";
    }

    echo "</data>\n";
    echo "</response>\n";
}

/**
* Load the location information and extract just the end nodes
*
*/
function GetAllTesters() {
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
  
  $i = 1;
  while (isset($loc['locations'][$i])) {
    $group = &$loc[$loc['locations'][$i]];
    $j = 1;
    while (isset($group[$j])) {
      if (isset($loc[$group[$j]]['relayServer']) && strlen($loc[$group[$j]]['relayServer']) &&
          isset($loc[$group[$j]]['relayLocation']) && strlen($loc[$group[$j]]['relayLocation'])) {
        $locations[$loc[$group[$j]]['location']] = GetRemoteTesters($loc[$group[$j]]['relayServer'], $loc[$group[$j]]['relayLocation']);
      } else {
        $locations[$loc[$group[$j]]['location']] = GetTesters($loc[$group[$j]]['location']);
      }

      $j++;
    }

    $i++;
  }
  
  return $locations;
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
