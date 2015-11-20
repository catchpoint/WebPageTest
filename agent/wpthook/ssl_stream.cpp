#include "stdafx.h"
#include "request.h"
#include "ssl_stream.h"

#pragma pack(push, 1)
typedef struct SSL_HEADER_ {
  unsigned __int8 type;
  unsigned __int16 version;
  unsigned __int16 length;
} SSL_HEADER;
#pragma pack(pop)

// SSL frame types
static const unsigned __int8 SSL_CHANGE_CIPHER_SPEC = 20; // x14
static const unsigned __int8 SSL_ALERT              = 21; // x15
static const unsigned __int8 SSL_HANDSHAKE          = 22; // x16
static const unsigned __int8 SSL_APPLICATION_DATA   = 23; // x17

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
SSLStream::SSLStream(SocketInfo *socket_info, SSL_DATA_DIRECTION direction):
  message_size_(-1)
  ,message_len_(0)
  ,socket_info_(socket_info)
  ,direction_(direction) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SSLStream::~SSLStream() {
}

/*-----------------------------------------------------------------------------
  Append data to the SSL/TLS stream and handle packet framing.
-----------------------------------------------------------------------------*/
void SSLStream::Append(const DataChunk& chunk) {
  DWORD len = chunk.GetLength();
  const char * buff = chunk.GetData();
  
  while (len && buff) {
    DWORD copy_bytes = 0;

    // are we starting a new frame?
    if (message_size_ < 0) {
      // see if we can at least copy over the size of the initial frame
      DWORD needed = sizeof(SSL_HEADER) - message_len_;
      copy_bytes = min(needed, len);
      if (copy_bytes) {
        memcpy(&message_[message_len_], buff, copy_bytes);
        message_len_ += copy_bytes;
        len -= copy_bytes;
        buff += copy_bytes;
      }

      // see if we have a header to parse and get the actual message size
      if (message_len_ >= sizeof(SSL_HEADER)) {
        SSL_HEADER * header = (SSL_HEADER *)message_;
        message_size_ = htons(header->length) + sizeof(SSL_HEADER);
      }
    }

    // see if we have bytes remaining in the current message
    if (message_size_ > 0 &&
        message_len_ < message_size_ &&
        len > 0 &&
        buff) {
      copy_bytes = min(message_size_ - message_len_, (__int32)len);
      memcpy(&message_[message_len_], buff, copy_bytes);
      message_len_ += copy_bytes;
      len -= copy_bytes;
      buff += copy_bytes;
    }

    // see if we have a full message
    if (message_size_ == message_len_) {
      SSL_HEADER * header = (SSL_HEADER *)message_;
//      CStringA msg;
//      msg.Format("SSL Message 0x%02X - %d bytes", header->type, message_size_);
//      OutputDebugStringA(msg);

      // reset state for the next message
      message_size_ = -1;
      message_len_ = 0;
    }
  }
}
