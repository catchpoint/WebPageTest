<?php
// Check the firefox nightly builds FTP server for an updated nightly build
chdir(__DIR__);
set_time_limit(3600);
$server = 'ftp.mozilla.org';
$dir = '/pub/mozilla.org/firefox/nightly/latest-trunk/';
$ftp = ftp_connect($server);
$remote_file = null;
$remote_file_ver = 0;
$remote_file_time = 0;
if ($ftp) {
  if (ftp_login($ftp, 'anonymous', 'webpagetest@webpagetest.org')) {
    ftp_pasv($ftp, true);
    $files = ftp_nlist($ftp, $dir);
    foreach ($files as $file) {
      if (preg_match('/firefox-(?P<ver>[0-9]+)[a-zA-Z0-9\.]+\.en-US\.win32\.installer\.exe$/', $file, $matches)) {
        $file = $matches[0];
        $ver = intval($matches['ver']);
        $time = ftp_mdtm($ftp, "$dir$file");
        if ($ver && $time && $time > $remote_file_time) {
          $remote_file = $file;
          $remote_file_ver = $ver;
          $remote_file_time = $time;
        }
      }
    }
    
    if (isset($remote_file)) {
      // see if it is a new file
      $local_file = "nightly-$ver-$time.exe";
      if (!is_file($local_file)) {
        $valid_md5 = strtoupper(GetMD5());
        if ($valid_md5) {
          if (ftp_get($ftp, $local_file, "$dir$remote_file", FTP_BINARY)) {
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
  ftp_close($ftp);
}

function GetMD5() {
  global $ftp;
  global $dir;
  global $remote_file;
  $md5 = null;
  $checksum_file = str_replace('.installer.exe', '.checksums', $remote_file);
  $local_checksums = 'nightly-checksums.dat';
  if (is_file($local_checksums))
    unlink($local_checksums);
  if (ftp_get($ftp, $local_checksums, "$dir$checksum_file", FTP_ASCII)) {
    $checksums = file($local_checksums);
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
  }
  if (is_file($local_checksums))
    unlink($local_checksums);
  return $md5;
}
?>
