<?php
require_once('testStatus.inc');
require_once('logging.inc');
require_once('common_lib.inc');

/**
* See if the file should be skipped when archiving (usually just cache files)
* 
* @param mixed $file
*/
function ArchiveSkipFile($file) {
  $skip = false;
  if ($file == 'archive.me' ||
      preg_match('/\.pageData.\d+\.gz$/', $file) ||
      preg_match('/\.requests.\d+\.gz$/', $file) ||
      preg_match('/\.devToolsCPUTime.\d+\.gz$/', $file)) {
    $skip = true;
  }
  return $skip;
}

/**
* Archive the given test if it hasn't already been archived
* For now this will just zip and move to a location on disk
* but will eventually integrate with the S3 archiving
* 
* @param mixed $id
*/
function ArchiveTest($id, $store_result = true, $delete = false) {
    global $settings;
    global $api_keys;
    $ret = false;
    if ( strpos($id, '.') === false &&                           // make sure it isn't a relay test
        (array_key_exists('archive_dir', $settings) ||           // local mount
        array_key_exists('archive_s3_server', $settings)) ) {    // S3 Interface (Internet Archive or standard)
        $status = GetTestStatus($id, false);
        $completed = true;
        if ($status['statusCode'] >= 100 && $status['statusCode'] < 200)
            $completed = false;
        $testPath = realpath('./' . GetTestPath($id));
        $testInfo = GetTestInfo($id);
        if ($testInfo && ($completed || $testInfo['batch'])) {
            if (GetSetting('archive_dir') == '/dev/null') {
              $ret = true;
            } else {
              if( isset($testInfo['archived']) && $testInfo['archived'] ) {
                  if (VerifyArchive($id)) {
                      $ret = true;
                  } else {
                      $zipFile = GetArchiveFile($id, true);
                      unlink($zipFile);
                      $testInfo['archived'] = false;
                      SaveTestInfo($id, $testInfo);
                  }
              }
              
              if (!$ret) {
                $lock = LockTest($id);
                if (isset($lock)) {
                  $testInfo = GetTestInfo($id);
                  $zipFile = "./tmp/$id.zip";
                  // zip up the contents
                  if (is_dir($testPath) === true) {
                      $count = 0;
                      $zip = new ZipArchive();
                      if ($zip->open($zipFile, ZIPARCHIVE::CREATE) === true) {
                          // add the files
                          $files = scandir($testPath);
                          foreach ($files as $file) {
                              $filePath = "$testPath/$file";
                              if (is_file($filePath)) {
                                if (!ArchiveSkipFile($file)) {
                                  $count++;
                                  $zip->addFile($filePath, $file);
                                }
                              } else if ($file != '.' && $file != '..' && is_dir($filePath)) {
                                  $subFiles = scandir($filePath);
                                  if ($subFiles) {
                                      $zip->addEmptyDir($file);
                                      foreach ($subFiles as $subFile) {
                                          if( is_file("$filePath/$subFile") )
                                              $zip->addFile("$filePath/$subFile", "$file/$subFile");
                                      }
                                  }
                              }
                          }
                          $zip->close();
                          
                          // move the archive to it's final destination
                          if ($count && is_file($zipFile)) {
                              if (array_key_exists('archive_dir', $settings)) {
                                  $dest = GetArchiveFile($id, true);
                                  if (rename($zipFile, $dest)) {
                                      if (VerifyArchive($id))
                                          $ret = true;
                                  }
                              } elseif (array_key_exists('archive_s3_server', $settings) && 
                                          array_key_exists('archive_s3_key', $settings) && 
                                          array_key_exists('archive_s3_secret', $settings) && 
                                          array_key_exists('archive_s3_bucket', $settings)) {
                                  // post the file to a S3-style bucket (just supporting Internet archive right now)
                                  require_once('./lib/S3.php');
                                  $s3 = new S3(trim($settings['archive_s3_key']), trim($settings['archive_s3_secret']), false, trim($settings['archive_s3_server']));
                                  $separator = strrpos($id, '_');
                                  if ($separator !== false) {
                                      $bucket = $settings['archive_s3_bucket'];
                                      $file = "$id.zip";
                                      $metaHeaders = array();
                                      $requestHeaders = array();
                                      if (trim($settings['archive_s3_server']) == 's3.us.archive.org') {
                                          // special-case Internet Archive storage
                                          $bucket = $settings['archive_s3_bucket'] . '_' . substr($id, 0, $separator);
                                          $file = substr($id, $separator + 1);
                                          $requestHeaders = array('x-archive-queue-derive' => '0',
                                                                  'x-archive-meta-collection' => 'httparchive',
                                                                  'x-archive-auto-make-bucket' => '1');
                                      }
                                      if ($s3->putObject($s3->inputFile($zipFile, false), $bucket, $file, S3::ACL_PRIVATE, $metaHeaders, $requestHeaders))
                                          $ret = true;
                                  }
                              }
                          } 
                          // make sure we don't leave a file hanging around
                          if (is_file($zipFile))
                              unlink($zipFile);
                          if ($ret && $store_result) {
                              $testInfo['archived'] = true;
                              SaveTestInfo($id, $testInfo);
                          }
                      }
                  }
                  UnlockTest($lock);
                }
              }
            }
        }
        if ($ret && $delete && is_dir($testPath))
          delTree("$testPath/");
    }
      
    return $ret;
}

