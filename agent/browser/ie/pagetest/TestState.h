/*
Copyright (c) 2005-2007, AOL, LLC.

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, 
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
		this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, 
		this list of conditions and the following disclaimer in the documentation 
		and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be 
		used to endorse or promote products derived from this software without 
		specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#pragma once
#include "browserevents.h"

class CTestState :
	public CBrowserEvents
{
public:
	CTestState(void);
	virtual ~CTestState(void);

	virtual void DoStartup(CString& szUrl, bool initializeDoc = false);
	virtual void CheckComplete();
	virtual void CheckReadyState(void);
	virtual void CheckWindowPainted();			// check to see if anything was drawn to the screen
	virtual void PaintEvent(int x, int y, int width, int height);
	virtual void StartMeasuring(void);
	virtual void BackgroundTimer(void);
	
	READYSTATE	currentState;
	virtual void Reset(void);
	bool		painted;
	HANDLE		hTimer;
	DWORD		lastBytes;
	DWORD		lastTime;
	DWORD		imageCount;
	DWORD		lastImageTime;
	unsigned __int64 lastCpuIdle;
	unsigned __int64 lastCpuUser;
	unsigned __int64 lastCpuKernel;
	__int64 lastRealTime;
	bool		cacheCleared;


protected:
	virtual void CheckDOM(void);		// Check to see if a specific DOM element we're looking for has been loaded yet
	void	ParseTestOptions();			// Parse the url-based test options string
  void  ClearShortTermCache(DWORD cacheTTL);

  HANDLE heartbeatEvent;
};
