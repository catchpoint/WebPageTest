<?php
require_once('testStatus.inc');
$tests = null;
if( gz_is_file("$testPath/tests.json") )
{
    $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
    $tests = array();
    $tests['variations'] = array();
    $tests['urls'] = array();
    foreach( $legacyData as &$legacyTest )
        $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
}
elseif( gz_is_file("$testPath/bulk.json") )
    $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
    
$simpleView = false;
if( !strcasecmp($test['testinfo']['view'], 'simple') )
    $simpleView = true;

$complete = true;
$testHtml = '';
if( $simpleView )
    $testHtml = DisplaySimple($tests, $complete);
elseif( count($tests['variations']) )
    $testHtml = DisplayTestsWithVariations($tests, $complete);
else
    $testHtml = DisplayTests($tests, $complete);
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest Bulk test result<?php echo $testLabel; ?></title>
        <?php
        if( !$complete )
            echo "<meta http-equiv=\"refresh\" content=\"30\">\n";
        $gaTemplate = 'Bulk Result';
        include ('head.inc');
        ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            include 'header.inc';
            ?>
            <div id="result">
                <div id="download">
                    <div id="testinfo">
                        <b>Bulk Test</b><br>
                        From: <?php echo $test['test']['location'];?><br>
                        <?php echo GetTestInfoHtml(); ?>
                    </div>
                </div>
                <div class="cleared"></div>
                <br>
                <?php
                echo $testHtml;

                if ($complete)
                {
                    if( !$simpleView )
                    {
                        echo "<br>Download Combined Raw: <a href=\"/result/$id/{$id}_bulk_page_data.csv\">Page Data</a> - <a href=\"/result/$id/{$id}_bulk_requests.csv\">Object Data</a>";
                        echo "<br><br><a href=\"/aggregate.php?test=$id\">Download Aggregate Statistics</a>";
                    }
                }
                else
                {
                    echo "<br>Tests are not yet complete. Please wait while testing continues (this page will automatically update as testing progresses).";
                    echo "<br><br><a href=\"/cancelTest.php?test=$id\">Cancel all pending tests</a>";
                }
                ?>
            </div>
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php
/**
* Display a straight data table of the test results
* 
* @param mixed $tests
*/
function DisplayTests(&$tests, &$all_tests_completed)
{
    $all_tests_completed = true;
    $html = '<table id="batchResults" border="1" cellpadding="10" cellspacing="0">
        <tr>
            <th>Test</th>
            <th>Median load time (First view)</th>
            <th>Median load time (Repeat view)</th>
            <th>Raw page data</th>
            <th>Raw object data</th>
            <th>Http archive (.har)</th>
        </tr>';
    foreach( $tests['urls'] as &$test )
    {
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        $html .= DisplayTest($test['id'], $test['u'], $label, $all_tests_completed);
    }
    $html .= '</table>';
    return $html;
}

/**
* Display the test results as a comparison across multiple variations of a given test
* 
* @param mixed $tests
*/
function DisplayTestsWithVariations(&$tests, &$all_tests_completed)
{
    $all_tests_completed = true;
    $html = '<table id="batchResults" border="1" cellpadding="10" cellspacing="0">
        <tr>
            <th>Test</th>
            <th>Median load time (First view)</th>
            <th>Median load time (Repeat view)</th>
            <th>Raw page data</th>
            <th>Raw object data</th>
            <th>Http archive (.har)</th>
        </tr>';
    foreach( $tests['urls'] as &$test )
    {
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        $html .= DisplayTest($test['id'], $test['u'], $label, $all_tests_completed);
        foreach( $test['v'] as $variationIndex => $variationId )
            $html .= DisplayTest($variationId, CreateUrlVariation($test['u'], $tests['variations'][$variationIndex]['q']), "$label - {$tests['variations'][$variationIndex]['l']}", $all_tests_completed);
    }
    $html .= '</table>';

    return $html;
}

/**
* Display a single row of the data table
* 
* @param mixed $current_id
* @param mixed $current_url
* @param mixed $current_label
*/
function DisplayTest($current_id, $current_url, $current_label, &$all_tests_completed)
{
    $html = '';
    $current_testPath = './' . GetTestPath($current_id);
    $current_test = parse_ini_file("$current_testPath/testinfo.ini",true);
    $fileUrl = GetFileUrl($current_url);

    $html .= '<tr>';
    $safeUrl = htmlspecialchars($current_url);
    $html .= "<td><a href=\"/result/$current_id/\" title=\"$safeUrl\" target=\"_blank\">$current_label</a></td>";
    if( (isset($current_test['test']) && isset($current_test['test']['completeTime'])) )
    {
        $current_pageData = loadAllPageData($current_testPath);
        $fvMedian = GetMedianRun($current_pageData, 0);
        $rvMedian = GetMedianRun($current_pageData, 1);
        $rvMedian_column = '';
        if ($rvMedian)
            $rvMedian_column = number_format($current_pageData[$rvMedian][1]['loadTime'] / 1000.0, 3);
        $html .= "<td>" . number_format($current_pageData[$fvMedian][0]['loadTime'] / 1000.0, 3) . "</td>";
        $html .= "<td>$rvMedian_column</td>";
        $html .= "<td><a href=\"/result/$current_id/{$current_id}_{$fileUrl}_page_data.csv\">Download Page Data</a></td>";
        $html .= "<td><a href=\"/result/$current_id/{$current_id}_{$fileUrl}_requests.csv\">Download Object Data</a></td>";
        $html .= "<td><a href=\"/export.php?test=$current_id\">Download HAR</a></td>";
    }
    else
    {
        $all_tests_completed = false;
        $html .= '<td colspan="5">';
        $html .= GetTestStatusText($current_id, $current_test);
        $status = GetTestStatus($current_id);
        if( $status['statusCode'] == 101 )
            $html .= "( <a href=\"/cancelTest.php?test=$current_id\">Cancel Test</a> )";
        $html .= '</td>';
    }
    $html .= "</tr>\n";
        
    return $html;
}

