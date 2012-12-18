<?php
error_reporting(0);
$days = 0;
if( isset($_GET["days"]) )
    $days = (int)$_GET["days"];

$counts = array();
$dayCounts = array();

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
            if( isset($parts[5]) )
            {
                $url = trim($parts[5]);
                if( strlen($url) ) {
                    $parts = parse_url($url);
                    $host = trim($parts['host']);
                    if (!strlen($host))
                        $host = $url;
                    if( isset($counts[$host]) )
                        $counts[$host]++;
                    else
                        $counts[$host] = 1;

                    if( isset($dayCount[$host]) )
                        $dayCount[$host]++;
                    else
                        $dayCount[$host] = 1;
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

echo '<html><head></head><body><table><tr><th>Total</th>';
foreach( $dayCounts as $index => &$dayCount ) {
    echo "<th>Day $index</th>";
}
echo '<th>URL Host</th></tr>';

foreach($counts as $url => $count) {
    if( $count > 50 ) {
        echo "<tr><td>$count</td>";
        foreach( $dayCounts as $index => &$dayCount ) {
            $c = 0;
            if( isset($dayCount[$url]) )
                $c = $dayCount[$url];
            echo "<td>$c</td>";
        }
        echo "<td>$url</td></tr>\n";
    }
    else
        break;
}
echo "</table></body></html>";
?>
