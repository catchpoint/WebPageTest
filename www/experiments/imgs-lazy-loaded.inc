<?php
$category = "Quick";
$imgsInViewport = $testStepResult->getMetric('imgs-in-viewport');
$imgsThatShouldNotBeLazy = array();
if(isset($imgsInViewport) ){
    foreach($imgsInViewport as $img) {
        if( $img["loading"] === "lazy" ){
            array_push($imgsThatShouldNotBeLazy, $img);
        }

    }
}  

if( count($imgsThatShouldNotBeLazy) ){
    $shouldNotBeLazySrcs = array();
    foreach($imgsThatShouldNotBeLazy as $img){
        array_push($shouldNotBeLazySrcs, $img["src"]);
    }

    $assessment[$category]["opportunities"][] = array(
		"title" =>  "Images within the critical viewport are being lazy-loaded.",
		"desc" => "When images are lazy-loaded using loading=\"lazy\", they will be requested after the layout is established, which is too late for images in the critical window.",
		"examples" => $shouldNotBeLazySrcs,
		"experiments" => array(
            (object) [
                'title' => 'Remove loading="lazy" from layout-critical images',
                "desc" => '<p>This experiment will remove <code>loading="lazy"</code> attributes from images that are inside the viewport at load</p>',
                "expvar" => 'removeloadinglazy',
                "expval" => $shouldNotBeLazySrcs
            ]
        ),
		"good" => false
	);
}
else {
    $assessment[$category]["opportunities"][] = array(
		"title" => "No images within the critical viewport are being lazy-loaded.",
		"desc" => "When images are lazy-loaded using loading=\"lazy\", they will be requested after the layout is established, which is too late for images in the critical window.",
		"examples" => array(),
		"experiments" => array(),
		"good" => true
	);
    
}
    
?>