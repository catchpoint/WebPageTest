<?php
function GetJpegInfo($file) {
  $info = array('jpeg' => false,
                'filesize' => 0,
                'imagedata' => 0,
                'appdata' => 0,
                'progressive' => false,
                'commentsize' => 0,
                'comment' => '',
                'scans' => 0);
  $bytes = file_get_contents($file);
  if ($bytes !== false) {
    $i = 0;
    $size = $info['filesize'] = strlen($bytes);
    while (FindNextMarker($bytes, $size, $i, $marker, $marker_length)) {
      $marker = bin2hex($marker);
      if ($marker == 'ffd8')
        $info['jpeg'] = true;
      elseif ($marker == 'ffc2')
        $info['progressive'] = true;
      elseif ($marker == 'ffda')
        $info['scans']++;
      elseif ($marker == 'fffe') {
        $info['commentsize'] += $marker_length;
        $info['comment'] = substr($bytes, $i, $marker_length);
      } elseif (substr($marker, 0, 3) == 'ffe')
        $info['appdata'] += $marker_length;
      if (substr($marker, 0, 3) == 'ffc' || substr($marker, 0, 3) == 'ffd')
        $info['imagedata'] += $marker_length;
      $i += $marker_length;
    }
  }
  if (!$info['jpeg'])
    $info = false;
  return $info;
}

function FindNextMarker(&$bytes, $size, &$i, &$marker, &$marker_length) {
  $marker_length = 0;
  $marker = null;
  $found = false;
  $nolength = array('d0','d1','d2','d3','d4','d5','d6','d7','d8','d9','01');
  $sos = 'da';
  if ($i < $size) {
    $val = dechex(ord($bytes[$i]));
    if ($val == 'ff') {
      $marker = $bytes[$i];
      // ff can repeat, the actual marker comes from the first non-ff
      while ($val == 'ff') {
        $i++;
        $val = dechex(ord($bytes[$i]));
      }
      $marker .= $bytes[$i];
      $i++;
      if (in_array($val, $nolength)) {
        $found = true;
      } elseif($val == $sos) {
        // image data
        $j = $i + 1;
        $next_marker = $size;
        while ($j < $size - 1 && !$found) {
          $val = dechex(ord($bytes[$j]));
          if ($val == 'ff') {
            $k = $j + 1;
            $val = dechex(ord($bytes[$k]));
            if ($val != '00') {   // escaping
              while ($k < $size - 1 && $val == 'ff') {
                $k++;
                $val = dechex(ord($bytes[$k]));
              }
              $next_marker = $j;
              $found = true;
            }
          }
          $j++;
        }
        $marker_length = $next_marker - $i;
      } elseif ($i + 1 < $size) {
        $l1 = ord($bytes[$i]);
        $l2 = ord($bytes[$i+1]);
        $marker_length = $l1 * 256 + $l2;
        $found = true;
      }
    }
  }
  return $found;
}
?>
