<?php
set_time_limit(300);
if( !defined('BARE_UI') )
    define('BARE_UI', true);
require_once('testStatus.inc');
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
    
$simpleView = false;
if( !strcasecmp($test['testinfo']['view'], 'simple') )
    $simpleView = true;

$fvonly = false;
if( $test['test']['fvonly'] )
    $fvonly = true;

// run a quick check to see if the tests are complete
$dirty = false;
$complete = CheckTests($tests, $dirty);

// rewrite the bulk file if it changed
if( $dirty )
{
    gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
    $dirty = false;
}

$page_keywords = array('Bulk','Result','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Bulk website performance test result$testLabel.";
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest Comparison Test Result<?php echo $testLabel; ?></title>
        <?php
        if( !$complete )
        {
            ?>
            <noscript>
            <meta http-equiv="refresh" content="30" />
            </noscript>
            <script language="JavaScript">
            setTimeout( "window.location.reload(true)", 30000 );
            </script>
            <?php
        }
        $gaTemplate = 'Bulk Result';
        include ('head.inc');
        ?>
        <style type="text/css">
            #player
            {
                margin-left: auto;
                margin-right: auto;
            }
            #pimg {
                z-index: 999999;
                display: none;
                position: absolute;
            }
        </style>
        </style>
        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/video/player/flowplayer-3.2.6.min.js"></script>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            if( $simpleView )
            $navTabs = array(   'New Comparison' => FRIENDLY_URLS ? "/compare?pssid=$id" : "/pss.php?pssid=$id",
                                'Test Result' => FRIENDLY_URLS ? "/result/$id/" : "/results.php?test=$id",
                                'Page Speed Servce Home' => 'http://code.google.com/speed/pss', 
                                'Sample Tests' => 'http://code.google.com/speed/pss/gallery.html',
                                'Sign Up!' => 'https://docs.google.com/a/google.com/spreadsheet/viewform?hl=en_US&formkey=dDdjcmNBZFZsX2c0SkJPQnR3aGdnd0E6MQ');
            include 'header.inc';
            ?>
            <div id="result">
                <div id="download">
                    <div id="testinfo">
                        <?php
                            if( $test['test']['batch'] )
                            {
                                echo 'Tested From: ' . $test['test']['location'] . '<br>';
                            }
                            else if ( $test['test']['batch_locations'] )
                            {
                                echo 'Tested Url: ' . $test['testinfo']['url'] . '<br>';
                            }
                            if( !$simpleView )
                                echo GetTestInfoHtml(); 
                        ?>
                    </div>
                </div>
                <div class="cleared"></div>
                <?php
                if ($complete)
                {
                    if (strlen($test['testinfo']['label']))
                    {
                        $label = $test['testinfo']['label'];
                        $label = str_replace('PSS Comparison for', 'Page Speed Service Comparison for', $label);
                        echo "<h2>$label<br><span class=\"small\">(You can bookmark this page to come back or share the results with others)</span></h2>";
                    }
                }
                else
                    echo '<h2>Please wait while the testing is performed<br><span class="small">This page will automatically update until the test is complete</span></h2>';
                if( !$simpleView )
                    echo '<br>';

                if( $simpleView )
                    DisplaySimple($tests, $test['testinfo']['video'], $dirty);
                elseif( count($tests['variations']) )
                    DisplayTestsWithVariations($tests);
                else
                    DisplayTests($tests);

                // rewrite the bulk file if it changed
                if( $dirty )
                {
                    gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
                    $dirty = false;
                }

                if ($complete)
                {
                    if( !$simpleView )
                    {
                        if( FRIENDLY_URLS )
                            echo "<br>Download Combined Raw: <a href=\"/result/$id/{$id}_bulk_page_data.csv\">Page Data</a> - <a href=\"/result/$id/{$id}_bulk_requests.csv\">Object Data</a>";
                        else
                            echo "<br>Download Combined Raw: <a href=\"/csv.php?test=$id\">Page Data</a> - <a href=\"/csv.php?test=$id&requests=1\">Object Data</a>";
                        echo "<br><br><a href=\"/aggregate.php?test=$id\">Download Aggregate Statistics</a>";
                    }
                }
                else
                {
                    if( $simpleView )
                    {
                        ?>
                        <div class="left" style="width: 630px; margin-left: auto; margin-right: auto;">
                        <p>Here are some resources you can browse while you wait for testing to complete (all open in new browser tabs):</p>
                        <ul class="bullet_list">
                        <li><a href="http://code.google.com/speed/pss" target="_blank">Page Speed Service home page</a> - information about the service</li>
                        <li><a href="http://code.google.com/speed/pss/gallery.html" target="_blank">Sample Tests</a> - Tests for common types of sites optimized by the Page Speed Service</li>
                        </ul>
                        </div>
                        <?php
                    }
                    else
                        echo "<br><br><a href=\"/cancelTest.php?test=$id\">Cancel all pending tests</a>";
                }
                ?>
            </div>
            <?php include('footer.inc'); ?>
            <script type="text/javascript">
                /*
                 * jQuery Pimg (Preview image) 
                 * Written by Dave Earley ( http://Bitsntuts.com )
                 */
                function pimg()
                {
                    this.xOffset = 10;
                    this.yOffset = 300;
                    $("img.pimg").hover(function (e)
                    {
                        this.img_title = this.title;
                        this.title = "";
                        var img_src = $(this).attr('img_src');
                        var desc = (this.img_title != "") ? "<h3>" + this.img_title + "</h3>" : "";
                        var image = (img_src) ? img_src : this.src;
                        $("body").append("<div id='pimg'><img src='" + image + "' alt='Image preview' />" + desc + "</div>");
                        $("#pimg").css("top", (e.pageY - yOffset) + "px").css("left", (e.pageX + xOffset) + "px");
                        $("#pimg").show();
                    }, function ()
                    {
                        this.title = this.img_title;
                        $("#pimg").remove();
                    });
                    $("img.pimg").mousemove(function (e)
                    {
                        $("#pimg").css("top", (e.pageY - yOffset) + "px").css("left", (e.pageX + xOffset) + "px");
                    });
                };
                pimg();
            </script>
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
    global $fvonly;
    echo '<table id="batchResults" border="1" cellpadding="10" cellspacing="0">
        <tr>
            <th>Test</th>
            <th>Median load time (First view)</th>';
    if( !$fvonly )
        echo '<th>Median load time (Repeat view)</th>';
    echo    '<th>Raw page data</th>
            <th>Raw object data</th>
            <th>Http archive (.har)</th>
        </tr>';
    foreach( $tests['urls'] as &$test )
    {
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        DisplayTest($test['id'], $test['u'], $label, $test['c']);
    }
    echo '</table>';
}

