// Copyright 2009 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "pagespeed/rules/minimize_redirects.h"

#include <map>
#include <set>
#include <string>
#include <vector>

#include "base/logging.h"
#include "googleurl/src/gurl.h"
#include "googleurl/src/url_canon.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/core/uri_util.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace {

const char* kRuleName = "MinimizeRedirects";

class RedirectGraph {
 public:
  RedirectGraph() {}
  void AddResource(const pagespeed::Resource& resource);
  void AppendRedirectChainResults(pagespeed::ResultProvider* provider);

 private:
  // Build a prioritized vector of possible roots.
  // This vector should contain all redirect sources, but give
  // priority to those that are not redirect targets.  We cannot
  // exclude all redirect targets because we would like to warn about
  // pure redirect loops.
  void GetPriorizedRoots(std::vector<std::string>* roots);
  void PopulateRedirectChainResult(const std::string& root,
                                   pagespeed::Result* result);

  typedef std::map<std::string, std::vector<std::string> > RedirectMap;
  RedirectMap redirect_map_;
  std::set<std::string> destinations_;
  std::set<std::string> processed_;
};

void RedirectGraph::AddResource(const pagespeed::Resource& resource) {
  std::string destination =
      pagespeed::resource_util::GetRedirectedUrl(resource);
  if (!destination.empty()) {
    redirect_map_[resource.GetRequestUrl()].push_back(destination);
    destinations_.insert(destination);
  }
}

void RedirectGraph::AppendRedirectChainResults(
    pagespeed::ResultProvider* provider) {
  std::vector<std::string> roots;
  GetPriorizedRoots(&roots);

  // compute chains
  for (std::vector<std::string>::const_iterator it = roots.begin(),
           end = roots.end();
       it != end;
       ++it) {
    if (processed_.find(*it) != processed_.end()) {
      continue;
    }

    PopulateRedirectChainResult(*it, provider->NewResult());
  }
}

void RedirectGraph::GetPriorizedRoots(std::vector<std::string>* roots) {
  std::vector<std::string> primary_roots, secondary_roots;
  for (RedirectMap::const_iterator it = redirect_map_.begin(),
           end = redirect_map_.end();
       it != end;
       ++it) {
    const std::string& root = it->first;
    if (destinations_.find(root) == destinations_.end()) {
      primary_roots.push_back(root);
    } else {
      secondary_roots.push_back(root);
    }
  }
  roots->insert(roots->end(), primary_roots.begin(), primary_roots.end());
  roots->insert(roots->end(), secondary_roots.begin(), secondary_roots.end());
}

void RedirectGraph::PopulateRedirectChainResult(const std::string& root,
                                                pagespeed::Result* result) {
  // Perform a DFS on the redirect graph.
  std::vector<std::string> work_stack;
  work_stack.push_back(root);
  while (!work_stack.empty()) {
    std::string current = work_stack.back();
    work_stack.pop_back();
    result->add_resource_urls(current);

    // detect and break loops.
    if (processed_.find(current) != processed_.end()) {
      continue;
    }
    processed_.insert(current);

    // add backwards so direct decendents are traversed in
    // alphabetical order.
    const std::vector<std::string>& targets = redirect_map_[current];
    work_stack.insert(work_stack.end(), targets.rbegin(), targets.rend());
  }

  pagespeed::Savings* savings = result->mutable_savings();
  savings->set_requests_saved(result->resource_urls_size() - 1);
}

}  // namespace

namespace pagespeed {

namespace rules {

MinimizeRedirects::MinimizeRedirects()
    : pagespeed::Rule(pagespeed::InputCapabilities()) {
}

const char* MinimizeRedirects::name() const {
  return kRuleName;
}

const char* MinimizeRedirects::header() const {
  return "Minimize redirects";
}

const char* MinimizeRedirects::documentation_url() const {
  return "rtt.html#AvoidRedirects";
}

/**
 * Gather redirects to compute the redirect graph, then traverse the
 * redirect graph and append a result for each redirect sequence
 * found.
 * In the case of redirect loops, traversal stops when trying to
 * process an URL that has already been visited.
 *
 * Examples:
 *   Redirect chain:
 *     input:  a -> b, b -> c
 *     output: a, b, c
 *
 *   Redirect loop:
 *     input:  a -> b, b -> c, c -> a
 *     output: a, b, c, a
 *
 *   Redirect diamond:
 *     input:  a -> [b, c], b -> d, c -> d
 *     output: a, b, d, c, d
 */
bool MinimizeRedirects::AppendResults(const PagespeedInput& input,
                                      ResultProvider* provider) {
  RedirectGraph redirect_graph;
  for (int idx = 0, num = input.num_resources(); idx < num; ++idx) {
    redirect_graph.AddResource(input.GetResource(idx));
  }

  redirect_graph.AppendRedirectChainResults(provider);
  return true;
}

void MinimizeRedirects::FormatResults(const ResultVector& results,
                                      Formatter* formatter) {
  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    Formatter* body = formatter->AddChild(
        "Remove the following redirect chain if possible:");

    const Result& result = **iter;
    for (int url_idx = 0; url_idx < result.resource_urls_size(); url_idx++) {
      Argument url(Argument::URL, result.resource_urls(url_idx));
      body->AddChild("$1", url);
    }
  }
}

}  // namespace rules

}  // namespace pagespeed
