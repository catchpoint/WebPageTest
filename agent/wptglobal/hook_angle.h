#pragma once
#include "../wpthook/ncodehook/NCodeHookInstantiation.h"

typedef unsigned int(__stdcall * LPEGLSWAPBUFFERS)(void * dpy, void * surface);
typedef unsigned int(__stdcall * LPEGLPOSTSUBBUFFERNV)(void * dpy,
    void * surface, int x, int y, int width, int height);

class AngleHook {
public:
  AngleHook(void);
  ~AngleHook(void);

  void Init();
  void Unload();

  unsigned int eglSwapBuffers(void * dpy, void * surface);
  unsigned int eglPostSubBufferNV(void * dpy, void * surface,
                  int x, int y, int width, int height);

private:
  NCodeHookIA32*        hook_;
  UINT                  paint_msg_;
  LPEGLSWAPBUFFERS      eglSwapBuffers_;
  LPEGLPOSTSUBBUFFERNV  eglPostSubBufferNV_;

  void NotifyPaint(int x = 0, int y = 0, int width = 0, int height = 0);
};

