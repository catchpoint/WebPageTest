<?php

require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../page_data.inc';
require_once __DIR__ . '/../object_detail.inc';
require_once __DIR__ . '/../breakdown.inc';
require_once __DIR__ . '/../devtools.inc.php';

class ResultProcessing {
  private $testRoot;
  private $id;
  private $run;
  private $cached;

  /**
   * ResultProcessing constructor.
   * @param string $testRoot Path to test result directory
   * @param string $id ID of the test
   * @param int $run Run number
   * @param bool $cached False for first view, true for repeat view (cached)
   */
  public function __construct($testRoot, $id, $run, $cached) {
    $this->testRoot = strval($testRoot);
    $this->id = strval($id);
    $this->run = intval($run);
    $this->cached = $cached ? true : false;
  }

  /**
   * Counts the steps for this run by counting the run-specific IEWPG files
   * @return int The number of steps in this run
   */
  public function countSteps() {
    if ($this->cached) {
      $pattern ="/^" . $this->run . "_Cached_([0-9]+_)?IEWPG.txt/";
    } else {
      $pattern ="/^" . $this->run . "_([0-9]+_)?IEWPG.txt/";
    }
    $files = scandir($this->testRoot);
    $steps = 0;
    foreach ($files as $file) {
      if (preg_match($pattern, $file)) {
        $steps++;
      }
    }
    // Check for devtools steps
    if (!$steps) {
      if ($this->cached) {
        $pattern ="/^" . $this->run . "_Cached_([0-9]+_)?devtools.json/";
      } else {
        $pattern ="/^" . $this->run . "_([0-9]+_)?devtools.json/";
      }
      foreach ($files as $file) {
        if (preg_match($pattern, $file)) {
          $steps++;
        }
      }
    }
    return $steps;
  }

  public function postProcessRun() {
    $testerError = null;
    $secure = false;
    loadPageRunData($this->testRoot, $this->run, $this->cached);
    $steps = $this->countSteps();
    for ($i = 1; $i <= $steps; $i++) {
      $rootUrls = UrlGenerator::create(true, "", $this->id, $this->run, $this->cached, $i);
      $stepPaths = new TestPaths($this->testRoot, $this->run, $this->cached, $i);
      $requests = getRequestsForStep($stepPaths, $rootUrls, $secure, true);
      if (isset($requests) && is_array($requests) && count($requests)) {
        getBreakdownForStep($stepPaths, $rootUrls, $requests);
      } else {
        $testerError = 'Missing Results';
      }
      if (is_dir(__DIR__ . '/../google') && is_file(__DIR__ . '/../google/google_lib.inc')) {
        require_once(__DIR__ . '/../google/google_lib.inc');
        ParseCsiInfoForStep($stepPaths, true);
      }
      GetDevToolsCPUTimeForStep($stepPaths);
    }
    return $testerError;
  }
}