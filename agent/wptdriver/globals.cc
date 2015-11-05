#include "StdAfx.h"
#include "globals.h"

const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");
const TCHAR * BROWSER_STARTED_EVENT = _T("Global\\wpt_browser_started");
const TCHAR * BROWSER_DONE_EVENT = _T("Global\\wpt_browser_done");
const TCHAR * FLASH_CACHE_DIR = 
                        _T("Macromedia\\Flash Player\\#SharedObjects");
const TCHAR * SILVERLIGHT_CACHE_DIR = _T("Microsoft\\Silverlight");

int const BROWSER_STARTED_EVENT_TIMEOUT = 60000;
int const RESULTS_PROCESSING_GRACE_PERIOD = 30000;
