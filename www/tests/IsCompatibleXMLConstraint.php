<?php

/**
 * Can be used to check if some expected XML is compatible to actually generated XML.
 */
class IsCompatibleXMLConstraint extends PHPUnit_Framework_Constraint
{
  private $expectedXml;
  private $problem;

  /**
   * Constructor
   * @param string $expectedXml The expected XML as string
   */
  public function __construct($expectedXml) {
    parent::__construct();
    $this->expectedXml = simplexml_load_string($expectedXml);
  }

  /**
   * Named constructor
   * @param string $fileName Path to the XML file (if it has a '.gz' extension, it's opened with zlib)
   * @return IsCompatibleXMLConstraint The constructed constraint
   */
  public static function fromFile($fileName) {
    if (substr($fileName, -3) == ".gz") {
      $fileName = "compress.zlib://" . $fileName;
    }
    return new self(file_get_contents($fileName));
  }

  /**
   * Evaluates the constraint for parameter $other. Returns true if the
   * constraint is met, false otherwise.
   *
   * @param mixed $other Value or object to evaluate.
   * @return bool
   */
  protected function matches($other)
  {
    $this->problem = "";
    $actualXml = simplexml_load_string($other);

    if ($this->expectedXml->getName() !== $actualXml->getName()) {
      $this->problem = "name of the root node is '" . $this->expectedXml->getName() .
                       "'(but it is '" . $actualXml->getName() . "')";
      return false;
    }

    return $this->assertXmlIsCompatible($this->expectedXml, $actualXml, "");
  }

  /**
   * Returns a string representation of the constraint.
   *
   * @return string
   */
  public function toString()
  {
    return 'is compatible to ' . $this->expectedXml->getName();
  }

  protected function failureDescription($other) {
    return $this->problem;
  }


  /**
   * @param SimpleXMLElement $expected
   * @param SimpleXMLElement $actual
   * @return bool
   */
  private function assertXmlIsCompatible($expected, $actual, $path = "") {
    if (!$this->assertNodeEquals($expected, $actual, $path)) {
      return false;
    }
    foreach ($expected->children() as $name => $child) {
      $countSameName = count($expected->{$name});
      for ($i = 0; $i < $countSameName; $i++) {
        $xpathSuffix = $countSameName > 1 ? "[" . ($i+1). "]" : "";
        if (!$this->assertXmlIsCompatible($expected->{$name}[$i], $actual->{$name}[$i], $path . "/" . $name . $xpathSuffix )) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * @param SimpleXMLElement $expected
   * @param SimpleXMLElement $actual
   * @param string $path
   * @return bool
   */
  private function assertNodeEquals($expected, $actual, $path) {
    if ($actual === null) {
      $this->problem = "node '$path' exists in the actual result";
      return false;
    }

    foreach ($expected->attributes() as $attributeName => $attributeValue) {
      $actualValue = (string) $actual[$attributeName];
      $attributeValue = (string) $attributeValue;
      if ($actualValue != $attributeValue) {
        $this->problem = "attribute '$path@$attributeName' is '$attributeValue' (but it is '$actualValue')";
        return false;
      }
    }
    return $this->assertNodeValueEquals($expected, $actual, $path);
  }

  private function assertNodeValueEquals($expected, $actual, $path) {
    $expectedValue = trim((string) $expected);
    $actualValue = trim((string) $actual);
    if ($expectedValue !== $actualValue) {
      $this->problem = " value of '$path' is '$expectedValue' (but is '$actualValue')";
      return false;
    }
    return true;
  }
}
