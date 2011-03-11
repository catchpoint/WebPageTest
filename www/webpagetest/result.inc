<?php
require_once('optimization_detail.inc.php');

$video = false;
if( $test['test']['Capture Video'] || $test['test']['Video'] || $test['test']['video'] )
    $video = true;
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
                <title>WebPagetest - 
        <?php 
		// $url_parts = parse_url($url); 
        $locs = preg_replace('/<.*>/U', '', $test["test"]["location"]); 
        $locscitypos =  strpos($locs, ",");
        if ($locscitypos)  {
            $locs = substr($locs,0,strpos($locs, ","));
        }
        
        $url_temp = $url;
        if (substr($url,0,7) == 'http://') {
            $url_temp = substr($url,7);
        }
        else {
            if (substr($url,0,8) == 'https://') {
                $url_temp = substr($url,8);
            }
        }
        $label =    htmlspecialchars(gz_file_get_contents("$testPath/label.txt"));
        if ($label) {
            $label = $label . " : ";
        }
        $title = FitText($locs . ' : ' . $label . $url_temp, 40);
        echo $title;
        // echo $locs . " : " . FitText($url_parts["host"] . $url_parts["path"] . $url_parts["query"],30); 
        ?>
        </title>
        <?php if( !$test['test']['completeTime'] ) { ?>
        <meta http-equiv="refresh" content="30">
        <?php } ?>
        <?php include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Summary';
            include 'header.inc';
            ?>
            <div id="result">
            <?php 
            if( !$test['test']['completeTime'] ) 
            {
                ?>
                <p class="left">
                <br>
                Url: <a rel="nofollow" href=<?php echo '"' . $url . '"';?>><?php echo $url;?></a><br>
                From: <?php echo $test['test']['location'];?><br>
                <?php 
                    if( $dom ) 
                        echo 'DOM Element: <b>' . $dom . '</b><br>';
                    if( $test['test']['fvonly'] ) 
                        echo '<b>First View only</b><br>';
                    if( (int)$test['test']['runs'] > 1 ) 
                        echo 'Test runs: <b>' . $test['test']['runs'] . '</b><br>';
                    if( (int)$test['test']['authenticated'] == 1) 
                        echo '<br><b>Authenticated: ' . $login . '</b>';
                    if( (int)$test['test']['connections'] !== 0) 
                        echo '<b>' . $test['test']['connections'] . ' Browser connections</b><br>';
                    if( $test['test']['script'] )
                    {
                        echo '<b>Scripted test</b><br>';
                        if ($settings['show_script_in_results'])
                            AddScriptDiv($testPath);
                    }
                ?>
                </p>
                <?php 
                $runs = count($pageData);
                if( !$test['test']['completeTime'] )
                    echo "<h3>Test is partially complete ($runs of {$test['test']['runs']} runs).<br>This page will refresh every 30 seconds until the full test is complete.</h3>";
                else
                    echo "<h3>Calculating the AFT.<br>This page will refresh every 30 seconds until the calculation is complete.</h3>";
            }
            else 
            { 
            ?>
            <div id="download">
                <div id="testinfo">
                    <?php
                    if( $dom ) 
                        echo 'DOM Element: <b>' . $dom . '</b><br>';
                    if( $test['test']['fvonly'] ) 
                        echo '<b>First View only</b><br>';
                    if( (int)$test['test']['runs'] > 1 ) 
                        echo 'Test runs: <b>' . $test['test']['runs'] . '</b><br>';
                    if( (int)$test['test']['authenticated'] == 1) 
                        echo '<br><b>Authenticated: ' . $login . '</b>';
                    if( (int)$test['test']['connections'] !== 0) 
                        echo '<b>' . $test['test']['connections'] . ' Browser connections</b><br>';
                    if( $test['test']['script'] )
                    {
                        echo '<b>Scripted test</b><br>';
                        if ($settings['show_script_in_results'])
                            AddScriptDiv($testPath);
                    }
                    if( gz_is_file("$testPath/testinfo.json") )
                    {
                        $owner = null;
                        if( isset($_COOKIE['o']) && strlen($_COOKIE['o']) ){
                          $owner = $_COOKIE['o'];
                        }else{
                          $owner = sha1(uniqid(uniqid('', true), true));
                        }
                        setcookie('o', $owner, time()+60*60*24*365, '/');

                        // load the secret key (if there is one)
                        $secret = '';
                        $keys = parse_ini_file('./settings/keys.ini', true);
                        if( $keys && isset($keys['server']) && isset($keys['server']['secret']) )
                          $secret = trim($keys['server']['secret']);

                        echo '<form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data">';
                        echo "\n<input type=\"hidden\" name=\"resubmit\" value=\"$id\">\n";
                        echo "<input type=\"hidden\" name=\"vo\" value=\"$owner\">\n";
                        if( strlen($secret) ){
                          $hashStr = $secret;
                          $hashStr .= $_SERVER['HTTP_USER_AGENT'];
                          $hashStr .= $owner;
                          
                          $now = date('c');
                          echo "<input type=\"hidden\" name=\"vd\" value=\"$now\">\n";
                          $hashStr .= $now;
                          
                          $hmac = sha1($hashStr);
                          echo "<input type=\"hidden\" name=\"vh\" value=\"$hmac\">\n";
                        }
                        echo '<input type="submit" value="Re-run the test">';
                        echo "\n</form>\n";
                    }
                    ?>
                </div>
                <?php
                    // create a friendlier (unique) name for the fi
                    $fileUrl = GetFileUrl($url);
                    echo "<a href=\"/result/$id/{$id}_{$fileUrl}_page_data.csv\">Raw page data</a> - ";
                    echo "<a href=\"/result/$id/{$id}_{$fileUrl}_requests.csv\">Raw object data</a>";
		    echo '<br><a href="/export.php?test=' . $id . '">Export HTTP Archive (.har)</a>';
		     if( $settings['enable_google_csi'] )
			echo '<br><a href="/google/google_csi.php?test=' . $id . '">CSI data (.csv)</a>';
                    if( $settings['publishTo'] )
                        echo "<br><a href=\"/publish.php?test=$id\">Publish to {$settings['publishTo']}</a>";
                ?>
            </div>
            <div id="average">
                <?php 
                $fvMedian = GetMedianRun($pageData, 0);
                $rvMedian = GetMedianRun($pageData, 1);
                
                if( $fvMedian )
                {
                    if( count($pageData) > 1) 
                        echo '<h2>Performance Results (Median Run)</h2>';
                ?>
                    <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                    <tr>
                        <?php
                        $cols = 3;
                        if((float)$pageData[$fvMedian][0]['domTime'] > 0.0)
                            $cols++;
                        if( $test['test']['aft'] )
                            $cols++;
                        ?>
                        <th align="center" class="empty" valign="middle" style="border:1px white solid;"></th>
                        <th align="center" class="empty" valign="middle" colspan=<?php echo "\"$cols\"";?> ></th>
                        <th align="center" class="border" valign="middle" colspan="3">Document Complete</th>
                        <th align="center" class="border" valign="middle" colspan="3">Fully Loaded</th>
                    </tr>
                    <tr>
                        <th align="center" class="empty" valign="middle"></th>
                        <th align="center" valign="middle">Load Time</th>
                        <th align="center" valign="middle">First Byte</th>
                        <th align="center" valign="middle">Start Render</th>
                        <?php if( $test['test']['aft'] ) { ?>
                        <th align="center" valign="middle">Above the Fold</th>
                        <?php } ?>
                        <?php if((float)$pageData[$fvMedian][0]['domTime'] > 0.0) { ?>
                        <th align="center" valign="middle">DOM Element</th>
                        <?php } ?>

                        <th align="center" class="border" valign="middle">Time</th>
                        <th align="center" valign="middle">Requests</th>
                        <th align="center" valign="middle">Bytes In</th>

                        <th align="center" class="border" valign="middle">Time</th>
                        <th align="center" valign="middle">Requests</th>
                        <th align="center" valign="middle">Bytes In</th>
                    </tr>
                    <tr>
                        <td align="left" valign="middle">First View
                        <?php
                        if( count($pageData) > 1) 
                            echo " (<a href=\"#run$fvMedian\">Run $fvMedian</a>)";
                        echo "</td><td id=\"fvLoadTime\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['loadTime'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"fvTTFB\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['TTFB'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"fvStartRender\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['render'] / 1000.0, 3) . "s</td>\n";
                        if( $test['test']['aft'] ) {
                            $aft = number_format($pageData[$fvMedian][0]['aft'] / 1000.0, 1) . 's';
                            if( !$pageData[$fvMedian][0]['aft'] )
                                $aft = 'N/A';
                            echo "<td id=\"fvAFT\" valign=\"middle\">$aft</th>";
                        }
                        if((float)$pageData[$fvMedian][0]['domTime'] > 0.0)
                            echo "<td id=\"fvDomElement\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['domTime'] / 1000.0, 3) . "s</td>\n";

                        echo "<td id=\"fvDocComplete\" class=\"border\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['docTime'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"fvRequestsDoc\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['requestsDoc'],0) . "</td>\n";
                        echo "<td id=\"fvBytesDoc\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['bytesInDoc'] / 1024, 0) . " KB</td>\n";

                        echo "<td id=\"fvFullyLoaded\" class=\"border\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['fullyLoaded'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"fvRequests\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['requests'],0) . "</td>\n";
                        echo "<td id=\"fvBytes\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['bytesIn'] / 1024, 0) . " KB</td>\n";
                        ?>
                    </tr>
                    <?php if( $rvMedian ) { ?>
                    <tr>
                        <td align="left" class="even" valign="middle">Repeat View
                        <?php
                        if( count($pageData) > 1) 
                            echo " (<a href=\"#run$rvMedian\">Run $rvMedian</a>)";
                        echo "</td><td id=\"rvLoadTime\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['loadTime'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"rvTTFB\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['TTFB'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"rvStartRender\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['render'] / 1000.0, 3) . "s</td>\n";
                        if( $test['test']['aft'] ) {
                            $aft = number_format($pageData[$rvMedian][1]['aft'] / 1000.0, 1);
                            if( !$pageData[$rvMedian][1]['aft'] )
                                $aft = 'N/A';
                            echo "<td id=\"rvAFT\" class=\"even\" valign=\"middle\">$aft</th>";
                        }
                        if((float)$pageData[$rvMedian][1]['domTime'] > 0.0)
                            echo "<td id=\"rvDomElement\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['domTime'] / 1000.0, 3) . "s</td>\n";

                        echo "<td id=\"rvDocComplete\" class=\"even border\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['docTime'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"rvRequestsDoc\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['requestsDoc'],0) . "</td>\n";
                        echo "<td id=\"rvBytesDoc\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['bytesInDoc'] / 1024, 0) . " KB</td>\n";

                        echo "<td id=\"rvFullyLoaded\" class=\"even border\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['fullyLoaded'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"rvRequests\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['requests'],0) . "</td>\n";
                        echo "<td id=\"rvBytes\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['bytesIn'] / 1024, 0) . " KB</td>\n";
                        ?>
                    </tr>
                    <?php } ?>
                    </table><br>
                <?php
                }
                else
                    echo '<h3>The test completed but there were no successful results.</h3>';
                ?>
            </div>
            <?php } ?>
            <div id="tables" style="text-align:left;">
            <?php
            if( count($pageData) > 1) 
                echo '<h3 style="text-align:center;">Test Results</h3>';

            $runs = count($pageData);
            $fvonly = 1;
            if( isset($rv) )
                $fvonly = 0;
            for( $run = 1; $run <= $runs; $run++)
            {
                if( $runs > 1 )
                    echo '<h4><a name="run' . $run. '">Run ' . $run . ':</a></h4>';
            ?>
                <table id="table<?php echo $run;?>" class="pretty" align="center" border="1" cellpadding="20" cellspacing="0">
                <tr>
                    <th align="center" class="empty" valign="middle"></th>
                    <th align="center" valign="middle">Waterfall</th>
                    <?php
                    if($pageData[$run][0]['optimization_checked'])
                        echo '<th align="center" valign="middle">Optimization Checklist</th>';
                    ?>
                    <th align="center" valign="middle">Screen Shot</th>
                    <?php if($video) { ?>
                    <th align="center" valign="middle">Video</th>
                    <?php } ?>
                </tr>
                <tr>
                    <td align="left" valign="middle">First View<?php 
                        if( isset($pageData[$run][0]['result']) && $pageData[$run][0]['result'] !== 0 && $pageData[$run][0]['result'] !== 99999 )
                            echo '<br>(Error: ' . LookupError($pageData[$run][0]['result']) . ')';
                        else if( isset($pageData[$run][0]['loadTime']) )
                            echo '<br>(' . number_format($pageData[$run][0]['loadTime'] / 1000.0, 3) . 's)';
                        if( is_file("$testPath/{$run}_dynaTrace.dtas") )
                        {
                            echo "<br><br><div><a href=\"/$testPath/{$run}_dynaTrace.dtas\" title=\"Download dynaTrace Session\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\"></a></div><br>";
                            echo "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>";
                        }
                        if( gz_is_file("$testPath/{$run}.cap") )
                            echo "<br><br><a href=\"/result/$id/{$run}.cap\" title=\"Download tcpdump session capture\">tcpdump</a>";
                    ?></td>
                    <td align="center" valign="middle"><a href="/result/<?php echo "$id/$run/details/"; ?>"><img class="progress" width=250 src="<?php echo "{$GLOBALS['cdnPath']}/result/$id/$run"; ?>_waterfall_thumb.png"></a></td>
                    <?php
                    if($pageData[$run][0]['optimization_checked'])
                        echo "<td align=\"center\" valign=\"middle\"><a href=\"/result/$id/$run/performance_optimization/\"><img class=\"progress\" width=250 src=\"{$GLOBALS['cdnPath']}/result/$id/{$run}_optimization_thumb.png\"></a></td>\n";
                    ?>
                    <td align="center" valign="middle"><a href="/result/<?php echo "$id/$run/screen_shot/"; ?>"><img class="progress" width=250 src="<?php echo "{$GLOBALS['cdnPath']}/result/$id/$run"; ?>_screen_thumb.jpg"></a></td>
                    <?php if($video) { ?>
                    <td align="center" valign="middle">
                        <?php
                        if( is_dir("$testPath/video_$run") )
                        {
                            echo "<a href=\"/video/compare.php?tests=$id-r:$run-c:0\">Filmstrip View</a><br>-<br>";
                            echo "<a href=\"/video/create.php?tests=$id-r:$run-c:0&id={$id}.{$run}.0\">Watch Video</a><br>-<br>";
                            echo "<a href=\"/video/?tid=$id&run=$run&cached=0\">Compare to</a>";
                        }
                        else
                            echo "not available";
                        ?>
                    </td>
                    <?php } ?>
                </tr>

                <?php if( isset($pageData[$run][1]) ) { ?>
                <tr>
                    <td align="left" class="even" valign="middle">Repeat View<?php 
                        if( isset($pageData[$run][1]['result']) && $pageData[$run][1]['result'] !== 0 && $pageData[$run][1]['result'] !== 99999 )
                            echo '<br>(Error: ' . LookupError($pageData[$run][1]['result']) . ')';
                        else if( isset($pageData[$run][1]['loadTime']) )
                            echo '<br>(' . number_format($pageData[$run][1]['loadTime'] / 1000.0, 3) . 's)';
                        if( is_file("$testPath/{$run}_Cached_dynaTrace.dtas") )
                        {
                            echo "<br><br><div><a href=\"/$testPath/{$run}_Cached_dynaTrace.dtas\" title=\"Download dynaTrace Session\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\"></a></div><br>";
                            echo "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>";
                        }
                        if( gz_is_file("$testPath/{$run}_Cached.cap") )
                            echo "<br><br><a href=\"/result/$id/{$run}_Cached.cap\" title=\"Download tcpdump session capture\">tcpdump</a>";
                    ?></td>
                    <td align="center" class="even" valign="middle"><a href="/result/<?php echo "$id/$run/details/cached/"; ?>"><img class="progress" width=250 src="<?php echo "{$GLOBALS['cdnPath']}/result/$id/$run"; ?>_Cached_waterfall_thumb.png"></a></td>
                    <?php
                    if($pageData[$run][0]['optimization_checked'])
                        echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/result/$id/$run/performance_optimization/cached/\"><img class=\"progress\" width=250 src=\"{$GLOBALS['cdnPath']}/result/$id/{$run}_Cached_optimization_thumb.png\"></a></td>\n";
                    ?>
                    <td align="center" class="even" valign="middle"><a href="/result/<?php echo "$id/$run/screen_shot/cached/"; ?>"><img class="progress" width=250 src="<?php echo "{$GLOBALS['cdnPath']}/result/$id/$run"; ?>_Cached_screen_thumb.jpg"></a></td>
                    <?php if($video) { ?>
                    <td align="center" valign="middle">
                        <?php
                        if( is_dir("$testPath/video_{$run}_cached") )
                        {
                            echo "<a href=\"/video/compare.php?tests=$id-r:$run-c:1\">Filmstrip View</a><br>-<br>";
                            echo "<a href=\"/video/create.php?tests=$id-r:$run-c:1&id={$id}.{$run}.1\">Watch Video</a>";
                        }
                        else
                            echo "not available";
                        ?>
                    </td>
                    <?php } ?>
                </tr>
                <?php } ?>
                
                <tr>
                    <td align="left" valign="middle">Content Breakdown</td>
                    <?php
                    $span = 3;
                    if( $video )
                        $span = 4;
                    echo "<td align=\"left\" valign=\"middle\" colspan=\"$span\">";
                    ?>
                        <a href="/result/<?php echo "$id/$run/breakdown/"; ?>">
                        <img width=390 height=200 src="<?php echo "{$GLOBALS['cdnPath']}/breakdownPie.png?width=390&height=200&type=Requests&fontSize=8&test=$id&run=$run"; ?>">
                        <img width=390 height=200 src="<?php echo "{$GLOBALS['cdnPath']}/breakdownPie.png?width=390&height=200&type=Bytes&fontSize=8&test=$id&run=$run"; ?>">
                        </a>
                    </td>
                </tr>
                
                </table><br>
            <?php
            }
            ?>
            </div>
            </div>

		    <br>
            <?php include('./ads/results_bottom.inc'); ?>
		    <br>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php
/**
* Translate an error code into the text description
* 
* @param mixed $error
*/
function LookupError($error)
{
    $errorText = $error;
    
    switch($error)
    {
        case 7: $errorText = "Invalid SSL Cert."; break;
        case 99996: $errorText = "Timed Out waiting for DOM element"; break;
        case 99997: $errorText = "Timed Out"; break;
        case 99998: $errorText = "Timed Out"; break;
        case 88888: $errorText = "Script Error"; break;
        case -2146697211: $errorText = "Failed to Connect"; break;
    }
    
    return $errorText;
}

function AddScriptDiv($testPath)
{
    echo '<p><a href="javascript:void(0)" id="script_in_results">Script <span class="arrow"></span></a></p>';
    echo '<div id="script_in_results-container" class="hidden">';
    echo '<pre>' . GetScript($testPath) . '</pre>';
    echo '</div>';
}

function GetScript($testPath)
{
    $json_contents = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    return htmlspecialchars($json_contents['script']);
}
?>
