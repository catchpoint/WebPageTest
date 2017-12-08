#include "stdafx.h"
#include "WptRecorder.h"
#include "../wpthook/cximage/ximage.h"
#include "../wptdriver/shaper/interface.h"
#include <TimeAPI.h>
#include <zip.h>

#define MS_EDGE_WND_CLASS L"ApplicationFrameWindow"
#define MS_EDGE_DOCUMENT_WND_CLASS L"ApplicationFrameInputSinkWindow"
#define MS_EDGE_TITLE L"- Microsoft Edge"

static const TCHAR * PROGRESS_DATA_FILE = _T("_progress.csv");
static const TCHAR * IMAGE_FULLY_LOADED = _T("_screen.jpg");

static const DWORD SCREEN_CAPTURE_INCREMENTS = 200;
static const DWORD DATA_COLLECTION_INTERVAL = 100;
static const DWORD MS_IN_SEC = 1000;
static const DWORD RIGHT_MARGIN = 25;
static const DWORD BOTTOM_MARGIN = 25;
static const DWORD INITIAL_MARGIN = 25;
static const DWORD INITIAL_BOTTOM_MARGIN = 85;  // Ignore for the first frame

/*-----------------------------------------------------------------------------
  Histogram class from wpthook
-----------------------------------------------------------------------------*/
class Histogram {
public:
  Histogram():is_valid(false) {
    for (int i = 0; i < 256; i++) {
      r[i] = g[i] = b[i] = 0;
    }
  }
  Histogram(const Histogram &src) {*this = src;}
  Histogram(CxImage& image) {FromImage(image);}
  ~Histogram(){}
  const Histogram &operator =(const Histogram &src) {
    if (src.is_valid) {
      for (int i = 0; i < 256; i++) {
        r[i] = src.r[i];
        g[i] = src.g[i];
        b[i] = src.b[i];
      }
      is_valid = true;
    }
    return src;
  }
  bool FromImage(CxImage& image) {
    is_valid = false;
    if (image.IsValid()) {
      DWORD count = 0;
      for (int i = 0; i < 256; i++) {
        r[i] = g[i] = b[i] = 0;
      }
      DWORD width = max(image.GetWidth() - RIGHT_MARGIN, 0);
      DWORD height = image.GetHeight();
      if (image.GetBpp() >= 15) {
        DWORD pixel_bytes = 3;
        if (image.GetBpp() == 32)
          pixel_bytes = 4;
        DWORD row_bytes = image.GetEffWidth();
        for (DWORD row = BOTTOM_MARGIN; row < height; row ++) {
          BYTE * pixel = image.GetBits(row);
          for (DWORD x = 0; x < width; x++) {
            if (pixel[0] != 255 || 
                pixel[1] != 255 || 
                pixel[2] != 255) {
              r[pixel[0]]++;
              g[pixel[1]]++;
              b[pixel[2]]++;
              count++;
            }
            pixel += pixel_bytes;
          }
        }
      } else {
        for (DWORD y = BOTTOM_MARGIN; y < height; y++) {
          for (DWORD x = 0; x < width; x++) {
            RGBQUAD pixel = image.GetPixelColor(x,y);
            if (pixel.rgbRed != 255 || 
                pixel.rgbGreen != 255 || 
                pixel.rgbBlue != 255) {
              r[pixel.rgbRed]++;
              g[pixel.rgbGreen]++;
              b[pixel.rgbBlue]++;
              count++;
            }
          }
        }
      }
      is_valid = true;
    }
    return is_valid;
  }
  CStringA json() {
    CStringA ret;
    if (is_valid) {
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
      ret = "{" + red + "," + green + "," + blue + "}";
    }
    return ret;
  }
  double ColorProgress(DWORD *start, DWORD *end, DWORD *current, int slop) {
    double progress = 0;
    const int buckets = 256;
    size_t total = 0;
    size_t matched = 0;

    // First build an array of the actual changes in the current histogram.
    size_t available[buckets];
    for (int i = 0; i < buckets; i++)
      available[i] = current[i] > start[i] ? current[i] - start[i] : start[i] - current[i];

    // Go through the target differences and subtract any matches from the array as we go,
    // counting how many matches we made.
    for (int i = 0; i < buckets; i++) {
      size_t target = (size_t)abs((long)end[i] - (long)start[i]);
      if (target) {
        total += target;
        int start_slop = max(0, i - slop);
        int end_slop = min(buckets - 1, i + slop);
        for (int j = start_slop; j <= end_slop; j++) {
          size_t this_match = min(target, available[j]);
          available[j] -= this_match;
          matched += this_match;
          target -= this_match;
        }
      }
    }

    if (!total)
      progress = 0.0;
    else if (matched >= total)
      progress = 1.0;
    else
      progress = (double)matched / (double)total;

    return progress;
  }
  double VisualProgress(Histogram &start, Histogram &end, int slop = 5) {
    double progress = 0;
    if (is_valid && start.is_valid && end.is_valid) {
      // Average the progress of all 3 color channels
      double red = ColorProgress(start.r, end.r, r, slop);
      double green = ColorProgress(start.g, end.g, g, slop);
      double blue = ColorProgress(start.b, end.b, b, slop);

      progress = (red + green + blue) / 3;
    }
    return progress;
  }
  DWORD r[256];
  DWORD g[256];
  DWORD b[256];
  bool is_valid;
};

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptRecorder::WptRecorder():
  data_timer_(NULL)
  , capture_video_(false)
  , capture_tcpdump_(false)
  , save_histograms_(false)
  , full_size_video_(false)
  , image_quality_(30)
  , shaper_driver_(INVALID_HANDLE_VALUE) {
  InitializeCriticalSection(&cs_);
  Reset();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptRecorder::~WptRecorder() {
  Stop();
  DeleteCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptRecorder::Reset() {
  browser_window_ = NULL;
  active_ = false;
  start_.QuadPart = 0;
  ms_frequency_.QuadPart = 0;
  frequency_.QuadPart = 0;
  last_data_.QuadPart = 0;
  last_video_time_.QuadPart = 0;
  last_activity_.QuadPart = 0;
  video_capture_count_ = 0;
  last_cpu_idle_.QuadPart = 0;
  last_cpu_kernel_.QuadPart = 0;
  last_cpu_user_.QuadPart = 0;
  visually_complete_ = 0;
  speed_index_ = 0;
  render_start_.QuadPart = 0;
  last_visual_change_.QuadPart = 0;
  last_bytes_in_ = 0;
  last_bytes_out_ = 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int WptRecorder::Prepare() {
  int ret = 0;
  ATLTRACE("WptRecorder::Prepare");
  WaitForCPUIdle(30);
  if (FindBrowserWindow()) {
    FindViewport();
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void __stdcall CollectData(PVOID lpParameter, BOOLEAN TimerOrWaitFired) {
  if( lpParameter )
    ((WptRecorder *)lpParameter)->CollectData();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int WptRecorder::Start() {
  int ret = 0;
  ATLTRACE("WptRecorder::Start");
  if (!active_ && !file_base_.IsEmpty()) {
    active_ = true;
    if (shaper_driver_ == INVALID_HANDLE_VALUE)
      shaper_driver_ = CreateFile(SHAPER_DOS_NAME, GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
    if (capture_tcpdump_)
      winpcap_.StartCapture(file_base_ + L".cap");
    QueryPerformanceCounter(&start_);
    QueryPerformanceFrequency(&frequency_);
    ms_frequency_.QuadPart = frequency_.QuadPart / 1000;
    if (!data_timer_) {
      timeBeginPeriod(1);
      CreateTimerQueueTimer(&data_timer_, NULL, ::CollectData, this, 
          DATA_COLLECTION_INTERVAL, DATA_COLLECTION_INTERVAL, WT_EXECUTEDEFAULT);
    }
    CollectData();
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int WptRecorder::Stop() {
  int ret = 0;
  CollectData();
  active_ = false;
  if (data_timer_) {
    ATLTRACE("WptRecorder::Stop");
    EnterCriticalSection(&cs_);
    DeleteTimerQueueTimer(NULL, data_timer_, NULL);
    data_timer_ = NULL;
    timeEndPeriod(1);
    LeaveCriticalSection(&cs_);
  }
  winpcap_.StopCapture();
  if (shaper_driver_ != INVALID_HANDLE_VALUE) {
    CloseHandle(shaper_driver_);
    shaper_driver_ = INVALID_HANDLE_VALUE;
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int WptRecorder::WaitForIdle(DWORD wait_seconds) {
  int ret = 0;
  ATLTRACE("WptRecorder::WaitForIdle - %d seconds", wait_seconds);
  if (last_activity_.QuadPart > 0) {
    LARGE_INTEGER start, now;
    QueryPerformanceCounter(&now);
    start.QuadPart = now.QuadPart;
    DWORD elapsed = 0;
    double elapsed_activity = (double)(now.QuadPart - last_activity_.QuadPart) / (double)frequency_.QuadPart;
    while (elapsed < wait_seconds && elapsed_activity < 2) {
      Sleep(100);
      QueryPerformanceCounter(&now);
      elapsed_activity = (double)(now.QuadPart - last_activity_.QuadPart) / (double)frequency_.QuadPart;
      elapsed = (DWORD)((double)(now.QuadPart - start.QuadPart) / (double)frequency_.QuadPart);
      ATLTRACE("WptRecorder::WaitForIdle - %d seconds elapsed, %0.2f seconds since last activity", elapsed, elapsed_activity);
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptRecorder::WaitForCPUIdle(DWORD wait_seconds) {
  ATLTRACE("WptRecorder::WaitForCPUIdle - %d seconds", wait_seconds);
  LARGE_INTEGER start, freq, now;
  double elapsed = 0;
  QueryPerformanceFrequency(&freq);
  QueryPerformanceCounter(&start);
  elapsed = 0;
  bool is_idle = false;
  double target_cpu = 20.0;
  SYSTEM_INFO sysinfo;
  GetSystemInfo(&sysinfo);
  if (sysinfo.dwNumberOfProcessors > 1)
    target_cpu = target_cpu / (double)sysinfo.dwNumberOfProcessors;
  ULARGE_INTEGER last_k, last_u, last_i;
  FILETIME idle_time, kernel_time, user_time;
  if (GetSystemTimes(&idle_time, &kernel_time, &user_time)) {
    last_k.LowPart = kernel_time.dwLowDateTime;
    last_k.HighPart = kernel_time.dwHighDateTime;
    last_u.LowPart = user_time.dwLowDateTime;
    last_u.HighPart = user_time.dwHighDateTime;
    last_i.LowPart = idle_time.dwLowDateTime;
    last_i.HighPart = idle_time.dwHighDateTime;
    while (elapsed < wait_seconds && !is_idle) {
      Sleep(1000);
      QueryPerformanceCounter(&now);
      elapsed = (double)(now.QuadPart - start.QuadPart) / (double)freq.QuadPart;
      if (GetSystemTimes(&idle_time, &kernel_time, &user_time)) {
        ULARGE_INTEGER k, u, i;
        k.LowPart = kernel_time.dwLowDateTime;
        k.HighPart = kernel_time.dwHighDateTime;
        u.LowPart = user_time.dwLowDateTime;
        u.HighPart = user_time.dwHighDateTime;
        i.LowPart = idle_time.dwLowDateTime;
        i.HighPart = idle_time.dwHighDateTime;
        __int64 idle = i.QuadPart - last_i.QuadPart;
        __int64 kernel = k.QuadPart - last_k.QuadPart;
        __int64 user = u.QuadPart - last_u.QuadPart;
        if (kernel || user) {
          double cpu_utilization = (((double)(kernel + user - idle) * 100.0) / (double)(kernel + user));
          ATLTRACE("Waiting for the CPU to go idle - %0.2f%%, target %0.2F%%", cpu_utilization, target_cpu);
          if (cpu_utilization < target_cpu)
            is_idle = true;
        }
        last_i.QuadPart = i.QuadPart;
        last_k.QuadPart = k.QuadPart;
        last_u.QuadPart = u.QuadPart;
      }
    }
  }
}
/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int WptRecorder::Process(DWORD start_offset) {
  int ret = 0;
  ATLTRACE("WptRecorder::Process - start offset = %dms", start_offset);
  // Make sure everything is stopped
  Stop();
  if (!file_base_.IsEmpty()) {
    if (start_offset > 0)
      start_.QuadPart += ms_frequency_.QuadPart * start_offset;
    SaveProgressData();
    SaveVideo();
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int WptRecorder::Done() {
  int ret = 0;
  ATLTRACE("WptRecorder::Done");
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptRecorder::FindBrowserWindow() {
  bool found = false;
  browser_window_ = NULL;

  // Only supports MS Edge right now
  // Find the frame window
  HWND frame_window = NULL;
  HWND wnd = ::GetWindow(::GetDesktopWindow(), GW_CHILD);
  while (wnd && !frame_window) {
    if (IsWindowVisible(wnd)) {
      TCHAR class_name[100];
      if (GetClassName(wnd, class_name, _countof(class_name))) {
        if (!lstrcmpi(class_name, MS_EDGE_WND_CLASS)) {
          TCHAR title[10000];
          if (GetWindowText(wnd, title, _countof(title))) {
            if (_tcsstr(title, MS_EDGE_TITLE))
              frame_window = wnd;
          }
        }
      }
    }
    wnd = ::GetNextWindow(wnd , GW_HWNDNEXT);
  }

  // Find the child window that covers the content area
  if (frame_window) {
    // make sure the browser window is above everything else
    ::SetWindowPos(frame_window, HWND_TOPMOST, 0, 0, 0, 0, 
        SWP_NOACTIVATE | SWP_NOSIZE | SWP_NOMOVE);
    ::UpdateWindow(frame_window);
    wnd = ::GetWindow(frame_window, GW_CHILD);
    while (wnd && !browser_window_) {
      if (IsWindowVisible(wnd)) {
        TCHAR class_name[100];
        if (GetClassName(wnd, class_name, _countof(class_name))) {
          if (!lstrcmpi(class_name, MS_EDGE_DOCUMENT_WND_CLASS)) {
            browser_window_ = wnd;
            found = true;
          }
        }
      }
      wnd = ::GetNextWindow(wnd , GW_HWNDNEXT);
    }
  }

  return found;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptRecorder::CollectData() {
  EnterCriticalSection(&cs_);
  if (active_) {
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    if (now.QuadPart > last_data_.QuadPart || !last_data_.QuadPart) {
      CollectSystemStats(now);
      GrabVideoFrame();
      last_data_.QuadPart = now.QuadPart;
    }
  }
  LeaveCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
    Collect the periodic system stats like cpu/memory/bandwidth.
-----------------------------------------------------------------------------*/
void WptRecorder::CollectSystemStats(LARGE_INTEGER &now) {
  ProgressData data;
  data._time.QuadPart = now.QuadPart;
  DWORD msElapsed = 0;
  double elapsed_seconds = 0;
  if (last_data_.QuadPart) {
    msElapsed = (DWORD)((now.QuadPart - last_data_.QuadPart) / 
                            ms_frequency_.QuadPart);
    elapsed_seconds = (double)(now.QuadPart - last_data_.QuadPart) / 
                            (double)frequency_.QuadPart;
  }

  // calculate CPU utilization
  FILETIME idle_time, kernel_time, user_time;
  if (GetSystemTimes(&idle_time, &kernel_time, &user_time)) {
    ULARGE_INTEGER k, u, i;
    k.LowPart = kernel_time.dwLowDateTime;
    k.HighPart = kernel_time.dwHighDateTime;
    u.LowPart = user_time.dwLowDateTime;
    u.HighPart = user_time.dwHighDateTime;
    i.LowPart = idle_time.dwLowDateTime;
    i.HighPart = idle_time.dwHighDateTime;
    if(last_cpu_idle_.QuadPart || last_cpu_kernel_.QuadPart || 
      last_cpu_user_.QuadPart) {
      __int64 idle = i.QuadPart - last_cpu_idle_.QuadPart;
      __int64 kernel = k.QuadPart - last_cpu_kernel_.QuadPart;
      __int64 user = u.QuadPart - last_cpu_user_.QuadPart;
      if (kernel || user) {
        int cpu_utilization = (int)((((kernel + user) - idle) * 100) 
                                      / (kernel + user));
        data._cpu = max(min(cpu_utilization, 100), 0);
      }
    }
    last_cpu_idle_.QuadPart = i.QuadPart;
    last_cpu_kernel_.QuadPart = k.QuadPart;
    last_cpu_user_.QuadPart = u.QuadPart;
  }
  if (shaper_driver_ != INVALID_HANDLE_VALUE) {
    SHAPER_STATS stats;
    DWORD bytesReturned;
    if (DeviceIoControl(shaper_driver_, SHAPER_IOCTL_GET_STATS, NULL, 0, &stats, sizeof(stats), &bytesReturned, NULL) && bytesReturned >= sizeof(stats)) {
      unsigned __int64 tx = stats.outBytes - last_bytes_out_;
      unsigned __int64 rx = stats.inBytes - last_bytes_in_;
      if (elapsed_seconds > 0)
        data._bpsIn = (DWORD)((double)(rx * 8) / elapsed_seconds);
      if (rx > 1000 || tx > 500)
        last_activity_.QuadPart = now.QuadPart;
      last_bytes_in_ = stats.inBytes;
      last_bytes_out_ = stats.outBytes;
    }
  }

  if (msElapsed)
    progress_data_.AddTail(data);
}

/*-----------------------------------------------------------------------------
    Grab a video frame if it is appropriate
-----------------------------------------------------------------------------*/
void WptRecorder::GrabVideoFrame() {
  if (active_ && browser_window_) {
    // use a falloff on the resolution with which we capture video
    bool grab_video = false;
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    if (!last_video_time_.QuadPart) {
      grab_video = true;
    } else {
      DWORD interval = DATA_COLLECTION_INTERVAL;
      if (video_capture_count_ > SCREEN_CAPTURE_INCREMENTS * 2)
        interval *= 20;
      else if (video_capture_count_ > SCREEN_CAPTURE_INCREMENTS)
        interval *= 5;
      LARGE_INTEGER min_time;
      min_time.QuadPart = last_video_time_.QuadPart + 
                            (interval * ms_frequency_.QuadPart);
      if (now.QuadPart >= min_time.QuadPart)
        grab_video = true;
    }
    if (grab_video) {
      last_video_time_.QuadPart = now.QuadPart;
      video_capture_count_++;
      screen_capture_.Capture(browser_window_, CapturedImage::VIDEO);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
DWORD WptRecorder::ElapsedMsFromStart(LARGE_INTEGER end) const {
  DWORD elapsed_ms = 0;
  if (start_.QuadPart && end.QuadPart > start_.QuadPart) {
    elapsed_ms = static_cast<DWORD>(
        (end.QuadPart - start_.QuadPart) / ms_frequency_.QuadPart);
  }
  return elapsed_ms;
}

/*-----------------------------------------------------------------------------
  Find the portion of the document window that represents the document
-----------------------------------------------------------------------------*/
void WptRecorder::FindViewport() {
  if (browser_window_) {
    screen_capture_.ClearViewport();
    CapturedImage captured = screen_capture_.CaptureImage(browser_window_);
    CxImage image;
    if (captured.Get(image)) {
      // start in the middle of the image and go in each direction 
      // until we get a pixel of a different color
      DWORD width = image.GetWidth();
      DWORD height = image.GetHeight();
      if (width > 100 && height > 100) {
        DWORD x = width / 2;
        DWORD y = height / 2;
        RECT viewport = {0,0,0,0}; 
        DWORD row_bytes = image.GetEffWidth();
        DWORD pixel_bytes = row_bytes / width;
        unsigned char * middle = image.GetBits(y);
        if (middle) {
          middle += x * pixel_bytes;
          unsigned char background[3];
          memcpy(background, middle, 3);
          // find the top
          unsigned char * pixel = middle;
          while (y < height - 1 && !viewport.top) {
            if (memcmp(background, pixel, 3))
              viewport.top = height - y;
            pixel += row_bytes;
            y++;
          }
          // find the bottom
          y = height / 2;
          pixel = middle;
          while (y && !viewport.bottom) {
            if (memcmp(background, pixel, 3))
              viewport.bottom = height - y - 1;
            pixel -= row_bytes;
            y--;
          }
          if (!viewport.bottom)
            viewport.bottom = height - 1;
          // find the left
          pixel = middle;
          while (x && !viewport.left) {
            if (memcmp(background, pixel, 3))
              viewport.left = x;
            pixel -= pixel_bytes;
            x--;
          }
          // find the right
          x = width / 2;
          pixel = middle;
          while (x < width && !viewport.right) {
            if (memcmp(background, pixel, 3))
              viewport.right = x - 1;
            pixel += pixel_bytes;
            x++;
          }
          if (!viewport.right)
            viewport.right = width - 1;
        }
        if (viewport.right - viewport.left > (long)width / 2 &&
          viewport.bottom - viewport.top > (long)height / 2) {
          screen_capture_.SetViewport(viewport);
        }
      }
    }
    captured.Free();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptRecorder::SaveProgressData() {
  CStringA progress;
  EnterCriticalSection(&cs_);
  POSITION pos = progress_data_.GetHeadPosition();
  while( pos ) {
    if (progress.IsEmpty())
      progress = "Offset Time (ms),Bandwidth In (kbps),"
                  "CPU Utilization (%),Memory Use (KB)\r\n";
    ProgressData data = progress_data_.GetNext(pos);
    DWORD ms = ElapsedMsFromStart(data._time);
    CStringA buff;
    buff.Format("%d,%d,%0.2f,%d\r\n", ms, data._bpsIn, data._cpu, 0 );
    progress += buff;
  }
  LeaveCriticalSection(&cs_);
  gzFile progress_file = gzopen((LPCSTR)CT2A(file_base_ + PROGRESS_DATA_FILE + CString(".gz")), "wb6");
  if (progress_file) {
    gzwrite(progress_file, (voidpc)(LPCSTR)progress, (unsigned int)progress.GetLength());
    gzclose(progress_file);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptRecorder::SaveVideo() {
  ATLTRACE("Results::SaveVideo()");
  EnterCriticalSection(&cs_);
  screen_capture_.Lock();
  if (!screen_capture_._captured_images.IsEmpty()) {
    CStringA histograms = "[";
    DWORD histogram_count = 0;
    CxImage * last_image = NULL;
    DWORD width, height;
    CString file_name;
    Histogram start_histogram;

    // get the end-state histogram to use for comparing
    Histogram end_histogram;
    CxImage end_img;
    if (screen_capture_.GetImage(CapturedImage::FULLY_LOADED, end_img))
      end_histogram.FromImage(end_img);
    visually_complete_ = 0;
    speed_index_ = 0;
    double last_progress = 0.0;
    DWORD last_progress_time = 0;

    // loop through all of the frames
    POSITION pos = screen_capture_._captured_images.GetHeadPosition();
    DWORD bottom_margin = INITIAL_BOTTOM_MARGIN;
    DWORD margin = INITIAL_MARGIN;
    while (pos) {
      CStringA json;
      CapturedImage& image = screen_capture_._captured_images.GetNext(pos);
      CxImage * img = new CxImage;
      if (image.Get(*img)) {
        DWORD image_time_ms = ElapsedMsFromStart(image._capture_time);
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
            if (!render_start_.QuadPart)
              render_start_.QuadPart = image._capture_time.QuadPart;
            last_visual_change_.QuadPart = image._capture_time.QuadPart;
            Histogram histogram = Histogram(*img);
            if (histogram.is_valid) {
              json = histogram.json();
              if (start_histogram.is_valid && end_histogram.is_valid) {
                double progress = histogram.VisualProgress(start_histogram, end_histogram);
                if (progress >= 0.9999 && !visually_complete_)
                  visually_complete_ = image_time_ms;
                speed_index_ += (int)((1.0 - last_progress) * (double)(image_time_ms - last_progress_time));
                last_progress = progress;
                last_progress_time = image_time_ms;
              }
            }
            if (capture_video_) {
              file_name.Format(_T("%s_progress_%04d.jpg"), (LPCTSTR)file_base_, 
                                image_time);
              SaveImage(*img, file_name, image_quality_, false, full_size_video_);
            }
          }
        } else {
          width = img->GetWidth();
          height = img->GetHeight();
          start_histogram.FromImage(*img);
          if (start_histogram.is_valid)
            json = start_histogram.json();
          // always save the first image at time zero
          image_time = 0;
          image_time_ms = 0;
          if (capture_video_) {
            file_name = file_base_ + _T("_progress_0000.jpg");
            SaveImage(*img, file_name, image_quality_, false, full_size_video_);
          }
        }

        if (!json.IsEmpty()) {
          if (histogram_count)
            histograms += ", ";
          histograms += "{\"histogram\": ";
          histograms += json;
          histograms += ", \"time\": ";
          CStringA buff;
          buff.Format("%d", image_time_ms);
          histograms += buff;
          histograms += "}";
          histogram_count++;
          if (save_histograms_) {
            file_name.Format(_T("%s_progress_%04d.hist"), (LPCTSTR)file_base_,
                              image_time);
            SaveHistogram(json, file_name, false);
          }
        }

        if (last_image)
          delete last_image;
        last_image = img;
      } else {
        delete img;
      }
    }

    if (last_image)
      delete last_image;

    if (histogram_count > 1 && save_histograms_) {
      histograms += "]";
      TCHAR path[MAX_PATH];
      lstrcpy(path, file_base_);
      TCHAR * file = PathFindFileName(path);
      int run = _tstoi(file);
      if (run) {
        int cached = _tcsstr(file, _T("_Cached")) ? 1 : 0;
        *file = 0;

        // file_name needs to include step prefix for multistep measurements
        file_name.Format(_T("%s%d.%d.histograms.json"), path, run, cached);
        SaveHistogram(histograms, file_name, true);
      }
    }
  }
  screen_capture_.Unlock();
  ATLTRACE("Results::SaveVideo() - Complete");
  LeaveCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptRecorder::ImagesAreDifferent(CxImage * img1, CxImage* img2,
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
        // Go two rows at a time.  We don't need to be sure every pixel matches
        for (DWORD row = bottom_margin; row < height && !different; row += 2) {
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
void WptRecorder::SaveImage(CxImage& image, CString file, BYTE quality,
                            bool force_small, bool _full_size_video) {
  if (image.IsValid()) {
    if (!_full_size_video &&
        (force_small || (image.GetWidth() > 600 && image.GetHeight() > 600))) {
      // Make a copy and resize the copy
      CxImage img(image);
      img.QIShrink(img.GetWidth() / 2, img.GetHeight() / 2);
      img.SetCodecOption(8, CXIMAGE_FORMAT_JPG);  // optimized encoding
      img.SetCodecOption(16, CXIMAGE_FORMAT_JPG); // progressive
      img.SetJpegQuality((BYTE)quality);
      img.Save(file, CXIMAGE_FORMAT_JPG);
    } else {
      // Save the image
      image.SetCodecOption(8, CXIMAGE_FORMAT_JPG);  // optimized encoding
      image.SetCodecOption(16, CXIMAGE_FORMAT_JPG); // progressive
      image.SetJpegQuality((BYTE)quality);
      image.Save(file, CXIMAGE_FORMAT_JPG);
    }
  }
}


/*-----------------------------------------------------------------------------
  Calculate the image histogram as a json data structure (ignoring white pixels)
-----------------------------------------------------------------------------*/
CStringA WptRecorder::GetHistogramJSON(CxImage& image) {
  CStringA histogram;
  if (image.IsValid()) {
    DWORD r[256], g[256], b[256];
    for (int i = 0; i < 256; i++) {
      r[i] = g[i] = b[i] = 0;
    }
    DWORD width = max(image.GetWidth() - RIGHT_MARGIN, 0);
    DWORD height = image.GetHeight();
    if (image.GetBpp() >= 15) {
      DWORD pixel_bytes = 3;
      if (image.GetBpp() == 32)
        pixel_bytes = 4;
      DWORD row_bytes = image.GetEffWidth();
      // Go two rows at a time.  We don't need to be sure every pixel matches
      for (DWORD row = BOTTOM_MARGIN; row < height; row ++) {
        BYTE * pixel = image.GetBits(row);
        for (DWORD x = 0; x < width; x++) {
          if (pixel[0] != 255 || 
              pixel[1] != 255 || 
              pixel[2] != 255) {
            r[pixel[0]]++;
            g[pixel[1]]++;
            b[pixel[2]]++;
          }
          pixel += pixel_bytes;
        }
      }
    } else {
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
void WptRecorder::SaveHistogram(CStringA& histogram, CString file, bool compress) {
  if (!histogram.IsEmpty()) {
    if (compress) {
      gzFile out_file = gzopen((LPCSTR)CT2A(file + CString(".gz")), "wb6");
      if (out_file) {
        gzwrite(out_file, (voidpc)(LPCSTR)histogram, (unsigned int)histogram.GetLength());
        gzclose(out_file);
      }
    } else {
      HANDLE file_handle = CreateFile(file, GENERIC_WRITE, 0, 0, 
                                      CREATE_ALWAYS, 0, 0);
      if (file_handle != INVALID_HANDLE_VALUE) {
        DWORD bytes;
        WriteFile(file_handle, (LPCSTR)histogram, histogram.GetLength(), &bytes, 0);
        CloseHandle(file_handle);
      }
    }
  }
}
