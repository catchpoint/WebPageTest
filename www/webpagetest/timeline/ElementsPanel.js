





WebInspector.CSSNamedFlowCollectionsView = function()
{
WebInspector.SidebarView.call(this, WebInspector.SidebarView.SidebarPosition.Start);
this.registerRequiredCSS("cssNamedFlows.css");

this._namedFlows = {};
this._contentNodes = {};
this._regionNodes = {};

this.element.addStyleClass("css-named-flow-collections-view");
this.element.addStyleClass("fill");

this._statusElement = document.createElement("span");
this._statusElement.textContent = WebInspector.UIString("CSS Named Flows");

var sidebarHeader = this.firstElement().createChild("div", "tabbed-pane-header selected sidebar-header");
var tab = sidebarHeader.createChild("div", "tabbed-pane-header-tab");
tab.createChild("span", "tabbed-pane-header-tab-title").textContent = WebInspector.UIString("CSS Named Flows");

this._sidebarContentElement = this.firstElement().createChild("div", "sidebar-content outline-disclosure");
this._flowListElement = this._sidebarContentElement.createChild("ol");
this._flowTree = new TreeOutline(this._flowListElement);

this._emptyElement = document.createElement("div");
this._emptyElement.addStyleClass("info");
this._emptyElement.textContent = WebInspector.UIString("No CSS Named Flows");

this._tabbedPane = new WebInspector.TabbedPane();
this._tabbedPane.closeableTabs = true;
this._tabbedPane.show(this.secondElement());
}

WebInspector.CSSNamedFlowCollectionsView.prototype = {
showInDrawer: function()
{
WebInspector.showViewInDrawer(this._statusElement, this);
},

reset: function()
{
if (!this._document)
return;

WebInspector.cssModel.getNamedFlowCollectionAsync(this._document.id, this._resetNamedFlows.bind(this));
},


_setDocument: function(document)
{
this._document = document;
this.reset();
},


_documentUpdated: function(event)
{
var document =   (event.data);
this._setDocument(document);
},


_setSidebarHasContent: function(hasContent)
{
if (hasContent) {
if (!this._emptyElement.parentNode)
return;

this._sidebarContentElement.removeChild(this._emptyElement);
this._sidebarContentElement.appendChild(this._flowListElement);
} else {
if (!this._flowListElement.parentNode)
return;

this._sidebarContentElement.removeChild(this._flowListElement);
this._sidebarContentElement.appendChild(this._emptyElement);
}
},


_appendNamedFlow: function(flow)
{
var flowHash = this._hashNamedFlow(flow.documentNodeId, flow.name);
var flowContainer = { flow: flow, flowHash: flowHash };

for (var i = 0; i < flow.content.length; ++i)
this._contentNodes[flow.content[i]] = flowHash;
for (var i = 0; i < flow.regions.length; ++i)
this._regionNodes[flow.regions[i].nodeId] = flowHash;

var flowTreeItem = new WebInspector.FlowTreeElement(flowContainer);
flowTreeItem.onselect = this._selectNamedFlowTab.bind(this, flowHash);

flowContainer.flowTreeItem = flowTreeItem;
this._namedFlows[flowHash] = flowContainer;

if (!this._flowTree.children.length)
this._setSidebarHasContent(true);
this._flowTree.appendChild(flowTreeItem);
},


_removeNamedFlow: function(flowHash)
{
var flowContainer = this._namedFlows[flowHash];

if (this._tabbedPane._tabsById[flowHash])
this._tabbedPane.closeTab(flowHash);
this._flowTree.removeChild(flowContainer.flowTreeItem);

var flow = flowContainer.flow;
for (var i = 0; i < flow.content.length; ++i)
delete this._contentNodes[flow.content[i]];
for (var i = 0; i < flow.regions.length; ++i)
delete this._regionNodes[flow.regions[i].nodeId];

delete this._namedFlows[flowHash];

if (!this._flowTree.children.length)
this._setSidebarHasContent(false);
},


_updateNamedFlow: function(flow)
{
var flowHash = this._hashNamedFlow(flow.documentNodeId, flow.name);
var flowContainer = this._namedFlows[flowHash];

if (!flowContainer)
return;

var oldFlow = flowContainer.flow;
flowContainer.flow = flow;

for (var i = 0; i < oldFlow.content.length; ++i)
delete this._contentNodes[oldFlow.content[i]];
for (var i = 0; i < oldFlow.regions.length; ++i)
delete this._regionNodes[oldFlow.regions[i].nodeId];

for (var i = 0; i < flow.content.length; ++i)
this._contentNodes[flow.content[i]] = flowHash;
for (var i = 0; i < flow.regions.length; ++i)
this._regionNodes[flow.regions[i].nodeId] = flowHash;

flowContainer.flowTreeItem.setOverset(flow.overset);

if (flowContainer.flowView)
flowContainer.flowView.flow = flow;
},


_resetNamedFlows: function(namedFlowCollection)
{
for (var flowHash in this._namedFlows)
this._removeNamedFlow(flowHash);

var namedFlows = namedFlowCollection.namedFlowMap;
for (var flowName in namedFlows)
this._appendNamedFlow(namedFlows[flowName]);

if (!this._flowTree.children.length)
this._setSidebarHasContent(false);
else
this._showNamedFlowForNode(WebInspector.panel("elements").treeOutline.selectedDOMNode());
},


_namedFlowCreated: function(event)
{

if (event.data.documentNodeId !== this._document.id)
return;

var flow =   (event.data);
this._appendNamedFlow(flow);
},


_namedFlowRemoved: function(event)
{

if (event.data.documentNodeId !== this._document.id)
return;

this._removeNamedFlow(this._hashNamedFlow(event.data.documentNodeId, event.data.flowName));
},


_regionLayoutUpdated: function(event)
{

if (event.data.documentNodeId !== this._document.id)
return;

var flow =   (event.data);
this._updateNamedFlow(flow);
},


_hashNamedFlow: function(documentNodeId, flowName)
{
return documentNodeId + "|" + flowName;
},


_showNamedFlow: function(flowHash)
{
this._selectNamedFlowInSidebar(flowHash);
this._selectNamedFlowTab(flowHash);
},


_selectNamedFlowInSidebar: function(flowHash)
{
this._namedFlows[flowHash].flowTreeItem.select(true);
},


_selectNamedFlowTab: function(flowHash)
{
var flowContainer = this._namedFlows[flowHash];

if (this._tabbedPane.selectedTabId === flowHash)
return;

if (!this._tabbedPane.selectTab(flowHash)) {
if (!flowContainer.flowView)
flowContainer.flowView = new WebInspector.CSSNamedFlowView(flowContainer.flow);

this._tabbedPane.appendTab(flowHash, flowContainer.flow.name, flowContainer.flowView);
this._tabbedPane.selectTab(flowHash);
}
},


_selectedNodeChanged: function(event)
{
var node =   (event.data);
this._showNamedFlowForNode(node);
},


_tabSelected: function(event)
{
this._selectNamedFlowInSidebar(event.data.tabId);
},


_tabClosed: function(event)
{
this._namedFlows[event.data.tabId].flowTreeItem.deselect();
},


_showNamedFlowForNode: function(node)
{
if (!node)
return;

if (this._regionNodes[node.id]) {
this._showNamedFlow(this._regionNodes[node.id]);
return;
}

while (node) {
if (this._contentNodes[node.id]) {
this._showNamedFlow(this._contentNodes[node.id]);
return;
}

node = node.parentNode;
}
},

wasShown: function()
{
WebInspector.SidebarView.prototype.wasShown.call(this);

WebInspector.domAgent.requestDocument(this._setDocument.bind(this));

WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.DocumentUpdated, this._documentUpdated, this);

WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.NamedFlowCreated, this._namedFlowCreated, this);
WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.NamedFlowRemoved, this._namedFlowRemoved, this);
WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.RegionLayoutUpdated, this._regionLayoutUpdated, this);

WebInspector.panel("elements").treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);

this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabClosed, this._tabClosed, this);
},

willHide: function()
{
WebInspector.domAgent.removeEventListener(WebInspector.DOMAgent.Events.DocumentUpdated, this._documentUpdated, this);

WebInspector.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.NamedFlowCreated, this._namedFlowCreated, this);
WebInspector.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.NamedFlowRemoved, this._namedFlowRemoved, this);
WebInspector.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.RegionLayoutUpdated, this._regionLayoutUpdated, this);

WebInspector.panel("elements").treeOutline.removeEventListener(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);

this._tabbedPane.removeEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
this._tabbedPane.removeEventListener(WebInspector.TabbedPane.EventTypes.TabClosed, this._tabClosed, this);
},

__proto__: WebInspector.SidebarView.prototype
}


WebInspector.FlowTreeElement = function(flowContainer)
{
var container = document.createElement("div");
container.createChild("div", "selection");
container.createChild("span", "title").createChild("span").textContent = flowContainer.flow.name;

TreeElement.call(this, container, flowContainer, false);

this._overset = false;
this.setOverset(flowContainer.flow.overset);
}

WebInspector.FlowTreeElement.prototype = {

setOverset: function(newOverset)
{
if (this._overset === newOverset)
return;

if (newOverset) {
this.title.addStyleClass("named-flow-overflow");
this.tooltip = WebInspector.UIString("Overflows.");
} else {
this.title.removeStyleClass("named-flow-overflow");
this.tooltip = "";
}

this._overset = newOverset;
},

__proto__: TreeElement.prototype
}
;



WebInspector.CSSNamedFlowView = function(flow)
{
WebInspector.View.call(this);
this.element.addStyleClass("css-named-flow");
this.element.addStyleClass("outline-disclosure");

this._treeOutline = new TreeOutline(this.element.createChild("ol"), true);

this._contentTreeItem = new TreeElement(WebInspector.UIString("content"), null, true);
this._treeOutline.appendChild(this._contentTreeItem);

this._regionsTreeItem = new TreeElement(WebInspector.UIString("region chain"), null, true);
this._regionsTreeItem.expand();
this._treeOutline.appendChild(this._regionsTreeItem);

this._flow = flow;

var content = flow.content;
for (var i = 0; i < content.length; ++i)
this._insertContentNode(content[i]);

var regions = flow.regions;
for (var i = 0; i < regions.length; ++i)
this._insertRegion(regions[i]);
}

WebInspector.CSSNamedFlowView.OversetTypeMessageMap = {
empty: "empty",
fit: "fit",
overset: "overset"
}

WebInspector.CSSNamedFlowView.prototype = {

_createFlowTreeOutline: function(rootDOMNode)
{
if (!rootDOMNode)
return null;

var treeOutline = new WebInspector.ElementsTreeOutline(false, false, true);
treeOutline.element.addStyleClass("named-flow-element");
treeOutline.setVisible(true);
treeOutline.rootDOMNode = rootDOMNode;
treeOutline.wireToDomAgent();
WebInspector.domAgent.removeEventListener(WebInspector.DOMAgent.Events.DocumentUpdated, treeOutline._elementsTreeUpdater._documentUpdated, treeOutline._elementsTreeUpdater);

return treeOutline;
},


_insertContentNode: function(contentNodeId, index)
{
var treeOutline = this._createFlowTreeOutline(WebInspector.domAgent.nodeForId(contentNodeId));
var treeItem = new TreeElement(treeOutline.element, treeOutline);

if (index === undefined) {
this._contentTreeItem.appendChild(treeItem);
return;
}

this._contentTreeItem.insertChild(treeItem, index);
},


_insertRegion: function(region, index)
{
var treeOutline = this._createFlowTreeOutline(WebInspector.domAgent.nodeForId(region.nodeId));
treeOutline.element.addStyleClass("region-" + region.regionOverset);

var treeItem = new TreeElement(treeOutline.element, treeOutline);
var oversetText = WebInspector.UIString(WebInspector.CSSNamedFlowView.OversetTypeMessageMap[region.regionOverset]);
treeItem.tooltip = WebInspector.UIString("Region is %s.", oversetText);

if (index === undefined) {
this._regionsTreeItem.appendChild(treeItem);
return;
}

this._regionsTreeItem.insertChild(treeItem, index);
},

get flow()
{
return this._flow;
},

set flow(newFlow)
{
this._update(newFlow);
},


_updateRegionOverset: function(regionTreeItem, newRegionOverset, oldRegionOverset)
{
var element = regionTreeItem.representedObject.element;
element.removeStyleClass("region-" + oldRegionOverset);
element.addStyleClass("region-" + newRegionOverset);

var oversetText = WebInspector.UIString(WebInspector.CSSNamedFlowView.OversetTypeMessageMap[newRegionOverset]);
regionTreeItem.tooltip = WebInspector.UIString("Region is %s." , oversetText);
},


_mergeContentNodes: function(oldContent, newContent)
{
var nodeIdSet = {};
for (var i = 0; i < newContent.length; ++i)
nodeIdSet[newContent[i]] = true;

var oldContentIndex = 0;
var newContentIndex = 0;
var contentTreeChildIndex = 0;

while(oldContentIndex < oldContent.length || newContentIndex < newContent.length) {
if (oldContentIndex === oldContent.length) {
this._insertContentNode(newContent[newContentIndex]);
++newContentIndex;
continue;
}

if (newContentIndex === newContent.length) {
this._contentTreeItem.removeChildAtIndex(contentTreeChildIndex);
++oldContentIndex;
continue;
}

if (oldContent[oldContentIndex] === newContent[newContentIndex]) {
++oldContentIndex;
++newContentIndex;
++contentTreeChildIndex;
continue;
}

if (nodeIdSet[oldContent[oldContentIndex]]) {
this._insertContentNode(newContent[newContentIndex], contentTreeChildIndex);
++newContentIndex;
++contentTreeChildIndex;
continue;
}

this._contentTreeItem.removeChildAtIndex(contentTreeChildIndex);
++oldContentIndex;
}
},


_mergeRegions: function(oldRegions, newRegions)
{
var nodeIdSet = {};
for (var i = 0; i < newRegions.length; ++i)
nodeIdSet[newRegions[i].nodeId] = true;

var oldRegionsIndex = 0;
var newRegionsIndex = 0;
var regionsTreeChildIndex = 0;

while(oldRegionsIndex < oldRegions.length || newRegionsIndex < newRegions.length) {
if (oldRegionsIndex === oldRegions.length) {
this._insertRegion(newRegions[newRegionsIndex]);
++newRegionsIndex;
continue;
}

if (newRegionsIndex === newRegions.length) {
this._regionsTreeItem.removeChildAtIndex(regionsTreeChildIndex);
++oldRegionsIndex;
continue;
}

if (oldRegions[oldRegionsIndex].nodeId === newRegions[newRegionsIndex].nodeId) {
if (oldRegions[oldRegionsIndex].regionOverset !== newRegions[newRegionsIndex].regionOverset)
this._updateRegionOverset(this._regionsTreeItem.children[regionsTreeChildIndex], newRegions[newRegionsIndex].regionOverset, oldRegions[oldRegionsIndex].regionOverset);
++oldRegionsIndex;
++newRegionsIndex;
++regionsTreeChildIndex;
continue;
}

if (nodeIdSet[oldRegions[oldRegionsIndex].nodeId]) {
this._insertRegion(newRegions[newRegionsIndex], regionsTreeChildIndex);
++newRegionsIndex;
++regionsTreeChildIndex;
continue;
}

this._regionsTreeItem.removeChildAtIndex(regionsTreeChildIndex);
++oldRegionsIndex;
}
},


_update: function(newFlow)
{
this._mergeContentNodes(this._flow.content, newFlow.content);
this._mergeRegions(this._flow.regions, newFlow.regions);

this._flow = newFlow;
},

__proto__: WebInspector.View.prototype
}
;



WebInspector.EventListenersSidebarPane = function()
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Event Listeners"));
this.bodyElement.addStyleClass("events-pane");

this.sections = [];

this.settingsSelectElement = document.createElement("select");
this.settingsSelectElement.className = "select-filter";

var option = document.createElement("option");
option.value = "all";
option.label = WebInspector.UIString("All Nodes");
this.settingsSelectElement.appendChild(option);

option = document.createElement("option");
option.value = "selected";
option.label = WebInspector.UIString("Selected Node Only");
this.settingsSelectElement.appendChild(option);

var filter = WebInspector.settings.eventListenersFilter.get();
if (filter === "all")
this.settingsSelectElement[0].selected = true;
else if (filter === "selected")
this.settingsSelectElement[1].selected = true;
this.settingsSelectElement.addEventListener("click", function(event) { event.consume() }, false);
this.settingsSelectElement.addEventListener("change", this._changeSetting.bind(this), false);

this.titleElement.appendChild(this.settingsSelectElement);

this._linkifier = new WebInspector.Linkifier();
}

WebInspector.EventListenersSidebarPane._objectGroupName = "event-listeners-sidebar-pane";

