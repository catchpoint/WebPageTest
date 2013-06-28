





WebInspector.JavaScriptBreakpointsSidebarPane = function(breakpointManager, showSourceLineDelegate)
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Breakpoints"));
this.registerRequiredCSS("breakpointsList.css");

this._breakpointManager = breakpointManager;
this._showSourceLineDelegate = showSourceLineDelegate;

this.listElement = document.createElement("ol");
this.listElement.className = "breakpoint-list";

this.emptyElement = document.createElement("div");
this.emptyElement.className = "info";
this.emptyElement.textContent = WebInspector.UIString("No Breakpoints");

this.bodyElement.appendChild(this.emptyElement);

this._items = new Map();

var breakpointLocations = this._breakpointManager.allBreakpointLocations();
for (var i = 0; i < breakpointLocations.length; ++i)
this._addBreakpoint(breakpointLocations[i].breakpoint, breakpointLocations[i].uiLocation);

this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointAdded, this._breakpointAdded, this);
this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointRemoved, this._breakpointRemoved, this);

this.emptyElement.addEventListener("contextmenu", this._emptyElementContextMenu.bind(this), true);
}

WebInspector.JavaScriptBreakpointsSidebarPane.prototype = {
_emptyElementContextMenu: function(event)
{
var contextMenu = new WebInspector.ContextMenu(event);
var breakpointActive = WebInspector.debuggerModel.breakpointsActive();
var breakpointActiveTitle = breakpointActive ?
WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Deactivate breakpoints" : "Deactivate Breakpoints") :
WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Activate breakpoints" : "Activate Breakpoints");
contextMenu.appendItem(breakpointActiveTitle, WebInspector.debuggerModel.setBreakpointsActive.bind(WebInspector.debuggerModel, !breakpointActive));
contextMenu.show();
},


_breakpointAdded: function(event)
{
this._breakpointRemoved(event);

var breakpoint =   (event.data.breakpoint);
var uiLocation =   (event.data.uiLocation);
this._addBreakpoint(breakpoint, uiLocation);
},


_addBreakpoint: function(breakpoint, uiLocation)
{
var element = document.createElement("li");
element.addStyleClass("cursor-pointer");
element.addEventListener("contextmenu", this._breakpointContextMenu.bind(this, breakpoint), true);
element.addEventListener("click", this._breakpointClicked.bind(this, uiLocation), false);

var checkbox = document.createElement("input");
checkbox.className = "checkbox-elem";
checkbox.type = "checkbox";
checkbox.checked = breakpoint.enabled();
checkbox.addEventListener("click", this._breakpointCheckboxClicked.bind(this, breakpoint), false);
element.appendChild(checkbox);

var labelElement = document.createTextNode(uiLocation.linkText());
element.appendChild(labelElement);

var snippetElement = document.createElement("div");
snippetElement.className = "source-text monospace";
element.appendChild(snippetElement);


function didRequestContent(content, contentEncoded, mimeType)
{
var lineEndings = content.lineEndings();
if (uiLocation.lineNumber < lineEndings.length)
snippetElement.textContent = content.substring(lineEndings[uiLocation.lineNumber - 1], lineEndings[uiLocation.lineNumber]);
}
uiLocation.uiSourceCode.requestContent(didRequestContent.bind(this));

element._data = uiLocation;
var currentElement = this.listElement.firstChild;
while (currentElement) {
if (currentElement._data && this._compareBreakpoints(currentElement._data, element._data) > 0)
break;
currentElement = currentElement.nextSibling;
}
this._addListElement(element, currentElement);

var breakpointItem = {};
breakpointItem.element = element;
breakpointItem.checkbox = checkbox;
this._items.put(breakpoint, breakpointItem);

this.expand();
},


_breakpointRemoved: function(event)
{
var breakpoint =   (event.data.breakpoint);
var uiLocation =   (event.data.uiLocation);
var breakpointItem = this._items.get(breakpoint);
if (!breakpointItem)
return;
this._items.remove(breakpoint);
this._removeListElement(breakpointItem.element);
},


highlightBreakpoint: function(breakpoint)
{
var breakpointItem = this._items.get(breakpoint);
if (!breakpointItem)
return;
breakpointItem.element.addStyleClass("breakpoint-hit");
this._highlightedBreakpointItem = breakpointItem;
},

clearBreakpointHighlight: function()
{
if (this._highlightedBreakpointItem) {
this._highlightedBreakpointItem.element.removeStyleClass("breakpoint-hit");
delete this._highlightedBreakpointItem;
}
},

_breakpointClicked: function(uiLocation, event)
{
this._showSourceLineDelegate(uiLocation.uiSourceCode, uiLocation.lineNumber);
},


_breakpointCheckboxClicked: function(breakpoint, event)
{

event.consume();
breakpoint.setEnabled(event.target.checked);
},


_breakpointContextMenu: function(breakpoint, event)
{
var breakpoints = this._items.values();
var contextMenu = new WebInspector.ContextMenu(event);
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove breakpoint" : "Remove Breakpoint"), breakpoint.remove.bind(breakpoint));
if (breakpoints.length > 1) {
var removeAllTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove all breakpoints" : "Remove All Breakpoints");
contextMenu.appendItem(removeAllTitle, this._breakpointManager.removeAllBreakpoints.bind(this._breakpointManager));
}

contextMenu.appendSeparator();
var breakpointActive = WebInspector.debuggerModel.breakpointsActive();
var breakpointActiveTitle = breakpointActive ?
WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Deactivate breakpoints" : "Deactivate Breakpoints") :
WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Activate breakpoints" : "Activate Breakpoints");
contextMenu.appendItem(breakpointActiveTitle, WebInspector.debuggerModel.setBreakpointsActive.bind(WebInspector.debuggerModel, !breakpointActive));

function enabledBreakpointCount(breakpoints)
{
var count = 0;
for (var i = 0; i < breakpoints.length; ++i) {
if (breakpoints[i].checkbox.checked)
count++;
}
return count;
}
if (breakpoints.length > 1) {
var enableBreakpointCount = enabledBreakpointCount(breakpoints);
var enableTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Enable all breakpoints" : "Enable All Breakpoints");
var disableTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Disable all breakpoints" : "Disable All Breakpoints");

contextMenu.appendSeparator();

contextMenu.appendItem(enableTitle, this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager, true), !(enableBreakpointCount != breakpoints.length));
contextMenu.appendItem(disableTitle, this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager, false), !(enableBreakpointCount > 1));
}

contextMenu.show();
},

_addListElement: function(element, beforeElement)
{
if (beforeElement)
this.listElement.insertBefore(element, beforeElement);
else {
if (!this.listElement.firstChild) {
this.bodyElement.removeChild(this.emptyElement);
this.bodyElement.appendChild(this.listElement);
}
this.listElement.appendChild(element);
}
},

_removeListElement: function(element)
{
this.listElement.removeChild(element);
if (!this.listElement.firstChild) {
this.bodyElement.removeChild(this.listElement);
this.bodyElement.appendChild(this.emptyElement);
}
},

_compare: function(x, y)
{
if (x !== y)
return x < y ? -1 : 1;
return 0;
},

_compareBreakpoints: function(b1, b2)
{
return this._compare(b1.uiSourceCode.originURL(), b2.uiSourceCode.originURL()) || this._compare(b1.lineNumber, b2.lineNumber);
},

reset: function()
{
this.listElement.removeChildren();
if (this.listElement.parentElement) {
this.bodyElement.removeChild(this.listElement);
this.bodyElement.appendChild(this.emptyElement);
}
this._items.clear();
},

__proto__: WebInspector.SidebarPane.prototype
}


WebInspector.XHRBreakpointsSidebarPane = function()
{
WebInspector.NativeBreakpointsSidebarPane.call(this, WebInspector.UIString("XHR Breakpoints"));

this._breakpointElements = {};

var addButton = document.createElement("button");
addButton.className = "pane-title-button add";
addButton.addEventListener("click", this._addButtonClicked.bind(this), false);
addButton.title = WebInspector.UIString("Add XHR breakpoint");
this.titleElement.appendChild(addButton);

this.emptyElement.addEventListener("contextmenu", this._emptyElementContextMenu.bind(this), true);

this._restoreBreakpoints();
}

WebInspector.XHRBreakpointsSidebarPane.prototype = {
_emptyElementContextMenu: function(event)
{
var contextMenu = new WebInspector.ContextMenu(event);
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add breakpoint" : "Add Breakpoint"), this._addButtonClicked.bind(this));
contextMenu.show();
},

_addButtonClicked: function(event)
{
if (event)
event.consume();

this.expand();

var inputElementContainer = document.createElement("p");
inputElementContainer.className = "breakpoint-condition";
var inputElement = document.createElement("span");
inputElementContainer.textContent = WebInspector.UIString("Break when URL contains:");
inputElement.className = "editing";
inputElement.id = "breakpoint-condition-input";
inputElementContainer.appendChild(inputElement);
this._addListElement(inputElementContainer, this.listElement.firstChild);

function finishEditing(accept, e, text)
{
this._removeListElement(inputElementContainer);
if (accept) {
this._setBreakpoint(text, true);
this._saveBreakpoints();
}
}

var config = new WebInspector.EditingConfig(finishEditing.bind(this, true), finishEditing.bind(this, false));
WebInspector.startEditing(inputElement, config);
},

_setBreakpoint: function(url, enabled)
{
if (url in this._breakpointElements)
return;

var element = document.createElement("li");
element._url = url;
element.addEventListener("contextmenu", this._contextMenu.bind(this, url), true);

var checkboxElement = document.createElement("input");
checkboxElement.className = "checkbox-elem";
checkboxElement.type = "checkbox";
checkboxElement.checked = enabled;
checkboxElement.addEventListener("click", this._checkboxClicked.bind(this, url), false);
element._checkboxElement = checkboxElement;
element.appendChild(checkboxElement);

var labelElement = document.createElement("span");
if (!url)
labelElement.textContent = WebInspector.UIString("Any XHR");
else
labelElement.textContent = WebInspector.UIString("URL contains \"%s\"", url);
labelElement.addStyleClass("cursor-auto");
labelElement.addEventListener("dblclick", this._labelClicked.bind(this, url), false);
element.appendChild(labelElement);

var currentElement = this.listElement.firstChild;
while (currentElement) {
if (currentElement._url && currentElement._url < element._url)
break;
currentElement = currentElement.nextSibling;
}
this._addListElement(element, currentElement);
this._breakpointElements[url] = element;
if (enabled)
DOMDebuggerAgent.setXHRBreakpoint(url);
},

_removeBreakpoint: function(url)
{
var element = this._breakpointElements[url];
if (!element)
return;

this._removeListElement(element);
delete this._breakpointElements[url];
if (element._checkboxElement.checked)
DOMDebuggerAgent.removeXHRBreakpoint(url);
},

_contextMenu: function(url, event)
{
var contextMenu = new WebInspector.ContextMenu(event);
function removeBreakpoint()
{
this._removeBreakpoint(url);
this._saveBreakpoints();
}
function removeAllBreakpoints()
{
for (var url in this._breakpointElements)
this._removeBreakpoint(url);
this._saveBreakpoints();
}
var removeAllTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove all breakpoints" : "Remove All Breakpoints");

contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add breakpoint" : "Add Breakpoint"), this._addButtonClicked.bind(this));
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove breakpoint" : "Remove Breakpoint"), removeBreakpoint.bind(this));
contextMenu.appendItem(removeAllTitle, removeAllBreakpoints.bind(this));
contextMenu.show();
},

_checkboxClicked: function(url, event)
{
if (event.target.checked)
DOMDebuggerAgent.setXHRBreakpoint(url);
else
DOMDebuggerAgent.removeXHRBreakpoint(url);
this._saveBreakpoints();
},

_labelClicked: function(url)
{
var element = this._breakpointElements[url];
var inputElement = document.createElement("span");
inputElement.className = "breakpoint-condition editing";
inputElement.textContent = url;
this.listElement.insertBefore(inputElement, element);
element.addStyleClass("hidden");

function finishEditing(accept, e, text)
{
this._removeListElement(inputElement);
if (accept) {
this._removeBreakpoint(url);
this._setBreakpoint(text, element._checkboxElement.checked);
this._saveBreakpoints();
} else
element.removeStyleClass("hidden");
}

WebInspector.startEditing(inputElement, new WebInspector.EditingConfig(finishEditing.bind(this, true), finishEditing.bind(this, false)));
},

highlightBreakpoint: function(url)
{
var element = this._breakpointElements[url];
if (!element)
return;
this.expand();
element.addStyleClass("breakpoint-hit");
this._highlightedElement = element;
},

clearBreakpointHighlight: function()
{
if (this._highlightedElement) {
this._highlightedElement.removeStyleClass("breakpoint-hit");
delete this._highlightedElement;
}
},

_saveBreakpoints: function()
{
var breakpoints = [];
for (var url in this._breakpointElements)
breakpoints.push({ url: url, enabled: this._breakpointElements[url]._checkboxElement.checked });
WebInspector.settings.xhrBreakpoints.set(breakpoints);
},

_restoreBreakpoints: function()
{
var breakpoints = WebInspector.settings.xhrBreakpoints.get();
for (var i = 0; i < breakpoints.length; ++i) {
var breakpoint = breakpoints[i];
if (breakpoint && typeof breakpoint.url === "string")
this._setBreakpoint(breakpoint.url, breakpoint.enabled);
}
},

__proto__: WebInspector.NativeBreakpointsSidebarPane.prototype
}


WebInspector.EventListenerBreakpointsSidebarPane = function()
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Event Listener Breakpoints"));
this.registerRequiredCSS("breakpointsList.css");

this.categoriesElement = document.createElement("ol");
this.categoriesElement.tabIndex = 0;
this.categoriesElement.addStyleClass("properties-tree");
this.categoriesElement.addStyleClass("event-listener-breakpoints");
this.categoriesTreeOutline = new TreeOutline(this.categoriesElement);
this.bodyElement.appendChild(this.categoriesElement);

this._breakpointItems = {};



this._createCategory(WebInspector.UIString("Animation"), false, ["requestAnimationFrame", "cancelAnimationFrame", "animationFrameFired"]);
this._createCategory(WebInspector.UIString("Control"), true, ["resize", "scroll", "zoom", "focus", "blur", "select", "change", "submit", "reset"]);
this._createCategory(WebInspector.UIString("Clipboard"), true, ["copy", "cut", "paste", "beforecopy", "beforecut", "beforepaste"]);
this._createCategory(WebInspector.UIString("DOM Mutation"), true, ["DOMActivate", "DOMFocusIn", "DOMFocusOut", "DOMAttrModified", "DOMCharacterDataModified", "DOMNodeInserted", "DOMNodeInsertedIntoDocument", "DOMNodeRemoved", "DOMNodeRemovedFromDocument", "DOMSubtreeModified", "DOMContentLoaded"]);
this._createCategory(WebInspector.UIString("Device"), true, ["deviceorientation", "devicemotion"]);
this._createCategory(WebInspector.UIString("Keyboard"), true, ["keydown", "keyup", "keypress", "input"]);
this._createCategory(WebInspector.UIString("Load"), true, ["load", "unload", "abort", "error"]);
this._createCategory(WebInspector.UIString("Mouse"), true, ["click", "dblclick", "mousedown", "mouseup", "mouseover", "mousemove", "mouseout", "mousewheel"]);
this._createCategory(WebInspector.UIString("Timer"), false, ["setTimer", "clearTimer", "timerFired"]);
this._createCategory(WebInspector.UIString("Touch"), true, ["touchstart", "touchmove", "touchend", "touchcancel"]);

this._restoreBreakpoints();
}

WebInspector.EventListenerBreakpointsSidebarPane.categotyListener = "listener:";
WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation = "instrumentation:";

WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI = function(eventName)
{
if (!WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI) {
WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI = {
"instrumentation:setTimer": WebInspector.UIString("Set Timer"),
"instrumentation:clearTimer": WebInspector.UIString("Clear Timer"),
"instrumentation:timerFired": WebInspector.UIString("Timer Fired"),
"instrumentation:requestAnimationFrame": WebInspector.UIString("Request Animation Frame"),
"instrumentation:cancelAnimationFrame": WebInspector.UIString("Cancel Animation Frame"),
"instrumentation:animationFrameFired": WebInspector.UIString("Animation Frame Fired")
};
}
return WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI[eventName] || eventName.substring(eventName.indexOf(":") + 1);
}

WebInspector.EventListenerBreakpointsSidebarPane.prototype = {
_createCategory: function(name, isDOMEvent, eventNames)
{
var categoryItem = {};
categoryItem.element = new TreeElement(name);
this.categoriesTreeOutline.appendChild(categoryItem.element);
categoryItem.element.listItemElement.addStyleClass("event-category");
categoryItem.element.selectable = true;

categoryItem.checkbox = this._createCheckbox(categoryItem.element);
categoryItem.checkbox.addEventListener("click", this._categoryCheckboxClicked.bind(this, categoryItem), true);

categoryItem.children = {};
for (var i = 0; i < eventNames.length; ++i) {
var eventName = (isDOMEvent ? WebInspector.EventListenerBreakpointsSidebarPane.categotyListener :  WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation) + eventNames[i];

var breakpointItem = {};
var title = WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName);
breakpointItem.element = new TreeElement(title);
categoryItem.element.appendChild(breakpointItem.element);
var hitMarker = document.createElement("div");
hitMarker.className = "breakpoint-hit-marker";
breakpointItem.element.listItemElement.appendChild(hitMarker);
breakpointItem.element.listItemElement.addStyleClass("source-code");
breakpointItem.element.selectable = true;

breakpointItem.checkbox = this._createCheckbox(breakpointItem.element);
breakpointItem.checkbox.addEventListener("click", this._breakpointCheckboxClicked.bind(this, eventName), true);
breakpointItem.parent = categoryItem;

this._breakpointItems[eventName] = breakpointItem;
categoryItem.children[eventName] = breakpointItem;
}
},

_createCheckbox: function(treeElement)
{
var checkbox = document.createElement("input");
checkbox.className = "checkbox-elem";
checkbox.type = "checkbox";
treeElement.listItemElement.insertBefore(checkbox, treeElement.listItemElement.firstChild);
return checkbox;
},

_categoryCheckboxClicked: function(categoryItem)
{
var checked = categoryItem.checkbox.checked;
for (var eventName in categoryItem.children) {
var breakpointItem = categoryItem.children[eventName];
if (breakpointItem.checkbox.checked === checked)
continue;
if (checked)
this._setBreakpoint(eventName);
else
this._removeBreakpoint(eventName);
}
this._saveBreakpoints();
},

_breakpointCheckboxClicked: function(eventName, event)
{
if (event.target.checked)
this._setBreakpoint(eventName);
else
this._removeBreakpoint(eventName);
this._saveBreakpoints();
},

_setBreakpoint: function(eventName)
{
var breakpointItem = this._breakpointItems[eventName];
if (!breakpointItem)
return;
breakpointItem.checkbox.checked = true;
if (eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categotyListener))
DOMDebuggerAgent.setEventListenerBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categotyListener.length));
else if (eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation))
DOMDebuggerAgent.setInstrumentationBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation.length));
this._updateCategoryCheckbox(breakpointItem.parent);
},

_removeBreakpoint: function(eventName)
{
var breakpointItem = this._breakpointItems[eventName];
if (!breakpointItem)
return;
breakpointItem.checkbox.checked = false;
if (eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categotyListener))
DOMDebuggerAgent.removeEventListenerBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categotyListener.length));
else if (eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation))
DOMDebuggerAgent.removeInstrumentationBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation.length));
this._updateCategoryCheckbox(breakpointItem.parent);
},

_updateCategoryCheckbox: function(categoryItem)
{
var hasEnabled = false, hasDisabled = false;
for (var eventName in categoryItem.children) {
var breakpointItem = categoryItem.children[eventName];
if (breakpointItem.checkbox.checked)
hasEnabled = true;
else
hasDisabled = true;
}
categoryItem.checkbox.checked = hasEnabled;
categoryItem.checkbox.indeterminate = hasEnabled && hasDisabled;
},

highlightBreakpoint: function(eventName)
{
var breakpointItem = this._breakpointItems[eventName];
if (!breakpointItem)
return;
this.expand();
breakpointItem.parent.element.expand();
breakpointItem.element.listItemElement.addStyleClass("breakpoint-hit");
this._highlightedElement = breakpointItem.element.listItemElement;
},

clearBreakpointHighlight: function()
{
if (this._highlightedElement) {
this._highlightedElement.removeStyleClass("breakpoint-hit");
delete this._highlightedElement;
}
},

_saveBreakpoints: function()
{
var breakpoints = [];
for (var eventName in this._breakpointItems) {
if (this._breakpointItems[eventName].checkbox.checked)
breakpoints.push({ eventName: eventName });
}
WebInspector.settings.eventListenerBreakpoints.set(breakpoints);
},

_restoreBreakpoints: function()
{
var breakpoints = WebInspector.settings.eventListenerBreakpoints.get();
for (var i = 0; i < breakpoints.length; ++i) {
var breakpoint = breakpoints[i];
if (breakpoint && typeof breakpoint.eventName === "string")
this._setBreakpoint(breakpoint.eventName);
}
},

__proto__: WebInspector.SidebarPane.prototype
}
;



WebInspector.CallStackSidebarPane = function()
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Call Stack"));
this._model = WebInspector.debuggerModel;

this.bodyElement.addEventListener("keydown", this._keyDown.bind(this), true);
this.bodyElement.tabIndex = 0;
}

