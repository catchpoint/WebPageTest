<?php
include 'common.inc';
require_once('benchmarks/data.inc.php');

// see if we are processing an import or presenting the UI
if (array_key_exists('tests', $_REQUEST) && array_key_exists('benchmark', $_REQUEST)) {
  $error = null;
  if (ValidateKey()) {
    $test_data = json_decode($_REQUEST['tests'], true);
    if ($test_data && is_array($test_data) && count($test_data)) {
      $epoch = time();
      if (array_key_exists('epoch', $_REQUEST) && intval($_REQUEST['epoch']) > 0)
        $epoch = intval($_REQUEST['epoch']);
      $benchmark = trim($_REQUEST['benchmark']);
      if (strlen($benchmark) && is_file("./settings/benchmarks/$benchmark.php"))
        ImportBenchmarkRun($benchmark, $epoch, $test_data);
      else
        $error = "Invalid benchmark";
    } else {
      $error = "Invalid test data json";
    }
  } else {
    // Invalid API key = block if keys are configured (for now anyway)
    header('HTTP/1.0 403 Forbidden');
    echo 'Access Denied.  Invalid API Key';
  }
  $ret = array('statusCode' => 200, 'statusText' => 'OK');
  if (isset($error)) {
    $ret['statusCode'] = 400;
    $ret['statusText'] = $error;
  }
  json_response($ret);
} else {
  /****************************************************************************
  * Display the import UI
  ****************************************************************************/
  $page_keywords = array('Import','Benchmark','Webpagetest','Website Speed Test','Page Speed');
  $page_description = "Create Benchmark Run.";
?>
<!DOCTYPE html>
<html>
  <head>
    <title>WebPagetest - Create Benchmark Run</title>
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

      <form name="urlEntry" action="import_benchmark.php" method="POST" enctype="multipart/form-data">
        <?php
        if (array_key_exists('f', $_REQUEST))
          echo "<input type=\"hidden\" name=\"f\" value=\"" . htmlspecialchars($_REQUEST['f']) . "\">\n";
        ?>
        <h2 class="cufon-dincond_black">Create a Benchmark run from an existing set of tests...</h2>
        <div id="test_box-container">
          <div id="analytical-review" class="test_box">
            <ul class="input_fields">
              <li>
                <select id="benchmark" name="benchmark">
                <?php
                $benchmarks = GetBenchmarks();
                $count = 0;
                foreach ($benchmarks as &$benchmark) {
                  $name = htmlspecialchars($benchmark['name']);
                  echo "<option value=\"$name\">$name</option>";
                }
                ?>
                </select>
                <label for="benchmark">
                    Benchmark
                </label>
              </li>
              <li>
                <input type="number" name="epoch" id="epoch" value="0" size="80" min="0">
                <label for="label">Unix Time of test run<br><small>(Epoch - optional)</small></label>
              </li>
              <li>
                <textarea name="tests" id="tests" value="" cols="80" rows=10></textarea>
                <label for="tests">Tests</label>
                <br><br>
                <p>
                The tests data is a json array of objects with each object specifying a test result and the configuration it is tied to:<br>
<pre>
[{"id":"xxxxxx_xx_xxxx",
  "url":"http:\/\/example.com",
  "label":"Friendly label",
  "config":"Defined config in bechmark definition",
  "location":"Matching location in benchmark definition"},
 {"id":"yyyyyy_yy_yyy",
  "url":"http:\/\/someothersite.com",
  "label":"Some other label",
  "config":"Defined config in bechmark definition",
  "location":"Matching location in benchmark definition"}]
</pre>
                 </p>
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

function ImportBenchmarkRun($benchmark, $epoch, &$test_data) {
  global $error;
  $lock = Lock("Benchmark $benchmark Cron", true, 86400);
  if (isset($lock)) {
    if (!is_dir("./results/benchmarks/$benchmark"))
        mkdir("./results/benchmarks/$benchmark", 0777, true);
    if (is_file("./results/benchmarks/$benchmark/state.json"))
      $state = json_decode(file_get_contents("./results/benchmarks/$benchmark/state.json"), true);
    else
      $state = array('running' => false, 'needs_aggregation' => false, 'runs' => array());
    $state['running'] = true;
    $state['last_run'] = $epoch;
    $state['tests'] = array();
    foreach($test_data as $test) {
      $test['submitted'] = $epoch;
      $state['tests'][] = $test;
    }
    file_put_contents("./results/benchmarks/$benchmark/state.json", json_encode($state));        
    Unlock($lock);
    // kick off the collection and aggregation of the results
    $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
    $host  = $_SERVER['HTTP_HOST'];
    $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
    $cron = "$protocol://$host$uri/benchmarks/cron.php?benchmark=" . urlencode($benchmark);
    file_get_contents($cron);
  }
}
?>