WebInspector.EventListenersSidebarPane.prototype = {
update: function(node)
{
RuntimeAgent.releaseObjectGroup(WebInspector.EventListenersSidebarPane._objectGroupName);
this._linkifier.reset();

var body = this.bodyElement;
body.removeChildren();
this.sections = [];

var self = this;
function callback(error, eventListeners) {
if (error)
return;

var selectedNodeOnly = "selected" === WebInspector.settings.eventListenersFilter.get();
var sectionNames = [];
var sectionMap = {};
for (var i = 0; i < eventListeners.length; ++i) {
var eventListener = eventListeners[i];
if (selectedNodeOnly && (node.id !== eventListener.nodeId))
continue;
eventListener.node = WebInspector.domAgent.nodeForId(eventListener.nodeId);
delete eventListener.nodeId; 
if (/^function _inspectorCommandLineAPI_logEvent\(/.test(eventListener.handlerBody.toString()))
continue; 
var type = eventListener.type;
var section = sectionMap[type];
if (!section) {
section = new WebInspector.EventListenersSection(type, node.id, self._linkifier);
sectionMap[type] = section;
sectionNames.push(type);
self.sections.push(section);
}
section.addListener(eventListener);
}

if (sectionNames.length === 0) {
var div = document.createElement("div");
div.className = "info";
div.textContent = WebInspector.UIString("No Event Listeners");
body.appendChild(div);
return;
}

sectionNames.sort();
for (var i = 0; i < sectionNames.length; ++i) {
var section = sectionMap[sectionNames[i]];
body.appendChild(section.element);
}
}

if (node)
node.eventListeners(WebInspector.EventListenersSidebarPane._objectGroupName, callback);
this._selectedNode = node;
},

willHide: function()
{
delete this._selectedNode;
},

_changeSetting: function()
{
var selectedOption = this.settingsSelectElement[this.settingsSelectElement.selectedIndex];
WebInspector.settings.eventListenersFilter.set(selectedOption.value);
this.update(this._selectedNode);
},

__proto__: WebInspector.SidebarPane.prototype
}


WebInspector.EventListenersSection = function(title, nodeId, linkifier)
{
this.eventListeners = [];
this._nodeId = nodeId;
this._linkifier = linkifier;
WebInspector.PropertiesSection.call(this, title);


this.propertiesElement.parentNode.removeChild(this.propertiesElement);
delete this.propertiesElement;
delete this.propertiesTreeOutline;

this._eventBars = document.createElement("div");
this._eventBars.className = "event-bars";
this.element.appendChild(this._eventBars);
}

WebInspector.EventListenersSection.prototype = {
addListener: function(eventListener)
{
var eventListenerBar = new WebInspector.EventListenerBar(eventListener, this._nodeId, this._linkifier);
this._eventBars.appendChild(eventListenerBar.element);
},

__proto__: WebInspector.PropertiesSection.prototype
}


WebInspector.EventListenerBar = function(eventListener, nodeId, linkifier)
{
WebInspector.ObjectPropertiesSection.call(this, WebInspector.RemoteObject.fromPrimitiveValue(""));

this.eventListener = eventListener;
this._nodeId = nodeId;
this._setNodeTitle();
this._setFunctionSubtitle(linkifier);
this.editable = false;
this.element.className = "event-bar";  
this.headerElement.addStyleClass("source-code");
this.propertiesElement.className = "event-properties properties-tree source-code";  
}

WebInspector.EventListenerBar.prototype = {
update: function()
{
function updateWithNodeObject(nodeObject)
{
var properties = [];

if (this.eventListener.type)
properties.push(WebInspector.RemoteObjectProperty.fromPrimitiveValue("type", this.eventListener.type));
if (typeof this.eventListener.useCapture !== "undefined")
properties.push(WebInspector.RemoteObjectProperty.fromPrimitiveValue("useCapture", this.eventListener.useCapture));
if (typeof this.eventListener.isAttribute !== "undefined")
properties.push(WebInspector.RemoteObjectProperty.fromPrimitiveValue("isAttribute", this.eventListener.isAttribute));
if (nodeObject)
properties.push(new WebInspector.RemoteObjectProperty("node", nodeObject));
if (typeof this.eventListener.handler !== "undefined") {
var remoteObject = WebInspector.RemoteObject.fromPayload(this.eventListener.handler);
properties.push(new WebInspector.RemoteObjectProperty("handler", remoteObject));
}
if (typeof this.eventListener.handlerBody !== "undefined")
properties.push(WebInspector.RemoteObjectProperty.fromPrimitiveValue("listenerBody", this.eventListener.handlerBody));
if (this.eventListener.sourceName)
properties.push(WebInspector.RemoteObjectProperty.fromPrimitiveValue("sourceName", this.eventListener.sourceName));
if (this.eventListener.location)
properties.push(WebInspector.RemoteObjectProperty.fromPrimitiveValue("lineNumber", this.eventListener.location.lineNumber + 1));

this.updateProperties(properties);
}
WebInspector.RemoteObject.resolveNode(this.eventListener.node, WebInspector.EventListenersSidebarPane._objectGroupName, updateWithNodeObject.bind(this));
},

_setNodeTitle: function()
{
var node = this.eventListener.node;
if (!node)
return;

if (node.nodeType() === Node.DOCUMENT_NODE) {
this.titleElement.textContent = "document";
return;
}

if (node.id === this._nodeId) {
this.titleElement.textContent = node.appropriateSelectorFor();
return;
}

this.titleElement.removeChildren();
this.titleElement.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(this.eventListener.node));
},

_setFunctionSubtitle: function(linkifier)
{

if (this.eventListener.location) {
this.subtitleElement.removeChildren();
var urlElement;
if (this.eventListener.location.scriptId)
urlElement = linkifier.linkifyRawLocation(this.eventListener.location);
if (!urlElement) {
var url = this.eventListener.sourceName;
var lineNumber = this.eventListener.location.lineNumber;
var columnNumber = 0;
urlElement = linkifier.linkifyLocation(url, lineNumber, columnNumber);
}
this.subtitleElement.appendChild(urlElement);
} else {
var match = this.eventListener.handlerBody.match(/function ([^\(]+?)\(/);
if (match)
this.subtitleElement.textContent = match[1];
else
this.subtitleElement.textContent = WebInspector.UIString("(anonymous function)");
}
},

__proto__: WebInspector.ObjectPropertiesSection.prototype
}
;



WebInspector.MetricsSidebarPane = function()
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Metrics"));

WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._styleSheetOrMediaQueryResultChanged, this);
WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged, this._styleSheetOrMediaQueryResultChanged, this);
WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.AttrModified, this._attributesUpdated, this);
WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.AttrRemoved, this._attributesUpdated, this);
}

WebInspector.MetricsSidebarPane.prototype = {

update: function(node)
{
if (node)
this.node = node;
this._innerUpdate();
},

_innerUpdate: function()
{


if (this._isEditingMetrics)
return;


var node = this.node;

if (!node || node.nodeType() !== Node.ELEMENT_NODE) {
this.bodyElement.removeChildren();
return;
}

function callback(style)
{
if (!style || this.node !== node)
return;
this._updateMetrics(style);
}
WebInspector.cssModel.getComputedStyleAsync(node.id, callback.bind(this));

function inlineStyleCallback(style)
{
if (!style || this.node !== node)
return;
this.inlineStyle = style;
}
WebInspector.cssModel.getInlineStylesAsync(node.id, inlineStyleCallback.bind(this));
},

_styleSheetOrMediaQueryResultChanged: function()
{
this._innerUpdate();
},

_attributesUpdated: function(event)
{
if (this.node !== event.data.node)
return;

this._innerUpdate();
},

_getPropertyValueAsPx: function(style, propertyName)
{
return Number(style.getPropertyValue(propertyName).replace(/px$/, "") || 0);
},

_getBox: function(computedStyle, componentName)
{
var suffix = componentName === "border" ? "-width" : "";
var left = this._getPropertyValueAsPx(computedStyle, componentName + "-left" + suffix);
var top = this._getPropertyValueAsPx(computedStyle, componentName + "-top" + suffix);
var right = this._getPropertyValueAsPx(computedStyle, componentName + "-right" + suffix);
var bottom = this._getPropertyValueAsPx(computedStyle, componentName + "-bottom" + suffix);
return { left: left, top: top, right: right, bottom: bottom };
},

_highlightDOMNode: function(showHighlight, mode, event)
{
event.consume();
var nodeId = showHighlight && this.node ? this.node.id : 0;
if (nodeId) {
if (this._highlightMode === mode)
return;
this._highlightMode = mode;
WebInspector.domAgent.highlightDOMNode(nodeId, mode);
} else {
delete this._highlightMode;
WebInspector.domAgent.hideDOMNodeHighlight();
}

for (var i = 0; this._boxElements && i < this._boxElements.length; ++i) {
var element = this._boxElements[i];
if (!nodeId || mode === "all" || element._name === mode)
element.style.backgroundColor = element._backgroundColor;
else
element.style.backgroundColor = "";
}
},

_updateMetrics: function(style)
{

var metricsElement = document.createElement("div");
metricsElement.className = "metrics";
var self = this;

function createBoxPartElement(style, name, side, suffix)
{
var propertyName = (name !== "position" ? name + "-" : "") + side + suffix;
var value = style.getPropertyValue(propertyName);
if (value === "" || (name !== "position" && value === "0px"))
value = "\u2012";
else if (name === "position" && value === "auto")
value = "\u2012";
value = value.replace(/px$/, "");

var element = document.createElement("div");
element.className = side;
element.textContent = value;
element.addEventListener("dblclick", this.startEditing.bind(this, element, name, propertyName, style), false);
return element;
}

function getContentAreaWidthPx(style)
{
var width = style.getPropertyValue("width").replace(/px$/, "");
if (style.getPropertyValue("box-sizing") === "border-box") {
var borderBox = self._getBox(style, "border");
var paddingBox = self._getBox(style, "padding");

width = width - borderBox.left - borderBox.right - paddingBox.left - paddingBox.right;
}

return width;
}

function getContentAreaHeightPx(style)
{
var height = style.getPropertyValue("height").replace(/px$/, "");
if (style.getPropertyValue("box-sizing") === "border-box") {
var borderBox = self._getBox(style, "border");
var paddingBox = self._getBox(style, "padding");

height = height - borderBox.top - borderBox.bottom - paddingBox.top - paddingBox.bottom;
}

return height;
}


var noMarginDisplayType = {
"table-cell": true,
"table-column": true,
"table-column-group": true,
"table-footer-group": true,
"table-header-group": true,
"table-row": true,
"table-row-group": true
};


var noPaddingDisplayType = {
"table-column": true,
"table-column-group": true,
"table-footer-group": true,
"table-header-group": true,
"table-row": true,
"table-row-group": true
};


var noPositionType = {
"static": true
};

var boxes = ["content", "padding", "border", "margin", "position"];
var boxColors = [
WebInspector.Color.PageHighlight.Content,
WebInspector.Color.PageHighlight.Padding,
WebInspector.Color.PageHighlight.Border,
WebInspector.Color.PageHighlight.Margin,
WebInspector.Color.fromRGBA([0, 0, 0, 0])
];
var boxLabels = [WebInspector.UIString("content"), WebInspector.UIString("padding"), WebInspector.UIString("border"), WebInspector.UIString("margin"), WebInspector.UIString("position")];
var previousBox = null;
this._boxElements = [];
for (var i = 0; i < boxes.length; ++i) {
var name = boxes[i];

if (name === "margin" && noMarginDisplayType[style.getPropertyValue("display")])
continue;
if (name === "padding" && noPaddingDisplayType[style.getPropertyValue("display")])
continue;
if (name === "position" && noPositionType[style.getPropertyValue("position")])
continue;

var boxElement = document.createElement("div");
boxElement.className = name;
boxElement._backgroundColor = boxColors[i].toString(WebInspector.Color.Format.RGBA);
boxElement._name = name;
boxElement.style.backgroundColor = boxElement._backgroundColor;
boxElement.addEventListener("mouseover", this._highlightDOMNode.bind(this, true, name === "position" ? "all" : name), false);
this._boxElements.push(boxElement);

if (name === "content") {
var widthElement = document.createElement("span");
widthElement.textContent = getContentAreaWidthPx(style);
widthElement.addEventListener("dblclick", this.startEditing.bind(this, widthElement, "width", "width", style), false);

var heightElement = document.createElement("span");
heightElement.textContent = getContentAreaHeightPx(style);
heightElement.addEventListener("dblclick", this.startEditing.bind(this, heightElement, "height", "height", style), false);

boxElement.appendChild(widthElement);
boxElement.appendChild(document.createTextNode(" \u00D7 "));
boxElement.appendChild(heightElement);
} else {
var suffix = (name === "border" ? "-width" : "");

var labelElement = document.createElement("div");
labelElement.className = "label";
labelElement.textContent = boxLabels[i];
boxElement.appendChild(labelElement);

boxElement.appendChild(createBoxPartElement.call(this, style, name, "top", suffix));
boxElement.appendChild(document.createElement("br"));
boxElement.appendChild(createBoxPartElement.call(this, style, name, "left", suffix));

if (previousBox)
boxElement.appendChild(previousBox);

boxElement.appendChild(createBoxPartElement.call(this, style, name, "right", suffix));
boxElement.appendChild(document.createElement("br"));
boxElement.appendChild(createBoxPartElement.call(this, style, name, "bottom", suffix));
}

previousBox = boxElement;
}

metricsElement.appendChild(previousBox);
metricsElement.addEventListener("mouseover", this._highlightDOMNode.bind(this, false, ""), false);
this.bodyElement.removeChildren();
this.bodyElement.appendChild(metricsElement);
},

startEditing: function(targetElement, box, styleProperty, computedStyle)
{
if (WebInspector.isBeingEdited(targetElement))
return;

var context = { box: box, styleProperty: styleProperty, computedStyle: computedStyle };
var boundKeyDown = this._handleKeyDown.bind(this, context, styleProperty);
context.keyDownHandler = boundKeyDown;
targetElement.addEventListener("keydown", boundKeyDown, false);

this._isEditingMetrics = true;

var config = new WebInspector.EditingConfig(this.editingCommitted.bind(this), this.editingCancelled.bind(this), context);
WebInspector.startEditing(targetElement, config);

window.getSelection().setBaseAndExtent(targetElement, 0, targetElement, 1);
},

_handleKeyDown: function(context, styleProperty, event)
{
var element = event.currentTarget;

function finishHandler(originalValue, replacementString)
{
this._applyUserInput(element, replacementString, originalValue, context, false);
}

function customNumberHandler(number)
{
if (styleProperty !== "margin" && number < 0)
number = 0;
return number;
}

WebInspector.handleElementValueModifications(event, element, finishHandler.bind(this), undefined, customNumberHandler);
},

editingEnded: function(element, context)
{
delete this.originalPropertyData;
delete this.previousPropertyDataCandidate;
element.removeEventListener("keydown", context.keyDownHandler, false);
delete this._isEditingMetrics;
},

editingCancelled: function(element, context)
{
if ("originalPropertyData" in this && this.inlineStyle) {
if (!this.originalPropertyData) {

var pastLastSourcePropertyIndex = this.inlineStyle.pastLastSourcePropertyIndex();
if (pastLastSourcePropertyIndex)
this.inlineStyle.allProperties[pastLastSourcePropertyIndex - 1].setText("", false);
} else
this.inlineStyle.allProperties[this.originalPropertyData.index].setText(this.originalPropertyData.propertyText, false);
}
this.editingEnded(element, context);
this.update();
},

_applyUserInput: function(element, userInput, previousContent, context, commitEditor)
{
if (!this.inlineStyle) {

return this.editingCancelled(element, context); 
}

if (commitEditor && userInput === previousContent)
return this.editingCancelled(element, context); 

if (context.box !== "position" && (!userInput || userInput === "\u2012"))
userInput = "0px";
else if (context.box === "position" && (!userInput || userInput === "\u2012"))
userInput = "auto";

userInput = userInput.toLowerCase();

if (/^\d+$/.test(userInput))
userInput += "px";

var styleProperty = context.styleProperty;
var computedStyle = context.computedStyle;

if (computedStyle.getPropertyValue("box-sizing") === "border-box" && (styleProperty === "width" || styleProperty === "height")) {
if (!userInput.match(/px$/)) {
WebInspector.log("For elements with box-sizing: border-box, only absolute content area dimensions can be applied", WebInspector.ConsoleMessage.MessageLevel.Error, true);
return;
}

var borderBox = this._getBox(computedStyle, "border");
var paddingBox = this._getBox(computedStyle, "padding");
var userValuePx = Number(userInput.replace(/px$/, ""));
if (isNaN(userValuePx))
return;
if (styleProperty === "width")
userValuePx += borderBox.left + borderBox.right + paddingBox.left + paddingBox.right;
else
userValuePx += borderBox.top + borderBox.bottom + paddingBox.top + paddingBox.bottom;

userInput = userValuePx + "px";
}

this.previousPropertyDataCandidate = null;
var self = this;
var callback = function(style) {
if (!style)
return;
self.inlineStyle = style;
if (!("originalPropertyData" in self))
self.originalPropertyData = self.previousPropertyDataCandidate;

if (typeof self._highlightMode !== "undefined") {
WebInspector.domAgent.highlightDOMNode(self.node.id, self._highlightMode);
}

if (commitEditor) {
self.dispatchEventToListeners("metrics edited");
self.update();
}
};

var allProperties = this.inlineStyle.allProperties;
for (var i = 0; i < allProperties.length; ++i) {
var property = allProperties[i];
if (property.name !== context.styleProperty || property.inactive)
continue;

this.previousPropertyDataCandidate = property;
property.setValue(userInput, commitEditor, true, callback);
return;
}

this.inlineStyle.appendProperty(context.styleProperty, userInput, callback);
},

editingCommitted: function(element, userInput, previousContent, context)
{
this.editingEnded(element, context);
this._applyUserInput(element, userInput, previousContent, context, true);
},

__proto__: WebInspector.SidebarPane.prototype
}
;



WebInspector.PropertiesSidebarPane = function()
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Properties"));
}

