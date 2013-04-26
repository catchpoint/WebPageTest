<?php
/*
  To update the timeline, clone the inspector from a chromium build: out\Release\resources\inspector
*/
chdir('..');
include 'common.inc';
?>
<!DOCTYPE html>
<html>
<head>
<style type="text/css">
  body {margin:0px;padding:0px;overflow:hidden;height:100%}
  #devtools {overflow:hidden;height:100%;width:100%}
</style>
</head>
<body>
<script>
function DevToolsLoaded() {
<?php
  echo "var timelineUrl = \"/getTimeline.php?test=$id&run=$run&cached=$cached\";\n";
?>
  var devTools = document.getElementById("devtools").contentWindow;
  devTools.InspectorFrontendAPI.dispatch(["loadTimelineFromURL", timelineUrl]);
}
</script>
<iframe id="devtools" frameborder="0" height="100%" width="100%" src="devtools.html" onload="DevToolsLoaded();"></iframe>
</body>
</html>