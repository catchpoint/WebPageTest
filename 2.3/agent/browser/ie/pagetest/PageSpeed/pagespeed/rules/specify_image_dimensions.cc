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

#include "pagespeed/rules/specify_image_dimensions.h"

#include <map>

#include "base/basictypes.h"
#include "base/logging.h"
#include "base/scoped_ptr.h"
#include "pagespeed/core/dom.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/image_attributes.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace {

const char* kRuleName = "SpecifyImageDimensions";

class ImageDimensionsChecker : public pagespeed::DomElementVisitor {
 public:
  ImageDimensionsChecker(const pagespeed::PagespeedInput* pagespeed_input,
                         const pagespeed::DomDocument* document,
                         pagespeed::ResultProvider* provider)
      : pagespeed_input_(pagespeed_input), document_(document),
        provider_(provider) {}

  virtual void Visit(const pagespeed::DomElement& node);

 private:
  const pagespeed::PagespeedInput* pagespeed_input_;
  const pagespeed::DomDocument* document_;
  pagespeed::ResultProvider* provider_;

  DISALLOW_COPY_AND_ASSIGN(ImageDimensionsChecker);
};

void ImageDimensionsChecker::Visit(const pagespeed::DomElement& node) {
  if (node.GetTagName() == "IMG") {
    if (pagespeed_input_->has_resource_with_url(document_->GetDocumentUrl())) {
      bool height_specified = false;
      bool width_specified = false;
      if (pagespeed::DomElement::SUCCESS !=
          node.HasHeightSpecified(&height_specified) ||
          pagespeed::DomElement::SUCCESS !=
          node.HasWidthSpecified(&width_specified)) {
        // The runtime was not able to compute the requested values,
        // so we must skip this node.
        return;
      }
      if (!height_specified || !width_specified) {
        std::string src;
        if (!node.GetAttributeByName("src", &src)) {
          return;
        }
        std::string uri = document_->ResolveUri(src);

        pagespeed::Result* result = provider_->NewResult();
        result->add_resource_urls(uri);

        pagespeed::Savings* savings = result->mutable_savings();
        savings->set_page_reflows_saved(1);

        const pagespeed::Resource* resource =
            pagespeed_input_->GetResourceWithUrl(uri);
        if (resource != NULL) {
          scoped_ptr<pagespeed::ImageAttributes> image_attributes(
              pagespeed_input_->NewImageAttributes(resource));
          if (image_attributes != NULL) {
            pagespeed::ResultDetails* details = result->mutable_details();
            pagespeed::ImageDimensionDetails* image_details =
                details->MutableExtension(
                    pagespeed::ImageDimensionDetails::message_set_extension);
            image_details->set_expected_height(
                image_attributes->GetImageHeight());
            image_details->set_expected_width(
                image_attributes->GetImageWidth());
          }
        }
      }
    }
  } else if (node.GetTagName() == "IFRAME") {
    // Do a recursive document traversal.
    scoped_ptr<pagespeed::DomDocument> child_doc(node.GetContentDocument());
    if (child_doc.get()) {
      ImageDimensionsChecker checker(pagespeed_input_, child_doc.get(),
                                     provider_);
      child_doc->Traverse(&checker);
    }
  }
}

// sorts results by their URLs.
struct ResultUrlLessThan {
  bool operator() (const pagespeed::Result& lhs,
                   const pagespeed::Result& rhs) const {
    return lhs.resource_urls(0) < rhs.resource_urls(0);
  }
};

}  // namespace

namespace pagespeed {

namespace rules {

SpecifyImageDimensions::SpecifyImageDimensions()
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::DOM |
        pagespeed::InputCapabilities::RESPONSE_BODY)) {}

const char* SpecifyImageDimensions::name() const {
  return kRuleName;
}

const char* SpecifyImageDimensions::header() const {
  return "Specify image dimensions";
}

const char* SpecifyImageDimensions::documentation_url() const {
  return "rendering.html#SpecifyImageDimensions";
}

bool SpecifyImageDimensions::AppendResults(const PagespeedInput& input,
                                           ResultProvider* provider) {
  const DomDocument* document = input.dom_document();
  if (document) {
    ImageDimensionsChecker visitor(&input, document, provider);
    document->Traverse(&visitor);
  }
  return true;
}

void SpecifyImageDimensions::FormatResults(const ResultVector& results,
                                           Formatter* formatter) {
  if (results.empty()) {
    return;
  }

  Formatter* body = formatter->AddChild(
      "The following image(s) are missing width and/or height attributes.");

  std::map<Result, int, ResultUrlLessThan> result_count_map;
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

    result_count_map[result]++;
  }

  for (std::map<Result, int, ResultUrlLessThan>::const_iterator iter =
          result_count_map.begin();
       iter != result_count_map.end();
       ++iter) {

    const Result& result = iter->first;
    int count = iter->second;

    const ResultDetails& details = result.details();
    if (details.HasExtension(ImageDimensionDetails::message_set_extension)) {
      const ImageDimensionDetails& image_details = details.GetExtension(
          ImageDimensionDetails::message_set_extension);

      Argument url(Argument::URL, result.resource_urls(0));
      Argument width(Argument::INTEGER, image_details.expected_width());
      Argument height(Argument::INTEGER, image_details.expected_height());
      if ( count > 1 ) {
        Argument instances(Argument::INTEGER, count);
        body->AddChild("$1 (Dimensions: $2 x $3) ($4 uses)",
                        url, width, height, instances);
      } else {
        body->AddChild("$1 (Dimensions: $2 x $3)",
                        url, width, height);
      }
    } else {
      Argument url(Argument::URL, result.resource_urls(0));
      body->AddChild("$1", url);
    }
  }
}

}  // namespace rules

}  // namespace pagespeed