WebInspector.CallStackSidebarPane.prototype = {
update: function(callFrames)
{
this.bodyElement.removeChildren();
delete this._statusMessageElement;
this.placards = [];

if (!callFrames) {
var infoElement = document.createElement("div");
infoElement.className = "info";
infoElement.textContent = WebInspector.UIString("Not Paused");
this.bodyElement.appendChild(infoElement);
return;
}

for (var i = 0; i < callFrames.length; ++i) {
var callFrame = callFrames[i];
var placard = new WebInspector.CallStackSidebarPane.Placard(callFrame, this);
placard.element.addEventListener("click", this._placardSelected.bind(this, placard), false);
this.placards.push(placard);
this.bodyElement.appendChild(placard.element);
}
},

setSelectedCallFrame: function(x)
{
for (var i = 0; i < this.placards.length; ++i) {
var placard = this.placards[i];
placard.selected = (placard._callFrame === x);
}
},


_selectNextCallFrameOnStack: function(event)
{
var index = this._selectedCallFrameIndex();
if (index == -1)
return true;
this._selectedPlacardByIndex(index + 1);
return true;
},


_selectPreviousCallFrameOnStack: function(event)
{
var index = this._selectedCallFrameIndex();
if (index == -1)
return true;
this._selectedPlacardByIndex(index - 1);
return true;
},


_selectedPlacardByIndex: function(index)
{
if (index < 0 || index >= this.placards.length)
return;
this._placardSelected(this.placards[index])
},


_selectedCallFrameIndex: function()
{
if (!this._model.selectedCallFrame())
return -1;
for (var i = 0; i < this.placards.length; ++i) {
var placard = this.placards[i];
if (placard._callFrame === this._model.selectedCallFrame())
return i;
}
return -1;
},

_placardSelected: function(placard)
{
this._model.setSelectedCallFrame(placard._callFrame);
},

_copyStackTrace: function()
{
var text = "";
for (var i = 0; i < this.placards.length; ++i)
text += this.placards[i].title + " (" + this.placards[i].subtitle + ")\n";
InspectorFrontendHost.copyText(text);
},


registerShortcuts: function(registerShortcutDelegate)
{
registerShortcutDelegate(WebInspector.ScriptsPanelDescriptor.ShortcutKeys.NextCallFrame, this._selectNextCallFrameOnStack.bind(this));
registerShortcutDelegate(WebInspector.ScriptsPanelDescriptor.ShortcutKeys.PrevCallFrame, this._selectPreviousCallFrameOnStack.bind(this));
},

setStatus: function(status)
{
if (!this._statusMessageElement) {
this._statusMessageElement = document.createElement("div");
this._statusMessageElement.className = "info";
this.bodyElement.appendChild(this._statusMessageElement);
}
if (typeof status === "string")
this._statusMessageElement.textContent = status;
else {
this._statusMessageElement.removeChildren();
this._statusMessageElement.appendChild(status);
}
},

_keyDown: function(event)
{
if (event.altKey || event.shiftKey || event.metaKey || event.ctrlKey)
return;

if (event.keyIdentifier === "Up") {
this._selectPreviousCallFrameOnStack();
event.consume();
} else if (event.keyIdentifier === "Down") {
this._selectNextCallFrameOnStack();
event.consume();
}
},

__proto__: WebInspector.SidebarPane.prototype
}


WebInspector.CallStackSidebarPane.Placard = function(callFrame, pane)
{
WebInspector.Placard.call(this, callFrame.functionName || WebInspector.UIString("(anonymous function)"), "");
callFrame.createLiveLocation(this._update.bind(this));
this.element.addEventListener("contextmenu", this._placardContextMenu.bind(this), true);
this._callFrame = callFrame;
this._pane = pane;
}

WebInspector.CallStackSidebarPane.Placard.prototype = {
_update: function(uiLocation)
{
this.subtitle = uiLocation.linkText().trimMiddle(100);
},

_placardContextMenu: function(event)
{
var contextMenu = new WebInspector.ContextMenu(event);

if (WebInspector.debuggerModel.canSetScriptSource()) {
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Restart frame" : "Restart Frame"), this._restartFrame.bind(this));
contextMenu.appendSeparator();
}
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy stack trace" : "Copy Stack Trace"), this._pane._copyStackTrace.bind(this._pane));

contextMenu.show();
},

_restartFrame: function()
{
this._callFrame.restart(undefined);
},

__proto__: WebInspector.Placard.prototype
}
;



WebInspector.FilteredItemSelectionDialog = function(delegate)
{
WebInspector.DialogDelegate.call(this);

var xhr = new XMLHttpRequest();
xhr.open("GET", "filteredItemSelectionDialog.css", false);
xhr.send(null);

this.element = document.createElement("div");
this.element.className = "filtered-item-list-dialog";
this.element.addEventListener("keydown", this._onKeyDown.bind(this), false);
var styleElement = this.element.createChild("style");
styleElement.type = "text/css";
styleElement.textContent = xhr.responseText;

this._promptElement = this.element.createChild("input", "monospace");
this._promptElement.type = "text";
this._promptElement.setAttribute("spellcheck", "false");

this._progressElement = this.element.createChild("div", "progress");

this._filteredItems = [];
this._viewportControl = new WebInspector.ViewportControl(this);
this._itemElementsContainer = this._viewportControl.element;
this._itemElementsContainer.addStyleClass("container");
this._itemElementsContainer.addStyleClass("monospace");
this._itemElementsContainer.addEventListener("click", this._onClick.bind(this), false);
this.element.appendChild(this._itemElementsContainer);

this._delegate = delegate;
this._delegate.requestItems(this._itemsLoaded.bind(this));
}

WebInspector.FilteredItemSelectionDialog.prototype = {

position: function(element, relativeToElement)
{
const minWidth = 500;
const minHeight = 204;
var width = Math.max(relativeToElement.offsetWidth * 2 / 3, minWidth);
var height = Math.max(relativeToElement.offsetHeight * 2 / 3, minHeight);

this.element.style.width = width + "px";
this.element.style.height = height + "px";

const shadowPadding = 20; 
element.positionAt(
relativeToElement.totalOffsetLeft() + Math.max((relativeToElement.offsetWidth - width - 2 * shadowPadding) / 2, shadowPadding),
relativeToElement.totalOffsetTop() + Math.max((relativeToElement.offsetHeight - height - 2 * shadowPadding) / 2, shadowPadding));
},

focus: function()
{
WebInspector.setCurrentFocusElement(this._promptElement);
if (this._filteredItems.length && this._viewportControl.lastVisibleIndex() === -1)
this._viewportControl.refresh();
},

willHide: function()
{
if (this._isHiding)
return;
this._isHiding = true;
this._delegate.dispose();
if (this._filterTimer)
clearTimeout(this._filterTimer);
},

renderAsTwoRows: function()
{
this._renderAsTwoRows = true;
},

onEnter: function()
{
if (!this._delegate.itemsCount())
return;
this._delegate.selectItem(this._filteredItems[this._selectedIndexInFiltered], this._promptElement.value.trim());
},


_itemsLoaded: function(loadedCount, totalCount)
{
this._loadedCount = loadedCount;
this._totalCount = totalCount;

if (this._loadTimeout)
return;
this._loadTimeout = setTimeout(this._updateAfterItemsLoaded.bind(this), 100);
},

_updateAfterItemsLoaded: function()
{
delete this._loadTimeout;
this._filterItems();
if (this._loadedCount === this._totalCount)
this._progressElement.style.backgroundImage = "";
else {
const color = "rgb(66, 129, 235)";
const percent = ((this._loadedCount / this._totalCount) * 100) + "%";
this._progressElement.style.backgroundImage = "-webkit-linear-gradient(left, " + color + ", " + color + " " + percent + ",  transparent " + percent + ")";
}
},


_createItemElement: function(index)
{
var itemElement = document.createElement("div");
itemElement.className = "filtered-item-list-dialog-item " + (this._renderAsTwoRows ? "two-rows" : "one-row");
itemElement._titleElement = itemElement.createChild("span");
itemElement._titleElement.textContent = this._delegate.itemTitleAt(index);
itemElement._titleSuffixElement = itemElement.createChild("span");
itemElement._titleSuffixElement.textContent = this._delegate.itemSuffixAt(index);
itemElement._subtitleElement = itemElement.createChild("div", "filtered-item-list-dialog-subtitle");
itemElement._subtitleElement.textContent = this._delegate.itemSubtitleAt(index) || "\u200B";
itemElement._index = index;

var key = this._delegate.itemKeyAt(index);
var ranges = [];
var match;
if (this._query) {
var regex = this._createSearchRegex(this._query, true);
while ((match = regex.exec(key)) !== null && match[0])
ranges.push({ offset: match.index, length: regex.lastIndex - match.index });
if (ranges.length)
WebInspector.highlightRangesWithStyleClass(itemElement, ranges, "highlight");
}
if (index === this._filteredItems[this._selectedIndexInFiltered])
itemElement.addStyleClass("selected");

return itemElement;
},


_createSearchRegex: function(query, isGlobal)
{
const toEscape = String.regexSpecialCharacters();
var regexString = "";
for (var i = 0; i < query.length; ++i) {
var c = query.charAt(i);
if (toEscape.indexOf(c) !== -1)
c = "\\" + c;
if (i)
regexString += "[^" + c + "]*";
regexString += c;
}
return new RegExp(regexString, "i" + (isGlobal ? "g" : ""));
},


_createScoringRegex: function(query, ignoreCase, camelCase)
{
if (!camelCase || (camelCase && ignoreCase))
query = query.toUpperCase();
var regexString = "";
for (var i = 0; i < query.length; ++i) {
var c = query.charAt(i);
if (c < "A" || c > "Z")
continue;
if (regexString)
regexString += camelCase ? "[^A-Z]*" : "[^-_ .]*[-_ .]";
regexString += c;
}
if (!camelCase)
regexString = "(?:^|[-_ .])" + regexString;
return new RegExp(regexString, camelCase ? "" : "i");
},


setQuery: function(query)
{
this._promptElement.value = query;
this._scheduleFilter();
},

_filterItems: function()
{
delete this._filterTimer;

var query = this._delegate.rewriteQuery(this._promptElement.value.trim());
this._query = query;

var ignoreCase = (query === query.toLowerCase());

var filterRegex = query ? this._createSearchRegex(query) : null;
var camelCaseScoringRegex = query ? this._createScoringRegex(query, ignoreCase, true) : null;
var underscoreScoringRegex = query ? this._createScoringRegex(query, ignoreCase, false) : null;

var oldSelectedAbsoluteIndex = this._selectedIndexInFiltered ? this._filteredItems[this._selectedIndexInFiltered] : null;
this._filteredItems = [];
this._selectedIndexInFiltered = 0;

var cachedKeys = new Array(this._delegate.itemsCount());
var scores = query ? new Array(this._delegate.itemsCount()) : null;

for (var i = 0; i < this._delegate.itemsCount(); ++i) {
var key = this._delegate.itemKeyAt(i);
if (filterRegex && !filterRegex.test(key))
continue;
cachedKeys[i] = key;
this._filteredItems.push(i);

if (!filterRegex)
continue;

var score = 0;
if (underscoreScoringRegex.test(key))
score += 10;
if (camelCaseScoringRegex.test(key))
score += ignoreCase ? 10 : 20;
for (var j = 0; j < key.length && j < query.length; ++j) {
if (key[j] === query[j])
score++;
if (key[j].toUpperCase() === query[j].toUpperCase())
score++;
else
break;
}
scores[i] = score;
}

function compareFunction(index1, index2)
{
if (scores) {
var score1 = scores[index1];
var score2 = scores[index2];
if (score1 > score2)
return -1;
if (score1 < score2)
return 1;
}
var key1 = cachedKeys[index1];
var key2 = cachedKeys[index2];
return key1.compareTo(key2) || (index2 - index1);
}

const numberOfItemsToSort = 100;
if (this._filteredItems.length > numberOfItemsToSort)
this._filteredItems.sortRange(compareFunction.bind(this), 0, this._filteredItems.length - 1, numberOfItemsToSort);
else
this._filteredItems.sort(compareFunction.bind(this));

for (var i = 0; i < this._filteredItems.length; ++i) {
if (this._filteredItems[i] === oldSelectedAbsoluteIndex) {
this._selectedIndexInFiltered = i;
break;
}
}
this._viewportControl.refresh();
this._updateSelection(this._selectedIndexInFiltered, false);
},

_onKeyDown: function(event)
{
var newSelectedIndex = this._selectedIndexInFiltered;

switch (event.keyCode) {
case WebInspector.KeyboardShortcut.Keys.Down.code:
if (++newSelectedIndex >= this._filteredItems.length)
newSelectedIndex = this._filteredItems.length - 1;
this._updateSelection(newSelectedIndex, true);
event.consume(true);
break;
case WebInspector.KeyboardShortcut.Keys.Up.code:
if (--newSelectedIndex < 0)
newSelectedIndex = 0;
this._updateSelection(newSelectedIndex, false);
event.consume(true);
break;
case WebInspector.KeyboardShortcut.Keys.PageDown.code:
newSelectedIndex = Math.min(newSelectedIndex + this._viewportControl.rowsPerViewport(), this._filteredItems.length - 1);
this._updateSelection(newSelectedIndex, true);
event.consume(true);
break;
case WebInspector.KeyboardShortcut.Keys.PageUp.code:
newSelectedIndex = Math.max(newSelectedIndex - this._viewportControl.rowsPerViewport(), 0);
this._updateSelection(newSelectedIndex, false);
event.consume(true);
break;
default:
if (event.keyIdentifier !== "Shift" && event.keyIdentifier !== "Ctrl" && event.keyIdentifier !== "Meta" && event.keyIdentifier !== "Left" && event.keyIdentifier !== "Right")
this._scheduleFilter();
}
},

_scheduleFilter: function()
{
if (this._filterTimer)
return;
this._filterTimer = setTimeout(this._filterItems.bind(this), 0);
},


_updateSelection: function(index, makeLast)
{ 
var element = this._viewportControl.renderedElementAt(this._selectedIndexInFiltered);
if (element)
element.removeStyleClass("selected");
this._viewportControl.scrollItemIntoView(index, makeLast);
this._selectedIndexInFiltered = index;
element = this._viewportControl.renderedElementAt(index);
if (element)
element.addStyleClass("selected");
},

_onClick: function(event)
{
var itemElement = event.target.enclosingNodeOrSelfWithClass("filtered-item-list-dialog-item");
if (!itemElement)
return;
this._delegate.selectItem(itemElement._index, this._promptElement.value.trim());
WebInspector.Dialog.hide();
},


itemCount: function()
{
return this._filteredItems.length;
},


itemElement: function(index)
{
var delegateIndex = this._filteredItems[index];
var element = this._createItemElement(delegateIndex);
element._filteredIndex = index;
return element;
},

__proto__: WebInspector.DialogDelegate.prototype
}


WebInspector.SelectionDialogContentProvider = function()
{
}

WebInspector.SelectionDialogContentProvider.prototype = {

itemTitleAt: function(itemIndex) { },


itemSuffixAt: function(itemIndex) { },


itemSubtitleAt: function(itemIndex) { },


itemKeyAt: function(itemIndex) { },


itemsCount: function() { },


requestItems: function(callback) { },


selectItem: function(itemIndex, promptValue) { },


rewriteQuery: function(query) { },

dispose: function() { }
}


WebInspector.JavaScriptOutlineDialog = function(view, contentProvider)
{
WebInspector.SelectionDialogContentProvider.call(this);

this._functionItems = [];
this._view = view;
this._contentProvider = contentProvider;
}


WebInspector.JavaScriptOutlineDialog.show = function(view, contentProvider)
{
if (WebInspector.Dialog.currentInstance())
return null;
var delegate = new WebInspector.JavaScriptOutlineDialog(view, contentProvider);
var filteredItemSelectionDialog = new WebInspector.FilteredItemSelectionDialog(delegate);
WebInspector.Dialog.show(view.element, filteredItemSelectionDialog);
}

WebInspector.JavaScriptOutlineDialog.prototype = {

itemTitleAt: function(itemIndex)
{
var functionItem = this._functionItems[itemIndex];
return functionItem.name + (functionItem.arguments ? functionItem.arguments : "");
},


itemSuffixAt: function(itemIndex)
{
return "";
},


itemSubtitleAt: function(itemIndex)
{
return ":" + (this._functionItems[itemIndex].line + 1);
},


itemKeyAt: function(itemIndex)
{
return this._functionItems[itemIndex].name;
},


itemsCount: function()
{
return this._functionItems.length;
},


requestItems: function(callback)
{

function contentCallback(content, contentEncoded, mimeType)
{
if (this._outlineWorker)
this._outlineWorker.terminate();
this._outlineWorker = new Worker("ScriptFormatterWorker.js");
this._outlineWorker.onmessage = this._didBuildOutlineChunk.bind(this, callback);
const method = "outline";
this._outlineWorker.postMessage({ method: method, params: { content: content } });
}
this._contentProvider.requestContent(contentCallback.bind(this));
},

_didBuildOutlineChunk: function(callback, event)
{
var data = event.data;
var chunk = data["chunk"];
for (var i = 0; i < chunk.length; ++i)
this._functionItems.push(chunk[i]);
callback(data.index, data.total);

if (data.total === data.index && this._outlineWorker) {
this._outlineWorker.terminate();
delete this._outlineWorker;
}
},


selectItem: function(itemIndex, promptValue)
{
var lineNumber = this._functionItems[itemIndex].line;
if (!isNaN(lineNumber) && lineNumber >= 0)
this._view.highlightLine(lineNumber);
this._view.focus();
},


rewriteQuery: function(query)
{
return query;
},

dispose: function()
{
}
}


WebInspector.SelectUISourceCodeDialog = function()
{
var projects = WebInspector.workspace.projects().filter(this.filterProject.bind(this));
this._uiSourceCodes = [];
for (var i = 0; i < projects.length; ++i)
this._uiSourceCodes = this._uiSourceCodes.concat(projects[i].uiSourceCodes().filter(this.filterUISourceCode.bind(this)));
WebInspector.workspace.addEventListener(WebInspector.UISourceCodeProvider.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
}

WebInspector.SelectUISourceCodeDialog.prototype = {

uiSourceCodeSelected: function(uiSourceCode, lineNumber)
{

},


filterProject: function(project)
{
return true;

},


filterUISourceCode: function(uiSourceCode)
{
return uiSourceCode.name();
},


itemTitleAt: function(itemIndex)
{
return this._uiSourceCodes[itemIndex].name().trimEnd(100);
},


itemSuffixAt: function(itemIndex)
{
return this._queryLineNumber || "";
},


itemSubtitleAt: function(itemIndex)
{
var uiSourceCode = this._uiSourceCodes[itemIndex]
var projectName = uiSourceCode.project().displayName();
var path = uiSourceCode.path().slice();
path.pop();
path.unshift(projectName);
return path.join("/");
},


itemKeyAt: function(itemIndex)
{
return this._uiSourceCodes[itemIndex].name();
},


itemsCount: function()
{
return this._uiSourceCodes.length;
},


requestItems: function(callback)
{
this._itemsLoaded = callback;
this._itemsLoaded(1, 1);
},


selectItem: function(itemIndex, promptValue)
{
var lineNumberMatch = promptValue.match(/[^:]+\:([\d]*)$/);
var lineNumber = lineNumberMatch ? Math.max(parseInt(lineNumberMatch[1], 10) - 1, 0) : 0;
this.uiSourceCodeSelected(this._uiSourceCodes[itemIndex], lineNumber);
},


rewriteQuery: function(query)
{
if (!query)
return query;
query = query.trim();
var lineNumberMatch = query.match(/([^:]+)(\:[\d]*)$/);
this._queryLineNumber = lineNumberMatch ? lineNumberMatch[2] : "";
return lineNumberMatch ? lineNumberMatch[1] : query;
},


_uiSourceCodeAdded: function(event)
{
var uiSourceCode =   (event.data);
if (!this.filterUISourceCode(uiSourceCode))
return;
this._uiSourceCodes.push(uiSourceCode)
this._itemsLoaded(1, 1);
},

dispose: function()
{
WebInspector.workspace.removeEventListener(WebInspector.UISourceCodeProvider.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
}
}


WebInspector.OpenResourceDialog = function(panel)
{
WebInspector.SelectUISourceCodeDialog.call(this);
this._panel = panel;
}

WebInspector.OpenResourceDialog.prototype = {


uiSourceCodeSelected: function(uiSourceCode, lineNumber)
{
this._panel.showUISourceCode(uiSourceCode, lineNumber);
},


filterProject: function(project)
{
return !project.isServiceProject();
},

__proto__: WebInspector.SelectUISourceCodeDialog.prototype
}


WebInspector.OpenResourceDialog.show = function(panel, relativeToElement)
{
if (WebInspector.Dialog.currentInstance())
return;

var filteredItemSelectionDialog = new WebInspector.FilteredItemSelectionDialog(new WebInspector.OpenResourceDialog(panel));
filteredItemSelectionDialog.renderAsTwoRows();
WebInspector.Dialog.show(relativeToElement, filteredItemSelectionDialog);
}


WebInspector.SelectUISourceCodeForProjectTypeDialog = function(type, callback)
{
this._type = type;
WebInspector.SelectUISourceCodeDialog.call(this);
this._callback = callback;
}

WebInspector.SelectUISourceCodeForProjectTypeDialog.prototype = {

uiSourceCodeSelected: function(uiSourceCode, lineNumber)
{
this._callback(uiSourceCode);
},


filterProject: function(project)
{
return project.type() === this._type;
},

__proto__: WebInspector.SelectUISourceCodeDialog.prototype
}


WebInspector.SelectUISourceCodeForProjectTypeDialog.show = function(name, type, callback, relativeToElement)
{
if (WebInspector.Dialog.currentInstance())
return;

var filteredItemSelectionDialog = new WebInspector.FilteredItemSelectionDialog(new WebInspector.SelectUISourceCodeForProjectTypeDialog(type, callback));
filteredItemSelectionDialog.setQuery(name);
filteredItemSelectionDialog.renderAsTwoRows();
WebInspector.Dialog.show(relativeToElement, filteredItemSelectionDialog);
}
;



WebInspector.UISourceCodeFrame = function(uiSourceCode)
{
this._uiSourceCode = uiSourceCode;
WebInspector.SourceFrame.call(this, this._uiSourceCode);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.FormattedChanged, this._onFormattedChanged, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
}

WebInspector.UISourceCodeFrame.prototype = {
wasShown: function()
{
WebInspector.SourceFrame.prototype.wasShown.call(this);
this._boundWindowFocused = this._windowFocused.bind(this);
window.addEventListener("focus", this._boundWindowFocused, false);
this._checkContentUpdated();
},

willHide: function()
{
WebInspector.SourceFrame.prototype.willHide.call(this);
window.removeEventListener("focus", this._boundWindowFocused, false);
delete this._boundWindowFocused;
},


canEditSource: function()
{
return this._uiSourceCode.isEditable();
},

_windowFocused: function(event)
{
this._checkContentUpdated();
},

_checkContentUpdated: function()
{
if (!this.loaded || !this.isShowing())
return;
this._uiSourceCode.checkContentUpdated();
},


commitEditing: function(text)
{
if (!this._uiSourceCode.isDirty())
return;

this._isCommittingEditing = true;
this._uiSourceCode.commitWorkingCopy(this._didEditContent.bind(this));
delete this._isCommittingEditing;
},

onTextChanged: function(oldRange, newRange)
{
WebInspector.SourceFrame.prototype.onTextChanged.call(this, oldRange, newRange);
this._isSettingWorkingCopy = true;
this._uiSourceCode.setWorkingCopy(this._textEditor.text());
delete this._isSettingWorkingCopy;
},

_didEditContent: function(error)
{
if (error) {
WebInspector.log(error, WebInspector.ConsoleMessage.MessageLevel.Error, true);
return;
}
},


_onFormattedChanged: function(event)
{
var content =   (event.data.content);
this._textEditor.setReadOnly(this._uiSourceCode.formatted());
this.setContent(content, false, this._uiSourceCode.mimeType());
},


_onWorkingCopyChanged: function(event)
{
this._innerSetContent(this._uiSourceCode.workingCopy());
},


_onWorkingCopyCommitted: function(event)
{
this._innerSetContent(this._uiSourceCode.workingCopy());
},


onUISourceCodeContentChanged: function(content)
{
this.setContent(content, false, this._uiSourceCode.mimeType());
},


_innerSetContent: function(content)
{
if (this._isSettingWorkingCopy || this._isCommittingEditing)
return;
this.onUISourceCodeContentChanged(content);
},

populateTextAreaContextMenu: function(contextMenu, lineNumber)
{
WebInspector.SourceFrame.prototype.populateTextAreaContextMenu.call(this, contextMenu, lineNumber);
contextMenu.appendApplicableItems(this._uiSourceCode);
contextMenu.appendSeparator();
},

dispose: function()
{
this.detach();
},

__proto__: WebInspector.SourceFrame.prototype
}
;



WebInspector.JavaScriptSourceFrame = function(scriptsPanel, uiSourceCode)
{
this._scriptsPanel = scriptsPanel;
this._breakpointManager = WebInspector.breakpointManager;
this._uiSourceCode = uiSourceCode;

WebInspector.UISourceCodeFrame.call(this, uiSourceCode);
if (uiSourceCode.project().type() === WebInspector.projectTypes.Debugger)
this.element.addStyleClass("source-frame-debugger-script");

this._popoverHelper = new WebInspector.ObjectPopoverHelper(this.textEditor.element,
this._getPopoverAnchor.bind(this), this._resolveObjectForPopover.bind(this), this._onHidePopover.bind(this), true);

this.textEditor.element.addEventListener("keydown", this._onKeyDown.bind(this), true);

this.textEditor.addEventListener(WebInspector.TextEditor.Events.GutterClick, this._handleGutterClick.bind(this), this);

this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointAdded, this._breakpointAdded, this);
this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointRemoved, this._breakpointRemoved, this);

this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.ConsoleMessageAdded, this._consoleMessageAdded, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.ConsoleMessageRemoved, this._consoleMessageRemoved, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.ConsoleMessagesCleared, this._consoleMessagesCleared, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.SourceMappingChanged, this._onSourceMappingChanged, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);

