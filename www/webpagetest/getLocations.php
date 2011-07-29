<?php
include 'common.inc';

// load the locations
$locations = &LoadLocations();

// get the backlog for each location
foreach( $locations as $id => &$location )
{
    $location['PendingTests'] = GetBacklog($location['localDir'], $id);
    
    // strip out any sensitive data
    unset($location['localDir']);
}

// kick out the data
if( $_REQUEST['f'] == 'json' )
{
}
else
{
    header ('Content-type: text/xml');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<?xml-stylesheet type=\"text/xsl\" encoding=\"UTF-8\" href=\"getLocations.xsl\" version=\"1.0\"?>\n";
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
            if( is_array($value) )
            {
                echo "<$key>\n";
                foreach( $value as $k => &$v )
                {
                    if (htmlspecialchars($v)!=$v)
                        echo "<$k><![CDATA[$v]]></$k>\n";
                    else
                        echo "<$k>$v</$k>\n";
                }
                echo "</$key>\n";
            }
            else
            {
                if (htmlspecialchars($value)!=$value)
                    echo "<$key><![CDATA[$value]]></$key>\n";
                else
                    echo "<$key>$value</$key>\n";
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
    
    if( isset($loc['locations']['default']) )
        $default = $loc['locations']['default'];
    else
        $default = $loc['locations'][1];
        
    $i = 1;
    while( isset($loc['locations'][$i]) )
    {
        $group = &$loc[$loc['locations'][$i]];
        if( !$group['hidden'] || $_REQUEST['hidden'] )
        {
            $label = $group['label'];
            
            if( isset($group['default']) )
                $def = $group['default'];
            else
                $def = $group[1];
                
            $j = 1;
            while( isset($group[$j]) )
            {
                $locations[$group[$j]] = array( 'Label' => $label, 
                                                'Browser' => $loc[$group[$j]]['browser'],
                                                'localDir' => $loc[$group[$j]]['localDir']
                                                );

                if( $default == $loc['locations'][$i] && $def == $group[$j] )
                    $locations[$group[$j]]['default'] = true;
                
                $j++;
            }
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
function GetBacklog($dir, $locationId)
{
    $backlog = array();
    
    $userCount = 0;
    $lowCount = 0;
    $testing = 0;
    $idle = 0;
    for($i = 1; $i <= 9; $i++)
        $backlog["p$i"] = 0;

    if (LoadJobQueue($dir, $queue))
    {
        $userCount = count($queue[0]);
        for( $i = 1; $i <= 9; $i++ )
        {
            $count = count($queue[$i]);
            $backlog["p$i"] = $count;
            $lowCount += $count;
        }
    }

    $testers = GetTesters($locationId);
    foreach($testers['testers'] as &$tester)
    {
        if( $tester['busy'] )
            $testing++;
        else
            $idle++;
    }
    
    $backlog['Total'] = $userCount + $lowCount + $testing;
    $backlog['HighPriority'] = $userCount;
    $backlog['LowPriority'] = $lowCount;
    $backlog['Testing'] = $testing;
    $backlog['Idle'] = $idle;
    
    return $backlog;
}
?>
