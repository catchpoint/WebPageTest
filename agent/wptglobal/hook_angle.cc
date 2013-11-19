#include "StdAfx.h"
#include "hook_angle.h"

static AngleHook *g_hook = NULL;

unsigned int __stdcall eglSwapBuffers_Hook(void * dpy, void * surface) {
  return g_hook ? g_hook->eglSwapBuffers(dpy, surface) : 0;
}

unsigned int __stdcall eglPostSubBufferNV_Hook(void * dpy, void * surface,
                   int x, int y, int width, int height) {
  return g_hook ?
      g_hook->eglPostSubBufferNV(dpy, surface, x, y, width, height) : 0;
}

typedef FARPROC (__stdcall * LPEGLGETPROCADDRESS)(const char *procname);

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
AngleHook::AngleHook(void):
  eglSwapBuffers_(NULL)
  ,eglPostSubBufferNV_(NULL)
  ,hook_(NULL) {
  paint_msg_ = RegisterWindowMessage(_T("WPT Browser Paint"));
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
AngleHook::~AngleHook(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void AngleHook::NotifyPaint(int x, int y, int width, int height) {
  x = max(x,0);
  y = max(y,0);
  height = max(height,0);
  width = max(width,0);
  PostMessage(HWND_BROADCAST, paint_msg_, MAKEWPARAM(x,y),
              MAKELPARAM(width, height));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void AngleHook::Init() {
  if (hook_ || g_hook)
    return;
  hook_ = new NCodeHookIA32();
  g_hook = this;

  // hook the static exported functions
  eglSwapBuffers_ = hook_->createHookByName("libegl.dll", "eglSwapBuffers",
                                            eglSwapBuffers_Hook);

  // Hook the not-exported functions
  HMODULE hAngle = LoadLibrary(_T("libegl.dll"));
  if (hAngle) {
    LPEGLGETPROCADDRESS eglGetProcAddress =
        (LPEGLGETPROCADDRESS)GetProcAddress(hAngle, "eglGetProcAddress");
    if (eglGetProcAddress) {
      LPEGLPOSTSUBBUFFERNV postSub =
          (LPEGLPOSTSUBBUFFERNV)eglGetProcAddress("eglPostSubBufferNV");
      if (postSub)
        eglPostSubBufferNV_ = hook_->createHook(postSub,
                                                eglPostSubBufferNV_Hook);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void AngleHook::Unload() {
  if (g_hook == this)
    g_hook = NULL;
  if (hook_)
    delete hook_;
  hook_ = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
unsigned int AngleHook::eglSwapBuffers(void * dpy, void * surface) {
  //OutputDebugStringA("eglSwapBuffers");
  unsigned int ret = 0;
  if (eglSwapBuffers_)
    ret = eglSwapBuffers_(dpy, surface);
  NotifyPaint();
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
unsigned int AngleHook::eglPostSubBufferNV(void * dpy, void * surface,
                int x, int y, int width, int height) {
  unsigned int ret = 0;
  if (eglPostSubBufferNV_)
    ret = eglPostSubBufferNV_(dpy, surface, x, y, width, height);
  // special-case the progress spinner (16x16 scaled by whatever DPI scaling)
  // and cursor (3 x height with some padding for DPI scaling)
  if ((width > 5 && width != height) || width > 32) {
    //TCHAR buff[1024];
    //wsprintf(buff, _T("eglPostSubBufferNV - %d,%d - %d x %d"), x, y, width, height);
    //OutputDebugString(buff);
    // the dimensions don't match the actual screen dimensions so don't use them
    NotifyPaint();
  }
  return ret;
}

