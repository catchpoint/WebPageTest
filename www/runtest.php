<?php
    if(extension_loaded('newrelic')) {
        newrelic_add_custom_tracer('CheckUrl');
        newrelic_add_custom_tracer('CheckIp');
        newrelic_add_custom_tracer('WptHookValidateTest');
        newrelic_add_custom_tracer('GetRedirect');
        newrelic_add_custom_tracer('ReportAnalytics');
    }

    // deal with magic quotes being enabled
    if (get_magic_quotes_gpc()) {
        function DealWithMagicQuotes(&$arr) {
            foreach ($arr as $key => &$val) {
                if ($key == "GLOBALS") { continue; }
                if (is_array($val)) {
                    DealWithMagicQuotes($val);
                } else {
                    $val = stripslashes($val);
                }
            }
        }
        DealWithMagicQuotes($GLOBALS);
    }

    // see if we are loading the test settings from a profile
    if (isset($_REQUEST['profile']) && is_file(__DIR__ . '/settings/profiles.ini')) {
      $profiles = parse_ini_file(__DIR__ . '/settings/profiles.ini', true);
      if (isset($profiles) && is_array($profiles) && isset($profiles[$_REQUEST['profile']])) {
        foreach($profiles[$_REQUEST['profile']] as $key => $value) {
          if ($key !== 'label' && $key !== 'description') {
            $_REQUEST[$key] = $value;
            $_GET[$key] = $value;
          }
        }
      }
    }
    require_once('common.inc');
    require_once('./ec2/ec2.inc.php');
    set_time_limit(300);

    $redirect_cache = array();
    $error = NULL;
    $xml = false;
    $usingAPI = false;
    if( isset($req_f) && !strcasecmp($req_f, 'xml') )
        $xml = true;
    $json = false;
    if( isset($req_f) && !strcasecmp($req_f, 'json') )
        $json = true;
    $headless = false;
    if (array_key_exists('headless', $settings) && $settings['headless']) {
        $headless = true;
    }
    $is_bulk_test = false;

    // Load the location information
    $locations = LoadLocationsIni();
    // See if we need to load a subset of the locations
    if (!$privateInstall) {
      $filter = null;
      if (isset($_REQUEST['k']) && preg_match('/^(?P<prefix>[0-9A-Za-z]+)\.(?P<key>[0-9A-Za-z]+)$/', $_REQUEST['k'], $matches)) {
        $filter = $matches['prefix'];
        foreach ($locations as $name => $location) {
          if (isset($location['browser'])) {
            $ok = false;
            if (isset($location['allowKeys'])) {
              $keys = explode(',', $location['allowKeys']);
              foreach($keys as $k) {
                if ($k == $filter) {
                  $ok = true;
                  break;
                }
              }
            }
            if (!$ok)
              unset($locations[$name]);
          }
        }
      }
    }
    BuildLocations($locations);
    // Copy the lat/lng configurations to all of the child locations
    foreach($locations as $loc_name => $loc) {
      if (isset($loc['lat']) && isset($loc['lng']) && !isset($loc['browser'])) {
        foreach($loc as $key => $child_loc) {
          if (is_numeric($key) && isset($locations[$child_loc])) {
            $locations[$child_loc]['lat'] = $loc['lat'];
            $locations[$child_loc]['lng'] = $loc['lng'];
            $separator = strpos($child_loc, ':');
            if ($separator > 0) {
              $child_loc = substr($child_loc, 0, $separator);
              if (isset($locations[$child_loc])) {
                $locations[$child_loc]['lat'] = $loc['lat'];
                $locations[$child_loc]['lng'] = $loc['lng'];
              }
            }
          }
        }
      }
    }

    // See if we are running a relay test
    if( @strlen($req_rkey) )
        RelayTest();
    else
    {
        // See if we're re-running an existing test
        if( isset($test) )
            unset($test);
        if (array_key_exists('resubmit', $_POST)) {
          $test = GetTestInfo(trim($_POST['resubmit']));
          if ($test) {
            unset($test['completed']);
            unset($test['started']);
            unset($test['tester']);
            unset($test['batch']);
          } else {
            unset($test);
          }
        }

        // Pull in the test parameters
        if( !isset($test) )
        {
            $test = array();
            $test['url'] = trim($req_url);
            if (isset($req_domelement))
              $test['domElement'] = trim($req_domelement);
            if (isset($req_login))
              $test['login'] = trim($req_login);
            if (isset($req_password))
              $test['password'] = trim($req_password);
            if (isset($req_customHeaders))
              $test['customHeaders'] = trim($req_customHeaders);
            if (isset($_REQUEST['injectScript']) && strlen($_REQUEST['injectScript']))
              $test['injectScript'] = $_REQUEST['injectScript'];
            $test['runs'] = isset($req_runs) ? (int)$req_runs : 0;
            $test['fvonly'] = isset($req_fvonly) ? (int)$req_fvonly : 0;
            if (isset($_REQUEST['rv']))
              $test['fvonly'] = $_REQUEST['rv'] ? 0 : 1;
            $test['timeout'] = isset($req_timeout) ? (int)$req_timeout : 0;
            $maxTime = GetSetting('maxtime');
            if ($maxTime && $test['timeout'] > $maxTime)
              $test['timeout'] = (int)$maxTime;
            $run_time_limit = GetSetting('run_time_limit');
            if ($run_time_limit)
              $test['run_time_limit'] = (int)$run_time_limit;
            $test['connections'] = isset($req_connections) ? (int)$req_connections : 0;
            if (isset($req_private)) {
              $test['private'] = $req_private;
            } elseif (GetSetting('defaultPrivate')) {
              $test['private'] = 1;
            } else {
              $test['private'] = 0;
            }
            if (GetSetting('forcePrivate'))
              $test['private'] = 1;
            if (isset($req_web10))
              $test['web10'] = $req_web10;
            if (isset($req_ignoreSSL))
              $test['ignoreSSL'] = $req_ignoreSSL;
            if (isset($req_script))
              $test['script'] = trim($req_script);
            if (isset($req_block))
              $test['block'] = $req_block;
            $test['blockDomains'] = isset($req_blockDomains) ? $req_blockDomains : "";
            $blockDomains = GetSetting('blockDomains');
            if ($blockDomains && strlen($blockDomains)) {
              if (strlen($test['blockDomains']))
                $test['blockDomains'] .= ' ';
              $test['blockDomains'] .= $blockDomains;
            }
            if (isset($req_notify))
              $test['notify'] = trim($req_notify);
            if (isset($req_video))
              $test['video'] = $req_video;
            if (isset($_REQUEST['disable_video']) && $_REQUEST['disable_video']) {
              $test['disable_video'] = 1;
            } elseif (GetSetting('strict_video')) {
              if (!isset($test['video']) || !$test['video'])
                $test['disable_video'] = 1;
            }
            $test['keepvideo'] = isset($req_keepvideo) && $req_keepvideo ? 1 : 0;
            $test['continuousVideo'] = isset($req_continuousVideo) && $req_continuousVideo ? 1 : 0;
            $test['renderVideo'] = isset($req_renderVideo) && $req_renderVideo ? 1 : 0;
            if (isset($req_label))
              $test['label'] = preg_replace('/[^\w\d \-_\.]/', '', trim($req_label));
            $test['median_video'] = isset($req_mv) ? (int)$req_mv : 0;
            if (isset($req_addr))
              $test['ip'] = $req_addr;
            $test['priority'] = isset($req_priority) ? (int)$req_priority : 0;
            if( isset($req_bwIn) && !isset($req_bwDown) )
                $test['bwIn'] = (int)$req_bwIn;
            else
                $test['bwIn'] = (int)$req_bwDown;
            if( isset($req_bwOut) && !isset($req_bwUp) )
                $test['bwOut'] = (int)$req_bwOut;
            else
                $test['bwOut'] = isset($req_bwUp) ? (int)$req_bwUp : 0;
            $test['latency'] = isset($req_latency) ? (int)$req_latency : 0;
            $test['testLatency'] = isset($req_latency) ? (int)$req_latency : 0;
            $test['plr'] = isset($req_plr) ? trim($req_plr) : 0;
            $test['shaperLimit'] = isset($req_shaperLimit) ? (int)$req_shaperLimit : 0;
            if (isset($req_pingback))
              $test['callback'] = $req_pingback;
            if (!$json && !isset($req_pingback) && isset($req_callback))
              $test['callback'] = $req_callback;
            if(!isset($test['callback']) && GetSetting('ping_back_url'))
              $test['callback'] = GetSetting('ping_back_url');
            if (isset($req_agent))
              $test['agent'] = $req_agent;
            if (isset($req_tcpdump))
              $test['tcpdump'] = $req_tcpdump;
            if (isset($req_lighthouse))
              $test['lighthouse'] = $req_lighthouse;
            $test['lighthouseTrace'] = isset($_REQUEST['lighthouseTrace']) && $_REQUEST['lighthouseTrace'] ? 1 : 0;
            $test['lighthouseScreenshots'] = isset($_REQUEST['lighthouseScreenshots']) && $_REQUEST['lighthouseScreenshots'] ? 1 : 0;
            $test['lighthouseThrottle'] = isset($_REQUEST['lighthouseThrottle']) && $_REQUEST['lighthouseThrottle'] ? 1 : GetSetting('lighthouseThrottle', 0);
            if (isset($_REQUEST['lighthouseConfig']) && strlen($_REQUEST['lighthouseConfig']))
              $test['lighthouseConfig'] = $_REQUEST['lighthouseConfig'];
            $test['heroElementTimes'] = isset($_REQUEST['heroElementTimes']) && $_REQUEST['heroElementTimes'] ? 1 : GetSetting('heroElementTimes', 0);
            if (isset($req_timeline))
              $test['timeline'] = $req_timeline;
            if (isset($_REQUEST['timeline_fps']) && $_REQUEST['timeline_fps'])
              $test['timeline_fps'] = 1;
            if (isset($_REQUEST['discard_timeline']) && $_REQUEST['discard_timeline'])
              $test['discard_timeline'] = 1;
            $test['timelineStackDepth'] = array_key_exists('timelineStack', $_REQUEST) && $_REQUEST['timelineStack'] ? 5 : 0;
            if (isset($req_swrender))
              $test['swrender'] = $req_swrender;
            $test['v8rcs'] = isset($_REQUEST['v8rcs']) && $_REQUEST['v8rcs'] ? 1 : 0;
            $test['trace'] = array_key_exists('trace', $_REQUEST) && $_REQUEST['trace'] ? 1 : 0;
            if (isset($_REQUEST['trace']) &&
                strlen($_REQUEST['traceCategories']) &&
                strpos($test['traceCategories'], "\n") === false &&
                trim($test['traceCategories']) != "*") {
              $test['traceCategories'] = $_REQUEST['traceCategories'];
            }
            if (isset($req_standards))
              $test['standards'] = $req_standards;
            if (isset($req_netlog))
              $test['netlog'] = $req_netlog;
            if (isset($_REQUEST['coverage']))
              $test['coverage'] = $_REQUEST['coverage'];
            if (isset($req_spdy3))
              $test['spdy3'] = $req_spdy3;
            if (isset($req_noscript))
              $test['noscript'] = $req_noscript;
            if (isset($req_fullsizevideo))
              $test['fullsizevideo'] = $req_fullsizevideo;
            $test['thumbsize'] = isset($_REQUEST['thumbsize']) ? min(max(intval($_REQUEST['thumbsize']), 100), 2000) : GetSetting('thumbsize', null);
            if (isset($req_blockads))
              $test['blockads'] = $req_blockads;
            if (isset($req_sensitive))
              $test['sensitive'] = $req_sensitive;
            if (isset($req_type))
              $test['type'] = trim($req_type);
            if (isset($req_noopt))
              $test['noopt'] = trim($req_noopt);
            if (isset($req_noimages))
              $test['noimages'] = trim($req_noimages);
            if (isset($req_noheaders))
              $test['noheaders'] = trim($req_noheaders);
            if (isset($req_view))
              $test['view'] = trim($req_view);
            if (isset($req_discard))
              $test['discard'] = max(min((int)$req_discard, $test['runs'] - 1), 0);
            $test['queue_limit'] = 0;
            $test['pngss'] = isset($req_pngss) ? (int)$req_pngss : 0;
            $test['fps'] = isset($req_fps) ? (int)$req_fps : null;
            $test['iq'] = isset($req_iq) ? (int)$req_iq : 0;
            $test['bodies'] = array_key_exists('bodies', $_REQUEST) && $_REQUEST['bodies'] ? 1 : 0;
            if (!array_key_exists('bodies', $_REQUEST) && GetSetting('bodies'))
              $test['bodies'] = 1;
            if (isset($req_htmlbody))
              $test['htmlbody'] = $req_htmlbody;
            $test['time'] = isset($req_time) ? (int)$req_time : 0;
            $test['clear_rv'] = isset($req_clearRV) ? (int)$req_clearRV : 0;
            $test['keepua'] = 0;
            if (isset($req_benchmark))
              $test['benchmark'] = $req_benchmark;
            $test['max_retries'] = isset($req_retry) ? min((int)$req_retry, 10) : 0;
            if (array_key_exists('keepua', $_REQUEST) && $_REQUEST['keepua'])
                $test['keepua'] = 1;
            if (isset($req_pss_advanced))
              $test['pss_advanced'] = $req_pss_advanced;
            $test['shard_test'] = $settings['shard_tests'];
            if (array_key_exists('shard', $_REQUEST))
              $test['shard_test'] = $_REQUEST['shard'];
            $test['mobile'] = array_key_exists('mobile', $_REQUEST) && $_REQUEST['mobile'] ? 1 : 0;
            if (isset($_REQUEST['mobileDevice']))
              $test['mobileDevice'] = $_REQUEST['mobileDevice'];
            $test['dpr'] = isset($_REQUEST['dpr']) && $_REQUEST['dpr'] > 0 ? $_REQUEST['dpr'] : 0;
            $test['width'] = isset($_REQUEST['width']) && $_REQUEST['width'] > 0 ? $_REQUEST['width'] : 0;
            $test['height'] = isset($_REQUEST['height']) && $_REQUEST['height'] > 0 ? $_REQUEST['height'] : 0;
            $test['browser_width'] = isset($_REQUEST['browser_width']) && $_REQUEST['browser_width'] > 0 ? $_REQUEST['browser_width'] : 0;
            $test['browser_height'] = isset($_REQUEST['browser_height']) && $_REQUEST['browser_height'] > 0 ? $_REQUEST['browser_height'] : 0;
            $test['clearcerts'] = array_key_exists('clearcerts', $_REQUEST) && $_REQUEST['clearcerts'] ? 1 : 0;
            $test['orientation'] = array_key_exists('orientation', $_REQUEST) ? trim($_REQUEST['orientation']) : 'default';
            $test['responsive'] = array_key_exists('responsive', $_REQUEST) && $_REQUEST['responsive'] ? 1 : 0;
            $test['minimalResults'] = array_key_exists('minimal', $_REQUEST) && $_REQUEST['minimal'] ? 1 : 0;
            $test['debug'] = isset($_REQUEST['debug']) && $_REQUEST['debug'] ? 1 : 0;
            if (isset($_REQUEST['warmup']) && $_REQUEST['warmup'] > 0) {
              $test['warmup'] = min(intval($_REQUEST['warmup']), 3);
              $test['shard_test'] = 0;
            }
            if (isset($_REQUEST['medianMetric']))
              $test['medianMetric'] = $_REQUEST['medianMetric'];
            if (isset($_REQUEST['throttle_cpu']))
              $test['throttle_cpu'] = $_REQUEST['throttle_cpu'];
            if (isset($_REQUEST['bypass_cpu_normalization']))
              $test['bypass_cpu_normalization'] = $_REQUEST['bypass_cpu_normalization'] ? 1 : 0;

            if (array_key_exists('tsview_id', $_REQUEST)){
              $test['tsview_id'] = $_REQUEST['tsview_id'];

              $protocol = getUrlProtocol();
              $test['tsview_results_host'] = "{$protocol}://{$_SERVER['HTTP_HOST']}";

              // tsview_configs format: KEY>VALUE,KEY>VALUE,......
              if (array_key_exists('tsview_configs', $_REQUEST))
               $test['tsview_configs'] = $_REQUEST['tsview_configs'];
            }

            if (array_key_exists('affinity', $_REQUEST))
              $test['affinity'] = hexdec(substr(sha1($_REQUEST['affinity']), 0, 8));
            if (array_key_exists('tester', $_REQUEST) && preg_match('/[a-zA-Z0-9\-_]+/', $_REQUEST['tester']))
              $test['affinity'] = 'Tester' . $_REQUEST['tester'];

            // custom options
            $test['cmdLine'] = '';
            if (isset($req_cmdline)) {
              ValidateCommandLine($req_cmdline, $error);
              $test['addCmdLine'] = $req_cmdline;
            }
            if (isset($req_disableThreadedParser) && $req_disableThreadedParser) {
              if (strlen($test['addCmdLine']))
                $test['addCmdLine'] .= ' ';
              $test['addCmdLine'] .= '--disable-threaded-html-parser';
            }
            if (isset($req_spdyNoSSL) && $req_spdyNoSSL) {
              if (strlen($test['addCmdLine']))
                $test['addCmdLine'] .= ' ';
              $test['addCmdLine'] .= '--use-spdy=no-ssl';
            }
            if (isset($req_dataReduction) && $req_dataReduction) {
              if (strlen($test['addCmdLine']))
                $test['addCmdLine'] .= ' ';
              $test['addCmdLine'] .= '--enable-spdy-proxy-auth';
            }
            if (isset($req_uastring) && strlen($req_uastring)) {
              if (strpos($req_uastring, '"') !== false) {
                $error = 'Invalid User Agent String: "' . htmlspecialchars($req_uastring) . '"';
              } else {
                $test['uastring'] = $req_uastring;
              }
            }
            if (isset($req_UAModifier) && strlen($req_UAModifier)) {
              if (strpos($req_UAModifier, '"') !== false) {
                $error = 'Invalid User Agent Modifier: "' . htmlspecialchars($req_UAModifier) . '"';
              } else {
                $test['UAModifier'] = $req_UAModifier;
              }
            } else {
              $UAModifier = GetSetting('UAModifier');
              if ($UAModifier && strlen($UAModifier)) {
                $test['UAModifier'] = $UAModifier;
              }
            }
            if (isset($req_appendua) && strlen($req_appendua)) {
              if (strpos($req_appendua, '"') !== false) {
                $error = 'Invalid User Agent String: "' . htmlspecialchars($req_appendua) . '"';
              } else {
                $test['appendua'] = $req_appendua;
              }
            }
            if (isset($req_wprDesktop) && $req_wprDesktop) {
              $wprDesktop = GetSetting('wprDesktop');
              if ($wprDesktop) {
                if (strlen($test['addCmdLine']))
                  $test['addCmdLine'] .= ' ';
                $test['addCmdLine'] .= "--host-resolver-rules=\"MAP * $wprDesktop,EXCLUDE localhost,EXCLUDE 127.0.0.1\"";
                $test['ignoreSSL'] = 1;
              }
            } elseif (isset($req_wprMobile) && $req_wprMobile) {
              $wprMobile = GetSetting('wprMobile');
              if ($wprMobile) {
                if (strlen($test['addCmdLine']))
                  $test['addCmdLine'] .= ' ';
                $test['addCmdLine'] .= "--host-resolver-rules=\"MAP * $wprMobile,EXCLUDE localhost,EXCLUDE 127.0.0.1\"";
                $test['ignoreSSL'] = 1;
              }
            }
            if (isset($req_hostResolverRules) && preg_match('/^[a-zA-Z0-9 \.\:\*,]+$/i', $req_hostResolverRules)) {
              if (strlen($test['addCmdLine']))
                $test['addCmdLine'] .= ' ';
              $test['addCmdLine'] .= "--host-resolver-rules=\"$req_hostResolverRules,EXCLUDE localhost,EXCLUDE 127.0.0.1\"";
            }

            // see if we need to process a template for these requests
            if (isset($req_k) && strlen($req_k)) {
                $keys = parse_ini_file('./settings/keys.ini', true);
                if (count($keys) && array_key_exists($req_k, $keys) && array_key_exists('template', $keys[$req_k])) {
                    $template = $keys[$req_k]['template'];
                    if (is_file("./templates/$template.php"))
                        include("./templates/$template.php");
                }
            }

            // Extract the location, browser and connectivity.
            // location:browser.connectivity
            if( preg_match('/([^\.:]+)[:]*(.*)[\.]+([^\.]*)/i', trim($req_location), $matches) ||
                preg_match('/([^\.:]+)[:]*(.*)/i', trim($req_location), $matches))
            {
                $test['location'] = trim($matches[1]);
                if (strlen(trim($matches[2]))) {
                    $test['browser'] = trim($matches[2]);

                  if (isset($_REQUEST['custombrowser']) && strlen($_REQUEST['custombrowser']))
                    $test['browser'] = trim($_REQUEST['custombrowser']);

                  // see if the requested browser is a custom browser
                  if (is_dir('./browsers') &&
                      is_file('./browsers/browsers.ini') &&
                      (is_file("./browsers/{$test['browser']}.zip") ||
                       is_file("./browsers/{$test['browser']}.apk"))) {
                    $customBrowsers = parse_ini_file('./browsers/browsers.ini');
                    if (array_key_exists($test['browser'], $customBrowsers)) {
                      $protocol = getUrlProtocol();
                      $base_uri = "$protocol://{$_SERVER['HTTP_HOST']}/browsers/";
                      if (array_key_exists('browsers_url', $settings) && strlen($settings['browsers_url']))
                          $base_uri = $settings['browsers_url'];
                      $test['customBrowserUrl'] = is_file("./browsers/{$test['browser']}.zip") ?
                          "$base_uri{$test['browser']}.zip" : "$base_uri{$test['browser']}.apk";
                      $test['customBrowserMD5'] = $customBrowsers[$test['browser']];
                      if (is_file("./browsers/{$test['browser']}.json"))
                        $test['customBrowserSettings'] = json_decode(file_get_contents("./browsers/{$test['browser']}.json"), true);
                    }
                  }
                }
                if (strlen(trim($matches[3])) &&
                    empty($locations[$test['location']]['connectivity'])) {
                    $test['connectivity'] = trim($matches[3]);
                    $test['requested_connectivity'] = $test['connectivity'];
                }
            } else {
                $test['location'] = trim($req_location);
            }
            if (isset($locations[$test['location']]['ami']))
              $test['ami'] = $locations[$test['location']]['ami'];
            if (isset($locations[$test['location']]['shardID']))
              $test['locationShard'] = $locations[$test['location']]['shardID'];

            // set the browser to the default if one wasn't specified
            if ((!array_key_exists('browser', $test) ||
                 !strlen($test['browser'])) &&
                array_key_exists($test['location'], $locations) &&
                array_key_exists('browser', $locations[$test['location']]) &&
                strlen($locations[$test['location']]['browser'])) {
              $browsers = explode(',',$locations[$test['location']]['browser']);
              if (isset($browsers) && is_array($browsers) && count($browsers))
                $test['browser'] = trim($browsers[0]);
            }

            // Extract the multiple locations.
            if ( isset($req_multiple_locations))
            {
                $test['multiple_locations'] = array();
                foreach ($req_multiple_locations as $location_string)
                {
                    array_push($test['multiple_locations'], $location_string);
                }
                $test['batch_locations'] = 1;
            }

            // modify the script to include additional headers (if appropriate)
            if( isset($req_addheaders) && strlen($req_addheaders) && strlen($test['script']) )
            {
                $headers = explode("\n", $req_addheaders);
                foreach( $headers as $header )
                {
                    $header = trim($header);
                    if( strpos($header, ':') )
                        $test['script'] = "addHeader\t$header\r\n" . $test['script'];
                }
            }

            // see if it is a batch test
            $test['batch'] = 0;
            if( (isset($req_bulkurls) && strlen($req_bulkurls)) ||
                (isset($_FILES['bulkfile']) && isset($_FILES['bulkfile']['tmp_name']) && strlen($_FILES['bulkfile']['tmp_name'])) ) {
                $test['batch'] = 1;
                $is_bulk_test = true;
            }

            // login tests are forced to be private
            if( isset($test['login']) && strlen($test['login']) )
                $test['private'] = 1;

            if (!$test['browser_width'] || !$test['browser_height']) {
              $browser_size = GetSetting('default_browser_size');
              if ($browser_size) {
                $parts = explode('x', $browser_size);
                if (count($parts) == 2) {
                  $browser_width = intval($parts[0]);
                  $browser_height = intval($parts[1]);
                  if ($browser_width > 0 && $browser_height > 0) {
                    $test['browser_width'] = $browser_width;
                    $test['browser_height'] = $browser_height;
                  }
                }
              }
            }

            // Tests that include credentials in the URL (usually indicated by @ in the host section) are forced to be private
            $atPos = strpos($test['url'], '@');
            if ($atPos !== false) {
              $queryPos = strpos($test['url'], '?');
              if ($queryPos === false || $queryPos > $atPos) {
                $test['private'] = 1;
              }
            }

            // If API requests explicitly mark tests as not-private, allow it
            if (($_SERVER['REQUEST_METHOD'] == 'GET' || $xml || $json) && isset($_REQUEST['private']) && !$_REQUEST['private'] && !GetSetting('forcePrivate')) {
                $test['private'] = 0;
            }

            // default batch and API requests to a lower priority
            if( !isset($req_priority) )
            {
                if( (isset($test['batch']) && $test['batch']) || (isset($test['batch_locations']) && $test['batch_locations']) ) {
                    $bulkPriority = GetSetting('bulk_priority');
                    $test['priority'] =  $bulkPriority ? $bulkPriority : 7;
                } elseif( $_SERVER['REQUEST_METHOD'] == 'GET' || $xml || $json ) {
                    $test['priority'] =  5;
                }
            }

            // do we need to force the priority to be ignored (needed for the AOL system currently?)
            if( isset($settings['noPriority']) && $settings['noPriority'] )
                $test['priority'] =  0;

            // take the ad-blocking request and create a custom block from it
            if( isset($req_ads) && $req_ads == 'blocked' )
                $test['block'] .= ' adsWrapper.js adsWrapperAT.js adsonar.js sponsored_links1.js switcher.dmn.aol.com';

            // see if there are any custom metrics to extract
            if (is_dir('./settings/custom_metrics')) {
              $files = glob('./settings/custom_metrics/*.js');
              if ($files !== false && is_array($files) && count($files)) {
                $test['customMetrics'] = array();
                foreach ($files as $file) {
                  $name = basename($file, '.js');
                  $code = file_get_contents($file);
                  $test['customMetrics'][$name] = base64_encode($code);
                }
              }
            }
            if (array_key_exists('custom', $_REQUEST)){
              $metric = null;
              $code = '';
              $lines = explode("\n", $_REQUEST['custom']);
              foreach ($lines as $line) {
                $line = trim($line);
                if (strlen($line)) {
                  if (preg_match('/^\[(?P<metric>[^\[\]]+)\]$/', $line, $matches)) {
                    if (isset($metric) && strlen($metric) && strlen($code)) {
                      if (!array_key_exists('customMetrics', $test))
                        $test['customMetrics'] = array();
                      $test['customMetrics'][$metric] = base64_encode($code);
                    }
                    $code = '';
                    $metric = $matches['metric'];
                  } else {
                    $code .= $line . "\n";
                  }
                }
              }
              if (isset($metric) && strlen($metric) && strlen($code)) {
                if (!array_key_exists('customMetrics', $test))
                  $test['customMetrics'] = array();
                $test['customMetrics'][$metric] = base64_encode($code);
              }
            }

            if (array_key_exists('heroElements', $_REQUEST)) {
              // Custom hero-element selectors should be specified as a JSON string
              // in { heroName: selector[, heroName2: selector2[, ...]] } format.
              $heroElements = json_decode($_REQUEST['heroElements']);
              if (is_object($heroElements)) {
                // Iterate over each value in the object, filtering out anything
                // that isn't a string of non-zero length.
                $heroElements = array_filter((array) $heroElements, function($selector) {
                  return is_string($selector) && strlen($selector);
                });
                if (count($heroElements) > 0) {
                  $test['heroElementTimes'] = 1;
                  $test['heroElements'] = base64_encode(json_encode($heroElements, JSON_FORCE_OBJECT));
                }
              }
            }

            // Force some test options when running a Lighthouse-only test
            if (isset($test['type']) && $test['type'] == 'lighthouse') {
              $test['lighthouse'] = 1;
              $test['runs'] = 1;
              $test['fvonly'] = 1;
            }
        }
        else
        {
            // don't inherit some settings from the stored test
            unset($test['id']);
            unset($test['ip']);
            unset($test['uid']);
            unset($test['user']);
            if (array_key_exists('last_updated', $test))
                unset($test['last_updated']);
            if (array_key_exists('started', $test))
                unset($test['started']);
            if (array_key_exists('completed', $test))
                unset($test['completed']);
            if (array_key_exists('medianRun', $test))
                unset($test['medianRun']);
            if (array_key_exists('retries', $test))
                unset($test['retries']);
            if (array_key_exists('job_file', $test))
                unset($test['job_file']);
            if (array_key_exists('job', $test))
                unset($test['job']);
            if (array_key_exists('test_error', $test))
                unset($test['test_error']);
            if (array_key_exists('errors', $test))
                unset($test['errors']);
            if (array_key_exists('test_runs', $test))
                unset($test['test_runs']);
            if (array_key_exists('shards_finished', $test))
                unset($test['shards_finished']);
            if (array_key_exists('path', $test))
                unset($test['path']);
            if (array_key_exists('spam', $test))
                unset($test['spam']);
            $test['priority'] =  0;
        }

        if ($test['mobile'] && is_file('./settings/mobile_devices.ini')) {
          $devices = parse_ini_file('./settings/mobile_devices.ini', true);
          if ($devices) {
            if (isset($test['mobileDevice'])) {
              setcookie('mdev', $test['mobileDevice'], time()+60*60*24*365, '/');
            }
            if (!isset($test['mobileDevice']) || !isset($devices[$test['mobileDevice']])) {
              // Grab the first device from the list
              $test['mobileDevice'] = key($devices);
            }
            $test['mobileDeviceLabel'] = isset($devices[$test['mobileDevice']]['label']) ? $devices[$test['mobileDevice']]['label'] : $test['mobileDevice'];
            if (!$test['width'] && isset($devices[$test['mobileDevice']]['width']))
              $test['width'] = $devices[$test['mobileDevice']]['width'];
            if (!$test['height'] && isset($devices[$test['mobileDevice']]['height']))
              $test['height'] = $devices[$test['mobileDevice']]['height'];
            if (!$test['dpr'] && isset($devices[$test['mobileDevice']]['dpr']))
              $test['dpr'] = $devices[$test['mobileDevice']]['dpr'];
            if (!isset($test['uastring']) && isset($devices[$test['mobileDevice']]['ua']))
              $test['uastring'] = $devices[$test['mobileDevice']]['ua'];
            if (!isset($test['throttle_cpu']) && isset($devices[$test['mobileDevice']]['throttle_cpu']))
              $test['throttle_cpu'] = $devices[$test['mobileDevice']]['throttle_cpu'];
          }
        }

        $test['created'] = time();

        // the API key requirements are for all test paths
        $test['vd'] = isset($req_vd) ? $req_vd : '';
        $test['vh'] = isset($req_vh) ? $req_vh : '';
        if ($headless) {
            $test['vd'] = '';
            $test['vh'] = '';
        }
        if (isset($req_vo))
          $test['owner'] = $req_vo;
        if (isset($req_k))
          $test['key'] = $req_k;

        // some myBB integration to get the requesting user
        if( isset($user) && !array_key_exists('user', $test) )
            $test['user'] = $user;

        if( isset($uid) && !array_key_exists('uid', $test) )
            $test['uid'] = $uid;

        // create an owner string (for API calls, this should already be set as a cookie for normal visitors)
        if( !isset($test['owner']) || !strlen($test['owner']) || !preg_match("/^[\w @\.]+$/", $test['owner']) )
          $test['owner'] = sha1(uniqid(uniqid('', true), true));

        // special case locations
        $use_closest = false;
        if ($test['location'] == 'closest' && is_file('./settings/closest.ini') ) {
            $use_closest = true;
        }

        // populate the IP address of the user who submitted it
        if (!array_key_exists('ip', $test) || !strlen($test['ip'])) {
            $test['ip'] = $_SERVER['REMOTE_ADDR'];
            if ($test['ip'] == '127.0.0.1') {
                $test['ip'] = @getenv("HTTP_X_FORWARDED_FOR");
            }
        }

        if( !strlen($error) && (!isset($test['batch']) || !$test['batch'])) {
          ValidateParameters($test, $locations, $error);
        }
        // Make sure we aren't blocking the tester
        // TODO: remove the allowance for high-priority after API keys are implemented
        if (!strlen($error)) {
          ValidateKey($test, $error);
        }
        if( !strlen($error) && CheckIp($test) && CheckUrl($test['url']) )
        {

            if( !array_key_exists('id', $test) )
            {
                // see if we are doing a SPOF test (if so, we need to build the 2 tests and
                // redirect to the comparison page
                if (isset($req_spof) && strlen(trim($req_spof))) {
                    $spofTests = array();
                    $test['video'] = 1;
                    $test['label'] = 'Original';
                    $id = CreateTest($test, $test['url']);
                    if( isset($id) ) {
                        $spofTests[] = $id;
                        $test['label'] = 'SPOF';
                        $script = '';
                        $hosts = explode("\n", $req_spof);
                        foreach($hosts as $host) {
                            $host = trim($host);
                            if (strlen($host)) {
                                $script .= "setDnsName\t$host\tblackhole.webpagetest.org\r\n";
                            }
                        }
                        if (strlen($script)) {
                            $script .= "setTimeout\t240\r\n";
                            if (strlen($test['script'])) {
                                $test['script'] = $script . $test['script'];
                            } else {
                                $test['script'] = $script . "navigate\t{$test['url']}\r\n";
                            }
                            $id = CreateTest($test, $test['url']);
                            if( isset($id) ) {
                                $spofTests[] = $id;
                            }
                        }
                    }
                }
                else if( isset($test['batch_locations']) && $test['batch_locations'] && count($test['multiple_locations']) )
                {
                    $test['id'] = CreateTest($test, $test['url'], 0, 1);
                    $test['batch_id'] = $test['id'];

                    $test['tests'] = array();
                    foreach( $test['multiple_locations'] as $location_string )
                    {
                        $testData = $test;
                        // Create a test with the given location and applicable connectivity.
                        UpdateLocation($testData, $locations, $location_string, $error);
                        if (strlen($error))
                          break;

                        $id = CreateTest($testData, $testData['url']);
                        if( isset($id) )
                            $test['tests'][] = array('url' => $test['url'], 'id' => $id);
                    }

                    // write out the list of URLs and the test ID for each
                    if (!strlen($error)) {
                      if( count($test['tests']) )
                      {
                          $path = GetTestPath($test['id']);
                          file_put_contents("./$path/tests.json", json_encode($test['tests']));
                      } else {
                          $error = 'Locations could not be submitted for testing';
                      }
                    }
                }
                elseif( isset($test['batch']) && $test['batch'] )
                {
                    // build up the full list of URLs
                    $bulk = array();
                    $bulk['urls'] = array();
                    $bulk['variations'] = array();
                    $bulkUrls = '';
                    if( isset($req_bulkurls) && strlen($req_bulkurls) )
                        $bulkUrls = $req_bulkurls . "\n";
                    if( isset($_FILES['bulkfile']) && isset($_FILES['bulkfile']['tmp_name']) && strlen($_FILES['bulkfile']['tmp_name']) )
                        $bulkUrls .= file_get_contents($_FILES['bulkfile']['tmp_name']);

                    $current_mode = 'urls';
                    if( strlen($bulkUrls) )
                    {
                        $script = null;
                        $lines = explode("\n", $bulkUrls);
                        foreach( $lines as $line )
                        {
                            $line = trim($line);
                            if( strlen($line) )
                            {
                                if( substr($line, 0, 1) == '<' || substr($line, 0, 1) == '{' )
                                {
                                    if (!strcasecmp($line, '<test>') || !strcasecmp($line, '{test}')) {
                                        $entry = array();
                                        $current_mode = 'test';
                                    } elseif (!strcasecmp($line, '</test>') || !strcasecmp($line, '{/test}')) {
                                        $bulk['urls'][] = $entry;
                                        unset($entry);
                                    } elseif (!strcasecmp($line, '<script>') || !strcasecmp($line, '{script}')) {
                                        $script = array();
                                        $current_mode = 'test_script';
                                    } elseif (!strcasecmp($line, '</script>') || !strcasecmp($line, '{/script}')) {
                                        $current_mode = 'test';
                                        $entry = ParseBulkScript($script, $entry);
                                        unset($script);
                                    }
                                } elseif ($current_mode == 'test') {
                                    $split = strpos($line, '=');
                                    if ($split > 0) {
                                        $key = substr($line, 0, $split);
                                        $value = substr($line, $split + 1);
                                        if ($key == 'label')
                                            $entry['l'] = $value;
                                    }
                                } elseif ($current_mode == 'test_script') {
                                    $script[] = $line;
                                } else {
                                    if (substr($line, 0, 1) == '[') {
                                        if (count($script)) {
                                            $entry = ParseBulkScript($script);
                                            if( $entry )
                                                $bulk['urls'][] = $entry;
                                            unset($script);
                                        }

                                        if( !strcasecmp($line, '[urls]') )
                                            $current_mode = 'urls';
                                        elseif(!strcasecmp($line, '[variations]'))
                                            $current_mode = 'variations';
                                        elseif (!strcasecmp($line, '[script]')) {
                                            $script = array();
                                            $current_mode = 'script';
                                        } else
                                            $current_mode = '';
                                    } elseif ($current_mode == 'urls') {
                                        $entry = ParseBulkUrl($line);
                                        if( $entry )
                                            $bulk['urls'][] = $entry;
                                    } elseif ($current_mode == 'variations') {
                                        $entry = ParseBulkVariation($line);
                                        if( $entry )
                                            $bulk['variations'][] = $entry;
                                    } elseif ($current_mode == 'script') {
                                        $script[] = $line;
                                    }
                                }
                            }
                        }

                        if (count($script)) {
                            $entry = ParseBulkScript($script);
                            if( $entry )
                                $bulk['urls'][] = $entry;
                            unset($script);
                        }
                    }

                    if( count($bulk['urls']) )
                    {
                        $test['id'] = CreateTest($test, $test['url'], 1);
                        $test['batch_id'] = $test['id'];

                        $testCount = 0;
                        foreach( $bulk['urls'] as &$entry )
                        {
                            $testData = $test;
                            if (isset($entry['l']) && strlen($entry['l']))
                            {
                                $testData['label'] = $entry['l'];
                            }
                            if( $entry['ns'] )
                            {
                                unset($testData['script']);
                                if( $testData['discard'] )
                                {
                                    $testData['runs'] = max(1, $testData['runs'] - $testData['discard']);
                                    $testData['discard'] = 0;
                                }
                            }
                            if( $entry['s'] )
                                $testData['script'] = $entry['s'];

                            ValidateParameters($testData, $locations, $error, $entry['u']);
                            $entry['id'] = CreateTest($testData, $entry['u']);
                            if( $entry['id'] )
                            {
                                $entry['v'] = array();
                                foreach( $bulk['variations'] as $variation_index => &$variation )
                                {
                                    if( strlen($test['label']) && strlen($variation['l']) )
                                        $test['label'] .= ' - ' . $variation['l'];
                                    $url = CreateUrlVariation($entry['u'], $variation['q']);
                                    if( $url ) {
                                        ValidateParameters($testData, $locations, $error, $url);
                                        $entry['v'][$variation_index] = CreateTest($testData, $url);
                                    }
                                }
                                $testCount++;
                            }
                        }

                        // write out the list of URLs and the test ID for each
                        if( $testCount )
                        {
                            $path = GetTestPath($test['id']);
                            gz_file_put_contents("./$path/bulk.json", json_encode($bulk));
                        }
                        else
                            $error = 'URLs could not be submitted for testing';
                    }
                    else
                        $error = "No valid URLs submitted for bulk testing";
                }
                else
                {
                    $test['id'] = CreateTest($test, $test['url']);
                    if( !$test['id'] && !strlen($error) )
                        $error = 'Error submitting URL for testing';
                }
            }

            // redirect the browser to the test results page
            if( !strlen($error) )
            {
                if (array_key_exists('submit_callback', $test)) {
                    $test['submit_callback']($test);
                }
                $protocol = getUrlProtocol();
                $host  = $_SERVER['HTTP_HOST'];
                $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');

                if( $xml )
                {
                    header ('Content-type: text/xml');
                    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
                    echo "<response>\n";
                    echo "<statusCode>200</statusCode>\n";
                    echo "<statusText>Ok</statusText>\n";
                    if( strlen($req_r) )
                        echo "<requestId>{$req_r}</requestId>\n";
                    echo "<data>\n";
                    echo "<testId>{$test['id']}</testId>\n";
                    echo "<ownerKey>{$test['owner']}</ownerKey>\n";
                    if( FRIENDLY_URLS )
                    {
                        echo "<xmlUrl>$protocol://$host$uri/xmlResult/{$test['id']}/</xmlUrl>\n";
                        echo "<userUrl>$protocol://$host$uri/result/{$test['id']}/</userUrl>\n";
                        echo "<summaryCSV>$protocol://$host$uri/result/{$test['id']}/page_data.csv</summaryCSV>\n";
                        echo "<detailCSV>$protocol://$host$uri/result/{$test['id']}/requests.csv</detailCSV>\n";
                    }
                    else
                    {
                        echo "<xmlUrl>$protocol://$host$uri/xmlResult.php?test={$test['id']}</xmlUrl>\n";
                        echo "<userUrl>$protocol://$host$uri/results.php?test={$test['id']}</userUrl>\n";
                        echo "<summaryCSV>$protocol://$host$uri/csv.php?test={$test['id']}</summaryCSV>\n";
                        echo "<detailCSV>$protocol://$host$uri/csv.php?test={$test['id']}&amp;requests=1</detailCSV>\n";
                    }
                    echo "<jsonUrl>$protocol://$host$uri/jsonResult.php?test={$test['id']}</jsonUrl>\n";
                    echo "</data>\n";
                    echo "</response>\n";

                }
                elseif( $json )
                {
                    $ret = array();
                    $ret['statusCode'] = 200;
                    $ret['statusText'] = 'Ok';
                    $ret['data'] = array();
                    $ret['data']['testId'] = $test['id'];
                    $ret['data']['ownerKey'] = $test['owner'];
                    $ret['data']['jsonUrl'] = "$protocol://$host$uri/results.php?test={$test['id']}&f=json";
                    if( FRIENDLY_URLS )
                    {
                        $ret['data']['xmlUrl'] = "$protocol://$host$uri/xmlResult/{$test['id']}/";
                        $ret['data']['userUrl'] = "$protocol://$host$uri/result/{$test['id']}/";
                        $ret['data']['summaryCSV'] = "$protocol://$host$uri/result/{$test['id']}/page_data.csv";
                        $ret['data']['detailCSV'] = "$protocol://$host$uri/result/{$test['id']}/requests.csv";
                    }
                    else
                    {
                        $ret['data']['xmlUrl'] = "$protocol://$host$uri/xmlResult.php?test={$test['id']}";
                        $ret['data']['userUrl'] = "$protocol://$host$uri/results.php?test={$test['id']}";
                        $ret['data']['summaryCSV'] = "$protocol://$host$uri/csv.php?test={$test['id']}";
                        $ret['data']['detailCSV'] = "$protocol://$host$uri/csv.php?test={$test['id']}&amp;requests=1";
                    }
                    $ret['data']['jsonUrl'] = "$protocol://$host$uri/jsonResult.php?test={$test['id']}";
                    json_response($ret);
                }
                else
                {
                    if (isset($spofTests) && count($spofTests) > 1) {
                        header("Location: $protocol://$host$uri/video/compare.php?tests=" . implode(',', $spofTests));
                    } else {
                        // redirect regardless if it is a bulk test or not
                        if( FRIENDLY_URLS )
                            header("Location: $protocol://$host$uri/result/{$test['id']}/");
                        else
                            header("Location: $protocol://$host$uri/results.php?test={$test['id']}");
                    }
                }
            }
            else
            {
                if( $xml )
                {
                    header ('Content-type: text/xml');
                    header("Cache-Control: no-cache, must-revalidate");
                    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
                    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
                    echo "<response>\n";
                    echo "<statusCode>400</statusCode>\n";
                    echo "<statusText>" . $error . "</statusText>\n";
                    if( strlen($req_r) )
                        echo "<requestId>" . $req_r . "</requestId>\n";
                    echo "</response>\n";
                }
                elseif( $json )
                {
                    $ret = array();
                    $ret['statusCode'] = 400;
                    $ret['statusText'] = $error;
                    if( strlen($req_r) )
                        $ret['requestId'] = $req_r;
                    header ("Content-type: application/json");
                    header("Cache-Control: no-cache, must-revalidate");
                    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
                    echo json_encode($ret);
                }
                else
                {
                    ErrorPage($error);
                }
            }
        }
        else
        {
            if( $xml ) {
                if (!strlen($error))
                    $error = 'Your test request was intercepted by our spam filters (or because we need to talk to you about how you are submitting tests)';
                header ('Content-type: text/xml');
                echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
                echo "<response>\n";
                echo "<statusCode>400</statusCode>\n";
                echo "<statusText>$error</statusText>\n";
                echo "</response>\n";
            } elseif( $json ) {
                if (!strlen($error))
                    $error = 'Your test request was intercepted by our spam filters (or because we need to talk to you about how you are submitting tests)';
                $ret = array();
                $ret['statusCode'] = 400;
                $ret['statusText'] = $error;
                header ("Content-type: application/json");
                echo json_encode($ret);
            } elseif (strlen($error)) {
                ErrorPage($error);
            } else {
                include 'blocked.php';
            }
        }
    }

