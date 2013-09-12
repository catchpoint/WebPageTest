<?php

/**
* Re-format the optimization report to make it prettier
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function dumpOptimizationReport(&$pageData, &$requests, $id, $run, $cached, &$test)
{
    if( $pageData && $requests )
    {
        ReportTTFB($pageData, $requests, $id, $run, $cached, $test);
        ReportKeepAlive($pageData, $requests);
        ReportTransferCompression($pageData, $requests);
        ReportImageCompression($pageData, $requests);
        ReportProgressiveJpeg($pageData, $requests);
        ReportCache($pageData, $requests);
        ReportCDN($pageData, $requests);
    }
}

/**
* 
* 
* @param mixed $requests
*/
function ReportTTFB(&$pageData, &$requests, $id, $run, $cached, &$test)
{
    require_once('optimization_detail.inc.php');
    $score = gradeTTFB($pageData, $test, $id, $run, $cached, $target);
    if( isset($score) )
    {
        echo "<a  name=\"first_byte_time\"><h3>First Byte Time (back-end processing): $score/100</h3></a><p class=\"indented1\">\n";
        echo "<b>{$pageData['TTFB']} ms</b> First Byte Time<br>\n";
        echo "<b>$target ms</b> Target First Byte Time<br>\n";
    }
    else
        echo "<a  name=\"first_byte_time\"><h3>First Byte Time (back-end processing): N/A</h3></a><p class=\"indented1\">\n";
    echo "</p><br>\n";
}

/**
* 
* 
* @param mixed $requests
*/
function ReportKeepAlive(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    if( isset($pageData['score_keep-alive']) && $pageData['score_keep-alive'] >= 0 )
    {
        $score = "{$pageData['score_keep-alive']}/100";
        
        foreach( $requests as $index => &$request )
        {
            if( isset($request['score_keep-alive']) && $request['score_keep-alive'] >= 0 && $request['score_keep-alive'] < 100 )
            {
                $key = $request['host'] . ' ' . $index;
                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $value = 'FAILED - ' . $proto . $request['host'] . $request['url'];
                $report[$key] = $value;
            }
        }
        
        ksort($report);
    }
        
    echo "<a  name=\"keep_alive_enabled\"><h3>Use persistent connections (keep alive): $score</h3></a><p class=\"indented1\">\n";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    echo "</p><br>\n";
}

/**
* 
* 
* @param mixed $requests
*/
function ReportTransferCompression(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    if( isset($pageData['score_gzip']) && $pageData['score_gzip'] >= 0 )
    {
        $original = number_format($pageData['gzip_total'] / 1024.0, 1);
        $save = number_format($pageData['gzip_savings'] / 1024.0, 1);
        $target = number_format(($pageData['gzip_total'] - $pageData['gzip_savings']) / 1024.0, 1);

        $summary = "$original KB total in compressible text, target size = $target KB - potential savings = <b>$save KB</b>";
        $score = "{$pageData['score_gzip']}/100";
        
        foreach( $requests as $index => &$request )
        {
            if( isset($request['score_gzip']) && $request['score_gzip'] >= 0 && $request['score_gzip'] < 100 )
            {
                $key = $request['gzip_save'] . ' ' . $request['host'] . ' ' . $index;
                $original = number_format($request['gzip_total'] / 1024.0, 1);
                $save = number_format($request['gzip_save'] / 1024.0, 1);
                $target = number_format(($request['gzip_total'] - $request['gzip_save']) / 1024.0, 1);
                
                if( $request['score_gzip'] < 50 )
                    $value = 'FAILED - ';
                else
                    $value = 'WARNING - ';

                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $value .=  "($original KB, compressed = $target KB - savings of <b>$save KB</b>) - " . $proto . $request['host'] . $request['url'];

                $report[$key] = $value;
            }
        }
        
        krsort($report, SORT_NUMERIC);
    }
        
    echo "<a  name=\"compress_text\"><h3>Use gzip compression for transferring compressable responses: $score</h3></a>\n";
    if( isset($summary) )
        echo "<p>$summary</p>\n";
    echo "<p class=\"indented1\">";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    echo "</p><br>\n";
}

