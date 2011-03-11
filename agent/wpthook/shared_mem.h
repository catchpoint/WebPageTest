/*-----------------------------------------------------------------------------
  Shared memory by the DLL loaded into both processes
-----------------------------------------------------------------------------*/

extern HHOOK	shared_hook_handle;
extern WCHAR  shared_results_file_base[MAX_PATH];
extern DWORD  shared_test_timeout;
extern bool   shared_test_force_on_load;
extern bool   shared_cleared_cache;
extern WCHAR  shared_frame_window[200];
extern WCHAR  shared_browser_window[200];
