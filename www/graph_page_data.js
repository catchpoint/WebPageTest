google.load("visualization", "1", {packages:["corechart", "table"]});
google.setOnLoadCallback(onLoadHandler);

/** Draws the chart for a metric.
  *
  * Takes a JSON object corresponding to a Chart class as
  * defined in graph_page_data.inc.
 */
function drawChart(chart_metric) {
  var data = new google.visualization.DataTable();

  // We construct the series plotting option, which
  // depends on each column in chart_metric except the
  // first.  For simplicity, we extract from all columns
  // and then drop the first.
  series = [];
  for (column in chart_metric['columns']) {
    chartColumn = chart_metric['columns'][column];
    data.addColumn('number', chartColumn.label);
    if (chartColumn.line) {
      series = series.concat({color: chartColumn.color});
    } else {
      series = series.concat({color: chartColumn.color,
        lineWidth: 0, pointSize: 3});
    }
  }
  series.shift();

  // Values is a map from run number (1-indexed) to value.
  for (i = 1; i <= runs; i++) {
    row = []
    for (column in chart_metric['columns']) {
       // If run i is missing, we add a cell with
        // an undefined array element as a placeholder.
      cell = chart_metric['columns'][column].values[i];
      row = row.concat([cell]);

    }
    data.addRow(row);
  }
  var options = {
      legend: (series.length == 1) ? 'none' : 'right',
      width: 950,
      height: Math.max(500, series.length * 45),
      lineWidth: 1,
      hAxis: {minValue: 1, maxValue: runs, gridlines: {count: runs}},
      series: series,
      chartArea: { width: "60%", left: 70, height: "85%" }
  }
  var chart = new google.visualization.LineChart(
      document.getElementById(chart_metric.div));
  chart.draw(data, options);

};

/** Given a p-value, returns "TRUE" if it is significant
  * or "FALSE" if it is not.
 */
function signifString(pValue) {
  if (pValue === null) {
    return "";
  } else if (pValue < 0.05) {
    return "TRUE";
  } else {
    return "FALSE";
  }
}

/** Draws a table for a metric.
  * Takes a JSON object corresponding to CompareTable
  * as defined in graph_page_data.inc.
 */
function drawTable(compareData) {
  var data = new google.visualization.DataTable();
  var selectEl = document.getElementById("control");
  var selectId = selectEl.options[selectEl.selectedIndex].value;
  data.addColumn('string', 'Variant');
  data.addColumn('number', 'Count');
  data.addColumn('string', 'Mean +/- 95% Conf. Int');
  data.addColumn('number', 'Diff of mean from ' + compareData.compareFrom[selectId].confData.label);
  data.addColumn('number', 'p-value (2-tailed)');
  data.addColumn('string', 'Significant?');
  for (index in compareData.compareFrom) {
    confData = compareData.compareFrom[index].confData;
    diff = compareData.compareFrom[index].diff;
    pValue = compareData.compareFrom[index].pValue,
    meanDisplay = confData.mean.toPrecision(6) + ' +/- ' +
      confData.ciHalfWidth.toPrecision(6)
    data.addRow([
      confData.label,
      confData.n,
      meanDisplay,
      diff,
      pValue,
      signifString(pValue)]);
  }
  var table = new google.visualization.Table(document.getElementById(compareData.div));
  var formatter = new google.visualization.NumberFormat(
    {'fractionDigits': 3});
  formatter.format(data, 3);
  formatter.format(data, 4);
  table.draw(data);
};

function onLoadHandler() {
  for (metric in chartData) {
    chart_metric = chartData[metric];
    drawChart(chart_metric);
    if (chart_metric.compareData.length > 0) {
      for (index in chart_metric.compareData) {
        drawTable(chart_metric.compareData[index]);
      }
    }
  }
};