/**
* 
* 
* @param mixed $requests
*/
function ReportImageCompression(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    if( isset($pageData['score_compress']) && $pageData['score_compress'] >= 0 )
    {
        $original = number_format($pageData['image_total'] / 1024.0, 1);
        $save = number_format($pageData['image_savings'] / 1024.0, 1);
        $target = number_format(($pageData['image_total'] - $pageData['image_savings']) / 1024.0, 1);

        $summary = "$original KB total in images, target size = $target KB - potential savings = <b>$save KB</b>";
        $score = "{$pageData['score_compress']}/100";
        
        foreach( $requests as $index => &$request )
        {
            if( isset($request['score_compress']) && $request['score_compress'] >= 0 && $request['score_compress'] < 100 )
            {
                $key = $request['image_save'] . ' ' . $request['host'] . ' ' . $index;
                $original = number_format($request['image_total'] / 1024.0, 1);
                $save = number_format($request['image_save'] / 1024.0, 1);
                $target = number_format(($request['image_total'] - $request['image_save']) / 1024.0, 1);
                
                if( $request['score_compress'] < 50 )
                    $value = 'FAILED - ';
                else
                    $value = 'WARNING - ';

                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $value .=  "($original KB, compressed = $target KB - savings of <b>$save KB</b>) - " . $proto . $request['host'] . $request['url'];

                $report[$key] = $value;
            }
        }
        
        krsort($report, SORT_NUMERIC);
    }
        
    echo "<a  name=\"compress_images\"><h3>Compress Images: $score</h3></a>\n";
    if( isset($summary) )
        echo "<p>$summary</p>\n";
    echo "<p class=\"indented1\">";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    echo "</p><br>\n";
}

function ReportProgressiveJpeg(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    if( isset($pageData['score_progressive_jpeg']) && $pageData['score_progressive_jpeg'] >= 0 )
    {
        $score = "{$pageData['score_progressive_jpeg']}/100";
        $candidateBytes = 0;
        $progressiveBytes = 0;
        
        foreach( $requests as $index => &$request )
        {
            if (array_key_exists('score_progressive_jpeg', $request) && $request['score_progressive_jpeg'] >= 0) {
              if ($request['score_progressive_jpeg'] < 100 ) {
                $key = $request['image_total'] . ' ' . $request['host'] . ' ' . $index;
                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $kb = number_format($request['image_total'] / 1024.0, 1);
                if ($request['score_progressive_jpeg'] > 0 )
                  $report[$key] = "Info ($kb KB) - " . $proto . $request['host'] . $request['url'];
                else {
                  $candidateBytes += $request['image_total'];
                  $report[$key] = "FAILED ($kb KB) - " . $proto . $request['host'] . $request['url'];
                }
              } else {
                $candidateBytes += $request['image_total'];
                $progressiveBytes += $request['image_total'];
              }
            }
        }

        if ($candidateBytes > 0) {
          $pct = number_format($progressiveBytes * 100.0 / $candidateBytes, 0);
          $candidateBytes = number_format($candidateBytes / 1024.0, 1);
          $progressiveBytes = number_format($progressiveBytes / 1024.0, 1);
          $summary = "$progressiveBytes KB of a possible $candidateBytes KB ($pct%) were from progressive JPEG images";
        }
        
        krsort($report, SORT_NUMERIC);
    }
        
    echo "<a  name=\"progressive_jpeg\"><h3>Use Progressive JPEGs: $score</h3></a>\n";
    if( isset($summary) )
        echo "<p>$summary</p>\n";
    echo "<p class=\"indented1\">";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    echo "</p><br>\n";
}

/**
* 
* 
* @param mixed $requests
*/
function ReportCache(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    if( isset($pageData['score_cache']) && $pageData['score_cache'] >= 0 )
    {
        $score = "{$pageData['score_cache']}/100";
        
        foreach( $requests as $index => &$request )
        {
            if( isset($request['score_cache']) && $request['score_cache'] >= 0 && $request['score_cache'] < 100 )
            {
                $key = $request['cache_time'] . ' ' . $request['host'] . ' ' . $index;
                
                if( $request['score_cache'] < 50 )
                    $value = 'FAILED - ';
                else
                    $value = 'WARNING - ';
                    
                $time = 'No max-age or expires';
                if( $request['cache_time'] > 0 )
                {
                    if( $request['cache_time'] > 86400 )
                        $time = number_format($request['cache_time'] / 86400.0, 1) . ' days';
                    elseif( $request['cache_time'] > 3600 )
                        $time = number_format($request['cache_time'] / 3600.0, 1) . ' hours';
                    elseif( $request['cache_time'] > 60 )
                        $time = number_format($request['cache_time'] / 60.0, 1) . ' minutes';
                    else
                        $time = $request['cache_time'] . ' seconds';
                }

                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $value .=  "(<b>$time</b>) - " . $proto . $request['host'] . $request['url'];

                $report[$key] = $value;
            }
        }
        
        ksort($report, SORT_NUMERIC);
    }
        
    echo "<a  name=\"cache_static_content\"><h3>Leverage browser caching of static assets: $score</h3></a>\n";
    echo "<p class=\"indented1\">";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    echo "</p><br>\n";
}

