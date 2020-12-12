<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once(__DIR__ . '/../util.inc');
$version = 9;
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
            if( count($parts) > 1 )
                $tests .= "-r:{$parts[1]}";
            if( count($parts) > 2 && strlen(trim($parts[2])) )
                $tests .= '-l:' . urlencode($parts[2]);
            if( count($parts) > 3 )
                $tests .= "-c:{$parts[3]}";
            if( count($parts) > 4 && strlen(trim($parts[4])) )
                $tests .= "-e:{$parts[4]}";
            if( count($parts) > 5 )
                $tests .= "-s:{$parts[5]}";
            if( count($parts) > 6 )
                $tests .= "-d:{$parts[6]}";
            if( count($parts) > 7 )
                $tests .= "-f:{$parts[7]}";
        }
    }

    $protocol = getUrlProtocol();
    $host  = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['PHP_SELF'];
    $params = '';
    foreach( $_GET as $key => $value )
        if( $key != 't' && !is_array($value))
            $params .= "&$key=" . urlencode($value);
    header("Location: $protocol://$host$uri?tests=$tests{$params}");
}
else
{
    // Redirect to the dynamically-created video directly (we don't create static videos anymore)
    $protocol = getUrlProtocol();
    $host  = $_SERVER['HTTP_HOST'];
    $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
    $params = 'tests=' . htmlspecialchars($_REQUEST['tests']);
    $validParams = array('bg', 'text', 'end', 'labelHeight', 'timeHeight', 'slow');
    foreach ($validParams as $p) {
      if (isset($_REQUEST[$p])) {
        $params .= "&$p=" . htmlspecialchars($_REQUEST[$p]);
      }
    }
    $videoUrl = "$protocol://$host$uri/video.php?$params";
    header("Location: $videoUrl");
}
?>