WebInspector.PropertiesSidebarPane._objectGroupName = "properties-sidebar-pane";

WebInspector.PropertiesSidebarPane.prototype = {
update: function(node)
{
var body = this.bodyElement;

if (!node) {
body.removeChildren();
this.sections = [];
return;
}

WebInspector.RemoteObject.resolveNode(node, WebInspector.PropertiesSidebarPane._objectGroupName, nodeResolved.bind(this));

function nodeResolved(object)
{
if (!object)
return;
function protoList()
{
var proto = this;
var result = {};
var counter = 1;
while (proto) {
result[counter++] = proto;
proto = proto.__proto__;
}
return result;
}
object.callFunction(protoList, undefined, nodePrototypesReady.bind(this));
object.release();
}

function nodePrototypesReady(object)
{
if (!object)
return;
object.getOwnProperties(fillSection.bind(this));
}

function fillSection(prototypes)
{
if (!prototypes)
return;

var body = this.bodyElement;
body.removeChildren();
this.sections = [];


for (var i = 0; i < prototypes.length; ++i) {
if (!parseInt(prototypes[i].name, 10))
continue;

var prototype = prototypes[i].value;
var title = prototype.description;
if (title.match(/Prototype$/))
title = title.replace(/Prototype$/, "");
var section = new WebInspector.ObjectPropertiesSection(prototype, title);
this.sections.push(section);
body.appendChild(section.element);
}
}
},

__proto__: WebInspector.SidebarPane.prototype
}
;



WebInspector.StylesSidebarPane = function(computedStylePane, setPseudoClassCallback)
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Styles"));

this.settingsSelectElement = document.createElement("select");
this.settingsSelectElement.className = "select-settings";

var option = document.createElement("option");
option.value = WebInspector.Color.Format.Original;
option.label = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "As authored" : "As Authored");
this.settingsSelectElement.appendChild(option);

option = document.createElement("option");
option.value = WebInspector.Color.Format.HEX;
option.label = WebInspector.UIString("Hex Colors");
this.settingsSelectElement.appendChild(option);

option = document.createElement("option");
option.value = WebInspector.Color.Format.RGB;
option.label = WebInspector.UIString("RGB Colors");
this.settingsSelectElement.appendChild(option);

option = document.createElement("option");
option.value = WebInspector.Color.Format.HSL;
option.label = WebInspector.UIString("HSL Colors");
this.settingsSelectElement.appendChild(option);


var muteEventListener = function(event) { event.consume(true); };

this.settingsSelectElement.addEventListener("click", muteEventListener, true);
this.settingsSelectElement.addEventListener("change", this._changeSetting.bind(this), false);
this._updateColorFormatFilter();

this.titleElement.appendChild(this.settingsSelectElement);

this._elementStateButton = document.createElement("button");
this._elementStateButton.className = "pane-title-button element-state";
this._elementStateButton.title = WebInspector.UIString("Toggle Element State");
this._elementStateButton.addEventListener("click", this._toggleElementStatePane.bind(this), false);
this.titleElement.appendChild(this._elementStateButton);

var addButton = document.createElement("button");
addButton.className = "pane-title-button add";
addButton.id = "add-style-button-test-id";
addButton.title = WebInspector.UIString("New Style Rule");
addButton.addEventListener("click", this._createNewRule.bind(this), false);
this.titleElement.appendChild(addButton);

this._computedStylePane = computedStylePane;
computedStylePane._stylesSidebarPane = this;
this._setPseudoClassCallback = setPseudoClassCallback;
this.element.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
WebInspector.settings.colorFormat.addChangeListener(this._colorFormatSettingChanged.bind(this));

this._createElementStatePane();
this.bodyElement.appendChild(this._elementStatePane);
this._sectionsContainer = document.createElement("div");
this.bodyElement.appendChild(this._sectionsContainer);

this._spectrumHelper = new WebInspector.SpectrumPopupHelper();
this._linkifier = new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultCSSFormatter());

WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._styleSheetOrMediaQueryResultChanged, this);
WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged, this._styleSheetOrMediaQueryResultChanged, this);
WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.AttrModified, this._attributeChanged, this);
WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.AttrRemoved, this._attributeChanged, this);
WebInspector.settings.showUserAgentStyles.addChangeListener(this._showUserAgentStylesSettingChanged.bind(this));
}





WebInspector.StylesSidebarPane.PseudoIdNames = [
"", "first-line", "first-letter", "before", "after", "selection", "", "-webkit-scrollbar", "-webkit-file-upload-button",
"-webkit-input-placeholder", "-webkit-slider-thumb", "-webkit-search-cancel-button", "-webkit-search-decoration",
"-webkit-search-results-decoration", "-webkit-search-results-button", "-webkit-media-controls-panel",
"-webkit-media-controls-play-button", "-webkit-media-controls-mute-button", "-webkit-media-controls-timeline",
"-webkit-media-controls-timeline-container", "-webkit-media-controls-volume-slider",
"-webkit-media-controls-volume-slider-container", "-webkit-media-controls-current-time-display",
"-webkit-media-controls-time-remaining-display", "-webkit-media-controls-seek-back-button", "-webkit-media-controls-seek-forward-button",
"-webkit-media-controls-fullscreen-button", "-webkit-media-controls-rewind-button", "-webkit-media-controls-return-to-realtime-button",
"-webkit-media-controls-toggle-closed-captions-button", "-webkit-media-controls-status-display", "-webkit-scrollbar-thumb",
"-webkit-scrollbar-button", "-webkit-scrollbar-track", "-webkit-scrollbar-track-piece", "-webkit-scrollbar-corner",
"-webkit-resizer", "-webkit-inner-spin-button", "-webkit-outer-spin-button"
];

WebInspector.StylesSidebarPane.canonicalPropertyName = function(name)
{
if (!name || name.length < 9 || name.charAt(0) !== "-")
return name;
var match = name.match(/(?:-webkit-|-khtml-|-apple-)(.+)/);
if (!match)
return name;
return match[1];
}

WebInspector.StylesSidebarPane.createExclamationMark = function(propertyName)
{
var exclamationElement = document.createElement("img");
exclamationElement.className = "exclamation-mark";
exclamationElement.title = WebInspector.CSSMetadata.cssPropertiesMetainfo.keySet()[propertyName.toLowerCase()] ? WebInspector.UIString("Invalid property value.") : WebInspector.UIString("Unknown property name.");
return exclamationElement;
}

WebInspector.StylesSidebarPane.prototype = {

_contextMenuEventFired: function(event)
{


var contextMenu = new WebInspector.ContextMenu(event);
contextMenu.appendApplicableItems(event.target);
contextMenu.show();
},

get _forcedPseudoClasses()
{
return this.node ? (this.node.getUserProperty("pseudoState") || undefined) : undefined;
},

_updateForcedPseudoStateInputs: function()
{
if (!this.node)
return;

var nodePseudoState = this._forcedPseudoClasses;
if (!nodePseudoState)
nodePseudoState = [];

var inputs = this._elementStatePane.inputs;
for (var i = 0; i < inputs.length; ++i)
inputs[i].checked = nodePseudoState.indexOf(inputs[i].state) >= 0;
},


update: function(node, forceUpdate)
{
this._spectrumHelper.hide();

var refresh = false;

if (forceUpdate)
delete this.node;

if (!forceUpdate && (node === this.node))
refresh = true;

if (node && node.nodeType() === Node.TEXT_NODE && node.parentNode)
node = node.parentNode;

if (node && node.nodeType() !== Node.ELEMENT_NODE)
node = null;

if (node)
this.node = node;
else
node = this.node;

this._updateForcedPseudoStateInputs();

if (refresh)
this._refreshUpdate();
else
this._rebuildUpdate();
},


_refreshUpdate: function(editedSection, forceFetchComputedStyle, userCallback)
{
if (this._refreshUpdateInProgress) {
this._lastNodeForInnerRefresh = this.node;
return;
}

var node = this._validateNode(userCallback);
if (!node)
return;

function computedStyleCallback(computedStyle)
{
delete this._refreshUpdateInProgress;

if (this._lastNodeForInnerRefresh) {
delete this._lastNodeForInnerRefresh;
this._refreshUpdate(editedSection, forceFetchComputedStyle, userCallback);
return;
}

if (this.node === node && computedStyle)
this._innerRefreshUpdate(node, computedStyle, editedSection);

if (userCallback)
userCallback();
}

if (this._computedStylePane.isShowing() || forceFetchComputedStyle) {
this._refreshUpdateInProgress = true;
WebInspector.cssModel.getComputedStyleAsync(node.id, computedStyleCallback.bind(this));
} else {
this._innerRefreshUpdate(node, null, editedSection);
if (userCallback)
userCallback();
}
},

_rebuildUpdate: function()
{
if (this._rebuildUpdateInProgress) {
this._lastNodeForInnerRebuild = this.node;
return;
}

var node = this._validateNode();
if (!node)
return;

this._rebuildUpdateInProgress = true;

var resultStyles = {};

function stylesCallback(matchedResult)
{
delete this._rebuildUpdateInProgress;

var lastNodeForRebuild = this._lastNodeForInnerRebuild;
if (lastNodeForRebuild) {
delete this._lastNodeForInnerRebuild;
if (lastNodeForRebuild !== this.node) {
this._rebuildUpdate();
return;
}
}

if (matchedResult && this.node === node) {
resultStyles.matchedCSSRules = matchedResult.matchedCSSRules;
resultStyles.pseudoElements = matchedResult.pseudoElements;
resultStyles.inherited = matchedResult.inherited;
this._innerRebuildUpdate(node, resultStyles);
}

if (lastNodeForRebuild) {

this._rebuildUpdate();
return;
}
}

function inlineCallback(inlineStyle, attributesStyle)
{
resultStyles.inlineStyle = inlineStyle;
resultStyles.attributesStyle = attributesStyle;
}

function computedCallback(computedStyle)
{
resultStyles.computedStyle = computedStyle;
}

if (this._computedStylePane.isShowing())
WebInspector.cssModel.getComputedStyleAsync(node.id, computedCallback.bind(this));
WebInspector.cssModel.getInlineStylesAsync(node.id, inlineCallback.bind(this));
WebInspector.cssModel.getMatchedStylesAsync(node.id, true, true, stylesCallback.bind(this));
},


_validateNode: function(userCallback)
{
if (!this.node) {
this._sectionsContainer.removeChildren();
this._computedStylePane.bodyElement.removeChildren();
this.sections = {};
if (userCallback)
userCallback();
return null;
}
return this.node;
},

_styleSheetOrMediaQueryResultChanged: function()
{
if (this._userOperation || this._isEditingStyle)
return;

this._rebuildUpdate();
},

_attributeChanged: function(event)
{


if (this._isEditingStyle || this._userOperation)
return;

if (!this._canAffectCurrentStyles(event.data.node))
return;

this._rebuildUpdate();
},

_canAffectCurrentStyles: function(node)
{
return this.node && (this.node === node || node.parentNode === this.node.parentNode || node.isAncestor(this.node));
},

_innerRefreshUpdate: function(node, computedStyle, editedSection)
{
for (var pseudoId in this.sections) {
var styleRules = this._refreshStyleRules(this.sections[pseudoId], computedStyle);
var usedProperties = {};
this._markUsedProperties(styleRules, usedProperties);
this._refreshSectionsForStyleRules(styleRules, usedProperties, editedSection);
}
if (computedStyle)
this.sections[0][0].rebuildComputedTrace(this.sections[0]);

this._nodeStylesUpdatedForTest(node, false);
},

_innerRebuildUpdate: function(node, styles)
{
this._sectionsContainer.removeChildren();
this._computedStylePane.bodyElement.removeChildren();
this._linkifier.reset();

var styleRules = this._rebuildStyleRules(node, styles);
var usedProperties = {};
this._markUsedProperties(styleRules, usedProperties);
this.sections[0] = this._rebuildSectionsForStyleRules(styleRules, usedProperties, 0, null);
var anchorElement = this.sections[0].inheritedPropertiesSeparatorElement;

if (styles.computedStyle)
this.sections[0][0].rebuildComputedTrace(this.sections[0]);

for (var i = 0; i < styles.pseudoElements.length; ++i) {
var pseudoElementCSSRules = styles.pseudoElements[i];

styleRules = [];
var pseudoId = pseudoElementCSSRules.pseudoId;

var entry = { isStyleSeparator: true, pseudoId: pseudoId };
styleRules.push(entry);


for (var j = pseudoElementCSSRules.rules.length - 1; j >= 0; --j) {
var rule = pseudoElementCSSRules.rules[j];
styleRules.push({ style: rule.style, selectorText: rule.selectorText, media: rule.media, sourceURL: rule.sourceURL, rule: rule, editable: !!(rule.style && rule.style.id) });
}
usedProperties = {};
this._markUsedProperties(styleRules, usedProperties);
this.sections[pseudoId] = this._rebuildSectionsForStyleRules(styleRules, usedProperties, pseudoId, anchorElement);
}

this._nodeStylesUpdatedForTest(node, true);
},

_nodeStylesUpdatedForTest: function(node, rebuild)
{

},

_refreshStyleRules: function(sections, computedStyle)
{
var nodeComputedStyle = computedStyle;
var styleRules = [];
for (var i = 0; sections && i < sections.length; ++i) {
var section = sections[i];
if (section.isBlank)
continue;
if (section.computedStyle)
section.styleRule.style = nodeComputedStyle;
var styleRule = { section: section, style: section.styleRule.style, computedStyle: section.computedStyle, rule: section.rule, editable: !!(section.styleRule.style && section.styleRule.style.id), isAttribute: section.styleRule.isAttribute, isInherited: section.styleRule.isInherited };
styleRules.push(styleRule);
}
return styleRules;
},

_rebuildStyleRules: function(node, styles)
{
var nodeComputedStyle = styles.computedStyle;
this.sections = {};

var styleRules = [];

function addAttributesStyle()
{
if (!styles.attributesStyle)
return;
var attrStyle = { style: styles.attributesStyle, editable: false };
attrStyle.selectorText = node.nodeNameInCorrectCase() + "[" + WebInspector.UIString("Attributes Style") + "]";
styleRules.push(attrStyle);
}

styleRules.push({ computedStyle: true, selectorText: "", style: nodeComputedStyle, editable: false });


if (styles.inlineStyle && node.nodeType() === Node.ELEMENT_NODE) {
var inlineStyle = { selectorText: "element.style", style: styles.inlineStyle, isAttribute: true };
styleRules.push(inlineStyle);
}


if (styles.matchedCSSRules.length)
styleRules.push({ isStyleSeparator: true, text: WebInspector.UIString("Matched CSS Rules") });
var addedAttributesStyle;
for (var i = styles.matchedCSSRules.length - 1; i >= 0; --i) {
var rule = styles.matchedCSSRules[i];
if (!WebInspector.settings.showUserAgentStyles.get() && (rule.isUser || rule.isUserAgent))
continue;
if ((rule.isUser || rule.isUserAgent) && !addedAttributesStyle) {

addedAttributesStyle = true;
addAttributesStyle();
}
styleRules.push({ style: rule.style, selectorText: rule.selectorText, media: rule.media, sourceURL: rule.sourceURL, rule: rule, editable: !!(rule.style && rule.style.id) });
}

if (!addedAttributesStyle)
addAttributesStyle();


var parentNode = node.parentNode;
function insertInheritedNodeSeparator(node)
{
var entry = {};
entry.isStyleSeparator = true;
entry.node = node;
styleRules.push(entry);
}

for (var parentOrdinal = 0; parentOrdinal < styles.inherited.length; ++parentOrdinal) {
var parentStyles = styles.inherited[parentOrdinal];
var separatorInserted = false;
if (parentStyles.inlineStyle) {
if (this._containsInherited(parentStyles.inlineStyle)) {
var inlineStyle = { selectorText: WebInspector.UIString("Style Attribute"), style: parentStyles.inlineStyle, isAttribute: true, isInherited: true, parentNode: parentNode };
if (!separatorInserted) {
insertInheritedNodeSeparator(parentNode);
separatorInserted = true;
}
styleRules.push(inlineStyle);
}
}

for (var i = parentStyles.matchedCSSRules.length - 1; i >= 0; --i) {
var rulePayload = parentStyles.matchedCSSRules[i];
if (!this._containsInherited(rulePayload.style))
continue;
var rule = rulePayload;
if (!WebInspector.settings.showUserAgentStyles.get() && (rule.isUser || rule.isUserAgent))
continue;

if (!separatorInserted) {
insertInheritedNodeSeparator(parentNode);
separatorInserted = true;
}
styleRules.push({ style: rule.style, selectorText: rule.selectorText, media: rule.media, sourceURL: rule.sourceURL, rule: rule, isInherited: true, parentNode: parentNode, editable: !!(rule.style && rule.style.id) });
}
parentNode = parentNode.parentNode;
}
return styleRules;
},

_markUsedProperties: function(styleRules, usedProperties)
{
var foundImportantProperties = {};
var propertyToEffectiveRule = {};
for (var i = 0; i < styleRules.length; ++i) {
var styleRule = styleRules[i];
if (styleRule.computedStyle || styleRule.isStyleSeparator)
continue;
if (styleRule.section && styleRule.section.noAffect)
continue;

styleRule.usedProperties = {};

var style = styleRule.style;
var allProperties = style.allProperties;
for (var j = 0; j < allProperties.length; ++j) {
var property = allProperties[j];
if (!property.isLive || !property.parsedOk)
continue;

var canonicalName = WebInspector.StylesSidebarPane.canonicalPropertyName(property.name);

if (styleRule.isInherited && !WebInspector.CSSMetadata.InheritedProperties[canonicalName])
continue;

if (foundImportantProperties.hasOwnProperty(canonicalName))
continue;

var isImportant = property.priority.length;
if (!isImportant && usedProperties.hasOwnProperty(canonicalName))
continue;

if (isImportant) {
foundImportantProperties[canonicalName] = true;
if (propertyToEffectiveRule.hasOwnProperty(canonicalName))
delete propertyToEffectiveRule[canonicalName].usedProperties[canonicalName];
}

styleRule.usedProperties[canonicalName] = true;
usedProperties[canonicalName] = true;
propertyToEffectiveRule[canonicalName] = styleRule;
}
}
},

_refreshSectionsForStyleRules: function(styleRules, usedProperties, editedSection)
{

for (var i = 0; i < styleRules.length; ++i) {
var styleRule = styleRules[i];
var section = styleRule.section;
if (styleRule.computedStyle) {
section._usedProperties = usedProperties;
section.update();
} else {
section._usedProperties = styleRule.usedProperties;
section.update(section === editedSection);
}
}
},

_rebuildSectionsForStyleRules: function(styleRules, usedProperties, pseudoId, anchorElement)
{

var sections = [];
var lastWasSeparator = true;
for (var i = 0; i < styleRules.length; ++i) {
var styleRule = styleRules[i];
if (styleRule.isStyleSeparator) {
var separatorElement = document.createElement("div");
separatorElement.className = "sidebar-separator";
if (styleRule.node) {
var link = WebInspector.DOMPresentationUtils.linkifyNodeReference(styleRule.node);
separatorElement.appendChild(document.createTextNode(WebInspector.UIString("Inherited from") + " "));
separatorElement.appendChild(link);
if (!sections.inheritedPropertiesSeparatorElement)
sections.inheritedPropertiesSeparatorElement = separatorElement;
} else if ("pseudoId" in styleRule) {
var pseudoName = WebInspector.StylesSidebarPane.PseudoIdNames[styleRule.pseudoId];
if (pseudoName)
separatorElement.textContent = WebInspector.UIString("Pseudo ::%s element", pseudoName);
else
separatorElement.textContent = WebInspector.UIString("Pseudo element");
} else
separatorElement.textContent = styleRule.text;
this._sectionsContainer.insertBefore(separatorElement, anchorElement);
lastWasSeparator = true;
continue;
}
var computedStyle = styleRule.computedStyle;


var editable = styleRule.editable;
if (typeof editable === "undefined")
editable = true;

if (computedStyle)
var section = new WebInspector.ComputedStylePropertiesSection(this, styleRule, usedProperties);
else {
var section = new WebInspector.StylePropertiesSection(this, styleRule, editable, styleRule.isInherited, lastWasSeparator);
section._markSelectorMatches();
}
section.expanded = true;

if (computedStyle) {
this._computedStylePane.bodyElement.appendChild(section.element);
lastWasSeparator = true;
} else {
this._sectionsContainer.insertBefore(section.element, anchorElement);
lastWasSeparator = false;
}
sections.push(section);
}
return sections;
},

_containsInherited: function(style)
{
var properties = style.allProperties;
for (var i = 0; i < properties.length; ++i) {
var property = properties[i];

if (property.isLive && property.name in WebInspector.CSSMetadata.InheritedProperties)
return true;
}
return false;
},

_colorFormatSettingChanged: function(event)
{
this._updateColorFormatFilter();
for (var pseudoId in this.sections) {
var sections = this.sections[pseudoId];
for (var i = 0; i < sections.length; ++i)
sections[i].update(true);
}
},

_updateColorFormatFilter: function()
{

var selectedIndex = 0;
var value = WebInspector.settings.colorFormat.get();
var options = this.settingsSelectElement.options;
for (var i = 0; i < options.length; ++i) {
if (options[i].value === value) {
selectedIndex = i;
break;
}
}
this.settingsSelectElement.selectedIndex = selectedIndex;
},

_changeSetting: function(event)
{
var options = this.settingsSelectElement.options;
var selectedOption = options[this.settingsSelectElement.selectedIndex];
WebInspector.settings.colorFormat.set(selectedOption.value);
},

_createNewRule: function(event)
{
event.consume();
this.expand();
this.addBlankSection().startEditingSelector();
},

addBlankSection: function()
{
var blankSection = new WebInspector.BlankStylePropertiesSection(this, this.node ? this.node.appropriateSelectorFor(true) : "");

var elementStyleSection = this.sections[0][1];
this._sectionsContainer.insertBefore(blankSection.element, elementStyleSection.element.nextSibling);

this.sections[0].splice(2, 0, blankSection);

return blankSection;
},

removeSection: function(section)
{
for (var pseudoId in this.sections) {
var sections = this.sections[pseudoId];
var index = sections.indexOf(section);
if (index === -1)
continue;
sections.splice(index, 1);
if (section.element.parentNode)
section.element.parentNode.removeChild(section.element);
}
},

_toggleElementStatePane: function(event)
{
event.consume();
if (!this._elementStateButton.hasStyleClass("toggled")) {
this.expand();
this._elementStateButton.addStyleClass("toggled");
this._elementStatePane.addStyleClass("expanded");
} else {
this._elementStateButton.removeStyleClass("toggled");
this._elementStatePane.removeStyleClass("expanded");
}
},

_createElementStatePane: function()
{
this._elementStatePane = document.createElement("div");
this._elementStatePane.className = "styles-element-state-pane source-code";
var table = document.createElement("table");

var inputs = [];
this._elementStatePane.inputs = inputs;

function clickListener(event)
{
var node = this._validateNode();
if (!node)
return;
this._setPseudoClassCallback(node.id, event.target.state, event.target.checked);
}

function createCheckbox(state)
{
var td = document.createElement("td");
var label = document.createElement("label");
var input = document.createElement("input");
input.type = "checkbox";
input.state = state;
input.addEventListener("click", clickListener.bind(this), false);
inputs.push(input);
label.appendChild(input);
label.appendChild(document.createTextNode(":" + state));
td.appendChild(label);
return td;
}

var tr = document.createElement("tr");
tr.appendChild(createCheckbox.call(this, "active"));
tr.appendChild(createCheckbox.call(this, "hover"));
table.appendChild(tr);

tr = document.createElement("tr");
tr.appendChild(createCheckbox.call(this, "focus"));
tr.appendChild(createCheckbox.call(this, "visited"));
table.appendChild(tr);

this._elementStatePane.appendChild(table);
},

_showUserAgentStylesSettingChanged: function()
{
this._rebuildUpdate();
},

willHide: function()
{
this._spectrumHelper.hide();
},

__proto__: WebInspector.SidebarPane.prototype
}


