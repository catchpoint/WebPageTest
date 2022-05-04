<?php
$category = "Quick";
$requests = $testStepResult->getRequests();
$compressableRequests = array();

foreach ($requests as $request) {
    
    if( ( !isset($request["contentEncoding"]) || $request["contentEncoding"] === null || $request["contentEncoding"] === '' ) 
        && ($request['contentType'] === "text/html"
            || $request['contentType'] === "text/javascript" 
            || $request['contentType'] === "application/x-javascript" 
            || $request['contentType'] === "application/javascript" 
            || $request['contentType'] === "text/css" 
            || $request['contentType'] === "image/svg+xml" 
            || $request['contentType'] === "application/json"
            )
              
        ){
        array_push($compressableRequests, $request["url"] );
        echo $request['contentType'] . '\n';
    }
}


if( count($redirectedRequests) > 0 ){
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  count($compressableRequests) . " text file" .(count($compressableRequests) > 1 ? "s were" : " is") ." transferred without compression.",
        "desc" =>  "Compressing text files such as CSS, JavaScript, HTML, and SVG will make them download faster and use less bandwidth.",
        "examples" =>  $compressableRequests,
        "good" =>  false,
        "experiments" =>  array(
            (object) [
                'title' => 'Enable transfer compression',
                "desc" => '<p>Text files can be compressed for transfer with compression formats like as brotli and gzip. These formats are commonly available in most server, host, and CDN environments, but sometimes need to be enabled.</p>'
            ]
        ),
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'Zero text files were delivered without compression.',
        "desc" =>  "Compressing text files such as CSS, JavaScript, HTML, and SVG using compression formats like as brotli and gzip will make them download faster and use less bandwidth.",
        "examples" =>  array(),
        "good" =>  true
    );
}

?>