/**
* Restore the given test from the archive if it is archived
* 
* @param mixed $id
*/
function RestoreArchive($id) {
    $ret = false;
    if (strpos($id, '.') === false && GetSetting('archive_dir') != '/dev/null') {
        global $settings;
        $testPath = './' . GetTestPath($id);
        $url = '';
        // see if we have a http path where the file is archived
        $check_dir = $testPath;
        for ($i = 0; $i <= 4; $i++) {
            $check_dir = dirname($check_dir);
            if (is_file("$check_dir/archive.dat")) {
                $url = trim(file_get_contents("$check_dir/archive.dat"));
                if (strlen($url))
                    break;
            }
        }
        if (strlen($url) || 
            array_key_exists('archive_dir', $settings) || 
            array_key_exists('archive_s3_url', $settings) ||
            array_key_exists('archive_s3_server', $settings)) {
            $deleteZip = true;
            $zipfile = "./tmp/$id.zip";
            if (strlen($url)) {
                $url .= "/$id.zip";
            } else {
                if (isset($settings['archive_dir'])) {
                    $deleteZip = false;
                    $zipfile = GetArchiveFile($id);
                    if (is_file($zipfile))
                        touch($zipfile);
                } elseif (isset($settings['archive_s3_url'])) {
                    $separator = strrpos($id, '_');
                    if ($separator !== false) {
                        $bucket = $settings['archive_s3_bucket'];
                        $file = "$id";
                        if (trim($settings['archive_s3_server']) == 's3.us.archive.org') {
                            // special-case Internet Archive storage
                            $bucket = $settings['archive_s3_bucket'] . '_' . substr($id, 0, $separator);
                            $file = substr($id, $separator + 1);
                        }
                        $url = trim($settings['archive_s3_url']) . "$bucket/$file.zip";
                    }
                } elseif (array_key_exists('archive_s3_server', $settings) && 
                            array_key_exists('archive_s3_key', $settings) && 
                            array_key_exists('archive_s3_secret', $settings) && 
                            array_key_exists('archive_s3_bucket', $settings)) {
                    require_once('./lib/S3.php');
                    $s3 = new S3(trim($settings['archive_s3_key']), trim($settings['archive_s3_secret']), false, trim($settings['archive_s3_server']));
                    $bucket = $settings['archive_s3_bucket'];
                    $file = "$id.zip";
                    $s3->getObject($bucket, $file, $zipfile);
                }
            }
            if (strlen($url)) {
                logMsg("Downloading: $url");
                $data = file_get_contents($url);
                if ($data) {
                    logMsg("Saving: $url to $zipfile");
                    file_put_contents($zipfile, $data);
                    unset($data);
                }
            }
            if (is_file($zipfile)) {
              if (!is_dir($testPath))
                  mkdir( $testPath, 0777, true );
              $lock = LockTest($id);
              if (isset($lock)) {
                ZipExtract($zipfile, $testPath);
                $ret = true;
                $testInfo = GetTestInfo($id);
                if ($testInfo) {
                  $testInfo['archived'] = true;
                  $testInfo['restored'] = true;
                  $testInfo['restoredDataOnly'] = false;
                  SaveTestInfo($id, $testInfo);
                }
                UnlockTest($lock);
              }
              if ($deleteZip)
                @unlink($zipfile);
            }
        }
        else
            $ret = true;
    }
        
    return $ret;
}

