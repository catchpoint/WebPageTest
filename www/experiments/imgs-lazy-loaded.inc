<?php
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
    $srcs = array();
    foreach($imgsThatShouldNotBeLazy as $img){
        array_push($srcs, $img["src"]);
    }

    echo observationHTML(
        "Images within the critical viewport are being lazy-loaded.",
        "When images are lazy-loaded using loading=\"lazy\", they will be requested after the layout is established, which is too late for images in the critical window.",
        $srcs,
        array(
            (object) [
                'title' => 'Remove loading="lazy" from layout-critical images',
                "desc" => 'This experiment will remove <code>loading="lazy"</code> attributes from images that are inside the viewport at load',
                "expvar" => 'removeloadinglazy',
                "expval" => implode(",",$srcs)
            ]
        ),
        false
    );
}
else {
    echo observationHTML(
        "No images within the critical viewport are being lazy-loaded.",
        "When images are lazy-loaded using loading=\"lazy\", they will be requested after the layout is established, which is too late for images in the critical window.",
        array(),
        array(),
        true
    );
}
    
?>