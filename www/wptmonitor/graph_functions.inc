<?php
/**
 * Given a start time, end time, and interval return averages for the fields in $datas
 * that are not Id or Date
 *
 * @param  $startDateTime
 * @param  $endDateTime
 * @param  $interval
 * @param  $datas
 * @return array
 */
function getResultsDataAvg($startDateTime, $endDateTime, $interval, $datas, $fields) {
  $pointer = $startDateTime;
  $id = $datas[0]['Id'];
  $data = array();

  while ($pointer < $endDateTime) {
    $entry = array();
    //    $entry['Id'] = $id;
    $entry['Date'] = $pointer;
    foreach ($fields as $field) {
      $entry[$field] = getAverage($pointer, $interval, $datas, $field);
    }
    $data[] = $entry;
    $pointer += $interval;
  }
  return $data;
}

/**
 * Format data in the amchart specific format
 *
 * @param  $userId
 * @param  $jobIds
 * @param  $start
 * @param  $end
 * @param  $percentile
 * @param  $trimAbove
 * @param  $adjustUsing
 * @param  $trimBelow
 * @param  $interval
 * @param int $includeRepeatView
 * @return string
 */
function getDataAsAmChartLineXml($userId,
                                 $jobIds,
                                 $availFields,
                                 $fields,
                                 $start,
                                 $end,
                                 $percentile,
                                 $trimAbove,
                                 $adjustUsing,
                                 $trimBelow,
                                 $interval) {
  $dbFields = "r.Date";
  foreach ($availFields as $field) {
    $dbFields .= ",r." . $field;
  }
  $gid = 1;

  $xmlData = "";
  $xmlData .= "<chart>";
  $xmlData .= "\n";
  $xmlData .= "<series>";
  $xmlData .= "\n";
  $seriesData = getSeriesDataForMultiJobs($userId, $jobIds, $start, $end, $interval);

  foreach ($seriesData as $data) {
    $xmlData .= "<value xid=\"" . $data['Date'] . "\">" . date('m/d H:i', $data['Date']) . "</value>";
    $xmlData .= "\n";
  }
  $xmlData .= "</series>";
  $xmlData .= "\n";
  $xmlData .= "<graphs>";
  $xmlData .= "\n";
  $xmlData .= getChangeNotesAsAmLineChartXml($userId,$jobIds,$start,$end);
  $jobTable = Doctrine_Core::getTable('WPTJob');
  foreach ($jobIds as $jobId) {
    $job = $jobTable->find($jobId);
    $jobName = $job['Label'];
    $datas = getGraphData($userId, $jobId, $start, $end, $percentile, $trimAbove, $adjustUsing, $trimBelow, $dbFields);

    if ($interval > 1) {
      $datas = getResultsDataAvg($start, $end, $interval, $datas, $fields);
    }

    foreach ($fields as $key => $field) {
      $xmlGraphData = "";
      $hasData = false;
      foreach ($datas as $data) {
        if ($data[$field] == 0) {
          continue;
        } else {
          $hasData = true;
          $value = $data[$field] / 1000;
          $edt=$data['Date']+$interval;
          $xmlGraphData .= "<value bullet_size=\"4\" bullet=\"round\" xid=\"" . $data['Date']
              . "\" url=\"listResults.php?currentPage=1&amp;filterField=WPTJob.Id&amp;filterValue=".$jobId
              ."&amp;startDateTime=" . $data['Date']
              ."&amp;endDateTime=".$edt."\">"
              . number_format($value,3) . "</value>";
          $xmlGraphData .= "\n";
        }
      }
      if ($hasData) {
        $xmlData .= "<graph title=\"" . $jobName . "\n" . $key . "\" gid=\"" . $gid++ . "\">";
            $xmlData .= "\n";
        $xmlData .= $xmlGraphData;
        $xmlData .= "\n";
        $xmlData .= "</graph>";
        $xmlData .= "\n";
      }
    }
  }
  $xmlData .= "</graphs>";
  $xmlData .= "\n";
  $xmlData .= "</chart>";
  return $xmlData;
}


