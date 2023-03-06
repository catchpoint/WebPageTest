<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

// Load app and composer-based dependencies
require_once(__DIR__ . '/../vendor/autoload.php');
require_once INCLUDES_PATH . '/archive.inc';
require_once INCLUDES_PATH . '/util.inc';
require_once INCLUDES_PATH . '/logging.inc';

use WebPageTest\Util;
use WebPageTest\Util\Cache;

function GetSetting($setting, $default = false)
{
    return Util::getSetting($setting, $default);
}

function CacheFetch($key)
{
    return Cache::fetch($key);
}

function CacheStore($key, $value, $ttl = 0)
{
    return Cache::store($key, $value, $ttl);
}

function GetServerSecret()
{
    $secret = Util::getServerSecret();
    return $secret;
}

/**
* Figure out the test path (relative) for the given test ID
*
* @param mixed $id
*/
function GetTestPath($id)
{
    $base = 'results';
    $testPath = "$base/$id";
    if (strpos($id, '_') == 6) {
        $parts = explode('_', $id);

        // see if we have an extra level of hashing
        $dir = $parts[1];
        if (count($parts) > 2 && strlen($parts[2])) {
            $dir .= '/' . $parts[2];
        }

        $testPath = "$base/" . substr($parts[0], 0, 2) . '/' . substr($parts[0], 2, 2) . '/' . substr($parts[0], 4, 2) . '/' . $dir;
    } else {
        $olddir = GetSetting('olddir');
        if (strlen($olddir)) {
            $oldsubdir = GetSetting('oldsubdir');
            if (strlen($oldsubdir)) {
                $testPath = "$base/$olddir/_" . strtoupper(substr($id, 0, 1)) . "/$id";
            } else {
                $testPath = "$base/$olddir/$id";
            }
        }
    }

    return $testPath;
}

/**
* Get the key for a given location
*
* @param mixed $location
*/
function GetLocationKey($location)
{
    $key = GetSetting('location_key', '');
    $info = GetLocationInfo($location);
    if (isset($info) && is_array($info) && isset($info['key'])) {
        $key = $info['key'];
    }
    return $key;
}

/**
* Get the information for a given location (and cache it if possible)
*
* @param mixed $location
*/
function GetLocationInfo($location)
{
    $info = null;
    if (isset($location) && strlen($location)) {
        $info = CacheFetch("locinfo_$location");
        if (!isset($info)) {
            $info = array();
            $locations = LoadLocationsIni();
            if ($locations !== false && is_array($locations) && isset($locations[$location])) {
                $info = $locations[$location];
                if (!isset($info['key'])) {
                    $default_key = GetSetting('location_key');
                    $info['key'] = $default_key ? $default_key : '';
                }
            }
            CacheStore("locinfo_$location", $info, 120);
        }
    }
    return $info;
}

function GetLocationFallbacks($location)
{
    $fallback = null;
    if (isset($location) && strlen($location)) {
        $fallback = CacheFetch("fallback_$location");
        if (!isset($fallback)) {
            $fallback = '';
            $locations = LoadLocationsIni();
            if ($locations !== false && is_array($locations) && isset($locations[$location]['fallback'])) {
                $fallback = $locations[$location]['fallback'];
            }
            CacheStore("fallback_$location", $fallback, 60);
        }
    }

    $fallbacks = array();
    if (isset($fallback) && strlen($fallback)) {
        $fallbacks = explode(',', $fallback);
    }

    return $fallbacks;
}

// Load the locations from locations.ini and merge-in the ec2 locations if necessary
function LoadLocationsIni()
{
    $ec2_allow = GetSetting('ec2_allow');
    $locations_file = SETTINGS_PATH . '/locations.ini';
    if (file_exists(SETTINGS_PATH . '/common/locations.ini')) {
        $locations_file = SETTINGS_PATH . '/common/locations.ini';
    }
    if (file_exists(SETTINGS_PATH . '/server/locations.ini')) {
        $locations_file = SETTINGS_PATH . '/server/locations.ini';
    }
    $locations = parse_ini_file($locations_file, true);
    if (GetSetting('ec2_locations')) {
        $ec2 = parse_ini_file(SETTINGS_PATH . '/ec2_locations.ini', true);
        if ($ec2 && is_array($ec2) && isset($ec2['locations'])) {
            if ($locations && is_array($locations) && isset($locations['locations'])) {
                // Merge the top-level locations
                $last = 0;
                foreach ($locations['locations'] as $num => $value) {
                    if (is_numeric($num) && $num > $last) {
                        $last = $num;
                    }
                }
                foreach ($ec2['locations'] as $num => $value) {
                    if (is_numeric($num)) {
                        $locations['locations'][$last + $num] = $value;
                    }
                }
                if (!isset($locations['locations']['default']) && isset($ec2['locations']['default'])) {
                    $locations['locations']['default'] = $ec2['locations']['default'];
                }
              // add all of the individual locations
                foreach ($ec2 as $name => $group) {
                    if ($name !== 'locations') {
                        $locations[$name] = $group;
                    }
                }
            } else {
                $locations = $ec2;
            }

          // see if we have a setting to override the default location
            $default = GetSetting('EC2.default');
            if ($default && strlen($default)) {
                $defaultGroup = null;

              // Figure out what group the default location is in
                foreach ($ec2 as $name => $group) {
                    if ($name !== 'locations' && !isset($group['browser']) && isset($group[1])) {
                        foreach ($group as $key => $value) {
                            if ($value == $default) {
                                $defaultGroup = $name;
                                break 2;
                            }
                        }
                    }
                }

                if (isset($defaultGroup)) {
                    $locations['locations']['default'] = $defaultGroup;
                    $locations[$defaultGroup]['default'] = $default;
                }
            }
        }
    }
    return $locations;
}

/**
* Make the text fit in the available space.
*
* @param mixed $text
* @param mixed $len
*/
function FitText($text, $max_len)
{
    $fit_text = $text;
    if (strlen($fit_text) > $max_len) {
        // Trim out middle.
        $num_before = intval($max_len / 2) - 1;
        if (substr($fit_text, $num_before - 1, 1) == ' ') {
            $num_before--;
        } elseif (substr($fit_text, $num_before + 1, 1) == ' ') {
            $num_before++;
        }
        $num_after = $max_len - $num_before - 3;
        $fit_text = (substr($fit_text, 0, $num_before) . '...' .
                     substr($fit_text, -$num_after));
    }
    return $fit_text;
}

/**
 * Create a shorter version of the URL for displaying.
 */
function ShortenUrl($url)
{
    $short_url = $url;
    $max_len = 40;
    if (strlen($url) > $max_len) {
        $short_url = (substr($url, 0, $max_len / 2) . '...' .
                  substr($url, -$max_len / 2));
    }
    return $short_url;
}

/**
 * Create a friendlier (unique) name for the download file from the URL that was tested.
 */
function GetFileUrl($url)
{
    $parts = parse_url($url);
    if (!array_key_exists('path', $parts)) {
        $parts['path'] = '';
    }
    return trim(preg_replace('/[^\w.]/', '_', substr("{$parts['host']}/{$parts['path']}", 0, 50)), '_');
}

/**
* Set the PHP locale based on the browser's accept-languages header
* (if one exists) - only works on linux for now
*/
function SetLocaleFromBrowser()
{
    $langs = generate_languages();
    foreach ($langs as $lang) {
        if (array_key_exists('lang', $lang)) {
            $language = $lang['lang'];
            if (strlen($language > 2)) {
                $language = substr($language, 0, 3) . strtoupper(substr($language, 3, 2));
            }
            if (setlocale(LC_TIME, $language) !== false) {
                break;   // it worked!
            }
        }
    }
}

function generate_languages()
{
    $langs = array();
    if (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
        $rawlangs = explode(',', $_SERVER['HTTP_ACCEPT_LANGUAGE']);
        foreach ($rawlangs as $rawlang) {
            $parts = explode(';', $rawlang);
            if (count($parts) == 1) {
                $qual = 1;  // no q-factor
            } else {
                $qual = explode('=', $parts[1]);
            }
            if (is_array($qual) && count($qual) == 2) {
                $qual = (float)$qual[1];  // q-factor
            } else {
                $qual = 1;  // ill-formed q-f
            }
            $langs[] = array('lang' => trim($parts[0]), 'q' => $qual);
        }
    }
    usort($langs, 'lang_compare_quality');
    return $langs;
}

// this function sorts by q-factors, putting highest first.
function lang_compare_quality($in_a, $in_b)
{
    if ($in_a['q'] > $in_b['q']) {
        return -1;
    } elseif ($in_a['q'] < $in_b['q']) {
        return 1;
    } else {
        return 0;
    }
}

/**
* Figure out the path to the video directory given an ID
*
* @param mixed $id
*/
function GetVideoPath($id, $find = false)
{
    $path = "results/video/$id";
    if (strpos($id, '_') == 6) {
        $parts = explode('_', $id);

        // see if we have an extra level of hashing
        $dir = $parts[1];
        if (count($parts) > 2 && strlen($parts[2])) {
            $dir .= '/' . $parts[2];
        }

        $path = 'results/video/' . substr($parts[0], 0, 2) . '/' . substr($parts[0], 2, 2) . '/' . substr($parts[0], 4, 2) . '/' . $dir;

        // support using the old path structure if we are trying to find an existing video
        if ($find && !is_dir($path)) {
            $path = 'results/video/' . substr($parts[0], 0, 2) . '/' . substr($parts[0], 2, 2) . '/' . substr($parts[0], 4, 2) . '/' . $parts[1];
        }
    }

    return $path;
}

/**
* Generate a thumbnail for the video file if we don't already have one
*
* @param mixed $dir
*/
function GenerateVideoThumbnail($dir)
{
    $dir = realpath($dir);
    if (is_file("$dir/video.mp4") && !is_file("$dir/video.png")) {
        $output = array();
        $result = null;
        $command = "ffmpeg -i \"$dir/video.mp4\" -vframes 1 -ss 00:00:00 -f image2 \"$dir/video.png\"";
        $retStr = exec($command, $output, $result);
    }
}

/**
* Get the default location
*
*/
function GetDefaultLocation()
{
    $locations = LoadLocationsIni();
    BuildLocations($locations);

    $def = $locations['locations']['default'];
    if (!$def) {
        $def = $locations['locations']['1'];
    }
    $loc = $locations[$def]['default'];
    if (!$loc) {
        $loc = $locations[$def]['1'];
    }

    return $locations[$loc];
}

/**
* Recursively delete a directory
*
* @param mixed $dir
*/
function delTree($dir, $remove = true)
{
    $dir = rtrim($dir, '/');
    if (is_dir($dir)) {
        $files = scandir($dir);
        foreach ($files as $file) {
            if ($file != '.' && $file != '..') {
                if (is_dir("$dir/$file")) {
                    delTree("$dir/$file");
                } else {
                    unlink("$dir/$file");
                }
            }
        }
        if ($remove) {
            rmdir($dir);
        }
    } else {
        unlink($dir);
    }
}

/**
* Send a large file a chunk at a time
*
* @param mixed $filename
* @param mixed $retbytes
* @return bool
*/
function readfile_chunked($filename, $retbytes = true)
{
    $buffer = '';
    $cnt = 0;
    $handle = fopen($filename, 'rb');
    if ($handle === false) {
        return false;
    }
    while (!feof($handle)) {
        $buffer = fread($handle, 1024 * 1024);  // 1MB at a time
        echo $buffer;
        ob_flush();
        flush();
        if ($retbytes) {
            $cnt += strlen($buffer);
        }
    }
    $status = fclose($handle);
    if ($retbytes && $status) {
        return $cnt; // return num. bytes delivered like readfile() does.
    }
    return $status;
}

/**
* Send a large file a chunk at a time (supports gzipped files)
*
* @param mixed $filename
* @param mixed $retbytes
* @return bool
*/
function gz_readfile_chunked($filename, $retbytes = true)
{
    $buffer = '';
    $cnt = 0;
    $handle = gzopen("$filename.gz", 'rb');
    if ($handle === false) {
        $handle = gzopen($filename, 'rb');
    }
    if ($handle === false) {
        return false;
    }
    while (!gzeof($handle)) {
        $buffer = gzread($handle, 1024 * 1024);  // 1MB at a time
        echo $buffer;
        ob_flush();
        flush();
        if ($retbytes) {
            $cnt += strlen($buffer);
        }
    }
    $status = gzclose($handle);
    if ($retbytes && $status) {
        return $cnt; // return num. bytes delivered like readfile() does.
    }
    return $status;
}

/**
* Transparently read a GZIP version of the given file (we will be looking for .gz extensions though it's not technically required, just good practice)
*
* @param mixed $file
*/
function gz_file_get_contents($file)
{
    $data = null;

    $fileSize = @filesize("$file.gz");
    if (!$fileSize) {
        $fileSize = @filesize($file);
    }
    if ($fileSize) {
        $chunkSize = min(4096, max(1024000, $fileSize * 10));
        $zip = @gzopen("$file.gz", 'rb');
        if ($zip === false) {
            $zip = @gzopen($file, 'rb');
        }

        if ($zip !== false) {
            while ($string = gzread($zip, $chunkSize)) {
                $data .= $string;
            }
            gzclose($zip);
        } else {
            $data = false;
        }
    }

    return $data;
}

/**
* Write out a GZIP version of the given file (tacking on the .gz automatically)
*
* @param mixed $filename
* @param mixed $data
*/
function gz_file_put_contents($filename, $data)
{
    $ret = false;
    $nogzip = GetSetting('nogzip');
    $compression = GetSetting('compression', '6');
    if (!is_numeric($compression) || $compression < 1 || $compression > 9) {
        $compression = 6;
    }
    if (!$nogzip && extension_loaded('zlib')) {
        $zip = @gzopen("$filename.gz", "wb$compression");
        if ($zip !== false) {
            if (gzwrite($zip, $data)) {
                $ret = true;
            }
            gzclose($zip);
        }
    } else {
        if (file_put_contents($filename, $data)) {
            $ret = true;
        }
    }

    return $ret;
}

/**
* read a GZIP file into an array
*
* @param mixed $filename
*/
function gz_file($filename)
{
    $ret = null;

    if (is_file("$filename.gz")) {
        $ret = gzfile("$filename.gz");
    } elseif (is_file($filename)) {
        $ret = file($filename);
    }

    return $ret;
}

/**
* GZip compress the given file
*
* @param mixed $filename
*/
function gz_compress($filename)
{
    $ret = false;

    $nogzip = GetSetting('nogzip');
    if (!$nogzip && extension_loaded('zlib')) {
        $data = file_get_contents($filename);
        if ($data) {
            $ret = gz_file_put_contents($filename, $data);
            unset($data);
        }
    }

    return $ret;
}

/**
* Check for either the compressed or uncompressed file
*
* @param mixed $filename
*/
function gz_is_file($filename)
{
    $ret = is_file("$filename.gz") || is_file($filename);
    return $ret;
}

/**
* Count the number of test files in the given directory
*
* @param mixed $dir
* @param mixed $path
*/
function CountTests($path)
{
    $files = glob($path . '/*.url', GLOB_NOSORT);
    $count = count($files);

    return $count;
}

