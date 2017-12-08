WebInspector.ConsoleViewMessage=function(consoleMessage,linkifier,nestingLevel)
{this._message=consoleMessage;this._linkifier=linkifier;this._repeatCount=1;this._closeGroupDecorationCount=0;this._nestingLevel=nestingLevel;this._dataGrids=[];this._dataGridParents=new Map();this._customFormatters={"object":this._formatParameterAsObject,"array":this._formatParameterAsArray,"node":this._formatParameterAsNode,"string":this._formatParameterAsString};}
WebInspector.ConsoleViewMessage.prototype={_target:function()
{return this.consoleMessage().target();},element:function()
{return this.toMessageElement();},wasShown:function()
{for(var i=0;this._dataGrids&&i<this._dataGrids.length;++i){var dataGrid=this._dataGrids[i];var parentElement=this._dataGridParents.get(dataGrid)||null;dataGrid.show(parentElement);dataGrid.updateWidths();}},willHide:function()
{this._cachedHeight=this.contentElement().clientHeight;for(var i=0;this._dataGrids&&i<this._dataGrids.length;++i){var dataGrid=this._dataGrids[i];this._dataGridParents.put(dataGrid,dataGrid.element.parentElement);dataGrid.detach();}},fastHeight:function()
{if(this._cachedHeight)
return this._cachedHeight;const defaultConsoleRowHeight=17;if(this._message.type===WebInspector.ConsoleMessage.MessageType.Table){var table=this._message.parameters[0];if(table&&table.preview)
return defaultConsoleRowHeight*table.preview.properties.length;}
return defaultConsoleRowHeight;},consoleMessage:function()
{return this._message;},_formatMessage:function()
{this._formattedMessage=document.createElement("span");this._formattedMessage.className="console-message-text source-code";function linkifyRequest(title)
{return WebInspector.Linkifier.linkifyUsingRevealer((this.request),title,this.url);}
var consoleMessage=this._message;if(!this._messageElement){if(consoleMessage.source===WebInspector.ConsoleMessage.MessageSource.ConsoleAPI){switch(consoleMessage.type){case WebInspector.ConsoleMessage.MessageType.Trace:this._messageElement=this._format(consoleMessage.parameters||["console.trace()"]);break;case WebInspector.ConsoleMessage.MessageType.Clear:this._messageElement=document.createTextNode(WebInspector.UIString("Console was cleared"));this._formattedMessage.classList.add("console-info");break;case WebInspector.ConsoleMessage.MessageType.Assert:var args=[WebInspector.UIString("Assertion failed:")];if(consoleMessage.parameters)
args=args.concat(consoleMessage.parameters);this._messageElement=this._format(args);break;case WebInspector.ConsoleMessage.MessageType.Dir:var obj=consoleMessage.parameters?consoleMessage.parameters[0]:undefined;var args=["%O",obj];this._messageElement=this._format(args);break;case WebInspector.ConsoleMessage.MessageType.Profile:case WebInspector.ConsoleMessage.MessageType.ProfileEnd:this._messageElement=this._format([consoleMessage.messageText]);break;default:var args=consoleMessage.parameters||[consoleMessage.messageText];this._messageElement=this._format(args);}}else if(consoleMessage.source===WebInspector.ConsoleMessage.MessageSource.Network){if(consoleMessage.request){this._messageElement=document.createElement("span");if(consoleMessage.level===WebInspector.ConsoleMessage.MessageLevel.Error){this._messageElement.appendChild(document.createTextNode(consoleMessage.request.requestMethod+" "));this._messageElement.appendChild(WebInspector.Linkifier.linkifyUsingRevealer(consoleMessage.request,consoleMessage.request.url,consoleMessage.request.url));if(consoleMessage.request.failed)
this._messageElement.appendChild(document.createTextNode(" "+consoleMessage.request.localizedFailDescription));else
this._messageElement.appendChild(document.createTextNode(" "+consoleMessage.request.statusCode+" ("+consoleMessage.request.statusText+")"));}else{var fragment=WebInspector.linkifyStringAsFragmentWithCustomLinkifier(consoleMessage.messageText,linkifyRequest.bind(consoleMessage));this._messageElement.appendChild(fragment);}}else{var url=consoleMessage.url;if(url){var isExternal=!WebInspector.resourceForURL(url)&&!WebInspector.workspace.uiSourceCodeForURL(url);this._anchorElement=WebInspector.linkifyURLAsNode(url,url,"console-message-url",isExternal);}
this._messageElement=this._format([consoleMessage.messageText]);}}else{var args=consoleMessage.parameters||[consoleMessage.messageText];this._messageElement=this._format(args);}}
if(consoleMessage.source!==WebInspector.ConsoleMessage.MessageSource.Network||consoleMessage.request){var callFrame=this._callFrameAnchorFromStackTrace(consoleMessage.stackTrace);if(callFrame)
this._anchorElement=this._linkifyCallFrame(callFrame);else if(consoleMessage.url&&consoleMessage.url!=="undefined")
this._anchorElement=this._linkifyLocation(consoleMessage.url,consoleMessage.line,consoleMessage.column);}
this._formattedMessage.appendChild(this._messageElement);if(this._anchorElement){this._formattedMessage.appendChild(document.createTextNode(" "));this._formattedMessage.appendChild(this._anchorElement);}
var dumpStackTrace=!!consoleMessage.stackTrace&&consoleMessage.stackTrace.length&&(consoleMessage.source===WebInspector.ConsoleMessage.MessageSource.Network||consoleMessage.level===WebInspector.ConsoleMessage.MessageLevel.Error||consoleMessage.type===WebInspector.ConsoleMessage.MessageType.Trace);if(dumpStackTrace){var ol=document.createElement("ol");ol.className="outline-disclosure";var treeOutline=new TreeOutline(ol);var content=this._formattedMessage;var root=new TreeElement(content,null,true);content.treeElementForTest=root;treeOutline.appendChild(root);if(consoleMessage.type===WebInspector.ConsoleMessage.MessageType.Trace)
root.expand();this._populateStackTraceTreeElement(root);this._formattedMessage=ol;}},_formattedMessageText:function()
{this.formattedMessage();return this._messageElement.textContent;},formattedMessage:function()
{if(!this._formattedMessage)
this._formatMessage();return this._formattedMessage;},_linkifyLocation:function(url,lineNumber,columnNumber)
{console.assert(this._linkifier);var target=this._target();if(!this._linkifier||!target)
return null;lineNumber=lineNumber?lineNumber-1:0;columnNumber=columnNumber?columnNumber-1:0;if(this._message.source===WebInspector.ConsoleMessage.MessageSource.CSS){var headerIds=target.cssModel.styleSheetIdsForURL(url);var cssLocation=new WebInspector.CSSLocation(target,url,lineNumber,columnNumber);return this._linkifier.linkifyCSSLocation(headerIds[0]||null,cssLocation,"console-message-url");}
return this._linkifier.linkifyLocation(target,url,lineNumber,columnNumber,"console-message-url");},_linkifyCallFrame:function(callFrame)
{console.assert(this._linkifier);var target=this._target();if(!this._linkifier||!target)
return null;var lineNumber=callFrame.lineNumber?callFrame.lineNumber-1:0;var columnNumber=callFrame.columnNumber?callFrame.columnNumber-1:0;var rawLocation=new WebInspector.DebuggerModel.Location(target,callFrame.scriptId,lineNumber,columnNumber);return this._linkifier.linkifyRawLocation(rawLocation,"console-message-url");},_callFrameAnchorFromStackTrace:function(stackTrace)
{if(!stackTrace||!stackTrace.length)
return null;var callFrame=stackTrace[0].scriptId?stackTrace[0]:null;if(!WebInspector.experimentsSettings.frameworksDebuggingSupport.isEnabled())
return callFrame;if(!WebInspector.settings.skipStackFramesSwitch.get())
return callFrame;var regex=WebInspector.settings.skipStackFramesPattern.asRegExp();if(!regex)
return callFrame;for(var i=0;i<stackTrace.length;++i){var script=this._target().debuggerModel.scriptForId(stackTrace[i].scriptId);if(!script||!regex.test(script.sourceURL))
return stackTrace[i].scriptId?stackTrace[i]:null;}
return callFrame;},isErrorOrWarning:function()
{return(this._message.level===WebInspector.ConsoleMessage.MessageLevel.Warning||this._message.level===WebInspector.ConsoleMessage.MessageLevel.Error);},_format:function(parameters)
{var formattedResult=document.createElement("span");if(!parameters.length)
return formattedResult;var target=this._target();for(var i=0;i<parameters.length;++i){if(parameters[i]instanceof WebInspector.RemoteObject)
continue;if(!target){parameters[i]=WebInspector.RemoteObject.fromLocalObject(parameters[i]);continue;}
if(typeof parameters[i]==="object")
parameters[i]=target.runtimeModel.createRemoteObject(parameters[i]);else
parameters[i]=target.runtimeModel.createRemoteObjectFromPrimitiveValue(parameters[i]);}
var shouldFormatMessage=WebInspector.RemoteObject.type(parameters[0])==="string"&&this._message.type!==WebInspector.ConsoleMessage.MessageType.Result;if(shouldFormatMessage){var result=this._formatWithSubstitutionString(parameters[0].description,parameters.slice(1),formattedResult);parameters=result.unusedSubstitutions;if(parameters.length)
formattedResult.appendChild(document.createTextNode(" "));}
if(this._message.type===WebInspector.ConsoleMessage.MessageType.Table){formattedResult.appendChild(this._formatParameterAsTable(parameters));return formattedResult;}
for(var i=0;i<parameters.length;++i){if(shouldFormatMessage&&parameters[i].type==="string")
formattedResult.appendChild(WebInspector.linkifyStringAsFragment(parameters[i].description));else
formattedResult.appendChild(this._formatParameter(parameters[i],false,true));if(i<parameters.length-1)
formattedResult.appendChild(document.createTextNode(" "));}
return formattedResult;},_formatParameter:function(output,forceObjectFormat,includePreview)
{var type=forceObjectFormat?"object":(output.subtype||output.type);var formatter=this._customFormatters[type]||this._formatParameterAsValue;var span=document.createElement("span");span.className="console-formatted-"+type+" source-code";formatter.call(this,output,span,includePreview);return span;},_formatParameterAsValue:function(obj,elem)
{elem.appendChild(document.createTextNode(obj.description||""));if(obj.objectId)
elem.addEventListener("contextmenu",this._contextMenuEventFired.bind(this,obj),false);},_formatParameterAsObject:function(obj,elem,includePreview)
{this._formatParameterAsArrayOrObject(obj,obj.description||"",elem,includePreview);},_formatParameterAsArrayOrObject:function(obj,description,elem,includePreview)
{var titleElement=document.createElement("span");if(description)
titleElement.createTextChild(description);if(includePreview&&obj.preview){titleElement.classList.add("console-object-preview");var lossless=this._appendObjectPreview(obj,description,titleElement);if(lossless){elem.appendChild(titleElement);titleElement.addEventListener("contextmenu",this._contextMenuEventFired.bind(this,obj),false);return;}}
var section=new WebInspector.ObjectPropertiesSection(obj,titleElement);section.enableContextMenu();elem.appendChild(section.element);var note=section.titleElement.createChild("span","object-info-state-note");note.title=WebInspector.UIString("Object state below is captured upon first expansion");},_contextMenuEventFired:function(obj,event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendApplicableItems(obj);contextMenu.show();},_appendObjectPreview:function(obj,description,titleElement)
{var preview=obj.preview;var isArray=obj.subtype==="array";if(description)
titleElement.createTextChild(" ");titleElement.createTextChild(isArray?"[":"{");for(var i=0;i<preview.properties.length;++i){if(i>0)
titleElement.createTextChild(", ");var property=preview.properties[i];var name=property.name;if(!isArray||name!=i){if(/^\s|\s$|^$|\n/.test(name))
name="\""+name.replace(/\n/g,"\u21B5")+"\"";titleElement.createChild("span","name").textContent=name;titleElement.createTextChild(": ");}
titleElement.appendChild(this._renderPropertyPreviewOrAccessor(obj,[property]));}
if(preview.overflow)
titleElement.createChild("span").textContent="\u2026";titleElement.createTextChild(isArray?"]":"}");return preview.lossless;},_renderPropertyPreviewOrAccessor:function(object,propertyPath)
{var property=propertyPath.peekLast();if(property.type==="accessor")
return this._formatAsAccessorProperty(object,propertyPath.select("name"),false);return this._renderPropertyPreview(property.type,(property.subtype),property.value);},_renderPropertyPreview:function(type,subtype,description)
{var span=document.createElement("span");span.className="console-formatted-"+type;if(type==="function"){span.textContent="function";return span;}
if(type==="object"&&subtype==="regexp"){span.classList.add("console-formatted-string");span.textContent=description;return span;}
if(type==="object"&&subtype==="node"&&description){span.classList.add("console-formatted-preview-node");WebInspector.DOMPresentationUtils.createSpansForNodeTitle(span,description);return span;}
if(type==="string"){span.textContent="\""+description.replace(/\n/g,"\u21B5")+"\"";return span;}
span.textContent=description;return span;},_formatParameterAsNode:function(object,elem)
{function printNode(node)
{if(!node){this._formatParameterAsObject(object,elem,false);return;}
var renderer=WebInspector.moduleManager.instance(WebInspector.Renderer,node);if(renderer)
elem.appendChild(renderer.render(node));else
console.error("No renderer for node found");}
object.pushNodeToFrontend(printNode.bind(this));},useArrayPreviewInFormatter:function(array)
{return this._message.type!==WebInspector.ConsoleMessage.MessageType.DirXML&&!!array.preview;},_formatParameterAsArray:function(array,elem)
{if(this.useArrayPreviewInFormatter(array)){this._formatParameterAsArrayOrObject(array,"",elem,true);return;}
const maxFlatArrayLength=100;if(this._message.isOutdated||array.arrayLength()>maxFlatArrayLength)
this._formatParameterAsObject(array,elem,false);else
array.getOwnProperties(this._printArray.bind(this,array,elem));},_formatParameterAsTable:function(parameters)
{var element=document.createElement("span");var table=parameters[0];if(!table||!table.preview)
return element;var columnNames=[];var preview=table.preview;var rows=[];for(var i=0;i<preview.properties.length;++i){var rowProperty=preview.properties[i];var rowPreview=rowProperty.valuePreview;if(!rowPreview)
continue;var rowValue={};const maxColumnsToRender=20;for(var j=0;j<rowPreview.properties.length;++j){var cellProperty=rowPreview.properties[j];var columnRendered=columnNames.indexOf(cellProperty.name)!=-1;if(!columnRendered){if(columnNames.length===maxColumnsToRender)
continue;columnRendered=true;columnNames.push(cellProperty.name);}
if(columnRendered){var cellElement=this._renderPropertyPreviewOrAccessor(table,[rowProperty,cellProperty]);cellElement.classList.add("nowrap-below");rowValue[cellProperty.name]=cellElement;}}
rows.push([rowProperty.name,rowValue]);}
var flatValues=[];for(var i=0;i<rows.length;++i){var rowName=rows[i][0];var rowValue=rows[i][1];flatValues.push(rowName);for(var j=0;j<columnNames.length;++j)
flatValues.push(rowValue[columnNames[j]]);}
var dataGridContainer=element.createChild("span");if(!preview.lossless||!flatValues.length){element.appendChild(this._formatParameter(table,true,false));if(!flatValues.length)
return element;}
columnNames.unshift(WebInspector.UIString("(index)"));var dataGrid=WebInspector.DataGrid.createSortableDataGrid(columnNames,flatValues);dataGrid.renderInline();this._dataGrids.push(dataGrid);this._dataGridParents.put(dataGrid,dataGridContainer);return element;},_formatParameterAsString:function(output,elem)
{var span=document.createElement("span");span.className="console-formatted-string source-code";span.appendChild(WebInspector.linkifyStringAsFragment(output.description||""));elem.classList.remove("console-formatted-string");elem.appendChild(document.createTextNode("\""));elem.appendChild(span);elem.appendChild(document.createTextNode("\""));},_printArray:function(array,elem,properties)
{if(!properties)
return;var elements=[];for(var i=0;i<properties.length;++i){var property=properties[i];var name=property.name;if(isNaN(name))
continue;if(property.getter)
elements[name]=this._formatAsAccessorProperty(array,[name],true);else if(property.value)
elements[name]=this._formatAsArrayEntry(property.value);}
elem.appendChild(document.createTextNode("["));var lastNonEmptyIndex=-1;function appendUndefined(elem,index)
{if(index-lastNonEmptyIndex<=1)
return;var span=elem.createChild("span","console-formatted-undefined");span.textContent=WebInspector.UIString("undefined × %d",index-lastNonEmptyIndex-1);}
var length=array.arrayLength();for(var i=0;i<length;++i){var element=elements[i];if(!element)
continue;if(i-lastNonEmptyIndex>1){appendUndefined(elem,i);elem.appendChild(document.createTextNode(", "));}
elem.appendChild(element);lastNonEmptyIndex=i;if(i<length-1)
elem.appendChild(document.createTextNode(", "));}
appendUndefined(elem,length);elem.appendChild(document.createTextNode("]"));elem.addEventListener("contextmenu",this._contextMenuEventFired.bind(this,array),false);},_formatAsArrayEntry:function(output)
{return this._formatParameter(output,output.subtype==="array",false);},_formatAsAccessorProperty:function(object,propertyPath,isArrayEntry)
{var rootElement=WebInspector.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(object,propertyPath,onInvokeGetterClick.bind(this));function onInvokeGetterClick(result,wasThrown)
{if(!result)
return;rootElement.removeChildren();if(wasThrown){var element=rootElement.createChild("span","error-message");element.textContent=WebInspector.UIString("<exception>");element.title=result.description;}else if(isArrayEntry){rootElement.appendChild(this._formatAsArrayEntry(result));}else{const maxLength=100;var type=result.type;var subtype=result.subtype;var description="";if(type!=="function"&&result.description){if(type==="string"||subtype==="regexp")
description=result.description.trimMiddle(maxLength);else
description=result.description.trimEnd(maxLength);}
rootElement.appendChild(this._renderPropertyPreview(type,subtype,description));}}
return rootElement;},_formatWithSubstitutionString:function(format,parameters,formattedResult)
{var formatters={};function parameterFormatter(force,obj)
{return this._formatParameter(obj,force,false);}
function stringFormatter(obj)
{return obj.description;}
function floatFormatter(obj)
{if(typeof obj.value!=="number")
return"NaN";return obj.value;}
function integerFormatter(obj)
{if(typeof obj.value!=="number")
return"NaN";return Math.floor(obj.value);}
function bypassFormatter(obj)
{return(obj instanceof Node)?obj:"";}
var currentStyle=null;function styleFormatter(obj)
{currentStyle={};var buffer=document.createElement("span");buffer.setAttribute("style",obj.description);for(var i=0;i<buffer.style.length;i++){var property=buffer.style[i];if(isWhitelistedProperty(property))
currentStyle[property]=buffer.style[property];}}
function isWhitelistedProperty(property)
{var prefixes=["background","border","color","font","line","margin","padding","text","-webkit-background","-webkit-border","-webkit-font","-webkit-margin","-webkit-padding","-webkit-text"];for(var i=0;i<prefixes.length;i++){if(property.startsWith(prefixes[i]))
return true;}
return false;}
formatters.o=parameterFormatter.bind(this,false);formatters.s=stringFormatter;formatters.f=floatFormatter;formatters.i=integerFormatter;formatters.d=integerFormatter;formatters.c=styleFormatter;formatters.O=parameterFormatter.bind(this,true);formatters._=bypassFormatter;function append(a,b)
{if(b instanceof Node)
a.appendChild(b);else if(typeof b!=="undefined"){var toAppend=WebInspector.linkifyStringAsFragment(String(b));if(currentStyle){var wrapper=document.createElement('span');for(var key in currentStyle)
wrapper.style[key]=currentStyle[key];wrapper.appendChild(toAppend);toAppend=wrapper;}
a.appendChild(toAppend);}
return a;}
return String.format(format,parameters,formatters,formattedResult,append);},clearHighlight:function()
{if(!this._formattedMessage)
return;var highlightedMessage=this._formattedMessage;delete this._formattedMessage;delete this._anchorElement;delete this._messageElement;this._formatMessage();this._element.replaceChild(this._formattedMessage,highlightedMessage);},highlightSearchResults:function(regexObject)
{if(!this._formattedMessage)
return;this._highlightSearchResultsInElement(regexObject,this._messageElement);if(this._anchorElement)
this._highlightSearchResultsInElement(regexObject,this._anchorElement);this._element.scrollIntoViewIfNeeded();},_highlightSearchResultsInElement:function(regexObject,element)
{regexObject.lastIndex=0;var text=element.textContent;var match=regexObject.exec(text);var matchRanges=[];while(match){matchRanges.push(new WebInspector.SourceRange(match.index,match[0].length));match=regexObject.exec(text);}
WebInspector.highlightSearchResults(element,matchRanges);},matchesRegex:function(regexObject)
{regexObject.lastIndex=0;return regexObject.test(this._formattedMessageText())||(!!this._anchorElement&&regexObject.test(this._anchorElement.textContent));},updateTimestamp:function(show)
{if(!this._element)
return;if(show&&!this.timestampElement){this.timestampElement=this._element.createChild("span","console-timestamp");this.timestampElement.textContent=(new Date(this._message.timestamp)).toConsoleTime();var afterRepeatCountChild=this._repeatCountElement&&this._repeatCountElement.nextSibling;this._element.insertBefore(this.timestampElement,afterRepeatCountChild||this._element.firstChild);return;}
if(!show&&this.timestampElement){this.timestampElement.remove();delete this.timestampElement;}},nestingLevel:function()
{return this._nestingLevel;},resetCloseGroupDecorationCount:function()
{this._closeGroupDecorationCount=0;this._updateCloseGroupDecorations();},incrementCloseGroupDecorationCount:function()
{++this._closeGroupDecorationCount;this._updateCloseGroupDecorations();},_updateCloseGroupDecorations:function()
{if(!this._nestingLevelMarkers)
return;for(var i=0,n=this._nestingLevelMarkers.length;i<n;++i){var marker=this._nestingLevelMarkers[i];marker.classList.toggle("group-closed",n-i<=this._closeGroupDecorationCount);}},contentElement:function()
{if(this._element)
return this._element;var element=document.createElementWithClass("div","console-message");this._element=element;switch(this._message.level){case WebInspector.ConsoleMessage.MessageLevel.Log:element.classList.add("console-log-level");break;case WebInspector.ConsoleMessage.MessageLevel.Debug:element.classList.add("console-debug-level");break;case WebInspector.ConsoleMessage.MessageLevel.Warning:element.classList.add("console-warning-level");break;case WebInspector.ConsoleMessage.MessageLevel.Error:element.classList.add("console-error-level");break;case WebInspector.ConsoleMessage.MessageLevel.Info:element.classList.add("console-info-level");break;}
if(this._message.type===WebInspector.ConsoleMessage.MessageType.StartGroup||this._message.type===WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed)
element.classList.add("console-group-title");element.appendChild(this.formattedMessage());if(this._repeatCount>1)
this._showRepeatCountElement();this.updateTimestamp(WebInspector.settings.consoleTimestampsEnabled.get());return this._element;},toMessageElement:function()
{if(this._wrapperElement)
return this._wrapperElement;this._wrapperElement=document.createElementWithClass("div","console-message-wrapper");this._nestingLevelMarkers=[];for(var i=0;i<this._nestingLevel;++i)
this._nestingLevelMarkers.push(this._wrapperElement.createChild("div","nesting-level-marker"));this._updateCloseGroupDecorations();this._wrapperElement.message=this;this._wrapperElement.appendChild(this.contentElement());return this._wrapperElement;},_populateStackTraceTreeElement:function(parentTreeElement)
{for(var i=0;i<this._message.stackTrace.length;i++){var frame=this._message.stackTrace[i];var content=document.createElementWithClass("div","stacktrace-entry");var messageTextElement=document.createElement("span");messageTextElement.className="console-message-text source-code";var functionName=frame.functionName||WebInspector.UIString("(anonymous function)");messageTextElement.appendChild(document.createTextNode(functionName));content.appendChild(messageTextElement);if(frame.scriptId){content.appendChild(document.createTextNode(" "));var urlElement=this._linkifyCallFrame(frame);if(!urlElement)
continue;content.appendChild(urlElement);}
var treeElement=new TreeElement(content);parentTreeElement.appendChild(treeElement);}},resetIncrementRepeatCount:function()
{this._repeatCount=1;if(!this._repeatCountElement)
return;this._repeatCountElement.remove();delete this._repeatCountElement;},incrementRepeatCount:function()
{this._repeatCount++;this._showRepeatCountElement();},_showRepeatCountElement:function()
{if(!this._element)
return;if(!this._repeatCountElement){this._repeatCountElement=document.createElement("span");this._repeatCountElement.className="bubble";this._element.insertBefore(this._repeatCountElement,this._element.firstChild);this._element.classList.add("repeated-message");}
this._repeatCountElement.textContent=this._repeatCount;},toString:function()
{var sourceString;switch(this._message.source){case WebInspector.ConsoleMessage.MessageSource.XML:sourceString="XML";break;case WebInspector.ConsoleMessage.MessageSource.JS:sourceString="JavaScript";break;case WebInspector.ConsoleMessage.MessageSource.Network:sourceString="Network";break;case WebInspector.ConsoleMessage.MessageSource.ConsoleAPI:sourceString="ConsoleAPI";break;case WebInspector.ConsoleMessage.MessageSource.Storage:sourceString="Storage";break;case WebInspector.ConsoleMessage.MessageSource.AppCache:sourceString="AppCache";break;case WebInspector.ConsoleMessage.MessageSource.Rendering:sourceString="Rendering";break;case WebInspector.ConsoleMessage.MessageSource.CSS:sourceString="CSS";break;case WebInspector.ConsoleMessage.MessageSource.Security:sourceString="Security";break;case WebInspector.ConsoleMessage.MessageSource.Other:sourceString="Other";break;}
var typeString;switch(this._message.type){case WebInspector.ConsoleMessage.MessageType.Log:typeString="Log";break;case WebInspector.ConsoleMessage.MessageType.Dir:typeString="Dir";break;case WebInspector.ConsoleMessage.MessageType.DirXML:typeString="Dir XML";break;case WebInspector.ConsoleMessage.MessageType.Trace:typeString="Trace";break;case WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed:case WebInspector.ConsoleMessage.MessageType.StartGroup:typeString="Start Group";break;case WebInspector.ConsoleMessage.MessageType.EndGroup:typeString="End Group";break;case WebInspector.ConsoleMessage.MessageType.Assert:typeString="Assert";break;case WebInspector.ConsoleMessage.MessageType.Result:typeString="Result";break;case WebInspector.ConsoleMessage.MessageType.Profile:case WebInspector.ConsoleMessage.MessageType.ProfileEnd:typeString="Profiling";break;}
var levelString;switch(this._message.level){case WebInspector.ConsoleMessage.MessageLevel.Log:levelString="Log";break;case WebInspector.ConsoleMessage.MessageLevel.Warning:levelString="Warning";break;case WebInspector.ConsoleMessage.MessageLevel.Debug:levelString="Debug";break;case WebInspector.ConsoleMessage.MessageLevel.Error:levelString="Error";break;case WebInspector.ConsoleMessage.MessageLevel.Info:levelString="Info";break;}
return sourceString+" "+typeString+" "+levelString+": "+this.formattedMessage().textContent+"\n"+this._message.url+" line "+this._message.line;},get text()
{return this._message.messageText;},}
WebInspector.ConsoleGroupViewMessage=function(consoleMessage,linkifier,nestingLevel)
{console.assert(consoleMessage.isGroupStartMessage());WebInspector.ConsoleViewMessage.call(this,consoleMessage,linkifier,nestingLevel);this.setCollapsed(consoleMessage.type===WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed);}
WebInspector.ConsoleGroupViewMessage.prototype={setCollapsed:function(collapsed)
{this._collapsed=collapsed;if(this._wrapperElement)
this._wrapperElement.classList.toggle("collapsed",this._collapsed);},collapsed:function()
{return this._collapsed;},toMessageElement:function()
{if(!this._wrapperElement){WebInspector.ConsoleViewMessage.prototype.toMessageElement.call(this);this._wrapperElement.classList.toggle("collapsed",this._collapsed);}
return this._wrapperElement;},__proto__:WebInspector.ConsoleViewMessage.prototype};WebInspector.ConsoleView=function(hideContextSelector)
{WebInspector.VBox.call(this);this.registerRequiredCSS("filter.css");this._searchableView=new WebInspector.SearchableView(this);this._searchableView.setMinimalSearchQuerySize(0);this._searchableView.show(this.element);this._contentsElement=this._searchableView.element;this._contentsElement.classList.add("console-view");this._visibleViewMessages=[];this._urlToMessageCount={};this._hiddenByFilterCount=0;this._clearConsoleButton=new WebInspector.StatusBarButton(WebInspector.UIString("Clear console log."),"clear-status-bar-item");this._clearConsoleButton.addEventListener("click",this._requestClearMessages,this);this._executionContextSelector=new WebInspector.StatusBarComboBox(this._executionContextChanged.bind(this),"console-context");this._optionByExecutionContext=new Map();this._filter=new WebInspector.ConsoleViewFilter(this);this._filter.addEventListener(WebInspector.ConsoleViewFilter.Events.FilterChanged,this._updateMessageList.bind(this));if(hideContextSelector)
this._executionContextSelector.element.classList.add("hidden");this._filterBar=new WebInspector.FilterBar();var statusBarElement=this._contentsElement.createChild("div","console-status-bar");statusBarElement.appendChild(this._clearConsoleButton.element);statusBarElement.appendChild(this._filterBar.filterButton().element);statusBarElement.appendChild(this._executionContextSelector.element);this._filtersContainer=this._contentsElement.createChild("div","console-filters-header hidden");this._filtersContainer.appendChild(this._filterBar.filtersElement());this._filterBar.addEventListener(WebInspector.FilterBar.Events.FiltersToggled,this._onFiltersToggled,this);this._filterBar.setName("consoleView");this._filter.addFilters(this._filterBar);this._viewport=new WebInspector.ViewportControl(this);this._viewport.setStickToBottom(true);this._viewport.contentElement().classList.add("console-group");this._viewport.contentElement().classList.add("console-group-messages");this._contentsElement.appendChild(this._viewport.element);this._messagesElement=this._viewport.element;this._messagesElement.id="console-messages";this._messagesElement.addEventListener("click",this._messagesClicked.bind(this),true);this._scrolledToBottom=true;this._filterStatusMessageElement=document.createElementWithClass("div","console-message");this._messagesElement.insertBefore(this._filterStatusMessageElement,this._messagesElement.firstChild);this._filterStatusTextElement=this._filterStatusMessageElement.createChild("span","console-info");this._filterStatusMessageElement.createTextChild(" ");var resetFiltersLink=this._filterStatusMessageElement.createChild("span","console-info node-link");resetFiltersLink.textContent=WebInspector.UIString("Show all messages.");resetFiltersLink.addEventListener("click",this._filter.reset.bind(this._filter),true);this._topGroup=WebInspector.ConsoleGroup.createTopGroup();this._currentGroup=this._topGroup;this._promptElement=this._messagesElement.createChild("div","source-code");this._promptElement.id="console-prompt";this._promptElement.spellcheck=false;this._messagesElement.appendChild(this._promptElement);this._messagesElement.appendChild(document.createElement("br"));this._showAllMessagesCheckbox=new WebInspector.StatusBarCheckbox(WebInspector.UIString("Show all messages"));this._showAllMessagesCheckbox.inputElement.checked=true;this._showAllMessagesCheckbox.inputElement.addEventListener("change",this._updateMessageList.bind(this),false);if(!WebInspector.experimentsSettings.workersInMainWindow.isEnabled())
this._showAllMessagesCheckbox.element.classList.add("hidden");statusBarElement.appendChild(this._showAllMessagesCheckbox.element);this._registerShortcuts();this.registerRequiredCSS("suggestBox.css");this._messagesElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),false);WebInspector.settings.monitoringXHREnabled.addChangeListener(this._monitoringXHREnabledSettingChanged,this);this._linkifier=new WebInspector.Linkifier();this._consoleMessages=[];this._prompt=new WebInspector.TextPromptWithHistory(WebInspector.ExecutionContextSelector.completionsForTextPromptInCurrentContext);this._prompt.setSuggestBoxEnabled(true);this._prompt.renderAsBlock();this._prompt.attach(this._promptElement);this._prompt.proxyElement.addEventListener("keydown",this._promptKeyDown.bind(this),false);this._prompt.setHistoryData(WebInspector.settings.consoleHistory.get());var historyData=WebInspector.settings.consoleHistory.get();this._prompt.setHistoryData(historyData);this._updateFilterStatus();WebInspector.settings.consoleTimestampsEnabled.addChangeListener(this._consoleTimestampsSettingChanged,this);this._registerWithMessageSink();WebInspector.targetManager.observeTargets(this);}
WebInspector.ConsoleView.prototype={itemCount:function()
{return this._visibleViewMessages.length;},itemElement:function(index)
{return this._visibleViewMessages[index];},fastHeight:function(index)
{return this._visibleViewMessages[index].fastHeight();},targetAdded:function(target)
{function appendMessage(message)
{var viewMessage=this._createViewMessage(message);this._consoleMessageAdded(viewMessage);}
target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded,this._onConsoleMessageAdded,this);target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared,this._consoleCleared,this);target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.CommandEvaluated,this._commandEvaluated,this);target.consoleModel.messages.forEach(appendMessage,this);this._viewport.invalidate();target.runtimeModel.executionContexts().forEach(this._executionContextCreated,this);target.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.ExecutionContextCreated,this._onExecutionContextCreated,this);target.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.ExecutionContextDestroyed,this._onExecutionContextDestroyed,this);},targetRemoved:function(target)
{target.consoleModel.removeEventListener(WebInspector.ConsoleModel.Events.MessageAdded,this._onConsoleMessageAdded,this);target.consoleModel.removeEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared,this._consoleCleared,this);target.consoleModel.removeEventListener(WebInspector.ConsoleModel.Events.CommandEvaluated,this._commandEvaluated,this);target.runtimeModel.removeEventListener(WebInspector.RuntimeModel.Events.ExecutionContextCreated,this._onExecutionContextCreated,this);target.runtimeModel.removeEventListener(WebInspector.RuntimeModel.Events.ExecutionContextDestroyed,this._onExecutionContextDestroyed,this);},_registerWithMessageSink:function()
{WebInspector.messageSink.messages().forEach(this._addSinkMessage,this);WebInspector.messageSink.addEventListener(WebInspector.MessageSink.Events.MessageAdded,messageAdded,this);function messageAdded(event)
{this._addSinkMessage((event.data));}},_addSinkMessage:function(message)
{var level=WebInspector.ConsoleMessage.MessageLevel.Debug;switch(message.level){case WebInspector.MessageSink.MessageLevel.Error:level=WebInspector.ConsoleMessage.MessageLevel.Error;break;case WebInspector.MessageSink.MessageLevel.Warning:level=WebInspector.ConsoleMessage.MessageLevel.Warning;break;}
var consoleMessage=new WebInspector.ConsoleMessage(null,WebInspector.ConsoleMessage.MessageSource.Other,level,message.text,undefined,undefined,undefined,undefined,undefined,undefined,undefined,message.timestamp);this._addConsoleMessage(consoleMessage);},_consoleTimestampsSettingChanged:function(event)
{var enabled=(event.data);this._updateMessageList();this._consoleMessages.forEach(function(viewMessage){viewMessage.updateTimestamp(enabled);});},defaultFocusedElement:function()
{return this._promptElement},_onFiltersToggled:function(event)
{var toggled=(event.data);this._filtersContainer.classList.toggle("hidden",!toggled);},_titleFor:function(executionContext)
{var result=executionContext.name;if(executionContext.isMainWorldContext&&executionContext.frameId){var frame=executionContext.target().resourceTreeModel.frameForId(executionContext.frameId);result=frame?frame.displayName():result;}
if(!executionContext.isMainWorldContext)
result="\u00a0\u00a0\u00a0\u00a0"+result;var maxLength=50;return result.trimMiddle(maxLength);},_onExecutionContextCreated:function(event)
{var executionContext=(event.data);this._executionContextCreated(executionContext);},_executionContextCreated:function(executionContext)
{var newOption=document.createElement("option");newOption.__executionContext=executionContext;newOption.text=this._titleFor(executionContext);this._optionByExecutionContext.put(executionContext,newOption);var sameGroupExists=false;var options=this._executionContextSelector.selectElement().options;var insertBeforeOption=null;for(var i=0;i<options.length;++i){var optionContext=options[i].__executionContext;var isSameGroup=executionContext.target()===optionContext.target()&&executionContext.frameId===optionContext.frameId;sameGroupExists|=isSameGroup;if((isSameGroup&&WebInspector.ExecutionContext.comparator(optionContext,executionContext)>0)||(sameGroupExists&&!isSameGroup)){insertBeforeOption=options[i];break;}}
this._executionContextSelector.selectElement().insertBefore(newOption,insertBeforeOption);},_onExecutionContextDestroyed:function(event)
{var executionContext=(event.data);var option=this._optionByExecutionContext.remove(executionContext);option.remove();},_executionContextChanged:function()
{var newContext=this._currentExecutionContext();WebInspector.context.setFlavor(WebInspector.ExecutionContext,newContext);this._prompt.clearAutoComplete(true);if(!this._showAllMessagesCheckbox.checked())
this._updateMessageList();},_currentExecutionContext:function()
{var option=this._executionContextSelector.selectedOption();return option?option.__executionContext:null;},willHide:function()
{this._prompt.hideSuggestBox();this._prompt.clearAutoComplete(true);},wasShown:function()
{this._viewport.refresh();if(!this._prompt.isCaretInsidePrompt())
this._prompt.moveCaretToEndOfPrompt();},focus:function()
{if(this._promptElement===WebInspector.currentFocusElement())
return;WebInspector.setCurrentFocusElement(this._promptElement);this._prompt.moveCaretToEndOfPrompt();},storeScrollPositions:function()
{WebInspector.View.prototype.storeScrollPositions.call(this);this._scrolledToBottom=this._messagesElement.isScrolledToBottom();},restoreScrollPositions:function()
{if(this._scrolledToBottom)
this._immediatelyScrollIntoView();else
WebInspector.View.prototype.restoreScrollPositions.call(this);},onResize:function()
{this._prompt.hideSuggestBox();this.restoreScrollPositions();},_isScrollIntoViewScheduled:function()
{return!!this._scrollIntoViewTimer;},_scheduleViewportRefresh:function()
{if(this._scrollIntoViewTimer)
return;function scrollIntoView()
{delete this._scrollIntoViewTimer;this._viewport.invalidate();}
this._scrollIntoViewTimer=setTimeout(scrollIntoView.bind(this),50);},_immediatelyScrollIntoView:function()
{this._promptElement.scrollIntoView(true);this._cancelScheduledScrollIntoView();},_cancelScheduledScrollIntoView:function()
{if(!this._isScrollIntoViewScheduled())
return;clearTimeout(this._scrollIntoViewTimer);this._viewport.refresh();delete this._scrollIntoViewTimer;},_updateFilterStatus:function()
{this._filterStatusTextElement.textContent=WebInspector.UIString(this._hiddenByFilterCount===1?"%d message is hidden by filters.":"%d messages are hidden by filters.",this._hiddenByFilterCount);this._filterStatusMessageElement.style.display=this._hiddenByFilterCount?"":"none";},_consoleMessageAdded:function(viewMessage)
{function compareTimestamps(viewMessage1,viewMessage2)
{return WebInspector.ConsoleMessage.timestampComparator(viewMessage1.consoleMessage(),viewMessage2.consoleMessage());}
var insertAt=insertionIndexForObjectInListSortedByFunction(viewMessage,this._consoleMessages,compareTimestamps,true);this._consoleMessages.splice(insertAt,0,viewMessage);var message=viewMessage.consoleMessage();if(this._urlToMessageCount[message.url])
this._urlToMessageCount[message.url]++;else
this._urlToMessageCount[message.url]=1;if(this._tryToCollapseMessages(viewMessage,this._visibleViewMessages.peekLast()))
return;if(this._filter.shouldBeVisible(viewMessage))
this._showConsoleMessage(viewMessage)
else{this._hiddenByFilterCount++;this._updateFilterStatus();}},_onConsoleMessageAdded:function(event)
{var message=(event.data);this._addConsoleMessage(message);},_addConsoleMessage:function(message)
{var viewMessage=this._createViewMessage(message);this._consoleMessageAdded(viewMessage);this._scheduleViewportRefresh();},_showConsoleMessage:function(viewMessage)
{var lastMessage=this._visibleViewMessages.peekLast();if(viewMessage.consoleMessage().type===WebInspector.ConsoleMessage.MessageType.EndGroup){if(lastMessage&&!this._currentGroup.messagesHidden())
lastMessage.incrementCloseGroupDecorationCount();this._currentGroup=this._currentGroup.parentGroup();return;}
if(!this._currentGroup.messagesHidden()){var originatingMessage=viewMessage.consoleMessage().originatingMessage();if(lastMessage&&originatingMessage&&lastMessage.consoleMessage()===originatingMessage)
lastMessage.toMessageElement().classList.add("console-adjacent-user-command-result");this._visibleViewMessages.push(viewMessage);if(this._searchRegex&&viewMessage.matchesRegex(this._searchRegex)){this._searchResults.push(viewMessage);this._searchableView.updateSearchMatchesCount(this._searchResults.length);}}
if(viewMessage.consoleMessage().isGroupStartMessage())
this._currentGroup=new WebInspector.ConsoleGroup(this._currentGroup,viewMessage);},_createViewMessage:function(message)
{var nestingLevel=this._currentGroup.nestingLevel();switch(message.type){case WebInspector.ConsoleMessage.MessageType.Command:return new WebInspector.ConsoleCommand(message,nestingLevel);case WebInspector.ConsoleMessage.MessageType.Result:return new WebInspector.ConsoleCommandResult(message,this._linkifier,nestingLevel);case WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed:case WebInspector.ConsoleMessage.MessageType.StartGroup:return new WebInspector.ConsoleGroupViewMessage(message,this._linkifier,nestingLevel);default:return new WebInspector.ConsoleViewMessage(message,this._linkifier,nestingLevel);}},_consoleCleared:function()
{this._clearCurrentSearchResultHighlight();this._consoleMessages=[];this._scrolledToBottom=true;this._updateMessageList();if(this._searchRegex)
this._searchableView.updateSearchMatchesCount(0);this._linkifier.reset();},_handleContextMenuEvent:function(event)
{if(event.target.enclosingNodeOrSelfWithNodeName("a"))
return;var contextMenu=new WebInspector.ContextMenu(event);function monitoringXHRItemAction()
{WebInspector.settings.monitoringXHREnabled.set(!WebInspector.settings.monitoringXHREnabled.get());}
contextMenu.appendCheckboxItem(WebInspector.UIString("Log XMLHttpRequests"),monitoringXHRItemAction,WebInspector.settings.monitoringXHREnabled.get());function preserveLogItemAction()
{WebInspector.settings.preserveConsoleLog.set(!WebInspector.settings.preserveConsoleLog.get());}
contextMenu.appendCheckboxItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Preserve log upon navigation":"Preserve Log upon Navigation"),preserveLogItemAction,WebInspector.settings.preserveConsoleLog.get());var sourceElement=event.target.enclosingNodeOrSelfWithClass("console-message-wrapper");var consoleMessage=sourceElement?sourceElement.message.consoleMessage():null;var filterSubMenu=contextMenu.appendSubMenuItem(WebInspector.UIString("Filter"));if(consoleMessage&&consoleMessage.url){var menuTitle=WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Hide messages from %s":"Hide Messages from %s",new WebInspector.ParsedURL(consoleMessage.url).displayName);filterSubMenu.appendItem(menuTitle,this._filter.addMessageURLFilter.bind(this._filter,consoleMessage.url));}
filterSubMenu.appendSeparator();var unhideAll=filterSubMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Unhide all":"Unhide All"),this._filter.removeMessageURLFilter.bind(this._filter));filterSubMenu.appendSeparator();var hasFilters=false;for(var url in this._filter.messageURLFilters){filterSubMenu.appendCheckboxItem(String.sprintf("%s (%d)",new WebInspector.ParsedURL(url).displayName,this._urlToMessageCount[url]),this._filter.removeMessageURLFilter.bind(this._filter,url),true);hasFilters=true;}
filterSubMenu.setEnabled(hasFilters||(consoleMessage&&consoleMessage.url));unhideAll.setEnabled(hasFilters);contextMenu.appendSeparator();contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Clear console":"Clear Console"),this._requestClearMessages.bind(this));var request=consoleMessage?consoleMessage.request:null;if(request&&request.type===WebInspector.resourceTypes.XHR){contextMenu.appendSeparator();contextMenu.appendItem(WebInspector.UIString("Replay XHR"),NetworkAgent.replayXHR.bind(null,request.requestId));}
contextMenu.show();},_tryToCollapseMessages:function(lastMessage,viewMessage)
{if(!WebInspector.settings.consoleTimestampsEnabled.get()&&viewMessage&&!lastMessage.consoleMessage().isGroupMessage()&&lastMessage.consoleMessage().isEqual(viewMessage.consoleMessage())){viewMessage.incrementRepeatCount();return true;}
return false;},_updateMessageList:function()
{this._topGroup=WebInspector.ConsoleGroup.createTopGroup();this._currentGroup=this._topGroup;this._searchResults=[];this._hiddenByFilterCount=0;for(var i=0;i<this._visibleViewMessages.length;++i){this._visibleViewMessages[i].resetCloseGroupDecorationCount();this._visibleViewMessages[i].resetIncrementRepeatCount();}
this._visibleViewMessages=[];for(var i=0;i<this._consoleMessages.length;++i){var viewMessage=this._consoleMessages[i];if(this._tryToCollapseMessages(viewMessage,this._visibleViewMessages.peekLast()))
continue;if(this._filter.shouldBeVisible(viewMessage))
this._showConsoleMessage(viewMessage);else
this._hiddenByFilterCount++;}
this._updateFilterStatus();this._viewport.invalidate();},_monitoringXHREnabledSettingChanged:function(event)
{var enabled=(event.data);WebInspector.targetManager.targets().forEach(function(target){target.consoleAgent().setMonitoringXHREnabled(enabled);});},_messagesClicked:function(event)
{if(!this._prompt.isCaretInsidePrompt()&&window.getSelection().isCollapsed)
this._prompt.moveCaretToEndOfPrompt();var groupMessage=event.target.enclosingNodeOrSelfWithClass("console-group-title");if(!groupMessage)
return;var consoleGroupViewMessage=groupMessage.parentElement.message;consoleGroupViewMessage.setCollapsed(!consoleGroupViewMessage.collapsed());this._updateMessageList();},_registerShortcuts:function()
{this._shortcuts={};var shortcut=WebInspector.KeyboardShortcut;var section=WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));var shortcutL=shortcut.makeDescriptor("l",WebInspector.KeyboardShortcut.Modifiers.Ctrl);this._shortcuts[shortcutL.key]=this._requestClearMessages.bind(this);var keys=[shortcutL];if(WebInspector.isMac()){var shortcutK=shortcut.makeDescriptor("k",WebInspector.KeyboardShortcut.Modifiers.Meta);this._shortcuts[shortcutK.key]=this._requestClearMessages.bind(this);keys.unshift(shortcutK);}
section.addAlternateKeys(keys,WebInspector.UIString("Clear console"));section.addKey(shortcut.makeDescriptor(shortcut.Keys.Tab),WebInspector.UIString("Autocomplete common prefix"));section.addKey(shortcut.makeDescriptor(shortcut.Keys.Right),WebInspector.UIString("Accept suggestion"));var shortcutU=shortcut.makeDescriptor("u",WebInspector.KeyboardShortcut.Modifiers.Ctrl);this._shortcuts[shortcutU.key]=this._clearPromptBackwards.bind(this);section.addAlternateKeys([shortcutU],WebInspector.UIString("Clear console prompt"));keys=[shortcut.makeDescriptor(shortcut.Keys.Down),shortcut.makeDescriptor(shortcut.Keys.Up)];section.addRelatedKeys(keys,WebInspector.UIString("Next/previous line"));if(WebInspector.isMac()){keys=[shortcut.makeDescriptor("N",shortcut.Modifiers.Alt),shortcut.makeDescriptor("P",shortcut.Modifiers.Alt)];section.addRelatedKeys(keys,WebInspector.UIString("Next/previous command"));}
section.addKey(shortcut.makeDescriptor(shortcut.Keys.Enter),WebInspector.UIString("Execute command"));},_clearPromptBackwards:function()
{this._prompt.text="";},_requestClearMessages:function()
{WebInspector.console.requestClearMessages();},_promptKeyDown:function(event)
{if(isEnterKey(event)){this._enterKeyPressed(event);return;}
var shortcut=WebInspector.KeyboardShortcut.makeKeyFromEvent(event);var handler=this._shortcuts[shortcut];if(handler){handler();event.preventDefault();}},_enterKeyPressed:function(event)
{if(event.altKey||event.ctrlKey||event.shiftKey)
return;event.consume(true);this._prompt.clearAutoComplete(true);var str=this._prompt.text;if(!str.length)
return;this._appendCommand(str,true);},_printResult:function(result,wasThrown,originatingConsoleMessage)
{if(!result)
return;var target=result.target();function addMessage(url,lineNumber,columnNumber)
{var level=wasThrown?WebInspector.ConsoleMessage.MessageLevel.Error:WebInspector.ConsoleMessage.MessageLevel.Log;var message=new WebInspector.ConsoleMessage(target,WebInspector.ConsoleMessage.MessageSource.JS,level,"",WebInspector.ConsoleMessage.MessageType.Result,url,lineNumber,columnNumber,undefined,[result]);message.setOriginatingMessage(originatingConsoleMessage);target.consoleModel.addMessage(message);}
if(result.type!=="function"){addMessage();return;}
result.functionDetails(didGetDetails);function didGetDetails(response)
{if(!response){addMessage();return;}
var url;var lineNumber;var columnNumber;var script=target.debuggerModel.scriptForId(response.location.scriptId);if(script&&script.sourceURL){url=script.sourceURL;lineNumber=response.location.lineNumber+1;columnNumber=response.location.columnNumber+1;}
addMessage(url,lineNumber,columnNumber);}},_appendCommand:function(text,useCommandLineAPI)
{this._prompt.text="";var currentExecutionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);if(currentExecutionContext)
WebInspector.ConsoleModel.evaluateCommandInConsole(currentExecutionContext,text,useCommandLineAPI);},_commandEvaluated:function(event)
{var data=(event.data);this._prompt.pushHistoryItem(data.text);WebInspector.settings.consoleHistory.set(this._prompt.historyData.slice(-30));this._printResult(data.result,data.wasThrown,data.commandMessage);},elementsToRestoreScrollPositionsFor:function()
{return[this._messagesElement];},searchCanceled:function()
{this._clearCurrentSearchResultHighlight();delete this._searchResults;delete this._searchRegex;},performSearch:function(query,shouldJump,jumpBackwards)
{this.searchCanceled();this._searchableView.updateSearchMatchesCount(0);this._searchRegex=createPlainTextSearchRegex(query,"gi");this._searchResults=[];for(var i=0;i<this._visibleViewMessages.length;i++){if(this._visibleViewMessages[i].matchesRegex(this._searchRegex))
this._searchResults.push(this._visibleViewMessages[i]);}
this._searchableView.updateSearchMatchesCount(this._searchResults.length);this._currentSearchResultIndex=-1;if(shouldJump&&this._searchResults.length)
this._jumpToSearchResult(jumpBackwards?-1:0);},jumpToNextSearchResult:function()
{if(!this._searchResults||!this._searchResults.length)
return;this._jumpToSearchResult(this._currentSearchResultIndex+1);},jumpToPreviousSearchResult:function()
{if(!this._searchResults||!this._searchResults.length)
return;this._jumpToSearchResult(this._currentSearchResultIndex-1);},_clearCurrentSearchResultHighlight:function()
{if(!this._searchResults)
return;var highlightedViewMessage=this._searchResults[this._currentSearchResultIndex];if(highlightedViewMessage)
highlightedViewMessage.clearHighlight();this._currentSearchResultIndex=-1;},_jumpToSearchResult:function(index)
{index=mod(index,this._searchResults.length);this._clearCurrentSearchResultHighlight();this._currentSearchResultIndex=index;this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);this._searchResults[index].highlightSearchResults(this._searchRegex);},__proto__:WebInspector.VBox.prototype}
WebInspector.ConsoleViewFilter=function(view)
{this._view=view;this._messageURLFilters=WebInspector.settings.messageURLFilters.get();this._filterChanged=this.dispatchEventToListeners.bind(this,WebInspector.ConsoleViewFilter.Events.FilterChanged);};WebInspector.ConsoleViewFilter.Events={FilterChanged:"FilterChanged"};WebInspector.ConsoleViewFilter.prototype={addFilters:function(filterBar)
{this._textFilterUI=new WebInspector.TextFilterUI(true);this._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged,this._textFilterChanged,this);filterBar.addFilter(this._textFilterUI);var levels=[{name:"error",label:WebInspector.UIString("Errors")},{name:"warning",label:WebInspector.UIString("Warnings")},{name:"info",label:WebInspector.UIString("Info")},{name:"log",label:WebInspector.UIString("Logs")},{name:"debug",label:WebInspector.UIString("Debug")}];this._levelFilterUI=new WebInspector.NamedBitSetFilterUI(levels,WebInspector.settings.messageLevelFilters);this._levelFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged,this._filterChanged,this);filterBar.addFilter(this._levelFilterUI);},_textFilterChanged:function(event)
{this._filterRegex=this._textFilterUI.regex();this._filterChanged();},addMessageURLFilter:function(url)
{this._messageURLFilters[url]=true;WebInspector.settings.messageURLFilters.set(this._messageURLFilters);this._filterChanged();},removeMessageURLFilter:function(url)
{if(!url)
this._messageURLFilters={};else
delete this._messageURLFilters[url];WebInspector.settings.messageURLFilters.set(this._messageURLFilters);this._filterChanged();},get messageURLFilters()
{return this._messageURLFilters;},shouldBeVisible:function(viewMessage)
{var message=viewMessage.consoleMessage();var executionContext=WebInspector.context.flavor(WebInspector.ExecutionContext);if(!message.target())
return true;if(!this._view._showAllMessagesCheckbox.checked()&&executionContext&&(message.target()!==executionContext.target()||message.executionContextId!==executionContext.id))
return false;if(viewMessage.consoleMessage().isGroupMessage())
return true;if(message.type===WebInspector.ConsoleMessage.MessageType.Result||message.type===WebInspector.ConsoleMessage.MessageType.Command)
return true;if(message.url&&this._messageURLFilters[message.url])
return false;if(message.level&&!this._levelFilterUI.accept(message.level))
return false;if(this._filterRegex){this._filterRegex.lastIndex=0;if(!viewMessage.matchesRegex(this._filterRegex))
return false;}
return true;},reset:function()
{this._messageURLFilters={};WebInspector.settings.messageURLFilters.set(this._messageURLFilters);WebInspector.settings.messageLevelFilters.set({});this._view._showAllMessagesCheckbox.inputElement.checked=true;this._textFilterUI.setValue("");this._filterChanged();},__proto__:WebInspector.Object.prototype};WebInspector.ConsoleCommand=function(message,nestingLevel)
{WebInspector.ConsoleViewMessage.call(this,message,null,nestingLevel);}
WebInspector.ConsoleCommand.prototype={clearHighlight:function()
{var highlightedMessage=this._formattedCommand;delete this._formattedCommand;this._formatCommand();this._element.replaceChild(this._formattedCommand,highlightedMessage);},highlightSearchResults:function(regexObject)
{regexObject.lastIndex=0;var match=regexObject.exec(this.text);var matchRanges=[];while(match){matchRanges.push(new WebInspector.SourceRange(match.index,match[0].length));match=regexObject.exec(this.text);}
WebInspector.highlightSearchResults(this._formattedCommand,matchRanges);this._element.scrollIntoViewIfNeeded();},matchesRegex:function(regexObject)
{regexObject.lastIndex=0;return regexObject.test(this.text);},contentElement:function()
{if(!this._element){this._element=document.createElement("div");this._element.message=this;this._element.className="console-user-command";this._formatCommand();this._element.appendChild(this._formattedCommand);}
return this._element;},_formatCommand:function()
{this._formattedCommand=document.createElement("span");this._formattedCommand.className="console-message-text source-code";this._formattedCommand.textContent=this.text;},__proto__:WebInspector.ConsoleViewMessage.prototype}
WebInspector.ConsoleCommandResult=function(message,linkifier,nestingLevel)
{WebInspector.ConsoleViewMessage.call(this,message,linkifier,nestingLevel);}
WebInspector.ConsoleCommandResult.prototype={useArrayPreviewInFormatter:function(array)
{return false;},contentElement:function()
{var element=WebInspector.ConsoleViewMessage.prototype.contentElement.call(this);element.classList.add("console-user-command-result");return element;},__proto__:WebInspector.ConsoleViewMessage.prototype}
WebInspector.ConsoleGroup=function(parentGroup,groupMessage)
{this._parentGroup=parentGroup;this._nestingLevel=parentGroup?parentGroup.nestingLevel()+1:0;this._messagesHidden=groupMessage&&groupMessage.collapsed()||this._parentGroup&&this._parentGroup.messagesHidden();}
WebInspector.ConsoleGroup.createTopGroup=function()
{return new WebInspector.ConsoleGroup(null,null);}
WebInspector.ConsoleGroup.prototype={messagesHidden:function()
{return this._messagesHidden;},nestingLevel:function()
{return this._nestingLevel;},parentGroup:function()
{return this._parentGroup||this;},}
WebInspector.ConsoleView.ShowConsoleActionDelegate=function()
{}
WebInspector.ConsoleView.ShowConsoleActionDelegate.prototype={handleAction:function()
{WebInspector.console.show();return true;}};WebInspector.ConsolePanel=function()
{WebInspector.Panel.call(this,"console");this._view=WebInspector.ConsolePanel._view();}
WebInspector.ConsolePanel._view=function()
{if(!WebInspector.ConsolePanel._consoleView)
WebInspector.ConsolePanel._consoleView=new WebInspector.ConsoleView(!Capabilities.isMainFrontend);return WebInspector.ConsolePanel._consoleView;}
WebInspector.ConsolePanel.prototype={defaultFocusedElement:function()
{return this._view.defaultFocusedElement();},wasShown:function()
{WebInspector.Panel.prototype.wasShown.call(this);this._view.show(this.element);},willHide:function()
{WebInspector.Panel.prototype.willHide.call(this);if(WebInspector.ConsolePanel.WrapperView._instance)
WebInspector.ConsolePanel.WrapperView._instance._showViewInWrapper();},__proto__:WebInspector.Panel.prototype}
WebInspector.ConsolePanel.WrapperView=function()
{WebInspector.VBox.call(this);this.element.classList.add("console-view-wrapper");WebInspector.ConsolePanel.WrapperView._instance=this;this._view=WebInspector.ConsolePanel._view();this.wasShown();}
WebInspector.ConsolePanel.WrapperView.prototype={wasShown:function()
{if(!WebInspector.inspectorView.currentPanel()||WebInspector.inspectorView.currentPanel().name!=="console")
this._showViewInWrapper();},defaultFocusedElement:function()
{return this._view.defaultFocusedElement();},focus:function()
{this._view.focus();},_showViewInWrapper:function()
{this._view.show(this.element);},__proto__:WebInspector.VBox.prototype}
WebInspector.ConsolePanel.ConsoleRevealer=function()
{}
WebInspector.ConsolePanel.ConsoleRevealer.prototype={reveal:function(object)
{if(!(object instanceof WebInspector.ConsoleModel))
return;var consoleView=WebInspector.ConsolePanel._view();if(consoleView.isShowing()){consoleView.focus();return;}
WebInspector.inspectorView.showViewInDrawer("console");}}