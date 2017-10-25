<?php include 'addimport.php'; ?>
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
