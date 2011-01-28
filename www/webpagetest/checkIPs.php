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

    $dayCounts[] = $dayCount;
    
    // on to the previous day
    $targetDate->modify('-1 day');
}

// sort the counts descending
arsort($counts);

foreach($counts as $ip => $count)
{
    if( $count > 50 )
    {
        $countStr = "$count (";
        foreach( $dayCounts as $index => &$dayCount )
        {
            $c = 0;
            if( isset($dayCount[$ip]) )
                $c = $dayCount[$ip];
            if( $index )
                $countStr .= ' ';
            $countStr .= $c;
        }
        $countStr .= ')';
        
        if( isset($whitelist[$ip]) )
            echo "<b>$countStr - $ip</b> (whitelisted - {$whitelist[$ip]})<br>\n";
        else
            echo "$countStr - $ip<br>\n";
    }
    else
        break;
}
?>
