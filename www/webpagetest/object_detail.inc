<?php
/**
* Load the object data file.
*/
function getRequests($id, $test_path, $run, $is_cached,
                     &$has_secure_requests, &$has_locations,
                     $use_location_check, $use_raw_headers = false) {
    $cached_text = ((bool)@$is_cached) ? '_Cached' : '';
    $file_prefix = $test_path . '/' . $run . $cached_text . '_';
    $request_file_name =  $file_prefix . 'IEWTR.txt';
    $headers_file_name = $file_prefix . 'report.txt';
    $bodies_file_name = $file_prefix . 'bodies.zip';

    $requests = LoadRequests($request_file_name);
    FixUpRequestTimes($requests);

    $has_locations = false;
    if ($use_location_check) {
        $has_locations = AddLocationData($requests);
    }

    if ($use_raw_headers) {
        AddHeaders($requests, $headers_file_name);
    }

    AddResponseBodyFlags($requests, $bodies_file_name);

    $has_secure_requests = false;
    foreach ($requests as $index => &$request) {
        if ($request['is_secure']) {
            $has_secure_requests = true;
        }
        $request['index'] = $index;
    }
    return $requests;
}

/**
* Compute where page load time is spent: downloading, requests, etc
*
* @param mixed $requests
*/
function CalculateComponentTimes(&$pageData, &$requests) {
    // Figure out the appropriate end time.
    $end = $pageData['load_ms'];
    $times = array(
        'dns' => 0.0, 'socket' => 0.0, 'ssl' => 0.0, 'request' => 0.0,
        'download' => 0.0, 'execution' => 0.0);

    // Loop through every millisecond calculating the component times.
    for ($i = 0; $i <= $end; $i++) {
        $total = 0;
        $dns = 0;
        $connect = 0;
        $ssl = 0;
        $load = 0;
        $download = 0;

        // See which requests were active during this millisecond.
        foreach ($requests as $req) {
            if ($i >= $req['all_start'] && $i <= $req['all_end']) {
                // Figure out what the request was doing.
                if ($req['download_start'] && $i >= $req['download_start'])
                    $download++;
                elseif ($req['load_start'] && $i >= $req['load_start'])
                    $request++;
                elseif ($req['ssl_start'] && $i >= $req['ssl_start'])
                    $load++;
                elseif ($req['connect_start'] && $i >= $req['connect_start'])
                    $connect++;
                elseif($i >= $req['dns_start'])
                    $dns++;
                $total++;
            }
        }
        if ($totalCount > 0) {
            if ($download) {
                // If anything is downloading the download gets the full share.
                $times['download']++;
            } else {
                // Otherwise, spread the time over the "wasted" time components.
                $times['dns'] += $dns / $total;
                $times['socket'] += $connect / $total;
                $times['ssl'] += $ssl / $total;
                $times['request'] += $load / $total;
            }
        } else {
            $times['execution']++;
        }
    }
    return $times;
}

/**
* Load the gzipped request file (tab deliminated).
*/
function LoadRequests($request_file_name) {
    $requests = array();
    $needed_columns = array(
        // tsv_column => request_key
        4 => 'ip_addr',
        5 => 'method',
        6 => 'host',
        7 => 'url',
        8 => 'responseCode',
        9 => 'load_ms',         # was loadTime
        10 => 'ttfb_ms',        # was ttfb
        11 => 'load_start',     # was offset
        12 => 'bytesOut',
        13 => 'bytesIn',
        14 => 'objectSize',
        17 => 'expires',
        18 => 'cacheControl',
        19 => 'contentType',
        20 => 'contentEncoding',
        21 => 'type',
        22 => 'socket',
        36 => 'score_cache',
        37 => 'score_cdn',
        38 => 'score_gzip',
        39 => 'score_cookies',
        40 => 'score_keep-alive',
        42 => 'score_minify',
        43 => 'score_combine',
        44 => 'score_compress',
        45 => 'score_etags',
        47 => 'is_secure',
        48 => 'dns_ms',        # was dnsTime
        49 => 'connect_ms',    # was socketTime
        50 => 'ssl_ms',        # was sslTime
        51 => 'gzip_total',
        52 => 'gzip_save',
        53 => 'minify_total',
        54 => 'minify_save',
        55 => 'image_total',
        56 => 'image_save',
        57 => 'cache_time',
        61 => 'cdn_provider',
        62 => 'dns_start',
        63 => 'dns_end',
        64 => 'connect_start',
        65 => 'connect_end',
        66 => 'ssl_start',
        67 => 'ssl_end'
        );
    $request_lines = gz_file($request_file_name);
    foreach($request_lines as $linenum => &$line) {
        $columns = explode("\t", str_replace("\t", "\t ", $line));
        if (count($columns)) {
            $request = array();
            foreach ($columns as $i => $value) {
                if (array_key_exists($i + 1, $needed_columns)) {
                    $request[$needed_columns[$i + 1]] = trim($value);
                }
            }
            $requests[] = $request;
        }
    }
    return $requests;
}

