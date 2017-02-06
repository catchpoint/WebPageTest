#include "StdAfx.h"
#include "wpt_test_driver.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTestDriver::WptTestDriver(DWORD default_timeout, bool has_gpu):
  marked_done_(false) {
  _test_timeout = default_timeout;
  _measurement_timeout = default_timeout;
  has_gpu_ = has_gpu;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTestDriver::~WptTestDriver(void) {
}

/*-----------------------------------------------------------------------------
  We are starting a new run, build up the script for the browser to execute
-----------------------------------------------------------------------------*/
bool WptTestDriver::Start() {
  bool ret = false;

  if (!_test_type.CompareNoCase(_T("traceroute"))) {
    _file_base.Format(_T("%s\\%d"), (LPCTSTR)_directory, _index);
    ret = true;
  } else {
    // build up a new script
    _script_commands.RemoveAll();
    
    if (_directory.GetLength()) {
      SetFileBase();
      g_shared->SetClearedCache(_clear_cache);
      g_shared->SetCurrentRun(_run);
      g_shared->SetCPUUtilization(0);
      g_shared->SetHasGPU(has_gpu_);
      ret = true;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptTestDriver::Load(CString& test) {
  ATLTRACE("[wptdriver] - WptTestDriver::Load");
  bool ret = WptTest::Load(test);

  if (_directory.GetLength() )
    DeleteDirectory(_directory, false);

  if (ret) {
    BuildScript();
    HANDLE file = CreateFile(_test_file, GENERIC_WRITE, 0, 0, CREATE_ALWAYS,
                              0, 0);
    if (file != INVALID_HANDLE_VALUE) {
      DWORD bytes_written = 0;
      WriteFile(file, (LPCWSTR)test, test.GetLength() * sizeof(wchar_t),
                &bytes_written, 0);
      CloseHandle(file);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptTestDriver::SetFileBase() {
  bool ret = false;
  if (_directory.GetLength() ) {
      // set up the base file name for results files for this run
    _file_base.Format(_T("%s\\%d"), (LPCTSTR)_directory, _index);
    if (!_clear_cache)
      _file_base += _T("_Cached");
    g_shared->SetResultsFileBase(_file_base);
    ret = true;
  }
  return ret;
}

