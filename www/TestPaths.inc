<?php

/**
 * Takes the responsibilty for creating file names and paths for test-related files.
 * This way, the logic of file names and the file names itself get encapsulated and can get tested.
 */
class TestPaths {
  const UNDERSCORE_FILE_PATTERN = "/^(?P<run>[0-9]+)_(?P<cached>Cached_)?((?P<step>[0-9]+)_)?(?P<name>[\S]+)$/";

  protected $testRoot;

  protected $run;
  protected $cached;
  protected $step;

  protected $parsedBaseName;

  /**
   * TestPaths constructor.
   * @param string $testRoot The path where all data of the test is stored in
   * @param int $run Number of the run (>= 1)
   * @param bool $cached If this is a cached run or not
   * @param int $step The number of the step (>= 1)
   */
  public function __construct($testRoot = ".", $run = 1, $cached = false, $step = 1) {
    $this->testRoot = strval($testRoot);
    $this->run = intval($run);
    $this->cached = $cached ? true : false;
    $this->step = intval($step);
  }

  /**
   * @param string $testRoot The path where all data of the test is stored in
   * @param $fileName string File name to instantiate the object from
   * @return TestPaths A new instance or NULL
   */
  public static function fromUnderscoreFileName($testRoot, $fileName) {
    if (!preg_match(self::UNDERSCORE_FILE_PATTERN, $fileName, $matches)) {
      return NULL;
    }
    $step = empty($matches["step"]) ? 1 : intval($matches["step"]);
    $instance = new self($testRoot, $matches["run"], !empty($matches["cached"]), $step);
    $instance->parsedBaseName = $matches["name"];
    return $instance;
  }

  /**
   * @return string The base name of the file (without run information), e.g. when instantiated by from*Name methods
   */
  public function getParsedBaseName() {
    return $this->parsedBaseName;
  }

  /**
   * @return string Directory name to store video data in
   */
  public function videoDir() {
    return $this->testRoot . "/video_" . strtolower($this->underscoreIdentifier());
  }

  protected function underscoreIdentifier() {
    return $this->run . ($this->cached ? "_Cached" : "") . ($this->step > 1 ? "_" . $this->step : "");
  }
}

