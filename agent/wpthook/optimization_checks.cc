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
#include "optimization_checks.h"
#include "shared_mem.h"
#include "requests.h"
#include "track_sockets.h"

#include "cximage/ximage.h"
#include <zlib.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
OptimizationChecks::OptimizationChecks(Requests& requests):
  _requests(requests)
  , _keepAliveScore(-1)
  , _gzipScore(-1)
  , _gzipTotal(0)
  , _gzipTarget(0)
  , _imageCompressionScore(-1)
  , _cacheScore(-1) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
OptimizationChecks::~OptimizationChecks(void) {
}

/*-----------------------------------------------------------------------------
 Perform the various native optimization checks.
-----------------------------------------------------------------------------*/
void OptimizationChecks::Check(void) {
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptimizationChecks::Check()\n"));
  CheckKeepAlive();
  CheckGzip();
  CheckImageCompression();
  CheckCacheStatic();
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

  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    if( request && request->_processed && request->_result == 200) {
      CStringA connection = request->GetResponseHeader("connection");
      connection.MakeLower();
      if( connection.Find("keep-alive") > -1 )
        request->_scores._keepAliveScore = 100;
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
          request->_scores._keepAliveScore = 100;
        else if( needed ) {
          // HTTP 1.1 default to keep-alive
          if( connection.Find("close") > -1
            || request->_protocol_version < 1.1 )
            request->_scores._keepAliveScore = 0;
          else
            request->_scores._keepAliveScore = 100;
        }
        else
          request->_scores._keepAliveScore = -1;
      }
      if( request->_scores._keepAliveScore != -1 ) {
        count++;
        total += request->_scores._keepAliveScore;
      }
    }
  }

  // average the Cache scores of all of the objects for the page
  if( count )
    _keepAliveScore = total / count;
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptChecks::CheckKeepAlive() keep-alive score: %d\n"),
    _keepAliveScore);
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

  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    if( request && request->_processed
      && request->_result == 200 && request->IsGzippable() ) {
      CStringA encoding = request->GetResponseHeader("content-encoding");
      encoding.MakeLower();
      request->_scores._gzipScore = 0;
      totalBytes += request->_data_received;
      DWORD targetRequestBytes = request->_data_received;

      // If there is gzip encoding, then we are all set.
      // Spare small (<1 packet) responses.
      if( encoding.Find("gzip") >= 0 || encoding.Find("deflate") >= 0 ) 
        request->_scores._gzipScore = 100;
      else if( request->_data_received < 1400 )
        request->_scores._gzipScore = 100;

      if( !request->_scores._gzipScore ) {
        // Strip off the headers and get only the body from data in buffer.
        char* body = request->_data_in + request->_in_header.GetLength();;
        DWORD bodyLen = request->_data_in_size - request->_in_header.GetLength();

        // Try gzipping to see how smaller it will be.
        // TODO: Check with Patrick whether the data received need/neednot
        // does/doesnot include headers.
        DWORD origSize = request->_data_received;
        DWORD origLen = bodyLen;
        DWORD headSize = request->_in_header.GetLength();
        if( origLen && body ) {
          DWORD len = compressBound(origLen);
          if( len ) {
            char* buff = (char*) malloc(len);
            if( buff ) {
              // Do the compression and check the target bytes to set for this.
              if( compress2((LPBYTE)buff, &len, (LPBYTE)body, origLen, 9)
                == Z_OK )
                targetRequestBytes = len + headSize;
              free(buff);
            }
          }
          if( targetRequestBytes >= origSize ) {
            targetRequestBytes = origSize;
            request->_scores._gzipScore = 100;
          }
        }
      }

      request->_scores._gzipTotal = request->_data_received;
      request->_scores._gzipTarget = targetRequestBytes;
      targetBytes += targetRequestBytes;
            
      if( request->_scores._gzipScore != -1 ) {
        count++;
        total += request->_scores._gzipScore;
      }
    }
  }
  _gzipTotal = totalBytes;
  _gzipTarget = targetBytes;

  // average the Cache scores of all of the objects for the page
  if( count && totalBytes )
    _gzipScore = targetBytes * 100 / totalBytes;
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptChecks::CheckGzip() gzip score: %d\n"),
    _gzipScore);
}

