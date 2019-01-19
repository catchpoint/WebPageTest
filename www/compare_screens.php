<?php
if(array_key_exists("HTTP_IF_MODIFIED_SINCE",$_SERVER) && strlen(trim($_SERVER['HTTP_IF_MODIFIED_SINCE'])))
{
    header("HTTP/1.0 304 Not Modified");
}
else
{
  include 'common.inc';
  $labelFont = __DIR__ . '/video/font/sourcesanspro-semibold.ttf';
  $tests = ParseTests();
  if ($tests) {
    $width = 0;
    $height = 0;
    $textHeight = 100;
    $textMargin = 4;
    $spacing = 4;
    $fontSize = 0;
    foreach ($tests as $test) {
      if ($width)
        $width += 4;
      $width += $test['width'];
      if ($test['height'] > $height)
        $height = $test['height'];
      $size = GetFontSize($test['width'], $test['height'], $test['label']);
      if ($size && (!$fontSize || $size < $fontSize))
        $fontSize = $size;
    }
    $textTop = $height;
    $height += $textHeight;

    $im = imagecreatetruecolor($width, $height);
    $black = imagecolorallocate($im, 0, 0, 0);
    $textColor = imagecolorallocate($im, 255, 255, 255);
    imagefilledrectangle($im, 0, 0, $width - 1, $height - 1, $black);

    $x = 0;
    foreach ($tests as $test) {
      if (substr($test['image'], -4) == '.png')
        $frame = imagecreatefrompng($test['image']);
      else
        $frame = imagecreatefromjpeg($test['image']);
      if (isset($frame) && $frame !== false) {
        $w = imagesx($frame);
        $h = imagesy($frame);
        imagecopy($im, $frame, $x, 0, 0, 0, $w, $h);
        imagedestroy($frame);
        unset($frame);

        $rect = $test['labelRect'];
        $pos = CenterText($im, $x + $textMargin, $textTop + $textMargin, $w - 2 * $textMargin, $textHeight - 2 * $textMargin, $fontSize, $test['label']);
        if (isset($pos))
          imagettftext($im, $fontSize, 0, $pos['x'],  $pos['y'], $textColor, $labelFont, $test['label']);

        $x += $w + $spacing;
      }
    }

    header ("Content-type: image/png");
    imagepng($im);
  } else {
    header("HTTP/1.0 404 Not Found");
  }
}

/**
* Parse the list of tests and identify the screenshots to compare
*
*/
function ParseTests() {
  $tests = array();
  global $median_metric;

  if (isset($_REQUEST['tests'])) {
    $groups = explode(',', $_REQUEST['tests']);
    foreach ($groups as $group) {
      $parts = explode('-', $group);
      if (count($parts) >= 1 && ValidateTestId($parts[0])) {
        $test = array();
        $test['id'] = $parts[0];
        $test['cached'] = 0;
        for ($i = 1; $i < count($parts); $i++) {
          $p = explode(':', $parts[$i]);
          if (count($p) >= 2) {
            if( $p[0] == 'r' )
                $test['run'] = (int)$p[1];
            if( $p[0] == 'l' )
                $test['label'] = $p[1];
            if( $p[0] == 'c' )
                $test['cached'] = (int)$p[1];
          }
        }
        RestoreTest($test['id']);
        $test['path'] = GetTestPath($test['id']);

        if (!isset($test['run'])) {
          $pageData = loadAllPageData($test['path']);
          $test['run'] = GetMedianRun($pageData, $test['cached'], $median_metric);
        }

        if (!isset($test['label'])) {
          $label = getLabel($test['id'], $user);
          if (!empty($label)) {
            $test['label'] = $new_label;
          } else {
            $info = GetTestInfo($test['id']);
            if ($info && isset($info['label']) && strlen($info['label']))
              $test['label'] = trim($info['label']);
          }
        }
        if (!isset($test['label']))
          $test['label'] = $test['id'];

        $cachedText = '';
        if($test['cached'])
            $cachedText='_Cached';
        $fileBase = "{$test['path']}/{$test['run']}{$cachedText}_screen";
        if (is_file("$fileBase.png"))
          $test['image'] = "$fileBase.png";
        elseif (is_file("$fileBase.jpg"))
          $test['image'] = "$fileBase.jpg";

        if (isset($test['image'])) {
          $size = getimagesize($test['image']);
          if ($size && count($size) >= 2 && $size[0] > 0 && $size[1] > 0) {
            $test['width'] = $size[0];
            $test['height'] = $size[1];
            $tests[] = $test;
          }
        }
      }
    }
  }

  if (!count($tests))
    unset($tests);
  return $tests;
}

/**
* Get the largest font size that will fit the text in the target area
*
* @param mixed $width
* @param mixed $height
* @param mixed $text
* @param mixed $font
*/
function GetFontSize($width, $height, $text) {
  global $labelFont;
  $small = 0;
  $big = 100;
  $size = 50;
  do {
    $last_size = $size;
    $box = imagettfbbox($size, 0, $labelFont, $text);
    $w = abs($box[4] - $box[0]);
    $h = abs($box[5] - $box[1]);
    if ($w < $width && $h < $height) {
      $small = $size;
      $size = floor($size + (($big - $size) / 2));
    } else {
      $big = $size;
      $size = floor($size - (($size - $small) / 2));
    }
  } while ($last_size !== $size && $size > 0);

  return $size;
}

function CenterText($im, $x, $y, $w, $h, $size, $text) {
  global $labelFont;
  $ret = null;
  if (!$size)
    $size = GetFontSize($w, $h, $text);
  if ($size) {
    $box = imagettfbbox($size, 0, $labelFont, $text);
    $ascent = abs($box[7]);
    $ret = array();
    $out_w = abs($box[4] - $box[0]);
    $out_h = abs($box[5] - $box[1]);
    $ret['x'] = floor($x + (($w - $out_w) / 2));
    $ret['y'] = floor($y + (($h - $out_h) / 2)) + $ascent;
  }
  return $ret;
}

?>
