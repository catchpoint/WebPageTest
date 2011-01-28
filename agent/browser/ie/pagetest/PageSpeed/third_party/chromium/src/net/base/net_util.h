// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef NET_BASE_NET_UTIL_H_
#define NET_BASE_NET_UTIL_H_
#pragma once

#include "build/build_config.h"

#ifdef OS_WIN
#include <windows.h>
#endif

#include <string>
#include <set>
#include <vector>

#include "base/basictypes.h"
#include "base/string16.h"
#include "net/base/escape.h"

struct addrinfo;
class FilePath;
class GURL;

namespace base {
class Time;
}

namespace url_canon {
struct CanonHostInfo;
}

namespace url_parse {
struct Parsed;
}

namespace net {

// Used by FormatUrl to specify handling of certain parts of the url.
typedef uint32 FormatUrlType;
typedef uint32 FormatUrlTypes;

// Nothing is ommitted.
extern const FormatUrlType kFormatUrlOmitNothing;

// If set, any username and password are removed.
extern const FormatUrlType kFormatUrlOmitUsernamePassword;

// If the scheme is 'http://', it's removed.
extern const FormatUrlType kFormatUrlOmitHTTP;

// Omits the path if it is just a slash and there is no query or ref.  This is
// meaningful for non-file "standard" URLs.
extern const FormatUrlType kFormatUrlOmitTrailingSlashOnBareHostname;

// Convenience for omitting all unecessary types.
extern const FormatUrlType kFormatUrlOmitAll;

// Holds a list of ports that should be accepted despite bans.
extern std::set<int> explicitly_allowed_ports;

// Given the full path to a file name, creates a file: URL. The returned URL
// may not be valid if the input is malformed.
GURL FilePathToFileURL(const FilePath& path);

// Converts a file: URL back to a filename that can be passed to the OS. The
// file URL must be well-formed (GURL::is_valid() must return true); we don't
// handle degenerate cases here. Returns true on success, false if it isn't a
// valid file URL. On failure, *file_path will be empty.
bool FileURLToFilePath(const GURL& url, FilePath* file_path);

// Splits an input of the form <host>[":"<port>] into its consitituent parts.
// Saves the result into |*host| and |*port|. If the input did not have
// the optional port, sets |*port| to -1.
// Returns true if the parsing was successful, false otherwise.
// The returned host is NOT canonicalized, and may be invalid. If <host> is
// an IPv6 literal address, the returned host includes the square brackets.
bool ParseHostAndPort(std::string::const_iterator host_and_port_begin,
                      std::string::const_iterator host_and_port_end,
                      std::string* host,
                      int* port);
bool ParseHostAndPort(const std::string& host_and_port,
                      std::string* host,
                      int* port);

// Returns a host:port string for the given URL.
std::string GetHostAndPort(const GURL& url);

// Returns a host[:port] string for the given URL, where the port is omitted
// if it is the default for the URL's scheme.
std::string GetHostAndOptionalPort(const GURL& url);

// Returns the string representation of an address, like "192.168.0.1".
// Returns empty string on failure.
std::string NetAddressToString(const struct addrinfo* net_address);

// Same as NetAddressToString, but additionally includes the port number. For
// example: "192.168.0.1:99" or "[::1]:80".
std::string NetAddressToStringWithPort(const struct addrinfo* net_address);

// Returns the hostname of the current system. Returns empty string on failure.
std::string GetHostName();

// Extracts the unescaped username/password from |url|, saving the results
// into |*username| and |*password|.
void GetIdentityFromURL(const GURL& url,
                        string16* username,
                        string16* password);

// Returns either the host from |url|, or, if the host is empty, the full spec.
std::string GetHostOrSpecFromURL(const GURL& url);

// Return the value of the HTTP response header with name 'name'.  'headers'
// should be in the format that URLRequest::GetResponseHeaders() returns.
// Returns the empty string if the header is not found.
std::wstring GetSpecificHeader(const std::wstring& headers,
                               const std::wstring& name);
std::string GetSpecificHeader(const std::string& headers,
                              const std::string& name);

// Return the value of the HTTP response header field's parameter named
// 'param_name'.  Returns the empty string if the parameter is not found or is
// improperly formatted.
std::wstring GetHeaderParamValue(const std::wstring& field,
                                 const std::wstring& param_name);
std::string GetHeaderParamValue(const std::string& field,
                                const std::string& param_name);

// Return the filename extracted from Content-Disposition header. The following
// formats are tried in order listed below:
//
// 1. RFC 2047
// 2. Raw-8bit-characters :
//    a. UTF-8, b. referrer_charset, c. default os codepage.
// 3. %-escaped UTF-8.
//
// In step 2, if referrer_charset is empty(i.e. unknown), 2b is skipped.
// In step 3, the fallback charsets tried in step 2 are not tried. We
// can consider doing that later.
//
// When a param value is ASCII, but is not in format #1 or format #3 above,
// it is returned as it is unless it's pretty close to two supported
// formats but not well-formed. In that case, an empty string is returned.
//
// In any case, a caller must check for the empty return value and resort to
// another means to get a filename (e.g. url).
//
// This function does not do any escaping and callers are responsible for
// escaping 'unsafe' characters (e.g. (back)slash, colon) as they see fit.
//
// TODO(jungshik): revisit this issue. At the moment, the only caller
// net_util::GetSuggestedFilename and it calls ReplaceIllegalCharacters.  The
// other caller is a unit test. Need to figure out expose this function only to
// net_util_unittest.
//
std::string GetFileNameFromCD(const std::string& header,
                              const std::string& referrer_charset);

// Converts the given host name to unicode characters. This can be called for
// any host name, if the input is not IDN or is invalid in some way, we'll just
// return the ASCII source so it is still usable.
//
// The input should be the canonicalized ASCII host name from GURL. This
// function does NOT accept UTF-8! Its length must also be given (this is
// designed to work on the substring of the host out of a URL spec).
//
// |languages| is a comma separated list of ISO 639 language codes. It
// is used to determine whether a hostname is 'comprehensible' to a user
// who understands languages listed. |host| will be converted to a
// human-readable form (Unicode) ONLY when each component of |host| is
// regarded as 'comprehensible'. Scipt-mixing is not allowed except that
// Latin letters in the ASCII range can be mixed with a limited set of
// script-language pairs (currently Han, Kana and Hangul for zh,ja and ko).
// When |languages| is empty, even that mixing is not allowed.
//
// |offset_for_adjustment| is an offset into |host|, which will be adjusted to
// point at the same logical place in the output string. If this isn't possible
// because it points past the end of |host| or into the middle of a punycode
// sequence, it will be set to std::wstring::npos.  |offset_for_adjustment| may
// be NULL.
std::wstring IDNToUnicode(const char* host,
                          size_t host_len,
                          const std::wstring& languages,
                          size_t* offset_for_adjustment);

// Canonicalizes |host| and returns it.  Also fills |host_info| with
// IP address information.  |host_info| must not be NULL.
std::string CanonicalizeHost(const std::string& host,
                             url_canon::CanonHostInfo* host_info);
std::string CanonicalizeHost(const std::wstring& host,
                             url_canon::CanonHostInfo* host_info);

// Returns true if |host| is not an IP address and is compliant with a set of
// rules based on RFC 1738 and tweaked to be compatible with the real world.
// The rules are:
//   * One or more components separated by '.'
//   * Each component begins and ends with an alphanumeric character
//   * Each component contains only alphanumeric characters and '-' or '_'
//   * The last component does not begin with a digit
//   * Optional trailing dot after last component (means "treat as FQDN")
// If |desired_tld| is non-NULL, the host will only be considered invalid if
// appending it as a trailing component still results in an invalid host.  This
// helps us avoid marking as "invalid" user attempts to open "www.401k.com" by
// typing 4-0-1-k-<ctrl>+<enter>.
//
// NOTE: You should only pass in hosts that have been returned from
// CanonicalizeHost(), or you may not get accurate results.
bool IsCanonicalizedHostCompliant(const std::string& host,
                                  const std::string& desired_tld);

// Call these functions to get the html snippet for a directory listing.
// The return values of both functions are in UTF-8.
std::string GetDirectoryListingHeader(const string16& title);

// Given the name of a file in a directory (ftp or local) and
// other information (is_dir, size, modification time), it returns
// the html snippet to add the entry for the file to the directory listing.
// Currently, it's a script tag containing a call to a Javascript function
// |addRow|.
//
// |name| is the file name to be displayed. |raw_bytes| will be used
// as the actual target of the link (so for example, ftp links should use
// server's encoding). If |raw_bytes| is an empty string, UTF-8 encoded |name|
// will be used.
//
// Both |name| and |raw_bytes| are escaped internally.
std::string GetDirectoryListingEntry(const string16& name,
                                     const std::string& raw_bytes,
                                     bool is_dir, int64 size,
                                     base::Time modified);

// If text starts with "www." it is removed, otherwise text is returned
// unmodified.
std::wstring StripWWW(const std::wstring& text);

// Gets the filename from the raw Content-Disposition header (as read from the
// network).  Otherwise uses the last path component name or hostname from
// |url|. If there is no filename or it can't be used, the given |default_name|,
// will be used unless it is empty.

// Note: it's possible for the suggested filename to be empty (e.g.,
// file:///). referrer_charset is used as one of charsets
// to interpret a raw 8bit string in C-D header (after interpreting
// as UTF-8 fails). See the comment for GetFilenameFromCD for more details.
FilePath GetSuggestedFilename(const GURL& url,
                              const std::string& content_disposition,
                              const std::string& referrer_charset,
                              const FilePath& default_name);

// Checks the given port against a list of ports which are restricted by
// default.  Returns true if the port is allowed, false if it is restricted.
bool IsPortAllowedByDefault(int port);

// Checks the given port against a list of ports which are restricted by the
// FTP protocol.  Returns true if the port is allowed, false if it is
// restricted.
bool IsPortAllowedByFtp(int port);

// Check if banned |port| has been overriden by an entry in
// |explicitly_allowed_ports_|.
bool IsPortAllowedByOverride(int port);

// Set socket to non-blocking mode
int SetNonBlocking(int fd);

// Appends the given part of the original URL to the output string formatted for
// the user. The given parsed structure will be updated. The host name formatter
// also takes the same accept languages component as ElideURL. |new_parsed| may
// be null.
void AppendFormattedHost(const GURL& url,
                         const std::wstring& languages,
                         std::wstring* output,
                         url_parse::Parsed* new_parsed,
                         size_t* offset_for_adjustment);

// Creates a string representation of |url|. The IDN host name may be in Unicode
// if |languages| accepts the Unicode representation. |format_type| is a bitmask
// of FormatUrlTypes, see it for details. |unescape_rules| defines how to clean
// the URL for human readability. You will generally want |UnescapeRule::SPACES|
// for display to the user if you can handle spaces, or |UnescapeRule::NORMAL|
// if not. If the path part and the query part seem to be encoded in %-encoded
// UTF-8, decodes %-encoding and UTF-8.
//
// The last three parameters may be NULL.
// |new_parsed| will be set to the parsing parameters of the resultant URL.
// |prefix_end| will be the length before the hostname of the resultant URL.
// |offset_for_adjustment| is an offset into the original |url|'s spec(), which
// will be modified to reflect changes this function makes to the output string;
// for example, if |url| is "http://a:b@c.com/", |omit_username_password| is
// true, and |offset_for_adjustment| is 12 (the offset of '.'), then on return
// the output string will be "http://c.com/" and |offset_for_adjustment| will be
// 8.  If the offset cannot be successfully adjusted (e.g. because it points
// into the middle of a component that was entirely removed, past the end of the
// string, or into the middle of an encoding sequence), it will be set to
// std::wstring::npos.
std::wstring FormatUrl(const GURL& url,
                       const std::wstring& languages,
                       FormatUrlTypes format_types,
                       UnescapeRule::Type unescape_rules,
                       url_parse::Parsed* new_parsed,
                       size_t* prefix_end,
                       size_t* offset_for_adjustment);

// This is a convenience function for FormatUrl() with
// format_types = kFormatUrlOmitAll and unescape = SPACES.  This is the typical
// set of flags for "URLs to display to the user".  You should be cautious about
// using this for URLs which will be parsed or sent to other applications.
inline std::wstring FormatUrl(const GURL& url, const std::wstring& languages) {
  return FormatUrl(url, languages, kFormatUrlOmitAll, UnescapeRule::SPACES,
                   NULL, NULL, NULL);
}

// Returns whether FormatUrl() would strip a trailing slash from |url|, given a
// format flag including kFormatUrlOmitTrailingSlashOnBareHostname.
bool CanStripTrailingSlash(const GURL& url);

// Strip the portions of |url| that aren't core to the network request.
//   - user name / password
//   - reference section
GURL SimplifyUrlForRequest(const GURL& url);

void SetExplicitlyAllowedPorts(const std::string& allowed_ports);

// Perform a simplistic test to see if IPv6 is supported by trying to create an
// IPv6 socket.
// TODO(jar): Make test more in-depth as needed.
bool IPv6Supported();

// Returns true if it can determine that only loopback addresses are configured.
// i.e. if only 127.0.0.1 and ::1 are routable.
bool HaveOnlyLoopbackAddresses();

// IPAddressNumber is used to represent an IP address's numeric value as an
// array of bytes, from most significant to least significant. This is the
// network byte ordering.
//
// IPv4 addresses will have length 4, whereas IPv6 address will have length 16.
typedef std::vector<unsigned char> IPAddressNumber;

// Parses an IP address literal (either IPv4 or IPv6) to its numeric value.
// Returns true on success and fills |ip_number| with the numeric value.
bool ParseIPLiteralToNumber(const std::string& ip_literal,
                            IPAddressNumber* ip_number);

// Converts an IPv4 address to an IPv4-mapped IPv6 address.
// For example 192.168.0.1 would be converted to ::ffff:192.168.0.1.
IPAddressNumber ConvertIPv4NumberToIPv6Number(
    const IPAddressNumber& ipv4_number);

// Parses an IP block specifier from CIDR notation to an
// (IP address, prefix length) pair. Returns true on success and fills
// |*ip_number| with the numeric value of the IP address and sets
// |*prefix_length_in_bits| with the length of the prefix.
//
// CIDR notation literals can use either IPv4 or IPv6 literals. Some examples:
//
//    10.10.3.1/20
//    a:b:c::/46
//    ::1/128
bool ParseCIDRBlock(const std::string& cidr_literal,
                    IPAddressNumber* ip_number,
                    size_t* prefix_length_in_bits);

// Compares an IP address to see if it falls within the specified IP block.
// Returns true if it does, false otherwise.
//
// The IP block is given by (|ip_prefix|, |prefix_length_in_bits|) -- any
// IP address whose |prefix_length_in_bits| most significant bits match
// |ip_prefix| will be matched.
//
// In cases when an IPv4 address is being compared to an IPv6 address prefix
// and vice versa, the IPv4 addresses will be converted to IPv4-mapped
// (IPv6) addresses.
bool IPNumberMatchesPrefix(const IPAddressNumber& ip_number,
                           const IPAddressNumber& ip_prefix,
                           size_t prefix_length_in_bits);

// Returns the port field of the sockaddr in |info|.
uint16* GetPortFieldFromAddrinfo(const struct addrinfo* info);

// Returns the value of |info's| port (in host byte ordering).
int GetPortFromAddrinfo(const struct addrinfo* info);

}  // namespace net

#endif  // NET_BASE_NET_UTIL_H_
