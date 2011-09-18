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
  function __construct()
  {
    if (!defined('AWS_KEY')){
      $ec2Creds = parse_ini_file("/etc/wptm-ec2.ini");
      define ('AWS_KEY', $ec2Creds['AWS_KEY']);
      define ('AWS_SECRET_KEY', $ec2Creds['AWS_SECRET_KEY']);
    }
  }

  public function requestSpotInstances($region, $price, $opts)
  {
    $ec2 = new AmazonEC2();
    $ec2->set_region($region);
    $response = $ec2->request_spot_instances($price, $opts);
    return $response;
  }
  
  public function terminateInstance($region, $id)
  {
    $ec2 = new AmazonEC2();
    $ec2->set_region($region);
    $response = $ec2->terminate_instances($id);
    return $response;
  }
  /**
   * Get instances by region and optionally AMI
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
    if ( $response->status != "200" ){
     logOutput("[ERROR] [WptmEC2.class] EC2 Error [".$response->body->Errors->Error->Message."] while getting instances");
    }
    return $response;
  }
  public function getInstanceCount($region, $ami)
  {
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
