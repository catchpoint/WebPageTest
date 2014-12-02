WebInspector.Spectrum=function()
{WebInspector.VBox.call(this);this.registerRequiredCSS("spectrum.css");this.element.classList.add("spectrum-container");this.element.tabIndex=0;var topElement=this.element.createChild("div","spectrum-top");topElement.createChild("div","spectrum-fill");var topInnerElement=topElement.createChild("div","spectrum-top-inner fill");this._draggerElement=topInnerElement.createChild("div","spectrum-color");this._dragHelperElement=this._draggerElement.createChild("div","spectrum-sat fill").createChild("div","spectrum-val fill").createChild("div","spectrum-dragger");this._sliderElement=topInnerElement.createChild("div","spectrum-hue");this.slideHelper=this._sliderElement.createChild("div","spectrum-slider");var rangeContainer=this.element.createChild("div","spectrum-range-container");var alphaLabel=rangeContainer.createChild("label");alphaLabel.textContent=WebInspector.UIString("\u03B1:");this._alphaElement=rangeContainer.createChild("input","spectrum-range");this._alphaElement.setAttribute("type","range");this._alphaElement.setAttribute("min","0");this._alphaElement.setAttribute("max","100");this._alphaElement.addEventListener("input",alphaDrag.bind(this),false);this._alphaElement.addEventListener("change",alphaDrag.bind(this),false);var swatchElement=document.createElement("span");swatchElement.className="swatch";this._swatchInnerElement=swatchElement.createChild("span","swatch-inner");var displayContainer=this.element.createChild("div");displayContainer.appendChild(swatchElement);this._displayElement=displayContainer.createChild("span","source-code spectrum-display-value");WebInspector.Spectrum.draggable(this._sliderElement,hueDrag.bind(this));WebInspector.Spectrum.draggable(this._draggerElement,colorDrag.bind(this),colorDragStart.bind(this));function hueDrag(element,dragX,dragY)
{this._hsv[0]=(this.slideHeight-dragY)/this.slideHeight;this._onchange();}
var initialHelperOffset;function colorDragStart()
{initialHelperOffset={x:this._dragHelperElement.offsetLeft,y:this._dragHelperElement.offsetTop};}
function colorDrag(element,dragX,dragY,event)
{if(event.shiftKey){if(Math.abs(dragX-initialHelperOffset.x)>=Math.abs(dragY-initialHelperOffset.y))
dragY=initialHelperOffset.y;else
dragX=initialHelperOffset.x;}
this._hsv[1]=dragX/this.dragWidth;this._hsv[2]=(this.dragHeight-dragY)/this.dragHeight;this._onchange();}
function alphaDrag()
{this._hsv[3]=this._alphaElement.value/100;this._onchange();}};WebInspector.Spectrum.Events={ColorChanged:"ColorChanged"};WebInspector.Spectrum.draggable=function(element,onmove,onstart,onstop){var doc=document;var dragging;var offset;var scrollOffset;var maxHeight;var maxWidth;function consume(e)
{e.consume(true);}
function move(e)
{if(dragging){var dragX=Math.max(0,Math.min(e.pageX-offset.left+scrollOffset.left,maxWidth));var dragY=Math.max(0,Math.min(e.pageY-offset.top+scrollOffset.top,maxHeight));if(onmove)
onmove(element,dragX,dragY,(e));}}
function start(e)
{var mouseEvent=(e);var rightClick=mouseEvent.which?(mouseEvent.which===3):(mouseEvent.button===2);if(!rightClick&&!dragging){if(onstart)
onstart(element,mouseEvent);dragging=true;maxHeight=element.clientHeight;maxWidth=element.clientWidth;scrollOffset=element.scrollOffset();offset=element.totalOffset();doc.addEventListener("selectstart",consume,false);doc.addEventListener("dragstart",consume,false);doc.addEventListener("mousemove",move,false);doc.addEventListener("mouseup",stop,false);move(mouseEvent);consume(mouseEvent);}}
function stop(e)
{if(dragging){doc.removeEventListener("selectstart",consume,false);doc.removeEventListener("dragstart",consume,false);doc.removeEventListener("mousemove",move,false);doc.removeEventListener("mouseup",stop,false);if(onstop)
onstop(element,(e));}
dragging=false;}
element.addEventListener("mousedown",start,false);};WebInspector.Spectrum.prototype={setColor:function(color)
{this._hsv=color.hsva();},color:function()
{return WebInspector.Color.fromHSVA(this._hsv);},_colorString:function()
{var cf=WebInspector.Color.Format;var format=this._originalFormat;var color=this.color();var originalFormatString=color.toString(this._originalFormat);if(originalFormatString)
return originalFormatString;if(color.hasAlpha()){if(format===cf.HSLA||format===cf.HSL)
return color.toString(cf.HSLA);else
return color.toString(cf.RGBA);}
if(format===cf.ShortHEX)
return color.toString(cf.HEX);console.assert(format===cf.Nickname);return color.toString(cf.RGB);},set displayText(text)
{this._displayElement.textContent=text;},_onchange:function()
{this._updateUI();this.dispatchEventToListeners(WebInspector.Spectrum.Events.ColorChanged,this._colorString());},_updateHelperLocations:function()
{var h=this._hsv[0];var s=this._hsv[1];var v=this._hsv[2];var dragX=s*this.dragWidth;var dragY=this.dragHeight-(v*this.dragHeight);dragX=Math.max(-this._dragHelperElementHeight,Math.min(this.dragWidth-this._dragHelperElementHeight,dragX-this._dragHelperElementHeight));dragY=Math.max(-this._dragHelperElementHeight,Math.min(this.dragHeight-this._dragHelperElementHeight,dragY-this._dragHelperElementHeight));this._dragHelperElement.positionAt(dragX,dragY);var slideY=this.slideHeight-((h*this.slideHeight)+this.slideHelperHeight);this.slideHelper.style.top=slideY+"px";this._alphaElement.value=this._hsv[3]*100;},_updateUI:function()
{this._updateHelperLocations();this._draggerElement.style.backgroundColor=WebInspector.Color.fromHSVA([this._hsv[0],1,1,1]).toString(WebInspector.Color.Format.RGB);this._swatchInnerElement.style.backgroundColor=this.color().toString(WebInspector.Color.Format.RGBA);this._alphaElement.value=this._hsv[3]*100;},wasShown:function()
{this.slideHeight=this._sliderElement.offsetHeight;this.dragWidth=this._draggerElement.offsetWidth;this.dragHeight=this._draggerElement.offsetHeight;this._dragHelperElementHeight=this._dragHelperElement.offsetHeight/2;this.slideHelperHeight=this.slideHelper.offsetHeight/2;this._updateUI();},__proto__:WebInspector.VBox.prototype}
WebInspector.SpectrumPopupHelper=function()
{this._spectrum=new WebInspector.Spectrum();this._spectrum.element.addEventListener("keydown",this._onKeyDown.bind(this),false);this._popover=new WebInspector.Popover();this._popover.setCanShrink(false);this._popover.element.addEventListener("mousedown",consumeEvent,false);this._hideProxy=this.hide.bind(this,true);}
WebInspector.SpectrumPopupHelper.Events={Hidden:"Hidden"};WebInspector.SpectrumPopupHelper.prototype={spectrum:function()
{return this._spectrum;},toggle:function(element,color,format)
{if(this._popover.isShowing())
this.hide(true);else
this.show(element,color,format);return this._popover.isShowing();},show:function(element,color,format)
{if(this._popover.isShowing()){if(this._anchorElement===element)
return false;this.hide(true);}
this._anchorElement=element;this._spectrum.setColor(color);this._spectrum._originalFormat=format!==WebInspector.Color.Format.Original?format:color.format();this.reposition(element);document.addEventListener("mousedown",this._hideProxy,false);window.addEventListener("blur",this._hideProxy,false);return true;},reposition:function(element)
{if(!this._previousFocusElement)
this._previousFocusElement=WebInspector.currentFocusElement();this._popover.showView(this._spectrum,element);WebInspector.setCurrentFocusElement(this._spectrum.element);},hide:function(commitEdit)
{if(!this._popover.isShowing())
return;this._popover.hide();document.removeEventListener("mousedown",this._hideProxy,false);window.removeEventListener("blur",this._hideProxy,false);this.dispatchEventToListeners(WebInspector.SpectrumPopupHelper.Events.Hidden,!!commitEdit);WebInspector.setCurrentFocusElement(this._previousFocusElement);delete this._previousFocusElement;delete this._anchorElement;},_onKeyDown:function(event)
{if(event.keyIdentifier==="Enter"){this.hide(true);event.consume(true);return;}
if(event.keyIdentifier==="U+001B"){this.hide(false);event.consume(true);}},__proto__:WebInspector.Object.prototype}
WebInspector.ColorSwatch=function(readOnly)
{this.element=document.createElement("span");this._swatchInnerElement=this.element.createChild("span","swatch-inner");var shiftClickMessage=WebInspector.UIString("Shift-click to change color format.");this.element.title=readOnly?shiftClickMessage:String.sprintf("%s\n%s",WebInspector.UIString("Click to open a colorpicker."),shiftClickMessage);this.element.className="swatch";this.element.addEventListener("mousedown",consumeEvent,false);this.element.addEventListener("dblclick",consumeEvent,false);}
WebInspector.ColorSwatch.prototype={setColorString:function(colorString)
{this._swatchInnerElement.style.backgroundColor=colorString;}};WebInspector.DOMSyntaxHighlighter=function(mimeType,stripExtraWhitespace)
{this._mimeType=mimeType;this._stripExtraWhitespace=stripExtraWhitespace;}
WebInspector.DOMSyntaxHighlighter.prototype={createSpan:function(content,className)
{var span=document.createElement("span");span.className="cm-"+className;if(this._stripExtraWhitespace&&className!=="whitespace")
content=content.replace(/^[\n\r]*/,"").replace(/\s*$/,"");span.appendChild(document.createTextNode(content));return span;},syntaxHighlightNode:function(node)
{var lines=node.textContent.split("\n");node.removeChildren();function processToken(token,tokenType,column,newColumn)
{if(!tokenType)
return;if(column>plainTextStart){var plainText=line.substring(plainTextStart,column);node.appendChild(document.createTextNode(plainText));}
node.appendChild(this.createSpan(token,tokenType));plainTextStart=newColumn;}
var tokenize=WebInspector.moduleManager.instance(WebInspector.TokenizerFactory).createTokenizer(this._mimeType);for(var i=lines[0].length?0:1;i<lines.length;++i){var line=lines[i];var plainTextStart=0;tokenize(line,processToken.bind(this));if(plainTextStart<line.length){var plainText=line.substring(plainTextStart,line.length);node.appendChild(document.createTextNode(plainText));}
if(i<lines.length-1)
node.appendChild(document.createElement("br"));}}};WebInspector.ElementsTreeOutline=function(target,omitRootDOMNode,selectEnabled,contextMenuCallback,setPseudoClassCallback)
{this._target=target;this._domModel=target.domModel;this.element=document.createElement("ol");this.element.className="elements-tree-outline";this.element.addEventListener("mousedown",this._onmousedown.bind(this),false);this.element.addEventListener("mousemove",this._onmousemove.bind(this),false);this.element.addEventListener("mouseout",this._onmouseout.bind(this),false);this.element.addEventListener("dragstart",this._ondragstart.bind(this),false);this.element.addEventListener("dragover",this._ondragover.bind(this),false);this.element.addEventListener("dragleave",this._ondragleave.bind(this),false);this.element.addEventListener("drop",this._ondrop.bind(this),false);this.element.addEventListener("dragend",this._ondragend.bind(this),false);this.element.addEventListener("keydown",this._onkeydown.bind(this),false);TreeOutline.call(this,this.element);this._includeRootDOMNode=!omitRootDOMNode;this._selectEnabled=selectEnabled;this._rootDOMNode=null;this._selectedDOMNode=null;this._eventSupport=new WebInspector.Object();this._visible=false;this.element.addEventListener("contextmenu",this._contextMenuEventFired.bind(this),true);this._contextMenuCallback=contextMenuCallback;this._setPseudoClassCallback=setPseudoClassCallback;this._createNodeDecorators();}
WebInspector.ElementsTreeOutline.Events={SelectedNodeChanged:"SelectedNodeChanged",ElementsTreeUpdated:"ElementsTreeUpdated"}
WebInspector.ElementsTreeOutline.MappedCharToEntity={"\u00a0":"nbsp","\u2002":"ensp","\u2003":"emsp","\u2009":"thinsp","\u200a":"#8202","\u200b":"#8203","\u200c":"zwnj","\u200d":"zwj","\u200e":"lrm","\u200f":"rlm","\u202a":"#8234","\u202b":"#8235","\u202c":"#8236","\u202d":"#8237","\u202e":"#8238"}
WebInspector.ElementsTreeOutline.prototype={target:function()
{return this._target;},domModel:function()
{return this._domModel;},setVisibleWidth:function(width)
{this._visibleWidth=width;if(this._multilineEditing)
this._multilineEditing.setWidth(this._visibleWidth);},_createNodeDecorators:function()
{this._nodeDecorators=[];this._nodeDecorators.push(new WebInspector.ElementsTreeOutline.PseudoStateDecorator());},wireToDOMModel:function()
{this._elementsTreeUpdater=new WebInspector.ElementsTreeUpdater(this._target.domModel,this);},unwireFromDOMModel:function()
{if(this._elementsTreeUpdater)
this._elementsTreeUpdater.dispose();},setVisible:function(visible)
{this._visible=visible;if(!this._visible)
return;this._updateModifiedNodes();if(this._selectedDOMNode)
this._revealAndSelectNode(this._selectedDOMNode,false);},addEventListener:function(eventType,listener,thisObject)
{this._eventSupport.addEventListener(eventType,listener,thisObject);},removeEventListener:function(eventType,listener,thisObject)
{this._eventSupport.removeEventListener(eventType,listener,thisObject);},get rootDOMNode()
{return this._rootDOMNode;},set rootDOMNode(x)
{if(this._rootDOMNode===x)
return;this._rootDOMNode=x;this._isXMLMimeType=x&&x.isXMLNode();this.update();},get isXMLMimeType()
{return this._isXMLMimeType;},selectedDOMNode:function()
{return this._selectedDOMNode;},selectDOMNode:function(node,focus)
{if(this._selectedDOMNode===node){this._revealAndSelectNode(node,!focus);return;}
this._selectedDOMNode=node;this._revealAndSelectNode(node,!focus);if(this._selectedDOMNode===node)
this._selectedNodeChanged();},editing:function()
{var node=this.selectedDOMNode();if(!node)
return false;var treeElement=this.findTreeElement(node);if(!treeElement)
return false;return treeElement._editing||false;},update:function()
{var selectedNode=this.selectedTreeElement?this.selectedTreeElement._node:null;this.removeChildren();if(!this.rootDOMNode)
return;var treeElement;if(this._includeRootDOMNode){treeElement=new WebInspector.ElementsTreeElement(this.rootDOMNode);treeElement.selectable=this._selectEnabled;this.appendChild(treeElement);}else{var node=this.rootDOMNode.firstChild;while(node){treeElement=new WebInspector.ElementsTreeElement(node);treeElement.selectable=this._selectEnabled;this.appendChild(treeElement);node=node.nextSibling;}}
if(selectedNode)
this._revealAndSelectNode(selectedNode,true);},updateSelection:function()
{if(!this.selectedTreeElement)
return;var element=this.treeOutline.selectedTreeElement;element.updateSelection();},updateOpenCloseTags:function(node)
{var treeElement=this.findTreeElement(node);if(treeElement)
treeElement.updateTitle();var children=treeElement.children;var closingTagElement=children[children.length-1];if(closingTagElement&&closingTagElement._elementCloseTag)
closingTagElement.updateTitle();},_selectedNodeChanged:function()
{this._eventSupport.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged,this._selectedDOMNode);},_fireElementsTreeUpdated:function(nodes)
{this._eventSupport.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.ElementsTreeUpdated,nodes);},findTreeElement:function(node)
{function isAncestorNode(ancestor,node)
{return ancestor.isAncestor(node);}
function parentNode(node)
{return node.parentNode;}
var treeElement=TreeOutline.prototype.findTreeElement.call(this,node,isAncestorNode,parentNode);if(!treeElement&&node.nodeType()===Node.TEXT_NODE){treeElement=TreeOutline.prototype.findTreeElement.call(this,node.parentNode,isAncestorNode,parentNode);}
return treeElement;},createTreeElementFor:function(node)
{var treeElement=this.findTreeElement(node);if(treeElement)
return treeElement;if(!node.parentNode)
return null;treeElement=this.createTreeElementFor(node.parentNode);return treeElement?treeElement._showChild(node):null;},set suppressRevealAndSelect(x)
{if(this._suppressRevealAndSelect===x)
return;this._suppressRevealAndSelect=x;},_revealAndSelectNode:function(node,omitFocus)
{if(this._suppressRevealAndSelect)
return;if(!this._includeRootDOMNode&&node===this.rootDOMNode&&this.rootDOMNode)
node=this.rootDOMNode.firstChild;if(!node)
return;var treeElement=this.createTreeElementFor(node);if(!treeElement)
return;treeElement.revealAndSelect(omitFocus);},_treeElementFromEvent:function(event)
{var scrollContainer=this.element.parentElement;var x=scrollContainer.totalOffsetLeft()+scrollContainer.offsetWidth-36;var y=event.pageY;var elementUnderMouse=this.treeElementFromPoint(x,y);var elementAboveMouse=this.treeElementFromPoint(x,y-2);var element;if(elementUnderMouse===elementAboveMouse)
element=elementUnderMouse;else
element=this.treeElementFromPoint(x,y+2);return element;},_onmousedown:function(event)
{var element=this._treeElementFromEvent(event);if(!element||element.isEventWithinDisclosureTriangle(event))
return;element.select();},_onmousemove:function(event)
{var element=this._treeElementFromEvent(event);if(element&&this._previousHoveredElement===element)
return;if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
if(element){element.hovered=true;this._previousHoveredElement=element;}
if(element&&element._node)
this._domModel.highlightDOMNodeWithConfig(element._node.id,{mode:"all",showInfo:!WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)});else
this._domModel.hideDOMNodeHighlight();},_onmouseout:function(event)
{var nodeUnderMouse=document.elementFromPoint(event.pageX,event.pageY);if(nodeUnderMouse&&nodeUnderMouse.isDescendant(this.element))
return;if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
this._domModel.hideDOMNodeHighlight();},_ondragstart:function(event)
{if(!window.getSelection().isCollapsed)
return false;if(event.target.nodeName==="A")
return false;var treeElement=this._treeElementFromEvent(event);if(!treeElement)
return false;if(!this._isValidDragSourceOrTarget(treeElement))
return false;if(treeElement._node.nodeName()==="BODY"||treeElement._node.nodeName()==="HEAD")
return false;event.dataTransfer.setData("text/plain",treeElement.listItemElement.textContent);event.dataTransfer.effectAllowed="copyMove";this._treeElementBeingDragged=treeElement;this._domModel.hideDOMNodeHighlight();return true;},_ondragover:function(event)
{if(!this._treeElementBeingDragged)
return false;var treeElement=this._treeElementFromEvent(event);if(!this._isValidDragSourceOrTarget(treeElement))
return false;var node=treeElement._node;while(node){if(node===this._treeElementBeingDragged._node)
return false;node=node.parentNode;}
treeElement.updateSelection();treeElement.listItemElement.classList.add("elements-drag-over");this._dragOverTreeElement=treeElement;event.preventDefault();event.dataTransfer.dropEffect='move';return false;},_ondragleave:function(event)
{this._clearDragOverTreeElementMarker();event.preventDefault();return false;},_isValidDragSourceOrTarget:function(treeElement)
{if(!treeElement)
return false;var node=treeElement.representedObject;if(!(node instanceof WebInspector.DOMNode))
return false;if(!node.parentNode||node.parentNode.nodeType()!==Node.ELEMENT_NODE)
return false;return true;},_ondrop:function(event)
{event.preventDefault();var treeElement=this._treeElementFromEvent(event);if(treeElement)
this._doMove(treeElement);},_doMove:function(treeElement)
{if(!this._treeElementBeingDragged)
return;var parentNode;var anchorNode;if(treeElement._elementCloseTag){parentNode=treeElement._node;}else{var dragTargetNode=treeElement._node;parentNode=dragTargetNode.parentNode;anchorNode=dragTargetNode;}
var wasExpanded=this._treeElementBeingDragged.expanded;this._treeElementBeingDragged._node.moveTo(parentNode,anchorNode,this._selectNodeAfterEdit.bind(this,wasExpanded));delete this._treeElementBeingDragged;},_ondragend:function(event)
{event.preventDefault();this._clearDragOverTreeElementMarker();delete this._treeElementBeingDragged;},_clearDragOverTreeElementMarker:function()
{if(this._dragOverTreeElement){this._dragOverTreeElement.updateSelection();this._dragOverTreeElement.listItemElement.classList.remove("elements-drag-over");delete this._dragOverTreeElement;}},_onkeydown:function(event)
{var keyboardEvent=(event);var node=(this.selectedDOMNode());console.assert(node);var treeElement=this.getCachedTreeElement(node);if(!treeElement)
return;if(!treeElement._editing&&WebInspector.KeyboardShortcut.hasNoModifiers(keyboardEvent)&&keyboardEvent.keyCode===WebInspector.KeyboardShortcut.Keys.H.code){this._toggleHideShortcut(node);event.consume(true);return;}},_contextMenuEventFired:function(event)
{var treeElement=this._treeElementFromEvent(event);if(!treeElement)
return;var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendApplicableItems(treeElement._node);contextMenu.show();},populateContextMenu:function(contextMenu,event)
{var treeElement=this._treeElementFromEvent(event);if(!treeElement)
return;var isPseudoElement=!!treeElement._node.pseudoType();var isTag=treeElement._node.nodeType()===Node.ELEMENT_NODE&&!isPseudoElement;var textNode=event.target.enclosingNodeOrSelfWithClass("webkit-html-text-node");if(textNode&&textNode.classList.contains("bogus"))
textNode=null;var commentNode=event.target.enclosingNodeOrSelfWithClass("webkit-html-comment");contextMenu.appendApplicableItems(event.target);if(textNode){contextMenu.appendSeparator();treeElement._populateTextContextMenu(contextMenu,textNode);}else if(isTag){contextMenu.appendSeparator();treeElement._populateTagContextMenu(contextMenu,event);}else if(commentNode){contextMenu.appendSeparator();treeElement._populateNodeContextMenu(contextMenu,textNode);}else if(isPseudoElement){treeElement._populateScrollIntoView(contextMenu);}else if(treeElement._node.isShadowRoot()){this.treeOutline._populateContextMenu(contextMenu,treeElement._node);}},_updateModifiedNodes:function()
{if(this._elementsTreeUpdater)
this._elementsTreeUpdater._updateModifiedNodes();},_populateContextMenu:function(contextMenu,node)
{if(this._contextMenuCallback)
this._contextMenuCallback(contextMenu,node);},handleShortcut:function(event)
{var node=this.selectedDOMNode();var treeElement=this.getCachedTreeElement(node);if(!node||!treeElement)
return;if(event.keyIdentifier==="F2"&&treeElement.hasEditableNode()){this._toggleEditAsHTML(node);event.handled=true;return;}
if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)&&node.parentNode){if(event.keyIdentifier==="Up"&&node.previousSibling){node.moveTo(node.parentNode,node.previousSibling,this._selectNodeAfterEdit.bind(this,treeElement.expanded));event.handled=true;return;}
if(event.keyIdentifier==="Down"&&node.nextSibling){node.moveTo(node.parentNode,node.nextSibling.nextSibling,this._selectNodeAfterEdit.bind(this,treeElement.expanded));event.handled=true;return;}}},_toggleEditAsHTML:function(node)
{var treeElement=this.getCachedTreeElement(node);if(!treeElement)
return;if(treeElement._editing&&treeElement._htmlEditElement&&WebInspector.isBeingEdited(treeElement._htmlEditElement))
treeElement._editing.commit();else
treeElement._editAsHTML();},_selectNodeAfterEdit:function(wasExpanded,error,nodeId)
{if(error)
return;this._updateModifiedNodes();var newNode=nodeId?this._domModel.nodeForId(nodeId):null;if(!newNode)
return;this.selectDOMNode(newNode,true);var newTreeItem=this.findTreeElement(newNode);if(wasExpanded){if(newTreeItem)
newTreeItem.expand();}
return newTreeItem;},_toggleHideShortcut:function(node,userCallback)
{var pseudoType=node.pseudoType();var effectiveNode=pseudoType?node.parentNode:node;if(!effectiveNode)
return;function resolvedNode(object)
{if(!object)
return;function toggleClassAndInjectStyleRule(pseudoType)
{const classNamePrefix="__web-inspector-hide";const classNameSuffix="-shortcut__";const styleTagId="__web-inspector-hide-shortcut-style__";const styleRules=".__web-inspector-hide-shortcut__, .__web-inspector-hide-shortcut__ * { visibility: hidden !important; } .__web-inspector-hidebefore-shortcut__::before { visibility: hidden !important; } .__web-inspector-hideafter-shortcut__::after { visibility: hidden !important; }";var className=classNamePrefix+(pseudoType||"")+classNameSuffix;this.classList.toggle(className);var style=document.head.querySelector("style#"+styleTagId);if(style)
return;style=document.createElement("style");style.id=styleTagId;style.type="text/css";style.textContent=styleRules;document.head.appendChild(style);}
object.callFunction(toggleClassAndInjectStyleRule,[{value:pseudoType}],userCallback);object.release();}
effectiveNode.resolveToObject("",resolvedNode);},__proto__:TreeOutline.prototype}
WebInspector.ElementsTreeOutline.ElementDecorator=function()
{}
WebInspector.ElementsTreeOutline.ElementDecorator.prototype={decorate:function(node)
{},decorateAncestor:function(node)
{}}
WebInspector.ElementsTreeOutline.PseudoStateDecorator=function()
{WebInspector.ElementsTreeOutline.ElementDecorator.call(this);}
WebInspector.ElementsTreeOutline.PseudoStateDecorator.prototype={decorate:function(node)
{if(node.nodeType()!==Node.ELEMENT_NODE)
return null;var propertyValue=node.getUserProperty(WebInspector.CSSStyleModel.PseudoStatePropertyName);if(!propertyValue)
return null;return WebInspector.UIString("Element state: %s",":"+propertyValue.join(", :"));},decorateAncestor:function(node)
{if(node.nodeType()!==Node.ELEMENT_NODE)
return null;var descendantCount=node.descendantUserPropertyCount(WebInspector.CSSStyleModel.PseudoStatePropertyName);if(!descendantCount)
return null;if(descendantCount===1)
return WebInspector.UIString("%d descendant with forced state",descendantCount);return WebInspector.UIString("%d descendants with forced state",descendantCount);}}
WebInspector.ElementsTreeElement=function(node,elementCloseTag)
{TreeElement.call(this,"",node);this._node=node;this._elementCloseTag=elementCloseTag;this._updateHasChildren();if(this._node.nodeType()==Node.ELEMENT_NODE&&!elementCloseTag)
this._canAddAttributes=true;this._searchQuery=null;this._expandedChildrenLimit=WebInspector.ElementsTreeElement.InitialChildrenLimit;}
WebInspector.ElementsTreeElement.InitialChildrenLimit=500;WebInspector.ElementsTreeElement.ForbiddenClosingTagElements=["area","base","basefont","br","canvas","col","command","embed","frame","hr","img","input","keygen","link","meta","param","source"].keySet();WebInspector.ElementsTreeElement.EditTagBlacklist=["html","head","body"].keySet();WebInspector.ElementsTreeElement.prototype={highlightSearchResults:function(searchQuery)
{if(this._searchQuery!==searchQuery){this._updateSearchHighlight(false);delete this._highlightResult;}
this._searchQuery=searchQuery;this._searchHighlightsVisible=true;this.updateTitle(true);},hideSearchHighlights:function()
{delete this._searchHighlightsVisible;this._updateSearchHighlight(false);},_updateSearchHighlight:function(show)
{if(!this._highlightResult)
return;function updateEntryShow(entry)
{switch(entry.type){case"added":entry.parent.insertBefore(entry.node,entry.nextSibling);break;case"changed":entry.node.textContent=entry.newText;break;}}
function updateEntryHide(entry)
{switch(entry.type){case"added":entry.node.remove();break;case"changed":entry.node.textContent=entry.oldText;break;}}
if(show){for(var i=0,size=this._highlightResult.length;i<size;++i)
updateEntryShow(this._highlightResult[i]);}else{for(var i=(this._highlightResult.length-1);i>=0;--i)
updateEntryHide(this._highlightResult[i]);}},get hovered()
{return this._hovered;},set hovered(x)
{if(this._hovered===x)
return;this._hovered=x;if(this.listItemElement){if(x){this.updateSelection();this.listItemElement.classList.add("hovered");}else{this.listItemElement.classList.remove("hovered");}}},get expandedChildrenLimit()
{return this._expandedChildrenLimit;},set expandedChildrenLimit(x)
{if(this._expandedChildrenLimit===x)
return;this._expandedChildrenLimit=x;if(this.treeOutline&&!this._updateChildrenInProgress)
this._updateChildren(true);},get expandedChildCount()
{var count=this.children.length;if(count&&this.children[count-1]._elementCloseTag)
count--;if(count&&this.children[count-1].expandAllButton)
count--;return count;},_showChild:function(child)
{if(this._elementCloseTag)
return null;var index=this._visibleChildren().indexOf(child);if(index===-1)
return null;if(index>=this.expandedChildrenLimit){this._expandedChildrenLimit=index+1;this._updateChildren(true);}
return this.expandedChildCount>index?this.children[index]:null;},updateSelection:function()
{var listItemElement=this.listItemElement;if(!listItemElement)
return;if(!this._readyToUpdateSelection){if(document.body.offsetWidth>0)
this._readyToUpdateSelection=true;else{return;}}
if(!this.selectionElement){this.selectionElement=document.createElement("div");this.selectionElement.className="selection selected";listItemElement.insertBefore(this.selectionElement,listItemElement.firstChild);}
this.selectionElement.style.height=listItemElement.offsetHeight+"px";},onattach:function()
{if(this._hovered){this.updateSelection();this.listItemElement.classList.add("hovered");}
this.updateTitle();this._preventFollowingLinksOnDoubleClick();this.listItemElement.draggable=true;},_preventFollowingLinksOnDoubleClick:function()
{var links=this.listItemElement.querySelectorAll("li .webkit-html-tag > .webkit-html-attribute > .webkit-html-external-link, li .webkit-html-tag > .webkit-html-attribute > .webkit-html-resource-link");if(!links)
return;for(var i=0;i<links.length;++i)
links[i].preventFollowOnDoubleClick=true;},onpopulate:function()
{if(this.children.length||this._showInlineText()||this._elementCloseTag)
return;this.updateChildren();},updateChildren:function(fullRefresh)
{if(this._elementCloseTag)
return;this._node.getChildNodes(this._updateChildren.bind(this,fullRefresh));},insertChildElement:function(child,index,closingTag)
{var newElement=new WebInspector.ElementsTreeElement(child,closingTag);newElement.selectable=this.treeOutline._selectEnabled;this.insertChild(newElement,index);return newElement;},moveChild:function(child,targetIndex)
{var wasSelected=child.selected;this.removeChild(child);this.insertChild(child,targetIndex);if(wasSelected)
child.select();},_updateChildren:function(fullRefresh)
{if(this._updateChildrenInProgress||!this.treeOutline._visible)
return;this._updateChildrenInProgress=true;var selectedNode=this.treeOutline.selectedDOMNode();var originalScrollTop=0;if(fullRefresh){var treeOutlineContainerElement=this.treeOutline.element.parentNode;originalScrollTop=treeOutlineContainerElement.scrollTop;var selectedTreeElement=this.treeOutline.selectedTreeElement;if(selectedTreeElement&&selectedTreeElement.hasAncestor(this))
this.select();this.removeChildren();}
function updateChildrenOfNode()
{var treeOutline=this.treeOutline;var visibleChildren=this._visibleChildren();var treeChildIndex=0;var elementToSelect=null;for(var i=0;i<visibleChildren.length;++i){var child=visibleChildren[i];var currentTreeElement=this.children[treeChildIndex];if(!currentTreeElement||currentTreeElement._node!==child){var existingTreeElement=null;for(var j=(treeChildIndex+1),size=this.expandedChildCount;j<size;++j){if(this.children[j]._node===child){existingTreeElement=this.children[j];break;}}
if(existingTreeElement&&existingTreeElement.parent===this){this.moveChild(existingTreeElement,treeChildIndex);}else{if(treeChildIndex<this.expandedChildrenLimit){var newElement=this.insertChildElement(child,treeChildIndex);if(child===selectedNode)
elementToSelect=newElement;if(this.expandedChildCount>this.expandedChildrenLimit)
this.expandedChildrenLimit++;}}}
++treeChildIndex;}
return elementToSelect;}
for(var i=(this.children.length-1);i>=0;--i){var currentChild=this.children[i];var currentNode=currentChild._node;if(!currentNode)
continue;var currentParentNode=currentNode.parentNode;if(currentParentNode===this._node)
continue;var selectedTreeElement=this.treeOutline.selectedTreeElement;if(selectedTreeElement&&(selectedTreeElement===currentChild||selectedTreeElement.hasAncestor(currentChild)))
this.select();this.removeChildAtIndex(i);}
var elementToSelect=updateChildrenOfNode.call(this);this.updateTitle();this._adjustCollapsedRange();var lastChild=this.children[this.children.length-1];if(this._node.nodeType()==Node.ELEMENT_NODE&&(!lastChild||!lastChild._elementCloseTag))
this.insertChildElement(this._node,this.children.length,true);if(fullRefresh&&elementToSelect){elementToSelect.select();if(treeOutlineContainerElement&&originalScrollTop<=treeOutlineContainerElement.scrollHeight)
treeOutlineContainerElement.scrollTop=originalScrollTop;}
delete this._updateChildrenInProgress;},_adjustCollapsedRange:function()
{var visibleChildren=this._visibleChildren();if(this.expandAllButtonElement&&this.expandAllButtonElement.__treeElement.parent)
this.removeChild(this.expandAllButtonElement.__treeElement);const childNodeCount=visibleChildren.length;for(var i=this.expandedChildCount,limit=Math.min(this.expandedChildrenLimit,childNodeCount);i<limit;++i)
this.insertChildElement(visibleChildren[i],i);const expandedChildCount=this.expandedChildCount;if(childNodeCount>this.expandedChildCount){var targetButtonIndex=expandedChildCount;if(!this.expandAllButtonElement){var button=document.createElement("button");button.className="show-all-nodes";button.value="";var item=new TreeElement(button,null,false);item.selectable=false;item.expandAllButton=true;this.insertChild(item,targetButtonIndex);this.expandAllButtonElement=item.listItemElement.firstChild;this.expandAllButtonElement.__treeElement=item;this.expandAllButtonElement.addEventListener("click",this.handleLoadAllChildren.bind(this),false);}else if(!this.expandAllButtonElement.__treeElement.parent)
this.insertChild(this.expandAllButtonElement.__treeElement,targetButtonIndex);this.expandAllButtonElement.textContent=WebInspector.UIString("Show All Nodes (%d More)",childNodeCount-expandedChildCount);}else if(this.expandAllButtonElement)
delete this.expandAllButtonElement;},handleLoadAllChildren:function()
{this.expandedChildrenLimit=Math.max(this._visibleChildCount(),this.expandedChildrenLimit+WebInspector.ElementsTreeElement.InitialChildrenLimit);},expandRecursively:function()
{function callback()
{TreeElement.prototype.expandRecursively.call(this,Number.MAX_VALUE);}
this._node.getSubtree(-1,callback.bind(this));},onexpand:function()
{if(this._elementCloseTag)
return;this.updateTitle();this.treeOutline.updateSelection();},oncollapse:function()
{if(this._elementCloseTag)
return;this.updateTitle();this.treeOutline.updateSelection();},onreveal:function()
{if(this.listItemElement){var tagSpans=this.listItemElement.getElementsByClassName("webkit-html-tag-name");if(tagSpans.length)
tagSpans[0].scrollIntoViewIfNeeded(true);else
this.listItemElement.scrollIntoViewIfNeeded(true);}},onselect:function(selectedByUser)
{this.treeOutline.suppressRevealAndSelect=true;this.treeOutline.selectDOMNode(this._node,selectedByUser);if(selectedByUser)
this._node.highlight();this.updateSelection();this.treeOutline.suppressRevealAndSelect=false;return true;},ondelete:function()
{var startTagTreeElement=this.treeOutline.findTreeElement(this._node);startTagTreeElement?startTagTreeElement.remove():this.remove();return true;},onenter:function()
{if(this._editing)
return false;this._startEditing();return true;},selectOnMouseDown:function(event)
{TreeElement.prototype.selectOnMouseDown.call(this,event);if(this._editing)
return;if(this.treeOutline._showInElementsPanelEnabled){WebInspector.inspectorView.showPanel("elements");this.treeOutline.selectDOMNode(this._node,true);}
if(event.detail>=2)
event.preventDefault();},ondblclick:function(event)
{if(this._editing||this._elementCloseTag)
return false;if(this._startEditingTarget(event.target))
return false;if(this.hasChildren&&!this.expanded)
this.expand();return false;},hasEditableNode:function()
{return!this.representedObject.isShadowRoot()&&!this.representedObject.ancestorUserAgentShadowRoot();},_insertInLastAttributePosition:function(tag,node)
{if(tag.getElementsByClassName("webkit-html-attribute").length>0)
tag.insertBefore(node,tag.lastChild);else{var nodeName=tag.textContent.match(/^<(.*?)>$/)[1];tag.textContent='';tag.appendChild(document.createTextNode('<'+nodeName));tag.appendChild(node);tag.appendChild(document.createTextNode('>'));}
this.updateSelection();},_startEditingTarget:function(eventTarget)
{if(this.treeOutline.selectedDOMNode()!=this._node)
return;if(this._node.nodeType()!=Node.ELEMENT_NODE&&this._node.nodeType()!=Node.TEXT_NODE)
return false;var textNode=eventTarget.enclosingNodeOrSelfWithClass("webkit-html-text-node");if(textNode)
return this._startEditingTextNode(textNode);var attribute=eventTarget.enclosingNodeOrSelfWithClass("webkit-html-attribute");if(attribute)
return this._startEditingAttribute(attribute,eventTarget);var tagName=eventTarget.enclosingNodeOrSelfWithClass("webkit-html-tag-name");if(tagName)
return this._startEditingTagName(tagName);var newAttribute=eventTarget.enclosingNodeOrSelfWithClass("add-attribute");if(newAttribute)
return this._addNewAttribute();return false;},_populateTagContextMenu:function(contextMenu,event)
{var treeElement=this._elementCloseTag?this.treeOutline.findTreeElement(this._node):this;contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Add attribute":"Add Attribute"),treeElement._addNewAttribute.bind(treeElement));var attribute=event.target.enclosingNodeOrSelfWithClass("webkit-html-attribute");var newAttribute=event.target.enclosingNodeOrSelfWithClass("add-attribute");if(attribute&&!newAttribute)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Edit attribute":"Edit Attribute"),this._startEditingAttribute.bind(this,attribute,event.target));contextMenu.appendSeparator();if(this.treeOutline._setPseudoClassCallback){var pseudoSubMenu=contextMenu.appendSubMenuItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Force element state":"Force Element State"));this._populateForcedPseudoStateItems(pseudoSubMenu);contextMenu.appendSeparator();}
this._populateNodeContextMenu(contextMenu);this.treeOutline._populateContextMenu(contextMenu,this._node);this._populateScrollIntoView(contextMenu);},_populateScrollIntoView:function(contextMenu)
{contextMenu.appendSeparator();contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Scroll into view":"Scroll into View"),this._scrollIntoView.bind(this));},_populateForcedPseudoStateItems:function(subMenu)
{const pseudoClasses=["active","hover","focus","visited"];var node=this._node;var forcedPseudoState=(node?node.getUserProperty("pseudoState"):null)||[];for(var i=0;i<pseudoClasses.length;++i){var pseudoClassForced=forcedPseudoState.indexOf(pseudoClasses[i])>=0;subMenu.appendCheckboxItem(":"+pseudoClasses[i],this.treeOutline._setPseudoClassCallback.bind(null,node,pseudoClasses[i],!pseudoClassForced),pseudoClassForced,false);}},_populateTextContextMenu:function(contextMenu,textNode)
{if(!this._editing)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Edit text":"Edit Text"),this._startEditingTextNode.bind(this,textNode));this._populateNodeContextMenu(contextMenu);},_populateNodeContextMenu:function(contextMenu)
{var openTagElement=this.treeOutline.getCachedTreeElement(this.representedObject)||this;var isEditable=this.hasEditableNode();if(isEditable&&!this._editing)
contextMenu.appendItem(WebInspector.UIString("Edit as HTML"),openTagElement._editAsHTML.bind(openTagElement));var isShadowRoot=this.representedObject.isShadowRoot();if(!isShadowRoot)
contextMenu.appendItem(WebInspector.UIString("Copy as HTML"),this._copyHTML.bind(this));if(this.representedObject.nodeType()===Node.ELEMENT_NODE)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Copy CSS path":"Copy CSS Path"),this._copyCSSPath.bind(this));if(!isShadowRoot)
contextMenu.appendItem(WebInspector.UIString("Copy XPath"),this._copyXPath.bind(this));if(isEditable)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Delete node":"Delete Node"),this.remove.bind(this));},_startEditing:function()
{if(this.treeOutline.selectedDOMNode()!==this._node)
return;var listItem=this._listItemNode;if(this._canAddAttributes){var attribute=listItem.getElementsByClassName("webkit-html-attribute")[0];if(attribute)
return this._startEditingAttribute(attribute,attribute.getElementsByClassName("webkit-html-attribute-value")[0]);return this._addNewAttribute();}
if(this._node.nodeType()===Node.TEXT_NODE){var textNode=listItem.getElementsByClassName("webkit-html-text-node")[0];if(textNode)
return this._startEditingTextNode(textNode);return;}},_addNewAttribute:function()
{var container=document.createElement("span");this._buildAttributeDOM(container," ","");var attr=container.firstElementChild;attr.style.marginLeft="2px";attr.style.marginRight="2px";var tag=this.listItemElement.getElementsByClassName("webkit-html-tag")[0];this._insertInLastAttributePosition(tag,attr);attr.scrollIntoViewIfNeeded(true);return this._startEditingAttribute(attr,attr);},_triggerEditAttribute:function(attributeName)
{var attributeElements=this.listItemElement.getElementsByClassName("webkit-html-attribute-name");for(var i=0,len=attributeElements.length;i<len;++i){if(attributeElements[i].textContent===attributeName){for(var elem=attributeElements[i].nextSibling;elem;elem=elem.nextSibling){if(elem.nodeType!==Node.ELEMENT_NODE)
continue;if(elem.classList.contains("webkit-html-attribute-value"))
return this._startEditingAttribute(elem.parentNode,elem);}}}},_startEditingAttribute:function(attribute,elementForSelection)
{if(WebInspector.isBeingEdited(attribute))
return true;var attributeNameElement=attribute.getElementsByClassName("webkit-html-attribute-name")[0];if(!attributeNameElement)
return false;var attributeName=attributeNameElement.textContent;var attributeValueElement=attribute.getElementsByClassName("webkit-html-attribute-value")[0];function removeZeroWidthSpaceRecursive(node)
{if(node.nodeType===Node.TEXT_NODE){node.nodeValue=node.nodeValue.replace(/\u200B/g,"");return;}
if(node.nodeType!==Node.ELEMENT_NODE)
return;for(var child=node.firstChild;child;child=child.nextSibling)
removeZeroWidthSpaceRecursive(child);}
var domNode;var listItemElement=attribute.enclosingNodeOrSelfWithNodeName("li");if(attributeName&&attributeValueElement&&listItemElement&&listItemElement.treeElement)
domNode=listItemElement.treeElement.representedObject;var attributeValue=domNode?domNode.getAttribute(attributeName):undefined;if(typeof attributeValue!=="undefined")
attributeValueElement.textContent=attributeValue;removeZeroWidthSpaceRecursive(attribute);var config=new WebInspector.InplaceEditor.Config(this._attributeEditingCommitted.bind(this),this._editingCancelled.bind(this),attributeName);function handleKeyDownEvents(event)
{var isMetaOrCtrl=WebInspector.isMac()?event.metaKey&&!event.shiftKey&&!event.ctrlKey&&!event.altKey:event.ctrlKey&&!event.shiftKey&&!event.metaKey&&!event.altKey;if(isEnterKey(event)&&(event.isMetaOrCtrlForTest||!config.multiline||isMetaOrCtrl))
return"commit";else if(event.keyCode===WebInspector.KeyboardShortcut.Keys.Esc.code||event.keyIdentifier==="U+001B")
return"cancel";else if(event.keyIdentifier==="U+0009")
return"move-"+(event.shiftKey?"backward":"forward");else{WebInspector.handleElementValueModifications(event,attribute);return"";}}
config.customFinishHandler=handleKeyDownEvents;this._editing=WebInspector.InplaceEditor.startEditing(attribute,config);window.getSelection().setBaseAndExtent(elementForSelection,0,elementForSelection,1);return true;},_startEditingTextNode:function(textNodeElement)
{if(WebInspector.isBeingEdited(textNodeElement))
return true;var textNode=this._node;if(textNode.nodeType()===Node.ELEMENT_NODE&&textNode.firstChild)
textNode=textNode.firstChild;var container=textNodeElement.enclosingNodeOrSelfWithClass("webkit-html-text-node");if(container)
container.textContent=textNode.nodeValue();var config=new WebInspector.InplaceEditor.Config(this._textNodeEditingCommitted.bind(this,textNode),this._editingCancelled.bind(this));this._editing=WebInspector.InplaceEditor.startEditing(textNodeElement,config);window.getSelection().setBaseAndExtent(textNodeElement,0,textNodeElement,1);return true;},_startEditingTagName:function(tagNameElement)
{if(!tagNameElement){tagNameElement=this.listItemElement.getElementsByClassName("webkit-html-tag-name")[0];if(!tagNameElement)
return false;}
var tagName=tagNameElement.textContent;if(WebInspector.ElementsTreeElement.EditTagBlacklist[tagName.toLowerCase()])
return false;if(WebInspector.isBeingEdited(tagNameElement))
return true;var closingTagElement=this._distinctClosingTagElement();function keyupListener(event)
{if(closingTagElement)
closingTagElement.textContent="</"+tagNameElement.textContent+">";}
function editingComitted(element,newTagName)
{tagNameElement.removeEventListener('keyup',keyupListener,false);this._tagNameEditingCommitted.apply(this,arguments);}
function editingCancelled()
{tagNameElement.removeEventListener('keyup',keyupListener,false);this._editingCancelled.apply(this,arguments);}
tagNameElement.addEventListener('keyup',keyupListener,false);var config=new WebInspector.InplaceEditor.Config(editingComitted.bind(this),editingCancelled.bind(this),tagName);this._editing=WebInspector.InplaceEditor.startEditing(tagNameElement,config);window.getSelection().setBaseAndExtent(tagNameElement,0,tagNameElement,1);return true;},_startEditingAsHTML:function(commitCallback,error,initialValue)
{if(error)
return;if(this._editing)
return;function consume(event)
{if(event.eventPhase===Event.AT_TARGET)
event.consume(true);}
initialValue=this._convertWhitespaceToEntities(initialValue).text;this._htmlEditElement=document.createElement("div");this._htmlEditElement.className="source-code elements-tree-editor";var child=this.listItemElement.firstChild;while(child){child.style.display="none";child=child.nextSibling;}
if(this._childrenListNode)
this._childrenListNode.style.display="none";this.listItemElement.appendChild(this._htmlEditElement);this.treeOutline.childrenListElement.parentElement.addEventListener("mousedown",consume,false);this.updateSelection();function commit(element,newValue)
{commitCallback(initialValue,newValue);dispose.call(this);}
function dispose()
{delete this._editing;delete this.treeOutline._multilineEditing;this.listItemElement.removeChild(this._htmlEditElement);delete this._htmlEditElement;if(this._childrenListNode)
this._childrenListNode.style.removeProperty("display");var child=this.listItemElement.firstChild;while(child){child.style.removeProperty("display");child=child.nextSibling;}
this.treeOutline.childrenListElement.parentElement.removeEventListener("mousedown",consume,false);this.updateSelection();this.treeOutline.element.focus();}
var config=new WebInspector.InplaceEditor.Config(commit.bind(this),dispose.bind(this));config.setMultilineOptions(initialValue,{name:"xml",htmlMode:true},"web-inspector-html",WebInspector.settings.domWordWrap.get(),true);this._editing=WebInspector.InplaceEditor.startEditing(this._htmlEditElement,config);this._editing.setWidth(this.treeOutline._visibleWidth);this.treeOutline._multilineEditing=this._editing;},_attributeEditingCommitted:function(element,newText,oldText,attributeName,moveDirection)
{delete this._editing;var treeOutline=this.treeOutline;function moveToNextAttributeIfNeeded(error)
{if(error)
this._editingCancelled(element,attributeName);if(!moveDirection)
return;treeOutline._updateModifiedNodes();var attributes=this._node.attributes();for(var i=0;i<attributes.length;++i){if(attributes[i].name!==attributeName)
continue;if(moveDirection==="backward"){if(i===0)
this._startEditingTagName();else
this._triggerEditAttribute(attributes[i-1].name);}else{if(i===attributes.length-1)
this._addNewAttribute();else
this._triggerEditAttribute(attributes[i+1].name);}
return;}
if(moveDirection==="backward"){if(newText===" "){if(attributes.length>0)
this._triggerEditAttribute(attributes[attributes.length-1].name);}else{if(attributes.length>1)
this._triggerEditAttribute(attributes[attributes.length-2].name);}}else if(moveDirection==="forward"){if(!/^\s*$/.test(newText))
this._addNewAttribute();else
this._startEditingTagName();}}
if(!attributeName.trim()&&!newText.trim()){element.remove();moveToNextAttributeIfNeeded.call(this);return;}
if(oldText!==newText){this._node.setAttribute(attributeName,newText,moveToNextAttributeIfNeeded.bind(this));return;}
this.updateTitle();moveToNextAttributeIfNeeded.call(this);},_tagNameEditingCommitted:function(element,newText,oldText,tagName,moveDirection)
{delete this._editing;var self=this;function cancel()
{var closingTagElement=self._distinctClosingTagElement();if(closingTagElement)
closingTagElement.textContent="</"+tagName+">";self._editingCancelled(element,tagName);moveToNextAttributeIfNeeded.call(self);}
function moveToNextAttributeIfNeeded()
{if(moveDirection!=="forward"){this._addNewAttribute();return;}
var attributes=this._node.attributes();if(attributes.length>0)
this._triggerEditAttribute(attributes[0].name);else
this._addNewAttribute();}
newText=newText.trim();if(newText===oldText){cancel();return;}
var treeOutline=this.treeOutline;var wasExpanded=this.expanded;function changeTagNameCallback(error,nodeId)
{if(error||!nodeId){cancel();return;}
var newTreeItem=treeOutline._selectNodeAfterEdit(wasExpanded,error,nodeId);moveToNextAttributeIfNeeded.call(newTreeItem);}
this._node.setNodeName(newText,changeTagNameCallback);},_textNodeEditingCommitted:function(textNode,element,newText)
{delete this._editing;function callback()
{this.updateTitle();}
textNode.setNodeValue(newText,callback.bind(this));},_editingCancelled:function(element,context)
{delete this._editing;this.updateTitle();},_distinctClosingTagElement:function()
{if(this.expanded){var closers=this._childrenListNode.querySelectorAll(".close");return closers[closers.length-1];}
var tags=this.listItemElement.getElementsByClassName("webkit-html-tag");return(tags.length===1?null:tags[tags.length-1]);},updateTitle:function(onlySearchQueryChanged)
{if(this._editing)
return;if(onlySearchQueryChanged){if(this._highlightResult)
this._updateSearchHighlight(false);}else{var nodeInfo=this._nodeTitleInfo(WebInspector.linkifyURLAsNode);if(nodeInfo.shadowRoot)
this.listItemElement.classList.add("shadow-root");var highlightElement=document.createElement("span");highlightElement.className="highlight";highlightElement.appendChild(nodeInfo.titleDOM);this.title=highlightElement;this._updateDecorations();delete this._highlightResult;}
delete this.selectionElement;if(this.selected)
this.updateSelection();this._preventFollowingLinksOnDoubleClick();this._highlightSearchResults();},_createDecoratorElement:function()
{var node=this._node;var decoratorMessages=[];var parentDecoratorMessages=[];for(var i=0;i<this.treeOutline._nodeDecorators.length;++i){var decorator=this.treeOutline._nodeDecorators[i];var message=decorator.decorate(node);if(message){decoratorMessages.push(message);continue;}
if(this.expanded||this._elementCloseTag)
continue;message=decorator.decorateAncestor(node);if(message)
parentDecoratorMessages.push(message)}
if(!decoratorMessages.length&&!parentDecoratorMessages.length)
return null;var decoratorElement=document.createElement("div");decoratorElement.classList.add("elements-gutter-decoration");if(!decoratorMessages.length)
decoratorElement.classList.add("elements-has-decorated-children");decoratorElement.title=decoratorMessages.concat(parentDecoratorMessages).join("\n");return decoratorElement;},_updateDecorations:function()
{if(this._decoratorElement)
this._decoratorElement.remove();this._decoratorElement=this._createDecoratorElement();if(this._decoratorElement&&this.listItemElement)
this.listItemElement.insertBefore(this._decoratorElement,this.listItemElement.firstChild);},_buildAttributeDOM:function(parentElement,name,value,forceValue,node,linkify)
{var closingPunctuationRegex=/[\/;:\)\]\}]/g;var highlightIndex=0;var highlightCount;var additionalHighlightOffset=0;var result;function replacer(match,replaceOffset){while(highlightIndex<highlightCount&&result.entityRanges[highlightIndex].offset<replaceOffset){result.entityRanges[highlightIndex].offset+=additionalHighlightOffset;++highlightIndex;}
additionalHighlightOffset+=1;return match+"\u200B";}
function setValueWithEntities(element,value)
{var attrValueElement=element.createChild("span","webkit-html-attribute-value");result=this._convertWhitespaceToEntities(value);highlightCount=result.entityRanges.length;value=result.text.replace(closingPunctuationRegex,replacer);while(highlightIndex<highlightCount){result.entityRanges[highlightIndex].offset+=additionalHighlightOffset;++highlightIndex;}
attrValueElement.textContent=value;WebInspector.highlightRangesWithStyleClass(attrValueElement,result.entityRanges,"webkit-html-entity-value");}
var hasText=(forceValue||value.length>0);var attrSpanElement=parentElement.createChild("span","webkit-html-attribute");var attrNameElement=attrSpanElement.createChild("span","webkit-html-attribute-name");attrNameElement.textContent=name;if(hasText)
attrSpanElement.appendChild(document.createTextNode("=\u200B\""));if(linkify&&(name==="src"||name==="href")){var rewrittenHref=node.resolveURL(value);if(rewrittenHref===null){setValueWithEntities.call(this,attrSpanElement,value);}else{value=value.replace(closingPunctuationRegex,"$&\u200B");if(value.startsWith("data:"))
value=value.trimMiddle(60);attrSpanElement.appendChild(linkify(rewrittenHref,value,"webkit-html-attribute-value",node.nodeName().toLowerCase()==="a"));}}else{setValueWithEntities.call(this,attrSpanElement,value);}
if(hasText)
attrSpanElement.appendChild(document.createTextNode("\""));},_buildPseudoElementDOM:function(parentElement,pseudoElementName)
{var pseudoElement=parentElement.createChild("span","webkit-html-pseudo-element");pseudoElement.textContent="::"+pseudoElementName;parentElement.appendChild(document.createTextNode("\u200B"));},_buildTagDOM:function(parentElement,tagName,isClosingTag,isDistinctTreeElement,linkify)
{var node=this._node;var classes=["webkit-html-tag"];if(isClosingTag&&isDistinctTreeElement)
classes.push("close");var tagElement=parentElement.createChild("span",classes.join(" "));tagElement.appendChild(document.createTextNode("<"));var tagNameElement=tagElement.createChild("span",isClosingTag?"":"webkit-html-tag-name");tagNameElement.textContent=(isClosingTag?"/":"")+tagName;if(!isClosingTag&&node.hasAttributes()){var attributes=node.attributes();for(var i=0;i<attributes.length;++i){var attr=attributes[i];tagElement.appendChild(document.createTextNode(" "));this._buildAttributeDOM(tagElement,attr.name,attr.value,false,node,linkify);}}
tagElement.appendChild(document.createTextNode(">"));parentElement.appendChild(document.createTextNode("\u200B"));},_convertWhitespaceToEntities:function(text)
{var result="";var resultLength=0;var lastIndexAfterEntity=0;var entityRanges=[];var charToEntity=WebInspector.ElementsTreeOutline.MappedCharToEntity;for(var i=0,size=text.length;i<size;++i){var char=text.charAt(i);if(charToEntity[char]){result+=text.substring(lastIndexAfterEntity,i);var entityValue="&"+charToEntity[char]+";";entityRanges.push({offset:result.length,length:entityValue.length});result+=entityValue;lastIndexAfterEntity=i+1;}}
if(result)
result+=text.substring(lastIndexAfterEntity);return{text:result||text,entityRanges:entityRanges};},_nodeTitleInfo:function(linkify)
{var node=this._node;var info={titleDOM:document.createDocumentFragment(),hasChildren:this.hasChildren};switch(node.nodeType()){case Node.ATTRIBUTE_NODE:this._buildAttributeDOM(info.titleDOM,(node.name),(node.value),true);break;case Node.ELEMENT_NODE:var pseudoType=node.pseudoType();if(pseudoType){this._buildPseudoElementDOM(info.titleDOM,pseudoType);info.hasChildren=false;break;}
var tagName=node.nodeNameInCorrectCase();if(this._elementCloseTag){this._buildTagDOM(info.titleDOM,tagName,true,true);info.hasChildren=false;break;}
this._buildTagDOM(info.titleDOM,tagName,false,false,linkify);var showInlineText=this._showInlineText()&&!this.hasChildren;if(!this.expanded&&!showInlineText&&(this.treeOutline.isXMLMimeType||!WebInspector.ElementsTreeElement.ForbiddenClosingTagElements[tagName])){if(this.hasChildren){var textNodeElement=info.titleDOM.createChild("span","webkit-html-text-node bogus");textNodeElement.textContent="\u2026";info.titleDOM.appendChild(document.createTextNode("\u200B"));}
this._buildTagDOM(info.titleDOM,tagName,true,false);}
if(showInlineText){var textNodeElement=info.titleDOM.createChild("span","webkit-html-text-node");var result=this._convertWhitespaceToEntities(node.firstChild.nodeValue());textNodeElement.textContent=result.text;WebInspector.highlightRangesWithStyleClass(textNodeElement,result.entityRanges,"webkit-html-entity-value");info.titleDOM.appendChild(document.createTextNode("\u200B"));this._buildTagDOM(info.titleDOM,tagName,true,false);info.hasChildren=false;}
break;case Node.TEXT_NODE:if(node.parentNode&&node.parentNode.nodeName().toLowerCase()==="script"){var newNode=info.titleDOM.createChild("span","webkit-html-text-node webkit-html-js-node");newNode.textContent=node.nodeValue();var javascriptSyntaxHighlighter=new WebInspector.DOMSyntaxHighlighter("text/javascript",true);javascriptSyntaxHighlighter.syntaxHighlightNode(newNode);}else if(node.parentNode&&node.parentNode.nodeName().toLowerCase()==="style"){var newNode=info.titleDOM.createChild("span","webkit-html-text-node webkit-html-css-node");newNode.textContent=node.nodeValue();var cssSyntaxHighlighter=new WebInspector.DOMSyntaxHighlighter("text/css",true);cssSyntaxHighlighter.syntaxHighlightNode(newNode);}else{info.titleDOM.appendChild(document.createTextNode("\""));var textNodeElement=info.titleDOM.createChild("span","webkit-html-text-node");var result=this._convertWhitespaceToEntities(node.nodeValue());textNodeElement.textContent=result.text;WebInspector.highlightRangesWithStyleClass(textNodeElement,result.entityRanges,"webkit-html-entity-value");info.titleDOM.appendChild(document.createTextNode("\""));}
break;case Node.COMMENT_NODE:var commentElement=info.titleDOM.createChild("span","webkit-html-comment");commentElement.appendChild(document.createTextNode("<!--"+node.nodeValue()+"-->"));break;case Node.DOCUMENT_TYPE_NODE:var docTypeElement=info.titleDOM.createChild("span","webkit-html-doctype");docTypeElement.appendChild(document.createTextNode("<!DOCTYPE "+node.nodeName()));if(node.publicId){docTypeElement.appendChild(document.createTextNode(" PUBLIC \""+node.publicId+"\""));if(node.systemId)
docTypeElement.appendChild(document.createTextNode(" \""+node.systemId+"\""));}else if(node.systemId)
docTypeElement.appendChild(document.createTextNode(" SYSTEM \""+node.systemId+"\""));if(node.internalSubset)
docTypeElement.appendChild(document.createTextNode(" ["+node.internalSubset+"]"));docTypeElement.appendChild(document.createTextNode(">"));break;case Node.CDATA_SECTION_NODE:var cdataElement=info.titleDOM.createChild("span","webkit-html-text-node");cdataElement.appendChild(document.createTextNode("<![CDATA["+node.nodeValue()+"]]>"));break;case Node.DOCUMENT_FRAGMENT_NODE:var fragmentElement=info.titleDOM.createChild("span","webkit-html-fragment");if(node.isInShadowTree()){var shadowRootType=node.shadowRootType();if(shadowRootType){info.shadowRoot=true;fragmentElement.classList.add("shadow-root");}}
fragmentElement.textContent=node.nodeNameInCorrectCase().collapseWhitespace();break;default:info.titleDOM.appendChild(document.createTextNode(node.nodeNameInCorrectCase().collapseWhitespace()));}
return info;},_showInlineText:function()
{if(this._node.importedDocument()||this._node.templateContent()||this._visibleShadowRoots().length>0||this._node.hasPseudoElements())
return false;if(this._node.nodeType()!==Node.ELEMENT_NODE)
return false;if(!this._node.firstChild||this._node.firstChild!==this._node.lastChild||this._node.firstChild.nodeType()!==Node.TEXT_NODE)
return false;var textChild=this._node.firstChild;var maxInlineTextChildLength=80;if(textChild.nodeValue().length<maxInlineTextChildLength)
return true;return false;},remove:function()
{if(this._node.pseudoType())
return;var parentElement=this.parent;if(!parentElement)
return;var self=this;function removeNodeCallback(error)
{if(error)
return;parentElement.removeChild(self);parentElement._adjustCollapsedRange();}
if(!this._node.parentNode||this._node.parentNode.nodeType()===Node.DOCUMENT_NODE)
return;this._node.removeNode(removeNodeCallback);},_editAsHTML:function()
{var node=this._node;if(node.pseudoType())
return;var treeOutline=this.treeOutline;var parentNode=node.parentNode;var index=node.index;var wasExpanded=this.expanded;function selectNode(error)
{if(error)
return;treeOutline._updateModifiedNodes();var newNode=parentNode?parentNode.children()[index]||parentNode:null;if(!newNode)
return;treeOutline.selectDOMNode(newNode,true);if(wasExpanded){var newTreeItem=treeOutline.findTreeElement(newNode);if(newTreeItem)
newTreeItem.expand();}}
function commitChange(initialValue,value)
{if(initialValue!==value)
node.setOuterHTML(value,selectNode);}
node.getOuterHTML(this._startEditingAsHTML.bind(this,commitChange));},_copyHTML:function()
{this._node.copyNode();},_copyCSSPath:function()
{InspectorFrontendHost.copyText(WebInspector.DOMPresentationUtils.cssPath(this._node,true));},_copyXPath:function()
{InspectorFrontendHost.copyText(WebInspector.DOMPresentationUtils.xPath(this._node,true));},_highlightSearchResults:function()
{if(!this._searchQuery||!this._searchHighlightsVisible)
return;if(this._highlightResult){this._updateSearchHighlight(true);return;}
var text=this.listItemElement.textContent;var regexObject=createPlainTextSearchRegex(this._searchQuery,"gi");var offset=0;var match=regexObject.exec(text);var matchRanges=[];while(match){matchRanges.push(new WebInspector.SourceRange(match.index,match[0].length));match=regexObject.exec(text);}
if(!matchRanges.length)
matchRanges.push(new WebInspector.SourceRange(0,text.length));this._highlightResult=[];WebInspector.highlightSearchResults(this.listItemElement,matchRanges,this._highlightResult);},_scrollIntoView:function()
{function scrollIntoViewCallback(object)
{function scrollIntoView()
{this.scrollIntoViewIfNeeded(true);}
if(object)
object.callFunction(scrollIntoView);}
this._node.resolveToObject("",scrollIntoViewCallback);},_visibleShadowRoots:function()
{var roots=this._node.shadowRoots();if(roots.length&&!WebInspector.settings.showUAShadowDOM.get()){roots=roots.filter(function(root){return root.shadowRootType()===WebInspector.DOMNode.ShadowRootTypes.Author;});}
return roots;},_visibleChildren:function()
{var visibleChildren=this._visibleShadowRoots();if(this._node.importedDocument())
visibleChildren.push(this._node.importedDocument());if(this._node.templateContent())
visibleChildren.push(this._node.templateContent());var pseudoElements=this._node.pseudoElements();if(pseudoElements[WebInspector.DOMNode.PseudoElementNames.Before])
visibleChildren.push(pseudoElements[WebInspector.DOMNode.PseudoElementNames.Before]);if(this._node.childNodeCount())
visibleChildren=visibleChildren.concat(this._node.children());if(pseudoElements[WebInspector.DOMNode.PseudoElementNames.After])
visibleChildren.push(pseudoElements[WebInspector.DOMNode.PseudoElementNames.After]);return visibleChildren;},_visibleChildCount:function()
{var childCount=this._node.childNodeCount()+this._visibleShadowRoots().length;if(this._node.importedDocument())
++childCount;if(this._node.templateContent())
++childCount;for(var pseudoType in this._node.pseudoElements())
++childCount;return childCount;},_updateHasChildren:function()
{this.hasChildren=!this._elementCloseTag&&!this._showInlineText()&&this._visibleChildCount()>0;},__proto__:TreeElement.prototype}
WebInspector.ElementsTreeUpdater=function(domModel,treeOutline)
{domModel.addEventListener(WebInspector.DOMModel.Events.NodeInserted,this._nodeInserted,this);domModel.addEventListener(WebInspector.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributesUpdated,this);domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributesUpdated,this);domModel.addEventListener(WebInspector.DOMModel.Events.CharacterDataModified,this._characterDataModified,this);domModel.addEventListener(WebInspector.DOMModel.Events.DocumentUpdated,this._documentUpdated,this);domModel.addEventListener(WebInspector.DOMModel.Events.ChildNodeCountUpdated,this._childNodeCountUpdated,this);this._domModel=domModel;this._treeOutline=treeOutline;this._recentlyModifiedNodes=new Map();}
WebInspector.ElementsTreeUpdater.prototype={dispose:function()
{this._domModel.removeEventListener(WebInspector.DOMModel.Events.NodeInserted,this._nodeInserted,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributesUpdated,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributesUpdated,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.CharacterDataModified,this._characterDataModified,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.DocumentUpdated,this._documentUpdated,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.ChildNodeCountUpdated,this._childNodeCountUpdated,this);},_nodeModified:function(node,isUpdated,parentNode)
{if(this._treeOutline._visible)
this._updateModifiedNodesSoon();var entry=this._recentlyModifiedNodes.get(node);if(!entry){entry=new WebInspector.ElementsTreeUpdater.UpdateEntry(isUpdated,parentNode);this._recentlyModifiedNodes.put(node,entry);return;}
entry.isUpdated|=isUpdated;if(parentNode)
entry.parent=parentNode;},_documentUpdated:function(event)
{var inspectedRootDocument=event.data;this._reset();if(!inspectedRootDocument)
return;this._treeOutline.rootDOMNode=inspectedRootDocument;},_attributesUpdated:function(event)
{this._nodeModified(event.data.node,true);},_characterDataModified:function(event)
{this._nodeModified(event.data,true);},_nodeInserted:function(event)
{this._nodeModified(event.data,false,event.data.parentNode);},_nodeRemoved:function(event)
{this._nodeModified(event.data.node,false,event.data.parent);},_childNodeCountUpdated:function(event)
{var treeElement=this._treeOutline.findTreeElement(event.data);if(treeElement){var oldHasChildren=treeElement.hasChildren;treeElement._updateHasChildren();if(treeElement.hasChildren!==oldHasChildren)
treeElement.updateTitle();}},_updateModifiedNodesSoon:function()
{if(this._updateModifiedNodesTimeout)
return;this._updateModifiedNodesTimeout=setTimeout(this._updateModifiedNodes.bind(this),50);},_updateModifiedNodes:function()
{if(this._updateModifiedNodesTimeout){clearTimeout(this._updateModifiedNodesTimeout);delete this._updateModifiedNodesTimeout;}
var updatedParentTreeElements=[];var hidePanelWhileUpdating=this._recentlyModifiedNodes.size()>10;if(hidePanelWhileUpdating){var treeOutlineContainerElement=this._treeOutline.element.parentNode;var originalScrollTop=treeOutlineContainerElement?treeOutlineContainerElement.scrollTop:0;this._treeOutline.element.classList.add("hidden");}
var nodes=this._recentlyModifiedNodes.keys();for(var i=0,size=nodes.length;i<size;++i){var node=nodes[i];var entry=this._recentlyModifiedNodes.get(node);var parent=entry.parent;if(parent===this._treeOutline._rootDOMNode){this._treeOutline.update();this._treeOutline.element.classList.remove("hidden");return;}
if(entry.isUpdated){var nodeItem=this._treeOutline.findTreeElement(node);if(nodeItem)
nodeItem.updateTitle();}
var parentNodeItem=parent?this._treeOutline.findTreeElement(parent):null;if(parentNodeItem&&!parentNodeItem.alreadyUpdatedChildren){parentNodeItem.updateChildren();parentNodeItem.alreadyUpdatedChildren=true;updatedParentTreeElements.push(parentNodeItem);}}
for(var i=0;i<updatedParentTreeElements.length;++i)
delete updatedParentTreeElements[i].alreadyUpdatedChildren;if(hidePanelWhileUpdating){this._treeOutline.element.classList.remove("hidden");if(originalScrollTop)
treeOutlineContainerElement.scrollTop=originalScrollTop;this._treeOutline.updateSelection();}
this._recentlyModifiedNodes.clear();this._treeOutline._fireElementsTreeUpdated(nodes);},_reset:function()
{this._treeOutline.rootDOMNode=null;this._treeOutline.selectDOMNode(null,false);this._domModel.hideDOMNodeHighlight();this._recentlyModifiedNodes.clear();}}
WebInspector.ElementsTreeUpdater.UpdateEntry=function(isUpdated,parent)
{this.isUpdated=isUpdated;if(parent)
this.parent=parent;}
WebInspector.ElementsTreeOutline.Renderer=function()
{}
WebInspector.ElementsTreeOutline.Renderer.prototype={render:function(object)
{if(!(object instanceof WebInspector.DOMNode))
return null;var node=(object);var treeOutline=new WebInspector.ElementsTreeOutline(node.target(),false,false);treeOutline.rootDOMNode=node;treeOutline.element.classList.add("outline-disclosure");if(!treeOutline.children[0].hasChildren)
treeOutline.element.classList.add("single-node");treeOutline.setVisible(true);treeOutline.element.treeElementForTest=treeOutline.children[0];return treeOutline.element;}};WebInspector.EventListenersSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Event Listeners"));this.bodyElement.classList.add("events-pane");this.sections=[];var refreshButton=document.createElement("button");refreshButton.className="pane-title-button refresh";refreshButton.addEventListener("click",this._refreshButtonClicked.bind(this),false);refreshButton.title=WebInspector.UIString("Refresh");this.titleElement.appendChild(refreshButton);this.settingsSelectElement=document.createElement("select");this.settingsSelectElement.className="select-filter";var option=document.createElement("option");option.value="all";option.label=WebInspector.UIString("All Nodes");this.settingsSelectElement.appendChild(option);option=document.createElement("option");option.value="selected";option.label=WebInspector.UIString("Selected Node Only");this.settingsSelectElement.appendChild(option);var filter=WebInspector.settings.eventListenersFilter.get();if(filter==="all")
this.settingsSelectElement[0].selected=true;else if(filter==="selected")
this.settingsSelectElement[1].selected=true;this.settingsSelectElement.addEventListener("click",function(event){event.consume()},false);this.settingsSelectElement.addEventListener("change",this._changeSetting.bind(this),false);this.titleElement.appendChild(this.settingsSelectElement);this._linkifier=new WebInspector.Linkifier();}
WebInspector.EventListenersSidebarPane._objectGroupName="event-listeners-sidebar-pane";WebInspector.EventListenersSidebarPane.prototype={update:function(node)
{RuntimeAgent.releaseObjectGroup(WebInspector.EventListenersSidebarPane._objectGroupName);this._linkifier.reset();var body=this.bodyElement;body.removeChildren();this.sections=[];var self=this;function callback(eventListeners)
{if(!eventListeners)
return;var selectedNodeOnly="selected"===WebInspector.settings.eventListenersFilter.get();var sectionNames=[];var sectionMap={};for(var i=0;i<eventListeners.length;++i){var eventListener=eventListeners[i];if(selectedNodeOnly&&(node.id!==eventListener.payload().nodeId))
continue;if(/^function _inspectorCommandLineAPI_logEvent\(/.test(eventListener.payload().handlerBody.toString()))
continue;var type=eventListener.payload().type;var section=sectionMap[type];if(!section){section=new WebInspector.EventListenersSection(type,node.id,self._linkifier);sectionMap[type]=section;sectionNames.push(type);self.sections.push(section);}
section.addListener(eventListener);}
if(sectionNames.length===0){var div=document.createElement("div");div.className="info";div.textContent=WebInspector.UIString("No Event Listeners");body.appendChild(div);return;}
sectionNames.sort();for(var i=0;i<sectionNames.length;++i){var section=sectionMap[sectionNames[i]];body.appendChild(section.element);}}
if(node)
node.eventListeners(WebInspector.EventListenersSidebarPane._objectGroupName,callback);this._selectedNode=node;},willHide:function()
{delete this._selectedNode;},_refreshButtonClicked:function()
{if(!this._selectedNode)
return;this.update(this._selectedNode);},_changeSetting:function()
{var selectedOption=this.settingsSelectElement[this.settingsSelectElement.selectedIndex];WebInspector.settings.eventListenersFilter.set(selectedOption.value);this.update(this._selectedNode);},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.EventListenersSection=function(title,nodeId,linkifier)
{this.eventListeners=[];this._nodeId=nodeId;this._linkifier=linkifier;WebInspector.PropertiesSection.call(this,title);this.propertiesElement.remove();delete this.propertiesElement;delete this.propertiesTreeOutline;this._eventBars=document.createElement("div");this._eventBars.className="event-bars";this.element.appendChild(this._eventBars);}
WebInspector.EventListenersSection.prototype={addListener:function(eventListener)
{var eventListenerBar=new WebInspector.EventListenerBar(eventListener,this._nodeId,this._linkifier);this._eventBars.appendChild(eventListenerBar.element);},__proto__:WebInspector.PropertiesSection.prototype}
WebInspector.EventListenerBar=function(eventListener,nodeId,linkifier)
{var target=eventListener.target();WebInspector.ObjectPropertiesSection.call(this,target.runtimeModel.createRemoteObjectFromPrimitiveValue(""));this._runtimeModel=target.runtimeModel;this._eventListener=eventListener;this._nodeId=nodeId;this._setNodeTitle();this._setFunctionSubtitle(linkifier);this.editable=false;this.element.className="event-bar";this.headerElement.classList.add("source-code");this.propertiesElement.className="event-properties properties-tree source-code";}
WebInspector.EventListenerBar.prototype={update:function()
{function updateWithNodeObject(nodeObject)
{var properties=[];var payload=this._eventListener.payload();properties.push(this._runtimeModel.createRemotePropertyFromPrimitiveValue("type",payload.type));properties.push(this._runtimeModel.createRemotePropertyFromPrimitiveValue("useCapture",payload.useCapture));properties.push(this._runtimeModel.createRemotePropertyFromPrimitiveValue("isAttribute",payload.isAttribute));if(nodeObject)
properties.push(new WebInspector.RemoteObjectProperty("node",nodeObject));if(typeof payload.handler!=="undefined"){var remoteObject=this._runtimeModel.createRemoteObject(payload.handler);properties.push(new WebInspector.RemoteObjectProperty("handler",remoteObject));}
properties.push(this._runtimeModel.createRemotePropertyFromPrimitiveValue("listenerBody",payload.handlerBody));if(payload.sourceName)
properties.push(this._runtimeModel.createRemotePropertyFromPrimitiveValue("sourceName",payload.sourceName));properties.push(this._runtimeModel.createRemotePropertyFromPrimitiveValue("lineNumber",payload.location.lineNumber+1));this.updateProperties(properties);}
this._eventListener.node().resolveToObject(WebInspector.EventListenersSidebarPane._objectGroupName,updateWithNodeObject.bind(this));},_setNodeTitle:function()
{var node=this._eventListener.node();if(!node)
return;if(node.nodeType()===Node.DOCUMENT_NODE){this.titleElement.textContent="document";return;}
if(node.id===this._nodeId){this.titleElement.textContent=WebInspector.DOMPresentationUtils.simpleSelector(node);return;}
this.titleElement.removeChildren();this.titleElement.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(node));},_setFunctionSubtitle:function(linkifier)
{this.subtitleElement.removeChildren();this.subtitleElement.appendChild(linkifier.linkifyRawLocation(this._eventListener.location()));},__proto__:WebInspector.ObjectPropertiesSection.prototype};WebInspector.MetricsSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Metrics"));}
WebInspector.MetricsSidebarPane.prototype={update:function(node)
{if(!node||this._node===node){this._innerUpdate();return;}
this._node=node;this._updateTarget(node.target());this._innerUpdate();},_updateTarget:function(target)
{if(this._target===target)
return;if(this._target){this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this._styleSheetOrMediaQueryResultChanged,this);this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this._styleSheetOrMediaQueryResultChanged,this);this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributesUpdated,this);this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributesUpdated,this);this._target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized,this._frameResized,this);}
this._target=target;this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this._styleSheetOrMediaQueryResultChanged,this);this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this._styleSheetOrMediaQueryResultChanged,this);this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributesUpdated,this);this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributesUpdated,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized,this._frameResized,this);},_innerUpdate:function()
{if(this._isEditingMetrics)
return;var node=this._node;if(!node||node.nodeType()!==Node.ELEMENT_NODE){this.bodyElement.removeChildren();return;}
function callback(style)
{if(!style||this._node!==node)
return;this._updateMetrics(style);}
this._target.cssModel.getComputedStyleAsync(node.id,callback.bind(this));function inlineStyleCallback(style)
{if(!style||this._node!==node)
return;this.inlineStyle=style;}
this._target.cssModel.getInlineStylesAsync(node.id,inlineStyleCallback.bind(this));},_styleSheetOrMediaQueryResultChanged:function()
{this._innerUpdate();},_frameResized:function()
{function refreshContents()
{this._innerUpdate();delete this._activeTimer;}
if(this._activeTimer)
clearTimeout(this._activeTimer);this._activeTimer=setTimeout(refreshContents.bind(this),100);},_attributesUpdated:function(event)
{if(this._node!==event.data.node)
return;this._innerUpdate();},_getPropertyValueAsPx:function(style,propertyName)
{return Number(style.getPropertyValue(propertyName).replace(/px$/,"")||0);},_getBox:function(computedStyle,componentName)
{var suffix=componentName==="border"?"-width":"";var left=this._getPropertyValueAsPx(computedStyle,componentName+"-left"+suffix);var top=this._getPropertyValueAsPx(computedStyle,componentName+"-top"+suffix);var right=this._getPropertyValueAsPx(computedStyle,componentName+"-right"+suffix);var bottom=this._getPropertyValueAsPx(computedStyle,componentName+"-bottom"+suffix);return{left:left,top:top,right:right,bottom:bottom};},_highlightDOMNode:function(showHighlight,mode,event)
{event.consume();if(showHighlight&&this._node){if(this._highlightMode===mode)
return;this._highlightMode=mode;this._node.highlight(mode);}else{delete this._highlightMode;this._target.domModel.hideDOMNodeHighlight();}
for(var i=0;this._boxElements&&i<this._boxElements.length;++i){var element=this._boxElements[i];if(!this._node||mode==="all"||element._name===mode)
element.style.backgroundColor=element._backgroundColor;else
element.style.backgroundColor="";}},_updateMetrics:function(style)
{var metricsElement=document.createElement("div");metricsElement.className="metrics";var self=this;function createBoxPartElement(style,name,side,suffix)
{var propertyName=(name!=="position"?name+"-":"")+side+suffix;var value=style.getPropertyValue(propertyName);if(value===""||(name!=="position"&&value==="0px"))
value="\u2012";else if(name==="position"&&value==="auto")
value="\u2012";value=value.replace(/px$/,"");value=Number.toFixedIfFloating(value);var element=document.createElement("div");element.className=side;element.textContent=value;element.addEventListener("dblclick",this.startEditing.bind(this,element,name,propertyName,style),false);return element;}
function getContentAreaWidthPx(style)
{var width=style.getPropertyValue("width").replace(/px$/,"");if(!isNaN(width)&&style.getPropertyValue("box-sizing")==="border-box"){var borderBox=self._getBox(style,"border");var paddingBox=self._getBox(style,"padding");width=width-borderBox.left-borderBox.right-paddingBox.left-paddingBox.right;}
return Number.toFixedIfFloating(width);}
function getContentAreaHeightPx(style)
{var height=style.getPropertyValue("height").replace(/px$/,"");if(!isNaN(height)&&style.getPropertyValue("box-sizing")==="border-box"){var borderBox=self._getBox(style,"border");var paddingBox=self._getBox(style,"padding");height=height-borderBox.top-borderBox.bottom-paddingBox.top-paddingBox.bottom;}
return Number.toFixedIfFloating(height);}
var noMarginDisplayType={"table-cell":true,"table-column":true,"table-column-group":true,"table-footer-group":true,"table-header-group":true,"table-row":true,"table-row-group":true};var noPaddingDisplayType={"table-column":true,"table-column-group":true,"table-footer-group":true,"table-header-group":true,"table-row":true,"table-row-group":true};var noPositionType={"static":true};var boxes=["content","padding","border","margin","position"];var boxColors=[WebInspector.Color.PageHighlight.Content,WebInspector.Color.PageHighlight.Padding,WebInspector.Color.PageHighlight.Border,WebInspector.Color.PageHighlight.Margin,WebInspector.Color.fromRGBA([0,0,0,0])];var boxLabels=[WebInspector.UIString("content"),WebInspector.UIString("padding"),WebInspector.UIString("border"),WebInspector.UIString("margin"),WebInspector.UIString("position")];var previousBox=null;this._boxElements=[];for(var i=0;i<boxes.length;++i){var name=boxes[i];if(name==="margin"&&noMarginDisplayType[style.getPropertyValue("display")])
continue;if(name==="padding"&&noPaddingDisplayType[style.getPropertyValue("display")])
continue;if(name==="position"&&noPositionType[style.getPropertyValue("position")])
continue;var boxElement=document.createElement("div");boxElement.className=name;boxElement._backgroundColor=boxColors[i].toString(WebInspector.Color.Format.RGBA);boxElement._name=name;boxElement.style.backgroundColor=boxElement._backgroundColor;boxElement.addEventListener("mouseover",this._highlightDOMNode.bind(this,true,name==="position"?"all":name),false);this._boxElements.push(boxElement);if(name==="content"){var widthElement=document.createElement("span");widthElement.textContent=getContentAreaWidthPx(style);widthElement.addEventListener("dblclick",this.startEditing.bind(this,widthElement,"width","width",style),false);var heightElement=document.createElement("span");heightElement.textContent=getContentAreaHeightPx(style);heightElement.addEventListener("dblclick",this.startEditing.bind(this,heightElement,"height","height",style),false);boxElement.appendChild(widthElement);boxElement.appendChild(document.createTextNode(" \u00D7 "));boxElement.appendChild(heightElement);}else{var suffix=(name==="border"?"-width":"");var labelElement=document.createElement("div");labelElement.className="label";labelElement.textContent=boxLabels[i];boxElement.appendChild(labelElement);boxElement.appendChild(createBoxPartElement.call(this,style,name,"top",suffix));boxElement.appendChild(document.createElement("br"));boxElement.appendChild(createBoxPartElement.call(this,style,name,"left",suffix));if(previousBox)
boxElement.appendChild(previousBox);boxElement.appendChild(createBoxPartElement.call(this,style,name,"right",suffix));boxElement.appendChild(document.createElement("br"));boxElement.appendChild(createBoxPartElement.call(this,style,name,"bottom",suffix));}
previousBox=boxElement;}
metricsElement.appendChild(previousBox);metricsElement.addEventListener("mouseover",this._highlightDOMNode.bind(this,false,"all"),false);this.bodyElement.removeChildren();this.bodyElement.appendChild(metricsElement);},startEditing:function(targetElement,box,styleProperty,computedStyle)
{if(WebInspector.isBeingEdited(targetElement))
return;var context={box:box,styleProperty:styleProperty,computedStyle:computedStyle};var boundKeyDown=this._handleKeyDown.bind(this,context,styleProperty);context.keyDownHandler=boundKeyDown;targetElement.addEventListener("keydown",boundKeyDown,false);this._isEditingMetrics=true;var config=new WebInspector.InplaceEditor.Config(this.editingCommitted.bind(this),this.editingCancelled.bind(this),context);WebInspector.InplaceEditor.startEditing(targetElement,config);window.getSelection().setBaseAndExtent(targetElement,0,targetElement,1);},_handleKeyDown:function(context,styleProperty,event)
{var element=event.currentTarget;function finishHandler(originalValue,replacementString)
{this._applyUserInput(element,replacementString,originalValue,context,false);}
function customNumberHandler(number)
{if(styleProperty!=="margin"&&number<0)
number=0;return number;}
WebInspector.handleElementValueModifications(event,element,finishHandler.bind(this),undefined,customNumberHandler);},editingEnded:function(element,context)
{delete this.originalPropertyData;delete this.previousPropertyDataCandidate;element.removeEventListener("keydown",context.keyDownHandler,false);delete this._isEditingMetrics;},editingCancelled:function(element,context)
{if("originalPropertyData"in this&&this.inlineStyle){if(!this.originalPropertyData){var pastLastSourcePropertyIndex=this.inlineStyle.pastLastSourcePropertyIndex();if(pastLastSourcePropertyIndex)
this.inlineStyle.allProperties[pastLastSourcePropertyIndex-1].setText("",false);}else
this.inlineStyle.allProperties[this.originalPropertyData.index].setText(this.originalPropertyData.propertyText,false);}
this.editingEnded(element,context);this.update();},_applyUserInput:function(element,userInput,previousContent,context,commitEditor)
{if(!this.inlineStyle){return this.editingCancelled(element,context);}
if(commitEditor&&userInput===previousContent)
return this.editingCancelled(element,context);if(context.box!=="position"&&(!userInput||userInput==="\u2012"))
userInput="0px";else if(context.box==="position"&&(!userInput||userInput==="\u2012"))
userInput="auto";userInput=userInput.toLowerCase();if(/^\d+$/.test(userInput))
userInput+="px";var styleProperty=context.styleProperty;var computedStyle=context.computedStyle;if(computedStyle.getPropertyValue("box-sizing")==="border-box"&&(styleProperty==="width"||styleProperty==="height")){if(!userInput.match(/px$/)){WebInspector.messageSink.addErrorMessage("For elements with box-sizing: border-box, only absolute content area dimensions can be applied",true);return;}
var borderBox=this._getBox(computedStyle,"border");var paddingBox=this._getBox(computedStyle,"padding");var userValuePx=Number(userInput.replace(/px$/,""));if(isNaN(userValuePx))
return;if(styleProperty==="width")
userValuePx+=borderBox.left+borderBox.right+paddingBox.left+paddingBox.right;else
userValuePx+=borderBox.top+borderBox.bottom+paddingBox.top+paddingBox.bottom;userInput=userValuePx+"px";}
this.previousPropertyDataCandidate=null;var self=this;var callback=function(style){if(!style)
return;self.inlineStyle=style;if(!("originalPropertyData"in self))
self.originalPropertyData=self.previousPropertyDataCandidate;if(typeof self._highlightMode!=="undefined")
self._node.highlight(self._highlightMode);if(commitEditor){self.dispatchEventToListeners("metrics edited");self.update();}};var allProperties=this.inlineStyle.allProperties;for(var i=0;i<allProperties.length;++i){var property=allProperties[i];if(property.name!==context.styleProperty||property.inactive)
continue;this.previousPropertyDataCandidate=property;property.setValue(userInput,commitEditor,true,callback);return;}
this.inlineStyle.appendProperty(context.styleProperty,userInput,callback);},editingCommitted:function(element,userInput,previousContent,context)
{this.editingEnded(element,context);this._applyUserInput(element,userInput,previousContent,context,true);},__proto__:WebInspector.SidebarPane.prototype};WebInspector.OverridesView=function()
{WebInspector.VBox.call(this);this.registerRequiredCSS("overrides.css");this.registerRequiredCSS("helpScreen.css");this.element.classList.add("overrides-view");this._tabbedPane=new WebInspector.TabbedPane();this._tabbedPane.shrinkableTabs=false;this._tabbedPane.verticalTabLayout=true;if(!WebInspector.overridesSupport.isInspectingDevice()){if(!WebInspector.overridesSupport.responsiveDesignAvailable())
new WebInspector.OverridesView.DeviceTab().appendAsTab(this._tabbedPane);new WebInspector.OverridesView.ViewportTab().appendAsTab(this._tabbedPane);}
new WebInspector.OverridesView.UserAgentTab().appendAsTab(this._tabbedPane);new WebInspector.OverridesView.SensorsTab().appendAsTab(this._tabbedPane);this._lastSelectedTabSetting=WebInspector.settings.createSetting("lastSelectedEmulateTab","device");this._tabbedPane.selectTab(this._lastSelectedTabSetting.get());this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected,this._tabSelected,this);this._tabbedPane.show(this.element);this._warningFooter=this.element.createChild("div","overrides-footer");this._overridesWarningUpdated();WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.OverridesWarningUpdated,this._overridesWarningUpdated,this);}
WebInspector.OverridesView.prototype={_tabSelected:function(event)
{this._lastSelectedTabSetting.set(this._tabbedPane.selectedTabId);},_overridesWarningUpdated:function()
{var message=WebInspector.overridesSupport.warningMessage();this._warningFooter.classList.toggle("hidden",!message);this._warningFooter.textContent=message;},__proto__:WebInspector.VBox.prototype}
WebInspector.OverridesView.Tab=function(id,name,settings)
{WebInspector.VBox.call(this);this._id=id;this._name=name;this._settings=settings;for(var i=0;i<settings.length;++i)
settings[i].addChangeListener(this._updateActiveState,this);}
WebInspector.OverridesView.Tab.prototype={appendAsTab:function(tabbedPane)
{this._tabbedPane=tabbedPane;tabbedPane.appendTab(this._id,this._name,this);this._updateActiveState();},_updateActiveState:function()
{var active=false;for(var i=0;!active&&i<this._settings.length;++i)
active=this._settings[i].get();this._tabbedPane.element.classList.toggle("overrides-activate-"+this._id,active);this._tabbedPane.changeTabTitle(this._id,active?this._name+" \u2713":this._name);},_createSettingCheckbox:function(name,setting,callback)
{var checkbox=WebInspector.SettingsUI.createSettingCheckbox(name,setting,true);function changeListener(value)
{callback(setting.get());}
if(callback)
setting.addChangeListener(changeListener);return checkbox;},__proto__:WebInspector.VBox.prototype}
WebInspector.OverridesView.DeviceTab=function()
{WebInspector.OverridesView.Tab.call(this,"device",WebInspector.UIString("Device"),[]);this.element.classList.add("overrides-device");this._deviceSelectElement=WebInspector.overridesSupport.createDeviceSelect(document);this._deviceSelectElement.addEventListener("change",this._updateValueLabels.bind(this),false);this._deviceSelectElement.addEventListener("keypress",this._keyPressed.bind(this),false);this.element.appendChild(this._deviceSelectElement);var buttonsBar=this.element.createChild("div");var emulateButton=buttonsBar.createChild("button","settings-tab-text-button");emulateButton.textContent=WebInspector.UIString("Emulate");emulateButton.addEventListener("click",this._emulateButtonClicked.bind(this),false);emulateButton.disabled=WebInspector.overridesSupport.isInspectingDevice();var resetButton=buttonsBar.createChild("button","settings-tab-text-button");resetButton.textContent=WebInspector.UIString("Reset");resetButton.addEventListener("click",this._resetButtonClicked.bind(this),false);this._resetButton=resetButton;this._viewportValueLabel=this.element.createChild("div","overrides-device-value-label");this._viewportValueLabel.textContent=WebInspector.UIString("Viewport:");this._viewportValueElement=this._viewportValueLabel.createChild("span","overrides-device-value");this._userAgentLabel=this.element.createChild("div","overrides-device-value-label");this._userAgentLabel.textContent=WebInspector.UIString("User agent:");this._userAgentValueElement=this._userAgentLabel.createChild("span","overrides-device-value");this._updateValueLabels();WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.HasActiveOverridesChanged,this._hasActiveOverridesChanged,this);this._hasActiveOverridesChanged();}
WebInspector.OverridesView.DeviceTab.prototype={_keyPressed:function(e)
{if(e.keyCode===WebInspector.KeyboardShortcut.Keys.Enter.code)
this._emulateButtonClicked();},_emulateButtonClicked:function()
{var option=this._deviceSelectElement.options[this._deviceSelectElement.selectedIndex];WebInspector.overridesSupport.emulateDevice(option.metrics,option.userAgent);},_resetButtonClicked:function()
{WebInspector.overridesSupport.reset();},_hasActiveOverridesChanged:function()
{this._resetButton.disabled=!WebInspector.overridesSupport.hasActiveOverrides();},_updateValueLabels:function()
{var option=this._deviceSelectElement.options[this._deviceSelectElement.selectedIndex];var metrics;if(option.metrics&&(metrics=WebInspector.OverridesSupport.DeviceMetrics.parseSetting(option.metrics)))
this._viewportValueElement.textContent=WebInspector.UIString("%s \xD7 %s, devicePixelRatio = %s",metrics.width,metrics.height,metrics.deviceScaleFactor);else
this._viewportValueElement.textContent="";this._userAgentValueElement.textContent=option.userAgent||"";},__proto__:WebInspector.OverridesView.Tab.prototype}
WebInspector.OverridesView.ViewportTab=function()
{var settings=[WebInspector.overridesSupport.settings.overrideCSSMedia];if(!WebInspector.overridesSupport.responsiveDesignAvailable())
settings=settings.concat([WebInspector.overridesSupport.settings.overrideDeviceResolution,WebInspector.overridesSupport.settings.emulateViewport]);WebInspector.OverridesView.Tab.call(this,"viewport",WebInspector.UIString("Screen"),settings);this.element.classList.add("overrides-viewport");if(!WebInspector.overridesSupport.responsiveDesignAvailable()){this._createDeviceMetricsElement();var checkbox=this._createSettingCheckbox(WebInspector.UIString("Emulate viewport"),WebInspector.overridesSupport.settings.emulateViewport);this.element.appendChild(checkbox);}
this._createMediaEmulationFragment();var footnote=this.element.createChild("p","help-footnote");var footnoteLink=footnote.createChild("a");footnoteLink.href="https://developers.google.com/chrome-developer-tools/docs/mobile-emulation";footnoteLink.target="_blank";footnoteLink.createTextChild(WebInspector.UIString("More information about screen emulation"));}
WebInspector.OverridesView.ViewportTab.prototype={_createDeviceMetricsElement:function()
{var checkbox=this._createSettingCheckbox(WebInspector.UIString("Emulate screen"),WebInspector.overridesSupport.settings.overrideDeviceResolution);checkbox.firstChild.disabled=WebInspector.overridesSupport.isInspectingDevice();this.element.appendChild(checkbox);var fieldsetElement=WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideDeviceResolution);if(WebInspector.overridesSupport.isInspectingDevice())
fieldsetElement.disabled=true;fieldsetElement.id="metrics-override-section";var tableElement=fieldsetElement.createChild("table","nowrap");var rowElement=tableElement.createChild("tr");var cellElement=rowElement.createChild("td");cellElement.appendChild(document.createTextNode(WebInspector.UIString("Resolution:")));cellElement=rowElement.createChild("td");var widthOverrideInput=WebInspector.SettingsUI.createSettingInputField("",WebInspector.overridesSupport.settings.deviceWidth,true,4,"80px",WebInspector.OverridesSupport.inputValidator,true);cellElement.appendChild(widthOverrideInput);this._swapDimensionsElement=cellElement.createChild("button","overrides-swap");this._swapDimensionsElement.appendChild(document.createTextNode(" \u21C4 "));this._swapDimensionsElement.title=WebInspector.UIString("Swap dimensions");this._swapDimensionsElement.addEventListener("click",WebInspector.overridesSupport.swapDimensions.bind(WebInspector.overridesSupport),false);this._swapDimensionsElement.tabIndex=-1;var heightOverrideInput=WebInspector.SettingsUI.createSettingInputField("",WebInspector.overridesSupport.settings.deviceHeight,true,4,"80px",WebInspector.OverridesSupport.inputValidator,true);cellElement.appendChild(heightOverrideInput);rowElement=tableElement.createChild("tr");cellElement=rowElement.createChild("td");cellElement.colSpan=4;var widthRangeInput=WebInspector.SettingsUI.createSettingInputField("",WebInspector.overridesSupport.settings.deviceWidth,true,4,"200px",undefined,true).lastChild;widthRangeInput.type="range";widthRangeInput.min=100;widthRangeInput.max=2000;cellElement.appendChild(widthRangeInput);rowElement=tableElement.createChild("tr");rowElement.title=WebInspector.UIString("Ratio between a device's physical pixels and device-independent pixels.");rowElement.createChild("td").appendChild(document.createTextNode(WebInspector.UIString("Device pixel ratio:")));rowElement.createChild("td").appendChild(WebInspector.SettingsUI.createSettingInputField("",WebInspector.overridesSupport.settings.deviceScaleFactor,true,2,"80px",WebInspector.OverridesSupport.inputValidator,true));var textAutosizingOverrideElement=this._createSettingCheckbox(WebInspector.UIString("Enable text autosizing "),WebInspector.overridesSupport.settings.deviceTextAutosizing);textAutosizingOverrideElement.title=WebInspector.UIString("Text autosizing is the feature that boosts font sizes on mobile devices.");fieldsetElement.appendChild(textAutosizingOverrideElement);checkbox=this._createSettingCheckbox(WebInspector.UIString("Shrink to fit"),WebInspector.overridesSupport.settings.deviceFitWindow);fieldsetElement.appendChild(checkbox);this.element.appendChild(fieldsetElement);},_createMediaEmulationFragment:function()
{var checkbox=WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("CSS media"),WebInspector.overridesSupport.settings.overrideCSSMedia,true);var fieldsetElement=WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideCSSMedia);if(WebInspector.overridesSupport.isInspectingDevice())
fieldsetElement.disabled=true;var mediaSelectElement=fieldsetElement.createChild("select");var mediaTypes=WebInspector.CSSStyleModel.MediaTypes;var defaultMedia=WebInspector.overridesSupport.settings.emulatedCSSMedia.get();for(var i=0;i<mediaTypes.length;++i){var mediaType=mediaTypes[i];if(mediaType==="all"){continue;}
var option=document.createElement("option");option.text=mediaType;option.value=mediaType;mediaSelectElement.add(option);if(mediaType===defaultMedia)
mediaSelectElement.selectedIndex=mediaSelectElement.options.length-1;}
mediaSelectElement.addEventListener("change",this._emulateMediaChanged.bind(this,mediaSelectElement),false);var fragment=document.createDocumentFragment();fragment.appendChild(checkbox);fragment.appendChild(fieldsetElement);this.element.appendChild(fragment);},_emulateMediaChanged:function(select)
{var media=select.options[select.selectedIndex].value;WebInspector.overridesSupport.settings.emulatedCSSMedia.set(media);},__proto__:WebInspector.OverridesView.Tab.prototype}
WebInspector.OverridesView.UserAgentTab=function()
{WebInspector.OverridesView.Tab.call(this,"user-agent",WebInspector.UIString("User Agent"),[WebInspector.overridesSupport.settings.overrideUserAgent]);this.element.classList.add("overrides-user-agent");var checkbox=this._createSettingCheckbox(WebInspector.UIString("Spoof user agent"),WebInspector.overridesSupport.settings.overrideUserAgent);this.element.appendChild(checkbox);this.element.appendChild(this._createUserAgentSelectRowElement());}
WebInspector.OverridesView.UserAgentTab._userAgents=[["Android 4.0.2 \u2014 Galaxy Nexus","Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30"],["Android 2.3 \u2014 Nexus S","Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"],["BlackBerry \u2014 BB10","Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+"],["BlackBerry \u2014 PlayBook 2.1","Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+"],["BlackBerry \u2014 9900","Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+"],["Chrome 31 \u2014 Mac","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36"],["Chrome 31 \u2014 Windows","Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.16 Safari/537.36"],["Chrome \u2014 Android Tablet","Mozilla/5.0 (Linux; Android 4.1.2; Nexus 7 Build/JZ054K) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Safari/535.19"],["Chrome \u2014 Android Mobile","Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19"],["Firefox 14 \u2014 Android Mobile","Mozilla/5.0 (Android; Mobile; rv:14.0) Gecko/14.0 Firefox/14.0"],["Firefox 14 \u2014 Android Tablet","Mozilla/5.0 (Android; Tablet; rv:14.0) Gecko/14.0 Firefox/14.0"],["Firefox 4 \u2014 Mac","Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:2.0.1) Gecko/20100101 Firefox/4.0.1"],["Firefox 4 \u2014 Windows","Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1"],["Firefox 7 \u2014 Mac","Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1"],["Firefox 7 \u2014 Windows","Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1"],["Internet Explorer 10","Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)"],["Internet Explorer 7","Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)"],["Internet Explorer 8","Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)"],["Internet Explorer 9","Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)"],["iPad \u2014 iOS 7","Mozilla/5.0 (iPad; CPU OS 7_0_2 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A501 Safari/9537.53"],["iPad \u2014 iOS 6","Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25"],["iPhone \u2014 iOS 7","Mozilla/5.0 (iPhone; CPU iPhone OS 7_0_2 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A4449d Safari/9537.53"],["iPhone \u2014 iOS 6","Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25"],["MeeGo \u2014 Nokia N9","Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13"],["Opera 18 \u2014 Mac","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36 OPR/18.0.1284.68"],["Opera 18 \u2014 Windows","Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36 OPR/18.0.1284.68"],["Opera 12 \u2014 Mac","Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16"],["Opera 12 \u2014 Windows","Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16"],["Silk \u2014 Kindle Fire (Desktop view)","Mozilla/5.0 (Linux; U; en-us; KFTHWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true"],["Silk \u2014 Kindle Fire (Mobile view)","Mozilla/5.0 (Linux; U; Android 4.2.2; en-us; KFTHWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Mobile Safari/535.19 Silk-Accelerated=true"],];WebInspector.OverridesView.UserAgentTab.prototype={_createUserAgentSelectRowElement:function()
{var userAgent=WebInspector.overridesSupport.settings.userAgent.get();var userAgents=WebInspector.OverridesView.UserAgentTab._userAgents.concat([[WebInspector.UIString("Other"),"Other"]]);var fieldsetElement=WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideUserAgent);this._selectElement=fieldsetElement.createChild("select");fieldsetElement.createChild("br");this._otherUserAgentElement=fieldsetElement.createChild("input");this._otherUserAgentElement.type="text";this._otherUserAgentElement.value=userAgent;this._otherUserAgentElement.title=userAgent;var selectionRestored=false;for(var i=0;i<userAgents.length;++i){var agent=userAgents[i];var option=new Option(agent[0],agent[1]);this._selectElement.add(option);if(userAgent===agent[1]){this._selectElement.selectedIndex=i;selectionRestored=true;}}
if(!selectionRestored){if(!userAgent)
this._selectElement.selectedIndex=0;else
this._selectElement.selectedIndex=userAgents.length-1;}
this._selectElement.addEventListener("change",this._userAgentChanged.bind(this,true),false);WebInspector.overridesSupport.settings.userAgent.addChangeListener(this._userAgentSettingChanged,this);fieldsetElement.addEventListener("dblclick",textDoubleClicked.bind(this),false);this._otherUserAgentElement.addEventListener("blur",textChanged.bind(this),false);function textDoubleClicked()
{this._selectElement.selectedIndex=userAgents.length-1;this._userAgentChanged();}
function textChanged()
{if(WebInspector.overridesSupport.settings.userAgent.get()!==this._otherUserAgentElement.value)
WebInspector.overridesSupport.settings.userAgent.set(this._otherUserAgentElement.value);}
return fieldsetElement;},_userAgentChanged:function(isUserGesture)
{var value=this._selectElement.options[this._selectElement.selectedIndex].value;if(value!=="Other"){WebInspector.overridesSupport.settings.userAgent.set(value);this._otherUserAgentElement.value=value;this._otherUserAgentElement.title=value;this._otherUserAgentElement.disabled=true;}else{this._otherUserAgentElement.disabled=false;this._otherUserAgentElement.focus();}},_userAgentSettingChanged:function()
{var value=WebInspector.overridesSupport.settings.userAgent.get();var options=this._selectElement.options;var foundMatch=false;for(var i=0;i<options.length;++i){if(options[i].value===value){if(this._selectElement.selectedIndex!==i)
this._selectElement.selectedIndex=i;foundMatch=true;break;}}
this._otherUserAgentElement.disabled=foundMatch;if(!foundMatch)
this._selectElement.selectedIndex=options.length-1;if(this._otherUserAgentElement.value!==value){this._otherUserAgentElement.value=value;this._otherUserAgentElement.title=value;}},__proto__:WebInspector.OverridesView.Tab.prototype}
WebInspector.OverridesView.SensorsTab=function()
{var settings=[WebInspector.overridesSupport.settings.overrideGeolocation,WebInspector.overridesSupport.settings.overrideDeviceOrientation];if(!WebInspector.overridesSupport.hasTouchInputs()&&!WebInspector.overridesSupport.responsiveDesignAvailable())
settings.push(WebInspector.overridesSupport.settings.emulateTouchEvents);WebInspector.OverridesView.Tab.call(this,"sensors",WebInspector.UIString("Sensors"),settings);this.element.classList.add("overrides-sensors");this.registerRequiredCSS("accelerometer.css");if(!WebInspector.overridesSupport.hasTouchInputs()&&!WebInspector.overridesSupport.responsiveDesignAvailable())
this.element.appendChild(this._createSettingCheckbox(WebInspector.UIString("Emulate touch screen"),WebInspector.overridesSupport.settings.emulateTouchEvents));this._appendGeolocationOverrideControl();this._apendDeviceOrientationOverrideControl();}
WebInspector.OverridesView.SensorsTab.prototype={_appendGeolocationOverrideControl:function()
{const geolocationSetting=WebInspector.overridesSupport.settings.geolocationOverride.get();var geolocation=WebInspector.OverridesSupport.GeolocationPosition.parseSetting(geolocationSetting);this.element.appendChild(this._createSettingCheckbox(WebInspector.UIString("Emulate geolocation coordinates"),WebInspector.overridesSupport.settings.overrideGeolocation,this._geolocationOverrideCheckboxClicked.bind(this)));this.element.appendChild(this._createGeolocationOverrideElement(geolocation));this._geolocationOverrideCheckboxClicked(WebInspector.overridesSupport.settings.overrideGeolocation.get());},_geolocationOverrideCheckboxClicked:function(enabled)
{if(enabled&&!this._latitudeElement.value)
this._latitudeElement.focus();},_applyGeolocationUserInput:function()
{this._setGeolocationPosition(WebInspector.OverridesSupport.GeolocationPosition.parseUserInput(this._latitudeElement.value.trim(),this._longitudeElement.value.trim(),this._geolocationErrorElement.checked),true);},_setGeolocationPosition:function(geolocation,userInputModified)
{if(!geolocation)
return;if(!userInputModified){this._latitudeElement.value=geolocation.latitude;this._longitudeElement.value=geolocation.longitude;}
var value=geolocation.toSetting();WebInspector.overridesSupport.settings.geolocationOverride.set(value);},_createGeolocationOverrideElement:function(geolocation)
{var fieldsetElement=WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideGeolocation);fieldsetElement.id="geolocation-override-section";var tableElement=fieldsetElement.createChild("table");var rowElement=tableElement.createChild("tr");var cellElement=rowElement.createChild("td");cellElement=rowElement.createChild("td");cellElement.appendChild(document.createTextNode(WebInspector.UIString("Lat = ")));this._latitudeElement=WebInspector.SettingsUI.createInput(cellElement,"geolocation-override-latitude",String(geolocation.latitude),this._applyGeolocationUserInput.bind(this),true);cellElement.appendChild(document.createTextNode(" , "));cellElement.appendChild(document.createTextNode(WebInspector.UIString("Lon = ")));this._longitudeElement=WebInspector.SettingsUI.createInput(cellElement,"geolocation-override-longitude",String(geolocation.longitude),this._applyGeolocationUserInput.bind(this),true);rowElement=tableElement.createChild("tr");cellElement=rowElement.createChild("td");cellElement.colSpan=2;var geolocationErrorLabelElement=document.createElement("label");var geolocationErrorCheckboxElement=geolocationErrorLabelElement.createChild("input");geolocationErrorCheckboxElement.id="geolocation-error";geolocationErrorCheckboxElement.type="checkbox";geolocationErrorCheckboxElement.checked=!geolocation||geolocation.error;geolocationErrorCheckboxElement.addEventListener("click",this._applyGeolocationUserInput.bind(this),false);geolocationErrorLabelElement.appendChild(document.createTextNode(WebInspector.UIString("Emulate position unavailable")));this._geolocationErrorElement=geolocationErrorCheckboxElement;cellElement.appendChild(geolocationErrorLabelElement);return fieldsetElement;},_apendDeviceOrientationOverrideControl:function()
{const deviceOrientationSetting=WebInspector.overridesSupport.settings.deviceOrientationOverride.get();var deviceOrientation=WebInspector.OverridesSupport.DeviceOrientation.parseSetting(deviceOrientationSetting);this.element.appendChild(this._createSettingCheckbox(WebInspector.UIString("Accelerometer"),WebInspector.overridesSupport.settings.overrideDeviceOrientation,this._deviceOrientationOverrideCheckboxClicked.bind(this)));this.element.appendChild(this._createDeviceOrientationOverrideElement(deviceOrientation));this._deviceOrientationOverrideCheckboxClicked(WebInspector.overridesSupport.settings.overrideDeviceOrientation.get());},_deviceOrientationOverrideCheckboxClicked:function(enabled)
{if(enabled&&!this._alphaElement.value)
this._alphaElement.focus();},_applyDeviceOrientationUserInput:function()
{this._setDeviceOrientation(WebInspector.OverridesSupport.DeviceOrientation.parseUserInput(this._alphaElement.value.trim(),this._betaElement.value.trim(),this._gammaElement.value.trim()),WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.UserInput);},_resetDeviceOrientation:function()
{this._setDeviceOrientation(new WebInspector.OverridesSupport.DeviceOrientation(0,0,0),WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.ResetButton);},_setDeviceOrientation:function(deviceOrientation,modificationSource)
{if(!deviceOrientation)
return;if(modificationSource!=WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.UserInput){this._alphaElement.value=deviceOrientation.alpha;this._betaElement.value=deviceOrientation.beta;this._gammaElement.value=deviceOrientation.gamma;}
if(modificationSource!=WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.UserDrag)
this._setBoxOrientation(deviceOrientation);var value=deviceOrientation.toSetting();WebInspector.overridesSupport.settings.deviceOrientationOverride.set(value);},_createAxisInput:function(parentElement,id,label,defaultText)
{var div=parentElement.createChild("div","accelerometer-axis-input-container");div.appendChild(document.createTextNode(label));return WebInspector.SettingsUI.createInput(div,id,defaultText,this._applyDeviceOrientationUserInput.bind(this),true);},_createDeviceOrientationOverrideElement:function(deviceOrientation)
{var fieldsetElement=WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideDeviceOrientation);fieldsetElement.id="device-orientation-override-section";var tableElement=fieldsetElement.createChild("table");var rowElement=tableElement.createChild("tr");var cellElement=rowElement.createChild("td","accelerometer-inputs-cell");this._alphaElement=this._createAxisInput(cellElement,"device-orientation-override-alpha","\u03B1: ",String(deviceOrientation.alpha));this._betaElement=this._createAxisInput(cellElement,"device-orientation-override-beta","\u03B2: ",String(deviceOrientation.beta));this._gammaElement=this._createAxisInput(cellElement,"device-orientation-override-gamma","\u03B3: ",String(deviceOrientation.gamma));var resetButton=cellElement.createChild("button","settings-tab-text-button accelerometer-reset-button");resetButton.textContent=WebInspector.UIString("Reset");resetButton.addEventListener("click",this._resetDeviceOrientation.bind(this),false);this._stageElement=rowElement.createChild("td","accelerometer-stage");this._boxElement=this._stageElement.createChild("section","accelerometer-box");this._boxElement.createChild("section","front");this._boxElement.createChild("section","top");this._boxElement.createChild("section","back");this._boxElement.createChild("section","left");this._boxElement.createChild("section","right");this._boxElement.createChild("section","bottom");WebInspector.installDragHandle(this._stageElement,this._onBoxDragStart.bind(this),this._onBoxDrag.bind(this),this._onBoxDragEnd.bind(this),"move");this._setBoxOrientation(deviceOrientation);return fieldsetElement;},_setBoxOrientation:function(deviceOrientation)
{var matrix=new WebKitCSSMatrix();this._boxMatrix=matrix.rotate(-deviceOrientation.beta,deviceOrientation.gamma,-deviceOrientation.alpha);this._boxElement.style.webkitTransform=this._boxMatrix.toString();},_onBoxDrag:function(event)
{var mouseMoveVector=this._calculateRadiusVector(event.x,event.y);if(!mouseMoveVector)
return true;event.consume(true);var axis=WebInspector.Geometry.crossProduct(this._mouseDownVector,mouseMoveVector);axis.normalize();var angle=WebInspector.Geometry.calculateAngle(this._mouseDownVector,mouseMoveVector);var matrix=new WebKitCSSMatrix();var rotationMatrix=matrix.rotateAxisAngle(axis.x,axis.y,axis.z,angle);this._currentMatrix=rotationMatrix.multiply(this._boxMatrix)
this._boxElement.style.webkitTransform=this._currentMatrix;var eulerAngles=WebInspector.Geometry.EulerAngles.fromRotationMatrix(this._currentMatrix);var newOrientation=new WebInspector.OverridesSupport.DeviceOrientation(-eulerAngles.alpha,-eulerAngles.beta,eulerAngles.gamma);this._setDeviceOrientation(newOrientation,WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.UserDrag);return false;},_onBoxDragStart:function(event)
{if(!WebInspector.overridesSupport.settings.overrideDeviceOrientation.get())
return false;this._mouseDownVector=this._calculateRadiusVector(event.x,event.y);if(!this._mouseDownVector)
return false;event.consume(true);return true;},_onBoxDragEnd:function()
{this._boxMatrix=this._currentMatrix;},_calculateRadiusVector:function(x,y)
{var rect=this._stageElement.getBoundingClientRect();var radius=Math.max(rect.width,rect.height)/2;var sphereX=(x-rect.left-rect.width/2)/radius;var sphereY=(y-rect.top-rect.height/2)/radius;var sqrSum=sphereX*sphereX+sphereY*sphereY;if(sqrSum>0.5)
return new WebInspector.Geometry.Vector(sphereX,sphereY,0.5/Math.sqrt(sqrSum));return new WebInspector.Geometry.Vector(sphereX,sphereY,Math.sqrt(1-sqrSum));},__proto__:WebInspector.OverridesView.Tab.prototype}
WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource={UserInput:"userInput",UserDrag:"userDrag",ResetButton:"resetButton"};WebInspector.PlatformFontsSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Fonts"));this.element.classList.add("platform-fonts");this._sectionTitle=document.createElementWithClass("div","sidebar-separator");this.element.insertBefore(this._sectionTitle,this.bodyElement);this._sectionTitle.textContent=WebInspector.UIString("Rendered Fonts");this._fontStatsSection=this.bodyElement.createChild("div","stats-section");}
WebInspector.PlatformFontsSidebarPane.prototype={_onNodeChange:function()
{if(this._innerUpdateTimeout)
return;this._innerUpdateTimeout=setTimeout(this._innerUpdate.bind(this),100);},update:function(node)
{if(!node){delete this._node;return;}
this._node=node;this._updateTarget(node.target());this._innerUpdate();},_updateTarget:function(target)
{if(this._target===target)
return;if(this._target){this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified,this._onNodeChange,this);this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._onNodeChange,this);this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.CharacterDataModified,this._onNodeChange,this);}
this._target=target;this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified,this._onNodeChange,this);this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._onNodeChange,this);this._target.domModel.addEventListener(WebInspector.DOMModel.Events.CharacterDataModified,this._onNodeChange,this);},_innerUpdate:function()
{if(this._innerUpdateTimeout){clearTimeout(this._innerUpdateTimeout);delete this._innerUpdateTimeout;}
if(!this._node)
return;this._target.cssModel.getPlatformFontsForNode(this._node.id,this._refreshUI.bind(this,this._node));},_refreshUI:function(node,cssFamilyName,platformFonts)
{if(this._node!==node)
return;this._fontStatsSection.removeChildren();var isEmptySection=!platformFonts||!platformFonts.length;this._sectionTitle.classList.toggle("hidden",isEmptySection);if(isEmptySection)
return;platformFonts.sort(function(a,b){return b.glyphCount-a.glyphCount;});for(var i=0;i<platformFonts.length;++i){var fontStatElement=this._fontStatsSection.createChild("div","font-stats-item");var fontNameElement=fontStatElement.createChild("span","font-name");fontNameElement.textContent=platformFonts[i].familyName;var fontDelimeterElement=fontStatElement.createChild("span","delimeter");fontDelimeterElement.textContent="\u2014";var fontUsageElement=fontStatElement.createChild("span","font-usage");var usage=platformFonts[i].glyphCount;fontUsageElement.textContent=usage===1?WebInspector.UIString("%d glyph",usage):WebInspector.UIString("%d glyphs",usage);}},__proto__:WebInspector.SidebarPane.prototype};WebInspector.PropertiesSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Properties"));}
WebInspector.PropertiesSidebarPane._objectGroupName="properties-sidebar-pane";WebInspector.PropertiesSidebarPane.prototype={update:function(node)
{var body=this.bodyElement;if(!node){body.removeChildren();this.sections=[];return;}
node.resolveToObject(WebInspector.PropertiesSidebarPane._objectGroupName,nodeResolved.bind(this));function nodeResolved(object)
{if(!object)
return;function protoList()
{var proto=this;var result={};var counter=1;while(proto){result[counter++]=proto;proto=proto.__proto__;}
return result;}
object.callFunction(protoList,undefined,nodePrototypesReady.bind(this));object.release();}
function nodePrototypesReady(object,wasThrown)
{if(!object||wasThrown)
return;object.getOwnProperties(fillSection.bind(this));}
function fillSection(prototypes)
{if(!prototypes)
return;var body=this.bodyElement;body.removeChildren();this.sections=[];for(var i=0;i<prototypes.length;++i){if(!parseInt(prototypes[i].name,10))
continue;var prototype=prototypes[i].value;var title=prototype.description;if(title.match(/Prototype$/))
title=title.replace(/Prototype$/,"");var section=new WebInspector.ObjectPropertiesSection(prototype,title);this.sections.push(section);body.appendChild(section.element);}}},__proto__:WebInspector.SidebarPane.prototype};WebInspector.RenderingOptionsView=function()
{WebInspector.VBox.call(this);this.registerRequiredCSS("helpScreen.css");this.element.classList.add("help-indent-labels");var div=this.element.createChild("div","settings-tab help-content help-container help-no-columns");div.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show paint rectangles"),WebInspector.settings.showPaintRects));div.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show composited layer borders"),WebInspector.settings.showDebugBorders));div.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show FPS meter"),WebInspector.settings.showFPSCounter));div.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Enable continuous page repainting"),WebInspector.settings.continuousPainting));var child=WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show potential scroll bottlenecks"),WebInspector.settings.showScrollBottleneckRects);child.title=WebInspector.UIString("Shows areas of the page that slow down scrolling:\nTouch and mousewheel event listeners can delay scrolling.\nSome areas need to repaint their content when scrolled.");div.appendChild(child);}
WebInspector.RenderingOptionsView.prototype={__proto__:WebInspector.VBox.prototype};WebInspector.StylesSidebarPane=function(computedStylePane,setPseudoClassCallback)
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Styles"));this._elementStateButton=document.createElement("button");this._elementStateButton.className="pane-title-button element-state";this._elementStateButton.title=WebInspector.UIString("Toggle Element State");this._elementStateButton.addEventListener("click",this._toggleElementStatePane.bind(this),false);this.titleElement.appendChild(this._elementStateButton);var addButton=document.createElement("button");addButton.className="pane-title-button add";addButton.id="add-style-button-test-id";addButton.title=WebInspector.UIString("New Style Rule");addButton.addEventListener("click",this._createNewRule.bind(this),false);this.titleElement.appendChild(addButton);this._computedStylePane=computedStylePane;computedStylePane.setHostingPane(this);this._setPseudoClassCallback=setPseudoClassCallback;this.element.addEventListener("contextmenu",this._contextMenuEventFired.bind(this),true);WebInspector.settings.colorFormat.addChangeListener(this._colorFormatSettingChanged.bind(this));WebInspector.settings.showUserAgentStyles.addChangeListener(this._showUserAgentStylesSettingChanged.bind(this));this._createElementStatePane();this.bodyElement.appendChild(this._elementStatePane);this._sectionsContainer=document.createElement("div");this.bodyElement.appendChild(this._sectionsContainer);this._spectrumHelper=new WebInspector.SpectrumPopupHelper();this._linkifier=new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultCSSFormatter());this.element.classList.add("styles-pane");this.element.classList.toggle("show-user-styles",WebInspector.settings.showUserAgentStyles.get());this.element.addEventListener("mousemove",this._mouseMovedOverElement.bind(this),false);document.body.addEventListener("keydown",this._keyDown.bind(this),false);document.body.addEventListener("keyup",this._keyUp.bind(this),false);}
WebInspector.StylesSidebarPane.PseudoIdNames=["","first-line","first-letter","before","after","selection","","-webkit-scrollbar","-webkit-file-upload-button","-webkit-input-placeholder","-webkit-slider-thumb","-webkit-search-cancel-button","-webkit-search-decoration","-webkit-search-results-decoration","-webkit-search-results-button","-webkit-media-controls-panel","-webkit-media-controls-play-button","-webkit-media-controls-mute-button","-webkit-media-controls-timeline","-webkit-media-controls-timeline-container","-webkit-media-controls-volume-slider","-webkit-media-controls-volume-slider-container","-webkit-media-controls-current-time-display","-webkit-media-controls-time-remaining-display","-webkit-media-controls-fullscreen-button","-webkit-media-controls-toggle-closed-captions-button","-webkit-media-controls-status-display","-webkit-scrollbar-thumb","-webkit-scrollbar-button","-webkit-scrollbar-track","-webkit-scrollbar-track-piece","-webkit-scrollbar-corner","-webkit-resizer","-webkit-inner-spin-button","-webkit-outer-spin-button"];WebInspector.StylesSidebarPane._colorRegex=/((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b\w+\b(?!-))/g;WebInspector.StylesSidebarPane.createExclamationMark=function(property)
{var exclamationElement=document.createElement("div");exclamationElement.className="exclamation-mark"+(WebInspector.StylesSidebarPane._ignoreErrorsForProperty(property)?"":" warning-icon-small");exclamationElement.title=WebInspector.CSSMetadata.cssPropertiesMetainfo.keySet()[property.name.toLowerCase()]?WebInspector.UIString("Invalid property value."):WebInspector.UIString("Unknown property name.");return exclamationElement;}
WebInspector.StylesSidebarPane._colorFormat=function(color)
{const cf=WebInspector.Color.Format;var format;var formatSetting=WebInspector.settings.colorFormat.get();if(formatSetting===cf.Original)
format=cf.Original;else if(formatSetting===cf.RGB)
format=(color.hasAlpha()?cf.RGBA:cf.RGB);else if(formatSetting===cf.HSL)
format=(color.hasAlpha()?cf.HSLA:cf.HSL);else if(!color.hasAlpha())
format=(color.canBeShortHex()?cf.ShortHEX:cf.HEX);else
format=cf.RGBA;return format;}
WebInspector.StylesSidebarPane._ignoreErrorsForProperty=function(property){function hasUnknownVendorPrefix(string)
{return!string.startsWith("-webkit-")&&/^[-_][\w\d]+-\w/.test(string);}
var name=property.name.toLowerCase();if(name.charAt(0)==="_")
return true;if(name==="filter")
return true;if(name.startsWith("scrollbar-"))
return true;if(hasUnknownVendorPrefix(name))
return true;var value=property.value.toLowerCase();if(value.endsWith("\9"))
return true;if(hasUnknownVendorPrefix(value))
return true;return false;}
WebInspector.StylesSidebarPane.prototype={_styleSheetRuleEdited:function(editedRule,oldRange,newRange)
{var styleRuleSections=this.sections[0];for(var i=1;i<styleRuleSections.length;++i)
styleRuleSections[i]._styleSheetRuleEdited(editedRule,oldRange,newRange);},_contextMenuEventFired:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendApplicableItems((event.target));contextMenu.show();},setFilterBoxContainers:function(matchedStylesElement,computedStylesElement)
{matchedStylesElement.appendChild(this._createCSSFilterControl());this._computedStylePane.setFilterBoxContainer(computedStylesElement);},_createCSSFilterControl:function()
{var filterInput=this._createPropertyFilterElement(false,searchHandler.bind(this));function searchHandler(regex)
{this._filterRegex=regex;}
return filterInput;},get _forcedPseudoClasses()
{return this._node?(this._node.getUserProperty(WebInspector.CSSStyleModel.PseudoStatePropertyName)||undefined):undefined;},_updateForcedPseudoStateInputs:function()
{if(!this._node)
return;var hasPseudoType=!!this._node.pseudoType();this._elementStateButton.classList.toggle("hidden",hasPseudoType);this._elementStatePane.classList.toggle("expanded",!hasPseudoType&&this._elementStateButton.classList.contains("toggled"));var nodePseudoState=this._forcedPseudoClasses;if(!nodePseudoState)
nodePseudoState=[];var inputs=this._elementStatePane.inputs;for(var i=0;i<inputs.length;++i)
inputs[i].checked=nodePseudoState.indexOf(inputs[i].state)>=0;},update:function(node,forceUpdate)
{this._spectrumHelper.hide();this._discardElementUnderMouse();var refresh=false;if(forceUpdate)
delete this._node;if(!forceUpdate&&(node===this._node))
refresh=true;if(node&&node.nodeType()===Node.TEXT_NODE&&node.parentNode)
node=node.parentNode;if(node&&node.nodeType()!==Node.ELEMENT_NODE)
node=null;if(node){this._updateTarget(node.target());this._node=node;}else
node=this._node;this._updateForcedPseudoStateInputs();if(refresh)
this._refreshUpdate();else
this._rebuildUpdate();},_updateTarget:function(target)
{if(this._target===target)
return;if(this._target){this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded,this._styleSheetOrMediaQueryResultChanged,this);this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved,this._styleSheetOrMediaQueryResultChanged,this);this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this._styleSheetOrMediaQueryResultChanged,this);this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this._styleSheetOrMediaQueryResultChanged,this);this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributeChanged,this);this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributeChanged,this);this._target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized,this._frameResized,this);}
this._target=target;this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded,this._styleSheetOrMediaQueryResultChanged,this);this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved,this._styleSheetOrMediaQueryResultChanged,this);this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this._styleSheetOrMediaQueryResultChanged,this);this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this._styleSheetOrMediaQueryResultChanged,this);this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributeChanged,this);this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributeChanged,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized,this._frameResized,this);},_refreshUpdate:function(editedSection,forceFetchComputedStyle,userCallback)
{var callbackWrapper=function()
{if(this._filterRegex)
this._updateFilter(false);if(userCallback)
userCallback();}.bind(this);if(this._refreshUpdateInProgress){this._lastNodeForInnerRefresh=this._node;return;}
var node=this._validateNode(userCallback);if(!node)
return;function computedStyleCallback(computedStyle)
{delete this._refreshUpdateInProgress;if(this._lastNodeForInnerRefresh){delete this._lastNodeForInnerRefresh;this._refreshUpdate(editedSection,forceFetchComputedStyle,callbackWrapper);return;}
if(this._node===node&&computedStyle)
this._innerRefreshUpdate(node,computedStyle,editedSection);callbackWrapper();}
if(this._computedStylePane.isShowing()||forceFetchComputedStyle){this._refreshUpdateInProgress=true;this._target.cssModel.getComputedStyleAsync(node.id,computedStyleCallback.bind(this));}else{this._innerRefreshUpdate(node,null,editedSection);callbackWrapper();}},_rebuildUpdate:function()
{if(this._rebuildUpdateInProgress){this._lastNodeForInnerRebuild=this._node;return;}
var node=this._validateNode();if(!node)
return;this._rebuildUpdateInProgress=true;var resultStyles={};function stylesCallback(matchedResult)
{delete this._rebuildUpdateInProgress;var lastNodeForRebuild=this._lastNodeForInnerRebuild;if(lastNodeForRebuild){delete this._lastNodeForInnerRebuild;if(lastNodeForRebuild!==this._node){this._rebuildUpdate();return;}}
if(matchedResult&&this._node===node){resultStyles.matchedCSSRules=matchedResult.matchedCSSRules;resultStyles.pseudoElements=matchedResult.pseudoElements;resultStyles.inherited=matchedResult.inherited;this._innerRebuildUpdate(node,resultStyles);}
if(lastNodeForRebuild){this._rebuildUpdate();return;}}
function inlineCallback(inlineStyle,attributesStyle)
{resultStyles.inlineStyle=inlineStyle;resultStyles.attributesStyle=attributesStyle;}
function computedCallback(computedStyle)
{resultStyles.computedStyle=computedStyle;}
if(this._computedStylePane.isShowing())
this._target.cssModel.getComputedStyleAsync(node.id,computedCallback);this._target.cssModel.getInlineStylesAsync(node.id,inlineCallback);this._target.cssModel.getMatchedStylesAsync(node.id,true,true,stylesCallback.bind(this));},_validateNode:function(userCallback)
{if(!this._node){this._sectionsContainer.removeChildren();this._computedStylePane.bodyElement.removeChildren();this.sections={};if(userCallback)
userCallback();return null;}
return this._node;},_styleSheetOrMediaQueryResultChanged:function()
{if(this._userOperation||this._isEditingStyle)
return;this._rebuildUpdate();},_frameResized:function()
{function refreshContents()
{this._styleSheetOrMediaQueryResultChanged();delete this._activeTimer;}
if(this._activeTimer)
clearTimeout(this._activeTimer);this._activeTimer=setTimeout(refreshContents.bind(this),100);},_attributeChanged:function(event)
{if(this._isEditingStyle||this._userOperation)
return;if(!this._canAffectCurrentStyles(event.data.node))
return;this._rebuildUpdate();},_canAffectCurrentStyles:function(node)
{return this._node&&(this._node===node||node.parentNode===this._node.parentNode||node.isAncestor(this._node));},_innerRefreshUpdate:function(node,computedStyle,editedSection)
{for(var pseudoId in this.sections){var styleRules=this._refreshStyleRules(this.sections[pseudoId],computedStyle);var usedProperties={};this._markUsedProperties(styleRules,usedProperties);this._refreshSectionsForStyleRules(styleRules,usedProperties,editedSection);}
if(computedStyle)
this.sections[0][0].rebuildComputedTrace(this.sections[0]);this._nodeStylesUpdatedForTest(node,false);},_innerRebuildUpdate:function(node,styles)
{this._sectionsContainer.removeChildren();this._computedStylePane.bodyElement.removeChildren();this._linkifier.reset();var styleRules=this._rebuildStyleRules(node,styles);var usedProperties={};this._markUsedProperties(styleRules,usedProperties);this.sections[0]=this._rebuildSectionsForStyleRules(styleRules,usedProperties,null);var anchorElement=this.sections[0].inheritedPropertiesSeparatorElement;if(styles.computedStyle)
this.sections[0][0].rebuildComputedTrace(this.sections[0]);for(var i=0;i<styles.pseudoElements.length;++i){var pseudoElementCSSRules=styles.pseudoElements[i];styleRules=[];var pseudoId=pseudoElementCSSRules.pseudoId;var entry={isStyleSeparator:true,pseudoId:pseudoId};styleRules.push(entry);for(var j=pseudoElementCSSRules.rules.length-1;j>=0;--j){var rule=pseudoElementCSSRules.rules[j];styleRules.push({style:rule.style,selectorText:rule.selectorText,media:rule.media,sourceURL:rule.resourceURL(),rule:rule,editable:!!(rule.style&&rule.style.styleSheetId)});}
usedProperties={};this._markUsedProperties(styleRules,usedProperties);this.sections[pseudoId]=this._rebuildSectionsForStyleRules(styleRules,usedProperties,anchorElement);}
if(this._filterRegex)
this._updateFilter(false);this._nodeStylesUpdatedForTest(node,true);},_nodeStylesUpdatedForTest:function(node,rebuild)
{},_refreshStyleRules:function(sections,computedStyle)
{var nodeComputedStyle=computedStyle;var styleRules=[];for(var i=0;sections&&i<sections.length;++i){var section=sections[i];if(section.isBlank)
continue;if(section.computedStyle)
section.styleRule.style=nodeComputedStyle;var styleRule={section:section,style:section.styleRule.style,computedStyle:section.computedStyle,rule:section.rule,editable:!!(section.styleRule.style&&section.styleRule.style.styleSheetId),isAttribute:section.styleRule.isAttribute,isInherited:section.styleRule.isInherited,parentNode:section.styleRule.parentNode};styleRules.push(styleRule);}
return styleRules;},_rebuildStyleRules:function(node,styles)
{var nodeComputedStyle=styles.computedStyle;this.sections={};var styleRules=[];function addAttributesStyle()
{if(!styles.attributesStyle)
return;var attrStyle={style:styles.attributesStyle,editable:false};attrStyle.selectorText=node.nodeNameInCorrectCase()+"["+WebInspector.UIString("Attributes Style")+"]";styleRules.push(attrStyle);}
styleRules.push({computedStyle:true,selectorText:"",style:nodeComputedStyle,editable:false});if(!!node.pseudoType())
styleRules.push({isStyleSeparator:true,isPlaceholder:true});if(styles.inlineStyle&&node.nodeType()===Node.ELEMENT_NODE){var inlineStyle={selectorText:"element.style",style:styles.inlineStyle,isAttribute:true};styleRules.push(inlineStyle);}
var addedAttributesStyle;for(var i=styles.matchedCSSRules.length-1;i>=0;--i){var rule=styles.matchedCSSRules[i];if((rule.isUser||rule.isUserAgent)&&!addedAttributesStyle){addedAttributesStyle=true;addAttributesStyle();}
styleRules.push({style:rule.style,selectorText:rule.selectorText,media:rule.media,sourceURL:rule.resourceURL(),rule:rule,editable:!!(rule.style&&rule.style.styleSheetId)});}
if(!addedAttributesStyle)
addAttributesStyle();var parentNode=node.parentNode;function insertInheritedNodeSeparator(node)
{var entry={};entry.isStyleSeparator=true;entry.node=node;styleRules.push(entry);}
for(var parentOrdinal=0;parentOrdinal<styles.inherited.length;++parentOrdinal){var parentStyles=styles.inherited[parentOrdinal];var separatorInserted=false;if(parentStyles.inlineStyle){if(this._containsInherited(parentStyles.inlineStyle)){var inlineStyle={selectorText:WebInspector.UIString("Style Attribute"),style:parentStyles.inlineStyle,isAttribute:true,isInherited:true,parentNode:parentNode};if(!separatorInserted){insertInheritedNodeSeparator(parentNode);separatorInserted=true;}
styleRules.push(inlineStyle);}}
for(var i=parentStyles.matchedCSSRules.length-1;i>=0;--i){var rulePayload=parentStyles.matchedCSSRules[i];if(!this._containsInherited(rulePayload.style))
continue;var rule=rulePayload;if(!separatorInserted){insertInheritedNodeSeparator(parentNode);separatorInserted=true;}
styleRules.push({style:rule.style,selectorText:rule.selectorText,media:rule.media,sourceURL:rule.resourceURL(),rule:rule,isInherited:true,parentNode:parentNode,editable:!!(rule.style&&rule.style.styleSheetId)});}
parentNode=parentNode.parentNode;}
return styleRules;},_markUsedProperties:function(styleRules,usedProperties)
{var foundImportantProperties={};var propertyToEffectiveRule={};var inheritedPropertyToNode={};for(var i=0;i<styleRules.length;++i){var styleRule=styleRules[i];if(styleRule.computedStyle||styleRule.isStyleSeparator)
continue;if(styleRule.section&&styleRule.section.noAffect)
continue;styleRule.usedProperties={};var style=styleRule.style;var allProperties=style.allProperties;for(var j=0;j<allProperties.length;++j){var property=allProperties[j];if(!property.isLive||!property.parsedOk)
continue;if(styleRule.isInherited&&!WebInspector.CSSMetadata.isPropertyInherited(property.name))
continue;var canonicalName=WebInspector.CSSMetadata.canonicalPropertyName(property.name);if(foundImportantProperties.hasOwnProperty(canonicalName))
continue;if(!property.important&&usedProperties.hasOwnProperty(canonicalName))
continue;var isKnownProperty=propertyToEffectiveRule.hasOwnProperty(canonicalName);if(!isKnownProperty&&styleRule.isInherited&&!inheritedPropertyToNode[canonicalName])
inheritedPropertyToNode[canonicalName]=styleRule.parentNode;if(property.important){if(styleRule.isInherited&&isKnownProperty&&styleRule.parentNode!==inheritedPropertyToNode[canonicalName])
continue;foundImportantProperties[canonicalName]=true;if(isKnownProperty)
delete propertyToEffectiveRule[canonicalName].usedProperties[canonicalName];}
styleRule.usedProperties[canonicalName]=true;usedProperties[canonicalName]=true;propertyToEffectiveRule[canonicalName]=styleRule;}}},_refreshSectionsForStyleRules:function(styleRules,usedProperties,editedSection)
{for(var i=0;i<styleRules.length;++i){var styleRule=styleRules[i];var section=styleRule.section;if(styleRule.computedStyle){section._usedProperties=usedProperties;section.update();}else{section._usedProperties=styleRule.usedProperties;section.update(section===editedSection);}}},_rebuildSectionsForStyleRules:function(styleRules,usedProperties,anchorElement)
{var sections=[];for(var i=0;i<styleRules.length;++i){var styleRule=styleRules[i];if(styleRule.isStyleSeparator){var separatorElement=document.createElement("div");if(styleRule.isPlaceholder){separatorElement.className="styles-sidebar-placeholder";this._sectionsContainer.insertBefore(separatorElement,anchorElement);continue;}
separatorElement.className="sidebar-separator";if(styleRule.node){var link=WebInspector.DOMPresentationUtils.linkifyNodeReference(styleRule.node);separatorElement.appendChild(document.createTextNode(WebInspector.UIString("Inherited from")+" "));separatorElement.appendChild(link);if(!sections.inheritedPropertiesSeparatorElement)
sections.inheritedPropertiesSeparatorElement=separatorElement;}else if("pseudoId"in styleRule){var pseudoName=WebInspector.StylesSidebarPane.PseudoIdNames[styleRule.pseudoId];if(pseudoName)
separatorElement.textContent=WebInspector.UIString("Pseudo ::%s element",pseudoName);else
separatorElement.textContent=WebInspector.UIString("Pseudo element");}else
separatorElement.textContent=styleRule.text;this._sectionsContainer.insertBefore(separatorElement,anchorElement);continue;}
var computedStyle=styleRule.computedStyle;var editable=styleRule.editable;if(typeof editable==="undefined")
editable=true;if(computedStyle)
var section=new WebInspector.ComputedStylePropertiesSection(this,styleRule,usedProperties);else{var section=new WebInspector.StylePropertiesSection(this,styleRule,editable,styleRule.isInherited);section._markSelectorMatches();}
section.expanded=true;if(computedStyle)
this._computedStylePane.bodyElement.appendChild(section.element);else
this._sectionsContainer.insertBefore(section.element,anchorElement);sections.push(section);}
return sections;},_containsInherited:function(style)
{var properties=style.allProperties;for(var i=0;i<properties.length;++i){var property=properties[i];if(property.isLive&&WebInspector.CSSMetadata.isPropertyInherited(property.name))
return true;}
return false;},_colorFormatSettingChanged:function(event)
{for(var pseudoId in this.sections){var sections=this.sections[pseudoId];for(var i=0;i<sections.length;++i)
sections[i].update(true);}},_createNewRule:function(event)
{event.consume();this.expand();this.addBlankSection().startEditingSelector();},addBlankSection:function()
{var blankSection=new WebInspector.BlankStylePropertiesSection(this,this._node?WebInspector.DOMPresentationUtils.simpleSelector(this._node):"");var elementStyleSection=this.sections[0][1];this._sectionsContainer.insertBefore(blankSection.element,elementStyleSection.element.nextSibling);this.sections[0].splice(2,0,blankSection);return blankSection;},removeSection:function(section)
{for(var pseudoId in this.sections){var sections=this.sections[pseudoId];var index=sections.indexOf(section);if(index===-1)
continue;sections.splice(index,1);section.element.remove();}},_toggleElementStatePane:function(event)
{event.consume();var buttonToggled=!this._elementStateButton.classList.contains("toggled");if(buttonToggled)
this.expand();this._elementStateButton.classList.toggle("toggled",buttonToggled);this._elementStatePane.classList.toggle("expanded",buttonToggled);},_createElementStatePane:function()
{this._elementStatePane=document.createElement("div");this._elementStatePane.className="styles-element-state-pane source-code";var table=document.createElement("table");var inputs=[];this._elementStatePane.inputs=inputs;function clickListener(event)
{var node=this._validateNode();if(!node)
return;this._setPseudoClassCallback(node,event.target.state,event.target.checked);}
function createCheckbox(state)
{var td=document.createElement("td");var label=document.createElement("label");var input=document.createElement("input");input.type="checkbox";input.state=state;input.addEventListener("click",clickListener.bind(this),false);inputs.push(input);label.appendChild(input);label.appendChild(document.createTextNode(":"+state));td.appendChild(label);return td;}
var tr=table.createChild("tr");tr.appendChild(createCheckbox.call(this,"active"));tr.appendChild(createCheckbox.call(this,"hover"));tr=table.createChild("tr");tr.appendChild(createCheckbox.call(this,"focus"));tr.appendChild(createCheckbox.call(this,"visited"));this._elementStatePane.appendChild(table);},filterRegex:function()
{return this._filterRegex;},_createPropertyFilterElement:function(isComputedStyleFilter,filterCallback)
{var input=document.createElement("input");input.type="text";input.placeholder=isComputedStyleFilter?WebInspector.UIString("Filter"):WebInspector.UIString("Find in Styles");var boundSearchHandler=searchHandler.bind(this);function searchHandler()
{var regex=input.value?new RegExp(input.value.escapeForRegExp(),"i"):null;filterCallback(regex);input.parentNode.classList.toggle("styles-filter-engaged",!!input.value);this._updateFilter(isComputedStyleFilter);}
input.addEventListener("input",boundSearchHandler,false);function keydownHandler(event)
{var Esc="U+001B";if(event.keyIdentifier!==Esc||!input.value)
return;event.consume(true);input.value="";boundSearchHandler();}
input.addEventListener("keydown",keydownHandler,false);return input;},_updateFilter:function(isComputedStyleFilter)
{for(var pseudoId in this.sections){var sections=this.sections[pseudoId];for(var i=0;i<sections.length;++i){var section=sections[i];if(isComputedStyleFilter!==!!section.computedStyle)
continue;section._updateFilter();}}},_showUserAgentStylesSettingChanged:function(event)
{var showStyles=(event.data);this.element.classList.toggle("show-user-styles",showStyles);},willHide:function()
{this._spectrumHelper.hide();this._discardElementUnderMouse();},_discardElementUnderMouse:function()
{if(this._elementUnderMouse)
this._elementUnderMouse.classList.remove("styles-panel-hovered");delete this._elementUnderMouse;},_mouseMovedOverElement:function(e)
{if(this._elementUnderMouse&&e.target!==this._elementUnderMouse)
this._discardElementUnderMouse();this._elementUnderMouse=e.target;if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(e))
this._elementUnderMouse.classList.add("styles-panel-hovered");},_keyDown:function(e)
{if((!WebInspector.isMac()&&e.keyCode===WebInspector.KeyboardShortcut.Keys.Ctrl.code)||(WebInspector.isMac()&&e.keyCode===WebInspector.KeyboardShortcut.Keys.Meta.code)){if(this._elementUnderMouse)
this._elementUnderMouse.classList.add("styles-panel-hovered");}},_keyUp:function(e)
{if((!WebInspector.isMac()&&e.keyCode===WebInspector.KeyboardShortcut.Keys.Ctrl.code)||(WebInspector.isMac()&&e.keyCode===WebInspector.KeyboardShortcut.Keys.Meta.code)){this._discardElementUnderMouse();}},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.ComputedStyleSidebarPane=function()
{WebInspector.SidebarPane.call(this,WebInspector.UIString("Computed Style"));}
WebInspector.ComputedStyleSidebarPane.prototype={setHostingPane:function(pane)
{this._stylesSidebarPane=pane;},setFilterBoxContainer:function(element)
{element.appendChild(this._stylesSidebarPane._createPropertyFilterElement(true,filterCallback.bind(this)));function filterCallback(regex)
{this._filterRegex=regex;}},wasShown:function()
{WebInspector.SidebarPane.prototype.wasShown.call(this);if(!this._hasFreshContent)
this.prepareContent();},prepareContent:function(callback)
{function wrappedCallback(){this._hasFreshContent=true;if(callback)
callback();delete this._hasFreshContent;}
this._stylesSidebarPane._refreshUpdate(null,true,wrappedCallback.bind(this));},filterRegex:function()
{return this._filterRegex;},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.StylePropertiesSection=function(parentPane,styleRule,editable,isInherited)
{WebInspector.PropertiesSection.call(this,"");this._parentPane=parentPane;this.styleRule=styleRule;this.rule=this.styleRule.rule;this.editable=editable;this.isInherited=isInherited;var extraClasses=(this.rule&&(this.rule.isUser||this.rule.isUserAgent)?" user-rule":"");this.element.className="styles-section matched-styles monospace"+extraClasses;this.propertiesElement.classList.remove("properties-tree");var selectorContainer=document.createElement("div");this._selectorElement=document.createElement("span");this._selectorElement.textContent=styleRule.selectorText;selectorContainer.appendChild(this._selectorElement);var openBrace=document.createElement("span");openBrace.textContent=" {";selectorContainer.appendChild(openBrace);selectorContainer.addEventListener("mousedown",this._handleEmptySpaceMouseDown.bind(this),false);selectorContainer.addEventListener("click",this._handleSelectorContainerClick.bind(this),false);var closeBrace=document.createElement("div");closeBrace.textContent="}";this.element.appendChild(closeBrace);this._selectorElement.addEventListener("click",this._handleSelectorClick.bind(this),false);this.element.addEventListener("mousedown",this._handleEmptySpaceMouseDown.bind(this),false);this.element.addEventListener("click",this._handleEmptySpaceClick.bind(this),false);if(this.rule){if(this.rule.isUserAgent||this.rule.isUser)
this.editable=false;else{if(this.rule.styleSheetId)
this.navigable=!!this.rule.resourceURL();}
this.titleElement.classList.add("styles-selector");}
this._usedProperties=styleRule.usedProperties;this._selectorRefElement=document.createElement("div");this._selectorRefElement.className="subtitle";this._mediaListElement=this.titleElement.createChild("div","media-list");this._updateMediaList();this._updateRuleOrigin();selectorContainer.insertBefore(this._selectorRefElement,selectorContainer.firstChild);this.titleElement.appendChild(selectorContainer);this._selectorContainer=selectorContainer;if(isInherited)
this.element.classList.add("styles-show-inherited");if(this.navigable)
this.element.classList.add("navigable");if(!this.editable)
this.element.classList.add("read-only");}
WebInspector.StylePropertiesSection.prototype={_styleSheetRuleEdited:function(editedRule,oldRange,newRange)
{if(!this.rule||!this.rule.styleSheetId)
return;if(this.rule!==editedRule)
this.rule.sourceStyleSheetEdited(this.rule.styleSheetId,oldRange,newRange);this._updateMediaList();this._updateRuleOrigin();},_createMediaList:function(styleRule)
{if(!styleRule.media)
return;for(var i=styleRule.media.length-1;i>=0;--i){var media=styleRule.media[i];var mediaDataElement=this._mediaListElement.createChild("div","media");var mediaText;switch(media.source){case WebInspector.CSSMedia.Source.LINKED_SHEET:case WebInspector.CSSMedia.Source.INLINE_SHEET:mediaText="media=\""+media.text+"\"";break;case WebInspector.CSSMedia.Source.MEDIA_RULE:mediaText="@media "+media.text;break;case WebInspector.CSSMedia.Source.IMPORT_RULE:mediaText="@import "+media.text;break;}
if(media.sourceURL){var refElement=mediaDataElement.createChild("div","subtitle");var rawLocation;var mediaHeader;if(media.range){mediaHeader=media.header();if(mediaHeader){var lineNumber=media.lineNumberInSource();var columnNumber=media.columnNumberInSource();console.assert(typeof lineNumber!=="undefined"&&typeof columnNumber!=="undefined");rawLocation=new WebInspector.CSSLocation(this._parentPane._target,media.sourceURL,lineNumber,columnNumber);}}
var anchor;if(rawLocation)
anchor=this._parentPane._linkifier.linkifyCSSLocation(mediaHeader.id,rawLocation);else{anchor=WebInspector.linkifyResourceAsNode(media.sourceURL,undefined,"subtitle",media.sourceURL);}
anchor.style.float="right";refElement.appendChild(anchor);}
var mediaTextElement=mediaDataElement.createChild("span");mediaTextElement.textContent=mediaText;mediaTextElement.title=media.text;}},_updateMediaList:function()
{this._mediaListElement.removeChildren();this._createMediaList(this.styleRule);},collapse:function()
{},handleClick:function()
{},isPropertyInherited:function(propertyName)
{if(this.isInherited){return!WebInspector.CSSMetadata.isPropertyInherited(propertyName);}
return false;},isPropertyOverloaded:function(propertyName,isShorthand)
{if(!this._usedProperties||this.noAffect)
return false;if(this.isInherited&&!WebInspector.CSSMetadata.isPropertyInherited(propertyName)){return false;}
var canonicalName=WebInspector.CSSMetadata.canonicalPropertyName(propertyName);var used=(canonicalName in this._usedProperties);if(used||!isShorthand)
return!used;var longhandProperties=this.styleRule.style.longhandProperties(propertyName);for(var j=0;j<longhandProperties.length;++j){var individualProperty=longhandProperties[j];if(WebInspector.CSSMetadata.canonicalPropertyName(individualProperty.name)in this._usedProperties)
return false;}
return true;},nextEditableSibling:function()
{var curSection=this;do{curSection=curSection.nextSibling;}while(curSection&&!curSection.editable);if(!curSection){curSection=this.firstSibling;while(curSection&&!curSection.editable)
curSection=curSection.nextSibling;}
return(curSection&&curSection.editable)?curSection:null;},previousEditableSibling:function()
{var curSection=this;do{curSection=curSection.previousSibling;}while(curSection&&!curSection.editable);if(!curSection){curSection=this.lastSibling;while(curSection&&!curSection.editable)
curSection=curSection.previousSibling;}
return(curSection&&curSection.editable)?curSection:null;},update:function(full)
{if(this.styleRule.selectorText)
this._selectorElement.textContent=this.styleRule.selectorText;this._markSelectorMatches();if(full){this.propertiesTreeOutline.removeChildren();this.populated=false;}else{var child=this.propertiesTreeOutline.children[0];while(child){child.overloaded=this.isPropertyOverloaded(child.name,child.isShorthand);child=child.traverseNextTreeElement(false,null,true);}}
this.afterUpdate();},afterUpdate:function()
{if(this._afterUpdate){this._afterUpdate(this);delete this._afterUpdate;}},onpopulate:function()
{var style=this.styleRule.style;var allProperties=style.allProperties;this.uniqueProperties=[];var styleHasEditableSource=this.editable&&!!style.range;if(styleHasEditableSource){for(var i=0;i<allProperties.length;++i){var property=allProperties[i];this.uniqueProperties.push(property);if(property.styleBased)
continue;var isShorthand=!!WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(property.name);var inherited=this.isPropertyInherited(property.name);var overloaded=property.inactive||this.isPropertyOverloaded(property.name);var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this.styleRule,style,property,isShorthand,inherited,overloaded);this.propertiesTreeOutline.appendChild(item);}
return;}
var generatedShorthands={};for(var i=0;i<allProperties.length;++i){var property=allProperties[i];this.uniqueProperties.push(property);var isShorthand=!!WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(property.name);var shorthands=isShorthand?null:WebInspector.CSSMetadata.cssPropertiesMetainfo.shorthands(property.name);var shorthandPropertyAvailable=false;for(var j=0;shorthands&&!shorthandPropertyAvailable&&j<shorthands.length;++j){var shorthand=shorthands[j];if(shorthand in generatedShorthands){shorthandPropertyAvailable=true;continue;}
if(style.getLiveProperty(shorthand)){shorthandPropertyAvailable=true;continue;}
if(!style.shorthandValue(shorthand)){shorthandPropertyAvailable=false;continue;}
var shorthandProperty=new WebInspector.CSSProperty(style,style.allProperties.length,shorthand,style.shorthandValue(shorthand),false,false,true,true);var overloaded=property.inactive||this.isPropertyOverloaded(property.name,true);var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this.styleRule,style,shorthandProperty,true,false,overloaded);this.propertiesTreeOutline.appendChild(item);generatedShorthands[shorthand]=shorthandProperty;shorthandPropertyAvailable=true;}
if(shorthandPropertyAvailable)
continue;var inherited=this.isPropertyInherited(property.name);var overloaded=property.inactive||this.isPropertyOverloaded(property.name,isShorthand);var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this.styleRule,style,property,isShorthand,inherited,overloaded);this.propertiesTreeOutline.appendChild(item);}},_updateFilter:function()
{if(this.styleRule.isAttribute)
return;var regex=this._parentPane.filterRegex();var hideRule=regex&&!regex.test(this.element.textContent);this.element.classList.toggle("hidden",hideRule);if(hideRule)
return;var children=this.propertiesTreeOutline.children;for(var i=0;i<children.length;++i)
children[i]._updateFilter();if(this.styleRule.rule)
this._markSelectorHighlights();},_markSelectorMatches:function()
{var rule=this.styleRule.rule;if(!rule)
return;var matchingSelectors=rule.matchingSelectors;if(this.noAffect||matchingSelectors)
this._selectorElement.className="selector";if(!matchingSelectors)
return;var selectors=rule.selectors;var fragment=document.createDocumentFragment();var currentMatch=0;for(var i=0;i<selectors.length;++i){if(i)
fragment.appendChild(document.createTextNode(", "));var isSelectorMatching=matchingSelectors[currentMatch]===i;if(isSelectorMatching)
++currentMatch;var rawLocation=new WebInspector.CSSLocation(this._parentPane._target,rule.sourceURL,rule.lineNumberInSource(i),rule.columnNumberInSource(i));var matchingSelectorClass=isSelectorMatching?" selector-matches":"";var selectorElement=document.createElement("span");selectorElement.className="simple-selector"+matchingSelectorClass;if(rule.styleSheetId)
selectorElement._selectorIndex=i;selectorElement.textContent=selectors[i].value;fragment.appendChild(selectorElement);}
this._selectorElement.removeChildren();this._selectorElement.appendChild(fragment);this._markSelectorHighlights();},_markSelectorHighlights:function()
{var selectors=this._selectorElement.getElementsByClassName("simple-selector");var regex=this._parentPane.filterRegex();for(var i=0;i<selectors.length;++i){var selectorMatchesFilter=regex&&regex.test(selectors[i].textContent);selectors[i].classList.toggle("filter-match",selectorMatchesFilter);}},_checkWillCancelEditing:function()
{var willCauseCancelEditing=this._willCauseCancelEditing;delete this._willCauseCancelEditing;return willCauseCancelEditing;},_handleSelectorContainerClick:function(event)
{if(this._checkWillCancelEditing()||!this.editable)
return;if(event.target===this._selectorContainer)
this.addNewBlankProperty(0).startEditing();},addNewBlankProperty:function(index)
{var style=this.styleRule.style;var property=style.newBlankProperty(index);var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this.styleRule,style,property,false,false,false);index=property.index;this.propertiesTreeOutline.insertChild(item,index);item.listItemElement.textContent="";item._newProperty=true;item.updateTitle();return item;},_createRuleOriginNode:function()
{function linkifyUncopyable(url,line)
{var link=WebInspector.linkifyResourceAsNode(url,line,"",url+":"+(line+1));link.classList.add("webkit-html-resource-link");link.setAttribute("data-uncopyable",link.textContent);link.textContent="";return link;}
if(this.styleRule.sourceURL){var firstMatchingIndex=this.styleRule.rule.matchingSelectors&&this.rule.matchingSelectors.length?this.rule.matchingSelectors[0]:0;var matchingSelectorLocation=new WebInspector.CSSLocation(this._parentPane._target,this.styleRule.sourceURL,this.rule.lineNumberInSource(firstMatchingIndex),this.rule.columnNumberInSource(firstMatchingIndex));return this._parentPane._linkifier.linkifyCSSLocation(this.rule.styleSheetId,matchingSelectorLocation)||linkifyUncopyable(this.styleRule.sourceURL,this.rule.lineNumberInSource());}
if(!this.rule)
return document.createTextNode("");if(this.rule.isUserAgent)
return document.createTextNode(WebInspector.UIString("user agent stylesheet"));if(this.rule.isUser)
return document.createTextNode(WebInspector.UIString("user stylesheet"));if(this.rule.isViaInspector)
return document.createTextNode(WebInspector.UIString("via inspector"));return document.createTextNode("");},_handleEmptySpaceMouseDown:function()
{this._willCauseCancelEditing=this._parentPane._isEditingStyle;},_handleEmptySpaceClick:function(event)
{if(!this.editable)
return;if(!window.getSelection().isCollapsed)
return;if(this._checkWillCancelEditing())
return;if(event.target.classList.contains("header")||this.element.classList.contains("read-only")||event.target.enclosingNodeOrSelfWithClass("media")){event.consume();return;}
this.expand();this.addNewBlankProperty().startEditing();},_handleSelectorClick:function(event)
{if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)&&this.navigable&&event.target.classList.contains("simple-selector")){var index=event.target._selectorIndex;var styleSheetHeader=this._parentPane._target.cssModel.styleSheetHeaderForId(this.rule.styleSheetId);var uiLocation=styleSheetHeader.rawLocationToUILocation(this.rule.lineNumberInSource(index),this.rule.columnNumberInSource(index));WebInspector.Revealer.reveal(uiLocation);return;}
this._startEditingOnMouseEvent();event.consume(true);},_startEditingOnMouseEvent:function()
{if(!this.editable)
return;if(!this.rule&&this.propertiesTreeOutline.children.length===0){this.expand();this.addNewBlankProperty().startEditing();return;}
if(!this.rule)
return;this.startEditingSelector();},startEditingSelector:function()
{var element=this._selectorElement;if(WebInspector.isBeingEdited(element))
return;element.scrollIntoViewIfNeeded(false);element.textContent=element.textContent;var config=new WebInspector.InplaceEditor.Config(this.editingSelectorCommitted.bind(this),this.editingSelectorCancelled.bind(this));WebInspector.InplaceEditor.startEditing(this._selectorElement,config);window.getSelection().setBaseAndExtent(element,0,element,1);this._parentPane._isEditingStyle=true;},_moveEditorFromSelector:function(moveDirection)
{this._markSelectorMatches();if(!moveDirection)
return;if(moveDirection==="forward"){this.expand();var firstChild=this.propertiesTreeOutline.children[0];while(firstChild&&firstChild.inherited)
firstChild=firstChild.nextSibling;if(!firstChild)
this.addNewBlankProperty().startEditing();else
firstChild.startEditing(firstChild.nameElement);}else{var previousSection=this.previousEditableSibling();if(!previousSection)
return;previousSection.expand();previousSection.addNewBlankProperty().startEditing();}},editingSelectorCommitted:function(element,newContent,oldContent,context,moveDirection)
{this._editingSelectorEnded();if(newContent)
newContent=newContent.trim();if(newContent===oldContent){this._selectorElement.textContent=newContent;this._moveEditorFromSelector(moveDirection);return;}
var selectedNode=this._parentPane._node;function successCallback(newRule)
{var doesAffectSelectedNode=newRule.matchingSelectors.length>0;if(!doesAffectSelectedNode){this.noAffect=true;this.element.classList.add("no-affect");}else{delete this.noAffect;this.element.classList.remove("no-affect");}
var oldSelectorRange=this.rule.selectorRange;this.rule=newRule;this.styleRule={section:this,style:newRule.style,selectorText:newRule.selectorText,media:newRule.media,sourceURL:newRule.resourceURL(),rule:newRule};this._parentPane.update(selectedNode);this._parentPane._styleSheetRuleEdited(this.rule,oldSelectorRange,this.rule.selectorRange);finishOperationAndMoveEditor.call(this,moveDirection);}
function finishOperationAndMoveEditor(direction)
{delete this._parentPane._userOperation;this._moveEditorFromSelector(direction);}
this._parentPane._userOperation=true;this._parentPane._target.cssModel.setRuleSelector(this.rule,selectedNode?selectedNode.id:0,newContent,successCallback.bind(this),finishOperationAndMoveEditor.bind(this,moveDirection));},_updateRuleOrigin:function()
{this._selectorRefElement.removeChildren();this._selectorRefElement.appendChild(this._createRuleOriginNode());},_editingSelectorEnded:function()
{delete this._parentPane._isEditingStyle;},editingSelectorCancelled:function()
{this._editingSelectorEnded();this._markSelectorMatches();},__proto__:WebInspector.PropertiesSection.prototype}
WebInspector.ComputedStylePropertiesSection=function(stylesPane,styleRule,usedProperties)
{WebInspector.PropertiesSection.call(this,"");var subtitle=this.headerElement.createChild("div","sidebar-pane-subtitle vbox");var showInheritedCheckbox=new WebInspector.Checkbox(WebInspector.UIString("Show inherited properties"),"hbox");subtitle.appendChild(showInheritedCheckbox.element);this._hasFreshContent=false;function showInheritedToggleFunction()
{var showInherited=showInheritedCheckbox.checked;WebInspector.settings.showInheritedComputedStyleProperties.set(showInherited);if(showInherited)
this.element.classList.add("styles-show-inherited");else
this.element.classList.remove("styles-show-inherited");}
showInheritedCheckbox.addEventListener(showInheritedToggleFunction.bind(this));this.element.className="styles-section monospace read-only computed-style";if(WebInspector.settings.showInheritedComputedStyleProperties.get()){this.element.classList.add("styles-show-inherited");showInheritedCheckbox.checked=true;}
this._stylesPane=stylesPane;this.styleRule=styleRule;this._usedProperties=usedProperties;this._alwaysShowComputedProperties={"display":true,"height":true,"width":true};this.computedStyle=true;this._propertyTreeElements={};this._expandedPropertyNames={};}
WebInspector.ComputedStylePropertiesSection.prototype={collapse:function(dontRememberState)
{},_isPropertyInherited:function(propertyName)
{var canonicalName=WebInspector.CSSMetadata.canonicalPropertyName(propertyName);return!(canonicalName in this._usedProperties)&&!(canonicalName in this._alwaysShowComputedProperties);},update:function()
{this._expandedPropertyNames={};for(var name in this._propertyTreeElements){if(this._propertyTreeElements[name].expanded)
this._expandedPropertyNames[name]=true;}
this._propertyTreeElements={};this.propertiesTreeOutline.removeChildren();this.populated=false;},_updateFilter:function()
{var children=this.propertiesTreeOutline.children;for(var i=0;i<children.length;++i)
children[i]._updateFilter();},onpopulate:function()
{function sorter(a,b)
{return a.name.compareTo(b.name);}
var style=this.styleRule.style;if(!style)
return;var uniqueProperties=[];var allProperties=style.allProperties;for(var i=0;i<allProperties.length;++i)
uniqueProperties.push(allProperties[i]);uniqueProperties.sort(sorter);this._propertyTreeElements={};for(var i=0;i<uniqueProperties.length;++i){var property=uniqueProperties[i];var inherited=this._isPropertyInherited(property.name);var item=new WebInspector.ComputedStylePropertyTreeElement(this._stylesPane,this.styleRule,style,property,inherited);this.propertiesTreeOutline.appendChild(item);this._propertyTreeElements[property.name]=item;}},rebuildComputedTrace:function(sections)
{for(var i=0;i<sections.length;++i){var section=sections[i];if(section.computedStyle||section.isBlank)
continue;for(var j=0;j<section.uniqueProperties.length;++j){var property=section.uniqueProperties[j];if(property.disabled)
continue;if(section.isInherited&&!WebInspector.CSSMetadata.isPropertyInherited(property.name))
continue;var treeElement=this._propertyTreeElements[property.name.toLowerCase()];if(treeElement){var fragment=document.createDocumentFragment();var selector=fragment.createChild("span");selector.style.color="gray";selector.textContent=section.styleRule.selectorText;fragment.appendChild(document.createTextNode(" - "+property.value+" "));var subtitle=fragment.createChild("span");subtitle.style.float="right";subtitle.appendChild(section._createRuleOriginNode());var childElement=new TreeElement(fragment,null,false);treeElement.appendChild(childElement);if(property.inactive||section.isPropertyOverloaded(property.name))
childElement.listItemElement.classList.add("overloaded");if(!property.parsedOk){childElement.listItemElement.classList.add("not-parsed-ok");childElement.listItemElement.insertBefore(WebInspector.StylesSidebarPane.createExclamationMark(property),childElement.listItemElement.firstChild);if(WebInspector.StylesSidebarPane._ignoreErrorsForProperty(property))
childElement.listItemElement.classList.add("has-ignorable-error");}}}}
for(var name in this._expandedPropertyNames){if(name in this._propertyTreeElements)
this._propertyTreeElements[name].expand();}},__proto__:WebInspector.PropertiesSection.prototype}
WebInspector.BlankStylePropertiesSection=function(stylesPane,defaultSelectorText)
{WebInspector.StylePropertiesSection.call(this,stylesPane,{selectorText:defaultSelectorText,rule:{isViaInspector:true}},true,false);this.element.classList.add("blank-section");}
WebInspector.BlankStylePropertiesSection.prototype={get isBlank()
{return!this._normal;},expand:function()
{if(!this.isBlank)
WebInspector.StylePropertiesSection.prototype.expand.call(this);},editingSelectorCommitted:function(element,newContent,oldContent,context,moveDirection)
{if(!this.isBlank){WebInspector.StylePropertiesSection.prototype.editingSelectorCommitted.call(this,element,newContent,oldContent,context,moveDirection);return;}
function successCallback(newRule)
{var doesSelectorAffectSelectedNode=newRule.matchingSelectors.length>0;var styleRule={section:this,style:newRule.style,selectorText:newRule.selectorText,sourceURL:newRule.resourceURL(),rule:newRule};this.makeNormal(styleRule);if(!doesSelectorAffectSelectedNode){this.noAffect=true;this.element.classList.add("no-affect");}
this._updateRuleOrigin();this.expand();if(this.element.parentElement)
this._moveEditorFromSelector(moveDirection);delete this._parentPane._userOperation;this._editingSelectorEnded();this._markSelectorMatches();}
if(newContent)
newContent=newContent.trim();this._parentPane._userOperation=true;var cssModel=this._parentPane._target.cssModel;cssModel.requestViaInspectorStylesheet(this._parentPane._node,viaInspectorCallback.bind(this));function viaInspectorCallback(styleSheetHeader)
{if(!styleSheetHeader){this.editingSelectorCancelled();return;}
cssModel.addRule(styleSheetHeader.id,this._parentPane._node,newContent,successCallback.bind(this),this.editingSelectorCancelled.bind(this));}},editingSelectorCancelled:function()
{delete this._parentPane._userOperation;if(!this.isBlank){WebInspector.StylePropertiesSection.prototype.editingSelectorCancelled.call(this);return;}
this._editingSelectorEnded();this._parentPane.removeSection(this);},makeNormal:function(styleRule)
{this.element.classList.remove("blank-section");this.styleRule=styleRule;this.rule=styleRule.rule;this._normal=true;},__proto__:WebInspector.StylePropertiesSection.prototype}
WebInspector.StylePropertyTreeElementBase=function(styleRule,style,property,inherited,overloaded,hasChildren)
{this._styleRule=styleRule;this.style=style;this.property=property;this._inherited=inherited;this._overloaded=overloaded;TreeElement.call(this,"",null,hasChildren);this.selectable=false;}
WebInspector.StylePropertyTreeElementBase.prototype={node:function()
{return null;},editablePane:function()
{return null;},parentPane:function()
{throw"Not implemented";},get inherited()
{return this._inherited;},hasIgnorableError:function()
{return!this.parsedOk&&WebInspector.StylesSidebarPane._ignoreErrorsForProperty(this.property);},set inherited(x)
{if(x===this._inherited)
return;this._inherited=x;this.updateState();},get overloaded()
{return this._overloaded;},set overloaded(x)
{if(x===this._overloaded)
return;this._overloaded=x;this.updateState();},get disabled()
{return this.property.disabled;},get name()
{if(!this.disabled||!this.property.text)
return this.property.name;var text=this.property.text;var index=text.indexOf(":");if(index<1)
return this.property.name;text=text.substring(0,index).trim();if(text.startsWith("/*"))
text=text.substring(2).trim();return text;},get value()
{if(!this.disabled||!this.property.text)
return this.property.value;var match=this.property.text.match(/(.*);\s*/);if(!match||!match[1])
return this.property.value;var text=match[1];var index=text.indexOf(":");if(index<1)
return this.property.value;return text.substring(index+1).trim();},get parsedOk()
{return this.property.parsedOk;},onattach:function()
{this.updateTitle();},updateTitle:function()
{var value=this.value;this.updateState();var nameElement=document.createElement("span");nameElement.className="webkit-css-property";nameElement.textContent=this.name;nameElement.title=this.property.propertyText;this.nameElement=nameElement;this._expandElement=document.createElement("span");this._expandElement.className="expand-element";var valueElement=document.createElement("span");valueElement.className="value";this.valueElement=valueElement;function processValue(regex,processor,nextProcessor,valueText)
{var container=document.createDocumentFragment();var items=valueText.replace(regex,"\0$1\0").split("\0");for(var i=0;i<items.length;++i){if((i%2)===0){if(nextProcessor)
container.appendChild(nextProcessor(items[i]));else
container.appendChild(document.createTextNode(items[i]));}else{var processedNode=processor(items[i]);if(processedNode)
container.appendChild(processedNode);}}
return container;}
function linkifyURL(url)
{var hrefUrl=url;var match=hrefUrl.match(/['"]?([^'"]+)/);if(match)
hrefUrl=match[1];var container=document.createDocumentFragment();container.appendChild(document.createTextNode("url("));if(this._styleRule.sourceURL)
hrefUrl=WebInspector.ParsedURL.completeURL(this._styleRule.sourceURL,hrefUrl);else if(this.node())
hrefUrl=this.node().resolveURL(hrefUrl);var hasResource=hrefUrl&&!!WebInspector.resourceForURL(hrefUrl);container.appendChild(WebInspector.linkifyURLAsNode(hrefUrl||url,url,undefined,!hasResource));container.appendChild(document.createTextNode(")"));return container;}
if(value){var colorProcessor=processValue.bind(null,WebInspector.StylesSidebarPane._colorRegex,this._processColor.bind(this,nameElement,valueElement),null);valueElement.appendChild(processValue(/url\(\s*([^)]+)\s*\)/g,linkifyURL.bind(this),WebInspector.CSSMetadata.isColorAwareProperty(this.name)&&this.parsedOk?colorProcessor:null,value));}
this.listItemElement.removeChildren();nameElement.normalize();valueElement.normalize();if(!this.treeOutline)
return;if(this.disabled)
this.listItemElement.createChild("span","styles-clipboard-only").createTextChild("/* ");this.listItemElement.appendChild(nameElement);this.listItemElement.appendChild(document.createTextNode(": "));this.listItemElement.appendChild(this._expandElement);this.listItemElement.appendChild(valueElement);this.listItemElement.appendChild(document.createTextNode(";"));if(this.disabled)
this.listItemElement.createChild("span","styles-clipboard-only").createTextChild(" */");if(!this.parsedOk){this.hasChildren=false;this.listItemElement.classList.add("not-parsed-ok");this.listItemElement.insertBefore(WebInspector.StylesSidebarPane.createExclamationMark(this.property),this.listItemElement.firstChild);}
if(this.property.inactive)
this.listItemElement.classList.add("inactive");this._updateFilter();},_updateFilter:function()
{var regEx=this.parentPane().filterRegex();this.listItemElement.classList.toggle("filter-match",!!regEx&&(regEx.test(this.property.name)||regEx.test(this.property.value)));},_processColor:function(nameElement,valueElement,text)
{var color=WebInspector.Color.parse(text);if(!color)
return document.createTextNode(text);var format=WebInspector.StylesSidebarPane._colorFormat(color);var spectrumHelper=this.editablePane()&&this.editablePane()._spectrumHelper;var spectrum=spectrumHelper?spectrumHelper.spectrum():null;var isEditable=!!(this._styleRule&&this._styleRule.editable!==false);var colorSwatch=new WebInspector.ColorSwatch(!isEditable);colorSwatch.setColorString(text);colorSwatch.element.addEventListener("click",swatchClick.bind(this),false);var scrollerElement;var boundSpectrumChanged=spectrumChanged.bind(this);var boundSpectrumHidden=spectrumHidden.bind(this);function spectrumChanged(e)
{var colorString=(e.data);spectrum.displayText=colorString;colorValueElement.textContent=colorString;colorSwatch.setColorString(colorString);this.applyStyleText(nameElement.textContent+": "+valueElement.textContent,false,false,false);}
function spectrumHidden(event)
{if(scrollerElement)
scrollerElement.removeEventListener("scroll",repositionSpectrum,false);var commitEdit=event.data;var propertyText=!commitEdit&&this.originalPropertyText?this.originalPropertyText:(nameElement.textContent+": "+valueElement.textContent);this.applyStyleText(propertyText,true,true,false);spectrum.removeEventListener(WebInspector.Spectrum.Events.ColorChanged,boundSpectrumChanged);spectrumHelper.removeEventListener(WebInspector.SpectrumPopupHelper.Events.Hidden,boundSpectrumHidden);delete this.editablePane()._isEditingStyle;delete this.originalPropertyText;}
function repositionSpectrum()
{spectrumHelper.reposition(colorSwatch.element);}
function swatchClick(e)
{e.consume(true);if(!spectrumHelper||e.shiftKey){changeColorDisplay();return;}
if(!isEditable)
return;var visible=spectrumHelper.toggle(colorSwatch.element,color,format);if(visible){spectrum.displayText=color.toString(format);this.originalPropertyText=this.property.propertyText;this.editablePane()._isEditingStyle=true;spectrum.addEventListener(WebInspector.Spectrum.Events.ColorChanged,boundSpectrumChanged);spectrumHelper.addEventListener(WebInspector.SpectrumPopupHelper.Events.Hidden,boundSpectrumHidden);scrollerElement=colorSwatch.element.enclosingNodeOrSelfWithClass("scroll-target");if(scrollerElement)
scrollerElement.addEventListener("scroll",repositionSpectrum,false);else
console.error("Unable to handle color picker scrolling");}}
var colorValueElement=document.createElement("span");colorValueElement.textContent=color.toString(format);function nextFormat(curFormat)
{var cf=WebInspector.Color.Format;switch(curFormat){case cf.Original:return!color.hasAlpha()?cf.RGB:cf.RGBA;case cf.RGB:case cf.RGBA:return!color.hasAlpha()?cf.HSL:cf.HSLA;case cf.HSL:case cf.HSLA:if(color.nickname())
return cf.Nickname;if(!color.hasAlpha())
return color.canBeShortHex()?cf.ShortHEX:cf.HEX;else
return cf.Original;case cf.ShortHEX:return cf.HEX;case cf.HEX:return cf.Original;case cf.Nickname:if(!color.hasAlpha())
return color.canBeShortHex()?cf.ShortHEX:cf.HEX;else
return cf.Original;default:return cf.RGBA;}}
function changeColorDisplay()
{do{format=nextFormat(format);var currentValue=color.toString(format);}while(currentValue===colorValueElement.textContent);colorValueElement.textContent=currentValue;}
var container=document.createElement("nobr");container.appendChild(colorSwatch.element);container.appendChild(colorValueElement);return container;},updateState:function()
{if(!this.listItemElement)
return;if(this.style.isPropertyImplicit(this.name))
this.listItemElement.classList.add("implicit");else
this.listItemElement.classList.remove("implicit");if(this.hasIgnorableError())
this.listItemElement.classList.add("has-ignorable-error");else
this.listItemElement.classList.remove("has-ignorable-error");if(this.inherited)
this.listItemElement.classList.add("inherited");else
this.listItemElement.classList.remove("inherited");if(this.overloaded)
this.listItemElement.classList.add("overloaded");else
this.listItemElement.classList.remove("overloaded");if(this.disabled)
this.listItemElement.classList.add("disabled");else
this.listItemElement.classList.remove("disabled");},__proto__:TreeElement.prototype}
WebInspector.ComputedStylePropertyTreeElement=function(stylesPane,styleRule,style,property,inherited)
{WebInspector.StylePropertyTreeElementBase.call(this,styleRule,style,property,inherited,false,false);this._stylesPane=stylesPane;}
WebInspector.ComputedStylePropertyTreeElement.prototype={node:function()
{return this._stylesPane._node;},editablePane:function()
{return null;},parentPane:function()
{return this._stylesPane._computedStylePane;},_updateFilter:function()
{var regEx=this.parentPane().filterRegex();this.listItemElement.classList.toggle("hidden",!!regEx&&(!regEx.test(this.property.name)&&!regEx.test(this.property.value)));},__proto__:WebInspector.StylePropertyTreeElementBase.prototype}
WebInspector.StylePropertyTreeElement=function(stylesPane,styleRule,style,property,isShorthand,inherited,overloaded)
{WebInspector.StylePropertyTreeElementBase.call(this,styleRule,style,property,inherited,overloaded,isShorthand);this._parentPane=stylesPane;this.isShorthand=isShorthand;}
WebInspector.StylePropertyTreeElement.prototype={node:function()
{return this._parentPane._node;},editablePane:function()
{return this._parentPane;},parentPane:function()
{return this._parentPane;},section:function()
{return this.treeOutline&&this.treeOutline.section;},_updatePane:function(userCallback)
{var section=this.section();if(section&&section._parentPane)
section._parentPane._refreshUpdate(section,false,userCallback);else{if(userCallback)
userCallback();}},_applyNewStyle:function(newStyle)
{newStyle.parentRule=this.style.parentRule;var oldStyleRange=(this.style.range);var newStyleRange=(newStyle.range);this.style=newStyle;this._styleRule.style=newStyle;if(this.style.parentRule){this.style.parentRule.style=this.style;this._parentPane._styleSheetRuleEdited(this.style.parentRule,oldStyleRange,newStyleRange);}},toggleEnabled:function(event)
{var disabled=!event.target.checked;function callback(newStyle)
{delete this._parentPane._userOperation;if(!newStyle)
return;this._applyNewStyle(newStyle);var section=this.section();if(section&&section._parentPane)
section._parentPane.dispatchEventToListeners("style property toggled");this._updatePane();}
this._parentPane._userOperation=true;this.property.setDisabled(disabled,callback.bind(this));event.consume();},onpopulate:function()
{if(this.children.length||!this.isShorthand)
return;var longhandProperties=this.style.longhandProperties(this.name);for(var i=0;i<longhandProperties.length;++i){var name=longhandProperties[i].name;var inherited=false;var overloaded=false;var section=this.section();if(section){inherited=section.isPropertyInherited(name);overloaded=section.isPropertyOverloaded(name);}
var liveProperty=this.style.getLiveProperty(name);if(!liveProperty)
continue;var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this._styleRule,this.style,liveProperty,false,inherited,overloaded);this.appendChild(item);}},onattach:function()
{WebInspector.StylePropertyTreeElementBase.prototype.onattach.call(this);this.listItemElement.addEventListener("mousedown",this._mouseDown.bind(this));this.listItemElement.addEventListener("mouseup",this._resetMouseDownElement.bind(this));this.listItemElement.addEventListener("click",this._mouseClick.bind(this));},_mouseDown:function(event)
{if(this._parentPane){this._parentPane._mouseDownTreeElement=this;this._parentPane._mouseDownTreeElementIsName=this._isNameElement(event.target);this._parentPane._mouseDownTreeElementIsValue=this._isValueElement(event.target);}},_resetMouseDownElement:function()
{if(this._parentPane){delete this._parentPane._mouseDownTreeElement;delete this._parentPane._mouseDownTreeElementIsName;delete this._parentPane._mouseDownTreeElementIsValue;}},updateTitle:function()
{WebInspector.StylePropertyTreeElementBase.prototype.updateTitle.call(this);if(this.parsedOk&&this.section()&&this.parent.root){var enabledCheckboxElement=document.createElement("input");enabledCheckboxElement.className="enabled-button";enabledCheckboxElement.type="checkbox";enabledCheckboxElement.checked=!this.disabled;enabledCheckboxElement.addEventListener("click",this.toggleEnabled.bind(this),false);this.listItemElement.insertBefore(enabledCheckboxElement,this.listItemElement.firstChild);}},_mouseClick:function(event)
{if(!window.getSelection().isCollapsed)
return;event.consume(true);if(event.target===this.listItemElement){var section=this.section();if(!section||!section.editable)
return;if(section._checkWillCancelEditing())
return;section.addNewBlankProperty(this.property.index+1).startEditing();return;}
if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)&&this.section().navigable){this._navigateToSource(event.target);return;}
this.startEditing(event.target);},_navigateToSource:function(element)
{console.assert(this.section().navigable);var propertyNameClicked=element===this.nameElement;WebInspector.Revealer.reveal(this.property.uiLocation(propertyNameClicked));},_isNameElement:function(element)
{return element.enclosingNodeOrSelfWithClass("webkit-css-property")===this.nameElement;},_isValueElement:function(element)
{return!!element.enclosingNodeOrSelfWithClass("value");},startEditing:function(selectElement)
{if(this.parent.isShorthand)
return;if(selectElement===this._expandElement)
return;var section=this.section();if(section&&!section.editable)
return;if(!selectElement)
selectElement=this.nameElement;else
selectElement=selectElement.enclosingNodeOrSelfWithClass("webkit-css-property")||selectElement.enclosingNodeOrSelfWithClass("value");if(WebInspector.isBeingEdited(selectElement))
return;var isEditingName=selectElement===this.nameElement;if(!isEditingName)
this.valueElement.textContent=restoreURLs(this.valueElement.textContent,this.value);function restoreURLs(fieldValue,modelValue)
{const urlRegex=/\b(url\([^)]*\))/g;var splitFieldValue=fieldValue.split(urlRegex);if(splitFieldValue.length===1)
return fieldValue;var modelUrlRegex=new RegExp(urlRegex);for(var i=1;i<splitFieldValue.length;i+=2){var match=modelUrlRegex.exec(modelValue);if(match)
splitFieldValue[i]=match[0];}
return splitFieldValue.join("");}
var context={expanded:this.expanded,hasChildren:this.hasChildren,isEditingName:isEditingName,previousContent:selectElement.textContent};this.hasChildren=false;if(selectElement.parentElement)
selectElement.parentElement.classList.add("child-editing");selectElement.textContent=selectElement.textContent;function pasteHandler(context,event)
{var data=event.clipboardData.getData("Text");if(!data)
return;var colonIdx=data.indexOf(":");if(colonIdx<0)
return;var name=data.substring(0,colonIdx).trim();var value=data.substring(colonIdx+1).trim();event.preventDefault();if(!("originalName"in context)){context.originalName=this.nameElement.textContent;context.originalValue=this.valueElement.textContent;}
this.property.name=name;this.property.value=value;this.nameElement.textContent=name;this.valueElement.textContent=value;this.nameElement.normalize();this.valueElement.normalize();this.editingCommitted(event.target.textContent,context,"forward");}
function blurListener(context,event)
{var treeElement=this._parentPane._mouseDownTreeElement;var moveDirection="";if(treeElement===this){if(isEditingName&&this._parentPane._mouseDownTreeElementIsValue)
moveDirection="forward";if(!isEditingName&&this._parentPane._mouseDownTreeElementIsName)
moveDirection="backward";}
this.editingCommitted(event.target.textContent,context,moveDirection);}
delete this.originalPropertyText;this._parentPane._isEditingStyle=true;if(selectElement.parentElement)
selectElement.parentElement.scrollIntoViewIfNeeded(false);var applyItemCallback=!isEditingName?this._applyFreeFlowStyleTextEdit.bind(this,true):undefined;this._prompt=new WebInspector.StylesSidebarPane.CSSPropertyPrompt(isEditingName?WebInspector.CSSMetadata.cssPropertiesMetainfo:WebInspector.CSSMetadata.keywordsForProperty(this.nameElement.textContent),this,isEditingName);if(applyItemCallback){this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemApplied,applyItemCallback,this);this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemAccepted,applyItemCallback,this);}
var proxyElement=this._prompt.attachAndStartEditing(selectElement,blurListener.bind(this,context));proxyElement.addEventListener("keydown",this.editingNameValueKeyDown.bind(this,context),false);proxyElement.addEventListener("keypress",this.editingNameValueKeyPress.bind(this,context),false);if(isEditingName)
proxyElement.addEventListener("paste",pasteHandler.bind(this,context),false);window.getSelection().setBaseAndExtent(selectElement,0,selectElement,1);},editingNameValueKeyDown:function(context,event)
{if(event.handled)
return;var isEditingName=context.isEditingName;var result;if(isEnterKey(event)){event.preventDefault();result="forward";}else if(event.keyCode===WebInspector.KeyboardShortcut.Keys.Esc.code||event.keyIdentifier==="U+001B")
result="cancel";else if(!isEditingName&&this._newProperty&&event.keyCode===WebInspector.KeyboardShortcut.Keys.Backspace.code){var selection=window.getSelection();if(selection.isCollapsed&&!selection.focusOffset){event.preventDefault();result="backward";}}else if(event.keyIdentifier==="U+0009"){result=event.shiftKey?"backward":"forward";event.preventDefault();}
if(result){switch(result){case"cancel":this.editingCancelled(null,context);break;case"forward":case"backward":this.editingCommitted(event.target.textContent,context,result);break;}
event.consume();return;}
if(!isEditingName)
this._applyFreeFlowStyleTextEdit(false);},editingNameValueKeyPress:function(context,event)
{function shouldCommitValueSemicolon(text,cursorPosition)
{var openQuote="";for(var i=0;i<cursorPosition;++i){var ch=text[i];if(ch==="\\"&&openQuote!=="")
++i;else if(!openQuote&&(ch==="\""||ch==="'"))
openQuote=ch;else if(openQuote===ch)
openQuote="";}
return!openQuote;}
var keyChar=String.fromCharCode(event.charCode);var isFieldInputTerminated=(context.isEditingName?keyChar===":":keyChar===";"&&shouldCommitValueSemicolon(event.target.textContent,event.target.selectionLeftOffset()));if(isFieldInputTerminated){event.consume(true);this.editingCommitted(event.target.textContent,context,"forward");return;}},_applyFreeFlowStyleTextEdit:function(now)
{if(this._applyFreeFlowStyleTextEditTimer)
clearTimeout(this._applyFreeFlowStyleTextEditTimer);function apply()
{var valueText=this.valueElement.textContent;if(valueText.indexOf(";")===-1)
this.applyStyleText(this.nameElement.textContent+": "+valueText,false,false,false);}
if(now)
apply.call(this);else
this._applyFreeFlowStyleTextEditTimer=setTimeout(apply.bind(this),100);},kickFreeFlowStyleEditForTest:function()
{this._applyFreeFlowStyleTextEdit(true);},editingEnded:function(context)
{this._resetMouseDownElement();if(this._applyFreeFlowStyleTextEditTimer)
clearTimeout(this._applyFreeFlowStyleTextEditTimer);this.hasChildren=context.hasChildren;if(context.expanded)
this.expand();var editedElement=context.isEditingName?this.nameElement:this.valueElement;if(editedElement.parentElement)
editedElement.parentElement.classList.remove("child-editing");delete this._parentPane._isEditingStyle;},editingCancelled:function(element,context)
{this._removePrompt();this._revertStyleUponEditingCanceled(this.originalPropertyText);this.editingEnded(context);},_revertStyleUponEditingCanceled:function(originalPropertyText)
{if(typeof originalPropertyText==="string"){delete this.originalPropertyText;this.applyStyleText(originalPropertyText,true,false,true);}else{if(this._newProperty)
this.treeOutline.removeChild(this);else
this.updateTitle();}},_findSibling:function(moveDirection)
{var target=this;do{target=(moveDirection==="forward"?target.nextSibling:target.previousSibling);}while(target&&target.inherited);return target;},editingCommitted:function(userInput,context,moveDirection)
{this._removePrompt();this.editingEnded(context);var isEditingName=context.isEditingName;var createNewProperty,moveToPropertyName,moveToSelector;var isDataPasted="originalName"in context;var isDirtyViaPaste=isDataPasted&&(this.nameElement.textContent!==context.originalName||this.valueElement.textContent!==context.originalValue);var isPropertySplitPaste=isDataPasted&&isEditingName&&this.valueElement.textContent!==context.originalValue;var moveTo=this;var moveToOther=(isEditingName^(moveDirection==="forward"));var abandonNewProperty=this._newProperty&&!userInput&&(moveToOther||isEditingName);if(moveDirection==="forward"&&(!isEditingName||isPropertySplitPaste)||moveDirection==="backward"&&isEditingName){moveTo=moveTo._findSibling(moveDirection);if(moveTo)
moveToPropertyName=moveTo.name;else if(moveDirection==="forward"&&(!this._newProperty||userInput))
createNewProperty=true;else if(moveDirection==="backward")
moveToSelector=true;}
var moveToIndex=moveTo&&this.treeOutline?this.treeOutline.children.indexOf(moveTo):-1;var blankInput=/^\s*$/.test(userInput);var shouldCommitNewProperty=this._newProperty&&(isPropertySplitPaste||moveToOther||(!moveDirection&&!isEditingName)||(isEditingName&&blankInput));var section=this.section();if(((userInput!==context.previousContent||isDirtyViaPaste)&&!this._newProperty)||shouldCommitNewProperty){section._afterUpdate=moveToNextCallback.bind(this,this._newProperty,!blankInput,section);var propertyText;if(blankInput||(this._newProperty&&/^\s*$/.test(this.valueElement.textContent)))
propertyText="";else{if(isEditingName)
propertyText=userInput+": "+this.property.value;else
propertyText=this.property.name+": "+userInput;}
this.applyStyleText(propertyText,true,true,false);}else{if(isEditingName)
this.property.name=userInput;else
this.property.value=userInput;if(!isDataPasted&&!this._newProperty)
this.updateTitle();moveToNextCallback.call(this,this._newProperty,false,section);}
function moveToNextCallback(alreadyNew,valueChanged,section)
{if(!moveDirection)
return;if(moveTo&&moveTo.parent){moveTo.startEditing(!isEditingName?moveTo.nameElement:moveTo.valueElement);return;}
if(moveTo&&!moveTo.parent){var propertyElements=section.propertiesTreeOutline.children;if(moveDirection==="forward"&&blankInput&&!isEditingName)
--moveToIndex;if(moveToIndex>=propertyElements.length&&!this._newProperty)
createNewProperty=true;else{var treeElement=moveToIndex>=0?propertyElements[moveToIndex]:null;if(treeElement){var elementToEdit=!isEditingName||isPropertySplitPaste?treeElement.nameElement:treeElement.valueElement;if(alreadyNew&&blankInput)
elementToEdit=moveDirection==="forward"?treeElement.nameElement:treeElement.valueElement;treeElement.startEditing(elementToEdit);return;}else if(!alreadyNew)
moveToSelector=true;}}
if(createNewProperty){if(alreadyNew&&!valueChanged&&(isEditingName^(moveDirection==="backward")))
return;section.addNewBlankProperty().startEditing();return;}
if(abandonNewProperty){moveTo=this._findSibling(moveDirection);var sectionToEdit=(moveTo||moveDirection==="backward")?section:section.nextEditableSibling();if(sectionToEdit){if(sectionToEdit.rule)
sectionToEdit.startEditingSelector();else
sectionToEdit._moveEditorFromSelector(moveDirection);}
return;}
if(moveToSelector){if(section.rule)
section.startEditingSelector();else
section._moveEditorFromSelector(moveDirection);}}},_removePrompt:function()
{if(this._prompt){this._prompt.detach();delete this._prompt;}},_hasBeenModifiedIncrementally:function()
{return typeof this.originalPropertyText==="string"||(!!this.property.propertyText&&this._newProperty);},styleTextAppliedForTest:function()
{},applyStyleText:function(styleText,updateInterface,majorChange,isRevert)
{function userOperationFinishedCallback(parentPane,updateInterface)
{if(updateInterface)
delete parentPane._userOperation;}
if(!isRevert&&!updateInterface&&!this._hasBeenModifiedIncrementally()){this.originalPropertyText=this.property.propertyText;}
if(!this.treeOutline)
return;var section=this.section();styleText=styleText.replace(/\s/g," ").trim();var styleTextLength=styleText.length;if(!styleTextLength&&updateInterface&&!isRevert&&this._newProperty&&!this._hasBeenModifiedIncrementally()){this.parent.removeChild(this);section.afterUpdate();return;}
var currentNode=this._parentPane._node;if(updateInterface)
this._parentPane._userOperation=true;function callback(userCallback,originalPropertyText,newStyle)
{if(!newStyle){if(updateInterface){this._revertStyleUponEditingCanceled(originalPropertyText);}
userCallback();return;}
this._applyNewStyle(newStyle);if(this._newProperty)
this._newPropertyInStyle=true;this.property=newStyle.propertyAt(this.property.index);if(section&&section._parentPane)
section._parentPane.dispatchEventToListeners("style edited");if(updateInterface&&currentNode===this.node()){this._updatePane(userCallback);this.styleTextAppliedForTest();return;}
userCallback();this.styleTextAppliedForTest();}
if(styleText.length&&!/;\s*$/.test(styleText))
styleText+=";";var overwriteProperty=!!(!this._newProperty||this._newPropertyInStyle);this.property.setText(styleText,majorChange,overwriteProperty,callback.bind(this,userOperationFinishedCallback.bind(null,this._parentPane,updateInterface),this.originalPropertyText));},ondblclick:function()
{return true;},isEventWithinDisclosureTriangle:function(event)
{return event.target===this._expandElement;},__proto__:WebInspector.StylePropertyTreeElementBase.prototype}
WebInspector.StylesSidebarPane.CSSPropertyPrompt=function(cssCompletions,sidebarPane,isEditingName)
{WebInspector.TextPrompt.call(this,this._buildPropertyCompletions.bind(this),WebInspector.StyleValueDelimiters);this.setSuggestBoxEnabled(true);this._cssCompletions=cssCompletions;this._sidebarPane=sidebarPane;this._isEditingName=isEditingName;if(!isEditingName)
this.disableDefaultSuggestionForEmptyInput();}
WebInspector.StylesSidebarPane.CSSPropertyPrompt.prototype={onKeyDown:function(event)
{switch(event.keyIdentifier){case"Up":case"Down":case"PageUp":case"PageDown":if(this._handleNameOrValueUpDown(event)){event.preventDefault();return;}
break;case"Enter":if(this.autoCompleteElement&&!this.autoCompleteElement.textContent.length){this.tabKeyPressed();return;}
break;}
WebInspector.TextPrompt.prototype.onKeyDown.call(this,event);},onMouseWheel:function(event)
{if(this._handleNameOrValueUpDown(event)){event.consume(true);return;}
WebInspector.TextPrompt.prototype.onMouseWheel.call(this,event);},tabKeyPressed:function()
{this.acceptAutoComplete();return false;},_handleNameOrValueUpDown:function(event)
{function finishHandler(originalValue,replacementString)
{this._sidebarPane.applyStyleText(this._sidebarPane.nameElement.textContent+": "+this._sidebarPane.valueElement.textContent,false,false,false);}
if(!this._isEditingName&&WebInspector.handleElementValueModifications(event,this._sidebarPane.valueElement,finishHandler.bind(this),this._isValueSuggestion.bind(this)))
return true;return false;},_isValueSuggestion:function(word)
{if(!word)
return false;word=word.toLowerCase();return this._cssCompletions.keySet().hasOwnProperty(word);},_buildPropertyCompletions:function(proxyElement,wordRange,force,completionsReadyCallback)
{var prefix=wordRange.toString().toLowerCase();if(!prefix&&!force&&(this._isEditingName||proxyElement.textContent.length)){completionsReadyCallback([]);return;}
var results=this._cssCompletions.startsWith(prefix);var selectedIndex=this._cssCompletions.mostUsedOf(results);completionsReadyCallback(results,selectedIndex);},__proto__:WebInspector.TextPrompt.prototype};WebInspector.ElementsPanel=function()
{WebInspector.Panel.call(this,"elements");this.registerRequiredCSS("breadcrumbList.css");this.registerRequiredCSS("elementsPanel.css");this.registerRequiredCSS("suggestBox.css");this.setHideOnDetach();this._splitView=new WebInspector.SplitView(true,true,"elementsPanelSplitViewState",325,325);this._splitView.addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged,this._updateTreeOutlineVisibleWidth.bind(this));this._splitView.show(this.element);this._searchableView=new WebInspector.SearchableView(this);this._searchableView.setMinimumSize(25,19);this._searchableView.show(this._splitView.mainElement());var stackElement=this._searchableView.element;this.contentElement=stackElement.createChild("div");this.contentElement.id="elements-content";this.contentElement.classList.add("outline-disclosure");this.contentElement.classList.add("source-code");if(!WebInspector.settings.domWordWrap.get())
this.contentElement.classList.add("nowrap");WebInspector.settings.domWordWrap.addChangeListener(this._domWordWrapSettingChanged.bind(this));this.contentElement.addEventListener("contextmenu",this._contextMenuEventFired.bind(this),true);this._splitView.sidebarElement().addEventListener("contextmenu",this._sidebarContextMenuEventFired.bind(this),false);var crumbsContainer=stackElement.createChild("div");crumbsContainer.id="elements-crumbs";this.crumbsElement=crumbsContainer.createChild("div","crumbs");this.crumbsElement.addEventListener("mousemove",this._mouseMovedInCrumbs.bind(this),false);this.crumbsElement.addEventListener("mouseout",this._mouseMovedOutOfCrumbs.bind(this),false);this.sidebarPanes={};this.sidebarPanes.platformFonts=new WebInspector.PlatformFontsSidebarPane();this.sidebarPanes.computedStyle=new WebInspector.ComputedStyleSidebarPane();this.sidebarPanes.styles=new WebInspector.StylesSidebarPane(this.sidebarPanes.computedStyle,this._setPseudoClassForNode.bind(this));this._matchedStylesFilterBoxContainer=document.createElement("div");this._matchedStylesFilterBoxContainer.className="sidebar-pane-filter-box";this._computedStylesFilterBoxContainer=document.createElement("div");this._computedStylesFilterBoxContainer.className="sidebar-pane-filter-box";this.sidebarPanes.styles.setFilterBoxContainers(this._matchedStylesFilterBoxContainer,this._computedStylesFilterBoxContainer);this.sidebarPanes.metrics=new WebInspector.MetricsSidebarPane();this.sidebarPanes.properties=new WebInspector.PropertiesSidebarPane();this.sidebarPanes.domBreakpoints=WebInspector.domBreakpointsSidebarPane.createProxy(this);this.sidebarPanes.eventListeners=new WebInspector.EventListenersSidebarPane();this.sidebarPanes.styles.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown,this.updateStyles.bind(this,false));this.sidebarPanes.metrics.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown,this.updateMetrics.bind(this));this.sidebarPanes.platformFonts.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown,this.updatePlatformFonts.bind(this));this.sidebarPanes.properties.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown,this.updateProperties.bind(this));this.sidebarPanes.eventListeners.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown,this.updateEventListeners.bind(this));this.sidebarPanes.styles.addEventListener("style edited",this._stylesPaneEdited,this);this.sidebarPanes.styles.addEventListener("style property toggled",this._stylesPaneEdited,this);this.sidebarPanes.metrics.addEventListener("metrics edited",this._metricsPaneEdited,this);this._extensionSidebarPanes=[];WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged,this._dockSideChanged.bind(this));WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));this._dockSideChanged();this._popoverHelper=new WebInspector.PopoverHelper(this.element,this._getPopoverAnchor.bind(this),this._showPopover.bind(this));this._popoverHelper.setTimeout(0);this._treeOutlines=[];this._targetToTreeOutline=new Map();WebInspector.targetManager.observeTargets(this);WebInspector.settings.showUAShadowDOM.addChangeListener(this._showUAShadowDOMChanged.bind(this));}
WebInspector.ElementsPanel.prototype={targetAdded:function(target)
{var treeOutline=new WebInspector.ElementsTreeOutline(target,true,true,this._populateContextMenu.bind(this),this._setPseudoClassForNode.bind(this));treeOutline.wireToDOMModel();treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged,this._selectedNodeChanged,this);treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.ElementsTreeUpdated,this._updateBreadcrumbIfNeeded,this);this._treeOutlines.push(treeOutline);this._targetToTreeOutline.put(target,treeOutline);target.domModel.addEventListener(WebInspector.DOMModel.Events.DocumentUpdated,this._documentUpdatedEvent,this);target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.ModelWasEnabled,this._updateSidebars,this);if(this.isShowing())
this.wasShown();},targetRemoved:function(target)
{var treeOutline=this._targetToTreeOutline.get(target);treeOutline.unwireFromDOMModel();this._treeOutlines.remove(treeOutline);treeOutline.element.remove();target.domModel.removeEventListener(WebInspector.DOMModel.Events.DocumentUpdated,this._documentUpdatedEvent,this);target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.ModelWasEnabled,this._updateSidebars,this);},_firstTreeOutlineDeprecated:function()
{return this._treeOutlines[0]||null;},_updateTreeOutlineVisibleWidth:function()
{if(!this._treeOutlines.length)
return;var width=this._splitView.element.offsetWidth;if(this._splitView.isVertical())
width-=this._splitView.sidebarSize();for(var i=0;i<this._treeOutlines.length;++i){this._treeOutlines[i].setVisibleWidth(width);this._treeOutlines[i].updateSelection();}
this.updateBreadcrumbSizes();},defaultFocusedElement:function()
{return this._treeOutlines.length?this._treeOutlines[0].element:this.element;},searchableView:function()
{return this._searchableView;},wasShown:function()
{for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.element.parentElement!==this.contentElement)
this.contentElement.appendChild(treeOutline.element);}
WebInspector.Panel.prototype.wasShown.call(this);this.updateBreadcrumb();for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];treeOutline.updateSelection();treeOutline.setVisible(true);if(!treeOutline.rootDOMNode)
if(treeOutline.domModel().existingDocument())
this._documentUpdated(treeOutline.domModel(),treeOutline.domModel().existingDocument());else
treeOutline.domModel().requestDocument();}},willHide:function()
{for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];treeOutline.domModel().hideDOMNodeHighlight();treeOutline.setVisible(false);this.contentElement.removeChild(treeOutline.element);}
this._popoverHelper.hidePopover();WebInspector.Panel.prototype.willHide.call(this);},onResize:function()
{this._updateTreeOutlineVisibleWidth();},omitDefaultSelection:function()
{this._omitDefaultSelection=true;},stopOmittingDefaultSelection:function()
{delete this._omitDefaultSelection;},_setPseudoClassForNode:function(node,pseudoClass,enable)
{if(!node||!node.target().cssModel.forcePseudoState(node,pseudoClass,enable))
return;this._targetToTreeOutline.get(node.target()).updateOpenCloseTags(node);this._metricsPaneEdited();this._stylesPaneEdited();WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction,{action:WebInspector.UserMetrics.UserActionNames.ForcedElementState,selector:WebInspector.DOMPresentationUtils.fullQualifiedSelector(node,false),enabled:enable,state:pseudoClass});},_selectedNodeChanged:function(event)
{var selectedNode=(event.data);for(var i=0;i<this._treeOutlines.length;++i){if(!selectedNode||selectedNode.domModel()!==this._treeOutlines[i].domModel())
this._treeOutlines[i].selectDOMNode(null);}
if(!selectedNode&&this._lastValidSelectedNode)
this._selectedPathOnReset=this._lastValidSelectedNode.path();this.updateBreadcrumb(false);this._updateSidebars();if(selectedNode){ConsoleAgent.addInspectedNode(selectedNode.id);this._lastValidSelectedNode=selectedNode;}
WebInspector.notifications.dispatchEventToListeners(WebInspector.NotificationService.Events.SelectedNodeChanged);},_updateSidebars:function()
{for(var pane in this.sidebarPanes)
this.sidebarPanes[pane].needsUpdate=true;this.updateStyles(true);this.updateMetrics();this.updatePlatformFonts();this.updateProperties();this.updateEventListeners();},_reset:function()
{delete this.currentQuery;},_documentUpdatedEvent:function(event)
{this._documentUpdated((event.target),(event.data));},_documentUpdated:function(domModel,inspectedRootDocument)
{this._reset();this.searchCanceled();var treeOutline=this._targetToTreeOutline.get(domModel.target());treeOutline.rootDOMNode=inspectedRootDocument;if(!inspectedRootDocument){if(this.isShowing())
domModel.requestDocument();return;}
WebInspector.domBreakpointsSidebarPane.restoreBreakpoints(domModel.target());function selectNode(candidateFocusNode)
{if(!candidateFocusNode)
candidateFocusNode=inspectedRootDocument.body||inspectedRootDocument.documentElement;if(!candidateFocusNode)
return;this.selectDOMNode(candidateFocusNode);if(treeOutline.selectedTreeElement)
treeOutline.selectedTreeElement.expand();}
function selectLastSelectedNode(nodeId)
{if(this.selectedDOMNode()){return;}
var node=nodeId?domModel.nodeForId(nodeId):null;selectNode.call(this,node);}
if(this._omitDefaultSelection)
return;if(this._selectedPathOnReset)
domModel.pushNodeByPathToFrontend(this._selectedPathOnReset,selectLastSelectedNode.bind(this));else
selectNode.call(this,null);delete this._selectedPathOnReset;},searchCanceled:function()
{delete this._searchQuery;this._hideSearchHighlights();this._searchableView.updateSearchMatchesCount(0);delete this._currentSearchResultIndex;delete this._searchResults;WebInspector.domModel.cancelSearch();},performSearch:function(query,shouldJump,jumpBackwards)
{this.searchCanceled();const whitespaceTrimmedQuery=query.trim();if(!whitespaceTrimmedQuery.length)
return;this._searchQuery=query;function resultCountCallback(resultCount)
{this._searchableView.updateSearchMatchesCount(resultCount);if(!resultCount)
return;this._currentSearchResultIndex=-1;this._searchResults=new Array(resultCount);if(shouldJump)
this._jumpToSearchResult(jumpBackwards?-1:0);}
WebInspector.domModel.performSearch(whitespaceTrimmedQuery,resultCountCallback.bind(this));},_contextMenuEventFired:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].populateContextMenu(contextMenu,event);contextMenu.show();},_domWordWrapSettingChanged:function(event)
{if(event.data)
this.contentElement.classList.remove("nowrap");else
this.contentElement.classList.add("nowrap");var selectedNode=this.selectedDOMNode();if(!selectedNode)
return;var treeOutline=this._targetToTreeOutline.get(selectedNode.target());var treeElement=treeOutline.findTreeElement(selectedNode);if(treeElement)
treeElement.updateSelection();},switchToAndFocus:function(node)
{this._searchableView.cancelSearch();WebInspector.inspectorView.setCurrentPanel(this);this.selectDOMNode(node,true);},_populateContextMenu:function(contextMenu,node)
{contextMenu.appendSeparator();var pane=WebInspector.domBreakpointsSidebarPane;pane.populateNodeContextMenu(node,contextMenu);},_getPopoverAnchor:function(element)
{var anchor=element.enclosingNodeOrSelfWithClass("webkit-html-resource-link");if(!anchor||!anchor.href)
return null;var treeOutlineElement=anchor.enclosingNodeOrSelfWithClass("elements-tree-outline");if(!treeOutlineElement)
return null;for(var i=0;i<this._treeOutlines.length;++i){if(this._treeOutlines[i].element!==treeOutlineElement)
continue;var resource=this._treeOutlines[i].target().resourceTreeModel.resourceForURL(anchor.href);if(!resource||resource.type!==WebInspector.resourceTypes.Image)
return null;anchor.removeAttribute("title");return anchor;}
return null;},_loadDimensionsForNode:function(node,callback)
{if(!node.nodeName()||node.nodeName().toLowerCase()!=="img"){callback();return;}
node.resolveToObject("",resolvedNode);function resolvedNode(object)
{if(!object){callback();return;}
object.callFunctionJSON(dimensions,undefined,callback);object.release();function dimensions()
{return{offsetWidth:this.offsetWidth,offsetHeight:this.offsetHeight,naturalWidth:this.naturalWidth,naturalHeight:this.naturalHeight};}}},_showPopover:function(anchor,popover)
{var listItem=anchor.enclosingNodeOrSelfWithNodeName("li");if(listItem&&listItem.treeElement&&listItem.treeElement.treeOutline instanceof WebInspector.ElementsTreeOutline){var node=(listItem.treeElement.representedObject);this._loadDimensionsForNode(node,WebInspector.DOMPresentationUtils.buildImagePreviewContents.bind(WebInspector.DOMPresentationUtils,node.target(),anchor.href,true,showPopover));}else{var node=this.selectedDOMNode();if(node)
WebInspector.DOMPresentationUtils.buildImagePreviewContents(node.target(),anchor.href,true,showPopover);}
function showPopover(contents)
{if(!contents)
return;popover.setCanShrink(false);popover.show(contents,anchor);}},_jumpToSearchResult:function(index)
{this._hideSearchHighlights();this._currentSearchResultIndex=(index+this._searchResults.length)%this._searchResults.length;this._highlightCurrentSearchResult();},jumpToNextSearchResult:function()
{if(!this._searchResults)
return;this._jumpToSearchResult(this._currentSearchResultIndex+1);},jumpToPreviousSearchResult:function()
{if(!this._searchResults)
return;this._jumpToSearchResult(this._currentSearchResultIndex-1);},_highlightCurrentSearchResult:function()
{var treeOutline=this._firstTreeOutlineDeprecated();if(!treeOutline)
return;var index=this._currentSearchResultIndex;var searchResults=this._searchResults;var searchResult=searchResults[index];if(searchResult===null){this._searchableView.updateCurrentMatchIndex(index);return;}
function searchCallback(node)
{searchResults[index]=node;this._highlightCurrentSearchResult();}
if(typeof searchResult==="undefined"){WebInspector.domModel.searchResult(index,searchCallback.bind(this));return;}
this._searchableView.updateCurrentMatchIndex(index);var treeElement=treeOutline.findTreeElement(searchResult);if(treeElement){treeElement.highlightSearchResults(this._searchQuery);treeElement.reveal();var matches=treeElement.listItemElement.getElementsByClassName("highlighted-search-result");if(matches.length)
matches[0].scrollIntoViewIfNeeded();}},_hideSearchHighlights:function()
{if(!this._searchResults)
return;var searchResult=this._searchResults[this._currentSearchResultIndex];if(!searchResult)
return;var treeOutline=this._targetToTreeOutline.get(searchResult.target());var treeElement=treeOutline.findTreeElement(searchResult);if(treeElement)
treeElement.hideSearchHighlights();},selectedDOMNode:function()
{for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.selectedDOMNode())
return treeOutline.selectedDOMNode();}
return null;},selectDOMNode:function(node,focus)
{for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.target()===node.target())
treeOutline.selectDOMNode(node,focus);else
treeOutline.selectDOMNode(null);}},_updateBreadcrumbIfNeeded:function(event)
{var nodes=(event.data||[]);if(!nodes.length)
return;var crumbs=this.crumbsElement;for(var crumb=crumbs.firstChild;crumb;crumb=crumb.nextSibling){if(nodes.indexOf(crumb.representedObject)!==-1){this.updateBreadcrumb(true);return;}}},_stylesPaneEdited:function()
{this.sidebarPanes.metrics.needsUpdate=true;this.updateMetrics();this.sidebarPanes.platformFonts.needsUpdate=true;this.updatePlatformFonts();},_metricsPaneEdited:function()
{this.sidebarPanes.styles.needsUpdate=true;this.updateStyles(true);},_mouseMovedInCrumbs:function(event)
{var nodeUnderMouse=document.elementFromPoint(event.pageX,event.pageY);var crumbElement=nodeUnderMouse.enclosingNodeOrSelfWithClass("crumb");var node=(crumbElement?crumbElement.representedObject:null);if(node)
node.highlight();},_mouseMovedOutOfCrumbs:function(event)
{var nodeUnderMouse=document.elementFromPoint(event.pageX,event.pageY);if(nodeUnderMouse&&nodeUnderMouse.isDescendant(this.crumbsElement))
return;for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].domModel().hideDOMNodeHighlight();},updateBreadcrumb:function(forceUpdate)
{if(!this.isShowing())
return;var crumbs=this.crumbsElement;var handled=false;var crumb=crumbs.firstChild;while(crumb){if(crumb.representedObject===this.selectedDOMNode()){crumb.classList.add("selected");handled=true;}else{crumb.classList.remove("selected");}
crumb=crumb.nextSibling;}
if(handled&&!forceUpdate){this.updateBreadcrumbSizes();return;}
crumbs.removeChildren();var panel=this;function selectCrumbFunction(event)
{var crumb=event.currentTarget;if(crumb.classList.contains("collapsed")){if(crumb===panel.crumbsElement.firstChild){var currentCrumb=crumb;while(currentCrumb){var hidden=currentCrumb.classList.contains("hidden");var collapsed=currentCrumb.classList.contains("collapsed");if(!hidden&&!collapsed)
break;crumb=currentCrumb;currentCrumb=currentCrumb.nextSibling;}}
panel.updateBreadcrumbSizes(crumb);}else
panel.selectDOMNode(crumb.representedObject,true);event.preventDefault();}
for(var current=this.selectedDOMNode();current;current=current.parentNode){if(current.nodeType()===Node.DOCUMENT_NODE)
continue;crumb=document.createElement("span");crumb.className="crumb";crumb.representedObject=current;crumb.addEventListener("mousedown",selectCrumbFunction,false);var crumbTitle="";switch(current.nodeType()){case Node.ELEMENT_NODE:if(current.pseudoType())
crumbTitle="::"+current.pseudoType();else
WebInspector.DOMPresentationUtils.decorateNodeLabel(current,crumb);break;case Node.TEXT_NODE:crumbTitle=WebInspector.UIString("(text)");break;case Node.COMMENT_NODE:crumbTitle="<!-->";break;case Node.DOCUMENT_TYPE_NODE:crumbTitle="<!DOCTYPE>";break;case Node.DOCUMENT_FRAGMENT_NODE:crumbTitle=current.shadowRootType()?"#shadow-root":current.nodeNameInCorrectCase();break;default:crumbTitle=current.nodeNameInCorrectCase();}
if(!crumb.childNodes.length){var nameElement=document.createElement("span");nameElement.textContent=crumbTitle;crumb.appendChild(nameElement);crumb.title=crumbTitle;}
if(current===this.selectedDOMNode())
crumb.classList.add("selected");crumbs.insertBefore(crumb,crumbs.firstChild);}
this.updateBreadcrumbSizes();},updateBreadcrumbSizes:function(focusedCrumb)
{if(!this.isShowing())
return;var crumbs=this.crumbsElement;if(!crumbs.firstChild)
return;var selectedIndex=0;var focusedIndex=0;var selectedCrumb;for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];if(!selectedCrumb&&crumb.classList.contains("selected")){selectedCrumb=crumb;selectedIndex=i;}
if(crumb===focusedCrumb)
focusedIndex=i;crumb.classList.remove("compact","collapsed","hidden");}
var contentElementWidth=this.contentElement.offsetWidth;var normalSizes=[];for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];normalSizes[i]=crumb.offsetWidth;}
var compactSizes=[];for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];crumb.classList.add("compact");}
for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];compactSizes[i]=crumb.offsetWidth;}
crumbs.firstChild.classList.add("collapsed");var collapsedSize=crumbs.firstChild.offsetWidth;for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];crumb.classList.remove("compact","collapsed");}
function crumbsAreSmallerThanContainer()
{var totalSize=0;for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];if(crumb.classList.contains("hidden"))
continue;if(crumb.classList.contains("collapsed")){totalSize+=collapsedSize;continue;}
totalSize+=crumb.classList.contains("compact")?compactSizes[i]:normalSizes[i];}
const rightPadding=10;return totalSize+rightPadding<contentElementWidth;}
if(crumbsAreSmallerThanContainer())
return;var BothSides=0;var AncestorSide=-1;var ChildSide=1;function makeCrumbsSmaller(shrinkingFunction,direction)
{var significantCrumb=focusedCrumb||selectedCrumb;var significantIndex=significantCrumb===selectedCrumb?selectedIndex:focusedIndex;function shrinkCrumbAtIndex(index)
{var shrinkCrumb=crumbs.childNodes[index];if(shrinkCrumb&&shrinkCrumb!==significantCrumb)
shrinkingFunction(shrinkCrumb);if(crumbsAreSmallerThanContainer())
return true;return false;}
if(direction){var index=(direction>0?0:crumbs.childNodes.length-1);while(index!==significantIndex){if(shrinkCrumbAtIndex(index))
return true;index+=(direction>0?1:-1);}}else{var startIndex=0;var endIndex=crumbs.childNodes.length-1;while(startIndex!=significantIndex||endIndex!=significantIndex){var startDistance=significantIndex-startIndex;var endDistance=endIndex-significantIndex;if(startDistance>=endDistance)
var index=startIndex++;else
var index=endIndex--;if(shrinkCrumbAtIndex(index))
return true;}}
return false;}
function coalesceCollapsedCrumbs()
{var crumb=crumbs.firstChild;var collapsedRun=false;var newStartNeeded=false;var newEndNeeded=false;while(crumb){var hidden=crumb.classList.contains("hidden");if(!hidden){var collapsed=crumb.classList.contains("collapsed");if(collapsedRun&&collapsed){crumb.classList.add("hidden");crumb.classList.remove("compact");crumb.classList.remove("collapsed");if(crumb.classList.contains("start")){crumb.classList.remove("start");newStartNeeded=true;}
if(crumb.classList.contains("end")){crumb.classList.remove("end");newEndNeeded=true;}
continue;}
collapsedRun=collapsed;if(newEndNeeded){newEndNeeded=false;crumb.classList.add("end");}}else
collapsedRun=true;crumb=crumb.nextSibling;}
if(newStartNeeded){crumb=crumbs.lastChild;while(crumb){if(!crumb.classList.contains("hidden")){crumb.classList.add("start");break;}
crumb=crumb.previousSibling;}}}
function compact(crumb)
{if(crumb.classList.contains("hidden"))
return;crumb.classList.add("compact");}
function collapse(crumb,dontCoalesce)
{if(crumb.classList.contains("hidden"))
return;crumb.classList.add("collapsed");crumb.classList.remove("compact");if(!dontCoalesce)
coalesceCollapsedCrumbs();}
if(!focusedCrumb){if(makeCrumbsSmaller(compact,ChildSide))
return;if(makeCrumbsSmaller(collapse,ChildSide))
return;}
if(makeCrumbsSmaller(compact,focusedCrumb?BothSides:AncestorSide))
return;if(makeCrumbsSmaller(collapse,focusedCrumb?BothSides:AncestorSide))
return;if(!selectedCrumb)
return;compact(selectedCrumb);if(crumbsAreSmallerThanContainer())
return;collapse(selectedCrumb,true);},_cssModelEnabledForSelectedNode:function()
{if(!this.selectedDOMNode())
return true;return this.selectedDOMNode().target().cssModel.isEnabled();},updateStyles:function(forceUpdate)
{if(!this._cssModelEnabledForSelectedNode())
return;var stylesSidebarPane=this.sidebarPanes.styles;var computedStylePane=this.sidebarPanes.computedStyle;if((!stylesSidebarPane.isShowing()&&!computedStylePane.isShowing())||!stylesSidebarPane.needsUpdate)
return;stylesSidebarPane.update(this.selectedDOMNode(),forceUpdate);stylesSidebarPane.needsUpdate=false;},updateMetrics:function()
{if(!this._cssModelEnabledForSelectedNode())
return;var metricsSidebarPane=this.sidebarPanes.metrics;if(!metricsSidebarPane.isShowing()||!metricsSidebarPane.needsUpdate)
return;metricsSidebarPane.update(this.selectedDOMNode());metricsSidebarPane.needsUpdate=false;},updatePlatformFonts:function()
{if(!this._cssModelEnabledForSelectedNode())
return;var platformFontsSidebar=this.sidebarPanes.platformFonts;if(!platformFontsSidebar.isShowing()||!platformFontsSidebar.needsUpdate)
return;platformFontsSidebar.update(this.selectedDOMNode());platformFontsSidebar.needsUpdate=false;},updateProperties:function()
{var propertiesSidebarPane=this.sidebarPanes.properties;if(!propertiesSidebarPane.isShowing()||!propertiesSidebarPane.needsUpdate)
return;propertiesSidebarPane.update(this.selectedDOMNode());propertiesSidebarPane.needsUpdate=false;},updateEventListeners:function()
{var eventListenersSidebarPane=this.sidebarPanes.eventListeners;if(!eventListenersSidebarPane.isShowing()||!eventListenersSidebarPane.needsUpdate)
return;eventListenersSidebarPane.update(this.selectedDOMNode());eventListenersSidebarPane.needsUpdate=false;},handleShortcut:function(event)
{function handleUndoRedo()
{if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)&&!event.shiftKey&&event.keyIdentifier==="U+005A"){WebInspector.domModel.undo(this._updateSidebars.bind(this));event.handled=true;return;}
var isRedoKey=WebInspector.isMac()?event.metaKey&&event.shiftKey&&event.keyIdentifier==="U+005A":event.ctrlKey&&event.keyIdentifier==="U+0059";if(isRedoKey){WebInspector.domModel.redo(this._updateSidebars.bind(this));event.handled=true;}}
var treeOutline=this._firstTreeOutlineDeprecated();if(!treeOutline)
return;if(!treeOutline.editing()){handleUndoRedo.call(this);if(event.handled)
return;}
treeOutline.handleShortcut(event);},handleCopyEvent:function(event)
{var currentFocusElement=WebInspector.currentFocusElement();if(currentFocusElement&&WebInspector.isBeingEdited(currentFocusElement))
return;if(!window.getSelection().isCollapsed)
return;event.clipboardData.clearData();event.preventDefault();this.selectedDOMNode().copyNode();},_leaveUserAgentShadowDOM:function(node)
{var userAgentShadowRoot=node.ancestorUserAgentShadowRoot();return userAgentShadowRoot?(userAgentShadowRoot.parentNode):node;},revealAndSelectNode:function(node)
{WebInspector.inspectorView.setCurrentPanel(this);node=WebInspector.settings.showUAShadowDOM.get()?node:this._leaveUserAgentShadowDOM(node);node.highlightForTwoSeconds();this.selectDOMNode(node,true);},appendApplicableItems:function(event,contextMenu,object)
{var commandCallback;if(object instanceof WebInspector.RemoteObject){var remoteObject=(object);if(remoteObject.isNode())
commandCallback=remoteObject.reveal.bind(remoteObject);}else if(object instanceof WebInspector.DOMNode){var domNode=(object);commandCallback=domNode.reveal.bind(domNode);}
if(!commandCallback)
return;if(this.element.isAncestor(event.target))
return;contextMenu.appendItem(WebInspector.useLowerCaseMenuTitles()?"Reveal in Elements panel":"Reveal in Elements Panel",commandCallback);},_sidebarContextMenuEventFired:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.show();},_dockSideChanged:function()
{var vertically=WebInspector.dockController.isVertical()&&WebInspector.settings.splitVerticallyWhenDockedToRight.get();this._splitVertically(vertically);},_showUAShadowDOMChanged:function()
{for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].update();},_splitVertically:function(vertically)
{if(this.sidebarPaneView&&vertically===!this._splitView.isVertical())
return;if(this.sidebarPaneView){this.sidebarPaneView.detach();this._splitView.uninstallResizer(this.sidebarPaneView.headerElement());}
this._splitView.setVertical(!vertically);var computedPane=new WebInspector.SidebarPane(WebInspector.UIString("Computed"));computedPane.element.classList.add("composite");computedPane.element.classList.add("fill");var expandComputed=computedPane.expand.bind(computedPane);computedPane.bodyElement.classList.add("metrics-and-computed");this.sidebarPanes.computedStyle.setExpandCallback(expandComputed);var matchedStylePanesWrapper=document.createElement("div");matchedStylePanesWrapper.className="style-panes-wrapper";var computedStylePanesWrapper=document.createElement("div");computedStylePanesWrapper.className="style-panes-wrapper";function showMetrics(inComputedStyle)
{if(inComputedStyle)
this.sidebarPanes.metrics.show(computedStylePanesWrapper,this.sidebarPanes.computedStyle.element);else
this.sidebarPanes.metrics.show(matchedStylePanesWrapper);}
function tabSelected(event)
{var tabId=(event.data.tabId);if(tabId===computedPane.title())
showMetrics.call(this,true);else if(tabId===stylesPane.title())
showMetrics.call(this,false);}
this.sidebarPaneView=new WebInspector.SidebarTabbedPane();if(vertically){this._splitView.installResizer(this.sidebarPaneView.headerElement());this.sidebarPanes.metrics.setExpandCallback(expandComputed);var compositePane=new WebInspector.SidebarPane(this.sidebarPanes.styles.title());compositePane.element.classList.add("composite");compositePane.element.classList.add("fill");var expandComposite=compositePane.expand.bind(compositePane);var splitView=new WebInspector.SplitView(true,true,"stylesPaneSplitViewState",0.5);splitView.show(compositePane.bodyElement);splitView.mainElement().appendChild(matchedStylePanesWrapper);splitView.sidebarElement().appendChild(computedStylePanesWrapper);this.sidebarPanes.styles.setExpandCallback(expandComposite);computedPane.show(computedStylePanesWrapper);computedPane.setExpandCallback(expandComposite);splitView.mainElement().appendChild(this._matchedStylesFilterBoxContainer);splitView.sidebarElement().appendChild(this._computedStylesFilterBoxContainer);this.sidebarPaneView.addPane(compositePane);}else{var stylesPane=new WebInspector.SidebarPane(this.sidebarPanes.styles.title());stylesPane.element.classList.add("composite");stylesPane.element.classList.add("fill");var expandStyles=stylesPane.expand.bind(stylesPane);stylesPane.bodyElement.classList.add("metrics-and-styles");stylesPane.bodyElement.appendChild(matchedStylePanesWrapper);computedPane.bodyElement.appendChild(computedStylePanesWrapper);this.sidebarPanes.styles.setExpandCallback(expandStyles);this.sidebarPanes.metrics.setExpandCallback(expandStyles);this.sidebarPaneView.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected,tabSelected,this);stylesPane.bodyElement.appendChild(this._matchedStylesFilterBoxContainer);computedPane.bodyElement.appendChild(this._computedStylesFilterBoxContainer);this.sidebarPaneView.addPane(stylesPane);this.sidebarPaneView.addPane(computedPane);}
this.sidebarPanes.styles.show(matchedStylePanesWrapper);this.sidebarPanes.computedStyle.show(computedStylePanesWrapper);matchedStylePanesWrapper.appendChild(this.sidebarPanes.styles.titleElement);showMetrics.call(this,vertically);this.sidebarPanes.platformFonts.show(computedStylePanesWrapper);this.sidebarPaneView.addPane(this.sidebarPanes.eventListeners);this.sidebarPaneView.addPane(this.sidebarPanes.domBreakpoints);this.sidebarPaneView.addPane(this.sidebarPanes.properties);this._extensionSidebarPanesContainer=this.sidebarPaneView;for(var i=0;i<this._extensionSidebarPanes.length;++i)
this._extensionSidebarPanesContainer.addPane(this._extensionSidebarPanes[i]);this.sidebarPaneView.show(this._splitView.sidebarElement());this.sidebarPanes.styles.expand();},addExtensionSidebarPane:function(id,pane)
{this._extensionSidebarPanes.push(pane);this._extensionSidebarPanesContainer.addPane(pane);},__proto__:WebInspector.Panel.prototype}
WebInspector.ElementsPanel.ContextMenuProvider=function()
{}
WebInspector.ElementsPanel.ContextMenuProvider.prototype={appendApplicableItems:function(event,contextMenu,target)
{(WebInspector.inspectorView.panel("elements")).appendApplicableItems(event,contextMenu,target);}}
WebInspector.ElementsPanel.DOMNodeRevealer=function()
{}
WebInspector.ElementsPanel.DOMNodeRevealer.prototype={reveal:function(node)
{if(WebInspector.inspectElementModeController&&WebInspector.inspectElementModeController.enabled()){InspectorFrontendHost.bringToFront();WebInspector.inspectElementModeController.disable();}
(WebInspector.inspectorView.panel("elements")).revealAndSelectNode((node));}}
WebInspector.ElementsPanel.NodeRemoteObjectRevealer=function()
{}
WebInspector.ElementsPanel.NodeRemoteObjectRevealer.prototype={reveal:function(remoteObject)
{revealElement((remoteObject));function revealElement(remoteObject)
{if(remoteObject)
remoteObject.pushNodeToFrontend(selectNode.bind(null,remoteObject));}
function selectNode(remoteObject,node)
{if(node){node.reveal();return;}
if(!remoteObject||remoteObject.description!=="#text"||!remoteObject.isNode())
return;remoteObject.callFunction(parentElement,undefined,revealElement);}
function parentElement()
{return this.parentElement;}}}