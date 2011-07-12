// Copyright 2010 Google Inc.
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

#include <atlbase.h>
#include <atlcomcli.h>  // for CAdapt
#include <comutil.h>    // for _variant_t
#include <exdisp.h>     // for IWebBrowser2
#include <mshtml.h>     // for IHTML*
#include <string>
#include <vector>

#include "base/string_util.h"
#include "pagespeed/platform/ie/ie_dom.h"
#include "pagespeed/core/dom.h"

namespace pagespeed {

namespace {

bool GetUniqueId(IHTMLDOMNode* node, long* out) {
  CComQIPtr<IHTMLUniqueName> unique(node);
  if (unique == NULL) {
    return false;
  }
  if (FAILED(unique->get_uniqueNumber(out))) {
    return false;
  }
  return true;
}

class IEDocument : public DomDocument {
 public:
  explicit IEDocument(IHTMLDocument3* document);

  virtual std::string GetDocumentUrl() const;
  virtual std::string GetBaseUrl() const;
  virtual void Traverse(DomElementVisitor* visitor) const;

 private:
  CComPtr<IHTMLDocument3> document_;

  // Computing the base URL in GetBaseUrl() is expensive. GetBaseUrl()
  // is declared const in the base interface, so we define this mutable
  // member here to cache the result.
  mutable std::string base_href_;

  DISALLOW_COPY_AND_ASSIGN(IEDocument);
};

class IEElement : public DomElement {
 public:
  explicit IEElement(IHTMLElement* element);
  virtual DomDocument* GetContentDocument() const;
  virtual std::string GetTagName() const;
  virtual bool GetAttributeByName(const std::string& name,
                                  std::string* attr_value) const;

  Status GetActualWidth(int* out_width) const;
  Status GetActualHeight(int* out_height) const;
  Status HasWidthSpecified(bool* out_width_specified) const;
  Status HasHeightSpecified(bool* out_height_specified) const;

 private:
  CComPtr<IHTMLElement> element_;

  DISALLOW_COPY_AND_ASSIGN(IEElement);
};

// Helper class that performs a pre-order traversal from the given
// root IHTMLElement.
class PreOrderIENodeTraverser {
 public:
  explicit PreOrderIENodeTraverser(IHTMLDOMNode* root);

  bool NextNode();
  IHTMLDOMNode* CurrentNode() { return node_; }

 private:
  // Each node has a parent pointer, so it shouldn't be necessary to
  // keep the stack of visited parent nodes. However, there is a bug in IE8
  // that gets triggered with malformed HTML where a tag that must be
  // closed doesn't get closed. In these cases, the node parent pointers
  // get into an inconsistent state which can cause our pre order traverser
  // to go into an infinite loop. Thus, we keep track of parents we have
  // visited instead of asking nodes for their parent pointers.
  std::vector<CAdapt<CComPtr<IHTMLDOMNode>>> parents_;
  CComPtr<IHTMLDOMNode> node_;
  // We need to store the root's unique id, in addition to a pointer
  // to the current node. Otherwise, we would end up iterating
  // through the parents of root_, if root is not the actual
  // root of the DOM.
  long root_unique_id_;

  DISALLOW_COPY_AND_ASSIGN(PreOrderIENodeTraverser);
};

// Helper class that scans a document for <base> tags.
class BaseElementVisitor : public pagespeed::DomElementVisitor {
 public:
  BaseElementVisitor() {}
  virtual void Visit(const DomElement& node);

  const std::string& base_href() const { return base_href_; }

 private:
  std::string base_href_;

