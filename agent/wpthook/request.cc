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
#include "../wptdriver/wpt_test.h"

const DWORD MAX_DATA_TO_RETAIN = 10485760;  // 10MB

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request::Request(TestState& test_state, DWORD socket_id,
                  TrackSockets& sockets, TrackDns& dns, WptTest& test):
  _test_state(test_state)
  , _test(test)
  , _data_sent(0)
  ,_data_received(0)
  , _ms_start(0)
  , _ms_first_byte(0)
  , _ms_end(0)
  , _ms_connect_start(0)
  , _ms_connect_end(0)
  , _ms_ssl_start(0)
  , _ms_ssl_end(0)
  , _ms_dns_start(0)
  , _ms_dns_end(0)
  , _socket_id(socket_id)
  , _active(true)
  , _data_in(NULL)
  , _data_out(NULL)
  , _data_in_size(0)
  , _data_out_size(0)
  , _result(-1)
  , _protocol_version(-1.0)
  , _sockets(sockets)
  , _dns(dns)
  , _processed(false)
  , _headers_complete(false)
  , _body_in_allocated(false)
  , _body_in(NULL)
  , _body_in_size(0) {
  QueryPerformanceCounter(&_start);
  _first_byte.QuadPart = 0;
  _end.QuadPart = 0;
  _peer_address = sockets.GetPeerAddress(socket_id);
  _is_ssl = _sockets.IsSslById(socket_id);
  InitializeCriticalSection(&cs);

  WptTrace(loglevel::kFunction, _T("[wpthook] - new request on socket %d\n"), 
            socket_id);
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
  if (_body_in_allocated && _body_in)
    free(_body_in);
  LeaveCriticalSection(&cs);
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::DataIn(const char * data, unsigned long data_len) {
  WptTrace(loglevel::kFunction, 
            _T("[wpthook] - Request::DataIn() - %d bytes\n"), data_len);

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

    // Track for BW statistics.
    _test_state._bytes_in += data_len;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::DataOut(const char * data, unsigned long data_len,
                      char * &new_buff, unsigned long &new_len) {
  WptTrace(loglevel::kFunction, 
                _T("[wpthook] - Request::DataOut() - %d bytes\n"), data_len);
  
  EnterCriticalSection(&cs);
  if (_active) {
    if (new_buff) {
      // TODO: implement support for multiple-buffer sends
    }
    // see if we need to modify any of the data on it's way out
    if (!_headers_complete && data && data_len && !new_buff) {
      CStringA headers;
      bool modified = false;
      CStringA line;
      unsigned long bytes = data_len;
      unsigned long header_len = 0;
      const char * current_data = data;
      while( !_headers_complete && bytes ) {
        if (*current_data == '\r' || *current_data == '\n') {
          if( !line.IsEmpty() ) {
            if (_test.ModifyRequestHeader(line))
              modified = true;
            if (line.GetLength()) {
              headers += line;
              headers += "\r\n";
            }
            line.Empty();
          }
          if (bytes >= 4 && !strncmp(current_data, "\r\n\r\n", 4)) {
            headers += "\r\n";
            header_len = data_len - bytes + 4;
            _headers_complete = true;
          }
        } else {
          line += *current_data;
        }
        current_data++;
        bytes--;
      }
      if (modified) {
        new_len = headers.GetLength();
        unsigned long delta = 0;
        if (header_len < data_len) {
          CString buff;
          delta = data_len - header_len;
        }
        new_len += delta;
        new_buff = (char *)malloc(new_len);
        memcpy(new_buff, (LPCSTR)headers, headers.GetLength());
        if (delta) {
          char * dest = new_buff + headers.GetLength();
          const char * src = data + header_len;
          memcpy(dest, src, delta);
        }
      }
    }

    // keep track of the data that was actually sent
    if (new_buff) {
      _data_sent += new_len;
      if (_data_sent < MAX_DATA_TO_RETAIN) {
        DataChunk chunk(new_buff, new_len);
        _data_chunks_out.AddTail(chunk);
      }
      _test_state._bytes_out += new_len;
    } else {
      _data_sent += data_len;
      if (_data_sent < MAX_DATA_TO_RETAIN) {
        DataChunk chunk(data, data_len);
        _data_chunks_out.AddTail(chunk);
      }
      _test_state._bytes_out += data_len;
    }
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::SocketClosed() {
  WptTrace(loglevel::kFunction, _T("[wpthook] - Request::SocketClosed()\n"));

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
    LONGLONG start, end, ssl_start, ssl_end;
    CString host = CA2T(GetRequestHeader("host"));
    if (_dns.Claim(host, before, start, end) && 
        start > _test_state._start.QuadPart &&
        end > _test_state._start.QuadPart) {
      _ms_dns_start = (DWORD)((start - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);
      _ms_dns_end = (DWORD)((end - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);
    }
    if (_sockets.ClaimConnect(_socket_id, before, start, end,
                              ssl_start, ssl_end) && 
        start > _test_state._start.QuadPart &&
        end > _test_state._start.QuadPart) {
      _ms_connect_start = (DWORD)((start - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);
      _ms_connect_end = (DWORD)((end - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);
      if (ssl_start > _test_state._start.QuadPart &&
          ssl_end > _test_state._start.QuadPart) {
        _ms_ssl_start = (DWORD)((ssl_start - _test_state._start.QuadPart)
                    / _test_state._ms_frequency.QuadPart);
        _ms_ssl_end = (DWORD)((ssl_end - _test_state._start.QuadPart)
                    / _test_state._ms_frequency.QuadPart);
      }
    }

    // update the overall stats
    if (!_test_state._first_byte.QuadPart && _result == 200 && 
        _first_byte.QuadPart )
      _test_state._first_byte.QuadPart = _first_byte.QuadPart;

    _test_state._requests++;
    if (_start.QuadPart <= _test_state._on_load.QuadPart) {
      _test_state._doc_bytes_in += _data_received;
      _test_state._doc_bytes_out += _data_sent;
      _test_state._doc_requests++;
    }

    if (_result >= 400 || _result < 0) {
      if (_test_state._test_result == TEST_RESULT_NO_ERROR)
        _test_state._test_result = TEST_RESULT_CONTENT_ERROR;
      else if (_test_state._test_result == TEST_RESULT_TIMEOUT)
        _test_state._test_result = TEST_RESULT_TIMEOUT_CONTENT_ERROR;
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
    // Extract the version out of the protocol.
    int version_pos = 0;
    CStringA version_string = protocol.Tokenize("/", version_pos).Trim();
    version_string = protocol.Tokenize("/", version_pos).Trim();

    if( version_string.GetLength() )
      _protocol_version = atof(version_string);
    // Extract the response code into _result.
    if (pos > -1) {
      CStringA result = line.Tokenize(" ", pos).Trim();
      if (result.GetLength())
        _result = atoi(result);
    }
  }

  DechunkResponse();
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

/*-----------------------------------------------------------------------------
  Check whether the request is a static resource.
-----------------------------------------------------------------------------*/
bool Request::IsStatic() {
  if (!_processed)
    return false;

  CString mime = GetMime().MakeLower();
  CString exp = GetResponseHeader("expires").MakeLower();
  CString cache = GetResponseHeader("cache-control").MakeLower();
  CString pragma = GetResponseHeader("pragma").MakeLower();
  CString object = _object;
  object.MakeLower();
  // TODO: Include conditions below that it is not a base page and a network request.
  if( (_result == 304 || (_result == 200 && exp != _T("0") && exp != _T("-1") &&
    !(cache.Find(_T("no-store")) > -1) && !(cache.Find(_T("no-cache")) > -1) &&
    !(pragma.Find(_T("no-cache")) > -1) && !(mime.Find(_T("/html")) > -1)	&&
    !(mime.Find(_T("/xhtml")) > -1) && (mime.Find(_T("shockwave-flash")) >= 0 ||
    object.Right(4) == _T(".swf") || mime.Find(_T("text/")) >= 0 ||
    mime.Find(_T("javascript")) >= 0 || mime.Find(_T("image/")) >= 0) ) ) ) {
      return true;
  }
  return false;
}

/*-----------------------------------------------------------------------------
  Check whether the request is gzippable.
-----------------------------------------------------------------------------*/
bool Request::IsText() {
  if (!_processed)
    return false;

  int temp_pos = 0;
  CStringA mime = GetMime().MakeLower();
  if( mime.Find("text/") >= 0 || mime.Find("javascript") >= 0
    || mime.Find("json") >= 0 || mime.Find("xml") >= 0 ) {
    return true;
  }
  return false;
}

/*-----------------------------------------------------------------------------
  Parse out the host from the headers.
-----------------------------------------------------------------------------*/
CStringA Request::GetHost() {
  CStringA host = GetRequestHeader("x-host");
  if (!host.GetLength())
    host = GetRequestHeader("host");
  return host;
}

/*-----------------------------------------------------------------------------
  Parse out the mime from the headers.
-----------------------------------------------------------------------------*/
CStringA Request::GetMime() {
  int temp_pos = 0;
  CStringA mime = GetResponseHeader("content-type").Tokenize(";", temp_pos);
  return mime;
}

/*-----------------------------------------------------------------------------
  Parse out the expires time in seconds.
-----------------------------------------------------------------------------*/
void Request::GetExpiresTime(long& age_in_seconds, bool& exp_present,
  bool& cache_control_present) {
  CStringA exp = GetResponseHeader("expires");
  exp.MakeLower();
  if( !exp.IsEmpty() )
    exp_present = true;
  CStringA cache = GetResponseHeader("cache-control");
  cache.MakeLower();
  int index = cache.Find("max-age");
  if( index > -1 ) {
    cache_control_present = true;
    // Extract the age in seconds.
    int eq = cache.Find("=", index);
    if( eq > -1 ) {
      eq++;
      CStringA str = cache.Right(cache.GetLength() - eq);
      // Strip off the ", public" etc from the string.
      int temp_pos = 0;
      CStringA age_str = str.Tokenize(",", temp_pos);
      age_in_seconds = _ttol(CA2T(age_str));
    }
  }
}


/*-----------------------------------------------------------------------------
  Get the start time of this request.
-----------------------------------------------------------------------------*/
LARGE_INTEGER Request::GetStartTime() {
  return _start;
}

/*-----------------------------------------------------------------------------
  Get the peer ip address for this request in ULONG.
-----------------------------------------------------------------------------*/
ULONG Request::GetPeerAddress() {
  return _peer_address;
}

/*-----------------------------------------------------------------------------
  Dechunk a chunked response if necessary.  Regardless, at the end the
  _data_in member will point to the response data
-----------------------------------------------------------------------------*/
void Request::DechunkResponse() {
  if (_data_in && _data_in_size) {
    const char * header_end = strstr(_data_in, "\r\n\r\n");
    if (header_end) {
      DWORD header_len = (header_end - _data_in) + 4;
      if (_data_in_size > header_len) {
        if (GetResponseHeader("transfer-encoding").Find("chunked") > -1) {
          // build a list of the data chunks before allocating the memory
          CAtlList<DataChunk> chunks;
          DWORD data_size = 0;
          char * end = _data_in + _data_in_size;
          char * data = _data_in + header_len;
          while (data < end) {
            char * data_chunk = strstr(data, "\r\n");
            if (data_chunk) {
              data_chunk += 2;
              if (data_chunk < end) {
                int chunk_len = strtoul(data, NULL, 16);
                if (chunk_len > 0 && data_chunk + chunk_len < end) {
                  DataChunk chunk(data_chunk, chunk_len, false);
                  chunks.AddTail(chunk);
                  data = data_chunk + chunk_len + 2;
                  data_size += chunk_len;
                } else {
                  break;
                }
              } else {
                break;
              }
            } else {
              break;
            }
          }
          // allocate a new buffer to hold the dechunked body
          if (data_size) {
            _body_in = (unsigned char *)malloc(data_size + 1);
            _body_in_size = data_size;
            _body_in_allocated = true;
            data = (char *)_body_in;
            POSITION pos = chunks.GetHeadPosition();
            while (pos) {
              DataChunk chunk = chunks.GetNext(pos);
              memcpy(data, chunk._data, chunk._data_len);
              data += chunk._data_len;
            }
            // NULL-terminate it for convenience for string processing
            _body_in[data_size] = NULL;
          }
        } else {
          _body_in = (unsigned char *)_data_in + header_len;
          _body_in_size = _data_in_size - header_len;
        }
      }
    }
  }
}
