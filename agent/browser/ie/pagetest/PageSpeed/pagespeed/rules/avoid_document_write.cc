// Copyright 2010 Google Inc. All Rights Reserved.
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

#include "pagespeed/rules/avoid_document_write.h"

#include <algorithm>

#include "base/logging.h"
#include "net/instaweb/htmlparse/public/html_parse.h"
#include "net/instaweb/htmlparse/public/empty_html_filter.h"
#include "net/instaweb/util/public/google_message_handler.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/image_attributes.h"
#include "pagespeed/core/javascript_call_info.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/core/uri_util.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace {

class ExternalResourceFilter : public net_instaweb::EmptyHtmlFilter {
 public:
  ExternalResourceFilter(net_instaweb::HtmlParse* html_parse);

  virtual void StartDocument();
  virtual void StartElement(net_instaweb::HtmlElement* element);
  virtual const char* Name() const { return "ExternalResource"; }

  // Get the URLs of resources referenced by the parsed HTML.
  bool GetExternalResourceUrls(std::vector<std::string>* out) const;

 private:
  net_instaweb::Atom script_atom_;
  net_instaweb::Atom src_atom_;
  net_instaweb::Atom link_atom_;
  net_instaweb::Atom rel_atom_;
  net_instaweb::Atom href_atom_;
  std::vector<std::string> external_resource_urls_;

  DISALLOW_COPY_AND_ASSIGN(ExternalResourceFilter);
};

ExternalResourceFilter::ExternalResourceFilter(
    net_instaweb::HtmlParse* html_parse)
    : script_atom_(html_parse->Intern("script")),
      src_atom_(html_parse->Intern("src")),
      link_atom_(html_parse->Intern("link")),
      rel_atom_(html_parse->Intern("rel")),
      href_atom_(html_parse->Intern("href")) {
}

void ExternalResourceFilter::StartDocument() {
  external_resource_urls_.clear();
}

void ExternalResourceFilter::StartElement(net_instaweb::HtmlElement* element) {
  net_instaweb::Atom tag = element->tag();
  if (tag == script_atom_) {
    const char* src = element->AttributeValue(src_atom_);
    if (src != NULL) {
      external_resource_urls_.push_back(src);
    }
    return;
  }

  if (tag == link_atom_) {
    const char* rel = element->AttributeValue(rel_atom_);
    if (!LowerCaseEqualsASCII(rel, "stylesheet")) {
      return;
    }
    const char* href = element->AttributeValue(href_atom_);
    if (href != NULL) {
      external_resource_urls_.push_back(href);
    }
    return;
  }
}

bool ExternalResourceFilter::GetExternalResourceUrls(
    std::vector<std::string>* out) const {
  *out = external_resource_urls_;
  return !out->empty();
}

void ResolveExternalResourceUrls(
    std::vector<std::string>* external_resource_urls,
    const DomDocument* document,
    const std::string& document_url) {
  // Resolve URLs relative to their document.
  for (std::vector<std::string>::iterator
           it = external_resource_urls->begin(),
           end = external_resource_urls->end();
       it != end;
       ++it) {
    std::string resolved_uri;
    if (!uri_util::ResolveUriForDocumentWithUrl(*it,
                                                document,
                                                document_url,
                                                &resolved_uri)) {
      // We failed to resolve relative to the document, so try to
      // resolve relative to the document's URL. This will be
      // correct unless the document contains a <base> tag.
      resolved_uri = uri_util::ResolveUri(*it, document_url);
    }
    *it = resolved_uri;
  }
}

bool IsLikelyTrackingPixel(const PagespeedInput& input,
                           const Resource& resource) {
  if (resource.GetResponseBody().length() == 0) {
    // An image resource with no body is almost certainly being used
    // for tracking.
    return true;
  }

  scoped_ptr<ImageAttributes> attributes(
      input.NewImageAttributes(&resource));
  if (attributes == NULL) {
    // This can happen if the image response doesn't decode properly.
    LOG(INFO) << "Unable to compute image attributes for "
              << resource.GetRequestUrl();
    return false;
  }

  // Tracking pixels tend to be 1x1 images. We also check for 0x0
  // images in case some formats might support that size.
  return
      (attributes->GetImageWidth() == 0 || attributes->GetImageWidth() == 1) &&
      (attributes->GetImageHeight() == 0 || attributes->GetImageHeight() == 1);
}

