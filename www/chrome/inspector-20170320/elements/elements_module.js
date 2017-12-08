Elements.InspectElementModeController=class{constructor(){this._toggleSearchAction=UI.actionRegistry.action('elements.toggle-element-search');this._mode=Protocol.DOM.InspectMode.None;SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged,this._suspendStateChanged,this);SDK.targetManager.observeTargets(this,SDK.Target.Capability.DOM);}
targetAdded(target){if(this._mode===Protocol.DOM.InspectMode.None)
return;var domModel=SDK.DOMModel.fromTarget(target);domModel.setInspectMode(this._mode);}
targetRemoved(target){}
isInInspectElementMode(){return this._mode===Protocol.DOM.InspectMode.SearchForNode||this._mode===Protocol.DOM.InspectMode.SearchForUAShadowDOM;}
stopInspection(){if(this._mode&&this._mode!==Protocol.DOM.InspectMode.None)
this._toggleInspectMode();}
_toggleInspectMode(){if(SDK.targetManager.allTargetsSuspended())
return;var mode;if(this.isInInspectElementMode()){mode=Protocol.DOM.InspectMode.None;}else{mode=Common.moduleSetting('showUAShadowDOM').get()?Protocol.DOM.InspectMode.SearchForUAShadowDOM:Protocol.DOM.InspectMode.SearchForNode;}
this._setMode(mode);}
_setMode(mode){this._mode=mode;for(var domModel of SDK.DOMModel.instances())
domModel.setInspectMode(mode);this._toggleSearchAction.setToggled(this.isInInspectElementMode());}
_suspendStateChanged(){if(!SDK.targetManager.allTargetsSuspended())
return;this._mode=Protocol.DOM.InspectMode.None;this._toggleSearchAction.setToggled(false);}};Elements.InspectElementModeController.ToggleSearchActionDelegate=class{handleAction(context,actionId){if(!Elements.inspectElementModeController)
return false;Elements.inspectElementModeController._toggleInspectMode();return true;}};Elements.inspectElementModeController=Runtime.queryParam('isSharedWorker')?null:new Elements.InspectElementModeController();;Elements.BezierPopoverIcon=class{constructor(treeElement,swatchPopoverHelper,swatch){this._treeElement=treeElement;this._swatchPopoverHelper=swatchPopoverHelper;this._swatch=swatch;this._swatch.iconElement().title=Common.UIString('Open cubic bezier editor.');this._swatch.iconElement().addEventListener('click',this._iconClick.bind(this),false);this._boundBezierChanged=this._bezierChanged.bind(this);this._boundOnScroll=this._onScroll.bind(this);}
_iconClick(event){event.consume(true);if(this._swatchPopoverHelper.isShowing()){this._swatchPopoverHelper.hide(true);return;}
this._bezierEditor=new InlineEditor.BezierEditor();var cubicBezier=UI.Geometry.CubicBezier.parse(this._swatch.bezierText());if(!cubicBezier){cubicBezier=(UI.Geometry.CubicBezier.parse('linear'));}
this._bezierEditor.setBezier(cubicBezier);this._bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BezierChanged,this._boundBezierChanged);this._swatchPopoverHelper.show(this._bezierEditor,this._swatch.iconElement(),this._onPopoverHidden.bind(this));this._scrollerElement=this._swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');if(this._scrollerElement)
this._scrollerElement.addEventListener('scroll',this._boundOnScroll,false);this._originalPropertyText=this._treeElement.property.propertyText;this._treeElement.parentPane().setEditingStyle(true);var uiLocation=Bindings.cssWorkspaceBinding.propertyUILocation(this._treeElement.property,false);if(uiLocation)
Common.Revealer.reveal(uiLocation,true);}
_bezierChanged(event){this._swatch.setBezierText((event.data));this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(),false);}
_onScroll(event){this._swatchPopoverHelper.reposition();}
_onPopoverHidden(commitEdit){if(this._scrollerElement)
this._scrollerElement.removeEventListener('scroll',this._boundOnScroll,false);this._bezierEditor.removeEventListener(InlineEditor.BezierEditor.Events.BezierChanged,this._boundBezierChanged);delete this._bezierEditor;var propertyText=commitEdit?this._treeElement.renderedPropertyText():this._originalPropertyText;this._treeElement.applyStyleText(propertyText,true);this._treeElement.parentPane().setEditingStyle(false);delete this._originalPropertyText;}};Elements.ColorSwatchPopoverIcon=class{constructor(treeElement,swatchPopoverHelper,swatch){this._treeElement=treeElement;this._treeElement[Elements.ColorSwatchPopoverIcon._treeElementSymbol]=this;this._swatchPopoverHelper=swatchPopoverHelper;this._swatch=swatch;var shiftClickMessage=Common.UIString('Shift + Click to change color format.');this._swatch.iconElement().title=Common.UIString('Open color picker. %s',shiftClickMessage);this._swatch.iconElement().addEventListener('click',this._iconClick.bind(this));this._contrastColor=null;this._boundSpectrumChanged=this._spectrumChanged.bind(this);this._boundOnScroll=this._onScroll.bind(this);}
static forTreeElement(treeElement){return treeElement[Elements.ColorSwatchPopoverIcon._treeElementSymbol]||null;}
setContrastColor(color){this._contrastColor=color;if(this._spectrum)
this._spectrum.setContrastColor(this._contrastColor);}
_iconClick(event){event.consume(true);this.showPopover();}
showPopover(){if(this._swatchPopoverHelper.isShowing()){this._swatchPopoverHelper.hide(true);return;}
var color=this._swatch.color();var format=this._swatch.format();if(format===Common.Color.Format.Original)
format=color.format();this._spectrum=new ColorPicker.Spectrum();this._spectrum.setColor(color,format);if(this._contrastColor)
this._spectrum.setContrastColor(this._contrastColor);this._spectrum.addEventListener(ColorPicker.Spectrum.Events.SizeChanged,this._spectrumResized,this);this._spectrum.addEventListener(ColorPicker.Spectrum.Events.ColorChanged,this._boundSpectrumChanged);this._swatchPopoverHelper.show(this._spectrum,this._swatch.iconElement(),this._onPopoverHidden.bind(this));this._scrollerElement=this._swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');if(this._scrollerElement)
this._scrollerElement.addEventListener('scroll',this._boundOnScroll,false);this._originalPropertyText=this._treeElement.property.propertyText;this._treeElement.parentPane().setEditingStyle(true);var uiLocation=Bindings.cssWorkspaceBinding.propertyUILocation(this._treeElement.property,false);if(uiLocation)
Common.Revealer.reveal(uiLocation,true);}
_spectrumResized(event){this._swatchPopoverHelper.reposition();}
_spectrumChanged(event){var color=Common.Color.parse((event.data));if(!color)
return;this._swatch.setColor(color);this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(),false);}
_onScroll(event){this._swatchPopoverHelper.reposition();}
_onPopoverHidden(commitEdit){if(this._scrollerElement)
this._scrollerElement.removeEventListener('scroll',this._boundOnScroll,false);this._spectrum.removeEventListener(ColorPicker.Spectrum.Events.ColorChanged,this._boundSpectrumChanged);delete this._spectrum;var propertyText=commitEdit?this._treeElement.renderedPropertyText():this._originalPropertyText;this._treeElement.applyStyleText(propertyText,true);this._treeElement.parentPane().setEditingStyle(false);delete this._originalPropertyText;}};Elements.ColorSwatchPopoverIcon._treeElementSymbol=Symbol('Elements.ColorSwatchPopoverIcon._treeElementSymbol');Elements.ShadowSwatchPopoverHelper=class{constructor(treeElement,swatchPopoverHelper,shadowSwatch){this._treeElement=treeElement;this._treeElement[Elements.ShadowSwatchPopoverHelper._treeElementSymbol]=this;this._swatchPopoverHelper=swatchPopoverHelper;this._shadowSwatch=shadowSwatch;this._iconElement=shadowSwatch.iconElement();this._iconElement.title=Common.UIString('Open shadow editor.');this._iconElement.addEventListener('click',this._iconClick.bind(this),false);this._boundShadowChanged=this._shadowChanged.bind(this);this._boundOnScroll=this._onScroll.bind(this);}
static forTreeElement(treeElement){return treeElement[Elements.ShadowSwatchPopoverHelper._treeElementSymbol]||null;}
_iconClick(event){event.consume(true);this.showPopover();}
showPopover(){if(this._swatchPopoverHelper.isShowing()){this._swatchPopoverHelper.hide(true);return;}
this._cssShadowEditor=new InlineEditor.CSSShadowEditor();this._cssShadowEditor.setModel(this._shadowSwatch.model());this._cssShadowEditor.addEventListener(InlineEditor.CSSShadowEditor.Events.ShadowChanged,this._boundShadowChanged);this._swatchPopoverHelper.show(this._cssShadowEditor,this._iconElement,this._onPopoverHidden.bind(this));this._scrollerElement=this._iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');if(this._scrollerElement)
this._scrollerElement.addEventListener('scroll',this._boundOnScroll,false);this._originalPropertyText=this._treeElement.property.propertyText;this._treeElement.parentPane().setEditingStyle(true);var uiLocation=Bindings.cssWorkspaceBinding.propertyUILocation(this._treeElement.property,false);if(uiLocation)
Common.Revealer.reveal(uiLocation,true);}
_shadowChanged(event){this._shadowSwatch.setCSSShadow((event.data));this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(),false);}
_onScroll(event){this._swatchPopoverHelper.reposition();}
_onPopoverHidden(commitEdit){if(this._scrollerElement)
this._scrollerElement.removeEventListener('scroll',this._boundOnScroll,false);this._cssShadowEditor.removeEventListener(InlineEditor.CSSShadowEditor.Events.ShadowChanged,this._boundShadowChanged);delete this._cssShadowEditor;var propertyText=commitEdit?this._treeElement.renderedPropertyText():this._originalPropertyText;this._treeElement.applyStyleText(propertyText,true);this._treeElement.parentPane().setEditingStyle(false);delete this._originalPropertyText;}};Elements.ShadowSwatchPopoverHelper._treeElementSymbol=Symbol('Elements.ShadowSwatchPopoverHelper._treeElementSymbol');;Elements.ComputedStyleModel=class extends Common.Object{constructor(){super();this._node=UI.context.flavor(SDK.DOMNode);this._cssModel=null;this._eventListeners=[];UI.context.addFlavorChangeListener(SDK.DOMNode,this._onNodeChanged,this);}
node(){return this._node;}
cssModel(){return this._cssModel&&this._cssModel.isEnabled()?this._cssModel:null;}
_onNodeChanged(event){this._node=(event.data);this._updateModel(this._node?SDK.CSSModel.fromNode(this._node):null);this._onComputedStyleChanged(null);}
_updateModel(cssModel){if(this._cssModel===cssModel)
return;Common.EventTarget.removeEventListeners(this._eventListeners);this._cssModel=cssModel;var domModel=cssModel?cssModel.target().model(SDK.DOMModel):null;var resourceTreeModel=cssModel?cssModel.target().model(SDK.ResourceTreeModel):null;if(cssModel&&domModel&&resourceTreeModel){this._eventListeners=[cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.FontsUpdated,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.MediaQueryResultChanged,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.ModelWasEnabled,this._onComputedStyleChanged,this),domModel.addEventListener(SDK.DOMModel.Events.DOMMutated,this._onDOMModelChanged,this),resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameResized,this._onFrameResized,this),];}}
_onComputedStyleChanged(event){delete this._computedStylePromise;this.dispatchEventToListeners(Elements.ComputedStyleModel.Events.ComputedStyleChanged,event?event.data:null);}
_onDOMModelChanged(event){var node=(event.data);if(!this._node||this._node!==node&&node.parentNode!==this._node.parentNode&&!node.isAncestor(this._node))
return;this._onComputedStyleChanged(null);}
_onFrameResized(event){function refreshContents(){this._onComputedStyleChanged(null);delete this._frameResizedTimer;}
if(this._frameResizedTimer)
clearTimeout(this._frameResizedTimer);this._frameResizedTimer=setTimeout(refreshContents.bind(this),100);}
_elementNode(){return this.node()?this.node().enclosingElementOrSelf():null;}
fetchComputedStyle(){var elementNode=this._elementNode();var cssModel=this.cssModel();if(!elementNode||!cssModel)
return Promise.resolve((null));if(!this._computedStylePromise){this._computedStylePromise=cssModel.computedStylePromise(elementNode.id).then(verifyOutdated.bind(this,elementNode));}
return this._computedStylePromise;function verifyOutdated(elementNode,style){return elementNode===this._elementNode()&&style?new Elements.ComputedStyleModel.ComputedStyle(elementNode,style):(null);}}};Elements.ComputedStyleModel.Events={ComputedStyleChanged:Symbol('ComputedStyleChanged')};Elements.ComputedStyleModel.ComputedStyle=class{constructor(node,computedStyle){this.node=node;this.computedStyle=computedStyle;}};;Elements.ElementsBreadcrumbs=class extends UI.HBox{constructor(){super(true);this.registerRequiredCSS('elements/breadcrumbs.css');this.crumbsElement=this.contentElement.createChild('div','crumbs');this.crumbsElement.addEventListener('mousemove',this._mouseMovedInCrumbs.bind(this),false);this.crumbsElement.addEventListener('mouseleave',this._mouseMovedOutOfCrumbs.bind(this),false);this._nodeSymbol=Symbol('node');}
wasShown(){this.update();}
updateNodes(nodes){if(!nodes.length)
return;var crumbs=this.crumbsElement;for(var crumb=crumbs.firstChild;crumb;crumb=crumb.nextSibling){if(nodes.indexOf(crumb[this._nodeSymbol])!==-1){this.update(true);return;}}}
setSelectedNode(node){this._currentDOMNode=node;this.crumbsElement.window().requestAnimationFrame(()=>this.update());}
_mouseMovedInCrumbs(event){var nodeUnderMouse=event.target;var crumbElement=nodeUnderMouse.enclosingNodeOrSelfWithClass('crumb');var node=(crumbElement?crumbElement[this._nodeSymbol]:null);if(node)
node.highlight();}
_mouseMovedOutOfCrumbs(event){if(this._currentDOMNode)
SDK.DOMModel.hideDOMNodeHighlight();}
_onClickCrumb(event){event.preventDefault();var crumb=(event.currentTarget);if(!crumb.classList.contains('collapsed')){this.dispatchEventToListeners(Elements.ElementsBreadcrumbs.Events.NodeSelected,crumb[this._nodeSymbol]);return;}
if(crumb===this.crumbsElement.firstChild){var currentCrumb=crumb;while(currentCrumb){var hidden=currentCrumb.classList.contains('hidden');var collapsed=currentCrumb.classList.contains('collapsed');if(!hidden&&!collapsed)
break;crumb=currentCrumb;currentCrumb=currentCrumb.nextSiblingElement;}}
this.updateSizes(crumb);}
_determineElementTitle(domNode){switch(domNode.nodeType()){case Node.ELEMENT_NODE:if(domNode.pseudoType())
return'::'+domNode.pseudoType();return null;case Node.TEXT_NODE:return Common.UIString('(text)');case Node.COMMENT_NODE:return'<!-->';case Node.DOCUMENT_TYPE_NODE:return'<!DOCTYPE>';case Node.DOCUMENT_FRAGMENT_NODE:return domNode.shadowRootType()?'#shadow-root':domNode.nodeNameInCorrectCase();default:return domNode.nodeNameInCorrectCase();}}
update(force){if(!this.isShowing())
return;var currentDOMNode=this._currentDOMNode;var crumbs=this.crumbsElement;var handled=false;var crumb=crumbs.firstChild;while(crumb){if(crumb[this._nodeSymbol]===currentDOMNode){crumb.classList.add('selected');handled=true;}else{crumb.classList.remove('selected');}
crumb=crumb.nextSibling;}
if(handled&&!force){this.updateSizes();return;}
crumbs.removeChildren();for(var current=currentDOMNode;current;current=current.parentNode){if(current.nodeType()===Node.DOCUMENT_NODE)
continue;crumb=createElementWithClass('span','crumb');crumb[this._nodeSymbol]=current;crumb.addEventListener('mousedown',this._onClickCrumb.bind(this),false);var crumbTitle=this._determineElementTitle(current);if(crumbTitle){var nameElement=createElement('span');nameElement.textContent=crumbTitle;crumb.appendChild(nameElement);crumb.title=crumbTitle;}else{Components.DOMPresentationUtils.decorateNodeLabel(current,crumb);}
if(current===currentDOMNode)
crumb.classList.add('selected');crumbs.insertBefore(crumb,crumbs.firstChild);}
this.updateSizes();}
_resetCrumbStylesAndFindSelections(focusedCrumb){var crumbs=this.crumbsElement;var selectedIndex=0;var focusedIndex=0;var selectedCrumb=null;for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.children[i];if(!selectedCrumb&&crumb.classList.contains('selected')){selectedCrumb=crumb;selectedIndex=i;}
if(crumb===focusedCrumb)
focusedIndex=i;crumb.classList.remove('compact','collapsed','hidden');}
return{selectedIndex:selectedIndex,focusedIndex:focusedIndex,selectedCrumb:selectedCrumb};}
_measureElementSizes(){var crumbs=this.crumbsElement;var collapsedElement=createElementWithClass('span','crumb collapsed');crumbs.insertBefore(collapsedElement,crumbs.firstChild);var available=crumbs.offsetWidth;var collapsed=collapsedElement.offsetWidth;var normalSizes=[];for(var i=1;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];normalSizes[i-1]=crumb.offsetWidth;}
crumbs.removeChild(collapsedElement);var compactSizes=[];for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];crumb.classList.add('compact');}
for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];compactSizes[i]=crumb.offsetWidth;}
for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];crumb.classList.remove('compact','collapsed');}
return{normal:normalSizes,compact:compactSizes,collapsed:collapsed,available:available};}
updateSizes(focusedCrumb){if(!this.isShowing())
return;var crumbs=this.crumbsElement;if(!crumbs.firstChild)
return;var selections=this._resetCrumbStylesAndFindSelections(focusedCrumb);var sizes=this._measureElementSizes();var selectedIndex=selections.selectedIndex;var focusedIndex=selections.focusedIndex;var selectedCrumb=selections.selectedCrumb;function crumbsAreSmallerThanContainer(){var totalSize=0;for(var i=0;i<crumbs.childNodes.length;++i){var crumb=crumbs.childNodes[i];if(crumb.classList.contains('hidden'))
continue;if(crumb.classList.contains('collapsed')){totalSize+=sizes.collapsed;continue;}
totalSize+=crumb.classList.contains('compact')?sizes.compact[i]:sizes.normal[i];}
const rightPadding=10;return totalSize+rightPadding<sizes.available;}
if(crumbsAreSmallerThanContainer())
return;var BothSides=0;var AncestorSide=-1;var ChildSide=1;function makeCrumbsSmaller(shrinkingFunction,direction){var significantCrumb=focusedCrumb||selectedCrumb;var significantIndex=significantCrumb===selectedCrumb?selectedIndex:focusedIndex;function shrinkCrumbAtIndex(index){var shrinkCrumb=crumbs.children[index];if(shrinkCrumb&&shrinkCrumb!==significantCrumb)
shrinkingFunction(shrinkCrumb);if(crumbsAreSmallerThanContainer())
return true;return false;}
if(direction){var index=(direction>0?0:crumbs.childNodes.length-1);while(index!==significantIndex){if(shrinkCrumbAtIndex(index))
return true;index+=(direction>0?1:-1);}}else{var startIndex=0;var endIndex=crumbs.childNodes.length-1;while(startIndex!==significantIndex||endIndex!==significantIndex){var startDistance=significantIndex-startIndex;var endDistance=endIndex-significantIndex;if(startDistance>=endDistance)
var index=startIndex++;else
var index=endIndex--;if(shrinkCrumbAtIndex(index))
return true;}}
return false;}
function coalesceCollapsedCrumbs(){var crumb=crumbs.firstChild;var collapsedRun=false;var newStartNeeded=false;var newEndNeeded=false;while(crumb){var hidden=crumb.classList.contains('hidden');if(!hidden){var collapsed=crumb.classList.contains('collapsed');if(collapsedRun&&collapsed){crumb.classList.add('hidden');crumb.classList.remove('compact');crumb.classList.remove('collapsed');if(crumb.classList.contains('start')){crumb.classList.remove('start');newStartNeeded=true;}
if(crumb.classList.contains('end')){crumb.classList.remove('end');newEndNeeded=true;}
continue;}
collapsedRun=collapsed;if(newEndNeeded){newEndNeeded=false;crumb.classList.add('end');}}else{collapsedRun=true;}
crumb=crumb.nextSibling;}
if(newStartNeeded){crumb=crumbs.lastChild;while(crumb){if(!crumb.classList.contains('hidden')){crumb.classList.add('start');break;}
crumb=crumb.previousSibling;}}}
function compact(crumb){if(crumb.classList.contains('hidden'))
return;crumb.classList.add('compact');}
function collapse(crumb,dontCoalesce){if(crumb.classList.contains('hidden'))
return;crumb.classList.add('collapsed');crumb.classList.remove('compact');if(!dontCoalesce)
coalesceCollapsedCrumbs();}
if(!focusedCrumb){if(makeCrumbsSmaller(compact,ChildSide))
return;if(makeCrumbsSmaller(collapse,ChildSide))
return;}
if(makeCrumbsSmaller(compact,focusedCrumb?BothSides:AncestorSide))
return;if(makeCrumbsSmaller(collapse,focusedCrumb?BothSides:AncestorSide))
return;if(!selectedCrumb)
return;compact(selectedCrumb);if(crumbsAreSmallerThanContainer())
return;collapse(selectedCrumb,true);}};Elements.ElementsBreadcrumbs.Events={NodeSelected:Symbol('NodeSelected')};;Elements.ElementsSidebarPane=class extends UI.VBox{constructor(){super();this.element.classList.add('flex-none');this._computedStyleModel=new Elements.ComputedStyleModel();this._computedStyleModel.addEventListener(Elements.ComputedStyleModel.Events.ComputedStyleChanged,this.onCSSModelChanged,this);this._updateThrottler=new Common.Throttler(100);this._updateWhenVisible=false;}
node(){return this._computedStyleModel.node();}
cssModel(){return this._computedStyleModel.cssModel();}
doUpdate(){return Promise.resolve();}
update(){this._updateWhenVisible=!this.isShowing();if(this._updateWhenVisible)
return;this._updateThrottler.schedule(innerUpdate.bind(this));function innerUpdate(){return this.isShowing()?this.doUpdate():Promise.resolve();}}
wasShown(){super.wasShown();if(this._updateWhenVisible)
this.update();}
onCSSModelChanged(event){}};;Elements.ElementsTreeElement=class extends UI.TreeElement{constructor(node,elementCloseTag){super();this._node=node;this._gutterContainer=this.listItemElement.createChild('div','gutter-container');this._gutterContainer.addEventListener('click',this._showContextMenu.bind(this));var gutterMenuIcon=UI.Icon.create('largeicon-menu','gutter-menu-icon');this._gutterContainer.appendChild(gutterMenuIcon);this._decorationsElement=this._gutterContainer.createChild('div','hidden');this._elementCloseTag=elementCloseTag;if(this._node.nodeType()===Node.ELEMENT_NODE&&!elementCloseTag)
this._canAddAttributes=true;this._searchQuery=null;this._expandedChildrenLimit=Elements.ElementsTreeElement.InitialChildrenLimit;}
static animateOnDOMUpdate(treeElement){var tagName=treeElement.listItemElement.querySelector('.webkit-html-tag-name');UI.runCSSAnimationOnce(tagName||treeElement.listItemElement,'dom-update-highlight');}
static visibleShadowRoots(node){var roots=node.shadowRoots();if(roots.length&&!Common.moduleSetting('showUAShadowDOM').get())
roots=roots.filter(filter);function filter(root){return root.shadowRootType()!==SDK.DOMNode.ShadowRootTypes.UserAgent;}
return roots;}
static canShowInlineText(node){if(node.importedDocument()||node.templateContent()||Elements.ElementsTreeElement.visibleShadowRoots(node).length||node.hasPseudoElements())
return false;if(node.nodeType()!==Node.ELEMENT_NODE)
return false;if(!node.firstChild||node.firstChild!==node.lastChild||node.firstChild.nodeType()!==Node.TEXT_NODE)
return false;var textChild=node.firstChild;var maxInlineTextChildLength=80;if(textChild.nodeValue().length<maxInlineTextChildLength)
return true;return false;}
static populateForcedPseudoStateItems(subMenu,node){const pseudoClasses=['active','hover','focus','visited'];var forcedPseudoState=SDK.CSSModel.fromNode(node).pseudoState(node);for(var i=0;i<pseudoClasses.length;++i){var pseudoClassForced=forcedPseudoState.indexOf(pseudoClasses[i])>=0;subMenu.appendCheckboxItem(':'+pseudoClasses[i],setPseudoStateCallback.bind(null,pseudoClasses[i],!pseudoClassForced),pseudoClassForced,false);}
function setPseudoStateCallback(pseudoState,enabled){SDK.CSSModel.fromNode(node).forcePseudoState(node,pseudoState,enabled);}}
isClosingTag(){return!!this._elementCloseTag;}
node(){return this._node;}
isEditing(){return!!this._editing;}
highlightSearchResults(searchQuery){if(this._searchQuery!==searchQuery)
this._hideSearchHighlight();this._searchQuery=searchQuery;this._searchHighlightsVisible=true;this.updateTitle(null,true);}
hideSearchHighlights(){delete this._searchHighlightsVisible;this._hideSearchHighlight();}
_hideSearchHighlight(){if(!this._highlightResult)
return;function updateEntryHide(entry){switch(entry.type){case'added':entry.node.remove();break;case'changed':entry.node.textContent=entry.oldText;break;}}
for(var i=(this._highlightResult.length-1);i>=0;--i)
updateEntryHide(this._highlightResult[i]);delete this._highlightResult;}
setInClipboard(inClipboard){if(this._inClipboard===inClipboard)
return;this._inClipboard=inClipboard;this.listItemElement.classList.toggle('in-clipboard',inClipboard);}
get hovered(){return this._hovered;}
set hovered(x){if(this._hovered===x)
return;this._hovered=x;if(this.listItemElement){if(x){this._createSelection();this.listItemElement.classList.add('hovered');}else{this.listItemElement.classList.remove('hovered');}}}
expandedChildrenLimit(){return this._expandedChildrenLimit;}
setExpandedChildrenLimit(expandedChildrenLimit){this._expandedChildrenLimit=expandedChildrenLimit;}
_createSelection(){var listItemElement=this.listItemElement;if(!listItemElement)
return;if(!this.selectionElement){this.selectionElement=createElement('div');this.selectionElement.className='selection fill';this.selectionElement.style.setProperty('margin-left',(-this._computeLeftIndent())+'px');listItemElement.insertBefore(this.selectionElement,listItemElement.firstChild);}}
onbind(){if(!this._elementCloseTag)
this._node[this.treeOutline.treeElementSymbol()]=this;}
onunbind(){if(this._node[this.treeOutline.treeElementSymbol()]===this)
this._node[this.treeOutline.treeElementSymbol()]=null;}
onattach(){if(this._hovered){this._createSelection();this.listItemElement.classList.add('hovered');}
this.updateTitle();this.listItemElement.draggable=true;}
onpopulate(){this.populated=true;this.treeOutline.populateTreeElement(this);}
expandRecursively(){this._node.getSubtree(-1,UI.TreeElement.prototype.expandRecursively.bind(this,Number.MAX_VALUE));}
onexpand(){if(this._elementCloseTag)
return;this.updateTitle();}
oncollapse(){if(this._elementCloseTag)
return;this.updateTitle();}
select(omitFocus,selectedByUser){if(this._editing)
return false;return super.select(omitFocus,selectedByUser);}
onselect(selectedByUser){this.treeOutline.suppressRevealAndSelect=true;this.treeOutline.selectDOMNode(this._node,selectedByUser);if(selectedByUser){this._node.highlight();Host.userMetrics.actionTaken(Host.UserMetrics.Action.ChangeInspectedNodeInElementsPanel);}
this._createSelection();this.treeOutline.suppressRevealAndSelect=false;return true;}
ondelete(){var startTagTreeElement=this.treeOutline.findTreeElement(this._node);startTagTreeElement?startTagTreeElement.remove():this.remove();return true;}
onenter(){if(this._editing)
return false;this._startEditing();return true;}
selectOnMouseDown(event){super.selectOnMouseDown(event);if(this._editing)
return;if(event.detail>=2)
event.preventDefault();}
ondblclick(event){if(this._editing||this._elementCloseTag)
return false;if(this._startEditingTarget((event.target)))
return false;if(this.isExpandable()&&!this.expanded)
this.expand();return false;}
hasEditableNode(){return!this._node.isShadowRoot()&&!this._node.ancestorUserAgentShadowRoot();}
_insertInLastAttributePosition(tag,node){if(tag.getElementsByClassName('webkit-html-attribute').length>0){tag.insertBefore(node,tag.lastChild);}else{var nodeName=tag.textContent.match(/^<(.*?)>$/)[1];tag.textContent='';tag.createTextChild('<'+nodeName);tag.appendChild(node);tag.createTextChild('>');}}
_startEditingTarget(eventTarget){if(this.treeOutline.selectedDOMNode()!==this._node)
return false;if(this._node.nodeType()!==Node.ELEMENT_NODE&&this._node.nodeType()!==Node.TEXT_NODE)
return false;var textNode=eventTarget.enclosingNodeOrSelfWithClass('webkit-html-text-node');if(textNode)
return this._startEditingTextNode(textNode);var attribute=eventTarget.enclosingNodeOrSelfWithClass('webkit-html-attribute');if(attribute)
return this._startEditingAttribute(attribute,eventTarget);var tagName=eventTarget.enclosingNodeOrSelfWithClass('webkit-html-tag-name');if(tagName)
return this._startEditingTagName(tagName);var newAttribute=eventTarget.enclosingNodeOrSelfWithClass('add-attribute');if(newAttribute)
return this._addNewAttribute();return false;}
_showContextMenu(event){this.treeOutline.showContextMenu(this,event);}
populateTagContextMenu(contextMenu,event){var treeElement=this._elementCloseTag?this.treeOutline.findTreeElement(this._node):this;contextMenu.appendItem(Common.UIString.capitalize('Add ^attribute'),treeElement._addNewAttribute.bind(treeElement));var attribute=event.target.enclosingNodeOrSelfWithClass('webkit-html-attribute');var newAttribute=event.target.enclosingNodeOrSelfWithClass('add-attribute');if(attribute&&!newAttribute){contextMenu.appendItem(Common.UIString.capitalize('Edit ^attribute'),this._startEditingAttribute.bind(this,attribute,event.target));}
this.populateNodeContextMenu(contextMenu);Elements.ElementsTreeElement.populateForcedPseudoStateItems(contextMenu,treeElement.node());contextMenu.appendSeparator();this.populateScrollIntoView(contextMenu);}
populateScrollIntoView(contextMenu){contextMenu.appendItem(Common.UIString.capitalize('Scroll into ^view'),this._scrollIntoView.bind(this));}
populateTextContextMenu(contextMenu,textNode){if(!this._editing)
contextMenu.appendItem(Common.UIString.capitalize('Edit ^text'),this._startEditingTextNode.bind(this,textNode));this.populateNodeContextMenu(contextMenu);}
populateNodeContextMenu(contextMenu){var isEditable=this.hasEditableNode();if(isEditable&&!this._editing)
contextMenu.appendItem(Common.UIString('Edit as HTML'),this._editAsHTML.bind(this));var isShadowRoot=this._node.isShadowRoot();var copyMenu=contextMenu.appendSubMenuItem(Common.UIString('Copy'));var createShortcut=UI.KeyboardShortcut.shortcutToString;var modifier=UI.KeyboardShortcut.Modifiers.CtrlOrMeta;var treeOutline=this.treeOutline;var menuItem;if(!isShadowRoot){menuItem=copyMenu.appendItem(Common.UIString('Copy outerHTML'),treeOutline.performCopyOrCut.bind(treeOutline,false,this._node));menuItem.setShortcut(createShortcut('V',modifier));}
if(this._node.nodeType()===Node.ELEMENT_NODE)
copyMenu.appendItem(Common.UIString.capitalize('Copy selector'),this._copyCSSPath.bind(this));if(!isShadowRoot)
copyMenu.appendItem(Common.UIString('Copy XPath'),this._copyXPath.bind(this));if(!isShadowRoot){menuItem=copyMenu.appendItem(Common.UIString('Cut element'),treeOutline.performCopyOrCut.bind(treeOutline,true,this._node),!this.hasEditableNode());menuItem.setShortcut(createShortcut('X',modifier));menuItem=copyMenu.appendItem(Common.UIString('Copy element'),treeOutline.performCopyOrCut.bind(treeOutline,false,this._node));menuItem.setShortcut(createShortcut('C',modifier));menuItem=copyMenu.appendItem(Common.UIString('Paste element'),treeOutline.pasteNode.bind(treeOutline,this._node),!treeOutline.canPaste(this._node));menuItem.setShortcut(createShortcut('V',modifier));}
contextMenu.appendSeparator();menuItem=contextMenu.appendCheckboxItem(Common.UIString('Hide element'),treeOutline.toggleHideElement.bind(treeOutline,this._node),treeOutline.isToggledToHidden(this._node));menuItem.setShortcut(UI.shortcutRegistry.shortcutTitleForAction('elements.hide-element'));if(isEditable)
contextMenu.appendItem(Common.UIString('Delete element'),this.remove.bind(this));contextMenu.appendSeparator();contextMenu.appendItem(Common.UIString('Expand all'),this.expandRecursively.bind(this));contextMenu.appendItem(Common.UIString('Collapse all'),this.collapseRecursively.bind(this));contextMenu.appendSeparator();}
_startEditing(){if(this.treeOutline.selectedDOMNode()!==this._node)
return;var listItem=this.listItemElement;if(this._canAddAttributes){var attribute=listItem.getElementsByClassName('webkit-html-attribute')[0];if(attribute){return this._startEditingAttribute(attribute,attribute.getElementsByClassName('webkit-html-attribute-value')[0]);}
return this._addNewAttribute();}
if(this._node.nodeType()===Node.TEXT_NODE){var textNode=listItem.getElementsByClassName('webkit-html-text-node')[0];if(textNode)
return this._startEditingTextNode(textNode);return;}}
_addNewAttribute(){var container=createElement('span');this._buildAttributeDOM(container,' ','',null);var attr=container.firstElementChild;attr.style.marginLeft='2px';attr.style.marginRight='2px';var tag=this.listItemElement.getElementsByClassName('webkit-html-tag')[0];this._insertInLastAttributePosition(tag,attr);attr.scrollIntoViewIfNeeded(true);return this._startEditingAttribute(attr,attr);}
_triggerEditAttribute(attributeName){var attributeElements=this.listItemElement.getElementsByClassName('webkit-html-attribute-name');for(var i=0,len=attributeElements.length;i<len;++i){if(attributeElements[i].textContent===attributeName){for(var elem=attributeElements[i].nextSibling;elem;elem=elem.nextSibling){if(elem.nodeType!==Node.ELEMENT_NODE)
continue;if(elem.classList.contains('webkit-html-attribute-value'))
return this._startEditingAttribute(elem.parentNode,elem);}}}}
_startEditingAttribute(attribute,elementForSelection){console.assert(this.listItemElement.isAncestor(attribute));if(UI.isBeingEdited(attribute))
return true;var attributeNameElement=attribute.getElementsByClassName('webkit-html-attribute-name')[0];if(!attributeNameElement)
return false;var attributeName=attributeNameElement.textContent;var attributeValueElement=attribute.getElementsByClassName('webkit-html-attribute-value')[0];elementForSelection=attributeValueElement.isAncestor(elementForSelection)?attributeValueElement:elementForSelection;function removeZeroWidthSpaceRecursive(node){if(node.nodeType===Node.TEXT_NODE){node.nodeValue=node.nodeValue.replace(/\u200B/g,'');return;}
if(node.nodeType!==Node.ELEMENT_NODE)
return;for(var child=node.firstChild;child;child=child.nextSibling)
removeZeroWidthSpaceRecursive(child);}
var attributeValue=attributeName&&attributeValueElement?this._node.getAttribute(attributeName):undefined;if(attributeValue!==undefined){attributeValueElement.setTextContentTruncatedIfNeeded(attributeValue,Common.UIString('<value is too large to edit>'));}
removeZeroWidthSpaceRecursive(attribute);var config=new UI.InplaceEditor.Config(this._attributeEditingCommitted.bind(this),this._editingCancelled.bind(this),attributeName);function postKeyDownFinishHandler(event){UI.handleElementValueModifications(event,attribute);return'';}
if(!attributeValueElement.textContent.asParsedURL())
config.setPostKeydownFinishHandler(postKeyDownFinishHandler);this._editing=UI.InplaceEditor.startEditing(attribute,config);this.listItemElement.getComponentSelection().selectAllChildren(elementForSelection);return true;}
_startEditingTextNode(textNodeElement){if(UI.isBeingEdited(textNodeElement))
return true;var textNode=this._node;if(textNode.nodeType()===Node.ELEMENT_NODE&&textNode.firstChild)
textNode=textNode.firstChild;var container=textNodeElement.enclosingNodeOrSelfWithClass('webkit-html-text-node');if(container)
container.textContent=textNode.nodeValue();var config=new UI.InplaceEditor.Config(this._textNodeEditingCommitted.bind(this,textNode),this._editingCancelled.bind(this));this._editing=UI.InplaceEditor.startEditing(textNodeElement,config);this.listItemElement.getComponentSelection().selectAllChildren(textNodeElement);return true;}
_startEditingTagName(tagNameElement){if(!tagNameElement){tagNameElement=this.listItemElement.getElementsByClassName('webkit-html-tag-name')[0];if(!tagNameElement)
return false;}
var tagName=tagNameElement.textContent;if(Elements.ElementsTreeElement.EditTagBlacklist.has(tagName.toLowerCase()))
return false;if(UI.isBeingEdited(tagNameElement))
return true;var closingTagElement=this._distinctClosingTagElement();function keyupListener(event){if(closingTagElement)
closingTagElement.textContent='</'+tagNameElement.textContent+'>';}
function editingComitted(element,newTagName){tagNameElement.removeEventListener('keyup',keyupListener,false);this._tagNameEditingCommitted.apply(this,arguments);}
function editingCancelled(){tagNameElement.removeEventListener('keyup',keyupListener,false);this._editingCancelled.apply(this,arguments);}
tagNameElement.addEventListener('keyup',keyupListener,false);var config=new UI.InplaceEditor.Config(editingComitted.bind(this),editingCancelled.bind(this),tagName);this._editing=UI.InplaceEditor.startEditing(tagNameElement,config);this.listItemElement.getComponentSelection().selectAllChildren(tagNameElement);return true;}
_startEditingAsHTML(commitCallback,disposeCallback,error,initialValue){if(error)
return;if(this._editing)
return;function consume(event){if(event.eventPhase===Event.AT_TARGET)
event.consume(true);}
initialValue=this._convertWhitespaceToEntities(initialValue).text;this._htmlEditElement=createElement('div');this._htmlEditElement.className='source-code elements-tree-editor';var child=this.listItemElement.firstChild;while(child){child.style.display='none';child=child.nextSibling;}
if(this.childrenListElement)
this.childrenListElement.style.display='none';this.listItemElement.appendChild(this._htmlEditElement);this.listItemElement.classList.add('editing-as-html');this.treeOutline.element.addEventListener('mousedown',consume,false);self.runtime.extension(UI.TextEditorFactory).instance().then(gotFactory.bind(this));function gotFactory(factory){var editor=factory.createEditor({lineNumbers:false,lineWrapping:Common.moduleSetting('domWordWrap').get(),mimeType:'text/html',autoHeight:false,padBottom:false});this._editing={commit:commit.bind(this),cancel:dispose.bind(this),editor:editor,resize:resize.bind(this)};resize.call(this);editor.widget().show(this._htmlEditElement);editor.setText(initialValue);editor.widget().focus();editor.widget().element.addEventListener('blur',this._editing.commit,true);editor.widget().element.addEventListener('keydown',keydown.bind(this),true);this.treeOutline.setMultilineEditing(this._editing);}
function resize(){this._htmlEditElement.style.width=this.treeOutline.visibleWidth()-this._computeLeftIndent()-30+'px';this._editing.editor.onResize();}
function commit(){commitCallback(initialValue,this._editing.editor.text());dispose.call(this);}
function dispose(){this._editing.editor.widget().element.removeEventListener('blur',this._editing.commit,true);this._editing.editor.widget().detach();delete this._editing;this.listItemElement.classList.remove('editing-as-html');this.listItemElement.removeChild(this._htmlEditElement);delete this._htmlEditElement;if(this.childrenListElement)
this.childrenListElement.style.removeProperty('display');var child=this.listItemElement.firstChild;while(child){child.style.removeProperty('display');child=child.nextSibling;}
if(this.treeOutline){this.treeOutline.setMultilineEditing(null);this.treeOutline.element.removeEventListener('mousedown',consume,false);this.treeOutline.focus();}
disposeCallback();}
function keydown(event){var isMetaOrCtrl=UI.KeyboardShortcut.eventHasCtrlOrMeta((event))&&!event.altKey&&!event.shiftKey;if(isEnterKey(event)&&(isMetaOrCtrl||event.isMetaOrCtrlForTest)){event.consume(true);this._editing.commit();}else if(event.keyCode===UI.KeyboardShortcut.Keys.Esc.code||event.key==='Escape'){event.consume(true);this._editing.cancel();}}}
_attributeEditingCommitted(element,newText,oldText,attributeName,moveDirection){delete this._editing;var treeOutline=this.treeOutline;function moveToNextAttributeIfNeeded(error){if(error)
this._editingCancelled(element,attributeName);if(!moveDirection)
return;treeOutline.runPendingUpdates();treeOutline.focus();var attributes=this._node.attributes();for(var i=0;i<attributes.length;++i){if(attributes[i].name!==attributeName)
continue;if(moveDirection==='backward'){if(i===0)
this._startEditingTagName();else
this._triggerEditAttribute(attributes[i-1].name);}else{if(i===attributes.length-1)
this._addNewAttribute();else
this._triggerEditAttribute(attributes[i+1].name);}
return;}
if(moveDirection==='backward'){if(newText===' '){if(attributes.length>0)
this._triggerEditAttribute(attributes[attributes.length-1].name);}else{if(attributes.length>1)
this._triggerEditAttribute(attributes[attributes.length-2].name);}}else if(moveDirection==='forward'){if(!newText.isWhitespace())
this._addNewAttribute();else
this._startEditingTagName();}}
if((attributeName.trim()||newText.trim())&&oldText!==newText){this._node.setAttribute(attributeName,newText,moveToNextAttributeIfNeeded.bind(this));return;}
this.updateTitle();moveToNextAttributeIfNeeded.call(this);}
_tagNameEditingCommitted(element,newText,oldText,tagName,moveDirection){delete this._editing;var self=this;function cancel(){var closingTagElement=self._distinctClosingTagElement();if(closingTagElement)
closingTagElement.textContent='</'+tagName+'>';self._editingCancelled(element,tagName);moveToNextAttributeIfNeeded.call(self);}
function moveToNextAttributeIfNeeded(){if(moveDirection!=='forward'){this._addNewAttribute();return;}
var attributes=this._node.attributes();if(attributes.length>0)
this._triggerEditAttribute(attributes[0].name);else
this._addNewAttribute();}
newText=newText.trim();if(newText===oldText){cancel();return;}
var treeOutline=this.treeOutline;var wasExpanded=this.expanded;function changeTagNameCallback(error,nodeId){if(error||!nodeId){cancel();return;}
var newTreeItem=treeOutline.selectNodeAfterEdit(wasExpanded,error,nodeId);moveToNextAttributeIfNeeded.call(newTreeItem);}
this._node.setNodeName(newText,changeTagNameCallback);}
_textNodeEditingCommitted(textNode,element,newText){delete this._editing;function callback(){this.updateTitle();}
textNode.setNodeValue(newText,callback.bind(this));}
_editingCancelled(element,context){delete this._editing;this.updateTitle();}
_distinctClosingTagElement(){if(this.expanded){var closers=this.childrenListElement.querySelectorAll('.close');return closers[closers.length-1];}
var tags=this.listItemElement.getElementsByClassName('webkit-html-tag');return(tags.length===1?null:tags[tags.length-1]);}
updateTitle(updateRecord,onlySearchQueryChanged){if(this._editing)
return;if(onlySearchQueryChanged){this._hideSearchHighlight();}else{var nodeInfo=this._nodeTitleInfo(updateRecord||null);if(this._node.nodeType()===Node.DOCUMENT_FRAGMENT_NODE&&this._node.isInShadowTree()&&this._node.shadowRootType()){this.childrenListElement.classList.add('shadow-root');var depth=4;for(var node=this._node;depth&&node;node=node.parentNode){if(node.nodeType()===Node.DOCUMENT_FRAGMENT_NODE)
depth--;}
if(!depth)
this.childrenListElement.classList.add('shadow-root-deep');else
this.childrenListElement.classList.add('shadow-root-depth-'+depth);}
var highlightElement=createElement('span');highlightElement.className='highlight';highlightElement.appendChild(nodeInfo);this.title=highlightElement;this.updateDecorations();this.listItemElement.insertBefore(this._gutterContainer,this.listItemElement.firstChild);delete this._highlightResult;}
delete this.selectionElement;if(this.selected)
this._createSelection();this._highlightSearchResults();}
_computeLeftIndent(){var treeElement=this.parent;var depth=0;while(treeElement!==null){depth++;treeElement=treeElement.parent;}
return 12*(depth-2)+(this.isExpandable()?1:12);}
updateDecorations(){this._gutterContainer.style.left=(-this._computeLeftIndent())+'px';if(this.isClosingTag())
return;var node=this._node;if(node.nodeType()!==Node.ELEMENT_NODE)
return;if(!this.treeOutline._decoratorExtensions)
this.treeOutline._decoratorExtensions=runtime.extensions(Components.DOMPresentationUtils.MarkerDecorator);var markerToExtension=new Map();for(var i=0;i<this.treeOutline._decoratorExtensions.length;++i){markerToExtension.set(this.treeOutline._decoratorExtensions[i].descriptor()['marker'],this.treeOutline._decoratorExtensions[i]);}
var promises=[];var decorations=[];var descendantDecorations=[];node.traverseMarkers(visitor);function visitor(n,marker){var extension=markerToExtension.get(marker);if(!extension)
return;promises.push(extension.instance().then(collectDecoration.bind(null,n)));}
function collectDecoration(n,decorator){var decoration=decorator.decorate(n);if(!decoration)
return;(n===node?decorations:descendantDecorations).push(decoration);}
Promise.all(promises).then(updateDecorationsUI.bind(this));function updateDecorationsUI(){this._decorationsElement.removeChildren();this._decorationsElement.classList.add('hidden');this._gutterContainer.classList.toggle('has-decorations',decorations.length||descendantDecorations.length);if(!decorations.length&&!descendantDecorations.length)
return;var colors=new Set();var titles=createElement('div');for(var decoration of decorations){var titleElement=titles.createChild('div');titleElement.textContent=decoration.title;colors.add(decoration.color);}
if(this.expanded&&!decorations.length)
return;var descendantColors=new Set();if(descendantDecorations.length){var element=titles.createChild('div');element.textContent=Common.UIString('Children:');for(var decoration of descendantDecorations){element=titles.createChild('div');element.style.marginLeft='15px';element.textContent=decoration.title;descendantColors.add(decoration.color);}}
var offset=0;processColors.call(this,colors,'elements-gutter-decoration');if(!this.expanded)
processColors.call(this,descendantColors,'elements-gutter-decoration elements-has-decorated-children');UI.Tooltip.install(this._decorationsElement,titles);function processColors(colors,className){for(var color of colors){var child=this._decorationsElement.createChild('div',className);this._decorationsElement.classList.remove('hidden');child.style.backgroundColor=color;child.style.borderColor=color;if(offset)
child.style.marginLeft=offset+'px';offset+=3;}}}}
_buildAttributeDOM(parentElement,name,value,updateRecord,forceValue,node){var closingPunctuationRegex=/[\/;:\)\]\}]/g;var highlightIndex=0;var highlightCount;var additionalHighlightOffset=0;var result;function replacer(match,replaceOffset){while(highlightIndex<highlightCount&&result.entityRanges[highlightIndex].offset<replaceOffset){result.entityRanges[highlightIndex].offset+=additionalHighlightOffset;++highlightIndex;}
additionalHighlightOffset+=1;return match+'\u200B';}
function setValueWithEntities(element,value){result=this._convertWhitespaceToEntities(value);highlightCount=result.entityRanges.length;value=result.text.replace(closingPunctuationRegex,replacer);while(highlightIndex<highlightCount){result.entityRanges[highlightIndex].offset+=additionalHighlightOffset;++highlightIndex;}
element.setTextContentTruncatedIfNeeded(value);UI.highlightRangesWithStyleClass(element,result.entityRanges,'webkit-html-entity-value');}
var hasText=(forceValue||value.length>0);var attrSpanElement=parentElement.createChild('span','webkit-html-attribute');var attrNameElement=attrSpanElement.createChild('span','webkit-html-attribute-name');attrNameElement.textContent=name;if(hasText)
attrSpanElement.createTextChild('=\u200B"');var attrValueElement=attrSpanElement.createChild('span','webkit-html-attribute-value');if(updateRecord&&updateRecord.isAttributeModified(name))
UI.runCSSAnimationOnce(hasText?attrValueElement:attrNameElement,'dom-update-highlight');function linkifyValue(value){var rewrittenHref=node.resolveURL(value);if(rewrittenHref===null){var span=createElement('span');setValueWithEntities.call(this,span,value);return span;}
value=value.replace(closingPunctuationRegex,'$&\u200B');if(value.startsWith('data:'))
value=value.trimMiddle(60);var link=node.nodeName().toLowerCase()==='a'?UI.createExternalLink(rewrittenHref,value,'',true):Components.Linkifier.linkifyURL(rewrittenHref,value,'',undefined,undefined,true);link[Elements.ElementsTreeElement.HrefSymbol]=rewrittenHref;return link;}
if(node&&(name==='src'||name==='href')){attrValueElement.appendChild(linkifyValue.call(this,value));}else if(node&&(node.nodeName().toLowerCase()==='img'||node.nodeName().toLowerCase()==='source')&&name==='srcset'){var sources=value.split(',');for(var i=0;i<sources.length;++i){if(i>0)
attrValueElement.createTextChild(', ');var source=sources[i].trim();var indexOfSpace=source.indexOf(' ');var url,tail;if(indexOfSpace===-1){url=source;}else{url=source.substring(0,indexOfSpace);tail=source.substring(indexOfSpace);}
attrValueElement.appendChild(linkifyValue.call(this,url));if(tail)
attrValueElement.createTextChild(tail);}}else{setValueWithEntities.call(this,attrValueElement,value);}
if(hasText)
attrSpanElement.createTextChild('"');}
_buildPseudoElementDOM(parentElement,pseudoElementName){var pseudoElement=parentElement.createChild('span','webkit-html-pseudo-element');pseudoElement.textContent='::'+pseudoElementName;parentElement.createTextChild('\u200B');}
_buildTagDOM(parentElement,tagName,isClosingTag,isDistinctTreeElement,updateRecord){var node=this._node;var classes=['webkit-html-tag'];if(isClosingTag&&isDistinctTreeElement)
classes.push('close');var tagElement=parentElement.createChild('span',classes.join(' '));tagElement.createTextChild('<');var tagNameElement=tagElement.createChild('span',isClosingTag?'webkit-html-close-tag-name':'webkit-html-tag-name');tagNameElement.textContent=(isClosingTag?'/':'')+tagName;if(!isClosingTag){if(node.hasAttributes()){var attributes=node.attributes();for(var i=0;i<attributes.length;++i){var attr=attributes[i];tagElement.createTextChild(' ');this._buildAttributeDOM(tagElement,attr.name,attr.value,updateRecord,false,node);}}
if(updateRecord){var hasUpdates=updateRecord.hasRemovedAttributes()||updateRecord.hasRemovedChildren();hasUpdates|=!this.expanded&&updateRecord.hasChangedChildren();if(hasUpdates)
UI.runCSSAnimationOnce(tagNameElement,'dom-update-highlight');}}
tagElement.createTextChild('>');parentElement.createTextChild('\u200B');}
_convertWhitespaceToEntities(text){var result='';var lastIndexAfterEntity=0;var entityRanges=[];var charToEntity=Elements.ElementsTreeOutline.MappedCharToEntity;for(var i=0,size=text.length;i<size;++i){var char=text.charAt(i);if(charToEntity[char]){result+=text.substring(lastIndexAfterEntity,i);var entityValue='&'+charToEntity[char]+';';entityRanges.push({offset:result.length,length:entityValue.length});result+=entityValue;lastIndexAfterEntity=i+1;}}
if(result)
result+=text.substring(lastIndexAfterEntity);return{text:result||text,entityRanges:entityRanges};}
_nodeTitleInfo(updateRecord){var node=this._node;var titleDOM=createDocumentFragment();switch(node.nodeType()){case Node.ATTRIBUTE_NODE:this._buildAttributeDOM(titleDOM,(node.name),(node.value),updateRecord,true);break;case Node.ELEMENT_NODE:var pseudoType=node.pseudoType();if(pseudoType){this._buildPseudoElementDOM(titleDOM,pseudoType);break;}
var tagName=node.nodeNameInCorrectCase();if(this._elementCloseTag){this._buildTagDOM(titleDOM,tagName,true,true,updateRecord);break;}
this._buildTagDOM(titleDOM,tagName,false,false,updateRecord);if(this.isExpandable()){if(!this.expanded){var textNodeElement=titleDOM.createChild('span','webkit-html-text-node bogus');textNodeElement.textContent='\u2026';titleDOM.createTextChild('\u200B');this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);}
break;}
if(Elements.ElementsTreeElement.canShowInlineText(node)){var textNodeElement=titleDOM.createChild('span','webkit-html-text-node');var result=this._convertWhitespaceToEntities(node.firstChild.nodeValue());textNodeElement.textContent=result.text;UI.highlightRangesWithStyleClass(textNodeElement,result.entityRanges,'webkit-html-entity-value');titleDOM.createTextChild('\u200B');this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);if(updateRecord&&updateRecord.hasChangedChildren())
UI.runCSSAnimationOnce(textNodeElement,'dom-update-highlight');if(updateRecord&&updateRecord.isCharDataModified())
UI.runCSSAnimationOnce(textNodeElement,'dom-update-highlight');break;}
if(this.treeOutline.isXMLMimeType||!Elements.ElementsTreeElement.ForbiddenClosingTagElements.has(tagName))
this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);break;case Node.TEXT_NODE:if(node.parentNode&&node.parentNode.nodeName().toLowerCase()==='script'){var newNode=titleDOM.createChild('span','webkit-html-text-node webkit-html-js-node');var text=node.nodeValue();newNode.textContent=text.startsWith('\n')?text.substring(1):text;var javascriptSyntaxHighlighter=new UI.SyntaxHighlighter('text/javascript',true);javascriptSyntaxHighlighter.syntaxHighlightNode(newNode).then(updateSearchHighlight.bind(this));}else if(node.parentNode&&node.parentNode.nodeName().toLowerCase()==='style'){var newNode=titleDOM.createChild('span','webkit-html-text-node webkit-html-css-node');var text=node.nodeValue();newNode.textContent=text.startsWith('\n')?text.substring(1):text;var cssSyntaxHighlighter=new UI.SyntaxHighlighter('text/css',true);cssSyntaxHighlighter.syntaxHighlightNode(newNode).then(updateSearchHighlight.bind(this));}else{titleDOM.createTextChild('"');var textNodeElement=titleDOM.createChild('span','webkit-html-text-node');var result=this._convertWhitespaceToEntities(node.nodeValue());textNodeElement.textContent=result.text;UI.highlightRangesWithStyleClass(textNodeElement,result.entityRanges,'webkit-html-entity-value');titleDOM.createTextChild('"');if(updateRecord&&updateRecord.isCharDataModified())
UI.runCSSAnimationOnce(textNodeElement,'dom-update-highlight');}
break;case Node.COMMENT_NODE:var commentElement=titleDOM.createChild('span','webkit-html-comment');commentElement.createTextChild('<!--'+node.nodeValue()+'-->');break;case Node.DOCUMENT_TYPE_NODE:var docTypeElement=titleDOM.createChild('span','webkit-html-doctype');docTypeElement.createTextChild('<!DOCTYPE '+node.nodeName());if(node.publicId){docTypeElement.createTextChild(' PUBLIC "'+node.publicId+'"');if(node.systemId)
docTypeElement.createTextChild(' "'+node.systemId+'"');}else if(node.systemId){docTypeElement.createTextChild(' SYSTEM "'+node.systemId+'"');}
if(node.internalSubset)
docTypeElement.createTextChild(' ['+node.internalSubset+']');docTypeElement.createTextChild('>');break;case Node.CDATA_SECTION_NODE:var cdataElement=titleDOM.createChild('span','webkit-html-text-node');cdataElement.createTextChild('<![CDATA['+node.nodeValue()+']]>');break;case Node.DOCUMENT_FRAGMENT_NODE:var fragmentElement=titleDOM.createChild('span','webkit-html-fragment');fragmentElement.textContent=node.nodeNameInCorrectCase().collapseWhitespace();break;default:titleDOM.createTextChild(node.nodeNameInCorrectCase().collapseWhitespace());}
function updateSearchHighlight(){delete this._highlightResult;this._highlightSearchResults();}
return titleDOM;}
remove(){if(this._node.pseudoType())
return;var parentElement=this.parent;if(!parentElement)
return;if(!this._node.parentNode||this._node.parentNode.nodeType()===Node.DOCUMENT_NODE)
return;this._node.removeNode();}
toggleEditAsHTML(callback,startEditing){if(this._editing&&this._htmlEditElement){this._editing.commit();return;}
if(startEditing===false)
return;function selectNode(error){if(callback)
callback(!error);}
function commitChange(initialValue,value){if(initialValue!==value)
node.setOuterHTML(value,selectNode);}
function disposeCallback(){if(callback)
callback(false);}
var node=this._node;node.getOuterHTML(this._startEditingAsHTML.bind(this,commitChange,disposeCallback));}
_copyCSSPath(){InspectorFrontendHost.copyText(Components.DOMPresentationUtils.cssPath(this._node,true));}
_copyXPath(){InspectorFrontendHost.copyText(Components.DOMPresentationUtils.xPath(this._node,true));}
_highlightSearchResults(){if(!this._searchQuery||!this._searchHighlightsVisible)
return;this._hideSearchHighlight();var text=this.listItemElement.textContent;var regexObject=createPlainTextSearchRegex(this._searchQuery,'gi');var match=regexObject.exec(text);var matchRanges=[];while(match){matchRanges.push(new Common.SourceRange(match.index,match[0].length));match=regexObject.exec(text);}
if(!matchRanges.length)
matchRanges.push(new Common.SourceRange(0,text.length));this._highlightResult=[];UI.highlightSearchResults(this.listItemElement,matchRanges,this._highlightResult);}
_scrollIntoView(){function scrollIntoViewCallback(object){function scrollIntoView(){this.scrollIntoViewIfNeeded(true);}
if(object)
object.callFunction(scrollIntoView);}
this._node.resolveToObject('',scrollIntoViewCallback);}
_editAsHTML(){var promise=Common.Revealer.revealPromise(this.node());promise.then(()=>UI.actionRegistry.action('elements.edit-as-html').execute());}};Elements.ElementsTreeElement.HrefSymbol=Symbol('ElementsTreeElement.Href');Elements.ElementsTreeElement.InitialChildrenLimit=500;Elements.ElementsTreeElement.ForbiddenClosingTagElements=new Set(['area','base','basefont','br','canvas','col','command','embed','frame','hr','img','input','keygen','link','menuitem','meta','param','source','track','wbr']);Elements.ElementsTreeElement.EditTagBlacklist=new Set(['html','head','body']);Elements.MultilineEditorController;;Elements.ElementsTreeOutline=class extends UI.TreeOutline{constructor(domModel,omitRootDOMNode,selectEnabled){super();this._domModel=domModel;this._treeElementSymbol=Symbol('treeElement');var shadowContainer=createElement('div');this._shadowRoot=UI.createShadowRootWithCoreStyles(shadowContainer,'elements/elementsTreeOutline.css');var outlineDisclosureElement=this._shadowRoot.createChild('div','elements-disclosure');this._element=this.element;this._element.classList.add('elements-tree-outline','source-code');UI.ARIAUtils.setAccessibleName(this._element,Common.UIString('Page DOM'));this._element.addEventListener('mousedown',this._onmousedown.bind(this),false);this._element.addEventListener('mousemove',this._onmousemove.bind(this),false);this._element.addEventListener('mouseleave',this._onmouseleave.bind(this),false);this._element.addEventListener('dragstart',this._ondragstart.bind(this),false);this._element.addEventListener('dragover',this._ondragover.bind(this),false);this._element.addEventListener('dragleave',this._ondragleave.bind(this),false);this._element.addEventListener('drop',this._ondrop.bind(this),false);this._element.addEventListener('dragend',this._ondragend.bind(this),false);this._element.addEventListener('contextmenu',this._contextMenuEventFired.bind(this),false);this._element.addEventListener('clipboard-beforecopy',this._onBeforeCopy.bind(this),false);this._element.addEventListener('clipboard-copy',this._onCopyOrCut.bind(this,false),false);this._element.addEventListener('clipboard-cut',this._onCopyOrCut.bind(this,true),false);this._element.addEventListener('clipboard-paste',this._onPaste.bind(this),false);outlineDisclosureElement.appendChild(this._element);this.element=shadowContainer;this._includeRootDOMNode=!omitRootDOMNode;this._selectEnabled=selectEnabled;this._rootDOMNode=null;this._selectedDOMNode=null;this._visible=false;this._popoverHelper=new UI.PopoverHelper(this._element);this._popoverHelper.initializeCallbacks(this._getPopoverAnchor.bind(this),this._showPopover.bind(this));this._popoverHelper.setHasPadding(true);this._popoverHelper.setTimeout(0,100);this._updateRecords=new Map();this._treeElementsBeingUpdated=new Set();this._domModel.addEventListener(SDK.DOMModel.Events.MarkersChanged,this._markersChanged,this);this._showHTMLCommentsSetting=Common.moduleSetting('showHTMLComments');this._showHTMLCommentsSetting.addChangeListener(this._onShowHTMLCommentsChange.bind(this));}
static forDOMModel(domModel){return domModel[Elements.ElementsTreeOutline._treeOutlineSymbol]||null;}
_onShowHTMLCommentsChange(){var selectedNode=this.selectedDOMNode();if(selectedNode&&selectedNode.nodeType()===Node.COMMENT_NODE&&!this._showHTMLCommentsSetting.get())
this.selectDOMNode(selectedNode.parentNode);this.update();}
treeElementSymbol(){return this._treeElementSymbol;}
setWordWrap(wrap){this._element.classList.toggle('elements-tree-nowrap',!wrap);}
domModel(){return this._domModel;}
setMultilineEditing(multilineEditing){this._multilineEditing=multilineEditing;}
visibleWidth(){return this._visibleWidth;}
setVisibleWidth(width){this._visibleWidth=width;if(this._multilineEditing)
this._multilineEditing.resize();}
_setClipboardData(data){if(this._clipboardNodeData){var treeElement=this.findTreeElement(this._clipboardNodeData.node);if(treeElement)
treeElement.setInClipboard(false);delete this._clipboardNodeData;}
if(data){var treeElement=this.findTreeElement(data.node);if(treeElement)
treeElement.setInClipboard(true);this._clipboardNodeData=data;}}
resetClipboardIfNeeded(removedNode){if(this._clipboardNodeData&&this._clipboardNodeData.node===removedNode)
this._setClipboardData(null);}
_onBeforeCopy(event){event.handled=true;}
_onCopyOrCut(isCut,event){this._setClipboardData(null);var originalEvent=event['original'];if(!originalEvent.target.isComponentSelectionCollapsed())
return;if(UI.isEditing())
return;var targetNode=this.selectedDOMNode();if(!targetNode)
return;originalEvent.clipboardData.clearData();event.handled=true;this.performCopyOrCut(isCut,targetNode);}
performCopyOrCut(isCut,node){if(isCut&&(node.isShadowRoot()||node.ancestorUserAgentShadowRoot()))
return;node.copyNode();this._setClipboardData({node:node,isCut:isCut});}
canPaste(targetNode){if(targetNode.isShadowRoot()||targetNode.ancestorUserAgentShadowRoot())
return false;if(!this._clipboardNodeData)
return false;var node=this._clipboardNodeData.node;if(this._clipboardNodeData.isCut&&(node===targetNode||node.isAncestor(targetNode)))
return false;if(targetNode.target()!==node.target())
return false;return true;}
pasteNode(targetNode){if(this.canPaste(targetNode))
this._performPaste(targetNode);}
_onPaste(event){if(UI.isEditing())
return;var targetNode=this.selectedDOMNode();if(!targetNode||!this.canPaste(targetNode))
return;event.handled=true;this._performPaste(targetNode);}
_performPaste(targetNode){if(this._clipboardNodeData.isCut){this._clipboardNodeData.node.moveTo(targetNode,null,expandCallback.bind(this));this._setClipboardData(null);}else{this._clipboardNodeData.node.copyTo(targetNode,null,expandCallback.bind(this));}
function expandCallback(error,nodeId){if(error)
return;var pastedNode=this._domModel.nodeForId(nodeId);if(!pastedNode)
return;this.selectDOMNode(pastedNode);}}
setVisible(visible){this._visible=visible;if(!this._visible){this._popoverHelper.hidePopover();if(this._multilineEditing)
this._multilineEditing.cancel();return;}
this.runPendingUpdates();if(this._selectedDOMNode)
this._revealAndSelectNode(this._selectedDOMNode,false);}
get rootDOMNode(){return this._rootDOMNode;}
set rootDOMNode(x){if(this._rootDOMNode===x)
return;this._rootDOMNode=x;this._isXMLMimeType=x&&x.isXMLNode();this.update();}
get isXMLMimeType(){return this._isXMLMimeType;}
selectedDOMNode(){return this._selectedDOMNode;}
selectDOMNode(node,focus){if(this._selectedDOMNode===node){this._revealAndSelectNode(node,!focus);return;}
this._selectedDOMNode=node;this._revealAndSelectNode(node,!focus);if(this._selectedDOMNode===node)
this._selectedNodeChanged(!!focus);}
editing(){var node=this.selectedDOMNode();if(!node)
return false;var treeElement=this.findTreeElement(node);if(!treeElement)
return false;return treeElement.isEditing()||false;}
update(){var selectedNode=this.selectedDOMNode();this.removeChildren();if(!this.rootDOMNode)
return;if(this._includeRootDOMNode){var treeElement=this._createElementTreeElement(this.rootDOMNode);this.appendChild(treeElement);}else{var children=this._visibleChildren(this.rootDOMNode);for(var child of children){var treeElement=this._createElementTreeElement(child);this.appendChild(treeElement);}}
if(selectedNode)
this._revealAndSelectNode(selectedNode,true);}
_selectedNodeChanged(focus){this.dispatchEventToListeners(Elements.ElementsTreeOutline.Events.SelectedNodeChanged,{node:this._selectedDOMNode,focus:focus});}
_fireElementsTreeUpdated(nodes){this.dispatchEventToListeners(Elements.ElementsTreeOutline.Events.ElementsTreeUpdated,nodes);}
findTreeElement(node){var treeElement=this._lookUpTreeElement(node);if(!treeElement&&node.nodeType()===Node.TEXT_NODE){treeElement=this._lookUpTreeElement(node.parentNode);}
return(treeElement);}
_lookUpTreeElement(node){if(!node)
return null;var cachedElement=node[this._treeElementSymbol];if(cachedElement)
return cachedElement;var ancestors=[];for(var currentNode=node.parentNode;currentNode;currentNode=currentNode.parentNode){ancestors.push(currentNode);if(currentNode[this._treeElementSymbol])
break;}
if(!currentNode)
return null;for(var i=ancestors.length-1;i>=0;--i){var treeElement=ancestors[i][this._treeElementSymbol];if(treeElement)
treeElement.onpopulate();}
return node[this._treeElementSymbol];}
createTreeElementFor(node){var treeElement=this.findTreeElement(node);if(treeElement)
return treeElement;if(!node.parentNode)
return null;treeElement=this.createTreeElementFor(node.parentNode);return treeElement?this._showChild(treeElement,node):null;}
set suppressRevealAndSelect(x){if(this._suppressRevealAndSelect===x)
return;this._suppressRevealAndSelect=x;}
_revealAndSelectNode(node,omitFocus){if(this._suppressRevealAndSelect)
return;if(!this._includeRootDOMNode&&node===this.rootDOMNode&&this.rootDOMNode)
node=this.rootDOMNode.firstChild;if(!node)
return;var treeElement=this.createTreeElementFor(node);if(!treeElement)
return;treeElement.revealAndSelect(omitFocus);}
_treeElementFromEvent(event){var scrollContainer=this.element.parentElement;var x=scrollContainer.totalOffsetLeft()+scrollContainer.offsetWidth-36;var y=event.pageY;var elementUnderMouse=this.treeElementFromPoint(x,y);var elementAboveMouse=this.treeElementFromPoint(x,y-2);var element;if(elementUnderMouse===elementAboveMouse)
element=elementUnderMouse;else
element=this.treeElementFromPoint(x,y+2);return element;}
_getPopoverAnchor(element,event){var link=element;while(link&&!link[Elements.ElementsTreeElement.HrefSymbol])
link=link.parentElementOrShadowHost();return link?link:undefined;}
_loadDimensionsForNode(node,callback){if(!node.nodeName()||node.nodeName().toLowerCase()!=='img'){callback();return;}
node.resolveToObject('',resolvedNode);function resolvedNode(object){if(!object){callback();return;}
object.callFunctionJSON(features,undefined,callback);object.release();function features(){return{offsetWidth:this.offsetWidth,offsetHeight:this.offsetHeight,naturalWidth:this.naturalWidth,naturalHeight:this.naturalHeight,currentSrc:this.currentSrc};}}}
_showPopover(link,popover){var fulfill;var promise=new Promise(x=>fulfill=x);var listItem=link.enclosingNodeOrSelfWithNodeName('li');var node=(listItem.treeElement).node();this._loadDimensionsForNode(node,Components.DOMPresentationUtils.buildImagePreviewContents.bind(Components.DOMPresentationUtils,node.target(),link[Elements.ElementsTreeElement.HrefSymbol],true,showPopover));return promise;function showPopover(contents){if(contents)
popover.contentElement.appendChild(contents);fulfill(!!contents);}}
_onmousedown(event){var element=this._treeElementFromEvent(event);if(!element||element.isEventWithinDisclosureTriangle(event))
return;element.select();}
setHoverEffect(treeElement){if(this._previousHoveredElement===treeElement)
return;if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
if(treeElement){treeElement.hovered=true;this._previousHoveredElement=treeElement;}}
_onmousemove(event){var element=this._treeElementFromEvent(event);if(element&&this._previousHoveredElement===element)
return;this.setHoverEffect(element);if(element instanceof Elements.ElementsTreeElement){this._domModel.highlightDOMNodeWithConfig(element.node().id,{mode:'all',showInfo:!UI.KeyboardShortcut.eventHasCtrlOrMeta(event)});return;}
if(element instanceof Elements.ElementsTreeOutline.ShortcutTreeElement){this._domModel.highlightDOMNodeWithConfig(undefined,{mode:'all',showInfo:!UI.KeyboardShortcut.eventHasCtrlOrMeta(event)},element.backendNodeId());}}
_onmouseleave(event){this.setHoverEffect(null);SDK.DOMModel.hideDOMNodeHighlight();}
_ondragstart(event){if(!event.target.isComponentSelectionCollapsed())
return false;if(event.target.nodeName==='A')
return false;var treeElement=this._treeElementFromEvent(event);if(!this._isValidDragSourceOrTarget(treeElement))
return false;if(treeElement.node().nodeName()==='BODY'||treeElement.node().nodeName()==='HEAD')
return false;event.dataTransfer.setData('text/plain',treeElement.listItemElement.textContent.replace(/\u200b/g,''));event.dataTransfer.effectAllowed='copyMove';this._treeElementBeingDragged=treeElement;SDK.DOMModel.hideDOMNodeHighlight();return true;}
_ondragover(event){if(!this._treeElementBeingDragged)
return false;var treeElement=this._treeElementFromEvent(event);if(!this._isValidDragSourceOrTarget(treeElement))
return false;var node=treeElement.node();while(node){if(node===this._treeElementBeingDragged._node)
return false;node=node.parentNode;}
treeElement.listItemElement.classList.add('elements-drag-over');this._dragOverTreeElement=treeElement;event.preventDefault();event.dataTransfer.dropEffect='move';return false;}
_ondragleave(event){this._clearDragOverTreeElementMarker();event.preventDefault();return false;}
_isValidDragSourceOrTarget(treeElement){if(!treeElement)
return false;if(!(treeElement instanceof Elements.ElementsTreeElement))
return false;var elementsTreeElement=(treeElement);var node=elementsTreeElement.node();if(!node.parentNode||node.parentNode.nodeType()!==Node.ELEMENT_NODE)
return false;return true;}
_ondrop(event){event.preventDefault();var treeElement=this._treeElementFromEvent(event);if(treeElement)
this._doMove(treeElement);}
_doMove(treeElement){if(!this._treeElementBeingDragged)
return;var parentNode;var anchorNode;if(treeElement.isClosingTag()){parentNode=treeElement.node();}else{var dragTargetNode=treeElement.node();parentNode=dragTargetNode.parentNode;anchorNode=dragTargetNode;}
var wasExpanded=this._treeElementBeingDragged.expanded;this._treeElementBeingDragged._node.moveTo(parentNode,anchorNode,this.selectNodeAfterEdit.bind(this,wasExpanded));delete this._treeElementBeingDragged;}
_ondragend(event){event.preventDefault();this._clearDragOverTreeElementMarker();delete this._treeElementBeingDragged;}
_clearDragOverTreeElementMarker(){if(this._dragOverTreeElement){this._dragOverTreeElement.listItemElement.classList.remove('elements-drag-over');delete this._dragOverTreeElement;}}
_contextMenuEventFired(event){var treeElement=this._treeElementFromEvent(event);if(treeElement instanceof Elements.ElementsTreeElement)
this.showContextMenu(treeElement,event);}
showContextMenu(treeElement,event){if(UI.isEditing())
return;var contextMenu=new UI.ContextMenu(event);var isPseudoElement=!!treeElement.node().pseudoType();var isTag=treeElement.node().nodeType()===Node.ELEMENT_NODE&&!isPseudoElement;var textNode=event.target.enclosingNodeOrSelfWithClass('webkit-html-text-node');if(textNode&&textNode.classList.contains('bogus'))
textNode=null;var commentNode=event.target.enclosingNodeOrSelfWithClass('webkit-html-comment');if(textNode){contextMenu.appendSeparator();treeElement.populateTextContextMenu(contextMenu,textNode);}else if(isTag){contextMenu.appendSeparator();treeElement.populateTagContextMenu(contextMenu,event);}else if(commentNode){contextMenu.appendSeparator();treeElement.populateNodeContextMenu(contextMenu);}else if(isPseudoElement){treeElement.populateScrollIntoView(contextMenu);}
contextMenu.appendApplicableItems(treeElement.node());contextMenu.show();}
runPendingUpdates(){this._updateModifiedNodes();}
handleShortcut(event){var node=this.selectedDOMNode();if(!node)
return;var treeElement=node[this._treeElementSymbol];if(!treeElement)
return;if(UI.KeyboardShortcut.eventHasCtrlOrMeta(event)&&node.parentNode){if(event.key==='ArrowUp'&&node.previousSibling){node.moveTo(node.parentNode,node.previousSibling,this.selectNodeAfterEdit.bind(this,treeElement.expanded));event.handled=true;return;}
if(event.key==='ArrowDown'&&node.nextSibling){node.moveTo(node.parentNode,node.nextSibling.nextSibling,this.selectNodeAfterEdit.bind(this,treeElement.expanded));event.handled=true;return;}}}
toggleEditAsHTML(node,startEditing,callback){var treeElement=node[this._treeElementSymbol];if(!treeElement||!treeElement.hasEditableNode())
return;if(node.pseudoType())
return;var parentNode=node.parentNode;var index=node.index;var wasExpanded=treeElement.expanded;treeElement.toggleEditAsHTML(editingFinished.bind(this),startEditing);function editingFinished(success){if(callback)
callback();if(!success)
return;this.runPendingUpdates();var newNode=parentNode?parentNode.children()[index]||parentNode:null;if(!newNode)
return;this.selectDOMNode(newNode,true);if(wasExpanded){var newTreeItem=this.findTreeElement(newNode);if(newTreeItem)
newTreeItem.expand();}}}
selectNodeAfterEdit(wasExpanded,error,nodeId){if(error)
return null;this.runPendingUpdates();var newNode=nodeId?this._domModel.nodeForId(nodeId):null;if(!newNode)
return null;this.selectDOMNode(newNode,true);var newTreeItem=this.findTreeElement(newNode);if(wasExpanded){if(newTreeItem)
newTreeItem.expand();}
return newTreeItem;}
toggleHideElement(node,userCallback){var pseudoType=node.pseudoType();var effectiveNode=pseudoType?node.parentNode:node;if(!effectiveNode)
return;var hidden=node.marker('hidden-marker');function resolvedNode(object){if(!object)
return;function toggleClassAndInjectStyleRule(pseudoType,hidden){const classNamePrefix='__web-inspector-hide';const classNameSuffix='-shortcut__';const styleTagId='__web-inspector-hide-shortcut-style__';var selectors=[];selectors.push('.__web-inspector-hide-shortcut__');selectors.push('.__web-inspector-hide-shortcut__ *');selectors.push('.__web-inspector-hidebefore-shortcut__::before');selectors.push('.__web-inspector-hideafter-shortcut__::after');var selector=selectors.join(', ');var ruleBody='    visibility: hidden !important;';var rule='\n'+selector+'\n{\n'+ruleBody+'\n}\n';var className=classNamePrefix+(pseudoType||'')+classNameSuffix;this.classList.toggle(className,hidden);var localRoot=this;while(localRoot.parentNode)
localRoot=localRoot.parentNode;if(localRoot.nodeType===Node.DOCUMENT_NODE)
localRoot=document.head;var style=localRoot.querySelector('style#'+styleTagId);if(style)
return;style=document.createElement('style');style.id=styleTagId;style.type='text/css';style.textContent=rule;localRoot.appendChild(style);}
object.callFunction(toggleClassAndInjectStyleRule,[{value:pseudoType},{value:!hidden}],userCallback);object.release();node.setMarker('hidden-marker',hidden?null:true);}
effectiveNode.resolveToObject('',resolvedNode);}
isToggledToHidden(node){return!!node.marker('hidden-marker');}
_reset(){this.rootDOMNode=null;this.selectDOMNode(null,false);this._popoverHelper.hidePopover();delete this._clipboardNodeData;SDK.DOMModel.hideDOMNodeHighlight();this._updateRecords.clear();}
wireToDOMModel(){this._domModel[Elements.ElementsTreeOutline._treeOutlineSymbol]=this;this._domModel.addEventListener(SDK.DOMModel.Events.NodeInserted,this._nodeInserted,this);this._domModel.addEventListener(SDK.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);this._domModel.addEventListener(SDK.DOMModel.Events.AttrModified,this._attributeModified,this);this._domModel.addEventListener(SDK.DOMModel.Events.AttrRemoved,this._attributeRemoved,this);this._domModel.addEventListener(SDK.DOMModel.Events.CharacterDataModified,this._characterDataModified,this);this._domModel.addEventListener(SDK.DOMModel.Events.DocumentUpdated,this._documentUpdated,this);this._domModel.addEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated,this._childNodeCountUpdated,this);this._domModel.addEventListener(SDK.DOMModel.Events.DistributedNodesChanged,this._distributedNodesChanged,this);}
unwireFromDOMModel(){this._domModel.removeEventListener(SDK.DOMModel.Events.NodeInserted,this._nodeInserted,this);this._domModel.removeEventListener(SDK.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);this._domModel.removeEventListener(SDK.DOMModel.Events.AttrModified,this._attributeModified,this);this._domModel.removeEventListener(SDK.DOMModel.Events.AttrRemoved,this._attributeRemoved,this);this._domModel.removeEventListener(SDK.DOMModel.Events.CharacterDataModified,this._characterDataModified,this);this._domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated,this._documentUpdated,this);this._domModel.removeEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated,this._childNodeCountUpdated,this);this._domModel.removeEventListener(SDK.DOMModel.Events.DistributedNodesChanged,this._distributedNodesChanged,this);delete this._domModel[Elements.ElementsTreeOutline._treeOutlineSymbol];}
_addUpdateRecord(node){var record=this._updateRecords.get(node);if(!record){record=new Elements.ElementsTreeOutline.UpdateRecord();this._updateRecords.set(node,record);}
return record;}
_updateRecordForHighlight(node){if(!this._visible)
return null;return this._updateRecords.get(node)||null;}
_documentUpdated(event){var domModel=(event.data);var inspectedRootDocument=domModel.existingDocument();this._reset();if(!inspectedRootDocument)
return;this.rootDOMNode=inspectedRootDocument;}
_attributeModified(event){var node=(event.data.node);this._addUpdateRecord(node).attributeModified(event.data.name);this._updateModifiedNodesSoon();}
_attributeRemoved(event){var node=(event.data.node);this._addUpdateRecord(node).attributeRemoved(event.data.name);this._updateModifiedNodesSoon();}
_characterDataModified(event){var node=(event.data);this._addUpdateRecord(node).charDataModified();if(node.parentNode&&node.parentNode.firstChild===node.parentNode.lastChild)
this._addUpdateRecord(node.parentNode).childrenModified();this._updateModifiedNodesSoon();}
_nodeInserted(event){var node=(event.data);this._addUpdateRecord((node.parentNode)).nodeInserted(node);this._updateModifiedNodesSoon();}
_nodeRemoved(event){var node=(event.data.node);var parentNode=(event.data.parent);this.resetClipboardIfNeeded(node);this._addUpdateRecord(parentNode).nodeRemoved(node);this._updateModifiedNodesSoon();}
_childNodeCountUpdated(event){var node=(event.data);this._addUpdateRecord(node).childrenModified();this._updateModifiedNodesSoon();}
_distributedNodesChanged(event){var node=(event.data);this._addUpdateRecord(node).childrenModified();this._updateModifiedNodesSoon();}
_updateModifiedNodesSoon(){if(!this._updateRecords.size)
return;if(this._updateModifiedNodesTimeout)
return;this._updateModifiedNodesTimeout=setTimeout(this._updateModifiedNodes.bind(this),50);}
_updateModifiedNodes(){if(this._updateModifiedNodesTimeout){clearTimeout(this._updateModifiedNodesTimeout);delete this._updateModifiedNodesTimeout;}
var updatedNodes=this._updateRecords.keysArray();var hidePanelWhileUpdating=updatedNodes.length>10;if(hidePanelWhileUpdating){var treeOutlineContainerElement=this.element.parentNode;var originalScrollTop=treeOutlineContainerElement?treeOutlineContainerElement.scrollTop:0;this._element.classList.add('hidden');}
if(this._rootDOMNode&&this._updateRecords.get(this._rootDOMNode)&&this._updateRecords.get(this._rootDOMNode).hasChangedChildren()){this.update();}else{for(var node of this._updateRecords.keys()){if(this._updateRecords.get(node).hasChangedChildren())
this._updateModifiedParentNode(node);else
this._updateModifiedNode(node);}}
if(hidePanelWhileUpdating){this._element.classList.remove('hidden');if(originalScrollTop)
treeOutlineContainerElement.scrollTop=originalScrollTop;}
this._updateRecords.clear();this._fireElementsTreeUpdated(updatedNodes);}
_updateModifiedNode(node){var treeElement=this.findTreeElement(node);if(treeElement)
treeElement.updateTitle(this._updateRecordForHighlight(node));}
_updateModifiedParentNode(node){var parentTreeElement=this.findTreeElement(node);if(parentTreeElement){parentTreeElement.setExpandable(this._hasVisibleChildren(node));parentTreeElement.updateTitle(this._updateRecordForHighlight(node));if(parentTreeElement.populated)
this._updateChildren(parentTreeElement);}}
populateTreeElement(treeElement){if(treeElement.childCount()||!treeElement.isExpandable())
return;this._updateModifiedParentNode(treeElement.node());}
_createElementTreeElement(node,closingTag){var treeElement=new Elements.ElementsTreeElement(node,closingTag);treeElement.setExpandable(!closingTag&&this._hasVisibleChildren(node));if(node.nodeType()===Node.ELEMENT_NODE&&node.parentNode&&node.parentNode.nodeType()===Node.DOCUMENT_NODE&&!node.parentNode.parentNode)
treeElement.setCollapsible(false);treeElement.selectable=this._selectEnabled;return treeElement;}
_showChild(treeElement,child){if(treeElement.isClosingTag())
return null;var index=this._visibleChildren(treeElement.node()).indexOf(child);if(index===-1)
return null;if(index>=treeElement.expandedChildrenLimit())
this.setExpandedChildrenLimit(treeElement,index+1);return(treeElement.childAt(index));}
_visibleChildren(node){var visibleChildren=Elements.ElementsTreeElement.visibleShadowRoots(node);var importedDocument=node.importedDocument();if(importedDocument)
visibleChildren.push(importedDocument);var templateContent=node.templateContent();if(templateContent)
visibleChildren.push(templateContent);var beforePseudoElement=node.beforePseudoElement();if(beforePseudoElement)
visibleChildren.push(beforePseudoElement);if(node.childNodeCount()){var children=node.children();if(!this._showHTMLCommentsSetting.get())
children=children.filter(n=>n.nodeType()!==Node.COMMENT_NODE);visibleChildren=visibleChildren.concat(children);}
var afterPseudoElement=node.afterPseudoElement();if(afterPseudoElement)
visibleChildren.push(afterPseudoElement);return visibleChildren;}
_hasVisibleChildren(node){if(node.importedDocument())
return true;if(node.templateContent())
return true;if(Elements.ElementsTreeElement.visibleShadowRoots(node).length)
return true;if(node.hasPseudoElements())
return true;if(node.isInsertionPoint())
return true;return!!node.childNodeCount()&&!Elements.ElementsTreeElement.canShowInlineText(node);}
_createExpandAllButtonTreeElement(treeElement){var button=UI.createTextButton('',handleLoadAllChildren.bind(this));button.value='';var expandAllButtonElement=new UI.TreeElement(button);expandAllButtonElement.selectable=false;expandAllButtonElement.expandAllButton=true;expandAllButtonElement.button=button;return expandAllButtonElement;function handleLoadAllChildren(event){var visibleChildCount=this._visibleChildren(treeElement.node()).length;this.setExpandedChildrenLimit(treeElement,Math.max(visibleChildCount,treeElement.expandedChildrenLimit()+Elements.ElementsTreeElement.InitialChildrenLimit));event.consume();}}
setExpandedChildrenLimit(treeElement,expandedChildrenLimit){if(treeElement.expandedChildrenLimit()===expandedChildrenLimit)
return;treeElement.setExpandedChildrenLimit(expandedChildrenLimit);if(treeElement.treeOutline&&!this._treeElementsBeingUpdated.has(treeElement))
this._updateModifiedParentNode(treeElement.node());}
_updateChildren(treeElement){if(!treeElement.isExpandable()){var selectedTreeElement=treeElement.treeOutline.selectedTreeElement;if(selectedTreeElement&&selectedTreeElement.hasAncestor(treeElement))
treeElement.select(true);treeElement.removeChildren();return;}
console.assert(!treeElement.isClosingTag());treeElement.node().getChildNodes(childNodesLoaded.bind(this));function childNodesLoaded(children){if(!children)
return;this._innerUpdateChildren(treeElement);}}
insertChildElement(treeElement,child,index,closingTag){var newElement=this._createElementTreeElement(child,closingTag);treeElement.insertChild(newElement,index);return newElement;}
_moveChild(treeElement,child,targetIndex){if(treeElement.indexOfChild(child)===targetIndex)
return;var wasSelected=child.selected;if(child.parent)
child.parent.removeChild(child);treeElement.insertChild(child,targetIndex);if(wasSelected)
child.select();}
_innerUpdateChildren(treeElement){if(this._treeElementsBeingUpdated.has(treeElement))
return;this._treeElementsBeingUpdated.add(treeElement);var node=treeElement.node();var visibleChildren=this._visibleChildren(node);var visibleChildrenSet=new Set(visibleChildren);var existingTreeElements=new Map();for(var i=treeElement.childCount()-1;i>=0;--i){var existingTreeElement=treeElement.childAt(i);if(!(existingTreeElement instanceof Elements.ElementsTreeElement)){treeElement.removeChildAtIndex(i);continue;}
var elementsTreeElement=(existingTreeElement);var existingNode=elementsTreeElement.node();if(visibleChildrenSet.has(existingNode)){existingTreeElements.set(existingNode,existingTreeElement);continue;}
treeElement.removeChildAtIndex(i);}
for(var i=0;i<visibleChildren.length&&i<treeElement.expandedChildrenLimit();++i){var child=visibleChildren[i];var existingTreeElement=existingTreeElements.get(child)||this.findTreeElement(child);if(existingTreeElement&&existingTreeElement!==treeElement){this._moveChild(treeElement,existingTreeElement,i);}else{var newElement=this.insertChildElement(treeElement,child,i);if(this._updateRecordForHighlight(node)&&treeElement.expanded)
Elements.ElementsTreeElement.animateOnDOMUpdate(newElement);if(treeElement.childCount()>treeElement.expandedChildrenLimit())
this.setExpandedChildrenLimit(treeElement,treeElement.expandedChildrenLimit()+1);}}
var expandedChildCount=treeElement.childCount();if(visibleChildren.length>expandedChildCount){var targetButtonIndex=expandedChildCount;if(!treeElement.expandAllButtonElement)
treeElement.expandAllButtonElement=this._createExpandAllButtonTreeElement(treeElement);treeElement.insertChild(treeElement.expandAllButtonElement,targetButtonIndex);treeElement.expandAllButtonElement.button.textContent=Common.UIString('Show All Nodes (%d More)',visibleChildren.length-expandedChildCount);}else if(treeElement.expandAllButtonElement){delete treeElement.expandAllButtonElement;}
if(node.isInsertionPoint()){for(var distributedNode of node.distributedNodes())
treeElement.appendChild(new Elements.ElementsTreeOutline.ShortcutTreeElement(distributedNode));}
if(node.nodeType()===Node.ELEMENT_NODE&&treeElement.isExpandable())
this.insertChildElement(treeElement,node,treeElement.childCount(),true);this._treeElementsBeingUpdated.delete(treeElement);}
_markersChanged(event){var node=(event.data);var treeElement=node[this._treeElementSymbol];if(treeElement)
treeElement.updateDecorations();}};Elements.ElementsTreeOutline._treeOutlineSymbol=Symbol('treeOutline');Elements.ElementsTreeOutline.ClipboardData;Elements.ElementsTreeOutline.Events={SelectedNodeChanged:Symbol('SelectedNodeChanged'),ElementsTreeUpdated:Symbol('ElementsTreeUpdated')};Elements.ElementsTreeOutline.MappedCharToEntity={'\u00a0':'nbsp','\u0093':'#147','\u00ad':'shy','\u2002':'ensp','\u2003':'emsp','\u2009':'thinsp','\u200a':'#8202','\u200b':'#8203','\u200c':'zwnj','\u200d':'zwj','\u200e':'lrm','\u200f':'rlm','\u202a':'#8234','\u202b':'#8235','\u202c':'#8236','\u202d':'#8237','\u202e':'#8238','\ufeff':'#65279'};Elements.ElementsTreeOutline.UpdateRecord=class{attributeModified(attrName){if(this._removedAttributes&&this._removedAttributes.has(attrName))
this._removedAttributes.delete(attrName);if(!this._modifiedAttributes)
this._modifiedAttributes=(new Set());this._modifiedAttributes.add(attrName);}
attributeRemoved(attrName){if(this._modifiedAttributes&&this._modifiedAttributes.has(attrName))
this._modifiedAttributes.delete(attrName);if(!this._removedAttributes)
this._removedAttributes=(new Set());this._removedAttributes.add(attrName);}
nodeInserted(node){this._hasChangedChildren=true;}
nodeRemoved(node){this._hasChangedChildren=true;this._hasRemovedChildren=true;}
charDataModified(){this._charDataModified=true;}
childrenModified(){this._hasChangedChildren=true;}
isAttributeModified(attributeName){return this._modifiedAttributes&&this._modifiedAttributes.has(attributeName);}
hasRemovedAttributes(){return!!this._removedAttributes&&!!this._removedAttributes.size;}
isCharDataModified(){return!!this._charDataModified;}
hasChangedChildren(){return!!this._hasChangedChildren;}
hasRemovedChildren(){return!!this._hasRemovedChildren;}};Elements.ElementsTreeOutline.Renderer=class{render(object){return new Promise(renderPromise);function renderPromise(resolve,reject){if(object instanceof SDK.DOMNode){onNodeResolved((object));}else if(object instanceof SDK.DeferredDOMNode){((object)).resolve(onNodeResolved);}else if(object instanceof SDK.RemoteObject){var domModel=SDK.DOMModel.fromTarget(((object)).runtimeModel().target());if(domModel)
domModel.pushObjectAsNodeToFrontend(object,onNodeResolved);else
reject(new Error('No dom model for given JS object target found.'));}else{reject(new Error('Can\'t reveal not a node.'));}
function onNodeResolved(node){if(!node){reject(new Error('Could not resolve node.'));return;}
var treeOutline=new Elements.ElementsTreeOutline(node.domModel(),false,false);treeOutline.rootDOMNode=node;if(!treeOutline.firstChild().isExpandable())
treeOutline._element.classList.add('single-node');treeOutline.setVisible(true);treeOutline.element.treeElementForTest=treeOutline.firstChild();resolve(treeOutline.element);}}}};Elements.ElementsTreeOutline.ShortcutTreeElement=class extends UI.TreeElement{constructor(nodeShortcut){super('');this.listItemElement.createChild('div','selection fill');var title=this.listItemElement.createChild('span','elements-tree-shortcut-title');var text=nodeShortcut.nodeName.toLowerCase();if(nodeShortcut.nodeType===Node.ELEMENT_NODE)
text='<'+text+'>';title.textContent='\u21AA '+text;var link=Components.DOMPresentationUtils.linkifyDeferredNodeReference(nodeShortcut.deferredNode);this.listItemElement.createTextChild(' ');link.classList.add('elements-tree-shortcut-link');link.textContent=Common.UIString('reveal');this.listItemElement.appendChild(link);this._nodeShortcut=nodeShortcut;}
get hovered(){return this._hovered;}
set hovered(x){if(this._hovered===x)
return;this._hovered=x;this.listItemElement.classList.toggle('hovered',x);}
backendNodeId(){return this._nodeShortcut.deferredNode.backendNodeId();}
onselect(selectedByUser){if(!selectedByUser)
return true;this._nodeShortcut.deferredNode.highlight();this._nodeShortcut.deferredNode.resolve(resolved.bind(this));function resolved(node){if(node){this.treeOutline._selectedDOMNode=node;this.treeOutline._selectedNodeChanged();}}
return true;}};;Elements.EventListenersWidget=class extends UI.ThrottledWidget{constructor(){super();this.element.classList.add('events-pane');this._toolbarItems=[];this._showForAncestorsSetting=Common.settings.moduleSetting('showEventListenersForAncestors');this._showForAncestorsSetting.addChangeListener(this.update.bind(this));this._dispatchFilterBySetting=Common.settings.createSetting('eventListenerDispatchFilterType',Elements.EventListenersWidget.DispatchFilterBy.All);this._dispatchFilterBySetting.addChangeListener(this.update.bind(this));this._showFrameworkListenersSetting=Common.settings.createSetting('showFrameowkrListeners',true);this._showFrameworkListenersSetting.setTitle(Common.UIString('Framework listeners'));this._showFrameworkListenersSetting.addChangeListener(this._showFrameworkListenersChanged.bind(this));this._eventListenersView=new EventListeners.EventListenersView(this.element,this.update.bind(this));var refreshButton=new UI.ToolbarButton(Common.UIString('Refresh'),'largeicon-refresh');refreshButton.addEventListener(UI.ToolbarButton.Events.Click,this.update.bind(this));this._toolbarItems.push(refreshButton);this._toolbarItems.push(new UI.ToolbarSettingCheckbox(this._showForAncestorsSetting,Common.UIString('Show listeners on the ancestors'),Common.UIString('Ancestors')));var dispatchFilter=new UI.ToolbarComboBox(this._onDispatchFilterTypeChanged.bind(this));function addDispatchFilterOption(name,value){var option=dispatchFilter.createOption(name,'',value);if(value===this._dispatchFilterBySetting.get())
dispatchFilter.select(option);}
addDispatchFilterOption.call(this,Common.UIString('All'),Elements.EventListenersWidget.DispatchFilterBy.All);addDispatchFilterOption.call(this,Common.UIString('Passive'),Elements.EventListenersWidget.DispatchFilterBy.Passive);addDispatchFilterOption.call(this,Common.UIString('Blocking'),Elements.EventListenersWidget.DispatchFilterBy.Blocking);dispatchFilter.setMaxWidth(200);this._toolbarItems.push(dispatchFilter);this._toolbarItems.push(new UI.ToolbarSettingCheckbox(this._showFrameworkListenersSetting,Common.UIString('Resolve event listeners bound with framework')));UI.context.addFlavorChangeListener(SDK.DOMNode,this.update,this);this.update();}
doUpdate(){if(this._lastRequestedNode){this._lastRequestedNode.target().runtimeModel.releaseObjectGroup(Elements.EventListenersWidget._objectGroupName);delete this._lastRequestedNode;}
var node=UI.context.flavor(SDK.DOMNode);if(!node){this._eventListenersView.reset();this._eventListenersView.addEmptyHolderIfNeeded();return Promise.resolve();}
this._lastRequestedNode=node;var selectedNodeOnly=!this._showForAncestorsSetting.get();var promises=[];promises.push(node.resolveToObjectPromise(Elements.EventListenersWidget._objectGroupName));if(!selectedNodeOnly){var currentNode=node.parentNode;while(currentNode){promises.push(currentNode.resolveToObjectPromise(Elements.EventListenersWidget._objectGroupName));currentNode=currentNode.parentNode;}
promises.push(this._windowObjectInNodeContext(node));}
return Promise.all(promises).then(this._eventListenersView.addObjects.bind(this._eventListenersView)).then(this._showFrameworkListenersChanged.bind(this));}
toolbarItems(){return this._toolbarItems;}
_onDispatchFilterTypeChanged(event){this._dispatchFilterBySetting.set(event.target.value);}
_showFrameworkListenersChanged(){var dispatchFilter=this._dispatchFilterBySetting.get();var showPassive=dispatchFilter===Elements.EventListenersWidget.DispatchFilterBy.All||dispatchFilter===Elements.EventListenersWidget.DispatchFilterBy.Passive;var showBlocking=dispatchFilter===Elements.EventListenersWidget.DispatchFilterBy.All||dispatchFilter===Elements.EventListenersWidget.DispatchFilterBy.Blocking;this._eventListenersView.showFrameworkListeners(this._showFrameworkListenersSetting.get(),showPassive,showBlocking);}
_windowObjectInNodeContext(node){return new Promise(windowObjectInNodeContext);function windowObjectInNodeContext(fulfill,reject){var executionContexts=node.target().runtimeModel.executionContexts();var context=null;if(node.frameId()){for(var i=0;i<executionContexts.length;++i){var executionContext=executionContexts[i];if(executionContext.frameId===node.frameId()&&executionContext.isDefault)
context=executionContext;}}else{context=executionContexts[0];}
context.evaluate('self',Elements.EventListenersWidget._objectGroupName,false,true,false,false,false,fulfill);}}
_eventListenersArrivedForTest(){}};Elements.EventListenersWidget.DispatchFilterBy={All:'All',Blocking:'Blocking',Passive:'Passive'};Elements.EventListenersWidget._objectGroupName='event-listeners-panel';;Elements.MetricsSidebarPane=class extends Elements.ElementsSidebarPane{constructor(){super();this._inlineStyle=null;}
doUpdate(){if(this._isEditingMetrics)
return Promise.resolve();var node=this.node();var cssModel=this.cssModel();if(!node||node.nodeType()!==Node.ELEMENT_NODE||!cssModel){this.element.removeChildren();return Promise.resolve();}
function callback(style){if(!style||this.node()!==node)
return;this._updateMetrics(style);}
function inlineStyleCallback(inlineStyleResult){if(inlineStyleResult&&this.node()===node)
this._inlineStyle=inlineStyleResult.inlineStyle;}
var promises=[cssModel.computedStylePromise(node.id).then(callback.bind(this)),cssModel.inlineStylesPromise(node.id).then(inlineStyleCallback.bind(this))];return Promise.all(promises);}
onCSSModelChanged(){this.update();}
_getPropertyValueAsPx(style,propertyName){return Number(style.get(propertyName).replace(/px$/,'')||0);}
_getBox(computedStyle,componentName){var suffix=componentName==='border'?'-width':'';var left=this._getPropertyValueAsPx(computedStyle,componentName+'-left'+suffix);var top=this._getPropertyValueAsPx(computedStyle,componentName+'-top'+suffix);var right=this._getPropertyValueAsPx(computedStyle,componentName+'-right'+suffix);var bottom=this._getPropertyValueAsPx(computedStyle,componentName+'-bottom'+suffix);return{left:left,top:top,right:right,bottom:bottom};}
_highlightDOMNode(showHighlight,mode,event){event.consume();if(showHighlight&&this.node()){if(this._highlightMode===mode)
return;this._highlightMode=mode;this.node().highlight(mode);}else{delete this._highlightMode;SDK.DOMModel.hideDOMNodeHighlight();}
for(var i=0;this._boxElements&&i<this._boxElements.length;++i){var element=this._boxElements[i];if(!this.node()||mode==='all'||element._name===mode)
element.style.backgroundColor=element._backgroundColor;else
element.style.backgroundColor='';}}
_updateMetrics(style){var metricsElement=createElement('div');metricsElement.className='metrics';var self=this;function createBoxPartElement(style,name,side,suffix){var propertyName=(name!=='position'?name+'-':'')+side+suffix;var value=style.get(propertyName);if(value===''||(name!=='position'&&value==='0px'))
value='\u2012';else if(name==='position'&&value==='auto')
value='\u2012';value=value.replace(/px$/,'');value=Number.toFixedIfFloating(value);var element=createElement('div');element.className=side;element.textContent=value;element.addEventListener('dblclick',this.startEditing.bind(this,element,name,propertyName,style),false);return element;}
function getContentAreaWidthPx(style){var width=style.get('width').replace(/px$/,'');if(!isNaN(width)&&style.get('box-sizing')==='border-box'){var borderBox=self._getBox(style,'border');var paddingBox=self._getBox(style,'padding');width=width-borderBox.left-borderBox.right-paddingBox.left-paddingBox.right;}
return Number.toFixedIfFloating(width.toString());}
function getContentAreaHeightPx(style){var height=style.get('height').replace(/px$/,'');if(!isNaN(height)&&style.get('box-sizing')==='border-box'){var borderBox=self._getBox(style,'border');var paddingBox=self._getBox(style,'padding');height=height-borderBox.top-borderBox.bottom-paddingBox.top-paddingBox.bottom;}
return Number.toFixedIfFloating(height.toString());}
var noMarginDisplayType={'table-cell':true,'table-column':true,'table-column-group':true,'table-footer-group':true,'table-header-group':true,'table-row':true,'table-row-group':true};var noPaddingDisplayType={'table-column':true,'table-column-group':true,'table-footer-group':true,'table-header-group':true,'table-row':true,'table-row-group':true};var noPositionType={'static':true};var boxes=['content','padding','border','margin','position'];var boxColors=[Common.Color.PageHighlight.Content,Common.Color.PageHighlight.Padding,Common.Color.PageHighlight.Border,Common.Color.PageHighlight.Margin,Common.Color.fromRGBA([0,0,0,0])];var boxLabels=[Common.UIString('content'),Common.UIString('padding'),Common.UIString('border'),Common.UIString('margin'),Common.UIString('position')];var previousBox=null;this._boxElements=[];for(var i=0;i<boxes.length;++i){var name=boxes[i];if(name==='margin'&&noMarginDisplayType[style.get('display')])
continue;if(name==='padding'&&noPaddingDisplayType[style.get('display')])
continue;if(name==='position'&&noPositionType[style.get('position')])
continue;var boxElement=createElement('div');boxElement.className=name;boxElement._backgroundColor=boxColors[i].asString(Common.Color.Format.RGBA);boxElement._name=name;boxElement.style.backgroundColor=boxElement._backgroundColor;boxElement.addEventListener('mouseover',this._highlightDOMNode.bind(this,true,name==='position'?'all':name),false);this._boxElements.push(boxElement);if(name==='content'){var widthElement=createElement('span');widthElement.textContent=getContentAreaWidthPx(style);widthElement.addEventListener('dblclick',this.startEditing.bind(this,widthElement,'width','width',style),false);var heightElement=createElement('span');heightElement.textContent=getContentAreaHeightPx(style);heightElement.addEventListener('dblclick',this.startEditing.bind(this,heightElement,'height','height',style),false);boxElement.appendChild(widthElement);boxElement.createTextChild(' \u00D7 ');boxElement.appendChild(heightElement);}else{var suffix=(name==='border'?'-width':'');var labelElement=createElement('div');labelElement.className='label';labelElement.textContent=boxLabels[i];boxElement.appendChild(labelElement);boxElement.appendChild(createBoxPartElement.call(this,style,name,'top',suffix));boxElement.appendChild(createElement('br'));boxElement.appendChild(createBoxPartElement.call(this,style,name,'left',suffix));if(previousBox)
boxElement.appendChild(previousBox);boxElement.appendChild(createBoxPartElement.call(this,style,name,'right',suffix));boxElement.appendChild(createElement('br'));boxElement.appendChild(createBoxPartElement.call(this,style,name,'bottom',suffix));}
previousBox=boxElement;}
metricsElement.appendChild(previousBox);metricsElement.addEventListener('mouseover',this._highlightDOMNode.bind(this,false,'all'),false);this.element.removeChildren();this.element.appendChild(metricsElement);}
startEditing(targetElement,box,styleProperty,computedStyle){if(UI.isBeingEdited(targetElement))
return;var context={box:box,styleProperty:styleProperty,computedStyle:computedStyle};var boundKeyDown=this._handleKeyDown.bind(this,context,styleProperty);context.keyDownHandler=boundKeyDown;targetElement.addEventListener('keydown',boundKeyDown,false);this._isEditingMetrics=true;var config=new UI.InplaceEditor.Config(this._editingCommitted.bind(this),this.editingCancelled.bind(this),context);UI.InplaceEditor.startEditing(targetElement,config);targetElement.getComponentSelection().selectAllChildren(targetElement);}
_handleKeyDown(context,styleProperty,event){var element=event.currentTarget;function finishHandler(originalValue,replacementString){this._applyUserInput(element,replacementString,originalValue,context,false);}
function customNumberHandler(prefix,number,suffix){if(styleProperty!=='margin'&&number<0)
number=0;return prefix+number+suffix;}
UI.handleElementValueModifications(event,element,finishHandler.bind(this),undefined,customNumberHandler);}
editingEnded(element,context){delete this.originalPropertyData;delete this.previousPropertyDataCandidate;element.removeEventListener('keydown',context.keyDownHandler,false);delete this._isEditingMetrics;}
editingCancelled(element,context){if('originalPropertyData'in this&&this._inlineStyle){if(!this.originalPropertyData){var pastLastSourcePropertyIndex=this._inlineStyle.pastLastSourcePropertyIndex();if(pastLastSourcePropertyIndex)
this._inlineStyle.allProperties()[pastLastSourcePropertyIndex-1].setText('',false);}else{this._inlineStyle.allProperties()[this.originalPropertyData.index].setText(this.originalPropertyData.propertyText,false);}}
this.editingEnded(element,context);this.update();}
_applyUserInput(element,userInput,previousContent,context,commitEditor){if(!this._inlineStyle){return this.editingCancelled(element,context);}
if(commitEditor&&userInput===previousContent)
return this.editingCancelled(element,context);if(context.box!=='position'&&(!userInput||userInput==='\u2012'))
userInput='0px';else if(context.box==='position'&&(!userInput||userInput==='\u2012'))
userInput='auto';userInput=userInput.toLowerCase();if(/^\d+$/.test(userInput))
userInput+='px';var styleProperty=context.styleProperty;var computedStyle=context.computedStyle;if(computedStyle.get('box-sizing')==='border-box'&&(styleProperty==='width'||styleProperty==='height')){if(!userInput.match(/px$/)){Common.console.error('For elements with box-sizing: border-box, only absolute content area dimensions can be applied');return;}
var borderBox=this._getBox(computedStyle,'border');var paddingBox=this._getBox(computedStyle,'padding');var userValuePx=Number(userInput.replace(/px$/,''));if(isNaN(userValuePx))
return;if(styleProperty==='width')
userValuePx+=borderBox.left+borderBox.right+paddingBox.left+paddingBox.right;else
userValuePx+=borderBox.top+borderBox.bottom+paddingBox.top+paddingBox.bottom;userInput=userValuePx+'px';}
this.previousPropertyDataCandidate=null;var allProperties=this._inlineStyle.allProperties();for(var i=0;i<allProperties.length;++i){var property=allProperties[i];if(property.name!==context.styleProperty||!property.activeInStyle())
continue;this.previousPropertyDataCandidate=property;property.setValue(userInput,commitEditor,true,callback.bind(this));return;}
this._inlineStyle.appendProperty(context.styleProperty,userInput,callback.bind(this));function callback(success){if(!success)
return;if(!('originalPropertyData'in this))
this.originalPropertyData=this.previousPropertyDataCandidate;if(typeof this._highlightMode!=='undefined')
this.node().highlight(this._highlightMode);if(commitEditor)
this.update();}}
_editingCommitted(element,userInput,previousContent,context){this.editingEnded(element,context);this._applyUserInput(element,userInput,previousContent,context,true);}};;Elements.PlatformFontsWidget=class extends UI.ThrottledWidget{constructor(sharedModel){super(true);this.registerRequiredCSS('elements/platformFontsWidget.css');this._sharedModel=sharedModel;this._sharedModel.addEventListener(Elements.ComputedStyleModel.Events.ComputedStyleChanged,this.update,this);this._sectionTitle=createElementWithClass('div','title');this.contentElement.classList.add('platform-fonts');this.contentElement.appendChild(this._sectionTitle);this._sectionTitle.textContent=Common.UIString('Rendered Fonts');this._fontStatsSection=this.contentElement.createChild('div','stats-section');}
doUpdate(){var cssModel=this._sharedModel.cssModel();var node=this._sharedModel.node();if(!node||!cssModel)
return Promise.resolve();return cssModel.platformFontsPromise(node.id).then(this._refreshUI.bind(this,node));}
_refreshUI(node,platformFonts){if(this._sharedModel.node()!==node)
return;this._fontStatsSection.removeChildren();var isEmptySection=!platformFonts||!platformFonts.length;this._sectionTitle.classList.toggle('hidden',isEmptySection);if(isEmptySection)
return;platformFonts.sort(function(a,b){return b.glyphCount-a.glyphCount;});for(var i=0;i<platformFonts.length;++i){var fontStatElement=this._fontStatsSection.createChild('div','font-stats-item');var fontNameElement=fontStatElement.createChild('span','font-name');fontNameElement.textContent=platformFonts[i].familyName;var fontDelimeterElement=fontStatElement.createChild('span','font-delimeter');fontDelimeterElement.textContent='\u2014';var fontOrigin=fontStatElement.createChild('span');fontOrigin.textContent=platformFonts[i].isCustomFont?Common.UIString('Network resource'):Common.UIString('Local file');var fontUsageElement=fontStatElement.createChild('span','font-usage');var usage=platformFonts[i].glyphCount;fontUsageElement.textContent=usage===1?Common.UIString('(%d glyph)',usage):Common.UIString('(%d glyphs)',usage);}}};;Elements.PropertiesWidget=class extends UI.ThrottledWidget{constructor(){super();SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.AttrModified,this._onNodeChange,this);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.AttrRemoved,this._onNodeChange,this);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.CharacterDataModified,this._onNodeChange,this);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.ChildNodeCountUpdated,this._onNodeChange,this);UI.context.addFlavorChangeListener(SDK.DOMNode,this._setNode,this);this._node=UI.context.flavor(SDK.DOMNode);this.update();}
_setNode(event){this._node=(event.data);this.update();}
doUpdate(){if(this._lastRequestedNode){this._lastRequestedNode.target().runtimeModel.releaseObjectGroup(Elements.PropertiesWidget._objectGroupName);delete this._lastRequestedNode;}
if(!this._node){this.element.removeChildren();this.sections=[];return Promise.resolve();}
this._lastRequestedNode=this._node;return this._node.resolveToObjectPromise(Elements.PropertiesWidget._objectGroupName).then(nodeResolved.bind(this));function nodeResolved(object){if(!object)
return;function protoList(){var proto=this;var result={__proto__:null};var counter=1;while(proto){result[counter++]=proto;proto=proto.__proto__;}
return result;}
var promise=object.callFunctionPromise(protoList).then(nodePrototypesReady.bind(this));object.release();return promise;}
function nodePrototypesReady(result){if(!result.object||result.wasThrown)
return;var promise=result.object.getOwnPropertiesPromise(false).then(fillSection.bind(this));result.object.release();return promise;}
function fillSection(result){if(!result||!result.properties)
return;var properties=result.properties;var expanded=[];var sections=this.sections||[];for(var i=0;i<sections.length;++i)
expanded.push(sections[i].expanded);this.element.removeChildren();this.sections=[];for(var i=0;i<properties.length;++i){if(!parseInt(properties[i].name,10))
continue;var property=properties[i].value;var title=property.description;title=title.replace(/Prototype$/,'');var section=new ObjectUI.ObjectPropertiesSection(property,title);section.element.classList.add('properties-widget-section');this.sections.push(section);this.element.appendChild(section.element);if(expanded[this.sections.length-1])
section.expand();section.addEventListener(UI.TreeOutline.Events.ElementExpanded,this._propertyExpanded,this);}}}
_propertyExpanded(event){Host.userMetrics.actionTaken(Host.UserMetrics.Action.DOMPropertiesExpanded);for(var section of this.sections)
section.removeEventListener(UI.TreeOutline.Events.ElementExpanded,this._propertyExpanded,this);}
_onNodeChange(event){if(!this._node)
return;var data=event.data;var node=(data instanceof SDK.DOMNode?data:data.node);if(this._node!==node)
return;this.update();}};Elements.PropertiesWidget._objectGroupName='properties-sidebar-pane';;Elements.StylePropertyHighlighter=class{constructor(ssp,cssProperty){this._styleSidebarPane=ssp;this._cssProperty=cssProperty;}
perform(){for(var section of this._styleSidebarPane.allSections()){for(var treeElement=section.propertiesTreeOutline.firstChild();treeElement;treeElement=treeElement.nextSibling)
treeElement.onpopulate();}
var highlightTreeElement=null;for(var section of this._styleSidebarPane.allSections()){var treeElement=section.propertiesTreeOutline.firstChild();while(treeElement&&!highlightTreeElement){if(treeElement.property===this._cssProperty){highlightTreeElement=treeElement;break;}
treeElement=treeElement.traverseNextTreeElement(false,null,true);}
if(highlightTreeElement)
break;}
if(!highlightTreeElement)
return;highlightTreeElement.parent.expand();highlightTreeElement.listItemElement.scrollIntoViewIfNeeded();highlightTreeElement.listItemElement.animate([{offset:0,backgroundColor:'rgba(255, 255, 0, 0.2)'},{offset:0.1,backgroundColor:'rgba(255, 255, 0, 0.7)'},{offset:1,backgroundColor:'transparent'}],{duration:2000,easing:'cubic-bezier(0, 0, 0.2, 1)'});}};;Elements.StylesSidebarPane=class extends Elements.ElementsSidebarPane{constructor(){super();this.setMinimumSize(96,26);Common.moduleSetting('colorFormat').addChangeListener(this.update.bind(this));Common.moduleSetting('textEditorIndent').addChangeListener(this.update.bind(this));this._sectionsContainer=this.element.createChild('div');this._swatchPopoverHelper=new InlineEditor.SwatchPopoverHelper();this._linkifier=new Components.Linkifier(Elements.StylesSidebarPane._maxLinkLength,true);this._decorator=null;this._userOperation=false;this._isEditingStyle=false;this._filterRegex=null;this._mouseDownTreeElement=null;this._mouseDownTreeElementIsName=false;this._mouseDownTreeElementIsValue=false;this.element.classList.add('styles-pane');this._sectionBlocks=[];Elements.StylesSidebarPane._instance=this;UI.context.addFlavorChangeListener(SDK.DOMNode,this.forceUpdate,this);this.element.addEventListener('copy',this._clipboardCopy.bind(this));}
static createExclamationMark(property){var exclamationElement=createElement('label','dt-icon-label');exclamationElement.className='exclamation-mark';if(!Elements.StylesSidebarPane.ignoreErrorsForProperty(property))
exclamationElement.type='smallicon-warning';exclamationElement.title=SDK.cssMetadata().isCSSPropertyName(property.name)?Common.UIString('Invalid property value'):Common.UIString('Unknown property name');return exclamationElement;}
static ignoreErrorsForProperty(property){function hasUnknownVendorPrefix(string){return!string.startsWith('-webkit-')&&/^[-_][\w\d]+-\w/.test(string);}
var name=property.name.toLowerCase();if(name.charAt(0)==='_')
return true;if(name==='filter')
return true;if(name.startsWith('scrollbar-'))
return true;if(hasUnknownVendorPrefix(name))
return true;var value=property.value.toLowerCase();if(value.endsWith('\\9'))
return true;if(hasUnknownVendorPrefix(value))
return true;return false;}
static createPropertyFilterElement(placeholder,container,filterCallback){var input=createElement('input');input.placeholder=placeholder;function searchHandler(){var regex=input.value?new RegExp(input.value.escapeForRegExp(),'i'):null;filterCallback(regex);container.classList.toggle('styles-filter-engaged',!!input.value);}
input.addEventListener('input',searchHandler,false);function keydownHandler(event){if(event.key!=='Escape'||!input.value)
return;event.consume(true);input.value='';searchHandler();}
input.addEventListener('keydown',keydownHandler,false);input.setFilterValue=setFilterValue;function setFilterValue(value){input.value=value;input.focus();searchHandler();}
return input;}
revealProperty(cssProperty){this._decorator=new Elements.StylePropertyHighlighter(this,cssProperty);this._decorator.perform();this.update();}
forceUpdate(){this._swatchPopoverHelper.hide();this._resetCache();this.update();}
_onAddButtonLongClick(event){var cssModel=this.cssModel();if(!cssModel)
return;var headers=cssModel.styleSheetHeaders().filter(styleSheetResourceHeader);var contextMenuDescriptors=[];for(var i=0;i<headers.length;++i){var header=headers[i];var handler=this._createNewRuleInStyleSheet.bind(this,header);contextMenuDescriptors.push({text:Bindings.displayNameForURL(header.resourceURL()),handler:handler});}
contextMenuDescriptors.sort(compareDescriptors);var contextMenu=new UI.ContextMenu(event);for(var i=0;i<contextMenuDescriptors.length;++i){var descriptor=contextMenuDescriptors[i];contextMenu.appendItem(descriptor.text,descriptor.handler);}
if(!contextMenu.isEmpty())
contextMenu.appendSeparator();contextMenu.appendItem('inspector-stylesheet',this._createNewRuleInViaInspectorStyleSheet.bind(this));contextMenu.show();function compareDescriptors(descriptor1,descriptor2){return String.naturalOrderComparator(descriptor1.text,descriptor2.text);}
function styleSheetResourceHeader(header){return!header.isViaInspector()&&!header.isInline&&!!header.resourceURL();}}
onFilterChanged(regex){this._filterRegex=regex;this._updateFilter();}
_refreshUpdate(editedSection){var node=this.node();if(!node)
return;var fullRefresh=Runtime.experiments.isEnabled('liveSASS');for(var section of this.allSections()){if(section.isBlank)
continue;section.update(fullRefresh||section===editedSection);}
if(this._filterRegex)
this._updateFilter();this._nodeStylesUpdatedForTest(node,false);}
doUpdate(){return this._fetchMatchedCascade().then(this._innerRebuildUpdate.bind(this));}
_resetCache(){if(this.cssModel())
this.cssModel().discardCachedMatchedCascade();}
_fetchMatchedCascade(){var node=this.node();if(!node||!this.cssModel())
return Promise.resolve((null));return this.cssModel().cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));function validateStyles(matchedStyles){return matchedStyles&&matchedStyles.node()===this.node()?matchedStyles:null;}}
setEditingStyle(editing){if(this._isEditingStyle===editing)
return;this.element.classList.toggle('is-editing-style',editing);this._isEditingStyle=editing;}
onCSSModelChanged(event){var edit=event&&event.data?(event.data.edit):null;if(edit){for(var section of this.allSections())
section._styleSheetEdited(edit);return;}
if(this._userOperation||this._isEditingStyle)
return;this._resetCache();this.update();}
_innerRebuildUpdate(matchedStyles){this._linkifier.reset();this._sectionsContainer.removeChildren();this._sectionBlocks=[];var node=this.node();if(!matchedStyles||!node)
return;this._sectionBlocks=this._rebuildSectionsForMatchedStyleRules(matchedStyles);var pseudoTypes=[];var keys=new Set(matchedStyles.pseudoStyles().keys());if(keys.delete(Protocol.DOM.PseudoType.Before))
pseudoTypes.push(Protocol.DOM.PseudoType.Before);pseudoTypes=pseudoTypes.concat(keys.valuesArray().sort());for(var pseudoType of pseudoTypes){var block=Elements.SectionBlock.createPseudoTypeBlock(pseudoType);var styles=(matchedStyles.pseudoStyles().get(pseudoType));for(var style of styles){var section=new Elements.StylePropertiesSection(this,matchedStyles,style);block.sections.push(section);}
this._sectionBlocks.push(block);}
for(var keyframesRule of matchedStyles.keyframes()){var block=Elements.SectionBlock.createKeyframesBlock(keyframesRule.name().text);for(var keyframe of keyframesRule.keyframes())
block.sections.push(new Elements.KeyframePropertiesSection(this,matchedStyles,keyframe.style));this._sectionBlocks.push(block);}
for(var block of this._sectionBlocks){var titleElement=block.titleElement();if(titleElement)
this._sectionsContainer.appendChild(titleElement);for(var section of block.sections)
this._sectionsContainer.appendChild(section.element);}
if(this._filterRegex)
this._updateFilter();this._nodeStylesUpdatedForTest(node,true);if(this._decorator){this._decorator.perform();this._decorator=null;}}
_nodeStylesUpdatedForTest(node,rebuild){}
_rebuildSectionsForMatchedStyleRules(matchedStyles){var blocks=[new Elements.SectionBlock(null)];var lastParentNode=null;for(var style of matchedStyles.nodeStyles()){var parentNode=matchedStyles.isInherited(style)?matchedStyles.nodeForStyle(style):null;if(parentNode&&parentNode!==lastParentNode){lastParentNode=parentNode;var block=Elements.SectionBlock.createInheritedNodeBlock(lastParentNode);blocks.push(block);}
var section=new Elements.StylePropertiesSection(this,matchedStyles,style);blocks.peekLast().sections.push(section);}
return blocks;}
_createNewRuleInViaInspectorStyleSheet(){var cssModel=this.cssModel();var node=this.node();if(!cssModel||!node)
return;this._userOperation=true;cssModel.requestViaInspectorStylesheet(node,onViaInspectorStyleSheet.bind(this));function onViaInspectorStyleSheet(styleSheetHeader){this._userOperation=false;this._createNewRuleInStyleSheet(styleSheetHeader);}}
_createNewRuleInStyleSheet(styleSheetHeader){if(!styleSheetHeader)
return;styleSheetHeader.requestContent().then(onStyleSheetContent.bind(this,styleSheetHeader.id));function onStyleSheetContent(styleSheetId,text){text=text||'';var lines=text.split('\n');var range=Common.TextRange.createFromLocation(lines.length-1,lines[lines.length-1].length);this._addBlankSection(this._sectionBlocks[0].sections[0],styleSheetId,range);}}
_addBlankSection(insertAfterSection,styleSheetId,ruleLocation){var node=this.node();var blankSection=new Elements.BlankStylePropertiesSection(this,insertAfterSection._matchedStyles,node?Components.DOMPresentationUtils.simpleSelector(node):'',styleSheetId,ruleLocation,insertAfterSection._style);this._sectionsContainer.insertBefore(blankSection.element,insertAfterSection.element.nextSibling);for(var block of this._sectionBlocks){var index=block.sections.indexOf(insertAfterSection);if(index===-1)
continue;block.sections.splice(index+1,0,blankSection);blankSection.startEditingSelector();}}
removeSection(section){for(var block of this._sectionBlocks){var index=block.sections.indexOf(section);if(index===-1)
continue;block.sections.splice(index,1);section.element.remove();}}
filterRegex(){return this._filterRegex;}
_updateFilter(){for(var block of this._sectionBlocks)
block.updateFilter();}
willHide(){this._swatchPopoverHelper.hide();super.willHide();}
allSections(){var sections=[];for(var block of this._sectionBlocks)
sections=sections.concat(block.sections);return sections;}
_clipboardCopy(event){Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleCopied);}};Elements.StylesSidebarPane._maxLinkLength=30;Elements.SectionBlock=class{constructor(titleElement){this._titleElement=titleElement;this.sections=[];}
static createPseudoTypeBlock(pseudoType){var separatorElement=createElement('div');separatorElement.className='sidebar-separator';separatorElement.textContent=Common.UIString('Pseudo ::%s element',pseudoType);return new Elements.SectionBlock(separatorElement);}
static createKeyframesBlock(keyframesName){var separatorElement=createElement('div');separatorElement.className='sidebar-separator';separatorElement.textContent=Common.UIString('@keyframes '+keyframesName);return new Elements.SectionBlock(separatorElement);}
static createInheritedNodeBlock(node){var separatorElement=createElement('div');separatorElement.className='sidebar-separator';var link=Components.DOMPresentationUtils.linkifyNodeReference(node);separatorElement.createTextChild(Common.UIString('Inherited from')+' ');separatorElement.appendChild(link);return new Elements.SectionBlock(separatorElement);}
updateFilter(){var hasAnyVisibleSection=false;for(var section of this.sections)
hasAnyVisibleSection|=section._updateFilter();if(this._titleElement)
this._titleElement.classList.toggle('hidden',!hasAnyVisibleSection);}
titleElement(){return this._titleElement;}};Elements.StylePropertiesSection=class{constructor(parentPane,matchedStyles,style){this._parentPane=parentPane;this._style=style;this._matchedStyles=matchedStyles;this.editable=!!(style.styleSheetId&&style.range);this._hoverTimer=null;this._afterUpdate=null;this._willCauseCancelEditing=false;var rule=style.parentRule;this.element=createElementWithClass('div','styles-section matched-styles monospace');this.element._section=this;this._titleElement=this.element.createChild('div','styles-section-title '+(rule?'styles-selector':''));this.propertiesTreeOutline=new UI.TreeOutlineInShadow();this.propertiesTreeOutline.registerRequiredCSS('elements/stylesSectionTree.css');this.propertiesTreeOutline.element.classList.add('style-properties','matched-styles','monospace');this.propertiesTreeOutline.section=this;this.element.appendChild(this.propertiesTreeOutline.element);var selectorContainer=createElement('div');this._selectorElement=createElementWithClass('span','selector');this._selectorElement.textContent=this._headerText();selectorContainer.appendChild(this._selectorElement);this._selectorElement.addEventListener('mouseenter',this._onMouseEnterSelector.bind(this),false);this._selectorElement.addEventListener('mouseleave',this._onMouseOutSelector.bind(this),false);var openBrace=createElement('span');openBrace.textContent=' {';selectorContainer.appendChild(openBrace);selectorContainer.addEventListener('mousedown',this._handleEmptySpaceMouseDown.bind(this),false);selectorContainer.addEventListener('click',this._handleSelectorContainerClick.bind(this),false);var closeBrace=this.element.createChild('div','sidebar-pane-closing-brace');closeBrace.textContent='}';this._createHoverMenuToolbar(closeBrace);this._selectorElement.addEventListener('click',this._handleSelectorClick.bind(this),false);this.element.addEventListener('mousedown',this._handleEmptySpaceMouseDown.bind(this),false);this.element.addEventListener('click',this._handleEmptySpaceClick.bind(this),false);this.element.addEventListener('mousemove',this._onMouseMove.bind(this),false);this.element.addEventListener('mouseleave',this._setSectionHovered.bind(this,false),false);if(rule){if(rule.isUserAgent()||rule.isInjected()){this.editable=false;}else{if(rule.styleSheetId){var header=rule.cssModel().styleSheetHeaderForId(rule.styleSheetId);this.navigable=!header.isAnonymousInlineStyleSheet();}}}
this._mediaListElement=this._titleElement.createChild('div','media-list media-matches');this._selectorRefElement=this._titleElement.createChild('div','styles-section-subtitle');this._updateMediaList();this._updateRuleOrigin();this._titleElement.appendChild(selectorContainer);this._selectorContainer=selectorContainer;if(this.navigable)
this.element.classList.add('navigable');if(!this.editable){this.element.classList.add('read-only');this.propertiesTreeOutline.element.classList.add('read-only');}
this._hoverableSelectorsMode=false;this._markSelectorMatches();this.onpopulate();}
static createRuleOriginNode(matchedStyles,linkifier,rule){if(!rule)
return createTextNode('');var ruleLocation;if(rule instanceof SDK.CSSStyleRule)
ruleLocation=rule.style.range;else if(rule instanceof SDK.CSSKeyframeRule)
ruleLocation=rule.key().range;var header=rule.styleSheetId?matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId):null;if(ruleLocation&&rule.styleSheetId&&header&&!header.isAnonymousInlineStyleSheet()){return Elements.StylePropertiesSection._linkifyRuleLocation(matchedStyles.cssModel(),linkifier,rule.styleSheetId,ruleLocation);}
if(rule.isUserAgent())
return createTextNode(Common.UIString('user agent stylesheet'));if(rule.isInjected())
return createTextNode(Common.UIString('injected stylesheet'));if(rule.isViaInspector())
return createTextNode(Common.UIString('via inspector'));if(header&&header.ownerNode){var link=Components.DOMPresentationUtils.linkifyDeferredNodeReference(header.ownerNode);link.textContent='<style>…</style>';return link;}
return createTextNode('');}
static _linkifyRuleLocation(cssModel,linkifier,styleSheetId,ruleLocation){var styleSheetHeader=cssModel.styleSheetHeaderForId(styleSheetId);var lineNumber=styleSheetHeader.lineNumberInSource(ruleLocation.startLine);var columnNumber=styleSheetHeader.columnNumberInSource(ruleLocation.startLine,ruleLocation.startColumn);var matchingSelectorLocation=new SDK.CSSLocation(styleSheetHeader,lineNumber,columnNumber);return linkifier.linkifyCSSLocation(matchingSelectorLocation);}
_setSectionHovered(isHovered){this.element.classList.toggle('styles-panel-hovered',isHovered);this.propertiesTreeOutline.element.classList.toggle('styles-panel-hovered',isHovered);if(this._hoverableSelectorsMode!==isHovered){this._hoverableSelectorsMode=isHovered;this._markSelectorMatches();}}
_onMouseMove(event){var hasCtrlOrMeta=UI.KeyboardShortcut.eventHasCtrlOrMeta((event));this._setSectionHovered(hasCtrlOrMeta);}
_createHoverMenuToolbar(container){if(!this.editable)
return;var items=[];var textShadowButton=new UI.ToolbarButton(Common.UIString('Add text-shadow'),'largeicon-text-shadow');textShadowButton.addEventListener(UI.ToolbarButton.Events.Click,this._onInsertShadowPropertyClick.bind(this,'text-shadow'));items.push(textShadowButton);var boxShadowButton=new UI.ToolbarButton(Common.UIString('Add box-shadow'),'largeicon-box-shadow');boxShadowButton.addEventListener(UI.ToolbarButton.Events.Click,this._onInsertShadowPropertyClick.bind(this,'box-shadow'));items.push(boxShadowButton);var colorButton=new UI.ToolbarButton(Common.UIString('Add color'),'largeicon-foreground-color');colorButton.addEventListener(UI.ToolbarButton.Events.Click,this._onInsertColorPropertyClick,this);items.push(colorButton);var backgroundButton=new UI.ToolbarButton(Common.UIString('Add background-color'),'largeicon-background-color');backgroundButton.addEventListener(UI.ToolbarButton.Events.Click,this._onInsertBackgroundColorPropertyClick,this);items.push(backgroundButton);var newRuleButton=null;if(this._style.parentRule){newRuleButton=new UI.ToolbarButton(Common.UIString('Insert Style Rule Below'),'largeicon-add');newRuleButton.addEventListener(UI.ToolbarButton.Events.Click,this._onNewRuleClick,this);items.push(newRuleButton);}
var sectionToolbar=new UI.Toolbar('sidebar-pane-section-toolbar',container);for(var i=0;i<items.length;++i)
sectionToolbar.appendToolbarItem(items[i]);var menuButton=new UI.ToolbarButton(Common.UIString('More tools\u2026'),'largeicon-menu');sectionToolbar.appendToolbarItem(menuButton);setItemsVisibility.call(this,items,false);sectionToolbar.element.addEventListener('mouseenter',setItemsVisibility.bind(this,items,true));sectionToolbar.element.addEventListener('mouseleave',setItemsVisibility.bind(this,items,false));function setItemsVisibility(items,value){for(var i=0;i<items.length;++i)
items[i].setVisible(value);menuButton.setVisible(!value);if(this._isSASSStyle())
newRuleButton.setVisible(false);}}
_isSASSStyle(){var header=this._style.styleSheetId?this._style.cssModel().styleSheetHeaderForId(this._style.styleSheetId):null;if(!header)
return false;var sourceMap=header.cssModel().sourceMapForHeader(header);return sourceMap?sourceMap.editable():false;}
style(){return this._style;}
_headerText(){var node=this._matchedStyles.nodeForStyle(this._style);if(this._style.type===SDK.CSSStyleDeclaration.Type.Inline)
return this._matchedStyles.isInherited(this._style)?Common.UIString('Style Attribute'):'element.style';if(this._style.type===SDK.CSSStyleDeclaration.Type.Attributes)
return node.nodeNameInCorrectCase()+'['+Common.UIString('Attributes Style')+']';return this._style.parentRule.selectorText();}
_onMouseOutSelector(){if(this._hoverTimer)
clearTimeout(this._hoverTimer);SDK.DOMModel.hideDOMNodeHighlight();}
_onMouseEnterSelector(){if(this._hoverTimer)
clearTimeout(this._hoverTimer);this._hoverTimer=setTimeout(this._highlight.bind(this),300);}
_highlight(){SDK.DOMModel.hideDOMNodeHighlight();var node=this._parentPane.node();var domModel=node.domModel();var selectors=this._style.parentRule?this._style.parentRule.selectorText():undefined;domModel.highlightDOMNodeWithConfig(node.id,{mode:'all',showInfo:undefined,selectors:selectors});}
firstSibling(){var parent=this.element.parentElement;if(!parent)
return null;var childElement=parent.firstChild;while(childElement){if(childElement._section)
return childElement._section;childElement=childElement.nextSibling;}
return null;}
lastSibling(){var parent=this.element.parentElement;if(!parent)
return null;var childElement=parent.lastChild;while(childElement){if(childElement._section)
return childElement._section;childElement=childElement.previousSibling;}
return null;}
nextSibling(){var curElement=this.element;do
curElement=curElement.nextSibling;while(curElement&&!curElement._section);return curElement?curElement._section:null;}
previousSibling(){var curElement=this.element;do
curElement=curElement.previousSibling;while(curElement&&!curElement._section);return curElement?curElement._section:null;}
_onNewRuleClick(event){event.data.consume();var rule=this._style.parentRule;var range=Common.TextRange.createFromLocation(rule.style.range.endLine,rule.style.range.endColumn+1);this._parentPane._addBlankSection(this,(rule.styleSheetId),range);}
_onInsertShadowPropertyClick(propertyName,event){event.data.consume(true);var treeElement=this.addNewBlankProperty();treeElement.property.name=propertyName;treeElement.property.value='0 0 black';treeElement.updateTitle();var shadowSwatchPopoverHelper=Elements.ShadowSwatchPopoverHelper.forTreeElement(treeElement);if(shadowSwatchPopoverHelper)
shadowSwatchPopoverHelper.showPopover();}
_onInsertColorPropertyClick(event){event.data.consume(true);var treeElement=this.addNewBlankProperty();treeElement.property.name='color';treeElement.property.value='black';treeElement.updateTitle();var colorSwatch=Elements.ColorSwatchPopoverIcon.forTreeElement(treeElement);if(colorSwatch)
colorSwatch.showPopover();}
_onInsertBackgroundColorPropertyClick(event){event.data.consume(true);var treeElement=this.addNewBlankProperty();treeElement.property.name='background-color';treeElement.property.value='white';treeElement.updateTitle();var colorSwatch=Elements.ColorSwatchPopoverIcon.forTreeElement(treeElement);if(colorSwatch)
colorSwatch.showPopover();}
_styleSheetEdited(edit){var rule=this._style.parentRule;if(rule)
rule.rebase(edit);else
this._style.rebase(edit);this._updateMediaList();this._updateRuleOrigin();}
_createMediaList(mediaRules){for(var i=mediaRules.length-1;i>=0;--i){var media=mediaRules[i];if(!media.text.includes('(')&&media.text!=='print')
continue;var mediaDataElement=this._mediaListElement.createChild('div','media');var mediaContainerElement=mediaDataElement.createChild('span');var mediaTextElement=mediaContainerElement.createChild('span','media-text');switch(media.source){case SDK.CSSMedia.Source.LINKED_SHEET:case SDK.CSSMedia.Source.INLINE_SHEET:mediaTextElement.textContent='media="'+media.text+'"';break;case SDK.CSSMedia.Source.MEDIA_RULE:var decoration=mediaContainerElement.createChild('span');mediaContainerElement.insertBefore(decoration,mediaTextElement);decoration.textContent='@media ';mediaTextElement.textContent=media.text;if(media.styleSheetId){mediaDataElement.classList.add('editable-media');mediaTextElement.addEventListener('click',this._handleMediaRuleClick.bind(this,media,mediaTextElement),false);}
break;case SDK.CSSMedia.Source.IMPORT_RULE:mediaTextElement.textContent='@import '+media.text;break;}}}
_updateMediaList(){this._mediaListElement.removeChildren();if(this._style.parentRule&&this._style.parentRule instanceof SDK.CSSStyleRule)
this._createMediaList(this._style.parentRule.media);}
isPropertyInherited(propertyName){if(this._matchedStyles.isInherited(this._style)){return!SDK.cssMetadata().isPropertyInherited(propertyName);}
return false;}
nextEditableSibling(){var curSection=this;do
curSection=curSection.nextSibling();while(curSection&&!curSection.editable);if(!curSection){curSection=this.firstSibling();while(curSection&&!curSection.editable)
curSection=curSection.nextSibling();}
return(curSection&&curSection.editable)?curSection:null;}
previousEditableSibling(){var curSection=this;do
curSection=curSection.previousSibling();while(curSection&&!curSection.editable);if(!curSection){curSection=this.lastSibling();while(curSection&&!curSection.editable)
curSection=curSection.previousSibling();}
return(curSection&&curSection.editable)?curSection:null;}
update(full){this._selectorElement.textContent=this._headerText();this._markSelectorMatches();if(full){this.propertiesTreeOutline.removeChildren();this.onpopulate();}else{var child=this.propertiesTreeOutline.firstChild();while(child){child.setOverloaded(this._isPropertyOverloaded(child.property));child=child.traverseNextTreeElement(false,null,true);}}
this.afterUpdate();}
afterUpdate(){if(this._afterUpdate){this._afterUpdate(this);this._afterUpdate=null;this._afterUpdateFinishedForTest();}}
_afterUpdateFinishedForTest(){}
onpopulate(){var style=this._style;for(var property of style.leadingProperties()){var isShorthand=!!style.longhandProperties(property.name).length;var inherited=this.isPropertyInherited(property.name);var overloaded=this._isPropertyOverloaded(property);var item=new Elements.StylePropertyTreeElement(this._parentPane,this._matchedStyles,property,isShorthand,inherited,overloaded);this.propertiesTreeOutline.appendChild(item);}}
_isPropertyOverloaded(property){return this._matchedStyles.propertyState(property)===SDK.CSSMatchedStyles.PropertyState.Overloaded;}
_updateFilter(){var hasMatchingChild=false;for(var child of this.propertiesTreeOutline.rootElement().children())
hasMatchingChild|=child._updateFilter();var regex=this._parentPane.filterRegex();var hideRule=!hasMatchingChild&&!!regex&&!regex.test(this.element.deepTextContent());this.element.classList.toggle('hidden',hideRule);if(!hideRule&&this._style.parentRule)
this._markSelectorHighlights();return!hideRule;}
_markSelectorMatches(){var rule=this._style.parentRule;if(!rule)
return;this._mediaListElement.classList.toggle('media-matches',this._matchedStyles.mediaMatches(this._style));var selectorTexts=rule.selectors.map(selector=>selector.text);var matchingSelectorIndexes=this._matchedStyles.matchingSelectors((rule));var matchingSelectors=(new Array(selectorTexts.length).fill(false));for(var matchingIndex of matchingSelectorIndexes)
matchingSelectors[matchingIndex]=true;if(this._parentPane._isEditingStyle)
return;var fragment=this._hoverableSelectorsMode?this._renderHoverableSelectors(selectorTexts,matchingSelectors):this._renderSimplifiedSelectors(selectorTexts,matchingSelectors);this._selectorElement.removeChildren();this._selectorElement.appendChild(fragment);this._markSelectorHighlights();}
_renderHoverableSelectors(selectors,matchingSelectors){var fragment=createDocumentFragment();for(var i=0;i<selectors.length;++i){if(i)
fragment.createTextChild(', ');fragment.appendChild(this._createSelectorElement(selectors[i],matchingSelectors[i],i));}
return fragment;}
_createSelectorElement(text,isMatching,navigationIndex){var element=createElementWithClass('span','simple-selector');element.classList.toggle('selector-matches',isMatching);if(typeof navigationIndex==='number')
element._selectorIndex=navigationIndex;element.textContent=text;return element;}
_renderSimplifiedSelectors(selectors,matchingSelectors){var fragment=createDocumentFragment();var currentMatching=false;var text='';for(var i=0;i<selectors.length;++i){if(currentMatching!==matchingSelectors[i]&&text){fragment.appendChild(this._createSelectorElement(text,currentMatching));text='';}
currentMatching=matchingSelectors[i];text+=selectors[i]+(i===selectors.length-1?'':', ');}
if(text)
fragment.appendChild(this._createSelectorElement(text,currentMatching));return fragment;}
_markSelectorHighlights(){var selectors=this._selectorElement.getElementsByClassName('simple-selector');var regex=this._parentPane.filterRegex();for(var i=0;i<selectors.length;++i){var selectorMatchesFilter=!!regex&&regex.test(selectors[i].textContent);selectors[i].classList.toggle('filter-match',selectorMatchesFilter);}}
_checkWillCancelEditing(){var willCauseCancelEditing=this._willCauseCancelEditing;this._willCauseCancelEditing=false;return willCauseCancelEditing;}
_handleSelectorContainerClick(event){if(this._checkWillCancelEditing()||!this.editable)
return;if(event.target===this._selectorContainer){this.addNewBlankProperty(0).startEditing();event.consume(true);}}
addNewBlankProperty(index){var property=this._style.newBlankProperty(index);var item=new Elements.StylePropertyTreeElement(this._parentPane,this._matchedStyles,property,false,false,false);index=property.index;this.propertiesTreeOutline.insertChild(item,index);item.listItemElement.textContent='';item._newProperty=true;item.updateTitle();return item;}
_handleEmptySpaceMouseDown(){this._willCauseCancelEditing=this._parentPane._isEditingStyle;}
_handleEmptySpaceClick(event){if(!this.editable)
return;var targetElement=event.deepElementFromPoint();if(targetElement&&!targetElement.isComponentSelectionCollapsed())
return;if(!event.target.isComponentSelectionCollapsed())
return;if(this.propertiesTreeOutline.element.shadowRoot.firstChild&&!this.propertiesTreeOutline.element.shadowRoot.firstChild.isComponentSelectionCollapsed())
return;if(this._checkWillCancelEditing())
return;if(event.target.classList.contains('header')||this.element.classList.contains('read-only')||event.target.enclosingNodeOrSelfWithClass('media')){event.consume();return;}
this.addNewBlankProperty().startEditing();event.consume(true);}
_handleMediaRuleClick(media,element,event){if(UI.isBeingEdited(element))
return;if(UI.KeyboardShortcut.eventHasCtrlOrMeta((event))&&this.navigable){var location=media.rawLocation();if(!location){event.consume(true);return;}
var uiLocation=Bindings.cssWorkspaceBinding.rawLocationToUILocation(location);if(uiLocation)
Common.Revealer.reveal(uiLocation);event.consume(true);return;}
if(!this.editable||this._isSASSStyle())
return;var config=new UI.InplaceEditor.Config(this._editingMediaCommitted.bind(this,media),this._editingMediaCancelled.bind(this,element),undefined,this._editingMediaBlurHandler.bind(this));UI.InplaceEditor.startEditing(element,config);element.getComponentSelection().selectAllChildren(element);this._parentPane.setEditingStyle(true);var parentMediaElement=element.enclosingNodeOrSelfWithClass('media');parentMediaElement.classList.add('editing-media');event.consume(true);}
_editingMediaFinished(element){this._parentPane.setEditingStyle(false);var parentMediaElement=element.enclosingNodeOrSelfWithClass('media');parentMediaElement.classList.remove('editing-media');}
_editingMediaCancelled(element){this._editingMediaFinished(element);this._markSelectorMatches();element.getComponentSelection().collapse(element,0);}
_editingMediaBlurHandler(editor,blurEvent){return true;}
_editingMediaCommitted(media,element,newContent,oldContent,context,moveDirection){this._parentPane.setEditingStyle(false);this._editingMediaFinished(element);if(newContent)
newContent=newContent.trim();function userCallback(success){if(success){this._matchedStyles.resetActiveProperties();this._parentPane._refreshUpdate(this);}
this._parentPane._userOperation=false;this._editingMediaTextCommittedForTest();}
this._parentPane._userOperation=true;this._parentPane.cssModel().setMediaText(media.styleSheetId,media.range,newContent).then(userCallback.bind(this));}
_editingMediaTextCommittedForTest(){}
_handleSelectorClick(event){if(UI.KeyboardShortcut.eventHasCtrlOrMeta((event))&&this.navigable&&event.target.classList.contains('simple-selector')){this._navigateToSelectorSource(event.target._selectorIndex,true);event.consume(true);return;}
this._startEditingOnMouseEvent();event.consume(true);}
_navigateToSelectorSource(index,focus){var cssModel=this._parentPane.cssModel();var rule=this._style.parentRule;var header=cssModel.styleSheetHeaderForId((rule.styleSheetId));if(!header)
return;var rawLocation=new SDK.CSSLocation(header,rule.lineNumberInSource(index),rule.columnNumberInSource(index));var uiLocation=Bindings.cssWorkspaceBinding.rawLocationToUILocation(rawLocation);if(uiLocation)
Common.Revealer.reveal(uiLocation,!focus);}
_startEditingOnMouseEvent(){if(!this.editable||this._isSASSStyle())
return;var rule=this._style.parentRule;if(!rule&&!this.propertiesTreeOutline.rootElement().childCount()){this.addNewBlankProperty().startEditing();return;}
if(!rule)
return;this.startEditingSelector();}
startEditingSelector(){var element=this._selectorElement;if(UI.isBeingEdited(element))
return;element.scrollIntoViewIfNeeded(false);element.textContent=element.textContent;var config=new UI.InplaceEditor.Config(this.editingSelectorCommitted.bind(this),this.editingSelectorCancelled.bind(this));UI.InplaceEditor.startEditing(this._selectorElement,config);element.getComponentSelection().selectAllChildren(element);this._parentPane.setEditingStyle(true);if(element.classList.contains('simple-selector'))
this._navigateToSelectorSource(0,false);}
_moveEditorFromSelector(moveDirection){this._markSelectorMatches();if(!moveDirection)
return;if(moveDirection==='forward'){var firstChild=this.propertiesTreeOutline.firstChild();while(firstChild&&firstChild.inherited())
firstChild=firstChild.nextSibling;if(!firstChild)
this.addNewBlankProperty().startEditing();else
firstChild.startEditing(firstChild.nameElement);}else{var previousSection=this.previousEditableSibling();if(!previousSection)
return;previousSection.addNewBlankProperty().startEditing();}}
editingSelectorCommitted(element,newContent,oldContent,context,moveDirection){this._editingSelectorEnded();if(newContent)
newContent=newContent.trim();if(newContent===oldContent){this._selectorElement.textContent=newContent;this._moveEditorFromSelector(moveDirection);return;}
var rule=this._style.parentRule;if(!rule)
return;function headerTextCommitted(){this._parentPane._userOperation=false;this._moveEditorFromSelector(moveDirection);this._editingSelectorCommittedForTest();}
this._parentPane._userOperation=true;this._setHeaderText(rule,newContent).then(headerTextCommitted.bind(this));}
_setHeaderText(rule,newContent){function onSelectorsUpdated(rule,success){if(!success)
return Promise.resolve();return this._matchedStyles.recomputeMatchingSelectors(rule).then(updateSourceRanges.bind(this,rule));}
function updateSourceRanges(rule){var doesAffectSelectedNode=this._matchedStyles.matchingSelectors(rule).length>0;this.propertiesTreeOutline.element.classList.toggle('no-affect',!doesAffectSelectedNode);this._matchedStyles.resetActiveProperties();this._parentPane._refreshUpdate(this);}
console.assert(rule instanceof SDK.CSSStyleRule);var oldSelectorRange=rule.selectorRange();if(!oldSelectorRange)
return Promise.resolve();return rule.setSelectorText(newContent).then(onSelectorsUpdated.bind(this,(rule),oldSelectorRange));}
_editingSelectorCommittedForTest(){}
_updateRuleOrigin(){this._selectorRefElement.removeChildren();this._selectorRefElement.appendChild(Elements.StylePropertiesSection.createRuleOriginNode(this._matchedStyles,this._parentPane._linkifier,this._style.parentRule));}
_editingSelectorEnded(){this._parentPane.setEditingStyle(false);}
editingSelectorCancelled(){this._editingSelectorEnded();this._markSelectorMatches();}};Elements.BlankStylePropertiesSection=class extends Elements.StylePropertiesSection{constructor(stylesPane,matchedStyles,defaultSelectorText,styleSheetId,ruleLocation,insertAfterStyle){var cssModel=(stylesPane.cssModel());var rule=SDK.CSSStyleRule.createDummyRule(cssModel,defaultSelectorText);super(stylesPane,matchedStyles,rule.style);this._normal=false;this._ruleLocation=ruleLocation;this._styleSheetId=styleSheetId;this._selectorRefElement.removeChildren();this._selectorRefElement.appendChild(Elements.StylePropertiesSection._linkifyRuleLocation(cssModel,this._parentPane._linkifier,styleSheetId,this._actualRuleLocation()));if(insertAfterStyle&&insertAfterStyle.parentRule)
this._createMediaList(insertAfterStyle.parentRule.media);this.element.classList.add('blank-section');}
_actualRuleLocation(){var prefix=this._rulePrefix();var lines=prefix.split('\n');var editRange=new Common.TextRange(0,0,lines.length-1,lines.peekLast().length);return this._ruleLocation.rebaseAfterTextEdit(Common.TextRange.createFromLocation(0,0),editRange);}
_rulePrefix(){return this._ruleLocation.startLine===0&&this._ruleLocation.startColumn===0?'':'\n\n';}
get isBlank(){return!this._normal;}
editingSelectorCommitted(element,newContent,oldContent,context,moveDirection){if(!this.isBlank){super.editingSelectorCommitted(element,newContent,oldContent,context,moveDirection);return;}
function onRuleAdded(newRule){if(!newRule){this.editingSelectorCancelled();this._editingSelectorCommittedForTest();return Promise.resolve();}
return this._matchedStyles.addNewRule(newRule,this._matchedStyles.node()).then(onAddedToCascade.bind(this,newRule));}
function onAddedToCascade(newRule){var doesSelectorAffectSelectedNode=this._matchedStyles.matchingSelectors(newRule).length>0;this._makeNormal(newRule);if(!doesSelectorAffectSelectedNode)
this.propertiesTreeOutline.element.classList.add('no-affect');this._updateRuleOrigin();if(this.element.parentElement)
this._moveEditorFromSelector(moveDirection);this._parentPane._userOperation=false;this._editingSelectorEnded();this._markSelectorMatches();this._editingSelectorCommittedForTest();}
if(newContent)
newContent=newContent.trim();this._parentPane._userOperation=true;var cssModel=this._parentPane.cssModel();var ruleText=this._rulePrefix()+newContent+' {}';cssModel.addRule(this._styleSheetId,ruleText,this._ruleLocation).then(onRuleAdded.bind(this));}
editingSelectorCancelled(){this._parentPane._userOperation=false;if(!this.isBlank){super.editingSelectorCancelled();return;}
this._editingSelectorEnded();this._parentPane.removeSection(this);}
_makeNormal(newRule){this.element.classList.remove('blank-section');this._style=newRule.style;this._normal=true;}};Elements.KeyframePropertiesSection=class extends Elements.StylePropertiesSection{constructor(stylesPane,matchedStyles,style){super(stylesPane,matchedStyles,style);this._selectorElement.className='keyframe-key';}
_headerText(){return this._style.parentRule.key().text;}
_setHeaderText(rule,newContent){function updateSourceRanges(success){if(!success)
return;this._parentPane._refreshUpdate(this);}
console.assert(rule instanceof SDK.CSSKeyframeRule);var oldRange=rule.key().range;if(!oldRange)
return Promise.resolve();return rule.setKeyText(newContent).then(updateSourceRanges.bind(this));}
isPropertyInherited(propertyName){return false;}
_isPropertyOverloaded(property){return false;}
_markSelectorHighlights(){}
_markSelectorMatches(){this._selectorElement.textContent=this._style.parentRule.key().text;}
_highlight(){}};Elements.StylePropertyTreeElement=class extends UI.TreeElement{constructor(stylesPane,matchedStyles,property,isShorthand,inherited,overloaded){super('',isShorthand);this._style=property.ownerStyle;this._matchedStyles=matchedStyles;this.property=property;this._inherited=inherited;this._overloaded=overloaded;this.selectable=false;this._parentPane=stylesPane;this.isShorthand=isShorthand;this._applyStyleThrottler=new Common.Throttler(0);this._newProperty=false;this._expandedDueToFilter=false;this.valueElement=null;this.nameElement=null;this._expandElement=null;this._originalPropertyText='';this._prompt=null;this._propertyHasBeenEditedIncrementally=false;}
_editable(){return!!(this._style.styleSheetId&&this._style.range);}
inherited(){return this._inherited;}
overloaded(){return this._overloaded;}
setOverloaded(x){if(x===this._overloaded)
return;this._overloaded=x;this._updateState();}
get name(){return this.property.name;}
get value(){return this.property.value;}
_updateFilter(){var regex=this._parentPane.filterRegex();var matches=!!regex&&(regex.test(this.property.name)||regex.test(this.property.value));this.listItemElement.classList.toggle('filter-match',matches);this.onpopulate();var hasMatchingChildren=false;for(var i=0;i<this.childCount();++i)
hasMatchingChildren|=this.childAt(i)._updateFilter();if(!regex){if(this._expandedDueToFilter)
this.collapse();this._expandedDueToFilter=false;}else if(hasMatchingChildren&&!this.expanded){this.expand();this._expandedDueToFilter=true;}else if(!hasMatchingChildren&&this.expanded&&this._expandedDueToFilter){this.collapse();this._expandedDueToFilter=false;}
return matches;}
_processColor(text){var color=Common.Color.parse(text);if(!color)
return createTextNode(text);if(!this._editable()){var swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);return swatch;}
var swatchPopoverHelper=this._parentPane._swatchPopoverHelper;var swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);swatch.setFormat(Common.Color.detectColorFormat(swatch.color()));var swatchIcon=new Elements.ColorSwatchPopoverIcon(this,swatchPopoverHelper,swatch);function computedCallback(backgroundColors){if(!backgroundColors||!backgroundColors.length)
return;var bgColorText=backgroundColors[0];var bgColor=Common.Color.parse(bgColorText);if(!bgColor)
return;if(bgColor.hasAlpha){var blendedRGBA=[];Common.Color.blendColors(bgColor.rgba(),color.rgba(),blendedRGBA);bgColor=new Common.Color(blendedRGBA,Common.Color.Format.RGBA);}
swatchIcon.setContrastColor(bgColor);}
if(Runtime.experiments.isEnabled('colorContrastRatio')&&this.property.name==='color'&&this._parentPane.cssModel()&&this.node()){var cssModel=this._parentPane.cssModel();cssModel.backgroundColorsPromise(this.node().id).then(computedCallback);}
return swatch;}
renderedPropertyText(){return this.nameElement.textContent+': '+this.valueElement.textContent;}
_processBezier(text){if(!this._editable()||!UI.Geometry.CubicBezier.parse(text))
return createTextNode(text);var swatchPopoverHelper=this._parentPane._swatchPopoverHelper;var swatch=InlineEditor.BezierSwatch.create();swatch.setBezierText(text);new Elements.BezierPopoverIcon(this,swatchPopoverHelper,swatch);return swatch;}
_processShadow(propertyValue,propertyName){if(!this._editable())
return createTextNode(propertyValue);var shadows;if(propertyName==='text-shadow')
shadows=InlineEditor.CSSShadowModel.parseTextShadow(propertyValue);else
shadows=InlineEditor.CSSShadowModel.parseBoxShadow(propertyValue);if(!shadows.length)
return createTextNode(propertyValue);var container=createDocumentFragment();var swatchPopoverHelper=this._parentPane._swatchPopoverHelper;for(var i=0;i<shadows.length;i++){if(i!==0)
container.appendChild(createTextNode(', '));var cssShadowSwatch=InlineEditor.CSSShadowSwatch.create();cssShadowSwatch.setCSSShadow(shadows[i]);new Elements.ShadowSwatchPopoverHelper(this,swatchPopoverHelper,cssShadowSwatch);var colorSwatch=cssShadowSwatch.colorSwatch();if(colorSwatch)
new Elements.ColorSwatchPopoverIcon(this,swatchPopoverHelper,colorSwatch);container.appendChild(cssShadowSwatch);}
return container;}
_updateState(){if(!this.listItemElement)
return;if(this._style.isPropertyImplicit(this.name))
this.listItemElement.classList.add('implicit');else
this.listItemElement.classList.remove('implicit');var hasIgnorableError=!this.property.parsedOk&&Elements.StylesSidebarPane.ignoreErrorsForProperty(this.property);if(hasIgnorableError)
this.listItemElement.classList.add('has-ignorable-error');else
this.listItemElement.classList.remove('has-ignorable-error');if(this.inherited())
this.listItemElement.classList.add('inherited');else
this.listItemElement.classList.remove('inherited');if(this.overloaded())
this.listItemElement.classList.add('overloaded');else
this.listItemElement.classList.remove('overloaded');if(this.property.disabled)
this.listItemElement.classList.add('disabled');else
this.listItemElement.classList.remove('disabled');}
node(){return this._parentPane.node();}
parentPane(){return this._parentPane;}
section(){return this.treeOutline&&this.treeOutline.section;}
_updatePane(){var section=this.section();if(section&&section._parentPane)
section._parentPane._refreshUpdate(section);}
_toggleEnabled(event){var disabled=!event.target.checked;var oldStyleRange=this._style.range;if(!oldStyleRange)
return;function callback(success){this._parentPane._userOperation=false;if(!success)
return;this._matchedStyles.resetActiveProperties();this._updatePane();this.styleTextAppliedForTest();}
event.consume();this._parentPane._userOperation=true;this.property.setDisabled(disabled).then(callback.bind(this));}
onpopulate(){if(this.childCount()||!this.isShorthand)
return;var longhandProperties=this._style.longhandProperties(this.name);for(var i=0;i<longhandProperties.length;++i){var name=longhandProperties[i].name;var inherited=false;var overloaded=false;var section=this.section();if(section){inherited=section.isPropertyInherited(name);overloaded=this._matchedStyles.propertyState(longhandProperties[i])===SDK.CSSMatchedStyles.PropertyState.Overloaded;}
var item=new Elements.StylePropertyTreeElement(this._parentPane,this._matchedStyles,longhandProperties[i],false,inherited,overloaded);this.appendChild(item);}}
onattach(){this.updateTitle();this.listItemElement.addEventListener('mousedown',this._mouseDown.bind(this));this.listItemElement.addEventListener('mouseup',this._resetMouseDownElement.bind(this));this.listItemElement.addEventListener('click',this._mouseClick.bind(this));}
_mouseDown(event){if(this._parentPane){this._parentPane._mouseDownTreeElement=this;this._parentPane._mouseDownTreeElementIsName=this.nameElement&&this.nameElement.isSelfOrAncestor(event.target);this._parentPane._mouseDownTreeElementIsValue=this.valueElement&&this.valueElement.isSelfOrAncestor(event.target);}}
_resetMouseDownElement(){if(this._parentPane){this._parentPane._mouseDownTreeElement=null;this._parentPane._mouseDownTreeElementIsName=false;this._parentPane._mouseDownTreeElementIsValue=false;}}
onexpand(){this._updateExpandElement();}
oncollapse(){this._updateExpandElement();}
_updateExpandElement(){if(this.expanded)
this._expandElement.setIconType('smallicon-triangle-down');else
this._expandElement.setIconType('smallicon-triangle-right');}
updateTitle(){this._updateState();this._expandElement=UI.Icon.create('smallicon-triangle-right','expand-icon');var propertyRenderer=new Elements.StylesSidebarPropertyRenderer(this._style.parentRule,this.node(),this.name,this.value);if(this.property.parsedOk){propertyRenderer.setColorHandler(this._processColor.bind(this));propertyRenderer.setBezierHandler(this._processBezier.bind(this));propertyRenderer.setShadowHandler(this._processShadow.bind(this));}
this.listItemElement.removeChildren();this.nameElement=propertyRenderer.renderName();this.valueElement=propertyRenderer.renderValue();if(!this.treeOutline)
return;var indent=Common.moduleSetting('textEditorIndent').get();this.listItemElement.createChild('span','styles-clipboard-only').createTextChild(indent+(this.property.disabled?'/* ':''));this.listItemElement.appendChild(this.nameElement);this.listItemElement.createTextChild(': ');this.listItemElement.appendChild(this._expandElement);this.listItemElement.appendChild(this.valueElement);this.listItemElement.createTextChild(';');if(this.property.disabled)
this.listItemElement.createChild('span','styles-clipboard-only').createTextChild(' */');if(!this.property.parsedOk){this.listItemElement.classList.add('not-parsed-ok');this.listItemElement.insertBefore(Elements.StylesSidebarPane.createExclamationMark(this.property),this.listItemElement.firstChild);}
if(!this.property.activeInStyle())
this.listItemElement.classList.add('inactive');this._updateFilter();if(this.property.parsedOk&&this.section()&&this.parent.root){var enabledCheckboxElement=createElement('input');enabledCheckboxElement.className='enabled-button';enabledCheckboxElement.type='checkbox';enabledCheckboxElement.checked=!this.property.disabled;enabledCheckboxElement.addEventListener('click',this._toggleEnabled.bind(this),false);this.listItemElement.insertBefore(enabledCheckboxElement,this.listItemElement.firstChild);}}
_mouseClick(event){if(!event.target.isComponentSelectionCollapsed())
return;event.consume(true);if(event.target===this.listItemElement){var section=this.section();if(!section||!section.editable)
return;if(section._checkWillCancelEditing())
return;section.addNewBlankProperty(this.property.index+1).startEditing();return;}
if(UI.KeyboardShortcut.eventHasCtrlOrMeta((event))&&this.section().navigable){this._navigateToSource((event.target));return;}
this.startEditing((event.target));}
_navigateToSource(element,omitFocus){if(!this.section().navigable)
return;var propertyNameClicked=element===this.nameElement;var uiLocation=Bindings.cssWorkspaceBinding.propertyUILocation(this.property,propertyNameClicked);if(uiLocation)
Common.Revealer.reveal(uiLocation,omitFocus);}
startEditing(selectElement){if(this.parent.isShorthand)
return;if(selectElement===this._expandElement)
return;var section=this.section();if(section&&!section.editable)
return;if(selectElement){selectElement=selectElement.enclosingNodeOrSelfWithClass('webkit-css-property')||selectElement.enclosingNodeOrSelfWithClass('value');}
if(!selectElement)
selectElement=this.nameElement;if(UI.isBeingEdited(selectElement))
return;var isEditingName=selectElement===this.nameElement;if(!isEditingName)
this.valueElement.textContent=restoreURLs(this.valueElement.textContent,this.value);function restoreURLs(fieldValue,modelValue){const urlRegex=/\b(url\([^)]*\))/g;var splitFieldValue=fieldValue.split(urlRegex);if(splitFieldValue.length===1)
return fieldValue;var modelUrlRegex=new RegExp(urlRegex);for(var i=1;i<splitFieldValue.length;i+=2){var match=modelUrlRegex.exec(modelValue);if(match)
splitFieldValue[i]=match[0];}
return splitFieldValue.join('');}
var context={expanded:this.expanded,hasChildren:this.isExpandable(),isEditingName:isEditingName,previousContent:selectElement.textContent};this.setExpandable(false);if(selectElement.parentElement)
selectElement.parentElement.classList.add('child-editing');selectElement.textContent=selectElement.textContent;function pasteHandler(context,event){var data=event.clipboardData.getData('Text');if(!data)
return;var colonIdx=data.indexOf(':');if(colonIdx<0)
return;var name=data.substring(0,colonIdx).trim();var value=data.substring(colonIdx+1).trim();event.preventDefault();if(!('originalName'in context)){context.originalName=this.nameElement.textContent;context.originalValue=this.valueElement.textContent;}
this.property.name=name;this.property.value=value;this.nameElement.textContent=name;this.valueElement.textContent=value;this.nameElement.normalize();this.valueElement.normalize();this._editingCommitted(event.target.textContent,context,'forward');}
function blurListener(context,event){var treeElement=this._parentPane._mouseDownTreeElement;var moveDirection='';if(treeElement===this){if(isEditingName&&this._parentPane._mouseDownTreeElementIsValue)
moveDirection='forward';if(!isEditingName&&this._parentPane._mouseDownTreeElementIsName)
moveDirection='backward';}
var text=event.target.textContent;if(!context.isEditingName)
text=this.value||text;this._editingCommitted(text,context,moveDirection);}
this._originalPropertyText=this.property.propertyText;this._parentPane.setEditingStyle(true);if(selectElement.parentElement)
selectElement.parentElement.scrollIntoViewIfNeeded(false);var cssCompletions=[];if(isEditingName){cssCompletions=SDK.cssMetadata().allProperties();cssCompletions=cssCompletions.filter(property=>SDK.cssMetadata().isSVGProperty(property)===this.node().isSVGNode());}else{cssCompletions=SDK.cssMetadata().propertyValues(this.nameElement.textContent);}
var cssVariables=this._matchedStyles.cssVariables().sort(String.naturalOrderComparator);this._prompt=new Elements.StylesSidebarPane.CSSPropertyPrompt(cssCompletions,cssVariables,this,isEditingName);this._prompt.setAutocompletionTimeout(0);if(!isEditingName&&(!this._parentPane.node().pseudoType()||this.name!=='content'))
this._prompt.on(UI.TextPrompt.TextChangedEvent,this._applyFreeFlowStyleTextEdit.bind(this));var proxyElement=this._prompt.attachAndStartEditing(selectElement,blurListener.bind(this,context));this._navigateToSource(selectElement,true);proxyElement.addEventListener('keydown',this._editingNameValueKeyDown.bind(this,context),false);proxyElement.addEventListener('keypress',this._editingNameValueKeyPress.bind(this,context),false);if(isEditingName)
proxyElement.addEventListener('paste',pasteHandler.bind(this,context),false);selectElement.getComponentSelection().selectAllChildren(selectElement);}
_editingNameValueKeyDown(context,event){if(event.handled)
return;var result;if(isEnterKey(event)){event.preventDefault();result='forward';}else if(event.keyCode===UI.KeyboardShortcut.Keys.Esc.code||event.key==='Escape'){result='cancel';}else if(!context.isEditingName&&this._newProperty&&event.keyCode===UI.KeyboardShortcut.Keys.Backspace.code){var selection=event.target.getComponentSelection();if(selection.isCollapsed&&!selection.focusOffset){event.preventDefault();result='backward';}}else if(event.key==='Tab'){result=event.shiftKey?'backward':'forward';event.preventDefault();}
if(result){switch(result){case'cancel':this.editingCancelled(null,context);break;case'forward':case'backward':this._editingCommitted(event.target.textContent,context,result);break;}
event.consume();return;}}
_editingNameValueKeyPress(context,event){function shouldCommitValueSemicolon(text,cursorPosition){var openQuote='';for(var i=0;i<cursorPosition;++i){var ch=text[i];if(ch==='\\'&&openQuote!=='')
++i;else if(!openQuote&&(ch==='"'||ch==='\''))
openQuote=ch;else if(openQuote===ch)
openQuote='';}
return!openQuote;}
var keyChar=String.fromCharCode(event.charCode);var isFieldInputTerminated=(context.isEditingName?keyChar===':':keyChar===';'&&shouldCommitValueSemicolon(event.target.textContent,event.target.selectionLeftOffset()));if(isFieldInputTerminated){event.consume(true);this._editingCommitted(event.target.textContent,context,'forward');return;}}
_applyFreeFlowStyleTextEdit(){var valueText=this._prompt.textWithCurrentSuggestion();if(valueText.indexOf(';')===-1)
this.applyStyleText(this.nameElement.textContent+': '+valueText,false);}
kickFreeFlowStyleEditForTest(){this._applyFreeFlowStyleTextEdit();}
editingEnded(context){this._resetMouseDownElement();this.setExpandable(context.hasChildren);if(context.expanded)
this.expand();var editedElement=context.isEditingName?this.nameElement:this.valueElement;if(editedElement.parentElement)
editedElement.parentElement.classList.remove('child-editing');this._parentPane.setEditingStyle(false);}
editingCancelled(element,context){this._removePrompt();this._revertStyleUponEditingCanceled();this.editingEnded(context);}
_revertStyleUponEditingCanceled(){if(this._propertyHasBeenEditedIncrementally){this.applyStyleText(this._originalPropertyText,false);this._originalPropertyText='';}else if(this._newProperty){this.treeOutline.removeChild(this);}else{this.updateTitle();}}
_findSibling(moveDirection){var target=this;do
target=(moveDirection==='forward'?target.nextSibling:target.previousSibling);while(target&&target.inherited());return target;}
_editingCommitted(userInput,context,moveDirection){this._removePrompt();this.editingEnded(context);var isEditingName=context.isEditingName;var createNewProperty,moveToSelector;var isDataPasted='originalName'in context;var isDirtyViaPaste=isDataPasted&&(this.nameElement.textContent!==context.originalName||this.valueElement.textContent!==context.originalValue);var isPropertySplitPaste=isDataPasted&&isEditingName&&this.valueElement.textContent!==context.originalValue;var moveTo=this;var moveToOther=(isEditingName^(moveDirection==='forward'));var abandonNewProperty=this._newProperty&&!userInput&&(moveToOther||isEditingName);if(moveDirection==='forward'&&(!isEditingName||isPropertySplitPaste)||moveDirection==='backward'&&isEditingName){moveTo=moveTo._findSibling(moveDirection);if(!moveTo){if(moveDirection==='forward'&&(!this._newProperty||userInput))
createNewProperty=true;else if(moveDirection==='backward')
moveToSelector=true;}}
var moveToIndex=moveTo&&this.treeOutline?this.treeOutline.rootElement().indexOfChild(moveTo):-1;var blankInput=userInput.isWhitespace();var shouldCommitNewProperty=this._newProperty&&(isPropertySplitPaste||moveToOther||(!moveDirection&&!isEditingName)||(isEditingName&&blankInput));var section=(this.section());if(((userInput!==context.previousContent||isDirtyViaPaste)&&!this._newProperty)||shouldCommitNewProperty){section._afterUpdate=moveToNextCallback.bind(this,this._newProperty,!blankInput,section);var propertyText;if(blankInput||(this._newProperty&&this.valueElement.textContent.isWhitespace())){propertyText='';}else{if(isEditingName)
propertyText=userInput+': '+this.property.value;else
propertyText=this.property.name+': '+userInput;}
this.applyStyleText(propertyText,true);}else{if(isEditingName)
this.property.name=userInput;else
this.property.value=userInput;if(!isDataPasted&&!this._newProperty)
this.updateTitle();moveToNextCallback.call(this,this._newProperty,false,section);}
function moveToNextCallback(alreadyNew,valueChanged,section){if(!moveDirection)
return;if(moveTo&&moveTo.parent){moveTo.startEditing(!isEditingName?moveTo.nameElement:moveTo.valueElement);return;}
if(moveTo&&!moveTo.parent){var rootElement=section.propertiesTreeOutline.rootElement();if(moveDirection==='forward'&&blankInput&&!isEditingName)
--moveToIndex;if(moveToIndex>=rootElement.childCount()&&!this._newProperty){createNewProperty=true;}else{var treeElement=moveToIndex>=0?rootElement.childAt(moveToIndex):null;if(treeElement){var elementToEdit=!isEditingName||isPropertySplitPaste?treeElement.nameElement:treeElement.valueElement;if(alreadyNew&&blankInput)
elementToEdit=moveDirection==='forward'?treeElement.nameElement:treeElement.valueElement;treeElement.startEditing(elementToEdit);return;}else if(!alreadyNew){moveToSelector=true;}}}
if(createNewProperty){if(alreadyNew&&!valueChanged&&(isEditingName^(moveDirection==='backward')))
return;section.addNewBlankProperty().startEditing();return;}
if(abandonNewProperty){moveTo=this._findSibling(moveDirection);var sectionToEdit=(moveTo||moveDirection==='backward')?section:section.nextEditableSibling();if(sectionToEdit){if(sectionToEdit.style().parentRule)
sectionToEdit.startEditingSelector();else
sectionToEdit._moveEditorFromSelector(moveDirection);}
return;}
if(moveToSelector){if(section.style().parentRule)
section.startEditingSelector();else
section._moveEditorFromSelector(moveDirection);}}}
_removePrompt(){if(this._prompt){this._prompt.detach();this._prompt=null;}}
styleTextAppliedForTest(){}
applyStyleText(styleText,majorChange){this._applyStyleThrottler.schedule(this._innerApplyStyleText.bind(this,styleText,majorChange));}
_innerApplyStyleText(styleText,majorChange){if(!this.treeOutline)
return Promise.resolve();var oldStyleRange=this._style.range;if(!oldStyleRange)
return Promise.resolve();styleText=styleText.replace(/\s/g,' ').trim();if(!styleText.length&&majorChange&&this._newProperty&&!this._propertyHasBeenEditedIncrementally){var section=this.section();this.parent.removeChild(this);section.afterUpdate();return Promise.resolve();}
var currentNode=this._parentPane.node();this._parentPane._userOperation=true;function callback(success){this._parentPane._userOperation=false;if(!success){if(majorChange){this._revertStyleUponEditingCanceled();}
this.styleTextAppliedForTest();return;}
this._matchedStyles.resetActiveProperties();this._propertyHasBeenEditedIncrementally=true;this.property=this._style.propertyAt(this.property.index);if(!this._parentPane._isEditingStyle&&currentNode===this.node())
this._updatePane();this.styleTextAppliedForTest();}
if(styleText.length&&!/;\s*$/.test(styleText))
styleText+=';';var overwriteProperty=!this._newProperty||this._propertyHasBeenEditedIncrementally;return this.property.setText(styleText,majorChange,overwriteProperty).then(callback.bind(this));}
ondblclick(){return true;}
isEventWithinDisclosureTriangle(event){return event.target===this._expandElement;}};Elements.StylePropertyTreeElement.Context;Elements.StylesSidebarPane.CSSPropertyPrompt=class extends UI.TextPrompt{constructor(cssCompletions,cssVariables,treeElement,isEditingName){super();this.initialize(this._buildPropertyCompletions.bind(this),UI.StyleValueDelimiters);this._cssCompletions=cssCompletions;this._cssVariables=cssVariables;this._treeElement=treeElement;this._isEditingName=isEditingName;if(!isEditingName){this.disableDefaultSuggestionForEmptyInput();if(treeElement&&treeElement.valueElement){var cssValueText=treeElement.valueElement.textContent;if(cssValueText.match(/#[\da-f]{3,6}$/i)){this.setTitle(Common.UIString('Increment/decrement with mousewheel or up/down keys. %s: R ±1, Shift: G ±1, Alt: B ±1',Host.isMac()?'Cmd':'Ctrl'));}else if(cssValueText.match(/\d+/)){this.setTitle(Common.UIString('Increment/decrement with mousewheel or up/down keys. %s: ±100, Shift: ±10, Alt: ±0.1',Host.isMac()?'Cmd':'Ctrl'));}}}}
onKeyDown(event){switch(event.key){case'ArrowUp':case'ArrowDown':case'PageUp':case'PageDown':if(this._handleNameOrValueUpDown(event)){event.preventDefault();return;}
break;case'Enter':if(this.textWithCurrentSuggestion()!==this.text()){this.tabKeyPressed();return;}
break;}
super.onKeyDown(event);}
onMouseWheel(event){if(this._handleNameOrValueUpDown(event)){event.consume(true);return;}
super.onMouseWheel(event);}
tabKeyPressed(){this.acceptAutoComplete();return false;}
_handleNameOrValueUpDown(event){function finishHandler(originalValue,replacementString){this._treeElement.applyStyleText(this._treeElement.nameElement.textContent+': '+this._treeElement.valueElement.textContent,false);}
function customNumberHandler(prefix,number,suffix){if(number!==0&&!suffix.length&&SDK.cssMetadata().isLengthProperty(this._treeElement.property.name))
suffix='px';return prefix+number+suffix;}
if(!this._isEditingName&&this._treeElement.valueElement&&UI.handleElementValueModifications(event,this._treeElement.valueElement,finishHandler.bind(this),this._isValueSuggestion.bind(this),customNumberHandler.bind(this)))
return true;return false;}
_isValueSuggestion(word){if(!word)
return false;word=word.toLowerCase();return this._cssCompletions.indexOf(word)!==-1||word.startsWith('--');}
_buildPropertyCompletions(expression,query,force){var lowerQuery=query.toLowerCase();var editingVariable=!this._isEditingName&&expression.trim().endsWith('var(');if(!query&&!force&&!editingVariable&&(this._isEditingName||expression))
return Promise.resolve([]);var prefixResults=[];var anywhereResults=[];if(!editingVariable)
this._cssCompletions.forEach(filterCompletions.bind(this));if(this._isEditingName||editingVariable)
this._cssVariables.forEach(filterCompletions.bind(this));var results=prefixResults.concat(anywhereResults);if(!this._isEditingName&&!results.length&&query.length>1&&'!important'.startsWith(lowerQuery))
results.push({text:'!important'});var userEnteredText=query.replace('-','');if(userEnteredText&&(userEnteredText===userEnteredText.toUpperCase())){for(var i=0;i<results.length;++i){if(!results[i].text.startsWith('--'))
results[i].text=results[i].text.toUpperCase();}}
if(editingVariable)
results.forEach(result=>result.text+=')');return Promise.resolve(results);function filterCompletions(completion){var index=completion.toLowerCase().indexOf(lowerQuery);if(index===0){var priority=this._isEditingName?SDK.cssMetadata().propertyUsageWeight(completion):1;prefixResults.push({text:completion,priority:priority});}else if(index>-1){anywhereResults.push({text:completion});}}}};Elements.StylesSidebarPropertyRenderer=class{constructor(rule,node,name,value){this._rule=rule;this._node=node;this._propertyName=name;this._propertyValue=value;this._colorHandler=null;this._bezierHandler=null;this._shadowHandler=null;}
setColorHandler(handler){this._colorHandler=handler;}
setBezierHandler(handler){this._bezierHandler=handler;}
setShadowHandler(handler){this._shadowHandler=handler;}
renderName(){var nameElement=createElement('span');nameElement.className='webkit-css-property';nameElement.textContent=this._propertyName;nameElement.normalize();return nameElement;}
renderValue(){var valueElement=createElement('span');valueElement.className='value';if(!this._propertyValue)
return valueElement;if(this._shadowHandler&&(this._propertyName==='box-shadow'||this._propertyName==='text-shadow'||this._propertyName==='-webkit-box-shadow')&&!SDK.CSSMetadata.VariableRegex.test(this._propertyValue)){valueElement.appendChild(this._shadowHandler(this._propertyValue,this._propertyName));valueElement.normalize();return valueElement;}
var regexes=[SDK.CSSMetadata.VariableRegex,SDK.CSSMetadata.URLRegex];var processors=[createTextNode,this._processURL.bind(this)];if(this._bezierHandler&&SDK.cssMetadata().isBezierAwareProperty(this._propertyName)){regexes.push(UI.Geometry.CubicBezier.Regex);processors.push(this._bezierHandler);}
if(this._colorHandler&&SDK.cssMetadata().isColorAwareProperty(this._propertyName)){regexes.push(Common.Color.Regex);processors.push(this._colorHandler);}
var results=Common.TextUtils.splitStringByRegexes(this._propertyValue,regexes);for(var i=0;i<results.length;i++){var result=results[i];var processor=result.regexIndex===-1?createTextNode:processors[result.regexIndex];valueElement.appendChild(processor(result.value));}
valueElement.normalize();return valueElement;}
_processURL(text){var url=text.substring(4,text.length-1).trim();var isQuoted=/^'.*'$/.test(url)||/^".*"$/.test(url);if(isQuoted)
url=url.substring(1,url.length-1);var container=createDocumentFragment();container.createTextChild('url(');var hrefUrl=null;if(this._rule&&this._rule.resourceURL())
hrefUrl=Common.ParsedURL.completeURL(this._rule.resourceURL(),url);else if(this._node)
hrefUrl=this._node.resolveURL(url);container.appendChild(Components.Linkifier.linkifyURL(hrefUrl||url,url,'',undefined,undefined,true));container.createTextChild(')');return container;}};Elements.StylesSidebarPane.ButtonProvider=class{constructor(){this._button=new UI.ToolbarButton(Common.UIString('New Style Rule'),'largeicon-add');this._button.addEventListener(UI.ToolbarButton.Events.Click,this._clicked,this);var longclickTriangle=UI.Icon.create('largeicon-longclick-triangle','long-click-glyph');this._button.element.appendChild(longclickTriangle);new UI.LongClickController(this._button.element,this._longClicked.bind(this));UI.context.addFlavorChangeListener(SDK.DOMNode,onNodeChanged.bind(this));onNodeChanged.call(this);function onNodeChanged(){var node=UI.context.flavor(SDK.DOMNode);node=node?node.enclosingElementOrSelf():null;this._button.setEnabled(!!node);}}
_clicked(event){Elements.StylesSidebarPane._instance._createNewRuleInViaInspectorStyleSheet();}
_longClicked(e){Elements.StylesSidebarPane._instance._onAddButtonLongClick(e);}
item(){return this._button;}};;Elements.ComputedStyleWidget=class extends UI.ThrottledWidget{constructor(){super();this.element.classList.add('computed-style-sidebar-pane');this.registerRequiredCSS('elements/computedStyleSidebarPane.css');this._alwaysShowComputedProperties={'display':true,'height':true,'width':true};this._computedStyleModel=new Elements.ComputedStyleModel();this._computedStyleModel.addEventListener(Elements.ComputedStyleModel.Events.ComputedStyleChanged,this.update,this);this._showInheritedComputedStylePropertiesSetting=Common.settings.createSetting('showInheritedComputedStyleProperties',false);this._showInheritedComputedStylePropertiesSetting.addChangeListener(this._showInheritedComputedStyleChanged.bind(this));var hbox=this.element.createChild('div','hbox styles-sidebar-pane-toolbar');var filterContainerElement=hbox.createChild('div','styles-sidebar-pane-filter-box');var filterInput=Elements.StylesSidebarPane.createPropertyFilterElement(Common.UIString('Filter'),hbox,filterCallback.bind(this));UI.ARIAUtils.setAccessibleName(filterInput,Common.UIString('Filter Computed Styles'));filterContainerElement.appendChild(filterInput);var toolbar=new UI.Toolbar('styles-pane-toolbar',hbox);toolbar.appendToolbarItem(new UI.ToolbarSettingCheckbox(this._showInheritedComputedStylePropertiesSetting,undefined,Common.UIString('Show all')));this._propertiesOutline=new UI.TreeOutlineInShadow();this._propertiesOutline.hideOverflow();this._propertiesOutline.registerRequiredCSS('elements/computedStyleSidebarPane.css');this._propertiesOutline.element.classList.add('monospace','computed-properties');this.element.appendChild(this._propertiesOutline.element);this._linkifier=new Components.Linkifier(Elements.ComputedStyleWidget._maxLinkLength);function filterCallback(regex){this._filterRegex=regex;this._updateFilter(regex);}
var fontsWidget=new Elements.PlatformFontsWidget(this._computedStyleModel);fontsWidget.show(this.element);}
_showInheritedComputedStyleChanged(){this.update();}
doUpdate(){var promises=[this._computedStyleModel.fetchComputedStyle(),this._fetchMatchedCascade()];return Promise.all(promises).spread(this._innerRebuildUpdate.bind(this));}
_fetchMatchedCascade(){var node=this._computedStyleModel.node();if(!node||!this._computedStyleModel.cssModel())
return Promise.resolve((null));return this._computedStyleModel.cssModel().cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));function validateStyles(matchedStyles){return matchedStyles&&matchedStyles.node()===this._computedStyleModel.node()?matchedStyles:null;}}
_processColor(text){var color=Common.Color.parse(text);if(!color)
return createTextNode(text);var swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);swatch.setFormat(Common.Color.detectColorFormat(color));return swatch;}
_innerRebuildUpdate(nodeStyle,matchedStyles){var expandedProperties=new Set();for(var treeElement of this._propertiesOutline.rootElement().children()){if(!treeElement.expanded)
continue;var propertyName=treeElement[Elements.ComputedStyleWidget._propertySymbol].name;expandedProperties.add(propertyName);}
this._propertiesOutline.removeChildren();this._linkifier.reset();var cssModel=this._computedStyleModel.cssModel();if(!nodeStyle||!matchedStyles||!cssModel)
return;var uniqueProperties=nodeStyle.computedStyle.keysArray();uniqueProperties.sort(propertySorter);var propertyTraces=this._computePropertyTraces(matchedStyles);var inhertiedProperties=this._computeInheritedProperties(matchedStyles);var showInherited=this._showInheritedComputedStylePropertiesSetting.get();for(var i=0;i<uniqueProperties.length;++i){var propertyName=uniqueProperties[i];var propertyValue=nodeStyle.computedStyle.get(propertyName);var canonicalName=SDK.cssMetadata().canonicalPropertyName(propertyName);var inherited=!inhertiedProperties.has(canonicalName);if(!showInherited&&inherited&&!(propertyName in this._alwaysShowComputedProperties))
continue;if(!showInherited&&propertyName.startsWith('--'))
continue;if(propertyName!==canonicalName&&propertyValue===nodeStyle.computedStyle.get(canonicalName))
continue;var propertyElement=createElement('div');propertyElement.classList.add('computed-style-property');propertyElement.classList.toggle('computed-style-property-inherited',inherited);var renderer=new Elements.StylesSidebarPropertyRenderer(null,nodeStyle.node,propertyName,(propertyValue));renderer.setColorHandler(this._processColor.bind(this));var propertyNameElement=renderer.renderName();propertyNameElement.classList.add('property-name');propertyElement.appendChild(propertyNameElement);var colon=createElementWithClass('span','delimeter');colon.textContent=':';propertyNameElement.appendChild(colon);var propertyValueElement=propertyElement.createChild('span','property-value');var propertyValueText=renderer.renderValue();propertyValueText.classList.add('property-value-text');propertyValueElement.appendChild(propertyValueText);var semicolon=createElementWithClass('span','delimeter');semicolon.textContent=';';propertyValueElement.appendChild(semicolon);var treeElement=new UI.TreeElement();treeElement.selectable=false;treeElement.title=propertyElement;treeElement[Elements.ComputedStyleWidget._propertySymbol]={name:propertyName,value:propertyValue};var isOdd=this._propertiesOutline.rootElement().children().length%2===0;treeElement.listItemElement.classList.toggle('odd-row',isOdd);this._propertiesOutline.appendChild(treeElement);var trace=propertyTraces.get(propertyName);if(trace){var activeProperty=this._renderPropertyTrace(cssModel,matchedStyles,nodeStyle.node,treeElement,trace);treeElement.listItemElement.addEventListener('mousedown',e=>e.consume(),false);treeElement.listItemElement.addEventListener('dblclick',e=>e.consume(),false);treeElement.listItemElement.addEventListener('click',handleClick.bind(null,treeElement),false);var gotoSourceElement=UI.Icon.create('smallicon-arrow-in-circle','goto-source-icon');gotoSourceElement.addEventListener('click',this._navigateToSource.bind(this,activeProperty));propertyValueElement.appendChild(gotoSourceElement);if(expandedProperties.has(propertyName))
treeElement.expand();}}
this._updateFilter(this._filterRegex);function propertySorter(a,b){if(a.startsWith('--')^b.startsWith('--'))
return a.startsWith('--')?1:-1;if(a.startsWith('-webkit')^b.startsWith('-webkit'))
return a.startsWith('-webkit')?1:-1;var canonical1=SDK.cssMetadata().canonicalPropertyName(a);var canonical2=SDK.cssMetadata().canonicalPropertyName(b);return canonical1.compareTo(canonical2);}
function handleClick(treeElement,event){if(!treeElement.expanded)
treeElement.expand();else
treeElement.collapse();event.consume();}}
_navigateToSource(cssProperty,event){Common.Revealer.reveal(cssProperty);event.consume(true);}
_renderPropertyTrace(cssModel,matchedStyles,node,rootTreeElement,tracedProperties){var activeProperty=null;for(var property of tracedProperties){var trace=createElement('div');trace.classList.add('property-trace');if(matchedStyles.propertyState(property)===SDK.CSSMatchedStyles.PropertyState.Overloaded)
trace.classList.add('property-trace-inactive');else
activeProperty=property;var renderer=new Elements.StylesSidebarPropertyRenderer(null,node,property.name,(property.value));renderer.setColorHandler(this._processColor.bind(this));var valueElement=renderer.renderValue();valueElement.classList.add('property-trace-value');valueElement.addEventListener('click',this._navigateToSource.bind(this,property),false);var gotoSourceElement=UI.Icon.create('smallicon-arrow-in-circle','goto-source-icon');gotoSourceElement.addEventListener('click',this._navigateToSource.bind(this,property));valueElement.insertBefore(gotoSourceElement,valueElement.firstChild);trace.appendChild(valueElement);var rule=property.ownerStyle.parentRule;if(rule){var linkSpan=trace.createChild('span','trace-link');linkSpan.appendChild(Elements.StylePropertiesSection.createRuleOriginNode(matchedStyles,this._linkifier,rule));}
var selectorElement=trace.createChild('span','property-trace-selector');selectorElement.textContent=rule?rule.selectorText():'element.style';selectorElement.title=selectorElement.textContent;var traceTreeElement=new UI.TreeElement();traceTreeElement.title=trace;traceTreeElement.selectable=false;rootTreeElement.appendChild(traceTreeElement);}
return(activeProperty);}
_computePropertyTraces(matchedStyles){var result=new Map();for(var style of matchedStyles.nodeStyles()){var allProperties=style.allProperties();for(var property of allProperties){if(!property.activeInStyle()||!matchedStyles.propertyState(property))
continue;if(!result.has(property.name))
result.set(property.name,[]);result.get(property.name).push(property);}}
return result;}
_computeInheritedProperties(matchedStyles){var result=new Set();for(var style of matchedStyles.nodeStyles()){for(var property of style.allProperties()){if(!matchedStyles.propertyState(property))
continue;result.add(SDK.cssMetadata().canonicalPropertyName(property.name));}}
return result;}
_updateFilter(regex){var children=this._propertiesOutline.rootElement().children();for(var child of children){var property=child[Elements.ComputedStyleWidget._propertySymbol];var matched=!regex||regex.test(property.name)||regex.test(property.value);child.hidden=!matched;}}};Elements.ComputedStyleWidget._maxLinkLength=30;Elements.ComputedStyleWidget._propertySymbol=Symbol('property');;Elements.ElementsPanel=class extends UI.Panel{constructor(){super('elements');this.registerRequiredCSS('elements/elementsPanel.css');this._splitWidget=new UI.SplitWidget(true,true,'elementsPanelSplitViewState',325,325);this._splitWidget.addEventListener(UI.SplitWidget.Events.SidebarSizeChanged,this._updateTreeOutlineVisibleWidth.bind(this));this._splitWidget.show(this.element);this._searchableView=new UI.SearchableView(this);this._searchableView.setMinimumSize(25,28);this._searchableView.setPlaceholder(Common.UIString('Find by string, selector, or XPath'));var stackElement=this._searchableView.element;this._contentElement=createElement('div');var crumbsContainer=createElement('div');stackElement.appendChild(this._contentElement);stackElement.appendChild(crumbsContainer);this._splitWidget.setMainWidget(this._searchableView);this._contentElement.id='elements-content';if(Common.moduleSetting('domWordWrap').get())
this._contentElement.classList.add('elements-wrap');Common.moduleSetting('domWordWrap').addChangeListener(this._domWordWrapSettingChanged.bind(this));crumbsContainer.id='elements-crumbs';this._breadcrumbs=new Elements.ElementsBreadcrumbs();this._breadcrumbs.show(crumbsContainer);this._breadcrumbs.addEventListener(Elements.ElementsBreadcrumbs.Events.NodeSelected,this._crumbNodeSelected,this);this._currentToolbarPane=null;this._stylesWidget=new Elements.StylesSidebarPane();this._computedStyleWidget=new Elements.ComputedStyleWidget();this._metricsWidget=new Elements.MetricsSidebarPane();this._stylesSidebarToolbar=this._createStylesSidebarToolbar();Common.moduleSetting('sidebarPosition').addChangeListener(this._updateSidebarPosition.bind(this));this._updateSidebarPosition();this._treeOutlines=[];this._treeOutlineHeaders=new Map();SDK.targetManager.observeTargets(this);SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged,event=>this._targetNameChanged((event.data)));Common.moduleSetting('showUAShadowDOM').addChangeListener(this._showUAShadowDOMChanged.bind(this));SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.DocumentUpdated,this._documentUpdatedEvent,this);Extensions.extensionServer.addEventListener(Extensions.ExtensionServer.Events.SidebarPaneAdded,this._extensionSidebarPaneAdded,this);}
static instance(){return(self.runtime.sharedInstance(Elements.ElementsPanel));}
_revealProperty(cssProperty){return this.sidebarPaneView.showView(this._stylesViewToReveal).then(()=>{this._stylesWidget.revealProperty((cssProperty));});}
_createStylesSidebarToolbar(){var container=createElementWithClass('div','styles-sidebar-pane-toolbar-container');var hbox=container.createChild('div','hbox styles-sidebar-pane-toolbar');var filterContainerElement=hbox.createChild('div','styles-sidebar-pane-filter-box');var filterInput=Elements.StylesSidebarPane.createPropertyFilterElement(Common.UIString('Filter'),hbox,this._stylesWidget.onFilterChanged.bind(this._stylesWidget));UI.ARIAUtils.setAccessibleName(filterInput,Common.UIString('Filter Styles'));filterContainerElement.appendChild(filterInput);var toolbar=new UI.Toolbar('styles-pane-toolbar',hbox);toolbar.makeToggledGray();toolbar.appendLocationItems('styles-sidebarpane-toolbar');var toolbarPaneContainer=container.createChild('div','styles-sidebar-toolbar-pane-container');this._toolbarPaneElement=createElementWithClass('div','styles-sidebar-toolbar-pane');toolbarPaneContainer.appendChild(this._toolbarPaneElement);return container;}
resolveLocation(locationName){return this.sidebarPaneView;}
showToolbarPane(widget,toggle){if(this._pendingWidgetToggle)
this._pendingWidgetToggle.setToggled(false);this._pendingWidgetToggle=toggle;if(this._animatedToolbarPane!==undefined)
this._pendingWidget=widget;else
this._startToolbarPaneAnimation(widget);if(widget&&toggle)
toggle.setToggled(true);}
_startToolbarPaneAnimation(widget){if(widget===this._currentToolbarPane)
return;if(widget&&this._currentToolbarPane){this._currentToolbarPane.detach();widget.show(this._toolbarPaneElement);this._currentToolbarPane=widget;this._currentToolbarPane.focus();return;}
this._animatedToolbarPane=widget;if(this._currentToolbarPane)
this._toolbarPaneElement.style.animationName='styles-element-state-pane-slideout';else if(widget)
this._toolbarPaneElement.style.animationName='styles-element-state-pane-slidein';if(widget)
widget.show(this._toolbarPaneElement);var listener=onAnimationEnd.bind(this);this._toolbarPaneElement.addEventListener('animationend',listener,false);function onAnimationEnd(){this._toolbarPaneElement.style.removeProperty('animation-name');this._toolbarPaneElement.removeEventListener('animationend',listener,false);if(this._currentToolbarPane)
this._currentToolbarPane.detach();this._currentToolbarPane=this._animatedToolbarPane;if(this._currentToolbarPane)
this._currentToolbarPane.focus();delete this._animatedToolbarPane;if(this._pendingWidget!==undefined){this._startToolbarPaneAnimation(this._pendingWidget);delete this._pendingWidget;}}}
targetAdded(target){var domModel=SDK.DOMModel.fromTarget(target);if(!domModel)
return;var treeOutline=new Elements.ElementsTreeOutline(domModel,true,true);treeOutline.setWordWrap(Common.moduleSetting('domWordWrap').get());treeOutline.wireToDOMModel();treeOutline.addEventListener(Elements.ElementsTreeOutline.Events.SelectedNodeChanged,this._selectedNodeChanged,this);treeOutline.addEventListener(Elements.ElementsTreeOutline.Events.ElementsTreeUpdated,this._updateBreadcrumbIfNeeded,this);new Elements.ElementsTreeElementHighlighter(treeOutline);this._treeOutlines.push(treeOutline);if(target.parentTarget()){this._treeOutlineHeaders.set(treeOutline,createElementWithClass('div','elements-tree-header'));this._targetNameChanged(target);}
if(this.isShowing())
this.wasShown();}
targetRemoved(target){var domModel=SDK.DOMModel.fromTarget(target);if(!domModel)
return;var treeOutline=Elements.ElementsTreeOutline.forDOMModel(domModel);treeOutline.unwireFromDOMModel();this._treeOutlines.remove(treeOutline);var header=this._treeOutlineHeaders.get(treeOutline);if(header)
header.remove();this._treeOutlineHeaders.delete(treeOutline);treeOutline.element.remove();}
_targetNameChanged(target){var domModel=SDK.DOMModel.fromTarget(target);if(!domModel)
return;var treeOutline=Elements.ElementsTreeOutline.forDOMModel(domModel);if(!treeOutline)
return;var header=this._treeOutlineHeaders.get(treeOutline);if(!header)
return;header.removeChildren();header.createChild('div','elements-tree-header-frame').textContent=Common.UIString('Frame');header.appendChild(Components.Linkifier.linkifyURL(target.inspectedURL(),target.name()));}
_updateTreeOutlineVisibleWidth(){if(!this._treeOutlines.length)
return;var width=this._splitWidget.element.offsetWidth;if(this._splitWidget.isVertical())
width-=this._splitWidget.sidebarSize();for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].setVisibleWidth(width);this._breadcrumbs.updateSizes();}
focus(){if(this._treeOutlines.length)
this._treeOutlines[0].focus();}
searchableView(){return this._searchableView;}
wasShown(){UI.context.setFlavor(Elements.ElementsPanel,this);for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.element.parentElement!==this._contentElement){var header=this._treeOutlineHeaders.get(treeOutline);if(header)
this._contentElement.appendChild(header);this._contentElement.appendChild(treeOutline.element);}}
super.wasShown();this._breadcrumbs.update();for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];treeOutline.setVisible(true);if(!treeOutline.rootDOMNode){if(treeOutline.domModel().existingDocument())
this._documentUpdated(treeOutline.domModel(),treeOutline.domModel().existingDocument());else
treeOutline.domModel().requestDocument();}}
this.focus();}
willHide(){UI.context.setFlavor(Elements.ElementsPanel,null);SDK.DOMModel.hideDOMNodeHighlight();for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];treeOutline.setVisible(false);this._contentElement.removeChild(treeOutline.element);var header=this._treeOutlineHeaders.get(treeOutline);if(header)
this._contentElement.removeChild(header);}
if(this._popoverHelper)
this._popoverHelper.hidePopover();super.willHide();}
onResize(){if(Common.moduleSetting('sidebarPosition').get()==='auto')
this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));this._updateTreeOutlineVisibleWidth();}
_selectedNodeChanged(event){var selectedNode=(event.data.node);var focus=(event.data.focus);for(var i=0;i<this._treeOutlines.length;++i){if(!selectedNode||selectedNode.domModel()!==this._treeOutlines[i].domModel())
this._treeOutlines[i].selectDOMNode(null);}
this._breadcrumbs.setSelectedNode(selectedNode);UI.context.setFlavor(SDK.DOMNode,selectedNode);if(!selectedNode)
return;selectedNode.setAsInspectedNode();if(focus){this._selectedNodeOnReset=selectedNode;this._hasNonDefaultSelectedNode=true;}
var executionContexts=selectedNode.target().runtimeModel.executionContexts();var nodeFrameId=selectedNode.frameId();for(var context of executionContexts){if(context.frameId===nodeFrameId){UI.context.setFlavor(SDK.ExecutionContext,context);break;}}}
_reset(){delete this.currentQuery;}
_documentUpdatedEvent(event){var domModel=(event.data);this._documentUpdated(domModel,domModel.existingDocument());}
_documentUpdated(domModel,inspectedRootDocument){this._reset();this.searchCanceled();var treeOutline=Elements.ElementsTreeOutline.forDOMModel(domModel);treeOutline.rootDOMNode=inspectedRootDocument;if(!inspectedRootDocument){if(this.isShowing())
domModel.requestDocument();return;}
this._hasNonDefaultSelectedNode=false;Components.domBreakpointsSidebarPane.restoreBreakpoints(inspectedRootDocument);if(this._omitDefaultSelection)
return;var savedSelectedNodeOnReset=this._selectedNodeOnReset;restoreNode.call(this,domModel,this._selectedNodeOnReset);function restoreNode(domModel,staleNode){var nodePath=staleNode?staleNode.path():null;if(!nodePath){onNodeRestored.call(this,null);return;}
domModel.pushNodeByPathToFrontend(nodePath,onNodeRestored.bind(this));}
function onNodeRestored(restoredNodeId){if(savedSelectedNodeOnReset!==this._selectedNodeOnReset)
return;var node=restoredNodeId?domModel.nodeForId(restoredNodeId):null;if(!node){var inspectedDocument=domModel.existingDocument();node=inspectedDocument?inspectedDocument.body||inspectedDocument.documentElement:null;}
this._setDefaultSelectedNode(node);this._lastSelectedNodeSelectedForTest();}}
_lastSelectedNodeSelectedForTest(){}
_setDefaultSelectedNode(node){if(!node||this._hasNonDefaultSelectedNode||this._pendingNodeReveal)
return;var treeOutline=Elements.ElementsTreeOutline.forDOMModel(node.domModel());if(!treeOutline)
return;this.selectDOMNode(node);if(treeOutline.selectedTreeElement)
treeOutline.selectedTreeElement.expand();}
searchCanceled(){delete this._searchConfig;this._hideSearchHighlights();this._searchableView.updateSearchMatchesCount(0);delete this._currentSearchResultIndex;delete this._searchResults;SDK.DOMModel.cancelSearch();}
performSearch(searchConfig,shouldJump,jumpBackwards){var query=searchConfig.query;const whitespaceTrimmedQuery=query.trim();if(!whitespaceTrimmedQuery.length)
return;if(!this._searchConfig||this._searchConfig.query!==query)
this.searchCanceled();else
this._hideSearchHighlights();this._searchConfig=searchConfig;var promises=[];var domModels=SDK.DOMModel.instances();for(var domModel of domModels){promises.push(domModel.performSearchPromise(whitespaceTrimmedQuery,Common.moduleSetting('showUAShadowDOM').get()));}
Promise.all(promises).then(resultCountCallback.bind(this));function resultCountCallback(resultCounts){this._searchResults=[];for(var i=0;i<resultCounts.length;++i){var resultCount=resultCounts[i];for(var j=0;j<resultCount;++j)
this._searchResults.push({domModel:domModels[i],index:j,node:undefined});}
this._searchableView.updateSearchMatchesCount(this._searchResults.length);if(!this._searchResults.length)
return;if(this._currentSearchResultIndex>=this._searchResults.length)
this._currentSearchResultIndex=undefined;var index=this._currentSearchResultIndex;if(shouldJump){if(this._currentSearchResultIndex===undefined)
index=jumpBackwards?-1:0;else
index=jumpBackwards?index-1:index+1;this._jumpToSearchResult(index);}}}
_domWordWrapSettingChanged(event){this._contentElement.classList.toggle('elements-wrap',event.data);for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].setWordWrap((event.data));}
switchToAndFocus(node){this._searchableView.cancelSearch();UI.viewManager.showView('elements').then(()=>this.selectDOMNode(node,true));}
_getPopoverAnchor(element,event){var link=element;while(link&&!link[Elements.ElementsTreeElement.HrefSymbol])
link=link.parentElementOrShadowHost();return link?link:undefined;}
_showPopover(link,popover){var node=this.selectedDOMNode();if(!node)
return Promise.resolve(false);var fulfill;var promise=new Promise(x=>fulfill=x);Components.DOMPresentationUtils.buildImagePreviewContents(node.target(),link[Elements.ElementsTreeElement.HrefSymbol],true,showPopover);return promise;function showPopover(contents){if(contents)
popover.contentElement.appendChild(contents);fulfill(!!contents);}}
_jumpToSearchResult(index){this._currentSearchResultIndex=(index+this._searchResults.length)%this._searchResults.length;this._highlightCurrentSearchResult();}
jumpToNextSearchResult(){if(!this._searchResults)
return;this.performSearch(this._searchConfig,true);}
jumpToPreviousSearchResult(){if(!this._searchResults)
return;this.performSearch(this._searchConfig,true,true);}
supportsCaseSensitiveSearch(){return false;}
supportsRegexSearch(){return false;}
_highlightCurrentSearchResult(){var index=this._currentSearchResultIndex;var searchResults=this._searchResults;var searchResult=searchResults[index];if(searchResult.node===null){this._searchableView.updateCurrentMatchIndex(index);return;}
function searchCallback(node){searchResult.node=node;this._highlightCurrentSearchResult();}
if(typeof searchResult.node==='undefined'){searchResult.domModel.searchResult(searchResult.index,searchCallback.bind(this));return;}
this._searchableView.updateCurrentMatchIndex(index);var treeElement=this._treeElementForNode(searchResult.node);if(treeElement){treeElement.highlightSearchResults(this._searchConfig.query);treeElement.reveal();var matches=treeElement.listItemElement.getElementsByClassName(UI.highlightedSearchResultClassName);if(matches.length)
matches[0].scrollIntoViewIfNeeded(false);}}
_hideSearchHighlights(){if(!this._searchResults||!this._searchResults.length||this._currentSearchResultIndex===undefined)
return;var searchResult=this._searchResults[this._currentSearchResultIndex];if(!searchResult.node)
return;var treeOutline=Elements.ElementsTreeOutline.forDOMModel(searchResult.node.domModel());var treeElement=treeOutline.findTreeElement(searchResult.node);if(treeElement)
treeElement.hideSearchHighlights();}
selectedDOMNode(){for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.selectedDOMNode())
return treeOutline.selectedDOMNode();}
return null;}
selectDOMNode(node,focus){for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.domModel()===node.domModel())
treeOutline.selectDOMNode(node,focus);else
treeOutline.selectDOMNode(null);}}
_updateBreadcrumbIfNeeded(event){var nodes=(event.data);this._breadcrumbs.updateNodes(nodes);}
_crumbNodeSelected(event){var node=(event.data);this.selectDOMNode(node,true);}
handleShortcut(event){function handleUndoRedo(treeOutline){if(UI.KeyboardShortcut.eventHasCtrlOrMeta(event)&&!event.shiftKey&&(event.key==='Z'||event.key==='z')){treeOutline.domModel().undo();event.handled=true;return;}
var isRedoKey=Host.isMac()?event.metaKey&&event.shiftKey&&(event.key==='Z'||event.key==='z'):event.ctrlKey&&(event.key==='Y'||event.key==='y');if(isRedoKey){treeOutline.domModel().redo();event.handled=true;}}
if(UI.isEditing()&&event.keyCode!==UI.KeyboardShortcut.Keys.F2.code)
return;var treeOutline=null;for(var i=0;i<this._treeOutlines.length;++i){if(this._treeOutlines[i].selectedDOMNode())
treeOutline=this._treeOutlines[i];}
if(!treeOutline)
return;if(!treeOutline.editing()){handleUndoRedo.call(null,treeOutline);if(event.handled){this._stylesWidget.forceUpdate();return;}}
treeOutline.handleShortcut(event);if(event.handled)
return;super.handleShortcut(event);}
_treeOutlineForNode(node){if(!node)
return null;return Elements.ElementsTreeOutline.forDOMModel(node.domModel());}
_treeElementForNode(node){var treeOutline=this._treeOutlineForNode(node);return(treeOutline.findTreeElement(node));}
_leaveUserAgentShadowDOM(node){var userAgentShadowRoot;while((userAgentShadowRoot=node.ancestorUserAgentShadowRoot())&&userAgentShadowRoot.parentNode)
node=userAgentShadowRoot.parentNode;return node;}
revealAndSelectNode(node){if(Elements.inspectElementModeController&&Elements.inspectElementModeController.isInInspectElementMode())
Elements.inspectElementModeController.stopInspection();this._omitDefaultSelection=true;node=Common.moduleSetting('showUAShadowDOM').get()?node:this._leaveUserAgentShadowDOM(node);node.highlightForTwoSeconds();return UI.viewManager.showView('elements').then(()=>{this.selectDOMNode(node,true);delete this._omitDefaultSelection;if(!this._notFirstInspectElement)
InspectorFrontendHost.inspectElementCompleted();this._notFirstInspectElement=true;});}
_showUAShadowDOMChanged(){for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].update();}
_updateSidebarPosition(){var horizontally;var position=Common.moduleSetting('sidebarPosition').get();if(position==='right')
horizontally=false;else if(position==='bottom')
horizontally=true;else
horizontally=UI.inspectorView.element.offsetWidth<680;if(this.sidebarPaneView&&horizontally===!this._splitWidget.isVertical())
return;if(this.sidebarPaneView&&this.sidebarPaneView.tabbedPane().shouldHideOnDetach())
return;var extensionSidebarPanes=Extensions.extensionServer.sidebarPanes();if(this.sidebarPaneView){this.sidebarPaneView.tabbedPane().detach();this._splitWidget.uninstallResizer(this.sidebarPaneView.tabbedPane().headerElement());}
this._splitWidget.setVertical(!horizontally);this.showToolbarPane(null);var matchedStylesContainer=new UI.VBox();matchedStylesContainer.element.appendChild(this._stylesSidebarToolbar);var matchedStylePanesWrapper=new UI.VBox();matchedStylePanesWrapper.element.classList.add('style-panes-wrapper');matchedStylePanesWrapper.show(matchedStylesContainer.element);this._stylesWidget.show(matchedStylePanesWrapper.element);var computedStylePanesWrapper=new UI.VBox();computedStylePanesWrapper.element.classList.add('style-panes-wrapper');this._computedStyleWidget.show(computedStylePanesWrapper.element);function showMetrics(inComputedStyle){if(inComputedStyle)
this._metricsWidget.show(computedStylePanesWrapper.element,this._computedStyleWidget.element);else
this._metricsWidget.show(matchedStylePanesWrapper.element);}
function tabSelected(event){var tabId=(event.data.tabId);if(tabId===Common.UIString('Computed'))
showMetrics.call(this,true);else if(tabId===Common.UIString('Styles'))
showMetrics.call(this,false);}
this.sidebarPaneView=UI.viewManager.createTabbedLocation(()=>UI.viewManager.showView('elements'));var tabbedPane=this.sidebarPaneView.tabbedPane();if(this._popoverHelper)
this._popoverHelper.hidePopover();this._popoverHelper=new UI.PopoverHelper(tabbedPane.element);this._popoverHelper.setHasPadding(true);this._popoverHelper.initializeCallbacks(this._getPopoverAnchor.bind(this),this._showPopover.bind(this));this._popoverHelper.setTimeout(0);if(horizontally){this._splitWidget.installResizer(tabbedPane.headerElement());var stylesView=new UI.SimpleView(Common.UIString('Styles'));stylesView.element.classList.add('flex-auto');var splitWidget=new UI.SplitWidget(true,true,'stylesPaneSplitViewState',215);splitWidget.show(stylesView.element);splitWidget.setMainWidget(matchedStylesContainer);splitWidget.setSidebarWidget(computedStylePanesWrapper);this.sidebarPaneView.appendView(stylesView);this._stylesViewToReveal=stylesView;}else{var stylesView=new UI.SimpleView(Common.UIString('Styles'));stylesView.element.classList.add('flex-auto','metrics-and-styles');matchedStylesContainer.show(stylesView.element);var computedView=new UI.SimpleView(Common.UIString('Computed'));computedView.element.classList.add('composite','fill','metrics-and-computed');computedStylePanesWrapper.show(computedView.element);tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected,tabSelected,this);this.sidebarPaneView.appendView(stylesView);this.sidebarPaneView.appendView(computedView);this._stylesViewToReveal=stylesView;}
showMetrics.call(this,horizontally);this.sidebarPaneView.appendApplicableItems('elements-sidebar');for(var i=0;i<extensionSidebarPanes.length;++i)
this._addExtensionSidebarPane(extensionSidebarPanes[i]);this._splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());}
_extensionSidebarPaneAdded(event){var pane=(event.data);this._addExtensionSidebarPane(pane);}
_addExtensionSidebarPane(pane){if(pane.panelName()===this.name)
this.sidebarPaneView.appendView(pane);}};Elements.ElementsPanel._elementsSidebarViewTitleSymbol=Symbol('title');Elements.ElementsPanel.ContextMenuProvider=class{appendApplicableItems(event,contextMenu,object){if(!(object instanceof SDK.RemoteObject&&((object)).isNode())&&!(object instanceof SDK.DOMNode)&&!(object instanceof SDK.DeferredDOMNode))
return;if(object instanceof SDK.DOMNode){contextMenu.appendSeparator();Components.domBreakpointsSidebarPane.populateNodeContextMenu(object,contextMenu,true);}
if(Elements.ElementsPanel.instance().element.isAncestor((event.target)))
return;var commandCallback=Common.Revealer.reveal.bind(Common.Revealer,object);contextMenu.appendItem(Common.UIString.capitalize('Reveal in Elements ^panel'),commandCallback);}};Elements.ElementsPanel.DOMNodeRevealer=class{reveal(node){var panel=Elements.ElementsPanel.instance();panel._pendingNodeReveal=true;return new Promise(revealPromise);function revealPromise(resolve,reject){if(node instanceof SDK.DOMNode){onNodeResolved((node));}else if(node instanceof SDK.DeferredDOMNode){((node)).resolve(onNodeResolved);}else if(node instanceof SDK.RemoteObject){var domModel=SDK.DOMModel.fromTarget((node).runtimeModel().target());if(domModel)
domModel.pushObjectAsNodeToFrontend(node,onNodeResolved);else
reject(new Error('Could not resolve a node to reveal.'));}else{reject(new Error('Can\'t reveal a non-node.'));panel._pendingNodeReveal=false;}
function onNodeResolved(resolvedNode){panel._pendingNodeReveal=false;if(resolvedNode){panel.revealAndSelectNode(resolvedNode).then(resolve);return;}
reject(new Error('Could not resolve node to reveal.'));}}}};Elements.ElementsPanel.CSSPropertyRevealer=class{reveal(property){var panel=Elements.ElementsPanel.instance();return panel._revealProperty((property));}};Elements.ElementsActionDelegate=class{handleAction(context,actionId){var node=UI.context.flavor(SDK.DOMNode);if(!node)
return true;var treeOutline=Elements.ElementsTreeOutline.forDOMModel(node.domModel());if(!treeOutline)
return true;switch(actionId){case'elements.hide-element':treeOutline.toggleHideElement(node);return true;case'elements.edit-as-html':treeOutline.toggleEditAsHTML(node);return true;}
return false;}};Elements.ElementsPanel.PseudoStateMarkerDecorator=class{decorate(node){return{color:'orange',title:Common.UIString('Element state: %s',':'+SDK.CSSModel.fromNode(node).pseudoState(node).join(', :'))};}};;Elements.ClassesPaneWidget=class extends UI.Widget{constructor(){super();this.element.className='styles-element-classes-pane';var container=this.element.createChild('div','title-container');this._input=container.createChild('div','new-class-input monospace');this.setDefaultFocusedElement(this._input);this._classesContainer=this.element.createChild('div','source-code');this._classesContainer.classList.add('styles-element-classes-container');this._prompt=new Elements.ClassesPaneWidget.ClassNamePrompt();this._prompt.setAutocompletionTimeout(0);this._prompt.renderAsBlock();var proxyElement=this._prompt.attach(this._input);this._prompt.setPlaceholder(Common.UIString('Add new class'));proxyElement.addEventListener('keydown',this._onKeyDown.bind(this),false);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.DOMMutated,this._onDOMMutated,this);this._mutatingNodes=new Set();UI.context.addFlavorChangeListener(SDK.DOMNode,this._update,this);}
_onKeyDown(event){var text=event.target.textContent;if(isEscKey(event)){event.target.textContent='';if(!text.isWhitespace())
event.consume(true);return;}
if(!isEnterKey(event))
return;var node=UI.context.flavor(SDK.DOMNode);if(!node)
return;this._prompt.clearAutocomplete();event.target.textContent='';var classNames=text.split(/[.,\s]/);for(var className of classNames){var className=className.trim();if(!className.length)
continue;this._toggleClass(node,className,true);}
this._installNodeClasses(node);this._update();event.consume(true);}
_onDOMMutated(event){var node=(event.data);if(this._mutatingNodes.has(node))
return;delete node[Elements.ClassesPaneWidget._classesSymbol];this._update();}
wasShown(){this._update();}
_update(){if(!this.isShowing())
return;var node=UI.context.flavor(SDK.DOMNode);if(node)
node=node.enclosingElementOrSelf();this._classesContainer.removeChildren();this._input.disabled=!node;if(!node)
return;var classes=this._nodeClasses(node);var keys=classes.keysArray();keys.sort(String.caseInsensetiveComparator);for(var i=0;i<keys.length;++i){var className=keys[i];var label=UI.createCheckboxLabel(className,classes.get(className));label.visualizeFocus=true;label.classList.add('monospace');label.checkboxElement.addEventListener('click',this._onClick.bind(this,className),false);this._classesContainer.appendChild(label);}}
_onClick(className,event){var node=UI.context.flavor(SDK.DOMNode);if(!node)
return;var enabled=event.target.checked;this._toggleClass(node,className,enabled);this._installNodeClasses(node);}
_nodeClasses(node){var result=node[Elements.ClassesPaneWidget._classesSymbol];if(!result){var classAttribute=node.getAttribute('class')||'';var classes=classAttribute.split(/\s/);result=new Map();for(var i=0;i<classes.length;++i){var className=classes[i].trim();if(!className.length)
continue;result.set(className,true);}
node[Elements.ClassesPaneWidget._classesSymbol]=result;}
return result;}
_toggleClass(node,className,enabled){var classes=this._nodeClasses(node);classes.set(className,enabled);}
_installNodeClasses(node){var classes=this._nodeClasses(node);var activeClasses=new Set();for(var className of classes.keys()){if(classes.get(className))
activeClasses.add(className);}
var newClasses=activeClasses.valuesArray();newClasses.sort();this._mutatingNodes.add(node);node.setAttributeValue('class',newClasses.join(' '),onClassNameUpdated.bind(this));function onClassNameUpdated(){this._mutatingNodes.delete(node);}}};Elements.ClassesPaneWidget._classesSymbol=Symbol('Elements.ClassesPaneWidget._classesSymbol');Elements.ClassesPaneWidget.ButtonProvider=class{constructor(){this._button=new UI.ToolbarToggle(Common.UIString('Element Classes'),'');this._button.setText('.cls');this._button.element.classList.add('monospace');this._button.addEventListener(UI.ToolbarButton.Events.Click,this._clicked,this);this._view=new Elements.ClassesPaneWidget();}
_clicked(){Elements.ElementsPanel.instance().showToolbarPane(!this._view.isShowing()?this._view:null,this._button);}
item(){return this._button;}};Elements.ClassesPaneWidget.ClassNamePrompt=class extends UI.TextPrompt{constructor(){super();this.initialize(this._buildClassNameCompletions.bind(this),' ');this.disableDefaultSuggestionForEmptyInput();this._selectedFrameId='';this._classNamesPromise=null;}
_getClassNames(selectedNode){var promises=[];var completions=new Set();this._selectedFrameId=selectedNode.frameId();var cssModel=SDK.CSSModel.fromNode(selectedNode);var allStyleSheets=cssModel.allStyleSheets();for(var stylesheet of allStyleSheets){if(stylesheet.frameId!==this._selectedFrameId)
continue;var cssPromise=cssModel.classNamesPromise(stylesheet.id).then(classes=>completions.addAll(classes));promises.push(cssPromise);}
var domPromise=selectedNode.domModel().classNamesPromise(selectedNode.ownerDocument.id).then(classes=>completions.addAll(classes));promises.push(domPromise);return Promise.all(promises).then(()=>completions.valuesArray());}
_buildClassNameCompletions(expression,prefix,force){if(!prefix||force)
this._classNamesPromise=null;var selectedNode=UI.context.flavor(SDK.DOMNode);if(!selectedNode||(!prefix&&!force&&!expression.trim()))
return Promise.resolve([]);if(!this._classNamesPromise||this._selectedFrameId!==selectedNode.frameId())
this._classNamesPromise=this._getClassNames(selectedNode);return this._classNamesPromise.then(completions=>{if(prefix[0]==='.')
completions=completions.map(value=>'.'+value);return completions.filter(value=>value.startsWith(prefix)).map(completion=>({text:completion}));});}};;Elements.ElementStatePaneWidget=class extends UI.Widget{constructor(){super();this.element.className='styles-element-state-pane';this.element.createChild('div').createTextChild(Common.UIString('Force element state'));var table=createElementWithClass('table','source-code');var inputs=[];this._inputs=inputs;function clickListener(event){var node=UI.context.flavor(SDK.DOMNode);if(!node)
return;SDK.CSSModel.fromNode(node).forcePseudoState(node,event.target.state,event.target.checked);}
function createCheckbox(state){var td=createElement('td');var label=UI.createCheckboxLabel(':'+state);var input=label.checkboxElement;input.state=state;input.addEventListener('click',clickListener,false);inputs.push(input);td.appendChild(label);return td;}
var tr=table.createChild('tr');tr.appendChild(createCheckbox.call(null,'active'));tr.appendChild(createCheckbox.call(null,'hover'));tr=table.createChild('tr');tr.appendChild(createCheckbox.call(null,'focus'));tr.appendChild(createCheckbox.call(null,'visited'));this.element.appendChild(table);UI.context.addFlavorChangeListener(SDK.DOMNode,this._update,this);}
_updateModel(cssModel){if(this._cssModel===cssModel)
return;if(this._cssModel)
this._cssModel.removeEventListener(SDK.CSSModel.Events.PseudoStateForced,this._update,this);this._cssModel=cssModel;if(this._cssModel)
this._cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced,this._update,this);}
wasShown(){this._update();}
_update(){if(!this.isShowing())
return;var node=UI.context.flavor(SDK.DOMNode);if(node)
node=node.enclosingElementOrSelf();this._updateModel(node?SDK.CSSModel.fromNode(node):null);if(node){var nodePseudoState=SDK.CSSModel.fromNode(node).pseudoState(node);for(var input of this._inputs){input.disabled=!!node.pseudoType();input.checked=nodePseudoState.indexOf(input.state)>=0;}}else{for(var input of this._inputs){input.disabled=true;input.checked=false;}}}};Elements.ElementStatePaneWidget.ButtonProvider=class{constructor(){this._button=new UI.ToolbarToggle(Common.UIString('Toggle Element State'),'');this._button.setText(Common.UIString(':hov'));this._button.addEventListener(UI.ToolbarButton.Events.Click,this._clicked,this);this._button.element.classList.add('monospace');this._view=new Elements.ElementStatePaneWidget();}
_clicked(){Elements.ElementsPanel.instance().showToolbarPane(!this._view.isShowing()?this._view:null,this._button);}
item(){return this._button;}};;Elements.ElementsTreeElementHighlighter=class{constructor(treeOutline){this._throttler=new Common.Throttler(100);this._treeOutline=treeOutline;this._treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded,this._clearState,this);this._treeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed,this._clearState,this);this._treeOutline.addEventListener(Elements.ElementsTreeOutline.Events.SelectedNodeChanged,this._clearState,this);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.NodeHighlightedInOverlay,this._highlightNode,this);this._treeOutline.domModel().addEventListener(SDK.DOMModel.Events.InspectModeWillBeToggled,this._clearState,this);}
_highlightNode(event){if(!Common.moduleSetting('highlightNodeOnHoverInOverlay').get())
return;var domNode=(event.data);this._throttler.schedule(callback.bind(this));this._pendingHighlightNode=this._treeOutline.domModel()===domNode.domModel()?domNode:null;function callback(){this._highlightNodeInternal(this._pendingHighlightNode);delete this._pendingHighlightNode;return Promise.resolve();}}
_highlightNodeInternal(node){this._isModifyingTreeOutline=true;var treeElement=null;if(this._currentHighlightedElement){var currentTreeElement=this._currentHighlightedElement;while(currentTreeElement!==this._alreadyExpandedParentElement){if(currentTreeElement.expanded)
currentTreeElement.collapse();currentTreeElement=currentTreeElement.parent;}}
delete this._currentHighlightedElement;delete this._alreadyExpandedParentElement;if(node){var deepestExpandedParent=node;var treeElementSymbol=this._treeOutline.treeElementSymbol();while(deepestExpandedParent&&(!deepestExpandedParent[treeElementSymbol]||!deepestExpandedParent[treeElementSymbol].expanded))
deepestExpandedParent=deepestExpandedParent.parentNode;this._alreadyExpandedParentElement=deepestExpandedParent?deepestExpandedParent[treeElementSymbol]:this._treeOutline.rootElement();treeElement=this._treeOutline.createTreeElementFor(node);}
this._currentHighlightedElement=treeElement;this._treeOutline.setHoverEffect(treeElement);if(treeElement)
treeElement.reveal(true);this._isModifyingTreeOutline=false;}
_clearState(){if(this._isModifyingTreeOutline)
return;delete this._currentHighlightedElement;delete this._alreadyExpandedParentElement;delete this._pendingHighlightNode;}};;Runtime.cachedResources["elements/breadcrumbs.css"]="/*\n * Copyright 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.crumbs {\n    display: inline-block;\n    pointer-events: auto;\n    cursor: default;\n    line-height: 17px;\n    white-space: nowrap;\n}\n\n.crumbs .crumb {\n    display: inline-block;\n    padding: 0 7px;\n    height: 18px;\n    white-space: nowrap;\n}\n\n.crumbs .crumb.collapsed > * {\n    display: none;\n}\n\n.crumbs .crumb.collapsed::before {\n    content: \"\\2026\";\n    font-weight: bold;\n}\n\n.crumbs .crumb.compact .extra {\n    display: none;\n}\n\n.crumbs .crumb.selected, .crumbs .crumb.selected:hover {\n    background-color: rgb(56, 121, 217);\n    color: white;\n    text-shadow: rgba(255, 255, 255, 0.5) 0 0 0;\n}\n\n.crumbs .crumb:hover {\n    background-color: rgb(216, 216, 216);\n}\n\n/*# sourceURL=elements/breadcrumbs.css */";Runtime.cachedResources["elements/computedStyleSidebarPane.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.computed-properties {\n    -webkit-user-select: text;\n    flex-shrink: 0;\n}\n\n.computed-style-property {\n    display: flex;\n    overflow: hidden;\n    flex: auto;\n}\n\n.computed-style-property .property-name {\n    min-width: 5em;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    flex-shrink: 1;\n    flex-basis: 16em;\n    flex-grow: 1;\n}\n\n.computed-style-property .property-value {\n    margin-left: 2em;\n    position: relative;\n    display: flex;\n    flex-shrink: 0;\n    flex-basis: 5em;\n    flex-grow: 10;\n}\n\n.computed-style-property .property-value-text {\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.tree-outline li:hover .goto-source-icon {\n    display: block;\n}\n\n.goto-source-icon {\n    background-color: #5a5a5a;\n    display: none;\n    position: absolute;\n    left: -16px;\n}\n\n.goto-source-icon:hover {\n    background-color: #333;\n}\n\n.computed-style-property-inherited {\n    opacity: 0.5;\n}\n\n.trace-link {\n    user-select: none;\n    float: right;\n    padding-left: 1em;\n    position: relative;\n    z-index: 1;\n}\n\n.property-trace {\n    text-overflow: ellipsis;\n    overflow: hidden;\n    flex-grow: 1;\n}\n\n.property-trace-selector {\n    color: gray;\n    padding-left: 2em;\n}\n\n.property-trace-value {\n    position: relative;\n    display: inline-block;\n    margin-left: 2em;\n}\n\n.property-trace-inactive .property-trace-value::before {\n    position: absolute;\n    content: \".\";\n    border-bottom: 1px solid rgba(0, 0, 0, 0.35);\n    top: 0;\n    bottom: 5px;\n    left: 0;\n    right: 0;\n}\n\n.tree-outline li.odd-row {\n    position: relative;\n    background-color: #F5F5F5;\n}\n\n.tree-outline, .tree-outline ol {\n    padding-left: 0;\n}\n\n.tree-outline li:hover {\n    background-color: rgb(235, 242, 252);\n    cursor: pointer;\n}\n\n.tree-outline li::before {\n    margin-left: 4px;\n}\n\n.delimeter {\n    color: transparent;\n}\n\n.delimeter::selection {\n    color: transparent;\n}\n\n/*# sourceURL=elements/computedStyleSidebarPane.css */";Runtime.cachedResources["elements/elementsPanel.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n#elements-content {\n    flex: 1 1;\n    overflow: auto;\n    padding: 2px 0 0 0;\n}\n\n#elements-content:not(.elements-wrap) > div {\n    display: inline-block;\n    min-width: 100%;\n}\n\n#elements-content.elements-wrap {\n    overflow-x: hidden;\n}\n\n.elements-topbar {\n    border-bottom: 1px solid hsla(0, 0%, 0%, 0.1);\n    flex-shrink: 0;\n}\n\n#elements-crumbs {\n    flex: 0 0 19px;\n    background-color: white;\n    border-top: 1px solid #ccc;\n    overflow: hidden;\n    height: 19px;\n    width: 100%;\n}\n\n.metrics {\n    padding: 8px;\n    font-size: 10px;\n    text-align: center;\n    white-space: nowrap;\n}\n\n.metrics .label {\n    position: absolute;\n    font-size: 10px;\n    margin-left: 3px;\n    padding-left: 2px;\n    padding-right: 2px;\n}\n\n.metrics .position {\n    border: 1px rgb(66%, 66%, 66%) dotted;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .margin {\n    border: 1px dashed;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .border {\n    border: 1px black solid;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .padding {\n    border: 1px grey dashed;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .content {\n    position: static;\n    border: 1px gray solid;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n    min-width: 80px;\n    overflow: visible;\n}\n\n.metrics .content span {\n    display: inline-block;\n}\n\n.metrics .editing {\n    position: relative;\n    z-index: 100;\n    cursor: text;\n}\n\n.metrics .left {\n    display: inline-block;\n    vertical-align: middle;\n}\n\n.metrics .right {\n    display: inline-block;\n    vertical-align: middle;\n}\n\n.metrics .top {\n    display: inline-block;\n}\n\n.metrics .bottom {\n    display: inline-block;\n}\n\n.styles-section {\n    padding: 2px 2px 4px 4px;\n    min-height: 18px;\n    white-space: nowrap;\n    -webkit-user-select: text;\n    border-bottom: 1px solid #eee;\n    position: relative;\n    overflow: hidden;\n}\n\n.styles-section:last-child {\n    border-bottom: none;\n}\n\n.styles-pane .sidebar-separator {\n    border-top: 0 none;\n}\n\n.style-panes-wrapper {\n    overflow: auto;\n}\n\n.styles-section.read-only {\n    background-color: #eee;\n}\n\n.styles-filter-engaged,\n.styles-section .simple-selector.filter-match {\n    background-color: rgba(255, 255, 0, 0.5);\n}\n\n.-theme-with-dark-background .styles-filter-engaged,\n.-theme-with-dark-background .styles-section .simple-selector.filter-match {\n    background-color: hsla(133, 100%, 30%, 0.5);\n}\n\n.sidebar-pane-closing-brace {\n    clear: both;\n}\n\n.styles-section-title {\n    background-origin: padding;\n    background-clip: padding;\n    word-wrap: break-word;\n    white-space: normal;\n}\n\n.styles-section-title .media-list {\n    color: #888;\n}\n\n.styles-section-title .media-list.media-matches .media.editable-media {\n    color: #222;\n}\n\n.styles-section-title .media:not(.editing-media),\n.styles-section-title .media:not(.editing-media) .subtitle {\n    overflow: hidden;\n}\n\n.styles-section-title .media .subtitle {\n    float: right;\n    color: rgb(85, 85, 85);\n}\n\n.styles-section-subtitle {\n    color: rgb(85, 85, 85);\n    float: right;\n    margin-left: 5px;\n    max-width: 100%;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n    height: 14px;\n}\n\n.styles-section .styles-section-subtitle .devtools-link {\n    color: inherit;\n}\n\n.styles-section .selector {\n    color: #888;\n}\n\n.styles-section .simple-selector.selector-matches, .styles-section.keyframe-key {\n    color: #222;\n}\n\n.styles-section .devtools-link {\n    user-select: none;\n}\n\n.styles-section .style-properties {\n    margin: 0;\n    padding: 2px 4px 0 0;\n    list-style: none;\n    clear: both;\n    display: flex;\n}\n\n.styles-section.matched-styles .style-properties {\n    padding-left: 0;\n}\n\n.styles-element-state-pane {\n    overflow: hidden;\n    height: 66px;\n    padding-left: 2px;\n    border-bottom: 1px solid rgb(189, 189, 189);\n}\n\n@keyframes styles-element-state-pane-slidein {\n    from {\n        margin-top: -60px;\n    }\n    to {\n        margin-top: 0px;\n    }\n}\n\n@keyframes styles-element-state-pane-slideout {\n    from {\n        margin-top: 0px;\n    }\n    to {\n        margin-top: -60px;\n    }\n}\n\n.styles-sidebar-toolbar-pane {\n    position: relative;\n    animation-duration: 0.1s;\n    animation-direction: normal;\n}\n\n.styles-sidebar-toolbar-pane-container {\n    position: relative;\n    overflow: hidden;\n    flex-shrink: 0;\n}\n\n.styles-element-state-pane {\n    background-color: #f3f3f3;\n    border-bottom: 1px solid rgb(189, 189, 189);\n    margin-top: 0;\n}\n\n.styles-element-classes-pane {\n    background-color: #f3f3f3;\n    border-bottom: 1px solid rgb(189, 189, 189);\n    padding: 6px 2px 2px;\n}\n\n.styles-element-classes-container {\n    display: flex;\n    flex-wrap: wrap;\n    justify-content: flex-start;\n}\n\n.styles-element-classes-pane label {\n    margin-right: 15px;\n}\n\n.styles-element-classes-pane .title-container {\n    padding-bottom: 2px;\n}\n\n.styles-element-classes-pane .new-class-input {\n    padding-left: 3px;\n    padding-right: 3px;\n    overflow: hidden;\n    border: 1px solid #ddd;\n    line-height: 15px;\n    margin-left: 3px;\n    width: calc(100% - 7px);\n    -webkit-user-modify: read-write-plaintext-only;\n    background-color: #fff;\n    cursor: text;\n}\n\n.styles-element-state-pane > div {\n    margin: 8px 4px 6px;\n}\n\n.styles-element-state-pane > table {\n    width: 100%;\n    border-spacing: 0;\n}\n\n.styles-element-state-pane td {\n    padding: 0;\n}\n\n.styles-animations-controls-pane > * {\n    margin: 6px 4px;\n}\n\n.styles-animations-controls-pane {\n    border-bottom: 1px solid rgb(189, 189, 189);\n    height: 60px;\n    overflow: hidden;\n    background-color: #eee;\n}\n\n.animations-controls {\n    width: 100%;\n    max-width: 200px;\n    display: flex;\n    align-items: center;\n}\n\n.animations-controls > .toolbar {\n    display: inline-block;\n}\n\n.animations-controls > input {\n    flex-grow: 1;\n    margin-right: 10px;\n}\n\n.animations-controls > .playback-label {\n    width: 35px;\n}\n\n.styles-selector {\n    cursor: text;\n}\n\n.metrics {\n    border-bottom: 1px solid #ccc;\n}\n\n.-theme-with-dark-background .metrics {\n    color: #222;\n}\n\n.-theme-with-dark-background .metrics > div:hover {\n    color: #ccc;\n}\n\n.metrics-and-styles .metrics {\n    border-top: 1px solid #ccc;\n    border-bottom: none;\n}\n\n.metrics {\n    min-height: 190px;\n    display: flex;\n    flex-direction: column;\n    -webkit-align-items: center;\n    -webkit-justify-content: center;\n}\n\n.metrics-and-styles,\n.metrics-and-computed {\n    display: flex !important;\n    flex-direction: column !important;\n    position: relative;\n}\n\n.styles-sidebar-pane-toolbar-container {\n    flex-shrink: 0;\n    overflow: hidden;\n}\n\n.styles-sidebar-pane-toolbar {\n    border-bottom: 1px solid #eee;\n    flex-shrink: 0;\n}\n\n.styles-sidebar-pane-filter-box {\n    flex: auto;\n    display: flex;\n}\n\n.styles-sidebar-pane-filter-box > input {\n    outline: none !important;\n    border: none;\n    width: 100%;\n    background: transparent;\n    margin-left: 4px;\n}\n\n.sidebar-pane.composite .metrics-and-styles .metrics {\n    border-bottom: none;\n}\n\n.styles-section.styles-panel-hovered:not(.read-only) span.simple-selector:hover,\n.styles-section.styles-panel-hovered:not(.read-only) .media-text :hover{\n    text-decoration: underline;\n    cursor: default;\n}\n\n.sidebar-separator {\n    background-color: #ddd;\n    padding: 0 5px;\n    border-top: 1px solid #ccc;\n    border-bottom: 1px solid #ccc;\n    color: rgb(50, 50, 50);\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    line-height: 16px;\n}\n\n.sidebar-separator > span.monospace {\n    background: rgb(255, 255, 255);\n    padding: 0px 3px;\n    border-radius: 2px;\n    border: 1px solid #C1C1C1;\n}\n\n.animation-section-body {\n    display: none;\n}\n\n.animation-section-body.expanded {\n    display: block;\n}\n\n.animation-section-body .section {\n    border-bottom: 1px solid rgb(191, 191, 191);\n}\n\n.animationsHeader {\n    padding-top: 23px;\n}\n\n.global-animations-toolbar {\n    position: absolute;\n    top: 0;\n    width: 100%;\n    background-color: #eee;\n    border-bottom: 1px solid rgb(163, 163, 163);\n    padding-left: 10px;\n}\n\n.view > .toolbar {\n    border-bottom: 1px solid #eee;\n}\n\n.events-pane .section:not(:first-of-type) {\n    border-top: 1px solid rgb(231, 231, 231);\n}\n\n.events-pane .section {\n    margin: 0;\n}\n\n.events-pane .toolbar {\n    border-bottom: 1px solid #eee;\n}\n\n.properties-widget-section {\n    padding: 2px 0px 2px 5px;\n    flex: none;\n}\n\n.sidebar-pane-section-toolbar {\n    position: absolute;\n    right: 0;\n    bottom: 0;\n    visibility: hidden;\n    background-color: rgba(255, 255, 255, 0.9);\n}\n\n.styles-pane:not(.is-editing-style) .styles-section.matched-styles:not(.read-only):hover .sidebar-pane-section-toolbar {\n    visibility: visible;\n}\n\n.elements-tree-header {\n    height: 24px;\n    border-top: 1px solid #eee;\n    border-bottom: 1px solid #eee;\n    display: flex;\n    flex-direction: row;\n    align-items: center;\n}\n\n.elements-tree-header-frame {\n    margin-left: 6px;\n    margin-right: 6px;\n    flex: none;\n}\n\n/*# sourceURL=elements/elementsPanel.css */";Runtime.cachedResources["elements/elementsTreeOutline.css"]="/*\n * Copyright (c) 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.elements-disclosure {\n    width: 100%;\n    display: inline-block;\n    line-height: normal;\n}\n\n.elements-disclosure li {\n    /** Keep margin-left & padding-left in sync with ElementsTreeElements.updateDecorators **/\n    padding: 0 0 0 14px;\n    margin-top: 1px;\n    margin-left: -2px;\n    word-wrap: break-word;\n    position: relative;\n    min-height: 14px;\n}\n\n.elements-disclosure li.parent {\n    /** Keep it in sync with ElementsTreeElements.updateDecorators **/\n    margin-left: -13px;\n}\n\n.elements-disclosure li.selected:after {\n    font-style: italic;\n    content: \" == $0\";\n    color: black;\n    opacity: 0.6;\n    position: absolute;\n}\n\n.elements-disclosure li.selected.editing-as-html:after {\n    display: none;\n}\n\n.elements-disclosure ol li.selected:focus:after {\n    color: white;\n}\n\n.elements-disclosure li.parent::before {\n    box-sizing: border-box;\n}\n\n.elements-disclosure li.parent::before {\n    -webkit-user-select: none;\n    -webkit-mask-image: url(Images/treeoutlineTriangles.png);\n    -webkit-mask-size: 32px 24px;\n    content: '\\00a0\\00a0';\n    color: transparent;\n    text-shadow: none;\n    margin-right: -3px;\n}\n\n.elements-disclosure li.always-parent::before {\n    visibility: hidden;\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.1) {\n.elements-disclosure li.parent::before {\n    -webkit-mask-image: url(Images/treeoutlineTriangles_2x.png);\n}\n} /* media */\n\n.elements-disclosure li.parent::before {\n    -webkit-mask-position: 0 0;\n    background-color: rgb(110, 110, 110);\n}\n\n.elements-disclosure li .selection {\n    display: none;\n    z-index: -1;\n}\n\n.elements-disclosure li.hovered:not(.selected) .selection {\n    display: block;\n    left: 3px;\n    right: 3px;\n    background-color: rgba(56, 121, 217, 0.1);\n    border-radius: 5px;\n}\n\n.elements-disclosure li.parent.expanded::before {\n    -webkit-mask-position: -16px 0;\n}\n\n.elements-disclosure li.selected .selection {\n    display: block;\n    background-color: #dadada;\n}\n\n.elements-disclosure ol {\n    list-style-type: none;\n    /** Keep it in sync with ElementsTreeElements.updateDecorators **/\n    -webkit-padding-start: 12px;\n    margin: 0;\n}\n\n.elements-disclosure ol.children {\n    display: none;\n}\n\n.elements-disclosure ol.children.expanded {\n    display: block;\n}\n\n.elements-disclosure li .webkit-html-tag.close {\n    margin-left: -12px;\n}\n\n.elements-disclosure > ol {\n    position: relative;\n    margin: 0;\n    cursor: default;\n    min-width: 100%;\n    min-height: 100%;\n    padding-left: 2px;\n}\n\n.elements-disclosure ol li.selected:focus {\n    color: white;\n}\n\n.elements-disclosure ol li.parent.selected:focus::before {\n    background-color: white;\n}\n\n.elements-disclosure ol li.selected:focus * {\n    color: inherit;\n}\n\n.elements-disclosure ol li.selected:focus .selection {\n    background-color: rgb(56, 121, 217);\n}\n\n.elements-tree-outline ol.shadow-root-depth-4 {\n    background-color: rgba(0, 0, 0, 0.04);\n}\n\n.elements-tree-outline ol.shadow-root-depth-3 {\n    background-color: rgba(0, 0, 0, 0.03);\n}\n\n.elements-tree-outline ol.shadow-root-depth-2 {\n    background-color: rgba(0, 0, 0, 0.02);\n}\n\n.elements-tree-outline ol.shadow-root-depth-1 {\n    background-color: rgba(0, 0, 0, 0.01);\n}\n\n.elements-tree-outline ol.shadow-root-deep {\n    background-color: transparent;\n}\n\n.elements-tree-editor {\n    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2),\n                0 2px 4px rgba(0, 0, 0, 0.2),\n                0 2px 6px rgba(0, 0, 0, 0.1);\n    margin-right: 4px;\n}\n\n.elements-disclosure li.elements-drag-over .selection {\n    display: block;\n    margin-top: -2px;\n    border-top: 2px solid rgb(56, 121, 217);\n}\n\n.elements-disclosure li.in-clipboard .highlight {\n    outline: 1px dotted darkgrey;\n}\n\n.CodeMirror {\n    background-color: white;\n    height: 300px !important;\n}\n\n.CodeMirror-lines {\n    padding: 0;\n}\n\n.CodeMirror pre {\n    padding: 0;\n}\n\nbutton, input, select {\n  font-family: inherit;\n  font-size: inherit;\n}\n\n.editing {\n    -webkit-user-select: text;\n    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2),\n                0 2px 4px rgba(0, 0, 0, 0.2),\n                0 2px 6px rgba(0, 0, 0, 0.1);\n    background-color: white;\n    -webkit-user-modify: read-write-plaintext-only;\n    text-overflow: clip !important;\n    padding-left: 2px;\n    margin-left: -2px;\n    padding-right: 2px;\n    margin-right: -2px;\n    margin-bottom: -1px;\n    padding-bottom: 1px;\n    opacity: 1.0 !important;\n}\n\n.editing,\n.editing * {\n    color: #222 !important;\n    text-decoration: none !important;\n}\n\n.editing br {\n    display: none;\n}\n\n.elements-gutter-decoration {\n    position: absolute;\n    left: 2px;\n    margin-top: 2px;\n    height: 9px;\n    width: 9px;\n    border-radius: 5px;\n    border: 1px solid orange;\n    background-color: orange;\n    cursor: pointer;\n}\n\n.elements-gutter-decoration.elements-has-decorated-children {\n    opacity: 0.5;\n}\n\n.add-attribute {\n    margin-left: 1px;\n    margin-right: 1px;\n    white-space: nowrap;\n}\n\n.elements-tree-nowrap, .elements-tree-nowrap .li {\n    white-space: pre !important;\n}\n\n.elements-disclosure .elements-tree-nowrap li {\n    word-wrap: normal;\n}\n\n/* DOM update highlight */\n@-webkit-keyframes dom-update-highlight-animation {\n    from {\n        background-color: rgb(158, 54, 153);\n        color: white;\n    }\n    80% {\n        background-color: rgb(245, 219, 244);\n        color: inherit;\n    }\n    to {\n        background-color: inherit;\n    }\n}\n\n@-webkit-keyframes dom-update-highlight-animation-dark {\n    from {\n        background-color: rgb(158, 54, 153);\n        color: white;\n    }\n    80% {\n        background-color: #333;\n        color: inherit;\n    }\n    to {\n        background-color: inherit;\n    }\n}\n\n.dom-update-highlight {\n    -webkit-animation: dom-update-highlight-animation 1.4s 1 cubic-bezier(0, 0, 0.2, 1);\n    border-radius: 2px;\n}\n\n:host-context(.-theme-with-dark-background) .dom-update-highlight {\n    -webkit-animation: dom-update-highlight-animation-dark 1.4s 1 cubic-bezier(0, 0, 0.2, 1);\n}\n\n.elements-disclosure.single-node li {\n    padding-left: 2px;\n}\n\n.elements-tree-shortcut-title {\n    color: rgb(87, 87, 87);\n}\n\nol:hover > li > .elements-tree-shortcut-link {\n    display: initial;\n}\n\n.elements-tree-shortcut-link {\n    color: rgb(87, 87, 87);\n    display: none;\n}\n\nol li.selected:focus .webkit-html-tag {\n    color: #a5a5a5;\n}\n\nol li.selected:focus .webkit-html-tag-name,\nol li.selected:focus .webkit-html-close-tag-name,\nol li.selected:focus .webkit-html-attribute-value,\nol li.selected:focus .devtools-link {\n    color: white;\n}\n\nol li.selected:focus .webkit-html-attribute-name {\n    color: #ccc;\n}\n\n.elements-disclosure .gutter-container {\n    position: absolute;\n    top: 0;\n    left: 0;\n    cursor: pointer;\n    width: 15px;\n    height: 15px;\n}\n\n.gutter-menu-icon {\n    display: none;\n    transform: rotate(-90deg) scale(0.8);\n    background-color: white;\n    position: relative;\n    left: -7px;\n    top: -3px;\n}\n\n.elements-disclosure li.selected .gutter-container:not(.has-decorations) .gutter-menu-icon {\n    display: block;\n}\n\n/** Guide line */\nli.selected {\n    z-index: 0;\n}\n\nli.hovered:not(.always-parent) + ol.children, .elements-tree-outline ol.shadow-root, li.selected:not(.always-parent) + ol.children {\n    margin-left: 5px;\n    -webkit-padding-start: 6px;\n    border-width: 1px;\n    border-left-style: solid;\n}\n\nli.hovered:not(.always-parent) + ol.children:not(.shadow-root) {\n    border-color: hsla(0,0%,0%,0.1);\n}\n\n.elements-tree-outline ol.shadow-root {\n    border-color: hsla(0,0%,80%,1);\n}\n\nli.selected:not(.always-parent) + ol.children {\n    border-color: hsla(216,68%,80%,1) !important;\n}\n\n/*# sourceURL=elements/elementsTreeOutline.css */";Runtime.cachedResources["elements/platformFontsWidget.css"]="/**\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    -webkit-user-select: text;\n}\n\n.platform-fonts {\n    flex-shrink: 0;\n}\n\n.font-name {\n    font-weight: bold;\n}\n\n.font-usage {\n    color: #888;\n    padding-left: 3px;\n}\n\n.title {\n    padding: 0 5px;\n    border-top: 1px solid;\n    border-bottom: 1px solid;\n    border-color: #ddd;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    height: 24px;\n    background-color: #f1f1f1;\n    display: flex;\n    align-items: center;\n}\n\n.stats-section {\n    margin: 5px 0;\n}\n\n.font-stats-item {\n    padding-left: 1em;\n}\n\n.font-stats-item .font-delimeter {\n    margin: 0 1ex 0 1ex;\n}\n\n\n/*# sourceURL=elements/platformFontsWidget.css */";Runtime.cachedResources["elements/stylesSectionTree.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline {\n    padding: 0;\n}\n\n.tree-outline li.not-parsed-ok {\n    margin-left: 0;\n}\n\n.tree-outline li.filter-match {\n    background-color: rgba(255, 255, 0, 0.5);\n}\n\n:host-context(.-theme-with-dark-background) .tree-outline li.filter-match {\n    background-color: hsla(133, 100%, 30%, 0.5);\n}\n\n.tree-outline li.overloaded.filter-match {\n    background-color: rgba(255, 255, 0, 0.25);\n}\n\n:host-context(.-theme-with-dark-background) .tree-outline li.overloaded.filter-match {\n    background-color: hsla(133, 100%, 30%, 0.25);\n}\n\n.tree-outline li.not-parsed-ok .exclamation-mark {\n    display: inline-block;\n    position: relative;\n    width: 11px;\n    height: 10px;\n    margin: 0 7px 0 0;\n    top: 1px;\n    left: -36px; /* outdent to compensate for the top-level property indent */\n    -webkit-user-select: none;\n    cursor: default;\n    z-index: 1;\n}\n\n.tree-outline li {\n    margin-left: 12px;\n    padding-left: 22px;\n    white-space: normal;\n    text-overflow: ellipsis;\n    cursor: auto;\n    display: block;\n}\n\n.tree-outline li::before {\n    display: none;\n}\n\n.tree-outline li .webkit-css-property {\n    margin-left: -22px; /* outdent the first line of longhand properties (in an expanded shorthand) to compensate for the \"padding-left\" shift in .tree-outline li */\n}\n\n.tree-outline > li {\n    padding-left: 38px;\n    clear: both;\n    min-height: 14px;\n}\n\n.tree-outline > li .webkit-css-property {\n    margin-left: -38px; /* outdent the first line of the top-level properties to compensate for the \"padding-left\" shift in .tree-outline > li */\n}\n\n.tree-outline > li.child-editing {\n    padding-left: 8px;\n}\n\n.tree-outline > li.child-editing .webkit-css-property {\n    margin-left: 0;\n}\n\n.tree-outline li.child-editing {\n    word-wrap: break-word !important;\n    white-space: normal !important;\n    padding-left: 0;\n}\n\nol:not(.tree-outline) {\n    display: none;\n    margin: 0;\n    -webkit-padding-start: 12px;\n    list-style: none;\n}\n\nol.expanded {\n    display: block;\n}\n\n.tree-outline li .info {\n    padding-top: 4px;\n    padding-bottom: 3px;\n}\n\n.enabled-button {\n    visibility: hidden;\n    float: left;\n    font-size: 10px;\n    margin: 0;\n    vertical-align: top;\n    position: relative;\n    z-index: 1;\n    width: 18px;\n    left: -40px; /* original -2px + (-38px) to compensate for the first line outdent */\n    top: 1px;\n    height: 13px;\n}\n\n.tree-outline li.editing .enabled-button {\n    display: none !important;\n}\n\n.overloaded:not(.has-ignorable-error),\n.inactive,\n.disabled,\n.not-parsed-ok:not(.has-ignorable-error) {\n    text-decoration: line-through;\n}\n\n.has-ignorable-error .webkit-css-property {\n    color: inherit;\n}\n\n.implicit,\n.inherited {\n    opacity: 0.5;\n}\n\n.has-ignorable-error {\n    color: gray;\n}\n\n.tree-outline li.editing {\n    margin-left: 10px;\n    text-overflow: clip;\n}\n\n.tree-outline li.editing-sub-part {\n    padding: 3px 6px 8px 18px;\n    margin: -1px -6px -8px -6px;\n    text-overflow: clip;\n}\n\n:host-context(.no-affect) .tree-outline li {\n    opacity: 0.5;\n}\n\n:host-context(.no-affect) .tree-outline li.editing {\n    opacity: 1.0;\n}\n\n:host-context(.styles-panel-hovered:not(.read-only)) .webkit-css-property:hover,\n:host-context(.styles-panel-hovered:not(.read-only)) .value:hover {\n    text-decoration: underline;\n    cursor: default;\n}\n\n.styles-clipboard-only {\n    display: inline-block;\n    width: 0;\n    opacity: 0;\n    pointer-events: none;\n    white-space: pre;\n}\n\n.tree-outline li.child-editing .styles-clipboard-only {\n    display: none;\n}\n\n/* Matched styles */\n\n:host-context(.matched-styles) .tree-outline li {\n    margin-left: 0 !important;\n}\n\n.expand-icon {\n    -webkit-user-select: none;\n    margin-left: -6px;\n    margin-right: 2px;\n    margin-bottom: -2px;\n}\n\n.tree-outline li:not(.parent) .expand-icon {\n    display: none;\n}\n\n:host-context(.matched-styles:not(.read-only):hover) .enabled-button {\n    visibility: visible;\n}\n\n:host-context(.matched-styles:not(.read-only)) .tree-outline li.disabled .enabled-button {\n    visibility: visible;\n}\n\n:host-context(.matched-styles) ol.expanded {\n    margin-left: 16px;\n}\n\n/*# sourceURL=elements/stylesSectionTree.css */";