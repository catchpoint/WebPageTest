<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
include 'common.inc';
RestoreTest($id);

if ($_REQUEST['run'] == 'lighthouse') {
    $fileBase = 'lighthouse';
} else {
    $stepSuffix = $step > 1 ? ("_" . $step) : "";
    $fileBase = "$run{$cachedText}{$stepSuffix}";
}
$url = "../getgzip.php?test={$id}&file={$fileBase}_trace.json";
?>
<!DOCTYPE html>
<head>
<link rel="apple-touch-icon" sizes="192x192" href="/images/icons-192.png">
<link rel="icon" type="image/png" sizes="96x96" href="/images/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
  <script>
    async function PerfettoLoaded() {
      <?php
      echo "const traceUrl = new URL('$url', window.location).href;\n";
      ?>
      const resp = await fetch(traceUrl);
      const blob = await resp.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const ORIGIN = 'https://ui.perfetto.dev';
      document.getElementById('perfetto').contentWindow.postMessage({
            perfetto: {
                buffer: arrayBuffer,
                title: 'WebPageTest Trace',
                url: window.location.toString(),
            }}, ORIGIN);
    }
  </script>
</head>
<body style="margin:0px;padding:0px;overflow:hidden">
  <?php
    echo '<iframe id="perfetto" src="https://ui.perfetto.dev" frameborder="0" style="overflow:hidden;overflow-x:hidden;overflow-y:hidden;height:100%;width:100%;position:absolute;top:0px;left:0px;right:0px;bottom:0px" height="100%" width="100%" onload="PerfettoLoaded();"></iframe>';
    ?>
</body>
</html>
