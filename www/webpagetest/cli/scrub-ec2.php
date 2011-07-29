<?php
chdir('..');
include 'common.inc';
include './cli/ec2-keys.inc.php';
include './ec2/sdk.class.php';
set_time_limit(0);

$regions = array('us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1' );
$counts = array();
foreach($regions as $region)
    $counts[$region] = 0;

// build a list of the known instances
$instances = array();
foreach($ec2Keys as $keyID => $private)
{
    $instances[$keyID] = array();
    foreach( $regions as $region )
        $instances[$keyID][$region] = array();
}

// load the testers for each known location and populate a list of known instances
$validInstances = array();
foreach( $ec2Locations as $location )
{
    $testers = json_decode(file_get_contents("./tmp/$location.tm"), true);
    foreach( $testers as &$tester )
    {
        if( strlen($tester['ec2']) )
            $validInstances[$tester['ec2']] = true;
    }
}

echo "Fetching list of running instances...\n";

foreach( $ec2Keys as $keyID => $secret )
{
    echo "Fetching instances for $keyID...\n";
    $ec2 = new AmazonEC2($keyID, $secret);
    if( $ec2 )
    {
        foreach( $regions as $region )
        {
            $terminate = array();
            $count = 0;
            $ec2->set_region($region);
            $response = $ec2->describe_instances();
            if( $response->isOK() )
            {
                foreach( $response->body->reservationSet->item as $item )
                {
                    foreach( $item->instancesSet->item as $instance )
                    {
                        if( $instance->instanceState->code <= 16 )
                        {
                            $id = (string)$instance->instanceId;
                            if( !array_key_exists($id, $validInstances) )
                                $terminate[] = $id;
                            $count++;
                        }
                    }
                }
            }
            $termCount = count($terminate);
            $counts[$region] += $count - $termCount;
            echo "Terminating $termCount out of $count instances running in $region...";
            if( $termCount )
            {
                $response = $ec2->terminate_instances($terminate);
                if( $response->isOK() )
                    echo "ok\n";
                else
                    echo "failed\n";
            }
            else
                echo "ok\n";
        }
    }
}

echo "\nEC2 Instance counts:\n";
foreach( $counts as $region => $count )
    echo "  $count : $region\n";

?>