$MOBILE_DEVICES = null;
function LoadMobileDevices()
{
    if (isset($MOBILE_DEVICES)) {
        return $MOBILE_DEVICES;
    }
    if (is_file(SETTINGS_PATH . '/mobile_devices.ini')) {
        $MOBILE_DEVICES = parse_ini_file(SETTINGS_PATH . '/mobile_devices.ini', true);
        return $MOBILE_DEVICES;
    }
}

/**
* Build the work queues and other dynamic information tied to the locations
*
* @param mixed $locations
*/
function BuildLocations(&$locations)
{
    if (!isset($locations['processed'])) {
        // dynamically create a whole new tree based on the data from the locations
        // the main reason for this is to be able to support multiple browsers in each "location"
        $original = $locations;
        $locations = array();

        // start from the top-level locations
        foreach ($original as $name => $loc) {
            // just the top-level locations
            if (
                array_key_exists('browser', $loc) ||
                array_key_exists('type', $loc)
            ) {
                // clone the existing locations over for code that just accesses them directly
                $loc['localDir'] = "./work/jobs/$name";
                $loc['location'] = $name;
                if (!is_dir($loc['localDir'])) {
                    mkdir($loc['localDir'], 0777, true);
                }
                if (isset($loc['browser'])) {
                    $browser = $loc['browser'];
                    // Allocate the browser to a group
                    $loc['browser_group'] = 'Desktop';
                    if (isset($loc['mobile']) && $loc['mobile']) {
                        $loc['browser_group'] = 'Mobile';
                    } elseif (substr($browser, 0, 4) == 'Moto') {
                        $loc['browser_group'] = 'Mobile';
                    } elseif (substr($browser, 0, 6) == 'iPhone' || substr($browser, 0, 4) == 'iPod') {
                        $loc['browser_group'] = 'Mobile';
                    } elseif (substr($browser, 0, 4) == 'iPad') {
                        $loc['browser_group'] = 'Tablet';
                    }
                }
                $locations[$name] = $loc;
            } else {
                if ($name == 'locations') {
                    $locations[$name] = $loc;
                } else {
                    $index = 1;
                    $default = null;
                    if (array_key_exists('default', $loc)) {
                        $default = $loc['default'];
                    }
                    $location = array();
                    foreach ($loc as $key => $value) {
                        if (is_numeric($key)) {
                            // make sure we have a default
                            if (!isset($default) || !strlen($default)) {
                                $default = $value;
                            }
                            // clone the individual configuration based on the available browsers
                            if (array_key_exists($value, $original)) {
                                $configuration = $original[$value];
                                if (
                                    array_key_exists('browser', $configuration) &&
                                    strlen($configuration['browser'])
                                ) {
                                    $configuration['localDir'] = "./work/jobs/$value";
                                    $configuration['location'] = $value;
                                    if (!is_dir($configuration['localDir'])) {
                                        mkdir($configuration['localDir'], 0777, true);
                                    }
                                    $browsers = array();
                                    $parts = explode(',', $configuration['browser']);
                                    foreach ($parts as $browser) {
                                        $browsers[] = trim($browser);
                                    }
                                    if (count($browsers) > 1) {
                                        // default to the first browser in the list
                                        if ($default == $value) {
                                            $default .= ':' . $browsers[0];
                                        }
                                        // build the actual configurations
                                        foreach ($browsers as $browser) {
                                            $label = $value . ':' . $browser;
                                            $location[$index] = $label;
                                            $index++;
                                            $cfg = $configuration;
                                            $cfg['browser'] = $browser;
                                            $cfg['label'] = $cfg['label'] . " - $browser";
                                            // Allocate the browser to a group
                                            $cfg['browser_group'] = 'Desktop';
                                            if (isset($configuration['mobile']) && $configuration['mobile']) {
                                                $cfg['browser_group'] = 'Mobile';
                                            } elseif (substr($browser, 0, 4) == 'Moto') {
                                                $cfg['browser_group'] = 'Mobile';
                                            } elseif (substr($browser, 0, 6) == 'iPhone' || substr($browser, 0, 4) == 'iPod') {
                                                $cfg['browser_group'] = 'Mobile';
                                            } elseif (substr($browser, 0, 4) == 'iPad') {
                                                $cfg['browser_group'] = 'Tablet';
                                            }

                                            $locations[$label] = $cfg;
                                        }
                                    } else {
                                        // for single-browser locations, just copy it over as it exists
                                        $location[$index] = $value;
                                        $index++;
                                    }
                                }
                            }
                        } elseif ($key !== 'default') {
                            $location[$key] = $value;
                        }
                    }
                    if ($index > 1) {
                        $location['default'] = $default;
                        $locations[$name] = $location;
                    }
                }
            }
        }
        $locations['processed'] = true;
    }
}

/**
* Remove any locations that appear to be offline
*
* @param mixed $locations
*/
function FilterLocations(
    &$locations,
    $includePaid = false,
    $includeHidden = '',
    $stripBrowser = null
) {
    global $user, $admin;
    BuildLocations($locations);
    // drop the main index of any hidden locations so they don't show up in the map view
    foreach ($locations as $name => &$locRef) {
        if (isset($locRef['hidden']) && !isset($_REQUEST['hidden'])) {
            $hide = true;
            if (
                strlen($includeHidden) &&
                stripos($locRef['hidden'], $includeHidden) !== false
            ) {
                $hide = false;
            }
            if ($hide) {
                unset($locations[$name]);
            }
        }
        if (isset($locRef) && is_array($locRef)) {
            unset($locRef['hidden']);
        }

      //remove premium if not paid
        if (isset($locRef['premium']) && !$includePaid) {
            unset($locations[$name]);
        }
      // see if the location is restricted
        if (isset($locations[$name]) && isset($locRef['restricted'])) {
            $remove = true;
            if (($admin && isset($_COOKIE['google_email'])) || isset($user)) {
                $currentUser = isset($_COOKIE['google_email']) ? trim($_COOKIE['google_email']) : $user;
                $userLen = strlen($currentUser);
                $users = explode(',', $locRef['restricted']);
                if ($userLen && $users && is_array($users) && count($users)) {
                    foreach ($users as $allow) {
                        $allow = trim($allow);
                        $len = strlen($allow);
                        if ($userLen >= $len) {
                            $match = substr($currentUser, -$len);
                            if (!strcasecmp($match, $allow)) {
                                $remove = false;
                                break;
                            }
                        }
                    }
                }
            }
            if ($remove) {
                unset($locations[$name]);
            }
            unset($locRef['restricted']);
        }
    }

    // first remove any locations that haven't checked in for 30 minutes (could tighten this up in the future)
    foreach ($locations as $name => &$locRef) {
        if (isset($locRef['browser']) && !isset($locRef['ami'])) {
            $parts = explode(':', $name);
            $locname = $parts[0];
            $testers = GetTesters($locname);
            if (isset($testers['status'])) {
                $locations[$name]['status'] = $testers['status'];
            }
            // now check the times
            if (isset($testers) && is_array($testers) && isset($testers['elapsed'])) {
                if (!isset($_REQUEST['hidden']) && $testers['elapsed'] > 30 && !isset($locRef['scheduler_node'])) {
                    unset($locations[$name]);
                }
            } else {
                if (!isset($_REQUEST['hidden']) && !isset($locRef['scheduler_node'])) {
                    unset($locations[$name]);
                }
            }
        }
    }

    // next pass, filter browsers if we were asked to
    if (isset($stripBrowser)) {
        foreach ($locations as $name => &$locRef) {
            if (isset($locRef['browser'])) {
                $remove = false;
                foreach ($stripBrowser as $browser) {
                    $pos = stripos($locRef['browser'], $browser);
                    if ($pos !== false) {
                        $remove = true;
                        break;
                    }
                }
                if ($remove) {
                    unset($locations[$name]);
                }
            } else {
                // strip the browsers from the label
                foreach ($stripBrowser as $browser) {
                    $locRef['label'] = preg_replace("/[, -]*$browser/i", '', $locRef['label']);
                }
            }
        }
    }

    // next pass, remove any top-level locations whose sub-locations have all been removed
    foreach ($locations as $name => &$locRef) {
        // top-level locations do not have the browser specified
        // and "locations" is the uber-top-level grouping
        if (
            $name != 'locations' && $name != 'processed' &&
            !isset($locRef['browser'])
        ) {
            $ok = false;        // default to deleting the location
            $newLoc = array();  // new, filtered copy of the location
            $default = null;    // the default location for the group

            // remove any of the child locations that don't exist
            $index = 0;
            foreach ($locRef as $key => $val) {
                // the sub-locations are identified with numeric keys (1, 2, 3)
                if (is_numeric($key)) {
                    // check the location that is being referenced to see if it exists
                    if (isset($locations[$val])) {
                        $ok = true;
                        $index++;
                        $newLoc[$index] = $val;
                        if (
                            isset($locRef['default']) &&
                            $locRef['default'] == $val
                        ) {
                            $default = $val;
                        }
                    } else {
                        if (
                            isset($locRef['default']) &&
                            $locRef['default'] == $val
                        ) {
                            unset($locRef['default']);
                        }
                    }
                } elseif ($key != 'default') {
                    $newLoc[$key] = $val;
                }
            }

            if ($ok) {
                if (isset($default)) {
                    $newLoc['default'] = $default;
                }
                $locations[$name] = $newLoc;
            } else {
                unset($locations[$name]);
            }
            unset($newLoc);
        }
    }

    // final pass, remove the empty top-level locations from the locations list
    $newList = array();
    $default = null;
    $index = 0;
    foreach ($locations['locations'] as $key => $name) {
        if (is_numeric($key)) {
            if (isset($locations[$name])) {
                $index++;
                $newList[$index] = $name;
                if (isset($locations['locations']['default']) && $locations['locations']['default'] == $name) {
                    $default = $name;
                }
            }
        } elseif ($key != 'default') {
            $newList[$key] = $name;
        }
    }
    if (isset($default)) {
        $newList['default'] = $default;
    }
    $locations['locations'] = $newList;
}

/**
* From a given configuration, figure out what location it is in
*
* @param mixed $locations
* @param mixed $config
*/
function GetLocationFromConfig(&$locations, $config)
{
    $ret = null;

    foreach ($locations as $location => &$values) {
        if (isset($values) && is_array($values) && count($values)) {
            foreach ($values as $cfg) {
                if (!strcmp($cfg, $config)) {
                    $ret = $location;
                    break 2;
                }
            }
        }
    }

    return $ret;
}

/**
* Run through the location selections and build the default selections (instead of doing this in JavaScript)
*
* @param mixed $locations
*/
function ParseLocations(&$locations)
{
    global $connectivity;
    $loc = array();
    $loc['locations'] = array();

    // build the list of locations
    foreach ($locations['locations'] as $index => $name) {
        if (is_numeric($index)) {
            $location['label'] = $locations[$name]['label'];
            $location['comment'] = '';
            if (isset($locations[$name]['comment'])) {
                $location['comment'] = str_replace(
                    "'",
                    '"',
                    $locations[$name]['comment']
                );  // "
            }
            if (array_key_exists('group', $locations[$name])) {
                $location['group'] = $locations[$name]['group'];
            }
            $location['name'] = $name;
            $loc['locations'][$name] = $location;
        }
    }

    // see if they have a saved location from their cookie
    $currentLoc = null;
    if (array_key_exists('cfg', $_COOKIE)) {
        $currentLoc = GetLocationFromConfig($locations, $_COOKIE["cfg"]);
    }
    if (isset($_REQUEST["cfg"])) {
        $currentLoc = GetLocationFromConfig($locations, $_REQUEST["cfg"]);
    }
    if ((!$currentLoc || !isset($loc['locations'][$currentLoc])) && isset($locations['locations']['default'])) {
        // nope, try the default
        $currentLoc = $locations['locations']['default'];
    }
    if (!$currentLoc || !isset($loc['locations'][$currentLoc])) {
        // if all else fails, just select the first one
        foreach ($loc['locations'] as $key => &$val) {
            $currentLoc = $key;
            break;
        }
    }

    // select the location
    $loc['locations'][$currentLoc]['checked'] = true;

    // build the list of browsers for the location
    $loc['browsers'] = array();
    foreach ($locations[$currentLoc] as $index => $config) {
        if (is_numeric($index)) {
            $browser = $locations[$config]['browser'];
            $browserKey = str_replace(' ', '', $browser);
            if (strlen($browserKey) && strlen($browser)) {
                $b = array();
                $b['label'] = $browser;
                $b['key'] = $browserKey;
                $b['id'] = $browser;
                $b['group'] = 'Desktop';
                if (isset($locations[$config]['mobile']) && $locations[$config]['mobile']) {
                    $b['group'] = 'Mobile';
                } elseif (substr($browser, 0, 6) == 'iPhone' || substr($browser, 0, 4) == 'iPod') {
                    $b['group'] = 'Mobile';
                } elseif (substr($browser, 0, 4) == 'iPad') {
                    $b['group'] = 'Tablet';
                }
                $loc['browsers'][$browserKey] = $b;
            }
        }
    }

    // default to the browser from their saved cookie
    $currentBrowser = '';
    if (array_key_exists('cfg', $_COOKIE) && array_key_exists($_COOKIE["cfg"], $locations)) {
        $currentBrowser = str_replace(' ', '', $locations[$_COOKIE["cfg"]]['browser']);
        $currentConfig = $_COOKIE["cfg"];
    }
    if (isset($_REQUEST["cfg"]) && isset($locations[$_REQUEST["cfg"]])) {
        $currentBrowser = str_replace(' ', '', $locations[$_REQUEST["cfg"]]['browser']);
        $currentConfig = $_REQUEST["cfg"];
    }
    if (!strlen($currentBrowser) || !isset($loc['browsers'][$currentBrowser])) {
        // try the browser from the default config
        $cfg = $locations[$currentLoc]['default'];
        if (strlen($cfg)) {
            $currentBrowser = str_replace(' ', '', $locations[$cfg]['browser']);
            $currentConfig = $cfg;
        }
    }
    if (!strlen($currentBrowser) || !isset($loc['browsers'][$currentBrowser])) {
        // just select the first one if all else fails
        foreach ($loc['browsers'] as $key => &$val) {
            $currentBrowser = $key;
            break;
        }
    }
    if (isset($_REQUEST['browser']) && isset($loc['browsers'][$_REQUEST['browser']])) {
        $currentBrowser = $_REQUEST['browser'];
    }

    $loc['browsers'][$currentBrowser]['selected'] = true;

    // build the list of connection types
    $loc['bandwidth']['dynamic'] = false;
    $loc['connections'] = array();
    foreach ($locations[$currentLoc] as $index => $config) {
        if (is_numeric($index)) {
            $browserKey = str_replace(' ', '', $locations[$config]['browser']);
            if (strlen($browserKey) && $browserKey == $currentBrowser) {
                if (isset($locations[$config]['connectivity'])) {
                    $connection = array();
                    $connection['key'] = $config;
                    $connection['label'] = $locations[$config]['connectivity'];
                    $loc['connections'][$config] = $connection;
                } else {
                    $loc['bandwidth']['dynamic'] = true;
                    $loc['bandwidth']['down'] = 1500;
                    $loc['bandwidth']['up'] = 384;
                    $loc['bandwidth']['latency'] = 50;
                    $loc['bandwidth']['plr'] = 0;

                    foreach ($connectivity as $key => &$conn) {
                        $connKey = $config . '.' . $key;
                        if (!$currentConfig) {
                            $currentConfig = $connKey;
                        }
                        $connection = array();
                        $connection['key'] = $connKey;
                        $connection['label'] = $conn['label'];
                        $loc['connections'][$connKey] = $connection;
                        if ($currentConfig == $connKey) {
                            $loc['bandwidth']['down'] = $conn['bwIn'] / 1000;
                            $loc['bandwidth']['up'] = $conn['bwOut'] / 1000;
                            $loc['bandwidth']['latency'] = $conn['latency'];
                            if (isset($conn['plr'])) {
                                $loc['bandwidth']['plr'] = $conn['plr'];
                            }
                        }
                    }
                    // add the custom config option
                    $connKey = $config . '.custom';
                    $connection = array();
                    $connection['key'] = $connKey;
                    $connection['label'] = 'Custom';
                    $loc['connections'][$connKey] = $connection;
                    if (!$currentConfig) {
                        $currentConfig = $connKey;
                    }
                }
            }
        }
    }

    // default to the first connection type if we don't have a better option
    if (!$currentConfig || !isset($loc['connections'][$currentConfig])) {
        foreach ($loc['connections'] as $key => &$val) {
            $currentConfig = $key;
            break;
        }
    }
    $loc['connections'][$currentConfig]['selected'] = true;

    // figure out the bandwidth settings
    if (!$loc['bandwidth']['dynamic']) {
        $loc['bandwidth']['down'] = $locations[$currentConfig]['down'] / 1000;
        $loc['bandwidth']['up'] = $locations[$currentConfig]['up'] / 1000;
        $loc['bandwidth']['latency'] = $locations[$currentConfig]['latency'];
        $loc['bandwidth']['plr'] = 0;
    }

    return $loc;
}
/**
* Get the script block for the test, if applicable
*/
function GetScriptBlock()
{
    global $test;
    global $isOwner;
    global $admin;
    $html = '';
    $run = null;
    if (array_key_exists('run', $_REQUEST)) {
        $run = intval($_REQUEST['run']);
    }

    if (isset($test['testinfo']['script']) && strlen($test['testinfo']['script'])) {
        $show = false;
        $showscript = GetSetting('show_script_in_results');
        if ($admin || $showscript) {
            $show = true;
        } elseif ($isOwner && !$test['testinfo']['sensitive']) {
            $show = true;
        }
        if ($show) {
            $html .= 'Scripted Test:';
            $html .= '<pre>' . htmlspecialchars($test['testinfo']['script']) . '</pre>';
        }
    }
    return $html;
}

