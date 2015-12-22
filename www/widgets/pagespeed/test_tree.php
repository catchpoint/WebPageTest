<!DOCTYPE html>
<html>
<head>
<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script>
</head>
<body>
<div id="pagespeed"></div>
<?php
    $testId = $_GET['test'];
    if (preg_match('/^(?:[a-zA-Z0-9_]+\.?)+$/', $testId)) {
      echo "<script type=\"text/javascript\" src=\"tree.php?test={$testId}&amp;div=pagespeed\"></script>\n";
    }
?>
</body>
</html>
