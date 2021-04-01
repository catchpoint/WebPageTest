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
    $server_id = GetSetting('serverID');
    if (isset($server_id) && is_string($server_id) && strlen($server_id)) {
        $videoId = $server_id . '-' . $videoId;
    }
    if (!is_dir(__DIR__ . '/../work/video/'))
        mkdir(__DIR__ . '/../work/video/', 0777, true);
    $lock = Lock("video-$videoId", false, 600);
    if ($lock) {
        $videoFile = realpath(__DIR__ . '/../work/video/');
        if (isset($videoFile) && strlen($videoFile)) {
            $videoFile .= '/' . $videoId . '.mp4';
            if (!file_exists($videoFile)) {
                RenderVideo($tests, $videoFile);
            }
            if (file_exists($videoFile)) {
                if (isset($_REQUEST['format']) && $_REQUEST['format'] == 'gif') {
                    // Convert the mp4 to a gif
                    $palette = $videoFile . '.png';
                    $gif = $videoFile . '.gif';
                    if (!file_exists($gif)) {
                        shell_exec("ffmpeg -i \"$videoFile\" -vf \"fps=10,palettegen\" -y \"$palette\"");
                        if (file_exists($palette)) {
                            shell_exec("ffmpeg -i \"$videoFile\" -i \"$palette\" -lavfi \"fps=10 [x]; [x][1:v] paletteuse\" -y \"$gif\"");
                            unlink($palette);
                        }
                    }
                    if (file_exists($gif)) {
                        header("Content-Type: image/gif");
                        header('Last-Modified: ' . gmdate('r'));
                        header('Expires: '.gmdate('r', time() + 31536000));
                        header('Cache-Control: public, max-age=31536000', true);
                        readfile($gif);
                        $ok = true;
                    }
                } else {
                    // redirect to the video file so Nginx can serve byte ranges for Safari/Mobile
                    $protocol = getUrlProtocol();
                    $host  = $_SERVER['HTTP_HOST'];
                    $hostname = GetSetting('host');
                    if (isset($hostname) && is_string($hostname) && strlen($hostname)) {
                        $host = $hostname;
                    }
                    $uri   = "/work/video/$videoId.mp4";
                    $videoUrl = "$protocol://$host$uri";
                    header('HTTP/1.1 307 Temporary Redirect');
                    header("Location: $videoUrl", true, 307);
                    header('Cache-Control: no-cache, no-store, must-revalidate');
                    header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
                    header('Pragma: no-cache');
                    $ok = true;
                }
            }
        }
        Unlock($lock);
    }
}

if (!$ok) {
    header("HTTP/1.0 404 Not Found");
}