/**
* Get the text block of the test info that we want to display
*
*/
function GetTestInfoHtml($includeScript = true)
{
    global $test;
    global $isOwner;
    global $dom;
    global $blockDomainsString;
    global $blockString;
    global $login;
    global $admin;
    global $privateInstall;
    $html = '<ul>';
    $run = null;
    if (array_key_exists('run', $_REQUEST)) {
        $run = intval($_REQUEST['run']);
    }

    if (isset($run) && isset($test) && is_array($test) && isset($test['testinfo']['test_runs'][$run]['tester'])) {
        $html .= '<li>Tester: ' . $test['testinfo']['test_runs'][$run]['tester'] . '</li>';
    } elseif (isset($test) && is_array($test) && isset($test['testinfo']['tester'])) {
        $html .= '<li>Tester: ' . $test['testinfo']['tester'] . '</li>';
    }
    if ($dom) {
        $html .= '<li>DOM Element: ' . htmlspecialchars($dom) . '</li>';
    }
    if ($test['test']['fvonly']) {
        $html .= '<li>First View only</li>';
    }
    if (isset($test['test']['runs'])) {
        $html .= '<li>Test runs: ' . $test['test']['runs'] . '</li>';
    }
    if (isset($test['test']['authenticated']) && (int)$test['test']['authenticated'] == 1) {
        $html .= '<li>Authenticated: ' . htmlspecialchars($login) . '</li>';
    }
    if ((int)$test['test']['connections'] !== 0) {
        echo '<li>Browser Connections: ' . $test['test']['connections'] . '</li>';
    }
    if (isset($test['testinfo']['addCmdLine']) && strlen($test['testinfo']['addCmdLine'])) {
        $html .= '<li>Command Line: ' . htmlspecialchars($test['testinfo']['addCmdLine']) . '</li>';
    }
    if (isset($test['testinfo']['extensionName']) && strlen($test['testinfo']['extensionName'])) {
        $html .= '<li>Enable extension: ' . htmlspecialchars($test['testinfo']['extensionName']) . '</li>';
    }

    if (isset($test['testinfo']['connectivity']) && strcasecmp($test['testinfo']['connectivity'], 'custom') != 0) {
        $html .= "<li>Connectivity: {$test['testinfo']['bwIn']}/{$test['testinfo']['bwOut']} Kbps, {$test['testinfo']['latency']}ms Latency";
        if ($test['testinfo']['plr']) {
            $html .= ", {$test['testinfo']['plr']}% Packet Loss";
        }
        if ($test['testinfo']['shaperLimit']) {
            $html .= ", shaperLimit {$test['testinfo']['shaperLimit']}";
        }
        $html .= '</li>';
    }
    if (isset($test['testinfo']['script']) && strlen($test['testinfo']['script'])) {
        $html .= '<li>';
        $html .= GetScriptBlock();
        $html .= '</li>';
    }
    if (strlen($blockString)) {
        $html .= '<li>Blocked:<pre>';
        $blockedStrings = explode(",", $blockString);
        foreach ($blockedStrings as $string) {
            $html .= $string . "\n";
        }
        $html .= '</pre></li>';
    }
    if (strlen($blockDomainsString)) {
        $html .= '<li>Blocked Domains:<pre>';
        $blockedStrings = explode(",", $blockDomainsString);
        foreach ($blockedStrings as $string) {
            $html .= $string . "\n";
        }
        $html .= '</pre></li>';
    }
    // TODO FIND CUSTOM METRICS HERE
    if (array_key_exists('customMetrics', $test['testinfo']) && is_array($test['testinfo']['customMetrics']) && count($test['testinfo']['customMetrics'])) {
         $html .= '<li><a href="/custom_metrics.php?' . "test=" . $test['testinfo']['id'] . "&run=1&cached=0" . '">Custom Metrics</a></li>';
    }
    $html .= '</ul>';

    return $html;
}

/**
* Append the provided query param onto the provided URL (handeling ? vs &)
*
* @param mixed $entry
*/
function CreateUrlVariation($url, $query)
{
    $newUrl = null;
    $url = trim($url);
    $query = trim($query);
    if (strlen($url) && strlen($query)) {
        $newUrl = $url;
        if (strpos($url, '?') === false) {
            $newUrl .= '?';
        } else {
            $newUrl .= '&';
        }
        $newUrl .= $query;
    }
    return $newUrl;
}

/**
* Append a / to the URL if we are looking at a base page
*
* @param mixed $url
*/
function FixUrlSlash($url)
{
    if (strpos($url, '/', 8) == false) {
        $url .= '/';
    }
    return $url;
}

/**
* Restore the given test from the archive if it is archived
*
* @param mixed $id
*/
function RestoreTest($id)
{
    global $userIsBot;
    global $DISABLE_RESTORE;
    $isSaaSTest = (stripos($id, '_saas_') !== false);
    $saas_capture_prefix = GetSetting("cp_saas_capture_prefix");

    $ret = false;
    if (!$DISABLE_RESTORE && !$userIsBot && ValidateTestId($id)) {
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

        if ($isSaaSTest) {
            $capture_server = GetSetting("cp_capture_$saas_capture_prefix");
            $capture_salt = GetSetting("cp_capture_salt_$saas_capture_prefix");
        }

      // Only trigger a restore if the test doesn't exist
        if (!is_file("$testPath/testinfo.ini")) {
            $archive_dir = GetSetting('archive_dir');
            $archive_url = GetSetting('archive_url');
            $archive_s3_url = GetSetting('archive_s3_url');
            $archive_s3_server = GetSetting('archive_s3_server');
            if (
                ($capture_server && $capture_salt) ||
                ($archive_dir && strlen($archive_dir)) ||
                ($archive_url && strlen($archive_url)) ||
                ($archive_s3_url && strlen($archive_s3_url)) ||
                ($archive_s3_server && strlen($archive_s3_server))
            ) {
                $ret = RestoreArchive($id);
            } else {
                $ret = true;
            }
        }
    }

    return $ret;
}

/**
* Get the number of days since the test was last accessed
*
* @param mixed $id
*/
function TestLastAccessed($id)
{
    $elapsed = null;
    $testPath = './' . GetTestPath($id);
    $files = array('.archived', 'testinfo.ini');
    foreach ($files as $file) {
        if (is_file("$testPath/$file")) {
            $timestamp = filemtime("$testPath/$file");
            if ($timestamp) {
                $elapsed = max(time() - $timestamp, 0);
                $elapsed /= 86400;
                break;
            }
        }
    }
    return $elapsed;
}

/**
* Faster image resampling
*/
function fastimagecopyresampled(&$dst_image, $src_image, $dst_x, $dst_y, $src_x, $src_y, $dst_w, $dst_h, $src_w, $src_h, $quality = 3)
{
  // Plug-and-Play fastimagecopyresampled function replaces much slower imagecopyresampled.
  // Just include this function and change all "imagecopyresampled" references to "fastimagecopyresampled".
  // Typically from 30 to 60 times faster when reducing high resolution images down to thumbnail size using the default quality setting.
  // Author: Tim Eckel - Date: 09/07/07 - Version: 1.1 - Project: FreeRingers.net - Freely distributable - These comments must remain.
  //
  // Optional "quality" parameter (defaults is 3). Fractional values are allowed, for example 1.5. Must be greater than zero.
  // Between 0 and 1 = Fast, but mosaic results, closer to 0 increases the mosaic effect.
  // 1 = Up to 350 times faster. Poor results, looks very similar to imagecopyresized.
  // 2 = Up to 95 times faster.  Images appear a little sharp, some prefer this over a quality of 3.
  // 3 = Up to 60 times faster.  Will give high quality smooth results very close to imagecopyresampled, just faster.
  // 4 = Up to 25 times faster.  Almost identical to imagecopyresampled for most images.
  // 5 = No speedup. Just uses imagecopyresampled, no advantage over imagecopyresampled.

    if (empty($src_image) || empty($dst_image) || $quality <= 0) {
        return false;
    }
    if ($quality < 5 && (($dst_w * $quality) < $src_w || ($dst_h * $quality) < $src_h)) {
        $temp = imagecreatetruecolor($dst_w * $quality + 1, $dst_h * $quality + 1);
        imagecopyresized($temp, $src_image, 0, 0, $src_x, $src_y, $dst_w * $quality + 1, $dst_h * $quality + 1, $src_w, $src_h);
        imagecopyresampled($dst_image, $temp, $dst_x, $dst_y, 0, 0, $dst_w, $dst_h, $dst_w * $quality, $dst_h * $quality);
        imagedestroy($temp);
    } else {
        imagecopyresampled($dst_image, $src_image, $dst_x, $dst_y, $src_x, $src_y, $dst_w, $dst_h, $src_w, $src_h);
    }
    return true;
}

/**
* Get the number of pending high-priority page loads at the given location
* and the average time per page load (from the last 100 tests)
*/
function GetPendingTests($loc, &$count)
{
    $total = 0;
    $locations = explode(',', $loc);
    foreach ($locations as $location) {
        $parts = explode(':', $location);
        $location = $parts[0];
        $count = 0;
        $info = GetLocationInfo($location);
        if (isset($info) && is_array($info) && isset($info['queue'])) {
          // explicitly configured work queues do not support multiple priorities for status
          // though they do for the actual jobs.
            $queueType = $info['queue'];
            $addr = GetSetting("{$queueType}Addr");
            $port = GetSetting("{$queueType}Port");
            if ($queueType == 'beanstalk' && $addr && $port) {
                require_once('./lib/beanstalkd/pheanstalk_init.php');
                $pheanstalk = new Pheanstalk_Pheanstalk($addr, $port);
                $tube = 'wpt.work.' . sha1($location);
                try {
                    $stats = $pheanstalk->statsTube($tube);
                    $total += intval($stats['current-jobs-ready']);
                    $count += intval($stats['current-jobs-ready']);
                } catch (Exception $e) {
                }
            }
        } else {
          // now count just the low priority tests
            $beanstalkd = GetSetting('beanstalkd');
            if ($beanstalkd && strlen($beanstalkd)) {
                require_once('./lib/beanstalkd/pheanstalk_init.php');
                $pheanstalk = new Pheanstalk_Pheanstalk($beanstalkd);
                for ($priority = 0; $priority < 9; $priority++) {
                    $tube = 'wpt.' . md5("./work/jobs/$location") . ".$priority";
                    try {
                        $stats = $pheanstalk->statsTube($tube);
                        $total += intval($stats['current-jobs-ready']);
                        if (!$priority) {
                            $count += intval($stats['current-jobs-ready']);
                        }
                    } catch (Exception $e) {
                    }
                }
            }
            if (LoadJobQueue("./work/jobs/$location", $queue)) {
                foreach ($queue as $priority => &$q) {
                    if ($priority < 9) {
                        $total += count($q);
                    }
                }
                $count += count($queue[0]);
            }
        }
    }
    return $total;
}

