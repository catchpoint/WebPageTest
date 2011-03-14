#include "StdAfx.h"
#include "screen_capture.h"
#include "shared_mem.h"
#include "cximage/ximage.h"
#include "test_state.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
ScreenCapture::ScreenCapture() {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
ScreenCapture::~ScreenCapture(void) {
  while (!_captured_images.IsEmpty()) {
    CapturedImage& image = _captured_images.RemoveHead();
    image.Free();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ScreenCapture::Capture(HWND wnd, CapturedImage::TYPE type) {
  if (wnd) {
    CapturedImage image(wnd, type);
    _captured_images.AddTail(image);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool ScreenCapture::GetImage(CapturedImage::TYPE type, CxImage& image) {
  bool ret = false;
  image.Destroy();
  POSITION pos = _captured_images.GetHeadPosition();
  while (pos && !ret) {
    CapturedImage& captured_image = _captured_images.GetNext(pos);
    if (captured_image._type == type)
      ret = captured_image.Get(image);
  }

  return ret;
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
    HDC src = GetDC(wnd);
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
            BitBlt(dc, 0, 0, width, height, src, 0, 0, SRCCOPY | CAPTUREBLT);

            SelectObject(dc, hOriginal);
          }
        }
        DeleteDC(dc);
      }
      ReleaseDC(wnd, src);
    }
    QueryPerformanceCounter(&_capture_time);
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
