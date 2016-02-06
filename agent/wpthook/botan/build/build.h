#ifndef BOTAN_BUILD_CONFIG_H__
#define BOTAN_BUILD_CONFIG_H__

/*
* This file was automatically generated Tue Jan 12 09:42:47 2016 UTC by
* pmeenan@pat running 'configure.py --cc=msvc --cpu=x86'
*
* Target
*  - Compiler: cl  /MD /bigobj /EHs /GR /O2
*  - Arch: x86_32/x86_32
*  - OS: windows
*/

#define BOTAN_VERSION_MAJOR 1
#define BOTAN_VERSION_MINOR 11
#define BOTAN_VERSION_PATCH 26
#define BOTAN_VERSION_DATESTAMP 20160104

#define BOTAN_VERSION_RELEASE_TYPE "released"

#define BOTAN_VERSION_VC_REVISION "git:9d3ad9a0f44a9321185ed9f221c828dac81b9f0c"

#define BOTAN_DISTRIBUTION_INFO "unspecified"

#define BOTAN_INSTALL_PREFIX R"(c:\Botan)"
#define BOTAN_INSTALL_HEADER_DIR "include/botan-1.11"
#define BOTAN_INSTALL_LIB_DIR "lib"
#define BOTAN_LIB_LINK "advapi32.lib user32.lib"

#ifndef BOTAN_DLL
  #define BOTAN_DLL __declspec(dllimport)
#endif

/* How much to allocate for a buffer of no particular size */
#define BOTAN_DEFAULT_BUFFER_SIZE 1024

/* Minimum and maximum sizes to allocate out of the mlock pool (bytes)
   Default min is 16 as smaller values are easily bruteforceable and thus
   likely not cryptographic keys.
*/
#define BOTAN_MLOCK_ALLOCATOR_MIN_ALLOCATION 16
#define BOTAN_MLOCK_ALLOCATOR_MAX_ALLOCATION 128

/*
* Total maximum amount of RAM (in KiB) we will lock into memory, even
* if the OS would let us lock more
*/
#define BOTAN_MLOCK_ALLOCATOR_MAX_LOCKED_KB 512

/* Multiplier on a block cipher's native parallelism */
#define BOTAN_BLOCK_CIPHER_PAR_MULT 4

/* How many bits per limb in a BigInt */
#define BOTAN_MP_WORD_BITS 32

/*
* If enabled uses memset via volatile function pointer to zero memory,
* otherwise does a byte at a time write via a volatile pointer.
*/
#define BOTAN_USE_VOLATILE_MEMSET_FOR_ZERO 1

/*
* If enabled the ECC implementation will use Montgomery ladder
* instead of a fixed window implementation.
*/
#define BOTAN_POINTGFP_BLINDED_MULTIPLY_USE_MONTGOMERY_LADDER 0

/*
* Set number of bits used to generate mask for blinding the scalar of
* a point multiplication. Set to zero to disable this side-channel
* countermeasure.
*/
#define BOTAN_POINTGFP_SCALAR_BLINDING_BITS 20

/*
* Set number of bits used to generate mask for blinding the
* representation of an ECC point. Set to zero to diable this
* side-channel countermeasure.
*/
#define BOTAN_POINTGFP_RANDOMIZE_BLINDING_BITS 80

/*
* Normally blinding is performed by choosing a random starting point (plus
* its inverse, of a form appropriate to the algorithm being blinded), and
* then choosing new blinding operands by successive squaring of both
* values. This is much faster than computing a new starting point but
* introduces some possible coorelation
*
* To avoid possible leakage problems in long-running processes, the blinder
* periodically reinitializes the sequence. This value specifies how often
* a new sequence should be started.
*/
#define BOTAN_BLINDING_REINIT_INTERVAL 32

/* PK key consistency checking toggles */
#define BOTAN_PUBLIC_KEY_STRONG_CHECKS_ON_LOAD 1
#define BOTAN_PRIVATE_KEY_STRONG_CHECKS_ON_LOAD 0
#define BOTAN_PRIVATE_KEY_STRONG_CHECKS_ON_GENERATE 1

/*
* Define BOTAN_HAS_VALGRIND to enable checking constant time annotations
* TODO: expose as configure.py flag --with-valgrind
*/
//#define BOTAN_HAS_VALGRIND

/*
* RNGs will automatically poll the system for additional seed material
* after producing this many bytes of output.
*/
#define BOTAN_RNG_MAX_OUTPUT_BEFORE_RESEED 4096
#define BOTAN_RNG_RESEED_POLL_BITS 128
#define BOTAN_RNG_AUTO_RESEED_TIMEOUT std::chrono::milliseconds(10)
#define BOTAN_RNG_RESEED_DEFAULT_TIMEOUT std::chrono::milliseconds(50)

