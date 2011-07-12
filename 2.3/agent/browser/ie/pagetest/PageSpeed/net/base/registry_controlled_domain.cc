//* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Effective-TLD Service
 *
 * The Initial Developer of the Original Code is
 * Google Inc.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Pamela Greene <pamg.bugs@gmail.com> (original author)
 *   Daniel Witte <dwitte@stanford.edu>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

#include "net/base/registry_controlled_domain.h"

#include "base/logging.h"
#ifdef __native_client__
#include "base/scoped_ptr.h"
#else
#include "base/singleton.h"
#endif
#include "base/string_util.h"
#include "googleurl/src/gurl.h"
#include "googleurl/src/url_parse.h"
#include "net/base/net_module.h"
#include "net/base/net_util.h"

#include "effective_tld_names.cc"

namespace net {

static const int kExceptionRule = 1;
static const int kWildcardRule = 2;

RegistryControlledDomainService::RegistryControlledDomainService()
    : find_domain_function_(Perfect_Hash::FindDomain) {
}

// static
std::string RegistryControlledDomainService::GetDomainAndRegistry(
    const GURL& gurl) {
  const url_parse::Component host =
      gurl.parsed_for_possibly_invalid_spec().host;
  if ((host.len <= 0) || gurl.HostIsIPAddress())
    return std::string();
  return GetDomainAndRegistryImpl(std::string(
      gurl.possibly_invalid_spec().data() + host.begin, host.len));
}

#ifdef CANONICALIZE_HOST_DEPENDENCY
// static
std::string RegistryControlledDomainService::GetDomainAndRegistry(
    const std::string& host) {
  url_canon::CanonHostInfo host_info;
  const std::string canon_host(net::CanonicalizeHost(host, &host_info));
  if (canon_host.empty() || host_info.IsIPAddress())
    return std::string();
  return GetDomainAndRegistryImpl(canon_host);
}

// static
std::string RegistryControlledDomainService::GetDomainAndRegistry(
    const std::wstring& host) {
  url_canon::CanonHostInfo host_info;
  const std::string canon_host(net::CanonicalizeHost(host, &host_info));
  if (canon_host.empty() || host_info.IsIPAddress())
    return std::string();
  return GetDomainAndRegistryImpl(canon_host);
}
#endif  // CANONICALIZE_HOST_DEPENDENCY

// static
bool RegistryControlledDomainService::SameDomainOrHost(const GURL& gurl1,
                                                       const GURL& gurl2) {
  // See if both URLs have a known domain + registry, and those values are the
  // same.
  const std::string domain1(GetDomainAndRegistry(gurl1));
  const std::string domain2(GetDomainAndRegistry(gurl2));
  if (!domain1.empty() || !domain2.empty())
    return domain1 == domain2;

  // No domains.  See if the hosts are identical.
  const url_parse::Component host1 =
      gurl1.parsed_for_possibly_invalid_spec().host;
  const url_parse::Component host2 =
      gurl2.parsed_for_possibly_invalid_spec().host;
  if ((host1.len <= 0) || (host1.len != host2.len))
    return false;
  return !strncmp(gurl1.possibly_invalid_spec().data() + host1.begin,
                  gurl2.possibly_invalid_spec().data() + host2.begin,
                  host1.len);
}

// static
size_t RegistryControlledDomainService::GetRegistryLength(
    const GURL& gurl,
    bool allow_unknown_registries) {
  const url_parse::Component host =
      gurl.parsed_for_possibly_invalid_spec().host;
  if (host.len <= 0)
    return std::string::npos;
  if (gurl.HostIsIPAddress())
    return 0;
  return GetInstance()->GetRegistryLengthImpl(
      std::string(gurl.possibly_invalid_spec().data() + host.begin, host.len),
      allow_unknown_registries);
}

#ifdef CANONICALIZE_HOST_DEPENDENCY
// static
size_t RegistryControlledDomainService::GetRegistryLength(
    const std::string& host,
    bool allow_unknown_registries) {
  url_canon::CanonHostInfo host_info;
  const std::string canon_host(net::CanonicalizeHost(host, &host_info));
  if (canon_host.empty())
    return std::string::npos;
  if (host_info.IsIPAddress())
    return 0;
  return GetInstance()->GetRegistryLengthImpl(canon_host,
                                              allow_unknown_registries);
}

// static
size_t RegistryControlledDomainService::GetRegistryLength(
    const std::wstring& host,
    bool allow_unknown_registries) {
  url_canon::CanonHostInfo host_info;
  const std::string canon_host(net::CanonicalizeHost(host, &host_info));
  if (canon_host.empty())
    return std::string::npos;
  if (host_info.IsIPAddress())
    return 0;
  return GetInstance()->GetRegistryLengthImpl(canon_host,
                                              allow_unknown_registries);
}
#endif  // CANONICALIZE_HOST_DEPENDENCY

// static
std::string RegistryControlledDomainService::GetDomainAndRegistryImpl(
    const std::string& host) {
  DCHECK(!host.empty());

  // Find the length of the registry for this host.
  const size_t registry_length =
      GetInstance()->GetRegistryLengthImpl(host, true);
  if ((registry_length == std::string::npos) || (registry_length == 0))
    return std::string();  // No registry.
  // The "2" in this next line is 1 for the dot, plus a 1-char minimum preceding
  // subcomponent length.
  DCHECK(host.length() >= 2);
  if (registry_length > (host.length() - 2)) {
    NOTREACHED() <<
        "Host does not have at least one subcomponent before registry!";
    return std::string();
  }

  // Move past the dot preceding the registry, and search for the next previous
  // dot.  Return the host from after that dot, or the whole host when there is
  // no dot.
  const size_t dot = host.rfind('.', host.length() - registry_length - 2);
  if (dot == std::string::npos)
    return host;
  return host.substr(dot + 1);
}

size_t RegistryControlledDomainService::GetRegistryLengthImpl(
    const std::string& host,
    bool allow_unknown_registries) {
  DCHECK(!host.empty());

  // Skip leading dots.
  const size_t host_check_begin = host.find_first_not_of('.');
  if (host_check_begin == std::string::npos)
    return 0;  // Host is only dots.

  // A single trailing dot isn't relevant in this determination, but does need
  // to be included in the final returned length.
  size_t host_check_len = host.length();
  if (host[host_check_len - 1] == '.') {
    --host_check_len;
    DCHECK(host_check_len > 0);  // If this weren't true, the host would be ".",
                                 // and we'd have already returned above.
    if (host[host_check_len - 1] == '.')
      return 0;  // Multiple trailing dots.
  }

  // Walk up the domain tree, most specific to least specific,
  // looking for matches at each level.
  size_t prev_start = std::string::npos;
  size_t curr_start = host_check_begin;
  size_t next_dot = host.find('.', curr_start);
  if (next_dot >= host_check_len)  // Catches std::string::npos as well.
    return 0;  // This can't have a registry + domain.
  while (1) {
    const char* domain_str = host.data() + curr_start;
    int domain_length = host_check_len - curr_start;
    const DomainRule* rule = find_domain_function_(domain_str, domain_length);

    // We need to compare the string after finding a match because the
    // no-collisions of perfect hashing only refers to items in the set.  Since
    // we're searching for arbitrary domains, there could be collisions.
    if (rule &&
        base::strncasecmp(domain_str, rule->name, domain_length) == 0) {
      // Exception rules override wildcard rules when the domain is an exact
      // match, but wildcards take precedence when there's a subdomain.
      if (rule->type == kWildcardRule && (prev_start != std::string::npos)) {
        // If prev_start == host_check_begin, then the host is the registry
        // itself, so return 0.
        return (prev_start == host_check_begin) ?
            0 : (host.length() - prev_start);
      }

      if (rule->type == kExceptionRule) {
        if (next_dot == std::string::npos) {
          // If we get here, we had an exception rule with no dots (e.g.
          // "!foo").  This would only be valid if we had a corresponding
          // wildcard rule, which would have to be "*".  But we explicitly
          // disallow that case, so this kind of rule is invalid.
          NOTREACHED() << "Invalid exception rule";
          return 0;
        }
        return host.length() - next_dot - 1;
      }

      // If curr_start == host_check_begin, then the host is the registry
      // itself, so return 0.
      return (curr_start == host_check_begin) ?
          0 : (host.length() - curr_start);
    }

    if (next_dot >= host_check_len)  // Catches std::string::npos as well.
      break;

    prev_start = curr_start;
    curr_start = next_dot + 1;
    next_dot = host.find('.', curr_start);
  }

  // No rule found in the registry.  curr_start now points to the first
  // character of the last subcomponent of the host, so if we allow unknown
  // registries, return the length of this subcomponent.
  return allow_unknown_registries ? (host.length() - curr_start) : 0;
}

static RegistryControlledDomainService* test_instance_;

// static
RegistryControlledDomainService* RegistryControlledDomainService::SetInstance(
    RegistryControlledDomainService* instance) {
  RegistryControlledDomainService* old_instance = test_instance_;
  test_instance_ = instance;
  return old_instance;
}

#ifdef __native_client__
namespace {

scoped_ptr<RegistryControlledDomainService> gService;

// Circumvent RegistryControlledDomainService's protected constructor.  We are
// _not_ supposed to do this for non-testing purposes, but Singleton doesn't
// seem to work in Native Client, so we have little choice.
class EvilRCDS : public RegistryControlledDomainService {
 public:
  EvilRCDS() {}
 private:
  DISALLOW_COPY_AND_ASSIGN(EvilRCDS);
};

}  // namespace
#endif

// static
RegistryControlledDomainService* RegistryControlledDomainService::GetInstance()
{
  if (test_instance_)
    return test_instance_;

#ifdef __native_client__
  // This is probably not thread-safe, so don't use threads when we're in NaCl.
  if (gService == NULL) {
    gService.reset(new EvilRCDS);
  }
  return gService.get();
#else
  return Singleton<RegistryControlledDomainService>::get();
#endif
}

// static
void RegistryControlledDomainService::UseFindDomainFunction(
    FindDomainPtr function) {
  RegistryControlledDomainService* instance = GetInstance();
  instance->find_domain_function_ = function;
}

}  // namespace net
