<?php
header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
set_time_limit(300);
chdir('..');
include 'common.inc';
$location = $_REQUEST['location'];
$key = $_REQUEST['key'];
$id = $_REQUEST['id'];

logMsg("\n\nImage received for test: $id, location: $location, key: $key\n");

// load all of the locations
$locations = parse_ini_file('./settings/locations.ini', true);
BuildLocations($locations);

$locKey = $locations[$location]['key'];
if( (!strlen($locKey) || !strcmp($key, $locKey)) || !strcmp($_SERVER['REMOTE_ADDR'], "127.0.0.1") )
{
    if( isset($_FILES['file']) )
    {
        $fileName = $_FILES['file']['name'];
        $path = './' . GetTestPath($id);
        
        // put each run of video data in it's own directory
        if( strpos($fileName, 'progress') )
        {
            $parts = explode('_', $fileName);
            if( count($parts) )
            {
                $runNum = $parts[0];
                $fileBase = $parts[count($parts) - 1];
                $cached = '';
                if( strpos($fileName, '_Cached') )
                    $cached = '_cached';
                $path .= "/video_$runNum$cached";
                if( !is_dir($path) )
                    mkdir($path);
                $fileName = 'frame_' . $fileBase;
            }
        }
        logMsg(" Moving uploaded image '{$_FILES['file']['tmp_name']}' to '$path/$fileName'\n");
        move_uploaded_file($_FILES['file']['tmp_name'], "$path/$fileName");
    }
    else
        logMsg(" no uploaded file attached");
}
else
    logMsg(" location key incorrect\n");
?>