/**
* Update the given location into the Test variable. This is needed for
* submitting multiple-locations tests in one-shot.
*   This also involves updating the locationText, browser and connectivity
* values that are applicable for the new location.
*
* @param mixed $test
* @param mixed $new_location
*/
function UpdateLocation(&$test, &$locations, $new_location, &$error)
{
  // Update the location.
  $test['location'] = $new_location;

  // see if we need to override the browser
  if( isset($locations[$test['location']]['browserExe']) && strlen($locations[$test['location']]['browserExe']))
    $test['browserExe'] = $locations[$test['location']]['browserExe'];

  // figure out what the location working directory and friendly name are
  $test['locationText'] = $locations[$test['location']]['label'];
  $test['locationLabel'] = $locations[$test['location']]['label'];
  $test['workdir'] = $locations[$test['location']]['localDir'];
  $test['remoteUrl']  = $locations[$test['location']]['remoteUrl'];
  $test['remoteLocation'] = $locations[$test['location']]['remoteLocation'];
  if( !strlen($test['workdir']) && !strlen($test['remoteUrl']) )
      $error = "Invalid Location, please try submitting your test request again.";

  // see if we need to pick the default connectivity
  if (array_key_exists('connectivity', $locations[$test['location']]) &&
      strlen($locations[$test['location']]['connectivity']) &&
      array_key_exists('connectivity', $test)) {
    unset($test['connectivity']);
  } elseif (empty($locations[$test['location']]['connectivity']) && !isset($test['connectivity'])) {
    if (!empty($locations[$test['location']]['default_connectivity'])) {
        $test['connectivity'] = $locations[$test['location']]['default_connectivity'];
    } else {
        $test['connectivity'] = 'Cable';
    }
  }

  if( isset($test['browser']) && strlen($test['browser']) )
      $test['locationText'] .= " - <b>{$test['browser']}</b>";
  if (isset($test['mobileDeviceLabel']) && $test['mobile'])
      $test['locationText'] .= " - <b>Emulated {$test['mobileDeviceLabel']}</b>";
  if( isset($test['connectivity']) )
  {
      $test['locationText'] .= " - <b>{$test['connectivity']}</b>";
      $connectivity = parse_ini_file('./settings/connectivity.ini', true);
      if( isset($connectivity[$test['connectivity']]) )
      {
          $test['bwIn'] = (int)$connectivity[$test['connectivity']]['bwIn'] / 1000;
          $test['bwOut'] = (int)$connectivity[$test['connectivity']]['bwOut'] / 1000;
          $test['latency'] = (int)$connectivity[$test['connectivity']]['latency'];
          $test['testLatency'] = (int)$connectivity[$test['connectivity']]['latency'];
          $test['plr'] = $connectivity[$test['connectivity']]['plr'];
          if (!$test['timeout'] && isset($connectivity[$test['connectivity']]['timeout']))
            $test['timeout'] = $connectivity[$test['connectivity']]['timeout'];

          if( isset($connectivity[$test['connectivity']]['aftCutoff']) && !$test['aftEarlyCutoff'] )
              $test['aftEarlyCutoff'] = $connectivity[$test['connectivity']]['aftCutoff'];
      } elseif ((!isset($test['bwIn']) || !$test['bwIn']) &&
                (!isset($test['bwOut']) || !$test['bwOut']) &&
                (!isset($test['latency']) || !$test['latency'])) {
        $error = 'Unknown connectivity type: ' . htmlspecialchars($test['connectivity']);
      }
  }

  // adjust the latency for any last-mile latency at the location
  if( isset($test['latency']) && $locations[$test['location']]['latency'] )
      $test['testLatency'] = max(0, $test['latency'] - $locations[$test['location']]['latency'] );

}


