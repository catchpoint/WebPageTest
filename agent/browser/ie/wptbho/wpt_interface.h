#pragma once

class WptTask;

class WptInterface
{
public:
  WptInterface(void);
  ~WptInterface(void);

  bool  GetTask(WptTask& task);
  void  OnLoad();
  void  OnNavigate();
  void  OnTitle(CString title);

private:
  bool HttpGet(CString url, CString& response);
};

