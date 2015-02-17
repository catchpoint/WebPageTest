<?php
chdir('..');
include 'common.inc';
header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
set_time_limit(300);

// make sure a file was uploaded
if( isset($_FILES['file']) )
{
  $fileName = $_FILES['file']['name'];
  
  // create a new test id
  $today = new DateTime("now", new DateTimeZone('America/New_York'));
  $id = $today->format('ymd_') . ShardKey(rand()) . md5(uniqid(rand(), true));
  $path = './' . GetTestPath($id);

  // create the folder for the test results
  if( !is_dir($path) )
      mkdir($path, 0777, true);
  
  // extract the zip file
  $zip = new ZipArchive();
  if ($zip->open($zipfile) === TRUE) {
      $testPath = realpath($path);
      $zip->extractTo($testPath);
      $zip->close();
  }
      
  // make sure there are no risky files and that nothing is allowed execute permission
  SecureDir($path);
  
  // mark the test as piblished so we won't expose a resubmit
  $lock = LockTest($id);
  if ($lock) {
    $testInfo = GetTestInfo($id);
    if ($testInfo) {
      $testInfo['id'] = $id;
      $testInfo['job'] = $id;
      $testInfo['published'] = true;
      if (array_key_exists('noscript', $_REQUEST) && $_REQUEST['noscript'])
        $testInfo['script'] = null;
      SaveTestInfo($id, $testInfo);
    }
    UnlockTest($lock);
  }
  
  if (is_file("$path/testinfo.ini")) {
    $ini = file("$path/testinfo.ini");
    foreach ($ini as &$line) {
      if (!strncasecmp($line, 'id=', 3)) {
        $line = "id=$id\r\n";
      }
    }
    file_put_contents("$path/testinfo.ini", implode('', $ini));
  }
      
  echo $id;
}

?>
