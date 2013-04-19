<?php
include_once 'graph_functions.inc';
$resultArray = array();
$options = $this->_tpl_vars['options'];
$startDateTime = $this->_tpl_vars['startDateTime'];
$endDateTime = $this->_tpl_vars['endDateTime'];
$job_results = (array)$this->_tpl_vars['job_results'];
$resolution = $this->_tpl_vars['resolution'];
$useRepeatView= $this->_tpl_vars['useRepeatView'];
$records = sizeof($result);
$dateRange = $result[$records-1]['Date'] - $result[0]['Date'];

$labels = array();
if ($useRepeatView){
  if ( $options['ttfb'] ){  $labels['TTFB'] = 'AvgRepeatViewRepeatByte'; }
  if ( $options['startRender'] ){  $labels['Start Render'] = 'AvgRepeatViewStartRender'; }
  if ( $options['domTime'] ){  $labels['Dom Time'] = 'AvgRepeatViewDomTime'; }
  if ( $options['docLoaded'] ){  $labels['Doc Time'] = 'AvgRepeatViewDocCompleteTime'; }
  if ( $options['fullyTime'] ){  $labels['Full Time'] = 'AvgRepeatViewFullyLoadedTime'; }
  if ( $options['domTimeAdjusted'] ){  $labels['Doc Time - Dom Time'] = 'AvgRepeatViewDocCompleteTime-AvgRepeatViewDomTime'; }
} else {
  if ( $options['ttfb'] ){  $labels['TTFB'] = 'AvgFirstViewFirstByte'; }
  if ( $options['startRender'] ){  $labels['Start Render'] = 'AvgFirstViewStartRender'; }
  if ( $options['domTime'] ){  $labels['Dom Time'] = 'AvgFirstViewDomTime'; }
  if ( $options['docLoaded'] ){  $labels['Doc Time'] = 'AvgFirstViewDocCompleteTime'; }
  if ( $options['fullyTime'] ){  $labels['Full Time'] = 'AvgFirstViewFullyLoadedTime'; }
  if ( $options['domTimeAdjusted'] ){  $labels['Doc Time - Dom Time'] = 'AvgFirstViewDocCompleteTime-AvgFirstViewDomTime'; }
}
echo "var d=[";
$comma = false;
foreach ($job_results as $resultArrayKey => $res){
  if ($resultArrayKey == "Change Notes"){
    echo "{\"job\": \"".$resultArrayKey."\",\"label\": \"".$resultArrayKey."\", \"data\": [";
      foreach ($res as $r){
        $d = $r['Date'];

        echo "[" . $d. ",0]";
        if ($key+1 < sizeof($res) ){
          echo ",";
        }
    }
          echo "]},";
          $cnt++;
          continue;
  }


  foreach ($labels as $key => $label){
    if ($comma){ echo ","; }
  //  $samples = getResultsData($label, $startDateTime, $endDateTime, $resolution, $result);
    echo "{\"job\": \"".$resultArrayKey."\",\"label\": \"".$resultArrayKey." - ".$key."\", \"data\": [";

    if ($resolution > 1){
      getResultsData($label, $startDateTime, $endDateTime, $resolution, $res);
    } else {
      foreach ($res as $key=>$r){
        $d = $r['Date'];

        echo "[" . $d. "," . $r[$label] . "]";
        if ($key+1 < sizeof($res) ){
          echo ",";
        }
      }
    }
  //  foreach($samples as $key => $sample){
  //    echo "[".$key.",".$sample."],";
  //  }
    echo "]}";
    if (!$comma){$comma = true;}    
  }
}
echo "];";
echo "\nvar ticks = [];";
echo "\nvar dataIds = new Array();\n";

foreach ($job_results as $resultArrayKey => $res){
  foreach ($res as $r){
    if ($resultArrayKey == "Change Notes"){
      echo "dataIds['".$resultArrayKey.$r['Date']."']='".$r['Label']."';\n";
    }else {
      echo "dataIds['".$resultArrayKey.$r['Date']."']=".$r['Id'].";\n";
    }
  }
}



?>