WebInspector.ComputedStyleSidebarPane = function()
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Computed Style"));
var showInheritedCheckbox = new WebInspector.Checkbox(WebInspector.UIString("Show inherited"), "sidebar-pane-subtitle");
this.titleElement.appendChild(showInheritedCheckbox.element);

if (WebInspector.settings.showInheritedComputedStyleProperties.get()) {
this.bodyElement.addStyleClass("show-inherited");
showInheritedCheckbox.checked = true;
}

function showInheritedToggleFunction(event)
{
WebInspector.settings.showInheritedComputedStyleProperties.set(showInheritedCheckbox.checked);
if (WebInspector.settings.showInheritedComputedStyleProperties.get())
this.bodyElement.addStyleClass("show-inherited");
else
this.bodyElement.removeStyleClass("show-inherited");
}

showInheritedCheckbox.addEventListener(showInheritedToggleFunction.bind(this));
}

WebInspector.ComputedStyleSidebarPane.prototype = {
wasShown: function()
{
WebInspector.SidebarPane.prototype.wasShown.call(this);
if (!this._hasFreshContent)
this.prepareContent();
},


prepareContent: function(callback)
{
function wrappedCallback() {
this._hasFreshContent = true;
if (callback)
callback();
delete this._hasFreshContent;
}
this._stylesSidebarPane._refreshUpdate(null, true, wrappedCallback.bind(this));
},

__proto__: WebInspector.SidebarPane.prototype
}


WebInspector.StylePropertiesSection = function(parentPane, styleRule, editable, isInherited, isFirstSection)
{
WebInspector.PropertiesSection.call(this, "");
this.element.className = "styles-section matched-styles monospace" + (isFirstSection ? " first-styles-section" : "");

this.propertiesElement.removeStyleClass("properties-tree");

if (styleRule.media) {
for (var i = styleRule.media.length - 1; i >= 0; --i) {
var media = styleRule.media[i];
var mediaDataElement = this.titleElement.createChild("div", "media");
var mediaText;
switch (media.source) {
case WebInspector.CSSMedia.Source.LINKED_SHEET:
case WebInspector.CSSMedia.Source.INLINE_SHEET:
mediaText = "media=\"" + media.text + "\"";
break;
case WebInspector.CSSMedia.Source.MEDIA_RULE:
mediaText = "@media " + media.text;
break;
case WebInspector.CSSMedia.Source.IMPORT_RULE:
mediaText = "@import " + media.text;
break;
}

if (media.sourceURL) {
var refElement = mediaDataElement.createChild("div", "subtitle");
var lineNumber = media.sourceLine < 0 ? undefined : media.sourceLine;
var anchor = WebInspector.linkifyResourceAsNode(media.sourceURL, lineNumber, "subtitle", media.sourceURL + (isNaN(lineNumber) ? "" : (":" + (lineNumber + 1))));
anchor.preferredPanel = "scripts";
anchor.style.float = "right";
refElement.appendChild(anchor);
}

var mediaTextElement = mediaDataElement.createChild("span");
mediaTextElement.textContent = mediaText;
mediaTextElement.title = media.text;
}
}

var selectorContainer = document.createElement("div");
this._selectorElement = document.createElement("span");
this._selectorElement.textContent = styleRule.selectorText;
selectorContainer.appendChild(this._selectorElement);

var openBrace = document.createElement("span");
openBrace.textContent = " {";
selectorContainer.appendChild(openBrace);
selectorContainer.addEventListener("mousedown", this._handleEmptySpaceMouseDown.bind(this), false);
selectorContainer.addEventListener("click", this._handleSelectorContainerClick.bind(this), false);

var closeBrace = document.createElement("div");
closeBrace.textContent = "}";
this.element.appendChild(closeBrace);

this._selectorElement.addEventListener("click", this._handleSelectorClick.bind(this), false);
this.element.addEventListener("mousedown", this._handleEmptySpaceMouseDown.bind(this), false);
this.element.addEventListener("click", this._handleEmptySpaceClick.bind(this), false);

this._parentPane = parentPane;
this.styleRule = styleRule;
this.rule = this.styleRule.rule;
this.editable = editable;
this.isInherited = isInherited;

if (this.rule) {

if (this.rule.isUserAgent || this.rule.isUser)
this.editable = false;
else {

if (this.rule.id)
this.navigable = this.rule.isSourceNavigable();
}
this.titleElement.addStyleClass("styles-selector");
}

this._usedProperties = styleRule.usedProperties;

this._selectorRefElement = document.createElement("div");
this._selectorRefElement.className = "subtitle";
this._selectorRefElement.appendChild(this._createRuleOriginNode());
selectorContainer.insertBefore(this._selectorRefElement, selectorContainer.firstChild);
this.titleElement.appendChild(selectorContainer);
this._selectorContainer = selectorContainer;

if (isInherited)
this.element.addStyleClass("show-inherited"); 

if (this.navigable)
this.element.addStyleClass("navigable");

if (!this.editable)
this.element.addStyleClass("read-only");
}

WebInspector.StylePropertiesSection.prototype = {
get pane()
{
return this._parentPane;
},

collapse: function(dontRememberState)
{

},

isPropertyInherited: function(propertyName)
{
if (this.isInherited) {


return !(propertyName in WebInspector.CSSMetadata.InheritedProperties);
}
return false;
},


isPropertyOverloaded: function(propertyName, isShorthand)
{
if (!this._usedProperties || this.noAffect)
return false;

if (this.isInherited && !(propertyName in WebInspector.CSSMetadata.InheritedProperties)) {

return false;
}

var canonicalName = WebInspector.StylesSidebarPane.canonicalPropertyName(propertyName);
var used = (canonicalName in this._usedProperties);
if (used || !isShorthand)
return !used;



var longhandProperties = this.styleRule.style.longhandProperties(propertyName);
for (var j = 0; j < longhandProperties.length; ++j) {
var individualProperty = longhandProperties[j];
if (WebInspector.StylesSidebarPane.canonicalPropertyName(individualProperty.name) in this._usedProperties)
return false;
}

return true;
},

nextEditableSibling: function()
{
var curSection = this;
do {
curSection = curSection.nextSibling;
} while (curSection && !curSection.editable);

if (!curSection) {
curSection = this.firstSibling;
while (curSection && !curSection.editable)
curSection = curSection.nextSibling;
}

return (curSection && curSection.editable) ? curSection : null;
},

previousEditableSibling: function()
{
var curSection = this;
do {
curSection = curSection.previousSibling;
} while (curSection && !curSection.editable);

if (!curSection) {
curSection = this.lastSibling;
while (curSection && !curSection.editable)
curSection = curSection.previousSibling;
}

return (curSection && curSection.editable) ? curSection : null;
},

update: function(full)
{
if (this.styleRule.selectorText)
this._selectorElement.textContent = this.styleRule.selectorText;
this._markSelectorMatches();
if (full) {
this.propertiesTreeOutline.removeChildren();
this.populated = false;
} else {
var child = this.propertiesTreeOutline.children[0];
while (child) {
child.overloaded = this.isPropertyOverloaded(child.name, child.isShorthand);
child = child.traverseNextTreeElement(false, null, true);
}
}
this.afterUpdate();
},

afterUpdate: function()
{
if (this._afterUpdate) {
this._afterUpdate(this);
delete this._afterUpdate;
}
},

onpopulate: function()
{
var style = this.styleRule.style;
var allProperties = style.allProperties;
this.uniqueProperties = [];

var styleHasEditableSource = this.editable && !!style.range;
if (styleHasEditableSource) {
for (var i = 0; i < allProperties.length; ++i) {
var property = allProperties[i];
this.uniqueProperties.push(property);
if (property.styleBased)
continue;

var isShorthand = !!WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(property.name);
var inherited = this.isPropertyInherited(property.name);
var overloaded = property.inactive || this.isPropertyOverloaded(property.name);
var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this.styleRule, style, property, isShorthand, inherited, overloaded);
this.propertiesTreeOutline.appendChild(item);
}
return;
}

var generatedShorthands = {};

for (var i = 0; i < allProperties.length; ++i) {
var property = allProperties[i];
this.uniqueProperties.push(property);
var isShorthand = !!WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(property.name);


var shorthands = isShorthand ? null : WebInspector.CSSMetadata.cssPropertiesMetainfo.shorthands(property.name);
var shorthandPropertyAvailable = false;
for (var j = 0; shorthands && !shorthandPropertyAvailable && j < shorthands.length; ++j) {
var shorthand = shorthands[j];
if (shorthand in generatedShorthands) {
shorthandPropertyAvailable = true;
continue;  
}
if (style.getLiveProperty(shorthand)) {
shorthandPropertyAvailable = true;
continue;  
}
if (!style.shorthandValue(shorthand)) {
shorthandPropertyAvailable = false;
continue;  
}


var shorthandProperty = new WebInspector.CSSProperty(style, style.allProperties.length, shorthand, style.shorthandValue(shorthand), "", "style", true, true, undefined);
var overloaded = property.inactive || this.isPropertyOverloaded(property.name, true);
var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this.styleRule, style, shorthandProperty,    true,   false, overloaded);
this.propertiesTreeOutline.appendChild(item);
generatedShorthands[shorthand] = shorthandProperty;
shorthandPropertyAvailable = true;
}
if (shorthandPropertyAvailable)
continue;  

var inherited = this.isPropertyInherited(property.name);
var overloaded = property.inactive || this.isPropertyOverloaded(property.name, isShorthand);
var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this.styleRule, style, property, isShorthand, inherited, overloaded);
this.propertiesTreeOutline.appendChild(item);
}
},

findTreeElementWithName: function(name)
{
var treeElement = this.propertiesTreeOutline.children[0];
while (treeElement) {
if (treeElement.name === name)
return treeElement;
treeElement = treeElement.traverseNextTreeElement(true, null, true);
}
return null;
},

_markSelectorMatches: function()
{
var rule = this.styleRule.rule;
if (!rule)
return;

var matchingSelectors = rule.matchingSelectors;

if (this.noAffect || matchingSelectors)
this._selectorElement.className = "selector";
if (!matchingSelectors)
return;

var selectors = rule.selectors;
var fragment = document.createDocumentFragment();
var currentMatch = 0;
for (var i = 0, lastSelectorIndex = selectors.length - 1; i <= lastSelectorIndex ; ++i) {
var selectorNode;
var textNode = document.createTextNode(selectors[i]);
if (matchingSelectors[currentMatch] === i) {
++currentMatch;
selectorNode = document.createElement("span");
selectorNode.className = "selector-matches";
selectorNode.appendChild(textNode);
} else
selectorNode = textNode;

fragment.appendChild(selectorNode);
if (i !== lastSelectorIndex)
fragment.appendChild(document.createTextNode(", "));
}

this._selectorElement.removeChildren();
this._selectorElement.appendChild(fragment);
},

