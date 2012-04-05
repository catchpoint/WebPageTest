/******************************************************************************
Copyright (c) 2011, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "StdAfx.h"
#include "cdn.h"
#include "optimization_checks.h"
#include "shared_mem.h"
#include "requests.h"
#include "test_state.h"
#include "track_sockets.h"
#include "../wptdriver/wpt_test.h"

#include "cximage/ximage.h"
#include <zlib.h>
#include <regex>
#include <string>
#include <sstream>

// global_checks needs to be a global because we are passing the array index
// for each thread into the start routine so we can't also pass the pointer to
// the class instance.
// Also, there can be only one instance of global_checks anyway based on how
// the program flows.
OptimizationChecks * global_checks = NULL;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
OptimizationChecks::OptimizationChecks(Requests& requests,
                                      TestState& test_state,
                                      WptTest& test):
  _requests(requests)
  , _test_state(test_state)
  , _test(test)
  , _keep_alive_score(-1)
  , _gzip_score(-1)
  , _gzip_total(0)
  , _gzip_target(0)
  , _image_compression_score(-1)
  , _cache_score(-1)
  , _combine_score(-1)
  , _static_cdn_score(-1)
  , _checked(false) {
  InitializeCriticalSection(&_cs_cdn);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
OptimizationChecks::~OptimizationChecks(void) {
  DeleteCriticalSection(&_cs_cdn);
}

/*-----------------------------------------------------------------------------
 Perform the various native optimization checks.
-----------------------------------------------------------------------------*/
void OptimizationChecks::Check(void) {
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptimizationChecks::Check()\n"));
  // Start the dns lookups for all CDNs.
  StartCDNLookups();
  CheckKeepAlive();
  CheckGzip();
  CheckImageCompression();
  CheckCacheStatic();
  CheckCombine();
  CheckCDN();
  CheckCustomRules();
  _checked = true;

  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptimizationChecks::Check() complete\n"));
}

/*-----------------------------------------------------------------------------
﻿  Check all the connections for keep-alive and reuse.
-----------------------------------------------------------------------------*/
void OptimizationChecks::CheckKeepAlive()
{
  int count = 0;
  int total = 0;

  _requests.Lock();
  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    if (request && request->_processed && request->GetResult() == 200) {
      CStringA connection = request->GetResponseHeader("connection");
      connection.MakeLower();
      if( connection.Find("keep-alive") > -1 )
        request->_scores._keep_alive_score = 100;
      else {
        CStringA host = request->GetHost();
        bool needed = false;
        bool reused = false;
        POSITION pos2 = _requests._requests.GetHeadPosition();
        while( pos2 ) {
          Request *request2 = _requests._requests.GetNext(pos2);
          if( request != request2 && request2->_processed ) {
            CStringA host2 = request2->GetHost();
            if( host2.GetLength() && !host2.CompareNoCase(host) ) {
              needed = true;
              if( request2->_socket_id == request->_socket_id )
                reused = true;
            }
          }
        }

        if( reused )
          request->_scores._keep_alive_score = 100;
        else if( needed ) {
          // HTTP 1.1 default to keep-alive
          if (connection.Find("close") > -1 ||
              request->_response_data.GetProtocolVersion() < 1.1)
            request->_scores._keep_alive_score = 0;
          else
            request->_scores._keep_alive_score = 100;
        }
        else
          request->_scores._keep_alive_score = -1;
      }
      if( request->_scores._keep_alive_score != -1 ) {
        count++;
        total += request->_scores._keep_alive_score;
      }
    }
  }
  _requests.Unlock();


  // average the Cache scores of all of the objects for the page
  if( count )
    _keep_alive_score = total / count;
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptChecks::CheckKeepAlive() keep-alive score: %d\n"),
    _keep_alive_score);
}

