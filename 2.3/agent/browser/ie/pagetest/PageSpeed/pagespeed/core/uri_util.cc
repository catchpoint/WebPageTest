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

#include "pagespeed/core/uri_util.h"

#include <string>
#include "base/logging.h"
#include "base/scoped_ptr.h"
#include "googleurl/src/gurl.h"
#include "googleurl/src/url_canon.h"
#include "pagespeed/core/dom.h"

namespace {

class DocumentFinderVisitor : public pagespeed::DomElementVisitor {
 public:
  explicit DocumentFinderVisitor(const std::string& url)
      : url_(url), document_(NULL) {}

  virtual void Visit(const pagespeed::DomElement& node);

  bool HasDocument() { return document_.get() != NULL; }
  pagespeed::DomDocument* AcquireDocument() {
    DCHECK(HasDocument());
    return document_.release();
  }

 private:
  const std::string& url_;
  scoped_ptr<pagespeed::DomDocument> document_;

  DISALLOW_COPY_AND_ASSIGN(DocumentFinderVisitor);
};

void DocumentFinderVisitor::Visit(const pagespeed::DomElement& node) {
  if (HasDocument()) {
    // Already found a document so we do not need to visit any
    // additional nodes.
    return;
  }

  if (node.GetTagName() != "IFRAME") {
    return;
  }

  scoped_ptr<pagespeed::DomDocument> child_doc(node.GetContentDocument());
  if (child_doc.get() == NULL) {
    // Failed to get the child document, so bail.
    return;
  }

  // TODO: consider performing a match after removing the document
  // fragments.
  if (child_doc->GetDocumentUrl() == url_) {
    // We found the document instance, so hold onto it.
    document_.reset(child_doc.release());
    return;
  }

  // Search for the document within this child document.
  DocumentFinderVisitor visitor(url_);
  child_doc->Traverse(&visitor);
  if (visitor.HasDocument()) {
    // We found a matching document.
    document_.reset(visitor.AcquireDocument());
  }
}

}  // namespace

namespace pagespeed {

namespace uri_util {

std::string ResolveUri(const std::string& uri, const std::string& base_url) {
  GURL url(base_url);
  if (!url.is_valid()) {
    return "";
  }

  GURL derived = url.Resolve(uri);
  if (!derived.is_valid()) {
    return "";
  }

  // Remove everything after the #, which is not sent to the server,
  // and return the resulting url.
  //
  // TODO: this should probably not be the default behavior; user
  // should have to explicitly remove the fragment.
  url_canon::Replacements<char> clear_fragment;
  clear_fragment.ClearRef();
  return derived.ReplaceComponents(clear_fragment).spec();
}

bool ResolveUriForDocumentWithUrl(
    const std::string& uri_to_resolve,
    const pagespeed::DomDocument* root_document,
    const std::string& document_url_to_find,
    std::string* out_resolved_url) {
  if (root_document == NULL) {
    LOG(INFO) << "No document. Unable to ResolveUriForDocumentWithUrl.";
    return false;
  }

  if (root_document->GetDocumentUrl() == document_url_to_find) {
    *out_resolved_url = root_document->ResolveUri(uri_to_resolve);
    return true;
  }

  DocumentFinderVisitor visitor(document_url_to_find);
  root_document->Traverse(&visitor);
  if (!visitor.HasDocument()) {
    return false;
  }

  scoped_ptr<pagespeed::DomDocument> doc(visitor.AcquireDocument());
  *out_resolved_url = doc->ResolveUri(uri_to_resolve);
  return true;
}

}  // namespace uri_util

}  // namespace pagespeed
