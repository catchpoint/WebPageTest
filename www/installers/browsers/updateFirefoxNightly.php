<?php
// Check the firefox nightly builds FTP server for an updated nightly build
chdir(__DIR__);
set_time_limit(3600);
$remote_file = null;
$remote_file_ver = 0;
$remote_file_time = 0;
$base_url = 'http://archive.mozilla.org/pub/firefox/nightly/latest-mozilla-central/';
$html = file_get_contents($base_url);
if ($html) {
  if (preg_match_all('/<tr>.*?<\/tr>/ms', $html, $rows) && isset($rows[0]) && is_array($rows[0])) {
    foreach ($rows[0] as $row) {
      if (preg_match('/href=\"(?P<path>[^\"]*(?P<file>firefox-(?P<ver>[0-9]+)[a-zA-Z0-9\.]+\.en-US\.win32\.installer\.exe))[^\n]*\n[^\n]*\n[^>]*>(?P<time>[^<]*)/', $row, $matches)) {
        $file = $matches['file'];
        $ver = intval($matches['ver']);
        $time = strtotime(trim($matches['time']));
        if ($ver && $time && $time > $remote_file_time) {
          $remote_file = $file;
          $remote_file_ver = $ver;
          $remote_file_time = $time;
        }
      }
    }
  }
  
  if (isset($remote_file)) {
    // see if it is a new file
    $local_file = "nightly-$ver-$time.exe";
    if (!is_file($local_file)) {
      $valid_md5 = strtoupper(GetMD5());
      if ($valid_md5) {
        if (file_put_contents($local_file, file_get_contents("$base_url$remote_file"))) {
          $md5 = strtoupper(md5_file($local_file));
          if ($md5 == $valid_md5) {
            // write out the new nightly dat file
            file_put_contents('nightly.dat',
              "browser=Nightly\r\n" .
              "url=http://www.webpagetest.org/installers/browsers/$local_file\r\n" .
              "md5=$md5\r\n" .
              "version=$remote_file_ver.$remote_file_time\r\n" .
              "command=$local_file -ms\r\n" .
              "update=1\r\n");
            
            // delete any nightlies more than a week old
            $files = glob("nightly-*");
            if ($files) {
              $earliest = time() - 604800; // 1 week
              foreach($files as $file) {
                if (filemtime($file) < $earliest)
                  unlink($file);
              }
            }
          } elseif (is_file($local_file)) {
            unlink($local_file);
          }
        }
      }
    }
  }
}

function GetMD5() {
  global $ftp;
  global $dir;
  global $remote_file;
  global $base_url;
  $md5 = null;
  $checksum_file = str_replace('.installer.exe', '.checksums', $remote_file);
  $checksums = file("$base_url$checksum_file");
  if ($checksums && is_array($checksums)) {
    foreach ($checksums as $line) {
      if (strstr($line, $remote_file) !== FALSE) {
        list($hash, $type, $size, $file) = explode(' ', trim($line));
        if ($type == 'md5') {
          $md5 = $hash;
          break;
        }
      }
    }
  }
  return $md5;
}
?>
