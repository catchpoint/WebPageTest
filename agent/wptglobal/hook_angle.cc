#include "StdAfx.h"
#include "hook_angle.h"

static AngleHook *g_hook = NULL;

unsigned int __stdcall eglSwapBuffers_Hook(void * dpy, void * surface) {
  return g_hook ? g_hook->eglSwapBuffers(dpy, surface) :
                  0;
}

void __stdcall glViewport_Hook(int x, int y, int width, int height) {
  if (g_hook)
    g_hook->glViewport(x, y, width, height);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
AngleHook::AngleHook(void):
  eglSwapBuffers_(NULL)
  ,glViewport_(NULL)
  ,hook_(NULL) {
  paint_msg_ = RegisterWindowMessage(_T("WPT Browser Paint"));
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
AngleHook::~AngleHook(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void AngleHook::Init() {
  //OutputDebugStringA("AngleHook::Init");
  if (hook_ || g_hook)
    return;
  hook_ = new NCodeHookIA32();
  g_hook = this;
  eglSwapBuffers_ = hook_->createHookByName("libegl.dll", "eglSwapBuffers",
                                            eglSwapBuffers_Hook);
  glViewport_ = hook_->createHookByName("libegl.dll", "glViewport",
                                        glViewport_Hook);
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
  PostMessage(HWND_BROADCAST, paint_msg_, 0, 0);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void AngleHook::glViewport(int x, int y, int width, int height) {
  //char buff[1024];
  //wsprintfA(buff, "glViewport - %d,%d : %d x %d", x, y, width, height);
  //OutputDebugStringA(buff);
  if (glViewport_)
    glViewport_(x, y, width, height);
}