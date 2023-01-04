<?php

$category = "Quick";
$imgsTooLarge = $testStepResult->getMetric('imgs-too-large');
$imgResizeURL = Util::getSetting('imgResizeURL', null);

function fullURL($url)
{
    global $requests;
    if (parse_url($url, PHP_URL_SCHEME)) {
        return $url;
    } else {
        return $requests[0]['url'] . $url;
    }
    return $url;
}

if (count($imgsTooLarge)) {
    $tooLargeList = array();
    $experimentSwapList = array();
    foreach ($imgsTooLarge as $img) {
        $srcToUse = "";

        if ($img["currentSrc"]) {
            $srcToUse .= $img["currentSrc"];
        } elseif ($img["src"]) {
            $srcToUse .= $img["src"];
        }
        $thisListItem = $srcToUse . " (Display: " . $img["displayWidth"] . "px wide, File: " . $img["naturalWidth"] . "px wide)";
        $thisSwapItem = encodeURIComponent($srcToUse) . "|" . encodeURIComponent("$imgResizeURL?width=" . $img["displayWidth"] . "&url=" . fullURL($srcToUse));
        array_push($tooLargeList, $thisListItem);
        array_push($experimentSwapList, $thisSwapItem);
    }
    
    $rwdImagesDesc = "The broadly-supported <code>picture</code> element and/or the <code>srcset</code> and <code>sizes</code> attributes allow you to offer different file sizes to download for a given image depending on a variety of conditions. <a href=\"https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images\">Read more about Responsive Images on MDN </a>.";
    $tooLargeImgsDesc = "When images are much larger than they appear in the page, they can increase page weight without noticeably improving quality.";
    $experimentsToAdd =  array(
        (object) [
            'title' => 'Consider implementing responsive image techniques',
            "desc" => $rwdImgsDesc,
            "expvar" => 'swap',
            "expval" => array_unique($experimentSwapList)
        ]
    );
        
    if($imgResizeURL){
        $experimentsToAdd = array(
            (object) [
                "id" => '054',
                'title' => 'See potential impact of using responsive images',
                "desc" => "$rwdImagesDesc This experiment replaces the image files at the sources below with images that are sized for display server-side.",
                "expvar" => 'swap',
                "expval" => array_unique($experimentSwapList)
            ]
        );
    }

    $assessment[$category]["opportunities"][] = array(
        "title" =>  "Images are larger than necessary for display",
        "desc" => $tooLargeImgsDesc,
        "examples" => array_unique($tooLargeList),
        "experiments" => $experimentsToAdd,
        "good" => false,
        "hideassets" => true
    );
} else {
    $assessment[$category]["opportunities"][] = array(
        "title" => "Images are sized appropriately for display",
        "desc" => $tooLargeImgsDesc,
        "examples" => array(),
        "good" => true
    );
}