/**
* 
* 
* @param mixed $requests
*/
function ReportCombine(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    if( isset($pageData['score_combine']) && $pageData['score_combine'] >= 0 )
    {
        $score = "{$pageData['score_combine']}/100";
        
        foreach( $requests as $index => &$request )
        {
            if( isset($request['score_combine']) && $request['score_combine'] >= 0 && $request['score_combine'] < 100 )
            {
                $key = $request['contentType'] . ' ' . $request['host'] . ' ' . $index;
                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $value = 'FAILED - ' . $proto . $request['host'] . $request['url'];
                $report[$key] = $value;
            }
        }
        
        ksort($report);
    }
        
    echo "<a  name=\"combine_js_css_files\"><h3>Combine static CSS and JS files: $score</h3></a><p class=\"indented1\">\n";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    echo "</p><br>\n";
}

/**
* 
* 
* @param mixed $requests
*/
function ReportCDN(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    $cdns = array();
    if( isset($pageData['score_cdn']) && $pageData['score_cdn'] >= 0 )
    {
        $score = "{$pageData['score_cdn']}/100";
        
        foreach( $requests as $index => &$request )
        {
            if( isset($request['score_cdn']) && $request['score_cdn'] >= 0 && $request['score_cdn'] < 100 )
            {
                $key = $request['host'] . ' ' . $index;
                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $value = 'FAILED - ' . $proto . $request['host'] . $request['url'];
                $report[$key] = $value;
            }
            elseif( isset($request['cdn_provider']) )
            {
                $cdns[$request['host']] = $request['cdn_provider'];
            }
        }
        
        ksort($report);
    }
        
    echo "<a  name=\"use_of_cdn\"><h3>Use a CDN for all static assets: $score</h3></a><p class=\"indented1\">\n";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    if( count($cdns) )
    {
        echo "<br>CDN's Used:<br>";
        foreach( $cdns as $host => $provider )
            echo "$host : $provider<br>";
    }
    echo "</p><br>\n";
}

/**
* 
* 
* @param mixed $requests
*/
function ReportMinify(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    if( isset($pageData['score_minify']) && $pageData['score_minify'] >= 0 )
    {
        $original = number_format($pageData['minify_total'] / 1024.0, 1);
        $save = number_format($pageData['minify_savings'] / 1024.0, 1);
        $target = number_format(($pageData['minify_total'] - $pageData['minify_savings']) / 1024.0, 1);

        $summary = "$original KB total in minifiable text, target size = $target KB - potential savings = <b>$save KB</b>";
        $score = "{$pageData['score_minify']}/100";
        
        foreach( $requests as $index => &$request )
        {
            if( isset($request['score_minify']) && $request['score_minify'] >= 0 && $request['score_minify'] < 100 )
            {
                $key = $request['minify_save'] . ' ' . $request['host'] . ' ' . $index;
                $original = number_format($request['minify_total'] / 1024.0, 1);
                $save = number_format($request['minify_save'] / 1024.0, 1);
                $target = number_format(($request['minify_total'] - $request['minify_save']) / 1024.0, 1);
                
                if( $request['score_minify'] < 50 )
                    $value = 'FAILED - ';
                else
                    $value = 'WARNING - ';

                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $value .=  "($original KB, minified = $target KB - savings of <b>$save KB</b>) - " . $proto . $request['host'] . $request['url'];

                $report[$key] = $value;
            }
        }
        
        krsort($report, SORT_NUMERIC);
    }
        
    echo "<a  name=\"minify_js\"><h3>Minify JS: $score</h3></a>\n";
    if( isset($summary) )
        echo "<p>$summary</p>\n";
    echo "<p class=\"indented1\">";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    echo "</p><br>\n";
}