/**
* Get the lengths of each of the test queues for the given location
*
* @param mixed $location
*/
$SCHEDULER_QUEUES = null;
function GetQueueLengths($location)
{
    global $SCHEDULER_QUEUES;
    $queues = array();
    for ($priority = 0; $priority <= 9; $priority++) {
        $queues[$priority] = 0;
    }
    $info = GetLocationInfo($location);
    if (isset($info) && is_array($info) && isset($info['queue'])) {
      // explicitly configured work queues do not support multiple priorities for status
      // though they do for the actual jobs.
        $queueType = $info['queue'];
        $addr = GetSetting("{$queueType}Addr");
        $port = GetSetting("{$queueType}Port");
        if ($queueType == 'beanstalk' && $addr && $port) {
            require_once('./lib/beanstalkd/pheanstalk_init.php');
            $pheanstalk = new Pheanstalk_Pheanstalk($addr, $port);
            $tube = 'wpt.work.' . sha1($location);
            try {
                $stats = $pheanstalk->statsTube($tube);
                $queues[0] += intval($stats['current-jobs-ready']);
            } catch (Exception $e) {
            }
        }
    } elseif (isset($info) && is_array($info) && isset($info['scheduler_node'])) {
      // Get the scheduler queue length (not separated by priorities)
        if (!isset($SCHEDULER_QUEUES)) {
            $SCHEDULER_QUEUES = CacheFetch('scheduler-queues', null);
            if (!isset($SCHEDULER_QUEUES)) {
                $host = GetSetting('host');
                $scheduler = GetSetting('cp_scheduler');
                $scheduler_salt = GetSetting('cp_scheduler_salt');
                if ($scheduler && $scheduler_salt) {
                    $url = "{$scheduler}hawkscheduleserver/wpt-metadata.ashx?queue=1&priorityqueue=1";
                    $cpid = GetCPID($host, $scheduler_salt);
                    $result_text = cp_http_get($url, $cpid);
                    if (isset($result_text) && strlen($result_text)) {
                        $SCHEDULER_QUEUES = json_decode($result_text, true);
                        CacheStore('scheduler-queues', $SCHEDULER_QUEUES, 15);
                    }
                }
            }
        }
        if (isset($SCHEDULER_QUEUES) && is_array($SCHEDULER_QUEUES)) {
            if (isset($SCHEDULER_QUEUES['PriorityQueues'][$info['scheduler_node']])) {
                $sq = $SCHEDULER_QUEUES['PriorityQueues'][$info['scheduler_node']];
                for ($priority = 0; $priority <= 9; $priority++) {
                    if (isset($sq[$priority])) {
                        $queues[$priority] = intval($sq[$priority]);
                    }
                }
            } elseif (isset($SCHEDULER_QUEUES['Queues'][$info['scheduler_node']])) {
                $queues[0] = intval($SCHEDULER_QUEUES['Queues'][$info['scheduler_node']]);
            }
        }
    } else {
        $beanstalkd = GetSetting('beanstalkd');
        if ($beanstalkd && strlen($beanstalkd)) {
            require_once('./lib/beanstalkd/pheanstalk_init.php');
            $pheanstalk = new Pheanstalk_Pheanstalk($beanstalkd);
            for ($priority = 0; $priority <= 9; $priority++) {
                $tube = 'wpt.' . md5("./work/jobs/$location") . ".$priority";
                try {
                    $stats = $pheanstalk->statsTube($tube);
                    $queues[$priority] += intval($stats['current-jobs-ready']);
                } catch (Exception $e) {
                }
            }
        }
        if (LoadJobQueue("./work/jobs/$location", $queue)) {
            foreach ($queue as $priority => &$q) {
                $queues[$priority] += count($q);
            }
        }
    }

    return $queues;
}

/**
* Get the number of active testers at the given location
*/
function GetTesterCount($location)
{
    $parts = explode(':', $location);
    $location = $parts[0];
    $testers = GetTesters($location);
    $count = 0;
    if (isset($testers) && is_array($testers) && isset($testers['testers']) && count($testers['testers'])) {
        $now = time();
        foreach ($testers['testers'] as $tester) {
            if (
                (!isset($tester['offline']) || !$tester['offline']) &&
                $tester['updated'] &&
                $now - $tester['updated'] < 3600
            ) {
                $count++;
            }
        }
    }

    return $count;
}

function GetDailyTestNum()
{
    $num = 0;
    $day = date('ymd');
    $key = "testnum_$day";
    if (function_exists('apcu_inc')) {
        $success = false;
        $num = apcu_inc($key, 1, $success, 86400);
        if (!$success) {
            $num = 0;
        }
    }
    if (!$num) {
        $lock = Lock("TestNum");
        if ($lock) {
            if (!$num) {
                $filename = WWW_PATH . '/dat/testnum.dat';
                $testData = array('day' => $day, 'num' => 0);
                $newData = json_decode(file_get_contents($filename), true);
                if (
                    isset($newData) && is_array($newData) &&
                    array_key_exists('day', $newData) &&
                    array_key_exists('num', $newData) &&
                    $newData['day'] == $day
                ) {
                    $testData['num'] = $newData['num'];
                }
                $testData['num']++;
                $num = $testData['num'];
                file_put_contents($filename, json_encode($testData));
                if (function_exists('apcu_store')) {
                    $nextNum = $num + 1;
                    apcu_store($key, $nextNum);
                }
            }
            Unlock($lock);
        }
    }
    return $num;
}

function AddTestJob($location, $job, $test, $testId)
{
    global $request_context;
    $priority = !is_null($request_context->getUser()) ? $request_context->getUser()->getUserPriority() : 0;

    $ret = false;
    if (isset($job) && strlen($job) && ValidateTestId($testId)) {
        $testPath = GetTestPath($testId);
        if (strlen($testPath)) {
            $testPath = './' . $testPath;
            if (!is_dir($testPath)) {
                mkdir($testPath, 0777, true);
            }
            touch("$testPath/test.waiting");
            $info = GetLocationInfo($location);
            $scheduler = GetSetting('cp_scheduler');
            $scheduler_salt = GetSetting('cp_scheduler_salt');
            $host = GetSetting('host');
            if ($scheduler && $scheduler_salt && isset($info) && is_array($info) && isset($info['scheduler_node'])) {
                touch("$testPath/test.scheduled");
                $json = null;
                $ret = true;
                $json = json_decode($job, true);
                if (isset($json['priority'])) {
                    $priority = $json['priority'];
                }
                for ($run = 1; $run <= $test['runs']; $run++) {
                    $jobID = $testId;
                    if ($run > 1) {
                        $jobID .= '.' . $run;
                    }
                  // Submit multiple job files for a multi-run test so they can run in parallel
                    if (isset($json)) {
                        if ($test['runs'] > 1) {
                            $json['run'] = $run;
                        }
                        $json['jobID'] = $jobID;
                        $job = json_encode($json);
                    }
                    if (!AddSchedulerJob($jobID, $job, $scheduler, $scheduler_salt, $info['scheduler_node'], $host, $priority)) {
                        $ret = false;
                    }
                }
            } elseif (isset($info) && is_array($info) && isset($info['queue'])) {
                // explicitly configured work queues do not support multiple priorities for status
                // though they do for the actual jobs.
                $queueType = $info['queue'];
                $addr = GetSetting("{$queueType}Addr");
                $port = GetSetting("{$queueType}Port");
                if ($queueType == 'beanstalk' && $addr && $port) {
                    try {
                          require_once('./lib/beanstalkd/pheanstalk_init.php');
                          $pheanstalk = new Pheanstalk_Pheanstalk($addr, $port);
                          $tube = 'wpt.work.' . sha1($location);
                          $message = gzdeflate(json_encode(array('job' => $job)), 7);
                        if ($message) {
                            $pheanstalk->putInTube($tube, $message, $test['priority'] + 1);
                            $ret = true;
                        }
                    } catch (Exception $e) {
                    }
                }
            } else {
                $locationLock = LockLocation($location);
                if (isset($locationLock)) {
                    $ret = true;
                    if (!is_dir($test['workdir'])) {
                        mkdir($test['workdir'], 0777, true);
                    }
                    $workDir = $test['workdir'];
                    $json = null;
                    if ($test['runs'] > 1 && substr($job, 0, 1) == '{') {
                        $json = json_decode($job, true);
                    }
                    $submit_count = $test['runs'];
                    if (GetSetting('disable_sharding')) {
                        $submit_count = 1;
                    }
                    for ($run = 1; $run <= $submit_count; $run++) {
                      // Submit multiple job files for a multi-run test so they can run in parallel
                        if ($submit_count > 1 && isset($json)) {
                            $json['run'] = $run;
                            $job = json_encode($json);
                        }
                        $fileName = $test['job'];
                        if (isset($test['affinity'])) {
                            $fileName = "Affinity{$test['affinity']}.{$test['job']}";
                        }
                        $testNum = GetDailyTestNum();
                        $sortableIndex = date('ymd') . GetSortableString($testNum);
                        $fileName = "$sortableIndex.$fileName";
                        $file = "$workDir/$fileName";
                        if (file_put_contents($file, $job)) {
                            if (!AddJobFile($location, $workDir, $fileName, $test['priority'], $test['queue_limit'])) {
                                  $ret = false;
                                  unlink($file);
                            }
                        } else {
                            $ret = false;
                        }
                        if (!isset($json)) {
                            break;
                        }
                    }
                    Unlock($locationLock);
                }
            }
        }
    }
    return $ret;
}

/**
 * Get a CPID signature string
 */
function GetCPID($host, $salt)
{
    $host = str_replace('.', '', trim($host));
    $hash_src = strtoupper($host) . ';' . date('Ym') . $salt;
    $hash_string = base64_encode(sha1($hash_src, true));
    $cpid_header = 'm;' . $host . ';' . $hash_string;
    return $cpid_header;
}

function cp_http_post($url, $body, $cpid, $file = null)
{
    $result = null;
    $filesize = 0;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $headers = array();
        $file_stream = null;
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $contentType = "application/json";
        if (isset($file)) {
            $contentType = "application/zip";
            $file_stream = fopen($file, 'rb');
            if ($file_stream) {
                curl_setopt($ch, CURLOPT_PUT, 1);
                curl_setopt($ch, CURLOPT_UPLOAD, true);
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
                curl_setopt($ch, CURLOPT_INFILE, $file_stream);
                $filesize = filesize($file);
                curl_setopt($ch, CURLOPT_INFILESIZE, $filesize);
            } else {
                curl_close($ch);
                return null;
            }
        } else {
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, array("Content-Type: $contentType",
                                               "CPID: $cpid",
                                               "Transfer-Encoding: chunked"));
        curl_setopt($ch, CURLOPT_FAILONERROR, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 60);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($curl, $header) use (&$headers) {
            $len = strlen($header);
            $header = explode(':', $header, 2);
            if (count($header) < 2) { // ignore invalid headers
                return $len;
            }
            $headers[strtolower(trim($header[0]))] = trim($header[1]);
            return $len;
        });
        $response = curl_exec($ch);
        if ($response !== false) {
            if (isset($headers['wpt_status_code']) && ($headers['wpt_status_code'] == '0' || $headers['wpt_status_code'] == '22')) {
                $result = $response;
            } else {
                $error_log = GetSetting('error_log');
                if ($error_log) {
                    if (isset($headers['wpt_status_code'])) {
                        error_log(gmdate('Y/m/d H:i:s - ') . "POST ($filesize) $url : wpt_status_code {$headers['wpt_status_code']}\n", 3, $error_log);
                    } else {
                          error_log(gmdate('Y/m/d H:i:s - ') . "POST ($filesize) $url : wpt_status_code missing\n", 3, $error_log);
                    }
                }
            }
        } else {
            $error = curl_error($ch);
            $error_log = GetSetting('error_log');
            if ($error_log) {
                if ($error) {
                    error_log(gmdate('Y/m/d H:i:s - ') . "POST ($filesize) $url : $error\n", 3, $error_log);
                } else {
                    $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
                    if ($code) {
                        error_log(gmdate('Y/m/d H:i:s - ') . "POST ($filesize) $url : code $code\n", 3, $error_log);
                    } else {
                        error_log(gmdate('Y/m/d H:i:s - ') . "POST ($filesize) $url unknown error\n", 3, $error_log);
                    }
                }
            }
        }
        if ($file_stream) {
            fclose($file_stream);
        }
        curl_close($ch);
    }
    return $result;
}

function cp_http_get($url, $cpid)
{
    $result = null;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $headers = array();
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array("CPID: $cpid"));
        curl_setopt($ch, CURLOPT_FAILONERROR, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 60);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($curl, $header) use (&$headers) {
            $len = strlen($header);
            $header = explode(':', $header, 2);
            if (count($header) < 2) { // ignore invalid headers
                return $len;
            }
            $headers[strtolower(trim($header[0]))] = trim($header[1]);
            return $len;
        });
        $response = curl_exec($ch);
        curl_close($ch);
        if ($response !== false) {
            if (isset($headers['wpt_status_code']) && $headers['wpt_status_code'] == '0') {
                $result = $response;
            }
        }
    }
    return $result;
}

function cp_http_get_file($url, $cpid, $file)
{
    $ret = false;
    if (function_exists('curl_init')) {
        $file_stream = fopen($file, 'wb');
        if ($file_stream) {
            $ch = curl_init($url);
            $headers = array();
            curl_setopt($ch, CURLOPT_FILE, $file_stream);
            curl_setopt($ch, CURLOPT_HTTPHEADER, array("CPID: $cpid"));
            curl_setopt($ch, CURLOPT_FAILONERROR, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
            curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 60);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($curl, $header) use (&$headers) {
                $len = strlen($header);
                $header = explode(':', $header, 2);
                if (count($header) < 2) { // ignore invalid headers
                    return $len;
                }
                $headers[strtolower(trim($header[0]))] = trim($header[1]);
                return $len;
            });
            $response = curl_exec($ch);
            fclose($file_stream);
            if ($response !== false) {
                if (isset($headers['wpt_status_code']) && $headers['wpt_status_code'] == '0') {
                    $ret = true;
                } else {
                    $error_log = GetSetting('error_log');
                    if ($error_log) {
                        if (isset($headers['wpt_status_code'])) {
                            error_log(gmdate('Y/m/d H:i:s - ') . "GET File $url : wpt_status_code {$headers['wpt_status_code']}\n", 3, $error_log);
                        } else {
                            error_log(gmdate('Y/m/d H:i:s - ') . "GET File $url : headers " . json_encode($headers) . "\n", 3, $error_log);
                        }
                    }
                }
            } else {
                $error = curl_error($ch);
                $error_log = GetSetting('error_log');
                if ($error_log) {
                    error_log(gmdate('Y/m/d H:i:s - ') . "GET File $url : $error\n", 3, $error_log);
                }
                @unlink($file);
            }
            curl_close($ch);
        }
        if (!$ret) {
            @unlink($file);
        }
    }
    return $ret;
}

/**
 * Add a job to a scheduler queue
 */
function AddSchedulerJob($jobID, $job, $scheduler, $scheduler_salt, $scheduler_node, $host, $priority)
{
    $url = "{$scheduler}hawkscheduleserver/wpt-enq.ashx?test=$jobID&node=$scheduler_node&priority=$priority";
    $cpid = GetCPID($host, $scheduler_salt);
    $result = cp_http_post($url, $job, $cpid);
    $ret = false;
    if (isset($result)) {
        $ret = true;
    }
    return $ret;
}

function GetSchedulerTestStatus($testID)
{
  // cache the status in apc for 15 seconds so we don't hammer the scheduler
    $cache_key = "scheduler-status-$testID";
    $status = CacheFetch($cache_key);
    if (isset($status) && !is_array($status)) {
        $status = null;
    }

    if (!isset($status)) {
        $scheduler = GetSetting('cp_scheduler');
        $scheduler_salt = GetSetting('cp_scheduler_salt');
        $host = GetSetting('host');
        if ($scheduler && $scheduler_salt) {
            $url = "{$scheduler}hawkscheduleserver/wpt-test-queue.ashx?test=$testID";
            $cpid = GetCPID($host, $scheduler_salt);
            $status_text = cp_http_get($url, $cpid);
            if (isset($status_text)) {
                if (strlen($status_text)) {
                    $status = json_decode($status_text, true);
                } else {
                    $status = array();
                }
                CacheStore($cache_key, $status, 15);
            }
        }
    }
    return $status;
}

