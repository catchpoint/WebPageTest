<?php
  include 'monitor.inc';
  include 'wpt_functions.inc';
  if (!$location = $_REQUEST['location'] ){
    $location = "";
  }
  $runLabel = $_REQUEST['runLabel'];
if ( $completePath= $_REQUEST['completePath'] ){
    $smarty->assign('completePath',$completePath);
  }

if ( $versusDirect = $_REQUEST['versusDirect'] ){
    $smarty->assign('versusDirect',$versusDirect);
  }

  $download = $_REQUEST['download'];

  $stddev=$_REQUEST['stddev'];
  $ninetieth=$_REQUEST['ninetieth'];

  $q=Doctrine_Query::create()->select('r.RunLabel')->from('WPTResult r')->groupBy('r.RunLabel')->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
  $runLabels = $q->fetchArray();
  $runLabelsArray = array();
  foreach($runLabels as $label){
    $val = $label['RunLabel'];
    $runLabelsArray[$val]=$val;
  }
  $smarty->assign('runLabels',$runLabelsArray);
  $smarty->assign('runLabel',$runLabel);

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
  $smarty->assign('stddev',$stddev);
  $smarty->assign('ninetieth',$ninetieth);
  $smarty->assign('location',$location);
  $smarty->assign('fromDate', $fromDate);
  $smarty->assign('toDate', $toDate);
  if ( $download ){
    header("Content-Type: text/csv");
    header("Content-Disposition: attachment; filename=\"data-".$_REQUEST['fromYear']."-".$_REQUEST['fromMonth']."-".$_REQUEST['fromDay']."_". $_REQUEST['toYear']."-".$_REQUEST['toMonth']."-".$_REQUEST['toDay'].".csv\"");
    print "label,id,status,valid,date,wptjobid,wpthost,ttfb,dom,doc\n";
    if ( $location == "-AU" ){
      $labels = array(0=>"HomePageDirect",
        1=>"HomePageOptimized" ,
        2=>"FLPOptimized" ,
        3=>"FLPDirect",
        4=>"HLPOptimized",
        5=>"HLPDirect",
        6=>"FSROptimized",
        7=>"FSRDirect",
        8=>"HSROptimized",
        9=>"HSRDirect",
        10=>"PSROptimized",
        11=>"PSRDirect");

    }else {
    $labels = array(0=>"HomePageUnOptimized",
      1=>"HomePageOptimized" ,
      2=>"FLPOptimized" ,
      3=>"FLPUnOptimized",
      4=>"HLPOptimized",
      5=>"HLPUnOptimized",
      6=>"FSROptimized",
      7=>"FSRUnOptimized",
      8=>"HSROptimized",
      9=>"HSRUnOptimized",
      10=>"PSROptimized",
      11=>"PSRUnOptimized");
    }
//    $labels[]="HomePageUnOptimized";
    foreach ($labels as $label){
      $data=getReportDataForLabel($label.$location,$fromDate, $toDate,$stddev);
      printResultData($data,$label);
    }
    exit;
  } else{
    if ( $versusDirect ){
      $smarty->assign('unOptOrDirect',"Direct");
      $homePageUnOptimized=getReportResultsForLabel("HomePageDirect".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $homePageOptimized=getReportResultsForLabel("HomePageOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $flpOptimized=getReportResultsForLabel("FLPOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $flpUnOptimized=getReportResultsForLabel("FLPDirect".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $hlpOptimized=getReportResultsForLabel("HLPOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $hlpUnOptimized=getReportResultsForLabel("HLPDirect".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      if ( $completePath){
        $location = " ( Complete Path )";
      }
      $fsrOptimized=getReportResultsForLabel("FSROptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $fsrUnOptimized=getReportResultsForLabel("FSRDirect".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $hsrOptimized=getReportResultsForLabel("HSROptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $hsrUnOptimized=getReportResultsForLabel("HSRDirect".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $psrOptimized=getReportResultsForLabel("PSROptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $psrUnOptimized=getReportResultsForLabel("PSRDirect".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
    } else {
      $smarty->assign('unOptOrDirect',"UnOptimized");
      $homePageUnOptimized=getReportResultsForLabel("HomePageUnOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $homePageOptimized=getReportResultsForLabel("HomePageOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $flpOptimized=getReportResultsForLabel("FLPOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $flpUnOptimized=getReportResultsForLabel("FLPUnOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $hlpOptimized=getReportResultsForLabel("HLPOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $hlpUnOptimized=getReportResultsForLabel("HLPUnOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      if ( $completePath){
        $location = " ( Complete Path )";
      }
      $fsrOptimized=getReportResultsForLabel("FSROptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $fsrUnOptimized=getReportResultsForLabel("FSRUnOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $hsrOptimized=getReportResultsForLabel("HSROptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $hsrUnOptimized=getReportResultsForLabel("HSRUnOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $psrOptimized=getReportResultsForLabel("PSROptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
      $psrUnOptimized=getReportResultsForLabel("PSRUnOptimized".$location,$fromDate, $toDate,$stddev,$runLabel,$ninetieth);
    }

  $smarty->assign('homePageUnOptimized', $homePageUnOptimized);
  $smarty->assign('homePageOptimized', $homePageOptimized);

  $smarty->assign('flpOptimized', $flpOptimized);
  $smarty->assign('flpUnOptimized', $flpUnOptimized);

  $smarty->assign('hlpOptimized', $hlpOptimized);
  $smarty->assign('hlpUnOptimized', $hlpUnOptimized);

  $smarty->assign('fsrOptimized', $fsrOptimized);
  $smarty->assign('fsrUnOptimized', $fsrUnOptimized);

  $smarty->assign('hsrOptimized', $hsrOptimized);
  $smarty->assign('hsrUnOptimized', $hsrUnOptimized);

  $smarty->assign('psrOptimized', $psrOptimized);
  $smarty->assign('psrUnOptimized', $psrUnOptimized);


  $smarty->display('zujiEvalReport.tpl');
  }

function printResultData($data, $label){
  foreach($data as $item){
    print $label.
        ",".$item['Id'].
        ",".$item['Status'].
        ",".$item['ValidationState'].
        ",".date("Y/m/d",$item['Date']).
        ",".$item['WPTJobId'].
        ",".$item['WPTHost'].
        ",".$item['AvgFirstViewFirstByte'].
        ",".$item['AvgFirstViewDomTime'].
        ",".$item['AvgFirstViewDocCompleteTime'].
        "\n";
  }
}
?>