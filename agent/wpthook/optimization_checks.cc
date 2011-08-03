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

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
OptimizationChecks::OptimizationChecks(Requests& requests):
  _requests(requests)
  , _cacheScore(-1)
  , _keepAliveScore(-1) {
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
