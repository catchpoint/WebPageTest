<html>
<body>
<h1>Job Processor Log File</h1>
<pre>
<?php
  $wptResultId=$_REQUEST['wptResultId'];
  $timeStamp = $_REQUEST['timeStamp'];
  $timeStamp = date("m/d/Y h:i", $timeStamp);

  echo "Result ID: ".$wptResultId."<br>";
  echo "Result ID: ".$timeStamp."<br>";
  if ( $wptResultId == -1 ){
    $searchFor = $timeStamp;
  } else {
    $searchFor = $wptResultId;
  }
  if (!$lineCount = $_REQUEST['lineCount']){
    $lineCount = 100;
  }
  $linePoint = 0;

  $file = 'jobProcessor_log.html';
  $lines = file($file);

  for($i=count($lines);$i>0;$i--){
    if ($linePoint == 0 && strpos($lines[$i],$searchFor)){
      $linePoint = 1;
    }
    if ( $linePoint > 0 && $linePoint < $lineCount ){
      echo $lines[$i];
      $linePoint++;
    }
    if ( $linePoint > $lineCount){
      echo "......<br>";
      echo "......<br>";
      echo "......<br>";
      $linePoint = 0;
    }
  }
?>
</pre>
</body>
</html>