function getDataAsAmChartScatterXml($userId,
                                    $jobIds,
                                    $availFields,
                                    $fields,
                                    $start,
                                    $end,
                                    $percentile,
                                    $trimAbove,
                                    $adjustUsing,
                                    $trimBelow,
                                    $interval) {
  $dbFields = "r.Date";

  foreach ($availFields as $field) {
    $dbFields .= ",r." . $field;
  }
  $gid = 1;

  $xmlData = "";
  $xmlData .= "<chart>";
  $xmlData .= "\n";
  $xmlData .= "<graphs>";
  $xmlData .= "\n";
  $xmlData .= getChangeNotesAsAmScatterChartXml($userId,$jobIds,$start,$end);
  $jobTable = Doctrine_Core::getTable('WPTJob');
  foreach ($jobIds as $jobId) {
    $job = $jobTable->find($jobId);
    $jobName = $job['Label'];
    $datas = getGraphData($userId, $jobId, $start, $end, $percentile, $trimAbove, $adjustUsing, $trimBelow, $dbFields);

    if ($interval > 1) {
      $datas = getResultsDataAvg($start, $end, $interval, $datas, $fields);
    }
    foreach ($fields as $key => $field) {
      $xmlGraphData = "";
      $hasData = false;
      foreach ($datas as $data) {
        if ($data[$field] == 0) {
          continue;
        } else {
          $hasData = 1;
          $value = $data[$field] / 1000;
          $edt=$data['Date']+$interval;

          $xmlGraphData .= "<point x=\"" . date("Y-m-d H:i", $data['Date'])
              . "\" url=\"listResults.php?currentPage=1&amp;filterField=WPTJob.Id&amp;filterValue=".$jobId
              ."&amp;startDateTime=" . $data['Date']
              ."&amp;endDateTime=".$edt
              ."\" y=\"" . number_format($value,3). "\"></point>";
          $xmlGraphData .= "\n";
        }
      }
      if ($hasData) {
        $xmlData .= "<graph width=\"0\" title=\"" . $jobName . "\n" . $key . "\" gid=\"" . $gid++ . "\">";
        $xmlData .= "\n";
        $xmlData .= $xmlGraphData;
        $xmlData .= "\n";
        $xmlData .= "</graph>";
        $xmlData .= "\n";
      }
    }
  }
  $xmlData .= "</graphs>";
  $xmlData .= "\n";
  $xmlData .= "</chart>";
  return $xmlData;
}

/**
 * Scans through the results to get time stamps for each point, removing duplicates.
 * Works across multiple job ids
 *
 * @param  $user_id
 * @param  $jobIds
 * @param  $startDateTime
 * @param  $endDateTime
 * @param int $interval
 * @return array
 */
function getSeriesDataForMultiJobs($user_id, $jobIds, $startDateTime, $endDateTime, $interval = 0, $includeChangeNotes = true) {
  if ($interval == 1) {
    $q = Doctrine_Query::create()->select('r.Date, r.WPTJobId')->from('WPTResult r')
        ->whereIn('r.WPTJobId', $jobIds)
        ->andWhere('r.ValidationState < ?', 2)
//        ->andWhere('r.WPTJob.UserId = ?', $user_id)
        ->andWhere('r.AvgFirstViewFirstByte > 0')
//        ->andWhere('r.AvgFirstViewStartRender > 0')
        ->andWhere('r.AvgFirstViewDocCompleteTime > 0')
        ->andWhere('r.AvgFirstViewFullyLoadedTime> 0')
        ->andWhere('r.Date <= ?', $endDateTime)
        ->andWhere('r.Date >= ?', $startDateTime)
        ->orderBy('r.Date')->distinct('r.Date')
        ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);

    $result = $q->fetchArray();
    $q->free(true);
  } else {
    $pointer = $startDateTime;
    $result = array();

    while ($pointer < $endDateTime) {
      $entry = array();
      $entry['Date'] = $pointer;
      $pointer += $interval;
      $result[] = $entry;
    }
  }
  if ( $includeChangeNotes ){
    $changeNotes = getChangeNoteData($user_id,$jobIds,$startDateTime,$endDateTime);
    foreach ($changeNotes as $note){
      $entry = array();
      $entry['Date'] = $note['Date'];
      $result[]=$entry;
    }
  }
  sort($result);
  return $result;
}

function getChangeNoteData($user_id, $jobIds, $startDateTime, $endDateTime) {
    $q = Doctrine_Query::create()->from('ChangeNote c')
        ->andWhere('c.Date <= ?', $endDateTime)
        ->andWhere('c.Date >= ?', $startDateTime)
        ->andWhere('c.Public')->orWhere('c.UserId = ?',$user_id)
        ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $result = $q->fetchArray();
    $q->free(true);
    return $result;
}

