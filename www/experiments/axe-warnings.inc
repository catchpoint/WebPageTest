<?php 

if( isset( $axe ) ) {
    
    if( count($axe['violations']) ){
    $violations = $axe['violations'];
    $num_violations = count($violations);
    $num_critical = 0;
    $num_serious = 0;
    $num_moderate = 0;
    $num_minor = 0;
    
    foreach($violations as $v){
        if( $v['impact'] === "critical" ){
            $num_critical++;
        }
        if( $v['impact'] === "serious" ){
            $num_serious++;
        }
        if( $v['impact'] === "moderate" ){
            $num_moderate++;
        }
        if( $v['impact'] === "minor" ){
            $num_minor++;
        }
    }

    $warningsArr = array();
    foreach($violations as $v){
        array_push($warningsArr, $v['impact'] . ": " . $v['help']);
    }

    $recs = array();
    foreach($violations as $v){
        
        $thisRec = '<h6 class="recommendation_level-'. $v['impact'] .'"><span>'. $v['impact'] .'</span> ' . htmlentities($v['help']) .  ' <a href=\"'. $v['helpUrl'] .'\">More info</a></h6>';
        if( $v["nodes"] && count($v["nodes"]) ){
            //print_r($v["nodes"])
            $thisRec .=  '<ul>';
            foreach($v["nodes"] as $vnode){
                $thisRec .=  '<li>' . htmlentities($vnode["failureSummary"]) . '<code>' . htmlentities($vnode["html"]) . '</code></li>';
            }
            $thisRec .=  '</ul>';
        }
     
        array_push($recs, $thisRec);
    }

    echo observationHTML(
        "Accessiblity Issues were Detected",
        "Axe found $num_violations accessibility issues: " . 
        ($num_critical > 0 ? "$num_critical critical, " : '') .
        ($num_serious > 0 ? "$num_serious serious, " : '') .
        ($num_moderate > 0 ? "$num_moderate moderate, " : '') .
        ($num_minor > 0 ? "$num_minor minor " : ''),
        array(),
        array(
            (object) [
                'title' => 'Make the following changes to improve accessibility:',
                "desc" => implode($recs)
            ]
        ),
        false
    );


    //print_r($violations);
}
else {
    echo observationHTML(
        "No Accessiblity Issues were Detected in this Page",
        "Axe found no accessibility issues. ",
        array(),
        array(),
        true
    );
}
}




?>