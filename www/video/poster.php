<?php
// Generate the first frame of a video as a poster image
chdir(__DIR__ . '/..');
require_once __DIR__ . '/../common.inc';
require_once __DIR__ . '/render.inc.php';
set_time_limit(600);

$ok = false;
$tests = BuildRenderTests();
$renderInfo = BuildRenderInfo($tests);
if (isset($renderInfo)) {
    $im = PrepareImage($tests, $renderInfo);
    if ($im !== false) {
        if (RenderFrame($tests, $renderInfo, 0, $im, null)) {
            $ok = true;
            header("Content-Type: image/png");
            header('Last-Modified: ' . gmdate('r'));
            header('Expires: '.gmdate('r', time() + 31536000));
            header('Cache-Control: public, max-age=31536000', true);
            imagepng($im);
        }
        imagedestroy($im);
    }
}

if (!$ok) {
    header("HTTP/1.0 404 Not Found");
}