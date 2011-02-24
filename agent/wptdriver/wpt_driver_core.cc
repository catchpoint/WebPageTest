#include "StdAfx.h"
#include "wpt_driver_core.h"
#include "mongoose/mongoose.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriverCore::WptDriverCore(WptStatus &status):
  _status(status)
  ,_webpagetest(_settings, _status)
  ,_test_server(_settings, _status, _hook)
  ,_exit(false)
  ,_thread_handle(NULL){
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriverCore::~WptDriverCore(void){
}

/*-----------------------------------------------------------------------------
  Stub entry point for the background work thread
-----------------------------------------------------------------------------*/
static unsigned __stdcall ThreadProc( void* arg )
{
  WptDriverCore * core = (WptDriverCore *)arg;
  if( core )
    core->WorkThread();
    
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::Start(void){
  _status.Set(_T("Starting..."));

  if( _settings.Load() ){
    // start a background thread to do all of the actual test management
    _thread_handle = (HANDLE)_beginthreadex(0, 0, ::ThreadProc, this, 0, 0);
  }else{
    _status.Set(_T("Error loading settings from wptdriver.ini"));
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::Stop(void){
  _status.Set(_T("Stopping..."));

  _exit = true;
  if( _thread_handle ){
    WaitForSingleObject(_thread_handle, EXIT_TIMEOUT);
    CloseHandle(_thread_handle);
    _thread_handle = NULL;
  }

  _status.Set(_T("Exiting..."));
}

/*-----------------------------------------------------------------------------
  Main thread for processing work
-----------------------------------------------------------------------------*/
void WptDriverCore::WorkThread(void){

  Sleep(_settings._startup_delay * SECONDS_TO_MS);

  _status.Set(_T("Starting Web Server..."));

  _test_server.Start();

  _status.Set(_T("Running..."));

  while( !_exit ){
    _status.Set(_T("Checking for work..."));

    WptTest test;
    if( _webpagetest.GetTest(test) ){
      TestData data;
      _status.Set(_T("Launching browser..."));
      WebBrowser browser(_settings, test, _status, _hook);

      // configure the internal web server with information about the test
      _test_server.SetTest(&test);
      _test_server.SetBrowser(&browser);

      // loop over all of the test runs
      for (test._run = 1; test._run <= test._runs; test._run++){
        // Run the first view test
        test._clear_cache = true;
        browser.RunAndWait();

        if( !test._fv_only ){
          // run the repeat view test
          test._clear_cache = false;
          browser.RunAndWait();
        }
      }

      _test_server.SetBrowser(NULL);
      _test_server.SetTest(NULL);

      bool uploaded = false;
      for (int count = 0; count < UPLOAD_RETRY_COUNT && !uploaded; count++ ) {
        uploaded = _webpagetest.TestDone(test, data);
        if( !uploaded )
          Sleep(UPLOAD_RETRY_DELAY * SECONDS_TO_MS);
      }
    }else{
      _status.Set(_T("Waiting for work..."));
      Sleep(_settings._polling_delay * SECONDS_TO_MS);
    }
  }

  _test_server.Stop();
}
