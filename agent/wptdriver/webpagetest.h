#pragma once
class WebPagetest
{
public:
  WebPagetest(WptSettings &settings, WptStatus &status);
  ~WebPagetest(void);
  bool GetTest(WptTest& test);
  bool UploadIncrementalResults(WptTest& test);
  bool TestDone(WptTest& test);

private:
  WptSettings&  _settings;
  WptStatus&    _status;

  CString HttpGet(CString url);
  bool    ParseTest(CString& test_string, WptTest& test);
  bool    CrackUrl(CString url, CString &host, unsigned short &port, 
                    CString& object);
  bool    BuildFormData(WptSettings& settings, WptTest& test, 
                            bool done,
                            CString file_name, DWORD file_size,
                            CString& headers, CStringA& footer, 
                            CStringA& form_data, DWORD& content_length);
  bool    UploadFile(CString url, bool done, WptTest& test, CString file);
  bool    CompressResults(CString directory, CString zip_file);
  bool    UploadImages(WptTest& test);
  bool    UploadData(WptTest& test, bool done);
};

