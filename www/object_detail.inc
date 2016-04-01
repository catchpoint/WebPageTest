<?php
require_once('devtools.inc.php');
if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('LoadRequests');
    newrelic_add_custom_tracer('FixUpRequestTimes');
    newrelic_add_custom_tracer('AddLocationData');
    newrelic_add_custom_tracer('AddHeaders');
    newrelic_add_custom_tracer('AddResponseBodyFlags');
    newrelic_add_custom_tracer('BuildRequestDependencies');
}

/**
* Load the object data file.
*/
function getRequests($id, $test_path, $run, $is_cached,
                     &$has_secure_requests, &$has_locations,
                     $use_location_check, $use_raw_headers = false) {
    if (!isset($test_path) || !strlen($test_path))
        $test_path = './' . GetTestPath($id);
    $cached_text = ((bool)@$is_cached) ? '_Cached' : '';
    $file_prefix = $test_path . '/' . $run . $cached_text . '_';
    $request_file_name =  $file_prefix . 'IEWTR.txt';
    $headers_file_name = $file_prefix . 'report.txt';
    $bodies_file_name = $file_prefix . 'bodies.zip';
    $custom_rules_file_name = $file_prefix . 'custom_rules.json';

    $needHeaders = false;
    $requests = LoadRequests($request_file_name);
    if (isset($requests) && is_array($requests) && count($requests)) {
        if ($use_raw_headers)
            $needHeaders = true;

        AddResponseBodyFlags($requests, $bodies_file_name);

        // load any custom checks if they are available
        $custom_rules = array();
        if (gz_is_file($custom_rules_file_name))
            $custom_rules = json_decode(gz_file_get_contents($custom_rules_file_name), true);
    } else
        GetDevToolsRequests($test_path, $run, $is_cached, $requests, $pageData);
    FixUpRequestTimes($requests);
    if ($needHeaders)
        AddHeaders($requests, $headers_file_name);

    $has_locations = false;
    if ($use_location_check) {
        $has_locations = AddLocationData($requests);
    }

    $has_secure_requests = false;
    foreach ($requests as $index => &$request) {
        $request['index'] = $index;
        $request['number'] = $index + 1;
        if (isset($request['body_id']) && $request['body_id'] > 0) {
            $request['body_url'] = "/response_body.php?test=$id&run=$run&cached=$is_cached&bodyid={$request['body_id']}";
        } elseif (@$request['body']) {
            $request['body_url'] = "/response_body.php?test=$id&run=$run&cached=$is_cached&request={$request['number']}";
        }
        if ($request['is_secure'])
            $has_secure_requests = true;
        if (isset($custom_rules) && is_array($custom_rules) && array_key_exists($index + 1, $custom_rules))
            $request['custom_rules'] = $custom_rules[$index + 1];
    }
    
    // this is disabled for right now - there were indications that it was
    // spiking CPU to 100% on WPT so there may be a loop condition of some kind
    //BuildRequestDependencies($requests);
    
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
        67 => 'ssl_end',
        68 => 'initiator',
        69 => 'initiator_line',
        70 => 'initiator_column',
        71 => 'server_count',
        72 => 'server_rtt',
        73 => 'client_port',
        74 => 'jpeg_scan_count',
        75 => 'priority',
        76 => 'request_id',
        77 => 'was_pushed',
        78 => 'initiator_type',
        79 => 'initiator_function',
        80 => 'initiator_detail'
        );
    $request_lines = gz_file($request_file_name);
    if( isset($request_lines) && is_array($request_lines)) {
        foreach($request_lines as &$line) {
          if (strncmp($line, "Date\t", 4)) {
            $columns = explode("\t", str_replace("\t", "\t ", $line));
            if (count($columns)) {
                $request = array();
                foreach ($columns as $i => $value) {
                    if (array_key_exists($i + 1, $needed_columns) && strlen(trim($value)))
                        $request[$needed_columns[$i + 1]] = trim($value);
                }
                if (array_key_exists('host', $request) && array_key_exists('url', $request)) {
                    $url = 'http://';
                    if (array_key_exists('is_secure', $request) && $request['is_secure'])
                        $url = 'https://';
                    $url .= $request['host'] . $request['url'];
                    $request['full_url'] = $url;
                }
                if (array_key_exists('jpeg_scan_count', $request)) {
                  if ($request['jpeg_scan_count'] > 1)
                    $request['score_progressive_jpeg'] = 100;
                  elseif ($request['jpeg_scan_count'] == 1) {
                    if (array_key_exists('image_total', $request) &&
                        $request['image_total'] <= 10240)
                      $request['score_progressive_jpeg'] = 50;
                    else
                      $request['score_progressive_jpeg'] = 0;
                  } else
                    $request['score_progressive_jpeg'] = -1;
                }
                $requests[] = $request;
            }
          }
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
      if (is_file('./lib/maxmind/GeoLiteCity.dat')) {
        require_once('./lib/maxmind/GeoIP.php');
        $geo_ip = Net_GeoIP::getInstance(
            './lib/maxmind/GeoLiteCity.dat', Net_GeoIP::MEMORY_CACHE);
      }
    } catch(Exception $e) { }

    if (isset($geo_ip)) {
        foreach($requests as &$request) {
            if (array_key_exists('cdn_provider', $request) && 
                strlen($request['cdn_provider'])) {
                $request['location'] = $request['cdn_provider'];
            } elseif (array_key_exists('cdn_score', $request) && 
                      $request['cdn_score'] == 100) {
                $request['location'] = 'CDN';
            } elseif ($request['ip_addr']) {
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
  if (isset($requests) && is_array($requests)) {
    $dns_ms = null;
    $connect_ms = null;
    foreach($requests as $i => &$request) {
      if (isset($request['type'])) {
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
            $start = $end = $ms = 0;
            // Create local variables for start, end, and duration of this
            // request.  These values will be copied back into $req at the
            // end of the foreach loop.
            if (array_key_exists($key . '_start', $req))
              $start = $req[$key . '_start'];
            if (array_key_exists($key . '_end', $req))
              $end = $req[$key . '_end'];
            if (array_key_exists($key . '_ms', $req))
              $ms = $req[$key . '_ms'];
            if ($end > 0 && $start > 0 && $end >= $start)
                $ms = max(0, $end - $start);
            if ($ms > 0) {
                if ($start == 0) {
                    // Compute start for old-style timing.
                    $start = $all_start - $ms;
                    $end = $start + $ms;
                }
                $all_start = $start;
                $all_ms += $ms;
            }
            $req[$key . '_start'] = $start;
            $req[$key . '_end'] = $end;
            $req[$key . '_ms'] = $ms;
        }
        $req['load_end'] = $req['load_start'] + $req['load_ms'];

        // iOS agents do not have any way to get the time to first byte,
        // so it may be unset.  In that case, treat the entire time from
        // load_start to load_end as download time.
        // TODO(skerner): Once we figure out how to get TTFB on iOS, remove
        // this logic.
        $ttfb_ms = isset($req['ttfb_ms']) ? $req['ttfb_ms'] : 0;

        $req['ttfb_start'] = $req['load_start'];
        $req['ttfb_end'] = $req['ttfb_start'] + $req['ttfb_ms'];

        // The download state starts when TTFB ends, and stops when loading
        // is done.
        $req['download_start'] = $req['load_start'] + $ttfb_ms;
        $req['download_end'] = $req['load_end'];
        $req['download_ms'] = $req['download_end'] - $req['download_start'];

        $req['all_start'] = $all_start;
        $req['all_end'] = $req['load_end'];
        $req['all_ms'] = $all_ms;
    }
}

/**
* Helper for AddHeaders to initialize variables.
*/
function _AddHeadersInit(&$id, &$index, &$headers, &$headers_key) {
    $index = null;
    $id = null;
    $headers = array('request' => array(), 'response' => array());
    $headers_key = null;
}

/**
* Helper for AddHeaders to save headers.
*/
function _AddHeadersSave(&$requests, $index, $id, $headers) {
  if (isset($id) && $id > 0) {
    // use the request ID to find the real index of the request
    foreach ($requests as $i => $request) {
      if (isset($request['request_id']) && $request['request_id'] == $id) {
        $index = $i;
        break;
      }
    }
  }
  if (isset($index)) {
    if ((count($headers['request']) || count($headers['response'])) &&
      array_key_exists($index, $requests)) {
      $requests[$index]['headers'] = $headers;
    }
  }
}

/**
* Load the raw headers if we have them.
*/
function AddHeaders(&$requests, $headers_file_name) {
    $header_lines = gz_file($headers_file_name);
    if ($header_lines) {
        $is_started = false;
        _AddHeadersInit($index, $id, $headers, $headers_key);
        foreach ($header_lines as &$line) {
            $trimmed = trim($line);
            if (!$is_started) {
                $is_started = ($trimmed == 'Request details:');
            } else {
                if ($trimmed == 'Request Headers:' && isset($index)) {
                    $headers_key = 'request';
                } elseif ($trimmed == 'Response Headers:' && isset($index)) {
                    $headers_key = 'response';
                } elseif (!strncmp($line, 'RID:', 4)) {
                    $line_parts = explode(' ', $line);
                    $request_id = intval($line_parts[1]);
                    if ($request_id > 0)
                        $id = $request_id;
                } elseif (!strncmp($line, 'Request ', 8)) {
                    _AddHeadersSave($requests, $index, $id, $headers);
                    _AddHeadersInit($index, $id, $headers, $headers_key);

                    $line_parts = explode(' ', $line);
                    $request_num = intval($line_parts[1]);
                    if ($request_num > 0)
                        $index = $request_num - 1;
                } elseif (strlen($trimmed) && isset($headers_key)) {
                    $headers[$headers_key][] = $trimmed;
                }
            }
        }
        _AddHeadersSave($requests, $index, $id, $headers);
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
        $name = $zip->getNameIndex($i);
        $parts = explode('-', $name);
        if (count($parts) >= 3 && stripos($name, '-body.txt') !== false) {
          $id = intval($parts[1], 10);
          foreach ($requests as &$request) {
            if (isset($request['request_id']) && $request['request_id'] == $id) {
              $request['body_id'] = $id;
            }
          }
        } else {
          // old-style where the files are numbered in order of request
          $index = intval($name, 10);
          if ($index && array_key_exists($index - 1, $requests)) {
            $requests[$index - 1]['body'] = true;
          }
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
        if ($request['responseCode'] != 401 && ($request['responseCode'] < 300 || $request['responseCode'] >= 400)) {
            $basePage = $request;
            break;
        }
    }
    return $basePage;
}

/**
* Build the list of dependencies for each request
* 
* @param mixed $requests
*/
function BuildRequestDependencies(&$requests) {
    foreach($requests as &$request) {
        $request['loads'] = array();
        RequestLoads($request['number'], $requests, $request['loads']);
        $request['loaded_by'] = array();
        RequestLoadedBy($request['number'], $requests, $request['loaded_by']);
    }
    
    return $dependencies;
}

/**
* Figure out all of the resources loaded by the given resource
* 
* @param mixed $index
* @param mixed $requests
* @param mixed $map
* @param mixed $entry
*/
function RequestLoads($request_number, &$requests, &$entry) {
    $request = &$requests[$request_number - 1];
    if (array_key_exists('full_url', $request)) {
        $url = $request['full_url'];
        foreach ($requests as &$req) {
            if (array_key_exists('initiator', $req) && $req['initiator'] == $url) {
                $loads_request = $req['number'];
                $entry_exists = false;
                foreach($entry as $entry_request) {
                    if ($entry_request == $loads_request)
                        $entry_exists = true;
                }
                if (!$entry_exists) {
                    $entry[] = $loads_request;
                    RequestLoads($loads_request, $requests, $entry);
                }
            }
        }
    }
}

/**
* Figure out all of the resources required to load the given resource
* 
* @param mixed $index
* @param mixed $requests
* @param mixed $map
* @param mixed $entry
*/
function RequestLoadedBy($request_number, &$requests, &$entry) {
    $request = &$requests[$request_number - 1];
    if (array_key_exists('initiator', $request)) {
        $initiator = $request['initiator'];
        foreach ($requests as &$req) {
            if (array_key_exists('full_url', $req) && $req['full_url'] == $initiator) {
                $loaded_by = $req['number'];
                $entry_exists = false;
                foreach($entry as $entry_request) {
                    if ($entry_request == $loaded_by)
                        $entry_exists = true;
                }
                if (!$entry_exists) {
                    $entry[] = $loaded_by;
                    RequestLoadedBy($loaded_by, $requests, $entry);
                }
            }
        }
    }
}

?>