/**
* Add a job to the work queue (assume it is locked)
*/
function AddJobFile($location, $workDir, $file, $priority, $queue_limit = 0)
{
    $ret = false;

    $use_beanstalk = false;
    $beanstalkd = GetSetting('beanstalkd');
    if ($beanstalkd && strlen($beanstalkd)) {
        if ($priority || !GetSetting('beanstalk_api_only')) {
            $use_beanstalk = true;
        }
    }
    if ($use_beanstalk) {
        try {
            $tube = 'wpt.' . md5($workDir) . ".$priority";
            require_once('./lib/beanstalkd/pheanstalk_init.php');
            $pheanstalk = new Pheanstalk_Pheanstalk($beanstalkd);
            $pheanstalk->putInTube($tube, $file);
            $ret = true;
        } catch (Exception $e) {
        }
    } elseif (LoadJobQueue($workDir, $queue)) {
        if (!$queue_limit || count($queue[$priority]) < $queue_limit) {
            if (array_push($queue[$priority], $file)) {
                $ret = SaveJobQueue($workDir, $queue);
            }
        }
    }

    return $ret;
}

/**
* Get a job from the given work queue (assume it is locked)
*/
function GetTestJob($location, &$file, $workDir, &$priority, $tester = null, $testerIndex = null, $testerCount = null)
{
    $test_job = null;
    $file = null;

    $info = GetLocationInfo($location);
    if (isset($info) && is_array($info) && isset($info['queue'])) {
      // explicitly configured work queues do not support multiple priorities for status
      // though they do for the actual jobs.
        $queueType = $info['queue'];
        $addr = GetSetting("{$queueType}Addr");
        $port = GetSetting("{$queueType}Port");
        if ($queueType == 'beanstalk' && $addr && $port) {
            try {
                require_once('./lib/beanstalkd/pheanstalk_init.php');
                $pheanstalk = new Pheanstalk_Pheanstalk($addr, $port);
                $tube = 'wpt.work.' . sha1($location);
                $job = $pheanstalk->reserveFromTube($tube, 0);
                if ($job !== false) {
                    $message = $job->getData();
                  // TODO: Add support for reserving and automatically retrying jobs
                    $pheanstalk->delete($job);
                    $job = json_decode(gzinflate($message), true);
                    if (isset($job) && is_array($job) && isset($job['job'])) {
                        $test_job = $job['job'];
                    }
                }
            } catch (Exception $e) {
            }
        }
    } else {
        if ($lock = LockLocation($location)) {
            if (LoadJobQueue($workDir, $queue)) {
                $modified = false;
                $priority = 0;
                while (!isset($file) && $priority <= 9) {
                  // Pick any tests without affinity or whose affinity
                  // matches the existing tester
                    if (isset($queue[$priority]) && count($queue[$priority])) {
                        foreach ($queue[$priority] as $index => $job_file) {
                            if (preg_match('/Affinity(?P<affinity>[a-zA-Z0-9\-_]+)\.(?P<id>[a-zA-Z0-9\_]+)\.(p[0-9]|url)$/', $job_file, $matches)) {
                                  $affinity = $matches['affinity'];
                                if (preg_match('/^Tester(?P<tester>[a-zA-Z0-9\-_]+$)/', $affinity, $matches)) {
                                    if (isset($tester) && !strcasecmp($tester, $matches['tester'])) {
                                            $file = $job_file;
                                    }
                                } elseif (
                                    isset($testerIndex) && isset($testerCount) &&
                                          $testerIndex >= 0 && $testerIndex < $testerCount &&
                                          preg_match('/^[0-9]+$/', $affinity, $matches)
                                ) {
                                    $matchIndex = intval($affinity) % $testerCount;
                                    if ($matchIndex == $testerIndex) {
                                        $file = $job_file;
                                    }
                                }
                            } else {
                              // no affinity, this one works
                                  $file = $job_file;
                            }
                            if (isset($file)) {
                                unset($queue[$priority][$index]);
                                $modified = true;
                                if (is_file("$workDir/$file")) {
                                    break;
                                } else {
                                    unset($file);
                                }
                            }
                        }
                    }
                    if (!isset($file)) {
                        $priority++;
                    }
                }

                if ($modified) {
                    SaveJobQueue($workDir, $queue);
                }
            }
            Unlock($lock);
        }

        if (!isset($file)) {
            $beanstalkd = GetSetting('beanstalkd');
            if ($beanstalkd && strlen($beanstalkd)) {
                require_once('./lib/beanstalkd/pheanstalk_init.php');
                $pheanstalk = new Pheanstalk_Pheanstalk($beanstalkd);
                $priority = 0;
                while (!isset($file) && $priority <= 9) {
                    $found = false;
                    try {
                        $tube = 'wpt.' . md5($workDir) . ".$priority";
                        $job = $pheanstalk->reserveFromTube($tube, 0);
                        if ($job !== false) {
                              $found = true;
                              $file = $job->getData();
                            if (isset($file) && !is_file("$workDir/$file")) {
                                unset($file);
                            }
                              $pheanstalk->delete($job);
                        }
                    } catch (Exception $e) {
                    }
                    if (!$found && !isset($file)) {
                          $priority++;
                    }
                }
            }
        }
        if (isset($file) && strlen($file) && is_file("$workDir/$file")) {
            $data = file_get_contents("$workDir/$file");
            if (isset($data) && $data !== false && strlen($data)) {
                $test_job = $data;
            } else {
              // TODO: Mark the test as started before deleting the job file
                unlink("$workDir/$file");
                unset($file);
            }
        }
    }

    return $test_job;
}

/**
* Find the position in the work queue for the given test (assume it is locked)
*/
function FindJobPosition($location, $workDir, $testId)
{
    $count = 0;
    $found = false;

    $info = GetLocationInfo($location);
    if (isset($info) && is_array($info) && isset($info['queue'])) {
        $found = true;
    } else {
        if (LoadJobQueue($workDir, $queue)) {
            $priority = 0;
            while (!$found && $priority <= 9) {
                foreach ($queue[$priority] as $file) {
                    if (stripos($file, $testId) !== false) {
                        $found = true;
                        break;
                    } elseif (!$found) {
                        $count++;
                    }
                }
                $priority++;
            }
        }
        $beanstalkd = GetSetting('beanstalkd');
        if (!$found && $beanstalkd && strlen($beanstalkd)) {
            require_once('./lib/beanstalkd/pheanstalk_init.php');
            $pheanstalk = new Pheanstalk_Pheanstalk($beanstalkd);
            $stats = $pheanstalk->stats();
            if ($stats['current-jobs-ready'] > 0) {
                $found = true;
            }
        }
    }

    if (!$found) {
        $count = -1;
    }

    return $count;
}

/**
* Load the job queue from disk
*/
function LoadJobQueue($workDir, &$queue)
{
    $ret = false;
    if (!GetSetting('beanstalkd') || GetSetting('beanstalk_api_only')) {
        $ret = true;
        if (isset($workDir) && strlen($workDir)) {
            $queue = null;
            $queueName = sha1($workDir);
            $queueFile = "./tmp/$queueName.queue";
            if (gz_is_file($queueFile)) {
                $queue = json_decode(gz_file_get_contents($queueFile), true);
                // re-scan the directory if the queue is empty
                if (isset($queue)) {
                    if (is_array($queue)) {
                        $empty = true;
                        foreach ($queue as &$p) {
                            if (is_array($p) && isset($p[0]) && (strpos($p[0], "AffinityTester") == false)) {
                                  $empty = false;
                                  break;
                            }
                        }
                        if ($empty) {
                            unset($queue);
                        }
                    } else {
                        unset($queue);
                    }
                }
            }

            if (!isset($queue) && !GetSetting('beanstalkd')) {
              // build the queue from disk (files will be sortable by the order they were submitted)
                $files = scandir($workDir);
                sort($files);

              // now add them to the various priority queues
                $queue = array();
                for ($priority = 0; $priority <= 9; $priority++) {
                    $queue[$priority] = array();
                }

                foreach ($files as $file) {
                    if (stripos($file, '.url')) {
                        $queue[0][] = $file;
                    } elseif (preg_match('/\.p([1-9])/i', $file, $matches)) {
                        $priority = (int)$matches[1];
                        $queue[$priority][] = $file;
                    }
                }

                SaveJobQueue($workDir, $queue);
            } elseif (!isset($queue)) {
                $queue = array();
                for ($priority = 0; $priority <= 9; $priority++) {
                    $queue[$priority] = array();
                }
            }
        }
    }

    return $ret;
}

/**
* Save the job queue to disk
*/
function SaveJobQueue($workDir, &$queue)
{
    $ret = false;
    $queueName = sha1($workDir);
    if (gz_file_put_contents("./tmp/$queueName.queue", json_encode($queue))) {
        $ret = true;
    }

    return $ret;
}

/**
* Get the backlog for the given location
*
* @param mixed $dir
*/
function GetTesters($locationId, $includeOffline = false, $include_sensitive = true)
{
  // cache the location testers info for up to one minute
    $cache_key = "$locationId-$includeOffline-$include_sensitive";
    $location = CacheFetch($cache_key);
    if (isset($location)) {
        return $location;
    }

    $location = array();
    $dir = TEMP_DIR . "/testers-$locationId";
    if (is_dir($dir)) {
        $now = time();
        $elapsed_time = null;
        $testers = array();
        $delete = array();
        $files = glob("$dir/*.json.gz");
        $max_tester_time = min(max(GetSetting('max_tester_minutes', 60), 5), 120);
        foreach ($files as $file) {
            $tester_info = json_decode(gz_file_get_contents($dir . '/' . basename($file, '.gz')), true);
            if (isset($tester_info) && is_array($tester_info)) {
                $elapsed = 0;
                if (isset($tester_info['updated'])) {
                    $updated = $tester_info['updated'];
                    $elapsed = $now < $updated ? 0 : ($now - $updated) / 60;
                  // update the most recent contact from the given location
                    if (!isset($elapsed_time) || $elapsed < $elapsed_time) {
                        $elapsed_time = $elapsed;
                    }
                }

                // Clean up any old testers (> 1 hour since we've seen them)
                if ($elapsed > $max_tester_time) {
                    $delete[] = $file;
                } else {
                    $testers[$tester_info['id']] = $tester_info;
                }
            }
        }

        $delete_count = count($delete);
        if ($delete_count) {
          // Keep at least one around so we can tell how long the location has been offline
            if (!count($testers)) {
                $delete_count--;
            }
            for ($i = 0; $i < $delete_count; $i++) {
                unlink($delete[$i]);
            }
        }

        if (count($testers)) {
            ksort($testers);
            $location['testers'] = array();
            foreach ($testers as $id => $tester) {
                if ($includeOffline || !isset($tester['offline']) || !$tester['offline']) {
                    $entry = array('id' => $id,
                         'pc' => @$tester['pc'],
                         'ec2' => @$tester['ec2'],
                         'ip' => @$tester['ip'],
                         'version' => @$tester['ver'],
                         'freedisk' => @$tester['freedisk'],
                         'upminutes' => @$tester['upminutes'],
                         'ie' => @$tester['ie'],
                         'winver' => @$tester['winver'],
                         'isWinServer' => @$tester['isWinServer'],
                         'isWin64' => @$tester['isWin64'],
                         'dns' => @$tester['dns'],
                         'GPU' => @$tester['GPU'],
                         'offline' => @$tester['offline'],
                         'screenwidth' => @$tester['screenwidth'],
                         'screenheight' => @$tester['screenheight']);
                    if ($include_sensitive) {
                        $entry['test'] = @$tester['test'];
                    }

                    if (isset($tester['browsers'])) {
                         $entry['browsers'] = @$tester['browsers'];
                    }

                    $entry['rebooted'] = isset($tester['rebooted']) ? $tester['rebooted'] : false;

                    if (isset($tester['cpu']) && is_array($tester['cpu']) && count($tester['cpu'])) {
                          $entry['cpu'] = round(array_sum($tester['cpu']) / count($tester['cpu']));
                    }

                    if (isset($tester['errors']) && is_array($tester['errors']) && count($tester['errors']) > 50) {
                        $entry['errors'] = round(array_sum($tester['errors']) / count($tester['errors']));
                    }

                // last time it checked in
                    if (isset($tester['updated'])) {
                        $updated = $tester['updated'];
                        $entry['elapsed'] = $now < $updated ? 0 : (int)(($now - $updated) / 60);
                    }

                // last time it got work
                    if (isset($tester['last'])) {
                        $updated = $tester['last'];
                        $entry['last'] = $now < $updated ? 0 : (int)(($now - $updated) / 60);
                    }

                    $entry['busy'] = 0;
                    if (isset($tester['test']) && strlen($tester['test'])) {
                        $entry['busy'] = 1;
                    }

                    $location['testers'][] = $entry;
                }
            }
        }

        if (isset($elapsed_time)) {
            $location['elapsed'] = (int)$elapsed_time;
        }
    }

    if (isset($location['elapsed']) && $location['elapsed'] < 60) {
        $location['status'] = 'OK';
    } else {
        $location['status'] = 'OFFLINE';
    }

    CacheStore($cache_key, $location, 60);

    return $location;
}

/**
* Update the list of testers and the last contact time for the given tester
*
* @param mixed $location
* @param mixed $tester
* @param mixed $testerInfo
*/
function UpdateTester($location, $tester, $testerInfo = null, $cpu = null, $error = null, $rebooted = null)
{
    $dir = TEMP_DIR . "/testers-$location";
    $tester_file = $dir . '/' . sha1($tester) . '.json';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    $tester_info = null;
    if (gz_is_file($tester_file)) {
        $tester_info = json_decode(gz_file_get_contents($tester_file), true);
    }
    if (!isset($tester_info) || !is_array($tester_info)) {
        $tester_info = array();
    }

    $now = time();
    $tester_info['updated'] = $now;
    if (!isset($tester_info['first_contact'])) {
        $tester_info['first_contact'] = $now;
    }

    if (isset($rebooted)) {
        $tester_info['rebooted'] = $rebooted;
    }

  // Update the CPU Utilization
    if (isset($cpu) && $cpu > 0) {
        if (!isset($tester_info['cpu']) || !is_array($tester_info['cpu'])) {
            $tester_info['cpu'] = array();
        }
        $tester_info['cpu'][] = $cpu;
        if (count($tester_info['cpu']) > 100) {
            array_shift($tester_info['cpu']);
        }
    }

  // keep track of the success/error count
    if (isset($error)) {
        if (!isset($tester_info['errors']) || !is_array($tester_info['errors'])) {
            $tester_info['errors'] = array();
        }
        $tester_info['errors'][] = strlen($error) ? 100 : 0;
        if (count($tester_info['errors']) > 100) {
            array_shift($tester_info['errors']);
        }
    }

    if (isset($testerInfo) && is_array($testerInfo)) {
      // keep track of the FIRST idle request as the last work time so we can have an accurate "idle time"
        if (isset($testerInfo['test']) && strlen($testerInfo['test'])) {
            $tester_info['last'] = $now;
        }
        if (isset($tester_info['test']) && strlen($tester_info['test'])) {
            $tester_info['last'] = $now;
        }

      // update any other data passed in for the tester
        foreach ($testerInfo as $key => $value) {
            $tester_info[$key] = $value;
        }
    }
    $tester_info['id'] = $tester;

    gz_file_put_contents($tester_file, json_encode($tester_info));
}

/**
* Lock the given location (make sure to unlock it when you are done)
*/
function LockLocation($location)
{
    return Lock("Location $location", true, 30);
}

