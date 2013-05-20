#pragma once

class WptTask;

class WptInterface
{
public:
  WptInterface(void);
  ~WptInterface(void);

  bool  GetTask(WptTask& task);
  void  OnLoad(CString options);
  void  OnNavigate();
  void  OnTitle(CString title);
  void  OnStatus(CString status);

private:
  bool HttpGet(CString url, CString& response);
};

