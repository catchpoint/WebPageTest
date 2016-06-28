<?php
// See if they are authorized to use the redirector (requires keys in settings/redirect_keys.ini)
$ok = false;
if (isset($_REQUEST['k']) && isset($_REQUEST['url'])) {
  $keys = @parse_ini_file(__DIR__ . '/settings/redirect_keys.ini', true);
  if (isset($keys) && is_array($keys))
    $ok = isset($keys[$_REQUEST['k']]);
}

if (!$ok) {
  header('HTTP/1.1 403 Forbidden');
  echo "<html><body>Access Denied</body></html>";
  exit(0);
}
$url = str_replace('"', '', $_REQUEST['url']);
if (substr($url, 0, 4) != 'http')
  $url = 'http://' . $url;
$delay = 500;
if (isset($_REQUEST['delay']))
  $delay = min(max(0, $_REQUEST['delay']), 600000);
?>
<html>
<head>
  <style type="text/css">
    body {background-color: #FFFFFF;}
    #orange {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background-color: #DE640D;
    }
  </style>
</head>
<body>
<div id="orange"></div>
<img style="position: fixed; left: -2px; width: 1px; height: 1px" src="https://www.google.com/favicon.ico">
<script>
<?php
  echo "var url = \"$url\";\n";
  echo "var delay = $delay;\n";
?>
if (!Date.now)
  Date.now = function() {return new Date().getTime();};
if (!window.requestAnimationFrame)
  window.requestAnimationFrame = function(callback) {return setTimeout(callback, 16);}

function loaded() {
  // Leave the orange screen up for the configured delay
  setTimeout(function(){
    // Wait until the next animation frame to remove the orange screen
    window.requestAnimationFrame(function() {
      var orange = document.getElementById("orange");
      orange.parentNode.removeChild(orange);
      // Wait until the next animation frame to start the navigation
      window.requestAnimationFrame(function() {
        window.location = url;
      });
    });
  }, delay);
}

if (window.addEventListener)
 window.addEventListener( "load", loaded, false );
else if ( window.attachEvent )
  window.attachEvent( "onload", loaded );
else if ( window.onLoad )
  window.onload = loaded;
  
</script>
</body>
</html>