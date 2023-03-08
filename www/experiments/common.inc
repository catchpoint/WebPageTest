<?php

// container for assessment including opportunities, experiments to recommend

// initial host is used by a few opps, so we'll calculate it here
$initialHost = null;
$rootURL = null;
$initialOrigin = null;
foreach ($requests as $request) {
    if ($request['is_base_page'] == "true") {
        $initialHost = $request['host'];
        $rootURL = trim($request['full_url']);
        $initialOrigin = "http" . (strpos($rootURL, "https") === 0 ? "s" : "" ) . "://" . $initialHost;
        break;
    }
}


function documentRelativePath($url, $path)
{
    $basePath = explode('/', $path);
    array_pop($basePath);
    $basePath = implode('/', $basePath);
    if (strpos($url, $basePath) === 0) {
        $url = substr($url, strlen($basePath) + 1);
    }
    return $url;
}

// globals to be set by assessment includes and used here too
$blockingJSReqs = null;
$blockingCSSReqs = null;
$genContentPercent = null;
$genContentSize = null;
$blocking3pReqs = null;
//sec
$jsLibsVulns = null;
$numVulns = null;
$num_high = null;
$num_medium = null;
$num_serious = null;
//axe
$violations = null;
$num_violations = null;
$num_critical = null;
$num_moderate = null;
$num_minor = null;
$cls = null;

if ($metaInfo) {
    $assessmentData = $metaInfo['experiment']['assessment'];
}

// define $lcp for future experiments
if (!$testStepResult && isset($tests)) {
    $testStepResult = $tests[0]['stepResult'];
}
$browser = $test['testinfo']['browser'];
$events = $testStepResult->getMetric('largestPaints');
$lcp = null;
if (isset($events) && is_array($events)) {
    // Find the actual LCP event
    foreach ($events as $event) {
        if (isset($event['event']) && $event['event'] == 'LargestContentfulPaint' && isset($event['time']) && isset($event['size'])) {
            if (!isset($lcp) || $event['time'] > $lcp['time'] && $event['size'] > $lcp['size']) {
                $lcp = $event;
            }
        }
    }
}

// for custom metrics
$rawResultData = $testStepResult->getRawResults();
$customMetrics = null;
if (isset($rawResultData['custom']) && count($rawResultData['custom'])) {
    $customMetrics = $rawResultData['custom'];
}

// accessibility!
$axe = $testStepResult->getMetric('axe');


function is300s($req)
{
    return $req['responseCode'] >= 300 &&  $req['responseCode'] <= 399  && $req['responseCode'] != 304;
}

$requestsInitial = $testStepResult->getRequests();

function initiatedByRoot($request)
{
    global $rootURL;
    return strcasecmp($request['initiator'], $rootURL) === 0 || $request['initiator'] == '';
}


require_once OE_PATH . '/AssessmentRegistry.php';

// quick
require_once OE_PATH . '/slow-ttfb.inc';
require_once OE_PATH . '/render-blocking-scripts.inc';
require_once OE_PATH . '/render-blocking-css.inc';
require_once OE_PATH . '/lcp.inc';
require_once OE_PATH . '/imgs-lazy-loaded.inc';
require_once OE_PATH . '/imgs-lazy-loadable.inc';
require_once OE_PATH . '/font-rendering.inc';
require_once OE_PATH . '/fonts-3rdparty.inc';
require_once OE_PATH . '/unused-preloads.inc';
require_once OE_PATH . '/cdn.inc';
require_once OE_PATH . '/cache.inc';
require_once OE_PATH . '/http-redirects.inc';

// usable
require_once OE_PATH . '/layout-shifts.inc';
require_once OE_PATH . '/tbt.inc';
require_once OE_PATH . '/meta-viewport.inc';
require_once OE_PATH . '/axe-warnings.inc';

// resilient
require_once OE_PATH . '/render-blocking-3rd-party.inc';
require_once OE_PATH . '/security-jslibs.inc';
require_once OE_PATH . '/insecure-requests.inc';

// all
require_once OE_PATH . '/generated-content.inc';

require_once OE_PATH . '/custom.inc';

$assessment = AssessmentRegistry::getInstance()->getAll();