/**
* Display the test results as a comparison across multiple variations of a given test
* 
* @param mixed $tests
*/
function DisplayTestsWithVariations(&$tests)
{
    global $fvonly;
    echo '<table id="batchResults" border="1" cellpadding="10" cellspacing="0">
        <tr>
            <th>Test</th>
            <th>Median load time (First view)</th>';
    if( !$fvonly )
        echo '<th>Median load time (Repeat view)</th>';
    echo   '<th>Raw page data</th>
            <th>Raw object data</th>
            <th>Http archive (.har)</th>
        </tr>';
    foreach( $tests['urls'] as &$test )
    {
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        DisplayTest($test['id'], $test['u'], $label, $test['c']);
        foreach( $test['v'] as $variationIndex => $variationId )
            DisplayTest($variationId, CreateUrlVariation($test['u'], $tests['variations'][$variationIndex]['q']), "$label - {$tests['variations'][$variationIndex]['l']}", $test['c']);
    }
    echo '</table>';
}

/**
* Display a single row of the data table
* 
* @param mixed $current_id
* @param mixed $current_url
* @param mixed $current_label
*/
function DisplayTest($id, $url, $label, $complete)
{
    global $fvonly;
    RestoreTest($id);
    $testPath = './' . GetTestPath($id);
    $fileUrl = GetFileUrl($url);

    echo '<tr>';
    $safeUrl = htmlspecialchars($url);
    if( FRIENDLY_URLS )
        echo "<td><a href=\"/result/$id/\" title=\"$safeUrl\" target=\"_blank\">$label</a></td>";
    else
        echo "<td><a href=\"/results.php?test=$id\" title=\"$safeUrl\" target=\"_blank\">$label</a></td>";
    if( $complete )
    {
        $pageData = loadAllPageData($testPath);
        $fvMedian = GetMedianRun($pageData, 0);
        $rvMedian = GetMedianRun($pageData, 1);
        $rvMedian_column = '';
        if ($rvMedian)
            $rvMedian_column = number_format($pageData[$rvMedian][1]['loadTime'] / 1000.0, 3);
        echo "<td>" . number_format($pageData[$fvMedian][0]['loadTime'] / 1000.0, 3) . "</td>";
        if( !$fvonly )
            echo "<td>$rvMedian_column</td>";
        if( FRIENDLY_URLS )
        {
            echo "<td><a href=\"/result/$id/{$id}_{$fileUrl}_page_data.csv\">Download Page Data</a></td>";
            echo "<td><a href=\"/result/$id/{$id}_{$fileUrl}_requests.csv\">Download Object Data</a></td>";
        }
        else
        {
            echo "<td><a href=\"/csv.php?test=$id\">Download Page Data</a></td>";
            echo "<td><a href=\"/csv.php?test=$id&requests=1\">Download Object Data</a></td>";
        }
        echo "<td><a href=\"/export.php?test=$id\">Download HAR</a></td>";
    }
    else
    {
        if( $fvonly )
            echo '<td colspan="4">';
        else
            echo '<td colspan="5">';
        $status = GetTestStatus($id);
        echo $status['statusText'];
        if( $status['statusCode'] == 101 )
            echo "( <a href=\"/cancelTest.php?test=$id\">Cancel Test</a> )";
        echo '</td>';
    }
    echo "</tr>\n";
}

