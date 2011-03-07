#include "StdAfx.h"
#include "results.h"
#include "shared_mem.h"

const TCHAR * PAGE_DATA_FILE = _T("_IEWPG.txt");
const TCHAR * REQUEST_DATA_FILE = _T("_IEWTR.txt");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Results::Results(void){
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
    result += "\t";
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
