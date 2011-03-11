#include "StdAfx.h"
#include "webpagetest.h"
#include <Wininet.h>
#include "zlib/contrib/minizip/zip.h"

static const TCHAR * NO_FILE = _T("");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebPagetest::WebPagetest(WptSettings &settings, WptStatus &status):
  _settings(settings)
  ,_status(status){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebPagetest::~WebPagetest(void){
}

/*-----------------------------------------------------------------------------
  Fetch a test from the server
-----------------------------------------------------------------------------*/
bool WebPagetest::GetTest(WptTest& test){
  bool ret = false;

  // build the url for the request
  CString url = _settings._server + _T("work/getwork.php?");
  url += CString(_T("location=")) + _settings._location;
  if( _settings._key.GetLength() )
    url += CString(_T("&key=")) + _settings._key;

  CString test_string = HttpGet(url);
  if( test_string.GetLength() ){
    ret = test.Load(test_string);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Send the test result back to the server
-----------------------------------------------------------------------------*/
bool WebPagetest::TestDone(WptTest& test){
  bool ret = true;

  // upload the large binary files individually (images, tcpdump, etc)
  CString url = _settings._server + _T("work/resultimage.php");
  CString dir = test._directory + CString(_T("\\"));
  TCHAR * extensions[] = {_T("*.jpg"), _T("*.png"), _T("*.dtas"), 
                            _T("*.cap"), _T("*.gz")};
  for (int i = 0; i < _countof(extensions) && ret; i++) {
    TCHAR * ext = extensions[i];
    WIN32_FIND_DATA fd;
    HANDLE find_handle = FindFirstFile(dir + ext, &fd);
    if (find_handle != INVALID_HANDLE_VALUE) {
      do {
        if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
          CString file = dir + fd.cFileName;
          ret = UploadFile(url, false, test, file);
          if (ret)
            DeleteFile(file);
        }
      } while (ret && FindNextFile(find_handle, &fd));

      FindClose(find_handle);
    }
  }

  // upload the actual test data
  if (ret) {
    CString file = NO_FILE;
    // compress the remaining files
    ret = CompressResults(dir, dir + _T("results.zip"));
    if (ret) {
      file = dir + _T("results.zip");
    }
    url = _settings._server + _T("work/workdone.php");
    ret = UploadFile(url, true, test, file);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Perform a http GET operation and return the body as a string
-----------------------------------------------------------------------------*/
CString WebPagetest::HttpGet(CString url){
  CString result;

  // Use WinInet to make the request
  HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    HINTERNET file = InternetOpenUrl(internet, url, NULL, 0, 
                                INTERNET_FLAG_NO_CACHE_WRITE | 
                                INTERNET_FLAG_NO_UI | 
                                INTERNET_FLAG_PRAGMA_NOCACHE | 
                                INTERNET_FLAG_RELOAD, NULL);
    if (file) {
      char buff[4097];
      DWORD bytes_read;
      while( InternetReadFile(file, buff, sizeof(buff) - 1, &bytes_read) && 
              bytes_read){
        // NULL-terminate it and add it to our response string
        buff[bytes_read] = 0;
        result += CA2T(buff);
      }
      InternetCloseHandle(file);
    }
    InternetCloseHandle(internet);
  }

  return result;
}

/*-----------------------------------------------------------------------------
  Upload an individual file from a result set
-----------------------------------------------------------------------------*/
bool WebPagetest::UploadFile(CString url, bool done, WptTest& test, 
                                                                 CString file){
  bool ret = false;

  CString headers;
  CStringA form_data, footer;
  DWORD content_length = 0;
  DWORD file_size = 0;
  CString file_name;
  HANDLE file_handle = INVALID_HANDLE_VALUE;

  // build the file name and file size if the file exists
  if (file.GetLength()) {
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
      if( !port )
        port = INTERNET_DEFAULT_HTTP_PORT;
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Build the form data for a POST (with an optional file)
-----------------------------------------------------------------------------*/
bool WebPagetest::BuildFormData(WptSettings& settings, WptTest& test, 
                            bool done,
                            CString file_name, DWORD file_size,
                            CString& headers, CStringA& footer, 
                            CStringA& form_data, DWORD& content_length){
  bool ret = true;

  footer = "";
  form_data = "";

  CStringA boundary = "----------ThIs_Is_tHe_bouNdaRY";
  GUID guid;
  if( SUCCEEDED(CoCreateGuid(&guid)) )
    boundary.Format("----------%08X%04X%04X%X%X%X%X%X%X%X%X",guid.Data1, guid.Data2, guid.Data3, guid.Data4[0], guid.Data4[1], guid.Data4[2], guid.Data4[3], guid.Data4[4], guid.Data4[5], guid.Data4[6], guid.Data4[7]);
  
  headers = CString("Content-Type: multipart/form-data; boundary=") + 
              CString(CA2T(boundary)) + _T("\r\n");

  // location
  form_data += CStringA("--") + boundary + "\r\n";
  form_data += "Content-Disposition: form-data; name=\"location\"\r\n\r\n";
  form_data += CStringA(CT2A(settings._location)) + "\r\n";

  // key
  if( settings._key.GetLength() ){
    form_data += CStringA("--") + boundary + "\r\n";
    form_data += "Content-Disposition: form-data; name=\"key\"\r\n\r\n";
    form_data += CStringA(CT2A(settings._key)) + "\r\n";
  }

  // id
  form_data += CStringA("--") + boundary + "\r\n";
  form_data += "Content-Disposition: form-data; name=\"id\"\r\n\r\n";
  form_data += CStringA(CT2A(test._id)) + "\r\n";

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
                  if (ReadFile(new_file, mem, size, &bytes, 0) && size == bytes){
                    if (!zipOpenNewFileInZip(file, CT2A(fd.cFileName), 0, 0, 0, 
                                     0, 0, 0, Z_DEFLATED, Z_BEST_COMPRESSION )) {
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
