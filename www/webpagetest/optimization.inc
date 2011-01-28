<?php

/**
* Re-format the optimization report to make it prettier
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function dumpOptimizationReport($testPath, $run, $cached, $includeHeader = false)
{
    // load the raw results
    $cachedText='';
    if((int)$cached == 1)
        $cachedText='_Cached';
    $fileName = $testPath . '/' . $run . $cachedText . '_optimization.txt';
    $lines = gz_file($fileName);
    if( $lines)
    {
        if( $includeHeader )
            echo '<h3>Statistics:</h3>';
            
        $needsClose = true;
        $display = false;
        echo '<p class="indented1">';

        // loop through each line in the file
        foreach($lines as $linenum => $line) 
        {
            $line = htmlspecialchars(trim($line));

            $tag = null;
            if( !strcmp($line,"Enable browser caching of static assets:") )
                $tag = 'cache_static_content';
            elseif( !strcmp($line,"Use one CDN for all static assets:") || !strcmp($line,"Use a CDN for all static assets:") )
                $tag = 'use_of_cdn';
            elseif( !strcmp($line,"Combine static CSS and JS files:") )
                $tag = 'combine_js_css_files';
            elseif( !strncmp($line,"GZIP encode all appropriate text assets (text responses > 1400 bytes):", 20) )
                $tag = 'compress_text';
            elseif( !strcmp($line,"Compress Images:") )
                $tag = 'compress_images';
            elseif( !strcmp($line,"Use persistent connections (keep alive):") )
                $tag = 'keep_alive_enabled';
            elseif( !strcmp($line,"Proper cookie usage:") )
                $tag = 'cookies';
            elseif( !strcmp($line,"Minify JS:") )
                $tag = 'minify_js';
            elseif( !strcmp($line,"JQuery Selectors not descended from an ID:") )
                $tag = 'jquery_selectors';
            elseif( !strcmp($line,"No ETag headers (ETag headers should generally not be used unless you have an explicit reason to need them):") )
                $tag = 'etags';
            
            if( $tag )
            {
                if( $needsClose )
                    echo '</p>';

                echo "<a  name=\"$tag\"><h3>" . $line . '</h3></a><p class="indented1">' . "\n";
                $needsClose = true;
                $display = true;
            }
            else
            {
                if( !$display && $includeHeader && (strpos($line, 'Page load time:') !== false) )
                    $display = true;
                    
                if( $display )
                {
                    if( strpos($line, "Cache score :") !== false || 
                        strpos($line, "CDN score (static objects) :") !== false || 
                        strpos($line, "Combine score :") !== false || 
                        strpos($line, "GZIP score :") !== false || 
                        strpos($line, "Image Compression score :") !== false || 
                        strpos($line, "Keep-Alive score :") !== false || 
                        strpos($line, "Cookie score :") !== false || 
                        strpos($line, "Minify score :") !== false || 
                        strpos($line, "ETag score :") !== false )
                    {
                        echo '<br><b>' . $line . "</b><br>\n";
                    }
                    elseif( !strncmp($line, 'cookie:', 7) || !strncmp($line, 'Line ', 5) || !strncmp($line, '...', 3)  )
                    {
                        echo '<span class="indented1">' . $line . "</span><br>\n";
                    }
                    else
                    {
                        echo $line . "<br>\n";
                    }
                }
            }
        }
        if( $needsClose )
            echo '</p>';
    }
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
    <?php 
        $rowspan = 3;
        if((int)$settings['optLinks'] !== 1)
            $rowspan = 2;
    ?>
    <table border="1" cellpadding="5px" cellspacing="0" style="width:100%">
        <tr><th class="nowrap" rowspan=<?php echo $rowspan; ?> colspan=1>Cache Static</th>
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
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://optimization.aol.com/standards/performance/#cache">http://optimization.aol.com/standards/performance/#cache</a>
            </td>
        </tr>
        <?php } ?>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=<?php echo $rowspan; ?> colspan=1>Use A CDN</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All static non-html content (css, js and images)</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >Checked to see if it is hosted on a known CDN (CNAME mapped to a known CDN network).  The known CDN's are Akamai, Amazon CloudFront, Coral Cache, Edgecast, Google, Highwinds, Internap, Limelight, Mirror Image, Panther and Yahoo</td>
        </tr>
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://optimization.aol.com/standards/performance/#cdn">http://optimization.aol.com/standards/performance/#cdn</a>
            </td>
        </tr>
        <?php } ?>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=<?php echo $rowspan; ?> colspan=1>Combine CSS/JS</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All css and javascript objects</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >If multiple files of the same type are served then each additional css file beyond 1 will subtract 5 percent and each Javascript file beyond the first wil subtract 10 percent</td>
        </tr>
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://optimization.aol.com/standards/performance/#head">http://optimization.aol.com/standards/performance/#head</a>
            </td>
        </tr>
        <?php } ?>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=<?php echo $rowspan; ?> colspan=1>GZIP Text</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All objects with a mime type of "text/*" or "*javascript*"</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >Transfer-encoding is checked to see if it is gzip.  If it is not then the file is compressed and the percentage of compression 
            is the result (so a page that can save 30% of the size of it's text by compressing would yield a 70% test result)</td>
        </tr>
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://optimization.aol.com/standards/performance/#comp">http://optimization.aol.com/standards/performance/#comp</a>
            </td>
        </tr>
        <?php } ?>

        <tr class="blank"></tr>
        <tr><th rowspan=<?php echo $rowspan; ?> colspan=1>Compress Images</th>
            <td class="nowrap">Applicable Objects</td>
            <td >Any object with a mime type of "image/*"</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >GIF - All pass<br>
            PNG - Must be 8 bit or lower (no 24-bit PNGs will pass)<br>
            JPEG - Within 10% of a photoshop quality 50 will pass, up to 50% larger will warn and anything larger than that will fail.<br>
            The overall score is the percentage of image bytes that can be saved by re-compressing the images.                        
            </td>
        </tr>
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://optimization.aol.com/standards/performance/#design_comp">http://optimization.aol.com/standards/performance/#design_comp</a>
            </td>
        </tr>
        <?php } ?>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=<?php echo $rowspan; ?> colspan=1>Keep-Alive</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All objects that are from a domain that serves more than one object for the page (i.e. if only a single object is served from a given domain it will not be checked)</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >The response header contains a "keep-alive" directive or the same socket was used for more than one object from the given host</td>
        </tr>
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://optimization.aol.com/standards/performance/#keepalive">http://optimization.aol.com/standards/performance/#keepalive</a>
            </td>
        </tr>
        <?php } ?>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=<?php echo $rowspan; ?> colspan=1>Cookies</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All requests</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >Any request for a static object that sends up a cookie will fail.  All other requests that send up cookies will warn.</td>
        </tr>
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://optimization.aol.com/standards/performance/#cookies">http://optimization.aol.com/standards/performance/#cookies</a>
            </td>
        </tr>
        <?php } ?>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=<?php echo $rowspan; ?> colspan=1>Minify JS</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All html, javascript and json responses</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >Javascript will be run through jsmin.  If the original content was gzip encoded, the minified version will also be gzipped for comparison.  If > 5KB or 10% is saved then it will fail.  If > 1KB is saved, it will warn, otherwise it will pass.</td>
        </tr>
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://optimization.aol.com/standards/performance/#dl_time">http://optimization.aol.com/standards/performance/#dl_time</a>
            </td>
        </tr>
        <?php } ?>

        <tr class="blank"></tr>
        <tr><th class="nowrap" rowspan=<?php echo $rowspan; ?> colspan=1>No Etags</th>
            <td class="nowrap">Applicable Objects</td>
            <td >All requests</td>
        </tr>
        <tr>
            <td class="nowrap">What is checked</td>
            <td >If the response headers include an ETag header then the request will fail.</td>
        </tr>
        <?php if((int)$settings['optLinks'] == 1) { ?>
        <tr>
            <td class="nowrap">Optimization information</td>
            <td >
                <a href="http://developer.yahoo.net/blog/archives/2007/07/high_performanc_11.html">http://developer.yahoo.net/blog/archives/2007/07/high_performanc_11.html</a>
            </td>
        </tr>
        <?php } ?>
    </table>
<?php
}
?>
