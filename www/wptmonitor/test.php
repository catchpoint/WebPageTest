<?php
include 'utils.inc';
include 'wpt_functions.inc';
include 'bootstrap.php';

$userTable= Doctrine_Core::getTable('ShareWith');

$user = $userTable->find(1);

echo $user->ShareWithUser['Id'];





//sendEmailReport('tonyperkins@travelocity.com','testing',array('graph108825.png'));
//$url = 'cacheKey=&act=report&job_id[]=153&job_id[]=156&startTime=&endTime=&startMonth=10&startDay=23&startYear=2010&startHour=10&endMonth=10&endDay=30&endYear=2010&endHour=10&interval=10800&chartType=line&adjustUsing=AvgFirstViewStartRender&percentile=0.9&trimAbove=&trimBelow=&fields[]=FV_TTFB&fields[]=FV_Render&fields[]=FV_Doc&fields[]=RV_TTFB&fields[]=RV_Render&fields[]=RV_Doc';
//
//echo compressCrypt($url);
//echo "\n";
//echo decompressCrypt(compressCrypt($url));
////gets the data from a URL
//function get_tiny_url($url)  {
//	$ch = curl_init();
//	$timeout = 5;
//	curl_setopt($ch,CURLOPT_URL,'http://tinyurl.com/api-create.php?url='.$url);
//	curl_setopt($ch,CURLOPT_RETURNTRANSFER,1);
//	curl_setopt($ch,CURLOPT_CONNECTTIMEOUT,$timeout);
//	$data = curl_exec($ch);
//	curl_close($ch);
//	return $data;
//}

?>