<?php
require_once('common.inc');
require_once('page_data.inc');

$locations = parse_ini_file('./settings/locations.ini', true);
BuildLocations($locations);

$testQueue = array();

/**
* Get the status of the given test ID (and return the info in an array)
* 
*/
function GetTestStatus($id)
{
    global $locations;
    global $testQueue;
    
    $ret = array('statusCode' => 400, 'statusText' => 'Test not found');
    $testPath = './' . GetTestPath($id);
    if( is_file("$testPath/testinfo.ini") )
    {
        // make sure it is a valid test
        $test = parse_ini_file("$testPath/testinfo.ini",true);
        if( isset($test['test']) )
        {
            $ret['testId'] = $id;
            $ret['runs'] = (int)$test['test']['runs'];
            $ret['fvonly'] = (int)$test['test']['fvonly'];
            
            if( isset($test['test']['loc']) )
                $ret['location'] = $test['test']['loc'];

            // Ignore the cancelled tests.
            if( is_file("$testPath/testinfo.json") )
            {
              $testInfoJson = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
              if( isset($testInfoJson['cancelled']) )
              {
                $ret['statusCode'] = 402;
                $ret['statusText'] = 'Test Cancelled';
                return $ret;
              }
            }
            if( isset($test['test']['startTime']) || isset($test['test']['completeTime']) )
            {
                $ret['startTime'] = $test['test']['startTime'];

                if( isset($test['test']['completeTime']) )
                {
                    $ret['statusCode'] = 200;
                    $ret['statusText'] = 'Test Complete';
                    $ret['completeTime'] = $test['test']['completeTime'];
                }
                else
                {
                    $ret['statusCode'] = 100;
                    $ret['statusText'] = 'Test Started';
                }

                $pageData = loadAllPageData($testPath);
                
                // count the number of fv and rv tests that have completed
                $fvRuns = 0;
                $rvRuns = 0;
                foreach( $pageData as &$run )
                {
                    if( isset($run[0]) )
                        $fvRuns++;
                    if( isset($run[1]) )
                        $rvRuns++;
                }
                
                $ret['fvRunsCompleted'] = $fvRuns;
                $ret['rvRunsCompleted'] = $rvRuns;
                
                // TODO: Add actual summary result information
            }
            else
            {
                $found = false;
                $count = 0;
                
                // get it's position in line
                if( isset($test['test']['loc']) )
                {
                    if( !isset($testQueue[$test['test']['loc']]) )
                    {
                        $workDir = $locations[$test['test']['loc']]['localDir'];
                        
                        // get a list of all of the files in the directory and store them indexed by filetime
                        $files = array();
                        $f = scandir($workDir);
                        foreach( $f as $file )
                        {
                            $fileTime = filemtime("$workDir/$file");
                            if( $fileTime && !isset($files[$fileTime]) )
                                $files[$fileTime] = $file;
                            else
                                $files[] = $file;
                        }
                        
                        // sort it by time
                        ksort($files);
                        $testQueue[$test['test']['loc']] = $files;
                    }
                    
                    // loop by priority until I find the test I'm looking for
                    $testId;
                    
                    // loop through all of the possible extension types in priority order
                    $priority = array( "url", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9" );
                    foreach( $priority as $ext )
                    {
                        foreach( $testQueue[$test['test']['loc']] as $file )
                        {
                            $parts = pathinfo($file);
                            if( !strcasecmp( $parts['extension'], $ext) )
                            {
                                $testId = basename($file, ".$ext");;
                                if( $testId == $id )
                                {
                                    $found = true;
                                    break 2;
                                }
                                else
                                    $count++;
                            }
                        }
                    }
                }
                
                if( $found )
                {
                    $ret['statusCode'] = 101;
                    $ret['statusText'] = 'Test Pending';
                    $ret['behindCount'] = $count;
                }
                else
                {
                    $ret['statusCode'] = 401;
                    $ret['statusText'] = 'Test request not found';
                }
            }
        }
    }
    
    return $ret;
}

/**
 * Get the status text for the given test.
 */
function GetTestStatusText($id, $test)
{
  $statusText = "";
  $testPath = './' . GetTestPath($id);
  $testInfoJson = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
  if( isset($testInfoJson['cancelled']) )
  {
    return "Test Cancelled";
  }
  if( $test['test']['startTime'] )
  {
    $started = true;
    $now = time();
    $start = strtotime($test['test']['startTime']);
    if( isset($testInfoJson['cancelled']) )
    {
        return "Test Cancelled";
    }
    if( $testInfoJson['started'] )
      $start = $testInfoJson['started'];

    $elapsed = 0;
    if( $now > $start )
      $elapsed = $now - $start;
    if( $elapsed == 0 )
      $statusText = "Test just started";
    elseif( $elapsed == 1 )
      $statusText = "Test Started $elapsed second ago";
    elseif( $elapsed < 60 )
      $statusText = "Test Started $elapsed seconds ago";
    else
    {
      $elapsed = floor($elapsed / 60);
      if( $elapsed == 1 )
        $statusText = "Test Started $elapsed minute ago";
      elseif( $elapsed < 60 )
        $statusText = "Test Started $elapsed minutes ago";
      else
        $statusText = "Test Started $elapsed minutes ago (probably failed)";
    }
  }
  else
  {
    $started = false;
    $status = GetTestStatus($id);
    if( $status['statusCode'] == 101 )
    {
      if( $status['behindCount'] > 1 )
        $statusText = "Waiting behind {$status['behindCount']} other tests...";
      elseif( $status['behindCount'] == 1 )
        $statusText = "Waiting behind 1 other test...";
      else
        $statusText = "Waiting at the front of the queue...";
    }
  }
  return $statusText;
}

?>
