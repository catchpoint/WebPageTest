<?php
chdir('..');
include 'jpeginfo/jpeginfo.inc.php';
if (array_key_exists('url', $_REQUEST) &&
    strlen($_REQUEST['url'])) {
  $url = trim($_REQUEST['url']);
  echo "<!DOCTYPE html>\n<html>\n<head>\n</head>\n<body>\n";
  echo "JPEG Analysis for <a href=\"" . htmlspecialchars($url) . "\">" . htmlspecialchars($url) . "</a><br><br>";
  $id = sha1($url);
  $path = GetPath($id);
  if (!is_file($path))
    GetUrl($url, $path);
  if (is_file($path))
    AnalyzeFile($path);
  echo "</body>\n</html>";
} elseif (array_key_exists('id', $_REQUEST) &&
        strlen($_REQUEST['id']) &&
        ctype_alnum($_REQUEST['id'])) {
  echo "<!DOCTYPE html>\n<html>\n<head>\n</head>\n<body>\n";
  $path = GetPath(trim($_REQUEST['id']));
  if (is_file($path))
    AnalyzeFile($path);
  else
    echo "Invalid ID";
  echo "</body>\n</html>";
} elseif (array_key_exists('imgfile', $_FILES) &&
          array_key_exists('tmp_name', $_FILES['imgfile']) &&
          is_file($_FILES['imgfile']['tmp_name'])) {
  $id = sha1(file_get_contents($_FILES['imgfile']['tmp_name']));
  $path = GetPath($id);
  if (!is_file($path)) {
    $dir = dirname($path);
    if (!is_dir($dir))
      mkdir($dir, 0777, true);
    move_uploaded_file($_FILES['imgfile']['tmp_name'], $path);
  }
  $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
  header("Location: $protocol://{$_SERVER['HTTP_HOST']}{$_SERVER['PHP_SELF']}?id=$id");
} else {
  echo "<!DOCTYPE html>\n<html>\n<head>\n</head>\n<body>\n";
  echo "No image file provided";
  echo "</body>\n</html>";
}

function GetPath($id) {
  if (!is_dir('./results/jpeginfo'))
    mkdir('./results/jpeginfo');
  $path = realpath('./results/jpeginfo') . '/' . implode('/', str_split(trim($id), 4));
  return $path;
}

