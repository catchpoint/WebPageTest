<?php 
include 'common.inc';
set_time_limit(0);

// shared initializiation/loading code
error_reporting(0);
$days = (int)$_GET["days"];
$filter = $_GET["filter"];
$from = $_GET["from"];
if( !strlen($from) )
    $from = 'now';
$filterstr = NULL;
if( $filter && strlen($filter))
    $filterstr = strtolower($filter);
$includeip = false;
if( $admin || (int)$_GET["ip"] == 1 )
    $includeip = true;
$includePrivate = false;
if( $admin || (int)$_GET["private"] == 1 )
    $includePrivate = true;
$onlyVideo = false;
if( $_REQUEST['video'] )
    $onlyVideo = true;
$all = false;
if( $_REQUEST['all'] )
    $all = true;
$csv = false;
if( !strcasecmp($_GET["f"], 'csv') )
    $csv = true;


if( $csv )
{
    header ("Content-type: text/csv");
    echo '"Date/Time","Location","Test ID","URL"' . "\r\n";
}
else
{
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Test Log</title>
        <?php include ('head.inc'); ?>
		<style type="text/css">
			h4 {text-align: center;}
			.history table {text-align:left;}
			.history th {white-space:nowrap; text-decoration:underline;}
			.history td.date {white-space:nowrap;}
			.history td.location {white-space:nowrap;}
			.history td.url {white-space:nowrap;}
            .history td.ip {white-space:nowrap;}
            .history td.uid {white-space:nowrap;}
		</style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test History';
            include 'header.inc';
            ?>
            <div class="translucent" style="overflow:hidden;">
                <form style="text-align:center;" name="filterLog" method="get" action="/testlog.php">
                    View <select name="days" size="1">
                            <option value="1" <?php if ($days == 1) echo "selected"; ?>>1 Day</option>
                            <option value="7" <?php if ($days == 7) echo "selected"; ?>>7 Days</option>
                            <option value="30" <?php if ($days == 30) echo "selected"; ?>>30 Days</option>
                            <option value="182" <?php if ($days == 182) echo "selected"; ?>>6 Months</option>
                            <option value="365" <?php if ($days == 365) echo "selected"; ?>>1 Year</option>
                         </select> test log for URLs containing <input id="filter" name="filter" type="text" style="width:30em" value="<?php echo $filter ?>"> <input id="SubmitBtn" type="submit" value="Update List"><br>
                         <?php
                            if( isset($uid) )
                            {
                                $checked = '';
                                if( $all )
                                    $checked = ' checked=checked';
                                echo "<input id=\"all\" type=\"checkbox\" name=\"all\"$checked onclick=\"this.form.submit();\"> Show tests from all users &nbsp;&nbsp;\n";
                            }

                            $checked = '';
                            if( $onlyVideo )
                                $checked = ' checked=checked';
                            echo "<input id=\"video\" type=\"checkbox\" name=\"video\"$checked onclick=\"this.form.submit();\"> Only list tests that include video\n";
                         ?>
                </form>
                <h4>Clicking on an url will bring you to the results for that test</h4>
                <?php
                $action = '/video/compare.php';
                echo "<form name=\"compare\" method=\"get\" action=\"$action\">";
                ?>
		        <table class="history" border="0" cellpadding="5px" cellspacing="0">
			        <tr>
                        <th style="text-decoration: none;" ><input style="font-size: 70%; padding: 0;" id="CompareBtn" type="submit" value="Compare"></th>
				        <th>Date/Time</th>
				        <th>From</th>
                        <?php
                        if( $includeip )
                            echo '<th>Requested By</th>';
                        if( $admin )
                            echo '<th>User</th>';
                        ?>
                        <th>Label</th>
				        <th>Url</th>
			        </tr>
			        <?php
    }  // if( $csv )
			        // loop through the number of days we are supposed to display
                    $rowCount = 0;
			        $targetDate = new DateTime($from, new DateTimeZone('GMT'));
			        for($offset = 0; $offset <= $days; $offset++)
			        {
				        // figure out the name of the log file
				        $fileName = './logs/' . $targetDate->format("Ymd") . '.log';
				        
				        // load the log file into an array of lines
                        $ok = true;
                        $file = file_get_contents($fileName);
                        if($filterstr) {
                            $ok = false;
                            if(stristr($file, $filterstr))
                                $ok=true;
                        }
                        $lines = explode("\n", $file);
                        unset($file);
				        if(count($lines) && $ok)
				        {
					        // walk through them backwards
					        $records = array_reverse($lines);
					        foreach($records as $line)
					        {
                                $ok = true;
                                if($filterstr && stristr($line, $filterstr) === false)
                                    $ok = false;
                                
                                if ($ok)
                                {                                
						            $date = NULL;
						            $location = NULL;
						            $url = NULL;
						            $guid = NULL;
                                    $ip = NULL;
                                    $testUID = NULL;
                                    $testUser = NULL;
                                    $private = false;
                                    $video = false;
                                    $label = NULL;
						            
						            // tokenize the line
						            $parseLine = str_replace("\t", "\t ", $line);
						            $token = strtok($parseLine, "\t");
						            $column = 0;
						            while($token)
						            {
							            $column++;
							            $token = trim($token);
							            if( strlen($token) > 0)
							            {
								            switch($column)
								            {
									            case 1: $date = strtotime($token); break;
                                                case 2: $ip = $token; break;
									            case 5: $guid = $token; break;
									            case 6: $url = htmlspecialchars($token); break;
									            case 7: $location = $token; break;
                                                case 8: $private = ($token == '1' ); break;
                                                case 9: $testUID = $token; break;
                                                case 10: $testUser = $token; break;
                                                case 11: $video = ($token == '1'); break;
                                                case 12: $label = htmlspecialchars($token); break;
								            }
							            }
							            
							            // on to the next token
							            $token = strtok("\t");
						            }
						            
						            if( $date && $location && $url && $guid)
						            {
                                        // see if it is supposed to be filtered out
                                        if( $private && !$includePrivate && (!$uid  || $uid != $testUID))
                                            $ok = false;
                                            
                                        if( $onlyVideo and !$video )
                                            $ok = false;
                                            
                                        if( isset($uid) && !$all && $uid != $testUID )
                                            $ok = false;
                                        
                                        if( $ok )
                                        {
                                            $rowCount++;
                                            $newDate = strftime('%x %X', $date + ($tz_offset * 60));
							                
                                            if( $csv )
                                            {
                                                // only track local tests
                                                if( strncasecmp($guid, 'http:', 5) && strncasecmp($guid, 'https:', 6) )
                                                {
                                                    echo '"' . $newDate . '","' . $location . '","' . $guid . '","' . str_replace('"', '""', $url) . '"' . "\r\n";
                                                    // flush every 30 rows of data
                                                    if( $rowCount % 30 == 0 )
                                                    {
                                                        flush();
                                                        ob_flush();
                                                    }
                                                }
                                            }
                                            else
                                            {
                                                echo '<tr>';
                                                echo '<td>';
                                                if( isset($guid) && $video )
                                                    echo "<input type=\"checkbox\" name=\"t[]\" value=\"$guid\">";
                                                echo '</td>';
							                    echo '<td class="date">';
                                                if( $private )
                                                    echo '<b>';
                                                echo $newDate;
                                                if( $private )
                                                    echo '</b>';
                                                echo '</td>';
							                    echo '<td class="location">' . $location;
                                                if( $video )
                                                    echo ' (video)';
                                                echo '</td>';
                                                if($includeip)
                                                    echo '<td class="ip">' . $ip . '</td>';
                                                
                                                if( $admin )
                                                {
                                                    if( isset($testUID) )
                                                        echo '<td class="uid">' . "$testUser ($testUID)" . '</td>';
                                                    else
                                                        echo '<td class="uid"></td>';
                                                }
                                                    
                                                $link = "/result/$guid/";
                                                if( !strncasecmp($guid, 'http:', 5) || !strncasecmp($guid, 'https:', 6) )
                                                    $link = $guid;
                                                    
                                                $labelTxt = $label;
                                                if( strlen($labelTxt) > 30 )
                                                    $labelTxt = substr($labelTxt, 0, 27) . '...';
                                                echo "<td title=\"$label\" class=\"label\"><a href=\"$link\">$labelTxt</a></td>";
                                                
							                    echo '<td class="url"><a title="' . $url . '" href="' . $link . '">' . fittext($url,80) . '</a></td></tr>';
                                                
                                                // split the tables every 30 rows so the browser doesn't wait for ALL the results
                                                if( $rowCount % 30 == 0 )
                                                {
                                                    echo '</table><table class="history" border="0" cellpadding="5px" cellspacing="0">';
                                                    flush();
                                                    ob_flush();
                                                }
                                            }
                                        }
                                    }
						        }
					        }
				        }
				        
				        // on to the previous day
				        $targetDate->modify('-1 day');
			        }
    if( !$csv )
    {
			        ?>
		        </table>
                </form>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
<?php
} // if( !$csv )
?>
