<?php
// maximum number of tests that are allowed to be compared in video
$maxCompare = 9;

if( !isset($_REQUEST['tests']) && isset($_REQUEST['t']) )
{
    $tests = '';
    foreach($_REQUEST['t'] as $t)
    {
        $parts = explode(',', $t);
        if( count($parts) >= 1 )
        {
            if( strlen($tests) )
                $tests .= ',';
            $tests .= trim($parts[0]);
            if( $parts[1] )
                $tests .= "-r:{$parts[1]}";
        }
    }

    $host  = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['PHP_SELF'];
    $params = '';
    foreach( $_GET as $key => $value )
        if( $key != 't' )
            $params .= "&$key=" . urlencode($value);
    header("Location: http://$host$uri?tests=$tests{$params}");    
}
else
{
    chdir('..');
    include 'common.inc';
    require_once('page_data.inc');
    include 'video/filmstrip.inc.php';  // include the commpn php shared across the filmstrip code
    include 'object_detail.inc'; 
    require_once('waterfall.inc');

    $title = 'Web page visual comparison';
    $labels = '';
    foreach( $tests as &$test )
    {
        if( strlen($test['name']) )
        {
            if( strlen($labels) )
                $labels .= ", ";
            $labels .= $test['name'];
        }
    }
    if( strlen($labels) )
        $title .= ' - ' . $labels;
    ?>
    <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
    <html>
        <head>
            <title>WebPagetest - Visual Comparison</title>
            <?php
                if( !$ready )
                    echo "<meta http-equiv=\"refresh\" content=\"10\">\n";
            ?>
            <?php $gaTemplate = 'Visual Comparison'; include ('head.inc'); ?>
            <style type="text/css">
                #video
                {
                    margin-left: auto;
                    margin-right: auto;
                }
                #videoDiv
                {
                    overflow-y: hidden;
                    position: relative;
                    overflow: auto;
                    width: 100%; 
                    height: 100%;
                    padding-bottom: 1em;
                }
                #videoContainer
                {
                    table-layout: fixed;
                    margin-left: auto;
                    margin-right: auto;
                    width: 99%;
                }
                #videoContainer td
                {
                    margin: 2px;
                }
                #labelContainer
                {
                    width: 8em;
                    vertical-align: top;
                    text-align: right;
                    padding-right: 0.5em;
                }
                #videoLabels
                {
                    table-layout: fixed;
                    width: 100%;
                    overflow: hidden;
                }
                th{ font-weight: normal; }
                #videoLabels td
                { 
                    padding: 2px; 
                }
                #video td{ padding: 2px; }
                div.content
                {
                    text-align:center;
                    background: black;
                    color: white;
                    font-family: arial,sans-serif
                }
                .pagelink
                {
                    text-decoration: none;
                    color: white;
                }
                .thumb{ border: none; }
                .thumbChanged{border: 3px solid #FEB301;}
                .thumbAFT{border: 3px solid #FF0000;}
                #createForm
                {
                    width:100%;
                }
                #bottom
                {
                    width:100%;
                    text-align: left;
                }
                #layout
                {
                    float: right;
                    position: relative;
                    top: -5em;
                }
                #layoutTable
                {
                    text-align: left;
                }
                #layoutTable th
                {
                    padding-left: 1em;
                    text-decoration: underline;
                }
                #layoutTable td
                {
                    padding-left: 2em;
                    vertical-align: top;
                }
                #statusTable
                {
                    table-layout: fixed;
                    margin-left: auto;
                    margin-right: auto;
                    font-size: larger;
                    text-align: left;
                }
                #statusTable th
                {
                    text-decoration: underline;
                    padding-left: 2em;
                }
                #statusTable td
                {
                    padding-top: 1em;
                    padding-left: 2em;
                }
                #image
                {
                    margin-left:auto; 
                    margin-right:auto; 
                    clear: both;
                }
                #waterfall
                {
                    clear: both;
                    position: relative;
                    top: -3em;
                    width: 930px;
                }
            </style>
        </head>
        <body>
            <div class="page">
                <?php
                $tab = 'Test Result';
                $nosubheader = true;
                $filmstrip = $_REQUEST['tests'];
                include 'header.inc';

                if( $error )
                    echo "<h1>$error</h1>";
                elseif( $ready )
                    ScreenShotTable();
                else
                    DisplayStatus();
                ?>
            
                <?php include('footer.inc'); ?>
            </div>

            <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/video/compare.js?v=4"></script> 
            <script type="text/javascript">
                <?php echo "var maxCompare = $maxCompare;"; ?>
            </script>
        </body>
    </html>

    <?php
}

/**
* Build a side-by-side table with the captured frames from each test
* 
*/
function ScreenShotTable()
{
    global $tests;
    global $thumbSize;
    global $interval;
    global $maxCompare;
    $aftAvailable = false;
    $endTime = 'all';
    if( strlen($_REQUEST['end']) )
        $endTime = trim($_REQUEST['end']);

    if( count($tests) )
    {
        // figure out how many columns there are
        $end = 0;
        foreach( $tests as &$test )
            if( $test['video']['end'] > $end )
                $end = $test['video']['end'];
                
        echo '<br><form id="createForm" name="create" method="get" action="/video/create.php" onsubmit="return ValidateInput(this)">';
        echo "<input type=\"hidden\" name=\"end\" value=\"$endTime\">";
        echo '<table id="videoContainer"><tr>';

        // build a table with the labels
        echo '<td id="labelContainer"><table id="videoLabels"><tr><th>&nbsp;</th></tr>';
        foreach( $tests as &$test )
        {
            if($test['aft'])
                $aftAvailable = true;
            // figure out the height of this video
            $height = 100;
            if( $test['video']['width'] && $test['video']['height'] )
                $height = 10 + (int)(((float)$thumbSize / (float)$test['video']['width']) * (float)$test['video']['height']);

            $break = '';
            if( !strpos($test['name'], ' ') )
                $break = ' style="word-break: break-all;"';
            echo "<tr width=10% height={$height}px ><td$break>";
            $name = urlencode($test['name']);
            $cached = 0;
            if( $test['cached'] )
                $cached = 1;
            $testEnd = '';
            if( $test['end'] )
            {
                $testEnd = (int)(($test['end'] + 99) / 100);
                $testEnd = (float)$testEnd / 10.0;
            }
            echo "<input type=\"checkbox\" name=\"t[]\" value=\"{$test['id']},{$test['run']}," . $name . ",$cached,$testEnd\" checked=checked> ";
            $cached = '';
            if( $test['cached'] )
                $cached = 'cached/';
            echo "<a class=\"pagelink\" href=\"/result/{$test['id']}/{$test['run']}/details/$cached\">";
            echo WrapableString($test['name']);
            echo "</a></td></tr>\n";
        }
        echo '</table></td>';
        
        // the actual video frames        
        echo '<td><div id="videoDiv"><table id="video"><thead><tr>';
        $skipped = $interval;
        $last = $end + $interval - 1;
        for( $frame = 0; $frame <= $last; $frame++ )
        {
            $skipped++;
            if( $skipped >= $interval )
            {
                $skipped = 0;
                echo '<th>' . number_format((float)$frame / 10.0, 1) . 's</th>';
            }
        }
        echo "</tr></thead><tbody>\n";
        
        $firstFrame = 0;
        foreach( $tests as &$test )
        {
            $aft = (int)$test['aft'] / 100;
            
            // figure out the height of the image
            $height = 0;
            if( $test['video']['width'] && $test['video']['height'] )
                $height = (int)(((float)$thumbSize / (float)$test['video']['width']) * (float)$test['video']['height']);
            echo "<tr>";
            
            $lastThumb = null;
            $frameCount = 0;
            $skipped = $interval;
            $last = $end + $interval - 1;
            for( $frame = 0; $frame <= $last; $frame++ )
            {
                $path = null;
                if( isset($test['video']['frames'][$frame]) )
                    $path = $test['video']['frames'][$frame];
                if( isset($path) )
                    $test['currentframe'] = $frame;
                else
                {
                    if( isset($test['currentframe']) )
                        $path = $test['video']['frames'][$test['currentframe']];
                    else
                        $path = $test['video']['frames'][0];
                }

                if( !$lastThumb )
                    $lastThumb = $path;
                
                $skipped++;
                if( $skipped >= $interval )
                {
                    $skipped = 0;

                    echo '<td>';
                    if( $frame - $interval + 1 <= $test['video']['end'] )
                    {
                        echo '';

                        $cached = '';
                        if( $test['cached'] )
                            $cached = '_cached';
                        $imgPath = GetTestPath($test['id']) . "/video_{$test['run']}$cached/$path";
                        echo "<a href=\"/$imgPath\">";
                        echo "<img title=\"{$test['name']}\"";
                        $class = 'thumb';
                        if( $lastThumb != $path )
                        {
                            if( !$firstFrame || $frameCount < $firstFrame )
                                $firstFrame = $frameCount;
                            $class = 'thumbChanged';
                        }
                        if( $aft && $frame >= $aft )
                        {
                            $aft = 0;
                            $class = 'thumbAFT';
                        }
                        echo " class=\"$class\"";
                        echo " width=\"$thumbSize\"";
                        if( $height )
                            echo " height=\"$height\"";
                        echo " src=\"{$GLOBALS['cdnPath']}/thumbnail.php?test={$test['id']}&width=$thumbSize&file=video_{$test['run']}$cached/$path\"></a>";
                        
                        $lastThumb = $path;
                    }
                    $frameCount++;
                    echo '</td>';
                }
            }
            echo "</tr>\n";
        }
        echo "</tr>\n";
        
        // end of the table
        echo "</tbody></table></div>\n";
        
        // end of the container table
        echo "</td></tr></table>\n";
        echo "<div id=\"image\">";
        $ival = $interval * 100;
        echo "<a class=\"pagelink\" href=\"filmstrip.php?tests={$_REQUEST['tests']}&thumbSize=$thumbSize&ival=$ival&end=$endTime\">Export filmstrip as an image...</a>";
        echo "</div>";
        echo '<div id="bottom"><input type="checkbox" name="slow" value="1"> Slow Motion<br><br>';
        echo "Select up to $maxCompare tests and <input id=\"SubmitBtn\" type=\"submit\" value=\"Create Video\"></div>";
        echo "</form>";
        
        ?>
        <div id="layout">
            <form id="layoutForm" name="layout" method="get" action="/video/compare.php">
            <?php
                echo "<input type=\"hidden\" name=\"tests\" value=\"{$_REQUEST['tests']}\">\n";
            ?>
                <table id="layoutTable">
                    <tr><th>Thumbnail Size</th><th>Thumbnail Interval</th><th>Comparison End Point</th></th></tr>
                    <?php
                        // fill in the thumbnail size selection
                        echo "<tr><td>";
                        $checked = '';
                        if( $thumbSize <= 100 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"thumbSize\" value=\"100\"$checked onclick=\"this.form.submit();\"> Small<br>";
                        $checked = '';
                        if( $thumbSize <= 150 && $thumbSize > 100 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"thumbSize\" value=\"150\"$checked onclick=\"this.form.submit();\"> Medium<br>";
                        $checked = '';
                        if( $thumbSize > 150 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"thumbSize\" value=\"200\"$checked onclick=\"this.form.submit();\"> Large";
                        echo "</td>";
                        
                        // fill in the interval selection
                        echo "<td>";
                        $checked = '';
                        if( $interval <= 1 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"ival\" value=\"100\"$checked onclick=\"this.form.submit();\"> 0.1 sec<br>";
                        $checked = '';
                        if( $interval == 5 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"ival\" value=\"500\"$checked onclick=\"this.form.submit();\"> 0.5 sec<br>";
                        $checked = '';
                        if( $interval == 10 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"ival\" value=\"1000\"$checked onclick=\"this.form.submit();\"> 1 sec<br>";
                        $checked = '';
                        if( $interval == 50 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"ival\" value=\"5000\"$checked onclick=\"this.form.submit();\"> 5 sec<br>";
                        echo "</td>";

                        // fill in the end-point selection
                        echo "<td>";
                        if( !$aftAvailable && !strcasecmp($endTime, 'aft') )
                            $endTime = 'all';
                        $checked = '';
                        if( !strcasecmp($endTime, 'all') )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"end\" value=\"all\"$checked onclick=\"this.form.submit();\"> Last Change<br>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'doc') )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"end\" value=\"doc\"$checked onclick=\"this.form.submit();\"> Document Complete<br>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'full') )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"end\" value=\"full\"$checked onclick=\"this.form.submit();\"> Fully Loaded<br>";
                        if( $aftAvailable )
                        {
                            $checked = '';
                            if( !strcasecmp($endTime, 'aft') )
                                $checked = ' checked=checked';
                            echo "<input type=\"radio\" name=\"end\" value=\"aft\"$checked onclick=\"this.form.submit();\"> AFT<br>";
                        }
                        echo "</td></tr>";
                    ?>
                </table>
            </form>
        </div>
        <?php
        
        // scroll the table to show the first thumbnail change
        $scrollPos = $firstFrame * ($thumbSize + 8);
        ?>
        <script language="javascript">
            var scrollPos = <?php echo "$scrollPos;"; ?>
            document.getElementById("videoDiv").scrollLeft = scrollPos;
        </script>
        <?php
        
        // display the waterfall if there is only one test
        if( count($tests) == 1 )
        {
        ?>
        <div id="waterfall">
            <map name="waterfall_map">
            <?php
                $data = loadPageRunData($tests[0]['path'], $tests[0]['run'], $tests[0]['cached']);
                $secure = false;
                $haveLocations = false;
                $requests = getRequests($tests[0]['id'], $tests[0]['path'], $tests[0]['run'], $tests[0]['cached'], $secure, $haveLocations, false);
                $options = array( 'id' => $tests[0]['id'], 'path' => $tests[0]['path'], 'run' => $tests[0]['run'], 'cached' => $tests[0]['cached'], 'cpu' => false );
                $map = drawWaterfall($tests[0]['url'], $requests, $data, true, $options);
                foreach($map as $entry)
                {
                    if( $entry['request'] !== NULL )
                    {
                        $index = $entry['request'] + 1;
                        $title = $index . ': ' . $entry['url'];
                        echo '<area alt="' . $title . '" title="' . $title . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
                    }
                    else
                        echo '<area alt="' . $entry['url'] . '" title="' . $entry['url'] . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
                }
            ?>
            </map>
            
            <?php
            echo "<img id=\"waterfallImage\" usemap=\"#waterfall_map\" border=\"0\" alt=\"Waterfall\" src=\"/waterfall.php?width=930px&test={$tests[0]['id']}&run={$tests[0]['run']}&cached={$tests[0]['cached']}&cpu=0&bw=0\">";
            ?>
        </div>
        <?php
        }
        
        echo '<br><br>';
    }
}

/**
* Not all of the tests are done yet so display a progress update
* 
*/
function DisplayStatus()
{
    global $tests;
    
    echo "<h1>Please wait while the tests are run...</h1>\n";
    echo "<table id=\"statusTable\"><tr><th>Test</th><th>Status</th></tr><tr>";
    foreach($tests as &$test)
    {
        echo "<tr><td>{$test['name']}</td><td>";
        if( $test['done'] )
            echo "Done";
        elseif( $test['started'] )
            echo "Testing...";
        else
            echo "Waiting to be tested...";
        
        echo "</td></tr>";
    }
    echo "</table>";
}

/**
* Create a wrapable string from what was passed in
* 
* @param mixed $in
*/
function WrapableString($in)
{
    if( strpos(trim($in), ' '))
        $out = $in;
    else
        $out = join("&#8203;",str_split($in,1));
    
    return $out;
}
?>
