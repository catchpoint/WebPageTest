<?php

/**
* Move all of the progress images to individual video directories (will usually be there but in th case of a jobsync script I need to move them)
* 
* @param mixed $testPath
*/
function MoveVideoFiles($testPath)
{
    $dir = opendir($testPath);
    if( $dir )
    {
        while($file = readdir($dir)) 
        {
            if( strpos($file, '_progress_') !== false )
            {
                $src = $testPath  . "/$file";
                $parts = explode('_', $file);
                if( count($parts) )
                {
                    $run = (int)$parts[0];
                    if( $run )
                    {
                        $destDir = $testPath . "/video_$run";
                        if( strpos($file, '_Cached') !== false )
                            $destDir .= '_cached';
                            
                        if( !is_dir($destDir) )
                            mkdir($destDir);
                        
                        $fileBase = $parts[count($parts) - 1];
                        $dest = "$destDir/frame_$fileBase";
                        rename($src, $dest);
                    }
                }
            }
        }

        closedir($dir);
    }
}

/**
* Go through a given test and see if "video" was captured.  If so, build the avisynth script to stitch the images together into a video
* 
* @param mixed $testPath
*/
function BuildVideoScripts($testPath)
{
    $dir = opendir($testPath);
    if( $dir )
    {
        while($file = readdir($dir)) 
        {
            $path = $testPath  . "/$file";
            if( is_dir($path) && !strncmp($file, 'video_', 6) )
                BuildVideoScript($testPath, $path);
        }

        closedir($dir);
    }
}

/**
* Buiild an avisynth script for the given directory
* 
* @param mixed $videoDir
*/
function BuildVideoScript($testPath, $videoDir)
{
    // figure out the frame range and actual file names
    $start = 20000;
    $end = 0;
    $frames = array();
    
    $dir = opendir($videoDir);
    if( $dir )
    {
        while($file = readdir($dir)) 
        {
            $path = $videoDir  . "/$file";
            if( is_file($path) && !strncmp($file, 'frame_', 6)  &&  strpos($file, '.thm') === false)
            {
                $parts = explode('_', $file);
                if( count($parts) >= 2 )
                {
                    $index = (int)$parts[1];
                    if( $index < $start )
                        $start = $index;
                    if( $index > $end )
                        $end = $index;
                    $frames[$index] = $file;
                }
            }
        }

        closedir($dir);
    }
    
    // build the actual script
    if( count($frames) >= 1 )
    {
        $script = '';
        ksort($frames, SORT_NUMERIC);
        
        // build out all of the frames
        $lastIndex = 0;
        $lastFrame;
        foreach( $frames as $index => $file )
        {
            // see if this is the first frame
            if( !isset($lastFrame) )
            {
                if( $index > 0 )
                    $script .= "ImageSource(\"$file\", start = 1, end = $index, fps = 10) + \\ \r\n";
            }
            elseif( $index > $lastIndex )
            {
                $count = $index - $lastIndex;
                $script .= "ImageSource(\"$lastFrame\", start = 1, end = $count, fps = 10) + \\ \r\n";
            }
            
            $lastFrame = $file;
            $lastIndex = $index;
        }
        
        // put in the last frame
        $script .= "ImageSource(\"{$frames[$end]}\", start = 1, end = 1, fps = 10)\r\n";
        
        // write out the script file
        file_put_contents("$videoDir/video.avs", $script);
        
        // create a readme
        $readme = "To play the video (Windows Only):\r\n";
        $readme .= "\r\n- Install Avisynth (Download here: http://sourceforge.net/projects/avisynth2/)\r\n";
        $readme .= "- Extract this ZIP file to a local folder\r\n";
        $readme .= "- Double-click on the \"video.avs\" file\r\n";
        file_put_contents("$videoDir/readme.txt", $readme);
    }
    
    // create the summary stats script
    BuildVideoStatsScript($testPath, $videoDir);
}

/**
* Create a script with the video stats
* 
* @param mixed $videoDir
*/
function BuildVideoStatsScript($testPath, $videoDir)
{
    $pathParts = explode('/', $videoDir);
    $count = count($pathParts);
    if( $count )
    {
        $dir = $pathParts[$count - 1];
        $dirParts = explode('_', $dir);
        if( count($dirParts) >= 2 )
        {
            $run = (int)$dirParts[1];
            if( $run )
            {
                $cached = 0;
                if( strstr($dir, '_cached') !== false )
                    $cached = 1;
                    
                // load thee page-level data for the run
                require_once('./page_data.inc');
                $pageData = loadPageRunData($testPath, $run, $cached);
                if( $pageData && count($pageData))
                {
                    $script = "test_url=\"{$pageData['URL']}\"\r\n";
                    $script .= "test_loadTime={$pageData['loadTime']}\r\n";
                    $script .= "test_TTFB={$pageData['TTFB']}\r\n";
                    $script .= "test_startRender={$pageData['render']}\r\n";
                    $script .= "test_fullyLoaded={$pageData['fullyLoaded']}\r\n";
                    $script .= "test_documentComplete={$pageData['docTime']}\r\n";
                    $script .= "test_domTime={$pageData['domTime']}\r\n";
                    $script .= "test_bytesIn={$pageData['bytesIn']}\r\n";
                    $script .= "test_requests={$pageData['requests']}\r\n";
                    $script .= "test_result={$pageData['result']}\r\n";
                    $script .= "test_cached={$pageData['cached']}\r\n";
                    file_put_contents("$videoDir/stats.avs", $script);
                }
            }
        }
    }
}
  
/**
* Create the zip file of the video
* 
* @param mixed $videoDir
*/
function ZipVideo($path)
{
    if( is_dir($path) )
    {
        $zipFile .= $path . '/video.zip';    
        if( is_file($zipFile) )
            $path = substr($zipFile,1);
        else
        {
            // zip up the directory contents

            // build the list of files to zip
            $files;
            $dir = opendir("$path");
            if( $dir )
            {
                while($file = readdir($dir))
                    if( $file != '.' && $file != '..' && strpos($file, '.thm') === false )
                        $files[] = $path . "/$file";
                closedir($dir);
            }

            if( isset($files) && count($files) )
            {    
                // zip up the results
                require_once('./lib/pclzip.lib.php');
                $zip = new PclZip($zipFile);
                $zip->create($files, PCLZIP_OPT_REMOVE_ALL_PATH);
                $path = substr($zipFile,1);
            }
            
        }
    }
    else
        unset($path);
        
    return $path;
}
  
?>