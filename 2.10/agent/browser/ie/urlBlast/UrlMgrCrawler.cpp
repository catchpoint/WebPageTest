#include "StdAfx.h"
#include "UrlMgrCrawler.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrCrawler::CUrlMgrCrawler(CLog &logRef):CUrlMgrCrawlerBase(logRef, _T("urlblast_crawler"))
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrCrawler::~CUrlMgrCrawler(void)
{
}

/*-----------------------------------------------------------------------------
	Do the startup initialization
-----------------------------------------------------------------------------*/
void CUrlMgrCrawler::Start()
{
	if( configFile.IsEmpty() )
	{
		done = true;
		running = false;
	}
	else
	{
		// load the specified urls file and settings
		depth = GetPrivateProfileInt(_T("Settings"), _T("depth"), depth, configFile);
		
		TCHAR path[MAX_PATH];
		lstrcpy(path, configFile);
		lstrcpy(PathFindFileName(path), _T("rejected.txt"));
		rejectFile = path;
		DeleteFile(rejectFile);
		
		DWORD size = 32767;	// max size for GetPrivateProfileSection - if we need bigger we need to parse by hand
		TCHAR * buff = new TCHAR[size];
		GetPrivateProfileSection(_T("urls"), buff, size, configFile);
		
		TCHAR * p = buff;
		while( *p )
		{
			CString url = p;
			url.Trim();
			if( url.GetLength() )
			{
				if( url.Left(4) != _T("http") )
					url = CString(_T("http://")) + url;
				
				// add it to the list of urls if we don't already have it
				if( IsNewUrl(url) )
				{
					urls.Add(url);

					// Add the TLD to the list of TLD's for crawling
					URL_COMPONENTS parts;
					memset(&parts, 0, sizeof(parts));
					TCHAR host[10000];
					memset(host, 0, sizeof(host));
					parts.lpszHostName = host;
					parts.dwHostNameLength = _countof(host);
					parts.dwStructSize = sizeof(parts);
					InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts);
					
					AddTld(host);

					running = true;
				}
			}
			
			// on to the next one
			p += lstrlen(p) + 1;
		}

		GetPrivateProfileSection(_T("domains"), buff, size, configFile);
		
		p = buff;
		while( *p )
		{
			CString domain = p;
			domain.Trim();
			if( domain.GetLength() )
				AddTld(domain);
			
			// on to the next one
			p += lstrlen(p) + 1;
		}
		
		delete [] buff;
	}
}
