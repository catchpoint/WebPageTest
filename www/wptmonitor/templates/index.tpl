<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
{include file='headIncludes.tpl'}
</head>
<body>
  <div class="page">
  {include file='header.tpl'}
  {include file='navbar.tpl'}
    <div id="main">
     <div class="level_2">
     <div class="content-wrap">
       <div class="content" style="height:600px">
       <br><h2 class="cufon-dincond_black">MONITOR A WEBSITE'S PERFORMANCE</h2>
       <div class="content" style="height:90%;">
            <div class="translucent" style="height:90%;">
            {if $message}
            {$message}
            {else}
                <p>WebPagetest Monitor is a tool that provides the ability to create recurring jobs for a WebPagetest instance. The jobs will be passed to the indicated WebPagetest instance and the results will be collected.</p>
            {/if}
                <p>If you are having any problems of just have questions about the site, please feel free to <a href="mailto:{$contactEmail}">contact us</a>.</p>
          </div>
            <div style="float:right;vertical-align:bottom;clear:both;font-size: larger;"><br><p>Powered by <a target="_blank" href="http://www.wptmonitor.org/">WPTMonitor</a></p></div>

        </div>
      </div>
    </div>
  </div>
</body>
</html>