/**
* See if we are requiring key validation and if so, enforce the restrictions
*
* @param mixed $test
* @param mixed $error
*/
function ValidateKey(&$test, &$error, $key = null)
{
  global $admin;
  global $uid;
  global $user;
  global $this_user;

  // load the secret key (if there is one)
  $secret = '';
  $keys = parse_ini_file('./settings/keys.ini', true);
  if( $keys && isset($keys['server']) && isset($keys['server']['secret']) )
    $secret = trim($keys['server']['secret']);

  if( strlen($secret) ){
    // ok, we require key validation, see if they have an hmac (user with form)
    // or API key
    if( !isset($key) && isset($test['vh']) && strlen($test['vh']) ){
      // validate the hash
      $hashStr = $secret;
      $hashStr .= $_SERVER['HTTP_USER_AGENT'];
      $hashStr .= $test['owner'];
      $hashStr .= $test['vd'];
      $hmac = sha1($hashStr);

      // check the elapsed time since the hmac was issued
      $now = time();
      $origTime = strtotime($test['vd']);
      $elapsed = abs($now - $origTime);

      if( $hmac != $test['vh'] || $elapsed > 86400 ) {
        $error = 'Your test request could not be validated (this can happen if you leave the browser window open for over a day before submitting a test).  Please try submitting it again.';
      } else {
        // if recaptcha is enabled, verify the response
        $secret = GetSetting("recaptcha_secret_key", "");
        if (!isset($uid) && !isset($user) && !isset($this_user) && strlen($secret)) {
          $passed = false;
          if (isset($_REQUEST['g-recaptcha-response'])) {
            $captcha_url = "https://www.google.com/recaptcha/api/siteverify?secret=" . urlencode($secret) . "&response=" . urlencode($_REQUEST['g-recaptcha-response']);
            $response = json_decode(http_fetch($captcha_url), true);
            if (isset($response["success"]) && $response["success"])
              $passed = true;
          }
          if (!$passed) {
            $error = "Failed recaptcha validation.  Please go back and try submitting your test again";
          }
        }
      }
    }elseif( isset($key) || (isset($test['key']) && strlen($test['key'])) ){
      if( isset($test['key']) && strlen($test['key']) && !isset($key) )
        $key = $test['key'];

      // see if it was an auto-provisioned key
      if (preg_match('/^(?P<prefix>[0-9A-Za-z]+)\.(?P<key>[0-9A-Za-z]+)$/', $key, $matches)) {
        $prefix = $matches['prefix'];
        if (is_file(__DIR__ . "/dat/{$prefix}_api_keys.db")) {
          $db = new SQLite3(__DIR__ . "/dat/{$prefix}_api_keys.db");
          $k = $db->escapeString($matches['key']);
          $info = $db->querySingle("SELECT key_limit FROM keys WHERE key='$k'", true);
          $db->close();
          if (isset($info) && is_array($info) && isset($info['key_limit']))
            $keys[$key] = array('limit' => $info['key_limit']);
        }
      }

      // validate their API key and enforce any rate limits
      if( array_key_exists($key, $keys) ){
        if (array_key_exists('default location', $keys[$key]) &&
            strlen($keys[$key]['default location']) &&
            !strlen($test['location'])) {
            $test['location'] = $keys[$key]['default location'];
        }
        if (isset($keys[$key]['priority']))
            $test['priority'] = $keys[$key]['priority'];
        if (isset($keys[$key]['max-priority']))
            $test['priority'] = max($keys[$key]['max-priority'], $test['priority']);
        if (isset($keys[$key]['location']) && $test['location'] !== $keys[$key]['location'])
          $error = "Invalid location.  The API key used is restricted to {$keys[$key]['location']}";
        if( !strlen($error) && isset($keys[$key]['limit']) ) {
          $limit = (int)$keys[$key]['limit'];

            // update the number of tests they have submitted today
            if( !is_dir('./dat') )
              mkdir('./dat', 0777, true);

          $lock = Lock("API Keys");
          if( isset($lock) ) {
              $keyfile = './dat/keys_' . gmdate('Ymd') . '.dat';
              $usage = null;
              if( is_file($keyfile) )
                $usage = json_decode(file_get_contents($keyfile), true);
              if( !isset($usage) )
                $usage = array();
              if( isset($usage[$key]) )
                $used = (int)$usage[$key];
              else
                $used = 0;

              $runcount = max(1, $test['runs']);
              if( !$test['fvonly'] )
                $runcount *= 2;
              if (array_key_exists('navigateCount', $test) && $test['navigateCount'] > 0)
                $runcount *= $test['navigateCount'];

            if( $limit > 0 ){
              if( $used + $runcount <= $limit ){
                $used += $runcount;
                $usage[$key] = $used;
              }else{
                $error = 'The test request will exceed the daily test limit for the given API key';
              }
            }
            else {
                $used += $runcount;
                $usage[$key] = $used;
            }
            if( !strlen($error) )
              file_put_contents($keyfile, json_encode($usage));
            Unlock($lock);
          }
        }
        // check to see if we need to limit queue lengths from this API key
        if (isset($keys[$key]['queue_limit']) && $keys[$key]['queue_limit']) {
            $test['queue_limit'] = $keys[$key]['queue_limit'];
        }
      }else{
        $error = 'Invalid API Key';
      }
      if (!strlen($error) && $key != $keys['server']['key']) {
          global $usingAPI;
          $usingAPI = true;
      }

      // Make sure API keys don't exceed the max configured priority
      $maxApiPriority = GetSetting('maxApiPriority');
      if ($maxApiPriority) {
        $test['priority'] = max($test['priority'], $maxApiPriority);
      }
    }elseif (!isset($admin) || !$admin) {
      $error = 'An error occurred processing your request (missing API key).';
      if (GetSetting('allow_getkeys')) {
        $protocol = getUrlProtocol();
        $url = "$protocol://{$_SERVER['HTTP_HOST']}/getkey.php";
        $error .= "  If you do not have an API key assigned you can request one at $url";
      }
    }
  }
}

