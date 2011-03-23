<?php
/**
* Generate the html for displaying a page speed tree
* 
* @param mixed $file
*/
function PageSpeedTreeHTML($file) {
    $html = '';
    $pagespeed_data = gz_file_get_contents($file);
    $pagespeed = json_decode($pagespeed_data, true);
    if (!$pagespeed) {
        $json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE | SERVICES_JSON_SUPPRESS_ERRORS);
        $pagespeed = $json->decode($pagespeed_data, true);
    }
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
            $html .= 'Page Speed Score: <b>' . ceil($total / $count) . '/100</b><br>';

        $html .= '<ul id="pagespeed_tree" class="pagespeed_treeview">';
        
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

            $color = 'pagespeed_score-green';
            if( $score < 50 )
                $color = 'pagespeed_score-red';
            elseif( $score < 80 )
                $color = 'pagespeed_score-yellow';
            $img = "<img src=\"/images/cleardot.gif\" class=\"pagespeed_score pagespeed_score-icon $color\">";
            
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
            
            $html .= "<li class=\"pagespeed_check{$expand}{$last}\">$div$img $label ($score/100)";
                
            if( $childCount )
                $html .= DisplayChildren($pagespeed[$index]['children'], true);
                
            $html .= '</li>';
        }
        $html .= '</ul>';
    }
    
    return $html;
}

/**
* Recursively display the children
* 
* @param mixed $children
*/
function DisplayChildren(&$children, $hide)
{
    $html = '';
    $hidden = '';
    if( $hide )
        $hidden = 'style="display:none;"';
    $html .= "<ul class=\"pagespeed_children\"$hidden>";
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

        $html .= "<li class=\"pagespeed_child{$expand}{$last}\">$div $label";
        if( $childCount )
            $html .= DisplayChildren($child['children'], false);
        $html .= '</li>';
    }
    $html .= '</ul>';

    return $html;
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