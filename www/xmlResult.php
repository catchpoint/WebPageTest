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
require_once('breakdown.inc');
require_once('devtools.inc.php');
require_once('archive.inc');

require_once 'include/XmlResultGenerator.php';
require_once 'include/FileHandler.php';
require_once 'include/TestInfo.php';
require_once 'include/TestResults.php';
require_once 'include/TestStepResult.php';

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

        $testInfo = TestInfo::fromValues($id, $testPath, $test);
        $testResults = TestResults::fromFiles($testInfo);

        $msLoad = microtime(true);

        // if we don't have an url, try to get it from the page results
        if( !strlen($url) )
            $url = $testResults->getUrlFromRun();
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
        $urlStart = "$protocol://$host$uri";

        header ('Content-type: text/xml');
        header("Cache-Control: no-cache, must-revalidate");
        header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

        $requestId = empty($_REQUEST['r']) ? "" : $_REQUEST['r'];
        $xmlGenerator = new XmlResultGenerator($testInfo, $urlStart, new FileHandler(), $additionalInfo, FRIENDLY_URLS);

        if (!empty($_REQUEST["multistepFormat"])) {
            $xmlGenerator->forceMultistepFormat(true);
        }

        $medianFvOnly = (array_key_exists('rvmedian', $_REQUEST) && $_REQUEST['rvmedian'] == 'fv');
        $xmlGenerator->printAllResults($testResults, $median_metric, $requestId, $medianFvOnly);

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
