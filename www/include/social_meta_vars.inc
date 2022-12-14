<?php

require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../common.inc';

$pageURI = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
// NOTE: if you'd like a page to include a screenshot for social sharing, specify $useScreenshot = true above the head include.
// Also, for page-specific screenshot css tweaks, add a screenshot class to that page's body class
$screenshotURI = CreateUrlVariation($pageURI, "screenshot=1");

$d = new DateTime();
$socialImage = isset($useScreenshot) ? "https://wpt-screenshot.netlify.app/" . urlencode($screenshotURI) . "/opengraph/" . $d->format('Ymdd') : "/assets/images/social-logo.jpg";
$socialTitle = isset($socialTitle) ? $socialTitle : "WebPageTest";
$socialDesc = isset($socialDesc) ? $socialDesc : "View this on WebPageTest.org...";
$emailSubject = "View this on WebPageTest!";
$tweetURI =  'https://twitter.com/intent/tweet?text=' . urlencode($socialDesc) . '&url=' . urlencode($pageURI) . '&via=realwebpagetest';
$emailURI = 'mailto:?subject=' . rawurlencode(htmlspecialchars_decode($emailSubject)) . '&body=' . rawurlencode(htmlspecialchars_decode($socialDesc)) . '  %0D%0A ' . urlencode($pageURI);
