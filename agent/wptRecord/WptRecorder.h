#pragma once
#include "../wpthook/screen_capture.h"
#include "../wpthook/WinPCap.h"

class ProgressData {
public:
  ProgressData(void):_cpu(0.0),_bpsIn(0) {
    _time.QuadPart = 0; 
  }
  ProgressData(const ProgressData& src){*this = src;}
  ~ProgressData(){       }
  const ProgressData& operator =(const ProgressData& src) {
    _time.QuadPart = src._time.QuadPart;
    _cpu = src._cpu;
    _bpsIn = src._bpsIn;
    return src;
  }
  
  LARGE_INTEGER   _time;
  double          _cpu;            // CPU utilization
  DWORD           _bpsIn;          // inbound bandwidth
};

class WptRecorder
{
public:
  WptRecorder();
  ~WptRecorder();
  int Prepare();
  int Start();
  int Stop();
  int Process(DWORD start_offset);
  int Done();
  int WaitForIdle(DWORD wait_seconds);
  void SetFileBase(CString file_base) {file_base_ = file_base;}
  void EnableVideo() {capture_video_ = true;}
  void EnableTcpdump() {winpcap_.Initialize(); capture_tcpdump_ = true;}
  void EnableHistograms() {save_histograms_ = true;}
  void SetImageQuality(int quality) {image_quality_ = quality;}
  void EnableFullSizeVideo() {full_size_video_ = true;}

  void CollectData();

protected:
  bool FindBrowserWindow();
  void FindViewport();
  void GrabVideoFrame();
  void CollectSystemStats(LARGE_INTEGER &now);
  void Reset();
  void SaveProgressData();
  void SaveVideo();
  DWORD ElapsedMsFromStart(LARGE_INTEGER end) const;
  void SaveImage(CxImage& image, CString file, BYTE quality,
                 bool force_small = false, bool _full_size_video = false);
  bool ImagesAreDifferent(CxImage * img1, CxImage* img2, DWORD bottom_margin, DWORD margin);
  void SaveHistogram(CStringA& histogram, CString file, bool compress);
  CStringA GetHistogramJSON(CxImage& image);
  void WaitForCPUIdle(DWORD wait_seconds);

  // Settings
  CString file_base_;
  bool capture_video_;
  bool capture_tcpdump_;
  bool save_histograms_;
  bool full_size_video_;
  int image_quality_;

  // Calculated results
  DWORD visually_complete_;
  DWORD speed_index_;
  LARGE_INTEGER render_start_;
  LARGE_INTEGER last_visual_change_;

  HWND browser_window_;
  ScreenCapture screen_capture_;
  CWinPCap      winpcap_;
  LARGE_INTEGER start_;
  LARGE_INTEGER frequency_;
  LARGE_INTEGER ms_frequency_;
  LARGE_INTEGER last_data_;
  LARGE_INTEGER last_video_time_;
  LARGE_INTEGER last_activity_;
  DWORD         video_capture_count_;
  bool          active_;
  HANDLE        data_timer_;
  CRITICAL_SECTION cs_;
  ULARGE_INTEGER last_cpu_idle_;
  ULARGE_INTEGER last_cpu_kernel_;
  ULARGE_INTEGER last_cpu_user_;
  unsigned __int64 last_bytes_in_;
  unsigned __int64 last_bytes_out_;
  CAtlList<ProgressData>   progress_data_;     // CPU, memory and Bandwidth
  HANDLE        shaper_driver_;
};

