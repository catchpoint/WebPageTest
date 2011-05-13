<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest Bulk test result<?php echo $testLabel; ?></title>
        <?php
            $gaTemplate = 'Bulk Result';
            include ('head.inc');
            include ('testStatus.inc');
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
                // Variable to track whether any test is still in-complete.
                $all_tests_completed = true;
                
                if( count($tests['variations']) )
                    $all_tests_completed = DisplayTestsWithVariations($tests);
                else
                    $all_tests_completed = DisplayTests($tests);

                if ($all_tests_completed)
                {
                    echo "<br>Download Combined Raw: <a href=\"/result/$id/{$id}_bulk_page_data.csv\">Page Data</a> - <a href=\"/result/$id/{$id}_bulk_requests.csv\">Object Data</a>";
                    echo "<br><br><a href=\"/aggregate.php?test=$id\">Download Aggregate Statistics</a>";
                }
                else
                {
                    echo "<br>Tests are not yet complete. Please <a href=\"javascript:location.reload(true)\">refresh</a> this page later to check on the status.";
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
function DisplayTests(&$tests)
{
    $all_tests_completed = true;
    ?>
    <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
        <tr>
            <th align="center" class="border" valign="middle">Test</th>
            <th align="center" class="border" valign="middle">Median load time (First view)</th>
            <th align="center" class="border" valign="middle">Median load time (Repeat view)</th>
            <th align="center" class="border" valign="middle">Raw page data</th>
            <th align="center" class="border" valign="middle">Raw object data</th>
            <th align="center" class="border" valign="middle">Http archive (.har)</th>
        </tr>
    <?php
        foreach( $tests['urls'] as &$test )
        {
            $label = $test['l'];
            if( !strlen($label) )
                $label = htmlspecialchars(ShortenUrl($test['u']));
            if( !DisplayTest($test['id'], $test['u'], $label) )
                $all_tests_completed = false;
        }
    ?>
    </table>
    <?php
    return $all_tests_completed;
}

/**
* Display the test results as a comparison across multiple variations of a given test
* 
* @param mixed $tests
*/
function DisplayTestsWithVariations(&$tests)
{
    $all_tests_completed = true;
    ?>
    <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
        <tr>
            <th align="center" class="border" valign="middle">Test</th>
            <th align="center" class="border" valign="middle">Median load time (First view)</th>
            <th align="center" class="border" valign="middle">Median load time (Repeat view)</th>
            <th align="center" class="border" valign="middle">Raw page data</th>
            <th align="center" class="border" valign="middle">Raw object data</th>
            <th align="center" class="border" valign="middle">Http archive (.har)</th>
        </tr>
    <?php
        foreach( $tests['urls'] as &$test )
        {
            $label = $test['l'];
            if( !strlen($label) )
                $label = htmlspecialchars(ShortenUrl($test['u']));
            if( !DisplayTest($test['id'], $test['u'], $label) )
                $all_tests_completed = false;
            foreach( $test['v'] as $variationIndex => $variationId )
            {
                if( !DisplayTest($variationId, CreateUrlVariation($test['u'], $tests['variations'][$variationIndex]['q']), "$label - {$tests['variations'][$variationIndex]['l']}") )
                    $all_tests_completed = false;
            }
        }
    ?>
    </table>
    <?php
    return $all_tests_completed;
}

/**
* Display a single row of the data table
* 
* @param mixed $current_id
* @param mixed $current_url
* @param mixed $current_label
*/
function DisplayTest($current_id, $current_url, $current_label)
{
    $testComplete = true;
    $current_testPath = './' . GetTestPath($current_id);
    $current_test = parse_ini_file("$current_testPath/testinfo.ini",true);
    $fileUrl = GetFileUrl($current_url);

    echo '<tr>';
    $safeUrl = htmlspecialchars($current_url);
    echo "<td align=\"center\" class=\"border\" valign=\"middle\"><a href=\"/result/$current_id/\" title=\"$safeUrl\" target=\"_blank\">$current_label</a></td>";
    if( (isset($current_test['test']) && isset($current_test['test']['completeTime'])) )
    {
        $current_pageData = loadAllPageData($current_testPath);
        $fvMedian = GetMedianRun($current_pageData, 0);
        $rvMedian = GetMedianRun($current_pageData, 1);
        $rvMedian_column = '';
        if ($rvMedian)
            $rvMedian_column = number_format($current_pageData[$rvMedian][1]['loadTime'] / 1000.0, 3);
        echo "<td align=\"center\" class=\"border\" valign=\"middle\">" . number_format($current_pageData[$fvMedian][0]['loadTime'] / 1000.0, 3) . "</td>";
        echo "<td align=\"center\" class=\"border\" valign=\"middle\">$rvMedian_column</td>";
        echo "<td align=\"center\" class=\"border\" valign=\"middle\"><a href=\"/result/$current_id/{$current_id}_{$fileUrl}_page_data.csv\">Download Page Data</a></td>";
        echo "<td align=\"center\" class=\"border\" valign=\"middle\"><a href=\"/result/$current_id/{$current_id}_{$fileUrl}_requests.csv\">Download Object Data</a></td>";
        echo "<td align=\"center\" class=\"border\" valign=\"middle\"><a href=\"/export.php?test=$current_id\">Download HAR</a></td>";
    }
    else
    {
        $testComplete = false;
        echo '<td align="center" class="border" valign="middle" colspan="5">';
        echo GetTestStatusText($current_id, $current_test);
        $status = GetTestStatus($current_id);
        if( $status['statusCode'] == 101 )
            echo "( <a href=\"/cancelTest.php?test=$current_id\">Cancel Test</a> )";
        echo '</td>';
    }
    echo "</tr>\n";
    return $testComplete;
}
?>
