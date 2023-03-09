<?php

$cruxStyles = false;
// Helper to get the CrUX data for a given URL
function GetCruxDataForURL($url, $mobile = false)
{
    $crux_data = null;
    $api_key = GetSetting('crux_api_key', null);
    if (isset($api_key) && strlen($api_key) && strlen($url)) {
        if (substr($url, 0, 4) != 'http') {
            $url = 'http://' . $url;
        }

        $cache_key = sha1($url);
        if ($mobile) {
            $cache_key .= '.mobile';
        }
        $crux_data = GetCachedCruxData($cache_key);

        if (!isset($crux_data)) {
            $options = array(
                'url' => $url,
                'formFactor' => $mobile ? 'PHONE' : 'DESKTOP'
            );
            $result = http_post_raw(
                "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$api_key",
                json_encode($options),
                'application/json',
                true
            );
            if (isset($result) && is_string($result)) {
                $crux_data = $result;
            }

            CacheCruxData($cache_key, $crux_data);
        }
    }
    return $crux_data;
}

function GetCachedCruxData($cache_key)
{
    $crux_data = null;
    $today = gmdate('Ymd');
    $cache_path = __DIR__ . "/../results/crux_cache/$today/" . substr($cache_key, 0, 2) . "/$cache_key.json";
    if (file_exists($cache_path)) {
        $crux_data = file_get_contents($cache_path);
    }

    return $crux_data;
}

function CacheCruxData($cache_key, $crux_data)
{
    if (isset($crux_data) && strlen($crux_data)) {
        $today = gmdate('Ymd');
        $cache_path = __DIR__ . "/../results/crux_cache/$today/" . substr($cache_key, 0, 2);
        mkdir($cache_path, 0777, true);
        $cache_path .= "/$cache_key.json";
        file_put_contents($cache_path, $crux_data);
    }
}

// Delete any cache directories that don't match the current date
function PruneCruxCache()
{
    $cache_path = __DIR__ . '/../results/crux_cache';
    if (is_dir($cache_path)) {
        $today = gmdate('Ymd');
        $files = scandir($cache_path);
        foreach ($files as $file) {
            if ($file !== '.' && $file != '..' && $file != $today) {
                delTree("$cache_path/$file");
            }
        }
    }
}
// returns a string of the Real User Measurement title for results.php if CrUX has collectionPeriod
function RealUserMeasurementCruxTitle($pageData)
{

    $ret = '<h3 class="hed_sub">Real-World Usage Metrics</h3><div class="crux_subhed"><p class="crux_subhed_desc">Compare this WebPageTest run with browser-collected performance data for this site.</p>';

    $cruxOrigin = $pageData['CrUX']['key']['url'];
    $cruxStudioURL = "https://lookerstudio.google.com/reporting/bbc5698d-57bb-4969-9e07-68810b9fa348/page/keDQB?params=%7B%22origin%22:%22" . urlencode($cruxOrigin) . "%22%7D";
    if (
        isset($pageData['CrUX']['collectionPeriod']) &&
        isset($pageData['CrUX']['collectionPeriod']['firstDate']) &&
        isset($pageData['CrUX']['collectionPeriod']['lastDate'])
    ) {
        $firstDate = $pageData['CrUX']['collectionPeriod']['firstDate'];
        $lastDate = $pageData['CrUX']['collectionPeriod']['lastDate'];
        $startDate = date('F j\, Y', mktime(0, 0, 0, $firstDate['month'], $firstDate['day'], $firstDate['year']));
        $endDate = date('F j\, Y', mktime(0, 0, 0, $lastDate['month'], $lastDate['day'], $lastDate['year']));
        // Example: Real User Measurements (Collected anonymously by Chrome browser via Chrome User Experience Report, between October 15, 2022 and September 18, 2022)
        $ret .= sprintf('<p class="crux_subhed_cite">(Collected anonymously by Chrome browser from %s to %s | <a href="%s">Full Report</a>)</p>', $startDate, $endDate, $cruxStudioURL);
    } else {
        $ret .= sprintf('<p class="crux_subhed_cite">(Collected anonymously by Chrome browser | <a href="%s">Full Report</a>)</p>', $cruxStudioURL);
    }
    $ret .= "</div>";
    return $ret;
}

