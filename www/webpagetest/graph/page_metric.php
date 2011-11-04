<?php
chdir('..');
include 'common.inc';
include 'page_data.inc';

$metric = trim($_REQUEST['metric']);
$fv = array();
$rv = array();
$width = (int)$_REQUEST['width'];
if (!$width)
    $width = 600;
$width = min(max($width, 300), 1000);
$height = (int)$_REQUEST['height'];
if (!$height)
    $height = 400;
$height = min(max($height, 200), 1000);
$max_runs = 0;
$label = $_REQUEST['label'];
if (!strlen($label))
    $label = $metric;

if (strlen($metric)) {
    $pageData = loadAllPageData($testPath);
    foreach($pageData as $run => $run_data) {
        if ($run > $max_runs)
            $max_runs = $run;
        if( isset($run_data[0]) && isset($run_data[0][$metric]) ) {
            $fv[$run] = $run_data[0][$metric];
        }
        if( isset($run_data[1]) && isset($run_data[1][$metric]) ) {
            $rv[$run] = $run_data[1][$metric];
        }
    }
    $fvMedian = GetMedianRun($pageData, 0);
    if ($fvMedian)
        $fvMedianValue = $pageData[$fvMedian][0][$metric];
    $rvMedian = GetMedianRun($pageData, 1);
    if ($rvMedian)
        $rvMedianValue = $pageData[$rvMedian][1][$metric];
}

if (count($fv)) {
    include ("lib/jpgraph/jpgraph.php");
    include ("lib/jpgraph/jpgraph_scatter.php"); 
    include ("lib/jpgraph/jpgraph_line.php"); 
    JpGraphError::SetErrLocale('prod');

    $graph = new Graph($width,$height);
    $graph->SetScale("linlin", 0, 0, 1, $max_runs);
    $graph->SetFrame(false);
     
    $graph->title->Set($label);
    $graph->title->SetFont(FF_FONT1,FS_BOLD);
    $graph->xaxis->SetTitle('Run');
    $graph->xaxis->SetLabelFormat("%d");
    $graph->xaxis->scale->ticks->Set(1);
    $graph->legend->SetPos(0,0,'right','top');
    $graph->SetMargin(60,20,60,40);
    
    if (isset($fvMedianValue)) {
        $datax = array();
        $datay = array();
        foreach ($fv as $x => $y) {
            $datax[] = $x;
            $datay[] = $fvMedianValue;
        }
        $lp = new LinePlot($datay, $datax);
        $lp->SetColor('blue');
        $lp->SetWeight(1);
        $graph->Add($lp);
    }
    
    $datax = array();
    $datay = array();
    foreach ($fv as $x => $y) {
        $datax[] = $x;
        $datay[] = $y;
    }
    $sp = new ScatterPlot($datay,$datax);
    $sp->mark->SetFillColor('blue');
    $sp->SetLegend('First View');
    $graph->Add($sp);
    
    if (count($rv)) {
        if (isset($rvMedianValue)) {
            $datax = array();
            $datay = array();
            foreach ($rv as $x => $y) {
                $datax[] = $x;
                $datay[] = $rvMedianValue;
            }
            $lp = new LinePlot($datay, $datax);
            $lp->SetColor('red');
            $lp->SetWeight(1);
            $graph->Add($lp);
        }

        $datax = array();
        $datay = array();
        foreach ($rv as $x => $y) {
            $datax[] = $x;
            $datay[] = $y;
        }
        $sp = new ScatterPlot($datay,$datax);
        $sp->mark->SetFillColor('red');
        $sp->SetLegend('Repeat View');
        $graph->Add($sp);
    }
}
 

if (isset($graph)) {
   $graph->Stroke();
} else {
    header("HTTP/1.0 404 Not Found");    
}

?>
