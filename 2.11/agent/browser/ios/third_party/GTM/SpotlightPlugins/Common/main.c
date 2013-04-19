//
//  main.c
//
//  Copyright 2008 Google Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License"); you may not
//  use this file except in compliance with the License.  You may obtain a copy
//  of the License at
// 
//  http://www.apache.org/licenses/LICENSE-2.0
// 
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
//  License for the specific language governing permissions and limitations under
//  the License.
//

#include <CoreFoundation/CoreFoundation.h>
#include <CoreFoundation/CFPlugInCOM.h>
#include <CoreServices/CoreServices.h>
#include "PluginID.h"

// -----------------------------------------------------------------------------
//  constants
// -----------------------------------------------------------------------------



//
// Below is the generic glue code for all plug-ins.
//
// You should not have to modify this code aside from changing
// names if you decide to change the names defined in the Info.plist
//

// -----------------------------------------------------------------------------
//  typedefs
// -----------------------------------------------------------------------------

// The import function to be implemented in GetMetadataForFile.c
Boolean GetMetadataForFile(void *thisInterface, 
                           CFMutableDictionaryRef attributes, 
                           CFStringRef contentTypeUTI, 
                           CFStringRef pathToFile);

// The layout for an instance of MetaDataImporterPlugIn 
typedef struct __MetadataImporterPluginType {
  MDImporterInterfaceStruct *conduitInterface;
  CFUUIDRef factoryID;
  UInt32 refCount;
} MetadataImporterPluginType;

// -----------------------------------------------------------------------------
//  prototypes
// -----------------------------------------------------------------------------
//  Forward declaration for the IUnknown implementation.
//

MetadataImporterPluginType* AllocMetadataImporterPluginType(CFUUIDRef inFactoryID);
void DeallocMetadataImporterPluginType(MetadataImporterPluginType *instance);
void* MetadataImporterPluginFactory(CFAllocatorRef allocator, CFUUIDRef typeID);
static ULONG MetadataImporterPluginAddRef(void *instance);
static ULONG MetadataImporterPluginRelease(void *instance);
static HRESULT MetadataImporterQueryInterface(void *instance, REFIID iid, LPVOID *ppv);
// -----------------------------------------------------------------------------
//  testInterfaceFtbl definition
// -----------------------------------------------------------------------------
//  The TestInterface function table.
//

static MDImporterInterfaceStruct testInterfaceFtbl = {
  NULL, 
  MetadataImporterQueryInterface, 
  MetadataImporterPluginAddRef, 
  MetadataImporterPluginRelease, 
  GetMetadataForFile
};


// -----------------------------------------------------------------------------
//  AllocMetadataImporterPluginType
// -----------------------------------------------------------------------------
//  Utility function that allocates a new instance.
//      You can do some initial setup for the importer here if you wish
//      like allocating globals etc...
//
MetadataImporterPluginType *AllocMetadataImporterPluginType(CFUUIDRef inFactoryID) {
  MetadataImporterPluginType *theNewInstance
    = (MetadataImporterPluginType *)malloc(sizeof(MetadataImporterPluginType));
  memset(theNewInstance, 0, sizeof(MetadataImporterPluginType));
  
  // Point to the function table
  theNewInstance->conduitInterface = &testInterfaceFtbl;
  
  // Retain and keep an open instance refcount for each factory.
  theNewInstance->factoryID = CFRetain(inFactoryID);
  CFPlugInAddInstanceForFactory(inFactoryID);
  
  // This function returns the IUnknown interface so set the refCount to one. 
  theNewInstance->refCount = 1;
  return theNewInstance;
}

// -----------------------------------------------------------------------------
//  DeallocXcodeProjectSpotlightPluginMDImporterPluginType
// -----------------------------------------------------------------------------
//  Utility function that deallocates the instance when
//  the refCount goes to zero.
//      In the current implementation importer interfaces are never deallocated
//      but implement this as this might change in the future
//
void DeallocMetadataImporterPluginType(MetadataImporterPluginType *instance) {
  CFUUIDRef theFactoryID = instance->factoryID;
  free(instance);
  if (theFactoryID) {
    CFPlugInRemoveInstanceForFactory(theFactoryID);
    CFRelease(theFactoryID);
  }
}

// -----------------------------------------------------------------------------
//  MetadataImporterQueryInterface
// -----------------------------------------------------------------------------
//  Implementation of the IUnknown QueryInterface function.
//
HRESULT MetadataImporterQueryInterface(void *instance, REFIID iid, LPVOID *ppv) {
  CFUUIDRef interfaceID = CFUUIDCreateFromUUIDBytes(kCFAllocatorDefault, iid);
  MetadataImporterPluginType *plugin = ((MetadataImporterPluginType*)instance);
  HRESULT result = E_INVALIDARG;
  if (interfaceID) {
    if (CFEqual(interfaceID, kMDImporterInterfaceID)) {
      // If the Right interface was requested, bump the ref count, 
      // set the ppv parameter equal to the instance, and
      // return good status.
      plugin->conduitInterface->AddRef(instance);
      *ppv = instance;
      result =  S_OK;
    } else {
      if (CFEqual(interfaceID, IUnknownUUID)) {
       // If the IUnknown interface was requested, same as above.
        plugin->conduitInterface->AddRef(instance);
        *ppv = instance;
        result = S_OK;
      } else {
        // Requested interface unknown, bail with error.
        *ppv = NULL;
        result = E_NOINTERFACE;
      }
    }
    CFRelease(interfaceID);
  }
  return result;
}

// -----------------------------------------------------------------------------
//  MetadataImporterPluginAddRef
// -----------------------------------------------------------------------------
//  Implementation of reference counting for this type. Whenever an interface
//  is requested, bump the refCount for the instance. NOTE: returning the
//  refcount is a convention but is not required so don't rely on it.
//
ULONG MetadataImporterPluginAddRef(void *instance) {
  MetadataImporterPluginType *plugin = ((MetadataImporterPluginType*)instance);
  plugin->refCount += 1;
  return plugin->refCount;
}

// -----------------------------------------------------------------------------
// SampleCMPluginRelease
// -----------------------------------------------------------------------------
//  When an interface is released, decrement the refCount.
//  If the refCount goes to zero, deallocate the instance.
//
ULONG MetadataImporterPluginRelease(void *instance) {
  ULONG refCount = 0;
  MetadataImporterPluginType *plugin = ((MetadataImporterPluginType*)instance);
  plugin->refCount -= 1;
  if (plugin->refCount == 0) {
    DeallocMetadataImporterPluginType(plugin);
    refCount = 0;
  } else {
    refCount = (plugin)->refCount;
  }
  return refCount;
}

// -----------------------------------------------------------------------------
//  XcodeProjectSpotlightPluginMDImporterPluginFactory
// -----------------------------------------------------------------------------
//  Implementation of the factory function for this type.
//
void *MetadataImporterPluginFactory(CFAllocatorRef allocator, CFUUIDRef typeID) {
  // If correct type is being requested, allocate an
  //instance of TestType and return the IUnknown interface.
  MetadataImporterPluginType *result = NULL;
  if (CFEqual(typeID, kMDImporterTypeID)){
    CFUUIDRef uuid = CFUUIDCreateFromString(kCFAllocatorDefault, CFSTR(PLUGIN_ID));
    result = AllocMetadataImporterPluginType(uuid);
    CFRelease(uuid);
  }
  // If the requested type is incorrect, return NULL.
  return result;
}
