<?php
chdir('..');
include 'common.inc';
require_once('./lib/pclzip.lib.php');
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
    $id = $today->format('ymd_') . md5(uniqid(rand(), true));

    $path = './' . GetTestPath($id);

    // create the folder for the test results
    if( !is_dir($path) )
        mkdir($path, 0777, true);
    
    // extract the zip file
    $archive = new PclZip($_FILES['file']['tmp_name']);
    $list = $archive->extract(PCLZIP_OPT_PATH, "$path/");
    if( !$list )
        unset($id);
        
    // make sure there are no risky files and that nothing is allowed execute permission
    SecureDir($path);
        
    echo $id;
}

?>
