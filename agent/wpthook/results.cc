#include "StdAfx.h"
#include "results.h"
#include "shared_mem.h"
#include "requests.h"

const TCHAR * PAGE_DATA_FILE = _T("_IEWPG.txt");
const TCHAR * REQUEST_DATA_FILE = _T("_IEWTR.txt");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Results::Results(TestState& test_state, Requests& requests):
  _requests(requests)
  , _test_state(test_state) {
  _file_base = shared_results_file_base;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Results::~Results(void){
}

/*-----------------------------------------------------------------------------
  Reset the current test results
-----------------------------------------------------------------------------*/
void Results::Reset(void){
}

/*-----------------------------------------------------------------------------
  Save the results out to the appropriate files
-----------------------------------------------------------------------------*/
void Results::Save(void){
  SavePageData();
  SaveRequests();
}

/*-----------------------------------------------------------------------------
  Save the page-level data
-----------------------------------------------------------------------------*/
void Results::SavePageData(void){
  HANDLE file = CreateFile(_file_base + PAGE_DATA_FILE, GENERIC_WRITE, 0, 
                            NULL, OPEN_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    SetFilePointer( file, 0, 0, FILE_END );

    CStringA result;
    CStringA buff;

    // build up the string of data fileds for the page result

    // Date
    result += "\t";
    // Time
    result += "\t";
    // Event Name
    result += "\t";
    // URL
    result += "\t";
    // Load Time (ms)
    buff.Format("%d\t", _on_load_time);
    result += buff;
    // Time to First Byte (ms)
    result += "\t";
    // unused
    result += "\t";
    // Bytes Out
    result += "\t";
    // Bytes In
    result += "\t";
    // DNS Lookups
    result += "\t";
    // Connections
    result += "\t";
    // Requests
    result += "\t";
    // OK Responses
    result += "\t";
    // Redirects
    result += "\t";
    // Not Modified
    result += "\t";
    // Not Found
    result += "\t";
    // Other Responses
    result += "\t";
    // Error Code
    result += "\t";
    // Time to Start Render (ms)
    result += "\t";
    // Segments Transmitted
    result += "\t";
    // Segments Retransmitted
    result += "\t";
    // Packet Loss (out)
    result += "\t";
    // Activity Time(ms)
    buff.Format("%d\t", _activity_time);
    result += buff;
    // Descriptor
    result += "\t";
    // Lab ID
    result += "\t";
    // Dialer ID
    result += "\t";
    // Connection Type
    result += "\t";
    // Cached
    result += "\t";
    // Event URL
    result += "\t";
    // Pagetest Build
    result += "\t";
    // Measurement Type
    if (shared_test_force_on_load)
      result += "1\t";
    else
      result += "2\t";
    // Experimental
    result += "0\t";
    // Doc Complete Time (ms)
    buff.Format("%d\t", _on_load_time);
    result += buff;
    // Event GUID
    result += "\t";
    // Time to DOM Element (ms)
    result += "\t";
    // Includes Object Data
    result += "1\t";
    // Cache Score
    result += "-1\t";
    // Static CDN Score
    result += "-1\t";
    // One CDN Score
    result += "-1\t";
    // GZIP Score
    result += "-1\t";
    // Cookie Score
    result += "-1\t";
    // Keep-Alive Score
    result += "-1\t";
    // DOCTYPE Score
    result += "-1\t";
    // Minify Score
    result += "-1\t";
    // Combine Score
    result += "-1\t";
    // Bytes Out (Doc)
    result += "\t";
    // Bytes In (Doc)
    result += "\t";
    // DNS Lookups (Doc)
    result += "\t";
    // Connections (Doc)
    result += "\t";
    // Requests (Doc)
    result += "\t";
    // OK Responses (Doc)
    result += "\t";
    // Redirects (Doc)
    result += "\t";
    // Not Modified (Doc)
    result += "\t";
    // Not Found (Doc)
    result += "\t";
    // Other Responses (Doc)
    result += "\t";
    // Compression Score
    result += "-1\t";
    // Host
    result += "\t";
    // IP Address
    result += "\t";
    // ETag Score
    result += "-1\t";
    // Flagged Requests
    result += "\t";
    // Flagged Connections
    result += "\t";
    // Max Simultaneous Flagged Connections
    result += "\t";
    // Time to Base Page Complete (ms)
    result += "\t";
    // Base Page Result
    result += "\t";
    // Gzip Total Bytes
    result += "\t";
    // Gzip Savings
    result += "\t";
    // Minify Total Bytes
    result += "\t";
    // Minify Savings
    result += "\t";
    // Image Total Bytes
    result += "\t";
    // Image Savings
    result += "\t";
    // Base Page Redirects
    result += "\t";
    // Optimization Checked
    result += "0\t";
    // AFT (ms)
    result += "\t";

    result += "\r\n";

    DWORD written;
    WriteFile(file, (LPCSTR)result, result.GetLength(), &written, 0);

    CloseHandle(file);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveRequests(void) {
  HANDLE file = CreateFile(_file_base + REQUEST_DATA_FILE, GENERIC_WRITE, 0, 
                            NULL, OPEN_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    SetFilePointer( file, 0, 0, FILE_END );
    _requests.Lock();
    POSITION pos = _requests._requests.GetHeadPosition();
    int i = 0;
    while (pos) {
      Request * request = _requests._requests.GetNext(pos);
      if (request && request->Process()) {
        i++;
        SaveRequest(file, request, i);
      }
    }
    _requests.Unlock();
    CloseHandle(file);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Results::SaveRequest(HANDLE file, Request * request, int index) {
  CStringA result;
  CStringA buff;

  // Date
  result += "\t";
  // Time
  result += "\t";
  // Event Name
  result += "\t";
  // IP Address
  result += "\t";
  // Action
  result += "\t";
  // Host
  result += "\t";
  // URL
  result += "\t";
  // Response Code
  result += "200\t";
  // Time to Load (ms)
  buff.Format("%d\t", request->_ms_end - request->_ms_start);
  result += buff;
  // Time to First Byte (ms)
  buff.Format("%d\t", request->_ms_first_byte - request->_ms_start);
  result += buff;
  // Start Time (ms)
  buff.Format("%d\t", request->_ms_start);
  result += buff;
  // Bytes Out
  result += "\t";
  // Bytes In
  result += "\t";
  // Object Size
  result += "\t";
  // Cookie Size (out)
  result += "\t";
  // Cookie Count(out)
  result += "\t";
  // Expires
  result += "\t";
  // Cache Control
  result += "\t";
  // Content Type
  result += "\t";
  // Content Encoding
  result += "\t";
  // Transaction Type (3 = request - legacy reasons)
  result += "3\t";
  // Socket ID
  buff.Format("%d\t", request->_socket_id);
  result += buff;
  // Document ID
  result += "\t";
  // End Time (ms)
  buff.Format("%d\t", request->_ms_end);
  result += buff;
  // Descriptor
  result += "\t";
  // Lab ID
  result += "\t";
  // Dialer ID
  result += "\t";
  // Connection Type
  result += "\t";
  // Cached
  result += "\t";
  // Event URL
  result += "\t";
  // IEWatch Build
  result += "\t";
  // Measurement Type - (DWORD - 1 for web 1.0, 2 for web 2.0)
  result += "\t";
  // Experimental (DWORD)
  result += "\t";
  // Event GUID - (matches with Event GUID in object data) - Added in build 42
  result += "\t";
  // Sequence Number - Incremented for each record in the object data for a given page (starting at 0)
  buff.Format("%d\t", index);
  result += buff;
  // Cache Score - -1 if N/A, 0 if it failed, 50 if it was warned, 100 if it passed (signed byte). Added in build 51
  result += "-1\t";
  // Static CDN Score - -1 if N/A, 0 if it failed, 100 if it passed (signed byte). Added in build 51
  result += "-1\t";
  // GZIP Score - -1 if N/A, 0 if it failed, 100 if it passed (signed byte). Added in build 51
  result += "-1\t";
  // Cookie Score - -1 if N/A, 0 if it failed, 100 if it passed (signed byte). Added in build 51
  result += "-1\t";
  // Keep-Alive Score - -1 if N/A, 0 if it failed, 100 if it passed (signed byte). Added in build 51
  result += "-1\t";
  // DOCTYPE Score - -1 if N/A, 0 if it failed, 100 if it passed (signed byte). Added in build 51
  result += "-1\t";
  // Minify Score - -1 if N/A, 0 if it failed, 100 if it passed (signed byte). Added in build 51
  result += "-1\t";
  // Combine Score - -1 if N/A, 0 if it failed, 100 if it passed (signed byte). Added in build 51
  result += "-1\t";
  // Compression Score - -1 if N/A, 0 if it failed, 50 if it was warned, 100 if it passed (signed byte). Added in build 54
  result += "-1\t";
  // ETag Score - -1 if N/A, 0 if it failed, 100 if it passed (signed byte). Added in build 170
  result += "-1\t";
  // Flagged - Is this a flagged request (0 - no, 1 - yes) - Added in build 179
  result += "0\t";
  // Secure - Is this a secure request - https (0 - no, 1 - yes)? - Added in build 179
  result += "0\t";
  // DNS Time (ms) - Time for DNS lookup (-1 if N/A) - Added in build 179
  result += "-1\t";
  // Socket Connect time (ms) - Time for Socket connect (-1 if N/A) - Added in build 179
  result += "-1\t";
  // SSL time (ms) - Time for SSL handshake (-1 if N/A) - Added in build 179
  result += "-1\t";
  // Gzip Total Bytes - Total size of applicable resources for Gzip compression - Added in build 179
  result += "0\t";
  // Gzip Savings - Bytes saved through Gzip compression - Added in build 179
  result += "0\t";
  // Minify Total Bytes - Total size of applicable resources for Minification - Added in build 179
  result += "0\t";
  // Minify Savings - Bytes saved through Minification - Added in build 179
  result += "0\t";
  // Image Compression Total Bytes - Total size of applicable resources for image compression - Added in build 179
  result += "0\t";
  // Image Compression Savings - Bytes saved through image optimization - Added in build 179
  result += "0\t";
  // Cache Time (sec) - Time in seconds for the object to be cached (-1 if not present)
  result += "-1\t";
  // Real Start Time (ms) - This is the offset time when anything for the request started (dns lookup or socket connect) - Added in build 205
  result += "\t";
  // Full Time to Load (ms) - This is the full time for the given request, including any DNS or socket connect time - Added in build 205
  result += "\t";
  // Optimization Checked - 1 if the request was checked for optimization, 0 if not - Added in build 209
  result += "0\t";
  // CDN Provider - The CDN provider that the request was served from - Added in build 260 
  result += "\t";

  result += "\r\n";

  DWORD written;
  WriteFile(file, (LPCSTR)result, result.GetLength(), &written, 0);
}
