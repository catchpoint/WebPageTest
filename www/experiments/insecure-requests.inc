<?php
$category = "Resilient";
$requests = $testStepResult->getRequests();
$insecureRequests = array();

foreach ($requests as $request) {
    if( isset($request['is_secure']) &&  $request['is_secure'] == 0 ){
        array_push($insecureRequests, $request['full_url'] );
    }
}



if( count($insecureRequests) > 0 ){
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  count($insecureRequests) . " resource" .(count($insecureRequests) > 1 ? "s are" : " is") ." not being loaded over a secure connection.",
        "desc" =>  "Loading requests over HTTPS necessary for ensuring data integrity, protecting users personal information, providing core critical security, and providing access to many new browser features.",
        "examples" =>  array_unique($insecureRequests),
        "good" =>  false
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'Zero resources were found that were loaded over an insecure connection.',
        "desc" =>  "Loading requests over HTTPS necessary for ensuring data integrity, protecting users personal information, providing core critical security, and providing access to many new browser features.",
        "examples" =>  array(),
        "good" =>  true
    );
}

?>