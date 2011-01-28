<?php
/*
    We are being launched in the context of the root directory
*/
if( count($argv) > 1 )
{
    $_GET['test'] = trim($argv[1]);
    include 'common.inc';
    set_time_limit(600);  // allow it to run for up to 10 minutes
    
    $runs = $test['test']['runs'];
    if( $settings['aft'] && $settings['host'] && $runs )
    {
        $aft = array();
        
        // run AFT processing on the video for the test (every run)
        for( $i = 1; $i <= $runs; $i++ )
        {
            $aft[$i] = array();
            $aft[$i][0] = CalculateAft($settings['host'], $settings['aft'], "$testPath/video_$i");
            if( !$test['fvonly'] )
                $aft[$i][1] = CalculateAft($settings['host'], $settings['aft'], "$testPath/video_{$i}_cached");
        }
        
        gz_file_put_contents("$testPath/aft.txt", json_encode($aft));
    }
}

/**
* Calculate the above-the-fold time for the given test run
* 
* @param mixed $testPath
*/
function CalculateAft($host, $aftBase, $testPath)
{
    $ret = null;
    $urlBase = $host . substr($testPath, 1);
    
    logMsg("Calculating AFT for $urlBase", './work/aft.txt');
    
    // build up a list of files
    $files = array();
    $dir = scandir($testPath);
    foreach( $dir as $file )
    {
        if( is_file("$testPath/$file") && preg_match('/frame_([0-9]*).jpg/i', $file, $match) )
            $files[] = $match[1];
    }
    
    if( count($files) )
    {
        // build up the AFT request
        $request = "$aftBase?load_path=$urlBase&screenshot_timestamps=";
        foreach( $files as $index => $timestamp )
        {
            if( $index )
                $request .= ',';
            $request .= trim($timestamp);
        }

        logMsg("Requesting $request", './work/aft.txt');
        
        $doc = new DOMDocument();
        if( $doc )
        {
            $result = trim(file_get_contents($request));
            if( strlen($result) )
            {
                $doc->loadXML($result);
                $nodes = $doc->getElementsByTagName('statusCode');
                $code = (int)trim($nodes->item(0)->nodeValue);
                logMsg("Status Code: $code", './work/aft.txt');
                if( $code == 200 )
                {
                    $nodes = $doc->getElementsByTagName('aftStatus');
                    $status = trim($nodes->item(0)->nodeValue);
                    logMsg("AFT Status: $status", './work/aft.txt');
                    if( $status == 'high_confidence' )
                    {
                        $nodes = $doc->getElementsByTagName('aftTime');
                        $time = (int)trim($nodes->item(0)->nodeValue);
                        if( $time )
                            $ret = $time * 100;
                    }
                }
            }
        }

        logMsg("AFT: $ret", './work/aft.txt');
    }
    
    return $ret;
}
?>
