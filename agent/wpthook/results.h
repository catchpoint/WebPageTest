#pragma once

class Requests;
class Request;
class TestState;
class TrackSockets;
class ScreenCapture;
class CxImage;

class Results
{
public:
  Results(TestState& test_state, Requests& requests, TrackSockets& sockets,
          ScreenCapture& screen_capture);
  ~Results(void);

  void Reset(void);
  void Save(void);

  // test information
  CString _url;

private:
  CString     _file_base;
  Requests&   _requests;
  TestState&  _test_state;
  TrackSockets& _sockets;
  ScreenCapture& _screen_capture;

  void SavePageData(void);
  void SaveRequests(void);
  void SaveRequest(HANDLE file, HANDLE headers, Request * request, int index);
  void SaveImages(void);
  void SaveVideo(void);
  void SaveImage(CxImage& image, CString file, bool shrink, BYTE quality);
  bool ImagesAreDifferent(CxImage * img1, CxImage* img2);
};

