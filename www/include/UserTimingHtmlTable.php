<?php

class UserTimingHtmlTable {

  /* @var TestRunResults */
  private $runResults;

  /**
   * UserTimingHtmlTable constructor.
   * @param TestRunResults $runResults Run results to use for the table
   */
  public function __construct($runResults) {
    $this->runResults = $runResults;
  }

  public function create() {
    $data = $this->runResults->getStepResult(1)->getRawResults();
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
    $timingCount = count($userTimings);
    $navTiming = false;
    if ((array_key_exists('loadEventStart', $data) && $data['loadEventStart'] > 0) ||
      (array_key_exists('domContentLoadedEventStart', $data) && $data['domContentLoadedEventStart'] > 0))
      $navTiming = true;
    if ($timingCount || $navTiming)
    {
      $borderClass = '';
      if ($timingCount)
        $borderClass = ' class="border"';
      echo '<table id="tableW3CTiming" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">';
      echo '<tr>';
      if ($timingCount)
        foreach($userTimings as $label => $value)
          echo '<th>' . htmlspecialchars($label) . '</th>';
      if ($navTiming) {
        echo "<th$borderClass>";
        if ($data['firstPaint'] > 0)
          echo "RUM First Paint</th><th>";
        if (isset($data['domInteractive']) && $data['domInteractive'] > 0)
          echo "<a href=\"http://w3c.github.io/navigation-timing/#h-processing-model\">domInteractive</a></th><th>";
        echo "<a href=\"http://w3c.github.io/navigation-timing/#h-processing-model\">domContentLoaded</a></th><th><a href=\"http://w3c.github.io/navigation-timing/#h-processing-model\">loadEvent</a></th>";
      }
      echo '</tr><tr>';
      if ($timingCount)
        foreach($userTimings as $label => $value)
          echo '<td>' . htmlspecialchars($value) . '</td>';
      if ($navTiming) {
        echo "<td$borderClass>";
        if ($data['firstPaint'] > 0)
          echo number_format($data['firstPaint'] / 1000.0, 3) . 's</td><td>';
        if (isset($data['domInteractive']) && $data['domInteractive'] > 0)
          echo number_format($data['domInteractive'] / 1000.0, 3) . 's</td><td>';
        echo number_format($data['domContentLoadedEventStart'] / 1000.0, 3) . 's - ' .
          number_format($data['domContentLoadedEventEnd'] / 1000.0, 3) . 's (' .
          number_format(($data['domContentLoadedEventEnd'] - $data['domContentLoadedEventStart']) / 1000.0, 3) . 's)' . '</td>';
        echo '<td>' . number_format($data['loadEventStart'] / 1000.0, 3) . 's - ' .
          number_format($data['loadEventEnd'] / 1000.0, 3) . 's (' .
          number_format(($data['loadEventEnd'] - $data['loadEventStart']) / 1000.0, 3) . 's)' . '</td>';
      }
      echo '</tr>';
      echo '</table><br>';
    }
  }
}
