<?php
function observationHTML( $bottleneckTitle, $bottleneckDesc, $bottleneckExamples, $relevantExperiments ){
	$out = '';
	
	// todo move this summary heading broader for all recs
	$out .= "<li><details open><summary>$bottleneckTitle</summary>";
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
		$out .= "<h4 class=\"experiments_list_hed\">Relevant Experiments</h4><ul class=\"experiments_list\">";

		foreach( $relevantExperiments as $exp ) {
			$out .= <<<EOT
				<li class="experiment_description">
				<div class="experiment_description_text">
				<h5>{$exp->title}</h5>
				<p>{$exp->desc}</p>
				</div>
				<div class="experiment_description_go">
				EOT;

			if( $exp->expval ){
				$out .= <<<EOT
				<label><input type="checkbox" name="recipes[]" value="{$exp->expvar}">Run This Experiment!</label>
				<input type="hidden" name="{$exp->expvar}" value="{$exp->expval}">
				EOT;
			}
			else {
				$out .= <<<EOT
				<label><input type="checkbox" name="{$exp->expvar}">Run This Experiment!</label>
				EOT;
			}
			
			$out .= '</div></li>';
				
		}
	}

	$out .= '<ul></div></details></li>';
	return $out;
}
?>