this._updateScriptFile();
}

WebInspector.JavaScriptSourceFrame.prototype = {

wasShown: function()
{
WebInspector.UISourceCodeFrame.prototype.wasShown.call(this);
},

willHide: function()
{
WebInspector.UISourceCodeFrame.prototype.willHide.call(this);
this._popoverHelper.hidePopover();
},


onUISourceCodeContentChanged: function(content, contentEncoded, mimeType)
{
this._removeAllBreakpoints();
WebInspector.UISourceCodeFrame.prototype.onUISourceCodeContentChanged.call(this, content);
},

populateLineGutterContextMenu: function(contextMenu, lineNumber)
{
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Continue to here" : "Continue to Here"), this._continueToLine.bind(this, lineNumber));

var breakpoint = this._breakpointManager.findBreakpoint(this._uiSourceCode, lineNumber);
if (!breakpoint) {

contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add breakpoint" : "Add Breakpoint"), this._setBreakpoint.bind(this, lineNumber, "", true));
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add conditional breakpoint…" : "Add Conditional Breakpoint…"), this._editBreakpointCondition.bind(this, lineNumber));
} else {

contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove breakpoint" : "Remove Breakpoint"), breakpoint.remove.bind(breakpoint));
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Edit breakpoint…" : "Edit Breakpoint…"), this._editBreakpointCondition.bind(this, lineNumber, breakpoint));
if (breakpoint.enabled())
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Disable breakpoint" : "Disable Breakpoint"), breakpoint.setEnabled.bind(breakpoint, false));
else
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Enable breakpoint" : "Enable Breakpoint"), breakpoint.setEnabled.bind(breakpoint, true));
}
},

populateTextAreaContextMenu: function(contextMenu, lineNumber)
{
var selection = window.getSelection();
if (selection.type === "Range" && !selection.isCollapsed) {
var addToWatchLabel = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add to watch" : "Add to Watch");
contextMenu.appendItem(addToWatchLabel, this._scriptsPanel.addToWatch.bind(this._scriptsPanel, selection.toString()));
var evaluateLabel = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Evaluate in console" : "Evaluate in Console");
contextMenu.appendItem(evaluateLabel, WebInspector.evaluateInConsole.bind(WebInspector, selection.toString()));
contextMenu.appendSeparator();
} else if (!this._uiSourceCode.isEditable() && this._uiSourceCode.contentType() === WebInspector.resourceTypes.Script) {
function liveEdit(event)
{
var liveEditUISourceCode = WebInspector.liveEditSupport.uiSourceCodeForLiveEdit(this._uiSourceCode);
this._scriptsPanel.showUISourceCode(liveEditUISourceCode, lineNumber)
}



var liveEditLabel = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Live edit" : "Live Edit");
contextMenu.appendItem(liveEditLabel, liveEdit.bind(this));
contextMenu.appendSeparator();
}
WebInspector.UISourceCodeFrame.prototype.populateTextAreaContextMenu.call(this, contextMenu, lineNumber);
},

_workingCopyChanged: function(event)
{
if (this._supportsEnabledBreakpointsWhileEditing() || this._scriptFile)
return;

if (this._uiSourceCode.isDirty())
this._muteBreakpointsWhileEditing();
else
this._restoreBreakpointsAfterEditing();
},

_workingCopyCommitted: function(event)
{
if (this._supportsEnabledBreakpointsWhileEditing() || this._scriptFile)
return;
this._restoreBreakpointsAfterEditing();
},

_didMergeToVM: function()
{
if (this._supportsEnabledBreakpointsWhileEditing())
return;
this._restoreBreakpointsAfterEditing();
},

_didDivergeFromVM: function()
{
if (this._supportsEnabledBreakpointsWhileEditing())
return;
this._muteBreakpointsWhileEditing();
},

_muteBreakpointsWhileEditing: function()
{
if (this._muted)
return;
for (var lineNumber = 0; lineNumber < this._textEditor.linesCount; ++lineNumber) {
var breakpointDecoration = this._textEditor.getAttribute(lineNumber, "breakpoint");
if (!breakpointDecoration)
continue;
this._removeBreakpointDecoration(lineNumber);
this._addBreakpointDecoration(lineNumber, breakpointDecoration.condition, breakpointDecoration.enabled, true);
}
this._muted = true;
},

_supportsEnabledBreakpointsWhileEditing: function()
{
return this._uiSourceCode.project().type() === WebInspector.projectTypes.Snippets;
},

_restoreBreakpointsAfterEditing: function()
{
delete this._muted;
var breakpoints = {};

for (var lineNumber = 0; lineNumber < this._textEditor.linesCount; ++lineNumber) {
var breakpointDecoration = this._textEditor.getAttribute(lineNumber, "breakpoint");
if (breakpointDecoration) {
breakpoints[lineNumber] = breakpointDecoration;
this._removeBreakpointDecoration(lineNumber);
}
}


this._removeAllBreakpoints();


for (var lineNumberString in breakpoints) {
var lineNumber = parseInt(lineNumberString, 10);
if (isNaN(lineNumber))
continue;
var breakpointDecoration = breakpoints[lineNumberString];
this._setBreakpoint(lineNumber, breakpointDecoration.condition, breakpointDecoration.enabled);
}
},

_removeAllBreakpoints: function()
{
var breakpoints = this._breakpointManager.breakpointsForUISourceCode(this._uiSourceCode);
for (var i = 0; i < breakpoints.length; ++i)
breakpoints[i].remove();
},

_getPopoverAnchor: function(element, event)
{
if (!WebInspector.debuggerModel.isPaused())
return null;
if (window.getSelection().type === "Range")
return null;

var textPosition = this.textEditor.coordinatesToCursorPosition(event.x, event.y);
if (!textPosition)
return null;

var token = this.textEditor.tokenAtTextPosition(textPosition.startLine, textPosition.startColumn);
if (!token)
return null;
var lineNumber = textPosition.startLine;
var line = this.textEditor.line(lineNumber);
var tokenContent = line.substring(token.startColumn, token.endColumn + 1);
if (token.type !== "javascript-ident" && (token.type !== "javascript-keyword" || tokenContent !== "this"))
return null;

var leftCorner = this.textEditor.cursorPositionToCoordinates(lineNumber, token.startColumn);
var rightCorner = this.textEditor.cursorPositionToCoordinates(lineNumber, token.endColumn + 1);
var anchorBox = new AnchorBox(leftCorner.x, leftCorner.y, rightCorner.x - leftCorner.x, leftCorner.height);

anchorBox.token = token;
anchorBox.lineNumber = lineNumber;

return anchorBox;
},

_resolveObjectForPopover: function(anchorBox, showCallback, objectGroupName)
{

function showObjectPopover(result, wasThrown)
{
if (!WebInspector.debuggerModel.isPaused()) {
this._popoverHelper.hidePopover();
return;
}
this._popoverAnchorBox = anchorBox;
showCallback(WebInspector.RemoteObject.fromPayload(result), wasThrown, this._popoverAnchorBox);

if (this._popoverAnchorBox) {
var highlightRange = new WebInspector.TextRange(anchorBox.lineNumber, startHighlight, anchorBox.lineNumber, endHighlight);
this._popoverAnchorBox._highlightDescriptor = this.textEditor.highlightRange(highlightRange, "source-frame-eval-expression");
}
}

if (!WebInspector.debuggerModel.isPaused()) {
this._popoverHelper.hidePopover();
return;
}

var startHighlight = anchorBox.token.startColumn;
var endHighlight = anchorBox.token.endColumn;
var line = this.textEditor.line(anchorBox.lineNumber);
while (startHighlight > 1 && line.charAt(startHighlight - 1) === '.')
startHighlight = this.textEditor.tokenAtTextPosition(anchorBox.lineNumber, startHighlight - 2).startColumn;
var evaluationText = line.substring(startHighlight, endHighlight + 1);

var selectedCallFrame = WebInspector.debuggerModel.selectedCallFrame();
selectedCallFrame.evaluate(evaluationText, objectGroupName, false, true, false, false, showObjectPopover.bind(this));
},

_onHidePopover: function()
{
if (!this._popoverAnchorBox)
return;
if (this._popoverAnchorBox._highlightDescriptor)
this.textEditor.removeHighlight(this._popoverAnchorBox._highlightDescriptor);
delete this._popoverAnchorBox;
},


_addBreakpointDecoration: function(lineNumber, condition, enabled, mutedWhileEditing)
{
var breakpoint = {
condition: condition,
enabled: enabled
};

this.textEditor.setAttribute(lineNumber, "breakpoint", breakpoint);

var disabled = !enabled || mutedWhileEditing;
this.textEditor.addBreakpoint(lineNumber, disabled, !!condition);
},

_removeBreakpointDecoration: function(lineNumber)
{
this.textEditor.removeAttribute(lineNumber, "breakpoint");
this.textEditor.removeBreakpoint(lineNumber);
},

_onKeyDown: function(event)
{
if (event.keyIdentifier === "U+001B") { 
if (this._popoverHelper.isPopoverVisible()) {
this._popoverHelper.hidePopover();
event.consume();
}
}
},


_editBreakpointCondition: function(lineNumber, breakpoint)
{
this._conditionElement = this._createConditionElement(lineNumber);
this.textEditor.addDecoration(lineNumber, this._conditionElement);

function finishEditing(committed, element, newText)
{
this.textEditor.removeDecoration(lineNumber, this._conditionElement);
delete this._conditionEditorElement;
delete this._conditionElement;
if (breakpoint)
breakpoint.setCondition(newText);
else
this._setBreakpoint(lineNumber, newText, true);
}

var config = new WebInspector.EditingConfig(finishEditing.bind(this, true), finishEditing.bind(this, false));
WebInspector.startEditing(this._conditionEditorElement, config);
this._conditionEditorElement.value = breakpoint ? breakpoint.condition() : "";
this._conditionEditorElement.select();
},

_createConditionElement: function(lineNumber)
{
var conditionElement = document.createElement("div");
conditionElement.className = "source-frame-breakpoint-condition";

var labelElement = document.createElement("label");
labelElement.className = "source-frame-breakpoint-message";
labelElement.htmlFor = "source-frame-breakpoint-condition";
labelElement.appendChild(document.createTextNode(WebInspector.UIString("The breakpoint on line %d will stop only if this expression is true:", lineNumber)));
conditionElement.appendChild(labelElement);

var editorElement = document.createElement("input");
editorElement.id = "source-frame-breakpoint-condition";
editorElement.className = "monospace";
editorElement.type = "text";
conditionElement.appendChild(editorElement);
this._conditionEditorElement = editorElement;

return conditionElement;
},


setExecutionLine: function(lineNumber)
{
this._executionLineNumber = lineNumber;
if (this.loaded) {
this.textEditor.setExecutionLine(lineNumber);
this.revealLine(this._executionLineNumber);
if (this.canEditSource())
this.setSelection(WebInspector.TextRange.createFromLocation(lineNumber, 0));
}
},

clearExecutionLine: function()
{
if (this.loaded && typeof this._executionLineNumber === "number")
this.textEditor.clearExecutionLine();
delete this._executionLineNumber;
},

_lineNumberAfterEditing: function(lineNumber, oldRange, newRange)
{
var shiftOffset = lineNumber <= oldRange.startLine ? 0 : newRange.linesCount - oldRange.linesCount;


if (lineNumber === oldRange.startLine) {
var whiteSpacesRegex = /^[\s\xA0]*$/;
for (var i = 0; lineNumber + i <= newRange.endLine; ++i) {
if (!whiteSpacesRegex.test(this.textEditor.line(lineNumber + i))) {
shiftOffset = i;
break;
}
}
}

var newLineNumber = Math.max(0, lineNumber + shiftOffset);
if (oldRange.startLine < lineNumber && lineNumber < oldRange.endLine)
newLineNumber = oldRange.startLine;
return newLineNumber;
},


_shouldIgnoreExternalBreakpointEvents: function()
{
if (this._supportsEnabledBreakpointsWhileEditing())
return false;
if (this._muted)
return true;
return this._scriptFile && (this._scriptFile.isDivergingFromVM() || this._scriptFile.isMergingToVM());
},

_breakpointAdded: function(event)
{
var uiLocation =   (event.data.uiLocation);
if (uiLocation.uiSourceCode !== this._uiSourceCode)
return;
if (this._shouldIgnoreExternalBreakpointEvents())
return;

var breakpoint =   (event.data.breakpoint);
if (this.loaded)
this._addBreakpointDecoration(uiLocation.lineNumber, breakpoint.condition(), breakpoint.enabled(), false);
},

_breakpointRemoved: function(event)
{
var uiLocation =   (event.data.uiLocation);
if (uiLocation.uiSourceCode !== this._uiSourceCode)
return;
if (this._shouldIgnoreExternalBreakpointEvents())
return;

var breakpoint =   (event.data.breakpoint);
var remainingBreakpoint = this._breakpointManager.findBreakpoint(this._uiSourceCode, uiLocation.lineNumber);
if (!remainingBreakpoint && this.loaded)
this._removeBreakpointDecoration(uiLocation.lineNumber);
},

_consoleMessageAdded: function(event)
{
var message =   (event.data);
if (this.loaded)
this.addMessageToSource(message.lineNumber, message.originalMessage);
},

_consoleMessageRemoved: function(event)
{
var message =   (event.data);
if (this.loaded)
this.removeMessageFromSource(message.lineNumber, message.originalMessage);
},

_consoleMessagesCleared: function(event)
{
this.clearMessages();
},


_onSourceMappingChanged: function(event)
{
this._updateScriptFile();
},

_updateScriptFile: function()
{
if (this._scriptFile) {
this._scriptFile.removeEventListener(WebInspector.ScriptFile.Events.DidMergeToVM, this._didMergeToVM, this);
this._scriptFile.removeEventListener(WebInspector.ScriptFile.Events.DidDivergeFromVM, this._didDivergeFromVM, this);
if (this._muted && !this._uiSourceCode.isDirty())
this._restoreBreakpointsAfterEditing();
}
this._scriptFile = this._uiSourceCode.scriptFile();
if (this._scriptFile) {
this._scriptFile.addEventListener(WebInspector.ScriptFile.Events.DidMergeToVM, this._didMergeToVM, this);
this._scriptFile.addEventListener(WebInspector.ScriptFile.Events.DidDivergeFromVM, this._didDivergeFromVM, this);

if (this.loaded)
this._scriptFile.checkMapping();
}
},

onTextEditorContentLoaded: function()
{
if (typeof this._executionLineNumber === "number")
this.setExecutionLine(this._executionLineNumber);

var breakpointLocations = this._breakpointManager.breakpointLocationsForUISourceCode(this._uiSourceCode);
for (var i = 0; i < breakpointLocations.length; ++i)
this._breakpointAdded({data:breakpointLocations[i]});

var messages = this._uiSourceCode.consoleMessages();
for (var i = 0; i < messages.length; ++i) {
var message = messages[i];
this.addMessageToSource(message.lineNumber, message.originalMessage);
}

if (this._scriptFile)
this._scriptFile.checkMapping();
},


_handleGutterClick: function(event)
{
if (this._muted)
return;

var eventData =   (event.data);
var lineNumber = eventData.lineNumber;
var eventObject =   (eventData.event);

if (eventObject.button != 0 || eventObject.altKey || eventObject.ctrlKey || eventObject.metaKey)
return;

this._toggleBreakpoint(lineNumber, eventObject.shiftKey);
eventObject.consume(true);
},


_toggleBreakpoint: function(lineNumber, onlyDisable)
{
var breakpoint = this._breakpointManager.findBreakpoint(this._uiSourceCode, lineNumber);
if (breakpoint) {
if (onlyDisable)
breakpoint.setEnabled(!breakpoint.enabled());
else
breakpoint.remove();
} else
this._setBreakpoint(lineNumber, "", true);
},

toggleBreakpointOnCurrentLine: function()
{
if (this._muted)
return;

var selection = this.textEditor.selection();
if (!selection)
return;
this._toggleBreakpoint(selection.startLine, false);
},


_setBreakpoint: function(lineNumber, condition, enabled)
{
this._breakpointManager.setBreakpoint(this._uiSourceCode, lineNumber, condition, enabled);

WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
action: WebInspector.UserMetrics.UserActionNames.SetBreakpoint,
url: this._uiSourceCode.originURL(),
line: lineNumber,
enabled: enabled
});
},


_continueToLine: function(lineNumber)
{
var rawLocation =   (this._uiSourceCode.uiLocationToRawLocation(lineNumber, 0));
WebInspector.debuggerModel.continueToLocation(rawLocation);
},

dispose: function()
{
this._breakpointManager.removeEventListener(WebInspector.BreakpointManager.Events.BreakpointAdded, this._breakpointAdded, this);
this._breakpointManager.removeEventListener(WebInspector.BreakpointManager.Events.BreakpointRemoved, this._breakpointRemoved, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.ConsoleMessageAdded, this._consoleMessageAdded, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.ConsoleMessageRemoved, this._consoleMessageRemoved, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.ConsoleMessagesCleared, this._consoleMessagesCleared, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.SourceMappingChanged, this._onSourceMappingChanged, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
WebInspector.UISourceCodeFrame.prototype.dispose.call(this);
},

__proto__: WebInspector.UISourceCodeFrame.prototype
}
;



WebInspector.NavigatorOverlayController = function(parentSidebarView, navigatorView, editorView)
{
this._parentSidebarView = parentSidebarView;
this._navigatorView = navigatorView;
this._editorView = editorView;

this._navigatorSidebarResizeWidgetElement = document.createElement("div");
this._navigatorSidebarResizeWidgetElement.addStyleClass("scripts-navigator-resizer-widget");
this._parentSidebarView.installResizer(this._navigatorSidebarResizeWidgetElement);
this._navigatorView.element.appendChild(this._navigatorSidebarResizeWidgetElement);

this._navigatorShowHideButton = new WebInspector.StatusBarButton(WebInspector.UIString("Hide navigator"), "scripts-navigator-show-hide-button", 3);
this._navigatorShowHideButton.state = "pinned";
this._navigatorShowHideButton.addEventListener("click", this._toggleNavigator, this);
this._editorView.element.appendChild(this._navigatorShowHideButton.element);

WebInspector.settings.navigatorHidden = WebInspector.settings.createSetting("navigatorHidden", true);
if (WebInspector.settings.navigatorHidden.get())
this._toggleNavigator();
}

WebInspector.NavigatorOverlayController.prototype = {
wasShown: function()
{
window.setTimeout(this._maybeShowNavigatorOverlay.bind(this), 0);
},

_maybeShowNavigatorOverlay: function()
{
if (WebInspector.settings.navigatorHidden.get() && !WebInspector.settings.navigatorWasOnceHidden.get())
this.showNavigatorOverlay();
},

_toggleNavigator: function()
{
if (this._navigatorShowHideButton.state === "overlay")
this._pinNavigator();
else if (this._navigatorShowHideButton.state === "hidden")
this.showNavigatorOverlay();
else
this._hidePinnedNavigator();
},

_hidePinnedNavigator: function()
{
this._navigatorShowHideButton.state = "hidden";
this._navigatorShowHideButton.title = WebInspector.UIString("Show navigator");
this._parentSidebarView.element.appendChild(this._navigatorShowHideButton.element);

this._editorView.element.addStyleClass("navigator-hidden");
this._navigatorSidebarResizeWidgetElement.addStyleClass("hidden");

this._parentSidebarView.hideSidebarElement();
this._navigatorView.detach();
this._editorView.focus();

WebInspector.settings.navigatorWasOnceHidden.set(true);
WebInspector.settings.navigatorHidden.set(true);
},

_pinNavigator: function()
{
this._navigatorShowHideButton.state = "pinned";
this._navigatorShowHideButton.title = WebInspector.UIString("Hide navigator");

this._editorView.element.removeStyleClass("navigator-hidden");
this._navigatorSidebarResizeWidgetElement.removeStyleClass("hidden");
this._editorView.element.appendChild(this._navigatorShowHideButton.element);

this._innerHideNavigatorOverlay();
this._parentSidebarView.showSidebarElement();
this._navigatorView.show(this._parentSidebarView.sidebarElement);
this._navigatorView.focus();
WebInspector.settings.navigatorHidden.set(false);
},

showNavigatorOverlay: function()
{
if (this._navigatorShowHideButton.state === "overlay")
return;

this._navigatorShowHideButton.state = "overlay";
this._navigatorShowHideButton.title = WebInspector.UIString("Pin navigator");

this._sidebarOverlay = new WebInspector.SidebarOverlay(this._navigatorView, "scriptsPanelNavigatorOverlayWidth", Preferences.minScriptsSidebarWidth);
this._boundKeyDown = this._keyDown.bind(this);
this._sidebarOverlay.element.addEventListener("keydown", this._boundKeyDown, false);
var navigatorOverlayResizeWidgetElement = document.createElement("div");
navigatorOverlayResizeWidgetElement.addStyleClass("scripts-navigator-resizer-widget");
this._sidebarOverlay.resizerWidgetElement = navigatorOverlayResizeWidgetElement;

this._navigatorView.element.appendChild(this._navigatorShowHideButton.element);
this._boundContainingElementFocused = this._containingElementFocused.bind(this);
this._parentSidebarView.element.addEventListener("mousedown", this._boundContainingElementFocused, false);

this._sidebarOverlay.show(this._parentSidebarView.element);
this._navigatorView.focus();
},

_keyDown: function(event)
{
if (event.handled)
return;

if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code) {
this.hideNavigatorOverlay();
event.consume(true);
}
},

