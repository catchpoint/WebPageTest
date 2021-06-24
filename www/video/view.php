<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
if( array_key_exists('embed', $_REQUEST) && $_REQUEST['embed'] )
{
  $ALLOW_IFRAME = true;
}
include 'common.inc';
require_once('archive.inc');
if (isset($_REQUEST['id']) && !preg_match('/^[\w\.\-_]+$/', $_REQUEST['id'])) {
  header("HTTP/1.0 404 Not Found");
  die();
}
$videoId = isset($_REQUEST['id']) ? htmlspecialchars($_REQUEST['id']) : null;
$valid = false;
$done = false;
$embed = false;
$dir = null;
if( array_key_exists('embed', $_REQUEST) && $_REQUEST['embed'] )
{
    $embed = true;
    header('Last-Modified: ' . gmdate('r'));
    header('Expires: '.gmdate('r', time() + 31536000));
}
$color = 'white';
$bgcolor = "black";
$lightcolor = '#777';
if (array_key_exists('bgcolor', $_REQUEST))
    $bgcolor = htmlspecialchars($_REQUEST['bgcolor']);
elseif (array_key_exists('bg', $_REQUEST))
    $bgcolor = htmlspecialchars('#' . $_REQUEST['bg']);
if (array_key_exists('color', $_REQUEST))
    $color = htmlspecialchars($_REQUEST['color']);
elseif (array_key_exists('text', $_REQUEST))
    $color = htmlspecialchars('#' . $_REQUEST['text']);
$autoplay = 'false';
if (array_key_exists('autoplay', $_REQUEST) && $_REQUEST['autoplay'])
    $autoplay = 'true';

$page_keywords = array('Video','comparison','WebPageTest','Website Speed Test');
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
$title = "WebPageTest - Visual Comparison";