// Gets an iterator in sibling_resources for the last resource found
// in external_resource_urls, or sibling_resources.end() if none of
// the resources in external_resource_urls could be found in
// sibling_resources.
ResourceVector::const_iterator FindLastExternalResourceInSiblingResources(
    const PagespeedInput& input,
    const std::vector<std::string>& external_resource_urls,
    const ResourceVector& sibling_resources) {
  // We want to find the last of the written resources in the
  // sibling_resources vector, so we iterate in reverse order.
  for (std::vector<std::string>::const_reverse_iterator it =
           external_resource_urls.rbegin(), end = external_resource_urls.rend();
       it != end;
       ++it) {
    const Resource* last_written_resource = input.GetResourceWithUrl(*it);
    if (last_written_resource == NULL) {
      LOG(INFO) << "Unable to find " << *it;
      continue;
    }
    if (last_written_resource->GetResourceType() == REDIRECT) {
      last_written_resource =
          resource_util::GetLastResourceInRedirectChain(
              input, *last_written_resource);
      if (last_written_resource == NULL) {
        LOG(INFO) << "Unable to find last redirected resource for " << *it;
        continue;
      }
    }

    // We found a resource. Now make sure that resource appears in the
    // sibling_resources vector.
    ResourceVector::const_iterator sib_it = find(sibling_resources.begin(),
                                                 sibling_resources.end(),
                                                 last_written_resource);
    if (sib_it != sibling_resources.end()) {
      return sib_it;
    }
  }

  // We failed to find any resources with a URL in
  // external_resource_urls.
  return sibling_resources.end();
}

bool DocumentContainsUserVisibleResource(const PagespeedInput& input,
                                         const Resource& resource);

bool IsUserVisibleResource(const PagespeedInput& input,
                           const Resource& resource) {
  // TODO: we would also flag if there is any text content after a
  // resource, since rendering of that text is blocked on this
  // fetch. That would require walking the DOM and having a DOM API to
  // get text nodes. For now we just look for resources after our
  // resource that were loaded before onload.
  switch (resource.GetResourceType()) {
    case IMAGE:
      return !IsLikelyTrackingPixel(input, resource);
    case HTML:
      return DocumentContainsUserVisibleResource(input, resource);
    case TEXT:
    case FLASH:
      return true;
    default:
      return false;
  }
}

bool DocumentContainsUserVisibleResource(const PagespeedInput& input,
                                         const Resource& resource) {
  DCHECK(resource.GetResourceType() == HTML);
  const ParentChildResourceMap::const_iterator pcrm_it =
      input.GetParentChildResourceMap()->find(&resource);
  if (pcrm_it == input.GetParentChildResourceMap()->end()) {
    LOG(INFO) << "Failed to find " << resource.GetRequestUrl()
              << " in parent-child resource map.";
    return false;
  }
  for (ResourceVector::const_iterator it = pcrm_it->second.begin(),
           end = pcrm_it->second.end();
       it != end;
       ++it) {
    const Resource* child = *it;
    if (IsUserVisibleResource(input, *child)) {
      return true;
    }
  }
  return false;
}

// Does the given set of external resource URLs, written into the
// document via document.write(), block the renderer? They block the
// renderer if there is additional user-visible content that comes
// after them in the document (e.g. images, text, etc).
bool DoesBlockRender(const PagespeedInput& input,
                     const std::string& document_url,
                     const std::vector<std::string>& external_resource_urls) {
  const Resource* parent_resource = input.GetResourceWithUrl(document_url);
  if (parent_resource == NULL) {
    LOG(INFO) << "Unable to find document " << document_url;
    return false;
  }
  if (parent_resource->GetResourceType() == REDIRECT) {
    parent_resource = resource_util::GetLastResourceInRedirectChain(
        input, *parent_resource);
  }
  if (parent_resource == NULL) {
    LOG(INFO) << "Unable to find document " << document_url;
    return false;
  }
  DCHECK(parent_resource->GetResourceType() == HTML);

  const ParentChildResourceMap::const_iterator pcrm_it =
      input.GetParentChildResourceMap()->find(parent_resource);
  if (pcrm_it == input.GetParentChildResourceMap()->end()) {
    LOG(INFO) << "Unable to find parent-resource map entry for "
              << parent_resource->GetRequestUrl();
    return false;
  }

  // Attempt to find one of the resources that was document.written()
  // in the set of sibling resources.
  const ResourceVector& sibling_resources = pcrm_it->second;
  ResourceVector::const_iterator sib_it =
      FindLastExternalResourceInSiblingResources(
          input, external_resource_urls, sibling_resources);
  if (sib_it == sibling_resources.end()) {
    LOG(INFO) << "Unable to find any external resources among siblings.";
    return false;
  }

  // Advance past the last_written_resource to the next resource in
  // the set of siblings.
  ++sib_it;

  // Now iterate over the resources that were loaded after the
  // document.written() resource, looking for one that contains
  // user-visible content.
  for (ResourceVector::const_iterator sib_end = sibling_resources.end();
       sib_it != sib_end;
       ++sib_it) {
    const Resource* peer_resource = *sib_it;
    if (peer_resource->IsLazyLoaded()) {
      // If the resource was lazy loaded, it must have been inserted
      // into the document after onload, so we should not consider
      // it.
      continue;
    }
    if (IsUserVisibleResource(input, *peer_resource)) {
      return true;
    }
  }

  // We did not find any blocked resources.
  return false;
}

}  // namespace