hideNavigatorOverlay: function()
{
if (this._navigatorShowHideButton.state !== "overlay")
return;

this._navigatorShowHideButton.state = "hidden";
this._navigatorShowHideButton.title = WebInspector.UIString("Show navigator");
this._parentSidebarView.element.appendChild(this._navigatorShowHideButton.element);

this._innerHideNavigatorOverlay();
this._editorView.focus();
},

_innerHideNavigatorOverlay: function()
{
this._parentSidebarView.element.removeEventListener("mousedown", this._boundContainingElementFocused, false);
this._sidebarOverlay.element.removeEventListener("keydown", this._boundKeyDown, false);
this._sidebarOverlay.hide();
},

_containingElementFocused: function(event)
{
if (!event.target.isSelfOrDescendant(this._sidebarOverlay.element))
this.hideNavigatorOverlay();
},

isNavigatorPinned: function()
{
return this._navigatorShowHideButton.state === "pinned";
},

isNavigatorHidden: function()
{
return this._navigatorShowHideButton.state === "hidden";
}
}
;



WebInspector.NavigatorView = function()
{
WebInspector.View.call(this);
this.registerRequiredCSS("navigatorView.css");

this._treeSearchBoxElement = document.createElement("div");
this._treeSearchBoxElement.className = "navigator-tree-search-box";
this.element.appendChild(this._treeSearchBoxElement);

var scriptsTreeElement = document.createElement("ol");
this._scriptsTree = new WebInspector.NavigatorTreeOutline(this._treeSearchBoxElement, scriptsTreeElement);

var scriptsOutlineElement = document.createElement("div");
scriptsOutlineElement.addStyleClass("outline-disclosure");
scriptsOutlineElement.addStyleClass("navigator");
scriptsOutlineElement.appendChild(scriptsTreeElement);

this.element.addStyleClass("fill");
this.element.addStyleClass("navigator-container");
this.element.appendChild(scriptsOutlineElement);
this.setDefaultFocusedElement(this._scriptsTree.element);


this._uiSourceCodeNodes = {};

this._rootNode = new WebInspector.NavigatorRootTreeNode(this);
this._rootNode.populate();

WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.InspectedURLChanged, this._inspectedURLChanged, this);
}

WebInspector.NavigatorView.Events = {
ItemSelected: "ItemSelected",
FileRenamed: "FileRenamed"
}

WebInspector.NavigatorView.iconClassForType = function(type)
{
if (type === WebInspector.NavigatorTreeOutline.Types.Domain)
return "navigator-domain-tree-item";
if (type === WebInspector.NavigatorTreeOutline.Types.FileSystem)
return "navigator-folder-tree-item";
return "navigator-folder-tree-item";
}

WebInspector.NavigatorView.prototype = {

addUISourceCode: function(uiSourceCode)
{
var node = this._getOrCreateUISourceCodeParentNode(uiSourceCode);
var uiSourceCodeNode = new WebInspector.NavigatorUISourceCodeTreeNode(this, uiSourceCode);
this._uiSourceCodeNodes[uiSourceCode.uri()] = uiSourceCodeNode;
node.appendChild(uiSourceCodeNode);
if (uiSourceCode.url === WebInspector.inspectedPageURL)
this.revealUISourceCode(uiSourceCode);
},


_inspectedURLChanged: function(event)
{
var nodes = Object.values(this._uiSourceCodeNodes);
for (var i = 0; i < nodes.length; ++i) {
var uiSourceCode = nodes[i].uiSourceCode();
if (uiSourceCode.url === WebInspector.inspectedPageURL)
this.revealUISourceCode(uiSourceCode);
}

},


_getProjectNode: function(project)
{
if (!project.displayName())
return this._rootNode;
return this._rootNode.child(project.id());
},


_createProjectNode: function(project)
{
var type = project.type() === WebInspector.projectTypes.FileSystem ? WebInspector.NavigatorTreeOutline.Types.FileSystem : WebInspector.NavigatorTreeOutline.Types.Domain;
var projectNode = new WebInspector.NavigatorFolderTreeNode(this, project.id(), type, project.displayName());
this._rootNode.appendChild(projectNode);
return projectNode;
},


_getOrCreateProjectNode: function(project)
{
return this._getProjectNode(project) || this._createProjectNode(project);
},


_getFolderNode: function(parentNode, name)
{
return parentNode.child(name);
},


_createFolderNode: function(parentNode, name)
{
var folderNode = new WebInspector.NavigatorFolderTreeNode(this, name, WebInspector.NavigatorTreeOutline.Types.Folder, name);
parentNode.appendChild(folderNode);
return folderNode;
},


_getOrCreateFolderNode: function(parentNode, name)
{
return this._getFolderNode(parentNode, name) || this._createFolderNode(parentNode, name);
},


_getUISourceCodeParentNode: function(uiSourceCode)
{
var projectNode = this._getProjectNode(uiSourceCode.project());
if (!projectNode)
return null;
var path = uiSourceCode.path();
var parentNode = projectNode;
for (var i = 0; i < path.length - 1; ++i) {
parentNode = this._getFolderNode(parentNode, path[i]);
if (!parentNode)
return null;
}
return parentNode;
},


_getOrCreateUISourceCodeParentNode: function(uiSourceCode)
{
var projectNode = this._getOrCreateProjectNode(uiSourceCode.project());
if (!projectNode)
return null;
var path = uiSourceCode.path();
var parentNode = projectNode;
for (var i = 0; i < path.length - 1; ++i) {
parentNode = this._getOrCreateFolderNode(parentNode, path[i]);
if (!parentNode)
return null;
}
return parentNode;
},


revealUISourceCode: function(uiSourceCode, select)
{
var node = this._uiSourceCodeNodes[uiSourceCode.uri()];
if (!node)
return null;
if (this._scriptsTree.selectedTreeElement)
this._scriptsTree.selectedTreeElement.deselect();
this._lastSelectedUISourceCode = uiSourceCode;
node.reveal(select);
},


_scriptSelected: function(uiSourceCode, focusSource)
{
this._lastSelectedUISourceCode = uiSourceCode;
var data = { uiSourceCode: uiSourceCode, focusSource: focusSource};
this.dispatchEventToListeners(WebInspector.NavigatorView.Events.ItemSelected, data);
},


removeUISourceCode: function(uiSourceCode)
{
var parentNode = this._getUISourceCodeParentNode(uiSourceCode);
if (!parentNode)
return;
var node = this._uiSourceCodeNodes[uiSourceCode.uri()];
if (!node)
return;
delete this._uiSourceCodeNodes[uiSourceCode.uri()]
parentNode.removeChild(node);
node = parentNode;
while (node) {
parentNode = node.parent;
if (!parentNode || !node.isEmpty())
break;
parentNode.removeChild(node);
node = parentNode;
}
},

_fileRenamed: function(uiSourceCode, newTitle)
{    
var data = { uiSourceCode: uiSourceCode, name: newTitle };
this.dispatchEventToListeners(WebInspector.NavigatorView.Events.FileRenamed, data);
},


rename: function(uiSourceCode, callback)
{
var node = this._uiSourceCodeNodes[uiSourceCode.uri()];
if (!node)
return null;
node.rename(callback);
},

reset: function()
{
for (var uri in this._uiSourceCodeNodes)
this._uiSourceCodeNodes[uri].dispose();

this._scriptsTree.stopSearch();
this._scriptsTree.removeChildren();
this._uiSourceCodeNodes = {};
this._rootNode.reset();
},

handleContextMenu: function(event, uiSourceCode)
{
var contextMenu = new WebInspector.ContextMenu(event);
contextMenu.appendApplicableItems(uiSourceCode);
contextMenu.show();
},

__proto__: WebInspector.View.prototype
}


WebInspector.NavigatorTreeOutline = function(treeSearchBoxElement, element)
{
TreeOutline.call(this, element);
this.element = element;

this._treeSearchBoxElement = treeSearchBoxElement;

this.comparator = WebInspector.NavigatorTreeOutline._treeElementsCompare;

this.searchable = true;
this.searchInputElement = document.createElement("input");
}

WebInspector.NavigatorTreeOutline.Types = {
Root: "Root",
Domain: "Domain",
Folder: "Folder",
UISourceCode: "UISourceCode",
FileSystem: "FileSystem"
}

WebInspector.NavigatorTreeOutline._treeElementsCompare = function compare(treeElement1, treeElement2)
{

function typeWeight(treeElement)
{
var type = treeElement.type();
if (type === WebInspector.NavigatorTreeOutline.Types.Domain) {
if (treeElement.titleText === WebInspector.inspectedPageDomain)
return 1;
return 2;
}
if (type === WebInspector.NavigatorTreeOutline.Types.FileSystem)
return 3;
if (type === WebInspector.NavigatorTreeOutline.Types.Folder)
return 4;
return 5;
}

var typeWeight1 = typeWeight(treeElement1);
var typeWeight2 = typeWeight(treeElement2);

var result;
if (typeWeight1 > typeWeight2)
result = 1;
else if (typeWeight1 < typeWeight2)
result = -1;
else {
var title1 = treeElement1.titleText;
var title2 = treeElement2.titleText;
result = title1.compareTo(title2);
}
return result;
}

WebInspector.NavigatorTreeOutline.prototype = {

scriptTreeElements: function()
{
var result = [];
if (this.children.length) {
for (var treeElement = this.children[0]; treeElement; treeElement = treeElement.traverseNextTreeElement(false, this, true)) {
if (treeElement instanceof WebInspector.NavigatorSourceTreeElement)
result.push(treeElement.uiSourceCode);
}
}
return result;
},

searchStarted: function()
{
this._treeSearchBoxElement.appendChild(this.searchInputElement);
this._treeSearchBoxElement.addStyleClass("visible");
},

searchFinished: function()
{
this._treeSearchBoxElement.removeChild(this.searchInputElement);
this._treeSearchBoxElement.removeStyleClass("visible");
},

__proto__: TreeOutline.prototype
}


WebInspector.BaseNavigatorTreeElement = function(type, title, iconClasses, hasChildren, noIcon)
{
this._type = type;
TreeElement.call(this, "", null, hasChildren);
this._titleText = title;
this._iconClasses = iconClasses;
this._noIcon = noIcon;
}

WebInspector.BaseNavigatorTreeElement.prototype = {
onattach: function()
{
this.listItemElement.removeChildren();
if (this._iconClasses) {
for (var i = 0; i < this._iconClasses.length; ++i)
this.listItemElement.addStyleClass(this._iconClasses[i]);
}

var selectionElement = document.createElement("div");
selectionElement.className = "selection";
this.listItemElement.appendChild(selectionElement);

if (!this._noIcon) {
this.imageElement = document.createElement("img");
this.imageElement.className = "icon";
this.listItemElement.appendChild(this.imageElement);
}

this.titleElement = document.createElement("div");
this.titleElement.className = "base-navigator-tree-element-title";
this._titleTextNode = document.createTextNode("");
this._titleTextNode.textContent = this._titleText;
this.titleElement.appendChild(this._titleTextNode);
this.listItemElement.appendChild(this.titleElement);
},

onreveal: function()
{
if (this.listItemElement)
this.listItemElement.scrollIntoViewIfNeeded(true);
},


get titleText()
{
return this._titleText;
},

set titleText(titleText)
{
if (this._titleText === titleText)
return;
this._titleText = titleText || "";
if (this.titleElement)
this.titleElement.textContent = this._titleText;
},


matchesSearchText: function(searchText)
{
return this.titleText.match(new RegExp("^" + searchText.escapeForRegExp(), "i"));
},


type: function()
{
return this._type;
},

__proto__: TreeElement.prototype
}


WebInspector.NavigatorFolderTreeElement = function(type, title)
{
var iconClass = WebInspector.NavigatorView.iconClassForType(type);
WebInspector.BaseNavigatorTreeElement.call(this, type, title, [iconClass], true);
}

WebInspector.NavigatorFolderTreeElement.prototype = {
onpopulate: function()
{
this._node.populate();
},

onattach: function()
{
WebInspector.BaseNavigatorTreeElement.prototype.onattach.call(this);
this.collapse();
},


setNode: function(node)
{
this._node = node;
var paths = [];
while (node && !node.isRoot()) {
paths.push(node._title);
node = node.parent;
}
paths.reverse();
this.tooltip = paths.join("/");
},

__proto__: WebInspector.BaseNavigatorTreeElement.prototype
}


WebInspector.NavigatorSourceTreeElement = function(navigatorView, uiSourceCode, title)
{
WebInspector.BaseNavigatorTreeElement.call(this, WebInspector.NavigatorTreeOutline.Types.UISourceCode, title, ["navigator-" + uiSourceCode.contentType().name() + "-tree-item"], false);
this._navigatorView = navigatorView;
this._uiSourceCode = uiSourceCode;
this.tooltip = uiSourceCode.originURL();
}

WebInspector.NavigatorSourceTreeElement.prototype = {

get uiSourceCode()
{
return this._uiSourceCode;
},

onattach: function()
{
WebInspector.BaseNavigatorTreeElement.prototype.onattach.call(this);
this.listItemElement.draggable = true;
this.listItemElement.addEventListener("click", this._onclick.bind(this), false);
this.listItemElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), false);
this.listItemElement.addEventListener("mousedown", this._onmousedown.bind(this), false);
this.listItemElement.addEventListener("dragstart", this._ondragstart.bind(this), false);
},

_onmousedown: function(event)
{
if (event.which === 1) 
this._uiSourceCode.requestContent(callback.bind(this));

function callback(content, contentEncoded, mimeType)
{
this._warmedUpContent = content;
}
},

_ondragstart: function(event)
{
event.dataTransfer.setData("text/plain", this._warmedUpContent);
event.dataTransfer.effectAllowed = "copy";
return true;
},

onspace: function()
{
this._navigatorView._scriptSelected(this.uiSourceCode, true);
return true;
},


_onclick: function(event)
{
this._navigatorView._scriptSelected(this.uiSourceCode, false);
},


ondblclick: function(event)
{
var middleClick = event.button === 1;
this._navigatorView._scriptSelected(this.uiSourceCode, !middleClick);
},

onenter: function()
{
this._navigatorView._scriptSelected(this.uiSourceCode, true);
return true;
},


_handleContextMenuEvent: function(event)
{
this._navigatorView.handleContextMenu(event, this._uiSourceCode);
},

__proto__: WebInspector.BaseNavigatorTreeElement.prototype
}


WebInspector.NavigatorTreeNode = function(id)
{
this.id = id;
this._children = {};
}

WebInspector.NavigatorTreeNode.prototype = {

treeElement: function() { },

dispose: function() { },


isRoot: function()
{
return false;
},


hasChildren: function()
{
return true;
},

populate: function()
{
if (this.isPopulated())
return;
if (this.parent)
this.parent.populate();
this._populated = true;
this.wasPopulated();
},

wasPopulated: function()
{
for (var id in this._children)
this.treeElement().appendChild(this._children[id].treeElement());
},

didAddChild: function(node)
{
if (this.isPopulated())
this.treeElement().appendChild(node.treeElement());
},

willRemoveChild: function(node)
{
if (this.isPopulated())
this.treeElement().removeChild(node.treeElement());
},

isPopulated: function()
{
return this._populated;
},

isEmpty: function()
{
return this.children().length === 0;
},

child: function(id)
{
return this._children[id];
},

children: function()
{
return Object.values(this._children);
},

appendChild: function(node)
{
this._children[node.id] = node;
node.parent = this;
this.didAddChild(node);
},

removeChild: function(node)
{
this.willRemoveChild(node);
delete this._children[node.id];
delete node.parent;
node.dispose();
},

reset: function()
{
this._children = {};
}
}


WebInspector.NavigatorRootTreeNode = function(navigatorView)
{
WebInspector.NavigatorTreeNode.call(this, "");
this._navigatorView = navigatorView;
}

WebInspector.NavigatorRootTreeNode.prototype = {

isRoot: function()
{
return true;
},


treeElement: function()
{
return this._navigatorView._scriptsTree;
},

wasPopulated: function()
{
for (var id in this._children)
this.treeElement().appendChild(this._children[id].treeElement());
},

didAddChild: function(node)
{
if (this.isPopulated())
this.treeElement().appendChild(node.treeElement());
},

willRemoveChild: function(node)
{
if (this.isPopulated())
this.treeElement().removeChild(node.treeElement());
},

__proto__: WebInspector.NavigatorTreeNode.prototype
}


WebInspector.NavigatorUISourceCodeTreeNode = function(navigatorView, uiSourceCode)
{
WebInspector.NavigatorTreeNode.call(this, uiSourceCode.name());
this._navigatorView = navigatorView;
this._uiSourceCode = uiSourceCode;
}

WebInspector.NavigatorUISourceCodeTreeNode.prototype = {

uiSourceCode: function()
{
return this._uiSourceCode;
},


treeElement: function()
{
if (this._treeElement)
return this._treeElement;

this._treeElement = new WebInspector.NavigatorSourceTreeElement(this._navigatorView, this._uiSourceCode, "");
this.updateTitle();

this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.TitleChanged, this._titleChanged, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.FormattedChanged, this._formattedChanged, this);

return this._treeElement;
},


updateTitle: function(ignoreIsDirty)
{
if (!this._treeElement)
return;

var titleText = this._uiSourceCode.name().trimEnd(100);
if (!titleText)
titleText = WebInspector.UIString("(program)");
if (!ignoreIsDirty && this._uiSourceCode.isDirty())
titleText = "*" + titleText;
this._treeElement.titleText = titleText;
},


hasChildren: function()
{
return false;
},

dispose: function()
{
if (!this._treeElement)
return;
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.TitleChanged, this._titleChanged, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.FormattedChanged, this._formattedChanged, this);
},

_titleChanged: function(event)
{
this.updateTitle();
},

_workingCopyChanged: function(event)
{
this.updateTitle();
},

_workingCopyCommitted: function(event)
{
this.updateTitle();
},

_formattedChanged: function(event)
{
this.updateTitle();
},


reveal: function(select)
{
this.parent.populate();
this.parent.treeElement().expand();
this._treeElement.reveal();
if (select)
this._treeElement.select();
},


rename: function(callback)
{
if (!this._treeElement)
return;


var treeOutlineElement = this._treeElement.treeOutline.element;
WebInspector.markBeingEdited(treeOutlineElement, true);

function commitHandler(element, newTitle, oldTitle)
{
if (newTitle && newTitle !== oldTitle)
this._navigatorView._fileRenamed(this._uiSourceCode, newTitle);
afterEditing.call(this, true);
}

function cancelHandler()
{
afterEditing.call(this, false);
}


function afterEditing(committed)
{
WebInspector.markBeingEdited(treeOutlineElement, false);
this.updateTitle();
if (callback)
callback(committed);
}

var editingConfig = new WebInspector.EditingConfig(commitHandler.bind(this), cancelHandler.bind(this));
this.updateTitle(true);
WebInspector.startEditing(this._treeElement.titleElement, editingConfig);
window.getSelection().setBaseAndExtent(this._treeElement.titleElement, 0, this._treeElement.titleElement, 1);
},

__proto__: WebInspector.NavigatorTreeNode.prototype
}


WebInspector.NavigatorFolderTreeNode = function(navigatorView, id, type, title)
{
WebInspector.NavigatorTreeNode.call(this, id);
this._navigatorView = navigatorView;
this._type = type;
this._title = title;
}

WebInspector.NavigatorFolderTreeNode.prototype = {

treeElement: function()
{
if (this._treeElement)
return this._treeElement;
this._treeElement = this._createTreeElement(this._title, this);
return this._treeElement;
},


_createTreeElement: function(title, node)
{
var treeElement = new WebInspector.NavigatorFolderTreeElement(this._type, title);
treeElement.setNode(node);
return treeElement;
},

wasPopulated: function()
{
if (!this._treeElement || this._treeElement._node !== this)
return;
this._addChildrenRecursive();
},

_addChildrenRecursive: function()
{
for (var id in this._children) {
var child = this._children[id];
this.didAddChild(child);
if (child instanceof WebInspector.NavigatorFolderTreeNode)
child._addChildrenRecursive();
}
},

_shouldMerge: function(node)
{
return this._type !== WebInspector.NavigatorTreeOutline.Types.Domain && node instanceof WebInspector.NavigatorFolderTreeNode;
},

didAddChild: function(node)
{
function titleForNode(node)
{
return node._title;
}

if (!this._treeElement)
return;

var children = this.children();

if (children.length === 1 && this._shouldMerge(node)) {
node._isMerged = true;
this._treeElement.titleText = this._treeElement.titleText + "/" + node._title;
node._treeElement = this._treeElement;
this._treeElement.setNode(node);
return;
}

var oldNode;
if (children.length === 2)
oldNode = children[0] !== node ? children[0] : children[1];
if (oldNode && oldNode._isMerged) {
delete oldNode._isMerged;
var mergedToNodes = [];
mergedToNodes.push(this);
var treeNode = this;
while (treeNode._isMerged) {
treeNode = treeNode.parent;
mergedToNodes.push(treeNode);
}
mergedToNodes.reverse();
var titleText = mergedToNodes.map(titleForNode).join("/");

var nodes = [];
treeNode = oldNode;
do {
nodes.push(treeNode);
children = treeNode.children();
treeNode = children.length === 1 ? children[0] : null;
} while (treeNode && treeNode._isMerged);

if (!this.isPopulated()) {
this._treeElement.titleText = titleText;
this._treeElement.setNode(this);
for (var i = 0; i < nodes.length; ++i) {
delete nodes[i]._treeElement;
delete nodes[i]._isMerged;
}
return;
}
var oldTreeElement = this._treeElement;
var treeElement = this._createTreeElement(titleText, this);
for (var i = 0; i < mergedToNodes.length; ++i)
mergedToNodes[i]._treeElement = treeElement;
oldTreeElement.parent.appendChild(treeElement);

oldTreeElement.setNode(nodes[nodes.length - 1]);
oldTreeElement.titleText = nodes.map(titleForNode).join("/");
oldTreeElement.parent.removeChild(oldTreeElement);
this._treeElement.appendChild(oldTreeElement);
if (oldTreeElement.expanded)
treeElement.expand();
}
if (this.isPopulated())
this._treeElement.appendChild(node.treeElement());
},

willRemoveChild: function(node)
{
if (node._isMerged || !this.isPopulated())
return;
this._treeElement.removeChild(node._treeElement);
},

__proto__: WebInspector.NavigatorTreeNode.prototype
}
;



