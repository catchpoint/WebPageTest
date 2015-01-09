<?php
set_time_limit(0);
error_reporting(0);
$locations = array('US East (Virginia)', 'US West (California)', 'South America (Brazil)', 'Europe (Ireland)', 'Asia (Singapore)', 'Asia (Tokyo)' );
$counts = array();

// parse the logs for the counts
$days = $_REQUEST['days'];
if( !$days || $days > 365 )
    $days = 7;

$targetDate = new DateTime('now', new DateTimeZone('GMT'));
for($offset = 0; $offset <= $days; $offset++)
{
    // figure out the name of the log file
    $fileName = './logs/' . $targetDate->format("Ymd") . '.log';
    $file = fopen($fileName, 'r');
    if( $file )
    {
        $entry = array('Total' => 0);
        foreach($locations as $location)
            $entry[$location] = 0;
        $entry['Other'] = 0;
        while( ($line = fgets($file)) !== false )
        {
            if( (strpos($line, 'Page Speed Service') !== false ||
                 strpos($line, 'PageSpeed Service') !== false) &&
                strpos($line, 'edb046ff09404e1b90887827e1b37b06') === false )
            {
                $entry['Total']++;
                $found = false;
                foreach($locations as $location)
                {
                    if( strpos($line, $location) !== false )
                    {
                        $entry[$location]++;
                        $found = true;
                        break;
                    }
                }
                if( !$found )
                    $entry['Other']++;
            }
        }
        fclose($file);
        $date = $targetDate->format("Y/m/d");
        $counts[$date] = $entry;
    }
    $targetDate->modify('-1 day');
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - PSS Report</title>
        <style type="text/css">
            table {text-align: center;}
            table td, table th {padding: 0 1em;}
        </style>
    </head>
    <body>
    <table>
<?php
    $total=0;
    echo '<tr><th>Date</th><th>Total</th>';
    foreach($locations as $location)
        echo "<th>$location</th>";
    echo '<th>Other</th></tr>';
    foreach( $counts as $date => $entry )
    {
        $total += $entry['Total'];
        echo "<tr><td>$date</td>";
        foreach( $entry as $location => $count )
            echo "<td>$count</td>";
        echo "</tr>";
    }
    echo '</table><br><br>';
    echo "Total: $total";
?>

    </body>
</html>
