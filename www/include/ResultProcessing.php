<?php

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
    return $steps;
  }
}