WebInspector.RevisionHistoryView = function()
{
WebInspector.View.call(this);
this.registerRequiredCSS("revisionHistory.css");
this.element.addStyleClass("revision-history-drawer");
this.element.addStyleClass("fill");
this.element.addStyleClass("outline-disclosure");
this._uiSourceCodeItems = new Map();

var olElement = this.element.createChild("ol");
this._treeOutline = new TreeOutline(olElement);


function populateRevisions(uiSourceCode)
{
if (uiSourceCode.history.length)
this._createUISourceCodeItem(uiSourceCode);
}

WebInspector.workspace.uiSourceCodes().forEach(populateRevisions.bind(this));
WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeContentCommitted, this._revisionAdded, this);
WebInspector.workspace.addEventListener(WebInspector.UISourceCodeProvider.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset, this._projectWillReset, this);

this._statusElement = document.createElement("span");
this._statusElement.textContent = WebInspector.UIString("Local modifications");

}


WebInspector.RevisionHistoryView.showHistory = function(uiSourceCode)
{
if (!WebInspector.RevisionHistoryView._view) 
WebInspector.RevisionHistoryView._view = new WebInspector.RevisionHistoryView();
var view = WebInspector.RevisionHistoryView._view;
WebInspector.showViewInDrawer(view._statusElement, view);
view._revealUISourceCode(uiSourceCode);
}

WebInspector.RevisionHistoryView.prototype = {

_createUISourceCodeItem: function(uiSourceCode)
{
var uiSourceCodeItem = new TreeElement(uiSourceCode.displayName(), null, true);
uiSourceCodeItem.selectable = false;


for (var i = 0; i < this._treeOutline.children.length; ++i) {
if (this._treeOutline.children[i].title.localeCompare(uiSourceCode.displayName()) > 0) {
this._treeOutline.insertChild(uiSourceCodeItem, i);
break;
}
}
if (i === this._treeOutline.children.length)
this._treeOutline.appendChild(uiSourceCodeItem);

this._uiSourceCodeItems.put(uiSourceCode, uiSourceCodeItem);

var revisionCount = uiSourceCode.history.length;
for (var i = revisionCount - 1; i >= 0; --i) {
var revision = uiSourceCode.history[i];
var historyItem = new WebInspector.RevisionHistoryTreeElement(revision, uiSourceCode.history[i - 1], i !== revisionCount - 1);
uiSourceCodeItem.appendChild(historyItem);
}

var linkItem = new TreeElement("", null, false);
linkItem.selectable = false;
uiSourceCodeItem.appendChild(linkItem);

var revertToOriginal = linkItem.listItemElement.createChild("span", "revision-history-link revision-history-link-row");
revertToOriginal.textContent = WebInspector.UIString("apply original content");
revertToOriginal.addEventListener("click", uiSourceCode.revertToOriginal.bind(uiSourceCode));

var clearHistoryElement = uiSourceCodeItem.listItemElement.createChild("span", "revision-history-link");
clearHistoryElement.textContent = WebInspector.UIString("revert");
clearHistoryElement.addEventListener("click", this._clearHistory.bind(this, uiSourceCode));
return uiSourceCodeItem;
},


_clearHistory: function(uiSourceCode)
{
uiSourceCode.revertAndClearHistory(this._removeUISourceCode.bind(this));
},

_revisionAdded: function(event)
{
var uiSourceCode =   (event.data.uiSourceCode);
var uiSourceCodeItem = this._uiSourceCodeItems.get(uiSourceCode);
if (!uiSourceCodeItem) {
uiSourceCodeItem = this._createUISourceCodeItem(uiSourceCode);
return;
}

var historyLength = uiSourceCode.history.length;
var historyItem = new WebInspector.RevisionHistoryTreeElement(uiSourceCode.history[historyLength - 1], uiSourceCode.history[historyLength - 2], false);
if (uiSourceCodeItem.children.length)
uiSourceCodeItem.children[0].allowRevert();
uiSourceCodeItem.insertChild(historyItem, 0);
},


_revealUISourceCode: function(uiSourceCode)
{
var uiSourceCodeItem = this._uiSourceCodeItems.get(uiSourceCode);
if (uiSourceCodeItem) {
uiSourceCodeItem.reveal();
uiSourceCodeItem.expand();
}
},

_uiSourceCodeRemoved: function(event)
{
var uiSourceCode =   (event.data);
this._removeUISourceCode(uiSourceCode);
},


_removeUISourceCode: function(uiSourceCode)
{
var uiSourceCodeItem = this._uiSourceCodeItems.get(uiSourceCode);
if (!uiSourceCodeItem)
return;
this._treeOutline.removeChild(uiSourceCodeItem);
this._uiSourceCodeItems.remove(uiSourceCode);
},

_projectWillReset: function(event)
{
var project = event.data;
project.uiSourceCodes().forEach(this._removeUISourceCode.bind(this));
},

__proto__: WebInspector.View.prototype
}


WebInspector.RevisionHistoryTreeElement = function(revision, baseRevision, allowRevert)
{
TreeElement.call(this, revision.timestamp.toLocaleTimeString(), null, true);
this.selectable = false;

this._revision = revision;
this._baseRevision = baseRevision;

this._revertElement = document.createElement("span");
this._revertElement.className = "revision-history-link";
this._revertElement.textContent = WebInspector.UIString("apply revision content");
this._revertElement.addEventListener("click", this._revision.revertToThis.bind(this._revision), false);
if (!allowRevert)
this._revertElement.addStyleClass("hidden");
}

WebInspector.RevisionHistoryTreeElement.prototype = {
onattach: function()
{
this.listItemElement.addStyleClass("revision-history-revision");
},

onexpand: function()
{
this.listItemElement.appendChild(this._revertElement);

if (this._wasExpandedOnce)
return;
this._wasExpandedOnce = true;

this.childrenListElement.addStyleClass("source-code");
if (this._baseRevision)
this._baseRevision.requestContent(step1.bind(this));
else
this._revision.uiSourceCode.requestOriginalContent(step1.bind(this));

function step1(baseContent)
{
this._revision.requestContent(step2.bind(this, baseContent));
}

function step2(baseContent, newContent)
{
var baseLines = difflib.stringAsLines(baseContent);
var newLines = difflib.stringAsLines(newContent);
var sm = new difflib.SequenceMatcher(baseLines, newLines);
var opcodes = sm.get_opcodes();
var lastWasSeparator = false;

for (var idx = 0; idx < opcodes.length; idx++) {
var code = opcodes[idx];
var change = code[0];
var b = code[1];
var be = code[2];
var n = code[3];
var ne = code[4];
var rowCount = Math.max(be - b, ne - n);
var topRows = [];
var bottomRows = [];
for (var i = 0; i < rowCount; i++) {
if (change === "delete" || (change === "replace" && b < be)) {
var lineNumber = b++;
this._createLine(lineNumber, null, baseLines[lineNumber], "removed");
lastWasSeparator = false;
}

if (change === "insert" || (change === "replace" && n < ne)) {
var lineNumber = n++;
this._createLine(null, lineNumber, newLines[lineNumber], "added");
lastWasSeparator = false;
}

if (change === "equal") {
b++;
n++;
if (!lastWasSeparator)
this._createLine(null, null, "    \u2026", "separator");
lastWasSeparator = true;
}
}
}
}
},

oncollapse: function()
{
if (this._revertElement.parentElement)
this._revertElement.parentElement.removeChild(this._revertElement);
},


_createLine: function(baseLineNumber, newLineNumber, lineContent, changeType)
{
var child = new TreeElement("", null, false);
child.selectable = false;
this.appendChild(child);
var lineElement = document.createElement("span");

function appendLineNumber(lineNumber)
{
var numberString = lineNumber !== null ? numberToStringWithSpacesPadding(lineNumber + 1, 4) : "    ";
var lineNumberSpan = document.createElement("span");
lineNumberSpan.addStyleClass("webkit-line-number");
lineNumberSpan.textContent = numberString;
child.listItemElement.appendChild(lineNumberSpan);
}

appendLineNumber(baseLineNumber);
appendLineNumber(newLineNumber);

var contentSpan = document.createElement("span");
contentSpan.textContent = lineContent;
child.listItemElement.appendChild(contentSpan);
child.listItemElement.addStyleClass("revision-history-line");
child.listItemElement.addStyleClass("revision-history-line-" + changeType);
},

allowRevert: function()
{
this._revertElement.removeStyleClass("hidden");
},

__proto__: TreeElement.prototype
}
;



WebInspector.ScopeChainSidebarPane = function()
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Scope Variables"));
this._sections = [];
this._expandedSections = {};
this._expandedProperties = [];
}

WebInspector.ScopeChainSidebarPane.prototype = {
update: function(callFrame)
{
this.bodyElement.removeChildren();

if (!callFrame) {
var infoElement = document.createElement("div");
infoElement.className = "info";
infoElement.textContent = WebInspector.UIString("Not Paused");
this.bodyElement.appendChild(infoElement);
return;
}

for (var i = 0; i < this._sections.length; ++i) {
var section = this._sections[i];
if (!section.title)
continue;
if (section.expanded)
this._expandedSections[section.title] = true;
else
delete this._expandedSections[section.title];
}

this._sections = [];

var foundLocalScope = false;
var scopeChain = callFrame.scopeChain;
for (var i = 0; i < scopeChain.length; ++i) {
var scope = scopeChain[i];
var title = null;
var subtitle = scope.object.description;
var emptyPlaceholder = null;
var extraProperties = null;
var declarativeScope;

switch (scope.type) {
case "local":
foundLocalScope = true;
title = WebInspector.UIString("Local");
emptyPlaceholder = WebInspector.UIString("No Variables");
subtitle = null;
if (callFrame.this)
extraProperties = [ new WebInspector.RemoteObjectProperty("this", WebInspector.RemoteObject.fromPayload(callFrame.this)) ];
if (i == 0) {
var details = WebInspector.debuggerModel.debuggerPausedDetails();
var exception = details.reason === WebInspector.DebuggerModel.BreakReason.Exception ? details.auxData : 0;
if (exception) {
extraProperties = extraProperties || [];
var exceptionObject =   (exception);
extraProperties.push(new WebInspector.RemoteObjectProperty("<exception>", WebInspector.RemoteObject.fromPayload(exceptionObject)));
}
}
declarativeScope = true;
break;
case "closure":
title = WebInspector.UIString("Closure");
emptyPlaceholder = WebInspector.UIString("No Variables");
subtitle = null;
declarativeScope = true;
break;
case "catch":
title = WebInspector.UIString("Catch");
subtitle = null;
declarativeScope = true;
break;
case "with":
title = WebInspector.UIString("With Block");
declarativeScope = false;
break;
case "global":
title = WebInspector.UIString("Global");
declarativeScope = false;
break;
}

if (!title || title === subtitle)
subtitle = null;

var scopeRef;
if (declarativeScope)
scopeRef = new WebInspector.ScopeRef(i, callFrame.id, undefined);
else
scopeRef = undefined;


var section = new WebInspector.ObjectPropertiesSection(WebInspector.ScopeRemoteObject.fromPayload(scope.object, scopeRef), title, subtitle, emptyPlaceholder, true, extraProperties, WebInspector.ScopeVariableTreeElement);
section.editInSelectedCallFrameWhenPaused = true;
section.pane = this;

if (scope.type === "global")
section.expanded = false;
else if (!foundLocalScope || scope.type === "local" || title in this._expandedSections)
section.expanded = true;

this._sections.push(section);
this.bodyElement.appendChild(section.element);
}
},

__proto__: WebInspector.SidebarPane.prototype
}


WebInspector.ScopeVariableTreeElement = function(property)
{
WebInspector.ObjectPropertyTreeElement.call(this, property);
}

WebInspector.ScopeVariableTreeElement.prototype = {
onattach: function()
{
WebInspector.ObjectPropertyTreeElement.prototype.onattach.call(this);
if (this.hasChildren && this.propertyIdentifier in this.treeOutline.section.pane._expandedProperties)
this.expand();
},

onexpand: function()
{
this.treeOutline.section.pane._expandedProperties[this.propertyIdentifier] = true;
},

oncollapse: function()
{
delete this.treeOutline.section.pane._expandedProperties[this.propertyIdentifier];
},

get propertyIdentifier()
{
if ("_propertyIdentifier" in this)
return this._propertyIdentifier;
var section = this.treeOutline.section;
this._propertyIdentifier = section.title + ":" + (section.subtitle ? section.subtitle + ":" : "") + this.propertyPath();
return this._propertyIdentifier;
},

__proto__: WebInspector.ObjectPropertyTreeElement.prototype
}
;



WebInspector.ScriptsNavigator = function()
{
WebInspector.Object.call(this);

this._tabbedPane = new WebInspector.TabbedPane();
this._tabbedPane.shrinkableTabs = true;
this._tabbedPane.element.addStyleClass("navigator-tabbed-pane");

this._scriptsView = new WebInspector.NavigatorView();
this._scriptsView.addEventListener(WebInspector.NavigatorView.Events.ItemSelected, this._scriptSelected, this);

this._contentScriptsView = new WebInspector.NavigatorView();
this._contentScriptsView.addEventListener(WebInspector.NavigatorView.Events.ItemSelected, this._scriptSelected, this);

this._snippetsView = new WebInspector.SnippetsNavigatorView();
this._snippetsView.addEventListener(WebInspector.NavigatorView.Events.ItemSelected, this._scriptSelected, this);
this._snippetsView.addEventListener(WebInspector.NavigatorView.Events.FileRenamed, this._fileRenamed, this);
this._snippetsView.addEventListener(WebInspector.SnippetsNavigatorView.Events.SnippetCreationRequested, this._snippetCreationRequested, this);
this._snippetsView.addEventListener(WebInspector.SnippetsNavigatorView.Events.ItemRenamingRequested, this._itemRenamingRequested, this);

this._tabbedPane.appendTab(WebInspector.ScriptsNavigator.ScriptsTab, WebInspector.UIString("Sources"), this._scriptsView);
this._tabbedPane.selectTab(WebInspector.ScriptsNavigator.ScriptsTab);
this._tabbedPane.appendTab(WebInspector.ScriptsNavigator.ContentScriptsTab, WebInspector.UIString("Content scripts"), this._contentScriptsView);
if (WebInspector.experimentsSettings.snippetsSupport.isEnabled())
this._tabbedPane.appendTab(WebInspector.ScriptsNavigator.SnippetsTab, WebInspector.UIString("Snippets"), this._snippetsView);
}

WebInspector.ScriptsNavigator.Events = {
ScriptSelected: "ScriptSelected",
SnippetCreationRequested: "SnippetCreationRequested",
ItemRenamingRequested: "ItemRenamingRequested",
FileRenamed: "FileRenamed"
}

WebInspector.ScriptsNavigator.ScriptsTab = "scripts";
WebInspector.ScriptsNavigator.ContentScriptsTab = "contentScripts";
WebInspector.ScriptsNavigator.SnippetsTab = "snippets";

WebInspector.ScriptsNavigator.prototype = {

get view()
{
return this._tabbedPane;
},


_navigatorViewForUISourceCode: function(uiSourceCode)
{
if (uiSourceCode.isContentScript)
return this._contentScriptsView;
else if (uiSourceCode.project().type() === WebInspector.projectTypes.Snippets)
return this._snippetsView;
else
return this._scriptsView;
},


addUISourceCode: function(uiSourceCode)
{
this._navigatorViewForUISourceCode(uiSourceCode).addUISourceCode(uiSourceCode);
},


removeUISourceCode: function(uiSourceCode)
{
this._navigatorViewForUISourceCode(uiSourceCode).removeUISourceCode(uiSourceCode);
},


revealUISourceCode: function(uiSourceCode, select)
{
this._navigatorViewForUISourceCode(uiSourceCode).revealUISourceCode(uiSourceCode, select);
if (uiSourceCode.isContentScript)
this._tabbedPane.selectTab(WebInspector.ScriptsNavigator.ContentScriptsTab);
else if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
this._tabbedPane.selectTab(WebInspector.ScriptsNavigator.ScriptsTab);
},


rename: function(uiSourceCode, callback)
{
this._navigatorViewForUISourceCode(uiSourceCode).rename(uiSourceCode, callback);
},


_scriptSelected: function(event)
{
this.dispatchEventToListeners(WebInspector.ScriptsNavigator.Events.ScriptSelected, event.data);
},


_fileRenamed: function(event)
{    
this.dispatchEventToListeners(WebInspector.ScriptsNavigator.Events.FileRenamed, event.data);
},


_itemRenamingRequested: function(event)
{
this.dispatchEventToListeners(WebInspector.ScriptsNavigator.Events.ItemRenamingRequested, event.data);
},


_snippetCreationRequested: function(event)
{    
this.dispatchEventToListeners(WebInspector.ScriptsNavigator.Events.SnippetCreationRequested, event.data);
},

__proto__: WebInspector.Object.prototype
}


WebInspector.SnippetsNavigatorView = function()
{
WebInspector.NavigatorView.call(this);
this.element.addEventListener("contextmenu", this.handleContextMenu.bind(this), false);
}

WebInspector.SnippetsNavigatorView.Events = {
SnippetCreationRequested: "SnippetCreationRequested",
ItemRenamingRequested: "ItemRenamingRequested"
}

WebInspector.SnippetsNavigatorView.prototype = {

handleContextMenu: function(event, uiSourceCode)
{
var contextMenu = new WebInspector.ContextMenu(event);
if (uiSourceCode) {
contextMenu.appendItem(WebInspector.UIString("Run"), this._handleEvaluateSnippet.bind(this, uiSourceCode));
contextMenu.appendItem(WebInspector.UIString("Rename"), this._handleRenameSnippet.bind(this, uiSourceCode));
contextMenu.appendItem(WebInspector.UIString("Remove"), this._handleRemoveSnippet.bind(this, uiSourceCode));
contextMenu.appendSeparator();
}
contextMenu.appendItem(WebInspector.UIString("New"), this._handleCreateSnippet.bind(this));
contextMenu.show();
},


_handleEvaluateSnippet: function(uiSourceCode)
{
if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
return;
WebInspector.scriptSnippetModel.evaluateScriptSnippet(uiSourceCode);
},


_handleRenameSnippet: function(uiSourceCode)
{
this.dispatchEventToListeners(WebInspector.ScriptsNavigator.Events.ItemRenamingRequested, uiSourceCode);
},


_handleRemoveSnippet: function(uiSourceCode)
{
if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
return;
WebInspector.scriptSnippetModel.deleteScriptSnippet(uiSourceCode);
},

_handleCreateSnippet: function()
{
this._snippetCreationRequested();
},

_snippetCreationRequested: function()
{
this.dispatchEventToListeners(WebInspector.SnippetsNavigatorView.Events.SnippetCreationRequested, null);
},

__proto__: WebInspector.NavigatorView.prototype
}
;



WebInspector.ScriptsSearchScope = function(workspace)
{

WebInspector.SearchScope.call(this)
this._searchId = 0;
this._workspace = workspace;
}

WebInspector.ScriptsSearchScope.prototype = {

performSearch: function(searchConfig, searchResultCallback, searchFinishedCallback)
{
this.stopSearch();

var uiSourceCodes = this._sortedUISourceCodes();
var uiSourceCodeIndex = 0;

function filterOutContentScripts(uiSourceCode)
{
return !uiSourceCode.isContentScript;
}

if (!WebInspector.settings.searchInContentScripts.get())
uiSourceCodes = uiSourceCodes.filter(filterOutContentScripts);

function continueSearch()
{


if (uiSourceCodeIndex < uiSourceCodes.length) {
var uiSourceCode = uiSourceCodes[uiSourceCodeIndex++];
uiSourceCode.searchInContent(searchConfig.query, !searchConfig.ignoreCase, searchConfig.isRegex, searchCallbackWrapper.bind(this, this._searchId, uiSourceCode));
} else 
searchFinishedCallback(true);
}

function searchCallbackWrapper(searchId, uiSourceCode, searchMatches)
{
if (searchId !== this._searchId) {
searchFinishedCallback(false);
return;
}
var searchResult = new WebInspector.FileBasedSearchResultsPane.SearchResult(uiSourceCode, searchMatches);
searchResultCallback(searchResult);
if (searchId !== this._searchId) {
searchFinishedCallback(false);
return;
}
continueSearch.call(this);
}

continueSearch.call(this);
return uiSourceCodes.length;
},

stopSearch: function()
{
++this._searchId;
},


createSearchResultsPane: function(searchConfig)
{
return new WebInspector.FileBasedSearchResultsPane(searchConfig);
},


_sortedUISourceCodes: function()
{
function filterOutAnonymous(uiSourceCode)
{
return !!uiSourceCode.originURL();
}

function comparator(a, b)
{
return a.originURL().compareTo(b.originURL());   
}

var projects = this._workspace.projects();
var uiSourceCodes = [];
for (var i = 0; i < projects.length; ++i) {
if (projects[i].isServiceProject())
continue;
uiSourceCodes = uiSourceCodes.concat(projects[i].uiSourceCodes());
}

uiSourceCodes = uiSourceCodes.filter(filterOutAnonymous);
uiSourceCodes.sort(comparator);

return uiSourceCodes;
},

__proto__: WebInspector.SearchScope.prototype
}
;



WebInspector.SnippetJavaScriptSourceFrame = function(scriptsPanel, uiSourceCode)
{
WebInspector.JavaScriptSourceFrame.call(this, scriptsPanel, uiSourceCode);

this._uiSourceCode = uiSourceCode;
this._runButton = new WebInspector.StatusBarButton(WebInspector.UIString("Run"), "evaluate-snippet-status-bar-item");
this._runButton.addEventListener("click", this._runButtonClicked, this);
this.textEditor.element.addEventListener("keydown", this._onKeyDown.bind(this), true);
this._snippetsShortcuts = {};
var runSnippetShortcutDescriptor = WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Enter, WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)
this._snippetsShortcuts[runSnippetShortcutDescriptor.key] = this._runSnippet.bind(this);
}

WebInspector.SnippetJavaScriptSourceFrame.prototype = {

statusBarItems: function()
{
return [this._runButton.element].concat(WebInspector.JavaScriptSourceFrame.prototype.statusBarItems.call(this));
},

_runButtonClicked: function()
{
this._runSnippet();
},

_runSnippet: function()
{
WebInspector.scriptSnippetModel.evaluateScriptSnippet(this._uiSourceCode);
},


_onKeyDown: function(event)
{
var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
var handler = this._snippetsShortcuts[shortcutKey];
if (handler) {
handler(event);
event.handled = true;
}
},

__proto__: WebInspector.JavaScriptSourceFrame.prototype
}
;



