<?php


// container 
$assessment = array(
	"Quick" => array(
		"grade" => "",
		"summary" => "",
		"opportunities" => array()
	), 
	"Usable" => array(
		"grade" => "",
		"summary" => "",
		"opportunities" => array()
	), 
	"Resilient" => array(
		"grade" => "",
		"summary" => "",
		"opportunities" => array()
	)
);







// define $lcp for future experiments
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



foreach($assessment as $key => $cat ){
	$opps = $assessment[$key]["opportunities"];
	$numChecks = count($opps);
	$numGood = 0;
	foreach($opps as $op){
		if( $op["good"] ){
			$numGood++;
		}
	}
	$numBad = $numChecks - $numGood;
	$ending = $opps === 1 ? "y" : "ies";

	$assessment[$key]["num_recommended"] = $numBad;

	if( $numBad > 0 ){
		$assessment[$key]["grade"] = "c";
		$assessment[$key]["summary"] = "<strong>Not bad!</strong> We found ${numBad} opportunit${ending} to consider.";
	}else if( $numBad > 4 ){
		$assessment[$key]["grade"] = "f";
		$assessment[$key]["summary"] = "<strong>Needs Improvement.</strong> We found ${numBad} opportunit${ending} to consider.";

	}
	else {
		$assessment[$key]["grade"] = "a";
		$assessment[$key]["summary"] = "<strong>Great work!</strong> Nothing pressing, but you can always make improvements.";
	}

	


}




?>