/**
* 
* 
* @param mixed $requests
*/
function ReportCookies(&$pageData, &$requests)
{
    $score = 'N/A';
    $report = array();
    if( isset($pageData['score_cookies']) && $pageData['score_cookies'] >= 0 )
    {
        $score = "{$pageData['score_cookies']}/100";
        
        foreach( $requests as $index => &$request )
        {
            if( isset($request['score_cookies']) && $request['score_cookies'] >= 0 && $request['score_cookies'] < 100 )
            {
                $key = $request['host'] . ' ' . $index;
                $proto = 'http://';
                if( $request['is_secure'] )
                    $proto = 'https://';
                $value = 'FAILED - ' . $proto . $request['host'] . $request['url'];
                $report[$key] = $value;
            }
        }
        
        ksort($report);
    }
        
    echo "<a  name=\"cookies\"><h3>Proper cookie usage: $score</h3></a><p class=\"indented1\">\n";
    foreach( $report as $entry )
        echo "$entry<br>\n";
    echo "</p><br>\n";
}

/**
* Display a glossary for the optimization results
* 
* @param mixed $settings
*/
function dumpOptimizationGlossary(&$settings)
{
?>
    <hr>
    <h2>Glossary:</h2>
    <p></p>
    <table border="1" cellpadding="5px" cellspacing="0" style="width:100%">

        <tr><th class="nowrap" rowspan=2 colspan=1>First Byte Time</th>
            <td class="nowrap">Applicable Objects</td>
            <td >Time to First Byte for the page (back-end processing + redirects)</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >The target time is the time needed for the DNS, socket and SSL negotiations + 100ms.  A single letter grade will be deducted for every 100ms beyond the target.</td>
        </tr>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=2 colspan=1>Keep-Alive</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All objects that are from a domain that serves more than one object for the page (i.e. if only a single object is served from a given domain it will not be checked)</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >The response header contains a "keep-alive" directive or the same socket was used for more than one object from the given host</td>
        </tr>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=2 colspan=1>GZIP Text</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All objects with a mime type of "text/*" or "*javascript*"</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >Transfer-encoding is checked to see if it is gzip.  If it is not then the file is compressed and the percentage of compression 
            is the result (so a page that can save 30% of the size of it's text by compressing would yield a 70% test result)</td>
        </tr>

        <tr class="blank"></tr>
        <tr><th rowspan=2 colspan=1>Compress Images</th>
            <td class="nowrap">Applicable Objects</td>
            <td >JPEG Images</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >Within 10% of a photoshop quality 50 will pass, up to 50% larger will warn and anything larger than that will fail.<br>
            The overall score is the percentage of image bytes that can be saved by re-compressing the images.                        
            </td>
        </tr>

        <tr class="blank"></tr>
        <tr><th rowspan=2 colspan=1>Use Progressive JPEGs</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All JPEG Images</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >Each JPEG image is checked and the resulting score is the percentage of JPEG bytes that were served as progressive images relative to the total JPEG bytes.</td>
        </tr>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=2 colspan=1>Cache Static</th>
            <td class="nowrap">Applicable Objects</td>
            <td >Any non-html object with a mime type of "text/*", "*javascript*" or "image/*" that does not
                explicitly have an Expires header of 0 or -1, a cache-control header of "private",
                "no-store" or "no-cache" or a pragma header of "no-cache"</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >
                An "Expires" header is present (and is not 0 or -1) or a 
                "cache-control: max-age" directive is present and set for an 
                hour or greater.  If the expiration is set for less than 30 
                days you will get a warning (only applies to max-age currently).
            </td>
        </tr>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=2 colspan=1>Use A CDN</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All static non-html content (css, js and images)</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >Checked to see if it is hosted on a known CDN (CNAME mapped to a known CDN network).  80% of the static resources need to be served from a CDN for the overall page to be considered using a CDN. The current list of known CDN's is <a href="http://webpagetest.googlecode.com/svn/trunk/agent/wpthook/cdn.h">here</a></td>
        </tr>

    </table>
<?php
}
?>
