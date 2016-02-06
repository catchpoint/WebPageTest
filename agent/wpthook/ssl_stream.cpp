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
/*
  CStringA buff;
  buff.Format("SSL [%d] ", socket_info_->_id);
  buff += direction_ == SSL_IN ? "<<< " : ">>> ";
  ::OutputDebugStringA(buff + message);
*/
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
      PrecessMessage();

      // reset state for the next message
      message_size_ = -1;
      message_len_ = 0;
    }
  }
}

/*-----------------------------------------------------------------------------
  List from the IANA registry
  http://www.iana.org/assignments/tls-parameters/tls-parameters.xhtml
-----------------------------------------------------------------------------*/
CStringA SSLStream::GetCipherSuiteName(unsigned __int16 cipher_suite) {
  switch (cipher_suite) {
    case 0x0000: return "NULL_WITH_NULL_NULL";
    case 0x0001: return "RSA_WITH_NULL_MD5";
    case 0x0002: return "RSA_WITH_NULL_SHA";
    case 0x0003: return "RSA_EXPORT_WITH_RC4_40_MD5";
    case 0x0004: return "RSA_WITH_RC4_128_MD5";
    case 0x0005: return "RSA_WITH_RC4_128_SHA";
    case 0x0006: return "RSA_EXPORT_WITH_RC2_CBC_40_MD5";
    case 0x0007: return "RSA_WITH_IDEA_CBC_SHA";
    case 0x0008: return "RSA_EXPORT_WITH_DES40_CBC_SHA";
    case 0x0009: return "RSA_WITH_DES_CBC_SHA";
    case 0x000A: return "RSA_WITH_3DES_EDE_CBC_SHA";
    case 0x000B: return "DH_DSS_EXPORT_WITH_DES40_CBC_SHA";
    case 0x000C: return "DH_DSS_WITH_DES_CBC_SHA";
    case 0x000D: return "DH_DSS_WITH_3DES_EDE_CBC_SHA";
    case 0x000E: return "DH_RSA_EXPORT_WITH_DES40_CBC_SHA";
    case 0x000F: return "DH_RSA_WITH_DES_CBC_SHA";
    case 0x0010: return "DH_RSA_WITH_3DES_EDE_CBC_SHA";
    case 0x0011: return "DHE_DSS_EXPORT_WITH_DES40_CBC_SHA";
    case 0x0012: return "DHE_DSS_WITH_DES_CBC_SHA";
    case 0x0013: return "DHE_DSS_WITH_3DES_EDE_CBC_SHA";
    case 0x0014: return "DHE_RSA_EXPORT_WITH_DES40_CBC_SHA";
    case 0x0015: return "DHE_RSA_WITH_DES_CBC_SHA";
    case 0x0016: return "DHE_RSA_WITH_3DES_EDE_CBC_SHA";
    case 0x0017: return "DH_anon_EXPORT_WITH_RC4_40_MD5";
    case 0x0018: return "DH_anon_WITH_RC4_128_MD5";
    case 0x0019: return "DH_anon_EXPORT_WITH_DES40_CBC_SHA";
    case 0x001A: return "DH_anon_WITH_DES_CBC_SHA";
    case 0x001B: return "DH_anon_WITH_3DES_EDE_CBC_SHA";
    case 0x001E: return "KRB5_WITH_DES_CBC_SHA";
    case 0x001F: return "KRB5_WITH_3DES_EDE_CBC_SHA";
    case 0x0020: return "KRB5_WITH_RC4_128_SHA";
    case 0x0021: return "KRB5_WITH_IDEA_CBC_SHA";
    case 0x0022: return "KRB5_WITH_DES_CBC_MD5";
    case 0x0023: return "KRB5_WITH_3DES_EDE_CBC_MD5";
    case 0x0024: return "KRB5_WITH_RC4_128_MD5";
    case 0x0025: return "KRB5_WITH_IDEA_CBC_MD5";
    case 0x0026: return "KRB5_EXPORT_WITH_DES_CBC_40_SHA";
    case 0x0027: return "KRB5_EXPORT_WITH_RC2_CBC_40_SHA";
    case 0x0028: return "KRB5_EXPORT_WITH_RC4_40_SHA";
    case 0x0029: return "KRB5_EXPORT_WITH_DES_CBC_40_MD5";
    case 0x002A: return "KRB5_EXPORT_WITH_RC2_CBC_40_MD5";
    case 0x002B: return "KRB5_EXPORT_WITH_RC4_40_MD5";
    case 0x002C: return "PSK_WITH_NULL_SHA";
    case 0x002D: return "DHE_PSK_WITH_NULL_SHA";
    case 0x002E: return "RSA_PSK_WITH_NULL_SHA";
    case 0x002F: return "RSA_WITH_AES_128_CBC_SHA";
    case 0x0030: return "DH_DSS_WITH_AES_128_CBC_SHA";
    case 0x0031: return "DH_RSA_WITH_AES_128_CBC_SHA";
    case 0x0032: return "DHE_DSS_WITH_AES_128_CBC_SHA";
    case 0x0033: return "DHE_RSA_WITH_AES_128_CBC_SHA";
    case 0x0034: return "DH_anon_WITH_AES_128_CBC_SHA";
    case 0x0035: return "RSA_WITH_AES_256_CBC_SHA";
    case 0x0036: return "DH_DSS_WITH_AES_256_CBC_SHA";
    case 0x0037: return "DH_RSA_WITH_AES_256_CBC_SHA";
    case 0x0038: return "DHE_DSS_WITH_AES_256_CBC_SHA";
    case 0x0039: return "DHE_RSA_WITH_AES_256_CBC_SHA";
    case 0x003A: return "DH_anon_WITH_AES_256_CBC_SHA";
    case 0x003B: return "RSA_WITH_NULL_SHA256";
    case 0x003C: return "RSA_WITH_AES_128_CBC_SHA256";
    case 0x003D: return "RSA_WITH_AES_256_CBC_SHA256";
    case 0x003E: return "DH_DSS_WITH_AES_128_CBC_SHA256";
    case 0x003F: return "DH_RSA_WITH_AES_128_CBC_SHA256";
    case 0x0040: return "DHE_DSS_WITH_AES_128_CBC_SHA256";
    case 0x0041: return "RSA_WITH_CAMELLIA_128_CBC_SHA";
    case 0x0042: return "DH_DSS_WITH_CAMELLIA_128_CBC_SHA";
    case 0x0043: return "DH_RSA_WITH_CAMELLIA_128_CBC_SHA";
    case 0x0044: return "DHE_DSS_WITH_CAMELLIA_128_CBC_SHA";
    case 0x0045: return "DHE_RSA_WITH_CAMELLIA_128_CBC_SHA";
    case 0x0046: return "DH_anon_WITH_CAMELLIA_128_CBC_SHA";
    case 0x0067: return "DHE_RSA_WITH_AES_128_CBC_SHA256";
    case 0x0068: return "DH_DSS_WITH_AES_256_CBC_SHA256";
    case 0x0069: return "DH_RSA_WITH_AES_256_CBC_SHA256";
    case 0x006A: return "DHE_DSS_WITH_AES_256_CBC_SHA256";
    case 0x006B: return "DHE_RSA_WITH_AES_256_CBC_SHA256";
    case 0x006C: return "DH_anon_WITH_AES_128_CBC_SHA256";
    case 0x006D: return "DH_anon_WITH_AES_256_CBC_SHA256";
    case 0x0084: return "RSA_WITH_CAMELLIA_256_CBC_SHA";
    case 0x0085: return "DH_DSS_WITH_CAMELLIA_256_CBC_SHA";
    case 0x0086: return "DH_RSA_WITH_CAMELLIA_256_CBC_SHA";
    case 0x0087: return "DHE_DSS_WITH_CAMELLIA_256_CBC_SHA";
    case 0x0088: return "DHE_RSA_WITH_CAMELLIA_256_CBC_SHA";
    case 0x0089: return "DH_anon_WITH_CAMELLIA_256_CBC_SHA";
    case 0x008A: return "PSK_WITH_RC4_128_SHA";
    case 0x008B: return "PSK_WITH_3DES_EDE_CBC_SHA";
    case 0x008C: return "PSK_WITH_AES_128_CBC_SHA";
    case 0x008D: return "PSK_WITH_AES_256_CBC_SHA";
    case 0x008E: return "DHE_PSK_WITH_RC4_128_SHA";
    case 0x008F: return "DHE_PSK_WITH_3DES_EDE_CBC_SHA";
    case 0x0090: return "DHE_PSK_WITH_AES_128_CBC_SHA";
    case 0x0091: return "DHE_PSK_WITH_AES_256_CBC_SHA";
    case 0x0092: return "RSA_PSK_WITH_RC4_128_SHA";
    case 0x0093: return "RSA_PSK_WITH_3DES_EDE_CBC_SHA";
    case 0x0094: return "RSA_PSK_WITH_AES_128_CBC_SHA";
    case 0x0095: return "RSA_PSK_WITH_AES_256_CBC_SHA";
    case 0x0096: return "RSA_WITH_SEED_CBC_SHA";
    case 0x0097: return "DH_DSS_WITH_SEED_CBC_SHA";
    case 0x0098: return "DH_RSA_WITH_SEED_CBC_SHA";
    case 0x0099: return "DHE_DSS_WITH_SEED_CBC_SHA";
    case 0x009A: return "DHE_RSA_WITH_SEED_CBC_SHA";
    case 0x009B: return "DH_anon_WITH_SEED_CBC_SHA";
    case 0x009C: return "RSA_WITH_AES_128_GCM_SHA256";
    case 0x009D: return "RSA_WITH_AES_256_GCM_SHA384";
    case 0x009E: return "DHE_RSA_WITH_AES_128_GCM_SHA256";
    case 0x009F: return "DHE_RSA_WITH_AES_256_GCM_SHA384";
    case 0x00A0: return "DH_RSA_WITH_AES_128_GCM_SHA256";
    case 0x00A1: return "DH_RSA_WITH_AES_256_GCM_SHA384";
    case 0x00A2: return "DHE_DSS_WITH_AES_128_GCM_SHA256";
    case 0x00A3: return "DHE_DSS_WITH_AES_256_GCM_SHA384";
    case 0x00A4: return "DH_DSS_WITH_AES_128_GCM_SHA256";
    case 0x00A5: return "DH_DSS_WITH_AES_256_GCM_SHA384";
    case 0x00A6: return "DH_anon_WITH_AES_128_GCM_SHA256";
    case 0x00A7: return "DH_anon_WITH_AES_256_GCM_SHA384";
    case 0x00A8: return "PSK_WITH_AES_128_GCM_SHA256";
    case 0x00A9: return "PSK_WITH_AES_256_GCM_SHA384";
    case 0x00AA: return "DHE_PSK_WITH_AES_128_GCM_SHA256";
    case 0x00AB: return "DHE_PSK_WITH_AES_256_GCM_SHA384";
    case 0x00AC: return "RSA_PSK_WITH_AES_128_GCM_SHA256";
    case 0x00AD: return "RSA_PSK_WITH_AES_256_GCM_SHA384";
    case 0x00AE: return "PSK_WITH_AES_128_CBC_SHA256";
    case 0x00AF: return "PSK_WITH_AES_256_CBC_SHA384";
    case 0x00B0: return "PSK_WITH_NULL_SHA256";
    case 0x00B1: return "PSK_WITH_NULL_SHA384";
    case 0x00B2: return "DHE_PSK_WITH_AES_128_CBC_SHA256";
    case 0x00B3: return "DHE_PSK_WITH_AES_256_CBC_SHA384";
    case 0x00B4: return "DHE_PSK_WITH_NULL_SHA256";
    case 0x00B5: return "DHE_PSK_WITH_NULL_SHA384";
    case 0x00B6: return "RSA_PSK_WITH_AES_128_CBC_SHA256";
    case 0x00B7: return "RSA_PSK_WITH_AES_256_CBC_SHA384";
    case 0x00B8: return "RSA_PSK_WITH_NULL_SHA256";
    case 0x00B9: return "RSA_PSK_WITH_NULL_SHA384";
    case 0x00BA: return "RSA_WITH_CAMELLIA_128_CBC_SHA256";
    case 0x00BB: return "DH_DSS_WITH_CAMELLIA_128_CBC_SHA256";
    case 0x00BC: return "DH_RSA_WITH_CAMELLIA_128_CBC_SHA256";
    case 0x00BD: return "DHE_DSS_WITH_CAMELLIA_128_CBC_SHA256";
    case 0x00BE: return "DHE_RSA_WITH_CAMELLIA_128_CBC_SHA256";
    case 0x00BF: return "DH_anon_WITH_CAMELLIA_128_CBC_SHA256";
    case 0x00C0: return "RSA_WITH_CAMELLIA_256_CBC_SHA256";
    case 0x00C1: return "DH_DSS_WITH_CAMELLIA_256_CBC_SHA256";
    case 0x00C2: return "DH_RSA_WITH_CAMELLIA_256_CBC_SHA256";
    case 0x00C3: return "DHE_DSS_WITH_CAMELLIA_256_CBC_SHA256";
    case 0x00C4: return "DHE_RSA_WITH_CAMELLIA_256_CBC_SHA256";
    case 0x00C5: return "DH_anon_WITH_CAMELLIA_256_CBC_SHA256";
    case 0x00FF: return "EMPTY_RENEGOTIATION_INFO_SCSV";
    case 0x5600: return "FALLBACK_SCSV";
    case 0xC001: return "ECDH_ECDSA_WITH_NULL_SHA";
    case 0xC002: return "ECDH_ECDSA_WITH_RC4_128_SHA";
    case 0xC003: return "ECDH_ECDSA_WITH_3DES_EDE_CBC_SHA";
    case 0xC004: return "ECDH_ECDSA_WITH_AES_128_CBC_SHA";
    case 0xC005: return "ECDH_ECDSA_WITH_AES_256_CBC_SHA";
    case 0xC006: return "ECDHE_ECDSA_WITH_NULL_SHA";
    case 0xC007: return "ECDHE_ECDSA_WITH_RC4_128_SHA";
    case 0xC008: return "ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA";
    case 0xC009: return "ECDHE_ECDSA_WITH_AES_128_CBC_SHA";
    case 0xC00A: return "ECDHE_ECDSA_WITH_AES_256_CBC_SHA";
    case 0xC00B: return "ECDH_RSA_WITH_NULL_SHA";
    case 0xC00C: return "ECDH_RSA_WITH_RC4_128_SHA";
    case 0xC00D: return "ECDH_RSA_WITH_3DES_EDE_CBC_SHA";
    case 0xC00E: return "ECDH_RSA_WITH_AES_128_CBC_SHA";
    case 0xC00F: return "ECDH_RSA_WITH_AES_256_CBC_SHA";
    case 0xC010: return "ECDHE_RSA_WITH_NULL_SHA";
    case 0xC011: return "ECDHE_RSA_WITH_RC4_128_SHA";
    case 0xC012: return "ECDHE_RSA_WITH_3DES_EDE_CBC_SHA";
    case 0xC013: return "ECDHE_RSA_WITH_AES_128_CBC_SHA";
    case 0xC014: return "ECDHE_RSA_WITH_AES_256_CBC_SHA";
    case 0xC015: return "ECDH_anon_WITH_NULL_SHA";
    case 0xC016: return "ECDH_anon_WITH_RC4_128_SHA";
    case 0xC017: return "ECDH_anon_WITH_3DES_EDE_CBC_SHA";
    case 0xC018: return "ECDH_anon_WITH_AES_128_CBC_SHA";
    case 0xC019: return "ECDH_anon_WITH_AES_256_CBC_SHA";
    case 0xC01A: return "SRP_SHA_WITH_3DES_EDE_CBC_SHA";
    case 0xC01B: return "SRP_SHA_RSA_WITH_3DES_EDE_CBC_SHA";
    case 0xC01C: return "SRP_SHA_DSS_WITH_3DES_EDE_CBC_SHA";
    case 0xC01D: return "SRP_SHA_WITH_AES_128_CBC_SHA";
    case 0xC01E: return "SRP_SHA_RSA_WITH_AES_128_CBC_SHA";
    case 0xC01F: return "SRP_SHA_DSS_WITH_AES_128_CBC_SHA";
    case 0xC020: return "SRP_SHA_WITH_AES_256_CBC_SHA";
    case 0xC021: return "SRP_SHA_RSA_WITH_AES_256_CBC_SHA";
    case 0xC022: return "SRP_SHA_DSS_WITH_AES_256_CBC_SHA";
    case 0xC023: return "ECDHE_ECDSA_WITH_AES_128_CBC_SHA256";
    case 0xC024: return "ECDHE_ECDSA_WITH_AES_256_CBC_SHA384";
    case 0xC025: return "ECDH_ECDSA_WITH_AES_128_CBC_SHA256";
    case 0xC026: return "ECDH_ECDSA_WITH_AES_256_CBC_SHA384";
    case 0xC027: return "ECDHE_RSA_WITH_AES_128_CBC_SHA256";
    case 0xC028: return "ECDHE_RSA_WITH_AES_256_CBC_SHA384";
    case 0xC029: return "ECDH_RSA_WITH_AES_128_CBC_SHA256";
    case 0xC02A: return "ECDH_RSA_WITH_AES_256_CBC_SHA384";
    case 0xC02B: return "ECDHE_ECDSA_WITH_AES_128_GCM_SHA256";
    case 0xC02C: return "ECDHE_ECDSA_WITH_AES_256_GCM_SHA384";
    case 0xC02D: return "ECDH_ECDSA_WITH_AES_128_GCM_SHA256";
    case 0xC02E: return "ECDH_ECDSA_WITH_AES_256_GCM_SHA384";
    case 0xC02F: return "ECDHE_RSA_WITH_AES_128_GCM_SHA256";
    case 0xC030: return "ECDHE_RSA_WITH_AES_256_GCM_SHA384";
    case 0xC031: return "ECDH_RSA_WITH_AES_128_GCM_SHA256";
    case 0xC032: return "ECDH_RSA_WITH_AES_256_GCM_SHA384";
    case 0xC033: return "ECDHE_PSK_WITH_RC4_128_SHA";
    case 0xC034: return "ECDHE_PSK_WITH_3DES_EDE_CBC_SHA";
    case 0xC035: return "ECDHE_PSK_WITH_AES_128_CBC_SHA";
    case 0xC036: return "ECDHE_PSK_WITH_AES_256_CBC_SHA";
    case 0xC037: return "ECDHE_PSK_WITH_AES_128_CBC_SHA256";
    case 0xC038: return "ECDHE_PSK_WITH_AES_256_CBC_SHA384";
    case 0xC039: return "ECDHE_PSK_WITH_NULL_SHA";
    case 0xC03A: return "ECDHE_PSK_WITH_NULL_SHA256";
    case 0xC03B: return "ECDHE_PSK_WITH_NULL_SHA384";
    case 0xC03C: return "RSA_WITH_ARIA_128_CBC_SHA256";
    case 0xC03D: return "RSA_WITH_ARIA_256_CBC_SHA384";
    case 0xC03E: return "DH_DSS_WITH_ARIA_128_CBC_SHA256";
    case 0xC03F: return "DH_DSS_WITH_ARIA_256_CBC_SHA384";
    case 0xC040: return "DH_RSA_WITH_ARIA_128_CBC_SHA256";
    case 0xC041: return "DH_RSA_WITH_ARIA_256_CBC_SHA384";
    case 0xC042: return "DHE_DSS_WITH_ARIA_128_CBC_SHA256";
    case 0xC043: return "DHE_DSS_WITH_ARIA_256_CBC_SHA384";
    case 0xC044: return "DHE_RSA_WITH_ARIA_128_CBC_SHA256";
    case 0xC045: return "DHE_RSA_WITH_ARIA_256_CBC_SHA384";
    case 0xC046: return "DH_anon_WITH_ARIA_128_CBC_SHA256";
    case 0xC047: return "DH_anon_WITH_ARIA_256_CBC_SHA384";
    case 0xC048: return "ECDHE_ECDSA_WITH_ARIA_128_CBC_SHA256";
    case 0xC049: return "ECDHE_ECDSA_WITH_ARIA_256_CBC_SHA384";
    case 0xC04A: return "ECDH_ECDSA_WITH_ARIA_128_CBC_SHA256";
    case 0xC04B: return "ECDH_ECDSA_WITH_ARIA_256_CBC_SHA384";
    case 0xC04C: return "ECDHE_RSA_WITH_ARIA_128_CBC_SHA256";
    case 0xC04D: return "ECDHE_RSA_WITH_ARIA_256_CBC_SHA384";
    case 0xC04E: return "ECDH_RSA_WITH_ARIA_128_CBC_SHA256";
    case 0xC04F: return "ECDH_RSA_WITH_ARIA_256_CBC_SHA384";
    case 0xC050: return "RSA_WITH_ARIA_128_GCM_SHA256";
    case 0xC051: return "RSA_WITH_ARIA_256_GCM_SHA384";
    case 0xC052: return "DHE_RSA_WITH_ARIA_128_GCM_SHA256";
    case 0xC053: return "DHE_RSA_WITH_ARIA_256_GCM_SHA384";
    case 0xC054: return "DH_RSA_WITH_ARIA_128_GCM_SHA256";
    case 0xC055: return "DH_RSA_WITH_ARIA_256_GCM_SHA384";
    case 0xC056: return "DHE_DSS_WITH_ARIA_128_GCM_SHA256";
    case 0xC057: return "DHE_DSS_WITH_ARIA_256_GCM_SHA384";
    case 0xC058: return "DH_DSS_WITH_ARIA_128_GCM_SHA256";
    case 0xC059: return "DH_DSS_WITH_ARIA_256_GCM_SHA384";
    case 0xC05A: return "DH_anon_WITH_ARIA_128_GCM_SHA256";
    case 0xC05B: return "DH_anon_WITH_ARIA_256_GCM_SHA384";
    case 0xC05C: return "ECDHE_ECDSA_WITH_ARIA_128_GCM_SHA256";
    case 0xC05D: return "ECDHE_ECDSA_WITH_ARIA_256_GCM_SHA384";
    case 0xC05E: return "ECDH_ECDSA_WITH_ARIA_128_GCM_SHA256";
    case 0xC05F: return "ECDH_ECDSA_WITH_ARIA_256_GCM_SHA384";
    case 0xC060: return "ECDHE_RSA_WITH_ARIA_128_GCM_SHA256";
    case 0xC061: return "ECDHE_RSA_WITH_ARIA_256_GCM_SHA384";
    case 0xC062: return "ECDH_RSA_WITH_ARIA_128_GCM_SHA256";
    case 0xC063: return "ECDH_RSA_WITH_ARIA_256_GCM_SHA384";
    case 0xC064: return "PSK_WITH_ARIA_128_CBC_SHA256";
    case 0xC065: return "PSK_WITH_ARIA_256_CBC_SHA384";
    case 0xC066: return "DHE_PSK_WITH_ARIA_128_CBC_SHA256";
    case 0xC067: return "DHE_PSK_WITH_ARIA_256_CBC_SHA384";
    case 0xC068: return "RSA_PSK_WITH_ARIA_128_CBC_SHA256";
    case 0xC069: return "RSA_PSK_WITH_ARIA_256_CBC_SHA384";
    case 0xC06A: return "PSK_WITH_ARIA_128_GCM_SHA256";
    case 0xC06B: return "PSK_WITH_ARIA_256_GCM_SHA384";
    case 0xC06C: return "DHE_PSK_WITH_ARIA_128_GCM_SHA256";
    case 0xC06D: return "DHE_PSK_WITH_ARIA_256_GCM_SHA384";
    case 0xC06E: return "RSA_PSK_WITH_ARIA_128_GCM_SHA256";
    case 0xC06F: return "RSA_PSK_WITH_ARIA_256_GCM_SHA384";
    case 0xC070: return "ECDHE_PSK_WITH_ARIA_128_CBC_SHA256";
    case 0xC071: return "ECDHE_PSK_WITH_ARIA_256_CBC_SHA384";
    case 0xC072: return "ECDHE_ECDSA_WITH_CAMELLIA_128_CBC_SHA256";
    case 0xC073: return "ECDHE_ECDSA_WITH_CAMELLIA_256_CBC_SHA384";
    case 0xC074: return "ECDH_ECDSA_WITH_CAMELLIA_128_CBC_SHA256";
    case 0xC075: return "ECDH_ECDSA_WITH_CAMELLIA_256_CBC_SHA384";
    case 0xC076: return "ECDHE_RSA_WITH_CAMELLIA_128_CBC_SHA256";
    case 0xC077: return "ECDHE_RSA_WITH_CAMELLIA_256_CBC_SHA384";
    case 0xC078: return "ECDH_RSA_WITH_CAMELLIA_128_CBC_SHA256";
    case 0xC079: return "ECDH_RSA_WITH_CAMELLIA_256_CBC_SHA384";
    case 0xC07A: return "RSA_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC07B: return "RSA_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC07C: return "DHE_RSA_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC07D: return "DHE_RSA_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC07E: return "DH_RSA_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC07F: return "DH_RSA_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC080: return "DHE_DSS_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC081: return "DHE_DSS_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC082: return "DH_DSS_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC083: return "DH_DSS_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC084: return "DH_anon_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC085: return "DH_anon_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC086: return "ECDHE_ECDSA_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC087: return "ECDHE_ECDSA_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC088: return "ECDH_ECDSA_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC089: return "ECDH_ECDSA_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC08A: return "ECDHE_RSA_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC08B: return "ECDHE_RSA_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC08C: return "ECDH_RSA_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC08D: return "ECDH_RSA_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC08E: return "PSK_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC08F: return "PSK_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC090: return "DHE_PSK_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC091: return "DHE_PSK_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC092: return "RSA_PSK_WITH_CAMELLIA_128_GCM_SHA256";
    case 0xC093: return "RSA_PSK_WITH_CAMELLIA_256_GCM_SHA384";
    case 0xC094: return "PSK_WITH_CAMELLIA_128_CBC_SHA256";
    case 0xC095: return "PSK_WITH_CAMELLIA_256_CBC_SHA384";
    case 0xC096: return "DHE_PSK_WITH_CAMELLIA_128_CBC_SHA256";
    case 0xC097: return "DHE_PSK_WITH_CAMELLIA_256_CBC_SHA384";
    case 0xC098: return "RSA_PSK_WITH_CAMELLIA_128_CBC_SHA256";
    case 0xC099: return "RSA_PSK_WITH_CAMELLIA_256_CBC_SHA384";
    case 0xC09A: return "ECDHE_PSK_WITH_CAMELLIA_128_CBC_SHA256";
    case 0xC09B: return "ECDHE_PSK_WITH_CAMELLIA_256_CBC_SHA384";
    case 0xC09C: return "RSA_WITH_AES_128_CCM";
    case 0xC09D: return "RSA_WITH_AES_256_CCM";
    case 0xC09E: return "DHE_RSA_WITH_AES_128_CCM";
    case 0xC09F: return "DHE_RSA_WITH_AES_256_CCM";
    case 0xC0A0: return "RSA_WITH_AES_128_CCM_8";
    case 0xC0A1: return "RSA_WITH_AES_256_CCM_8";
    case 0xC0A2: return "DHE_RSA_WITH_AES_128_CCM_8";
    case 0xC0A3: return "DHE_RSA_WITH_AES_256_CCM_8";
    case 0xC0A4: return "PSK_WITH_AES_128_CCM";
    case 0xC0A5: return "PSK_WITH_AES_256_CCM";
    case 0xC0A6: return "DHE_PSK_WITH_AES_128_CCM";
    case 0xC0A7: return "DHE_PSK_WITH_AES_256_CCM";
    case 0xC0A8: return "PSK_WITH_AES_128_CCM_8";
    case 0xC0A9: return "PSK_WITH_AES_256_CCM_8";
    case 0xC0AA: return "PSK_DHE_WITH_AES_128_CCM_8";
    case 0xC0AB: return "PSK_DHE_WITH_AES_256_CCM_8";
    case 0xC0AC: return "ECDHE_ECDSA_WITH_AES_128_CCM";
    case 0xC0AD: return "ECDHE_ECDSA_WITH_AES_256_CCM";
    case 0xC0AE: return "ECDHE_ECDSA_WITH_AES_128_CCM_8";
    case 0xC0AF: return "ECDHE_ECDSA_WITH_AES_256_CCM_8";
  }
  return "UNKNOWN";
}

