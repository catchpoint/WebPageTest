<?php
include './settings.inc';

$results = array();

// see if there is an existing test we are working with
if( LoadResults($results) ) {
    // count the number of tests that don't have status yet
    $testCount = 0;
    foreach( $results as &$result )
        if (array_key_exists('id', $result) &&
            strlen($result['id']) &&
            array_key_exists('result', $result) &&
            strlen($result['result']))
            $testCount++;
            
    if( $testCount ) {
        echo "Retrieving HAR files for $testCount tests...\r\n";
        
        if( !is_dir('./har') )
            mkdir('./har');

        $count = 0;
        foreach( $results as &$result ) {
            if (array_key_exists('id', $result) &&
                strlen($result['id']) &&
                array_key_exists('result', $result) &&
                strlen($result['result'])) {
                $count++;
                echo "\rRetrieving HAR for test $count of $testCount...                  ";

                $file = $result['id'] . '-' . BuildFileName($result['url']);
                if( strlen($file) && !is_file("./har/$file.har") )
                {
                    $response = file_get_contents("{$server}export.php?test={$result['id']}&medianRun=fastest&run=median&bodies=1&pretty=1&cached=0");
                    if( strlen($response) )
                        file_put_contents("./har/$file.har", $response);
                }
            }
        }

        // clear the progress text
        echo "\r                                                     \r";
        echo "Done\r\n";
    }
    else
        echo "No HAR files available for download\r\n";
}
else
    echo "No tests found in results.txt\r\n";  

/**
* Create a file name given an url
* 
* @param mixed $results
*/
function BuildFileName($url)
{
    $file = trim($url, "\r\n\t \\/");
    $file = str_ireplace('http://', '', $file);
    $file = str_ireplace(':', '_', $file);
    $file = str_ireplace('/', '_', $file);
    $file = str_ireplace('\\', '_', $file);
    $file = str_ireplace('%', '_', $file);
    
    return $file;
}