_checkWillCancelEditing: function()
{
var willCauseCancelEditing = this._willCauseCancelEditing;
delete this._willCauseCancelEditing;
return willCauseCancelEditing;
},

_handleSelectorContainerClick: function(event)
{
if (this._checkWillCancelEditing() || !this.editable)
return;
if (event.target === this._selectorContainer)
this.addNewBlankProperty(0).startEditing();
},


addNewBlankProperty: function(index)
{
var style = this.styleRule.style;
var property = style.newBlankProperty(index);
var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this.styleRule, style, property, false, false, false);
index = property.index;
this.propertiesTreeOutline.insertChild(item, index);
item.listItemElement.textContent = "";
item._newProperty = true;
item.updateTitle();
return item;
},

_createRuleOriginNode: function()
{

function linkifyUncopyable(url, line)
{
var link = WebInspector.linkifyResourceAsNode(url, line, "", url + ":" + (line + 1));
link.preferredPanel = "scripts";
link.classList.add("webkit-html-resource-link");
link.setAttribute("data-uncopyable", link.textContent);
link.textContent = "";
return link;
}

if (this.styleRule.sourceURL)
return this._parentPane._linkifier.linkifyCSSRuleLocation(this.rule) || linkifyUncopyable(this.styleRule.sourceURL, this.rule.sourceLine);

if (!this.rule)
return document.createTextNode("");

var origin = "";
if (this.rule.isUserAgent)
return document.createTextNode(WebInspector.UIString("user agent stylesheet"));
if (this.rule.isUser)
return document.createTextNode(WebInspector.UIString("user stylesheet"));
if (this.rule.isViaInspector) {
var element = document.createElement("span");

function callback(resource)
{
if (resource)
element.appendChild(linkifyUncopyable(resource.url, this.rule.sourceLine));
else
element.textContent = WebInspector.UIString("via inspector");
}
WebInspector.cssModel.getViaInspectorResourceForRule(this.rule, callback.bind(this));
return element;
}
},

_handleEmptySpaceMouseDown: function(event)
{
this._willCauseCancelEditing = this._parentPane._isEditingStyle;
},

_handleEmptySpaceClick: function(event)
{
if (!this.editable)
return;

if (!window.getSelection().isCollapsed)
return;

if (this._checkWillCancelEditing())
return;

if (event.target.hasStyleClass("header") || this.element.hasStyleClass("read-only") || event.target.enclosingNodeOrSelfWithClass("media")) {
event.consume();
return;
}
this.expand();
this.addNewBlankProperty().startEditing();
},

_handleSelectorClick: function(event)
{
this._startEditingOnMouseEvent();
event.consume(true);
},

_startEditingOnMouseEvent: function()
{
if (!this.editable)
return;

if (!this.rule && this.propertiesTreeOutline.children.length === 0) {
this.expand();
this.addNewBlankProperty().startEditing();
return;
}

if (!this.rule)
return;

this.startEditingSelector();
},

startEditingSelector: function()
{
var element = this._selectorElement;
if (WebInspector.isBeingEdited(element))
return;

element.scrollIntoViewIfNeeded(false);
element.textContent = element.textContent; 

var config = new WebInspector.EditingConfig(this.editingSelectorCommitted.bind(this), this.editingSelectorCancelled.bind(this));
WebInspector.startEditing(this._selectorElement, config);

window.getSelection().setBaseAndExtent(element, 0, element, 1);
},

_moveEditorFromSelector: function(moveDirection)
{
this._markSelectorMatches();

if (!moveDirection)
return;

if (moveDirection === "forward") {
this.expand();
var firstChild = this.propertiesTreeOutline.children[0];
while (firstChild && firstChild.inherited)
firstChild = firstChild.nextSibling;
if (!firstChild)
this.addNewBlankProperty().startEditing();
else
firstChild.startEditing(firstChild.nameElement);
} else {
var previousSection = this.previousEditableSibling();
if (!previousSection)
return;

previousSection.expand();
previousSection.addNewBlankProperty().startEditing();
}
},

editingSelectorCommitted: function(element, newContent, oldContent, context, moveDirection)
{
if (newContent)
newContent = newContent.trim();
if (newContent === oldContent) {

this._selectorElement.textContent = newContent;
return this._moveEditorFromSelector(moveDirection);
}

var selectedNode = this._parentPane.node;

function successCallback(newRule, doesAffectSelectedNode)
{
if (!doesAffectSelectedNode) {
this.noAffect = true;
this.element.addStyleClass("no-affect");
} else {
delete this.noAffect;
this.element.removeStyleClass("no-affect");
}

this.rule = newRule;
this.styleRule = { section: this, style: newRule.style, selectorText: newRule.selectorText, media: newRule.media, sourceURL: newRule.sourceURL, rule: newRule };

this._parentPane.update(selectedNode);

finishOperationAndMoveEditor.call(this, moveDirection);
}

function finishOperationAndMoveEditor(direction)
{
delete this._parentPane._userOperation;
this._moveEditorFromSelector(direction);
}


this._parentPane._userOperation = true;
WebInspector.cssModel.setRuleSelector(this.rule.id, selectedNode ? selectedNode.id : 0, newContent, successCallback.bind(this), finishOperationAndMoveEditor.bind(this, moveDirection));
},

editingSelectorCancelled: function()
{


this._markSelectorMatches();
},

__proto__: WebInspector.PropertiesSection.prototype
}


WebInspector.ComputedStylePropertiesSection = function(stylesPane, styleRule, usedProperties)
{
WebInspector.PropertiesSection.call(this, "");
this.headerElement.addStyleClass("hidden");
this.element.className = "styles-section monospace first-styles-section read-only computed-style";
this._stylesPane = stylesPane;
this.styleRule = styleRule;
this._usedProperties = usedProperties;
this._alwaysShowComputedProperties = { "display": true, "height": true, "width": true };
this.computedStyle = true;
this._propertyTreeElements = {};
this._expandedPropertyNames = {};
}

WebInspector.ComputedStylePropertiesSection.prototype = {
collapse: function(dontRememberState)
{

},

_isPropertyInherited: function(propertyName)
{
var canonicalName = WebInspector.StylesSidebarPane.canonicalPropertyName(propertyName);
return !(canonicalName in this._usedProperties) && !(canonicalName in this._alwaysShowComputedProperties);
},

update: function()
{
this._expandedPropertyNames = {};
for (var name in this._propertyTreeElements) {
if (this._propertyTreeElements[name].expanded)
this._expandedPropertyNames[name] = true;
}
this._propertyTreeElements = {};
this.propertiesTreeOutline.removeChildren();
this.populated = false;
},

onpopulate: function()
{
function sorter(a, b)
{
return a.name.compareTo(b.name);
}

var style = this.styleRule.style;
if (!style)
return;

var uniqueProperties = [];
var allProperties = style.allProperties;
for (var i = 0; i < allProperties.length; ++i)
uniqueProperties.push(allProperties[i]);
uniqueProperties.sort(sorter);

this._propertyTreeElements = {};
for (var i = 0; i < uniqueProperties.length; ++i) {
var property = uniqueProperties[i];
var inherited = this._isPropertyInherited(property.name);
var item = new WebInspector.ComputedStylePropertyTreeElement(this._stylesPane, this.styleRule, style, property, inherited);
this.propertiesTreeOutline.appendChild(item);
this._propertyTreeElements[property.name] = item;
}
},

rebuildComputedTrace: function(sections)
{
for (var i = 0; i < sections.length; ++i) {
var section = sections[i];
if (section.computedStyle || section.isBlank)
continue;

for (var j = 0; j < section.uniqueProperties.length; ++j) {
var property = section.uniqueProperties[j];
if (property.disabled)
continue;
if (section.isInherited && !(property.name in WebInspector.CSSMetadata.InheritedProperties))
continue;

var treeElement = this._propertyTreeElements[property.name];
if (treeElement) {
var fragment = document.createDocumentFragment();
var selector = fragment.createChild("span");
selector.style.color = "gray";
selector.textContent = section.styleRule.selectorText;
fragment.appendChild(document.createTextNode(" - " + property.value + " "));
var subtitle = fragment.createChild("span");
subtitle.style.float = "right";
subtitle.appendChild(section._createRuleOriginNode());
var childElement = new TreeElement(fragment, null, false);
treeElement.appendChild(childElement);
if (property.inactive || section.isPropertyOverloaded(property.name))
childElement.listItemElement.addStyleClass("overloaded");
if (!property.parsedOk) {
childElement.listItemElement.addStyleClass("not-parsed-ok");
childElement.listItemElement.insertBefore(WebInspector.StylesSidebarPane.createExclamationMark(property.name), childElement.listItemElement.firstChild);
}
}
}
}


for (var name in this._expandedPropertyNames) {
if (name in this._propertyTreeElements)
this._propertyTreeElements[name].expand();
}
},

__proto__: WebInspector.PropertiesSection.prototype
}


WebInspector.BlankStylePropertiesSection = function(stylesPane, defaultSelectorText)
{
WebInspector.StylePropertiesSection.call(this, stylesPane, {selectorText: defaultSelectorText, rule: {isViaInspector: true}}, true, false, false);
this.element.addStyleClass("blank-section");
}

WebInspector.BlankStylePropertiesSection.prototype = {
get isBlank()
{
return !this._normal;
},

expand: function()
{
if (!this.isBlank)
WebInspector.StylePropertiesSection.prototype.expand.call(this);
},

editingSelectorCommitted: function(element, newContent, oldContent, context, moveDirection)
{
if (!this.isBlank) {
WebInspector.StylePropertiesSection.prototype.editingSelectorCommitted.call(this, element, newContent, oldContent, context, moveDirection);
return;
}

function successCallback(newRule, doesSelectorAffectSelectedNode)
{
var styleRule = { section: this, style: newRule.style, selectorText: newRule.selectorText, sourceURL: newRule.sourceURL, rule: newRule };
this.makeNormal(styleRule);

if (!doesSelectorAffectSelectedNode) {
this.noAffect = true;
this.element.addStyleClass("no-affect");
}

this._selectorRefElement.removeChildren();
this._selectorRefElement.appendChild(this._createRuleOriginNode());
this.expand();
if (this.element.parentElement) 
this._moveEditorFromSelector(moveDirection);

this._markSelectorMatches();
delete this._parentPane._userOperation;
}

if (newContent)
newContent = newContent.trim();
this._parentPane._userOperation = true;
WebInspector.cssModel.addRule(this.pane.node.id, newContent, successCallback.bind(this), this.editingSelectorCancelled.bind(this));
},

editingSelectorCancelled: function()
{
delete this._parentPane._userOperation;
if (!this.isBlank) {
WebInspector.StylePropertiesSection.prototype.editingSelectorCancelled.call(this);
return;
}

this.pane.removeSection(this);
},

makeNormal: function(styleRule)
{
this.element.removeStyleClass("blank-section");
this.styleRule = styleRule;
this.rule = styleRule.rule;


this._normal = true;
},

__proto__: WebInspector.StylePropertiesSection.prototype
}


WebInspector.StylePropertyTreeElementBase = function(styleRule, style, property, inherited, overloaded, hasChildren)
{
this._styleRule = styleRule;
this.style = style;
this.property = property;
this._inherited = inherited;
this._overloaded = overloaded;


TreeElement.call(this, "", null, hasChildren);

this.selectable = false;
}