/*
* Specifies (in order) the list of entropy sources that will be used
* to seed an in-memory RNG. The first few in the default list
* ("timer", "proc_info", etc) do not count as contributing any entropy
* but are included as they are fast and help protect against a
* seriously broken system RNG.
*/
#define BOTAN_ENTROPY_DEFAULT_SOURCES \
   { "timestamp", "rdseed", "rdrand", "proc_info", \
   "darwin_secrandom", "dev_random", "win32_cryptoapi", "egd", \
   "proc_walk", "system_stats", "unix_procs" }

/*
* These control the RNG used by the system RNG interface
*/
#define BOTAN_SYSTEM_RNG_DEVICE "/dev/urandom"
#define BOTAN_SYSTEM_RNG_CRYPTOAPI_PROV_TYPE PROV_RSA_FULL

/*
* These paramaters control how many bytes to read from the system
* PRNG, and how long to block if applicable.
*
* Timeout is ignored on Windows as CryptGenRandom doesn't block
*/
#define BOTAN_SYSTEM_RNG_POLL_DEVICES { "/dev/urandom", "/dev/random", "/dev/srandom" }

#define BOTAN_SYSTEM_RNG_POLL_REQUEST 64
#define BOTAN_SYSTEM_RNG_POLL_TIMEOUT_MS 20

#define BOTAN_ENTROPY_EGD_PATHS { "/var/run/egd-pool", "/dev/egd-pool" }
#define BOTAN_ENTROPY_PROC_FS_PATH "/proc"
#define BOTAN_ENTROPY_SAFE_PATHS { "/bin", "/sbin", "/usr/bin", "/usr/sbin" }

/*
* Defines the static entropy estimates which each type of source uses.
* These values are expressed as the bits of entropy per byte of
* output (in double format) and should be conservative. These are used
* unless an entropy source has some more specific opinion on the entropy
* of the underlying source.
*/

// We include some high resolution timestamps because it can't hurt
#define BOTAN_ENTROPY_ESTIMATE_TIMESTAMPS 0

// Data which is system or process specific, but otherwise static
#define BOTAN_ENTROPY_ESTIMATE_STATIC_SYSTEM_DATA 0

// Binary system data of some kind
#define BOTAN_ENTROPY_ESTIMATE_SYSTEM_DATA 0.5

// Human readable text which has entropy
#define BOTAN_ENTROPY_ESTIMATE_SYSTEM_TEXT (1.0 / 64)

/*
The output of a hardware RNG such as RDRAND / RDSEED

By default such RNGs are used but not trusted, so that the standard
softare-based entropy polling is still used.
*/
#define BOTAN_ENTROPY_ESTIMATE_HARDWARE_RNG 0.0

// The output of a PRNG we are trusting to be strong
#define BOTAN_ENTROPY_ESTIMATE_STRONG_RNG 7.0


/*
* Compiler and target specific flags
*/

/* Should we use GCC-style inline assembler? */
#if !defined(BOTAN_USE_GCC_INLINE_ASM) && defined(__GNUG__)
  #define BOTAN_USE_GCC_INLINE_ASM 1
#endif

#ifdef __GNUC__
  #define BOTAN_GCC_VERSION \
     (__GNUC__ * 100 + __GNUC_MINOR__ * 10 + __GNUC_PATCHLEVEL__)
#else
  #define BOTAN_GCC_VERSION 0
#endif

/* Target identification and feature test macros */
#define BOTAN_TARGET_OS_IS_WINDOWS
#define BOTAN_TARGET_OS_TYPE_IS_WINDOWS
#define BOTAN_TARGET_OS_HAS_CRYPTGENRANDOM
#define BOTAN_TARGET_OS_HAS_GMTIME_S
#define BOTAN_TARGET_OS_HAS_LOADLIBRARY
#define BOTAN_TARGET_OS_HAS_MKGMTIME
#define BOTAN_TARGET_OS_HAS_QUERY_PERF_COUNTER
#define BOTAN_TARGET_OS_HAS_RTLSECUREZEROMEMORY
#define BOTAN_TARGET_OS_HAS_STL_FILESYSTEM_MSVC
#define BOTAN_TARGET_OS_HAS_VIRTUAL_LOCK

