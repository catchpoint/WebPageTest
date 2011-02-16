#pragma once
class WebPagetest
{
public:
  WebPagetest(WptSettings &settings, WptStatus &status);
  ~WebPagetest(void);
  bool GetTest(WptTest& test);

private:
  WptSettings&  _settings;
  WptStatus&    _status;

  CString HttpGet(CString url);
  bool    ParseTest(CString& test_string, WptTest& test);
  bool    CrackUrl(CString url, CString &host, unsigned short &port, 
                    CString& object);
};