WebInspector.StylePropertyTreeElementBase.prototype = {

node: function()
{
return null;  
},


editablePane: function()
{
return null;  
},

get inherited()
{
return this._inherited;
},

set inherited(x)
{
if (x === this._inherited)
return;
this._inherited = x;
this.updateState();
},

get overloaded()
{
return this._overloaded;
},

set overloaded(x)
{
if (x === this._overloaded)
return;
this._overloaded = x;
this.updateState();
},

get disabled()
{
return this.property.disabled;
},

get name()
{
if (!this.disabled || !this.property.text)
return this.property.name;

var text = this.property.text;
var index = text.indexOf(":");
if (index < 1)
return this.property.name;

return text.substring(0, index).trim();
},

get priority()
{
if (this.disabled)
return ""; 
return this.property.priority;
},

get value()
{
if (!this.disabled || !this.property.text)
return this.property.value;

var match = this.property.text.match(/(.*);\s*/);
if (!match || !match[1])
return this.property.value;

var text = match[1];
var index = text.indexOf(":");
if (index < 1)
return this.property.value;

return text.substring(index + 1).trim();
},

get parsedOk()
{
return this.property.parsedOk;
},

onattach: function()
{
this.updateTitle();
},

updateTitle: function()
{
var value = this.value;

this.updateState();

var nameElement = document.createElement("span");
nameElement.className = "webkit-css-property";
nameElement.textContent = this.name;
nameElement.title = this.property.propertyText;
this.nameElement = nameElement;

this._expandElement = document.createElement("span");
this._expandElement.className = "expand-element";

var valueElement = document.createElement("span");
valueElement.className = "value";
this.valueElement = valueElement;

var cf = WebInspector.Color.Format;

if (value) {
var self = this;

function processValue(regex, processor, nextProcessor, valueText)
{
var container = document.createDocumentFragment();

var items = valueText.replace(regex, "\0$1\0").split("\0");
for (var i = 0; i < items.length; ++i) {
if ((i % 2) === 0) {
if (nextProcessor)
container.appendChild(nextProcessor(items[i]));
else
container.appendChild(document.createTextNode(items[i]));
} else {
var processedNode = processor(items[i]);
if (processedNode)
container.appendChild(processedNode);
}
}

return container;
}

function linkifyURL(url)
{
var hrefUrl = url;
var match = hrefUrl.match(/['"]?([^'"]+)/);
if (match)
hrefUrl = match[1];
var container = document.createDocumentFragment();
container.appendChild(document.createTextNode("url("));
if (self._styleRule.sourceURL)
hrefUrl = WebInspector.ParsedURL.completeURL(self._styleRule.sourceURL, hrefUrl);
else if (self.node())
hrefUrl = self.node().resolveURL(hrefUrl);
var hasResource = !!WebInspector.resourceForURL(hrefUrl);

container.appendChild(WebInspector.linkifyURLAsNode(hrefUrl, url, undefined, !hasResource));
container.appendChild(document.createTextNode(")"));
return container;
}

function processColor(text)
{
var color = WebInspector.Color.parse(text);


if (!color)
return document.createTextNode(text);

var format = getFormat();
var spectrumHelper = self.editablePane() && self.editablePane()._spectrumHelper;
var spectrum = spectrumHelper ? spectrumHelper.spectrum() : null;

var colorSwatch = new WebInspector.ColorSwatch();
colorSwatch.setColorString(text);
colorSwatch.element.addEventListener("click", swatchClick, false);

var scrollerElement;

function spectrumChanged(e)
{
color = e.data;
var colorString = color.toString();
spectrum.displayText = colorString;
colorValueElement.textContent = colorString;
colorSwatch.setColorString(colorString);
self.applyStyleText(nameElement.textContent + ": " + valueElement.textContent, false, false, false);
}

function spectrumHidden(event)
{
if (scrollerElement)
scrollerElement.removeEventListener("scroll", repositionSpectrum, false);
var commitEdit = event.data;
var propertyText = !commitEdit && self.originalPropertyText ? self.originalPropertyText : (nameElement.textContent + ": " + valueElement.textContent);
self.applyStyleText(propertyText, true, true, false);
spectrum.removeEventListener(WebInspector.Spectrum.Events.ColorChanged, spectrumChanged);
spectrumHelper.removeEventListener(WebInspector.SpectrumPopupHelper.Events.Hidden, spectrumHidden);

delete self.editablePane()._isEditingStyle;
delete self.originalPropertyText;
}

function repositionSpectrum()
{
spectrumHelper.reposition(colorSwatch.element);
}

function swatchClick(e)
{


if (!spectrumHelper || e.shiftKey)
changeColorDisplay(e);
else {
var visible = spectrumHelper.toggle(colorSwatch.element, color, format);

if (visible) {
spectrum.displayText = color.toString(format);
self.originalPropertyText = self.property.propertyText;
self.editablePane()._isEditingStyle = true;
spectrum.addEventListener(WebInspector.Spectrum.Events.ColorChanged, spectrumChanged);
spectrumHelper.addEventListener(WebInspector.SpectrumPopupHelper.Events.Hidden, spectrumHidden);

scrollerElement = colorSwatch.element.enclosingNodeOrSelfWithClass("scroll-target");
if (scrollerElement)
scrollerElement.addEventListener("scroll", repositionSpectrum, false);
else
console.error("Unable to handle color picker scrolling");
}
}
e.consume(true);
}

function getFormat()
{
var format;
var formatSetting = WebInspector.settings.colorFormat.get();
if (formatSetting === cf.Original)
format = cf.Original;
else if (formatSetting === cf.RGB)
format = (color.hasAlpha() ? cf.RGBA : cf.RGB);
else if (formatSetting === cf.HSL)
format = (color.hasAlpha() ? cf.HSLA : cf.HSL);
else if (!color.hasAlpha())
format = (color.canBeShortHex() ? cf.ShortHEX : cf.HEX);
else
format = cf.RGBA;

return format;
}

var colorValueElement = document.createElement("span");
colorValueElement.textContent = color.toString(format);

function nextFormat(curFormat)
{








switch (curFormat) {
case cf.Original:
return !color.hasAlpha() ? cf.RGB : cf.RGBA;

case cf.RGB:
case cf.RGBA:
return !color.hasAlpha() ? cf.HSL : cf.HSLA;

case cf.HSL:
case cf.HSLA:
if (color.nickname())
return cf.Nickname;
if (!color.hasAlpha())
return color.canBeShortHex() ? cf.ShortHEX : cf.HEX;
else
return cf.Original;

case cf.ShortHEX:
return cf.HEX;

case cf.HEX:
return cf.Original;

case cf.Nickname:
if (!color.hasAlpha())
return color.canBeShortHex() ? cf.ShortHEX : cf.HEX;
else
return cf.Original;

default:
return cf.RGBA;
}
}

function changeColorDisplay(event)
{
do {
format = nextFormat(format);
var currentValue = color.toString(format);
} while (currentValue === colorValueElement.textContent);
colorValueElement.textContent = currentValue;
}

var container = document.createElement("nobr");
container.appendChild(colorSwatch.element);
container.appendChild(colorValueElement);
return container;
}

var colorRegex = /((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b\w+\b(?!-))/g;
var colorProcessor = processValue.bind(window, colorRegex, processColor, null);

valueElement.appendChild(processValue(/url\(\s*([^)]+)\s*\)/g, linkifyURL.bind(this), WebInspector.CSSMetadata.isColorAwareProperty(self.name) ? colorProcessor : null, value));
}

this.listItemElement.removeChildren();
nameElement.normalize();
valueElement.normalize();

if (!this.treeOutline)
return;

this.listItemElement.appendChild(nameElement);
this.listItemElement.appendChild(document.createTextNode(": "));
this.listItemElement.appendChild(this._expandElement);
this.listItemElement.appendChild(valueElement);
this.listItemElement.appendChild(document.createTextNode(";"));

if (!this.parsedOk) {

this.hasChildren = false;
this.listItemElement.addStyleClass("not-parsed-ok");


this.listItemElement.insertBefore(WebInspector.StylesSidebarPane.createExclamationMark(this.property.name), this.listItemElement.firstChild);
}
if (this.property.inactive)
this.listItemElement.addStyleClass("inactive");
},

updateState: function()
{
if (!this.listItemElement)
return;

if (this.style.isPropertyImplicit(this.name) || this.value === "initial")
this.listItemElement.addStyleClass("implicit");
else
this.listItemElement.removeStyleClass("implicit");

if (this.inherited)
this.listItemElement.addStyleClass("inherited");
else
this.listItemElement.removeStyleClass("inherited");

if (this.overloaded)
this.listItemElement.addStyleClass("overloaded");
else
this.listItemElement.removeStyleClass("overloaded");

if (this.disabled)
this.listItemElement.addStyleClass("disabled");
else
this.listItemElement.removeStyleClass("disabled");
},

__proto__: TreeElement.prototype
}


WebInspector.ComputedStylePropertyTreeElement = function(stylesPane, styleRule, style, property, inherited)
{
WebInspector.StylePropertyTreeElementBase.call(this, styleRule, style, property, inherited, false, false);
this._stylesPane = stylesPane;
}

WebInspector.ComputedStylePropertyTreeElement.prototype = {

node: function()
{
return this._stylesPane.node;
},


editablePane: function()
{
return null;
},

__proto__: WebInspector.StylePropertyTreeElementBase.prototype
}


WebInspector.StylePropertyTreeElement = function(stylesPane, styleRule, style, property, isShorthand, inherited, overloaded)
{
WebInspector.StylePropertyTreeElementBase.call(this, styleRule, style, property, inherited, overloaded, isShorthand);
this._parentPane = stylesPane;
this.isShorthand = isShorthand;
}

WebInspector.StylePropertyTreeElement.prototype = {

node: function()
{
return this._parentPane.node;
},


editablePane: function()
{
return this._parentPane;
},


section: function()
{
return this.treeOutline && this.treeOutline.section;
},

_updatePane: function(userCallback)
{
var section = this.section();
if (section && section.pane)
section.pane._refreshUpdate(section, false, userCallback);
else  {
if (userCallback)
userCallback();
}
},

toggleEnabled: function(event)
{
var disabled = !event.target.checked;

function callback(newStyle)
{
if (!newStyle)
return;

newStyle.parentRule = this.style.parentRule;
this.style = newStyle;
this._styleRule.style = newStyle;

var section = this.section();
if (section && section.pane)
section.pane.dispatchEventToListeners("style property toggled");

this._updatePane();

delete this._parentPane._userOperation;
}

this._parentPane._userOperation = true;
this.property.setDisabled(disabled, callback.bind(this));
event.consume();
},

onpopulate: function()
{

if (this.children.length || !this.isShorthand)
return;

var longhandProperties = this.style.longhandProperties(this.name);
for (var i = 0; i < longhandProperties.length; ++i) {
var name = longhandProperties[i].name;

var section = this.section();
if (section) {
var inherited = section.isPropertyInherited(name);
var overloaded = section.isPropertyOverloaded(name);
}

var liveProperty = this.style.getLiveProperty(name);
if (!liveProperty)
continue;

var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this._styleRule, this.style, liveProperty, false, inherited, overloaded);
this.appendChild(item);
}
},

restoreNameElement: function()
{

if (this.nameElement === this.listItemElement.querySelector(".webkit-css-property"))
return;

this.nameElement = document.createElement("span");
this.nameElement.className = "webkit-css-property";
this.nameElement.textContent = "";
this.listItemElement.insertBefore(this.nameElement, this.listItemElement.firstChild);
},

onattach: function()
{
WebInspector.StylePropertyTreeElementBase.prototype.onattach.call(this);

this.listItemElement.addEventListener("mousedown", this._mouseDown.bind(this));
this.listItemElement.addEventListener("mouseup", this._resetMouseDownElement.bind(this));
this.listItemElement.addEventListener("click", this._mouseClick.bind(this));
},

_mouseDown: function(event)
{
if (this._parentPane) {
this._parentPane._mouseDownTreeElement = this;
this._parentPane._mouseDownTreeElementIsName = this._isNameElement(event.target);
this._parentPane._mouseDownTreeElementIsValue = this._isValueElement(event.target);
}
},

_resetMouseDownElement: function()
{
if (this._parentPane) {
delete this._parentPane._mouseDownTreeElement;
delete this._parentPane._mouseDownTreeElementIsName;
delete this._parentPane._mouseDownTreeElementIsValue;
}
},

updateTitle: function()
{
WebInspector.StylePropertyTreeElementBase.prototype.updateTitle.call(this);

if (this.parsedOk && this.section() && this.parent.root) {
var enabledCheckboxElement = document.createElement("input");
enabledCheckboxElement.className = "enabled-button";
enabledCheckboxElement.type = "checkbox";
enabledCheckboxElement.checked = !this.disabled;
enabledCheckboxElement.addEventListener("click", this.toggleEnabled.bind(this), false);
this.listItemElement.insertBefore(enabledCheckboxElement, this.listItemElement.firstChild);
}
},

_mouseClick: function(event)
{
if (!window.getSelection().isCollapsed)
return;

event.consume(true);

if (event.target === this.listItemElement) {
var section = this.section();
if (!section || !section.editable)
return;

if (section._checkWillCancelEditing())
return;
section.addNewBlankProperty(this.property.index + 1).startEditing();
return;
}

if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && this.section().navigable) {
this._navigateToSource(event.target);
return;
}

this.startEditing(event.target);
},


_navigateToSource: function(element)
{
console.assert(this.section().navigable);
var propertyNameClicked = element === this.nameElement;
var uiLocation = this.property.uiLocation(propertyNameClicked);
if (!uiLocation)
return;
WebInspector.showPanel("scripts").showUISourceCode(uiLocation.uiSourceCode, uiLocation.lineNumber);
},

_isNameElement: function(element)
{
return element.enclosingNodeOrSelfWithClass("webkit-css-property") === this.nameElement;
},

_isValueElement: function(element)
{
return !!element.enclosingNodeOrSelfWithClass("value");
},

startEditing: function(selectElement)
{

if (this.parent.isShorthand)
return;

if (selectElement === this._expandElement)
return;

var section = this.section();
if (section && !section.editable)
return;

if (!selectElement)
selectElement = this.nameElement; 
else
selectElement = selectElement.enclosingNodeOrSelfWithClass("webkit-css-property") || selectElement.enclosingNodeOrSelfWithClass("value");

var isEditingName = selectElement === this.nameElement;
if (!isEditingName) {
if (selectElement !== this.valueElement) {

selectElement = this.valueElement;
}

this.valueElement.textContent = this.value;
}

if (WebInspector.isBeingEdited(selectElement))
return;

var context = {
expanded: this.expanded,
hasChildren: this.hasChildren,
isEditingName: isEditingName,
previousContent: selectElement.textContent
};


this.hasChildren = false;

if (selectElement.parentElement)
selectElement.parentElement.addStyleClass("child-editing");
selectElement.textContent = selectElement.textContent; 

function pasteHandler(context, event)
{
var data = event.clipboardData.getData("Text");
if (!data)
return;
var colonIdx = data.indexOf(":");
if (colonIdx < 0)
return;
var name = data.substring(0, colonIdx).trim();
var value = data.substring(colonIdx + 1).trim();

event.preventDefault();

if (!("originalName" in context)) {
context.originalName = this.nameElement.textContent;
context.originalValue = this.valueElement.textContent;
}
this.property.name = name;
this.property.value = value;
this.nameElement.textContent = name;
this.valueElement.textContent = value;
this.nameElement.normalize();
this.valueElement.normalize();

this.editingCommitted(null, event.target.textContent, context.previousContent, context, "forward");
}

function blurListener(context, event)
{
var treeElement = this._parentPane._mouseDownTreeElement;
var moveDirection = "";
if (treeElement === this) {
if (isEditingName && this._parentPane._mouseDownTreeElementIsValue)
moveDirection = "forward";
if (!isEditingName && this._parentPane._mouseDownTreeElementIsName)
moveDirection = "backward";
}
this.editingCommitted(null, event.target.textContent, context.previousContent, context, moveDirection);
}

delete this.originalPropertyText;

this._parentPane._isEditingStyle = true;
if (selectElement.parentElement)
selectElement.parentElement.scrollIntoViewIfNeeded(false);

var applyItemCallback = !isEditingName ? this._applyFreeFlowStyleTextEdit.bind(this, true) : undefined;
this._prompt = new WebInspector.StylesSidebarPane.CSSPropertyPrompt(isEditingName ? WebInspector.CSSMetadata.cssPropertiesMetainfo : WebInspector.CSSMetadata.keywordsForProperty(this.nameElement.textContent), this, isEditingName);
if (applyItemCallback) {
this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemApplied, applyItemCallback, this);
this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemAccepted, applyItemCallback, this);
}
var proxyElement = this._prompt.attachAndStartEditing(selectElement, blurListener.bind(this, context));

proxyElement.addEventListener("keydown", this.editingNameValueKeyDown.bind(this, context), false);
if (isEditingName)
proxyElement.addEventListener("paste", pasteHandler.bind(this, context));

window.getSelection().setBaseAndExtent(selectElement, 0, selectElement, 1);
},

editingNameValueKeyDown: function(context, event)
{
if (event.handled)
return;

var isEditingName = context.isEditingName;
var result;

function shouldCommitValueSemicolon(text, cursorPosition)
{

var openQuote = "";
for (var i = 0; i < cursorPosition; ++i) {
var ch = text[i];
if (ch === "\\" && openQuote !== "")
++i; 
else if (!openQuote && (ch === "\"" || ch === "'"))
openQuote = ch;
else if (openQuote === ch)
openQuote = "";
}
return !openQuote;
}


var isFieldInputTerminated = (event.keyCode === WebInspector.KeyboardShortcut.Keys.Semicolon.code) &&
(isEditingName ? event.shiftKey : (!event.shiftKey && shouldCommitValueSemicolon(event.target.textContent, event.target.selectionLeftOffset())));
if (isEnterKey(event) || isFieldInputTerminated) {

event.preventDefault();
result = "forward";
} else if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code || event.keyIdentifier === "U+001B")
result = "cancel";
else if (!isEditingName && this._newProperty && event.keyCode === WebInspector.KeyboardShortcut.Keys.Backspace.code) {

var selection = window.getSelection();
if (selection.isCollapsed && !selection.focusOffset) {
event.preventDefault();
result = "backward";
}
} else if (event.keyIdentifier === "U+0009") { 
result = event.shiftKey ? "backward" : "forward";
event.preventDefault();
}

if (result) {
switch (result) {
case "cancel":
this.editingCancelled(null, context);
break;
case "forward":
case "backward":
this.editingCommitted(null, event.target.textContent, context.previousContent, context, result);
break;
}

event.consume();
return;
}

if (!isEditingName)
this._applyFreeFlowStyleTextEdit(false);
},

_applyFreeFlowStyleTextEdit: function(now)
{
if (this._applyFreeFlowStyleTextEditTimer)
clearTimeout(this._applyFreeFlowStyleTextEditTimer);

function apply()
{
var valueText = this.valueElement.textContent;
if (valueText.indexOf(";") === -1)
this.applyStyleText(this.nameElement.textContent + ": " + valueText, false, false, false);
}
if (now)
apply.call(this);
else
this._applyFreeFlowStyleTextEditTimer = setTimeout(apply.bind(this), 100);
},

kickFreeFlowStyleEditForTest: function()
{
this._applyFreeFlowStyleTextEdit(true);
},

editingEnded: function(context)
{
this._resetMouseDownElement();
if (this._applyFreeFlowStyleTextEditTimer)
clearTimeout(this._applyFreeFlowStyleTextEditTimer);

this.hasChildren = context.hasChildren;
if (context.expanded)
this.expand();
var editedElement = context.isEditingName ? this.nameElement : this.valueElement;

if (editedElement.parentElement)
editedElement.parentElement.removeStyleClass("child-editing");

delete this._parentPane._isEditingStyle;
},

editingCancelled: function(element, context)
{
this._removePrompt();
this._revertStyleUponEditingCanceled(this.originalPropertyText);

this.editingEnded(context);
},

_revertStyleUponEditingCanceled: function(originalPropertyText)
{
if (typeof originalPropertyText === "string") {
delete this.originalPropertyText;
this.applyStyleText(originalPropertyText, true, false, true);
} else {
if (this._newProperty)
this.treeOutline.removeChild(this);
else
this.updateTitle();
}
},

_findSibling: function(moveDirection)
{
var target = this;
do {
target = (moveDirection === "forward" ? target.nextSibling : target.previousSibling);
} while(target && target.inherited);

return target;
},

editingCommitted: function(element, userInput, previousContent, context, moveDirection)
{
this._removePrompt();
this.editingEnded(context);
var isEditingName = context.isEditingName;


var createNewProperty, moveToPropertyName, moveToSelector;
var isDataPasted = "originalName" in context;
var isDirtyViaPaste = isDataPasted && (this.nameElement.textContent !== context.originalName || this.valueElement.textContent !== context.originalValue);
var isPropertySplitPaste = isDataPasted && isEditingName && this.valueElement.textContent !== context.originalValue;
var moveTo = this;
var moveToOther = (isEditingName ^ (moveDirection === "forward"));
var abandonNewProperty = this._newProperty && !userInput && (moveToOther || isEditingName);
if (moveDirection === "forward" && (!isEditingName || isPropertySplitPaste) || moveDirection === "backward" && isEditingName) {
moveTo = moveTo._findSibling(moveDirection);
if (moveTo)
moveToPropertyName = moveTo.name;
else if (moveDirection === "forward" && (!this._newProperty || userInput))
createNewProperty = true;
else if (moveDirection === "backward")
moveToSelector = true;
}


var moveToIndex = moveTo && this.treeOutline ? this.treeOutline.children.indexOf(moveTo) : -1;
var blankInput = /^\s*$/.test(userInput);
var shouldCommitNewProperty = this._newProperty && (isPropertySplitPaste || moveToOther || (!moveDirection && !isEditingName) || (isEditingName && blankInput));
var section = this.section();
if (((userInput !== previousContent || isDirtyViaPaste) && !this._newProperty) || shouldCommitNewProperty) {
section._afterUpdate = moveToNextCallback.bind(this, this._newProperty, !blankInput, section);
var propertyText;
if (blankInput || (this._newProperty && /^\s*$/.test(this.valueElement.textContent)))
propertyText = "";
else {
if (isEditingName)
propertyText = userInput + ": " + this.valueElement.textContent;
else
propertyText = this.nameElement.textContent + ": " + userInput;
}
this.applyStyleText(propertyText, true, true, false);
} else {
if (!isDataPasted && !this._newProperty)
this.updateTitle();
moveToNextCallback.call(this, this._newProperty, false, section);
}


function moveToNextCallback(alreadyNew, valueChanged, section)
{
if (!moveDirection)
return;


if (moveTo && moveTo.parent) {
moveTo.startEditing(!isEditingName ? moveTo.nameElement : moveTo.valueElement);
return;
}



if (moveTo && !moveTo.parent) {
var propertyElements = section.propertiesTreeOutline.children;
if (moveDirection === "forward" && blankInput && !isEditingName)
--moveToIndex;
if (moveToIndex >= propertyElements.length && !this._newProperty)
createNewProperty = true;
else {
var treeElement = moveToIndex >= 0 ? propertyElements[moveToIndex] : null;
if (treeElement) {
var elementToEdit = !isEditingName || isPropertySplitPaste ? treeElement.nameElement : treeElement.valueElement;
if (alreadyNew && blankInput)
elementToEdit = moveDirection === "forward" ? treeElement.nameElement : treeElement.valueElement;
treeElement.startEditing(elementToEdit);
return;
} else if (!alreadyNew)
moveToSelector = true;
}
}


if (createNewProperty) {
if (alreadyNew && !valueChanged && (isEditingName ^ (moveDirection === "backward")))
return;

section.addNewBlankProperty().startEditing();
return;
}

if (abandonNewProperty) {
moveTo = this._findSibling(moveDirection);
var sectionToEdit = (moveTo || moveDirection === "backward") ? section : section.nextEditableSibling();
if (sectionToEdit) {
if (sectionToEdit.rule)
sectionToEdit.startEditingSelector();
else
sectionToEdit._moveEditorFromSelector(moveDirection);
}
return;
}

if (moveToSelector) {
if (section.rule)
section.startEditingSelector();
else
section._moveEditorFromSelector(moveDirection);
}
}
},

