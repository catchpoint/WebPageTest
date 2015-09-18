<?php

/******************************************************************************
 *
*   Export a result data set  in HTTP archive format:
*   http://groups.google.com/group/firebug-working-group/web/http-tracing---export-format
*
******************************************************************************/

include 'common.inc';
require_once('har.inc.php');
			$pageData = loadPageRunData($testPath, $run, $cached, array('allEvents' => true, 'allLevels' => true));
			$pageData = loadPageRunData($testPath, $run, 0, array('allEvents' => true, 'allLevels' => true));
			$pageData = loadPageRunData($testPath, $run, 1, array('allEvents' => true, 'allLevels' => true));
		$pageData = loadAllPageData($testPath, array('allEvents' => true));

$options = array();
if (isset($_REQUEST['bodies']))
  $options['bodies'] = $_REQUEST['bodies'];
$options['cached'] = $cached;
if (isset($_REQUEST['php']))
  $options['php'] = $_REQUEST['php'];
if (isset($_REQUEST['pretty']))
  $options['pretty'] = $_REQUEST['pretty'];
if (isset($_REQUEST['run']))
  $options['run'] = $_REQUEST['run'];

$filename = '';
if (@strlen($url)) {
    $parts = parse_url($url);
    $filename = $parts['host'];
}
if (!strlen($filename))
    $filename = "pagetest";
$filename .= ".$id.har";
header("Content-disposition: attachment; filename=$filename");
header('Content-type: application/json');

// see if we need to wrap it in a JSONP callback
if( isset($_REQUEST['callback']) && strlen($_REQUEST['callback']) )
    echo "{$_REQUEST['callback']}(";

$json = GenerateHAR($id, $testPath, $options);
echo $json;

if( isset($_REQUEST['callback']) && strlen($_REQUEST['callback']) )
  echo ");";

* Build the data set
* 
* @param mixed $pageData
*/

	foreach($pageData as $eventName => $pageDataArray){
		foreach ($pageDataArray as $run => $pageRun) {
            $eventNumber = $data['eventNumber'];
				$pd['title'] .= "Event Name $eventName, ";
			$pd['id'] = "page_{$run}_{$eventNumber}_{$cached}";


				$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, true, true);
				foreach( $requests[$eventName] as &$r )








	}


?>
