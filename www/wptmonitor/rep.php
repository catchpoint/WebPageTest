<?php
include ('xml.php');
//$reportDateStart = date("y/m/d");
//$reportDateEnd = date("y/m/d");
if (!$_REQUEST['download']) {
echo "<html>";
echo "    <body>";
echo "    <form action=report.php>";
echo "      Start ( y/m/d ): <input name=startDate type=text value=".$_REQUEST['startDate']."><br>";
echo "      End ( y/m/d ): <input name=endDate type=text value=".$_REQUEST['endDate']."><br>";
echo "      Download: <input type=checkbox name=download><br>";
echo "      <input type=hidden name=exec value=1>";
echo "      NOTE: Downloaded data is not adjusted for TTFB";
echo "      <input type=submit value=View><br>";
echo "    </form>";
echo "    </body>";
echo "    </html>";
}
if ($_REQUEST['startDate']) {
  $reportDateStart = $_REQUEST['startDate'];
  //date("y/m/d", strtotime($_REQUEST['startDate']));
} else {
  $reportDateStart = date('Y/m/d');
}
if ($_REQUEST['endDate']) {
  $reportDateEnd = $_REQUEST['endDate'];
  //date("y/m/d", strtotime($_REQUEST['endDate']));
} else {
  $reportDateEnd = $reportDateStart;
}
$results = array();
$infos = getResultIDs($reportDateStart, $reportDateEnd);

