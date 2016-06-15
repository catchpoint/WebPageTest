<?php
if(extension_loaded('newrelic')) { 
  newrelic_add_custom_tracer('GetTestStatus');
  newrelic_add_custom_tracer('calculatePageStats');
  newrelic_add_custom_tracer('xmlDomains');
  newrelic_add_custom_tracer('xmlBreakdown');
  newrelic_add_custom_tracer('xmlRequests');
  newrelic_add_custom_tracer('GetVisualProgress');
  newrelic_add_custom_tracer('ArchiveApi');
}

$msStart = microtime(true);

//$debug=true;
require_once('common.inc');
require_once('page_data.inc');
require_once('testStatus.inc');
require_once('video/visualProgress.inc.php');
require_once('domains.inc');
require_once('breakdown.inc');
require_once('devtools.inc.php');
require_once('archive.inc');

require_once 'include/XmlResultGenerator.php';
require_once 'include/FileHandler.php';
require_once 'include/TestInfo.php';
require_once 'include/TestRunResult.php';

error_reporting(E_ALL);

// see if we are sending abbreviated results
$pagespeed = 0;
if (array_key_exists('pagespeed', $_REQUEST))
  $pagespeed = (int)$_REQUEST['pagespeed'];

if( isset($test['test']) && $test['test']['batch'] )
    BatchResult($id, $testPath);
