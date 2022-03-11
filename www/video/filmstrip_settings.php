<?php

// NOTE: this up-front logic is borrowed from lower down in compare.php but settings form needs it as well.
// TODO: centralize this stuff.
// we'll set this here so that the settings panel can use it as it's now earlier in the page
$has_layout_shifts = false;
if (isset($test['stepResult']) && is_a($test['stepResult'], "TestStepResult")) {
    $layout_shifts = $test['stepResult']->getMetric('LayoutShifts');
    if (isset($layout_shifts) && is_array($layout_shifts) && count($layout_shifts)) {
        $has_layout_shifts = true;
    }
}



$has_lcp_rect = false;
$lcp = null;
if (isset($test['stepResult']) && is_a($test['stepResult'], "TestStepResult")) {
    $lcp = $test['stepResult']->getMetric('chromeUserTiming.LargestContentfulPaint');
}
if (isset($lcp)) {
    $lcp_time = $lcp;
    $paint_events = $test['stepResult']->getMetric('largestPaints');
    if (isset($paint_events) && is_array($paint_events) && count($paint_events)) {
        foreach($paint_events as $paint) {
            if (isset($paint['event']) &&
                $paint['event'] == 'LargestContentfulPaint' &&
                isset($paint['time']) &&
                isset($paint['element']['boundingRect'])) {
                if ($paint['time'] == $lcp) {
                    $has_lcp_rect = true;
                }
            }
        }
    }
}

