<?php

$expPage = $menuUrlGenerator->resultPage("experiments");


    // write out the observations summary HTML
    echo  '<div class="opportunities_summary">';
    foreach($assessment as $key => $cat ){
        $grade = $cat["grade"];
        $summary = $cat["summary"];
        $experimentsCount = $cat["num_experiments"];
        $end = $experimentsCount === 1 ? "" : "s";
        $expAdd = $experimentsCount > 0 ? "<p class=\"opportunities_summary_exps\"><em class=\"pro-flag\">Pro</em> $experimentsCount recommended experiment$end!</p>" : "";
        echo  <<<EOT
        <a class="grade_anchor" href="${expPage}#${key}">
            <p class="grade_heading grade_heading-summary grade-${grade}"><strong>${key}:</strong> <span>${summary}</span></p>
            ${expAdd}
        </a>
        EOT;
    }
    echo  '</div>';

?>