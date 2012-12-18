#include "StdAfx.h"
#include "UrlMgrBase.h"

CUrlMgrBase::CUrlMgrBase(CLog &logRef):log(logRef)
{
	// create a NULL DACL we will re-use everywhere we do file access
	ZeroMemory(&nullDacl, sizeof(nullDacl));
	nullDacl.nLength = sizeof(nullDacl);
	nullDacl.bInheritHandle = FALSE;
	if( InitializeSecurityDescriptor(&SD, SECURITY_DESCRIPTOR_REVISION) )
		if( SetSecurityDescriptorDacl(&SD, TRUE,(PACL)NULL, FALSE) )
			nullDacl.lpSecurityDescriptor = &SD;
}

CUrlMgrBase::~CUrlMgrBase(void)
{
}
