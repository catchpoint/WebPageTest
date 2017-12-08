<?php

require_once __DIR__ . '/TestUtil.php';
require_once __DIR__ . '/IsCompatibleXMLConstraint.php';

require_once __DIR__ . '/../include/XmlResultGenerator.php';

require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestResults.php';
require_once __DIR__ . '/../include/TestStepResult.php';
require_once __DIR__ . '/../include/TestRunResults.php';
require_once __DIR__ . '/../include/FileHandler.php';

require __DIR__ . '/data/singlestepRunResultData.inc.php';

class XmlResultGeneratorRegressionTest extends PHPUnit_Framework_TestCase {

  private $testInfoMock;
  private $testResultMock;
  private $fileHandlerMock;
  private $tempDir;
  private $orgDir;

  private $allAdditionalInfo =  array(XmlResultGenerator::INFO_CONSOLE, XmlResultGenerator::INFO_REQUESTS,
    XmlResultGenerator::INFO_DOMAIN_BREAKDOWN, XmlResultGenerator::INFO_MIMETYPE_BREAKDOWN,
    XmlResultGenerator::INFO_PAGESPEED);

  public function setUp() {
    date_default_timezone_set("UTC"); // to make the test consistent with the result
    ob_start();
    $this->testInfoMock = $this->getTestInfoMock();
    $this->testResultMock = $this->getSinglestepTestRunResultMock();
    $this->fileHandlerMock = $this->getFileHandlerMock();
    $this->orgDir = null;
    $this->tempDir = null;
  }

  public function tearDown() {
    if (!empty($this->orgDir)) {
      chdir($this->orgDir);
    }
    ob_end_clean();
    if (!empty($this->tempDir) && is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testCompleteXmlGeneration() {
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
    $expectedXmlFile = __DIR__ . '/data/singlestepXmlResult.xml.gz';

    $testResults = TestResults::fromFiles($testInfo);
    $xmlGenerator = new XmlResultGenerator($testInfo, "http://wpt-test-vm", new FileHandler(),
      $this->allAdditionalInfo, true);
    $xmlGenerator->printAllResults($testResults, "loadTime", null);

    $this->assertThat(ob_get_contents(), IsCompatibleXMLConstraint::fromFile($expectedXmlFile));
  }

  public function testSinglestepMedianRunOutput() {
    $xmlGenerator = new XmlResultGenerator($this->testInfoMock, "https://unitTest", $this->fileHandlerMock,
      $this->allAdditionalInfo, true);
    $xmlGenerator->printMedianRun($this->testResultMock);
    $expectedXmlFile = __DIR__ . '/data/singlestepMedianOutput.xml';

    $this->assertThat(ob_get_contents(), IsCompatibleXMLConstraint::fromFile($expectedXmlFile));
  }

  public function testSinglestepRunOutput() {
    $xmlGenerator = new XmlResultGenerator($this->testInfoMock, "https://unitTest", $this->fileHandlerMock,
      $this->allAdditionalInfo, true);
    $xmlGenerator->printRun($this->testResultMock);
    $expectedXmlFile = __DIR__ . '/data/singlestepRunOutput.xml';

    $this->assertThat(ob_get_contents(), IsCompatibleXMLConstraint::fromFile($expectedXmlFile));
  }

  public function testPrintRunWithNull() {
    $xmlGenerator = new XmlResultGenerator($this->testInfoMock, "https://unitTest", $this->fileHandlerMock,
      $this->allAdditionalInfo, true);
    $xmlGenerator->printRun(null);
    $this->assertSame("", ob_get_contents());
  }

  private function imitatedResultPath($testId) {
    $parts = explode("_", $testId);
    $pathParts = array(substr($parts[0], 0, 2), substr($parts[0], 2, 2), substr($parts[0], 4, 2), $parts[1], $parts[2]);
    return "/results/" . implode("/", $pathParts);
  }

  private function getFileHandlerMock() {
    $mock = $this->getMock("FileHandler");
    $mock->method("fileExists")->willReturn(true);
    $mock->method("gzFileExists")->willReturn(true);
    return $mock;
  }

  private function getSinglestepTestRunResultMock() {
    global $SINGLESTEP_RUN_RESULT_DATA;
    $mock = $this->getMockBuilder("TestStepResult")->disableOriginalConstructor()->getMock();

    foreach ($SINGLESTEP_RUN_RESULT_DATA as $key => &$value) {
      $mock->method($key)->willReturn($value);
    };

    $mock->method("isCachedRun")->willReturn(false);
    $mock->method("getRunNumber")->willReturn(1);
    return TestRunResults::fromStepResults($this->testInfoMock, 1, false, array($mock));
  }

  private function getTestInfoMock() {
    $mock = $this->getMockBuilder("TestInfo")->disableOriginalConstructor()->getMock();
    $mock->method("getId")->willReturn("160608_PF_A");
    $mock->method("getRootDirectory")->willReturn("./results/16/06/08/PF/A");
    $mock->method("getTester")->willReturn("dummyTester");
    return $mock;
  }
}

