<?php
if (php_sapi_name() != 'cli')
  exit(1);
chdir('..');
include 'common.inc';
$count = 0;

/*
*   Compress a given folder (and all folders under it) in the results folder
*/  
if( count($_SERVER["argv"]) > 1 )
{
    $dir = trim($_SERVER["argv"][1]);
    if( strlen($dir) )
    {
        $dir = "./results/$dir";
        $startWith = '';
        
        if( count($_SERVER["argv"]) > 2 )
            $startWith = trim($_SERVER["argv"][2]);
            
        CheckDir($dir, $startWith);
        
        echo "\nDone\n\n";
    }
}
else
    echo "usage: php longtests.php <directory>\n";

/**
* Recursively compress the text files in the given directory and all directories under it
*     
* @param mixed $dir
*/
function CheckDir($dir, $startWith = '')
{
    $started = false;
    if( !strlen($startWith) )
        $started = true;

    // compress the text data files
    $f = scandir($dir);
    foreach( $f as $file )
    {
        if( !$started && $file == $startWith )
            $started = true;
            
        if( $started )
        {
            if( gz_is_file("$dir/$file/testinfo.json") )
            {
                CheckTest("$dir/$file");
            }
            elseif( is_dir("$dir/$file") && $file != '.' && $file != '..' )
            {
                CheckDir("$dir/$file");
            }
        }
    }
}

function CheckTest($dir)
{
    global $count;
    
    echo "\r$count: Checking $dir                      ";
    $testinfo = GetTestInfo($dir);
    if( $testinfo )
    {
        if( $testinfo['started'] && $testinfo['completed'] )
        {
            $elapsed = ($testinfo['completed'] - $testinfo['started']) / 60;
            if( $elapsed > 25 )
            {
                $count++;
                echo "\rLong test detected: {$testinfo['id']} ($elapsed minutes)                                  \n";
                echo "Url: {$testinfo['url']}\n";
                echo "ID: {$testinfo['id']}\n";
                echo "Key: {$testinfo['key']}\n";
                echo "Location: {$testinfo['location']}\n";
                echo "Runs: {$testinfo['runs']}\n";
                if( strlen($testinfo['key']) )
                    echo "API Key: {$testinfo['key']}\n";
                if( strlen($testinfo['script']) )
                    echo "Script:\n{$testinfo['script']}\n";
                echo "\n";
            }
        }
    }
}
?>
