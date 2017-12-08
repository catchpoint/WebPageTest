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
#include "screen_capture.h"
#include "cximage/ximage.h"

// global indicator that we are capturing a screen shot
// (so that any GDI hooks can ignore our activity)
bool wpt_capturing_screen = false;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
ScreenCapture::ScreenCapture():_viewport_set(false) {
  InitializeCriticalSection(&cs);
  memset(&_viewport, 0, sizeof(_viewport));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
ScreenCapture::~ScreenCapture(void) {
  Reset();
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ScreenCapture::Reset() {
  EnterCriticalSection(&cs);
  while (!_captured_images.IsEmpty()) {
    CapturedImage& image = _captured_images.RemoveHead();
    image.Free();
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Capture a screen shot and save it in our list
-----------------------------------------------------------------------------*/
void ScreenCapture::Capture(HWND wnd, CapturedImage::TYPE type,
                            bool crop_viewport) {
  if (wnd) {
    EnterCriticalSection(&cs);
    RECT * rect = NULL;
    if (crop_viewport && _viewport_set)
      rect = &_viewport;
    CapturedImage image(wnd, type, rect);
    _captured_images.AddTail(image);
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
  Capture a screen shot and return it without saving it
-----------------------------------------------------------------------------*/
CapturedImage ScreenCapture::CaptureImage(HWND wnd, CapturedImage::TYPE type,
                                          bool crop_viewport) {
  CapturedImage ret;
  if (wnd) {
    EnterCriticalSection(&cs);
    RECT * rect = NULL;
    if (crop_viewport && _viewport_set)
      rect = &_viewport;
    CapturedImage captured(wnd, type, rect);
    ret = captured;
    LeaveCriticalSection(&cs);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Get the last image of the requested type
-----------------------------------------------------------------------------*/
bool ScreenCapture::GetImage(CapturedImage::TYPE type, CxImage& image) {
  bool ret = false;
  image.Destroy();
  EnterCriticalSection(&cs);
  POSITION pos = _captured_images.GetHeadPosition();
  while (pos) {
    CapturedImage& captured_image = _captured_images.GetNext(pos);
    if (captured_image._type == type)
      ret = captured_image.Get(image);
  }
  LeaveCriticalSection(&cs);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ScreenCapture::Lock() {
  EnterCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ScreenCapture::Unlock() {
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ScreenCapture::ClearViewport() {
  memset(&_viewport, 0, sizeof(_viewport));
  _viewport_set = false;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ScreenCapture::SetViewport(RECT& viewport) {
  memcpy(&_viewport, &viewport, sizeof(_viewport));
  _viewport_set = true;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool ScreenCapture::IsViewportSet() {
  return _viewport_set;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CapturedImage::CapturedImage():_bitmap_handle(NULL), _type(UNKNOWN) {
  _capture_time.QuadPart=0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CapturedImage::CapturedImage(HWND wnd, TYPE type, RECT * rect):
  _bitmap_handle(NULL)
  , _type(UNKNOWN) {
  _capture_time.QuadPart = 0;
  if (wnd) {
    wpt_capturing_screen = true;
    HDC src = GetDC(NULL);
    if (src) {
      HDC dc = CreateCompatibleDC(src);
      if (dc) {
        RECT window_rect;
        GetWindowRect(wnd, &window_rect);
        int left = window_rect.left;
        int top = window_rect.top;
        int width = abs(window_rect.right - window_rect.left);
        int height = abs(window_rect.top - window_rect.bottom);
        if (rect) {
          left = window_rect.left + rect->left;
          top = window_rect.top + rect->top;
          width = rect->right - rect->left;
          height = rect->bottom - rect->top;
        }
        if (width && height) {
          _bitmap_handle = CreateCompatibleBitmap(src, width, height); 
          if (_bitmap_handle) {
            QueryPerformanceCounter(&_capture_time);
            _type = type;

            HBITMAP hOriginal = (HBITMAP)SelectObject(dc, _bitmap_handle);
            BitBlt(dc, 0, 0, width, height, src, left, top,SRCCOPY|CAPTUREBLT);

            SelectObject(dc, hOriginal);
          }
        }
        DeleteDC(dc);
      }
      ReleaseDC(wnd, src);
    }
    QueryPerformanceCounter(&_capture_time);
    wpt_capturing_screen = false;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CapturedImage::~CapturedImage(){}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
const CapturedImage& CapturedImage::operator =(const CapturedImage& src) {
  _bitmap_handle = src._bitmap_handle;
  _capture_time.QuadPart = src._capture_time.QuadPart;
  _type = src._type;
  return src;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CapturedImage::Free() {
  if (_bitmap_handle)
    DeleteObject(_bitmap_handle);
  _bitmap_handle = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CapturedImage::Get(CxImage& image) {
  bool ret = false;

  if (_bitmap_handle)
    ret = image.CreateFromHBITMAP(_bitmap_handle);

  return ret;
}
