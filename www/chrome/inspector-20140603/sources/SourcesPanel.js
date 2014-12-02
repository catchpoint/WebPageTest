WebInspector.Placard=function(title,subtitle)
{this.element=document.createElementWithClass("div","placard");this.element.placard=this;this.subtitleElement=this.element.createChild("div","subtitle");this.titleElement=this.element.createChild("div","title");this._hidden=false;this.title=title;this.subtitle=subtitle;this.selected=false;}
WebInspector.Placard.prototype={get title()
{return this._title;},set title(x)
{if(this._title===x)
return;this._title=x;this.titleElement.textContent=x;},get subtitle()
{return this._subtitle;},set subtitle(x)
{if(this._subtitle===x)
return;this._subtitle=x;this.subtitleElement.textContent=x;},get selected()
{return this._selected;},set selected(x)
{if(x)
this.select();else
this.deselect();},select:function()
{if(this._selected)
return;this._selected=true;this.element.classList.add("selected");},deselect:function()
{if(!this._selected)
return;this._selected=false;this.element.classList.remove("selected");},toggleSelected:function()
{this.selected=!this.selected;},isHidden:function()
{return this._hidden;},setHidden:function(x)
{if(this._hidden===x)
return;this._hidden=x;this.element.classList.toggle("hidden",x);},discard:function()
{}};WebInspector.JavaScriptBreakpointsSidebarPane=function(debuggerModel,breakpointManager,showSourceLineDelegate)
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Breakpoints"));this._debuggerModel=debuggerModel;this.registerRequiredCSS("breakpointsList.css");this._breakpointManager=breakpointManager;this._showSourceLineDelegate=showSourceLineDelegate;this.listElement=document.createElement("ol");this.listElement.className="breakpoint-list";this.emptyElement=document.createElement("div");this.emptyElement.className="info";this.emptyElement.textContent=WebInspector.UIString("No Breakpoints");this.bodyElement.appendChild(this.emptyElement);this._items=new Map();var breakpointLocations=this._breakpointManager.allBreakpointLocations();for(var i=0;i<breakpointLocations.length;++i)
this._addBreakpoint(breakpointLocations[i].breakpoint,breakpointLocations[i].uiLocation);this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointAdded,this._breakpointAdded,this);this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointRemoved,this._breakpointRemoved,this);this.emptyElement.addEventListener("contextmenu",this._emptyElementContextMenu.bind(this),true);}
WebInspector.JavaScriptBreakpointsSidebarPane.prototype={_emptyElementContextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);var breakpointActive=this._debuggerModel.breakpointsActive();var breakpointActiveTitle=breakpointActive?WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Deactivate breakpoints":"Deactivate Breakpoints"):WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Activate breakpoints":"Activate Breakpoints");contextMenu.appendItem(breakpointActiveTitle,this._debuggerModel.setBreakpointsActive.bind(this._debuggerModel,!breakpointActive));contextMenu.show();},_breakpointAdded:function(event)
{this._breakpointRemoved(event);var breakpoint=(event.data.breakpoint);var uiLocation=(event.data.uiLocation);this._addBreakpoint(breakpoint,uiLocation);},_addBreakpoint:function(breakpoint,uiLocation)
{var element=document.createElement("li");element.classList.add("cursor-pointer");element.addEventListener("contextmenu",this._breakpointContextMenu.bind(this,breakpoint),true);element.addEventListener("click",this._breakpointClicked.bind(this,uiLocation),false);var checkbox=document.createElement("input");checkbox.className="checkbox-elem";checkbox.type="checkbox";checkbox.checked=breakpoint.enabled();checkbox.addEventListener("click",this._breakpointCheckboxClicked.bind(this,breakpoint),false);element.appendChild(checkbox);var labelElement=document.createTextNode(uiLocation.linkText());element.appendChild(labelElement);var snippetElement=document.createElement("div");snippetElement.className="source-text monospace";element.appendChild(snippetElement);function didRequestContent(content)
{var lineNumber=uiLocation.lineNumber
var columnNumber=uiLocation.columnNumber;var contentString=new String(content);if(lineNumber<contentString.lineCount()){var lineText=contentString.lineAt(lineNumber);var maxSnippetLength=200;snippetElement.textContent=lineText.substr(columnNumber).trimEnd(maxSnippetLength);}}
uiLocation.uiSourceCode.requestContent(didRequestContent);element._data=uiLocation;var currentElement=this.listElement.firstChild;while(currentElement){if(currentElement._data&&this._compareBreakpoints(currentElement._data,element._data)>0)
break;currentElement=currentElement.nextSibling;}
this._addListElement(element,currentElement);var breakpointItem={};breakpointItem.element=element;breakpointItem.checkbox=checkbox;this._items.put(breakpoint,breakpointItem);this.expand();},_breakpointRemoved:function(event)
{var breakpoint=(event.data.breakpoint);var uiLocation=(event.data.uiLocation);var breakpointItem=this._items.get(breakpoint);if(!breakpointItem)
return;this._items.remove(breakpoint);this._removeListElement(breakpointItem.element);},highlightBreakpoint:function(breakpoint)
{var breakpointItem=this._items.get(breakpoint);if(!breakpointItem)
return;breakpointItem.element.classList.add("breakpoint-hit");this._highlightedBreakpointItem=breakpointItem;},clearBreakpointHighlight:function()
{if(this._highlightedBreakpointItem){this._highlightedBreakpointItem.element.classList.remove("breakpoint-hit");delete this._highlightedBreakpointItem;}},_breakpointClicked:function(uiLocation,event)
{this._showSourceLineDelegate(uiLocation.uiSourceCode,uiLocation.lineNumber);},_breakpointCheckboxClicked:function(breakpoint,event)
{event.consume();breakpoint.setEnabled(event.target.checked);},_breakpointContextMenu:function(breakpoint,event)
{var breakpoints=this._items.values();var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Remove breakpoint":"Remove Breakpoint"),breakpoint.remove.bind(breakpoint));if(breakpoints.length>1){var removeAllTitle=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Remove all breakpoints":"Remove All Breakpoints");contextMenu.appendItem(removeAllTitle,this._breakpointManager.removeAllBreakpoints.bind(this._breakpointManager));}
contextMenu.appendSeparator();var breakpointActive=this._debuggerModel.breakpointsActive();var breakpointActiveTitle=breakpointActive?WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Deactivate breakpoints":"Deactivate Breakpoints"):WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Activate breakpoints":"Activate Breakpoints");contextMenu.appendItem(breakpointActiveTitle,this._debuggerModel.setBreakpointsActive.bind(this._debuggerModel,!breakpointActive));function enabledBreakpointCount(breakpoints)
{var count=0;for(var i=0;i<breakpoints.length;++i){if(breakpoints[i].checkbox.checked)
count++;}
return count;}
if(breakpoints.length>1){var enableBreakpointCount=enabledBreakpointCount(breakpoints);var enableTitle=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Enable all breakpoints":"Enable All Breakpoints");var disableTitle=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Disable all breakpoints":"Disable All Breakpoints");contextMenu.appendSeparator();contextMenu.appendItem(enableTitle,this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager,true),!(enableBreakpointCount!=breakpoints.length));contextMenu.appendItem(disableTitle,this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager,false),!(enableBreakpointCount>1));}
contextMenu.show();},_addListElement:function(element,beforeElement)
{if(beforeElement)
this.listElement.insertBefore(element,beforeElement);else{if(!this.listElement.firstChild){this.bodyElement.removeChild(this.emptyElement);this.bodyElement.appendChild(this.listElement);}
this.listElement.appendChild(element);}},_removeListElement:function(element)
{this.listElement.removeChild(element);if(!this.listElement.firstChild){this.bodyElement.removeChild(this.listElement);this.bodyElement.appendChild(this.emptyElement);}},_compare:function(x,y)
{if(x!==y)
return x<y?-1:1;return 0;},_compareBreakpoints:function(b1,b2)
{return this._compare(b1.uiSourceCode.originURL(),b2.uiSourceCode.originURL())||this._compare(b1.lineNumber,b2.lineNumber);},reset:function()
{this.listElement.removeChildren();if(this.listElement.parentElement){this.bodyElement.removeChild(this.listElement);this.bodyElement.appendChild(this.emptyElement);}
this._items.clear();},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.XHRBreakpointsSidebarPane=function()
{WebInspector.NativeBreakpointsSidebarPane.call(this,WebInspector.UIString("XHR Breakpoints"));this._breakpointElements={};var addButton=document.createElement("button");addButton.className="pane-title-button add";addButton.addEventListener("click",this._addButtonClicked.bind(this),false);addButton.title=WebInspector.UIString("Add XHR breakpoint");this.titleElement.appendChild(addButton);this.emptyElement.addEventListener("contextmenu",this._emptyElementContextMenu.bind(this),true);this._restoreBreakpoints();}
WebInspector.XHRBreakpointsSidebarPane.prototype={_emptyElementContextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add breakpoint":"Add Breakpoint"),this._addButtonClicked.bind(this));contextMenu.show();},_addButtonClicked:function(event)
{if(event)
event.consume();this.expand();var inputElementContainer=document.createElement("p");inputElementContainer.className="breakpoint-condition";var inputElement=document.createElement("span");inputElementContainer.textContent=WebInspector.UIString("Break when URL contains:");inputElement.className="editing";inputElement.id="breakpoint-condition-input";inputElementContainer.appendChild(inputElement);this._addListElement(inputElementContainer,this.listElement.firstChild);function finishEditing(accept,e,text)
{this._removeListElement(inputElementContainer);if(accept){this._setBreakpoint(text,true);this._saveBreakpoints();}}
var config=new WebInspector.InplaceEditor.Config(finishEditing.bind(this,true),finishEditing.bind(this,false));WebInspector.InplaceEditor.startEditing(inputElement,config);},_setBreakpoint:function(url,enabled)
{if(url in this._breakpointElements)
return;var element=document.createElement("li");element._url=url;element.addEventListener("contextmenu",this._contextMenu.bind(this,url),true);var checkboxElement=document.createElement("input");checkboxElement.className="checkbox-elem";checkboxElement.type="checkbox";checkboxElement.checked=enabled;checkboxElement.addEventListener("click",this._checkboxClicked.bind(this,url),false);element._checkboxElement=checkboxElement;element.appendChild(checkboxElement);var labelElement=document.createElement("span");if(!url)
labelElement.textContent=WebInspector.UIString("Any XHR");else
labelElement.textContent=WebInspector.UIString("URL contains \"%s\"",url);labelElement.classList.add("cursor-auto");labelElement.addEventListener("dblclick",this._labelClicked.bind(this,url),false);element.appendChild(labelElement);var currentElement=this.listElement.firstChild;while(currentElement){if(currentElement._url&&currentElement._url<element._url)
break;currentElement=currentElement.nextSibling;}
this._addListElement(element,currentElement);this._breakpointElements[url]=element;if(enabled)
DOMDebuggerAgent.setXHRBreakpoint(url);},_removeBreakpoint:function(url)
{var element=this._breakpointElements[url];if(!element)
return;this._removeListElement(element);delete this._breakpointElements[url];if(element._checkboxElement.checked)
DOMDebuggerAgent.removeXHRBreakpoint(url);},_contextMenu:function(url,event)
{var contextMenu=new WebInspector.ContextMenu(event);function removeBreakpoint()
{this._removeBreakpoint(url);this._saveBreakpoints();}
function removeAllBreakpoints()
{for(var url in this._breakpointElements)
this._removeBreakpoint(url);this._saveBreakpoints();}
var removeAllTitle=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Remove all breakpoints":"Remove All Breakpoints");contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add breakpoint":"Add Breakpoint"),this._addButtonClicked.bind(this));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Remove breakpoint":"Remove Breakpoint"),removeBreakpoint.bind(this));contextMenu.appendItem(removeAllTitle,removeAllBreakpoints.bind(this));contextMenu.show();},_checkboxClicked:function(url,event)
{if(event.target.checked)
DOMDebuggerAgent.setXHRBreakpoint(url);else
DOMDebuggerAgent.removeXHRBreakpoint(url);this._saveBreakpoints();},_labelClicked:function(url)
{var element=this._breakpointElements[url];var inputElement=document.createElement("span");inputElement.className="breakpoint-condition editing";inputElement.textContent=url;this.listElement.insertBefore(inputElement,element);element.classList.add("hidden");function finishEditing(accept,e,text)
{this._removeListElement(inputElement);if(accept){this._removeBreakpoint(url);this._setBreakpoint(text,element._checkboxElement.checked);this._saveBreakpoints();}else
element.classList.remove("hidden");}
WebInspector.InplaceEditor.startEditing(inputElement,new WebInspector.InplaceEditor.Config(finishEditing.bind(this,true),finishEditing.bind(this,false)));},highlightBreakpoint:function(url)
{var element=this._breakpointElements[url];if(!element)
return;this.expand();element.classList.add("breakpoint-hit");this._highlightedElement=element;},clearBreakpointHighlight:function()
{if(this._highlightedElement){this._highlightedElement.classList.remove("breakpoint-hit");delete this._highlightedElement;}},_saveBreakpoints:function()
{var breakpoints=[];for(var url in this._breakpointElements)
breakpoints.push({url:url,enabled:this._breakpointElements[url]._checkboxElement.checked});WebInspector.settings.xhrBreakpoints.set(breakpoints);},_restoreBreakpoints:function()
{var breakpoints=WebInspector.settings.xhrBreakpoints.get();for(var i=0;i<breakpoints.length;++i){var breakpoint=breakpoints[i];if(breakpoint&&typeof breakpoint.url==="string")
this._setBreakpoint(breakpoint.url,breakpoint.enabled);}},__proto__:WebInspector.NativeBreakpointsSidebarPane.prototype}
WebInspector.EventListenerBreakpointsSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Event Listener Breakpoints"));this.registerRequiredCSS("breakpointsList.css");this.categoriesElement=document.createElement("ol");this.categoriesElement.tabIndex=0;this.categoriesElement.classList.add("properties-tree");this.categoriesElement.classList.add("event-listener-breakpoints");this.categoriesTreeOutline=new TreeOutline(this.categoriesElement);this.bodyElement.appendChild(this.categoriesElement);this._breakpointItems={};this._createCategory(WebInspector.UIString("Animation"),false,["requestAnimationFrame","cancelAnimationFrame","animationFrameFired"]);this._createCategory(WebInspector.UIString("Control"),true,["resize","scroll","zoom","focus","blur","select","change","submit","reset"]);this._createCategory(WebInspector.UIString("Clipboard"),true,["copy","cut","paste","beforecopy","beforecut","beforepaste"]);this._createCategory(WebInspector.UIString("DOM Mutation"),true,["DOMActivate","DOMFocusIn","DOMFocusOut","DOMAttrModified","DOMCharacterDataModified","DOMNodeInserted","DOMNodeInsertedIntoDocument","DOMNodeRemoved","DOMNodeRemovedFromDocument","DOMSubtreeModified","DOMContentLoaded"]);this._createCategory(WebInspector.UIString("Device"),true,["deviceorientation","devicemotion"]);this._createCategory(WebInspector.UIString("Drag / drop"),true,["dragenter","dragover","dragleave","drop"]);this._createCategory(WebInspector.UIString("Keyboard"),true,["keydown","keyup","keypress","input"]);this._createCategory(WebInspector.UIString("Load"),true,["load","beforeunload","unload","abort","error","hashchange","popstate"]);this._createCategory(WebInspector.UIString("Mouse"),true,["click","dblclick","mousedown","mouseup","mouseover","mousemove","mouseout","mousewheel","wheel"]);this._createCategory(WebInspector.UIString("Timer"),false,["setTimer","clearTimer","timerFired"]);this._createCategory(WebInspector.UIString("Touch"),true,["touchstart","touchmove","touchend","touchcancel"]);this._createCategory(WebInspector.UIString("WebGL"),false,["webglErrorFired","webglWarningFired"]);this._restoreBreakpoints();}
WebInspector.EventListenerBreakpointsSidebarPane.categotyListener="listener:";WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation="instrumentation:";WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI=function(eventName,auxData)
{if(!WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI){WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI={"instrumentation:setTimer":WebInspector.UIString("Set Timer"),"instrumentation:clearTimer":WebInspector.UIString("Clear Timer"),"instrumentation:timerFired":WebInspector.UIString("Timer Fired"),"instrumentation:requestAnimationFrame":WebInspector.UIString("Request Animation Frame"),"instrumentation:cancelAnimationFrame":WebInspector.UIString("Cancel Animation Frame"),"instrumentation:animationFrameFired":WebInspector.UIString("Animation Frame Fired"),"instrumentation:webglErrorFired":WebInspector.UIString("WebGL Error Fired"),"instrumentation:webglWarningFired":WebInspector.UIString("WebGL Warning Fired")};}
if(auxData){if(eventName==="instrumentation:webglErrorFired"&&auxData["webglErrorName"]){var errorName=auxData["webglErrorName"];errorName=errorName.replace(/^.*(0x[0-9a-f]+).*$/i,"$1");return WebInspector.UIString("WebGL Error Fired (%s)",errorName);}}
return WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI[eventName]||eventName.substring(eventName.indexOf(":")+1);}
WebInspector.EventListenerBreakpointsSidebarPane.prototype={_createCategory:function(name,isDOMEvent,eventNames)
{var labelNode=document.createElement("label");labelNode.textContent=name;var categoryItem={};categoryItem.element=new TreeElement(labelNode);this.categoriesTreeOutline.appendChild(categoryItem.element);categoryItem.element.listItemElement.classList.add("event-category");categoryItem.element.selectable=true;categoryItem.checkbox=this._createCheckbox(labelNode);categoryItem.checkbox.addEventListener("click",this._categoryCheckboxClicked.bind(this,categoryItem),true);categoryItem.children={};for(var i=0;i<eventNames.length;++i){var eventName=(isDOMEvent?WebInspector.EventListenerBreakpointsSidebarPane.categotyListener:WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation)+eventNames[i];var breakpointItem={};var title=WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName);labelNode=document.createElement("label");labelNode.textContent=title;breakpointItem.element=new TreeElement(labelNode);categoryItem.element.appendChild(breakpointItem.element);var hitMarker=document.createElement("div");hitMarker.className="breakpoint-hit-marker";breakpointItem.element.listItemElement.appendChild(hitMarker);breakpointItem.element.listItemElement.classList.add("source-code");breakpointItem.element.selectable=false;breakpointItem.checkbox=this._createCheckbox(labelNode);breakpointItem.checkbox.addEventListener("click",this._breakpointCheckboxClicked.bind(this,eventName),true);breakpointItem.parent=categoryItem;this._breakpointItems[eventName]=breakpointItem;categoryItem.children[eventName]=breakpointItem;}},_createCheckbox:function(labelNode)
{var checkbox=document.createElement("input");checkbox.className="checkbox-elem";checkbox.type="checkbox";labelNode.insertBefore(checkbox,labelNode.firstChild);return checkbox;},_categoryCheckboxClicked:function(categoryItem)
{var checked=categoryItem.checkbox.checked;for(var eventName in categoryItem.children){var breakpointItem=categoryItem.children[eventName];if(breakpointItem.checkbox.checked===checked)
continue;if(checked)
this._setBreakpoint(eventName);else
this._removeBreakpoint(eventName);}
this._saveBreakpoints();},_breakpointCheckboxClicked:function(eventName,event)
{if(event.target.checked)
this._setBreakpoint(eventName);else
this._removeBreakpoint(eventName);this._saveBreakpoints();},_setBreakpoint:function(eventName)
{var breakpointItem=this._breakpointItems[eventName];if(!breakpointItem)
return;breakpointItem.checkbox.checked=true;if(eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categotyListener))
DOMDebuggerAgent.setEventListenerBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categotyListener.length));else if(eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation))
DOMDebuggerAgent.setInstrumentationBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation.length));this._updateCategoryCheckbox(breakpointItem.parent);},_removeBreakpoint:function(eventName)
{var breakpointItem=this._breakpointItems[eventName];if(!breakpointItem)
return;breakpointItem.checkbox.checked=false;if(eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categotyListener))
DOMDebuggerAgent.removeEventListenerBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categotyListener.length));else if(eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation))
DOMDebuggerAgent.removeInstrumentationBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categotyInstrumentation.length));this._updateCategoryCheckbox(breakpointItem.parent);},_updateCategoryCheckbox:function(categoryItem)
{var hasEnabled=false,hasDisabled=false;for(var eventName in categoryItem.children){var breakpointItem=categoryItem.children[eventName];if(breakpointItem.checkbox.checked)
hasEnabled=true;else
hasDisabled=true;}
categoryItem.checkbox.checked=hasEnabled;categoryItem.checkbox.indeterminate=hasEnabled&&hasDisabled;},highlightBreakpoint:function(eventName)
{var breakpointItem=this._breakpointItems[eventName];if(!breakpointItem)
return;this.expand();breakpointItem.parent.element.expand();breakpointItem.element.listItemElement.classList.add("breakpoint-hit");this._highlightedElement=breakpointItem.element.listItemElement;},clearBreakpointHighlight:function()
{if(this._highlightedElement){this._highlightedElement.classList.remove("breakpoint-hit");delete this._highlightedElement;}},_saveBreakpoints:function()
{var breakpoints=[];for(var eventName in this._breakpointItems){if(this._breakpointItems[eventName].checkbox.checked)
breakpoints.push({eventName:eventName});}
WebInspector.settings.eventListenerBreakpoints.set(breakpoints);},_restoreBreakpoints:function()
{var breakpoints=WebInspector.settings.eventListenerBreakpoints.get();for(var i=0;i<breakpoints.length;++i){var breakpoint=breakpoints[i];if(breakpoint&&typeof breakpoint.eventName==="string")
this._setBreakpoint(breakpoint.eventName);}},__proto__:WebInspector.SidebarPane.prototype};WebInspector.CallStackSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Call Stack"));this.bodyElement.addEventListener("keydown",this._keyDown.bind(this),true);this.bodyElement.tabIndex=0;var asyncCheckbox=this.titleElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Async"),WebInspector.settings.enableAsyncStackTraces,true,undefined,WebInspector.UIString("Capture async stack traces")));asyncCheckbox.classList.add("scripts-callstack-async");asyncCheckbox.addEventListener("click",consumeEvent,false);WebInspector.settings.enableAsyncStackTraces.addChangeListener(this._asyncStackTracesStateChanged,this);}
WebInspector.CallStackSidebarPane.Events={CallFrameRestarted:"CallFrameRestarted",CallFrameSelected:"CallFrameSelected"}
WebInspector.CallStackSidebarPane.prototype={update:function(details)
{this.bodyElement.removeChildren();if(!details){var infoElement=this.bodyElement.createChild("div","info");infoElement.textContent=WebInspector.UIString("Not Paused");return;}
this._target=details.target();var callFrames=details.callFrames;var asyncStackTrace=details.asyncStackTrace;delete this._statusMessageElement;delete this._hiddenPlacardsMessageElement;this.placards=[];this._hiddenPlacards=0;this._appendSidebarPlacards(callFrames);var topStackHidden=(this._hiddenPlacards===this.placards.length);while(asyncStackTrace){var title=asyncStackTrace.description;if(title)
title+=" "+WebInspector.UIString("(async)");else
title=WebInspector.UIString("Async Call");var asyncPlacard=new WebInspector.Placard(title,"");asyncPlacard.element.addEventListener("click",this._selectNextVisiblePlacard.bind(this,this.placards.length,false),false);asyncPlacard.element.addEventListener("contextmenu",this._asyncPlacardContextMenu.bind(this,this.placards.length),true);asyncPlacard.element.classList.add("placard-label");this.bodyElement.appendChild(asyncPlacard.element);this._appendSidebarPlacards(asyncStackTrace.callFrames,asyncPlacard);asyncStackTrace=asyncStackTrace.asyncStackTrace;}
if(topStackHidden)
this._revealHiddenPlacards();if(this._hiddenPlacards){var element=document.createElementWithClass("div","hidden-placards-message");if(this._hiddenPlacards===1)
element.textContent=WebInspector.UIString("1 stack frame is hidden (black-boxed).");else
element.textContent=WebInspector.UIString("%d stack frames are hidden (black-boxed).",this._hiddenPlacards);element.createTextChild(" ");var showAllLink=element.createChild("span","node-link");showAllLink.textContent=WebInspector.UIString("Show");showAllLink.addEventListener("click",this._revealHiddenPlacards.bind(this),false);this.bodyElement.insertBefore(element,this.bodyElement.firstChild);this._hiddenPlacardsMessageElement=element;}},_appendSidebarPlacards:function(callFrames,asyncPlacard)
{var allPlacardsHidden=true;for(var i=0,n=callFrames.length;i<n;++i){var callFrame=callFrames[i];var placard=new WebInspector.CallStackSidebarPane.Placard(callFrame,asyncPlacard);placard.element.addEventListener("click",this._placardSelected.bind(this,placard),false);placard.element.addEventListener("contextmenu",this._placardContextMenu.bind(this,placard),true);this.placards.push(placard);this.bodyElement.appendChild(placard.element);if(callFrame.script.isFramework()){placard.setHidden(true);placard.element.classList.add("dimmed");++this._hiddenPlacards;}else{allPlacardsHidden=false;}}
if(allPlacardsHidden&&asyncPlacard)
asyncPlacard.setHidden(true);},_revealHiddenPlacards:function()
{if(!this._hiddenPlacards)
return;this._hiddenPlacards=0;for(var i=0;i<this.placards.length;++i){var placard=this.placards[i];placard.setHidden(false);if(placard._asyncPlacard)
placard._asyncPlacard.setHidden(false);}
if(this._hiddenPlacardsMessageElement){this._hiddenPlacardsMessageElement.remove();delete this._hiddenPlacardsMessageElement;}},_placardContextMenu:function(placard,event)
{var contextMenu=new WebInspector.ContextMenu(event);if(!placard._callFrame.isAsync())
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Restart frame":"Restart Frame"),this._restartFrame.bind(this,placard));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Copy stack trace":"Copy Stack Trace"),this._copyStackTrace.bind(this));contextMenu.show();},_asyncPlacardContextMenu:function(index,event)
{for(;index<this.placards.length;++index){var placard=this.placards[index];if(!placard.isHidden()){this._placardContextMenu(placard,event);break;}}},_restartFrame:function(placard)
{placard._callFrame.restart();this.dispatchEventToListeners(WebInspector.CallStackSidebarPane.Events.CallFrameRestarted,placard._callFrame);},_asyncStackTracesStateChanged:function()
{var enabled=WebInspector.settings.enableAsyncStackTraces.get();if(!enabled&&this.placards)
this._removeAsyncPlacards();},_removeAsyncPlacards:function()
{var shouldSelectTopFrame=false;var lastSyncPlacardIndex=-1;for(var i=0;i<this.placards.length;++i){var placard=this.placards[i];if(placard._asyncPlacard){if(placard.selected)
shouldSelectTopFrame=true;placard._asyncPlacard.element.remove();placard.element.remove();}else{lastSyncPlacardIndex=i;}}
this.placards.length=lastSyncPlacardIndex+1;if(shouldSelectTopFrame)
this._selectNextVisiblePlacard(0);},setSelectedCallFrame:function(x)
{for(var i=0;i<this.placards.length;++i){var placard=this.placards[i];placard.selected=(placard._callFrame===x);if(placard.selected&&placard.isHidden())
this._revealHiddenPlacards();}},_selectNextCallFrameOnStack:function()
{var index=this._selectedCallFrameIndex();if(index===-1)
return false;return this._selectNextVisiblePlacard(index+1);},_selectPreviousCallFrameOnStack:function()
{var index=this._selectedCallFrameIndex();if(index===-1)
return false;return this._selectNextVisiblePlacard(index-1,true);},_selectNextVisiblePlacard:function(index,backward)
{while(0<=index&&index<this.placards.length){var placard=this.placards[index];if(!placard.isHidden()){this._placardSelected(placard);return true;}
index+=backward?-1:1;}
return false;},_selectedCallFrameIndex:function()
{var selectedCallFrame=this._target.debuggerModel.selectedCallFrame();if(!selectedCallFrame)
return-1;for(var i=0;i<this.placards.length;++i){var placard=this.placards[i];if(placard._callFrame===selectedCallFrame)
return i;}
return-1;},_placardSelected:function(placard)
{placard.element.scrollIntoViewIfNeeded();this.dispatchEventToListeners(WebInspector.CallStackSidebarPane.Events.CallFrameSelected,placard._callFrame);},_copyStackTrace:function()
{var text="";var lastPlacard=null;for(var i=0;i<this.placards.length;++i){var placard=this.placards[i];if(placard.isHidden())
continue;if(lastPlacard&&placard._asyncPlacard!==lastPlacard._asyncPlacard)
text+=placard._asyncPlacard.title+"\n";text+=placard.title+" ("+placard.subtitle+")\n";lastPlacard=placard;}
InspectorFrontendHost.copyText(text);},registerShortcuts:function(registerShortcutDelegate)
{registerShortcutDelegate(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.NextCallFrame,this._selectNextCallFrameOnStack.bind(this));registerShortcutDelegate(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.PrevCallFrame,this._selectPreviousCallFrameOnStack.bind(this));},setStatus:function(status)
{if(!this._statusMessageElement)
this._statusMessageElement=this.bodyElement.createChild("div","info");if(typeof status==="string"){this._statusMessageElement.textContent=status;}else{this._statusMessageElement.removeChildren();this._statusMessageElement.appendChild(status);}},_keyDown:function(event)
{if(event.altKey||event.shiftKey||event.metaKey||event.ctrlKey)
return;if(event.keyIdentifier==="Up"&&this._selectPreviousCallFrameOnStack()||event.keyIdentifier==="Down"&&this._selectNextCallFrameOnStack())
event.consume(true);},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.CallStackSidebarPane.Placard=function(callFrame,asyncPlacard)
{WebInspector.Placard.call(this,callFrame.functionName||WebInspector.UIString("(anonymous function)"),"");callFrame.createLiveLocation(this._update.bind(this));this._callFrame=callFrame;this._asyncPlacard=asyncPlacard;}
WebInspector.CallStackSidebarPane.Placard.prototype={_update:function(uiLocation)
{this.subtitle=uiLocation.linkText().trimMiddle(100);},__proto__:WebInspector.Placard.prototype};WebInspector.HistoryEntry=function(){}
WebInspector.HistoryEntry.prototype={valid:function(){},reveal:function(){}};WebInspector.SimpleHistoryManager=function(historyDepth)
{this._entries=[];this._activeEntryIndex=-1;this._coalescingReadonly=0;this._historyDepth=historyDepth;}
WebInspector.SimpleHistoryManager.prototype={readOnlyLock:function()
{++this._coalescingReadonly;},releaseReadOnlyLock:function()
{--this._coalescingReadonly;},readOnly:function()
{return!!this._coalescingReadonly;},filterOut:function(filterOutCallback)
{if(this.readOnly())
return;var filteredEntries=[];var removedBeforeActiveEntry=0;for(var i=0;i<this._entries.length;++i){if(!filterOutCallback(this._entries[i])){filteredEntries.push(this._entries[i]);}else if(i<=this._activeEntryIndex)
++removedBeforeActiveEntry;}
this._entries=filteredEntries;this._activeEntryIndex=Math.max(0,this._activeEntryIndex-removedBeforeActiveEntry);},empty:function()
{return!this._entries.length;},active:function()
{return this.empty()?null:this._entries[this._activeEntryIndex];},push:function(entry)
{if(this.readOnly())
return;if(!this.empty())
this._entries.splice(this._activeEntryIndex+1);this._entries.push(entry);if(this._entries.length>this._historyDepth)
this._entries.shift();this._activeEntryIndex=this._entries.length-1;},rollback:function()
{if(this.empty())
return false;var revealIndex=this._activeEntryIndex-1;while(revealIndex>=0&&!this._entries[revealIndex].valid())
--revealIndex;if(revealIndex<0)
return false;this.readOnlyLock();this._entries[revealIndex].reveal();this.releaseReadOnlyLock();this._activeEntryIndex=revealIndex;return true;},rollover:function()
{var revealIndex=this._activeEntryIndex+1;while(revealIndex<this._entries.length&&!this._entries[revealIndex].valid())
++revealIndex;if(revealIndex>=this._entries.length)
return false;this.readOnlyLock();this._entries[revealIndex].reveal();this.releaseReadOnlyLock();this._activeEntryIndex=revealIndex;return true;},};;WebInspector.EditingLocationHistoryManager=function(sourcesView,currentSourceFrameCallback)
{this._sourcesView=sourcesView;this._historyManager=new WebInspector.SimpleHistoryManager(WebInspector.EditingLocationHistoryManager.HistoryDepth);this._currentSourceFrameCallback=currentSourceFrameCallback;}
WebInspector.EditingLocationHistoryManager.HistoryDepth=20;WebInspector.EditingLocationHistoryManager.prototype={trackSourceFrameCursorJumps:function(sourceFrame)
{sourceFrame.addEventListener(WebInspector.SourceFrame.Events.JumpHappened,this._onJumpHappened.bind(this));},_onJumpHappened:function(event)
{if(event.data.from)
this._updateActiveState(event.data.from);if(event.data.to)
this._pushActiveState(event.data.to);},rollback:function()
{this._historyManager.rollback();},rollover:function()
{this._historyManager.rollover();},updateCurrentState:function()
{var sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;this._updateActiveState(sourceFrame.textEditor.selection());},pushNewState:function()
{var sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;this._pushActiveState(sourceFrame.textEditor.selection());},_updateActiveState:function(selection)
{var active=this._historyManager.active();if(!active)
return;var sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;var entry=new WebInspector.EditingLocationHistoryEntry(this._sourcesView,this,sourceFrame,selection);active.merge(entry);},_pushActiveState:function(selection)
{var sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;var entry=new WebInspector.EditingLocationHistoryEntry(this._sourcesView,this,sourceFrame,selection);this._historyManager.push(entry);},removeHistoryForSourceCode:function(uiSourceCode)
{function filterOut(entry)
{return entry._projectId===uiSourceCode.project().id()&&entry._path===uiSourceCode.path();}
this._historyManager.filterOut(filterOut);},}
WebInspector.EditingLocationHistoryEntry=function(sourcesView,editingLocationManager,sourceFrame,selection)
{this._sourcesView=sourcesView;this._editingLocationManager=editingLocationManager;var uiSourceCode=sourceFrame.uiSourceCode();this._projectId=uiSourceCode.project().id();this._path=uiSourceCode.path();var position=this._positionFromSelection(selection);this._positionHandle=sourceFrame.textEditor.textEditorPositionHandle(position.lineNumber,position.columnNumber);}
WebInspector.EditingLocationHistoryEntry.prototype={merge:function(entry)
{if(this._projectId!==entry._projectId||this._path!==entry._path)
return;this._positionHandle=entry._positionHandle;},_positionFromSelection:function(selection)
{return{lineNumber:selection.endLine,columnNumber:selection.endColumn};},valid:function()
{var position=this._positionHandle.resolve();var uiSourceCode=WebInspector.workspace.project(this._projectId).uiSourceCode(this._path);return!!(position&&uiSourceCode);},reveal:function()
{var position=this._positionHandle.resolve();var uiSourceCode=WebInspector.workspace.project(this._projectId).uiSourceCode(this._path);if(!position||!uiSourceCode)
return;this._editingLocationManager.updateCurrentState();this._sourcesView.showSourceLocation(uiSourceCode,position.lineNumber,position.columnNumber);}};;WebInspector.FilePathScoreFunction=function(query)
{this._query=query;this._queryUpperCase=query.toUpperCase();this._score=null;this._sequence=null;this._dataUpperCase="";this._fileNameIndex=0;}
WebInspector.FilePathScoreFunction.filterRegex=function(query)
{const toEscape=String.regexSpecialCharacters();var regexString="";for(var i=0;i<query.length;++i){var c=query.charAt(i);if(toEscape.indexOf(c)!==-1)
c="\\"+c;if(i)
regexString+="[^"+c+"]*";regexString+=c;}
return new RegExp(regexString,"i");}
WebInspector.FilePathScoreFunction.prototype={score:function(data,matchIndexes)
{if(!data||!this._query)
return 0;var n=this._query.length;var m=data.length;if(!this._score||this._score.length<n*m){this._score=new Int32Array(n*m*2);this._sequence=new Int32Array(n*m*2);}
var score=this._score;var sequence=(this._sequence);this._dataUpperCase=data.toUpperCase();this._fileNameIndex=data.lastIndexOf("/");for(var i=0;i<n;++i){for(var j=0;j<m;++j){var skipCharScore=j===0?0:score[i*m+j-1];var prevCharScore=i===0||j===0?0:score[(i-1)*m+j-1];var consecutiveMatch=i===0||j===0?0:sequence[(i-1)*m+j-1];var pickCharScore=this._match(this._query,data,i,j,consecutiveMatch);if(pickCharScore&&prevCharScore+pickCharScore>skipCharScore){sequence[i*m+j]=consecutiveMatch+1;score[i*m+j]=(prevCharScore+pickCharScore);}else{sequence[i*m+j]=0;score[i*m+j]=skipCharScore;}}}
if(matchIndexes)
this._restoreMatchIndexes(sequence,n,m,matchIndexes);return score[n*m-1];},_testWordStart:function(data,j)
{var prevChar=data.charAt(j-1);return j===0||prevChar==="_"||prevChar==="-"||prevChar==="/"||(data[j-1]!==this._dataUpperCase[j-1]&&data[j]===this._dataUpperCase[j]);},_restoreMatchIndexes:function(sequence,n,m,out)
{var i=n-1,j=m-1;while(i>=0&&j>=0){switch(sequence[i*m+j]){case 0:--j;break;default:out.push(j);--i;--j;break;}}
out.reverse();},_singleCharScore:function(query,data,i,j)
{var isWordStart=this._testWordStart(data,j);var isFileName=j>this._fileNameIndex;var isPathTokenStart=j===0||data[j-1]==="/";var isCapsMatch=query[i]===data[j]&&query[i]==this._queryUpperCase[i];var score=10;if(isPathTokenStart)
score+=4;if(isWordStart)
score+=2;if(isCapsMatch)
score+=6;if(isFileName)
score+=4;if(j===this._fileNameIndex+1&&i===0)
score+=5;if(isFileName&&isWordStart)
score+=3;return score;},_sequenceCharScore:function(query,data,i,j,sequenceLength)
{var isFileName=j>this._fileNameIndex;var isPathTokenStart=j===0||data[j-1]==="/";var score=10;if(isFileName)
score+=4;if(isPathTokenStart)
score+=5;score+=sequenceLength*4;return score;},_match:function(query,data,i,j,consecutiveMatch)
{if(this._queryUpperCase[i]!==this._dataUpperCase[j])
return 0;if(!consecutiveMatch)
return this._singleCharScore(query,data,i,j);else
return this._sequenceCharScore(query,data,i,j-consecutiveMatch,consecutiveMatch);},};WebInspector.FilteredItemSelectionDialog=function(delegate)
{WebInspector.DialogDelegate.call(this);if(!WebInspector.FilteredItemSelectionDialog._stylesLoaded){WebInspector.View.createStyleElement("filteredItemSelectionDialog.css");WebInspector.FilteredItemSelectionDialog._stylesLoaded=true;}
this.element=document.createElement("div");this.element.className="filtered-item-list-dialog";this.element.addEventListener("keydown",this._onKeyDown.bind(this),false);this._promptElement=this.element.createChild("input","monospace");this._promptElement.addEventListener("input",this._onInput.bind(this),false);this._promptElement.type="text";this._promptElement.setAttribute("spellcheck","false");this._filteredItems=[];this._viewportControl=new WebInspector.ViewportControl(this);this._viewportControl.element.classList.add("fill");this._itemElementsContainer=this._viewportControl.element;this._itemElementsContainer.classList.add("container");this._itemElementsContainer.classList.add("monospace");this._itemElementsContainer.addEventListener("click",this._onClick.bind(this),false);this.element.appendChild(this._itemElementsContainer);this._delegate=delegate;this._delegate.setRefreshCallback(this._itemsLoaded.bind(this));this._itemsLoaded();}
WebInspector.FilteredItemSelectionDialog.prototype={position:function(element,relativeToElement)
{const shadow=10;const shadowPadding=20;var container=WebInspector.Dialog.modalHostView().element;var preferredWidth=Math.max(relativeToElement.offsetWidth*2/3,500);var width=Math.min(preferredWidth,container.offsetWidth-2*shadowPadding);var preferredHeight=Math.max(relativeToElement.offsetHeight*2/3,204);var height=Math.min(preferredHeight,container.offsetHeight-2*shadowPadding);this.element.style.width=width+"px";var box=relativeToElement.boxInWindow(window).relativeToElement(container);var positionX=box.x+Math.max((box.width-width-2*shadowPadding)/2,shadow);positionX=Math.max(shadow,Math.min(container.offsetWidth-width-2*shadowPadding,positionX));var positionY=box.y+Math.max((box.height-height-2*shadowPadding)/2,shadow);positionY=Math.max(shadow,Math.min(container.offsetHeight-height-2*shadowPadding,positionY));element.positionAt(positionX,positionY,container);this._dialogHeight=height;this._updateShowMatchingItems();},focus:function()
{WebInspector.setCurrentFocusElement(this._promptElement);if(this._filteredItems.length&&this._viewportControl.lastVisibleIndex()===-1)
this._viewportControl.refresh();},willHide:function()
{if(this._isHiding)
return;this._isHiding=true;this._delegate.dispose();if(this._filterTimer)
clearTimeout(this._filterTimer);},renderAsTwoRows:function()
{this._renderAsTwoRows=true;},onEnter:function()
{if(!this._delegate.itemCount())
return;var selectedIndex=this._shouldShowMatchingItems()&&this._selectedIndexInFiltered<this._filteredItems.length?this._filteredItems[this._selectedIndexInFiltered]:null;this._delegate.selectItem(selectedIndex,this._promptElement.value.trim());},_itemsLoaded:function()
{if(this._loadTimeout)
return;this._loadTimeout=setTimeout(this._updateAfterItemsLoaded.bind(this),0);},_updateAfterItemsLoaded:function()
{delete this._loadTimeout;this._filterItems();},_createItemElement:function(index)
{var itemElement=document.createElement("div");itemElement.className="filtered-item-list-dialog-item "+(this._renderAsTwoRows?"two-rows":"one-row");itemElement._titleElement=itemElement.createChild("div","filtered-item-list-dialog-title");itemElement._subtitleElement=itemElement.createChild("div","filtered-item-list-dialog-subtitle");itemElement._subtitleElement.textContent="\u200B";itemElement._index=index;this._delegate.renderItem(index,this._promptElement.value.trim(),itemElement._titleElement,itemElement._subtitleElement);return itemElement;},setQuery:function(query)
{this._promptElement.value=query;this._scheduleFilter();},_filterItems:function()
{delete this._filterTimer;if(this._scoringTimer){clearTimeout(this._scoringTimer);delete this._scoringTimer;}
var query=this._delegate.rewriteQuery(this._promptElement.value.trim());this._query=query;var queryLength=query.length;var filterRegex=query?WebInspector.FilePathScoreFunction.filterRegex(query):null;var oldSelectedAbsoluteIndex=this._selectedIndexInFiltered?this._filteredItems[this._selectedIndexInFiltered]:null;var filteredItems=[];this._selectedIndexInFiltered=0;var bestScores=[];var bestItems=[];var bestItemsToCollect=100;var minBestScore=0;var overflowItems=[];scoreItems.call(this,0);function compareIntegers(a,b)
{return b-a;}
function scoreItems(fromIndex)
{var maxWorkItems=1000;var workDone=0;for(var i=fromIndex;i<this._delegate.itemCount()&&workDone<maxWorkItems;++i){if(filterRegex&&!filterRegex.test(this._delegate.itemKeyAt(i)))
continue;var score=this._delegate.itemScoreAt(i,query);if(query)
workDone++;if(score>minBestScore||bestScores.length<bestItemsToCollect){var index=insertionIndexForObjectInListSortedByFunction(score,bestScores,compareIntegers,true);bestScores.splice(index,0,score);bestItems.splice(index,0,i);if(bestScores.length>bestItemsToCollect){overflowItems.push(bestItems.peekLast());bestScores.length=bestItemsToCollect;bestItems.length=bestItemsToCollect;}
minBestScore=bestScores.peekLast();}else
filteredItems.push(i);}
if(i<this._delegate.itemCount()){this._scoringTimer=setTimeout(scoreItems.bind(this,i),0);return;}
delete this._scoringTimer;this._filteredItems=bestItems.concat(overflowItems).concat(filteredItems);for(var i=0;i<this._filteredItems.length;++i){if(this._filteredItems[i]===oldSelectedAbsoluteIndex){this._selectedIndexInFiltered=i;break;}}
this._viewportControl.invalidate();if(!query)
this._selectedIndexInFiltered=0;this._updateSelection(this._selectedIndexInFiltered,false);}},_shouldShowMatchingItems:function()
{return this._delegate.shouldShowMatchingItems(this._promptElement.value);},_onInput:function(event)
{this._updateShowMatchingItems();this._scheduleFilter();},_updateShowMatchingItems:function()
{var shouldShowMatchingItems=this._shouldShowMatchingItems();this._itemElementsContainer.classList.toggle("hidden",!shouldShowMatchingItems);this.element.style.height=shouldShowMatchingItems?this._dialogHeight+"px":"auto";},_rowsPerViewport:function()
{return Math.floor(this._viewportControl.element.clientHeight/this._rowHeight);},_onKeyDown:function(event)
{var newSelectedIndex=this._selectedIndexInFiltered;switch(event.keyCode){case WebInspector.KeyboardShortcut.Keys.Down.code:if(++newSelectedIndex>=this._filteredItems.length)
newSelectedIndex=this._filteredItems.length-1;this._updateSelection(newSelectedIndex,true);event.consume(true);break;case WebInspector.KeyboardShortcut.Keys.Up.code:if(--newSelectedIndex<0)
newSelectedIndex=0;this._updateSelection(newSelectedIndex,false);event.consume(true);break;case WebInspector.KeyboardShortcut.Keys.PageDown.code:newSelectedIndex=Math.min(newSelectedIndex+this._rowsPerViewport(),this._filteredItems.length-1);this._updateSelection(newSelectedIndex,true);event.consume(true);break;case WebInspector.KeyboardShortcut.Keys.PageUp.code:newSelectedIndex=Math.max(newSelectedIndex-this._rowsPerViewport(),0);this._updateSelection(newSelectedIndex,false);event.consume(true);break;default:}},_scheduleFilter:function()
{if(this._filterTimer)
return;this._filterTimer=setTimeout(this._filterItems.bind(this),0);},_updateSelection:function(index,makeLast)
{var element=this._viewportControl.renderedElementAt(this._selectedIndexInFiltered);if(element)
element.classList.remove("selected");this._viewportControl.scrollItemIntoView(index,makeLast);this._selectedIndexInFiltered=index;element=this._viewportControl.renderedElementAt(index);if(element)
element.classList.add("selected");},_onClick:function(event)
{var itemElement=event.target.enclosingNodeOrSelfWithClass("filtered-item-list-dialog-item");if(!itemElement)
return;this._delegate.selectItem(itemElement._index,this._promptElement.value.trim());WebInspector.Dialog.hide();},itemCount:function()
{return this._filteredItems.length;},fastHeight:function(index)
{if(!this._rowHeight){var delegateIndex=this._filteredItems[index];var element=this._createItemElement(delegateIndex);this._rowHeight=element.measurePreferredSize(this._viewportControl.contentElement()).height;}
return this._rowHeight;},itemElement:function(index)
{var delegateIndex=this._filteredItems[index];var element=this._createItemElement(delegateIndex);if(index===this._selectedIndexInFiltered)
element.classList.add("selected");return new WebInspector.StaticViewportElement(element);},__proto__:WebInspector.DialogDelegate.prototype}
WebInspector.SelectionDialogContentProvider=function()
{}
WebInspector.SelectionDialogContentProvider.prototype={setRefreshCallback:function(refreshCallback)
{this._refreshCallback=refreshCallback;},shouldShowMatchingItems:function(query)
{return true;},itemCount:function()
{return 0;},itemKeyAt:function(itemIndex)
{return"";},itemScoreAt:function(itemIndex,query)
{return 1;},renderItem:function(itemIndex,query,titleElement,subtitleElement)
{},highlightRanges:function(element,query)
{if(!query)
return false;function rangesForMatch(text,query)
{var sm=new difflib.SequenceMatcher(query,text);var opcodes=sm.get_opcodes();var ranges=[];for(var i=0;i<opcodes.length;++i){var opcode=opcodes[i];if(opcode[0]==="equal")
ranges.push(new WebInspector.SourceRange(opcode[3],opcode[4]-opcode[3]));else if(opcode[0]!=="insert")
return null;}
return ranges;}
var text=element.textContent;var ranges=rangesForMatch(text,query);if(!ranges)
ranges=rangesForMatch(text.toUpperCase(),query.toUpperCase());if(ranges){WebInspector.highlightRangesWithStyleClass(element,ranges,"highlight");return true;}
return false;},selectItem:function(itemIndex,promptValue)
{},refresh:function()
{this._refreshCallback();},rewriteQuery:function(query)
{return query;},dispose:function()
{}}
WebInspector.JavaScriptOutlineDialog=function(uiSourceCode,selectItemCallback)
{WebInspector.SelectionDialogContentProvider.call(this);this._functionItems=[];this._selectItemCallback=selectItemCallback;this._outlineWorker=new Worker("script_formatter_worker/ScriptFormatterWorker.js");this._outlineWorker.onmessage=this._didBuildOutlineChunk.bind(this);this._outlineWorker.postMessage({method:"javaScriptOutline",params:{content:uiSourceCode.workingCopy()}});}
WebInspector.JavaScriptOutlineDialog.show=function(view,uiSourceCode,selectItemCallback)
{if(WebInspector.Dialog.currentInstance())
return null;var filteredItemSelectionDialog=new WebInspector.FilteredItemSelectionDialog(new WebInspector.JavaScriptOutlineDialog(uiSourceCode,selectItemCallback));WebInspector.Dialog.show(view.element,filteredItemSelectionDialog);}
WebInspector.JavaScriptOutlineDialog.prototype={_didBuildOutlineChunk:function(event)
{var data=(event.data);var chunk=data.chunk;for(var i=0;i<chunk.length;++i)
this._functionItems.push(chunk[i]);if(data.total===data.index+1)
this.dispose();this.refresh();},itemCount:function()
{return this._functionItems.length;},itemKeyAt:function(itemIndex)
{return this._functionItems[itemIndex].name;},itemScoreAt:function(itemIndex,query)
{var item=this._functionItems[itemIndex];return-item.line;},renderItem:function(itemIndex,query,titleElement,subtitleElement)
{var item=this._functionItems[itemIndex];titleElement.textContent=item.name+(item.arguments?item.arguments:"");this.highlightRanges(titleElement,query);subtitleElement.textContent=":"+(item.line+1);},selectItem:function(itemIndex,promptValue)
{if(itemIndex===null)
return;var lineNumber=this._functionItems[itemIndex].line;if(!isNaN(lineNumber)&&lineNumber>=0)
this._selectItemCallback(lineNumber,this._functionItems[itemIndex].column);},dispose:function()
{if(this._outlineWorker){this._outlineWorker.terminate();delete this._outlineWorker;}},__proto__:WebInspector.SelectionDialogContentProvider.prototype}
WebInspector.SelectUISourceCodeDialog=function(defaultScores)
{WebInspector.SelectionDialogContentProvider.call(this);this._populate();this._defaultScores=defaultScores;this._scorer=new WebInspector.FilePathScoreFunction("");WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset,this._projectWillReset,this);}
WebInspector.SelectUISourceCodeDialog.prototype={_projectWillReset:function(event)
{var project=(event.data);this._populate(project);this.refresh();},_populate:function(skipProject)
{this._uiSourceCodes=[];var projects=WebInspector.workspace.projects().filter(this.filterProject.bind(this));for(var i=0;i<projects.length;++i){if(skipProject&&projects[i]===skipProject)
continue;this._uiSourceCodes=this._uiSourceCodes.concat(projects[i].uiSourceCodes());}},uiSourceCodeSelected:function(uiSourceCode,lineNumber,columnNumber)
{},filterProject:function(project)
{return true;},itemCount:function()
{return this._uiSourceCodes.length;},itemKeyAt:function(itemIndex)
{return this._uiSourceCodes[itemIndex].fullDisplayName();},itemScoreAt:function(itemIndex,query)
{var uiSourceCode=this._uiSourceCodes[itemIndex];var score=this._defaultScores?(this._defaultScores.get(uiSourceCode)||0):0;if(!query||query.length<2)
return score;if(this._query!==query){this._query=query;this._scorer=new WebInspector.FilePathScoreFunction(query);}
var path=uiSourceCode.fullDisplayName();return score+10*this._scorer.score(path,null);},renderItem:function(itemIndex,query,titleElement,subtitleElement)
{query=this.rewriteQuery(query);var uiSourceCode=this._uiSourceCodes[itemIndex];titleElement.textContent=uiSourceCode.displayName()+(this._queryLineNumberAndColumnNumber||"");subtitleElement.textContent=uiSourceCode.fullDisplayName().trimEnd(100);var indexes=[];var score=new WebInspector.FilePathScoreFunction(query).score(subtitleElement.textContent,indexes);var fileNameIndex=subtitleElement.textContent.lastIndexOf("/");var ranges=[];for(var i=0;i<indexes.length;++i)
ranges.push({offset:indexes[i],length:1});if(indexes[0]>fileNameIndex){for(var i=0;i<ranges.length;++i)
ranges[i].offset-=fileNameIndex+1;return WebInspector.highlightRangesWithStyleClass(titleElement,ranges,"highlight");}else{return WebInspector.highlightRangesWithStyleClass(subtitleElement,ranges,"highlight");}},selectItem:function(itemIndex,promptValue)
{var parsedExpression=promptValue.trim().match(/^([^:]*)(:\d+)?(:\d+)?$/);if(!parsedExpression)
return;var lineNumber;var columnNumber;if(parsedExpression[2])
lineNumber=parseInt(parsedExpression[2].substr(1),10)-1;if(parsedExpression[3])
columnNumber=parseInt(parsedExpression[3].substr(1),10)-1;var uiSourceCode=itemIndex!==null?this._uiSourceCodes[itemIndex]:null;this.uiSourceCodeSelected(uiSourceCode,lineNumber,columnNumber);},rewriteQuery:function(query)
{if(!query)
return query;query=query.trim();var lineNumberMatch=query.match(/^([^:]+)((?::[^:]*){0,2})$/);this._queryLineNumberAndColumnNumber=lineNumberMatch?lineNumberMatch[2]:"";return lineNumberMatch?lineNumberMatch[1]:query;},_uiSourceCodeAdded:function(event)
{var uiSourceCode=(event.data);if(!this.filterProject(uiSourceCode.project()))
return;this._uiSourceCodes.push(uiSourceCode)
this.refresh();},dispose:function()
{WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.ProjectWillReset,this._projectWillReset,this);},__proto__:WebInspector.SelectionDialogContentProvider.prototype}
WebInspector.OpenResourceDialog=function(sourcesView,defaultScores)
{WebInspector.SelectUISourceCodeDialog.call(this,defaultScores);this._sourcesView=sourcesView;}
WebInspector.OpenResourceDialog.prototype={uiSourceCodeSelected:function(uiSourceCode,lineNumber,columnNumber)
{if(!uiSourceCode)
uiSourceCode=this._sourcesView.currentUISourceCode();if(!uiSourceCode)
return;this._sourcesView.showSourceLocation(uiSourceCode,lineNumber,columnNumber);},shouldShowMatchingItems:function(query)
{return!query.startsWith(":");},filterProject:function(project)
{return!project.isServiceProject();},__proto__:WebInspector.SelectUISourceCodeDialog.prototype}
WebInspector.OpenResourceDialog.show=function(sourcesView,relativeToElement,query,defaultScores)
{if(WebInspector.Dialog.currentInstance())
return;var filteredItemSelectionDialog=new WebInspector.FilteredItemSelectionDialog(new WebInspector.OpenResourceDialog(sourcesView,defaultScores));filteredItemSelectionDialog.renderAsTwoRows();if(query)
filteredItemSelectionDialog.setQuery(query);WebInspector.Dialog.show(relativeToElement,filteredItemSelectionDialog);}
WebInspector.SelectUISourceCodeForProjectTypesDialog=function(types,callback)
{this._types=types;WebInspector.SelectUISourceCodeDialog.call(this);this._callback=callback;}
WebInspector.SelectUISourceCodeForProjectTypesDialog.prototype={uiSourceCodeSelected:function(uiSourceCode,lineNumber,columnNumber)
{this._callback(uiSourceCode);},filterProject:function(project)
{return this._types.indexOf(project.type())!==-1;},__proto__:WebInspector.SelectUISourceCodeDialog.prototype}
WebInspector.SelectUISourceCodeForProjectTypesDialog.show=function(name,types,callback,relativeToElement)
{if(WebInspector.Dialog.currentInstance())
return;var filteredItemSelectionDialog=new WebInspector.FilteredItemSelectionDialog(new WebInspector.SelectUISourceCodeForProjectTypesDialog(types,callback));filteredItemSelectionDialog.setQuery(name);filteredItemSelectionDialog.renderAsTwoRows();WebInspector.Dialog.show(relativeToElement,filteredItemSelectionDialog);}
WebInspector.JavaScriptOutlineDialog.MessageEventData;;WebInspector.UISourceCodeFrame=function(uiSourceCode)
{this._uiSourceCode=uiSourceCode;WebInspector.SourceFrame.call(this,this._uiSourceCode);WebInspector.settings.textEditorAutocompletion.addChangeListener(this._enableAutocompletionIfNeeded,this);this._enableAutocompletionIfNeeded();this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged,this._onWorkingCopyChanged,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted,this._onWorkingCopyCommitted,this);this._updateStyle();}
WebInspector.UISourceCodeFrame.prototype={uiSourceCode:function()
{return this._uiSourceCode;},_enableAutocompletionIfNeeded:function()
{this.textEditor.setCompletionDictionary(WebInspector.settings.textEditorAutocompletion.get()?new WebInspector.SampleCompletionDictionary():null);},wasShown:function()
{WebInspector.SourceFrame.prototype.wasShown.call(this);this._boundWindowFocused=this._windowFocused.bind(this);window.addEventListener("focus",this._boundWindowFocused,false);this._checkContentUpdated();},willHide:function()
{WebInspector.SourceFrame.prototype.willHide.call(this);window.removeEventListener("focus",this._boundWindowFocused,false);delete this._boundWindowFocused;this._uiSourceCode.removeWorkingCopyGetter();},canEditSource:function()
{var projectType=this._uiSourceCode.project().type();if(projectType===WebInspector.projectTypes.Debugger||projectType===WebInspector.projectTypes.Formatter)
return false;if(projectType===WebInspector.projectTypes.Network&&this._uiSourceCode.contentType()===WebInspector.resourceTypes.Document)
return false;return true;},_windowFocused:function(event)
{this._checkContentUpdated();},_checkContentUpdated:function()
{if(!this.loaded||!this.isShowing())
return;this._uiSourceCode.checkContentUpdated();},commitEditing:function()
{if(!this._uiSourceCode.isDirty())
return;this._muteSourceCodeEvents=true;this._uiSourceCode.commitWorkingCopy(this._didEditContent.bind(this));delete this._muteSourceCodeEvents;},onTextChanged:function(oldRange,newRange)
{WebInspector.SourceFrame.prototype.onTextChanged.call(this,oldRange,newRange);if(this._isSettingContent)
return;this._muteSourceCodeEvents=true;if(this._textEditor.isClean())
this._uiSourceCode.resetWorkingCopy();else
this._uiSourceCode.setWorkingCopyGetter(this._textEditor.text.bind(this._textEditor));delete this._muteSourceCodeEvents;},_didEditContent:function(error)
{if(error){WebInspector.messageSink.addErrorMessage(error,true);return;}},_onWorkingCopyChanged:function(event)
{if(this._muteSourceCodeEvents)
return;this._innerSetContent(this._uiSourceCode.workingCopy());this.onUISourceCodeContentChanged();},_onWorkingCopyCommitted:function(event)
{if(!this._muteSourceCodeEvents){this._innerSetContent(this._uiSourceCode.workingCopy());this.onUISourceCodeContentChanged();}
this._textEditor.markClean();this._updateStyle();},_updateStyle:function()
{this.element.classList.toggle("source-frame-unsaved-committed-changes",this._uiSourceCode.hasUnsavedCommittedChanges());},onUISourceCodeContentChanged:function()
{},_innerSetContent:function(content)
{this._isSettingContent=true;this.setContent(content);delete this._isSettingContent;},populateTextAreaContextMenu:function(contextMenu,lineNumber)
{WebInspector.SourceFrame.prototype.populateTextAreaContextMenu.call(this,contextMenu,lineNumber);contextMenu.appendApplicableItems(this._uiSourceCode);contextMenu.appendSeparator();},dispose:function()
{WebInspector.settings.textEditorAutocompletion.removeChangeListener(this._enableAutocompletionIfNeeded,this);this._textEditor.dispose();this.detach();},__proto__:WebInspector.SourceFrame.prototype};WebInspector.JavaScriptSourceFrame=function(scriptsPanel,uiSourceCode)
{this._scriptsPanel=scriptsPanel;this._breakpointManager=WebInspector.breakpointManager;this._uiSourceCode=uiSourceCode;WebInspector.UISourceCodeFrame.call(this,uiSourceCode);if(uiSourceCode.project().type()===WebInspector.projectTypes.Debugger)
this.element.classList.add("source-frame-debugger-script");this._popoverHelper=new WebInspector.ObjectPopoverHelper(this.textEditor.element,this._getPopoverAnchor.bind(this),this._resolveObjectForPopover.bind(this),this._onHidePopover.bind(this),true);this.textEditor.element.addEventListener("keydown",this._onKeyDown.bind(this),true);this.textEditor.addEventListener(WebInspector.TextEditor.Events.GutterClick,this._handleGutterClick.bind(this),this);this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointAdded,this._breakpointAdded,this);this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointRemoved,this._breakpointRemoved,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.ConsoleMessageAdded,this._consoleMessageAdded,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.ConsoleMessageRemoved,this._consoleMessageRemoved,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.ConsoleMessagesCleared,this._consoleMessagesCleared,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.SourceMappingChanged,this._onSourceMappingChanged,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);this._scriptFileForTarget=new Map();this._registerShortcuts();var targets=WebInspector.targetManager.targets();for(var i=0;i<targets.length;++i){var scriptFile=uiSourceCode.scriptFileForTarget(targets[i]);if(scriptFile)
this._updateScriptFile(targets[i]);}}
WebInspector.JavaScriptSourceFrame.prototype={_showInfobar:function(infobarElement)
{if(this._infobarElement)
this._infobarElement.remove();this._infobarElement=infobarElement;this._infobarElement.classList.add("java-script-source-frame-infobar");this.element.insertBefore(this._infobarElement,this.element.children[0]);this.doResize();},_hideInfobar:function(infobarElement)
{infobarElement.remove();this.doResize();},_showDivergedInfobar:function()
{if(this._uiSourceCode.contentType()!==WebInspector.resourceTypes.Script)
return;this._divergedInfobarElement=document.createElement("div");var infobarMainRow=this._divergedInfobarElement.createChild("div","java-script-source-frame-infobar-main-row");var infobarDetailsContainer=this._divergedInfobarElement.createChild("span","java-script-source-frame-infobar-details-container");infobarMainRow.createChild("span","java-script-source-frame-infobar-warning-icon");var infobarMessage=infobarMainRow.createChild("span","java-script-source-frame-infobar-row-message");infobarMessage.textContent=WebInspector.UIString("Workspace mapping mismatch");function updateDetailsVisibility()
{detailsToggleElement.textContent=detailsToggleElement._toggled?WebInspector.UIString("less"):WebInspector.UIString("more");infobarDetailsContainer.classList.toggle("hidden",!detailsToggleElement._toggled);this.doResize();}
function toggleDetails()
{detailsToggleElement._toggled=!detailsToggleElement._toggled;updateDetailsVisibility.call(this);}
infobarMainRow.appendChild(document.createTextNode("\u00a0"));var detailsToggleElement=infobarMainRow.createChild("div","java-script-source-frame-infobar-toggle");detailsToggleElement.addEventListener("click",toggleDetails.bind(this));updateDetailsVisibility.call(this);function createDetailsRowMessage()
{var infobarDetailsRow=infobarDetailsContainer.createChild("div","java-script-source-frame-infobar-details-row");return infobarDetailsRow.createChild("span","java-script-source-frame-infobar-row-message");}
var infobarDetailsRowMessage;infobarDetailsRowMessage=createDetailsRowMessage();infobarDetailsRowMessage.appendChild(document.createTextNode(WebInspector.UIString("The content of this file on the file system:\u00a0")));var fileURL=this._uiSourceCode.originURL();infobarDetailsRowMessage.appendChild(WebInspector.linkifyURLAsNode(fileURL,fileURL,"java-script-source-frame-infobar-details-url",true,fileURL));infobarDetailsRowMessage=createDetailsRowMessage();infobarDetailsRowMessage.appendChild(document.createTextNode(WebInspector.UIString("does not match the loaded script:\u00a0")));var scriptURL=this._uiSourceCode.url;infobarDetailsRowMessage.appendChild(WebInspector.linkifyURLAsNode(scriptURL,scriptURL,"java-script-source-frame-infobar-details-url",true,scriptURL));createDetailsRowMessage();createDetailsRowMessage().textContent=WebInspector.UIString("Possible solutions are:");;function createDetailsRowMessageAction(title)
{infobarDetailsRowMessage=createDetailsRowMessage();infobarDetailsRowMessage.appendChild(document.createTextNode(" - "));infobarDetailsRowMessage.appendChild(document.createTextNode(title));}
if(WebInspector.settings.cacheDisabled.get())
createDetailsRowMessageAction(WebInspector.UIString("Reload inspected page"));else
createDetailsRowMessageAction(WebInspector.UIString("Check \"Disable cache\" in settings and reload inspected page (recommended setup for authoring and debugging)"));createDetailsRowMessageAction(WebInspector.UIString("Check that your file and script are both loaded from the correct source and their contents match."));this._showInfobar(this._divergedInfobarElement);},_hideDivergedInfobar:function()
{if(!this._divergedInfobarElement)
return;this._hideInfobar(this._divergedInfobarElement);delete this._divergedInfobarElement;},_registerShortcuts:function()
{var shortcutKeys=WebInspector.ShortcutsScreen.SourcesPanelShortcuts;for(var i=0;i<shortcutKeys.EvaluateSelectionInConsole.length;++i){var keyDescriptor=shortcutKeys.EvaluateSelectionInConsole[i];this.addShortcut(keyDescriptor.key,this._evaluateSelectionInConsole.bind(this));}
for(var i=0;i<shortcutKeys.AddSelectionToWatch.length;++i){var keyDescriptor=shortcutKeys.AddSelectionToWatch[i];this.addShortcut(keyDescriptor.key,this._addCurrentSelectionToWatch.bind(this));}},_addCurrentSelectionToWatch:function()
{var textSelection=this.textEditor.selection();if(textSelection&&!textSelection.isEmpty())
this._innerAddToWatch(this.textEditor.copyRange(textSelection));},_innerAddToWatch:function(expression)
{this._scriptsPanel.addToWatch(expression);},_evaluateSelectionInConsole:function()
{var selection=this.textEditor.selection();if(!selection||selection.isEmpty())
return false;this._evaluateInConsole(this.textEditor.copyRange(selection));return true;},_evaluateInConsole:function(expression)
{var currentExecutionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);if(currentExecutionContext)
WebInspector.ConsoleModel.evaluateCommandInConsole(currentExecutionContext,expression);},wasShown:function()
{WebInspector.UISourceCodeFrame.prototype.wasShown.call(this);},willHide:function()
{WebInspector.UISourceCodeFrame.prototype.willHide.call(this);this._popoverHelper.hidePopover();},onUISourceCodeContentChanged:function()
{this._removeAllBreakpoints();WebInspector.UISourceCodeFrame.prototype.onUISourceCodeContentChanged.call(this);},populateLineGutterContextMenu:function(contextMenu,lineNumber)
{contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Continue to here":"Continue to Here"),this._continueToLine.bind(this,lineNumber));var breakpoint=this._breakpointManager.findBreakpointOnLine(this._uiSourceCode,lineNumber);if(!breakpoint){contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add breakpoint":"Add Breakpoint"),this._setBreakpoint.bind(this,lineNumber,0,"",true));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add conditional breakpoint…":"Add Conditional Breakpoint…"),this._editBreakpointCondition.bind(this,lineNumber));}else{contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Remove breakpoint":"Remove Breakpoint"),breakpoint.remove.bind(breakpoint));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Edit breakpoint…":"Edit Breakpoint…"),this._editBreakpointCondition.bind(this,lineNumber,breakpoint));if(breakpoint.enabled())
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Disable breakpoint":"Disable Breakpoint"),breakpoint.setEnabled.bind(breakpoint,false));else
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Enable breakpoint":"Enable Breakpoint"),breakpoint.setEnabled.bind(breakpoint,true));}},populateTextAreaContextMenu:function(contextMenu,lineNumber)
{var textSelection=this.textEditor.selection();if(textSelection&&!textSelection.isEmpty()){var selection=this.textEditor.copyRange(textSelection);var addToWatchLabel=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add to watch":"Add to Watch");contextMenu.appendItem(addToWatchLabel,this._innerAddToWatch.bind(this,selection));var evaluateLabel=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Evaluate in console":"Evaluate in Console");contextMenu.appendItem(evaluateLabel,this._evaluateInConsole.bind(this,selection));contextMenu.appendSeparator();}else if(this._uiSourceCode.project().type()===WebInspector.projectTypes.Debugger){var liveEditLabel=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Live edit":"Live Edit");contextMenu.appendItem(liveEditLabel,liveEdit.bind(this));contextMenu.appendSeparator();}
function liveEdit()
{var liveEditUISourceCode=WebInspector.liveEditSupport.uiSourceCodeForLiveEdit(this._uiSourceCode);WebInspector.Revealer.reveal(liveEditUISourceCode.uiLocation(lineNumber));}
WebInspector.UISourceCodeFrame.prototype.populateTextAreaContextMenu.call(this,contextMenu,lineNumber);},_workingCopyChanged:function(event)
{if(this._supportsEnabledBreakpointsWhileEditing()||this._scriptFileForTarget.size())
return;if(this._uiSourceCode.isDirty())
this._muteBreakpointsWhileEditing();else
this._restoreBreakpointsAfterEditing();},_workingCopyCommitted:function(event)
{if(this._supportsEnabledBreakpointsWhileEditing())
return;if(this._scriptFileForTarget.size()){this._hasCommittedLiveEdit=true;var scriptFiles=this._scriptFileForTarget.values();for(var i=0;i<scriptFiles.length;++i)
scriptFiles[i].commitLiveEdit();return;}
this._restoreBreakpointsAfterEditing();},_didMergeToVM:function()
{if(this._supportsEnabledBreakpointsWhileEditing())
return;this._updateDivergedInfobar();this._restoreBreakpointsIfConsistentScripts();},_didDivergeFromVM:function()
{if(this._supportsEnabledBreakpointsWhileEditing())
return;this._updateDivergedInfobar();this._muteBreakpointsWhileEditing();},_muteBreakpointsWhileEditing:function()
{if(this._muted)
return;for(var lineNumber=0;lineNumber<this._textEditor.linesCount;++lineNumber){var breakpointDecoration=this._textEditor.getAttribute(lineNumber,"breakpoint");if(!breakpointDecoration)
continue;this._removeBreakpointDecoration(lineNumber);this._addBreakpointDecoration(lineNumber,breakpointDecoration.columnNumber,breakpointDecoration.condition,breakpointDecoration.enabled,true);}
this._muted=true;},_updateDivergedInfobar:function()
{if(this._uiSourceCode.project().type()!==WebInspector.projectTypes.FileSystem){this._hideDivergedInfobar();return;}
var scriptFiles=this._scriptFileForTarget.values();var hasDivergedScript=false;for(var i=0;i<scriptFiles.length;++i)
hasDivergedScript=hasDivergedScript||scriptFiles[i].hasDivergedFromVM();if(this._divergedInfobarElement){if(!hasDivergedScript||this._hasCommittedLiveEdit)
this._hideDivergedInfobar();}else{if(hasDivergedScript&&!this._uiSourceCode.isDirty()&&!this._hasCommittedLiveEdit)
this._showDivergedInfobar();}},_supportsEnabledBreakpointsWhileEditing:function()
{return this._uiSourceCode.project().type()===WebInspector.projectTypes.Snippets;},_restoreBreakpointsIfConsistentScripts:function()
{var scriptFiles=this._scriptFileForTarget.values();for(var i=0;i<scriptFiles.length;++i)
if(scriptFiles[i].hasDivergedFromVM()||scriptFiles[i].isMergingToVM())
return;this._restoreBreakpointsAfterEditing();},_restoreBreakpointsAfterEditing:function()
{delete this._muted;var breakpoints={};for(var lineNumber=0;lineNumber<this._textEditor.linesCount;++lineNumber){var breakpointDecoration=this._textEditor.getAttribute(lineNumber,"breakpoint");if(breakpointDecoration){breakpoints[lineNumber]=breakpointDecoration;this._removeBreakpointDecoration(lineNumber);}}
this._removeAllBreakpoints();for(var lineNumberString in breakpoints){var lineNumber=parseInt(lineNumberString,10);if(isNaN(lineNumber))
continue;var breakpointDecoration=breakpoints[lineNumberString];this._setBreakpoint(lineNumber,breakpointDecoration.columnNumber,breakpointDecoration.condition,breakpointDecoration.enabled);}},_removeAllBreakpoints:function()
{var breakpoints=this._breakpointManager.breakpointsForUISourceCode(this._uiSourceCode);for(var i=0;i<breakpoints.length;++i)
breakpoints[i].remove();},_getPopoverAnchor:function(element,event)
{if(!WebInspector.debuggerModel.isPaused())
return null;var textPosition=this.textEditor.coordinatesToCursorPosition(event.x,event.y);if(!textPosition)
return null;var mouseLine=textPosition.startLine;var mouseColumn=textPosition.startColumn;var textSelection=this.textEditor.selection().normalize();if(textSelection&&!textSelection.isEmpty()){if(textSelection.startLine!==textSelection.endLine||textSelection.startLine!==mouseLine||mouseColumn<textSelection.startColumn||mouseColumn>textSelection.endColumn)
return null;var leftCorner=this.textEditor.cursorPositionToCoordinates(textSelection.startLine,textSelection.startColumn);var rightCorner=this.textEditor.cursorPositionToCoordinates(textSelection.endLine,textSelection.endColumn);var anchorBox=new AnchorBox(leftCorner.x,leftCorner.y,rightCorner.x-leftCorner.x,leftCorner.height);anchorBox.highlight={lineNumber:textSelection.startLine,startColumn:textSelection.startColumn,endColumn:textSelection.endColumn-1};anchorBox.forSelection=true;return anchorBox;}
var token=this.textEditor.tokenAtTextPosition(textPosition.startLine,textPosition.startColumn);if(!token)
return null;var lineNumber=textPosition.startLine;var line=this.textEditor.line(lineNumber);var tokenContent=line.substring(token.startColumn,token.endColumn+1);var isIdentifier=token.type.startsWith("js-variable")||token.type.startsWith("js-property")||token.type=="js-def";if(!isIdentifier&&(token.type!=="js-keyword"||tokenContent!=="this"))
return null;var leftCorner=this.textEditor.cursorPositionToCoordinates(lineNumber,token.startColumn);var rightCorner=this.textEditor.cursorPositionToCoordinates(lineNumber,token.endColumn+1);var anchorBox=new AnchorBox(leftCorner.x,leftCorner.y,rightCorner.x-leftCorner.x,leftCorner.height);anchorBox.highlight={lineNumber:lineNumber,startColumn:token.startColumn,endColumn:token.endColumn};return anchorBox;},_resolveObjectForPopover:function(anchorBox,showCallback,objectGroupName)
{if(!WebInspector.debuggerModel.isPaused()){this._popoverHelper.hidePopover();return;}
var lineNumber=anchorBox.highlight.lineNumber;var startHighlight=anchorBox.highlight.startColumn;var endHighlight=anchorBox.highlight.endColumn;var line=this.textEditor.line(lineNumber);if(!anchorBox.forSelection){while(startHighlight>1&&line.charAt(startHighlight-1)==='.'){var token=this.textEditor.tokenAtTextPosition(lineNumber,startHighlight-2);if(!token){this._popoverHelper.hidePopover();return;}
startHighlight=token.startColumn;}}
var evaluationText=line.substring(startHighlight,endHighlight+1);var selectedCallFrame=WebInspector.debuggerModel.selectedCallFrame();selectedCallFrame.evaluate(evaluationText,objectGroupName,false,true,false,false,showObjectPopover.bind(this));function showObjectPopover(result,wasThrown)
{if(!WebInspector.debuggerModel.isPaused()||!result){this._popoverHelper.hidePopover();return;}
this._popoverAnchorBox=anchorBox;showCallback(selectedCallFrame.target().runtimeModel.createRemoteObject(result),wasThrown,this._popoverAnchorBox);if(this._popoverAnchorBox){var highlightRange=new WebInspector.TextRange(lineNumber,startHighlight,lineNumber,endHighlight);this._popoverAnchorBox._highlightDescriptor=this.textEditor.highlightRange(highlightRange,"source-frame-eval-expression");}}},_onHidePopover:function()
{if(!this._popoverAnchorBox)
return;if(this._popoverAnchorBox._highlightDescriptor)
this.textEditor.removeHighlight(this._popoverAnchorBox._highlightDescriptor);delete this._popoverAnchorBox;},_addBreakpointDecoration:function(lineNumber,columnNumber,condition,enabled,mutedWhileEditing)
{var breakpoint={condition:condition,enabled:enabled,columnNumber:columnNumber};this.textEditor.setAttribute(lineNumber,"breakpoint",breakpoint);var disabled=!enabled||mutedWhileEditing;this.textEditor.addBreakpoint(lineNumber,disabled,!!condition);},_removeBreakpointDecoration:function(lineNumber)
{this.textEditor.removeAttribute(lineNumber,"breakpoint");this.textEditor.removeBreakpoint(lineNumber);},_onKeyDown:function(event)
{if(event.keyIdentifier==="U+001B"){if(this._popoverHelper.isPopoverVisible()){this._popoverHelper.hidePopover();event.consume();}}},_editBreakpointCondition:function(lineNumber,breakpoint)
{this._conditionElement=this._createConditionElement(lineNumber);this.textEditor.addDecoration(lineNumber,this._conditionElement);function finishEditing(committed,element,newText)
{this.textEditor.removeDecoration(lineNumber,this._conditionElement);delete this._conditionEditorElement;delete this._conditionElement;if(!committed)
return;if(breakpoint)
breakpoint.setCondition(newText);else
this._setBreakpoint(lineNumber,0,newText,true);}
var config=new WebInspector.InplaceEditor.Config(finishEditing.bind(this,true),finishEditing.bind(this,false));WebInspector.InplaceEditor.startEditing(this._conditionEditorElement,config);this._conditionEditorElement.value=breakpoint?breakpoint.condition():"";this._conditionEditorElement.select();},_createConditionElement:function(lineNumber)
{var conditionElement=document.createElement("div");conditionElement.className="source-frame-breakpoint-condition";var labelElement=document.createElement("label");labelElement.className="source-frame-breakpoint-message";labelElement.htmlFor="source-frame-breakpoint-condition";labelElement.appendChild(document.createTextNode(WebInspector.UIString("The breakpoint on line %d will stop only if this expression is true:",lineNumber+1)));conditionElement.appendChild(labelElement);var editorElement=document.createElement("input");editorElement.id="source-frame-breakpoint-condition";editorElement.className="monospace";editorElement.type="text";conditionElement.appendChild(editorElement);this._conditionEditorElement=editorElement;return conditionElement;},setExecutionLine:function(lineNumber)
{this._executionLineNumber=lineNumber;if(this.loaded)
this.textEditor.setExecutionLine(lineNumber);},clearExecutionLine:function()
{if(this.loaded&&typeof this._executionLineNumber==="number")
this.textEditor.clearExecutionLine();delete this._executionLineNumber;},_shouldIgnoreExternalBreakpointEvents:function()
{if(this._supportsEnabledBreakpointsWhileEditing())
return false;if(this._muted)
return true;var scriptFiles=this._scriptFileForTarget.values();var hasDivergingOrMergingFile=false;for(var i=0;i<scriptFiles.length;++i)
if(scriptFiles[i].isDivergingFromVM()||scriptFiles[i].isMergingToVM())
return true;return false;},_breakpointAdded:function(event)
{var uiLocation=(event.data.uiLocation);if(uiLocation.uiSourceCode!==this._uiSourceCode)
return;if(this._shouldIgnoreExternalBreakpointEvents())
return;var breakpoint=(event.data.breakpoint);if(this.loaded)
this._addBreakpointDecoration(uiLocation.lineNumber,uiLocation.columnNumber,breakpoint.condition(),breakpoint.enabled(),false);},_breakpointRemoved:function(event)
{var uiLocation=(event.data.uiLocation);if(uiLocation.uiSourceCode!==this._uiSourceCode)
return;if(this._shouldIgnoreExternalBreakpointEvents())
return;var breakpoint=(event.data.breakpoint);var remainingBreakpoint=this._breakpointManager.findBreakpointOnLine(this._uiSourceCode,uiLocation.lineNumber);if(!remainingBreakpoint&&this.loaded)
this._removeBreakpointDecoration(uiLocation.lineNumber);},_consoleMessageAdded:function(event)
{var message=(event.data);if(this.loaded)
this.addMessageToSource(message.lineNumber,message.originalMessage);},_consoleMessageRemoved:function(event)
{var message=(event.data);if(this.loaded)
this.removeMessageFromSource(message.lineNumber,message.originalMessage);},_consoleMessagesCleared:function(event)
{this.clearMessages();},_onSourceMappingChanged:function(event)
{var data=(event.data);this._updateScriptFile(data.target);},_updateScriptFile:function(target)
{var oldScriptFile=this._scriptFileForTarget.get(target);var newScriptFile=this._uiSourceCode.scriptFileForTarget(target);this._scriptFileForTarget.remove(target);if(oldScriptFile){oldScriptFile.removeEventListener(WebInspector.ScriptFile.Events.DidMergeToVM,this._didMergeToVM,this);oldScriptFile.removeEventListener(WebInspector.ScriptFile.Events.DidDivergeFromVM,this._didDivergeFromVM,this);if(this._muted&&!this._uiSourceCode.isDirty())
this._restoreBreakpointsIfConsistentScripts();}
if(newScriptFile)
this._scriptFileForTarget.put(target,newScriptFile);delete this._hasCommittedLiveEdit;this._updateDivergedInfobar();if(newScriptFile){newScriptFile.addEventListener(WebInspector.ScriptFile.Events.DidMergeToVM,this._didMergeToVM,this);newScriptFile.addEventListener(WebInspector.ScriptFile.Events.DidDivergeFromVM,this._didDivergeFromVM,this);if(this.loaded)
newScriptFile.checkMapping();}},onTextEditorContentLoaded:function()
{if(typeof this._executionLineNumber==="number")
this.setExecutionLine(this._executionLineNumber);var breakpointLocations=this._breakpointManager.breakpointLocationsForUISourceCode(this._uiSourceCode);for(var i=0;i<breakpointLocations.length;++i)
this._breakpointAdded({data:breakpointLocations[i]});var messages=this._uiSourceCode.consoleMessages();for(var i=0;i<messages.length;++i){var message=messages[i];this.addMessageToSource(message.lineNumber,message.originalMessage);}
var scriptFiles=this._scriptFileForTarget.values();for(var i=0;i<scriptFiles.length;++i)
scriptFiles[i].checkMapping();},_handleGutterClick:function(event)
{if(this._muted)
return;var eventData=(event.data);var lineNumber=eventData.lineNumber;var eventObject=(eventData.event);if(eventObject.button!=0||eventObject.altKey||eventObject.ctrlKey||eventObject.metaKey)
return;this._toggleBreakpoint(lineNumber,eventObject.shiftKey);eventObject.consume(true);},_toggleBreakpoint:function(lineNumber,onlyDisable)
{var breakpoint=this._breakpointManager.findBreakpointOnLine(this._uiSourceCode,lineNumber);if(breakpoint){if(onlyDisable)
breakpoint.setEnabled(!breakpoint.enabled());else
breakpoint.remove();}else
this._setBreakpoint(lineNumber,0,"",true);},toggleBreakpointOnCurrentLine:function()
{if(this._muted)
return;var selection=this.textEditor.selection();if(!selection)
return;this._toggleBreakpoint(selection.startLine,false);},_setBreakpoint:function(lineNumber,columnNumber,condition,enabled)
{this._breakpointManager.setBreakpoint(this._uiSourceCode,lineNumber,columnNumber,condition,enabled);WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction,{action:WebInspector.UserMetrics.UserActionNames.SetBreakpoint,url:this._uiSourceCode.originURL(),line:lineNumber,enabled:enabled});},_continueToLine:function(lineNumber)
{var executionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);if(!executionContext)
return;var rawLocation=(this._uiSourceCode.uiLocationToRawLocation(executionContext.target(),lineNumber,0));rawLocation.continueToLocation();},dispose:function()
{this._breakpointManager.removeEventListener(WebInspector.BreakpointManager.Events.BreakpointAdded,this._breakpointAdded,this);this._breakpointManager.removeEventListener(WebInspector.BreakpointManager.Events.BreakpointRemoved,this._breakpointRemoved,this);this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.ConsoleMessageAdded,this._consoleMessageAdded,this);this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.ConsoleMessageRemoved,this._consoleMessageRemoved,this);this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.ConsoleMessagesCleared,this._consoleMessagesCleared,this);this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.SourceMappingChanged,this._onSourceMappingChanged,this);this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);WebInspector.UISourceCodeFrame.prototype.dispose.call(this);},__proto__:WebInspector.UISourceCodeFrame.prototype};WebInspector.CSSSourceFrame=function(uiSourceCode)
{WebInspector.UISourceCodeFrame.call(this,uiSourceCode);this._registerShortcuts();}
WebInspector.CSSSourceFrame.prototype={_registerShortcuts:function()
{var shortcutKeys=WebInspector.ShortcutsScreen.SourcesPanelShortcuts;for(var i=0;i<shortcutKeys.IncreaseCSSUnitByOne.length;++i)
this.addShortcut(shortcutKeys.IncreaseCSSUnitByOne[i].key,this._handleUnitModification.bind(this,1));for(var i=0;i<shortcutKeys.DecreaseCSSUnitByOne.length;++i)
this.addShortcut(shortcutKeys.DecreaseCSSUnitByOne[i].key,this._handleUnitModification.bind(this,-1));for(var i=0;i<shortcutKeys.IncreaseCSSUnitByTen.length;++i)
this.addShortcut(shortcutKeys.IncreaseCSSUnitByTen[i].key,this._handleUnitModification.bind(this,10));for(var i=0;i<shortcutKeys.DecreaseCSSUnitByTen.length;++i)
this.addShortcut(shortcutKeys.DecreaseCSSUnitByTen[i].key,this._handleUnitModification.bind(this,-10));},_modifyUnit:function(unit,change)
{var unitValue=parseInt(unit,10);if(isNaN(unitValue))
return null;var tail=unit.substring((unitValue).toString().length);return String.sprintf("%d%s",unitValue+change,tail);},_handleUnitModification:function(change)
{var selection=this.textEditor.selection().normalize();var token=this.textEditor.tokenAtTextPosition(selection.startLine,selection.startColumn);if(!token){if(selection.startColumn>0)
token=this.textEditor.tokenAtTextPosition(selection.startLine,selection.startColumn-1);if(!token)
return false;}
if(token.type!=="css-number")
return false;var cssUnitRange=new WebInspector.TextRange(selection.startLine,token.startColumn,selection.startLine,token.endColumn+1);var cssUnitText=this.textEditor.copyRange(cssUnitRange);var newUnitText=this._modifyUnit(cssUnitText,change);if(!newUnitText)
return false;this.textEditor.editRange(cssUnitRange,newUnitText);selection.startColumn=token.startColumn;selection.endColumn=selection.startColumn+newUnitText.length;this.textEditor.setSelection(selection);return true;},__proto__:WebInspector.UISourceCodeFrame.prototype};WebInspector.NavigatorView=function()
{WebInspector.VBox.call(this);this.registerRequiredCSS("navigatorView.css");var scriptsTreeElement=document.createElement("ol");this._scriptsTree=new WebInspector.NavigatorTreeOutline(scriptsTreeElement);var scriptsOutlineElement=document.createElement("div");scriptsOutlineElement.classList.add("outline-disclosure");scriptsOutlineElement.classList.add("navigator");scriptsOutlineElement.appendChild(scriptsTreeElement);this.element.classList.add("navigator-container");this.element.appendChild(scriptsOutlineElement);this.setDefaultFocusedElement(this._scriptsTree.element);this._uiSourceCodeNodes=new Map();this._subfolderNodes=new Map();this._rootNode=new WebInspector.NavigatorRootTreeNode(this);this._rootNode.populate();this.element.addEventListener("contextmenu",this.handleContextMenu.bind(this),false);}
WebInspector.NavigatorView.Events={ItemSelected:"ItemSelected",ItemRenamed:"ItemRenamed",}
WebInspector.NavigatorView.iconClassForType=function(type)
{if(type===WebInspector.NavigatorTreeOutline.Types.Domain)
return"navigator-domain-tree-item";if(type===WebInspector.NavigatorTreeOutline.Types.FileSystem)
return"navigator-folder-tree-item";return"navigator-folder-tree-item";}
WebInspector.NavigatorView.prototype={setWorkspace:function(workspace)
{this._workspace=workspace;this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset,this._projectWillReset.bind(this),this);},wasShown:function()
{if(this._loaded)
return;this._loaded=true;this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));},accept:function(uiSourceCode)
{return!uiSourceCode.project().isServiceProject();},_addUISourceCode:function(uiSourceCode)
{if(!this.accept(uiSourceCode))
return;var projectNode=this._projectNode(uiSourceCode.project());var folderNode=this._folderNode(projectNode,uiSourceCode.parentPath());var uiSourceCodeNode=new WebInspector.NavigatorUISourceCodeTreeNode(this,uiSourceCode);this._uiSourceCodeNodes.put(uiSourceCode,uiSourceCodeNode);folderNode.appendChild(uiSourceCodeNode);},_uiSourceCodeAdded:function(event)
{var uiSourceCode=(event.data);this._addUISourceCode(uiSourceCode);},_uiSourceCodeRemoved:function(event)
{var uiSourceCode=(event.data);this._removeUISourceCode(uiSourceCode);},_projectWillReset:function(event)
{var project=(event.data);var uiSourceCodes=project.uiSourceCodes();for(var i=0;i<uiSourceCodes.length;++i)
this._removeUISourceCode(uiSourceCodes[i]);},_projectNode:function(project)
{if(!project.displayName())
return this._rootNode;var projectNode=this._rootNode.child(project.id());if(!projectNode){var type=project.type()===WebInspector.projectTypes.FileSystem?WebInspector.NavigatorTreeOutline.Types.FileSystem:WebInspector.NavigatorTreeOutline.Types.Domain;projectNode=new WebInspector.NavigatorFolderTreeNode(this,project,project.id(),type,"",project.displayName());this._rootNode.appendChild(projectNode);}
return projectNode;},_folderNode:function(projectNode,folderPath)
{if(!folderPath)
return projectNode;var subfolderNodes=this._subfolderNodes.get(projectNode);if(!subfolderNodes){subfolderNodes=(new StringMap());this._subfolderNodes.put(projectNode,subfolderNodes);}
var folderNode=subfolderNodes.get(folderPath);if(folderNode)
return folderNode;var parentNode=projectNode;var index=folderPath.lastIndexOf("/");if(index!==-1)
parentNode=this._folderNode(projectNode,folderPath.substring(0,index));var name=folderPath.substring(index+1);folderNode=new WebInspector.NavigatorFolderTreeNode(this,null,name,WebInspector.NavigatorTreeOutline.Types.Folder,folderPath,name);subfolderNodes.put(folderPath,folderNode);parentNode.appendChild(folderNode);return folderNode;},revealUISourceCode:function(uiSourceCode,select)
{var node=this._uiSourceCodeNodes.get(uiSourceCode);if(!node)
return;if(this._scriptsTree.selectedTreeElement)
this._scriptsTree.selectedTreeElement.deselect();this._lastSelectedUISourceCode=uiSourceCode;node.reveal(select);},_sourceSelected:function(uiSourceCode,focusSource)
{this._lastSelectedUISourceCode=uiSourceCode;var data={uiSourceCode:uiSourceCode,focusSource:focusSource};this.dispatchEventToListeners(WebInspector.NavigatorView.Events.ItemSelected,data);},sourceDeleted:function(uiSourceCode)
{},_removeUISourceCode:function(uiSourceCode)
{var node=this._uiSourceCodeNodes.get(uiSourceCode);if(!node)
return;var projectNode=this._projectNode(uiSourceCode.project());var subfolderNodes=this._subfolderNodes.get(projectNode);var parentNode=node.parent;this._uiSourceCodeNodes.remove(uiSourceCode);parentNode.removeChild(node);node=parentNode;while(node){parentNode=node.parent;if(!parentNode||!node.isEmpty())
break;if(subfolderNodes)
subfolderNodes.remove(node._folderPath);parentNode.removeChild(node);node=parentNode;}},_updateIcon:function(uiSourceCode)
{var node=this._uiSourceCodeNodes.get(uiSourceCode);node.updateIcon();},reset:function()
{var nodes=this._uiSourceCodeNodes.values();for(var i=0;i<nodes.length;++i)
nodes[i].dispose();this._scriptsTree.removeChildren();this._uiSourceCodeNodes.clear();this._subfolderNodes.clear();this._rootNode.reset();},handleContextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);this._appendAddFolderItem(contextMenu);contextMenu.show();},_appendAddFolderItem:function(contextMenu)
{function addFolder()
{WebInspector.isolatedFileSystemManager.addFileSystem();}
var addFolderLabel=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add folder to workspace":"Add Folder to Workspace");contextMenu.appendItem(addFolderLabel,addFolder);},_handleContextMenuRefresh:function(project,path)
{project.refresh(path);},_handleContextMenuCreate:function(project,path,uiSourceCode)
{this.create(project,path,uiSourceCode);},_handleContextMenuExclude:function(project,path)
{var shouldExclude=window.confirm(WebInspector.UIString("Are you sure you want to exclude this folder?"));if(shouldExclude){WebInspector.startBatchUpdate();project.excludeFolder(path);WebInspector.endBatchUpdate();}},_handleContextMenuDelete:function(uiSourceCode)
{var shouldDelete=window.confirm(WebInspector.UIString("Are you sure you want to delete this file?"));if(shouldDelete)
uiSourceCode.project().deleteFile(uiSourceCode.path());},handleFileContextMenu:function(event,uiSourceCode)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendApplicableItems(uiSourceCode);contextMenu.appendSeparator();var project=uiSourceCode.project();var path=uiSourceCode.parentPath();contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Refresh parent":"Refresh Parent"),this._handleContextMenuRefresh.bind(this,project,path));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Duplicate file":"Duplicate File"),this._handleContextMenuCreate.bind(this,project,path,uiSourceCode));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Exclude parent folder":"Exclude Parent Folder"),this._handleContextMenuExclude.bind(this,project,path));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Delete file":"Delete File"),this._handleContextMenuDelete.bind(this,uiSourceCode));contextMenu.appendSeparator();this._appendAddFolderItem(contextMenu);contextMenu.show();},handleFolderContextMenu:function(event,node)
{var contextMenu=new WebInspector.ContextMenu(event);var path="/";var projectNode=node;while(projectNode.parent!==this._rootNode){path="/"+projectNode.id+path;projectNode=projectNode.parent;}
var project=projectNode._project;if(project.type()===WebInspector.projectTypes.FileSystem){contextMenu.appendItem(WebInspector.UIString("Refresh"),this._handleContextMenuRefresh.bind(this,project,path));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"New file":"New File"),this._handleContextMenuCreate.bind(this,project,path));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Exclude folder":"Exclude Folder"),this._handleContextMenuExclude.bind(this,project,path));}
contextMenu.appendSeparator();this._appendAddFolderItem(contextMenu);function removeFolder()
{var shouldRemove=window.confirm(WebInspector.UIString("Are you sure you want to remove this folder?"));if(shouldRemove)
project.remove();}
if(project.type()===WebInspector.projectTypes.FileSystem&&node===projectNode){var removeFolderLabel=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Remove folder from workspace":"Remove Folder from Workspace");contextMenu.appendItem(removeFolderLabel,removeFolder);}
contextMenu.show();},rename:function(uiSourceCode,deleteIfCanceled)
{var node=this._uiSourceCodeNodes.get(uiSourceCode);console.assert(node);node.rename(callback.bind(this));function callback(committed)
{if(!committed){if(deleteIfCanceled)
uiSourceCode.remove();return;}
this.dispatchEventToListeners(WebInspector.NavigatorView.Events.ItemRenamed,uiSourceCode);this._updateIcon(uiSourceCode);this._sourceSelected(uiSourceCode,true)}},create:function(project,path,uiSourceCodeToCopy)
{var filePath;var uiSourceCode;function contentLoaded(content)
{createFile.call(this,content||"");}
if(uiSourceCodeToCopy)
uiSourceCodeToCopy.requestContent(contentLoaded.bind(this));else
createFile.call(this);function createFile(content)
{project.createFile(path,null,content||"",fileCreated.bind(this));}
function fileCreated(path)
{if(!path)
return;filePath=path;uiSourceCode=project.uiSourceCode(filePath);if(!uiSourceCode){console.assert(uiSourceCode)
return;}
this._sourceSelected(uiSourceCode,false);this.revealUISourceCode(uiSourceCode,true);this.rename(uiSourceCode,true);}},__proto__:WebInspector.VBox.prototype}
WebInspector.SourcesNavigatorView=function()
{WebInspector.NavigatorView.call(this);WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.InspectedURLChanged,this._inspectedURLChanged,this);}
WebInspector.SourcesNavigatorView.prototype={accept:function(uiSourceCode)
{if(!WebInspector.NavigatorView.prototype.accept(uiSourceCode))
return false;return uiSourceCode.project().type()!==WebInspector.projectTypes.ContentScripts&&uiSourceCode.project().type()!==WebInspector.projectTypes.Snippets;},_inspectedURLChanged:function(event)
{var nodes=this._uiSourceCodeNodes.values();for(var i=0;i<nodes.length;++i){var uiSourceCode=nodes[i].uiSourceCode();if(uiSourceCode.url===WebInspector.resourceTreeModel.inspectedPageURL())
this.revealUISourceCode(uiSourceCode,true);}},_addUISourceCode:function(uiSourceCode)
{WebInspector.NavigatorView.prototype._addUISourceCode.call(this,uiSourceCode);if(uiSourceCode.url===WebInspector.resourceTreeModel.inspectedPageURL())
this.revealUISourceCode(uiSourceCode,true);},__proto__:WebInspector.NavigatorView.prototype}
WebInspector.ContentScriptsNavigatorView=function()
{WebInspector.NavigatorView.call(this);}
WebInspector.ContentScriptsNavigatorView.prototype={accept:function(uiSourceCode)
{if(!WebInspector.NavigatorView.prototype.accept(uiSourceCode))
return false;return uiSourceCode.project().type()===WebInspector.projectTypes.ContentScripts;},__proto__:WebInspector.NavigatorView.prototype}
WebInspector.NavigatorTreeOutline=function(element)
{TreeOutline.call(this,element);this.element=element;this.comparator=WebInspector.NavigatorTreeOutline._treeElementsCompare;}
WebInspector.NavigatorTreeOutline.Types={Root:"Root",Domain:"Domain",Folder:"Folder",UISourceCode:"UISourceCode",FileSystem:"FileSystem"}
WebInspector.NavigatorTreeOutline._treeElementsCompare=function compare(treeElement1,treeElement2)
{function typeWeight(treeElement)
{var type=treeElement.type();if(type===WebInspector.NavigatorTreeOutline.Types.Domain){if(treeElement.titleText===WebInspector.resourceTreeModel.inspectedPageDomain())
return 1;return 2;}
if(type===WebInspector.NavigatorTreeOutline.Types.FileSystem)
return 3;if(type===WebInspector.NavigatorTreeOutline.Types.Folder)
return 4;return 5;}
var typeWeight1=typeWeight(treeElement1);var typeWeight2=typeWeight(treeElement2);var result;if(typeWeight1>typeWeight2)
result=1;else if(typeWeight1<typeWeight2)
result=-1;else{var title1=treeElement1.titleText;var title2=treeElement2.titleText;result=title1.compareTo(title2);}
return result;}
WebInspector.NavigatorTreeOutline.prototype={scriptTreeElements:function()
{var result=[];if(this.children.length){for(var treeElement=this.children[0];treeElement;treeElement=treeElement.traverseNextTreeElement(false,this,true)){if(treeElement instanceof WebInspector.NavigatorSourceTreeElement)
result.push(treeElement.uiSourceCode);}}
return result;},__proto__:TreeOutline.prototype}
WebInspector.BaseNavigatorTreeElement=function(type,title,iconClasses,hasChildren,noIcon)
{this._type=type;TreeElement.call(this,"",null,hasChildren);this._titleText=title;this._iconClasses=iconClasses;this._noIcon=noIcon;}
WebInspector.BaseNavigatorTreeElement.prototype={onattach:function()
{this.listItemElement.removeChildren();if(this._iconClasses){for(var i=0;i<this._iconClasses.length;++i)
this.listItemElement.classList.add(this._iconClasses[i]);}
var selectionElement=document.createElement("div");selectionElement.className="selection";this.listItemElement.appendChild(selectionElement);if(!this._noIcon){this.imageElement=document.createElement("img");this.imageElement.className="icon";this.listItemElement.appendChild(this.imageElement);}
this.titleElement=document.createElement("div");this.titleElement.className="base-navigator-tree-element-title";this._titleTextNode=document.createTextNode("");this._titleTextNode.textContent=this._titleText;this.titleElement.appendChild(this._titleTextNode);this.listItemElement.appendChild(this.titleElement);},updateIconClasses:function(iconClasses)
{for(var i=0;i<this._iconClasses.length;++i)
this.listItemElement.classList.remove(this._iconClasses[i]);this._iconClasses=iconClasses;for(var i=0;i<this._iconClasses.length;++i)
this.listItemElement.classList.add(this._iconClasses[i]);},onreveal:function()
{if(this.listItemElement)
this.listItemElement.scrollIntoViewIfNeeded(true);},get titleText()
{return this._titleText;},set titleText(titleText)
{if(this._titleText===titleText)
return;this._titleText=titleText||"";if(this.titleElement)
this.titleElement.textContent=this._titleText;},type:function()
{return this._type;},__proto__:TreeElement.prototype}
WebInspector.NavigatorFolderTreeElement=function(navigatorView,type,title)
{var iconClass=WebInspector.NavigatorView.iconClassForType(type);WebInspector.BaseNavigatorTreeElement.call(this,type,title,[iconClass],true);this._navigatorView=navigatorView;}
WebInspector.NavigatorFolderTreeElement.prototype={onpopulate:function()
{this._node.populate();},onattach:function()
{WebInspector.BaseNavigatorTreeElement.prototype.onattach.call(this);this.collapse();this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),false);},setNode:function(node)
{this._node=node;var paths=[];while(node&&!node.isRoot()){paths.push(node._title);node=node.parent;}
paths.reverse();this.tooltip=paths.join("/");},_handleContextMenuEvent:function(event)
{if(!this._node)
return;this.select();this._navigatorView.handleFolderContextMenu((event),this._node);},__proto__:WebInspector.BaseNavigatorTreeElement.prototype}
WebInspector.NavigatorSourceTreeElement=function(navigatorView,uiSourceCode,title)
{this._navigatorView=navigatorView;this._uiSourceCode=uiSourceCode;WebInspector.BaseNavigatorTreeElement.call(this,WebInspector.NavigatorTreeOutline.Types.UISourceCode,title,this._calculateIconClasses(),false);this.tooltip=uiSourceCode.originURL();}
WebInspector.NavigatorSourceTreeElement.prototype={get uiSourceCode()
{return this._uiSourceCode;},_calculateIconClasses:function()
{return["navigator-"+this._uiSourceCode.contentType().name()+"-tree-item"];},updateIcon:function()
{this.updateIconClasses(this._calculateIconClasses());},onattach:function()
{WebInspector.BaseNavigatorTreeElement.prototype.onattach.call(this);this.listItemElement.draggable=true;this.listItemElement.addEventListener("click",this._onclick.bind(this),false);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),false);this.listItemElement.addEventListener("mousedown",this._onmousedown.bind(this),false);this.listItemElement.addEventListener("dragstart",this._ondragstart.bind(this),false);},_onmousedown:function(event)
{if(event.which===1)
this._uiSourceCode.requestContent(callback.bind(this));function callback(content)
{this._warmedUpContent=content;}},_shouldRenameOnMouseDown:function()
{if(!this._uiSourceCode.canRename())
return false;var isSelected=this===this.treeOutline.selectedTreeElement;var isFocused=this.treeOutline.childrenListElement.isSelfOrAncestor(document.activeElement);return isSelected&&isFocused&&!WebInspector.isBeingEdited(this.treeOutline.element);},selectOnMouseDown:function(event)
{if(event.which!==1||!this._shouldRenameOnMouseDown()){TreeElement.prototype.selectOnMouseDown.call(this,event);return;}
setTimeout(rename.bind(this),300);function rename()
{if(this._shouldRenameOnMouseDown())
this._navigatorView.rename(this.uiSourceCode,false);}},_ondragstart:function(event)
{event.dataTransfer.setData("text/plain",this._warmedUpContent);event.dataTransfer.effectAllowed="copy";return true;},onspace:function()
{this._navigatorView._sourceSelected(this.uiSourceCode,true);return true;},_onclick:function(event)
{this._navigatorView._sourceSelected(this.uiSourceCode,false);},ondblclick:function(event)
{var middleClick=event.button===1;this._navigatorView._sourceSelected(this.uiSourceCode,!middleClick);return false;},onenter:function()
{this._navigatorView._sourceSelected(this.uiSourceCode,true);return true;},ondelete:function()
{this._navigatorView.sourceDeleted(this.uiSourceCode);return true;},_handleContextMenuEvent:function(event)
{this.select();this._navigatorView.handleFileContextMenu(event,this._uiSourceCode);},__proto__:WebInspector.BaseNavigatorTreeElement.prototype}
WebInspector.NavigatorTreeNode=function(id)
{this.id=id;this._children=new StringMap();}
WebInspector.NavigatorTreeNode.prototype={treeElement:function(){throw"Not implemented";},dispose:function(){},isRoot:function()
{return false;},hasChildren:function()
{return true;},populate:function()
{if(this.isPopulated())
return;if(this.parent)
this.parent.populate();this._populated=true;this.wasPopulated();},wasPopulated:function()
{var children=this.children();for(var i=0;i<children.length;++i)
this.treeElement().appendChild(children[i].treeElement());},didAddChild:function(node)
{if(this.isPopulated())
this.treeElement().appendChild(node.treeElement());},willRemoveChild:function(node)
{if(this.isPopulated())
this.treeElement().removeChild(node.treeElement());},isPopulated:function()
{return this._populated;},isEmpty:function()
{return!this._children.size();},child:function(id)
{return this._children.get(id)||null;},children:function()
{return this._children.values();},appendChild:function(node)
{this._children.put(node.id,node);node.parent=this;this.didAddChild(node);},removeChild:function(node)
{this.willRemoveChild(node);this._children.remove(node.id);delete node.parent;node.dispose();},reset:function()
{this._children.clear();}}
WebInspector.NavigatorRootTreeNode=function(navigatorView)
{WebInspector.NavigatorTreeNode.call(this,"");this._navigatorView=navigatorView;}
WebInspector.NavigatorRootTreeNode.prototype={isRoot:function()
{return true;},treeElement:function()
{return this._navigatorView._scriptsTree;},__proto__:WebInspector.NavigatorTreeNode.prototype}
WebInspector.NavigatorUISourceCodeTreeNode=function(navigatorView,uiSourceCode)
{WebInspector.NavigatorTreeNode.call(this,uiSourceCode.name());this._navigatorView=navigatorView;this._uiSourceCode=uiSourceCode;this._treeElement=null;}
WebInspector.NavigatorUISourceCodeTreeNode.prototype={uiSourceCode:function()
{return this._uiSourceCode;},updateIcon:function()
{if(this._treeElement)
this._treeElement.updateIcon();},treeElement:function()
{if(this._treeElement)
return this._treeElement;this._treeElement=new WebInspector.NavigatorSourceTreeElement(this._navigatorView,this._uiSourceCode,"");this.updateTitle();this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.TitleChanged,this._titleChanged,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);return this._treeElement;},updateTitle:function(ignoreIsDirty)
{if(!this._treeElement)
return;var titleText=this._uiSourceCode.displayName();if(!ignoreIsDirty&&(this._uiSourceCode.isDirty()||this._uiSourceCode.hasUnsavedCommittedChanges()))
titleText="*"+titleText;this._treeElement.titleText=titleText;},hasChildren:function()
{return false;},dispose:function()
{if(!this._treeElement)
return;this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.TitleChanged,this._titleChanged,this);this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);},_titleChanged:function(event)
{this.updateTitle();},_workingCopyChanged:function(event)
{this.updateTitle();},_workingCopyCommitted:function(event)
{this.updateTitle();},reveal:function(select)
{this.parent.populate();this.parent.treeElement().expand();this._treeElement.reveal();if(select)
this._treeElement.select(true);},rename:function(callback)
{if(!this._treeElement)
return;var treeOutlineElement=this._treeElement.treeOutline.element;WebInspector.markBeingEdited(treeOutlineElement,true);function commitHandler(element,newTitle,oldTitle)
{if(newTitle!==oldTitle){this._treeElement.titleText=newTitle;this._uiSourceCode.rename(newTitle,renameCallback.bind(this));return;}
afterEditing.call(this,true);}
function renameCallback(success)
{if(!success){WebInspector.markBeingEdited(treeOutlineElement,false);this.updateTitle();this.rename(callback);return;}
afterEditing.call(this,true);}
function cancelHandler()
{afterEditing.call(this,false);}
function afterEditing(committed)
{WebInspector.markBeingEdited(treeOutlineElement,false);this.updateTitle();this._treeElement.treeOutline.childrenListElement.focus();if(callback)
callback(committed);}
var editingConfig=new WebInspector.InplaceEditor.Config(commitHandler.bind(this),cancelHandler.bind(this));this.updateTitle(true);WebInspector.InplaceEditor.startEditing(this._treeElement.titleElement,editingConfig);window.getSelection().setBaseAndExtent(this._treeElement.titleElement,0,this._treeElement.titleElement,1);},__proto__:WebInspector.NavigatorTreeNode.prototype}
WebInspector.NavigatorFolderTreeNode=function(navigatorView,project,id,type,folderPath,title)
{WebInspector.NavigatorTreeNode.call(this,id);this._navigatorView=navigatorView;this._project=project;this._type=type;this._folderPath=folderPath;this._title=title;}
WebInspector.NavigatorFolderTreeNode.prototype={treeElement:function()
{if(this._treeElement)
return this._treeElement;this._treeElement=this._createTreeElement(this._title,this);return this._treeElement;},_createTreeElement:function(title,node)
{var treeElement=new WebInspector.NavigatorFolderTreeElement(this._navigatorView,this._type,title);treeElement.setNode(node);return treeElement;},wasPopulated:function()
{if(!this._treeElement||this._treeElement._node!==this)
return;this._addChildrenRecursive();},_addChildrenRecursive:function()
{var children=this.children();for(var i=0;i<children.length;++i){var child=children[i];this.didAddChild(child);if(child instanceof WebInspector.NavigatorFolderTreeNode)
child._addChildrenRecursive();}},_shouldMerge:function(node)
{return this._type!==WebInspector.NavigatorTreeOutline.Types.Domain&&node instanceof WebInspector.NavigatorFolderTreeNode;},didAddChild:function(node)
{function titleForNode(node)
{return node._title;}
if(!this._treeElement)
return;var children=this.children();if(children.length===1&&this._shouldMerge(node)){node._isMerged=true;this._treeElement.titleText=this._treeElement.titleText+"/"+node._title;node._treeElement=this._treeElement;this._treeElement.setNode(node);return;}
var oldNode;if(children.length===2)
oldNode=children[0]!==node?children[0]:children[1];if(oldNode&&oldNode._isMerged){delete oldNode._isMerged;var mergedToNodes=[];mergedToNodes.push(this);var treeNode=this;while(treeNode._isMerged){treeNode=treeNode.parent;mergedToNodes.push(treeNode);}
mergedToNodes.reverse();var titleText=mergedToNodes.map(titleForNode).join("/");var nodes=[];treeNode=oldNode;do{nodes.push(treeNode);children=treeNode.children();treeNode=children.length===1?children[0]:null;}while(treeNode&&treeNode._isMerged);if(!this.isPopulated()){this._treeElement.titleText=titleText;this._treeElement.setNode(this);for(var i=0;i<nodes.length;++i){delete nodes[i]._treeElement;delete nodes[i]._isMerged;}
return;}
var oldTreeElement=this._treeElement;var treeElement=this._createTreeElement(titleText,this);for(var i=0;i<mergedToNodes.length;++i)
mergedToNodes[i]._treeElement=treeElement;oldTreeElement.parent.appendChild(treeElement);oldTreeElement.setNode(nodes[nodes.length-1]);oldTreeElement.titleText=nodes.map(titleForNode).join("/");oldTreeElement.parent.removeChild(oldTreeElement);this._treeElement.appendChild(oldTreeElement);if(oldTreeElement.expanded)
treeElement.expand();}
if(this.isPopulated())
this._treeElement.appendChild(node.treeElement());},willRemoveChild:function(node)
{if(node._isMerged||!this.isPopulated())
return;this._treeElement.removeChild(node._treeElement);},__proto__:WebInspector.NavigatorTreeNode.prototype};WebInspector.RevisionHistoryView=function()
{WebInspector.VBox.call(this);this.registerRequiredCSS("revisionHistory.css");this.element.classList.add("revision-history-drawer");this.element.classList.add("outline-disclosure");this._uiSourceCodeItems=new Map();var olElement=this.element.createChild("ol");this._treeOutline=new TreeOutline(olElement);function populateRevisions(uiSourceCode)
{if(uiSourceCode.history.length)
this._createUISourceCodeItem(uiSourceCode);}
WebInspector.workspace.uiSourceCodes().forEach(populateRevisions.bind(this));WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeContentCommitted,this._revisionAdded,this);WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset,this._projectWillReset,this);}
WebInspector.RevisionHistoryView.showHistory=function(uiSourceCode)
{if(!WebInspector.RevisionHistoryView._view)
WebInspector.RevisionHistoryView._view=new WebInspector.RevisionHistoryView();var view=WebInspector.RevisionHistoryView._view;WebInspector.inspectorView.showCloseableViewInDrawer("history",WebInspector.UIString("History"),view);view._revealUISourceCode(uiSourceCode);}
WebInspector.RevisionHistoryView.prototype={_createUISourceCodeItem:function(uiSourceCode)
{var uiSourceCodeItem=new TreeElement(uiSourceCode.displayName(),null,true);uiSourceCodeItem.selectable=false;for(var i=0;i<this._treeOutline.children.length;++i){if(this._treeOutline.children[i].title.localeCompare(uiSourceCode.displayName())>0){this._treeOutline.insertChild(uiSourceCodeItem,i);break;}}
if(i===this._treeOutline.children.length)
this._treeOutline.appendChild(uiSourceCodeItem);this._uiSourceCodeItems.put(uiSourceCode,uiSourceCodeItem);var revisionCount=uiSourceCode.history.length;for(var i=revisionCount-1;i>=0;--i){var revision=uiSourceCode.history[i];var historyItem=new WebInspector.RevisionHistoryTreeElement(revision,uiSourceCode.history[i-1],i!==revisionCount-1);uiSourceCodeItem.appendChild(historyItem);}
var linkItem=new TreeElement("",null,false);linkItem.selectable=false;uiSourceCodeItem.appendChild(linkItem);var revertToOriginal=linkItem.listItemElement.createChild("span","revision-history-link revision-history-link-row");revertToOriginal.textContent=WebInspector.UIString("apply original content");revertToOriginal.addEventListener("click",uiSourceCode.revertToOriginal.bind(uiSourceCode));var clearHistoryElement=uiSourceCodeItem.listItemElement.createChild("span","revision-history-link");clearHistoryElement.textContent=WebInspector.UIString("revert");clearHistoryElement.addEventListener("click",this._clearHistory.bind(this,uiSourceCode));return uiSourceCodeItem;},_clearHistory:function(uiSourceCode)
{uiSourceCode.revertAndClearHistory(this._removeUISourceCode.bind(this));},_revisionAdded:function(event)
{var uiSourceCode=(event.data.uiSourceCode);var uiSourceCodeItem=this._uiSourceCodeItems.get(uiSourceCode);if(!uiSourceCodeItem){uiSourceCodeItem=this._createUISourceCodeItem(uiSourceCode);return;}
var historyLength=uiSourceCode.history.length;var historyItem=new WebInspector.RevisionHistoryTreeElement(uiSourceCode.history[historyLength-1],uiSourceCode.history[historyLength-2],false);if(uiSourceCodeItem.children.length)
uiSourceCodeItem.children[0].allowRevert();uiSourceCodeItem.insertChild(historyItem,0);},_revealUISourceCode:function(uiSourceCode)
{var uiSourceCodeItem=this._uiSourceCodeItems.get(uiSourceCode);if(uiSourceCodeItem){uiSourceCodeItem.reveal();uiSourceCodeItem.expand();}},_uiSourceCodeRemoved:function(event)
{var uiSourceCode=(event.data);this._removeUISourceCode(uiSourceCode);},_removeUISourceCode:function(uiSourceCode)
{var uiSourceCodeItem=this._uiSourceCodeItems.get(uiSourceCode);if(!uiSourceCodeItem)
return;this._treeOutline.removeChild(uiSourceCodeItem);this._uiSourceCodeItems.remove(uiSourceCode);},_projectWillReset:function(event)
{var project=event.data;project.uiSourceCodes().forEach(this._removeUISourceCode.bind(this));},__proto__:WebInspector.VBox.prototype}
WebInspector.RevisionHistoryTreeElement=function(revision,baseRevision,allowRevert)
{TreeElement.call(this,revision.timestamp.toLocaleTimeString(),null,true);this.selectable=false;this._revision=revision;this._baseRevision=baseRevision;this._revertElement=document.createElement("span");this._revertElement.className="revision-history-link";this._revertElement.textContent=WebInspector.UIString("apply revision content");this._revertElement.addEventListener("click",this._revision.revertToThis.bind(this._revision),false);if(!allowRevert)
this._revertElement.classList.add("hidden");}
WebInspector.RevisionHistoryTreeElement.prototype={onattach:function()
{this.listItemElement.classList.add("revision-history-revision");},onexpand:function()
{this.listItemElement.appendChild(this._revertElement);if(this._wasExpandedOnce)
return;this._wasExpandedOnce=true;this.childrenListElement.classList.add("source-code");if(this._baseRevision)
this._baseRevision.requestContent(step1.bind(this));else
this._revision.uiSourceCode.requestOriginalContent(step1.bind(this));function step1(baseContent)
{this._revision.requestContent(step2.bind(this,baseContent));}
function step2(baseContent,newContent)
{var baseLines=difflib.stringAsLines(baseContent);var newLines=difflib.stringAsLines(newContent);var sm=new difflib.SequenceMatcher(baseLines,newLines);var opcodes=sm.get_opcodes();var lastWasSeparator=false;for(var idx=0;idx<opcodes.length;idx++){var code=opcodes[idx];var change=code[0];var b=code[1];var be=code[2];var n=code[3];var ne=code[4];var rowCount=Math.max(be-b,ne-n);var topRows=[];var bottomRows=[];for(var i=0;i<rowCount;i++){if(change==="delete"||(change==="replace"&&b<be)){var lineNumber=b++;this._createLine(lineNumber,null,baseLines[lineNumber],"removed");lastWasSeparator=false;}
if(change==="insert"||(change==="replace"&&n<ne)){var lineNumber=n++;this._createLine(null,lineNumber,newLines[lineNumber],"added");lastWasSeparator=false;}
if(change==="equal"){b++;n++;if(!lastWasSeparator)
this._createLine(null,null,"    \u2026","separator");lastWasSeparator=true;}}}}},oncollapse:function()
{this._revertElement.remove();},_createLine:function(baseLineNumber,newLineNumber,lineContent,changeType)
{var child=new TreeElement("",null,false);child.selectable=false;this.appendChild(child);var lineElement=document.createElement("span");function appendLineNumber(lineNumber)
{var numberString=lineNumber!==null?numberToStringWithSpacesPadding(lineNumber+1,4):"    ";var lineNumberSpan=document.createElement("span");lineNumberSpan.classList.add("webkit-line-number");lineNumberSpan.textContent=numberString;child.listItemElement.appendChild(lineNumberSpan);}
appendLineNumber(baseLineNumber);appendLineNumber(newLineNumber);var contentSpan=document.createElement("span");contentSpan.textContent=lineContent;child.listItemElement.appendChild(contentSpan);child.listItemElement.classList.add("revision-history-line");child.listItemElement.classList.add("revision-history-line-"+changeType);},allowRevert:function()
{this._revertElement.classList.remove("hidden");},__proto__:TreeElement.prototype};WebInspector.ScopeChainSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Scope Variables"));this._sections=[];this._expandedSections={};this._expandedProperties=[];}
WebInspector.ScopeChainSidebarPane.prototype={update:function(callFrame)
{this.bodyElement.removeChildren();if(!callFrame){var infoElement=document.createElement("div");infoElement.className="info";infoElement.textContent=WebInspector.UIString("Not Paused");this.bodyElement.appendChild(infoElement);return;}
for(var i=0;i<this._sections.length;++i){var section=this._sections[i];if(!section.title)
continue;if(section.expanded)
this._expandedSections[section.title]=true;else
delete this._expandedSections[section.title];}
this._sections=[];var foundLocalScope=false;var scopeChain=callFrame.scopeChain;for(var i=0;i<scopeChain.length;++i){var scope=scopeChain[i];var title=null;var subtitle=scope.object.description;var emptyPlaceholder=null;var extraProperties=[];var declarativeScope;switch(scope.type){case DebuggerAgent.ScopeType.Local:foundLocalScope=true;title=WebInspector.UIString("Local");emptyPlaceholder=WebInspector.UIString("No Variables");subtitle=undefined;var thisObject=callFrame.thisObject();if(thisObject)
extraProperties.push(new WebInspector.RemoteObjectProperty("this",thisObject));if(i==0){var details=callFrame.target().debuggerModel.debuggerPausedDetails();if(!callFrame.isAsync()){var exception=details.exception();if(exception)
extraProperties.push(new WebInspector.RemoteObjectProperty("<exception>",exception));}
var returnValue=callFrame.returnValue();if(returnValue)
extraProperties.push(new WebInspector.RemoteObjectProperty("<return>",returnValue));}
declarativeScope=true;break;case DebuggerAgent.ScopeType.Closure:title=WebInspector.UIString("Closure");emptyPlaceholder=WebInspector.UIString("No Variables");subtitle=undefined;declarativeScope=true;break;case DebuggerAgent.ScopeType.Catch:title=WebInspector.UIString("Catch");subtitle=undefined;declarativeScope=true;break;case DebuggerAgent.ScopeType.With:title=WebInspector.UIString("With Block");declarativeScope=false;break;case DebuggerAgent.ScopeType.Global:title=WebInspector.UIString("Global");declarativeScope=false;break;}
if(!title||title===subtitle)
subtitle=undefined;var runtimeModel=callFrame.target().runtimeModel;if(declarativeScope)
var scopeObject=runtimeModel.createScopeRemoteObject(scope.object,new WebInspector.ScopeRef(i,callFrame.id,undefined));else
var scopeObject=runtimeModel.createRemoteObject(scope.object);var section=new WebInspector.ObjectPropertiesSection(scopeObject,title,subtitle,emptyPlaceholder,true,extraProperties,WebInspector.ScopeVariableTreeElement);section.editInSelectedCallFrameWhenPaused=true;section.pane=this;if(scope.type===DebuggerAgent.ScopeType.Global)
section.expanded=false;else if(!foundLocalScope||scope.type===DebuggerAgent.ScopeType.Local||title in this._expandedSections)
section.expanded=true;this._sections.push(section);this.bodyElement.appendChild(section.element);}},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.ScopeVariableTreeElement=function(property)
{WebInspector.ObjectPropertyTreeElement.call(this,property);}
WebInspector.ScopeVariableTreeElement.prototype={onattach:function()
{WebInspector.ObjectPropertyTreeElement.prototype.onattach.call(this);if(this.hasChildren&&this.propertyIdentifier in this.treeOutline.section.pane._expandedProperties)
this.expand();},onexpand:function()
{this.treeOutline.section.pane._expandedProperties[this.propertyIdentifier]=true;},oncollapse:function()
{delete this.treeOutline.section.pane._expandedProperties[this.propertyIdentifier];},get propertyIdentifier()
{if("_propertyIdentifier"in this)
return this._propertyIdentifier;var section=this.treeOutline.section;this._propertyIdentifier=section.title+":"+(section.subtitle?section.subtitle+":":"")+this.propertyPath();return this._propertyIdentifier;},__proto__:WebInspector.ObjectPropertyTreeElement.prototype};WebInspector.SourcesNavigator=function(workspace)
{WebInspector.Object.call(this);this._workspace=workspace;this._tabbedPane=new WebInspector.TabbedPane();this._tabbedPane.shrinkableTabs=true;this._tabbedPane.element.classList.add("navigator-tabbed-pane");new WebInspector.ExtensibleTabbedPaneController(this._tabbedPane,"navigator-view",this._navigatorViewCreated.bind(this));this._navigatorViews=new StringMap();}
WebInspector.SourcesNavigator.Events={SourceSelected:"SourceSelected",SourceRenamed:"SourceRenamed"}
WebInspector.SourcesNavigator.prototype={_navigatorViewCreated:function(id,view)
{var navigatorView=(view);navigatorView.addEventListener(WebInspector.NavigatorView.Events.ItemSelected,this._sourceSelected,this);navigatorView.addEventListener(WebInspector.NavigatorView.Events.ItemRenamed,this._sourceRenamed,this);this._navigatorViews.put(id,navigatorView);navigatorView.setWorkspace(this._workspace);},get view()
{return this._tabbedPane;},_navigatorViewIdForUISourceCode:function(uiSourceCode)
{var ids=this._navigatorViews.keys();for(var i=0;i<ids.length;++i){var id=ids[i]
var navigatorView=this._navigatorViews.get(id);if(navigatorView.accept(uiSourceCode))
return id;}
return null;},revealUISourceCode:function(uiSourceCode)
{var id=this._navigatorViewIdForUISourceCode(uiSourceCode);if(!id)
return;var navigatorView=this._navigatorViews.get(id);console.assert(navigatorView);navigatorView.revealUISourceCode(uiSourceCode,true);this._tabbedPane.selectTab(id);},_sourceSelected:function(event)
{this.dispatchEventToListeners(WebInspector.SourcesNavigator.Events.SourceSelected,event.data);},_sourceRenamed:function(event)
{this.dispatchEventToListeners(WebInspector.SourcesNavigator.Events.SourceRenamed,event.data);},__proto__:WebInspector.Object.prototype}
WebInspector.SnippetsNavigatorView=function()
{WebInspector.NavigatorView.call(this);}
WebInspector.SnippetsNavigatorView.prototype={accept:function(uiSourceCode)
{if(!WebInspector.NavigatorView.prototype.accept(uiSourceCode))
return false;return uiSourceCode.project().type()===WebInspector.projectTypes.Snippets;},handleContextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("New"),this._handleCreateSnippet.bind(this));contextMenu.show();},handleFileContextMenu:function(event,uiSourceCode)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Run"),this._handleEvaluateSnippet.bind(this,uiSourceCode));contextMenu.appendItem(WebInspector.UIString("Rename"),this.rename.bind(this,uiSourceCode));contextMenu.appendItem(WebInspector.UIString("Remove"),this._handleRemoveSnippet.bind(this,uiSourceCode));contextMenu.appendSeparator();contextMenu.appendItem(WebInspector.UIString("New"),this._handleCreateSnippet.bind(this));contextMenu.show();},_handleEvaluateSnippet:function(uiSourceCode)
{var executionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);if(uiSourceCode.project().type()!==WebInspector.projectTypes.Snippets||!executionContext)
return;WebInspector.scriptSnippetModel.evaluateScriptSnippet(executionContext,uiSourceCode);},_handleRemoveSnippet:function(uiSourceCode)
{if(uiSourceCode.project().type()!==WebInspector.projectTypes.Snippets)
return;uiSourceCode.remove();},_handleCreateSnippet:function()
{this.create(WebInspector.scriptSnippetModel.project(),"")},sourceDeleted:function(uiSourceCode)
{this._handleRemoveSnippet(uiSourceCode);},__proto__:WebInspector.NavigatorView.prototype};WebInspector.StyleSheetOutlineDialog=function(uiSourceCode,selectItemCallback)
{WebInspector.SelectionDialogContentProvider.call(this);this._selectItemCallback=selectItemCallback;this._cssParser=new WebInspector.CSSParser();this._cssParser.addEventListener(WebInspector.CSSParser.Events.RulesParsed,this.refresh.bind(this));this._cssParser.parse(uiSourceCode.workingCopy());}
WebInspector.StyleSheetOutlineDialog.show=function(view,uiSourceCode,selectItemCallback)
{if(WebInspector.Dialog.currentInstance())
return null;var delegate=new WebInspector.StyleSheetOutlineDialog(uiSourceCode,selectItemCallback);var filteredItemSelectionDialog=new WebInspector.FilteredItemSelectionDialog(delegate);WebInspector.Dialog.show(view.element,filteredItemSelectionDialog);}
WebInspector.StyleSheetOutlineDialog.prototype={itemCount:function()
{return this._cssParser.rules().length;},itemKeyAt:function(itemIndex)
{var rule=this._cssParser.rules()[itemIndex];return rule.selectorText||rule.atRule;},itemScoreAt:function(itemIndex,query)
{var rule=this._cssParser.rules()[itemIndex];return-rule.lineNumber;},renderItem:function(itemIndex,query,titleElement,subtitleElement)
{var rule=this._cssParser.rules()[itemIndex];titleElement.textContent=rule.selectorText||rule.atRule;this.highlightRanges(titleElement,query);subtitleElement.textContent=":"+(rule.lineNumber+1);},selectItem:function(itemIndex,promptValue)
{var rule=this._cssParser.rules()[itemIndex];var lineNumber=rule.lineNumber;if(!isNaN(lineNumber)&&lineNumber>=0)
this._selectItemCallback(lineNumber,rule.columnNumber);},dispose:function()
{this._cssParser.dispose();},__proto__:WebInspector.SelectionDialogContentProvider.prototype};WebInspector.TabbedEditorContainerDelegate=function(){}
WebInspector.TabbedEditorContainerDelegate.prototype={viewForFile:function(uiSourceCode){},}
WebInspector.TabbedEditorContainer=function(delegate,settingName,placeholderText)
{WebInspector.Object.call(this);this._delegate=delegate;this._tabbedPane=new WebInspector.TabbedPane();this._tabbedPane.setPlaceholderText(placeholderText);this._tabbedPane.setTabDelegate(new WebInspector.EditorContainerTabDelegate(this));this._tabbedPane.closeableTabs=true;this._tabbedPane.element.id="sources-editor-container-tabbed-pane";this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabClosed,this._tabClosed,this);this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected,this._tabSelected,this);this._tabIds=new Map();this._files={};this._previouslyViewedFilesSetting=WebInspector.settings.createSetting(settingName,[]);this._history=WebInspector.TabbedEditorContainer.History.fromObject(this._previouslyViewedFilesSetting.get());}
WebInspector.TabbedEditorContainer.Events={EditorSelected:"EditorSelected",EditorClosed:"EditorClosed"}
WebInspector.TabbedEditorContainer._tabId=0;WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount=30;WebInspector.TabbedEditorContainer.prototype={get view()
{return this._tabbedPane;},get visibleView()
{return this._tabbedPane.visibleView;},fileViews:function()
{return(this._tabbedPane.tabViews());},show:function(parentElement)
{this._tabbedPane.show(parentElement);},showFile:function(uiSourceCode)
{this._innerShowFile(uiSourceCode,true);},closeFile:function(uiSourceCode)
{var tabId=this._tabIds.get(uiSourceCode);if(!tabId)
return;this._closeTabs([tabId]);},historyUISourceCodes:function()
{var uriToUISourceCode={};for(var id in this._files){var uiSourceCode=this._files[id];uriToUISourceCode[uiSourceCode.uri()]=uiSourceCode;}
var result=[];var uris=this._history._urls();for(var i=0;i<uris.length;++i){var uiSourceCode=uriToUISourceCode[uris[i]];if(uiSourceCode)
result.push(uiSourceCode);}
return result;},_addViewListeners:function()
{if(!this._currentView)
return;this._currentView.addEventListener(WebInspector.SourceFrame.Events.ScrollChanged,this._scrollChanged,this);this._currentView.addEventListener(WebInspector.SourceFrame.Events.SelectionChanged,this._selectionChanged,this);},_removeViewListeners:function()
{if(!this._currentView)
return;this._currentView.removeEventListener(WebInspector.SourceFrame.Events.ScrollChanged,this._scrollChanged,this);this._currentView.removeEventListener(WebInspector.SourceFrame.Events.SelectionChanged,this._selectionChanged,this);},_scrollChanged:function(event)
{var lineNumber=(event.data);this._history.updateScrollLineNumber(this._currentFile.uri(),lineNumber);this._history.save(this._previouslyViewedFilesSetting);},_selectionChanged:function(event)
{var range=(event.data);this._history.updateSelectionRange(this._currentFile.uri(),range);this._history.save(this._previouslyViewedFilesSetting);},_innerShowFile:function(uiSourceCode,userGesture)
{if(this._currentFile===uiSourceCode)
return;this._removeViewListeners();this._currentFile=uiSourceCode;var tabId=this._tabIds.get(uiSourceCode)||this._appendFileTab(uiSourceCode,userGesture);this._tabbedPane.selectTab(tabId,userGesture);if(userGesture)
this._editorSelectedByUserAction();this._currentView=this.visibleView;this._addViewListeners();var eventData={currentFile:this._currentFile,userGesture:userGesture};this.dispatchEventToListeners(WebInspector.TabbedEditorContainer.Events.EditorSelected,eventData);},_titleForFile:function(uiSourceCode)
{var maxDisplayNameLength=30;var title=uiSourceCode.displayName(true).trimMiddle(maxDisplayNameLength);if(uiSourceCode.isDirty()||uiSourceCode.hasUnsavedCommittedChanges())
title+="*";return title;},_maybeCloseTab:function(id,nextTabId)
{var uiSourceCode=this._files[id];var shouldPrompt=uiSourceCode.isDirty()&&uiSourceCode.project().canSetFileContent();if(!shouldPrompt||confirm(WebInspector.UIString("Are you sure you want to close unsaved file: %s?",uiSourceCode.name()))){uiSourceCode.resetWorkingCopy();if(nextTabId)
this._tabbedPane.selectTab(nextTabId,true);this._tabbedPane.closeTab(id,true);return true;}
return false;},_closeTabs:function(ids)
{var dirtyTabs=[];var cleanTabs=[];for(var i=0;i<ids.length;++i){var id=ids[i];var uiSourceCode=this._files[id];if(uiSourceCode.isDirty())
dirtyTabs.push(id);else
cleanTabs.push(id);}
if(dirtyTabs.length)
this._tabbedPane.selectTab(dirtyTabs[0],true);this._tabbedPane.closeTabs(cleanTabs,true);for(var i=0;i<dirtyTabs.length;++i){var nextTabId=i+1<dirtyTabs.length?dirtyTabs[i+1]:null;if(!this._maybeCloseTab(dirtyTabs[i],nextTabId))
break;}},addUISourceCode:function(uiSourceCode)
{var uri=uiSourceCode.uri();if(this._userSelectedFiles)
return;var index=this._history.index(uri)
if(index===-1)
return;var tabId=this._tabIds.get(uiSourceCode)||this._appendFileTab(uiSourceCode,false);if(!this._currentFile)
return;if(!index){this._innerShowFile(uiSourceCode,false);return;}
var currentProjectType=this._currentFile.project().type();var addedProjectType=uiSourceCode.project().type();var snippetsProjectType=WebInspector.projectTypes.Snippets;if(this._history.index(this._currentFile.uri())&&currentProjectType===snippetsProjectType&&addedProjectType!==snippetsProjectType)
this._innerShowFile(uiSourceCode,false);},removeUISourceCode:function(uiSourceCode)
{this.removeUISourceCodes([uiSourceCode]);},removeUISourceCodes:function(uiSourceCodes)
{var tabIds=[];for(var i=0;i<uiSourceCodes.length;++i){var uiSourceCode=uiSourceCodes[i];var tabId=this._tabIds.get(uiSourceCode);if(tabId)
tabIds.push(tabId);}
this._tabbedPane.closeTabs(tabIds);},_editorClosedByUserAction:function(uiSourceCode)
{this._userSelectedFiles=true;this._history.remove(uiSourceCode.uri());this._updateHistory();},_editorSelectedByUserAction:function()
{this._userSelectedFiles=true;this._updateHistory();},_updateHistory:function()
{var tabIds=this._tabbedPane.lastOpenedTabIds(WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount);function tabIdToURI(tabId)
{return this._files[tabId].uri();}
this._history.update(tabIds.map(tabIdToURI.bind(this)));this._history.save(this._previouslyViewedFilesSetting);},_tooltipForFile:function(uiSourceCode)
{return uiSourceCode.originURL();},_appendFileTab:function(uiSourceCode,userGesture)
{var view=this._delegate.viewForFile(uiSourceCode);var title=this._titleForFile(uiSourceCode);var tooltip=this._tooltipForFile(uiSourceCode);var tabId=this._generateTabId();this._tabIds.put(uiSourceCode,tabId);this._files[tabId]=uiSourceCode;var savedSelectionRange=this._history.selectionRange(uiSourceCode.uri());if(savedSelectionRange)
view.setSelection(savedSelectionRange);var savedScrollLineNumber=this._history.scrollLineNumber(uiSourceCode.uri());if(savedScrollLineNumber)
view.scrollToLine(savedScrollLineNumber);this._tabbedPane.appendTab(tabId,title,view,tooltip,userGesture);this._updateFileTitle(uiSourceCode);this._addUISourceCodeListeners(uiSourceCode);return tabId;},_tabClosed:function(event)
{var tabId=(event.data.tabId);var userGesture=(event.data.isUserGesture);var uiSourceCode=this._files[tabId];if(this._currentFile===uiSourceCode){this._removeViewListeners();delete this._currentView;delete this._currentFile;}
this._tabIds.remove(uiSourceCode);delete this._files[tabId];this._removeUISourceCodeListeners(uiSourceCode);this.dispatchEventToListeners(WebInspector.TabbedEditorContainer.Events.EditorClosed,uiSourceCode);if(userGesture)
this._editorClosedByUserAction(uiSourceCode);},_tabSelected:function(event)
{var tabId=(event.data.tabId);var userGesture=(event.data.isUserGesture);var uiSourceCode=this._files[tabId];this._innerShowFile(uiSourceCode,userGesture);},_addUISourceCodeListeners:function(uiSourceCode)
{uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.TitleChanged,this._uiSourceCodeTitleChanged,this);uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged,this._uiSourceCodeWorkingCopyChanged,this);uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted,this._uiSourceCodeWorkingCopyCommitted,this);uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.SavedStateUpdated,this._uiSourceCodeSavedStateUpdated,this);},_removeUISourceCodeListeners:function(uiSourceCode)
{uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.TitleChanged,this._uiSourceCodeTitleChanged,this);uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged,this._uiSourceCodeWorkingCopyChanged,this);uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted,this._uiSourceCodeWorkingCopyCommitted,this);uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.SavedStateUpdated,this._uiSourceCodeSavedStateUpdated,this);},_updateFileTitle:function(uiSourceCode)
{var tabId=this._tabIds.get(uiSourceCode);if(tabId){var title=this._titleForFile(uiSourceCode);this._tabbedPane.changeTabTitle(tabId,title);if(uiSourceCode.hasUnsavedCommittedChanges())
this._tabbedPane.setTabIcon(tabId,"editor-container-unsaved-committed-changes-icon",WebInspector.UIString("Changes to this file were not saved to file system."));else
this._tabbedPane.setTabIcon(tabId,"");}},_uiSourceCodeTitleChanged:function(event)
{var uiSourceCode=(event.target);this._updateFileTitle(uiSourceCode);this._updateHistory();},_uiSourceCodeWorkingCopyChanged:function(event)
{var uiSourceCode=(event.target);this._updateFileTitle(uiSourceCode);},_uiSourceCodeWorkingCopyCommitted:function(event)
{var uiSourceCode=(event.target);this._updateFileTitle(uiSourceCode);},_uiSourceCodeSavedStateUpdated:function(event)
{var uiSourceCode=(event.target);this._updateFileTitle(uiSourceCode);},reset:function()
{delete this._userSelectedFiles;},_generateTabId:function()
{return"tab_"+(WebInspector.TabbedEditorContainer._tabId++);},currentFile:function()
{return this._currentFile;},__proto__:WebInspector.Object.prototype}
WebInspector.TabbedEditorContainer.HistoryItem=function(url,selectionRange,scrollLineNumber)
{this.url=url;this._isSerializable=url.length<WebInspector.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit;this.selectionRange=selectionRange;this.scrollLineNumber=scrollLineNumber;}
WebInspector.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit=4096;WebInspector.TabbedEditorContainer.HistoryItem.fromObject=function(serializedHistoryItem)
{var selectionRange=serializedHistoryItem.selectionRange?WebInspector.TextRange.fromObject(serializedHistoryItem.selectionRange):undefined;return new WebInspector.TabbedEditorContainer.HistoryItem(serializedHistoryItem.url,selectionRange,serializedHistoryItem.scrollLineNumber);}
WebInspector.TabbedEditorContainer.HistoryItem.prototype={serializeToObject:function()
{if(!this._isSerializable)
return null;var serializedHistoryItem={};serializedHistoryItem.url=this.url;serializedHistoryItem.selectionRange=this.selectionRange;serializedHistoryItem.scrollLineNumber=this.scrollLineNumber;return serializedHistoryItem;}}
WebInspector.TabbedEditorContainer.History=function(items)
{this._items=items;this._rebuildItemIndex();}
WebInspector.TabbedEditorContainer.History.fromObject=function(serializedHistory)
{var items=[];for(var i=0;i<serializedHistory.length;++i)
items.push(WebInspector.TabbedEditorContainer.HistoryItem.fromObject(serializedHistory[i]));return new WebInspector.TabbedEditorContainer.History(items);}
WebInspector.TabbedEditorContainer.History.prototype={index:function(url)
{var index=this._itemsIndex[url];if(typeof index==="number")
return index;return-1;},_rebuildItemIndex:function()
{this._itemsIndex={};for(var i=0;i<this._items.length;++i){console.assert(!this._itemsIndex.hasOwnProperty(this._items[i].url));this._itemsIndex[this._items[i].url]=i;}},selectionRange:function(url)
{var index=this.index(url);return index!==-1?this._items[index].selectionRange:undefined;},updateSelectionRange:function(url,selectionRange)
{if(!selectionRange)
return;var index=this.index(url);if(index===-1)
return;this._items[index].selectionRange=selectionRange;},scrollLineNumber:function(url)
{var index=this.index(url);return index!==-1?this._items[index].scrollLineNumber:undefined;},updateScrollLineNumber:function(url,scrollLineNumber)
{var index=this.index(url);if(index===-1)
return;this._items[index].scrollLineNumber=scrollLineNumber;},update:function(urls)
{for(var i=urls.length-1;i>=0;--i){var index=this.index(urls[i]);var item;if(index!==-1){item=this._items[index];this._items.splice(index,1);}else
item=new WebInspector.TabbedEditorContainer.HistoryItem(urls[i]);this._items.unshift(item);this._rebuildItemIndex();}},remove:function(url)
{var index=this.index(url);if(index!==-1){this._items.splice(index,1);this._rebuildItemIndex();}},save:function(setting)
{setting.set(this._serializeToObject());},_serializeToObject:function()
{var serializedHistory=[];for(var i=0;i<this._items.length;++i){var serializedItem=this._items[i].serializeToObject();if(serializedItem)
serializedHistory.push(serializedItem);if(serializedHistory.length===WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount)
break;}
return serializedHistory;},_urls:function()
{var result=[];for(var i=0;i<this._items.length;++i)
result.push(this._items[i].url);return result;}}
WebInspector.EditorContainerTabDelegate=function(editorContainer)
{this._editorContainer=editorContainer;}
WebInspector.EditorContainerTabDelegate.prototype={closeTabs:function(tabbedPane,ids)
{this._editorContainer._closeTabs(ids);}};WebInspector.WatchExpressionsSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Watch Expressions"));this.section=new WebInspector.WatchExpressionsSection();this.bodyElement.appendChild(this.section.element);var refreshButton=document.createElement("button");refreshButton.className="pane-title-button refresh";refreshButton.addEventListener("click",this._refreshButtonClicked.bind(this),false);refreshButton.title=WebInspector.UIString("Refresh");this.titleElement.appendChild(refreshButton);var addButton=document.createElement("button");addButton.className="pane-title-button add";addButton.addEventListener("click",this._addButtonClicked.bind(this),false);this.titleElement.appendChild(addButton);addButton.title=WebInspector.UIString("Add watch expression");this._requiresUpdate=true;}
WebInspector.WatchExpressionsSidebarPane.prototype={wasShown:function()
{this._refreshExpressionsIfNeeded();},reset:function()
{this.refreshExpressions();},refreshExpressions:function()
{this._requiresUpdate=true;this._refreshExpressionsIfNeeded();},addExpression:function(expression)
{this.section.addExpression(expression);this.expand();},_refreshExpressionsIfNeeded:function()
{if(this._requiresUpdate&&this.isShowing()){this.section.update();delete this._requiresUpdate;}else
this._requiresUpdate=true;},_addButtonClicked:function(event)
{event.consume();this.expand();this.section.addNewExpressionAndEdit();},_refreshButtonClicked:function(event)
{event.consume();this.refreshExpressions();},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.WatchExpressionsSection=function()
{this._watchObjectGroupId="watch-group";WebInspector.ObjectPropertiesSection.call(this,WebInspector.runtimeModel.createRemoteObjectFromPrimitiveValue(""));this.treeElementConstructor=WebInspector.WatchedPropertyTreeElement;this._expandedExpressions={};this._expandedProperties={};this.emptyElement=document.createElement("div");this.emptyElement.className="info";this.emptyElement.textContent=WebInspector.UIString("No Watch Expressions");this.watchExpressions=WebInspector.settings.watchExpressions.get();this.headerElement.className="hidden";this.editable=true;this.expanded=true;this.propertiesElement.classList.add("watch-expressions");this.element.addEventListener("mousemove",this._mouseMove.bind(this),true);this.element.addEventListener("mouseout",this._mouseOut.bind(this),true);this.element.addEventListener("dblclick",this._sectionDoubleClick.bind(this),false);this.emptyElement.addEventListener("contextmenu",this._emptyElementContextMenu.bind(this),false);}
WebInspector.WatchExpressionsSection.NewWatchExpression="\xA0";WebInspector.WatchExpressionsSection.prototype={update:function(e)
{if(e)
e.consume();function appendResult(expression,watchIndex,result,wasThrown)
{if(!result)
return;var property=new WebInspector.RemoteObjectProperty(expression,result);property.watchIndex=watchIndex;property.wasThrown=wasThrown;properties.push(property);if(properties.length==propertyCount){this.updateProperties(properties,[],WebInspector.WatchExpressionTreeElement,WebInspector.WatchExpressionsSection.CompareProperties);if(this._newExpressionAdded){delete this._newExpressionAdded;var treeElement=this.findAddedTreeElement();if(treeElement)
treeElement.startEditing();}
if(this._lastMouseMovePageY)
this._updateHoveredElement(this._lastMouseMovePageY);}}
WebInspector.targetManager.targets().forEach(function(target){target.runtimeAgent().releaseObjectGroup(this._watchObjectGroupId)},this);var properties=[];var propertyCount=0;for(var i=0;i<this.watchExpressions.length;++i){if(!this.watchExpressions[i])
continue;++propertyCount;}
var currentExecutionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);if(currentExecutionContext){for(var i=0;i<this.watchExpressions.length;++i){var expression=this.watchExpressions[i];if(!expression)
continue;currentExecutionContext.evaluate(expression,this._watchObjectGroupId,false,true,false,false,appendResult.bind(this,expression,i));}}
if(!propertyCount){if(!this.emptyElement.parentNode)
this.element.appendChild(this.emptyElement);}else{if(this.emptyElement.parentNode)
this.element.removeChild(this.emptyElement);}
this.expanded=(propertyCount!=0);},addExpression:function(expression)
{this.watchExpressions.push(expression);this.saveExpressions();this.update();},addNewExpressionAndEdit:function()
{this._newExpressionAdded=true;this.watchExpressions.push(WebInspector.WatchExpressionsSection.NewWatchExpression);this.update();},_sectionDoubleClick:function(event)
{if(event.target!==this.element&&event.target!==this.propertiesElement&&event.target!==this.emptyElement)
return;event.consume();this.addNewExpressionAndEdit();},updateExpression:function(element,value)
{if(value===null){var index=element.property.watchIndex;this.watchExpressions.splice(index,1);}
else
this.watchExpressions[element.property.watchIndex]=value;this.saveExpressions();this.update();},_deleteAllExpressions:function()
{this.watchExpressions=[];this.saveExpressions();this.update();},findAddedTreeElement:function()
{var children=this.propertiesTreeOutline.children;for(var i=0;i<children.length;++i){if(children[i].property.name===WebInspector.WatchExpressionsSection.NewWatchExpression)
return children[i];}
return null;},saveExpressions:function()
{var toSave=[];for(var i=0;i<this.watchExpressions.length;i++)
if(this.watchExpressions[i])
toSave.push(this.watchExpressions[i]);WebInspector.settings.watchExpressions.set(toSave);return toSave.length;},_mouseMove:function(e)
{if(this.propertiesElement.firstChild)
this._updateHoveredElement(e.pageY);},_mouseOut:function()
{if(this._hoveredElement){this._hoveredElement.classList.remove("hovered");delete this._hoveredElement;}
delete this._lastMouseMovePageY;},_updateHoveredElement:function(pageY)
{var candidateElement=this.propertiesElement.firstChild;while(true){var next=candidateElement.nextSibling;while(next&&!next.clientHeight)
next=next.nextSibling;if(!next||next.totalOffsetTop()>pageY)
break;candidateElement=next;}
if(this._hoveredElement!==candidateElement){if(this._hoveredElement)
this._hoveredElement.classList.remove("hovered");if(candidateElement)
candidateElement.classList.add("hovered");this._hoveredElement=candidateElement;}
this._lastMouseMovePageY=pageY;},_emptyElementContextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add watch expression":"Add Watch Expression"),this.addNewExpressionAndEdit.bind(this));contextMenu.show();},__proto__:WebInspector.ObjectPropertiesSection.prototype}
WebInspector.WatchExpressionsSection.CompareProperties=function(propertyA,propertyB)
{if(propertyA.watchIndex==propertyB.watchIndex)
return 0;else if(propertyA.watchIndex<propertyB.watchIndex)
return-1;else
return 1;}
WebInspector.WatchExpressionTreeElement=function(property)
{WebInspector.ObjectPropertyTreeElement.call(this,property);}
WebInspector.WatchExpressionTreeElement.prototype={onexpand:function()
{WebInspector.ObjectPropertyTreeElement.prototype.onexpand.call(this);this.treeOutline.section._expandedExpressions[this._expression()]=true;},oncollapse:function()
{WebInspector.ObjectPropertyTreeElement.prototype.oncollapse.call(this);delete this.treeOutline.section._expandedExpressions[this._expression()];},onattach:function()
{WebInspector.ObjectPropertyTreeElement.prototype.onattach.call(this);if(this.treeOutline.section._expandedExpressions[this._expression()])
this.expanded=true;},_expression:function()
{return this.property.name;},update:function()
{WebInspector.ObjectPropertyTreeElement.prototype.update.call(this);if(this.property.wasThrown){this.valueElement.textContent=WebInspector.UIString("<not available>");this.listItemElement.classList.add("dimmed");}else
this.listItemElement.classList.remove("dimmed");var deleteButton=document.createElement("input");deleteButton.type="button";deleteButton.title=WebInspector.UIString("Delete watch expression.");deleteButton.classList.add("enabled-button");deleteButton.classList.add("delete-button");deleteButton.addEventListener("click",this._deleteButtonClicked.bind(this),false);this.listItemElement.addEventListener("contextmenu",this._contextMenu.bind(this),false);this.listItemElement.insertBefore(deleteButton,this.listItemElement.firstChild);},populateContextMenu:function(contextMenu)
{if(!this.isEditing()){contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add watch expression":"Add Watch Expression"),this.treeOutline.section.addNewExpressionAndEdit.bind(this.treeOutline.section));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Delete watch expression":"Delete Watch Expression"),this._deleteButtonClicked.bind(this));}
if(this.treeOutline.section.watchExpressions.length>1)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Delete all watch expressions":"Delete All Watch Expressions"),this._deleteAllButtonClicked.bind(this));},_contextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);this.populateContextMenu(contextMenu);contextMenu.show();},_deleteAllButtonClicked:function()
{this.treeOutline.section._deleteAllExpressions();},_deleteButtonClicked:function()
{this.treeOutline.section.updateExpression(this,null);},renderPromptAsBlock:function()
{return true;},elementAndValueToEdit:function(event)
{return[this.nameElement,this.property.name.trim()];},editingCancelled:function(element,context)
{if(!context.elementToEdit.textContent)
this.treeOutline.section.updateExpression(this,null);WebInspector.ObjectPropertyTreeElement.prototype.editingCancelled.call(this,element,context);},applyExpression:function(expression,updateInterface)
{expression=expression.trim();if(!expression)
expression=null;this.property.name=expression;this.treeOutline.section.updateExpression(this,expression);},__proto__:WebInspector.ObjectPropertyTreeElement.prototype}
WebInspector.WatchedPropertyTreeElement=function(property)
{WebInspector.ObjectPropertyTreeElement.call(this,property);}
WebInspector.WatchedPropertyTreeElement.prototype={onattach:function()
{WebInspector.ObjectPropertyTreeElement.prototype.onattach.call(this);if(this.hasChildren&&this.propertyPath()in this.treeOutline.section._expandedProperties)
this.expand();},onexpand:function()
{WebInspector.ObjectPropertyTreeElement.prototype.onexpand.call(this);this.treeOutline.section._expandedProperties[this.propertyPath()]=true;},oncollapse:function()
{WebInspector.ObjectPropertyTreeElement.prototype.oncollapse.call(this);delete this.treeOutline.section._expandedProperties[this.propertyPath()];},__proto__:WebInspector.ObjectPropertyTreeElement.prototype};WebInspector.WorkersSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Workers"));this._enableWorkersCheckbox=new WebInspector.Checkbox(WebInspector.UIString("Pause on start"),"sidebar-label",WebInspector.UIString("Automatically attach to new workers and pause them. Enabling this option will force opening inspector for all new workers."));this._enableWorkersCheckbox.element.id="pause-workers-checkbox";this.bodyElement.appendChild(this._enableWorkersCheckbox.element);this._enableWorkersCheckbox.addEventListener(this._autoattachToWorkersClicked.bind(this));this._enableWorkersCheckbox.checked=false;var note=this.bodyElement.createChild("div");note.id="shared-workers-list";note.classList.add("sidebar-label")
note.textContent=WebInspector.UIString("Shared workers can be inspected in the Task Manager");var separator=this.bodyElement.createChild("div","sidebar-separator");separator.textContent=WebInspector.UIString("Dedicated worker inspectors");this._workerListElement=document.createElement("ol");this._workerListElement.tabIndex=0;this._workerListElement.classList.add("properties-tree");this._workerListElement.classList.add("sidebar-label");this.bodyElement.appendChild(this._workerListElement);this._idToWorkerItem={};var threadList=WebInspector.workerManager.threadsList();for(var i=0;i<threadList.length;++i){var threadId=threadList[i];if(threadId===WebInspector.WorkerManager.MainThreadId)
continue;this._addWorker(threadId,WebInspector.workerManager.threadUrl(threadId));}
WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerAdded,this._workerAdded,this);WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved,this._workerRemoved,this);WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared,this._workersCleared,this);}
WebInspector.WorkersSidebarPane.prototype={_workerAdded:function(event)
{this._addWorker(event.data.workerId,event.data.url);},_workerRemoved:function(event)
{this._idToWorkerItem[event.data].remove();delete this._idToWorkerItem[event.data];},_workersCleared:function(event)
{this._idToWorkerItem={};this._workerListElement.removeChildren();},_addWorker:function(workerId,url)
{var item=this._workerListElement.createChild("div","dedicated-worker-item");var link=item.createChild("a");link.textContent=url;link.href="#";link.target="_blank";link.addEventListener("click",this._workerItemClicked.bind(this,workerId),true);this._idToWorkerItem[workerId]=item;},_workerItemClicked:function(workerId,event)
{event.consume(true);WebInspector.workerFrontendManager.openWorkerInspector(workerId);},_autoattachToWorkersClicked:function(event)
{WorkerAgent.setAutoconnectToWorkers(this._enableWorkersCheckbox.checked);},__proto__:WebInspector.SidebarPane.prototype};WebInspector.ThreadsToolbar=function()
{this.element=document.createElement("div");this.element.className="status-bar scripts-debug-toolbar threads-toolbar hidden";this._comboBox=new WebInspector.StatusBarComboBox(this._onComboBoxSelectionChange.bind(this));this.element.appendChild(this._comboBox.element);this._reset();if(WebInspector.experimentsSettings.workersInMainWindow.isEnabled()){WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerAdded,this._workerAdded,this);WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved,this._workerRemoved,this);WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared,this._workersCleared,this);}}
WebInspector.ThreadsToolbar.prototype={_reset:function()
{if(!WebInspector.experimentsSettings.workersInMainWindow.isEnabled())
return;this._threadIdToOption={};var connectedThreads=WebInspector.workerManager.threadsList();for(var i=0;i<connectedThreads.length;++i){var threadId=connectedThreads[i];this._addOption(threadId,WebInspector.workerManager.threadUrl(threadId));}
this._alterVisibility();this._comboBox.select(this._threadIdToOption[WebInspector.workerManager.selectedThreadId()]);},_addOption:function(workerId,url)
{var option=this._comboBox.createOption(url,"",String(workerId));this._threadIdToOption[workerId]=option;},_workerAdded:function(event)
{var data=(event.data);this._addOption(data.workerId,data.url);this._alterVisibility();},_workerRemoved:function(event)
{var data=(event.data);this._comboBox.removeOption(this._threadIdToOption[data.workerId]);delete this._threadIdToOption[data.workerId];this._alterVisibility();},_workersCleared:function()
{this._comboBox.removeOptions();this._reset();},_onComboBoxSelectionChange:function()
{var selectedOption=this._comboBox.selectedOption();if(!selectedOption)
return;WebInspector.workerManager.setSelectedThreadId(parseInt(selectedOption.value,10));},_alterVisibility:function()
{var hidden=this._comboBox.size()===1;this.element.classList.toggle("hidden",hidden);}};WebInspector.FormatterScriptMapping=function(workspace,debuggerModel)
{this._workspace=workspace;this._debuggerModel=debuggerModel;this._init();this._projectId="formatter:";this._projectDelegate=new WebInspector.FormatterProjectDelegate(workspace,this._projectId);this._debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared,this._debuggerReset,this);}
WebInspector.FormatterScriptMapping.prototype={rawLocationToUILocation:function(rawLocation)
{var debuggerModelLocation=(rawLocation);var script=debuggerModelLocation.script();var uiSourceCode=this._uiSourceCodes.get(script);if(!uiSourceCode)
return null;var formatData=this._formatData.get(uiSourceCode);if(!formatData)
return null;var mapping=formatData.mapping;var lineNumber=debuggerModelLocation.lineNumber;var columnNumber=debuggerModelLocation.columnNumber||0;var formattedLocation=mapping.originalToFormatted(lineNumber,columnNumber);return uiSourceCode.uiLocation(formattedLocation[0],formattedLocation[1]);},uiLocationToRawLocation:function(uiSourceCode,lineNumber,columnNumber)
{var formatData=this._formatData.get(uiSourceCode);if(!formatData)
return null;var originalLocation=formatData.mapping.formattedToOriginal(lineNumber,columnNumber)
return this._debuggerModel.createRawLocation(formatData.scripts[0],originalLocation[0],originalLocation[1]);},isIdentity:function()
{return false;},_scriptsForUISourceCode:function(uiSourceCode)
{function isInlineScript(script)
{return script.isInlineScript();}
if(uiSourceCode.contentType()===WebInspector.resourceTypes.Document)
return this._debuggerModel.scriptsForSourceURL(uiSourceCode.url).filter(isInlineScript);if(uiSourceCode.contentType()===WebInspector.resourceTypes.Script){var rawLocation=(uiSourceCode.uiLocationToRawLocation(this._debuggerModel.target(),0,0));return rawLocation?[rawLocation.script()]:[];}
return[];},_init:function()
{this._uiSourceCodes=new Map();this._formattedPaths=new StringMap();this._formatData=new Map();},_debuggerReset:function()
{var formattedPaths=this._formattedPaths.values();for(var i=0;i<formattedPaths.length;++i)
this._projectDelegate._removeFormatted(formattedPaths[i]);this._init();},_performUISourceCodeScriptFormatting:function(uiSourceCode,callback)
{var path=this._formattedPaths.get(uiSourceCode.project().id()+":"+uiSourceCode.path());if(path){var uiSourceCodePath=path;var formattedUISourceCode=this._workspace.uiSourceCode(this._projectId,uiSourceCodePath);var formatData=formattedUISourceCode?this._formatData.get(formattedUISourceCode):null;if(!formatData)
callback(null);else
callback(formattedUISourceCode,formatData.mapping);return;}
uiSourceCode.requestContent(contentLoaded.bind(this));function contentLoaded(content)
{var formatter=WebInspector.Formatter.createFormatter(uiSourceCode.contentType());formatter.formatContent(uiSourceCode.highlighterType(),content||"",innerCallback.bind(this));}
function innerCallback(formattedContent,formatterMapping)
{var scripts=this._scriptsForUISourceCode(uiSourceCode);if(!scripts.length){callback(null);return;}
var name;if(uiSourceCode.contentType()===WebInspector.resourceTypes.Document)
name=uiSourceCode.displayName();else
name=uiSourceCode.name()||scripts[0].scriptId;path=this._projectDelegate._addFormatted(name,uiSourceCode.url,uiSourceCode.contentType(),formattedContent);var formattedUISourceCode=(this._workspace.uiSourceCode(this._projectId,path));var formatData=new WebInspector.FormatterScriptMapping.FormatData(uiSourceCode.project().id(),uiSourceCode.path(),formatterMapping,scripts);this._formatData.put(formattedUISourceCode,formatData);this._formattedPaths.put(uiSourceCode.project().id()+":"+uiSourceCode.path(),path);for(var i=0;i<scripts.length;++i){this._uiSourceCodes.put(scripts[i],formattedUISourceCode);scripts[i].pushSourceMapping(this);}
formattedUISourceCode.setSourceMappingForTarget(this._debuggerModel.target(),this);callback(formattedUISourceCode,formatterMapping);}},_discardFormattedUISourceCodeScript:function(formattedUISourceCode)
{var formatData=this._formatData.get(formattedUISourceCode);if(!formatData)
return null;this._formatData.remove(formattedUISourceCode);this._formattedPaths.remove(formatData.projectId+":"+formatData.path);for(var i=0;i<formatData.scripts.length;++i){this._uiSourceCodes.remove(formatData.scripts[i]);formatData.scripts[i].popSourceMapping();}
this._projectDelegate._removeFormatted(formattedUISourceCode.path());return formatData.mapping;}}
WebInspector.FormatterScriptMapping.FormatData=function(projectId,path,mapping,scripts)
{this.projectId=projectId;this.path=path;this.mapping=mapping;this.scripts=scripts;}
WebInspector.FormatterProjectDelegate=function(workspace,id)
{WebInspector.ContentProviderBasedProjectDelegate.call(this,workspace,id,WebInspector.projectTypes.Formatter);}
WebInspector.FormatterProjectDelegate.prototype={displayName:function()
{return"formatter";},_addFormatted:function(name,sourceURL,contentType,content)
{var contentProvider=new WebInspector.StaticContentProvider(contentType,content);return this.addContentProvider(sourceURL,name+":formatted","deobfuscated:"+sourceURL,contentProvider);},_removeFormatted:function(path)
{this.removeFile(path);},__proto__:WebInspector.ContentProviderBasedProjectDelegate.prototype}
WebInspector.ScriptFormatterEditorAction=function()
{this._scriptMapping=new WebInspector.FormatterScriptMapping(WebInspector.workspace,WebInspector.debuggerModel);}
WebInspector.ScriptFormatterEditorAction.prototype={_editorSelected:function(event)
{var uiSourceCode=(event.data);this._updateButton(uiSourceCode);},_editorClosed:function(event)
{var uiSourceCode=(event.data.uiSourceCode);var wasSelected=(event.data.wasSelected);if(wasSelected)
this._updateButton(null);this._discardFormattedUISourceCodeScript(uiSourceCode);},_updateButton:function(uiSourceCode)
{this._button.element.classList.toggle("hidden",!this._isFormatableScript(uiSourceCode));},button:function(sourcesView)
{if(this._button)
return this._button.element;this._sourcesView=sourcesView;this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorClosed,this._editorClosed.bind(this));this._button=new WebInspector.StatusBarButton(WebInspector.UIString("Pretty print"),"sources-toggle-pretty-print-status-bar-item");this._button.toggled=false;this._button.addEventListener("click",this._toggleFormatScriptSource,this);this._updateButton(null);return this._button.element;},_isFormatableScript:function(uiSourceCode)
{if(!uiSourceCode)
return false;var supportedProjectTypes=[WebInspector.projectTypes.Network,WebInspector.projectTypes.Debugger,WebInspector.projectTypes.ContentScripts];if(supportedProjectTypes.indexOf(uiSourceCode.project().type())===-1)
return false;var contentType=uiSourceCode.contentType();return contentType===WebInspector.resourceTypes.Script||contentType===WebInspector.resourceTypes.Document;},_toggleFormatScriptSource:function()
{var uiSourceCode=this._sourcesView.currentUISourceCode();if(!this._isFormatableScript(uiSourceCode))
return;this._formatUISourceCodeScript(uiSourceCode);WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction,{action:WebInspector.UserMetrics.UserActionNames.TogglePrettyPrint,enabled:true,url:uiSourceCode.originURL()});},_formatUISourceCodeScript:function(uiSourceCode)
{this._scriptMapping._performUISourceCodeScriptFormatting(uiSourceCode,innerCallback.bind(this));function innerCallback(formattedUISourceCode,mapping)
{if(!formattedUISourceCode)
return;if(uiSourceCode!==this._sourcesView.currentUISourceCode())
return;var sourceFrame=this._sourcesView.viewForFile(uiSourceCode);var start=[0,0];if(sourceFrame){var selection=sourceFrame.selection();start=mapping.originalToFormatted(selection.startLine,selection.startColumn);}
this._sourcesView.showSourceLocation(formattedUISourceCode,start[0],start[1]);this._updateButton(formattedUISourceCode);}},_discardFormattedUISourceCodeScript:function(uiSourceCode)
{this._scriptMapping._discardFormattedUISourceCodeScript(uiSourceCode);}};WebInspector.InplaceFormatterEditorAction=function()
{}
WebInspector.InplaceFormatterEditorAction.prototype={_editorSelected:function(event)
{var uiSourceCode=(event.data);this._updateButton(uiSourceCode);},_editorClosed:function(event)
{var wasSelected=(event.data.wasSelected);if(wasSelected)
this._updateButton(null);},_updateButton:function(uiSourceCode)
{this._button.element.classList.toggle("hidden",!this._isFormattable(uiSourceCode));},button:function(sourcesView)
{if(this._button)
return this._button.element;this._sourcesView=sourcesView;this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorClosed,this._editorClosed.bind(this));this._button=new WebInspector.StatusBarButton(WebInspector.UIString("Format"),"sources-toggle-pretty-print-status-bar-item");this._button.toggled=false;this._button.addEventListener("click",this._formatSourceInPlace,this);this._updateButton(null);return this._button.element;},_isFormattable:function(uiSourceCode)
{if(!uiSourceCode)
return false;return uiSourceCode.contentType()===WebInspector.resourceTypes.Stylesheet||uiSourceCode.project().type()===WebInspector.projectTypes.Snippets;},_formatSourceInPlace:function()
{var uiSourceCode=this._sourcesView.currentUISourceCode();if(!this._isFormattable(uiSourceCode))
return;if(uiSourceCode.isDirty())
contentLoaded.call(this,uiSourceCode.workingCopy());else
uiSourceCode.requestContent(contentLoaded.bind(this));function contentLoaded(content)
{var formatter=WebInspector.Formatter.createFormatter(uiSourceCode.contentType());formatter.formatContent(uiSourceCode.highlighterType(),content||"",innerCallback.bind(this));}
function innerCallback(formattedContent,formatterMapping)
{if(uiSourceCode.workingCopy()===formattedContent)
return;var sourceFrame=this._sourcesView.viewForFile(uiSourceCode);var start=[0,0];if(sourceFrame){var selection=sourceFrame.selection();start=formatterMapping.originalToFormatted(selection.startLine,selection.startColumn);}
uiSourceCode.setWorkingCopy(formattedContent);this._sourcesView.showSourceLocation(uiSourceCode,start[0],start[1]);}},};WebInspector.Formatter=function()
{}
WebInspector.Formatter.createFormatter=function(contentType)
{if(contentType===WebInspector.resourceTypes.Script||contentType===WebInspector.resourceTypes.Document||contentType===WebInspector.resourceTypes.Stylesheet)
return new WebInspector.ScriptFormatter();return new WebInspector.IdentityFormatter();}
WebInspector.Formatter.locationToPosition=function(lineEndings,lineNumber,columnNumber)
{var position=lineNumber?lineEndings[lineNumber-1]+1:0;return position+columnNumber;}
WebInspector.Formatter.positionToLocation=function(lineEndings,position)
{var lineNumber=lineEndings.upperBound(position-1);if(!lineNumber)
var columnNumber=position;else
var columnNumber=position-lineEndings[lineNumber-1]-1;return[lineNumber,columnNumber];}
WebInspector.Formatter.prototype={formatContent:function(mimeType,content,callback)
{}}
WebInspector.ScriptFormatter=function()
{this._tasks=[];}
WebInspector.ScriptFormatter.prototype={formatContent:function(mimeType,content,callback)
{content=content.replace(/\r\n?|[\n\u2028\u2029]/g,"\n").replace(/^\uFEFF/,'');const method="format";var parameters={mimeType:mimeType,content:content,indentString:WebInspector.settings.textEditorIndent.get()};this._tasks.push({data:parameters,callback:callback});this._worker.postMessage({method:method,params:parameters});},_didFormatContent:function(event)
{var task=this._tasks.shift();var originalContent=task.data.content;var formattedContent=event.data.content;var mapping=event.data["mapping"];var sourceMapping=new WebInspector.FormatterSourceMappingImpl(originalContent.lineEndings(),formattedContent.lineEndings(),mapping);task.callback(formattedContent,sourceMapping);},get _worker()
{if(!this._cachedWorker){this._cachedWorker=new Worker("script_formatter_worker/ScriptFormatterWorker.js");this._cachedWorker.onmessage=(this._didFormatContent.bind(this));}
return this._cachedWorker;}}
WebInspector.IdentityFormatter=function()
{this._tasks=[];}
WebInspector.IdentityFormatter.prototype={formatContent:function(mimeType,content,callback)
{callback(content,new WebInspector.IdentityFormatterSourceMapping());}}
WebInspector.FormatterMappingPayload=function()
{this.original=[];this.formatted=[];}
WebInspector.FormatterSourceMapping=function()
{}
WebInspector.FormatterSourceMapping.prototype={originalToFormatted:function(lineNumber,columnNumber){},formattedToOriginal:function(lineNumber,columnNumber){}}
WebInspector.IdentityFormatterSourceMapping=function()
{}
WebInspector.IdentityFormatterSourceMapping.prototype={originalToFormatted:function(lineNumber,columnNumber)
{return[lineNumber,columnNumber||0];},formattedToOriginal:function(lineNumber,columnNumber)
{return[lineNumber,columnNumber||0];}}
WebInspector.FormatterSourceMappingImpl=function(originalLineEndings,formattedLineEndings,mapping)
{this._originalLineEndings=originalLineEndings;this._formattedLineEndings=formattedLineEndings;this._mapping=mapping;}
WebInspector.FormatterSourceMappingImpl.prototype={originalToFormatted:function(lineNumber,columnNumber)
{var originalPosition=WebInspector.Formatter.locationToPosition(this._originalLineEndings,lineNumber,columnNumber||0);var formattedPosition=this._convertPosition(this._mapping.original,this._mapping.formatted,originalPosition||0);return WebInspector.Formatter.positionToLocation(this._formattedLineEndings,formattedPosition);},formattedToOriginal:function(lineNumber,columnNumber)
{var formattedPosition=WebInspector.Formatter.locationToPosition(this._formattedLineEndings,lineNumber,columnNumber||0);var originalPosition=this._convertPosition(this._mapping.formatted,this._mapping.original,formattedPosition);return WebInspector.Formatter.positionToLocation(this._originalLineEndings,originalPosition||0);},_convertPosition:function(positions1,positions2,position)
{var index=positions1.upperBound(position)-1;var convertedPosition=positions2[index]+position-positions1[index];if(index<positions2.length-1&&convertedPosition>positions2[index+1])
convertedPosition=positions2[index+1];return convertedPosition;}};WebInspector.SourcesView=function(workspace,sourcesPanel)
{WebInspector.VBox.call(this);this.registerRequiredCSS("sourcesView.css");this.element.id="sources-panel-sources-view";this.setMinimumAndPreferredSizes(50,25,150,100);this._workspace=workspace;this._sourcesPanel=sourcesPanel;this._searchableView=new WebInspector.SearchableView(this);this._searchableView.setMinimalSearchQuerySize(0);this._searchableView.show(this.element);this._sourceFramesByUISourceCode=new Map();var tabbedEditorPlaceholderText=WebInspector.isMac()?WebInspector.UIString("Hit Cmd+P to open a file"):WebInspector.UIString("Hit Ctrl+P to open a file");this._editorContainer=new WebInspector.TabbedEditorContainer(this,"previouslyViewedFiles",tabbedEditorPlaceholderText);this._editorContainer.show(this._searchableView.element);this._editorContainer.addEventListener(WebInspector.TabbedEditorContainer.Events.EditorSelected,this._editorSelected,this);this._editorContainer.addEventListener(WebInspector.TabbedEditorContainer.Events.EditorClosed,this._editorClosed,this);this._historyManager=new WebInspector.EditingLocationHistoryManager(this,this.currentSourceFrame.bind(this));this._scriptViewStatusBarItemsContainer=document.createElement("div");this._scriptViewStatusBarItemsContainer.className="inline-block";this._scriptViewStatusBarTextContainer=document.createElement("div");this._scriptViewStatusBarTextContainer.className="hbox";this._statusBarContainerElement=this.element.createChild("div","sources-status-bar");function appendButtonForExtension(EditorAction)
{this._statusBarContainerElement.appendChild(EditorAction.button(this));}
var editorActions=(WebInspector.moduleManager.instances(WebInspector.SourcesView.EditorAction));editorActions.forEach(appendButtonForExtension.bind(this));this._statusBarContainerElement.appendChild(this._scriptViewStatusBarItemsContainer);this._statusBarContainerElement.appendChild(this._scriptViewStatusBarTextContainer);WebInspector.startBatchUpdate();this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));WebInspector.endBatchUpdate();this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset,this._projectWillReset.bind(this),this);function handleBeforeUnload(event)
{if(event.returnValue)
return;var unsavedSourceCodes=WebInspector.workspace.unsavedSourceCodes();if(!unsavedSourceCodes.length)
return;event.returnValue=WebInspector.UIString("DevTools have unsaved changes that will be permanently lost.");WebInspector.inspectorView.showPanel("sources");for(var i=0;i<unsavedSourceCodes.length;++i)
WebInspector.Revealer.reveal(unsavedSourceCodes[i]);}
window.addEventListener("beforeunload",handleBeforeUnload,true);this._shortcuts={};this.element.addEventListener("keydown",this._handleKeyDown.bind(this),false);}
WebInspector.SourcesView.Events={EditorClosed:"EditorClosed",EditorSelected:"EditorSelected",}
WebInspector.SourcesView.prototype={registerShortcuts:function(registerShortcutDelegate)
{function registerShortcut(shortcuts,handler)
{registerShortcutDelegate(shortcuts,handler);this._registerShortcuts(shortcuts,handler);}
registerShortcut.call(this,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.JumpToPreviousLocation,this._onJumpToPreviousLocation.bind(this));registerShortcut.call(this,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.JumpToNextLocation,this._onJumpToNextLocation.bind(this));registerShortcut.call(this,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.CloseEditorTab,this._onCloseEditorTab.bind(this));registerShortcut.call(this,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.GoToLine,this._showGoToLineDialog.bind(this));registerShortcut.call(this,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.GoToMember,this._showOutlineDialog.bind(this));registerShortcut.call(this,[WebInspector.KeyboardShortcut.makeDescriptor("o",WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta|WebInspector.KeyboardShortcut.Modifiers.Shift)],this._showOutlineDialog.bind(this));registerShortcut.call(this,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.ToggleBreakpoint,this._toggleBreakpoint.bind(this));registerShortcut.call(this,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.Save,this._save.bind(this));registerShortcut.call(this,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.SaveAll,this._saveAll.bind(this));},_registerShortcuts:function(keys,handler)
{for(var i=0;i<keys.length;++i)
this._shortcuts[keys[i].key]=handler;},_handleKeyDown:function(event)
{var shortcutKey=WebInspector.KeyboardShortcut.makeKeyFromEvent(event);var handler=this._shortcuts[shortcutKey];if(handler&&handler())
event.consume(true);},statusBarContainerElement:function()
{return this._statusBarContainerElement;},defaultFocusedElement:function()
{return this._editorContainer.view.defaultFocusedElement();},searchableView:function()
{return this._searchableView;},visibleView:function()
{return this._editorContainer.visibleView;},currentSourceFrame:function()
{var view=this.visibleView();if(!(view instanceof WebInspector.SourceFrame))
return null;return(view);},currentUISourceCode:function()
{return this._currentUISourceCode;},_onCloseEditorTab:function(event)
{var uiSourceCode=this.currentUISourceCode();if(!uiSourceCode)
return false;this._editorContainer.closeFile(uiSourceCode);return true;},_onJumpToPreviousLocation:function(event)
{this._historyManager.rollback();return true;},_onJumpToNextLocation:function(event)
{this._historyManager.rollover();return true;},_uiSourceCodeAdded:function(event)
{var uiSourceCode=(event.data);this._addUISourceCode(uiSourceCode);},_addUISourceCode:function(uiSourceCode)
{if(uiSourceCode.project().isServiceProject())
return;this._editorContainer.addUISourceCode(uiSourceCode);var currentUISourceCode=this._currentUISourceCode;if(currentUISourceCode&&currentUISourceCode.project().isServiceProject()&&currentUISourceCode!==uiSourceCode&&currentUISourceCode.url===uiSourceCode.url){this._showFile(uiSourceCode);this._editorContainer.removeUISourceCode(currentUISourceCode);}},_uiSourceCodeRemoved:function(event)
{var uiSourceCode=(event.data);this._removeUISourceCodes([uiSourceCode]);},_removeUISourceCodes:function(uiSourceCodes)
{this._editorContainer.removeUISourceCodes(uiSourceCodes);for(var i=0;i<uiSourceCodes.length;++i){this._removeSourceFrame(uiSourceCodes[i]);this._historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);}},_projectWillReset:function(event)
{var project=event.data;var uiSourceCodes=project.uiSourceCodes();this._removeUISourceCodes(uiSourceCodes);if(project.type()===WebInspector.projectTypes.Network)
this._editorContainer.reset();},_updateScriptViewStatusBarItems:function()
{this._scriptViewStatusBarItemsContainer.removeChildren();this._scriptViewStatusBarTextContainer.removeChildren();var sourceFrame=this.currentSourceFrame();if(!sourceFrame)
return;var statusBarItems=sourceFrame.statusBarItems()||[];for(var i=0;i<statusBarItems.length;++i)
this._scriptViewStatusBarItemsContainer.appendChild(statusBarItems[i]);var statusBarText=sourceFrame.statusBarText();if(statusBarText)
this._scriptViewStatusBarTextContainer.appendChild(statusBarText);},showSourceLocation:function(uiSourceCode,lineNumber,columnNumber,omitFocus,omitHighlight)
{this._historyManager.updateCurrentState();var sourceFrame=this._showFile(uiSourceCode);if(typeof lineNumber==="number")
sourceFrame.revealPosition(lineNumber,columnNumber,!omitHighlight);this._historyManager.pushNewState();if(!omitFocus)
sourceFrame.focus();WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction,{action:WebInspector.UserMetrics.UserActionNames.OpenSourceLink,url:uiSourceCode.originURL(),lineNumber:lineNumber});},_showFile:function(uiSourceCode)
{var sourceFrame=this._getOrCreateSourceFrame(uiSourceCode);if(this._currentUISourceCode===uiSourceCode)
return sourceFrame;this._currentUISourceCode=uiSourceCode;this._editorContainer.showFile(uiSourceCode);this._updateScriptViewStatusBarItems();return sourceFrame;},_createSourceFrame:function(uiSourceCode)
{var sourceFrame;switch(uiSourceCode.contentType()){case WebInspector.resourceTypes.Script:sourceFrame=new WebInspector.JavaScriptSourceFrame(this._sourcesPanel,uiSourceCode);break;case WebInspector.resourceTypes.Document:sourceFrame=new WebInspector.JavaScriptSourceFrame(this._sourcesPanel,uiSourceCode);break;case WebInspector.resourceTypes.Stylesheet:sourceFrame=new WebInspector.CSSSourceFrame(uiSourceCode);break;default:sourceFrame=new WebInspector.UISourceCodeFrame(uiSourceCode);break;}
sourceFrame.setHighlighterType(uiSourceCode.highlighterType());this._sourceFramesByUISourceCode.put(uiSourceCode,sourceFrame);this._historyManager.trackSourceFrameCursorJumps(sourceFrame);return sourceFrame;},_getOrCreateSourceFrame:function(uiSourceCode)
{return this._sourceFramesByUISourceCode.get(uiSourceCode)||this._createSourceFrame(uiSourceCode);},_sourceFrameMatchesUISourceCode:function(sourceFrame,uiSourceCode)
{switch(uiSourceCode.contentType()){case WebInspector.resourceTypes.Script:case WebInspector.resourceTypes.Document:return sourceFrame instanceof WebInspector.JavaScriptSourceFrame;case WebInspector.resourceTypes.Stylesheet:return sourceFrame instanceof WebInspector.CSSSourceFrame;default:return!(sourceFrame instanceof WebInspector.JavaScriptSourceFrame);}},_recreateSourceFrameIfNeeded:function(uiSourceCode)
{var oldSourceFrame=this._sourceFramesByUISourceCode.get(uiSourceCode);if(!oldSourceFrame)
return;if(this._sourceFrameMatchesUISourceCode(oldSourceFrame,uiSourceCode)){oldSourceFrame.setHighlighterType(uiSourceCode.highlighterType());}else{this._editorContainer.removeUISourceCode(uiSourceCode);this._removeSourceFrame(uiSourceCode);}},viewForFile:function(uiSourceCode)
{return this._getOrCreateSourceFrame(uiSourceCode);},_removeSourceFrame:function(uiSourceCode)
{var sourceFrame=this._sourceFramesByUISourceCode.get(uiSourceCode);if(!sourceFrame)
return;this._sourceFramesByUISourceCode.remove(uiSourceCode);sourceFrame.dispose();},clearCurrentExecutionLine:function()
{if(this._executionSourceFrame)
this._executionSourceFrame.clearExecutionLine();delete this._executionSourceFrame;},setExecutionLine:function(uiLocation)
{var sourceFrame=this._getOrCreateSourceFrame(uiLocation.uiSourceCode);sourceFrame.setExecutionLine(uiLocation.lineNumber);this._executionSourceFrame=sourceFrame;},_editorClosed:function(event)
{var uiSourceCode=(event.data);this._historyManager.removeHistoryForSourceCode(uiSourceCode);var wasSelected=false;if(this._currentUISourceCode===uiSourceCode){delete this._currentUISourceCode;wasSelected=true;}
this._updateScriptViewStatusBarItems();this._searchableView.resetSearch();var data={};data.uiSourceCode=uiSourceCode;data.wasSelected=wasSelected;this.dispatchEventToListeners(WebInspector.SourcesView.Events.EditorClosed,data);},_editorSelected:function(event)
{var uiSourceCode=(event.data.currentFile);var shouldUseHistoryManager=uiSourceCode!==this._currentUISourceCode&&event.data.userGesture;if(shouldUseHistoryManager)
this._historyManager.updateCurrentState();var sourceFrame=this._showFile(uiSourceCode);if(shouldUseHistoryManager)
this._historyManager.pushNewState();this._searchableView.setReplaceable(!!sourceFrame&&sourceFrame.canEditSource());this._searchableView.resetSearch();this.dispatchEventToListeners(WebInspector.SourcesView.Events.EditorSelected,uiSourceCode);},sourceRenamed:function(uiSourceCode)
{this._recreateSourceFrameIfNeeded(uiSourceCode);},searchCanceled:function()
{if(this._searchView)
this._searchView.searchCanceled();delete this._searchView;delete this._searchQuery;},performSearch:function(query,shouldJump,jumpBackwards)
{this._searchableView.updateSearchMatchesCount(0);var sourceFrame=this.currentSourceFrame();if(!sourceFrame)
return;this._searchView=sourceFrame;this._searchQuery=query;function finishedCallback(view,searchMatches)
{if(!searchMatches)
return;this._searchableView.updateSearchMatchesCount(searchMatches);}
function currentMatchChanged(currentMatchIndex)
{this._searchableView.updateCurrentMatchIndex(currentMatchIndex);}
function searchResultsChanged()
{this._searchableView.cancelSearch();}
this._searchView.performSearch(query,shouldJump,!!jumpBackwards,finishedCallback.bind(this),currentMatchChanged.bind(this),searchResultsChanged.bind(this));},jumpToNextSearchResult:function()
{if(!this._searchView)
return;if(this._searchView!==this.currentSourceFrame()){this.performSearch(this._searchQuery,true);return;}
this._searchView.jumpToNextSearchResult();},jumpToPreviousSearchResult:function()
{if(!this._searchView)
return;if(this._searchView!==this.currentSourceFrame()){this.performSearch(this._searchQuery,true);if(this._searchView)
this._searchView.jumpToLastSearchResult();return;}
this._searchView.jumpToPreviousSearchResult();},replaceSelectionWith:function(text)
{var sourceFrame=this.currentSourceFrame();if(!sourceFrame){console.assert(sourceFrame);return;}
sourceFrame.replaceSelectionWith(text);},replaceAllWith:function(query,text)
{var sourceFrame=this.currentSourceFrame();if(!sourceFrame){console.assert(sourceFrame);return;}
sourceFrame.replaceAllWith(query,text);},_showOutlineDialog:function(event)
{var uiSourceCode=this._editorContainer.currentFile();if(!uiSourceCode)
return false;switch(uiSourceCode.contentType()){case WebInspector.resourceTypes.Document:case WebInspector.resourceTypes.Script:WebInspector.JavaScriptOutlineDialog.show(this,uiSourceCode,this.showSourceLocation.bind(this,uiSourceCode));return true;case WebInspector.resourceTypes.Stylesheet:WebInspector.StyleSheetOutlineDialog.show(this,uiSourceCode,this.showSourceLocation.bind(this,uiSourceCode));return true;}
return false;},showOpenResourceDialog:function(query)
{var uiSourceCodes=this._editorContainer.historyUISourceCodes();var defaultScores=new Map();for(var i=1;i<uiSourceCodes.length;++i)
defaultScores.put(uiSourceCodes[i],uiSourceCodes.length-i);WebInspector.OpenResourceDialog.show(this,this.element,query,defaultScores);},_showGoToLineDialog:function(event)
{if(this._currentUISourceCode)
this.showOpenResourceDialog(":");return true;},_save:function()
{this._saveSourceFrame(this.currentSourceFrame());return true;},_saveAll:function()
{var sourceFrames=this._editorContainer.fileViews();sourceFrames.forEach(this._saveSourceFrame.bind(this));return true;},_saveSourceFrame:function(sourceFrame)
{if(!sourceFrame)
return;if(!(sourceFrame instanceof WebInspector.UISourceCodeFrame))
return;var uiSourceCodeFrame=(sourceFrame);uiSourceCodeFrame.commitEditing();},_toggleBreakpoint:function()
{var sourceFrame=this.currentSourceFrame();if(!sourceFrame)
return false;if(sourceFrame instanceof WebInspector.JavaScriptSourceFrame){var javaScriptSourceFrame=(sourceFrame);javaScriptSourceFrame.toggleBreakpointOnCurrentLine();return true;}
return false;},toggleBreakpointsActiveState:function(active)
{this._editorContainer.view.element.classList.toggle("breakpoints-deactivated",!active);},__proto__:WebInspector.VBox.prototype}
WebInspector.SourcesView.EditorAction=function()
{}
WebInspector.SourcesView.EditorAction.prototype={button:function(sourcesView){}};WebInspector.SourcesPanel=function(workspaceForTest)
{WebInspector.Panel.call(this,"sources");this.registerRequiredCSS("sourcesPanel.css");this.registerRequiredCSS("suggestBox.css");new WebInspector.UpgradeFileSystemDropTarget(this.element);WebInspector.settings.showEditorInDrawer=WebInspector.settings.createSetting("showEditorInDrawer",true);this._workspace=workspaceForTest||WebInspector.workspace;var helpSection=WebInspector.shortcutsScreen.section(WebInspector.UIString("Sources Panel"));this.debugToolbar=this._createDebugToolbar();this._debugToolbarDrawer=this._createDebugToolbarDrawer();this.threadsToolbar=new WebInspector.ThreadsToolbar();const initialDebugSidebarWidth=225;this._splitView=new WebInspector.SplitView(true,true,"sourcesPanelSplitViewState",initialDebugSidebarWidth);this._splitView.enableShowModeSaving();this._splitView.show(this.element);const initialNavigatorWidth=225;this.editorView=new WebInspector.SplitView(true,false,"sourcesPanelNavigatorSplitViewState",initialNavigatorWidth);this.editorView.enableShowModeSaving();this.editorView.element.id="scripts-editor-split-view";this.editorView.element.tabIndex=0;this.editorView.show(this._splitView.mainElement());this._navigator=new WebInspector.SourcesNavigator(this._workspace);this._navigator.view.setMinimumSize(100,25);this._navigator.view.show(this.editorView.sidebarElement());this._navigator.addEventListener(WebInspector.SourcesNavigator.Events.SourceSelected,this._sourceSelected,this);this._navigator.addEventListener(WebInspector.SourcesNavigator.Events.SourceRenamed,this._sourceRenamed,this);this._sourcesView=new WebInspector.SourcesView(this._workspace,this);this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorClosed,this._editorClosed.bind(this));this._sourcesView.registerShortcuts(this.registerShortcuts.bind(this));if(WebInspector.experimentsSettings.editorInDrawer.isEnabled()){this._drawerEditorView=new WebInspector.SourcesPanel.DrawerEditorView();this._sourcesView.show(this._drawerEditorView.element);}else{this._sourcesView.show(this.editorView.mainElement());}
this._debugSidebarResizeWidgetElement=document.createElementWithClass("div","resizer-widget");this._debugSidebarResizeWidgetElement.id="scripts-debug-sidebar-resizer-widget";this._splitView.addEventListener(WebInspector.SplitView.Events.ShowModeChanged,this._updateDebugSidebarResizeWidget,this);this._updateDebugSidebarResizeWidget();this._splitView.installResizer(this._debugSidebarResizeWidgetElement);this.sidebarPanes={};this.sidebarPanes.watchExpressions=new WebInspector.WatchExpressionsSidebarPane();this.sidebarPanes.callstack=new WebInspector.CallStackSidebarPane();this.sidebarPanes.callstack.addEventListener(WebInspector.CallStackSidebarPane.Events.CallFrameSelected,this._callFrameSelectedInSidebar.bind(this));this.sidebarPanes.callstack.addEventListener(WebInspector.CallStackSidebarPane.Events.CallFrameRestarted,this._callFrameRestartedInSidebar.bind(this));this.sidebarPanes.callstack.registerShortcuts(this.registerShortcuts.bind(this));this.sidebarPanes.scopechain=new WebInspector.ScopeChainSidebarPane();this.sidebarPanes.jsBreakpoints=new WebInspector.JavaScriptBreakpointsSidebarPane(WebInspector.debuggerModel,WebInspector.breakpointManager,this.showUISourceCode.bind(this));this.sidebarPanes.domBreakpoints=WebInspector.domBreakpointsSidebarPane.createProxy(this);this.sidebarPanes.xhrBreakpoints=new WebInspector.XHRBreakpointsSidebarPane();this.sidebarPanes.eventListenerBreakpoints=new WebInspector.EventListenerBreakpointsSidebarPane();if(Capabilities.isMainFrontend)
this.sidebarPanes.workerList=new WebInspector.WorkersSidebarPane();this._extensionSidebarPanes=[];this._installDebuggerSidebarController();WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged,this._dockSideChanged.bind(this));WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));this._dockSideChanged();this._updateDebuggerButtons();this._pauseOnExceptionEnabledChanged();if(WebInspector.debuggerModel.isPaused())
this._showDebuggerPausedDetails(WebInspector.debuggerModel.debuggerPausedDetails());WebInspector.settings.pauseOnExceptionEnabled.addChangeListener(this._pauseOnExceptionEnabledChanged,this);WebInspector.targetManager.observeTargets(this);}
WebInspector.SourcesPanel.minToolbarWidth=215;WebInspector.SourcesPanel.prototype={targetAdded:function(target){target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerWasEnabled,this._debuggerWasEnabled,this);target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerWasDisabled,this._debuggerWasDisabled,this);target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused,this._debuggerPaused,this);target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerResumed,this._debuggerResumed,this);target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.CallFrameSelected,this._callFrameSelected,this);target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.ConsoleCommandEvaluatedInSelectedCallFrame,this._consoleCommandEvaluatedInSelectedCallFrame,this);target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.BreakpointsActiveStateChanged,this._breakpointsActiveStateChanged,this);target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared,this._debuggerReset,this);},targetRemoved:function(target){target.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerWasEnabled,this._debuggerWasEnabled,this);target.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerWasDisabled,this._debuggerWasDisabled,this);target.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused,this._debuggerPaused,this);target.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerResumed,this._debuggerResumed,this);target.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.CallFrameSelected,this._callFrameSelected,this);target.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.ConsoleCommandEvaluatedInSelectedCallFrame,this._consoleCommandEvaluatedInSelectedCallFrame,this);target.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.BreakpointsActiveStateChanged,this._breakpointsActiveStateChanged,this);target.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared,this._debuggerReset,this);},defaultFocusedElement:function()
{return this._sourcesView.defaultFocusedElement()||this._navigator.view.defaultFocusedElement();},get paused()
{return this._paused;},_drawerEditor:function()
{var drawerEditorInstance=WebInspector.moduleManager.instance(WebInspector.DrawerEditor);console.assert(drawerEditorInstance instanceof WebInspector.SourcesPanel.DrawerEditor,"WebInspector.DrawerEditor module instance does not use WebInspector.SourcesPanel.DrawerEditor as an implementation. ");return(drawerEditorInstance);},wasShown:function()
{if(WebInspector.experimentsSettings.editorInDrawer.isEnabled()){this._drawerEditor()._panelWasShown();this._sourcesView.show(this.editorView.mainElement());}
WebInspector.Panel.prototype.wasShown.call(this);},willHide:function()
{WebInspector.Panel.prototype.willHide.call(this);if(WebInspector.experimentsSettings.editorInDrawer.isEnabled()){this._drawerEditor()._panelWillHide();this._sourcesView.show(this._drawerEditorView.element);}},searchableView:function()
{return this._sourcesView.searchableView();},_consoleCommandEvaluatedInSelectedCallFrame:function(event)
{this.sidebarPanes.scopechain.update(WebInspector.debuggerModel.selectedCallFrame());},_debuggerPaused:function(event)
{var details=(event.data);WebInspector.inspectorView.setCurrentPanel(this);this._showDebuggerPausedDetails(details);},_showDebuggerPausedDetails:function(details)
{this._paused=true;this._waitingToPause=false;this._updateDebuggerButtons();this.sidebarPanes.callstack.update(details);function didCreateBreakpointHitStatusMessage(element)
{this.sidebarPanes.callstack.setStatus(element);}
function didGetUILocation(uiLocation)
{var breakpoint=WebInspector.breakpointManager.findBreakpointOnLine(uiLocation.uiSourceCode,uiLocation.lineNumber);if(!breakpoint)
return;this.sidebarPanes.jsBreakpoints.highlightBreakpoint(breakpoint);this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a JavaScript breakpoint."));}
if(details.reason===WebInspector.DebuggerModel.BreakReason.DOM){WebInspector.domBreakpointsSidebarPane.highlightBreakpoint(details.auxData);WebInspector.domBreakpointsSidebarPane.createBreakpointHitStatusMessage(details,didCreateBreakpointHitStatusMessage.bind(this));}else if(details.reason===WebInspector.DebuggerModel.BreakReason.EventListener){var eventName=details.auxData.eventName;this.sidebarPanes.eventListenerBreakpoints.highlightBreakpoint(details.auxData.eventName);var eventNameForUI=WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName,details.auxData);this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a \"%s\" Event Listener.",eventNameForUI));}else if(details.reason===WebInspector.DebuggerModel.BreakReason.XHR){this.sidebarPanes.xhrBreakpoints.highlightBreakpoint(details.auxData["breakpointURL"]);this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a XMLHttpRequest."));}else if(details.reason===WebInspector.DebuggerModel.BreakReason.Exception)
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on exception: '%s'.",details.auxData.description));else if(details.reason===WebInspector.DebuggerModel.BreakReason.Assert)
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on assertion."));else if(details.reason===WebInspector.DebuggerModel.BreakReason.CSPViolation)
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a script blocked due to Content Security Policy directive: \"%s\".",details.auxData["directiveText"]));else if(details.reason===WebInspector.DebuggerModel.BreakReason.DebugCommand)
this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a debugged function"));else{if(details.callFrames.length)
details.callFrames[0].createLiveLocation(didGetUILocation.bind(this));else
console.warn("ScriptsPanel paused, but callFrames.length is zero.");}
this._splitView.showBoth(true);this._toggleDebuggerSidebarButton.setEnabled(false);window.focus();InspectorFrontendHost.bringToFront();},_debuggerResumed:function()
{this._paused=false;this._waitingToPause=false;this._clearInterface();this._toggleDebuggerSidebarButton.setEnabled(true);},_debuggerWasEnabled:function()
{this._updateDebuggerButtons();},_debuggerWasDisabled:function()
{this._debuggerReset();},_debuggerReset:function()
{this._debuggerResumed();this.sidebarPanes.watchExpressions.reset();delete this._skipExecutionLineRevealing;},get visibleView()
{return this._sourcesView.visibleView();},showUISourceCode:function(uiSourceCode,lineNumber,columnNumber,forceShowInPanel)
{this._showEditor(forceShowInPanel);this._sourcesView.showSourceLocation(uiSourceCode,lineNumber,columnNumber);},_showEditor:function(forceShowInPanel)
{if(this._sourcesView.isShowing())
return;if(this._shouldShowEditorInDrawer()&&!forceShowInPanel)
this._drawerEditor()._show();else
WebInspector.inspectorView.showPanel("sources");},showUILocation:function(uiLocation,forceShowInPanel)
{this.showUISourceCode(uiLocation.uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber,forceShowInPanel);},_shouldShowEditorInDrawer:function()
{return WebInspector.experimentsSettings.editorInDrawer.isEnabled()&&WebInspector.settings.showEditorInDrawer.get()&&WebInspector.inspectorView.isDrawerEditorShown();},_revealInNavigator:function(uiSourceCode)
{this._navigator.revealUISourceCode(uiSourceCode);},_executionLineChanged:function(uiLocation)
{this._sourcesView.clearCurrentExecutionLine();this._sourcesView.setExecutionLine(uiLocation);if(this._skipExecutionLineRevealing)
return;this._skipExecutionLineRevealing=true;this._sourcesView.showSourceLocation(uiLocation.uiSourceCode,uiLocation.lineNumber,0,undefined,true);},_callFrameSelected:function(event)
{var callFrame=event.data;if(!callFrame)
return;this.sidebarPanes.scopechain.update(callFrame);this.sidebarPanes.watchExpressions.refreshExpressions();this.sidebarPanes.callstack.setSelectedCallFrame(callFrame);callFrame.createLiveLocation(this._executionLineChanged.bind(this));},_sourceSelected:function(event)
{var uiSourceCode=(event.data.uiSourceCode);this._sourcesView.showSourceLocation(uiSourceCode,undefined,undefined,!event.data.focusSource)},_sourceRenamed:function(event)
{var uiSourceCode=(event.data);this._sourcesView.sourceRenamed(uiSourceCode);},_pauseOnExceptionEnabledChanged:function()
{var enabled=WebInspector.settings.pauseOnExceptionEnabled.get();this._pauseOnExceptionButton.toggled=enabled;this._pauseOnExceptionButton.title=WebInspector.UIString(enabled?"Don't pause on exceptions.":"Pause on exceptions.");this._debugToolbarDrawer.classList.toggle("expanded",enabled);},_updateDebuggerButtons:function()
{if(this._paused){this._updateButtonTitle(this._pauseButton,WebInspector.UIString("Resume script execution (%s)."))
this._pauseButton.state=true;this._pauseButton.setLongClickOptionsEnabled((function(){return[this._longResumeButton]}).bind(this));this._pauseButton.setEnabled(true);this._stepOverButton.setEnabled(true);this._stepIntoButton.setEnabled(true);this._stepOutButton.setEnabled(true);}else{this._updateButtonTitle(this._pauseButton,WebInspector.UIString("Pause script execution (%s)."))
this._pauseButton.state=false;this._pauseButton.setLongClickOptionsEnabled(null);this._pauseButton.setEnabled(!this._waitingToPause);this._stepOverButton.setEnabled(false);this._stepIntoButton.setEnabled(false);this._stepOutButton.setEnabled(false);}},_clearInterface:function()
{this.sidebarPanes.callstack.update(null);this.sidebarPanes.scopechain.update(null);this.sidebarPanes.jsBreakpoints.clearBreakpointHighlight();WebInspector.domBreakpointsSidebarPane.clearBreakpointHighlight();this.sidebarPanes.eventListenerBreakpoints.clearBreakpointHighlight();this.sidebarPanes.xhrBreakpoints.clearBreakpointHighlight();this._sourcesView.clearCurrentExecutionLine();this._updateDebuggerButtons();},_togglePauseOnExceptions:function()
{WebInspector.settings.pauseOnExceptionEnabled.set(!this._pauseOnExceptionButton.toggled);},_runSnippet:function()
{var uiSourceCode=this._sourcesView.currentUISourceCode();if(uiSourceCode.project().type()!==WebInspector.projectTypes.Snippets)
return false;var currentExecutionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);if(!currentExecutionContext)
return false;WebInspector.scriptSnippetModel.evaluateScriptSnippet(currentExecutionContext,uiSourceCode);return true;},_editorSelected:function(event)
{var uiSourceCode=(event.data);this._editorChanged(uiSourceCode);},_editorClosed:function(event)
{var wasSelected=(event.data.wasSelected);if(wasSelected)
this._editorChanged(null);},_editorChanged:function(uiSourceCode)
{var isSnippet=uiSourceCode&&uiSourceCode.project().type()===WebInspector.projectTypes.Snippets;this._runSnippetButton.element.classList.toggle("hidden",!isSnippet);},togglePause:function()
{if(this._paused){delete this._skipExecutionLineRevealing;this._paused=false;this._waitingToPause=false;WebInspector.debuggerModel.resume();}else{this._waitingToPause=true;WebInspector.debuggerModel.skipAllPauses(false);DebuggerAgent.pause();}
this._clearInterface();return true;},_longResume:function()
{if(!this._paused)
return true;this._paused=false;this._waitingToPause=false;WebInspector.debuggerModel.skipAllPausesUntilReloadOrTimeout(500);WebInspector.debuggerModel.resume();this._clearInterface();return true;},_stepOverClicked:function()
{if(!this._paused)
return true;delete this._skipExecutionLineRevealing;this._paused=false;this._clearInterface();WebInspector.debuggerModel.stepOver();return true;},_stepIntoClicked:function()
{if(!this._paused)
return true;delete this._skipExecutionLineRevealing;this._paused=false;this._clearInterface();WebInspector.debuggerModel.stepInto();return true;},_stepOutClicked:function()
{if(!this._paused)
return true;delete this._skipExecutionLineRevealing;this._paused=false;this._clearInterface();WebInspector.debuggerModel.stepOut();return true;},_callFrameSelectedInSidebar:function(event)
{var callFrame=(event.data);delete this._skipExecutionLineRevealing;WebInspector.debuggerModel.setSelectedCallFrame(callFrame);},_callFrameRestartedInSidebar:function()
{delete this._skipExecutionLineRevealing;},continueToLocation:function(rawLocation)
{if(!this._paused)
return;delete this._skipExecutionLineRevealing;this._paused=false;this._clearInterface();rawLocation.continueToLocation();},_toggleBreakpointsClicked:function(event)
{WebInspector.debuggerModel.setBreakpointsActive(!WebInspector.debuggerModel.breakpointsActive());},_breakpointsActiveStateChanged:function(event)
{var active=event.data;this._toggleBreakpointsButton.toggled=!active;this.sidebarPanes.jsBreakpoints.listElement.classList.toggle("breakpoints-list-deactivated",!active);this._sourcesView.toggleBreakpointsActiveState(active);if(active)
this._toggleBreakpointsButton.title=WebInspector.UIString("Deactivate breakpoints.");else
this._toggleBreakpointsButton.title=WebInspector.UIString("Activate breakpoints.");},_createDebugToolbar:function()
{var debugToolbar=document.createElement("div");debugToolbar.className="scripts-debug-toolbar";var title,handler;var platformSpecificModifier=WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta;title=WebInspector.UIString("Run snippet (%s).");handler=this._runSnippet.bind(this);this._runSnippetButton=this._createButtonAndRegisterShortcuts("scripts-run-snippet",title,handler,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.RunSnippet);debugToolbar.appendChild(this._runSnippetButton.element);this._runSnippetButton.element.classList.add("hidden");handler=this.togglePause.bind(this);this._pauseButton=this._createButtonAndRegisterShortcuts("scripts-pause","",handler,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.PauseContinue);debugToolbar.appendChild(this._pauseButton.element);title=WebInspector.UIString("Resume with all pauses blocked for 500 ms");this._longResumeButton=new WebInspector.StatusBarButton(title,"scripts-long-resume");this._longResumeButton.addEventListener("click",this._longResume.bind(this),this);title=WebInspector.UIString("Step over next function call (%s).");handler=this._stepOverClicked.bind(this);this._stepOverButton=this._createButtonAndRegisterShortcuts("scripts-step-over",title,handler,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepOver);debugToolbar.appendChild(this._stepOverButton.element);title=WebInspector.UIString("Step into next function call (%s).");handler=this._stepIntoClicked.bind(this);this._stepIntoButton=this._createButtonAndRegisterShortcuts("scripts-step-into",title,handler,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepInto);debugToolbar.appendChild(this._stepIntoButton.element);title=WebInspector.UIString("Step out of current function (%s).");handler=this._stepOutClicked.bind(this);this._stepOutButton=this._createButtonAndRegisterShortcuts("scripts-step-out",title,handler,WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepOut);debugToolbar.appendChild(this._stepOutButton.element);this._toggleBreakpointsButton=new WebInspector.StatusBarButton(WebInspector.UIString("Deactivate breakpoints."),"scripts-toggle-breakpoints");this._toggleBreakpointsButton.toggled=false;this._toggleBreakpointsButton.addEventListener("click",this._toggleBreakpointsClicked,this);debugToolbar.appendChild(this._toggleBreakpointsButton.element);this._pauseOnExceptionButton=new WebInspector.StatusBarButton("","scripts-pause-on-exceptions-status-bar-item");this._pauseOnExceptionButton.addEventListener("click",this._togglePauseOnExceptions,this);debugToolbar.appendChild(this._pauseOnExceptionButton.element);return debugToolbar;},_createDebugToolbarDrawer:function()
{var debugToolbarDrawer=document.createElement("div");debugToolbarDrawer.className="scripts-debug-toolbar-drawer";var label=WebInspector.UIString("Pause On Caught Exceptions");var setting=WebInspector.settings.pauseOnCaughtException;debugToolbarDrawer.appendChild(WebInspector.SettingsUI.createSettingCheckbox(label,setting,true));return debugToolbarDrawer;},_updateButtonTitle:function(button,buttonTitle)
{var hasShortcuts=button.shortcuts&&button.shortcuts.length;if(hasShortcuts)
button.title=String.vsprintf(buttonTitle,[button.shortcuts[0].name]);else
button.title=buttonTitle;},_createButtonAndRegisterShortcuts:function(buttonId,buttonTitle,handler,shortcuts)
{var button=new WebInspector.StatusBarButton(buttonTitle,buttonId);button.element.addEventListener("click",handler,false);button.shortcuts=shortcuts;this._updateButtonTitle(button,buttonTitle);this.registerShortcuts(shortcuts,handler);return button;},addToWatch:function(expression)
{this.sidebarPanes.watchExpressions.addExpression(expression);},_installDebuggerSidebarController:function()
{this._toggleNavigatorSidebarButton=this.editorView.createShowHideSidebarButton("navigator","scripts-navigator-show-hide-button");this.editorView.mainElement().appendChild(this._toggleNavigatorSidebarButton.element);this._toggleDebuggerSidebarButton=this._splitView.createShowHideSidebarButton("debugger","scripts-debugger-show-hide-button");this._splitView.mainElement().appendChild(this._toggleDebuggerSidebarButton.element);this._splitView.mainElement().appendChild(this._debugSidebarResizeWidgetElement);},_updateDebugSidebarResizeWidget:function()
{this._debugSidebarResizeWidgetElement.classList.toggle("hidden",this._splitView.showMode()!==WebInspector.SplitView.ShowMode.Both);},_showLocalHistory:function(uiSourceCode)
{WebInspector.RevisionHistoryView.showHistory(uiSourceCode);},appendApplicableItems:function(event,contextMenu,target)
{this._appendUISourceCodeItems(event,contextMenu,target);this._appendRemoteObjectItems(contextMenu,target);},_suggestReload:function()
{if(window.confirm(WebInspector.UIString("It is recommended to restart inspector after making these changes. Would you like to restart it?")))
WebInspector.reload();},_mapFileSystemToNetwork:function(uiSourceCode)
{WebInspector.SelectUISourceCodeForProjectTypesDialog.show(uiSourceCode.name(),[WebInspector.projectTypes.Network,WebInspector.projectTypes.ContentScripts],mapFileSystemToNetwork.bind(this),this.editorView.mainElement())
function mapFileSystemToNetwork(networkUISourceCode)
{this._workspace.addMapping(networkUISourceCode,uiSourceCode,WebInspector.fileSystemWorkspaceBinding);this._suggestReload();}},_removeNetworkMapping:function(uiSourceCode)
{if(confirm(WebInspector.UIString("Are you sure you want to remove network mapping?"))){this._workspace.removeMapping(uiSourceCode);this._suggestReload();}},_mapNetworkToFileSystem:function(networkUISourceCode)
{WebInspector.SelectUISourceCodeForProjectTypesDialog.show(networkUISourceCode.name(),[WebInspector.projectTypes.FileSystem],mapNetworkToFileSystem.bind(this),this.editorView.mainElement())
function mapNetworkToFileSystem(uiSourceCode)
{this._workspace.addMapping(networkUISourceCode,uiSourceCode,WebInspector.fileSystemWorkspaceBinding);this._suggestReload();}},_appendUISourceCodeMappingItems:function(contextMenu,uiSourceCode)
{if(uiSourceCode.project().type()===WebInspector.projectTypes.FileSystem){var hasMappings=!!uiSourceCode.url;if(!hasMappings)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Map to network resource\u2026":"Map to Network Resource\u2026"),this._mapFileSystemToNetwork.bind(this,uiSourceCode));else
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Remove network mapping":"Remove Network Mapping"),this._removeNetworkMapping.bind(this,uiSourceCode));}
function filterProject(project)
{return project.type()===WebInspector.projectTypes.FileSystem;}
if(uiSourceCode.project().type()===WebInspector.projectTypes.Network||uiSourceCode.project().type()===WebInspector.projectTypes.ContentScripts){if(!this._workspace.projects().filter(filterProject).length)
return;if(this._workspace.uiSourceCodeForURL(uiSourceCode.url)===uiSourceCode)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Map to file system resource\u2026":"Map to File System Resource\u2026"),this._mapNetworkToFileSystem.bind(this,uiSourceCode));}},_appendUISourceCodeItems:function(event,contextMenu,target)
{if(!(target instanceof WebInspector.UISourceCode))
return;var uiSourceCode=(target);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Local modifications\u2026":"Local Modifications\u2026"),this._showLocalHistory.bind(this,uiSourceCode));this._appendUISourceCodeMappingItems(contextMenu,uiSourceCode);if(!event.target.isSelfOrDescendant(this.editorView.sidebarElement())){contextMenu.appendSeparator();contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Reveal in navigator":"Reveal in Navigator"),this._handleContextMenuReveal.bind(this,uiSourceCode));}},_handleContextMenuReveal:function(uiSourceCode)
{this.editorView.showBoth();this._revealInNavigator(uiSourceCode);},_appendRemoteObjectItems:function(contextMenu,target)
{if(!(target instanceof WebInspector.RemoteObject))
return;var remoteObject=(target);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Store as global variable":"Store as Global Variable"),this._saveToTempVariable.bind(this,remoteObject));if(remoteObject.type==="function")
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Show function definition":"Show Function Definition"),this._showFunctionDefinition.bind(this,remoteObject));},_saveToTempVariable:function(remoteObject)
{var currentExecutionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);if(!currentExecutionContext)
return;currentExecutionContext.evaluate("window","",false,true,false,false,didGetGlobalObject.bind(null,currentExecutionContext.target()));function didGetGlobalObject(target,global,wasThrown)
{function remoteFunction(value)
{var prefix="temp";var index=1;while((prefix+index)in this)
++index;var name=prefix+index;this[name]=value;return name;}
if(wasThrown||!global)
failedToSave(target,global);else
global.callFunction(remoteFunction,[WebInspector.RemoteObject.toCallArgument(remoteObject)],didSave.bind(null,global));}
function didSave(global,result,wasThrown)
{var currentExecutionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);global.release();if(!currentExecutionContext||wasThrown||!result||result.type!=="string")
failedToSave(global.target(),result);else
WebInspector.ConsoleModel.evaluateCommandInConsole(currentExecutionContext,result.value);}
function failedToSave(target,result)
{var message=WebInspector.UIString("Failed to save to temp variable.");if(result){message+=" "+result.description;result.release();}
target.consoleModel.showErrorMessage(message);}},_showFunctionDefinition:function(remoteObject)
{function didGetFunctionDetails(error,response)
{if(error){console.error(error);return;}
var uiLocation=WebInspector.debuggerModel.rawLocationToUILocation(response.location);if(!uiLocation)
return;this.showUILocation(uiLocation,true);}
DebuggerAgent.getFunctionDetails(remoteObject.objectId,didGetFunctionDetails.bind(this));},showGoToSourceDialog:function()
{this._sourcesView.showOpenResourceDialog();},_dockSideChanged:function()
{var vertically=WebInspector.dockController.isVertical()&&WebInspector.settings.splitVerticallyWhenDockedToRight.get();this._splitVertically(vertically);},_splitVertically:function(vertically)
{if(this.sidebarPaneView&&vertically===!this._splitView.isVertical())
return;if(this.sidebarPaneView)
this.sidebarPaneView.detach();this._splitView.setVertical(!vertically);if(!vertically)
this._splitView.uninstallResizer(this._sourcesView.statusBarContainerElement());else
this._splitView.installResizer(this._sourcesView.statusBarContainerElement());var vbox=new WebInspector.VBox();vbox.element.appendChild(this._debugToolbarDrawer);vbox.element.appendChild(this.debugToolbar);vbox.element.appendChild(this.threadsToolbar.element);vbox.setMinimumAndPreferredSizes(25,25,WebInspector.SourcesPanel.minToolbarWidth,100);var sidebarPaneStack=new WebInspector.SidebarPaneStack();sidebarPaneStack.element.classList.add("flex-auto");sidebarPaneStack.show(vbox.element);if(!vertically){for(var pane in this.sidebarPanes)
sidebarPaneStack.addPane(this.sidebarPanes[pane]);this._extensionSidebarPanesContainer=sidebarPaneStack;this.sidebarPaneView=vbox;}else{var splitView=new WebInspector.SplitView(true,true,"sourcesPanelDebuggerSidebarSplitViewState",0.5);vbox.show(splitView.mainElement());sidebarPaneStack.addPane(this.sidebarPanes.callstack);sidebarPaneStack.addPane(this.sidebarPanes.jsBreakpoints);sidebarPaneStack.addPane(this.sidebarPanes.domBreakpoints);sidebarPaneStack.addPane(this.sidebarPanes.xhrBreakpoints);sidebarPaneStack.addPane(this.sidebarPanes.eventListenerBreakpoints);if(this.sidebarPanes.workerList)
sidebarPaneStack.addPane(this.sidebarPanes.workerList);var tabbedPane=new WebInspector.SidebarTabbedPane();tabbedPane.show(splitView.sidebarElement());tabbedPane.addPane(this.sidebarPanes.scopechain);tabbedPane.addPane(this.sidebarPanes.watchExpressions);this._extensionSidebarPanesContainer=tabbedPane;this.sidebarPaneView=splitView;}
for(var i=0;i<this._extensionSidebarPanes.length;++i)
this._extensionSidebarPanesContainer.addPane(this._extensionSidebarPanes[i]);this.sidebarPaneView.show(this._splitView.sidebarElement());this.sidebarPanes.scopechain.expand();this.sidebarPanes.jsBreakpoints.expand();this.sidebarPanes.callstack.expand();if(WebInspector.settings.watchExpressions.get().length>0)
this.sidebarPanes.watchExpressions.expand();},addExtensionSidebarPane:function(id,pane)
{this._extensionSidebarPanes.push(pane);this._extensionSidebarPanesContainer.addPane(pane);this.setHideOnDetach();},sourcesView:function()
{return this._sourcesView;},__proto__:WebInspector.Panel.prototype}
WebInspector.UpgradeFileSystemDropTarget=function(element)
{element.addEventListener("dragenter",this._onDragEnter.bind(this),true);element.addEventListener("dragover",this._onDragOver.bind(this),true);this._element=element;}
WebInspector.UpgradeFileSystemDropTarget.dragAndDropFilesType="Files";WebInspector.UpgradeFileSystemDropTarget.prototype={_onDragEnter:function(event)
{if(event.dataTransfer.types.indexOf(WebInspector.UpgradeFileSystemDropTarget.dragAndDropFilesType)===-1)
return;event.consume(true);},_onDragOver:function(event)
{if(event.dataTransfer.types.indexOf(WebInspector.UpgradeFileSystemDropTarget.dragAndDropFilesType)===-1)
return;event.dataTransfer.dropEffect="copy";event.consume(true);if(this._dragMaskElement)
return;this._dragMaskElement=this._element.createChild("div","fill drag-mask");this._dragMaskElement.createChild("div","fill drag-mask-inner").textContent=WebInspector.UIString("Drop workspace folder here");this._dragMaskElement.addEventListener("drop",this._onDrop.bind(this),true);this._dragMaskElement.addEventListener("dragleave",this._onDragLeave.bind(this),true);},_onDrop:function(event)
{event.consume(true);this._removeMask();var items=(event.dataTransfer.items);if(!items.length)
return;var entry=items[0].webkitGetAsEntry();if(!entry.isDirectory)
return;InspectorFrontendHost.upgradeDraggedFileSystemPermissions(entry.filesystem);},_onDragLeave:function(event)
{event.consume(true);this._removeMask();},_removeMask:function()
{this._dragMaskElement.remove();delete this._dragMaskElement;}}
WebInspector.SourcesPanel.DrawerEditor=function()
{this._panel=WebInspector.inspectorView.panel("sources");}
WebInspector.SourcesPanel.DrawerEditor.prototype={view:function()
{return this._panel._drawerEditorView;},installedIntoDrawer:function()
{if(this._panel.isShowing())
this._panelWasShown();else
this._panelWillHide();},_panelWasShown:function()
{WebInspector.inspectorView.setDrawerEditorAvailable(false);WebInspector.inspectorView.hideDrawerEditor();},_panelWillHide:function()
{WebInspector.inspectorView.setDrawerEditorAvailable(true);if(WebInspector.inspectorView.isDrawerEditorShown())
WebInspector.inspectorView.showDrawerEditor();},_show:function()
{WebInspector.inspectorView.showDrawerEditor();},}
WebInspector.SourcesPanel.DrawerEditorView=function()
{WebInspector.VBox.call(this);this.element.id="drawer-editor-view";}
WebInspector.SourcesPanel.DrawerEditorView.prototype={__proto__:WebInspector.VBox.prototype}
WebInspector.SourcesPanel.ContextMenuProvider=function()
{}
WebInspector.SourcesPanel.ContextMenuProvider.prototype={appendApplicableItems:function(event,contextMenu,target)
{WebInspector.inspectorView.panel("sources").appendApplicableItems(event,contextMenu,target);}}
WebInspector.SourcesPanel.UILocationRevealer=function()
{}
WebInspector.SourcesPanel.UILocationRevealer.prototype={reveal:function(uiLocation)
{if(uiLocation instanceof WebInspector.UILocation)
(WebInspector.inspectorView.panel("sources")).showUILocation(uiLocation);}}
WebInspector.SourcesPanel.UISourceCodeRevealer=function()
{}
WebInspector.SourcesPanel.UISourceCodeRevealer.prototype={reveal:function(uiSourceCode)
{if(uiSourceCode instanceof WebInspector.UISourceCode)
(WebInspector.inspectorView.panel("sources")).showUISourceCode(uiSourceCode);}}
WebInspector.SourcesPanel.ShowGoToSourceDialogActionDelegate=function(){}
WebInspector.SourcesPanel.ShowGoToSourceDialogActionDelegate.prototype={handleAction:function()
{(WebInspector.inspectorView.showPanel("sources")).showGoToSourceDialog();return true;}}
WebInspector.SourcesPanel.SkipStackFramePatternSettingDelegate=function()
{WebInspector.UISettingDelegate.call(this);}
WebInspector.SourcesPanel.SkipStackFramePatternSettingDelegate.prototype={settingElement:function()
{return WebInspector.SettingsUI.createSettingInputField(WebInspector.UIString("Pattern"),WebInspector.settings.skipStackFramesPattern,false,1000,"100px",WebInspector.SettingsUI.regexValidator);},__proto__:WebInspector.UISettingDelegate.prototype}
WebInspector.SourcesPanel.DisableJavaScriptSettingDelegate=function()
{WebInspector.UISettingDelegate.call(this);}
WebInspector.SourcesPanel.DisableJavaScriptSettingDelegate.prototype={settingElement:function()
{var disableJSElement=WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Disable JavaScript"),WebInspector.settings.javaScriptDisabled);this._disableJSCheckbox=disableJSElement.getElementsByTagName("input")[0];WebInspector.settings.javaScriptDisabled.addChangeListener(this._settingChanged,this);var disableJSInfoParent=this._disableJSCheckbox.parentElement.createChild("span","monospace");this._disableJSInfo=disableJSInfoParent.createChild("span","object-info-state-note hidden");this._disableJSInfo.title=WebInspector.UIString("JavaScript is blocked on the inspected page (may be disabled in browser settings).");WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated,this._updateScriptDisabledCheckbox,this);this._updateScriptDisabledCheckbox();return disableJSElement;},_settingChanged:function(event)
{PageAgent.setScriptExecutionDisabled(event.data,this._updateScriptDisabledCheckbox.bind(this));},_updateScriptDisabledCheckbox:function()
{PageAgent.getScriptExecutionStatus(executionStatusCallback.bind(this));function executionStatusCallback(error,status)
{if(error||!status)
return;var forbidden=(status==="forbidden");var disabled=forbidden||(status==="disabled");this._disableJSInfo.classList.toggle("hidden",!forbidden);this._disableJSCheckbox.checked=disabled;this._disableJSCheckbox.disabled=forbidden;}},__proto__:WebInspector.UISettingDelegate.prototype}