/*-----------------------------------------------------------------------------
﻿  Check whether the gzip compression is used.
-----------------------------------------------------------------------------*/
void OptimizationChecks::CheckGzip()
{
  int count = 0;
  int total = 0;
  DWORD totalBytes = 0;
  DWORD targetBytes = 0;

  _requests.Lock();
  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    if (request && request->_processed &&
        request->GetResult() == 200 && request->IsText()) {
      CStringA encoding = request->GetResponseHeader("content-encoding");
      encoding.MakeLower();
      request->_scores._gzip_score = 0;
      DWORD numRequestBytes = request->_response_data.GetDataSize();
      totalBytes += numRequestBytes;
      DWORD targetRequestBytes = numRequestBytes;

      // If there is gzip encoding, then we are all set.
      // Spare small (<1 packet) responses.
      if( encoding.Find("gzip") >= 0 || encoding.Find("deflate") >= 0 ) 
        request->_scores._gzip_score = 100;
      else if (numRequestBytes < 1400)
        request->_scores._gzip_score = 100;

      if( !request->_scores._gzip_score ) {
        // Try gzipping to see how smaller it will be.
        DWORD origSize = numRequestBytes;
        DataChunk body = request->_response_data.GetBody();
        LPBYTE bodyData = (LPBYTE)body.GetData();
        DWORD bodyLen = body.GetLength();
        DWORD headSize = request->_response_data.GetHeaders().GetLength();
        if (bodyLen && bodyData) {
          DWORD len = compressBound(bodyLen);
          if( len ) {
            char* buff = (char*) malloc(len);
            if( buff ) {
              // Do the compression and check the target bytes to set for this.
              if (compress2((LPBYTE)buff, &len, bodyData, bodyLen, 9) == Z_OK)
                targetRequestBytes = len + headSize;
              free(buff);
            }
          }
          if( targetRequestBytes >= origSize ) {
            targetRequestBytes = origSize;
            request->_scores._gzip_score = 100;
          }
        }
      }

      request->_scores._gzip_total = numRequestBytes;
      request->_scores._gzip_target = targetRequestBytes;
      targetBytes += targetRequestBytes;
            
      if( request->_scores._gzip_score != -1 ) {
        count++;
        total += request->_scores._gzip_score;
      }
    }
  }
  _requests.Unlock();

  _gzip_total = totalBytes;
  _gzip_target = targetBytes;

  // average the Cache scores of all of the objects for the page
  if( count && totalBytes )
    _gzip_score = targetBytes * 100 / totalBytes;
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptChecks::CheckGzip() gzip score: %d\n"),
    _gzip_score);
}

/*-----------------------------------------------------------------------------
  Protect against malformed images
-----------------------------------------------------------------------------*/
static bool DecodeImage(CxImage& img, BYTE * buffer, DWORD size, DWORD imagetype)
{
  bool ret = false;
  
  __try{
    ret = img.Decode(buffer, size, imagetype);
  }__except(1){
    WptTrace(loglevel::kError,
      _T("[wpthook] - Exception when decoding image"));
  }
  return ret;
}

