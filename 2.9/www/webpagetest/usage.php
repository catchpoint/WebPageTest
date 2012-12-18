<?php
include 'common.inc';
set_time_limit(0);

// parse the logs for the counts
$days = $_REQUEST['days'];
if( !$days || $days > 1000 )
    $days = 7;

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Usage</title>
        <style type="text/css">
            table {text-align: left;}
            table td, table th {padding: 0 1em;}
        </style>
    </head>
    <body>
<?php
    if( strlen($req_k) )
    {
        $keys = parse_ini_file('./settings/keys.ini', true);
        if( $admin && $req_k == 'all' )
        {
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
                echo "<table><tr><th>Used</th><th>Limit</th><th>Contact</th><th>Description</th></tr>";
                foreach($used as &$entry)
                    echo "<tr><td>{$entry['used']}</td><td>{$entry['limit']}</td><td>{$entry['contact']}</td><td>{$entry['description']}</td></tr>";
                echo '</table>';
            }
        }
        else
        {
            $key = $req_k;
            if( isset($keys[$key]) )
            {
                $limit = (int)@$keys[$key]['limit'];
                echo "<table><tr><th>Date</th><th>Used</th><th>Limit</th></tr>";
                $targetDate = new DateTime('now', new DateTimeZone('GMT'));
                for($offset = 0; $offset <= $days; $offset++)
                {
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
    }
    else
    {
        $total = 0;
        echo "Date,Total<br>\n";
        $targetDate = new DateTime('now', new DateTimeZone('GMT'));
        for($offset = 0; $offset <= $days; $offset++)
        {
            // figure out the name of the log file
            $fileName = './logs/' . $targetDate->format("Ymd") . '.log';
            $file = file($fileName);
            $count = count($file);
            $date = $targetDate->format("Y/m/d");
            echo "$date,$count<br>\n";
            $targetDate->modify('-1 day');
            $total += $count;
        }
        
        echo "<br><br>Total: $total";
    }

function comp($a, $b)
{
    if ($a['used'] == $b['used']) {
        return 0;
    }
    return ($a['used'] > $b['used']) ? -1 : 1;
}
?>
    </body>
</html>
