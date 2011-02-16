#pragma once

class WptDriverCore
{
public:
  WptDriverCore(WptStatus &status);
  ~WptDriverCore(void);

  void Start(void);
  void Stop(void);
  void WorkThread(void);

private:
  WptSettings _settings;
  WptStatus&  _status;
  WebPagetest _webpagetest;
  bool        _exit;
  HANDLE      _thread_handle;
};

