// Copyright (c) 2006-2009 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// A file you can include instead of <execinfo.h> if your project might need
// to run on Mac OS X 10.4.

#ifndef BASE_COMPAT_EXECINFO_H_
#define BASE_COMPAT_EXECINFO_H_
#pragma once

#include "build/build_config.h"

#if defined(OS_MACOSX)
#include <AvailabilityMacros.h>
#endif

#if defined(OS_MACOSX) && MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
// Manually define these here as weak imports, rather than including execinfo.h.
// This lets us launch on 10.4 which does not have these calls.
extern "C" {

extern int backtrace(void**, int) __attribute__((weak_import));
extern char** backtrace_symbols(void* const*, int)
    __attribute__((weak_import));
extern void backtrace_symbols_fd(void* const*, int, int)
    __attribute__((weak_import));

}  // extern "C"
#else
#include <execinfo.h>
#endif

#endif  // BASE_COMPAT_EXECINFO_H_
