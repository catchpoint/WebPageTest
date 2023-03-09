<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
require_once INCLUDES_PATH . '/object_detail.inc';
require_once INCLUDES_PATH . '/page_data.inc';
require_once INCLUDES_PATH . '/waterfall.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestRunResults.php';
require_once INCLUDES_PATH . '/include/RunResultHtmlTable.php';
require_once INCLUDES_PATH . '/include/WaterfallViewHtmlSnippet.php';

$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, null);
$data = loadPageRunData($testPath, $run, $cached, $test['testinfo']);

$page_keywords = array('Custom', 'Waterfall', 'WebPageTest', 'Website Speed Test');
$page_description = "Website speed test custom waterfall$testLabel";
?>
<!DOCTYPE html>
<html lang="en-us">

<head>
    <title>WebPageTest Custom Waterfall<?php echo $testLabel; ?></title>
    <?php include('head.inc'); ?>
</head>

<body id="custom-waterfall">
    <?php
    $tab = null;
    include 'header.inc';
    ?>
    <div class="customwaterfall_hed">
        <h1>Generate a Custom Waterfall</h1>
        <details open class="box details_panel">
            <summary class="details_panel_hed"><span><i class="icon_plus"></i> <span>Waterfall Settings</span></span></summary>
            <form class="details_panel_content" id="details_form" action="javascript:updateWaterfall();" method="GET">
                <fieldset>
                    <legend>Chart Type</legend>
                    <label><input type="radio" name="type" value="waterfall" checked>Waterfall</label>
                    <label><input type="radio" name="type" value="connection">Connection View</label>
                </fieldset>
                <fieldset>
                    <legend>Chart Coloring</legend>
                    <label><input type="radio" name="mime" value="0"> Classic</label>
                    <label><input type="radio" name="mime" value="1" checked="checked"> By MIME Type</label>
                </fieldset>
                <fieldset>
                    <label>Image Width <em>(Pixels, 300-2000)</em>: <input id="width" type="text" name="width" style="width:3em" value="1012"></label>
                    <label>Maximum Time <em>(In seconds, leave blank for automatic)</em>: <input id="max" type="text" name="max" style="width:2em" value=""></label>
                    <label>Requests <em>(i.e. 1,2,3,4-9,8)</em>: <input id="requests" type="text" name="requests" value=""></label>
                </fieldset>
                <fieldset>
                    <legend>Show/Hide Extras</legend>
                    <label><input id="ut" type="checkbox" checked>Lines for User Timing Marks</label>
                    <label><input id="cpu" type="checkbox" checked>CPU Utilization</label>
                    <label><input id="bw" type="checkbox" checked>Bandwidth Utilization</label>
                    <label><input id="lt" type="checkbox" checked>Long tasks</label>
                    <label><input id="dots" type="checkbox" checked>Ellipsis (...) for missing items</label>
                    <label><input id="labels" type="checkbox" checked>Labels for requests (URL)</label>
                    <label><input id="chunks" type="checkbox" checked>Download chunks</label>
                    <label><input id="js" type="checkbox" checked>JS Execution chunks</label>
                    <label><input id="wait" type="checkbox" checked>Wait Time</label>
                </fieldset>
                <a href="#" id="customized-permalink">Permalink to this waterfall page</a>
            </form>
        </details>
    </div>
    <div class="box">

        <?php
        $uri_params = [
            'max' => '',
            'width' => 1012,
            'type' => 'waterfall',
            'mime' => 1,
            'ut' => 1,
            'cpu' => 1,
            'bw' => 1,
            'lt' => 1,
            'dots' => 1,
            'labels' => 1,
            'chunks' => 1,
            'js' => 1,
            'wait' => 1,
            'requests' => '',
        ];
        $server_params = [
            'test' => $id,
            'run' => $run,
            'cached' => $cached,
            'step' => $step,
        ];
        $request_params = [];
        foreach ($server_params as $key => $default) {
            $request_params[$key] = $default;
            if (array_key_exists($param, $_REQUEST)) {
                $request_params[$param] = $_REQUEST[$param];
            }
        }
        foreach ($uri_params as $key => $default) {
            $request_params[$key] = $default;
            if (array_key_exists($key, $_REQUEST)) {
                $request_params[$key] = $_REQUEST[$key];
            }
        }
        $query_string = http_build_query($request_params);
        $waterfallSnippet = new WaterfallViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
        echo $waterfallSnippet->create(true, $query_string);

        $extension = 'php';
        if (FRIENDLY_URLS) {
            $extension = 'png';
        }
        echo "<div class=\"waterfall-container\"><img id=\"waterfallImage\" style=\"display: block; margin-left: auto; margin-right: auto;\" alt=\"Waterfall\" src=\"/waterfall.$extension?$query_string\"></div>";
        echo "<p class=\"customwaterfall_download\"><a id=\"waterfallImageLink\" class=\"pill\" download href=\"/waterfall.$extension?$query_string\">Download Waterfall Image</a></p>";

        ?>
    </div>
    <?php include('footer.inc'); ?>

    <script>
        const details_form = document.getElementById('details_form');
        const permalink = document.getElementById('customized-permalink');
        permalink.href = location.origin + location.pathname + '?<?php echo $query_string; ?>';

        const formInputs = ['<?php echo implode("', '", array_keys($uri_params));?>'];
        const serverData = {
            test: '<?php echo $id; ?>',
            run: <?php echo (int)$run; ?>,
            cached: <?php echo (int)$cached; ?>,
            step: <?php echo (int)$step; ?>,
        };
        const requestParams = <?php echo json_encode($request_params); ?>;

        formInputs.forEach(i => {
            const inputElement = details_form[i];
            if (inputElement.type === 'checkbox') {
                inputElement.checked = requestParams[i] == 1;
            } else {
                inputElement.value = requestParams[i];
            }
        });
        details_form.requests.disabled = details_form.type.value === 'connection';

        // event isteners
        details_form.addEventListener('input', updateWaterfall);
        document.getElementById('waterfallImage').addEventListener('load', () => {
            document.body.style.cursor = 'default';
        });

        function getFormParams() {
            const params = {};
            Object.keys(serverData).forEach(k => params[k] = serverData[k]);
            formInputs.forEach(i => {
                const inputElement = details_form[i];
                if (inputElement.type === 'checkbox') {
                    params[i] = inputElement.checked === true ? 1 : 0;
                } else {
                    params[i] = inputElement.value;
                }
            });
            return params;
        }

        function updateWaterfall() {
            document.body.style.cursor = 'wait';
            details_form.requests.disabled = details_form.type.value === 'connection';

            const params = getFormParams();
            let search = '?';
            Object.keys(params).forEach(param => {
                search += param + '=' + encodeURIComponent(params[param]) + '&';
            });

            const extension = '<?php echo $extension; ?>';
            const src = '/waterfall.' + extension + search;
            document.getElementById('waterfallImage').src = src;
            document.getElementById('waterfallImageLink').href = src;
            permalink.href = location.origin + location.pathname + search;
        };
    </script>
</body>

</html>