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
#include "aft.h"
#include "optimization_checks.h"
#include "results.h"
#include "shared_mem.h"
#include "requests.h"
#include "track_sockets.h"
#include "track_dns.h"
#include "test_state.h"
#include "screen_capture.h"
#include "../wptdriver/wpt_test.h"
#include "cximage/ximage.h"
#include <zlib.h>
#include <zip.h>

static const TCHAR * PAGE_DATA_FILE = _T("_IEWPG.txt");
static const TCHAR * REQUEST_DATA_FILE = _T("_IEWTR.txt");
static const TCHAR * REQUEST_HEADERS_DATA_FILE = _T("_report.txt");
static const TCHAR * PROGRESS_DATA_FILE = _T("_progress.csv");
static const TCHAR * STATUS_MESSAGE_DATA_FILE = _T("_status.txt");
static const TCHAR * IMAGE_DOC_COMPLETE = _T("_screen_doc.jpg");
static const TCHAR * IMAGE_FULLY_LOADED = _T("_screen.jpg");
static const TCHAR * IMAGE_FULLY_LOADED_PNG = _T("_screen.png");
static const TCHAR * IMAGE_START_RENDER = _T("_screen_render.jpg");
static const TCHAR * IMAGE_AFT = _T("_aft.jpg");
static const TCHAR * CONSOLE_LOG_FILE = _T("_console_log.json");
static const TCHAR * TIMELINE_FILE = _T("_timeline.json");
static const TCHAR * CUSTOM_RULES_DATA_FILE = _T("_custom_rules.json");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Results::Results(TestState& test_state, WptTest& test, Requests& requests, 
                  TrackSockets& sockets, TrackDns& dns, 
                  ScreenCapture& screen_capture):
  _requests(requests)
  , _test_state(test_state)
  , _test(test)
  , _sockets(sockets)
  , _dns(dns)
  , _screen_capture(screen_capture)
  , _saved(false) {
  _file_base = shared_results_file_base;
  _visually_complete.QuadPart = 0;
  WptTrace(loglevel::kFunction, _T("[wpthook] - Results base file: %s"), 
            (LPCTSTR)_file_base);
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
  _saved = false;
  _visually_complete.QuadPart = 0;
}

/*-----------------------------------------------------------------------------
  Save the results out to the appropriate files
-----------------------------------------------------------------------------*/
void Results::Save(void) {
  WptTrace(loglevel::kFunction, _T("[wpthook] - Results::Save()\n"));
  if (!_saved && _test._log_data) {
    ProcessRequests();
    OptimizationChecks checks(_requests, _test_state, _test);
    checks.Check();
    if( _test._aft )
      CalculateAFT();
    SaveRequests(checks);
    SaveImages();
    SaveProgressData();
    SaveStatusMessages();
    SavePageData(checks);
    SaveResponseBodies();
    SaveConsoleLog();
    SaveTimeline();
    _saved = true;
  }
  WptTrace(loglevel::kFunction, _T("[wpthook] - Results::Save() complete\n"));
}


/*-----------------------------------------------------------------------------
  Save the cpu, memory and bandwidth progress data during the test.
-----------------------------------------------------------------------------*/
void Results::CalculateAFT(void) {
  DWORD msAFT = 0;
  ATLTRACE(_T("[wpthook] - Results - CalculateAFT\n"));
  AFT aftEngine(_test._aft_min_changes, _test._aft_early_cutoff);
  aftEngine.SetCrop(0, 12, 12, 0);

  _screen_capture.Lock();
  CxImage * last_image = NULL;
  CString file_name;
  POSITION pos = _screen_capture._captured_images.GetHeadPosition();
  while( pos ) {
    CapturedImage& image = _screen_capture._captured_images.GetNext(pos);
    DWORD image_time = _test_state.ElapsedMsFromStart(image._capture_time);
    CxImage * img = new CxImage;
    if( image.Get(*img) ) {
      img->Resample2(img->GetWidth() / 2, img->GetHeight() / 2);
      if( last_image ) {
        if( ImagesAreDifferent(last_image, img) ) {
          aftEngine.AddImage( img, image_time );
        }
      } 
      else 
        aftEngine.AddImage( img, image_time );

      if (last_image)
        delete last_image;
      last_image = img;
    }
    else
      delete img;
  }

  bool confidence;
  CxImage imgAft;
  aftEngine.Calculate(msAFT, confidence, &imgAft);
  imgAft.Save(_test._file_base + IMAGE_AFT, CXIMAGE_FORMAT_PNG);

  if (last_image)
    delete last_image;
  _screen_capture.Unlock();

  WptTrace(loglevel::kFunction,
    _T("[wpthook] - Results::CalculateAFT() %d ms\n"),
    msAFT);
  _test_state._aft_time_ms = msAFT;
}


