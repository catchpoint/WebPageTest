<?php
$category = "Quick";
$imgsOutViewport = $testStepResult->getMetric('imgs-out-viewport');
$imgsThatShouldBeLazy = array();
if(isset($imgsOutViewport) ){
    foreach($imgsOutViewport as $img) {
        if( $img["loading"] !== "lazy" ){
            array_push($imgsThatShouldBeLazy, $img);
        }

    }
}  

if( count($imgsThatShouldBeLazy) ){
    $shouldBeLazySrcs = array();
    foreach($imgsThatShouldBeLazy as $img){
        array_push($shouldBeLazySrcs, $img["src"]);
    }

    $assessment[$category]["opportunities"][] = array(
		"title" => "Images outside the critical viewport can be lazy-loaded.",
		"desc" => "When images are lazy-loaded using loading=\"lazy\", when they scroll into the viewport, freeing up early load for other tasks.",
		"examples" => $shouldBeLazySrcs,
		"experiments" => array(
            (object) [
                'title' => 'Add loading="lazy" to non-critical images',
                "desc" => '<p>This experiment will add <code>loading="lazy"</code> attributes from images that are inside the viewport at load</p>',
                "expvar" => 'addloadinglazy',
                "expval" => $shouldBeLazySrcs            ]
        ),
		"good" => false
	);
}
else {
   
    $assessment[$category]["opportunities"][] = array(
		"title" => "No images outside the critical viewport need to be lazy-loaded.",
		"desc" => "When images are lazy-loaded using loading=\"lazy\", they will be requested after the layout is established, which is too late for images in the critical window.",
		"examples" => array(),
		"experiments" => array(),
		"good" => true
	);
}
    
?>