<?php 




if ($testStepResult) {
    $jsLibsVulns = $testStepResult->getRawResults()['jsLibsVulns'];
}



if( $jsLibsVulns  ){

    $numVulns = count($jsLibsVulns);
    $num_high = 0;
    $num_medium = 0;
    $num_low = 0;
    
    foreach($jsLibsVulns as $v){
        if( $v['severity'] === "high" ){
            $num_high++;
        }
        if( $v['severity'] === "medium" ){
            $num_medium++;
        }
        if( $v['severity'] === "low" ){
            $num_low++;
        }
    }

    $warningsArr = array();
    foreach($jsLibsVulns as $v){
        array_push($warningsArr, $v['severity'] . ": ");
    }

    $secRecs = array();
    $thisRec = "";
    if( count($jsLibsVulns)){
        $thisRec .=  '<ul>';
        foreach($jsLibsVulns as $v){
            $thisRec .=  '<li class="recommendation_level-'. $v['severity'] .'"><span>'. $v['severity'] .'</span> ' . ' ' . $v["name"] . ' ' . $v["version"] . ' <a href="'. $v["url"] .'" class="external">View recommendation on Snyk</a></li>';
            
        }
        $thisRec .=  '</ul>';
        array_push($secRecs, $thisRec);
    }

    

    echo observationHTML(
        "Several security vulnerabilies were detected by Snyk",
        "Snyk has found $numVulns security vulnerabilit" . ($numVulns > 1 ? "ies" : "y") .
        ($num_high > 0 ? "$num_high high, " : '') .
        ($num_medium > 0 ? "$num_medium medium, " : '') .
        ($num_low > 0 ? "$num_low low, " : ''),
        array(),
        array(
            (object) [
                'title' => 'Update the following JavaScript packages',
                "desc" => implode($secRecs)
            ]
            ),
            false
    );

}
else {
    echo observationHTML(
        "No security vulnerabilies were detected by Snyk",
        "Snyk has found 0 security vulnerabilities with included packages.",
        array(),
        array(),
            true
    );
}








?>