<?php
/**
* Generate the html for displaying a page speed tree
* 
* @param mixed $file
*/
function PageSpeedTreeHTML($file, $docRoot = '', $ver = '') {
    $html = '';
    $pagespeed = LoadPageSpeedData($file);
    if( $pagespeed )
    {
        $scores = array();
        $newFormat = false;
        $html .= '<div class="pagespeed_container">';
        $score = 0;
        if( isset($pagespeed['score']) )
        {
            $score = $pagespeed['score'];
            $newFormat = true;
            foreach( $pagespeed['rule_results'] as $index => &$result )
            {
                if( !array_key_exists('experimental', $result) || !$result['experimental'] )
                    $scores[$index] = $result['rule_impact'];
            }
        }
        else
        {
            // build an array of the scores to sort
            $total = 0;
            $count = 0;
            foreach( $pagespeed as $index => &$check )
            {
                $scores[$index] = $check['score'];
                $total += (double)$check['score'];
                $count++;
            }
            if( $count )
                $score = ceil($total / $count);
        }
        $html .= "PageSpeed $ver Score: <b>" . $score . '/100</b>*<br>';

        $html .= '<ul id="pagespeed_tree" class="pagespeed_treeview">';
        
        // sort by score
        if( $newFormat )
            arsort($scores);
        else
            asort($scores);
        $count = count($scores);
        $current = 0;
        foreach( $scores as $index => $score )
        {
            $current++;
            if( $newFormat )
            {
                $color = 'pagespeed_score-green';
                if( $score >= 10 )
                    $color = 'pagespeed_score-red';
                elseif( $score >= 3 )
                    $color = 'pagespeed_score-yellow';
                $score = $pagespeed['rule_results'][$index]['rule_score'];
                $label = $pagespeed['rule_results'][$index]['localized_rule_name'];
                $url = PageSpeedGetRuleDoc($pagespeed['rule_results'][$index]['rule_name']);
                if( isset($url) )
                    $label = "<a href=\"$url\" target=\"_blank\">$label</a>";
                $children = &$pagespeed['rule_results'][$index]['url_blocks'];
            }
            else
            {
                $label = FormatLabel($pagespeed[$index]['format'], $newFormat);
                if( $pagespeed[$index]['url'] )
                {
                    $url = 'http://code.google.com/speed/page-speed/docs/' . $pagespeed[$index]['url'];
                    $label = "<a href=\"$url\" target=\"_blank\">$label</a>";
                }
                $children = &$pagespeed[$index]['children'];
                $color = 'pagespeed_score-green';
                if( $score < 50 )
                    $color = 'pagespeed_score-red';
                elseif( $score < 80 )
                    $color = 'pagespeed_score-yellow';
            }

            $img = "<img src=\"$docRoot/images/cleardot.gif\" class=\"pagespeed_score pagespeed_score-icon $color\">";
            
            $last = '';
            if( $current == $count )
                $last = ' last';
                
            $childCount = 0;
            $expand = '';
            $div = '';
            if( $children && count($children) )
            {
                $childCount = count($children);
                $expand = ' closed expandable';
                $div = '<div class="hitarea pagespeed_check-hitarea closed-hitarea expandable-hitarea"></div>';
                if( strlen($last) )
                    $last .= 'Collapsable';
            }
            
            $html .= "<li class=\"pagespeed_check{$expand}{$last}\">$div$img $label";
            if( !$newFormat )
                $html .= " ($score/100)";
                
            if( $childCount )
                $html .= DisplayChildren($children, true, $newFormat);
                
            $html .= '</li>';
        }
        $html .= '</ul><br>* PageSpeed scores can only be compared to scores from the same version of the PageSpeed library.</div>';
    }
    
    return $html;
}

