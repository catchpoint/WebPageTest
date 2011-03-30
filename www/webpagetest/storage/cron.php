<?php

chdir('..');
require_once('common.inc');

// Set the max age of a test result since last access to 1 week
$maxAllowedAge = 7 * 24 * 60 * 60;
CronProcess('./results/', $maxAllowedAge);


function CronProcess($path, $maxAllowedAge)
{
    $file = $path . 'testinfo.ini';
    if( is_file($file) )
    {
        if( gz_is_file($path . 'testinfo.json') )
        {
            $testInfo = json_decode(gz_file_get_contents($path . 'testinfo.json'), true);
            if( isset($testInfo['archived']) )
            {        
                $currentTime = time();
                $timestamp = filemtime($file);
                if( $maxAllowedAge < $currentTime - $timestamp )
                {
                    // Remove the expired test results from the
                    echo "$path: expired and deleted.\r\n";
                    delTree($path); 
                }    
            } 
            else
            {
                $info = parse_ini_file($file, true);
                if( isset($info['test']['completeTime']) )
                {
                    // Deal with the pre-existing test results. Upload them into
                    // remote storage.
                    require_once('storage/storage.inc');
                    $id = $info['test']['id'];
                    StoreResults($id);
                    // StoreResults always generates zipped testinfo.json. We
                    // delete the unzipped version if there is here.
                    if( is_file($path . 'testinfo.json') )
                        unlink($path . 'testinfo.json');
                    echo "test $id is uploaded.\r\n";
                }
            }
        }
    }
    else
    {
        $paths = glob($path . '*', GLOB_MARK|GLOB_ONLYDIR|GLOB_NOSORT);
        foreach( $paths as $path ) 
        {
            CronProcess($path, $maxAllowedAge);
        }
    }
}

?>
