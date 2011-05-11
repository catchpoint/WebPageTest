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
#include "results.h"
#include "shared_mem.h"
#include "requests.h"
#include "track_sockets.h"
#include "test_state.h"
#include "screen_capture.h"
#include "../wptdriver/wpt_test.h"
#include "cximage/ximage.h"

static const TCHAR * PAGE_DATA_FILE = _T("_IEWPG.txt");
static const TCHAR * REQUEST_DATA_FILE = _T("_IEWTR.txt");
static const TCHAR * REQUEST_HEADERS_DATA_FILE = _T("_report.txt");
static const TCHAR * PROGRESS_DATA_FILE = _T("_progress.csv");
static const TCHAR * IMAGE_DOC_COMPLETE = _T("_screen_doc.jpg");
static const TCHAR * IMAGE_FULLY_LOADED = _T("_screen.jpg");
static const TCHAR * IMAGE_START_RENDER = _T("_screen_render.jpg");

static const BYTE JPEG_DEFAULT_QUALITY = 30;
static const BYTE JPEG_VIDEO_QUALITY = 75;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Results::Results(TestState& test_state, WptTest& test, Requests& requests, 
                  TrackSockets& sockets, ScreenCapture& screen_capture):
  _requests(requests)
  , _test_state(test_state)
  , _test(test)
  , _sockets(sockets)
  , _screen_capture(screen_capture)
  , _saved(false) {
  _file_base = shared_results_file_base;
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
}

/*-----------------------------------------------------------------------------
  Save the results out to the appropriate files
-----------------------------------------------------------------------------*/
void Results::Save(void) {
  if (!_saved && _test._log_data) {
    SaveRequests();
    SavePageData();
    SaveImages();
    SaveProgressData();
    _saved = true;
  }
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
      progress = "Offset Time (ms),Bandwidth In (kbps),CPU Utilization (%),Memory Use (KB)\r\n";
    CProgressData data = _test_state._progress_data.GetNext(pos);
    CStringA buff;
    buff.Format("%d,%d,%0.2f,%d\r\n", data.ms, data.bpsIn, data.cpu, data.mem );
    progress += buff;
  }
  HANDLE hFile = CreateFile(_file_base + PROGRESS_DATA_FILE, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, 0);
  if( hFile != INVALID_HANDLE_VALUE )
  {
    DWORD dwBytes;
    WriteFile(hFile, (LPCSTR)progress, progress.GetLength(), &dwBytes, 0);
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
              JPEG_DEFAULT_QUALITY);
  }
  if (_screen_capture.GetImage(CapturedImage::DOCUMENT_COMPLETE, image)) {
    SaveImage(image, _file_base + IMAGE_DOC_COMPLETE, true, 
              JPEG_DEFAULT_QUALITY);
  }
  if (_screen_capture.GetImage(CapturedImage::FULLY_LOADED, image)) {
    SaveImage(image, _file_base + IMAGE_FULLY_LOADED, false, 
              JPEG_DEFAULT_QUALITY);
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
      DWORD image_time = 0;
      if (image._capture_time.QuadPart > _test_state._start.QuadPart)
        image_time = (DWORD)((image._capture_time.QuadPart - 
          _test_state._start.QuadPart) / _test_state._ms_frequency.QuadPart);
      // we save the frames in increments of 100ms (for now anyway)
      // round it to the closest interval
      image_time = ((image_time + 50) / 100);
      img->Resample2(img->GetWidth() / 2, img->GetHeight() / 2);
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
          file_name.Format(_T("%s_progress_%04d.jpg"), (LPCTSTR)_file_base, 
                            image_time);
          SaveImage(*img, file_name, false, JPEG_VIDEO_QUALITY);
        }
      } else {
        width = img->GetWidth();
        height = img->GetHeight();
        // always save the first image at time zero
        file_name = _file_base + _T("_progress_0000.jpg");
        SaveImage(*img, file_name, false, JPEG_VIDEO_QUALITY);
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

    image.SetCodecOption(8, CXIMAGE_FORMAT_JPG);	// optimized encoding
    image.SetCodecOption(16, CXIMAGE_FORMAT_JPG);	// progressive
    image.SetJpegQuality((BYTE)quality);
    image.Save(file, CXIMAGE_FORMAT_JPG);
  }
}

