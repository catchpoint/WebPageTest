#include "StdAfx.h"
#include "wpt_status.h"


WptStatus::WptStatus(HWND hMainWnd):
  _wnd(hMainWnd)
{
}


WptStatus::~WptStatus(void)
{
}

/*-----------------------------------------------------------------------------
  Set the status message (thread safe) and update the UI
-----------------------------------------------------------------------------*/
void WptStatus::Set(const TCHAR * format, ...){
	va_list args;
	va_start( args, format );

	int len = _vsctprintf( format, args ) + 1;
	if( len <= _countof(_tmp_buffer)) {
			if( _vstprintf_s( _tmp_buffer, len, format, args ) > 0 )
				_status = _tmp_buffer;
  } else {
		TCHAR * buff = (TCHAR *)malloc( len * sizeof(TCHAR) );
		if( buff )
		{
			if( _vstprintf_s( buff, len, format, args ) > 0 )
				_status = buff;

			free( buff );
		}
	}

  OutputDebugString(_status);
  PostMessage(_wnd, UWM_UPDATE_STATUS, 0, 0);
}

/*-----------------------------------------------------------------------------
  Called from the main thread to update the title
-----------------------------------------------------------------------------*/
void WptStatus::OnUpdateStatus(void){
  SendMessage(_wnd, WM_SETTEXT, 0, (LPARAM)(const TCHAR *)_status);
  InvalidateRect(_wnd, NULL, TRUE);
}

/*-----------------------------------------------------------------------------
  Called from the main thread to update the message in the UI
-----------------------------------------------------------------------------*/
void WptStatus::OnPaint(HWND window){
  PAINTSTRUCT ps;
  HDC device_context = BeginPaint(window, &ps);
  if( device_context ){
    RECT rect;
    GetClientRect(window, &rect);
    rect.left += 10;
    rect.top += 10;
    DrawText(device_context, (const TCHAR *)_status, 
      _status.GetLength(), &rect, DT_LEFT | DT_TOP);
  }
  EndPaint(window, &ps);
}