/**
* Unlock the given location
*/
function UnlockLocation($lock)
{
    Unlock($lock);
}

$RemainingLocks = null;
function CleanupLocks()
{
    global $RemainingLocks;
    if (isset($RemainingLocks)) {
        foreach ($RemainingLocks as $lockfile) {
            if (strlen($lockfile) && is_file($lockfile)) {
                @unlink($lockfile);
            }
        }
    }
}

function Lock($name, $blocking = true, $maxLockSeconds = 300)
{
    global $RemainingLocks;
    $lock = null;
    $tmpdir =  TEMP_DIR;
    if (strlen($name)) {
        if (!is_dir($tmpdir)) {
            mkdir($tmpdir, 0777, true);
        }
        if (preg_match('/^[a-zA-Z0-9-_ ]+$/', $name)) {
            $lockFile = $tmpdir . '/named-' . str_replace(' ', '-', $name) . '.lock';
        } else {
            $lockFile = $tmpdir . '/lock-' . sha1($name) . '.lock';
        }
        $start = microtime(true);
        do {
            $file = @fopen($lockFile, 'xb');
            if ($file !== false) {
                fwrite($file, json_encode(debug_backtrace(), JSON_PRETTY_PRINT | JSON_PARTIAL_OUTPUT_ON_ERROR));
                fclose($file);
                $lock = array('name' => $name);
                $lock['file'] = $lockFile;
            } else {
              // see if the lock is stale
                $modified = @filemtime($lockFile);
                if ($modified && time() - $modified > $maxLockSeconds) {
                    @unlink($lockFile);
                } elseif ($blocking) {
                    usleep(rand(100000, 150000));
                }
            }
            $elapsed = microtime(true) - $start;
        } while (!isset($lock) && $blocking && $elapsed < $maxLockSeconds);
    }
    if (isset($lock)) {
        if (!isset($RemainingLocks)) {
            $RemainingLocks = array();
            register_shutdown_function('CleanupLocks');
        }
        $RemainingLocks[] = $lock['file'];
    }
    return $lock;
}

function UnLock(&$lock)
{
    global $RemainingLocks;
    if (isset($lock)) {
        if (is_array($lock) && array_key_exists('file', $lock) && strlen($lock['file'])) {
            @unlink($lock['file']);
            if (isset($RemainingLocks) && is_array($RemainingLocks)) {
                foreach ($RemainingLocks as $index => $file) {
                    if ($file == $lock['file']) {
                        unset($RemainingLocks[$index]);
                        break;
                    }
                }
            }
        }
        unset($lock);
    }
}

function LockTest($id)
{
    return Lock("Test $id");
}

function UnlockTest(&$testLock)
{
    if (isset($testLock) && $testLock) {
        Unlock($testLock);
        $testLock = null;
    }
}

/**
* Load and sort the video frame files into an arrray
*
* @param mixed $path
*/
function loadVideo($path, &$frames)
{
    $ret = false;
    $frames = null;
    if (is_dir($path)) {
        $files = glob($path . '/frame_*.jpg', GLOB_NOSORT);
        if ($files && count($files)) {
            $ret = true;
            $frames = array();
            foreach ($files as $file) {
                $file = basename($file);
                $parts = explode('_', $file);
                if (count($parts) >= 2) {
                    $index = intval($parts[1] * 100);
                    $frames[$index] = $file;
                }
            }
        } else {
            $files = glob($path . '/ms_*.jpg', GLOB_NOSORT);
            if ($files && count($files)) {
                $ret = true;
                $frames = array();
                foreach ($files as $file) {
                    $file = basename($file);
                    $parts = explode('_', $file);
                    if (count($parts) >= 2) {
                        $index = intval($parts[1]);
                        $frames[$index] = $file;
                    }
                }
            }
        }
        // sort the frames in order
        if (isset($frames) && count($frames)) {
            ksort($frames, SORT_NUMERIC);
        }
    }

    return $ret;
}

/**
* Escape XML output (insane that PHP doesn't support this natively)
*/
function xml_entities($text, $charset = 'UTF-8')
{
    // strip out any unprintable characters
    $text = preg_replace('/[\x00-\x1F\x80-\x9F]/u', '', $text);

    // encode html characters that are also invalid in xml
    $text = htmlentities($text, ENT_COMPAT | ENT_SUBSTITUTE, $charset, false);

    // XML character entity array from Wiki
    // Note: &apos; is useless in UTF-8 or in UTF-16
    $arr_xml_special_char = array("&quot;","&amp;","&apos;","&lt;","&gt;");

    // Building the regex string to exclude all strings with XML special char
    $arr_xml_special_char_regex = "(?";
    foreach ($arr_xml_special_char as $key => $value) {
        $arr_xml_special_char_regex .= "(?!$value)";
    }
    $arr_xml_special_char_regex .= ")";

    // Scan the array for &something_not_xml; syntax
    $pattern = "/$arr_xml_special_char_regex&([a-zA-Z0-9]*;)/";

    // Replace the &something_not_xml; with &amp;something_not_xml;
    $replacement = '&amp;${1}';
    return preg_replace($pattern, $replacement, $text);
}

/**
 * Normalize all of the keys to only include alphanumeric characters
 */
function normalize_keys(&$array)
{
    if (isset($array) && is_array($array)) {
      // Build a list of keys that need fixing (don't modify the array wile iterating)
        $keys = array();
        foreach ($array as $key => $value) {
            if (!preg_match('/^[0-9a-zA-Z]+$/', $key)) {
                $keys[] = $key;
            }
          // recursively normalize any arrays
            if (is_array($value)) {
                normalize_keys($array[$key]);
            }
        }

      // Normalize the actual keys
        foreach ($keys as $key) {
            $new_key = preg_replace('/[^0-9a-zA-Z]+/', '', $key);
            if (strlen($new_key) && $new_key != $key) {
                $array[$new_key] = $array[$key];
                unset($array[$key]);
            }
        }
    }
}

/**
 * Send a JSON response (including callback for JSONP)
 *
 * @param mixed $response
 */
function json_response(&$response, $allow_crossorigin = true)
{
    header("Content-type: application/json; charset=utf-8");
    header("Cache-Control: no-cache, must-revalidate", true);
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
    if ($allow_crossorigin) {
        header('Access-Control-Allow-Origin: *');
    }

    if (isset($_REQUEST['normalizekeys']) && $_REQUEST['normalizekeys']) {
        normalize_keys($response);
    }

    if (array_key_exists('callback', $_REQUEST) && strlen($_REQUEST['callback'])) {
        echo "{$_REQUEST['callback']}(";
    }

    if (array_key_exists('r', $_REQUEST) && strlen($_REQUEST['r'])) {
        $ret['requestId'] = $_REQUEST['r'];
    }

    $out = null;
    if (
        version_compare(phpversion(), '5.4.0') >= 0 &&
        array_key_exists('pretty', $_REQUEST) &&
        $_REQUEST['pretty']
    ) {
        $out = json_encode($response, JSON_PRETTY_PRINT);
    } else {
        $out = json_encode($response);
    }

    echo $out;

    if (isset($_REQUEST['callback']) && strlen($_REQUEST['callback'])) {
        echo ");";
    }
}

/**
 * Check to make sure a test ID is valid
 *
 * @param mixed $id
 */
function ValidateTestId(&$id)
{
    $valid = false;
    $testId = $id;

    if (preg_match('/^(?:[a-zA-Z0-9_]+)+$/', @$testId)) {
        $testYear = intval(substr($testId, 0, 2));
        $currentYear = intval(date("y"));
        if ($testYear >= 8 && $testYear <= $currentYear) {
            $valid = true;
        }
    } else {
        $id = '';
    }
  // Exit if we are trying to operate on an invalid ID
    if (!$valid) {
        exit(0);
    }
    return $valid;
}

function arrayLookupWithDefault($key, $searchArray, $default)
{
    if (!is_array($searchArray) || !array_key_exists($key, $searchArray)) {
        return $default;
    }

    return $searchArray[$key];
}

function formatMsInterval($val, $digits)
{
    if ($val == UNKNOWN_TIME) {
        return '-';
    }

    return removeLeadingZero(number_format($val / 1000.0, $digits) . '<span class="units">S</span>');
}

function removeLeadingZero($in)
{
    return preg_replace('/^0*([^0]+)/i', '${1}', $in);
}

/**
* Make sure there are no risky files in the given directory and make everything no-execute
*
* @param mixed $path
*/
function SecureDir($path)
{
    if (GetSetting('no_secure')) {
        return;
    }

    $files = scandir($path);
    foreach ($files as $file) {
        $filepath = "$path/$file";
        if (is_file($filepath)) {
            $parts = pathinfo($file);
            $ext = strtolower($parts['extension']);
            if (
                strpos($ext, 'php') === false &&
                strpos($ext, 'pl') === false &&
                strpos($ext, 'py') === false &&
                strpos($ext, 'cgi') === false &&
                strpos($ext, 'asp') === false &&
                strpos($ext, 'js') === false &&
                strpos($ext, 'rb') === false &&
                strpos($ext, 'htaccess') === false &&
                strpos($ext, 'jar') === false
            ) {
                @chmod($filepath, 0666);
            } else {
                @chmod($filepath, 0666);    // just in case the unlink fails for some reason
                unlink($filepath);
            }
        } elseif ($file != '.' && $file != '..' && is_dir($filepath)) {
            SecureDir($filepath);
        }
    }
}

/**
* Wrapper function that will use CURL or file_get_contents to retrieve the contents of an URL
*
* @param mixed $url
*/
function http_fetch($url)
{
    $ret = null;
    global $CURL_CONTEXT;
    if ($CURL_CONTEXT !== false) {
        curl_setopt($CURL_CONTEXT, CURLOPT_URL, $url);
        $ret = curl_exec($CURL_CONTEXT);
    } else {
        $context = stream_context_create(array('http' => array('header' => 'Connection: close', 'timeout' => 60)));
        $ret = file_get_contents($url, false, $context);
    }
    return $ret;
}

function http_fetch_file($url, $file)
{
    $ret = false;
    if (function_exists('curl_init')) {
        $httpcode = 0;
        $fp = fopen($file, 'w+');
        if ($fp) {
            $ch = curl_init($url);
            if ($ch) {
                $headers = array(
                "Fastly-Client-IP: {$_SERVER['REMOTE_ADDR']}",
                "User-Agent: {$_SERVER['HTTP_USER_AGENT']}"
                );
                curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
                curl_setopt($ch, CURLOPT_FILE, $fp);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_exec($ch);
                $httpcode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
                curl_close($ch);
            }
            fclose($fp);
            if ($httpcode === 200) {
                $ret = filesize($file);
            } else {
                unlink($file);
            }
        }
    }
    return $ret;
}

function http_head($url)
{
    $ok = false;
    if (function_exists('curl_init')) {
        $ok = true;
        $ch = curl_init($url);
        $headers = array(
        "Fastly-Client-IP: {$_SERVER['REMOTE_ADDR']}",
        "User-Agent: {$_SERVER['HTTP_USER_AGENT']}"
        );
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        $response = curl_exec($ch);
        $httpcode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        if ($httpcode !== 200) {
            $ok = false;
        }
    }
    return $ok;
}

function http_put_raw($url, $body)
{
    $ok = false;
    if (function_exists('curl_init')) {
        $ok = true;
        $ch = curl_init($url);
        $headers = array(
        "Fastly-Client-IP: {$_SERVER['REMOTE_ADDR']}",
        "User-Agent: {$_SERVER['HTTP_USER_AGENT']}",
        'Content-Type: text/plain'
        );
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_FAILONERROR, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 600);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        $response = curl_exec($ch);
        curl_close($ch);
        if ($response === false) {
            $ok = false;
        }
    }
    return $ok;
}

function http_put_file($url, $file)
{
    $ok = false;
    if (function_exists('curl_init')) {
        $file_stream = fopen($file, 'rb');
        if ($file_stream) {
            $ok = true;
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_PUT, 1);
            $headers = array(
            "Fastly-Client-IP: {$_SERVER['REMOTE_ADDR']}",
            "User-Agent: {$_SERVER['HTTP_USER_AGENT']}",
            'Content-Type: application/octet-stream'
            );
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_INFILE, $file_stream);
            curl_setopt($ch, CURLOPT_INFILESIZE, filesize($file));
            curl_setopt($ch, CURLOPT_FAILONERROR, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
            curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 60);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            $response = curl_exec($ch);
            $httpcode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);
            if ($httpcode !== 200) {
                $ok = false;
            }
            fclose($file_stream);
        }
    }
    return $ok;
}

function http_post_raw($url, $body, $content_type = 'text/plain', $return_response = false)
{
    $ok = false;
    if (function_exists('curl_init')) {
        $ok = true;
        $ch = curl_init($url);
        $headers = array(
        "Fastly-Client-IP: {$_SERVER['REMOTE_ADDR']}",
        "User-Agent: {$_SERVER['HTTP_USER_AGENT']}",
        "Content-Type: $content_type"
        );
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_FAILONERROR, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 60);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        $response = curl_exec($ch);
        curl_close($ch);
        if ($response === false) {
            $ok = false;
        }
        if ($return_response) {
            return $response;
        }
    }
    return $ok;
}

/**
* Generate a shard key to better spread out the test results
*
*/
function ShardKey($test_num, $locationID = null)
{
    $key = '';

    $bucket_size = GetSetting('bucket_size');
    if ($bucket_size) {
      // group the tests sequentially
        $bucket_size = (int)$bucket_size;
        $bucket = $test_num / $bucket_size;
        $key = NumToString($bucket) . '_';
    } else {
      // default to a 2-digit shard (1024-way shard)
        $size = 2;
        $shard = GetSetting('shard');
        if ($shard) {
            $size = (int)$shard;
        }

        if ($size > 0 && $size < 20) {
            $digits = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
            $digitCount = strlen($digits) - 1;
            while ($size) {
                $key .= substr($digits, rand(0, $digitCount), 1);
                $size--;
            }
            $key .= '_';
        }
    }

  // Add the capture server if enabled
    $capture_prefix = GetSetting('cp_capture_prefix');
    if ($capture_prefix) {
        $key = $capture_prefix . 'c' . $key;
    }

  // Add the location ID if we are using one
    if (isset($locationID) && strlen($key)) {
        $locationID = preg_replace('/[^a-zA-Z0-9]/', '', $locationID);
        if (strlen($locationID)) {
            $key = $locationID . 'x' . $key;
        }
    }

  // add the server ID if we are using one
    if (strlen($key)) {
        $server = GetSetting('serverID');
        if (isset($server)) {
            $server = preg_replace('/[^a-zA-Z0-9]/', '', $server);
            if (strlen($server)) {
                $key = $server . 'i' . $key;
            }
        }
    }

    return $key;
}

