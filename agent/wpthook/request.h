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
class Requests;

class DataChunk {
public:
  DataChunk() { _value = new DataChunkValue(NULL, NULL, 0); }
  DataChunk(const char * unowned_data, size_t data_len) {
    _value = new DataChunkValue(unowned_data, NULL, data_len);
  }
  DataChunk(const DataChunk& src): _value(src._value) { ++_value->_ref_count; }
  ~DataChunk() { if (--_value->_ref_count == 0) delete _value; }
  const DataChunk& operator=(const DataChunk& src) {
    if (_value != src._value) {
      if (--_value->_ref_count == 0) {
        delete _value;
      }
      _value = src._value;
      ++_value->_ref_count;
    }
    return *this;
  }
  void CopyDataIfUnowned() {
    if (_value->_unowned_data) {
      size_t len = _value->_data_len;
      char *new_data = new char[len];
      memcpy(new_data, _value->_unowned_data, len);
      _value->_unowned_data = NULL;
      _value->_data = new_data;
      _value->_data_len = len;    }
  }
  char * AllocateLength(size_t len) {
    if (--_value->_ref_count == 0) {
      delete _value;
    }
    _value = new DataChunkValue(NULL, new char[len], len);
    return _value->_data;
  }
  const char * GetData() const {
    return _value->_data ? _value->_data : _value->_unowned_data;
  }
  size_t GetLength() const { return _value->_data_len; }

  bool ModifyDataOut(const WptTest& test);

private:
  class DataChunkValue {
   public:
    const char * _unowned_data;
    char *       _data;
    size_t       _data_len;
    int          _ref_count;
    DataChunkValue(const char * unowned_data, char * data, size_t data_len) :
        _unowned_data(unowned_data), _data(data), _data_len(data_len),
        _ref_count(1) {
      _unowned_data = unowned_data;
      _data = data;
      _data_len = data_len;
    }
    ~DataChunkValue() { delete [] _data; }
  };
  DataChunkValue * _value;
};

class HeaderField {
public:
  HeaderField(CStringA fn, CStringA value): _field_name(fn), _value(value) {}
  HeaderField(const HeaderField& src){*this = src;}
  ~HeaderField(){}
  const HeaderField& operator=(const HeaderField& src) {
    _field_name = src._field_name;
    _value = src._value;
    return src;
  }
  bool Matches(const CStringA& field_name) {
    return _field_name.CompareNoCase(field_name) == 0;
  }

  CStringA  _field_name;
  CStringA  _value;
};

typedef CAtlList<HeaderField> Fields;

class HttpData {
 public:
  HttpData(): _data(NULL), _data_size(0), _body_chunks_size(0) {}
  ~HttpData() { delete _data; }

  bool HasHeaders() { CopyData(); return _headers.GetLength() != 0; }
  CStringA GetHeaders() { CopyData(); return _headers; }
  size_t GetDataSize() { return _data_size; }

  void AddChunk(DataChunk& chunk);
  CStringA GetHeader(CStringA field_name);

  virtual void AddHeader(const char * header, const char * value);
  void AddBodyChunk(DataChunk& chunk);

protected:
  void CopyData();
  void ExtractHeaderFields();

  CAtlList<DataChunk> _data_chunks;
  CAtlList<DataChunk> _body_chunks;
  const char * _data;
  size_t _data_size;
  size_t _body_chunks_size;
  CStringA _headers;
  Fields _header_fields;
};

class RequestData : public HttpData {
 public:
   CStringA GetMethod() { ProcessRequestLine(); return _method; }
   CStringA GetObject() { ProcessRequestLine(); return _object; }
   virtual void AddHeader(const char * header, const char * value);

 private:
   void ProcessRequestLine();

   CStringA _method;
   CStringA _object;
};

class ResponseData : public HttpData {
 public:
  ResponseData(): HttpData(), _result(-2), _protocol_version(-1.0) {}
  virtual void AddHeader(const char * header, const char * value);

  int GetResult() { ProcessStatusLine(); return _result; }
  double GetProtocolVersion() { ProcessStatusLine(); return _protocol_version;}
  DataChunk GetBody(bool uncompress = false);
private:
  void ProcessStatusLine();
  void Dechunk();

  DataChunk _body;
  int       _result;
  double    _protocol_version;
};

class OptimizationScores {
public:
  OptimizationScores():
    _keep_alive_score(-1)
    , _gzip_score(-1)
    , _gzip_total(0)
    , _gzip_target(0)
    , _image_compression_score(-1)
    , _image_compress_total(0)
    , _image_compress_target(0)
    , _cache_score(-1)
    , _cache_time_secs(-1)
    , _combine_score(-1)
    , _static_cdn_score(-1)
    , _jpeg_scans(0)
  {}
  ~OptimizationScores() {}
  int _keep_alive_score;
  int _gzip_score;
  DWORD _gzip_total;
  DWORD _gzip_target;
  int _image_compression_score;
  DWORD _image_compress_total;
  DWORD _image_compress_target;
  int _cache_score;
  DWORD _cache_time_secs;
  int _combine_score;
  int _static_cdn_score;
  int _jpeg_scans;
  CStringA _cdn_provider;
};

