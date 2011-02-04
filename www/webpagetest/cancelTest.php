<?php
include 'common.inc';
set_time_limit(1000);

# Mark the test as cancelled.
if( gz_is_file("$testPath/testinfo.json") )
{
    $testInfoJson = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);

    # Don't allow cancelling of running or finished tests.
    if( $testInfoJson['started'] )
    {
      echo '<h3>You cannot cancel a running or a finished test!</h3>';
      echo '<form><input type="button" value="Back" onClick="history.go(-1);return true;"> </form>';
      return;
    }

    $testInfoJson['cancelled'] = time();
    // delete the actual test file.
    $ext = 'url';
    if( $testInfoJson['priority'] )
        $ext = "p{$testInfoJson['priority']}";
    $queued_job_file = $testInfoJson['workdir'] . "/$id.$ext";
    if( !is_file($queued_job_file) )
    {
      echo '<h3>Sorry, the test could not be cancelled.  It may have already started or been cancelled</h3>';
      echo '<form><input type="button" value="Back" onClick="history.go(-1);return true;"> </form>';
      return;
    }
    unlink($queued_job_file);
    gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfoJson));
    echo '<h3 align=center">Test cancelled!</h3>';
    echo '<form><input type="button" value="Back" onClick="history.go(-1);return true;"> </form>';
}
?>
