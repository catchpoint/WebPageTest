<?php
include_once "utils.inc";
include_once "monitor.inc";
include_once 'WptmEC2.class.php';

// TODO: Revisit this as it's not the best way to determine the region an instance is running in.
// It depends on the name given in the locations.ini file in webpagetest and will not work unless
// The parsing finds the indicated strings.
/**
 * A helper method to try and determine the Amazon EC2 region based on
 * the string passed in. Typically used to pass in the WPT "location"
 * Depends on the location having key values in it for this to work
 *
 * @param $str
 * @return string
 */
function determineEC2Region($str){
  if ( stripos($str,'us')){
    if (stripos($str,'east')){
      $region = "us-east-1";
    } else if (stripos($str,'west')){
      $region = "us-west-1";
    }
  } else if (stripos($str,'ap')){
    if (stripos($str,'southeast')){
      $region = "ap-southeast-1";
    } else if (stripos($str,'northeast')){
      $region = "ap-northeast-1";
    }
  } else if (stripos($str,'eu') && stripos($str,'west')){
    $region = "eu-west-1";
  }
  return $region;
}
/**
 * Method to find the WPT AMI image ID based on EC2 region and browser
 * TODO: see if there is a better way to integrate with WPT so this is not hard coded
 *
 * @param $region
 * @param $browser
 * @return the AMI for a given region and web browser
 */
function getAmiFor($region,$browser){
  $amazonAMIForRegion["us-east-1"]["IE_7"]="ami-fe689397";
  $amazonAMIForRegion["us-east-1"]["IE_8"]="ami-406f9429";
  $amazonAMIForRegion["us-west-1"]["IE_7"]="ami-919dcfd4";
  $amazonAMIForRegion["us-west-1"]["IE_8"]="ami-5982d01c";
  $amazonAMIForRegion["eu-west-1"]["IE_7"]="ami-70b18004";
  $amazonAMIForRegion["eu-west-1"]["IE_8"]="ami-00b18074";
  $amazonAMIForRegion["ap-southeast-1"]["IE_7"]="ami-38bac26a";
  $amazonAMIForRegion["ap-southeast-1"]["IE_8"]="ami-92bac2c0";
  $amazonAMIForRegion["ap-northeast-1"]["IE_7"]="ami-ba16bcbb";
  $amazonAMIForRegion["ap-northeast-1"]["IE_8"]="ami-bc16bcbd";
  $ami = $amazonAMIForRegion[$region][str_replace(" ","_",$browser)];
  return $ami;
}
// Check the runrate in each region and add instances as needed to support the run rate.
/**
 * @return void
 */