/*-----------------------------------------------------------------------------
﻿  Check whether the image compression is used well.
-----------------------------------------------------------------------------*/
void OptimizationChecks::CheckImageCompression()
{
  _image_compression_score = -1;
  int count = 0;
  int total = 0;
  DWORD totalBytes = 0;
  DWORD targetBytes = 0;
  int imgNum = 0;

  _requests.Lock();
  POSITION pos = _requests._requests.GetHeadPosition();
  int fileCount = 0;
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    if (request && request->_processed && request->GetResult() == 200) {
      int temp_pos = 0;
      CStringA mime = request->GetResponseHeader("content-type").Tokenize(";",
        temp_pos);
      mime.MakeLower();

      // If there is response body and it is an image.
      DataChunk body = request->_response_data.GetBody();
      if (mime.Find("image/") >= 0 && body.GetData() && body.GetLength() > 0 ) {
        DWORD targetRequestBytes = body.GetLength();
        DWORD size = targetRequestBytes;
        count++;
        
        CxImage img;
        // Decode the image with an exception protected function.
        if (DecodeImage(img, (BYTE*)body.GetData(),
                        body.GetLength(), CXIMAGE_FORMAT_UNKNOWN) ) {
          DWORD type = img.GetType();
          switch( type )
          {
          // TODO: Add appropriate scores for gif and png once they are available.
          // Currently, even DecodeImage doesn't support gif and png.
          // case CXIMAGE_FORMAT_GIF:
          // case CXIMAGE_FORMAT_PNG:
          //  request->_scores._imageCompressionScore = 100;
          //  break;
          case CXIMAGE_FORMAT_JPG:
            {
              img.SetCodecOption(8, CXIMAGE_FORMAT_JPG);  // optimized encoding
              img.SetCodecOption(16, CXIMAGE_FORMAT_JPG); // progressive
              img.SetJpegQuality(85);
              BYTE* mem = NULL;
              int len = 0;
              if( img.Encode(mem, len, CXIMAGE_FORMAT_JPG) && len ) {
                img.FreeMemory(mem);
                targetRequestBytes = (DWORD) len < size ? (DWORD)len: size;
              }
            }
            break;
          default:
            request->_scores._image_compression_score = 0;
          }
          if( targetRequestBytes > size )
            targetRequestBytes = size;
          totalBytes += size;
          targetBytes += targetRequestBytes;
          
          request->_scores._image_compress_total = size;
          request->_scores._image_compress_target = targetRequestBytes;
          request->_scores._image_compression_score = 100;

          // If the original was within 10%, then give 100
          // If it's less than 50% bigger then give 50
          // More than that is a fail
          if (targetRequestBytes && targetRequestBytes < size && size > 1400) {
            double ratio = (double)size / (double)targetRequestBytes;
            if (ratio >= 1.5)
              request->_scores._image_compression_score = 0;
            else if (ratio >= 1.1)
              request->_scores._image_compression_score = 50;
          }
        }
        total += request->_scores._image_compression_score;
      }
    }
  }
  _requests.Unlock();


  _image_compress_total = totalBytes;
  _image_compress_target = targetBytes;

  // Calculate the score based on target/total.
  if( count && totalBytes )
    _image_compression_score = targetBytes * 100 / totalBytes;
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptChecks::CheckImageCompression() score: %d\n"),
    _image_compression_score);
}


/*-----------------------------------------------------------------------------
﻿  Check each static element to make sure it was cachable
-----------------------------------------------------------------------------*/
void OptimizationChecks::CheckCacheStatic()
{
  int count = 0;
  int total = 0;

  _requests.Lock();
  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    bool expiration_set;
    int seconds_remaining;
    if( request && request->_processed && 
      request->GetExpiresRemaining(expiration_set, seconds_remaining)) {
      CString mime = request->GetMime().MakeLower();
      if (mime.Find(_T("/cache-manifest")) == -1) {
        count++;
        request->_scores._cache_score = 0;

        request->_scores._cache_time_secs = seconds_remaining;
        if( expiration_set ) {
          // If age more than 7 days give 100
          // else if more than hour, give 50
          if( seconds_remaining >= 604800 )
            request->_scores._cache_score = 100;
          else if( seconds_remaining >= 3600 )
            request->_scores._cache_score = 50;
        }

        // Add the score to the total.
        total += request->_scores._cache_score;
      }
    }
  }
  _requests.Unlock();


  // average the Cache scores of all of the objects for the page
  if( count )
    _cache_score = total / count;
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptimizationChecks::CheckCacheStatic() Cache score: %d\n"),
    _cache_score);
}


