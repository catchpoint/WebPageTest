<?php
$debug = true;
include 'common.inc';
if (!$admin) {
  header('HTTP/1.0 403 Forbidden');
  exit;
}
if (isset($_REQUEST['name']) && isset($_FILES['apk']['tmp_name']) && isset($_FILES['apk']['name'])) {
  $lock = Lock('BrowserUpload', true, 30);
  if ($lock) {
    $valid = false;
    $is_chromium_chrome = false;
    $uploadResult = 'Error processing ' . htmlspecialchars($_FILES['apk']['name']);
    $zip = new ZipArchive();
    if ($zip->open($_FILES['apk']['tmp_name'])) {
      if ($zip->statName('assets/chrome_100_percent.pak') !== false) {
        $is_chromium_chrome = true;
      }
      if ($is_chromium_chrome || $zip->statName('assets/content_shell.pak') !== false) {
        $name = $_REQUEST['name'];
        if (preg_match('/[a-zA-Z0-9_\-]+/', $name)) {
          if (!is_file("./browsers/$name.apk")) {
            $valid = true;
          } else {
            $uploadResult = "ERROR: A browser named $name already exists";
          }
        } else {
            $uploadResult = 'ERROR: Invalid browser name: ' . htmlspecialchars($name);
        }
      }
      $zip->close();
    }
    if ($valid) {
      if (move_uploaded_file($_FILES['apk']['tmp_name'], "./browsers/$name.apk")) {
        $apk_settings = $is_chromium_chrome
          // Chrome public
          ? array( 'package' => 'org.chromium.chrome',
            'activity' => 'com.google.android.apps.chrome.Main',
            'flagsFile' => '/data/local/chrome-command-line',
            'socket' => 'localabstract:chrome_devtools_remote')
          // content shell
          : array( 'package' => 'org.chromium.content_shell_apk',
            'activity' => 'org.chromium.content_shell_apk.ContentShellActivity',
            'flagsFile' => '/data/local/tmp/content-shell-command-line',
            'socket' => 'localabstract:content_shell_devtools_remote');

        file_put_contents("./browsers/$name.json", json_encode($apk_settings));
        $md5 = md5_file("./browsers/$name.apk");
        if ($md5 !== false) {
          $md5 = strtoupper($md5);
          $browsers = @file_get_contents('./browsers/browsers.ini');
          if (!$browsers || !strlen($browsers))
            $browsers = "[browsers]";
          $browsers .= "\n$name=$md5";
          file_put_contents('./browsers/browsers.ini', $browsers);
          $uploadResult = "Custom APK added: $name";
        } else {
          $uploadResult = "Error calculating md5";
          unlink("./browsers/$name.apk");
          unlink("./browsers/$name.json");
        }
      }
    }
    Unlock($lock);
  }
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPageTest - Custom Browsers</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <?php include ('head.inc'); ?>
        <style type="text/css">
        .browsers td {
          text-align: left !important;
          padding-right: 20px !important;
        }
        .browsers {
          margin-left: 0 !important;
        }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'custom';
            include 'header.inc';
            ?>

            <div class="translucent">
                <?php
                if (isset($uploadResult)) {
                  echo $uploadResult;
                }
                ?>
                <h2>Upload Custom Android Build</h2>
                Upload an <a href="https://code.google.com/p/chromium/wiki/AndroidBuildInstructions">Android Content Shell or Chrome public apk</a> (content_shell_apk or chrome_public_apk build target).
                <form name="upload" method="POST" action="custom_browsers.php" enctype="multipart/form-data">
                <br>
                <label for="name">
                    Friendly Name
                </label>
                <input type="text" name="name" id="name" size="40"> <small>(Alpha-numeric, underscores, dashes, no spaces)</small><br><br>
                <label for="apk">
                    APK File
                </label>
                <input type="file" name="apk" id="apk" size="40" accept=".apk">
                <input type="submit" value="Upload">
                </form>
                <h2>Available Android Browsers</h2>
                <?php
                DisplayBrowsers('apk');
                ?>
                <h2>Available Desktop Browsers</h2>
                <?php
                DisplayBrowsers('zip');
                ?>
            </div>

            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php
function DisplayBrowsers($ext) {
  $browsers = array();
  $files = glob("./browsers/*.$ext");
  foreach ($files as $file) {
    $name = basename($file, ".$ext");
    $browsers[$name] = filemtime($file);
  }
  if (count($browsers)) {
    arsort($browsers);
    echo '<table class="pretty browsers"><tr><th>Browser</th><th>Uploaded</th></tr>';
    foreach($browsers as $name => $time) {
      echo '<tr><td>';
      echo htmlspecialchars($name);
      echo '</td><td>';
      echo date('M j, Y h:i a', $time) . ' GMT';
      echo '</td></tr>';
    }
    echo '</table>';
  }
}
?>
