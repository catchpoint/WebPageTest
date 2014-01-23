<?php
include 'common.inc';

// see if we are processing an import or presenting the UI
if (array_key_exists('devtools', $_FILES)) {
  if (ValidateKey()) {
    /****************************************************************************
    * Importing a test
    ****************************************************************************/
    $test = array('runs' => 1,
                  'discard' => 0,
                  'fvonly' => 1);
    $test['started'] = time();
    $test['private'] = array_key_exists('private', $_REQUEST) && $_REQUEST['private'] ? 1 : 0;
    $test['label'] = array_key_exists('label', $_REQUEST) && strlen($_REQUEST['label']) ? htmlspecialchars(trim($req_label)) : '';
    if (array_key_exists('tsview_id', $_REQUEST) && strlen($_REQUEST['tsview_id']))
      $test['tsview_id'] = $_REQUEST['tsview_id'];    
    
    // generate the test ID
    $test_num;
    $id = uniqueId($test_num);
    if( $test['private'] )
        $id = ShardKey($test_num) . md5(uniqid(rand(), true));
    else
        $id = ShardKey($test_num) . $id;
    $today = new DateTime("now", new DateTimeZone('UTC'));
    $test['id'] = $today->format('ymd_') . $id;
    $id = $test['id'];
    $testPath = './' . GetTestPath($id);
    $test['path'] = $testPath;
    if (!is_dir($testPath))
      mkdir($testPath, 0777, true);
    
    // move the dev tools file over
    if (array_key_exists('devtools', $_FILES) &&
        array_key_exists('tmp_name', $_FILES['devtools']) &&
        strlen($_FILES['devtools']['tmp_name'])) {
      move_uploaded_file($_FILES['devtools']['tmp_name'], "$testPath/1_devtools.json");
      gz_compress("$testPath/1_devtools.json");
    }
    
    // screen shot (if we got one)
    if (array_key_exists('screenshot', $_FILES) &&
        array_key_exists('tmp_name', $_FILES['screenshot']) &&
        array_key_exists('name', $_FILES['screenshot']) &&
        strlen($_FILES['screenshot']['tmp_name']) &&
        strlen($_FILES['screenshot']['name'])) {
      $ext = strtolower(pathinfo($_FILES['screenshot']['name'], PATHINFO_EXTENSION));
      if ($ext == 'png' || $ext == 'jpg')
        move_uploaded_file($_FILES['screenshot']['tmp_name'], "$testPath/1_screen.$ext");
    }

    // video (if we got one)
    if (array_key_exists('video', $_FILES) &&
        array_key_exists('tmp_name', $_FILES['video']) &&
        array_key_exists('name', $_FILES['video']) &&
        strlen($_FILES['video']['tmp_name']) &&
        strlen($_FILES['video']['name'])) {
      $ext = strtolower(pathinfo($_FILES['video']['name'], PATHINFO_EXTENSION));
      if ($ext == 'avi' || $ext == 'mp4') {
        $test['video'] = 1;
        move_uploaded_file($_FILES['video']['tmp_name'], "$testPath/1_video.$ext");
      }
    }

    // pcap
    if (array_key_exists('tcpdump', $_FILES) &&
        array_key_exists('tmp_name', $_FILES['tcpdump']) &&
        strlen($_FILES['tcpdump']['tmp_name'])) {
      move_uploaded_file($_FILES['tcpdump']['tmp_name'], "$testPath/1.cap");
    }
    
    // create the test info files
    gz_file_put_contents("$testPath/testinfo.json", json_encode($test));

    // write out the ini file
    $testInfo = "[test]\r\n";
    $testInfo .= "fvonly=1\r\n";
    $testInfo .= "runs=1\r\n";
    $testInfo .= "location=Imported Test\r\n";
    $testInfo .= "loc=Import\r\n";
    $testInfo .= "id=$id\r\n";
    if ($test['video'])
        $testInfo .= "video=1\r\n";
    $testInfo .= "connectivity=Unknown\r\n";
    $testInfo .= "\r\n[runs]\r\n";
    file_put_contents("$testPath/testinfo.ini",  $testInfo);
    
    // run the normal workdone processing flow
    $_REQUEST['id'] = $id;
    $_REQUEST['done'] = 1;
    $_REQUEST['run'] = 1;
    $_REQUEST['cached'] = 0;
    $included = true;
    chdir('./work');
    include('workdone.php');

    // re-load the test info
    $test = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    
    // Return the test ID (or redirect if not using the API)
    $host  = $_SERVER['HTTP_HOST'];
    $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
    if (array_key_exists('f', $_REQUEST)) {
      $ret = array();
      $ret['statusCode'] = 200;
      $ret['statusText'] = 'Ok';
      $ret['data'] = array();
      $ret['data']['testId'] = $test['id'];
      $ret['data']['ownerKey'] = $test['owner'];
      $ret['data']['jsonUrl'] = "http://$host$uri/results.php?test={$test['id']}&f=json";
      $ret['data']['xmlUrl'] = "http://$host$uri/xmlResult.php?test={$test['id']}";
      $ret['data']['userUrl'] = "http://$host$uri/results.php?test={$test['id']}";
      $ret['data']['summaryCSV'] = "http://$host$uri/csv.php?test={$test['id']}";
      $ret['data']['detailCSV'] = "http://$host$uri/csv.php?test={$test['id']}&requests=1";
      $ret['data']['jsonUrl'] = "http://$host$uri/jsonResult.php?test={$test['id']}";
      json_response($ret);
    } else {
      header("Location: http://$host$uri/results.php?test={$test['id']}");
    }
  } else {
    // Invalid API key = block if keys are configured (for now anyway)
    header('HTTP/1.0 403 Forbidden');
    echo 'Access Denied.  Invalid API Key';
  }
  
  /****************************************************************************
  * Display the import UI
  ****************************************************************************/
} else {
  $page_keywords = array('Import','Chrome Dev Tools','Webpagetest','Website Speed Test','Page Speed');
  $page_description = "Import Chrome Dev Tools.";
?>
<!DOCTYPE html>
<html>
  <head>
    <title>WebPagetest - Import Chrome Dev Tools</title>
    <meta http-equiv="charset" content="iso-8859-1">
    <meta name="author" content="Patrick Meenan">
    <?php $gaTemplate = 'Import'; include ('head.inc'); ?>
    <style type="text/css">
    #logo {float:right;}
    input[type="file"] {color:#FFF;}
    </style>
  </head>
  <body>
    <div class="page">
      <?php
      $tab = 'Import';
      include 'header.inc';
      ?>

      <form name="urlEntry" action="import.php" method="POST" enctype="multipart/form-data">
        <?php
        if (array_key_exists('f', $_REQUEST))
          echo "<input type=\"hidden\" name=\"f\" value=\"" . htmlspecialchars($_REQUEST['f']) . "\">\n";
        ?>
        <h2 class="cufon-dincond_black">Import an existing Dev Tools Trace...</h2>
        <p>The dev tools trace file is a JSON array of Network, Page, Console and Timeline dev tools messages from the remote debugging interface.</p>
        <p><a href="import_sample.txt">Here is a sample</a> of what it should look like.</p>
        <div id="test_box-container">
          <div id="analytical-review" class="test_box">
            <ul class="input_fields">
              <li>
                <input type="file" name="devtools" id="devtools" size="40">
                <label for="devtools">
                    Dev Tools File to import
                </label>
              </li>
              <li>
                <input type="file" name="screenshot" id="screenshot" size="40">
                <label for="screenshot">
                    Screen Shot<br><small>(optional - PNG or JPG)</small>
                </label>
              </li>
              <li>
                <input type="file" name="video" id="video" size="40">
                <label for="video">
                    Video<br><small>(optional - AVI or MP4)</small>
                </label>
              </li>
              <li>
                <input type="file" name="tcpdump" id="tcpdump" size="40">
                <label for="tcpdump">
                    tcpdump<br><small>(optional)</small>
                </label>
              </li>
              <li>
                <input type="checkbox" name="private" id="keep_test_private" class="checkbox">
                <label for="keep_test_private">Keep Test Private</label>
              </li>
              <li>
                <input type="text" name="label" id="label" value="" size="80">
                <label for="label">Label<br><small>(optional)</small></label>
              </li>
              <?php
              if (is_file('./settings/keys.ini')) {
                $key = '';
                if (array_key_exists('k', $_REQUEST))
                  $key = htmlspecialchars($_REQUEST['k']);
                echo '<li>
                      <input type="text" name="k" id="k" value="' . $key . '" size="80">
                      <label for="k">API Key<br><small>(required)</small></label>
                      </li>';
              }
              if (GetSetting('tsviewdb')) {
                echo '<li>
                      <input type="text" name="tsview_id" id="tsview_id" value="" size="80">
                      <label for="label">TSView ID<br><small>(optional - for time-series trending)</small></label>
                      </li>';
              }
              ?>
            </ul>
            <input type="submit" value="Submit">
          </div>
        </div>
      </form>            
      
      <?php include('footer.inc'); ?>
    </div>
  </body>
</html>

<?php
}

function ValidateKey() {
  $valid = false;
  if (!is_file('./settings/keys.ini')) {
    $valid = true;
  } elseif (array_key_exists('k', $_REQUEST) && strlen($_REQUEST['k'])) {
    $keys = parse_ini_file('./settings/keys.ini', true);
    if ($keys && is_array($keys) && array_key_exists($_REQUEST['k'], $keys))
      $valid = true;
  }
  return $valid;
}
?>