echo ' <details class="box details_panel">
            <summary class="details_panel_hed"><span><i class="icon_plus"></i> <span>Adjust Filmstrip Settings</span></span></summary>
             
            <div class="details_panel_content">';
            

        // START TIMELINE OPTIONS
        if (!defined('EMBED')) {
        ?>
       
            <form name="layout" method="get" action="/video/compare.php">
            <?php
                echo "<input type=\"hidden\" name=\"tests\" value=\"" . htmlspecialchars($_REQUEST['tests']) . "\">\n";
            ?>
                    <fieldset>
                        <legend>Filmstrip Options</legend>
                <?php
                if ($has_layout_shifts) {
                    $checked = '';
                    if( isset($_REQUEST['highlightCLS']) && $_REQUEST['highlightCLS'] ){
                        $checked = ' checked=checked';
                    }
                    echo "<label for=\"highlightCLS\"><input type=\"checkbox\" id=\"highlightCLS\" name=\"highlightCLS\" value=\"1\"$checked onclick=\"this.form.submit();\"> Highlight Layout Shifts</label>";
                }
                if ($has_lcp_rect) {
                    $checked = '';
                    if( isset($_REQUEST['highlightLCP']) && $_REQUEST['highlightLCP'] ){
                        $checked = ' checked=checked';
                    }
                    echo "<label for=\"highlightLCP\"><input type=\"checkbox\" id=\"highlightLCP\" name=\"highlightLCP\" value=\"1\"$checked onclick=\"this.form.submit();\"> Highlight Largest Contentful Paints</label>";
                }

                $checked = '';
                if( !$stickyFilmstrip ){
                    $checked = ' checked=checked';
                }
                echo "<label for=\"sticky\"><input type=\"checkbox\" id=\"sticky\" name=\"filmstripScrollWithPage\" value=\"1\"$checked onclick=\"this.form.submit();\"> Scroll filmstrips with Page</label>";
                
                ?>
                </fieldset>
                    <?php
                        // fill in the thumbnail size selection
                        echo "<fieldset>";
                        echo "<legend>Thumbnail Size</legend>";
                        $checked = '';
                        if( $thumbSize <= 100 )
                            $checked = ' checked=checked';
                        echo "<label for=\"thumbSize100\"><input type=\"radio\" id=\"thumbSize100\" name=\"thumbSize\" value=\"100\"$checked onclick=\"this.form.submit();\"> Small</label>";
                        $checked = '';
                        if( $thumbSize <= 150 && $thumbSize > 100 )
                            $checked = ' checked=checked';
                        echo "<label for=\"thumbSize150\"><input type=\"radio\" id=\"thumbSize150\" name=\"thumbSize\" value=\"150\"$checked onclick=\"this.form.submit();\"> Medium</label>";
                        $checked = '';
                        if( $thumbSize <= 200 && $thumbSize > 150 )
                            $checked = ' checked=checked';
                        echo "<label for=\"thumbSize200\"><input type=\"radio\" id=\"thumbSize200\" name=\"thumbSize\" value=\"200\"$checked onclick=\"this.form.submit();\"> Large</label>";
                        $checked = '';
                        if( $thumbSize > 200)
                            $checked = ' checked=checked';
                        echo "<label for=\"thumbSize600\"><input type=\"radio\" id=\"thumbSize600\" name=\"thumbSize\" value=\"600\"$checked onclick=\"this.form.submit();\"> Huge</label>";
                        echo "</fieldset>";

                        // fill in the interval selection
                        echo "<fieldset>";
                        echo "<legend>Thumbnail Interval</legend>";
                        if ($supports60fps) {
                          $checked = '';
                          if( $interval < 100 )
                              $checked = ' checked=checked';
                          echo "<label for=\"ival60fps\"><input type=\"radio\" id=\"ival60fps\" name=\"ival\" value=\"16.67\"$checked onclick=\"this.form.submit();\"> 60 FPS</label>";
                        }
                        $checked = '';
                        if( ($supports60fps && $interval == 100) || (!$supports60fps && $interval < 500) )
                            $checked = ' checked=checked';
                        echo "<label for=\"ival100\"><input type=\"radio\" id=\"ival100\" name=\"ival\" value=\"100\"$checked onclick=\"this.form.submit();\"> 0.1 sec</label>";
                        $checked = '';
                        if( $interval == 500 )
                            $checked = ' checked=checked';
                        echo "<label for=\"ival500\"><input type=\"radio\" id=\"ival500\" name=\"ival\" value=\"500\"$checked onclick=\"this.form.submit();\"> 0.5 sec</label>";
                        $checked = '';
                        if( $interval == 1000 )
                            $checked = ' checked=checked';
                        echo "<label for=\"ival1000\"><input type=\"radio\" id=\"ival1000\" name=\"ival\" value=\"1000\"$checked onclick=\"this.form.submit();\"> 1 sec</label>";
                        $checked = '';
                        if( $interval > 1000 )
                            $checked = ' checked=checked';
                        echo "<label for=\"ival1000\"><input type=\"radio\" id=\"ival5000\" name=\"ival\" value=\"5000\"$checked onclick=\"this.form.submit();\"> 5 sec</label>";
                        echo "</fieldset>";

                        // fill in the endpoint selection
                        echo "<fieldset>";
                        echo "<legend>Comparison Endpoint</legend>";
                        if( !strcasecmp($endTime, 'aft') )
                            $endTime = 'visual';
                        $checked = '';
                        if( !strcasecmp($endTime, 'visual') )
                            $checked = ' checked=checked';
                        echo "<label for=\"endVisuallyComplete\"><input type=\"radio\" name=\"end\" id=\"endVisuallyComplete\" value=\"visual\"$checked onclick=\"this.form.submit();\"> Visually Complete</label>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'lcp') )
                            $checked = ' checked=checked';
                            echo "<label for=\"endLCP\"><input type=\"radio\" name=\"end\" id=\"endLCP\" value=\"lcp\"$checked onclick=\"this.form.submit();\"> Largest Contentful Paint</label>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'all') )
                            $checked = ' checked=checked';
                        echo "<label for=\"endLastChange\"><input type=\"radio\" name=\"end\" id=\"endLastChange\" value=\"all\"$checked onclick=\"this.form.submit();\"> Last Change</label>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'doc') )
                            $checked = ' checked=checked';
                        echo "<label for=\"endDocComplete\"><input type=\"radio\" name=\"end\" id=\"endDocComplete\" value=\"doc\"$checked onclick=\"this.form.submit();\"> Document Complete</label>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'full') )
                            $checked = ' checked=checked';
                        echo "<label for=\"endFullyLoaded\"><input type=\"radio\" name=\"end\" id=\"endFullyLoaded\" value=\"full\"$checked onclick=\"this.form.submit();\"> Fully Loaded</label>";
                        echo "</fieldset>";
                    ?>
                    <a class="" href="javascript:ShowAdvanced()">Advanced options...</a>

            </form>

            <form id="createForm" name="create" method="get" action="/video/view.php">
            <?php
                echo "<input type=\"hidden\" name=\"end\" value=\"$endTime\">";
                echo '<input type="hidden" name="tests" value="' . htmlspecialchars($_REQUEST['tests']) . '">';
                echo "<input type=\"hidden\" name=\"bg\" value=\"$bgcolor\">";
                echo "<input type=\"hidden\" name=\"text\" value=\"$color\">";
                if (isset($_REQUEST['labelHeight']) && is_numeric($_REQUEST['labelHeight']))
                    echo '<input type="hidden" name="labelHeight" value="' . htmlspecialchars($_REQUEST['labelHeight']) . '">"';
                if (isset($_REQUEST['timeHeight']) && is_numeric($_REQUEST['timeHeight']))
                    echo '<input type="hidden" name="timeHeight" value="' . htmlspecialchars($_REQUEST['timeHeight']) . '">"';
                if (isset($location) && strlen($location)) {
                    echo '<input type="hidden" name="loc" value="' . htmlspecialchars(strip_tags($location)) . '">';
                }

                echo "<a id=\"export\" class=\"\" href=\"filmstrip.php?tests=" . htmlspecialchars($_REQUEST['tests']) . "&thumbSize=$thumbSize&ival=$interval&end=$endTime&text=$color&bg=$bgcolor\" download>Download filmstrip image...</a>";
                // echo "</div>";
                echo '<div class="compare_video_form"><label for="slow"><input type="checkbox" id="slow" name="slow" value="1"> Slow Motion</label>';
                echo "<input id=\"SubmitBtn\" type=\"submit\" value=\"View Video\"></div>";
                echo "</form>"; ?>
       

        <div id="advanced" style="display:none;">
            <h3>Advanced Visual Comparison Configuration</h3>
            <p>There are additional customizations that can be done by modifying the <b>tests</b> parameter in the comparison URL directly.</p>
            <p>URL structure: ...compare.php?tests=&lt;Test 1 ID&gt;,&lt;Test 2 ID&gt;...</p>
            <p>The tests are displayed in the order listed and can be customized with options:</p>
            <div class="scrollableTable">
            <table class="pretty">
                <tbody>
                <tr><th>Custom label</th><td>-l:&lt;label&gt;</td><td>110606_MJ_RZEY-l:Original</td></tr>
                <tr><th>Specific run</th><td>-r:&lt;run&gt;</td><td>110606_MJ_RZEY-r:3</td></tr>
                <tr><th>Repeat view</th><td>-c:1</td><td>110606_MJ_RZEY-c:1</td></tr>
                <tr><th>Specific step</th><td>-s:3</td><td>110606_MJ_RZEY-s:3</td></tr>
                <tr><th>Specific End Time</th><td>-e:&lt;seconds&gt;</td><td>110606_MJ_RZEY-e:1.1</td></tr>
            </tbody>
            </table>
            </div>
            
            <p>You can also customize the background and text color by passing HTML color values to <b>bg</b> and <b>text</b> query parameters.</p>
            <p>Examples:</p>
            <ul>
            <li><b>Customizing labels:</b>
            https://www.webpagetest.org/video/compare.php?tests=110606_MJ_RZEY-l:Original,110606_AE_RZN5-l:No+JS</li>
            <li><b>Compare First vs. Repeat view:</b>
            https://www.webpagetest.org/video/compare.php?tests=110606_MJ_RZEY, 110606_MJ_RZEY-c:1</li>
            <li><b>Second step of first run vs. Second step of second run:</b>
            https://www.webpagetest.org/video/compare.php?tests=110606_MJ_RZEY-r:1-s:2,110606_MJ_RZEY-r:2-s:2</li>
            <li><b>White background with black text:</b>
            https://www.webpagetest.org/video/compare.php?tests=110606_MJ_RZEY, 110606_MJ_RZEY-c:1&bg=ffffff&text=000000</li>
            </ul>
            <input id="advanced-ok" type=button class="simplemodal-close pill" value="OK">
        </div>

        <?php } //embed 
        

        
    echo '</div></details>'; ?>
                    