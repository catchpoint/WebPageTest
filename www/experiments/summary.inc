<?php

$expPage = $menuUrlGenerator->resultPage("experiments");

// write out the observations summary HTML
echo '<div class="opportunities_summary">';
foreach($assessment as $key => $cat ){
    $grade = $cat["grade"];
    $summary = $cat["summary"];
     echo <<<EOT
     <a class="grade_anchor" href="${expPage}#${key}">
         <p class="grade_heading grade_heading-summary grade-${grade}"><strong>${key}</strong> <span>${summary}</span></p>
     </a>
     EOT;
 }
 echo '</div>';
?>