<?php

require_once(__DIR__ . '/../experiments/common.inc');



$expPage = $menuUrlGenerator->resultPage("experiments");


    // write out the observations summary HTML
    echo  '<div class="opportunities_summary">';
    foreach($assessment as $key => $cat ){
        $grade = $cat["grade"];
        $summary = $cat["summary"];
        $oppsCount = count($cat["opportunities"]);
        $recommendedCount = intval($cat["num_recommended"]);
        $experimentsCount = intval($cat["num_experiments"]);
        $recsEnd = $recommendedCount === 1 ? "" : "s";
        $oppsEnd = $oppsCount === 1 ? "" : "s";
        $expsEnd = $experimentsCount === 1 ? "" : "s";

        $oppsAdd = "<p class=\"opportunities_summary_opps\"><span class=\"experiment_summary_count\">$oppsCount</span> Opportunities$end <span class=\"extended\"> found.</span></p>";
        $recsAdd = "<p class=\"opportunities_summary_recs\"><span class=\"experiment_summary_count\">$recommendedCount</span> Recommendation$recEnd <span class=\"extended\"> to consider.</span></p>";
        $expAdd = "<p class=\"opportunities_summary_exps\"><span class=\"experiment_summary_count\">$experimentsCount</span> <span class=\"extended\">WebPageTest</span> <em class=\"pro-flag\">Pro</em> experiment$expsEnd <span class=\"extended\"> to try.</span></p>";
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

?>