/**
* Display a simple comparison
* 
* @param mixed $tests
* @param mixed $complete
*/
function DisplaySimple(&$tests, $video, &$dirty)
{
    global $complete;

    echo '<br><table id="batchResults" border="1" cellpadding="15" cellspacing="0">
            <tr>
            <th class="empty"></th>';
    $fvLoadTime = array();
    $fvRenderTimes = array();
    $rvLoadTimes = array();
    $rvRenderTimes = array();
    $count = 0;
    global $fvonly;
    
    // first pass, check the status of all of the tests and calculate the relevant times
    foreach( $tests['urls'] as &$test )
    {
        $fvLoadTime = null;
        $fvRenderTime = null;
        $rvLoadTime = null;
        $rvRenderTime = null;
        $id = $test['id'];
        RestoreTest($id);
        $test['path'] = GetTestPath($id);
        $testPath = './' . $test['path'];
        if( $test['c'] )
        {
            $pageData = loadAllPageData($testPath);
            if( CountSuccessfulTests($pageData, 0) )
            {
                $fvMedian = GetMedianRun($pageData, 0);
                $test['fvMedian'] = $fvMedian;
                $fvLoadTime = $pageData[$fvMedian][0]['loadTime'];
                $fvRenderTime = $pageData[$fvMedian][0]['render'];
            }
            if( CountSuccessfulTests($pageData, 1) )
            {
                $rvMedian = GetMedianRun($pageData, 1);
                $test['rvMedian'] = $rvMedian;
                $rvLoadTime = $pageData[$rvMedian][1]['loadTime'];
                $rvRenderTime = $pageData[$rvMedian][1]['render'];
            }
        }
        else
        {
            $test['status'] = GetTestStatusText($id);
        }
        $fvLoadTimes[$count] = $fvLoadTime;
        $fvRenderTimes[$count] = $fvRenderTime;
        if( !$fvonly )
        {
            $rvLoadTimes[$count] = $rvLoadTime;
            $rvRenderTimes[$count] = $rvRenderTime;
        }
        $count++;
    }
    
    // second pass, generate the header
    $count = 0;
    foreach( $tests['urls'] as &$test )
    {
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        $id = $test['id'];
        echo "<th>$label</th>";
        if( $count && $complete )
            echo "<th>Difference</a></th>";
        $count++;
    }
    echo '</tr>';
    
    // FV Page load time
    if( $complete )
    {
        DisplayMetric('Page Load Time', $fvLoadTimes, $count);
        DisplayMetric('Start Render Time', $fvRenderTimes, $count);
        if( !$fvonly )
        {
            DisplayMetric('Repeat View Page Load Time', $rvLoadTimes, $count);
            DisplayMetric('Repeat View Start Render Time', $rvRenderTimes, $count);
        }

        // links to the test results
        echo '<tr><td class="right">Full Test Result</td>';
        $count = 0;
        foreach( $tests['urls'] as &$test )
        {
            $testurl = "/results.php?test={$test['id']}";
            if( FRIENDLY_URLS )
                $testurl = "/result/{$test['id']}/";
            $path = $test['path'];
            $run = $test['fvMedian'];
            echo "<td><a href=\"$testurl\" target=\"_blank\"><img class=\"progress pimg\" src=\"/thumbnail.php?test={$test['id']}&width=150&run=$run&file={$run}_screen.jpg\" img_src=\"/$path/{$run}_screen.jpg\"><br>view test</a></td>";
            if( $count )
                echo "<td></td>";
            $count++;
        }
        echo "</tr>";
    }
    else
    {
        echo "<tr><td>Test Status</td>";
        foreach( $tests['urls'] as &$test )
        {
            echo '<td>';
            if( $test['c'] )
                echo 'Complete';
            else
                echo $test['status'];
            echo '</td>';
        }
        echo '</tr>';
    }
    echo '</table><br>';
    
    // video
    if( $complete && $video )
    {
        $videoComplete = true;
        if( !strlen($tests['videoID']) )
        {
            $tests['videoID'] = CreateVideo($tests);
            $dirty = true;
            $videoComplete = false;
            if( !strlen($tests['videoID']) )
            {
                // bail on the video if it couldn't be created
                $videoComplete = true;
                $tests['videoReady'] = true;
            }
        }
        elseif( !$tests['videoReady'] )
        {
            $tests['videoReady'] = CheckVideo($tests['videoID']);
            if( $tests['videoReady'] )
                $dirty = true;
            else
                $videoComplete = false;
        }
        
        if( $videoComplete )
        {
            echo '<h2>Visual Comparison<br><span class="small">Compared until the latest visual change on each page</span></h2>';
            VideoHtml($tests['videoID']);
        }
        else
        {
            echo '<h2>Please wait while the video comparison is created<br><span class="small">This page will refresh every 10 seconds until the video is ready</span></h2>';
            echo "<script language=\"JavaScript\">\nsetTimeout( \"window.location.reload(true)\", 10000 );\n</script>";
        }
    }
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
    echo "<tr><td class=\"right\"><b>$metric</b></td>";
    $baseline = $values[0];
    for( $i = 0; $i < $count; $i++ )
    {
        echo '<td>';
        if ($values[$i])
            echo number_format( $values[$i] / 1000.0, 3) . 's';
        echo '</td>';
        if( $i )
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
                echo "<td class=\"$class\">$direction" . number_format( $delta / 1000.0, 3) . "s ($pct%)</td>";
            }
            else
                echo '<td></td>';
        }
    }
    echo '</tr>';
}

