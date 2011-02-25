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
