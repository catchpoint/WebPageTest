#pragma once

class CxImage;

class CapturedImage
{
public:
  typedef enum {
    VIDEO,
    START_RENDER,
    DOCUMENT_COMPLETE,
    FULLY_LOADED,
    UNKNOWN
  } TYPE;

  CapturedImage();
  CapturedImage(const CapturedImage& src){*this = src;}
  CapturedImage(HWND wnd, TYPE type);
  ~CapturedImage();
  const CapturedImage& operator =(const CapturedImage& src);
  void Free();
  bool Get(CxImage& image);

  HBITMAP       _bitmap_handle;
  LARGE_INTEGER _capture_time;
  TYPE          _type;
};

class ScreenCapture
{
public:
  ScreenCapture(void);
  ~ScreenCapture(void);
  void FindBrowserWindow();
  void Capture(CapturedImage::TYPE type);
  bool GetImage(CapturedImage::TYPE type, CxImage& image);

private:
  HWND _browser_window;
  CAtlList<CapturedImage> _captured_images;
};