function AnalyzeFile($path) {
  if (is_file($path)) {
    touch($path);
    if (is_file("$path.info")) {
      $info = json_decode(file_get_contents("$path.info"), true);
      touch("$path.info");
    } else {
      $info = GetJpegInfo($path);
      if ($info !== false)
        file_put_contents("$path.info", json_encode($info));
    }
    if (isset($info) && $info !== false) {
        echo "<h2>Stats</h2>";
        echo "Image Type: ";
        if ($info['progressive'])
          echo "Progressive (Renders from blurry to sharp)<br>Scan Count: {$info['scans']}<br>";
        else
          echo "Baseline (Renders top-down)<br>";
        echo "File Size: " . number_format($info['filesize']) . ' bytes<br>';
        echo "Application Data: " . number_format($info['appdata']) . ' bytes (' . number_format(($info['appdata'] / $info['filesize']) * 100, 1) . '%)<br>';

        // create the lossless optimized version
        $optFile = "$path.opt";
        if (!is_file($optFile)) {
          $cmd = 'jpegtran -progressive -optimize -copy none ' . escapeshellarg($path) . ' > ' . escapeshellarg($optFile);
          exec($cmd, $result);
        }
        if (is_file($optFile)) {
          touch($optFile);
          $optsize = filesize($optFile);
          if ($optsize) {
            echo "Optimized Size (Lossless): " . number_format($optsize) . ' bytes (' . number_format((($info['filesize'] - $optsize) / $info['filesize']) * 100, 1) . '% smaller)<br>';
            $optData = file_get_contents($optFile);
          }
        }
          
        $jpeg = "$path.85";
        if (!is_file($jpeg)) {
          $im = imagecreatefromjpeg($path);
          if ($im !== false) {
            $jpeg = "$path.85";
            imageinterlace($im, 1);
            imagejpeg($im, $jpeg, 85);
            imagedestroy($im);
          }
        }
        if (is_file($jpeg)) {
          touch($jpeg);
          $jpegsize = filesize($jpeg);
          if ($jpegsize) {
            echo "Quality 85 Size (Lossy): " . number_format($jpegsize) . ' bytes (' . number_format((($info['filesize'] - $jpegsize) / $info['filesize']) * 100, 1) . '% smaller)<br>';
            $jpegData = file_get_contents($jpeg);
          }
        }

        if (is_file($path)) {
          echo "<h2>Image (" . number_format($info['filesize']) . " bytes)</h2>";
          echo '<img src="data:image/jpeg;base64,';
          echo base64_encode(file_get_contents($path));
          echo '"><br><br>';
        }
        
        if (isset($optData)) {
          echo "<h2>Optimized Image - Lossless (" . number_format($optsize) . " bytes)</h2>";
          echo '<img src="data:image/jpeg;base64,';
          echo base64_encode($optData);
          echo '"><br><br>';
        }

        if (isset($jpegData)) {
          echo "<h2>Quality 85 Image - Lossy (" . number_format($jpegsize) . " bytes)</h2>";
          echo '<img src="data:image/jpeg;base64,';
          echo base64_encode($jpegData);
          echo '"><br><br>';
        }
                
        $exifFile = "$path.exif";
        if (is_file($exifFile)) {
          $exif = json_decode(file_get_contents($exifFile), true);
          touch($exifFile);
        } else {
          $cmd = 'exiftool -j -g ' . escapeshellarg($path);
          exec($cmd, $cmdData);
          if (isset($cmdData) && is_array($cmdData)) {
            $exif = json_decode(implode('', $cmdData), true);
            if ($exif !== false && is_array($exif))
              file_put_contents($exifFile, json_encode($exif));
          }
        }
        if (isset($exif) && $exif !== false && is_array($exif) && array_key_exists(0, $exif)) {
          if (array_key_exists('SourceFile', $exif[0]))
            unset($exif[0]['SourceFile']);
          if (array_key_exists('ExifTool', $exif[0]))
            unset($exif[0]['ExifTool']);
          if (array_key_exists('File', $exif[0])) {
            foreach ($exif[0]['File'] as $key => $value)
              if (stripos($key, 'File') !== false ||
                  $key == 'Directory' ||
                  $key == 'MIMEType')
                unset($exif[0]['File'][$key]);
          }
          echo "<h2>EXIF Data</h2><pre>";
          PrintArray($exif[0], '');
          echo "</pre><br>";
        }
    } else {
      echo "File is not a JPEG Image";
    }
  } else {
    echo "Temp image file not found";
  }
}

function GetUrl($url, $path) {
  $ret = false;
  if (strlen($url)) {
    if (strcasecmp(substr($url, 0, 4), 'http'))
      $url = "http://$url";
    global $imageFile;
    $dir = dirname($path);
    if (!is_dir($dir))
      mkdir($dir, 0777, true);
    $imageFile = fopen($path, 'w');
    if ($imageFile !== false) {
      if (FetchUrl($url)) {
        fclose($imageFile);
        if (filesize($path))
          $ret = true;
      } else {
        fclose($imageFile);
        echo "Error fetching " . htmlspecialchars($url);
      }
      if (!$ret)
        unlink($path);
    } else
      echo "Error creating temp file";
  } else
    echo "Invalid URL";
  return $ret;
}

function FetchUrl($url) {
  $ret = false;
  if (function_exists('curl_init')) {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)');
    curl_setopt($curl, CURLOPT_FILETIME, true);
    curl_setopt($curl, CURLOPT_FAILONERROR, true);
    curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 30);
    curl_setopt($curl, CURLOPT_DNS_CACHE_TIMEOUT, 30);
    curl_setopt($curl, CURLOPT_MAXREDIRS, 10);
    curl_setopt($curl, CURLOPT_TIMEOUT, 30);
    curl_setopt($curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
    curl_setopt($curl, CURLOPT_WRITEFUNCTION, 'WriteCallback');
    if (curl_exec($curl) !== false)
      $ret = true;
    curl_close($curl);
  }
  return $ret;
}

function WriteCallback($curl, $data) {
  global $imageFile;
  fwrite($imageFile, $data);
  return strlen($data);
}

function PrintArray($data, $indent) {
  foreach ($data as $key => &$value) {
    if (is_array($value)) {
      echo htmlspecialchars("$indent$key:\n");
      PrintArray($value, $indent . '  ');
    } else {
      echo htmlspecialchars("$indent$key: " . preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x80-\x9F]/u', '', $value) . "\n");
    }
  }
}

?>