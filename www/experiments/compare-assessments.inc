<?php
    require_once(__DIR__ . '/common.inc');

    
    $controlAssessment = $metaInfo['experiment']['assessment'];
    $assessmentChanges = array();


    foreach($controlAssessment as $key => $category){
        $newOpportunities = $assessment[$key]['opportunities'];
        $controlOpportunities = $category['opportunities'];

        
        
        foreach( $controlOpportunities as $oppKey => $opportunity ){
           if( ($controlOpportunities[$oppKey]['good'] ? "true" : "false") !== ($newOpportunities[$oppKey]['good'] ? "true" : "false") ){
               $assessmentChanges[] = $newOpportunities[$oppKey];
           }
        }
    }
?>