/*-----------------------------------------------------------------------------
﻿  Check to make sure CSS and JS files are combined (atleast into top-level
  domain).
-----------------------------------------------------------------------------*/
void OptimizationChecks::CheckCombine() {
  // Default to 100 as "no applicable objects" is a success
  _combine_score = 100;
  int count = 0;
  int total = 0;
  int js_redundant_count = 0;
  int css_redundant_count = 0;

  _requests.Lock();
  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    // We consider only static results that come before start render.
    if (request && request->_processed && request->GetResult() == 200 &&
        (request->GetStartTime().QuadPart <= 
         _test_state._render_start.QuadPart) &&
        request->IsStatic()) {
      CStringA  mime = request->GetMime().MakeLower();;
      // Consider only css and js.
      if( mime.Find("/css") < 0 && mime.Find("javascript") < 0 )
        continue;

      // Check if there is any combinable/redundant request for similar mime
      // content.
      int combinable_requests = 0;
      POSITION pos2 = _requests._requests.GetHeadPosition();
      while( pos2 ) {
        Request *request2 = _requests._requests.GetNext(pos2);
        if( request2 && request != request2 && request2->IsStatic()
          && request2->GetStartTime().QuadPart
          <= _test_state._render_start.QuadPart ) {
          CStringA mime2 = request2->GetMime().MakeLower();
          // If it has the same mime, then count as combinable.
          if( mime2 == mime )
            combinable_requests++;
        }
      }
      // There is an applicable request.
      count++;
      if( combinable_requests <= 0 )
        request->_scores._combine_score = 100;
      else {
        request->_scores._combine_score = 0;
        if( mime.Find("/css") >= 0 )
          css_redundant_count++;
        else if( mime.Find("javascript") >= 0 )
          js_redundant_count++;
      }
      total += request->_scores._combine_score;
    }
  }
  _requests.Unlock();

  // average the Combine scores of all of the objects for the page
  if( count ) {
    // For each redundant resource, reduce 10 for js and 5 for css.
    _combine_score = max(100 - js_redundant_count * 10 - css_redundant_count * 5,
      0);
  }

  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptimizationChecks::CheckCombine() combine score: %d\n"),
    _combine_score);
}

/*-----------------------------------------------------------------------------
﻿  Make sure all static content is served from a CDN and that only one CDN is
  used for all content.
-----------------------------------------------------------------------------*/
void OptimizationChecks::CheckCDN() {
  _static_cdn_score = -1;
  int count = 0;
  int total = 0;
  CAtlArray<CStringA> cdnList;

  // Wait for the parallel lookup threads to complete.
  count = _h_cdn_threads.GetCount();
  if( count ) {
    WaitForMultipleObjects(count, _h_cdn_threads.GetData(), TRUE, INFINITE);
    for( int i = 0; i < count; i++ ) {
      if( _h_cdn_threads[i] )
        CloseHandle(_h_cdn_threads[i]);
    }
    _h_cdn_threads.RemoveAll();
  }
  // Clear the global_checks reference.
  global_checks = NULL;

  // Do the actual evaluation (all the host names should be looked up by now)
  count = 0;
  _requests.Lock();
  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    // We consider only static results
    if (request && request->_processed && request->GetResult() == 200 &&
        request->IsStatic() ) {
      request->_scores._static_cdn_score = 0;
      CStringA host = request->GetHost();
      host.MakeLower();
      // Get the remote ip address for this request.
      struct sockaddr_in addr;
      addr.sin_addr.S_un.S_addr = request->GetPeerAddress();
      if( IsCDN(request, request->_scores._cdn_provider) ) {
        request->_scores._static_cdn_score = 100;
        // Add it to the CDN list if we don't already have it.
        bool found = false;
        for( size_t i = 0; i < cdnList.GetCount() && !found; i++ ) {
          if( !cdnList[i].CompareNoCase(host) )
            found = true;
        }
        if( !found )
          cdnList.Add(request->GetHost());
      }
      
      count++;
      total += request->_scores._static_cdn_score;
    }
  }
  _requests.Unlock();


  // Average the CDN scores of all the objects for this page.
  if( count )
    _static_cdn_score = total/count;

  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptimizationChecks::CheckCDN() static cdn score: %d\n"),
    _static_cdn_score);
}


