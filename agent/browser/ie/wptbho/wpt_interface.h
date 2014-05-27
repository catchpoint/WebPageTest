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
  void  OnNavigateError(CString options);
  void  OnTitle(CString title);
  void  OnStatus(CString status);
  void  ReportDOMElementCount(DWORD count);
  void  ReportNavigationTiming(CString timing);
  void  ReportUserTiming(CString events);
  void  ReportCustomMetrics(CString custom_metrics);

private:
  bool HttpGet(CString url, CString& response);
  bool HttpPost(CString url, const char * body = NULL);
  bool CrackUrl(CString url, CString &host, unsigned short &port, 
                CString& object, DWORD &secure_flag);
};

