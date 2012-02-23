<?php
require_once ('jpgraph/jpgraph.php');
require_once ('jpgraph/jpgraph_line.php');

// Some (random) data
$ydata = array(11,3,8,12,5,1,9,13,5,7);
$ydata2  = array( 1 , 19 , 15 , 7 , 22 , 14 , 5 , 9 , 21 , 13 );

// Size of the overall graph
$width=640;
$height=480;

// Create the graph and set a scale.
// These two calls are always required
$graph = new Graph($width,$height);
$graph->SetScale('intlin');

// Setup margin and titles
$graph->SetMargin(40,20,20,40);
$graph->title->Set('Calls per operator');
$graph->subtitle->Set('(March 12, 2008)');
$graph->xaxis->title->Set('Operator');
$graph->yaxis->title->Set('# of calls');

// Create the linear plot
$lineplot=new LinePlot($ydata);

// Add the plot to the graph
$graph->Add($lineplot);
$graph -> title -> SetFont ( FF_FONT1 , FS_BOLD );
$graph -> yaxis -> title -> SetFont ( FF_FONT1 , FS_BOLD );
$graph -> xaxis -> title -> SetFont ( FF_FONT1 , FS_BOLD );
//$lineplot -> SetColor ( 'blue' );
//$lineplot -> SetWeight ( 2 );   // Two pixel wide
//$graph->SetShadow();
//$graph->yaxis->SetColor('blue');

// Create a new data series with a different color
$lineplot2 = new  LinePlot ( $ydata2 );
//$lineplot2->SetWeight ( 2 );

// Also add the new data series to the graph
$graph->Add( $lineplot2 );

// Display the graph
$graph->Stroke("graph/cache/graph1.png");
?>