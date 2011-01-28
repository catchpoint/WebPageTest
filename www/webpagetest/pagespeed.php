<?php
include 'common.inc';
require_once('./lib/json.php');
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Page Speed analysis</title>
        <?php include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Page Speed';
            include 'header.inc';
            ?>

            <div id="pagespeed_results">
            <h2 class="nomargin">Page Speed Optimization Check</h2>
            <p class="centered"><a href="http://code.google.com/speed/page-speed/" target="_blank">More about Page Speed</a></p>
            
            <?php
            // load the pagespeed results
            $cachedText='';
            if((int)$cached == 1)
                $cachedText='_Cached';
            $fileName = $testPath . '/' . $run . $cachedText . '_pagespeed.txt';

            $json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE | SERVICES_JSON_SUPPRESS_ERRORS);
            $pagespeed = $json->decode(gz_file_get_contents($fileName), true);
            if( $pagespeed )
            {
                // build an array of the scores to sort
                $scores = array();
                $total = 0;
                $count = 0;
                foreach( $pagespeed as $index => &$check )
                {
                    $scores[$index] = $check['score'];
                    $total += (double)$check['score'];
                    $count++;
                }
                if( $count )
                    echo 'Page Speed Score: <b>' . ceil($total / $count) . '/100</b><br>';

                echo '<ul id="pagespeed" class="treeview">';
                
                // sort by score ascending
                asort($scores);
                $count = count($scores);
                $current = 0;
                foreach( $scores as $index => $score )
                {
                    $current++;
                    $label = FormatLabel($pagespeed[$index]['format']);
                    if( $pagespeed[$index]['url'] )
                    {
                        $url = 'http://code.google.com/speed/page-speed/docs/' . $pagespeed[$index]['url'];
                        $label = "<a href=\"$url\" target=\"_blank\">$label</a>";
                    }

                    $color = 'score-green';
                    if( $score < 50 )
                        $color = 'score-red';
                    elseif( $score < 80 )
                        $color = 'score-yellow';
                    $img = "<img src=\"/images/cleardot.gif\" class=\"score score-icon $color\">";
                    
                    $last = '';
                    if( $current == $count )
                        $last = ' last';
                        
                    $childCount = 0;
                    $expand = '';
                    $div = '';
                    if( $pagespeed[$index]['children'] && count($pagespeed[$index]['children']) )
                    {
                        $childCount = count($pagespeed[$index]['children']);
                        $expand = ' closed expandable';
                        $div = '<div class="hitarea pagespeed_check-hitarea closed-hitarea expandable-hitarea"></div>';
                        if( strlen($last) )
                            $last .= 'Collapsable';
                    }
                    
                    echo "<li class=\"pagespeed_check{$expand}{$last}\">$div$img $label ($score/100)";
                        
                    if( $childCount )
                        DisplayChildren($pagespeed[$index]['children'], true);
                        
                    echo '</li>';
                }
                echo '</ul>';
            }
            ?>
            
            
            </div>
            
            <?php include('footer.inc'); ?>
        </div>

    <script type="text/javascript">
        $("#pagespeed").treeview({prerendered: true});
    </script>
    
    </body>
</html>

<?php
/**
* Recursively display the children
* 
* @param mixed $children
*/
function DisplayChildren(&$children, $hide)
{
    $hidden = '';
    if( $hide )
        $hidden = 'style="display:none;"';
    echo "<ul class=\"pagespeed_children\"$hidden>";
    $current = 0;
    $count = count($children);
    foreach( $children as &$child )
    {
        $current++;
        
        $type = $child['format'][0]['type'];
        $label = FormatLabel($child['format']);

        $last = '';
        if( $current == $count )
            $last = ' last';
            
        $childCount = 0;
        $expand = '';
        $div = '';
        if( $child['children'] && count($child['children']) )
        {
            $childCount = count($child['children']);
            $expand = ' open collapsable';
            if( strlen($last) )
            {
                $last .= 'Collapsable';
                $div = '<div class="hitarea pagespeed_child-hitarea open-hitarea collapsable-hitarea lastCollapsable-hitarea"></div>';
            }
            else
                $div = '<div class="hitarea pagespeed_child-hitarea open-hitarea collapsable-hitarea"></div>';
        }

        echo "<li class=\"pagespeed_child{$expand}{$last}\">$div $label";
        if( $childCount )
            DisplayChildren($child['children'], false);
        echo '</li>';
    }
    echo '</ul>';
}

/**
* Combine the partial strings from the json into a single formatted string
* 
* @param mixed $format
*/
function FormatLabel(&$format)
{
    $ret = '';
    
    foreach( $format as &$item )
    {
        $type = $item['type'];
        if( $type == 'url' )
        {
            $ret .= "<a rel=\"nofollow\" href=\"{$item['value']}\" target=\"_blank\">" . htmlspecialchars(FitText($item['value'],80)) . '</a>';
        }
        else
            $ret .= htmlspecialchars($item['value']);
    }
    
    return $ret;
}
?>