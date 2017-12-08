<?php

/**
 * Can be used to check if some expected XML is compatible to actually generated XML.
 */
class IsArraySubsetConstraint extends PHPUnit_Framework_Constraint
{
  private $expectedArray;
  private $problem;

  /**
   * Constructor
   * @param string $expectedArray The expected Array which should be a subset
   */
  public function __construct($expectedArray) {
    parent::__construct();
    $this->expectedArray = $expectedArray;
  }

  /**
   * Evaluates the constraint for parameter $other. Returns true if the
   * constraint is met, false otherwise.
   *
   * @param mixed $other Value or object to evaluate.
   * @return bool
   */
  protected function matches($other) {
    $this->problem = "";
    return $this->includesExpected($this->expectedArray, $other, "\$other");
  }

  private function includesExpected(&$expectedArray, &$otherArray, $path = "") {
    if (!is_array($otherArray)) {
      $this->problem = "the actual value $path is an array";
      return false;
    }

    foreach ($expectedArray as $key => &$value) {
      if (!array_key_exists($key, $otherArray)) {
        $this->problem = "the key " .$path . "[$key] exists in the actual array";
        return false;
      }
      if (is_array($value)) {
        if (!$this->includesExpected($value, $otherArray[$key], $path . "[$key]")) {
          return false;
        }
      } else {
        $otherValue = $otherArray[$key];
        if ($value != $otherValue) {
          $this->problem = "the value " . $path . "[$key]" . " equals '$value'\n (it's actually '$otherValue')";
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Returns a string representation of the constraint.
   *
   * @return string
   */
  public function toString()
  {
    return 'is a subset of the actual array';
  }

  protected function failureDescription($other) {
    return $this->problem;
  }
}
