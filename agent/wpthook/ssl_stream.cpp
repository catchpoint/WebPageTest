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
  ,cipher_suite_(0)
  ,compression_(0) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SSLStream::~SSLStream() {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::OutputDebugStringA(CStringA message) {
  CStringA buff;
  buff.Format("SSL [%d] ", socket_info_->_id);
  buff += direction_ == SSL_IN ? "<<< " : ">>> ";
  ::OutputDebugStringA(buff + message);
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
      message_len_ += copy_bytes;
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
      CStringA msg;
      msg.Format("Unknown Message 0x%02X - %d bytes", header->type, message_size_);
      OutputDebugStringA(msg);
    } break;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessHandshake() {
  if (message_size_ >= sizeof(SSL_HANDSHAKE)) {
    SSL_HANDSHAKE * handshake = (SSL_HANDSHAKE *)message_;
    switch (handshake->type) {
      case HANDSHAKE_HELLO_REQUEST: HandshakeHelloRequest(); break;
      case HANDSHAKE_CLIENT_HELLO: HandshakeClientHello(); break;
      case HANDSHAKE_SERVER_HELLO: HandshakeServerHello(); break;
      case HANDSHAKE_CERTIFICATE: HandshakeCertificate(); break;
      case HANDSHAKE_SERVER_KEY_EXCHANGE: HandshakeServerKeyExchange(); break;
      case HANDSHAKE_CERTIFICATE_REQUEST: HandshakeCertificateRequest(); break;
      case HANDSHAKE_SERVER_DONE: HandshakeServerDone(); break;
      case HANDSHAKE_CERTIFICATE_VERIFY: HandshakeCertificateVerify(); break;
      case HANDSHAKE_CLIENT_KEY_EXCHANGE: HandshakeClientKeyExchange(); break;
      case HANDSHAKE_FINISHED: HandshakeFinished(); break;
      default: {
        CStringA msg;
        msg.Format("Unknown Handshake message 0x%02X- %d bytes", handshake->type, message_size_);
        OutputDebugStringA(msg);
      } break;
    }
  } else {
    CStringA msg;
    msg.Format("Invalid Handshake - %d bytes", message_size_);
    OutputDebugStringA(msg);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessApplicationData() {
  SSL_HEADER * header = (SSL_HEADER *)message_;
  CStringA msg;
  msg.Format("Application Data 0x%02X - %d bytes", header->type, message_size_);
  OutputDebugStringA(msg);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessChangeCipherSpec() {
  SSL_HEADER * header = (SSL_HEADER *)message_;
  CStringA msg;
  msg.Format("Change Cipher Spec 0x%02X - %d bytes", header->type, message_size_);
  OutputDebugStringA(msg);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::ProcessAlert() {
  SSL_HEADER * header = (SSL_HEADER *)message_;
  CStringA msg;
  msg.Format("Alert 0x%02X - %d bytes", header->type, message_size_);
  OutputDebugStringA(msg);
}

/******************************************************************************
                            SSL/TLS Handshake
******************************************************************************/

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeHelloRequest() {
  OutputDebugStringA("Handshake Hello Request");
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeClientHello() {
  if (message_size_ >= sizeof(SSL_CLIENT_HELLO)) {
    SSL_CLIENT_HELLO * hello = (SSL_CLIENT_HELLO *)message_;
    CStringA buff;
    random_ = "";
    for (int i = 0; i < _countof(hello->client_random); i++) {
      buff.Format("%02x", hello->client_random[i]);
      random_ += buff;
    }
    client_random_ = random_;
    OutputDebugStringA("Handshake Client Hello - client random = " + random_);
  } else {
    CStringA msg;
    msg.Format("Invalid Client Hello - %d bytes", message_size_);
    OutputDebugStringA(msg);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeServerHello() {
  if (message_size_ >= sizeof(SSL_SERVER_HELLO)) {
    SSL_SERVER_HELLO * hello = (SSL_SERVER_HELLO *)message_;
    CStringA buff;
    random_ = "";
    for (int i = 0; i < _countof(hello->server_random); i++) {
      buff.Format("%02x", hello->server_random[i]);
      random_ += buff;
    }
    OutputDebugStringA("Handshake Server Hello - server random = " + random_);
  } else {
    CStringA msg;
    msg.Format("Invalid Server Hello - %d bytes", message_size_);
    OutputDebugStringA(msg);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeCertificate() {
  OutputDebugStringA("Handshake Certificate");
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeServerKeyExchange() {
  OutputDebugStringA("Handshake Server Key Exchange");
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeCertificateRequest() {
  OutputDebugStringA("Handshake Certificate Request");
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeServerDone() {
  OutputDebugStringA("Handshake Server Done");
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeCertificateVerify() {
  OutputDebugStringA("Handshake Certificate Verify");
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeClientKeyExchange() {
  OutputDebugStringA("Handshake Client Key Exchange");
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeFinished() {
  OutputDebugStringA("Handshake Finished");
}
