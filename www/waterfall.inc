<?php
require_once('draw.inc');
require_once('contentColors.inc');

/**
* Regroup requests into connection rows.
*
* @param mixed $requests
*/
function GetConnectionRows(&$requests, $show_labels = true) {
    $host_connections = array();  // group connections by host
    foreach ($requests as $request) {
        if (isset($request['socket'])) {
            $socket = $request['socket'];
            $host = $request['host'];
            if (!array_key_exists($host, $host_connections)) {
                $host_connections[$host] = array();
            }
            if (!array_key_exists($socket, $host_connections[$host])) {
                $host_connections[$host][$socket] = array(
                    'is_connection' => true,
                    'socket' => intval($socket),
                    'host' => $host,
                    'is_secure' => $request['is_secure'],
                    'start' => $request['all_start'],
                    'end' => $request['all_end'],
                    'requests' => array($request)
                    );
            } else {
                $host_connections[$host][$socket]['end'] = $request['all_end'];
                $host_connections[$host][$socket]['requests'][] = $request;
            }
        }
    }
    $rows = call_user_func_array('array_merge', $host_connections);
    foreach (array_keys($rows) as $row_index) {
        if ($show_labels) {
            $rows[$row_index]['label'] = sprintf(
                '%2d. %s', $row_index + 1, $rows[$row_index]['host']);
        } else {
            $rows[$row_index]['label'] = sprintf('%2d.', $row_index + 1);
        }
    }
    return $rows;
}

/**
* Return a row to indicate filtered requests. Helper for GetRequestRows.
*/
function _GetDotsRow() {
    return array(
        'is_connection' => false,
        'label' => '...',
        'start' => null,
        'end' => null,
        'is_secure' => FALSE,
        'requests' => array()
        );
}

/**
* Return an array of rows to use in waterfall view.
*/
function GetRequestRows($requests, $use_dots, $show_labels = true) {
    $rows = array();
    $filtered_requests = FilterRequests($requests);

    // Keep track of the number of each request so we can add a dotted row when one is missing
    $last_request_number = 0;
    foreach ($filtered_requests as $request) {
        if ($request['number'] > $last_request_number + 1) {
            $rows[] = _GetDotsRow();
        }
        
        $rows[] = array(
            'is_connection' => false,
            'label' => GetRequestLabel($request, $show_labels),
            'start' => $request['all_start'],
            'end' => $request['all_end'],
            'is_secure' => $request['is_secure'],
            'requests' => array($request)
        );

        $last_request_number = $request['number'];
    }
    if ($use_dots && count($filtered_requests) &&
        !array_key_exists(count($requests) - 1, $filtered_requests)) {
        $rows[] = _GetDotsRow();
    }
    return $rows;
}

/**
* Return an array of page events selected from the page data.
*/
function GetPageEvents($page_data) {
    return array(
        'render' => $page_data['render'],
        'dom_element' => $page_data['domTime'],
        'aft' =>  $page_data['aft'],
        'nav_first_paint' => $page_data['firstPaint'],
        'nav_load' => array($page_data['loadEventStart'],
                            $page_data['loadEventEnd']),
        'nav_dom' => array($page_data['domContentLoadedEventStart'],
                           $page_data['domContentLoadedEventEnd']),
        'nav_dom_interactive' => $page_data['domInteractive'],
        'load' => $page_data['docTime']
        );
}

/**
* Return data for an image map of the given rows.
*/
function GetWaterfallMap($rows, $url, $options, &$page_data) {
    $page_events = array();
    $is_image_map = true;
    return _GetMapOrImage($rows, $url, $page_events, $options, $is_image_map, $page_data);
}

/**
* Return an image identifier (from imagecreate) for a waterfall chart.
*
* @return resource
*/
function GetWaterfallImage($rows, $url, $page_events, $options, &$page_data) {
    $is_image_map = false;
    return _GetMapOrImage($rows, $url, $page_events, $options, $is_image_map, $page_data);
}

