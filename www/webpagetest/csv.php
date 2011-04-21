<?php
include 'common.inc';

// make sure the test has finished, otherwise return a 404
if( isset($test['test']) && isset($test['test']['completeTime']) )
{
    header ("Content-type: text/csv");
    $fileType = 'IEWPG.txt';
    $header = '"Date","Time","Event Name","URL","Load Time (ms)","Time to First Byte (ms)","unused","Bytes Out","Bytes In","DNS Lookups","Connections","Requests","OK Responses","Redirects","Not Modified","Not Found","Other Responses","Error Code","Time to Start Render (ms)","Segments Transmitted","Segments Retransmitted","Packet Loss (out)","Activity Time(ms)","Descriptor","Lab ID","Dialer ID","Connection Type","Cached","Event URL","Pagetest Build","Measurement Type","Experimental","Doc Complete Time (ms)","Event GUID","Time to DOM Element (ms)","Includes Object Data","Cache Score","Static CDN Score","One CDN Score","GZIP Score","Cookie Score","Keep-Alive Score","DOCTYPE Score","Minify Score","Combine Score","Bytes Out (Doc)","Bytes In (Doc)","DNS Lookups (Doc)","Connections (Doc)","Requests (Doc)","OK Responses (Doc)","Redirects (Doc)","Not Modified (Doc)","Not Found (Doc)","Other Responses (Doc)","Compression Score","Host","IP Address","ETag Score","Flagged Requests","Flagged Connections","Max Simultaneous Flagged Connections","Time to Base Page Complete (ms)","Base Page Result","Gzip Total Bytes","Gzip Savings","Minify Total Bytes","Minify Savings","Image Total Bytes","Image Savings","Base Page Redirects","Optimization Checked","AFT (ms)","DOM Elements"';
    if( $_GET['requests'] )
    {
        $fileType = 'IEWTR.txt';
        $header = '"Date","Time","Event Name","IP Address","Action","Host","URL","Response Code","Time to Load (ms)","Time to First Byte (ms)","Start Time (ms)","Bytes Out","Bytes In","Object Size","Cookie Size (out)","Cookie Count(out)","Expires","Cache Control","Content Type","Content Encoding","Transaction Type","Socket ID","Document ID","End Time (ms)","Descriptor","Lab ID","Dialer ID","Connection Type","Cached","Event URL","Pagetest Build","Measurement Type","Experimental","Event GUID","Sequence Number","Cache Score","Static CDN Score","GZIP Score","Cookie Score","Keep-Alive Score","DOCTYPE Score","Minify Score","Combine Score","Compression Score","ETag Score","Flagged","Secure","DNS Time","Connect Time","SSL Time","Gzip Total Bytes","Gzip Savings","Minify Total Bytes","Minify Savings","Image Total Bytes","Image Savings","Cache Time (sec)","Real Start Time (ms)","Full Time to Load (ms)","Optimization Checked","CDN Provider","DNS Start","DNS End","Connect Start","Connect End"';
    }
    
    echo $header;
    echo "\r\n";

    // loop through all  of the results files (one per run) - both cached and uncached
    for( $i = 1; $i <= $test['test']['runs']; $i++ )
    {
        // build up the file name
        $fileName = "$testPath/{$i}_$fileType";
        csvFile($fileName);
        $fileName = "$testPath/{$i}_Cached_$fileType";
        csvFile($fileName);
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
function csvFile($fileName)
{
    $lines = gz_file($fileName);
    if( $lines)
    {
        // loop through each line in the file
        foreach($lines as $linenum => $line) 
        {
            if( $linenum > 0 || strncasecmp($line,'Date', 4) )
            {
                $line = trim($line, "\r\n");
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
