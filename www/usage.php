<?php
include 'common.inc';
set_time_limit(0);
header('Content-Encoding: none;');

// parse the logs for the counts
$days = $_REQUEST['days'];
if( !$days || $days > 1000 )
    $days = 7;

$title = 'WebPagetest - Usage';

include 'admin_header.inc';
?>

<?php
    if( array_key_exists('k', $_REQUEST) && strlen($_REQUEST['k']) ) {
        $key = trim($_REQUEST['k']);
        $keys = parse_ini_file('./settings/keys.ini', true);
        if( $admin && $key == 'all' ) {
            $day = gmdate('Ymd');
            if( strlen($req_date) )
                $day = $req_date;
            $keyfile = "./dat/keys_$day.dat";
            $usage = null;
            if( is_file($keyfile) )
              $usage = json_decode(file_get_contents($keyfile), true);
            if( !isset($usage) )
              $usage = array();

            $used = array();
            foreach($keys as $key => &$keyUser)
            {
                $u = (int)$usage[$key];
                if( $u )
                    $used[] = array('used' => $u, 'description' => $keyUser['description'], 'contact' => $keyUser['contact'], 'limit' => $keyUser['limit']);
            }
            if( count($used) )
            {
                usort($used, 'comp');
                echo "<table class=\"table\"><tr><th>Used</th><th>Limit</th><th>Contact</th><th>Description</th></tr>";
                foreach($used as &$entry)
                    echo "<tr><td>{$entry['used']}</td><td>{$entry['limit']}</td><td>{$entry['contact']}</td><td>{$entry['description']}</td></tr>";
                echo '</table>';
            }
        } else {
            if( isset($keys[$key]) ) {
                $limit = (int)@$keys[$key]['limit'];
                echo "<table class=\"table\"><tr><th>Date</th><th>Used</th><th>Limit</th></tr>";
                $targetDate = new DateTime('now', new DateTimeZone('GMT'));
                for($offset = 0; $offset <= $days; $offset++) {
                    $keyfile = './dat/keys_' . $targetDate->format("Ymd") . '.dat';
                    $usage = null;
                    $used = 0;
                    if( is_file($keyfile) ) {
                      $usage = json_decode(file_get_contents($keyfile), true);
                      $used = (int)@$usage[$key];
                    }
                    $date = $targetDate->format("Y/m/d");
                    echo "<tr><td>$date</td><td>$used</td><td>$limit</td></tr>\n";
                    $targetDate->modify('-1 day');
                }
                echo '</table>';

                $limit = (int)$keys[$key]['limit'];
                if( isset($usage[$key]) )
                  $used = (int)$usage[$key];
                else
                  $used = 0;
            }
        }
    } elseif ($privateInstall || $admin) {
        $total_api = 0;
        $total_ui = 0;
        echo "<table class=\"table\"><tr><th>Date</th><th>Interactive</th><th>API</th><th>Total</th></tr>" . PHP_EOL;
        $targetDate = new DateTime('now', new DateTimeZone('GMT'));
        for($offset = 0; $offset <= $days; $offset++)
        {
            // figure out the name of the log file
            $fileName = './logs/' . $targetDate->format("Ymd") . '.log';
            $file = file($fileName);
            $api = 0;
            $ui = 0;
            foreach ($file as &$line) {
              $parts = tokenizeLogLine($line);
              if (array_key_exists('key', $parts) && strlen($parts['key']))
                $api++;
              else
                $ui++;
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

include 'admin_footer.inc';

?>