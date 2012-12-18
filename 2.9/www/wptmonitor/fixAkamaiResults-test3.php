<?php
include 'utils.inc';
include 'wpt_functions.inc';
include 'bootstrap.php';
$jobIds[] = 63;
$jobIds[] = 64;
$jobIds[] = 67;
$jobIds[] = 68;
$jobIds[] = 71;
$jobIds[] = 72;
$jobIds[] = 75;
$jobIds[] = 76;
foreach ($jobIds as $jobId) {
  echo "<hr>Job ID: " . $jobId . "<br>";
  $q = Doctrine_Query::create()->from('WPTResult r')->where('r.WPTJobId = ?', $jobId);
  $results = $q->execute();

  if ($q->count() < 1) {
    echo "No Records found<br>";
    conintue;
  }
  $count = 0;
  $deletedCount = 0;
  echo "Checking " . $q->count() . " records<br>";
  foreach ($results as $result) {
    $deletedCount = $deletedCount + removeIfUncompiled($result);
    $count += 3;
  }
  $q->free(true);

  echo "Count: " . $count;
  echo '<br>';
  echo "Deleted: " . $deletedCount;
  echo '<br>';
}
function removeIfUncompiled($result) {
  global $wptXmlResult;
  $deletedCount = 0;

  try
  {
    $wptResultId = $result['WPTResultId'];
    $id = $result['Id'];

    try {
      echo "Fetching results from <A target=_new href=" . $result['WPTHost'] . '/' . 'result/' . $wptResultId . "/>$wptResultId</a>";
      echo '<br>';
      $resultXml = file_get_contents('http://strangeloop:mak3itf@st@wptm.strangeloopnetworks.com/xmlResult/' . $wptResultId . "/");
    } catch (Exception $e) {
      echo ("[ERROR] Failed to retrieve xml for WPTResultId: $wptResultId Id: $id -- " . $result['WPTHost'] . $wptXmlResult . $wptResultId . "/");
      echo '<br>';
    }

    if (!$resultXml) {
      echo ("[ERROR] Empty xml retrieved for WPTResultId: $wptResultId Id: $id" . $wptResultId);
      echo '<br>';
    }

    try {
      $xml = new SimpleXMLElement($resultXml);
    } catch (Exception $e) {
      // Ignore and continue
      echo ("[ERROR] Failed to parse XML for WPTResultId: $wptResultId Id: $id" . $wptResultId);
      echo '<br>';
    }
    $status = $xml->statusCode;

    // If 100 then it's still waiting
    if ($status == '100') {
      echo "Result still pending... ";
      echo '<br>';
    }
    if (!$xml) {
      echo "Missing xml... ";
      echo '<br>';
    }
    for ($x = 0; $x < 3; $x += 1) {
      echo "Checking run # " . ($x + 1) . "<br>";
      $headersLocation = $xml->data->run[$x]->firstView->rawData->headers;
      $hl = 'http://strangeloop:mak3itf@st@' . substr($headersLocation, 7);
      //echo "Checking request ...<A href=" . $result['WPTHost'] . '/' . 'result/' . $wptResultId . "/>$wptResultId</a><br>";
      $headers = file_get_contents($hl);
      if (!$headers) {
        echo "No Headers found for: <A target=_new href=" . $result['WPTHost'] . '/' . 'result/' . $wptResultId . "/>$wptResultId</a><br>";
        echo "At location: <a target=_new href=$hl>$hl</a>";
        continue;
      }
      // Grab only the Request 1:
      $request2 = strpos($headers, "Request 2:");
      if ($request2) {
        $request1 = substr($headers, 0, $request2);
      } else {
        echo "Removing entry with only one request found...<A target=_new href=" . $result['WPTHost'] . '/' . 'result/' . $wptResultId . "/>$wptResultId</a><br>";
        echo $headers;
        $result->delete();
        $deletedCount++;
        continue;
      }
      if (!stripos($request1, "X-SL-CompState")) {
        if (stripos($request1, "test3")) {
          echo ("Removing results with missing header 'X-SL-CompState and -test3 for WPTResultId:" . $wptResultId);
          echo '<br>';

          $result->delete();
          $deletedCount++;
        }
      } else if ((stripos($request1, "X-SL-CompState: Uncompiled"))) {
        echo ("Removing results with header 'X-SL-CompState: Uncompiled' WPTResultId:" . $wptResultId);
        echo '<br>';
        $result->delete();
        $deletedCount++;
      }
    }

  } catch (Execption $ex) {
    echo $ex;
    echo '<br>';
  }
  return $deletedCount;
}