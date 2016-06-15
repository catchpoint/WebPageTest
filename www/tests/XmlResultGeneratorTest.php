<?php

require_once __DIR__ . '/../include/XmlResultGenerator.php';

require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestRunResult.php';
require_once __DIR__ . '/../include/FileHandler.php';

require __DIR__ . '/data/singlestepRunResultData.inc.php';

class XmlResultGeneratorTest extends PHPUnit_Framework_TestCase {

  public function setUp() {
    ob_start();
  }

  public function tearDown() {
    ob_end_clean();
  }

  public function testSinglestepMedianRunOutput() {
    $testInfo = $this->getTestInfoMock();
    $testResult = $this->getSinglestepTestRunResultMock();
    $fileHandler = $this->getFileHandlerMock(array());
    $additionalInfo = array(XmlResultGenerator::INFO_CONSOLE, XmlResultGenerator::INFO_REQUESTS,
      XmlResultGenerator::INFO_DOMAIN_BREAKDOWN, XmlResultGenerator::INFO_MIMETYPE_BREAKDOWN,
      XmlResultGenerator::INFO_PAGESPEED);
    $xmlGenerator = new XmlResultGenerator($testInfo, "https://unitTest", $fileHandler, $additionalInfo);
    $xmlGenerator->printMedianRun($testResult);

    $resultXml = simplexml_load_string(ob_get_contents());
    $expectedXml = simplexml_load_file(__DIR__ . '/data/singlestepMedianOutput.xml');
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
        $this->assertXmlIsCompatible($realChilds[$i], $actual->{$name}[$i], $path . "/" . $name . "[" . ($i+1). "]");
      }
    }
  }

  /**
   * @param SimpleXMLElement $expected
   * @param SimpleXMLElement $actual
   */
  private function assertNodeEquals($expected, $actual, $path) {
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

  private function getFileHandlerMock($gzReadReturns) {
    $mock = $this->getMock("FileHandler");
    $mock->method("fileExists")->willReturn(true);
    $mock->method("gzFileExists")->willReturn(true);
    $mock->method("gzReadFile")->willReturnMap($gzReadReturns);
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
    $mock->method("getRootDirectory")->willReturn("./16/06/08/PF/A");
    $mock->method("getTester")->willReturn("dummyTester");
    return $mock;
  }
}

