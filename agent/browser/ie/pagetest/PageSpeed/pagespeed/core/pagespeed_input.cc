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

#include "pagespeed/core/pagespeed_input.h"

#include "pagespeed/proto/pagespeed_output.pb.h"

#include "base/logging.h"
#include "base/stl_util-inl.h"
#include "base/string_util.h"
#include "pagespeed/core/dom.h"
#include "pagespeed/core/image_attributes.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/uri_util.h"

namespace pagespeed {

PagespeedInput::PagespeedInput()
    : input_info_(new InputInformation),
      resource_filter_(new AllowAllResourceFilter),
      allow_duplicate_resources_(false),
      frozen_(false) {
}

PagespeedInput::PagespeedInput(ResourceFilter* resource_filter)
    : input_info_(new InputInformation),
      resource_filter_(resource_filter),
      allow_duplicate_resources_(false),
      frozen_(false) {
  DCHECK_NE(resource_filter, static_cast<ResourceFilter*>(NULL));
}

PagespeedInput::~PagespeedInput() {
  STLDeleteContainerPointers(resources_.begin(), resources_.end());
}

bool PagespeedInput::IsValidResource(const Resource* resource) const {
  const std::string& url = resource->GetRequestUrl();
  if (url.empty()) {
    LOG(WARNING) << "Refusing Resource with empty URL.";
    return false;
  }
  if (!allow_duplicate_resources_ && has_resource_with_url(url)) {
    LOG(INFO) << "Ignoring duplicate AddResource for resource at \""
              << url << "\".";
    return false;
  }
  if (resource->GetResponseStatusCode() <= 0) {
    LOG(WARNING) << "Refusing Resource with invalid status code \""
                 << resource->GetResponseStatusCode() << "\".";
    return false;
  }

  if (resource_filter_.get() && !resource_filter_->IsAccepted(*resource)) {
    return false;
  }

  // TODO: consider adding some basic validation for request/response
  // headers.

  return true;
}

bool PagespeedInput::AddResource(Resource* resource) {
  if (frozen_) {
    LOG(DFATAL) << "Can't add resource " << resource->GetRequestUrl()
                << " to frozen PagespeedInput.";
    delete resource;  // Resource is owned by PagespeedInput.
    return false;
  }
  if (!IsValidResource(resource)) {
    delete resource;  // Resource is owned by PagespeedInput.
    return false;
  }
  const std::string& url = resource->GetRequestUrl();

  resources_.push_back(resource);
  url_resource_map_[url] = resource;
  host_resource_map_[resource->GetHost()].insert(resource);
  return true;
}

bool PagespeedInput::SetPrimaryResourceUrl(const std::string& url) {
  if (frozen_) {
    LOG(DFATAL) << "Can't set primary resource " << url
                << " to frozen PagespeedInput.";
    return false;
  }
  if (!has_resource_with_url(url)) {
    LOG(INFO) << "No such primary resource " << url;
    return false;
  }
  primary_resource_url_ = url;
  return true;
}

bool PagespeedInput::AcquireDomDocument(DomDocument* document) {
  if (frozen_) {
    LOG(DFATAL) << "Can't set DomDocument for frozen PagespeedInput.";
    return false;
  }
  document_.reset(document);
  return true;
}

bool PagespeedInput::AcquireImageAttributesFactory(
    ImageAttributesFactory *factory) {
  if (frozen_) {
    LOG(DFATAL)
        << "Can't set ImageAttributesFactory for frozen PagespeedInput.";
    return false;
  }
  image_attributes_factory_.reset(factory);
  return true;
}

bool PagespeedInput::Freeze() {
  if (frozen_) {
    LOG(DFATAL) << "Can't Freeze frozen PagespeedInput.";
    return false;
  }
  frozen_ = true;
  std::map<const Resource*, ResourceType> resource_type_map;
  PopulateResourceInformationFromDom(
      &resource_type_map, &parent_child_resource_map_);
  UpdateResourceTypes(resource_type_map);
  PopulateInputInformation();
  return true;
}

void PagespeedInput::PopulateInputInformation() {
  input_info_->Clear();
  for (int idx = 0, num = num_resources(); idx < num; ++idx) {
    const Resource& resource = GetResource(idx);

    // Update input information
    int request_bytes = resource_util::EstimateRequestBytes(resource);
    input_info_->set_total_request_bytes(
        input_info_->total_request_bytes() + request_bytes);
    int response_bytes = resource_util::EstimateResponseBytes(resource);
    switch (resource.GetResourceType()) {
      case HTML:
        input_info_->set_html_response_bytes(
            input_info_->html_response_bytes() + response_bytes);
        break;
      case TEXT:
        input_info_->set_text_response_bytes(
            input_info_->text_response_bytes() + response_bytes);
        break;
      case CSS:
        input_info_->set_css_response_bytes(
            input_info_->css_response_bytes() + response_bytes);
        break;
      case IMAGE:
        input_info_->set_image_response_bytes(
            input_info_->image_response_bytes() + response_bytes);
        break;
      case JS:
        input_info_->set_javascript_response_bytes(
            input_info_->javascript_response_bytes() + response_bytes);
        break;
      case FLASH:
        input_info_->set_flash_response_bytes(
            input_info_->flash_response_bytes() + response_bytes);
        break;
      case REDIRECT:
      case OTHER:
        input_info_->set_other_response_bytes(
            input_info_->other_response_bytes() + response_bytes);
        break;
      default:
        LOG(DFATAL) << "Unknown resource type " << resource.GetResourceType();
        input_info_->set_other_response_bytes(
            input_info_->other_response_bytes() + response_bytes);
        break;
    }
    input_info_->set_number_resources(num_resources());
    input_info_->set_number_hosts(GetHostResourceMap()->size());
    if (resource_util::IsLikelyStaticResource(resource)) {
      input_info_->set_number_static_resources(
          input_info_->number_static_resources() + 1);
    }
  }
}

// DomElementVisitor that walks the DOM looking for nodes that
// reference external resources (e.g. <img src="foo.gif">).
class ExternalResourceNodeVisitor : public pagespeed::DomElementVisitor {
 public:
  ExternalResourceNodeVisitor(
      const pagespeed::PagespeedInput* pagespeed_input,
      const pagespeed::DomDocument* document,
      std::map<const Resource*, ResourceType>* resource_type_map,
      ParentChildResourceMap* parent_child_resource_map)
      : pagespeed_input_(pagespeed_input),
        document_(document),
        resource_type_map_(resource_type_map),
        parent_child_resource_map_(parent_child_resource_map) {
    SetUp();
  }