/**
* Validate the test options and set intelligent defaults
*
* @param mixed $test
* @param mixed $locations
*/
function ValidateParameters(&$test, $locations, &$error, $destination_url = null)
{
    global $use_closest;

    if( isset($test['script']) && strlen($test['script']) )
    {
        $url = ValidateScript($test['script'], $error);
        if( isset($url) )
            $test['url'] = $url;
    }

    if( strlen($test['url']) || $test['batch'] )
    {
        $settings = parse_ini_file('./settings/settings.ini');
        if( isset($_COOKIE['maxruns']) && $_COOKIE['maxruns'] )
            $settings['maxruns'] = (int)$_COOKIE['maxruns'];
        elseif( isset($_REQUEST['maxruns']) && $_REQUEST['maxruns'] )
            $settings['maxruns'] = (int)$_REQUEST['maxruns'];
        $maxruns = (int)$settings['maxruns'];
        if( !$maxruns )
            $maxruns = 10;

        if ( !isset($settings['fullSizeVideoOn']) || !$settings['fullSizeVideoOn'] )
        {
            //overwrite the Full Size Video flag with 0 if feature disabled in the settings
            $test['fullsizevideo'] = 0;
        }

        if( !isset($test['batch']) || !$test['batch'] )
            ValidateURL($test['url'], $error, $settings);

        if( !$error )
        {
            if ($use_closest) {
                if (!isset($destination_url))
                    $destination_url = $test['url'];
                $test['location'] = GetClosestLocation($destination_url, $test['browser']);
            }

            // make sure the test runs are between 1 and the max
            if( $test['runs'] > $maxruns )
                $test['runs'] = $maxruns;
            elseif( $test['runs'] < 1 )
                $test['runs'] = 1;

            // if fvonly is set, make sure it is to an explicit value of 1
            if( $test['fvonly'] > 0 )
                $test['fvonly'] = 1;

            // make sure on/off options are explicitly 1 or 0
            $values = array('private', 'web10', 'ignoreSSL', 'tcpdump', 'standards', 'lighthouse',
                            'timeline', 'swrender', 'netlog', 'spdy3', 'noscript', 'fullsizevideo',
                            'blockads', 'sensitive', 'pngss', 'bodies', 'htmlbody', 'pss_advanced',
                            'noheaders');
            foreach ($values as $value) {
              if (isset($test[$value]) && $test[$value])
                $test[$value] = 1;
              else
                $test[$value] = 0;
            }
            $test['aft'] = 0;

            // use the default location if one wasn't specified
            if( !strlen($test['location']) )
            {
                $def = $locations['locations']['default'];
                if( !$def )
                    $def = $locations['locations']['1'];
               // $loc = $locations[$def]['default'];
                $loc = $locations[$locations[$def]['default']]['location'];
                if( !$loc )
                $loc = $locations[$locations[$def]['1']]['location'];
                //    $loc = $locations[$def]['1'];
                $test['location'] = $loc;
            }

            // Pull the lat and lng from the location if available
            $test_loc = $locations[$test['location']];
            if (isset($_REQUEST['lat']) && floatval($_REQUEST['lat']) != 0)
              $test['lat'] = floatval($_REQUEST['lat']);
            if (isset($_REQUEST['lng']) && floatval($_REQUEST['lng']) != 0)
              $test['lng'] = floatval($_REQUEST['lng']);
            if (!isset($test['lat']) && !isset($test['lng']) &&
                isset($test_loc['lat']) && isset($test_loc['lng'])) {
              $test['lat'] = floatval($test_loc['lat']);
              $test['lng'] = floatval($test_loc['lng']);
            }

            // Use the default browser if one wasn't specified
            if ((!isset($test['browser']) || !strlen($test['browser'])) && isset($locations[$test['location']]['browser'])) {
              $browsers = explode(',', $locations[$test['location']]['browser']);
              if (isset($browsers) && is_array($browsers) && count($browsers))
                $test['browser'] = $browsers[0];
            }

            // see if we are blocking API access at the given location
            if( isset($locations[$test['location']]['noscript']) &&
                $locations[$test['location']]['noscript'] &&
                isset($test['priority']) &&
                $test['priority'] ) {
                $error = 'API Automation is currently disabled for that location.';
            }

            // see if we need to override the browser
            if( isset($locations[$test['location']]['browserExe']) && strlen($locations[$test['location']]['browserExe']))
                $test['browserExe'] = $locations[$test['location']]['browserExe'];

            // See if we need to force mobile emulation
            if (!$test['mobile'] && isset($locations[$test['location']]['force_mobile']) && $locations[$test['location']]['force_mobile'])
              $test['mobile'] = 1;

            // See if the location carries a timeout override
            if (!isset($test['timeout']) && isset($locations[$test['location']]['timeout']) && $locations[$test['location']]['timeout'] > 0)
              $test['timeout'] = intval($locations[$test['location']]['timeout']);

            // figure out what the location working directory and friendly name are
            $test['locationText'] = $locations[$test['location']]['label'];

            if (isset($locations[$test['location']]['label']))
              $test['locationLabel'] = $locations[$test['location']]['label'];
            if (isset($locations[$test['location']]['localDir']))
              $test['workdir'] = $locations[$test['location']]['localDir'];
            if (isset($locations[$test['location']]['remoteUrl']))
              $test['remoteUrl']  = $locations[$test['location']]['remoteUrl'];
            if (isset($locations[$test['location']]['remoteLocation']))
              $test['remoteLocation'] = $locations[$test['location']]['remoteLocation'];
            if( !isset($test['workdir']) && !isset($test['remoteUrl']) )
                $error = "Invalid Location, please try submitting your test request again.";

            if( isset($test['type']) && strlen($test['type']) && $test['type'] === 'traceroute' )
            {
                // make sure we're just passing a host name
                $parts = parse_url($test['url']);
                $test['url'] = $parts['host'];
            }
            else
            {
                // see if we need to pick the default connectivity
                if (empty($locations[$test['location']]['connectivity']) && !isset($test['connectivity'])) {
                    if (!empty($locations[$test['location']]['default_connectivity'])) {
                        $test['connectivity'] = $locations[$test['location']]['default_connectivity'];
                    } else {
                        $test['connectivity'] = 'Cable';
                    }
                }

                if( isset($test['browser']) && strlen($test['browser']) )
                    $test['locationText'] .= " - <b>{$test['browser']}</b>";
                if (isset($test['mobileDeviceLabel']) && $test['mobile'])
                    $test['locationText'] .= " - <b>Emulated {$test['mobileDeviceLabel']}</b>";
                if( isset($test['connectivity']) )
                {
                    $test['locationText'] .= " - <b>{$test['connectivity']}</b>";
                    $connectivity = parse_ini_file('./settings/connectivity.ini', true);
                    if( isset($connectivity[$test['connectivity']]) )
                    {
                        $test['bwIn'] = (int)$connectivity[$test['connectivity']]['bwIn'] / 1000;
                        $test['bwOut'] = (int)$connectivity[$test['connectivity']]['bwOut'] / 1000;
                        $test['latency'] = (int)$connectivity[$test['connectivity']]['latency'];
                        $test['testLatency'] = (int)$connectivity[$test['connectivity']]['latency'];
                        $test['plr'] = $connectivity[$test['connectivity']]['plr'];
                        if (!$test['timeout'] && isset($connectivity[$test['connectivity']]['timeout']))
                          $test['timeout'] = $connectivity[$test['connectivity']]['timeout'];

                    } elseif ((!isset($test['bwIn']) || !$test['bwIn']) &&
                              (!isset($test['bwOut']) || !$test['bwOut']) &&
                              (!isset($test['latency']) || !$test['latency'])) {
                      $error = 'Unknown connectivity type: ' . htmlspecialchars($test['connectivity']);
                    }
                }

                // adjust the latency for any last-mile latency at the location
                if( isset($test['latency']) && isset($locations[$test['location']]['latency']) && $locations[$test['location']]['latency'] )
                    $test['testLatency'] = max(0, $test['latency'] - $locations[$test['location']]['latency'] );
            }
        }
    } elseif( !strlen($error) ) {
        $error = "Invalid URL, please try submitting your test request again.";
    }
}