// fill out high-level info in
foreach ($assessment as $key => $cat) {
    $opps = $assessment[$key]["opportunities"];
    $numChecks = count($opps);
    $numExperiments = 0;
    $checkTitles = array();
    $oppTitles = array();
    $numGood = 0;
    foreach ($opps as $op) {
        if ($op["good"]) {
            $numGood++;
            array_push($checkTitles, $op["title"]);
        } elseif (isset($op["experiments"])) {
            array_push($oppTitles, $op["title"]);
            $numExperiments += count($op["experiments"]);
        }
    }
    $numRecommended = $numChecks - $numGood;
    $ending = $numRecommended === 1 ? "y" : "ies";

    $assessment[$key]["num_recommended"] = $numRecommended;
    $assessment[$key]["num_experiments"] = $numExperiments;
    $assessment[$key]["num_good"] = $numGood;
    $assessment[$key]["num_bad"] = $numChecks - $numGood;



    if ($key === "Quick") {
        // build sentiment
        $summary = "This site ";
        $ttfbCheck = $testStepResult->getMetric('TTFB');
        if ($ttfbCheck > 2000) {
            $summary .= "was very slow";
        } elseif ($ttfbCheck > 1000) {
            $summary .= "took little time";
        } else {
            $summary .= "was quick";
        }
        $summary .= " to connect and deliver initial code. It began rendering content";

        $fcpCheck = $testStepResult->getMetric('firstContentfulPaint');
        $fcpCheck = $fcpCheck / 1000;
        if ($fcpCheck > 5) {
            $summary .= " with considerable delay.";
        } elseif ($fcpCheck > 2) {
            $summary .= " with little delay.";
        } else {
            $summary .= " very quickly.";
        }

        if (isset($blockingCSSReqs) && isset($blockingJSReqs) && (count($blockingCSSReqs) > 0 || count($blockingJSReqs) > 0)) {
             $summary .= " There were " . ( count($blockingCSSReqs) + count($blockingJSReqs) ) . " render-blocking requests.";
        } else {
            $summary .= " There were no render-blocking requests.";
        }

        if (isset($lcp)) {
            $summary .= " The largest content rendered ";
            if ($lcp['time'] > 3500) {
                $summary .= " later than ideal.";
            } elseif ($lcp['time'] > 2500) {
                $summary .= " a little late.";
            } else {
                $summary .= " quickly.";
            }
        }
    } elseif ($key === "Usable") {
        // build sentiment
        $summary = "This site ";
        if (isset($cls)) {
            if ($cls > .25) {
                $summary .= "had major layout shifts";
            } elseif ($cls > 0) {
                $summary .= "had minor layout shifts";
            } else {
                $summary .= "had good layout stability";
            }
            $summary .= ".";
        }

        $tbtCheck = $testStepResult->getMetric('TotalBlockingTime');
        if (isset($tbtCheck)) {
            (isset($cls)) ? $summary .= " It took" : $summary .= "took";
            if ($tbtCheck > 1000) {
                $summary .= " a long time";
            } elseif ($tbtCheck > 500) {
                $summary .= " some time";
            } else {
                $summary .= " little time";
            }
            $summary .= " to become interactive. ";
        }

        if (isset($axe) && count($axe['violations'])) {
            $summary .= " It had $num_violations accessibility issues, ";
            if ($num_critical > 0) {
                $summary .= " $num_critical critical";
            } elseif ($$num_serious > 0) {
                $summary .= "$num_critical serious";
            } else {
                $summary .= " none serious";
            }
            $summary .= ".";
        }
        if (isset($genContentSize) && isset($genContentPercent)) {
            $genContentSize = floatval($genContentSize);
            $genContentPercent = floatval($genContentPercent);

            if ($genContentSize > .5 || $genContentPercent > 1) {
                $summary .= " Some HTML was generated after delivery, potentially delaying usability.";
            } else {
                $summary .= " HTML content was mostly generated server-side.";
            }
        }
    } elseif ($key === "Resilient") {
        // build sentiment
        $summary = "This site ";
        if (isset($blocking3pReqs)) {
            if (count($blocking3pReqs) > 2) {
                $summary .= "had many";
            } elseif (count($blocking3pReqs) > 0) {
                $summary .= "had";
            } else {
                $summary .= "had no";
            }
            $summary .= " render-blocking 3rd party requests that could be a single point of failure.";
        }
        if ($jsLibsVulns) {
            (isset($blocking3pReqs)) ? $summary .= " It had $numVulns security issues" : $summary .= "had $numVulns security issues";
            if ($num_high > 0) {
                $summary .= ", $num_high high-priority";
            } elseif ($num_medium > 0) {
                $summary .= ", $num_medium low-priority";
            } elseif ($num_low > 0) {
                $summary .= ", $num_low low-priority";
            }

            $summary .= ".";
        } else {
            (isset($blocking3pReqs)) ? $summary .= " It had no security issues." : $summary .= "had no security issues.";
        }
        if (isset($genContentSize) && isset($genContentPercent)) {
            $genContentSize = floatval($genContentSize);
            $genContentPercent = floatval($genContentPercent);

            if ($genContentSize > .5 || $genContentPercent > 1) {
                $summary .= " Some HTML was generated after delivery, which can cause fragility.";
            } else {
                $summary .= " HTML content was mostly generated server-side.";
            }
        }
    } else {
        $summary = "Use this section to create custom experiments to add to your test.";
    }

    if ($key === "Custom") {
        $assessment[$key]["grade"] = "";
        $assessment[$key]["sentiment"] = "<span class=\"opportunity_summary_sentiment\">Advanced.</span>";
    } elseif (
        $numRecommended > 2
        // and it's the quickness category and fcp is reasonably slow
        && ($key !== "Quick" || $key === "Quick" && $fcpCheck > 3 )
        && ($key !== "Resilient" || $key === "Resilient" && $blocking3pReqs > 0  )
        && ($key !== "Usable" || $key === "Usable" && ((isset($cls) && $cls > 0) || (isset($tbtCheck) && $tbtCheck > 2))  )
    ) {
        $assessment[$key]["grade"] = "f";
        $assessment[$key]["sentiment"] = "<span class=\"opportunity_summary_sentiment\">Needs Improvement.</span>";
    } elseif ($numRecommended > 0) {
        $assessment[$key]["grade"] = "c";
        $assessment[$key]["sentiment"] = "<span class=\"opportunity_summary_sentiment\">Not bad...</span>";
    } else {
        $assessment[$key]["grade"] = "a";
        $assessment[$key]["sentiment"] = "<span class=\"opportunity_summary_sentiment\">Looks great!</span>";
    }

    $assessment[$key]["summary"] = $summary;
}
