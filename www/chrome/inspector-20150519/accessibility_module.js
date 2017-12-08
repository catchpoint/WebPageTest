WebInspector.AccessibilityModel=function(target)
{WebInspector.SDKModel.call(this,WebInspector.AccessibilityModel,target);this._agent=target.accessibilityAgent();};WebInspector.AccessibilityModel.prototype={getAXNode:function(nodeId,userCallback)
{var wrappedCallback=InspectorBackend.wrapClientCallback(userCallback,"AccessibilityAgent.getAXNode(): ");this._agent.getAXNode(nodeId,wrappedCallback);},__proto__:WebInspector.SDKModel.prototype}
WebInspector.AccessibilityModel._symbol=Symbol("AccessibilityModel");WebInspector.AccessibilityModel.fromTarget=function(target)
{if(!target[WebInspector.AccessibilityModel._symbol])
target[WebInspector.AccessibilityModel._symbol]=new WebInspector.AccessibilityModel(target);return target[WebInspector.AccessibilityModel._symbol];};WebInspector.AccessibilitySidebarView=function()
{WebInspector.ThrottledElementsSidebarView.call(this);this._computedTextSubPane=null;this._axNodeSubPane=null;this._sidebarPaneStack=null;}
WebInspector.AccessibilitySidebarView.prototype={doUpdate:function(finishCallback)
{function accessibilityNodeCallback(accessibilityNode)
{if(this._computedTextSubPane)
this._computedTextSubPane.setAXNode(accessibilityNode);if(this._axNodeSubPane)
this._axNodeSubPane.setAXNode(accessibilityNode);finishCallback();}
var node=this.node();WebInspector.AccessibilityModel.fromTarget(node.target()).getAXNode(node.id,accessibilityNodeCallback.bind(this));},wasShown:function()
{WebInspector.ElementsSidebarPane.prototype.wasShown.call(this);if(!this._sidebarPaneStack){this._computedTextSubPane=new WebInspector.AXComputedTextSubPane();this._computedTextSubPane.setNode(this.node());this._computedTextSubPane.show(this.element);this._computedTextSubPane.expand();this._axNodeSubPane=new WebInspector.AXNodeSubPane();this._axNodeSubPane.setNode(this.node());this._axNodeSubPane.show(this.element);this._axNodeSubPane.expand();this._sidebarPaneStack=new WebInspector.SidebarPaneStack();this._sidebarPaneStack.element.classList.add("flex-auto");this._sidebarPaneStack.show(this.element);this._sidebarPaneStack.addPane(this._computedTextSubPane);this._sidebarPaneStack.addPane(this._axNodeSubPane);}
WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.AttrModified,this._onAttrChange,this);WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.AttrRemoved,this._onAttrChange,this);WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.CharacterDataModified,this._onNodeChange,this);WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.ChildNodeCountUpdated,this._onNodeChange,this);},willHide:function()
{WebInspector.targetManager.removeModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.AttrModified,this._onAttrChange,this);WebInspector.targetManager.removeModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.AttrRemoved,this._onAttrChange,this);WebInspector.targetManager.removeModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.CharacterDataModified,this._onNodeChange,this);WebInspector.targetManager.removeModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.ChildNodeCountUpdated,this._onNodeChange,this);},setNode:function(node)
{WebInspector.ThrottledElementsSidebarView.prototype.setNode.call(this,node);if(this._computedTextSubPane)
this._computedTextSubPane.setNode(node);if(this._axNodeSubPane)
this._axNodeSubPane.setNode(node);},_onAttrChange:function(event)
{if(!this.node())
return;var node=event.data.node;if(this.node()!==node)
return;this.update();},_onNodeChange:function(event)
{if(!this.node())
return;var node=event.data;if(this.node()!==node)
return;this.update();},__proto__:WebInspector.ThrottledElementsSidebarView.prototype};WebInspector.AccessibilitySubPane=function(name)
{WebInspector.SidebarPane.call(this,name);this._axNode=null;this.registerRequiredCSS("accessibility/accessibilityNode.css");}
WebInspector.AccessibilitySubPane.prototype={setAXNode:function(axNode)
{},node:function()
{return this._node;},setNode:function(node)
{this._node=node;},createInfo:function(textContent,className)
{var classNameOrDefault=className||"info";var info=createElementWithClass("div",classNameOrDefault);info.textContent=textContent;this.bodyElement.appendChild(info);return info;},createTreeOutline:function(className)
{var treeOutline=new TreeOutlineInShadow(className);treeOutline.registerRequiredCSS("accessibility/accessibilityNode.css");treeOutline.registerRequiredCSS("components/objectValue.css");treeOutline.element.classList.add("hidden");this.bodyElement.appendChild(treeOutline.element);return treeOutline;},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.AXComputedTextSubPane=function()
{WebInspector.AccessibilitySubPane.call(this,WebInspector.UIString("Computed Text"));this._computedTextElement=this.bodyElement.createChild("div","ax-computed-text hidden");this._noTextInfo=this.createInfo(WebInspector.UIString("No computed text"));this._noNodeInfo=this.createInfo(WebInspector.UIString("No accessibility node"));this._treeOutline=this.createTreeOutline("monospace");};WebInspector.AXComputedTextSubPane.prototype={setAXNode:function(axNode)
{if(this._axNode===axNode)
return;this._axNode=axNode;var treeOutline=this._treeOutline;treeOutline.removeChildren();var target=this.node().target();if(!axNode||axNode.ignored){this._noTextInfo.classList.add("hidden");this._computedTextElement.classList.add("hidden");treeOutline.element.classList.add("hidden");this._noNodeInfo.classList.remove("hidden");return;}
this._noNodeInfo.classList.add("hidden");this._computedTextElement.removeChildren();this._computedTextElement.classList.toggle("hidden",!axNode.name||!axNode.name.value);if(axNode.name&&axNode.name.value)
this._computedTextElement.textContent=axNode.name.value;var foundProperty=false;function addProperty(property)
{foundProperty=true;treeOutline.appendChild(new WebInspector.AXNodePropertyTreeElement(property,target));}
for(var propertyName of["name","description","help"]){if(propertyName in axNode){var defaultProperty=({name:propertyName,value:axNode[propertyName]});addProperty(defaultProperty);}}
if("value"in axNode&&axNode.value.type==="string")
addProperty(({name:"value",value:axNode.value}));var propertiesArray=(axNode.properties);for(var property of propertiesArray){if(property.name==AccessibilityAgent.AXWidgetAttributes.Valuetext){addProperty(property);break;}}
treeOutline.element.classList.toggle("hidden",!foundProperty)
this._noTextInfo.classList.toggle("hidden",!treeOutline.element.classList.contains("hidden")||!this._computedTextElement.classList.contains("hidden"));},__proto__:WebInspector.AccessibilitySubPane.prototype};WebInspector.AXNodeSubPane=function()
{WebInspector.AccessibilitySubPane.call(this,WebInspector.UIString("Accessibility Node"));this._noNodeInfo=this.createInfo(WebInspector.UIString("No accessibility node"));this._ignoredInfo=this.createInfo(WebInspector.UIString("Accessibility node not exposed"),"ax-ignored-info hidden");this._treeOutline=this.createTreeOutline('monospace');this._ignoredReasonsTree=this.createTreeOutline();};WebInspector.AXNodeSubPane.prototype={setAXNode:function(axNode)
{if(this._axNode===axNode)
return;this._axNode=axNode;var treeOutline=this._treeOutline;treeOutline.removeChildren();var ignoredReasons=this._ignoredReasonsTree;ignoredReasons.removeChildren();var target=this.node().target();if(!axNode){treeOutline.element.classList.add("hidden");this._ignoredInfo.classList.add("hidden");ignoredReasons.element.classList.add("hidden");this._noNodeInfo.classList.remove("hidden");return;}else if(axNode.ignored){this._noNodeInfo.classList.add("hidden");treeOutline.element.classList.add("hidden");this._ignoredInfo.classList.remove("hidden");ignoredReasons.element.classList.remove("hidden");function addIgnoredReason(property)
{ignoredReasons.appendChild(new WebInspector.AXNodeIgnoredReasonTreeElement(property,axNode,target));}
var ignoredReasonsArray=(axNode.ignoredReasons);for(var reason of ignoredReasonsArray)
addIgnoredReason(reason);if(!ignoredReasons.firstChild())
ignoredReasons.element.classList.add("hidden");return;}
this._ignoredInfo.classList.add("hidden");ignoredReasons.element.classList.add("hidden");this._noNodeInfo.classList.add("hidden");treeOutline.element.classList.remove("hidden");function addProperty(property)
{treeOutline.appendChild(new WebInspector.AXNodePropertyTreeElement(property,target));}
var roleProperty=({name:"role",value:axNode.role});addProperty(roleProperty);for(var propertyName of["description","help","value"]){if(propertyName in axNode){var defaultProperty=({name:propertyName,value:axNode[propertyName]});addProperty(defaultProperty);}}
var propertyMap={};var propertiesArray=(axNode.properties);for(var property of propertiesArray)
propertyMap[property.name]=property;for(var propertySet of[AccessibilityAgent.AXWidgetAttributes,AccessibilityAgent.AXWidgetStates,AccessibilityAgent.AXGlobalStates,AccessibilityAgent.AXLiveRegionAttributes,AccessibilityAgent.AXRelationshipAttributes]){for(var propertyKey in propertySet){var property=propertySet[propertyKey];if(property in propertyMap)
addProperty(propertyMap[property]);}}},__proto__:WebInspector.AccessibilitySubPane.prototype};WebInspector.AXNodePropertyTreeElement=function(property,target)
{this._property=property;this._target=target;TreeElement.call(this,"");this.toggleOnClick=true;this.selectable=false;}
WebInspector.AXNodePropertyTreeElement.prototype={onattach:function()
{this._update();},_update:function()
{this._nameElement=WebInspector.AXNodePropertyTreeElement.createNameElement(this._property.name);var value=this._property.value;if(value.type==="idref"){this._valueElement=WebInspector.AXNodePropertyTreeElement.createRelationshipValueElement(value,this._target);}else if(value.type==="idrefList"){var relatedNodes=value.relatedNodeArrayValue;var numNodes=relatedNodes.length;var description="("+numNodes+(numNodes==1?" node":" nodes")+")";value.value=description;for(var i=0;i<relatedNodes.length;i++){var backendId=relatedNodes[i].backendNodeId;var deferredNode=new WebInspector.DeferredDOMNode(this._target,relatedNodes[i].backendNodeId);var child=new WebInspector.AXRelatedNodeTreeElement(deferredNode);this.appendChild(child);}
this._valueElement=WebInspector.AXNodePropertyTreeElement.createValueElement(value,this.listItemElement);}else{this._valueElement=WebInspector.AXNodePropertyTreeElement.createValueElement(value,this.listItemElement);}
var separatorElement=createElementWithClass("span","separator");separatorElement.textContent=": ";this.listItemElement.removeChildren();this.listItemElement.appendChildren(this._nameElement,separatorElement,this._valueElement);},__proto__:TreeElement.prototype}
WebInspector.AXNodePropertyTreeElement.populateWithNode=function(treeNode,axNode,target)
{}
WebInspector.AXNodePropertyTreeElement.createNameElement=function(name)
{var nameElement=createElementWithClass("span","ax-name");if(/^\s|\s$|^$|\n/.test(name))
nameElement.createTextChildren("\"",name.replace(/\n/g,"\u21B5"),"\"");else
nameElement.textContent=name;return nameElement;}
WebInspector.AXNodePropertyTreeElement.createRelationshipValueElement=function(value,target)
{var deferredNode=new WebInspector.DeferredDOMNode(target,value.relatedNodeValue.backendNodeId);var valueElement=createElement("span");function onNodeResolved(node)
{valueElement.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(node));}
deferredNode.resolve(onNodeResolved);return valueElement;}
WebInspector.AXNodePropertyTreeElement.createValueElement=function(value,parentElement)
{var valueElement=createElementWithClass("span","object-value");var type=value.type;var prefix;var valueText;var suffix;if(type==="string"){prefix="\"";valueText=value.value.replace(/\n/g,"\u21B5");suffix="\"";valueElement._originalTextContent="\""+value.value+"\"";}else{valueText=String(value.value);}
if(type in WebInspector.AXNodePropertyTreeElement.TypeStyles)
valueElement.classList.add(WebInspector.AXNodePropertyTreeElement.TypeStyles[type]);valueElement.setTextContentTruncatedIfNeeded(valueText||"");if(prefix)
valueElement.insertBefore(createTextNode(prefix),valueElement.firstChild);if(suffix)
valueElement.createTextChild(suffix);valueElement.title=String(value.value)||"";return valueElement;}
WebInspector.AXRelatedNodeTreeElement=function(deferredNode)
{this._deferredNode=deferredNode;TreeElement.call(this,"");};WebInspector.AXRelatedNodeTreeElement.prototype={onattach:function()
{this._update();},_update:function()
{var valueElement=createElement("div");this.listItemElement.appendChild(valueElement);function onNodeResolved(node)
{valueElement.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(node));}
this._deferredNode.resolve(onNodeResolved);},__proto__:TreeElement.prototype};WebInspector.AXNodePropertyTreeElement.TypeStyles={boolean:"object-value-boolean",booleanOrUndefined:"object-value-boolean",tristate:"object-value-boolean",number:"object-value-number",integer:"object-value-number",string:"object-value-string",role:"ax-role",internalRole:"ax-internal-role"};WebInspector.AXNodeIgnoredReasonTreeElement=function(property,axNode,target)
{this._property=property;this._axNode=axNode;this._target=target;TreeElement.call(this,"");this.toggleOnClick=true;this.selectable=false;}
WebInspector.AXNodeIgnoredReasonTreeElement.prototype={onattach:function()
{this.listItemElement.removeChildren();this._reasonElement=WebInspector.AXNodeIgnoredReasonTreeElement.createReasonElement(this._property.name,this._axNode);this.listItemElement.appendChild(this._reasonElement);var value=this._property.value;if(value.type==="idref"){this._valueElement=WebInspector.AXNodePropertyTreeElement.createRelationshipValueElement(value,this._target);this.listItemElement.appendChild(this._valueElement);}},__proto__:TreeElement.prototype};WebInspector.AXNodeIgnoredReasonTreeElement.createReasonElement=function(reason,axNode)
{var reasonElement=null;switch(reason){case"activeModalDialog":reasonElement=WebInspector.formatLocalized("Element is hidden by active modal dialog: ",[],"");break;case"ancestorDisallowsChild":reasonElement=WebInspector.formatLocalized("Element is not permitted as child of ",[],"");break;case"ancestorIsLeafNode":reasonElement=WebInspector.formatLocalized("Ancestor's children are all presentational: ",[],"");break;case"ariaHidden":var ariaHiddenSpan=createElement("span","source-code").textContent="aria-hidden";reasonElement=WebInspector.formatLocalized("Element is %s.",[ariaHiddenSpan],"");break;case"ariaHiddenRoot":var ariaHiddenSpan=createElement("span","source-code").textContent="aria-hidden";var trueSpan=createElement("span","source-code").textContent="true";reasonElement=WebInspector.formatLocalized("%s is %s on ancestor: ",[ariaHiddenSpan,trueSpan],"");break;case"emptyAlt":reasonElement=WebInspector.formatLocalized("Element has empty alt text.",[],"");break;case"emptyText":reasonElement=WebInspector.formatLocalized("No text content.",[],"");break;case"inert":reasonElement=WebInspector.formatLocalized("Element is inert.",[],"");break;case"inheritsPresentation":reasonElement=WebInspector.formatLocalized("Element inherits presentational role from ",[],"");break;case"labelContainer":reasonElement=WebInspector.formatLocalized("Part of label element: ",[],"");break;case"labelFor":reasonElement=WebInspector.formatLocalized("Label for ",[],"");break;case"notRendered":reasonElement=WebInspector.formatLocalized("Element is not rendered.",[],"");break;case"notVisible":reasonElement=WebInspector.formatLocalized("Element is not visible.",[],"");break;case"presentationalRole":var rolePresentationSpan=createElement("span","source-code").textContent="role="+axNode.role.value;reasonElement=WebInspector.formatLocalized("Element has %s.",[rolePresentationSpan],"");break;case"probablyPresentational":reasonElement=WebInspector.formatLocalized("Element is presentational.",[],"");break;case"staticTextUsedAsNameFor":reasonElement=WebInspector.formatLocalized("Static text node is used as name for ",[],"");break;case"uninteresting":reasonElement=WebInspector.formatLocalized("Element not interesting for accessibility.",[],"")
break;}
if(reasonElement)
reasonElement.classList.add("ax-reason");return reasonElement;};Runtime.cachedResources["accessibility/accessibilityNode.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.ax-computed-text {\n    padding: 3px 5px 0;\n    background-image: url(Images/speech.png);\n    background-repeat: no-repeat;\n    background-position: 2px center;\n    border-bottom: solid 1px rgba(128, 128, 128, 0.3);\n    padding: 2px 5px;\n    padding-left: 21px;\n    min-height: 18px;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    overflow: hidden;\n    width: 100%;\n    font-style: italic;\n}\n\ndiv.ax-text-alternatives {\n    margin-bottom: 3px;\n    border-bottom: 1px solid #BFBFBF;\n}\n\n.ax-name {\n    color: rgb(136, 19, 145);\n    flex-shrink: 0;\n}\n\nspan.ax-role {\n    color: #006649;\n}\n\nspan.ax-internal-role {\n    font-style: italic;\n}\n\n.ax-ignored-info {\n    padding: 6px;\n    font-style: italic;\n}\n\n/*# sourceURL=accessibility/accessibilityNode.css */";