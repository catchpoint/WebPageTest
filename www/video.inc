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
                $fileWillBeMoved = false;
                $src = $testPath  . "/$file";
                $regexForMultistep = "/^(?P<runNumber>[0-9]+)_(?P<cached>Cached_)?(?P<pageNumber>[0-9]+)_progress_(?P<fileBase>[\S]+)$/";
                if (preg_match($regexForMultistep,$file,$matches)) {
                    $runNum = $matches['runNumber'];
                    $page = $matches['pageNumber'];
                    $fileBase = $matches['fileBase'];
                    $cached = '';
                    if( array_key_exists('cached',$matches) && $matches['cached'] != null && $matches['cached'] != '' ) {
                        $cached = '_cached';
                    }
                    $pathOld = $testPath . "/video_{$runNum}{$cached}";
                    if (!is_dir($pathOld))
                        mkdir($pathOld, 0777, true);
                    $path = $testPath . "/video_{$runNum}_{$page}{$cached}";
                    if( !is_dir($path) )
                        mkdir($path, 0777, true);
                    $fileName = 'frame_' . $page . '_' . $fileBase;
                    $fileWillBeMoved = true;
                }
                //If this result contains video-files in multistep- and singlestep-result
                // format, delete the one in singlestep-format
                if(preg_match("/^(?P<runNumber>[0-9]+)_(?P<cached>Cached_)?progress_(?P<fileBase>[\S]+)$/", $file, $matches)) {
                    $runNum = $matches['runNumber'];
                    $fileBase = $matches['fileBase'];
                    $cached = '';
                    if ( array_key_exists('cached',$matches) && $matches['cached'] != null && $matches['cached'] != '' ) {
                        $cached = '_cached';
                    }
                    $pathOld = $testPath . "/video_{$runNum}{$cached}";
                    if (!is_dir($pathOld))
                        mkdir($pathOld, 0777, true);
                    $path = $testPath . "/video_{$runNum}_1{$cached}";
                    if (!is_dir($path))
                        mkdir($path, 0777, true);
                    $fileName = 'frame_1_' . $fileBase;
                    $fileWillBeMoved = true;
                }
                if($fileWillBeMoved){
                    copy($src, $pathOld . "/" . $fileName);
                    rename($src, $path . "/" . $fileName);
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
function BuildVideoScript($testPath, $videoDir, $endTime = 0, $extend = false, $startOffset = null)
{
  // figure out the frame range and actual file names
  $start = null;
  $end = null;
  $frames = array();
  if( $endTime )
      $endTime = (int)(($endTime + 99) / 100);

  if (loadVideo($videoDir, $frames_ms) && count($frames_ms)) {
    // get 10fps frame timings for now - eventually add support for rendering 60fps video
    $frames = array();
    foreach ($frames_ms as $ms => $path)
      $frames[ceil($ms / 100)] = $path;

    // make sure all of the images are the same size - if not, fix it
    $width = 0;
    $height = 0;
    if( count($frames) >= 1 ) {
      foreach( $frames as $index => $file ) {
        $image_file = $videoDir  . "/$file";
        list($w, $h) = getimagesize($image_file);
        if (!$width && !$height) {
          $width = $w;
          $height = $h;
        } else {
          if ($w !== $width || $h !== $height) {
            $src = imagecreatefromjpeg($image_file);
            $dest = imagecreatetruecolor($width, $height);
            $white = imagecolorallocate($dest, 255,255,255);
            imagefilledrectangle($dest, 0, 0, $width, $height, $white);
            imagecopy($dest, $src, 0, 0, 0, 0, min($w,$width), min($h,$height));
            imagedestroy($src);
            imagejpeg($dest, $image_file);
            imagedestroy($dest);
          }
        }
      }
    }

    // build the actual script
    if (count($frames) >= 1) {
      $script = '';

      // build out all of the frames
      $lastIndex = 0;
      $lastFrame;
      foreach( $frames as $index => $file ) {
        if (!$endTime || $index <= $endTime) {
          // see if this is the first frame
          if( !isset($lastFrame) ) {
            if( $index > 0 )
              $script .= "ImageSource(\"$file\", start = 1, end = $index, fps = 10) + \\ \r\n";
          } elseif( $index > $lastIndex ) {
            $count = $index - $lastIndex;
            $script .= "ImageSource(\"$lastFrame\", start = 1, end = $count, fps = 10) + \\ \r\n";
          }

          $lastFrame = $file;
          $lastIndex = $index;
        }
      }
      $end = $lastIndex;

      // put in the last frame
      if( $endTime ) {
        $count = max((int)($endTime - $lastIndex + 1), 1);
        $script .= "ImageSource(\"{$frames[$end]}\", start = 1, end = $count, fps = 10)\r\n";
      } else
        $script .= "ImageSource(\"{$frames[$end]}\", start = 1, end = 1, fps = 10)\r\n";

      // write out the script file
      file_put_contents("$videoDir/video.avs", $script);
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
                $zip = new ZipArchive();
                if ($zip->open($zipFile, ZIPARCHIVE::CREATE) === true) {
                    $files = scandir($path);
                    foreach ($files as $file) {
                        $filePath = "$path/$file";
                        if ($file != 'video.zip' && is_file($filePath))
                            $zip->addFile($filePath, $file);
                    }
                    $zip->close();
                }
                $path = substr($zipFile,1);
            }

        }
    }
    else
        unset($path);

    return $path;
}

?>
