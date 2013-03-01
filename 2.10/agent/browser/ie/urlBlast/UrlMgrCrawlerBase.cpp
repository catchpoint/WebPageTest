#include "StdAfx.h"
#include "UrlMgrCrawlerBase.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrCrawlerBase::CUrlMgrCrawlerBase(CLog &logRef, LPCTSTR workDirBase):
	CUrlMgrBase(logRef)
	, depth(1)
	,currentDepth(0)
	,pendingUrls(0)
	,tested(0)
	,done(false)
	,running(false)
	,maxUrls(0)
{
	allUrls.InitHashTable(3571);

	// figure out what our working diriectory is
	TCHAR path[MAX_PATH];
	if( SUCCEEDED(SHGetFolderPath(NULL, CSIDL_COMMON_APPDATA | CSIDL_FLAG_CREATE, NULL, SHGFP_TYPE_CURRENT, path)) )
	{
		PathAppend(path, workDirBase);
		CreateDirectory(path, NULL);
		lstrcat(path, _T("\\"));
		workDir = path;
		
		ClearWorkDir();
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlMgrCrawlerBase::ClearWorkDir()
{
	// delete everything in the folder to make sure we don't collect cruft
	WIN32_FIND_DATA fd;
	HANDLE hFind = FindFirstFile(workDir + _T("*.*"), &fd);
	if( hFind )
	{
		do
		{
			if( !(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) )
				DeleteFile(workDir + fd.cFileName);
		}while( FindNextFile(hFind, &fd) );
		FindClose(hFind);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrCrawlerBase::~CUrlMgrCrawlerBase(void)
{
	Reset();
}

/*-----------------------------------------------------------------------------
	See if we're done with the crawl
-----------------------------------------------------------------------------*/
bool CUrlMgrCrawlerBase::Done()
{
	return done;
}

/*-----------------------------------------------------------------------------
	Wipe out any state we had
-----------------------------------------------------------------------------*/
void CUrlMgrCrawlerBase::Reset()
{
	POSITION pos = allUrls.GetStartPosition();
	while( pos )
	{
		CURLList * urls = allUrls.GetNextValue(pos);
		if( urls )
			delete urls;
	}

	allUrls.RemoveAll();

	depth = 1;
	currentDepth = 0;
	pendingUrls = 0;
	maxUrls = 0;
	tested = 0;
	done = false;
	running = false;

	ClearWorkDir();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrCrawlerBase::GetNextUrl(CTestInfo &info)
{
	bool ret = false;

	info.harvestLinks = true;		// we're crawling so always collect the urls
	info.includeObjectData = 1;		// also, always include object data
	info.urlType = 3;				// run in automatic mode
	
	// any urls to test?
	if( !urls.IsEmpty() )
	{
		// pop the first one off
		info.url = urls.GetAt(0);
		urls.RemoveAt(0);

		info.eventText = info.url;
		pendingUrls++;
		info.linksFile = workDir + info.userName + _T("_links.txt");
		DeleteFile(info.linksFile);

		info.s404File = info.logFile + _T("_404.txt");

		ret = true;
	}

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlMgrCrawlerBase::HarvestedLinks(CTestInfo &info)
{
	if( !info.linksFile.IsEmpty() )
	{
		// make sure we actually want to collect more urls
		if( currentDepth < depth )
		{
			// load the file into memory
			HANDLE hFile = CreateFile(info.linksFile, GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
			if( hFile != INVALID_HANDLE_VALUE )
			{
				DWORD len = GetFileSize(hFile, 0);
				if( len )
				{
					char * buff = new char[len + 1];
					DWORD bytes;
					if( ReadFile(hFile, buff, len, &bytes, 0) && len == bytes )
					{
						// parse it one line at a time (each url will be on it's own line)
						buff[len] = 0;
						CString file = CA2T(buff);
						int pos = 0;
						CString url = file.Tokenize(_T("\r\n"), pos);
						while( pos >= 0 )
						{
							url.Trim();
							if( url.GetLength() )
							{
								if( url.Left(4) != _T("http") )
									url = CString(_T("http://")) + url;
								
								if( IsDomainOk(url, info.url) && IsNewUrl(url) )
									nextLevel.AddTail(url);
							}
							
							url = file.Tokenize(_T("\r\n"), pos);
						}
					}
				}
				
				CloseHandle(hFile);
			}
		}
		
		DeleteFile(info.linksFile);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlMgrCrawlerBase::UrlFinished(CTestInfo &info)
{
	pendingUrls--;
	tested++;
	
	// see if we need to re-populate the urls list or if we are finished
	if( urls.IsEmpty() )
	{
		// see if we need to go to the next depth in the crawl
		if( currentDepth < depth && !pendingUrls)
		{
			currentDepth++;
			if( !nextLevel.IsEmpty() )
			{
				// copy the urls over
				while( !nextLevel.IsEmpty() )
					urls.Add(nextLevel.RemoveHead());
			}
			else
				done = true;
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrCrawlerBase::AddTld(CString host)
{
	bool ret = false;
	
	// get the tld from the host name (if there is only one . use the whole thing)
	int first = host.Find(_T('.'));
	if( first >= 0 )
	{
//		int second = host.Find(_T('.'), first + 1);
//		if( second < 0 )
//			host = CString(".") + host;
//		else
//			host = host.Mid(first);
			
		// make sure the TLD is not already in the list
		bool found = false;
		POSITION pos = domains.GetHeadPosition();
		while( pos && !found )
			if( !domains.GetNext(pos).CompareNoCase(host) )
				found = true;
		
		if( !found )
			domains.AddTail(host);
		
		ret = true;
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	See if we already know about this url
-----------------------------------------------------------------------------*/
bool CUrlMgrCrawlerBase::IsNewUrl(CString url)
{
	bool ret = true;
	
	// generate a checksum for the url
	DWORD checksum = 0;
	CString copy(url);
	copy.MakeLower();
	size_t len = copy.GetLength();
	for( size_t i = 0; i < len; i++ )
		checksum += copy[i];
	
	CURLList * urls = NULL;
	allUrls.Lookup(checksum, urls);
	if( urls )
	{
		POSITION pos = urls->GetHeadPosition();
		while( pos && ret )
			if( !urls->GetNext(pos).CompareNoCase(url) )
				ret = false;

		if( ret )
			urls->AddHead(url);
	}
	else
		allUrls.SetAt(checksum, new CURLList);
		
	return ret;
}

/*-----------------------------------------------------------------------------
	See if it is a domain we're supposed to crawl (and log rejects)
-----------------------------------------------------------------------------*/
bool CUrlMgrCrawlerBase::IsDomainOk(CString url, CString pageUrl)
{
	bool ok = false;

	// is it from one of the domains we are allowed to go into?
	URL_COMPONENTS parts;
	memset(&parts, 0, sizeof(parts));
	TCHAR szHost[10000];
	memset(szHost, 0, sizeof(szHost));
	parts.lpszHostName = szHost;
	parts.dwHostNameLength = _countof(szHost);
	parts.dwStructSize = sizeof(parts);
	InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts);

	CString	host = szHost;
	POSITION pos = domains.GetHeadPosition();
	while( pos && !ok )
	{
		CString domain = domains.GetNext(pos);
		if( !domain.CompareNoCase(host.Right(domain.GetLength())) )
			ok = true;
		else if( host.GetLength() == domain.GetLength() - 1 &&
				!host.CompareNoCase(domain.Right(host.GetLength())) )
			ok = true;
	}
	
	if( !ok )
	{
		bool found = false;
		pos = rejectedHosts.GetHeadPosition();
		while( pos && !found )
			if( !rejectedHosts.GetNext(pos).CompareNoCase(host) )
				found = true;
		
		// keep track of all of the hosts we did not navigate to
		if( !found )
		{
			rejectedHosts.AddTail(host);
			
			HANDLE hReject = CreateFile(rejectFile, GENERIC_WRITE, FILE_SHARE_READ, &nullDacl, OPEN_ALWAYS, 0, 0);
			if( hReject != INVALID_HANDLE_VALUE )
			{
				SetFilePointer(hReject, 0, 0, FILE_END);
				DWORD written;
				WriteFile(hReject, (LPCSTR)CT2A(host), host.GetLength(), &written, 0);
				WriteFile(hReject, "\t", 1, &written, 0);
				WriteFile(hReject, (LPCSTR)CT2A(url), url.GetLength(), &written, 0);
				WriteFile(hReject, "\t", 1, &written, 0);
				WriteFile(hReject, (LPCSTR)CT2A(pageUrl), pageUrl.GetLength(), &written, 0);
				WriteFile(hReject, "\r\n", 2, &written, 0);
				CloseHandle(hReject);
			}
		}
	}

	return ok;
}

/*-----------------------------------------------------------------------------
	Status string to display in the UI
-----------------------------------------------------------------------------*/
void CUrlMgrCrawlerBase::GetStatus(CString &status)
{
	if( running )
	{
		CString buff;

		buff.Format(_T("Crawling level %d of %d\n")
					_T("%d URLs remaining in this level\n")
					_T("%d URLs to be tested in the next level"),
						currentDepth, depth, (DWORD)urls.GetCount(), (DWORD)nextLevel.GetCount());
		
		status += buff;
	}
}