/*-----------------------------------------------------------------------------
  Save the cpu, memory and bandwidth progress data during the test.
-----------------------------------------------------------------------------*/
void Results::SaveProgressData(void) {
  CStringA progress;
  POSITION pos = _test_state._progress_data.GetHeadPosition();
  while( pos )
  {
    if( progress.IsEmpty() )
      progress = "Offset Time (ms),Bandwidth In (kbps),"
                  "CPU Utilization (%),Memory Use (KB)\r\n";
    ProgressData data = _test_state._progress_data.GetNext(pos);
    DWORD ms = _test_state.ElapsedMsFromStart(data._time);
    CStringA buff;
    buff.Format("%d,%d,%0.2f,%d\r\n", ms, data._bpsIn, data._cpu, data._mem );
    progress += buff;
  }
  HANDLE hFile = CreateFile(_file_base + PROGRESS_DATA_FILE, GENERIC_WRITE, 0, 
                                NULL, CREATE_ALWAYS, 0, 0);
  if( hFile != INVALID_HANDLE_VALUE )
  {
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
  POSITION pos = _test_state._status_messages.GetHeadPosition();
  while( pos )
  {
    StatusMessage data = _test_state._status_messages.GetNext(pos);
    status += FormatTime(data._time);
    status += CT2A(data._status, CP_UTF8);
    status += "\r\n";
  }
  HANDLE hFile = CreateFile(_file_base + STATUS_MESSAGE_DATA_FILE, 
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
  if (_screen_capture.GetImage(CapturedImage::START_RENDER, image)) {
    SaveImage(image, _file_base + IMAGE_START_RENDER, true, 
              _test._image_quality);
  }
  if (_screen_capture.GetImage(CapturedImage::DOCUMENT_COMPLETE, image)) {
    SaveImage(image, _file_base + IMAGE_DOC_COMPLETE, true, 
              _test._image_quality);
  }
  if (_screen_capture.GetImage(CapturedImage::FULLY_LOADED, image)) {
    if (_test._png_screen_shot)
      image.Save(_file_base + IMAGE_FULLY_LOADED_PNG, CXIMAGE_FORMAT_PNG);
    SaveImage(image, _file_base + IMAGE_FULLY_LOADED, true, 
              _test._image_quality);
  }

  if (_test._video)
    SaveVideo();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveVideo(void) {
  _screen_capture.Lock();
  CxImage * last_image = NULL;
  DWORD width, height;
  CString file_name;
  POSITION pos = _screen_capture._captured_images.GetHeadPosition();
  while (pos) {
    CapturedImage& image = _screen_capture._captured_images.GetNext(pos);
    CxImage * img = new CxImage;
    if (image.Get(*img)) {
      DWORD image_time_ms = _test_state.ElapsedMsFromStart(image._capture_time);
      // we save the frames in increments of 100ms (for now anyway)
      // round it to the closest interval
      DWORD image_time = ((image_time_ms + 50) / 100);
      // resize the image down to a max width of 400 to reduce bandwidth/space
      DWORD newWidth = min(400, img->GetWidth() / 2);
      DWORD newHeight = (DWORD)((double)img->GetHeight() * 
                          ((double)newWidth / (double)img->GetWidth()));
      img->Resample2(newWidth, newHeight);
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
        if (ImagesAreDifferent(last_image, img)) {
          _visually_complete.QuadPart = image._capture_time.QuadPart;
          file_name.Format(_T("%s_progress_%04d.jpg"), (LPCTSTR)_file_base, 
                            image_time);
          SaveImage(*img, file_name, false, _test._image_quality);
          file_name.Format(_T("%s_progress_%04d.hist"), (LPCTSTR)_file_base, 
                            image_time);
          SaveHistogram(*img, file_name);
        }
      } else {
        width = img->GetWidth();
        height = img->GetHeight();
        // always save the first image at time zero
        file_name = _file_base + _T("_progress_0000.jpg");
        SaveImage(*img, file_name, false, _test._image_quality);
        file_name = _file_base + _T("_progress_0000.hist");
        SaveHistogram(*img, file_name);
      }

      if (last_image)
        delete last_image;
      last_image = img;
    }
    else
      delete img;
  }

  if (last_image)
    delete last_image;

  _screen_capture.Unlock();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Results::ImagesAreDifferent(CxImage * img1, CxImage* img2) {
  bool different = false;
  if (img1 && img2 && img1->GetWidth() == img2->GetWidth() && 
      img1->GetHeight() == img2->GetHeight() && 
      img1->GetBpp() == img2->GetBpp()) {
      if (img1->GetBpp() >= 15) {
        DWORD pixel_bytes = 3;
        if (img1->GetBpp() == 32)
          pixel_bytes = 4;
        DWORD width = img1->GetWidth();
        DWORD height = img1->GetHeight();
        DWORD row_length = width * pixel_bytes;
        for (DWORD row = 0; row < height && !different; row++) {
          BYTE * r1 = img1->GetBits(row);
          BYTE * r2 = img2->GetBits(row);
          if (r1 && r2 && memcmp(r1, r2, row_length))
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
void Results::SaveImage(CxImage& image, CString file, 
                          bool shrink, BYTE quality) {
  if (image.IsValid()) {
    if (shrink)
      image.Resample2(image.GetWidth() / 2, image.GetHeight() / 2);

    image.SetCodecOption(8, CXIMAGE_FORMAT_JPG);  // optimized encoding
    image.SetCodecOption(16, CXIMAGE_FORMAT_JPG); // progressive
    image.SetJpegQuality((BYTE)quality);
    image.Save(file, CXIMAGE_FORMAT_JPG);
  }
}

/*-----------------------------------------------------------------------------
  Save the image histogram as a json data structure (ignoring white pixels)
-----------------------------------------------------------------------------*/
void Results::SaveHistogram(CxImage& image, CString file) {
  if (image.IsValid()) {
    DWORD r[256], g[256], b[256];
    for (int i = 0; i < 256; i++) {
      r[i] = g[i] = b[i] = 0;
    }
    DWORD width = image.GetWidth();
    DWORD height = image.GetHeight();
    for (DWORD y = 0; y < height; y++) {
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
    CStringA histogram = CStringA("{") + red + 
                         CStringA(",") + green + 
                         CStringA(",") + blue + CStringA("}");

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
  HANDLE file = CreateFile(_file_base + PAGE_DATA_FILE, GENERIC_WRITE, 0, 
                            NULL, OPEN_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    SetFilePointer( file, 0, 0, FILE_END );

    CStringA result;
    CStringA buff;

    // build up the string of data fileds for the page result

    // Date
    buff.Format("%d/%d/%d\t", _test_state._start_time.wMonth,
          _test_state._start_time.wDay, _test_state._start_time.wYear);
    result += buff;
    // Time
    buff.Format("%d:%d:%d\t", _test_state._start_time.wHour,
          _test_state._start_time.wMinute, _test_state._start_time.wSecond);
    result += buff;
    // Event Name
    result += "\t";
    // URL
    result += "\t";
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
    result += "\t";
    // Connections
    result += "\t";
    // Requests
    buff.Format("%d\t", _test_state._requests);
    result += buff;
    // OK Responses
    result += "\t";
    // Redirects
    result += "\t";
    // Not Modified
    result += "\t";
    // Not Found
    result += "\t";
    // Other Responses
    result += "\t";
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
    result += "\t";
    // Connections (Doc)
    result += "\t";
    // Requests (Doc)
    buff.Format("%d\t", _test_state._doc_requests);
    result += buff;
    // OK Responses (Doc)
    result += "\t";
    // Redirects (Doc)
    result += "\t";
    // Not Modified (Doc)
    result += "\t";
    // Not Found (Doc)
    result += "\t";
    // Other Responses (Doc)
    result += "\t";
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
    result += "\t";
    // Base Page Result
    result += "\t";
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
    result += "\t";
    // Optimization Checked (all optimization checks are implemented).
    if (checks._checked)
      result += "1\t";
    else
      result += "0\t";
    // AFT (ms)
    // TODO: Calc the AFT timestamp and calculate it while writing instead of
    // calculate the ms value directly.
    buff.Format("%d\t", _test_state._aft_time_ms);
    result += buff;
    // DOM Element Count
    result += "\t";
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

    // Browser name and version.
    result += _test_state._browser_name;
    result += "\t";
    result += _test_state._browser_version;
    result += "\t";

    result += "\r\n";

    DWORD written;
    WriteFile(file, (LPCSTR)result, result.GetLength(), &written, 0);

    CloseHandle(file);
  }
}

void Results::ProcessRequests(void) {
  _requests.Lock();
  // first pass, reset the actual start time to be the first measured action
  // to eliminate the gap at startup for browser initialization
  if (_test_state._start.QuadPart) {
    LONGLONG new_start = 0;
    if (_test_state._first_navigate.QuadPart)
      new_start = _test_state._first_navigate.QuadPart;
    POSITION pos = _requests._requests.GetHeadPosition();
    while (pos) {
      Request * request = _requests._requests.GetNext(pos);
      if (request && request->_start.QuadPart && 
        (!new_start || request->_start.QuadPart < new_start))
        new_start = request->_start.QuadPart;
    }
    LONGLONG earliest_dns = _dns.GetEarliest(_test_state._start.QuadPart);
    if (earliest_dns && (!new_start || earliest_dns < new_start))
      new_start = earliest_dns;
    LONGLONG earliest_socket = _sockets.GetEarliest(_test_state._start.QuadPart);
    if (earliest_socket && (!new_start || earliest_socket < new_start))
      new_start = earliest_socket;
    if (new_start)
      _test_state._start.QuadPart = new_start;
  }

  // Next do all of the processing.  We want to do ALL of the processing
  // before recording the results so we can include any socket connections
  // or DNS lookups that are not associated with a request
  POSITION pos = _requests._requests.GetHeadPosition();
  bool base_page = true;
  while (pos) {
    Request * request = _requests._requests.GetNext(pos);
    if (request) {
      request->Process();
      if (base_page && 
          (!_test_state._test_result || 
          _test_state._test_result == 99999) ) {
        int result_code = request->GetResult();
        if (result_code != 301 && result_code != 302) {
          base_page = false;
          if (result_code >= 400) {
            _test_state._test_result = result_code;
          }
        }
      }
    }
  }
  _requests.Unlock();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveRequests(OptimizationChecks& checks) {
  HANDLE file = CreateFile(_file_base + REQUEST_DATA_FILE, GENERIC_WRITE, 0, 
                            NULL, OPEN_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    DWORD bytes;
    CStringA buff;
    SetFilePointer( file, 0, 0, FILE_END );

    HANDLE headers_file = CreateFile(_file_base + REQUEST_HEADERS_DATA_FILE,
                            GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, 0);

    HANDLE custom_rules_file = INVALID_HANDLE_VALUE;
    if (!_test._custom_rules.IsEmpty()) {
      custom_rules_file = CreateFile(_file_base +CUSTOM_RULES_DATA_FILE,
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
            WriteFile(custom_rules_file,(LPCSTR)buff,buff.GetLength(),&bytes,0);
            WriteFile(custom_rules_file, ":{", 2, &bytes, 0);
            POSITION match_pos =request->_custom_rules_matches.GetHeadPosition();
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
              entry += CStringA("\"value\":\"")+JSONEscapeA((LPCSTR)value)+"\",";
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

  // Date
  buff.Format("%d/%d/%d\t", _test_state._start_time.wMonth,
        _test_state._start_time.wDay, _test_state._start_time.wYear);
  result += buff;
  // Time
  buff.Format("%d:%d:%d\t", _test_state._start_time.wHour,
        _test_state._start_time.wMinute, _test_state._start_time.wSecond);
  result += buff;
  // Event Name
  result += "\t";
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
  buff.Format("%d\t", request->_request_data.GetDataSize());
  result += buff;
  // Bytes In
  buff.Format("%d\t", request->_response_data.GetDataSize());
  result += buff;
  // Object Size
  DWORD size = request->_response_data.GetBody().GetLength();
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
  result += "0\t";
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
  result += request->initiator_ + _T("\t");
  result += request->initiator_line_ + _T("\t");
  result += request->initiator_column_ + _T("\t");

  result += "\r\n";

  DWORD written;
  WriteFile(file, (LPCSTR)result, result.GetLength(), &written, 0);

  // write out the raw headers
  if (headers != INVALID_HANDLE_VALUE) {
    buff.Format("Request details:\r\nRequest %d:\r\nRequest Headers:\r\n", 
                  index);
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
  if (_test._save_response_bodies) {
    CString file = _file_base + _T("_bodies.zip");
    zipFile zip = zipOpen(CT2A(file), APPEND_STATUS_CREATE);
    if (zip) {
      DWORD count = 0;
      DWORD bodies_count = 0;
      _requests.Lock();
      POSITION pos = _requests._requests.GetHeadPosition();
      while (pos) {
        Request * request = _requests._requests.GetNext(pos);
        if (request && request->_processed) {
          CString mime = request->GetResponseHeader("content-type").MakeLower();
          count++;
          if (request->GetResult() == 200 && 
              ( mime.Find(_T("text/")) >= 0 || 
                mime.Find(_T("javascript")) >= 0 || 
                mime.Find(_T("json")) >= 0))  {
            DataChunk body = request->_response_data.GetBody(true);
            LPBYTE body_data = (LPBYTE)body.GetData();
            DWORD body_len = body.GetLength();
            if (body_data && body_len) {
              CStringA name;
              name.Format("%03d-response.txt", count);
              if (!zipOpenNewFileInZip(zip, name, 0, 0, 0, 0, 0, 0, Z_DEFLATED, 
                  Z_BEST_COMPRESSION)) {
                zipWriteInFileInZip(zip, body_data, body_len);
                zipCloseFileInZip(zip);
                bodies_count++;
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
    HANDLE file = CreateFile(_file_base + CONSOLE_LOG_FILE, GENERIC_WRITE, 0, 
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
void Results::SaveTimeline(void) {
  CStringA timeline = CT2A(_test_state.GetTimelineJSON());
  if (timeline.GetLength()) {
    HANDLE file = CreateFile(_file_base + TIMELINE_FILE, GENERIC_WRITE, 0, 
                              NULL, CREATE_ALWAYS, 0, 0);
    if (file != INVALID_HANDLE_VALUE) {
      DWORD written;
      WriteFile(file, (LPCSTR)timeline, timeline.GetLength(), &written, 0);
      CloseHandle(file);
    }
  }
}