// Global function for the thread.
unsigned __stdcall CdnLookupThread( void* arg )
{
  if( global_checks )
    ((OptimizationChecks*)global_checks)->CdnLookupThread((DWORD)arg);
  return 0;
}


/*-----------------------------------------------------------------------------
  Kick off some background threads for the different host names to do 
  all of the DNS lookups in parallel
-----------------------------------------------------------------------------*/
void OptimizationChecks::StartCDNLookups() {
  // Clear the list of cdn dns requests.
  _cdn_requests.RemoveAll();
  
  // Build a list of host names we care about for dns lookup.
  _requests.Lock();
  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    if( request && request->_processed && request->IsStatic() ) {
      bool found = false;
      for( DWORD i = 0; i < _cdn_requests.GetCount() && !found; i++ ) {
        if( !request->GetHost().CompareNoCase(_cdn_requests[i]->GetHost()) )
          found = true;
      }
      if (!found ) {
        _cdn_requests.Add(request);
      }
    }
  }
  _requests.Unlock();
  
  // Spawn threads to do each of the lookups
  DWORD count = _cdn_requests.GetCount();
  if( count ) {
    _h_cdn_threads.RemoveAll();
    // Point the global reference to the current object.
    global_checks = this;
    for( DWORD i = 0; i < count; i++ ) {
      unsigned int addr = 0;
      // Spawn a dns lookup thread for this host.
      HANDLE hThread = (HANDLE)_beginthreadex( 0, 0, ::CdnLookupThread, 
                                                  (void *)i, 0, &addr);
      if( hThread ) {
        _h_cdn_threads.Add(hThread);
      }
    }
  }
}


/*-----------------------------------------------------------------------------
  Thread doing the actual CDN lookups
-----------------------------------------------------------------------------*/
void OptimizationChecks::CdnLookupThread(DWORD index)
{
  // Do a single lookup for the entry that is our responsibility
  if( index >= 0 && index < _cdn_requests.GetCount() ) {
    Request* request = _cdn_requests[index];
    
    // We don't care about the result right now, it will get cached for later
    CStringA provider;
    IsCDN(request, provider);
  }
}

