<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
if (!$privateInstall && !$admin) {
    header("HTTP/1.1 403 Unauthorized");
    exit;
}
set_time_limit(0);
$admin = true;
// parse the logs for the counts
$days = $_REQUEST['days'];
if (!$days || $days > 1000) {
    $days = 7;
}

$title = 'WebPageTest - Usage';
$json = false;
if (isset($_REQUEST['f']) && $_REQUEST['f'] == 'json') {
    $json = true;
} else {
    include 'admin_header.inc';
}
?>

<?php
if (array_key_exists('k', $_REQUEST) && strlen($_REQUEST['k'])) {
    $key = trim($_REQUEST['k']);
    $keys_file = SETTINGS_PATH . '/keys.ini';
    if (file_exists(SETTINGS_PATH . '/common/keys.ini')) {
        $keys_file = SETTINGS_PATH . '/common/keys.ini';
    }
    if (file_exists(SETTINGS_PATH . '/server/keys.ini')) {
        $keys_file = SETTINGS_PATH . '/server/keys.ini';
    }
    $keys = parse_ini_file($keys_file, true);

    if ($admin && $key == 'all') {
        if (!isset($_REQUEST['days'])) {
            $days = 1;
        }
        $day = gmdate('Ymd');
        if (strlen($req_date)) {
            $day = $req_date;
        }
        $targetDate = new DateTime('now', new DateTimeZone('GMT'));
        $usage = array();
        for ($offset = 0; $offset < $days; $offset++) {
            $keyfile = './dat/keys_' . $targetDate->format("Ymd") . '.dat';
            if (is_file($keyfile)) {
                $day_usage = json_decode(file_get_contents($keyfile), true);
                if (isset($day_usage) && is_array($day_usage)) {
                    foreach ($day_usage as $k => $used) {
                        if (!isset($usage[$k])) {
                            $usage[$k] = 0;
                        }
                        $usage[$k] += $used;
                    }
                }
            }
            $date = $targetDate->format("Y/m/d");
            $targetDate->modify('-1 day');
        }
        $used = array();
        foreach ($keys as $key => &$keyUser) {
            $u = isset($usage[$key]) ? (int)$usage[$key] : 0;
            if ($u) {
                $used[] = array('used' => $u, 'description' => $keyUser['description'], 'contact' => $keyUser['contact'], 'limit' => $keyUser['limit']);
            }
        }
        if (isset($_REQUEST['domains'])) {
            $domains = array();
            foreach ($used as &$entry) {
                $email = $entry['contact'];
                $offset = strpos($email, '@');
                if ($offset > 0) {
                    $domain = substr($email, $offset + 1);
                    if (!isset($domains[$domain])) {
                        $domains[$domain] = 0;
                    }
                    $domains[$domain] += $entry['used'];
                }
            }
                arsort($domains);
                echo "<table class=\"table\"><tr><th>Used</th><th>Contact Domain</th></tr>";
            foreach ($domains as $domain => $count) {
                echo "<tr><td>$count</td><td>$domain</td></tr>";
            }
                echo '</table>';
        } else {
            if (count($used)) {
                usort($used, 'comp');
                echo "<table class=\"table\"><tr><th>Used</th><th>Limit</th><th>Contact</th><th>Description</th></tr>";
                foreach ($used as &$entry) {
                    echo "<tr><td>{$entry['used']}</td><td>{$entry['limit']}</td><td>{$entry['contact']}</td><td>{$entry['description']}</td></tr>";
                }
                echo '</table>';
            }
        }
    } else {
        if (isset($keys[$key])) {
            $out = array();
            $limit = (int)@$keys[$key]['limit'];
            if (!$json) {
                echo "<table class=\"table\"><tr><th>Date</th><th>Used</th><th>Limit</th></tr>";
            }
            $targetDate = new DateTime('now', new DateTimeZone('GMT'));
            for ($offset = 0; $offset <= $days; $offset++) {
                $keyfile = './dat/keys_' . $targetDate->format("Ymd") . '.dat';
                $usage = null;
                $used = 0;
                if (is_file($keyfile)) {
                    $usage = json_decode(file_get_contents($keyfile), true);
                    $used = (int)@$usage[$key];
                }
                $date = $targetDate->format("Y/m/d");
                if ($json) {
                    $out[] = array('date' => $date, 'used' => $used, 'limit' => $limit);
                } else {
                    echo "<tr><td>$date</td><td>$used</td><td>$limit</td></tr>\n";
                }
                $targetDate->modify('-1 day');
            }
            if (!$json) {
                echo '</table>';
            }

            $limit = (int)$keys[$key]['limit'];
            if (isset($usage[$key])) {
                $used = (int)$usage[$key];
            } else {
                $used = 0;
            }
            if ($json) {
                json_response($out);
            }
        }
    }
} elseif ($privateInstall || $admin) {
    $total_api = 0;
    $total_ui = 0;
    echo "<table class=\"table\"><tr><th>Date</th><th>Interactive</th><th>API</th><th>Total</th></tr>" . PHP_EOL;
    $targetDate = new DateTime('now', new DateTimeZone('GMT'));
    for ($offset = 0; $offset <= $days; $offset++) {
        // figure out the name of the log file
        $fileName = './logs/' . $targetDate->format("Ymd") . '.log';
        $file = file($fileName);
        $api = 0;
        $ui = 0;
        foreach ($file as &$line) {
            $parts = tokenizeLogLine($line);
            $count = 1;
            if (isset($parts['count'])) {
                $count = max(1, intval($parts['count']));
            }
            if (array_key_exists('key', $parts) && strlen($parts['key'])) {
                $api += $count;
            } else {
                $ui += $count;
            }
        }
        $count = $api + $ui;
        $date = $targetDate->format("Y/m/d");
        echo "<tr><td>$date</td><td>$ui</td><td>$api</td><td>$count</td></tr>\n";
        $targetDate->modify('-1 day');
        $total_api += $api;
        $total_ui += $ui;
        flush();
        ob_flush();
    }
    $total = $total_api + $total_ui;
    echo "<tr>
                <td><b>Total</b></td>
                <td><b>$total_ui</b></td>
                <td><b>$total_api</b></td>
                <td><b>$total</b></td>
            </tr>\n";

    echo '</table>';
}

function comp($a, $b)
{
    if ($a['used'] == $b['used']) {
        return 0;
    }
    return ($a['used'] > $b['used']) ? -1 : 1;
}

if (!$json) {
    include 'admin_footer.inc';
}

