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

#include "StdAfx.h"
#include "request.h"
#include "test_state.h"
#include "track_sockets.h"
#include "track_dns.h"

const DWORD MAX_DATA_TO_RETAIN = 1048576;  // 1MB

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request::Request(TestState& test_state, DWORD socket_id,
                  TrackSockets& sockets, TrackDns& dns):
  _test_state(test_state)
  , _data_sent(0)
  ,_data_received(0)
  , _ms_start(0)
  , _ms_first_byte(0)
  , _ms_end(0)
  , _ms_connect_start(0)
  , _ms_connect_end(0)
  , _ms_dns_start(0)
  , _ms_dns_end(0)
  , _socket_id(socket_id)
  , _active(true)
  , _data_in(NULL)
  , _data_out(NULL)
  , _data_in_size(0)
  , _data_out_size(0)
  , _result(-1)
  , _sockets(sockets)
  , _dns(dns)
  , _processed(false) {
  QueryPerformanceCounter(&_start);
  _first_byte.QuadPart = 0;
  _end.QuadPart = 0;
  _document = _test_state._current_document;
  InitializeCriticalSection(&cs);

  ATLTRACE(_T("[wpthook] - new request on socket %d\n"), socket_id);
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request::~Request(void) {
  EnterCriticalSection(&cs);
  FreeChunkMem();
  if (_data_in)
    free(_data_in);
  if (_data_out)
    free(_data_out);
  LeaveCriticalSection(&cs);
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::DataIn(const char * data, unsigned long data_len) {
  ATLTRACE(_T("[wpthook] - Request::DataIn() - %d bytes\n"), data_len);

  EnterCriticalSection(&cs);
  if (_active) {
    QueryPerformanceCounter(&_end);
    if (!_first_byte.QuadPart)
      _first_byte.QuadPart = _end.QuadPart;

    _data_received += data_len;
    if (_data_received < MAX_DATA_TO_RETAIN) {
      DataChunk chunk(data, data_len);
      _data_chunks_in.AddTail(chunk);
    }
    if (!_document)
      _document = _test_state._current_document;

    // Track for BW statistics.
    _test_state._bytes_in += data_len;
    if (_document)
      _test_state._doc_bytes_in += data_len;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::DataOut(const char * data, unsigned long data_len) {
  ATLTRACE(_T("[wpthook] - Request::DataOut() - %d bytes\n"), data_len);
  
  EnterCriticalSection(&cs);
  if (_active) {
    _data_sent += data_len;
    if (_data_sent < MAX_DATA_TO_RETAIN) {
      DataChunk chunk(data, data_len);
      _data_chunks_out.AddTail(chunk);
    }
    if (!_document)
      _document = _test_state._current_document;
    
    // Track BW statistics.
    _test_state._bytes_out += data_len;
    if (_document)
      _test_state._doc_bytes_out += data_len;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::SocketClosed() {
  ATLTRACE(_T("[wpthook] - Request::SocketClosed()\n"));

  EnterCriticalSection(&cs);
  if (_active) {
    if (!_end.QuadPart)
      QueryPerformanceCounter(&_end);
    if (!_first_byte.QuadPart)
      _first_byte.QuadPart = _end.QuadPart;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Request::Process() {
  bool ret = false;

  EnterCriticalSection(&cs);
  if (_active) {
    _active = false;

    // calculate the times
    if (_start.QuadPart && _end.QuadPart) {
      if (_start.QuadPart > _test_state._start.QuadPart)
        _ms_start = (DWORD)((_start.QuadPart - _test_state._start.QuadPart)
                    / _test_state._ms_frequency.QuadPart);

      if (_first_byte.QuadPart > _test_state._start.QuadPart)
        _ms_first_byte = (DWORD)((_first_byte.QuadPart
                    - _test_state._start.QuadPart)
                    / _test_state._ms_frequency.QuadPart);

      if (_end.QuadPart > _test_state._start.QuadPart)
        _ms_end = (DWORD)((_end.QuadPart - _test_state._start.QuadPart)
                    / _test_state._ms_frequency.QuadPart);

      ret = true;
    }

    // process the actual data
    CombineChunks();
    FindHeader(_data_in, _in_header);
    FindHeader(_data_out, _out_header);
    ProcessRequest();
    ProcessResponse();

    // find the matching socket connect and DNS lookup (if they exist)
    LONGLONG before = _start.QuadPart;
    LONGLONG start, end;
    CString host = CA2T(GetRequestHeader("host"));
    if (_dns.Claim(host, before, start, end) && 
        start > _test_state._start.QuadPart &&
        end > _test_state._start.QuadPart) {
      _ms_dns_start = (DWORD)((start - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);
      _ms_dns_end = (DWORD)((end - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);
    }
    if (_sockets.ClaimConnect(_socket_id, before, start, end) && 
        start > _test_state._start.QuadPart &&
        end > _test_state._start.QuadPart) {
      _ms_connect_start = (DWORD)((start - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);
      _ms_connect_end = (DWORD)((end - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);
    }

    // update the overall stats
    if (!_test_state._first_byte.QuadPart && _result == 200 && 
        _first_byte.QuadPart )
      _test_state._first_byte.QuadPart = _first_byte.QuadPart;

    _test_state._requests++;
    if (_document) {
      _test_state._doc_requests++;
    }
  }
  LeaveCriticalSection(&cs);

  _processed = ret;
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::FreeChunkMem() {
  while (!_data_chunks_in.IsEmpty()) {
    DataChunk chunk = _data_chunks_in.RemoveHead();
    chunk.Free();
  }
  while (!_data_chunks_out.IsEmpty()) {
    DataChunk chunk = _data_chunks_out.RemoveHead();
    chunk.Free();
  }
}

/*-----------------------------------------------------------------------------
  Combine the individual chunks of data into contiguous memory blocks
  (null terminated for easier string processing)
-----------------------------------------------------------------------------*/
void Request::CombineChunks() {
  // incoming data
  if (!_data_in) {
    _data_in_size = 0;
    POSITION pos = _data_chunks_in.GetHeadPosition();
    while (pos) {
      DataChunk chunk = _data_chunks_in.GetNext(pos);
      _data_in_size += chunk._data_len;
    }
    if (_data_in_size) {
      _data_in = (char *)malloc(_data_in_size + 1);
      if (_data_in) {
        char * data = _data_in;
        while (!_data_chunks_in.IsEmpty()) {
          DataChunk chunk = _data_chunks_in.RemoveHead();
          memcpy(data, chunk._data, chunk._data_len);
          data += chunk._data_len;
        }
        *data = NULL;
      }
    }
  }

  // outgoing data
  if (!_data_out) {
    _data_out_size = 0;
    POSITION pos = _data_chunks_out.GetHeadPosition();
    while (pos) {
      DataChunk chunk = _data_chunks_out.GetNext(pos);
      _data_out_size += chunk._data_len;
    }
    if (_data_out_size) {
      _data_out = (char *)malloc(_data_out_size + 1);
      if (_data_out) {
        char * data = _data_out;
        while (!_data_chunks_out.IsEmpty()) {
          DataChunk chunk = _data_chunks_out.RemoveHead();
          memcpy(data, chunk._data, chunk._data_len);
          data += chunk._data_len;
        }
        *data = NULL;
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Request::FindHeader(const char * data, CStringA& header) {
  bool found = false;

  if (data) {
    const char * header_end = strstr(data, "\r\n\r\n");
    if (header_end) {
      DWORD header_len = (header_end - data) + 4;
      char * header_data = (char *)malloc(header_len + 1);
      if (header_data) {
        memcpy(header_data, data, header_len);
        header_data[header_len] = NULL; // NULL-terminate the string
        header = header_data;
        free(header_data);
      }
    }
  }

  return found;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::ProcessRequest() {
  ExtractFields(_out_header, _out_fields);

  // process the first line of the request
  int pos = 0;
  CStringA line = _out_header.Tokenize("\r\n", pos);
  if (pos > -1) {
    pos = 0;
    _method = line.Tokenize(" ", pos).Trim();
    if (pos > -1) {
      _object = line.Tokenize(" ", pos).Trim();
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::ProcessResponse() {
  ExtractFields(_in_header, _in_fields);

  // process the first line of the response
  int pos = 0;
  CStringA line = _in_header.Tokenize("\r\n", pos);
  if (pos > -1) {
    pos = 0;
    CStringA protocol = line.Tokenize(" ", pos).Trim();
    if (pos > -1) {
      CStringA result = line.Tokenize(" ", pos).Trim();
      if (result.GetLength())
        _result = atoi(result);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::ExtractFields(CStringA& header, Fields& fields) {
  // Process each line of data (skipping the first)
  int pos = 0;
  int line_number = 0;
  CStringA line = header.Tokenize("\r\n", pos);
  while (pos > 0) {
    if (line_number > 0) {
      line.Trim();
      int separator = line.Find(':');
      if (separator > 0) {
        HeaderField field;
        field._field = line.Left(separator);
        field._value = line.Mid(separator + 1).Trim();
        fields.AddTail(field);
      }
    }
    line_number++;
    line = header.Tokenize("\r\n", pos);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA Request::GetRequestHeader(CStringA header) {
  return GetHeaderValue(_out_fields, header);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA Request::GetResponseHeader(CStringA header) {
  return GetHeaderValue(_in_fields, header);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA Request::GetHeaderValue(Fields& fields, CStringA header) {
  CStringA value;
  POSITION pos = fields.GetHeadPosition();
  while (pos && value.IsEmpty()) {
    HeaderField field = fields.GetNext(pos);
    if (!field._field.CompareNoCase(header))
      value = field._value;
  }
  return value;
}
