<?php
include 'common.inc';

// see if we are processing an import or presenting the UI
if (array_key_exists('tests', $_REQUEST)) {
    require_once('page_data.inc');
    
    /****************************************************************************
    * Creating a bulk test from existing tests
    ****************************************************************************/
    $error = null;
    $tests = explode(',', $_REQUEST['tests']);

    $test = array('batch' => 1);
    $test['id'] = CreateTestID();
    $id = $test['id'];
    $testPath = './' . GetTestPath($id);
    $test['path'] = $testPath;
    if (!is_dir($testPath))
      mkdir($testPath, 0777, true);

    // create the test info files
    SaveTestInfo($id, $test);

    // write out the ini file
    $testInfo = "[test]\r\n";
    $testInfo .= "batch=1\r\n";
    $testInfo .= "location=Imported Test\r\n";
    $testInfo .= "loc=Import\r\n";
    $testInfo .= "id=$id\r\n";
    if ($test['video'])
        $testInfo .= "video=1\r\n";
    $testInfo .= "connectivity=Unknown\r\n";
    $testInfo .= "\r\n[runs]\r\n";
    file_put_contents("$testPath/testinfo.ini",  $testInfo);

    // write out the bulk test data
    $bulk = array();
    $bulk['variations'] = array();
    $bulk['urls'] = array();
    foreach( $tests as &$test_id ) {
      if (ValidateTestId($test_id)) {
        RestoreTest($test_id);
        $test_path = './' . GetTestPath($test_id);
        $pageData = loadPageRunData($test_path, 1, 0);
        $url = 'Imported Test';
        if ($pageData && array_key_exists('URL', $pageData))
          $url = $pageData['URL'];
        $bulk['urls'][] = array('u' => $url, 'id' => $test_id);
      }
    }
    gz_file_put_contents("$testPath/bulk.json", json_encode($bulk));
    
    // Return the test ID (or redirect if not using the API)
    TestResult($test, $error);
    
} elseif (array_key_exists('devtools', $_FILES)) {
  if (ValidateKey()) {
    /****************************************************************************
    * Importing a test
    ****************************************************************************/
    $id = null;
    $error = null;
    if (array_key_exists('test', $_REQUEST) &&
        ValidateTestId($_REQUEST['test'])) {
      $id = $_REQUEST['test'];
      RestoreTest($id);
      $test = GetTestInfo($id);
      if ($test) {
        $test['runs']++;
        $run = $test['runs'];
        if (((array_key_exists('key', $test) && strlen($test['key'])) ||
            ((array_key_exists('k', $_REQUEST) && strlen($_REQUEST['k'])))) &&
            $_REQUEST['k'] !== $test['key'])
          $error = "API Key Doesn't match key for existing test";
      } else {
        $error = "Invalid Test ID";
      }
    } else {
      $test = array('runs' => 1,
                    'discard' => 0,
                    'fvonly' => 1);
      $test['location'] = 'Imported';
      $test['started'] = time();
      $test['private'] = array_key_exists('private', $_REQUEST) && $_REQUEST['private'] ? 1 : 0;
      $test['label'] = array_key_exists('label', $_REQUEST) && strlen($_REQUEST['label']) ? htmlspecialchars(trim($req_label)) : '';
      if (array_key_exists('tsview_id', $_REQUEST) && strlen($_REQUEST['tsview_id']))
        $test['tsview_id'] = $_REQUEST['tsview_id'];    
      if (array_key_exists('k', $_REQUEST))
        $test['key'] = $_REQUEST['k'];
      
      // generate the test ID
      $test['id'] = CreateTestID();
      $id = $test['id'];
      $testPath = './' . GetTestPath($id);
      $test['path'] = $testPath;
      if (!is_dir($testPath))
        mkdir($testPath, 0777, true);
      $run = 1;
    }
    
    if (!isset($error)) {
      // move the dev tools file over
      if (array_key_exists('devtools', $_FILES) &&
          array_key_exists('tmp_name', $_FILES['devtools']) &&
          strlen($_FILES['devtools']['tmp_name'])) {
        move_uploaded_file($_FILES['devtools']['tmp_name'], "$testPath/{$run}_devtools.json");
        gz_compress("$testPath/{$run}_devtools.json");
      }
      
      // screen shot (if we got one)
      if (array_key_exists('screenshot', $_FILES) &&
          array_key_exists('tmp_name', $_FILES['screenshot']) &&
          array_key_exists('name', $_FILES['screenshot']) &&
          strlen($_FILES['screenshot']['tmp_name']) &&
          strlen($_FILES['screenshot']['name'])) {
        $ext = strtolower(pathinfo($_FILES['screenshot']['name'], PATHINFO_EXTENSION));
        if ($ext == 'png' || $ext == 'jpg')
          move_uploaded_file($_FILES['screenshot']['tmp_name'], "$testPath/{$run}_screen.$ext");
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
          move_uploaded_file($_FILES['video']['tmp_name'], "$testPath/{$run}_video.$ext");
        }
      }

      // pcap
      if (array_key_exists('tcpdump', $_FILES) &&
          array_key_exists('tmp_name', $_FILES['tcpdump']) &&
          strlen($_FILES['tcpdump']['tmp_name'])) {
        move_uploaded_file($_FILES['tcpdump']['tmp_name'], "$testPath/$run.cap");
      }
      
      // custom metrics
      if (array_key_exists('metrics', $_REQUEST) &&
          strlen($_REQUEST['metrics'])) {
        $lines = explode("\n", $_REQUEST['metrics']);
        $metrics = array();
        foreach($lines as $line) {
          if (preg_match('/(?P<metric>[a-zA-Z0-9\._\-\[\]{}():;<>+$#@!~]+)=(?P<value>[0-9]*(\.[0-9]*)?)/', $line, $matches)) {
            $metric = trim($matches['metric']);
            $value = trim($matches['value']);
            if (strpos($value, '.') === false)
              $value = intval($value);
            else
              $value = floatval($value);
            if (strlen($metric) && strlen($value))
              $metrics[$metric] = $value;
          }
        }
        if (count($metrics))
          gz_file_put_contents("$testPath/{$run}_metrics.json", json_encode($metrics));
      }
      
      // create the test info files
      SaveTestInfo($id, $test);

      // write out the ini file
      $testInfo = "[test]\r\n";
      $testInfo .= "fvonly=1\r\n";
      $testInfo .= "runs=$run\r\n";
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
      $_REQUEST['done'] = (array_key_exists('pending', $_REQUEST) && $_REQUEST['pending']) ? 0 : 1;
      $_REQUEST['run'] = $run;
      $_REQUEST['cached'] = 0;
      $included = true;
      chdir('./work');
      include('workdone.php');

      // re-load the test info
      $test = GetTestInfo($id);
    }
    
    // Return the test ID (or redirect if not using the API)
    TestResult($test, $error);
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
                <input type="checkbox" name="pending" id="pending" class="checkbox">
                <label for="done">Partial Result<br><small>(more runs coming)</small></label>
              </li>
              <li>
                <input type="text" name="label" id="label" value="" size="80">
                <label for="label">Label<br><small>(optional)</small></label>
              </li>
              <li>
                <input type="text" name="test" id="test" value="" size="80">
                <label for="test">Existing Test<br><small>(Add runs to an existing test)</small></label>
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
              <li>
                <textarea name="metrics" id="metrics" value="" cols="80" rows=10></textarea>
                <label for="metrics">Custom Metrics<br><small>One metric per line:<br>metric=value</small></label>
              </li>
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

function CreateTestID() {
  $test_num;
  $id = uniqueId($test_num);
  if( $test['private'] )
      $id = ShardKey($test_num) . md5(uniqid(rand(), true));
  else
      $id = ShardKey($test_num) . $id;
  $today = new DateTime("now", new DateTimeZone('UTC'));
  $id = $today->format('ymd_') . $id;
  return $id;
}

function TestResult(&$test, $error) {
  $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
  $host  = $_SERVER['HTTP_HOST'];
  $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
  if (array_key_exists('f', $_REQUEST)) {
    $ret = array();
    if (isset($error)) {
      $ret['statusCode'] = 400;
      $ret['statusText'] = $error;
    } else {
      $ret['statusCode'] = 200;
      $ret['statusText'] = 'Ok';
      $ret['data'] = array();
      $ret['data']['testId'] = $test['id'];
      $ret['data']['ownerKey'] = $test['owner'];
      $ret['data']['jsonUrl'] = "$protocol://$host$uri/results.php?test={$test['id']}&f=json";
      $ret['data']['xmlUrl'] = "$protocol://$host$uri/xmlResult.php?test={$test['id']}";
      $ret['data']['userUrl'] = "$protocol://$host$uri/results.php?test={$test['id']}";
      $ret['data']['summaryCSV'] = "$protocol://$host$uri/csv.php?test={$test['id']}";
      $ret['data']['detailCSV'] = "$protocol://$host$uri/csv.php?test={$test['id']}&requests=1";
      $ret['data']['jsonUrl'] = "$protocol://$host$uri/jsonResult.php?test={$test['id']}";
    }
    json_response($ret);
  } else {
    if (isset($error)) {
      echo "<html><body>$error</body>";
    } else {
      header("Location: $protocol://$host$uri/results.php?test={$test['id']}");
    }
  }
}
?>
