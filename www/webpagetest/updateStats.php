<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Updating test statistics...</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
    </head>
    <body>
    <?php
    error_reporting(0);
    set_time_limit(0);

    UpdateStats();
    ?>
    </body>
</html>
        
<?php
/*-----------------------------------------------------------------------------
    Loop through all of the results and identify the stats for each unique url
-----------------------------------------------------------------------------*/
function UpdateStats()
{
    $stats = array();
    $locations = array();
    
    $stats['testCount'] = 0;
    $stats['runCount'] = 0;
    
    $dirs = scandir('./results');
    foreach( $dirs as $dir )
    {
        if(is_dir("./results/$dir") && strcmp($dir, ".") && strcmp($dir, "..") )
        {
            AnalyzeResult("./results/$dir", $stats, $locations);
        }
    }
    
    CalculateResults($stats, $locations);
}

/*-----------------------------------------------------------------------------
    Check a single result
-----------------------------------------------------------------------------*/
function AnalyzeResult($dir, &$stats, &$locations)
{
    $test = parse_ini_file("$dir/testinfo.ini",true);
    if( $test['test']['completeTime'] )
    {
        $stats['testCount']++;
        
        // load the page-level results
        $lines = file("$dir/IEWPG.xls", FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if( $lines)
        {
            // loop through each line in the file
            foreach($lines as $linenum => $line) 
            {
                // skip the header line
                if( $linenum > 0)
                {
                    $column = explode("\t", $line);
                    if( $column )
                    {
                        $stats['runCount']++;

                        unset($run);
                        $run = array();

                        // only summarize runs that have all of the data fields we are interested in
                        if( count($column) > 56 )
                        {                        
                            $run['date'] = strtotime($column[0] . ' ' . $column[1]);
                            $run['url'] = $column[3];
                            $run['loadTime'] = (int)$column[4];
                            $run['TTFB'] = (int)$column[5];
                            $run['bytesOut'] = (int)$column[7];
                            $run['bytesIn'] = (int)$column[8];
                            $run['requests'] = (int)$column[11];
                            $run['redirects'] = (int)$column[13];
                            $run['notModified'] = (int)$column[14];
                            $run['error'] = (int)$column[17];
                            $run['startRender'] = (int)$column[18];
                            $run['activityTime'] = (int)$column[22];
                            $run['cached'] = (int)$column[27];
                            $run['measurementType'] = (int)$column[30];
                            $run['docComplete'] = (int)$column[31];
                            $run['scoreCache'] = (int)$column[35];
                            $run['scoreCDN'] = (int)$column[36];
                            $run['scoreGzip'] = (int)$column[38];
                            $run['scoreCookie'] = (int)$column[39];
                            $run['scoreKeepAlive'] = (int)$column[40];
                            $run['scoreMinify'] = (int)$column[41];
                            $run['scoreCombine'] = (int)$column[42];
                            $run['scoreImage'] = (int)$column[53];
                            $run['scoreEtag'] = (int)$column[56];

                            // make sure it was a successful test
                            if( strlen($run['error']) && ($run['error'] == 0 || $run['error'] == 99999) )
                            {
                                // see if the location already exists in the results
                                if( $locations[$test['test']['location']] === null )
                                {
                                    $location = array();
                                    $locations[$test['test']['location']] = $location;
                                }
                                
                                // see if the url already exists for the location
                                $url = strtolower($run['url']);
                                if( $locations[$test['test']['location']][$url] !== null )
                                {
                                    // if the current run is newer, replace the existing one
                                    if( $run['date'] > $locations[$test['test']['location']][$url]['date'] )
                                        $locations[$test['test']['location']][$url] = $run;
                                }
                                else
                                    $locations[$test['test']['location']][$url] = $run;
                            }
                        }
                    }
                }
            }
        }
    }
}

/*-----------------------------------------------------------------------------
    Analyze the results
-----------------------------------------------------------------------------*/
function CalculateResults(&$stats, &$locations)
{
    $uniqueCount = 0;
    foreach($locations as $urls)
    {
        $uniqueCount += count($urls);
    }
    
    echo "Runs: {$stats['runCount']}<br>\n";
    echo "Tests: {$stats['testCount']}<br>\n";
    echo "Unique: $uniqueCount<br>\n";
}
?>