/**
* Map IP addresses to country, countryCode, city, region, lat, and long.
*/
function AddLocationData(&$requests) {
    $has_locations = false;
    $geo_ip = null;
    try {
        include('./Net/GeoIP.php');
        $geo_ip = Net_GeoIP::getInstance(
            './Net/GeoLiteCity.dat', Net_GeoIP::MEMORY_CACHE);
    } catch(Exception $e) { }

    if (isset($geo_ip)) {
        foreach($requests as &$request) {
            if ($request['ip_addr']) {
                try {
                    $location = $geo_ip->lookupLocation($request['ip_addr']);
                    if ($location) {
                        $has_locations = true;
                        $request['country'] = $location->countryName;
                        $request['countryCode'] = $location->countryCode3;
                        $request['city'] = $location->city;
                        $request['region'] = $location->region;
                        $request['lat'] = $location->latitude;
                        $request['long'] = $location->longitude;

                        $loc = '-';
                        if ($request['city']) {
                            if ($request['region'] &&
                                $request['countryCode'] == 'USA') {
                                $loc = $request['city'] . ', ' . $request['region'];
                            } elseif ($request['country']) {
                                $loc = $request['city'] . ', ' . $request['country'];
                            }
                        } elseif ($request['region']) {
                            if ($request['country']) {
                                $loc = $request['region'] . ', ' . $request['country'];
                            }
                        } elseif ($request['country']) {
                            $loc = $request['country'];
                        }
                        $request['location'] = $loc;
                    }
                } catch(Exception $e) {}
            }
        }
    }
    return $has_locations;
}

/**
* Convert old format for DNS/connection data.
*/
function MergeDnsAndConnectionTimes($requests) {
    $merged_requests = array();
    $dns_ms = null;
    $connect_ms = null;
    foreach($requests as $i => &$request) {
        $request_type = (int)$request['type'];
        if ($request_type == 1) {
            $dns_ms = $request['load_ms'];
        } elseif ($request_type == 2) {
            $connect_ms = $request['load_ms'];
        } elseif ($request_type == 3) {
            if (isset($connect_ms) && !$request['socket_ms']) {
                $request['connect_ms'] = $connect_ms;
            }
            if (isset($dns_ms) && !$request['dns_ms']) {
                $request['dns_ms'] = $dns_ms;
            }
            unset($dns_ms);
            unset($connect_ms);
            $merged_requests[] = $request;
        }
    }
    return $merged_requests;
}

