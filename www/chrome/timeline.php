<?php
/*
  To update the timeline, clone the inspector from a chromium build: out\Release\resources\inspector
*/
chdir('..');
include 'common.inc';
$newTimeline = gz_is_file("$testPath/{$run}{$cachedText}_trace.json");
if ($_REQUEST['run'] == 'lighthouse')
  $run = 'lighthouse';
$timelineUrlParam = "/getTimeline.php?timeline=t:$id,r:$run,c:$cached,s:$step";
if ($newTimeline) {
  $protocol = getUrlProtocol();
  $host  = $_SERVER['HTTP_HOST'];
  $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
  $cdn = GetSetting('cdn');
  $url = $cdn ? $cdn : "$protocol://$host";
  $url .= $uri;
  // short-term hack because the timeline code doesn't URLdecode query params and we can't pass any URL with an &
  $url .= "/inspector-20190809/inspector.html?experiments=true&loadTimelineFromURL=$timelineUrlParam";
  header("Location: $url");
}
?>
<!DOCTYPE html>
<html>
<head>
<style type="text/css">
  html, body{min-height: 100% !important; height: 100%;}
  body {margin:0px;padding:0px;overflow:hidden;}
  #devtools {overflow:hidden;height:100%;width:100%}
</style>
</head>
<body>
<script>
function DevToolsLoaded() {
  var devTools = document.getElementById("devtools").contentWindow;
<?php
if (!$newTimeline) {
  echo "devTools.InspectorFrontendAPI._runOnceLoaded(function(){(devTools.WebInspector.inspectorView.showPanel(\"timeline\")).loadFromURL(\"$timelineUrlParam\");});\n";
}
?>
}
</script>
<?php
if (!$newTimeline) {
  echo '<iframe id="devtools" frameborder="0" height="100%" width="100%" src="/chrome/inspector-20140603/devtools.html" onload="DevToolsLoaded();"></iframe>';
}
?>
</body>
</html>
