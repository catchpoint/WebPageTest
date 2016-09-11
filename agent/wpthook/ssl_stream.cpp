#include "stdafx.h"
#include "request.h"
#include "track_sockets.h"
#include "ssl_stream.h"

#pragma pack(push, 1)
typedef struct SSL_HEADER_ {
  unsigned __int8 type;
  unsigned __int16 version;
  unsigned __int16 record_length;
} SSL_HEADER;

typedef struct SSL_HANDSHAKE_ {
  SSL_HEADER header;
  unsigned __int8 type;
  unsigned __int8 data_length[3]; // __int24 message length
} SSL_HANDSHAKE;

typedef struct SSL_CLIENT_HELLO_ {
  SSL_HANDSHAKE handshake;
  unsigned __int16 client_version;
  unsigned __int8  client_random[32]; // gmt_time (4) + 28 byte client random
} SSL_CLIENT_HELLO;

typedef struct SSL_SERVER_HELLO_ {
  SSL_HANDSHAKE handshake;
  unsigned __int16 server_version;
  unsigned __int8  server_random[32];
  unsigned __int8  session_id_length;
} SSL_SERVER_HELLO;

// comes after the variable-length session ID
typedef struct SSL_SERVER_HELLO_DETAIL_ {
  unsigned __int16 cipher_suite;
  unsigned __int8  compression_method;
} SSL_SERVER_HELLO_DETAIL;
#pragma pack(pop)

// SSL frame types
static const unsigned __int8 MSG_CHANGE_CIPHER_SPEC = 20; // x14
static const unsigned __int8 MSG_ALERT              = 21; // x15
static const unsigned __int8 MSG_HANDSHAKE          = 22; // x16
static const unsigned __int8 MSG_APPLICATION_DATA   = 23; // x17

// Handshake record types
static const unsigned __int8 HANDSHAKE_HELLO_REQUEST       = 0;  // x00
static const unsigned __int8 HANDSHAKE_CLIENT_HELLO        = 1;  // x01
static const unsigned __int8 HANDSHAKE_SERVER_HELLO        = 2;  // x02
static const unsigned __int8 HANDSHAKE_CERTIFICATE         = 11; // x0B
static const unsigned __int8 HANDSHAKE_SERVER_KEY_EXCHANGE = 12; // x0C
static const unsigned __int8 HANDSHAKE_CERTIFICATE_REQUEST = 13; // x0D
static const unsigned __int8 HANDSHAKE_SERVER_DONE         = 14; // x0E
static const unsigned __int8 HANDSHAKE_CERTIFICATE_VERIFY  = 15; // x0F
static const unsigned __int8 HANDSHAKE_CLIENT_KEY_EXCHANGE = 16; // x10
static const unsigned __int8 HANDSHAKE_FINISHED            = 20; // x14 

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SSLStream::SSLStream(TrackSockets &sockets, SocketInfo *socket_info, SSL_DATA_DIRECTION direction):
  message_size_(-1)
  ,message_len_(0)
  ,sockets_(sockets)
  ,socket_info_(socket_info)
  ,direction_(direction)
  ,process_data_(true) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SSLStream::~SSLStream() {
}

/*-----------------------------------------------------------------------------
  Append data to the SSL/TLS stream and handle packet framing.
-----------------------------------------------------------------------------*/
void SSLStream::Append(const DataChunk& chunk) {
  if (process_data_) {
    size_t len = chunk.GetLength();
    const char * buff = chunk.GetData();
  
    while (len && buff) {
      size_t copy_bytes = 0;

      // are we starting a new frame?
      if (message_size_ < 0) {
        // see if we can at least copy over the size of the initial frame
        size_t needed = sizeof(SSL_HEADER) - message_len_;
        copy_bytes = min(needed, len);
        if (copy_bytes) {
          memcpy(&message_[message_len_], buff, copy_bytes);
          message_len_ += (int)copy_bytes;
          len -= copy_bytes;
          buff += copy_bytes;
        }

        // see if we have a header to parse and get the actual message size
        if (message_len_ >= sizeof(SSL_HEADER)) {
          SSL_HEADER * header = (SSL_HEADER *)message_;
          message_size_ = htons(header->record_length) + sizeof(SSL_HEADER);
        }
      }

      // see if we have bytes remaining in the current message
      if (message_size_ > 0 &&
          message_len_ < message_size_ &&
          len > 0 &&
          buff) {
        copy_bytes = min(message_size_ - message_len_, (__int32)len);
        memcpy(&message_[message_len_], buff, copy_bytes);
        message_len_ += (int)copy_bytes;
        len -= copy_bytes;
        buff += copy_bytes;
      }

      // see if we have a full message
      if (message_size_ == message_len_) {
        ProcessMessage();

        // reset state for the next message
        message_size_ = -1;
        message_len_ = 0;
      }
    }
  }
}

/******************************************************************************
                            SSL/TLS Messages
******************************************************************************/

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessMessage() {
  SSL_HEADER * header = (SSL_HEADER *)message_;

  switch (header->type) {
    case MSG_CHANGE_CIPHER_SPEC: ProcessChangeCipherSpec(); break;
    case MSG_ALERT: ProcessAlert(); break;
    case MSG_HANDSHAKE: ProcessHandshake(); break;
    case MSG_APPLICATION_DATA: ProcessApplicationData(); break;
    default: {
      ATLTRACE("SSLStream: Unknown Message 0x%02X - %d bytes", header->type, message_size_);
    } break;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessHandshake() {
  if (socket_info_ && !socket_info_->_is_ssl_handshake_complete) {
    if (!socket_info_->_ssl_start.QuadPart)
      QueryPerformanceCounter(&socket_info_->_ssl_start);
    QueryPerformanceCounter(&socket_info_->_ssl_end);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessApplicationData() {
  SSL_HEADER * header = (SSL_HEADER *)message_;
  if (socket_info_ && !socket_info_->_is_ssl_handshake_complete)
    socket_info_->_is_ssl_handshake_complete = true;

  // Stop processing stream data to save memory and CPU since we don't do
  // anything more with it.
  process_data_ = false;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessChangeCipherSpec() {
  SSL_HEADER * header = (SSL_HEADER *)message_;
  if (socket_info_ && !socket_info_->_is_ssl_handshake_complete) {
    if (!socket_info_->_ssl_start.QuadPart)
      QueryPerformanceCounter(&socket_info_->_ssl_start);
    QueryPerformanceCounter(&socket_info_->_ssl_end);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessAlert() {
}