/**
* Verify the archive for the given test (deep verification)
* 
* @param mixed $id
*/
function VerifyArchive($id) {
    $valid = true;
    global $settings;
    
    if (!GetSetting('trust_archive') && GetSetting('archive_dir') != '/dev/null') {
        if (isset($settings['archive_dir'])) {
            // local
            $valid = false;
            $testPath = realpath('./' . GetTestPath($id));
            $archive = GetArchiveFile($id);
            if (is_dir($testPath) && is_file($archive)) {
                chmod($archive, 0777);
                $zip = new ZipArchive;
                if ($zip->open($archive) === TRUE) {
                    // check for some basic files
                    if ($zip->locateName('testinfo.ini') !== false &&
                        ($zip->locateName('testinfo.json') !== false || $zip->locateName('testinfo.json.gz') !== false)) {
                        $valid = true;
                        // now loop through the original directory and make sure all of the data files are present in the archive
                        $files = scandir($testPath);
                        foreach ($files as $file) {
                            if (strpos($file, '.txt') !== false && strpos($file, '_status.txt') === false) {
                                $index = $zip->locateName($file);
                                if ($index === false) {
                                    logMsg("$id - Missing $file ($archive)");
                                    $valid = false;
                                    break;
                                } else {
                                    $info = $zip->statIndex($index);
                                    if (!$info['size']) {
                                        logMsg("$id - Invalid file size for $file ($archive)");
                                        $valid = false;
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        logMsg("$id - Missing key files ($archive)");
                    }
                    $zip->close();
                } else {
                    logMsg("$id - Zip file failed to open ($archive)");
                }
            } else {
                logMsg("$id - Zip file missing ($archive)");
            }
        } elseif (array_key_exists('archive_s3_server', $settings) && 
                    array_key_exists('archive_s3_key', $settings) && 
                    array_key_exists('archive_s3_secret', $settings) && 
                    array_key_exists('archive_s3_bucket', $settings) &&
                    trim($settings['archive_s3_server']) != 's3.us.archive.org') {
            // S3
            $valid = false;
            require_once('./lib/S3.php');
            $s3 = new S3(trim($settings['archive_s3_key']), trim($settings['archive_s3_secret']), false, trim($settings['archive_s3_server']));
            $bucket = $settings['archive_s3_bucket'];
            $file = "$id.zip";
            if (($info = $s3->getObjectInfo($bucket, $file)) !== false) {
                $valid = true;
            }
        }
    }
        
    return $valid;
}

/**
* Generate the file name for the given archive file
* 
* @param mixed $id
* @param mixed $create_directory
*/
function GetArchiveFile($id, $create_directory = false)
{
    global $settings;
    $file = null;
    if (isset($settings['archive_dir']) && strlen($id)) {
        $testPath = GetTestPath($id);
        if (strlen($testPath)) {
            $file = $settings['archive_dir'] . $testPath . '.zip';
            if ($create_directory) {
                $dir = dirname($file);
                if(!is_dir($dir)) {
                    mkdir($dir, 0777, true);
                }
            }
        }
    }
    return $file;
}

function ArchiveApi($id) {
  // For tests driven through the API, flag them as available for
  // archiving as soon as they are accessed (if the setting is enabled)
  if (GetSetting('archive_api')) {
    $testPath = realpath('./' . GetTestPath($id));
    touch("$testPath/archive.me");
  }
}
?>
