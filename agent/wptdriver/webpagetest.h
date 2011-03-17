/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#pragma once
class WebPagetest {
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

