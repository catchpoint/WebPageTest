<?php
require_once('utils.inc');?>
<style type="text/css">
	#result{
		text-align: left;
	}
</style>
<h3 class="slide_header">Request Details</h3>
<?php

foreach ($requests as $eventName => $eventRequests)
{ ?>
<div class="center">
	<a name="request_details<?= getEventNameID($eventName); ?>"></a>
	<h2 name="request_details<?= getEventNameID($eventName); ?>" id="slide_opener_request_details<?= getEventNameID($eventName); ?>" data-slideid="requestdetails<?= getEventNameID($eventName); ?>" class="slide_opener close_accordeon"><?php echo $eventName; ?></h2>
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

<?php include('./ads/details_bottom.inc'); ?>
<br>
<script type="text/javascript"
		src="//ajax.googleapis.com/ajax/libs/jquery/1.7/jquery.min.js"></script>
<h3 class="slide_header">Request Headers</h3>
	<?php
	foreach($requests as $eventName => $eventRequests){ ?>
		<a name="request_headers<?= getEventNameID($eventName); ?>"></a>
		<h2 name="request_headers<?= getEventNameID($eventName); ?>" id="slide_opener_request_headers<?= getEventNameID($eventName); ?>" data-slideid="requestheaders<?= getEventNameID($eventName); ?>" class="slide_opener close_accordeon" align="center"><?php echo $eventName; ?></h2>
		<div id="requestheaders<?= getEventNameID($eventName); ?>" class="hide_on_load" data-waterfallcontainer="requestheaderscontainer-<?= getEventNameID($eventName); ?>" data-eventname="<?= $eventName ?>">
			<div id="requestheaderscontainer-<?= getEventNameID($eventName); ?>" style="width:930px"></div>
		</div>
	<?php
	}	?>
</div>