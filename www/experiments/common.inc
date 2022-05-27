<?php
// container for assessment including opportunities, experiments to recommend

function documentRelativePath($url, $path){
    $basePath = explode('/', $path);
    array_pop($basePath);
    $basePath = implode('/', $basePath);
    if( strpos($url, $basePath) === 0 ){
        $url = substr($url, strlen($basePath) + 1); 
    }
    return $url;
}




if( $metaInfo ){
	$assessmentData = $metaInfo['experiment']['assessment'];

}
$assessment = array(
	"Quick" => array(
		"grade" => "",
		"sentiment" => "",
		"summary" => "",
		"opportunities" => array(),
		"num_recommended" => 0,
		"num_experiments" => 0
	), 
	"Usable" => array(
		"grade" => "",
		"sentiment" => "",
		"summary" => "",
		"opportunities" => array(),
		"num_recommended" => 0,
		"num_experiments" => 0
	), 
	"Resilient" => array(
		"grade" => "",
		"sentiment" => "",
		"summary" => "",
		"opportunities" => array(),
		"num_recommended" => 0,
		"num_experiments" => 0
	),
	"Custom" => array(
		"grade" => "",
		"sentiment" => "Advanced!",
		"summary" => "",
		"opportunities" => array(),
		"num_recommended" => 0,
		"num_experiments" => 0
	)
);






// define $lcp for future experiments
if(!$testStepResult && isset($tests)){
	$testStepResult = $tests[0]['stepResult'];
}
$browser = $test['testinfo']['browser'];
$events = $testStepResult->getMetric('largestPaints');
$lcp = null;
if (isset($events) && is_array($events)) {
	// Find the actual LCP event
	foreach($events as $event) {
		if(isset($event['event']) && $event['event'] == 'LargestContentfulPaint' && isset($event['time']) && isset($event['size'])) {
			if(!isset($lcp) || $event['time'] > $lcp['time'] && $event['size'] > $lcp['size']) {
				$lcp = $event;
			}
		}
	}
}

// for custom metrics
$rawResultData = $testStepResult->getRawResults();
$customMetrics = null;
if( isset($rawResultData['custom']) && count($rawResultData['custom']) ){
	$customMetrics = $rawResultData['custom'];
}

// accessibility!
$axe = $testStepResult->getMetric('axe');


function is300s($req){
    return $req['responseCode'] >= 300 &&  $req['responseCode'] <= 399  && $req['responseCode'] != 304;
}

$requestsInitial = $testStepResult->getRequests();
$firstNonRedirect = $requestsInitial[0]['url'];
foreach ($requestsInitial as $request) {
    if( isset($request['responseCode']) && !is300s($request)){
        $firstNonRedirect = $request['full_url'];
        break;
    }
}
function initiatedByRoot($request){
	return $request['initiator'] == $firstNonRedirect;
}


// quick
include __DIR__ . '/slow-ttfb.inc';
include __DIR__ . '/render-blocking-scripts.inc';
include __DIR__ . '/render-blocking-css.inc';
include __DIR__ . '/lcp.inc';
include __DIR__ . '/imgs-lazy-loaded.inc';
include __DIR__ . '/imgs-lazy-loadable.inc';
include __DIR__ . '/font-rendering.inc';
include __DIR__ . '/fonts-3rdparty.inc';
include __DIR__ . '/unused-preloads.inc';
include __DIR__ . '/http-redirects.inc';

// usable
include __DIR__ . '/layout-shifts.inc';
include __DIR__ . '/tbt.inc';
include __DIR__ . '/meta-viewport.inc';
include __DIR__ . '/axe-warnings.inc';

// resilient
include __DIR__ . '/render-blocking-3rd-party.inc';
include __DIR__ . '/security-jslibs.inc';
include __DIR__ . '/insecure-requests.inc';

// all
include __DIR__ . '/generated-content.inc';

include __DIR__ . '/custom.inc';