/*-----------------------------------------------------------------------------
  Protect against malformed images
-----------------------------------------------------------------------------*/
static bool DecodeImage(CxImage& img, uint8_t * buffer, DWORD size, DWORD imagetype)
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
  _imageCompressionScore = -1;
  int count = 0;
  int total = 0;
  DWORD totalBytes = 0;
  DWORD targetBytes = 0;
  int imgNum = 0;

  POSITION pos = _requests._requests.GetHeadPosition();
  int fileCount = 0;
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    if( request && request->_processed && request->_result == 200 ) {
      int temp_pos = 0;
      CStringA mime = request->GetResponseHeader("content-type").Tokenize(";",
        temp_pos);
      mime.MakeLower();

      // Strip off the headers and get only the body from data-in buffer.
      char* body = request->_data_in + request->_in_header.GetLength();;
      DWORD bodyLen = request->_data_in_size - request->_in_header.GetLength();
            
      // If there is response body and it is an image.
      if( mime.Find("image/") >= 0 && body && bodyLen > 0 ) {
        DWORD targetRequestBytes = bodyLen;
        DWORD size = targetRequestBytes;
        count++;
        
        CxImage img;
        // Decode the image with an exception protected function.
        if( DecodeImage(img, (uint8_t*) body, bodyLen,
          CXIMAGE_FORMAT_UNKNOWN) ) {
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
              img.SetCodecOption(8, CXIMAGE_FORMAT_JPG);
              img.SetCodecOption(16, CXIMAGE_FORMAT_JPG);
              img.SetJpegQuality(85);
              BYTE* mem = NULL;
              int32_t len = 0;
              if( img.Encode(mem, len, CXIMAGE_FORMAT_JPG) ) {
                img.FreeMemory(mem);
                targetRequestBytes = (DWORD) len < size ? (DWORD) len: size;
                // If the original was within 10%, then give 100
                // If it's less than 50% bigger then give 50
                // More than that is a fail
                double orig = bodyLen;
                double newLen = (double)len;
                double delta = orig / newLen;
                if( delta < 1.1 )
                  request->_scores._imageCompressionScore = 100;
                else if( delta < 1.5 )
                  request->_scores._imageCompressionScore = 50;
                else
                  request->_scores._imageCompressionScore = 0;
              }
            }
            break;
          default:
            request->_scores._imageCompressionScore = 0;
          }
          if( targetRequestBytes > size )
            targetRequestBytes = size;
          totalBytes += size;
          targetBytes += targetRequestBytes;
          
          request->_scores._imageCompressTotal = size;
          request->_scores._imageCompressTarget = targetRequestBytes;
        }
        total += request->_scores._imageCompressionScore;
      }
    }
  }

  _imageCompressTotal = totalBytes;
  _imageCompressTarget = targetBytes;

  // Calculate the score based on target/total.
  if( count && totalBytes )
    _imageCompressionScore = targetBytes * 100 / totalBytes;
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptChecks::CheckImageCompression() score: %d\n"),
    _imageCompressionScore);
}


/*-----------------------------------------------------------------------------
﻿  Check each static element to make sure it was cachable
-----------------------------------------------------------------------------*/
void OptimizationChecks::CheckCacheStatic()
{
  int count = 0;
  int total = 0;

  POSITION pos = _requests._requests.GetHeadPosition();
  while( pos ) {
    Request *request = _requests._requests.GetNext(pos);
    if( request && request->_processed ) {
      if(request->IsStatic()) {
          count++;
          request->_scores._cacheScore = 0;

          long age_in_seconds  = -1;
          bool exp_present, cache_control_present;
          request->GetExpiresTime(age_in_seconds, exp_present,
            cache_control_present);
          if( cache_control_present ) {
            // If age more than month give 100
            // else if more than hour, give 50
            if( age_in_seconds >= 2592000 )
              request->_scores._cacheScore = 100;
            else if( age_in_seconds >= 3600 )
              request->_scores._cacheScore = 50;
          }
          else if( exp_present && request->_result != 304)
            request->_scores._cacheScore = 100;

          // Add the score to the total.
          total += request->_scores._cacheScore;
      }
    }
  }

  // average the Cache scores of all of the objects for the page
  if( count )
    _cacheScore = total / count;
  WptTrace(loglevel::kFunction,
    _T("[wpthook] - OptimizationChecks::CheckCacheStatic() Cache score: %d\n"),
    _cacheScore);
}
