<?php

include 'common.inc';

// load the locations
$locations = &LoadLocations();

// get the backlog for each location
foreach( $locations as $id => &$location )
{
    $locations[$id] = GetTesters("./work/times/$id.tm");
}

// kick out the data
if( $_REQUEST['f'] == 'json' )
{
}
else
{
    header ('Content-type: text/xml');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<?xml-stylesheet type=\"text/xsl\" encoding=\"UTF-8\" href=\"getTesters.xsl\" version=\"1.0\"?>\n";
    echo "<response>\n";
    echo "<statusCode>200</statusCode>\n";
    echo "<statusText>Ok</statusText>\n";
    if( strlen($_REQUEST['r']) )
        echo "<requestId>{$_REQUEST['r']}</requestId>\n";
    echo "<data>\n";
    
    foreach( $locations as $name => &$location )
    {
        echo "<location>\n";
        echo "<id>$name</id>\n";
        foreach( $location as $key => &$value )
        {
            if( is_array($value) )
            {
                echo "<testers>\n";
                foreach( $value as $index => &$tester )
                {
                    echo "<tester>\n";
                    $count = $index + 1;
                    echo "<index>$count</index>\n";
                    foreach( $tester as $k => &$v )
                    {
                        if (htmlspecialchars($v)!=$v)
                            echo "<$k><![CDATA[$v]]></$k>\n";
                        else
                            echo "<$k>$v</$k>\n";
                    }
                    echo "</tester>\n";
                }
                echo "</testers>\n";
            }
            else
            {
                if (htmlspecialchars($value)!=$value)
                    echo "<$key><![CDATA[$value]]></$key>\n";
                else
                    echo "<$key>$value</$key>\n";
            }            
        }
        echo "</location>\n";
    }
    
    echo "</data>\n";
    echo "</response>\n";
}

/**
* Load the location information and extract just the end nodes
* 
*/
function LoadLocations()
{
    $locations = array();
    $loc = parse_ini_file('./settings/locations.ini', true);
    BuildLocations($loc);
    
    $i = 1;
    while( isset($loc['locations'][$i]) )
    {
        $group = &$loc[$loc['locations'][$i]];
        $j = 1;
        while( isset($group[$j]) )
        {
            $locations[$group[$j]] = array();

            $j++;
        }
        
        $i++;
    }
    
    return $locations;
}

/**
* Get the backlog for the given directory
* 
* @param mixed $dir
*/
function GetTesters($file)
{
    $location = array();

    if( is_file($file) )
    {
        $now = time();
        $updated = filemtime($file);
        $elapsed = 0;
        if( $now > $updated )
            $elapsed = $now - $updated;
        $location['elapsed'] = (int)($elapsed / 60);
        
        // load information about each tester
        $testers = json_decode(file_get_contents($file), true);
        if( count($testers) )
        {
            ksort($testers);
            $location['testers'] = array();
            foreach( $testers as $index => $tester )
            {
                $entry = array('pc' => $tester['pc'], 'ec2' => $tester['ec2'], 'ip' => $tester['ip']);
                
                // last time it checked in
                if( isset($tester['updated']) )
                {
                    $elapsed = 0;
                    $updated = $tester['updated'];
                    if( $now > $updated )
                        $elapsed = $now - $updated;
                    $entry['elapsed'] = (int)($elapsed / 60);
                }
                
                // last time it got work
                if( isset($tester['last']) )
                {
                    $elapsed = 0;
                    $updated = $tester['last'];
                    if( $now > $updated )
                        $elapsed = $now - $updated;
                    $entry['last'] = (int)($elapsed / 60);
                }
                
                $entry['busy'] = 0;
                if( isset( $tester['test'] ) )
                    $entry['busy'] = 1;

                $location['testers'][] = $entry;
            }
        }
    }
    
    return $location;
}
?>