else
{
    // see if the test is actually finished
    $status = GetTestStatus($id);
    if( isset($test['test']['completeTime']) )
    {
        $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
        $path = substr($testPath, 1);

        $pageData = loadAllPageData($testPath);

        $msLoad = microtime(true);

        // if we don't have an url, try to get it from the page results
        if( !strlen($url) )
            $url = $pageData[1][0]['URL'];

        header ('Content-type: text/xml');
        header("Cache-Control: no-cache, must-revalidate");
        header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
        echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        echo "<response>\n";
        echo "<statusCode>200</statusCode>\n";
        echo "<statusText>Ok</statusText>\n";
        if( array_key_exists('r', $_REQUEST) && strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>\n";
        echo "<data>\n";
        
        // spit out the calculated averages
        $fv = null;
        $rv = null;
        $pageStats = calculatePageStats($pageData, $fv, $rv);
        
        echo "<testId>$id</testId>\n";
        if( FRIENDLY_URLS )
            echo "<summary>$protocol://$host$uri/result/$id/</summary>\n";
        else
            echo "<summary>$protocol://$host$uri/results.php?test=$id</summary>\n";
        if (isset($test['testinfo']))
        {
            if( @strlen($test['testinfo']['url']) )
                echo "<testUrl>" . xml_entities($test['testinfo']['url']) . "</testUrl>\n";
            if( @strlen($test['testinfo']['location']) ) {
                $locstring = $test['testinfo']['location'];
                if( @strlen($test['testinfo']['browser']) )
                    $locstring .= ':' . $test['testinfo']['browser'];
                echo "<location>$locstring</location>\n";
            }
            if ( @strlen($test['test']['location']) )
                echo "<from>" . xml_entities($test['test']['location']) . "</from>\n";
            if( @strlen($test['testinfo']['connectivity']) )
            {
                echo "<connectivity>{$test['testinfo']['connectivity']}</connectivity>\n";
                echo "<bwDown>{$test['testinfo']['bwIn']}</bwDown>\n";
                echo "<bwUp>{$test['testinfo']['bwOut']}</bwUp>\n";
                echo "<latency>{$test['testinfo']['latency']}</latency>\n";
                echo "<plr>{$test['testinfo']['plr']}</plr>\n";
            }
            if( isset($test['testinfo']['mobile']) )
                echo "<mobile>" . xml_entities($test['testinfo']['mobile']) .   "</mobile>\n";
            if( @strlen($test['testinfo']['label']) )
                echo "<label>" . xml_entities($test['testinfo']['label']) . "</label>\n";
            if( @strlen($test['testinfo']['completed']) )
                echo "<completed>" . gmdate("r",$test['testinfo']['completed']) . "</completed>\n";
            if( @strlen($test['testinfo']['tester']) )
                echo "<tester>" . xml_entities($test['testinfo']['tester']) . "</tester>\n";
            if( @strlen($test['testinfo']['testerDNS']) )
                echo "<testerDNS>" . xml_entities($test['testinfo']['testerDNS']) . "</testerDNS>\n";
        }
        $runs = max(array_keys($pageData));
        echo "<runs>$runs</runs>\n";
        echo "<successfulFVRuns>" . CountSuccessfulTests($pageData, 0) . "</successfulFVRuns>\n";
        if( isset($rv) ) {
            echo "<successfulRVRuns>" . CountSuccessfulTests($pageData, 1) . "</successfulRVRuns>\n";
        }
        echo "<average>\n";
        echo "<firstView>\n";
        foreach( $fv as $key => $val ) {
          $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
          echo "<$key>" . number_format($val,0, '.', '') . "</$key>\n";
        }
        echo "</firstView>\n";
        if( isset($rv) )
        {
            echo "<repeatView>\n";
            foreach( $rv as $key => $val ) {
              $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
              echo "<$key>" . number_format($val,0, '.', '') . "</$key>\n";
            }
            echo "</repeatView>\n";
        }
        echo "</average>\n";
        echo "<standardDeviation>\n";
        echo "<firstView>\n";
        foreach( $fv as $key => $val ) {
          $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
          echo "<$key>" . PageDataStandardDeviation($pageData, $key, 0) . "</$key>\n";
        }
        echo "</firstView>\n";
        if( isset($rv) )
        {
            echo "<repeatView>\n";
            foreach( $rv as $key => $val ) {
              $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
              echo "<$key>" . PageDataStandardDeviation($pageData, $key, 1) . "</$key>\n";
            }
            echo "</repeatView>\n";
        }
        echo "</standardDeviation>\n";

        $additionalInfo = array();
        if ($pagespeed) {
            $additionalInfo[] = XmlResultGenerator::INFO_PAGESPEED;
        }
        if (array_key_exists("requests", $_REQUEST) && $_REQUEST["requests"]) {
            $additionalInfo[] = XmlResultGenerator::INFO_MEDIAN_REQUESTS;
            if ($_REQUEST["requests"] != "median") {
                $additionalInfo[] = XmlResultGenerator::INFO_REQUESTS;
            }
        }
        if (array_key_exists('breakdown', $_REQUEST) && $_REQUEST['breakdown']) {
            $additionalInfo[] = XmlResultGenerator::INFO_MIMETYPE_BREAKDOWN;
        }
        if (array_key_exists('domains', $_REQUEST) && $_REQUEST['domains']) {
            $additionalInfo[] = XmlResultGenerator::INFO_DOMAIN_BREAKDOWN;
        }
        if (!isset($_GET['console']) || $_GET['console'] != 0) {
            $additionalInfo[] = XmlResultGenerator::INFO_CONSOLE;
        }

        $testInfo = TestInfo::fromValues($id, $testPath, $test);
        $xmlGenerator = new XmlResultGenerator($testInfo, "$protocol://$host$uri", new FileHandler(), $additionalInfo);

        // output the median run data
        $fvMedian = GetMedianRun($pageData, 0, $median_metric);
        if( $fvMedian )
        {
            echo "<median>\n";
            echo "<firstView>\n";
            $xmlGenerator->printMedianRun(TestRunResult::fromPageData($testInfo, $pageData, $fvMedian, false));
            echo "</firstView>\n";
            
            if( isset($rv) )
            {
                if (array_key_exists('rvmedian', $_REQUEST) && $_REQUEST['rvmedian'] == 'fv')
                  $rvMedian = $fvMedian;
                else
                  $rvMedian = GetMedianRun($pageData, 1, $median_metric);
                if($rvMedian)
                {
                    echo "<repeatView>\n";
                    $xmlGenerator->printMedianRun(TestRunResult::fromPageData($testInfo, $pageData, $rvMedian, true));
                    echo "</repeatView>\n";
                }
            }
            echo "</median>\n";
        }

        // spit out the raw data for each run
        for( $i = 1; $i <= $runs; $i++ )
        {
            echo "<run>\n";
            echo "<id>$i</id>\n";

            // first view
            if( isset( $pageData[$i] ) )
            {
                if (isset($pageData[$i][0])) {
                    echo "<firstView>\n";
                    $xmlGenerator->printRun(TestRunResult::fromPageData($testInfo, $pageData, $i, false));
                    echo "</firstView>\n";
                }

                // repeat view
                if( isset( $pageData[$i][1] ) ) {
                    echo "<repeatView>\n";
                    $xmlGenerator->printRun(TestRunResult::fromPageData($testInfo, $pageData, $i, true));
                    echo "</repeatView>\n";
                }
            }

            echo "</run>\n";
        }

        echo "</data>\n";
        echo "</response>\n";

        $msElapsed = number_format( microtime(true) - $msStart, 3 );
        $msElapsedLoad = number_format( $msLoad - $msStart, 3 );
        logMsg("xmlResult ($id): {$msElapsed}s ({$msElapsedLoad}s to load page data)");
        ArchiveApi($id);
    }
    else
    {
        header ('Content-type: text/xml');
        header("Cache-Control: no-cache, must-revalidate");
        header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
        echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        echo "<response>\n";
        if( strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>\n";

        // see if it was a valid test
        if( $test['test']['runs'] )
        {
            if( isset($test['test']['startTime']) )
            {
                echo "<statusCode>101</statusCode>\n";
                echo "<statusText>Test Started</statusText>\n";
                echo "<data>\n";
                echo "<startTime>{$test['test']['startTime']}</startTime>\n";
                echo "</data>\n";
            }
            else
            {
                echo "<statusCode>100</statusCode>\n";
                echo "<statusText>Test Pending</statusText>\n";
            }
        }
        else
        {
            echo "<statusCode>404</statusCode>\n";
            echo "<statusText>Invalid Test ID: $id</statusText>\n";
            echo "<data>\n";
            echo "</data>\n";
        }

        echo "</response>\n";
    }
}

/**
* Send back the data for a batch test (just the list of test ID's)
* 
* @param mixed $id
* @param mixed $testPath
*/
function BatchResult($id, $testPath)
{
    header ('Content-type: text/xml');
    header("Cache-Control: no-cache, must-revalidate");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    echo "<response>";
    if( strlen($_REQUEST['r']) )
        echo "<requestId>{$_REQUEST['r']}</requestId>";

    $tests = null;
    if( gz_is_file("$testPath/bulk.json") )
        $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
    elseif( gz_is_file("$testPath/tests.json") )
    {
        $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
        $tests = array();
        $tests['variations'] = array();
        $tests['urls'] = array();
        foreach( $legacyData as &$legacyTest )
            $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
    }
        
    if( count($tests['urls']) )
    {
        echo "<statusCode>200</statusCode>";
        echo "<statusText>Ok</statusText>";
        if( strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>";
        $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');

        echo "<data>";
        foreach( $tests['urls'] as &$test )
        {
            echo "<test>";
            echo "<testId>{$test['id']}</testId>";
            echo "<testUrl>" . xml_entities($test['u']) . "</testUrl>";
            echo "<xmlUrl>$protocol://$host$uri/xmlResult/{$test['id']}/</xmlUrl>";
            echo "<userUrl>$protocol://$host$uri/result/{$test['id']}/</userUrl>";
            echo "<summaryCSV>$protocol://$host$uri/result/{$test['id']}/page_data.csv</summaryCSV>";
            echo "<detailCSV>$protocol://$host$uri/result/{$test['id']}/requests.csv</detailCSV>";
            echo "</test>";

            // go through all of the variations as well
            foreach( $test['v'] as $variationIndex => $variationId )
            {
                echo "<test>";
                echo "<testId>$variationId</testId>";
                echo "<testUrl>" . xml_entities(CreateUrlVariation($test['u'], $tests['variations'][$variationIndex]['q'])) . "</testUrl>";
                echo "<xmlUrl>$protocol://$host$uri/xmlResult/$variationId/</xmlUrl>";
                echo "<userUrl>$protocol://$host$uri/result/$variationId/</userUrl>";
                echo "<summaryCSV>$protocol://$host$uri/result/$variationId/page_data.csv</summaryCSV>";
                echo "<detailCSV>$protocol://$host$uri/result/$variationId/requests.csv</detailCSV>";
                echo "</test>";
            }
        }
        echo "</data>";
    }
    else
    {
        echo "<statusCode>404</statusCode>";
        echo "<statusText>Invalid Test ID: $id</statusText>";
        echo "<data>";
        echo "</data>";
    }

    echo "</response>";
}

?>
