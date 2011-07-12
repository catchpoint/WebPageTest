// Copyright (c) 2009 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef BASE_KEYBOARD_CODES_H_
#define BASE_KEYBOARD_CODES_H_
#pragma once

#include "build/build_config.h"

#if defined(OS_WIN)
#include "base/keyboard_codes_win.h"
#elif defined(USE_X11) || defined(OS_MACOSX)
#include "base/keyboard_codes_posix.h"
#endif

#endif  // BASE_KEYBOARD_CODES_H_
