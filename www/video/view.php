<?php
chdir('..');
include 'common.inc';
$videoId = $_REQUEST['id'];
$valid = false;
$done = false;
$embed = false;
if( array_key_exists('embed', $_REQUEST) && $_REQUEST['embed'] )
{
    $embed = true;
    header('Last-Modified: ' . gmdate('r'));
    header('Expires: '.gmdate('r', time() + 31536000));
}
$color = 'white';
$bgcolor = "black";
$lightcolor = '#777';
$displayData = false;
if (array_key_exists('data', $_REQUEST) && $_REQUEST['data']) {
  $bgcolor = 'white';
  $color = "black";
  $displayData = true;
}
if (array_key_exists('bgcolor', $_REQUEST))
    $bgcolor = $_REQUEST['bgcolor'];
if (array_key_exists('color', $_REQUEST))
    $color = $_REQUEST['color'];
$autoplay = 'false';
if (array_key_exists('autoplay', $_REQUEST) && $_REQUEST['autoplay'])
    $autoplay = 'true';

$page_keywords = array('Video','comparison','Webpagetest','Website Speed Test');
$page_description = "Side-by-side video comparison of website performance.";

$xml = false;
$json = false;
if( array_key_exists('f', $_REQUEST)) {
  if (!strcasecmp($_REQUEST['f'], 'xml') )
    $xml = true;
  elseif( !strcasecmp($_REQUEST['f'], 'json') )
    $json = true;
}

$ini = null;
$title = "WebPagetest - Visual Comparison";

$dir = GetVideoPath($videoId, true);
if( is_dir("./$dir") )
{
    $valid = true;
    if (is_file("./$dir/video.mp4") || is_file("./$dir/video.ini")) {
        $ini = parse_ini_file("./$dir/video.ini");
        if( is_file("./$dir/video.mp4") || isset($ini['completed']) )
        {
            $done = true;
            GenerateVideoThumbnail("./$dir");
        }
    }
    
    // get the video time
    $date = gmdate("M j, Y", filemtime("./$dir"));
    if( is_file("./$dir/video.mp4")  )
        $date = gmdate("M j, Y", filemtime("./$dir/video.mp4"));
    $title .= " - $date";

    $labels = json_decode(file_get_contents("./$dir/labels.txt"), true);
    if( count($labels) )
    {
        $title .= ' : ';
        foreach($labels as $index => $label)
        {
            if( $index > 0 )
                $title .= ", ";
            $title .= $label;
        }
    }
    
    $location = null;
    if (gz_is_file("./$dir/testinfo.json")) {
        $tests = json_decode(gz_file_get_contents("./$dir/testinfo.json"), true);
        if (is_array($tests) && count($tests)) {
            foreach($tests as &$test) {
                if (array_key_exists('location', $test)) {
                    if (!isset($location)) {
                        $location = $test['location'];
                    } elseif ($location != $test['location']) {
                        $location = '';
                    }
                } else {
                    $location = '';
                }
            }
        }
    }
}

if( $xml || $json )
{
    $error = "Ok";
    if( $valid )
    {
        if( $done )
        {
            $code = 200;

            $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
            $host  = $_SERVER['HTTP_HOST'];
            $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
            $videoUrl = "$protocol://$host$uri/download.php?id=$videoId";
            $embedUrl = "$protocol://$host$uri/view.php?embed=1&id=$videoId";
        }
        else
            $code = 100;
    }
    else
    {
        $code = 400;
        $error = "Invalid video ID";
    }
}

