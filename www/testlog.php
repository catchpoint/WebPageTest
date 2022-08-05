<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/common.inc';

use WebPageTest\Template;
use WebPageTest\Util;

$host = Util::getSetting('host');
$protocol = $request_context->getUrlProtocol();

$is_logged_in = Util::getSetting('cp_auth') && (!is_null($request_context->getClient()) && $request_context->getClient()->isAuthenticated());

if ($admin || $privateInstall || $is_logged_in) {
    set_time_limit(0);
} else {
    set_time_limit(60);
}

if ($userIsBot || Util::getSetting('disableTestlog')) {
    header('HTTP/1.0 403 Forbidden');
    exit;
}

$test_history = [];
$default_days = 7;
$days = (int)($_GET["days"] ?? $default_days);

if ($is_logged_in) {
    $test_history = $request_context->getClient()->getTestHistory($days);
}

// Redirect logged-in saml users to the hosted test history if one is configured
if (!$is_logged_in && (isset($USER_EMAIL) && Util::getSetting('history_url') && !isset($_REQUEST['local']))) {
    header('Location: ' . Util::getSetting('history_url'));
    exit;
}

$page_keywords = array('Log', 'History', 'WebPageTest', 'Website Speed Test');
$page_description = "History of website performance speed tests run on WebPageTest.";

$supportsGrep = false;
$out = exec('grep --version', $output, $result_code);
if ($result_code == 0 && isset($output) && is_array($output) && count($output)) {
    $supportsGrep = true;
}


$from      = (isset($_GET["from"]) && strlen($_GET["from"])) ? $_GET["from"] : 'now';
$filter    = $_GET["filter"];
$filterstr = $filter ? preg_replace('/[^a-zA-Z0-9 \@\/\:\.\(\))\-\+]/', '', strtolower($filter)) : null;
$onlyVideo = !empty($_REQUEST['video']);
$all       = !empty($_REQUEST['all']);
$repeat    = !empty($_REQUEST['repeat']);
$nolimit   = !empty($_REQUEST['nolimit']);
$csv       = isset($_GET["f"]) && !strcasecmp($_GET["f"], 'csv');
$priority  = (isset($_REQUEST['priority']) && is_numeric($_REQUEST['priority'])) ? intval($_REQUEST['priority']) : null;

if (!$privateInstall && $all && $days > 7 && !strlen(trim($filterstr))) {
    header('HTTP/1.0 403 Forbidden');
    exit;
}

if (isset($USER_EMAIL) && !isset($user)) {
    $user = $USER_EMAIL;
}

if (isset($filterstr) && $supportsGrep) {
    $filterstr = trim(escapeshellarg(str_replace(array('"', "'", '\\'), '', trim($filterstr))), "'\"");
}

$includeip      = false;
$includePrivate = false;
if ($admin) {
    $includeip = isset($_GET["ip"]) && (int)$_GET["ip"] == 1;
    $includePrivate = isset($_GET["private"]) && (int)$_GET["private"] == 1;
}

function check_it($val)
{
    if ($val) {
        echo ' checked ';
    }
}

// single user history
if (!$csv && ($is_logged_in || (!isset($user) && !isset($_COOKIE['google_email']) && Util::getSetting('localHistory')))) {
    $GLOBALS['tab'] = 'Test History';
    $tpl = new Template('testhistory');
    $tpl->setLayout('default');
    echo $tpl->render('user', array(
        'is_logged_in' => $is_logged_in,
        'protocol' => $protocol,
        'host' => $host,
        'days' => $days,
        'test_history' => $test_history,
        'priority' => $priority,
        'local' => isset($_REQUEST['local']) && $_REQUEST['local'],
        'body_class' => 'history',
        'page_title' => 'WebPageTest - Test History',
    ));
    exit();
}

