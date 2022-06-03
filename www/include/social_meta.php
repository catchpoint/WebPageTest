<?php
    require_once __DIR__ . '/../common_lib.inc';
    require_once __DIR__ . '/../common.inc';

    $pageURI = 'https://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'];
    // NOTE: if you'd like a page to include a screenshot for social sharing, specify $useScreenshot = true above the head include.
    // Also, for page-specific screenshot css tweaks, add a screenshot class to that page's body class
    $screenshotURI = CreateUrlVariation($pageURI, "screenshot=1" );

    $d = new DateTime();
    $socialImage = isset($useScreenshot) ? "https://wpt-screenshot.netlify.app/" . urlencode($screenshotURI) . "/opengraph/" . $d->format('Ymdd') : "/images/social-logo.jpg";
    $socialTitle = isset($socialTitle) ? $socialTitle : "WebPageTest";
    $socialDesc = isset($socialDesc) ? $socialDesc : "View this on WebPageTest.org...";
    $emailSubject = "View this on WebPageTest!";
    $tweetURI =  'https://twitter.com/intent/tweet?text=' . urlencode($socialDesc) . '&url=' . urlencode($pageURI) . '&via=realwebpagetest';
    $emailURI = 'mailto:?subject=' . urlencode($emailSubject) . '&body=' . urlencode($socialDesc) . '  %0D%0A ' . urlencode($pageURI);
?>

<meta property="og:title" content="<?php echo $socialTitle; ?>">
<meta property="og:type" content="article" />
<meta property="og:image" content="<?php echo $socialImage; ?>">
<meta property="og:url" content="<?php echo $pageURI; ?>">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:description" content="<?php echo $socialDesc; ?>">
<meta property="og:site_name" content="WebPageTest">
<meta name="twitter:image:alt" content="<?php echo $socialDesc; ?>">
<meta name="twitter:site" content="@realwebpagetest">