if( $xml )
{
    header ('Content-type: text/xml');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<response>\n";
    echo "<statusCode>$code</statusCode>\n";
    echo "<statusText>$error</statusText>\n";
    if( strlen($_REQUEST['r']) )
        echo "<requestId>{$_REQUEST['r']}</requestId>\n";
    echo "<data>\n";
    echo "<videoId>$videoId</videoId>\n";
    if( strlen($videoUrl) )
        echo '<videoUrl>' . htmlspecialchars($videoUrl) . '</videoUrl>\n';
    echo "</data>\n";
    echo "</response>\n";
}
elseif( $json )
{
    $ret = array();
    $ret['statusCode'] = $code;
    $ret['statusText'] = $error;
    $ret['data'] = array();
    $ret['data']['videoId'] = $videoId;
    if( strlen($videoUrl) )
        $ret['data']['videoUrl'] = $videoUrl;
    if (strlen($embedUrl)) {
        $ret['data']['embedUrl'] = $embedUrl;
        if (is_file("./$dir/video.png")) {
            list($width, $height) = getimagesize("./$dir/video.png");
            $ret['data']['width'] = $width;
            $ret['data']['height'] = $height;
        }
    }
    json_response($ret);
}
else
{
?>
<!DOCTYPE html>
<html>
    <head>
        <title><?php echo $title;?></title>
        <?php
        if( $valid && !$done && !$embed )
        {
            $autoRefresh = true;
            $noanalytics = true;
            ?>
            <noscript>
            <meta http-equiv="refresh" content="10" />
            </noscript>
            <script language="JavaScript">
            setTimeout( "window.location.reload(true)", 10000 );
            </script>
            <?php
        }
        ?>
        <?php 
            if( !$embed )
            {
                $gaTemplate = 'Video'; 
                include ('head.inc'); 
            }
        ?>
        <link rel="stylesheet" href="/video/video-js.3.2.0/video-js.min.css" type="text/css">
        <style type="text/css">
            .content h2 {
                font-size: 1.5em;
                <?php
                echo "color: $color;\n";
                ?>
            }
            div.content
            {
                text-align:center;
                <?php
                echo "background-color: " . htmlspecialchars($bgcolor) . ";\n";
                echo "color: " . htmlspecialchars($color) . ";\n";
                ?>
                font-family: arial,sans-serif;
                padding: 0px 25px;
            }
            .link
            {
                text-decoration: underline;
                <?php
                echo "color: " . htmlspecialchars($color) . ";\n";
                ?>
            }
            #player
            {
                margin-left: auto;
                margin-right: auto;
            }
            #location {
                text-align: left;
                padding: 5px;
                width: 100%;
            }
            #embed
            {
                <?php
                    echo "background: " . htmlspecialchars($bgcolor) . ";\n";
                    echo "color: " . htmlspecialchars($color) . ";\n"
                ?>
                font-family: arial,sans-serif;
                padding: 20px;
            }
            #embed td
            {
                padding: 2px 10px;
            }
            #embed-ok
            {
                margin-left: auto;
                margin-right: auto;
                margin-top: 10px;
                display: block;
            }
            #embed-code
            {
            }
            #testmode
            {
              clear: both;
              float: right;
              <?php
              echo "color: " . htmlspecialchars($lightcolor) . ";\n";
              ?>
            }
            #testmode a.link
            {
              <?php
              echo "color: " . htmlspecialchars($lightcolor) . ";\n";
              ?>
            }
            .vjs-default-skin .vjs-controls {height: 0;}
            .vjs-default-skin .vjs-mute-control {display: none;}
            .vjs-default-skin .vjs-volume-control {display: none;}
            <?php
            if( $embed )
                echo "body {background-color: " . htmlspecialchars($bgcolor) . "; margin:0; padding: 0;}";
            ?>
        </style>
        <script type="text/javascript" src="/video/video-js.3.2.0/video.min.js"></script>
        <script type="text/javascript">
            function ShowEmbed() {
                $("#embed").modal({opacity:80});
            }
        </script>
    </head>
    <body>
        <div class="page">
            <?php
            if( !$embed ) {
                $tab = '';
                $nosubheader = true;
                include 'header.inc';
            }

            if( $valid && ($done || $embed) )
            {
                if (!$embed) {
                  if (isset($location) && strlen($location))
                    echo "<div id=\"location\">Tested From: $location</div>";
                  if (array_key_exists('label', $_REQUEST) && strlen($_REQUEST['label']))
                    echo "<h2>" . htmlspecialchars($_REQUEST['label']) . "</h2>\n";
                  if ($displayData)
                    DisplayData();
                }

                $width = 800;
                $height = 600;

                $hasThumb = false;
                if( is_file("./$dir/video.png") )
                {
                    $hasThumb = true;
                    list($width, $height) = getimagesize("./$dir/video.png");
                }

                if( array_key_exists('width', $_REQUEST) && $_REQUEST['width'] )
                    $width = (int)$_REQUEST['width'];
                if( array_key_exists('height', $_REQUEST) && $_REQUEST['height'] )
                    $height = (int)$_REQUEST['height'];

                echo "<script>\n";
                if (array_key_exists('html', $_REQUEST) && $_REQUEST['html'])
                    echo "_V_.options.techOrder = ['html5', 'flash'];\n";
                else
                    echo "_V_.options.techOrder = ['flash', 'html5'];\n";
                echo "_V_.options.flash.swf = '/video/player/flowplayer-3.2.16.swf';\n";
                echo "_V_.options.flash.flashVars = {config:\"{";
                echo "'clip':{'scaling':'fit'},";
                echo "'plugins':{'controls':{'volume':false,'mute':false,'stop':true,'tooltips':{'buttons':true,'fullscreen':'Enter fullscreen mode'}}},";
                echo "'canvas':{'backgroundColor':'#000000','backgroundGradient':'none'},";
                if ($hasThumb) {
                    echo "'playlist':[{'url':'/$dir/video.png'},{'url':'/$dir/video.mp4','autoPlay':$autoplay,'autoBuffering':false}]";
                } else {
                    echo "'playlist':[{'url':'/$dir/video.mp4','autoPlay':$autoplay,'autoBuffering':true}]";
                }
                echo "}\"};\n";
                echo "_V_.options.flash.params = {
                       allowfullscreen: 'true',
                       wmode: 'transparent',
                       allowscriptaccess: 'always'
                   };
                   _V_.options.flash.attributes={};\n";
                echo "</script>\n";
                    
                echo "<video id=\"player\" class=\"video-js vjs-default-skin\" controls
                  preload=\"auto\" width=\"$width\" height=\"$height\"";
                if ($hasThumb) {
                    echo " poster=\"/$dir/video.png\"";
                }
                echo "data-setup=\"{}\">
                    <source src=\"/$dir/video.mp4\" type='video/mp4'>
                </video>";

                if(!$embed) {
                    echo "<br><a class=\"link\" href=\"/video/download.php?id=$videoId\">Download</a> | ";
                    echo '<a class="link" href="javascript:ShowEmbed()">Embed</a>';
                    $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
                    $dataText = 'View as data comparison';
                    $dataUrl = "$protocol://{$_SERVER['HTTP_HOST']}{$_SERVER['PHP_SELF']}?id=$videoId&data=1";
                    if ($displayData) {
                      $dataText = 'View as video';
                      $dataUrl = "$protocol://{$_SERVER['HTTP_HOST']}{$_SERVER['PHP_SELF']}?id=$videoId";
                    }
                    if (defined('BARE_UI'))
                      $dataUrl .= '&bare=1';
                    echo "<div class=\"cleared\"></div><div id=\"testmode\"><a class=\"link\" href=\"$dataUrl\">$dataText</a></div>";
                }
            }
            elseif( $valid && !$embed )
                echo '<h1>Your video will be available shortly.  Please wait...</h1>';
            elseif($embed)
                echo '<h1>The requested video does not exist.</h1>';
            else
                echo '<h1>The requested video does not exist.  Please try creating it again and if the problem persists please contact us.</h1>';
            ?>
            
            <?php 
                if (!$embed)
                    include('footer.inc'); 
            ?>
        </div>
        <div id="embed" style="display:none;">
            <h3>Video Embed</h3>
            <p>Copy and past the code below into a website to embed the video.</p>  
            <p>You can adjust the size of the video as necessary by changing the 
            width and height parameters<br>(make sure to change both the parameters on 
            the src URL and the iFrame).</p>
            <p id="embed-code">
            <?php
            $dimensions = '';
            $framesize = '';
            if (isset($width) && isset($height) && $width && $height) {
              $dimensions = "&width=$width&height=$height";
              $framesize = " width=\"$width\" height=\"$height\"";
            }
            $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
            echo htmlspecialchars("<iframe src=\"$protocol://{$_SERVER['HTTP_HOST']}{$_SERVER['PHP_SELF']}?id=$videoId&embed=1$dimensions\"$framesize></iframe>");
            ?>
            </p>
            <input id="embed-ok" type=button class="simplemodal-close" value="OK">
        </div>
    </body>
