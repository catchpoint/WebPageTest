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
    // frame num will be in 60fps increments. 
    // if you want a frame for LCP and LCP is at 1.5sec, then you'll want frame 60*1.5=90
    $frameNum = isset($req_frameNum) ? intval($req_frameNum) : 0;
    $im = PrepareImage($tests, $renderInfo);
    if ($im !== false) {
        if (RenderFrame($tests, $renderInfo, $frameNum, $im, null)) {
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