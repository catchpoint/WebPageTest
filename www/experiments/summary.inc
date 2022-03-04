<?php

require_once(__DIR__ . '/../experiments/common.inc');



$expPage = $menuUrlGenerator->resultPage("experiments");


    // write out the observations summary HTML
    echo  '<div class="opportunities_summary">';
    foreach($assessment as $key => $cat ){
        $grade = $cat["grade"];
        $summary = $cat["summary"];
        $oppsCount = count($cat["opportunities"]);
        $recommendedCount = $cat["num_recommended"];
        $experimentsCount = $cat["num_experiments"];
        $recsEnd = $recommendedCount === 1 ? "" : "s";
        $oppsEnd = $oppsCount === 1 ? "" : "s";
        $expsEnd = $experimentsCount === 1 ? "" : "s";

        $oppsAdd = $oppsCount > 0 ? "<p class=\"opportunities_summary_opps\"><span class=\"experiment_summary_count\">$oppsCount</span> Opportunities$end found.</p>" : "";
        $recsAdd = $recommendedCount > 0 ? "<p class=\"opportunities_summary_recs\"><span class=\"experiment_summary_count\">$recommendedCount</span> Recommendation$expsEnd to consider.</p>" : "";
        $expAdd = $experimentsCount > 0 ? "<p class=\"opportunities_summary_exps\"><span class=\"experiment_summary_count\">$experimentsCount</span> WebPageTest <em class=\"pro-flag\">Pro</em> experiment$expsEnd to try.</p>" : "";
        echo  <<<EOT
        <a class="grade_anchor" href="${expPage}#${key}">
            <p class="grade_heading grade_heading-summary grade-${grade}"><strong>Is it ${key}?</strong> <span>${summary}</span></p>
            <div>
            ${oppsAdd}
            ${recsAdd}
            ${expAdd}
            </div>
        </a>
        EOT;
    }
    echo  '</div>';
    //echo '<p class="opportunities_go"><a href="' . $expPage .'">View Opportunities & Run <em class=\"pro-flag\">Pro</em> Experiments!</p>';

?>