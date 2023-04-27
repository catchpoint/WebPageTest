<?php

(function () {

    global $testStepResult;
    global $initialHost;
    global $id;
    global $carbonFootprint;
    global $hostsGreen;
    global $avgSiteCarbon;
    global $carbonCompare;



    $carbonFootprint = $testStepResult->getMetric('carbon-footprint');

    
    //TODO this is from gen content
    $genContentSize = $testStepResult->getMetric('generated-content-size');
    $genContentPercent = $testStepResult->getMetric('generated-content-percent');



    //end todo


    if ( isset($carbonFootprint)  ) {

        $errDesc = "Factors such as heavier page weight and hosts that do not use green energy both increase a site's carbon footprint.";


        $carbonFootprint = $carbonFootprint['sustainable-web-design'];
        if (!isset($green_hosting[0]['hosted_by'])) {
            $green_hosting[0]['hosted_by'] = 'Unknown';
        }

        $carbonCompareAmt = round( ( abs($avgSiteCarbon - $carbonFootprint ) /  $avgSiteCarbon  ) * 100 );
        if ($carbonCompareAmt === 0){
             $carbonCompare = "Carbon footprint was average.";
        } elseif ($carbonFootprint > $avgSiteCarbon){
            $carbonCompare = "Carbon footprint was $carbonCompareAmt% higher than average.";
        } else {
             $carbonCompare = "Carbon footprint was $carbonCompareAmt% better than average.";
        }
        $opp = null;

        if( $carbonFootprint > $avgSiteCarbon ){

            $errTitle = "This site's carbon footprint was higher than average";

            if (isset($genContentSize) && isset($genContentPercent)) {
                $genContentSize = floatval($genContentSize);
                $genContentPercent = floatval($genContentPercent);
                $expsToAdd = array();

                
        
                if ($genContentSize > .5 || $genContentPercent > 1) {
                    $amtNote = "(" . $genContentSize . "kb larger, or " . $genContentPercent . "% of total HTML)";

                    array_push($expsToAdd, (object) [
                        "id" => '098',
                        'title' => 'Mimic Pre-rendered HTML',
                        "desc" => '<p>Server rendering can reduce the need to load JavaScript after delivery, lessening impact. This experiment mimics server-generated HTML by swapping the initial HTML with the fully rendered HTML from this test run. <strong>Note:</strong> this will very likely break site behavior, but is potentially useful for comparing early metrics and assessing whether moving logic to the server is worth the effort.</p>',
                        "expvar" => 'prerender',
                        "expval" => array($id),
                        "hideassets" => true
                    ]);

                    array_push($expsToAdd, (object) [
                        "id" => '099',
                        'title' => 'Disable Scripts',
                        "desc" => '<p>Pairs well with prior experiment! When content is delivered up-front in HTML, client-side scripting can be reduced, lessening impact. This experiment makes all scripts (inline and external) unrecognizable as javascript by the browser in order to demonstrate whether the site will still be usable if JavaScript fails to properly run.</p>',
                        "expvar" => 'disablescripts',
                        "expval" => array(''),
                        "hideassets" => true
                    ]);
                }                
            }
            if( count($expsToAdd) > 0 ){
                $opp = [
                    "title" =>  $errTitle,
                    "desc" =>  $errDesc,
                    "examples" =>  array(),
                    "experiments" =>  $expsToAdd,
                    "good" =>  false
                ];
            } else {
                $opp = [
                    "title" =>  $errTitle,
                    "desc" =>  $errDesc,
                    "examples" =>  array(),
                    "good" =>  false
                ];
            }
        } else {
            $opp = [
                "title" =>  'Carbon Footprint was average or better',
                "desc" =>  $errDesc,
                "examples" =>  array(),
                "experiments" =>   array(),
                "good" =>  true
            ];
        }


        AssessmentRegistry::getInstance()->register(AssessmentRegistry::Resilient, $opp);
    }
})();
