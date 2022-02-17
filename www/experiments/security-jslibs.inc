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
            $thisRec .=  '<li class="recommendation_level-'. $v['severity'] .'"><span>'. $v['severity'] .'</span> ' . ' ' . $v["name"] . ' ' . $v["version"] . ' <a href="'. $v["href"] .'">View vulnerability recommendation</a></li>';
            
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




// echo observationHTML(
//     "Several security vulnerabilies found by Snyk",
//     "Snyk has found 2 security vulnerabilities, 1 high priority, and 1 low.",
//     array(
//         "<strong>Strict Transport Security:</strong>A HSTS Policy informing the HTTP client how long to cache the HTTPS only policy and whether this applies to subdomains.",
//         "<strong>X Content Type Options:</strong> The only defined value, \"nosniff\", prevents Internet Explorer from MIME-sniffing a response away from the declared content-type. "
//     ),
//     array(
//         (object) [
//             'title' => 'Add strict transport security.',
//             "desc" => '<p>This experiment will add a blah blah to your HTML document, causing browsers to  blah blah</p>',
//             "expvar" => 'preload',
//             "expval" => $lcpSource . "|as_image"
//         ],
//         (object) [
//             'title' => 'Add X Content Type Options',
//             "desc" => '<p>This experiment will add a blah blah to your HTML document, causing browsers to  blah blah</p>',
//             "expvar" => 'addimportance',
//             "expval" => $lcpSource . "|i_high"
//         ]
//         ),
//         false
// );




?>