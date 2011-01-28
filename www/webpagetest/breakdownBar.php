<?php
include 'common.inc';
include 'breakdown.inc';

include ("graph/jpgraph.php");
include ("graph/jpgraph_bar.php"); 

// Get the various settings
$width = htmlspecialchars($_GET["width"]);
if( !$width )
    $width = 800;

$height = htmlspecialchars($_GET["height"]);
if( !$height )
    $height = 700;

$chartType = htmlspecialchars($_GET["type"]);
if( !strlen($chartType) )
    $chartType = 'Requests';
    
$fontSize = (int)$_GET["fontSize"];
if( !$fontSize )
    $fontSize = 14;

// walk through the requests and group them by mime type
$breakdown = getBreakdownCombined( $id, $testPath, $run, $cached);

// build up the data set
$fvValues = array();
$rvValues = array();
$index = 0;
$labels = array();
ksort($breakdown);
foreach($breakdown as $type => $data)
{
    $labels[] = $type;

    if( !strcasecmp($chartType, 'Requests') )
    {
        $fvValues[] = $data['requests'];
        $rvValues[] = $data['rvRequests'];
    }
    else if( !strcasecmp($chartType, 'Bytes') )
    {
        $fvValues[] = $data['bytes'];
        $rvValues[] = $data['rvBytes'];
    }
    $index++;
}
    
$graph = new Graph($width,$height,"auto");    
$graph->SetScale("textlin");
$graph->SetFrame(false);
//$graph->SetAntiAliasing();

  // Create the bar plots
$fvPlot = new BarPlot($fvValues);
$fvPlot->SetFillColor( "#009900");
$fvPlot->value->Show();
$fvPlot->value->SetFormat('%d');
$fvPlot->value->SetFont(FF_FONT1,FS_NORMAL,9);
$fvPlot->SetLegend('First View');

$rvPlot = new BarPlot($rvValues);
$rvPlot->SetFillColor( "#000099");
$rvPlot->value->Show();
$rvPlot->value->SetFormat('%d');
$rvPlot->value->SetFont(FF_FONT1,FS_NORMAL,9);
$rvPlot->SetLegend('Repeat View');

// Create the grouped bar plot
$bars  = new GroupBarPlot (array($fvPlot ,$rvPlot));

// set other options
$graph->title->SetFont( FF_ARIAL, FS_NORMAL, $fontSize);
$graph->title->Set( $chartType );
$graph->xaxis->SetTickLabels($labels);
$graph->yaxis->SetFont(FF_FONT1,FS_NORMAL,9);
$graph->xaxis->SetFont(FF_FONT1,FS_NORMAL,9);
$graph->xaxis->SetLabelAngle(90);
$graph->img->SetMargin(20,20,50,200);

// ...and add it to the graPH
$graph->Add($bars);
$graph->img->SetExpired(false);
$graph->Stroke(); 
?>
