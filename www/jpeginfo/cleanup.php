<?php
ignore_user_abort(true);
chdir('..');  
set_time_limit(36000);

// Recursively walk the jpeginfo results directory and
// delete anything that was last accessed more than a day ago
ScanDirectory('./results/jpeginfo', false);

function ScanDirectory($dir, $delete) {
  if (is_dir($dir)) {
    $files = scandir($dir);
    foreach ($files as $file) {
      if ($file != '.' && $file != '..') {
        if (is_file("$dir/$file")) {
          $elapsed = 86400;
          $timestamp = filemtime("$dir/$file");
          if ($timestamp)
              $elapsed = max(time() - $timestamp, 0);
          if ($elapsed >= 86400)
            @unlink("$dir/$file");
        } else
          ScanDirectory("$dir/$file", true);
      }
    }
    if ($delete)
      @rmdir($dir);
  }
}
?>
