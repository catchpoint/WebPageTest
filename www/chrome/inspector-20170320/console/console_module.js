Console.ConsoleContextSelector=class{constructor(selectElement){this._selectElement=selectElement;this._optionByExecutionContext=new Map();SDK.targetManager.observeTargets(this);SDK.targetManager.addModelListener(SDK.RuntimeModel,SDK.RuntimeModel.Events.ExecutionContextCreated,this._onExecutionContextCreated,this);SDK.targetManager.addModelListener(SDK.RuntimeModel,SDK.RuntimeModel.Events.ExecutionContextChanged,this._onExecutionContextChanged,this);SDK.targetManager.addModelListener(SDK.RuntimeModel,SDK.RuntimeModel.Events.ExecutionContextDestroyed,this._onExecutionContextDestroyed,this);this._selectElement.addEventListener('change',this._executionContextChanged.bind(this),false);UI.context.addFlavorChangeListener(SDK.ExecutionContext,this._executionContextChangedExternally,this);}
_titleFor(executionContext){var target=executionContext.target();var depth=0;var label=executionContext.label()?target.decorateLabel(executionContext.label()):'';if(!executionContext.isDefault)
depth++;if(executionContext.frameId){var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(target);var frame=resourceTreeModel&&resourceTreeModel.frameForId(executionContext.frameId);if(frame){label=label||frame.displayName();while(frame.parentFrame){depth++;frame=frame.parentFrame;}}}
label=label||executionContext.origin;var targetDepth=0;while(target.parentTarget()){if(target.parentTarget().hasJSCapability()){targetDepth++;}else{targetDepth=0;break;}
target=target.parentTarget();}
depth+=targetDepth;var prefix=new Array(4*depth+1).join('\u00a0');var maxLength=50;return(prefix+label).trimMiddle(maxLength);}
_executionContextCreated(executionContext){if(!executionContext.target().hasJSCapability())
return;var newOption=createElement('option');newOption.__executionContext=executionContext;newOption.text=this._titleFor(executionContext);this._optionByExecutionContext.set(executionContext,newOption);var options=this._selectElement.options;var contexts=Array.prototype.map.call(options,mapping);var index=contexts.lowerBound(executionContext,executionContext.runtimeModel.executionContextComparator());this._selectElement.insertBefore(newOption,options[index]);if(executionContext===UI.context.flavor(SDK.ExecutionContext))
this._select(newOption);function mapping(option){return option.__executionContext;}}
_onExecutionContextCreated(event){var executionContext=(event.data);this._executionContextCreated(executionContext);this._updateSelectionWarning();}
_onExecutionContextChanged(event){var executionContext=(event.data);var option=this._optionByExecutionContext.get(executionContext);if(option)
option.text=this._titleFor(executionContext);this._updateSelectionWarning();}
_executionContextDestroyed(executionContext){var option=this._optionByExecutionContext.remove(executionContext);option.remove();}
_onExecutionContextDestroyed(event){var executionContext=(event.data);this._executionContextDestroyed(executionContext);this._updateSelectionWarning();}
_executionContextChangedExternally(event){var executionContext=(event.data);if(!executionContext)
return;var options=this._selectElement.options;for(var i=0;i<options.length;++i){if(options[i].__executionContext===executionContext)
this._select(options[i]);}}
_executionContextChanged(){var option=this._selectedOption();var newContext=option?option.__executionContext:null;UI.context.setFlavor(SDK.ExecutionContext,newContext);this._updateSelectionWarning();}
_updateSelectionWarning(){var executionContext=UI.context.flavor(SDK.ExecutionContext);this._selectElement.parentElement.classList.toggle('warning',!this._isTopContext(executionContext)&&this._hasTopContext());}
_isTopContext(executionContext){if(!executionContext||!executionContext.isDefault)
return false;var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(executionContext.target());var frame=executionContext.frameId&&resourceTreeModel&&resourceTreeModel.frameForId(executionContext.frameId);if(!frame)
return false;return frame.isMainFrame();}
_hasTopContext(){var options=this._selectElement.options;for(var i=0;i<options.length;i++){if(this._isTopContext(options[i].__executionContext))
return true;}
return false;}
targetAdded(target){target.runtimeModel.executionContexts().forEach(this._executionContextCreated,this);}
targetRemoved(target){var executionContexts=this._optionByExecutionContext.keysArray();for(var i=0;i<executionContexts.length;++i){if(executionContexts[i].target()===target)
this._executionContextDestroyed(executionContexts[i]);}}
_select(option){this._selectElement.selectedIndex=Array.prototype.indexOf.call((this._selectElement),option);this._updateSelectionWarning();}
_selectedOption(){if(this._selectElement.selectedIndex>=0)
return this._selectElement[this._selectElement.selectedIndex];return null;}};;Console.ConsoleViewport=class{constructor(provider){this.element=createElement('div');this.element.style.overflow='auto';this._topGapElement=this.element.createChild('div');this._topGapElement.style.height='0px';this._topGapElement.style.color='transparent';this._contentElement=this.element.createChild('div');this._bottomGapElement=this.element.createChild('div');this._bottomGapElement.style.height='0px';this._bottomGapElement.style.color='transparent';this._topGapElement.textContent='\uFEFF';this._bottomGapElement.textContent='\uFEFF';this._provider=provider;this.element.addEventListener('scroll',this._onScroll.bind(this),false);this.element.addEventListener('copy',this._onCopy.bind(this),false);this.element.addEventListener('dragstart',this._onDragStart.bind(this),false);this._firstActiveIndex=0;this._lastActiveIndex=-1;this._renderedItems=[];this._anchorSelection=null;this._headSelection=null;this._itemCount=0;this._observer=new MutationObserver(this.refresh.bind(this));this._observerConfig={childList:true,subtree:true};}
stickToBottom(){return this._stickToBottom;}
setStickToBottom(value){this._stickToBottom=value;if(this._stickToBottom)
this._observer.observe(this._contentElement,this._observerConfig);else
this._observer.disconnect();}
_onCopy(event){var text=this._selectedText();if(!text)
return;event.preventDefault();event.clipboardData.setData('text/plain',text);}
_onDragStart(event){var text=this._selectedText();if(!text)
return false;event.dataTransfer.clearData();event.dataTransfer.setData('text/plain',text);event.dataTransfer.effectAllowed='copy';return true;}
contentElement(){return this._contentElement;}
invalidate(){delete this._cumulativeHeights;delete this._cachedProviderElements;this._itemCount=this._provider.itemCount();this.refresh();}
_providerElement(index){if(!this._cachedProviderElements)
this._cachedProviderElements=new Array(this._itemCount);var element=this._cachedProviderElements[index];if(!element){element=this._provider.itemElement(index);this._cachedProviderElements[index]=element;}
return element;}
_rebuildCumulativeHeightsIfNeeded(){if(this._cumulativeHeights)
return;if(!this._itemCount)
return;var firstActiveIndex=this._firstActiveIndex;var lastActiveIndex=this._lastActiveIndex;var height=0;this._cumulativeHeights=new Int32Array(this._itemCount);for(var i=0;i<this._itemCount;++i){if(firstActiveIndex<=i&&i<=lastActiveIndex)
height+=this._renderedItems[i-firstActiveIndex].element().offsetHeight;else
height+=this._provider.fastHeight(i);this._cumulativeHeights[i]=height;}}
_cachedItemHeight(index){return index===0?this._cumulativeHeights[0]:this._cumulativeHeights[index]-this._cumulativeHeights[index-1];}
_isSelectionBackwards(selection){if(!selection||!selection.rangeCount)
return false;var range=document.createRange();range.setStart(selection.anchorNode,selection.anchorOffset);range.setEnd(selection.focusNode,selection.focusOffset);return range.collapsed;}
_createSelectionModel(itemIndex,node,offset){return{item:itemIndex,node:node,offset:offset};}
_updateSelectionModel(selection){var range=selection&&selection.rangeCount?selection.getRangeAt(0):null;if(!range||selection.isCollapsed||!this.element.hasSelection()){this._headSelection=null;this._anchorSelection=null;return false;}
var firstSelected=Number.MAX_VALUE;var lastSelected=-1;var hasVisibleSelection=false;for(var i=0;i<this._renderedItems.length;++i){if(range.intersectsNode(this._renderedItems[i].element())){var index=i+this._firstActiveIndex;firstSelected=Math.min(firstSelected,index);lastSelected=Math.max(lastSelected,index);hasVisibleSelection=true;}}
if(hasVisibleSelection){firstSelected=this._createSelectionModel(firstSelected,(range.startContainer),range.startOffset);lastSelected=this._createSelectionModel(lastSelected,(range.endContainer),range.endOffset);}
var topOverlap=range.intersectsNode(this._topGapElement)&&this._topGapElement._active;var bottomOverlap=range.intersectsNode(this._bottomGapElement)&&this._bottomGapElement._active;if(!topOverlap&&!bottomOverlap&&!hasVisibleSelection){this._headSelection=null;this._anchorSelection=null;return false;}
if(!this._anchorSelection||!this._headSelection){this._anchorSelection=this._createSelectionModel(0,this.element,0);this._headSelection=this._createSelectionModel(this._itemCount-1,this.element,this.element.children.length);this._selectionIsBackward=false;}
var isBackward=this._isSelectionBackwards(selection);var startSelection=this._selectionIsBackward?this._headSelection:this._anchorSelection;var endSelection=this._selectionIsBackward?this._anchorSelection:this._headSelection;if(topOverlap&&bottomOverlap&&hasVisibleSelection){firstSelected=firstSelected.item<startSelection.item?firstSelected:startSelection;lastSelected=lastSelected.item>endSelection.item?lastSelected:endSelection;}else if(!hasVisibleSelection){firstSelected=startSelection;lastSelected=endSelection;}else if(topOverlap){firstSelected=isBackward?this._headSelection:this._anchorSelection;}else if(bottomOverlap){lastSelected=isBackward?this._anchorSelection:this._headSelection;}
if(isBackward){this._anchorSelection=lastSelected;this._headSelection=firstSelected;}else{this._anchorSelection=firstSelected;this._headSelection=lastSelected;}
this._selectionIsBackward=isBackward;return true;}
_restoreSelection(selection){var anchorElement=null;var anchorOffset;if(this._firstActiveIndex<=this._anchorSelection.item&&this._anchorSelection.item<=this._lastActiveIndex){anchorElement=this._anchorSelection.node;anchorOffset=this._anchorSelection.offset;}else{if(this._anchorSelection.item<this._firstActiveIndex)
anchorElement=this._topGapElement;else if(this._anchorSelection.item>this._lastActiveIndex)
anchorElement=this._bottomGapElement;anchorOffset=this._selectionIsBackward?1:0;}
var headElement=null;var headOffset;if(this._firstActiveIndex<=this._headSelection.item&&this._headSelection.item<=this._lastActiveIndex){headElement=this._headSelection.node;headOffset=this._headSelection.offset;}else{if(this._headSelection.item<this._firstActiveIndex)
headElement=this._topGapElement;else if(this._headSelection.item>this._lastActiveIndex)
headElement=this._bottomGapElement;headOffset=this._selectionIsBackward?0:1;}
selection.setBaseAndExtent(anchorElement,anchorOffset,headElement,headOffset);}
refresh(){this._observer.disconnect();this._innerRefresh();if(this._stickToBottom)
this._observer.observe(this._contentElement,this._observerConfig);}
_innerRefresh(){if(!this._visibleHeight())
return;if(!this._itemCount){for(var i=0;i<this._renderedItems.length;++i)
this._renderedItems[i].willHide();this._renderedItems=[];this._contentElement.removeChildren();this._topGapElement.style.height='0px';this._bottomGapElement.style.height='0px';this._firstActiveIndex=-1;this._lastActiveIndex=-1;return;}
var selection=this.element.getComponentSelection();var shouldRestoreSelection=this._updateSelectionModel(selection);var visibleFrom=this.element.scrollTop;var visibleHeight=this._visibleHeight();for(var i=0;i<this._renderedItems.length;++i){if(this._cumulativeHeights&&Math.abs(this._cachedItemHeight(this._firstActiveIndex+i)-this._renderedItems[i].element().offsetHeight)>1)
delete this._cumulativeHeights;}
this._rebuildCumulativeHeightsIfNeeded();var activeHeight=visibleHeight*2;if(this._stickToBottom){this._firstActiveIndex=Math.max(this._itemCount-Math.ceil(activeHeight/this._provider.minimumRowHeight()),0);this._lastActiveIndex=this._itemCount-1;}else{this._firstActiveIndex=Math.max(Array.prototype.lowerBound.call(this._cumulativeHeights,visibleFrom+1-(activeHeight-visibleHeight)/2),0);this._lastActiveIndex=this._firstActiveIndex+Math.ceil(activeHeight/this._provider.minimumRowHeight())-1;this._lastActiveIndex=Math.min(this._lastActiveIndex,this._itemCount-1);}
var topGapHeight=this._cumulativeHeights[this._firstActiveIndex-1]||0;var bottomGapHeight=this._cumulativeHeights[this._cumulativeHeights.length-1]-this._cumulativeHeights[this._lastActiveIndex];function prepare(){this._topGapElement.style.height=topGapHeight+'px';this._bottomGapElement.style.height=bottomGapHeight+'px';this._topGapElement._active=!!topGapHeight;this._bottomGapElement._active=!!bottomGapHeight;this._contentElement.style.setProperty('height','10000000px');}
this._partialViewportUpdate(prepare.bind(this));this._contentElement.style.removeProperty('height');if(shouldRestoreSelection)
this._restoreSelection(selection);if(this._stickToBottom)
this.element.scrollTop=10000000;}
_partialViewportUpdate(prepare){var itemsToRender=new Set();for(var i=this._firstActiveIndex;i<=this._lastActiveIndex;++i)
itemsToRender.add(this._providerElement(i));var willBeHidden=this._renderedItems.filter(item=>!itemsToRender.has(item));for(var i=0;i<willBeHidden.length;++i)
willBeHidden[i].willHide();prepare();for(var i=0;i<willBeHidden.length;++i)
willBeHidden[i].element().remove();var wasShown=[];var anchor=this._contentElement.firstChild;for(var viewportElement of itemsToRender){var element=viewportElement.element();if(element!==anchor){var shouldCallWasShown=!element.parentElement;if(shouldCallWasShown)
wasShown.push(viewportElement);this._contentElement.insertBefore(element,anchor);}else{anchor=anchor.nextSibling;}}
for(var i=0;i<wasShown.length;++i)
wasShown[i].wasShown();this._renderedItems=Array.from(itemsToRender);}
_selectedText(){this._updateSelectionModel(this.element.getComponentSelection());if(!this._headSelection||!this._anchorSelection)
return null;var startSelection=null;var endSelection=null;if(this._selectionIsBackward){startSelection=this._headSelection;endSelection=this._anchorSelection;}else{startSelection=this._anchorSelection;endSelection=this._headSelection;}
var textLines=[];for(var i=startSelection.item;i<=endSelection.item;++i)
textLines.push(this._providerElement(i).element().deepTextContent());var endSelectionElement=this._providerElement(endSelection.item).element();if(endSelection.node&&endSelection.node.isSelfOrDescendant(endSelectionElement)){var itemTextOffset=this._textOffsetInNode(endSelectionElement,endSelection.node,endSelection.offset);textLines[textLines.length-1]=textLines.peekLast().substring(0,itemTextOffset);}
var startSelectionElement=this._providerElement(startSelection.item).element();if(startSelection.node&&startSelection.node.isSelfOrDescendant(startSelectionElement)){var itemTextOffset=this._textOffsetInNode(startSelectionElement,startSelection.node,startSelection.offset);textLines[0]=textLines[0].substring(itemTextOffset);}
return textLines.join('\n');}
_textOffsetInNode(itemElement,container,offset){if(container.nodeType!==Node.TEXT_NODE){if(offset<container.childNodes.length){container=(container.childNodes.item(offset));offset=0;}else{offset=container.textContent.length;}}
var chars=0;var node=itemElement;while((node=node.traverseNextTextNode(itemElement))&&!node.isSelfOrDescendant(container))
chars+=node.textContent.length;return chars+offset;}
_onScroll(event){this.refresh();}
firstVisibleIndex(){var firstVisibleIndex=Math.max(Array.prototype.lowerBound.call(this._cumulativeHeights,this.element.scrollTop+1),0);return Math.max(firstVisibleIndex,this._firstActiveIndex);}
lastVisibleIndex(){var lastVisibleIndex;if(this._stickToBottom){lastVisibleIndex=this._itemCount-1;}else{lastVisibleIndex=this.firstVisibleIndex()+Math.ceil(this._visibleHeight()/this._provider.minimumRowHeight())-1;}
return Math.min(lastVisibleIndex,this._lastActiveIndex);}
renderedElementAt(index){if(index<this._firstActiveIndex)
return null;if(index>this._lastActiveIndex)
return null;return this._renderedItems[index-this._firstActiveIndex].element();}
scrollItemIntoView(index,makeLast){var firstVisibleIndex=this.firstVisibleIndex();var lastVisibleIndex=this.lastVisibleIndex();if(index>firstVisibleIndex&&index<lastVisibleIndex)
return;if(makeLast)
this.forceScrollItemToBeLast(index);else if(index<=firstVisibleIndex)
this.forceScrollItemToBeFirst(index);else if(index>=lastVisibleIndex)
this.forceScrollItemToBeLast(index);}
forceScrollItemToBeFirst(index){this.setStickToBottom(false);this._rebuildCumulativeHeightsIfNeeded();this.element.scrollTop=index>0?this._cumulativeHeights[index-1]:0;if(this.element.isScrolledToBottom())
this.setStickToBottom(true);this.refresh();}
forceScrollItemToBeLast(index){this.setStickToBottom(false);this._rebuildCumulativeHeightsIfNeeded();this.element.scrollTop=this._cumulativeHeights[index]-this._visibleHeight();if(this.element.isScrolledToBottom())
this.setStickToBottom(true);this.refresh();}
_visibleHeight(){return this.element.offsetHeight;}};Console.ConsoleViewportProvider=function(){};Console.ConsoleViewportProvider.prototype={fastHeight(index){return 0;},itemCount(){return 0;},minimumRowHeight(){return 0;},itemElement(index){return null;}};Console.ConsoleViewportElement=function(){};Console.ConsoleViewportElement.prototype={willHide(){},wasShown(){},element(){},};;Console.ConsoleViewMessage=class{constructor(consoleMessage,linkifier,nestingLevel){this._message=consoleMessage;this._linkifier=linkifier;this._repeatCount=1;this._closeGroupDecorationCount=0;this._nestingLevel=nestingLevel;this._dataGrid=null;this._previewFormatter=new ObjectUI.RemoteObjectPreviewFormatter();this._searchRegex=null;this._messageLevelIcon=null;}
_target(){return this.consoleMessage().target();}
element(){return this.toMessageElement();}
wasShown(){if(this._dataGrid)
this._dataGrid.updateWidths();this._isVisible=true;}
onResize(){if(!this._isVisible)
return;if(this._dataGrid)
this._dataGrid.onResize();}
willHide(){this._isVisible=false;this._cachedHeight=this.contentElement().offsetHeight;}
fastHeight(){if(this._cachedHeight)
return this._cachedHeight;const defaultConsoleRowHeight=19;if(this._message.type===ConsoleModel.ConsoleMessage.MessageType.Table){var table=this._message.parameters[0];if(table&&table.preview)
return defaultConsoleRowHeight*table.preview.properties.length;}
return defaultConsoleRowHeight;}
consoleMessage(){return this._message;}
_buildTableMessage(consoleMessage){var formattedMessage=createElement('span');UI.appendStyle(formattedMessage,'object_ui/objectValue.css');formattedMessage.className='source-code';var anchorElement=this._buildMessageAnchor(consoleMessage);if(anchorElement)
formattedMessage.appendChild(anchorElement);var table=consoleMessage.parameters&&consoleMessage.parameters.length?consoleMessage.parameters[0]:null;if(table)
table=this._parameterToRemoteObject(table,this._target());if(!table||!table.preview)
return formattedMessage;var columnNames=[];var preview=table.preview;var rows=[];for(var i=0;i<preview.properties.length;++i){var rowProperty=preview.properties[i];var rowPreview=rowProperty.valuePreview;if(!rowPreview)
continue;var rowValue={};const maxColumnsToRender=20;for(var j=0;j<rowPreview.properties.length;++j){var cellProperty=rowPreview.properties[j];var columnRendered=columnNames.indexOf(cellProperty.name)!==-1;if(!columnRendered){if(columnNames.length===maxColumnsToRender)
continue;columnRendered=true;columnNames.push(cellProperty.name);}
if(columnRendered){var cellElement=this._renderPropertyPreviewOrAccessor(table,[rowProperty,cellProperty]);cellElement.classList.add('console-message-nowrap-below');rowValue[cellProperty.name]=cellElement;}}
rows.push([rowProperty.name,rowValue]);}
var flatValues=[];for(var i=0;i<rows.length;++i){var rowName=rows[i][0];var rowValue=rows[i][1];flatValues.push(rowName);for(var j=0;j<columnNames.length;++j)
flatValues.push(rowValue[columnNames[j]]);}
columnNames.unshift(Common.UIString('(index)'));if(flatValues.length){this._dataGrid=DataGrid.SortableDataGrid.create(columnNames,flatValues);var formattedResult=createElementWithClass('span','console-message-text');var tableElement=formattedResult.createChild('div','console-message-formatted-table');var dataGridContainer=tableElement.createChild('span');tableElement.appendChild(this._formatParameter(table,true,false));dataGridContainer.appendChild(this._dataGrid.element);formattedMessage.appendChild(formattedResult);this._dataGrid.renderInline();}
return formattedMessage;}
_buildMessage(consoleMessage){var messageElement;var messageText=consoleMessage.messageText;if(consoleMessage.source===ConsoleModel.ConsoleMessage.MessageSource.ConsoleAPI){switch(consoleMessage.type){case ConsoleModel.ConsoleMessage.MessageType.Trace:messageElement=this._format(consoleMessage.parameters||['console.trace']);break;case ConsoleModel.ConsoleMessage.MessageType.Clear:messageElement=createElementWithClass('span','console-info');messageElement.textContent=Common.UIString('Console was cleared');break;case ConsoleModel.ConsoleMessage.MessageType.Assert:var args=[Common.UIString('Assertion failed:')];if(consoleMessage.parameters)
args=args.concat(consoleMessage.parameters);messageElement=this._format(args);break;case ConsoleModel.ConsoleMessage.MessageType.Dir:var obj=consoleMessage.parameters?consoleMessage.parameters[0]:undefined;var args=['%O',obj];messageElement=this._format(args);break;case ConsoleModel.ConsoleMessage.MessageType.Profile:case ConsoleModel.ConsoleMessage.MessageType.ProfileEnd:messageElement=this._format([messageText]);break;default:if(consoleMessage.parameters&&consoleMessage.parameters.length===1&&consoleMessage.parameters[0].type==='string')
messageElement=this._tryFormatAsError((consoleMessage.parameters[0].value));var args=consoleMessage.parameters||[messageText];messageElement=messageElement||this._format(args);}}else if(consoleMessage.source===ConsoleModel.ConsoleMessage.MessageSource.Network){if(consoleMessage.request){messageElement=createElement('span');if(consoleMessage.level===ConsoleModel.ConsoleMessage.MessageLevel.Error){messageElement.createTextChild(consoleMessage.request.requestMethod+' ');messageElement.appendChild(Components.Linkifier.linkifyRevealable(consoleMessage.request,consoleMessage.request.url(),consoleMessage.request.url()));if(consoleMessage.request.failed){messageElement.createTextChildren(' ',consoleMessage.request.localizedFailDescription);}else{messageElement.createTextChildren(' ',String(consoleMessage.request.statusCode),' (',consoleMessage.request.statusText,')');}}else{var fragment=Components.linkifyStringAsFragmentWithCustomLinkifier(messageText,linkifyRequest.bind(consoleMessage));messageElement.appendChild(fragment);}}else{messageElement=this._format([messageText]);}}else{if(consoleMessage.source===ConsoleModel.ConsoleMessage.MessageSource.Violation)
messageText=Common.UIString('[Violation] %s',messageText);else if(consoleMessage.source===ConsoleModel.ConsoleMessage.MessageSource.Intervention)
messageText=Common.UIString('[Intervention] %s',messageText);if(consoleMessage.source===ConsoleModel.ConsoleMessage.MessageSource.Deprecation)
messageText=Common.UIString('[Deprecation] %s',messageText);var args=consoleMessage.parameters||[messageText];messageElement=this._format(args);}
messageElement.classList.add('console-message-text');var formattedMessage=createElement('span');UI.appendStyle(formattedMessage,'object_ui/objectValue.css');formattedMessage.className='source-code';var anchorElement=this._buildMessageAnchor(consoleMessage);if(anchorElement)
formattedMessage.appendChild(anchorElement);formattedMessage.appendChild(messageElement);return formattedMessage;function linkifyRequest(title){return Components.Linkifier.linkifyRevealable((this.request),title,this.request.url());}}
_buildMessageAnchor(consoleMessage){var anchorElement=null;if(consoleMessage.source!==ConsoleModel.ConsoleMessage.MessageSource.Network||consoleMessage.request){if(consoleMessage.scriptId){anchorElement=this._linkifyScriptId(consoleMessage.scriptId,consoleMessage.url||'',consoleMessage.line,consoleMessage.column);}else if(consoleMessage.stackTrace&&consoleMessage.stackTrace.callFrames.length){anchorElement=this._linkifyStackTraceTopFrame(consoleMessage.stackTrace);}else if(consoleMessage.url&&consoleMessage.url!=='undefined'){anchorElement=this._linkifyLocation(consoleMessage.url,consoleMessage.line,consoleMessage.column);}}else if(consoleMessage.url){anchorElement=Components.Linkifier.linkifyURL(consoleMessage.url,undefined);}
if(anchorElement){var anchorWrapperElement=createElementWithClass('span','console-message-anchor');anchorWrapperElement.appendChild(anchorElement);anchorWrapperElement.createTextChild(' ');return anchorWrapperElement;}
return null;}
_buildMessageWithStackTrace(consoleMessage,target,linkifier){var toggleElement=createElementWithClass('div','console-message-stack-trace-toggle');var contentElement=toggleElement.createChild('div','console-message-stack-trace-wrapper');var messageElement=this._buildMessage(consoleMessage);var icon=UI.Icon.create('smallicon-triangle-right','console-message-expand-icon');var clickableElement=contentElement.createChild('div');clickableElement.appendChild(icon);clickableElement.appendChild(messageElement);var stackTraceElement=contentElement.createChild('div');var stackTracePreview=Components.DOMPresentationUtils.buildStackTracePreviewContents(target,linkifier,consoleMessage.stackTrace);stackTraceElement.appendChild(stackTracePreview);stackTraceElement.classList.add('hidden');function expandStackTrace(expand){icon.setIconType(expand?'smallicon-triangle-down':'smallicon-triangle-right');stackTraceElement.classList.toggle('hidden',!expand);}
function toggleStackTrace(event){if(event.target.hasSelection())
return;expandStackTrace(stackTraceElement.classList.contains('hidden'));event.consume();}
clickableElement.addEventListener('click',toggleStackTrace,false);if(consoleMessage.type===ConsoleModel.ConsoleMessage.MessageType.Trace)
expandStackTrace(true);toggleElement._expandStackTraceForTest=expandStackTrace.bind(null,true);return toggleElement;}
_linkifyLocation(url,lineNumber,columnNumber){var target=this._target();if(!target)
return null;return this._linkifier.linkifyScriptLocation(target,null,url,lineNumber,columnNumber);}
_linkifyStackTraceTopFrame(stackTrace){var target=this._target();if(!target)
return null;return this._linkifier.linkifyStackTraceTopFrame(target,stackTrace);}
_linkifyScriptId(scriptId,url,lineNumber,columnNumber){var target=this._target();if(!target)
return null;return this._linkifier.linkifyScriptLocation(target,scriptId,url,lineNumber,columnNumber);}
_parameterToRemoteObject(parameter,target){if(parameter instanceof SDK.RemoteObject)
return parameter;if(!target)
return SDK.RemoteObject.fromLocalObject(parameter);if(typeof parameter==='object')
return target.runtimeModel.createRemoteObject(parameter);return target.runtimeModel.createRemoteObjectFromPrimitiveValue(parameter);}
_format(parameters){var formattedResult=createElement('span');if(!parameters.length)
return formattedResult;for(var i=0;i<parameters.length;++i)
parameters[i]=this._parameterToRemoteObject(parameters[i],this._target());var shouldFormatMessage=SDK.RemoteObject.type(((parameters))[0])==='string'&&(this._message.type!==ConsoleModel.ConsoleMessage.MessageType.Result||this._message.level===ConsoleModel.ConsoleMessage.MessageLevel.Error);if(shouldFormatMessage){var result=this._formatWithSubstitutionString((parameters[0].description),parameters.slice(1),formattedResult);parameters=result.unusedSubstitutions;if(parameters.length)
formattedResult.createTextChild(' ');}
for(var i=0;i<parameters.length;++i){if(shouldFormatMessage&&parameters[i].type==='string')
formattedResult.appendChild(Components.linkifyStringAsFragment(parameters[i].description));else
formattedResult.appendChild(this._formatParameter(parameters[i],false,true));if(i<parameters.length-1)
formattedResult.createTextChild(' ');}
return formattedResult;}
_formatParameter(output,forceObjectFormat,includePreview){if(output.customPreview())
return(new ObjectUI.CustomPreviewComponent(output)).element;var type=forceObjectFormat?'object':(output.subtype||output.type);var element;switch(type){case'array':case'typedarray':element=this._formatParameterAsObject(output,includePreview);break;case'error':element=this._formatParameterAsError(output);break;case'function':case'generator':element=this._formatParameterAsFunction(output,includePreview);break;case'iterator':case'map':case'object':case'promise':case'proxy':case'set':element=this._formatParameterAsObject(output,includePreview);break;case'node':element=this._formatParameterAsNode(output);break;case'string':element=this._formatParameterAsString(output);break;case'boolean':case'date':case'null':case'number':case'regexp':case'symbol':case'undefined':element=this._formatParameterAsValue(output);break;default:element=this._formatParameterAsValue(output);console.error('Tried to format remote object of unknown type.');}
element.classList.add('object-value-'+type);element.classList.add('source-code');return element;}
_formatParameterAsValue(obj){var result=createElement('span');result.createTextChild(obj.description||'');if(obj.objectId)
result.addEventListener('contextmenu',this._contextMenuEventFired.bind(this,obj),false);return result;}
_formatParameterAsObject(obj,includePreview){var titleElement=createElement('span');if(includePreview&&obj.preview){titleElement.classList.add('console-object-preview');this._previewFormatter.appendObjectPreview(titleElement,obj.preview,false);}else if(obj.type==='function'){ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(obj,titleElement,false);titleElement.classList.add('object-value-function');}else{titleElement.createTextChild(obj.description||'');}
var note=titleElement.createChild('span','object-state-note');note.classList.add('info-note');note.title=Common.UIString('Value below was evaluated just now.');var section=new ObjectUI.ObjectPropertiesSection(obj,titleElement,this._linkifier);section.element.classList.add('console-view-object-properties-section');section.enableContextMenu();return section.element;}
_formatParameterAsFunction(func,includePreview){var result=createElement('span');SDK.RemoteFunction.objectAsFunction(func).targetFunction().then(formatTargetFunction.bind(this));return result;function formatTargetFunction(targetFunction){var functionElement=createElement('span');ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(targetFunction,functionElement,true,includePreview);result.appendChild(functionElement);if(targetFunction!==func){var note=result.createChild('span','object-info-state-note');note.title=Common.UIString('Function was resolved from bound function.');}
result.addEventListener('contextmenu',this._contextMenuEventFired.bind(this,targetFunction),false);}}
_contextMenuEventFired(obj,event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendApplicableItems(obj);contextMenu.show();}
_renderPropertyPreviewOrAccessor(object,propertyPath){var property=propertyPath.peekLast();if(property.type==='accessor')
return this._formatAsAccessorProperty(object,propertyPath.map(property=>property.name),false);return this._previewFormatter.renderPropertyPreview(property.type,(property.subtype),property.value);}
_formatParameterAsNode(object){var result=createElement('span');Common.Renderer.renderPromise(object).then(appendRenderer.bind(this),failedToRender.bind(this));return result;function appendRenderer(rendererElement){result.appendChild(rendererElement);this._formattedParameterAsNodeForTest();}
function failedToRender(){result.appendChild(this._formatParameterAsObject(object,false));}}
_formattedParameterAsNodeForTest(){}
_formatParameterAsString(output){var span=createElement('span');span.appendChild(Components.linkifyStringAsFragment(output.description||''));var result=createElement('span');result.createChild('span','object-value-string-quote').textContent='"';result.appendChild(span);result.createChild('span','object-value-string-quote').textContent='"';return result;}
_formatParameterAsError(output){var result=createElement('span');var errorSpan=this._tryFormatAsError(output.description||'');result.appendChild(errorSpan?errorSpan:Components.linkifyStringAsFragment(output.description||''));return result;}
_formatAsArrayEntry(output){return this._previewFormatter.renderPropertyPreview(output.type,output.subtype,output.description);}
_formatAsAccessorProperty(object,propertyPath,isArrayEntry){var rootElement=ObjectUI.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(object,propertyPath,onInvokeGetterClick.bind(this));function onInvokeGetterClick(result,wasThrown){if(!result)
return;rootElement.removeChildren();if(wasThrown){var element=rootElement.createChild('span');element.textContent=Common.UIString('<exception>');element.title=(result.description);}else if(isArrayEntry){rootElement.appendChild(this._formatAsArrayEntry(result));}else{const maxLength=100;var type=result.type;var subtype=result.subtype;var description='';if(type!=='function'&&result.description){if(type==='string'||subtype==='regexp')
description=result.description.trimMiddle(maxLength);else
description=result.description.trimEnd(maxLength);}
rootElement.appendChild(this._previewFormatter.renderPropertyPreview(type,subtype,description));}}
return rootElement;}
_formatWithSubstitutionString(format,parameters,formattedResult){var formatters={};function parameterFormatter(force,obj){return this._formatParameter(obj,force,false);}
function stringFormatter(obj){return obj.description;}
function floatFormatter(obj){if(typeof obj.value!=='number')
return'NaN';return obj.value;}
function integerFormatter(obj){if(typeof obj.value!=='number')
return'NaN';return Math.floor(obj.value);}
function bypassFormatter(obj){return(obj instanceof Node)?obj:'';}
var currentStyle=null;function styleFormatter(obj){currentStyle={};var buffer=createElement('span');buffer.setAttribute('style',obj.description);for(var i=0;i<buffer.style.length;i++){var property=buffer.style[i];if(isWhitelistedProperty(property))
currentStyle[property]=buffer.style[property];}}
function isWhitelistedProperty(property){var prefixes=['background','border','color','font','line','margin','padding','text','-webkit-background','-webkit-border','-webkit-font','-webkit-margin','-webkit-padding','-webkit-text'];for(var i=0;i<prefixes.length;i++){if(property.startsWith(prefixes[i]))
return true;}
return false;}
formatters.o=parameterFormatter.bind(this,false);formatters.s=stringFormatter;formatters.f=floatFormatter;formatters.i=integerFormatter;formatters.d=integerFormatter;formatters.c=styleFormatter;formatters.O=parameterFormatter.bind(this,true);formatters._=bypassFormatter;function append(a,b){if(b instanceof Node){a.appendChild(b);}else if(typeof b!=='undefined'){var toAppend=Components.linkifyStringAsFragment(String(b));if(currentStyle){var wrapper=createElement('span');wrapper.appendChild(toAppend);applyCurrentStyle(wrapper);for(var i=0;i<wrapper.children.length;++i)
applyCurrentStyle(wrapper.children[i]);toAppend=wrapper;}
a.appendChild(toAppend);}
return a;}
function applyCurrentStyle(element){for(var key in currentStyle)
element.style[key]=currentStyle[key];}
return String.format(format,parameters,formatters,formattedResult,append);}
matchesFilterRegex(regexObject){regexObject.lastIndex=0;var text=this.contentElement().deepTextContent();return regexObject.test(text);}
matchesFilterText(filter){var text=this.contentElement().deepTextContent();return text.toLowerCase().includes(filter.toLowerCase());}
updateTimestamp(){if(!this._contentElement)
return;if(Common.moduleSetting('consoleTimestampsEnabled').get()){if(!this._timestampElement)
this._timestampElement=createElementWithClass('span','console-timestamp');this._timestampElement.textContent=formatTimestamp(this._message.timestamp,false)+' ';this._timestampElement.title=formatTimestamp(this._message.timestamp,true);this._contentElement.insertBefore(this._timestampElement,this._contentElement.firstChild);}else if(this._timestampElement){this._timestampElement.remove();delete this._timestampElement;}
function formatTimestamp(timestamp,full){var date=new Date(timestamp);var yymmdd=date.getFullYear()+'-'+leadZero(date.getMonth()+1,2)+'-'+leadZero(date.getDate(),2);var hhmmssfff=leadZero(date.getHours(),2)+':'+leadZero(date.getMinutes(),2)+':'+
leadZero(date.getSeconds(),2)+'.'+leadZero(date.getMilliseconds(),3);return full?(yymmdd+' '+hhmmssfff):hhmmssfff;function leadZero(value,length){var valueString=value.toString();var padding=length-valueString.length;return padding<=0?valueString:'0'.repeat(padding)+valueString;}}}
nestingLevel(){return this._nestingLevel;}
resetCloseGroupDecorationCount(){if(!this._closeGroupDecorationCount)
return;this._closeGroupDecorationCount=0;this._updateCloseGroupDecorations();}
incrementCloseGroupDecorationCount(){++this._closeGroupDecorationCount;this._updateCloseGroupDecorations();}
_updateCloseGroupDecorations(){if(!this._nestingLevelMarkers)
return;for(var i=0,n=this._nestingLevelMarkers.length;i<n;++i){var marker=this._nestingLevelMarkers[i];marker.classList.toggle('group-closed',n-i<=this._closeGroupDecorationCount);}}
contentElement(){if(this._contentElement)
return this._contentElement;var contentElement=createElementWithClass('div','console-message');if(this._messageLevelIcon)
contentElement.appendChild(this._messageLevelIcon);this._contentElement=contentElement;if(this._message.type===ConsoleModel.ConsoleMessage.MessageType.StartGroup||this._message.type===ConsoleModel.ConsoleMessage.MessageType.StartGroupCollapsed)
contentElement.classList.add('console-group-title');var formattedMessage;var consoleMessage=this._message;var target=consoleMessage.target();var shouldIncludeTrace=!!consoleMessage.stackTrace&&(consoleMessage.source===ConsoleModel.ConsoleMessage.MessageSource.Network||consoleMessage.level===ConsoleModel.ConsoleMessage.MessageLevel.Error||consoleMessage.type===ConsoleModel.ConsoleMessage.MessageType.Trace||consoleMessage.level===ConsoleModel.ConsoleMessage.MessageLevel.Warning);if(target&&shouldIncludeTrace)
formattedMessage=this._buildMessageWithStackTrace(consoleMessage,target,this._linkifier);else if(this._message.type===ConsoleModel.ConsoleMessage.MessageType.Table)
formattedMessage=this._buildTableMessage(this._message);else
formattedMessage=this._buildMessage(consoleMessage);contentElement.appendChild(formattedMessage);this.updateTimestamp();return this._contentElement;}
toMessageElement(){if(this._element)
return this._element;this._element=createElement('div');this.updateMessageElement();return this._element;}
updateMessageElement(){if(!this._element)
return;this._element.className='console-message-wrapper';this._element.removeChildren();this._nestingLevelMarkers=[];for(var i=0;i<this._nestingLevel;++i)
this._nestingLevelMarkers.push(this._element.createChild('div','nesting-level-marker'));this._updateCloseGroupDecorations();this._element.message=this;switch(this._message.level){case ConsoleModel.ConsoleMessage.MessageLevel.Verbose:this._element.classList.add('console-verbose-level');this._updateMessageLevelIcon('');break;case ConsoleModel.ConsoleMessage.MessageLevel.Info:this._element.classList.add('console-info-level');break;case ConsoleModel.ConsoleMessage.MessageLevel.Warning:this._element.classList.add('console-warning-level');this._updateMessageLevelIcon('smallicon-warning');break;case ConsoleModel.ConsoleMessage.MessageLevel.Error:this._element.classList.add('console-error-level');this._updateMessageLevelIcon('smallicon-error');break;}
if(this._message.level===ConsoleModel.ConsoleMessage.MessageLevel.Verbose||this._message.level===ConsoleModel.ConsoleMessage.MessageLevel.Info){switch(this._message.source){case ConsoleModel.ConsoleMessage.MessageSource.Violation:case ConsoleModel.ConsoleMessage.MessageSource.Deprecation:case ConsoleModel.ConsoleMessage.MessageSource.Intervention:this._element.classList.add('console-warning-level');break;}}
this._element.appendChild(this.contentElement());if(this._repeatCount>1)
this._showRepeatCountElement();}
_updateMessageLevelIcon(iconType){if(!iconType&&!this._messageLevelIcon)
return;if(iconType&&!this._messageLevelIcon){this._messageLevelIcon=UI.Icon.create('','message-level-icon');if(this._contentElement)
this._contentElement.insertBefore(this._messageLevelIcon,this._contentElement.firstChild);}
this._messageLevelIcon.setIconType(iconType);}
repeatCount(){return this._repeatCount||1;}
resetIncrementRepeatCount(){this._repeatCount=1;if(!this._repeatCountElement)
return;this._repeatCountElement.remove();if(this._contentElement)
this._contentElement.classList.remove('repeated-message');delete this._repeatCountElement;}
incrementRepeatCount(){this._repeatCount++;this._showRepeatCountElement();}
_showRepeatCountElement(){if(!this._element)
return;if(!this._repeatCountElement){this._repeatCountElement=createElementWithClass('label','console-message-repeat-count','dt-small-bubble');switch(this._message.level){case ConsoleModel.ConsoleMessage.MessageLevel.Warning:this._repeatCountElement.type='warning';break;case ConsoleModel.ConsoleMessage.MessageLevel.Error:this._repeatCountElement.type='error';break;case ConsoleModel.ConsoleMessage.MessageLevel.Verbose:this._repeatCountElement.type='verbose';break;default:this._repeatCountElement.type='info';}
this._element.insertBefore(this._repeatCountElement,this._contentElement);this._contentElement.classList.add('repeated-message');}
this._repeatCountElement.textContent=this._repeatCount;}
get text(){return this._message.messageText;}
toExportString(){var lines=[];var nodes=this.contentElement().childTextNodes();var messageContent='';for(var i=0;i<nodes.length;++i){var originalLinkText=Components.Linkifier.originalLinkText(nodes[i].parentElement);messageContent+=typeof originalLinkText==='string'?originalLinkText:nodes[i].textContent;}
for(var i=0;i<this.repeatCount();++i)
lines.push(messageContent);return lines.join('\n');}
setSearchRegex(regex){if(this._searchHiglightNodeChanges&&this._searchHiglightNodeChanges.length)
UI.revertDomChanges(this._searchHiglightNodeChanges);this._searchRegex=regex;this._searchHighlightNodes=[];this._searchHiglightNodeChanges=[];if(!this._searchRegex)
return;var text=this.contentElement().deepTextContent();var match;this._searchRegex.lastIndex=0;var sourceRanges=[];while((match=this._searchRegex.exec(text))&&match[0])
sourceRanges.push(new Common.SourceRange(match.index,match[0].length));if(sourceRanges.length){this._searchHighlightNodes=UI.highlightSearchResults(this.contentElement(),sourceRanges,this._searchHiglightNodeChanges);}}
searchRegex(){return this._searchRegex;}
searchCount(){return this._searchHighlightNodes.length;}
searchHighlightNode(index){return this._searchHighlightNodes[index];}
_tryFormatAsError(string){function startsWith(prefix){return string.startsWith(prefix);}
var errorPrefixes=['EvalError','ReferenceError','SyntaxError','TypeError','RangeError','Error','URIError'];var target=this._target();if(!target||!errorPrefixes.some(startsWith))
return null;var debuggerModel=target.model(SDK.DebuggerModel);if(!debuggerModel)
return null;var lines=string.split('\n');var links=[];var position=0;for(var i=0;i<lines.length;++i){position+=i>0?lines[i-1].length+1:0;var isCallFrameLine=/^\s*at\s/.test(lines[i]);if(!isCallFrameLine&&links.length)
return null;if(!isCallFrameLine)
continue;var openBracketIndex=-1;var closeBracketIndex=-1;var match=/\([^\)\(]+\)/.exec(lines[i]);if(match){openBracketIndex=match.index;closeBracketIndex=match.index+match[0].length-1;}
var hasOpenBracket=openBracketIndex!==-1;var left=hasOpenBracket?openBracketIndex+1:lines[i].indexOf('at')+3;var right=hasOpenBracket?closeBracketIndex:lines[i].length;var linkCandidate=lines[i].substring(left,right);var splitResult=Common.ParsedURL.splitLineAndColumn(linkCandidate);if(!splitResult)
return null;var parsed=splitResult.url.asParsedURL();var url;if(parsed)
url=parsed.url;else if(debuggerModel.scriptsForSourceURL(splitResult.url).length)
url=splitResult.url;else if(splitResult.url==='<anonymous>')
continue;else
return null;links.push({url:url,positionLeft:position+left,positionRight:position+right,lineNumber:splitResult.lineNumber,columnNumber:splitResult.columnNumber});}
if(!links.length)
return null;var formattedResult=createElement('span');var start=0;for(var i=0;i<links.length;++i){formattedResult.appendChild(Components.linkifyStringAsFragment(string.substring(start,links[i].positionLeft)));formattedResult.appendChild(this._linkifier.linkifyScriptLocation(target,null,links[i].url,links[i].lineNumber,links[i].columnNumber));start=links[i].positionRight;}
if(start!==string.length)
formattedResult.appendChild(Components.linkifyStringAsFragment(string.substring(start)));return formattedResult;}};Console.ConsoleGroupViewMessage=class extends Console.ConsoleViewMessage{constructor(consoleMessage,linkifier,nestingLevel){console.assert(consoleMessage.isGroupStartMessage());super(consoleMessage,linkifier,nestingLevel);this._collapsed=consoleMessage.type===ConsoleModel.ConsoleMessage.MessageType.StartGroupCollapsed;this._expandGroupIcon=null;}
setCollapsed(collapsed){this._collapsed=collapsed;if(this._expandGroupIcon)
this._expandGroupIcon.setIconType(this._collapsed?'smallicon-triangle-right':'smallicon-triangle-down');}
collapsed(){return this._collapsed;}
toMessageElement(){if(!this._element){super.toMessageElement();this._expandGroupIcon=UI.Icon.create('','expand-group-icon');this._contentElement.insertBefore(this._expandGroupIcon,this._contentElement.firstChild);this.setCollapsed(this._collapsed);}
return this._element;}};;Console.ConsolePrompt=class extends UI.Widget{constructor(){super();this._addCompletionsFromHistory=true;this._history=new Console.ConsoleHistoryManager();this._initialText='';this._editor=null;this.element.tabIndex=0;self.runtime.extension(UI.TextEditorFactory).instance().then(gotFactory.bind(this));function gotFactory(factory){this._editor=factory.createEditor({lineNumbers:false,lineWrapping:true,mimeType:'javascript',autoHeight:true});this._editor.configureAutocomplete({substituteRangeCallback:this._substituteRange.bind(this),suggestionsCallback:this._wordsWithQuery.bind(this),captureEnter:true});this._editor.widget().element.addEventListener('keydown',this._editorKeyDown.bind(this),true);this._editor.widget().show(this.element);this.setText(this._initialText);delete this._initialText;if(this.hasFocus())
this.focus();this.element.tabIndex=-1;this._editorSetForTest();}}
history(){return this._history;}
clearAutocomplete(){if(this._editor)
this._editor.clearAutocomplete();}
_isCaretAtEndOfPrompt(){return!!this._editor&&this._editor.selection().collapseToEnd().equal(this._editor.fullRange().collapseToEnd());}
moveCaretToEndOfPrompt(){if(this._editor)
this._editor.setSelection(Common.TextRange.createFromLocation(Infinity,Infinity));}
setText(text){if(this._editor)
this._editor.setText(text);else
this._initialText=text;}
text(){return this._editor?this._editor.text():this._initialText;}
setAddCompletionsFromHistory(value){this._addCompletionsFromHistory=value;}
_editorKeyDown(event){var keyboardEvent=(event);var newText;var isPrevious;switch(keyboardEvent.keyCode){case UI.KeyboardShortcut.Keys.Up.code:if(this._editor.selection().endLine>0)
break;newText=this._history.previous(this.text());isPrevious=true;break;case UI.KeyboardShortcut.Keys.Down.code:if(this._editor.selection().endLine<this._editor.fullRange().endLine)
break;newText=this._history.next();break;case UI.KeyboardShortcut.Keys.P.code:if(Host.isMac()&&keyboardEvent.ctrlKey&&!keyboardEvent.metaKey&&!keyboardEvent.altKey&&!keyboardEvent.shiftKey){newText=this._history.previous(this.text());isPrevious=true;}
break;case UI.KeyboardShortcut.Keys.N.code:if(Host.isMac()&&keyboardEvent.ctrlKey&&!keyboardEvent.metaKey&&!keyboardEvent.altKey&&!keyboardEvent.shiftKey)
newText=this._history.next();break;case UI.KeyboardShortcut.Keys.Enter.code:this._enterKeyPressed(keyboardEvent);break;}
if(newText===undefined)
return;keyboardEvent.consume(true);this.setText(newText);if(isPrevious)
this._editor.setSelection(Common.TextRange.createFromLocation(0,Infinity));else
this.moveCaretToEndOfPrompt();this.setMinimumSize(0,this._editor.widget().element.offsetHeight);}
_enterKeyPressed(event){if(event.altKey||event.ctrlKey||event.shiftKey)
return;event.consume(true);this.clearAutocomplete();var str=this.text();if(!str.length)
return;var currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(!this._isCaretAtEndOfPrompt()||!currentExecutionContext){this._appendCommand(str,true);return;}
currentExecutionContext.target().runtimeModel.compileScript(str,'',false,currentExecutionContext.id,compileCallback.bind(this));function compileCallback(scriptId,exceptionDetails){if(str!==this.text())
return;if(exceptionDetails&&(exceptionDetails.exception.description.startsWith('SyntaxError: Unexpected end of input')||exceptionDetails.exception.description.startsWith('SyntaxError: Unterminated template literal'))){this._editor.newlineAndIndent();this._enterProcessedForTest();return;}
this._appendCommand(str,true);this._enterProcessedForTest();}}
_appendCommand(text,useCommandLineAPI){this.setText('');var currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(currentExecutionContext){ConsoleModel.consoleModel.evaluateCommandInConsole(currentExecutionContext,text,useCommandLineAPI);if(Console.ConsolePanel.instance().isShowing())
Host.userMetrics.actionTaken(Host.UserMetrics.Action.CommandEvaluatedInConsolePanel);}}
_enterProcessedForTest(){}
_historyCompletions(prefix,force){if(!this._addCompletionsFromHistory||!this._isCaretAtEndOfPrompt()||(!prefix&&!force))
return[];var result=[];var text=this.text();var set=new Set();var data=this._history.historyData();for(var i=data.length-1;i>=0&&result.length<50;--i){var item=data[i];if(!item.startsWith(text))
continue;if(set.has(item))
continue;set.add(item);result.push({text:item.substring(text.length-prefix.length),iconType:'smallicon-text-prompt',isSecondary:true});}
return result;}
focus(){if(this._editor)
this._editor.widget().focus();else
this.element.focus();}
_substituteRange(lineNumber,columnNumber){var lineText=this._editor.line(lineNumber);var index;for(index=columnNumber-1;index>=0;index--){if(' =:[({;,!+-*/&|^<>.\t\r\n'.indexOf(lineText.charAt(index))!==-1)
break;}
return new Common.TextRange(lineNumber,index+1,lineNumber,columnNumber);}
_wordsWithQuery(queryRange,substituteRange,force,currentTokenType){var query=this._editor.text(queryRange);var before=this._editor.text(new Common.TextRange(0,0,queryRange.startLine,queryRange.startColumn));var historyWords=this._historyCompletions(query,force);var excludedTokens=new Set(['js-comment','js-string-2','js-def']);var trimmedBefore=before.trim();if(!trimmedBefore.endsWith('[')&&!trimmedBefore.match(/\.\s*(get|set|delete)\s*\(\s*$/))
excludedTokens.add('js-string');if(!trimmedBefore.endsWith('.'))
excludedTokens.add('js-property');if(excludedTokens.has(currentTokenType))
return Promise.resolve(historyWords);return ObjectUI.JavaScriptAutocomplete.completionsForTextInCurrentContext(before,query,force).then(words=>words.concat(historyWords));}
_editorSetForTest(){}};Console.ConsoleHistoryManager=class{constructor(){this._data=[];this._historyOffset=1;}
historyData(){return this._data;}
setHistoryData(data){this._data=data.slice();this._historyOffset=1;}
pushHistoryItem(text){if(this._uncommittedIsTop){this._data.pop();delete this._uncommittedIsTop;}
this._historyOffset=1;if(text===this._currentHistoryItem())
return;this._data.push(text);}
_pushCurrentText(currentText){if(this._uncommittedIsTop)
this._data.pop();this._uncommittedIsTop=true;this._data.push(currentText);}
previous(currentText){if(this._historyOffset>this._data.length)
return undefined;if(this._historyOffset===1)
this._pushCurrentText(currentText);++this._historyOffset;return this._currentHistoryItem();}
next(){if(this._historyOffset===1)
return undefined;--this._historyOffset;return this._currentHistoryItem();}
_currentHistoryItem(){return this._data[this._data.length-this._historyOffset];}};;Console.ConsoleView=class extends UI.VBox{constructor(){super();this.setMinimumSize(0,35);this.registerRequiredCSS('console/consoleView.css');this._searchableView=new UI.SearchableView(this);this._searchableView.setPlaceholder(Common.UIString('Find string in logs'));this._searchableView.setMinimalSearchQuerySize(0);this._searchableView.show(this.element);this._contentsElement=this._searchableView.element;this._contentsElement.classList.add('console-view');this._visibleViewMessages=[];this._urlToMessageCount={};this._hiddenByFilterCount=0;this._regexMatchRanges=[];this._filter=new Console.ConsoleViewFilter(this._updateMessageList.bind(this));this._executionContextComboBox=new UI.ToolbarComboBox(null,'console-context');this._executionContextComboBox.setMaxWidth(80);this._consoleContextSelector=new Console.ConsoleContextSelector(this._executionContextComboBox.selectElement());this._filterStatusText=new UI.ToolbarText();this._filterStatusText.element.classList.add('dimmed');this._showSettingsPaneSetting=Common.settings.createSetting('consoleShowSettingsToolbar',false);this._showSettingsPaneButton=new UI.ToolbarSettingToggle(this._showSettingsPaneSetting,'largeicon-settings-gear',Common.UIString('Console settings'));this._progressToolbarItem=new UI.ToolbarItem(createElement('div'));var toolbar=new UI.Toolbar('',this._contentsElement);toolbar.appendToolbarItem(UI.Toolbar.createActionButton((UI.actionRegistry.action('console.clear'))));toolbar.appendSeparator();toolbar.appendToolbarItem(this._executionContextComboBox);toolbar.appendSeparator();toolbar.appendToolbarItem(this._filter._textFilterUI);toolbar.appendToolbarItem(this._filter._levelComboBox);toolbar.appendToolbarItem(this._progressToolbarItem);toolbar.appendSpacer();toolbar.appendToolbarItem(this._filterStatusText);toolbar.appendSeparator();toolbar.appendToolbarItem(this._showSettingsPaneButton);this._preserveLogCheckbox=new UI.ToolbarSettingCheckbox(Common.moduleSetting('preserveConsoleLog'),Common.UIString('Do not clear log on page reload / navigation'),Common.UIString('Preserve log'));this._hideNetworkMessagesCheckbox=new UI.ToolbarSettingCheckbox(this._filter._hideNetworkMessagesSetting,this._filter._hideNetworkMessagesSetting.title(),Common.UIString('Hide network'));var monitoringXHREnabledSetting=Common.moduleSetting('monitoringXHREnabled');this._timestampsSetting=Common.moduleSetting('consoleTimestampsEnabled');this._consoleHistoryAutocompleteSetting=Common.moduleSetting('consoleHistoryAutocomplete');var settingsPane=new UI.HBox();settingsPane.show(this._contentsElement);settingsPane.element.classList.add('console-settings-pane');var settingsToolbarLeft=new UI.Toolbar('',settingsPane.element);settingsToolbarLeft.makeVertical();settingsToolbarLeft.appendToolbarItem(this._hideNetworkMessagesCheckbox);settingsToolbarLeft.appendToolbarItem(this._preserveLogCheckbox);settingsToolbarLeft.appendToolbarItem(this._filter._showTargetMessagesCheckbox);var settingsToolbarRight=new UI.Toolbar('',settingsPane.element);settingsToolbarRight.makeVertical();settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(monitoringXHREnabledSetting));settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(this._timestampsSetting));settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(this._consoleHistoryAutocompleteSetting));if(!this._showSettingsPaneSetting.get())
settingsPane.element.classList.add('hidden');this._showSettingsPaneSetting.addChangeListener(()=>settingsPane.element.classList.toggle('hidden',!this._showSettingsPaneSetting.get()));this._viewport=new Console.ConsoleViewport(this);this._viewport.setStickToBottom(true);this._viewport.contentElement().classList.add('console-group','console-group-messages');this._contentsElement.appendChild(this._viewport.element);this._messagesElement=this._viewport.element;this._messagesElement.id='console-messages';this._messagesElement.classList.add('monospace');this._messagesElement.addEventListener('click',this._messagesClicked.bind(this),true);this._viewportThrottler=new Common.Throttler(50);this._topGroup=Console.ConsoleGroup.createTopGroup();this._currentGroup=this._topGroup;this._promptElement=this._messagesElement.createChild('div','source-code');var promptIcon=UI.Icon.create('smallicon-text-prompt','console-prompt-icon');this._promptElement.appendChild(promptIcon);this._promptElement.id='console-prompt';this._promptElement.addEventListener('input',this._promptInput.bind(this),false);var selectAllFixer=this._messagesElement.createChild('div','console-view-fix-select-all');selectAllFixer.textContent='.';this._registerShortcuts();this._messagesElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);monitoringXHREnabledSetting.addChangeListener(this._monitoringXHREnabledSettingChanged,this);this._linkifier=new Components.Linkifier();this._consoleMessages=[];this._viewMessageSymbol=Symbol('viewMessage');this._consoleHistorySetting=Common.settings.createLocalSetting('consoleHistory',[]);this._prompt=new Console.ConsolePrompt();this._prompt.show(this._promptElement);this._prompt.element.addEventListener('keydown',this._promptKeyDown.bind(this),true);this._consoleHistoryAutocompleteSetting.addChangeListener(this._consoleHistoryAutocompleteChanged,this);var historyData=this._consoleHistorySetting.get();this._prompt.history().setHistoryData(historyData);this._consoleHistoryAutocompleteChanged();this._updateFilterStatus();this._timestampsSetting.addChangeListener(this._consoleTimestampsSettingChanged,this);this._registerWithMessageSink();SDK.targetManager.observeTargets(this);UI.context.addFlavorChangeListener(SDK.ExecutionContext,this._executionContextChanged,this);this._messagesElement.addEventListener('mousedown',this._updateStickToBottomOnMouseDown.bind(this),false);this._messagesElement.addEventListener('mouseup',this._updateStickToBottomOnMouseUp.bind(this),false);this._messagesElement.addEventListener('mouseleave',this._updateStickToBottomOnMouseUp.bind(this),false);this._messagesElement.addEventListener('wheel',this._updateStickToBottomOnWheel.bind(this),false);}
static instance(){if(!Console.ConsoleView._instance)
Console.ConsoleView._instance=new Console.ConsoleView();return Console.ConsoleView._instance;}
static clearConsole(){ConsoleModel.consoleModel.requestClearMessages();}
searchableView(){return this._searchableView;}
_clearHistory(){this._consoleHistorySetting.set([]);this._prompt.history().setHistoryData([]);}
_consoleHistoryAutocompleteChanged(){this._prompt.setAddCompletionsFromHistory(this._consoleHistoryAutocompleteSetting.get());}
_initConsoleMessages(target){var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(target);if(resourceTreeModel&&!resourceTreeModel.cachedResourcesLoaded()){resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded,this._onResourceTreeModelLoaded,this);return;}
this._fetchMultitargetMessages();}
_onResourceTreeModelLoaded(event){var resourceTreeModel=(event.data);resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded,this._onResourceTreeModelLoaded,this);this._fetchMultitargetMessages();}
_fetchMultitargetMessages(){ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.ConsoleCleared,this._consoleCleared,this);ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.MessageAdded,this._onConsoleMessageAdded,this);ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.MessageUpdated,this._onConsoleMessageUpdated,this);ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.CommandEvaluated,this._commandEvaluated,this);ConsoleModel.consoleModel.messages().forEach(this._addConsoleMessage,this);this._viewport.invalidate();}
itemCount(){return this._visibleViewMessages.length;}
itemElement(index){return this._visibleViewMessages[index];}
fastHeight(index){return this._visibleViewMessages[index].fastHeight();}
minimumRowHeight(){return 16;}
targetAdded(target){if(target===SDK.targetManager.mainTarget())
this._initConsoleMessages(target);this._viewport.invalidate();}
targetRemoved(target){}
_registerWithMessageSink(){Common.console.messages().forEach(this._addSinkMessage,this);Common.console.addEventListener(Common.Console.Events.MessageAdded,messageAdded,this);function messageAdded(event){this._addSinkMessage((event.data));}}
_addSinkMessage(message){var level=ConsoleModel.ConsoleMessage.MessageLevel.Verbose;switch(message.level){case Common.Console.MessageLevel.Info:level=ConsoleModel.ConsoleMessage.MessageLevel.Info;break;case Common.Console.MessageLevel.Error:level=ConsoleModel.ConsoleMessage.MessageLevel.Error;break;case Common.Console.MessageLevel.Warning:level=ConsoleModel.ConsoleMessage.MessageLevel.Warning;break;}
var consoleMessage=new ConsoleModel.ConsoleMessage(null,ConsoleModel.ConsoleMessage.MessageSource.Other,level,message.text,undefined,undefined,undefined,undefined,undefined,undefined,undefined,message.timestamp);this._addConsoleMessage(consoleMessage);}
_consoleTimestampsSettingChanged(){this._updateMessageList();this._consoleMessages.forEach(viewMessage=>viewMessage.updateTimestamp());}
_executionContextChanged(){this._prompt.clearAutocomplete();if(this._filter._showTargetMessagesCheckbox.checked())
this._updateMessageList();}
willHide(){this._hidePromptSuggestBox();}
wasShown(){this._viewport.refresh();}
focus(){if(this._prompt.hasFocus())
return;this._prompt.moveCaretToEndOfPrompt();this._prompt.focus();}
restoreScrollPositions(){if(this._viewport.stickToBottom())
this._immediatelyScrollToBottom();else
super.restoreScrollPositions();}
onResize(){this._scheduleViewportRefresh();this._hidePromptSuggestBox();if(this._viewport.stickToBottom())
this._immediatelyScrollToBottom();for(var i=0;i<this._visibleViewMessages.length;++i)
this._visibleViewMessages[i].onResize();}
_hidePromptSuggestBox(){this._prompt.clearAutocomplete();}
_scheduleViewportRefresh(){function invalidateViewport(){if(this._muteViewportUpdates){this._maybeDirtyWhileMuted=true;return Promise.resolve();}
if(this._needsFullUpdate){this._updateMessageList();delete this._needsFullUpdate;}else{this._viewport.invalidate();}
return Promise.resolve();}
if(this._muteViewportUpdates){this._maybeDirtyWhileMuted=true;this._scheduleViewportRefreshForTest(true);return;}else{this._scheduleViewportRefreshForTest(false);}
this._viewportThrottler.schedule(invalidateViewport.bind(this));}
_scheduleViewportRefreshForTest(muted){}
_immediatelyScrollToBottom(){this._viewport.setStickToBottom(true);this._promptElement.scrollIntoView(true);}
_updateFilterStatus(){this._filterStatusText.setText(Common.UIString(this._hiddenByFilterCount===1?'1 item hidden by filters':this._hiddenByFilterCount+' items hidden by filters'));this._filterStatusText.setVisible(!!this._hiddenByFilterCount);}
_onConsoleMessageAdded(event){var message=(event.data);this._addConsoleMessage(message);}
_addConsoleMessage(message){function compareTimestamps(viewMessage1,viewMessage2){return ConsoleModel.ConsoleMessage.timestampComparator(viewMessage1.consoleMessage(),viewMessage2.consoleMessage());}
if(message.type===ConsoleModel.ConsoleMessage.MessageType.Command||message.type===ConsoleModel.ConsoleMessage.MessageType.Result){message.timestamp=this._consoleMessages.length?this._consoleMessages.peekLast().consoleMessage().timestamp:0;}
var viewMessage=this._createViewMessage(message);message[this._viewMessageSymbol]=viewMessage;var insertAt=this._consoleMessages.upperBound(viewMessage,compareTimestamps);var insertedInMiddle=insertAt<this._consoleMessages.length;this._consoleMessages.splice(insertAt,0,viewMessage);if(this._urlToMessageCount[message.url])
++this._urlToMessageCount[message.url];else
this._urlToMessageCount[message.url]=1;if(!insertedInMiddle){this._appendMessageToEnd(viewMessage);this._updateFilterStatus();this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);}else{this._needsFullUpdate=true;}
this._scheduleViewportRefresh();this._consoleMessageAddedForTest(viewMessage);}
_onConsoleMessageUpdated(event){var message=(event.data);var viewMessage=message[this._viewMessageSymbol];if(viewMessage){viewMessage.updateMessageElement();this._updateMessageList();}}
_consoleMessageAddedForTest(viewMessage){}
_appendMessageToEnd(viewMessage){if(!this._filter.shouldBeVisible(viewMessage)){this._hiddenByFilterCount++;return;}
if(this._tryToCollapseMessages(viewMessage,this._visibleViewMessages.peekLast()))
return;var lastMessage=this._visibleViewMessages.peekLast();if(viewMessage.consoleMessage().type===ConsoleModel.ConsoleMessage.MessageType.EndGroup){if(lastMessage&&!this._currentGroup.messagesHidden())
lastMessage.incrementCloseGroupDecorationCount();this._currentGroup=this._currentGroup.parentGroup();return;}
if(!this._currentGroup.messagesHidden()){var originatingMessage=viewMessage.consoleMessage().originatingMessage();if(lastMessage&&originatingMessage&&lastMessage.consoleMessage()===originatingMessage)
lastMessage.toMessageElement().classList.add('console-adjacent-user-command-result');this._visibleViewMessages.push(viewMessage);this._searchMessage(this._visibleViewMessages.length-1);}
if(viewMessage.consoleMessage().isGroupStartMessage())
this._currentGroup=new Console.ConsoleGroup(this._currentGroup,viewMessage);this._messageAppendedForTests();}
_messageAppendedForTests(){}
_createViewMessage(message){var nestingLevel=this._currentGroup.nestingLevel();switch(message.type){case ConsoleModel.ConsoleMessage.MessageType.Command:return new Console.ConsoleCommand(message,this._linkifier,nestingLevel);case ConsoleModel.ConsoleMessage.MessageType.Result:return new Console.ConsoleCommandResult(message,this._linkifier,nestingLevel);case ConsoleModel.ConsoleMessage.MessageType.StartGroupCollapsed:case ConsoleModel.ConsoleMessage.MessageType.StartGroup:return new Console.ConsoleGroupViewMessage(message,this._linkifier,nestingLevel);default:return new Console.ConsoleViewMessage(message,this._linkifier,nestingLevel);}}
_consoleCleared(){this._currentMatchRangeIndex=-1;this._consoleMessages=[];this._updateMessageList();this._hidePromptSuggestBox();this._viewport.setStickToBottom(true);this._linkifier.reset();}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);if(event.target.isSelfOrDescendant(this._promptElement)){contextMenu.show();return;}
function monitoringXHRItemAction(){Common.moduleSetting('monitoringXHREnabled').set(!Common.moduleSetting('monitoringXHREnabled').get());}
contextMenu.appendCheckboxItem(Common.UIString('Log XMLHttpRequests'),monitoringXHRItemAction,Common.moduleSetting('monitoringXHREnabled').get());var sourceElement=event.target.enclosingNodeOrSelfWithClass('console-message-wrapper');var consoleMessage=sourceElement?sourceElement.message.consoleMessage():null;var filterSubMenu=contextMenu.appendSubMenuItem(Common.UIString('Filter'));if(consoleMessage&&consoleMessage.url){var menuTitle=Common.UIString.capitalize('Hide ^messages from %s',new Common.ParsedURL(consoleMessage.url).displayName);filterSubMenu.appendItem(menuTitle,this._filter.addMessageURLFilter.bind(this._filter,consoleMessage.url));}
filterSubMenu.appendSeparator();var unhideAll=filterSubMenu.appendItem(Common.UIString.capitalize('Unhide ^all'),this._filter.removeMessageURLFilter.bind(this._filter));filterSubMenu.appendSeparator();var hasFilters=false;for(var url in this._filter.messageURLFilters()){filterSubMenu.appendCheckboxItem(String.sprintf('%s (%d)',new Common.ParsedURL(url).displayName,this._urlToMessageCount[url]),this._filter.removeMessageURLFilter.bind(this._filter,url),true);hasFilters=true;}
filterSubMenu.setEnabled(hasFilters||(consoleMessage&&consoleMessage.url));unhideAll.setEnabled(hasFilters);contextMenu.appendSeparator();contextMenu.appendAction('console.clear');contextMenu.appendAction('console.clear.history');contextMenu.appendItem(Common.UIString('Save as...'),this._saveConsole.bind(this));var request=consoleMessage?consoleMessage.request:null;if(request&&request.resourceType()===Common.resourceTypes.XHR){contextMenu.appendSeparator();contextMenu.appendItem(Common.UIString('Replay XHR'),request.replayXHR.bind(request));}
contextMenu.show();}
_saveConsole(){var url=SDK.targetManager.mainTarget().inspectedURL();var parsedURL=url.asParsedURL();var filename=String.sprintf('%s-%d.log',parsedURL?parsedURL.host:'console',Date.now());var stream=new Bindings.FileOutputStream();var progressIndicator=new UI.ProgressIndicator();progressIndicator.setTitle(Common.UIString('Writing file…'));progressIndicator.setTotalWork(this.itemCount());var chunkSize=350;var messageIndex=0;stream.open(filename,openCallback.bind(this));function openCallback(accepted){if(!accepted)
return;this._progressToolbarItem.element.appendChild(progressIndicator.element);writeNextChunk.call(this,stream);}
function writeNextChunk(stream,error){if(messageIndex>=this.itemCount()||error){stream.close();progressIndicator.done();return;}
var messageContents=[];for(var i=0;i<chunkSize&&i+messageIndex<this.itemCount();++i){var message=this.itemElement(messageIndex+i);messageContents.push(message.toExportString());}
messageIndex+=i;stream.write(messageContents.join('\n')+'\n',writeNextChunk.bind(this));progressIndicator.setWorked(messageIndex);}}
_tryToCollapseMessages(lastMessage,viewMessage){var timestampsShown=this._timestampsSetting.get();if(!timestampsShown&&viewMessage&&!lastMessage.consoleMessage().isGroupMessage()&&lastMessage.consoleMessage().isEqual(viewMessage.consoleMessage())){viewMessage.incrementRepeatCount();return true;}
return false;}
_updateMessageList(){this._topGroup=Console.ConsoleGroup.createTopGroup();this._currentGroup=this._topGroup;this._regexMatchRanges=[];this._hiddenByFilterCount=0;for(var i=0;i<this._visibleViewMessages.length;++i){this._visibleViewMessages[i].resetCloseGroupDecorationCount();this._visibleViewMessages[i].resetIncrementRepeatCount();}
this._visibleViewMessages=[];for(var i=0;i<this._consoleMessages.length;++i)
this._appendMessageToEnd(this._consoleMessages[i]);this._updateFilterStatus();this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);this._viewport.invalidate();}
_monitoringXHREnabledSettingChanged(event){var enabled=(event.data);SDK.targetManager.targets().forEach(function(target){target.networkAgent().setMonitoringXHREnabled(enabled);});}
_messagesClicked(event){var targetElement=event.deepElementFromPoint();if(!targetElement||targetElement.isComponentSelectionCollapsed())
this.focus();var groupMessage=event.target.enclosingNodeOrSelfWithClass('console-group-title');if(!groupMessage)
return;var consoleGroupViewMessage=groupMessage.parentElement.message;consoleGroupViewMessage.setCollapsed(!consoleGroupViewMessage.collapsed());this._updateMessageList();}
_registerShortcuts(){this._shortcuts={};var shortcut=UI.KeyboardShortcut;var section=UI.shortcutsScreen.section(Common.UIString('Console'));var shortcutL=shortcut.makeDescriptor('l',UI.KeyboardShortcut.Modifiers.Ctrl);var keys=[shortcutL];if(Host.isMac()){var shortcutK=shortcut.makeDescriptor('k',UI.KeyboardShortcut.Modifiers.Meta);keys.unshift(shortcutK);}
section.addAlternateKeys(keys,Common.UIString('Clear console'));keys=[shortcut.makeDescriptor(shortcut.Keys.Tab),shortcut.makeDescriptor(shortcut.Keys.Right)];section.addRelatedKeys(keys,Common.UIString('Accept suggestion'));var shortcutU=shortcut.makeDescriptor('u',UI.KeyboardShortcut.Modifiers.Ctrl);this._shortcuts[shortcutU.key]=this._clearPromptBackwards.bind(this);section.addAlternateKeys([shortcutU],Common.UIString('Clear console prompt'));keys=[shortcut.makeDescriptor(shortcut.Keys.Down),shortcut.makeDescriptor(shortcut.Keys.Up)];section.addRelatedKeys(keys,Common.UIString('Next/previous line'));if(Host.isMac()){keys=[shortcut.makeDescriptor('N',shortcut.Modifiers.Alt),shortcut.makeDescriptor('P',shortcut.Modifiers.Alt)];section.addRelatedKeys(keys,Common.UIString('Next/previous command'));}
section.addKey(shortcut.makeDescriptor(shortcut.Keys.Enter),Common.UIString('Execute command'));}
_clearPromptBackwards(){this._prompt.setText('');}
_promptKeyDown(event){var keyboardEvent=(event);if(keyboardEvent.key==='PageUp'){this._updateStickToBottomOnWheel();return;}
var shortcut=UI.KeyboardShortcut.makeKeyFromEvent(keyboardEvent);var handler=this._shortcuts[shortcut];if(handler){handler();keyboardEvent.preventDefault();}}
_printResult(result,originatingConsoleMessage,exceptionDetails){if(!result)
return;var level=!!exceptionDetails?ConsoleModel.ConsoleMessage.MessageLevel.Error:ConsoleModel.ConsoleMessage.MessageLevel.Info;var message;if(!exceptionDetails){message=new ConsoleModel.ConsoleMessage(result.runtimeModel().target(),ConsoleModel.ConsoleMessage.MessageSource.JS,level,'',ConsoleModel.ConsoleMessage.MessageType.Result,undefined,undefined,undefined,undefined,[result]);}else{message=ConsoleModel.ConsoleMessage.fromException(result.runtimeModel(),exceptionDetails,ConsoleModel.ConsoleMessage.MessageType.Result,undefined,undefined);}
message.setOriginatingMessage(originatingConsoleMessage);ConsoleModel.consoleModel.addMessage(message);}
_commandEvaluated(event){var data=(event.data);this._prompt.history().pushHistoryItem(data.text);this._consoleHistorySetting.set(this._prompt.history().historyData().slice(-Console.ConsoleView.persistedHistorySize));this._printResult(data.result,data.commandMessage,data.exceptionDetails);}
elementsToRestoreScrollPositionsFor(){return[this._messagesElement];}
searchCanceled(){this._cleanupAfterSearch();for(var i=0;i<this._visibleViewMessages.length;++i){var message=this._visibleViewMessages[i];message.setSearchRegex(null);}
this._currentMatchRangeIndex=-1;this._regexMatchRanges=[];delete this._searchRegex;this._viewport.refresh();}
performSearch(searchConfig,shouldJump,jumpBackwards){this.searchCanceled();this._searchableView.updateSearchMatchesCount(0);this._searchRegex=searchConfig.toSearchRegex(true);this._regexMatchRanges=[];this._currentMatchRangeIndex=-1;if(shouldJump)
this._searchShouldJumpBackwards=!!jumpBackwards;this._searchProgressIndicator=new UI.ProgressIndicator();this._searchProgressIndicator.setTitle(Common.UIString('Searching…'));this._searchProgressIndicator.setTotalWork(this._visibleViewMessages.length);this._progressToolbarItem.element.appendChild(this._searchProgressIndicator.element);this._innerSearch(0);}
_cleanupAfterSearch(){delete this._searchShouldJumpBackwards;if(this._innerSearchTimeoutId){clearTimeout(this._innerSearchTimeoutId);delete this._innerSearchTimeoutId;}
if(this._searchProgressIndicator){this._searchProgressIndicator.done();delete this._searchProgressIndicator;}}
_searchFinishedForTests(){}
_innerSearch(index){delete this._innerSearchTimeoutId;if(this._searchProgressIndicator.isCanceled()){this._cleanupAfterSearch();return;}
var startTime=Date.now();for(;index<this._visibleViewMessages.length&&Date.now()-startTime<100;++index)
this._searchMessage(index);this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);if(typeof this._searchShouldJumpBackwards!=='undefined'&&this._regexMatchRanges.length){this._jumpToMatch(this._searchShouldJumpBackwards?-1:0);delete this._searchShouldJumpBackwards;}
if(index===this._visibleViewMessages.length){this._cleanupAfterSearch();setTimeout(this._searchFinishedForTests.bind(this),0);return;}
this._innerSearchTimeoutId=setTimeout(this._innerSearch.bind(this,index),100);this._searchProgressIndicator.setWorked(index);}
_searchMessage(index){var message=this._visibleViewMessages[index];message.setSearchRegex(this._searchRegex);for(var i=0;i<message.searchCount();++i)
this._regexMatchRanges.push({messageIndex:index,matchIndex:i});}
jumpToNextSearchResult(){this._jumpToMatch(this._currentMatchRangeIndex+1);}
jumpToPreviousSearchResult(){this._jumpToMatch(this._currentMatchRangeIndex-1);}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return true;}
_jumpToMatch(index){if(!this._regexMatchRanges.length)
return;var matchRange;if(this._currentMatchRangeIndex>=0){matchRange=this._regexMatchRanges[this._currentMatchRangeIndex];var message=this._visibleViewMessages[matchRange.messageIndex];message.searchHighlightNode(matchRange.matchIndex).classList.remove(UI.highlightedCurrentSearchResultClassName);}
index=mod(index,this._regexMatchRanges.length);this._currentMatchRangeIndex=index;this._searchableView.updateCurrentMatchIndex(index);matchRange=this._regexMatchRanges[index];var message=this._visibleViewMessages[matchRange.messageIndex];var highlightNode=message.searchHighlightNode(matchRange.matchIndex);highlightNode.classList.add(UI.highlightedCurrentSearchResultClassName);this._viewport.scrollItemIntoView(matchRange.messageIndex);highlightNode.scrollIntoViewIfNeeded();}
_updateStickToBottomOnMouseDown(){this._muteViewportUpdates=true;this._viewport.setStickToBottom(false);if(this._waitForScrollTimeout){clearTimeout(this._waitForScrollTimeout);delete this._waitForScrollTimeout;}}
_updateStickToBottomOnMouseUp(){if(!this._muteViewportUpdates)
return;this._waitForScrollTimeout=setTimeout(updateViewportState.bind(this),200);function updateViewportState(){this._muteViewportUpdates=false;this._viewport.setStickToBottom(this._messagesElement.isScrolledToBottom());if(this._maybeDirtyWhileMuted){this._scheduleViewportRefresh();delete this._maybeDirtyWhileMuted;}
delete this._waitForScrollTimeout;this._updateViewportStickinessForTest();}}
_updateViewportStickinessForTest(){}
_updateStickToBottomOnWheel(){this._updateStickToBottomOnMouseDown();this._updateStickToBottomOnMouseUp();}
_promptInput(event){if(this.itemCount()!==0&&this._viewport.firstVisibleIndex()!==this.itemCount())
this._immediatelyScrollToBottom();}};Console.ConsoleView.persistedHistorySize=300;Console.ConsoleViewFilter=class{constructor(filterChangedCallback){this._showTargetMessagesCheckbox=new UI.ToolbarCheckbox(Common.UIString('Selected context only'),Common.UIString('Only show messages from the current context (top, iframe, worker, extension)'),filterChangedCallback);this._filterChanged=filterChangedCallback;this._messageURLFiltersSetting=Common.settings.createSetting('messageURLFilters',{});this._messageLevelFiltersSetting=Common.settings.createSetting('messageLevelFilters2',ConsoleModel.ConsoleMessage.MessageLevel.Info);this._hideNetworkMessagesSetting=Common.moduleSetting('hideNetworkMessages');this._messageURLFiltersSetting.addChangeListener(this._filterChanged);this._messageLevelFiltersSetting.addChangeListener(this._filterChanged);this._hideNetworkMessagesSetting.addChangeListener(this._filterChanged);this._textFilterUI=new UI.ToolbarInput(Common.UIString('Filter'),0.2,1,true);this._textFilterUI.addEventListener(UI.ToolbarInput.Event.TextChanged,this._textFilterChanged,this);var levels=[{value:ConsoleModel.ConsoleMessage.MessageLevel.Verbose,label:Common.UIString('Verbose')},{value:ConsoleModel.ConsoleMessage.MessageLevel.Info,label:Common.UIString('Info'),default:true},{value:ConsoleModel.ConsoleMessage.MessageLevel.Warning,label:Common.UIString('Warnings')},{value:ConsoleModel.ConsoleMessage.MessageLevel.Error,label:Common.UIString('Errors')}];this._levelComboBox=new UI.ToolbarSettingComboBox(levels,this._messageLevelFiltersSetting,Common.UIString('Level'));}
_textFilterChanged(){this._filterText=this._textFilterUI.value();this._filterRegex=null;if(this._filterText.startsWith('/')&&this._filterText.endsWith('/')){try{this._filterRegex=new RegExp(this._filterText.substring(1,this._filterText.length-1),'i');}catch(e){}}
this._filterChanged();}
addMessageURLFilter(url){var value=this._messageURLFiltersSetting.get();value[url]=true;this._messageURLFiltersSetting.set(value);}
removeMessageURLFilter(url){var value;if(url){value=this._messageURLFiltersSetting.get();delete value[url];}else{value={};}
this._messageURLFiltersSetting.set(value);}
messageURLFilters(){return this._messageURLFiltersSetting.get();}
shouldBeVisible(viewMessage){var message=viewMessage.consoleMessage();var executionContext=UI.context.flavor(SDK.ExecutionContext);if(this._showTargetMessagesCheckbox.checked()&&executionContext){if(message.target()!==executionContext.target())
return false;if(message.executionContextId&&message.executionContextId!==executionContext.id)
return false;}
if(this._hideNetworkMessagesSetting.get()&&viewMessage.consoleMessage().source===ConsoleModel.ConsoleMessage.MessageSource.Network)
return false;if(viewMessage.consoleMessage().isGroupMessage())
return true;if(message.type===ConsoleModel.ConsoleMessage.MessageType.Result||message.type===ConsoleModel.ConsoleMessage.MessageType.Command)
return true;if(message.url&&this._messageURLFiltersSetting.get()[message.url])
return false;var filterOrdinal=ConsoleModel.ConsoleMessage.MessageLevel.ordinal((this._messageLevelFiltersSetting.get()));if(message.level&&ConsoleModel.ConsoleMessage.MessageLevel.ordinal(message.level)<filterOrdinal)
return false;if(this._filterRegex){if(!viewMessage.matchesFilterRegex(this._filterRegex))
return false;}else if(this._filterText){if(!viewMessage.matchesFilterText(this._filterText))
return false;}
return true;}
reset(){this._messageURLFiltersSetting.set({});this._messageLevelFiltersSetting.set(ConsoleModel.ConsoleMessage.MessageLevel.Info);this._showTargetMessagesCheckbox.inputElement.checked=false;this._hideNetworkMessagesSetting.set(false);this._textFilterUI.setValue('');this._textFilterChanged();}};Console.ConsoleCommand=class extends Console.ConsoleViewMessage{constructor(message,linkifier,nestingLevel){super(message,linkifier,nestingLevel);}
contentElement(){if(!this._contentElement){this._contentElement=createElementWithClass('div','console-user-command');var icon=UI.Icon.create('smallicon-user-command','command-result-icon');this._contentElement.appendChild(icon);this._contentElement.message=this;this._formattedCommand=createElementWithClass('span','source-code');this._formattedCommand.textContent=this.text.replaceControlCharacters();this._contentElement.appendChild(this._formattedCommand);if(this._formattedCommand.textContent.length<Console.ConsoleCommand.MaxLengthToIgnoreHighlighter){var javascriptSyntaxHighlighter=new UI.SyntaxHighlighter('text/javascript',true);javascriptSyntaxHighlighter.syntaxHighlightNode(this._formattedCommand).then(this._updateSearch.bind(this));}else{this._updateSearch();}
this.updateTimestamp();}
return this._contentElement;}
_updateSearch(){this.setSearchRegex(this.searchRegex());}};Console.ConsoleCommand.MaxLengthToIgnoreHighlighter=10000;Console.ConsoleCommandResult=class extends Console.ConsoleViewMessage{constructor(message,linkifier,nestingLevel){super(message,linkifier,nestingLevel);}
contentElement(){var element=super.contentElement();if(!element.classList.contains('console-user-command-result')){element.classList.add('console-user-command-result');if(this.consoleMessage().level===ConsoleModel.ConsoleMessage.MessageLevel.Info){var icon=UI.Icon.create('smallicon-command-result','command-result-icon');element.insertBefore(icon,element.firstChild);}}
return element;}};Console.ConsoleGroup=class{constructor(parentGroup,groupMessage){this._parentGroup=parentGroup;this._nestingLevel=parentGroup?parentGroup.nestingLevel()+1:0;this._messagesHidden=groupMessage&&groupMessage.collapsed()||this._parentGroup&&this._parentGroup.messagesHidden();}
static createTopGroup(){return new Console.ConsoleGroup(null,null);}
messagesHidden(){return this._messagesHidden;}
nestingLevel(){return this._nestingLevel;}
parentGroup(){return this._parentGroup||this;}};Console.ConsoleView.ActionDelegate=class{handleAction(context,actionId){switch(actionId){case'console.show':Common.console.show();return true;case'console.clear':Console.ConsoleView.clearConsole();return true;case'console.clear.history':Console.ConsoleView.instance()._clearHistory();return true;}
return false;}};Console.ConsoleView.RegexMatchRange;;Console.ConsolePanel=class extends UI.Panel{constructor(){super('console');this._view=Console.ConsoleView.instance();}
static instance(){return(self.runtime.sharedInstance(Console.ConsolePanel));}
wasShown(){super.wasShown();var wrapper=Console.ConsolePanel.WrapperView._instance;if(wrapper&&wrapper.isShowing())
UI.inspectorView.setDrawerMinimized(true);this._view.show(this.element);}
willHide(){super.willHide();if(Console.ConsolePanel.WrapperView._instance)
Console.ConsolePanel.WrapperView._instance._showViewInWrapper();UI.inspectorView.setDrawerMinimized(false);}
searchableView(){return Console.ConsoleView.instance().searchableView();}};Console.ConsolePanel.WrapperView=class extends UI.VBox{constructor(){super();this.element.classList.add('console-view-wrapper');Console.ConsolePanel.WrapperView._instance=this;this._view=Console.ConsoleView.instance();}
wasShown(){if(!Console.ConsolePanel.instance().isShowing())
this._showViewInWrapper();else
UI.inspectorView.setDrawerMinimized(true);}
willHide(){UI.inspectorView.setDrawerMinimized(false);}
_showViewInWrapper(){this._view.show(this.element);}};Console.ConsolePanel.ConsoleRevealer=class{reveal(object){var consoleView=Console.ConsoleView.instance();if(consoleView.isShowing()){consoleView.focus();return Promise.resolve();}
UI.viewManager.showView('console-view');return Promise.resolve();}};;Runtime.cachedResources["console/consoleView.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.console-view {\n    background-color: white;\n    overflow: hidden;\n}\n\n.console-view > .toolbar {\n    border-bottom: 1px solid #dadada;\n}\n\n.console-view-wrapper {\n    background-color: #eee;\n}\n\n.console-view-fix-select-all {\n    height: 0;\n    overflow: hidden;\n}\n\n.console-settings-pane {\n    flex: none;\n    border-bottom: 1px solid #dadada;\n}\n\n.console-settings-pane .toolbar {\n    flex: 1 1;\n}\n\n#console-messages {\n    flex: 1 1;\n    padding: 2px 0;\n    overflow-y: auto;\n    word-wrap: break-word;\n    -webkit-user-select: text;\n    transform: translateZ(0);\n}\n\n#console-prompt {\n    clear: right;\n    position: relative;\n    margin: 0 22px 0 20px;\n    min-height: 18px;  /* Sync with ConsoleViewMessage.js */\n}\n\n#console-prompt .CodeMirror {\n    padding: 3px 0 1px 0;\n}\n\n#console-prompt .CodeMirror-line {\n    padding-top: 0;\n}\n\n#console-prompt .CodeMirror-lines {\n    padding-top: 0;\n}\n\n#console-prompt .console-prompt-icon {\n    position: absolute;\n    left: -13px;\n    top: 5px;\n    -webkit-user-select: none;\n}\n\n.console-message,\n.console-user-command {\n    clear: right;\n    position: relative;\n    padding: 3px 22px 1px 0;\n    margin-left: 24px;\n    min-height: 18px;  /* Sync with ConsoleViewMessage.js */\n    flex: auto;\n    display: flex;\n}\n\n.console-message > * {\n    flex: auto;\n}\n\n.console-timestamp {\n    color: gray;\n    -webkit-user-select: none;\n    flex: none;\n    margin-right: 5px;\n}\n\n.message-level-icon, .command-result-icon {\n    position: absolute;\n    left: -17px;\n    top: 4px;\n    -webkit-user-select: none;\n}\n\n.console-message-repeat-count {\n    margin: 2px 0 0 10px;\n    flex: none;\n}\n\n.repeated-message {\n    margin-left: 4px;\n}\n\n.repeated-message .message-level-icon {\n    display: none;\n}\n\n.repeated-message .console-message-stack-trace-toggle,\n.repeated-message > .console-message-text {\n    flex: 1;\n}\n\n.console-error-level .repeated-message,\n.console-warning-level .repeated-message,\n.console-verbose-level .repeated-message,\n.console-info-level .repeated-message {\n    display: flex;\n}\n\n.console-info {\n    color: rgb(128, 128, 128);\n    font-style: italic;\n    padding-bottom: 2px;\n}\n\n.console-group .console-group > .console-group-messages {\n    margin-left: 16px;\n}\n\n.console-group-title {\n    font-weight: bold;\n}\n\n.expand-group-icon {\n    -webkit-user-select: none;\n    position: absolute;\n    background-color: rgb(110, 110, 110);\n    left: -14px;\n}\n\n.console-group {\n    position: relative;\n}\n\n.console-message-wrapper {\n    display: flex;\n    border-bottom: 1px solid rgb(240, 240, 240);\n}\n\n.console-message-wrapper.console-adjacent-user-command-result {\n    border-bottom: none;\n}\n\n.console-message-wrapper.console-error-level {\n    border-top: 1px solid hsl(0, 100%, 92%);\n    border-bottom: 1px solid hsl(0, 100%, 92%);\n    margin-top: -1px;\n}\n\n.console-message-wrapper.console-warning-level {\n    border-top: 1px solid hsl(50, 100%, 88%);\n    border-bottom: 1px solid hsl(50, 100%, 88%);\n    margin-top: -1px;\n}\n\n.console-message-wrapper .nesting-level-marker {\n    width: 14px;\n    flex: 0 0 auto;\n    border-right: 1px solid #a5a5a5;\n    position: relative;\n    margin-bottom: -1px;\n}\n\n.console-message-wrapper:last-child .nesting-level-marker::before,\n.console-message-wrapper .nesting-level-marker.group-closed::before {\n    content: \"\";\n}\n\n.console-message-wrapper .nesting-level-marker::before {\n    border-bottom: 1px solid #a5a5a5;\n    position: absolute;\n    top: 0;\n    left: 0;\n    margin-left: 100%;\n    width: 3px;\n    height: 100%;\n    box-sizing: border-box;\n}\n\n.console-error-level {\n    background-color: hsl(0, 100%, 97%);\n}\n\n.-theme-with-dark-background .console-error-level {\n    background-color: hsl(0, 100%, 8%);\n}\n\n.console-warning-level {\n    background-color: hsl(50, 100%, 95%);\n}\n\n.-theme-with-dark-background .console-warning-level {\n    background-color: hsl(50, 100%, 10%);\n}\n\n.console-warning-level .console-message-text {\n    color: hsl(39, 100%, 18%);\n}\n\n.console-error-level .console-message-text,\n.console-error-level .console-view-object-properties-section {\n    color: red !important;\n}\n\n.-theme-with-dark-background .console-error-level .console-message-text,\n.-theme-with-dark-background .console-error-level .console-view-object-properties-section {\n    color: hsl(0, 100%, 75%) !important;\n}\n\n.-theme-with-dark-background .console-verbose-level .console-message-text {\n    color: hsl(220, 100%, 65%) !important;\n}\n\n.console-message.console-warning-level {\n    background-color: rgb(255, 250, 224);\n}\n\n#console-messages .link {\n    text-decoration: underline;\n}\n\n#console-messages .link,\n#console-messages .devtools-link {\n    color: rgb(33%, 33%, 33%);\n    cursor: pointer;\n    word-break: break-all;\n}\n\n#console-messages .link:hover,\n#console-messages .devtools-link:hover {\n    color: rgb(15%, 15%, 15%);\n}\n\n.console-group-messages .section {\n    margin: 0 0 0 12px !important;\n}\n\n.console-group-messages .section > .header {\n    padding: 0 8px 0 0;\n    background-image: none;\n    border: none;\n    min-height: 0;\n}\n\n.console-group-messages .section > .header::before {\n    margin-left: -12px;\n}\n\n.console-group-messages .section > .header .title {\n    color: #222;\n    font-weight: normal;\n    line-height: 13px;\n}\n\n.console-group-messages .section .properties li .info {\n    padding-top: 0;\n    padding-bottom: 0;\n    color: rgb(60%, 60%, 60%);\n}\n\n.console-object-preview {\n    white-space: normal;\n    word-wrap: break-word;\n    font-style: italic;\n}\n\n.console-object-preview .name {\n    /* Follows .section .properties .name, .event-properties .name */\n    color: rgb(136, 19, 145);\n    flex-shrink: 0;\n}\n\n.console-message-text .object-value-string {\n    white-space: pre-wrap;\n}\n\n.console-message-formatted-table {\n    clear: both;\n}\n\n.console-message-anchor {\n    float: right;\n    text-align: right;\n    max-width: 100%;\n    margin-left: 4px;\n}\n\n.console-message-nowrap-below,\n.console-message-nowrap-below div,\n.console-message-nowrap-below span {\n    white-space: nowrap !important;\n}\n\n.object-state-note {\n    display: inline-block;\n    width: 11px;\n    height: 11px;\n    color: white;\n    text-align: center;\n    border-radius: 3px;\n    line-height: 13px;\n    margin: 0 6px;\n    font-size: 9px;\n}\n\n.-theme-with-dark-background .object-state-note {\n    background-color: hsl(230, 100%, 80%);\n}\n\n.info-note {\n    background-color: rgb(179, 203, 247);\n}\n\n.info-note::before {\n    content: \"i\";\n}\n\n.console-view-object-properties-section:not(.expanded) .info-note {\n    display: none;\n}\n\n.console-view-object-properties-section {\n    padding: 0px;\n}\n\n.console-message-stack-trace-toggle {\n    display: flex;\n    flex-direction: row;\n    align-items: flex-start;\n}\n\n.console-message-stack-trace-wrapper {\n    flex: 1 1 auto;\n    display: flex;\n    flex-direction: column;\n    align-items: stretch;\n}\n\n.console-message-stack-trace-wrapper > * {\n    flex: none;\n}\n\n.console-message-expand-icon {\n    margin-bottom: -2px;\n}\n/*# sourceURL=console/consoleView.css */";