#define BOTAN_TARGET_ARCH_IS_X86_32
#define BOTAN_TARGET_SUPPORTS_AESNI
#define BOTAN_TARGET_SUPPORTS_AVX2
#define BOTAN_TARGET_SUPPORTS_BMI2
#define BOTAN_TARGET_SUPPORTS_RDRAND
#define BOTAN_TARGET_SUPPORTS_RDSEED
#define BOTAN_TARGET_SUPPORTS_SHA
#define BOTAN_TARGET_SUPPORTS_SSE2
#define BOTAN_TARGET_SUPPORTS_SSE41
#define BOTAN_TARGET_SUPPORTS_SSE42
#define BOTAN_TARGET_SUPPORTS_SSSE3
#define BOTAN_TARGET_CPU_IS_LITTLE_ENDIAN
#define BOTAN_TARGET_CPU_IS_X86_FAMILY
#define BOTAN_TARGET_CPU_NATIVE_WORD_SIZE 32
#define BOTAN_TARGET_UNALIGNED_MEMORY_ACCESS_OK 1

#if defined(BOTAN_TARGET_CPU_IS_LITTLE_ENDIAN) || \
    defined(BOTAN_TARGET_CPU_IS_BIG_ENDIAN)
  #define BOTAN_TARGET_CPU_HAS_KNOWN_ENDIANNESS
#endif

/*
* If no way of dynamically determining the cache line size for the
* system exists, this value is used as the default. Used by the side
* channel countermeasures rather than for alignment purposes, so it is
* better to be on the smaller side if the exact value cannot be
* determined. Typically 32 or 64 bytes on modern CPUs.
*/
#if !defined(BOTAN_TARGET_CPU_DEFAULT_CACHE_LINE_SIZE)
  #define BOTAN_TARGET_CPU_DEFAULT_CACHE_LINE_SIZE 32
#endif

#define BOTAN_BUILD_COMPILER_IS_MSVC

#if defined(_MSC_VER)
  // 4250: inherits via dominance (diamond inheritence issue)
  // 4251: needs DLL interface (STL DLL exports)
  #pragma warning(disable: 4250 4251)
#endif

/*
* Compile-time deprecatation warnings
*/
#if !defined(BOTAN_NO_DEPRECATED_WARNINGS)

  #if defined(__clang__)
    #define BOTAN_DEPRECATED(msg) __attribute__ ((deprecated))

  #elif defined(_MSC_VER)
    #define BOTAN_DEPRECATED(msg) __declspec(deprecated(msg))

  #elif defined(__GNUG__)

    #if BOTAN_GCC_VERSION >= 450
      #define BOTAN_DEPRECATED(msg) __attribute__ ((deprecated(msg)))
    #else
      #define BOTAN_DEPRECATED(msg) __attribute__ ((deprecated))
    #endif

  #endif

#endif

#if defined(_MSC_VER)
  #define BOTAN_CURRENT_FUNCTION __FUNCTION__
#else
  #define BOTAN_CURRENT_FUNCTION __func__
#endif

#if !defined(BOTAN_DEPRECATED)
  #define BOTAN_DEPRECATED(msg)
#endif

#if defined(_MSC_VER)
  // noexcept is not supported in VS 2013
  #include <yvals.h>
  #define BOTAN_NOEXCEPT _NOEXCEPT
#else
  #define BOTAN_NOEXCEPT noexcept
#endif

