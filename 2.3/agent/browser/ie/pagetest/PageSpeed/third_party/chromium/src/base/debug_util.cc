// Copyright (c) 2006-2008 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/debug_util.h"

#include "base/platform_thread.h"

bool DebugUtil::suppress_dialogs_ = false;

bool DebugUtil::WaitForDebugger(int wait_seconds, bool silent) {
  for (int i = 0; i < wait_seconds * 10; ++i) {
    if (BeingDebugged()) {
      if (!silent)
        BreakDebugger();
      return true;
    }
    PlatformThread::Sleep(100);
  }
  return false;
}

const void *const *StackTrace::Addresses(size_t* count) {
  *count = count_;
  if (count_)
    return trace_;
  return NULL;
}
