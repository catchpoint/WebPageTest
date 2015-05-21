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
  echo '<iframe id="devtools" frameborder="0" height="100%" width="100%" src="/chrome/inspector-20150519/devtools.html?loadTimelineFromURL=/getTimeline.php?test=$id&run=$run&cached=$cached"></iframe>';
} else {
  echo '<iframe id="devtools" frameborder="0" height="100%" width="100%" src="/chrome/inspector-20140603/devtools.html" onload="DevToolsLoaded();"></iframe>';
}
?>
</body>
</html>