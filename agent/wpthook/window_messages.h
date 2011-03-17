/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

// Messages for communicating with the WPT hook DLL

#pragma once

#define wpthook_window_class    _T("wpthook")
#define wptdriver_window_class  _T("wptdriver")

// message definitions

/******************************************************************************
*                         wptdriver -> wpthook
******************************************************************************/
// Commands
const UINT WPT_START  = WM_APP + 1;    // Start Measurement
const UINT WPT_STOP   = WM_APP + 2;    // Stop Measurement (rare)

// browser events
const UINT WPT_ON_NAVIGATE  = WM_APP + 100; // Navigation start 
                                            // (implied with START)
const UINT WPT_ON_LOAD      = WM_APP + 101; // onLoad event (DocumentComplete)


// internal use
const UINT WPT_INIT = WM_APP + 1000;  // internal - for initialization


/******************************************************************************
*                         wptdriver <- wpthook
******************************************************************************/
const UINT WPT_HOOK_DONE  = WM_APP + 1;    // All done, close the browser