/**
* Send a request to create a video and return the ID
* 
* @param mixed $tests
*/
function CreateVideo(&$tests)
{
    $id = null;

    $host  = $_SERVER['HTTP_HOST'];
    $request = "http://$host/video/create.php?f=json&end=doc&tests=";

    $count = 0;
    foreach( $tests['urls'] as &$test )
    {
        if( $count )
            $request .= ',';
        $request .= "{$test['id']}-l:";
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        $request .= urlencode($label);
        $count++;
    }
    
    $ctx = stream_context_create(array('http' => array('timeout' => 10)));
    $response = json_decode(file_get_contents($request, 0, $ctx), true);
    if( $response['statusCode'] == 200 )
        $id = $response['data']['videoId'];
    
    return $id;
}

/**
* Check to see if the video is complete
* 
* @param mixed $videoID
*/
function CheckVideo($videoID)
{
    $done = false;

    $dir = GetVideoPath($videoID, true);
    if( is_dir("./$dir") )
    {
        $ini = parse_ini_file("./$dir/video.ini");
        if( isset($ini['completed']) )
        {
            $done = true;
            GenerateVideoThumbnail("./$dir");
        }
    }
    
    return $done;
}

/**
* Generate the HTML for embedding the video
* 
* @param mixed $id
*/
function VideoHtml($id)
{
    $width = 816;
    $height = 384;

    $dir = GetVideoPath($id, true);
    $hasThumb = false;
    if( is_file("./$dir/video.png") )
    {
        $hasThumb = true;
        list($width, $height) = getimagesize("./$dir/video.png");
    }
    
    echo "<div style=\"display:block; width:{$width}px; height:{$height}px\" id=\"player\"></div>\n";
    echo "<script>\n
                    flowplayer(\"player\", \n
                                    {\n
                                        src: \"{$GLOBALS['cdnPath']}/video/player/flowplayer-3.2.7.swf\",\n
                                        cachebusting: true,\n
                                        version: [9, 115]\n
                                    } , \n
                                    { \n
                                        clip:  { \n
                                            scaling: \"fit\"\n
                                        } ,\n
                                        playlist: [";
    if( $hasThumb )
    {
        echo "{ url: '{$GLOBALS['cdnPath']}/$dir/video.png'} ,\n";
        echo "{ url: '{$GLOBALS['cdnPath']}/$dir/video.mp4', autoPlay: false, autoBuffering: false}\n";
    }
    else
        echo "{ url: '{$GLOBALS['cdnPath']}/$dir/video.mp4', autoPlay: false, autoBuffering: true}\n";
    echo "                          ],\n
                                        plugins: {\n
                                            controls: {\n
                                                volume:false,\n
                                                mute:false,\n
                                                stop:true,\n
                                                tooltips: { \n
                                                    buttons: true, \n
                                                    fullscreen: 'Enter fullscreen mode' \n
                                                } \n
                                            }\n
                                        } ,\n
                                        canvas:  { \n
                                            backgroundColor: '#000000', \n
                                            backgroundGradient: 'none'\n
                                        }\n
                                    }\n
                                ); \n
                </script>\n<br><a class=\"link\" href=\"/video/download.php?id=$id\">Click here to download the video file...</a>\n";
}

/**
* Walk through the tests determining which ones are complete
* 
* @param mixed $tests
*/
function CheckTests(&$tests, &$dirty)
{
    $allComplete = true;

    foreach( $tests['urls'] as &$test )
    {
        if( !$test['c'] )
        {
            $complete = true;
            $id = $test['id'];
            RestoreTest($id);
            $testPath = './' . GetTestPath($id);
            $testIni = parse_ini_file("$testPath/testinfo.ini",true);
            if( (!isset($testIni['test']) || !isset($testIni['test']['completeTime'])) )
                $complete = false;
            else
            {
                // go through all of the variations as well
                foreach( $test['v'] as $variationId )
                {
                    RestoreTest($variationId);
                    $testPath = './' . GetTestPath($variationId);
                    $testIni = parse_ini_file("$testPath/testinfo.ini",true);
                    if( (!isset($testIni['test']) || !isset($testIni['test']['completeTime'])) )
                    {
                        $complete = false;
                        break;
                    }
                }
            }
            
            if( $complete )
            {
                $test['c'] = 1;
                $dirty = true;
            }
            else
                $allComplete = false;
        }
    }
    
    return $allComplete;
}
?>
