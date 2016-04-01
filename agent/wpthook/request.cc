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
#include "requests.h"
#include <wininet.h>
#include <zlib.h>

const DWORD MAX_DATA_TO_RETAIN = 10485760;  // 10MB
const __int64 NS100_TO_SEC = 10000000;   // convert 100ns intervals to seconds

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool DataChunk::ModifyDataOut(const WptTest& test) {
  bool is_modified = false;
  const char * data = GetData();
  unsigned long data_len = GetLength();
  if (data && data_len > 0) {
    CStringA headers;
    CStringA line;
    const char * current_data = data;
    unsigned long current_data_len = data_len;
    while(current_data_len) {
      if (*current_data == '\r' || *current_data == '\n') {
        if(!line.IsEmpty()) {
          if (test.ModifyRequestHeader(line))
            is_modified = true;
          if (line.GetLength()) {
            headers += line;
            headers += "\r\n";
          }
          line.Empty();
        }
        if (current_data_len >= 4 && !strncmp(current_data, "\r\n\r\n", 4)) {
          headers += "\r\n";
          current_data += 4;
          current_data_len -= 4;
          break;
        }
      } else {
        line += *current_data;
      }
      current_data++;
      current_data_len--;
    }
    if (is_modified) {
      DataChunk new_chunk;
      DWORD headers_len = headers.GetLength();
      DWORD new_len = headers_len + current_data_len;
      LPSTR new_data = new_chunk.AllocateLength(new_len);
      memcpy(new_data, (LPCSTR)headers, headers_len);
      if (current_data_len) {
        memcpy(new_data + headers_len, current_data, current_data_len);
      }
      *this = new_chunk;
    }
  }
  return is_modified;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void HttpData::AddChunk(DataChunk& chunk) {
  if (_data_size < MAX_DATA_TO_RETAIN) {
    chunk.CopyDataIfUnowned();
    _data_chunks.AddTail(chunk);
    _data_size += chunk.GetLength();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void HttpData::AddHeader(const char * header, const char * value) {
  _header_fields.AddTail(HeaderField(header, value));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void HttpData::AddBodyChunk(DataChunk& chunk) {
  if (_body_chunks_size < MAX_DATA_TO_RETAIN) {
    chunk.CopyDataIfUnowned();
    _body_chunks.AddTail(chunk);
    _body_chunks_size += chunk.GetLength();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA HttpData::GetHeader(CStringA field_name) {
  ExtractHeaderFields();
  CStringA value;
  POSITION pos = _header_fields.GetHeadPosition();
  while (pos && value.IsEmpty()) {
    HeaderField field = _header_fields.GetNext(pos);
    if (field.Matches(field_name))
      value = field._value;
  }
  return value;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void HttpData::CopyData() {
  if (_data == NULL && _data_size) {
    char * data = new char[_data_size + 1];  // +1 to NULL terminate
    _data = data;
    while (!_data_chunks.IsEmpty()) {
      DataChunk chunk = _data_chunks.RemoveHead();
      memcpy(data, chunk.GetData(), chunk.GetLength());
      data += chunk.GetLength();
    }
    *data = NULL;

    // Copy headers boundary (if any).
    const char * header_end = strstr(_data, "\r\n\r\n");
    if (header_end) {
      _headers.Empty();
      _headers.Append(_data, header_end - _data + 4);
    }
  }

  if (_headers.IsEmpty() && !_header_fields.IsEmpty()) {
    POSITION pos = _header_fields.GetHeadPosition();
    while (pos) {
      HeaderField field = _header_fields.GetNext(pos);
      _headers += field._field_name + ": " + field._value + "\r\n";
    }
    _headers += "\r\n";
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void HttpData::ExtractHeaderFields() {
  CopyData();
  if (!_headers.IsEmpty() && _header_fields.IsEmpty()) {
    // Process each line (except the first).
    int pos = 0;
    int line_number = 0;
    CStringA line = _headers.Tokenize("\r\n", pos);
    while (pos > 0) {
      if (line_number > 0) {
        line.Trim();
        int separator = line.Find(':', 1);
        if (separator > 0) {
          _header_fields.AddTail(
              HeaderField(line.Left(separator),
                          line.Mid(separator + 1).Trim()));
        }
      }
      line_number++;
      line = _headers.Tokenize("\r\n", pos);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void RequestData::AddHeader(const char * header, const char * value) {
  HttpData::AddHeader(header, value);
  if (!lstrcmpiA(header, ":method"))
    _method = value;
  else if (!lstrcmpiA(header, ":path"))
    _object = value;
  }

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void RequestData::ProcessRequestLine() {
  CopyData();
  if (!_headers.IsEmpty() && _method.IsEmpty()) {
    // Process the first line of the request.
    int pos = 0;
    CStringA line = _headers.Tokenize("\r\n", pos);
    if (pos > -1) {
      pos = 0;
      _method = line.Tokenize(" ", pos).Trim();
      if (pos > -1) {
        _object = line.Tokenize(" ", pos).Trim();
        // For proxy cases where the GET is a full URL, parse it into it's pieces
        if (!_object.Left(5).CompareNoCase("http:") ||
            !_object.Left(6).CompareNoCase("https:")) {
          CString scheme, host, object;
          unsigned short port = 0;
          if (ParseUrl((LPCTSTR)CA2T(_object), scheme, host, port, object)) {
            _object = object;
          }
        }
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ResponseData::AddHeader(const char * header, const char * value) {
  HttpData::AddHeader(header, value);
  if (!lstrcmpiA(header, ":status")) {
    _result = atoi(value);
    _protocol_version = 2.0;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ResponseData::ProcessStatusLine() {
  CopyData();
  if (!_headers.IsEmpty() && _result == -2) {
    // Process the first line of the response.
    int pos = 0;
    CStringA line = _headers.Tokenize("\r\n", pos);
    if (pos > -1) {
      pos = 0;
      CStringA protocol = line.Tokenize(" ", pos).Trim();
      // Extract the version out of the protocol.
      int version_pos = 0;
      CStringA version_string = protocol.Tokenize("/", version_pos).Trim();
      version_string = protocol.Tokenize("/", version_pos).Trim();

      if (version_string.GetLength()) {
        _protocol_version = atof(version_string);
      }
      // Extract the response code into _result.
      if (pos > -1) {
        CStringA result = line.Tokenize(" ", pos).Trim();
        if (result.GetLength()) {
          _result = atoi(result);
        }
      }
    }
    if (_result == -2) {
      // Avoid reprocessing the first line.
      _result = -1;
    }
  }
}

/*---------------------------------------------------------------------------
  Dechunk a chunked response if necessary.  Regardless, at the end the
  _data_in member will point to the response data
---------------------------------------------------------------------------*/
void ResponseData::Dechunk() {
  if (!_body.GetLength()) {
    CopyData();
    if (!_body_chunks.IsEmpty() && _body_chunks_size > 0) {
      char * data = _body.AllocateLength(_body_chunks_size);
      POSITION pos = _body_chunks.GetHeadPosition();
      while (pos) {
        DataChunk chunk = _body_chunks.GetNext(pos);
        memcpy(data, chunk.GetData(), chunk.GetLength());
        data += chunk.GetLength();
      }
      _body_chunks.RemoveAll();
      _body_chunks_size = 0;
    } else if (!_headers.IsEmpty()) {
      DWORD headers_len = _headers.GetLength();
      if (_data_size > headers_len && _body.GetLength() == 0) {
        if (GetHeader("transfer-encoding").Find("chunked") > -1) {
          // Build a list of the data chunks before allocating the memory.
          CAtlList<DataChunk> chunks;
          DWORD data_size = 0;
          const char * data = _data + headers_len;
          const char * end = _data + _data_size;
          while (data < end) {
            const char * data_chunk = strstr(data, "\r\n");
            if (data_chunk) {
              data_chunk += 2;
              int chunk_len = strtoul(data, NULL, 16);
              if (chunk_len > 0 && data_chunk + chunk_len < end) {
                chunks.AddTail(DataChunk(data_chunk, chunk_len));
                data = data_chunk + chunk_len + 2;
                data_size += chunk_len;
                continue;
              }
            }
            break;
          }
          // Allocate a new buffer to hold the dechunked body.
          if (data_size) {
            char * data = _body.AllocateLength(data_size);
            POSITION pos = chunks.GetHeadPosition();
            while (pos) {
              DataChunk chunk = chunks.GetNext(pos);
              memcpy(data, chunk.GetData(), chunk.GetLength());
              data += chunk.GetLength();
            }
          }
        } else {
          // Point to a substring in _data (data is not copied).
          _body = DataChunk(_data + headers_len, _data_size - headers_len);
        }
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
DataChunk ResponseData::GetBody(bool uncompress) { 
  DataChunk ret;
  Dechunk(); 
  ret = _body;
  if (uncompress && GetHeader("content-encoding").Find("gzip") >= 0) {
    LPBYTE body_data = (LPBYTE)ret.GetData();
    DWORD body_len = ret.GetLength();
    if (body_data && body_len) {
      DWORD len = body_len * 10;
      LPBYTE buff = (LPBYTE)malloc(len);
      if (buff) {
        z_stream d_stream;
        memset( &d_stream, 0, sizeof(d_stream) );
        d_stream.next_in  = body_data;
        d_stream.avail_in = body_len;
        int err = inflateInit2(&d_stream, MAX_WBITS + 16);
        if (err == Z_OK) {
          d_stream.next_out = buff;
          d_stream.avail_out = len;
          while (((err = inflate(&d_stream, Z_SYNC_FLUSH)) == Z_OK) 
                    && d_stream.avail_in) {
            len *= 2;
            buff = (LPBYTE)realloc(buff, len);
            if( !buff )
              break;
            
            d_stream.next_out = buff + d_stream.total_out;
            d_stream.avail_out = len - d_stream.total_out;
          }
        
          if (d_stream.total_out) {
            char * data = ret.AllocateLength(d_stream.total_out);
            if (data)
              memcpy(data, buff, d_stream.total_out);
          }
        
          inflateEnd(&d_stream);
        }
      
        free(buff);
      }
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request::Request(TestState& test_state, DWORD socket_id, DWORD stream_id,
                 DWORD request_id, TrackSockets& sockets, TrackDns& dns,
                 WptTest& test, bool is_spdy, Requests& requests)
  : _processed(false)
  , _socket_id(socket_id)
  , _stream_id(stream_id)
  , _request_id(request_id)
  , _is_spdy(is_spdy)
  , _was_pushed(false)
  , _ms_start(0)
  , _ms_first_byte(0)
  , _ms_end(0)
  , _ms_connect_start(0)
  , _ms_connect_end(0)
  , _ms_ssl_start(0)
  , _ms_ssl_end(0)
  , _ms_dns_start(0)
  , _ms_dns_end(0)
  , _test_state(test_state)
  , _test(test)
  , _sockets(sockets)
  , _dns(dns)
  , _is_active(true)
  , _reported(false)
  , _are_headers_complete(false)
  , _data_sent(false)
  , _from_browser(false)
  , _is_base_page(false)
  , requests_(requests)
  , _bytes_in(0)
  , _bytes_out(0)
  , _object_size(0) {
  QueryPerformanceCounter(&_start);
  _first_byte.QuadPart = 0;
  _end.QuadPart = 0;
  _connect_start.QuadPart = 0;
  _connect_end.QuadPart = 0;
  _dns_start.QuadPart = 0;
  _dns_end.QuadPart = 0;
  _ssl_start.QuadPart = 0;
  _ssl_end.QuadPart = 0;
  _peer_address = sockets.GetPeerAddress(socket_id);
  _local_port = sockets.GetLocalPort(socket_id);
  _is_ssl = _sockets.IsSslById(socket_id);
  InitializeCriticalSection(&cs);

  WptTrace(loglevel::kFunction,
           _T("[wpthook] - new request on socket %d stream %d\n"), 
           socket_id, stream_id);
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request::~Request(void) {
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::DataIn(DataChunk& chunk) {
  WptTrace(loglevel::kFunction, 
      _T("[wpthook] - Request::DataIn(len=%d)"), chunk.GetLength());

  EnterCriticalSection(&cs);
  if (_is_active) {
    QueryPerformanceCounter(&_end);
    if (!_first_byte.QuadPart)
      _first_byte.QuadPart = _end.QuadPart;
    if (!_is_spdy) {
      _bytes_in += chunk.GetLength();
      _response_data.AddChunk(chunk);
    }
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Request::ModifyDataOut(DataChunk& chunk) {
  bool is_modified = false;
  EnterCriticalSection(&cs);
  if (_is_active && !_are_headers_complete && !_is_spdy) {
    is_modified = chunk.ModifyDataOut(_test);
  }
  LeaveCriticalSection(&cs);
  WptTrace(loglevel::kFunction,
      _T("[wpthook] - Request::ModifyDataOut(len=%d) -> %d"),
      chunk.GetLength(), is_modified);
  return is_modified;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::DataOut(DataChunk& chunk) {
  WptTrace(loglevel::kFunction,
      _T("[wpthook] - Request::DataOut(len=%d)"), chunk.GetLength());

  EnterCriticalSection(&cs);
  if (!_data_sent) {
    QueryPerformanceCounter(&_start);
    _data_sent = true;
  }
  if (_is_active && !_is_spdy) {
    // Keep track of the data that was actually sent.
    unsigned long chunk_len = chunk.GetLength();
    _bytes_out += chunk_len;
    if (chunk_len > 0) {
      if (!_are_headers_complete &&
          chunk_len >= 4 && strstr(chunk.GetData(), "\r\n\r\n")) {
        _are_headers_complete = true;
      }
      _request_data.AddChunk(chunk);
    }
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::HeaderIn(const char * header, const char * value, bool pushed) {
  WptTrace(loglevel::kFunction, 
      _T("[wpthook] - Request::HeaderIn('%S', '%S')"), header, value);

  EnterCriticalSection(&cs);
  if (_is_active) {
    QueryPerformanceCounter(&_end);
    if (!_first_byte.QuadPart)
      _first_byte.QuadPart = _end.QuadPart;
    _response_data.AddHeader(header, value);
    if (pushed)
      _was_pushed = true;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::ObjectDataIn(DataChunk& chunk) {
  WptTrace(loglevel::kFunction, 
      _T("[wpthook] - Request::ObjectDataIn(len=%d)"), chunk.GetLength());

  EnterCriticalSection(&cs);
  if (_is_active) {
    QueryPerformanceCounter(&_end);
    if (!_first_byte.QuadPart)
      _first_byte.QuadPart = _end.QuadPart;
    _response_data.AddBodyChunk(chunk);
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::BytesIn(size_t len) {
  WptTrace(loglevel::kFunction, _T("[wpthook] - Request::BytesIn(%d)"), len);
  EnterCriticalSection(&cs);
  if (_is_active)
    _bytes_in += len;
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::HeaderOut(const char * header, const char * value, bool pushed) {
  WptTrace(loglevel::kFunction, 
      _T("[wpthook] - Request::HeaderOut('%S', '%S')"), header, value);

  EnterCriticalSection(&cs);
  if (!_data_sent) {
    QueryPerformanceCounter(&_start);
    _data_sent = true;
  }
  if (_is_active) {
    _request_data.AddHeader(header, value);
    if (pushed)
      _was_pushed = true;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::ObjectDataOut(DataChunk& chunk) {
  WptTrace(loglevel::kFunction,
      _T("[wpthook] - Request::ObjectDataOut(len=%d)"), chunk.GetLength());

  EnterCriticalSection(&cs);
  if (!_data_sent) {
    QueryPerformanceCounter(&_start);
    _data_sent = true;
  }
  if (_is_active) {
    _request_data.AddBodyChunk(chunk);
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::BytesOut(size_t len) {
  WptTrace(loglevel::kFunction, _T("[wpthook] - Request::BytesOut(%d)"), len);
  EnterCriticalSection(&cs);
  if (_is_active)
    _bytes_out += len;
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::SocketClosed() {
  WptTrace(loglevel::kFunction, _T("[wpthook] - Request::SocketClosed()\n"));

  EnterCriticalSection(&cs);
  if (_is_active) {
    if (!_end.QuadPart)
      QueryPerformanceCounter(&_end);
    if (!_first_byte.QuadPart)
      _first_byte.QuadPart = _end.QuadPart;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::MatchConnections() {
  EnterCriticalSection(&cs);
  if (_is_active && !_from_browser) {
    if (!_dns_start.QuadPart) {
      CString host = CA2T(GetHost(), CP_UTF8);
      _dns.Claim(host, _peer_address, _start, _dns_start, _dns_end);
    }
    if (!_connect_start.QuadPart)
      _sockets.ClaimConnect(_socket_id, _start, _connect_start, _connect_end,
                            _ssl_start, _ssl_end);
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Request::Process() {
  bool ret = false;

  EnterCriticalSection(&cs);
  if (_is_active) {
    _is_active = false;

    // calculate the times
    if (_start.QuadPart && _end.QuadPart) {
      _ms_start = _test_state.ElapsedMsFromStart(_start);
      _ms_first_byte = _test_state.ElapsedMsFromStart(_first_byte);
      _ms_end = _test_state.ElapsedMsFromStart(_end);
      ret = true;
    }

    if (_dns_start.QuadPart && _dns_end.QuadPart) {
      _ms_dns_start = _test_state.ElapsedMsFromStart(_dns_start);
      _ms_dns_end = _test_state.ElapsedMsFromStart(_dns_end);
    }
    if (_connect_start.QuadPart && _connect_end.QuadPart) {
      _ms_connect_start = _test_state.ElapsedMsFromStart(_connect_start);
      _ms_connect_end = _test_state.ElapsedMsFromStart(_connect_end);
      if (_ssl_start.QuadPart && _ssl_end.QuadPart) {
        _ms_ssl_start = _test_state.ElapsedMsFromStart(_ssl_start);
        _ms_ssl_end = _test_state.ElapsedMsFromStart(_ssl_end);
      }
    }

    _test_state._requests++;
    if (_start.QuadPart <= _test_state._on_load.QuadPart)
      _test_state._doc_requests++;
    int result = GetResult();
    if (!_test_state._first_byte.QuadPart && result == 200 && 
        _first_byte.QuadPart )
      _test_state._first_byte.QuadPart = _first_byte.QuadPart;
    if (result != 401 && (result >= 400 || result < 0)) {
      if (_test_state._test_result == TEST_RESULT_NO_ERROR)
        _test_state._test_result = TEST_RESULT_CONTENT_ERROR;
      else if (_test_state._test_result == TEST_RESULT_TIMEOUT)
        _test_state._test_result = TEST_RESULT_TIMEOUT_CONTENT_ERROR;
    }

    CStringA user_agent = GetRequestHeader("User-Agent");
    if (user_agent.GetLength())
      _test_state._user_agent = CA2T(user_agent, CP_UTF8);

    // see if we have a matching request with browser data
    CString url = _T("http://");
    if (_is_ssl)
      url = _T("https://");
    url += CA2T(GetHost(), CP_UTF8);
    url += CA2T(_request_data.GetObject(), CP_UTF8);
    if (!_from_browser) {
      BrowserRequestData data(url);
      if (requests_.GetBrowserRequest(data))
        priority_ = data.priority_;
    }
    // see if we have matching initiator data
    requests_._initiators.Lookup(url, initiator_);

    rtt_ = _sockets.GetRTT(_peer_address);
  }
  LeaveCriticalSection(&cs);

  _processed = ret;
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA Request::GetRequestHeader(CStringA field_name) {
  return _request_data.GetHeader(field_name);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA Request::GetResponseHeader(CStringA field_name) {
  return _response_data.GetHeader(field_name);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Request::HasResponseHeaders() {
  return _response_data.HasHeaders();
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
  CString object = _request_data.GetObject().MakeLower();
  int result = GetResult();
  // TODO: Include conditions below that it is not a base page and a network request.
  return (
    result == 304 ||
    (result == 200 && exp != _T("0") && exp != _T("-1") &&
     cache.Find(_T("no-store")) == -1 && cache.Find(_T("no-cache")) == -1 &&
     pragma.Find(_T("no-cache")) == -1 && mime.Find(_T("/html")) == -1 &&
     mime.Find(_T("/xhtml")) == -1 && mime.Find(_T("/cache-manifest")) == -1 &&
     (mime.Find(_T("shockwave-flash")) >= 0 || object.Right(4) == _T(".swf") ||
      mime.Find(_T("text/")) >= 0 || mime.Find(_T("javascript")) >= 0 ||
      mime.Find(_T("image/")) >= 0)));
}

/*-----------------------------------------------------------------------------
  Get the response code.
-----------------------------------------------------------------------------*/
int Request::GetResult() {
  return _response_data.GetResult();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Request::IsText() {
  if (!_processed)
    return false;

  int temp_pos = 0;
  CStringA mime = GetMime().MakeLower();
  if( mime.Find("text/") >= 0 || 
      mime.Find("javascript") >= 0 || 
      mime.Find("json") >= 0 || 
      mime.Find("xml") >= 0 ) {
    return true;
  }
  return false;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Request::IsIcon() {
  if (!_processed)
    return false;

  int temp_pos = 0;
  CStringA mime = GetMime().MakeLower();
  if( mime.Find("/ico") >= 0 || 
      mime.Find("/x-icon") >= 0 ||
      mime.Find(".icon") >= 0) {
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
  if (!host.GetLength())
    host = GetRequestHeader(":host");
  if (!host.GetLength())
    host = GetRequestHeader(":authority");
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
  See how much time is remaining for the object
  Returns false if the object is explicitly not cacheable
  (private or negative expires)
-----------------------------------------------------------------------------*/
bool Request::GetExpiresRemaining(bool& expiration_set, 
                                    int& seconds_remaining) {
  bool is_cacheable = true;
  expiration_set = false;
  seconds_remaining = 0;

  CStringA cache = GetResponseHeader("cache-control").MakeLower();
  CStringA pragma = GetResponseHeader("pragma").MakeLower();

  if (!HasResponseHeaders() ||
      cache.Find("no-store") != -1 || 
      cache.Find("no-cache") != -1 ||
      pragma.Find("no-cache") != -1) {
    is_cacheable = false;
  } else {
    CStringA date_string = GetResponseHeader("date").Trim();
    CStringA age_string = GetResponseHeader("age").Trim();
    CStringA expires_string = GetResponseHeader("expires").Trim();
    SYSTEMTIME sys_time;
    __int64 date_seconds = 0;
    if (date_string.GetLength() && 
        InternetTimeToSystemTimeA(date_string, &sys_time, 0)) {
        date_seconds = SystemTimeToSeconds(sys_time);
    }
    if (!date_seconds) {
      GetSystemTime(&sys_time);
      date_seconds = SystemTimeToSeconds(sys_time);
    }
    if (date_seconds) {
      if (expires_string.GetLength() && 
          InternetTimeToSystemTimeA(expires_string, &sys_time, 0)) {
        __int64 expires_seconds = SystemTimeToSeconds(sys_time);
        if (expires_seconds) {
          if (expires_seconds < date_seconds)
            is_cacheable = false;
          else {
            expiration_set = true;
            seconds_remaining = (int)(expires_seconds - date_seconds);
          }
        }
      }
    }
    if (is_cacheable && !expiration_set) {
      int index = cache.Find("max-age");
      if( index > -1 ) {
        int eq = cache.Find("=", index);
        if( eq > -1 ) {
          seconds_remaining = atol(cache.Mid(eq + 1).Trim());
          if (seconds_remaining) {
            expiration_set = true;
            if (age_string.GetLength()) {
              int age = atol(age_string);
              seconds_remaining -= age;
            }
          }
        }
      }
    }
  }

  return is_cacheable;
}

/*-----------------------------------------------------------------------------
  Convert a System Time into a "seconds since X" format suitable for math
-----------------------------------------------------------------------------*/
__int64 Request::SystemTimeToSeconds(SYSTEMTIME& system_time) {
  __int64 seconds = 0;
  FILETIME file_time;
  if (SystemTimeToFileTime(&system_time, &file_time)) {
    LARGE_INTEGER convert;
    convert.HighPart = file_time.dwHighDateTime;
    convert.LowPart = file_time.dwLowDateTime;
    seconds = convert.QuadPart / NS100_TO_SEC;
  }
  return seconds;
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