function getGraphData($user_id,
                      $job_id,
                      $startDateTime,
                      $endDateTime,
                      $percentile = 1,
                      $trimAbove = null,
                      $adjustUsing,
                      $trimBelow = null,
                      $fields = null) {
  $trimAbove = $trimAbove * 1000;
  $trimBelow = $trimBelow * 1000;

  if (!$fields) {
    $fields = "r.*";
  }
  $q = Doctrine_Query::create()->select($fields)->from('WPTResult r')
      ->where('r.ValidationState < ?', 2)
//      ->andWhere('r.WPTJob.UserId = ?', $user_id)
      ->andWhere('r.AvgFirstViewFirstByte > 0')
//      ->andWhere('r.AvgFirstViewStartRender > 0')
      ->andWhere('r.AvgFirstViewDocCompleteTime > 0')
      ->andWhere('r.AvgFirstViewDocCompleteTime != ?', '')
      ->andWhere('r.WPTJobId = ?', $job_id)
      ->andWhere('r.Date <= ?', $endDateTime)
      ->andWhere('r.Date >= ?', $startDateTime);

  if ($trimAbove) {
    $q->andWhere('r.' . $adjustUsing . ' < ?', $trimAbove);
  }
  if ($trimBelow) {
      $q->andWhere('r.' . $adjustUsing . ' > ?', $trimBelow);
  }
  if ($percentile < 1){
    $limit = $q->count() * $percentile;

    $q->orderBy('r.' . $adjustUsing)
      ->limit($limit)
      ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $res = $q->fetchArray();
    $maxTime = $res[sizeof($res) - 1][$adjustUsing];

    $q->andWhere('r.' . $adjustUsing . '< ?', $maxTime);
  }
  $q->orderBy('r.Date')->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);

  $result = $q->fetchArray();
  $q->free(true);
  return $result;
}

/**
 * @param  $label
 * @param  $startDateTime
 * @param  $endDateTime
 * @param  $resolution
 * @param  $result
 * @return Array of averages of the data between startDateTime and endDateTime incrementing by resolution
 */
function getResultsData($label, $startDateTime, $endDateTime, $resolution, $result) {
  $pointer = $startDateTime;
  $samples = array();
  $comma = false;
  while ($pointer < $endDateTime) {
    $samples[$pointer] = getAverage($pointer, $resolution, $result, $label);
    if ($samples[$pointer] > 0) {
      if ($comma) {
        echo ",";
      }
      echo "[" . $pointer . "," . $samples[$pointer] . "]";
      if (!$comma) {
        $comma = true;
      }
    }
    $pointer += $resolution;
  }
  return samples;
}

function getAverage($startAt, $increment, $data, $field) {
  $total = 0;
  $count = 0;

  foreach ($data as $r) {
    if ($r['Date'] > $startAt && ($r['Date'] < $startAt + $increment)) {
      if ($field == 'AvgFirstViewDocCompleteTime-AvgFirstViewDomTime') {
        $total = ($total + ($r['AvgFirstViewDocCompleteTime'] - $r['AvgFirstViewDomTime']));
      } else {
        $total = ($total + $r[$field]);
      }
      $count++;
    }
  }
  if ($count > 0) {
    $result = $total / $count;
  } else {
    $result = null;
  }
  return $result;
}
function getChangeNotesAsAmLineChartXml($userId,
                                 $jobIds,
                                 $start,
                                 $end) {
  $changeNotes = getChangeNoteData($userId, $jobIds, $start, $end);
  $xmlData .= "<graph title=\"Change Notes\" gid=\"0\">";
  $xmlData .= "\n";

  foreach ($changeNotes as $data) {
    $value = 0;
    $xmlData .= "<value description=\"".$data['Label']."\" bullet_size=\"10\" bullet=\"square\" xid=\"" . $data['Date'] . "\" url=\"listChangeNotes.php?filterField=Id&amp;filterValue=" . $data['Id'] . "\">" . $value . "</value>";
    $xmlData .= "\n";
  }
  $xmlData .= "</graph>";
  $xmlData .= "\n";
  return $xmlData;
}
function getChangeNotesAsAmScatterChartXml($userId,
                                 $jobIds,
                                 $start,
                                 $end) {
  $changeNotes = getChangeNoteData($userId, $jobIds, $start, $end);
  $xmlData .= "<graph title=\"Change Notes\" gid=\"0\">";
  $xmlData .= "\n";

  foreach ($changeNotes as $data) {
    $value = 0;
    $xmlData .= "<point bullet_size=\"10\" x=\"" . date('Y-m-d H:i',$data['Date']) . "\" url=\"listChangeNotes.php?filterField=Id&amp;filterValue=" . $data['Id'] . "\" y=\"" . $value . "\">".$data['Label']."</point>";
    $xmlData .= "\n";
  }

  $xmlData .= "</graph>";
  $xmlData .= "\n";
  return $xmlData;
}
?>