<?php
if (php_sapi_name() != 'cli')
  exit(1);
chdir('..');
include 'common.inc';
include 'page_data.inc';

$count = 0;
$pruned = 0;

/*
*   Compress a given folder (and all folders under it) in the results folder
*/  
if( count($_SERVER["argv"]) > 1 )
{
    $dir = trim($_SERVER["argv"][1]);
    if( strlen($dir) )
    {
        $dir = "./results/$dir";
        $startWith = '';
        
        if( count($_SERVER["argv"]) > 2 )
            $startWith = trim($_SERVER["argv"][2]);
            
        CheckDir($dir, $startWith);
        
        echo "\nDone\n\n";
    }
}
else
    echo "usage: php prunevideo.php <directory>\n";

/**
* Recursively compress the text files in the given directory and all directories under it
*     
* @param mixed $dir
*/
function CheckDir($dir, $startWith = '')
{
    global $count;
    global $pruned;
    $count++;
    
    echo "\r$count ($pruned): Checking $dir                      ";
    
    $started = false;
    if( !strlen($startWith) )
        $started = true;

    // see if this is a directory we need to prune
    if( $started && is_dir("$dir/video_2") )
    {
      PruneDir($dir);
    }
    else
    {
      // recurse into any directories
      $f = scandir($dir);
      foreach( $f as $file )
      {
          if( !$started && $file == $startWith )
              $started = true;
              
          if( $started && is_dir("$dir/$file") && $file != '.' && $file != '..' )
              CheckDir("$dir/$file");
      }
      unset($f);
    }
}

/**
* Remove all video directories except for the median run
* 
* @param mixed $dir
*/
function PruneDir($dir)
{
    global $count;
    global $pruned;
    $pruned++;

    echo "\r$count ($pruned): Pruning $dir                      ";
    
    $pageData = loadAllPageData($dir);
    
    $fv = GetMedianRun($pageData, 0);
    if( $fv )
    {
      $keep = array();
      $keep[0] = "video_$fv";
      
      $rv = GetMedianRun($pageData, 1);
      if( $rv )
        $keep[1] = "video_{$rv}_cached";
      else
        $keep[1] = '';
        
      $f = scandir($dir);
      foreach( $f as $file )
      {
          if( !strncmp($file, 'video_', 6) && is_dir("$dir/$file") )
          {
            $del = true;
            if( !strcmp($file, $keep[0]) || !strcmp($file, $keep[1]) )
              $del = false;
              
            if( $del )
              RemoveDirectory("$dir/$file");
          }
      }
    }
    
    unset($pageData);
}

/**
* Recursively delete the given directory
* 
* @param mixed $dir
*/
function RemoveDirectory($dir)
{
  $f = scandir($dir);
  foreach( $f as $file )
  {
    if( is_file("$dir/$file") )
      unlink("$dir/$file");
    elseif( $file != '.' && $file != '..' )
      RemoveDirectory("$dir/$file");
  }
  unset($f);
  
  rmdir($dir);
}
?>