/**
* Draw the waterfall view image.
*
* @return resource
*/
function _GetMapOrImage($rows, $url, $page_events, $options, $is_image_map, &$page_data) {
    global $settings;
    $is_mime = (bool)@$options['is_mime'];
    $is_state = (bool)@$options['is_state'];
    $is_thumbnail = (bool)@$options['is_thumbnail'];
    $show_labels = (bool)@$options['show_labels'];

    $row_count = count($rows);
    if (isset($options) && array_key_exists('rowcount', $options) && $options['rowcount'] > 0)
      $row_count = $options['rowcount'];

    $width = (int)@$_REQUEST['width'];
    if ((int)@$options['width']) {
        $width = (int)$options['width'];
    }
    if (!$width || (!$is_thumbnail && $width < 300) || $width > 200000) {
        $width = 930;
    }

    if ($is_thumbnail) {
        $font_width = 1;
        $row_height = 4;
    } else {
        $font = 2;
        $font_width = imagefontwidth($font);
        $row_height = imagefontheight($font) + 4;
    }

    $data_header_height = intval($row_height * 3 / 2);
    $data_footer_height = $row_height;
    $height = ($data_header_height + ($row_height * $row_count) +
               $data_footer_height + 2);
    $data_height = $height;
    $use_cpu = (bool)@$options['use_cpu'];
    $use_bw = (bool)@$options['use_bw'];
    if ($use_cpu || $use_bw) {
        $cached = ((bool)@$options['is_cached']) ? '_Cached' : '';
        $perf_file = ("{$options['path']}/" .
                      "{$options['run_id']}{$cached}_progress.csv");
        $max_bw = 0;
        if (isset($options) && array_key_exists('max_bw', $options)) {
            $max_bw = $options['max_bw'];
        }
        $perfs = LoadPerfData($perf_file, $use_cpu, $use_bw, false, $max_bw);
        $perf_height = $is_thumbnail ? 16 : 50;
        if (isset($perfs) && is_array($perfs)) {
            foreach (array_keys($perfs) as $key) {
                if ($perfs[$key]['count']) {
                    $perfs[$key]['x1'] = 0;
                    $perfs[$key]['x2'] = $width - 1;
                    $perfs[$key]['y1'] = $height - 1;  // share border with above
                    $perfs[$key]['y2'] = $height + $perf_height - 2;
                    $perfs[$key]['height'] = $perf_height;
                    $height += $perf_height - 1;
                }
            }
        }
    }
    if ($use_cpu && !$is_image_map && isset($options) && is_array($options) &&
        array_key_exists('path', $options) &&
        array_key_exists('run_id', $options) &&
        array_key_exists('is_cached', $options)) {
      require_once('devtools.inc.php');
      $cpu_slices = DevToolsGetCPUSlices($options['path'], $options['run_id'], $options['is_cached']);
      if (isset($cpu_slices) && is_array($cpu_slices) && count($cpu_slices)) {
        $perf_height = $is_thumbnail ? 16 : 50;
        $cpu_slice_info = array();
        foreach (array_keys($cpu_slices) as $thread) {
          $cpu_slice_info[] = array('thread' => $thread,
                                    'x1' => 0,
                                    'x2' => $width - 1,
                                    'y1' => $height - 1,
                                    'y2' => $height + $perf_height - 2,
                                    'height' => $perf_height);
          $height += $perf_height - 1;
        }
      }
    }
    
    if ($is_mime) {
        $mime_y = $height;
        $height += (2 * $row_height) + 2;
    }

    if ($show_labels) {
        if ($is_thumbnail) {
            $data_x = (int)($width * 0.25); // width of request labels (no borders)
        } else {
            $data_x = 250;
        }
    } else {
        $data_x = 30;
    }
    $data_width = $width - $data_x - 3;

    // Figure out the scale.
    $max_ms = 0;
    if (@$_REQUEST['max'] > 0) {
        $max_ms = (int)($_REQUEST['max'] * 1000.0);
    } else {
        // Include all page events and resource times in time scale.
        foreach ($page_events as $event) {
            $max_ms = max($max_ms, is_array($event) ? $event[1] : $event);
        }
        foreach ($rows as $r) {
            $max_ms = max($max_ms, $r['end']);
        }
    }
    $x_scaler = new XScaler($max_ms, $data_x + 1, $data_width);

    // Get the CSI information.
    if (is_dir('./google') && array_key_exists('enable_google_csi', $settings) && $settings['enable_google_csi'] == 1) {
        require_once('./google/google_lib.inc');
        if (@$settings['enable_google_csi_filter'] == 1) {
            $filter = array('prt' => 1, 'ol' => 1, 'aft' => 1);
        } else {
            $filter = array();
        }
        $use_all = false;
        $csi_params = ParseCsiInfo($options['id'], $options['path'],
                                   $options['run_id'], $options['is_cached'],
                                   $use_all);
        $csi_info = TailorRtParamsForVisualization($csi_params, $filter);
    }
    // get any user timings
    if (isset($page_data) && array_key_exists('userTime', $page_data)) {
      foreach ($page_data as $key => $value) {
        if (substr($key, 0, 9) == 'userTime.') {
          $label = substr($key, 9);
          if (!isset($user_times))
            $user_times = array();
          $user_times[$label] = $value;
        }
      }
    }    
    if (isset($csi_info)) {
      if (!isset($user_times))
        $user_times = array();
      foreach ($csi_info as $key => $value)
        $user_times[$key] = $value;
    }

    AddRowCoordinates($rows, $data_header_height + 1, $row_height);
    if ($is_image_map) {
        $map = array();
        AddMapUrl($map, 0, 0, $data_x, $data_header_height, $url);
        foreach ($rows as $row) {
            $is_connection = $row['is_connection'];
            foreach ($row['requests'] as $request) {
                if ($is_connection) {
                    $x1 = $x_scaler($request['ttfb_start']);
                    $x2 = $x_scaler($request['download_end']);
                } else {
                    $x1 = 0;
                    $x2 = $width - 1;
                }
                AddMapRequest($map, $x1, $row['y1'], $x2, $row['y2'],
                              $request);
            }
        }
    } else {
        // Draw items needed if we're ACTUALLY drawing the chart.
        $im = imagecreate($width, $height);

        // Allocate the colors we will need.
        $white = GetColor($im, 255, 255, 255);
        $black = GetColor($im, 0, 0, 0);
        $dark_grey = GetColor($im, 192, 192, 192);
        if ($is_thumbnail) {
            $time_scale_color = GetColor($im, 208, 208, 208);  // mid-grey
            $border_color = $dark_grey;
            if (isset($perfs) && is_array($perfs)) {
                if (array_key_exists('cpu', $perfs)) {
                    $perfs['cpu']['color'] = GetColor($im, 255, 183, 112);
                }
                if (array_key_exists('bw', $perfs)) {
                    $perfs['bw']['color'] = GetColor($im, 137, 200, 137);
                }
            }
        } else {
            $time_scale_color = $dark_grey;
            $border_color = $black;
            if (isset($perfs) && is_array($perfs)) {
                if (array_key_exists('cpu', $perfs)) {
                    $perfs['cpu']['color'] = GetColor($im, 255, 127, 0);
                }
                if (array_key_exists('bw', $perfs)) {
                    $perfs['bw']['color'] = GetColor($im, 0, 127, 0);
                }
            }
        }
        if (isset($cpu_slice_info)) {
          $cpu_slice_colors = array();
          $mime_colors = MimeColors();
          
          $cpu_slice_colors['ParseHTML'] = GetColor($im, 112, 162, 227);
          $cpu_slice_colors['ResourceReceivedData'] = $cpu_slice_colors['ParseHTML'];
          $cpu_slice_colors['ResourceSendRequest'] = $cpu_slice_colors['ParseHTML'];
          $cpu_slice_colors['ResourceReceivedResponse'] = $cpu_slice_colors['ParseHTML'];
          $cpu_slice_colors['ResourceReceiveResponse'] = $cpu_slice_colors['ParseHTML'];
          $cpu_slice_colors['ResourceFinish'] = $cpu_slice_colors['ParseHTML'];
          $cpu_slice_colors['CommitLoad'] = $cpu_slice_colors['ParseHTML'];

          $cpu_slice_colors['Layout'] = GetColor($im, 154, 126, 230);
          $cpu_slice_colors['RecalculateStyles'] = $cpu_slice_colors['Layout'];
          $cpu_slice_colors['ParseAuthorStyleSheet'] = $cpu_slice_colors['Layout'];
          $cpu_slice_colors['ScheduleStyleRecalculation'] = $cpu_slice_colors['Layout'];
          $cpu_slice_colors['InvalidateLayout'] = $cpu_slice_colors['Layout'];
          $cpu_slice_colors['UpdateLayoutTree'] = $cpu_slice_colors['Layout'];

          $cpu_slice_colors['Paint'] = GetColor($im, 113, 179, 99);
          $cpu_slice_colors['PaintImage'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['PaintSetup'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['CompositeLayers'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['DecodeImage'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['Decode Image'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['ImageDecodeTask'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['Rasterize'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['GPUTask'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['SetLayerTreeId'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['layerId'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['UpdateLayer'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['UpdateLayerTree'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['Draw LazyPixelRef'] = $cpu_slice_colors['Paint'];
          $cpu_slice_colors['Decode LazyPixelRef'] = $cpu_slice_colors['Paint'];

          $cpu_slice_colors['EvaluateScript'] = GetColor($im, 241, 196, 83);
          $cpu_slice_colors['EventDispatch'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['FunctionCall'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['GCEvent'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['TimerInstall'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['TimerFire'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['TimerRemove'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['XHRLoad'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['XHRReadyStateChange'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['v8.compile'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['MinorGC'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['MajorGC'] = $cpu_slice_colors['EvaluateScript'];
          $cpu_slice_colors['FireAnimationFrame'] = $cpu_slice_colors['EvaluateScript'];

          $cpu_slice_colors['other'] = GetColor($im, 184, 184, 184);
          $cpu_slice_colors['Program'] = $cpu_slice_colors['other'];
        }

        $bg_colors = array(
            'default' => $white,
            'alt' =>     GetColor($im, 240, 240, 240),  // light-grey
            'error' =>   GetColor($im, 255, 96, 96),
            'warning' => GetColor($im, 255, 255, 96)
            );
        SetRowColors($rows, $page_events['load'], $bg_colors);

        // Draw the background.
        imagefilledrectangle(
            $im, 0, 0, $width - 1, $height - 1, $bg_colors['default']);
        foreach ($rows as $row) {
            imagefilledrectangle(
                $im, 0, $row['y1'], $width - 1, $row['y2'], $row['bg_color']);
        }

        // Draw borders.
        imagerectangle($im, 0, 0, $width - 1, $data_height - 1, $border_color);
        // Draw left/right column divider.
        imageline($im, $data_x, 0, $data_x, $data_height - 1, $border_color);


        // Draw performance backgrounds, labels, and borders.
        if (isset($perfs) && is_array($perfs)) {
            foreach ($perfs as $key => $p) {
                if (array_key_exists('count', $p) && $p['count'] > 0) {
                    if (!$is_thumbnail && $show_labels) {
                        DrawPerfLabel($im, $key, $p, $font, $black);
                    }
                    DrawPerfBackground($im, $p, $data_x, $border_color, $bg_colors['alt']);
                }
            }
        }
        
        // Draw timeline backgrounds, labels and borders
        if (isset($cpu_slice_info)) {
          foreach ($cpu_slice_info as $thread => $p) {
              if (!$is_thumbnail && $show_labels) {
                  $label = $thread ? 'Browser Background Thread' : 'Browser Main Thread';
                  DrawPerfLabel($im, $label, $p, $font, $black);
              }
              DrawPerfBackground($im, $p, $data_x, $border_color, $bg_colors['alt']);
          }
        }

        // Draw the time scale.
        // $max_ms, $width, $data_x, $black, $time_scale_color, $row_height, $data_height
        // $im, $x, $y, $font, $font_width
        if ($max_ms > 0) {
            if ($is_thumbnail) {
                $target_spacing_px = 20;
            } else {
                $target_spacing_px = 40;
            }
            $target_count = ($width - $data_x) / $target_spacing_px;
            $interval = TimeScaleInterval($max_ms, $target_count);

            // Draw the gridlines and labels.
            for ($ms = $interval; $ms < $max_ms; $ms += $interval) {
                $x = $x_scaler($ms);
                imageline($im, $x, 1 + $row_height,
                          $x, $data_height - $row_height, $time_scale_color);
                if (isset($perfs) && is_array($perfs)) {
                    foreach ($perfs as $p) {
                        if (array_key_exists('count', $p)) {
                            // Add gridline to performance chart area.
                            imageline($im, $x, $p['y1'] + 1, $x, $p['y2'] - 1, $time_scale_color);
                        }
                    }
                }
                if (isset($cpu_slice_info)) {
                  foreach ($cpu_slice_info as $p)
                    imageline($im, $x, $p['y1'] + 1, $x, $p['y2'] - 1, $time_scale_color);
                }
                // Draw the time label.
                if (!$is_thumbnail) {
                    $label = TimeScaleLabel($ms, $interval);
                    DrawCenteredText($im, $x, 3,
                                     $label, $font, $font_width, $black);
                    DrawCenteredText($im, $x, $data_height - $row_height + 1,
                                     $label, $font, $font_width, $black);
                }
            }

            // Draw event lines (e.g start render, doc complete).
            $event_colors = array(
                'render' => GetColor($im, 40, 188, 0),
                'dom_element' => GetColor($im, 242, 131, 0),
                'load' => GetColor($im, 0, 0, 255),
                'nav_load' => GetColor($im, 192, 192, 255),
                'nav_dom' => GetColor($im, 216, 136, 223),
                'nav_first_paint' => GetColor($im, 143, 188, 131),
                'nav_dom_interactive' => GetColor($im, 255, 198, 26),
                'aft' => GetColor($im, 255, 0, 0),
                'user' => GetColor($im, 105, 0, 158)
                );
            foreach ($page_events as $event_name => &$event) {
                $color = $event_colors[$event_name];
                $endpoints = array(
                    array('y1' => 1 + $row_height,
                          'y2' => $data_height - $row_height));
                if (isset($perfs) && is_array($perfs)) {
                    foreach ($perfs as $p) {
                        if (array_key_exists('count', $p)) {
                            // Add event lines in performance chart area.
                            $endpoints[] = array('y1' => $p['y1'] + 1,
                                                 'y2' => $p['y2'] - 1);
                        }
                    }
                }
                if (isset($cpu_slice_info)) {
                  foreach ($cpu_slice_info as $p)
                    $endpoints[] = array('y1' => $p['y1'] + 1,
                                         'y2' => $p['y2'] - 1);
                }
                foreach ($endpoints as $y1y2) {
                    $y1 = $y1y2['y1'];
                    $y2 = $y1y2['y2'];
                    if (is_array($event)) {
                        list($start_ms, $end_ms) = $event;
                        if ($end_ms > 0) {
                            $x1 = $x_scaler($start_ms);
                            $x2 = $x_scaler($end_ms);
                            if (!$is_thumbnail &&
                                $x1 == $x2 && $x1 < $width - 3) {
                                $x2 = $x1 + 1;
                            }
                            imagefilledrectangle($im, $x1, $y1, $x2, $y2,
                                                 $color);
                        }
                    } else {
                        $ms = $event;
                        if ($ms > 0) {
                            $x = $x_scaler($ms);
                            imageline($im, $x, $y1, $x, $y2, $color);
                            if (!$is_thumbnail && $x < $width - 3) {
                                $x++;
                                imageline($im, $x, $y1, $x, $y2, $color);
                            }
                        }
                    }
                }
            }

            // Draw the performance data.
            if (isset($perfs) && is_array($perfs)) {
                foreach ($perfs as $p) {
                    $x1 = null;
                    $y1 = null;
                    foreach ($p['data'] as $ms => $value) {
                        $x2 = $x_scaler($ms);
                        $pmax = 0;
                        if (array_key_exists('max', $p) && $p['max'] != 0) {
                            $pmax = $p['max'];
                        }
                        $y2 = ($p['y1'] + $p['height'] - 2 -
                               (int)((double)($p['height'] - 3) *
                                     (double)$value / $pmax));
                        if ($x2 <= $data_x) {
                            $x2 = $data_x + 1;
                        }
                        if ($x2 >= $width - 1 && $x1 < $x2)  {
                            // Point goes off the graph.
                            // Interpolate the ending y-coordinate.
                            $r = ($width - 2 - $x1) / ($x2 - $x1);
                            $y2 = $y1 + (($y2 - $y1) * $r);
                            $x2 = $width - 2;
                        }
                        if (isset($x1) && isset($y1)) {
                            imageline($im, $x1, $y1, $x2, $y2, $p['color']);
                        }
                        if ($x2 >= ($width - 2)) {
                            break;
                        } else {
                            $x1 = $x2;
                            $y1 = $y2;
                        }
                    }
                }
            }
            
            // Draw the Timeline information
            if (isset($cpu_slice_info) && $max_ms) {
              foreach ($cpu_slice_info as $p) {
                // go through each pixel and draw bars individually
                $x1 = $data_x + 1;
                $x2 = $data_x + $data_width;
                $cpu_top = $p['y1'] + 1;
                $cpu_bottom = $p['y2'] - 1;
                $cpu_height = $cpu_bottom - $cpu_top + 1;
                $bins = intval(ceil($max_ms / $data_width));
                $slices = $cpu_slices[$p['thread']];
                $max_slices_ms = count($slices);
                if ($x1 < $x2) {
                  for ($x = $x1; $x <= $x2; $x++) {
                    $ms = intval(floor(((($x - $x1) / $data_width) * $max_ms)));
                    if ($ms <= $max_slices_ms) {
                      $slice_bins = min($bins, $max_slices_ms - $ms);
                      $cpu_times = AverageCpuSlices($ms, $slice_bins, $slices, $cpu_slice_colors);
                      if ($cpu_times) {
                        // draw the line for this data point in the order the colors are defined
                        $y = $cpu_bottom;
                        foreach ($cpu_slice_colors as $type => $color) {
                          if (isset($cpu_times[$type])) {
                            $pixels = $cpu_height * $cpu_times[$type];
                            $y2 = max($y - $pixels, $cpu_top);
                            imageline($im, $x, $y, $x, $y2, $color);
                            $y = $y2;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            // Draw the csi metrics.
            if (isset($user_times)) {
                foreach ($user_times as $name => $value) {
                    if ($name != 'srt' && $value > 0 && $value <= $max_ms) {
                        $x = $x_scaler($value);
                        if (!$is_thumbnail) {
                            $triangle_coords = array($x - 3, $row_height + 1,
                                                     $x,     $row_height + 9,
                                                     $x + 3, $row_height + 1);
                            imagefilledpolygon($im, $triangle_coords, 3, $event_colors['user']);
                        }
                        imageline($im, $x, $row_height + 1, $x, $height - 1, $event_colors['user']);
                    }
                }
            }
        }
    }

    // Draw the left-hand column labels.
    if (!$is_image_map) {
        // Draw document url.
        $doc_url_y = intval(($data_header_height - $row_height) / 2);
        if ($is_thumbnail) {
            $column_x = 1;
            ThumbnailText($im, $column_x, $doc_url_y, $data_x - 2, $row_height,
                          $url, $font_width, $border_color);
        } else {
            $column_x = 4;
            $max_len = intval(($data_x - $column_x) / $font_width);

            $doc_label = $url;
            if (strlen($doc_label) > $max_len) {
                $doc_label = substr($doc_label, 0, $max_len - 4) . '...';
            }
            imagestring($im, $font, $column_x, 2 + $doc_url_y, $doc_label,
                        $black);
        }

        // Draw the request labels.
        foreach ($rows as $row) {
            $is_secure = $row['is_secure'];
            $request_label = $row['label'];

            $y = $row['y1'] + 1;
            if ($is_thumbnail) {
                ThumbnailText($im, $column_x, $y, $data_x - 2, $row_height,
                              $request_label, $font_width, $border_color);
            } else {
                $label_x = $column_x + intval($font_width / 2);
                $label_max_len = $max_len - 1;
                if ($is_secure && $show_labels) {
                    $lock_width = 12;
                    DrawLock($im, $label_x, $y, $lock_width, $row_height);
                    $label_x += $lock_width;
                    $label_max_len -= $lock_width / $font_width;
                }
                imagestring($im, $font, $label_x, $y,
                            FitText($request_label, $label_max_len), $black);
            }
        }
    }
    if ($max_ms > 0 && !$is_image_map) {
        // Draw requests.
        foreach ($rows as $row) {
            $is_connection = $row['is_connection'];
            foreach ($row['requests'] as $request) {
                $y1 = $row['y1'];
                $y2 = $row['y2'];
                if (!$is_thumbnail && !$is_connection) {
                    $x1 = $x_scaler($request['all_start']);
                    $x2 = $x_scaler($request['all_end']);
                    $bg_color = $row['bg_color'];
                    DrawRequestTimeLabel(
                        $im, $request, $x1, $y1, $x2, $y2, $data_x, $width - 1,
                        $font, $font_width, $black, $bg_color);
                }
                if (!$is_thumbnail) {
                    $y1 += 1;
                    $y2 -= 1;
                }
                $request['colors'] = GetRequestColors(
                    $request['contentType'],
                    $is_thumbnail, $is_mime, $is_state, $request['url']);
                $bars = GetBars($request, $x_scaler, $y1, $y2,
                                $is_thumbnail, $is_mime, $is_state);
                foreach ($bars as $bar) {
                    list($x1, $x2, $y1, $y2, $color) = $bar;
                    DrawBar($im, $x1, $y1, $x2, $y2, $color);
                }
            }
        }
    }

    if ($is_image_map && isset($user_times)) {
        foreach ($user_times as $name => $value) {
            if ($name != 'srt') {
                $x = $x_scaler($value);
                AddMapUserTime($map, $x - 3, $row_height + 1, $x + 3, $row_height + 9, "$name: " . number_format($value / 1000.0, 3) . 's');
            }
        }
    }

    // Draw the MIME legend
    if ($is_mime && !$is_image_map) {
        if (!isset($mime_colors))
          $mime_colors = MimeColors();
        $mime_count = count($mime_colors);
        $bar_width = $width / $mime_count;
        $x = 0;
        $text_y = $mime_y + 2;
        $bar_y = $text_y + $row_height;
        foreach ($mime_colors as $mime_type => $color) {
            $text_x = $x + (($bar_width -
                             $font_width * strlen($mime_type)) / 2);
            DrawBar($im, $x + 2, $bar_y + 1, $x + $bar_width - 4,
                    $bar_y + $row_height - 2, $color);
            foreach ($color as &$col)
                $col = min(255, ($col + ((255 - $col) * 0.65)));
            DrawBar($im, $x + 2, $bar_y + 1, $x + ($bar_width / 2),
                    $bar_y + $row_height - 2, $color);
            imagestring($im, $font, $text_x, $text_y + 1, $mime_type, $black);
            $x += $bar_width;
        }
    }

    if ($is_image_map)
      return $map;
    else
      return $im;
}

/**
* Filter the requests we choose to display
*
* @param mixed $requests
*/
function FilterRequests($requests) {
    $filtered_requests = array();
    if (array_key_exists('requests', $_REQUEST) && strlen(trim($_REQUEST['requests']))) {
        $rlist = explode(',', urldecode($_REQUEST['requests']));
        foreach ($rlist as $r) {
            $r = str_replace(' ', '', trim($r));
            if (strlen($r)) {
                // See if it is a range.
                $range = explode('-', $r);
                if (count($range) == 2) {
                    $start = max(0, $range[0] - 1);
                    $end = min(count($requests) - 1, $range[1] - 1);
                    if ($end > $start)  {
                        for ($i = $start; $i <= $end; $i++) {
                          $filtered_requests[$i] = &$requests[$i];
                        }
                    }
                } elseif ($r > 0 && $r <= count($requests)) {
                    $filtered_requests[$r - 1] = &$requests[$r - 1];
                }
            }
        }
    }

    if (!count($filtered_requests))
        $filtered_requests = $requests;
        
    return $filtered_requests;
}

class ColorAlternator
{
    public $use_alt_color = false;
    public $color;
    public $alt_color;

    function __construct($color, $alt_color) {
        $this->color = $color;
        $this->alt_color = $alt_color;
    }

    public function getNext() {
      $color = $this->use_alt_color ? $this->alt_color : $this->color;
      $this->use_alt_color = !$this->use_alt_color;
      return $color;
    }
}

class XScaler
{
    public $value_max;
    public $x_start;
    public $x_width;

    function __construct($value_max, $x_start, $x_width) {
        $this->value_max = $value_max;
        $this->x_start = $x_start;
        $this->x_width = $x_width;
    }

    public function __invoke($value) {
        return $this->value_max ? $this->x_start + (int)((double)$this->x_width * (double)$value /
                                      $this->value_max) : 0;
    }
}

function AverageCpuSlices($ms_start, $bins, &$slices, &$known_types) {
  $avg = null;
  if ($bins) {
    $valid = false;
    $totals = array();
    $ms_end = $ms_start + $bins;
    for ($ms = $ms_start; $ms < $ms_end; $ms++) {
      if (count($slices[$ms])) {
        foreach ($slices[$ms] as $type => $value) {
          if ($value > 0) {
            $valid = true;
            if (!isset($known_types[$type])) {
              $type = 'other';
            }
            if (!isset($totals[$type]))
              $totals[$type] = 0;
            $totals[$type] += $value;
          }
        }
      }
    }
    if ($valid) {
      $avg = array();
      foreach($totals as $type => $total)
        $avg[$type] = $total / $bins;
    }
  }
  return $avg;
}

/**
*
*/
function AddRowCoordinates(&$rows, $y1, $row_height) {
    foreach ($rows as &$r) {
        $r['y1'] = $y1;
        $r['y2'] = $y1 + $row_height - 1;
        $y1 += $row_height;
    }
}

/* Add 'bg_color' to each row.
*/
function SetRowColors(&$rows, $is_page_loaded, $bg_colors) {
    $row_color_alternator = new ColorAlternator($bg_colors['alt'],
                                                $bg_colors['default']);
    foreach ($rows as &$row) {
        $row['bg_color'] = $row_color_alternator->getNext();
        if (count($row['requests']) == 1) {
            // This is a request view and not a connection view.
            $request = current($row['requests']);
            $code = $request['responseCode'];
            if ($code != 401 && ($code >= 400 || ($code < 0 && !$is_page_loaded))) {
                $row['bg_color'] = $bg_colors['error'];
            } elseif ($code >= 300) {
                $row['bg_color'] = $bg_colors['warning'];
            }
        }
    }
}

/**
* Draw performance chart label.
*
* @param resource $im is an image resource.
* @param string $key is which performance chart (e.g. 'cpu' or 'bw').
* @param mixed $perf is an array of performance parameters.
* @param int $font is the label's font indentifier.
* @param int $label_color color identifier
*/
function DrawPerfLabel($im, $key, $perf, $font, $label_color) {
  $x = $perf['x1'];
  $height = $perf['height'];
  $line_y = $perf['y1'] + ($height / 2) - 1;
  imageline($im, $x + 10, $line_y, $x + 45, $line_y, $perf['color']);

  $label = $key;
  if ($key == 'cpu') {
      $label = 'CPU Utilization';
  } elseif ($key == 'bw') {
      $max_kbps = number_format($perf['max'] / 1000);
      $label = "BandwidthIn (0 - $max_kbps Kbps)";
  }
  $font_height = imagefontheight($font);
  $label_y = $perf['y1'] + ($height / 2) - ($font_height / 2);
  imagestring($im, $font, $x + 50, $label_y, $label, $label_color);
}

/**
* Draw performance chart background.
*
* @param resource $im is an image resource.
* @param mixed $perf is an array of performance parameters.
* @param int $data_x is where the data area of the chart begins.
* @param int $border_color color identifier
* @param int $bg_color color identifier
*/
function DrawPerfBackground($im, $perf, $data_x, $border_color, $bg_color) {
    $x1 = $perf['x1'];
    $x2 = $perf['x2'];
    $y1 = $perf['y1'];
    $y2 = $perf['y2'];

    $row_height = ($perf['height'] - 2) / 4;
    $row_y1 = $y1 + 1;
    $row_y2 = $row_y1 + $row_height;
    imagefilledrectangle($im, $data_x, $row_y1, $x2, $row_y2, $bg_color);
    $row_y1 = $y1 + 1 + $row_height * 2;
    $row_y2 = $row_y1 + $row_height;
    imagefilledrectangle($im, $data_x, $row_y1, $x2, $row_y2, $bg_color);

    imagerectangle($im, $x1, $y1, $x2, $y2, $border_color);  // border
    imageline($im, $data_x, $y1, $data_x, $y2, $border_color);  // column divider
}

/**
* Return marker interval best fit.
*/
function TimeScaleInterval($max_ms, $target_count) {
    $target_interval = (float)$max_ms / (float)$target_count;
    $interval = $target_interval;
    $diff = $target_count;
    $magnitude = pow(10, (int)(log10($target_interval)));
    foreach (array(1, 2, 5, 10) as $significand) {
        $in = $significand * $magnitude;
        $d = abs($target_count - ($max_ms / $in));
        if ($d <= $diff) {
          $interval = $in;
          $diff = $d;
        }
    }
    return $interval;
}

/**
* Format the label for the time scale.
* @return string
*/
function TimeScaleLabel($ms, $interval) {
    $places = 2;
    if ($interval >= 1000) {
       $places = 0;
    } elseif ($interval >= 100) {
       $places = 1;
    }
    return number_format($ms / 1000.0, $places);
}

/**
* Draw $label centered at $x.
*/
function DrawCenteredText($im, $x, $y, $label, $font, $font_width, $color) {
    $x -= (int)((double)$font_width * (double)strlen($label) / 2.0);
    imagestring($im, $font, $x, $y, $label, $color);
}

/**
* Format the label for a request.
* @return string
*/
function GetRequestLabel($request, $show_labels = true) {
    $path = parse_url('http://' . $request['host'] . $request['url'],
                      PHP_URL_PATH);
    $path_base = basename($path);
    if (substr($path, -1) == '/') {
        $path_base .= '/';  // preserve trailing slash
    }
    if ($show_labels) {
        $request_label = sprintf(
            '%2d. %s - %s', $request['index'] + 1, $request['host'], $path_base);
    } else {
        $request_label = sprintf('%2d.', $request['index'] + 1);
    }
    return $request_label;
}

/**
* Append imagemap data for the main document url.
*/
function AddMapUrl(&$map, $x1, $y1, $x2, $y2, $url) {
    $map[] = array(
        'url' => $url,
        'left' => $x1,
        'right' => $x2,
        'top' => $y1,
        'bottom' => $y2);
}

/**
* Append imagemap data for a single request.
*/
function AddMapRequest(&$map, $x1, $y1, $x2, $y2, $request) {
    $scheme = $request['is_secure'] ? 'https://' : 'http://';
    $map[] = array(
        'request' => $request['index'],
        'url' => $scheme . $request['host'] . $request['url'],
        'left' => $x1,
        'right' => $x2,
        'top' => $y1,
        'bottom' => $y2);
}

/**
* Append imagemap data for user timing.
*/
function AddMapUserTime(&$map, $x1, $y1, $x2, $y2, $label) {
    $map[] = array(
        'userTime' => $label,
        'left' => $x1,
        'right' => $x2,
        'top' => $y1,
        'bottom' => $y2);
}


/**
* Return an array of 'bars' which define the coordinates and colors
* for the parts of a request.
*/
function GetBars($request, $x_scaler, $y1, $y2,
                 $is_thumbnail, $is_mime, $is_state) {
    $bars = array();
    $state_y1 = $y1;
    $state_y2 = $y2;
    if ($is_state) {
        $bar_height = $y2 - $y1 + 1;
        $state_height = max(2, intval($bar_height / 2));
        $state_y1 += intval(($bar_height - $state_height) / 2);
        $state_y2 = $state_y1 + $state_height - 1;
    }
    $state_keys = array('dns', 'connect', 'ssl');
    // TODO(slamm): tweak minimum width of bars.
    //  (!$is_mime && !$is_thumbnail) ? each bar at least 1px
    //   ($is_mime && !$is_thumbnail) ? each bar group at least 1px
    AddBarIfValid($bars, 'download', $request, $x_scaler, $y1, $y2);
    AddBarIfValid($bars, 'ttfb',     $request, $x_scaler, $y1, $y2);
    AddBarIfValid($bars, 'ssl',      $request, $x_scaler, $state_y1, $state_y2);
    AddBarIfValid($bars, 'connect',  $request, $x_scaler, $state_y1, $state_y2);
    AddBarIfValid($bars, 'dns',      $request, $x_scaler, $state_y1, $state_y2);
    return $bars;
}

/**
* Append a bar for a request part if it exists and is valid.
*/
function AddBarIfValid(&$bars, $key, $request, $x_scaler, $y1, $y2) {
    $start_key = $key . '_start';
    $end_key = $key . '_end';
    if (array_key_exists($start_key, $request) &&
        array_key_exists($end_key, $request) &&
        $request[$end_key] > 0) {
        $x1 = $x_scaler($request[$start_key]);
        $x2 = $x_scaler($request[$end_key]);
        $bars[] = array(
            $x1,
            $x2,
            $y1,
            $y2,
            $request['colors'][$key]
            );
    }
}

/**
* Insert an interactive waterfall into the current page
* 
*/
function InsertWaterfall($url, &$requests, $id, $run, $cached, &$page_data, $waterfall_options = '') {
    global $settings;
    
    // create the image map (this is for fallback when Javascript isn't enabled
    // but also gives us the position for each request)
    echo '<map name="waterfall_map">';
    $options = array(
        'id' => $id,
        'path' => './' . GetTestPath($id),
        'run_id' => $run,
        'is_cached' => @$_GET['cached'],
        'use_cpu' => true,
        'show_labels' => true,
        'width' => 930
        );
    $rows = GetRequestRows($requests, false);
    $map = GetWaterfallMap($rows, $url, $options, $page_data);
    foreach($map as $entry) {
        if (array_key_exists('request', $entry)) {
            $index = $entry['request'] + 1;
            $title = $index . ': ' . htmlspecialchars($entry['url']);
            echo '<area href="#request' . $index . '" alt="' . $title . '" title="' . $title . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
        } elseif (array_key_exists('url', $entry)) {
            echo '<area href="#request" alt="' . $entry['url'] . '" title="' . $entry['url'] . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
        } elseif (array_key_exists('userTime', $entry)) {
            echo '<area nohref="nohref" alt="' . $entry['userTime'] . '" title="' . $entry['userTime'] . '" shape=RECT coords="' . $entry['left'] . ',' . $entry['top'] . ',' . $entry['right'] . ',' . $entry['bottom'] . '">' . "\n";
        }
    }
    echo '</map>';
    
    // main container for the waterfall
    echo '<div class="waterfall-container">';
    echo "<img class=\"waterfall-image\" alt=\"\" onload=\"markUserTime('aft.Waterfall')\" usemap=\"#waterfall_map\" id=\"waterfall\" src=\"/waterfall.php?test=$id&run=$run&cached=$cached$waterfall_options\">";

    // draw div's over each of the waterfall elements (use the image map as a reference)
    foreach($map as $entry) {
        if (isset($entry['request'])) {
            $index = $entry['request'] + 1;
            $top = $entry['top'];
            $height = abs($entry['bottom'] - $entry['top']) + 1;
            $tooltip = "$index: {$entry['url']}";
            if (strlen($tooltip) > 100) {
                $split = strpos($tooltip, '?');
                if ($split !== false)
                    $tooltip = substr($tooltip, 0, $split) . '...';
                $tooltip = FitText($tooltip, 100);
            }
            echo "<div class=\"transparent request-overlay\" id=\"request-overlay-$index\" title=\"$tooltip\" onclick=\"SelectRequest($index)\" style=\"position: absolute; top: {$top}px; height: {$height}px;\"></div>\n";
        }
    }

    ?>
    <div id="request-dialog" class="jqmDialog">
        <div id="dialog-header" class="jqmdTC jqDrag">
            <div id="dialog-title"></div>
            <div id="request-dialog-radio">
                <span id="request-details-button"><input type="radio" id="radio1" value="request-details" name="radio" checked="checked" /><label for="radio1">Details</label></span>
                <span id="request-headers-button"><input type="radio" id="radio2" value="request-headers" name="radio" /><label for="radio2">Request</label></span>
                <span id="response-headers-button"><input type="radio" id="radio3" value="response-headers" name="radio" /><label for="radio3">Response</label></span>
                <span id="response-body-button"><input type="radio" id="radio4" value="response-body" name="radio" /><label for="radio4">Object</label></span>
            </div>
        </div>
        <div class="jqmdBC">
            <div id="dialog-contents" class="jqmdMSG">
                <div id="request-details" class="dialog-tab-content"></div>
                <div id="request-headers" class="dialog-tab-content"></div>
                <div id="response-headers" class="dialog-tab-content"></div>
                <div id="response-body" class="dialog-tab-content"></div>
            </div>
        </div>
        <div class="jqmdX jqmClose"></div>
    </div>
    <div id="marker"></div>
    <?php

    echo '</div>'; // container
    
    // script support
    echo "<script type=\"text/javascript\">\n";
    echo "var wptRequestCount=" . count($requests) . ";\n";
    echo "var wptRequestData=" . json_encode($requests) . ";\n";
    echo "var wptNoLinks={$settings['nolinks']};\n";
    echo "</script>";
}

function InsertMultiWaterfall(&$waterfalls, $waterfall_options) {
  require_once('./object_detail.inc');
  $opacity = number_format(1.0 / count($waterfalls), 2, '.', '');
  echo '<div class="waterfall-container" style="text-align: left;margin-top:10em;">';
  echo 'Waterfall Opacity (adjust sliders to adjust the transparency of the given waterfall):<br>';
  echo '<table>';
  if (count($waterfalls) == 2) {
    echo "<tr><td>{$waterfalls[0]['label']}</td><td><input type=\"range\" class=\"waterfall-transparency\" name=\"waterfall-1\" min=\"0.0\" max=\"1.0\" step=\"0.01\" value=\"0.5\"></td><td>{$waterfalls[1]['label']}</tr></td>";
  } else {
    foreach($waterfalls as $index => &$waterfall) {
      $o = $index ? $opacity : '1.0';
      echo '<tr>';
      echo "<td>{$waterfall['label']}</td><td><input type=\"range\" class=\"waterfall-transparency\" name=\"waterfall-$index\" min=\"0.0\" max=\"1.0\" step=\"0.01\" value=\"$o\"></td>";
      echo '</tr>';
    }
  }
  echo '</table>';
  echo '</div>';

  $row_count = 0;
  foreach($waterfalls as $index => &$waterfall) {
    $test_path = null;
    $requests = getRequests($waterfall['id'], $test_path, $waterfall['run'], $waterfall['cached'], $has_secure_requests, $has_locations, false, false);
    if (isset($requests) && is_array($requests)) {
      $count = count($requests);
      if ($count > $row_count)
        $row_count = $count;
    }
  }
  
  $height_style = '';
  if ($row_count) {
    $row_height = imagefontheight(2) + 4;
    $data_header_height = intval($row_height * 3 / 2);
    $data_footer_height = $row_height;
    $height = ($data_header_height + ($row_height * $row_count) +
              $data_footer_height + 2) + 100;
    $height += (2 * $row_height) + 2;
    $height_style = "height:{$height}px;";
  }
  echo "<div style=\"background-color: #fff;$height_style\" class=\"waterfall-container\">";
  foreach($waterfalls as $index => &$waterfall) {
    $o = $index ? $opacity : '1.0';
    echo "<img style=\"display:block;opacity:$o;position:absolute;top:0;left:0;\" class=\"waterfall-image\" alt=\"\" id=\"waterfall-$index\" src=\"/waterfall.php?test={$waterfall['id']}&run={$waterfall['run']}&cached={$waterfall['cached']}&rowcount=$row_count$waterfall_options\">";
  }
  echo '<div id="marker"></div>';
  echo '</div>';
}
?>
