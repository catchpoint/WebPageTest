<?php
  require("login/login.php");
  include 'monitor.inc';
  $user_id = getCurrentUserId();
  $runLabel = $_REQUEST['runLabel'];
  $labels = $_REQUEST['label'];
  $q=Doctrine_Query::create()->select('r.RunLabel')
      ->from('WPTResult r')
      ->where('r.WPTJob.UserId = ?',$user_id)
      ->groupBy('r.RunLabel')
      ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
  $runLabels = $q->fetchArray();
  $q->free(true);
  $runLabelsArray = array();
  foreach($runLabels as $label){
    $val = $label['RunLabel'];
    $runLabelsArray[$val]=$val;
  }
  $smarty->assign('runLabels',$runLabelsArray);
  $smarty->assign('runLabel',$runLabel);
  if (!$labels ){
    $q = Doctrine_Query::create()->select('j.Id, j.Label')
        ->from('WPTJob j')
        ->andWhere('j.UserId = ?', $user_id)
        ->orderBy('j.Label')
        ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $jobs = $q->fetchArray();
    $q->free(true);
    $jobArray = array();
    foreach ($jobs as $j) {
      $i = $j['Label'];
      $l = $j['Label'];
      $jobArray[$i] = $l;
    }
    $smarty->assign('jobs', $jobArray);

    $smarty->display('report/downloadData.tpl');
    exit;
  }
  if ($_REQUEST['fromMonth'] ){
    $fromDate = strtotime( $_REQUEST['fromYear']."/".$_REQUEST['fromMonth']."/".$_REQUEST['fromDay']." ".$_REQUEST['fromHour'].":".$_REQUEST['fromMinute']);
  } else {
    $fromDate = current_seconds() - 86400;
  }
  if ($_REQUEST['toMonth'] ){
    $toDate = strtotime( $_REQUEST['toYear']."/".$_REQUEST['toMonth']."/".$_REQUEST['toDay']." ".$_REQUEST['toHour'].":".$_REQUEST['toMinute']);
  } else {
    $toDate = current_seconds();
  }

  try{
    header("Content-Type: text/csv");
    header("Content-Disposition: attachment; filename=\"data-".$_REQUEST['fromYear']."-".$_REQUEST['fromMonth']."-".$_REQUEST['fromDay']."_". $_REQUEST['toYear']."-".$_REQUEST['toMonth']."-".$_REQUEST['toDay'].".csv\"");
    print "label,id,status,valid,runlabel,date,wptjobid,wpthost,ttfb,dom,doc,fully,repeat ttfb,repeat dom,repeat doc,repeat fully\n";
    foreach ($labels as $label){
      $data=getReportDataForLabel($label,$fromDate, $toDate, null, $runLabel);
      printResultData($data,$label);
    }
  } catch (Exception $e){
    print $e;
  }
    exit;

function printResultData($data, $label){
  foreach($data as $item){
    print $label.
        ",".$item['Id'].
        ",".$item['Status'].
        ",".$item['ValidationState'].
        ",".$item['RunLabel'].
        ",".date("Y/m/d",$item['Date']).
        ",".$item['WPTJobId'].
        ",".$item['WPTHost'].
        ",".$item['AvgFirstViewFirstByte'].
        ",".$item['AvgFirstViewDomTime'].
        ",".$item['AvgFirstViewDocCompleteTime'].
        ",".$item['AvgFirstViewFullyLoadedTime'].
        ",".$item['AvgRepeatViewRepeatByte'].
        ",".$item['AvgRepeatViewDomTime'].
        ",".$item['AvgRepeatViewDocCompleteTime'].
        ",".$item['AvgRepeatViewFullyLoadedTime'].
        "\n";
  }
}
?>