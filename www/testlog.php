<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/common.inc';

use WebPageTest\Exception\ForbiddenException;
use WebPageTest\Util;

// why are you even here
if ($userIsBot || Util::getSetting('disableTestlog')) {
    throw new ForbiddenException();
}

// login status
$is_logged_in = Util::getSetting('cp_auth') && (!is_null($request_context->getClient()) && $request_context->getClient()->isAuthenticated());

// Redirect logged-in saml users to the hosted test history if one is configured
if (!$is_logged_in && (isset($USER_EMAIL) && Util::getSetting('history_url') && !isset($_REQUEST['local']))) {
    header('Location: ' . Util::getSetting('history_url'));
    exit;
}

if ($admin || $privateInstall || $is_logged_in) {
    set_time_limit(0);
} else {
    set_time_limit(60);
}

$csv = isset($_GET['f']) && !strcasecmp($_GET['f'], 'csv');
$priority = (isset($_REQUEST['priority']) && is_numeric($_REQUEST['priority'])) ? intval($_REQUEST['priority']) : null;
$days = (int)($_GET['days'] ?? 7);

$GLOBALS['tab'] = 'Test History';
$GLOBALS['page_description'] = 'History of website performance speed tests run on WebPageTest.';

//
// single user history
//
if (!$csv && ($is_logged_in || (!isset($user) && !isset($_COOKIE['google_email']) && Util::getSetting('localHistory')))) {
    if ($is_logged_in) {
        $test_history = $request_context->getClient()->getTestHistory($days);
    }
    $vars = [
        'is_logged_in' => $is_logged_in,
        'protocol' => $request_context->getUrlProtocol(),
        'host' => Util::getSetting('host'),
        'days' => $days,
        'test_history' => $test_history,
        'priority' => $priority,
        'local' => isset($_REQUEST['local']) && $_REQUEST['local'],
        'body_class' => 'history',
        'page_title' => 'WebPageTest - Test History',

    ];

    echo view('pages.testhistory', $vars);
    exit();
}

//
// parse and display /logs/*.log
// in HTML (Blade) or CSV
//
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

if (!$privateInstall && $all && $days > 7 && !strlen(trim($filterstr))) {
    throw new ForbiddenException();
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

$history = getHistoryLog($from, $days, $supportsGrep, $all, $filterstr, $onlyVideo, $includePrivate, $repeat, $nolimit);

// CSV results
if ($csv) {
    header("Content-type: text/csv");
    echo '"Date/Time","Location","Test ID","URL","Label"' . "\r\n";
    // only track local tests
    foreach ($history as
        [
            'guid' => $guid,
            'newDate' => $newDate,
            'location' => $location,
            'url' => $url,
            'label' => $label,
        ]) {
        if (strncasecmp($guid, 'http:', 5) && strncasecmp($guid, 'https:', 6)) {
            echo '"' . $newDate . '","' . $location . '","' . $guid . '","' . str_replace('"', '""', $url) . '","' . $label . '"' . "\r\n";
        }
    }
    exit();
}

// HTML results
$vars = [
    'history' => $history,
    'is_logged_in' => $is_logged_in,
    'days' => $days,
    'priority' => $priority,
    'local' => !empty($_REQUEST['local']),
    'requestIP' => !empty($_REQUEST['ip']),
    'body_class' => 'history',
    'page_title' => 'WebPageTest - Test History',
    'admin' => $admin,
    'adminish' => ($admin || !Util::getSetting('forcePrivate')) && (isset($uid) || (isset($owner) && strlen($owner))),
    'includeip' => $includeip,
    'filter' => $filter,
    // checkboxes
    'all' => $all,
    'onlyVideo' => $onlyVideo,
    'repeat' => $repeat,
    'nolimit' => $nolimit,
];

echo view('pages.testhistoryadmin', $vars);

/**
 * Retrieves log data from log files in  `/logs/.log`
 *
 * @param string $from The starting date for the log data retrieval, in the format "Ymd."
 * @param int $days The number of days of log data to retrieve.
 * @param bool $supportsGrep Is `grep` supported by the system.
 * @param bool $all Tests from all users
 * @param string $filterstr Filter the log data by matching patterns.
 * @param bool $onlyVideo Only tests with videos
 * @param bool $includePrivate Private tests too
 * @param bool $repeat Tests with repeats views.
 * @param bool $nolimit Ignore the hard limit of 100 tests (slow)
 *
 * @return array An array of log data.
 */
function getHistoryLog($from, $days, $supportsGrep, $all, $filterstr, $onlyVideo, $includePrivate, $repeat, $nolimit)
{
    global $user;
    global $owner;
    global $tz_offset;

    $history = [];
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
                        $url        = @$line_data['url'];
                        $location   = @$line_data['location'];
                        $private    = @$line_data['private'];
                        $testUID    = @$line_data['testUID'];
                        $testUser   = @$line_data['testUser'];
                        $video      = @$line_data['video'];
                        $label      = $line_data['label'] ?? '';
                        $o          = $line_data['o'] ?? null;
                        $key        = $line_data['key'] ?? null;
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
                                $rowCount++;
                                $totalCount++;
                                $newDate = strftime('%x %X', $date + ($tz_offset * 60));

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

                                $history[] = [
                                    'guid' => $guid,
                                    'url' => $url,
                                    'video' => $video,
                                    'repeat' => $repeat,
                                    'private' => $private,
                                    'newDate' => $newDate,
                                    'location' => $location,
                                    'ip' => $ip,
                                    'testUID' => $testUID ?? null,
                                    'testUser' => $testUser ?? null,
                                    'email' => $email ?? null,
                                    'key' => $key ?? null,
                                    'count' => $count,
                                    'label' => $label,
                                    'shortURL' => fittext($url, 80),
                                    'link' => $link,
                                    'labelTxt' => $labelTxt,
                                ];

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
    return $history;
}