WebInspector.StyleSheetOutlineDialog = function(view, uiSourceCode)
{
WebInspector.SelectionDialogContentProvider.call(this);

this._rules = [];
this._view = view;
this._uiSourceCode = uiSourceCode;
}


WebInspector.StyleSheetOutlineDialog.show = function(view, uiSourceCode)
{
if (WebInspector.Dialog.currentInstance())
return null;
var delegate = new WebInspector.StyleSheetOutlineDialog(view, uiSourceCode);
var filteredItemSelectionDialog = new WebInspector.FilteredItemSelectionDialog(delegate);
WebInspector.Dialog.show(view.element, filteredItemSelectionDialog);
}

WebInspector.StyleSheetOutlineDialog.prototype = {

itemTitleAt: function(itemIndex)
{
return this._rules[itemIndex].selectorText;
},


itemSuffixAt: function(itemIndex)
{
return "";
},


itemSubtitleAt: function(itemIndex)
{
return ":" + (this._rules[itemIndex].sourceLine + 1);
},


itemKeyAt: function(itemIndex)
{
return this._rules[itemIndex].selectorText;
},


itemsCount: function()
{
return this._rules.length;
},


requestItems: function(callback)
{
function didGetAllStyleSheets(error, infos)
{
if (error) {
callback(0, 0);
return;
}

for (var i = 0; i < infos.length; ++i) {
var info = infos[i];
if (info.sourceURL === this._uiSourceCode.url) {
WebInspector.CSSStyleSheet.createForId(info.styleSheetId, didGetStyleSheet.bind(this));
return;
}
}
callback(0, 0);
}

CSSAgent.getAllStyleSheets(didGetAllStyleSheets.bind(this));


function didGetStyleSheet(styleSheet)
{
if (!styleSheet) {
callback(0, 0);
return;
}

this._rules = styleSheet.rules;
callback(0, 1);
}
},


selectItem: function(itemIndex, promptValue)
{
var lineNumber = this._rules[itemIndex].sourceLine;
if (!isNaN(lineNumber) && lineNumber >= 0)
this._view.highlightLine(lineNumber);
this._view.focus();
},


rewriteQuery: function(query)
{
return query;
},

dispose: function()
{
}
}
;



WebInspector.TabbedEditorContainerDelegate = function() { }

WebInspector.TabbedEditorContainerDelegate.prototype = {

viewForFile: function(uiSourceCode) { }
}


WebInspector.TabbedEditorContainer = function(delegate, settingName)
{
WebInspector.Object.call(this);
this._delegate = delegate;

this._tabbedPane = new WebInspector.TabbedPane();
this._tabbedPane.setTabDelegate(new WebInspector.EditorContainerTabDelegate(this));

this._tabbedPane.closeableTabs = true;
this._tabbedPane.element.id = "scripts-editor-container-tabbed-pane";

this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabClosed, this._tabClosed, this);
this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);

this._tabIds = new Map();
this._files = {};
this._loadedURIs = {};

this._previouslyViewedFilesSetting = WebInspector.settings.createSetting(settingName, []);
this._history = WebInspector.TabbedEditorContainer.History.fromObject(this._previouslyViewedFilesSetting.get());
}


WebInspector.TabbedEditorContainer.Events = {
EditorSelected: "EditorSelected",
EditorClosed: "EditorClosed"
}

WebInspector.TabbedEditorContainer._tabId = 0;

WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount = 30;

WebInspector.TabbedEditorContainer.prototype = {

get view()
{
return this._tabbedPane;
},


get visibleView()
{
return this._tabbedPane.visibleView;
},


show: function(parentElement)
{
this._tabbedPane.show(parentElement);
},


showFile: function(uiSourceCode)
{
this._innerShowFile(uiSourceCode, true);
},

_addScrollAndSelectionListeners: function()
{
if (!this._currentView)
return;
this._currentView.addEventListener(WebInspector.SourceFrame.Events.ScrollChanged, this._scrollChanged, this);
this._currentView.addEventListener(WebInspector.SourceFrame.Events.SelectionChanged, this._selectionChanged, this);
},

_removeScrollAndSelectionListeners: function()
{
if (!this._currentView)
return;
this._currentView.removeEventListener(WebInspector.SourceFrame.Events.ScrollChanged, this._scrollChanged, this);
this._currentView.removeEventListener(WebInspector.SourceFrame.Events.SelectionChanged, this._selectionChanged, this);
},

_scrollChanged: function(event)
{
var lineNumber =   (event.data);
this._history.updateScrollLineNumber(this._currentFile.uri(), lineNumber);
this._history.save(this._previouslyViewedFilesSetting);
},

_selectionChanged: function(event)
{
var range =   (event.data);
this._history.updateSelectionRange(this._currentFile.uri(), range);
this._history.save(this._previouslyViewedFilesSetting);
},


_innerShowFile: function(uiSourceCode, userGesture)
{
if (this._currentFile === uiSourceCode)
return;
this._removeScrollAndSelectionListeners();
this._currentFile = uiSourceCode;

var tabId = this._tabIds.get(uiSourceCode) || this._appendFileTab(uiSourceCode, userGesture);

this._tabbedPane.selectTab(tabId, userGesture);
if (userGesture)
this._editorSelectedByUserAction();

this._currentView = this.visibleView;
this._addScrollAndSelectionListeners();

this.dispatchEventToListeners(WebInspector.TabbedEditorContainer.Events.EditorSelected, this._currentFile);
},


_titleForFile: function(uiSourceCode)
{
const maxDisplayNameLength = 30;
const minDisplayQueryParamLength = 5;

var title = uiSourceCode.name();
title = title ? title.trimMiddle(maxDisplayNameLength) : WebInspector.UIString("(program)");
if (uiSourceCode.isDirty())
title += "*";
return title;
},


_maybeCloseTab: function(id, nextTabId)
{
var uiSourceCode = this._files[id];
var shouldPrompt = uiSourceCode.isDirty() && uiSourceCode.project().canSetFileContent();

if (!shouldPrompt || confirm(WebInspector.UIString("Are you sure you want to close unsaved file: %s?", uiSourceCode.name()))) {
uiSourceCode.resetWorkingCopy();
if (nextTabId)
this._tabbedPane.selectTab(nextTabId, true);
this._tabbedPane.closeTab(id, true);
return true;
}
return false;
},


_closeTabs: function(ids)
{
var dirtyTabs = [];
var cleanTabs = [];
for (var i = 0; i < ids.length; ++i) {
var id = ids[i];
var uiSourceCode = this._files[id];
if (uiSourceCode.isDirty())
dirtyTabs.push(id);
else
cleanTabs.push(id);
}
if (dirtyTabs.length)
this._tabbedPane.selectTab(dirtyTabs[0], true);
this._tabbedPane.closeTabs(cleanTabs, true);
for (var i = 0; i < dirtyTabs.length; ++i) {
var nextTabId = i + 1 < dirtyTabs.length ? dirtyTabs[i + 1] : null;
if (!this._maybeCloseTab(dirtyTabs[i], nextTabId))
break;
}
},


addUISourceCode: function(uiSourceCode)
{
if (this._userSelectedFiles || this._loadedURIs[uiSourceCode.uri()])
return;
this._loadedURIs[uiSourceCode.uri()] = true;

var index = this._history.index(uiSourceCode.uri())
if (index === -1)
return;

var tabId = this._tabIds.get(uiSourceCode) || this._appendFileTab(uiSourceCode, false);

if (!this._currentFile)
return;


if (!index) {
this._innerShowFile(uiSourceCode, false);
return;
}

var currentProjectType = this._currentFile.project().type();
var addedProjectType = uiSourceCode.project().type();
var snippetsProjectType = WebInspector.projectTypes.Snippets;
if (this._history.index(this._currentFile.uri()) && currentProjectType === snippetsProjectType && addedProjectType !== snippetsProjectType)
this._innerShowFile(uiSourceCode, false);
},


removeUISourceCode: function(uiSourceCode)
{
this.removeUISourceCodes([uiSourceCode]);
},


removeUISourceCodes: function(uiSourceCodes)
{
var tabIds = [];
for (var i = 0; i < uiSourceCodes.length; ++i) {
var uiSourceCode = uiSourceCodes[i];
delete this._loadedURIs[uiSourceCode.uri()];
var tabId = this._tabIds.get(uiSourceCode);
if (tabId)
tabIds.push(tabId);
}
this._tabbedPane.closeTabs(tabIds);
},


_editorClosedByUserAction: function(uiSourceCode)
{
this._userSelectedFiles = true;
this._history.remove(uiSourceCode.uri());
this._updateHistory();
},

_editorSelectedByUserAction: function()
{
this._userSelectedFiles = true;
this._updateHistory();
},

_updateHistory: function()
{
var tabIds = this._tabbedPane.lastOpenedTabIds(WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount);

function tabIdToURI(tabId)
{
return this._files[tabId].uri();
}

this._history.update(tabIds.map(tabIdToURI.bind(this)));
this._history.save(this._previouslyViewedFilesSetting);
},


_tooltipForFile: function(uiSourceCode)
{
return uiSourceCode.originURL();
},


_appendFileTab: function(uiSourceCode, userGesture)
{
var view = this._delegate.viewForFile(uiSourceCode);
var title = this._titleForFile(uiSourceCode);
var tooltip = this._tooltipForFile(uiSourceCode);

var tabId = this._generateTabId();
this._tabIds.put(uiSourceCode, tabId);
this._files[tabId] = uiSourceCode;

var savedScrollLineNumber = this._history.scrollLineNumber(uiSourceCode.uri());
if (savedScrollLineNumber)
view.scrollToLine(savedScrollLineNumber);
var savedSelectionRange = this._history.selectionRange(uiSourceCode.uri());
if (savedSelectionRange)
view.setSelection(savedSelectionRange);

this._tabbedPane.appendTab(tabId, title, view, tooltip, userGesture);

this._addUISourceCodeListeners(uiSourceCode);
return tabId;
},


_tabClosed: function(event)
{
var tabId =   (event.data.tabId);
var userGesture =   (event.data.isUserGesture);

var uiSourceCode = this._files[tabId];
if (this._currentFile === uiSourceCode) {
this._removeScrollAndSelectionListeners();
delete this._currentView;
delete this._currentFile;
}
this._tabIds.remove(uiSourceCode);
delete this._files[tabId];

this._removeUISourceCodeListeners(uiSourceCode);

this.dispatchEventToListeners(WebInspector.TabbedEditorContainer.Events.EditorClosed, uiSourceCode);

if (userGesture)
this._editorClosedByUserAction(uiSourceCode);
},


_tabSelected: function(event)
{
var tabId =   (event.data.tabId);
var userGesture =   (event.data.isUserGesture);

var uiSourceCode = this._files[tabId];
this._innerShowFile(uiSourceCode, userGesture);
},


_addUISourceCodeListeners: function(uiSourceCode)
{
uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._uiSourceCodeWorkingCopyChanged, this);
uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._uiSourceCodeWorkingCopyCommitted, this);
uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.FormattedChanged, this._uiSourceCodeFormattedChanged, this);
},


_removeUISourceCodeListeners: function(uiSourceCode)
{
uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._uiSourceCodeWorkingCopyChanged, this);
uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._uiSourceCodeWorkingCopyCommitted, this);
uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.FormattedChanged, this._uiSourceCodeFormattedChanged, this);
},


_updateFileTitle: function(uiSourceCode)
{
var tabId = this._tabIds.get(uiSourceCode);
if (tabId) {
var title = this._titleForFile(uiSourceCode);
this._tabbedPane.changeTabTitle(tabId, title);
}
},

_uiSourceCodeTitleChanged: function(event)
{
var uiSourceCode =   (event.target);
this._updateFileTitle(uiSourceCode);
},

_uiSourceCodeWorkingCopyChanged: function(event)
{
var uiSourceCode =   (event.target);
this._updateFileTitle(uiSourceCode);
},

_uiSourceCodeWorkingCopyCommitted: function(event)
{
var uiSourceCode =   (event.target);
this._updateFileTitle(uiSourceCode);
},

_uiSourceCodeFormattedChanged: function(event)
{
var uiSourceCode =   (event.target);
this._updateFileTitle(uiSourceCode);
},

reset: function()
{
delete this._userSelectedFiles;
},


_generateTabId: function()
{
return "tab_" + (WebInspector.TabbedEditorContainer._tabId++);
},


currentFile: function()
{
return this._currentFile;
},

__proto__: WebInspector.Object.prototype
}


WebInspector.TabbedEditorContainer.HistoryItem = function(url, selectionRange, scrollLineNumber)
{
this.url = url;
this._isSerializable = url.length < WebInspector.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit;
this.selectionRange = selectionRange;
this.scrollLineNumber = scrollLineNumber;
}

WebInspector.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit = 4096;


WebInspector.TabbedEditorContainer.HistoryItem.fromObject = function (serializedHistoryItem)
{
var selectionRange = serializedHistoryItem.selectionRange ? WebInspector.TextRange.fromObject(serializedHistoryItem.selectionRange) : null;
return new WebInspector.TabbedEditorContainer.HistoryItem(serializedHistoryItem.url, selectionRange, serializedHistoryItem.scrollLineNumber);
}

WebInspector.TabbedEditorContainer.HistoryItem.prototype = {

serializeToObject: function()
{
if (!this._isSerializable)
return null;
var serializedHistoryItem = {};
serializedHistoryItem.url = this.url;
serializedHistoryItem.selectionRange = this.selectionRange;
serializedHistoryItem.scrollLineNumber = this.scrollLineNumber;
return serializedHistoryItem;
},

__proto__: WebInspector.Object.prototype
}


WebInspector.TabbedEditorContainer.History = function(items)
{
this._items = items;
this._rebuildItemIndex();
}


WebInspector.TabbedEditorContainer.History.fromObject = function(serializedHistory)
{
var items = [];
for (var i = 0; i < serializedHistory.length; ++i)
items.push(WebInspector.TabbedEditorContainer.HistoryItem.fromObject(serializedHistory[i]));
return new WebInspector.TabbedEditorContainer.History(items);
}

WebInspector.TabbedEditorContainer.History.prototype = {

index: function(url)
{
var index = this._itemsIndex[url];
if (typeof index === "number")
return index;
return -1;
},

_rebuildItemIndex: function()
{
this._itemsIndex = {};
for (var i = 0; i < this._items.length; ++i) {
console.assert(!this._itemsIndex.hasOwnProperty(this._items[i].url));
this._itemsIndex[this._items[i].url] = i;
}
},


selectionRange: function(url)
{
var index = this.index(url);
return index !== -1 ? this._items[index].selectionRange : undefined;
},


updateSelectionRange: function(url, selectionRange)
{
if (!selectionRange)
return;
var index = this.index(url);
if (index === -1)
return;
this._items[index].selectionRange = selectionRange;
},


scrollLineNumber: function(url)
{
var index = this.index(url);
return index !== -1 ? this._items[index].scrollLineNumber : undefined;
},


updateScrollLineNumber: function(url, scrollLineNumber)
{
var index = this.index(url);
if (index === -1)
return;
this._items[index].scrollLineNumber = scrollLineNumber;
},


update: function(urls)
{
for (var i = urls.length - 1; i >= 0; --i) {
var index = this.index(urls[i]);
var item;
if (index !== -1) {
item = this._items[index];
this._items.splice(index, 1);
} else
item = new WebInspector.TabbedEditorContainer.HistoryItem(urls[i]);
this._items.unshift(item);
this._rebuildItemIndex();
}
},


remove: function(url)
{
var index = this.index(url);
if (index !== -1) {
this._items.splice(index, 1);
this._rebuildItemIndex();
}
},


save: function(setting)
{
setting.set(this._serializeToObject());
},


_serializeToObject: function()
{
var serializedHistory = [];
for (var i = 0; i < this._items.length; ++i) {
var serializedItem = this._items[i].serializeToObject();
if (serializedItem)
serializedHistory.push(serializedItem);
if (serializedHistory.length === WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount)
break;
}
return serializedHistory;
},

__proto__: WebInspector.Object.prototype
}


WebInspector.EditorContainerTabDelegate = function(editorContainer)
{
this._editorContainer = editorContainer;
}

WebInspector.EditorContainerTabDelegate.prototype = {

closeTabs: function(tabbedPane, ids)
{
this._editorContainer._closeTabs(ids);
}
}
;



WebInspector.WatchExpressionsSidebarPane = function()
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Watch Expressions"));

this.section = new WebInspector.WatchExpressionsSection();
this.bodyElement.appendChild(this.section.element);

var refreshButton = document.createElement("button");
refreshButton.className = "pane-title-button refresh";
refreshButton.addEventListener("click", this._refreshButtonClicked.bind(this), false);
refreshButton.title = WebInspector.UIString("Refresh");
this.titleElement.appendChild(refreshButton);

var addButton = document.createElement("button");
addButton.className = "pane-title-button add";
addButton.addEventListener("click", this._addButtonClicked.bind(this), false);
this.titleElement.appendChild(addButton);
addButton.title = WebInspector.UIString("Add watch expression");

this._requiresUpdate = true;
}

WebInspector.WatchExpressionsSidebarPane.prototype = {
wasShown: function()
{
this._refreshExpressionsIfNeeded();
},

reset: function()
{
this.refreshExpressions();
},

refreshExpressions: function()
{
this._requiresUpdate = true;
this._refreshExpressionsIfNeeded();
},

addExpression: function(expression)
{
this.section.addExpression(expression);
this.expand();
},

_refreshExpressionsIfNeeded: function()
{
if (this._requiresUpdate && this.isShowing()) {
this.section.update();
delete this._requiresUpdate;
} else
this._requiresUpdate = true;
},

_addButtonClicked: function(event)
{
event.consume();
this.expand();
this.section.addNewExpressionAndEdit();
},

_refreshButtonClicked: function(event)
{
event.consume();
this.refreshExpressions();
},

__proto__: WebInspector.SidebarPane.prototype
}


WebInspector.WatchExpressionsSection = function()
{
this._watchObjectGroupId = "watch-group";

WebInspector.ObjectPropertiesSection.call(this, WebInspector.RemoteObject.fromPrimitiveValue(""));

this.treeElementConstructor = WebInspector.WatchedPropertyTreeElement;
this._expandedExpressions = {};
this._expandedProperties = {};

this.emptyElement = document.createElement("div");
this.emptyElement.className = "info";
this.emptyElement.textContent = WebInspector.UIString("No Watch Expressions");

this.watchExpressions = WebInspector.settings.watchExpressions.get();

this.headerElement.className = "hidden";
this.editable = true;
this.expanded = true;
this.propertiesElement.addStyleClass("watch-expressions");

this.element.addEventListener("mousemove", this._mouseMove.bind(this), true);
this.element.addEventListener("mouseout", this._mouseOut.bind(this), true);
this.element.addEventListener("dblclick", this._sectionDoubleClick.bind(this), false);
this.emptyElement.addEventListener("contextmenu", this._emptyElementContextMenu.bind(this), false);
}

WebInspector.WatchExpressionsSection.NewWatchExpression = "\xA0";

WebInspector.WatchExpressionsSection.prototype = {
update: function(e)
{
if (e)
e.consume();

function appendResult(expression, watchIndex, result, wasThrown)
{
if (!result)
return;

var property = new WebInspector.RemoteObjectProperty(expression, result);
property.watchIndex = watchIndex;
property.wasThrown = wasThrown;








properties.push(property);

if (properties.length == propertyCount) {
this.updateProperties(properties, [], WebInspector.WatchExpressionTreeElement, WebInspector.WatchExpressionsSection.CompareProperties);



if (this._newExpressionAdded) {
delete this._newExpressionAdded;

var treeElement = this.findAddedTreeElement();
if (treeElement)
treeElement.startEditing();
}


if (this._lastMouseMovePageY)
this._updateHoveredElement(this._lastMouseMovePageY);
}
}


RuntimeAgent.releaseObjectGroup(this._watchObjectGroupId)
var properties = [];



var propertyCount = 0;
for (var i = 0; i < this.watchExpressions.length; ++i) {
if (!this.watchExpressions[i])
continue;
++propertyCount;
}



for (var i = 0; i < this.watchExpressions.length; ++i) {
var expression = this.watchExpressions[i];
if (!expression)
continue;

WebInspector.runtimeModel.evaluate(expression, this._watchObjectGroupId, false, true, false, false, appendResult.bind(this, expression, i));
}

if (!propertyCount) {
if (!this.emptyElement.parentNode)
this.element.appendChild(this.emptyElement);
} else {
if (this.emptyElement.parentNode)
this.element.removeChild(this.emptyElement);
}




this.expanded = (propertyCount != 0);
},

addExpression: function(expression)
{
this.watchExpressions.push(expression);
this.saveExpressions();
this.update();
},

addNewExpressionAndEdit: function()
{
this._newExpressionAdded = true;
this.watchExpressions.push(WebInspector.WatchExpressionsSection.NewWatchExpression);
this.update();
},

_sectionDoubleClick: function(event)
{
if (event.target !== this.element && event.target !== this.propertiesElement && event.target !== this.emptyElement)
return;
event.consume();
this.addNewExpressionAndEdit();
},

updateExpression: function(element, value)
{
if (value === null) {
var index = element.property.watchIndex;
this.watchExpressions.splice(index, 1);
}
else
this.watchExpressions[element.property.watchIndex] = value;
this.saveExpressions();
this.update();
},

_deleteAllExpressions: function()
{
this.watchExpressions = [];
this.saveExpressions();
this.update();
},

findAddedTreeElement: function()
{
var children = this.propertiesTreeOutline.children;
for (var i = 0; i < children.length; ++i) {
if (children[i].property.name === WebInspector.WatchExpressionsSection.NewWatchExpression)
return children[i];
}
},

saveExpressions: function()
{
var toSave = [];
for (var i = 0; i < this.watchExpressions.length; i++)
if (this.watchExpressions[i])
toSave.push(this.watchExpressions[i]);

WebInspector.settings.watchExpressions.set(toSave);
return toSave.length;
},

_mouseMove: function(e)
{
if (this.propertiesElement.firstChild)
this._updateHoveredElement(e.pageY);
},

_mouseOut: function()
{
if (this._hoveredElement) {
this._hoveredElement.removeStyleClass("hovered");
delete this._hoveredElement;
}
delete this._lastMouseMovePageY;
},

_updateHoveredElement: function(pageY)
{
var candidateElement = this.propertiesElement.firstChild;
while (true) {
var next = candidateElement.nextSibling;
while (next && !next.clientHeight)
next = next.nextSibling;
if (!next || next.totalOffsetTop() > pageY)
break;
candidateElement = next;
}

if (this._hoveredElement !== candidateElement) {
if (this._hoveredElement)
this._hoveredElement.removeStyleClass("hovered");
if (candidateElement)
candidateElement.addStyleClass("hovered");
this._hoveredElement = candidateElement;
}

this._lastMouseMovePageY = pageY;
},

_emptyElementContextMenu: function(event)
{
var contextMenu = new WebInspector.ContextMenu(event);
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add watch expression" : "Add Watch Expression"), this.addNewExpressionAndEdit.bind(this));
contextMenu.show();
},

__proto__: WebInspector.ObjectPropertiesSection.prototype
}