function InsertCruxHTML($fvRunResults, $rvRunResults, $metric = '', $includeLabels = true, $includeMetricName = true)
{
    $pageData = null;
    $rvPageData = null;
    global $cruxStyles;
    if (isset($fvRunResults)) {
        $stepResult = $fvRunResults->getStepResult(1);
        if ($stepResult) {
            $pageData = $stepResult->getRawResults();
        }
    }

    if (
        isset($pageData) &&
        is_array($pageData) &&
        isset($pageData['CrUX']) &&
        is_array($pageData['CrUX']) &&
        isset($pageData['CrUX']['metrics'])
    ) {
        if (!$cruxStyles) {?>
            <?php
            $cruxStyles = true;
        }
        echo '<div class="crux">';
        echo RealUserMeasurementCruxTitle($pageData);


        // The individual metrics
        echo '<div class="cruxbars">';
        if ($metric == '') {
            //show all
            InsertCruxMetricHTML($pageData, 'chromeUserTiming.firstContentfulPaint', 'first_contentful_paint', 'First Contentful Paint', 'FCP', $includeMetricName);
            InsertCruxMetricHTML($pageData, 'chromeUserTiming.LargestContentfulPaint', 'largest_contentful_paint', 'Largest Contentful Paint', 'LCP', $includeMetricName);
            InsertCruxMetricHTML($pageData, 'chromeUserTiming.CumulativeLayoutShift', 'cumulative_layout_shift', 'Cumulative Layout Shift', 'CLS', $includeMetricName);
            InsertCruxMetricHTML($pageData, null, 'first_input_delay', 'First Input Delay', 'FID', $includeMetricName);
            InsertCruxMetricHTML($pageData, 'TTFB', 'experimental_time_to_first_byte', 'Time to First Byte', 'TTFB', $includeMetricName);
            InsertCruxMetricHTML($pageData, null, 'experimental_interaction_to_next_paint', 'Interaction to Next Paint', 'INP', $includeMetricName);
        } elseif ($metric == 'fcp') {
            InsertCruxMetricHTML($pageData, 'chromeUserTiming.firstContentfulPaint', 'first_contentful_paint', 'First Contentful Paint', 'FCP', $includeMetricName);
        } elseif ($metric == 'lcp') {
            InsertCruxMetricHTML($pageData, 'chromeUserTiming.LargestContentfulPaint', 'largest_contentful_paint', 'Largest Contentful Paint', 'LCP', $includeMetricName);
        } elseif ($metric == 'cls') {
            InsertCruxMetricHTML($pageData, 'chromeUserTiming.CumulativeLayoutShift', 'cumulative_layout_shift', 'Cumulative Layout Shift', 'CLS', $includeMetricName);
        } elseif ($metric == 'fid') {
            InsertCruxMetricHTML($pageData, null, 'first_input_delay', 'First Input Delay', 'FID', $includeMetricName);
        } elseif ($metric == 'ttfb') {
            InsertCruxMetricHTML($pageData, 'TTFB', 'experimental_time_to_first_byte', 'Time to First Byte', 'TTFB', $includeMetricName);
        } elseif ($metric == 'inp') {
            InsertCruxMetricHTML($pageData, null, 'experimental_interaction_to_next_paint', 'Interaction to Next Paint', 'INP', $includeMetricName);
        } elseif ($metric == 'cwv') {
            InsertCruxMetricHTML($pageData, 'chromeUserTiming.LargestContentfulPaint', 'largest_contentful_paint', 'Largest Contentful Paint', 'LCP', $includeMetricName);
            InsertCruxMetricHTML($pageData, 'chromeUserTiming.CumulativeLayoutShift', 'cumulative_layout_shift', 'Cumulative Layout Shift', 'CLS', $includeMetricName);
            InsertCruxMetricHTML($pageData, null, 'first_input_delay', 'First Input Delay', 'FID', $includeMetricName);
        }


        echo '</div>';

        echo '<details class="metrics_shown" id="crux_diff_why">
            <summary><strong>Note:</strong> Why can real browser usage metrics vary from test run metrics?</summary>
            <p>Variance between your test run and real world usage is expected because a WebPageTest run uses a specific connection speed, and real world data spans all connection speeds. To closely match the p75 user in WebPageTest, try rerunning your test using a different connection speed.</p>
            </details>';
        echo <<<EOD
        <script>
        let cruxContain = document.querySelector(".crux");
        cruxContain.addEventListener("click", (e) => {
            if( e.target && e.target.closest("a[href='#crux_diff_why'") ){
                document.getElementById("crux_diff_why").open = true;
            }
        });
        </script>
        EOD;

        echo '</div>';
    }
}