// fill out high-level info in 
foreach($assessment as $key => $cat ){
	$opps = $assessment[$key]["opportunities"];
	$numChecks = count($opps);
	$numExperiments = 0;
	$checkTitles = array();
	$oppTitles = array();
	$numGood = 0;
	foreach($opps as $op){
		if( $op["good"] ){
			$numGood++;
			array_push($checkTitles, $op["title"]);
		} else {
			array_push($oppTitles, $op["title"]);
			$numExperiments+= count($op["experiments"]);
		}
	}
	$numRecommended = $numChecks - $numGood;
	$ending = $numRecommended === 1 ? "y" : "ies";

	$assessment[$key]["num_recommended"] = $numRecommended;
	$assessment[$key]["num_experiments"] = $numExperiments;
	$assessment[$key]["num_good"] = $numGood;
	$assessment[$key]["num_bad"] = $numChecks - $numGood;

	

	if( $key === "Quick" ){
		// build sentiment
		$summary = "This site ";
		$ttfbCheck = $testStepResult->getMetric('TTFB');
		if( $ttfbCheck > 2000 ){
			$summary .= " was very slow";
		} else if( $ttfbCheck > 1000 ){
			$summary .= "took little time";
		}
		else {
			$summary .= "was quick";
		}
		$summary .= " to connect and deliver initial code. It began rendering content ";

		$fcpCheck = $testStepResult->getMetric('firstContentfulPaint');
		if( $fcpCheck > 5 ){
			$summary .= " with considerable delay ";
		} else if( $fcpCheck > 2 ){
			$summary .= " with little delay ";
		}
		else {
			$summary .= " very quickly ";
		}

		$tbtCheck = $testStepResult->getMetric('TotalBlockingTime');
		$summary .= "after that. It took ";
		if( $tbtCheck > 2 ){
			$summary .= " a long time ";
		} else if( $tbtCheck > 1 ){
			$summary .= " considerable time ";
		}
		else {
			$summary .= " little time ";
		}
		$summary .= " to become interactive.";
	} else if( $key === "Usable" ) {
		// build sentiment
		$summary = "This site ";
		if( isset($cls) ){
			if( $cls > .25 ){
				$summary .= "had major layout shifts";
			} else if( $cls > .1 ){
				$summary .= "had minor layout shifts";
			}
			else {
				$summary .= "had good layout stability";
			}
			$summary .= ".";
		}
		
		if( isset($axe) && count($axe['violations']) ){

			
			$summary .= " It had $num_violations accessibility issues, ";
			if( $num_critical > 0 ){
				$summary .= " $num_critical critical";
			} else if( $$num_serious > 0 ){
				$summary .= "$num_critical serious";
			}
			else {
				$summary .= " none serious";
			}
			$summary .= ".";
		}
		if( isset($genContentSize) && isset($genContentPercent) ){
			$genContentSize = intval($genContentSize);
			$genContentPercent = intval($genContentPercent);
		
			if( $genContentSize > .5 || $genContentPercent > 1 ){
				$summary .= " " . $genContentSize ."kb of HTML (".$genContentPercent."%) was generated client-side, delaying usability.";
			}
			else {
				$summary .= " HTML content was mostly generated server-side.";
			}
		}
	} else if( $key === "Resilient" ) {
		$summary = "This site ";
		// build sentiment
		$summary = "This site ";
		if( isset($blocking3pReqs) ){
			
			if( $blocking3pReqs > 2 ){
				$summary .= "had many";
			} else if( $blocking3pReqs > 0 ){
				$summary .= "had several";
			}
			else {
				$summary .= "had zero";
			}
			$summary .= " render-blocking 3rd party requests.";
		}
		if( $jsLibsVulns ){
			$summary .= "It had $numVulns security issues"; 
			if( $num_high > 0 ){
				$summary .= ", $num_high high-priority";
			} else if( $num_medium > 0 ){
				$summary .= ", $num_medium low-priority";
			}
			else if( $num_low > 0  ) {
				$summary .= ", $num_low low-priority";
			}
			
			$summary .= ".";
		}else {
			$summary .= " It had no security issues detected."; 
		}
		if( isset($genContentSize) && isset($genContentPercent) ){
			$genContentSize = intval($genContentSize);
			$genContentPercent = intval($genContentPercent);
		
			if( $genContentSize > .5 || $genContentPercent > 1 ){
				$summary .= " Dependence on client-generated HTML risks fragility.";
			}
			else {
				$summary .= " HTML generation was not overly JavaScript-dependent";
			}
		}

	} else {
		$summary = "Use this section to create custom experiments to add to your test.";
	}

	if( $key === "Custom" ){
		$assessment[$key]["grade"] = "";
		$assessment[$key]["sentiment"] = "<span class=\"opportunity_summary_sentiment\">Advanced.</span>";
	} else if( $numRecommended > 2 ){
		$assessment[$key]["grade"] = "f";
		$assessment[$key]["sentiment"] = "<span class=\"opportunity_summary_sentiment\">Needs Improvement.</span>";
		
	} else if( $numRecommended > 0 ){
		$assessment[$key]["grade"] = "c";
		$assessment[$key]["sentiment"] = "<span class=\"opportunity_summary_sentiment\">Not bad...</span>";
	} else {
		$assessment[$key]["grade"] = "a";
		$assessment[$key]["sentiment"] = "<span class=\"opportunity_summary_sentiment\">Looks great!</span>";
	}

	$assessment[$key]["summary"] = $summary;

}




?>