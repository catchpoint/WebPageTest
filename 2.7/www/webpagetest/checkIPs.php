<?php
error_reporting(0);
$days = 0;
if( isset($_GET["days"]) )
    $days = (int)$_GET["days"];

$whitelist = array();
$wl = file('./settings/whitelist.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach( $wl as &$w )
{
    $parts = explode(" ", $w);
    $ip = trim($parts[0]);
    $comment = trim($parts[1]);
    $whitelist[$ip] = $comment;
}

$counts = array();
$dayCounts = array();
$ip_keys = array();

$targetDate = new DateTime($from, new DateTimeZone('GMT'));
for($offset = 0; $offset <= $days; $offset++)
{
    $dayCount = array();
    
    // figure out the name of the log file
    $fileName = './logs/' . $targetDate->format("Ymd") . '.log';
    
    // load the log file into an array of lines
    $lines = file($fileName, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if( $lines)
    {
        foreach($lines as &$line)
        {
            $parseLine = str_replace("\t", "\t ", $line);
            $parts = explode("\t", $parseLine);
            if( isset($parts[1]) )
            {
                $ip = trim($parts[1]);
                if( strlen($ip) ) {
                    $key = trim($parts[13]);
                    if( strlen($key) )
                        $ip_keys[$ip] = $key;
                    if( isset($counts[$ip]) )
                        $counts[$ip]++;
                    else
                        $counts[$ip] = 1;

                    if( isset($dayCount[$ip]) )
                        $dayCount[$ip]++;
                    else
                        $dayCount[$ip] = 1;
                }
            }
        }
    }

    $dayCounts[] = $dayCount;
    
    // on to the previous day
    $targetDate->modify('-1 day');
}

// sort the counts descending
arsort($counts);

// load the API keys
$keys = parse_ini_file('./settings/keys.ini', true);

echo '<html><head></head><body><table><tr><th>Total</th>';
foreach( $dayCounts as $index => &$dayCount ) {
    echo "<th>Day $index</th>";
}
echo '<th>API Key</th><th>Key Limit</th><th>IP Address</th></tr>';

foreach($counts as $ip => $count)
{
    if( $count > 50 )
    {
        echo "<tr><td>$count</td>";
        foreach( $dayCounts as $index => &$dayCount )
        {
            $c = 0;
            if( isset($dayCount[$ip]) )
                $c = $dayCount[$ip];
            echo "<td>$c</td>";
        }

        $owner = '';
        $limit = '';            
        $key = $ip_keys[$ip];
        if( strlen($key) ) {
            $owner = $keys[$key]['contact'];
            $limit = $keys[$key]['limit'];
        }
        
        echo "<td>$owner</td><td>$limit</td><td>$ip</td></tr>\n";
    }
    else
        break;
}
echo "</table></body></html>";
?>
