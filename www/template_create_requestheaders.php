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
$eventRequests = $requests[$eventName];

echo "<br><hr><a name=\"request_headers".getEventNameID($eventName)."\"></a><h2>Request Headers - $eventName</h2><a href=\"#quicklinks\">Back to Quicklinks</a><br/><br/>";
echo '<p id="all_'.getEventNameID($eventName).'">+ <a href="javascript:setStateForAllByEventName(\''.getEventNameID($eventName).'\', true);"> Expand All Requests for Event Name"'.$eventName.'"</a></p>';
foreach($eventRequests as $reqNumber => $reqData){
    echo "<h4><a name=\"request".getEventNameID($eventName)."-".($reqNumber+1)."\"><span class=\"a_request\" id=\"request$requestNum\" data-target-id=\"headers_".getEventNameID($eventName)."_".($reqNumber+1)."\">+$eventName - Request #".($reqNumber+1)."</span></a></h4>";
    echo '<div class="header_details header_details_'.getEventNameID($eventName).'" id="headers_'.getEventNameID($eventName).'_'.($reqNumber+1).'">';
        echo "<br/>";
        echo "<p class=\"indented1\"><b>Details</b></p>";
        echo "<p id=\"requestDetails".getEventNameID($eventName)."-$reqNumber\" class=\"indented2\"></p>";
        echo "<p class=\"indented1\"><b>Request Headers</b></p>";
        echo "<p id=\"requestReqHeaders".getEventNameID($eventName)."-$reqNumber\" class=\"indented2\"></p>";
        echo "<p class=\"indented1\"><b>Response Headers</b></p>";
        echo "<p id=\"requestResHeaders".getEventNameID($eventName)."-$reqNumber\" class=\"indented2\"></p>";
    echo "</div>";
    echo "<b>Start Offset:</b> " . number_format($request['load_start'] / 1000.0, 3) . " s<br>\n";
    ?>
    <script type="text/javascript">
        var details = getRequestDetails(<?php echo "'$eventName'" ?>, <?php echo ($reqNumber+1); ?>, eResultType.DETAILS);
        $("#requestDetails<?php echo getEventNameID($eventName)."-".$reqNumber?>").html(details);
        var requestHeaders = getRequestDetails(<?php echo "'$eventName'" ?>, <?php echo ($reqNumber+1); ?>, eResultType.REQUEST_HEADERS);
        //requestHeaders = requestHeaders.replace(new RegExp("<br>", 'g'), "\n");
        $("#requestReqHeaders<?php echo getEventNameID($eventName)."-".$reqNumber?>").html(requestHeaders);
        var responseHeaders = getRequestDetails(<?php echo "'$eventName'" ?>, <?php echo ($reqNumber+1); ?>, eResultType.RESPONSE_HEADERS);
        $("#requestResHeaders<?php echo getEventNameID($eventName)."-".$reqNumber?>").html(responseHeaders);
    </script>

<?php
}
?>