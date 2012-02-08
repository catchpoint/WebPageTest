<?php 
include 'common.inc';
include 'object_detail.inc'; 
require_once('page_data.inc');
require_once('waterfall.inc');
$data = loadPageRunData($testPath, $run, $cached);

$page_keywords = array('Performance Test','Details','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website performance test details$testLabel";
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest Test Details<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Details'; include ('head.inc'); ?>
        <style type="text/css">
        div.bar {
			height:12px; 
			margin-top:auto; 
			margin-bottom:auto;
		}
		
		.left {text-align:left;}
		.center {text-align:center;}

		.indented1 {padding-left: 40pt;}
		.indented2 {padding-left: 80pt;}
		
        td {
			white-space:nowrap; 
			text-align:left; 
			vertical-align:middle; 
		}
		
        td.center {
			text-align:center;
		}

		table.details {
		  margin-left:auto; margin-right:auto;
		  background: whitesmoke;
		  border-collapse: collapse;
		}
		table.details th, table.details td {
		  border: 1px silver solid;
		  padding: 0.2em;
		  text-align: center;
		  font-size: smaller;
		}
		table.details th {
		  background: gainsboro;
		}
		table.details caption {
		  margin-left: inherit;
		  margin-right: inherit;
		  background: whitesmoke;
		}
		table.details th.reqUrl, table.details td.reqUrl {
		  text-align: left;
		  width: 30em; 
		  word-wrap: break-word;
		}
		table.details td.even {
		  background: gainsboro;
		}
		table.details td.odd {
		  background: whitesmoke;
		}
		table.details td.evenRender {
		  background: #dfffdf;
		}
		table.details td.oddRender {
		  background: #ecffec;
		}
		table.details td.evenDoc {
		  background: #dfdfff;
		}
		table.details td.oddDoc {
		  background: #ececff;
		}
		table.details td.warning {
		  background: #ffff88;
		}
		table.details td.error {
		  background: #ff8888;
		}
        /* Jquery UI */
        .ui-helper-hidden { display: none; }
        .ui-helper-hidden-accessible { position: absolute !important; clip: rect(1px 1px 1px 1px); clip: rect(1px,1px,1px,1px); }
        .ui-helper-reset { margin: 0; padding: 0; border: 0; outline: 0; line-height: 1.3; text-decoration: none; font-size: 100%; list-style: none; }
        .ui-helper-clearfix:before, .ui-helper-clearfix:after { content: ""; display: table; }
        .ui-helper-clearfix:after { clear: both; }
        .ui-helper-clearfix { zoom: 1; }
        .ui-helper-zfix { width: 100%; height: 100%; top: 0; left: 0; position: absolute; opacity: 0; filter:Alpha(Opacity=0); }
        .ui-state-disabled { cursor: default !important; }
        .ui-icon { display: block; text-indent: -99999px; overflow: hidden; background-repeat: no-repeat; }
        .ui-widget-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .ui-widget { font-family: Trebuchet MS, Tahoma, Verdana, Arial, sans-serif; font-size: 1.1em; }
        .ui-widget .ui-widget { font-size: 1em; }
        .ui-widget input, .ui-widget select, .ui-widget textarea, .ui-widget button { font-family: Trebuchet MS, Tahoma, Verdana, Arial, sans-serif; font-size: 1em; }
        .ui-widget-content { border: 1px solid #dddddd; background: #eeeeee url(/images/ui-bg_highlight-soft_100_eeeeee_1x100.png) 50% top repeat-x; color: #333333; }
        .ui-widget-content a { color: #333333; }
        .ui-widget-header { border: 1px solid #e78f08; background: #f6a828 url(/images/ui-bg_gloss-wave_35_f6a828_500x100.png) 50% 50% repeat-x; color: #ffffff; font-weight: bold; }
        .ui-widget-header a { color: #ffffff; }
        .ui-state-default, .ui-widget-content .ui-state-default, .ui-widget-header .ui-state-default { border: 1px solid #cccccc; background: #f6f6f6 url(/images/ui-bg_glass_100_f6f6f6_1x400.png) 50% 50% repeat-x; font-weight: bold; color: #1c94c4; }
        .ui-state-default a, .ui-state-default a:link, .ui-state-default a:visited { color: #1c94c4; text-decoration: none; }
        .ui-state-hover, .ui-widget-content .ui-state-hover, .ui-widget-header .ui-state-hover, .ui-state-focus, .ui-widget-content .ui-state-focus, .ui-widget-header .ui-state-focus { border: 1px solid #fbcb09; background: #fdf5ce url(/images/ui-bg_glass_100_fdf5ce_1x400.png) 50% 50% repeat-x; font-weight: bold; color: #c77405; }
        .ui-state-hover a, .ui-state-hover a:hover { color: #c77405; text-decoration: none; }
        .ui-state-active, .ui-widget-content .ui-state-active, .ui-widget-header .ui-state-active { border: 1px solid #fbd850; background: #ffffff url(/images/ui-bg_glass_65_ffffff_1x400.png) 50% 50% repeat-x; font-weight: bold; color: #c00; }
        .ui-state-active a, .ui-state-active a:link, .ui-state-active a:visited { color: #eb8f00; text-decoration: none; }
        .ui-widget :active { outline: none; }
        .ui-state-highlight, .ui-widget-content .ui-state-highlight, .ui-widget-header .ui-state-highlight  {border: 1px solid #fed22f; background: #ffe45c url(images/ui-bg_highlight-soft_75_ffe45c_1x100.png) 50% top repeat-x; color: #363636; }
        .ui-state-highlight a, .ui-widget-content .ui-state-highlight a,.ui-widget-header .ui-state-highlight a { color: #363636; }
        .ui-state-error, .ui-widget-content .ui-state-error, .ui-widget-header .ui-state-error {border: 1px solid #cd0a0a; background: #b81900 url(images/ui-bg_diagonals-thick_18_b81900_40x40.png) 50% 50% repeat; color: #ffffff; }
        .ui-state-error a, .ui-widget-content .ui-state-error a, .ui-widget-header .ui-state-error a { color: #ffffff; }
        .ui-state-error-text, .ui-widget-content .ui-state-error-text, .ui-widget-header .ui-state-error-text { color: #ffffff; }
        .ui-priority-primary, .ui-widget-content .ui-priority-primary, .ui-widget-header .ui-priority-primary { font-weight: bold; }
        .ui-priority-secondary, .ui-widget-content .ui-priority-secondary,  .ui-widget-header .ui-priority-secondary { opacity: .7; filter:Alpha(Opacity=70); font-weight: normal; }
        .ui-state-disabled, .ui-widget-content .ui-state-disabled, .ui-widget-header .ui-state-disabled { opacity: .35; filter:Alpha(Opacity=35); background-image: none; }
        .ui-icon { width: 16px; height: 16px; background-image: url(/images/ui-icons_222222_256x240.png); }
        .ui-widget-content .ui-icon {background-image: url(/images/ui-icons_222222_256x240.png); }
        .ui-widget-header .ui-icon {background-image: url(/images/ui-icons_ffffff_256x240.png); }
        .ui-state-default .ui-icon { background-image: url(/images/ui-icons_ef8c08_256x240.png); }
        .ui-state-hover .ui-icon, .ui-state-focus .ui-icon {background-image: url(/images/ui-icons_ef8c08_256x240.png); }
        .ui-state-active .ui-icon {background-image: url(/images/ui-icons_ef8c08_256x240.png); }
        .ui-state-highlight .ui-icon {background-image: url(/images/ui-icons_228ef1_256x240.png); }
        .ui-state-error .ui-icon, .ui-state-error-text .ui-icon {background-image: url(/images/ui-icons_ffd27a_256x240.png); }

        /* jQuery UI Button 1.8.17
         *
         * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
         * Dual licensed under the MIT or GPL Version 2 licenses.
         * http://jquery.org/license
         *
         * http://docs.jquery.com/UI/Button#theming
         */
        .ui-button { display: inline-block; position: relative; padding: 0; margin-right: .1em; text-decoration: none !important; cursor: pointer; text-align: center; zoom: 1; overflow: visible; } /* the overflow property removes extra width in IE */
        .ui-button-icon-only { width: 2.2em; } /* to make room for the icon, a width needs to be set here */
        button.ui-button-icon-only { width: 2.4em; } /* button elements seem to need a little more width */
        .ui-button-icons-only { width: 3.4em; } 
        button.ui-button-icons-only { width: 3.7em; } 
        .ui-button .ui-button-text { display: block; line-height: 1.1;  }
        .ui-button-text-only .ui-button-text { padding: 5px 10px; }
        .ui-button-icon-only .ui-button-text, .ui-button-icons-only .ui-button-text { padding: .4em; text-indent: -9999999px; }
        .ui-button-text-icon-primary .ui-button-text, .ui-button-text-icons .ui-button-text { padding: .4em 1em .4em 2.1em; }
        .ui-button-text-icon-secondary .ui-button-text, .ui-button-text-icons .ui-button-text { padding: .4em 2.1em .4em 1em; }
        .ui-button-text-icons .ui-button-text { padding-left: 2.1em; padding-right: 2.1em; }
        input.ui-button { padding: .4em 1em; }
        .ui-button-icon-only .ui-icon, .ui-button-text-icon-primary .ui-icon, .ui-button-text-icon-secondary .ui-icon, .ui-button-text-icons .ui-icon, .ui-button-icons-only .ui-icon { position: absolute; top: 50%; margin-top: -8px; }
        .ui-button-icon-only .ui-icon { left: 50%; margin-left: -8px; }
        .ui-button-text-icon-primary .ui-button-icon-primary, .ui-button-text-icons .ui-button-icon-primary, .ui-button-icons-only .ui-button-icon-primary { left: .5em; }
        .ui-button-text-icon-secondary .ui-button-icon-secondary, .ui-button-text-icons .ui-button-icon-secondary, .ui-button-icons-only .ui-button-icon-secondary { right: .5em; }
        .ui-button-text-icons .ui-button-icon-secondary, .ui-button-icons-only .ui-button-icon-secondary { right: .5em; }
        .ui-buttonset { margin-right: 7px; }
        .ui-buttonset .ui-button { margin-left: 0; margin-right: -.3em; }
        button.ui-button::-moz-focus-inner { border: 0; padding: 0; } /* reset extra padding in Firefox */
        .ui-slider { position: relative; text-align: left; }
        .ui-slider .ui-slider-handle { position: absolute; z-index: 2; width: 1.2em; height: 1.2em; cursor: default; }
        .ui-slider .ui-slider-range { position: absolute; z-index: 1; font-size: .7em; display: block; border: 0; background-position: 0 0; }
        .ui-slider-horizontal { height: .8em; }
        .ui-slider-horizontal .ui-slider-handle { top: -.3em; margin-left: -.6em; }
        .ui-slider-horizontal .ui-slider-range { top: 0; height: 100%; }
        .ui-slider-horizontal .ui-slider-range-min { left: 0; }
        .ui-slider-horizontal .ui-slider-range-max { right: 0; }
        .ui-slider-vertical { width: .8em; height: 100px; }
        .ui-slider-vertical .ui-slider-handle { left: -.3em; margin-left: 0; margin-bottom: -.6em; }
        .ui-slider-vertical .ui-slider-range { left: 0; width: 100%; }
        .ui-slider-vertical .ui-slider-range-min { bottom: 0; }
        .ui-slider-vertical .ui-slider-range-max { top: 0; }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Details';
            include 'header.inc';
            ?>

            <div id="result">
                <div id="download">
                    <div id="testinfo">
                        <?php
                        echo GetTestInfoHtml();
                        ?>
                    </div>
                    <?php
	    		        echo '<a href="/export.php?' . "test=$id&run=$run&cached=$cached" . '">Export HTTP Archive (.har)</a>';
			            if ( $settings['enable_google_csi'] )
				            echo '<br><a href="/google/google_csi.php?' . "test=$id&run=$run&cached=$cached" . '">CSI (.csv) data</a>';
                        if( is_file("$testPath/{$run}{$cachedText}_dynaTrace.dtas") )
                        {
                            echo "<br><a href=\"/$testPath/{$run}{$cachedText}_dynaTrace.dtas\">Download dynaTrace Session</a>";
                            echo ' (<a href="http://ajax.dynatrace.com/pages/" target="_blank">get dynaTrace</a>)';
                        }
                        if( is_file("$testPath/{$run}{$cachedText}_bodies.zip") )
                            echo "<br><a href=\"/$testPath/{$run}{$cachedText}_bodies.zip\">Download Response Bodies</a>";
                        echo '<br>';
                    ?>
                </div>
                <div class="cleared"></div>
		        <br>
                <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                    <tr>
                        <?php
                        $cols = 4;
                        if((float)$data['domTime'] > 0.0)
                            $cols++;
                        if( $test['test']['aft'] )
                            $cols++;
                        if($data['domElements'] > 0)
                            $cols++;
                        if((float)$data['visualComplete'] > 0.0)
                            $cols++;
                        ?>
                        <th align="center" class="empty" valign="middle" colspan=<?php echo "\"$cols\"";?> ></th>
                        <th align="center" class="border" valign="middle" colspan="3">Document Complete</th>
                        <th align="center" class="border" valign="middle" colspan="3">Fully Loaded</th>
                    </tr>
                    <tr>
                        <th align="center" valign="middle">Load Time</th>
                        <th align="center" valign="middle">First Byte</th>
                        <th align="center" valign="middle">Start Render</th>
                        <?php if( $test['test']['aft'] ) { ?>
                        <th align="center" valign="middle">Above the Fold</th>
                        <?php } ?>
                        <?php if( (float)$data['visualComplete'] > 0.0 ) { ?>
                        <th align="center" valign="middle">Visually Complete</th>
                        <?php } ?>
                        <?php if( (float)$data['domTime'] > 0.0 ) { ?>
                        <th align="center" valign="middle">DOM Element</th>
                        <?php } ?>
                        <?php if( $data['domElements'] > 0 ) { ?>
                        <th align="center" valign="middle">DOM Elements</th>
                        <?php } ?>
                        <th align="center" valign="middle">Result (error code)</th>

                        <th align="center" class="border" valign="middle">Time</th>
                        <th align="center" valign="middle">Requests</th>
                        <th align="center" valign="middle">Bytes In</th>

                        <th align="center" class="border" valign="middle">Time</th>
                        <th align="center" valign="middle">Requests</th>
                        <th align="center" valign="middle">Bytes In</th>
                    </tr>
                    <tr>
                        <?php
                        echo "<td id=\"LoadTime\" valign=\"middle\">" . number_format($data['loadTime'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"TTFB\" valign=\"middle\">" . number_format($data['TTFB'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"startRender\" valign=\"middle\">" . number_format($data['render'] / 1000.0, 3) . "s</td>\n";
                        if( $test['test']['aft'] ) {
                            $aft = number_format($data['aft'] / 1000.0, 1) . 's';
                            if( !$data['aft'] )
                                $aft = 'N/A';
                            echo "<td id=\"aft\" valign=\"middle\">$aft</th>";
                        }
                        if( (float)$data['visualComplete'] > 0.0 )
                            echo "<td id=\"visualComplate\" valign=\"middle\">" . number_format($data['visualComplete'] / 1000.0, 1) . "s</td>\n";
                        if( (float)$data['domTime'] > 0.0 )
                            echo "<td id=\"domTime\" valign=\"middle\">" . number_format($data['domTime'] / 1000.0, 3) . "s</td>\n";
                        if( $data['domElements'] > 0 )
                            echo "<td id=\"domElements\" valign=\"middle\">{$data['domElements']}</td>\n";
                        echo "<td id=\"result\" valign=\"middle\">{$data['result']}</td>\n";

                        echo "<td id=\"docComplete\" class=\"border\" valign=\"middle\">" . number_format($data['docTime'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"requestsDoc\" valign=\"middle\">{$data['requestsDoc']}</td>\n";
                        echo "<td id=\"bytesInDoc\" valign=\"middle\">" . number_format($data['bytesInDoc'] / 1024, 0) . " KB</td>\n";

                        echo "<td id=\"fullyLoaded\" class=\"border\" valign=\"middle\">" . number_format($data['fullyLoaded'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"requests\" valign=\"middle\">{$data['requests']}</td>\n";
                        echo "<td id=\"bytesIn\" valign=\"middle\">" . number_format($data['bytesIn'] / 1024, 0) . " KB</td>\n";
                        ?>
                    </tr>
                </table><br>
		        <?php
		        if( isset($test['testinfo']['extract_csi']) )
		        {
			        require_once('google/google_lib.inc');
                    $params = ParseCsiInfo($id, $testPath, $run, $_GET["cached"], true);
		        ?>
		            <h2>Csi Metrics</h2>
                            <table id="tableCustomMetrics" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                               <tr>
                            <?php
                                    foreach ( $test['testinfo']['extract_csi'] as $csi_param )
                                        echo '<th align="center" class="border" valign="middle">' . $csi_param . '</th>';
                                    echo '</tr><tr>';
                                    foreach ( $test['testinfo']['extract_csi'] as $csi_param )
                                    {
                                        if( array_key_exists($csi_param, $params) )
                                        {
                                            echo '<td class="even" valign="middle">' . $params[$csi_param] . '</td>';
                                        }
                                        else
                                        {
                                            echo '<td class="even" valign="middle"></td>';
                                        }
                                    }
                                    echo '</tr>';
                            ?>
		            </table><br>
                <?php 
                }
                if ($data['loadEventStart'] > 0 || $data['domContentLoadedEventStart'] > 0)
                {
                    echo '<h2><a href="http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#process" target="_blank">W3C Navigation Timing</a></h2>';
                    echo '<table id="tableNavTiming" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">';
                    echo '<tr><th>domContentLoaded</th><th>loadEvent</th></tr>';
                    echo '<tr><td>';
                    echo number_format($data['domContentLoadedEventStart'] / 1000.0, 3) . 's - ' . 
                            number_format($data['domContentLoadedEventEnd'] / 1000.0, 3) . 's (' .
                            number_format(($data['domContentLoadedEventEnd'] - $data['domContentLoadedEventStart']) / 1000.0, 3) . 's)';
                    echo '</td><td>';
                    echo number_format($data['loadEventStart'] / 1000.0, 3) . 's - ' . 
                            number_format($data['loadEventEnd'] / 1000.0, 3) . 's (' .
                            number_format(($data['loadEventEnd'] - $data['loadEventStart']) / 1000.0, 3) . 's)';
                    echo '</td></tr>';
                    echo '</table><br>';
                }
                $secure = false;
                $haveLocations = false;
                $requests = getRequests($id, $testPath, $run, @$_GET['cached'], $secure, $haveLocations, true, true);
                ?>
                <div style="text-align:center;">
                <h3 name="waterfall_view">Waterfall View</h3>
                <table border="1" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
                    <tr>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#007B84"></div></td><td>DNS Lookup</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#FF7B00"></div></td><td>Initial Connection</td></tr></table></td>
                        <?php if($secure) { ?>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#CF25DF"></div></td><td>SSL Negotiation</td></tr></table></td>
                        <?php } ?>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#00FF00"></div></td><td>Time to First Byte</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#007BFF"></div></td><td>Content Download</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>
                        <?php if( $data['aft'] ) { ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#FF0000"></div></td><td>Above the Fold</td></tr></table></td>
                        <?php } ?>
                        <?php if( (float)$data['domTime'] > 0.0 ) { ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>
                        <?php } ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>
                        <td style="vertical-align:middle;"><div style="background-color:#FFFF00">3xx result</div></td>
                        <td style="vertical-align:middle;"><div style="background-color:#FF0000">4xx+ result</div></td>
                        <?php if( $settings['enable_google_csi'] ) { ?>
                        <td><table><tr><td><div class="arrow-down"></div></td><td>CSI</td></tr></table></td>
                        <?php } ?>
                    </tr>
                </table>
                <br>
                <map name="waterfall_map">
                <?php
                    $options = array(
                        'id' => $id,
                        'path' => $testPath,
                        'run_id' => $run,
                        'is_cached' => @$_GET['cached'],
                        'use_cpu' => true,
                        'width' => 930
                        );
                    $use_dots = !isset($_REQUEST['dots']) || $_REQUEST['dots'] != 0;
                    $rows = GetRequestRows($requests, $use_dots);
                    $map = GetWaterfallMap($rows, $url, $options);
                    foreach($map as $entry)
                    {
                        if (isset($entry['request'])) {
                            $index = $entry['request'] + 1;
                            $title = $index . ': ' . $entry['url'];
                            echo '<area href="#request' . $index . '" alt="' . $title . '" title="' . $title . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
                        } elseif (isset($entry['url'])) {
                            echo '<area href="#request" alt="' . $entry['url'] . '" title="' . $entry['url'] . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
                        } elseif (isset($entry['csi'])) {
                            echo '<area nohref="nohref" alt="' . $entry['csi'] . '" title="' . $entry['csi'] . '" shape=POLYGON coords="' . $entry['coords'] . '">' . "\n";
                        }
                    }
                ?>
                </map>
                <?php
                    echo '<div class="position-container">';
                    if( FRIENDLY_URLS )
                        echo '<img onmouseout="HideOverlays()" class="progress position-background" alt="Page load waterfall diagram" usemap="#waterfall_map" id="waterfall" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_waterfall.png">';
                    else
                        echo "<img onmouseout=\"HideOverlays()\" class=\"progress position-background\" alt=\"Page load waterfall diagram\" usemap=\"#waterfall_map\" id=\"waterfall\" src=\"/waterfall.php?test=$id&run=$run&cached=$cached\">";
                    // see if we have initiator information
                    $has_initiator = false;
                    foreach ($requests as &$request) {
                        if (array_key_exists('initiator', $request) && strlen($request['initiator'])) {
                            $has_initiator = true;
                            break;
                        }
                    }
                    if ($has_initiator && array_key_exists('dependencies', $_GET) && $_GET['dependencies']) {
                        // draw div's over each of the waterfall elements (use the image map as a reference)
                        foreach($map as $entry) {
                            if (isset($entry['request'])) {
                                $index = $entry['request'] + 1;
                                $top = $entry['top'];
                                $height = abs($entry['bottom'] - $entry['top']) + 1;
                                $tooltip = $entry['url'];
                                if (strlen($tooltip) > 100) {
                                    $split = strpos($tooltip, '?');
                                    if ($split !== false)
                                        $tooltip = substr($tooltip, 0, $split) . '...';
                                    $tooltip = FitText($tooltip, 100);
                                }
                                echo "<div class=\"transparent request-overlay\" id=\"request-overlay-$index\" tooltip=\"$tooltip\" onclick=\"HighlightDependencies($index)\" style=\"position: absolute; top: {$top}px; height: {$height}px;\"></div>\n";
                            }
                        }
                        
                        $dependencies = BuildDependencies($requests);
                        echo "<script type=\"text/javascript\">\n";
                        echo "var wptRequestCount=" . count($requests) . ";\n";
                        echo "var wptRequestDependencies=" . json_encode($dependencies) . ";\n";
                        echo "var wptRequestData=" . json_encode($requests) . ";\n";
                        echo "</script>";
                    }
                    echo '</div>';
                    echo "<br><a href=\"/customWaterfall.php?width=930&test=$id&run=$run&cached=$cached\">customize waterfall</a> &#8226; ";
                    echo "<a href=\"/pageimages.php?test=$id&run=$run&cached=$cached\">View all Images</a>";
                ?>
                <br>
                <br>
                <h3 name="connection_view">Connection View</h3>
                <map name="connection_map">
                <?php
                    $connection_rows = GetConnectionRows($requests);
                    $options = array(
                        'id' => $id,
                        'path' => $testPath,
                        'run_id' => $run,
                        'is_cached' => (bool)@$_GET['cached'],
                        'use_cpu' => true,
                        'width' => 930
                        );
                    $map = GetWaterfallMap($connection_rows, $url, $options);
                    foreach($map as $entry) {
                        if (array_key_exists('request', $entry)) {
                            $index = $entry['request'] + 1;
                            $title = "$index: {$entry['url']}";
                            echo "<area href=\"#request$index\" alt=\"$title\" title=\"$title\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
                        } elseif(array_key_exists('url', $entry)) {
                            echo "<area href=\"#request\" alt=\"{$entry['url']}\" title=\"{$entry['url']}\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
                        }
                    }
                ?>
                </map>
                <table border="1" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
                    <tr>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#007B84"></div></td><td>DNS Lookup</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#FF7B00"></div></td><td>Initial Connection</td></tr></table></td>
                        <?php if($secure) { ?>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#CF25DF"></div></td><td>SSL Negotiation</td></tr></table></td>
                        <?php } ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>
                        <?php if( (float)$data['domTime'] > 0.0 ) { ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>
                        <?php } ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>
                    </tr>
                </table>
                <br>
                <img class="progress" alt="Connection View waterfall diagram" usemap="#connection_map" id="connectionView" src="<?php 
                    $extenstion = 'php';
                    if( FRIENDLY_URLS )
                        $extenstion = 'png';
                    echo "/waterfall.$extenstion?type=connection&width=930&test=$id&run=$run&cached=$cached&mime=1";?>">
                </div>
		        <br><br> 
                <?php include('./ads/details_middle.inc'); ?>

		        <br>
		        <?php include 'waterfall_detail.inc'; ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>

        <div id="request-dialog" class="jqmDialog">
            <div id="dialog-resize" class="jqHandle jqResize"></div>
            <div id="dialog-header" class="jqmdTC">
                <div id="dialog-title"></div>
                <div id="radio">
                    <input type="radio" id="radio1" value="request-details" name="radio" checked="checked" /><label for="radio1">Details</label>
                    <input type="radio" id="radio2" value="request-headers" name="radio" /><label for="radio2">Request Headers</label>
                    <input type="radio" id="radio3" value="response-headers" name="radio" /><label for="radio3">Response Headers</label>
                    <input type="radio" id="radio4" value="response-body" name="radio" /><label for="radio4">Response Body</label>
                </div>
            </div>
            <div class="jqmdBC">
                <div id="dialog-contents" class="jqmdMSG">
                    <div id="request-details" class="dialog-tab-content"></div>
                    <div id="request-headers" class="dialog-tab-content"></div>
                    <div id="response-headers" class="dialog-tab-content"></div>
                    <div id="response-body" class="dialog-tab-content"></div>
                </div>
            </div>
            <div class="jqmdX jqmClose"></div>
        </div>        

        <script type="text/javascript">
        $(document).ready(function() { $("#tableDetails").tablesorter({ 
            headers: { 3: { sorter:'currency' } , 
                       4: { sorter:'currency' } ,
                       5: { sorter:'currency' } ,
                       6: { sorter:'currency' } ,
                       7: { sorter:'currency' } ,
                       8: { sorter:'currency' } ,
                       9: { sorter:'currency' } 
                     } 
        }); } ); 

        var HideOverlays = function(hash) {
            hash.w.hide();
            for (i=1;i<=wptRequestCount;i++) {
                $("#request-overlay-" + i).addClass("transparent");
            }
        }

        // initialize the pop-up dialog        
        $('#request-dialog').jqm({overlay: 0, onHide: HideOverlays})
              .jqResize('.jqResize');
        $('input.jqmdX')
            .hover( function(){ $(this).addClass('jqmdXFocus'); }, 
                    function(){ $(this).removeClass('jqmdXFocus'); })
            .focus( function(){ this.hideFocus=true; $(this).addClass('jqmdXFocus'); })
            .blur( function(){ $(this).removeClass('jqmdXFocus'); });
            
        // initialize the tooltips
        $('div.request-overlay').tooltip({ 
            track: true, 
            delay: 250, 
            showURL: false, 
            bodyHandler: function() {
                return $(this).attr("tooltip");
            },
            fade: 250 
        });        
        $("#radio").buttonset();
        $("#radio").change(function() {
            var panel=$('input[type=radio]:checked').val();
            $("#dialog-contents div.dialog-tab-content").hide();
            $("#" + panel).show();
        });
        
        function HighlightDependencies(request) {
            $("#dialog-title").html('Request #' + request);
            var details='';
            var requestHeaders='';
            var responseHeaders='';
            if (wptRequestData[request - 1] !== undefined) {
                var r = wptRequestData[request - 1];
                if (r['full_url'] !== undefined)
                    details += '<b>URL:</b> ' + r['full_url'] + '<br>';
                if (r['initiator'] !== undefined)
                    details += '<b>Loaded By:</b> ' + r['initiator'] + '<br>';
                if (r['headers'] !== undefined){
                    if (r.headers['request'] !== undefined){
                        for (i=0;i<r.headers.request.length;i++) {
                            requestHeaders += r.headers.request[i] + '<br>';
                        }
                    }
                    if (r.headers['response'] !== undefined){
                        for (i=0;i<r.headers.response.length;i++) {
                            responseHeaders += r.headers.response[i] + '<br>';
                        }
                    }
                }
            }
            $("#request-details").html(details);
            $("#request-headers").html(requestHeaders);
            $("#response-headers").html(responseHeaders);
            $('#request-dialog').jqmShow();
            console.log('Operating on request ' + request);
            var requests=new Array();
            for (i=0;i<=wptRequestCount;i++) {
                requests[i]=false;
            }
            requests[request]=true;
            for (i=0,len=wptRequestDependencies[request].length;i<len;i++) {
                requests[wptRequestDependencies[request][i]]=true;
            }
            for (i=1,len=requests.length;i<len;i++) {
                if (requests[i]) {
                    $("#request-overlay-" + i).addClass("transparent");
                } else {
                    $("#request-overlay-" + i).removeClass("transparent");
                }
            }
        }
        </script>
    </body>
</html>

<?php
/**
* Build the list of dependencies for each request
* 
* @param mixed $requests
*/
function BuildDependencies(&$requests) {
    $dependencies = array();
    $dependencies[] = '';  // dummy entry, 1-based indexes
    foreach($requests as &$request) {
        $entry = array();
        RequestLoads($request['number'], $requests, $entry);
        RequestLoadedBy($request['number'], $requests, $entry);
        $dependencies[] = $entry;
    }
    
    return $dependencies;
}

/**
* Figure out all of the resources loaded by the given resource
* 
* @param mixed $index
* @param mixed $requests
* @param mixed $map
* @param mixed $entry
*/
function RequestLoads($request_number, &$requests, &$entry) {
    $request = &$requests[$request_number - 1];
    if (array_key_exists('full_url', $request)) {
        $url = $request['full_url'];
        foreach ($requests as &$req) {
            if (array_key_exists('initiator', $req) && $req['initiator'] == $url) {
                $loads_request = $req['number'];
                $entry_exists = false;
                foreach($entry as $entry_request) {
                    if ($entry_request == $loads_request)
                        $entry_exists = true;
                }
                if (!$entry_exists) {
                    $entry[] = $loads_request;
                    RequestLoads($loads_request, $requests, $entry);
                }
            }
        }
    }
}

/**
* Figure out all of the resources required to load the given resource
* 
* @param mixed $index
* @param mixed $requests
* @param mixed $map
* @param mixed $entry
*/
function RequestLoadedBy($request_number, &$requests, &$entry) {
    $request = &$requests[$request_number - 1];
    if (array_key_exists('initiator', $request)) {
        $initiator = $request['initiator'];
        foreach ($requests as &$req) {
            if (array_key_exists('full_url', $req) && $req['full_url'] == $initiator) {
                $loaded_by = $req['number'];
                $entry_exists = false;
                foreach($entry as $entry_request) {
                    if ($entry_request == $loaded_by)
                        $entry_exists = true;
                }
                if (!$entry_exists) {
                    $entry[] = $loaded_by;
                    RequestLoadedBy($loaded_by, $requests, $entry);
                }
            }
        }
    }
}
?>
