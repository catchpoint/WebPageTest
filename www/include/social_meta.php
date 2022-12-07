<?php

    require_once __DIR__ . '/../common_lib.inc';
    require_once __DIR__ . '/../common.inc';
    require_once __DIR__ . '/social_meta_vars.inc';

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
