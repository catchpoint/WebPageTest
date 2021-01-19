<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
/*
  To update the timeline, clone the inspector from a chromium build: out\Release\resources\inspector
*/
chdir('..');
include 'common.inc';
if ($_REQUEST['run'] == 'lighthouse')
  $run = 'lighthouse';
$timelineUrlParam = "/getTimeline.php?timeline=t:$id,r:$run,c:$cached,s:$step";
$protocol = getUrlProtocol();
$host  = $_SERVER['HTTP_HOST'];
$uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
$cdn = GetSetting('cdn');
$url = $cdn ? $cdn : "$protocol://$host";
$url .= $uri;
// short-term hack because the timeline code doesn't URLdecode query params and we can't pass any URL with an &
$url .= "/inspector-20210119/inspector.html?experiments=true&loadTimelineFromURL=$timelineUrlParam";
?>
<!DOCTYPE html>
<head>
  <script>
    localStorage.setItem('screencastEnabled', false);
    localStorage.setItem('Inspector.drawerSplitViewState', {"horizontal":{"size":0,"showMode":"OnlyMain"}});
  </script>
</head>
<body style="margin:0px;padding:0px;overflow:hidden">
  <?php
  echo '<iframe src="' . $url . '" frameborder="0" style="overflow:hidden;overflow-x:hidden;overflow-y:hidden;height:100%;width:100%;position:absolute;top:0px;left:0px;right:0px;bottom:0px" height="100%" width="100%"></iframe>';
  ?>
</body>
</html>