/**
* Send a request with a really short timeout to fire an async-processing task
*
* @param mixed $relative_url
*/
function SendAsyncRequest($relative_url)
{
    $protocol = getUrlProtocol();
    $url = "$protocol://{$_SERVER['HTTP_HOST']}$relative_url";
    $local = GetSetting('local_server');
    if ($local) {
        $url = "$local$relative_url";
    }
    if (function_exists('curl_init')) {
        $c = curl_init();
        curl_setopt($c, CURLOPT_URL, $url);
        curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($c, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($c, CURLOPT_CONNECTTIMEOUT, 1);
        curl_setopt($c, CURLOPT_TIMEOUT, 1);
        curl_exec($c);
        curl_close($c);
    } else {
        $context = stream_context_create(array('http' => array('header' => 'Connection: close', 'timeout' => 1)));
        file_get_contents($url, false, $context);
    }
}

/**
* Create a log line string from an array of data
*
* @param array $line_data The data to turn into a log line
*/
function makeLogLine($line_data)
{
    foreach ($line_data as $key => $value) {
        if (strpos($value, "\t") !== false) {
            $line_data[$key] = str_replace("\t", '', $value);
        }
    }
    $log = $line_data['date'] . "\t" . $line_data['ip'] . "\t0" . "\t0";
    $log .= "\t" . $line_data['guid'] . "\t" . $line_data['url'] . "\t" . $line_data['location'] . "\t" . $line_data['private'];
    $log .= "\t" . $line_data['testUID'] . "\t" . $line_data['testUser'] . "\t" . $line_data['video'] . "\t" . $line_data['label'];
    $log .= "\t" . $line_data['owner'] . "\t" . $line_data['key'] . "\t" . $line_data['count'] . "\t" . $line_data['priority'];
    $log .= "\t" . $line_data['email'] . "\t" . $line_data['redis'] . "\r\n";

    return $log;
}

/**
* Take a test log line and tokenize it
*
* @param string $line The log line
*/
function tokenizeLogLine($line)
{
    $parseLine = str_replace("\t", "\t ", $line);
    $token = strtok($parseLine, "\t");
    $column = 0;
    $line_data = array();

    while ($token) {
        $column++;
        $token = trim($token);
        if (strlen($token) > 0) {
            switch ($column) {
                case 1:
                    $line_data['date'] = strtotime($token);
                    break;
                case 2:
                    $line_data['ip'] = $token;
                    break;
                case 5:
                    $line_data['guid'] = $token;
                    break;
                case 6:
                    $line_data['url'] = $token;
                    break;
                case 7:
                    $line_data['location'] = $token;
                    break;
                case 8:
                    $line_data['private'] = ($token == '1' );
                    break;
                case 9:
                    $line_data['testUID'] = $token;
                    break;
                case 10:
                    $line_data['testUser'] = $token;
                    break;
                case 11:
                    $line_data['video'] = ($token == '1');
                    break;
                case 12:
                    $line_data['label'] = $token;
                    break;
                case 13:
                    $line_data['o'] = $token;
                    break;
                case 14:
                    $line_data['key'] = $token;
                    break;
                case 15:
                    $line_data['count'] = $token;
                    break;
                case 16:
                    $line_data['priority'] = $token;
                    break;
                case 17:
                    $line_data['email'] = $token;
                    break;
            }
        }

        // on to the next token
        $token = strtok("\t");
    }

    return $line_data;
}

/**
* Update label for a test in a SQLite DB.
*
* @param string $test_guid  The ID of the test to update
* @param string $label      The new label
* @param string $test_uid   The test UID
* @param string $cur_user   The current user
* @param string $test_owner The user who created the test
*/
function updateLabel($test_guid, $label, $test_uid, $cur_user, $test_owner)
{
    if (!class_exists("SQLite3")) {
        return "SQLite3 must be installed to update test labels";
    }

    // Connect to the SQLite DB, and make sure that the table exists
    $db = new SQLite3('./dat/labels.db');
    $result = $db->query("CREATE TABLE IF NOT EXISTS labels (test_id STRING, label STRING, user_updated STRING);");

    $result = $db->query('INSERT OR IGNORE INTO labels (test_id, label, user_updated)
        VALUES ("' . $db->escapeString($test_guid) . '", "' . $db->escapeString($label) . '", "' . $db->escapeString($cur_user) . '")');

    $result = $db->query('UPDATE labels SET label="' . $db->escapeString($label) . '"
                            WHERE test_id="' . $db->escapeString($test_guid) . '"
                            AND user_updated="' . $db->escapeString($cur_user) . '"');

    return $result !== false;
}


/**
* Get an updated test label
*
* @param string $test_guid    The ID of the test to get the label for
* @param string $current_user The current user trying to fetch the label
*/
function getLabel($test_guid, $current_user)
{
    if (!class_exists("SQLite3")) {
        return false;
    }

    $db = new SQLite3('./dat/labels.db');
    $result = @$db->query('SELECT label FROM labels
                            WHERE test_id = "' . $db->escapeString($test_guid) . '"
                            AND user_updated="' . $db->escapeString($current_user) . '"');

    if ($result) {
        $result = $result->fetchArray();
    }

    if (!empty($result)) {
        return $result['label'];
    } else {
        return false;
    }
}

/**
*   Generate a unique ID
*/
function uniqueId(&$test_num)
{
    $id = null;
    $test_num = 0;

    if (!is_dir('./work/jobs')) {
        mkdir('./work/jobs', 0777, true);
    }

    // try locking the context file
    $filename = './work/jobs/uniqueId.dat';
    $lock = Lock("Unique ID");
    if ($lock) {
        $num = 0;
        $day = (int)date('z');
        $testData = array('day' => $day, 'num' => 0);
        $newData = json_decode(file_get_contents($filename), true);
        if (
            isset($newData) && is_array($newData) &&
            array_key_exists('day', $newData) &&
            array_key_exists('num', $newData) &&
            $newData['day'] == $day
        ) {
            $testData['num'] = $newData['num'];
        }
        $testData['num']++;
        $test_num = $testData['num'];
        $id = NumToString($testData['num']);
        file_put_contents($filename, json_encode($testData));
        Unlock($lock);
    }

    if (!isset($id)) {
        $test_num = rand();
        $id = md5(uniqid($test_num, true));
    }

    return $id;
}

/**
* Convert a number to a base-32 string
*
* @param mixed $num
*/
function NumToString($num)
{
    if ($num > 0) {
        $str = '';
        $digits = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
        while ($num > 0) {
            $digitValue = $num % 32;
            $num = (int)($num / 32);
            $str .= $digits[$digitValue];
        }
        $str = strrev($str);
    } else {
        $str = '0';
    }
    return $str;
}

/**
* Load the testinfo for the given test (can be ID or path)
*
* @param mixed $testPath
*/
function GetTestInfo($testIdOrPath)
{
    $testInfo = false;
    $id = null;

    if (isset($testIdOrPath) && strlen($testIdOrPath)) {
        $testPath = $testIdOrPath;
        if (strpos($testPath, '/') === false) {
            $id = $testPath;
            $testPath = '';
            if (ValidateTestId($id)) {
                $testPath = './' . GetTestPath($id);
            }
        }

      // TODO(pmeenan): cache the test info to prevent multiple disk
      // reads (need to deal with read-write-read sequences though)
        if (gz_is_file("$testPath/testinfo.json")) {
            $testPath = realpath($testPath);
            $lock = Lock("Test Info $testPath");
            if ($lock) {
                $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                Unlock($lock);
            }
        }
    }

  // Try getting the test info directly from a remote server if it is not owned by the current server
    if (!isset($testInfo) || !is_array($testInfo)) {
        if (isset($id) && ValidateTestId($id)) {
            $testServer = GetServerForTest($id);
            if (isset($testServer)) {
                $secret = GetServerSecret();
                if (isset($secret)) {
                    $response = http_fetch("{$testServer}testInfo.php?test=$id&s=$secret");
                    if ($response) {
                        $testInfo = json_decode($response, true);
                    }
                }
            }
        }
    }

    if (!isset($testInfo) || !is_array($testInfo)) {
        $testInfo = false;
    }

    return $testInfo;
}

// Extract the non-private test information for returning back to the caller
function PopulateTestInfo(&$test)
{
    $ret = array();
    $copy = function ($key) use ($test, &$ret) {
        if (isset($test[$key])) {
            $ret[$key] = $test[$key];
        }
    };
    $keys = array(
        'addCmdLine',
        'benchmark',
        'block',
        'bodies',
        'browser',
        'bwIn',
        'bwOut',
        'connectivity',
        'extensions',
        'extensionName',
        'fvonly',
        'ignoreSSL',
        'iq',
        'keepua',
        'label',
        'latency',
        'location',
        'mobile',
        'netlog',
        'noscript',
        'plr',
        'pngss',
        'priority',
        'runs',
        'standards',
        'tcpdump',
        'timeline',
        'trace',
        'url',
        'video',
        'web10',
    );
    foreach ($keys as $key) {
        $copy($key);
    }
    $ret['scripted'] = isset($test['script']) && strlen($test['script']) ? 1 : 0;
    return $ret;
}

function SaveTestInfo($testIdOrPath, &$testInfo)
{
    if (
        isset($testInfo) && is_array($testInfo) &&
        isset($testIdOrPath) && strlen($testIdOrPath)
    ) {
        $testPath = $testIdOrPath;
        if (strpos($testPath, '/') === false) {
            $id = $testPath;
            $testPath = '';
            if (ValidateTestId($id)) {
                $testPath = './' . GetTestPath($id);
            }
        }
        if (is_dir($testPath)) {
            $testPath = realpath($testPath);
            $lock = Lock("Test Info $testPath");
            if ($lock) {
                gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
                Unlock($lock);
            }
        }
    }
}

function CopyArrayEntry(&$src, &$dest, $srcEntry, $destEntry = null)
{
    if (!isset($destEntry)) {
        $destEntry = $srcEntry;
    }
    if (array_key_exists($srcEntry, $src)) {
        $dest[$destEntry] = $src[$srcEntry];
    }
}

function logTestMsg($testIdOrPath, $message)
{
    if (!GetSetting('disable_test_log') && isset($testIdOrPath) && strlen($testIdOrPath) && strlen($message)) {
        $testPath = $testIdOrPath;
        if (strpos($testPath, '/') === false) {
            $id = $testPath;
            $testPath = '';
            if (ValidateTestId($id)) {
                $testPath = './' . GetTestPath($id);
            }
        }
        if (is_dir($testPath)) {
            logMsg($message, "$testPath/test.log", true);
        }
    }
}

/**
 * Compute the median of an array of values.  If there are an even number
 * of values, returns the lower of the two middle values for consistency with
 * GetMedianRun in page_data.inc.
 *
 * @param object[] $values Array of values for median computation.
 *
 * @return object


 */
function median($values)
{
    if (!count($values)) {
        return null;
    }
    $medianIndex = (int)floor((float)(count($values) - 1.0) / 2.0);
    sort($values, SORT_NUMERIC);
    return $values[$medianIndex];
}

/**
 * Computes the number of runs, not including discarded runs.
 *
 * @param mixed $testInfo Object as returned by GetTestInfo
 *
 * @return int Number of runs, not including discarded runs.
 */
function numRunsFromTestInfo($testInfo)
{
    if (!$testInfo) {
        return 0;
    }
    $runs = $testInfo['runs'];
    if (array_key_exists('discard', $testInfo)) {
        $runs -= $testInfo['discard'];
    }
    return $runs;
}

function ZipExtract($zipFile, $path)
{
    if (is_file($zipFile) && is_dir($path)) {
        $zipFile = realpath($zipFile);
        $extractPath = realpath($path);
        $zip = new ZipArchive();
        if ($zip->open($zipFile) === true) {
            $zip->extractTo($extractPath);
            $zip->close();
        } else {
            $command = "unzip \"$zipFile\" -d \"$extractPath\"";
            exec($command, $output, $result);
        }
    }
}

function html2rgb($color)
{
    if ($color[0] == '#') {
        $color = substr($color, 1);
    }

    if (strlen($color) == 6) {
        list($r, $g, $b) = array($color[0] . $color[1],
                             $color[2] . $color[3],
                             $color[4] . $color[5]);
    } elseif (strlen($color) == 3) {
        list($r, $g, $b) = array($color[0] . $color[0], $color[1] . $color[1], $color[2] . $color[2]);
    } else {
        return false;
    }

    $r = hexdec($r);
    $g = hexdec($g);
    $b = hexdec($b);

    return array($r, $g, $b);
}

function WaitForSystemLoad($max_load, $timeout)
{
    $wait = false;
    $started = time();
    if (function_exists('sys_getloadavg')) {
        do {
            $wait = false;
            $load = sys_getloadavg();
            if ($load[0] > $max_load) {
                $now = time();
                if ($now - $started < $timeout) {
                    $wait = true;
                    sleep(rand(1, 30));
                }
            }
        } while ($wait);
    }
}

/**
 * Translate an error code into the text description
 * @param int $error The error code
 * @return string The error description
 */
function LookupError($error)
{
    $errorText = $error;

    switch ($error) {
        case 7:
            $errorText = "Invalid SSL Cert.";
            break;
        case 99996:
            $errorText = "Timed Out waiting for DOM element";
            break;
        case 99997:
            $errorText = "Timed Out";
            break;
        case 99998:
            $errorText = "Timed Out";
            break;
        case 88888:
            $errorText = "Script Error";
            break;
        case 12999:
            $errorText = "Navigation Error";
            break;
        case -2146697211:
            $errorText = "Failed to Connect";
            break;
    }

    return $errorText;
}

/**
* See if the system is running over the configured max load setting.
* This allows for bailing out of some optional CPU-intensive operations.
*
*/
function OverSystemLoad()
{
    $over = false;
    $max_load = GetSetting('render_max_load');
    if ($max_load !== false && $max_load > 0 && function_exists('sys_getloadavg')) {
        $load = sys_getloadavg();
        if ($load[0] > $max_load) {
            $over = true;
        }
    }

    return $over;
}

/**
* Make sure everything is in utf-8 format
*
* @param mixed $mixed
*/
function MakeUTF8($mixed)
{
    if (is_array($mixed)) {
        foreach ($mixed as $key => $value) {
            $mixed[$key] = MakeUTF8($value);
        }
    } elseif (is_string($mixed)) {
        $encoding = mb_detect_encoding($mixed, mb_detect_order(), true);
        if ($encoding == false) {
            return '';
        }
        if ($encoding != 'UTF-8') {
            return mb_convert_encoding($mixed, 'UTF-8', $encoding);
        }
    }
    return $mixed;
}

/**
 * Checks if the fileName contains invalid characters or has an invalid extension
 * @param $fileName string The filename to check
 * @return bool true if accepted for an upload, false otherwise
 */
function validateUploadFileName($fileName)
{
    if (
        strpos($fileName, '..') !== false ||
        strpos($fileName, '/') !== false ||
        strpos($fileName, '\\') !== false
    ) {
        return false;
    }
    $parts = pathinfo($fileName);
    $ext = strtolower($parts['extension']);
  // TODO: shouldn't this be a whitelist?
    return !in_array($ext, array('php', 'pl', 'py', 'cgi', 'asp', 'js', 'rb', 'htaccess', 'jar'));
}

function SendCallback($testInfo)
{
    if (isset($testInfo) && isset($testInfo['callback']) && strlen($testInfo['callback'])) {
        $send_callback = true;
        $testId = $testInfo['id'];
        if (array_key_exists('batch_id', $testInfo) && strlen($testInfo['batch_id'])) {
            require_once('testStatus.inc');
            $testId = $testInfo['batch_id'];
            $status = GetTestStatus($testId);
            $send_callback = false;
            if (array_key_exists('statusCode', $status) && $status['statusCode'] == 200) {
                $send_callback = true;
            }
        }
        if ($send_callback) {
            $url = $testInfo['callback'];
            if (strncasecmp($url, 'http', 4)) {
                $url = "http://" . $url;
            }
            if (strpos($url, '?') == false) {
                $url .= '?';
            } else {
                $url .= '&';
            }
            $url .= "id=$testId";
            if (function_exists('curl_init')) {
                $c = curl_init();
                curl_setopt($c, CURLOPT_URL, $url);
                curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($c, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($c, CURLOPT_CONNECTTIMEOUT, 10);
                curl_setopt($c, CURLOPT_TIMEOUT, 10);
                curl_exec($c);
                curl_close($c);
            } else {
                $context = stream_context_create(array('http' => array('header' => 'Connection: close', 'timeout' => 10)));
                file_get_contents($url, false, $context);
            }
        }
    }
}

function GetSortableString($num, $targetLen = 6)
{
    $str = '';
    if ($num > 0) {
        $digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        $len = strlen($digits);
        while ($num > 0) {
            $digitValue = $num % $len;
            $num = (int)($num / $len);
            $str .= $digits[$digitValue];
        }
        $str = strrev($str);
    }
    $str = str_pad($str, $targetLen, '0', STR_PAD_LEFT);
    return $str;
}

// Proxy the current GET request to the given destination
// requires CURL
$PROXY_REQUEST_HOST = null;
$PROXY_CURRENT_HOST = null;
function proxy_request($proxy_host)
{
    global $PROXY_REQUEST_HOST, $PROXY_CURRENT_HOST;
    $PROXY_REQUEST_HOST = $proxy_host;
    $PROXY_CURRENT_HOST  = $_SERVER['HTTP_HOST'];
    $protocol = getUrlProtocol();
    $url = $protocol . '://' . $proxy_host . $_SERVER['REQUEST_URI'];

  // Initialize curl
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);

  // populate the request headers
    $headers = array();
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    } else {
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
    }
    $request_headers = array();
    foreach ($headers as $name => $value) {
        if (
            strcasecmp($name, "host") !== 0 &&
            strcasecmp($name, "accept-encoding") !== 0 &&
            strlen($value)
        ) {
            $request_headers[] = "$name: $value";
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $request_headers);

  // Handle response headers as they come in
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($curl, $header) {
        global $PROXY_REQUEST_HOST, $PROXY_CURRENT_HOST;
        header(str_replace($PROXY_REQUEST_HOST, $PROXY_CURRENT_HOST, $header));
        return strlen($header);
    });

  // stream the response
    curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($curl, $body) {
        echo $body;
        return strlen($body);
    });

    $response = curl_exec($ch);
    curl_close($ch);
}

// Sync the server status with others in the cluster
function server_sync($apiKey, $runCount, $logline)
{
    $servers_str = GetSetting("sync-servers");
    $secret = GetSetting("sync-secret");
    if (is_string($servers_str) && is_string($secret) && strlen($secret)) {
        $servers = explode(',', $servers_str);
        $data = array('secret' => $secret);
        $ok = false;
        if (isset($apiKey) && $runCount) {
            $data['key'] = $apiKey;
            $data['runs'] = $runCount;
            $ok = true;
        }
        if (isset($logline) && strlen($logline)) {
            $data['history'] = $logline;
            $ok = true;
        }
        $options = array(
        'http' => array(
          'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
          'method'  => 'POST',
          'timeout' => 5,
          'content' => http_build_query($data)
        )
        );
        if ($ok) {
            $host = GetSetting('hostname');
            foreach ($servers as $url) {
                $sync_host = parse_url($url, PHP_URL_HOST);
                if ($sync_host != $host) {
                    $context  = stream_context_create($options);
                    file_get_contents($url, false, $context);
                }
            }
        }
    }
}


function GetServerKey()
{
  // cache the status in apc for 15 seconds so we don't hammer the scheduler
    $key = CacheFetch('server-key');
    if (isset($key) && !is_string($key)) {
        $key = null;
    }
    if (!isset($key)) {
        $keys_file = SETTINGS_PATH . '/keys.ini';
        if (file_exists(SETTINGS_PATH . '/common/keys.ini')) {
            $keys_file = SETTINGS_PATH . '/common/keys.ini';
        }
        if (file_exists(SETTINGS_PATH . '/server/keys.ini')) {
            $keys_file = SETTINGS_PATH . '/server/keys.ini';
        }
        $keys = parse_ini_file($keys_file, true);
        if (isset($keys) && isset($keys['server']['key'])) {
            $key = trim($keys['server']['key']);
        }

        $ttl = 3600;
        if (!isset($key)) {
            $key = '';
            $ttl = 60;
        }
        CacheStore('server-key', $key, $ttl);
    }
    return $key;
}


function SignString($string)
{
    return sha1($string . GetServerSecret());
}

function GetSamlAttribute($index)
{
    $saml_cookie = GetSetting('saml_cookie', 'samlu');
    if (isset($_REQUEST['samlu'])) {
        $_COOKIE[$saml_cookie] = $_REQUEST['samlu'];
    }
    if (isset($_COOKIE[$saml_cookie])) {
        $parts = explode('.', $_COOKIE[$saml_cookie]);
        if (count($parts) == 2) {
            if ($parts[1] == SignString($parts[0])) {
                $info = base64_decode($parts[0]);
                $attributes = explode("\t", $info);
                if (count($attributes) > $index) {
                    return $attributes[$index];
                }
            }
        }
    }
    return null;
}

function GetSamlAccount()
{
    $ret = GetSamlAttribute(0);
    if (isset($ret)) {
        $ret = intval($ret);
    }
    return $ret;
}

function GetSamlEmail()
{
    return GetSamlAttribute(1);
}

function GetSamlFirstName()
{
    return GetSamlAttribute(2);
}

function GetSamlLastName()
{
    return GetSamlAttribute(3);
}

function GetSamlContact()
{
    $ret = GetSamlAttribute(4);
    if (isset($ret)) {
        $ret = intval($ret);
    }
    return $ret;
}

/**
* Send a quick http request locally if we need to process cron events (to each of the cron entry points)
*
* This only runs events on 5-minute intervals and tries to keep it close to the clock increments (00, 15, 30, 45)
*
*/
function CheckCron()
{
  // open and lock the cron job file - abandon quickly if we can't get a lock
    $should_run = false;
    $minutes15 = false;
    $minutes60 = false;
    $cron_lock = Lock("Cron Check", false, 1200);
    if (isset($cron_lock)) {
        $last_run = 0;
        if (is_file('./tmp/wpt_cron.dat')) {
            $last_run = file_get_contents('./tmp/wpt_cron.dat');
        }
        $now = time();
        $elapsed = $now - $last_run;
        if (!$last_run) {
            $should_run = true;
            $minutes15 = true;
            $minutes60 = true;
        } elseif ($elapsed > 120) {
            if ($elapsed > 1200) {
              // if it has been over 20 minutes, run regardless of the wall-clock time
                $should_run = true;
            } else {
                $minute = gmdate('i', $now) % 5;
                if ($minute < 2) {
                    $should_run = true;
                    $minute = gmdate('i', $now) % 15;
                    if ($minute < 2) {
                        $minutes15 = true;
                    }
                    $minute = gmdate('i', $now) % 60;
                    if ($minute < 2) {
                        $minutes60 = true;
                    }
                }
            }
        }
        if ($should_run) {
            file_put_contents('./tmp/wpt_cron.dat', $now);
        }
        Unlock($cron_lock);
    }

  // send the cron requests
    if ($should_run) {
        SendAsyncRequest('/cron/5min.php');
        if ($minutes15) {
            SendAsyncRequest('/cron/15min.php');
        }
        if ($minutes60) {
            SendAsyncRequest('/cron/hourly.php');
        }
    }
}

function GetServerForTest($id)
{
    $server_url = null;
    if (preg_match('/^\d\d\d\d\d\d_([^_i]+)i/', $id, $matches)) {
        $test_server = $matches[1];
        $current_server = GetSetting('serverID', null);
        if (isset($current_server) && $current_server != $test_server) {
            $server_url = GetSetting("server_$test_server");
        }
    }
    return $server_url;
}

// See if the test is beyond the archive retention period (if configured)
function TestArchiveExpired($id)
{
    $retain_months = GetSetting('archive_retention_months', null);
    if (isset($retain_months) && is_numeric($retain_months) && isset($id) && is_string($id)) {
        if (preg_match('/^(\d\d\d\d\d\d)/', $id, $matches)) {
            $test_date = date_create_from_format('ymd', $matches[1]);
            if ($test_date) {
                $now = date_create();
                if ($now) {
                    $retain_months = intval($retain_months);
                    $elapsed = $now->getTimestamp() - $test_date->getTimestamp();
                    if ($elapsed && $elapsed > $retain_months * 31 * 86400) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

/**
 * Generate a unique test ID
 */
function GenerateTestID($private = false, $locationShard = null)
{
    $test_num = null;
    $id = uniqueId($test_num);
    if ($private) {
        $id = ShardKey($test_num, $locationShard) . md5(uniqid(rand(), true));
    } else {
        $id = ShardKey($test_num, $locationShard) . $id;
    }
    $today = new DateTime("now", new DateTimeZone('UTC'));
    $testId = $today->format('ymd_') . $id;
    $path = WWW_PATH . '/' . GetTestPath($testId);

  // make absolutely CERTAIN that this test ID doesn't already exist
    while (is_dir($path)) {
        // fall back to random ID's
        $id = ShardKey($test_num, $locationShard) . md5(uniqid(rand(), true));
        $testId = $today->format('ymd_') . $id;
        $path = WWW_PATH . '/' . GetTestPath($testId);
    }

    return $testId;
}

/**
* Add a single entry to ini-style files
* @param mixed $ini
* @param mixed $key
* @param mixed $value
*/
function AddIniLine(&$ini, $key, $value)
{
    if (isset($value) && strpos($value, "\n") === false && strpos($value, "\r") === false) {
        $ini .= "$key=$value\r\n";
    }
}

/**
 * Geterate a testingo.ini and testinfo.json for an uploaded job file
 */
function ProcessUploadedTest($id)
{
    if (ValidateTestId($id)) {
        $testPath = WWW_PATH . '/' . GetTestPath($id);
        if (gz_is_file("$testPath/job.json")) {
            $job = json_decode(gz_file_get_contents("$testPath/job.json"), true);
            $test = $job;
            $test['id'] = $id;
            $test['Test ID'] = $id;
            $test['completed'] = time();
            if (!isset($test['started'])) {
                $test['started'] = $test['completed'];
            }
            if (isset($test['Capture Video']) && $test['Capture Video']) {
                $test['video'] = 1;
            }
            if ((isset($test['pngScreenShot']) && $test['pngScreenShot'])) {
                $test['pngss'] = 1;
            }
            if (isset($test['imageQuality']) && $test['imageQuality']) {
                $test['test'] = $test['imageQuality'];
            }
            if (isset($test['clearRV']) && $test['clearRV']) {
                $test['clear_rv'] = 1;
            }
            $test['published'] = 1;

          // Figure out the location text
            $locations = LoadLocationsIni();
            if (isset($test['location']) && isset($locations[$test['location']]['label'])) {
                $test['locationText'] = $locations[$test['location']]['label'];
            }

          // Generate a testinfo.ini
            $ini = "[test]\r\n";
            AddIniLine($ini, "fvonly", $test['fvonly']);
            AddIniLine($ini, "timeout", $test['timeout']);
            AddIniLine($ini, "runs", $test['runs']);
            AddIniLine($ini, "location", "\"{$test['locationText']}\"");
            AddIniLine($ini, "loc", $test['location']);
            AddIniLine($ini, "id", $test['id']);
            AddIniLine($ini, "sensitive", $test['sensitive']);
            if (isset($test['login']) && strlen($test['login'])) {
                AddIniLine($ini, "authenticated", "1");
            }
            AddIniLine($ini, "connections", $test['connections']);
            if (isset($test['script']) && strlen($test['script'])) {
                AddIniLine($ini, "script", "1");
            }
            AddIniLine($ini, "notify", $test['notify']);
            AddIniLine($ini, "video", "1");
            AddIniLine($ini, "disable_video", $test['disable_video']);
            AddIniLine($ini, "uid", $test['uid']);
            AddIniLine($ini, "owner", $test['owner']);
            AddIniLine($ini, "type", $test['type']);
            AddIniLine($ini, "connectivity", $test['connectivity']);
            AddIniLine($ini, "bwIn", $test['bwIn']);
            AddIniLine($ini, "bwOut", $test['bwOut']);
            AddIniLine($ini, "latency", $test['latency']);
            AddIniLine($ini, "plr", $test['plr']);
            AddIniLine($ini, "completeTime", gmdate("m/d/y G:i:s", $test['completed']));
            file_put_contents("$testPath/testinfo.ini", $ini);

          // Generate the testinfo.json
            gz_file_put_contents("$testPath/testinfo.json", json_encode($test));
        }
    }
}

function ReportSaaSTest($test_json, $node_id, $test_id)
{
  // Get the scheduler queue length (not separated by priorities)
    $scheduler = GetSetting('cp_scheduler');
    $scheduler_salt = GetSetting('cp_scheduler_salt');
    if ($scheduler && $scheduler_salt) {
        $host = str_replace('.', '', trim(GetSetting('host')));
        $cpid = GetCPID($host, $scheduler_salt);
        $loggers = CacheFetch('scheduler-loggers', null);
        if (!isset($loggers)) {
            $url = "{$scheduler}hawkscheduleserver/wpt-metadata.ashx?population=1";
            $result_text = cp_http_get($url, $cpid);
            if (isset($result_text) && strlen($result_text)) {
                $populations = json_decode($result_text, true);
                if (isset($populations) && is_array($populations)) {
                    $loggers = array();
                    if (isset($populations['Nodes']) && isset($populations['Populations'])) {
                        foreach ($populations['Nodes'] as $node) {
                            $nid = $node['Id'];
                            $pid = $node['Population'];
                            foreach ($populations['Populations'] as $pop) {
                                if ($pid == $pop['Id']) {
                                    $loggers[$nid] = $pop['Loggers'];
                                }
                            }
                        }
                    }
                    CacheStore('scheduler-loggers', $loggers, 600);
                }
            }
        }
        if (isset($loggers) && is_array($loggers) && isset($loggers[$node_id])) {
            foreach ($loggers[$node_id] as $url) {
                if (strncmp($url, 'http', 4)) {
                    $url = 'http://' . $url;
                }
                if ($test_id) {
                    $url .= "/hawklogserver/wpt.ashx?test=$test_id&node=$node_id";
                  // POST the JSON to the logger
                    $result = cp_http_post($url, $test_json, $cpid);
                    if (isset($result)) {
                        break;
                    }
                }
            }
        }
    }
}

if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle)
    {
        return $needle !== '' && mb_strpos($haystack, $needle) !== false;
    }
}
