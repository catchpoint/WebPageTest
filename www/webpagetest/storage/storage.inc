<?php

require_once('./lib/pclzip.lib.php');


// The function used to upload the test results to remote storage.
function StoreResults($id)
{
    $settings = parse_ini_file('./storage/settings.ini', true);
    if( $settings )
    {
        $storageProvider = $settings['Storage']['provider'];
        if( 'local' != $storageProvider ) 
        {
            $zfile = $id . '.zip';
            $archive = new PclZip($zfile);
            $testPath = './' . GetTestPath($id);
            $v_list = $archive->create($testPath);
            if( 0 == $v_list )
                return -1;
            $storageProvider = $settings['Storage']['provider'];
            $key = $settings['Storage']['access_key_id'];
            $privateKey = $settings['Storage']['secret_access_key'];
            $host = $settings['Storage']['host'];
            if( 'gs' == $storageProvider )
            {
                require_once('./storage/lib/class.gs.php');
                $storageObj = new GS($key, $privateKey, $host);
            }
            elseif( 's3' == $storageProvider )
            {
                require_once('./storage/lib/class.s3.php');
                $storageObj = new S3($key, $privateKey, $host);
            }
            if( $storageObj )
            {
                // Get the bucket name
                $bucketName = $settings['Storage']['bucket_name'];
                // Upload the test result
                $response = $storageObj->uploadFile($bucketName, $zfile, $zfile);
                if( $response )
                {
                    // Record the archived state in the local copy
                    if( gz_is_file("$testPath/testinfo.json") )
                    {
                        $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                        if( !isset($testInfo['archived']) )
                        {
                            $testInfo['archived'] = $storageProvider;
                            gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
                        }
                    }
                    unlink($zfile);
                }
            }
        }
    }
    return 0;
}


// The function used to download the test results from remote storage to local disk.
function DownloadResults($id)
{
    $settings = parse_ini_file('./storage/settings.ini', true);
    if( $settings )
    {
        $storageProvider = $settings['Storage']['provider'];
        if( 'local' != $storageProvider )
        {
            $key = $settings['Storage']['access_key_id'];
            $privateKey = $settings['Storage']['secret_access_key'];
            $host = $settings['Storage']['host'];
            $bucketName = $settings['Storage']['bucket_name'];
            if( 'gs' == $storageProvider )
            {
                require_once('./storage/lib/class.gs.php');
                $storageObj = new GS($key, $privateKey, $host);
            }
            elseif( 's3' == $storageProvider )
            {
                require_once('./storage/lib/class.s3.php');
                $storageObj = new S3($key, $privateKey, $host);
            }
            if( $storageObj )
            {
                $zfile = $id . '.zip';
                $response = $storageObj->downloadFile($bucketName, $zfile, $zfile);
                if( $response )
                {
                    $archive = new PclZip($zfile);
                    if( $archive->extract() == 0 )
                        return -2;
                    // Record the archived state in the local copy
                    $testPath = './' . GetTestPath($id);
                    if( gz_is_file("$testPath/testinfo.json") )
                    {
                        $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                        if( !isset($testInfo['archived']) )
                        {
                            $testInfo['archived'] = $storageProvider;
                            gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
                        }
                    }         
                    unlink($zfile);
                } 
                else
                    return -1;
            }
        }
    }
    return 0;
}

?>
