<?php
header ("Content-type: text/plain");

$ok = true;
$cronkey = trim(file_get_contents('./cron.key'));
if( strlen($cronkey) )
{
    if( $cronkey != $_REQUEST['key'] )
    {
        $ok = false;
        echo "Invalid key";
    }
}

if( $ok )
{
    // load the data set we already have if we are only looking for new entries
    $existing = null;
    if( !$_REQUEST['all'] && is_file('./dat/industry.dat'))
        $existing = json_decode(file_get_contents('./dat/industry.dat'), true);
    
    // load the industry pages that need to be tested
    $ind = parse_ini_file('./industry.ini', true);
    foreach($ind as $industry => &$pages)
    {
        if( strlen($industry) && (!$_REQUEST['ig'] || $_REQUEST['ig'] == $industry) )
        {
            $industryName = $industry;
            echo "\n$industry:\n";
            $industry = urlencode($industry);
            foreach($pages as $page => $url)
            {
                if( !isset($existing[$industryName][$page]) )
                {
                    if( strlen($page) && strlen($url) && (!$_REQUEST['ip'] || $_REQUEST['ip'] == $page) )
                    {
                        echo "    $page - $url\n";
                        $url = urlencode($url);
                        $page = urlencode($page);
                        
                        // build the url to initiate the test
                        $testUrl = "http://{$_SERVER['HTTP_HOST']}/runtest.php?f=xml&priority=9&runs=5&video=1&mv=1&fvonly=1&url=$url&label=$page&ig=$industry&ip=$page";
                        //$testUrl = "http://{$_SERVER['HTTP_HOST']}/runtest.php?f=xml&runs=5&video=1&mv=1&fvonly=1&url=$url&label=$page&ig=$industry&ip=$page";
                        
                        // we don't actually care if it worked or not
                        $result = file_get_contents($testUrl);
                    }
                    else
                        echo "    Skipping $page - $url\n";
                }
                else
                    echo "    Skipping $page - $url\n";
            }
        }
    }
}
?>