_removePrompt: function()
{

if (this._prompt) {
this._prompt.detach();
delete this._prompt;
}
},

_hasBeenModifiedIncrementally: function()
{


return typeof this.originalPropertyText === "string" || (!!this.property.propertyText && this._newProperty);
},

applyStyleText: function(styleText, updateInterface, majorChange, isRevert)
{
function userOperationFinishedCallback(parentPane, updateInterface)
{
if (updateInterface)
delete parentPane._userOperation;
}


if (!isRevert && !updateInterface && !this._hasBeenModifiedIncrementally()) {


this.originalPropertyText = this.property.propertyText;
}

if (!this.treeOutline)
return;

var section = this.section();
styleText = styleText.replace(/\s/g, " ").trim(); 
var styleTextLength = styleText.length;
if (!styleTextLength && updateInterface && !isRevert && this._newProperty && !this._hasBeenModifiedIncrementally()) {

this.parent.removeChild(this);
section.afterUpdate();
return;
}

var currentNode = this._parentPane.node;
if (updateInterface)
this._parentPane._userOperation = true;

function callback(userCallback, originalPropertyText, newStyle)
{
if (!newStyle) {
if (updateInterface) {

this._revertStyleUponEditingCanceled(originalPropertyText);
}
userCallback();
return;
}

if (this._newProperty)
this._newPropertyInStyle = true;
newStyle.parentRule = this.style.parentRule;
this.style = newStyle;
this.property = newStyle.propertyAt(this.property.index);
this._styleRule.style = this.style;

if (section && section.pane)
section.pane.dispatchEventToListeners("style edited");

if (updateInterface && currentNode === this.node()) {
this._updatePane(userCallback);
return;
}

userCallback();
}



if (styleText.length && !/;\s*$/.test(styleText))
styleText += ";";
var overwriteProperty = !!(!this._newProperty || this._newPropertyInStyle);
this.property.setText(styleText, majorChange, overwriteProperty, callback.bind(this, userOperationFinishedCallback.bind(null, this._parentPane, updateInterface), this.originalPropertyText));
},

ondblclick: function()
{
return true; 
},

isEventWithinDisclosureTriangle: function(event)
{
return event.target === this._expandElement;
},

__proto__: WebInspector.StylePropertyTreeElementBase.prototype
}


WebInspector.StylesSidebarPane.CSSPropertyPrompt = function(cssCompletions, sidebarPane, isEditingName)
{

WebInspector.TextPrompt.call(this, this._buildPropertyCompletions.bind(this), WebInspector.StyleValueDelimiters);
this.setSuggestBoxEnabled("generic-suggest");
this._cssCompletions = cssCompletions;
this._sidebarPane = sidebarPane;
this._isEditingName = isEditingName;
}

WebInspector.StylesSidebarPane.CSSPropertyPrompt.prototype = {
onKeyDown: function(event)
{
switch (event.keyIdentifier) {
case "Up":
case "Down":
case "PageUp":
case "PageDown":
if (this._handleNameOrValueUpDown(event)) {
event.preventDefault();
return;
}
break;
}

WebInspector.TextPrompt.prototype.onKeyDown.call(this, event);
},

onMouseWheel: function(event)
{
if (this._handleNameOrValueUpDown(event)) {
event.consume(true);
return;
}
WebInspector.TextPrompt.prototype.onMouseWheel.call(this, event);
},

tabKeyPressed: function()
{
this.acceptAutoComplete();


return false;
},

_handleNameOrValueUpDown: function(event)
{
function finishHandler(originalValue, replacementString)
{

this._sidebarPane.applyStyleText(this._sidebarPane.nameElement.textContent + ": " + this._sidebarPane.valueElement.textContent, false, false, false);
}


if (!this._isEditingName && WebInspector.handleElementValueModifications(event, this._sidebarPane.valueElement, finishHandler.bind(this), this._isValueSuggestion.bind(this)))
return true;

return false;
},

_isValueSuggestion: function(word)
{
if (!word)
return false;
word = word.toLowerCase();
return this._cssCompletions.keySet().hasOwnProperty(word);
},


_buildPropertyCompletions: function(proxyElement, wordRange, force, completionsReadyCallback)
{
var prefix = wordRange.toString().toLowerCase();
if (!prefix && !force)
return;

var results = this._cssCompletions.startsWith(prefix);
var selectedIndex = this._cssCompletions.mostUsedOf(results);
completionsReadyCallback(results, selectedIndex);
},

__proto__: WebInspector.TextPrompt.prototype
}
;


WebInspector.ElementsPanel = function()
{
WebInspector.Panel.call(this, "elements");
this.registerRequiredCSS("breadcrumbList.css");
this.registerRequiredCSS("elementsPanel.css");
this.registerRequiredCSS("textPrompt.css");
this.setHideOnDetach();

const initialSidebarWidth = 325;
const minimumContentWidthPercent = 34;
const initialSidebarHeight = 325;
const minimumContentHeightPercent = 34;
this.createSidebarView(this.element, WebInspector.SidebarView.SidebarPosition.End, initialSidebarWidth, initialSidebarHeight);
this.splitView.setMinimumSidebarWidth(Preferences.minElementsSidebarWidth);
this.splitView.setMinimumMainWidthPercent(minimumContentWidthPercent);
this.splitView.setMinimumSidebarHeight(Preferences.minElementsSidebarHeight);
this.splitView.setMinimumMainHeightPercent(minimumContentHeightPercent);

this.contentElement = this.splitView.mainElement;
this.contentElement.id = "elements-content";
this.contentElement.addStyleClass("outline-disclosure");
this.contentElement.addStyleClass("source-code");
if (!WebInspector.settings.domWordWrap.get())
this.contentElement.classList.add("nowrap");
WebInspector.settings.domWordWrap.addChangeListener(this._domWordWrapSettingChanged.bind(this));

this.contentElement.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
this.splitView.sidebarElement.addEventListener("contextmenu", this._sidebarContextMenuEventFired.bind(this), false);

this.treeOutline = new WebInspector.ElementsTreeOutline(true, true, false, this._populateContextMenu.bind(this), this._setPseudoClassForNodeId.bind(this));
this.treeOutline.wireToDomAgent();

this.treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);

this.crumbsElement = document.createElement("div");
this.crumbsElement.className = "crumbs";
this.crumbsElement.addEventListener("mousemove", this._mouseMovedInCrumbs.bind(this), false);
this.crumbsElement.addEventListener("mouseout", this._mouseMovedOutOfCrumbs.bind(this), false);

this.sidebarPanes = {};
this.sidebarPanes.computedStyle = new WebInspector.ComputedStyleSidebarPane();
this.sidebarPanes.styles = new WebInspector.StylesSidebarPane(this.sidebarPanes.computedStyle, this._setPseudoClassForNodeId.bind(this));
this.sidebarPanes.metrics = new WebInspector.MetricsSidebarPane();
this.sidebarPanes.properties = new WebInspector.PropertiesSidebarPane();
this.sidebarPanes.domBreakpoints = WebInspector.domBreakpointsSidebarPane.createProxy(this);
this.sidebarPanes.eventListeners = new WebInspector.EventListenersSidebarPane();

this.sidebarPanes.styles.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updateStyles.bind(this, false));
this.sidebarPanes.metrics.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updateMetrics.bind(this));
this.sidebarPanes.properties.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updateProperties.bind(this));
this.sidebarPanes.eventListeners.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updateEventListeners.bind(this));

this.sidebarPanes.styles.addEventListener("style edited", this._stylesPaneEdited, this);
this.sidebarPanes.styles.addEventListener("style property toggled", this._stylesPaneEdited, this);
this.sidebarPanes.metrics.addEventListener("metrics edited", this._metricsPaneEdited, this);

WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._dockSideChanged.bind(this));
WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));
this._dockSideChanged();

this._popoverHelper = new WebInspector.PopoverHelper(this.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
this._popoverHelper.setTimeout(0);

WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.AttrModified, this._updateBreadcrumbIfNeeded, this);
WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.AttrRemoved, this._updateBreadcrumbIfNeeded, this);
WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.NodeRemoved, this._nodeRemoved, this);
WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.DocumentUpdated, this._documentUpdatedEvent, this);
WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.InspectElementRequested, this._inspectElementRequested, this);

if (WebInspector.domAgent.existingDocument())
this._documentUpdated(WebInspector.domAgent.existingDocument());
}

WebInspector.ElementsPanel.prototype = {
get statusBarItems()
{
return [this.crumbsElement];
},

defaultFocusedElement: function()
{
return this.treeOutline.element;
},

statusBarResized: function()
{
this.updateBreadcrumbSizes();
},

wasShown: function()
{

if (this.treeOutline.element.parentElement !== this.contentElement)
this.contentElement.appendChild(this.treeOutline.element);

WebInspector.Panel.prototype.wasShown.call(this);

this.updateBreadcrumb();
this.treeOutline.updateSelection();
this.treeOutline.setVisible(true);

if (!this.treeOutline.rootDOMNode)
WebInspector.domAgent.requestDocument();
},

willHide: function()
{
WebInspector.domAgent.hideDOMNodeHighlight();
this.treeOutline.setVisible(false);
this._popoverHelper.hidePopover();


this.contentElement.removeChild(this.treeOutline.element);

WebInspector.Panel.prototype.willHide.call(this);
},

onResize: function()
{
this.treeOutline.updateSelection();
this.updateBreadcrumbSizes();
},


_setPseudoClassForNodeId: function(nodeId, pseudoClass, enable)
{
var node = WebInspector.domAgent.nodeForId(nodeId);
if (!node)
return;

var pseudoClasses = node.getUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName);
if (enable) {
pseudoClasses = pseudoClasses || [];
if (pseudoClasses.indexOf(pseudoClass) >= 0)
return;
pseudoClasses.push(pseudoClass);
node.setUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName, pseudoClasses);
} else {
if (!pseudoClasses || pseudoClasses.indexOf(pseudoClass) < 0)
return;
pseudoClasses.remove(pseudoClass);
if (!pseudoClasses.length)
node.removeUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName);
}

this.treeOutline.updateOpenCloseTags(node);
WebInspector.cssModel.forcePseudoState(node.id, node.getUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName));
this._metricsPaneEdited();
this._stylesPaneEdited();

WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
action: WebInspector.UserMetrics.UserActionNames.ForcedElementState,
selector: node.appropriateSelectorFor(false),
enabled: enable,
state: pseudoClass
});
},

_selectedNodeChanged: function()
{
var selectedNode = this.selectedDOMNode();
if (!selectedNode && this._lastValidSelectedNode)
this._selectedPathOnReset = this._lastValidSelectedNode.path();

this.updateBreadcrumb(false);

this._updateSidebars();

if (selectedNode) {
ConsoleAgent.addInspectedNode(selectedNode.id);
this._lastValidSelectedNode = selectedNode;
}
WebInspector.notifications.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged);
},

_updateSidebars: function()
{
for (var pane in this.sidebarPanes)
this.sidebarPanes[pane].needsUpdate = true;

this.updateStyles(true);
this.updateMetrics();
this.updateProperties();
this.updateEventListeners();
},

_reset: function()
{
delete this.currentQuery;
},

_documentUpdatedEvent: function(event)
{
this._documentUpdated(event.data);
},

_documentUpdated: function(inspectedRootDocument)
{
this._reset();
this.searchCanceled();

this.treeOutline.rootDOMNode = inspectedRootDocument;

if (!inspectedRootDocument) {
if (this.isShowing())
WebInspector.domAgent.requestDocument();
return;
}

WebInspector.domBreakpointsSidebarPane.restoreBreakpoints();


function selectNode(candidateFocusNode)
{
if (!candidateFocusNode)
candidateFocusNode = inspectedRootDocument.body || inspectedRootDocument.documentElement;

if (!candidateFocusNode)
return;

this.selectDOMNode(candidateFocusNode);
if (this.treeOutline.selectedTreeElement)
this.treeOutline.selectedTreeElement.expand();
}

function selectLastSelectedNode(nodeId)
{
if (this.selectedDOMNode()) {

return;
}
var node = nodeId ? WebInspector.domAgent.nodeForId(nodeId) : null;
selectNode.call(this, node);
}

if (this._selectedPathOnReset)
WebInspector.domAgent.pushNodeByPathToFrontend(this._selectedPathOnReset, selectLastSelectedNode.bind(this));
else
selectNode.call(this);
delete this._selectedPathOnReset;
},

searchCanceled: function()
{
delete this._searchQuery;
this._hideSearchHighlights();

WebInspector.searchController.updateSearchMatchesCount(0, this);

delete this._currentSearchResultIndex;
delete this._searchResults;
WebInspector.domAgent.cancelSearch();
},


performSearch: function(query)
{

this.searchCanceled();

const whitespaceTrimmedQuery = query.trim();
if (!whitespaceTrimmedQuery.length)
return;

this._searchQuery = query;


function resultCountCallback(resultCount)
{
WebInspector.searchController.updateSearchMatchesCount(resultCount, this);
if (!resultCount)
return;

this._searchResults = new Array(resultCount);
this._currentSearchResultIndex = -1;
this.jumpToNextSearchResult();
}
WebInspector.domAgent.performSearch(whitespaceTrimmedQuery, resultCountCallback.bind(this));
},

_contextMenuEventFired: function(event)
{
function toggleWordWrap()
{
WebInspector.settings.domWordWrap.set(!WebInspector.settings.domWordWrap.get());
}

var contextMenu = new WebInspector.ContextMenu(event);
this.treeOutline.populateContextMenu(contextMenu, event);

if (WebInspector.experimentsSettings.cssRegions.isEnabled()) {
contextMenu.appendSeparator();
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "CSS named flows\u2026" : "CSS Named Flows\u2026"), this._showNamedFlowCollections.bind(this));
}

contextMenu.appendSeparator();
contextMenu.appendCheckboxItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Word wrap" : "Word Wrap"), toggleWordWrap.bind(this), WebInspector.settings.domWordWrap.get());

contextMenu.show();
},

_showNamedFlowCollections: function()
{
if (!WebInspector.cssNamedFlowCollectionsView)
WebInspector.cssNamedFlowCollectionsView = new WebInspector.CSSNamedFlowCollectionsView();
WebInspector.cssNamedFlowCollectionsView.showInDrawer();
},

_domWordWrapSettingChanged: function(event)
{
if (event.data)
this.contentElement.removeStyleClass("nowrap");
else
this.contentElement.addStyleClass("nowrap");

var selectedNode = this.selectedDOMNode();
if (!selectedNode)
return;

var treeElement = this.treeOutline.findTreeElement(selectedNode);
if (treeElement)
treeElement.updateSelection(); 
},

switchToAndFocus: function(node)
{

WebInspector.searchController.cancelSearch();
WebInspector.inspectorView.setCurrentPanel(this);
this.selectDOMNode(node, true);
},

_populateContextMenu: function(contextMenu, node)
{

contextMenu.appendSeparator();
var pane = WebInspector.domBreakpointsSidebarPane;
pane.populateNodeContextMenu(node, contextMenu);
},

_getPopoverAnchor: function(element)
{
var anchor = element.enclosingNodeOrSelfWithClass("webkit-html-resource-link");
if (anchor) {
if (!anchor.href)
return null;

var resource = WebInspector.resourceTreeModel.resourceForURL(anchor.href);
if (!resource || resource.type !== WebInspector.resourceTypes.Image)
return null;

anchor.removeAttribute("title");
}
return anchor;
},

_loadDimensionsForNode: function(treeElement, callback)
{

if (treeElement.treeOutline !== this.treeOutline) {
callback();
return;
}

var node =   (treeElement.representedObject);

if (!node.nodeName() || node.nodeName().toLowerCase() !== "img") {
callback();
return;
}

WebInspector.RemoteObject.resolveNode(node, "", resolvedNode);

function resolvedNode(object)
{
if (!object) {
callback();
return;
}

object.callFunctionJSON(dimensions, undefined, callback);
object.release();

function dimensions()
{
return { offsetWidth: this.offsetWidth, offsetHeight: this.offsetHeight, naturalWidth: this.naturalWidth, naturalHeight: this.naturalHeight };
}
}
},


_showPopover: function(anchor, popover)
{
var listItem = anchor.enclosingNodeOrSelfWithNodeName("li");
if (listItem && listItem.treeElement)
this._loadDimensionsForNode(listItem.treeElement, WebInspector.DOMPresentationUtils.buildImagePreviewContents.bind(WebInspector.DOMPresentationUtils, anchor.href, true, showPopover));
else
WebInspector.DOMPresentationUtils.buildImagePreviewContents(anchor.href, true, showPopover);


function showPopover(contents)
{
if (!contents)
return;
popover.setCanShrink(false);
popover.show(contents, anchor);
}
},

