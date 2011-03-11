#pragma once

class TestState;
class TrackSockets;
class TrackDns;

class DataChunk
{
public:
  DataChunk():_data(NULL),_data_len(0){}
  DataChunk(const char * data, DWORD data_len):_data(NULL),_data_len(0) {
    if (data && data_len) {
      _data_len = data_len;
      _data = (char *)malloc(data_len);
      memcpy(_data, data, data_len);
    }
  }
  DataChunk(const DataChunk& src){*this = src;}
  ~DataChunk(){}
  const DataChunk& operator =(const DataChunk& src){
    _data = src._data;
    _data_len = src._data_len;
    return src;
  }
  void Free(void) {
    if (_data)
      free(_data);
    _data = NULL;
    _data_len = 0;
  }

  char *  _data;
  DWORD   _data_len;
};

class HeaderField
{
public:
  HeaderField(){}
  HeaderField(const HeaderField& src){*this = src;}
  ~HeaderField(){}
  const HeaderField& operator=(const HeaderField& src){
    _field = src._field;
    _value = src._value;
    return src;
  }

  CStringA  _field;
  CStringA  _value;
};

typedef CAtlList<HeaderField> Fields;

class Request
{
public:
  Request(TestState& test_state, DWORD socket_id, 
          TrackSockets& sockets, TrackDns& dns);
  ~Request(void);

  void DataIn(const char * data, unsigned long data_len);
  void DataOut(const char * data, unsigned long data_len);
  void SocketClosed();
  bool Process();

  DWORD _data_sent;
  DWORD _data_received;
  DWORD _socket_id;
  bool  _processed;
  int   _document;

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

  CStringA  GetRequestHeader(CStringA header);
  CStringA  GetResponseHeader(CStringA header);

private:
  TestState&    _test_state;
  TrackSockets& _sockets;
  TrackDns&     _dns;
  LARGE_INTEGER _start;
  LARGE_INTEGER _first_byte;
  LARGE_INTEGER _end;

  CRITICAL_SECTION cs;
  bool          _active;
  Fields    _in_fields;
  Fields    _out_fields;

  // merged data chunks
  char *  _data_in;
  char *  _data_out;
  DWORD   _data_in_size;
  DWORD   _data_out_size;

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
};

