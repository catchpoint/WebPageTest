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

#ifndef PAGESPEED_CORE_PAGESPEED_INPUT_H_
#define PAGESPEED_CORE_PAGESPEED_INPUT_H_

#include <map>
#include <string>
#include <vector>

#include "base/basictypes.h"
#include "base/scoped_ptr.h"
#include "pagespeed/core/input_capabilities.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_filter.h"

namespace pagespeed {

class DomDocument;
class ImageAttributes;
class ImageAttributesFactory;
class InputInformation;

typedef std::map<std::string, ResourceSet> HostResourceMap;
typedef std::vector<const Resource*> ResourceVector;
typedef std::map<const Resource*, ResourceVector> ParentChildResourceMap;

/**
 * Input set representation
 */
class PagespeedInput {
 public:
  PagespeedInput();
  // PagespeedInput takes ownership of the passed resource_filter.
  explicit PagespeedInput(ResourceFilter* resource_filter);
  virtual ~PagespeedInput();

  // Setters

  // Adds a resource to the list.
  // Returns true if resource was added to the list.
  //
  // Ownership of the resource is transfered over to the
  // PagespeedInput object.
  bool AddResource(Resource* resource);

  // Specify the URL of the "primary" resource. Some rules want to exclude the
  // primary resource from their analysis. This is optional but should be
  // specified when there is a root resource, such as the main HTML
  // resource. This method should be called after the primary resource has
  // already been added via AddResource(); if called with a URL that is not in
  // the set of currently added resources, does nothing and returns false.
  bool SetPrimaryResourceUrl(const std::string& url);

  // Normally we only allow one resource per URL.  Setting this flag
  // allows duplicate resource addition, which is useful when
  // constructing an input set that is meant for serialization.
  void set_allow_duplicate_resources() { allow_duplicate_resources_ = true; }

  // Set the DOM Document information.
  //
  // Ownership of the DomDocument is transfered over to the
  // PagespeedInput object.
  bool AcquireDomDocument(DomDocument* document);

  bool AcquireImageAttributesFactory(ImageAttributesFactory* factory);

  // Call after populating the PagespeedInput. After calling Freeze(),
  // no additional modifications can be made to the PagespeedInput
  // structure.
  bool Freeze();

  // Resource access.
  int num_resources() const;
  bool has_resource_with_url(const std::string& url) const;
  const Resource& GetResource(int idx) const;
  const Resource* GetResourceWithUrl(const std::string& url) const;
  ImageAttributes* NewImageAttributes(const Resource* resource) const;

  // Get the map from hostname to all resources on that hostname.
  const HostResourceMap* GetHostResourceMap() const;

  // Get the map from a parent (e.g. document) to all of its child
  // resources. The children are the immediate children, e.g. the
  // children of an iframe will not be considered children of the main
  // document as well. The children in the vector are in the order
  // they appear in the document's DOM.
  const ParentChildResourceMap* GetParentChildResourceMap() const;
  const InputInformation* input_information() const;
  const DomDocument* dom_document() const;
  const std::string& primary_resource_url() const;
  bool is_frozen() const { return frozen_; }

  // Estimate the InputCapabilities for this PagespeedInput.
  // Note that implementers should call this method
  // and also explicitly augment the bitmap with the capabilities they
  // provide. For instance, if an environment collects lazy-load
  // information about resources but none of the resources in the
  // PagespeedInput have been lazy loaded, this function will not
  // include the LAZY_LOADED bit in its return value.
  InputCapabilities EstimateCapabilities() const;

 private:
  bool IsValidResource(const Resource* resource) const;

  // Compute information about the set of resources. Called once at
  // the time the PagespeedInput is frozen.
  void PopulateInputInformation();
  void PopulateResourceInformationFromDom(
      std::map<const Resource*, ResourceType>*, ParentChildResourceMap*);
  void UpdateResourceTypes(const std::map<const Resource*, ResourceType>&);

  std::vector<Resource*> resources_;

  // Map from URL to Resource. The resources_ vector, above, owns the
  // Resource instances in this map.
  std::map<std::string, const Resource*> url_resource_map_;

  // Map from hostname to Resources on that hostname. The resources_
  // vector, above, owns the Resource instances in this map.
  HostResourceMap host_resource_map_;

  ParentChildResourceMap parent_child_resource_map_;

  scoped_ptr<InputInformation> input_info_;
  scoped_ptr<DomDocument> document_;
  scoped_ptr<ResourceFilter> resource_filter_;
  scoped_ptr<ImageAttributesFactory> image_attributes_factory_;
  std::string primary_resource_url_;
  bool allow_duplicate_resources_;
  bool frozen_;

  DISALLOW_COPY_AND_ASSIGN(PagespeedInput);
};

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_PAGESPEED_INPUT_H_
