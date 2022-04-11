<?php
if( $experiment ){
    $recips = $metaInfo['experiment']['recipes'];
    $controlAssessment = $metaInfo['experiment']['assessment'];

    foreach( $recips as $recipe ){
        $recipeID = key($recipe);
        
        foreach( $controlAssessment as $cat ){
            foreach($cat["opportunities"] as $opp){
                foreach($opp["experiments"] as $exp){
                    if($exp["id"] === $recipeID ){
                        $experimentInfo = $exp;
                    }
                }
            }
        }

        echo "<li><details><summary>". $experimentInfo["title"] ."</summary>";
        
        foreach($recipe as $ings){
        if( is_string($ings)){
            $ings = array($ings);
        }
        echo "<div class=\"experiment_meta_included_list\"> ". $experimentInfo["desc"] ."<h3>Assets included:</h3><ul><li>" . implode("</li><li>", $ings) . "</li></ul>
        
        </div></details></li>";
        }
    }
}
?>