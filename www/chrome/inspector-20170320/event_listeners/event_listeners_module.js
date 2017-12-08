EventListeners.EventListenersResult;EventListeners.EventListenersView=class{constructor(element,changeCallback){this._element=element;this._changeCallback=changeCallback;this._treeOutline=new UI.TreeOutlineInShadow();this._treeOutline.hideOverflow();this._treeOutline.registerRequiredCSS('object_ui/objectValue.css');this._treeOutline.registerRequiredCSS('event_listeners/eventListenersView.css');this._treeOutline.setComparator(EventListeners.EventListenersTreeElement.comparator);this._treeOutline.element.classList.add('monospace');this._element.appendChild(this._treeOutline.element);this._emptyHolder=createElementWithClass('div','gray-info-message');this._emptyHolder.textContent=Common.UIString('No Event Listeners');this._linkifier=new Components.Linkifier();this._treeItemMap=new Map();}
addObjects(objects){this.reset();var promises=[];for(var object of objects)
promises.push(this._addObject(object));return Promise.all(promises).then(this.addEmptyHolderIfNeeded.bind(this)).then(this._eventListenersArrivedForTest.bind(this));}
_addObject(object){var eventListeners=null;var frameworkEventListenersObject=null;var promises=[];promises.push(object.eventListeners().then(storeEventListeners));promises.push(EventListeners.frameworkEventListeners(object).then(storeFrameworkEventListenersObject));return Promise.all(promises).then(markInternalEventListeners).then(addEventListeners.bind(this));function storeEventListeners(result){eventListeners=result;}
function storeFrameworkEventListenersObject(result){frameworkEventListenersObject=result;}
function markInternalEventListeners(){if(!eventListeners||!frameworkEventListenersObject.internalHandlers)
return Promise.resolve(undefined);return frameworkEventListenersObject.internalHandlers.object().callFunctionJSONPromise(isInternalEventListener,eventListeners.map(handlerArgument)).then(setIsInternal);function handlerArgument(listener){return SDK.RemoteObject.toCallArgument(listener.handler());}
function isInternalEventListener(){var isInternal=[];var internalHandlersSet=new Set(this);for(var handler of arguments)
isInternal.push(internalHandlersSet.has(handler));return isInternal;}
function setIsInternal(isInternal){for(var i=0;i<eventListeners.length;++i){if(isInternal[i])
eventListeners[i].markAsFramework();}}}
function addEventListeners(){this._addObjectEventListeners(object,eventListeners);this._addObjectEventListeners(object,frameworkEventListenersObject.eventListeners);}}
_addObjectEventListeners(object,eventListeners){if(!eventListeners)
return;for(var eventListener of eventListeners){var treeItem=this._getOrCreateTreeElementForType(eventListener.type());treeItem.addObjectEventListener(eventListener,object);}}
showFrameworkListeners(showFramework,showPassive,showBlocking){var eventTypes=this._treeOutline.rootElement().children();for(var eventType of eventTypes){var hiddenEventType=true;for(var listenerElement of eventType.children()){var listenerOrigin=listenerElement.eventListener().origin();var hidden=false;if(listenerOrigin===SDK.EventListener.Origin.FrameworkUser&&!showFramework)
hidden=true;if(listenerOrigin===SDK.EventListener.Origin.Framework&&showFramework)
hidden=true;if(!showPassive&&listenerElement.eventListener().passive())
hidden=true;if(!showBlocking&&!listenerElement.eventListener().passive())
hidden=true;listenerElement.hidden=hidden;hiddenEventType=hiddenEventType&&hidden;}
eventType.hidden=hiddenEventType;}}
_getOrCreateTreeElementForType(type){var treeItem=this._treeItemMap.get(type);if(!treeItem){treeItem=new EventListeners.EventListenersTreeElement(type,this._linkifier,this._changeCallback);this._treeItemMap.set(type,treeItem);treeItem.hidden=true;this._treeOutline.appendChild(treeItem);}
this._emptyHolder.remove();return treeItem;}
addEmptyHolderIfNeeded(){var allHidden=true;for(var eventType of this._treeOutline.rootElement().children()){eventType.hidden=!eventType.firstChild();allHidden=allHidden&&eventType.hidden;}
if(allHidden&&!this._emptyHolder.parentNode)
this._element.appendChild(this._emptyHolder);}
reset(){var eventTypes=this._treeOutline.rootElement().children();for(var eventType of eventTypes)
eventType.removeChildren();this._linkifier.reset();}
_eventListenersArrivedForTest(){}};EventListeners.EventListenersTreeElement=class extends UI.TreeElement{constructor(type,linkifier,changeCallback){super(type);this.toggleOnClick=true;this.selectable=false;this._linkifier=linkifier;this._changeCallback=changeCallback;}
static comparator(element1,element2){if(element1.title===element2.title)
return 0;return element1.title>element2.title?1:-1;}
addObjectEventListener(eventListener,object){var treeElement=new EventListeners.ObjectEventListenerBar(eventListener,object,this._linkifier,this._changeCallback);this.appendChild((treeElement));}};EventListeners.ObjectEventListenerBar=class extends UI.TreeElement{constructor(eventListener,object,linkifier,changeCallback){super('',true);this._eventListener=eventListener;this.editable=false;this.selectable=false;this._setTitle(object,linkifier);this._changeCallback=changeCallback;}
onpopulate(){var properties=[];var eventListener=this._eventListener;var runtimeModel=eventListener.runtimeModel();properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('useCapture',eventListener.useCapture()));properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('passive',eventListener.passive()));properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('once',eventListener.once()));if(typeof eventListener.handler()!=='undefined')
properties.push(new SDK.RemoteObjectProperty('handler',eventListener.handler()));ObjectUI.ObjectPropertyTreeElement.populateWithProperties(this,properties,[],true,null);}
_setTitle(object,linkifier){var title=this.listItemElement.createChild('span');var subtitle=this.listItemElement.createChild('span','event-listener-tree-subtitle');subtitle.appendChild(linkifier.linkifyRawLocation(this._eventListener.location(),this._eventListener.sourceURL()));title.appendChild(ObjectUI.ObjectPropertiesSection.createValueElement(object,false,false));if(this._eventListener.canRemove()){var deleteButton=title.createChild('span','event-listener-button');deleteButton.textContent=Common.UIString('Remove');deleteButton.title=Common.UIString('Delete event listener');deleteButton.addEventListener('click',removeListener.bind(this),false);title.appendChild(deleteButton);}
if(this._eventListener.isScrollBlockingType()&&this._eventListener.canTogglePassive()){var passiveButton=title.createChild('span','event-listener-button');passiveButton.textContent=Common.UIString('Toggle Passive');passiveButton.title=Common.UIString('Toggle whether event listener is passive or blocking');passiveButton.addEventListener('click',togglePassiveListener.bind(this),false);title.appendChild(passiveButton);}
function removeListener(event){event.consume();this._removeListenerBar();this._eventListener.remove();}
function togglePassiveListener(event){event.consume();this._eventListener.togglePassive().then(this._changeCallback());}}
_removeListenerBar(){var parent=this.parent;parent.removeChild(this);if(!parent.childCount())
parent.collapse();var allHidden=true;for(var i=0;i<parent.childCount();++i){if(!parent.childAt(i).hidden)
allHidden=false;}
parent.hidden=allHidden;}
eventListener(){return this._eventListener;}};;EventListeners.FrameworkEventListenersObject;EventListeners.EventListenerObjectInInspectedPage;EventListeners.frameworkEventListeners=function(object){if(!object.runtimeModel().target().hasDOMCapability()){return Promise.resolve(({eventListeners:[],internalHandlers:null}));}
var listenersResult=({eventListeners:[]});return object.callFunctionPromise(frameworkEventListeners,undefined).then(assertCallFunctionResult).then(getOwnProperties).then(createEventListeners).then(returnResult).catchException(listenersResult);function getOwnProperties(object){return object.getOwnPropertiesPromise(false);}
function createEventListeners(result){if(!result.properties)
throw new Error('Object properties is empty');var promises=[];for(var property of result.properties){if(property.name==='eventListeners'&&property.value)
promises.push(convertToEventListeners(property.value).then(storeEventListeners));if(property.name==='internalHandlers'&&property.value)
promises.push(convertToInternalHandlers(property.value).then(storeInternalHandlers));if(property.name==='errorString'&&property.value)
printErrorString(property.value);}
return(Promise.all(promises));}
function convertToEventListeners(pageEventListenersObject){return SDK.RemoteArray.objectAsArray(pageEventListenersObject).map(toEventListener).then(filterOutEmptyObjects);function toEventListener(listenerObject){var type;var useCapture;var passive;var once;var handler=null;var originalHandler=null;var location=null;var removeFunctionObject=null;var promises=[];promises.push(listenerObject.callFunctionJSONPromise(truncatePageEventListener,undefined).then(storeTruncatedListener));function truncatePageEventListener(){return{type:this.type,useCapture:this.useCapture,passive:this.passive,once:this.once};}
function storeTruncatedListener(truncatedListener){type=truncatedListener.type;useCapture=truncatedListener.useCapture;passive=truncatedListener.passive;once=truncatedListener.once;}
promises.push(listenerObject.callFunctionPromise(handlerFunction).then(assertCallFunctionResult).then(storeOriginalHandler).then(toTargetFunction).then(storeFunctionWithDetails));function handlerFunction(){return this.handler;}
function storeOriginalHandler(functionObject){originalHandler=functionObject;return originalHandler;}
function storeFunctionWithDetails(functionObject){handler=functionObject;return(functionObject.debuggerModel().functionDetailsPromise(functionObject).then(storeFunctionDetails));}
function storeFunctionDetails(functionDetails){location=functionDetails?functionDetails.location:null;}
promises.push(listenerObject.callFunctionPromise(getRemoveFunction).then(assertCallFunctionResult).then(storeRemoveFunction));function getRemoveFunction(){return this.remove;}
function storeRemoveFunction(functionObject){if(functionObject.type!=='function')
return;removeFunctionObject=functionObject;}
return Promise.all(promises).then(createEventListener).catchException((null));function createEventListener(){if(!location)
throw new Error('Empty event listener\'s location');return new SDK.EventListener(handler.runtimeModel(),object,type,useCapture,passive,once,handler,originalHandler,location,removeFunctionObject,SDK.EventListener.Origin.FrameworkUser);}}}
function convertToInternalHandlers(pageInternalHandlersObject){return SDK.RemoteArray.objectAsArray(pageInternalHandlersObject).map(toTargetFunction).then(SDK.RemoteArray.createFromRemoteObjects);}
function toTargetFunction(functionObject){return SDK.RemoteFunction.objectAsFunction(functionObject).targetFunction();}
function storeEventListeners(eventListeners){listenersResult.eventListeners=eventListeners;}
function storeInternalHandlers(internalHandlers){listenersResult.internalHandlers=internalHandlers;}
function printErrorString(errorString){Common.console.error(errorString.value);}
function returnResult(){return listenersResult;}
function assertCallFunctionResult(result){if(result.wasThrown||!result.object)
throw new Error('Exception in callFunction or empty result');return result.object;}
function filterOutEmptyObjects(objects){return objects.filter(filterOutEmpty);function filterOutEmpty(object){return!!object;}}
function frameworkEventListeners(){var errorLines=[];var eventListeners=[];var internalHandlers=[];var fetchers=[jQueryFetcher];try{if(self.devtoolsFrameworkEventListeners&&isArrayLike(self.devtoolsFrameworkEventListeners))
fetchers=fetchers.concat(self.devtoolsFrameworkEventListeners);}catch(e){errorLines.push('devtoolsFrameworkEventListeners call produced error: '+toString(e));}
for(var i=0;i<fetchers.length;++i){try{var fetcherResult=fetchers[i](this);if(fetcherResult.eventListeners&&isArrayLike(fetcherResult.eventListeners)){eventListeners=eventListeners.concat(fetcherResult.eventListeners.map(checkEventListener).filter(nonEmptyObject));}
if(fetcherResult.internalHandlers&&isArrayLike(fetcherResult.internalHandlers)){internalHandlers=internalHandlers.concat(fetcherResult.internalHandlers.map(checkInternalHandler).filter(nonEmptyObject));}}catch(e){errorLines.push('fetcher call produced error: '+toString(e));}}
var result={eventListeners:eventListeners};if(internalHandlers.length)
result.internalHandlers=internalHandlers;if(errorLines.length){var errorString='Framework Event Listeners API Errors:\n\t'+errorLines.join('\n\t');errorString=errorString.substr(0,errorString.length-1);result.errorString=errorString;}
return result;function isArrayLike(obj){if(!obj||typeof obj!=='object')
return false;try{if(typeof obj.splice==='function'){var len=obj.length;return typeof len==='number'&&(len>>>0===len&&(len>0||1/len>0));}}catch(e){}
return false;}
function checkEventListener(eventListener){try{var errorString='';if(!eventListener)
errorString+='empty event listener, ';var type=eventListener.type;if(!type||(typeof type!=='string'))
errorString+='event listener\'s type isn\'t string or empty, ';var useCapture=eventListener.useCapture;if(typeof useCapture!=='boolean')
errorString+='event listener\'s useCapture isn\'t boolean or undefined, ';var passive=eventListener.passive;if(typeof passive!=='boolean')
errorString+='event listener\'s passive isn\'t boolean or undefined, ';var once=eventListener.once;if(typeof once!=='boolean')
errorString+='event listener\'s once isn\'t boolean or undefined, ';var handler=eventListener.handler;if(!handler||(typeof handler!=='function'))
errorString+='event listener\'s handler isn\'t a function or empty, ';var remove=eventListener.remove;if(remove&&(typeof remove!=='function'))
errorString+='event listener\'s remove isn\'t a function, ';if(!errorString){return{type:type,useCapture:useCapture,passive:passive,once:once,handler:handler,remove:remove};}else{errorLines.push(errorString.substr(0,errorString.length-2));return null;}}catch(e){errorLines.push(toString(e));return null;}}
function checkInternalHandler(handler){if(handler&&(typeof handler==='function'))
return handler;errorLines.push('internal handler isn\'t a function or empty');return null;}
function toString(obj){try{return''+obj;}catch(e){return'<error>';}}
function nonEmptyObject(obj){return!!obj;}
function jQueryFetcher(node){if(!node||!(node instanceof Node))
return{eventListeners:[]};var jQuery=(window['jQuery']);if(!jQuery||!jQuery.fn)
return{eventListeners:[]};var jQueryFunction=(jQuery);var data=jQuery._data||jQuery.data;var eventListeners=[];var internalHandlers=[];if(typeof data==='function'){var events=data(node,'events');for(var type in events){for(var key in events[type]){var frameworkListener=events[type][key];if(typeof frameworkListener==='object'||typeof frameworkListener==='function'){var listener={handler:frameworkListener.handler||frameworkListener,useCapture:true,passive:false,once:false,type:type};listener.remove=jQueryRemove.bind(node,frameworkListener.selector);eventListeners.push(listener);}}}
var nodeData=data(node);if(nodeData&&typeof nodeData.handle==='function')
internalHandlers.push(nodeData.handle);}
var entry=jQueryFunction(node)[0];if(entry){var entryEvents=entry['$events'];for(var type in entryEvents){var events=entryEvents[type];for(var key in events){if(typeof events[key]==='function'){var listener={handler:events[key],useCapture:true,passive:false,once:false,type:type};eventListeners.push(listener);}}}
if(entry&&entry['$handle'])
internalHandlers.push(entry['$handle']);}
return{eventListeners:eventListeners,internalHandlers:internalHandlers};}
function jQueryRemove(selector,type,handler){if(!this||!(this instanceof Node))
return;var node=(this);var jQuery=(window['jQuery']);if(!jQuery||!jQuery.fn)
return;var jQueryFunction=(jQuery);jQueryFunction(node).off(type,selector,handler);}}};;Runtime.cachedResources["event_listeners/eventListenersView.css"]="/*\n * Copyright 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline-disclosure li {\n    padding: 2px 0 0 5px;\n    overflow: hidden;\n    display: list-item;\n    min-height: 17px;\n}\n\n.tree-outline-disclosure > li {\n    border-top: 1px solid #f0f0f0;\n}\n\n.tree-outline-disclosure > li:first-of-type {\n    border-top: none;\n}\n\n.tree-outline-disclosure {\n    padding-left: 0 !important;\n    padding-right: 3px;\n}\n\n.tree-outline-disclosure li.parent::before {\n    top: 0 !important;\n}\n\n.tree-outline-disclosure .name {\n    color: rgb(136, 19, 145);\n}\n\n.event-listener-tree-subtitle {\n    float: right;\n    margin-left: 5px;\n}\n\n.event-listener-button {\n    padding: 0 3px;\n    background-color: #f2f2f2;\n    border-radius: 3px;\n    border: 1px solid #c3c3c3;\n    margin-left: 10px;\n    display: none;\n    cursor: pointer;\n}\n\n.event-listener-button:hover {\n    background-color: #e0e0e0;\n}\n\n.tree-outline-disclosure li:hover .event-listener-button {\n    display: inline;\n}\n\n/*# sourceURL=event_listeners/eventListenersView.css */";