<?php

class TestInfo {

  private $id;
  private $rootDirectory;
  private $testInfo;


  private function __construct($id, $rootDirectory, &$testInfo) {
    // This isn't likely to stay the standard constructor, so we name it explicitly as a static function below
    $this->id = $id;
    $this->rootDirectory = $rootDirectory;
    $this->testInfo = &$testInfo;
  }

  /**
   * @param string $id The test id
   * @param string $rootDirectory The root directory of the test data
   * @param array $testInfo Array with information about the test
   * @return TestInfo The created instance
   */
  public static function fromValues($id, $rootDirectory, &$testInfo) {
    return new self($id, $rootDirectory, $testInfo);
  }

  /**
   * @return string The id of the test
   */
  public function getId() {
    return $this->id;
  }

  /**
   * @return string The root directory for the test, relative to the WebpageTest root
   */
  public function getRootDirectory() {
    return $this->rootDirectory;
  }

  /**
   * @param int $run The run number
   * @return null|string Tester for specified run
   */
  public function getTester($run) {
    if (!array_key_exists('testinfo', $this->testInfo)) {
      return null;
    }
    $tester = null;
    if (array_key_exists('tester', $this->testInfo['testinfo']))
      $tester = $this->testInfo['testinfo']['tester'];
    if (array_key_exists('test_runs', $this->testInfo['testinfo']) &&
      array_key_exists($run, $this->testInfo['testinfo']['test_runs']) &&
      array_key_exists('tester', $this->testInfo['testinfo']['test_runs'][$run])
    )
      $tester = $this->testInfo['testinfo']['test_runs'][$run]['tester'];
    return $tester;
  }
}