/*
* Module availability definitions
*/
#define BOTAN_HAS_ADLER32 20131128
#define BOTAN_HAS_AEAD_CCM 20131128
#define BOTAN_HAS_AEAD_CHACHA20_POLY1305 20141228
#define BOTAN_HAS_AEAD_EAX 20131128
#define BOTAN_HAS_AEAD_GCM 20131128
#define BOTAN_HAS_AEAD_MODES 20131128
#define BOTAN_HAS_AEAD_OCB 20131128
#define BOTAN_HAS_AEAD_SIV 20131202
#define BOTAN_HAS_AES 20131128
#define BOTAN_HAS_AES_NI 20131128
#define BOTAN_HAS_AES_SSSE3 20131128
#define BOTAN_HAS_ANSI_X919_MAC 20131128
#define BOTAN_HAS_ASN1 20131128
#define BOTAN_HAS_AUTO_SEEDING_RNG 20131128
#define BOTAN_HAS_BASE64_CODEC 20131128
#define BOTAN_HAS_BCRYPT 20131128
#define BOTAN_HAS_BIGINT 20131128
#define BOTAN_HAS_BIGINT_MP 20151225
#define BOTAN_HAS_BLOCK_CIPHER 20131128
#define BOTAN_HAS_BLOWFISH 20131128
#define BOTAN_HAS_CAMELLIA 20150922
#define BOTAN_HAS_CASCADE 20131128
#define BOTAN_HAS_CAST 20131128
#define BOTAN_HAS_CBC_MAC 20131128
#define BOTAN_HAS_CHACHA 20140103
#define BOTAN_HAS_CIPHER_MODE_PADDING 20131128
#define BOTAN_HAS_CMAC 20131128
#define BOTAN_HAS_CODEC_FILTERS 20131128
#define BOTAN_HAS_COMB4P 20131128
#define BOTAN_HAS_COMPRESSION 20141117
#define BOTAN_HAS_CRC24 20131128
#define BOTAN_HAS_CRC32 20131128
#define BOTAN_HAS_CRYPTO_BOX 20131128
#define BOTAN_HAS_CTR_BE 20131128
#define BOTAN_HAS_CURVE_25519 20141227
#define BOTAN_HAS_DES 20131128
#define BOTAN_HAS_DIFFIE_HELLMAN 20131128
#define BOTAN_HAS_DLIES 20131128
#define BOTAN_HAS_DL_GROUP 20131128
#define BOTAN_HAS_DL_PUBLIC_KEY_FAMILY 20131128
#define BOTAN_HAS_DSA 20131128
#define BOTAN_HAS_ECC_GROUP 20131128
#define BOTAN_HAS_ECC_PUBLIC_KEY_CRYPTO 20131128
#define BOTAN_HAS_ECDH 20131128
#define BOTAN_HAS_ECDSA 20131128
#define BOTAN_HAS_EC_CURVE_GFP 20131128
#define BOTAN_HAS_ELGAMAL 20131128
#define BOTAN_HAS_EME_OAEP 20140118
#define BOTAN_HAS_EME_PKCS1v15 20131128
#define BOTAN_HAS_EME_RAW 20150313
#define BOTAN_HAS_EMSA1 20131128
#define BOTAN_HAS_EMSA1_BSI 20131128
#define BOTAN_HAS_EMSA_PKCS1 20140118
#define BOTAN_HAS_EMSA_PSSR 20131128
#define BOTAN_HAS_EMSA_RAW 20131128
#define BOTAN_HAS_EMSA_X931 20140118
#define BOTAN_HAS_ENTROPY_SOURCE 20151120
#define BOTAN_HAS_ENTROPY_SRC_CAPI 20131128
#define BOTAN_HAS_ENTROPY_SRC_HIGH_RESOLUTION_TIMER 20131128
#define BOTAN_HAS_ENTROPY_SRC_RDRAND 20131128
#define BOTAN_HAS_ENTROPY_SRC_RDSEED 20151218
#define BOTAN_HAS_ENTROPY_SRC_WIN32 20131128
#define BOTAN_HAS_FFI 20151015
#define BOTAN_HAS_FILTERS 20131128
#define BOTAN_HAS_FPE_FE1 20131128
#define BOTAN_HAS_GCM_CLMUL 20131227
#define BOTAN_HAS_GOST_28147_89 20131128
#define BOTAN_HAS_GOST_34_10_2001 20131128
#define BOTAN_HAS_GOST_34_11 20131128
#define BOTAN_HAS_HASH_ID 20131128
#define BOTAN_HAS_HAS_160 20131128
#define BOTAN_HAS_HEX_CODEC 20131128
#define BOTAN_HAS_HKDF 20131128
#define BOTAN_HAS_HMAC 20131128
#define BOTAN_HAS_HMAC_DRBG 20140319
#define BOTAN_HAS_HMAC_RNG 20131128
#define BOTAN_HAS_HTTP_UTIL 20131128
#define BOTAN_HAS_IDEA 20131128
#define BOTAN_HAS_IDEA_SSE2 20131128
#define BOTAN_HAS_IF_PUBLIC_KEY_FAMILY 20131128
#define BOTAN_HAS_KASUMI 20131128
#define BOTAN_HAS_KDF1 20131128
#define BOTAN_HAS_KDF2 20131128
#define BOTAN_HAS_KDF_BASE 20131128
#define BOTAN_HAS_KECCAK 20131128
#define BOTAN_HAS_KEYPAIR_TESTING 20131128
#define BOTAN_HAS_LION 20131128
#define BOTAN_HAS_LOCKING_ALLOCATOR 20131128
#define BOTAN_HAS_MAC 20150626
#define BOTAN_HAS_MARS 20131128
#define BOTAN_HAS_MCEIES 20150706
#define BOTAN_HAS_MCELIECE 20150922
#define BOTAN_HAS_MD2 20131128
#define BOTAN_HAS_MD4 20131128
#define BOTAN_HAS_MD5 20131128
#define BOTAN_HAS_MDX_HASH_FUNCTION 20131128
#define BOTAN_HAS_MGF1 20140118
#define BOTAN_HAS_MISTY1 20131128
#define BOTAN_HAS_MODES 20150626
#define BOTAN_HAS_MODE_CBC 20131128
#define BOTAN_HAS_MODE_CFB 20131128
#define BOTAN_HAS_MODE_ECB 20131128
#define BOTAN_HAS_MODE_XTS 20131128
#define BOTAN_HAS_NOEKEON 20131128
#define BOTAN_HAS_NOEKEON_SIMD 20131128
#define BOTAN_HAS_NUMBERTHEORY 20131128
#define BOTAN_HAS_NYBERG_RUEPPEL 20131128
#define BOTAN_HAS_OCSP 20131128
#define BOTAN_HAS_OFB 20131128
#define BOTAN_HAS_OID_LOOKUP 20131128
#define BOTAN_HAS_OPENPGP_CODEC 20131128
#define BOTAN_HAS_PACKAGE_TRANSFORM 20131128
#define BOTAN_HAS_PARALLEL_HASH 20131128
#define BOTAN_HAS_PASSHASH9 20131128
#define BOTAN_HAS_PBKDF 20150626
#define BOTAN_HAS_PBKDF1 20131128
#define BOTAN_HAS_PBKDF2 20131128
#define BOTAN_HAS_PEM_CODEC 20131128
#define BOTAN_HAS_PKCS5_PBES2 20141119
#define BOTAN_HAS_PK_PADDING 20131128
#define BOTAN_HAS_POLY1305 20141227
#define BOTAN_HAS_PUBLIC_KEY_CRYPTO 20131128
#define BOTAN_HAS_RC2 20131128
#define BOTAN_HAS_RC4 20131128
#define BOTAN_HAS_RC5 20131128
#define BOTAN_HAS_RC6 20131128
#define BOTAN_HAS_RFC3394_KEYWRAP 20131128
#define BOTAN_HAS_RFC6979_GENERATOR 20140321
#define BOTAN_HAS_RIPEMD_128 20131128
#define BOTAN_HAS_RIPEMD_160 20131128
#define BOTAN_HAS_RSA 20131128
#define BOTAN_HAS_RW 20131128
#define BOTAN_HAS_SAFER 20131128
#define BOTAN_HAS_SALSA20 20131128
#define BOTAN_HAS_SEED 20131128
#define BOTAN_HAS_SERPENT 20131128
#define BOTAN_HAS_SERPENT_SIMD 20131128
#define BOTAN_HAS_SHA1 20131128
#define BOTAN_HAS_SHA1_SSE2 20131128
#define BOTAN_HAS_SHA2_32 20131128
#define BOTAN_HAS_SHA2_64 20131128
#define BOTAN_HAS_SIMD_32 20131128
#define BOTAN_HAS_SIMD_SSE2 20131128
#define BOTAN_HAS_SIPHASH 20150110
#define BOTAN_HAS_SKEIN_512 20131128
#define BOTAN_HAS_SRP6 20131128
#define BOTAN_HAS_STREAM_CIPHER 20131128
#define BOTAN_HAS_SYSTEM_RNG 20141202
#define BOTAN_HAS_TEA 20131128
#define BOTAN_HAS_THREEFISH_512 20131224
#define BOTAN_HAS_THRESHOLD_SECRET_SHARING 20131128
#define BOTAN_HAS_TIGER 20131128
#define BOTAN_HAS_TLS 20150319
#define BOTAN_HAS_TLS_SESSION_MANAGER_SQL_DB 20141219
#define BOTAN_HAS_TLS_V10_PRF 20131128
#define BOTAN_HAS_TLS_V12_PRF 20131128
#define BOTAN_HAS_TRANSFORM 20131209
#define BOTAN_HAS_TWOFISH 20131128
#define BOTAN_HAS_UTIL_FUNCTIONS 20150919
#define BOTAN_HAS_WHIRLPOOL 20131128
#define BOTAN_HAS_X509_CERTIFICATES 20151023
#define BOTAN_HAS_X931_RNG 20131128
#define BOTAN_HAS_X942_PRF 20131128
#define BOTAN_HAS_XTEA 20131128
#define BOTAN_HAS_XTEA_SIMD 20131128

/*
* Local configuration options (if any) follow
*/


#endif
