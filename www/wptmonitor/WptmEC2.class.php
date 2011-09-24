<?php
/**
 * Created by JetBrains PhpStorm.
 * User: tperkins
 * Date: 9/10/11
 * Time: 1:02 PM
 * To change this template use File | Settings | File Templates.
 */
include 'lib/aws/sdk.class.php';
include 'lib/aws/services/ec2.class.php';
define('AWS_CERTIFICATE_AUTHORITY', true);

class WptmEC2
{
  function __construct(){
    if (!defined('AWS_KEY')){
      $ec2Creds = parse_ini_file("/etc/wptm-ec2.ini");
      define ('AWS_KEY', $ec2Creds['AWS_KEY']);
      define ('AWS_SECRET_KEY', $ec2Creds['AWS_SECRET_KEY']);
    }
  }

  public function deleteAutoScalingGroup($name, $opts = null){
    $as = new AmazonAS();
    $response = $as->delete_auto_scaling_group($name,$opts);
    return $response;
  }
  public function createAutoScalingGroup($name, $launch_config_name, $min_size, $max_size, $zones, $opts= null){
    $as = new AmazonAS();
    $response = $as->create_auto_scaling_group($name, $launch_config_name, $min_size, $max_size, $zones, $opts);
    return $response;
  }
  
  public function deleteLaunchConfiguration($region, $name, $opts= null){
    $as = new AmazonAS();
//    $as->set_region($region);
    $response= $as->delete_launch_configuration($name, $opts);
    return $response;
  }
  public function createLaunchConfiguration($region, $name, $image_id, $instance_type, $opts=null){
    $as = new AmazonAS();
//    $as->set_region($region);
    $response = $as->create_launch_configuration($name, $image_id, $instance_type, $opts);
    // Success?
//    var_dump($response->isOK());
    return $response;
  }
  public function getLaunchConfigurations($opts = null){
    $as = new AmazonAS();
     $response = $as->describe_launch_configurations($opts);
    // Success?
    var_dump($response->isOK());
    return $response;
  }
  /**
   * Request spot instance(s)
   *
   * @param $region Region in which to fire up the instance
   * @param $price maximum price to pay for spot instance
   * @param $opts EC2 options
   * @return CFResponse
   */
  public function requestSpotInstances($region, $price, $opts)
  {$ec2 = new AmazonEC2();
    $ec2->set_region($region);
    $response = $ec2->request_spot_instances($price, $opts);
    return $response;
  }

  /**
   * Terminate an EC2 Instance
   *
   * @param $region Region in which to terminate instance
   * @param $id Id of instance to terminate
   * @return CFResponse
   */
  public function terminateInstance($region, $id){
    $ec2 = new AmazonEC2();
    $ec2->set_region($region);
    $response = $ec2->terminate_instances($id);
    return $response;
  }
  /**
   * Get instances by region and optionally AMI
   *
   * @param $region
   * @param null $ami
   * @return CFResponse
   */
  public function getInstances($region, $ami = null ){
    $ec2 = new AmazonEC2();
    $ec2->set_region($region);
    $opts = array();
    if ($ami != null ){
      $opts=array('Filter' => array(array('Name' => 'image-id', 'Value' => $ami)));
    }
    $response = $ec2->describe_instances($opts);
    return $response;
  }

  /**
   * Get the number of instance of a particular AMI running in a give region.
   * @param $region
   * @param $ami
   * @return int Number of instances of AMI $ami running in region $region
   */
  public function getInstanceCount($region, $ami){
    $ec2 = new AmazonEC2();
    $ec2->set_region($region);
    $response = $ec2->describe_instances(array(
                                              'Filter' => array(
                                                array('Name' => 'image-id', 'Value' => $ami)
                                              )));
    if ( $response->status != "200" ){
     logOutput("[ERROR] [WptmEC2.class] EC2 Error [".$response->body->Errors->Error->Message."] while getting instance count");
    }
    return sizeof($response->body->reservationSet->item);
  }
}