/*-----------------------------------------------------------------------------
  See if the provided host belongs to a CDN
-----------------------------------------------------------------------------*/
bool OptimizationChecks::IsCDN(Request * request, CStringA &provider)
{
  provider.Empty();
  bool ret = false;

  CStringA host = request->GetHost();
  host.MakeLower();
  if( host.IsEmpty() )
    return ret;

  // Get the remote ip address for this request.
  struct sockaddr_in server;
  server.sin_addr.S_un.S_addr = request->GetPeerAddress();

  // First check whether the current host is already in cache.
  bool found = false;
  if( !_cdn_lookups.IsEmpty() ) {
    EnterCriticalSection(&_cs_cdn);
    POSITION pos = _cdn_lookups.GetHeadPosition();
    while( pos && !found ) {
      CDNEntry &entry = _cdn_lookups.GetNext(pos);
      if( !host.CompareNoCase(entry._name) )  {
        found = true;
        ret = entry._is_cdn;
        provider = entry._provider;
      }
    }
    LeaveCriticalSection(&_cs_cdn);
  }

  if( !found )  {
    // now check http headers for known CDNs (cheap check)
    int cdn_header_count = _countof(cdnHeaderList);
    for (int i = 0; i < cdn_header_count && !found; i++) {
      CDN_PROVIDER_HEADER * cdn_header = &cdnHeaderList[i];
      CStringA header = request->GetResponseHeader(cdn_header->response_field);
      header.MakeLower();
      CStringA pattern = cdn_header->pattern;
      pattern.MakeLower();
      if (pattern.GetLength() && header.GetLength() && 
        header.Find(pattern) >= 0) {
          found = true;
          ret = true;
          provider = cdn_header->name;
      }
    }

    if (!found) {
      // TODO: Move to getaddrinfo or atleast gethostbyname2. But since we don't
      // care about ip-address (v4 or v6), we might not need this.
      // Look it up and look at the cname entries for the host and cache it.
      hostent * dnsinfo = gethostbyname(host);
      Sleep(200);
      if( dnsinfo && !WSAGetLastError() ) {
        // Check all of the aliases
        CAtlList<CStringA> names;
        names.AddTail((LPCSTR)host);
        names.AddTail(dnsinfo->h_name);
        // Add all the aliases.
        char ** alias = dnsinfo->h_aliases;
        while( *alias ) {
          names.AddTail(*alias);
          alias++;
        }

        // Also try a reverse-lookup on the IP
        if( server.sin_addr.S_un.S_addr ) {
          DWORD addr = server.sin_addr.S_un.S_addr;
          // Reverse lookup by address.
          dnsinfo = gethostbyaddr((char *)&addr, sizeof(addr), AF_INET);
          if( dnsinfo && !WSAGetLastError() ) {
            if( dnsinfo->h_name )
              names.AddTail(dnsinfo->h_name);
          
            // Add all the aliases.
            alias = dnsinfo->h_aliases;
            while( *alias ) {
              names.AddTail(*alias);
              alias++;
            }
          }
        }

        if( !names.IsEmpty() ) {
          POSITION pos = names.GetHeadPosition();
          while( pos && !ret )  {
            CStringA name = names.GetNext(pos);
            name.MakeLower();
  
            // Use the globally defined CDN list from header file cdn.h
            CDN_PROVIDER * cdn = cdnList;
            // Iterate to check the hostname is a cdn or we reach end of list.
            while( !ret && cdn->pattern && cdn->pattern.CompareNoCase("END_MARKER"))  {
              if( name.Find(cdn->pattern) >= 0 )  {
                ret = true;
                provider = cdn->name;
              }
              cdn++;
            }
          }
        }
      }
    }

    // Add it to the list of resolved names cache.
    EnterCriticalSection(&_cs_cdn);
    CDNEntry entry;
    entry._name = host;
    entry._is_cdn = ret;
    entry._provider = provider;
    _cdn_lookups.AddHead(entry);
    LeaveCriticalSection(&_cs_cdn);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void OptimizationChecks::CheckCustomRules() {
  if (!_test._custom_rules.IsEmpty()) {
    _requests.Lock();
    POSITION pos = _requests._requests.GetHeadPosition();
    while( pos ) {
      Request *request = _requests._requests.GetNext(pos);
      DataChunk body = request->_response_data.GetBody(true);
      const char * body_data = body.GetData();
      DWORD body_len = body.GetLength();
      if (body_len && body_data) {
        POSITION rule_pos = _test._custom_rules.GetHeadPosition();
        while (rule_pos) {
          CustomRule rule = _test._custom_rules.GetNext(rule_pos);
          std::string mime = (LPCSTR)request->GetMime();
          std::tr1::regex mime_regex(CT2A(rule._mime), 
                                      std::tr1::regex_constants::icase | 
                                      std::tr1::regex_constants::ECMAScript);
          if (regex_search(mime.begin(), mime.end(), mime_regex)) {
            CustomRulesMatch match;
            match._name = rule._name;
            std::string body(body_data, body_len);
            std::tr1::regex match_regex(CT2A(rule._regex), 
                                      std::tr1::regex_constants::icase | 
                                      std::tr1::regex_constants::ECMAScript);
            const std::tr1::sregex_token_iterator end;
            std::tr1::sregex_token_iterator i(body.begin(), body.end(), 
                                              match_regex);
            while (i != end) {
              match._count++;
              if (match._value.IsEmpty()) {
                std::string match_string = *i;
                match._value = CA2T(match_string.c_str());
              }
              i++;
            }
            request->_custom_rules_matches.AddTail(match);
          }
        }
      }
    }
  }
}