WebInspector.WatchExpressionsSection.CompareProperties = function(propertyA, propertyB)
{
if (propertyA.watchIndex == propertyB.watchIndex)
return 0;
else if (propertyA.watchIndex < propertyB.watchIndex)
return -1;
else
return 1;
}


WebInspector.WatchExpressionTreeElement = function(property)
{
WebInspector.ObjectPropertyTreeElement.call(this, property);
}

WebInspector.WatchExpressionTreeElement.prototype = {
onexpand: function()
{
WebInspector.ObjectPropertyTreeElement.prototype.onexpand.call(this);
this.treeOutline.section._expandedExpressions[this._expression()] = true;
},

oncollapse: function()
{
WebInspector.ObjectPropertyTreeElement.prototype.oncollapse.call(this);
delete this.treeOutline.section._expandedExpressions[this._expression()];
},

onattach: function()
{
WebInspector.ObjectPropertyTreeElement.prototype.onattach.call(this);
if (this.treeOutline.section._expandedExpressions[this._expression()])
this.expanded = true;
},

_expression: function()
{
return this.property.name;
},

update: function()
{
WebInspector.ObjectPropertyTreeElement.prototype.update.call(this);

if (this.property.wasThrown) {
this.valueElement.textContent = WebInspector.UIString("<not available>");
this.listItemElement.addStyleClass("dimmed");
} else
this.listItemElement.removeStyleClass("dimmed");

var deleteButton = document.createElement("input");
deleteButton.type = "button";
deleteButton.title = WebInspector.UIString("Delete watch expression.");
deleteButton.addStyleClass("enabled-button");
deleteButton.addStyleClass("delete-button");
deleteButton.addEventListener("click", this._deleteButtonClicked.bind(this), false);
this.listItemElement.addEventListener("contextmenu", this._contextMenu.bind(this), false);
this.listItemElement.insertBefore(deleteButton, this.listItemElement.firstChild);
},


populateContextMenu: function(contextMenu)
{
if (!this.isEditing()) {
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add watch expression" : "Add Watch Expression"), this.treeOutline.section.addNewExpressionAndEdit.bind(this.treeOutline.section));
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Delete watch expression" : "Delete Watch Expression"), this._deleteButtonClicked.bind(this));
}
if (this.treeOutline.section.watchExpressions.length > 1)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Delete all watch expressions" : "Delete All Watch Expressions"), this._deleteAllButtonClicked.bind(this));
},

_contextMenu: function(event)
{
var contextMenu = new WebInspector.ContextMenu(event);
this.populateContextMenu(contextMenu);
contextMenu.show();
},

_deleteAllButtonClicked: function()
{
this.treeOutline.section._deleteAllExpressions();
},

_deleteButtonClicked: function()
{
this.treeOutline.section.updateExpression(this, null);
},

renderPromptAsBlock: function()
{
return true;
},


elementAndValueToEdit: function(event)
{
return [this.nameElement, this.property.name.trim()];
},

editingCancelled: function(element, context)
{
if (!context.elementToEdit.textContent)
this.treeOutline.section.updateExpression(this, null);

WebInspector.ObjectPropertyTreeElement.prototype.editingCancelled.call(this, element, context);
},

applyExpression: function(expression, updateInterface)
{
expression = expression.trim();

if (!expression)
expression = null;

this.property.name = expression;
this.treeOutline.section.updateExpression(this, expression);
},

__proto__: WebInspector.ObjectPropertyTreeElement.prototype
}



WebInspector.WatchedPropertyTreeElement = function(property)
{
WebInspector.ObjectPropertyTreeElement.call(this, property);
}

WebInspector.WatchedPropertyTreeElement.prototype = {
onattach: function()
{
WebInspector.ObjectPropertyTreeElement.prototype.onattach.call(this);
if (this.hasChildren && this.propertyPath() in this.treeOutline.section._expandedProperties)
this.expand();
},

onexpand: function()
{
WebInspector.ObjectPropertyTreeElement.prototype.onexpand.call(this);
this.treeOutline.section._expandedProperties[this.propertyPath()] = true;
},

oncollapse: function()
{
WebInspector.ObjectPropertyTreeElement.prototype.oncollapse.call(this);
delete this.treeOutline.section._expandedProperties[this.propertyPath()];
},

__proto__: WebInspector.ObjectPropertyTreeElement.prototype
}
;



WebInspector.Worker = function(id, url, shared)
{
this.id = id;
this.url = url;
this.shared = shared;
}


WebInspector.WorkersSidebarPane = function(workerManager)
{
WebInspector.SidebarPane.call(this, WebInspector.UIString("Workers"));

this._enableWorkersCheckbox = new WebInspector.Checkbox(
WebInspector.UIString("Pause on start"),
"sidebar-label",
WebInspector.UIString("Automatically attach to new workers and pause them. Enabling this option will force opening inspector for all new workers."));
this._enableWorkersCheckbox.element.id = "pause-workers-checkbox";
this.bodyElement.appendChild(this._enableWorkersCheckbox.element);
this._enableWorkersCheckbox.addEventListener(this._autoattachToWorkersClicked.bind(this));
this._enableWorkersCheckbox.checked = false;

var note = this.bodyElement.createChild("div");
note.id = "shared-workers-list";
note.addStyleClass("sidebar-label")
note.textContent = WebInspector.UIString("Shared workers can be inspected in the Task Manager");

var separator = this.bodyElement.createChild("div", "sidebar-separator");
separator.textContent = WebInspector.UIString("Dedicated worker inspectors");

this._workerListElement = document.createElement("ol");
this._workerListElement.tabIndex = 0;
this._workerListElement.addStyleClass("properties-tree");
this._workerListElement.addStyleClass("sidebar-label");
this.bodyElement.appendChild(this._workerListElement);

this._idToWorkerItem = {};
this._workerManager = workerManager;

workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerAdded, this._workerAdded, this);
workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._workerRemoved, this);
workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._workersCleared, this);
}

WebInspector.WorkersSidebarPane.prototype = {
_workerAdded: function(event)
{
this._addWorker(event.data.workerId, event.data.url, event.data.inspectorConnected);
},

_workerRemoved: function(event)
{
var workerItem = this._idToWorkerItem[event.data];
delete this._idToWorkerItem[event.data];
workerItem.parentElement.removeChild(workerItem);
},

_workersCleared: function(event)
{
this._idToWorkerItem = {};
this._workerListElement.removeChildren();
},

_addWorker: function(workerId, url, inspectorConnected)
{
var item = this._workerListElement.createChild("div", "dedicated-worker-item");
var link = item.createChild("a");
link.textContent = url;
link.href = "#";
link.target = "_blank";
link.addEventListener("click", this._workerItemClicked.bind(this, workerId), true);
this._idToWorkerItem[workerId] = item;
},

_workerItemClicked: function(workerId, event)
{
event.preventDefault();
this._workerManager.openWorkerInspector(workerId);
},

_autoattachToWorkersClicked: function(event)
{
WorkerAgent.setAutoconnectToWorkers(this._enableWorkersCheckbox.checked);
},

__proto__: WebInspector.SidebarPane.prototype
}
;


WebInspector.ScriptsPanel = function(workspaceForTest)
{
WebInspector.Panel.call(this, "scripts");
this.registerRequiredCSS("scriptsPanel.css");

WebInspector.settings.navigatorWasOnceHidden = WebInspector.settings.createSetting("navigatorWasOnceHidden", false);
WebInspector.settings.debuggerSidebarHidden = WebInspector.settings.createSetting("debuggerSidebarHidden", false);

this._workspace = workspaceForTest || WebInspector.workspace;

function viewGetter()
{
return this.visibleView;
}
WebInspector.GoToLineDialog.install(this, viewGetter.bind(this));

var helpSection = WebInspector.shortcutsScreen.section(WebInspector.UIString("Sources Panel"));
this.debugToolbar = this._createDebugToolbar();

const initialDebugSidebarWidth = 225;
const minimumDebugSidebarWidthPercent = 50;
this.createSidebarView(this.element, WebInspector.SidebarView.SidebarPosition.End, initialDebugSidebarWidth);
this.splitView.element.id = "scripts-split-view";
this.splitView.setMinimumSidebarWidth(Preferences.minScriptsSidebarWidth);
this.splitView.setMinimumMainWidthPercent(minimumDebugSidebarWidthPercent);

this.debugSidebarResizeWidgetElement = document.createElement("div");
this.debugSidebarResizeWidgetElement.id = "scripts-debug-sidebar-resizer-widget";
this.splitView.installResizer(this.debugSidebarResizeWidgetElement);


const initialNavigatorWidth = 225;
const minimumViewsContainerWidthPercent = 50;
this.editorView = new WebInspector.SidebarView(WebInspector.SidebarView.SidebarPosition.Start, "scriptsPanelNavigatorSidebarWidth", initialNavigatorWidth);
this.editorView.element.tabIndex = 0;

this.editorView.setMinimumSidebarWidth(Preferences.minScriptsSidebarWidth);
this.editorView.setMinimumMainWidthPercent(minimumViewsContainerWidthPercent);
this.editorView.show(this.splitView.mainElement);

this._navigator = new WebInspector.ScriptsNavigator();
this._navigator.view.show(this.editorView.sidebarElement);

this._editorContainer = new WebInspector.TabbedEditorContainer(this, "previouslyViewedFiles");
this._editorContainer.show(this.editorView.mainElement);

this._navigatorController = new WebInspector.NavigatorOverlayController(this.editorView, this._navigator.view, this._editorContainer.view);

this._navigator.addEventListener(WebInspector.ScriptsNavigator.Events.ScriptSelected, this._scriptSelected, this);
this._navigator.addEventListener(WebInspector.ScriptsNavigator.Events.SnippetCreationRequested, this._snippetCreationRequested, this);
this._navigator.addEventListener(WebInspector.ScriptsNavigator.Events.ItemRenamingRequested, this._itemRenamingRequested, this);
this._navigator.addEventListener(WebInspector.ScriptsNavigator.Events.FileRenamed, this._fileRenamed, this);

this._editorContainer.addEventListener(WebInspector.TabbedEditorContainer.Events.EditorSelected, this._editorSelected, this);
this._editorContainer.addEventListener(WebInspector.TabbedEditorContainer.Events.EditorClosed, this._editorClosed, this);

this.splitView.mainElement.appendChild(this.debugSidebarResizeWidgetElement);

this.sidebarPanes = {};
this.sidebarPanes.watchExpressions = new WebInspector.WatchExpressionsSidebarPane();
this.sidebarPanes.callstack = new WebInspector.CallStackSidebarPane();
this.sidebarPanes.scopechain = new WebInspector.ScopeChainSidebarPane();
this.sidebarPanes.jsBreakpoints = new WebInspector.JavaScriptBreakpointsSidebarPane(WebInspector.breakpointManager, this._showSourceLine.bind(this));
this.sidebarPanes.domBreakpoints = WebInspector.domBreakpointsSidebarPane.createProxy(this);
this.sidebarPanes.xhrBreakpoints = new WebInspector.XHRBreakpointsSidebarPane();
this.sidebarPanes.eventListenerBreakpoints = new WebInspector.EventListenerBreakpointsSidebarPane();

if (Capabilities.canInspectWorkers && !WebInspector.WorkerManager.isWorkerFrontend()) {
WorkerAgent.enable();
this.sidebarPanes.workerList = new WebInspector.WorkersSidebarPane(WebInspector.workerManager);
}

this.sidebarPanes.callstack.registerShortcuts(this.registerShortcuts.bind(this));
this.registerShortcuts(WebInspector.ScriptsPanelDescriptor.ShortcutKeys.EvaluateSelectionInConsole, this._evaluateSelectionInConsole.bind(this));
this.registerShortcuts(WebInspector.ScriptsPanelDescriptor.ShortcutKeys.GoToMember, this._showOutlineDialog.bind(this));
this.registerShortcuts(WebInspector.ScriptsPanelDescriptor.ShortcutKeys.ToggleBreakpoint, this._toggleBreakpoint.bind(this));

this._pauseOnExceptionButton = new WebInspector.StatusBarButton("", "scripts-pause-on-exceptions-status-bar-item", 3);
this._pauseOnExceptionButton.addEventListener("click", this._togglePauseOnExceptions, this);

this._toggleFormatSourceButton = new WebInspector.StatusBarButton(WebInspector.UIString("Pretty print"), "scripts-toggle-pretty-print-status-bar-item");
this._toggleFormatSourceButton.toggled = false;
this._toggleFormatSourceButton.addEventListener("click", this._toggleFormatSource, this);

this._scriptViewStatusBarItemsContainer = document.createElement("div");
this._scriptViewStatusBarItemsContainer.className = "inline-block";

this._scriptViewStatusBarTextContainer = document.createElement("div");
this._scriptViewStatusBarTextContainer.className = "inline-block";

this._installDebuggerSidebarController();

WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._dockSideChanged.bind(this));
WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));
this._dockSideChanged();

this._sourceFramesByUISourceCode = new Map();
this._updateDebuggerButtons();
this._pauseOnExceptionStateChanged();
if (WebInspector.debuggerModel.isPaused())
this._debuggerPaused();

WebInspector.settings.pauseOnExceptionStateString.addChangeListener(this._pauseOnExceptionStateChanged, this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerWasEnabled, this._debuggerWasEnabled, this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerWasDisabled, this._debuggerWasDisabled, this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.CallFrameSelected, this._callFrameSelected, this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.ConsoleCommandEvaluatedInSelectedCallFrame, this._consoleCommandEvaluatedInSelectedCallFrame, this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.ExecutionLineChanged, this._executionLineChanged, this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.BreakpointsActiveStateChanged, this._breakpointsActiveStateChanged, this);

WebInspector.startBatchUpdate();
var uiSourceCodes = this._workspace.uiSourceCodes();
for (var i = 0; i < uiSourceCodes.length; ++i)
this._addUISourceCode(uiSourceCodes[i]);
WebInspector.endBatchUpdate();

this._workspace.addEventListener(WebInspector.UISourceCodeProvider.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
this._workspace.addEventListener(WebInspector.UISourceCodeProvider.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset, this._projectWillReset.bind(this), this);
WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);

WebInspector.advancedSearchController.registerSearchScope(new WebInspector.ScriptsSearchScope(this._workspace));
}

WebInspector.ScriptsPanel.prototype = {
get statusBarItems()
{
return [this._pauseOnExceptionButton.element, this._toggleFormatSourceButton.element, this._scriptViewStatusBarItemsContainer];
},


statusBarText: function()
{
return this._scriptViewStatusBarTextContainer;
},

defaultFocusedElement: function()
{
return this._editorContainer.view.defaultFocusedElement() || this._navigator.view.defaultFocusedElement();
},

get paused()
{
return this._paused;
},

wasShown: function()
{
WebInspector.Panel.prototype.wasShown.call(this);
this._navigatorController.wasShown();
},

willHide: function()
{
WebInspector.Panel.prototype.willHide.call(this);
WebInspector.closeViewInDrawer();
},


_uiSourceCodeAdded: function(event)
{
var uiSourceCode =   (event.data);
this._addUISourceCode(uiSourceCode);
},


_addUISourceCode: function(uiSourceCode)
{
if (this._toggleFormatSourceButton.toggled)
uiSourceCode.setFormatted(true);
if (uiSourceCode.project().isServiceProject())
return;
this._navigator.addUISourceCode(uiSourceCode);
this._editorContainer.addUISourceCode(uiSourceCode);

var currentUISourceCode = this._currentUISourceCode;
if (currentUISourceCode && currentUISourceCode.project().isServiceProject() && currentUISourceCode !== uiSourceCode && currentUISourceCode.url === uiSourceCode.url) {
this._showFile(uiSourceCode);
this._editorContainer.removeUISourceCode(currentUISourceCode);
}
},

_uiSourceCodeRemoved: function(event)
{
var uiSourceCode =   (event.data);
this._removeUISourceCodes([uiSourceCode]);
},


_removeUISourceCodes: function(uiSourceCodes)
{
for (var i = 0; i < uiSourceCodes.length; ++i) {
this._navigator.removeUISourceCode(uiSourceCodes[i]);
this._removeSourceFrame(uiSourceCodes[i]);
}
this._editorContainer.removeUISourceCodes(uiSourceCodes);
},

_consoleCommandEvaluatedInSelectedCallFrame: function(event)
{
this.sidebarPanes.scopechain.update(WebInspector.debuggerModel.selectedCallFrame());
},

_debuggerPaused: function()
{
var details = WebInspector.debuggerModel.debuggerPausedDetails();

this._paused = true;
this._waitingToPause = false;
this._stepping = false;

this._updateDebuggerButtons();

WebInspector.inspectorView.setCurrentPanel(this);
this.sidebarPanes.callstack.update(details.callFrames);

if (details.reason === WebInspector.DebuggerModel.BreakReason.DOM) {
WebInspector.domBreakpointsSidebarPane.highlightBreakpoint(details.auxData);
function didCreateBreakpointHitStatusMessage(element)
{
this.sidebarPanes.callstack.setStatus(element);
}
WebInspector.domBreakpointsSidebarPane.createBreakpointHitStatusMessage(details.auxData, didCreateBreakpointHitStatusMessage.bind(this));
} else if (details.reason === WebInspector.DebuggerModel.BreakReason.EventListener) {
var eventName = details.auxData.eventName;
this.sidebarPanes.eventListenerBreakpoints.highlightBreakpoint(details.auxData.eventName);
var eventNameForUI = WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName);
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a \"%s\" Event Listener.", eventNameForUI));
} else if (details.reason === WebInspector.DebuggerModel.BreakReason.XHR) {
this.sidebarPanes.xhrBreakpoints.highlightBreakpoint(details.auxData["breakpointURL"]);
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a XMLHttpRequest."));
} else if (details.reason === WebInspector.DebuggerModel.BreakReason.Exception)
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on exception: '%s'.", details.auxData.description));
else if (details.reason === WebInspector.DebuggerModel.BreakReason.Assert)
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on assertion."));
else if (details.reason === WebInspector.DebuggerModel.BreakReason.CSPViolation)
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a script blocked due to Content Security Policy directive: \"%s\".", details.auxData["directiveText"]));
else {
function didGetUILocation(uiLocation)
{
var breakpoint = WebInspector.breakpointManager.findBreakpoint(uiLocation.uiSourceCode, uiLocation.lineNumber);
if (!breakpoint)
return;
this.sidebarPanes.jsBreakpoints.highlightBreakpoint(breakpoint);
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a JavaScript breakpoint."));
}
if (details.callFrames.length) 
details.callFrames[0].createLiveLocation(didGetUILocation.bind(this));
else
console.warn("ScriptsPanel paused, but callFrames.length is zero."); 
}

this._showDebuggerSidebar();
this._toggleDebuggerSidebarButton.setEnabled(false);
window.focus();
InspectorFrontendHost.bringToFront();
},

_debuggerResumed: function()
{
this._paused = false;
this._waitingToPause = false;
this._stepping = false;

this._clearInterface();
this._toggleDebuggerSidebarButton.setEnabled(true);
},

_debuggerWasEnabled: function()
{
this._updateDebuggerButtons();
},

_debuggerWasDisabled: function()
{
this._debuggerReset();
},

_debuggerReset: function()
{
this._debuggerResumed();
this.sidebarPanes.watchExpressions.reset();
},

_projectWillReset: function(event)
{
var project = event.data;
var uiSourceCodes = project.uiSourceCodes();
this._removeUISourceCodes(uiSourceCodes);
if (project.type() === WebInspector.projectTypes.Network)
this._editorContainer.reset();
},

get visibleView()
{
return this._editorContainer.visibleView;
},

_updateScriptViewStatusBarItems: function()
{
this._scriptViewStatusBarItemsContainer.removeChildren();
this._scriptViewStatusBarTextContainer.removeChildren();

var sourceFrame = this.visibleView;
if (sourceFrame) {
var statusBarItems = sourceFrame.statusBarItems() || [];
for (var i = 0; i < statusBarItems.length; ++i)
this._scriptViewStatusBarItemsContainer.appendChild(statusBarItems[i]);
var statusBarText = sourceFrame.statusBarText();
if (statusBarText)
this._scriptViewStatusBarTextContainer.appendChild(statusBarText);
}
},

canShowAnchorLocation: function(anchor)
{
if (WebInspector.debuggerModel.debuggerEnabled() && anchor.uiSourceCode)
return true;
var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(anchor.href);
if (uiSourceCode) {
anchor.uiSourceCode = uiSourceCode;
return true;
}
return false;
},

showAnchorLocation: function(anchor)
{
this._showSourceLine(anchor.uiSourceCode, anchor.lineNumber);
},


showUISourceCode: function(uiSourceCode, lineNumber)
{
this._showSourceLine(uiSourceCode, lineNumber);
},


_showSourceLine: function(uiSourceCode, lineNumber)
{
var sourceFrame = this._showFile(uiSourceCode);
if (typeof lineNumber === "number")
sourceFrame.highlightLine(lineNumber);
sourceFrame.focus();

WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
action: WebInspector.UserMetrics.UserActionNames.OpenSourceLink,
url: uiSourceCode.originURL(),
lineNumber: lineNumber
});
},


_showFile: function(uiSourceCode)
{
var sourceFrame = this._getOrCreateSourceFrame(uiSourceCode);
if (this._currentUISourceCode === uiSourceCode)
return sourceFrame;
this._currentUISourceCode = uiSourceCode;
if (!uiSourceCode.project().isServiceProject())
this._navigator.revealUISourceCode(uiSourceCode, true);
this._editorContainer.showFile(uiSourceCode);
this._updateScriptViewStatusBarItems();

return sourceFrame;
},


_createSourceFrame: function(uiSourceCode)
{
var sourceFrame;
switch (uiSourceCode.contentType()) {
case WebInspector.resourceTypes.Script:
if (uiSourceCode.project().type() === WebInspector.projectTypes.Snippets)
sourceFrame = new WebInspector.SnippetJavaScriptSourceFrame(this, uiSourceCode);
else
sourceFrame = new WebInspector.JavaScriptSourceFrame(this, uiSourceCode);
break;
case WebInspector.resourceTypes.Document:
sourceFrame = new WebInspector.JavaScriptSourceFrame(this, uiSourceCode);
break;
case WebInspector.resourceTypes.Stylesheet:
default:
sourceFrame = new WebInspector.UISourceCodeFrame(uiSourceCode);
break;
}
this._sourceFramesByUISourceCode.put(uiSourceCode, sourceFrame);
return sourceFrame;
},


_getOrCreateSourceFrame: function(uiSourceCode)
{
return this._sourceFramesByUISourceCode.get(uiSourceCode) || this._createSourceFrame(uiSourceCode);
},


