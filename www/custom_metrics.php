<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
require_once('page_data.inc');
$page_keywords = array('View Custom Metrics','WebPageTest','Website Speed Test','Page Speed');
$page_description = "View Custom Metrics";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPageTest - View Custom Metrics</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="author" content="Patrick Meenan">
        <?php include ('head.inc'); ?>
        <style>
        table.pretty td, table.pretty th {
            overflow: hidden;
            text-align: left;
            max-width: 800px;
        }
        </style>
    </head>
    <body>
            <?php
            $tab = 'Test Result';
            include 'header.inc';
            ?>

            <div id="result">
            <?php
            $pageData = loadAllPageData($testPath);
            if (isset($pageData) &&
                is_array($pageData) &&
                array_key_exists($run, $pageData) &&
                is_array($pageData[$run]) &&
                array_key_exists($cached, $pageData[$run]) &&
                array_key_exists('custom', $pageData[$run][$cached]) &&
                is_array($pageData[$run][$cached]['custom']) &&
                count($pageData[$run][$cached]['custom'])) {
              echo '<h1>Custom Metrics</h1>';
              echo '<table class="pretty">';
              foreach ($pageData[$run][$cached]['custom'] as $metric) {
                if (array_key_exists($metric, $pageData[$run][$cached])) {
                  echo '<tr><th>' . htmlspecialchars($metric) . '</th><td>';
                  echo htmlspecialchars($pageData[$run][$cached][$metric]);
                  echo '</td></tr>';
                }
              }
              echo '</table>';
            } else {
              echo '<h1>No custom metrics reported</h1>';
            }
            ?>
            </div>
          </div>
            <?php include('footer.inc'); ?>
    </body>
</html>
