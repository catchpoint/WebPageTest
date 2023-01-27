<!DOCTYPE html>
<html lang="en-us">

<head>
    <title>WebPageTest - Traceroute test result <?php echo $testLabel; ?></title>
    <script>
        document.documentElement.classList.add('has-js');
    </script>

    <?php
    $page_keywords = array('Traceroute', 'WebPageTest', 'Website Speed Test', 'Page Speed');
    $page_description = "Traceroute result.";
    include('head.inc');
    ?>
</head>

<body class="result">
    <?php
    $tab = 'Test Result';
    $hideResultsNav = true;
    include 'header.inc';
    ?>

    <div class="results_main_contain">
        <div class="results_main">
            <div class="results_and_command">
                <div class="results_header">
                    <h2>Traceroute Test Results</h2>
                    <p>Here's how this site performed in this traceroute test. </p>
                </div>
            </div>

            <div id="result" class="results_body">
                <h3 class="hed_sub">Individual Runs</h3>
                <?php
                for ($run = 1; $run <= $test['test']['runs']; $run++) {
                    echo "<h4>Run $run</h4>";
                    echo '<div class="scrollableTable">';
                    DisplayTraceroute($testPath, $run);
                    echo '</div>';
                }
                ?>
            </div>
            <?php include('footer.inc'); ?>
        </div>
    </div>
</body>

</html>

<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
/**
 * Output the data table for the traceroute
 *
 * @param mixed $testPath
 * @param mixed $run
 */
function DisplayTraceroute(&$testPath, $run)
{
    ?>
    <table class="pretty details">
        <?php
        $rows = gz_file("$testPath/{$run}_traceroute.txt");
        if (count($rows) > 2) {
            $hops = array();
            $addr = '';
            foreach ($rows as &$row) {
                $parseLine = str_replace(",", ", ", $row);
                $fields = explode(",", $parseLine);
                $data = array(
                    'hop' => trim($fields[0]),
                    'addr' => trim($fields[1]),
                    'time' => trim($fields[2]),
                    'name' => trim($fields[3])
                );
                if (array_key_exists('hop', $data) && is_numeric($data['hop'])) {
                    $data['hop'] = intval($data['hop']);
                    if (array_key_exists('addr', $data) && strlen($data['addr'])) {
                        $addr = $data['addr'];
                    }
                    if (!array_key_exists('addr', $data) || !strlen($data['addr'])) {
                        $data['addr'] = '-';
                    }
                    if (!array_key_exists('time', $data) || !strlen($data['time'])) {
                        $data['time'] = '-';
                    }
                    if (!array_key_exists('name', $data) || !strlen($data['name'])) {
                        $data['name'] = '-';
                    }
                    $hops[$data['hop']] = $data;
                }
            }
            if (
                array_key_exists(-1, $hops) &&
                array_key_exists('addr', $hops[-1]) &&
                strlen($hops[-1]['addr'])
            ) {
                $addr = $hops[-1]['addr'];
            }

            $index = 0;
            foreach ($hops as $hop => $data) {
                if ($hop > 0) {
                    $index++;
                    if ($index == 1) {
                        echo "<caption>Traceroute #$run to $addr</caption>\n";
                        ?>
                        <thead>
                            <tr>
                                <th>Hop</th>
                                <th>Time (ms)</th>
                                <th>IP Address</th>
                                <th>FQDN</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php
                    }
                    echo "<tr>\n";
                    echo "<td>{$data['hop']}</td>\n";
                    echo "<td>{$data['time']}</td>\n";
                    echo "<td>{$data['addr']}</td>\n";
                    echo "<td>{$data['name']}</td>\n";
                    echo "</tr>\n";
                }
            }
            echo "</tbody>\n";
        }
        ?>
    </table>
    <?php
}

?>