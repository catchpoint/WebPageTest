<?php
include 'common.inc';
set_time_limit(0);

$page_keywords = array('Log','History','Webpagetest','Website Speed Test');
$page_description = "History of website performance speed tests run on WebPagetest.";

if ($supportsAuth && ((array_key_exists('google_email', $_COOKIE) && strpos($_COOKIE['google_email'], '@google.com') !== false)))
    $admin = true;

$supportsGrep = false;
$out = exec('grep --version', $output, $result_code);
if ($ret == 0 && isset($output) && is_array($output) && count($output))
  $supportsGrep = true;


$days      = (int)$_GET["days"];
$from      = $_GET["from"] ?: 'now';
$filter    = $_GET["filter"];
$filterstr = $filter ? preg_replace('/[^a-zA-Z0-9 \.\(\))\-\+]/', '', strtolower($filter)) : null;
$onlyVideo = !empty($_REQUEST['video']);
$all       = !empty($_REQUEST['all']);
$repeat   = !empty($_REQUEST['repeat']);
$nolimit   = !empty($_REQUEST['nolimit']);
$csv       = !strcasecmp($_GET["f"], 'csv');

if (isset($filterstr) && $supportsGrep)
  $filterstr = trim(escapeshellarg(str_replace(array('"', "'", '\\'), '', trim($filterstr))), "'\"");

if(extension_loaded('newrelic')) { 
  newrelic_add_custom_parameter('filter', $filter);
  newrelic_add_custom_parameter('days', $days);
  newrelic_add_custom_parameter('all', $all);
  newrelic_add_custom_parameter('nolimit', $nolimit);
}

$includeip      = false;
$includePrivate = false;
if ($admin) {
    $includeip = (int)$_GET["ip"] == 1;
    $includePrivate = (int)$_GET["private"] == 1;
}

function check_it($val) {
    if ($val) {
        echo ' checked ';
    }
}

