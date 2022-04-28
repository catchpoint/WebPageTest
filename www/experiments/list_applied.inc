<?php
if( $experiment ){
    $recips = $metaInfo['experiment']['recipes'];
    $appliedAssessment = $metaInfo['experiment']['assessment'];

    foreach( $recips as $recipe ){
        $recipeID = key($recipe);
        
        foreach( $appliedAssessment as $cat ){
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
            // important to escape here. some experiments allow freeform markup changes to the test page.
            foreach($ings as $ikey => $ing){
                $ings[$ikey] = htmlentities($ing);
            }
            echo "<div class=\"experiment_meta_included_list\"> ". $experimentInfo["desc"] ."<h3>Assets/Instructions:</h3><ul><li>" . implode("</li><li>", $ings) . "</li></ul>
            
            </div></details></li>";
        }
    }
}
?>