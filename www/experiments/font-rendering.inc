<?php
$category = "Quick";
$fonts = $testStepResult->getMetric('fonts');

$fontsThatBlock = array();
if(isset($fonts) ){
    foreach($fonts as $font) {
        if( $font["status"] !== "unloaded" && $font["display"] !== "swap" ){
            array_push($fontsThatBlock, $font);
        }
    }
}  

function encodeURIComponent($str) {
    $revert = array('%21'=>'!', '%2A'=>'*', '%27'=>"'", '%28'=>'(', '%29'=>')');
    return strtr(rawurlencode($str), $revert);
}

if( count($fontsThatBlock) ){

    $blockers = array();
    foreach($fontsThatBlock as $font){
        array_push($blockers, $font["family"] . " " . (isset( $font["weight"] ) ? $font["weight"] : "") . " " . (isset( $font["style"] ) ? $font["style"] : "") );
    }

    $assessment[$category]["opportunities"][] = array(
		"title" => "Several fonts are loaded with settings that hide text while they are loading.",
		"desc" => "When fonts are loaded with default display settings, like font-display=\"block\", browsers will hide text entirely for several seconds instead of showing text with a fallback font.",
		"examples" => array_unique($blockers),
		"experiments" => array(
            (object) [
                'title' => 'Add font-display: swap to font loading',
                "desc" => '<p>This experiment will add <code>font-display="swap"</code> to custom fonts to show text sooner. <strong>Note:</strong> This experiment will only apply to CSS that is on the same domain. To try this experiment on a 3rd-party CSS file, consider inlining the file first.</p>',
                "expvar" => 'swap',
                "expval" => array(encodeURIComponent("@font-face {") . "|" . encodeURIComponent( "@font-face { font-display: swap; " ))
            ]),
		"good" => false,
        "hideassets" => true
	);
    
}
else {
    $assessment[$category]["opportunities"][] = array(
		"title" => "Zero custom fonts load in ways that delay text visibility.",
		"desc" => "When fonts are loaded with default display settings, like font-display=\"block\", browsers will hide text entirely for several seconds instead of showing text with a fallback font. font-display: swap will fix this.",
		"examples" => array(),
		"experiments" => array(),
		"good" => true
	);
}
    
?>