  DISALLOW_COPY_AND_ASSIGN(BaseElementVisitor);
};

void BaseElementVisitor::Visit(const pagespeed::DomElement& node) {
  if (!base_href_.empty()) {
    return;
  }
  if (node.GetTagName() == "BASE") {
    std::string href;
    if (node.GetAttributeByName("href", &href)) {
      base_href_ = href;
    }
  }
}

IEDocument::IEDocument(IHTMLDocument3* document)
    : document_(document) {
}

std::string IEDocument::GetDocumentUrl() const {
  CComQIPtr<IHTMLDocument2> doc2(document_);
  if (doc2 == NULL) {
    LOG(DFATAL) << "Unable to QI from IHTMLDocument3 to IHTMLDocument2.";
    return "";
  }
  CComBSTR doc_url;
  if (FAILED(doc2->get_URL(&doc_url))) {
    LOG(DFATAL) << "Unable to get_URL.";
    return "";
  }
  return static_cast<LPSTR>(CW2A(doc_url));
}

std::string IEDocument::GetBaseUrl() const {
  if (!base_href_.empty()) {
    // Use the cached value.
    return base_href_;
  }

  CComBSTR base_url;
  // Unfortunately, at the time of this implementation (IE8), get_baseUrl
  // is marked in the MSDN documentation as "not currently supported"
  // (http://msdn.microsoft.com/en-us/library/aa752536(v=VS.85).aspx). Thus
  // we attempt to call it in case future versions support it, but fall back
  // to scanning the DOM for <base> tags, below.
  if (SUCCEEDED(document_->get_baseUrl(&base_url))) {
    base_href_ = static_cast<LPSTR>(CW2A(base_url));
  } else {
    IEDocument doc(document_);
    BaseElementVisitor visitor;
    doc.Traverse(&visitor);
    const std::string& base_href = visitor.base_href();
    if (!base_href.empty()) {
      base_href_ = base_href;
    } else {
      base_href_ = GetDocumentUrl();
    }
  }
  return base_href_;
}

void IEDocument::Traverse(DomElementVisitor* visitor) const {
  CComPtr<IHTMLElement> document_element;
  if (FAILED(document_->get_documentElement(&document_element)) ||
      document_element == NULL) {
    LOG(DFATAL) << "Unable to get_documentElement.";
    return;
  }
  CComQIPtr<IHTMLDOMNode> document_node(document_element);
  if (document_node == NULL) {
    LOG(DFATAL) << "Unable to QI from IHTMLElement to IHTMLDOMNode.";
    return;
  }
  PreOrderIENodeTraverser traverser(document_node);
  if (traverser.CurrentNode() == NULL) {
    return;
  }
  do {
    CComPtr<IHTMLDOMNode> node(traverser.CurrentNode());
    CComQIPtr<IHTMLElement> element(node);
    if (element != NULL) {
      IEElement e(element);
      visitor->Visit(e);
    }
  } while (traverser.NextNode());
}

IEElement::IEElement(IHTMLElement* element)
    : element_(element) {
}

DomDocument* IEElement::GetContentDocument() const {
  // There are a few ways we could get the document. We could QI to
  // IHTMLIFrameElement3, which has a get_contentDocument method. However,
  // this interface was only added in IE8, so it's too recent for us to
  // use in all browsers. Thus we use the IHTMLFrameBase2 which was added
  // in IE5.5 and allows us to get the content window.
  CComQIPtr<IHTMLFrameBase2> frame(element_);
  if (frame == NULL) {
    LOG(DFATAL) << "Unable to QI from IHTMLElement to IHTMLFrameBase2.";
    return NULL;
  }

  CComPtr<IHTMLWindow2> window;
  if (FAILED(frame->get_contentWindow(&window)) || window == NULL) {
    LOG(DFATAL) << "Failed to get_contentWindow.";
    return NULL;
  }

  // IHTMLWindow2 has a get_document method. However, it is subject
  // to same-origin restrictions. Thus we need to go a different route
  // in order to get cross-origin documents. We can use the
  // IServiceProvider interface to get the IWebBrowser2 instance for
  // this window, which has a method to get the document.
  CComQIPtr<IServiceProvider> service_provider(window);
  if (service_provider == NULL) {
    LOG(DFATAL) << "Failed to QI from IHTMLWindow2 to IServiceProvider.";
    return NULL;
  }
  CComPtr<IWebBrowser2> browser;
  if (FAILED(service_provider->QueryService(
      IID_IWebBrowserApp,
      IID_IWebBrowser2,
      reinterpret_cast<void**>(&browser))) || browser == NULL) {
    LOG(DFATAL) << "Failed to QueryService for IWebBrowser2.";
    return NULL;
  }
  CComPtr<IDispatch> doc_dispatch;
  if (FAILED(browser->get_Document(&doc_dispatch)) || doc_dispatch == NULL) {
    LOG(DFATAL) << "Failed to get_Document.";
    return NULL;
  }
  CComQIPtr<IHTMLDocument3> doc(doc_dispatch);
  if (doc == NULL) {
    LOG(DFATAL) << "Failed to QI from IHTMLDocument2 to IHTMLDocument3.";
    return NULL;
  }
  return new IEDocument(doc);
}

std::string IEElement::GetTagName() const {
  CComBSTR tag_name;
  if (FAILED(element_->get_tagName(&tag_name))) {
    LOG(DFATAL) << "Failed to get_tagName.";
    return "";
  }
  std::string tag_name_str(static_cast<LPSTR>(CW2A(tag_name)));
  // Just in case get_tagName doesn't always return an uppercase string.
  StringToUpperASCII(&tag_name_str);
  return tag_name_str;
}

bool IEElement::GetAttributeByName(const std::string& name,
                                   std::string* attr_value) const {
  CComQIPtr<IHTMLElement4> element4(element_);
  if (element4 == NULL) {
    LOG(DFATAL) << "Failed to QI to IHTMLElement4.";
    return false;
  }
  CComBSTR name_bstr(name.c_str());
  CComPtr<IHTMLDOMAttribute> attribute;
  if (FAILED(element4->getAttributeNode(name_bstr, &attribute)) ||
      attribute == NULL) {
    // Attribute does not exist (is not specified in the DOM).
    return false;
  }
  VARIANT_BOOL specified;
  if (FAILED(attribute->get_specified(&specified))) {
    LOG(DFATAL) << "Failed to get_specified.";
    return false;
  }
  if (specified == VARIANT_FALSE) {
    // The attribute is not specified in the DOM.
    return false;
  }
  _variant_t var_val;
  // We call element->getAttribute rather than attribute->get_nodeValue
  // since getAttribute supports a flag (2) to convert the out-param to a
  // bstr. Otherwise boolean attributes would be returned as VT_BOOL, etc,
  // which is not what we want.
  if (FAILED(element_->getAttribute(name_bstr, 2, &var_val))) {
    LOG(DFATAL) << "Failed to getAttribute for " << name;
    return false;
  }
  if(var_val.vt != VT_BSTR) {
    LOG(DFATAL) << "Received unexpected variant type " << var_val.vt;
    return false;
  }
  if (var_val.bstrVal == NULL) {
    // Attribute was specified as the empty string.
    *attr_value = "";
    return true;
  }
  _bstr_t text = (_bstr_t)var_val;
  *attr_value = static_cast<LPSTR>(CW2A(text));
  return true;
}

DomElement::Status IEElement::GetActualWidth(int* out_width) const {
  CComQIPtr<IHTMLElement2> element2(element_);
  if (element2 == NULL) {
    LOG(DFATAL) << "Failed to QI to IHTMLElement2.";
    return FAILURE;
  }
  CComPtr<IHTMLRect> rect;
  if (FAILED(element2->getBoundingClientRect(&rect)) || rect == NULL) {
    return FAILURE;
  }
  long left = 0;
  long right = 0;
  if (FAILED(rect->get_left(&left)) || FAILED(rect->get_right(&right))) {
    return FAILURE;
  }

  *out_width = (right - left);
  if (*out_width <= 0) {
    return FAILURE;
  }
  return SUCCESS;
}

DomElement::Status IEElement::GetActualHeight(int* out_height) const {
  CComQIPtr<IHTMLElement2> element2(element_);
  if (element2 == NULL) {
    LOG(DFATAL) << "Failed to QI to IHTMLElement2.";
    return FAILURE;
  }
  CComPtr<IHTMLRect> rect;
  if (FAILED(element2->getBoundingClientRect(&rect)) || rect == NULL) {
    return FAILURE;
  }
  long top = 0;
  long bottom = 0;
  if (FAILED(rect->get_top(&top)) || FAILED(rect->get_bottom(&bottom))) {
    return FAILURE;
  }

  *out_height = (bottom - top);
  if (*out_height <= 0) {
    return FAILURE;
  }
  return SUCCESS;
}

DomElement::Status IEElement::HasWidthSpecified(
    bool* out_width_specified) const {
  // TODO(bmcquade): find a way to find out whether the width is
  // explicitly specified (i.e. as an attribute, inline style, or via
  // CSS).
  return FAILURE;
}

DomElement::Status IEElement::HasHeightSpecified(
    bool* out_height_specified) const {
  // TODO(bmcquade): find a way to find out whether the height is
  // explicitly specified (i.e. as an attribute, inline style, or via
  // CSS).
  return FAILURE;
}

PreOrderIENodeTraverser::PreOrderIENodeTraverser(
    IHTMLDOMNode* root) : node_(root) {
  // Record the unique identifier for the root, so we can abort
  // the traversal when we return to the root node.
  if (!GetUniqueId(root, &root_unique_id_)) {
    LOG(DFATAL) << "Failed to GetUniqueId for root.";
    node_ = NULL;
    return;
  }
}

bool PreOrderIENodeTraverser::NextNode() {
  if (node_ == NULL) {
    return false;
  }

  // First, if the node has a child, visit the child.
  CComPtr<IHTMLDOMNode> next;
  if (SUCCEEDED(node_->get_firstChild(&next)) && next != NULL) {
    parents_.push_back(node_);
    node_ = next;
    return true;
  }

  // We need to traverse siblings, walking up the parent chain until
  // we find a valid sibling.
  next = node_;
  while (next != NULL) {
    // First check to see if we've reached the root node, and abort if so.
    long unique_id = -1;
    // NOTE: GetUniqueId returns false (failure) for IHTMLDOMNodes that
    // are not IHTMLElements (e.g. text nodes) so we should not treat
    // failure as an error.
    if (GetUniqueId(next, &unique_id) && unique_id == root_unique_id_) {
      // We are back at the root, so quit.
      node_ = NULL;
      return false;
    }

    // Next attempt to find a sibling.
    CComPtr<IHTMLDOMNode> sibling;
    if (SUCCEEDED(next->get_nextSibling(&sibling)) && sibling != NULL) {
      node_ = sibling;
      return true;
    }

    // If no sibling was found, attempt to find a sibling on the parent node.
    if (parents_.empty()) {
      LOG(DFATAL) << "Encountered empty parent stack.";
      node_ = NULL;
      return false;
    }
    next = parents_.back().m_T;
    parents_.pop_back();
  }
  node_ = NULL;
  return false;
}

}  // namespace

namespace ie {

DomDocument* CreateDocument(IHTMLDocument3* document) {
  return new IEDocument(document);
}

}  // namespace ie

}  // namespace pagespeed
