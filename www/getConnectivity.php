<?php
include 'common.inc';
$remote_cache = array();
if ($CURL_CONTEXT !== false) {
  curl_setopt($CURL_CONTEXT, CURLOPT_CONNECTTIMEOUT, 30);
  curl_setopt($CURL_CONTEXT, CURLOPT_TIMEOUT, 30);
}

// load the connectivity config
$connectivities = parse_ini_file('./settings/connectivity.ini', true);

// kick out the data
if( array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'json' ) {
  $ret = array();
  $ret['statusCode'] = 200;
  $ret['statusText'] = 'Ok';
  $ret['data'] = $connectivities;
  json_response($ret);
} elseif( array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'html' ) {
  $title = 'WebPagetest - Connectivity Config';
  include 'admin_header.inc';

  echo "<table class=\"table\">\n";
  echo "<tr>
          <th class=\"location\">name</th>
          <th>label</th>
          <th>bwIn</th>
          <th>bwOut</th>
          <th>latency</th>
          <th>plr</th>
          <th>isDefault</th>
        </tr>\n";
  foreach( $connectivities as $name => &$connectivity ) {
    $error = '';
    echo "<tr id=\"$name\" class=\"$error\">";
    echo "<td class=\"location\">" . @htmlspecialchars($name) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($connectivity['label']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($connectivity['bwIn']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($connectivity['bwOut']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($connectivity['latency']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($connectivity['plr']) . "</td>" . PHP_EOL;
    echo "<td>" . @htmlspecialchars($connectivity['isDefault']) . "</td>" . PHP_EOL;
    echo "</tr>";
  }
  echo "</table>\n";
  include 'admin_footer.inc';
} else {
    header ('Content-type: text/xml');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<?xml-stylesheet type=\"text/xsl\" encoding=\"UTF-8\" href=\"getConnectivity.xsl\" version=\"1.0\"?>\n";
    echo "<response>\n";
    echo "<statusCode>200</statusCode>\n";
    echo "<statusText>Ok</statusText>\n";
    if( strlen($_REQUEST['r']) )
        echo "<requestId>{$_REQUEST['r']}</requestId>\n";
    echo "<data>\n";

    foreach( $connectivities as $name => &$connectivity ) {

        echo "<connectivity>\n";
        echo "<id>$name</id>\n";
        echo "<label>" . @htmlspecialchars($connectivity['label']) . "</label>\n";
        echo "<bwIn>" . @htmlspecialchars($connectivity['bwIn']) . "</bwIn>\n";
        echo "<bwOut>" . @htmlspecialchars($connectivity['bwOut']) . "</bwOut>\n";
        echo "<latency>" . @htmlspecialchars($connectivity['latency']) . "</latency>\n";
        echo "<plr>" . @htmlspecialchars($connectivity['plr']) . "</plr>\n";
        echo "<isDefault>" . @htmlspecialchars($connectivity['isDefault']) . "</isDefault>\n";
        echo "</connectivity>\n";
    }

    echo "</data>\n";
    echo "</response>\n";
}
?>
