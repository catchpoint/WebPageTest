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

#include "pagespeed/rules/rule_provider.h"

#include "pagespeed/rules/avoid_bad_requests.h"
#include "pagespeed/rules/avoid_css_import.h"
#include "pagespeed/rules/avoid_document_write.h"
#include "pagespeed/rules/combine_external_resources.h"
#include "pagespeed/rules/enable_gzip_compression.h"
#include "pagespeed/rules/leverage_browser_caching.h"
#include "pagespeed/rules/minify_css.h"
#include "pagespeed/rules/minify_html.h"
#include "pagespeed/rules/minify_javascript.h"
#include "pagespeed/rules/minimize_dns_lookups.h"
#include "pagespeed/rules/minimize_redirects.h"
#include "pagespeed/rules/minimize_request_size.h"
#include "pagespeed/rules/optimize_images.h"
#include "pagespeed/rules/optimize_the_order_of_styles_and_scripts.h"
#include "pagespeed/rules/parallelize_downloads_across_hostnames.h"
#include "pagespeed/rules/prefer_async_resources.h"
#include "pagespeed/rules/put_css_in_the_document_head.h"
#include "pagespeed/rules/remove_query_strings_from_static_resources.h"
#include "pagespeed/rules/serve_resources_from_a_consistent_url.h"
#include "pagespeed/rules/serve_scaled_images.h"
#include "pagespeed/rules/serve_static_content_from_a_cookieless_domain.h"
#include "pagespeed/rules/specify_a_cache_validator.h"
#include "pagespeed/rules/specify_a_vary_accept_encoding_header.h"
#include "pagespeed/rules/specify_charset_early.h"
#include "pagespeed/rules/specify_image_dimensions.h"
#include "pagespeed/rules/sprite_images.h"

namespace pagespeed {

namespace rule_provider {

void AppendAllRules(bool save_optimized_content, std::vector<Rule*>* rules) {
  rules->push_back(new rules::AvoidBadRequests());
  rules->push_back(new rules::AvoidCssImport());
  rules->push_back(new rules::AvoidDocumentWrite());
  rules->push_back(new rules::CombineExternalCSS());
  rules->push_back(new rules::CombineExternalJavaScript());
  rules->push_back(new rules::EnableGzipCompression(
      new rules::compression_computer::ZlibComputer()));
  rules->push_back(new rules::LeverageBrowserCaching());
  rules->push_back(new rules::MinifyCSS(save_optimized_content));
  rules->push_back(new rules::MinifyHTML(save_optimized_content));
  rules->push_back(new rules::MinifyJavaScript(save_optimized_content));
  rules->push_back(new rules::MinimizeDnsLookups());
  rules->push_back(new rules::MinimizeRedirects());
  rules->push_back(new rules::MinimizeRequestSize());
  rules->push_back(new rules::OptimizeImages(save_optimized_content));
  rules->push_back(new rules::OptimizeTheOrderOfStylesAndScripts());
  rules->push_back(new rules::ParallelizeDownloadsAcrossHostnames());
  rules->push_back(new rules::PreferAsyncResources());
  rules->push_back(new rules::PutCssInTheDocumentHead);
  rules->push_back(new rules::RemoveQueryStringsFromStaticResources());
  rules->push_back(new rules::ServeResourcesFromAConsistentUrl());
  rules->push_back(new rules::ServeScaledImages);
  rules->push_back(new rules::ServeStaticContentFromACookielessDomain());
  rules->push_back(new rules::SpecifyACacheValidator());
  rules->push_back(new rules::SpecifyAVaryAcceptEncodingHeader());
  rules->push_back(new rules::SpecifyCharsetEarly());
  rules->push_back(new rules::SpecifyImageDimensions);
  rules->push_back(new rules::SpriteImages);
}

void AppendCompatibleRules(bool save_optimized_content,
                           std::vector<Rule*>* rules,
                           std::vector<std::string>* incompatible_rule_names,
                           const pagespeed::InputCapabilities& capabilities) {
  std::vector<Rule*> all_rules;
  AppendAllRules(save_optimized_content, &all_rules);
  for (std::vector<Rule*>::const_iterator it = all_rules.begin(),
           end = all_rules.end();
       it != end;
       ++it) {
    Rule* r = *it;
    if (capabilities.satisfies(r->capability_requirements())) {
      rules->push_back(r);
    } else {
      incompatible_rule_names->push_back(r->name());
      delete r;
    }
  }
}

}  // namespace rule_provider

}  // namespace pagespeed
