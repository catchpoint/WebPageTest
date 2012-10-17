<?php
  include 'xml.php';
  header("Content-Type: text/csv");
  header("Content-Disposition: attachment; filename=\"data.csv\"");
  $reportDate = date("y/m/d");
  $summary = FALSE;
  if ($_REQUEST['dte']) {
    $reportDate = date("y/m/d", strtotime($_REQUEST['dte']));
  }
  if ($_REQUEST['summary']) {
    $summary = TRUE;
  }
  $results = array();

  $infos = getResultIDs($reportDate);
  if (!$summary) {
    echo "label, start time, end time, url, status code, load time, ttfb, requests, requests doc, start render, fully loaded, doc loaded time, adjusted start render, adjusted fully loaded";
    echo "\n";
  }
  foreach ($infos as $info)
  {
    $id = $info["id"];
    $resultXml = file_get_contents(getBaseURL()."/xmlResult/$id/");
    $ix = strrpos($id, "_") + 1;
    $shortId = substr($id, $ix);
    $resultLabel = file_get_contents("/var/www/html/results/$reportDate/$shortId/label.txt");
    $xml = new SimpleXMLElement($resultXml);
    $firstView = $xml->data->average->firstView;
    $url = $xml->data->run->firstView->results->URL;
    if ($firstView->loadTime && $firstView->bytesIn > 275) {
      $item = array();
      $item["label"] = $resultLabel;
      $item["id"] = $id;
      $item["render"] = $firstView->render - $firstView->TTFB;
      $item["fully"] = $firstView->fullyLoaded - $firstView->TTFB;
      $results[] = $item;
      if (!$summary) {
        echo $resultLabel;
        echo ",";
        echo $info["startTime"];
        echo ",";
        echo $info["endTime"];
        echo ",";
        echo '"';
        echo $url;
        echo '"';
        echo ",";
        echo $xml->statusCode;
        echo ",";
        echo $firstView->loadTime;
        echo ",";
        echo $firstView->TTFB;
        echo ",";
        echo $firstView->requests;
        echo ",";
        echo $firstView->requestsDoc;
        echo ",";
        echo $firstView->render;
        echo ",";
        echo $firstView->fullyLoaded;
        echo ",";
        echo $firstView->docTime;
        echo ",";
        echo $firstView->render - $firstView->TTFB;
        echo ",";
        echo $firstView->fullyLoaded - $firstView->TTFB;
        echo "\n";
      }
    }
  }
  if ($summary) {
    $renderTotal = array();
    $fullyTotal = array();
    $count = array();
    echo "label, start render, fully loaded\n";
    array_multisort($results);
    foreach ($results as $result) {
      $label = $result["label"];
      $render = $result["render"];
      $fully = $result["fully"];
      $renderTotal[$label] += $render;
      $fullyTotal[$label] += $fully;
      $count[$label]++;
    }
    foreach ($renderTotal as $key => $rt) {
      $renderAvg = $renderTotal[$key] / $count[$key];
      $fullyAvg = $fullyTotal[$key] / $count[$key];
      echo "$key,$renderAvg,$fullyAvg\n";
    }
  }
  function getResultIDs($dte) {
    $idx = 0;
    $ids = array();
    $dirpath = "/var/www/html/results/$dte/";
    $dh = opendir($dirpath);
    while (false !== ($file = readdir($dh))) {
      if ($file == ".." || $file == ".") {
        continue;
      }
      $info = parse_ini_file("$dirpath/$file/testinfo.ini", true);
      $val = array();
      $id = $info["test"]["id"];
      $startTime = $info["test"]["startTime"];
      $endTime = $info["test"]["completeTime"];
      $val["startTime"] = $startTime;
      $val["endTime"] = $endTime;
      $val["id"] = $id;
      $ids[$idx] = $val;
      $idx++;
    }
    closedir($dh);
    return $ids;
  }

?>