if ($csv) {
    header("Content-type: text/csv");
    echo '"Date/Time","Location","Test ID","URL","Label"' . "\r\n";
} else {
    ?>
    <!DOCTYPE html>
    <html lang="en-us">

    <head>
        <title>WebPageTest - Test Log</title>
        <?php $gaTemplate = 'Test Log';
        include('head.inc'); ?>
    </head>

    <body class="history">
        <?php
        $tab = 'Test History';
        include 'header.inc';
        ?>
        <h1>Test History</h1>
        <div class="box">
            <form name="filterLog" method="get" action="/testlog.php">
                View <select name="days" size="1">
                    <option value="1" <?php if ($days == 1) {
                                            echo "selected";
                                      } ?>>1 Day</option>
                    <option value="7" <?php if ($days == 7) {
                                            echo "selected";
                                      } ?>>7 Days</option>
                    <option value="30" <?php if ($days == 30) {
                                            echo "selected";
                                       } ?>>30 Days</option>
                    <option value="182" <?php if ($days == 182) {
                                            echo "selected";
                                        } ?>>6 Months</option>
                    <option value="365" <?php if ($days == 365) {
                                            echo "selected";
                                        } ?>>1 Year</option>
                </select> test log for URLs containing
                <input id="filter" name="filter" type="text" style="width:30em" value="<?php echo htmlspecialchars($filter); ?>">
                <input id="SubmitBtn" type="submit" value="Update List"><br>
                <?php
                if (($admin || !Util::getSetting('forcePrivate')) && (isset($uid) || (isset($owner) && strlen($owner)))) { ?>
                    <label><input id="all" type="checkbox" name="all" <?php check_it($all); ?> onclick="this.form.submit();"> Show tests from all users</label> &nbsp;&nbsp;
                    <?php
                }
                if (isset($_REQUEST['ip']) && $_REQUEST['ip']) {
                    echo '<input type="hidden" name="ip" value="1">';
                }
                if (isset($_REQUEST['local']) && $_REQUEST['local']) {
                    echo '<input type="hidden" name="local" value="1">';
                }
                ?>
                <label><input id="video" type="checkbox" name="video" <?php check_it($onlyVideo); ?> onclick="this.form.submit();"> Only list tests which include video</label> &nbsp;&nbsp;
                <label><input id="repeat" type="checkbox" name="repeat" <?php check_it($repeat); ?> onclick="this.form.submit();"> Show repeat view</label>
                <label><input id="nolimit" type="checkbox" name="nolimit" <?php check_it($nolimit); ?> onclick="this.form.submit();"> Do not limit the number of results (warning: WILL be slow)</label>

            </form>
        </div>
        <div class="box">
            <form name="compare" method="get" action="/video/compare.php">
                <input id="CompareBtn" type="submit" value="Compare">
                <table class="history pretty">
                    <thead>
                        <tr>
                            <th>Select to Compare</th>
                            <th>Date/Time</th>
                            <th>From</th>
                            <?php
                            if ($includeip) {
                                echo '<th>Requested By</th>';
                            }
                            if ($admin) {
                                echo '<th>User</th>';
                                echo '<th>Page Loads</th>';
                            }
                            ?>
                            <th>Label</th>
                            <th>URL</th>
                        </tr>
                    </thead>
                <?php
}  // if( $csv )
            // loop through the number of days we are supposed to display
            $rowCount = 0;
            $done = false;
            $totalCount = 0;
            $targetDate = new DateTime($from, new DateTimeZone('GMT'));
