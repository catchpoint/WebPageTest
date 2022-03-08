<?php
    require_once(__DIR__ . '/common.inc');
    
    $controlAssessment = $metaInfo['experiment']['assessment'];
    $assessmentChanges = array();

    foreach($controlAssessment as $key => $category){
        $newOpportunities = $assessment[$key]['opportunities'];
        $controlOpportunities = $category['opportunities'];

        
        foreach( $controlOpportunities as $oppKey => $opportunity ){
            $newOppGood = $newOpportunities[$oppKey]['good'] === 1;
            $oldOppGood = $controlOpportunities[$oppKey]['good'] === 1;
        
           if( $newOppGood !== $oldOppGood ){
               $assessmentChanges[] = $newOpportunities[$oppKey];
           }
        }
    }
?>