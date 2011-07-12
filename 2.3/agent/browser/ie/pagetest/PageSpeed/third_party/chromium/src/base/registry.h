// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// All Rights Reserved.

#ifndef BASE_REGISTRY_H_
#define BASE_REGISTRY_H_
#pragma once

#include <windows.h>
#include <tchar.h>
#include <shlwapi.h>
#include <string>

// The shared file uses a bunch of header files that define types that we don't.
// To avoid changing much code from the standard version, and also to avoid
// polluting our namespace with extra types we don't want, we define these types
// here with the preprocessor and undefine them at the end of the file.
#define tchar TCHAR
#define CTP const tchar*
#define tstr std::basic_string<tchar>

// RegKey
// Utility class to read from and manipulate the registry.
// Registry vocabulary primer: a "key" is like a folder, in which there
// are "values", which are <name,data> pairs, with an associated data type.

class RegKey {
 public:
  RegKey(HKEY rootkey = NULL, CTP subkey = NULL, REGSAM access = KEY_READ);

  ~RegKey() { Close(); }

  bool Create(HKEY rootkey, CTP subkey, REGSAM access = KEY_READ);

  bool CreateWithDisposition(HKEY rootkey, CTP subkey, DWORD* disposition,
                             REGSAM access = KEY_READ);

  bool Open(HKEY rootkey, CTP subkey, REGSAM access = KEY_READ);

  // Create a subkey (or open if exists).
  bool CreateKey(CTP name, REGSAM access);

  // Open a subkey
  bool OpenKey(CTP name, REGSAM access);

  // all done, eh?
  void Close();

  // Count of the number of value extant.
  DWORD ValueCount();

  // Determine the Nth value's name.
  bool ReadName(int index, tstr* name);

  // True while the key is valid.
  bool Valid() const { return key_ != NULL; }

  // Kill key and everything that liveth below it; please be careful out there.
  bool DeleteKey(CTP name);

  // Delete a single value within the key.
  bool DeleteValue(CTP name);

  bool ValueExists(CTP name);
  bool ReadValue(CTP name, void* data, DWORD* dsize, DWORD* dtype = NULL);
  bool ReadValue(CTP name, tstr* value);
  bool ReadValueDW(CTP name, DWORD* value);  // Named to differ from tstr*

  bool WriteValue(CTP name, const void* data, DWORD dsize,
                  DWORD dtype = REG_BINARY);
  bool WriteValue(CTP name, CTP value);
  bool WriteValue(CTP name, DWORD value);

  // Start watching the key to see if any of its values have changed.
  // The key must have been opened with the KEY_NOTIFY access
  // privelege.
  bool StartWatching();

  // If StartWatching hasn't been called, always returns false.
  // Otherwise, returns true if anything under the key has changed.
  // This can't be const because the |watch_event_| may be refreshed.
  bool HasChanged();

  // Will automatically be called by destructor if not manually called
  // beforehand.  Returns true if it was watching, false otherwise.
  bool StopWatching();

  inline bool IsWatching() const { return watch_event_ != 0; }
  HANDLE watch_event() const { return watch_event_; }
  HKEY Handle() const { return key_; }

 private:
  HKEY key_;  // The registry key being iterated.
  HANDLE watch_event_;
};

// Iterates the entries found in a particular folder on the registry.
// For this application I happen to know I wont need data size larger
// than MAX_PATH, but in real life this wouldn't neccessarily be
// adequate.
class RegistryValueIterator {
 public:
  // Specify a key in construction.
  RegistryValueIterator(HKEY root_key, LPCTSTR folder_key);

  ~RegistryValueIterator();

  DWORD ValueCount() const;  // Count of the number of subkeys extant.

  bool Valid() const;  // True while the iterator is valid.

  void operator++();  // Advance to the next entry in the folder.

  // The pointers returned by these functions are statics owned by the
  // Name and Value functions.
  CTP Name() const { return name_; }
  CTP Value() const { return value_; }
  DWORD ValueSize() const { return value_size_; }
  DWORD Type() const { return type_; }

  int Index() const { return index_; }

 private:
  bool Read();   // Read in the current values.

  HKEY key_;   // The registry key being iterated.
  int index_;  // Current index of the iteration.

  // Current values.
  TCHAR name_[MAX_PATH];
  TCHAR value_[MAX_PATH];
  DWORD value_size_;
  DWORD type_;
};


class RegistryKeyIterator {
 public:
  // Specify a parent key in construction.
  RegistryKeyIterator(HKEY root_key, LPCTSTR folder_key);

  ~RegistryKeyIterator();

  DWORD SubkeyCount() const;  // Count of the number of subkeys extant.

  bool Valid() const;  // True while the iterator is valid.

  void operator++();  // Advance to the next entry in the folder.

  // The pointer returned by Name() is a static owned by the function.
  CTP Name() const { return name_; }

  int Index() const { return index_; }

 private:
  bool Read();   // Read in the current values.

  HKEY key_;   // The registry key being iterated.
  int index_;  // Current index of the iteration.

  // Current values.
  TCHAR name_[MAX_PATH];
};


// Register a COM object with the most usual properties.
bool RegisterCOMServer(const tchar* guid, const tchar* name,
                       const tchar* modulepath);
bool RegisterCOMServer(const tchar* guid, const tchar* name, HINSTANCE module);
bool UnregisterCOMServer(const tchar* guid);

// undo the local types defined above
#undef tchar
#undef CTP
#undef tstr

#endif  // BASE_REGISTRY_H_
