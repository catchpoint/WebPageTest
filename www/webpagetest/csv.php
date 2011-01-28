<?php
include 'common.inc';

// make sure the test has finished, otherwise return a 404
if( isset($test['test']) && isset($test['test']['completeTime']) )
{
    header ("Content-type: text/csv");
    $fileType = 'IEWPG.txt';
    if( $_GET['requests'] )
        $fileType = 'IEWTR.txt';

    // loop through all  of the results files (one per run) - both cached and uncached
    $includeHeader = true;
    for( $i = 1; $i <= $test['test']['runs']; $i++ )
    {
        // build up the file name
        $fileName = "$testPath/{$i}_$fileType";
        csvFile($fileName, $includeHeader);
        $includeHeader = false;
        $fileName = "$testPath/{$i}_Cached_$fileType";
        csvFile($fileName, $includeHeader);
    }
}
else
{
    header("HTTP/1.0 404 Not Found");
}

/**
* Take a tab-separated file, convert it to csv and spit it out
* 
* @param mixed $fileName
* @param mixed $includeHeader
*/
function csvFile($fileName, $includeHeader)
{
    $lines = gz_file($fileName);
    if( $lines)
    {
        // loop through each line in the file
        foreach($lines as $linenum => $line) 
        {
            if( $linenum > 0 || $includeHeader )
            {
                $line = trim($line);
                if( strlen($line) )
                {
                    $line = str_replace('"', '""', $line);
                    $line = str_replace('"', '""', $line);
                    $line = str_replace("\t", '","', $line);
                    echo '"' . $line . '"' . "\r\n";
                }
            }
        }
    }
}
?>
