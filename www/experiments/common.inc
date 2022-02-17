<?php
function observationHTML( $bottleneckTitle, $bottleneckDesc, $bottleneckExamples, $relevantExperiments, $good = true ){
	$out = '';
	
	// todo move this summary heading broader for all recs
	$goodbadClass = "experiments_details-good";
	if( $good !== true ){
		$goodbadClass = "experiments_details-bad";
	}
	
	$out .= "<li class=\"$goodbadClass\"><details open><summary>$bottleneckTitle</summary>";
	$out .= "<div class=\"experiments_details_body\">";
	
	$out .= "<div class=\"experiments_details_desc\">";
	$out .= "<p>$bottleneckDesc</p>";
	if( count($bottleneckExamples) > 0 ){
		$out .= "<ol>";
		foreach( $bottleneckExamples as $ex ) {
			$out .= "<li><code>$ex</code></li>";
		}
		$out .= "</ol>";
	}
	$out .= "</div>";

	if( count($relevantExperiments) > 0 ){
		if( $relevantExperiments[0]->expvar ){
			$out .= "<h4 class=\"experiments_list_hed\">Relevant Experiments</h4>";
		}
		else {
			$out .= "<h4 class=\"experiments_list_hed experiments_list_hed-recs\">Relevant Recommendations</h4>";
		}

		$out .= "<ul class=\"experiments_list\">";

		foreach( $relevantExperiments as $exp ) {
			$out .= <<<EOT
				<li class="experiment_description">
				<div class="experiment_description_text">
				<h5>{$exp->title}</h5>
				{$exp->desc}
			EOT;


			if( $exp->expvar && $exp->expval ){
				if( count($exp->expval) ){
					$out .= '<details class="experiment_assets"><summary>Assets included in experiment:</summary>';
					$out .= '<ol>';
					foreach($exp->expval as $val){
						if( count($exp->expval) > 1 ){
						$out .= <<<EOT
							<li><label><input type="checkbox" name="{$exp->expvar}[]" value="{$val}" checked>{$val}</label></li>
							EOT;
						}
						else {
							$out .= <<<EOT
							<li><input type="hidden" name="{$exp->expvar}[]" value="{$val}">{$val}</li>
							EOT;
						}
					}
					$out .= '</ol>';
					$out .= '</details>';
				}
				if( $exp->expvar ){
					$out .= <<<EOT
					</div>
					<div class="experiment_description_go">
					<label><input type="checkbox" name="recipes[]" value="{$exp->expvar}">Run This Experiment!</label>
					</div>
					EOT;
				}
			}
			else if( $exp->expvar && !$exp->expval ) {
				$out .= <<<EOT
				</div>
				<div class="experiment_description_go">
				<label><input type="checkbox" name="{$exp->expvar[0]}">Run This Experiment!</label>
				</div>
				EOT;
			}

			$out .= '</li>';
				
		}
	}

	$out .= '<ul></div></details></li>';
	return $out;
}


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


?>