function InsertCruxMetricHTML($fvPageData, $metric, $crux_metric, $label, $short, $includeLabels = true)
{
    $fvValue = null;
    $rvValue = null;
    $histogram = null;
    $p75 = null;
    if (isset($fvPageData) && is_array($fvPageData) && isset($fvPageData[$metric])) {
        $fvValue = $fvPageData[$metric];
    }
    if (isset($rvPageData) && is_array($rvPageData) && isset($rvPageData[$metric])) {
        $rvValue = $rvPageData[$metric];
    }
    if (isset($fvPageData['CrUX']['metrics'][$crux_metric]['histogram'])) {
        $histogram = $fvPageData['CrUX']['metrics'][$crux_metric]['histogram'];
    }
    if (isset($fvPageData['CrUX']['metrics'][$crux_metric]['percentiles']['p75'])) {
        $p75 = $fvPageData['CrUX']['metrics'][$crux_metric]['percentiles']['p75'];
        $p75Score = "good";
        if ($p75 >=  $histogram[0]['end']) {
            $p75Score = "fair";
        }
        if ($p75 >=  $histogram[1]['end']) {
            $p75Score = "poor";
        }
    }
    if (isset($histogram) && is_array($histogram) && count($histogram) == 3) {
        InsertCruxMetricImage($label, $short, $histogram, $p75, $fvValue, $rvValue, $includeLabels, $p75Score);
    }
}



function InsertCruxMetricImage($label, $short, $histogram, $p75, $fvValue, $rvValue, $includeLabels = true, $p75Score)
{

    if (is_float($p75)) {
        $p75 = round($p75, 3);
    }
    $goodPct = intval(round($histogram[0]['density'] * 100));
    $fairPct = intval(round($histogram[1]['density'] * 100));
    $poorPct = intval(round($histogram[2]['density'] * 100));
    $goodClass = $goodPct < 10 ? " crux_bars-hidelabel" : "";
    $fairClass = $fairPct < 10 ? " crux_bars-hidelabel" : "";
    $poorClass = $poorPct < 10 ? " crux_bars-hidelabel" : "";
    $metricDiff = '';

    $metricDiff = '<p class="crux_diff">Field metric only, no WPT test run data.</p>';


    if (isset($fvValue)) {
        if (is_float($fvValue)) {
            $fvValue = round($fvValue, 3);
        }
        if ($p75 === $fvValue) {
            $metricDiff = '<p class="crux_diff">Same result as this WPT run.</p>';
        }

        if ($p75 !== $fvValue) {
            $absMetricDiff = abs($p75 - $fvValue);

            if ($short !== 'CLS') {
                $absMetricDiff = formatMsInterval($absMetricDiff, 2);
            }

            $wptCompare = "better";
            $cruxCompare = "worse";
            if ($p75 < $fvValue) {
                $wptCompare = "worse";
                $cruxCompare = "better";
            }
            if ($short !== 'CLS') {
                $fvValue = formatMsInterval($fvValue, 2);
            }
            $metricDiff = <<<EOD
            <p class="crux_diff">$absMetricDiff $cruxCompare than this WPT test run's first view ($fvValue). <a href="#crux_diff_why"> Why?</a></p>
        EOD;
        }
    }


    if ($short !== 'CLS') {
        $p75 = formatMsInterval($p75, 2);
    }

    $svg = <<<EOD
<div class="crux_metric">
<h4 class="crux_metric_title">$label ($short)</h4>
<p class="crux_metric_value crux_metric_value-$p75Score">$p75 <em>($p75Score)</em></p>
<p class="crux_metric_desc">At 75th percentile of visits.</p>
<ul class="crux_bars">
    <li class="crux_bars-good$goodClass" style="flex-basis: $goodPct%">$goodPct%</li>
    <li class="crux_bars-fair$fairClass" style="flex-basis: $fairPct%">$fairPct%</li>
    <li class="crux_bars-poor$poorClass" style="flex-basis: $poorPct%">$poorPct%</li>
</ul>
$metricDiff
</div>
EOD;
    echo $svg;
}

function GetCruxValuePosition($value, $maxVal, $histogram, $width, &$color)
{
    $pos = null;
    $goodWidth = $histogram[0]['density'] * floatval($width);
    $fairWidth = $histogram[1]['density'] * floatval($width);
    $poorWidth = $histogram[2]['density'] * floatval($width);
    if ($value <= $histogram[0]['end']) {
        $pct = floatval($value) / floatval($histogram[0]['end']);
        $pos = $pct * $goodWidth;
        $color = '#009316';
    } elseif ($value <= $histogram[1]['end']) {
        $pct = floatval($value - $histogram[1]['start']) / floatval($histogram[1]['end'] - $histogram[1]['start']);
        $pos = $goodWidth + ($pct * $fairWidth);
        $color = '#ffa400';
    } else {
        $pct = min(floatval($value - ($maxVal - $value)) / floatval($maxVal), 1.0);
        $pos = $goodWidth + $fairWidth + ($pct * $poorWidth);
        $color = '#ff4e42';
    }
    return intval($pos);
}