/**
* Return the URL for the given rule
* 
* @param mixed $rule
*/
function PageSpeedGetRuleDoc($rule)
{
    $rules = array(
          'AvoidBadRequests' => 'rtt.html#AvoidBadRequests',
          'AvoidCssImport' => 'rtt.html#AvoidCssImport',
          'AvoidDocumentWrite' => 'rtt.html#AvoidDocumentWrite',
          'CombineExternalCss' => 'rtt.html#CombineExternalCSS',
          'CombineExternalJavaScript' => 'rtt.html#CombineExternalJS',
          'EnableGzipCompression' => 'payload.html#GzipCompression',
          'EnableKeepAlive' => 'rtt.html#EnableKeepAlive',
          'InlineSmallCss' => 'caching.html#InlineSmallResources',
          'InlineSmallJavaScript' => 'caching.html#InlineSmallResources',
          'LeverageBrowserCaching' => 'caching.html#LeverageBrowserCaching',
          'MinifyCss' => 'payload.html#MinifyCSS',
          'MinifyHTML' => 'payload.html#MinifyHTML',
          'MinifyJavaScript' => 'payload.html#MinifyJS',
          'MinimizeDnsLookups' => 'rtt.html#MinimizeDNSLookups',
          'MinimizeRedirects' => 'rtt.html#AvoidRedirects',
          'MinimizeRequestSize' => 'request.html#MinimizeRequestSize',
          'OptimizeImages' => 'payload.html#CompressImages',
          'OptimizeTheOrderOfStylesAndScripts' => 'rtt.html#PutStylesBeforeScripts',
          'ParallelizeDownloadsAcrossHostnames' => 'rtt.html#ParallelizeDownloads',
          'PreferAsyncResources' => 'rtt.html#PreferAsyncResources',
          'PutCssInTheDocumentHead' => 'rendering.html#PutCSSInHead',
          'RemoveQueryStringsFromStaticResources' => 'caching.html#LeverageProxyCaching',
          'ServeResourcesFromAConsistentUrl' => 'payload.html#duplicate_resources',
          'ServeScaledImages' => 'payload.html#ScaleImages',
          'SpecifyACacheValidator' => 'caching.html#LeverageBrowserCaching',
          'SpecifyAVaryAcceptEncodingHeader' => 'caching.html#LeverageProxyCaching',
          'SpecifyCharsetEarly' => 'rendering.html#SpecifyCharsetEarly',
          'SpecifyImageDimensions' => 'rendering.html#SpecifyImageDimensions',
          'SpriteImages' => 'rtt.html#SpriteImages');

    $url = null;
    if( isset($rules[$rule]) )
        $url = 'http://code.google.com/speed/page-speed/docs/' . $rules[$rule];
    
    return $url;
}

/**
* Recursively display the children
* 
* @param mixed $children
*/
function DisplayChildren(&$children, $hide, $newFormat)
{
    $html = '';
    $hidden = '';
    $sub_children = 'children';
    if( $newFormat )
        $sub_children = 'urls';
    if( $hide )
        $hidden = 'style="display:none;"';
    $html .= "<ul class=\"pagespeed_children\"$hidden>";
    $current = 0;
    $count = count($children);
    foreach( $children as &$child )
    {
        $current++;
        
        if( $newFormat )
        {
            if( array_key_exists('header', $child) )
                $label = FormatLabel($child['header'], $newFormat);
            else
                $label = FormatLabel($child['result'], $newFormat);
        }
        else
        {
            $type = $child['format'][0]['type'];
            $label = FormatLabel($child['format'], $newFormat);
        }

        $last = '';
        if( $current == $count )
            $last = ' last';
            
        $childCount = 0;
        $expand = '';
        $div = '';
        if( $child[$sub_children] && count($child[$sub_children]) )
        {
            $childCount = count($child[$sub_children]);
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
            $html .= DisplayChildren($child[$sub_children], false, $newFormat);
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
function FormatLabel(&$format, $newFormat)
{
    $ret = '';
    
    if (isset($format) && is_array($format)) {
        if( $newFormat )
        {
            if (array_key_exists('format', $format)) {
                $ret = $format['format'];
            }
            if (array_key_exists('args', $format)) {
                foreach( $format['args'] as $index => &$arg )
                {
                    $key = $index + 1;
                    $key = '$' . $key;
                    $type = $arg['type'];
                    if( $type == 'url' )
                        $value = "<a rel=\"nofollow\" href=\"{$arg['localized_value']}\" target=\"_blank\">" . htmlspecialchars(FitText($arg['localized_value'],80)) . '</a>';
                    else
                        $value = htmlspecialchars($arg['localized_value']);
                    $ret = str_replace($key, $value, $ret);
                }
            }
        }
        else
        {
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
        }
    }
    
    return $ret;
}
?>