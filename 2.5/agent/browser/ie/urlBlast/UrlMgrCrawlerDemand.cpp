#include "StdAfx.h"
#include "UrlMgrCrawlerDemand.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrCrawlerDemand::CUrlMgrCrawlerDemand(CLog &logRef):CUrlMgrCrawlerBase(logRef, _T("urlblast_crawler_demand"))
	,hUrlFile(INVALID_HANDLE_VALUE)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrCrawlerDemand::~CUrlMgrCrawlerDemand(void)
{
	if( hUrlFile != INVALID_HANDLE_VALUE )
		CloseHandle(INVALID_HANDLE_VALUE);
}

/*-----------------------------------------------------------------------------
	Continue with the current crawl or load a new on-demand file
-----------------------------------------------------------------------------*/
bool CUrlMgrCrawlerDemand::GetNextUrl(CTestInfo &info)
{
	bool ret = false;
	
	if( running )
	{
		// see if there are any more urls in the current crawl
		ret = __super::GetNextUrl(info);
	}
	else
	{
		fileBase.Empty();
		
		WIN32_FIND_DATA fd;
		HANDLE hFind = FindFirstFile(urlFilesDir + _T("*.url"), &fd);
		if( hFind != INVALID_HANDLE_VALUE )
		{
			do
			{
				CString baseUrl;
				CString mailTo;
				DWORD crawlDepth = depth;
				DWORD maxCount = 0;
				
				if( !(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) )
				{
					// build the file name
					TCHAR szFile[MAX_PATH];
					lstrcpy(szFile, urlFilesDir + fd.cFileName);
					hUrlFile = CreateFile(szFile, GENERIC_READ, 0, 0, OPEN_EXISTING, 0, 0);
					if( hUrlFile != INVALID_HANDLE_VALUE )
					{
						DWORD len = GetFileSize(hUrlFile,NULL);
						if( len )
						{
							LPBYTE szFile = (LPBYTE)malloc(len + 1);
							if( szFile )
							{
								DWORD read;
								if( ReadFile(hUrlFile, szFile, len, &read, 0) && read == len )
								{
									szFile[len] = 0;
									// tokenize the file - first line is the url
									CString file((const char *)szFile);
									free(szFile);
									int pos = 0;
									CString line = file.Tokenize(_T("\r\n"), pos);
									while( pos >= 0 )
									{
										int linePos = 0;
										CString token = line.Tokenize(_T("="), linePos);
										if( linePos >= 0 )
										{
											CString value = line.Tokenize(_T("="), linePos);
											token.Trim();
											value.Trim();
											
											if( !token.CompareNoCase(_T("url")) )
												baseUrl = value;
											else if( !token.CompareNoCase(_T("mail")) )
												mailTo = value;
											else if( !token.CompareNoCase(_T("depth")) )
												crawlDepth = _ttol(value);
											else if( !token.CompareNoCase(_T("max")) )
												maxCount = _ttol(value);
										}
									}
								}
								else
									free(szFile);
							}
						}

						// make sure it was a valid test file
						if( baseUrl.IsEmpty() )
						{
							CloseHandle(hUrlFile);
							DeleteFile(szFile);
							
							hUrlFile = INVALID_HANDLE_VALUE;
						}
						else
						{
							if( crawlDepth )
								depth = crawlDepth;
							if( maxCount )
								maxUrls = maxCount;
								
							urlFile = szFile;
							LPTSTR ext = PathFindExtension(szFile);
							if( ext != szFile )
								*ext = 0;
							TCHAR * pFile = PathFindFileName(szFile);
							fileBase = workDir + pFile;
							
							// add the url to testing
							urls.Add(baseUrl);

							// Add the host to the list of TLD's for crawling
							URL_COMPONENTS parts;
							memset(&parts, 0, sizeof(parts));
							TCHAR host[10000];
							memset(host, 0, sizeof(host));
							parts.lpszHostName = host;
							parts.dwHostNameLength = _countof(host);
							parts.dwStructSize = sizeof(parts);
							InternetCrackUrl((LPCTSTR)baseUrl, baseUrl.GetLength(), 0, &parts);
							
							AddTld(host);
							
							// specify the various files
							rejectFile = fileBase + _T("_rejected.txt");

							// go back to the base to get the next url to test (in case we loaded a file)
							Reset();
							ret = __super::GetNextUrl(info);
							
							// kick out a progress file if nexessary
							if( ret )
							{
								running = true;
								HANDLE hProgress = CreateFile(urlFile + _T(".started"), GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
								if( hProgress != INVALID_HANDLE_VALUE )
									CloseHandle(hProgress);
							}
						}
					}
				}
			}while(!ret && FindNextFile(hFind, &fd));
		}
	}
	
	if( ret )
		info.logFile = fileBase;
	
	return ret;
}

/*-----------------------------------------------------------------------------
	We finished with an url, see if we are finished with all of them
-----------------------------------------------------------------------------*/
void CUrlMgrCrawlerDemand::UrlFinished(CTestInfo &info)
{
	__super::UrlFinished(info);
	
	if( done )
	{
		// copy the results over
		
		// clean up the test file
		if( hUrlFile != INVALID_HANDLE_VALUE )
		{
			CloseHandle(hUrlFile);
			DeleteFile(urlFile);
			hUrlFile = INVALID_HANDLE_VALUE;
		}
		
		running = false;
	}
}