/*-----------------------------------------------------------------------------
  Save the page-level data
-----------------------------------------------------------------------------*/
void Results::SavePageData(void){
  HANDLE file = CreateFile(_file_base + PAGE_DATA_FILE, GENERIC_WRITE, 0, 
                            NULL, OPEN_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    SetFilePointer( file, 0, 0, FILE_END );

    CStringA result;
    CStringA buff;

    // build up the string of data fileds for the page result

    // Date
    result += "\t";
    // Time
    result += "\t";
    // Event Name
    result += "\t";
    // URL
    result += "\t";
    // Load Time (ms)
    int on_load_time = 0;
    if (_test_state._on_load.QuadPart > _test_state._start.QuadPart)
      on_load_time = (int)((_test_state._on_load.QuadPart - 
          _test_state._start.QuadPart) / _test_state._ms_frequency.QuadPart);
    buff.Format("%d\t", on_load_time);
    result += buff;
    // Time to First Byte (ms)
    int first_byte_time = 0;
    if (_test_state._first_byte.QuadPart > _test_state._start.QuadPart)
      first_byte_time = (int)((_test_state._first_byte.QuadPart - 
          _test_state._start.QuadPart) / _test_state._ms_frequency.QuadPart);
    buff.Format("%d\t", first_byte_time);
    result += buff;
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
    result += "\t";
    // Time to Start Render (ms)
    int render_start_time = 0;
    if (_test_state._render_start.QuadPart > _test_state._start.QuadPart)
      render_start_time = (int)((_test_state._render_start.QuadPart - 
          _test_state._start.QuadPart) / _test_state._ms_frequency.QuadPart);
    buff.Format("%d\t", render_start_time);
    result += buff;
    // Segments Transmitted
    result += "\t";
    // Segments Retransmitted
    result += "\t";
    // Packet Loss (out)
    result += "\t";
    // Activity Time(ms)
    int activity_time = on_load_time;
    if (_test_state._last_activity.QuadPart > _test_state._on_load.QuadPart) {
      if (_test_state._last_activity.QuadPart > _test_state._start.QuadPart)
        activity_time = (int)((_test_state._last_activity.QuadPart - 
            _test_state._start.QuadPart) / _test_state._ms_frequency.QuadPart);
    }
    buff.Format("%d\t", activity_time);
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
    if (shared_cleared_cache)
      result += "0\t";
    else
      result += "1\t";
    // Event URL
    result += "\t";
    // Pagetest Build
    result += "\t";
    // Measurement Type
    if (shared_test_force_on_load)
      result += "1\t";
    else
      result += "2\t";
    // Experimental
    result += "0\t";
    // Doc Complete Time (ms)
    buff.Format("%d\t", on_load_time);
    result += buff;
    // Event GUID
    result += "\t";
    // Time to DOM Element (ms)
    result += "\t";
    // Includes Object Data
    result += "1\t";
    // Cache Score
    result += "-1\t";
    // Static CDN Score
    result += "-1\t";
    // One CDN Score
    result += "-1\t";
    // GZIP Score
    result += "-1\t";
    // Cookie Score
    result += "-1\t";
    // Keep-Alive Score
    result += "-1\t";
    // DOCTYPE Score
    result += "-1\t";
    // Minify Score
    result += "-1\t";
    // Combine Score
    result += "-1\t";
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
    result += "-1\t";
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
    result += "\t";
    // Gzip Savings
    result += "\t";
    // Minify Total Bytes
    result += "\t";
    // Minify Savings
    result += "\t";
    // Image Total Bytes
    result += "\t";
    // Image Savings
    result += "\t";
    // Base Page Redirects
    result += "\t";
    // Optimization Checked
    result += "0\t";
    // AFT (ms)
    result += "\t";

    result += "\r\n";

    DWORD written;
    WriteFile(file, (LPCSTR)result, result.GetLength(), &written, 0);

    CloseHandle(file);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveRequests(void) {
  HANDLE file = CreateFile(_file_base + REQUEST_DATA_FILE, GENERIC_WRITE, 0, 
                            NULL, OPEN_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    SetFilePointer( file, 0, 0, FILE_END );

    HANDLE headers_file = CreateFile(_file_base + REQUEST_HEADERS_DATA_FILE,
                            GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, 0);

    _requests.Lock();
    // first do all of the processing.  We want to do ALL of the processing
    // before recording the results so we can include any socket connections
    // or DNS lookups that are not associated with a request
    POSITION pos = _requests._requests.GetHeadPosition();
    while (pos) {
      Request * request = _requests._requests.GetNext(pos);
      if (request)
        request->Process();
    }

    // now record the results
    pos = _requests._requests.GetHeadPosition();
    int i = 0;
    while (pos) {
      Request * request = _requests._requests.GetNext(pos);
      if (request && request->_processed) {
        i++;
        SaveRequest(file, headers_file, request, i);
      }
    }
    _requests.Unlock();
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
  result += "\t";
  // Time
  result += "\t";
  // Event Name
  result += "\t";
  // IP Address
  struct sockaddr_in addr;
  addr.sin_addr.S_un.S_addr = _sockets.GetPeerAddress(request->_socket_id);
  if (addr.sin_addr.S_un.S_addr) {
    buff.Format("%d.%d.%d.%d", addr.sin_addr.S_un.S_un_b.s_b1, 
      addr.sin_addr.S_un.S_un_b.s_b2, addr.sin_addr.S_un.S_un_b.s_b3, 
      addr.sin_addr.S_un.S_un_b.s_b4);
    result += buff;
  }
  result += "\t";
  // Action
  result += request->_method + "\t";
  // Host
  result += request->GetRequestHeader("host") + "\t";
  // URL
  result += request->_object + "\t";
  // Response Code
  buff.Format("%d\t", request->_result);
  result += buff;
  // Time to Load (ms)
  buff.Format("%d\t", request->_ms_end - request->_ms_start);
  result += buff;
  // Time to First Byte (ms)
  buff.Format("%d\t", request->_ms_first_byte - request->_ms_start);
  result += buff;
  // Start Time (ms)
  buff.Format("%d\t", request->_ms_start);
  result += buff;
  // Bytes Out
  buff.Format("%d\t", request->_data_sent);
  result += buff;
  // Bytes In
  buff.Format("%d\t", request->_data_received);
  result += buff;
  // Object Size
  DWORD size = 0;
  if (request->_data_received && 
      request->_data_received > (DWORD)request->_in_header.GetLength())
      size = request->_data_received - request->_in_header.GetLength();
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
  result += "-1\t";
  // Static CDN Score
  result += "-1\t";
  // GZIP Score
  result += "-1\t";
  // Cookie Score
  result += "-1\t";
  // Keep-Alive Score
  result += "-1\t";
  // DOCTYPE Score
  result += "-1\t";
  // Minify Score
  result += "-1\t";
  // Combine Score
  result += "-1\t";
  // Compression Score
  result += "-1\t";
  // ETag Score
  result += "-1\t";
  // Flagged
  result += "0\t";
  // Secure
  result += "0\t";
  // DNS Time (ms)
  result += "-1\t";
  // Socket Connect time (ms)
  result += "-1\t";
  // SSL time (ms)
  result += "-1\t";
  // Gzip Total Bytes
  result += "0\t";
  // Gzip Savings
  result += "0\t";
  // Minify Total Bytes
  result += "0\t";
  // Minify Savings
  result += "0\t";
  // Image Compression Total Bytes
  result += "0\t";
  // Image Compression Savings
  result += "0\t";
  // Cache Time (sec)
  result += "-1\t";
  // Real Start Time (ms)
  result += "\t";
  // Full Time to Load (ms)
  result += "\t";
  // Optimization Checked
  result += "0\t";
  // CDN Provider
  result += "\t";
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

  result += "\r\n";

  DWORD written;
  WriteFile(file, (LPCSTR)result, result.GetLength(), &written, 0);

  // write out the raw headers
  if (headers != INVALID_HANDLE_VALUE) {
    buff.Format("Request details:\r\nRequest %d:\r\nRequest Headers:\r\n", 
                  index);
    buff += request->_out_header;
    buff.Trim("\r\n");
    buff += "\r\nResponse Headers:\r\n";
    buff += request->_in_header;
    buff.Trim("\r\n");
    buff += "\r\n";
    WriteFile(headers, (LPCSTR)buff, buff.GetLength(), &written, 0);
  }
}