/**
* Validate the uploaded script to make sure it should be run
*
* @param mixed $test
* @param mixed $error
*/
function ValidateScript(&$script, &$error)
{
    global $test;
    $url = null;
    if (stripos($script, 'webdriver.Builder(') === false) {
        global $test;
        FixScript($test, $script);

        $navigateCount = 0;
        $ok = false;
        $lines = explode("\n", $script);
        foreach( $lines as $line )
        {
            $tokens = explode("\t", $line);
            $command = trim($tokens[0]);
            if( !strcasecmp($command, 'navigate') )
            {
                $navigateCount++;
                $ok = true;
                $url = trim($tokens[1]);
                if (stripos($url, '%URL%') !== false)
                    $url = null;
                else
                    CheckUrl($url);
            } elseif( !strcasecmp($command, 'loadVariables') )
                $error = "loadVariables is not a supported command for uploaded scripts.";
            elseif( !strcasecmp($command, 'loadFile') )
                $error = "loadFile is not a supported command for uploaded scripts.";
            elseif( !strcasecmp($command, 'fileDialog') )
                $error = "fileDialog is not a supported command for uploaded scripts.";

            if (stripos($command, 'AndWait') !== false)
              $navigateCount++;
        }

        $test['navigateCount'] = $navigateCount;

        $maxNavigateCount = GetSetting("maxNavigateCount");
        if (!$maxNavigateCount) {
            $maxNavigateCount = 20;
        }

        if( !$ok )
            $error = "Invalid Script (make sure there is at least one navigate command and that the commands are tab-delimited).  Please contact us if you need help with your test script.";
        else if( $navigateCount > $maxNavigateCount )
            $error = "Sorry, your test has been blocked.  Please contact us if you have any questions";

        if( strlen($error) )
            unset($url);
    }

    return $url;
}

/**
* Extract the server side configuration.
* Try to automaticaly fix a script that used spaces instead of tabs.
*
* @param mixed $script
*/
function FixScript(&$test, &$script)
{
    if (strlen($script)) {
        $newScript = '';
        $lines = explode("\n", $script);
        foreach ($lines as $line) {
            $line = trim($line);
            if (strlen($line)) {
                if( strpos($line, "\t") !== false )
                    $newScript .= "$line\r\n";
                else {
                    $command = strtok(trim($line), " \t\r\n");
                    if ($command !== false) {
                        if ($command == "csiVariable") {
                            $target = strtok("\r\n");
			                if (isset($test['extract_csi'])) {
				                array_push($test['extract_csi'], $target);
			                } else {
				                $test['extract_csi'] = array($target);
			                }
                            continue;
                        }
                        $newScript .= $command;
                        $expected = ScriptParameterCount($command);
                        if ($expected == 2) {
                            $target = strtok("\r\n");
                            if ($target !== false)
                                $newScript .= "\t$target";
                        } elseif($expected = 3) {
                            $target = strtok(" \t\r\n");
                            if ($target !== false) {
                                $newScript .= "\t$target";
                                $value = strtok("\r\n");
                                if( $value !== false )
                                    $newScript .= "\t$value";
                            }
                        }
                        $newScript .= "\r\n";
                    }
                }
            }
        }

        $script = $newScript;
    }
}

/**
* Figure out how many parameters are expected for the given script step
* in case we're trying to fix a script with no tabs the command count
* will help us allow commands with spaces in them
*
* @param mixed $command
*/
function ScriptParameterCount($command)
{
    // default to 2 - 3 is the special case
    $count = 2;

    if( !strcasecmp($command, 'setDOMRequest') ||
        !strcasecmp($command, 'setValue') ||
        !strcasecmp($command, 'setInnerText') ||
        !strcasecmp($command, 'setInnerHTML') ||
        !strcasecmp($command, 'selectValue') ||
        !strcasecmp($command, 'loadFile') ||
        !strcasecmp($command, 'fileDialog') ||
        !strcasecmp($command, 'sendKeyPress') ||
        !strcasecmp($command, 'sendKeyPressAndWait') ||
        !strcasecmp($command, 'sendKeyDown') ||
        !strcasecmp($command, 'sendKeyDownAndWait') ||
        !strcasecmp($command, 'sendKeyUp') ||
        !strcasecmp($command, 'sendKeyUpAndWait') ||
        !strcasecmp($command, 'sendCommand') ||
        !strcasecmp($command, 'sendCommandAndWait') ||
        !strcasecmp($command, 'setCookie') ||
        !strcasecmp($command, 'setDNS') ||
        !strcasecmp($command, 'setDnsName') ||
        !strcasecmp($command, 'setBrowserSize') ||
        !strcasecmp($command, 'setViewportSize') ||
        !strcasecmp($command, 'overrideHost') ||
        !strcasecmp($command, 'addCustomRule') ||
        !strcasecmp($command, 'firefoxPref') ||
        !strcasecmp($command, 'overrideHostUrl') )
    {
        $count = 3;
    }

    return $count;
}

