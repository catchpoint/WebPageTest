<?php 
include 'common.inc';
include 'object_detail.inc'; 
require_once('page_data.inc');
require_once('waterfall.inc');
$data = loadPageRunData($testPath, $run, $cached);
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
                    <?php
	    		echo '<a href="/export.php?' . "test=$id&run=$run&cached=$cached" . '">Export HTTP Archive (.har)</a>';
	    		echo '<br>';
			if ( $settings['enable_google_csi'] )
				echo '<a href="/google/google_csi.php?' . "test=$id&run=$run&cached=$cached" . '">CSI (.csv) data</a>';
                        if( is_file("$testPath/{$run}{$cachedText}_dynaTrace.dtas") )
                        {
                            echo "<br><a href=\"/$testPath/{$run}{$cachedText}_dynaTrace.dtas\">Download dynaTrace Session</a>";
                            echo ' (<a href="http://ajax.dynatrace.com/pages/" target="_blank">get dynaTrace</a>)';
                        }
                    ?>
                </div>
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
                </table>
                <br>
                <?php 
                $secure = false;
                $haveLocations = false;
                $requests = getRequests($id, $testPath, $run, $_GET["cached"], $secure, $haveLocations, true);
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
                    $options = array( 'id' => $id, 'path' => $testPath, 'run' => $run, 'cached' => $_GET["cached"], 'cpu' => true, 'width' => 930 );
                    $map = drawWaterfall($url, $requests, $data, true, $options);
                    foreach($map as $entry)
                    {
                        if( $entry['request'] !== NULL )
                        {
                            $index = $entry['request'] + 1;
                            $title = $index . ': ' . $entry['url'];
                            echo '<area href="#request' . $index . '" alt="' . $title . '" title="' . $title . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
                        }
                        elseif( $entry['url'] !== NULL )
                        {
                            echo '<area href="#request" alt="' . $entry['url'] . '" title="' . $entry['url'] . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
                        }
                        elseif( $entry['csi'] !== NULL )
                            echo '<area nohref="nohref" alt="' . $entry['csi'] . '" title="' . $entry['csi'] . '" shape=POLYGON coords="' . $entry['coords'] . '">' . "\n";
                    }
                ?>
                </map>
                <?php
                    $cached='';
                    if((int)$_GET["cached"] == 1)
                        $cached='_Cached';
                    echo '<img class="progress" alt="Page load waterfall diagram" usemap="#waterfall_map" id="waterfall" src="' . substr($testPath, 1) . '/' . $run . $cached . '_waterfall.png">';
                    echo "<br><a href=\"/customWaterfall.php?width=930&test=$id&run=$run&cached={$_GET["cached"]}\">customize waterfall</a> &#8226; ";
                    echo "<a href=\"/pageimages.php?test=$id&run=$run&cached={$_GET["cached"]}\">View all Images</a>";
                ?>
                <br>
                <br>
                <h3 name="connection_view">Connection View</h3>
                <map name="connection_map">
                <?php
                    include 'contentColors.inc';
                    include 'connectionView.inc';
                    $mimeColors = requestColors($requests);
                    $summary = array();
                    $connections = getConnections($requests, $summary);
                    $options = array( 'id' => $id, 'path' => $testPath, 'run' => $run, 'cached' => $_GET["cached"], 'cpu' => true, 'width' => 930 );
                    $map = drawImage($connections, $summary, $url, $mime, $mimeColors, true, $data, $options);
                    foreach($map as $entry)
                    {
                        if( $entry['request'] !== NULL )
                        {
                            $index = $entry['request'] + 1;
                            $title = $index . ': ' . $entry['url'];
                            echo '<area href="#request' . $index . '" alt="' . $title . '" title="' . $title . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
                        }
                        else
                            echo '<area href="#request" alt="' . $entry['url'] . '" title="' . $entry['url'] . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
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
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#00FF00"></div></td><td>Time to First Byte</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#007BFF"></div></td><td>Content Download</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>
                        <?php if( (float)$data['domTime'] > 0.0 ) { ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>
                        <?php } ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>
                    </tr>
                </table>
                <br>
                <img class="progress" alt="Connection View waterfall diagram" usemap="#connection_map" id="connectionView" src="<?php 
                    echo "/waterfall.png?type=connection&width=930&test=$id&run=$run&cached=" . $_GET['cached'];?>">
                </div>
		        <br><br> 
                <?php include('./ads/details_middle.inc'); ?>

		        <br>
		        <?php include 'waterfall_detail.inc'; ?>
            </div>
            
            <?php include('footer.inc'); ?>
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
        </script>
    </body>
</html>
