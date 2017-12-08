Sources.AddSourceMapURLDialog=class extends UI.HBox{constructor(callback){super(true);this.registerRequiredCSS('sources/dialog.css');this.contentElement.createChild('label').textContent=Common.UIString('Source map URL: ');this._input=this.contentElement.createChild('input');this._input.setAttribute('type','text');this._input.addEventListener('keydown',this._onKeyDown.bind(this),false);var addButton=this.contentElement.createChild('button');addButton.textContent=Common.UIString('Add');addButton.addEventListener('click',this._apply.bind(this),false);this.setDefaultFocusedElement(this._input);this._callback=callback;this.contentElement.tabIndex=0;}
static show(callback){var dialog=new UI.Dialog();var addSourceMapURLDialog=new Sources.AddSourceMapURLDialog(done);addSourceMapURLDialog.show(dialog.contentElement);dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);dialog.show();function done(value){dialog.hide();callback(value);}}
_apply(){this._callback(this._input.value);}
_onKeyDown(event){if(event.keyCode===UI.KeyboardShortcut.Keys.Enter.code){event.preventDefault();this._apply();}}};;Sources.CallStackSidebarPane=class extends UI.SimpleView{constructor(){super(Common.UIString('Call Stack'),true);this.registerRequiredCSS('sources/callStackSidebarPane.css');this._blackboxedMessageElement=this._createBlackboxedMessageElement();this.contentElement.appendChild(this._blackboxedMessageElement);this._notPausedMessageElement=this.contentElement.createChild('div','gray-info-message');this._notPausedMessageElement.textContent=Common.UIString('Not Paused');this._list=new UI.ListControl(this,UI.ListMode.NonViewport);this.contentElement.appendChild(this._list.element);this._list.element.addEventListener('contextmenu',this._onContextMenu.bind(this),false);this._list.element.addEventListener('click',this._onClick.bind(this),false);this._showBlackboxed=false;Bindings.blackboxManager.addChangeListener(this._update.bind(this));this._locationPool=new Bindings.LiveLocationPool();this._update();}
flavorChanged(object){this._showBlackboxed=false;this._update();}
_update(){this._locationPool.disposeAll();var details=UI.context.flavor(SDK.DebuggerPausedDetails);if(!details){this._notPausedMessageElement.classList.remove('hidden');this._blackboxedMessageElement.classList.add('hidden');this._list.replaceAllItems([]);this._debuggerModel=null;UI.context.setFlavor(SDK.DebuggerModel.CallFrame,null);return;}
this._debuggerModel=details.debuggerModel;this._notPausedMessageElement.classList.add('hidden');var showBlackboxed=this._showBlackboxed||details.callFrames.every(frame=>Bindings.blackboxManager.isBlackboxedRawLocation(frame.location()));var hiddenCallFramesCount=0;var items=details.callFrames.map(frame=>({debuggerCallFrame:frame}));if(!showBlackboxed){items=items.filter(item=>!Bindings.blackboxManager.isBlackboxedRawLocation((this._itemLocation(item))));hiddenCallFramesCount+=details.callFrames.length-items.length;}
var asyncStackTrace=details.asyncStackTrace;var peviousStackTrace=details.callFrames;while(asyncStackTrace){var title='';var isAwait=asyncStackTrace.description==='async function';if(isAwait&&peviousStackTrace.length&&asyncStackTrace.callFrames.length){var lastPreviousFrame=peviousStackTrace[peviousStackTrace.length-1];var topFrame=asyncStackTrace.callFrames[0];var lastPreviousFrameName=UI.beautifyFunctionName(lastPreviousFrame.functionName);var topFrameName=UI.beautifyFunctionName(topFrame.functionName);title=topFrameName+' awaits '+lastPreviousFrameName;}else{title=UI.asyncStackTraceLabel(asyncStackTrace.description);}
var asyncItems=asyncStackTrace.callFrames.map(frame=>({runtimeCallFrame:frame}));if(!showBlackboxed){asyncItems=asyncItems.filter(item=>!Bindings.blackboxManager.isBlackboxedRawLocation((this._itemLocation(item))));hiddenCallFramesCount+=asyncStackTrace.callFrames.length-asyncItems.length;}
if(asyncStackTrace.promiseCreationFrame&&!isAwait){var chainedItem={promiseCreationFrame:asyncStackTrace.promiseCreationFrame};if(!Bindings.blackboxManager.isBlackboxedRawLocation((this._itemLocation(chainedItem))))
items.push(chainedItem);}
if(asyncItems.length){items.push({asyncStackHeader:title});items=items.concat(asyncItems);}
peviousStackTrace=asyncStackTrace.callFrames;asyncStackTrace=asyncStackTrace.parent;}
if(!hiddenCallFramesCount){this._blackboxedMessageElement.classList.add('hidden');}else{if(hiddenCallFramesCount===1){this._blackboxedMessageElement.firstChild.textContent=Common.UIString('1 stack frame is hidden (black-boxed).');}else{this._blackboxedMessageElement.firstChild.textContent=Common.UIString('%d stack frames are hidden (black-boxed).',hiddenCallFramesCount);}
this._blackboxedMessageElement.classList.remove('hidden');}
this._list.replaceAllItems(items);this._list.selectNextItem(true,false);}
createElementForItem(item){var element=createElementWithClass('div','call-frame-item');var title=element.createChild('div','call-frame-item-title');if(item.promiseCreationFrame)
title.createChild('div','call-frame-chained-arrow').textContent='\u2935';title.createChild('div','call-frame-title-text').textContent=this._itemTitle(item);if(item.asyncStackHeader)
element.classList.add('async-header');var location=this._itemLocation(item);if(location){if(Bindings.blackboxManager.isBlackboxedRawLocation(location))
element.classList.add('blackboxed-call-frame');function updateLocation(liveLocation){var uiLocation=liveLocation.uiLocation();if(!uiLocation)
return;var text=uiLocation.linkText();linkElement.textContent=text.trimMiddle(30);linkElement.title=text;}
var linkElement=element.createChild('div','call-frame-location');Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(location,updateLocation,this._locationPool);}
element.appendChild(UI.Icon.create('smallicon-thick-right-arrow','selected-call-frame-icon'));return element;}
heightForItem(item){console.assert(false);return 0;}
isItemSelectable(item){return!!item.debuggerCallFrame;}
selectedItemChanged(from,to,fromElement,toElement){if(fromElement)
fromElement.classList.remove('selected');if(toElement)
toElement.classList.add('selected');if(to)
this._activateItem(to);}
_itemTitle(item){if(item.debuggerCallFrame)
return UI.beautifyFunctionName(item.debuggerCallFrame.functionName);if(item.runtimeCallFrame)
return UI.beautifyFunctionName(item.runtimeCallFrame.functionName);if(item.promiseCreationFrame)
return Common.UIString('chained at');return item.asyncStackHeader||'';}
_itemLocation(item){if(item.debuggerCallFrame)
return item.debuggerCallFrame.location();if(item.runtimeCallFrame||item.promiseCreationFrame){var frame=item.runtimeCallFrame||item.promiseCreationFrame;return new SDK.DebuggerModel.Location(this._debuggerModel,frame.scriptId,frame.lineNumber,frame.columnNumber);}
return null;}
_createBlackboxedMessageElement(){var element=createElementWithClass('div','blackboxed-message');element.createChild('span');var showAllLink=element.createChild('span','link');showAllLink.textContent=Common.UIString('Show');showAllLink.addEventListener('click',()=>{this._showBlackboxed=true;this._update();},false);return element;}
_onContextMenu(event){var item=this._list.itemForNode((event.target));if(!item)
return;var contextMenu=new UI.ContextMenu(event);if(item.debuggerCallFrame)
contextMenu.appendItem(Common.UIString.capitalize('Restart ^frame'),()=>item.debuggerCallFrame.restart());contextMenu.appendItem(Common.UIString.capitalize('Copy ^stack ^trace'),this._copyStackTrace.bind(this));var location=this._itemLocation(item);if(location){var uiLocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);this.appendBlackboxURLContextMenuItems(contextMenu,uiLocation.uiSourceCode);}
contextMenu.show();}
_onClick(event){var item=this._list.itemForNode((event.target));if(item)
this._activateItem(item);}
_activateItem(item){var location=this._itemLocation(item);if(!location)
return;if(item.debuggerCallFrame&&UI.context.flavor(SDK.DebuggerModel.CallFrame)!==item.debuggerCallFrame){UI.context.setFlavor(SDK.DebuggerModel.CallFrame,item.debuggerCallFrame);this._debuggerModel.setSelectedCallFrame(item.debuggerCallFrame);}else{Common.Revealer.reveal(Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location));}}
appendBlackboxURLContextMenuItems(contextMenu,uiSourceCode){var binding=Persistence.persistence.binding(uiSourceCode);if(binding)
uiSourceCode=binding.network;if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem)
return;var canBlackbox=Bindings.blackboxManager.canBlackboxUISourceCode(uiSourceCode);var isBlackboxed=Bindings.blackboxManager.isBlackboxedUISourceCode(uiSourceCode);var isContentScript=uiSourceCode.project().type()===Workspace.projectTypes.ContentScripts;var manager=Bindings.blackboxManager;if(canBlackbox){if(isBlackboxed){contextMenu.appendItem(Common.UIString.capitalize('Stop ^blackboxing'),manager.unblackboxUISourceCode.bind(manager,uiSourceCode));}else{contextMenu.appendItem(Common.UIString.capitalize('Blackbox ^script'),manager.blackboxUISourceCode.bind(manager,uiSourceCode));}}
if(isContentScript){if(isBlackboxed){contextMenu.appendItem(Common.UIString.capitalize('Stop blackboxing ^all ^content ^scripts'),manager.blackboxContentScripts.bind(manager));}else{contextMenu.appendItem(Common.UIString.capitalize('Blackbox ^all ^content ^scripts'),manager.unblackboxContentScripts.bind(manager));}}}
_selectNextCallFrameOnStack(){return this._list.selectNextItem(false,false);}
_selectPreviousCallFrameOnStack(){return this._list.selectPreviousItem(false,false);}
_copyStackTrace(){var text=[];for(var i=0;i<this._list.length();i++){var item=this._list.itemAtIndex(i);if(item.promiseCreationFrame)
continue;var itemText=this._itemTitle(item);var location=this._itemLocation(item);if(location){var uiLocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);itemText+=' ('+uiLocation.linkText()+')';}
text.push(itemText);}
InspectorFrontendHost.copyText(text.join('\n'));}
registerShortcuts(registerShortcutDelegate){registerShortcutDelegate(UI.ShortcutsScreen.SourcesPanelShortcuts.NextCallFrame,this._selectNextCallFrameOnStack.bind(this));registerShortcutDelegate(UI.ShortcutsScreen.SourcesPanelShortcuts.PrevCallFrame,this._selectPreviousCallFrameOnStack.bind(this));}};Sources.CallStackSidebarPane.Item;;Sources.DebuggerPausedMessage=class{constructor(){this._element=createElementWithClass('div','paused-message flex-none');var root=UI.createShadowRootWithCoreStyles(this._element,'sources/debuggerPausedMessage.css');this._contentElement=root.createChild('div','paused-status');}
element(){return this._element;}
render(details,debuggerWorkspaceBinding,breakpointManager){var status=this._contentElement;status.hidden=!details;status.removeChildren();if(!details)
return;var errorLike=details.reason===SDK.DebuggerModel.BreakReason.Exception||details.reason===SDK.DebuggerModel.BreakReason.PromiseRejection||details.reason===SDK.DebuggerModel.BreakReason.Assert||details.reason===SDK.DebuggerModel.BreakReason.OOM;var messageWrapper;if(details.reason===SDK.DebuggerModel.BreakReason.DOM){messageWrapper=Components.DOMBreakpointsSidebarPane.createBreakpointHitMessage(details);}else if(details.reason===SDK.DebuggerModel.BreakReason.EventListener){var eventName=details.auxData['eventName'];var eventNameForUI=Sources.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName,details.auxData);messageWrapper=buildWrapper(Common.UIString('Paused on event listener'),eventNameForUI);}else if(details.reason===SDK.DebuggerModel.BreakReason.XHR){messageWrapper=buildWrapper(Common.UIString('Paused on XMLHttpRequest'),details.auxData['url']||'');}else if(details.reason===SDK.DebuggerModel.BreakReason.Exception){var description=details.auxData['description']||details.auxData['value']||'';var descriptionFirstLine=description.split('\n',1)[0];messageWrapper=buildWrapper(Common.UIString('Paused on exception'),descriptionFirstLine,description);}else if(details.reason===SDK.DebuggerModel.BreakReason.PromiseRejection){var description=details.auxData['description']||details.auxData['value']||'';var descriptionFirstLine=description.split('\n',1)[0];messageWrapper=buildWrapper(Common.UIString('Paused on promise rejection'),descriptionFirstLine,description);}else if(details.reason===SDK.DebuggerModel.BreakReason.Assert){messageWrapper=buildWrapper(Common.UIString('Paused on assertion'));}else if(details.reason===SDK.DebuggerModel.BreakReason.DebugCommand){messageWrapper=buildWrapper(Common.UIString('Paused on debugged function'));}else if(details.reason===SDK.DebuggerModel.BreakReason.OOM){messageWrapper=buildWrapper(Common.UIString('Paused before potential out-of-memory crash'));}else if(details.callFrames.length){var uiLocation=debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location());var breakpoint=uiLocation?breakpointManager.findBreakpoint(uiLocation.uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber):null;var defaultText=breakpoint?Common.UIString('Paused on breakpoint'):Common.UIString('Debugger paused');messageWrapper=buildWrapper(defaultText);}else{console.warn('ScriptsPanel paused, but callFrames.length is zero.');}
status.classList.toggle('error-reason',errorLike);if(messageWrapper)
status.appendChild(messageWrapper);function buildWrapper(mainText,subText,title){var messageWrapper=createElement('span');var mainElement=messageWrapper.createChild('div','status-main');var icon=UI.Icon.create(errorLike?'smallicon-error':'smallicon-info','status-icon');mainElement.appendChild(icon);mainElement.appendChild(createTextNode(mainText));if(subText){var subElement=messageWrapper.createChild('div','status-sub monospace');subElement.textContent=subText;}
var tooltip=title||subText;if(tooltip)
messageWrapper.title=tooltip;return messageWrapper;}}};;Sources.HistoryEntry=function(){};Sources.HistoryEntry.prototype={valid(){},reveal(){}};Sources.SimpleHistoryManager=class{constructor(historyDepth){this._entries=[];this._activeEntryIndex=-1;this._coalescingReadonly=0;this._historyDepth=historyDepth;}
readOnlyLock(){++this._coalescingReadonly;}
releaseReadOnlyLock(){--this._coalescingReadonly;}
readOnly(){return!!this._coalescingReadonly;}
filterOut(filterOutCallback){if(this.readOnly())
return;var filteredEntries=[];var removedBeforeActiveEntry=0;for(var i=0;i<this._entries.length;++i){if(!filterOutCallback(this._entries[i]))
filteredEntries.push(this._entries[i]);else if(i<=this._activeEntryIndex)
++removedBeforeActiveEntry;}
this._entries=filteredEntries;this._activeEntryIndex=Math.max(0,this._activeEntryIndex-removedBeforeActiveEntry);}
empty(){return!this._entries.length;}
active(){return this.empty()?null:this._entries[this._activeEntryIndex];}
push(entry){if(this.readOnly())
return;if(!this.empty())
this._entries.splice(this._activeEntryIndex+1);this._entries.push(entry);if(this._entries.length>this._historyDepth)
this._entries.shift();this._activeEntryIndex=this._entries.length-1;}
rollback(){if(this.empty())
return false;var revealIndex=this._activeEntryIndex-1;while(revealIndex>=0&&!this._entries[revealIndex].valid())
--revealIndex;if(revealIndex<0)
return false;this.readOnlyLock();this._entries[revealIndex].reveal();this.releaseReadOnlyLock();this._activeEntryIndex=revealIndex;return true;}
rollover(){var revealIndex=this._activeEntryIndex+1;while(revealIndex<this._entries.length&&!this._entries[revealIndex].valid())
++revealIndex;if(revealIndex>=this._entries.length)
return false;this.readOnlyLock();this._entries[revealIndex].reveal();this.releaseReadOnlyLock();this._activeEntryIndex=revealIndex;return true;}};;Sources.EditingLocationHistoryManager=class{constructor(sourcesView,currentSourceFrameCallback){this._sourcesView=sourcesView;this._historyManager=new Sources.SimpleHistoryManager(Sources.EditingLocationHistoryManager.HistoryDepth);this._currentSourceFrameCallback=currentSourceFrameCallback;}
trackSourceFrameCursorJumps(sourceFrame){sourceFrame.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.JumpHappened,this._onJumpHappened.bind(this));}
_onJumpHappened(event){if(event.data.from)
this._updateActiveState(event.data.from);if(event.data.to)
this._pushActiveState(event.data.to);}
rollback(){this._historyManager.rollback();}
rollover(){this._historyManager.rollover();}
updateCurrentState(){var sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;this._updateActiveState(sourceFrame.textEditor.selection());}
pushNewState(){var sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;this._pushActiveState(sourceFrame.textEditor.selection());}
_updateActiveState(selection){var active=this._historyManager.active();if(!active)
return;var sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;var entry=new Sources.EditingLocationHistoryEntry(this._sourcesView,this,sourceFrame,selection);active.merge(entry);}
_pushActiveState(selection){var sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;var entry=new Sources.EditingLocationHistoryEntry(this._sourcesView,this,sourceFrame,selection);this._historyManager.push(entry);}
removeHistoryForSourceCode(uiSourceCode){function filterOut(entry){return entry._projectId===uiSourceCode.project().id()&&entry._url===uiSourceCode.url();}
this._historyManager.filterOut(filterOut);}};Sources.EditingLocationHistoryManager.HistoryDepth=20;Sources.EditingLocationHistoryEntry=class{constructor(sourcesView,editingLocationManager,sourceFrame,selection){this._sourcesView=sourcesView;this._editingLocationManager=editingLocationManager;var uiSourceCode=sourceFrame.uiSourceCode();this._projectId=uiSourceCode.project().id();this._url=uiSourceCode.url();var position=this._positionFromSelection(selection);this._positionHandle=sourceFrame.textEditor.textEditorPositionHandle(position.lineNumber,position.columnNumber);}
merge(entry){if(this._projectId!==entry._projectId||this._url!==entry._url)
return;this._positionHandle=entry._positionHandle;}
_positionFromSelection(selection){return{lineNumber:selection.endLine,columnNumber:selection.endColumn};}
valid(){var position=this._positionHandle.resolve();var uiSourceCode=Workspace.workspace.uiSourceCode(this._projectId,this._url);return!!(position&&uiSourceCode);}
reveal(){var position=this._positionHandle.resolve();var uiSourceCode=Workspace.workspace.uiSourceCode(this._projectId,this._url);if(!position||!uiSourceCode)
return;this._editingLocationManager.updateCurrentState();this._sourcesView.showSourceLocation(uiSourceCode,position.lineNumber,position.columnNumber);}};;Sources.EventListenerBreakpointsSidebarPane=class extends UI.VBox{constructor(){super();this.registerRequiredCSS('components/breakpointsList.css');this._eventListenerBreakpointsSetting=Common.settings.createLocalSetting('eventListenerBreakpoints',[]);this._categoriesTreeOutline=new UI.TreeOutlineInShadow();this._categoriesTreeOutline.element.tabIndex=0;this._categoriesTreeOutline.element.classList.add('event-listener-breakpoints');this._categoriesTreeOutline.registerRequiredCSS('sources/eventListenerBreakpoints.css');this.element.appendChild(this._categoriesTreeOutline.element);this._categoryItems=[];this._createCategory(Common.UIString('Animation'),['requestAnimationFrame','cancelAnimationFrame','animationFrameFired'],true);this._createCategory(Common.UIString('Canvas'),['canvasContextCreated','webglErrorFired','webglWarningFired'],true);this._createCategory(Common.UIString('Clipboard'),['copy','cut','paste','beforecopy','beforecut','beforepaste']);this._createCategory(Common.UIString('Control'),['resize','scroll','zoom','focus','blur','select','change','submit','reset']);this._createCategory(Common.UIString('Device'),['deviceorientation','devicemotion']);this._createCategory(Common.UIString('DOM Mutation'),['DOMActivate','DOMFocusIn','DOMFocusOut','DOMAttrModified','DOMCharacterDataModified','DOMNodeInserted','DOMNodeInsertedIntoDocument','DOMNodeRemoved','DOMNodeRemovedFromDocument','DOMSubtreeModified','DOMContentLoaded']);this._createCategory(Common.UIString('Geolocation'),['Geolocation.getCurrentPosition','Geolocation.watchPosition'],true);this._createCategory(Common.UIString('Drag / drop'),['dragenter','dragover','dragleave','drop']);this._createCategory(Common.UIString('Keyboard'),['keydown','keyup','keypress','input']);this._createCategory(Common.UIString('Load'),['load','beforeunload','unload','abort','error','hashchange','popstate']);this._createCategory(Common.UIString('Media'),['play','pause','playing','canplay','canplaythrough','seeking','seeked','timeupdate','ended','ratechange','durationchange','volumechange','loadstart','progress','suspend','abort','error','emptied','stalled','loadedmetadata','loadeddata','waiting'],false,['audio','video']);this._createCategory(Common.UIString('Mouse'),['auxclick','click','dblclick','mousedown','mouseup','mouseover','mousemove','mouseout','mouseenter','mouseleave','mousewheel','wheel','contextmenu']);this._createCategory(Common.UIString('Notification'),['Notification.requestPermission'],true);this._createCategory(Common.UIString('Parse'),['setInnerHTML','Document.write'],true);this._createCategory(Common.UIString('Pointer'),['pointerover','pointerout','pointerenter','pointerleave','pointerdown','pointerup','pointermove','pointercancel','gotpointercapture','lostpointercapture']);this._createCategory(Common.UIString('Script'),['scriptFirstStatement','scriptBlockedByCSP'],true);this._createCategory(Common.UIString('Timer'),['setTimeout','clearTimeout','setInterval','clearInterval','setTimeout.callback','setInterval.callback'],true);this._createCategory(Common.UIString('Touch'),['touchstart','touchmove','touchend','touchcancel']);this._createCategory(Common.UIString('Window'),['DOMWindow.close'],true);this._createCategory(Common.UIString('XHR'),['readystatechange','load','loadstart','loadend','abort','error','progress','timeout'],false,['XMLHttpRequest','XMLHttpRequestUpload']);SDK.targetManager.observeTargets(this,SDK.Target.Capability.DOM);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerPaused,this._update,this);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerResumed,this._update,this);UI.context.addFlavorChangeListener(SDK.Target,this._update,this);}
static eventNameForUI(eventName,auxData){if(!Sources.EventListenerBreakpointsSidebarPane._eventNamesForUI){Sources.EventListenerBreakpointsSidebarPane._eventNamesForUI={'instrumentation:setTimeout.callback':Common.UIString('setTimeout fired'),'instrumentation:setInterval.callback':Common.UIString('setInterval fired'),'instrumentation:scriptFirstStatement':Common.UIString('Script First Statement'),'instrumentation:scriptBlockedByCSP':Common.UIString('Script Blocked by Content Security Policy'),'instrumentation:requestAnimationFrame':Common.UIString('Request Animation Frame'),'instrumentation:cancelAnimationFrame':Common.UIString('Cancel Animation Frame'),'instrumentation:requestAnimationFrame.callback':Common.UIString('Animation Frame Fired'),'instrumentation:webglErrorFired':Common.UIString('WebGL Error Fired'),'instrumentation:webglWarningFired':Common.UIString('WebGL Warning Fired'),'instrumentation:Element.setInnerHTML':Common.UIString('Set innerHTML'),'instrumentation:canvasContextCreated':Common.UIString('Create canvas context'),'instrumentation:Geolocation.getCurrentPosition':'getCurrentPosition','instrumentation:Geolocation.watchPosition':'watchPosition','instrumentation:Notification.requestPermission':'requestPermission','instrumentation:DOMWindow.close':'window.close','instrumentation:Document.write':'document.write',};}
if(auxData){if(eventName==='instrumentation:webglErrorFired'&&auxData['webglErrorName']){var errorName=auxData['webglErrorName'];errorName=errorName.replace(/^.*(0x[0-9a-f]+).*$/i,'$1');return Common.UIString('WebGL Error Fired (%s)',errorName);}
if(eventName==='instrumentation:scriptBlockedByCSP'&&auxData['directiveText'])
return Common.UIString('Script blocked due to Content Security Policy directive: %s',auxData['directiveText']);}
return Sources.EventListenerBreakpointsSidebarPane._eventNamesForUI[eventName]||eventName.substring(eventName.indexOf(':')+1);}
targetAdded(target){this._restoreBreakpoints(target);}
targetRemoved(target){}
_createCategory(name,eventNames,isInstrumentationEvent,targetNames){var labelNode=UI.createCheckboxLabel(name);var categoryItem={};categoryItem.element=new UI.TreeElement(labelNode);this._categoriesTreeOutline.appendChild(categoryItem.element);categoryItem.element.selectable=false;categoryItem.checkbox=labelNode.checkboxElement;categoryItem.checkbox.addEventListener('click',this._categoryCheckboxClicked.bind(this,categoryItem),true);categoryItem.targetNames=this._stringArrayToLowerCase(targetNames||[Sources.EventListenerBreakpointsSidebarPane.eventTargetAny]);categoryItem.children={};var category=(isInstrumentationEvent?Sources.EventListenerBreakpointsSidebarPane.categoryInstrumentation:Sources.EventListenerBreakpointsSidebarPane.categoryListener);for(var i=0;i<eventNames.length;++i){var eventName=category+eventNames[i];var breakpointItem={};var title=Sources.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName);labelNode=UI.createCheckboxLabel(title);labelNode.classList.add('source-code');breakpointItem.element=new UI.TreeElement(labelNode);categoryItem.element.appendChild(breakpointItem.element);breakpointItem.element.listItemElement.createChild('div','breakpoint-hit-marker');breakpointItem.element.selectable=false;breakpointItem.checkbox=labelNode.checkboxElement;breakpointItem.checkbox.addEventListener('click',this._breakpointCheckboxClicked.bind(this,eventName,categoryItem.targetNames),true);breakpointItem.parent=categoryItem;categoryItem.children[eventName]=breakpointItem;}
this._categoryItems.push(categoryItem);}
_update(){var target=UI.context.flavor(SDK.Target);var debuggerModel=target?target.model(SDK.DebuggerModel):null;var details=debuggerModel?debuggerModel.debuggerPausedDetails():null;if(!details||details.reason!==SDK.DebuggerModel.BreakReason.EventListener){if(this._highlightedElement){this._highlightedElement.classList.remove('breakpoint-hit');delete this._highlightedElement;}
return;}
var eventName=details.auxData['eventName'];var targetName=details.auxData['targetName'];var breakpointItem=this._findBreakpointItem(eventName,targetName);if(!breakpointItem||!breakpointItem.checkbox.checked)
breakpointItem=this._findBreakpointItem(eventName,Sources.EventListenerBreakpointsSidebarPane.eventTargetAny);if(!breakpointItem)
return;UI.viewManager.showView('sources.eventListenerBreakpoints');breakpointItem.parent.element.expand();breakpointItem.element.listItemElement.classList.add('breakpoint-hit');this._highlightedElement=breakpointItem.element.listItemElement;}
_stringArrayToLowerCase(array){return array.map(function(value){return value.toLowerCase();});}
_categoryCheckboxClicked(categoryItem){var checked=categoryItem.checkbox.checked;for(var eventName in categoryItem.children){var breakpointItem=categoryItem.children[eventName];if(breakpointItem.checkbox.checked===checked)
continue;if(checked)
this._setBreakpoint(eventName,categoryItem.targetNames);else
this._removeBreakpoint(eventName,categoryItem.targetNames);}
this._saveBreakpoints();}
_breakpointCheckboxClicked(eventName,targetNames,event){if(event.target.checked)
this._setBreakpoint(eventName,targetNames);else
this._removeBreakpoint(eventName,targetNames);this._saveBreakpoints();}
_setBreakpoint(eventName,eventTargetNames,target){eventTargetNames=eventTargetNames||[Sources.EventListenerBreakpointsSidebarPane.eventTargetAny];for(var i=0;i<eventTargetNames.length;++i){var eventTargetName=eventTargetNames[i];var breakpointItem=this._findBreakpointItem(eventName,eventTargetName);if(!breakpointItem)
continue;breakpointItem.checkbox.checked=true;breakpointItem.parent.dirtyCheckbox=true;this._updateBreakpointOnTarget(eventName,eventTargetName,true,target);}
this._updateCategoryCheckboxes();}
_removeBreakpoint(eventName,eventTargetNames,target){eventTargetNames=eventTargetNames||[Sources.EventListenerBreakpointsSidebarPane.eventTargetAny];for(var i=0;i<eventTargetNames.length;++i){var eventTargetName=eventTargetNames[i];var breakpointItem=this._findBreakpointItem(eventName,eventTargetName);if(!breakpointItem)
continue;breakpointItem.checkbox.checked=false;breakpointItem.parent.dirtyCheckbox=true;this._updateBreakpointOnTarget(eventName,eventTargetName,false,target);}
this._updateCategoryCheckboxes();}
_updateBreakpointOnTarget(eventName,eventTargetName,enable,target){var targets=target?[target]:SDK.targetManager.targets(SDK.Target.Capability.DOM);for(target of targets){if(eventName.startsWith(Sources.EventListenerBreakpointsSidebarPane.categoryListener)){var protocolEventName=eventName.substring(Sources.EventListenerBreakpointsSidebarPane.categoryListener.length);if(enable)
target.domdebuggerAgent().setEventListenerBreakpoint(protocolEventName,eventTargetName);else
target.domdebuggerAgent().removeEventListenerBreakpoint(protocolEventName,eventTargetName);}else if(eventName.startsWith(Sources.EventListenerBreakpointsSidebarPane.categoryInstrumentation)){var protocolEventName=eventName.substring(Sources.EventListenerBreakpointsSidebarPane.categoryInstrumentation.length);if(enable)
target.domdebuggerAgent().setInstrumentationBreakpoint(protocolEventName);else
target.domdebuggerAgent().removeInstrumentationBreakpoint(protocolEventName);}}}
_updateCategoryCheckboxes(){for(var i=0;i<this._categoryItems.length;++i){var categoryItem=this._categoryItems[i];if(!categoryItem.dirtyCheckbox)
continue;categoryItem.dirtyCheckbox=false;var hasEnabled=false;var hasDisabled=false;for(var eventName in categoryItem.children){var breakpointItem=categoryItem.children[eventName];if(breakpointItem.checkbox.checked)
hasEnabled=true;else
hasDisabled=true;}
categoryItem.checkbox.checked=hasEnabled;categoryItem.checkbox.indeterminate=hasEnabled&&hasDisabled;}}
_findBreakpointItem(eventName,targetName){targetName=(targetName||Sources.EventListenerBreakpointsSidebarPane.eventTargetAny).toLowerCase();for(var i=0;i<this._categoryItems.length;++i){var categoryItem=this._categoryItems[i];if(categoryItem.targetNames.indexOf(targetName)===-1)
continue;var breakpointItem=categoryItem.children[eventName];if(breakpointItem)
return breakpointItem;}
return null;}
_saveBreakpoints(){var breakpoints=[];for(var i=0;i<this._categoryItems.length;++i){var categoryItem=this._categoryItems[i];for(var eventName in categoryItem.children){var breakpointItem=categoryItem.children[eventName];if(breakpointItem.checkbox.checked)
breakpoints.push({eventName:eventName,targetNames:categoryItem.targetNames});}}
this._eventListenerBreakpointsSetting.set(breakpoints);}
_restoreBreakpoints(target){var breakpoints=this._eventListenerBreakpointsSetting.get();for(var i=0;i<breakpoints.length;++i){var breakpoint=breakpoints[i];if(breakpoint&&typeof breakpoint.eventName==='string')
this._setBreakpoint(breakpoint.eventName,breakpoint.targetNames,target);}}};Sources.EventListenerBreakpointsSidebarPane.categoryListener='listener:';Sources.EventListenerBreakpointsSidebarPane.categoryInstrumentation='instrumentation:';Sources.EventListenerBreakpointsSidebarPane.eventTargetAny='*';;Sources.FilePathScoreFunction=class{constructor(query){this._query=query;this._queryUpperCase=query.toUpperCase();this._score=new Int32Array(20*100);this._sequence=new Int32Array(20*100);this._dataUpperCase='';this._fileNameIndex=0;}
score(data,matchIndexes){if(!data||!this._query)
return 0;var n=this._query.length;var m=data.length;if(!this._score||this._score.length<n*m){this._score=new Int32Array(n*m*2);this._sequence=new Int32Array(n*m*2);}
var score=this._score;var sequence=(this._sequence);this._dataUpperCase=data.toUpperCase();this._fileNameIndex=data.lastIndexOf('/');for(var i=0;i<n;++i){for(var j=0;j<m;++j){var skipCharScore=j===0?0:score[i*m+j-1];var prevCharScore=i===0||j===0?0:score[(i-1)*m+j-1];var consecutiveMatch=i===0||j===0?0:sequence[(i-1)*m+j-1];var pickCharScore=this._match(this._query,data,i,j,consecutiveMatch);if(pickCharScore&&prevCharScore+pickCharScore>=skipCharScore){sequence[i*m+j]=consecutiveMatch+1;score[i*m+j]=(prevCharScore+pickCharScore);}else{sequence[i*m+j]=0;score[i*m+j]=skipCharScore;}}}
if(matchIndexes)
this._restoreMatchIndexes(sequence,n,m,matchIndexes);var maxDataLength=256;return score[n*m-1]*maxDataLength+(maxDataLength-data.length);}
_testWordStart(data,j){if(j===0)
return true;var prevChar=data.charAt(j-1);return prevChar==='_'||prevChar==='-'||prevChar==='/'||(data[j-1]!==this._dataUpperCase[j-1]&&data[j]===this._dataUpperCase[j]);}
_restoreMatchIndexes(sequence,n,m,out){var i=n-1,j=m-1;while(i>=0&&j>=0){switch(sequence[i*m+j]){case 0:--j;break;default:out.push(j);--i;--j;break;}}
out.reverse();}
_singleCharScore(query,data,i,j){var isWordStart=this._testWordStart(data,j);var isFileName=j>this._fileNameIndex;var isPathTokenStart=j===0||data[j-1]==='/';var isCapsMatch=query[i]===data[j]&&query[i]===this._queryUpperCase[i];var score=10;if(isPathTokenStart)
score+=4;if(isWordStart)
score+=2;if(isCapsMatch)
score+=6;if(isFileName)
score+=4;if(j===this._fileNameIndex+1&&i===0)
score+=5;if(isFileName&&isWordStart)
score+=3;return score;}
_sequenceCharScore(query,data,i,j,sequenceLength){var isFileName=j>this._fileNameIndex;var isPathTokenStart=j===0||data[j-1]==='/';var score=10;if(isFileName)
score+=4;if(isPathTokenStart)
score+=5;score+=sequenceLength*4;return score;}
_match(query,data,i,j,consecutiveMatch){if(this._queryUpperCase[i]!==this._dataUpperCase[j])
return 0;if(!consecutiveMatch)
return this._singleCharScore(query,data,i,j);else
return this._sequenceCharScore(query,data,i,j-consecutiveMatch,consecutiveMatch);}};;Sources.FilteredUISourceCodeListProvider=class extends QuickOpen.FilteredListWidget.Provider{constructor(defaultScores){super();this._defaultScores=defaultScores;this._scorer=new Sources.FilePathScoreFunction('');}
_projectRemoved(event){var project=(event.data);this._populate(project);this.refresh();}
_populate(skipProject){this._uiSourceCodes=[];var projects=Workspace.workspace.projects().filter(this.filterProject.bind(this));for(var i=0;i<projects.length;++i){if(skipProject&&projects[i]===skipProject)
continue;var uiSourceCodes=projects[i].uiSourceCodes().filter(this._filterUISourceCode.bind(this));this._uiSourceCodes=this._uiSourceCodes.concat(uiSourceCodes);}}
_filterUISourceCode(uiSourceCode){var binding=Persistence.persistence.binding(uiSourceCode);return!binding||binding.fileSystem===uiSourceCode;}
uiSourceCodeSelected(uiSourceCode,lineNumber,columnNumber){}
filterProject(project){return true;}
itemCount(){return this._uiSourceCodes.length;}
itemKeyAt(itemIndex){return this._uiSourceCodes[itemIndex].url();}
itemScoreAt(itemIndex,query){var uiSourceCode=this._uiSourceCodes[itemIndex];var score=this._defaultScores?(this._defaultScores.get(uiSourceCode)||0):0;if(!query||query.length<2)
return score;if(this._query!==query){this._query=query;this._scorer=new Sources.FilePathScoreFunction(query);}
var fullDisplayName=uiSourceCode.fullDisplayName();return score+10*this._scorer.score(fullDisplayName,null);}
renderItem(itemIndex,query,titleElement,subtitleElement){query=this.rewriteQuery(query);var uiSourceCode=this._uiSourceCodes[itemIndex];var fullDisplayName=uiSourceCode.fullDisplayName();var indexes=[];new Sources.FilePathScoreFunction(query).score(fullDisplayName,indexes);var fileNameIndex=fullDisplayName.lastIndexOf('/');titleElement.classList.add('monospace');subtitleElement.classList.add('monospace');titleElement.textContent=uiSourceCode.displayName()+(this._queryLineNumberAndColumnNumber||'');this._renderSubtitleElement(subtitleElement,fullDisplayName);subtitleElement.title=fullDisplayName;var ranges=[];for(var i=0;i<indexes.length;++i)
ranges.push({offset:indexes[i],length:1});if(indexes[0]>fileNameIndex){for(var i=0;i<ranges.length;++i)
ranges[i].offset-=fileNameIndex+1;UI.highlightRangesWithStyleClass(titleElement,ranges,'highlight');}else{UI.highlightRangesWithStyleClass(subtitleElement,ranges,'highlight');}}
_renderSubtitleElement(element,text){element.removeChildren();var splitPosition=text.lastIndexOf('/');if(text.length>55)
splitPosition=text.length-55;var first=element.createChild('div','first-part');first.textContent=text.substring(0,splitPosition);var second=element.createChild('div','second-part');second.textContent=text.substring(splitPosition);element.title=text;}
selectItem(itemIndex,promptValue){var parsedExpression=promptValue.trim().match(/^([^:]*)(:\d+)?(:\d+)?$/);if(!parsedExpression)
return;var lineNumber;var columnNumber;if(parsedExpression[2])
lineNumber=parseInt(parsedExpression[2].substr(1),10)-1;if(parsedExpression[3])
columnNumber=parseInt(parsedExpression[3].substr(1),10)-1;var uiSourceCode=itemIndex!==null?this._uiSourceCodes[itemIndex]:null;this.uiSourceCodeSelected(uiSourceCode,lineNumber,columnNumber);}
rewriteQuery(query){query=query?query.trim():'';if(!query||query===':')
return'';var lineNumberMatch=query.match(/^([^:]+)((?::[^:]*){0,2})$/);this._queryLineNumberAndColumnNumber=lineNumberMatch?lineNumberMatch[2]:'';return lineNumberMatch?lineNumberMatch[1]:query;}
_uiSourceCodeAdded(event){var uiSourceCode=(event.data);if(!this._filterUISourceCode(uiSourceCode)||!this.filterProject(uiSourceCode.project()))
return;this._uiSourceCodes.push(uiSourceCode);this.refresh();}
notFoundText(){return Common.UIString('No files found');}
attach(){Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);Workspace.workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved,this);this._populate();}
detach(){Workspace.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);Workspace.workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved,this);}};;Sources.SourceMapNamesResolver={};Sources.SourceMapNamesResolver._cachedMapSymbol=Symbol('cache');Sources.SourceMapNamesResolver._cachedIdentifiersSymbol=Symbol('cachedIdentifiers');Sources.SourceMapNamesResolver.Identifier=class{constructor(name,lineNumber,columnNumber){this.name=name;this.lineNumber=lineNumber;this.columnNumber=columnNumber;}};Sources.SourceMapNamesResolver._scopeIdentifiers=function(scope){var startLocation=scope.startLocation();var endLocation=scope.endLocation();if(scope.type()===Protocol.Debugger.ScopeType.Global||!startLocation||!endLocation||!startLocation.script()||!startLocation.script().sourceMapURL||(startLocation.script()!==endLocation.script()))
return Promise.resolve(([]));var script=startLocation.script();return script.requestContent().then(onContent);function onContent(content){if(!content)
return Promise.resolve(([]));var text=new Common.Text(content);var scopeRange=new Common.TextRange(startLocation.lineNumber,startLocation.columnNumber,endLocation.lineNumber,endLocation.columnNumber);var scopeText=text.extract(scopeRange);var scopeStart=text.toSourceRange(scopeRange).offset;var prefix='function fui';return Common.formatterWorkerPool.javaScriptIdentifiers(prefix+scopeText).then(onIdentifiers.bind(null,text,scopeStart,prefix));}
function onIdentifiers(text,scopeStart,prefix,identifiers){var result=[];var cursor=new Common.TextCursor(text.lineEndings());for(var i=0;i<identifiers.length;++i){var id=identifiers[i];if(id.offset<prefix.length)
continue;var start=scopeStart+id.offset-prefix.length;cursor.resetTo(start);result.push(new Sources.SourceMapNamesResolver.Identifier(id.name,cursor.lineNumber(),cursor.columnNumber()));}
return result;}};Sources.SourceMapNamesResolver._resolveScope=function(scope){var identifiersPromise=scope[Sources.SourceMapNamesResolver._cachedIdentifiersSymbol];if(identifiersPromise)
return identifiersPromise;var script=scope.callFrame().script;var sourceMap=Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);if(!sourceMap)
return Promise.resolve(new Map());var textCache=new Map();identifiersPromise=Sources.SourceMapNamesResolver._scopeIdentifiers(scope).then(onIdentifiers);scope[Sources.SourceMapNamesResolver._cachedIdentifiersSymbol]=identifiersPromise;return identifiersPromise;function onIdentifiers(identifiers){var namesMapping=new Map();for(var i=0;i<identifiers.length;++i){var id=identifiers[i];var entry=sourceMap.findEntry(id.lineNumber,id.columnNumber);if(entry&&entry.name)
namesMapping.set(id.name,entry.name);}
var promises=[];for(var i=0;i<identifiers.length;++i){var id=identifiers[i];if(namesMapping.has(id.name))
continue;var promise=resolveSourceName(id).then(onSourceNameResolved.bind(null,namesMapping,id));promises.push(promise);}
return Promise.all(promises).then(()=>Sources.SourceMapNamesResolver._scopeResolvedForTest()).then(()=>namesMapping);}
function onSourceNameResolved(namesMapping,id,sourceName){if(!sourceName)
return;namesMapping.set(id.name,sourceName);}
function resolveSourceName(id){var startEntry=sourceMap.findEntry(id.lineNumber,id.columnNumber);var endEntry=sourceMap.findEntry(id.lineNumber,id.columnNumber+id.name.length);if(!startEntry||!endEntry||!startEntry.sourceURL||startEntry.sourceURL!==endEntry.sourceURL||!startEntry.sourceLineNumber||!startEntry.sourceColumnNumber||!endEntry.sourceLineNumber||!endEntry.sourceColumnNumber)
return Promise.resolve((null));var sourceTextRange=new Common.TextRange(startEntry.sourceLineNumber,startEntry.sourceColumnNumber,endEntry.sourceLineNumber,endEntry.sourceColumnNumber);var uiSourceCode=Bindings.NetworkProject.uiSourceCodeForScriptURL(Workspace.workspace,startEntry.sourceURL,script);if(!uiSourceCode)
return Promise.resolve((null));return uiSourceCode.requestContent().then(onSourceContent.bind(null,sourceTextRange));}
function onSourceContent(sourceTextRange,content){if(!content)
return null;var text=textCache.get(content);if(!text){text=new Common.Text(content);textCache.set(content,text);}
var originalIdentifier=text.extract(sourceTextRange).trim();return/[a-zA-Z0-9_$]+/.test(originalIdentifier)?originalIdentifier:null;}};Sources.SourceMapNamesResolver._scopeResolvedForTest=function(){};Sources.SourceMapNamesResolver._allVariablesInCallFrame=function(callFrame){var cached=callFrame[Sources.SourceMapNamesResolver._cachedMapSymbol];if(cached)
return Promise.resolve(cached);var promises=[];var scopeChain=callFrame.scopeChain();for(var i=0;i<scopeChain.length;++i)
promises.push(Sources.SourceMapNamesResolver._resolveScope(scopeChain[i]));return Promise.all(promises).then(mergeVariables);function mergeVariables(nameMappings){var reverseMapping=new Map();for(var map of nameMappings){for(var compiledName of map.keys()){var originalName=map.get(compiledName);if(!reverseMapping.has(originalName))
reverseMapping.set(originalName,compiledName);}}
callFrame[Sources.SourceMapNamesResolver._cachedMapSymbol]=reverseMapping;return reverseMapping;}};Sources.SourceMapNamesResolver.resolveExpression=function(callFrame,originalText,uiSourceCode,lineNumber,startColumnNumber,endColumnNumber){if(!uiSourceCode.contentType().isFromSourceMap())
return Promise.resolve('');return Sources.SourceMapNamesResolver._allVariablesInCallFrame(callFrame).then(findCompiledName);function findCompiledName(reverseMapping){if(reverseMapping.has(originalText))
return Promise.resolve(reverseMapping.get(originalText)||'');return Sources.SourceMapNamesResolver._resolveExpression(callFrame,uiSourceCode,lineNumber,startColumnNumber,endColumnNumber);}};Sources.SourceMapNamesResolver._resolveExpression=function(callFrame,uiSourceCode,lineNumber,startColumnNumber,endColumnNumber){var rawLocation=Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(callFrame.debuggerModel,uiSourceCode,lineNumber,startColumnNumber);if(!rawLocation)
return Promise.resolve('');var script=rawLocation.script();if(!script)
return Promise.resolve('');var sourceMap=Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);if(!sourceMap)
return Promise.resolve('');return script.requestContent().then(onContent);function onContent(content){if(!content)
return Promise.resolve('');var text=new Common.Text(content);var textRange=sourceMap.reverseMapTextRange(uiSourceCode.url(),new Common.TextRange(lineNumber,startColumnNumber,lineNumber,endColumnNumber));var originalText=text.extract(textRange);if(!originalText)
return Promise.resolve('');return Common.formatterWorkerPool.evaluatableJavaScriptSubstring(originalText);}};Sources.SourceMapNamesResolver.resolveThisObject=function(callFrame){if(!callFrame)
return Promise.resolve((null));if(!callFrame.scopeChain().length)
return Promise.resolve(callFrame.thisObject());return Sources.SourceMapNamesResolver._resolveScope(callFrame.scopeChain()[0]).then(onScopeResolved);function onScopeResolved(namesMapping){var thisMappings=namesMapping.inverse().get('this');if(!thisMappings||thisMappings.size!==1)
return Promise.resolve(callFrame.thisObject());var thisMapping=thisMappings.valuesArray()[0];var callback;var promise=new Promise(fulfill=>callback=fulfill);callFrame.evaluate(thisMapping,'backtrace',false,true,false,true,onEvaluated.bind(null,callback));return promise;}
function onEvaluated(callback,evaluateResult){var remoteObject=evaluateResult?callFrame.debuggerModel.runtimeModel().createRemoteObject(evaluateResult):callFrame.thisObject();callback((remoteObject));}};Sources.SourceMapNamesResolver.resolveScopeInObject=function(scope){var startLocation=scope.startLocation();var endLocation=scope.endLocation();if(scope.type()===Protocol.Debugger.ScopeType.Global||!startLocation||!endLocation||!startLocation.script()||!startLocation.script().sourceMapURL||startLocation.script()!==endLocation.script())
return scope.object();return new Sources.SourceMapNamesResolver.RemoteObject(scope);};Sources.SourceMapNamesResolver.RemoteObject=class extends SDK.RemoteObject{constructor(scope){super();this._scope=scope;this._object=scope.object();}
customPreview(){return this._object.customPreview();}
get objectId(){return this._object.objectId;}
get type(){return this._object.type;}
get subtype(){return this._object.subtype;}
get value(){return this._object.value;}
get description(){return this._object.description;}
get hasChildren(){return this._object.hasChildren;}
get preview(){return this._object.preview;}
arrayLength(){return this._object.arrayLength();}
getOwnProperties(generatePreview,callback){this._object.getOwnProperties(generatePreview,callback);}
getAllProperties(accessorPropertiesOnly,generatePreview,callback){function wrappedCallback(properties,internalProperties){Sources.SourceMapNamesResolver._resolveScope(this._scope).then(resolveNames.bind(null,properties,internalProperties));}
function resolveNames(properties,internalProperties,namesMapping){var newProperties=[];if(properties){for(var i=0;i<properties.length;++i){var property=properties[i];var name=namesMapping.get(property.name)||properties[i].name;newProperties.push(new SDK.RemoteObjectProperty(name,property.value,property.enumerable,property.writable,property.isOwn,property.wasThrown,property.symbol,property.synthetic));}}
callback(newProperties,internalProperties);}
this._object.getAllProperties(accessorPropertiesOnly,generatePreview,wrappedCallback.bind(this));}
setPropertyValue(argumentName,value,callback){Sources.SourceMapNamesResolver._resolveScope(this._scope).then(resolveName.bind(this));function resolveName(namesMapping){var name;if(typeof argumentName==='string')
name=argumentName;else
name=(argumentName.value);var actualName=name;for(var compiledName of namesMapping.keys()){if(namesMapping.get(compiledName)===name){actualName=compiledName;break;}}
this._object.setPropertyValue(actualName,value,callback);}}
getProperty(propertyPath,callback){this._object.getProperty(propertyPath,callback);}
eventListeners(){return this._object.eventListeners();}
deleteProperty(name,callback){this._object.deleteProperty(name,callback);}
callFunction(functionDeclaration,args,callback){this._object.callFunction(functionDeclaration,args,callback);}
callFunctionJSON(functionDeclaration,args,callback){this._object.callFunctionJSON(functionDeclaration,args,callback);}
release(){this._object.release();}
debuggerModel(){return this._object.debuggerModel();}
runtimeModel(){return this._object.runtimeModel();}
isNode(){return this._object.isNode();}};;Sources.JavaScriptBreakpointsSidebarPane=class extends UI.ThrottledWidget{constructor(){super(true);this.registerRequiredCSS('components/breakpointsList.css');this._breakpointManager=Bindings.breakpointManager;this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointAdded,this.update,this);this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved,this.update,this);this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointsActiveStateChanged,this.update,this);this._listElement=null;this.update();}
doUpdate(){var breakpointLocations=this._breakpointManager.allBreakpointLocations();if(!breakpointLocations.length){this._listElement=null;this.contentElement.removeChildren();var emptyElement=this.contentElement.createChild('div','gray-info-message');emptyElement.textContent=Common.UIString('No Breakpoints');this.contentElement.appendChild(emptyElement);this._didUpdateForTest();return Promise.resolve();}
if(!this._listElement){this.contentElement.removeChildren();this._listElement=this.contentElement.createChild('div');this.contentElement.appendChild(this._listElement);}
breakpointLocations.sort((item1,item2)=>item1.uiLocation.compareTo(item2.uiLocation));var locationForEntry=new Multimap();for(var breakpointLocation of breakpointLocations){var uiLocation=breakpointLocation.uiLocation;var entryDescriptor=uiLocation.uiSourceCode.url()+':'+uiLocation.lineNumber;locationForEntry.set(entryDescriptor,breakpointLocation);}
var details=UI.context.flavor(SDK.DebuggerPausedDetails);var selectedUILocation=details&&details.callFrames.length?Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location()):null;var shouldShowView=false;var entry=this._listElement.firstChild;var promises=[];for(var descriptor of locationForEntry.keysArray()){if(!entry){entry=this._listElement.createChild('div','breakpoint-entry');entry.addEventListener('contextmenu',this._breakpointContextMenu.bind(this),true);entry.addEventListener('click',this._revealLocation.bind(this),false);var checkboxLabel=UI.createCheckboxLabel('');checkboxLabel.addEventListener('click',this._breakpointCheckboxClicked.bind(this),false);entry.appendChild(checkboxLabel);entry[Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol]=checkboxLabel;var snippetElement=entry.createChild('div','source-text monospace');entry[Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol]=snippetElement;}
var locations=Array.from(locationForEntry.get(descriptor));var uiLocation=locations[0].uiLocation;var isSelected=!!selectedUILocation&&locations.some(location=>location.uiLocation.id()===selectedUILocation.id());var hasEnabled=locations.some(location=>location.breakpoint.enabled());var hasDisabled=locations.some(location=>!location.breakpoint.enabled());promises.push(this._resetEntry((entry),uiLocation,isSelected,hasEnabled,hasDisabled));if(isSelected)
shouldShowView=true;entry=entry.nextSibling;}
while(entry){var next=entry.nextSibling;entry.remove();entry=next;}
if(shouldShowView)
UI.viewManager.showView('sources.jsBreakpoints');this._listElement.classList.toggle('breakpoints-list-deactivated',!this._breakpointManager.breakpointsActive());Promise.all(promises).then(()=>this._didUpdateForTest());return Promise.resolve();}
_resetEntry(element,uiLocation,isSelected,hasEnabled,hasDisabled){element[Sources.JavaScriptBreakpointsSidebarPane._locationSymbol]=uiLocation;element.classList.toggle('breakpoint-hit',isSelected);var checkboxLabel=element[Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol];checkboxLabel.textElement.textContent=uiLocation.linkText();checkboxLabel.checkboxElement.checked=hasEnabled;checkboxLabel.checkboxElement.indeterminate=hasEnabled&&hasDisabled;var snippetElement=element[Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol];return uiLocation.uiSourceCode.requestContent().then(fillSnippetElement.bind(null,snippetElement));function fillSnippetElement(snippetElement,content){var lineNumber=uiLocation.lineNumber;var text=new Common.Text(content||'');if(lineNumber<text.lineCount()){var lineText=text.lineAt(lineNumber);var maxSnippetLength=200;snippetElement.textContent=lineText.trimEnd(maxSnippetLength);}}}
_uiLocationFromEvent(event){var node=event.target.enclosingNodeOrSelfWithClass('breakpoint-entry');if(!node)
return null;return node[Sources.JavaScriptBreakpointsSidebarPane._locationSymbol]||null;}
_breakpointCheckboxClicked(event){var uiLocation=this._uiLocationFromEvent(event);if(!uiLocation)
return;var breakpoints=this._breakpointManager.findBreakpoints(uiLocation.uiSourceCode,uiLocation.lineNumber);var newState=event.target.checkboxElement.checked;for(var breakpoint of breakpoints)
breakpoint.setEnabled(newState);event.consume();}
_revealLocation(event){var uiLocation=this._uiLocationFromEvent(event);if(uiLocation)
Common.Revealer.reveal(uiLocation);}
_breakpointContextMenu(event){var uiLocation=this._uiLocationFromEvent(event);if(!uiLocation)
return;var breakpoints=this._breakpointManager.findBreakpoints(uiLocation.uiSourceCode,uiLocation.lineNumber);var contextMenu=new UI.ContextMenu(event);var removeEntryTitle=breakpoints.length>1?Common.UIString('Remove all breakpoints in line'):Common.UIString('Remove breakpoint');contextMenu.appendItem(removeEntryTitle,()=>breakpoints.map(breakpoint=>breakpoint.remove()));contextMenu.appendSeparator();var breakpointActive=this._breakpointManager.breakpointsActive();var breakpointActiveTitle=breakpointActive?Common.UIString('Deactivate breakpoints'):Common.UIString('Activate breakpoints');contextMenu.appendItem(breakpointActiveTitle,this._breakpointManager.setBreakpointsActive.bind(this._breakpointManager,!breakpointActive));contextMenu.appendSeparator();if(breakpoints.some(breakpoint=>!breakpoint.enabled())){var enableTitle=Common.UIString('Enable all breakpoints');contextMenu.appendItem(enableTitle,this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager,true));}
if(breakpoints.some(breakpoint=>breakpoint.enabled())){var disableTitle=Common.UIString('Disable all breakpoints');contextMenu.appendItem(disableTitle,this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager,false));}
var removeAllTitle=Common.UIString('Remove all breakpoints');contextMenu.appendItem(removeAllTitle,this._breakpointManager.removeAllBreakpoints.bind(this._breakpointManager));var removeOtherTitle=Common.UIString('Remove other breakpoints');contextMenu.appendItem(removeOtherTitle,this._breakpointManager.removeOtherBreakpoints.bind(this._breakpointManager,new Set(breakpoints)));contextMenu.show();}
flavorChanged(object){this.update();}
_didUpdateForTest(){}};Sources.JavaScriptBreakpointsSidebarPane._locationSymbol=Symbol('location');Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol=Symbol('checkbox-label');Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol=Symbol('snippet-element');;Sources.JavaScriptOutlineDialog=class extends QuickOpen.FilteredListWidget.Provider{constructor(uiSourceCode,selectItemCallback){super();this._functionItems=[];this._selectItemCallback=selectItemCallback;Common.formatterWorkerPool.javaScriptOutline(uiSourceCode.workingCopy(),this._didBuildOutlineChunk.bind(this));}
static show(uiSourceCode,selectItemCallback){Sources.JavaScriptOutlineDialog._instanceForTests=new Sources.JavaScriptOutlineDialog(uiSourceCode,selectItemCallback);new QuickOpen.FilteredListWidget(Sources.JavaScriptOutlineDialog._instanceForTests).showAsDialog();}
_didBuildOutlineChunk(isLastChunk,items){this._functionItems.push(...items);this.refresh();}
itemCount(){return this._functionItems.length;}
itemKeyAt(itemIndex){var item=this._functionItems[itemIndex];return item.name+(item.arguments?item.arguments:'');}
itemScoreAt(itemIndex,query){var item=this._functionItems[itemIndex];var methodName=query.split('(')[0];if(methodName.toLowerCase()===item.name.toLowerCase())
return 1/(1+item.line);return-item.line-1;}
renderItem(itemIndex,query,titleElement,subtitleElement){var item=this._functionItems[itemIndex];titleElement.textContent=item.name+(item.arguments?item.arguments:'');QuickOpen.FilteredListWidget.highlightRanges(titleElement,query);subtitleElement.textContent=':'+(item.line+1);}
selectItem(itemIndex,promptValue){if(itemIndex===null)
return;var lineNumber=this._functionItems[itemIndex].line;if(!isNaN(lineNumber)&&lineNumber>=0)
this._selectItemCallback(lineNumber,this._functionItems[itemIndex].column);}};;Sources.JavaScriptSourceFrame=class extends SourceFrame.UISourceCodeFrame{constructor(uiSourceCode){super(uiSourceCode);this._debuggerSourceCode=uiSourceCode;this._scriptsPanel=Sources.SourcesPanel.instance();this._breakpointManager=Bindings.breakpointManager;if(uiSourceCode.project().type()===Workspace.projectTypes.Debugger)
this.element.classList.add('source-frame-debugger-script');this._popoverHelper=new UI.PopoverHelper(this._scriptsPanel.element,true);this._popoverHelper.initializeCallbacks(this._getPopoverAnchor.bind(this),this._showObjectPopover.bind(this),this._onHidePopover.bind(this));this._popoverHelper.setTimeout(250,250);this._popoverHelper.setHasPadding(true);this._scriptsPanel.element.addEventListener('scroll',this._popoverHelper.hidePopover.bind(this._popoverHelper),true);this.textEditor.element.addEventListener('keydown',this._onKeyDown.bind(this),true);this.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick,this._handleGutterClick.bind(this),this);this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointAdded,this._breakpointAdded,this);this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved,this._breakpointRemoved,this);this.uiSourceCode().addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this.uiSourceCode().addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);this.uiSourceCode().addEventListener(Workspace.UISourceCode.Events.TitleChanged,this._showBlackboxInfobarIfNeeded,this);this._breakpointDecorations=new Set();this._decorationByBreakpoint=new Map();this._scriptFileForDebuggerModel=new Map();Common.moduleSetting('skipStackFramesPattern').addChangeListener(this._showBlackboxInfobarIfNeeded,this);Common.moduleSetting('skipContentScripts').addChangeListener(this._showBlackboxInfobarIfNeeded,this);this._valueWidgets=new Map();this.onBindingChanged();Bindings.debuggerWorkspaceBinding.addEventListener(Bindings.DebuggerWorkspaceBinding.Events.SourceMappingChanged,this._onSourceMappingChanged,this);}
syncToolbarItems(){var result=super.syncToolbarItems();var originURL=Bindings.CompilerScriptMapping.uiSourceCodeOrigin(this._debuggerSourceCode);if(originURL){var parsedURL=originURL.asParsedURL();if(parsedURL)
result.push(new UI.ToolbarText(Common.UIString('(source mapped from %s)',parsedURL.displayName)));}
if(this.uiSourceCode().project().type()===Workspace.projectTypes.Snippets){result.push(new UI.ToolbarSeparator(true));var runSnippet=UI.Toolbar.createActionButtonForId('debugger.run-snippet');runSnippet.setText(Host.isMac()?Common.UIString('\u2318+Enter'):Common.UIString('Ctrl+Enter'));result.push(runSnippet);}
return result;}
_showBlackboxInfobarIfNeeded(){var uiSourceCode=this._debuggerSourceCode;if(!uiSourceCode.contentType().hasScripts())
return;var projectType=uiSourceCode.project().type();if(!Bindings.blackboxManager.isBlackboxedUISourceCode(uiSourceCode)){this._hideBlackboxInfobar();return;}
if(this._blackboxInfobar)
this._blackboxInfobar.dispose();var infobar=new UI.Infobar(UI.Infobar.Type.Warning,Common.UIString('This script is blackboxed in debugger'));this._blackboxInfobar=infobar;infobar.createDetailsRowMessage(Common.UIString('Debugger will skip stepping through this script, and will not stop on exceptions'));var scriptFile=this._scriptFileForDebuggerModel.size?this._scriptFileForDebuggerModel.valuesArray()[0]:null;if(scriptFile&&scriptFile.hasSourceMapURL())
infobar.createDetailsRowMessage(Common.UIString('Source map found, but ignored for blackboxed file.'));infobar.createDetailsRowMessage();infobar.createDetailsRowMessage(Common.UIString('Possible ways to cancel this behavior are:'));infobar.createDetailsRowMessage(' - ').createTextChild(Common.UIString('Go to "%s" tab in settings',Common.UIString('Blackboxing')));var unblackboxLink=infobar.createDetailsRowMessage(' - ').createChild('span','link');unblackboxLink.textContent=Common.UIString('Unblackbox this script');unblackboxLink.addEventListener('click',unblackbox,false);function unblackbox(){Bindings.blackboxManager.unblackboxUISourceCode(uiSourceCode);if(projectType===Workspace.projectTypes.ContentScripts)
Bindings.blackboxManager.unblackboxContentScripts();}
this.attachInfobars([this._blackboxInfobar]);}
_hideBlackboxInfobar(){if(!this._blackboxInfobar)
return;this._blackboxInfobar.dispose();delete this._blackboxInfobar;}
wasShown(){super.wasShown();if(this._executionLocation&&this.loaded){setImmediate(()=>{this._generateValuesInSource();if(Runtime.experiments.isEnabled('continueToLocationMarkers'))
this._showContinueToLocations();});}}
willHide(){super.willHide();this._popoverHelper.hidePopover();}
onUISourceCodeContentChanged(){for(var decoration of this._breakpointDecorations){if(decoration.breakpoint)
decoration.breakpoint.remove();}
super.onUISourceCodeContentChanged();}
onTextChanged(oldRange,newRange){this._scriptsPanel.updateLastModificationTime();super.onTextChanged(oldRange,newRange);if(this._compiler)
this._compiler.scheduleCompile();}
populateLineGutterContextMenu(contextMenu,lineNumber){function populate(resolve,reject){var uiLocation=new Workspace.UILocation(this._debuggerSourceCode,lineNumber,0);this._scriptsPanel.appendUILocationItems(contextMenu,uiLocation);var breakpoints=this._lineBreakpointDecorations(lineNumber).map(decoration=>decoration.breakpoint).filter(breakpoint=>!!breakpoint);if(!breakpoints.length){contextMenu.appendItem(Common.UIString('Add breakpoint'),this._createNewBreakpoint.bind(this,lineNumber,'',true));contextMenu.appendItem(Common.UIString('Add conditional breakpoint\u2026'),this._editBreakpointCondition.bind(this,lineNumber,null,null));contextMenu.appendItem(Common.UIString('Never pause here'),this._createNewBreakpoint.bind(this,lineNumber,'false',true));}else{var hasOneBreakpoint=breakpoints.length===1;var removeTitle=hasOneBreakpoint?Common.UIString('Remove breakpoint'):Common.UIString('Remove all breakpoints in line');contextMenu.appendItem(removeTitle,()=>breakpoints.map(breakpoint=>breakpoint.remove()));if(hasOneBreakpoint){contextMenu.appendItem(Common.UIString('Edit breakpoint\u2026'),this._editBreakpointCondition.bind(this,lineNumber,breakpoints[0],null));}
var hasEnabled=breakpoints.some(breakpoint=>breakpoint.enabled());if(hasEnabled){var title=hasOneBreakpoint?Common.UIString('Disable breakpoint'):Common.UIString('Disable all breakpoints in line');contextMenu.appendItem(title,()=>breakpoints.map(breakpoint=>breakpoint.setEnabled(false)));}
var hasDisabled=breakpoints.some(breakpoint=>!breakpoint.enabled());if(hasDisabled){var title=hasOneBreakpoint?Common.UIString('Enable breakpoint'):Common.UIString('Enabled all breakpoints in line');contextMenu.appendItem(title,()=>breakpoints.map(breakpoint=>breakpoint.setEnabled(true)));}}
resolve();}
return new Promise(populate.bind(this));}
populateTextAreaContextMenu(contextMenu,lineNumber,columnNumber){function addSourceMapURL(scriptFile){Sources.AddSourceMapURLDialog.show(addSourceMapURLDialogCallback.bind(null,scriptFile));}
function addSourceMapURLDialogCallback(scriptFile,url){if(!url)
return;scriptFile.addSourceMapURL(url);}
function populateSourceMapMembers(){if(this._debuggerSourceCode.project().type()===Workspace.projectTypes.Network&&Common.moduleSetting('jsSourceMapsEnabled').get()&&!Bindings.blackboxManager.isBlackboxedUISourceCode(this._debuggerSourceCode)){if(this._scriptFileForDebuggerModel.size){var scriptFile=this._scriptFileForDebuggerModel.valuesArray()[0];var addSourceMapURLLabel=Common.UIString.capitalize('Add ^source ^map\u2026');contextMenu.appendItem(addSourceMapURLLabel,addSourceMapURL.bind(null,scriptFile));contextMenu.appendSeparator();}}}
return super.populateTextAreaContextMenu(contextMenu,lineNumber,columnNumber).then(populateSourceMapMembers.bind(this));}
_workingCopyChanged(event){if(this._supportsEnabledBreakpointsWhileEditing()||this._scriptFileForDebuggerModel.size)
return;if(this.uiSourceCode().isDirty())
this._muteBreakpointsWhileEditing();else
this._restoreBreakpointsAfterEditing();}
_workingCopyCommitted(event){this._scriptsPanel.updateLastModificationTime();if(this._supportsEnabledBreakpointsWhileEditing())
return;if(!this._scriptFileForDebuggerModel.size)
this._restoreBreakpointsAfterEditing();}
_didMergeToVM(){if(this._supportsEnabledBreakpointsWhileEditing())
return;this._restoreBreakpointsIfConsistentScripts();}
_didDivergeFromVM(){if(this._supportsEnabledBreakpointsWhileEditing())
return;this._muteBreakpointsWhileEditing();}
_muteBreakpointsWhileEditing(){if(this._muted)
return;for(var decoration of this._breakpointDecorations)
this._updateBreakpointDecoration(decoration);this._muted=true;}
_supportsEnabledBreakpointsWhileEditing(){return this.uiSourceCode().project().type()===Workspace.projectTypes.Snippets;}
_restoreBreakpointsIfConsistentScripts(){var scriptFiles=this._scriptFileForDebuggerModel.valuesArray();for(var i=0;i<scriptFiles.length;++i){if(scriptFiles[i].hasDivergedFromVM()||scriptFiles[i].isMergingToVM())
return;}
this._restoreBreakpointsAfterEditing();}
_restoreBreakpointsAfterEditing(){delete this._muted;var decorations=Array.from(this._breakpointDecorations);this._breakpointDecorations.clear();this.textEditor.operation(()=>decorations.map(decoration=>decoration.hide()));for(var decoration of decorations){if(!decoration.breakpoint)
continue;var enabled=decoration.enabled;decoration.breakpoint.remove();var location=decoration.handle.resolve();if(location)
this._setBreakpoint(location.lineNumber,location.columnNumber,decoration.condition,enabled);}}
_isIdentifier(tokenType){return tokenType.startsWith('js-variable')||tokenType.startsWith('js-property')||tokenType==='js-def';}
_getPopoverAnchor(element,event){var target=UI.context.flavor(SDK.Target);var debuggerModel=target?target.model(SDK.DebuggerModel):null;if(!debuggerModel||!debuggerModel.isPaused())
return;var textPosition=this.textEditor.coordinatesToCursorPosition(event.x,event.y);if(!textPosition)
return;var mouseLine=textPosition.startLine;var mouseColumn=textPosition.startColumn;var textSelection=this.textEditor.selection().normalize();if(textSelection&&!textSelection.isEmpty()){if(textSelection.startLine!==textSelection.endLine||textSelection.startLine!==mouseLine||mouseColumn<textSelection.startColumn||mouseColumn>textSelection.endColumn)
return;var leftCorner=this.textEditor.cursorPositionToCoordinates(textSelection.startLine,textSelection.startColumn);var rightCorner=this.textEditor.cursorPositionToCoordinates(textSelection.endLine,textSelection.endColumn);var anchorBox=new AnchorBox(leftCorner.x,leftCorner.y,rightCorner.x-leftCorner.x,leftCorner.height);anchorBox.highlight={lineNumber:textSelection.startLine,startColumn:textSelection.startColumn,endColumn:textSelection.endColumn-1};anchorBox.forSelection=true;return anchorBox;}
var token=this.textEditor.tokenAtTextPosition(textPosition.startLine,textPosition.startColumn);if(!token||!token.type)
return;var lineNumber=textPosition.startLine;var line=this.textEditor.line(lineNumber);var tokenContent=line.substring(token.startColumn,token.endColumn);var isIdentifier=this._isIdentifier(token.type);if(!isIdentifier&&(token.type!=='js-keyword'||tokenContent!=='this'))
return;var leftCorner=this.textEditor.cursorPositionToCoordinates(lineNumber,token.startColumn);var rightCorner=this.textEditor.cursorPositionToCoordinates(lineNumber,token.endColumn-1);var anchorBox=new AnchorBox(leftCorner.x,leftCorner.y,rightCorner.x-leftCorner.x,leftCorner.height);anchorBox.highlight={lineNumber:lineNumber,startColumn:token.startColumn,endColumn:token.endColumn-1};return anchorBox;}
_resolveObjectForPopover(anchorBox){var selectedCallFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!selectedCallFrame)
return Promise.resolve((null));var lineNumber=anchorBox.highlight.lineNumber;var startHighlight=anchorBox.highlight.startColumn;var endHighlight=anchorBox.highlight.endColumn;var line=this.textEditor.line(lineNumber);if(!anchorBox.forSelection){while(startHighlight>1&&line.charAt(startHighlight-1)==='.'){var token=this.textEditor.tokenAtTextPosition(lineNumber,startHighlight-2);if(!token||!token.type)
return Promise.resolve((null));startHighlight=token.startColumn;}}
var evaluationText=line.substring(startHighlight,endHighlight+1);return Sources.SourceMapNamesResolver.resolveExpression(selectedCallFrame,evaluationText,this._debuggerSourceCode,lineNumber,startHighlight,endHighlight).then(onResolve.bind(this));function onResolve(text){var fulfill;var promise=new Promise(x=>fulfill=x);selectedCallFrame.evaluate(text||evaluationText,'popover',false,true,false,false,showObjectPopover.bind(this,fulfill));return promise;}
function showObjectPopover(fulfill,result,exceptionDetails){var target=UI.context.flavor(SDK.Target);var potentiallyUpdatedCallFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(selectedCallFrame!==potentiallyUpdatedCallFrame||!result||exceptionDetails){fulfill(null);return;}
this._popoverAnchorBox=anchorBox;this._popoverTarget=target;var highlightRange=new Common.TextRange(lineNumber,startHighlight,lineNumber,endHighlight);this._popoverAnchorBox._highlightDescriptor=this.textEditor.highlightRange(highlightRange,'source-frame-eval-expression');fulfill(target.runtimeModel.createRemoteObject(result));}}
_showObjectPopover(anchorBox,popover){return this._resolveObjectForPopover((anchorBox)).then(object=>{if(!object)
return false;return ObjectUI.ObjectPopoverHelper.buildObjectPopover(object,popover).then(objectPopoverHelper=>{if(!objectPopoverHelper){this._onHidePopover();return false;}
this._objectPopoverHelper=objectPopoverHelper;return true;});});}
_onHidePopover(){if(this._objectPopoverHelper){this._objectPopoverHelper.dispose();delete this._objectPopoverHelper;}
if(this._popoverTarget){this._popoverTarget.runtimeModel.releaseObjectGroup('popover');delete this._popoverTarget;}
if(this._popoverAnchorBox){if(this._popoverAnchorBox._highlightDescriptor)
this.textEditor.removeHighlight(this._popoverAnchorBox._highlightDescriptor);delete this._popoverAnchorBox;}}
_onKeyDown(event){if(event.key==='Escape'){if(this._popoverHelper.isPopoverVisible()){this._popoverHelper.hidePopover();event.consume();}}}
_editBreakpointCondition(lineNumber,breakpoint,location){this._conditionElement=this._createConditionElement(lineNumber);this.textEditor.addDecoration(this._conditionElement,lineNumber);function finishEditing(committed,element,newText){this.textEditor.removeDecoration(this._conditionElement,lineNumber);delete this._conditionEditorElement;delete this._conditionElement;if(!committed)
return;if(breakpoint)
breakpoint.setCondition(newText);else if(location)
this._setBreakpoint(location.lineNumber,location.columnNumber,newText,true);else
this._createNewBreakpoint(lineNumber,newText,true);}
var config=new UI.InplaceEditor.Config(finishEditing.bind(this,true),finishEditing.bind(this,false));UI.InplaceEditor.startEditing(this._conditionEditorElement,config);this._conditionEditorElement.value=breakpoint?breakpoint.condition():'';this._conditionEditorElement.select();}
_createConditionElement(lineNumber){var conditionElement=createElementWithClass('div','source-frame-breakpoint-condition');var labelElement=conditionElement.createChild('label','source-frame-breakpoint-message');labelElement.htmlFor='source-frame-breakpoint-condition';labelElement.createTextChild(Common.UIString('The breakpoint on line %d will stop only if this expression is true:',lineNumber+1));var editorElement=conditionElement.createChild('input','monospace');editorElement.id='source-frame-breakpoint-condition';editorElement.type='text';this._conditionEditorElement=editorElement;return conditionElement;}
setExecutionLocation(uiLocation){this._executionLocation=uiLocation;if(!this.loaded)
return;this.textEditor.setExecutionLocation(uiLocation.lineNumber,uiLocation.columnNumber);if(this.isShowing()){setImmediate(()=>{this._generateValuesInSource();if(Runtime.experiments.isEnabled('continueToLocationMarkers'))
this._showContinueToLocations();});}}
_generateValuesInSource(){if(!Common.moduleSetting('inlineVariableValues').get())
return;var executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext)
return;var callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!callFrame)
return;var localScope=callFrame.localScope();var functionLocation=callFrame.functionLocation();if(localScope&&functionLocation){Sources.SourceMapNamesResolver.resolveScopeInObject(localScope).getAllProperties(false,false,this._prepareScopeVariables.bind(this,callFrame));}
if(this._clearValueWidgetsTimer){clearTimeout(this._clearValueWidgetsTimer);delete this._clearValueWidgetsTimer;}}
_showContinueToLocations(){var executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext)
return;var callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!callFrame)
return;if(this._clearContinueToLocationsTimer){clearTimeout(this._clearContinueToLocationsTimer);delete this._clearContinueToLocationsTimer;}
var localScope=callFrame.localScope();if(!localScope){this.textEditor.operation(clearExistingLocations.bind(this));return;}
var start=localScope.startLocation();var end=localScope.endLocation();var debuggerModel=callFrame.debuggerModel;var executionLocation=callFrame.location();debuggerModel.getPossibleBreakpoints(start,end,true).then(locations=>this.textEditor.operation(renderLocations.bind(this,locations)));function renderLocations(locations){clearExistingLocations.call(this);for(var location of locations){var icon;var isCurrent=location.lineNumber===executionLocation.lineNumber&&location.columnNumber===executionLocation.columnNumber;if(!isCurrent||(location.type!==SDK.DebuggerModel.BreakLocationType.Call&&location.type!==SDK.DebuggerModel.BreakLocationType.Return)){icon=UI.Icon.create('smallicon-green-arrow');icon.addEventListener('click',location.continueToLocation.bind(location));}else if(location.type===SDK.DebuggerModel.BreakLocationType.Call){icon=UI.Icon.create('smallicon-step-in');icon.addEventListener('click',()=>{debuggerModel.scheduleStepIntoAsync();debuggerModel.stepInto();});}else if(location.type===SDK.DebuggerModel.BreakLocationType.Return){icon=UI.Icon.create('smallicon-step-out');icon.addEventListener('click',()=>{debuggerModel.stepOut();});}
icon.classList.add('cm-continue-to-location');icon.addEventListener('mousemove',hidePopoverAndConsumeEvent.bind(this));this.textEditor.addBookmark(location.lineNumber,location.columnNumber,icon,Sources.JavaScriptSourceFrame.continueToLocationDecorationSymbol);}}
function clearExistingLocations(){var bookmarks=this.textEditor.bookmarks(this.textEditor.fullRange(),Sources.JavaScriptSourceFrame.continueToLocationDecorationSymbol);bookmarks.map(bookmark=>bookmark.clear());}
function hidePopoverAndConsumeEvent(event){event.consume(true);this._popoverHelper.hidePopover();}}
_prepareScopeVariables(callFrame,properties,internalProperties){if(!properties||!properties.length||properties.length>500||!this.isShowing()){this._clearValueWidgets();return;}
var functionUILocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation((callFrame.functionLocation()));var executionUILocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(callFrame.location());if(functionUILocation.uiSourceCode!==this._debuggerSourceCode||executionUILocation.uiSourceCode!==this._debuggerSourceCode){this._clearValueWidgets();return;}
var fromLine=functionUILocation.lineNumber;var fromColumn=functionUILocation.columnNumber;var toLine=executionUILocation.lineNumber;if(this._valueWidgets){for(var line of this._valueWidgets.keys())
toLine=Math.max(toLine,line+1);}
if(fromLine>=toLine||toLine-fromLine>500||fromLine<0||toLine>=this.textEditor.linesCount){this._clearValueWidgets();return;}
var valuesMap=new Map();for(var property of properties)
valuesMap.set(property.name,property.value);var namesPerLine=new Map();var skipObjectProperty=false;var tokenizer=new TextEditor.CodeMirrorUtils.TokenizerFactory().createTokenizer('text/javascript');tokenizer(this.textEditor.line(fromLine).substring(fromColumn),processToken.bind(this,fromLine));for(var i=fromLine+1;i<toLine;++i)
tokenizer(this.textEditor.line(i),processToken.bind(this,i));function processToken(lineNumber,tokenValue,tokenType,column,newColumn){if(!skipObjectProperty&&tokenType&&this._isIdentifier(tokenType)&&valuesMap.get(tokenValue)){var names=namesPerLine.get(lineNumber);if(!names){names=new Set();namesPerLine.set(lineNumber,names);}
names.add(tokenValue);}
skipObjectProperty=tokenValue==='.';}
this.textEditor.operation(this._renderDecorations.bind(this,valuesMap,namesPerLine,fromLine,toLine));}
_renderDecorations(valuesMap,namesPerLine,fromLine,toLine){var formatter=new ObjectUI.RemoteObjectPreviewFormatter();for(var i=fromLine;i<toLine;++i){var names=namesPerLine.get(i);var oldWidget=this._valueWidgets.get(i);if(!names){if(oldWidget){this._valueWidgets.delete(i);this.textEditor.removeDecoration(oldWidget,i);}
continue;}
var widget=createElementWithClass('div','text-editor-value-decoration');var base=this.textEditor.cursorPositionToCoordinates(i,0);var offset=this.textEditor.cursorPositionToCoordinates(i,this.textEditor.line(i).length);var codeMirrorLinesLeftPadding=4;var left=offset.x-base.x+codeMirrorLinesLeftPadding;widget.style.left=left+'px';widget.__nameToToken=new Map();var renderedNameCount=0;for(var name of names){if(renderedNameCount>10)
break;if(namesPerLine.get(i-1)&&namesPerLine.get(i-1).has(name))
continue;if(renderedNameCount)
widget.createTextChild(', ');var nameValuePair=widget.createChild('span');widget.__nameToToken.set(name,nameValuePair);nameValuePair.createTextChild(name+' = ');var value=valuesMap.get(name);var propertyCount=value.preview?value.preview.properties.length:0;var entryCount=value.preview&&value.preview.entries?value.preview.entries.length:0;if(value.preview&&propertyCount+entryCount<10){formatter.appendObjectPreview(nameValuePair,value.preview,false);}else{nameValuePair.appendChild(ObjectUI.ObjectPropertiesSection.createValueElement(value,false,false));}
++renderedNameCount;}
var widgetChanged=true;if(oldWidget){widgetChanged=false;for(var name of widget.__nameToToken.keys()){var oldText=oldWidget.__nameToToken.get(name)?oldWidget.__nameToToken.get(name).textContent:'';var newText=widget.__nameToToken.get(name)?widget.__nameToToken.get(name).textContent:'';if(newText!==oldText){widgetChanged=true;UI.runCSSAnimationOnce((widget.__nameToToken.get(name)),'source-frame-value-update-highlight');}}
if(widgetChanged){this._valueWidgets.delete(i);this.textEditor.removeDecoration(oldWidget,i);}}
if(widgetChanged){this._valueWidgets.set(i,widget);this.textEditor.addDecoration(widget,i);}}}
clearExecutionLine(){if(this.loaded&&this._executionLocation)
this.textEditor.clearExecutionLine();delete this._executionLocation;this._clearValueWidgetsTimer=setTimeout(this._clearValueWidgets.bind(this),1000);if(Runtime.experiments.isEnabled('continueToLocationMarkers'))
this._clearContinueToLocationsTimer=setTimeout(this._clearContinueToLocations.bind(this),1000);}
_clearValueWidgets(){delete this._clearValueWidgetsTimer;for(var line of this._valueWidgets.keys())
this.textEditor.removeDecoration(this._valueWidgets.get(line),line);this._valueWidgets.clear();}
_clearContinueToLocations(){delete this._clearContinueToLocationsTimer;var bookmarks=this.textEditor.bookmarks(this.textEditor.fullRange(),Sources.JavaScriptSourceFrame.continueToLocationDecorationSymbol);this.textEditor.operation(()=>bookmarks.map(bookmark=>bookmark.clear()));}
_lineBreakpointDecorations(lineNumber){return Array.from(this._breakpointDecorations).filter(decoration=>(decoration.handle.resolve()||{}).lineNumber===lineNumber);}
_breakpointDecoration(lineNumber,columnNumber){for(var decoration of this._breakpointDecorations){var location=decoration.handle.resolve();if(!location)
continue;if(location.lineNumber===lineNumber&&location.columnNumber===columnNumber)
return decoration;}
return null;}
_updateBreakpointDecoration(decoration){if(!this._scheduledBreakpointDecorationUpdates){this._scheduledBreakpointDecorationUpdates=new Set();setImmediate(()=>this.textEditor.operation(update.bind(this)));}
this._scheduledBreakpointDecorationUpdates.add(decoration);function update(){var lineNumbers=new Set();for(var decoration of this._scheduledBreakpointDecorationUpdates){var location=decoration.handle.resolve();if(!location)
continue;lineNumbers.add(location.lineNumber);}
delete this._scheduledBreakpointDecorationUpdates;for(var lineNumber of lineNumbers){this.textEditor.toggleLineClass(lineNumber,'cm-breakpoint',false);this.textEditor.toggleLineClass(lineNumber,'cm-breakpoint-disabled',false);this.textEditor.toggleLineClass(lineNumber,'cm-breakpoint-conditional',false);var decorations=this._lineBreakpointDecorations(lineNumber);var actualBookmarks=new Set(decorations.map(decoration=>decoration.bookmark).filter(bookmark=>!!bookmark));var lineEnd=this.textEditor.line(lineNumber).length;var bookmarks=this.textEditor.bookmarks(new Common.TextRange(lineNumber,0,lineNumber,lineEnd),Sources.JavaScriptSourceFrame.BreakpointDecoration.bookmarkSymbol);for(var bookmark of bookmarks){if(!actualBookmarks.has(bookmark))
bookmark.clear();}
if(!decorations.length)
continue;decorations.sort(Sources.JavaScriptSourceFrame.BreakpointDecoration.mostSpecificFirst);this.textEditor.toggleLineClass(lineNumber,'cm-breakpoint',true);this.textEditor.toggleLineClass(lineNumber,'cm-breakpoint-disabled',!decorations[0].enabled||this._muted);this.textEditor.toggleLineClass(lineNumber,'cm-breakpoint-conditional',!!decorations[0].condition);if(decorations.length>1){for(var decoration of decorations){decoration.update();if(!this._muted)
decoration.show();else
decoration.hide();}}else{decorations[0].update();decorations[0].hide();}}
this._breakpointDecorationsUpdatedForTest();}}
_breakpointDecorationsUpdatedForTest(){}
_inlineBreakpointClick(decoration,event){event.consume(true);if(decoration.breakpoint){if(event.shiftKey)
decoration.breakpoint.setEnabled(!decoration.breakpoint.enabled());else
decoration.breakpoint.remove();}else{var location=decoration.handle.resolve();if(!location)
return;this._setBreakpoint(location.lineNumber,location.columnNumber,decoration.condition,true);}}
_inlineBreakpointContextMenu(decoration,event){event.consume(true);var location=decoration.handle.resolve();if(!location)
return;var contextMenu=new UI.ContextMenu(event);if(decoration.breakpoint){contextMenu.appendItem(Common.UIString('Edit breakpoint\u2026'),this._editBreakpointCondition.bind(this,location.lineNumber,decoration.breakpoint,null));}else{contextMenu.appendItem(Common.UIString('Add conditional breakpoint\u2026'),this._editBreakpointCondition.bind(this,location.lineNumber,null,location));contextMenu.appendItem(Common.UIString('Never pause here'),this._setBreakpoint.bind(this,location.lineNumber,location.columnNumber,'false',true));}
contextMenu.show();}
_shouldIgnoreExternalBreakpointEvents(event){var uiLocation=(event.data.uiLocation);if(uiLocation.uiSourceCode!==this._debuggerSourceCode||!this.loaded)
return true;if(this._supportsEnabledBreakpointsWhileEditing())
return false;if(this._muted)
return true;var scriptFiles=this._scriptFileForDebuggerModel.valuesArray();for(var i=0;i<scriptFiles.length;++i){if(scriptFiles[i].isDivergingFromVM()||scriptFiles[i].isMergingToVM())
return true;}
return false;}
_breakpointAdded(event){if(this._shouldIgnoreExternalBreakpointEvents(event))
return;var uiLocation=(event.data.uiLocation);var breakpoint=(event.data.breakpoint);this._addBreakpoint(uiLocation,breakpoint);}
_addBreakpoint(uiLocation,breakpoint){var lineDecorations=this._lineBreakpointDecorations(uiLocation.lineNumber);var decoration=this._breakpointDecoration(uiLocation.lineNumber,uiLocation.columnNumber);if(decoration){decoration.breakpoint=breakpoint;decoration.condition=breakpoint.condition();decoration.enabled=breakpoint.enabled();}else{var handle=this.textEditor.textEditorPositionHandle(uiLocation.lineNumber,uiLocation.columnNumber);decoration=new Sources.JavaScriptSourceFrame.BreakpointDecoration(this.textEditor,handle,breakpoint.condition(),breakpoint.enabled(),breakpoint);decoration.element.addEventListener('click',this._inlineBreakpointClick.bind(this,decoration),true);decoration.element.addEventListener('contextmenu',this._inlineBreakpointContextMenu.bind(this,decoration),true);this._breakpointDecorations.add(decoration);}
this._decorationByBreakpoint.set(breakpoint,decoration);this._updateBreakpointDecoration(decoration);if(!lineDecorations.length){this._willAddInlineDecorationsForTest();this._breakpointManager.possibleBreakpoints(this._debuggerSourceCode,new Common.TextRange(uiLocation.lineNumber,0,uiLocation.lineNumber+1,0)).then(addInlineDecorations.bind(this,uiLocation.lineNumber));}
function addInlineDecorations(lineNumber,possibleLocations){var decorations=this._lineBreakpointDecorations(lineNumber);if(!decorations.some(decoration=>!!decoration.breakpoint)){this._didAddInlineDecorationsForTest(false);return;}
var columns=new Set();for(var decoration of decorations){var location=decoration.handle.resolve();if(!location)
continue;columns.add(location.columnNumber);}
var updateWasScheduled=false;for(var location of possibleLocations){if(columns.has(location.columnNumber))
continue;var handle=this.textEditor.textEditorPositionHandle(location.lineNumber,location.columnNumber);var decoration=new Sources.JavaScriptSourceFrame.BreakpointDecoration(this.textEditor,handle,'',false,null);decoration.element.addEventListener('click',this._inlineBreakpointClick.bind(this,decoration),true);decoration.element.addEventListener('contextmenu',this._inlineBreakpointContextMenu.bind(this,decoration),true);this._breakpointDecorations.add(decoration);updateWasScheduled=true;this._updateBreakpointDecoration(decoration);}
this._didAddInlineDecorationsForTest(updateWasScheduled);}}
_willAddInlineDecorationsForTest(){}
_didAddInlineDecorationsForTest(updateWasScheduled){}
_breakpointRemoved(event){if(this._shouldIgnoreExternalBreakpointEvents(event))
return;var uiLocation=(event.data.uiLocation);var breakpoint=(event.data.breakpoint);var decoration=this._decorationByBreakpoint.get(breakpoint);if(!decoration)
return;this._decorationByBreakpoint.delete(breakpoint);decoration.breakpoint=null;decoration.enabled=false;var lineDecorations=this._lineBreakpointDecorations(uiLocation.lineNumber);if(!lineDecorations.some(decoration=>!!decoration.breakpoint)){for(var lineDecoration of lineDecorations){this._breakpointDecorations.delete(lineDecoration);this._updateBreakpointDecoration(lineDecoration);}}else{this._updateBreakpointDecoration(decoration);}}
onBindingChanged(){this._updateDebuggerSourceCode();this._updateScriptFiles();this._refreshBreakpoints();var canLiveCompileJavascript=this._scriptFileForDebuggerModel.size||this._debuggerSourceCode.extension()==='js'||this._debuggerSourceCode.project().type()===Workspace.projectTypes.Snippets;if(!!canLiveCompileJavascript!==!!this._compiler)
this._compiler=canLiveCompileJavascript?new Sources.JavaScriptCompiler(this):null;this._showBlackboxInfobarIfNeeded();this._updateLinesWithoutMappingHighlight();}
_refreshBreakpoints(){if(!this.loaded)
return;for(var lineDecoration of this._breakpointDecorations.valuesArray()){this._breakpointDecorations.delete(lineDecoration);this._updateBreakpointDecoration(lineDecoration);}
var breakpointLocations=this._breakpointManager.breakpointLocationsForUISourceCode(this._debuggerSourceCode);for(var breakpointLocation of breakpointLocations)
this._addBreakpoint(breakpointLocation.uiLocation,breakpointLocation.breakpoint);}
_updateDebuggerSourceCode(){var binding=Persistence.persistence.binding(this.uiSourceCode());this._debuggerSourceCode=binding?binding.network:this.uiSourceCode();}
_onSourceMappingChanged(event){var data=(event.data);if(this._debuggerSourceCode!==data.uiSourceCode)
return;this._updateScriptFile(data.debuggerModel);this._updateLinesWithoutMappingHighlight();}
_updateLinesWithoutMappingHighlight(){var linesCount=this.textEditor.linesCount;for(var i=0;i<linesCount;++i){var lineHasMapping=Bindings.debuggerWorkspaceBinding.uiLineHasMapping(this._debuggerSourceCode,i);if(!lineHasMapping)
this._hasLineWithoutMapping=true;if(this._hasLineWithoutMapping)
this.textEditor.toggleLineClass(i,'cm-line-without-source-mapping',!lineHasMapping);}}
_updateScriptFiles(){for(var debuggerModel of SDK.targetManager.models(SDK.DebuggerModel)){var scriptFile=Bindings.debuggerWorkspaceBinding.scriptFile(this._debuggerSourceCode,debuggerModel);if(scriptFile)
this._updateScriptFile(debuggerModel);}}
_updateScriptFile(debuggerModel){var oldScriptFile=this._scriptFileForDebuggerModel.get(debuggerModel);var newScriptFile=Bindings.debuggerWorkspaceBinding.scriptFile(this._debuggerSourceCode,debuggerModel);this._scriptFileForDebuggerModel.delete(debuggerModel);if(oldScriptFile){oldScriptFile.removeEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM,this._didMergeToVM,this);oldScriptFile.removeEventListener(Bindings.ResourceScriptFile.Events.DidDivergeFromVM,this._didDivergeFromVM,this);if(this._muted&&!this.uiSourceCode().isDirty())
this._restoreBreakpointsIfConsistentScripts();}
if(newScriptFile)
this._scriptFileForDebuggerModel.set(debuggerModel,newScriptFile);if(newScriptFile){newScriptFile.addEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM,this._didMergeToVM,this);newScriptFile.addEventListener(Bindings.ResourceScriptFile.Events.DidDivergeFromVM,this._didDivergeFromVM,this);if(this.loaded)
newScriptFile.checkMapping();if(newScriptFile.hasSourceMapURL()){var sourceMapInfobar=UI.Infobar.create(UI.Infobar.Type.Info,Common.UIString('Source Map detected.'),Common.settings.createSetting('sourceMapInfobarDisabled',false));if(sourceMapInfobar){sourceMapInfobar.createDetailsRowMessage(Common.UIString('Associated files should be added to the file tree. You can debug these resolved source files as regular JavaScript files.'));sourceMapInfobar.createDetailsRowMessage(Common.UIString('Associated files are available via file tree or %s.',UI.shortcutRegistry.shortcutTitleForAction('sources.go-to-source')));this.attachInfobars([sourceMapInfobar]);}}}}
onTextEditorContentSet(){super.onTextEditorContentSet();if(this._executionLocation)
this.setExecutionLocation(this._executionLocation);var breakpointLocations=this._breakpointManager.breakpointLocationsForUISourceCode(this._debuggerSourceCode);for(var breakpointLocation of breakpointLocations)
this._addBreakpoint(breakpointLocation.uiLocation,breakpointLocation.breakpoint);var scriptFiles=this._scriptFileForDebuggerModel.valuesArray();for(var i=0;i<scriptFiles.length;++i)
scriptFiles[i].checkMapping();this._updateLinesWithoutMappingHighlight();this._detectMinified();}
_detectMinified(){if(this._prettyPrintInfobar)
return;var minified=false;for(var i=0;i<10&&i<this.textEditor.linesCount;++i){var line=this.textEditor.line(i);if(line.startsWith('//#'))
continue;if(line.length>500){minified=true;break;}}
if(!minified)
return;this._prettyPrintInfobar=UI.Infobar.create(UI.Infobar.Type.Info,Common.UIString('Pretty-print this minified file?'),Common.settings.createSetting('prettyPrintInfobarDisabled',false));if(!this._prettyPrintInfobar)
return;this._prettyPrintInfobar.setCloseCallback(()=>delete this._prettyPrintInfobar);var toolbar=new UI.Toolbar('');var button=new UI.ToolbarButton('','largeicon-pretty-print');toolbar.appendToolbarItem(button);toolbar.element.style.display='inline-block';toolbar.element.style.verticalAlign='middle';toolbar.element.style.marginBottom='3px';toolbar.element.style.pointerEvents='none';var element=this._prettyPrintInfobar.createDetailsRowMessage();element.appendChild(UI.formatLocalized('You can click the %s button on the bottom status bar, and continue debugging with the new formatted source.',[toolbar.element]));this.attachInfobars([this._prettyPrintInfobar]);}
_handleGutterClick(event){if(this._muted)
return;var eventData=(event.data);var lineNumber=eventData.lineNumber;var eventObject=eventData.event;if(eventObject.button!==0||eventObject.altKey||eventObject.ctrlKey||eventObject.metaKey)
return;this._toggleBreakpoint(lineNumber,eventObject.shiftKey);eventObject.consume(true);}
_toggleBreakpoint(lineNumber,onlyDisable){var decorations=this._lineBreakpointDecorations(lineNumber);if(!decorations.length){this._createNewBreakpoint(lineNumber,'',true);return;}
var hasDisabled=this.textEditor.hasLineClass(lineNumber,'cm-breakpoint-disabled');var breakpoints=decorations.map(decoration=>decoration.breakpoint).filter(breakpoint=>!!breakpoint);for(var breakpoint of breakpoints){if(onlyDisable)
breakpoint.setEnabled(hasDisabled);else
breakpoint.remove();}}
_createNewBreakpoint(lineNumber,condition,enabled){findPossibleBreakpoints.call(this,lineNumber).then(checkNextLineIfNeeded.bind(this,lineNumber,4)).then(setBreakpoint.bind(this,condition,enabled));function findPossibleBreakpoints(lineNumber){const maxLengthToCheck=1024;if(lineNumber>=this.textEditor.linesCount)
return Promise.resolve(([]));if(this.textEditor.line(lineNumber).length>=maxLengthToCheck)
return Promise.resolve(([]));return this._breakpointManager.possibleBreakpoints(this._debuggerSourceCode,new Common.TextRange(lineNumber,0,lineNumber+1,0)).then(locations=>locations.length?locations:null);}
function checkNextLineIfNeeded(currentLineNumber,linesToCheck,locations){if(locations||linesToCheck<=0)
return Promise.resolve(locations);return findPossibleBreakpoints.call(this,currentLineNumber+1).then(checkNextLineIfNeeded.bind(this,currentLineNumber+1,linesToCheck-1));}
function setBreakpoint(condition,enabled,locations){if(!locations||!locations.length)
this._setBreakpoint(lineNumber,0,condition,enabled);else
this._setBreakpoint(locations[0].lineNumber,locations[0].columnNumber,condition,enabled);Host.userMetrics.actionTaken(Host.UserMetrics.Action.ScriptsBreakpointSet);}}
toggleBreakpointOnCurrentLine(){if(this._muted)
return;var selection=this.textEditor.selection();if(!selection)
return;this._toggleBreakpoint(selection.startLine,false);}
_setBreakpoint(lineNumber,columnNumber,condition,enabled){if(!Bindings.debuggerWorkspaceBinding.uiLineHasMapping(this._debuggerSourceCode,lineNumber))
return;this._breakpointManager.setBreakpoint(this._debuggerSourceCode,lineNumber,columnNumber,condition,enabled);this._breakpointWasSetForTest(lineNumber,columnNumber,condition,enabled);}
_breakpointWasSetForTest(lineNumber,columnNumber,condition,enabled){}
dispose(){Bindings.debuggerWorkspaceBinding.removeEventListener(Bindings.DebuggerWorkspaceBinding.Events.SourceMappingChanged,this._onSourceMappingChanged,this);this._breakpointManager.removeEventListener(Bindings.BreakpointManager.Events.BreakpointAdded,this._breakpointAdded,this);this._breakpointManager.removeEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved,this._breakpointRemoved,this);this.uiSourceCode().removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this.uiSourceCode().removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);this.uiSourceCode().removeEventListener(Workspace.UISourceCode.Events.TitleChanged,this._showBlackboxInfobarIfNeeded,this);Common.moduleSetting('skipStackFramesPattern').removeChangeListener(this._showBlackboxInfobarIfNeeded,this);Common.moduleSetting('skipContentScripts').removeChangeListener(this._showBlackboxInfobarIfNeeded,this);super.dispose();}};Sources.JavaScriptSourceFrame.BreakpointDecoration=class{constructor(textEditor,handle,condition,enabled,breakpoint){this.textEditor=textEditor;this.handle=handle;this.condition=condition;this.enabled=enabled;this.breakpoint=breakpoint;this.element=UI.Icon.create('smallicon-inline-breakpoint');this.element.classList.toggle('cm-inline-breakpoint',true);this.bookmark=null;}
static mostSpecificFirst(decoration1,decoration2){if(decoration1.enabled!==decoration2.enabled)
return decoration1.enabled?-1:1;if(!!decoration1.condition!==!!decoration2.condition)
return!!decoration1.condition?-1:1;return 0;}
update(){if(!!this.condition)
this.element.setIconType('smallicon-inline-breakpoint');else
this.element.setIconType('smallicon-inline-breakpoint-conditional');this.element.classList.toggle('cm-inline-disabled',!this.enabled);}
show(){if(this.bookmark)
return;var location=this.handle.resolve();if(!location)
return;this.bookmark=this.textEditor.addBookmark(location.lineNumber,location.columnNumber,this.element,Sources.JavaScriptSourceFrame.BreakpointDecoration.bookmarkSymbol);this.bookmark[Sources.JavaScriptSourceFrame.BreakpointDecoration._elementSymbolForTest]=this.element;}
hide(){if(!this.bookmark)
return;this.bookmark.clear();this.bookmark=null;}};Sources.JavaScriptSourceFrame.BreakpointDecoration.bookmarkSymbol=Symbol('bookmark');Sources.JavaScriptSourceFrame.BreakpointDecoration._elementSymbolForTest=Symbol('element');Sources.JavaScriptSourceFrame.continueToLocationDecorationSymbol=Symbol('bookmark');;Sources.CSSSourceFrame=class extends SourceFrame.UISourceCodeFrame{constructor(uiSourceCode){super(uiSourceCode);this._registerShortcuts();this._swatchPopoverHelper=new InlineEditor.SwatchPopoverHelper();this._muteSwatchProcessing=false;this.configureAutocomplete({suggestionsCallback:this._cssSuggestions.bind(this),isWordChar:this._isWordChar.bind(this)});this.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.ScrollChanged,()=>{if(this._swatchPopoverHelper.isShowing())
this._swatchPopoverHelper.hide(true);});}
_registerShortcuts(){var shortcutKeys=UI.ShortcutsScreen.SourcesPanelShortcuts;for(var i=0;i<shortcutKeys.IncreaseCSSUnitByOne.length;++i)
this.addShortcut(shortcutKeys.IncreaseCSSUnitByOne[i].key,this._handleUnitModification.bind(this,1));for(var i=0;i<shortcutKeys.DecreaseCSSUnitByOne.length;++i)
this.addShortcut(shortcutKeys.DecreaseCSSUnitByOne[i].key,this._handleUnitModification.bind(this,-1));for(var i=0;i<shortcutKeys.IncreaseCSSUnitByTen.length;++i)
this.addShortcut(shortcutKeys.IncreaseCSSUnitByTen[i].key,this._handleUnitModification.bind(this,10));for(var i=0;i<shortcutKeys.DecreaseCSSUnitByTen.length;++i)
this.addShortcut(shortcutKeys.DecreaseCSSUnitByTen[i].key,this._handleUnitModification.bind(this,-10));}
_modifyUnit(unit,change){var unitValue=parseInt(unit,10);if(isNaN(unitValue))
return null;var tail=unit.substring((unitValue).toString().length);return String.sprintf('%d%s',unitValue+change,tail);}
_handleUnitModification(change){var selection=this.textEditor.selection().normalize();var token=this.textEditor.tokenAtTextPosition(selection.startLine,selection.startColumn);if(!token){if(selection.startColumn>0)
token=this.textEditor.tokenAtTextPosition(selection.startLine,selection.startColumn-1);if(!token)
return false;}
if(token.type!=='css-number')
return false;var cssUnitRange=new Common.TextRange(selection.startLine,token.startColumn,selection.startLine,token.endColumn);var cssUnitText=this.textEditor.text(cssUnitRange);var newUnitText=this._modifyUnit(cssUnitText,change);if(!newUnitText)
return false;this.textEditor.editRange(cssUnitRange,newUnitText);selection.startColumn=token.startColumn;selection.endColumn=selection.startColumn+newUnitText.length;this.textEditor.setSelection(selection);return true;}
_updateSwatches(startLine,endLine){var swatches=[];var swatchPositions=[];var regexes=[SDK.CSSMetadata.VariableRegex,SDK.CSSMetadata.URLRegex,UI.Geometry.CubicBezier.Regex,Common.Color.Regex];var handlers=new Map();handlers.set(Common.Color.Regex,this._createColorSwatch.bind(this));handlers.set(UI.Geometry.CubicBezier.Regex,this._createBezierSwatch.bind(this));for(var lineNumber=startLine;lineNumber<=endLine;lineNumber++){var line=this.textEditor.line(lineNumber).substring(0,Sources.CSSSourceFrame.maxSwatchProcessingLength);var results=Common.TextUtils.splitStringByRegexes(line,regexes);for(var i=0;i<results.length;i++){var result=results[i];if(result.regexIndex===-1||!handlers.has(regexes[result.regexIndex]))
continue;var delimiters=/[\s:;,(){}]/;var positionBefore=result.position-1;var positionAfter=result.position+result.value.length;if(positionBefore>=0&&!delimiters.test(line.charAt(positionBefore))||positionAfter<line.length&&!delimiters.test(line.charAt(positionAfter)))
continue;var swatch=handlers.get(regexes[result.regexIndex])(result.value);if(!swatch)
continue;swatches.push(swatch);swatchPositions.push(Common.TextRange.createFromLocation(lineNumber,result.position));}}
this.textEditor.operation(putSwatchesInline.bind(this));function putSwatchesInline(){var clearRange=new Common.TextRange(startLine,0,endLine,this.textEditor.line(endLine).length);this.textEditor.bookmarks(clearRange,Sources.CSSSourceFrame.SwatchBookmark).forEach(marker=>marker.clear());for(var i=0;i<swatches.length;i++){var swatch=swatches[i];var swatchPosition=swatchPositions[i];var bookmark=this.textEditor.addBookmark(swatchPosition.startLine,swatchPosition.startColumn,swatch,Sources.CSSSourceFrame.SwatchBookmark);swatch[Sources.CSSSourceFrame.SwatchBookmark]=bookmark;}}}
_createColorSwatch(text){var color=Common.Color.parse(text);if(!color)
return null;var swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);swatch.iconElement().title=Common.UIString('Open color picker.');swatch.iconElement().addEventListener('click',this._swatchIconClicked.bind(this,swatch),false);swatch.hideText(true);return swatch;}
_createBezierSwatch(text){if(!UI.Geometry.CubicBezier.parse(text))
return null;var swatch=InlineEditor.BezierSwatch.create();swatch.setBezierText(text);swatch.iconElement().title=Common.UIString('Open cubic bezier editor.');swatch.iconElement().addEventListener('click',this._swatchIconClicked.bind(this,swatch),false);swatch.hideText(true);return swatch;}
_swatchIconClicked(swatch,event){event.consume(true);this._hadSwatchChange=false;this._muteSwatchProcessing=true;var swatchPosition=swatch[Sources.CSSSourceFrame.SwatchBookmark].position();this.textEditor.setSelection(swatchPosition);this._editedSwatchTextRange=swatchPosition.clone();this._editedSwatchTextRange.endColumn+=swatch.textContent.length;this._currentSwatch=swatch;if(swatch instanceof InlineEditor.ColorSwatch)
this._showSpectrum(swatch);else if(swatch instanceof InlineEditor.BezierSwatch)
this._showBezierEditor(swatch);}
_showSpectrum(swatch){if(!this._spectrum){this._spectrum=new ColorPicker.Spectrum();this._spectrum.addEventListener(ColorPicker.Spectrum.Events.SizeChanged,this._spectrumResized,this);this._spectrum.addEventListener(ColorPicker.Spectrum.Events.ColorChanged,this._spectrumChanged,this);}
this._spectrum.setColor(swatch.color(),swatch.format());this._swatchPopoverHelper.show(this._spectrum,swatch.iconElement(),this._swatchPopoverHidden.bind(this));}
_spectrumResized(event){this._swatchPopoverHelper.reposition();}
_spectrumChanged(event){var colorString=(event.data);var color=Common.Color.parse(colorString);if(!color)
return;this._currentSwatch.setColor(color);this._changeSwatchText(colorString);}
_showBezierEditor(swatch){if(!this._bezierEditor){this._bezierEditor=new InlineEditor.BezierEditor();this._bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BezierChanged,this._bezierChanged,this);}
var cubicBezier=UI.Geometry.CubicBezier.parse(swatch.bezierText());if(!cubicBezier){cubicBezier=(UI.Geometry.CubicBezier.parse('linear'));}
this._bezierEditor.setBezier(cubicBezier);this._swatchPopoverHelper.show(this._bezierEditor,swatch.iconElement(),this._swatchPopoverHidden.bind(this));}
_bezierChanged(event){var bezierString=(event.data);this._currentSwatch.setBezierText(bezierString);this._changeSwatchText(bezierString);}
_changeSwatchText(text){this._hadSwatchChange=true;this.textEditor.editRange(this._editedSwatchTextRange,text,'*swatch-text-changed');this._editedSwatchTextRange.endColumn=this._editedSwatchTextRange.startColumn+text.length;}
_swatchPopoverHidden(commitEdit){this._muteSwatchProcessing=false;if(!commitEdit&&this._hadSwatchChange)
this.textEditor.undo();}
onTextEditorContentSet(){super.onTextEditorContentSet();if(!this._muteSwatchProcessing)
this._updateSwatches(0,this.textEditor.linesCount-1);}
onTextChanged(oldRange,newRange){super.onTextChanged(oldRange,newRange);if(!this._muteSwatchProcessing)
this._updateSwatches(newRange.startLine,newRange.endLine);}
_isWordChar(char){return Common.TextUtils.isWordChar(char)||char==='.'||char==='-'||char==='$';}
_cssSuggestions(prefixRange,substituteRange){var prefix=this.textEditor.text(prefixRange);if(prefix.startsWith('$'))
return null;var propertyToken=this._backtrackPropertyToken(prefixRange.startLine,prefixRange.startColumn-1);if(!propertyToken)
return null;var line=this.textEditor.line(prefixRange.startLine);var tokenContent=line.substring(propertyToken.startColumn,propertyToken.endColumn);var propertyValues=SDK.cssMetadata().propertyValues(tokenContent);return Promise.resolve(propertyValues.filter(value=>value.startsWith(prefix)).map(value=>({text:value})));}
_backtrackPropertyToken(lineNumber,columnNumber){var backtrackDepth=10;var tokenPosition=columnNumber;var line=this.textEditor.line(lineNumber);var seenColon=false;for(var i=0;i<backtrackDepth&&tokenPosition>=0;++i){var token=this.textEditor.tokenAtTextPosition(lineNumber,tokenPosition);if(!token)
return null;if(token.type==='css-property')
return seenColon?token:null;if(token.type&&!(token.type.indexOf('whitespace')!==-1||token.type.startsWith('css-comment')))
return null;if(!token.type&&line.substring(token.startColumn,token.endColumn)===':'){if(!seenColon)
seenColon=true;else
return null;}
tokenPosition=token.startColumn-1;}
return null;}};Sources.CSSSourceFrame.maxSwatchProcessingLength=300;Sources.CSSSourceFrame.SwatchBookmark=Symbol('swatch');;Sources.NavigatorView=class extends UI.VBox{constructor(){super();this.registerRequiredCSS('sources/navigatorView.css');this._scriptsTree=new UI.TreeOutlineInShadow();this._scriptsTree.registerRequiredCSS('sources/navigatorTree.css');this._scriptsTree.setComparator(Sources.NavigatorView._treeElementsCompare);this.element.appendChild(this._scriptsTree.element);this.setDefaultFocusedElement(this._scriptsTree.element);this._uiSourceCodeNodes=new Map();this._subfolderNodes=new Map();this._rootNode=new Sources.NavigatorRootTreeNode(this);this._rootNode.populate();this._frameNodes=new Map();this.element.addEventListener('contextmenu',this.handleContextMenu.bind(this),false);this._navigatorGroupByFolderSetting=Common.moduleSetting('navigatorGroupByFolder');this._navigatorGroupByFolderSetting.addChangeListener(this._groupingChanged.bind(this));this._initGrouping();SDK.targetManager.addModelListener(SDK.ResourceTreeModel,SDK.ResourceTreeModel.Events.FrameNavigated,this._frameNavigated,this);SDK.targetManager.addModelListener(SDK.ResourceTreeModel,SDK.ResourceTreeModel.Events.FrameDetached,this._frameDetached,this);if(Runtime.experiments.isEnabled('persistence2')){Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingCreated,this._onBindingChanged,this);Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved,this._onBindingChanged,this);}else{Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingCreated,this._onBindingCreated,this);Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved,this._onBindingRemoved,this);}
SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged,this._targetNameChanged,this);SDK.targetManager.observeTargets(this);this._resetWorkspace(Workspace.workspace);this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));}
static _treeElementOrder(treeElement){if(treeElement._boostOrder)
return 0;if(!Sources.NavigatorView._typeOrders){var weights={};var types=Sources.NavigatorView.Types;weights[types.Root]=1;weights[types.Domain]=10;weights[types.FileSystemFolder]=1;weights[types.NetworkFolder]=1;weights[types.SourceMapFolder]=2;weights[types.File]=10;weights[types.Frame]=70;weights[types.Worker]=90;weights[types.FileSystem]=100;Sources.NavigatorView._typeOrders=weights;}
var order=Sources.NavigatorView._typeOrders[treeElement._nodeType];if(treeElement._uiSourceCode){var contentType=treeElement._uiSourceCode.contentType();if(contentType.isDocument())
order+=3;else if(contentType.isScript())
order+=5;else if(contentType.isStyleSheet())
order+=10;else
order+=15;}
return order;}
static appendAddFolderItem(contextMenu){function addFolder(){Workspace.isolatedFileSystemManager.addFileSystem();}
var addFolderLabel=Common.UIString('Add folder to workspace');contextMenu.appendItem(addFolderLabel,addFolder);}
static appendSearchItem(contextMenu,path){function searchPath(){Sources.AdvancedSearchView.openSearch('',path.trim());}
var searchLabel=Common.UIString('Search in folder');if(!path||!path.trim()){path='*';searchLabel=Common.UIString('Search in all files');}
contextMenu.appendItem(searchLabel,searchPath);}
static _treeElementsCompare(treeElement1,treeElement2){var typeWeight1=Sources.NavigatorView._treeElementOrder(treeElement1);var typeWeight2=Sources.NavigatorView._treeElementOrder(treeElement2);if(typeWeight1>typeWeight2)
return 1;if(typeWeight1<typeWeight2)
return-1;return treeElement1.titleAsText().compareTo(treeElement2.titleAsText());}
_onBindingCreated(event){var binding=(event.data);this._removeUISourceCode(binding.network);}
_onBindingRemoved(event){var binding=(event.data);this._addUISourceCode(binding.network);}
_onBindingChanged(event){var binding=(event.data);var networkNodes=this._uiSourceCodeNodes.get(binding.network)||[];for(var networkNode of networkNodes)
networkNode.updateTitle();var fileSystemNodes=this._uiSourceCodeNodes.get(binding.fileSystem)||[];for(var fileSystemNode of fileSystemNodes)
fileSystemNode.updateTitle();var pathTokens=Persistence.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);var folderPath='';for(var i=0;i<pathTokens.length-1;++i){folderPath+=pathTokens[i];var folderId=this._folderNodeId(binding.fileSystem.project(),null,null,binding.fileSystem.origin(),folderPath);var folderNode=this._subfolderNodes.get(folderId);if(folderNode)
folderNode.updateTitle();folderPath+='/';}
var fileSystemRoot=this._rootNode.child(binding.fileSystem.project().id());if(fileSystemRoot)
fileSystemRoot.updateTitle();}
focus(){this._scriptsTree.focus();}
_resetWorkspace(workspace){this._workspace=workspace;this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved.bind(this),this);}
workspace(){return this._workspace;}
accept(uiSourceCode){return!uiSourceCode.project().isServiceProject();}
_uiSourceCodeFrame(uiSourceCode){var frame=Bindings.NetworkProject.frameForProject(uiSourceCode.project());if(!frame){var target=Bindings.NetworkProject.targetForProject(uiSourceCode.project());var resourceTreeModel=target&&SDK.ResourceTreeModel.fromTarget(target);frame=resourceTreeModel&&resourceTreeModel.mainFrame;}
return frame;}
_addUISourceCode(uiSourceCode){if(!this.accept(uiSourceCode))
return;var binding=Persistence.persistence.binding(uiSourceCode);if(!Runtime.experiments.isEnabled('persistence2')&&binding&&binding.network===uiSourceCode)
return;var isFromSourceMap=uiSourceCode.contentType().isFromSourceMap();var path;if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem)
path=Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0,-1);else
path=Common.ParsedURL.extractPath(uiSourceCode.url()).split('/').slice(1,-1);var project=uiSourceCode.project();var target=Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);var frame=this._uiSourceCodeFrame(uiSourceCode);var folderNode=this._folderNode(uiSourceCode,project,target,frame,uiSourceCode.origin(),path,isFromSourceMap);var uiSourceCodeNode=new Sources.NavigatorUISourceCodeTreeNode(this,uiSourceCode);this._uiSourceCodeNodes.set(uiSourceCode,[uiSourceCodeNode]);folderNode.appendChild(uiSourceCodeNode);this.uiSourceCodeAdded(uiSourceCode);}
uiSourceCodeAdded(uiSourceCode){}
_uiSourceCodeAdded(event){var uiSourceCode=(event.data);this._addUISourceCode(uiSourceCode);}
_uiSourceCodeRemoved(event){var uiSourceCode=(event.data);this._removeUISourceCode(uiSourceCode);}
_projectRemoved(event){var project=(event.data);var uiSourceCodes=project.uiSourceCodes();for(var i=0;i<uiSourceCodes.length;++i)
this._removeUISourceCode(uiSourceCodes[i]);}
_folderNodeId(project,target,frame,projectOrigin,path){var targetId=target?target.id():'';var projectId=project.type()===Workspace.projectTypes.FileSystem?project.id():'';var frameId=this._groupByFrame&&frame?frame.id:'';return targetId+':'+projectId+':'+frameId+':'+projectOrigin+':'+path;}
_folderNode(uiSourceCode,project,target,frame,projectOrigin,path,fromSourceMap){if(project.type()===Workspace.projectTypes.Snippets)
return this._rootNode;if(target&&!this._groupByFolder&&!fromSourceMap)
return this._domainNode(uiSourceCode,project,target,frame,projectOrigin);var folderPath=path.join('/');var folderId=this._folderNodeId(project,target,frame,projectOrigin,folderPath);var folderNode=this._subfolderNodes.get(folderId);if(folderNode)
return folderNode;if(!path.length){if(target)
return this._domainNode(uiSourceCode,project,target,frame,projectOrigin);var fileSystemNode=this._rootNode.child(project.id());if(!fileSystemNode){fileSystemNode=new Sources.NavigatorGroupTreeNode(this,project,project.id(),Sources.NavigatorView.Types.FileSystem,project.displayName());this._rootNode.appendChild(fileSystemNode);}
return fileSystemNode;}
var parentNode=this._folderNode(uiSourceCode,project,target,frame,projectOrigin,path.slice(0,-1),fromSourceMap);var type=fromSourceMap?Sources.NavigatorView.Types.SourceMapFolder:Sources.NavigatorView.Types.NetworkFolder;if(project.type()===Workspace.projectTypes.FileSystem)
type=Sources.NavigatorView.Types.FileSystemFolder;var name=path[path.length-1];folderNode=new Sources.NavigatorFolderTreeNode(this,project,folderId,type,folderPath,name);this._subfolderNodes.set(folderId,folderNode);parentNode.appendChild(folderNode);return folderNode;}
_domainNode(uiSourceCode,project,target,frame,projectOrigin){var frameNode=this._frameNode(project,target,frame);if(!this._groupByDomain)
return frameNode;var domainNode=frameNode.child(projectOrigin);if(domainNode)
return domainNode;domainNode=new Sources.NavigatorGroupTreeNode(this,project,projectOrigin,Sources.NavigatorView.Types.Domain,this._computeProjectDisplayName(target,projectOrigin));if(frame&&projectOrigin===Common.ParsedURL.extractOrigin(frame.url))
domainNode.treeNode()._boostOrder=true;frameNode.appendChild(domainNode);return domainNode;}
_frameNode(project,target,frame){if(!this._groupByFrame||!frame)
return this._targetNode(project,target);if(!frame.parentFrame&&target.parentTarget())
return this._targetNode(project,target);var frameNode=this._frameNodes.get(frame);if(frameNode)
return frameNode;frameNode=new Sources.NavigatorGroupTreeNode(this,project,target.id()+':'+frame.id,Sources.NavigatorView.Types.Frame,frame.displayName());frameNode.setHoverCallback(hoverCallback);this._frameNodes.set(frame,frameNode);this._frameNode(project,target,frame.parentFrame).appendChild(frameNode);if(!frame.parentFrame)
frameNode.treeNode()._boostOrder=true;function hoverCallback(hovered){if(hovered){var domModel=SDK.DOMModel.fromTarget(target);if(domModel)
domModel.highlightFrame(frame.id);}else{SDK.DOMModel.hideDOMNodeHighlight();}}
return frameNode;}
_targetNode(project,target){if(target===SDK.targetManager.mainTarget())
return this._rootNode;var targetNode=this._rootNode.child('target:'+target.id());if(!targetNode){targetNode=new Sources.NavigatorGroupTreeNode(this,project,'target:'+target.id(),!target.hasBrowserCapability()?Sources.NavigatorView.Types.Worker:Sources.NavigatorView.Types.Frame,target.name());this._rootNode.appendChild(targetNode);}
return targetNode;}
_computeProjectDisplayName(target,projectOrigin){for(var context of target.runtimeModel.executionContexts()){if(context.name&&context.origin&&projectOrigin.startsWith(context.origin))
return context.name;}
if(!projectOrigin)
return Common.UIString('(no domain)');var parsedURL=new Common.ParsedURL(projectOrigin);var prettyURL=parsedURL.isValid?parsedURL.host+(parsedURL.port?(':'+parsedURL.port):''):'';return(prettyURL||projectOrigin);}
revealUISourceCode(uiSourceCode,select){var nodes=this._uiSourceCodeNodes.get(uiSourceCode);if(!nodes)
return null;if(this._scriptsTree.selectedTreeElement)
this._scriptsTree.selectedTreeElement.deselect();this._lastSelectedUISourceCode=uiSourceCode;nodes[0].reveal(select);return nodes[0];}
_sourceSelected(uiSourceCode,focusSource){this._lastSelectedUISourceCode=uiSourceCode;Common.Revealer.reveal(uiSourceCode,!focusSource);}
sourceDeleted(uiSourceCode){}
_removeUISourceCode(uiSourceCode){var nodes=this._uiSourceCodeNodes.get(uiSourceCode)||[];for(var i=0;i<nodes.length;i++){var node=nodes[i];var project=uiSourceCode.project();var target=Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);var frame=this._uiSourceCodeFrame(uiSourceCode);var parentNode=node.parent;parentNode.removeChild(node);node=parentNode;while(node){parentNode=node.parent;if(!parentNode||!node.isEmpty())
break;if(!(node instanceof Sources.NavigatorGroupTreeNode||node instanceof Sources.NavigatorFolderTreeNode))
break;if(node._type===Sources.NavigatorView.Types.Frame){this._discardFrame((frame));break;}
var folderId=this._folderNodeId(project,target,frame,uiSourceCode.origin(),node._folderPath);this._subfolderNodes.delete(folderId);parentNode.removeChild(node);node=parentNode;}}
this._uiSourceCodeNodes.delete(uiSourceCode);}
reset(){for(var entry of this._uiSourceCodeNodes){var nodes=(entry[1]);for(var i=0;i<nodes.length;i++)
nodes[i].dispose();}
this._scriptsTree.removeChildren();this._uiSourceCodeNodes.clear();this._subfolderNodes.clear();this._frameNodes.clear();this._rootNode.reset();}
handleContextMenu(event){}
_handleContextMenuCreate(project,path,uiSourceCode){this.create(project,path,uiSourceCode);}
_handleContextMenuRename(node){this.rename(node,false);}
_handleContextMenuExclude(project,path){var shouldExclude=window.confirm(Common.UIString('Are you sure you want to exclude this folder?'));if(shouldExclude){UI.startBatchUpdate();project.excludeFolder(Persistence.FileSystemWorkspaceBinding.completeURL(project,path));UI.endBatchUpdate();}}
_handleContextMenuDelete(uiSourceCode){var shouldDelete=window.confirm(Common.UIString('Are you sure you want to delete this file?'));if(shouldDelete)
uiSourceCode.project().deleteFile(uiSourceCode);}
handleFileContextMenu(event,node){var uiSourceCode=node.uiSourceCode();var contextMenu=new UI.ContextMenu(event);contextMenu.appendApplicableItems(uiSourceCode);contextMenu.appendSeparator();var project=uiSourceCode.project();if(project.type()===Workspace.projectTypes.FileSystem){var parentURL=uiSourceCode.parentURL();contextMenu.appendItem(Common.UIString('Rename\u2026'),this._handleContextMenuRename.bind(this,node));contextMenu.appendItem(Common.UIString('Make a copy\u2026'),this._handleContextMenuCreate.bind(this,project,parentURL,uiSourceCode));contextMenu.appendItem(Common.UIString('Delete'),this._handleContextMenuDelete.bind(this,uiSourceCode));contextMenu.appendSeparator();}
contextMenu.show();}
handleFolderContextMenu(event,node){var path=node._folderPath;var project=node._project;var contextMenu=new UI.ContextMenu(event);Sources.NavigatorView.appendSearchItem(contextMenu,path);contextMenu.appendSeparator();if(project.type()!==Workspace.projectTypes.FileSystem)
return;contextMenu.appendItem(Common.UIString('New file'),this._handleContextMenuCreate.bind(this,project,path));contextMenu.appendItem(Common.UIString('Exclude folder'),this._handleContextMenuExclude.bind(this,project,path));function removeFolder(){var shouldRemove=window.confirm(Common.UIString('Are you sure you want to remove this folder?'));if(shouldRemove)
project.remove();}
contextMenu.appendSeparator();Sources.NavigatorView.appendAddFolderItem(contextMenu);if(node instanceof Sources.NavigatorGroupTreeNode)
contextMenu.appendItem(Common.UIString('Remove folder from workspace'),removeFolder);contextMenu.show();}
rename(node,deleteIfCanceled){var uiSourceCode=node.uiSourceCode();node.rename(callback.bind(this));function callback(committed){if(!committed){if(deleteIfCanceled)
uiSourceCode.remove();return;}
this._sourceSelected(uiSourceCode,true);}}
create(project,path,uiSourceCodeToCopy){function contentLoaded(content){createFile.call(this,content||'');}
if(uiSourceCodeToCopy)
uiSourceCodeToCopy.requestContent().then(contentLoaded.bind(this));else
createFile.call(this);function createFile(content){project.createFile(path,null,content||'',fileCreated.bind(this));}
function fileCreated(uiSourceCode){if(!uiSourceCode)
return;this._sourceSelected(uiSourceCode,false);var node=this.revealUISourceCode(uiSourceCode,true);if(node)
this.rename(node,true);}}
_groupingChanged(){this.reset();this._initGrouping();this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));}
_initGrouping(){this._groupByFrame=true;this._groupByDomain=this._navigatorGroupByFolderSetting.get();this._groupByFolder=this._groupByDomain;}
_resetForTest(){this.reset();this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));}
_frameNavigated(event){var frame=(event.data);var node=this._frameNodes.get(frame);if(!node)
return;node.treeNode().title=frame.displayName();for(var child of frame.childFrames)
this._discardFrame(child);}
_frameDetached(event){var frame=(event.data);this._discardFrame(frame);}
_discardFrame(frame){var node=this._frameNodes.get(frame);if(!node)
return;if(node.parent)
node.parent.removeChild(node);this._frameNodes.delete(frame);for(var child of frame.childFrames)
this._discardFrame(child);}
targetAdded(target){}
targetRemoved(target){var targetNode=this._rootNode.child('target:'+target.id());if(targetNode)
this._rootNode.removeChild(targetNode);}
_targetNameChanged(event){var target=(event.data);var targetNode=this._rootNode.child('target:'+target.id());if(targetNode)
targetNode.setTitle(target.name());}};Sources.NavigatorView.Types={Domain:'domain',File:'file',FileSystem:'fs',FileSystemFolder:'fs-folder',Frame:'frame',NetworkFolder:'nw-folder',Root:'root',SourceMapFolder:'sm-folder',Worker:'worker'};Sources.NavigatorFolderTreeElement=class extends UI.TreeElement{constructor(navigatorView,type,title,hoverCallback){super('',true);this.listItemElement.classList.add('navigator-'+type+'-tree-item','navigator-folder-tree-item');this._nodeType=type;this.title=title;this.tooltip=title;this._navigatorView=navigatorView;this._hoverCallback=hoverCallback;var iconType='largeicon-navigator-folder';if(type===Sources.NavigatorView.Types.Domain)
iconType='largeicon-navigator-domain';else if(type===Sources.NavigatorView.Types.Frame)
iconType='largeicon-navigator-frame';else if(type===Sources.NavigatorView.Types.Worker)
iconType='largeicon-navigator-worker';this.setLeadingIcons([UI.Icon.create(iconType,'icon')]);}
onpopulate(){this._node.populate();}
onattach(){this.collapse();this._node.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);this.listItemElement.addEventListener('mousemove',this._mouseMove.bind(this),false);this.listItemElement.addEventListener('mouseleave',this._mouseLeave.bind(this),false);}
setNode(node){this._node=node;var paths=[];while(node&&!node.isRoot()){paths.push(node._title);node=node.parent;}
paths.reverse();this.tooltip=paths.join('/');}
_handleContextMenuEvent(event){if(!this._node)
return;this.select();this._navigatorView.handleFolderContextMenu(event,this._node);}
_mouseMove(event){if(this._hovered||!this._hoverCallback)
return;this._hovered=true;this._hoverCallback(true);}
_mouseLeave(event){if(!this._hoverCallback)
return;this._hovered=false;this._hoverCallback(false);}};Sources.NavigatorSourceTreeElement=class extends UI.TreeElement{constructor(navigatorView,uiSourceCode,title,node){super('',false);this._nodeType=Sources.NavigatorView.Types.File;this._node=node;this.title=title;this.listItemElement.classList.add('navigator-'+uiSourceCode.contentType().name()+'-tree-item','navigator-file-tree-item');this.tooltip=uiSourceCode.url();this._navigatorView=navigatorView;this._uiSourceCode=uiSourceCode;this.updateIcon();}
updateIcon(){var binding=Persistence.persistence.binding(this._uiSourceCode);if(binding&&Runtime.experiments.isEnabled('persistence2')){var container=createElementWithClass('span','icon-stack');var icon=UI.Icon.create('largeicon-navigator-file-sync','icon');var badge=UI.Icon.create('badge-navigator-file-sync','icon-badge');container.appendChild(icon);container.appendChild(badge);container.title=Persistence.PersistenceUtils.tooltipForUISourceCode(this._uiSourceCode);this.setLeadingIcons([container]);}else{var iconType='largeicon-navigator-file';if(this._uiSourceCode.contentType()===Common.resourceTypes.Snippet)
iconType='largeicon-navigator-snippet';var defaultIcon=UI.Icon.create(iconType,'icon');this.setLeadingIcons([defaultIcon]);}}
get uiSourceCode(){return this._uiSourceCode;}
onattach(){this.listItemElement.draggable=true;this.listItemElement.addEventListener('click',this._onclick.bind(this),false);this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);this.listItemElement.addEventListener('dragstart',this._ondragstart.bind(this),false);}
_shouldRenameOnMouseDown(){if(!this._uiSourceCode.canRename())
return false;var isSelected=this===this.treeOutline.selectedTreeElement;return isSelected&&this.treeOutline.element.hasFocus()&&!UI.isBeingEdited(this.treeOutline.element);}
selectOnMouseDown(event){if(event.which!==1||!this._shouldRenameOnMouseDown()){super.selectOnMouseDown(event);return;}
setTimeout(rename.bind(this),300);function rename(){if(this._shouldRenameOnMouseDown())
this._navigatorView.rename(this._node,false);}}
_ondragstart(event){event.dataTransfer.setData('text/plain',this._uiSourceCode.url());event.dataTransfer.effectAllowed='copy';}
onspace(){this._navigatorView._sourceSelected(this.uiSourceCode,true);return true;}
_onclick(event){this._navigatorView._sourceSelected(this.uiSourceCode,false);}
ondblclick(event){var middleClick=event.button===1;this._navigatorView._sourceSelected(this.uiSourceCode,!middleClick);return false;}
onenter(){this._navigatorView._sourceSelected(this.uiSourceCode,true);return true;}
ondelete(){this._navigatorView.sourceDeleted(this.uiSourceCode);return true;}
_handleContextMenuEvent(event){this.select();this._navigatorView.handleFileContextMenu(event,this._node);}};Sources.NavigatorTreeNode=class{constructor(id,type){this.id=id;this._type=type;this._children=new Map();}
treeNode(){throw'Not implemented';}
dispose(){}
isRoot(){return false;}
hasChildren(){return true;}
onattach(){}
setTitle(title){throw'Not implemented';}
populate(){if(this.isPopulated())
return;if(this.parent)
this.parent.populate();this._populated=true;this.wasPopulated();}
wasPopulated(){var children=this.children();for(var i=0;i<children.length;++i)
this.treeNode().appendChild((children[i].treeNode()));}
didAddChild(node){if(this.isPopulated())
this.treeNode().appendChild((node.treeNode()));}
willRemoveChild(node){if(this.isPopulated())
this.treeNode().removeChild((node.treeNode()));}
isPopulated(){return this._populated;}
isEmpty(){return!this._children.size;}
children(){return this._children.valuesArray();}
child(id){return this._children.get(id)||null;}
appendChild(node){this._children.set(node.id,node);node.parent=this;this.didAddChild(node);}
removeChild(node){this.willRemoveChild(node);this._children.remove(node.id);delete node.parent;node.dispose();}
reset(){this._children.clear();}};Sources.NavigatorRootTreeNode=class extends Sources.NavigatorTreeNode{constructor(navigatorView){super('',Sources.NavigatorView.Types.Root);this._navigatorView=navigatorView;}
isRoot(){return true;}
treeNode(){return this._navigatorView._scriptsTree.rootElement();}};Sources.NavigatorUISourceCodeTreeNode=class extends Sources.NavigatorTreeNode{constructor(navigatorView,uiSourceCode){super(uiSourceCode.project().id()+':'+uiSourceCode.url(),Sources.NavigatorView.Types.File);this._navigatorView=navigatorView;this._uiSourceCode=uiSourceCode;this._treeElement=null;this._eventListeners=[];}
uiSourceCode(){return this._uiSourceCode;}
treeNode(){if(this._treeElement)
return this._treeElement;this._treeElement=new Sources.NavigatorSourceTreeElement(this._navigatorView,this._uiSourceCode,'',this);this.updateTitle();var updateTitleBound=this.updateTitle.bind(this,undefined);this._eventListeners=[this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged,updateTitleBound),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,updateTitleBound),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,updateTitleBound)];return this._treeElement;}
updateTitle(ignoreIsDirty){if(!this._treeElement)
return;var titleText=this._uiSourceCode.displayName();if(!ignoreIsDirty&&(this._uiSourceCode.isDirty()||Persistence.persistence.hasUnsavedCommittedChanges(this._uiSourceCode)))
titleText='*'+titleText;this._treeElement.title=titleText;this._treeElement.updateIcon();var tooltip=this._uiSourceCode.url();if(this._uiSourceCode.contentType().isFromSourceMap())
tooltip=Common.UIString('%s (from source map)',this._uiSourceCode.displayName());this._treeElement.tooltip=tooltip;}
hasChildren(){return false;}
dispose(){Common.EventTarget.removeEventListeners(this._eventListeners);}
reveal(select){this.parent.populate();this.parent.treeNode().expand();this._treeElement.reveal(true);if(select)
this._treeElement.select(true);}
rename(callback){if(!this._treeElement)
return;var treeOutlineElement=this._treeElement.treeOutline.element;UI.markBeingEdited(treeOutlineElement,true);function commitHandler(element,newTitle,oldTitle){if(newTitle!==oldTitle){this._treeElement.title=newTitle;this._uiSourceCode.rename(newTitle,renameCallback.bind(this));return;}
afterEditing.call(this,true);}
function renameCallback(success){if(!success){UI.markBeingEdited(treeOutlineElement,false);this.updateTitle();this.rename(callback);return;}
afterEditing.call(this,true);}
function afterEditing(committed){UI.markBeingEdited(treeOutlineElement,false);this.updateTitle();this._treeElement.treeOutline.focus();if(callback)
callback(committed);}
this.updateTitle(true);this._treeElement.startEditingTitle(new UI.InplaceEditor.Config(commitHandler.bind(this),afterEditing.bind(this,false)));}};Sources.NavigatorFolderTreeNode=class extends Sources.NavigatorTreeNode{constructor(navigatorView,project,id,type,folderPath,title){super(id,type);this._navigatorView=navigatorView;this._project=project;this._folderPath=folderPath;this._title=title;}
treeNode(){if(this._treeElement)
return this._treeElement;this._treeElement=this._createTreeElement(this._title,this);this.updateTitle();return this._treeElement;}
updateTitle(){if(!this._treeElement||this._project.type()!==Workspace.projectTypes.FileSystem)
return;var absoluteFileSystemPath=Persistence.FileSystemWorkspaceBinding.fileSystemPath(this._project.id())+'/'+this._folderPath;var hasMappedFiles=Runtime.experiments.isEnabled('persistence2')?Persistence.persistence.filePathHasBindings(absoluteFileSystemPath):true;this._treeElement.listItemElement.classList.toggle('has-mapped-files',hasMappedFiles);}
_createTreeElement(title,node){if(this._project.type()!==Workspace.projectTypes.FileSystem){try{title=decodeURI(title);}catch(e){}}
var treeElement=new Sources.NavigatorFolderTreeElement(this._navigatorView,this._type,title);treeElement.setNode(node);return treeElement;}
wasPopulated(){if(!this._treeElement||this._treeElement._node!==this)
return;this._addChildrenRecursive();}
_addChildrenRecursive(){var children=this.children();for(var i=0;i<children.length;++i){var child=children[i];this.didAddChild(child);if(child instanceof Sources.NavigatorFolderTreeNode)
child._addChildrenRecursive();}}
_shouldMerge(node){return this._type!==Sources.NavigatorView.Types.Domain&&node instanceof Sources.NavigatorFolderTreeNode;}
didAddChild(node){function titleForNode(node){return node._title;}
if(!this._treeElement)
return;var children=this.children();if(children.length===1&&this._shouldMerge(node)){node._isMerged=true;this._treeElement.title=this._treeElement.title+'/'+node._title;node._treeElement=this._treeElement;this._treeElement.setNode(node);return;}
var oldNode;if(children.length===2)
oldNode=children[0]!==node?children[0]:children[1];if(oldNode&&oldNode._isMerged){delete oldNode._isMerged;var mergedToNodes=[];mergedToNodes.push(this);var treeNode=this;while(treeNode._isMerged){treeNode=treeNode.parent;mergedToNodes.push(treeNode);}
mergedToNodes.reverse();var titleText=mergedToNodes.map(titleForNode).join('/');var nodes=[];treeNode=oldNode;do{nodes.push(treeNode);children=treeNode.children();treeNode=children.length===1?children[0]:null;}while(treeNode&&treeNode._isMerged);if(!this.isPopulated()){this._treeElement.title=titleText;this._treeElement.setNode(this);for(var i=0;i<nodes.length;++i){delete nodes[i]._treeElement;delete nodes[i]._isMerged;}
return;}
var oldTreeElement=this._treeElement;var treeElement=this._createTreeElement(titleText,this);for(var i=0;i<mergedToNodes.length;++i)
mergedToNodes[i]._treeElement=treeElement;oldTreeElement.parent.appendChild(treeElement);oldTreeElement.setNode(nodes[nodes.length-1]);oldTreeElement.title=nodes.map(titleForNode).join('/');oldTreeElement.parent.removeChild(oldTreeElement);this._treeElement.appendChild(oldTreeElement);if(oldTreeElement.expanded)
treeElement.expand();}
if(this.isPopulated())
this._treeElement.appendChild(node.treeNode());}
willRemoveChild(node){if(node._isMerged||!this.isPopulated())
return;this._treeElement.removeChild(node._treeElement);}};Sources.NavigatorGroupTreeNode=class extends Sources.NavigatorTreeNode{constructor(navigatorView,project,id,type,title){super(id,type);this._project=project;this._navigatorView=navigatorView;this._title=title;this.populate();}
setHoverCallback(hoverCallback){this._hoverCallback=hoverCallback;}
treeNode(){if(this._treeElement)
return this._treeElement;this._treeElement=new Sources.NavigatorFolderTreeElement(this._navigatorView,this._type,this._title,this._hoverCallback);this._treeElement.setNode(this);return this._treeElement;}
onattach(){this.updateTitle();}
updateTitle(){if(!this._treeElement||this._project.type()!==Workspace.projectTypes.FileSystem)
return;if(!Runtime.experiments.isEnabled('persistence2')){this._treeElement.listItemElement.classList.add('has-mapped-files');return;}
var fileSystemPath=Persistence.FileSystemWorkspaceBinding.fileSystemPath(this._project.id());var wasActive=this._treeElement.listItemElement.classList.contains('has-mapped-files');var isActive=Persistence.persistence.filePathHasBindings(fileSystemPath);if(wasActive===isActive)
return;this._treeElement.listItemElement.classList.toggle('has-mapped-files',isActive);if(isActive)
this._treeElement.expand();else
this._treeElement.collapse();}
setTitle(title){this._title=title;if(this._treeElement)
this._treeElement.title=this._title;}};;Sources.RevisionHistoryView=class extends UI.VBox{constructor(){super();this._uiSourceCodeItems=new Map();this._treeOutline=new UI.TreeOutlineInShadow();this._treeOutline.registerRequiredCSS('sources/revisionHistory.css');this._treeOutline.makeDense();this.element.appendChild(this._treeOutline.element);function populateRevisions(uiSourceCode){if(uiSourceCode.history().length)
this._createUISourceCodeItem(uiSourceCode);}
Workspace.workspace.uiSourceCodes().forEach(populateRevisions.bind(this));Workspace.workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyCommittedByUser,this._revisionAdded,this);Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);Workspace.workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved,this);}
static showHistory(uiSourceCode){UI.viewManager.showView('sources.history');var historyView=(self.runtime.sharedInstance(Sources.RevisionHistoryView));historyView._revealUISourceCode(uiSourceCode);}
_createUISourceCodeItem(uiSourceCode){var uiSourceCodeItem=new UI.TreeElement(uiSourceCode.displayName(),true);uiSourceCodeItem.selectable=false;var rootElement=this._treeOutline.rootElement();for(var i=0;i<rootElement.childCount();++i){if(rootElement.childAt(i).title.localeCompare(uiSourceCode.displayName())>0){rootElement.insertChild(uiSourceCodeItem,i);break;}}
if(i===rootElement.childCount())
rootElement.appendChild(uiSourceCodeItem);this._uiSourceCodeItems.set(uiSourceCode,uiSourceCodeItem);var history=uiSourceCode.history();var revisionCount=history.length;for(var i=revisionCount-1;i>=0;--i){var revision=history[i];var historyItem=new Sources.RevisionHistoryTreeElement(revision,history[i-1],i!==revisionCount-1);uiSourceCodeItem.appendChild(historyItem);}
var linkItem=new UI.TreeElement();linkItem.selectable=false;uiSourceCodeItem.appendChild(linkItem);var revertToOriginal=linkItem.listItemElement.createChild('span','revision-history-link revision-history-link-row');revertToOriginal.textContent=Common.UIString('apply original content');revertToOriginal.addEventListener('click',this._revertToOriginal.bind(this,uiSourceCode));var clearHistoryElement=uiSourceCodeItem.listItemElement.createChild('span','revision-history-link');clearHistoryElement.textContent=Common.UIString('revert');clearHistoryElement.addEventListener('click',this._clearHistory.bind(this,uiSourceCode));return uiSourceCodeItem;}
_revertToOriginal(uiSourceCode){uiSourceCode.revertToOriginal();}
_clearHistory(uiSourceCode){uiSourceCode.revertAndClearHistory(this._removeUISourceCode.bind(this));}
_revisionAdded(event){var uiSourceCode=(event.data.uiSourceCode);var uiSourceCodeItem=this._uiSourceCodeItems.get(uiSourceCode);if(!uiSourceCodeItem){uiSourceCodeItem=this._createUISourceCodeItem(uiSourceCode);return;}
var history=uiSourceCode.history();var historyItem=new Sources.RevisionHistoryTreeElement(history[history.length-1],history[history.length-2],false);if(uiSourceCodeItem.firstChild())
uiSourceCodeItem.firstChild().allowRevert();uiSourceCodeItem.insertChild(historyItem,0);}
_revealUISourceCode(uiSourceCode){var uiSourceCodeItem=this._uiSourceCodeItems.get(uiSourceCode);if(uiSourceCodeItem){uiSourceCodeItem.reveal();uiSourceCodeItem.expand();}}
_uiSourceCodeRemoved(event){var uiSourceCode=(event.data);this._removeUISourceCode(uiSourceCode);}
_removeUISourceCode(uiSourceCode){var uiSourceCodeItem=this._uiSourceCodeItems.get(uiSourceCode);if(!uiSourceCodeItem)
return;this._treeOutline.removeChild(uiSourceCodeItem);this._uiSourceCodeItems.remove(uiSourceCode);}
_projectRemoved(event){var project=event.data;project.uiSourceCodes().forEach(this._removeUISourceCode.bind(this));}};Sources.RevisionHistoryTreeElement=class extends UI.TreeElement{constructor(revision,baseRevision,allowRevert){super(revision.timestamp.toLocaleTimeString(),true);this.selectable=false;this._revision=revision;this._baseRevision=baseRevision;this._revertElement=createElement('span');this._revertElement.className='revision-history-link';this._revertElement.textContent=Common.UIString('apply revision content');this._revertElement.addEventListener('click',event=>{this._revision.revertToThis();},false);if(!allowRevert)
this._revertElement.classList.add('hidden');}
onattach(){this.listItemElement.classList.add('revision-history-revision');}
onpopulate(){this.listItemElement.appendChild(this._revertElement);this.childrenListElement.classList.add('source-code');Promise.all([this._baseRevision?this._baseRevision.requestContent():this._revision.uiSourceCode.requestOriginalContent(),this._revision.requestContent()]).spread(diff.bind(this));function diff(baseContent,newContent){var baseLines=baseContent.split('\n');var newLines=newContent.split('\n');var opcodes=Diff.Diff.lineDiff(baseLines,newLines);var lastWasSeparator=false;var baseLineNumber=0;var newLineNumber=0;for(var idx=0;idx<opcodes.length;idx++){var code=opcodes[idx][0];var rowCount=opcodes[idx][1].length;if(code===Diff.Diff.Operation.Equal){baseLineNumber+=rowCount;newLineNumber+=rowCount;if(!lastWasSeparator)
this._createLine(null,null,'    \u2026','separator');lastWasSeparator=true;}else if(code===Diff.Diff.Operation.Delete){lastWasSeparator=false;for(var i=0;i<rowCount;++i)
this._createLine(baseLineNumber+i,null,baseLines[baseLineNumber+i],'removed');baseLineNumber+=rowCount;}else if(code===Diff.Diff.Operation.Insert){lastWasSeparator=false;for(var i=0;i<rowCount;++i)
this._createLine(null,newLineNumber+i,newLines[newLineNumber+i],'added');newLineNumber+=rowCount;}}}}
oncollapse(){this._revertElement.remove();}
_createLine(baseLineNumber,newLineNumber,lineContent,changeType){var child=new UI.TreeElement();child.selectable=false;this.appendChild(child);function appendLineNumber(lineNumber){var numberString=lineNumber!==null?numberToStringWithSpacesPadding(lineNumber+1,4):spacesPadding(4);var lineNumberSpan=createElement('span');lineNumberSpan.classList.add('webkit-line-number');lineNumberSpan.textContent=numberString;child.listItemElement.appendChild(lineNumberSpan);}
appendLineNumber(baseLineNumber);appendLineNumber(newLineNumber);var contentSpan=createElement('span');contentSpan.textContent=lineContent;child.listItemElement.appendChild(contentSpan);child.listItemElement.classList.add('revision-history-line');contentSpan.classList.add('revision-history-line-'+changeType);}
allowRevert(){this._revertElement.classList.remove('hidden');}};;Sources.ScopeChainSidebarPane=class extends UI.VBox{constructor(){super();this._expandController=new ObjectUI.ObjectPropertiesSectionExpandController();this._linkifier=new Components.Linkifier();this._update();}
flavorChanged(object){this._update();}
_update(){var callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);var details=UI.context.flavor(SDK.DebuggerPausedDetails);this._linkifier.reset();Sources.SourceMapNamesResolver.resolveThisObject(callFrame).then(this._innerUpdate.bind(this,details,callFrame));}
_innerUpdate(details,callFrame,thisObject){this.element.removeChildren();if(!details||!callFrame){var infoElement=createElement('div');infoElement.className='gray-info-message';infoElement.textContent=Common.UIString('Not Paused');this.element.appendChild(infoElement);return;}
var foundLocalScope=false;var scopeChain=callFrame.scopeChain();for(var i=0;i<scopeChain.length;++i){var scope=scopeChain[i];var title=scope.typeName();var emptyPlaceholder=null;var extraProperties=[];switch(scope.type()){case Protocol.Debugger.ScopeType.Local:foundLocalScope=true;emptyPlaceholder=Common.UIString('No Variables');if(thisObject)
extraProperties.push(new SDK.RemoteObjectProperty('this',thisObject));if(i===0){var exception=details.exception();if(exception){extraProperties.push(new SDK.RemoteObjectProperty(Common.UIString.capitalize('Exception'),exception,undefined,undefined,undefined,undefined,undefined,true));}
var returnValue=callFrame.returnValue();if(returnValue){extraProperties.push(new SDK.RemoteObjectProperty(Common.UIString.capitalize('Return ^value'),returnValue,undefined,undefined,undefined,undefined,undefined,true));}}
break;case Protocol.Debugger.ScopeType.Closure:var scopeName=scope.name();if(scopeName)
title=Common.UIString('Closure (%s)',UI.beautifyFunctionName(scopeName));else
title=Common.UIString('Closure');emptyPlaceholder=Common.UIString('No Variables');break;}
var subtitle=scope.description();if(!title||title===subtitle)
subtitle=undefined;var titleElement=createElementWithClass('div','scope-chain-sidebar-pane-section-header');titleElement.createChild('div','scope-chain-sidebar-pane-section-subtitle').textContent=subtitle;titleElement.createChild('div','scope-chain-sidebar-pane-section-title').textContent=title;var section=new ObjectUI.ObjectPropertiesSection(Sources.SourceMapNamesResolver.resolveScopeInObject(scope),titleElement,this._linkifier,emptyPlaceholder,true,extraProperties);this._expandController.watchSection(title+(subtitle?':'+subtitle:''),section);if(scope.type()===Protocol.Debugger.ScopeType.Global)
section.objectTreeElement().collapse();else if(!foundLocalScope||scope.type()===Protocol.Debugger.ScopeType.Local)
section.objectTreeElement().expand();section.element.classList.add('scope-chain-sidebar-pane-section');this.element.appendChild(section.element);}
this._sidebarPaneUpdatedForTest();}
_sidebarPaneUpdatedForTest(){}};Sources.ScopeChainSidebarPane._pathSymbol=Symbol('path');;Sources.SourcesNavigatorView=class extends Sources.NavigatorView{constructor(){super();SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged,this._inspectedURLChanged,this);}
accept(uiSourceCode){if(!super.accept(uiSourceCode))
return false;return uiSourceCode.project().type()!==Workspace.projectTypes.ContentScripts&&uiSourceCode.project().type()!==Workspace.projectTypes.Snippets;}
_inspectedURLChanged(event){var mainTarget=SDK.targetManager.mainTarget();if(event.data!==mainTarget)
return;var inspectedURL=mainTarget&&mainTarget.inspectedURL();if(!inspectedURL)
return;for(var uiSourceCode of this.workspace().uiSourceCodes()){if(this.accept(uiSourceCode)&&uiSourceCode.url()===inspectedURL)
this.revealUISourceCode(uiSourceCode,true);}}
uiSourceCodeAdded(uiSourceCode){var mainTarget=SDK.targetManager.mainTarget();var inspectedURL=mainTarget&&mainTarget.inspectedURL();if(!inspectedURL)
return;if(uiSourceCode.url()===inspectedURL)
this.revealUISourceCode(uiSourceCode,true);}
handleContextMenu(event){var contextMenu=new UI.ContextMenu(event);Sources.NavigatorView.appendAddFolderItem(contextMenu);contextMenu.show();}};Sources.NetworkNavigatorView=class extends Sources.NavigatorView{constructor(){super();SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged,this._inspectedURLChanged,this);}
accept(uiSourceCode){return uiSourceCode.project().type()===Workspace.projectTypes.Network;}
_inspectedURLChanged(event){var mainTarget=SDK.targetManager.mainTarget();if(event.data!==mainTarget)
return;var inspectedURL=mainTarget&&mainTarget.inspectedURL();if(!inspectedURL)
return;for(var uiSourceCode of this.workspace().uiSourceCodes()){if(this.accept(uiSourceCode)&&uiSourceCode.url()===inspectedURL)
this.revealUISourceCode(uiSourceCode,true);}}
uiSourceCodeAdded(uiSourceCode){var mainTarget=SDK.targetManager.mainTarget();var inspectedURL=mainTarget&&mainTarget.inspectedURL();if(!inspectedURL)
return;if(uiSourceCode.url()===inspectedURL)
this.revealUISourceCode(uiSourceCode,true);}};Sources.FilesNavigatorView=class extends Sources.NavigatorView{constructor(){super();var toolbar=new UI.Toolbar('navigator-toolbar');var title=Common.UIString('Add folder to workspace');var addButton=new UI.ToolbarButton(title,'largeicon-add',title);addButton.addEventListener(UI.ToolbarButton.Events.Click,()=>Workspace.isolatedFileSystemManager.addFileSystem());toolbar.appendToolbarItem(addButton);this.element.insertBefore(toolbar.element,this.element.firstChild);}
accept(uiSourceCode){return uiSourceCode.project().type()===Workspace.projectTypes.FileSystem;}
handleContextMenu(event){var contextMenu=new UI.ContextMenu(event);Sources.NavigatorView.appendAddFolderItem(contextMenu);contextMenu.show();}};Sources.ContentScriptsNavigatorView=class extends Sources.NavigatorView{constructor(){super();}
accept(uiSourceCode){return uiSourceCode.project().type()===Workspace.projectTypes.ContentScripts;}};Sources.SnippetsNavigatorView=class extends Sources.NavigatorView{constructor(){super();var toolbar=new UI.Toolbar('navigator-toolbar');var newButton=new UI.ToolbarButton('','largeicon-add',Common.UIString('New Snippet'));newButton.addEventListener(UI.ToolbarButton.Events.Click,this._handleCreateSnippet.bind(this));toolbar.appendToolbarItem(newButton);this.element.insertBefore(toolbar.element,this.element.firstChild);}
accept(uiSourceCode){return uiSourceCode.project().type()===Workspace.projectTypes.Snippets;}
handleContextMenu(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('New'),this._handleCreateSnippet.bind(this));contextMenu.show();}
handleFileContextMenu(event,node){var uiSourceCode=node.uiSourceCode();var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Run'),this._handleEvaluateSnippet.bind(this,uiSourceCode));contextMenu.appendItem(Common.UIString('Rename'),this.rename.bind(this,node));contextMenu.appendItem(Common.UIString('Remove'),this._handleRemoveSnippet.bind(this,uiSourceCode));contextMenu.appendSeparator();contextMenu.appendItem(Common.UIString('New'),this._handleCreateSnippet.bind(this));contextMenu.appendSeparator();contextMenu.appendItem(Common.UIString('Save as...'),this._handleSaveAs.bind(this,uiSourceCode));contextMenu.show();}
_handleEvaluateSnippet(uiSourceCode){var executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext)
return;Snippets.scriptSnippetModel.evaluateScriptSnippet(executionContext,uiSourceCode);}
_handleSaveAs(uiSourceCode){if(uiSourceCode.project().type()!==Workspace.projectTypes.Snippets)
return;uiSourceCode.saveAs();}
_handleRemoveSnippet(uiSourceCode){if(uiSourceCode.project().type()!==Workspace.projectTypes.Snippets)
return;uiSourceCode.remove();}
_handleCreateSnippet(){this.create(Snippets.scriptSnippetModel.project(),'');}
sourceDeleted(uiSourceCode){this._handleRemoveSnippet(uiSourceCode);}};;Sources.StyleSheetOutlineDialog=class extends QuickOpen.FilteredListWidget.Provider{constructor(uiSourceCode,selectItemCallback){super();this._selectItemCallback=selectItemCallback;this._rules=[];Common.formatterWorkerPool.parseCSS(uiSourceCode.workingCopy(),(isLastChunk,rules)=>{this._rules.push(...rules);this.refresh();});}
static show(uiSourceCode,selectItemCallback){Sources.StyleSheetOutlineDialog._instanceForTests=new Sources.StyleSheetOutlineDialog(uiSourceCode,selectItemCallback);new QuickOpen.FilteredListWidget(Sources.StyleSheetOutlineDialog._instanceForTests).showAsDialog();}
itemCount(){return this._rules.length;}
itemKeyAt(itemIndex){var rule=this._rules[itemIndex];return rule.selectorText||rule.atRule;}
itemScoreAt(itemIndex,query){var rule=this._rules[itemIndex];return-rule.lineNumber;}
renderItem(itemIndex,query,titleElement,subtitleElement){var rule=this._rules[itemIndex];titleElement.textContent=rule.selectorText||rule.atRule;QuickOpen.FilteredListWidget.highlightRanges(titleElement,query);subtitleElement.textContent=':'+(rule.lineNumber+1);}
selectItem(itemIndex,promptValue){if(itemIndex===null)
return;var rule=this._rules[itemIndex];var lineNumber=rule.lineNumber;if(!isNaN(lineNumber)&&lineNumber>=0)
this._selectItemCallback(lineNumber,rule.columnNumber);}};;Sources.TabbedEditorContainerDelegate=function(){};Sources.TabbedEditorContainerDelegate.prototype={viewForFile(uiSourceCode){},};Sources.TabbedEditorContainer=class extends Common.Object{constructor(delegate,setting,placeholderText){super();this._delegate=delegate;this._tabbedPane=new UI.TabbedPane();this._tabbedPane.setPlaceholderText(placeholderText);this._tabbedPane.setTabDelegate(new Sources.EditorContainerTabDelegate(this));this._tabbedPane.setCloseableTabs(true);this._tabbedPane.setAllowTabReorder(true,true);this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed,this._tabClosed,this);this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected,this._tabSelected,this);Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingCreated,this._onBindingCreated,this);Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved,this._onBindingRemoved,this);this._tabIds=new Map();this._files={};this._previouslyViewedFilesSetting=setting;this._history=Sources.TabbedEditorContainer.History.fromObject(this._previouslyViewedFilesSetting.get());}
_onBindingCreated(event){var binding=(event.data);this._updateFileTitle(binding.fileSystem);var networkTabId=this._tabIds.get(binding.network);var fileSystemTabId=this._tabIds.get(binding.fileSystem);var wasSelectedInNetwork=this._currentFile===binding.network;var currentSelectionRange=this._history.selectionRange(binding.network.url());var currentScrollLineNumber=this._history.scrollLineNumber(binding.network.url());this._history.remove(binding.network.url());if(!networkTabId)
return;if(!fileSystemTabId){var tabIndex=this._tabbedPane.tabIndex(networkTabId);fileSystemTabId=this._appendFileTab(binding.fileSystem,false,tabIndex);var fileSystemTabView=(this._tabbedPane.tabView(fileSystemTabId));this._restoreEditorProperties(fileSystemTabView,currentSelectionRange,currentScrollLineNumber);}
this._closeTabs([networkTabId],true);if(wasSelectedInNetwork)
this._tabbedPane.selectTab(fileSystemTabId,false);this._updateHistory();}
_onBindingRemoved(event){var binding=(event.data);this._updateFileTitle(binding.fileSystem);}
get view(){return this._tabbedPane;}
get visibleView(){return this._tabbedPane.visibleView;}
fileViews(){return(this._tabbedPane.tabViews());}
leftToolbar(){return this._tabbedPane.leftToolbar();}
rightToolbar(){return this._tabbedPane.rightToolbar();}
show(parentElement){this._tabbedPane.show(parentElement);}
showFile(uiSourceCode){this._innerShowFile(uiSourceCode,true);}
closeFile(uiSourceCode){var tabId=this._tabIds.get(uiSourceCode);if(!tabId)
return;this._closeTabs([tabId]);}
closeAllFiles(){this._closeTabs(this._tabbedPane.allTabs());}
historyUISourceCodes(){var uriToUISourceCode={};for(var id in this._files){var uiSourceCode=this._files[id];uriToUISourceCode[uiSourceCode.url()]=uiSourceCode;}
var result=[];var uris=this._history._urls();for(var i=0;i<uris.length;++i){var uiSourceCode=uriToUISourceCode[uris[i]];if(uiSourceCode)
result.push(uiSourceCode);}
return result;}
_addViewListeners(){if(!this._currentView||!this._currentView.textEditor)
return;this._currentView.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.ScrollChanged,this._scrollChanged,this);this._currentView.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.SelectionChanged,this._selectionChanged,this);}
_removeViewListeners(){if(!this._currentView||!this._currentView.textEditor)
return;this._currentView.textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.ScrollChanged,this._scrollChanged,this);this._currentView.textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.SelectionChanged,this._selectionChanged,this);}
_scrollChanged(event){if(this._scrollTimer)
clearTimeout(this._scrollTimer);var lineNumber=(event.data);this._scrollTimer=setTimeout(saveHistory.bind(this),100);this._history.updateScrollLineNumber(this._currentFile.url(),lineNumber);function saveHistory(){this._history.save(this._previouslyViewedFilesSetting);}}
_selectionChanged(event){var range=(event.data);this._history.updateSelectionRange(this._currentFile.url(),range);this._history.save(this._previouslyViewedFilesSetting);}
_innerShowFile(uiSourceCode,userGesture){var binding=Persistence.persistence.binding(uiSourceCode);uiSourceCode=binding?binding.fileSystem:uiSourceCode;if(this._currentFile===uiSourceCode)
return;this._removeViewListeners();this._currentFile=uiSourceCode;var tabId=this._tabIds.get(uiSourceCode)||this._appendFileTab(uiSourceCode,userGesture);this._tabbedPane.selectTab(tabId,userGesture);if(userGesture)
this._editorSelectedByUserAction();var previousView=this._currentView;this._currentView=this.visibleView;this._addViewListeners();var eventData={currentFile:this._currentFile,currentView:this._currentView,previousView:previousView,userGesture:userGesture};this.dispatchEventToListeners(Sources.TabbedEditorContainer.Events.EditorSelected,eventData);}
_titleForFile(uiSourceCode){var maxDisplayNameLength=30;var title=uiSourceCode.displayName(true).trimMiddle(maxDisplayNameLength);if(uiSourceCode.isDirty()||Persistence.persistence.hasUnsavedCommittedChanges(uiSourceCode))
title+='*';return title;}
_maybeCloseTab(id,nextTabId){var uiSourceCode=this._files[id];var shouldPrompt=uiSourceCode.isDirty()&&uiSourceCode.project().canSetFileContent();if(!shouldPrompt||confirm(Common.UIString('Are you sure you want to close unsaved file: %s?',uiSourceCode.name()))){uiSourceCode.resetWorkingCopy();if(nextTabId)
this._tabbedPane.selectTab(nextTabId,true);this._tabbedPane.closeTab(id,true);return true;}
return false;}
_closeTabs(ids,forceCloseDirtyTabs){var dirtyTabs=[];var cleanTabs=[];for(var i=0;i<ids.length;++i){var id=ids[i];var uiSourceCode=this._files[id];if(!forceCloseDirtyTabs&&uiSourceCode.isDirty())
dirtyTabs.push(id);else
cleanTabs.push(id);}
if(dirtyTabs.length)
this._tabbedPane.selectTab(dirtyTabs[0],true);this._tabbedPane.closeTabs(cleanTabs,true);for(var i=0;i<dirtyTabs.length;++i){var nextTabId=i+1<dirtyTabs.length?dirtyTabs[i+1]:null;if(!this._maybeCloseTab(dirtyTabs[i],nextTabId))
break;}}
_onContextMenu(tabId,contextMenu){var uiSourceCode=this._files[tabId];if(uiSourceCode)
contextMenu.appendApplicableItems(uiSourceCode);}
addUISourceCode(uiSourceCode){var uri=uiSourceCode.url();var index=this._history.index(uri);if(index===-1)
return;if(!this._tabIds.has(uiSourceCode))
this._appendFileTab(uiSourceCode,false);if(!index){this._innerShowFile(uiSourceCode,false);return;}
if(!this._currentFile)
return;var currentProjectType=this._currentFile.project().type();var addedProjectType=uiSourceCode.project().type();var snippetsProjectType=Workspace.projectTypes.Snippets;if(this._history.index(this._currentFile.url())&&currentProjectType===snippetsProjectType&&addedProjectType!==snippetsProjectType)
this._innerShowFile(uiSourceCode,false);}
removeUISourceCode(uiSourceCode){this.removeUISourceCodes([uiSourceCode]);}
removeUISourceCodes(uiSourceCodes){var tabIds=[];for(var i=0;i<uiSourceCodes.length;++i){var uiSourceCode=uiSourceCodes[i];var tabId=this._tabIds.get(uiSourceCode);if(tabId)
tabIds.push(tabId);}
this._tabbedPane.closeTabs(tabIds);}
_editorClosedByUserAction(uiSourceCode){this._history.remove(uiSourceCode.url());this._updateHistory();}
_editorSelectedByUserAction(){this._updateHistory();}
_updateHistory(){var tabIds=this._tabbedPane.lastOpenedTabIds(Sources.TabbedEditorContainer.maximalPreviouslyViewedFilesCount);function tabIdToURI(tabId){return this._files[tabId].url();}
this._history.update(tabIds.map(tabIdToURI.bind(this)));this._history.save(this._previouslyViewedFilesSetting);}
_tooltipForFile(uiSourceCode){uiSourceCode=Persistence.persistence.fileSystem(uiSourceCode)||uiSourceCode;return uiSourceCode.url();}
_appendFileTab(uiSourceCode,userGesture,index){var view=this._delegate.viewForFile(uiSourceCode);var title=this._titleForFile(uiSourceCode);var tooltip=this._tooltipForFile(uiSourceCode);var tabId=this._generateTabId();this._tabIds.set(uiSourceCode,tabId);this._files[tabId]=uiSourceCode;var savedSelectionRange=this._history.selectionRange(uiSourceCode.url());var savedScrollLineNumber=this._history.scrollLineNumber(uiSourceCode.url());this._restoreEditorProperties(view,savedSelectionRange,savedScrollLineNumber);this._tabbedPane.appendTab(tabId,title,view,tooltip,userGesture,undefined,index);this._updateFileTitle(uiSourceCode);this._addUISourceCodeListeners(uiSourceCode);return tabId;}
_restoreEditorProperties(editorView,selection,firstLineNumber){var sourceFrame=editorView instanceof SourceFrame.SourceFrame?(editorView):null;if(!sourceFrame)
return;if(selection)
sourceFrame.setSelection(selection);if(typeof firstLineNumber==='number')
sourceFrame.scrollToLine(firstLineNumber);}
_tabClosed(event){var tabId=(event.data.tabId);var userGesture=(event.data.isUserGesture);var uiSourceCode=this._files[tabId];if(this._currentFile===uiSourceCode){this._removeViewListeners();delete this._currentView;delete this._currentFile;}
this._tabIds.remove(uiSourceCode);delete this._files[tabId];this._removeUISourceCodeListeners(uiSourceCode);this.dispatchEventToListeners(Sources.TabbedEditorContainer.Events.EditorClosed,uiSourceCode);if(userGesture)
this._editorClosedByUserAction(uiSourceCode);}
_tabSelected(event){var tabId=(event.data.tabId);var userGesture=(event.data.isUserGesture);var uiSourceCode=this._files[tabId];this._innerShowFile(uiSourceCode,userGesture);}
_addUISourceCodeListeners(uiSourceCode){uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged,this._uiSourceCodeTitleChanged,this);uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._uiSourceCodeWorkingCopyChanged,this);uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._uiSourceCodeWorkingCopyCommitted,this);}
_removeUISourceCodeListeners(uiSourceCode){uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged,this._uiSourceCodeTitleChanged,this);uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._uiSourceCodeWorkingCopyChanged,this);uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._uiSourceCodeWorkingCopyCommitted,this);}
_updateFileTitle(uiSourceCode){var tabId=this._tabIds.get(uiSourceCode);if(tabId){var title=this._titleForFile(uiSourceCode);this._tabbedPane.changeTabTitle(tabId,title);var icon=null;if(Persistence.persistence.hasUnsavedCommittedChanges(uiSourceCode)){icon=UI.Icon.create('smallicon-warning');icon.title=Common.UIString('Changes to this file were not saved to file system.');}else{icon=Persistence.PersistenceUtils.iconForUISourceCode(uiSourceCode);}
this._tabbedPane.setTabIcon(tabId,icon);}}
_uiSourceCodeTitleChanged(event){var uiSourceCode=(event.data);this._updateFileTitle(uiSourceCode);this._updateHistory();}
_uiSourceCodeWorkingCopyChanged(event){var uiSourceCode=(event.data);this._updateFileTitle(uiSourceCode);}
_uiSourceCodeWorkingCopyCommitted(event){var uiSourceCode=(event.data.uiSourceCode);this._updateFileTitle(uiSourceCode);}
_generateTabId(){return'tab_'+(Sources.TabbedEditorContainer._tabId++);}
currentFile(){return this._currentFile||null;}};Sources.TabbedEditorContainer.Events={EditorSelected:Symbol('EditorSelected'),EditorClosed:Symbol('EditorClosed')};Sources.TabbedEditorContainer._tabId=0;Sources.TabbedEditorContainer.maximalPreviouslyViewedFilesCount=30;Sources.TabbedEditorContainer.HistoryItem=class{constructor(url,selectionRange,scrollLineNumber){this.url=url;this._isSerializable=url.length<Sources.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit;this.selectionRange=selectionRange;this.scrollLineNumber=scrollLineNumber;}
static fromObject(serializedHistoryItem){var selectionRange=serializedHistoryItem.selectionRange?Common.TextRange.fromObject(serializedHistoryItem.selectionRange):undefined;return new Sources.TabbedEditorContainer.HistoryItem(serializedHistoryItem.url,selectionRange,serializedHistoryItem.scrollLineNumber);}
serializeToObject(){if(!this._isSerializable)
return null;var serializedHistoryItem={};serializedHistoryItem.url=this.url;serializedHistoryItem.selectionRange=this.selectionRange;serializedHistoryItem.scrollLineNumber=this.scrollLineNumber;return serializedHistoryItem;}};Sources.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit=4096;Sources.TabbedEditorContainer.History=class{constructor(items){this._items=items;this._rebuildItemIndex();}
static fromObject(serializedHistory){var items=[];for(var i=0;i<serializedHistory.length;++i)
items.push(Sources.TabbedEditorContainer.HistoryItem.fromObject(serializedHistory[i]));return new Sources.TabbedEditorContainer.History(items);}
index(url){return this._itemsIndex.has(url)?(this._itemsIndex.get(url)):-1;}
_rebuildItemIndex(){this._itemsIndex=new Map();for(var i=0;i<this._items.length;++i){console.assert(!this._itemsIndex.has(this._items[i].url));this._itemsIndex.set(this._items[i].url,i);}}
selectionRange(url){var index=this.index(url);return index!==-1?this._items[index].selectionRange:undefined;}
updateSelectionRange(url,selectionRange){if(!selectionRange)
return;var index=this.index(url);if(index===-1)
return;this._items[index].selectionRange=selectionRange;}
scrollLineNumber(url){var index=this.index(url);return index!==-1?this._items[index].scrollLineNumber:undefined;}
updateScrollLineNumber(url,scrollLineNumber){var index=this.index(url);if(index===-1)
return;this._items[index].scrollLineNumber=scrollLineNumber;}
update(urls){for(var i=urls.length-1;i>=0;--i){var index=this.index(urls[i]);var item;if(index!==-1){item=this._items[index];this._items.splice(index,1);}else{item=new Sources.TabbedEditorContainer.HistoryItem(urls[i]);}
this._items.unshift(item);this._rebuildItemIndex();}}
remove(url){var index=this.index(url);if(index!==-1){this._items.splice(index,1);this._rebuildItemIndex();}}
save(setting){setting.set(this._serializeToObject());}
_serializeToObject(){var serializedHistory=[];for(var i=0;i<this._items.length;++i){var serializedItem=this._items[i].serializeToObject();if(serializedItem)
serializedHistory.push(serializedItem);if(serializedHistory.length===Sources.TabbedEditorContainer.maximalPreviouslyViewedFilesCount)
break;}
return serializedHistory;}
_urls(){var result=[];for(var i=0;i<this._items.length;++i)
result.push(this._items[i].url);return result;}};Sources.EditorContainerTabDelegate=class{constructor(editorContainer){this._editorContainer=editorContainer;}
closeTabs(tabbedPane,ids){this._editorContainer._closeTabs(ids);}
onContextMenu(tabId,contextMenu){this._editorContainer._onContextMenu(tabId,contextMenu);}};;Sources.WatchExpressionsSidebarPane=class extends UI.ThrottledWidget{constructor(){super();this.registerRequiredCSS('object_ui/objectValue.css');this._watchExpressions=[];this._watchExpressionsSetting=Common.settings.createLocalSetting('watchExpressions',[]);this._addButton=new UI.ToolbarButton(Common.UIString('Add expression'),'largeicon-add');this._addButton.addEventListener(UI.ToolbarButton.Events.Click,this._addButtonClicked.bind(this));this._refreshButton=new UI.ToolbarButton(Common.UIString('Refresh'),'largeicon-refresh');this._refreshButton.addEventListener(UI.ToolbarButton.Events.Click,this.update,this);this._bodyElement=this.element.createChild('div','vbox watch-expressions');this._bodyElement.addEventListener('contextmenu',this._contextMenu.bind(this),false);this._expandController=new ObjectUI.ObjectPropertiesSectionExpandController();UI.context.addFlavorChangeListener(SDK.ExecutionContext,this.update,this);UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame,this.update,this);this._linkifier=new Components.Linkifier();this.update();}
toolbarItems(){return[this._addButton,this._refreshButton];}
hasExpressions(){return!!this._watchExpressionsSetting.get().length;}
_saveExpressions(){var toSave=[];for(var i=0;i<this._watchExpressions.length;i++){if(this._watchExpressions[i].expression())
toSave.push(this._watchExpressions[i].expression());}
this._watchExpressionsSetting.set(toSave);}
_addButtonClicked(){UI.viewManager.showView('sources.watch');this._createWatchExpression(null).startEditing();}
doUpdate(){this._linkifier.reset();this._bodyElement.removeChildren();this._watchExpressions=[];this._emptyElement=this._bodyElement.createChild('div','gray-info-message');this._emptyElement.textContent=Common.UIString('No Watch Expressions');var watchExpressionStrings=this._watchExpressionsSetting.get();for(var i=0;i<watchExpressionStrings.length;++i){var expression=watchExpressionStrings[i];if(!expression)
continue;this._createWatchExpression(expression);}
return Promise.resolve();}
_createWatchExpression(expression){this._emptyElement.classList.add('hidden');var watchExpression=new Sources.WatchExpression(expression,this._expandController,this._linkifier);watchExpression.addEventListener(Sources.WatchExpression.Events.ExpressionUpdated,this._watchExpressionUpdated,this);this._bodyElement.appendChild(watchExpression.element());this._watchExpressions.push(watchExpression);return watchExpression;}
_watchExpressionUpdated(event){var watchExpression=(event.data);if(!watchExpression.expression()){this._watchExpressions.remove(watchExpression);this._bodyElement.removeChild(watchExpression.element());this._emptyElement.classList.toggle('hidden',!!this._watchExpressions.length);}
this._saveExpressions();}
_contextMenu(event){var contextMenu=new UI.ContextMenu(event);this._populateContextMenu(contextMenu,event);contextMenu.show();}
_populateContextMenu(contextMenu,event){var isEditing=false;for(var watchExpression of this._watchExpressions)
isEditing|=watchExpression.isEditing();if(!isEditing)
contextMenu.appendItem(Common.UIString.capitalize('Add ^watch ^expression'),this._addButtonClicked.bind(this));if(this._watchExpressions.length>1){contextMenu.appendItem(Common.UIString.capitalize('Delete ^all ^watch ^expressions'),this._deleteAllButtonClicked.bind(this));}
var target=event.deepElementFromPoint();if(!target)
return;for(var watchExpression of this._watchExpressions){if(watchExpression.element().isSelfOrAncestor(target))
watchExpression._populateContextMenu(contextMenu,event);}}
_deleteAllButtonClicked(){this._watchExpressions=[];this._saveExpressions();this.update();}
handleAction(context,actionId){var frame=UI.context.flavor(SourceFrame.UISourceCodeFrame);if(!frame)
return false;var text=frame.textEditor.text(frame.textEditor.selection());UI.viewManager.showView('sources.watch');this.doUpdate();this._createWatchExpression(text);this._saveExpressions();return true;}
appendApplicableItems(event,contextMenu,target){contextMenu.appendAction('sources.add-to-watch');}};Sources.WatchExpression=class extends Common.Object{constructor(expression,expandController,linkifier){super();this._expression=expression;this._expandController=expandController;this._element=createElementWithClass('div','watch-expression monospace');this._editing=false;this._linkifier=linkifier;this._createWatchExpression(null);this.update();}
element(){return this._element;}
expression(){return this._expression;}
update(){var currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(currentExecutionContext&&this._expression){currentExecutionContext.evaluate(this._expression,Sources.WatchExpression._watchObjectGroupId,false,true,false,false,false,this._createWatchExpression.bind(this));}}
startEditing(){this._editing=true;this._element.removeChild(this._objectPresentationElement);var newDiv=this._element.createChild('div');newDiv.textContent=this._nameElement.textContent;this._textPrompt=new ObjectUI.ObjectPropertyPrompt();this._textPrompt.renderAsBlock();var proxyElement=this._textPrompt.attachAndStartEditing(newDiv,this._finishEditing.bind(this));proxyElement.classList.add('watch-expression-text-prompt-proxy');proxyElement.addEventListener('keydown',this._promptKeyDown.bind(this),false);this._element.getComponentSelection().selectAllChildren(newDiv);}
isEditing(){return!!this._editing;}
_finishEditing(event,canceled){if(event)
event.consume(true);this._editing=false;this._textPrompt.detach();var newExpression=canceled?this._expression:this._textPrompt.text();delete this._textPrompt;this._element.removeChildren();this._element.appendChild(this._objectPresentationElement);this._updateExpression(newExpression);}
_dblClickOnWatchExpression(event){event.consume();if(!this.isEditing())
this.startEditing();}
_updateExpression(newExpression){if(this._expression)
this._expandController.stopWatchSectionsWithId(this._expression);this._expression=newExpression;this.update();this.dispatchEventToListeners(Sources.WatchExpression.Events.ExpressionUpdated,this);}
_deleteWatchExpression(event){event.consume(true);this._updateExpression(null);}
_createWatchExpression(result,exceptionDetails){this._result=result;var headerElement=createElementWithClass('div','watch-expression-header');var deleteButton=headerElement.createChild('button','watch-expression-delete-button');deleteButton.title=Common.UIString('Delete watch expression');deleteButton.addEventListener('click',this._deleteWatchExpression.bind(this),false);var titleElement=headerElement.createChild('div','watch-expression-title');this._nameElement=ObjectUI.ObjectPropertiesSection.createNameElement(this._expression);if(!!exceptionDetails||!result){this._valueElement=createElementWithClass('span','watch-expression-error value');titleElement.classList.add('dimmed');this._valueElement.textContent=Common.UIString('<not available>');}else{this._valueElement=ObjectUI.ObjectPropertiesSection.createValueElementWithCustomSupport(result,!!exceptionDetails,false,titleElement,this._linkifier);}
var separatorElement=createElementWithClass('span','watch-expressions-separator');separatorElement.textContent=': ';titleElement.appendChildren(this._nameElement,separatorElement,this._valueElement);this._element.removeChildren();this._objectPropertiesSection=null;if(!exceptionDetails&&result&&result.hasChildren&&!result.customPreview()){headerElement.classList.add('watch-expression-object-header');this._objectPropertiesSection=new ObjectUI.ObjectPropertiesSection(result,headerElement,this._linkifier);this._objectPresentationElement=this._objectPropertiesSection.element;this._expandController.watchSection((this._expression),this._objectPropertiesSection);var objectTreeElement=this._objectPropertiesSection.objectTreeElement();objectTreeElement.toggleOnClick=false;objectTreeElement.listItemElement.addEventListener('click',this._onSectionClick.bind(this),false);objectTreeElement.listItemElement.addEventListener('dblclick',this._dblClickOnWatchExpression.bind(this));}else{this._objectPresentationElement=headerElement;this._objectPresentationElement.addEventListener('dblclick',this._dblClickOnWatchExpression.bind(this));}
this._element.appendChild(this._objectPresentationElement);}
_onSectionClick(event){event.consume(true);if(event.detail===1){this._preventClickTimeout=setTimeout(handleClick.bind(this),333);}else{clearTimeout(this._preventClickTimeout);delete this._preventClickTimeout;}
function handleClick(){if(!this._objectPropertiesSection)
return;var objectTreeElement=this._objectPropertiesSection.objectTreeElement();if(objectTreeElement.expanded)
objectTreeElement.collapse();else
objectTreeElement.expand();}}
_promptKeyDown(event){if(isEnterKey(event)||isEscKey(event))
this._finishEditing(event,isEscKey(event));}
_populateContextMenu(contextMenu,event){if(!this.isEditing()){contextMenu.appendItem(Common.UIString.capitalize('Delete ^watch ^expression'),this._updateExpression.bind(this,null));}
if(!this.isEditing()&&this._result&&(this._result.type==='number'||this._result.type==='string'))
contextMenu.appendItem(Common.UIString.capitalize('Copy ^value'),this._copyValueButtonClicked.bind(this));var target=event.deepElementFromPoint();if(target&&this._valueElement.isSelfOrAncestor(target))
contextMenu.appendApplicableItems(this._result);}
_copyValueButtonClicked(){InspectorFrontendHost.copyText(this._valueElement.textContent);}};Sources.WatchExpression._watchObjectGroupId='watch-group';Sources.WatchExpression.Events={ExpressionUpdated:Symbol('ExpressionUpdated')};;Sources.ThreadsSidebarPane=class extends UI.VBox{constructor(){super(true);this.registerRequiredCSS('sources/threadsSidebarPane.css');this._list=new UI.ListControl(this,UI.ListMode.NonViewport);this.contentElement.appendChild(this._list.element);this._availableNodeTargetsElement=this.contentElement.createChild('div','hidden available-node-targets');UI.context.addFlavorChangeListener(SDK.Target,this._targetFlavorChanged,this);SDK.targetManager.addEventListener(SDK.TargetManager.Events.AvailableNodeTargetsChanged,this._availableNodeTargetsChanged,this);this._availableNodeTargetsChanged();SDK.targetManager.observeModels(SDK.DebuggerModel,this);}
static shouldBeShown(){var minJSTargets=Runtime.queryParam('nodeFrontend')?1:2;if(SDK.targetManager.models(SDK.DebuggerModel).length>=minJSTargets)
return true;return!!SDK.targetManager.availableNodeTargetsCount();}
_availableNodeTargetsChanged(){var count=SDK.targetManager.availableNodeTargetsCount();if(!count){this._availableNodeTargetsElement.classList.add('hidden');return;}
this._availableNodeTargetsElement.removeChildren();this._availableNodeTargetsElement.createTextChild(count===1?Common.UIString('Node instance available.'):Common.UIString('%d Node instances available.',count));var link=this._availableNodeTargetsElement.createChild('span','link');link.textContent=Common.UIString('Connect');link.addEventListener('click',()=>{InspectorFrontendHost.openNodeFrontend();},false);this._availableNodeTargetsElement.classList.remove('hidden');}
createElementForItem(debuggerModel){var element=createElementWithClass('div','thread-item');var title=element.createChild('div','thread-item-title');var pausedState=element.createChild('div','thread-item-paused-state');element.appendChild(UI.Icon.create('smallicon-thick-right-arrow','selected-thread-icon'));function updateTitle(){var executionContext=debuggerModel.target().runtimeModel.defaultExecutionContext();title.textContent=executionContext&&executionContext.label()?executionContext.label():debuggerModel.target().name();}
function updatePausedState(){pausedState.textContent=Common.UIString(debuggerModel.isPaused()?'paused':'');}
function targetNameChanged(event){var target=(event.data);if(target===debuggerModel.target())
updateTitle();}
debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused,updatePausedState);debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerResumed,updatePausedState);debuggerModel.target().runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextChanged,updateTitle);SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged,targetNameChanged);updatePausedState();updateTitle();return element;}
heightForItem(debuggerModel){console.assert(false);return 0;}
isItemSelectable(debuggerModel){return true;}
selectedItemChanged(from,to,fromElement,toElement){if(fromElement)
fromElement.classList.remove('selected');if(toElement)
toElement.classList.add('selected');if(to)
UI.context.setFlavor(SDK.Target,to.target());}
modelAdded(debuggerModel){this._list.pushItem(debuggerModel);var currentTarget=UI.context.flavor(SDK.Target);if(currentTarget===debuggerModel.target())
this._list.selectItem(debuggerModel);}
modelRemoved(debuggerModel){this._list.removeItem(debuggerModel);}
_targetFlavorChanged(event){var target=(event.data);var debuggerModel=target.model(SDK.DebuggerModel);if(debuggerModel)
this._list.selectItem(debuggerModel);}};;Sources.FormatterScriptMapping=class{constructor(debuggerModel,editorAction){this._debuggerModel=debuggerModel;this._editorAction=editorAction;}
rawLocationToUILocation(rawLocation){var debuggerModelLocation=(rawLocation);var script=debuggerModelLocation.script();if(!script)
return null;var uiSourceCode=this._editorAction._uiSourceCodes.get(script);if(!uiSourceCode)
return null;var formatData=this._editorAction._formatData.get(uiSourceCode);if(!formatData)
return null;var mapping=formatData.mapping;var lineNumber=debuggerModelLocation.lineNumber;var columnNumber=debuggerModelLocation.columnNumber||0;var formattedLocation=mapping.originalToFormatted(lineNumber,columnNumber);return uiSourceCode.uiLocation(formattedLocation[0],formattedLocation[1]);}
uiLocationToRawLocation(uiSourceCode,lineNumber,columnNumber){var formatData=this._editorAction._formatData.get(uiSourceCode);if(!formatData)
return null;var originalLocation=formatData.mapping.formattedToOriginal(lineNumber,columnNumber);for(var i=0;i<formatData.scripts.length;++i){if(formatData.scripts[i].debuggerModel===this._debuggerModel)
return this._debuggerModel.createRawLocation(formatData.scripts[i],originalLocation[0],originalLocation[1]);}
return null;}
isIdentity(){return false;}
uiLineHasMapping(uiSourceCode,lineNumber){return true;}};Sources.FormatterScriptMapping.FormatData=class{constructor(projectId,path,mapping,scripts){this.projectId=projectId;this.path=path;this.mapping=mapping;this.scripts=scripts;}};Sources.ScriptFormatterEditorAction=class{constructor(){this._projectId='formatter:';this._project=new Bindings.ContentProviderBasedProject(Workspace.workspace,this._projectId,Workspace.projectTypes.Formatter,'formatter',true);this._uiSourceCodes=new Map();this._formattedPaths=new Map();this._formatData=new Map();this._pathsToFormatOnLoad=new Set();this._scriptMappingByDebuggerModel=new Map();this._workspace=Workspace.workspace;SDK.targetManager.observeModels(SDK.DebuggerModel,this);}
modelAdded(debuggerModel){this._scriptMappingByDebuggerModel.set(debuggerModel,new Sources.FormatterScriptMapping(debuggerModel,this));debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared,this._debuggerReset,this);}
modelRemoved(debuggerModel){this._scriptMappingByDebuggerModel.remove(debuggerModel);this._cleanForModel(debuggerModel);debuggerModel.removeEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared,this._debuggerReset,this);}
_editorSelected(event){var uiSourceCode=(event.data);this._updateButton(uiSourceCode);var path=uiSourceCode.project().id()+':'+uiSourceCode.url();if(this._isFormatableScript(uiSourceCode)&&this._pathsToFormatOnLoad.has(path)&&!this._formattedPaths.get(path))
this._formatUISourceCodeScript(uiSourceCode);}
_editorClosed(event){var uiSourceCode=(event.data.uiSourceCode);var wasSelected=(event.data.wasSelected);if(wasSelected)
this._updateButton(null);this._discardFormattedUISourceCodeScript(uiSourceCode);}
_updateButton(uiSourceCode){this._button.element.classList.toggle('hidden',!this._isFormatableScript(uiSourceCode));}
button(sourcesView){if(this._button)
return this._button;this._sourcesView=sourcesView;this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorClosed,this._editorClosed.bind(this));this._button=new UI.ToolbarButton(Common.UIString('Pretty print'),'largeicon-pretty-print');this._button.addEventListener(UI.ToolbarButton.Events.Click,this._toggleFormatScriptSource,this);this._updateButton(sourcesView.currentUISourceCode());return this._button;}
_isFormatableScript(uiSourceCode){if(!uiSourceCode)
return false;if(uiSourceCode.project().canSetFileContent())
return false;if(uiSourceCode.project().type()===Workspace.projectTypes.Formatter)
return false;if(Persistence.persistence.binding(uiSourceCode))
return false;return uiSourceCode.contentType().hasScripts();}
_toggleFormatScriptSource(event){var uiSourceCode=this._sourcesView.currentUISourceCode();if(this._isFormatableScript(uiSourceCode))
this._formatUISourceCodeScript(uiSourceCode);}
_showIfNeeded(uiSourceCode,formattedUISourceCode,mapping){if(uiSourceCode!==this._sourcesView.currentUISourceCode())
return;var sourceFrame=this._sourcesView.viewForFile(uiSourceCode);var start=[0,0];if(sourceFrame){var selection=sourceFrame.selection();start=mapping.originalToFormatted(selection.startLine,selection.startColumn);}
this._sourcesView.showSourceLocation(formattedUISourceCode,start[0],start[1]);this._updateButton(formattedUISourceCode);}
_discardFormattedUISourceCodeScript(formattedUISourceCode){var formatData=this._formatData.get(formattedUISourceCode);if(!formatData)
return;this._formatData.remove(formattedUISourceCode);var path=formatData.projectId+':'+formatData.path;this._formattedPaths.remove(path);this._pathsToFormatOnLoad.delete(path);for(var i=0;i<formatData.scripts.length;++i){this._uiSourceCodes.remove(formatData.scripts[i]);Bindings.debuggerWorkspaceBinding.popSourceMapping(formatData.scripts[i]);}
this._project.removeFile(formattedUISourceCode.url());}
_cleanForModel(debuggerModel){var uiSourceCodes=this._formatData.keysArray();for(var i=0;i<uiSourceCodes.length;++i){Bindings.debuggerWorkspaceBinding.setSourceMapping(debuggerModel,uiSourceCodes[i],null);var formatData=this._formatData.get(uiSourceCodes[i]);var scripts=[];for(var j=0;j<formatData.scripts.length;++j){if(formatData.scripts[j].debuggerModel===debuggerModel)
this._uiSourceCodes.remove(formatData.scripts[j]);else
scripts.push(formatData.scripts[j]);}
if(scripts.length){formatData.scripts=scripts;}else{this._formattedPaths.remove(formatData.projectId+':'+formatData.path);this._formatData.remove(uiSourceCodes[i]);this._project.removeFile(uiSourceCodes[i].url());}}}
_debuggerReset(event){var debuggerModel=(event.data);this._cleanForModel(debuggerModel);}
_scriptsForUISourceCode(uiSourceCode){function isInlineScript(script){return script.isInlineScript()&&!script.hasSourceURL;}
if(uiSourceCode.contentType()===Common.resourceTypes.Document){var scripts=[];var debuggerModels=SDK.targetManager.models(SDK.DebuggerModel);for(var i=0;i<debuggerModels.length;++i)
scripts.pushAll(debuggerModels[i].scriptsForSourceURL(uiSourceCode.url()));return scripts.filter(isInlineScript);}
if(uiSourceCode.contentType().isScript()){var rawLocations=Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode,0,0);return rawLocations.map(function(rawLocation){return rawLocation.script();});}
return[];}
_formatUISourceCodeScript(uiSourceCode){var formattedPath=this._formattedPaths.get(uiSourceCode.project().id()+':'+uiSourceCode.url());if(formattedPath){var uiSourceCodePath=formattedPath;var formattedUISourceCode=this._workspace.uiSourceCode(this._projectId,uiSourceCodePath);var formatData=formattedUISourceCode?this._formatData.get(formattedUISourceCode):null;if(formatData){this._showIfNeeded(uiSourceCode,(formattedUISourceCode),formatData.mapping);}
return;}
uiSourceCode.requestContent().then(contentLoaded.bind(this));function contentLoaded(content){var highlighterType=Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode);Sources.Formatter.format(uiSourceCode.contentType(),highlighterType,content||'',innerCallback.bind(this));}
function innerCallback(formattedContent,formatterMapping){var scripts=this._scriptsForUISourceCode(uiSourceCode);var formattedURL=uiSourceCode.url()+':formatted';var contentProvider=Common.StaticContentProvider.fromString(formattedURL,uiSourceCode.contentType(),formattedContent);var formattedUISourceCode=this._project.addContentProvider(formattedURL,contentProvider);var formattedPath=formattedUISourceCode.url();var formatData=new Sources.FormatterScriptMapping.FormatData(uiSourceCode.project().id(),uiSourceCode.url(),formatterMapping,scripts);this._formatData.set(formattedUISourceCode,formatData);var path=uiSourceCode.project().id()+':'+uiSourceCode.url();this._formattedPaths.set(path,formattedPath);this._pathsToFormatOnLoad.add(path);for(var i=0;i<scripts.length;++i){this._uiSourceCodes.set(scripts[i],formattedUISourceCode);var scriptMapping=(this._scriptMappingByDebuggerModel.get(scripts[i].debuggerModel));Bindings.debuggerWorkspaceBinding.pushSourceMapping(scripts[i],scriptMapping);}
var debuggerModels=SDK.targetManager.models(SDK.DebuggerModel);for(var i=0;i<debuggerModels.length;++i){var scriptMapping=(this._scriptMappingByDebuggerModel.get(debuggerModels[i]));Bindings.debuggerWorkspaceBinding.setSourceMapping(debuggerModels[i],formattedUISourceCode,scriptMapping);}
for(var decoration of uiSourceCode.allDecorations()){var range=decoration.range();var startLocation=formatterMapping.originalToFormatted(range.startLine,range.startColumn);var endLocation=formatterMapping.originalToFormatted(range.endLine,range.endColumn);formattedUISourceCode.addDecoration(new Common.TextRange(startLocation[0],startLocation[1],endLocation[0],endLocation[1]),(decoration.type()),decoration.data());}
this._showIfNeeded(uiSourceCode,formattedUISourceCode,formatterMapping);}}};;Sources.InplaceFormatterEditorAction=class{_editorSelected(event){var uiSourceCode=(event.data);this._updateButton(uiSourceCode);}
_editorClosed(event){var wasSelected=(event.data.wasSelected);if(wasSelected)
this._updateButton(null);}
_updateButton(uiSourceCode){this._button.element.classList.toggle('hidden',!this._isFormattable(uiSourceCode));}
button(sourcesView){if(this._button)
return this._button;this._sourcesView=sourcesView;this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorClosed,this._editorClosed.bind(this));this._button=new UI.ToolbarButton(Common.UIString('Format'),'largeicon-pretty-print');this._button.addEventListener(UI.ToolbarButton.Events.Click,this._formatSourceInPlace,this);this._updateButton(sourcesView.currentUISourceCode());return this._button;}
_isFormattable(uiSourceCode){if(!uiSourceCode)
return false;if(uiSourceCode.project().canSetFileContent())
return true;if(Persistence.persistence.binding(uiSourceCode))
return true;return uiSourceCode.contentType().isStyleSheet();}
_formatSourceInPlace(event){var uiSourceCode=this._sourcesView.currentUISourceCode();if(!this._isFormattable(uiSourceCode))
return;if(uiSourceCode.isDirty())
contentLoaded.call(this,uiSourceCode.workingCopy());else
uiSourceCode.requestContent().then(contentLoaded.bind(this));function contentLoaded(content){var highlighterType=Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode);Sources.Formatter.format(uiSourceCode.contentType(),highlighterType,content||'',innerCallback.bind(this));}
function innerCallback(formattedContent,formatterMapping){if(uiSourceCode.workingCopy()===formattedContent)
return;var sourceFrame=this._sourcesView.viewForFile(uiSourceCode);var start=[0,0];if(sourceFrame){var selection=sourceFrame.selection();start=formatterMapping.originalToFormatted(selection.startLine,selection.startColumn);}
uiSourceCode.setWorkingCopy(formattedContent);this._formatDecorations(uiSourceCode,formatterMapping);this._sourcesView.showSourceLocation(uiSourceCode,start[0],start[1]);}}
_formatDecorations(uiSourceCode,sourceMapping){var decorations=uiSourceCode.allDecorations();if(!decorations.length)
return;uiSourceCode.removeAllDecorations();for(var decoration of decorations){var range=decoration.range();var startLocation=sourceMapping.originalToFormatted(range.startLine,range.startColumn);var endLocation=sourceMapping.originalToFormatted(range.endLine,range.endColumn);uiSourceCode.addDecoration(new Common.TextRange(startLocation[0],startLocation[1],endLocation[0],endLocation[1]),(decoration.type()),decoration.data());}}};;Sources.Formatter=function(){};Sources.Formatter.format=function(contentType,mimeType,content,callback){if(contentType.isDocumentOrScriptOrStyleSheet())
new Sources.ScriptFormatter(mimeType,content,callback);else
new Sources.ScriptIdentityFormatter(mimeType,content,callback);};Sources.Formatter.locationToPosition=function(lineEndings,lineNumber,columnNumber){var position=lineNumber?lineEndings[lineNumber-1]+1:0;return position+columnNumber;};Sources.Formatter.positionToLocation=function(lineEndings,position){var lineNumber=lineEndings.upperBound(position-1);if(!lineNumber)
var columnNumber=position;else
var columnNumber=position-lineEndings[lineNumber-1]-1;return[lineNumber,columnNumber];};Sources.ScriptFormatter=class{constructor(mimeType,content,callback){content=content.replace(/\r\n?|[\n\u2028\u2029]/g,'\n').replace(/^\uFEFF/,'');this._callback=callback;this._originalContent=content;Common.formatterWorkerPool.format(mimeType,content,Common.moduleSetting('textEditorIndent').get()).then(this._didFormatContent.bind(this));}
_didFormatContent(formatResult){var sourceMapping=new Sources.FormatterSourceMappingImpl(this._originalContent.computeLineEndings(),formatResult.content.computeLineEndings(),formatResult.mapping);this._callback(formatResult.content,sourceMapping);}};Sources.ScriptIdentityFormatter=class{constructor(mimeType,content,callback){callback(content,new Sources.IdentityFormatterSourceMapping());}};Sources.FormatterSourceMapping=function(){};Sources.FormatterSourceMapping.prototype={originalToFormatted(lineNumber,columnNumber){},formattedToOriginal(lineNumber,columnNumber){}};Sources.IdentityFormatterSourceMapping=class{originalToFormatted(lineNumber,columnNumber){return[lineNumber,columnNumber||0];}
formattedToOriginal(lineNumber,columnNumber){return[lineNumber,columnNumber||0];}};Sources.FormatterSourceMappingImpl=class{constructor(originalLineEndings,formattedLineEndings,mapping){this._originalLineEndings=originalLineEndings;this._formattedLineEndings=formattedLineEndings;this._mapping=mapping;}
originalToFormatted(lineNumber,columnNumber){var originalPosition=Sources.Formatter.locationToPosition(this._originalLineEndings,lineNumber,columnNumber||0);var formattedPosition=this._convertPosition(this._mapping.original,this._mapping.formatted,originalPosition||0);return Sources.Formatter.positionToLocation(this._formattedLineEndings,formattedPosition);}
formattedToOriginal(lineNumber,columnNumber){var formattedPosition=Sources.Formatter.locationToPosition(this._formattedLineEndings,lineNumber,columnNumber||0);var originalPosition=this._convertPosition(this._mapping.formatted,this._mapping.original,formattedPosition);return Sources.Formatter.positionToLocation(this._originalLineEndings,originalPosition||0);}
_convertPosition(positions1,positions2,position){var index=positions1.upperBound(position)-1;var convertedPosition=positions2[index]+position-positions1[index];if(index<positions2.length-1&&convertedPosition>positions2[index+1])
convertedPosition=positions2[index+1];return convertedPosition;}};;Sources.OpenResourceDialog=class extends Sources.FilteredUISourceCodeListProvider{constructor(sourcesView,defaultScores){super(defaultScores);this._sourcesView=sourcesView;}
static show(sourcesView,query,defaultScores,history){var dialog=new Sources.OpenResourceDialog(sourcesView,defaultScores);if(InspectorFrontendHost.isUnderTest())
Sources.OpenResourceDialog._instanceForTest=dialog;var filteredItemSelectionDialog=new QuickOpen.FilteredListWidget(dialog,history);filteredItemSelectionDialog.showAsDialog();filteredItemSelectionDialog.setQuery(query);}
uiSourceCodeSelected(uiSourceCode,lineNumber,columnNumber){Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectFileFromFilePicker);if(!uiSourceCode)
uiSourceCode=this._sourcesView.currentUISourceCode();if(!uiSourceCode)
return;this._sourcesView.showSourceLocation(uiSourceCode,lineNumber,columnNumber);}
shouldShowMatchingItems(query){return!query.startsWith(':');}
filterProject(project){return!project.isServiceProject();}
renderAsTwoRows(){return true;}};Sources.SelectUISourceCodeForProjectTypesDialog=class extends Sources.FilteredUISourceCodeListProvider{constructor(types,callback){super();this._types=types;this._callback=callback;}
static show(name,types,callback){var filteredItemSelectionDialog=new QuickOpen.FilteredListWidget(new Sources.SelectUISourceCodeForProjectTypesDialog(types,callback));filteredItemSelectionDialog.showAsDialog();filteredItemSelectionDialog.setQuery(name);}
uiSourceCodeSelected(uiSourceCode,lineNumber,columnNumber){this._callback(uiSourceCode);}
filterProject(project){return this._types.indexOf(project.type())!==-1;}
renderAsTwoRows(){return true;}};;Sources.SourcesView=class extends UI.VBox{constructor(){super();this.registerRequiredCSS('sources/sourcesView.css');this.element.id='sources-panel-sources-view';this.setMinimumAndPreferredSizes(80,52,150,100);var workspace=Workspace.workspace;this._searchableView=new UI.SearchableView(this,'sourcesViewSearchConfig');this._searchableView.setMinimalSearchQuerySize(0);this._searchableView.show(this.element);this._sourceViewByUISourceCode=new Map();var tabbedEditorPlaceholderText=Host.isMac()?Common.UIString('Hit \u2318+P to open a file'):Common.UIString('Hit Ctrl+P to open a file');if(Runtime.experiments.isEnabled('persistence2'))
tabbedEditorPlaceholderText+='\n\n'+Common.UIString('Drop in a folder to add to workspace');this._editorContainer=new Sources.TabbedEditorContainer(this,Common.settings.createLocalSetting('previouslyViewedFiles',[]),tabbedEditorPlaceholderText);this._editorContainer.show(this._searchableView.element);this._editorContainer.addEventListener(Sources.TabbedEditorContainer.Events.EditorSelected,this._editorSelected,this);this._editorContainer.addEventListener(Sources.TabbedEditorContainer.Events.EditorClosed,this._editorClosed,this);this._historyManager=new Sources.EditingLocationHistoryManager(this,this.currentSourceFrame.bind(this));this._toolbarContainerElement=this.element.createChild('div','sources-toolbar');this._toolbarEditorActions=new UI.Toolbar('',this._toolbarContainerElement);self.runtime.allInstances(Sources.SourcesView.EditorAction).then(appendButtonsForExtensions.bind(this));function appendButtonsForExtensions(actions){for(var i=0;i<actions.length;++i)
this._toolbarEditorActions.appendToolbarItem(actions[i].button(this));}
this._scriptViewToolbar=new UI.Toolbar('',this._toolbarContainerElement);this._scriptViewToolbar.element.style.flex='auto';this._bottomToolbar=new UI.Toolbar('',this._toolbarContainerElement);this._bindingChangeBound=this._onBindingChanged.bind(this);UI.startBatchUpdate();workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));UI.endBatchUpdate();workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved.bind(this),this);function handleBeforeUnload(event){if(event.returnValue)
return;var unsavedSourceCodes=[];var projects=Workspace.workspace.projectsForType(Workspace.projectTypes.FileSystem);for(var i=0;i<projects.length;++i){unsavedSourceCodes=unsavedSourceCodes.concat(projects[i].uiSourceCodes().filter(sourceCode=>sourceCode.isDirty()));}
if(!unsavedSourceCodes.length)
return;event.returnValue=Common.UIString('DevTools have unsaved changes that will be permanently lost.');UI.viewManager.showView('sources');for(var i=0;i<unsavedSourceCodes.length;++i)
Common.Revealer.reveal(unsavedSourceCodes[i]);}
if(!window.opener)
window.addEventListener('beforeunload',handleBeforeUnload,true);this._shortcuts={};this.element.addEventListener('keydown',this._handleKeyDown.bind(this),false);}
registerShortcuts(registerShortcutDelegate){function registerShortcut(shortcuts,handler){registerShortcutDelegate(shortcuts,handler);this._registerShortcuts(shortcuts,handler);}
registerShortcut.call(this,UI.ShortcutsScreen.SourcesPanelShortcuts.JumpToPreviousLocation,this._onJumpToPreviousLocation.bind(this));registerShortcut.call(this,UI.ShortcutsScreen.SourcesPanelShortcuts.JumpToNextLocation,this._onJumpToNextLocation.bind(this));registerShortcut.call(this,UI.ShortcutsScreen.SourcesPanelShortcuts.CloseEditorTab,this._onCloseEditorTab.bind(this));registerShortcut.call(this,UI.ShortcutsScreen.SourcesPanelShortcuts.GoToLine,this._showGoToLineDialog.bind(this));registerShortcut.call(this,UI.ShortcutsScreen.SourcesPanelShortcuts.GoToMember,this._showOutlineDialog.bind(this));registerShortcut.call(this,UI.ShortcutsScreen.SourcesPanelShortcuts.ToggleBreakpoint,this._toggleBreakpoint.bind(this));registerShortcut.call(this,UI.ShortcutsScreen.SourcesPanelShortcuts.Save,this._save.bind(this));registerShortcut.call(this,UI.ShortcutsScreen.SourcesPanelShortcuts.SaveAll,this._saveAll.bind(this));}
leftToolbar(){return this._editorContainer.leftToolbar();}
rightToolbar(){return this._editorContainer.rightToolbar();}
bottomToolbar(){return this._bottomToolbar;}
_registerShortcuts(keys,handler){for(var i=0;i<keys.length;++i)
this._shortcuts[keys[i].key]=handler;}
_handleKeyDown(event){var shortcutKey=UI.KeyboardShortcut.makeKeyFromEvent(event);var handler=this._shortcuts[shortcutKey];if(handler&&handler())
event.consume(true);}
wasShown(){super.wasShown();UI.context.setFlavor(Sources.SourcesView,this);}
willHide(){UI.context.setFlavor(Sources.SourcesView,null);super.willHide();}
toolbarContainerElement(){return this._toolbarContainerElement;}
searchableView(){return this._searchableView;}
visibleView(){return this._editorContainer.visibleView;}
currentSourceFrame(){var view=this.visibleView();if(!(view instanceof SourceFrame.UISourceCodeFrame))
return null;return(view);}
currentUISourceCode(){return this._editorContainer.currentFile();}
_onCloseEditorTab(event){var uiSourceCode=this._editorContainer.currentFile();if(!uiSourceCode)
return false;this._editorContainer.closeFile(uiSourceCode);return true;}
_onJumpToPreviousLocation(event){this._historyManager.rollback();return true;}
_onJumpToNextLocation(event){this._historyManager.rollover();return true;}
_uiSourceCodeAdded(event){var uiSourceCode=(event.data);this._addUISourceCode(uiSourceCode);}
_addUISourceCode(uiSourceCode){if(uiSourceCode.project().isServiceProject())
return;this._editorContainer.addUISourceCode(uiSourceCode);}
_uiSourceCodeRemoved(event){var uiSourceCode=(event.data);this._removeUISourceCodes([uiSourceCode]);}
_removeUISourceCodes(uiSourceCodes){this._editorContainer.removeUISourceCodes(uiSourceCodes);for(var i=0;i<uiSourceCodes.length;++i){this._removeSourceFrame(uiSourceCodes[i]);this._historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);}}
_projectRemoved(event){var project=event.data;var uiSourceCodes=project.uiSourceCodes();this._removeUISourceCodes(uiSourceCodes);}
_updateScriptViewToolbarItems(){this._scriptViewToolbar.removeToolbarItems();var view=this.visibleView();if(view instanceof UI.SimpleView){for(var item of((view)).syncToolbarItems())
this._scriptViewToolbar.appendToolbarItem(item);}}
showSourceLocation(uiSourceCode,lineNumber,columnNumber,omitFocus,omitHighlight){this._historyManager.updateCurrentState();this._editorContainer.showFile(uiSourceCode);var currentSourceFrame=this.currentSourceFrame();if(currentSourceFrame&&typeof lineNumber==='number')
currentSourceFrame.revealPosition(lineNumber,columnNumber,!omitHighlight);this._historyManager.pushNewState();if(!omitFocus)
this.visibleView().focus();}
_createSourceView(uiSourceCode){var sourceFrame;var sourceView;var contentType=uiSourceCode.contentType();if(contentType.hasScripts())
sourceFrame=new Sources.JavaScriptSourceFrame(uiSourceCode);else if(contentType.isStyleSheet())
sourceFrame=new Sources.CSSSourceFrame(uiSourceCode);else if(contentType===Common.resourceTypes.Image)
sourceView=new SourceFrame.ImageView(Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode),uiSourceCode);else if(contentType===Common.resourceTypes.Font)
sourceView=new SourceFrame.FontView(Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode),uiSourceCode);else
sourceFrame=new SourceFrame.UISourceCodeFrame(uiSourceCode);if(sourceFrame){sourceFrame.setHighlighterType(Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode));this._historyManager.trackSourceFrameCursorJumps(sourceFrame);}
var widget=(sourceFrame||sourceView);this._sourceViewByUISourceCode.set(uiSourceCode,widget);uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged,this._uiSourceCodeTitleChanged,this);return widget;}
_getOrCreateSourceView(uiSourceCode){return this._sourceViewByUISourceCode.get(uiSourceCode)||this._createSourceView(uiSourceCode);}
_sourceFrameMatchesUISourceCode(sourceFrame,uiSourceCode){if(uiSourceCode.contentType().hasScripts())
return sourceFrame instanceof Sources.JavaScriptSourceFrame;if(uiSourceCode.contentType().isStyleSheet())
return sourceFrame instanceof Sources.CSSSourceFrame;return!(sourceFrame instanceof Sources.JavaScriptSourceFrame);}
_recreateSourceFrameIfNeeded(uiSourceCode){var oldSourceView=this._sourceViewByUISourceCode.get(uiSourceCode);if(!oldSourceView||!(oldSourceView instanceof SourceFrame.UISourceCodeFrame))
return;var oldSourceFrame=(oldSourceView);if(this._sourceFrameMatchesUISourceCode(oldSourceFrame,uiSourceCode)){oldSourceFrame.setHighlighterType(Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode));}else{this._editorContainer.removeUISourceCode(uiSourceCode);this._removeSourceFrame(uiSourceCode);}}
viewForFile(uiSourceCode){return this._getOrCreateSourceView(uiSourceCode);}
_removeSourceFrame(uiSourceCode){var sourceView=this._sourceViewByUISourceCode.get(uiSourceCode);this._sourceViewByUISourceCode.remove(uiSourceCode);uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged,this._uiSourceCodeTitleChanged,this);if(sourceView&&sourceView instanceof SourceFrame.UISourceCodeFrame)
(sourceView).dispose();}
_onBindingChanged(){this.setExecutionLocation(this._executionLocation);this.showSourceLocation(this._executionLocation.uiSourceCode,this._executionLocation.lineNumber,this._executionLocation.columnNumber);}
clearCurrentExecutionLine(){if(!this._executionLocation)
return;Persistence.persistence.unsubscribeFromBindingEvent(this._executionLocation.uiSourceCode,this._bindingChangeBound);this._executionSourceFrame.clearExecutionLine();this._executionSourceFrame=null;this._executionLocation=null;}
setExecutionLocation(uiLocation){this.clearCurrentExecutionLine();var binding=Persistence.persistence.binding(uiLocation.uiSourceCode);var uiSourceCode=binding?binding.fileSystem:uiLocation.uiSourceCode;var sourceView=this._getOrCreateSourceView(uiSourceCode);if(!(sourceView instanceof SourceFrame.UISourceCodeFrame))
return;Persistence.persistence.subscribeForBindingEvent(uiLocation.uiSourceCode,this._bindingChangeBound);var sourceFrame=(sourceView);sourceFrame.setExecutionLocation(new Workspace.UILocation(uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber));this._executionSourceFrame=sourceFrame;this._executionLocation=uiLocation;}
_editorClosed(event){var uiSourceCode=(event.data);this._historyManager.removeHistoryForSourceCode(uiSourceCode);var wasSelected=false;if(!this._editorContainer.currentFile())
wasSelected=true;this._updateScriptViewToolbarItems();this._searchableView.resetSearch();var data={};data.uiSourceCode=uiSourceCode;data.wasSelected=wasSelected;this.dispatchEventToListeners(Sources.SourcesView.Events.EditorClosed,data);}
_editorSelected(event){var previousSourceFrame=event.data.previousView instanceof SourceFrame.UISourceCodeFrame?event.data.previousView:null;if(previousSourceFrame)
previousSourceFrame.setSearchableView(null);var currentSourceFrame=event.data.currentView instanceof SourceFrame.UISourceCodeFrame?event.data.currentView:null;if(currentSourceFrame)
currentSourceFrame.setSearchableView(this._searchableView);this._searchableView.setReplaceable(!!currentSourceFrame&&currentSourceFrame.canEditSource());this._searchableView.refreshSearch();this._updateScriptViewToolbarItems();this.dispatchEventToListeners(Sources.SourcesView.Events.EditorSelected,this._editorContainer.currentFile());}
_uiSourceCodeTitleChanged(event){this._recreateSourceFrameIfNeeded((event.data));}
searchCanceled(){if(this._searchView)
this._searchView.searchCanceled();delete this._searchView;delete this._searchConfig;}
performSearch(searchConfig,shouldJump,jumpBackwards){var sourceFrame=this.currentSourceFrame();if(!sourceFrame)
return;this._searchView=sourceFrame;this._searchConfig=searchConfig;this._searchView.performSearch(this._searchConfig,shouldJump,jumpBackwards);}
jumpToNextSearchResult(){if(!this._searchView)
return;if(this._searchView!==this.currentSourceFrame()){this.performSearch(this._searchConfig,true);return;}
this._searchView.jumpToNextSearchResult();}
jumpToPreviousSearchResult(){if(!this._searchView)
return;if(this._searchView!==this.currentSourceFrame()){this.performSearch(this._searchConfig,true);if(this._searchView)
this._searchView.jumpToLastSearchResult();return;}
this._searchView.jumpToPreviousSearchResult();}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return true;}
replaceSelectionWith(searchConfig,replacement){var sourceFrame=this.currentSourceFrame();if(!sourceFrame){console.assert(sourceFrame);return;}
sourceFrame.replaceSelectionWith(searchConfig,replacement);}
replaceAllWith(searchConfig,replacement){var sourceFrame=this.currentSourceFrame();if(!sourceFrame){console.assert(sourceFrame);return;}
sourceFrame.replaceAllWith(searchConfig,replacement);}
_showOutlineDialog(event){var uiSourceCode=this._editorContainer.currentFile();if(!uiSourceCode)
return false;if(uiSourceCode.contentType().hasScripts()){Sources.JavaScriptOutlineDialog.show(uiSourceCode,this.showSourceLocation.bind(this,uiSourceCode));return true;}
if(uiSourceCode.contentType().isStyleSheet()){Sources.StyleSheetOutlineDialog.show(uiSourceCode,this.showSourceLocation.bind(this,uiSourceCode));return true;}
return true;}
showOpenResourceDialog(query){var uiSourceCodes=this._editorContainer.historyUISourceCodes();var defaultScores=new Map();for(var i=1;i<uiSourceCodes.length;++i)
defaultScores.set(uiSourceCodes[i],uiSourceCodes.length-i);if(!this._openResourceDialogHistory)
this._openResourceDialogHistory=[];Sources.OpenResourceDialog.show(this,query||'',defaultScores,this._openResourceDialogHistory);}
_showGoToLineDialog(event){if(this._editorContainer.currentFile())
this.showOpenResourceDialog(':');return true;}
_save(){this._saveSourceFrame(this.currentSourceFrame());return true;}
_saveAll(){var sourceFrames=this._editorContainer.fileViews();sourceFrames.forEach(this._saveSourceFrame.bind(this));return true;}
_saveSourceFrame(sourceFrame){if(!(sourceFrame instanceof SourceFrame.UISourceCodeFrame))
return;var uiSourceCodeFrame=(sourceFrame);uiSourceCodeFrame.commitEditing();}
_toggleBreakpoint(){var sourceFrame=this.currentSourceFrame();if(!sourceFrame)
return false;if(sourceFrame instanceof Sources.JavaScriptSourceFrame){var javaScriptSourceFrame=(sourceFrame);javaScriptSourceFrame.toggleBreakpointOnCurrentLine();return true;}
return false;}
toggleBreakpointsActiveState(active){this._editorContainer.view.element.classList.toggle('breakpoints-deactivated',!active);}};Sources.SourcesView.Events={EditorClosed:Symbol('EditorClosed'),EditorSelected:Symbol('EditorSelected'),};Sources.SourcesView.EditorAction=function(){};Sources.SourcesView.EditorAction.prototype={button(sourcesView){}};Sources.SourcesView.SwitchFileActionDelegate=class{static _nextFile(currentUISourceCode){function fileNamePrefix(name){var lastDotIndex=name.lastIndexOf('.');var namePrefix=name.substr(0,lastDotIndex!==-1?lastDotIndex:name.length);return namePrefix.toLowerCase();}
var uiSourceCodes=currentUISourceCode.project().uiSourceCodes();var candidates=[];var url=currentUISourceCode.parentURL();var name=currentUISourceCode.name();var namePrefix=fileNamePrefix(name);for(var i=0;i<uiSourceCodes.length;++i){var uiSourceCode=uiSourceCodes[i];if(url!==uiSourceCode.parentURL())
continue;if(fileNamePrefix(uiSourceCode.name())===namePrefix)
candidates.push(uiSourceCode.name());}
candidates.sort(String.naturalOrderComparator);var index=mod(candidates.indexOf(name)+1,candidates.length);var fullURL=(url?url+'/':'')+candidates[index];var nextUISourceCode=currentUISourceCode.project().uiSourceCodeForURL(fullURL);return nextUISourceCode!==currentUISourceCode?nextUISourceCode:null;}
handleAction(context,actionId){var sourcesView=UI.context.flavor(Sources.SourcesView);var currentUISourceCode=sourcesView.currentUISourceCode();if(!currentUISourceCode)
return false;var nextUISourceCode=Sources.SourcesView.SwitchFileActionDelegate._nextFile(currentUISourceCode);if(!nextUISourceCode)
return false;sourcesView.showSourceLocation(nextUISourceCode);return true;}};Sources.SourcesView.CloseAllActionDelegate=class{handleAction(context,actionId){var sourcesView=UI.context.flavor(Sources.SourcesView);if(!sourcesView)
return false;sourcesView._editorContainer.closeAllFiles();return true;}};;Sources.AdvancedSearchView=class extends UI.VBox{constructor(){super(true);this.setMinimumSize(0,40);this.registerRequiredCSS('sources/sourcesSearch.css');this._searchId=0;this.contentElement.classList.add('search-view');this._searchPanelElement=this.contentElement.createChild('div','search-drawer-header');this._searchPanelElement.addEventListener('keydown',this._onKeyDown.bind(this),false);this._searchPanelElement.addEventListener('input',this._onInput.bind(this),false);this._searchResultsElement=this.contentElement.createChild('div');this._searchResultsElement.className='search-results';this._search=UI.HistoryInput.create();this._searchPanelElement.appendChild(this._search);this._search.placeholder=Common.UIString('Search all sources (use "file:" to filter by path)\u200e');this._search.setAttribute('type','text');this._search.classList.add('search-config-search');this._search.setAttribute('results','0');this._search.setAttribute('size',42);var searchIcon=UI.Icon.create('smallicon-search','search-icon');this._searchPanelElement.appendChild(searchIcon);this._searchInputClearElement=UI.Icon.create('smallicon-clear-input','search-cancel-button');this._searchInputClearElement.classList.add('hidden');this._searchInputClearElement.addEventListener('click',this._onSearchInputClear.bind(this),false);var cancelButtonContainer=this._searchPanelElement.createChild('div','search-cancel-button-container');cancelButtonContainer.appendChild(this._searchInputClearElement);this._ignoreCaseLabel=UI.createCheckboxLabel(Common.UIString('Ignore case'));this._ignoreCaseLabel.classList.add('search-config-label');this._searchPanelElement.appendChild(this._ignoreCaseLabel);this._ignoreCaseCheckbox=this._ignoreCaseLabel.checkboxElement;this._ignoreCaseCheckbox.classList.add('search-config-checkbox');this._regexLabel=UI.createCheckboxLabel(Common.UIString('Regular expression'));this._regexLabel.classList.add('search-config-label');this._searchPanelElement.appendChild(this._regexLabel);this._regexCheckbox=this._regexLabel.checkboxElement;this._regexCheckbox.classList.add('search-config-checkbox');this._searchToolbarElement=this.contentElement.createChild('div','search-toolbar-summary');this._searchMessageElement=this._searchToolbarElement.createChild('div','search-message');this._searchProgressPlaceholderElement=this._searchToolbarElement.createChild('div','flex-centered');this._searchResultsMessageElement=this._searchToolbarElement.createChild('div','search-message');this._advancedSearchConfig=Common.settings.createLocalSetting('advancedSearchConfig',new Workspace.SearchConfig('',true,false).toPlainObject());this._load();this._searchScope=new Sources.SourcesSearchScope();}
static openSearch(query,filePath){UI.viewManager.showView('sources.search');var searchView=(self.runtime.sharedInstance(Sources.AdvancedSearchView));var fileMask=filePath?' file:'+filePath:'';searchView._toggle(query+fileMask);}
_buildSearchConfig(){return new Workspace.SearchConfig(this._search.value,this._ignoreCaseCheckbox.checked,this._regexCheckbox.checked);}
_toggle(queryCandidate){if(queryCandidate)
this._search.value=queryCandidate;if(this.isShowing())
this.focus();else
this._focusOnShow=true;this._startIndexing();}
wasShown(){if(this._focusOnShow){this.focus();delete this._focusOnShow;}}
_onIndexingFinished(){var finished=!this._progressIndicator.isCanceled();this._progressIndicator.done();delete this._progressIndicator;delete this._isIndexing;this._indexingFinished(finished);if(!finished)
delete this._pendingSearchConfig;if(!this._pendingSearchConfig)
return;var searchConfig=this._pendingSearchConfig;delete this._pendingSearchConfig;this._innerStartSearch(searchConfig);}
_startIndexing(){this._isIndexing=true;if(this._progressIndicator)
this._progressIndicator.done();this._progressIndicator=new UI.ProgressIndicator();this._searchMessageElement.textContent=Common.UIString('Indexing\u2026');this._progressIndicator.show(this._searchProgressPlaceholderElement);this._searchScope.performIndexing(new Common.ProgressProxy(this._progressIndicator,this._onIndexingFinished.bind(this)));}
_onSearchInputClear(){this._search.value='';this.focus();this._searchInputClearElement.classList.add('hidden');}
_onSearchResult(searchId,searchResult){if(searchId!==this._searchId||!this._progressIndicator)
return;if(this._progressIndicator&&this._progressIndicator.isCanceled()){this._onIndexingFinished();return;}
this._addSearchResult(searchResult);if(!searchResult.searchMatches.length)
return;if(!this._searchResultsPane)
this._searchResultsPane=new Sources.FileBasedSearchResultsPane(this._searchConfig);this._resetResults();this._searchResultsElement.appendChild(this._searchResultsPane.element);this._searchResultsPane.addSearchResult(searchResult);}
_onSearchFinished(searchId,finished){if(searchId!==this._searchId||!this._progressIndicator)
return;if(!this._searchResultsPane)
this._nothingFound();this._searchFinished(finished);delete this._searchConfig;}
_startSearch(searchConfig){this._resetSearch();++this._searchId;if(!this._isIndexing)
this._startIndexing();this._pendingSearchConfig=searchConfig;}
_innerStartSearch(searchConfig){this._searchConfig=searchConfig;if(this._progressIndicator)
this._progressIndicator.done();this._progressIndicator=new UI.ProgressIndicator();this._searchStarted(this._progressIndicator);this._searchScope.performSearch(searchConfig,this._progressIndicator,this._onSearchResult.bind(this,this._searchId),this._onSearchFinished.bind(this,this._searchId));}
_resetSearch(){this._stopSearch();if(this._searchResultsPane){this._resetResults();delete this._searchResultsPane;}}
_stopSearch(){if(this._progressIndicator&&!this._isIndexing)
this._progressIndicator.cancel();if(this._searchScope)
this._searchScope.stopSearch();delete this._searchConfig;}
_searchStarted(progressIndicator){this._resetResults();this._resetCounters();this._searchMessageElement.textContent=Common.UIString('Searching\u2026');progressIndicator.show(this._searchProgressPlaceholderElement);this._updateSearchResultsMessage();if(!this._searchingView)
this._searchingView=new UI.EmptyWidget(Common.UIString('Searching\u2026'));this._searchingView.show(this._searchResultsElement);}
_indexingFinished(finished){this._searchMessageElement.textContent=finished?'':Common.UIString('Indexing interrupted.');}
_updateSearchResultsMessage(){if(this._searchMatchesCount&&this._searchResultsCount){if(this._searchMatchesCount===1&&this._nonEmptySearchResultsCount===1){this._searchResultsMessageElement.textContent=Common.UIString('Found 1 matching line in 1 file.');}else if(this._searchMatchesCount>1&&this._nonEmptySearchResultsCount===1){this._searchResultsMessageElement.textContent=Common.UIString('Found %d matching lines in 1 file.',this._searchMatchesCount);}else{this._searchResultsMessageElement.textContent=Common.UIString('Found %d matching lines in %d files.',this._searchMatchesCount,this._nonEmptySearchResultsCount);}}else{this._searchResultsMessageElement.textContent='';}}
_resetResults(){if(this._searchingView)
this._searchingView.detach();if(this._notFoundView)
this._notFoundView.detach();this._searchResultsElement.removeChildren();}
_resetCounters(){this._searchMatchesCount=0;this._searchResultsCount=0;this._nonEmptySearchResultsCount=0;}
_nothingFound(){this._resetResults();if(!this._notFoundView)
this._notFoundView=new UI.EmptyWidget(Common.UIString('No matches found.'));this._notFoundView.show(this._searchResultsElement);this._searchResultsMessageElement.textContent=Common.UIString('No matches found.');}
_addSearchResult(searchResult){this._searchMatchesCount+=searchResult.searchMatches.length;this._searchResultsCount++;if(searchResult.searchMatches.length)
this._nonEmptySearchResultsCount++;this._updateSearchResultsMessage();}
_searchFinished(finished){this._searchMessageElement.textContent=finished?Common.UIString('Search finished.'):Common.UIString('Search interrupted.');}
focus(){this._search.focus();this._search.select();}
willHide(){this._stopSearch();}
_onKeyDown(event){switch(event.keyCode){case UI.KeyboardShortcut.Keys.Enter.code:this._onAction();break;}}
_onInput(){var hasText=this._search.value&&this._search.value.length;this._searchInputClearElement.classList.toggle('hidden',!hasText);}
_save(){this._advancedSearchConfig.set(this._buildSearchConfig().toPlainObject());}
_load(){var searchConfig=Workspace.SearchConfig.fromPlainObject(this._advancedSearchConfig.get());this._search.value=searchConfig.query();this._ignoreCaseCheckbox.checked=searchConfig.ignoreCase();this._regexCheckbox.checked=searchConfig.isRegex();if(this._search.value&&this._search.value.length)
this._searchInputClearElement.classList.remove('hidden');}
_onAction(){var searchConfig=this._buildSearchConfig();if(!searchConfig.query()||!searchConfig.query().length)
return;this._save();this._startSearch(searchConfig);}};Sources.SearchResultsPane=class{constructor(searchConfig){this._searchConfig=searchConfig;this.element=createElement('div');}
get searchConfig(){return this._searchConfig;}
addSearchResult(searchResult){}};Sources.AdvancedSearchView.ActionDelegate=class{handleAction(context,actionId){this._showSearch();return true;}
_showSearch(){var selection=UI.inspectorView.element.window().getSelection();var queryCandidate='';if(selection.rangeCount)
queryCandidate=selection.toString().replace(/\r?\n.*/,'');Sources.AdvancedSearchView.openSearch(queryCandidate);}};Sources.FileBasedSearchResult=class{constructor(uiSourceCode,searchMatches){this.uiSourceCode=uiSourceCode;this.searchMatches=searchMatches;}};Sources.SearchScope=function(){};Sources.SearchScope.prototype={performSearch(searchConfig,progress,searchResultCallback,searchFinishedCallback){},performIndexing(progress){},stopSearch(){}};;Sources.FileBasedSearchResultsPane=class extends Sources.SearchResultsPane{constructor(searchConfig){super(searchConfig);this._searchResults=[];this._treeOutline=new UI.TreeOutlineInShadow();this._treeOutline.registerRequiredCSS('sources/fileBasedSearchResultsPane.css');this.element.appendChild(this._treeOutline.element);this._matchesExpandedCount=0;}
addSearchResult(searchResult){this._searchResults.push(searchResult);var uiSourceCode=searchResult.uiSourceCode;if(!uiSourceCode)
return;this._addFileTreeElement(searchResult);}
_addFileTreeElement(searchResult){var fileTreeElement=new Sources.FileBasedSearchResultsPane.FileTreeElement(this.searchConfig,searchResult);this._treeOutline.appendChild(fileTreeElement);if(this._matchesExpandedCount<Sources.FileBasedSearchResultsPane.matchesExpandedByDefaultCount)
fileTreeElement.expand();this._matchesExpandedCount+=searchResult.searchMatches.length;}};Sources.FileBasedSearchResultsPane.matchesExpandedByDefaultCount=20;Sources.FileBasedSearchResultsPane.fileMatchesShownAtOnce=20;Sources.FileBasedSearchResultsPane.FileTreeElement=class extends UI.TreeElement{constructor(searchConfig,searchResult){super('',true);this._searchConfig=searchConfig;this._searchResult=searchResult;this.toggleOnClick=true;this.selectable=false;}
onexpand(){if(this._initialized)
return;this._updateMatchesUI();this._initialized=true;}
_updateMatchesUI(){this.removeChildren();var toIndex=Math.min(this._searchResult.searchMatches.length,Sources.FileBasedSearchResultsPane.fileMatchesShownAtOnce);if(toIndex<this._searchResult.searchMatches.length){this._appendSearchMatches(0,toIndex-1);this._appendShowMoreMatchesElement(toIndex-1);}else{this._appendSearchMatches(0,toIndex);}}
onattach(){this._updateSearchMatches();}
_updateSearchMatches(){this.listItemElement.classList.add('search-result');var fileNameSpan=createElement('span');fileNameSpan.className='search-result-file-name';fileNameSpan.textContent=this._searchResult.uiSourceCode.fullDisplayName();this.listItemElement.appendChild(fileNameSpan);var matchesCountSpan=createElement('span');matchesCountSpan.className='search-result-matches-count';var searchMatchesCount=this._searchResult.searchMatches.length;if(searchMatchesCount===1)
matchesCountSpan.textContent=Common.UIString('(%d match)',searchMatchesCount);else
matchesCountSpan.textContent=Common.UIString('(%d matches)',searchMatchesCount);this.listItemElement.appendChild(matchesCountSpan);if(this.expanded)
this._updateMatchesUI();}
_appendSearchMatches(fromIndex,toIndex){var searchResult=this._searchResult;var uiSourceCode=searchResult.uiSourceCode;var searchMatches=searchResult.searchMatches;var queries=this._searchConfig.queries();var regexes=[];for(var i=0;i<queries.length;++i)
regexes.push(createSearchRegex(queries[i],!this._searchConfig.ignoreCase(),this._searchConfig.isRegex()));for(var i=fromIndex;i<toIndex;++i){var lineNumber=searchMatches[i].lineNumber;var lineContent=searchMatches[i].lineContent;var matchRanges=[];for(var j=0;j<regexes.length;++j)
matchRanges=matchRanges.concat(this._regexMatchRanges(lineContent,regexes[j]));var anchor=this._createAnchor(uiSourceCode,lineNumber,matchRanges[0].offset);var numberString=numberToStringWithSpacesPadding(lineNumber+1,4);var lineNumberSpan=createElement('span');lineNumberSpan.classList.add('search-match-line-number');lineNumberSpan.textContent=numberString;anchor.appendChild(lineNumberSpan);var contentSpan=this._createContentSpan(lineContent,matchRanges);anchor.appendChild(contentSpan);var searchMatchElement=new UI.TreeElement();searchMatchElement.selectable=false;this.appendChild(searchMatchElement);searchMatchElement.listItemElement.className='search-match source-code';searchMatchElement.listItemElement.appendChild(anchor);}}
_appendShowMoreMatchesElement(startMatchIndex){var matchesLeftCount=this._searchResult.searchMatches.length-startMatchIndex;var showMoreMatchesText=Common.UIString('Show all matches (%d more).',matchesLeftCount);this._showMoreMatchesTreeElement=new UI.TreeElement(showMoreMatchesText);this.appendChild(this._showMoreMatchesTreeElement);this._showMoreMatchesTreeElement.listItemElement.classList.add('show-more-matches');this._showMoreMatchesTreeElement.onselect=this._showMoreMatchesElementSelected.bind(this,startMatchIndex);}
_createAnchor(uiSourceCode,lineNumber,columnNumber){return Components.Linkifier.linkifyRevealable(uiSourceCode.uiLocation(lineNumber,columnNumber),'');}
_createContentSpan(lineContent,matchRanges){var contentSpan=createElement('span');contentSpan.className='search-match-content';contentSpan.textContent=lineContent;UI.highlightRangesWithStyleClass(contentSpan,matchRanges,'highlighted-match');return contentSpan;}
_regexMatchRanges(lineContent,regex){regex.lastIndex=0;var match;var matchRanges=[];while((regex.lastIndex<lineContent.length)&&(match=regex.exec(lineContent)))
matchRanges.push(new Common.SourceRange(match.index,match[0].length));return matchRanges;}
_showMoreMatchesElementSelected(startMatchIndex){this.removeChild(this._showMoreMatchesTreeElement);this._appendSearchMatches(startMatchIndex,this._searchResult.searchMatches.length);return false;}};;Sources.SourcesSearchScope=class{constructor(){this._searchId=0;}
static _filesComparator(uiSourceCode1,uiSourceCode2){if(uiSourceCode1.isDirty()&&!uiSourceCode2.isDirty())
return-1;if(!uiSourceCode1.isDirty()&&uiSourceCode2.isDirty())
return 1;var url1=uiSourceCode1.url();var url2=uiSourceCode2.url();if(url1&&!url2)
return-1;if(!url1&&url2)
return 1;return String.naturalOrderComparator(uiSourceCode1.fullDisplayName(),uiSourceCode2.fullDisplayName());}
performIndexing(progress){this.stopSearch();var projects=this._projects();var compositeProgress=new Common.CompositeProgress(progress);for(var i=0;i<projects.length;++i){var project=projects[i];var projectProgress=compositeProgress.createSubProgress(project.uiSourceCodes().length);project.indexContent(projectProgress);}}
_projects(){var searchInAnonymousAndContentScripts=Common.moduleSetting('searchInAnonymousAndContentScripts').get();return Workspace.workspace.projects().filter(project=>{if(project.type()===Workspace.projectTypes.Service)
return false;if(!searchInAnonymousAndContentScripts&&project.isServiceProject())
return false;if(!searchInAnonymousAndContentScripts&&project.type()===Workspace.projectTypes.ContentScripts)
return false;return true;});}
performSearch(searchConfig,progress,searchResultCallback,searchFinishedCallback){this.stopSearch();this._searchResultCandidates=[];this._searchResultCallback=searchResultCallback;this._searchFinishedCallback=searchFinishedCallback;this._searchConfig=searchConfig;var projects=this._projects();var barrier=new CallbackBarrier();var compositeProgress=new Common.CompositeProgress(progress);var searchContentProgress=compositeProgress.createSubProgress();var findMatchingFilesProgress=new Common.CompositeProgress(compositeProgress.createSubProgress());for(var i=0;i<projects.length;++i){var project=projects[i];var weight=project.uiSourceCodes().length;var findMatchingFilesInProjectProgress=findMatchingFilesProgress.createSubProgress(weight);var barrierCallback=barrier.createCallback();var filesMathingFileQuery=this._projectFilesMatchingFileQuery(project,searchConfig);var callback=this._processMatchingFilesForProject.bind(this,this._searchId,project,filesMathingFileQuery,barrierCallback);project.findFilesMatchingSearchRequest(searchConfig,filesMathingFileQuery,findMatchingFilesInProjectProgress,callback);}
barrier.callWhenDone(this._processMatchingFiles.bind(this,this._searchId,searchContentProgress,this._searchFinishedCallback.bind(this,true)));}
_projectFilesMatchingFileQuery(project,searchConfig,dirtyOnly){var result=[];var uiSourceCodes=project.uiSourceCodes();for(var i=0;i<uiSourceCodes.length;++i){var uiSourceCode=uiSourceCodes[i];if(!uiSourceCode.contentType().isTextType())
continue;var binding=Persistence.persistence.binding(uiSourceCode);if(binding&&binding.network===uiSourceCode)
continue;if(dirtyOnly&&!uiSourceCode.isDirty())
continue;if(this._searchConfig.filePathMatchesFileQuery(uiSourceCode.fullDisplayName()))
result.push(uiSourceCode.url());}
result.sort(String.naturalOrderComparator);return result;}
_processMatchingFilesForProject(searchId,project,filesMathingFileQuery,callback,files){if(searchId!==this._searchId){this._searchFinishedCallback(false);return;}
files.sort(String.naturalOrderComparator);files=files.intersectOrdered(filesMathingFileQuery,String.naturalOrderComparator);var dirtyFiles=this._projectFilesMatchingFileQuery(project,this._searchConfig,true);files=files.mergeOrdered(dirtyFiles,String.naturalOrderComparator);var uiSourceCodes=[];for(var i=0;i<files.length;++i){var uiSourceCode=project.uiSourceCodeForURL(files[i]);if(uiSourceCode){var script=Bindings.DefaultScriptMapping.scriptForUISourceCode(uiSourceCode);if(script&&!script.isAnonymousScript())
continue;uiSourceCodes.push(uiSourceCode);}}
uiSourceCodes.sort(Sources.SourcesSearchScope._filesComparator);this._searchResultCandidates=this._searchResultCandidates.mergeOrdered(uiSourceCodes,Sources.SourcesSearchScope._filesComparator);callback();}
_processMatchingFiles(searchId,progress,callback){if(searchId!==this._searchId){this._searchFinishedCallback(false);return;}
var files=this._searchResultCandidates;if(!files.length){progress.done();callback();return;}
progress.setTotalWork(files.length);var fileIndex=0;var maxFileContentRequests=20;var callbacksLeft=0;for(var i=0;i<maxFileContentRequests&&i<files.length;++i)
scheduleSearchInNextFileOrFinish.call(this);function searchInNextFile(uiSourceCode){if(uiSourceCode.isDirty())
contentLoaded.call(this,uiSourceCode,uiSourceCode.workingCopy());else
uiSourceCode.requestContent().then(contentLoaded.bind(this,uiSourceCode));}
function scheduleSearchInNextFileOrFinish(){if(fileIndex>=files.length){if(!callbacksLeft){progress.done();callback();return;}
return;}
++callbacksLeft;var uiSourceCode=files[fileIndex++];setTimeout(searchInNextFile.bind(this,uiSourceCode),0);}
function contentLoaded(uiSourceCode,content){function matchesComparator(a,b){return a.lineNumber-b.lineNumber;}
progress.worked(1);var matches=[];var queries=this._searchConfig.queries();if(content!==null){for(var i=0;i<queries.length;++i){var nextMatches=Common.ContentProvider.performSearchInContent(content,queries[i],!this._searchConfig.ignoreCase(),this._searchConfig.isRegex());matches=matches.mergeOrdered(nextMatches,matchesComparator);}}
if(matches){var searchResult=new Sources.FileBasedSearchResult(uiSourceCode,matches);this._searchResultCallback(searchResult);}
--callbacksLeft;scheduleSearchInNextFileOrFinish.call(this);}}
stopSearch(){++this._searchId;}};;Sources.SourcesPanel=class extends UI.Panel{constructor(){super('sources');Sources.SourcesPanel._instance=this;this.registerRequiredCSS('sources/sourcesPanel.css');new UI.DropTarget(this.element,[UI.DropTarget.Types.Files],Common.UIString('Drop workspace folder here'),this._handleDrop.bind(this));this._workspace=Workspace.workspace;this._togglePauseAction=(UI.actionRegistry.action('debugger.toggle-pause'));this._stepOverAction=(UI.actionRegistry.action('debugger.step-over'));this._stepIntoAction=(UI.actionRegistry.action('debugger.step-into'));this._stepOutAction=(UI.actionRegistry.action('debugger.step-out'));this._toggleBreakpointsActiveAction=(UI.actionRegistry.action('debugger.toggle-breakpoints-active'));this._debugToolbar=this._createDebugToolbar();this._debugToolbarDrawer=this._createDebugToolbarDrawer();this._debuggerPausedMessage=new Sources.DebuggerPausedMessage();const initialDebugSidebarWidth=225;this._splitWidget=new UI.SplitWidget(true,true,'sourcesPanelSplitViewState',initialDebugSidebarWidth);this._splitWidget.enableShowModeSaving();this._splitWidget.show(this.element);const initialNavigatorWidth=225;this.editorView=new UI.SplitWidget(true,false,'sourcesPanelNavigatorSplitViewState',initialNavigatorWidth);this.editorView.enableShowModeSaving();this.editorView.element.tabIndex=0;this._splitWidget.setMainWidget(this.editorView);this._navigatorTabbedLocation=UI.viewManager.createTabbedLocation(this._revealNavigatorSidebar.bind(this),'navigator-view',true);var tabbedPane=this._navigatorTabbedLocation.tabbedPane();tabbedPane.setMinimumSize(100,25);tabbedPane.element.classList.add('navigator-tabbed-pane');var navigatorMenuButton=new UI.ToolbarMenuButton(this._populateNavigatorMenu.bind(this),true);navigatorMenuButton.setTitle(Common.UIString('More options'));tabbedPane.rightToolbar().appendToolbarItem(navigatorMenuButton);this.editorView.setSidebarWidget(tabbedPane);this._sourcesView=new Sources.SourcesView();this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._sourcesView.registerShortcuts(this.registerShortcuts.bind(this));this._toggleNavigatorSidebarButton=this.editorView.createShowHideSidebarButton('navigator');this._toggleDebuggerSidebarButton=this._splitWidget.createShowHideSidebarButton('debugger');this.editorView.setMainWidget(this._sourcesView);this._threadsSidebarPane=null;this._watchSidebarPane=(UI.viewManager.view('sources.watch'));self.runtime.sharedInstance(Sources.XHRBreakpointsSidebarPane);this._callstackPane=self.runtime.sharedInstance(Sources.CallStackSidebarPane);this._callstackPane.registerShortcuts(this.registerShortcuts.bind(this));Common.moduleSetting('sidebarPosition').addChangeListener(this._updateSidebarPosition.bind(this));this._updateSidebarPosition();this._updateDebuggerButtonsAndStatus();this._pauseOnExceptionEnabledChanged();Common.moduleSetting('pauseOnExceptionEnabled').addChangeListener(this._pauseOnExceptionEnabledChanged,this);this._liveLocationPool=new Bindings.LiveLocationPool();this._setTarget(UI.context.flavor(SDK.Target));Bindings.breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointsActiveStateChanged,this._breakpointsActiveStateChanged,this);UI.context.addFlavorChangeListener(SDK.Target,this._onCurrentTargetChanged,this);UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame,this._callFrameChanged,this);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerWasEnabled,this._debuggerWasEnabled,this);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerPaused,this._debuggerPaused,this);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerResumed,event=>this._debuggerResumed((event.data)));SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.GlobalObjectCleared,event=>this._debuggerResumed((event.data)));SDK.targetManager.addEventListener(SDK.TargetManager.Events.AvailableNodeTargetsChanged,this._availableNodeTargetsChanged,this);new Sources.WorkspaceMappingTip(this,this._workspace);Extensions.extensionServer.addEventListener(Extensions.ExtensionServer.Events.SidebarPaneAdded,this._extensionSidebarPaneAdded,this);Components.DataSaverInfobar.maybeShowInPanel(this);SDK.targetManager.observeTargets(this);}
static instance(){if(Sources.SourcesPanel._instance)
return Sources.SourcesPanel._instance;return(self.runtime.sharedInstance(Sources.SourcesPanel));}
static updateResizerAndSidebarButtons(panel){panel._sourcesView.leftToolbar().removeToolbarItems();panel._sourcesView.rightToolbar().removeToolbarItems();panel._sourcesView.bottomToolbar().removeToolbarItems();var isInWrapper=Sources.SourcesPanel.WrapperView.isShowing()&&!UI.inspectorView.isDrawerMinimized();if(panel._splitWidget.isVertical()||isInWrapper)
panel._splitWidget.uninstallResizer(panel._sourcesView.toolbarContainerElement());else
panel._splitWidget.installResizer(panel._sourcesView.toolbarContainerElement());if(!isInWrapper){panel._sourcesView.leftToolbar().appendToolbarItem(panel._toggleNavigatorSidebarButton);if(panel._splitWidget.isVertical())
panel._sourcesView.rightToolbar().appendToolbarItem(panel._toggleDebuggerSidebarButton);else
panel._sourcesView.bottomToolbar().appendToolbarItem(panel._toggleDebuggerSidebarButton);}}
targetAdded(target){this._showThreadsIfNeeded();}
targetRemoved(target){}
_availableNodeTargetsChanged(){this._showThreadsIfNeeded();}
_showThreadsIfNeeded(){if(Sources.ThreadsSidebarPane.shouldBeShown()&&!this._threadsSidebarPane){this._threadsSidebarPane=(UI.viewManager.view('sources.threads'));if(this._sidebarPaneStack){this._sidebarPaneStack.showView(this._threadsSidebarPane,this._splitWidget.isVertical()?this._watchSidebarPane:this._callstackPane);}}}
_setTarget(target){if(!target)
return;var debuggerModel=target.model(SDK.DebuggerModel);if(!debuggerModel)
return;if(debuggerModel.isPaused()){this._showDebuggerPausedDetails((debuggerModel.debuggerPausedDetails()));}else{this._paused=false;this._clearInterface();this._toggleDebuggerSidebarButton.setEnabled(true);}}
_onCurrentTargetChanged(event){var target=(event.data);this._setTarget(target);}
paused(){return this._paused;}
wasShown(){UI.context.setFlavor(Sources.SourcesPanel,this);super.wasShown();var wrapper=Sources.SourcesPanel.WrapperView._instance;if(wrapper&&wrapper.isShowing()){UI.inspectorView.setDrawerMinimized(true);Sources.SourcesPanel.updateResizerAndSidebarButtons(this);}
this.editorView.setMainWidget(this._sourcesView);}
willHide(){super.willHide();UI.context.setFlavor(Sources.SourcesPanel,null);if(Sources.SourcesPanel.WrapperView.isShowing()){Sources.SourcesPanel.WrapperView._instance._showViewInWrapper();UI.inspectorView.setDrawerMinimized(false);Sources.SourcesPanel.updateResizerAndSidebarButtons(this);}}
resolveLocation(locationName){if(locationName==='sources-sidebar')
return this._sidebarPaneStack;else
return this._navigatorTabbedLocation;}
_ensureSourcesViewVisible(){if(Sources.SourcesPanel.WrapperView.isShowing())
return true;if(!UI.inspectorView.canSelectPanel('sources'))
return false;UI.viewManager.showView('sources');return true;}
onResize(){if(Common.moduleSetting('sidebarPosition').get()==='auto')
this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));}
searchableView(){return this._sourcesView.searchableView();}
_debuggerPaused(event){var debuggerModel=(event.data);var details=debuggerModel.debuggerPausedDetails();if(!this._paused)
this._setAsCurrentPanel();if(UI.context.flavor(SDK.Target)===debuggerModel.target())
this._showDebuggerPausedDetails((details));else if(!this._paused)
UI.context.setFlavor(SDK.Target,debuggerModel.target());}
_showDebuggerPausedDetails(details){this._paused=true;this._updateDebuggerButtonsAndStatus();UI.context.setFlavor(SDK.DebuggerPausedDetails,details);this._toggleDebuggerSidebarButton.setEnabled(false);this._revealDebuggerSidebar();window.focus();InspectorFrontendHost.bringToFront();}
_debuggerResumed(debuggerModel){var target=debuggerModel.target();if(UI.context.flavor(SDK.Target)!==target)
return;this._paused=false;this._clearInterface();this._toggleDebuggerSidebarButton.setEnabled(true);this._switchToPausedTargetTimeout=setTimeout(this._switchToPausedTarget.bind(this,debuggerModel),500);}
_debuggerWasEnabled(event){var debuggerModel=(event.data);if(UI.context.flavor(SDK.Target)!==debuggerModel.target())
return;this._updateDebuggerButtonsAndStatus();}
get visibleView(){return this._sourcesView.visibleView();}
showUISourceCode(uiSourceCode,lineNumber,columnNumber,omitFocus){if(omitFocus){var wrapperShowing=Sources.SourcesPanel.WrapperView._instance&&Sources.SourcesPanel.WrapperView._instance.isShowing();if(!this.isShowing()&&!wrapperShowing)
return;}else{this._showEditor();}
this._sourcesView.showSourceLocation(uiSourceCode,lineNumber,columnNumber,omitFocus);}
_showEditor(){if(Sources.SourcesPanel.WrapperView._instance&&Sources.SourcesPanel.WrapperView._instance.isShowing())
return;this._setAsCurrentPanel();}
showUILocation(uiLocation,omitFocus){this.showUISourceCode(uiLocation.uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber,omitFocus);}
_revealInNavigator(uiSourceCode,skipReveal){var extensions=self.runtime.extensions(Sources.NavigatorView);Promise.all(extensions.map(extension=>extension.instance())).then(filterNavigators.bind(this));function filterNavigators(objects){for(var i=0;i<objects.length;++i){var navigatorView=(objects[i]);var viewId=extensions[i].descriptor()['viewId'];if(navigatorView.accept(uiSourceCode)){navigatorView.revealUISourceCode(uiSourceCode,true);if(skipReveal)
this._navigatorTabbedLocation.tabbedPane().selectTab(viewId);else
UI.viewManager.showView(viewId);}}}}
_populateNavigatorMenu(contextMenu){var groupByFolderSetting=Common.moduleSetting('navigatorGroupByFolder');contextMenu.appendItemsAtLocation('navigatorMenu');contextMenu.appendSeparator();contextMenu.appendCheckboxItem(Common.UIString('Group by folder'),()=>groupByFolderSetting.set(!groupByFolderSetting.get()),groupByFolderSetting.get());}
setIgnoreExecutionLineEvents(ignoreExecutionLineEvents){this._ignoreExecutionLineEvents=ignoreExecutionLineEvents;}
updateLastModificationTime(){this._lastModificationTime=window.performance.now();}
_executionLineChanged(liveLocation){var uiLocation=liveLocation.uiLocation();if(!uiLocation)
return;this._sourcesView.clearCurrentExecutionLine();this._sourcesView.setExecutionLocation(uiLocation);if(window.performance.now()-this._lastModificationTime<Sources.SourcesPanel._lastModificationTimeout)
return;this._sourcesView.showSourceLocation(uiLocation.uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber,undefined,true);}
_lastModificationTimeoutPassedForTest(){Sources.SourcesPanel._lastModificationTimeout=Number.MIN_VALUE;}
_updateLastModificationTimeForTest(){Sources.SourcesPanel._lastModificationTimeout=Number.MAX_VALUE;}
_callFrameChanged(){var callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!callFrame)
return;if(this._executionLineLocation)
this._executionLineLocation.dispose();this._executionLineLocation=Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(callFrame.location(),this._executionLineChanged.bind(this),this._liveLocationPool);}
_pauseOnExceptionEnabledChanged(){var enabled=Common.moduleSetting('pauseOnExceptionEnabled').get();this._pauseOnExceptionButton.setToggled(enabled);this._pauseOnExceptionButton.setTitle(Common.UIString(enabled?'Don\'t pause on exceptions':'Pause on exceptions'));this._debugToolbarDrawer.classList.toggle('expanded',enabled);}
_updateDebuggerButtonsAndStatus(){var currentTarget=UI.context.flavor(SDK.Target);var currentDebuggerModel=currentTarget?currentTarget.model(SDK.DebuggerModel):null;if(!currentDebuggerModel){this._togglePauseAction.setEnabled(false);this._stepOverAction.setEnabled(false);this._stepIntoAction.setEnabled(false);this._stepOutAction.setEnabled(false);}else if(this._paused){this._togglePauseAction.setToggled(true);this._togglePauseAction.setEnabled(true);this._stepOverAction.setEnabled(true);this._stepIntoAction.setEnabled(true);this._stepOutAction.setEnabled(true);}else{this._togglePauseAction.setToggled(false);this._togglePauseAction.setEnabled(!currentDebuggerModel.isPausing());this._stepOverAction.setEnabled(false);this._stepIntoAction.setEnabled(false);this._stepOutAction.setEnabled(false);}
var details=currentDebuggerModel?currentDebuggerModel.debuggerPausedDetails():null;this._debuggerPausedMessage.render(details,Bindings.debuggerWorkspaceBinding,Bindings.breakpointManager);}
_clearInterface(){this._sourcesView.clearCurrentExecutionLine();this._updateDebuggerButtonsAndStatus();UI.context.setFlavor(SDK.DebuggerPausedDetails,null);if(this._switchToPausedTargetTimeout)
clearTimeout(this._switchToPausedTargetTimeout);this._liveLocationPool.disposeAll();}
_switchToPausedTarget(debuggerModel){delete this._switchToPausedTargetTimeout;if(this._paused)
return;if(debuggerModel.isPaused())
return;var debuggerModels=SDK.targetManager.models(SDK.DebuggerModel);for(var i=0;i<debuggerModels.length;++i){if(debuggerModels[i].isPaused()){UI.context.setFlavor(SDK.Target,debuggerModels[i].target());break;}}}
_togglePauseOnExceptions(){Common.moduleSetting('pauseOnExceptionEnabled').set(!this._pauseOnExceptionButton.toggled());}
_runSnippet(){var uiSourceCode=this._sourcesView.currentUISourceCode();if(!uiSourceCode)
return false;var currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(!currentExecutionContext)
return false;if(uiSourceCode.project().type()!==Workspace.projectTypes.Snippets)
return false;Snippets.scriptSnippetModel.evaluateScriptSnippet(currentExecutionContext,uiSourceCode);return true;}
_editorSelected(event){var uiSourceCode=(event.data);if(this.editorView.mainWidget()&&Common.moduleSetting('autoRevealInNavigator').get())
this._revealInNavigator(uiSourceCode,true);}
_togglePause(){var target=UI.context.flavor(SDK.Target);if(!target)
return true;var debuggerModel=target.model(SDK.DebuggerModel);if(!debuggerModel)
return true;if(this._paused){this._paused=false;debuggerModel.resume();}else{debuggerModel.pause();}
this._clearInterface();return true;}
_prepareToResume(){if(!this._paused)
return null;this._paused=false;this._clearInterface();var target=UI.context.flavor(SDK.Target);return target?target.model(SDK.DebuggerModel):null;}
_longResume(event){var debuggerModel=this._prepareToResume();if(!debuggerModel)
return;debuggerModel.skipAllPausesUntilReloadOrTimeout(500);debuggerModel.resume();}
_stepOver(){var debuggerModel=this._prepareToResume();if(!debuggerModel)
return true;debuggerModel.stepOver();return true;}
_stepInto(){var debuggerModel=this._prepareToResume();if(!debuggerModel)
return true;debuggerModel.stepInto();return true;}
_stepOut(){var debuggerModel=this._prepareToResume();if(!debuggerModel)
return true;debuggerModel.stepOut();return true;}
_continueToLocation(uiLocation){var executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext)
return;var rawLocation=Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(executionContext.debuggerModel,uiLocation.uiSourceCode,uiLocation.lineNumber,0);if(!rawLocation)
return;if(!this._prepareToResume())
return;rawLocation.continueToLocation();}
_toggleBreakpointsActive(){Bindings.breakpointManager.setBreakpointsActive(!Bindings.breakpointManager.breakpointsActive());}
_breakpointsActiveStateChanged(event){var active=event.data;this._toggleBreakpointsActiveAction.setToggled(!active);this._sourcesView.toggleBreakpointsActiveState(active);}
_createDebugToolbar(){var debugToolbar=new UI.Toolbar('scripts-debug-toolbar');var longResumeButton=new UI.ToolbarButton(Common.UIString('Resume with all pauses blocked for 500 ms'),'largeicon-play');longResumeButton.addEventListener(UI.ToolbarButton.Events.Click,this._longResume,this);debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._togglePauseAction,[longResumeButton],[]));debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepOverAction));debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepIntoAction));debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepOutAction));debugToolbar.appendSeparator();debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleBreakpointsActiveAction));this._pauseOnExceptionButton=new UI.ToolbarToggle('','largeicon-pause-on-exceptions');this._pauseOnExceptionButton.addEventListener(UI.ToolbarButton.Events.Click,this._togglePauseOnExceptions,this);debugToolbar.appendToolbarItem(this._pauseOnExceptionButton);debugToolbar.appendSeparator();debugToolbar.appendToolbarItem(new UI.ToolbarSettingCheckbox(Common.moduleSetting('enableAsyncStackTraces'),Common.UIString('Capture async stack traces'),Common.UIString('Async')));return debugToolbar;}
_createDebugToolbarDrawer(){var debugToolbarDrawer=createElementWithClass('div','scripts-debug-toolbar-drawer');var label=Common.UIString('Pause On Caught Exceptions');var setting=Common.moduleSetting('pauseOnCaughtException');debugToolbarDrawer.appendChild(UI.SettingsUI.createSettingCheckbox(label,setting,true));return debugToolbarDrawer;}
_showLocalHistory(uiSourceCode){Sources.RevisionHistoryView.showHistory(uiSourceCode);}
appendApplicableItems(event,contextMenu,target){this._appendUISourceCodeItems(event,contextMenu,target);this._appendUISourceCodeFrameItems(event,contextMenu,target);this.appendUILocationItems(contextMenu,target);this._appendRemoteObjectItems(contextMenu,target);this._appendNetworkRequestItems(contextMenu,target);}
mapFileSystemToNetwork(uiSourceCode){Sources.SelectUISourceCodeForProjectTypesDialog.show(uiSourceCode.name(),[Workspace.projectTypes.Network,Workspace.projectTypes.ContentScripts],mapFileSystemToNetwork);function mapFileSystemToNetwork(networkUISourceCode){if(!networkUISourceCode)
return;var fileSystemPath=Persistence.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());Workspace.fileSystemMapping.addMappingForResource(networkUISourceCode.url(),fileSystemPath,uiSourceCode.url());}}
mapNetworkToFileSystem(networkUISourceCode){Sources.SelectUISourceCodeForProjectTypesDialog.show(networkUISourceCode.name(),[Workspace.projectTypes.FileSystem],mapNetworkToFileSystem);function mapNetworkToFileSystem(uiSourceCode){if(!uiSourceCode)
return;var fileSystemPath=Persistence.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());Workspace.fileSystemMapping.addMappingForResource(networkUISourceCode.url(),fileSystemPath,uiSourceCode.url());}}
_removeNetworkMapping(uiSourceCode){Workspace.fileSystemMapping.removeMappingForURL(uiSourceCode.url());}
_appendUISourceCodeMappingItems(contextMenu,uiSourceCode){Sources.NavigatorView.appendAddFolderItem(contextMenu);if(Runtime.experiments.isEnabled('persistence2'))
return;if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem){var binding=Persistence.persistence.binding(uiSourceCode);if(!binding){contextMenu.appendItem(Common.UIString.capitalize('Map to ^network ^resource\u2026'),this.mapFileSystemToNetwork.bind(this,uiSourceCode));}else{contextMenu.appendItem(Common.UIString.capitalize('Remove ^network ^mapping'),this._removeNetworkMapping.bind(this,binding.network));}}
function filterProject(project){return project.type()===Workspace.projectTypes.FileSystem;}
if(uiSourceCode.project().type()===Workspace.projectTypes.Network||uiSourceCode.project().type()===Workspace.projectTypes.ContentScripts){if(!this._workspace.projects().filter(filterProject).length)
return;if(this._workspace.uiSourceCodeForURL(uiSourceCode.url())===uiSourceCode){contextMenu.appendItem(Common.UIString.capitalize('Map to ^file ^system ^resource\u2026'),this.mapNetworkToFileSystem.bind(this,uiSourceCode));}}}
_appendUISourceCodeItems(event,contextMenu,target){if(!(target instanceof Workspace.UISourceCode))
return;var uiSourceCode=(target);if(!uiSourceCode.project().isServiceProject()&&!event.target.isSelfOrDescendant(this._navigatorTabbedLocation.widget().element)){contextMenu.appendItem(Common.UIString.capitalize('Reveal in ^navigator'),this._handleContextMenuReveal.bind(this,uiSourceCode));contextMenu.appendSeparator();}
this._appendUISourceCodeMappingItems(contextMenu,uiSourceCode);if(!uiSourceCode.project().canSetFileContent()){contextMenu.appendItem(Common.UIString.capitalize('Local ^modifications\u2026'),this._showLocalHistory.bind(this,uiSourceCode));}}
_appendUISourceCodeFrameItems(event,contextMenu,target){if(!(target instanceof SourceFrame.UISourceCodeFrame))
return;contextMenu.appendAction('debugger.evaluate-selection');}
appendUILocationItems(contextMenu,object){if(!(object instanceof Workspace.UILocation))
return;var uiLocation=(object);var uiSourceCode=uiLocation.uiSourceCode;var contentType=uiSourceCode.contentType();if(contentType.hasScripts()){var target=UI.context.flavor(SDK.Target);var debuggerModel=target?target.model(SDK.DebuggerModel):null;if(debuggerModel&&debuggerModel.isPaused()){contextMenu.appendItem(Common.UIString.capitalize('Continue to ^here'),this._continueToLocation.bind(this,uiLocation));}
this._callstackPane.appendBlackboxURLContextMenuItems(contextMenu,uiSourceCode);}}
_handleContextMenuReveal(uiSourceCode){this.editorView.showBoth();this._revealInNavigator(uiSourceCode);}
_appendRemoteObjectItems(contextMenu,target){if(!(target instanceof SDK.RemoteObject))
return;var remoteObject=(target);contextMenu.appendItem(Common.UIString.capitalize('Store as ^global ^variable'),this._saveToTempVariable.bind(this,remoteObject));if(remoteObject.type==='function'){contextMenu.appendItem(Common.UIString.capitalize('Show ^function ^definition'),this._showFunctionDefinition.bind(this,remoteObject));}}
_appendNetworkRequestItems(contextMenu,target){if(!(target instanceof SDK.NetworkRequest))
return;var request=(target);var uiSourceCode=this._workspace.uiSourceCodeForURL(request.url());if(!uiSourceCode)
return;var openText=Common.UIString.capitalize('Open in Sources ^panel');contextMenu.appendItem(openText,this.showUILocation.bind(this,uiSourceCode.uiLocation(0,0)));}
_saveToTempVariable(remoteObject){var currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(!currentExecutionContext)
return;currentExecutionContext.globalObject('',false,didGetGlobalObject);function didGetGlobalObject(global,exceptionDetails){function remoteFunction(value){var prefix='temp';var index=1;while((prefix+index)in this)
++index;var name=prefix+index;this[name]=value;return name;}
if(!!exceptionDetails||!global){failedToSave(global);}else{global.callFunction(remoteFunction,[SDK.RemoteObject.toCallArgument(remoteObject)],didSave.bind(null,global));}}
function didSave(global,result,wasThrown){global.release();if(wasThrown||!result||result.type!=='string'){failedToSave(result);}else{ConsoleModel.consoleModel.evaluateCommandInConsole((currentExecutionContext),(result.value),false);}}
function failedToSave(result){var message=Common.UIString('Failed to save to temp variable.');if(result){message+=' '+result.description;result.release();}
Common.console.error(message);}}
_showFunctionDefinition(remoteObject){remoteObject.debuggerModel().functionDetailsPromise(remoteObject).then(this._didGetFunctionDetails.bind(this));}
_didGetFunctionDetails(response){if(!response||!response.location)
return;var location=response.location;if(!location)
return;var uiLocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);if(uiLocation)
this.showUILocation(uiLocation);}
showGoToSourceDialog(){this._sourcesView.showOpenResourceDialog();}
_revealNavigatorSidebar(){this._setAsCurrentPanel();this.editorView.showBoth(true);}
_revealDebuggerSidebar(){this._setAsCurrentPanel();this._splitWidget.showBoth(true);}
_updateSidebarPosition(){var vertically;var position=Common.moduleSetting('sidebarPosition').get();if(position==='right')
vertically=false;else if(position==='bottom')
vertically=true;else
vertically=UI.inspectorView.element.offsetWidth<680;if(this.sidebarPaneView&&vertically===!this._splitWidget.isVertical())
return;if(this.sidebarPaneView&&this.sidebarPaneView.shouldHideOnDetach())
return;if(this.sidebarPaneView)
this.sidebarPaneView.detach();this._splitWidget.setVertical(!vertically);this._splitWidget.element.classList.toggle('sources-split-view-vertical',vertically);Sources.SourcesPanel.updateResizerAndSidebarButtons(this);var vbox=new UI.VBox();vbox.element.appendChild(this._debugToolbarDrawer);vbox.setMinimumAndPreferredSizes(25,25,Sources.SourcesPanel.minToolbarWidth,100);this._sidebarPaneStack=UI.viewManager.createStackLocation(this._revealDebuggerSidebar.bind(this));this._sidebarPaneStack.widget().element.classList.add('overflow-auto');this._sidebarPaneStack.widget().show(vbox.element);this._sidebarPaneStack.widget().element.appendChild(this._debuggerPausedMessage.element());vbox.element.appendChild(this._debugToolbar.element);if(this._threadsSidebarPane)
this._sidebarPaneStack.showView(this._threadsSidebarPane);if(!vertically)
this._sidebarPaneStack.appendView(this._watchSidebarPane);this._sidebarPaneStack.showView(this._callstackPane);var jsBreakpoints=(UI.viewManager.view('sources.jsBreakpoints'));var scopeChainView=(UI.viewManager.view('sources.scopeChain'));if(!vertically){this._sidebarPaneStack.showView(scopeChainView);this._sidebarPaneStack.showView(jsBreakpoints);this._extensionSidebarPanesContainer=this._sidebarPaneStack;this.sidebarPaneView=vbox;}else{var splitWidget=new UI.SplitWidget(true,true,'sourcesPanelDebuggerSidebarSplitViewState',0.5);splitWidget.setMainWidget(vbox);this._sidebarPaneStack.showView(jsBreakpoints);var tabbedLocation=UI.viewManager.createTabbedLocation(this._revealDebuggerSidebar.bind(this));splitWidget.setSidebarWidget(tabbedLocation.tabbedPane());tabbedLocation.appendView(scopeChainView);tabbedLocation.appendView(this._watchSidebarPane);this._extensionSidebarPanesContainer=tabbedLocation;this.sidebarPaneView=splitWidget;}
this._sidebarPaneStack.appendApplicableItems('sources-sidebar');var extensionSidebarPanes=Extensions.extensionServer.sidebarPanes();for(var i=0;i<extensionSidebarPanes.length;++i)
this._addExtensionSidebarPane(extensionSidebarPanes[i]);this._splitWidget.setSidebarWidget(this.sidebarPaneView);}
_setAsCurrentPanel(){return UI.viewManager.showView('sources');}
_extensionSidebarPaneAdded(event){var pane=(event.data);this._addExtensionSidebarPane(pane);}
_addExtensionSidebarPane(pane){if(pane.panelName()===this.name)
this._extensionSidebarPanesContainer.appendView(pane);}
sourcesView(){return this._sourcesView;}
_handleDrop(dataTransfer){var items=dataTransfer.items;if(!items.length)
return;var entry=items[0].webkitGetAsEntry();if(!entry.isDirectory)
return;InspectorFrontendHost.upgradeDraggedFileSystemPermissions(entry.filesystem);}};Sources.SourcesPanel._lastModificationTimeout=200;Sources.SourcesPanel.minToolbarWidth=215;Sources.SourcesPanel.UILocationRevealer=class{reveal(uiLocation,omitFocus){if(!(uiLocation instanceof Workspace.UILocation))
return Promise.reject(new Error('Internal error: not a ui location'));Sources.SourcesPanel.instance().showUILocation(uiLocation,omitFocus);return Promise.resolve();}};Sources.SourcesPanel.DebuggerLocationRevealer=class{reveal(rawLocation,omitFocus){if(!(rawLocation instanceof SDK.DebuggerModel.Location))
return Promise.reject(new Error('Internal error: not a debugger location'));Sources.SourcesPanel.instance().showUILocation(Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation),omitFocus);return Promise.resolve();}};Sources.SourcesPanel.UISourceCodeRevealer=class{reveal(uiSourceCode,omitFocus){if(!(uiSourceCode instanceof Workspace.UISourceCode))
return Promise.reject(new Error('Internal error: not a ui source code'));Sources.SourcesPanel.instance().showUISourceCode(uiSourceCode,undefined,undefined,omitFocus);return Promise.resolve();}};Sources.SourcesPanel.DebuggerPausedDetailsRevealer=class{reveal(object){return Sources.SourcesPanel.instance()._setAsCurrentPanel();}};Sources.SourcesPanel.RevealingActionDelegate=class{handleAction(context,actionId){var panel=Sources.SourcesPanel.instance();if(!panel._ensureSourcesViewVisible())
return false;switch(actionId){case'debugger.toggle-pause':panel._togglePause();return true;case'sources.go-to-source':panel.showGoToSourceDialog();return true;}
return false;}};Sources.SourcesPanel.DebuggingActionDelegate=class{handleAction(context,actionId){var panel=Sources.SourcesPanel.instance();switch(actionId){case'debugger.step-over':panel._stepOver();return true;case'debugger.step-into':panel._stepInto();return true;case'debugger.step-out':panel._stepOut();return true;case'debugger.run-snippet':panel._runSnippet();return true;case'debugger.toggle-breakpoints-active':panel._toggleBreakpointsActive();return true;case'debugger.evaluate-selection':var frame=UI.context.flavor(SourceFrame.UISourceCodeFrame);if(frame){var text=frame.textEditor.text(frame.textEditor.selection());var executionContext=UI.context.flavor(SDK.ExecutionContext);if(executionContext)
ConsoleModel.consoleModel.evaluateCommandInConsole(executionContext,text,true);}
return true;}
return false;}};Sources.SourcesPanel.WrapperView=class extends UI.VBox{constructor(){super();this.element.classList.add('sources-view-wrapper');Sources.SourcesPanel.WrapperView._instance=this;this._view=Sources.SourcesPanel.instance()._sourcesView;}
static isShowing(){return!!Sources.SourcesPanel.WrapperView._instance&&Sources.SourcesPanel.WrapperView._instance.isShowing();}
wasShown(){if(!Sources.SourcesPanel.instance().isShowing())
this._showViewInWrapper();else
UI.inspectorView.setDrawerMinimized(true);Sources.SourcesPanel.updateResizerAndSidebarButtons(Sources.SourcesPanel.instance());}
willHide(){UI.inspectorView.setDrawerMinimized(false);setImmediate(()=>Sources.SourcesPanel.updateResizerAndSidebarButtons(Sources.SourcesPanel.instance()));}
_showViewInWrapper(){this._view.show(this.element);}};;Sources.WorkspaceMappingTip=class{constructor(sourcesPanel,workspace){this._sourcesPanel=sourcesPanel;this._workspace=workspace;this._sourcesView=this._sourcesPanel.sourcesView();this._workspaceInfobarDisabledSetting=Common.settings.createSetting('workspaceInfobarDisabled',false);this._workspaceMappingInfobarDisabledSetting=Common.settings.createSetting('workspaceMappingInfobarDisabled',false);if(this._workspaceInfobarDisabledSetting.get()&&this._workspaceMappingInfobarDisabledSetting.get())
return;this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingCreated,this._bindingCreated,this);}
_bindingCreated(event){var binding=(event.data);if(binding.network[Sources.WorkspaceMappingTip._infobarSymbol])
binding.network[Sources.WorkspaceMappingTip._infobarSymbol].dispose();if(binding.fileSystem[Sources.WorkspaceMappingTip._infobarSymbol])
binding.fileSystem[Sources.WorkspaceMappingTip._infobarSymbol].dispose();}
_editorSelected(event){var uiSourceCode=(event.data);if(this._editorSelectedTimer)
clearTimeout(this._editorSelectedTimer);this._editorSelectedTimer=setTimeout(this._updateSuggestedMappingInfobar.bind(this,uiSourceCode),3000);}
_updateSuggestedMappingInfobar(uiSourceCode){var uiSourceCodeFrame=this._sourcesView.viewForFile(uiSourceCode);if(!uiSourceCodeFrame.isShowing())
return;if(uiSourceCode[Sources.WorkspaceMappingTip._infobarSymbol])
return;if(!this._workspaceMappingInfobarDisabledSetting.get()&&uiSourceCode.project().type()===Workspace.projectTypes.FileSystem){if(Persistence.persistence.binding(uiSourceCode))
return;var networkProjects=this._workspace.projectsForType(Workspace.projectTypes.Network);networkProjects=networkProjects.concat(this._workspace.projectsForType(Workspace.projectTypes.ContentScripts));for(var i=0;i<networkProjects.length;++i){var name=uiSourceCode.name();var networkUiSourceCodes=networkProjects[i].uiSourceCodes();for(var j=0;j<networkUiSourceCodes.length;++j){if(networkUiSourceCodes[j].name()===name&&this._isLocalHost(networkUiSourceCodes[j].url())){this._showMappingInfobar(uiSourceCode,false);return;}}}}
if(uiSourceCode.project().type()===Workspace.projectTypes.Network||uiSourceCode.project().type()===Workspace.projectTypes.ContentScripts){if(!this._isLocalHost(uiSourceCode.url())||Persistence.persistence.binding(uiSourceCode))
return;var filesystemProjects=this._workspace.projectsForType(Workspace.projectTypes.FileSystem);for(var i=0;i<filesystemProjects.length;++i){var name=uiSourceCode.name();var fsUiSourceCodes=filesystemProjects[i].uiSourceCodes();for(var j=0;j<fsUiSourceCodes.length;++j){if(fsUiSourceCodes[j].name()===name){this._showMappingInfobar(uiSourceCode,true);return;}}}
this._showWorkspaceInfobar(uiSourceCode);}}
_isLocalHost(url){var parsedURL=url.asParsedURL();return!!parsedURL&&parsedURL.host==='localhost';}
_showWorkspaceInfobar(uiSourceCode){var infobar=UI.Infobar.create(UI.Infobar.Type.Info,Common.UIString('Serving from the file system? Add your files into the workspace.'),this._workspaceInfobarDisabledSetting);if(!infobar)
return;infobar.createDetailsRowMessage(Common.UIString('If you add files into your DevTools workspace, your changes will be persisted to disk.'));infobar.createDetailsRowMessage(Common.UIString('To add a folder into the workspace, drag and drop it into the Sources panel.'));this._appendInfobar(uiSourceCode,infobar);}
_showMappingInfobar(uiSourceCode,isNetwork){var title;if(isNetwork)
title=Common.UIString('Map network resource \'%s\' to workspace?',uiSourceCode.url());else
title=Common.UIString('Map workspace resource \'%s\' to network?',uiSourceCode.url());var infobar=UI.Infobar.create(UI.Infobar.Type.Info,title,this._workspaceMappingInfobarDisabledSetting);if(!infobar)
return;infobar.createDetailsRowMessage(Common.UIString('You can map files in your workspace to the ones loaded over the network. As a result, changes made in DevTools will be persisted to disk.'));infobar.createDetailsRowMessage(Common.UIString('Use context menu to establish the mapping at any time.'));var anchor=createElementWithClass('span','link');anchor.textContent=Common.UIString('Establish the mapping now...');anchor.addEventListener('click',this._establishTheMapping.bind(this,uiSourceCode),false);infobar.createDetailsRowMessage('').appendChild(anchor);this._appendInfobar(uiSourceCode,infobar);}
_establishTheMapping(uiSourceCode,event){event.consume(true);if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem)
this._sourcesPanel.mapFileSystemToNetwork(uiSourceCode);else
this._sourcesPanel.mapNetworkToFileSystem(uiSourceCode);}
_appendInfobar(uiSourceCode,infobar){var uiSourceCodeFrame=this._sourcesView.viewForFile(uiSourceCode);var rowElement=infobar.createDetailsRowMessage(Common.UIString('For more information on workspaces, refer to the '));rowElement.appendChild(UI.createDocumentationLink('../setup/setup-workflow',Common.UIString('workspaces documentation')));rowElement.createTextChild('.');uiSourceCode[Sources.WorkspaceMappingTip._infobarSymbol]=infobar;uiSourceCodeFrame.attachInfobars([infobar]);UI.runCSSAnimationOnce(infobar.element,'source-frame-infobar-animation');}};Sources.WorkspaceMappingTip._infobarSymbol=Symbol('infobar');;Sources.XHRBreakpointsSidebarPane=class extends Components.BreakpointsSidebarPaneBase{constructor(){super();this._xhrBreakpointsSetting=Common.settings.createLocalSetting('xhrBreakpoints',[]);this._breakpointElements=new Map();this._addButton=new UI.ToolbarButton(Common.UIString('Add breakpoint'),'largeicon-add');this._addButton.addEventListener(UI.ToolbarButton.Events.Click,this._addButtonClicked.bind(this));this.emptyElement.addEventListener('contextmenu',this._emptyElementContextMenu.bind(this),true);SDK.targetManager.observeTargets(this,SDK.Target.Capability.Browser);this._update();}
targetAdded(target){this._restoreBreakpoints(target);}
targetRemoved(target){}
toolbarItems(){return[this._addButton];}
_emptyElementContextMenu(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString.capitalize('Add ^breakpoint'),this._addButtonClicked.bind(this));contextMenu.show();}
_addButtonClicked(){UI.viewManager.showView('sources.xhrBreakpoints');var inputElementContainer=createElementWithClass('p','breakpoint-condition');inputElementContainer.textContent=Common.UIString('Break when URL contains:');var inputElement=inputElementContainer.createChild('span','editing');inputElement.id='breakpoint-condition-input';this.addListElement(inputElementContainer,(this.listElement.firstChild));function finishEditing(accept,e,text){this.removeListElement(inputElementContainer);if(accept){this._setBreakpoint(text,true);this._saveBreakpoints();}}
var config=new UI.InplaceEditor.Config(finishEditing.bind(this,true),finishEditing.bind(this,false));UI.InplaceEditor.startEditing(inputElement,config);}
_setBreakpoint(url,enabled,target){if(enabled)
this._updateBreakpointOnTarget(url,true,target);if(this._breakpointElements.has(url)){this._breakpointElements.get(url)._checkboxElement.checked=enabled;return;}
var element=createElement('li');element._url=url;element.addEventListener('contextmenu',this._contextMenu.bind(this,url),true);var title=url?Common.UIString('URL contains "%s"',url):Common.UIString('Any XHR');var label=UI.createCheckboxLabel(title,enabled);element.appendChild(label);label.checkboxElement.addEventListener('click',this._checkboxClicked.bind(this,url),false);element._checkboxElement=label.checkboxElement;label.classList.add('cursor-auto');label.textElement.addEventListener('dblclick',this._labelClicked.bind(this,url),false);var currentElement=(this.listElement.firstChild);while(currentElement){if(currentElement._url&&currentElement._url<element._url)
break;currentElement=(currentElement.nextSibling);}
this.addListElement(element,currentElement);this._breakpointElements.set(url,element);}
_removeBreakpoint(url,target){var element=this._breakpointElements.get(url);if(!element)
return;this.removeListElement(element);this._breakpointElements.delete(url);if(element._checkboxElement.checked)
this._updateBreakpointOnTarget(url,false,target);}
_updateBreakpointOnTarget(url,enable,target){var targets=target?[target]:SDK.targetManager.targets(SDK.Target.Capability.Browser);for(target of targets){if(enable)
target.domdebuggerAgent().setXHRBreakpoint(url);else
target.domdebuggerAgent().removeXHRBreakpoint(url);}}
_contextMenu(url,event){var contextMenu=new UI.ContextMenu(event);function removeBreakpoint(){this._removeBreakpoint(url);this._saveBreakpoints();}
function removeAllBreakpoints(){for(var url of this._breakpointElements.keys())
this._removeBreakpoint(url);this._saveBreakpoints();}
var removeAllTitle=Common.UIString.capitalize('Remove ^all ^breakpoints');contextMenu.appendItem(Common.UIString.capitalize('Add ^breakpoint'),this._addButtonClicked.bind(this));contextMenu.appendItem(Common.UIString.capitalize('Remove ^breakpoint'),removeBreakpoint.bind(this));contextMenu.appendItem(removeAllTitle,removeAllBreakpoints.bind(this));contextMenu.show();}
_checkboxClicked(url,event){this._updateBreakpointOnTarget(url,event.target.checked);this._saveBreakpoints();}
_labelClicked(url){var element=this._breakpointElements.get(url)||null;var inputElement=createElementWithClass('span','breakpoint-condition editing');inputElement.textContent=url;this.listElement.insertBefore(inputElement,element);element.classList.add('hidden');function finishEditing(accept,e,text){this.removeListElement(inputElement);if(accept){this._removeBreakpoint(url);this._setBreakpoint(text,element._checkboxElement.checked);this._saveBreakpoints();}else{element.classList.remove('hidden');}}
UI.InplaceEditor.startEditing(inputElement,new UI.InplaceEditor.Config(finishEditing.bind(this,true),finishEditing.bind(this,false)));}
flavorChanged(object){this._update();}
_update(){var details=UI.context.flavor(SDK.DebuggerPausedDetails);if(!details||details.reason!==SDK.DebuggerModel.BreakReason.XHR){if(this._highlightedElement){this._highlightedElement.classList.remove('breakpoint-hit');delete this._highlightedElement;}
return;}
var url=details.auxData['breakpointURL'];var element=this._breakpointElements.get(url);if(!element)
return;UI.viewManager.showView('sources.xhrBreakpoints');element.classList.add('breakpoint-hit');this._highlightedElement=element;}
_saveBreakpoints(){var breakpoints=[];for(var url of this._breakpointElements.keys())
breakpoints.push({url:url,enabled:this._breakpointElements.get(url)._checkboxElement.checked});this._xhrBreakpointsSetting.set(breakpoints);}
_restoreBreakpoints(target){var breakpoints=this._xhrBreakpointsSetting.get();for(var i=0;i<breakpoints.length;++i){var breakpoint=breakpoints[i];if(breakpoint&&typeof breakpoint.url==='string')
this._setBreakpoint(breakpoint.url,breakpoint.enabled,target);}}};;Sources.JavaScriptCompiler=class{constructor(sourceFrame){this._sourceFrame=sourceFrame;this._compiling=false;}
scheduleCompile(){if(this._compiling){this._recompileScheduled=true;return;}
if(this._timeout)
clearTimeout(this._timeout);this._timeout=setTimeout(this._compile.bind(this),Sources.JavaScriptCompiler.CompileDelay);}
_findRuntimeModel(){var debuggerModels=SDK.targetManager.models(SDK.DebuggerModel);var sourceCode=this._sourceFrame.uiSourceCode();for(var i=0;i<debuggerModels.length;++i){var scriptFile=Bindings.debuggerWorkspaceBinding.scriptFile(sourceCode,debuggerModels[i]);if(scriptFile)
return debuggerModels[i].runtimeModel();}
return SDK.targetManager.mainTarget()?SDK.targetManager.mainTarget().runtimeModel:null;}
_compile(){var runtimeModel=this._findRuntimeModel();if(!runtimeModel)
return;var currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(!currentExecutionContext)
return;this._compiling=true;var code=this._sourceFrame.textEditor.text();runtimeModel.compileScript(code,'',false,currentExecutionContext.id,compileCallback.bind(this));function compileCallback(scriptId,exceptionDetails){this._compiling=false;if(this._recompileScheduled){delete this._recompileScheduled;this.scheduleCompile();return;}
if(!exceptionDetails)
return;var text=SDK.RuntimeModel.simpleTextFromException(exceptionDetails);this._sourceFrame.uiSourceCode().addLineMessage(Workspace.UISourceCode.Message.Level.Error,text,exceptionDetails.lineNumber,exceptionDetails.columnNumber);this._compilationFinishedForTest();}}
_compilationFinishedForTest(){}};Sources.JavaScriptCompiler.CompileDelay=1000;;Sources.ObjectEventListenersSidebarPane=class extends UI.VBox{constructor(){super();this.element.classList.add('event-listeners-sidebar-pane');this._refreshButton=new UI.ToolbarButton(Common.UIString('Refresh'),'largeicon-refresh');this._refreshButton.addEventListener(UI.ToolbarButton.Events.Click,this._refreshClick,this);this._refreshButton.setEnabled(false);this._eventListenersView=new EventListeners.EventListenersView(this.element,this.update.bind(this));}
toolbarItems(){return[this._refreshButton];}
update(){if(this._lastRequestedContext){this._lastRequestedContext.runtimeModel.releaseObjectGroup(Sources.ObjectEventListenersSidebarPane._objectGroupName);delete this._lastRequestedContext;}
var executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext){this._eventListenersView.reset();this._eventListenersView.addEmptyHolderIfNeeded();return;}
this._lastRequestedContext=executionContext;Promise.all([this._windowObjectInContext(executionContext)]).then(this._eventListenersView.addObjects.bind(this._eventListenersView));}
wasShown(){super.wasShown();UI.context.addFlavorChangeListener(SDK.ExecutionContext,this.update,this);this._refreshButton.setEnabled(true);this.update();}
willHide(){super.willHide();UI.context.removeFlavorChangeListener(SDK.ExecutionContext,this.update,this);this._refreshButton.setEnabled(false);}
_windowObjectInContext(executionContext){return new Promise(windowObjectInContext);function windowObjectInContext(fulfill,reject){executionContext.evaluate('self',Sources.ObjectEventListenersSidebarPane._objectGroupName,false,true,false,false,false,mycallback);function mycallback(object){if(object)
fulfill(object);else
reject(null);}}}
_refreshClick(event){event.data.consume();this.update();}};Sources.ObjectEventListenersSidebarPane._objectGroupName='object-event-listeners-sidebar-pane';;Runtime.cachedResources["sources/callStackSidebarPane.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.blackboxed-message {\n    text-align: center;\n    font-style: italic;\n    padding: 4px;\n    color: #888;\n    background-color: #FFFFC2;\n}\n\n.blackboxed-message > .link {\n    margin-left: 5px;\n}\n\n.call-frame-item {\n    padding: 3px 8px 3px 20px;\n    position: relative;\n    min-height: 18px;\n    line-height: 15px;\n    display: flex;\n    flex-wrap: wrap;\n}\n\n.call-frame-chained-arrow {\n    transform: rotate(180deg);\n    margin-right: 3px;\n    flex-shrink: 0;\n}\n\n.call-frame-title-text {\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n.call-frame-item:not(.async-header) {\n    border-top: 1px solid #efefef;\n}\n\n.call-frame-item:not(.async-header):hover {\n    background-color: #eee;\n}\n\n.async-header + .call-frame-item {\n    border-top: 0;\n}\n\n.call-frame-item-title,\n.call-frame-location {\n    display: flex;\n    white-space: nowrap;\n}\n\n.call-frame-location {\n    color: #888;\n    margin-left: auto;\n    padding: 0 10px 0 10px;\n}\n\n.async-header::before {\n    content: \" \";\n    width: 100%;\n    border-top: 1px solid #d8d8d8;\n    margin-top: 8px;\n    position: absolute;\n    z-index: -1;\n    left: 0;\n}\n\n.async-header .call-frame-item-title {\n    font-weight: bold;\n    color: #999;\n    background-color: white;\n    margin-left: -5px;\n    padding: 0 5px;\n}\n\n.blackboxed-call-frame {\n    opacity: 0.6;\n    font-style: italic;\n}\n\n.selected-call-frame-icon {\n    display: none;\n    position: absolute;\n    top: 5px;\n    left: 4px;\n}\n\n.call-frame-item.selected .selected-call-frame-icon {\n    display: block;\n}\n\n\n/*# sourceURL=sources/callStackSidebarPane.css */";Runtime.cachedResources["sources/debuggerPausedMessage.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.paused-container {\n    flex: none;\n}\n\n.paused-status {\n    padding: 6px;\n    pointer-events: none;\n    border-bottom: 1px solid transparent;\n    border-top: 1px solid rgb(189, 189, 189);\n    background-color: hsl(50, 100%, 95%);\n    color: rgb(107, 97, 48);\n}\n\n.-theme-with-dark-background .paused-status {\n    background-color: hsl(46, 98%, 22%);\n    color: #ccc;\n}\n\n.paused-status.error-reason {\n    background-color: hsl(0, 100%, 97%);\n    color: #6b3b3b;\n}\n\n.status-main {\n    font-weight: bold;\n    padding-left: 15px;\n    position: relative;\n}\n\n.status-sub:not(:empty) {\n    padding-left: 15px;\n    padding-top: 5px;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.paused-status.error-reason .status-sub {\n    color: red;\n    line-height: 11px;\n    max-height: 27px;\n}\n\n.status-icon {\n    -webkit-filter: hue-rotate(190deg);\n    position: absolute;\n    left: 0;\n    top: calc(50% - 5px);\n}\n\n.paused-status.error-reason .status-icon {\n    -webkit-filter: none;\n}\n\n/*# sourceURL=sources/debuggerPausedMessage.css */";Runtime.cachedResources["sources/eventListenerBreakpoints.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline {\n    padding: 0;\n}\n\n.tree-outline li {\n    margin-left: 14px;\n    -webkit-user-select: text;\n    cursor: default;\n}\n\n.tree-outline li.parent {\n    margin-left: 1px;\n}\n\n.tree-outline li:not(.parent)::before {\n    display: none;\n}\n\n.breakpoint-hit {\n    background-color: rgb(255, 255, 194);\n}\n\n:host-context(.-theme-with-dark-background) .breakpoint-hit {\n    background-color: hsl(46, 98%, 22%);\n    color: #ccc;\n}\n\n.breakpoint-hit .breakpoint-hit-marker {\n    background-color: rgb(255, 255, 194);\n    height: 18px;\n    left: 0;\n    margin-left: -30px;\n    position: absolute;\n    right: -4px;\n    z-index: -1;\n}\n\n/*# sourceURL=sources/eventListenerBreakpoints.css */";Runtime.cachedResources["sources/fileBasedSearchResultsPane.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    padding: 0;\n    margin: 0;\n}\n\n.tree-outline {\n    padding: 0;\n}\n\n.tree-outline ol {\n    padding: 0;\n}\n\n.tree-outline li {\n    height: 16px;\n}\n\nli.search-result {\n    padding: 2px 0 2px 4px;\n    word-wrap: normal;\n    white-space: pre;\n    cursor: pointer;\n}\n\nli.search-result:hover {\n    background-color: rgba(121, 121, 121, 0.1);\n}\n\nli.search-result .search-result-file-name {\n    font-weight: bold;\n    color: #222;\n    white-space: normal;\n}\n\nli.search-result .search-result-matches-count {\n    margin-left: 5px;\n    color: #222;\n}\n\nli.show-more-matches {\n    padding: 4px 0;\n    color: #222;\n    cursor: pointer;\n    margin-left: 20px;\n}\n\nli.show-more-matches:hover {\n    text-decoration: underline;\n}\n\nli.search-match {\n    word-wrap: normal;\n    white-space: pre;\n}\n\nli.search-match::before {\n    display: none;\n}\n\nli.search-match .search-match-line-number {\n    color: rgb(128, 128, 128);\n    text-align: right;\n    vertical-align: top;\n    word-break: normal;\n    padding: 2px 4px 2px 6px;\n    margin-right: 5px;\n    border-right: 1px solid #BBB;\n}\n\nli.search-match:not(:hover) .search-match-line-number {\n    background-color: #F0F0F0;\n}\n\nli.search-match:hover {\n    background-color: rgba(56, 121, 217, 0.1);\n}\n\nli.search-match .highlighted-match {\n    background-color: #F1EA00;\n}\n\n:host-context(.-theme-with-dark-background) li.search-match .highlighted-match {\n    background-color: hsl(133, 100%, 30%) !important;\n}\n\n.tree-outline .devtools-link {\n    text-decoration: none;\n    display: block;\n    flex: auto;\n}\n\nli.search-match .search-match-content {\n    color: #000;\n}\n\n/*# sourceURL=sources/fileBasedSearchResultsPane.css */";Runtime.cachedResources["sources/navigatorTree.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.icon, .icon-badge {\n    margin: -3px -5px -3px -5px;\n}\n\n.icon-stack {\n    position: relative;\n    display: inline-flex;\n}\n\n.icon-stack > [is=ui-icon]:not(:first-child) {\n    position: absolute;\n    left: 0;\n    top: 0;\n}\n\n.navigator-file-tree-item .icon {\n    background: linear-gradient(45deg, hsl(0, 0%, 50%), hsl(0, 0%, 70%));\n}\n\n.navigator-fs-tree-item:not(.has-mapped-files),\n.navigator-fs-folder-tree-item:not(.has-mapped-files) {\n    filter: grayscale(50%);\n    opacity: 0.5;\n}\n\n.tree-outline li {\n    min-height: 20px;\n}\n\n.tree-outline li:hover:not(.selected) .selection {\n    display: block;\n    background-color: rgba(56, 121, 217, 0.1);\n}\n\n.navigator-folder-tree-item .icon {\n    background-color: #555;\n}\n\n.navigator-sm-folder-tree-item .icon,\n.navigator-fs-tree-item .icon,\n.navigator-fs-folder-tree-item .icon {\n    background: linear-gradient(45deg, hsl(28, 75%, 50%), hsl(28, 75%, 70%));\n}\n\n.navigator-nw-folder-tree-item .icon {\n    background: linear-gradient(45deg, hsl(210, 82%, 65%), hsl(210, 82%, 80%));\n}\n\n.navigator-sm-script-tree-item .icon,\n.navigator-script-tree-item .icon,\n.navigator-snippet-tree-item .icon {\n    background: linear-gradient(45deg, hsl(48, 70%, 50%), hsl(48, 70%, 70%));\n}\n\n.navigator-sm-stylesheet-tree-item .icon,\n.navigator-stylesheet-tree-item .icon {\n    background: linear-gradient(45deg, hsl(256, 50%, 50%), hsl(256, 50%, 70%));\n}\n\n.navigator-image-tree-item .icon,\n.navigator-font-tree-item .icon {\n    background: linear-gradient(45deg, hsl(109, 33%, 50%), hsl(109, 33%, 70%));\n}\n\n.navigator-sm-folder-tree-item .tree-element-title,\n.navigator-sm-script-tree-item .tree-element-title,\n.navigator-sm-stylesheet-tree-item .tree-element-title {\n    font-style: italic;\n}\n\n:host{\n    overflow-y: auto;\n}\n\n/*# sourceURL=sources/navigatorTree.css */";Runtime.cachedResources["sources/navigatorView.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.navigator-toolbar {\n    border-bottom: 1px solid #ccc;\n    padding-left: 8px;\n}\n\n/*# sourceURL=sources/navigatorView.css */";Runtime.cachedResources["sources/revisionHistory.css"]="/*\n * Copyright (C) 2012 Google Inc.  All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.revision-history-link {\n    text-decoration: underline;\n    cursor: pointer;\n    color: #00e;\n    padding: 0 4px;\n}\n\n.revision-history-link-row {\n    padding-left: 16px;\n}\n\nli.revision-history-line {\n    padding-left: 6px;\n    -webkit-user-select: text;\n}\n\n.webkit-line-number {\n    border-right: 1px solid #BBB;\n    background-color: #F0F0F0;\n}\n\nli.revision-history-revision {\n    padding-left: 16px;\n}\n\n.revision-history-line-added {\n    background-color: rgb(153, 238, 153);\n}\n\n.revision-history-line-removed {\n    background-color: rgb(255, 221, 221);\n}\n\n.revision-history-line-separator .webkit-line-number {\n    color: transparent;\n}\n\n.revision-history-line {\n    white-space: nowrap;\n}\n\n/*# sourceURL=sources/revisionHistory.css */";Runtime.cachedResources["sources/serviceWorkersSidebar.css"]="/*\n * Copyright 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.service-worker {\n    padding: 5px 5px 5px 8px;\n    border-bottom: 1px solid #aaa;\n    display: flex;\n    align-items: center;\n}\n\n.service-worker:last-child {\n    border-bottom: none;\n}\n\n.service-worker-scope {\n    color: #777;\n    flex: auto;\n    margin: 5px 5px 0 0;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n/*# sourceURL=sources/serviceWorkersSidebar.css */";Runtime.cachedResources["sources/sourcesPanel.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.scripts-debug-toolbar {\n    position: absolute;\n    top: 0;\n    width: 100%;\n    background-color: #f3f3f3;\n    border-bottom: 1px solid #ccc;\n    overflow: hidden;\n}\n\n.scripts-debug-toolbar-drawer {\n    flex: 0 0 52px;\n    -webkit-transition: margin-top 0.1s ease-in-out;\n    margin-top: -26px;\n    padding-top: 25px;\n    background-color: white;\n    overflow: hidden;\n    white-space: nowrap;\n}\n\n.scripts-debug-toolbar-drawer.expanded {\n    margin-top: 0;\n}\n\n.scripts-debug-toolbar-drawer > label {\n    display: flex;\n    padding-left: 3px;\n    height: 28px;\n}\n\n.panel.sources .sidebar-pane-stack {\n    overflow: auto;\n}\n\n.cursor-pointer {\n    cursor: pointer;\n}\n\n.cursor-auto {\n    cursor: auto;\n}\n\n.watch-expression-delete-button {\n    width: 10px;\n    height: 10px;\n    background-image: url(Images/deleteIcon.png);\n    background-position: 0 0;\n    background-color: transparent;\n    background-repeat: no-repeat;\n    border: 0 none transparent;\n    position: absolute;\n    top: 4px;\n    right: 3px;\n    display: none;\n}\n\n.watch-expression-header:hover .watch-expression-delete-button {\n    display: inline;\n}\n\n.watch-expressions {\n    overflow-x: hidden;\n    min-height: 26px;\n}\n\n.watch-expressions .dimmed {\n    opacity: 0.6;\n}\n\n.watch-expression-title {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    line-height: 16px;\n    margin-left: 11px;\n}\n\n.watch-expression-object-header .watch-expression-title {\n    margin-left: 1px;\n}\n\n.watch-expression {\n    position: relative;\n    padding: 1px 0px 1px 6px;\n    flex: none;\n    min-height: 20px;\n}\n\n.watch-expressions .name {\n    color: rgb(136, 19, 145);\n    flex: none;\n    white-space: nowrap;\n    text-overflow: ellipsis ;\n    overflow: hidden;\n}\n\n.watch-expression-error {\n    color: red;\n}\n\n.-theme-with-dark-background .watch-expression-error {\n    color: hsl(0, 100%, 65%);\n}\n\n.watch-expressions-separator {\n    flex: none;\n}\n\n.watch-expressions .value {\n    white-space: nowrap;\n    display: inline;\n}\n\n.watch-expression .text-prompt {\n    text-overflow: clip;\n    overflow: hidden;\n    white-space: nowrap;\n    padding-left: 4px;\n    -webkit-user-select: text;\n}\n\n.watch-expression-text-prompt-proxy {\n    margin-left: 12px;\n}\n\n.watch-expression-header {\n    flex: auto;\n}\n\n.watch-expression-object-header {\n    margin-left: -12px;\n    padding-left: 12px;\n}\n\n.watch-expression-header:hover {\n    background-color: #F0F0F0;\n    padding-right: 14px;\n}\n\n.sidebar-pane-stack .watch-expressions {\n    margin-top: 0px;\n}\n\n.scope-chain-sidebar-pane-section-header {\n    flex: auto;\n}\n\n.scope-chain-sidebar-pane-section-subtitle {\n    float: right;\n    margin-left: 5px;\n    max-width: 55%;\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n.scope-chain-sidebar-pane-section-title {\n    font-weight: normal;\n    word-wrap: break-word;\n    white-space: normal;\n}\n\n.scope-chain-sidebar-pane-section-subtitle {\n    float: right;\n    margin-left: 5px;\n    max-width: 55%;\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n.scope-chain-sidebar-pane-section-title {\n    font-weight: normal;\n    word-wrap: break-word;\n    white-space: normal;\n}\n\n.scope-chain-sidebar-pane-section {\n    padding: 2px 4px 2px 4px;\n    flex: none;\n}\n\n.event-listeners-sidebar-pane .toolbar {\n    border-bottom: 1px solid #eee;\n}\n\n/*# sourceURL=sources/sourcesPanel.css */";Runtime.cachedResources["sources/sourcesSearch.css"]="/*\n * Copyright 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.search-drawer-header {\n    flex: none;\n    display: flex;\n    border-bottom: 2px solid #e8e8e8;\n    white-space: nowrap;\n    overflow: hidden;\n}\n\n.search-drawer-header input.search-config-search {\n    padding: 0 28px;\n    margin: 1px 0px 1px 1px;\n    height: 28px;\n    border-radius: 2px;\n    color: #303030;\n    border: none;\n    min-width: 95px;\n}\n\n.search-drawer-header .search-icon {\n    left: 10px;\n    top: 10px;\n    position: absolute;\n}\n\n.search-config-search::-webkit-search-cancel-button {\n    -webkit-appearance: none;\n}\n\n.search-drawer-header .search-cancel-button-container {\n    position: relative;\n}\n\n.search-drawer-header .search-cancel-button {\n    position: absolute;\n    right: 9px;\n    top: 9px;\n}\n\n:host-context(.platform-mac) .search-drawer-header input.search-config-search {\n    top: 1px;\n}\n\n.search-drawer-header label.search-config-label:first-of-type {\n    border-left: 1px solid #dadada;\n    margin: 0px 0px 0px 1px;\n    padding-left: 10px;\n}\n\n.search-drawer-header label.search-config-label {\n    margin: 2px 4px;\n    margin-left: 8px;\n    color: #303030;\n    display: flex;\n}\n\n.search-toolbar-summary {\n    background-color: #eee;\n    border-top: 1px solid #ccc;\n    padding-left: 5px;\n    flex: 0 0 19px;\n    display: flex;\n    padding-right: 5px;\n}\n\n.search-toolbar-summary .search-message {\n    padding-top: 2px;\n    padding-left: 1ex;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    overflow: hidden;\n}\n\n.search-view .search-results {\n    overflow-y: auto;\n    display: flex;\n    flex: auto;\n}\n\n.search-view .search-results > div {\n    flex: auto;\n}\n\n.search-results .empty-view {\n    pointer-events: none;\n}\n\n.empty-view {\n    font-size: 24px;\n    color: rgb(75%, 75%, 75%);\n    font-weight: bold;\n    padding: 10px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n/*# sourceURL=sources/sourcesSearch.css */";Runtime.cachedResources["sources/sourcesView.css"]="/*\n * Copyright (C) 2013 Google Inc. All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions are\n * met:\n *\n *     * Redistributions of source code must retain the above copyright\n * notice, this list of conditions and the following disclaimer.\n *     * Redistributions in binary form must reproduce the above\n * copyright notice, this list of conditions and the following disclaimer\n * in the documentation and/or other materials provided with the\n * distribution.\n *     * Neither the name of Google Inc. nor the names of its\n * contributors may be used to endorse or promote products derived from\n * this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n * \"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n#sources-panel-sources-view {\n    flex: auto;\n    position: relative;\n}\n\n#sources-panel-sources-view .sources-toolbar {\n    display: flex;\n    flex: 0 0 27px;\n    background-color: #f3f3f3;\n    border-top: 1px solid #dadada;\n    overflow: hidden;\n    z-index: 0;\n}\n\n.sources-toolbar .toolbar {\n    cursor: default;\n}\n\n.sources-toolbar-spacer {\n    flex: auto;\n    pointer-events: none;\n}\n\n.source-frame-debugger-script {\n    background-color: rgba(255, 255, 194, 0.5);\n}\n\n.-theme-with-dark-background .source-frame-debugger-script {\n    background-color: #444;\n}\n\n.source-frame-unsaved-committed-changes {\n    background-color: rgba(255, 225, 205, 0.40);\n}\n\n.source-frame-breakpoint-condition {\n    z-index: 30;\n    padding: 4px;\n    background-color: rgb(203, 226, 255);\n    border-radius: 7px;\n    border: 2px solid rgb(169, 172, 203);\n    width: 90%;\n    pointer-events: auto;\n}\n\n.source-frame-breakpoint-message {\n    background-color: transparent;\n    font-weight: normal;\n    text-align: left;\n    text-shadow: none;\n    color: rgb(85, 85, 85);\n    cursor: default;\n    margin: 0 0 2px 0;\n}\n\n#source-frame-breakpoint-condition {\n    margin: 0;\n    border: 1px inset rgb(190, 190, 190) !important;\n    width: 100%;\n    box-shadow: none !important;\n    outline: none !important;\n    -webkit-user-modify: read-write;\n}\n\n@-webkit-keyframes source-frame-value-update-highlight-animation {\n    from {\n        background-color: inherit;\n        color: inherit;\n    }\n    10% {\n        background-color: rgb(158, 54, 153);\n        color: white;\n    }\n    to {\n        background-color: inherit;\n        color: inherit;\n    }\n}\n\n.source-frame-value-update-highlight {\n    -webkit-animation: source-frame-value-update-highlight-animation 0.8s 1 cubic-bezier(0, 0, 0.2, 1);\n    border-radius: 2px;\n}\n\n.diff-entry-insert .diff-marker {\n    border-left: 4px solid hsla(144, 55%, 37%, 1);\n}\n\n.diff-entry-insert .CodeMirror-gutter-background {\n    background-color: hsla(144,55%,49%,.2);\n}\n\n.diff-entry-modify .diff-marker {\n    border-left: 4px solid #9C27B0;\n}\n\n.diff-entry-modify .CodeMirror-gutter-background {\n    background-color: rgba(186,104,200,0.2);\n}\n\n.diff-entry-delete .diff-marker {\n    width: 0;\n    height: 0;\n    border-top: 6px solid transparent;\n    border-bottom: 6px solid transparent;\n    border-left: 6px solid #D32F2F;\n    position: relative;\n    top: 6px;\n    cursor: pointer;\n    left: 0px;\n}\n\n.diff-entry-delete .CodeMirror-gutter-background {\n    border-bottom: 2px solid #D32F2F;\n}\n\n.CodeMirror-gutter-diff {\n    width: 4px;\n}\n\n.highlight-line-modification {\n    animation: source-line-modification-background-fadeout 0.4s 0s;\n    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);\n}\n\n.highlight-line-modification span {\n    animation: source-line-modification-foreground-fadeout 0.4s 0s;\n    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);\n}\n\n@keyframes source-line-modification-background-fadeout {\n    from { background-color: rgba(158, 54, 153, 0.5); }\n    50% { background-color: rgba(158, 54, 153, 0.5); }\n    90% { background-color: rgba(158, 54, 153, 0); }\n    to { background-color: transparent; }\n}\n\n@keyframes source-line-modification-foreground-fadeout {\n    from { color: white; }\n    50% { color: white; }\n    90% { color: intial; }\n    to { color: intial; }\n}\n\n/*# sourceURL=sources/sourcesView.css */";Runtime.cachedResources["sources/threadsSidebarPane.css"]="/*\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.available-node-targets {\n    height: 22px;\n    display: flex;\n    align-items: center;\n    justify-content: flex-start;\n    padding-left: 20px;\n    border-top: 1px solid #eee;\n    font-style: italic;\n}\n\n.available-node-targets > span {\n    margin-left: 5px;\n}\n\n.thread-item {\n    padding: 3px 8px 3px 20px;\n    position: relative;\n    min-height: 18px;\n    line-height: 15px;\n    display: flex;\n    flex-wrap: wrap;\n}\n\n.thread-item + .thread-item {\n    border-top: 1px solid #efefef;\n}\n\n.thread-item:hover {\n    background-color: #eee;\n}\n\n.thread-item-title,\n.thread-item-paused-state {\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n}\n\n.thread-item-paused-state {\n    color: #888;\n    margin-left: auto;\n    padding: 0 10px 0 10px;\n}\n\n.selected-thread-icon {\n    display: none;\n    position: absolute;\n    top: 5px;\n    left: 4px;\n}\n\n.thread-item.selected .selected-thread-icon {\n    display: block;\n}\n\n\n/*# sourceURL=sources/threadsSidebarPane.css */";Runtime.cachedResources["sources/dialog.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    padding: 10px;\n}\n\n.widget {\n    align-items: center;\n}\n\nlabel {\n    white-space: nowrap;\n}\n\ninput[type=text] {\n    font-size: inherit;\n    height: 24px;\n    padding-left: 2px;\n    margin: 0 5px;\n}\n\ninput[type=\"search\"]:focus,\ninput[type=\"text\"]:focus {\n    outline: none;\n}\n\nbutton {\n    background-image: linear-gradient(hsl(0, 0%, 93%), hsl(0, 0%, 93%) 38%, hsl(0, 0%, 87%));\n    border: 1px solid hsla(0, 0%, 0%, 0.25);\n    border-radius: 2px;\n    box-shadow: 0 1px 0 hsla(0, 0%, 0%, 0.08), inset 0 1px 2px hsla(0, 100%, 100%, 0.75);\n    color: hsl(0, 0%, 27%);\n    font-size: 12px;\n    margin: 0 6px 0 6px;\n    text-shadow: 0 1px 0 hsl(0, 0%, 94%);\n    min-height: 2em;\n    padding-left: 10px;\n    padding-right: 10px;\n}\n\nbutton:active {\n    background-color: rgb(215, 215, 215);\n    background-image: linear-gradient(to bottom, rgb(194, 194, 194), rgb(239, 239, 239));\n}\n\n/*# sourceURL=sources/dialog.css */";