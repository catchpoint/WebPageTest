<?php

require_once __DIR__ . '/../../common.inc';

use WebPageTest\Util;

$gtm_id = Util::getSetting('gtm_id');
?>

<?php if ($gtm_id): ?>
<noscript>
<iframe src="https://www.googletagmanager.com/ns.html?id=<?= $gtm_id ?>" height="0" width="0" style="display:none;visibility:hidden"></iframe>
</noscript>
<?php endif; ?>