</html>

<?php
}

function DisplayData() {
  global $tests;
  $metrics = array('loadTime' => 'Page Load Time',
                   'SpeedIndex' => '<a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index">Speed Index</a> (lower is better)');
  echo '<br><table class="batchResults" border="1" cellpadding="15" cellspacing="0">
          <tr>
          <th class="empty"></th>';
  foreach ($tests as &$test) {
    RestoreTest($test['id']);
    $label = '';
    if (array_key_exists('label', $test))
      $label = htmlspecialchars($test['label']);
    echo "<th>$label</th>";
  }
  echo "</tr>\n";
  foreach ($metrics as $metric => $label) {
    echo "<tr><td class=\"right\"><b>$label</b></td>";
    $base = null;
    $index = 0;
    foreach ($tests as &$test) {
      $display = '';
      $value = null;
      if (array_key_exists('cached', $test) &&
          array_key_exists('run', $test) &&
          array_key_exists('pageData', $test) &&
          is_array($test['pageData']) &&
          array_key_exists($test['run'], $test['pageData']) &&
          is_array($test['pageData'][$test['run']]) &&
          array_key_exists($test['cached'], $test['pageData'][$test['run']]) &&
          is_array($test['pageData'][$test['run']][$test['cached']]) &&
          array_key_exists($metric, $test['pageData'][$test['run']][$test['cached']])) {
        $value = htmlspecialchars($test['pageData'][$test['run']][$test['cached']][$metric]);
        if ($metric == 'loadTime')
          $display = number_format($value / 1000, 3) . 's';
        else
          $display = number_format($value, 0);
      }
      if (!$index)
        $base = $value;
      elseif(isset($base) && isset($value)) {
        $delta = $value - $base;
        $deltaPct = number_format(abs(($delta / $base) * 100), 1);
        if ($metric == 'loadTime')
          $deltaStr = number_format(abs($delta / 1000), 3) . 's';
        else
          $deltaStr = number_format(abs($delta), 0);
        $deltaStr = htmlspecialchars("$deltaStr / $deltaPct%");
        if ($delta > 0)
          $display .= " <span class=\"bad\">(+$deltaStr)</span>";
         elseif ($delta < 0)
          $display .= " <span class=\"good\">(-$deltaStr)</span>";
         else
          $display .= "(No Change)";
      }
      echo "<td>$display</td>";
      $index++;
    }
    echo "</tr>";
  }
  echo "<tr><td class=\"right\">Full Test Result</td>";
  foreach ($tests as &$test) {
    $img = '';
    if (array_key_exists('id', $test)) {
      if( FRIENDLY_URLS )
        $result = "/result/{$test['id']}/";
      else
        $result = "/results.php?test={$test['id']}";
      $cached = '';
      if ($test['cached'])
        $cached = '_Cached';
      $thumbnail = "/thumbnail.php?test={$test['id']}&width=150&file={$test['run']}{$cached}_screen.jpg";
      $img = "<a href=\"$result\"><img class=\"progress pimg\" src=\"$thumbnail\"><br>view test</a>";
    }
    echo "<td>$img</td>";
  }
  echo '</tr></table><br>';
  $filmstrip = "/video/compare.php?tests=";
  foreach ($tests as &$test)
    $filmstrip .= urlencode("{$test['id']}-r:{$test['run']}-c:{$test['cached']}-l:{$test['label']}") . ',';
  echo "<h2>Visual Comparison (<a href=\"$filmstrip\">view filmstrip comparison</a>)</h2>";
}
?>
