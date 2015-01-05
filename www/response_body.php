<?php
include 'common.inc';
$body = null;
if (isset($_GET['request'])) {
  $request = (int)$_GET['request'];
} elseif (isset($_GET['url'])) {
  // figure out the request ID from the URL
  $url = trim($_GET['url']);
  if (substr($url, 0, 4) != 'http')
    $url = 'http://' . $url;
  require_once('object_detail.inc');
  $secure = false;
  $haveLocations = false;
  $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, true);
  foreach( $requests as &$r ) {
    if ($r['full_url'] == $url) {
      $request = $r['number'];
      break;
    }
  }
}
if ($request) {
    $bodies_file = $testPath . '/' . $run . $cachedText . '_bodies.zip';
    if (is_file($bodies_file)) {
        $zip = new ZipArchive;
        if ($zip->open($bodies_file) === TRUE) {
            for( $i = 0; $i < $zip->numFiles; $i++ ) {
                $index = intval($zip->getNameIndex($i), 10);
                if ($index == $request) {
                    $body = $zip->getFromIndex($i);
                    break;
                }
            }
        }
    }
}

if (isset($body)) {
    header ("Content-type: text/plain");
    echo $body;
} else {
    header("HTTP/1.0 404 Not Found");
}
?>
