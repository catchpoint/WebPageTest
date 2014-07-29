<?php
require_once(__DIR__ . '/common_lib.inc');
require_once(__DIR__ . '/page_data.inc');

function GetQuantiles(&$data) {
}

function GetNumeric($value) {
  if (preg_match('/^[0-9]+$/', $value))
    $value = intval($value);
  else
    $value = floatval($value);
  return $value;
}

/**
 * ChartColumn lightens a color string.
 *
 * @param string color Color string in #RRGGBB hex format.
 *
 * @return string #RRGGBB string representing lighter version of same color.
 */
function lighten($color) {
  $red = hexdec(substr($color, 1, 2));
  $green = hexdec(substr($color, 3, 2));
  $blue = hexdec(substr($color, 5, 2));
  $new_red = floor($red / 2 + 128);
  $new_green = floor($green / 2 + 128);
  $new_blue = floor($blue / 2 + 128);
  return ("#" . dechex($new_red) . dechex($new_green) . dechex($new_blue));
}

/**
 * ChartColumn is a class describing a column of a GViz chart.
 */
class ChartColumn
{
  public $values; // @var float[] Values in column
  public $color; // @var string Color in chart
  public $line; // @var bool: true for line, false for point
  public $label; // @var string: Label of column in chart

  function __construct($values, $color, $line, $label) {
    $this->values = $values;
    $this->color = $color;
    $this->line = $line;
    $this->label = $label;
  }

  /**
   * fromPageData returns a ChartColumn with points in the given color,
   * corresponding to all values from a given cached status and metric
   * of a given pageData object.
   *
   * @param (int|float)[][][] &$pageData
   * @param int cached
   * @param string metric
   * @param string color
   * @param string label
   *
   * @return ChartColumn
   */
  public static function fromPageData(&$pageData, $cached, $metric, $color, $label) {
    // For each run in pageData, pull out the data values, then can create the instance
    $values = values($pageData, $cached, $metric, true);
    return new ChartColumn($values, $color, false, $label);
  }

  /**
   * medianFromPageData returns a ChartColumn with a line in the given color,
   * corresponding to the median of values from a given cached status and metric
   * of a given pageData object.
   *
   * @param (int|float)[][][] &$pageData
   * @param int cached
   * @param string metric
   * @param string color
   * @param string label
   *
   * @return ChartColumn
   */
  public static function medianFromPageData($pageData, $cached, $metric, $color, $label, $num_runs) {
    // For each run in pageData, pull out the data values and compute the median, then can create the instance
    $values = values($pageData, $cached, $metric, true);
    $value = median($values);
    if (!$value) {
      return null;
    }
    return new ChartColumn(array_combine(range(1, $num_runs), array_fill(1, $num_runs, $value)), $color, true, $label);
  }

  /**
   * medianFromPageData returns a ChartColumn with a line in the given color,
   * corresponding to the value of $metric on the run whose value
   * of $median_metric is median, drawn from all runs from the given cached
   * status in the given pageData object.
   *
   * @param (int|float)[][][] &$pageData
   * @param int cached
   * @param string metric
   * @param string color
   * @param string label
   *
   * @return ChartColumn
   */
  public static function medianRunFromPageData($pageData, $cached, $metric, $median_metric, $color, $label, $num_runs) {
    $medianRun = $pageData[GetMedianRun($pageData, $cached, $median_metric)][$cached];
    if (!array_key_exists($metric, $medianRun)) {
      return null;
    }
    $value = GetNumeric($medianRun[$metric]);
    return new ChartColumn(array_combine(range(1, $num_runs), array_fill(1, $num_runs, $value)), $color, true, $label);
  }

  /**
   * runs returns a ChartColumn with the sequence of integers from 1 to $runs.
   *
   * @param int runs
   *
   * @return ChartColumn
   */
  public static function runs($runs) {
    return new ChartColumn(array_combine(range(1, $runs), range(1, $runs)), null, null, 'run');
  }

  /**
   * dataMedianColumns returns a ChartColumn[] with three columns: data points
   * of $metric, line corresponding to median of $metric, and line
   * corresponding to value of $metric on run whose value of $median_metric
   * is median.
   */
  public static function dataMedianColumns($pageData, $cached, $metric, $median_metric, $color, $color_median_run, $labels, $num_runs, $show_median_run, $show_median_value) {
    $chartColumns = array();
    $label = implode(" ", $labels);
    $chartColumns[] = ChartColumn::fromPageData($pageData, $cached, $metric, $color, $label);
    if ($show_median_run) {
      $label_median_run = implode(" ", array_merge($labels, (array)('Run with Median ' . $median_metric)));
      $column = ChartColumn::medianRunFromPageData($pageData, $cached, $metric, $median_metric, $color_median_run, $label_median_run, $num_runs);
      if (!is_null($column)) {
        $chartColumns[] = $column;
      }
    }
    if ($show_median_value) {
      $label_median_value = implode(" ", array_merge($labels, (array)('Median')));
      $column = ChartColumn::medianFromPageData($pageData, $cached, $metric, $color, $label_median_value, $num_runs);
      if (!is_null($column)) {
        $chartColumns[] = $column;
      }
    }
    return $chartColumns;
  }
}

/**
 * CompareFrom is a class describing a statistical comparison against a control.
 */
class CompareFrom {
  public $confData; // @var ConfData Mean and confidence interval.
  public $diff; // @var float Difference from control, or NULL for the control.
  public $pValue; // @var float P-Value as compared against control, or NULL
                  // for the control.

  function __construct($confData, $diff, $pValue) {
    $this->confData = $confData;
    $this->diff = $diff;
    $this->pValue = $pValue;
  }
}

/**
 * CompareTable is a class describing a statistical comparison table.
 */
class CompareTable {
  public $div; // @var string name of HTML div element
  public $compareFrom; // @var CompareFrom[]

  function __construct($div, $compareFrom) {
    $this->div = $div;
    $this->compareFrom = $compareFrom;
  }
}

/**
 * Chart is a class describing a GViz chart.
 */
class Chart {
  public $div; // @var string name of HTML div element
  public $columns; // @var ChartColumn[] Columns in chart
  public $compareData; // @var CompareTable Comparison data table

  function __construct($div, $columns, $compareData) {
    $this->div = $div;
    $this->columns = $columns;
    $this->compareData = $compareData;
  }
}
?>