viewForFile: function(uiSourceCode)
{
return this._getOrCreateSourceFrame(uiSourceCode);
},


_removeSourceFrame: function(uiSourceCode)
{
var sourceFrame = this._sourceFramesByUISourceCode.get(uiSourceCode);
if (!sourceFrame)
return;
this._sourceFramesByUISourceCode.remove(uiSourceCode);
sourceFrame.dispose();
},

_clearCurrentExecutionLine: function()
{
if (this._executionSourceFrame)
this._executionSourceFrame.clearExecutionLine();
delete this._executionSourceFrame;
},

_executionLineChanged: function(event)
{
var uiLocation = event.data;

this._clearCurrentExecutionLine();
if (!uiLocation)
return;
var sourceFrame = this._getOrCreateSourceFrame(uiLocation.uiSourceCode);
sourceFrame.setExecutionLine(uiLocation.lineNumber);
this._executionSourceFrame = sourceFrame;
},

_revealExecutionLine: function(uiLocation)
{
var uiSourceCode = uiLocation.uiSourceCode;

if (this._currentUISourceCode && this._currentUISourceCode.scriptFile() && this._currentUISourceCode.scriptFile().isDivergingFromVM())
return;
if (this._toggleFormatSourceButton.toggled && !uiSourceCode.formatted())
uiSourceCode.setFormatted(true);
var sourceFrame = this._showFile(uiSourceCode);
sourceFrame.revealLine(uiLocation.lineNumber);
sourceFrame.focus();
},

_callFrameSelected: function(event)
{
var callFrame = event.data;

if (!callFrame)
return;

this.sidebarPanes.scopechain.update(callFrame);
this.sidebarPanes.watchExpressions.refreshExpressions();
this.sidebarPanes.callstack.setSelectedCallFrame(callFrame);
callFrame.createLiveLocation(this._revealExecutionLine.bind(this));
},

_editorClosed: function(event)
{
this._navigatorController.hideNavigatorOverlay();
var uiSourceCode =   (event.data);

if (this._currentUISourceCode === uiSourceCode)
delete this._currentUISourceCode;


this._updateScriptViewStatusBarItems();
WebInspector.searchController.resetSearch();
},

_editorSelected: function(event)
{
var uiSourceCode =   (event.data);
var sourceFrame = this._showFile(uiSourceCode);
this._navigatorController.hideNavigatorOverlay();
sourceFrame.focus();
WebInspector.searchController.resetSearch();
},

_scriptSelected: function(event)
{
var uiSourceCode =   (event.data.uiSourceCode);
var sourceFrame = this._showFile(uiSourceCode);
this._navigatorController.hideNavigatorOverlay();
if (sourceFrame && event.data.focusSource)
sourceFrame.focus();
},

_pauseOnExceptionStateChanged: function()
{
var pauseOnExceptionsState = WebInspector.settings.pauseOnExceptionStateString.get();
switch (pauseOnExceptionsState) {
case WebInspector.DebuggerModel.PauseOnExceptionsState.DontPauseOnExceptions:
this._pauseOnExceptionButton.title = WebInspector.UIString("Don't pause on exceptions.\nClick to Pause on all exceptions.");
break;
case WebInspector.DebuggerModel.PauseOnExceptionsState.PauseOnAllExceptions:
this._pauseOnExceptionButton.title = WebInspector.UIString("Pause on all exceptions.\nClick to Pause on uncaught exceptions.");
break;
case WebInspector.DebuggerModel.PauseOnExceptionsState.PauseOnUncaughtExceptions:
this._pauseOnExceptionButton.title = WebInspector.UIString("Pause on uncaught exceptions.\nClick to Not pause on exceptions.");
break;
}
this._pauseOnExceptionButton.state = pauseOnExceptionsState;
},

_updateDebuggerButtons: function()
{
if (WebInspector.debuggerModel.debuggerEnabled()) {
this._pauseOnExceptionButton.visible = true;
} else {
this._pauseOnExceptionButton.visible = false;
}

if (this._paused) {
this._updateButtonTitle(this._pauseButton, WebInspector.UIString("Resume script execution (%s)."))
this._pauseButton.state = true;

this._pauseButton.setEnabled(true);
this._stepOverButton.setEnabled(true);
this._stepIntoButton.setEnabled(true);
this._stepOutButton.setEnabled(true);

this.debuggerStatusElement.textContent = WebInspector.UIString("Paused");
} else {
this._updateButtonTitle(this._pauseButton, WebInspector.UIString("Pause script execution (%s)."))
this._pauseButton.state = false;

this._pauseButton.setEnabled(!this._waitingToPause);
this._stepOverButton.setEnabled(false);
this._stepIntoButton.setEnabled(false);
this._stepOutButton.setEnabled(false);

if (this._waitingToPause)
this.debuggerStatusElement.textContent = WebInspector.UIString("Pausing");
else if (this._stepping)
this.debuggerStatusElement.textContent = WebInspector.UIString("Stepping");
else
this.debuggerStatusElement.textContent = "";
}
},

_clearInterface: function()
{
this.sidebarPanes.callstack.update(null);
this.sidebarPanes.scopechain.update(null);
this.sidebarPanes.jsBreakpoints.clearBreakpointHighlight();
WebInspector.domBreakpointsSidebarPane.clearBreakpointHighlight();
this.sidebarPanes.eventListenerBreakpoints.clearBreakpointHighlight();
this.sidebarPanes.xhrBreakpoints.clearBreakpointHighlight();

this._clearCurrentExecutionLine();
this._updateDebuggerButtons();
},

_togglePauseOnExceptions: function()
{
var nextStateMap = {};
var stateEnum = WebInspector.DebuggerModel.PauseOnExceptionsState;
nextStateMap[stateEnum.DontPauseOnExceptions] = stateEnum.PauseOnAllExceptions;
nextStateMap[stateEnum.PauseOnAllExceptions] = stateEnum.PauseOnUncaughtExceptions;
nextStateMap[stateEnum.PauseOnUncaughtExceptions] = stateEnum.DontPauseOnExceptions;
WebInspector.settings.pauseOnExceptionStateString.set(nextStateMap[this._pauseOnExceptionButton.state]);
},


_togglePause: function(event)
{
if (this._paused) {
this._paused = false;
this._waitingToPause = false;
DebuggerAgent.resume();
} else {
this._stepping = false;
this._waitingToPause = true;
DebuggerAgent.pause();
}

this._clearInterface();
return true;
},


_stepOverClicked: function(event)
{
if (!this._paused)
return true;

this._paused = false;
this._stepping = true;

this._clearInterface();

DebuggerAgent.stepOver();
return true;
},


_stepIntoClicked: function(event)
{
if (!this._paused)
return true;

this._paused = false;
this._stepping = true;

this._clearInterface();

DebuggerAgent.stepInto();
return true;
},


_stepOutClicked: function(event)
{
if (!this._paused)
return true;

this._paused = false;
this._stepping = true;

this._clearInterface();

DebuggerAgent.stepOut();
return true;
},

_toggleBreakpointsClicked: function(event)
{
WebInspector.debuggerModel.setBreakpointsActive(!WebInspector.debuggerModel.breakpointsActive());
},

_breakpointsActiveStateChanged: function(event)
{
var active = event.data;
this._toggleBreakpointsButton.toggled = !active;
if (active) {
this._toggleBreakpointsButton.title = WebInspector.UIString("Deactivate breakpoints.");
WebInspector.inspectorView.element.removeStyleClass("breakpoints-deactivated");
this.sidebarPanes.jsBreakpoints.listElement.removeStyleClass("breakpoints-list-deactivated");
} else {
this._toggleBreakpointsButton.title = WebInspector.UIString("Activate breakpoints.");
WebInspector.inspectorView.element.addStyleClass("breakpoints-deactivated");
this.sidebarPanes.jsBreakpoints.listElement.addStyleClass("breakpoints-list-deactivated");
}
},


_evaluateSelectionInConsole: function(event)
{
var selection = window.getSelection();
if (selection.type !== "Range" || selection.isCollapsed)
return false;
WebInspector.evaluateInConsole(selection.toString());
return true;
},

_createDebugToolbar: function()
{
var debugToolbar = document.createElement("div");
debugToolbar.className = "status-bar";
debugToolbar.id = "scripts-debug-toolbar";

var title, handler;
var platformSpecificModifier = WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta;


handler = this._togglePause.bind(this);
this._pauseButton = this._createButtonAndRegisterShortcuts("scripts-pause", "", handler, WebInspector.ScriptsPanelDescriptor.ShortcutKeys.PauseContinue);
debugToolbar.appendChild(this._pauseButton.element);


title = WebInspector.UIString("Step over next function call (%s).");
handler = this._stepOverClicked.bind(this);
this._stepOverButton = this._createButtonAndRegisterShortcuts("scripts-step-over", title, handler, WebInspector.ScriptsPanelDescriptor.ShortcutKeys.StepOver);
debugToolbar.appendChild(this._stepOverButton.element);


title = WebInspector.UIString("Step into next function call (%s).");
handler = this._stepIntoClicked.bind(this);
this._stepIntoButton = this._createButtonAndRegisterShortcuts("scripts-step-into", title, handler, WebInspector.ScriptsPanelDescriptor.ShortcutKeys.StepInto);
debugToolbar.appendChild(this._stepIntoButton.element);


title = WebInspector.UIString("Step out of current function (%s).");
handler = this._stepOutClicked.bind(this);
this._stepOutButton = this._createButtonAndRegisterShortcuts("scripts-step-out", title, handler, WebInspector.ScriptsPanelDescriptor.ShortcutKeys.StepOut);
debugToolbar.appendChild(this._stepOutButton.element);

this._toggleBreakpointsButton = new WebInspector.StatusBarButton(WebInspector.UIString("Deactivate breakpoints."), "scripts-toggle-breakpoints");
this._toggleBreakpointsButton.toggled = false;
this._toggleBreakpointsButton.addEventListener("click", this._toggleBreakpointsClicked, this);
debugToolbar.appendChild(this._toggleBreakpointsButton.element);

this.debuggerStatusElement = document.createElement("div");
this.debuggerStatusElement.id = "scripts-debugger-status";
debugToolbar.appendChild(this.debuggerStatusElement);

return debugToolbar;
},


_updateButtonTitle: function(button, buttonTitle)
{
var hasShortcuts = button.shortcuts && button.shortcuts.length;
if (hasShortcuts)
button.title = String.vsprintf(buttonTitle, [button.shortcuts[0].name]);
else
button.title = buttonTitle;
},


_createButtonAndRegisterShortcuts: function(buttonId, buttonTitle, handler, shortcuts)
{
var button = new WebInspector.StatusBarButton(buttonTitle, buttonId);
button.element.addEventListener("click", handler, false);
button.shortcuts = shortcuts;
this._updateButtonTitle(button, buttonTitle);
this.registerShortcuts(shortcuts, handler);
return button;
},

searchCanceled: function()
{
if (this._searchView)
this._searchView.searchCanceled();

delete this._searchView;
delete this._searchQuery;
},


performSearch: function(query)
{
WebInspector.searchController.updateSearchMatchesCount(0, this);

if (!this.visibleView)
return;


this.searchCanceled();

this._searchView = this.visibleView;
this._searchQuery = query;

function finishedCallback(view, searchMatches)
{
if (!searchMatches)
return;

WebInspector.searchController.updateSearchMatchesCount(searchMatches, this);
view.jumpToNextSearchResult();
WebInspector.searchController.updateCurrentMatchIndex(view.currentSearchResultIndex, this);
}

this._searchView.performSearch(query, finishedCallback.bind(this));
},

jumpToNextSearchResult: function()
{
if (!this._searchView)
return;

if (this._searchView !== this.visibleView) {
this.performSearch(this._searchQuery);
return;
}

if (this._searchView.showingLastSearchResult())
this._searchView.jumpToFirstSearchResult();
else
this._searchView.jumpToNextSearchResult();
WebInspector.searchController.updateCurrentMatchIndex(this._searchView.currentSearchResultIndex, this);
return true;
},

jumpToPreviousSearchResult: function()
{
if (!this._searchView)
return;

if (this._searchView !== this.visibleView) {
this.performSearch(this._searchQuery);
if (this._searchView)
this._searchView.jumpToLastSearchResult();
return;
}

if (this._searchView.showingFirstSearchResult())
this._searchView.jumpToLastSearchResult();
else
this._searchView.jumpToPreviousSearchResult();
WebInspector.searchController.updateCurrentMatchIndex(this._searchView.currentSearchResultIndex, this);
},


canSearchAndReplace: function()
{
var view =   (this.visibleView);
return !!view && view.canEditSource();
},


replaceSelectionWith: function(text)
{
var view =   (this.visibleView);
view.replaceSearchMatchWith(text);
},


replaceAllWith: function(query, text)
{
var view =   (this.visibleView);
view.replaceAllWith(query, text);
},

_toggleFormatSource: function()
{
this._toggleFormatSourceButton.toggled = !this._toggleFormatSourceButton.toggled;
var uiSourceCodes = this._workspace.uiSourceCodes();
for (var i = 0; i < uiSourceCodes.length; ++i)
uiSourceCodes[i].setFormatted(this._toggleFormatSourceButton.toggled);

var currentFile = this._editorContainer.currentFile();

WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
action: WebInspector.UserMetrics.UserActionNames.TogglePrettyPrint,
enabled: this._toggleFormatSourceButton.toggled,
url: currentFile ? currentFile.originURL() : null
});
},

addToWatch: function(expression)
{
this.sidebarPanes.watchExpressions.addExpression(expression);
},


_toggleBreakpoint: function()
{
var sourceFrame = this.visibleView;
if (!sourceFrame)
return false;

if (sourceFrame instanceof WebInspector.JavaScriptSourceFrame) {
var javaScriptSourceFrame =   (sourceFrame);
javaScriptSourceFrame.toggleBreakpointOnCurrentLine();
return true;
}
return false;
},


_showOutlineDialog: function(event)
{
var uiSourceCode = this._editorContainer.currentFile();
if (!uiSourceCode)
return false;

switch (uiSourceCode.contentType()) {
case WebInspector.resourceTypes.Document:
case WebInspector.resourceTypes.Script:
WebInspector.JavaScriptOutlineDialog.show(this.visibleView, uiSourceCode);
return true;
case WebInspector.resourceTypes.Stylesheet:
WebInspector.StyleSheetOutlineDialog.show(this.visibleView, uiSourceCode);
return true;
}
return false;
},

_installDebuggerSidebarController: function()
{
this._toggleDebuggerSidebarButton = new WebInspector.StatusBarButton(WebInspector.UIString("Hide debugger"), "scripts-debugger-show-hide-button", 3);
this._toggleDebuggerSidebarButton.state = "shown";
this._toggleDebuggerSidebarButton.addEventListener("click", clickHandler, this);

function clickHandler()
{
if (this._toggleDebuggerSidebarButton.state === "shown")
this._hideDebuggerSidebar();
else
this._showDebuggerSidebar();
}
this.editorView.element.appendChild(this._toggleDebuggerSidebarButton.element);

if (WebInspector.settings.debuggerSidebarHidden.get())
this._hideDebuggerSidebar();

},

_showDebuggerSidebar: function()
{
if (this._toggleDebuggerSidebarButton.state === "shown")
return;
this._toggleDebuggerSidebarButton.state = "shown";
this._toggleDebuggerSidebarButton.title = WebInspector.UIString("Hide debugger");
this.splitView.showSidebarElement();
this.debugSidebarResizeWidgetElement.removeStyleClass("hidden");
WebInspector.settings.debuggerSidebarHidden.set(false);
},

_hideDebuggerSidebar: function()
{
if (this._toggleDebuggerSidebarButton.state === "hidden")
return;
this._toggleDebuggerSidebarButton.state = "hidden";
this._toggleDebuggerSidebarButton.title = WebInspector.UIString("Show debugger");
this.splitView.hideSidebarElement();
this.debugSidebarResizeWidgetElement.addStyleClass("hidden");
WebInspector.settings.debuggerSidebarHidden.set(true);
},

_fileRenamed: function(event)
{
var uiSourceCode =   (event.data.uiSourceCode);
var name =   (event.data.name);
if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
return;
WebInspector.scriptSnippetModel.renameScriptSnippet(uiSourceCode, name);
uiSourceCode.rename(name);
},


_snippetCreationRequested: function(event)
{
var uiSourceCode = WebInspector.scriptSnippetModel.createScriptSnippet();
this._showSourceLine(uiSourceCode);

var shouldHideNavigator = !this._navigatorController.isNavigatorPinned();
if (this._navigatorController.isNavigatorHidden())
this._navigatorController.showNavigatorOverlay();
this._navigator.rename(uiSourceCode, callback.bind(this));


function callback(committed)
{
if (shouldHideNavigator)
this._navigatorController.hideNavigatorOverlay();

if (!committed) {
WebInspector.scriptSnippetModel.deleteScriptSnippet(uiSourceCode);
return;
}

this._showSourceLine(uiSourceCode);
}
},


_itemRenamingRequested: function(event)
{
var uiSourceCode =   (event.data);

var shouldHideNavigator = !this._navigatorController.isNavigatorPinned();
if (this._navigatorController.isNavigatorHidden())
this._navigatorController.showNavigatorOverlay();
this._navigator.rename(uiSourceCode, callback.bind(this));


function callback(committed)
{
if (shouldHideNavigator && committed) {
this._navigatorController.hideNavigatorOverlay();
this._showSourceLine(uiSourceCode);
}
}
},


_showLocalHistory: function(uiSourceCode)
{
WebInspector.RevisionHistoryView.showHistory(uiSourceCode);
},


appendApplicableItems: function(event, contextMenu, target)
{
this._appendUISourceCodeItems(contextMenu, target);
this._appendFunctionItems(contextMenu, target);
},


_mapFileSystemToNetwork: function(uiSourceCode)
{
WebInspector.SelectUISourceCodeForProjectTypeDialog.show(uiSourceCode.name(), WebInspector.projectTypes.Network, mapFileSystemToNetwork.bind(this), this.editorView.mainElement)                


function mapFileSystemToNetwork(networkUISourceCode)
{
this._workspace.addMapping(networkUISourceCode, uiSourceCode, WebInspector.fileSystemWorkspaceProvider);
}
},


_removeNetworkMapping: function(uiSourceCode)
{
if (confirm(WebInspector.UIString("Are you sure you want to remove network mapping?")))
this._workspace.removeMapping(uiSourceCode);
},


_mapNetworkToFileSystem: function(networkUISourceCode)
{
WebInspector.SelectUISourceCodeForProjectTypeDialog.show(networkUISourceCode.name(), WebInspector.projectTypes.FileSystem, mapNetworkToFileSystem.bind(this), this.editorView.mainElement)                


function mapNetworkToFileSystem(uiSourceCode)
{
this._workspace.addMapping(networkUISourceCode, uiSourceCode, WebInspector.fileSystemWorkspaceProvider);
}
},


_appendUISourceCodeMappingItems: function(contextMenu, uiSourceCode)
{
if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem) {
var hasMappings = !!uiSourceCode.url;
if (!hasMappings)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Map to network resource\u2026" : "Map to Network Resource\u2026"), this._mapFileSystemToNetwork.bind(this, uiSourceCode));
else
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove network mapping" : "Remove Network Mapping"), this._removeNetworkMapping.bind(this, uiSourceCode));
}

if (uiSourceCode.project().type() === WebInspector.projectTypes.Network) {

function filterProject(project)
{
return project.type() === WebInspector.projectTypes.FileSystem;
}

if (!this._workspace.projects().filter(filterProject).length)
return;
if (this._workspace.uiSourceCodeForURL(uiSourceCode.url) === uiSourceCode)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Map to file system resource\u2026" : "Map to File System Resource\u2026"), this._mapNetworkToFileSystem.bind(this, uiSourceCode));
}
},


_appendUISourceCodeItems: function(contextMenu, target)
{
if (!(target instanceof WebInspector.UISourceCode))
return;

var uiSourceCode =   (target);
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Local modifications\u2026" : "Local Modifications\u2026"), this._showLocalHistory.bind(this, uiSourceCode));

if (WebInspector.isolatedFileSystemManager.supportsFileSystems() && WebInspector.experimentsSettings.fileSystemProject.isEnabled())
this._appendUISourceCodeMappingItems(contextMenu, uiSourceCode);

var resource = WebInspector.resourceForURL(uiSourceCode.url);
if (resource && resource.request)
contextMenu.appendApplicableItems(resource.request);
},


_appendFunctionItems: function(contextMenu, target)
{
if (!(target instanceof WebInspector.RemoteObject))
return;
var remoteObject =   (target);
if (remoteObject.type !== "function")
return;

function didGetDetails(error, response)
{
if (error) {
console.error(error);
return;
}
WebInspector.inspectorView.showPanelForAnchorNavigation(this);
var uiLocation = WebInspector.debuggerModel.rawLocationToUILocation(response.location);
this._showSourceLine(uiLocation.uiSourceCode, uiLocation.lineNumber);
}

function revealFunction()
{
DebuggerAgent.getFunctionDetails(remoteObject.objectId, didGetDetails.bind(this));
}

contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Show function definition" : "Show Function Definition"), revealFunction.bind(this));
},

showGoToSourceDialog: function()
{
WebInspector.OpenResourceDialog.show(this, this.editorView.mainElement);
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

this.sidebarElement.appendChild(this.debugToolbar);
} else {
this._showDebuggerSidebar();

this.sidebarPaneView = new WebInspector.SplitView(true, this.name + "PanelSplitSidebarRatio", 0.5);

var group1 = new WebInspector.SidebarPaneStack();
group1.show(this.sidebarPaneView.firstElement());
group1.element.id = "scripts-sidebar-stack-pane";
group1.addPane(this.sidebarPanes.callstack);
group1.addPane(this.sidebarPanes.jsBreakpoints);
group1.addPane(this.sidebarPanes.domBreakpoints);
group1.addPane(this.sidebarPanes.xhrBreakpoints);
group1.addPane(this.sidebarPanes.eventListenerBreakpoints);
group1.addPane(this.sidebarPanes.workerList);

var group2 = new WebInspector.SidebarTabbedPane();
group2.show(this.sidebarPaneView.secondElement());
group2.addPane(this.sidebarPanes.scopechain);
group2.addPane(this.sidebarPanes.watchExpressions);

this.sidebarPaneView.firstElement().appendChild(this.debugToolbar);
}

this.sidebarPaneView.element.id = "scripts-debug-sidebar-contents";
this.sidebarPaneView.show(this.splitView.sidebarElement);

this.sidebarPanes.scopechain.expand();
this.sidebarPanes.jsBreakpoints.expand();
this.sidebarPanes.callstack.expand();

if (WebInspector.settings.watchExpressions.get().length > 0)
this.sidebarPanes.watchExpressions.expand();
},

__proto__: WebInspector.Panel.prototype
}
