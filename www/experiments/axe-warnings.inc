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

    //$violations_serious = array_map(findSerious, $violations);

    echo observationHTML(
        "Accessiblity Issues were Detected in this Page",
        "Axe found $num_violations accessibility issues: " . 
        ($num_critical > 0 ? "$num_critical critical, " : '') .
        ($num_serious > 0 ? "$num_serious serious, " : '') .
        ($num_moderate > 0 ? "$num_moderate moderate, " : '') .
        ($num_minor > 0 ? "$num_minor minor " : ''),
        $warningsArr,
        array(),
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