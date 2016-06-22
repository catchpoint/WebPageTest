<?php

require_once __DIR__ . '/TestUtil.php';

require_once __DIR__ . '/../include/XmlResultGenerator.php';

require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestResults.php';
require_once __DIR__ . '/../include/TestRunResult.php';
require_once __DIR__ . '/../include/FileHandler.php';

require __DIR__ . '/data/singlestepRunResultData.inc.php';

class XmlResultGeneratorTest extends PHPUnit_Framework_TestCase {

  private $testInfoMock;
  private $testResultMock;
  private $fileHandlerMock;
  private $tempDir;

  private $allAdditionalInfo =  array(XmlResultGenerator::INFO_CONSOLE, XmlResultGenerator::INFO_REQUESTS,
    XmlResultGenerator::INFO_DOMAIN_BREAKDOWN, XmlResultGenerator::INFO_MIMETYPE_BREAKDOWN,
    XmlResultGenerator::INFO_PAGESPEED);

  public function setUp() {
    date_default_timezone_set("UTC"); // to make the test consistent with the result
    ob_start();
    $this->testInfoMock = $this->getTestInfoMock();
    $this->testResultMock = $this->getSinglestepTestRunResultMock();
    $this->fileHandlerMock = $this->getFileHandlerMock();
  }

  public function tearDown() {
    ob_end_clean();
    if (!empty($this->tempDir) && is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testCompleteXmlGeneration() {
    $this->tempDir = TestUtil::extractToTemp(__DIR__ . '/data/singlestepResults.zip');
    $testRoot = $this->tempDir . '/singlestepResults';
    $testInfo = TestInfo::fromFiles($testRoot);
    $testResults = new TestResults($testInfo);
    $xmlGenerator = new XmlResultGenerator($testInfo, "http://wpt-test-vm", new FileHandler(),
      $this->allAdditionalInfo, true);
    $xmlGenerator->printAllResults($testResults, "loadTime", null);

    $resultXml = simplexml_load_string(ob_get_contents());
    $expectedXml = simplexml_load_file(__DIR__ . '/data/singlestepXmlResult.xml');
    $this->assertXmlIsCompatible($expectedXml, $resultXml);
  }

  public function testSinglestepMedianRunOutput() {
    $xmlGenerator = new XmlResultGenerator($this->testInfoMock, "https://unitTest", $this->fileHandlerMock,
      $this->allAdditionalInfo, true);
    $xmlGenerator->printMedianRun($this->testResultMock);

    $resultXml = simplexml_load_string(ob_get_contents());
    $expectedXml = simplexml_load_file(__DIR__ . '/data/singlestepMedianOutput.xml');
    $this->assertXmlIsCompatible($expectedXml, $resultXml);
  }

  public function testSinglestepRunOutput() {
    $xmlGenerator = new XmlResultGenerator($this->testInfoMock, "https://unitTest", $this->fileHandlerMock,
      $this->allAdditionalInfo, true);
    $xmlGenerator->printRun($this->testResultMock);

    $resultXml = simplexml_load_string(ob_get_contents());
    $expectedXml = simplexml_load_file(__DIR__ . '/data/singlestepRunOutput.xml');
    $this->assertXmlIsCompatible($expectedXml, $resultXml);
  }

  /**
   * @param SimpleXMLElement $expected
   * @param SimpleXMLElement $actual
   */
  private function assertXmlIsCompatible($expected, $actual, $path = "") {
    $this->assertNodeEquals($expected, $actual, $path);
    foreach ($expected->children() as $name => $child) {
      // use xpath to iterate properly identify multiple children with the same name
      $realChilds = $expected->xpath("./$name");
      for ($i = 0; $i < count($realChilds); $i++) {
        $xpathSuffix = count($realChilds) > 1 ? "[" . ($i+1). "]" : "";
        $this->assertXmlIsCompatible($realChilds[$i], $actual->{$name}[$i], $path . "/" . $name . $xpathSuffix );
      }
    }
  }

  /**
   * @param SimpleXMLElement $expected
   * @param SimpleXMLElement $actual
   */
  private function assertNodeEquals($expected, $actual, $path) {
    $this->assertNotNull($actual, "Node '$path' not found in actual result");
    $this->assertEquals($expected->getName(), $actual->getName(),
      "Name of node '$path'' is '" . $actual->getName() . "'");
    foreach ($expected->attributes() as $attributeName => $attributeValue) {
      $actualValue = $actual[$attributeName];
      $this->assertEquals($actual[$attributeName], $attributeValue,
        "Attribute '$path@$attributeName' was expected to be '$attributeValue', but is '$actualValue''");
    }
    $this->assertNodeValueEquals($expected, $actual, $path);
  }

  private function assertNodeValueEquals($expected, $actual, $path) {
    $expectedValue = trim((string) $expected);
    $actualValue = trim((string) $actual);
    $this->assertEquals($expectedValue, $actualValue,
      "Value of '$path' was expected to be '$expectedValue', but is '$actualValue'");
  }

  private function getFileHandlerMock() {
    $mock = $this->getMock("FileHandler");
    $mock->method("fileExists")->willReturn(true);
    $mock->method("gzFileExists")->willReturn(true);
    return $mock;
  }

  private function getSinglestepTestRunResultMock() {
    global $SINGLESTEP_RUN_RESULT_DATA;
    $mock = $this->getMockBuilder("TestRunResult")->disableOriginalConstructor()->getMock();

    foreach ($SINGLESTEP_RUN_RESULT_DATA as $key => &$value) {
      $mock->method($key)->willReturn($value);
    };

    $mock->method("isCachedRun")->willReturn(false);
    $mock->method("getRunNumber")->willReturn(1);
    return $mock;
  }

  private function getTestInfoMock() {
    $mock = $this->getMockBuilder("TestInfo")->disableOriginalConstructor()->getMock();
    $mock->method("getId")->willReturn("160608_PF_A");
    $mock->method("getRootDirectory")->willReturn("./results/16/06/08/PF/A");
    $mock->method("getTester")->willReturn("dummyTester");
    return $mock;
  }
}

