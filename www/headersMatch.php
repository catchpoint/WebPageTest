<?php
include 'common.inc';
include 'testStatus.inc';
include 'page_data.inc';
include 'object_detail.inc';
require_once('lib/json.php');

set_time_limit(300);

$testIds = array();

// Get Test IDs
if( isset($_REQUEST['tests']) && strlen($_REQUEST['tests']) )
{
    $testIds = explode(',', $_REQUEST['tests']);
}
// Get the list of tests to match with
$searches = array();
if( isset($_REQUEST['searches']) && strlen($_REQUEST['searches']) )
{
    $searches = explode(',', $_REQUEST['searches']);
}

header("Content-disposition: attachment; filename={$id}_headersMatch.csv");
header("Content-type: text/csv");
    
// list of metrics that will be produced
// for each of these, the median, average and std dev. will be calculated
echo "\"Test ID\",\"Found\"\r\n";
        
// and now the actual data
foreach( $testIds as &$testId )
{
	$cached = 0;
	
	RestoreTest($testId);
        GetTestStatus($testId);
        $testPath = './' . GetTestPath($testId);
        $pageData = loadAllPageData($testPath);
	$medianRun = GetMedianRun($pageData, $cached);

	$secured = 0;
	$haveLocations=1;
	$requests = getRequests($testId, $testPath, $medianRun, $cached, $secure, $haveLocations, false,true);

	// Flag indicating if we matched
	$matched = 0;
	foreach( $requests as &$r )
	{
                if( isset($r['headers']) && isset($r['headers']['response']) )
                {
                    foreach($r['headers']['response'] as &$header)
                    {
			// Loop through the search conditions we received
			foreach($searches as &$search) 
			{
				if (strpos($header, $search) !== false ) {
					$matched = true;
					break;
				}
			}
		    }
		}

		if ($matched) {
			break;
		}
	}
	// Write the results
	echo "\"$testId\",\"$matched\"\r\n";
}    

?>