/******************************************************************************
                            SSL/TLS Messages
******************************************************************************/

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::PrecessMessage() {
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
        msg.Format("Invalid Handshake message 0x%02X- %d bytes", handshake->type, message_size_);
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
  CStringA secret = sockets_.GetSslMasterSecret(socket_info_);
  CStringA msg;
  msg.Format("Change Cipher Spec 0x%02X - %d bytes - master secret: ", header->type, message_size_);
  OutputDebugStringA(msg + secret);
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
    client_random_ = "";
    for (int i = 0; i < _countof(hello->client_random); i++) {
      buff.Format("%02x", hello->client_random[i]);
      client_random_ += buff;
    }
    OutputDebugStringA("Handshake Client Hello - client random = " + client_random_);
  } else {
    CStringA msg;
    msg.Format("Invalid Client Hello - %d bytes", message_size_);
    OutputDebugStringA(msg);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SSLStream::HandshakeServerHello() {
  OutputDebugStringA("Handshake Server Hello");
  if (message_size_ >= sizeof(SSL_SERVER_HELLO)) {
    SSL_SERVER_HELLO * hello = (SSL_SERVER_HELLO *)message_;
    // figure out the size of the session ID record that we need to go past
    // to get the cipher suite and compression.
    __int32 offset = sizeof(SSL_SERVER_HELLO) + hello->session_id_length;
    if (message_size_ >= offset + (__int32)sizeof(SSL_SERVER_HELLO_DETAIL)) {
      SSL_SERVER_HELLO_DETAIL * detail =
          (SSL_SERVER_HELLO_DETAIL *)(&message_[offset]);
      cipher_suite_ = htons(detail->cipher_suite);
      compression_ = detail->compression_method;
      CStringA msg;
      msg.Format("Server Hello - Cipher Suite 0x%04hX (%s), Compression %d", cipher_suite_, (LPCSTR)GetCipherSuiteName(cipher_suite_), compression_);
      OutputDebugStringA(msg);
    } else {
      CStringA msg;
      msg.Format("Invalid Server Hello (session ID) - %d bytes", message_size_);
      OutputDebugStringA(msg);
    }
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
