<?php
function EC2_ScaleUp($location, $ec2Config)
{
    $instancesNeeded = 0;
    
    $file = @fopen("./ec2/testers.$location.dat", 'c+');
    if( $file )
    {
        if( flock($file, LOCK_EX) )
        {
            $config = parse_ini_file('./settings/ec2.ini', true);
            if( isset($config[$ec2Config]) )
            {
                // see how many tests are currently pending for the given location
                $locations = parse_ini_file('./settings/locations.ini', true);
                BuildLocations($locations);
                if( strlen($locations[$location]['localDir']) )
                {
                    $files = glob( $locations[$location]['localDir'] . '/*.*', GLOB_NOSORT );
                    $backlog = count($files);
                    $instances = json_decode(stream_get_contents($file), true);
                    if( !$instances )
                        $instances = array();
                    $count = count($instances);
                    
                    if( $backlog > 0 && !$count )
                        $instancesNeeded = 1;
                    else
                    {
                        $ratio = $config[$ec2Config]['ratio'];
                        $max = $config[$ec2Config]['max'];
                        if( $ratio && $count < $max )
                        {
                            $needed = (int)($backlog / $ratio);
                            $needed = min($needed, $max);
                            $needed = max($needed, $count);
                            $instancesNeeded = $needed - $count;
                        }
                    }
                }
            }
            
            if( $instancesNeeded )
            {
                $price = trim($config[$ec2Config]['price']);
                $ami = trim($config[$ec2Config]['ami']);
                $region = trim($config[$ec2Config]['region']);
                $size = 'm1.small';
                if (strlen($config[$ec2Config]['size']))
                    $size = trim($config[$ec2Config]['size']);
                $userData = trim($config[$ec2Config]['user_data']);
                
                if( strlen($price) && strlen($ami) && strlen($region) && strlen($size) && strlen($userData) )
                {
                    require_once('./ec2/sdk.class.php');
                    $ec2 = new AmazonEC2($config[$ec2Config]['key'], $config[$ec2Config]['secret']);
                    if( $ec2 )
                    {
                        $ec2->set_region($region);
                        $response = $ec2->request_spot_instances($price, array(
                            'InstanceCount' => (int)$instancesNeeded,
                            'Type' => 'one-time',
                            'LaunchSpecification' => array(
                                'ImageId' => $ami,
                                'InstanceType' => 'm1.small',
                                'UserData' => base64_encode($userData)
                            ),
                        ));
                        
                        if( $response->isOK() )
                        {
                            // add empty instances to our list, the actual ID's will be filled in as they come online
                            // and checked periodically
                            for( $i = 0; $i < $instancesNeeded; $i++ )
                                $instances[] = array();

                            fseek($file, 0);
                            ftruncate($file, 0);
                            fwrite($file, json_encode($instances));
                        }
                    }
                }
            }

            flock($file, LOCK_UN);
        }

        fclose($file);
    }
}

/**
* Scale down the number of instances that are running
* by definition, if we are in here there isn't work in the queue
* 
* @param mixed $location
* @param mixed $ec2Config
* @param mixed $instance
*/
function EC2_ScaleDown($location, $ec2Config, $instanceID)
{
    $now = time();

    $file = @fopen("./ec2/testers.$location.dat", 'c+');
    if( $file )
    {
        if( flock($file, LOCK_EX) )
        {
            $instances = json_decode(stream_get_contents($file), true);
            if( !$instances )
                $instances = array();
                
            $count = count($instances);
            $config = parse_ini_file('./settings/ec2.ini', true);
            if( isset($config[$ec2Config]) )
            {
                $min = $config[$ec2Config]['min'];
                if( $count > $min )
                {
                    $region = $config[$ec2Config]['region'];
                    $ami = $config[$ec2Config]['ami'];
                    require_once('./ec2/sdk.class.php');
                    $ec2 = new AmazonEC2($config[$ec2Config]['key'], $config[$ec2Config]['secret']);
                    if( $ec2 && strlen($region) && strlen($ami) )
                    {
                        $ec2->set_region($region);
                        UpdateInstanceList($ec2, $instances, $ami);
                        
                        $count = count($instances);
                        $terminate = array();
                        if( !$min )
                        {
                            foreach( $instances as &$instance )
                            {
                                if( strlen($instance['id']) )
                                    $terminate[] = $instance['id'];
                            }
                        }
                        else
                        {
                            $termCount = 0;
                            $term = $count - $min;
                            foreach( $instances as &$instance )
                            {
                                if( $termCount < $term && 
                                    strlen($instance['id']) && 
                                    $instance['id'] != $instanceID )
                                {
                                    $termCount++;
                                    $terminate[] = $instance['id'];
                                }
                            }
                        }
                        
                        $response = $ec2->terminate_instances($terminate);
                        if( $response->isOK() )
                        {
                            foreach($terminate as $id)
                            {
                                foreach( $instances as $index => &$instance )
                                {
                                    if( $instance['id'] == $id )
                                        unset( $instances[$index] );
                                }
                            }
                        }

                        // write out the updated list of instances
                        fseek($file, 0);
                        ftruncate($file, 0);
                        fwrite($file, json_encode($instances));
                    }
                }
            }

            flock($file, LOCK_UN);
        }
        fclose($file);
    }
}