/**
* Make sure the URL they requested looks valid
*
* @param mixed $test
* @param mixed $error
*/
function ValidateURL(&$url, &$error, &$settings)
{
    $ret = false;

    // make sure the url starts with http://
    if( strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6))
        $url = 'http://' . $url;

    $parts = parse_url($url);
    $host = $parts['host'];

    if( strpos($url, ' ') !== FALSE || strpos($url, '>') !== FALSE || strpos($url, '<') !== FALSE )
        $error = "Please enter a Valid URL.  <b>" . htmlspecialchars($url) . "</b> is not a valid URL";
    elseif( strpos($host, '.') === FALSE && !GetSetting('allowNonFQDN') )
        $error = "Please enter a Valid URL.  <b>" . htmlspecialchars($host) . "</b> is not a valid Internet host name";
    elseif( preg_match('/\d+\.\d+\.\d+\.\d+/', $host) && !$settings['allowPrivate'] &&
            (!strcmp($host, "127.0.0.1") || !strncmp($host, "192.168.", 8)  || !strncmp($host, "169.254.", 8) || !strncmp($host, "10.", 3)) )
        $error = "You can not test <b>" . htmlspecialchars($host) . "</b> from the public Internet.  Your web site needs to be hosted on the public Internet for testing";
    elseif (!strcmp($host, "169.254.169.254"))
        $error = "Sorry, " . htmlspecialchars($host) . " is blocked from testing";
    elseif( !strcasecmp(substr($url, -4), '.pdf') )
        $error = "You can not test PDF files with WebPagetest";
    else
        $ret = true;

    return $ret;
}

/**
* Submit the test request file to the server
*
* @param mixed $run
* @param mixed $testRun
* @param mixed $test
*/
function SubmitUrl($testId, $testData, &$test, $url)
{
    $ret = false;
    global $error;
    global $locations;

    $script = ProcessTestScript($url, $test);

    $out = "Test ID=$testId\r\nurl=";
    if (isset($script) && strlen($script))
        $out .= "script://$testId.pts";
    else
        $out .= $url;
    $out .= "\r\n";

    // add the actual test configuration
    $out .= $testData;

    if (isset($script) && strlen($script))
      $out .= "\r\n[Script]\r\n" . $script;

    $location = $test['location'];
    $ret = WriteJob($location, $test, $out, $testId);
    if (isset($test['ami']))
      EC2_StartInstanceIfNeeded($test['ami']);

    return $ret;
}

/**
* Write out the actual job file
*/
function WriteJob($location, &$test, &$job, $testId)
{
  $ret = false;
  global $error;
  global $locations;

  if (isset($locations[$location]['relayServer']) && $locations[$location]['relayServer']) {
    // upload the test to a the relay server
    $test['id'] = $testId;
    $ret = SendToRelay($test, $job);
  } else {
    // Submit the job locally
    if (AddTestJob($location, $job, $test, $testId)) {
      $ret = true;
    } else {
      $error = "Sorry, that test location already has too many tests pending.  Pleasy try again later.";
    }
  }

  if ($ret) {
    ReportAnalytics($test);
  }

  return $ret;
}

/**
* Upload the test to a relay server
*/
function SendToRelay(&$test, &$out)
{
    $ret = false;
    global $error;
    global $locations;

    $url = $locations[$test['location']]['relayServer'] . 'runtest.php';
    $key = $locations[$test['location']]['relayKey'];
    $location = $locations[$test['location']]['relayLocation'];
    $ini = file_get_contents('./' . GetTestPath($test['id']) . '/testinfo.ini');

    $boundary = "---------------------".substr(md5(rand(0,32000)), 0, 10);
    $data = "--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"rkey\"\r\n\r\n$key";

    $data .= "\r\n--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"location\"\r\n\r\n$location";

    $data .= "\r\n--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"job\"\r\n\r\n$out";

    $data .= "\r\n--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"ini\"\r\n\r\n$ini";

    $data .= "\r\n--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"testinfo\"\r\n\r\n" . json_encode($test);

    $data .= "\r\n--$boundary--\r\n";


    $params = array('http' => array(
                       'method' => 'POST',
                       'header' => "Connection: close\r\nContent-Type: multipart/form-data; boundary=$boundary",
                       'content' => $data
                    ));

    $ctx = stream_context_create($params);
    $fp = fopen($url, 'rb', false, $ctx);
    if( $fp )
    {
        $response = @stream_get_contents($fp);
        if( $response && strlen($response) )
        {
            $result = json_decode($response, true);
            if( $result['statusCode'] == 200 )
            {
                $test['relayId'] = $result['id'];
                $ret = true;
            }
            else
                $error = $result['statusText'];
        }
    }

    return $ret;
}

/**
* Detect if the given URL redirects to another host
*/
function GetRedirect($url, &$rhost, &$rurl) {
  global $redirect_cache;
  $redirected = false;
  $rhost = '';
  $rurl = '';

  if (strlen($url)) {
    if( strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6))
      $url = 'http://' . $url;
    if (array_key_exists($url, $redirect_cache)) {
      $rhost = $redirect_cache[$url]['host'];
      $rurl = $redirect_cache[$url]['url'];
    } elseif (function_exists('curl_init')) {
      $cache_key = md5($url);
      $redirect_info = null;
      if (function_exists('apcu_fetch')) {
        $redirect_info = apcu_fetch($cache_key);
        if ($redirect_info === false)
          $redirect_info = null;
      } elseif (function_exists('apc_fetch')) {
        $redirect_info = apc_fetch($cache_key);
        if ($redirect_info === false)
          $redirect_info = null;
      }
      if (isset($redirect_info) && isset($redirect_info['host']) && isset($redirect_info['url'])) {
        $rhost = $redirect_info['host'];
        $rurl = $redirect_info['url'];
      } else {
        $parts = parse_url($url);
        $original = $parts['host'];
        $host = '';
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_USERAGENT, 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; PTST 2.295)');
        curl_setopt($curl, CURLOPT_FILETIME, true);
        curl_setopt($curl, CURLOPT_NOBODY, true);
        curl_setopt($curl, CURLOPT_HEADER, true);
        curl_setopt($curl, CURLOPT_FAILONERROR, true);
        curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 20);
        curl_setopt($curl, CURLOPT_DNS_CACHE_TIMEOUT, 20);
        curl_setopt($curl, CURLOPT_MAXREDIRS, 10);
        curl_setopt($curl, CURLOPT_TIMEOUT, 20);
        curl_setopt($curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        $headers = curl_exec($curl);
        curl_close($curl);
        $lines = explode("\n", $headers);
        foreach($lines as $line) {
          $line = trim($line);
          $split = strpos($line, ':');
          if ($split > 0) {
            $key = trim(substr($line, 0, $split));
            $value = trim(substr($line, $split + 1));
            if (!strcasecmp($key, 'Location')) {
              $rurl = $value;
              $parts = parse_url($rurl);
              $host = trim($parts['host']);
            }
          }
        }
      }

      if( strlen($host) && $original !== $host )
        $rhost = $host;

      // Cache the redirct info
      $redirect_info = array('host' => $rhost, 'url' => $rurl);
      $redirect_cache[$url] = $redirect_info;
      if (function_exists('apcu_store')) {
        apcu_store($cache_key, $redirect_info, 3600);
      } elseif (function_exists('apc_store')) {
        apc_store($cache_key, $redirect_info, 3600);
      }
    }
  }
  if (strlen($rhost))
    $redirected = true;
  return $redirected;
}

/**
* Log the actual test in the test log file
*
* @param mixed $test
*/
function LogTest(&$test, $testId, $url)
{
    if (GetSetting('logging_off'))
        return;

    if( !is_dir('./logs') )
        mkdir('./logs', 0777, true);

    // open the log file
    $filename = "./logs/" . gmdate("Ymd") . ".log";
    $video = 0;
    if( isset($test['video']) && strlen($test['video']) )
        $video = 1;
    $ip = $_SERVER['REMOTE_ADDR'];
    if( array_key_exists('ip',$test) && strlen($test['ip']) )
        $ip = $test['ip'];
    $pageLoads = $test['runs'];
    if (!$test['fvonly'])
        $pageLoads *= 2;
    if (array_key_exists('navigateCount', $test) && $test['navigateCount'] > 0)
        $pageLoads *= $test['navigateCount'];

    $line_data = array(
        'date' => gmdate("Y-m-d G:i:s"),
        'ip' => @$ip,
        'guid' => @$testId,
        'url' => @$url,
        'location' => @$test['locationText'],
        'private' => @$test['private'],
        'testUID' => @$test['uid'],
        'testUser' => @$test['user'],
        'video' => @$video,
        'label' => @$test['label'],
        'owner' => @$test['owner'],
        'key' => @$test['key'],
        'count' => @$pageLoads,
        'priority' => @$test['priority'],
    );

    $log = makeLogLine($line_data);

    error_log($log, 3, $filename);
}


/**
* Make sure the requesting IP isn't on our block list
*
*/
function CheckIp(&$test)
{
  global $admin;
  global $user;
  global $usingAPI;
  $ok = true;
  if (!$admin) {
    $date = gmdate("Ymd");
    $ip2 = @$test['ip'];
    $ip = $_SERVER['REMOTE_ADDR'];
    $blockIps = file('./settings/blockip.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (isset($blockIps) && is_array($blockIps) && count($blockIps)) {
      foreach( $blockIps as $block ) {
        $block = trim($block);
        if( strlen($block) ) {
          if( preg_match("/$block/", $ip) ) {
            logMsg("$ip: matched $block for url {$test['url']}", "./log/{$date}-blocked.log", true);
            $ok = false;
            break;
          }

          if( $ip2 && strlen($ip2) && preg_match("/$block/", $ip2) ) {
            logMsg("$ip2: matched(2) $block for url {$test['url']}", "./log/{$date}-blocked.log", true);
            $ok = false;
            break;
          }
        }
      }
    }
  }

  return $ok;
}

/**
* Make sure the url isn't on our block list
*
* @param mixed $url
*/
function CheckUrl($url)
{
  $ok = true;
  global $user;
  global $usingAPI;
  global $error;
  global $admin;
  global $is_bulk_test;
  $date = gmdate("Ymd");
  if( strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6))
    $url = 'http://' . $url;
  if (!$usingAPI && !$admin) {
    $blockUrls = file('./settings/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $blockHosts = file('./settings/blockdomains.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($blockUrls !== false && count($blockUrls) ||
        $blockHosts !== false && count($blockHosts)) {
      // Follow redirects to see if they are obscuring the site being tested
      $rhost = '';
      $rurl = '';
      if (GetSetting('check_redirects') && !$is_bulk_test)
        GetRedirect($url, $rhost, $rurl);
      foreach( $blockUrls as $block ) {
        $block = trim($block);
        if( strlen($block) && preg_match("/$block/i", $url)) {
          logMsg("{$_SERVER['REMOTE_ADDR']}: url $url matched $block", "./log/{$date}-blocked.log", true);
          $ok = false;
          break;
        } elseif( strlen($block) && strlen($rurl) && preg_match("/$block/i", $rurl)) {
          logMsg("{$_SERVER['REMOTE_ADDR']}: url $url redirected to $rurl matched $block", "./log/{$date}-blocked.log", true);
          $ok = false;
          break;
        }
      }
      if ($ok) {
        $parts = parse_url($url);
        $host = trim($parts['host']);
        foreach( $blockHosts as $block ) {
          $block = trim($block);
          if( strlen($block) &&
              (!strcasecmp($host, $block) ||
               !strcasecmp($host, "www.$block"))) {
             logMsg("{$_SERVER['REMOTE_ADDR']}: $url matched $block", "./log/{$date}-blocked.log", true);
            $ok = false;
            break;
          } elseif( strlen($block) &&
              (!strcasecmp($rhost, $block) ||
               !strcasecmp($rhost, "www.$block"))) {
             logMsg("{$_SERVER['REMOTE_ADDR']}: $url redirected to $rhost which matched $block", "./log/{$date}-blocked.log", true);
            $ok = false;
            break;
          }
        }
      }
    }
  }

  if ($ok && !$admin && !$usingAPI && !$is_bulk_test) {
    $ok = SBL_Check($url, $message);
    if (!$ok) {
      $error = "<br>Sorry, your test was blocked because " . htmlspecialchars($url) . " is suspected of being used for
      <a href=\"https://www.antiphishing.org/\">phishing</a> or
      <a href=\"http://www.stopbadware.org/\">hosting malware</a>.
      <br><br>Advisory provided by
      <a href=\"http://code.google.com/apis/safebrowsing/safebrowsing_faq.html#whyAdvisory\">Google</a>.";
      logMsg("{$_SERVER['REMOTE_ADDR']}: $url failed Safe Browsing check: $message", "./log/{$date}-blocked.log", true);
    }
  }

  return $ok;
}

/**
* Add a single entry to ini-style files
* @param mixed $ini
* @param mixed $key
* @param mixed $value
*/
function AddIniLine(&$ini, $key, $value) {
  if (strpos($value, "\n") === false && strpos($value, "\r") === false) {
    $ini .= "$key=$value\r\n";
  }
}

