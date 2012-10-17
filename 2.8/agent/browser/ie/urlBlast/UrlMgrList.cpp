#include "StdAfx.h"
#include "UrlMgrList.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrList::CUrlMgrList(CLog &logRef):CUrlMgrBase(logRef)
, hCryptProv(NULL)
, includeObject(1)
, sampleRate(100.0)
, minInterval(5000)
, testType(0)
{
	// initialize the crypto provider (for the random number generator)
	if( !CryptAcquireContext(&hCryptProv,NULL,NULL,PROV_RSA_FULL,0) )
		srand(GetTickCount());
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrList::~CUrlMgrList(void)
{
	if( hCryptProv )
		CryptReleaseContext(hCryptProv, 0);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlMgrList::Start(void)
{
	// parse the multiple url files
	int pos = 0;
	do
	{
		CString file = urlFileList.Tokenize(_T(","), pos);
		file.Trim();
		if( file.GetLength() )
			urlFiles.AddTail(file);
	}while( pos >= 0);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrList::GetNextUrl(CTestInfo &info)
{
	bool ret = false;

	// load the list of urls if we don't have one (or if we went through them all)
	if( urls.IsEmpty() )
		LoadUrls();

	info.includeObjectData = includeObject;
		
	if( !urls.IsEmpty() )
	{
		DWORD index = 0;

		info.url = urls[index];

		if( index < (DWORD)events.GetCount() )	// should always be the case but be safe anyway
			info.eventText = events[index];

		if( index < (DWORD)urlTypes.GetCount() )	// should always be the case but be safe anyway
			info.urlType = urlTypes[index];
			
		if( index < (DWORD)domElements.GetCount() )
			info.domElement = domElements[index];

		// and remove it from the available list
		urls.RemoveAt(index);
		events.RemoveAt(index);
		urlTypes.RemoveAt(index);
		domElements.RemoveAt(index);
		
		// if we are running a script or run command, locate the full path to the file
		if( info.url.Left(9).MakeLower() == _T("script://") )
		{
			info.runningScript = true;
			info.scriptFile = info.url.Mid(9);
			LocateFile(info.scriptFile);
			info.url = CString(_T("script://")) + info.scriptFile;
		}
		else if( info.url.Left(6).MakeLower() == _T("run://") )
		{
			CString szExe = info.url.Mid(6);
			LocateFile(szExe);
			info.url = CString(_T("run://")) + szExe;
		}
		
		log.Trace(_T("Selected index %d, %d remaining - %s"), index, urls.GetCount(), (LPCTSTR)info.url);

		ret = true;
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Should repeat view be run?
-----------------------------------------------------------------------------*/
bool CUrlMgrList::RunRepeatView(CTestInfo &info)
{
	bool ret = false;
	
	if( testType !=1 )
		ret = true;
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlMgrList::UrlFinished(CTestInfo &info)
{
}

/*-----------------------------------------------------------------------------
	Walk through all of the url files loading them
-----------------------------------------------------------------------------*/
void CUrlMgrList::LoadUrls(void)
{
	// make sure not to run more frequently than the munimum interval
	bool ok = true;
	if( minInterval )
	{
		CTime now(CTime::GetCurrentTime());
		CTimeSpan elapsed = now - lastLoad;
		if( elapsed.GetTotalMinutes() < minInterval )
		{
			ok = false;
			log.Trace(_T("Waiting %d minutes before continuing testing..."), minInterval - elapsed.GetTotalMinutes());
		}
	}
	
	if( ok )
	{
		log.Trace(_T("Loading URLS"));

		// determine if we are going to include object data for this run
		// sampling is done at the full run level to assure even spread across all of the urls
		if( sampleRate < 100.0 )
		{
			DWORD rnd = 0;
			if( hCryptProv )
			{
				if( !CryptGenRandom(hCryptProv, sizeof(rnd), (LPBYTE)&rnd) )
					rnd = rand();
			}
			else
				rnd = rand();
			rnd %= 1000;
			if( rnd + 1 > sampleRate * 10)
				includeObject = 0;
			else
				includeObject = 1;
		}
		else
			includeObject = 1;
			
		// load all of the files in the list
		POSITION pos = urlFiles.GetHeadPosition();
		while( pos )
			LoadUrlFile(urlFiles.GetNext(pos));

		lastLoad = CTime::GetCurrentTime();

		log.Trace(_T("Loaded %d URLs"), urls.GetCount());
	}
}

/*-----------------------------------------------------------------------------
	Load a single url file
-----------------------------------------------------------------------------*/
void CUrlMgrList::LoadUrlFile(CString& urlFile)
{
	USES_CONVERSION;
	
	log.Trace(_T("Loading URL file '%s'"), (LPCTSTR)urlFile);

	// open the file - do this in a loop for up to 10 seconds just in case it's being written to
	DWORD start = GetTickCount();
	HANDLE hFile = INVALID_HANDLE_VALUE;
	
	do
	{
		hFile = CreateFile(urlFile, GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
		if( hFile == INVALID_HANDLE_VALUE )
			Sleep(100);
	}while(hFile == INVALID_HANDLE_VALUE && GetTickCount() - start < 10000);

	// ok, load the whole file into memory and parse it	
	if( hFile != INVALID_HANDLE_VALUE )
	{
		log.Trace(_T("File opened"));
		
		DWORD size = GetFileSize(hFile, 0);
		if( size )
		{
			char * buff = new char[size+1];
			DWORD read = 0;
			
			// read in the file
			if( ReadFile(hFile, buff, size, &read, 0) && size == read)
			{
				// NULL terminate the string
				buff[size] = 0;
				
				// parse the string
				char * context = NULL;
				char * token = strtok_s(buff, "\r\n", &context);
				while(token)
				{
					if( lstrlenA(token) && token[0] != '/' )
					{
						CString url, eventText, domElement, buff;
						DWORD urlType = 3;
						CString line = CA2T(token);
						int index = line.Find(_T('\t'));
						if( index == -1 )
							url = line;
						else
						{
							eventText = line.Left(index);
							url = line.Right(line.GetLength() - index - 1);
							
							// see if there is an url type (usually just there for web 2.0 urls)
							index = url.Find(_T('\t'));
							if( index != -1 )
							{
								buff = url.Right(url.GetLength() - index - 1);
								url = url.Left(index);

								// see if we have a DOM element ID
								DWORD ut = _ttol(buff);
								if( ut == 1 )
									urlType = 1;
								else if( ut == 2 )
									urlType = 2;
								index = buff.Find(_T('\t'));
								if( index != -1 )
									domElement = buff.Right(buff.GetLength() - index - 1);
							}
						}
						
						url.Trim();
						if( url.GetLength() )
						{
							eventText.Trim();
							if( !eventText.GetLength() )
								eventText.Empty();

							domElement.Trim();
							if( !domElement.GetLength() )
								domElement.Empty();

							// add it to the list
							urls.Add(url);
							events.Add(eventText);
							urlTypes.Add(urlType);
							domElements.Add(domElement);
						}
					}
						
					token = strtok_s(NULL, "\r\n", &context);
				}
			}

			delete [] buff;
		}
		
		CloseHandle(hFile);
	}

	log.Trace(_T("Done loading URL file '%s'"), (LPCTSTR)urlFile);
}

/*-----------------------------------------------------------------------------
	Find the fully qualified path for the given file
-----------------------------------------------------------------------------*/
bool CUrlMgrList::LocateFile(CString& file)
{
	bool ret = false;
	
	// try relative to the url list directory
	POSITION pos = urlFiles.GetHeadPosition();
	while( !ret && pos )
	{
		TCHAR path[MAX_PATH];
		lstrcpy( path, urlFiles.GetNext(pos));
		lstrcpy(PathFindFileName(path), file);
		HANDLE hFile = CreateFile(path, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			file = path;
			ret = true;
			CloseHandle(hFile);
		}
	}

	// now try opening the file relative to where we are running from
	if( !ret )
	{
		TCHAR szFile[MAX_PATH];
		if( GetModuleFileName(NULL, szFile, _countof(szFile)) )
		{
			*PathFindFileName(szFile) = 0;
			CString filePath = szFile;
			filePath += file;
			
			HANDLE hFile = CreateFile(filePath, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
			if( hFile != INVALID_HANDLE_VALUE )
			{
				file = filePath;
				ret = true;
				CloseHandle(hFile);
			}
		}
	}
	
	// try an absolute path if it wasn't relative
	if( !ret )
	{
		HANDLE hFile = CreateFile(file, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			ret = true;
			CloseHandle(hFile);
		}
	}

	return ret;
}

