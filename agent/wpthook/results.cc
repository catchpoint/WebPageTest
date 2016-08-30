/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "StdAfx.h"
#include "optimization_checks.h"
#include "results.h"
#include "shared_mem.h"
#include "requests.h"
#include "track_sockets.h"
#include "track_dns.h"
#include "test_state.h"
#include "screen_capture.h"
#include "trace.h"
#include "../wptdriver/wpt_test.h"
#include "cximage/ximage.h"
#include <zlib.h>
#include <zip.h>
#include <regex>

static const TCHAR * PAGE_DATA_FILE = _T("_IEWPG.txt");
static const TCHAR * REQUEST_DATA_FILE = _T("_IEWTR.txt");
static const TCHAR * REQUEST_HEADERS_DATA_FILE = _T("_report.txt");
static const TCHAR * PROGRESS_DATA_FILE = _T("_progress.csv");
static const TCHAR * STATUS_MESSAGE_DATA_FILE = _T("_status.txt");
static const TCHAR * IMAGE_DOC_COMPLETE = _T("_screen_doc.jpg");
static const TCHAR * IMAGE_FULLY_LOADED = _T("_screen.jpg");
static const TCHAR * IMAGE_FULLY_LOADED_PNG = _T("_screen.png");
static const TCHAR * IMAGE_START_RENDER = _T("_screen_render.jpg");
static const TCHAR * IMAGE_RESPONSIVE_CHECK = _T("_screen_responsive.jpg");
static const TCHAR * CONSOLE_LOG_FILE = _T("_console_log.json");
static const TCHAR * TIMED_EVENTS_FILE = _T("_timed_events.json");
static const TCHAR * CUSTOM_METRICS_FILE = _T("_metrics.json");
static const TCHAR * USER_TIMING_FILE = _T("_user_timing.json");
static const TCHAR * TRACE_FILE = _T("_trace.json");
static const TCHAR * CUSTOM_RULES_DATA_FILE = _T("_custom_rules.json");
static const TCHAR * PRIORITY_STREAMS_FILE = _T("_priority_streams.json");
static const DWORD RIGHT_MARGIN = 25;
static const DWORD BOTTOM_MARGIN = 25;
static const DWORD INITIAL_MARGIN = 25;
static const DWORD INITIAL_BOTTOM_MARGIN = 85;  // Ignore for the first frame

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Results::Results(TestState& test_state, WptTest& test, Requests& requests, 
                  TrackSockets& sockets, TrackDns& dns, 
                  ScreenCapture& screen_capture, Trace &trace):
  _requests(requests)
  , _test_state(test_state)
  , _test(test)
  , _sockets(sockets)
  , _dns(dns)
  , _screen_capture(screen_capture)
  , _saved(false)
  , _trace(trace) {
  _visually_complete.QuadPart = 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Results::~Results(void) {
}

/*-----------------------------------------------------------------------------
  Reset the current test results
-----------------------------------------------------------------------------*/
void Results::Reset(void) {
  _requests.Reset();
  _screen_capture.Reset();
  _trace.Reset();
  _saved = false;
  _visually_complete.QuadPart = 0;
  base_page_CDN_.Empty();
  base_page_server_rtt_.Empty();
  base_page_redirects_ = 0;
  base_page_result_ = 0;
  base_page_address_count_ = 0;
  base_page_complete_.QuadPart = 0;;
  adult_site_ = false;
  count_connect_ = 0;
  count_connect_doc_ = 0;
  count_dns_ = 0;
  count_dns_doc_ = 0;
  count_ok_ = 0;
  count_ok_doc_ = 0;
  count_redirect_ = 0;
  count_redirect_doc_ = 0;
  count_not_modified_ = 0;
  count_not_modified_doc_ = 0;
  count_not_found_ = 0;
  count_not_found_doc_ = 0;
  count_other_ = 0;
  count_other_doc_ = 0;
  peak_memory_ = 0;
  peak_process_count_ = 0;
}

/*-----------------------------------------------------------------------------
  Save the results out to the appropriate files
-----------------------------------------------------------------------------*/
void Results::Save(void) {
  WptTrace(loglevel::kFunction, _T("[wpthook] - Results::Save()\n"));
  if (!_saved) {
    ProcessRequests();
    if (_test._log_data) {
      OptimizationChecks checks(_requests, _test_state, _test, _dns);
      checks.Check();
      base_page_CDN_ = checks._base_page_CDN;
      SaveRequests(checks);
      SaveImages();
      SaveProgressData();
      SaveStatusMessages();
      SavePageData(checks);
      SaveResponseBodies();
      SaveConsoleLog();
      SaveTimedEvents();
      SaveCustomMetrics();
      SaveUserTiming();
      SavePriorityStreams();
      _trace.Write(_test_state._file_base + TRACE_FILE);
    }
    if (shared_result == -1 || shared_result == 0 || shared_result == 99999)
      shared_result = _test_state._test_result;
    _saved = true;
  }
  WptTrace(loglevel::kFunction, _T("[wpthook] - Results::Save() complete\n"));
}

/*-----------------------------------------------------------------------------
  Save the cpu, memory and bandwidth progress data during the test.
-----------------------------------------------------------------------------*/
void Results::SaveProgressData(void) {
  CStringA progress;
  _test_state.Lock();
  POSITION pos = _test_state._progress_data.GetHeadPosition();
  peak_memory_ = 0;
  peak_process_count_ = 0;
  while( pos ) {
    if (progress.IsEmpty())
      progress = "Offset Time (ms),Bandwidth In (kbps),"
                  "CPU Utilization (%),Memory Use (KB)\r\n";
    ProgressData data = _test_state._progress_data.GetNext(pos);
    DWORD ms = _test_state.ElapsedMsFromStart(data._time);
    CStringA buff;
    buff.Format("%d,%d,%0.2f,%d\r\n", ms, data._bpsIn, data._cpu, data._mem );
    progress += buff;
    if (data._mem > peak_memory_)
      peak_memory_ = data._mem;
    if (data._process_count > peak_process_count_)
      peak_process_count_ = data._process_count;
  }
  _test_state.UnLock();
  HANDLE hFile = CreateFile(_test_state._file_base + PROGRESS_DATA_FILE,
                            GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, 0);
  if (hFile != INVALID_HANDLE_VALUE) {
    DWORD dwBytes;
    WriteFile(hFile, (LPCSTR)progress, progress.GetLength(), &dwBytes, 0);
    CloseHandle(hFile);
  }
}

/*-----------------------------------------------------------------------------
  Save the browser status messages
-----------------------------------------------------------------------------*/
void Results::SaveStatusMessages(void) {
  CStringA status;
  _test_state.Lock();
  POSITION pos = _test_state._status_messages.GetHeadPosition();
  while( pos )
  {
    StatusMessage data = _test_state._status_messages.GetNext(pos);
    status += FormatTime(data._time);
    status += CT2A(data._status, CP_UTF8);
    status += "\r\n";
  }
  _test_state.UnLock();
  HANDLE hFile = CreateFile(_test_state._file_base + STATUS_MESSAGE_DATA_FILE, 
                            GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, 0);
  if( hFile != INVALID_HANDLE_VALUE )
  {
    DWORD dwBytes;
    WriteFile(hFile, (LPCSTR)status, status.GetLength(), &dwBytes, 0);
    CloseHandle(hFile);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveImages(void) {
  // save the event-based images
  CxImage image;
  if (_screen_capture.GetImage(CapturedImage::START_RENDER, image))
    SaveImage(image, _test_state._file_base + IMAGE_START_RENDER, _test._image_quality, false, _test._full_size_video);
  if (_screen_capture.GetImage(CapturedImage::DOCUMENT_COMPLETE, image))
    SaveImage(image, _test_state._file_base + IMAGE_DOC_COMPLETE, _test._image_quality, false, _test._full_size_video);
  if (_screen_capture.GetImage(CapturedImage::FULLY_LOADED, image)) {
    if (_test._png_screen_shot)
      image.Save(_test_state._file_base + IMAGE_FULLY_LOADED_PNG, CXIMAGE_FORMAT_PNG);
    SaveImage(image, _test_state._file_base + IMAGE_FULLY_LOADED, _test._image_quality, false, _test._full_size_video);
  }
  if (_screen_capture.GetImage(CapturedImage::RESPONSIVE_CHECK, image)) {
    SaveImage(image, _test_state._file_base + IMAGE_RESPONSIVE_CHECK, _test._image_quality,
              true, _test._full_size_video);
  }

  SaveVideo();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveVideo(void) {
  _screen_capture.Lock();
  CStringA histograms = "[";
  DWORD histogram_count = 0;
  CxImage * last_image = NULL;
  DWORD width, height;
  CString file_name;
  POSITION pos = _screen_capture._captured_images.GetHeadPosition();
  DWORD bottom_margin = INITIAL_BOTTOM_MARGIN;
  DWORD margin = INITIAL_MARGIN;
  while (pos) {
    CStringA histogram;
    CapturedImage& image = _screen_capture._captured_images.GetNext(pos);
    if (image._type != CapturedImage::RESPONSIVE_CHECK) {
      CxImage * img = new CxImage;
      if (image.Get(*img)) {
        DWORD image_time_ms = _test_state.ElapsedMsFromStart(image._capture_time);
        // we save the frames in increments of 100ms (for now anyway)
        // round it to the closest interval
        DWORD image_time = ((image_time_ms + 50) / 100);
        if (last_image) {
          RGBQUAD black = {0,0,0,0};
          if (img->GetWidth() > width)
            img->Crop(0, 0, img->GetWidth() - width, 0);
          if (img->GetHeight() > height)
            img->Crop(0, 0, 0, img->GetHeight() - height);
          if (img->GetWidth() < width)
            img->Expand(0, 0, width - img->GetWidth(), 0, black);
          if (img->GetHeight() < height)
            img->Expand(0, 0, 0, height - img->GetHeight(), black);
          if (ImagesAreDifferent(last_image, img, bottom_margin, margin)) {
            bottom_margin = BOTTOM_MARGIN;
            margin = 0;
            if (!_test_state._render_start.QuadPart)
              _test_state._render_start.QuadPart = image._capture_time.QuadPart;
            histogram = GetHistogramJSON(*img);
            if (_test._video) {
              _visually_complete.QuadPart = image._capture_time.QuadPart;
              file_name.Format(_T("%s_progress_%04d.jpg"), (LPCTSTR)_test_state._file_base, 
                                image_time);
              SaveImage(*img, file_name, _test._image_quality, false, _test._full_size_video);
            }
          }
        } else {
          width = img->GetWidth();
          height = img->GetHeight();
          // always save the first image at time zero
          image_time = 0;
          image_time_ms = 0;
          histogram = GetHistogramJSON(*img);
          if (_test._video) {
            file_name = _test_state._file_base + _T("_progress_0000.jpg");
            SaveImage(*img, file_name, _test._image_quality, false, _test._full_size_video);
          }
        }

        if (!histogram.IsEmpty()) {
          if (histogram_count)
            histograms += ", ";
          histograms += "{\"histogram\": ";
          histograms += histogram;
          histograms += ", \"time\": ";
          CStringA buff;
          buff.Format("%d", image_time_ms);
          histograms += buff;
          histograms += "}";
          histogram_count++;
          if (_test._video) {
            file_name.Format(_T("%s_progress_%04d.hist"), (LPCTSTR)_test_state._file_base,
                             image_time);
            SaveHistogram(histogram, file_name);
          }
        }

        if (last_image)
          delete last_image;
        last_image = img;
      }
      else
        delete img;
    }
  }

  if (last_image)
    delete last_image;

  if (histogram_count > 1) {
    histograms += "]";
    TCHAR path[MAX_PATH];
    lstrcpy(path, _test_state._file_base);
    TCHAR * file = PathFindFileName(path);
    int run = _tstoi(file);
    if (run) {
      int cached = _tcsstr(file, _T("_Cached")) ? 1 : 0;
      *file = 0;

      // file_name needs to include step prefix for multistep measurements
      if (_test_state.reported_step_ > 1) {
        file_name.Format(_T("%s%d.%d.%d.histograms.json"),
                         path, run, _test_state.reported_step_, cached);
      } else {
        file_name.Format(_T("%s%d.%d.histograms.json"), path, run, cached);
      }
      SaveHistogram(histograms, file_name);
    }
  }

  _screen_capture.Unlock();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Results::ImagesAreDifferent(CxImage * img1, CxImage* img2,
                                 DWORD bottom_margin, DWORD margin) {
  bool different = false;
  if (img1 && img2 && img1->GetWidth() == img2->GetWidth() && 
      img1->GetHeight() == img2->GetHeight() && 
      img1->GetBpp() == img2->GetBpp()) {
      if (img1->GetBpp() >= 15) {
        DWORD pixel_bytes = 3;
        if (img1->GetBpp() == 32)
          pixel_bytes = 4;
        DWORD width = max(img1->GetWidth() - RIGHT_MARGIN - margin, 0);
        DWORD height = img1->GetHeight() - margin;
        DWORD row_bytes = img1->GetEffWidth();
        DWORD compare_length = min(width * pixel_bytes, row_bytes);
        for (DWORD row = bottom_margin; row < height && !different; row++) {
          BYTE * r1 = img1->GetBits(row) + margin * pixel_bytes;
          BYTE * r2 = img2->GetBits(row) + margin * pixel_bytes;
          if (r1 && r2 && memcmp(r1, r2, compare_length))
            different = true;
        }
      }
  }
  else
    different = true;
  return different;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveImage(CxImage& image, CString file, BYTE quality,
                        bool force_small, bool _full_size_video) {
  if (image.IsValid()) {
    CxImage img(image);
    if (!_full_size_video)
      if (force_small || (img.GetWidth() > 600 && img.GetHeight() > 600))
        img.Resample2(img.GetWidth() / 2, img.GetHeight() / 2);

    img.SetCodecOption(8, CXIMAGE_FORMAT_JPG);  // optimized encoding
    img.SetCodecOption(16, CXIMAGE_FORMAT_JPG); // progressive
    img.SetJpegQuality((BYTE)quality);
    img.Save(file, CXIMAGE_FORMAT_JPG);
  }
}


/*-----------------------------------------------------------------------------
  Calculate the image histogram as a json data structure (ignoring white pixels)
-----------------------------------------------------------------------------*/
CStringA Results::GetHistogramJSON(CxImage& image) {
  CStringA histogram;
  if (image.IsValid()) {
    DWORD r[256], g[256], b[256];
    for (int i = 0; i < 256; i++) {
      r[i] = g[i] = b[i] = 0;
    }
    DWORD width = max(image.GetWidth() - RIGHT_MARGIN, 0);
    DWORD height = image.GetHeight();
    for (DWORD y = BOTTOM_MARGIN; y < height; y++) {
      for (DWORD x = 0; x < width; x++) {
        RGBQUAD pixel = image.GetPixelColor(x,y);
        if (pixel.rgbRed != 255 || 
            pixel.rgbGreen != 255 || 
            pixel.rgbBlue != 255) {
          r[pixel.rgbRed]++;
          g[pixel.rgbGreen]++;
          b[pixel.rgbBlue]++;
        }
      }
    }
    CStringA red = "\"r\":[";
    CStringA green = "\"g\":[";
    CStringA blue = "\"b\":[";
    CStringA buff;
    for (int i = 0; i < 256; i++) {
      if (i) {
        red += ",";
        green += ",";
        blue += ",";
      }
      buff.Format("%d", r[i]);
      red += buff;
      buff.Format("%d", g[i]);
      green += buff;
      buff.Format("%d", b[i]);
      blue += buff;
    }
    red += "]";
    green += "]";
    blue += "]";
    histogram = CStringA("{") + red + 
                CStringA(",") + green + 
                CStringA(",") + blue + CStringA("}");
  }
  return histogram;
}

/*-----------------------------------------------------------------------------
  Save the image histogram as a json data structure (ignoring white pixels)
-----------------------------------------------------------------------------*/
void Results::SaveHistogram(CStringA& histogram, CString file) {
  if (!histogram.IsEmpty()) {
    HANDLE file_handle = CreateFile(file, GENERIC_WRITE, 0, 0, 
                                    CREATE_ALWAYS, 0, 0);
    if (file_handle != INVALID_HANDLE_VALUE) {
      DWORD bytes;
      WriteFile(file_handle, (LPCSTR)histogram, histogram.GetLength(), &bytes, 0);
      CloseHandle(file_handle);
    }
  }
}

/*-----------------------------------------------------------------------------
  Save the page-level data
-----------------------------------------------------------------------------*/
void Results::SavePageData(OptimizationChecks& checks){
  HANDLE file = CreateFile(_test_state._file_base + PAGE_DATA_FILE,
                           GENERIC_WRITE, 0, NULL, OPEN_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    SetFilePointer( file, 0, 0, FILE_END );

    CStringA result;
    CStringA buff;

    // build up the string of data fileds for the page result

    // Date
    buff.Format("%02d/%02d/%d\t", _test_state._start_time.wMonth,
          _test_state._start_time.wDay, _test_state._start_time.wYear);
    result += buff;
    // Time
    buff.Format("%02d:%02d:%02d\t", _test_state._start_time.wHour,
          _test_state._start_time.wMinute, _test_state._start_time.wSecond);
    result += buff;
    // Event Name
    result += _test_state.current_step_name_ + "\t";
    // URL
    result += CStringA((LPCSTR)CT2A(_test._navigated_url)) + "\t";
    // Load Time (ms)
    CStringA formatted_on_load = FormatTime(_test_state._on_load);
    result += formatted_on_load;
    // Time to First Byte (ms)
    result += FormatTime(_test_state._first_byte);
    // unused
    result += "\t";
    // Bytes Out
    buff.Format("%d\t", _test_state._bytes_out);
    result += buff;
    // Bytes In
    buff.Format("%d\t", _test_state._bytes_in);
    result += buff;
    // DNS Lookups
    buff.Format("%d\t", count_dns_);
    result += buff;
    // Connections
    buff.Format("%d\t", count_connect_);
    result += buff;
    // Requests
    buff.Format("%d\t", _test_state._requests);
    result += buff;
    // OK Responses
    buff.Format("%d\t", count_ok_);
    result += buff;
    // Redirects
    buff.Format("%d\t", count_redirect_);
    result += buff;
    // Not Modified
    buff.Format("%d\t", count_not_modified_);
    result += buff;
    // Not Found
    buff.Format("%d\t", count_not_found_);
    result += buff;
    // Other Responses
    buff.Format("%d\t", count_other_);
    result += buff;
    // Error Code
    buff.Format("%d\t", _test_state._test_result);
    result += buff;
    // Time to Start Render (ms)
    result += FormatTime(_test_state._render_start);
    // Segments Transmitted
    result += "\t";
    // Segments Retransmitted
    result += "\t";
    // Packet Loss (out)
    result += "\t";
    // Activity Time(ms)
    if (_test_state._last_activity.QuadPart >
        _test_state._on_load.QuadPart) {
      result += FormatTime(_test_state._last_activity);
    } else {
      result += formatted_on_load;
    }
    // Descriptor
    result += "\t";
    // Lab ID
    result += "\t";
    // Dialer ID
    result += "\t";
    // Connection Type
    result += "\t";
    // Cached
    if (shared_cleared_cache)
      result += "0\t";
    else
      result += "1\t";
    // Event URL
    result += "\t";
    // Pagetest Build
    result += "\t";
    // Measurement Type
    if (_test._doc_complete)
      result += "1\t";
    else
      result += "2\t";
    // Experimental
    result += "0\t";
    // Doc Complete Time (ms)
    result += formatted_on_load;
    // Event GUID
    result += "\t";
    // Time to DOM Element (ms)
    if (_test_state._dom_elements_time.QuadPart > 0) {
      result += FormatTime(_test_state._dom_elements_time);
    } else {
      result += "\t";
    }
    // Includes Object Data
    result += "1\t";
    // Cache Score
    buff.Format("%d\t", checks._cache_score);
    result += buff;
    // Static CDN Score
    buff.Format("%d\t", checks._static_cdn_score);
    result += buff;
    // One CDN Score.
    // TODO: Eliminate it completely (both client and wpt server).
    result += "-1\t";
    // GZIP Score
    buff.Format("%d\t", checks._gzip_score);
    result += buff;
    // Cookie Score
    result += "-1\t";
    // Keep-Alive Score
    buff.Format("%d\t", checks._keep_alive_score);
    result += buff;
    // DOCTYPE Score
    result += "-1\t";
    // Minify Score
    result += "-1\t";
    // Combine Score
    buff.Format("%d\t", checks._combine_score);
    result += buff;
    // Bytes Out (Doc)
    buff.Format("%d\t", _test_state._doc_bytes_out);
    result += buff;
    // Bytes In (Doc)
    buff.Format("%d\t", _test_state._doc_bytes_in);
    result += buff;
    // DNS Lookups (Doc)
    buff.Format("%d\t", count_dns_doc_);
    result += buff;
    // Connections (Doc)
    buff.Format("%d\t", count_connect_doc_);
    result += buff;
    // Requests (Doc)
    buff.Format("%d\t", _test_state._doc_requests);
    result += buff;
    // OK Responses (Doc)
    buff.Format("%d\t", count_ok_doc_);
    result += buff;
    // Redirects (Doc)
    buff.Format("%d\t", count_redirect_doc_);
    result += buff;
    // Not Modified (Doc)
    buff.Format("%d\t", count_not_modified_doc_);
    result += buff;
    // Not Found (Doc)
    buff.Format("%d\t", count_not_found_doc_);
    result += buff;
    // Other Responses (Doc)
    buff.Format("%d\t", count_other_doc_);
    result += buff;
    // Compression Score
    buff.Format("%d\t", checks._image_compression_score);
    result += buff;
    // Host
    result += "\t";
    // IP Address
    result += "\t";
    // ETag Score
    result += "-1\t";
    // Flagged Requests
    result += "\t";
    // Flagged Connections
    result += "\t";
    // Max Simultaneous Flagged Connections
    result += "\t";
    // Time to Base Page Complete (ms)
    result += FormatTime(base_page_complete_);
    // Base Page Result
    buff.Format("%d\t", base_page_result_);
    result += buff;
    // Gzip Total Bytes
    buff.Format("%d\t", checks._gzip_total);
    result += buff;
    // Gzip Savings
    buff.Format("%d\t", checks._gzip_total - checks._gzip_target);
    result += buff;
    // Minify Total Bytes
    result += "\t";
    // Minify Savings
    result += "\t";
    // Image Compression Total Bytes
    buff.Format("%d\t", checks._image_compress_total);
    result += buff;
    // Image Compression Savings
    buff.Format("%d\t",
      checks._image_compress_total - checks._image_compress_target);
    result += buff;
    // Base Page Redirects
    buff.Format("%d\t", base_page_redirects_);
    result += buff;
    // Optimization Checked (all optimization checks are implemented).
    if (checks._checked)
      result += "1\t";
    else
      result += "0\t";
    // AFT (ms) (no longer supported)
    result += "\t";
    // DOM Element Count
    buff.Format("%d\t", _test_state._dom_element_count);
    result += buff;
    // Page Speed Version
    result += "\t";
    // Page Title
    if (!_test_state._title.IsEmpty()) {
      _test_state._title.Replace(_T('\t'), _T(' '));
      result += CT2A(_test_state._title, CP_UTF8);
    }
    result += "\t";
    // Time to title (ms)
    result += FormatTime(_test_state._title_time);
    // W3C Navigation timings
    buff.Format("%d\t", _test_state._load_event_start);
    result += buff;
    buff.Format("%d\t", _test_state._load_event_end);
    result += buff;
    buff.Format("%d\t", _test_state._dom_content_loaded_event_start);
    result += buff;
    buff.Format("%d\t", _test_state._dom_content_loaded_event_end);
    result += buff;
    // Visually complete
    result += FormatTime(_visually_complete);
    // Browser name
    result += _test_state._browser_name;
    result += "\t";
    // Browser Version
    result += _test_state._browser_version;
    result += "\t";
    // Base Page Server Count
    buff.Format("%d\t", base_page_address_count_);
    result += buff;
    // Base Page Server RTT
    result += base_page_server_rtt_ + "\t";
    // Base Page CDN Name
    result += base_page_CDN_ + "\t";
    // Adult Site
    if (adult_site_) {
      result += "1\t";
    } else {
      result += "0\t";
    }
    // Fixed Viewport
    buff.Format("%d\t", _test_state._fixed_viewport);
    result += buff;
    // Progressive JPEG Score
    buff.Format("%d\t", checks._progressive_jpeg_score);
    result += buff;
    // W3C Navigation timing first paint (MS-specific right now)
    buff.Format("%d\t", _test_state._first_paint);
    result += buff;
    // Peak memory allocation across all browser processes
    buff.Format("%d\t", peak_memory_);
    result += buff;
    // Peak number of running browser processes
    buff.Format("%d\t", peak_process_count_);
    result += buff;
    // Doc Complete CPU time
    double doc_cpu_time = 0;
    double full_cpu_time = 0;
    double doc_total_time = 0;
    double full_total_time = 0;
    _test_state.GetElapsedCPUTimes(doc_cpu_time, full_cpu_time,
                                   doc_total_time, full_total_time);
    if (doc_cpu_time > 0.0) {
      buff.Format("%0.3f\t", doc_cpu_time);
      result += buff;
    } else
      result += "\t";
    // Fully Loaded CPU time
    if (full_cpu_time > 0.0) {
      buff.Format("%0.3f\t", full_cpu_time);
      result += buff;
    } else
      result += "\t";
    // Doc Complete CPU Utilization
    if (doc_cpu_time > 0.0 && doc_total_time > 0.0) {
      int utilization =
          min((int)(((doc_cpu_time / doc_total_time) * 100) + 0.5), 100);
      shared_cpu_utilization = utilization;
      buff.Format("%d\t", utilization);
      result += buff;
    } else
      result += "\t";
    // Fully Loaded CPU Utilization
    if (full_cpu_time > 0.0 && full_total_time > 0.0) {
      int utilization =
          min((int)(((full_cpu_time / full_total_time) * 100) + 0.5), 100);
      buff.Format("%d\t", utilization);
      result += buff;
    } else
      result += "\t";
    // Is Responsive
    buff.Format("%d\t", _test_state._is_responsive);
    result += buff;
    // Browser Process Count
    buff.Format("%u\t", _test_state._process_count);
    result += buff;
    // Main Process Working Set
    buff.Format("%u\t", _test_state._working_set_main_proc);
    result += buff;
    // Other Processes Private Working Set
    buff.Format("%u\t", _test_state._working_set_child_procs);
    result += buff;
    // DOM Interactive
    buff.Format("%d\t", _test_state._dom_interactive);
    result += buff;
    // DOM Loading
    buff.Format("%d\t", _test_state._dom_loading);
    result += buff;

    result += "\r\n";

    DWORD written;
    WriteFile(file, (LPCSTR)result, result.GetLength(), &written, 0);

    CloseHandle(file);
  }
}

void Results::ProcessRequests(void) {
  count_connect_ = 0;
  count_connect_doc_ = 0;
  count_dns_ = 0;
  count_dns_doc_ = 0;
  count_ok_ = 0;
  count_ok_doc_ = 0;
  count_redirect_ = 0;
  count_redirect_doc_ = 0;
  count_not_modified_ = 0;
  count_not_modified_doc_ = 0;
  count_not_found_ = 0;
  count_not_found_doc_ = 0;
  count_other_ = 0;
  count_other_doc_ = 0;

  _requests.Lock();
  // first pass, reset the actual start time to be the first measured action
  // to eliminate the gap at startup for browser initialization
  if (_test_state._start.QuadPart) {
    LONGLONG new_start = 0;
    if (_test_state._first_navigate.QuadPart &&
        _test_state._first_navigate.QuadPart > _test_state._start.QuadPart)
      new_start = _test_state._first_navigate.QuadPart;
    POSITION pos = _requests._requests.GetHeadPosition();
    while (pos) {
      Request * request = _requests._requests.GetNext(pos);
      if (request &&
          request->_start.QuadPart &&
          request->_end.QuadPart &&
          (!request->_from_browser || !NativeRequestExists(request))) {
        request->MatchConnections();
        if (request->_start.QuadPart &&
            request->_start.QuadPart > _test_state._start.QuadPart &&
            (!new_start || request->_start.QuadPart < new_start))
          new_start = request->_start.QuadPart;
        if (request->_dns_start.QuadPart &&
            request->_dns_start.QuadPart > _test_state._start.QuadPart &&
            (!new_start || request->_dns_start.QuadPart < new_start))
          new_start = request->_dns_start.QuadPart;
        if (request->_connect_start.QuadPart &&
            request->_connect_start.QuadPart > _test_state._start.QuadPart &&
            (!new_start || request->_connect_start.QuadPart < new_start))
          new_start = request->_connect_start.QuadPart;
      }
    }
    if (new_start)
      _test_state._start.QuadPart = new_start;
  }

  // Next do all of the processing.  We want to do ALL of the processing
  // before recording the results so we can include any socket connections
  // or DNS lookups that are not associated with a request
  POSITION pos = _requests._requests.GetHeadPosition();
  bool base_page = true;
  base_page_redirects_ = 0;
  adult_site_ = false;
  LONGLONG new_end = 0;
  LONGLONG new_first_byte = 0;
  std::tr1::regex adult_regex("[^0-9a-zA-Z]2257[^0-9a-zA-Z]");
  while (pos) {
    Request * request = _requests._requests.GetNext(pos);
    WptTrace(loglevel::kFunction, _T("[wpthook] - Processing request %S%S"), (LPCSTR)request->GetHost(), (LPCSTR)request->_request_data.GetObject());
    if (request && 
        (!request->_from_browser || !NativeRequestExists(request))) {
      request->Process();
      int result_code = request->GetResult();
      int doc_increment = 0;
      if (request->_start.QuadPart <= _test_state._on_load.QuadPart)
        doc_increment = 1;
      switch (result_code) {
        case 200:
          count_ok_++;
          count_ok_doc_ += doc_increment;
          break;
        case 301:
        case 302:
          count_redirect_++;
          count_redirect_doc_ += doc_increment;
          break;
        case 304:
          count_not_modified_++;
          count_not_modified_doc_ += doc_increment;
          break;
        case 404:
          count_not_found_++;
          count_not_found_doc_ += doc_increment;
          break;
        default:
          count_other_++;
          count_other_ += doc_increment;
          break;
      }
      if (request->_dns_start.QuadPart) {
        count_dns_++;
        count_dns_doc_ += doc_increment;
      }
      if (request->_connect_start.QuadPart) {
        count_connect_++;
        count_connect_doc_ += doc_increment;
      }
      if (base_page) { 
        if (result_code == 301 || result_code == 302 || result_code == 401) {
          base_page_redirects_++;
        } else {
          base_page = false;
          base_page_result_ = result_code;
          base_page_server_rtt_ = request->rtt_;
          base_page_address_count_ = (int)_dns.GetAddressCount(
              (LPCTSTR)CA2T(request->GetHost(), CP_UTF8));
          request->_is_base_page = true;
          base_page_complete_.QuadPart = request->_end.QuadPart;
          if ((!_test_state._test_result ||  _test_state._test_result == 99999)
              && base_page_result_ >= 400) {
            _test_state._test_result = result_code;
          }
          // check for adult content
          if (result_code == 200) {
            DataChunk body_chunk = request->_response_data.GetBody(true);
            CStringA body(body_chunk.GetData(), (int)body_chunk.GetLength());
            if (regex_search((LPCSTR)body, adult_regex) ||
                body.Find("RTA-5042-1996-1400-1577-RTA") >= 0)
              adult_site_ = true;
          }
        }
      }
      new_end = max(new_end, request->_end.QuadPart);
      new_end = max(new_end, request->_start.QuadPart);
      new_end = max(new_end, request->_first_byte.QuadPart);
      new_end = max(new_end, request->_dns_start.QuadPart);
      new_end = max(new_end, request->_dns_end.QuadPart);
      new_end = max(new_end, request->_connect_start.QuadPart);
      new_end = max(new_end, request->_connect_end.QuadPart);
      if (request->_first_byte.QuadPart &&
          result_code != 301 && result_code != 302 && result_code != 401 &&
          (!new_first_byte || request->_first_byte.QuadPart < new_first_byte))
        new_first_byte = request->_first_byte.QuadPart;
    }
  }
  if (new_end)
    _test_state._last_activity.QuadPart = new_end;
  if (new_first_byte)
    _test_state._first_byte.QuadPart = new_first_byte;
  _requests.Unlock();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveRequests(OptimizationChecks& checks) {
  HANDLE file = CreateFile(_test_state._file_base + REQUEST_DATA_FILE,
                           GENERIC_WRITE, 0, NULL, OPEN_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    DWORD bytes;
    CStringA buff;
    SetFilePointer( file, 0, 0, FILE_END );

    HANDLE headers_file = CreateFile(_test_state._file_base + REQUEST_HEADERS_DATA_FILE,
                            GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, 0);

    HANDLE custom_rules_file = INVALID_HANDLE_VALUE;
    if (!_test._custom_rules.IsEmpty()) {
      custom_rules_file = CreateFile(_test_state._file_base +CUSTOM_RULES_DATA_FILE,
                                    GENERIC_WRITE, 0, 0, CREATE_ALWAYS, 0, 0);
      if (custom_rules_file != INVALID_HANDLE_VALUE) {
        WriteFile(custom_rules_file, "{", 1, &bytes, 0);
      }
    }

    _requests.Lock();
    // now record the results
    // do a selection sort to pick out the requests in order of start time
    int i = 0;
    bool first_custom_rule = true;
    Request * request = NULL;
    do {
      request = NULL;
      POSITION pos = _requests._requests.GetHeadPosition();
      while (pos) {
        Request * candidate = _requests._requests.GetNext(pos);
        if (!candidate->_reported && 
            (!request || 
            candidate->_start.QuadPart < request->_start.QuadPart)) {
          request = candidate;
        }
      }
      if (request) {
        request->_reported = true;
        if (request->_processed) {
          i++;
          SaveRequest(file, headers_file, request, i);
          if (!request->_custom_rules_matches.IsEmpty() && 
              custom_rules_file != INVALID_HANDLE_VALUE) {
            if (first_custom_rule) {
              first_custom_rule = false;
            } else {
              WriteFile(custom_rules_file, ",", 1, &bytes, 0);
            }
            buff.Format("\"%d\"", i);
            WriteFile(custom_rules_file, (LPCSTR)buff, buff.GetLength(),
                      &bytes, 0);
            WriteFile(custom_rules_file, ":{", 2, &bytes, 0);
            POSITION match_pos =
                request->_custom_rules_matches.GetHeadPosition();
            DWORD match_count = 0;
            while (match_pos) {
              match_count++;
              CustomRulesMatch match = 
                  request->_custom_rules_matches.GetNext(match_pos);
              CT2A name((LPCTSTR)match._name, CP_UTF8);
              CT2A value((LPCTSTR)match._value, CP_UTF8);
              CStringA entry = "";
              if (match_count > 1)
                entry += ",";
              entry += CStringA("\"") + JSONEscapeA((LPCSTR)name) + "\":{";
              entry += CStringA("\"value\":\"") +
                       JSONEscapeA((LPCSTR)value)+"\",";
              buff.Format("%d", match._count);
              entry += CStringA("\"count\":") + buff + "}";
              WriteFile(custom_rules_file, (LPCSTR)entry, entry.GetLength(), 
                        &bytes, 0);
            }
            WriteFile(custom_rules_file, "}", 1, &bytes, 0);
          }
        }
      }
    } while (request);
    _requests.Unlock();
    if (custom_rules_file != INVALID_HANDLE_VALUE) {
      WriteFile(custom_rules_file, "}", 1, &bytes, 0);
      CloseHandle(custom_rules_file);
    }
    if (headers_file != INVALID_HANDLE_VALUE)
      CloseHandle(headers_file);
    CloseHandle(file);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveRequest(HANDLE file, HANDLE headers, Request * request, 
                                                                   int index) {
  CStringA result;
  CStringA buff;

  WptTrace(loglevel::kFunction, _T("[wpthook] - Saving request %S%S"), (LPCSTR)request->GetHost(), (LPCSTR)request->_request_data.GetObject());

  // Date
  buff.Format("%02d/%02d/%02d\t", _test_state._start_time.wMonth,
        _test_state._start_time.wDay, _test_state._start_time.wYear);
  result += buff;
  // Time
  buff.Format("%02d:%02d:%02d\t", _test_state._start_time.wHour,
        _test_state._start_time.wMinute, _test_state._start_time.wSecond);
  result += buff;
  // Event Name
  result += _test_state.current_step_name_ + "\t";
  // IP Address
  struct sockaddr_in addr;
  addr.sin_addr.S_un.S_addr = request->_peer_address;
  if (addr.sin_addr.S_un.S_addr) {
    buff.Format("%d.%d.%d.%d", addr.sin_addr.S_un.S_un_b.s_b1, 
      addr.sin_addr.S_un.S_un_b.s_b2, addr.sin_addr.S_un.S_un_b.s_b3, 
      addr.sin_addr.S_un.S_un_b.s_b4);
    result += buff;
  }
  result += "\t";
  // Action
  result += request->_request_data.GetMethod() + "\t";
  // Host
  result += request->GetHost() + "\t";
  // URL
  result += request->_request_data.GetObject() + "\t";
  // Response Code
  buff.Format("%d\t", request->_response_data.GetResult());
  result += buff;
  // Time to Load (ms)
  buff.Format("%d\t", request->_ms_end - request->_ms_start);
  result += buff;
  // Time to First Byte (ms)
  if (request->_ms_first_byte >= request->_ms_start) {
    buff.Format("%d\t", request->_ms_first_byte - request->_ms_start);
  } else {
    buff = "\t";
  }
  result += buff;
  // Start Time (ms)
  buff.Format("%d\t", request->_ms_start);
  result += buff;
  // Bytes Out
  buff.Format("%d\t", request->_bytes_out ? request->_bytes_out:
              request->_request_data.GetDataSize());
  result += buff;
  // Bytes In
  buff.Format("%d\t", request->_bytes_in ? request->_bytes_in :
              request->_response_data.GetDataSize());
  result += buff;
  // Object Size
  DWORD size = (DWORD)request->_response_data.GetBody().GetLength();
  if (size <= 0 && request->_object_size > 0)
    size = request->_object_size;
  buff.Format("%d\t", size);
  result += buff;
  // Cookie Size (out)
  result += "\t";
  // Cookie Count(out)
  result += "\t";
  // Expires
  result += request->GetResponseHeader("expires") + "\t";
  // Cache Control
  result += request->GetResponseHeader("cache-control") + "\t";
  // Content Type
  int pos = 0;
  result += request->GetResponseHeader("content-type").Tokenize(";", pos) 
            + "\t";
  // Content Encoding
  result += request->GetResponseHeader("content-encoding") + "\t";
  // Transaction Type (3 = request - legacy reasons)
  result += "3\t";
  // Socket ID
  buff.Format("%d\t", request->_socket_id);
  result += buff;
  // Document ID
  result += "\t";
  // End Time (ms)
  buff.Format("%d\t", request->_ms_end);
  result += buff;
  // Descriptor
  result += "\t";
  // Lab ID
  result += "\t";
  // Dialer ID
  result += "\t";
  // Connection Type
  result += "\t";
  // Cached
  result += "\t";
  // Event URL
  result += "\t";
  // IEWatch Build
  result += "\t";
  // Measurement Type - (DWORD - 1 for web 1.0, 2 for web 2.0)
  result += "\t";
  // Experimental (DWORD)
  result += "\t";
  // Event GUID - (matches with Event GUID in object data) - Added in build 42
  result += "\t";
  // Sequence Number - Incremented for each record in the object data
  buff.Format("%d\t", index);
  result += buff;
  // Cache Score
  buff.Format("%d\t", request->_scores._cache_score);
  result += buff;
  // Static CDN Score
  buff.Format("%d\t", request->_scores._static_cdn_score);
  result += buff;
  // GZIP Score
  buff.Format("%d\t", request->_scores._gzip_score);
  result += buff;
  // Cookie Score
  result += "-1\t";
  // Keep-Alive Score
  buff.Format("%d\t", request->_scores._keep_alive_score);
  result += buff;
  // DOCTYPE Score
  result += "-1\t";
  // Minify Score
  result += "-1\t";
  // Combine Score
  buff.Format("%d\t", request->_scores._combine_score);
  result += buff;
  // Image Compression Score
  buff.Format("%d\t", request->_scores._image_compression_score);
  result += buff;
  // ETag Score
  result += "-1\t";
  // Flagged
  result += "0\t";
  // Secure
  result += request->_is_ssl ? "1\t" : "0\t";
  // DNS Time (ms)
  result += "-1\t";
  // Socket Connect time (ms)
  result += "-1\t";
  // SSL time (ms)
  result += "-1\t";
  // Gzip Total Bytes
  buff.Format("%d\t", request->_scores._gzip_total);
  result += buff;
  // Gzip Savings
  buff.Format("%d\t",
    request->_scores._gzip_total - request->_scores._gzip_target);
  result += buff;
  // Minify Total Bytes
  result += "0\t";
  // Minify Savings
  result += "0\t";
  // Image Compression Total Bytes
  buff.Format("%d\t", request->_scores._image_compress_total);
  result += buff;
  // Image Compression Savings
  buff.Format("%d\t",
    request->_scores._image_compress_total
    - request->_scores._image_compress_target);
  result += buff;
  // Cache Time (sec)
  buff.Format("%d\t", request->_scores._cache_time_secs);
  result += buff;
  // Real Start Time (ms)
  result += "\t";
  // Full Time to Load (ms)
  result += "\t";
  // Optimization Checked
  result += "1\t";
  // CDN Provider
  result += request->_scores._cdn_provider + "\t";
  // DNS start
  buff.Format("%d\t", request->_ms_dns_start);
  result += buff;
  // DNS end
  buff.Format("%d\t", request->_ms_dns_end);
  result += buff;
  // connect start
  buff.Format("%d\t", request->_ms_connect_start);
  result += buff;
  // connect end
  buff.Format("%d\t", request->_ms_connect_end);
  result += buff;
  // ssl negotiation start
  buff.Format("%d\t", request->_ms_ssl_start);
  result += buff;
  // ssl negotiation end
  buff.Format("%d\t", request->_ms_ssl_end);
  result += buff;
  // initiator
  result += request->initiator_.valid_ ? CA2T(request->initiator_.initiator_url_) : _T("");
  result += _T("\t");
  result += request->initiator_.valid_ ? CA2T(request->initiator_.initiator_line_) : _T("");
  result += _T("\t");
  result += request->initiator_.valid_ ? CA2T(request->initiator_.initiator_column_) : _T("");
  result += _T("\t");
  // Server Count
  buff.Format("%d\t",
      _dns.GetAddressCount((LPCTSTR)CA2T(request->GetHost(), CP_UTF8)));
  result += buff;
  // Server RTT
  result += request->rtt_ + "\t";
  // Local Port
  buff.Format("%d\t", request->_local_port);
  result += buff;
  // JPEG scan count
  buff.Format("%d\t", request->_scores._jpeg_scans);
  result += buff;
  // Priority
  result += request->priority_ + "\t";
  // Request ID
  buff.Format("%d\t", request->_request_id);
  result += buff;
  // Server push
  buff.Format("%d\t", request->_was_pushed ? 1:0);
  result += buff;
  // initiator+
  result += request->initiator_.valid_ ? CA2T(request->initiator_.initiator_type_) : _T("");
  result += _T("\t");
  result += request->initiator_.valid_ ? CA2T(request->initiator_.initiator_function_) : _T("");
  result += _T("\t");
  result += request->initiator_.valid_ ? CA2T(request->initiator_.initiator_detail_) : _T("");
  result += _T("\t");
  // Protocol
  result += request->_protocol + _T("\t");
  // HTTP/2 Stream ID
  if (request->_stream_id > 0) {
    buff.Format("%d\t", request->_stream_id);
    result += buff;
  } else {
    result += _T("\t");
  }
  // HTTP/2 Priority depends on
  if (request->_h2_priority_depends_on >= 0) {
    buff.Format("%d\t", request->_h2_priority_depends_on);
    result += buff;
  } else {
    result += _T("\t");
  }
  // HTTP/2 Priority weight
  if (request->_h2_priority_weight >= 0) {
    buff.Format("%d\t", request->_h2_priority_weight);
    result += buff;
  } else {
    result += _T("\t");
  }
  // HTTP/2 Priority exclusive
  if (request->_h2_priority_exclusive >= 0) {
    buff.Format("%d\t", request->_h2_priority_exclusive);
    result += buff;
  } else {
    result += _T("\t");
  }

  result += "\r\n";

  DWORD written;
  WriteFile(file, (LPCSTR)result, result.GetLength(), &written, 0);

  // write out the raw headers
  if (headers != INVALID_HANDLE_VALUE) {
    buff.Format("Request details:\r\nRequest %d:\r\n"
                "RID: %d\r\nRequest Headers:\r\n", 
                index, request->_request_id);
    buff += request->_request_data.GetHeaders();
    buff.Trim("\r\n");
    buff += "\r\nResponse Headers:\r\n";
    buff += request->_response_data.GetHeaders();
    buff.Trim("\r\n");
    buff += "\r\n";
    WriteFile(headers, (LPCSTR)buff, buff.GetLength(), &written, 0);
  }
}


/*-----------------------------------------------------------------------------
  Format as the number of milliseconds since the start (with trailing tab).
-----------------------------------------------------------------------------*/
CStringA Results::FormatTime(LARGE_INTEGER t) {
  CStringA formatted_time;
  formatted_time.Format("%d\t", _test_state.ElapsedMsFromStart(t));
  return formatted_time;
}

/*-----------------------------------------------------------------------------
  Save the bare response bodies in a zip file
  Text resources will be saved if requested.  
  If the bodies were not requested to be saved then  the base page 
  HTML will still be captured
-----------------------------------------------------------------------------*/
void Results::SaveResponseBodies(void) {
  if (_test._save_response_bodies || _test._save_html_body) {
    CString file = _test_state._file_base + _T("_bodies.zip");
    zipFile zip = zipOpen(CT2A(file), APPEND_STATUS_CREATE);
    if (zip) {
      DWORD count = 0;
      DWORD bodies_count = 0;
      bool done = false;
      _requests.Lock();
      POSITION pos = _requests._requests.GetHeadPosition();
      while (pos && !done) {
        Request * request = _requests._requests.GetNext(pos);
        if (request && request->_processed) {
          CString mime =
              request->GetResponseHeader("content-type").MakeLower();
          count++;
          if (request->GetResult() == 200 && 
              ( mime.Find(_T("text/")) >= 0 || 
                mime.Find(_T("javascript")) >= 0 || 
                mime.Find(_T("json")) >= 0))  {
            DataChunk body = request->_response_data.GetBody(true);
            LPBYTE body_data = (LPBYTE)body.GetData();
            size_t body_len = body.GetLength();
            if (body_data && body_len && !IsBinaryContent(body_data, body_len)) {
              CStringA name;
              name.Format("%03d-%d-body.txt", count, request->_request_id);
              if (!zipOpenNewFileInZip(zip, name, 0, 0, 0, 0, 0, 0, Z_DEFLATED, 
                  Z_BEST_COMPRESSION)) {
                zipWriteInFileInZip(zip, body_data, (unsigned int)body_len);
                zipCloseFileInZip(zip);
                bodies_count++;
                if (_test._save_html_body)
                  done = true;
              }
            }
          }
        }
      }
      _requests.Unlock();
      zipClose(zip, 0);
      if(!bodies_count)
        DeleteFile(file);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveConsoleLog(void) {
  CStringA log = CT2A(_test_state.GetConsoleLogJSON());
  if (log.GetLength()) {
    HANDLE file = CreateFile(_test_state._file_base + CONSOLE_LOG_FILE, GENERIC_WRITE, 0, 
                              NULL, CREATE_ALWAYS, 0, 0);
    if (file != INVALID_HANDLE_VALUE) {
      DWORD written;
      WriteFile(file, (LPCSTR)log, log.GetLength(), &written, 0);
      CloseHandle(file);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveTimedEvents(void) {
  CStringA log = CT2A(_test_state.GetTimedEventsJSON(), CP_UTF8);
  if (log.GetLength()) {
    HANDLE file = CreateFile(_test_state._file_base + TIMED_EVENTS_FILE, GENERIC_WRITE, 0, 
                              NULL, CREATE_ALWAYS, 0, 0);
    if (file != INVALID_HANDLE_VALUE) {
      DWORD written;
      WriteFile(file, (LPCSTR)log, log.GetLength(), &written, 0);
      CloseHandle(file);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveCustomMetrics(void) {
  CStringA custom_metrics = CT2A(_test_state._custom_metrics, CP_UTF8);
  if (custom_metrics.GetLength()) {
    HANDLE file = CreateFile(_test_state._file_base + CUSTOM_METRICS_FILE, GENERIC_WRITE, 0, 
                              NULL, CREATE_ALWAYS, 0, 0);
    if (file != INVALID_HANDLE_VALUE) {
      DWORD written;
      WriteFile(file, (LPCSTR)custom_metrics, custom_metrics.GetLength(), &written, 0);
      CloseHandle(file);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveUserTiming(void) {
  CStringA user_timing = CT2A(_test_state._user_timing, CP_UTF8);
  if (user_timing.GetLength()) {
    HANDLE file = CreateFile(_test_state._file_base + USER_TIMING_FILE, GENERIC_WRITE, 0, 
                              NULL, CREATE_ALWAYS, 0, 0);
    if (file != INVALID_HANDLE_VALUE) {
      DWORD written;
      WriteFile(file, (LPCSTR)user_timing, user_timing.GetLength(), &written, 0);
      CloseHandle(file);
    }
  }
}

/*-----------------------------------------------------------------------------
  See if a version of the same request exists but not from the browser.
  This is so we can fall-back to using browser-reported requests just for
  any that we didn't catch at the socket level.
  This is called from inside of a requests lock (critical section)
-----------------------------------------------------------------------------*/
bool Results::NativeRequestExists(Request * browser_request) {
  bool ret = false;
  POSITION pos = _requests._requests.GetHeadPosition();
  CStringA browser_host = browser_request->GetHost();
  if (browser_host.GetLength()) {
    CStringA browser_object = browser_request->_request_data.GetObject();
    while (pos && !ret) {
      Request * request = _requests._requests.GetNext(pos);
      if (request && 
          !request->_from_browser &&
          !browser_host.CompareNoCase(request->GetHost()) &&
          !browser_object.CompareNoCase(request->_request_data.GetObject()))
          ret = true;
    }
  } else
    ret = true;
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SavePriorityStreams() {
  if (!_requests.priority_streams_.IsEmpty()) {
    CStringA json = "{\"connections\":{";
    CStringA buff;
    POSITION connection_pos = _requests.priority_streams_.GetStartPosition();
    bool first_connection = true;
    while (connection_pos) {
      DWORD connection_id = 0;
      PriorityStreams * streams = NULL;
      _requests.priority_streams_.GetNextAssoc(connection_pos, connection_id, streams);
      if (streams && !streams->streams_.IsEmpty()) {
        if (!first_connection)
          json += ",";
        buff.Format("\"%d\":{\"streams\":{", connection_id);
        json += buff;
        POSITION streams_pos = streams->streams_.GetStartPosition();
        bool first_stream = true;
        while (streams_pos) {
          DWORD stream_id = 0;
          HTTP2PriorityStream * stream = NULL;
          streams->streams_.GetNextAssoc(streams_pos, stream_id, stream);
          if (stream && stream->depends_on_ >= 0) {
            if (!first_stream)
              json += ",";
            buff.Format("\"%d\":{\"depends_on\":%d,\"weight\":%d,\"exclusive\":%d}",
                stream_id, stream->depends_on_, stream->weight_, stream->exclusive_);
            json += buff;
            first_stream = false;
          }
        }
        json += "}}";
        first_connection = false;
      }
    }
    json += "}}";
    HANDLE file = CreateFile(_test_state._file_base + PRIORITY_STREAMS_FILE, GENERIC_WRITE, 0, 
                              NULL, CREATE_ALWAYS, 0, 0);
    if (file != INVALID_HANDLE_VALUE) {
      DWORD written;
      WriteFile(file, (LPCSTR)json, json.GetLength(), &written, 0);
      CloseHandle(file);
    }
  }
}