/**
* Create a single test and return the test ID
*
* @param mixed $test
* @param mixed $url
*/
function CreateTest(&$test, $url, $batch = 0, $batch_locations = 0)
{
    global $settings;
    $testId = null;
    if (is_file('./settings/block.txt'))
      $forceBlock = trim(file_get_contents('./settings/block.txt'));

    if (CheckUrl($url) && WptHookValidateTest($test)) {
        $locationShard = isset($test['locationShard']) ? $test['locationShard'] : null;

        // generate the test ID
        $test_num;
        $id = uniqueId($test_num);
        if( $test['private'] )
            $id = ShardKey($test_num, $locationShard) . md5(uniqid(rand(), true));
        else
            $id = ShardKey($test_num, $locationShard) . $id;
        $today = new DateTime("now", new DateTimeZone('UTC'));
        $testId = $today->format('ymd_') . $id;
        $test['path'] = './' . GetTestPath($testId);

        // make absolutely CERTAIN that this test ID doesn't already exist
        while( is_dir($test['path']) )
        {
            // fall back to random ID's
            $id = ShardKey($test_num, $locationShard) . md5(uniqid(rand(), true));
            $testId = $today->format('ymd_') . $id;
            $test['path'] = './' . GetTestPath($testId);
        }

        // create the folder for the test results
        if( !is_dir($test['path']) )
            mkdir($test['path'], 0777, true);

        // write out the ini file
        $testInfo = "[test]\r\n";
        AddIniLine($testInfo, "fvonly", $test['fvonly']);
        $timeout = $test['timeout'];
        if (!$timeout) {
          $timeout = GetSetting('step_timeout', $timeout);
        }
        AddIniLine($testInfo, "timeout", $timeout);
        $resultRuns = isset($test['discard']) ? $test['runs'] - $test['discard'] : $test['runs'];
        AddIniLine($testInfo, "runs", $resultRuns);
        AddIniLine($testInfo, "location", "\"{$test['locationText']}\"");
        AddIniLine($testInfo, "loc", $test['location']);
        AddIniLine($testInfo, "id", $testId);
        AddIniLine($testInfo, "batch", $batch);
        AddIniLine($testInfo, "batch_locations", $batch_locations);
        AddIniLine($testInfo, "sensitive", $test['sensitive']);
        if( isset($test['login']) && strlen($test['login']) )
            AddIniLine($testInfo, "authenticated", "1");
        AddIniLine($testInfo, "connections", $test['connections']);
        if( isset($test['script']) && strlen($test['script']) )
            AddIniLine($testInfo, "script", "1");
        if( isset($test['notify']) && strlen($test['notify']) )
            AddIniLine($testInfo, "notify", $test['notify']);
        if( isset($test['video']) && strlen($test['video']) )
            AddIniLine($testInfo, "video", "1");
        if (isset($test['disable_video']))
            AddIniLine($testInfo, "disable_video", $test['disable_video']);
        if( isset($test['uid']) && strlen($test['uid']) )
            AddIniLine($testInfo, "uid", $test['uid']);
        if( isset($test['owner']) && strlen($test['owner']) )
            AddIniLine($testInfo, "owner", $test['owner']);
        if( isset($test['type']) && strlen($test['type']) )
            AddIniLine($testInfo, "type", $test['type']);

        if( isset($test['connectivity']) )
        {
            AddIniLine($testInfo, "connectivity", $test['connectivity']);
            AddIniLine($testInfo, "bwIn", $test['bwIn']);
            AddIniLine($testInfo, "bwOut", $test['bwOut']);
            AddIniLine($testInfo, "latency", $test['latency']);
            AddIniLine($testInfo, "plr", $test['plr']);
        }

        $testInfo .= "\r\n[runs]\r\n";
        if( isset($test['median_video']) && $test['median_video'] )
            AddIniLine($testInfo, "median_video", "1");

        file_put_contents("{$test['path']}/testinfo.ini",  $testInfo);

        // for "batch" tests (the master) we don't need to submit an actual test request
        if( !$batch && !$batch_locations)
        {
            // build up the actual test commands
            $testFile = '';
            if( isset($test['domElement']) && strlen($test['domElement']) )
                AddIniLine($testFile, 'DOMElement', $test['domElement']);
            if( isset($test['fvonly']) && $test['fvonly'] )
                AddIniLine($testFile, 'fvonly', '1');
            if( $timeout )
                AddIniLine($testFile, 'timeout', $timeout);
            if (isset($test['run_time_limit']))
              AddIniLine($testFile, "run_time_limit", $test['run_time_limit']);
            if( isset($test['web10']) && $test['web10'] )
                AddIniLine($testFile, 'web10', '1');
            if( isset($test['ignoreSSL']) && $test['ignoreSSL'] )
                AddIniLine($testFile, 'ignoreSSL', '1');
            if( isset($test['tcpdump']) && $test['tcpdump'] )
                AddIniLine($testFile, 'tcpdump', '1');
            if( isset($test['standards']) && $test['standards'] )
                AddIniLine($testFile, 'standards', '1');
            if( isset($test['timeline']) && $test['timeline'] ) {
                AddIniLine($testFile, 'timeline', '1');
                if (isset($test['discard_timeline']))
                  AddIniLine($testFile, 'discard_timeline', $test['discard_timeline']);
                if (isset($test['timeline_fps']))
                  AddIniLine($testFile, 'timeline_fps', $test['timeline_fps']);
                if (isset($test['timelineStackDepth']))
                  AddIniLine($testFile, 'timelineStackDepth', $test['timelineStackDepth']);
            }
            if( isset($test['trace']) && $test['trace'] )
                AddIniLine($testFile, 'trace', '1');
            if (isset($test['traceCategories']))
                AddIniLine($testFile, 'traceCategories', $test['traceCategories']);
            if( isset($test['swrender']) && $test['swrender'] )
                AddIniLine($testFile, 'swRender', '1');
            if( isset($test['netlog']) && $test['netlog'] )
                AddIniLine($testFile, 'netlog', '1');
            if( isset($test['spdy3']) && $test['spdy3'] )
                AddIniLine($testFile, 'spdy3', '1');
            if( isset($test['noscript']) && $test['noscript'] )
                AddIniLine($testFile, 'noscript', '1');
            if( isset($test['fullsizevideo']) && $test['fullsizevideo'] )
                AddIniLine($testFile, 'fullSizeVideo', '1');
            if (isset($test['thumbsize']))
                AddIniLine($testFile, 'thumbsize', $test['thumbsize']);
            if( isset($test['blockads']) && $test['blockads'] )
                AddIniLine($testFile, 'blockads', '1');
            if( isset($test['video']) && $test['video'] )
                AddIniLine($testFile, 'Capture Video', '1');
            if (isset($test['disable_video']))
                AddIniLine($testFile, "disable_video", $test['disable_video']);
            if (GetSetting('save_mp4') || (isset($test['keepvideo']) && $test['keepvideo']))
                AddIniLine($testFile, 'keepvideo', '1');
            if (isset($test['renderVideo']) && $test['renderVideo'])
                AddIniLine($testFile, 'renderVideo', '1');
            if( isset($test['type']) && strlen($test['type']) )
                AddIniLine($testFile, 'type', $test['type']);
            if( isset($test['block']) && $test['block'] ) {
                $block = $test['block'];
                if (isset($forceBlock))
                  $block .= " $forceBlock";
                AddIniLine($testFile, 'block', $block);
            } elseif (isset($forceBlock)) {
                AddIniLine($testFile, 'block', $forceBlock);
            }
            if (isset($test['blockDomains']) && strlen($test['blockDomains'])) {
                AddIniLine($testFile, 'blockDomains', $test['blockDomains']);
            }
            if (isset($test['injectScript']))
                AddIniLine($testFile, 'injectScript', base64_encode($test['injectScript']));
            if( isset($test['noopt']) && $test['noopt'] )
                AddIniLine($testFile, 'noopt', '1');
            if( isset($test['noimages']) && $test['noimages'] )
                AddIniLine($testFile, 'noimages', '1');
            if( isset($test['noheaders']) && $test['noheaders'] )
                AddIniLine($testFile, 'noheaders', '1');
            if( isset($test['discard']) && $test['discard'] )
                AddIniLine($testFile, 'discard', $test['discard']);
            AddIniLine($testFile, 'runs', $test['runs']);

            if( isset($test['connectivity']) )
            {
                AddIniLine($testFile, 'bwIn', $test['bwIn']);
                AddIniLine($testFile, 'bwOut', $test['bwOut']);
                AddIniLine($testFile, 'latency', $test['testLatency']);
                AddIniLine($testFile, 'plr', $test['plr']);
                AddIniLine($testFile, 'shaperLimit', $test['shaperLimit']);
            }

            if( isset($test['browserExe']) && strlen($test['browserExe']) )
                AddIniLine($testFile, 'browserExe', $test['browserExe']);
            if( isset($test['browser']) && strlen($test['browser']) )
                AddIniLine($testFile, 'browser', $test['browser']);
            if( (isset($test['pngss']) && $test['pngss']) || (isset($settings['pngss']) && $settings['pngss']) )
                AddIniLine($testFile, 'pngScreenShot', '1');
            if (isset($test['fps']) && $test['fps'] > 0)
                AddIniLine($testFile, 'fps', $test['fps']);
            if( isset($test['iq']) && $test['iq'] )
                AddIniLine($testFile, 'imageQuality', $test['iq']);
            elseif( isset($settings['iq']) && $settings['iq'] )
                AddIniLine($testFile, 'imageQuality', $settings['iq']);
            if( isset($test['bodies']) && $test['bodies'] )
                AddIniLine($testFile, 'bodies', '1');
            if( isset($test['htmlbody']) && $test['htmlbody'] )
                AddIniLine($testFile, 'htmlbody', '1');
            if( isset($test['time']) && $test['time'] )
                AddIniLine($testFile, 'time', $test['time']);
            if( isset($test['clear_rv']) && $test['clear_rv'] )
                AddIniLine($testFile, 'clearRV', $test['clear_rv']);
            if( isset($test['keepua']) && $test['keepua'] )
                AddIniLine($testFile, 'keepua', '1');
            if( isset($test['mobile']) && $test['mobile'] )
                AddIniLine($testFile, 'mobile', '1');
            if( isset($test['lighthouse']) && $test['lighthouse'] )
                AddIniLine($testFile, 'lighthouse', '1');
            if( isset($test['lighthouseTrace']) && $test['lighthouseTrace'] )
                AddIniLine($testFile, 'lighthouseTrace', '1');
            if( isset($test['lighthouseScreenshots']) && $test['lighthouseScreenshots'] )
                AddIniLine($testFile, 'lighthouseScreenshots', '1');
            if( isset($test['v8rcs']) && $test['v8rcs'] )
                AddIniLine($testFile, 'v8rcs', '1');
            if( isset($test['lighthouseThrottle']) && $test['lighthouseThrottle'] )
                AddIniLine($testFile, 'lighthouseThrottle', '1');
            if (isset($test['lighthouseConfig']))
                AddIniLine($testFile, 'lighthouseConfig', base64_encode($test['lighthouseConfig']));
            if( isset($test['heroElementTimes']) && $test['heroElementTimes'] )
                AddIniLine($testFile, 'heroElementTimes', '1');
            if( isset($test['coverage']) && $test['coverage'] )
                AddIniLine($testFile, 'coverage', '1');
            if( isset($test['heroElements']) && strlen($test['heroElements']) )
                AddIniLine($testFile, 'heroElements', $test['heroElements']);
            if( isset($test['debug']) && $test['debug'] )
                AddIniLine($testFile, 'debug', '1');
            if( isset($test['warmup']) && $test['warmup'] )
                AddIniLine($testFile, 'warmup', $test['warmup']);
            if( isset($test['throttle_cpu']) && $test['throttle_cpu'] > 0.0 )
                AddIniLine($testFile, 'throttle_cpu', $test['throttle_cpu']);
            if( isset($test['bypass_cpu_normalization']) && $test['bypass_cpu_normalization'])
                AddIniLine($testFile, 'bypass_cpu_normalization', '1');
            if( isset($test['dpr']) && $test['dpr'] > 0 )
                AddIniLine($testFile, 'dpr', $test['dpr']);
            if( isset($test['width']) && $test['width'] > 0 )
                AddIniLine($testFile, 'width', $test['width']);
            if( isset($test['height']) && $test['height'] > 0 )
                AddIniLine($testFile, 'height', $test['height']);
            if( isset($test['browser_width']) && $test['browser_width'] > 0 )
                AddIniLine($testFile, 'browser_width', $test['browser_width']);
            if( isset($test['browser_height']) && $test['browser_height'] > 0 )
                AddIniLine($testFile, 'browser_height', $test['browser_height']);
            if( isset($test['clearcerts']) && $test['clearcerts'] )
                AddIniLine($testFile, 'clearcerts', '1');
            if( isset($test['orientation']) && $test['orientation'] )
                AddIniLine($testFile, 'orientation', $test['orientation']);
            if (array_key_exists('continuousVideo', $test) && $test['continuousVideo'])
                AddIniLine($testFile, 'continuousVideo', '1');
            if (array_key_exists('responsive', $test) && $test['responsive'])
                AddIniLine($testFile, 'responsive', '1');
            if (array_key_exists('minimalResults', $test) && $test['minimalResults'])
                AddIniLine($testFile, 'minimalResults', '1');
            if (array_key_exists('cmdLine', $test) && strlen($test['cmdLine']))
                AddIniLine($testFile, 'cmdLine', $test['cmdLine']);
            if (array_key_exists('addCmdLine', $test) && strlen($test['addCmdLine']))
                AddIniLine($testFile, 'addCmdLine', $test['addCmdLine']);
            if (array_key_exists('customBrowserUrl', $test) && strlen($test['customBrowserUrl']))
                AddIniLine($testFile, 'customBrowserUrl', $test['customBrowserUrl']);
            if (array_key_exists('customBrowserMD5', $test) && strlen($test['customBrowserMD5']))
                AddIniLine($testFile, 'customBrowserMD5', $test['customBrowserMD5']);
            if (array_key_exists('customBrowserSettings', $test) &&
                is_array($test['customBrowserSettings']) &&
                count($test['customBrowserSettings'])) {
              foreach ($test['customBrowserSettings'] as $setting => $value)
                AddIniLine($testFile, "customBrowser_$setting", $value);
            }
            if (isset($test['uastring']))
                AddIniLine($testFile, 'uastring', $test['uastring']);
            if (isset($test['UAModifier']) && strlen($test['UAModifier']))
                AddIniLine($testFile, 'UAModifier', $test['UAModifier']);
            if (isset($test['appendua']))
                AddIniLine($testFile, 'AppendUA', $test['appendua']);
            if (isset($test['key']) && strlen($test['key']))
                AddIniLine($testFile, 'APIKey', $test['key']);
            if (isset($test['ip']) && strlen($test['ip']))
                AddIniLine($testFile, 'IPAddr', $test['ip']);
            if (isset($test['lat']) && strlen($test['lat']))
                AddIniLine($testFile, 'lat', $test['lat']);
            if (isset($test['lng']) && strlen($test['lng']))
                AddIniLine($testFile, 'lng', $test['lng']);

            // Add custom metrics
            if (array_key_exists('customMetrics', $test)) {
              foreach($test['customMetrics'] as $name => $code)
                AddIniLine($testFile, 'customMetric', "$name:$code");
            }

            // Generate the job file name
            $ext = 'url';
            if( $test['priority'] )
                $ext = "p{$test['priority']}";
            $test['job'] = "$testId.$ext";

            // Write out the json before submitting the test to the queue
            $oldUrl = @$test['url'];
            $test['url'] = $url;
            SaveTestInfo($testId, $test);
            $test['url'] = $oldUrl;

            if( !SubmitUrl($testId, $testFile, $test, $url) )
                $testId = null;
        } elseif (isset($testId)) {
            $oldUrl = @$test['url'];
            $test['url'] = $url;
            SaveTestInfo($testId, $test);
            $test['url'] = $oldUrl;
        }

        // log the test
        if (isset($testId)) {
          logTestMsg($testId, "Test Created");

          if ( $batch_locations )
              LogTest($test, $testId, 'Multiple Locations test');
          else if( $batch )
              LogTest($test, $testId, 'Bulk Test');
          else
              LogTest($test, $testId, $url);
        } else {
            // delete the test if we didn't really submit it
            delTree("{$test['path']}/");
        }
    } else {
        global $error;
        $error = 'Your test request was intercepted by our spam filters (or because we need to talk to you about how you are submitting tests)';
    }

    return $testId;
}