/**
* Compute consistent request time fields.
*
* Field keys:
*   all      - Includes all activity (e.g. dns through download).
*              all_ms is the sum of all the parts rather than (end - start).
*   dns      - DNS look-up attributed to this request.
*   connect  - TCP connection handshake.
*   ssl      - SSL negotiation.
*   load     - Includes request start through download end.
*   ttfb     - Time to first (downloaded) byte.
*   download - Time to download all bytes.
*
* For each key, define the following fields:
*   _start - Milliseconds elapsed since test start.
*   _end   - Milliseconds elapsed since test start.
*   _ms    - (_end - _start)
*
*/
function FixUpRequestTimes(&$requests) {
    $requests = MergeDnsAndConnectionTimes($requests);
    foreach($requests as &$req) {
        $all_start = $req['load_start'];
        $all_ms = $req['load_ms'];

        foreach (array('ssl', 'connect', 'dns') as $key) {
            $start = &$req[$key . '_start'];
            $end = &$req[$key . '_end'];
            $ms = &$req[$key . '_ms'];
            if ($end > 0) {
                $ms = max(0, $end - $start + 1);
            }
            if ($ms > 0) {
                if ($start == 0) {
                    // Compute start for old-style timing.
                    $start = $all_start - $ms;
                    $end = $start + $ms - 1;
                }
                $all_start = $start;
                $all_ms += $ms;
            }
        }
        $req['load_end'] = $req['load_start'] + $req['load_ms'];
        if ($req['ttfb_ms']) {
            $req['ttfb_start'] = $req['load_start'];
            $req['ttfb_end'] = $req['ttfb_start'] + $req['ttfb_ms'];
            $req['download_start'] = $req['load_start'] + $req['ttfb_ms'];
            $req['download_end'] = $req['load_end'];
            $req['download_ms'] = $req['download_end'] - $req['download_start'];
        }
        $req['all_start'] = $all_start;
        $req['all_end'] = $req['load_end'];
        $req['all_ms'] = $all_ms;
    }
}

/**
* Helper for AddHeaders to initialize variables.
*/
function _AddHeadersInit(&$index, &$headers, &$headers_key) {
    $index = null;
    $headers = array('request' => array(), 'response' => array());
    $headers_key = null;
}

/**
* Helper for AddHeaders to save headers.
*/
function _AddHeadersSave(&$requests, &$index, &$headers) {
    if ((count($headers['request']) || count($headers['response'])) &&
        array_key_exists($index, $requests)) {
        $requests[$index]['headers'] = $headers;
    }
}

/**
* Load the raw headers if we have them.
*/
function AddHeaders(&$requests, $headers_file_name) {
    $header_lines = gz_file($headers_file_name);
    if ($header_lines) {
        $is_started = false;
        _AddHeadersInit($index, $headers, $headers_key);
        foreach ($header_lines as &$line) {
            $trimmed = trim($line);
            if (!$is_started) {
                $is_started = ($trimmed == 'Request details:');
            } else {
                if (!strncmp($line, 'Request ', 8)) {
                    _AddHeadersSave($requests, $index, $headers);
                    _AddHeadersInit($index, $headers, $headers_key);

                    $line_parts = explode(' ', $line);
                    $request_num = intval($line_parts[1]);
                    if ($request_num > 0) {
                        $index = $request_num - 1;
                    }
                } elseif ($trimmed == 'Request Headers:' && isset($index)) {
                    $headers_key = 'request';
                } elseif ($trimmed == 'Response Headers:' && isset($index)) {
                    $headers_key = 'response';
                } elseif (strlen($trimmed) && isset($headers_key)) {
                    $headers[$headers_key][] = $trimmed;
                }
            }
        }
        _AddHeadersSave($requests, $index, $headers);
    }
}

/*
*  Flag the requests that have a response body available.
*/
function AddResponseBodyFlags(&$requests, $bodies_file_name) {
    if (is_file($bodies_file_name)) {
        $zip = new ZipArchive;
        if ($zip->open($bodies_file_name) === TRUE) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $index = intval($zip->getNameIndex($i), 10);
                if ($index && array_key_exists($index - 1, $requests)) {
                    $requests[$index - 1]['body'] = true;
                }
            }
        }
    }
}

/**
* Get the request for the base page (first non-redirect)
*
* @param mixed $requests
*/
function GetBasePage(&$requests) {
    $basePage = null;
    foreach($requests as &$request) {
        if ($request['responseCode'] < 300 || $request['responseCode'] >= 400) {
            $basePage = $request;
            break;
        }
    }
    return $basePage;
}

?>
