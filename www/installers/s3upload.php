<?php
require_once __DIR__ . '/../lib/aws_v3/aws-autoloader.php';
use Aws\S3\S3Client;
use Aws\S3\Exception\S3Exception;
$settings_file = __DIR__ . '/../settings/s3installers.ini';

$dat_files = array();
if (is_file($settings_file)) {
  $settings = parse_ini_file($settings_file, true);
  if (isset($settings) && is_array($settings)) {
    $files = array();
    BuildFileList(__DIR__, $files);
    echo count($files) . " installer files found\r\n";
    if (isset($settings['buckets'])) {
      foreach ($settings['buckets'] as $region => $bucket) {
        echo "\r\nUploading to $bucket:\r\n";
        foreach ($files as $file) {
          echo "  Uploading $file...";
          UploadFile($file, $region, $bucket, $settings);
          echo "\r\n";
        }
        foreach ($dat_files as $dat_file) {
          echo "  Uploading dat file $dat_file...";
          UploadDatFile($dat_file, $region, $bucket, $settings);
          echo "\r\n";
        }
      }
    }
  }
}
echo "Done\r\n";

function BuildFileList($dir, &$files) {
  global $dat_files;
  $entries = scandir($dir);
  if (isset($entries) && is_array($entries)) {
    foreach ($entries as $entry) {
      $path = "$dir/$entry";
      if (is_dir($path)) {
        if ($entry != '.' && $entry != '..') {
          BuildFileList($path, $files);
        }
      } elseif (is_file($path)) {
        $path_parts = pathinfo($path);
        if ($path_parts['extension'] == 'dat') {
          ProcessDatFile($path, $files);
          $pos = strpos($path, 'installers/');
          if ($pos > 0) {
            $dat_files[] = substr($path, $pos);
          }
        }
      }
    }
  }
}

function ProcessDatFile($path, &$files) {
  $lines = file($path);
  if (isset($lines) && is_array($lines)) {
    foreach($lines as $line) {
      $line = trim($line);
      $separator = strpos($line, '=');
      if (substr($line, 0, $separator) == 'url') {
        $url = substr($line, $separator + 1);
        $pos = strpos($url, 'installers/');
        if ($pos > 0) {
          $file = substr($url, $pos);
          if (is_file(__DIR__ . '/../' . $file)) {
            $filename_hash = sha1($file);
            $files[$filename_hash] = $file;
          }
        }
      }
    }
  }
}

function UploadFile($file, $region, $bucket, $settings) {
  $local_file = __DIR__ . '/../' . $file;
  if (isset($settings['config']['key']) && isset($settings['config']['secret'])) {
    try {
      $s3 = S3Client::factory(array('version' => '2006-03-01',
                                    'region' => $region,
                                    'scheme' => 'http',
                                    'credentials' => array('key' => $settings['config']['key'],
                                                           'secret' => $settings['config']['secret'])
                                    ));
      $exists = false;
      try {
        if ($s3->headObject(array('Bucket' => $bucket,
                                  'Key' => $file))) {
          $exists = true;
        }
      } catch (\Aws\S3\Exception\S3Exception $e) {
      }
      if (!$exists) {
        if ($s3->putObject(array('Bucket' => $bucket,
                                 'Key' => $file,
                                 'SourceFile' => $local_file,
                                 'ACL' => 'public-read'))) {
          $result = 'OK';
        } else {
          $result = 'ERROR uploading';
        }
      } else {
        $result = 'Skipping, already there';
      }
    } catch (\Aws\S3\Exception\S3Exception $e) {
      $result = 'ERROR: ' . $e->getMessage();
    }
  } else {
    $result = 'ERROR, not configured';
  }
  
  echo $result;
}

function UploadDatFile($file, $region, $bucket, $settings) {
  $local_file = __DIR__ . '/../' . $file;
  if (isset($settings['config']['key']) && isset($settings['config']['secret'])) {
    try {
      $s3 = S3Client::factory(array('version' => '2006-03-01',
                                    'region' => $region,
                                    'scheme' => 'http',
                                    'credentials' => array('key' => $settings['config']['key'],
                                                           'secret' => $settings['config']['secret'])
                                    ));
      $body = file_get_contents($local_file);
      if (isset($body) && $body !== FALSE && strlen($body)) {
        // Replace the http://cdn.webpagetest.org/ URL prefix with the
        // correct URL for this bucket
        $bucket_url = "http://$bucket.s3.amazonaws.com/";
        $body = str_replace('http://cdn.webpagetest.org/', $bucket_url, $body);
        if ($s3->putObject(array('Bucket' => $bucket,
                                 'Key' => $file,
                                 'Body' => $body,
                                 'ACL' => 'public-read'))) {
          $result = 'OK';
        } else {
          $result = 'ERROR uploading';
        }
      }
    } catch (\Aws\S3\Exception\S3Exception $e) {
      $result = 'ERROR: ' . $e->getMessage();
    }
  } else {
    $result = 'ERROR, not configured';
  }
  
  echo $result;
}
?>
