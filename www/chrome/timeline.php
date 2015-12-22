<?php
/*
  To update the timeline, clone the inspector from a chromium build: out\Release\resources\inspector
*/
chdir('..');
include 'common.inc';
$newTimeline = gz_is_file("$testPath/{$run}{$cachedText}_trace.json");
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
  echo "devTools.InspectorFrontendAPI._runOnceLoaded(function(){(devTools.WebInspector.inspectorView.showPanel(\"timeline\")).loadFromURL(\"/getTimeline.php?test=$id&run=$run&cached=$cached\");});\n";
}
?>
}
</script>
<?php
if ($newTimeline) {
  $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
  $host  = $_SERVER['HTTP_HOST'];
  $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
  $cdn = GetSetting('cdn');
  $url = $cdn ? $cdn : "$protocol://$host";
  $url .= $uri;
  $url .= "/inspector-20151104/inspector.html?experiments=true&loadTimelineFromURL=/getTimeline.php?test=$id&run=$run&cached=$cached";
  header("Location: $url");
} else {
  echo '<iframe id="devtools" frameborder="0" height="100%" width="100%" src="/chrome/inspector-20140603/devtools.html" onload="DevToolsLoaded();"></iframe>';
}
?>
</body>
</html>