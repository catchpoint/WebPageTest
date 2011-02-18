#pragma once

class WptSettings;
class WptTest;

class TestData
{
public:
  TestData(void);
  ~TestData(void);

  bool BuildFormData(WptSettings& settings, WptTest& test, 
                      CString& headers, CStringA& footer, 
                      CStringA& form_data, DWORD& content_length);
};

