#include "StdAfx.h"

const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");
const TCHAR * BROWSER_STARTED_EVENT = _T("Global\\wpt_browser_started");
const TCHAR * BROWSER_DONE_EVENT = _T("Global\\wpt_browser_done");
const TCHAR * FLASH_CACHE_DIR = 
                        _T("Macromedia\\Flash Player\\#SharedObjects");
const TCHAR * SILVERLIGHT_CACHE_DIR = _T("Microsoft\\Silverlight");

const TCHAR * CHROME_NETLOG = _T("log-net-log=\"%s_netlog.txt\"");
const TCHAR * CHROME_SPDY3 = _T("enable-spdy3");
const TCHAR * CHROME_SOFTWARE_RENDER = 
    _T("disable-accelerated-compositing");
const TCHAR * CHROME_USER_AGENT =
    _T("user-agent=");
const TCHAR * CHROME_REQUIRED_OPTIONS[] = {
    _T("enable-experimental-extension-apis"),
    _T("disable-background-networking"),
    _T("no-default-browser-check"),
    _T("no-first-run"),
    _T("process-per-tab"),
    _T("new-window"),
    _T("disable-translate"),
    _T("disable-desktop-notifications"),
    _T("allow-running-insecure-content")
};
const TCHAR * CHROME_IGNORE_CERT_ERRORS =
    _T("ignore-certificate-errors");
 
const TCHAR * FIREFOX_REQUIRED_OPTIONS[] = {
    _T("-no-remote")
};
