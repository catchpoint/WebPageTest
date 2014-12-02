#include "StdAfx.h"
#include "UrlMgrHttp.h"
#include "zip/unzip.h"
#include "urlBlaster.h"
#include <Wincrypt.h>

class CUrlMgrHttpContext
{
public:
	CUrlMgrHttpContext(void):
		fvonly(false)
		, runs(0)
		, currentRun(0)
    , discard(0)
    , specificRun(0)
    , specificIndex(0)
    , discardTest(false)
		{}
	~CUrlMgrHttpContext(void){}
	CString testId;
	CString scriptFile;
	CString fileBase;
	CString fileRunBase;
	bool	fvonly;
	DWORD	runs;
  DWORD discard;
	DWORD	currentRun;
  DWORD specificRun;
  DWORD specificIndex;
  bool  discardTest;
};

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrHttp::CUrlMgrHttp(CLog &logRef):
	CUrlMgrBase(logRef)
	, nextCheck(0)
	, videoSupported(false)
	, lastSuccess(0)
	, majorVer(0)
	, minorVer(0)
	, buildNo(0)
	, revisionNo(0)
	, noUpdate(false)
  , port(80)
  , requestFlags(0)
{
  SetErrorMode(SEM_FAILCRITICALERRORS);

  requestFlags = INTERNET_FLAG_RELOAD | INTERNET_FLAG_DONT_CACHE;

	// see if video encoding is possible on this system

	// check if x264.exe is in the same directory as urlblast
	TCHAR path[MAX_PATH];
	if( GetModuleFileName(NULL, path, _countof(path)) )
	{
		lstrcpy(PathFindFileName(path), _T("x264.exe"));
		if( GetFileAttributes(path) != INVALID_FILE_ATTRIBUTES )
		{
			// see if avisynth is installed
			HMODULE hLib = LoadLibrary(_T("AviSynth.dll"));
			if( hLib )
			{
				log.Trace(_T("Video is supported"));
				videoSupported = true;
				FreeLibrary(hLib);
			}
		}
	}

	// URLBlast version
	TCHAR file[MAX_PATH];
	if( GetModuleFileName(NULL, file, _countof(file)) )
	{
		// get the version info block for the app
		DWORD unused;
		DWORD infoSize = GetFileVersionInfoSize(file, &unused);
		if(infoSize)  
		{
			LPBYTE pVersion = new BYTE[infoSize];
			if(GetFileVersionInfo(file, 0, infoSize, pVersion))
			{
				// get the fixed file info
				VS_FIXEDFILEINFO * info = NULL;
				UINT size = 0;
				if( VerQueryValue(pVersion, _T("\\"), (LPVOID*)&info, &size) )
				{
					if( info )
					{
						majorVer = HIWORD(info->dwFileVersionMS);
						minorVer = LOWORD(info->dwFileVersionMS);
						buildNo = HIWORD(info->dwFileVersionLS);
						revisionNo = LOWORD(info->dwFileVersionLS);
					}
				}
			}

			delete [] pVersion;
		}
	}
  UpdateDNSServers();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrHttp::~CUrlMgrHttp(void)
{
}

/*-----------------------------------------------------------------------------
	Do the startup initialization
-----------------------------------------------------------------------------*/
void CUrlMgrHttp::Start()
{
	// figure out what our working diriectory is
	TCHAR path[MAX_PATH];
	if( SUCCEEDED(SHGetFolderPath(NULL, CSIDL_COMMON_APPDATA | CSIDL_FLAG_CREATE, NULL, SHGFP_TYPE_CURRENT, path)) )
	{
		PathAppend(path, _T("urlblast"));
		CreateDirectory(path, NULL);
		lstrcat(path, _T("\\"));
		workDir = path;
		
		// delete everything in the folder to make sure we don't collect cruft
		DeleteDirectory(workDir, false);
	}

	if( !urlFilesUrl.IsEmpty() )
	{
		// parse the url into it's parts
		URL_COMPONENTS parts;
		memset(&parts, 0, sizeof(parts));
		TCHAR szHost[10000];
		TCHAR object[10000];
		TCHAR scheme[100];
		
		memset(szHost, 0, sizeof(szHost));
		memset(object, 0, sizeof(object));

		parts.lpszHostName = szHost;
		parts.dwHostNameLength = _countof(szHost);
		parts.lpszUrlPath = object;
		parts.dwUrlPathLength = _countof(object);
		parts.dwStructSize = sizeof(parts);
    parts.lpszScheme = scheme;
    parts.dwSchemeLength = sizeof(scheme);

    urlFilesUrl.Replace(_T("www.webpagetest.org"), _T("agent.webpagetest.org"));
		if( InternetCrackUrl((LPCTSTR)urlFilesUrl, urlFilesUrl.GetLength(), 0, &parts) )
		{
			host = szHost;
			port = parts.nPort;
      if (!lstrcmpi(parts.lpszScheme, _T("https"))) {
        requestFlags |= INTERNET_FLAG_SECURE |
                        INTERNET_FLAG_IGNORE_CERT_CN_INVALID |
                        INTERNET_FLAG_IGNORE_CERT_DATE_INVALID;
        if (!port)
          port = 443;
      } else if( !port )
				port = 80;
			CString videoStr;
			if( videoSupported )
				videoStr = _T("&video=1");
			if( ( majorVer || minorVer || buildNo || revisionNo) && !noUpdate )
				verString.Format(_T("&version=%d.%d.%d.%d&ver=%d"), majorVer, minorVer, buildNo, revisionNo, revisionNo);
			CString ec2;
			if( ec2Instance.GetLength() )
				ec2 = CString(_T("&ec2=")) + ec2Instance;
			getWork = CString(_T("getwork.php?shards=1")) + videoStr + CString(_T("&location=")) + location + CString(_T("&key=")) + key + ec2;
			workDone = CString(object) + _T("workdone.php");
			resultImage = CString(object) + _T("resultimage.php");

			// get the machine name to include
			TCHAR name[MAX_COMPUTERNAME_LENGTH + 1];
			DWORD len = _countof(name);
			name[0] = 0;
			if( GetComputerName(name, &len) && lstrlen(name) )
			{
			  pcName = name;
				TCHAR escaped[INTERNET_MAX_URL_LENGTH];
				len = _countof(escaped);
				if( (UrlEscape(name, escaped, &len, URL_ESCAPE_SEGMENT_ONLY | URL_ESCAPE_PERCENT) == S_OK) && lstrlen(escaped) ) {
					getWork += CString(_T("&pc=")) + CString(escaped);
					pcName = escaped;
				}
			}

			lastSuccess = GetTickCount();
		}
	}
}

/*-----------------------------------------------------------------------------
	Load an url from the pagetest file
-----------------------------------------------------------------------------*/
bool CUrlMgrHttp::GetNextUrl(CTestInfo &info)
{
	bool ret = false;
	
	// wait 1 second between checks when we don't get tests back
	DWORD now = GetTickCount();
	if( now >= nextCheck )
	{
		CStringA job, script;
		bool zip = false;
		bool update = false;
		if( GetJob(job, script, zip, update) && !job.IsEmpty() )
		{
			nextCheck = 0;
			CUrlMgrHttpContext * context = new CUrlMgrHttpContext;
			
			if( update )
			{
				CString path = CA2T(job);
				log.Trace(_T("Retrieved software update in '%s'"), (LPCTSTR)path);
				InstallUpdate(path);
			}
			else if( zip )
			{
				ret = true;
				info.zipFileDir = job;
				TCHAR buff[1024];
				if( GetPrivateProfileString(_T("info"), _T("id"), _T(""), buff, _countof(buff), (LPCTSTR)CA2T(job + "\\video.ini")) )
					context->testId = buff;
				info.context = context;

				log.Trace(_T("Retrieved video job '%s' in '%s'"), (LPCTSTR)context->testId, (LPCTSTR)info.zipFileDir);
			}
			else
			{
				// default settings
				bool saveHTML = false;
				bool saveCookies = false;
				info.saveEverything = true;
				info.captureVideo = false;
				info.includeObjectData = true;
				context->runs = 1;

				// parse the request
				int jobPos = 0;
				CStringA line = job.Tokenize("\r\n", jobPos);
				while( jobPos >= 0 )
				{
					// parse the setting
					int index = line.Find('=');
					if( index != -1 )
					{
						CString key = CA2T(line.Left(index));
						CString value = CA2T(line.Right(line.GetLength() - index - 1));
						key.Trim();
						value.Trim();
						if( !key.IsEmpty() && !value.IsEmpty() )
						{
							if( !key.CompareNoCase(_T("Test ID")) )
							{
								context->testId = value;
								context->fileBase = value;
							} else if( !key.CompareNoCase(_T("url")) )
								info.url = value;
							else if( !key.CompareNoCase(_T("DOMElement")) )
								info.domElement = value;
							else if( !key.CompareNoCase(_T("fvonly")) )
								context->fvonly = _ttol(value) != 0;
							else if( !key.CompareNoCase(_T("object")) )
								info.includeObjectData = _ttol(value) != 0;
							else if( !key.CompareNoCase(_T("images")) )
								info.saveEverything = _ttol(value) != 0;
							else if( !key.CompareNoCase(_T("Event Name")) )
								info.eventText = value;
							else if( !key.CompareNoCase(_T("web10")) )
								info.urlType = _ttol(value) ? 1 : 0;
							else if( !key.CompareNoCase(_T("ignoreSSL")) )
								info.ignoreSSL = _ttol(value);
							else if( !key.CompareNoCase(_T("tcpdump")) )
								info.tcpdump = _ttol(value);
							else if( !key.CompareNoCase(_T("standards")) )
								info.standards = _ttol(value);
							else if( !key.CompareNoCase(_T("noscript")) )
								info.noscript = _ttol(value);
							else if( !key.CompareNoCase(_T("blockads")) )
								info.blockads = _ttol(value);
							else if( !key.CompareNoCase(_T("connections")) )
								info.connections = _ttol(value);
							else if( !key.CompareNoCase(_T("Harvest Links")) )
								info.harvestLinks = _ttol(value) != 0;
							else if( !key.CompareNoCase(_T("Harvest Cookies")) )
								saveCookies = _ttol(value) != 0;
							else if( !key.CompareNoCase(_T("Save HTML")) )
								saveHTML = _ttol(value) != 0;
							else if( !key.CompareNoCase(_T("Block")) )
								info.block = value;
							else if( !key.CompareNoCase(_T("Basic Auth")) )
								info.basicAuth = value;
							else if( !key.CompareNoCase(_T("runs")) )
								context->runs = _ttol(value);
							else if( !key.CompareNoCase(_T("run")) )
								context->specificRun = _ttol(value);
							else if( !key.CompareNoCase(_T("index")) )
								context->specificIndex = _ttol(value);
							else if( !key.CompareNoCase(_T("discardTest")) && _ttol(value) )
								context->discardTest = true;
							else if( !key.CompareNoCase(_T("Capture Video")) )
								info.captureVideo = _ttol(value) != 0;
							else if( !key.CompareNoCase(_T("type")) )
                info.testType = value.Trim();
							else if( !key.CompareNoCase(_T("bwIn")) )
							{
								info.bwIn = _ttol(value);
								info.ipfw = true;
							}
							else if( !key.CompareNoCase(_T("bwOut")) )
							{
								info.bwOut = _ttol(value);
								info.ipfw = true;
							}
							else if( !key.CompareNoCase(_T("latency")) )
							{
								info.latency = _ttol(value);
								info.ipfw = true;
							}
							else if( !key.CompareNoCase(_T("plr")) )
							{
								info.plr = _tstof(value);
								info.ipfw = true;
							}
							else if( !key.CompareNoCase(_T("Host")) )
								info.host = value;
							else if( !key.CompareNoCase(_T("BrowserExe")) )
								info.browser = value;
							else if( !key.CompareNoCase(_T("noopt")) && _ttol(value) )
                info.checkOpt = 0;
							else if( !key.CompareNoCase(_T("noimages")) )
                info.noImages = _ttol(value);
							else if( !key.CompareNoCase(_T("noheaders")) )
                info.noHeaders = _ttol(value);
							else if( !key.CompareNoCase(_T("discard")) && !context->specificRun )
                context->discard = _ttol(value);
							else if( !key.CompareNoCase(_T("imageQuality")) )
                info.imageQuality = max(0, min(100, _ttol(value)));
							else if( !key.CompareNoCase(_T("pngScreenShot")) )
                info.pngScreenShot = _ttol(value);
							else if( !key.CompareNoCase(_T("bodies")) )
                info.bodies = _ttol(value);
							else if( !key.CompareNoCase(_T("htmlbody")) )
                info.htmlbody = _ttol(value);
							else if( !key.CompareNoCase(_T("time")) )
                info.minimumDuration = min(120, max(0, _ttol(value)));
							else if( !key.CompareNoCase(_T("clearRV")) )
                info.clearShortTermCacheSecs = _ttol(value);
							else if( !key.CompareNoCase(_T("keepua")) )
                info.keepua = _ttol(value);
              else if( !key.CompareNoCase(_T("customRule")) ) {
                if (!info.customRules.IsEmpty())
                  info.customRules += _T("\n");
                info.customRules += value;
              }
              else if( !key.CompareNoCase(_T("customMetric")) ) {
                if (!info.customMetrics.IsEmpty())
                  info.customMetrics += "\n";
                info.customMetrics += (LPCSTR)CT2A(value);
              }
							else if( !key.CompareNoCase(_T("clearcerts")) && _ttol(value) )
                info.clearCerts = true;
						}
					}

					line = job.Tokenize("\r\n", jobPos);
				}

				// make sure the url looks like  an url		
				if( info.url.GetLength() > 2 )
				{
					ret = true;
					info.context = context;
          if (context->specificRun) {
					  context->currentRun = context->specificRun;
            info.currentRun = context->specificRun;
            context->discard = 0;
          } else {
					  context->currentRun = 1;
            info.currentRun = 1;
            context->discard = __min(context->discard, context->runs - 1);
          }
          int index = context->specificIndex ? context->specificIndex : info.currentRun;
					
          if( !info.testType.GetLength() && info.url.Find(_T("://")) == -1 )
						info.url = CString(_T("http://")) + info.url;

					context->fileRunBase.Format(_T("%s-%d"), (LPCTSTR)context->fileBase, index);
					info.logFile = workDir + context->fileRunBase;
          info.customMetricsFile = workDir + _T("custom.txt");

					if( info.eventText.IsEmpty() )						
            info.eventText.Format(_T("Run_%d"), info.currentRun);

					if( info.harvestLinks )
						info.linksFile = workDir + context->fileRunBase + _T("_links.txt");
						
					if( saveHTML )
						info.htmlFile = workDir + context->fileRunBase;
						
					if( saveCookies )
						info.cookiesFile = workDir + context->fileRunBase;

					if( info.tcpdump )
						info.tcpdumpFile = workDir + context->fileRunBase + _T(".cap");

					// save out the script if there is one
					if( script.GetLength() )
					{
						info.runningScript = true;
						info.scriptFile = workDir + context->fileBase + _T(".pts");
						info.url = CString(_T("script://")) + info.scriptFile;
						HANDLE hFile = CreateFile( info.scriptFile, GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
						if( hFile != INVALID_HANDLE_VALUE )
						{
							DWORD bytes;
							WriteFile(hFile, (LPCVOID)(LPCSTR)script, script.GetLength(), &bytes, 0);
							CloseHandle(hFile);
						}
					}
				}
				else
					delete context;
			}
		}
		else
			nextCheck = now + 5000;
	}
			
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrHttp::RunRepeatView(CTestInfo &info)
{
	bool ret = true;

  UpdateDNSServers();
	if( !info.zipFileDir.IsEmpty() )
		ret = false;
	else if( info.context )
	{
		CUrlMgrHttpContext * context = (CUrlMgrHttpContext *)info.context;

		ret = !(context->fvonly);
		
		if( ret )
		{
      if( context->discard || context->discardTest )
      {
        DeleteResults(info);
      }
      else
      {
			  // upload the images individually
			  UploadImages(info);

			  // upload the results we have so far
			  info.done = false;
			  CString zipFilePath;
			  if( ZipResults(info, zipFilePath) )
			  {
				  // upload the results
				  UploadFile(workDone, info, zipFilePath, _T(""));
  				
				  // delete the zip file
				  DeleteFile(zipFilePath);
			  }
      }

			// delete the log file
			DeleteFile(info.logFile);

      info.cached = true;
			info.logFile += _T("_Cached");

			if( info.harvestLinks )
				info.linksFile = workDir + context->fileRunBase + _T("_Cached_links.txt");
			if( !info.htmlFile.IsEmpty() )
				info.htmlFile = workDir + context->fileRunBase + _T("_Cached");
			if( !info.cookiesFile.IsEmpty() )
				info.cookiesFile = workDir + context->fileRunBase + _T("_Cached");
      if( info.tcpdump )
        info.tcpdumpFile = workDir + context->fileRunBase + _T("_Cached.cap");
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlMgrHttp::UrlFinished(CTestInfo &info)
{
  UpdateDNSServers();
  if (!info.customMetricsFile.IsEmpty()) {
    DeleteFile(info.customMetricsFile);
    info.customMetricsFile.Empty();
  }
	if( info.context )
	{
		CUrlMgrHttpContext * context = (CUrlMgrHttpContext *)info.context;

		if( !info.zipFileDir.IsEmpty() )
		{
			info.done = true;

			// upload the results
			UploadFile(workDone, info, info.zipFileDir + _T("\\video.mp4"), _T("video.mp4"));

			// delete the working directory
			DeleteDirectory(info.zipFileDir);

			log.Trace(_T("Completed video job '%s'"), (LPCTSTR)context->testId);

			info.context = NULL;
			delete context;
		}
		else
		{
			if( context->specificRun || context->specificIndex || context->currentRun >= context->runs )
				info.done = true;
			else
				info.done = false;

      if( context->discard )
      {
        DeleteResults(info);
      }
      else
      {
			  // upload the images individually
			  UploadImages(info);

			  // zip up and post the results
			  CString zipFilePath;
			  if( ZipResults(info, zipFilePath) )
			  {
				  // upload the results
				  UploadFile(workDone, info, zipFilePath, _T(""));
  				
				  // delete the zip file
				  DeleteFile(zipFilePath);
			  }
      }

			// delete the log file
			DeleteFile(info.logFile);

			// clean up if we're actually done
			if( !info.done )
			{
				// get ready for another run
        if( context->discard )
        {
          context->discard--;
          context->runs--;
        }
        else {
				  context->currentRun++;
        }
        info.currentRun++;  // increment the actual run count regardless of discard state
        info.cached = false;
				CString runText;
				runText.Format(_T("%d"), context->currentRun);
				context->fileRunBase = context->fileBase + CString(_T("-")) + runText;

				info.logFile = workDir + context->fileRunBase;
				info.eventText = CString(_T("Run_")) + runText;
        info.customMetricsFile = workDir + _T("custom.txt");

				if( info.harvestLinks )
					info.linksFile = workDir + context->fileRunBase + _T("_links.txt");
				if( !info.htmlFile.IsEmpty() )
					info.htmlFile = workDir + context->fileRunBase;
				if( !info.cookiesFile.IsEmpty() )
					info.cookiesFile = workDir + context->fileRunBase;
        if( info.tcpdump )
          info.tcpdumpFile = workDir + context->fileRunBase + _T(".cap");
			}
			else
			{
				// delete the script file
				if( !info.scriptFile.IsEmpty() )
					DeleteFile( info.scriptFile );
					
				info.context = NULL;
				delete context;
			}
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrHttp::GetJob(CStringA &job, CStringA &script, bool& zip, bool& update)
{
	bool ret = false;
	HANDLE hFile = INVALID_HANDLE_VALUE;

	// make sure we are configured to check
	if( !host.IsEmpty() && !getWork.IsEmpty()) {
		// fetch a job from the server
		log.Trace(_T("Requesting work from %s%s"), (LPCTSTR)host, (LPCTSTR)getWork);

		// set up the session
    HINTERNET internet = InternetOpen(_T("urlBlast"), INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
    if (internet) {
      DWORD timeout = 240000;
      InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT, &timeout, sizeof(timeout));
      InternetSetOption(internet, INTERNET_OPTION_RECEIVE_TIMEOUT, &timeout, sizeof(timeout));
      InternetSetOption(internet, INTERNET_OPTION_SEND_TIMEOUT, &timeout, sizeof(timeout));
      InternetSetOption(internet, INTERNET_OPTION_DATA_SEND_TIMEOUT, &timeout, sizeof(timeout));
      InternetSetOption(internet, INTERNET_OPTION_DATA_RECEIVE_TIMEOUT, &timeout, sizeof(timeout));

      CString diskSpace;
      ULARGE_INTEGER fd;
      if( GetDiskFreeSpaceEx(_T("C:\\"), NULL, NULL, &fd) )
      {
        double freeDisk = (double)(fd.QuadPart / (1024 * 1024)) / 1024.0;
        diskSpace.Format(_T("&freedisk=%0.3f"), freeDisk);
      }
      
      CString dns = _T("");
      if (!dnsServers.IsEmpty())
        dns = CString(_T("&dns=")) + dnsServers;

      // IE Version
      CRegKey key;
      CString IEVer;
      if( SUCCEEDED(key.Open(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer"), KEY_READ)) )
      {
        TCHAR iebuff[1024];
        ULONG iebufflen = _countof(iebuff);
	      if( SUCCEEDED(key.QueryStringValue(_T("Version"), iebuff, &iebufflen)) && iebufflen )
	      {
          IEVer.Format(_T("&ie=%s"), iebuff);
          IEVer.Trim();
	      }
        key.Close();
      }

      CString url = urlFilesUrl + getWork + verString + diskSpace + IEVer + dns;
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
          ret = true;
				  zip = false;
          char buff[4097];
          DWORD bytes_read, bytes_written;
          HANDLE file = INVALID_HANDLE_VALUE;
          if (!lstrcmpi(mime_type, _T("application/zip"))) {
						TCHAR tmp[MAX_PATH];
						if( GetTempFileName(workDir, _T("zip"), 0, tmp) ) {
							log.Trace(_T("Writing zip file to %s"), tmp);
							job = tmp;
						  DeleteFileA(job);
						  CreateDirectoryA(job, NULL);
						  hFile = CreateFileA(job + "\\tmp.zip", GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
							if( hFile == INVALID_HANDLE_VALUE )
								job.Empty();
            }
            zip = true;
          }
          while (InternetReadFile(http_request, buff, sizeof(buff) - 1, 
                  &bytes_read) && bytes_read) {
            if (zip) {
              if( hFile != INVALID_HANDLE_VALUE )
                WriteFile(hFile, buff, bytes_read, &bytes_written, 0);
            } else {
              // NULL-terminate it and add it to our response string
              buff[bytes_read] = 0;
              job += buff;
            }
          }
          if (hFile != INVALID_HANDLE_VALUE)
            CloseHandle(hFile);
        }
        InternetCloseHandle(http_request);
      }
		}
		InternetCloseHandle(internet);
	}

	// see if there was a script in the job as well
	if( ret && !zip && !job.IsEmpty() ) {
		int index = job.Find("[Script]");
		if( index >= 0 ) {
			script = job.Mid(index + 8).Trim();
			job = job.Left(index);
		}
	}

	// see if we need to extract a zip file
	if( ret && zip && !job.IsEmpty() ) {
		unzFile zipFile = unzOpen(job + "\\tmp.zip");
		if( zipFile ) {
			if( unzGoToFirstFile(zipFile) == UNZ_OK ) {
				DWORD len = 4096;
				LPBYTE buff = (LPBYTE)malloc(len);
				if( buff ) {
					do {
						char fileName[MAX_PATH];
						unz_file_info info;

						if( unzGetCurrentFileInfo(zipFile, &info, (char *)&fileName, _countof(fileName), 0, 0, 0, 0) == UNZ_OK ) {
							CStringA destFile = job + CStringA("\\") + fileName;

							if( !lstrcmpiA(fileName, "update.ini") )
								update = true;

							// make sure the directory exists
							char szDir[MAX_PATH];
							lstrcpyA(szDir, (LPCSTR)destFile);
							*PathFindFileNameA(szDir) = 0;
							if( lstrlenA(szDir) > 3 )
								SHCreateDirectoryExA(NULL, szDir, NULL);

							HANDLE hOutFile = CreateFileA( destFile, GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0 );
							if( hOutFile != INVALID_HANDLE_VALUE ) {
								if( unzOpenCurrentFile(zipFile) == UNZ_OK ) {
									int bytes = 0;
									DWORD written;
									do {
										bytes = unzReadCurrentFile(zipFile, buff, len);
										if( bytes > 0 )
											WriteFile( hOutFile, buff, bytes, &written, 0);
									}while( bytes > 0 );
									unzCloseCurrentFile(zipFile);
								}
								CloseHandle( hOutFile );
							}
						}
					}while( unzGoToNextFile(zipFile) == UNZ_OK );

					free(buff);
				}
			}

			unzClose(zipFile);
		}

		DeleteFileA(job + "\\tmp.zip");
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrHttp::ZipResults(CTestInfo &info, CString& zipFilePath)
{
	bool ret = false;
	
	if( info.context )
	{
		CUrlMgrHttpContext * context = (CUrlMgrHttpContext *)info.context;

		// create a zip file of the results
		zipFilePath = workDir + context->fileRunBase + _T(".zip");
		zipFile file = zipOpen(CT2A(zipFilePath), APPEND_STATUS_CREATE);
		if( file )
		{
			ret = true;
			WIN32_FIND_DATA fd;
			HANDLE hFind = FindFirstFile( workDir + context->fileRunBase + _T("*.*"), &fd);
			if( hFind != INVALID_HANDLE_VALUE )
			{
				do
				{
					CString filePath = workDir + fd.cFileName;
					if( filePath.CompareNoCase(zipFilePath) )
					{
						HANDLE hFile = CreateFile( filePath, GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
						if( hFile != INVALID_HANDLE_VALUE )
						{
							DWORD size = GetFileSize(hFile, 0);
							if( size )
							{
								BYTE * mem = (BYTE *)malloc(size);
								if( mem )
								{
									DWORD bytes;
									if( ReadFile(hFile, mem, size, &bytes, 0) && size == bytes )
									{
										CString archiveName = fd.cFileName;
										int index = archiveName.Find(_T("-"));
										if( index >= 0 )
											archiveName = archiveName.Mid(index + 1);
										
										// add the file to the archive
										if( !zipOpenNewFileInZip( file, CT2A(archiveName), 0, 0, 0, 0, 0, 0, Z_DEFLATED, Z_BEST_COMPRESSION ) )
										{
											// write the file to the archive
											zipWriteInFileInZip( file, mem, size );
											zipCloseFileInZip( file );
										}
									}
									
									free(mem);
								}
							}
							
							CloseHandle( hFile );
						}
						DeleteFile(filePath);
					}
				}while( FindNextFile(hFind, &fd) );
				FindClose(hFind);
			}
			
			// close the zip archive
			zipClose(file, 0);
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Upload a single file
-----------------------------------------------------------------------------*/
bool CUrlMgrHttp::UploadFile(CString url, CTestInfo &info, CString& file, CString fileName)
{
	bool ret = false;

	// make sure we are configured to check
	CUrlMgrHttpContext * context = (CUrlMgrHttpContext *)info.context;
	if( !host.IsEmpty() && !url.IsEmpty() && context )
	{
		// try to upload the file 5 time (in case there is a server problem)
		int count = 0;
		while( !ret && count < 5 )
		{
			count++;
			DWORD fileSize = 0;
			HANDLE hFile = INVALID_HANDLE_VALUE;
      if (!context->discardTest) {
        hFile = CreateFile(file, GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
			  if( hFile != INVALID_HANDLE_VALUE )
				  fileSize = GetFileSize(hFile,0);
      }
			
      log.Trace(_T("Uploading %d byte file %s to %s"), fileSize, (LPCTSTR)file, (LPCTSTR)url);

      // build up the post data
			CStringA headers, body, footer;	
			DWORD requestLen = 0;
			if( BuildFormData( info, headers, body, footer, fileSize, requestLen, fileName ) ) {
        HINTERNET internet = InternetOpen(_T("urlBlast"), INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
        if (internet) {
          DWORD timeout = 240000;
          InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT, &timeout, sizeof(timeout));
          InternetSetOption(internet, INTERNET_OPTION_RECEIVE_TIMEOUT, &timeout, sizeof(timeout));
          InternetSetOption(internet, INTERNET_OPTION_SEND_TIMEOUT, &timeout, sizeof(timeout));
          InternetSetOption(internet, INTERNET_OPTION_DATA_SEND_TIMEOUT, &timeout, sizeof(timeout));
          InternetSetOption(internet, INTERNET_OPTION_DATA_RECEIVE_TIMEOUT, &timeout, sizeof(timeout));

          HINTERNET connect = InternetConnect(internet, host, port, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
          if (connect){
            HINTERNET request = HttpOpenRequest(connect, _T("POST"), url, 
                                                  NULL, NULL, NULL, 
                                                  INTERNET_FLAG_NO_CACHE_WRITE |
                                                  INTERNET_FLAG_NO_UI |
                                                  INTERNET_FLAG_PRAGMA_NOCACHE |
                                                  INTERNET_FLAG_RELOAD |
                                                  INTERNET_FLAG_KEEP_CONNECTION, NULL);
            if (request){
              if (HttpAddRequestHeadersA(request, headers, headers.GetLength(), 
                                        HTTP_ADDREQ_FLAG_ADD |
                                        HTTP_ADDREQ_FLAG_REPLACE)) {
                INTERNET_BUFFERS buffers;
                memset( &buffers, 0, sizeof(buffers) );
                buffers.dwStructSize = sizeof(buffers);
                buffers.dwBufferTotal = requestLen;
                if (HttpSendRequestEx(request, &buffers, NULL, 0, NULL)) {
                  DWORD bytes_written;
                  if (InternetWriteFile(request, (LPCSTR)body, body.GetLength(), &bytes_written)) {
                    // upload the file itself
                    if (hFile != INVALID_HANDLE_VALUE && fileSize) {
                        DWORD chunkSize = min(64 * 1024, fileSize);
                        LPBYTE mem = (LPBYTE)malloc(chunkSize);
                        if (mem) {
                          DWORD bytes;
                          while (ReadFile(hFile, mem, chunkSize, &bytes, 0) && bytes)
                            InternetWriteFile(request, mem, bytes, &bytes_written);
                          free(mem);
                        }
                    }

                    // upload the end of the form data
                    if (InternetWriteFile(request, (LPCSTR)footer, footer.GetLength(), &bytes_written)) {
                      if (HttpEndRequest(request, NULL, 0, 0))
                        ret = true;
                    }
                  }
                }
              }
              InternetCloseHandle(request);
            }
            InternetCloseHandle(connect);
          }
          InternetCloseHandle(internet);
        }
			}

			if( hFile != INVALID_HANDLE_VALUE )
				CloseHandle(hFile);

			if(!ret)
				Sleep(10000);	// give it 10 seconds between attempts
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrHttp::BuildFormData(CTestInfo &info, CStringA& headers, CStringA& body, CStringA& footer, DWORD fileSize, DWORD &requestLen, CString fileName )
{
	bool ret = true;

	CStringA id;
  CStringA buff;
	CUrlMgrHttpContext * context = (CUrlMgrHttpContext *)info.context;
	if( context )
	{
		id = CT2A(context->testId);

		if( !fileName.GetLength() )
			fileName = context->testId + _T(".zip");
	}

	CStringA boundary = "----------ThIs_Is_tHe_bouNdaRY";
	GUID guid;
	if( SUCCEEDED(CoCreateGuid(&guid)) )
		boundary.Format("----------%08X%04X%04X%X%X%X%X%X%X%X%X",guid.Data1, guid.Data2, guid.Data3, guid.Data4[0], guid.Data4[1], guid.Data4[2], guid.Data4[3], guid.Data4[4], guid.Data4[5], guid.Data4[6], guid.Data4[7]);
	
	headers = "Content-Type: multipart/form-data; boundary=";
	headers += boundary + "\r\n";
	
	// location
	body = "--";
	body += boundary + "\r\n";
	body += "Content-Disposition: form-data; name=\"location\"\r\n\r\n";
	body += CT2A(location);
	body += "\r\n";

	// key
	body += "--";
	body += boundary + "\r\n";
	body += "Content-Disposition: form-data; name=\"key\"\r\n\r\n";
	body += CT2A(key);
	body += "\r\n";

	// id
	if( !id.IsEmpty() )
	{
		body += "--";
		body += boundary + "\r\n";
		body += "Content-Disposition: form-data; name=\"id\"\r\n\r\n";
		body += id;
		body += "\r\n";
	}

	// run number
	body += "--";
	body += boundary + "\r\n";
	body += "Content-Disposition: form-data; name=\"run\"\r\n\r\n";
  buff.Format("%d", info.currentRun);
  body += buff;
	body += "\r\n";

  // index
  if (context && context->specificIndex) {
	  body += "--";
	  body += boundary + "\r\n";
	  body += "Content-Disposition: form-data; name=\"index\"\r\n\r\n";
    buff.Format("%d", context->specificIndex);
    body += buff;
	  body += "\r\n";
  }

	// first/repeat view
	body += "--";
	body += boundary + "\r\n";
	body += "Content-Disposition: form-data; name=\"cached\"\r\n\r\n";
  body += info.cached ? "1" : "0";
	body += "\r\n";

	// if it is a video file
	if( !info.zipFileDir.IsEmpty() )
	{
		body += "--";
		body += boundary + "\r\n";
		body += "Content-Disposition: form-data; name=\"video\"\r\n\r\n";
		body += "1";
		body += "\r\n";
	}

  if (pcName.GetLength()) {
    body += CStringA("--") + boundary + "\r\n";
    body += "Content-Disposition: form-data; name=\"pc\"\r\n\r\n";
    body += CStringA(CT2A(pcName)) + "\r\n";
  }

  if (ec2Instance.GetLength()) {
    body += CStringA("--") + boundary + "\r\n";
    body += "Content-Disposition: form-data; name=\"ec2\"\r\n\r\n";
    body += CStringA(CT2A(ec2Instance)) + "\r\n";
  }

	// DNS Servers
	if( !dnsServers.IsEmpty() )
	{
		body += "--";
		body += boundary + "\r\n";
		body += "Content-Disposition: form-data; name=\"dns\"\r\n\r\n";
		body += CStringA(CT2A(dnsServers));
		body += "\r\n";
	}

  if (info.cpu > 0) {
    body += CStringA("--") + boundary + "\r\n";
    body += "Content-Disposition: form-data; name=\"cpu\"\r\n\r\n";
    buff.Format("%d", info.cpu);
    body += buff + "\r\n";
  }


	// if we're done
	if( info.done )
	{
		body += "--";
		body += boundary + "\r\n";
		body += "Content-Disposition: form-data; name=\"done\"\r\n\r\n";
		body += "1";
		body += "\r\n";
	}
	
	// the file
	if( fileSize )
	{
		body += "--";
		body += boundary + "\r\n";
		body += "Content-Disposition: form-data; name=\"file\"; filename=\"";
		body += CT2A(fileName);
		body += "\"\r\n";
		body += "Content-Type: application/zip\r\n\r\n";
		footer = "\r\n";
	}
	footer += "--";
	footer += boundary + "--\r\n";
	
	requestLen = body.GetLength() + fileSize + footer.GetLength();
	buff.Format("Content-Length: %u\r\n", requestLen);
	headers += buff;
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Upload all of the image files
-----------------------------------------------------------------------------*/
void CUrlMgrHttp::UploadImages(CTestInfo &info)
{
  CUrlMgrHttpContext * context = (CUrlMgrHttpContext *)info.context;
  if( context && !context->discardTest )
	{
    // go through the different file types we want to upload
    TCHAR * extensions[] = {_T("*.jpg"), _T("*.png"), _T("*.dtas"), _T("*.cap"), _T("*.gz"), _T("*.hist")};
    int extCount = _countof(extensions);
    for( int i = 0; i < extCount; i++ )
    {
      TCHAR * ext = extensions[i];

		  // upload (and delete) all of the files that match the extenstion in the directory one at a time
		  WIN32_FIND_DATA fd;
		  HANDLE hFind = FindFirstFile( workDir + context->fileRunBase + ext, &fd);
		  if( hFind != INVALID_HANDLE_VALUE )
		  {
			  do
			  {
				  if( !(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) )
				  {
					  CString filePath = workDir + fd.cFileName;

					  CString fileName = fd.cFileName;
					  int index = fileName.Find(_T("-"));
					  if( index >= 0 )
						  fileName = fileName.Mid(index + 1);

					  UploadFile(resultImage, info, filePath, fileName);

					  DeleteFile(filePath);
				  }
			  }while( FindNextFile(hFind, &fd) );

			  FindClose(hFind);
		  }
    }
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrHttp::NeedReboot()
{
	bool ret = false;

	DWORD last = lastSuccess;
	DWORD now = GetTickCount();

	// are we even running?
	if( last )
	{
		// deal with the case of wrap-around
		if( now < last )
			last = now;
		else
		{
			// if 30 minutes have passed, kick off a reboot
			if( now - last > 1800000 )
				ret = true;
		}
	}

	return ret;
}

/*-----------------------------------------------------------------------------
	Install an update that was downloaded
-----------------------------------------------------------------------------*/
void CUrlMgrHttp::InstallUpdate(CString path)
{
	// prevent an endless update loop - just try once
	verString.Empty();

	// validate all of the files
	HCRYPTPROV hProv = 0;
	bool ok = false;
	if( CryptAcquireContext(&hProv, NULL, NULL, PROV_RSA_FULL, CRYPT_VERIFYCONTEXT) )
	{
		TCHAR srcHash[100];
		TCHAR fileHash[100];
		BYTE buff[4096];
		DWORD bytes = 0;
		ok = true;
		WIN32_FIND_DATA fd;
		HANDLE hFind = FindFirstFile(path + _T("\\*.*"), &fd);
		if( hFind != INVALID_HANDLE_VALUE )
		{
			do
			{
				if( !(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) && lstrcmpi(fd.cFileName, _T("update.ini")) )
				{
					ok = false;

					// make sure we have a hash for it in the ini file
					*srcHash = 0;
					if( GetPrivateProfileString(_T("md5"), fd.cFileName, _T(""), srcHash, 100, path + _T("\\update.ini")) )
					{
						// generate a md5 hash for the file
						HCRYPTHASH hHash = 0;
						if( CryptCreateHash(hProv, CALG_MD5, 0, 0, &hHash) )
						{
							HANDLE hFile = CreateFile( path + CString(_T("\\")) + fd.cFileName, GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
							if( hFile != INVALID_HANDLE_VALUE )
							{
								ok = true;
								while( ReadFile(hFile, buff, sizeof(buff), &bytes, 0) && bytes )
									if (!CryptHashData(hHash, buff, bytes, 0))
										ok = false;

								if( ok )
								{
									BYTE hash[16];
									DWORD len = 16;
									if(CryptGetHashParam(hHash, HP_HASHVAL, hash, &len, 0))
									{
										wsprintf(fileHash, _T("%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X"),
												hash[0], hash[1], hash[2], hash[3], hash[4], hash[5], hash[6], hash[7],  
												hash[8], hash[9], hash[10], hash[11], hash[12], hash[13], hash[14], hash[15]);

										// compare the hashes
										if( lstrcmpi(fileHash, srcHash) )
											ok = false;
									}
									else
										ok = false;
								}

								CloseHandle( hFile );
							}
							CryptDestroyHash(hHash);
						}
					}
				}
			}while( ok && FindNextFile(hFind, &fd) );
			FindClose(hFind);
		}

		CryptReleaseContext(hProv,0);
	}

	if( ok )
	{
		// execute ptUpdate which will take over
		ShellExecute(NULL, NULL, path + _T("\\ptUpdate.exe"), NULL, path, SW_SHOWNORMAL);

		// sleep for 10 seconds so we don't accidentally pick up a new job while ptUpdate is trying to kill us
		Sleep(10000);
	}
}

/*-----------------------------------------------------------------------------
	Delete the results files that we would normally have uploaded
-----------------------------------------------------------------------------*/
void CUrlMgrHttp::DeleteResults(CTestInfo &info)
{
	if( info.context )
	{
		CUrlMgrHttpContext * context = (CUrlMgrHttpContext *)info.context;
	  WIN32_FIND_DATA fd;
	  HANDLE hFind = FindFirstFile( workDir + context->fileRunBase + _T("*.*"), &fd);
	  if( hFind != INVALID_HANDLE_VALUE )
	  {
		  do
		  {
			  CString filePath = workDir + fd.cFileName;
        DeleteFile(filePath);
      }while( FindNextFile(hFind, &fd));
      FindClose(hFind);
    }
  }
}

/*-----------------------------------------------------------------------------
  Update our list of DNS servers
-----------------------------------------------------------------------------*/
void CUrlMgrHttp::UpdateDNSServers() {
  DWORD len = 15000;
  dnsServers.Empty();
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
              if (!dnsServers.IsEmpty())
                dnsServers += "-";
              dnsServers += buff;
            }
          }
        }
      }
    }
    if (addresses)
      free(addresses);
  }
}

/*-----------------------------------------------------------------------------
  Helper function to crack an url into it's component parts
-----------------------------------------------------------------------------*/
bool CUrlMgrHttp::CrackUrl(CString url, CString &host, unsigned short &port,
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
      if (!host.CompareNoCase(_T("www.webpagetest.org")))
        host = _T("agent.webpagetest.org");
      if (!lstrcmpi(scheme, _T("https"))) {
        secure_flag = INTERNET_FLAG_SECURE |
                      INTERNET_FLAG_IGNORE_CERT_CN_INVALID |
                      INTERNET_FLAG_IGNORE_CERT_DATE_INVALID;
        if (!port)
          port = INTERNET_DEFAULT_HTTPS_PORT;
      } else if (!port)
        port = INTERNET_DEFAULT_HTTP_PORT;
  }
  return ret;
}
