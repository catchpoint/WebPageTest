<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once INCLUDES_PATH . '/testStatus.inc';
require_once INCLUDES_PATH . '/logging.inc';
require_once INCLUDES_PATH . '/common_lib.inc';
/**
* See if the file should be skipped when archiving (usually just cache files)
*
* @param mixed $file
*/
function ArchiveSkipFile($file)
{
    $skip = false;
    if (
        $file == 'archive.me' ||
        $file == 'test.waiting' ||
        $file == 'test.running' ||
        preg_match('/\.pageData.\d+\.gz$/', $file) ||
        preg_match('/\.requests.\d+\.gz$/', $file) ||
        preg_match('/\.devToolsCPUTime.\d+\.gz$/', $file)
    ) {
        $skip = true;
    }
    return $skip;
}

function ArchiveFilterLargeFile($file)
{
    $files = array(
        '.cap.gz',
        '_trace.json.gz',
        'bodies.zip',
        'console_log.json.gz',
        'netlog.txt.gz'
    );
    foreach ($files as $f) {
        if (strstr($file, $f) !== false) {
            return true;
        }
    }
    return false;
}

/**
* Archive the given test if it hasn't already been archived
* For now this will just zip and move to a location on disk
* but will eventually integrate with the S3 archiving
*
* @param mixed $id
*/
function ArchiveTest($id, $delete = false)
{
    $isSaaSTest = (stripos($id, '_saas_') !== false);
    $saas_capture_prefix = GetSetting("cp_saas_capture_prefix");

    // Short-circuit tests that are already archived
    $testPath = realpath('./' . GetTestPath($id));
    if (is_file("$testPath/.archived")) {
        if ($delete && is_dir($testPath)) {
            delTree("$testPath/");
        }
        return true;
    }

    // Get the capture server settings if configured and the test ID specifies a capture server
    $capture_server = null;
    $capture_salt = null;
    if (preg_match('/^\d+[^_+][_ix]([^c_])+c/', $id, $matches)) {
        $capture_prefix = $matches[1];
        if ($capture_prefix) {
            $capture_server = GetSetting("cp_capture_$capture_prefix");
            $capture_salt = GetSetting("cp_capture_salt_$capture_prefix");
        }
    }
    //saas tests do not specify the capture server, so we hardcode
    if ($isSaaSTest) {
        $capture_server = GetSetting("cp_capture_$saas_capture_prefix");
        $capture_salt = GetSetting("cp_capture_salt_$saas_capture_prefix");
    }

    $ret = false;
    if (
        strpos($id, '.') === false &&                           // make sure it isn't a legacy relay test
        ($capture_server ||                                     // CP Capture server
        GetSetting('archive_dir') ||           // local mount
        GetSetting('archive_url') ||           // Archive server (simple PUT, HEAD, GET)
        GetSetting('archive_s3_server'))
    ) {    // S3 Interface (Internet Archive or standard)
        $status = GetTestStatus($id, false);
        $completed = true;
        if ($status['statusCode'] >= 100 && $status['statusCode'] < 200) {
            $completed = false;
        }
        $testInfo = GetTestInfo($id);
        if ($testInfo && ($completed || @$testInfo['batch'])) {
            if (GetSetting('archive_dir') == '/dev/null') {
                $ret = true;
            } else {
                if (is_file("$testPath/.archived")) {
                    if (VerifyArchive($id)) {
                        $ret = true;
                    } else {
                        $zipFile = GetArchiveFile($id, true);
                        unlink($zipFile);
                        @unlink("$testPath/.archived");
                        SaveTestInfo($id, $testInfo);
                    }
                }

                if (!$ret) {
                    $lock = LockTest($id);
                    if (isset($lock)) {
                        $testInfo = GetTestInfo($id);
                        $zipFile = "./tmp/$id.zip";
                        // zip up the contents
                        if (is_dir($testPath) === true) {
                            $count = 0;
                            $zip = new ZipArchive();
                            $max_zip_size = intval(GetSetting('archive_max_size', 0));
                            $zip_size = 0;
                            if ($zip->open($zipFile, ZIPARCHIVE::CREATE) === true) {
                                // add the files
                                $files = scandir($testPath);
                                foreach ($files as $file) {
                                    $filePath = "$testPath/$file";
                                    if (is_file($filePath)) {
                                        if (!ArchiveSkipFile($file) && !ArchiveFilterLargeFile($file)) {
                                            $count++;
                                            $zip_size += filesize($filePath);
                                            $zip->addFile($filePath, $file);
                                        }
                                    }
                                }
                                // Add the video directories, trace, tcpdump and bodies files
                                foreach ($files as $file) {
                                    $filePath = "$testPath/$file";
                                    if (is_file($filePath)) {
                                        if (!ArchiveSkipFile($file) && ArchiveFilterLargeFile($file)) {
                                            $file_size = filesize($filePath);
                                            if (!$max_zip_size || $zip_size + $file_size <= $max_zip_size) {
                                                $zip_size += $file_size;
                                                $zip->addFile($filePath, $file);
                                            }
                                        }
                                    } elseif ($file != '.' && $file != '..' && is_dir($filePath)) {
                                        $subFiles = scandir($filePath);
                                        if ($subFiles) {
                                            $zip->addEmptyDir($file);
                                            foreach ($subFiles as $subFile) {
                                                if (is_file("$filePath/$subFile")) {
                                                    $file_size = filesize("$filePath/$subFile");
                                                    if (!$max_zip_size || $zip_size + $file_size <= $max_zip_size) {
                                                        $zip_size += $file_size;
                                                        $zip->addFile("$filePath/$subFile", "$file/$subFile");
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                $zip->close();

                                // move the archive to its final destination
                                if ($count && is_file($zipFile)) {
                                    if ($capture_server && $capture_salt) {
                                        $host = str_replace('.', '', trim(GetSetting('host')));
                                        $cpid = GetCPID($host, $capture_salt);
                                        $url = "{$capture_server}hawkcaptureserver/up-wpt.ashx?test=$id&node=$host";
                                        $result = cp_http_post($url, null, $cpid, $zipFile);
                                        if (isset($result)) {
                                            $archive_log = GetSetting('archive_log');
                                            if ($archive_log) {
                                                error_log(gmdate('Y/m/d H:i:s - ') . "$id\n", 3, $archive_log);
                                            }
                                            $ret = true;
                                        }
                                    } elseif (GetSetting('archive_dir')) {
                                        $dest = GetArchiveFile($id, true);
                                        if (rename($zipFile, $dest)) {
                                            if (VerifyArchive($id)) {
                                                $ret = true;
                                            }
                                        }
                                    } elseif (
                                        GetSetting('archive_s3_server') &&
                                                GetSetting('archive_s3_key') &&
                                                GetSetting('archive_s3_secret') &&
                                                GetSetting('archive_s3_bucket')
                                    ) {
                                        // post the file to an S3-style bucket (just supporting Internet Archive right now)
                                        require_once('./lib/S3.php');
                                        $urlstyle = GetSetting('archive_s3_urlstyle') ? trim(GetSetting('archive_s3_urlstyle')) : 'vhost';
                                        $s3 = new S3(trim(GetSetting('archive_s3_key')), trim(GetSetting('archive_s3_secret')), false, trim(GetSetting('archive_s3_server')), $urlstyle);
                                        $separator = strrpos($id, '_');
                                        if ($separator !== false) {
                                            $bucket = GetSetting('archive_s3_bucket');
                                            $file = "$id.zip";
                                            $metaHeaders = array();
                                            $requestHeaders = array();
                                            if (trim(GetSetting('archive_s3_server')) == 's3.us.archive.org') {
                                                // special-case Internet Archive storage
                                                $bucket = GetSetting('archive_s3_bucket') . '_' . substr($id, 0, $separator);
                                                $file = substr($id, $separator + 1);
                                                $requestHeaders = array('x-archive-queue-derive' => '0',
                                                                        'x-archive-meta-collection' => 'httparchive',
                                                                        'x-archive-auto-make-bucket' => '1');
                                            }
                                            if ($s3->putObject($s3->inputFile($zipFile, false), $bucket, $file, S3::ACL_PRIVATE, $metaHeaders, $requestHeaders)) {
                                                $ret = true;
                                            }
                                        }
                                    } elseif (GetSetting('archive_url')) {
                                        $archive_url = GetSetting('archive_url');
                                        if ($archive_url) {
                                            $archive_url .= "$id.zip";
                                            if (http_put_file($archive_url, $zipFile)) {
                                                $ret = true;
                                            }
                                        }
                                    }
                                }
                                // make sure we don't leave a file hanging around
                                if (is_file($zipFile)) {
                                    unlink($zipFile);
                                }
                                if ($ret) {
                                    touch("$testPath/.archived");
                                }
                            }
                        }
                        UnlockTest($lock);
                    }
                }
            }
        }
        if ($ret && $delete && is_dir($testPath) && is_file("$testPath/.archived")) {
            delTree("$testPath/");
        }
    }

    return $ret;
}

/**
 * Download a given test directly from the server that "owns" it
 */
function DownloadArchive($id, $testServer)
{
    $ret = false;
    $secret = GetServerSecret();
    $lock = LockTest($id);
    if (isset($lock)) {
        $zipfile = "./tmp/$id.zip";
        $download_url = "{$testServer}download.php?test=$id&s=$secret";
        if (http_fetch_file($download_url, $zipfile)) {
            if (is_file($zipfile) && filesize($zipfile)) {
                $testPath = './' . GetTestPath($id);
                if (!is_dir($testPath)) {
                    mkdir($testPath, 0777, true);
                }
                ZipExtract($zipfile, $testPath);
                $ret = true;
                touch("$testPath/.archived");
            }
            @unlink($zipfile);
        }
        UnlockTest($lock);
    }
    return $ret;
}

/**
* Restore the given test from the archive if it is archived
*
* @param mixed $id
*/
function RestoreArchive($id)
{
    $isSaaSTest = (stripos($id, '_saas_') !== false);
    $saas_capture_prefix = GetSetting("cp_saas_capture_prefix");

    $ret = false;
    if (TestArchiveExpired($id)) {
        return false;
    }
    $testServer = GetServerForTest($id);
    if (isset($testServer)) {
        if (DownloadArchive($id, $testServer)) {
            return true;
        }
    }
    $lock = LockTest($id);
    if (isset($lock)) {
        $testInfo = GetTestInfo($id);

        if (!$testInfo && strpos($id, '.') === false && GetSetting('archive_dir') != '/dev/null') {
            $testPath = './' . GetTestPath($id);
            // Get the capture server settings if configured and the test ID specifies a capture server
            $capture_server = null;
            $capture_salt = null;
            if (preg_match('/^\d+[^_+][_ix]([^c_])+c/', $id, $matches)) {
                $capture_prefix = $matches[1];
                if ($capture_prefix) {
                    $capture_server = GetSetting("cp_capture_$capture_prefix");
                    $capture_salt = GetSetting("cp_capture_salt_$capture_prefix");
                }
            }
            //saas tests do not specifiy capture server in the URL, so we'll hardcode it
            if ($isSaaSTest) {
                $capture_server = GetSetting("cp_capture_$saas_capture_prefix");
                $capture_salt = GetSetting("cp_capture_salt_$saas_capture_prefix");
            }

            $url = '';
            // see if we have an HTTP path where the file is archived
            if (!$capture_server || !$capture_salt) {
                $check_dir = $testPath;
                for ($i = 0; $i <= 4; $i++) {
                    $check_dir = dirname($check_dir);
                    if (is_file("$check_dir/archive.dat")) {
                        $url = trim(file_get_contents("$check_dir/archive.dat"));
                        if (strlen($url)) {
                            break;
                        }
                    }
                }
            }
            if (
                strlen($url) ||
                ($capture_server && $capture_salt) ||
                GetSetting('archive_dir') ||
                GetSetting('archive_url') ||
                GetSetting('archive_s3_url') ||
                GetSetting('archive_s3_server')
            ) {
                $deleteZip = true;
                $do_not_download = false;
                $zipfile = "./tmp/$id.zip";
                if ($capture_server && $capture_salt) {
                    $do_not_download = true;
                    $host = str_replace('.', '', trim(GetSetting('host')));
                    $cpid = GetCPID($host, $capture_salt);
                    $cp_url = "{$capture_server}hawkcaptureserver/down-wpt.ashx?test=$id";
                    cp_http_get_file($cp_url, $cpid, $zipfile);
                } elseif (strlen($url)) {
                    $url .= "/$id.zip";
                } else {
                    if (GetSetting('archive_dir')) {
                        $deleteZip = false;
                        $archiveZip = GetArchiveFile($id);
                        if (is_file($archiveZip)) {
                            $zipfile = $archiveZip;
                            $do_not_download = true;
                            touch($zipfile);
                        }
                    } elseif (GetSetting('archive_s3_url')) {
                        $separator = strrpos($id, '_');
                        if ($separator !== false) {
                            $bucket = GetSetting('archive_s3_bucket');
                            $file = "$id";
                            if (trim(GetSetting('archive_s3_server')) == 's3.us.archive.org') {
                                // special-case Internet Archive storage
                                $bucket = GetSetting('archive_s3_bucket') . '_' . substr($id, 0, $separator);
                                $file = substr($id, $separator + 1);
                            }
                            $url = trim(GetSetting('archive_s3_url')) . "$bucket/$file.zip";
                        }
                    } elseif (
                        GetSetting('archive_s3_server') &&
                                GetSetting('archive_s3_key') &&
                                GetSetting('archive_s3_secret') &&
                                GetSetting('archive_s3_bucket')
                    ) {
                        require_once('./lib/S3.php');
                        $urlstyle = GetSetting('archive_s3_urlstyle') ? trim(GetSetting('archive_s3_urlstyle')) : 'vhost';
                        $s3 = new S3(trim(GetSetting('archive_s3_key')), trim(GetSetting('archive_s3_secret')), false, trim(GetSetting('archive_s3_server')), $urlstyle);
                        $bucket = GetSetting('archive_s3_bucket');
                        $file = "$id.zip";
                        $s3->getObject($bucket, $file, $zipfile);
                    }
                }
                // Support fallback methods for restoring archives from other locations
                if (!$do_not_download) {
                    $urls = array();
                    if (strlen($url)) {
                        $urls[] = $url;
                    }
                    $archive_url = GetSetting('archive_url');
                    if ($archive_url) {
                        $archive_url .= "$id.zip";
                        $urls[] = $archive_url;
                    }
                    foreach ($urls as $download_url) {
                        logMsg("Downloading: $download_url");
                        if (http_fetch_file($download_url, $zipfile)) {
                            break;
                        }
                    }
                }
                if (is_file($zipfile) && filesize($zipfile)) {
                    if (!is_dir($testPath)) {
                        mkdir($testPath, 0777, true);
                    }
                    ZipExtract($zipfile, $testPath);
                    $ret = true;
                    $testInfo = GetTestInfo($id);
                    if ($testInfo) {
                        touch("$testPath/.archived");
                        if (!file_exists("$testPath/test.complete")) {
                            touch("$testPath/test.complete");
                        }
                        @unlink("$testPath/test.running");
                    }
                    if ($deleteZip) {
                        @unlink($zipfile);
                    }
                }
            } else {
                $ret = true;
            }
        }
        UnlockTest($lock);
    }
    return $ret;
}

/**
* Verify the archive for the given test (deep verification)
*
* @param mixed $id
*/
function VerifyArchive($id)
{
    $valid = true;
    $isSaaSTest = (stripos($id, '_saas_') !== false);
    $saas_capture_prefix = GetSetting("cp_saas_capture_prefix");

    // Get the capture server settings if configured and the test ID specifies a capture server
    $capture_server = null;
    $capture_salt = null;
    if (preg_match('/^\d+[^_+][_ix]([^c_])+c/', $id, $matches)) {
        $capture_prefix = $matches[1];
        if ($capture_prefix) {
            $capture_server = GetSetting("cp_capture_$capture_prefix");
            $capture_salt = GetSetting("cp_capture_salt_$capture_prefix");
        }
    }

    //saas tests do not specifiy capture server in the URL, so we'll hardcode it
    if ($isSaaSTest) {
        $capture_server = GetSetting("cp_capture_$saas_capture_prefix");
        $capture_salt = GetSetting("cp_capture_salt_$saas_capture_prefix");
    }

    if (!isset($capture_server) && !GetSetting('trust_archive') && GetSetting('archive_dir') != '/dev/null') {
        $testPath = './' . GetTestPath($id);
        if (GetSetting('archive_dir')) {
            // local
            $valid = false;
            $archive = GetArchiveFile($id);
            if (is_dir($testPath) && is_file($archive)) {
                chmod($archive, 0777);
                $zip = new ZipArchive();
                if ($zip->open($archive) === true) {
                    // check for some basic files
                    if (
                        $zip->locateName('testinfo.ini') !== false &&
                        ($zip->locateName('testinfo.json') !== false || $zip->locateName('testinfo.json.gz') !== false)
                    ) {
                        $valid = true;
                        // now loop through the original directory and make sure all of the data files are present in the archive
                        $files = scandir($testPath);
                        foreach ($files as $file) {
                            if (strpos($file, '.txt') !== false && strpos($file, '_status.txt') === false) {
                                $index = $zip->locateName($file);
                                if ($index === false) {
                                    logMsg("$id - Missing $file ($archive)");
                                    $valid = false;
                                    break;
                                } else {
                                    $info = $zip->statIndex($index);
                                    if (!$info['size']) {
                                        logMsg("$id - Invalid file size for $file ($archive)");
                                        $valid = false;
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        logMsg("$id - Missing key files ($archive)");
                    }
                    $zip->close();
                } else {
                    logMsg("$id - Zip file failed to open ($archive)");
                }
            } else {
                logMsg("$id - Zip file missing ($archive)");
            }
        } elseif (
            GetSetting('archive_s3_server') &&
                    GetSetting('archive_s3_key') &&
                    GetSetting('archive_s3_secret') &&
                    GetSetting('archive_s3_bucket') &&
                    trim(GetSetting('archive_s3_server')) != 's3.us.archive.org'
        ) {
            // S3
            $valid = false;
            require_once('./lib/S3.php');
            $urlstyle = GetSetting('archive_s3_urlstyle') ? trim(GetSetting('archive_s3_urlstyle')) : 'vhost';
            $s3 = new S3(trim(GetSetting('archive_s3_key')), trim(GetSetting('archive_s3_secret')), false, trim(GetSetting('archive_s3_server')), $urlstyle);
            $bucket = GetSetting('archive_s3_bucket');
            $file = "$id.zip";
            if (($info = $s3->getObjectInfo($bucket, $file)) !== false) {
                $valid = true;
            }
        } elseif (GetSetting('archive_url')) {
            $archive_url = GetSetting('archive_url');
            if ($archive_url) {
                $valid = false;
                $url = $archive_url . "$id.zip";
                // Send a HEAD request to verify the archive
                if (http_head($url)) {
                    touch("$testPath/.archived");
                    $valid = true;
                } elseif (is_file("$testPath/.archived")) {
                    unlink("$testPath/.archived");
                }
            }
        }
    }

    return $valid;
}

/**
* Generate the filename for the given archive file
*
* @param mixed $id
* @param mixed $create_directory
*/
function GetArchiveFile($id, $create_directory = false)
{
    $file = null;
    if (GetSetting('archive_dir') && strlen($id)) {
        $testPath = GetTestPath($id);
        if (strlen($testPath)) {
            $file = GetSetting('archive_dir') . $testPath . '.zip';
            if ($create_directory) {
                $dir = dirname($file);
                if (!is_dir($dir)) {
                    mkdir($dir, 0777, true);
                }
            }
        }
    }
    return $file;
}

function ArchiveApi($id)
{
  // For tests driven through the API, flag them as available for
  // archiving as soon as they are accessed (if the setting is enabled)
    if (GetSetting('archive_api')) {
        $testPath = realpath('./' . GetTestPath($id));
        touch("$testPath/archive.me");
    }
}

/***************************************************************************
 * Video archive support
 ***************************************************************************/
function RestoreVideoArchive($id)
{
    $archive_url = GetSetting('video_archive_url');
    $s3_server = GetSetting('archive_s3_server');
    $s3_key = GetSetting('archive_s3_key');
    $s3_secret = GetSetting('archive_s3_secret');
    $s3_bucket = GetSetting('archive_s3_bucket');
    $s3_urlstyle = GetSetting('archive_s3_urlstyle');
    $zipFile = "./tmp/video_$id.zip";

    if (TestArchiveExpired($id)) {
        return;
    }

    $videoPath = './' . GetVideoPath($id);
    if (is_dir($videoPath)) {
        // Update the last time it was accessed
        if (is_file("$videoPath/.archive")) {
            touch("$videoPath/.archive");
        }
    } elseif (is_string($archive_url)) {
        $lock = Lock("video-$id");
        if ($lock) {
            // Try restoring it
            $archive_url .= "$id.zip";
            if (http_fetch_file($archive_url, $zipFile)) {
                if (is_file($zipFile) && filesize($zipFile)) {
                    if (!is_dir($videoPath)) {
                        mkdir($videoPath, 0777, true);
                    }
                    ZipExtract($zipFile, $videoPath);
                    touch("$videoPath/.archive");
                }
            }
            // make sure we don't leave a file hanging around
            if (is_file($zipFile)) {
                unlink($zipFile);
            }
            UnLock($lock);
        }
    } elseif (is_string($s3_server) && is_string($s3_key) && is_string($s3_secret) && is_string($s3_bucket)) {
        $lock = Lock("video-$id");
        if ($lock) {
            require_once('./lib/S3.php');
            $urlstyle = is_string($s3_urlstyle) ? trim($s3_urlstyle) : 'vhost';
            $s3 = new S3(trim($s3_key), trim($s3_secret), false, trim($s3_server), $urlstyle);
            $bucket = trim($s3_bucket);
            $file = "video-$id.zip";
            $s3->getObject($bucket, $file, $zipfile);
            if (is_file($zipFile) && filesize($zipFile)) {
                if (!is_dir($videoPath)) {
                    mkdir($videoPath, 0777, true);
                }
                ZipExtract($zipFile, $videoPath);
                touch("$videoPath/.archive");
            }
            if (is_file($zipFile)) {
                unlink($zipFile);
            }
            UnLock($lock);
        }
    }
}
