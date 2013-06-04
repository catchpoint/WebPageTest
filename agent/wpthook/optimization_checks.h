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

#pragma once

class Requests;
class TestState;
class Request;
class TrackDns;
class WptTest;

class OptimizationChecks {
public:
  OptimizationChecks(Requests& requests, TestState& test_state, WptTest& test,
                    TrackDns& dns);
  ~OptimizationChecks(void);

  void Check(void);

  // test information
  int   _keep_alive_score;
  int   _gzip_score;
  DWORD _gzip_total;
  DWORD _gzip_target;
  int   _image_compression_score;
  DWORD _image_compress_total;
  DWORD _image_compress_target;
  int   _cache_score;
  int   _combine_score;
  int   _static_cdn_score;
  int   _progressive_jpeg_score;
  bool  _checked;
  CStringA _base_page_CDN;
    
  Requests&   _requests;
  TestState&  _test_state;
  WptTest&    _test;
  TrackDns&   _dns;

private:
  void CheckCacheStatic();
  void CheckCDN();
  void CheckCombine();
  void CheckCustomRules();
  void CheckGzip();
  void CheckImageCompression();
  void CheckKeepAlive();
  void CheckProgressiveJpeg();
  bool IsCDN(Request * request, CStringA &provider);

  bool FindJPEGMarker(BYTE * buff, DWORD len, DWORD &pos,
                      BYTE * &marker, DWORD &marker_len);

  CRITICAL_SECTION _cs_cdn;
};