/**
* Parse an URL from bulk input which can optionally have a label
* <url>
* or
* <label>=<url>
*
* @param mixed $line
*/
function ParseBulkUrl($line)
{
    $entry = null;
    global $settings;
    $err;
    $noscript = 0;



    $pos = stripos($line, 'noscript');
    if( $pos !== false )
    {
        $line = trim(substr($line, 0, $pos));
        $noscript = 1;
    }

    $equals = strpos($line, '=');
    $query = strpos($line, '?');
    $slash = strpos($line, '/');
    $label = null;
    $url = null;
    if( $equals === false || ($query !== false && $query < $equals) || ($slash !== false && $slash < $equals) )
        $url = $line;
    else
    {
        $label = trim(substr($line, 0, $equals));
        $url = trim(substr($line, $equals + 1));
    }

    if( $url && ValidateURL($url, $err, $settings) )
    {
        $entry = array();
        $entry['u'] = $url;
        if( $label )
            $entry['l'] = $label;
        $entry['ns'] = $noscript;
    }

    return $entry;
}

/**
* Parse the URL variation from the bulk data
* in the format:
* <label>=<query param>
*
* @param mixed $line
*/
function ParseBulkVariation($line)
{
    $entry = null;
    $equals = strpos($line, '=');

    if( $equals !== false )
    {
        $label = trim(substr($line, 0, $equals));
        $query = trim(substr($line, $equals + 1));
        if( strlen($label) && strlen($query) )
            $entry = array('l' => $label, 'q' => $query);
    }

    return $entry;
}

/**
* Parse a bulk script entry and create a test configuration from it
*
* @param mixed $script
*/
function ParseBulkScript(&$script, $current_entry = null) {
    global $test;
    $entry = null;

    if (count($script)) {
        $s = '';
        if (isset($current_entry))
            $entry = $current_entry;
        else
            $entry = array();
        foreach ($script as $line) {
            if( !strncasecmp($line, 'label=', 6) )
                $entry['l'] = trim(substr($line,6));
            else {
                $s .= $line;
                $s .= "\r\n";
            }
        }

        $entry['u'] = ValidateScript($s, $error);
        if (strlen($entry['u']))
            $entry['s'] = $s;
        else {
            unset($entry);
        }
    }

    return $entry;
}

/**
* A relay test came in, should include a job file already
*
*/
function RelayTest()
{
    global $error;
    global $locations;
    $error = null;
    $ret = array();
    $ret['statusCode'] = 200;

    $rkey = $_POST['rkey'];
    $test = json_decode($_POST['testinfo'], true);
    $test['vd'] = '';
    $test['vh'] = '';
    $job = trim($_POST['job']);
    $ini = trim($_POST['ini']);
    $location = trim($_POST['location']);
    $test['workdir'] = $locations[$location]['localDir'];

    ValidateKey($test, $error, $rkey);
    if( !isset($error) )
    {
        $id = $rkey . '.' . $test['id'];
        $ret['id'] = $id;
        $test['job'] = $rkey . '.' . $test['job'];
        $testPath = './' . GetTestPath($id);
        @mkdir($testPath, 0777, true);
        $job = str_replace($test['id'], $id, $job);
        file_put_contents("$testPath/testinfo.ini", $ini);
        WriteJob($location, $test, $job, $id);
        SaveTestInfo($id, $test);
    }

    if( isset($error) )
    {
        $ret['statusCode'] = 400;
        $ret['statusText'] = "Relay: $error";
    }

    header ("Content-type: application/json");
    echo json_encode($ret);
}

/**
* Find the closest location in the list to the destination server
*
* @param mixed $url
*/
function GetClosestLocation($url, $browser) {
    $location = null;
    $locations = parse_ini_file('./settings/closest.ini', true);
    // filter the locations so only those that match the browser are included
    if (count($locations)) {
        foreach($locations as $name => &$data) {
            if (strlen($browser)) {
                if (!array_key_exists('browsers', $data) ||
                    stripos($data['browsers'], $browser) === false) {
                    unset($locations[$name]);
                }
            } else {
                if (array_key_exists('browsers', $data)) {
                    unset($locations[$name]);
                }
            }
        }
    }
    if (count($locations)) {
        // figure out the IP address of the server
        if( strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6))
            $url = 'http://' . $url;
        $parts = parse_url($url);
        $host = $parts['host'];
        if (strlen($host)) {
            //first see if we have a domain-based match
            $tld = substr($host, strrpos($host, '.'));
            if (strlen($tld)) {
                foreach( $locations as $loc => $pos ) {
                    if (array_key_exists('domains', $pos)) {
                        $domains = explode(',', $pos['domains']);
                        foreach( $domains as $d ) {
                            if (strcasecmp($tld, ".$d") == 0) {
                                $location = $loc;
                                break 2;
                            }
                        }
                    }
                }
            }
            if (!isset($location)) {
                $ip = gethostbyname($host);
                if (is_file('./lib/maxmind/GeoLiteCity.dat')) {
                  try {
                      require_once('./lib/maxmind/GeoIP.php');
                      $geoip = Net_GeoIP::getInstance('./lib/maxmind/GeoLiteCity.dat', Net_GeoIP::MEMORY_CACHE);
                      if ($geoip) {
                          $host_location = $geoip->lookupLocation($ip);
                          if ($host_location) {
                              $lat = $host_location->latitude;
                              $lng = $host_location->longitude;

                              // calculate the distance to each location and see which is closest
                              $distance = 0;
                              foreach( $locations as $loc => $pos ) {
                                  $r = 6371; // km
                                  $dLat = deg2rad($pos['lat']-$lat);
                                  $dLon = deg2rad($pos['lng']-$lng);
                                  $a = sin($dLat/2) * sin($dLat/2) + sin($dLon/2) * sin($dLon/2) * cos(deg2rad($lat)) * cos(deg2rad($pos['lat']));
                                  $c = 2 * atan2(sqrt($a), sqrt(1-$a));
                                  $dist = $r * $c;
                                  if (!isset($location) || $dist < $distance) {
                                      $location = $loc;
                                      $distance = $dist;
                                  }
                              }
                          }
                      }
                  }catch(Exception $e) { }
                }
            }
        }
        if (!isset($location)) {
            foreach( $locations as $loc => $pos ) {
                $location = $loc;
                break;
            }
        }
    }
    return $location;
}

function ErrorPage($error) {
    ?>
    <!DOCTYPE html>
    <html>
        <head>
            <title>WebPageTest - Test Error</title>
            <?php $gaTemplate = 'Test Error'; include ('head.inc'); ?>
        </head>
        <body>
            <div class="page">
                <?php
                include 'header.inc';

                echo $error;
                ?>

                <?php include('footer.inc'); ?>
            </div>
        </body>
    </html>
    <?php
}

/**
* Automatically create a script if we have test options that need to be translated
*
* @param mixed $test
*/
function ProcessTestScript($url, &$test) {
  $script = null;
  // add the script data (if we're running a script)
  if (isset($test['script']) && strlen($test['script'])) {
    $script = trim($test['script']);
    if (strlen($url)) {
      if (strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6))
        $url = 'http://' . $url;
      $script = str_ireplace('%URL%', $url, $script);
      $parts = parse_url($url);
      $host = $parts['host'];
      if (strlen($host)) {
        $script = str_ireplace('%HOST%', $host, $script);
        $script = str_ireplace('%HOST_REGEX%', str_replace('.', '\\.', $host), $script);
        if (stripos($script, '%HOSTR%') !== false) {
          if (GetRedirect($url, $rhost, $rurl)) {
            $lines = explode("\r\n", $script);
            $script = '';
            foreach ($lines as $line) {
              if (stripos($line, '%HOSTR%') !== false) {
                $script .= str_ireplace('%HOSTR%', $host, $line) . "\r\n";
                $script .= str_ireplace('%HOSTR%', $rhost, $line) . "\r\n";
              }
              else
                $script .= $line . "\r\n";
            }
          }
          else
            $script = str_ireplace('%HOSTR%', $host, $script);
        }
      }
    }
  }

  // Handle HTTP Basic Auth
  if ((isset($test['login']) && strlen($test['login'])) || (isset($test['password']) && strlen($test['password']))) {
    $header = "Authorization: Basic " . base64_encode("{$test['login']}:{$test['password']}");
    $testFile .= "Basic Auth={$test['login']}:{$test['password']}\r\n";
    if (!isset($script) || !strlen($script))
      $script = "navigate\t$url";
    $script = "addHeader\t$header\r\n" . $script;
  }
  // Add custom headers
  if (isset($test['customHeaders']) && strlen($test['customHeaders'])) {
    if (!isset($script) || !strlen($script))
      $script = "navigate\t$url";
    $headers = preg_split("/\r\n|\n|\r/", $test['customHeaders']);
    $headerCommands = "";
    foreach ($headers as $header) {
      $headerCommands = $headerCommands . "addHeader\t".$header."\r\n";
    }
    $script = $headerCommands . $script;
  }
  return $script;
}

/**
* Break up the supplied command-line string and make sure it isn't using
* invalid characters that may cause system issues.
*
* @param mixed $cmd
* @param mixed $error
*/
function ValidateCommandLine($cmd, &$error) {
  if (isset($cmd) && strlen($cmd)) {
    $flags = explode(' ', $cmd);
    if ($flags && is_array($flags) && count($flags)) {
      foreach($flags as $flag) {
        if (strlen($flag) && !preg_match('/^--(([a-zA-Z0-9\-\.\+=,_< "]+)|((data-reduction-proxy-http-proxies|data-reduction-proxy-config-url|proxy-server|proxy-pac-url|force-fieldtrials|force-fieldtrial-params|trusted-spdy-proxy|origin-to-force-quic-on|oauth2-refresh-token|unsafely-treat-insecure-origin-as-secure|user-data-dir)=[a-zA-Z0-9\-\.\+=,_:\/"%]+))$/', $flag)) {
          $error = 'Invalid command-line option: "' . htmlspecialchars($flag) . '"';
        }
      }
    }
  }
}

function gen_uuid() {
  return sprintf( '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ),
    mt_rand( 0, 0xffff ),
    mt_rand( 0, 0x0fff ) | 0x4000,
    mt_rand( 0, 0x3fff ) | 0x8000,
    mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff )
  );
}

function ReportAnalytics(&$test)
{
  global $usingAPI;
  $ga = GetSetting('analytics');

  if ($ga && function_exists('curl_init') &&
      isset($test['location']) && strlen($test['location'])) {

    $ip = $_SERVER['REMOTE_ADDR'];
    if( array_key_exists('ip',$test) && strlen($test['ip']) )
        $ip = $test['ip'];

    $data = array(
      'v' => '1',
      'tid' => $ga,
      'cid' => gen_uuid(),
      't' => 'event',
      'ds' => 'web',
      'ec' => 'Test',
      'ea' => $usingAPI ? 'API' : 'Manual',
      'el' => $test['location'],
      'uip' => $ip
    );

    if (isset($_SERVER['HTTP_REFERER']) && strlen($_SERVER['HTTP_REFERER'])) {
      $data['dr'] = $_SERVER['HTTP_REFERER'];
    }

    if (isset($_SERVER['HTTP_HOST']) && isset($_SERVER['PHP_SELF'])) {
      $data['dl'] = getUrlProtocol() . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'];
    }

    $payload = utf8_encode(http_build_query($data));

    $ua = 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; PTST 2.295)';
    if (isset($_SERVER['HTTP_USER_AGENT']) && strlen($_SERVER['HTTP_USER_AGENT'])) {
      $ua = $_SERVER['HTTP_USER_AGENT'];
    }

    $ga_url = "https://www.google-analytics.com/collect?" . $payload;

    // post the payload to the GA server with a relatively aggressive timeout
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $ga_url);
    curl_setopt($ch, CURLOPT_USERAGENT, $ua);
    curl_setopt($ch, CURLOPT_HTTP_VERSION,CURL_HTTP_VERSION_1_1);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_exec($ch);
    curl_close($ch);
  }
}

?>
