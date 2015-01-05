<?php
// Module for extracting the Google CSI information from the network trace.
// It requires "id" in the params corresponding to a particular test. If the 
// "run" and "cached" param are present (when called from details.php), then
// it does Google CSI parsing only for the given cached/no-cached run.
// Also available: JSON output via &f=json and JSONP via &f=json&callback=foo.

// cd to the root directory.
chdir('..');

// Include for test related information.
include 'common.inc';
// Include for parsing the http requests from a run.
require_once('object_detail.inc');
require_once('google/google_lib.inc');

// Fill the required variables.
$runs = $test['test']['runs'];
$format = 'csv';
if (array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'json') {
  $format = 'json';
}
OutputCSI($id, $testPath, $run, $cached, $runs, $format);

/**
 * Main function of this module which outputs csv as attachment or json/jsonp.
 */
function OutputCSI($id, $testPath, $run, $cached, $runs, $format)
{
	// Check whether a test-id and test-path are available.
	if ( is_null($id) || is_null($testPath))
        {
          header('HTTP/1.0 404 Not Found');
          return;
        }
  $data = null;
  if ($format == 'csv')
    OutputCsvHeaders('csi.csv');
  else if ($format == 'json')
    $data = array();
	// If it is for a particular run specified by the $run variable, then output
	// csi only for that run. Else, output for all.
	if ( !is_null($_GET['run']) )
        {
		ParseCsiForRun($id, $testPath, $run, $cached, $data);
        }
	else if ( $runs )
        {
                for ( $run = 1; $run <= $runs; $run++ )
                {
			// First-view.
			ParseCsiForRun($id, $testPath, $run, FALSE, $data);
			// Repeat-view.
			ParseCsiForRun($id, $testPath, $run, TRUE, $data);
		}
	}
  if ($format == 'json') {
    json_response($data);
  }
}

/**
 * Output the headers required for the csv.
 */
function OutputCsvHeaders($filename) 
{
        header('HTTP/1.0 200 OK');
	header('Content-disposition: attachment; filename=' . $filename);
	header('Content-type: text/csv');
	echo '"id","run","cached","service","action","variable","value"';
	echo "\r\n";
}

/**
 * Function for parsing/outputting the CSI data for a given run
 */
function ParseCsiForRun($id, $testPath, $run, $cached, &$data)
{
        $params = ParseCsiInfo($id, $testPath, $run, $cached, true);
  if (!is_null($data))
    OutputJsonFromParams($id, $run, $cached, $params, $data);
  else
    OutputCsvFromParams($id, $run, $cached, $params);
}

/***
 * Function to output the values from the params map/array in csv format.
 */
function OutputCsvFromParams($id, $run, $cached, $params)
{
	if (!array_key_exists('s', $params) || $params['s'] == '')
		$params['s'] = 'None';
	if (!array_key_exists('action', $params) || $params['action'] == '')
		$params['action'] = 'None';

	foreach ($params as $param_name => $param_value)
	{
		if ($param_name == 's' || $param_name == 'action'
			|| $param_name == 'rt' || $param_name == 'it'
			|| $param_name == 'irt')
			continue;
		echo '"' . $id . '",';
		echo '"' . $run . '",';
		if ($cached == 1)
			echo '"true",';
		else
			echo '"false",';
		echo '"' . $params['s'] . '",';
		echo '"' . $params['action'] . '",';
	        echo '"' . $param_name . '",';
		echo '"' . $param_value . '"';
	        echo "\r\n";
	}
}

/***
 * Function to output the values from the params map/array in json format.
 */
function OutputJsonFromParams($id, $run, $cached, $params, &$data)
{
  if (!array_key_exists('s', $params) || $params['s'] == '')
    $params['s'] = 'None';
  if (!array_key_exists('action', $params) || $params['action'] == '')
    $params['action'] = 'None';

  foreach ($params as $param_name => $param_value) {
    if ($param_name == 's' || $param_name == 'action'
        || $param_name == 'rt' || $param_name == 'it'
        || $param_name == 'irt') {
      continue;
    }
    array_push($data, array(
      'id' => $id,
      'run' => $run,
      'cached' => $cached == 1,
      'service' => $params['s'],
      'action' => $params['action'],
      'variable' => $param_name,
      'value' => $param_value
    ));
  }
}
?>