/**
* Check to see if the instance is in the process of being terminated
* (also add it to the list of known instances if we didn't know about it)
* 
* @param mixed $location
* @param mixed $ec2Config
* @param mixed $instance
*/
function EC2_CheckInstance($location, $ec2Config, $instanceID)
{
    $active = false;

    $file = @fopen("./ec2/testers.$location.dat", 'c+');
    if( $file )
    {
        if( flock($file, LOCK_EX) )
        {
            $instances = json_decode(stream_get_contents($file), true);
            if( count($instances) )
            {
                foreach( $instances as &$instance )
                {
                    if( $instance['id'] == $instanceID )
                    {
                        $active = true;
                        break;
                    }
                }
            }
            
            // check in case we don't already know about this instance (and it's not shutting down)
            if( !$active )
            {
                $config = parse_ini_file('./settings/ec2.ini', true);
                if( isset($config[$ec2Config]) )
                {
                    $region = $config[$ec2Config]['region'];
                    $ami = $config[$ec2Config]['ami'];
                    require_once('./ec2/sdk.class.php');
                    $ec2 = new AmazonEC2($config[$ec2Config]['key'], $config[$ec2Config]['secret']);
                    if( $ec2 && strlen($region) && strlen($ami) )
                    {
                        $ec2->set_region($region);
                        UpdateInstanceList($ec2, $instances, $ami);
                        if( count($instances) )
                        {
                            foreach( $instances as &$instance )
                            {
                                if( $instance['id'] == $instanceID )
                                {
                                    $active = true;
                                    break;
                                }
                            }

                            // write out the updated list of instances
                            fseek($file, 0);
                            ftruncate($file, 0);
                            fwrite($file, json_encode($instances));
                        }
                    }
                }
            }
            
            flock($file, LOCK_UN);
        }
        fclose($file);
    }
    
    return $active;
}

/**
* Update the list of known instances in case some are running that haven't connected
* 
* @param mixed $ec2
* @param mixed $instances
* @param mixed $ami
*/
function UpdateInstanceList(&$ec2, &$instances, $ami)
{
    $instanceIds = array();
    
    // update the list of instances in case there are some we don't know about
    $response = $ec2->describe_instances();
    if( $response->isOK() )
    {
        foreach( $response->body->reservationSet->item as $item )
        {
            foreach( $item->instancesSet->item as $instance )
            {
                if( $instance->imageId == $ami && $instance->instanceState->code <= 16 )
                    $instanceIds[] = (string)$instance->instanceId;
            }
        }
    }
    
    foreach($instanceIds as $id)
    {
        $found = false;
        foreach( $instances as &$instance )
        {
            if( $instance['id'] == $id )
            {
                $found = true;
                break;
            }
        }
        if( !$found )
        {
            $found = false;
            foreach( $instances as &$instance )
            {
                if( !isset($instance['id']) )
                {
                    $found = true;
                    $instance['id'] = $id;
                    break;
                }
            }
            if( !$found )
                $instances[] = array('id' => $id);
        }
    }
}
?>