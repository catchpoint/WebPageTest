<?php

include '../lib/PHPStats.phar';

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
}

function sampleVariance($arr) {
  $avg = array_sum($arr) / count($arr);
  $sum_dev = 0;
  foreach($arr as $n) {
    $dev = $n - $avg;
    $sum_dev += $dev * $dev;
  }
  return ($sum_dev / (count($arr) - 1));
}

function ci($label, $arr) {
  $n = count($arr);
  $mean = array_sum($arr) / count($arr);
  $se = \PHPStats\Stats::sampleStddev($arr) / sqrt(count($arr));
  $tDist = new \PHPStats\ProbabilityDistribution\StudentsT(count($arr) - 1);
  $criticalValue = $tDist->ppf(.975);
  return new ConfData($label, $n, $mean, $criticalValue * $se);
}

?>