if( $csv )
{
    header ("Content-type: text/csv");
    echo '"Date/Time","Location","Test ID","URL","Label"' . "\r\n";
}
else
{
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Test Log</title>
        <?php $gaTemplate = 'Test Log'; include ('head.inc'); ?>
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
                         </select> test log for URLs containing
                         <input id="filter" name="filter" type="text" style="width:30em" value="<?php echo htmlspecialchars($filter); ?>">
                         <input id="SubmitBtn" type="submit" value="Update List"><br>
                         <?php
                         if( isset($uid) || (isset($owner) && strlen($owner)) ) { ?>
                             <label><input id="all" type="checkbox" name="all" <?php check_it($all);?> onclick="this.form.submit();"> Show tests from all users</label> &nbsp;&nbsp;
                             <?php
                         }
                         if ($includePrivate)
                           echo '<input id="private" type="hidden" name="private" value="1">';
                         ?>
                        <label><input id="video" type="checkbox" name="video" <?php check_it($onlyVideo);?> onclick="this.form.submit();"> Only list tests that include video</label> &nbsp;&nbsp;
                        <label><input id="repeat" type="checkbox" name="repeat" <?php check_it($repeat);?> onclick="this.form.submit();"> Show repeat view</label>
                        <label><input id="nolimit" type="checkbox" name="nolimit" <?php check_it($nolimit);?> onclick="this.form.submit();"> Do not limit the number of results (warning, WILL be slow)</label>

                </form>
                <h4>Clicking on an url will bring you to the results for that test</h4>
                <form name="compare" method="get" action="/video/compare.php">
                <table class="history" border="0" cellpadding="5px" cellspacing="0">
                    <tr>
                        <th style="text-decoration: none;" ><input style="font-size: 70%; padding: 0;" id="CompareBtn" type="submit" value="Compare"></th>
                        <th>Date/Time</th>
                        <th>From</th>
                        <?php
                        if( $includeip )
                            echo '<th>Requested By</th>';
                        if( $admin ) {
                            echo '<th>User</th>';
                            echo '<th>Page Loads</th>';
                        }
                        ?>
                        <th>Label</th>
                        <th>Url</th>
                    </tr>
                    <?php
    }  // if( $csv )
                    // loop through the number of days we are supposed to display
                    $rowCount = 0;
                    $done = false;
                    $totalCount = 0;
                    $targetDate = new DateTime($from, new DateTimeZone('GMT'));
                    for($offset = 0; $offset <= $days && !$done; $offset++)
                    {
                        // figure out the name of the log file
                        $fileName = realpath('./logs/' . $targetDate->format("Ymd") . '.log');
                        if ($fileName !== false) {
                          // load the log file into an array of lines
                          if (isset($lines))
                            unset($lines);
                          if ($supportsGrep) {
                            $ok = false;
                            $pattern = '';
                            if(isset($filterstr) && strlen($filterstr)) {
                              $pattern = $filterstr;
                            } elseif (!$all) {
                              if (isset($user)) {
                                if (strlen($pattern))
                                  $pattern .= "\n";
                                $pattern .= "\t$user\t";
                              }
                              if (isset($owner) && strlen($owner)) {
                                if (strlen($pattern))
                                  $pattern .= "\n";
                                $pattern .= "\t$owner\t";
                              }
                            }
                            if (strlen($pattern)) {
                              $command = "grep -i -F \"$pattern\" \"$fileName\"";
                              exec($command, $lines, $result_code);
                              if ($result_code === 0 && is_array($lines) && count($lines))
                                $ok = true;
                            } else {
                              $lines = file($fileName);
                              $ok = true;
                            }
                          } else {
                            $ok = true;
                            $file = file_get_contents($fileName);
                            if($filterstr) {
                                $ok = false;
                                if(stristr($file, $filterstr))
                                    $ok=true;
                            }
                            $lines = explode("\n", $file);
                            unset($file);
                          }
                          if(count($lines) && $ok)
                          {
                              // walk through them backwards
                              $records = array_reverse($lines);
                              unset($lines);
                              foreach($records as $line)
                              {
                                  $ok = true;
                                  if($filterstr && stristr($line, $filterstr) === false)
                                      $ok = false;

                                  if ($ok)
                                  {
                                      // tokenize the line
                                      $line_data = tokenizeLogLine($line);

                                      $date       = $line_data['date'];
                                      $ip         = $line_data['ip'];
                                      $guid       = $line_data['guid'];
                                      $url        = htmlentities($line_data['url']);
                                      $location   = $line_data['location'];
                                      $private    = $line_data['private'];
                                      $testUID    = $line_data['testUID'];
                                      $testUser   = $line_data['testUser'];
                                      $video      = $line_data['video'];
                                      $label      = htmlentities($line_data['label']);
                                      $o          = $line_data['o'];
                                      $key        = $line_data['key'];
                                      $count      = $line_data['count'];

                                      if (!$location) {
                                          $location = '';
                                      }
                                      if( isset($date) && isset($location) && isset($url) && isset($guid))
                                      {
                                          // Automatically make any URLs with credentials private
                                          if (!$private) {
                                            $atPos = strpos($url, '@');
                                            if ($atPos !== false) {
                                              $queryPos = strpos($url, '?');
                                              if ($queryPos === false || $queryPos > $atPos) {
                                                $private = 1;
                                              }
                                            }
                                          }
                                          
                                          // see if it is supposed to be filtered out
                                          if ($private) {
                                              $ok = false;
                                              if ($includePrivate) {
                                                  $ok = true;
                                              } elseif ((isset($uid) && $uid == $testUID) ||
                                                  (isset($user) && strlen($user) && !strcasecmp($user, $testUser))) {
                                                  $ok = true;
                                              } elseif (isset($owner) && strlen($owner) && $owner == $o) {
                                                  $ok = true;
                                              }
                                          }

                                          if( $onlyVideo and !$video )
                                              $ok = false;

                                          if ($ok && !$all) {
                                              $ok = false;
                                              if ((isset($uid) && $uid == $testUID) ||
                                                  (isset($user) && strlen($user) && !strcasecmp($user, $testUser))) {
                                                  $ok = true;
                                              } elseif (isset($owner) && strlen($owner) && $owner == $o) {
                                                  $ok = true;
                                              }
                                          }

                                          if( $ok )
                                          {
                                              // See if we have to override the label
                                              $new_label = getLabel($guid, $user);
                                              if (!empty($new_label)) {
                                                  $label = htmlentities($new_label);
                                              }

                                              $rowCount++;
                                              $totalCount++;
                                              $newDate = strftime('%x %X', $date + ($tz_offset * 60));

                                              if( $csv )
                                              {
                                                  // only track local tests
                                                  if( strncasecmp($guid, 'http:', 5) && strncasecmp($guid, 'https:', 6) )
                                                  {
                                                      echo '"' . $newDate . '","' . $location . '","' . $guid . '","' . str_replace('"', '""', $url) . '","' . $label . '"' . "\r\n";
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
                                                  if( isset($guid) && $video && !( $url == "Bulk Test" || $url == "Multiple Locations test" ) ) {
                                                      echo "<input type=\"checkbox\" name=\"t[]\" value=\"$guid\" title=\"First View\">";
                                                      if($repeat) {
                                                          echo "<input type=\"checkbox\" name=\"t[]\" value=\"$guid-c:1\" title=\"Repeat View\">";
                                                      } 
                                                  }
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
                                                      echo "<td class=\"count\">$count</td>";
                                                  }
                                                  $link = "/results.php?test=$guid";
                                                  if( FRIENDLY_URLS )
                                                      $link = "/result/$guid/";
                                                  if( !strncasecmp($guid, 'http:', 5) || !strncasecmp($guid, 'https:', 6) )
                                                      $link = $guid;

                                                  $labelTxt = $label;
                                                  if( mb_strlen($labelTxt) > 30 ) {
                                                      $labelTxt = mb_substr($labelTxt, 0, 27) . '...';
                                                  }

                                                  echo "<td title=\"$label\" class=\"label\">";
                                                  echo "<a href=\"$link\" id=\"label_$guid\">$labelTxt</a>&nbsp;";

                                                  // Only allow people to update labels if they are logged in
                                                  if ($user && class_exists("SQLite3")) {
                                                      echo '<a href="#" class="editLabel" data-test-guid="' . $guid . '" data-current-label="' . $label . '">(Edit)</a>';
                                                  }

                                                  echo "</td>";

                                                  echo '<td class="url"><a title="' . $url . '" href="' . $link . '">' . fittext($url,80) . '</a></td></tr>';

                                                  // split the tables every 30 rows so the browser doesn't wait for ALL the results
                                                  if( $rowCount % 30 == 0 )
                                                  {
                                                      echo '</table><table class="history" border="0" cellpadding="5px" cellspacing="0">';
                                                      flush();
                                                      ob_flush();
                                                  }
                                              }

                                              if (!$nolimit && $totalCount > 100) {
                                                  $done = true;
                                                  break;
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
