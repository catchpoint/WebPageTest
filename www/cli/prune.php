<?php
if (php_sapi_name() != 'cli')
  exit(1);
chdir('..');
include 'common.inc';
set_time_limit(0);

$count = 0;

/*
*   Remove all tests that match the given search string
*/  
if( count($_SERVER["argv"]) > 2 )
{
    $match = trim($_SERVER["argv"][1]);
    $date = trim($_SERVER["argv"][2]);
    if( strlen($match) && strlen($date) )
    {
        $f = scandir('./logs');
        foreach( $f as $file )
        {
            if (strpos($file, '.log') && (int)$file <= (int)$date)
                CheckLog("./logs/$file", $match);
        }
        echo "\nDone\n\n";
    }
}
else
    echo "usage: php prune.php <match string> <end date - i.e. 20100909>\n";

/**
* Check the given log file for all tests that match
* 
* @param mixed $logFile
* @param mixed $match
*/
function CheckLog($logFile, $match)
{
    global $count;
    echo "\r($count): Checking $logFile";

    $file = file_get_contents($logFile);
    if(stripos($file, $match) !== false)
    {
        $lines = explode("\n", $file);
        $file = '';
        foreach($lines as $line)
        {
            if(stripos($line, $match) !== false)
            {
                $parseLine = str_replace("\t", "\t ", $line);
                $parts = explode("\t", $parseLine);
                $testId = trim($parts[4]);
                $testPath = './' . GetTestPath($testId);
                if( strlen($testPath) )
                {
                    delTree($testPath);
                    usleep(100000); // give the system a chance to breathe
                    $count++;
                    echo "\r($count): Checking $logFile";
                }
            }
            else
                $file .= $line . "\n";
        }
        // rewrite the trimmed file
        file_put_contents($logFile, $file);
    }
    else
        unset($file);
}
?>
