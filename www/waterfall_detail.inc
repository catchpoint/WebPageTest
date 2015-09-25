<?php
require_once('utils.inc');?>
<style type="text/css">
	#result{
		text-align: left;
	}
</style>
<?php

foreach ($requests as $eventName => $eventRequests)
{ ?>
<div class="center">
	<a name="request_details<?= getEventNameID($eventName); ?>"></a>
	<h3 name="request_details<?= getEventNameID($eventName); ?>" id="slide_opener_request_details<?= getEventNameID($eventName); ?>" data-slideid="requestdetails<?= getEventNameID($eventName); ?>" class="slide_opener close_accordeon">Request Details - <?php echo $eventName; ?></h3>
	<div id="requestdetails<?= getEventNameID($eventName); ?>" class="hide_on_load" data-waterfallcontainer="requestdetailscontainer-<?= getEventNameID($eventName); ?>" data-eventname="<?= $eventName ?>">
		<div id="requestdetailscontainer-<?= getEventNameID($eventName); ?>" style="width:930px"></div>
	</div>
</div>
	<?php
}?>

<?php
if( $haveLocations)
	echo '<p class="center">*This product includes GeoLite data created by MaxMind, available from <a href="http://maxmind.com/">http://maxmind.com/</a>.</p>';
?>

<br>
<?php include('./ads/details_bottom.inc'); ?>
<br>
<script type="text/javascript"
		src="//ajax.googleapis.com/ajax/libs/jquery/1.7/jquery.min.js"></script>
	<?php
	print_r($requests,true);
	foreach($requests as $eventName => $eventRequests){
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
	}	?>
</div>