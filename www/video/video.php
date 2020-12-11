<?php
// Generate the first frame of a video as a poster image
chdir(__DIR__ . '/..');
require_once __DIR__ . '/../common.inc';
require_once __DIR__ . '/render.inc.php';
set_time_limit(1200);

$ok = false;
$tests = BuildRenderTests();
if (isset($tests) && is_array($tests) && count($tests)) {
    $videoId = sha1(json_encode($tests));
    $lock = Lock("video-$videoId", false, 600);
    if ($lock) {
        $videoFile = sys_get_temp_dir() . '/' . $videoId . '.mp4';
        if (!file_exists($videoFile)) {
            RenderVideo($tests, $videoFile);
        }
        if (file_exists($videoFile)) {
            header("Content-Type: video/mp4");
            header('Last-Modified: ' . gmdate('r'));
            header('Expires: '.gmdate('r', time() + 31536000));
            header('Cache-Control: public, max-age=31536000');
            readfile($videoFile);
            $ok = true;
        }
        unlink($videoFile);
        Unlock($lock);
    }
}

if (!$ok) {
    header("HTTP/1.0 404 Not Found");
}