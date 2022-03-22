<?php
    require_once __DIR__ . '/../common_lib.inc';
    require_once __DIR__ . '/../common.inc';

    $pageURI = 'https://'.$_SERVER[HTTP_HOST].$_SERVER[REQUEST_URI];

    $pageURI = CreateUrlVariation($pageURI, "screenshot=1" );

    $d = new DateTime();
    $socialImage = "https://wpt-screenshot.netlify.app/" . urlencode($pageURI) . "/opengraph/" . $d->format('Ymd');
    $socialTitle = isset($socialTitle) ? $socialTitle : "WebPageTest";
    $socialDesc = isset($socialDesc) ? $socialDesc : "View this on WebPageTest.org...";
    $tweetURI = '#';  //https://twitter.com/intent/tweet?text=' . urlencode($socialDesc) . '&url=' . urlencode($pageURI) . '&via=realwebpagetest';
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