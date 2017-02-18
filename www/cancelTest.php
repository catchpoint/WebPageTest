<?php
include 'common.inc';
set_time_limit(30000);

if( isset($test['test']) )
{
    if( $test['test']['batch'] )
    {
        $count = 0;
        $tests = null;
        if( gz_is_file("$testPath/tests.json") )
        {
            $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
            $tests = array();
            $tests['variations'] = array();
            $tests['urls'] = array();
            foreach( $legacyData as &$legacyTest )
                $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
        }
        elseif( gz_is_file("$testPath/bulk.json") )
            $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
        if( isset($tests) )
        {
            foreach( $tests['urls'] as &$testData )
            {
                if( CancelTest($testData['id']) )
                    $count++;
                    
                foreach( $testData['v'] as $variationIndex => $variationId )
                {
                    if( CancelTest($variationId) )
                        $count++;
                }
            }
        }
        echo "<h3 align=\"center\">$count Test(s) cancelled!</h3>";
    }
    else
    {
        if( CancelTest($id) )
            echo '<h3 align="center">Test cancelled!</h3>';
        else
          echo '<h3>Sorry, the test could not be cancelled.  It may have already started or been cancelled</h3>';
    }
    echo '<form><input type="button" value="Back" onClick="history.go(-1);return true;"> </form>';
}

/**
* Cancel and individual test
* 
* @param mixed $id
*/
function CancelTest($id)
{
  $lock = LockTest($id);
  if ($lock) {
    $cancelled = false;
    $testInfo = GetTestInfo($id);
    if ($testInfo && !array_key_exists('started', $testInfo)) {
      $testInfo['cancelled'] = time();
      SaveTestInfo($id, $testInfo);

      // delete the actual test file.
      if (array_key_exists('workdir', $testInfo)) {
        $ext = 'url';
        if( $testInfo['priority'] )
            $ext = "p{$testInfo['priority']}";
        $queued_job_file = $testInfo['workdir'] . "/$id.$ext";
        $cancelled = @unlink($queued_job_file);
      }
    }
    UnlockTest($lock);
  }
  return $cancelled;
}
?>
