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

#include "StdAfx.h"
#include "webpagetest.h"
#include <Wincrypt.h>
#include <Shellapi.h>
#include <IPHlpApi.h>
#include "zlib/contrib/minizip/zip.h"
#include "zlib/contrib/minizip/unzip.h"
#include "util.h"

static const TCHAR * NO_FILE = _T("");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebPagetest::WebPagetest(WptSettings &settings, WptStatus &status):
  _settings(settings)
  ,_status(status)
  ,_majorVer(0)
  ,_minorVer(0)
  ,_buildNo(0)
  ,_revisionNo(0)
  ,_exit(false)
  ,has_gpu_(false)
  ,rebooting_(false) {
  SetErrorMode(SEM_FAILCRITICALERRORS);
  // get the version number of the binary (for software updates)
  TCHAR file[MAX_PATH];
  if (GetModuleFileName(NULL, file, _countof(file))) {
    DWORD unused;
    DWORD infoSize = GetFileVersionInfoSize(file, &unused);
    if (infoSize) {
      LPBYTE pVersion = new BYTE[infoSize];
      if (GetFileVersionInfo(file, 0, infoSize, pVersion)) {
        VS_FIXEDFILEINFO * info = NULL;
        UINT size = 0;
        if( VerQueryValue(pVersion, _T("\\"), (LPVOID*)&info, &size) && info )
        {
          _majorVer = HIWORD(info->dwFileVersionMS);
          _minorVer = LOWORD(info->dwFileVersionMS);
          _buildNo = HIWORD(info->dwFileVersionLS);
          _revisionNo = LOWORD(info->dwFileVersionLS);
        }
      }

      delete [] pVersion;
    }
  }
  // Get the OS platform and version
  #pragma warning(disable:4996) // deprecated GetVersionEx
  OSVERSIONINFOEX osvi;
  ZeroMemory(&osvi, sizeof(OSVERSIONINFOEX));
  osvi.dwOSVersionInfoSize = sizeof(OSVERSIONINFOEX);
  GetVersionEx((LPOSVERSIONINFO)&osvi);
  _winMajor = osvi.dwMajorVersion;
  _winMinor = osvi.dwMinorVersion;
  _isServer = osvi.wProductType == VER_NT_WORKSTATION ? 0 : 1;
  BOOL isWow64 = FALSE;
  IsWow64Process(GetCurrentProcess(), &isWow64);
  _is64Bit = isWow64 ? 1 : 0;

  // get the computer name (and escape it)
  TCHAR name[MAX_COMPUTERNAME_LENGTH + 1];
  DWORD len = _countof(name);
  name[0] = 0;
  if (GetComputerName(name, &len) && lstrlen(name)) {
    TCHAR escaped[INTERNET_MAX_URL_LENGTH];
    len = _countof(escaped);
    if ((UrlEscape(name, escaped, &len, URL_ESCAPE_SEGMENT_ONLY | 
                      URL_ESCAPE_PERCENT) == S_OK) && lstrlen(escaped))
      _computer_name = escaped;
  }
  UpdateDNSServers();

  _screenWidth = GetSystemMetrics(SM_CXSCREEN);
  _screenHeight = GetSystemMetrics(SM_CYSCREEN);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebPagetest::~WebPagetest(void) {
}

/*-----------------------------------------------------------------------------
  Fetch a test from the server
-----------------------------------------------------------------------------*/
bool WebPagetest::GetTest(WptTestDriver& test) {
  bool ret = false;

  if (rebooting_) {
    // We should never get here, but if we do make sure to keep trying to reboot
    Reboot();
    return false;
  }

  DeleteDirectory(test._directory, false);

  // build the url for the request
  CString buff;
  CString url = _settings._server + _T("work/getwork.php?shards=1&reboot=1");
  buff.Format(_T("&location=%s&screenwidth=%d&screenheight=%d&winver=%d.%d&winserver=%d&is64bit=%d"),
              _settings._location, _screenWidth, _screenHeight, _winMajor, _winMinor, _isServer, _is64Bit);
  url += buff;
  if (_settings._key.GetLength())
    url += CString(_T("&key=")) + _settings._key;
  if (_majorVer || _minorVer || _buildNo || _revisionNo) {
    buff.Format(_T("&software=wpt&version=%d.%d.%d.%d&ver=%d"), _majorVer,
                _minorVer, _buildNo, _revisionNo, _revisionNo);
    url += buff;
  }

  if (_computer_name.GetLength())
    url += CString(_T("&pc=")) + _computer_name;
  if (_settings._ec2_instance.GetLength())
    url += CString(_T("&ec2=")) + _settings._ec2_instance;
  if (_settings._azure_instance.GetLength())
    url += CString(_T("&azure=")) + _settings._azure_instance;
  if (_dns_servers.GetLength())
    url += CString(_T("&dns=")) + _dns_servers;
  ULARGE_INTEGER fd;
  if (GetDiskFreeSpaceEx(_T("C:\\"), NULL, NULL, &fd)) {
    double freeDisk = (double)(fd.QuadPart / (1024 * 1024)) / 1024.0;
    buff.Format(_T("&freedisk=%0.3f"), freeDisk);
    url += buff;
  }
  url += has_gpu_ ? _T("&GPU=1") : _T("&GPU=0");

  CString test_string, zip_file;
  if (HttpGet(url, test, test_string, zip_file)) {
    if (test_string.GetLength()) {
      if (test_string == _T("Reboot")) {
        rebooting_ = true;
        Reboot();
      } else if (test.Load(test_string)) {
        if (!test._client.IsEmpty())
          ret = GetClient(test);
        else
          ret = true;
      }
    } else if (zip_file.GetLength()) {
      ret = ProcessZipFile(zip_file, test);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebPagetest::DeleteIncrementalResults(WptTestDriver& test) {
  bool ret = true;

  CString directory = test._directory + CString(_T("\\"));
  TCHAR * glob_pattern = _T("*.*");
  CAtlList<CString> files;
  GetFiles(directory, glob_pattern, files);
  while (!files.IsEmpty()) {
    DeleteFile(files.RemoveHead());
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebPagetest::UploadIncrementalResults(WptTestDriver& test) {
  bool ret = true;

  ATLTRACE(_T("[wptdriver] - UploadIncrementalResults"));

  if (!test._discard_test) {
    CString directory = test._directory + CString(_T("\\"));
    CAtlList<CString> image_files;
    GetImageFiles(directory, image_files);
    ret = UploadImages(test, image_files);
    if (ret) {
      ret = UploadData(test, false);
      SetCPUUtilization(0);
    }
  } else {
    DeleteIncrementalResults(test);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Send the test result back to the server
-----------------------------------------------------------------------------*/
bool WebPagetest::TestDone(WptTestDriver& test){
  bool ret = true;

  UpdateDNSServers();
  CString directory = test._directory + CString(_T("\\"));
  CAtlList<CString> image_files;
  GetImageFiles(directory, image_files);
  ret = UploadImages(test, image_files);
  if (ret) {
    ret = UploadData(test, true);
    SetCPUUtilization(0);
  }

  ATLTRACE(_T("[wptdriver] - Test Done"));

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WebPagetest::GetImageFiles(const CString& directory,
                                CAtlList<CString>& image_files) {
  TCHAR * glob_patterns[] = {
    _T("*.jpg"), _T("*.png"), _T("*.dtas"), _T("*.cap"), 
    _T("*.gz"), _T("*.hist")
  };
  for (int i = 0; i < _countof(glob_patterns); i++) {
    GetFiles(directory, glob_patterns[i], image_files);
  }
}

void WebPagetest::GetFiles(const CString& directory,
                           const TCHAR* glob_pattern,
                           CAtlList<CString>& files) {
  WIN32_FIND_DATA fd;
  HANDLE find_handle = FindFirstFile(directory + glob_pattern, &fd);
  if (find_handle != INVALID_HANDLE_VALUE) {
    do {
      if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
        CString file = directory + fd.cFileName;
        files.AddTail(file);
      }
    } while (FindNextFile(find_handle, &fd));
    FindClose(find_handle);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebPagetest::UploadImages(WptTestDriver& test,
                               CAtlList<CString>& image_files) {
  bool ret = true;

  // Upload the large binary files individually (e.g. images, tcpdump).
  CString url = _settings._server + _T("work/resultimage.php");
  POSITION pos = image_files.GetHeadPosition();
  while (ret && pos) {
    CString file = image_files.GetNext(pos);
    if (!test._discard_test)
      ret = UploadFile(url, false, test, file);
    if (ret)
      DeleteFile(file);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebPagetest::UploadData(WptTestDriver& test, bool done) {
  bool ret = false;

  CString file = NO_FILE;
  CString dir = test._directory + CString(_T("\\"));
  ret = CompressResults(dir, dir + _T("results.zip"));
  if (ret)
    file = dir + _T("results.zip");

  if (ret || done) {
    CString url = _settings._server + _T("work/workdone.php");
    ret = UploadFile(url, done, test, file);
    if (ret)
      DeleteFile(file);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Set the credentials required to access the server, if configured
-----------------------------------------------------------------------------*/
void WebPagetest::SetLoginCredentials(HINTERNET request) {
  if (!_settings._username.IsEmpty() && !_settings._password.IsEmpty()) {
    InternetSetOption(request, INTERNET_OPTION_USERNAME,
      (LPVOID)(PCTSTR)(_settings._username), _settings._username.GetLength() + 1);
    InternetSetOption(request, INTERNET_OPTION_PASSWORD,
      (LPVOID)(PCTSTR)(_settings._password), _settings._password.GetLength() + 1);
  }
}

/*-----------------------------------------------------------------------------
  Retrieves a client certificate from the Personal certificate store.  Gets the
  first certificate, or the certificate that matches the common name specified
  in the settings
-----------------------------------------------------------------------------*/
void WebPagetest::LoadClientCertificateFromStore(HINTERNET request) {
  HCERTSTORE hMyStore = CertOpenSystemStore(0, _T("MY"));

  if (!hMyStore)
    return;

  PCCERT_CONTEXT pDesiredCert = NULL;
  if (!_settings._clientCertCommonName.IsEmpty()) {
    CERT_RDN cert_rdn;
    CERT_RDN_ATTR cert_rdn_attr;

    cert_rdn.cRDNAttr = 1;
    cert_rdn.rgRDNAttr = &cert_rdn_attr;

    _settings._clientCertCommonName;
    cert_rdn_attr.pszObjId = szOID_COMMON_NAME;
    cert_rdn_attr.dwValueType = CERT_RDN_ANY_TYPE;
    cert_rdn_attr.Value.cbData = _settings._clientCertCommonName.GetLength();

    LPSTR pCommonName = new char[_settings._clientCertCommonName.GetLength() + 1];
    WideCharToMultiByte(CP_ACP, 0, _settings._clientCertCommonName, -1, pCommonName, _settings._clientCertCommonName.GetLength() + 1, NULL, NULL);
    cert_rdn_attr.Value.pbData = (BYTE *)pCommonName;

    pDesiredCert = CertFindCertificateInStore(
      hMyStore,
      X509_ASN_ENCODING | PKCS_7_ASN_ENCODING,
      0,
      CERT_FIND_SUBJECT_ATTR,
      &cert_rdn,
      NULL);

    delete[] pCommonName;
  }
  else {
    // use the first certificate in the store
    pDesiredCert = CertFindCertificateInStore(
      hMyStore,
      X509_ASN_ENCODING | PKCS_7_ASN_ENCODING,
      0,
      NULL,
      NULL,
      NULL);
  }

  if (pDesiredCert) {
    InternetSetOption(request, INTERNET_OPTION_CLIENT_CERT_CONTEXT,
      (LPVOID)pDesiredCert, sizeof(CERT_CONTEXT));
    CertFreeCertificateContext(pDesiredCert);
  }

  if (hMyStore)
    CertCloseStore(hMyStore, 0);
}

/*-----------------------------------------------------------------------------
  Perform a http GET operation and return the body as a string
-----------------------------------------------------------------------------*/
bool WebPagetest::HttpGet(CString url, WptTestDriver& test,
                          CString& test_string, CString& zip_file) {
  bool result = false;

  // Use WinInet to make the request
  HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    DWORD timeout = 300000;
    DWORD fetch_timeout = 360000;
    InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT, 
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_RECEIVE_TIMEOUT, 
                      &fetch_timeout, sizeof(fetch_timeout));
    InternetSetOption(internet, INTERNET_OPTION_SEND_TIMEOUT, 
                      &timeout, sizeof(timeout));
    CString host, object;
    unsigned short port;
    DWORD secure_flags;
    if (CrackUrl(url, host, port, object, secure_flags)) {
      HINTERNET connect = InternetConnect(internet, host, port, NULL, NULL,
        INTERNET_SERVICE_HTTP, 0, 0);
      if (connect) {
        HINTERNET request = HttpOpenRequest(connect, _T("GET"), object, NULL, NULL, NULL,
          INTERNET_FLAG_NO_CACHE_WRITE |
          INTERNET_FLAG_NO_UI |
          INTERNET_FLAG_PRAGMA_NOCACHE |
          INTERNET_FLAG_RELOAD | 
          INTERNET_FLAG_KEEP_CONNECTION | 
          secure_flags, 0);
        if (request) {

          SetLoginCredentials(request);
          BOOL send_request_result = HttpSendRequest(request, NULL, 0, NULL, 0);
          if (!send_request_result) {
            DWORD dwError = GetLastError();
            if (dwError == ERROR_INTERNET_CLIENT_AUTH_CERT_NEEDED) {
              LoadClientCertificateFromStore(request);
              send_request_result = HttpSendRequest(request, NULL, 0, NULL, 0);
            } 
          }

          if (send_request_result) {
            TCHAR mime_type[1024] = TEXT("\0");
            DWORD len = _countof(mime_type);

            if (HttpQueryInfo(request, HTTP_QUERY_CONTENT_TYPE, mime_type,
              &len, NULL)) {
              result = true;
              bool is_zip = false;
              char buff[4097];
              DWORD bytes_read, bytes_written;
              HANDLE file = INVALID_HANDLE_VALUE;
              if (!lstrcmpi(mime_type, _T("application/zip"))) {
                zip_file = test._directory + _T("\\wpt.zip");
                file = CreateFile(zip_file, GENERIC_WRITE, 0, 0, CREATE_ALWAYS, 0, NULL);
                is_zip = true;
              }
              while (InternetReadFile(request, buff, sizeof(buff) - 1,
                &bytes_read) && bytes_read) {
                if (is_zip) {
                  WriteFile(file, buff, bytes_read, &bytes_written, 0);
                }
                else {
                  // NULL-terminate it and add it to our response string
                  buff[bytes_read] = 0;
                  test_string += CA2T(buff, CP_UTF8);
                }
              }
              if (file != INVALID_HANDLE_VALUE)
                CloseHandle(file);
            }
          }
          InternetCloseHandle(request);
        }
        InternetCloseHandle(connect);
      }
    }
    InternetCloseHandle(internet);
  }

  return result;
}

/*-----------------------------------------------------------------------------
  Upload an individual file from a result set
-----------------------------------------------------------------------------*/
bool WebPagetest::UploadFile(CString url, bool done, WptTestDriver& test, 
                                                                 CString file){
  bool ret = false;

  CString headers;
  CStringA form_data, footer;
  DWORD content_length = 0;
  DWORD file_size = 0;
  CString file_name;
  HANDLE file_handle = INVALID_HANDLE_VALUE;

  // build the file name and file size if the file exists
  if (!test._discard_test && file.GetLength()) {
    file_handle = CreateFile(file, GENERIC_READ, FILE_SHARE_READ, 0, 
                              OPEN_EXISTING, 0, 0);
    if (file_handle != INVALID_HANDLE_VALUE) {
      file_size = GetFileSize(file_handle, NULL);
      if (file_size)
        file_name = PathFindFileName(file);
    }
  }

  ATLTRACE(_T("[wptdriver] - Uploading '%s' (%d bytes) to '%s'"), (LPCTSTR)file, file_size, (LPCTSTR)url);

  BuildFormData(_settings, test, done, file_name, file_size, 
                headers, footer, form_data, content_length);

  // use WinInet to do the POST (quite a few steps)
  HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
            INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
  if (internet) {
    DWORD timeout = 600000;
    InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT,
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_RECEIVE_TIMEOUT,
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_SEND_TIMEOUT,
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_DATA_SEND_TIMEOUT,
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_DATA_RECEIVE_TIMEOUT,
                      &timeout, sizeof(timeout));

    CString host, object;
    unsigned short port;
    DWORD secure_flag;
    if (CrackUrl(url, host, port, object, secure_flag)) {
      ATLTRACE(_T("[wptdriver] - Connecting to '%s' port %d"), (LPCTSTR)host, port);
      HINTERNET connect = InternetConnect(internet, host, port, NULL, NULL,
                                          INTERNET_SERVICE_HTTP, 0, 0);
      if (connect) {
        ATLTRACE(_T("[wptdriver] - POSTing to %s"), (LPCTSTR)object);
        HINTERNET request = HttpOpenRequest(connect, _T("POST"), object, 
                                              NULL, NULL, NULL, 
                                              INTERNET_FLAG_NO_CACHE_WRITE |
                                              INTERNET_FLAG_NO_UI |
                                              INTERNET_FLAG_PRAGMA_NOCACHE |
                                              INTERNET_FLAG_RELOAD |
                                              INTERNET_FLAG_KEEP_CONNECTION |
                                              secure_flag, NULL);
        if (request) {
          SetLoginCredentials(request);
          if (HttpAddRequestHeaders(request, headers, headers.GetLength(), 
                                    HTTP_ADDREQ_FLAG_ADD |
                                    HTTP_ADDREQ_FLAG_REPLACE)) {
            INTERNET_BUFFERS buffers;
            memset( &buffers, 0, sizeof(buffers) );
            buffers.dwStructSize = sizeof(buffers);
            buffers.dwBufferTotal = content_length;
            ATLTRACE(_T("[wptdriver] - Sending request"));
            BOOL send_request_result = HttpSendRequestEx(request, &buffers, NULL, 0, NULL);
            if (!send_request_result) {
              DWORD dwError = GetLastError();
              if (dwError == ERROR_INTERNET_CLIENT_AUTH_CERT_NEEDED) {
                LoadClientCertificateFromStore(request);
                send_request_result = HttpSendRequestEx(request, &buffers, NULL, 0, NULL);
              }
            }

            if (send_request_result) {
              DWORD bytes_written;
              ATLTRACE(_T("[wptdriver] - Writing data"));
              if (InternetWriteFile(request, (LPCSTR)form_data, 
                                    form_data.GetLength(), &bytes_written)) {
                ATLTRACE(_T("[wptdriver] - Uploading the file"));
                // upload the file itself
                if (file_handle != INVALID_HANDLE_VALUE && file_size) {
                    DWORD chunkSize = min(64 * 1024, file_size);
                    LPBYTE mem = (LPBYTE)malloc(chunkSize);
                    if (mem) {
                      DWORD bytes;
                      while (ReadFile(file_handle, mem, chunkSize, 
                                                        &bytes, 0) && bytes) {
                        InternetWriteFile(request, mem, bytes, 
                                                          &bytes_written);
                      }
                      free(mem);
                    }
                }

                // upload the end of the form data
                if (InternetWriteFile(request, (LPCSTR)footer, 
                                      footer.GetLength(), &bytes_written)) {
                  if (HttpEndRequest(request, NULL, 0, 0)) {
                    ret = true;
                  }
                }
              } else {
                ATLTRACE(_T("InternetWriteFile failed: %d"), GetLastError());
              }
            } else {
              ATLTRACE(_T("HttpSendRequestEx failed: %d"), GetLastError());
            }
          }
          InternetCloseHandle(request);
        }
        InternetCloseHandle(connect);
      }
    }
    InternetCloseHandle(internet);
  }

  if (file_handle != INVALID_HANDLE_VALUE)
    CloseHandle( file_handle );

  if (ret)
    DeleteFile(file);

  ATLTRACE(_T("[wptdriver] - Upload %s"), ret ? _T("SUCCEEDED") : _T("FAILED"));

  return ret;
}

/*-----------------------------------------------------------------------------
  Helper function to crack an url into it's component parts
-----------------------------------------------------------------------------*/
bool WebPagetest::CrackUrl(CString url, CString &host, unsigned short &port,
                           CString& object, DWORD &secure_flag){
  bool ret = false;

  secure_flag = 0;
  URL_COMPONENTS parts;
  memset(&parts, 0, sizeof(parts));
  TCHAR szHost[10000];
  TCHAR path[10000];
  TCHAR extra[10000];
  TCHAR scheme[100];
    
  memset(szHost, 0, sizeof(szHost));
  memset(path, 0, sizeof(path));
  memset(extra, 0, sizeof(extra));
  memset(scheme, 0, sizeof(scheme));

  parts.lpszHostName = szHost;
  parts.dwHostNameLength = _countof(szHost);
  parts.lpszUrlPath = path;
  parts.dwUrlPathLength = _countof(path);
  parts.lpszExtraInfo = extra;
  parts.dwExtraInfoLength = _countof(extra);
  parts.lpszScheme = scheme;
  parts.dwSchemeLength = _countof(scheme);
  parts.dwStructSize = sizeof(parts);

  if( InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts) ){
      ret = true;
      host = szHost;
      port = parts.nPort;
      object = path;
      object += extra;
      if (!lstrcmpi(scheme, _T("https"))) {
        secure_flag = INTERNET_FLAG_SECURE;
        if (!_settings._requireValidCertificate) {
          secure_flag |= INTERNET_FLAG_IGNORE_CERT_CN_INVALID |
          INTERNET_FLAG_IGNORE_CERT_DATE_INVALID;
        }
        if (!port)
          port = INTERNET_DEFAULT_HTTPS_PORT;
      } else if (!port)
        port = INTERNET_DEFAULT_HTTP_PORT;
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Build the form data for a POST (with an optional file)
-----------------------------------------------------------------------------*/
void WebPagetest::BuildFormData(WptSettings& settings, WptTestDriver& test, 
                            bool done,
                            CString file_name, DWORD file_size,
                            CString& headers, CStringA& footer, 
                            CStringA& form_data, DWORD& content_length){
  footer = "";
  form_data = "";

  CStringA buffA;
  CStringA boundary = "----------ThIs_Is_tHe_bouNdaRY";
  GUID guid;
  if (SUCCEEDED(CoCreateGuid(&guid)))
    boundary.Format("----------%08X%04X%04X%X%X%X%X%X%X%X%X",guid.Data1, 
      guid.Data2,guid.Data3,guid.Data4[0],guid.Data4[1],guid.Data4[2], 
      guid.Data4[3],guid.Data4[4],guid.Data4[5],guid.Data4[6],guid.Data4[7]);
  
  headers = CString("Content-Type: multipart/form-data; boundary=") + 
              CString(CA2T(boundary, CP_UTF8)) + _T("\r\n");

  // location
  form_data += CStringA("--") + boundary + "\r\n";
  form_data += "Content-Disposition: form-data; name=\"location\"\r\n\r\n";
  form_data += CStringA(CT2A(settings._location)) + "\r\n";

  // key
  if (settings._key.GetLength()) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"key\"\r\n\r\n";
    form_data += CStringA(CT2A(settings._key)) + "\r\n";
  }

  // id
  form_data += CStringA("--") + boundary + "\r\n";
  form_data += "Content-Disposition: form-data; name=\"id\"\r\n\r\n";
  form_data += CStringA(CT2A(test._id)) + "\r\n";

  // run
  form_data += CStringA("--") + boundary + "\r\n";
  form_data += "Content-Disposition: form-data; name=\"run\"\r\n\r\n";
  buffA.Format("%d", test._run);
  form_data += buffA + "\r\n";

  // index
  form_data += CStringA("--") + boundary + "\r\n";
  form_data += "Content-Disposition: form-data; name=\"index\"\r\n\r\n";
  buffA.Format("%d", test._index);
  form_data += buffA + "\r\n";

  // cached state
  form_data += CStringA("--") + boundary + "\r\n";
  form_data += "Content-Disposition: form-data; name=\"cached\"\r\n\r\n";
  form_data += test._clear_cache ? "0" : "1";
  form_data += "\r\n";

  // error string
  if (test._test_error.GetLength()) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"testerror\"\r\n\r\n";
    form_data += test._test_error + "\r\n";
  }
  if (test._run_error.GetLength()) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"error\"\r\n\r\n";
    form_data += test._run_error + "\r\n";
  }

  // done flag
  if (done) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"done\"\r\n\r\n";
    form_data += "1\r\n";
  }

  if (_computer_name.GetLength()) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"pc\"\r\n\r\n";
    form_data += CStringA(CT2A(_computer_name)) + "\r\n";
  }

  if (_settings._ec2_instance.GetLength()) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"ec2\"\r\n\r\n";
    form_data += CStringA(CT2A(_settings._ec2_instance)) + "\r\n";
  }

  if (_settings._azure_instance.GetLength()) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"azure\"\r\n\r\n";
    form_data += CStringA(CT2A(_settings._azure_instance)) + "\r\n";
  }

  // DNS servers
  if (!_dns_servers.IsEmpty()) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"dns\"\r\n\r\n";
    form_data += CStringA(CT2A(_dns_servers)) + "\r\n";
  }

  int cpu_utilization = GetCPUUtilization();
  if (cpu_utilization > 0) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"cpu\"\r\n\r\n";
    buffA.Format("%d", cpu_utilization);
    form_data += buffA + "\r\n";
  }

  // file
  if (file_name.GetLength() && file_size) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"file\"; filename=\"";
    form_data += CT2A(file_name);
    form_data += "\"\r\n";
    form_data += "Content-Type: application/zip\r\n\r\n";
    footer = "\r\n";
  }

  footer += CStringA("--") + boundary + "--\r\n";

  content_length = form_data.GetLength() + file_size + footer.GetLength();
  CString buff;
  buff.Format(_T("Content-Length: %u\r\n"), content_length);
  headers += buff;
}

/*-----------------------------------------------------------------------------
  Zip up all of the files in the provided directory
-----------------------------------------------------------------------------*/
bool WebPagetest::CompressResults(CString directory, CString zip_file) {
  bool ret = false;

  // create a zip file of the results
  zipFile file = zipOpen(CT2A(zip_file), APPEND_STATUS_CREATE);
  if (file) {
    ret = true;
    WIN32_FIND_DATA fd;
    HANDLE find_handle = FindFirstFile( directory + _T("*.*"), &fd);
    if (find_handle != INVALID_HANDLE_VALUE) {
      do {
        if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
          CString file_path = directory + fd.cFileName;
          if( file_path.CompareNoCase(zip_file) ) {
            HANDLE new_file = CreateFile(file_path, GENERIC_READ, 
                                      FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
            if (new_file != INVALID_HANDLE_VALUE) {
              DWORD size = GetFileSize(new_file, 0);
              if (size) {
                BYTE * mem = (BYTE *)malloc(size);
                if (mem) {
                  DWORD bytes;
                  if (ReadFile(new_file,mem,size,&bytes, 0) && size == bytes) {
                    if (!zipOpenNewFileInZip(file, CT2A(fd.cFileName), 0, 0, 0, 
                                     0, 0, 0,Z_DEFLATED,Z_BEST_COMPRESSION )) {
                      zipWriteInFileInZip(file, mem, size);
                      zipCloseFileInZip(file);
                    }
                  }
                  free(mem);
                }
              }
              
              CloseHandle(new_file);
            }
            DeleteFile(file_path);
          }
        }
      } while (FindNextFile(find_handle, &fd));
      FindClose(find_handle);
    }
    zipClose(file, 0);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebPagetest::ProcessZipFile(CString zip_file, WptTestDriver& test) {
  bool ret = false;

  bool update = false;
  unzFile zip_file_handle = unzOpen(CT2A(zip_file));
  if (zip_file_handle) {
    if (unzGoToFirstFile(zip_file_handle) == UNZ_OK) {
      CStringA dir = CStringA(CT2A(test._directory)) + "\\";
      DWORD len = 4096;
      LPBYTE buff = (LPBYTE)malloc(len);
      if (buff) {
        do {
          char file_name[MAX_PATH];
          unz_file_info info;
          if (unzGetCurrentFileInfo(zip_file_handle, &info, (char *)&file_name,
              _countof(file_name), 0, 0, 0, 0) == UNZ_OK) {
              CStringA dest_file_name = dir + file_name;

            if( !lstrcmpiA(file_name, "wptupdate.exe") )
              update = true;

            // make sure the directory exists
            char szDir[MAX_PATH];
            lstrcpyA(szDir, (LPCSTR)dest_file_name);
            *PathFindFileNameA(szDir) = 0;
            if( lstrlenA(szDir) > 3 )
              SHCreateDirectoryExA(NULL, szDir, NULL);

            HANDLE dest_file = CreateFileA(dest_file_name, GENERIC_WRITE, 0, 
                                          NULL, CREATE_ALWAYS, 0, 0);
            if (dest_file != INVALID_HANDLE_VALUE) {
              if (unzOpenCurrentFile(zip_file_handle) == UNZ_OK) {
                int bytes = 0;
                DWORD written;
                do {
                  bytes = unzReadCurrentFile(zip_file_handle, buff, len);
                  if( bytes > 0 )
                    WriteFile(dest_file, buff, bytes, &written, 0);
                } while( bytes > 0 );
                unzCloseCurrentFile(zip_file_handle);
              }
              CloseHandle( dest_file );
            }
          }
        } while (unzGoToNextFile(zip_file_handle) == UNZ_OK);

        free(buff);
      }
    }

    unzClose(zip_file_handle);
  }

  DeleteFile(zip_file);

  if (update) {
    InstallUpdate(test._directory);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebPagetest::InstallUpdate(CString dir) {
  bool ret = false;

  // validate all of the files
  HCRYPTPROV crypto = 0;
  bool ok = false;
  if (CryptAcquireContext(&crypto, NULL, NULL, PROV_RSA_FULL, 
                          CRYPT_VERIFYCONTEXT)) {
    TCHAR valid_hash[100];
    TCHAR file_hash[100];
    BYTE buff[4096];
    DWORD bytes = 0;
    ok = true;
    WIN32_FIND_DATA fd;
    HANDLE find_handle = FindFirstFile(dir + _T("\\*.*"), &fd);
    if( find_handle != INVALID_HANDLE_VALUE ) {
      do {
        if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) && 
              lstrcmpi(fd.cFileName, _T("wptupdate.ini"))) {
          ok = false;

          // Check the file has against the ini file (all files need hashes)
          *valid_hash = 0;
          if (GetPrivateProfileString(_T("md5"), fd.cFileName, _T(""), 
                      valid_hash, _countof(valid_hash), 
                      dir + _T("\\wptupdate.ini"))) {
            HCRYPTHASH crypto_hash = 0;
            if (CryptCreateHash(crypto, CALG_MD5, 0, 0, &crypto_hash)) {
              HANDLE file = CreateFile( dir + CString(_T("\\")) + fd.cFileName,
                        GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
              if (file != INVALID_HANDLE_VALUE) {
                ok = true;
                while (ReadFile(file, buff, sizeof(buff), &bytes, 0) && bytes)
                  if (!CryptHashData(crypto_hash, buff, bytes, 0))
                    ok = false;

                if (ok) {
                  BYTE hash[16];
                  DWORD len = 16;
                  if (CryptGetHashParam(crypto_hash, HP_HASHVAL, 
                                        hash, &len, 0)) {
                    wsprintf(file_hash, _T("%02X%02X%02X%02X%02X%02X%02X%02X")
                              _T("%02X%02X%02X%02X%02X%02X%02X%02X"),
                        hash[0], hash[1], hash[2], hash[3], hash[4], hash[5], 
                        hash[6], hash[7], hash[8], hash[9], hash[10], hash[11],
                        hash[12], hash[13], hash[14], hash[15]);

                    if (lstrcmpi(file_hash, valid_hash))
                      ok = false;
                  } else
                    ok = false;
                }

                CloseHandle(file);
              }
              CryptDestroyHash(crypto_hash);
            }
          }
        }
      } while (ok && FindNextFile(find_handle, &fd));
      FindClose(find_handle);
    }

    CryptReleaseContext(crypto,0);
  }

  if (ok) {
    // prevent executing multiple updates in case something goes wrong
    _majorVer = 0;
    _minorVer = 0;
    _buildNo = 0;
    _revisionNo = 0;
    
    ShellExecute(NULL,NULL,dir+_T("\\wptupdate.exe"),NULL,dir,SW_SHOWNORMAL);

    // wait for up to 2 minutes for the update process to close us
    for (int i = 0; i < 1200 && !_exit; i++)
      Sleep(100);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Download and install the custom browser for the requested test
-----------------------------------------------------------------------------*/
bool WebPagetest::GetClient(WptTestDriver& test) {
  bool ret = false;

  if (!_settings._clients_directory.IsEmpty()) {
    CString client_dir = _settings._clients_directory + test._client;
    SHCreateDirectoryEx(NULL, client_dir, NULL);
    if (GetFileAttributes(client_dir + _T("\\client.ini")) != 
        INVALID_FILE_ATTRIBUTES) {
      ret = true;
    } else {
      // build the url for the request
      CString buff;
      CString url = _settings._server + _T("work/clients/");
      url += test._client + _T(".zip");
      CString test_string, zip_file;
      if (HttpGet(url, test, test_string, zip_file) &&
          zip_file.GetLength() &&
          UnzipTo(zip_file, client_dir) &&
          GetFileAttributes(client_dir + _T("\\client.ini")) != 
            INVALID_FILE_ATTRIBUTES)
        ret = true;

      if (zip_file.GetLength())
        DeleteFile(zip_file);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Unzip the given zip to the provided directory
-----------------------------------------------------------------------------*/
bool WebPagetest::UnzipTo(CString zip_file, CString dest) {
  bool ret = false;
  unzFile zip_file_handle = unzOpen(CT2A(zip_file));
  if (zip_file_handle) {
    if (unzGoToFirstFile(zip_file_handle) == UNZ_OK) {
      CStringA dir = CStringA(CT2A(dest)) + "\\";
      DWORD len = 4096;
      LPBYTE buff = (LPBYTE)malloc(len);
      if (buff) {
        ret = true;
        do {
          char file_name[MAX_PATH];
          unz_file_info info;
          if (unzGetCurrentFileInfo(zip_file_handle, &info, (char *)&file_name,
              _countof(file_name), 0, 0, 0, 0) == UNZ_OK) {
              CStringA dest_file_name = dir + file_name;

            // make sure the directory exists
            char szDir[MAX_PATH];
            lstrcpyA(szDir, (LPCSTR)dest_file_name);
            *PathFindFileNameA(szDir) = 0;
            if( lstrlenA(szDir) > 3 )
              SHCreateDirectoryExA(NULL, szDir, NULL);

            HANDLE dest_file = CreateFileA(dest_file_name, GENERIC_WRITE, 0, 
                                          NULL, CREATE_ALWAYS, 0, 0);
            if (dest_file != INVALID_HANDLE_VALUE) {
              if (unzOpenCurrentFile(zip_file_handle) == UNZ_OK) {
                int bytes = 0;
                DWORD written;
                do {
                  bytes = unzReadCurrentFile(zip_file_handle, buff, len);
                  if( bytes > 0 )
                    WriteFile(dest_file, buff, bytes, &written, 0);
                } while( bytes > 0 );
                unzCloseCurrentFile(zip_file_handle);
              } else
                ret = false;
              CloseHandle( dest_file );
            } else
              ret = false;
          }
        } while (ret && unzGoToNextFile(zip_file_handle) == UNZ_OK);

        free(buff);
      }
    }
    unzClose(zip_file_handle);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Update our list of DNS servers
-----------------------------------------------------------------------------*/
void WebPagetest::UpdateDNSServers() {
  DWORD len = 15000;
  _dns_servers.Empty();
  PIP_ADAPTER_ADDRESSES addresses = (PIP_ADAPTER_ADDRESSES)malloc(len);
  if (addresses) {
    DWORD ret = GetAdaptersAddresses(AF_INET,
                                     GAA_FLAG_SKIP_ANYCAST |
                                     GAA_FLAG_SKIP_FRIENDLY_NAME |
                                     GAA_FLAG_SKIP_MULTICAST,
                                     NULL, addresses, &len);
    if (ret == ERROR_BUFFER_OVERFLOW) {
      addresses = (PIP_ADAPTER_ADDRESSES)realloc(addresses, len);
      if (addresses)
        ret = GetAdaptersAddresses(AF_INET,
                                   GAA_FLAG_SKIP_ANYCAST |
                                   GAA_FLAG_SKIP_FRIENDLY_NAME |
                                   GAA_FLAG_SKIP_MULTICAST,
                                   NULL, addresses, &len);
    }
    if (ret == NO_ERROR) {
      CString buff;
      for (PIP_ADAPTER_ADDRESSES address = addresses;
           address != NULL;
           address = address->Next) {
        if (address->OperStatus == IfOperStatusUp) {
          for (PIP_ADAPTER_DNS_SERVER_ADDRESS_XP dns =
              address->FirstDnsServerAddress;
              dns != NULL;
              dns = dns->Next) {
            if (dns->Address.iSockaddrLength >= sizeof(struct sockaddr_in) &&
                dns->Address.lpSockaddr->sa_family == AF_INET) {
              struct sockaddr_in* addr = 
                  (struct sockaddr_in *)dns->Address.lpSockaddr;
              buff.Format(_T("%d.%d.%d.%d"),
                          addr->sin_addr.S_un.S_un_b.s_b1,
                          addr->sin_addr.S_un.S_un_b.s_b2,
                          addr->sin_addr.S_un.S_un_b.s_b3,
                          addr->sin_addr.S_un.S_un_b.s_b4);
              if (!_dns_servers.IsEmpty())
                _dns_servers += "-";
              _dns_servers += buff;
            }
          }
        }
      }
    }
    if (addresses)
      free(addresses);
  }
}