namespace rules {

AvoidDocumentWrite::AvoidDocumentWrite()
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::DOM |
        pagespeed::InputCapabilities::JS_CALLS_DOCUMENT_WRITE |
        pagespeed::InputCapabilities::LAZY_LOADED |
        pagespeed::InputCapabilities::PARENT_CHILD_RESOURCE_MAP |
        pagespeed::InputCapabilities::JS_CALLS_DOCUMENT_WRITE)) {
}

const char* AvoidDocumentWrite::name() const {
  return "AvoidDocumentWrite";
}

const char* AvoidDocumentWrite::header() const {
  return "Avoid document.write";
}

const char* AvoidDocumentWrite::documentation_url() const {
  return "rtt.html#AvoidDocumentWrite";
}

bool AvoidDocumentWrite::AppendResults(const PagespeedInput& input,
                                       ResultProvider* provider) {
  bool error = false;
  net_instaweb::GoogleMessageHandler message_handler;
  message_handler.set_min_message_type(net_instaweb::kError);
  net_instaweb::HtmlParse html_parse(&message_handler);
  ExternalResourceFilter filter(&html_parse);
  html_parse.AddFilter(&filter);

  for (int i = 0, num = input.num_resources(); i < num; ++i) {
    const Resource& resource = input.GetResource(i);
    if (resource.IsLazyLoaded()) {
      continue;
    }
    const std::vector<const JavaScriptCallInfo*>* calls =
        resource.GetJavaScriptCalls("document.write");
    if (calls == NULL || calls->size() == 0) {
      continue;
    }

    for (std::vector<const JavaScriptCallInfo*>::const_iterator it =
             calls->begin(), end = calls->end();
         it != end;
         ++it) {
      const JavaScriptCallInfo* call = *it;
      if (call->args().size() != 1) {
        LOG(DFATAL) << "Unexpected number of JS args.";
        error = true;
        continue;
      }

      const std::string& src = call->args()[0];
      html_parse.StartParse(resource.GetRequestUrl().c_str());
      html_parse.ParseText(src.data(), src.length());
      html_parse.FinishParse();

      std::vector<std::string> external_resource_urls;
      if (!filter.GetExternalResourceUrls(&external_resource_urls)) {
        continue;
      }

      ResolveExternalResourceUrls(&external_resource_urls,
                                  input.dom_document(),
                                  call->document_url());

      if (!DoesBlockRender(
              input, call->document_url(), external_resource_urls)) {
        continue;
      }

      Result* result = provider->NewResult();
      result->add_resource_urls(resource.GetRequestUrl());

      // NOTE: In Firefox, document.write() of script tags serializes
      // fetches, at least through Firefox version 4, so the critical
      // path cost in Firefox can be higher.
      Savings* savings = result->mutable_savings();
      savings->set_critical_path_length_saved(1);

      ResultDetails* details = result->mutable_details();
      AvoidDocumentWriteDetails* adw_details =
          details->MutableExtension(
              AvoidDocumentWriteDetails::message_set_extension);

      adw_details->set_line_number(call->line_number());
      for (std::vector<std::string>::const_iterator
               it = external_resource_urls.begin(),
               end = external_resource_urls.end();
           it != end;
           ++it) {
        adw_details->add_urls(*it);
      }
    }
  }
  return !error;
}

void AvoidDocumentWrite::FormatResults(const ResultVector& results,
                                       Formatter* formatter) {
  formatter = formatter->AddChild(
      "Using document.write to fetch external resources can introduce "
      "serialization delays in the rendering of the page. The following "
      "resources use document.write to fetch external resources:");
  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;
    if (result.resource_urls_size() != 1) {
      LOG(DFATAL) << "Unexpected number of resource URLs.  Expected 1, Got "
                  << result.resource_urls_size() << ".";
      continue;
    }
    const ResultDetails& details = result.details();
    if (details.HasExtension(
            AvoidDocumentWriteDetails::message_set_extension)) {
      const AvoidDocumentWriteDetails& adw_details = details.GetExtension(
          AvoidDocumentWriteDetails::message_set_extension);
      if (adw_details.urls_size() > 0) {
        Argument res_url(Argument::URL, result.resource_urls(0));
        Argument line_number(Argument::INTEGER, adw_details.line_number());
        Formatter* body =
            formatter->AddChild(
                "$1 calls document.write on line $2 to fetch:",
                res_url, line_number);
        for (int i = 0, size = adw_details.urls_size(); i < size; ++i) {
          Argument url(Argument::URL, adw_details.urls(i));
          body->AddChild("$1", url);
        }
      }
    }
  }
}

void AvoidDocumentWrite::SortResultsInPresentationOrder(
    ResultVector* rule_results) const {
  // AvoidDocumentWrite generates results in the order the violations
  // appear in the DOM, which is a reasonably good order. We could
  // improve it by placing violations for all resources that happen in
  // the main document above those that happen in iframes, but the
  // default order is good enough for now.
}


}  // namespace rules

}  // namespace pagespeed
