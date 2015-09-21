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

$type = "waterfall";
$file = generateViewImagePath($testPath, $eventName, $run, $cached, $type);
$dataArray = loadPageRunData($testPath, $run, $cached, array('SpeedIndex' => true, 'allEvents' => true));
$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, true, true, true);
?>

<a href="#quicklinks">Back to Quicklinks</a>
			<table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
				<tr>
					<td><table><tr><td><div class="bar" style="width:15px; background-color:#1f7c83"></div></td><td>DNS Lookup</td></tr></table></td>
					<td><table><tr><td><div class="bar" style="width:15px; background-color:#e58226"></div></td><td>Initial Connection</td></tr></table></td>
					<?php if($secure) { ?>
    <td><table><tr><td><div class="bar" style="width:15px; background-color:#c141cd"></div></td><td>SSL Negotiation</td></tr></table></td>
<?php } ?>
<td><table><tr><td><div class="bar" style="width:15px; background-color:#1fe11f"></div></td><td>Time to First Byte</td></tr></table></td>
<td><table><tr><td><div class="bar" style="width:15px; background-color:#1977dd"></div></td><td>Content Download</td></tr></table></td>
<td style="vertical-align:middle; padding: 4px;"><div style="background-color:#ffff60">&nbsp;3xx response&nbsp;</div></td>
<td style="vertical-align:middle; padding: 4px;"><div style="background-color:#ff6060">&nbsp;4xx+ response&nbsp;</div></td>
</tr>
</table>
<table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto; margin-top:11px;">
    <tr>
        <td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>
        <?php
        if (array_key_exists('aft', $data) && $data['aft'] )
            echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#FF0000"></div></td><td>Above the Fold</td></tr></table></td>';
        if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 )
            echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>';
        if(array_key_exists('firstPaint', $data) && (float)$data['firstPaint'] > 0.0 )
            echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#8FBC83"></div></td><td>msFirstPaint</td></tr></table></td>';
        if(array_key_exists('domContentLoadedEventStart', $data) && (float)$data['domContentLoadedEventStart'] > 0.0 )
            echo '<td><table><tr><td><div class="bar" style="width:15px; background-color:#D888DF"></div></td><td>DOM Content Loaded</td></tr></table></td>';
        if(array_key_exists('loadEventStart', $data) && (float)$data['loadEventStart'] > 0.0 )
            echo '<td><table><tr><td><div class="bar" style="width:15px; background-color:#C0C0FF"></div></td><td>On Load</td></tr></table></td>';
        echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>';
        if(array_key_exists('userTime', $data) || (array_key_exists('enable_google_csi', $settings) && $settings['enable_google_csi']))
            echo '<td><table><tr><td><div class="arrow-down"></div></td><td>User Timings</td></tr></table></td>';
        ?>
    </tr>
</table>
<br>

<?php
if($test_info['imageCaching']){
    if(!file_exists($file)){
        createImageAndSave($id, $testPath, $test_info, $eventName, $run, $cached, $dataArray[$eventName][$run][$cached], $type);
    }
    InsertWaterfall($url, $requests, $id, $run, $cached, '', $eventName, $file);
} else {
    InsertWaterfall($url, $requests, $id, $run, $cached, '', $eventName);
}

echo "<br><a href=\"/customWaterfall.php?width=930&test=$id&run=$run&cached=$cached&eventName=$eventName\">customize waterfall</a> &#8226; ";
echo "<a id=\"view-images\" href=\"/pageimages.php?test=$id&run=$run&cached=$cached&eventName=$eventName\">View all Images (for event name $eventName)</a>";
echo "<br/><br/><br/>";
?>
