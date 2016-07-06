<?php

require_once __DIR__ . '/TestUtil.php';
require_once __DIR__ . '/IsArraySubsetConstraint.php';
require_once __DIR__ . '/../include/JsonResultGenerator.php';
require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestResults.php';

require __DIR__ . '/data/singlestepJsonResultArray.inc.php';

class JsonResultGeneratorRegressionTest extends PHPUnit_Framework_TestCase {
  private $tempDir;
  private $orgDir;

  public function setUp() {
    date_default_timezone_set("UTC"); // to make the test consistent with the result
    $this->orgDir = null;
    $this->tempDir = null;
  }

  public function tearDown() {
    if (!empty($this->orgDir)) {
      chdir($this->orgDir);
    }
    if (!empty($this->tempDir) && is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testJsonResultArrayGeneration() {
    global $SINGLESTEP_JSON_RESULT_ARRAY;
    $this->tempDir = TestUtil::extractToTemp(__DIR__ . '/data/singlestepResults.zip');
    $testInfo = TestInfo::fromFiles($this->tempDir . '/singlestepResults');
    $imitatedPath = $this->imitatedResultPath($testInfo->getId());

    // we need to move the results to a directory structure that equal to the real one.
    // Then, we can go into the parent directory, so the relatece "testRoot" is the same as it would be in production
    // This is important, as during XML generation, some URLs contain the test path
    mkdir($this->tempDir . $imitatedPath, 0777, true);
    rename($this->tempDir . '/singlestepResults', $this->tempDir . $imitatedPath);
    $this->orgDir = getcwd();
    chdir($this->tempDir);
    $testRoot = "." . $imitatedPath;
    $testInfo = TestInfo::fromFiles($testRoot);

    $testResults = TestResults::fromFiles($testInfo);
    $jsonGenerator = new JsonResultGenerator($testInfo, "http://wpt-test-vm", new FileHandler());
    $resultArray = $jsonGenerator->resultDataArray($testResults, "loadTime");

    $this->assertThat($resultArray, new IsArraySubsetConstraint($SINGLESTEP_JSON_RESULT_ARRAY));
  }

  private function imitatedResultPath($testId) {
    $parts = explode("_", $testId);
    $pathParts = array(substr($parts[0], 0, 2), substr($parts[0], 2, 2), substr($parts[0], 4, 2), $parts[1], $parts[2]);
    return "/results/" . implode("/", $pathParts);
  }
}