  virtual void Visit(const pagespeed::DomElement& node);

 private:
  void SetUp();

  void ProcessUri(const std::string& relative_uri, ResourceType type);

  const pagespeed::PagespeedInput* pagespeed_input_;
  const pagespeed::DomDocument* document_;
  std::map<const Resource*, ResourceType>* resource_type_map_;
  ParentChildResourceMap* parent_child_resource_map_;
  ResourceSet visited_resources_;

  DISALLOW_COPY_AND_ASSIGN(ExternalResourceNodeVisitor);
};

void ExternalResourceNodeVisitor::ProcessUri(const std::string& relative_uri,
                                             ResourceType type) {
  if (relative_uri.empty()) {
    // An empty URI gets resolved to the URI of its parent document,
    // which will cause us to change the type of the parent
    // document. This is not the intended effect so we skip over empty
    // URIs.
    return;
  }
  std::string uri = document_->ResolveUri(relative_uri);
  const Resource* resource = pagespeed_input_->GetResourceWithUrl(uri);
  if (resource == NULL) {
    LOG(INFO) << "Unable to find resource " << uri;
    return;
  }

  if (resource->GetResourceType() == REDIRECT) {
    resource = resource_util::GetLastResourceInRedirectChain(
        *pagespeed_input_, *resource);
    if (resource == NULL) {
      return;
    }
  }

  // Update the Resource->ResourceType map.
  if (type != OTHER) {
    std::map<const Resource*, ResourceType>::const_iterator it =
        resource_type_map_->find(resource);
    if (it != resource_type_map_->end()) {
      ResourceType existing_type = it->second;
      if (existing_type != type) {
        LOG(INFO) << "Multiple ResourceTypes for " << resource->GetRequestUrl();
      }
    } else {
      (*resource_type_map_)[resource] = type;
    }
  }

  // Update the Parent->Child resource map.
  const Resource* document_resource =
      pagespeed_input_->GetResourceWithUrl(document_->GetDocumentUrl());
  if (document_resource != NULL) {
    if (visited_resources_.count(resource) == 0) {
      // Only insert the resource into the vector once.
      visited_resources_.insert(resource);
      (*parent_child_resource_map_)[document_resource].push_back(resource);
    }
  } else {
    LOG(INFO) << "Unable to find resource for " << document_->GetDocumentUrl();
  }
}

void ExternalResourceNodeVisitor::SetUp() {
  const Resource* document_resource =
      pagespeed_input_->GetResourceWithUrl(document_->GetDocumentUrl());
  if (document_resource != NULL) {
    // Create an initial entry in the parent_child_resource_map.
    (*parent_child_resource_map_)[document_resource];
  }
}

void ExternalResourceNodeVisitor::Visit(const pagespeed::DomElement& node) {
  if (node.GetTagName() == "IMG" ||
      node.GetTagName() == "SCRIPT" ||
      node.GetTagName() == "IFRAME" ||
      node.GetTagName() == "EMBED") {
    // NOTE: an iframe created/manipulated via JS may not have a "src"
    // attribute but can still have children. We should handle this
    // case. This most likely requires redefining the
    // ParentChildResourceMap structure.
    std::string src;
    if (node.GetAttributeByName("src", &src)) {
      ResourceType type;
      if (node.GetTagName() == "IMG") {
        type = IMAGE;
      } else if (node.GetTagName() == "SCRIPT") {
        type = JS;
      } else if (node.GetTagName() == "IFRAME") {
        type = HTML;
      } else if (node.GetTagName() == "EMBED") {
        // TODO: in some cases this resource may be flash, but not
        // always. Thus we set type to OTHER. ProcessUri ignores type
        // OTHER but will update the ParentChildResourceMap, which is
        // what we want.
        type = OTHER;
      } else {
        LOG(DFATAL) << "Unexpected type " << node.GetTagName();
        type = OTHER;
      }
      ProcessUri(src, type);
    }
  } else if (node.GetTagName() == "LINK") {
    std::string rel;
    if (node.GetAttributeByName("rel", &rel) &&
        LowerCaseEqualsASCII(rel, "stylesheet")) {
      std::string href;
      if (node.GetAttributeByName("href", &href)) {
        ProcessUri(href, CSS);
      }
    }
  }

  if (node.GetTagName() == "IFRAME") {
    // Do a recursive document traversal.
    scoped_ptr<pagespeed::DomDocument> child_doc(node.GetContentDocument());
    if (child_doc.get()) {
      ExternalResourceNodeVisitor visitor(pagespeed_input_,
                                          child_doc.get(),
                                          resource_type_map_,
                                          parent_child_resource_map_);
      child_doc->Traverse(&visitor);
    }
  }
}

void PagespeedInput::PopulateResourceInformationFromDom(
    std::map<const Resource*, ResourceType>* resource_type_map,
    ParentChildResourceMap* parent_child_resource_map) {
  if (dom_document() != NULL) {
    ExternalResourceNodeVisitor visitor(this,
                                        dom_document(),
                                        resource_type_map,
                                        parent_child_resource_map);
    dom_document()->Traverse(&visitor);
  }
}

void PagespeedInput::UpdateResourceTypes(
    const std::map<const Resource*, ResourceType>& resource_type_map) {
  for (int idx = 0, num = num_resources(); idx < num; ++idx) {
    Resource* resource = resources_[idx];
    std::map<const Resource*, ResourceType>::const_iterator it =
        resource_type_map.find(resource);
    if (it != resource_type_map.end()) {
      resource->SetResourceType(it->second);
    }
  }
}

int PagespeedInput::num_resources() const {
  return resources_.size();
}

bool PagespeedInput::has_resource_with_url(const std::string& url) const {
  return url_resource_map_.find(url) != url_resource_map_.end();
}

const Resource& PagespeedInput::GetResource(int idx) const {
  DCHECK(idx >= 0 && static_cast<size_t>(idx) < resources_.size());
  return *resources_[idx];
}

ImageAttributes* PagespeedInput::NewImageAttributes(
    const Resource* resource) const {
  DCHECK(frozen_);
  if (image_attributes_factory_ == NULL) {
    return NULL;
  }
  return image_attributes_factory_->NewImageAttributes(resource);
}

const HostResourceMap* PagespeedInput::GetHostResourceMap() const {
  DCHECK(frozen_);
  return &host_resource_map_;
}

const ParentChildResourceMap*
PagespeedInput::GetParentChildResourceMap() const {
  DCHECK(frozen_);
  return &parent_child_resource_map_;
}


const InputInformation* PagespeedInput::input_information() const {
  DCHECK(frozen_);
  return input_info_.get();
}

const DomDocument* PagespeedInput::dom_document() const {
  DCHECK(frozen_);
  return document_.get();
}

const std::string& PagespeedInput::primary_resource_url() const {
  return primary_resource_url_;
}

const Resource* PagespeedInput::GetResourceWithUrl(
    const std::string& url) const {
  DCHECK(frozen_);
  std::map<std::string, const Resource*>::const_iterator it =
      url_resource_map_.find(url);
  if (it == url_resource_map_.end()) {
    return NULL;
  }
  return it->second;
}

InputCapabilities PagespeedInput::EstimateCapabilities() const {
  InputCapabilities capabilities;
  if (!is_frozen()) {
    LOG(DFATAL) << "Can't estimate capabilities of non-frozen input.";
    return capabilities;
  }

  if (dom_document() != NULL) {
    capabilities.add(
        InputCapabilities::DOM |
        InputCapabilities::PARENT_CHILD_RESOURCE_MAP);
  }
  for (int i = 0, num = num_resources(); i < num; ++i) {
    const Resource& resource = GetResource(i);
    if (resource.IsLazyLoaded()) {
      capabilities.add(InputCapabilities::LAZY_LOADED);
    }
    if (resource.GetJavaScriptCalls("document.write") != NULL) {
      capabilities.add(InputCapabilities::JS_CALLS_DOCUMENT_WRITE);
    }
    if (!resource.GetResponseBody().empty()) {
      capabilities.add(InputCapabilities::RESPONSE_BODY);
    }
    if (!resource.GetRequestHeader("referer").empty() &&
        !resource.GetRequestHeader("host").empty() &&
        !resource.GetRequestHeader("accept-encoding").empty()) {
      // If at least one resource has a Host, Referer, and
      // Accept-Encoding header, we assume that a full set of request
      // headers were provided.
      capabilities.add(InputCapabilities::REQUEST_HEADERS);
    }
  }
  return capabilities;
}

}  // namespace pagespeed