for ($offset = 0; $offset <= $days && !$done; $offset++) {
    // figure out the name of the log file
    $fileName = realpath('./logs/' . $targetDate->format("Ymd") . '.log');
    if ($fileName !== false) {
        // load the log file into an array of lines
        if (isset($lines)) {
            unset($lines);
        }
        if ($supportsGrep) {
            $ok = false;
            $patterns = array();
            if (isset($filterstr) && strlen($filterstr)) {
                $patterns[] = $filterstr;
            } elseif (!$all) {
                if (isset($user)) {
                    $patterns[] = "\t$user\t";
                }
                if (isset($owner) && strlen($owner)) {
                    $patterns[] = "\t$owner\t";
                }
            }
            if (count($patterns)) {
                $command = "grep -a -i -F";
                foreach ($patterns as $pattern) {
                    $pattern = str_replace('"', '\\"', $pattern);
                    $command .= " -e " . escapeshellarg($pattern);
                }
                $command .= " '$fileName'";
                exec($command, $lines, $result_code);
                if ($result_code === 0 && is_array($lines) && count($lines)) {
                    $ok = true;
                }
            } else {
                $lines = file($fileName);
                $ok = true;
            }
        } else {
            $ok = true;
            $file = file_get_contents($fileName);
            if ($filterstr) {
                $ok = false;
                if (stristr($file, $filterstr)) {
                    $ok = true;
                }
            }
            $lines = explode("\n", $file);
            unset($file);
        }
        if (count($lines) && $ok) {
            // walk through them backwards
            $records = array_reverse($lines);
            unset($lines);
            foreach ($records as $line) {
                $ok = true;
                if ($filterstr && stristr($line, $filterstr) === false) {
                    $ok = false;
                }

                if ($ok) {
                    // tokenize the line
                    $line_data = tokenizeLogLine($line);

                    $date       = @$line_data['date'];
                    $ip         = @$line_data['ip'];
                    $guid       = @$line_data['guid'];
                    $url        = htmlentities(@$line_data['url']);
                    $location   = @$line_data['location'];
                    $private    = @$line_data['private'];
                    $testUID    = @$line_data['testUID'];
                    $testUser   = @$line_data['testUser'];
                    $video      = @$line_data['video'];
                    $label      = isset($line_data['label']) ? htmlentities($line_data['label']) : '';
                    $o          = isset($line_data['o']) ? $line_data['o'] : null;
                    $key        = isset($line_data['key']) ? $line_data['key'] : null;
                    $count      = @$line_data['count'];
                    $test_priority   = @$line_data['priority'];
                    $email      = @$line_data['email'];

                    if (!$location) {
                        $location = '';
                    }
                    if (isset($date) && isset($location) && isset($url) && isset($guid)) {
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
                            } elseif (
                                (isset($uid) && $uid == $testUID) ||
                                (isset($user) && strlen($user) && !strcasecmp($user, $testUser))
                            ) {
                                $ok = true;
                            } elseif (isset($owner) && strlen($owner) && $owner == $o) {
                                $ok = true;
                            }
                        }

                        if ($onlyVideo and !$video) {
                            $ok = false;
                        }

                        if ($ok && isset($priority) && $priority != $test_priority) {
                            $ok = false;
                        }

                        if ($ok && !$all) {
                            $ok = false;
                            if (
                                (isset($uid) && $uid == $testUID) ||
                                (isset($user) && strlen($user) && !strcasecmp($user, $testUser))
                            ) {
                                $ok = true;
                            } elseif (isset($owner) && strlen($owner) && $owner == $o) {
                                $ok = true;
                            }
                        }

                        if ($ok) {
                            // See if we have to override the label
                            $new_label = getLabel($guid, $user);
                            if (!empty($new_label)) {
                                $label = htmlentities($new_label);
                            }

                            $rowCount++;
                            $totalCount++;
                            $newDate = strftime('%x %X', $date + ($tz_offset * 60));

                            if ($csv) {
                                // only track local tests
                                if (strncasecmp($guid, 'http:', 5) && strncasecmp($guid, 'https:', 6)) {
                                    echo '"' . $newDate . '","' . $location . '","' . $guid . '","' . str_replace('"', '""', $url) . '","' . $label . '"' . "\r\n";
                                    // flush every 30 rows of data
                                    if ($rowCount % 30 == 0) {
                                        flush();
                                        ob_flush();
                                    }
                                }
                            } else {
                                echo '<tr>';
                                echo '<th>';
                                if (isset($guid) && $video && !($url == "Bulk Test" || $url == "Multiple Locations test")) {
                                    echo "<input type=\"checkbox\" name=\"t[]\" value=\"$guid\" title=\"First View\">";
                                    if ($repeat) {
                                        echo "<input type=\"checkbox\" name=\"t[]\" value=\"$guid-c:1\" title=\"Repeat View\">";
                                    }
                                }
                                echo '</th>';
                                echo '<td class="date">';
                                if ($private) {
                                    echo '<b>';
                                }
                                echo $newDate;
                                if ($private) {
                                    echo '</b>';
                                }
                                echo '</td>';
                                echo '<td class="location">' . $location;
                                if ($video) {
                                    echo ' (video)';
                                }
                                echo '</td>';
                                if ($includeip) {
                                    echo '<td class="ip">' . $ip . '</td>';
                                }

                                if ($admin) {
                                    if (isset($testUID)) {
                                        echo '<td class="uid">' . "$testUser ($testUID)" . '</td>';
                                    } elseif (isset($email)) {
                                        echo '<td class="uid">' . htmlspecialchars($email) . '</td>';
                                    } elseif (isset($key)) {
                                        echo '<td class="uid">' . htmlspecialchars($key) . '</td>';
                                    } else {
                                        echo '<td class="uid"></td>';
                                    }
                                    echo "<td class=\"count\">$count</td>";
                                }
                                $link = "/results.php?test=$guid";
                                if (FRIENDLY_URLS) {
                                    $link = "/result/$guid/";
                                }
                                if (!strncasecmp($guid, 'http:', 5) || !strncasecmp($guid, 'https:', 6)) {
                                    $link = $guid;
                                }

                                $labelTxt = $label;
                                if (mb_strlen($labelTxt) > 30) {
                                    $labelTxt = mb_substr($labelTxt, 0, 27) . '...';
                                }

                                echo "<td title=\"$label\" class=\"label\">";
                                echo "<a href=\"$link\" id=\"label_$guid\">$labelTxt</a>&nbsp;";

                                // Only allow people to update labels if they are logged in
                                if ($user && class_exists("SQLite3")) {
                                    echo '<a href="#" class="editLabel" data-test-guid="' . $guid . '" data-current-label="' . $label . '">(Edit)</a>';
                                }

                                echo "</td>";

                                echo '<td class="url"><a title="' . $url . '" href="' . $link . '">' . fittext($url, 80) . '</a></td></tr>';

                                // split the tables every 30 rows so the browser doesn't wait for ALL the results
                                if ($rowCount % 30 == 0) {
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
if (!$csv) {
    ?>
                </table>
            </form>
        </div>
    <?php include('footer.inc'); ?>
    </body>

    </html>
    <?php
} // if( !$csv )
