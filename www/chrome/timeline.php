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
$newTimeline = gz_is_file("$testPath/{$run}{$cachedText}_trace.json");
$protocol = getUrlProtocol();
$host  = $_SERVER['HTTP_HOST'];
$uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
$cdn = GetSetting('cdn');
$url = $cdn ? $cdn : "$protocol://$host";
$url .= $uri;
if ($newTimeline) {
  $url .= "/inspector-20210119/inspector.html?experiments=true&loadTimelineFromURL=$timelineUrlParam";
} else {
  $url = '/chrome/inspector-20140603/devtools.html';
}
?>
<!DOCTYPE html>
<head>
<link rel="apple-touch-icon" sizes="192x192" href="/images/icons-192.png">
<link rel="icon" type="image/png" sizes="96x96" href="/images/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
  <script>
    if (!localStorage.getItem("wptdevtools.initialized")) {
      localStorage.setItem('screencastEnabled', false);
      localStorage.setItem('wptdevtools.initialized', true);
    }
    function DevToolsLoaded() {
      <?php
      if (!$newTimeline) {
        echo "var devTools = document.getElementById(\"devtools\").contentWindow;\n";
        echo "devTools.InspectorFrontendAPI._runOnceLoaded(function(){(devTools.WebInspector.inspectorView.showPanel(\"timeline\")).loadFromURL(\"$timelineUrlParam\");});\n";
      }
      ?>
    }
  </script>
</head>
<body style="margin:0px;padding:0px;overflow:hidden">
  <?php
  echo '<iframe id="devtools" src="' . $url . '" frameborder="0" style="overflow:hidden;overflow-x:hidden;overflow-y:hidden;height:100%;width:100%;position:absolute;top:0px;left:0px;right:0px;bottom:0px" height="100%" width="100%" onload="DevToolsLoaded();"></iframe>';
  ?>
</body>
</html>
