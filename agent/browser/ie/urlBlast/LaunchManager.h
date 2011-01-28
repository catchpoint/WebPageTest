#pragma once

class CLaunchManager
{
public:
	CLaunchManager(void);
	virtual ~CLaunchManager(void);
	void PrepareLaunch(void);
	bool Test(CString key);
	void DoneTesting(CString key);
	
protected:
	CRITICAL_SECTION cs;
	DWORD lastLaunch;
	CAtlList<CString> testing;
};