if (isset($videoId)) {
  RestoreVideoArchive($videoId);
  $dir = GetVideoPath($videoId, true);
  if( is_dir("./$dir") )
  {
      $valid = true;
      $protocol = getUrlProtocol();
      $host  = $_SERVER['HTTP_HOST'];
      $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
      $videoUrl = "$protocol://$host$uri/download.php?id=$videoId";
      $embedUrl = "$protocol://$host$uri/view.php?embed=1&id=$videoId";

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
} elseif (isset($_REQUEST['tests'])) {
  // Generate the video and poster dynamically
  $location = isset($_REQUEST['loc']) ? htmlspecialchars(strip_tags($_REQUEST['loc'])) : null;
  $protocol = getUrlProtocol();
  $host  = $_SERVER['HTTP_HOST'];
  $hostname = GetSetting('host');
  if (isset($hostname) && is_string($hostname) && strlen($hostname)) {
      $host = $hostname;
  }
  $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
  $params = 'tests=' . htmlspecialchars($_REQUEST['tests']);
  $validParams = array('bg', 'text', 'end', 'labelHeight', 'timeHeight', 'slow');
  foreach ($validParams as $p) {
    if (isset($_REQUEST[$p])) {
      $params .= "&$p=" . htmlspecialchars($_REQUEST[$p]);
    }
  }
  $videoUrl = "$protocol://$host$uri/video.php?$params";
  $imagePreview = "$protocol://$host$uri/video.php?$params&format=gif";
  $posterUrl = "$protocol://$host$uri/poster.php?$params";
  $embedUrl = "$protocol://$host$uri/view.php?embed=1&$params";
  $valid = true;
  $done = true;
}

if( $xml || $json )
{
    $error = "Ok";
    if( $valid )
    {
        if( $done )
        {
            $code = 200;
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
        echo "<requestId>" . htmlspecialchars($_REQUEST['r']) . "</requestId>\n";
    echo "<data>\n";
    if (isset($videoId))
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
    if (isset($videoId))
      $ret['data']['videoId'] = $videoId;
    if( strlen($videoUrl) )
        $ret['data']['videoUrl'] = $videoUrl;
    if (strlen($embedUrl)) {
        $ret['data']['embedUrl'] = $embedUrl;
        if (isset($dir) && is_file("./$dir/video.png")) {
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
<html lang="en-us">
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
            <script>
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
            if (isset($videoUrl)) {
              echo '<meta property="og:video" content="' . htmlspecialchars($videoUrl) . '" />';
            }
            if (isset($imagePreview)) {
              echo '<meta property="og:image" content="' . htmlspecialchars($imagePreview) . '" />';
            }
        ?>
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
            div.box {
                text-align:center;
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
            <?php
            if( $embed )
                echo "body {background-color: " . htmlspecialchars($bgcolor) . "; margin:0; padding: 0;}";
            ?>
        </style>
        <script type="text/javascript">
            function ShowEmbed() {
                $("#embed").modal({opacity:80});
            }
        </script>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            if( !$embed ) {
                $tab = '';
                $nosubheader = true;
                include 'header.inc';
            }
?>
            <div class="box">

<?php
            if( $valid && ($done || $embed) )
            {
                if (!$embed) {
                  if (isset($location) && strlen($location))
                    echo "<div id=\"location\">Tested From: $location</div>";
                  if (array_key_exists('label', $_REQUEST) && strlen($_REQUEST['label']))
                    echo "<h2>" . htmlspecialchars($_REQUEST['label']) . "</h2>\n";
                }

                $width = 800;
                $height = 600;

                $hasThumb = false;
                if( isset($dir) && is_file("./$dir/video.png") )
                {
                    $hasThumb = true;
                    list($width, $height) = getimagesize("./$dir/video.png");
                }

                if( array_key_exists('width', $_REQUEST) && $_REQUEST['width'] )
                    $width = (int)$_REQUEST['width'];
                if( array_key_exists('height', $_REQUEST) && $_REQUEST['height'] )
                    $height = (int)$_REQUEST['height'];

                $poster = "";
                if (isset($posterUrl))
                  $poster = "poster=\"$posterUrl\"";
                elseif ($hasThumb)
                  $poster = "poster=\"/$dir/video.png\"";
                if (isset($dir))
                  $videoUrl = "/$dir/video.mp4";
                echo "<video id=\"player\" controls muted
                       preload=\"auto\" $poster>
                    <source src=\"$videoUrl\" type='video/mp4'>
                </video>";

                if(!$embed) {
                    if (isset($videoId)) {
                      echo "<br><a class=\"link\" href=\"$videoUrl\">Download</a>";
                      echo ' | <a class="link" href="javascript:ShowEmbed()">Embed</a><br>&nbsp;';
                    } else {
                      echo "<br><a class=\"link\" href=\"$videoUrl\">Video File</a>";
                      echo " | <a class=\"link\" href=\"$videoUrl&format=gif\">Animated Gif</a><br>&nbsp;";
                    }
                }
            }
            elseif( $valid && !$embed )
                echo '<h1>Your video will be available shortly.  Please wait...</h1>';
            elseif($embed)
                echo '<h1>The requested video does not exist.</h1>';
            else
                echo '<h1>The requested video does not exist.  Please try creating it again and if the problem persists please contact us.</h1>';
            ?>
</div>
            <?php
                if (!$embed)
                    include('footer.inc');
            ?>
        </div>
        <script>
          var video = document.getElementById('player');
          var started = false;
          video.addEventListener('click',function(){
              video.paused ? video.play() : video.pause();
          },false);
          video.addEventListener('mouseenter',function(){
            if (started) {
              video.setAttribute("controls","controls");
            }
          },false);
          video.addEventListener('mouseleave',function(){
            if (started) {
              video.removeAttribute("controls");
            }
          },false);
          video.addEventListener('play',function(){
            started = true;
            video.removeAttribute("controls");
          },false);
        </script>
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
            $protocol = getUrlProtocol();
            echo htmlspecialchars("<iframe src=\"$protocol://{$_SERVER['HTTP_HOST']}{$_SERVER['PHP_SELF']}?id=$videoId&embed=1$dimensions\"$framesize></iframe>");
            ?>
            </p>
            <input id="embed-ok" type=button class="simplemodal-close" value="OK">
        </div>
    </body>
</html>

<?php
}
