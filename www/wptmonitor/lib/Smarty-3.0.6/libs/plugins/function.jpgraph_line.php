<?php
require_once ('jpgraph/jpgraph.php');
require_once ('jpgraph/jpgraph_line.php');
require_once( "jpgraph/jpgraph_date.php" );

/**
 * Smarty {eval} function plugin
 *
 * Type:     function<br>
 * Name:     jpgraph_line
 * @param array
 * @param Smarty
 */
function smarty_function_jpgraph_line($params, &$smarty) {
  try {
  $datas = $params['datas'];

  if (sizeof($datas) < 1 ){
    return "<h1 style='color: red;'>No Data for given time period </h1>";
  }
  $interval = $params['interval'];
  $title = $params['title'];
  $x_axis_title = $params['x_axis_title'];
  $x_axis_tick_labels = $params['x_axis_tick_labels'];
  $y_axis_title = $params['y_axis_title'];
  $subtitle = $params['subtitle'];
  $margins = explode(',', $params['margins']);
  $width = $params['width'];
  $height = $params['height'];

  $graphDatas = array();

  // Determine ... from interval
  switch ($interval){
    case 1:
      $timeAlign =DAYADJ_1;
      break;
    case 300:
      $timeAlign =DAYADJ_1;
      break;
    case 900:
      $timeAlign =DAYADJ_1;
      break;
    case 1800:
      $timeAlign =DAYADJ_1;
      break;
    case 3600:
      $timeAlign =DAYADJ_1;
      break;
    case 10800:
      $timeAlign =DAYADJ_1;
      break;
    case 21600:
      $timeAlign =DAYADJ_1;
      break;
    case 43200:
      $timeAlign =DAYADJ_1;
      break;
    case 86400:
      $timeAlign =DAYADJ_1;
      break;
    case 604800:
      $timeAlign =DAYADJ_1;
      break;

  }
  foreach ($datas as $key=>$data){
    $graphData = array();
  $idx = 0;
    foreach ($data as $d){
//      $graphData["'".$x_axis_tick_labels[$idx]."'"] = $d;
      $graphData[] = $d;
      $idx++;
    }
    $graphDatas[$key] = $graphData;
  }
//  print_r($graphDatas);exit;
  // Create the graph and set a scale.
  // These two calls are always required
  $graph = new Graph($width, $height);
  $graph->SetScale('datint');
  $graph->xaxis->scale->SetTimeAlign($timeAlign);
//  $graph->xaxis->scale->SetDateFormat( 'm/d H:i' );

  $graph->xaxis->SetTickLabels($x_axis_tick_labels);
  $graph->xaxis->SetLabelAngle(90);

  // Setup margin and titles
  $graph->SetMargin($margins[0], $margins[1], $margins[2], $margins[3]);
  $graph->title->Set($title);
  $graph->subtitle->Set($subtitle);
  $graph->xaxis->title->Set($x_axis_title);
  $graph->yaxis->title->Set($y_axis_title);
  $graph->img->SetAntiAliasing($aFlg=true);
  // Create the linear plot
//  $lineplot = new LinePlot($ydata);

  // Add the plot to the graph
//  $graph->Add($lineplot);
//  $graph->title->SetFont(FF_FONT1, FS_BOLD);
//  $graph->yaxis->title->SetFont(FF_FONT1, FS_BOLD);
//  $graph->xaxis->title->SetFont(FF_FONT1, FS_BOLD);
  //$lineplot -> SetColor ( 'blue' );
  //$lineplot -> SetWeight ( 2 );   // Two pixel wide
  //$graph->SetShadow();
  //$graph->yaxis->SetColor('blue');

  // Create a new data series with a different color
  //$lineplot2->SetWeight ( 2 );
  $colors = array('#FF0000','green','blue','black');
  $colors= array('#0000CD', '#A52A2A', '#458B00', '#8B4513', '#2A0CD0',
    '#99008B', '#88288B', '#3370FF', '#8Bff00', '#8FBC8F',
    '#77008B', '#68268B', '#3326FF', '#8Bdd00', '#1FBC8F',
    '#66008B', '#58258B', '#1135FF', '#8Baa00', '#5FBC8F',
    '#44008B', '#38238B', '#23776F', '#8B3300', '#7FBC8F',
    '#22008B', '#18218B', '#7310FF', '#8B1100', '#8FBC8F',
    '#8B7500','#333333','#990000');
  // Also add the new data series to the graph
  $colorIdx = 0;

  foreach($graphDatas as $key=>$data){
    $lp = new LinePlot($data);
    $lp->SetLegend($key);
    $lp->SetColor($colors[$colorIdx]);
    $colorIdx++;
    $graph->Add($lp);
  }
  $graph ->legend->Pos( 0.001,0.040,"right" ,"top");
//  $graph->legend->SetColumns(2);
  // Display the graph
  
  $rnd = rand(0,999999);
  $imageFile = "graph/cache/graph".$rnd.".png";
  $graph->Stroke($imageFile);
  return "<img src=".$imageFile.">";
  } catch (Exception $ex){
    return "<h1 style='color: red;'>Invalid combination for the given time period </h1>";
  }

}


?>
