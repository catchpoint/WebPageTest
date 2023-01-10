<?php

require_once INCLUDES_PATH . '/include/social_meta_vars.inc';

global $socialImage;
global $socialTitle;
global $pageURI;
global $socialDesc;

?>

<meta property="og:title" content="<?php echo $socialTitle; ?>">
<meta property="og:type" content="article">
<meta property="og:image" content="<?php echo $socialImage; ?>">
<meta property="og:url" content="<?php echo $pageURI; ?>">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:description" content="<?php echo $socialDesc; ?>">
<meta property="og:site_name" content="WebPageTest">
<meta name="twitter:image:alt" content="<?php echo $socialDesc; ?>">
<meta name="twitter:site" content="@realwebpagetest">