foreach ($infos as $info)
{
  $id = $info["id"];
  $date = substr($info["date"],2);
  $resultXml = file_get_contents(getBaseURL()."/xmlResult/$id/");
  if ( !$resultXml ){
    continue;
  }
  $ix = strrpos($id, "_") + 1;
  $shortId = substr($id, $ix);
  // If no label file then skip it
  if ( !file_exists("/var/www/html/results/".$date."/$shortId/label.txt") ){
    continue;
  }

  $resultLabel = file_get_contents("/var/www/html/results/".$date."/$shortId/label.txt");

  $xml = new SimpleXMLElement($resultXml);
  $firstView = $xml->data->average->firstView;
  $url = $xml->data->run->firstView->results->URL;
  print "labe: ".$item['label']."<br>";
  print "bytes in: ".$firstView->bytesIn."<br>";
  print "loadtime: ".$firstView->loadTime."<br>";
  print "ttfb:".$item['ttfb']."<br><br>";

  if ($firstView->loadTime && $firstView->bytesIn > 100) {
    $item = array();
    $item["label"] = $resultLabel;
    $item["id"] = $id;
    $item["date"] = $date;
    $item["ttfb"] = $firstView->TTFB;
    $item["render"] = $firstView->render - $firstView->TTFB;
    $item["fully"] = $firstView->docTime - $firstView->TTFB;
    $item["renderWithTTFB"] = $firstView->render;
    $item["docLoadWithTTFB"] = $firstView->docTime;

    $results[] = $item;
  } else {
    print "<textarea>".$resultXml."</textarea><hr>";
    print_r ($info);
  }

}
if ( $_REQUEST['download'] ){
  header("Content-Type: text/csv");
  header("Content-Disposition: attachment; filename=\"data.csv\"");

  echo "id, date, label,TTFB, render,docComplete\n";
  foreach ($results as $result){
    echo $result['id'].",".$result['date'].",".$result['label'].",".$result['ttfb'].",".$result['renderWithTTFB'].",".$result['docLoadWithTTFB']."\n";
  }
}else {
$renderTotal = array();
$renderTotalWithTTFB = array();
$fullyTotal = array();
$docLoadedWithTTFB = array();
$count = array();
array_multisort($results);
foreach ($results as $result) {
  $label = $result["label"];
  $render = $result["render"];
  $renderWithTTFB = $result["renderWithTTFB"];
  $docLoadWithTTFB=$result["docLoadWithTTFB"];
  $fully = $result["fully"];
  $renderTotal[$label] += $render;
  $renderTotalWithTTFB[$label] += $renderWithTTFB;
  $docLoadedWithTTFB[$label] += $docLoadWithTTFB;
  $fullyTotal[$label] += $fully;
  $count[$label]++;
}
echo "<h1>Range (y/m/d): $reportDateStart - $reportDateEnd</h1><br>";

$displayResults ="<h2>NOT Adjusted </h2>\n";
$displayResults .="<table>";
$displayResults .="<tr align=right bgcolor=eeeeee><td>Page</td><td>Render (ms)</td><td>Doc (ms)</td></tr>";
$displayResults .=displayInfo("HomePageDirect", "HomePageOptimized", $renderTotalWithTTFB, $docLoadedWithTTFB, $count);
$displayResults .=displayInfo("HLPDirect", "HLPOptimized", $renderTotalWithTTFB, $docLoadedWithTTFB, $count);
$displayResults .=displayInfo("FLPDirect", "FLPOptimized", $renderTotalWithTTFB, $docLoadedWithTTFB, $count);
$displayResults .=displayInfo("HSRDirect", "HSROptimized", $renderTotalWithTTFB, $docLoadedWithTTFB, $count);
$displayResults .=displayInfo("FSRDirect", "FSROptimized", $renderTotalWithTTFB, $docLoadedWithTTFB, $count);
$displayResults .=displayInfo("PSRDirect", "PSROptimized", $renderTotalWithTTFB, $docLoadedWithTTFB, $count);
$displayResults .="</table><p><br><table>";
$displayResults .= "<h2>Adjusted by subtracting TTFB from both direct and optimized render and doc load times.</h2>\n";
$displayResults .= "<tr align=right bgcolor=eeeeee><td>Page</td><td>Render (ms)</td><td>Doc (ms)</td></tr>";
$displayResults .= displayInfo("HomePageDirect", "HomePageOptimized", $renderTotal, $fullyTotal, $count);
$displayResults .=displayInfo("HLPDirect", "HLPOptimized", $renderTotal, $fullyTotal, $count);
$displayResults .=displayInfo("FLPDirect", "FLPOptimized", $renderTotal, $fullyTotal, $count);
$displayResults .=displayInfo("HSRDirect", "HSROptimized", $renderTotal, $fullyTotal, $count);
$displayResults .=displayInfo("FSRDirect", "FSROptimized", $renderTotal, $fullyTotal, $count);
$displayResults .=displayInfo("PSRDirect", "PSROptimized", $renderTotal, $fullyTotal, $count);

echo $displayResults;

}
function displayInfo($keyDirect, $keyOptimized, $renderTotal, $fullyTotal, $count) {
//  $renderAvgDirect = number_format($renderTotal[$keyDirect] / $count[$keyDirect]);
//  $fullyAvgDirect = number_format($fullyTotal[$keyDirect] / $count[$keyDirect]);
//  $renderAvgOptimized = number_format($renderTotal[$keyOptimized] / $count[$keyOptimized]);
//  $fullyAvgOptimized = number_format($fullyTotal[$keyOptimized] / $count[$keyOptimized]);
//
  $lpTarget=.2;
  $srTarget=.1;
  $rendercolor = "green";
  $doccolor="green";

  // Avoid div by 0
  if ( $count[$keyDirect] < 1  || $count[$keyOptimized] < 1){
    return;
  }
  $renderAvgDirect = ($renderTotal[$keyDirect] / $count[$keyDirect]);
  $fullyAvgDirect = ($fullyTotal[$keyDirect] / $count[$keyDirect]);
  $renderAvgOptimized = ($renderTotal[$keyOptimized] / $count[$keyOptimized]);
  $fullyAvgOptimized = ($fullyTotal[$keyOptimized] / $count[$keyOptimized]);
//echo number_format(100 * (($renderAvgDirect - $renderAvgOptimized) / $renderAvgDirect));
  //echo number_format(100 * (($fullyAvgDirect - $fullyAvgOptimized) / $fullyAvgDirect));
  if ( substr($keyDirect,1,2) == "LP" || substr($keyDirect,0,8) == "HomePage"){
    $targetPerc = "20%";
    if ( (( $renderAvgDirect - $renderAvgOptimized ) / $renderAvgDirect ) < $lpTarget ){
      $rendercolor = "red";
    }
    if ( (( $fullyAvgDirect - $fullyAvgOptimized ) / $fullyAvgDirect ) < $lpTarget ){
      $doccolor = "red";
    }

  } else if  ( substr($keyDirect,1,2) == "SR" ){
    $targetPerc = "10%";
    if ( (( $renderAvgDirect -$renderAvgOptimized ) / $renderAvgDirect ) < $srTarget ){
      $rendercolor = "red";
    }
    if ( (( $fullyAvgDirect -$fullyAvgOptimized ) / $fullyAvgDirect ) < $srTarget ){
      $doccolor = "red";
    }

  }


  $resp = "<tr align=right><td>$keyDirect</td><td>$renderAvgDirect</td><td>$fullyAvgDirect</td></tr>"."<tr align=right><td>$keyOptimized</td><td>$renderAvgOptimized</td><td>$fullyAvgOptimized</td></tr>"."<tr align=right><td></td><td bgcolor=$rendercolor>".number_format((100*($renderAvgDirect - $renderAvgOptimized) / $renderAvgDirect),2,".",",")."% ( ".$targetPerc." )</td><td bgcolor=$doccolor>".number_format((100*($fullyAvgDirect - $fullyAvgOptimized) / $fullyAvgDirect),2,'.',",")."% ( ".$targetPerc." )</td></tr>";
  return $resp;
}

function getResultIDs($startDate, $endDate) {
  $idx = 0;
  $ids = array();
  $dateArray = dateRangeArray($startDate, $endDate);
  foreach ($dateArray as $dte) {
    $dirpath = "/var/www/html/results/$dte/";
    $dh = opendir($dirpath);
    while (false !== ($file = readdir($dh))) {
      if ($file == ".." || $file == ".") {
        continue;
      }
try {
      $info = parse_ini_file("$dirpath/$file/testinfo.ini", true);
} catch (Exception $e){
print $e;
}
      $val = array();
      $id = $info["test"]["id"];
      $startTime = $info["test"]["startTime"];
      $endTime = $info["test"]["completeTime"];
      $val["startTime"] = $startTime;
      $val["endTime"] = $endTime;
      $val["id"] = $id;
      $val["date"]="20".$dte;
      $ids[$idx] = $val;
      $idx++;
    }
    closedir($dh);
  }
  return $ids;
}

function dateRangeArray($start, $end) {
  $range = array();

  if (is_string($start) === true) $start = strtotime($start);
  if (is_string($end) === true) $end = strtotime($end);
  do {
    $range[] = date('y/m/d', $start);
    $start = strtotime("+ 1 day", $start);
  } while ($start <= $end);
  return $range;
}

?>