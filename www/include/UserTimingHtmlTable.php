<?php

require_once __DIR__ . '/../common_lib.inc';

class UserTimingHtmlTable {

  const NO_METRIC_STRING = "-";

  /* @var TestRunResults */
  private $runResults;
  private $userTimings;

  private $isMultistep;
  private $hasNavTiming;
  private $hasUserTiming;
  private $hasFirstPaint;
  private $hasDomInteractive;
  private $hasTTI;

  /**
   * UserTimingHtmlTable constructor.
   * @param TestRunResults $runResults Run results to use for the table
   */
  public function __construct($runResults) {
    $this->runResults = $runResults;
    $this->hasNavTiming = $runResults->hasValidMetric("loadEventStart") ||
                          $runResults->hasValidMetric("domContentLoadedEventStart");
    $this->hasUserTiming = $this->_initUserTimings();
    $this->hasFirstPaint = $this->runResults->hasValidMetric("firstPaint");
    $this->hasDomInteractive = $this->runResults->hasValidMetric("domInteractive");
    $this->hasTTI = $this->runResults->hasValidMetric("TimeToInteractive") || $this->runResults->hasValidMetric("TTIMeasurementEnd");
    $this->isMultistep = $runResults->countSteps() > 1;
  }

  public function create() {
    if (!$this->hasUserTiming && !$this->hasNavTiming) {
      return "";
    }
    $out = '<table id="tableW3CTiming" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">';
    $out .= $this->_createHead();
    $out .= $this->_createBody();
    $out .= "</table><br>\n";
    return $out;
  }

  private function _createHead() {
    $borderClass = $this->hasUserTiming ? ' class="border"' : '';
    $out = "<tr>\n";
    if ($this->isMultistep) {
      $out .= "<th>Step</th>";
    }
    if ($this->hasTTI)
      $out .= "<th><a href=\"https://github.com/WPO-Foundation/webpagetest/blob/master/docs/Metrics/TimeToInteractive.md\">Interactive (beta)</a></th>";
    if ($this->hasUserTiming) {
      foreach ($this->userTimings[0] as $label => $value)
        if (count($this->userTimings[0]) < 5 || substr($label, 0, 5) !== 'goog_')
          $out .= '<th>' . htmlspecialchars($label) . '</th>';
    }
    if ($this->hasNavTiming) {
      $out .= "<th$borderClass>";
      if ($this->hasFirstPaint)
        $out .= "RUM First Paint</th><th>";
      if ($this->hasDomInteractive)
        $out .= "<a href=\"http://w3c.github.io/navigation-timing/#h-processing-model\">domInteractive</a></th><th>";
      $out .= "<a href=\"http://w3c.github.io/navigation-timing/#h-processing-model\">domContentLoaded</a></th>";
      $out .= "<th><a href=\"http://w3c.github.io/navigation-timing/#h-processing-model\">loadEvent</a></th>";
    }
    $out .= "</tr>\n";
    return $out;
  }

  private function _createBody() {
    $out = "";
    for ($i = 0; $i < $this->runResults->countSteps(); $i++) {
      $out .= $this->_createRow($this->runResults->getStepResult($i + 1), $this->userTimings[$i]);
    }
    return $out;
  }

  private function _createRow($stepResult, $stepUserTiming) {
    $borderClass = $this->hasUserTiming ? ' class="border"' : '';
    $out = "<tr>\n";
    if ($this->isMultistep) {
      $out .= "<td>" . FitText($stepResult->readableIdentifier(), 30) . "</td>";
    }
    if ($this->hasTTI) {
      $tti = '-';
      if ($stepResult->getMetric("TimeToInteractive"))
        $tti = $this->_getTimeMetric($stepResult, "TimeToInteractive");
      elseif ($stepResult->getMetric("TTIMeasurementEnd"))
        $tti = '&GT; ' . $this->_getTimeMetric($stepResult, "TTIMeasurementEnd");
      $out .= "<td>$tti</td>";
    }
    if ($this->hasUserTiming)
      foreach ($stepUserTiming as $label => $value)
        if (count($stepUserTiming) < 5 || substr($label, 0, 5) !== 'goog_')
          $out .= '<td>' . htmlspecialchars($value) . '</td>';
    if ($this->hasNavTiming) {
      $out .= "<td$borderClass>";
      if ($this->hasFirstPaint)
        $out .= $this->_getTimeMetric($stepResult, "firstPaint") . '</td><td>';
      if ($this->hasDomInteractive)
        $out .= $this->_getTimeMetric($stepResult, "domInteractive") . '</td><td>';
      $out .= $this->_getTimeRangeMetric($stepResult, 'domContentLoadedEventStart', 'domContentLoadedEventEnd');
      $out .= "</td><td>";
      $out .= $this->_getTimeRangeMetric($stepResult, 'loadEventStart', 'loadEventEnd');
      $out .= "</td>";
    }
    $out .= "</tr>\n";
    return $out;
  }

  private function _initUserTimings() {
    $userTimings = array();
    $userMetrics = array();

    foreach ($this->runResults->getStepResults() as $stepResult) {
      $stepUserTimings = $this->_userTimingsForStep($stepResult);
      $userTimings[] = $stepUserTimings;
      $userMetrics = array_merge($userMetrics, array_keys($stepUserTimings));
    }
    $userMetrics = array_unique($userMetrics);
    $defaultValues = array_combine($userMetrics, array_fill(0, count($userMetrics), self::NO_METRIC_STRING));

    $this->userTimings = array();
    foreach ($userTimings as &$stepUserTimings) {
      $this->userTimings[] = array_merge($defaultValues, $stepUserTimings);
    }
    return count($userMetrics) > 0;
  }

  private function _userTimingsForStep($stepResult) {
    $data = $stepResult->getRawResults();
    $userTimings = array();
    foreach($data as $metric => $value)
      if (substr($metric, 0, 9) == 'userTime.')
        $userTimings[substr($metric, 9)] = number_format($value / 1000, 3) . 's';
    if (isset($data['custom']) && count($data['custom'])) {
      foreach($data['custom'] as $metric) {
        if (isset($data[$metric])) {
          $value = $data[$metric];
          if (is_double($value))
            $value = number_format($value, 3, '.', '');
          $userTimings[$metric] = $value;
        }
      }
    }
    return $userTimings;
  }

  private function _getTimeMetric($stepResult, $metric, $default = self::NO_METRIC_STRING) {
    $value = $stepResult->getMetric($metric);
    if ($value === null) {
      return $default;
    }
    return number_format($value / 1000.0, 3) . "s";
  }

  private function _getTimeRangeMetric($stepResult, $startMetric, $endMetric) {
    $startValue = $this->_getTimeMetric($stepResult, $startMetric, "?");
    $endValue = $this->_getTimeMetric($stepResult, $endMetric, "?");
    $out = $startValue . " - " . $endValue;
    if ($startValue !== "?" && $endValue !== "?") {
      $diff = $stepResult->getMetric($endMetric) - $stepResult->getMetric($startMetric);
      $out .= ' (' . number_format($diff / 1000.0, 3) . 's)';
    }
    return $out;
  }
}
