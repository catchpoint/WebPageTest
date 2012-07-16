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
ScreenCapture::ScreenCapture() {
  InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
ScreenCapture::~ScreenCapture(void) {
  Free();
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ScreenCapture::Free() {
  EnterCriticalSection(&cs);
  while (!_captured_images.IsEmpty()) {
    CapturedImage& image = _captured_images.RemoveHead();
    image.Free();
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ScreenCapture::Capture(HWND wnd, CapturedImage::TYPE type) {
  if (wnd) {
    EnterCriticalSection(&cs);
    CapturedImage image(wnd, type);
    _captured_images.AddTail(image);
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool ScreenCapture::GetImage(CapturedImage::TYPE type, CxImage& image) {
  bool ret = false;
  image.Destroy();
  EnterCriticalSection(&cs);
  POSITION pos = _captured_images.GetHeadPosition();
  while (pos && !ret) {
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
CapturedImage::CapturedImage():_bitmap_handle(NULL), _type(UNKNOWN) {
  _capture_time.QuadPart=0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CapturedImage::CapturedImage(HWND wnd, TYPE type):
  _bitmap_handle(NULL)
  , _type(UNKNOWN) {
  _capture_time.QuadPart = 0;
  if (wnd) {
    wpt_capturing_screen = true;
    HDC src = GetDC(NULL);
    if (src) {
      HDC dc = CreateCompatibleDC(src);
      if (dc) {
        RECT rect;
        GetWindowRect(wnd, &rect);
        int width = abs(rect.right - rect.left);
        int height = abs(rect.top - rect.bottom);
        if (width && height) {
          _bitmap_handle = CreateCompatibleBitmap(src, width, height); 
          if (_bitmap_handle) {
            QueryPerformanceCounter(&_capture_time);
            _type = type;

            HBITMAP hOriginal = (HBITMAP)SelectObject(dc, _bitmap_handle);
            BitBlt(dc, 0, 0, width, height, src, rect.left, rect.top, SRCCOPY | CAPTUREBLT);

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
