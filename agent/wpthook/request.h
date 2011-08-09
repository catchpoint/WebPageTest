/******************************************************************************
Copyright (c) 2010, Google Inc.
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

class TestState;
class TrackSockets;
class TrackDns;
class WptTest;

class DataChunk {
public:
  DataChunk():_data(NULL),_data_len(0),_allocated(false) {}
  DataChunk(const char * data, DWORD data_len, bool copy = true):
    _data(NULL),_data_len(0) {
    if (data && data_len) {
      if (copy) {
        _allocated = true;
        _data_len = data_len;
        _data = (char *)malloc(data_len);
        memcpy(_data, data, data_len);
      } else {
        _data_len = data_len;
        _data = (char *)data;
      }
    }
  }
  DataChunk(const DataChunk& src){*this = src;}
  ~DataChunk(){}
  const DataChunk& operator =(const DataChunk& src) {
    _data = src._data;
    _data_len = src._data_len;
    _allocated = src._allocated;
    return src;
  }
  void Free(void) {
    if (_data && _allocated)
      free(_data);
    _data = NULL;
    _data_len = 0;
    _allocated = false;
  }

  char *  _data;
  DWORD   _data_len;
  bool    _allocated;
};

class HeaderField {
public:
  HeaderField(){}
  HeaderField(const HeaderField& src){*this = src;}
  ~HeaderField(){}
  const HeaderField& operator=(const HeaderField& src) {
    _field = src._field;
    _value = src._value;
    return src;
  }

  CStringA  _field;
  CStringA  _value;
};

typedef CAtlList<HeaderField> Fields;

class OptimizationScores {
public:
  OptimizationScores():
    _keepAliveScore(-1)
    , _gzipScore(-1)
    , _gzipTotal(0)
    , _gzipTarget(0)
    , _imageCompressionScore(-1)
    , _imageCompressTotal(0)
    , _imageCompressTarget(0)
    , _cacheScore(-1)
  {}
  ~OptimizationScores() {}
  int _keepAliveScore;
  int _gzipScore;
  DWORD _gzipTotal;
  DWORD _gzipTarget;
  int _imageCompressionScore;
  DWORD _imageCompressTotal;
  DWORD _imageCompressTarget;
  int _cacheScore;
};

class Request {
public:
  Request(TestState& test_state, DWORD socket_id, 
          TrackSockets& sockets, TrackDns& dns, WptTest& test);
  ~Request(void);

  void DataIn(const char * data, unsigned long data_len);
  void DataOut(const char * data, unsigned long data_len,
                char * &new_buff, unsigned long &new_len);
  void SocketClosed();
  bool Process();
  bool IsStatic();
  bool IsGzippable();
  CStringA GetHost();
  void GetExpiresTime(long& age_in_seconds, bool& exp_present, bool& cache_control_present);

  DWORD _data_sent;
  DWORD _data_received;
  DWORD _socket_id;
  bool  _processed;

  // times (in ms from the test start)
  int _ms_start;
  int _ms_first_byte;
  int _ms_end;
  int _ms_connect_start;
  int _ms_connect_end;
  int _ms_dns_start;
  int _ms_dns_end;

  // header data
  CStringA  _in_header;
  CStringA  _out_header;
  CStringA  _method;
  CStringA  _object;
  int       _result;
  double       _protocol_version;

  // processed data
  unsigned char * _body_in;
  DWORD           _body_in_size;

  // Optimization score data.
  OptimizationScores _scores;

  CStringA  GetRequestHeader(CStringA header);
  CStringA  GetResponseHeader(CStringA header);

private:
  TestState&    _test_state;
  WptTest&      _test;
  TrackSockets& _sockets;
  TrackDns&     _dns;
  LARGE_INTEGER _start;
  LARGE_INTEGER _first_byte;
  LARGE_INTEGER _end;

  CRITICAL_SECTION cs;
  bool          _active;
  Fields    _in_fields;
  Fields    _out_fields;
  bool      _headers_complete;

  // merged data chunks
  char *  _data_in;
  char *  _data_out;
  DWORD   _data_in_size;
  DWORD   _data_out_size;
  bool    _body_in_allocated;

  // data transmitted in the chunks as it was transmitted
  CAtlList<DataChunk> _data_chunks_in;
  CAtlList<DataChunk> _data_chunks_out;

  void FreeChunkMem();
  void CombineChunks();
  bool FindHeader(const char * data, CStringA& header);
  void ProcessRequest();
  void ProcessResponse();
  void ExtractFields(CStringA& header, Fields& fields);
  CStringA GetHeaderValue(Fields& fields, CStringA header);
  void DechunkResponse();
};

