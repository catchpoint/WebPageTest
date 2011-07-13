#include "StdAfx.h"
#include "UrlMgrFile.h"
#include "zip/zip.h"

class CUrlMgrFileContext
{
public:
	CUrlMgrFileContext(void):
		hUrlFile(NULL)
		, fvonly(false)
		, showProgress(true)
		, runs(0)
		, currentRun(0)
		{}
	~CUrlMgrFileContext(void){}
	CString	urlFile;
	CString scriptFile;
	CString fileBase;
	CString serverDir;
	CString fileRunBase;
	HANDLE	hUrlFile;
	bool	fvonly;
	bool	showProgress;
	DWORD	runs;
	DWORD	currentRun;
};

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrFile::CUrlMgrFile(CLog &logRef):CUrlMgrBase(logRef)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlMgrFile::~CUrlMgrFile(void)
{
}

/*-----------------------------------------------------------------------------
	Do the startup initialization
-----------------------------------------------------------------------------*/
void CUrlMgrFile::Start()
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
}

/*-----------------------------------------------------------------------------
	Load an url from the pagetest file
-----------------------------------------------------------------------------*/
bool CUrlMgrFile::GetNextUrl(CTestInfo &info)
{
	bool ret = false;
	bool includeObject = true;
	bool progress = false;
	bool fvonly = false;
	bool saveEverything = true;
	bool captureVideo = false;
	DWORD runs = 0;
	HANDLE hUrlFile = INVALID_HANDLE_VALUE;	

	WIN32_FIND_DATA fd;
	HANDLE hFind = FindFirstFile(urlFilesDir + _T("*.url"), &fd);
	if( hFind != INVALID_HANDLE_VALUE )
	{
		do
		{
			progress = true;
			bool saveHTML = false;
			bool saveCookies = false;
			
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
						LPBYTE szUrl = (LPBYTE)malloc(len + 1);
						if( szUrl )
						{
							memset(szUrl, 0, len+1);
							DWORD read;
							if( ReadFile(hUrlFile, szUrl, len, &read, 0) )
							{
								// tokenize the file - first line is the url
								CString file((const char *)szUrl);
								free(szUrl);
								int pos = 0;
								CString line = file.Tokenize(_T("\r\n"), pos);
								while( pos >= 0 )
								{
									line.Trim();
									
									if( info.url.IsEmpty() )
										info.url = line;
									else
									{
										int index = line.Find('=');
										if( index != -1 )
										{
											CString key = line.Left(index);
											CString value = line.Right(line.GetLength() - index - 1);
											key.Trim();
											value.Trim();
											if( !key.IsEmpty() && !value.IsEmpty() )
											{
												if( !key.CompareNoCase(_T("DOMElement")) )
													info.domElement = value;
												else if( !key.CompareNoCase(_T("fvonly")) )
												{
													if( _ttol(value) )
														fvonly = true;
												}
												else if( !key.CompareNoCase(_T("object")) )
												{
													if( !_ttol(value) )
														includeObject = false;
												}
												else if( !key.CompareNoCase(_T("images")) )
												{
													if( !_ttol(value) )
														saveEverything = false;
												}
												else if( !key.CompareNoCase(_T("progress")) )
												{
													if( !_ttol(value) )
														progress = false;
												}
												else if( !key.CompareNoCase(_T("Event Name")) )
													info.eventText = value;
												else if( !key.CompareNoCase(_T("web10")) )
												{
													if( _ttol(value) )
														info.urlType = 1;
												}
												else if( !key.CompareNoCase(_T("ignoreSSL")) )
													info.ignoreSSL = _ttol(value);
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
												else if( !key.CompareNoCase(_T("blockads")) )
													info.blockads = _ttol(value);
												else if( !key.CompareNoCase(_T("Basic Auth")) )
													info.basicAuth = value;
												else if( !key.CompareNoCase(_T("runs")) )
													runs = _ttol(value);
												else if( !key.CompareNoCase(_T("Capture Video")) )
												{
													if( _ttol(value) )
														captureVideo = true;
												}
												else if( !key.CompareNoCase(_T("Host")) )
													info.host = value;
											}
										}
									}
									
									// on to the next line
									line = file.Tokenize(_T("\r\n"), pos);
								}

								if( info.url.GetLength() > 2 )
									if( info.url.Find(_T("://")) == -1 )
										info.url = CString(_T("http://")) + info.url;
							}
							else
								free(szUrl);
						}
					}
					
					if( info.url.IsEmpty() )
					{
						CloseHandle(hUrlFile);
						DeleteFile(szFile);
						
						hUrlFile = INVALID_HANDLE_VALUE;
					}
					else
					{
						CUrlMgrFileContext * context = new CUrlMgrFileContext;
						info.context = context;
						context->urlFile = szFile;
						context->hUrlFile = hUrlFile;
						context->fvonly = fvonly;
						context->showProgress = progress;
						if( !runs )
							runs = 1;
						context->runs = runs;
						context->currentRun = 1;

						// build the log file name
						LPTSTR ext = PathFindExtension(szFile);
						if( ext != szFile )
							*ext = 0;
						TCHAR * pFile = PathFindFileName(szFile);
						context->fileBase = pFile;
						*pFile = 0;
						context->serverDir = szFile;
						
						context->fileRunBase = context->fileBase;
						if( context->fileBase.Find(_T('-')) == -1 )
							context->fileRunBase += _T("-1");

						info.logFile = workDir + context->fileRunBase;

						if( info.eventText.IsEmpty() )						
							info.eventText = _T("Run_1");

						if( includeObject )
							info.includeObjectData = 1;
						else
							info.includeObjectData = 0;
							
						info.saveEverything = saveEverything;
						info.captureVideo = captureVideo;

						// if we are running a script, locate the full path to the file
						if( info.url.Left(9).MakeLower() == _T("script://") )
						{
							info.runningScript = true;
							info.scriptFile = info.url.Mid(9);
							LocateFile(info.scriptFile);
							info.url = CString(_T("script://")) + info.scriptFile;
						}
						
						// figure out the links file if we are harvesting links
						if( info.harvestLinks )
							info.linksFile = workDir + context->fileRunBase + _T("_links.txt");
							
						if( saveHTML )
							info.htmlFile = workDir + context->fileRunBase;
							
						if( saveCookies )
							info.cookiesFile = workDir + context->fileRunBase;
						
						// write the "started" file
						if( context->showProgress )
						{
							HANDLE hProgress = CreateFile(context->urlFile + _T(".started"), GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
							if( hProgress != INVALID_HANDLE_VALUE )
								CloseHandle(hProgress);
						}
						
						ret = true;
					}
				}
			}
		}while(!ret && FindNextFile(hFind, &fd));
		
		FindClose(hFind);
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlMgrFile::RunRepeatView(CTestInfo &info)
{
	bool ret = true;

	if( info.context )
	{
		CUrlMgrFileContext * context = (CUrlMgrFileContext *)info.context;

		ret = !(context->fvonly);
		
		if( ret )
		{
			info.logFile += _T("_Cached");

			if( info.harvestLinks )
				info.linksFile = workDir + context->fileRunBase + _T("_Cached_links.txt");
			if( !info.htmlFile.IsEmpty() )
				info.htmlFile = workDir + context->fileRunBase + _T("_Cached");
			if( !info.cookiesFile.IsEmpty() )
				info.cookiesFile = workDir + context->fileRunBase + _T("_Cached");
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlMgrFile::UrlFinished(CTestInfo &info)
{
	if( info.context )
	{
		CUrlMgrFileContext * context = (CUrlMgrFileContext *)info.context;
		
		if( context->currentRun >= context->runs )
			info.done = true;
		else
		{
			info.done = false;
			
			// get ready for another run
			context->currentRun++;
			CString runText;
			runText.Format(_T("%d"), context->currentRun);
			context->fileRunBase = context->fileBase + CString(_T("-")) + runText;

			info.logFile = workDir + context->fileRunBase;

			info.eventText = CString(_T("Run_")) + runText;

			if( info.harvestLinks )
				info.linksFile = workDir + context->fileRunBase + _T("_links.txt");
			if( !info.htmlFile.IsEmpty() )
				info.htmlFile = workDir + context->fileRunBase;
			if( !info.cookiesFile.IsEmpty() )
				info.cookiesFile = workDir + context->fileRunBase;
		}

		// clean up if we're actually done
		if( info.done )
		{
			UploadResults(info);

			// delete the script file if we need to
			if( !context->scriptFile.IsEmpty() )
				DeleteFile( context->scriptFile );
			
			// clean up the test file
			CloseHandle(context->hUrlFile);
			DeleteFile(context->urlFile);

			delete context;
		}
	}
}

/*-----------------------------------------------------------------------------
	Find the fully qualified path for the given file
-----------------------------------------------------------------------------*/
bool CUrlMgrFile::LocateFile(CString& file)
{
	bool ret = false;
	
	// try relative to the url files directory
	if( !urlFilesDir.IsEmpty() )
	{
		CString filePath = urlFilesDir + file;
		HANDLE hFile = CreateFile(filePath, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			file = filePath;
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

/*-----------------------------------------------------------------------------
	Upload the test results that we have so far
-----------------------------------------------------------------------------*/
void CUrlMgrFile::UploadResults(CTestInfo &info)
{
	if( info.context )
	{
		CUrlMgrFileContext * context = (CUrlMgrFileContext *)info.context;

		// upload the results
		if( !context->serverDir.IsEmpty() && !workDir.IsEmpty() && !context->fileBase.IsEmpty() )
		{
			// zip up all of the  files
			CString zipFilePath = workDir + context->fileBase + _T(".zip");
			zipFile file = zipOpen(CT2A(zipFilePath), APPEND_STATUS_CREATE);
			if( file )
			{
				WIN32_FIND_DATA fd;
				HANDLE hFind = FindFirstFile(workDir + context->fileBase + _T("*.*"), &fd);
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
					}while(FindNextFile(hFind, &fd));
					FindClose(hFind);
				}

				// close the zip archive
				zipClose(file, 0);
			}
			
			// upload the actual zip file
			MoveFileEx(zipFilePath, context->serverDir + context->fileBase + _T(".zip"), MOVEFILE_COPY_ALLOWED | MOVEFILE_REPLACE_EXISTING);
		}
	}
}

