<?php
chdir('..');
include 'common.inc';
include './cli/ec2-keys.inc.php';
include './ec2/sdk.class.php';
set_time_limit(0);
$minimum = true;

$counts = array();
foreach($regions as $region => &$regionData)
    $counts[$region] = 0;

// we only terminate instances at the top of the hour, but we can add instances at other times
$addOnly = true;
$minute = (int)date('i');
if( $minute < 5 || $minute > 55 )
    $addOnly = false;

echo "Fetching list of running instances...\n";
$ec2 = new AmazonEC2($keyID, $secret);
if( $ec2 )
{
    foreach( $regions as $region => &$amiData )
    {
        foreach( $amiData as $ami => &$regionData )
        {
            $location = $regionData['location'];
            echo "\n$region:\n";
            
            // load the valid testers in this location
            $testers = json_decode(file_get_contents("./tmp/$location.tm"), true);

            // get the list of current running ec2 instances        
            $terminate = array();
            $count = 0;
            $ec2->set_region($region);
            $response = $ec2->describe_instances();
            $activeCount = 0;
            $idleCount = 0;
            $offlineCount = 0;
            if( $response->isOK() )
            {
                foreach( $response->body->reservationSet->item as $item )
                {
                    foreach( $item->instancesSet->item as $instance )
                    {
                        if( $instance->imageId == $ami && $instance->instanceState->code <= 16 )
                        {
                            $id = (string)$instance->instanceId;
                            if( array_key_exists($id, $testers) || $addOnly )
                            {
                                if( $testers[$id]['offline'] )
                                    $offlineCount++;
                                elseif( strlen($testers[$id]['test']) || $addOnly )
                                    $activeCount++;
                                else
                                    $idleCount++;
                            }
                            else
                            {
                                $terminate[] = $id;
                                $unknownCount++;
                            }
                            $count++;
                        }
                    }
                }
            }
            $termCount = count($terminate);
            $counts["$region.$ami"] = $count - $termCount;

            // figure out what the target number of testers for this location is
            // if we have any idle testers them plan to eliminate 50% of them
            // otherwise, increase the number until we kit the expected backlog
            echo "Active: $activeCount\n";
            echo "Idle: $idleCount\n";
            echo "Offline: $offlineCount\n";
            $targetCount = $activeCount;
            if( $idleCount )
                $targetCount = (int)($activeCount + ($idleCount / 2));
            elseif( $targetBacklog && $activeCount )
            {
                // get the current backlog
                GetPendingTests($location, $backlog, $avgTime);
                echo "Backlog: $backlog\n";
                $ratio = $backlog / $activeCount;
                if( $ratio > $targetBacklog )
                    $targetCount = (int)($backlog / $targetBacklog);
            }
            $targetCount = max(min($targetCount,$regionData['max']), $regionData['min']);
            if( $targetCount > $regionData['min'] )
                $minimum = false;
            echo "Target: $targetCount\n";
            
            $needed = $targetCount - $counts["$region.$ami"];
            echo "Needed: $needed\n";
            if( $needed > 0 )
            {
                echo "Adding $needed spot instances in $region...";
                $response = $ec2->request_spot_instances($regionData['price'], array(
                    'InstanceCount' => (int)$needed,
                    'Type' => 'one-time',
                    'LaunchSpecification' => array(
                        'ImageId' => $ami,
                        'InstanceType' => 'm1.small',
                        'UserData' => base64_encode($regionData['userdata'])
                    ),
                ));
                if( $response->isOK() )
                {
                    echo "ok\n";
                    $counts["$region.$ami"] += $needed;
                }
                else
                    echo "failed\n";
            } elseif( $needed < 0 && !$addOnly ) {
                // lock the location while we mark some free instances for decomm
                $count = abs($needed);
                if( $lock = LockLocation($location) )
                {
                    $testers = json_decode(file_get_contents("./tmp/$location.tm"), true);
                    if (count($testers))
                    {
                        foreach($testers as &$tester)
                        {
                            if( $count > 0 && !strlen($tester['test']) && strlen($tester['ec2']) && !$tester['offline'] )
                            {
                                $tester['offline'] = true;
                                $terminate[] = $tester['ec2'];
                                $count--;
                                $counts["$region.$ami"]--;
                            }
                        }
                        file_put_contents("./tmp/$location.tm", json_encode($testers));
                    }
                    UnlockLocation($lock);
                }
            }
            
            // final step, terminate the instances we don't need
            if( !$addOnly )
            {
                $termCount = count($terminate);
                echo "Terminating $termCount out of {$counts[$region]} instances running in $region...";
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
}

echo "\n";
$summary = 'EC2 Counts:';
$countsTxt = "EC2 Instance counts:\n";
foreach( $counts as $region => $count )
{
    $countsTxt .= "  $count : $region\n";
    $summary .= " $count";
}
echo $countsTxt;

// send out a mail message if we are not running at the minimum levels
if( !$addOnly && !$minimum )
    mail('pmeenan@webpagetest.org', $summary, $countsTxt );
?>
