<?php
if(array_key_exists("HTTP_IF_MODIFIED_SINCE",$_SERVER) && strlen(trim($_SERVER['HTTP_IF_MODIFIED_SINCE'])))
{
    header("HTTP/1.0 304 Not Modified");
}
else
{
    include 'common.inc';
    include 'breakdown.inc';
    require_once('contentColors.inc');

    include ("lib/jpgraph/jpgraph.php");
    include ("lib/jpgraph/jpgraph_pie.php"); 
    JpGraphError::SetErrLocale('prod');

    // Get the various settings
    $width = htmlspecialchars($_GET["width"]);
    if( !$width )
        $width = 500;

    $height = htmlspecialchars($_GET["height"]);
    if( !$height )
        $height = 300;

    $chartType = htmlspecialchars($_GET["type"]);
    if( !strlen($chartType) )
        $chartType = 'Requests';
        
    // walk through the requests and group them by mime type
    $requests;
    $breakdown = getBreakdown($id, $testPath, $run, $cached, $requests);
    if( count($breakdown) )
    {
        // build up the data set
        $values = array();
        ksort($breakdown);
        if( count($breakdown) > 1 )
        {
            foreach($breakdown as $data)
            {
                if( !strcasecmp($chartType, 'Requests') )
                    $values[] = $data['requests'];
                else if( !strcasecmp($chartType, 'Bytes') )
                    $values[] = $data['bytes'];
            }
        }
        else
            $values[] = 1;
            
        $graph  = new PieGraph($width,$height);
        $graph->SetFrame(false);
        $graph->SetAntiAliasing();

        $pie = new PiePlot($values);

        // specify the wedge colors
        $colors = array();
        $labels = array();
        $lastType = "";
        $count = 0;
        foreach($breakdown as $type => $data)
        {
            $labels[] = $type;
            $colors[] = $data['color'];
            $count++;
        }

        // set  the actual labels for the wedges
        $pie->SetLabels($labels, 1.1); 
        if( count($colors) )
            $pie->SetSliceColors($colors); 

        // set other options
        $pie->SetGuideLines( true, true, true); 
        $graph->title->SetFont( FF_FONT2, FS_BOLD );
        $graph->title->Set( $chartType );
        $pie->ShowBorder(true, true); 

        $graph->Add( $pie);
        $graph->img->SetExpired(false);
        $graph->Stroke(); 
    }
}
?>
