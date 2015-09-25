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
	foreach($requests as $eventName => $eventRequests){ ?>
		<a name="request_headers<?= getEventNameID($eventName); ?>"></a>
		<h3 name="request_headers<?= getEventNameID($eventName); ?>" id="slide_opener_request_headers<?= getEventNameID($eventName); ?>" data-slideid="requestheaders<?= getEventNameID($eventName); ?>" class="slide_opener close_accordeon" align="center">Request Headers - <?php echo $eventName; ?></h3>
		<div id="requestheaders<?= getEventNameID($eventName); ?>" class="hide_on_load" data-waterfallcontainer="requestheaderscontainer-<?= getEventNameID($eventName); ?>" data-eventname="<?= $eventName ?>">
			<div id="requestheaderscontainer-<?= getEventNameID($eventName); ?>" style="width:930px"></div>
		</div>
	<?php
	}	?>
</div>