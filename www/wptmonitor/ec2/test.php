<?php
include '../lib/amazon/sdk-1.0.0/sdk.class.php';
$ec2 = new AmazonEC2();
$response = $ec2->describe_instances();

//var_dump($response);
foreach ($response as $item){
  print_r($item);
  print "\n";
}
?>
