<?php
/*
    Template for PSS tests
    Automatically fills in the script and batch information
    and does some validation to prevent abuse
    TODO: add support for caching tests
*/  
if (isset($req_f) && !strcasecmp($req_f, 'xml'))
  $xml = true;
else
  $json = true;
$req_location = 'closest';
$test['runs'] = 8;
$test['private'] = 1;
$test['view'] = 'pss';
$test['video'] = 1;
$test['shard'] = 1;
if (!array_key_exists('priority', $_REQUEST))
  $req_priority = 0;
$test['median_video'] = 1;
$test['web10'] = 0;
$test['discard'] = 1;
$test['fvonly'] = 1;
//$test['script'] = "setDnsName\t%HOSTR%\tghs.google.com\noverrideHost\t%HOSTR%\tpsa.pssdemos.com\nnavigate\t%URL%";
$test['script'] = "addHeader\tModPagespeedFilters:combine_css,rewrite_css,inline_import_to_link,extend_cache,combine_javascript,rewrite_javascript,resize_images,move_css_to_head,rewrite_style_attributes_with_url,convert_png_to_jpeg,convert_jpeg_to_webp,recompress_images,convert_jpeg_to_progressive,convert_meta_tags,inline_css,inline_images,inline_javascript,lazyload_images,flatten_css_imports,inline_preview_images,defer_javascript,defer_iframe,add_instrumentation,flush_subresources,fallback_rewrite_css_urls,insert_dns_prefetch,split_html,prioritize_critical_css,convert_to_webp_lossless,convert_gif_to_png\t%HOST_REGEX%\n" . 
                  "if\trun\t1\n" .
                  "if\tcached\t0\n" .
                  "addHeader\tX-PSA-Blocking-Rewrite: pss_blocking_rewrite\t%HOST_REGEX%\n" .
                  "endif\n" .
                  "endif\n" .
                  "setDnsName\t%HOSTR%\tghs.google.com\n" .
                  "overrideHost\t%HOSTR%\tpsa.pssdemos.com\n" .
                  "navigate\t%URL%";
$req_bulkurls = "Original=$req_url noscript\nOptimized=$req_url";
$test['label'] = "PageSpeed Service Comparison for $req_url";

// see if we have a cached test already
if (array_key_exists('url', $test) && strlen($test['url']) && (!array_key_exists('force', $_REQUEST) || $_REQUEST['force'] == 0)) {
    $cached_id = PSS_GetCacheEntry($test['url']);
    if (isset($cached_id) && strlen($cached_id)) {
        $test['id'] = $cached_id;
    }
}

if (!array_key_exists('id', $test)) {
    $test['submit_callback'] = 'PSS_TestSubmitted';
}

/**
* Get a cached test result
*/
function PSS_GetCacheEntry($url) {
  $id = null;
  $cache_lock = Lock("PSS Cache");
  if (isset($cache_lock)) {
      if (is_file('./tmp/pss.cache')) {
          $cache = json_decode(file_get_contents('./tmp/pss.cache'), true);

          // delete stale cache entries
          $now = time();
          $dirty = false;
          foreach($cache as $cache_key => &$cache_entry) {
              if ( $cache_entry['expires'] < $now) {
                  $dirty = true;
                  unset($cache[$cache_key]);
              }
          }
          if ($dirty) {
              file_put_contents('./tmp/pss.cache', json_encode($cache));
          }
          $key = md5($url);
          if (array_key_exists($key, $cache) && array_key_exists('id', $cache[$key])) {
              $id = $cache[$key]['id'];
          }
      }
      Unlock($cache_lock);
  }
  return $id;
}

/**
* Cache the test ID in the case of multiple submits
*/
function PSS_TestSubmitted(&$test) {
    if (array_key_exists('id', $test) && array_key_exists('url', $test)) {
        $now = time();
        $cache_time = 10080;    // 7 days (in minutes)
        if (array_key_exists('cache', $_REQUEST) && $_REQUEST['cache'] > 0)
            $cache_time = (int)$_REQUEST['cache'];
        $expires = $now + ($cache_time * 60);
        $entry = array('id' => $test['id'], 'expires' => $expires);
        $key = md5($test['url']);
        
        // update the cache
        $cache_lock = Lock("PSS Cache");
        if (isset($cache_lock)) {
            if (is_file('./tmp/pss.cache')) {
                $cache = json_decode(file_get_contents('./tmp/pss.cache'), true);
            } else {
                $cache = array();
            }
            // delete stale cache entries
            foreach($cache as $cache_key => &$cache_entry) {
                if ( $cache_entry['expires'] < $now) {
                    unset($cache[$cache_key]);
                }
            }
            $cache[$key] = $entry;
            file_put_contents('./tmp/pss.cache', json_encode($cache));
            Unlock($cache_lock);
        }
    }
}
?>