jumpToNextSearchResult: function()
{
if (!this._searchResults)
return;

this._hideSearchHighlights();
if (++this._currentSearchResultIndex >= this._searchResults.length)
this._currentSearchResultIndex = 0;

this._highlightCurrentSearchResult();
},

jumpToPreviousSearchResult: function()
{
if (!this._searchResults)
return;

this._hideSearchHighlights();
if (--this._currentSearchResultIndex < 0)
this._currentSearchResultIndex = (this._searchResults.length - 1);

this._highlightCurrentSearchResult();
},

_highlightCurrentSearchResult: function()
{
var index = this._currentSearchResultIndex;
var searchResults = this._searchResults;
var searchResult = searchResults[index];

if (searchResult === null) {
WebInspector.searchController.updateCurrentMatchIndex(index, this);
return;
}

if (typeof searchResult === "undefined") {

function callback(node)
{
searchResults[index] = node || null;
this._highlightCurrentSearchResult();
}
WebInspector.domAgent.searchResult(index, callback.bind(this));
return;
}

WebInspector.searchController.updateCurrentMatchIndex(index, this);

var treeElement = this.treeOutline.findTreeElement(searchResult);
if (treeElement) {
treeElement.highlightSearchResults(this._searchQuery);
treeElement.reveal();
var matches = treeElement.listItemElement.getElementsByClassName("webkit-search-result");
if (matches.length)
matches[0].scrollIntoViewIfNeeded();
}
},

_hideSearchHighlights: function()
{
if (!this._searchResults)
return;
var searchResult = this._searchResults[this._currentSearchResultIndex];
if (!searchResult)
return;
var treeElement = this.treeOutline.findTreeElement(searchResult);
if (treeElement)
treeElement.hideSearchHighlights();
},

selectedDOMNode: function()
{
return this.treeOutline.selectedDOMNode();
},


selectDOMNode: function(node, focus)
{
this.treeOutline.selectDOMNode(node, focus);
},

_nodeRemoved: function(event)
{
if (!this.isShowing())
return;

var crumbs = this.crumbsElement;
for (var crumb = crumbs.firstChild; crumb; crumb = crumb.nextSibling) {
if (crumb.representedObject === event.data.node) {
this.updateBreadcrumb(true);
return;
}
}
},

_stylesPaneEdited: function()
{

this.sidebarPanes.metrics.needsUpdate = true;
this.updateMetrics();
},

_metricsPaneEdited: function()
{

this.sidebarPanes.styles.needsUpdate = true;
this.updateStyles(true);
},

_mouseMovedInCrumbs: function(event)
{
var nodeUnderMouse = document.elementFromPoint(event.pageX, event.pageY);
var crumbElement = nodeUnderMouse.enclosingNodeOrSelfWithClass("crumb");

WebInspector.domAgent.highlightDOMNode(crumbElement ? crumbElement.representedObject.id : 0);

if ("_mouseOutOfCrumbsTimeout" in this) {
clearTimeout(this._mouseOutOfCrumbsTimeout);
delete this._mouseOutOfCrumbsTimeout;
}
},

_mouseMovedOutOfCrumbs: function(event)
{
var nodeUnderMouse = document.elementFromPoint(event.pageX, event.pageY);
if (nodeUnderMouse && nodeUnderMouse.isDescendant(this.crumbsElement))
return;

WebInspector.domAgent.hideDOMNodeHighlight();

this._mouseOutOfCrumbsTimeout = setTimeout(this.updateBreadcrumbSizes.bind(this), 1000);
},

_updateBreadcrumbIfNeeded: function(event)
{
var name = event.data.name;
if (name !== "class" && name !== "id")
return;

var node =   (event.data.node);
var crumbs = this.crumbsElement;
var crumb = crumbs.firstChild;
while (crumb) {
if (crumb.representedObject === node) {
this.updateBreadcrumb(true);
break;
}
crumb = crumb.nextSibling;
}
},


updateBreadcrumb: function(forceUpdate)
{
if (!this.isShowing())
return;

var crumbs = this.crumbsElement;

var handled = false;
var crumb = crumbs.firstChild;
while (crumb) {
if (crumb.representedObject === this.selectedDOMNode()) {
crumb.addStyleClass("selected");
handled = true;
} else {
crumb.removeStyleClass("selected");
}

crumb = crumb.nextSibling;
}

if (handled && !forceUpdate) {


this.updateBreadcrumbSizes();
return;
}

crumbs.removeChildren();

var panel = this;

function selectCrumbFunction(event)
{
var crumb = event.currentTarget;
if (crumb.hasStyleClass("collapsed")) {

if (crumb === panel.crumbsElement.firstChild) {


var currentCrumb = crumb;
while (currentCrumb) {
var hidden = currentCrumb.hasStyleClass("hidden");
var collapsed = currentCrumb.hasStyleClass("collapsed");
if (!hidden && !collapsed)
break;
crumb = currentCrumb;
currentCrumb = currentCrumb.nextSibling;
}
}

panel.updateBreadcrumbSizes(crumb);
} else
panel.selectDOMNode(crumb.representedObject, true);

event.preventDefault();
}

for (var current = this.selectedDOMNode(); current; current = current.parentNode) {
if (current.nodeType() === Node.DOCUMENT_NODE)
continue;

crumb = document.createElement("span");
crumb.className = "crumb";
crumb.representedObject = current;
crumb.addEventListener("mousedown", selectCrumbFunction, false);

var crumbTitle;
switch (current.nodeType()) {
case Node.ELEMENT_NODE:
WebInspector.DOMPresentationUtils.decorateNodeLabel(current, crumb);
break;

case Node.TEXT_NODE:
crumbTitle = WebInspector.UIString("(text)");
break

case Node.COMMENT_NODE:
crumbTitle = "<!-->";
break;

case Node.DOCUMENT_TYPE_NODE:
crumbTitle = "<!DOCTYPE>";
break;

default:
crumbTitle = current.nodeNameInCorrectCase();
}

if (!crumb.childNodes.length) {
var nameElement = document.createElement("span");
nameElement.textContent = crumbTitle;
crumb.appendChild(nameElement);
crumb.title = crumbTitle;
}

if (current === this.selectedDOMNode())
crumb.addStyleClass("selected");
if (!crumbs.childNodes.length)
crumb.addStyleClass("end");

crumbs.appendChild(crumb);
}

if (crumbs.hasChildNodes())
crumbs.lastChild.addStyleClass("start");

this.updateBreadcrumbSizes();
},


updateBreadcrumbSizes: function(focusedCrumb)
{
if (!this.isShowing())
return;

if (document.body.offsetWidth <= 0) {


return;
}

var crumbs = this.crumbsElement;
if (!crumbs.childNodes.length || crumbs.offsetWidth <= 0)
return; 


var selectedIndex = 0;
var focusedIndex = 0;
var selectedCrumb;

var i = 0;
var crumb = crumbs.firstChild;
while (crumb) {

if (!selectedCrumb && crumb.hasStyleClass("selected")) {
selectedCrumb = crumb;
selectedIndex = i;
}


if (crumb === focusedCrumb)
focusedIndex = i;



if (crumb !== crumbs.lastChild)
crumb.removeStyleClass("start");
if (crumb !== crumbs.firstChild)
crumb.removeStyleClass("end");

crumb.removeStyleClass("compact");
crumb.removeStyleClass("collapsed");
crumb.removeStyleClass("hidden");

crumb = crumb.nextSibling;
++i;
}



crumbs.firstChild.addStyleClass("end");
crumbs.lastChild.addStyleClass("start");

function crumbsAreSmallerThanContainer()
{
var rightPadding = 20;
var errorWarningElement = document.getElementById("error-warning-count");
if (!WebInspector.drawer.visible && errorWarningElement)
rightPadding += errorWarningElement.offsetWidth;
return ((crumbs.totalOffsetLeft() + crumbs.offsetWidth + rightPadding) < window.innerWidth);
}

if (crumbsAreSmallerThanContainer())
return; 

var BothSides = 0;
var AncestorSide = -1;
var ChildSide = 1;


function makeCrumbsSmaller(shrinkingFunction, direction, significantCrumb)
{
if (!significantCrumb)
significantCrumb = (focusedCrumb || selectedCrumb);

if (significantCrumb === selectedCrumb)
var significantIndex = selectedIndex;
else if (significantCrumb === focusedCrumb)
var significantIndex = focusedIndex;
else {
var significantIndex = 0;
for (var i = 0; i < crumbs.childNodes.length; ++i) {
if (crumbs.childNodes[i] === significantCrumb) {
significantIndex = i;
break;
}
}
}

function shrinkCrumbAtIndex(index)
{
var shrinkCrumb = crumbs.childNodes[index];
if (shrinkCrumb && shrinkCrumb !== significantCrumb)
shrinkingFunction(shrinkCrumb);
if (crumbsAreSmallerThanContainer())
return true; 
return false;
}



if (direction) {

var index = (direction > 0 ? 0 : crumbs.childNodes.length - 1);
while (index !== significantIndex) {
if (shrinkCrumbAtIndex(index))
return true;
index += (direction > 0 ? 1 : -1);
}
} else {


var startIndex = 0;
var endIndex = crumbs.childNodes.length - 1;
while (startIndex != significantIndex || endIndex != significantIndex) {
var startDistance = significantIndex - startIndex;
var endDistance = endIndex - significantIndex;
if (startDistance >= endDistance)
var index = startIndex++;
else
var index = endIndex--;
if (shrinkCrumbAtIndex(index))
return true;
}
}


return false;
}

function coalesceCollapsedCrumbs()
{
var crumb = crumbs.firstChild;
var collapsedRun = false;
var newStartNeeded = false;
var newEndNeeded = false;
while (crumb) {
var hidden = crumb.hasStyleClass("hidden");
if (!hidden) {
var collapsed = crumb.hasStyleClass("collapsed");
if (collapsedRun && collapsed) {
crumb.addStyleClass("hidden");
crumb.removeStyleClass("compact");
crumb.removeStyleClass("collapsed");

if (crumb.hasStyleClass("start")) {
crumb.removeStyleClass("start");
newStartNeeded = true;
}

if (crumb.hasStyleClass("end")) {
crumb.removeStyleClass("end");
newEndNeeded = true;
}

continue;
}

collapsedRun = collapsed;

if (newEndNeeded) {
newEndNeeded = false;
crumb.addStyleClass("end");
}
} else
collapsedRun = true;
crumb = crumb.nextSibling;
}

if (newStartNeeded) {
crumb = crumbs.lastChild;
while (crumb) {
if (!crumb.hasStyleClass("hidden")) {
crumb.addStyleClass("start");
break;
}
crumb = crumb.previousSibling;
}
}
}

function compact(crumb)
{
if (crumb.hasStyleClass("hidden"))
return;
crumb.addStyleClass("compact");
}

function collapse(crumb, dontCoalesce)
{
if (crumb.hasStyleClass("hidden"))
return;
crumb.addStyleClass("collapsed");
crumb.removeStyleClass("compact");
if (!dontCoalesce)
coalesceCollapsedCrumbs();
}

if (!focusedCrumb) {




if (makeCrumbsSmaller(compact, ChildSide))
return;


if (makeCrumbsSmaller(collapse, ChildSide))
return;
}


if (makeCrumbsSmaller(compact, (focusedCrumb ? BothSides : AncestorSide)))
return;


if (makeCrumbsSmaller(collapse, (focusedCrumb ? BothSides : AncestorSide)))
return;

if (!selectedCrumb)
return;


compact(selectedCrumb);
if (crumbsAreSmallerThanContainer())
return;


collapse(selectedCrumb, true);
},


updateStyles: function(forceUpdate)
{
var stylesSidebarPane = this.sidebarPanes.styles;
var computedStylePane = this.sidebarPanes.computedStyle;
if ((!stylesSidebarPane.isShowing() && !computedStylePane.isShowing()) || !stylesSidebarPane.needsUpdate)
return;

stylesSidebarPane.update(this.selectedDOMNode(), forceUpdate);
stylesSidebarPane.needsUpdate = false;
},

updateMetrics: function()
{
var metricsSidebarPane = this.sidebarPanes.metrics;
if (!metricsSidebarPane.isShowing() || !metricsSidebarPane.needsUpdate)
return;

metricsSidebarPane.update(this.selectedDOMNode());
metricsSidebarPane.needsUpdate = false;
},

updateProperties: function()
{
var propertiesSidebarPane = this.sidebarPanes.properties;
if (!propertiesSidebarPane.isShowing() || !propertiesSidebarPane.needsUpdate)
return;

propertiesSidebarPane.update(this.selectedDOMNode());
propertiesSidebarPane.needsUpdate = false;
},

updateEventListeners: function()
{
var eventListenersSidebarPane = this.sidebarPanes.eventListeners;
if (!eventListenersSidebarPane.isShowing() || !eventListenersSidebarPane.needsUpdate)
return;

eventListenersSidebarPane.update(this.selectedDOMNode());
eventListenersSidebarPane.needsUpdate = false;
},

handleShortcut: function(event)
{
function handleUndoRedo()
{
if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && !event.shiftKey && event.keyIdentifier === "U+005A") { 
WebInspector.domAgent.undo(this._updateSidebars.bind(this));
event.handled = true;
return;
}

var isRedoKey = WebInspector.isMac() ? event.metaKey && event.shiftKey && event.keyIdentifier === "U+005A" : 
event.ctrlKey && event.keyIdentifier === "U+0059"; 
if (isRedoKey) {
DOMAgent.redo(this._updateSidebars.bind(this));
event.handled = true;
}
}

if (!this.treeOutline.editing()) {
handleUndoRedo.call(this);
if (event.handled)
return;
}

this.treeOutline.handleShortcut(event);
},

handleCopyEvent: function(event)
{

if (!window.getSelection().isCollapsed)
return;
event.clipboardData.clearData();
event.preventDefault();
this.selectedDOMNode().copyNode();
},

sidebarResized: function(event)
{
this.treeOutline.updateSelection();
},

_inspectElementRequested: function(event)
{
var node = event.data;
this.revealAndSelectNode(node.id);
},

revealAndSelectNode: function(nodeId)
{
WebInspector.inspectorView.setCurrentPanel(this);

var node = WebInspector.domAgent.nodeForId(nodeId);
if (!node)
return;

WebInspector.domAgent.highlightDOMNodeForTwoSeconds(nodeId);
this.selectDOMNode(node, true);
},


appendApplicableItems: function(event, contextMenu, target)
{
if (!(target instanceof WebInspector.RemoteObject))
return;
var remoteObject =   (target);
if (remoteObject.subtype !== "node")
return;

function selectNode(nodeId)
{
if (nodeId)
WebInspector.domAgent.inspectElement(nodeId);
}

function revealElement()
{
remoteObject.pushNodeToFrontend(selectNode);
}

contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Elements panel" : "Reveal in Elements Panel"), revealElement.bind(this));
},

_sidebarContextMenuEventFired: function(event)
{
var contextMenu = new WebInspector.ContextMenu(event);
contextMenu.show();
},

_dockSideChanged: function()
{
var dockSide = WebInspector.dockController.dockSide();
var vertically = dockSide === WebInspector.DockController.State.DockedToRight && WebInspector.settings.splitVerticallyWhenDockedToRight.get();
this._splitVertically(vertically);
},


_splitVertically: function(vertically)
{
if (this.sidebarPaneView && vertically === !this.splitView.isVertical())
return;

if (this.sidebarPaneView)
this.sidebarPaneView.detach();

this.splitView.setVertical(!vertically);

if (!vertically) {
this.sidebarPaneView = new WebInspector.SidebarPaneStack();
for (var pane in this.sidebarPanes)
this.sidebarPaneView.addPane(this.sidebarPanes[pane]);
} else {
this.sidebarPaneView = new WebInspector.SidebarTabbedPane();

var compositePane = new WebInspector.SidebarPane(this.sidebarPanes.styles.title());
compositePane.element.addStyleClass("composite");
compositePane.element.addStyleClass("fill");
var expandComposite = compositePane.expand.bind(compositePane);

var splitView = new WebInspector.SplitView(true, "StylesPaneSplitRatio", 0.5);
splitView.show(compositePane.bodyElement);

this.sidebarPanes.styles.show(splitView.firstElement());
splitView.firstElement().appendChild(this.sidebarPanes.styles.titleElement);
this.sidebarPanes.styles.setExpandCallback(expandComposite);

this.sidebarPanes.metrics.show(splitView.secondElement());
this.sidebarPanes.metrics.setExpandCallback(expandComposite);

splitView.secondElement().appendChild(this.sidebarPanes.computedStyle.titleElement);
splitView.secondElement().addStyleClass("metrics-and-computed");
this.sidebarPanes.computedStyle.show(splitView.secondElement());
this.sidebarPanes.computedStyle.setExpandCallback(expandComposite);

this.sidebarPaneView.addPane(compositePane);
this.sidebarPaneView.addPane(this.sidebarPanes.properties);
this.sidebarPaneView.addPane(this.sidebarPanes.domBreakpoints);
this.sidebarPaneView.addPane(this.sidebarPanes.eventListeners);
}
this.sidebarPaneView.show(this.splitView.sidebarElement);
this.sidebarPanes.styles.expand();
},


addExtensionSidebarPane: function(id, pane)
{
this.sidebarPanes[id] = pane;
this.sidebarPaneView.addPane(pane);
},

__proto__: WebInspector.Panel.prototype
}
