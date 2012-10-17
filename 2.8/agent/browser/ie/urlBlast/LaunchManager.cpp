#include "StdAfx.h"
#include "LaunchManager.h"

#define LAUNCHINTERVAL	0

CLaunchManager::CLaunchManager(void):
	lastLaunch(0)
{
	InitializeCriticalSection(&cs);
}

CLaunchManager::~CLaunchManager(void)
{
	DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Space out the browser launches so there is at least 2 seconds between them
-----------------------------------------------------------------------------*/
void CLaunchManager::PrepareLaunch(void)
{
	EnterCriticalSection(&cs);
	
	DWORD now = 0;
	bool ok = false;
	
	do
	{	
		now = GetTickCount();
		if( !lastLaunch || now < lastLaunch || now - lastLaunch >= LAUNCHINTERVAL )
			ok = true;
		else
			Sleep(100);
	} while( !ok );
	
	lastLaunch = now;

	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CLaunchManager::Test(CString key)
{
	bool ret = true;

	EnterCriticalSection(&cs);
	
	POSITION pos = testing.GetHeadPosition();
	while( pos && ret )
	{
		CString val = testing.GetNext(pos);
		if( key == val )
			ret = false;
	}
	
	if( ret )
		testing.AddTail(key);
	
	LeaveCriticalSection(&cs);
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CLaunchManager::DoneTesting(CString key)
{
	EnterCriticalSection(&cs);

	POSITION pos = testing.GetHeadPosition();
	while( pos )
	{
		POSITION oldPos = pos;
		CString val = testing.GetNext(pos);
		if( key == val )
			testing.RemoveAt(oldPos);
	}

	LeaveCriticalSection(&cs);
}
