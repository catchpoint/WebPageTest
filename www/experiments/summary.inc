<?php

require_once(__DIR__ . '/common.inc');



$expPage = $menuUrlGenerator->resultPage("experiments");


    // write out the observations summary HTML
    echo  '<div class="opportunities_summary">';
    echo '<p>Jump to Opportunities by&nbsp;Category:</p>';
    foreach($assessment as $key => $cat ){
        if( $key !== "Custom" ){
        $grade = $cat["grade"];
        $summary = $cat["summary"];
        $sentiment = $cat["sentiment"];
        $oppsCount = count($cat["opportunities"]);
        $recommendedCount = intval($cat["num_recommended"]);
        $oppsBadCount = intval($cat["num_bad"]);
        $experimentsCount = intval($cat["num_experiments"]);
        $recsEnd = $recommendedCount === 1 ? "" : "s";
        $oppsEnd = $oppsBadCount === 1 ? "y" : "ies";
        $expsEnd = $experimentsCount === 1 ? "" : "s";

        
        echo  <<<EOT
        <a class="grade_anchor" href="${expPage}#${key}">
            <div>
                <h4 class="grade_heading grade_heading-summary grade-${grade}"><strong>Is it ${key}?</strong> ${sentiment}</h4>
                <p class="opportunities_summary_body">${summary}</p>
            </div>
            <ul>
                <li class="opportunities_summary_opps" title="Opportunities"><span class="experiment_summary_label">Opportunities</span> <span class="experiment_summary_count">${oppsBadCount}</span></li>
                <li class="opportunities_summary_recs" title="Tips"><span class="experiment_summary_label">Tips</span> <span class="experiment_summary_count">${recommendedCount}</span></li>
                <li class="opportunities_summary_exps" title="Experiments"><em class="pro-flag">Pro</em> <span class="experiment_summary_label">Experiments</span> <span class="experiment_summary_count">${experimentsCount}</span></li>
            </ul>
        </a>
        EOT;
        }
    }
    echo  '</div>';

?>