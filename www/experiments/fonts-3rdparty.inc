<?php

$category = "Quick";
$requests = $testStepResult->getRequests();
$Font3pReqs = array();
$Font3pHosts = array();
$FontsLoadedByExt = array();
$FilesLoadingFonts = array();

foreach ($requests as $request) {
    if( $initialHost !== $request['host'] && preg_match("/woff|ttf|eot/", $request['contentType'])  ){
        array_push($Font3pReqs, $request['full_url'] );
        array_push($Font3pHosts, $request['host'] );
    }
    // find fonts loaded from files that aren't the first doc
    if( preg_match("/woff|ttf|eot/", $request['contentType']) && isset($request['initiator']) &&  $request['initiator'] !== $rootURL  ){
        array_push($FontsLoadedByExt, $request['full_url'] );
        array_push($FilesLoadingFonts, $request['initiator'] );
    }
}



if( count($Font3pReqs) > 0 ){
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  count($Font3pReqs) ." font". (count($Font3pReqs) === 1 ? " is " : "s are") ." hosted on 3rd-party hosts",
        "desc" =>  "Fonts on 3rd party domains may take longer to load due to DNS and connection steps that are not necessary when fonts are hosted on the same domain.",
        "examples" =>  array_unique($Font3pReqs),
        "experiments" =>  array(
            (object) [
                "id" => '045',
                'title' => 'Self-Host 3rd Party Files',
                "desc" => '<p>This experiment will fetch specified files server-side and reference them on the same domain.  Note: the overrides happen at the host level, so any requests from that host will now be self-hosted.</p>',
                 "expvar" => 'experiment-overrideHost',
                 "expval" => array_unique($Font3pHosts)
            ],
            (object) [
                "id" => '043',
                'title' => 'Preconnect 3rd Party Hosts',
                "desc" => '<p>This experiment will add a <code>link</code> with <code>rel="preconnect"</code> for specified hosts, which saves time for those steps when the resource is later requested.</p>',
                 "expvar" => 'addpreconnect',
                 "expval" => array_unique($Font3pHosts)
            ],
            (object) [
                "id" => '044',
                'title' => 'Preload 3rd Party Files',
                "desc" => '<p>This experiment will add a <code>link</code> with <code>rel="preload"</code> for specified hosts, causing the browser to fetch the file early and at a high priority.</p>',
                 "expvar" => 'addpreload',
                 "expval" => array_unique($Font3pReqs)
            ],
            (object) [
                "id" => '046',
                'title' => 'Make Fonts Timeout',
                "desc" => '<p>This experiment directs specified hosts to WebPageTest\'s blackhole server, which will hang indefinitely until timing out. Use this experiment to test your site\'s ability to display fallback text if fonts do not load quickly.</p>',
                 "expvar" => 'experiment-spof',
                 "expval" => array_unique($Font3pHosts)
            ],
        ),
        "good" =>  false
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'Zero third-party fonts found.',
        "desc" =>  "Fonts on 3rd party domains may take longer to load due to DNS and connection steps that are not necessary when fonts are hosted on the same domain.",
        "examples" =>  array(),
        "experiments" =>   array(),
        "good" =>  true
    );
}



if( count($FontsLoadedByExt) > 0 ){
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  count($FontsLoadedByExt) ." font". (count($Font3pReqs) === 1 ? " is " : "s are") ." loaded from externally-requested CSS",
        "desc" =>  "When font-face definitions are in external CSS files, there are two steps involved in loading them: fetching the css, then fetching the fonts. Moving font-face rules into HTML can help fonts be discovered and downloaded faster.",
        "examples" =>  array_unique($FontsLoadedByExt),
        "experiments" =>  array(
            (object) [
                "id" => '048',
                'title' => 'Inline Font-Loading CSS Files',
                "desc" => '<p>This experiment will embed the contents of specified external CSS files to allow fonts to fetch sooner.</p>',
                "expvar" => 'inline',
                "expval" => array_unique($FilesLoadingFonts)
            ]
        ),
        "good" =>  false
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'Zero are loaded from externally-requested CSS.',
        "desc" =>  "When font-face definitions are in external CSS files, there are two steps involved in loading them: fetching the css, then fetching the fonts. Moving font-face rules into HTML can help fonts be discovered and downloaded faster.",
        "examples" =>  array(),
        "experiments" =>   array(),
        "good" =>  true
    );
}

?>