function adjustEC2InstanceCountIfRequired(){
  $locationInfo = getLocationInformation();
  $testerInfo = getTestersInformation();
  $wptmEC2 = new WptmEC2();

  // Check runrate to see if we need to start new instances.
  foreach ($locationInfo as $key=>$location){
    // No runrate, no need to proceed with this location.
    if ( !array_key_exists('runRate',$location)){ continue; }

    $runRate = $location['runRate'];
    // Mixed use of " and ' requires this "hack"  :(
    $k = str_replace("'",'"',$key);

    $agentCount = $testerInfo[$k]['AgentCount'];
    $runRateRatio = 0;

    // Avoid div by zero
    if ( $agentCount > 0){
      $runRateRatio = $runRate/$agentCount;
    } else if ( $runRate > 0 ) {
      $runRateRatio = 999999999;
    }

    $region = determineEC2Region($key);
    $browser = $location['Browser'][0];
    $ami = getAmiFor($region,$browser);
    $currentInstanceCount = $wptmEC2->getInstanceCount($region,$ami);
    // Only add on the quarter hours.
    // TODO: This logic expects that the process
//    $minute = (int)date('i');
//    if( ($minute > 0 && $minute < 5)   ||
//        ($minute > 15 && $minute < 20) ||
//        ($minute > 30 && $minute < 35) ||
//        ($minute > 45 && $minute < 50) )
    // If unable to determine region can not continue.
    // Log error
    // TODO: Add alerting on these types of errors
    if (empty($region)){
      logOutput("[ERROR] [ec2_functions] Can not determine Amazon EC2 Region Region","ec2Processor.log");
      continue;
    }

    if (($runRateRatio > TARGET_RUN_RATE_RATIO) || $location['PendingTests'] > 75){
      // Ramp up slowly to avoid over allocating instances
      if ( $currentInstanceCount >= EC2_MAXIMUM_INSTANCES_PER_REGION ){
        logOutput("[WARN] [ec2_functions] Maximum instance count reached while trying to Requesting spot instance for Region: [".$region."] Browser: [".$browser."] AMI: [".$ami."] Current Agent Count: [".$agentCount."] Runrate: [".$runRate."] Ratio: [".$runRateRatio."] Max Agents Allowed: [".EC2_MAXIMUM_INSTANCES_PER_REGION."]","ec2Processor.log");
        continue;
      }
      logOutput("[INFO] [ec2_functions] Requesting spot instance for Region: [".$region."] Browser: [".$browser."] AMI: [".$ami."] Current Agent Count: [".$agentCount."] Runrate: [".$runRate."] Ratio: [".$runRateRatio."]","ec2Processor.log");

      $opts = array(
                  'Type' => 'one-time',
                  'ValidUntil' => 'tomorrow',
                  'InstanceCount' => 1,
                  'LaunchSpecification' => array('ImageId' => $ami,
                                                 'InstanceType' => 'm1.small',
                                                 'UserData' => base64_encode(EC2_USER_DATA)),);

      $response=$wptmEC2->requestSpotInstances( $region,EC2_MAXIMUM_SPOT_PRICE, $opts );
      if ( $response->status != "200" ){
        logOutput("[ERROR] [ec2_functions] EC2 Error [".$response->body->Errors->Error->Message."] while Requesting spot instance for Region: [".$region."] Browser: [".$browser."] AMI: [".$ami."] Current Agent Count: [".$agentCount."] Runrate: [".$runRate."] Ratio: [".$runRateRatio."]","ec2Processor.log");
      }
    } else if (($currentInstanceCount - ($runRate/TARGET_RUN_RATE_RATIO) > 1) && $location['PendingTests'] < 75){
      logOutput("[INFO] [ec2_functions] Found excess instance for Region: [".$region."] Browser: [".$browser."] AMI: [".$ami."] Current Agent Count: [".$agentCount."] Runrate: [".$runRate."] Ratio: [".$runRateRatio."]","ec2Processor.log");
      if ( $testerInfo[$k]['AgentCount'] > 0){
        // Find agent that's not busy
        unset($id);
        foreach($testerInfo[$k]['XML']->testers->tester as $tester){
          if ($tester->busy == "0"){
            $id = (string)$tester->ec2;
            break;
          }else {
            continue;
          }
        }

        if (isset($id)){
          logOutput("[INFO] [ec2_functions] Terminating excess instance for Region: [".$region."] ID: [".$id."] Browser: [".$browser."] AMI: [".$ami."] Current Agent Count: [".$agentCount."] Runrate: [".$runRate."] Ratio: [".$runRateRatio."]","ec2Processor.log");

          $response = $wptmEC2->terminateInstance($region,$id);
          if ( $response->status != "200" ){
            logOutput("[ERROR] [ec2_functions] EC2 Error [".$response->body->Errors->Error->Message."] while terminating excess instance for Region: [".$region."] Browser: [".$browser."] AMI: [".$ami."] Current Agent Count: [".$agentCount."] Runrate: [".$runRate."] Ratio: [".$runRateRatio."]","ec2Processor.log");
          }
        }
      }
    }
  }
}
/**
 * Terminates instance that have not checked in in over 2 hours.
 *
 */
