function defineCommonExtensionSymbols(apiPrivate)
{if(!apiPrivate.audits)
apiPrivate.audits={};apiPrivate.audits.Severity={Info:"info",Warning:"warning",Severe:"severe"};if(!apiPrivate.console)
apiPrivate.console={};apiPrivate.console.Severity={Debug:"debug",Log:"log",Warning:"warning",Error:"error"};if(!apiPrivate.panels)
apiPrivate.panels={};apiPrivate.panels.SearchAction={CancelSearch:"cancelSearch",PerformSearch:"performSearch",NextSearchResult:"nextSearchResult",PreviousSearchResult:"previousSearchResult"};apiPrivate.Events={AuditStarted:"audit-started-",ButtonClicked:"button-clicked-",ConsoleMessageAdded:"console-message-added",PanelObjectSelected:"panel-objectSelected-",NetworkRequestFinished:"network-request-finished",OpenResource:"open-resource",PanelSearch:"panel-search-",ResourceAdded:"resource-added",ResourceContentCommitted:"resource-content-committed",TimelineEventRecorded:"timeline-event-recorded",ViewShown:"view-shown-",ViewHidden:"view-hidden-"};apiPrivate.Commands={AddAuditCategory:"addAuditCategory",AddAuditResult:"addAuditResult",AddConsoleMessage:"addConsoleMessage",AddRequestHeaders:"addRequestHeaders",ApplyStyleSheet:"applyStyleSheet",CreatePanel:"createPanel",CreateSidebarPane:"createSidebarPane",CreateStatusBarButton:"createStatusBarButton",EvaluateOnInspectedPage:"evaluateOnInspectedPage",ForwardKeyboardEvent:"_forwardKeyboardEvent",GetConsoleMessages:"getConsoleMessages",GetHAR:"getHAR",GetPageResources:"getPageResources",GetRequestContent:"getRequestContent",GetResourceContent:"getResourceContent",InspectedURLChanged:"inspectedURLChanged",OpenResource:"openResource",Reload:"Reload",Subscribe:"subscribe",SetOpenResourceHandler:"setOpenResourceHandler",SetResourceContent:"setResourceContent",SetSidebarContent:"setSidebarContent",SetSidebarHeight:"setSidebarHeight",SetSidebarPage:"setSidebarPage",ShowPanel:"showPanel",StopAuditCategoryRun:"stopAuditCategoryRun",Unsubscribe:"unsubscribe",UpdateAuditProgress:"updateAuditProgress",UpdateButton:"updateButton"};}
function injectedExtensionAPI(injectedScriptId)
{var apiPrivate={};defineCommonExtensionSymbols(apiPrivate);var commands=apiPrivate.Commands;var events=apiPrivate.Events;var userAction=false;function EventSinkImpl(type,customDispatch)
{this._type=type;this._listeners=[];this._customDispatch=customDispatch;}
EventSinkImpl.prototype={addListener:function(callback)
{if(typeof callback!=="function")
throw"addListener: callback is not a function";if(this._listeners.length===0)
extensionServer.sendRequest({command:commands.Subscribe,type:this._type});this._listeners.push(callback);extensionServer.registerHandler("notify-"+this._type,this._dispatch.bind(this));},removeListener:function(callback)
{var listeners=this._listeners;for(var i=0;i<listeners.length;++i){if(listeners[i]===callback){listeners.splice(i,1);break;}}
if(this._listeners.length===0)
extensionServer.sendRequest({command:commands.Unsubscribe,type:this._type});},_fire:function(vararg)
{var listeners=this._listeners.slice();for(var i=0;i<listeners.length;++i)
listeners[i].apply(null,arguments);},_dispatch:function(request)
{if(this._customDispatch)
this._customDispatch.call(this,request);else
this._fire.apply(this,request.arguments);}}
function InspectorExtensionAPI()
{this.audits=new Audits();this.inspectedWindow=new InspectedWindow();this.panels=new Panels();this.network=new Network();defineDeprecatedProperty(this,"webInspector","resources","network");this.timeline=new Timeline();this.console=new ConsoleAPI();}
function ConsoleAPI()
{this.onMessageAdded=new EventSink(events.ConsoleMessageAdded);}
ConsoleAPI.prototype={getMessages:function(callback)
{extensionServer.sendRequest({command:commands.GetConsoleMessages},callback);},addMessage:function(severity,text,url,line)
{extensionServer.sendRequest({command:commands.AddConsoleMessage,severity:severity,text:text,url:url,line:line});},get Severity()
{return apiPrivate.console.Severity;}}
function Network()
{function dispatchRequestEvent(message)
{var request=message.arguments[1];request.__proto__=new Request(message.arguments[0]);this._fire(request);}
this.onRequestFinished=new EventSink(events.NetworkRequestFinished,dispatchRequestEvent);defineDeprecatedProperty(this,"network","onFinished","onRequestFinished");this.onNavigated=new EventSink(events.InspectedURLChanged);}
Network.prototype={getHAR:function(callback)
{function callbackWrapper(result)
{var entries=(result&&result.entries)||[];for(var i=0;i<entries.length;++i){entries[i].__proto__=new Request(entries[i]._requestId);delete entries[i]._requestId;}
callback(result);}
extensionServer.sendRequest({command:commands.GetHAR},callback&&callbackWrapper);},addRequestHeaders:function(headers)
{extensionServer.sendRequest({command:commands.AddRequestHeaders,headers:headers,extensionId:window.location.hostname});}}
function RequestImpl(id)
{this._id=id;}
RequestImpl.prototype={getContent:function(callback)
{function callbackWrapper(response)
{callback(response.content,response.encoding);}
extensionServer.sendRequest({command:commands.GetRequestContent,id:this._id},callback&&callbackWrapper);}}
function Panels()
{var panels={elements:new ElementsPanel(),sources:new SourcesPanel(),};function panelGetter(name)
{return panels[name];}
for(var panel in panels)
this.__defineGetter__(panel,panelGetter.bind(null,panel));this.applyStyleSheet=function(styleSheet){extensionServer.sendRequest({command:commands.ApplyStyleSheet,styleSheet:styleSheet});};}
Panels.prototype={create:function(title,icon,page,callback)
{var id="extension-panel-"+extensionServer.nextObjectId();var request={command:commands.CreatePanel,id:id,title:title,icon:icon,page:page};extensionServer.sendRequest(request,callback&&callback.bind(this,new ExtensionPanel(id)));},setOpenResourceHandler:function(callback)
{var hadHandler=extensionServer.hasHandler(events.OpenResource);function callbackWrapper(message)
{userAction=true;try{callback.call(null,new Resource(message.resource),message.lineNumber);}finally{userAction=false;}}
if(!callback)
extensionServer.unregisterHandler(events.OpenResource);else
extensionServer.registerHandler(events.OpenResource,callbackWrapper);if(hadHandler===!callback)
extensionServer.sendRequest({command:commands.SetOpenResourceHandler,"handlerPresent":!!callback});},openResource:function(url,lineNumber,callback)
{extensionServer.sendRequest({command:commands.OpenResource,"url":url,"lineNumber":lineNumber},callback);},get SearchAction()
{return apiPrivate.panels.SearchAction;}}
function ExtensionViewImpl(id)
{this._id=id;function dispatchShowEvent(message)
{var frameIndex=message.arguments[0];if(typeof frameIndex==="number")
this._fire(window.parent.frames[frameIndex]);else
this._fire();}
if(id){this.onShown=new EventSink(events.ViewShown+id,dispatchShowEvent);this.onHidden=new EventSink(events.ViewHidden+id);}}
function PanelWithSidebarImpl(hostPanelName)
{ExtensionViewImpl.call(this,null);this._hostPanelName=hostPanelName;this.onSelectionChanged=new EventSink(events.PanelObjectSelected+hostPanelName);}
PanelWithSidebarImpl.prototype={createSidebarPane:function(title,callback)
{var id="extension-sidebar-"+extensionServer.nextObjectId();var request={command:commands.CreateSidebarPane,panel:this._hostPanelName,id:id,title:title};function callbackWrapper()
{callback(new ExtensionSidebarPane(id));}
extensionServer.sendRequest(request,callback&&callbackWrapper);},__proto__:ExtensionViewImpl.prototype}
function declareInterfaceClass(implConstructor)
{return function()
{var impl={__proto__:implConstructor.prototype};implConstructor.apply(impl,arguments);populateInterfaceClass(this,impl);}}
function defineDeprecatedProperty(object,className,oldName,newName)
{var warningGiven=false;function getter()
{if(!warningGiven){console.warn(className+"."+oldName+" is deprecated. Use "+className+"."+newName+" instead");warningGiven=true;}
return object[newName];}
object.__defineGetter__(oldName,getter);}
function extractCallbackArgument(args)
{var lastArgument=args[args.length-1];return typeof lastArgument==="function"?lastArgument:undefined;}
var AuditCategory=declareInterfaceClass(AuditCategoryImpl);var AuditResult=declareInterfaceClass(AuditResultImpl);var Button=declareInterfaceClass(ButtonImpl);var EventSink=declareInterfaceClass(EventSinkImpl);var ExtensionPanel=declareInterfaceClass(ExtensionPanelImpl);var ExtensionSidebarPane=declareInterfaceClass(ExtensionSidebarPaneImpl);var PanelWithSidebar=declareInterfaceClass(PanelWithSidebarImpl);var Request=declareInterfaceClass(RequestImpl);var Resource=declareInterfaceClass(ResourceImpl);var Timeline=declareInterfaceClass(TimelineImpl);function ElementsPanel()
{PanelWithSidebar.call(this,"elements");}
ElementsPanel.prototype={__proto__:PanelWithSidebar.prototype}
function SourcesPanel()
{PanelWithSidebar.call(this,"sources");}
SourcesPanel.prototype={__proto__:PanelWithSidebar.prototype}
function ExtensionPanelImpl(id)
{ExtensionViewImpl.call(this,id);this.onSearch=new EventSink(events.PanelSearch+id);}
ExtensionPanelImpl.prototype={createStatusBarButton:function(iconPath,tooltipText,disabled)
{var id="button-"+extensionServer.nextObjectId();var request={command:commands.CreateStatusBarButton,panel:this._id,id:id,icon:iconPath,tooltip:tooltipText,disabled:!!disabled};extensionServer.sendRequest(request);return new Button(id);},show:function()
{if(!userAction)
return;var request={command:commands.ShowPanel,id:this._id};extensionServer.sendRequest(request);},__proto__:ExtensionViewImpl.prototype}
function ExtensionSidebarPaneImpl(id)
{ExtensionViewImpl.call(this,id);}
ExtensionSidebarPaneImpl.prototype={setHeight:function(height)
{extensionServer.sendRequest({command:commands.SetSidebarHeight,id:this._id,height:height});},setExpression:function(expression,rootTitle,evaluateOptions)
{var request={command:commands.SetSidebarContent,id:this._id,expression:expression,rootTitle:rootTitle,evaluateOnPage:true,};if(typeof evaluateOptions==="object")
request.evaluateOptions=evaluateOptions;extensionServer.sendRequest(request,extractCallbackArgument(arguments));},setObject:function(jsonObject,rootTitle,callback)
{extensionServer.sendRequest({command:commands.SetSidebarContent,id:this._id,expression:jsonObject,rootTitle:rootTitle},callback);},setPage:function(page)
{extensionServer.sendRequest({command:commands.SetSidebarPage,id:this._id,page:page});},__proto__:ExtensionViewImpl.prototype}
function ButtonImpl(id)
{this._id=id;this.onClicked=new EventSink(events.ButtonClicked+id);}
ButtonImpl.prototype={update:function(iconPath,tooltipText,disabled)
{var request={command:commands.UpdateButton,id:this._id,icon:iconPath,tooltip:tooltipText,disabled:!!disabled};extensionServer.sendRequest(request);}};function Audits()
{}
Audits.prototype={addCategory:function(displayName,resultCount)
{var id="extension-audit-category-"+extensionServer.nextObjectId();if(typeof resultCount!=="undefined")
console.warn("Passing resultCount to audits.addCategory() is deprecated. Use AuditResult.updateProgress() instead.");extensionServer.sendRequest({command:commands.AddAuditCategory,id:id,displayName:displayName,resultCount:resultCount});return new AuditCategory(id);}}
function AuditCategoryImpl(id)
{function dispatchAuditEvent(request)
{var auditResult=new AuditResult(request.arguments[0]);try{this._fire(auditResult);}catch(e){console.error("Uncaught exception in extension audit event handler: "+e);auditResult.done();}}
this._id=id;this.onAuditStarted=new EventSink(events.AuditStarted+id,dispatchAuditEvent);}
function AuditResultImpl(id)
{this._id=id;this.createURL=this._nodeFactory.bind(this,"url");this.createSnippet=this._nodeFactory.bind(this,"snippet");this.createText=this._nodeFactory.bind(this,"text");this.createObject=this._nodeFactory.bind(this,"object");this.createNode=this._nodeFactory.bind(this,"node");}
AuditResultImpl.prototype={addResult:function(displayName,description,severity,details)
{if(details&&!(details instanceof AuditResultNode))
details=new AuditResultNode(details instanceof Array?details:[details]);var request={command:commands.AddAuditResult,resultId:this._id,displayName:displayName,description:description,severity:severity,details:details};extensionServer.sendRequest(request);},createResult:function()
{return new AuditResultNode(Array.prototype.slice.call(arguments));},updateProgress:function(worked,totalWork)
{extensionServer.sendRequest({command:commands.UpdateAuditProgress,resultId:this._id,progress:worked/totalWork});},done:function()
{extensionServer.sendRequest({command:commands.StopAuditCategoryRun,resultId:this._id});},get Severity()
{return apiPrivate.audits.Severity;},createResourceLink:function(url,lineNumber)
{return{type:"resourceLink",arguments:[url,lineNumber&&lineNumber-1]};},_nodeFactory:function(type)
{return{type:type,arguments:Array.prototype.slice.call(arguments,1)};}}
function AuditResultNode(contents)
{this.contents=contents;this.children=[];this.expanded=false;}
AuditResultNode.prototype={addChild:function()
{var node=new AuditResultNode(Array.prototype.slice.call(arguments));this.children.push(node);return node;}};function InspectedWindow()
{function dispatchResourceEvent(message)
{this._fire(new Resource(message.arguments[0]));}
function dispatchResourceContentEvent(message)
{this._fire(new Resource(message.arguments[0]),message.arguments[1]);}
this.onResourceAdded=new EventSink(events.ResourceAdded,dispatchResourceEvent);this.onResourceContentCommitted=new EventSink(events.ResourceContentCommitted,dispatchResourceContentEvent);}
InspectedWindow.prototype={reload:function(optionsOrUserAgent)
{var options=null;if(typeof optionsOrUserAgent==="object")
options=optionsOrUserAgent;else if(typeof optionsOrUserAgent==="string"){options={userAgent:optionsOrUserAgent};console.warn("Passing userAgent as string parameter to inspectedWindow.reload() is deprecated. "+"Use inspectedWindow.reload({ userAgent: value}) instead.");}
extensionServer.sendRequest({command:commands.Reload,options:options});},eval:function(expression,evaluateOptions)
{var callback=extractCallbackArgument(arguments);function callbackWrapper(result)
{if(result.isError||result.isException)
callback(undefined,result);else
callback(result.value);}
var request={command:commands.EvaluateOnInspectedPage,expression:expression};if(typeof evaluateOptions==="object")
request.evaluateOptions=evaluateOptions;extensionServer.sendRequest(request,callback&&callbackWrapper);return null;},getResources:function(callback)
{function wrapResource(resourceData)
{return new Resource(resourceData);}
function callbackWrapper(resources)
{callback(resources.map(wrapResource));}
extensionServer.sendRequest({command:commands.GetPageResources},callback&&callbackWrapper);}}
function ResourceImpl(resourceData)
{this._url=resourceData.url
this._type=resourceData.type;}
ResourceImpl.prototype={get url()
{return this._url;},get type()
{return this._type;},getContent:function(callback)
{function callbackWrapper(response)
{callback(response.content,response.encoding);}
extensionServer.sendRequest({command:commands.GetResourceContent,url:this._url},callback&&callbackWrapper);},setContent:function(content,commit,callback)
{extensionServer.sendRequest({command:commands.SetResourceContent,url:this._url,content:content,commit:commit},callback);}}
function TimelineImpl()
{this.onEventRecorded=new EventSink(events.TimelineEventRecorded);}
var keyboardEventRequestQueue=[];var forwardTimer=null;function forwardKeyboardEvent(event)
{const Esc="U+001B";if(!event.ctrlKey&&!event.altKey&&!event.metaKey&&!/^F\d+$/.test(event.keyIdentifier)&&event.keyIdentifier!==Esc)
return;var requestPayload={eventType:event.type,ctrlKey:event.ctrlKey,altKey:event.altKey,metaKey:event.metaKey,keyIdentifier:event.keyIdentifier,location:event.location,keyCode:event.keyCode};keyboardEventRequestQueue.push(requestPayload);if(!forwardTimer)
forwardTimer=setTimeout(forwardEventQueue,0);}
function forwardEventQueue()
{forwardTimer=null;var request={command:commands.ForwardKeyboardEvent,entries:keyboardEventRequestQueue};extensionServer.sendRequest(request);keyboardEventRequestQueue=[];}
document.addEventListener("keydown",forwardKeyboardEvent,false);document.addEventListener("keypress",forwardKeyboardEvent,false);function ExtensionServerClient()
{this._callbacks={};this._handlers={};this._lastRequestId=0;this._lastObjectId=0;this.registerHandler("callback",this._onCallback.bind(this));var channel=new MessageChannel();this._port=channel.port1;this._port.addEventListener("message",this._onMessage.bind(this),false);this._port.start();window.parent.postMessage("registerExtension",[channel.port2],"*");}
ExtensionServerClient.prototype={sendRequest:function(message,callback)
{if(typeof callback==="function")
message.requestId=this._registerCallback(callback);this._port.postMessage(message);},hasHandler:function(command)
{return!!this._handlers[command];},registerHandler:function(command,handler)
{this._handlers[command]=handler;},unregisterHandler:function(command)
{delete this._handlers[command];},nextObjectId:function()
{return injectedScriptId+"_"+ ++this._lastObjectId;},_registerCallback:function(callback)
{var id=++this._lastRequestId;this._callbacks[id]=callback;return id;},_onCallback:function(request)
{if(request.requestId in this._callbacks){var callback=this._callbacks[request.requestId];delete this._callbacks[request.requestId];callback(request.result);}},_onMessage:function(event)
{var request=event.data;var handler=this._handlers[request.command];if(handler)
handler.call(this,request);}}
function populateInterfaceClass(interface,implementation)
{for(var member in implementation){if(member.charAt(0)==="_")
continue;var descriptor=null;for(var owner=implementation;owner&&!descriptor;owner=owner.__proto__)
descriptor=Object.getOwnPropertyDescriptor(owner,member);if(!descriptor)
continue;if(typeof descriptor.value==="function")
interface[member]=descriptor.value.bind(implementation);else if(typeof descriptor.get==="function")
interface.__defineGetter__(member,descriptor.get.bind(implementation));else
Object.defineProperty(interface,member,descriptor);}}
if(!extensionServer)
extensionServer=new ExtensionServerClient();return new InspectorExtensionAPI();}
function platformExtensionAPI(coreAPI)
{function getTabId()
{return tabId;}
chrome=window.chrome||{};var devtools_descriptor=Object.getOwnPropertyDescriptor(chrome,"devtools");if(!devtools_descriptor||devtools_descriptor.get)
Object.defineProperty(chrome,"devtools",{value:{},enumerable:true});chrome.devtools.inspectedWindow={};chrome.devtools.inspectedWindow.__defineGetter__("tabId",getTabId);chrome.devtools.inspectedWindow.__proto__=coreAPI.inspectedWindow;chrome.devtools.network=coreAPI.network;chrome.devtools.panels=coreAPI.panels;if(extensionInfo.exposeExperimentalAPIs!==false){chrome.experimental=chrome.experimental||{};chrome.experimental.devtools=chrome.experimental.devtools||{};var properties=Object.getOwnPropertyNames(coreAPI);for(var i=0;i<properties.length;++i){var descriptor=Object.getOwnPropertyDescriptor(coreAPI,properties[i]);Object.defineProperty(chrome.experimental.devtools,properties[i],descriptor);}
chrome.experimental.devtools.inspectedWindow=chrome.devtools.inspectedWindow;}
if(extensionInfo.exposeWebInspectorNamespace)
window.webInspector=coreAPI;}
function buildPlatformExtensionAPI(extensionInfo)
{return"var extensionInfo = "+JSON.stringify(extensionInfo)+";"+"var tabId = "+WebInspector._inspectedTabId+";"+
platformExtensionAPI.toString();}
function buildExtensionAPIInjectedScript(extensionInfo)
{return"(function(injectedScriptId){ "+"var extensionServer;"+
defineCommonExtensionSymbols.toString()+";"+
injectedExtensionAPI.toString()+";"+
buildPlatformExtensionAPI(extensionInfo)+";"+"platformExtensionAPI(injectedExtensionAPI(injectedScriptId));"+"return {};"+"})";};if(!window.InspectorExtensionRegistry){WebInspector.InspectorExtensionRegistryStub=function()
{}
WebInspector.InspectorExtensionRegistryStub.prototype={getExtensionsAsync:function()
{}}
var InspectorExtensionRegistry=new WebInspector.InspectorExtensionRegistryStub();};WebInspector.ExtensionAuditCategory=function(extensionOrigin,id,displayName,ruleCount)
{this._extensionOrigin=extensionOrigin;this._id=id;this._displayName=displayName;this._ruleCount=ruleCount;}
WebInspector.ExtensionAuditCategory.prototype={get id()
{return this._id;},get displayName()
{return this._displayName;},run:function(target,requests,ruleResultCallback,categoryDoneCallback,progress)
{var results=new WebInspector.ExtensionAuditCategoryResults(this,target,ruleResultCallback,categoryDoneCallback,progress);WebInspector.extensionServer.startAuditRun(this,results);}}
WebInspector.ExtensionAuditCategoryResults=function(category,target,ruleResultCallback,categoryDoneCallback,progress)
{this._target=target;this._category=category;this._ruleResultCallback=ruleResultCallback;this._categoryDoneCallback=categoryDoneCallback;this._progress=progress;this._progress.setTotalWork(1);this._expectedResults=category._ruleCount;this._actualResults=0;this.id=category.id+"-"+ ++WebInspector.ExtensionAuditCategoryResults._lastId;}
WebInspector.ExtensionAuditCategoryResults.prototype={done:function()
{WebInspector.extensionServer.stopAuditRun(this);this._progress.done();this._categoryDoneCallback();},addResult:function(displayName,description,severity,details)
{var result=new WebInspector.AuditRuleResult(displayName);result.addChild(description);result.severity=severity;if(details)
this._addNode(result,details);this._addResult(result);},_addNode:function(parent,node)
{var contents=WebInspector.auditFormatters.partiallyApply(WebInspector.ExtensionAuditFormatters,this,node.contents);var addedNode=parent.addChild(contents,node.expanded);if(node.children){for(var i=0;i<node.children.length;++i)
this._addNode(addedNode,node.children[i]);}},_addResult:function(result)
{this._ruleResultCallback(result);++this._actualResults;if(typeof this._expectedResults==="number"){this._progress.setWorked(this._actualResults/this._expectedResults);if(this._actualResults===this._expectedResults)
this.done();}},updateProgress:function(progress)
{this._progress.setWorked(progress);},evaluate:function(expression,evaluateOptions,callback)
{function onEvaluate(error,result,wasThrown)
{if(wasThrown)
return;var object=this._target.runtimeModel.createRemoteObject(result);callback(object);}
WebInspector.extensionServer.evaluate(expression,false,false,evaluateOptions,this._category._extensionOrigin,onEvaluate.bind(this));}}
WebInspector.ExtensionAuditFormatters={object:function(expression,title,evaluateOptions)
{var parentElement=document.createElement("div");function onEvaluate(remoteObject)
{var section=new WebInspector.ObjectPropertiesSection(remoteObject,title);section.expanded=true;section.editable=false;parentElement.appendChild(section.element);}
this.evaluate(expression,evaluateOptions,onEvaluate);return parentElement;},node:function(expression,evaluateOptions)
{var parentElement=document.createElement("div");function onNodeAvailable(node)
{if(!node)
return;var renderer=WebInspector.moduleManager.instance(WebInspector.Renderer,node);if(renderer)
parentElement.appendChild(renderer.render(node));else
console.error("No renderer for node found");}
function onEvaluate(remoteObject)
{remoteObject.pushNodeToFrontend(onNodeAvailable);}
this.evaluate(expression,evaluateOptions,onEvaluate);return parentElement;}}
WebInspector.ExtensionAuditCategoryResults._lastId=0;;WebInspector.ExtensionServer=function()
{this._clientObjects={};this._handlers={};this._subscribers={};this._subscriptionStartHandlers={};this._subscriptionStopHandlers={};this._extraHeaders={};this._requests={};this._lastRequestId=0;this._registeredExtensions={};this._status=new WebInspector.ExtensionStatus();var commands=WebInspector.extensionAPI.Commands;this._registerHandler(commands.AddAuditCategory,this._onAddAuditCategory.bind(this));this._registerHandler(commands.AddAuditResult,this._onAddAuditResult.bind(this));this._registerHandler(commands.AddConsoleMessage,this._onAddConsoleMessage.bind(this));this._registerHandler(commands.AddRequestHeaders,this._onAddRequestHeaders.bind(this));this._registerHandler(commands.ApplyStyleSheet,this._onApplyStyleSheet.bind(this));this._registerHandler(commands.CreatePanel,this._onCreatePanel.bind(this));this._registerHandler(commands.CreateSidebarPane,this._onCreateSidebarPane.bind(this));this._registerHandler(commands.CreateStatusBarButton,this._onCreateStatusBarButton.bind(this));this._registerHandler(commands.EvaluateOnInspectedPage,this._onEvaluateOnInspectedPage.bind(this));this._registerHandler(commands.ForwardKeyboardEvent,this._onForwardKeyboardEvent.bind(this));this._registerHandler(commands.GetHAR,this._onGetHAR.bind(this));this._registerHandler(commands.GetConsoleMessages,this._onGetConsoleMessages.bind(this));this._registerHandler(commands.GetPageResources,this._onGetPageResources.bind(this));this._registerHandler(commands.GetRequestContent,this._onGetRequestContent.bind(this));this._registerHandler(commands.GetResourceContent,this._onGetResourceContent.bind(this));this._registerHandler(commands.Reload,this._onReload.bind(this));this._registerHandler(commands.SetOpenResourceHandler,this._onSetOpenResourceHandler.bind(this));this._registerHandler(commands.SetResourceContent,this._onSetResourceContent.bind(this));this._registerHandler(commands.SetSidebarHeight,this._onSetSidebarHeight.bind(this));this._registerHandler(commands.SetSidebarContent,this._onSetSidebarContent.bind(this));this._registerHandler(commands.SetSidebarPage,this._onSetSidebarPage.bind(this));this._registerHandler(commands.ShowPanel,this._onShowPanel.bind(this));this._registerHandler(commands.StopAuditCategoryRun,this._onStopAuditCategoryRun.bind(this));this._registerHandler(commands.Subscribe,this._onSubscribe.bind(this));this._registerHandler(commands.OpenResource,this._onOpenResource.bind(this));this._registerHandler(commands.Unsubscribe,this._onUnsubscribe.bind(this));this._registerHandler(commands.UpdateButton,this._onUpdateButton.bind(this));this._registerHandler(commands.UpdateAuditProgress,this._onUpdateAuditProgress.bind(this));window.addEventListener("message",this._onWindowMessage.bind(this),false);this._initExtensions();}
WebInspector.ExtensionServer.prototype={hasExtensions:function()
{return!!Object.keys(this._registeredExtensions).length;},notifySearchAction:function(panelId,action,searchString)
{this._postNotification(WebInspector.extensionAPI.Events.PanelSearch+panelId,action,searchString);},notifyViewShown:function(identifier,frameIndex)
{this._postNotification(WebInspector.extensionAPI.Events.ViewShown+identifier,frameIndex);},notifyViewHidden:function(identifier)
{this._postNotification(WebInspector.extensionAPI.Events.ViewHidden+identifier);},notifyButtonClicked:function(identifier)
{this._postNotification(WebInspector.extensionAPI.Events.ButtonClicked+identifier);},_inspectedURLChanged:function(event)
{this._requests={};var url=event.data;this._postNotification(WebInspector.extensionAPI.Events.InspectedURLChanged,url);},startAuditRun:function(category,auditRun)
{this._clientObjects[auditRun.id]=auditRun;this._postNotification("audit-started-"+category.id,auditRun.id);},stopAuditRun:function(auditRun)
{delete this._clientObjects[auditRun.id];},hasSubscribers:function(type)
{return!!this._subscribers[type];},_postNotification:function(type,vararg)
{var subscribers=this._subscribers[type];if(!subscribers)
return;var message={command:"notify-"+type,arguments:Array.prototype.slice.call(arguments,1)};for(var i=0;i<subscribers.length;++i)
subscribers[i].postMessage(message);},_onSubscribe:function(message,port)
{var subscribers=this._subscribers[message.type];if(subscribers)
subscribers.push(port);else{this._subscribers[message.type]=[port];if(this._subscriptionStartHandlers[message.type])
this._subscriptionStartHandlers[message.type]();}},_onUnsubscribe:function(message,port)
{var subscribers=this._subscribers[message.type];if(!subscribers)
return;subscribers.remove(port);if(!subscribers.length){delete this._subscribers[message.type];if(this._subscriptionStopHandlers[message.type])
this._subscriptionStopHandlers[message.type]();}},_onAddRequestHeaders:function(message)
{var id=message.extensionId;if(typeof id!=="string")
return this._status.E_BADARGTYPE("extensionId",typeof id,"string");var extensionHeaders=this._extraHeaders[id];if(!extensionHeaders){extensionHeaders={};this._extraHeaders[id]=extensionHeaders;}
for(var name in message.headers)
extensionHeaders[name]=message.headers[name];var allHeaders=({});for(var extension in this._extraHeaders){var headers=this._extraHeaders[extension];for(name in headers){if(typeof headers[name]==="string")
allHeaders[name]=headers[name];}}
NetworkAgent.setExtraHTTPHeaders(allHeaders);},_onApplyStyleSheet:function(message)
{if(!WebInspector.experimentsSettings.applyCustomStylesheet.isEnabled())
return;var styleSheet=document.createElement("style");styleSheet.textContent=message.styleSheet;document.head.appendChild(styleSheet);},_onCreatePanel:function(message,port)
{var id=message.id;if(id in this._clientObjects||WebInspector.inspectorView.hasPanel(id))
return this._status.E_EXISTS(id);var page=this._expandResourcePath(port._extensionOrigin,message.page);var panelDescriptor=new WebInspector.ExtensionServerPanelDescriptor(id,message.title,new WebInspector.ExtensionPanel(id,page));this._clientObjects[id]=panelDescriptor.panel();WebInspector.inspectorView.addPanel(panelDescriptor);return this._status.OK();},_onShowPanel:function(message)
{WebInspector.inspectorView.showPanel(message.id);},_onCreateStatusBarButton:function(message,port)
{var panel=this._clientObjects[message.panel];if(!panel||!(panel instanceof WebInspector.ExtensionPanel))
return this._status.E_NOTFOUND(message.panel);var button=new WebInspector.ExtensionButton(message.id,this._expandResourcePath(port._extensionOrigin,message.icon),message.tooltip,message.disabled);this._clientObjects[message.id]=button;panel.addStatusBarItem(button.element);return this._status.OK();},_onUpdateButton:function(message,port)
{var button=this._clientObjects[message.id];if(!button||!(button instanceof WebInspector.ExtensionButton))
return this._status.E_NOTFOUND(message.id);button.update(this._expandResourcePath(port._extensionOrigin,message.icon),message.tooltip,message.disabled);return this._status.OK();},_onCreateSidebarPane:function(message)
{var panel=WebInspector.inspectorView.panel(message.panel);if(!panel)
return this._status.E_NOTFOUND(message.panel);if(!panel.addExtensionSidebarPane)
return this._status.E_NOTSUPPORTED();var id=message.id;var sidebar=new WebInspector.ExtensionSidebarPane(message.title,id);this._clientObjects[id]=sidebar;panel.addExtensionSidebarPane(id,sidebar);return this._status.OK();},_onSetSidebarHeight:function(message)
{var sidebar=this._clientObjects[message.id];if(!sidebar)
return this._status.E_NOTFOUND(message.id);sidebar.setHeight(message.height);return this._status.OK();},_onSetSidebarContent:function(message,port)
{var sidebar=this._clientObjects[message.id];if(!sidebar)
return this._status.E_NOTFOUND(message.id);function callback(error)
{var result=error?this._status.E_FAILED(error):this._status.OK();this._dispatchCallback(message.requestId,port,result);}
if(message.evaluateOnPage)
return sidebar.setExpression(message.expression,message.rootTitle,message.evaluateOptions,port._extensionOrigin,callback.bind(this));sidebar.setObject(message.expression,message.rootTitle,callback.bind(this));},_onSetSidebarPage:function(message,port)
{var sidebar=this._clientObjects[message.id];if(!sidebar)
return this._status.E_NOTFOUND(message.id);sidebar.setPage(this._expandResourcePath(port._extensionOrigin,message.page));},_onOpenResource:function(message)
{var uiSourceCode=WebInspector.workspace.uiSourceCodeForURL(message.url);if(uiSourceCode){WebInspector.Revealer.reveal(uiSourceCode.uiLocation(message.lineNumber,0));return this._status.OK();}
var resource=WebInspector.resourceForURL(message.url);if(resource){WebInspector.Revealer.reveal(resource,message.lineNumber);return this._status.OK();}
var request=WebInspector.networkLog.requestForURL(message.url);if(request){WebInspector.Revealer.reveal(request);return this._status.OK();}
return this._status.E_NOTFOUND(message.url);},_onSetOpenResourceHandler:function(message,port)
{var name=this._registeredExtensions[port._extensionOrigin].name||("Extension "+port._extensionOrigin);if(message.handlerPresent)
WebInspector.openAnchorLocationRegistry.registerHandler(name,this._handleOpenURL.bind(this,port));else
WebInspector.openAnchorLocationRegistry.unregisterHandler(name);},_handleOpenURL:function(port,details)
{var url=(details.url);var contentProvider=WebInspector.workspace.uiSourceCodeForOriginURL(url)||WebInspector.resourceForURL(url);if(!contentProvider)
return false;var lineNumber=details.lineNumber;if(typeof lineNumber==="number")
lineNumber+=1;port.postMessage({command:"open-resource",resource:this._makeResource(contentProvider),lineNumber:lineNumber});return true;},_onReload:function(message)
{var options=(message.options||{});NetworkAgent.setUserAgentOverride(typeof options.userAgent==="string"?options.userAgent:"");var injectedScript;if(options.injectedScript)
injectedScript="(function(){"+options.injectedScript+"})()";var preprocessingScript=options.preprocessingScript;WebInspector.resourceTreeModel.reloadPage(!!options.ignoreCache,injectedScript,preprocessingScript);return this._status.OK();},_onEvaluateOnInspectedPage:function(message,port)
{function callback(error,resultPayload,wasThrown)
{var result;if(error||!resultPayload)
result=this._status.E_PROTOCOLERROR(error.toString());else if(wasThrown)
result={isException:true,value:resultPayload.description};else
result={value:resultPayload.value};this._dispatchCallback(message.requestId,port,result);}
return this.evaluate(message.expression,true,true,message.evaluateOptions,port._extensionOrigin,callback.bind(this));},_onGetConsoleMessages:function()
{return WebInspector.console.messages.map(this._makeConsoleMessage);},_onAddConsoleMessage:function(message)
{function convertSeverity(level)
{switch(level){case WebInspector.extensionAPI.console.Severity.Log:return WebInspector.ConsoleMessage.MessageLevel.Log;case WebInspector.extensionAPI.console.Severity.Warning:return WebInspector.ConsoleMessage.MessageLevel.Warning;case WebInspector.extensionAPI.console.Severity.Error:return WebInspector.ConsoleMessage.MessageLevel.Error;case WebInspector.extensionAPI.console.Severity.Debug:return WebInspector.ConsoleMessage.MessageLevel.Debug;}}
var level=convertSeverity(message.severity);if(!level)
return this._status.E_BADARG("message.severity",message.severity);var consoleMessage=new WebInspector.ConsoleMessage(WebInspector.console.target(),WebInspector.ConsoleMessage.MessageSource.JS,level,message.text,WebInspector.ConsoleMessage.MessageType.Log,message.url,message.line);WebInspector.console.addMessage(consoleMessage);},_makeConsoleMessage:function(message)
{function convertLevel(level)
{if(!level)
return;switch(level){case WebInspector.ConsoleMessage.MessageLevel.Log:return WebInspector.extensionAPI.console.Severity.Log;case WebInspector.ConsoleMessage.MessageLevel.Warning:return WebInspector.extensionAPI.console.Severity.Warning;case WebInspector.ConsoleMessage.MessageLevel.Error:return WebInspector.extensionAPI.console.Severity.Error;case WebInspector.ConsoleMessage.MessageLevel.Debug:return WebInspector.extensionAPI.console.Severity.Debug;default:return WebInspector.extensionAPI.console.Severity.Log;}}
var result={severity:convertLevel(message.level),text:message.messageText,};if(message.url)
result.url=message.url;if(message.line)
result.line=message.line;return result;},_onGetHAR:function()
{WebInspector.inspectorView.panel("network");var requests=WebInspector.networkLog.requests;var harLog=(new WebInspector.HARLog(requests)).build();for(var i=0;i<harLog.entries.length;++i)
harLog.entries[i]._requestId=this._requestId(requests[i]);return harLog;},_makeResource:function(contentProvider)
{return{url:contentProvider.contentURL(),type:contentProvider.contentType().name()};},_onGetPageResources:function()
{var resources={};function pushResourceData(contentProvider)
{if(!resources[contentProvider.contentURL()])
resources[contentProvider.contentURL()]=this._makeResource(contentProvider);}
var uiSourceCodes=WebInspector.workspace.uiSourceCodesForProjectType(WebInspector.projectTypes.Network);uiSourceCodes=uiSourceCodes.concat(WebInspector.workspace.uiSourceCodesForProjectType(WebInspector.projectTypes.ContentScripts));uiSourceCodes.forEach(pushResourceData.bind(this));WebInspector.resourceTreeModel.forAllResources(pushResourceData.bind(this));return Object.values(resources);},_getResourceContent:function(contentProvider,message,port)
{function onContentAvailable(content)
{var response={encoding:(content===null)||contentProvider.contentType().isTextType()?"":"base64",content:content};this._dispatchCallback(message.requestId,port,response);}
contentProvider.requestContent(onContentAvailable.bind(this));},_onGetRequestContent:function(message,port)
{var request=this._requestById(message.id);if(!request)
return this._status.E_NOTFOUND(message.id);this._getResourceContent(request,message,port);},_onGetResourceContent:function(message,port)
{var url=(message.url);var contentProvider=WebInspector.workspace.uiSourceCodeForOriginURL(url)||WebInspector.resourceForURL(url);if(!contentProvider)
return this._status.E_NOTFOUND(url);this._getResourceContent(contentProvider,message,port);},_onSetResourceContent:function(message,port)
{function callbackWrapper(error)
{var response=error?this._status.E_FAILED(error):this._status.OK();this._dispatchCallback(message.requestId,port,response);}
var url=(message.url);var uiSourceCode=WebInspector.workspace.uiSourceCodeForOriginURL(url);if(!uiSourceCode){var resource=WebInspector.resourceTreeModel.resourceForURL(url);if(!resource)
return this._status.E_NOTFOUND(url);return this._status.E_NOTSUPPORTED("Resource is not editable")}
uiSourceCode.setWorkingCopy(message.content);if(message.commit)
uiSourceCode.commitWorkingCopy(callbackWrapper.bind(this));else
callbackWrapper.call(this,null);},_requestId:function(request)
{if(!request._extensionRequestId){request._extensionRequestId=++this._lastRequestId;this._requests[request._extensionRequestId]=request;}
return request._extensionRequestId;},_requestById:function(id)
{return this._requests[id];},_onAddAuditCategory:function(message,port)
{var category=new WebInspector.ExtensionAuditCategory(port._extensionOrigin,message.id,message.displayName,message.resultCount);if(WebInspector.inspectorView.panel("audits").getCategory(category.id))
return this._status.E_EXISTS(category.id);this._clientObjects[message.id]=category;WebInspector.inspectorView.panel("audits").addCategory(category);},_onAddAuditResult:function(message)
{var auditResult=this._clientObjects[message.resultId];if(!auditResult)
return this._status.E_NOTFOUND(message.resultId);try{auditResult.addResult(message.displayName,message.description,message.severity,message.details);}catch(e){return e;}
return this._status.OK();},_onUpdateAuditProgress:function(message)
{var auditResult=this._clientObjects[message.resultId];if(!auditResult)
return this._status.E_NOTFOUND(message.resultId);auditResult.updateProgress(Math.min(Math.max(0,message.progress),1));},_onStopAuditCategoryRun:function(message)
{var auditRun=this._clientObjects[message.resultId];if(!auditRun)
return this._status.E_NOTFOUND(message.resultId);auditRun.done();},_onForwardKeyboardEvent:function(message)
{const Esc="U+001B";message.entries.forEach(handleEventEntry);function handleEventEntry(entry)
{if(!entry.ctrlKey&&!entry.altKey&&!entry.metaKey&&!/^F\d+$/.test(entry.keyIdentifier)&&entry.keyIdentifier!==Esc)
return;var event=new window.KeyboardEvent(entry.eventType,{keyIdentifier:entry.keyIdentifier,location:entry.location,ctrlKey:entry.ctrlKey,altKey:entry.altKey,shiftKey:entry.shiftKey,metaKey:entry.metaKey});event.__keyCode=keyCodeForEntry(entry);document.dispatchEvent(event);}
function keyCodeForEntry(entry)
{var keyCode=entry.keyCode;if(!keyCode){var match=entry.keyIdentifier.match(/^U\+([\dA-Fa-f]+)$/);if(match)
keyCode=parseInt(match[1],16);}
return keyCode||0;}},_dispatchCallback:function(requestId,port,result)
{if(requestId)
port.postMessage({command:"callback",requestId:requestId,result:result});},_initExtensions:function()
{this._registerAutosubscriptionHandler(WebInspector.extensionAPI.Events.ConsoleMessageAdded,WebInspector.console,WebInspector.ConsoleModel.Events.MessageAdded,this._notifyConsoleMessageAdded);this._registerAutosubscriptionHandler(WebInspector.extensionAPI.Events.NetworkRequestFinished,WebInspector.networkManager,WebInspector.NetworkManager.EventTypes.RequestFinished,this._notifyRequestFinished);this._registerAutosubscriptionHandler(WebInspector.extensionAPI.Events.ResourceAdded,WebInspector.workspace,WebInspector.Workspace.Events.UISourceCodeAdded,this._notifyResourceAdded);function onElementsSubscriptionStarted()
{WebInspector.notifications.addEventListener(WebInspector.NotificationService.Events.SelectedNodeChanged,this._notifyElementsSelectionChanged,this);}
function onElementsSubscriptionStopped()
{WebInspector.notifications.removeEventListener(WebInspector.NotificationService.Events.SelectedNodeChanged,this._notifyElementsSelectionChanged,this);}
this._registerSubscriptionHandler(WebInspector.extensionAPI.Events.PanelObjectSelected+"elements",onElementsSubscriptionStarted.bind(this),onElementsSubscriptionStopped.bind(this));this._registerAutosubscriptionHandler(WebInspector.extensionAPI.Events.PanelObjectSelected+"sources",WebInspector.notifications,WebInspector.SourceFrame.Events.SelectionChanged,this._notifySourceFrameSelectionChanged);this._registerResourceContentCommittedHandler(this._notifyUISourceCodeContentCommitted);function onTimelineSubscriptionStarted()
{WebInspector.timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineEventRecorded,this._notifyTimelineEventRecorded,this);WebInspector.timelineManager.start();}
function onTimelineSubscriptionStopped()
{WebInspector.timelineManager.stop(function(){});WebInspector.timelineManager.removeEventListener(WebInspector.TimelineManager.EventTypes.TimelineEventRecorded,this._notifyTimelineEventRecorded,this);}
this._registerSubscriptionHandler(WebInspector.extensionAPI.Events.TimelineEventRecorded,onTimelineSubscriptionStarted.bind(this),onTimelineSubscriptionStopped.bind(this));WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.InspectedURLChanged,this._inspectedURLChanged,this);InspectorExtensionRegistry.getExtensionsAsync();},_makeSourceSelection:function(textRange)
{var sourcesPanel=WebInspector.inspectorView.panel("sources");var selection={startLine:textRange.startLine,startColumn:textRange.startColumn,endLine:textRange.endLine,endColumn:textRange.endColumn,url:sourcesPanel.sourcesView().currentUISourceCode().uri()};return selection;},_notifySourceFrameSelectionChanged:function(event)
{this._postNotification(WebInspector.extensionAPI.Events.PanelObjectSelected+"sources",this._makeSourceSelection(event.data));},_notifyConsoleMessageAdded:function(event)
{this._postNotification(WebInspector.extensionAPI.Events.ConsoleMessageAdded,this._makeConsoleMessage(event.data));},_notifyResourceAdded:function(event)
{var uiSourceCode=(event.data);this._postNotification(WebInspector.extensionAPI.Events.ResourceAdded,this._makeResource(uiSourceCode));},_notifyUISourceCodeContentCommitted:function(event)
{var uiSourceCode=(event.data.uiSourceCode);var content=(event.data.content);this._postNotification(WebInspector.extensionAPI.Events.ResourceContentCommitted,this._makeResource(uiSourceCode),content);},_notifyRequestFinished:function(event)
{var request=(event.data);WebInspector.inspectorView.panel("network");this._postNotification(WebInspector.extensionAPI.Events.NetworkRequestFinished,this._requestId(request),(new WebInspector.HAREntry(request)).build());},_notifyElementsSelectionChanged:function()
{this._postNotification(WebInspector.extensionAPI.Events.PanelObjectSelected+"elements");},_notifyTimelineEventRecorded:function(event)
{this._postNotification(WebInspector.extensionAPI.Events.TimelineEventRecorded,event.data);},addExtensions:function(extensionInfos)
{extensionInfos.forEach(this._addExtension,this);},_addExtension:function(extensionInfo)
{const urlOriginRegExp=new RegExp("([^:]+:\/\/[^/]*)\/");var startPage=extensionInfo.startPage;var name=extensionInfo.name;try{var originMatch=urlOriginRegExp.exec(startPage);if(!originMatch){console.error("Skipping extension with invalid URL: "+startPage);return false;}
var extensionOrigin=originMatch[1];if(!this._registeredExtensions[extensionOrigin]){InspectorFrontendHost.setInjectedScriptForOrigin(extensionOrigin,buildExtensionAPIInjectedScript(extensionInfo));this._registeredExtensions[extensionOrigin]={name:name};}
var iframe=document.createElement("iframe");iframe.src=startPage;iframe.style.display="none";document.body.appendChild(iframe);}catch(e){console.error("Failed to initialize extension "+startPage+":"+e);return false;}
return true;},_registerExtension:function(origin,port)
{if(!this._registeredExtensions.hasOwnProperty(origin)){if(origin!==window.location.origin)
console.error("Ignoring unauthorized client request from "+origin);return;}
port._extensionOrigin=origin;port.addEventListener("message",this._onmessage.bind(this),false);port.start();},_onWindowMessage:function(event)
{if(event.data==="registerExtension")
this._registerExtension(event.origin,event.ports[0]);},_onmessage:function(event)
{var message=event.data;var result;if(message.command in this._handlers)
result=this._handlers[message.command](message,event.target);else
result=this._status.E_NOTSUPPORTED(message.command);if(result&&message.requestId)
this._dispatchCallback(message.requestId,event.target,result);},_registerHandler:function(command,callback)
{console.assert(command);this._handlers[command]=callback;},_registerSubscriptionHandler:function(eventTopic,onSubscribeFirst,onUnsubscribeLast)
{this._subscriptionStartHandlers[eventTopic]=onSubscribeFirst;this._subscriptionStopHandlers[eventTopic]=onUnsubscribeLast;},_registerAutosubscriptionHandler:function(eventTopic,eventTarget,frontendEventType,handler)
{this._registerSubscriptionHandler(eventTopic,eventTarget.addEventListener.bind(eventTarget,frontendEventType,handler,this),eventTarget.removeEventListener.bind(eventTarget,frontendEventType,handler,this));},_registerResourceContentCommittedHandler:function(handler)
{function addFirstEventListener()
{WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeContentCommitted,handler,this);WebInspector.workspace.setHasResourceContentTrackingExtensions(true);}
function removeLastEventListener()
{WebInspector.workspace.setHasResourceContentTrackingExtensions(false);WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeContentCommitted,handler,this);}
this._registerSubscriptionHandler(WebInspector.extensionAPI.Events.ResourceContentCommitted,addFirstEventListener.bind(this),removeLastEventListener.bind(this));},_expandResourcePath:function(extensionPath,resourcePath)
{if(!resourcePath)
return;return extensionPath+this._normalizePath(resourcePath);},_normalizePath:function(path)
{var source=path.split("/");var result=[];for(var i=0;i<source.length;++i){if(source[i]===".")
continue;if(source[i]==="")
continue;if(source[i]==="..")
result.pop();else
result.push(source[i]);}
return"/"+result.join("/");},evaluate:function(expression,exposeCommandLineAPI,returnByValue,options,securityOrigin,callback)
{var contextId;function resolveURLToFrame(url)
{var found;function hasMatchingURL(frame)
{found=(frame.url===url)?frame:null;return found;}
WebInspector.resourceTreeModel.frames().some(hasMatchingURL);return found;}
if(typeof options==="object"){var frame=options.frameURL?resolveURLToFrame(options.frameURL):WebInspector.resourceTreeModel.mainFrame;if(!frame){if(options.frameURL)
console.warn("evaluate: there is no frame with URL "+options.frameURL);else
console.warn("evaluate: the main frame is not yet available");return this._status.E_NOTFOUND(options.frameURL||"<top>");}
var contextSecurityOrigin;if(options.useContentScriptContext)
contextSecurityOrigin=securityOrigin;else if(options.scriptExecutionContext)
contextSecurityOrigin=options.scriptExecutionContext;var context;var executionContexts=WebInspector.runtimeModel.executionContexts();if(contextSecurityOrigin){for(var i=0;i<executionContexts.length;++i){var executionContext=executionContexts[i];if(executionContext.frameId===frame.id&&executionContext.name===contextSecurityOrigin&&!executionContext.isMainWorldContext)
context=executionContext;}
if(!context){console.warn("The JavaScript context "+contextSecurityOrigin+" was not found in the frame "+frame.url)
return this._status.E_NOTFOUND(contextSecurityOrigin)}}else{for(var i=0;i<executionContexts.length;++i){var executionContext=executionContexts[i];if(executionContext.frameId===frame.id&&executionContext.isMainWorldContext)
context=executionContext;}
if(!context)
return this._status.E_FAILED(frame.url+" has no execution context");}
contextId=context.id;}
RuntimeAgent.evaluate(expression,"extension",exposeCommandLineAPI,true,contextId,returnByValue,false,callback);}}
WebInspector.ExtensionServerPanelDescriptor=function(name,title,panel)
{this._name=name;this._title=title;this._panel=panel;}
WebInspector.ExtensionServerPanelDescriptor.prototype={name:function()
{return this._name;},title:function()
{return this._title;},panel:function()
{return this._panel;}}
WebInspector.ExtensionStatus=function()
{function makeStatus(code,description)
{var details=Array.prototype.slice.call(arguments,2);var status={code:code,description:description,details:details};if(code!=="OK"){status.isError=true;console.log("Extension server error: "+String.vsprintf(description,details));}
return status;}
this.OK=makeStatus.bind(null,"OK","OK");this.E_EXISTS=makeStatus.bind(null,"E_EXISTS","Object already exists: %s");this.E_BADARG=makeStatus.bind(null,"E_BADARG","Invalid argument %s: %s");this.E_BADARGTYPE=makeStatus.bind(null,"E_BADARGTYPE","Invalid type for argument %s: got %s, expected %s");this.E_NOTFOUND=makeStatus.bind(null,"E_NOTFOUND","Object not found: %s");this.E_NOTSUPPORTED=makeStatus.bind(null,"E_NOTSUPPORTED","Object does not support requested operation: %s");this.E_PROTOCOLERROR=makeStatus.bind(null,"E_PROTOCOLERROR","Inspector protocol error: %s");this.E_FAILED=makeStatus.bind(null,"E_FAILED","Operation failed: %s");}
WebInspector.ExtensionStatus.Record;WebInspector.extensionAPI={};defineCommonExtensionSymbols(WebInspector.extensionAPI);WebInspector.ExtensionPanel=function(id,pageURL)
{WebInspector.Panel.call(this,id);this.setHideOnDetach();this.element.classList.add("extension-panel");this._panelStatusBarElement=this.element.createChild("div","panel-status-bar hidden");this._searchableView=new WebInspector.SearchableView(this);this._searchableView.show(this.element);var extensionView=new WebInspector.ExtensionView(id,pageURL,"extension panel");extensionView.show(this._searchableView.element);this.setDefaultFocusedElement(extensionView.defaultFocusedElement());}
WebInspector.ExtensionPanel.prototype={defaultFocusedElement:function()
{return WebInspector.View.prototype.defaultFocusedElement.call(this);},addStatusBarItem:function(element)
{this._panelStatusBarElement.classList.remove("hidden");this._panelStatusBarElement.appendChild(element);},searchCanceled:function()
{WebInspector.extensionServer.notifySearchAction(this.name,WebInspector.extensionAPI.panels.SearchAction.CancelSearch);this._searchableView.updateSearchMatchesCount(0);},searchableView:function()
{return this._searchableView;},performSearch:function(query,shouldJump,jumpBackwards)
{WebInspector.extensionServer.notifySearchAction(this.name,WebInspector.extensionAPI.panels.SearchAction.PerformSearch,query);},jumpToNextSearchResult:function()
{WebInspector.extensionServer.notifySearchAction(this.name,WebInspector.extensionAPI.panels.SearchAction.NextSearchResult);},jumpToPreviousSearchResult:function()
{WebInspector.extensionServer.notifySearchAction(this.name,WebInspector.extensionAPI.panels.SearchAction.PreviousSearchResult);},__proto__:WebInspector.Panel.prototype}
WebInspector.ExtensionButton=function(id,iconURL,tooltip,disabled)
{this._id=id;this.element=document.createElement("button");this.element.className="status-bar-item extension";this.element.addEventListener("click",this._onClicked.bind(this),false);this.update(iconURL,tooltip,disabled);}
WebInspector.ExtensionButton.prototype={update:function(iconURL,tooltip,disabled)
{if(typeof iconURL==="string")
this.element.style.backgroundImage="url("+iconURL+")";if(typeof tooltip==="string")
this.element.title=tooltip;if(typeof disabled==="boolean")
this.element.disabled=disabled;},_onClicked:function()
{WebInspector.extensionServer.notifyButtonClicked(this._id);}}
WebInspector.ExtensionSidebarPane=function(title,id)
{WebInspector.SidebarPane.call(this,title);this.setHideOnDetach();this._id=id;}
WebInspector.ExtensionSidebarPane.prototype={setObject:function(object,title,callback)
{this._createObjectPropertiesView();this._setObject(WebInspector.RemoteObject.fromLocalObject(object),title,callback);},setExpression:function(expression,title,evaluateOptions,securityOrigin,callback)
{this._createObjectPropertiesView();WebInspector.extensionServer.evaluate(expression,true,false,evaluateOptions,securityOrigin,this._onEvaluate.bind(this,title,callback));},setPage:function(url)
{if(this._objectPropertiesView){this._objectPropertiesView.detach();delete this._objectPropertiesView;}
if(this._extensionView)
this._extensionView.detach(true);this._extensionView=new WebInspector.ExtensionView(this._id,url,"extension fill");this._extensionView.show(this.bodyElement);if(!this.bodyElement.style.height)
this.setHeight("150px");},setHeight:function(height)
{this.bodyElement.style.height=height;},_onEvaluate:function(title,callback,error,result,wasThrown)
{if(error)
callback(error.toString());else
this._setObject(WebInspector.runtimeModel.createRemoteObject(result),title,callback);},_createObjectPropertiesView:function()
{if(this._objectPropertiesView)
return;if(this._extensionView){this._extensionView.detach(true);delete this._extensionView;}
this._objectPropertiesView=new WebInspector.ExtensionNotifierView(this._id);this._objectPropertiesView.show(this.bodyElement);},_setObject:function(object,title,callback)
{if(!this._objectPropertiesView){callback("operation cancelled");return;}
this._objectPropertiesView.element.removeChildren();var section=new WebInspector.ObjectPropertiesSection(object,title);if(!title)
section.headerElement.classList.add("hidden");section.expanded=true;section.editable=false;this._objectPropertiesView.element.appendChild(section.element);callback();},__proto__:WebInspector.SidebarPane.prototype};WebInspector.ExtensionView=function(id,src,className)
{WebInspector.View.call(this);this.element.className="extension-view fill";this._id=id;this._iframe=document.createElement("iframe");this._iframe.addEventListener("load",this._onLoad.bind(this),false);this._iframe.src=src;this._iframe.className=className;this.setDefaultFocusedElement(this._iframe);this.element.appendChild(this._iframe);}
WebInspector.ExtensionView.prototype={wasShown:function()
{if(typeof this._frameIndex==="number")
WebInspector.extensionServer.notifyViewShown(this._id,this._frameIndex);},willHide:function()
{if(typeof this._frameIndex==="number")
WebInspector.extensionServer.notifyViewHidden(this._id);},_onLoad:function()
{var frames=(window.frames);this._frameIndex=Array.prototype.indexOf.call(frames,this._iframe.contentWindow);if(this.isShowing())
WebInspector.extensionServer.notifyViewShown(this._id,this._frameIndex);},__proto__:WebInspector.View.prototype}
WebInspector.ExtensionNotifierView=function(id)
{WebInspector.VBox.call(this);this._id=id;}
WebInspector.ExtensionNotifierView.prototype={wasShown:function()
{WebInspector.extensionServer.notifyViewShown(this._id);},willHide:function()
{WebInspector.extensionServer.notifyViewHidden(this._id);},__proto__:WebInspector.VBox.prototype};