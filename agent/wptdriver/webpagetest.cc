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
#include <Wininet.h>
#include <Wincrypt.h>
#include <Shellapi.h>
#include "zlib/contrib/minizip/zip.h"
#include "zlib/contrib/minizip/unzip.h"
#include "util.h"

static const TCHAR * NO_FILE = _T("");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebPagetest::WebPagetest(WptSettings &settings, WptStatus &status):
  _settings(settings)
  ,_status(status)
  ,_version(0)
  ,_exit(false) {
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
          _version = LOWORD(info->dwFileVersionLS);
      }

      delete [] pVersion;
    }
  }
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

  DeleteDirectory(test._directory, false);

  ATLTRACE(_T("WebPagetest::GetTest"));

  // build the url for the request
  CString buff;
  CString url = _settings._server + _T("work/getwork.php?shards=1");
  url += CString(_T("&location=")) + _settings._location;
  if (_settings._key.GetLength())
    url += CString(_T("&key=")) + _settings._key;
  if (_version) {
    buff.Format(_T("&software=wpt&ver=%d"), _version);
    url += buff;
  }
  if (_computer_name.GetLength())
    url += CString(_T("&pc=")) + _computer_name;
  if (_settings._ec2_instance.GetLength())
    url += CString(_T("&ec2=")) + _settings._ec2_instance;
  ULARGE_INTEGER fd;
  if (GetDiskFreeSpaceEx(_T("C:\\"), NULL, NULL, &fd)) {
    double freeDisk = (double)(fd.QuadPart / (1024 * 1024)) / 1024.0;
    buff.Format(_T("&freedisk=%0.3f"), freeDisk);
    url += buff;
  }

  CString test_string, zip_file;
  if (HttpGet(url, test, test_string, zip_file)) {
    if (test_string.GetLength()) {
      ATLTRACE(_T("WebPagetest::GetTest - Processing test"));
      ret = test.Load(test_string);
    } else if (zip_file.GetLength()) {
      ret = ProcessZipFile(zip_file, test);
    } else {
      ATLTRACE(_T("WebPagetest::GetTest - No test available"));
    }
  } else {
    ATLTRACE(_T("WebPagetest::GetTest - No test available"));
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

  if (!test._discard_test) {
    CString directory = test._directory + CString(_T("\\"));
    CAtlList<CString> image_files;
    GetImageFiles(directory, image_files);
    ret = UploadImages(test, image_files);
    if (ret) {
      ret = UploadData(test, false);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Send the test result back to the server
-----------------------------------------------------------------------------*/
bool WebPagetest::TestDone(WptTestDriver& test){
  bool ret = true;

  CString directory = test._directory + CString(_T("\\"));
  CAtlList<CString> image_files;
  GetImageFiles(directory, image_files);
  ret = UploadImages(test, image_files);
  if (ret) {
    ret = UploadData(test, true);
  }

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
  if (ret) {
    file = dir + _T("results.zip");
  }

  if (ret || done) {
    CString url = _settings._server + _T("work/workdone.php");
    ret = UploadFile(url, done, test, file);
    if (ret)
      DeleteFile(file);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Perform a http GET operation and return the body as a string
-----------------------------------------------------------------------------*/
bool WebPagetest::HttpGet(CString url, WptTestDriver& test, CString& test_string,
                          CString& zip_file) {
  bool result = false;

  // Use WinInet to make the request
  HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    DWORD timeout = 30000;
    InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT, 
                      &timeout, sizeof(timeout));
    HINTERNET http_request = InternetOpenUrl(internet, url, NULL, 0, 
                                INTERNET_FLAG_NO_CACHE_WRITE | 
                                INTERNET_FLAG_NO_UI | 
                                INTERNET_FLAG_PRAGMA_NOCACHE | 
                                INTERNET_FLAG_RELOAD, NULL);
    if (http_request) {
      TCHAR mime_type[1024] = TEXT("\0");
      DWORD len = _countof(mime_type);
      if (HttpQueryInfo(http_request,HTTP_QUERY_CONTENT_TYPE, mime_type, 
                          &len, NULL)) {
        result = true;
        bool is_zip = false;
        char buff[4097];
        DWORD bytes_read, bytes_written;
        HANDLE file = INVALID_HANDLE_VALUE;
        if (!lstrcmpi(mime_type, _T("application/zip"))) {
          zip_file = test._directory + _T("\\wpt.zip");
          file = CreateFile(zip_file,GENERIC_WRITE,0,0,CREATE_ALWAYS,0,NULL);
          is_zip = true;
        }
        while (InternetReadFile(http_request, buff, sizeof(buff) - 1, 
                &bytes_read) && bytes_read) {
          if (is_zip) {
            WriteFile(file, buff, bytes_read, &bytes_written, 0);
          } else {
            // NULL-terminate it and add it to our response string
            buff[bytes_read] = 0;
            test_string += CA2T(buff);
          }
        }
        if (file != INVALID_HANDLE_VALUE)
          CloseHandle(file);
      }
      InternetCloseHandle(http_request);
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

  if (BuildFormData(_settings, test, done, file_name, file_size, 
                      headers, footer, form_data, content_length)) {
    // use WinInet to do the POST (quite a few steps)
    HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
              INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
    if (internet) {
      CString host, object;
      unsigned short port;
      if (CrackUrl(url, host, port, object)) {
        HINTERNET connect = InternetConnect(internet, host, port, NULL, NULL,
                                            INTERNET_SERVICE_HTTP, 0, 0);
        if (connect){
          HINTERNET request = HttpOpenRequest(connect, _T("POST"), object, 
                                                NULL, NULL, NULL, 
                                                INTERNET_FLAG_NO_CACHE_WRITE |
                                                INTERNET_FLAG_NO_UI |
                                                INTERNET_FLAG_PRAGMA_NOCACHE |
                                                INTERNET_FLAG_RELOAD, NULL);
          if (request){
            if (HttpAddRequestHeaders(request, headers, headers.GetLength(), 
                            HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE)) {
              INTERNET_BUFFERS buffers;
              memset( &buffers, 0, sizeof(buffers) );
              buffers.dwStructSize = sizeof(buffers);
              buffers.dwBufferTotal = content_length;
              if (HttpSendRequestEx(request, &buffers, NULL, 0, NULL)) {
                DWORD bytes_written;
                if (InternetWriteFile(request, (LPCSTR)form_data, 
                                      form_data.GetLength(), &bytes_written)) {
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
                }
              }
            }
            InternetCloseHandle(request);
          }
          InternetCloseHandle(connect);
        }
      }
      InternetCloseHandle(internet);
    }
  }

  if (file_handle != INVALID_HANDLE_VALUE) {
    CloseHandle( file_handle );
  }

  if (ret)
    DeleteFile(file);

  return ret;
}

/*-----------------------------------------------------------------------------
  Helper function to crack an url into it's component parts
-----------------------------------------------------------------------------*/
bool WebPagetest::CrackUrl(CString url, CString &host, unsigned short &port,
                            CString& object){
  bool ret = false;

  URL_COMPONENTS parts;
  memset(&parts, 0, sizeof(parts));
  TCHAR szHost[10000];
  TCHAR path[10000];
  TCHAR extra[10000];
    
  memset(szHost, 0, sizeof(szHost));
  memset(path, 0, sizeof(path));
  memset(extra, 0, sizeof(extra));

  parts.lpszHostName = szHost;
  parts.dwHostNameLength = _countof(szHost);
  parts.lpszUrlPath = path;
  parts.dwUrlPathLength = _countof(path);
  parts.lpszExtraInfo = extra;
  parts.dwExtraInfoLength = _countof(extra);
  parts.dwStructSize = sizeof(parts);

  if( InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts) ){
      ret = true;
      host = szHost;
      port = parts.nPort;
      object = path;
      object += extra;
      if (!host.CompareNoCase(_T("www.webpagetest.org"))) {
        host = _T("agent.webpagetest.org");
      }
      if( !port )
        port = INTERNET_DEFAULT_HTTP_PORT;
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Build the form data for a POST (with an optional file)
-----------------------------------------------------------------------------*/
bool WebPagetest::BuildFormData(WptSettings& settings, WptTestDriver& test, 
                            bool done,
                            CString file_name, DWORD file_size,
                            CString& headers, CStringA& footer, 
                            CStringA& form_data, DWORD& content_length){
  bool ret = true;

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
              CString(CA2T(boundary)) + _T("\r\n");

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

  // done flag
  if (done) {
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"done\"\r\n\r\n";
    form_data += "1\r\n";
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

  return ret;
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
    _version = 0;
    ShellExecute(NULL,NULL,dir+_T("\\wptupdate.exe"),NULL,dir,SW_SHOWNORMAL);

    // wait for up to 2 minutes for the update process to close us
    for (int i = 0; i < 1200 && !_exit; i++)
      Sleep(100);
  }

  return ret;
}
