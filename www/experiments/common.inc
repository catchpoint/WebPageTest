<?php


// container for assessment including opportunities, experiments to recommend

$experiment = false;

if( $testInfo ){
	$testTestInfo = $testInfo->getRawData()['testinfo'];
	$metaInfo = $testTestInfo['metadata'];
	if( $metaInfo ){
		$metaInfo = json_decode($metaInfo, true);
		if( $metaInfo['experiment'] ){
			$experiment = true;
		}
	}
}

if( $metaInfo ){
	$assessmentData = $metaInfo['experiment']['assessment'];
}
$assessment = array(
	"Quick" => array(
		"grade" => "",
		"summary" => "",
		"opportunities" => array(),
		"num_recommended" => 0,
		"num_experiments" => 0
	), 
	"Usable" => array(
		"grade" => "",
		"summary" => "",
		"opportunities" => array(),
		"num_recommended" => 0,
		"num_experiments" => 0
	), 
	"Resilient" => array(
		"grade" => "",
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


// quick
include __DIR__ . '/slow-ttfb.inc';
include __DIR__ . '/render-blocking-scripts.inc';
include __DIR__ . '/render-blocking-css.inc';
include __DIR__ . '/render-blocking-font-css.inc';
include __DIR__ . '/lcp.inc';
include __DIR__ . '/imgs-lazy-loaded.inc';
include __DIR__ . '/imgs-lazy-loadable.inc';
include __DIR__ . '/font-rendering.inc';

// usable
include __DIR__ . '/layout-shifts.inc';
include __DIR__ . '/axe-warnings.inc';

// resilient
include __DIR__ . '/render-blocking-3rd-party.inc';
include __DIR__ . '/security-jslibs.inc';





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

	

	if( $key === "Quick" ){
		// build sentiment
		$sentiment = "This site ";
		$ttfbCheck = $testStepResult->getMetric('TTFB');
		if( $ttfbCheck > 2000 ){
			$sentiment .= " was very slow";
		} else if( $ttfbCheck > 1000 ){
			$sentiment .= "took little time";
		}
		else {
			$sentiment .= "was quick";
		}
		$sentiment .= " to connect and deliver initial code. It began rendering content ";

		$fcpCheck = $testStepResult->getMetric('firstContentfulPaint');
		if( $fcpCheck > 5 ){
			$sentiment .= " with considerable delay ";
		} else if( $fcpCheck > 2 ){
			$sentiment .= " with little delay ";
		}
		else {
			$sentiment .= " very quickly ";
		}

		$tbtCheck = $testStepResult->getMetric('TotalBlockingTime');
		$sentiment .= "after that. It took ";
		if( $tbtCheck > 2 ){
			$sentiment .= " a long time ";
		} else if( $tbtCheck > 1 ){
			$sentiment .= " little time ";
		}
		else {
			$sentiment .= " little time ";
		}
		$sentiment .= " to become interactive.";
	} else if( $key === "Usable" ) {
		// build sentiment
		$sentiment = "This site ";
		if( isset($cls) ){
			
			if( $cls > .200 ){
				$sentiment .= "had major layout shifts";
			} else if( $cls > .50 ){
				$sentiment .= "had minor layout shifts";
			}
			else {
				$sentiment .= "had good layout stability";
			}
			$sentiment .= ".";
		}
		
		if( isset($axe) && count($axe['violations']) ){

			
			$sentiment .= "It had $num_violations accessibility issues, ";
			if( $num_critical > 0 ){
				$sentiment .= " $num_critical critical";
			} else if( $$num_serious > 0 ){
				$sentiment .= "$num_critical serious";
			}
			else {
				$sentiment .= " none serious";
			}
			$sentiment .= ".";
		}
	} else {
		$sentiment = "This site ";
		// build sentiment
		$sentiment = "This site ";
		if( isset($blocking3pReqs) ){
			
			if( $blocking3pReqs > 2 ){
				$sentiment .= "had many";
			} else if( $blocking3pReqs > 0 ){
				$sentiment .= "had several";
			}
			else {
				$sentiment .= "had zero";
			}
			$sentiment .= " render-blocking 3rd party requests.";
		}
		if( $jsLibsVulns ){
			$sentiment .= "It had $numVulns security issues"; 
			if( $num_high > 0 ){
				$sentiment .= ", $num_high high-priority";
			} else if( $num_medium > 0 ){
				$sentiment .= ", $num_medium low-priority";
			}
			else if( $num_low > 0  ) {
				$sentiment .= ", $num_low low-priority";
			}
			
			$sentiment .= ".";
		}else {
			$sentiment .= "It had no security issues detected."; 
		}

	}


	if( $numRecommended > 3 ){
		$assessment[$key]["grade"] = "f";
		$assessment[$key]["summary"] = "<strong>Needs Improvement.</strong> " . $sentiment;
		
	} else if( $numRecommended > 0 ){
		$assessment[$key]["grade"] = "c";
		$assessment[$key]["summary"] = "<strong>Not bad!</strong> " .  $sentiment;
	} else {
		$assessment[$key]["grade"] = "a";
		$assessment[$key]["summary"] = "<strong>Great work!</strong> " .  $sentiment;
	}



}




?>