<?php

/**
 * ConfData is a class describing basic statistics for a labeled dataset:
 * label, mean, count, and half-width of a symmetric confidence interval about
 * the mean.
 */
class ConfData {
  public $label; // label for dataset
  public $n; // count of dataset
  public $mean; // mean of dataset
  public $ciHalfWidth; // half-width of confidence interval

  function __construct($label, $n, $mean, $ciHalfWidth) {
    $this->label = $label;
    $this->n = $n;
    $this->mean = $mean;
    $this->ciHalfWidth = $ciHalfWidth;
  }

  /**
   * fromArr constructs a ConfData object from a label and array of values.
   */
  static function fromArr($label, $arr) {
    if (is_file('lib/PHPStats/PHPStats.phar')) {
      require_once('lib/PHPStats/PHPStats.phar');
      $n = count($arr);
      $mean = array_sum($arr) / count($arr);
      $se = \PHPStats\Stats::sampleStddev($arr) / sqrt(count($arr));
      $tDist = new \PHPStats\ProbabilityDistribution\StudentsT(count($arr) - 1);
      $criticalValue = $tDist->ppf(.975);
      return new ConfData($label, $n, $mean, $criticalValue * $se);
    } else {
      return FALSE;
    }
  }
}
?>