class CustomRulesMatch {
public:
  CustomRulesMatch(void):_count(0){}
  CustomRulesMatch(const CustomRulesMatch& src){ *this = src; }
  ~CustomRulesMatch(void){}
  const CustomRulesMatch& operator =(const CustomRulesMatch& src) {
    _name = src._name;
    _value = src._value;
    _count = src._count;
    return src;
  }

  CString _name;
  CString _value;
  int _count;
};

class InitiatorData {
public:
  InitiatorData():request_id_(0), valid_(false){}
  InitiatorData(const InitiatorData& src){*this = src;}
  ~InitiatorData(){}
  const InitiatorData& operator=(const InitiatorData& src) {
    valid_ = src.valid_;
    url_ = src.url_;
    request_id_ = src.request_id_;
    initiator_url_ = src.initiator_url_;
    initiator_line_ = src.initiator_line_;
    initiator_column_ = src.initiator_column_;
    initiator_function_ = src.initiator_function_;
    initiator_type_ = src.initiator_type_;
    initiator_detail_ = src.initiator_detail_;
    return src;
  }

  bool valid_;
  DWORD request_id_;
  CStringA  url_;
  CStringA  initiator_url_;
  CStringA  initiator_line_;
  CStringA  initiator_column_;
  CStringA  initiator_function_;
  CStringA  initiator_type_;
  CStringA  initiator_detail_;
};

class Request {
public:
  Request(TestState& test_state, DWORD socket_id, DWORD stream_id,
          DWORD request_id, TrackSockets& sockets, TrackDns& dns,
          WptTest& test, bool is_spdy, Requests& requests,
          CString protocol);
  ~Request(void);

  void DataIn(DataChunk& chunk);
  bool ModifyDataOut(DataChunk& chunk);
  void DataOut(DataChunk& chunk);
  void SocketClosed();

  void HeaderIn(const char * header, const char * value, bool pushed);
  void ObjectDataIn(DataChunk& chunk);
  void BytesIn(size_t len);
  void HeaderOut(const char * header, const char * value, bool pushed);
  void ObjectDataOut(DataChunk& chunk);
  void BytesOut(size_t len);
  void SetPriority(int depends_on, int weight, int exclusive);

  void MatchConnections();
  bool Process();
  CStringA GetRequestHeader(CStringA header);
  CStringA GetResponseHeader(CStringA header);
  bool HasResponseHeaders();
  bool IsStatic();
  bool IsText();
  bool IsIcon();
  int GetResult();
  CStringA GetHost();
  CStringA GetMime();
  LARGE_INTEGER GetStartTime();
  bool GetExpiresRemaining(bool& expiration_set, int& seconds_remaining);
  ULONG GetPeerAddress();

  bool  _processed;
  bool  _reported;
  DWORD _socket_id;
  DWORD _stream_id;
  DWORD _request_id;
  ULONG _peer_address;
  int   _local_port;
  bool  _is_ssl;
  bool  _is_spdy;
  bool  _was_pushed;
  CString priority_;
  InitiatorData initiator_;
  int   _h2_priority_depends_on;
  int   _h2_priority_weight;
  int   _h2_priority_exclusive;
  CString _protocol;

  RequestData  _request_data;
  ResponseData _response_data;

  // Times in ms from the test start.
  int _ms_start;
  int _ms_first_byte;
  int _ms_end;
  int _ms_connect_start;
  int _ms_connect_end;
  int _ms_dns_start;
  int _ms_dns_end;
  int _ms_ssl_start;
  int _ms_ssl_end;

  bool _from_browser;
  bool _is_base_page;
  CStringA  rtt_;

  // byte counts
  DWORD _bytes_in;
  DWORD _bytes_out;
  DWORD _object_size;

  // performance counter times
  LARGE_INTEGER _start;
  LARGE_INTEGER _first_byte;
  LARGE_INTEGER _end;
  LARGE_INTEGER _connect_start;
  LARGE_INTEGER _connect_end;
  LARGE_INTEGER _dns_start;
  LARGE_INTEGER _dns_end;
  LARGE_INTEGER _ssl_start;
  LARGE_INTEGER _ssl_end;

  OptimizationScores _scores;
  CAtlList<CustomRulesMatch>  _custom_rules_matches;

private:
  TestState&    _test_state;
  WptTest&      _test;
  TrackSockets& _sockets;
  TrackDns&     _dns;
  Requests&     requests_;

  CRITICAL_SECTION cs;
  bool _is_active;
  bool _are_headers_complete;
  bool _data_sent;
  __int64 SystemTimeToSeconds(SYSTEMTIME& system_time);
};
