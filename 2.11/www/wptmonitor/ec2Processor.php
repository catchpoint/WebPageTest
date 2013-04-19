<?php
/**
 * The job processor scans the jobs db to find any job that is active and due to be run.
 * It also scans the results directory to see if any results are pending and will poll the wpt server
 * to see if the results are ready. If they are the results are downloaded. The xmlResult file is downloaded and
 * optionally the additional assets can be downloaded if the job was configured to do so.
 */
  include_once 'monitor.inc';
  include_once 'ec2_functions.inc';
  include_once 'wpt_functions.inc';
  include_once 'utils.inc';
  require_once('bootstrap.php');

  $key = $_REQUEST['key'];
  $configKey = getWptConfigFor('jobProcessorKey');
  if ( $configKey != $key ){
    print "Invalid Key";
    exit;
  }
  logOutput("[INFO] [ec2Processor] ec2 Processor checking Amazon EC2 Status","ec2Processor.log");
  // TODO: Make Only executes if EC2 integration is active
  echo "Termination<br>";
  terminateDeadEC2Testers();
  echo "Adjustment<br>";
  adjustEC2InstanceCountIfRequired();

?>
 
