<?php
include 'utils.inc';
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');


$id = urldecode($_REQUEST['id']);
$testPath = urldecode($_REQUEST['testPath']);
$eventName = urldecode($_REQUEST['eventName']);
$run = $_REQUEST['run'];
$cached = $_REQUEST['cached'];
$test_info = json_decode(urldecode($_REQUEST['testInfo']),true);
$secure = $_REQUEST['secure'];
$haveLocations = $_REQUEST['haveLocations'];

$dataArray = loadPageRunData($testPath, $run, $cached, array('SpeedIndex' => true, 'allEvents' => true));
$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, true, true, true);
?>

<a href="#quicklinks">Back to Quicklinks</a>
<map name="connection_map<?= $eventName ?>">
    <?php
    $connection_rows = GetConnectionRows($requests[$eventName], true);
    $options = array(
        'id' => $id,
        'path' => $testPath,
        'run_id' => $run,
        'is_cached' => (bool)@$_GET['cached'],
        'use_cpu' => true,
        'show_labels' => true,
        'width' => 930
    );
    $map = GetWaterfallMap($connection_rows, $eventName, $options, $data);
    foreach($map as $entry) {
        if (array_key_exists('request', $entry)) {
            $index = $entry['request'] + 1;
            $title = "$index: " . htmlspecialchars($entry['url']);
            echo "<area href=\"#request$index\" alt=\"$title\" title=\"$title\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
        } elseif(array_key_exists('url', $entry)) {
            echo "<area href=\"#request\" alt=\"{$entry['url']}\" title=\"{$entry['url']}\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
        }
    }
    ?>
</map>
<table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
    <tr>
        <td><table><tr><td><div class="bar" style="width:15px; background-color:#007B84"></div></td><td>DNS Lookup</td></tr></table></td>
        <td><table><tr><td><div class="bar" style="width:15px; background-color:#FF7B00"></div></td><td>Initial Connection</td></tr></table></td>
        <?php if($secure) { ?>
            <td><table><tr><td><div class="bar" style="width:15px; background-color:#CF25DF"></div></td><td>SSL Negotiation</td></tr></table></td>
        <?php } ?>
        <td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>
        <?php if(checkForAllEventNames($dataArray, 'domTime', '>', 0.0, "float") ) { ?>
            <td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>
        <?php } ?>
        <?php if(array_key_exists('domContentLoadedEventStart', $data) && (float)$data['domContentLoadedEventStart'] > 0.0 ) { ?>
            <td><table><tr><td><div class="bar" style="width:15px; background-color:#D888DF"></div></td><td>DOM Content Loaded</td></tr></table></td>
        <?php } ?>
        <?php if(array_key_exists('loadEventStart', $data) && (float)$data['loadEventStart'] > 0.0 ) { ?>
            <td><table><tr><td><div class="bar" style="width:15px; background-color:#C0C0FF"></div></td><td>On Load</td></tr></table></td>
        <?php } ?>
        <td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>
    </tr>
</table>
<br> <img class="progress" alt="Connection View waterfall diagram"
          usemap="#connection_map<?= $eventName ?>"
          id="connectionView<?= $eventName ?>"
          src="<?php
          if($test['testinfo']['imageCaching']){
              $type = "connection";
              $file = generateViewImagePath($testPath, $eventName, $run, $cached, $type);
              if(!file_exists($file)){
                  createImageAndSave($id, $testPath, $test['testinfo'], $eventName, $run, $cached, $data[$run][$cached], $type);
              }
              echo substr($file, 1);
          } else {
              echo "/waterfall.php?type=connection&width=930&test=$id&run=$run&cached=$cached&mime=1&eventName=$eventName";
          }
          ?>">
<br /> <br /> <br />
