<?php
// Module for extracting the Google CSI information from the network trace.
// It requires "id" in the params corresponding to a particular test. If the 
// "run" and "cached" param are present (when called from details.php), then
// it does Google CSI parsing only for the given cached/no-cached run.

// cd to the root directory.
chdir('..');

// Include for test related information.
include 'common.inc';
// Include for parsing the http requests from a run.
include 'object_detail.inc';

// Fill the required variables.
$runs = $test['test']['runs'];
OutputCSI($id, $testPath, $run, $cached, $runs);

/**
 * Main function of this module which outputs the csv as attachment.
 */
function OutputCSI($id, $testPath, $run, $cached, $runs)
{
	// Check whether a test-id and test-path are available.
	if ( is_null($id) || is_null($testPath))
        {
          header('HTTP/1.0 404 Not Found');
          return;
        }
	OutputCsvHeaders('csi.csv');
	// If it is for a particular run specified by the $run variable, then output
	// csi csv only for that run. Else, output for all.
	if ( !is_null($_GET['run']) )
        {
		ParseCsiForRun($id, $testPath, $run, $cached);
        }
	else if ( $runs )
        {
                for ( $run = 1; $run <= $runs; $run++ )
                {
			// First-view.
			ParseCsiForRun($id, $testPath, $run, FALSE);
			// Repeat-view.
			ParseCsiForRun($id, $testPath, $run, TRUE);
		}
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
function ParseCsiForRun($id, $testPath, $run, $cached)
{
	// Secure and haveLocations are not used but required by getRequests function.
	$secure;
	$haveLocations;
	$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
	foreach ( $requests as &$request )
	{
		// Parse the individual url parts.
		$url_parts = parse_url('http://' . $request['host'] . $request['url']);
		if ( $url_parts['path'] == '/csi' ) 
		{
			$csi_query = $url_parts['query'];
			parse_str($csi_query, $params);
			foreach ( $params as $param_name => $param_value )
			{
				if ( $param_name == 'rt' || $param_name == 'it'
					|| $param_name == 'irt' ) 
				{
					ParseSubParams($params, $param_name);
				}
			}
			OutputCsvFromParams($id, $run, $cached, $params);
		}
	}
}

/***
 * Parse the parameters embedded in query params as comma-separated pairs.
 */
function ParseSubParams(&$params, $combined_pairs)
{
	$combined_pair_list = split(',', $params[$combined_pairs]);
	foreach ($combined_pair_list as $item)
	{
		$pair = split('\.', $item);
		$params[$pair[0]] = $pair[1];
	}
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
?>
