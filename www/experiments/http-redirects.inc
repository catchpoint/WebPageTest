<?php
$category = "Quick";
$requests = $testStepResult->getRequests();
$redirectedRequests = array();

foreach ($requests as $request) {
    if( isset($request['responseCode']) &&  $request['responseCode'] >= 300 &&  $request['responseCode'] <= 399){
        array_push($redirectedRequests, $request['full_url'] );
    }
}



if( count($redirectedRequests) > 0 ){
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  count($redirectedRequests) . " request" .(count($redirectedRequests) > 1 ? "s are" : " is") ." resulting in an HTTP redirect.",
        "desc" =>  "HTTP redirects can result in additional DNS resolution, TCP connection and HTTPS negotiation times, making them very costly for performance, particularly on high latency networks.",
        "examples" =>  array_unique($redirectedRequests),
        "good" =>  false
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'Zero reqiests were found that resulted in an HTTP redirect.',
        "desc" =>  "HTTP redirects can result in additional DNS resolution, TCP connection and HTTPS negotiation times, making them very costly for performance, particularly on high latency networks.",
        "examples" =>  array(),
        "good" =>  true
    );
}

?>