function terminateDeadEC2Testers(){
  // TODO: Add switch to enable/disable EC2 control from wptmonitor
  $locations = getTestersInformation();
  $wptmec2 = new WptmEC2();

  foreach($locations as $key=>$location){
    $region = determineEC2Region($key);
    if (empty($region)){
      logOutput("[ERROR] [ec2_functions] Can not determine Amazon EC2 Region Region","ec2Processor.log");
      exit;
    }
    if ($location['AgentCount']>0){
      foreach($location['XML']->testers->tester as $tester){
        if (!isset($tester->elapsed)|| $tester->elapsed >30 ){
            //|| !isset($tester->last)|| $tester->last > 30){

          if (empty($tester->elapsed)|| $tester->elapsed >30){
            $msg = "non responsive";
          } else {
            $msg = "idle";
          }
          logOutput("[INFO] [ec2_functions] Terminating ".$msg." instance. Region: [".$region."] Instance: [".$tester->ec2."]","ec2Processor.log");
          $response = $wptmec2->terminateInstance($region,$tester->ec2);
          if ( !$response->isOK( ) ){
           logOutput("[ERROR] [ec2_functions] EC2 Error [".$response->body->Errors->Error->Message."] while terminating non responsive instance: ".$tester->ec2,"ec2Processor.log");
          }
        }
      }
    }
  }
}
/**
 *
 * @return void
 */
function getEC2TesterStatus(){
  $browsers[] = "IE_7";
  $browsers[] = "IE_8";

  $amazonAMIForRegion["us-east-1"]["IE_7"]="ami-fe689397";
  $amazonAMIForRegion["us-east-1"]["IE_8"]="ami-406f9429";
  $amazonAMIForRegion["us-west-1"]["IE_7"]="ami-919dcfd4";
  $amazonAMIForRegion["us-west-1"]["IE_8"]="ami-5982d01c";
  $amazonAMIForRegion["eu-west-1"]["IE_7"]="ami-70b18004";
  $amazonAMIForRegion["eu-west-1"]["IE_8"]="ami-00b18074";
  $amazonAMIForRegion["ap-southeast-1"]["IE_7"]="ami-38bac26a";
  $amazonAMIForRegion["ap-southeast-1"]["IE_8"]="ami-92bac2c0";
  $amazonAMIForRegion["ap-northeast-1"]["IE_7"]="ami-ba16bcbb";
  $amazonAMIForRegion["ap-northeast-1"]["IE_8"]="ami-bc16bcbd";
  $wptmEC2 = new WptmEC2();
  $testers = array();

  foreach ($browsers as $browser){
    foreach ($amazonAMIForRegion as $key=>$regionAmi){
      $ami = $regionAmi[$browser];
      $response = $wptmEC2->getInstances($key,$ami);
      if ( !$response->isOK()){
        logOutput("[ERROR] [ec2_functions:getEC2TesterStatus] EC2 Error [".$response->body->Errors->Error->Message."] while describing instances for Region: [".$key."]","ec2Processor.log");
      }
      if (sizeof($response->body->reservationSet->item) < 1){
        continue;
      }

      foreach ($response->body->reservationSet as $instance){
        $tester = array();

        if ( sizeof($instance) == 1){
          $instanceId = (string)$instance->item->instancesSet->item->instanceId;
          $imageId = (string)$instance->item->instancesSet->item->imageId;
          $state = (string)$instance->item->instancesSet->item->instanceState->name;
          $launchTime = (string)$instance->item->instancesSet->item->launchTime;
          $tester['region']=$key;
          $tester['browser']=$browser;
          $tester['instanceId']=$instanceId;
          $tester['imageId']=$imageId;
          $tester['state']=$state;
          $tester['launchTime']=$launchTime;
          $testers[$instanceId]=$tester;

        } else {
          foreach ($instance as $i){
            $instanceId = (string)$i->instancesSet->item->instanceId;
            $imageId = (string)$i->instancesSet->item->imageId;
            $state = (string)$i->instancesSet->item->instanceState->name;
            $launchTime = (string)$i->instancesSet->item->launchTime;
            $tester['region']=$key;
            $tester['browser']=$browser;
            $tester['instanceId']=$instanceId;
            $tester['imageId']=$imageId;
            $tester['state']=$state;
            $tester['launchTime']=$launchTime;
            $testers[$instanceId]=$tester;

          }
        }

      }
    }
  }
  // Update file cache
  writeIniFile($testers,"temp/ec2_tester_status.ini",true);
  return $testers;
}
?>