/**
* Display a simple comparison
* 
* @param mixed $tests
* @param mixed $complete
*/
function DisplaySimple(&$tests, &$complete)
{
    $html = '<table id="batchResults" border="1" cellpadding="10" cellspacing="0">
            <tr>
            <th></th>';
    $fvLoadTime = array();
    $fvRenderTimes = array();
    $rvLoadTimes = array();
    $rvRenderTimes = array();
    $count = 0;
    $fvonly = false;
    
    // get the relevant times and generate the header HTML
    foreach( $tests['urls'] as &$test )
    {
        $fvLoadTime = null;
        $fvRenderTime = null;
        $rvLoadTime = null;
        $rvRenderTime = null;
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        $id = $test['id'];
        $testPath = './' . GetTestPath($id);
        $current_test = parse_ini_file("$testPath/testinfo.ini",true);
        $html .= "<th><a href=\"/result/$id/\">$label</a></th>";
        if( $current_test['test']['fvonly'] )
            $fvonly = true;
        if( (isset($current_test['test']) && isset($current_test['test']['completeTime'])) )
        {
            $test['complete'] = true;
            $pageData = loadAllPageData($testPath);
            if( CountSuccessfulTests($pageData, 0) )
            {
                $fvMedian = GetMedianRun($pageData, 0);
                $fvLoadTime = $pageData[$fvMedian][0]['loadTime'];
                $fvRenderTime = $pageData[$fvMedian][0]['render'];
            }
            if( CountSuccessfulTests($pageData, 1) )
            {
                $rvMedian = GetMedianRun($pageData, 1);
                $rvLoadTime = $pageData[$rvMedian][1]['loadTime'];
                $rvRenderTime = $pageData[$rvMedian][1]['render'];
            }
        }
        else
        {
            $test['complete'] = false;
            $test['status'] = GetTestStatusText($id, $current_test);
            $complete = false;
        }
        $fvLoadTimes[$count] = $fvLoadTime;
        $fvRenderTimes[$count] = $fvRenderTime;
        $rvLoadTimes[$count] = $rvLoadTime;
        $rvRenderTimes[$count] = $rvRenderTime;
        $count++;
    }
    $html .= '</tr>';
    
    // FV Page load time
    if( $complete )
    {
        $html .= DisplayMetric('Page Load Time', $fvLoadTimes, $count);
        $html .= DisplayMetric('Start Render Time', $fvRenderTimes, $count);
        $html .= DisplayMetric('Repeat View Page Load Time', $rvLoadTimes, $count);
        $html .= DisplayMetric('Repeat View Start Render Time', $rvRenderTimes, $count);
    }
    else
    {
        $html .= "<tr><td>Test Status</td>";
        foreach( $tests['urls'] as &$test )
        {
            $html .= '<td>';
            if( $test['complete'] )
                $html .= 'Complete';
            else
                $html .= $test['status'];
            $html .= '</td>';
        }
        $html .= '</tr>';
    }
    $html .= '</table>';
    
    return $html;
}

/**
* Generate the HTML for one metric in simple view
* 
* @param mixed $metric
* @param mixed $values
* @param mixed $count
*/
function DisplayMetric($metric, &$values, $count)
{
    // the actual values
    $html .= "<tr><td class=\"right\"><b>$metric</b></td>";
    for( $i = 0; $i < $count; $i++ )
    {
        $html .= '<td>';
        if ($values[$i])
            $html .= number_format( $values[$i] / 1000.0, 3) . 's';
        $html .= '</td>';
    }
    $html .= '</tr>';
    
    // the deltas
    $html .= '<tr><td class="right">Difference</td>';
    $baseline = $values[0];
    for( $i = 0; $i < $count; $i++ )
    {
        if ($values[$i] && $baseline > 0 && $i)
        {
            $delta = $values[$i] - $baseline;
            $pct = number_format(abs($delta / $baseline) * 100.0, 1);
            $class = '';
            $direction = '';
            if( $delta > 0 )
            {
                $direction = '+';
                $class = 'bad';
            }
            elseif( $delta < 0 )
                $class = 'good';
            $html .= "<td class=\"$class\">$direction" . number_format( $delta / 1000.0, 3) . "s ($pct%)</td>";
        }
        else
            $html .= '<td></td>';
    }
    $html .= '</tr>';
    return $html;
}
?>
