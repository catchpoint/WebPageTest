// Copyright (c) 2006-2008 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/platform_thread.h"

#include <dlfcn.h>
#include <errno.h>
#include <sched.h>

#if defined(OS_MACOSX)
#include <mach/mach.h>
#include <sys/resource.h>
#include <algorithm>
#endif

#if defined(OS_LINUX)
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>
#endif

#include "base/logging.h"
#include "base/safe_strerror_posix.h"

#if defined(OS_MACOSX)
namespace base {
void InitThreading();
}  // namespace base
#endif

static void* ThreadFunc(void* closure) {
  PlatformThread::Delegate* delegate =
      static_cast<PlatformThread::Delegate*>(closure);
  delegate->ThreadMain();
  return NULL;
}

// static
PlatformThreadId PlatformThread::CurrentId() {
  // Pthreads doesn't have the concept of a thread ID, so we have to reach down
  // into the kernel.
#if defined(OS_MACOSX)
  return mach_thread_self();
#elif defined(OS_LINUX)
  return syscall(__NR_gettid);
#elif defined(OS_FREEBSD)
  // TODO(BSD): find a better thread ID
  return reinterpret_cast<int64>(pthread_self());
#endif
}

// static
void PlatformThread::YieldCurrentThread() {
  sched_yield();
}

// static
void PlatformThread::Sleep(int duration_ms) {
  struct timespec sleep_time, remaining;

  // Contains the portion of duration_ms >= 1 sec.
  sleep_time.tv_sec = duration_ms / 1000;
  duration_ms -= sleep_time.tv_sec * 1000;

  // Contains the portion of duration_ms < 1 sec.
  sleep_time.tv_nsec = duration_ms * 1000 * 1000;  // nanoseconds.

  while (nanosleep(&sleep_time, &remaining) == -1 && errno == EINTR)
    sleep_time = remaining;
}

// Linux SetName is currently disabled, as we need to distinguish between
// helper threads (where it's ok to make this call) and the main thread
// (where making this call renames our process, causing tools like killall
// to stop working).
#if 0 && defined(OS_LINUX)
// static
void PlatformThread::SetName(const char* name) {
  // http://0pointer.de/blog/projects/name-your-threads.html

  // glibc recently added support for pthread_setname_np, but it's not
  // commonly available yet.  So test for it at runtime.
  int (*dynamic_pthread_setname_np)(pthread_t, const char*);
  *reinterpret_cast<void**>(&dynamic_pthread_setname_np) =
      dlsym(RTLD_DEFAULT, "pthread_setname_np");

  if (dynamic_pthread_setname_np) {
    // This limit comes from glibc, which gets it from the kernel
    // (TASK_COMM_LEN).
    const int kMaxNameLength = 15;
    std::string shortened_name = std::string(name).substr(0, kMaxNameLength);
    int err = dynamic_pthread_setname_np(pthread_self(),
                                         shortened_name.c_str());
    if (err < 0)
      LOG(ERROR) << "pthread_setname_np: " << safe_strerror(err);
  } else {
    // Implementing this function without glibc is simple enough.  (We
    // don't do the name length clipping as above because it will be
    // truncated by the callee (see TASK_COMM_LEN above).)
    int err = prctl(PR_SET_NAME, name);
    if (err < 0)
      PLOG(ERROR) << "prctl(PR_SET_NAME)";
  }
}
#elif defined(OS_MACOSX)
// Mac is implemented in platform_thread_mac.mm.
#else
// static
void PlatformThread::SetName(const char* name) {
  // Leave it unimplemented.

  // (This should be relatively simple to implement for the BSDs; I
  // just don't have one handy to test the code on.)
}
#endif  // defined(OS_LINUX)

namespace {

bool CreateThread(size_t stack_size, bool joinable,
                  PlatformThread::Delegate* delegate,
                  PlatformThreadHandle* thread_handle) {
#if defined(OS_MACOSX)
  base::InitThreading();
#endif  // OS_MACOSX

  bool success = false;
  pthread_attr_t attributes;
  pthread_attr_init(&attributes);

  // Pthreads are joinable by default, so only specify the detached attribute if
  // the thread should be non-joinable.
  if (!joinable) {
    pthread_attr_setdetachstate(&attributes, PTHREAD_CREATE_DETACHED);
  }

#if defined(OS_MACOSX)
  // The Mac OS X default for a pthread stack size is 512kB.
  // Libc-594.1.4/pthreads/pthread.c's pthread_attr_init uses
  // DEFAULT_STACK_SIZE for this purpose.
  //
  // 512kB isn't quite generous enough for some deeply recursive threads that
  // otherwise request the default stack size by specifying 0. Here, adopt
  // glibc's behavior as on Linux, which is to use the current stack size
  // limit (ulimit -s) as the default stack size. See
  // glibc-2.11.1/nptl/nptl-init.c's __pthread_initialize_minimal_internal. To
  // avoid setting the limit below the Mac OS X default or the minimum usable
  // stack size, these values are also considered. If any of these values
  // can't be determined, or if stack size is unlimited (ulimit -s unlimited),
  // stack_size is left at 0 to get the system default.
  //
  // Mac OS X normally only applies ulimit -s to the main thread stack. On
  // contemporary OS X and Linux systems alike, this value is generally 8MB
  // or in that neighborhood.
  if (stack_size == 0) {
    size_t default_stack_size;
    struct rlimit stack_rlimit;
    if (pthread_attr_getstacksize(&attributes, &default_stack_size) == 0 &&
        getrlimit(RLIMIT_STACK, &stack_rlimit) == 0 &&
        stack_rlimit.rlim_cur != RLIM_INFINITY) {
      stack_size = std::max(std::max(default_stack_size,
                                     static_cast<size_t>(PTHREAD_STACK_MIN)),
                            static_cast<size_t>(stack_rlimit.rlim_cur));
    }
  }
#endif  // OS_MACOSX

  if (stack_size > 0)
    pthread_attr_setstacksize(&attributes, stack_size);

  success = !pthread_create(thread_handle, &attributes, ThreadFunc, delegate);

  pthread_attr_destroy(&attributes);
  return success;
}

}  // anonymous namespace

// static
bool PlatformThread::Create(size_t stack_size, Delegate* delegate,
                            PlatformThreadHandle* thread_handle) {
  return CreateThread(stack_size, true /* joinable thread */,
                      delegate, thread_handle);
}

// static
bool PlatformThread::CreateNonJoinable(size_t stack_size, Delegate* delegate) {
  PlatformThreadHandle unused;

  bool result = CreateThread(stack_size, false /* non-joinable thread */,
                             delegate, &unused);
  return result;
}

// static
void PlatformThread::Join(PlatformThreadHandle thread_handle) {
  pthread_join(thread_handle, NULL);
}
