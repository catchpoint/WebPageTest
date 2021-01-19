(function(mod){if(typeof exports=="object"&&typeof module=="object")
module.exports=mod();else if(typeof define=="function"&&define.amd)
return define([],mod);else
this.CodeMirror=mod();})(function(){"use strict";var gecko=/gecko\/\d/i.test(navigator.userAgent);var ie_upto10=/MSIE \d/.test(navigator.userAgent);var ie_upto7=ie_upto10&&(document.documentMode==null||document.documentMode<8);var ie_upto8=ie_upto10&&(document.documentMode==null||document.documentMode<9);var ie_upto9=ie_upto10&&(document.documentMode==null||document.documentMode<10);var ie_11up=/Trident\/([7-9]|\d{2,})\./.test(navigator.userAgent);var ie=ie_upto10||ie_11up;var webkit=/WebKit\//.test(navigator.userAgent);var qtwebkit=webkit&&/Qt\/\d+\.\d+/.test(navigator.userAgent);var chrome=/Chrome\//.test(navigator.userAgent);var presto=/Opera\//.test(navigator.userAgent);var safari=/Apple Computer/.test(navigator.vendor);var khtml=/KHTML\//.test(navigator.userAgent);var mac_geMountainLion=/Mac OS X 1\d\D([8-9]|\d\d)\D/.test(navigator.userAgent);var phantom=/PhantomJS/.test(navigator.userAgent);var ios=/AppleWebKit/.test(navigator.userAgent)&&/Mobile\/\w+/.test(navigator.userAgent);var mobile=ios||/Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);var mac=ios||/Mac/.test(navigator.platform);var windows=/win/i.test(navigator.platform);var presto_version=presto&&navigator.userAgent.match(/Version\/(\d*\.\d*)/);if(presto_version)presto_version=Number(presto_version[1]);if(presto_version&&presto_version>=15){presto=false;webkit=true;}
var flipCtrlCmd=mac&&(qtwebkit||presto&&(presto_version==null||presto_version<12.11));var captureRightClick=gecko||(ie&&!ie_upto8);var sawReadOnlySpans=false,sawCollapsedSpans=false;function CodeMirror(place,options){if(!(this instanceof CodeMirror))return new CodeMirror(place,options);this.options=options=options||{};copyObj(defaults,options,false);setGuttersForLineNumbers(options);var doc=options.value;if(typeof doc=="string")doc=new Doc(doc,options.mode);this.doc=doc;var display=this.display=new Display(place,doc);display.wrapper.CodeMirror=this;updateGutters(this);themeChanged(this);if(options.lineWrapping)
this.display.wrapper.className+=" CodeMirror-wrap";if(options.autofocus&&!mobile)focusInput(this);this.state={keyMaps:[],overlays:[],modeGen:0,overwrite:false,focused:false,suppressEdits:false,pasteIncoming:false,cutIncoming:false,draggingText:false,highlight:new Delayed()};if(ie_upto10)setTimeout(bind(resetInput,this,true),20);registerEventHandlers(this);ensureGlobalHandlers();var cm=this;runInOp(this,function(){cm.curOp.forceUpdate=true;attachDoc(cm,doc);if((options.autofocus&&!mobile)||activeElt()==display.input)
setTimeout(bind(onFocus,cm),20);else
onBlur(cm);for(var opt in optionHandlers)if(optionHandlers.hasOwnProperty(opt))
optionHandlers[opt](cm,options[opt],Init);for(var i=0;i<initHooks.length;++i)initHooks[i](cm);});}
function Display(place,doc){var d=this;var input=d.input=elt("textarea",null,null,"position: absolute; padding: 0; width: 1px; height: 1em; outline: none");if(webkit)input.style.width="1000px";else input.setAttribute("wrap","off");if(ios)input.style.border="1px solid black";input.setAttribute("autocorrect","off");input.setAttribute("autocapitalize","off");input.setAttribute("spellcheck","false");d.inputDiv=elt("div",[input],null,"overflow: hidden; position: relative; width: 3px; height: 0px;");d.scrollbarH=elt("div",[elt("div",null,null,"height: 100%; min-height: 1px")],"CodeMirror-hscrollbar");d.scrollbarV=elt("div",[elt("div",null,null,"min-width: 1px")],"CodeMirror-vscrollbar");d.scrollbarFiller=elt("div",null,"CodeMirror-scrollbar-filler");d.gutterFiller=elt("div",null,"CodeMirror-gutter-filler");d.lineDiv=elt("div",null,"CodeMirror-code");d.selectionDiv=elt("div",null,null,"position: relative; z-index: 1");d.cursorDiv=elt("div",null,"CodeMirror-cursors");d.measure=elt("div",null,"CodeMirror-measure");d.lineMeasure=elt("div",null,"CodeMirror-measure");d.lineSpace=elt("div",[d.measure,d.lineMeasure,d.selectionDiv,d.cursorDiv,d.lineDiv],null,"position: relative; outline: none");d.mover=elt("div",[elt("div",[d.lineSpace],"CodeMirror-lines")],null,"position: relative");d.sizer=elt("div",[d.mover],"CodeMirror-sizer");d.heightForcer=elt("div",null,null,"position: absolute; height: "+scrollerCutOff+"px; width: 1px;");d.gutters=elt("div",null,"CodeMirror-gutters");d.lineGutter=null;d.scroller=elt("div",[d.sizer,d.heightForcer,d.gutters],"CodeMirror-scroll");d.scroller.setAttribute("tabIndex","-1");d.wrapper=elt("div",[d.inputDiv,d.scrollbarH,d.scrollbarV,d.scrollbarFiller,d.gutterFiller,d.scroller],"CodeMirror");if(ie_upto7){d.gutters.style.zIndex=-1;d.scroller.style.paddingRight=0;}
if(ios)input.style.width="0px";if(!webkit)d.scroller.draggable=true;if(khtml){d.inputDiv.style.height="1px";d.inputDiv.style.position="absolute";}
if(ie_upto7)d.scrollbarH.style.minHeight=d.scrollbarV.style.minWidth="18px";if(place.appendChild)place.appendChild(d.wrapper);else place(d.wrapper);d.viewFrom=d.viewTo=doc.first;d.view=[];d.externalMeasured=null;d.viewOffset=0;d.lastSizeC=0;d.updateLineNumbers=null;d.lineNumWidth=d.lineNumInnerWidth=d.lineNumChars=null;d.prevInput="";d.alignWidgets=false;d.pollingFast=false;d.poll=new Delayed();d.cachedCharWidth=d.cachedTextHeight=d.cachedPaddingH=null;d.inaccurateSelection=false;d.maxLine=null;d.maxLineLength=0;d.maxLineChanged=false;d.wheelDX=d.wheelDY=d.wheelStartX=d.wheelStartY=null;d.shift=false;d.selForContextMenu=null;}
function loadMode(cm){cm.doc.mode=CodeMirror.getMode(cm.options,cm.doc.modeOption);resetModeState(cm);}
function resetModeState(cm){cm.doc.iter(function(line){if(line.stateAfter)line.stateAfter=null;if(line.styles)line.styles=null;});cm.doc.frontier=cm.doc.first;startWorker(cm,100);cm.state.modeGen++;if(cm.curOp)regChange(cm);}
function wrappingChanged(cm){if(cm.options.lineWrapping){addClass(cm.display.wrapper,"CodeMirror-wrap");cm.display.sizer.style.minWidth="";}else{rmClass(cm.display.wrapper,"CodeMirror-wrap");findMaxLine(cm);}
estimateLineHeights(cm);regChange(cm);clearCaches(cm);setTimeout(function(){updateScrollbars(cm);},100);}
function estimateHeight(cm){var th=textHeight(cm.display),wrapping=cm.options.lineWrapping;var perLine=wrapping&&Math.max(5,cm.display.scroller.clientWidth/charWidth(cm.display)-3);return function(line){if(lineIsHidden(cm.doc,line))return 0;var widgetsHeight=0;if(line.widgets)for(var i=0;i<line.widgets.length;i++){if(line.widgets[i].height)widgetsHeight+=line.widgets[i].height;}
if(wrapping)
return widgetsHeight+(Math.ceil(line.text.length/perLine)||1)*th;else
return widgetsHeight+th;};}
function estimateLineHeights(cm){var doc=cm.doc,est=estimateHeight(cm);doc.iter(function(line){var estHeight=est(line);if(estHeight!=line.height)updateLineHeight(line,estHeight);});}
function keyMapChanged(cm){var map=keyMap[cm.options.keyMap],style=map.style;cm.display.wrapper.className=cm.display.wrapper.className.replace(/\s*cm-keymap-\S+/g,"")+
(style?" cm-keymap-"+style:"");}
function themeChanged(cm){cm.display.wrapper.className=cm.display.wrapper.className.replace(/\s*cm-s-\S+/g,"")+
cm.options.theme.replace(/(^|\s)\s*/g," cm-s-");clearCaches(cm);}
function guttersChanged(cm){updateGutters(cm);regChange(cm);setTimeout(function(){alignHorizontally(cm);},20);}
function updateGutters(cm){var gutters=cm.display.gutters,specs=cm.options.gutters;removeChildren(gutters);for(var i=0;i<specs.length;++i){var gutterClass=specs[i];var gElt=gutters.appendChild(elt("div",null,"CodeMirror-gutter "+gutterClass));if(gutterClass=="CodeMirror-linenumbers"){cm.display.lineGutter=gElt;gElt.style.width=(cm.display.lineNumWidth||1)+"px";}}
gutters.style.display=i?"":"none";updateGutterSpace(cm);}
function updateGutterSpace(cm){var width=cm.display.gutters.offsetWidth;cm.display.sizer.style.marginLeft=width+"px";cm.display.scrollbarH.style.left=cm.options.fixedGutter?width+"px":0;}
function lineLength(line){if(line.height==0)return 0;var len=line.text.length,merged,cur=line;while(merged=collapsedSpanAtStart(cur)){var found=merged.find(0,true);cur=found.from.line;len+=found.from.ch-found.to.ch;}
cur=line;while(merged=collapsedSpanAtEnd(cur)){var found=merged.find(0,true);len-=cur.text.length-found.from.ch;cur=found.to.line;len+=cur.text.length-found.to.ch;}
return len;}
function findMaxLine(cm){var d=cm.display,doc=cm.doc;d.maxLine=getLine(doc,doc.first);d.maxLineLength=lineLength(d.maxLine);d.maxLineChanged=true;doc.iter(function(line){var len=lineLength(line);if(len>d.maxLineLength){d.maxLineLength=len;d.maxLine=line;}});}
function setGuttersForLineNumbers(options){var found=indexOf(options.gutters,"CodeMirror-linenumbers");if(found==-1&&options.lineNumbers){options.gutters=options.gutters.concat(["CodeMirror-linenumbers"]);}else if(found>-1&&!options.lineNumbers){options.gutters=options.gutters.slice(0);options.gutters.splice(found,1);}}
function measureForScrollbars(cm){var scroll=cm.display.scroller;return{clientHeight:scroll.clientHeight,barHeight:cm.display.scrollbarV.clientHeight,scrollWidth:scroll.scrollWidth,clientWidth:scroll.clientWidth,barWidth:cm.display.scrollbarH.clientWidth,docHeight:Math.round(cm.doc.height+paddingVert(cm.display))};}
function updateScrollbars(cm,measure){if(!measure)measure=measureForScrollbars(cm);var d=cm.display;var scrollHeight=measure.docHeight+scrollerCutOff;var needsH=measure.scrollWidth>measure.clientWidth;var needsV=scrollHeight>measure.clientHeight;if(needsV){d.scrollbarV.style.display="block";d.scrollbarV.style.bottom=needsH?scrollbarWidth(d.measure)+"px":"0";d.scrollbarV.firstChild.style.height=Math.max(0,scrollHeight-measure.clientHeight+(measure.barHeight||d.scrollbarV.clientHeight))+"px";}else{d.scrollbarV.style.display="";d.scrollbarV.firstChild.style.height="0";}
if(needsH){d.scrollbarH.style.display="block";d.scrollbarH.style.right=needsV?scrollbarWidth(d.measure)+"px":"0";d.scrollbarH.firstChild.style.width=(measure.scrollWidth-measure.clientWidth+(measure.barWidth||d.scrollbarH.clientWidth))+"px";}else{d.scrollbarH.style.display="";d.scrollbarH.firstChild.style.width="0";}
if(needsH&&needsV){d.scrollbarFiller.style.display="block";d.scrollbarFiller.style.height=d.scrollbarFiller.style.width=scrollbarWidth(d.measure)+"px";}else d.scrollbarFiller.style.display="";if(needsH&&cm.options.coverGutterNextToScrollbar&&cm.options.fixedGutter){d.gutterFiller.style.display="block";d.gutterFiller.style.height=scrollbarWidth(d.measure)+"px";d.gutterFiller.style.width=d.gutters.offsetWidth+"px";}else d.gutterFiller.style.display="";if(!cm.state.checkedOverlayScrollbar&&measure.clientHeight>0){if(scrollbarWidth(d.measure)===0){var w=mac&&!mac_geMountainLion?"12px":"18px";d.scrollbarV.style.minWidth=d.scrollbarH.style.minHeight=w;var barMouseDown=function(e){if(e_target(e)!=d.scrollbarV&&e_target(e)!=d.scrollbarH)
operation(cm,onMouseDown)(e);};on(d.scrollbarV,"mousedown",barMouseDown);on(d.scrollbarH,"mousedown",barMouseDown);}
cm.state.checkedOverlayScrollbar=true;}}
function visibleLines(display,doc,viewPort){var top=viewPort&&viewPort.top!=null?Math.max(0,viewPort.top):display.scroller.scrollTop;top=Math.floor(top-paddingTop(display));var bottom=viewPort&&viewPort.bottom!=null?viewPort.bottom:top+display.wrapper.clientHeight;var from=lineAtHeight(doc,top),to=lineAtHeight(doc,bottom);if(viewPort&&viewPort.ensure){var ensureFrom=viewPort.ensure.from.line,ensureTo=viewPort.ensure.to.line;if(ensureFrom<from)
return{from:ensureFrom,to:lineAtHeight(doc,heightAtLine(getLine(doc,ensureFrom))+display.wrapper.clientHeight)};if(Math.min(ensureTo,doc.lastLine())>=to)
return{from:lineAtHeight(doc,heightAtLine(getLine(doc,ensureTo))-display.wrapper.clientHeight),to:ensureTo};}
return{from:from,to:to};}
function alignHorizontally(cm){var display=cm.display,view=display.view;if(!display.alignWidgets&&(!display.gutters.firstChild||!cm.options.fixedGutter))return;var comp=compensateForHScroll(display)-display.scroller.scrollLeft+cm.doc.scrollLeft;var gutterW=display.gutters.offsetWidth,left=comp+"px";for(var i=0;i<view.length;i++)if(!view[i].hidden){if(cm.options.fixedGutter&&view[i].gutter)
view[i].gutter.style.left=left;var align=view[i].alignable;if(align)for(var j=0;j<align.length;j++)
align[j].style.left=left;}
if(cm.options.fixedGutter)
display.gutters.style.left=(comp+gutterW)+"px";}
function maybeUpdateLineNumberWidth(cm){if(!cm.options.lineNumbers)return false;var doc=cm.doc,last=lineNumberFor(cm.options,doc.first+doc.size-1),display=cm.display;if(last.length!=display.lineNumChars){var test=display.measure.appendChild(elt("div",[elt("div",last)],"CodeMirror-linenumber CodeMirror-gutter-elt"));var innerW=test.firstChild.offsetWidth,padding=test.offsetWidth-innerW;display.lineGutter.style.width="";display.lineNumInnerWidth=Math.max(innerW,display.lineGutter.offsetWidth-padding);display.lineNumWidth=display.lineNumInnerWidth+padding;display.lineNumChars=display.lineNumInnerWidth?last.length:-1;display.lineGutter.style.width=display.lineNumWidth+"px";updateGutterSpace(cm);return true;}
return false;}
function lineNumberFor(options,i){return String(options.lineNumberFormatter(i+options.firstLineNumber));}
function compensateForHScroll(display){return display.scroller.getBoundingClientRect().left-display.sizer.getBoundingClientRect().left;}
function updateDisplay(cm,viewPort,forced){var oldFrom=cm.display.viewFrom,oldTo=cm.display.viewTo,updated;var visible=visibleLines(cm.display,cm.doc,viewPort);for(var first=true;;first=false){var oldWidth=cm.display.scroller.clientWidth;if(!updateDisplayInner(cm,visible,forced))break;updated=true;if(cm.display.maxLineChanged&&!cm.options.lineWrapping)
adjustContentWidth(cm);var barMeasure=measureForScrollbars(cm);updateSelection(cm);setDocumentHeight(cm,barMeasure);updateScrollbars(cm,barMeasure);if(webkit&&cm.options.lineWrapping)
checkForWebkitWidthBug(cm,barMeasure);if(first&&cm.options.lineWrapping&&oldWidth!=cm.display.scroller.clientWidth){forced=true;continue;}
forced=false;if(viewPort&&viewPort.top!=null)
viewPort={top:Math.min(barMeasure.docHeight-scrollerCutOff-barMeasure.clientHeight,viewPort.top)};visible=visibleLines(cm.display,cm.doc,viewPort);if(visible.from>=cm.display.viewFrom&&visible.to<=cm.display.viewTo)
break;}
cm.display.updateLineNumbers=null;if(updated){signalLater(cm,"update",cm);if(cm.display.viewFrom!=oldFrom||cm.display.viewTo!=oldTo)
signalLater(cm,"viewportChange",cm,cm.display.viewFrom,cm.display.viewTo);}
return updated;}
function updateDisplayInner(cm,visible,forced){var display=cm.display,doc=cm.doc;if(!display.wrapper.offsetWidth){resetView(cm);return;}
if(!forced&&visible.from>=display.viewFrom&&visible.to<=display.viewTo&&countDirtyView(cm)==0)
return;if(maybeUpdateLineNumberWidth(cm))
resetView(cm);var dims=getDimensions(cm);var end=doc.first+doc.size;var from=Math.max(visible.from-cm.options.viewportMargin,doc.first);var to=Math.min(end,visible.to+cm.options.viewportMargin);if(display.viewFrom<from&&from-display.viewFrom<20)from=Math.max(doc.first,display.viewFrom);if(display.viewTo>to&&display.viewTo-to<20)to=Math.min(end,display.viewTo);if(sawCollapsedSpans){from=visualLineNo(cm.doc,from);to=visualLineEndNo(cm.doc,to);}
var different=from!=display.viewFrom||to!=display.viewTo||display.lastSizeC!=display.wrapper.clientHeight;adjustView(cm,from,to);display.viewOffset=heightAtLine(getLine(cm.doc,display.viewFrom));cm.display.mover.style.top=display.viewOffset+"px";var toUpdate=countDirtyView(cm);if(!different&&toUpdate==0&&!forced)return;var focused=activeElt();if(toUpdate>4)display.lineDiv.style.display="none";patchDisplay(cm,display.updateLineNumbers,dims);if(toUpdate>4)display.lineDiv.style.display="";if(focused&&activeElt()!=focused&&focused.offsetHeight)focused.focus();removeChildren(display.cursorDiv);removeChildren(display.selectionDiv);if(different){display.lastSizeC=display.wrapper.clientHeight;startWorker(cm,400);}
updateHeightsInViewport(cm);return true;}
function adjustContentWidth(cm){var display=cm.display;var width=measureChar(cm,display.maxLine,display.maxLine.text.length).left;display.maxLineChanged=false;var minWidth=Math.max(0,width+3);var maxScrollLeft=Math.max(0,display.sizer.offsetLeft+minWidth+scrollerCutOff-display.scroller.clientWidth);display.sizer.style.minWidth=minWidth+"px";if(maxScrollLeft<cm.doc.scrollLeft)
setScrollLeft(cm,Math.min(display.scroller.scrollLeft,maxScrollLeft),true);}
function setDocumentHeight(cm,measure){cm.display.sizer.style.minHeight=cm.display.heightForcer.style.top=measure.docHeight+"px";cm.display.gutters.style.height=Math.max(measure.docHeight,measure.clientHeight-scrollerCutOff)+"px";}
function checkForWebkitWidthBug(cm,measure){if(cm.display.sizer.offsetWidth+cm.display.gutters.offsetWidth<cm.display.scroller.clientWidth-1){cm.display.sizer.style.minHeight=cm.display.heightForcer.style.top="0px";cm.display.gutters.style.height=measure.docHeight+"px";}}
function updateHeightsInViewport(cm){var display=cm.display;var prevBottom=display.lineDiv.offsetTop;for(var i=0;i<display.view.length;i++){var cur=display.view[i],height;if(cur.hidden)continue;if(ie_upto7){var bot=cur.node.offsetTop+cur.node.offsetHeight;height=bot-prevBottom;prevBottom=bot;}else{var box=cur.node.getBoundingClientRect();height=box.bottom-box.top;}
var diff=cur.line.height-height;if(height<2)height=textHeight(display);if(diff>.001||diff<-.001){updateLineHeight(cur.line,height);updateWidgetHeight(cur.line);if(cur.rest)for(var j=0;j<cur.rest.length;j++)
updateWidgetHeight(cur.rest[j]);}}}
function updateWidgetHeight(line){if(line.widgets)for(var i=0;i<line.widgets.length;++i)
line.widgets[i].height=line.widgets[i].node.offsetHeight;}
function getDimensions(cm){var d=cm.display,left={},width={};for(var n=d.gutters.firstChild,i=0;n;n=n.nextSibling,++i){left[cm.options.gutters[i]]=n.offsetLeft;width[cm.options.gutters[i]]=n.offsetWidth;}
return{fixedPos:compensateForHScroll(d),gutterTotalWidth:d.gutters.offsetWidth,gutterLeft:left,gutterWidth:width,wrapperWidth:d.wrapper.clientWidth};}
function patchDisplay(cm,updateNumbersFrom,dims){var display=cm.display,lineNumbers=cm.options.lineNumbers;var container=display.lineDiv,cur=container.firstChild;function rm(node){var next=node.nextSibling;if(webkit&&mac&&cm.display.currentWheelTarget==node)
node.style.display="none";else
node.parentNode.removeChild(node);return next;}
var view=display.view,lineN=display.viewFrom;for(var i=0;i<view.length;i++){var lineView=view[i];if(lineView.hidden){}else if(!lineView.node){var node=buildLineElement(cm,lineView,lineN,dims);container.insertBefore(node,cur);}else{while(cur!=lineView.node)cur=rm(cur);var updateNumber=lineNumbers&&updateNumbersFrom!=null&&updateNumbersFrom<=lineN&&lineView.lineNumber;if(lineView.changes){if(indexOf(lineView.changes,"gutter")>-1)updateNumber=false;updateLineForChanges(cm,lineView,lineN,dims);}
if(updateNumber){removeChildren(lineView.lineNumber);lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options,lineN)));}
cur=lineView.node.nextSibling;}
lineN+=lineView.size;}
while(cur)cur=rm(cur);}
function updateLineForChanges(cm,lineView,lineN,dims){for(var j=0;j<lineView.changes.length;j++){var type=lineView.changes[j];if(type=="text")updateLineText(cm,lineView);else if(type=="gutter")updateLineGutter(cm,lineView,lineN,dims);else if(type=="class")updateLineClasses(lineView);else if(type=="widget")updateLineWidgets(lineView,dims);}
lineView.changes=null;}
function ensureLineWrapped(lineView){if(lineView.node==lineView.text){lineView.node=elt("div",null,null,"position: relative");if(lineView.text.parentNode)
lineView.text.parentNode.replaceChild(lineView.node,lineView.text);lineView.node.appendChild(lineView.text);if(ie_upto7)lineView.node.style.zIndex=2;}
return lineView.node;}
function updateLineBackground(lineView){var cls=lineView.bgClass?lineView.bgClass+" "+(lineView.line.bgClass||""):lineView.line.bgClass;if(cls)cls+=" CodeMirror-linebackground";if(lineView.background){if(cls)lineView.background.className=cls;else{lineView.background.parentNode.removeChild(lineView.background);lineView.background=null;}}else if(cls){var wrap=ensureLineWrapped(lineView);lineView.background=wrap.insertBefore(elt("div",null,cls),wrap.firstChild);}}
function getLineContent(cm,lineView){var ext=cm.display.externalMeasured;if(ext&&ext.line==lineView.line){cm.display.externalMeasured=null;lineView.measure=ext.measure;return ext.built;}
return buildLineContent(cm,lineView);}
function updateLineText(cm,lineView){var cls=lineView.text.className;var built=getLineContent(cm,lineView);if(lineView.text==lineView.node)lineView.node=built.pre;lineView.text.parentNode.replaceChild(built.pre,lineView.text);lineView.text=built.pre;if(built.bgClass!=lineView.bgClass||built.textClass!=lineView.textClass){lineView.bgClass=built.bgClass;lineView.textClass=built.textClass;updateLineClasses(lineView);}else if(cls){lineView.text.className=cls;}}
function updateLineClasses(lineView){updateLineBackground(lineView);if(lineView.line.wrapClass)
ensureLineWrapped(lineView).className=lineView.line.wrapClass;else if(lineView.node!=lineView.text)
lineView.node.className="";var textClass=lineView.textClass?lineView.textClass+" "+(lineView.line.textClass||""):lineView.line.textClass;lineView.text.className=textClass||"";}
function updateLineGutter(cm,lineView,lineN,dims){if(lineView.gutter){lineView.node.removeChild(lineView.gutter);lineView.gutter=null;}
var markers=lineView.line.gutterMarkers;if(cm.options.lineNumbers||markers){var wrap=ensureLineWrapped(lineView);var gutterWrap=lineView.gutter=wrap.insertBefore(elt("div",null,"CodeMirror-gutter-wrapper","position: absolute; left: "+
(cm.options.fixedGutter?dims.fixedPos:-dims.gutterTotalWidth)+"px"),lineView.text);if(cm.options.lineNumbers&&(!markers||!markers["CodeMirror-linenumbers"]))
lineView.lineNumber=gutterWrap.appendChild(elt("div",lineNumberFor(cm.options,lineN),"CodeMirror-linenumber CodeMirror-gutter-elt","left: "+dims.gutterLeft["CodeMirror-linenumbers"]+"px; width: "
+cm.display.lineNumInnerWidth+"px"));if(markers)for(var k=0;k<cm.options.gutters.length;++k){var id=cm.options.gutters[k],found=markers.hasOwnProperty(id)&&markers[id];if(found)
gutterWrap.appendChild(elt("div",[found],"CodeMirror-gutter-elt","left: "+
dims.gutterLeft[id]+"px; width: "+dims.gutterWidth[id]+"px"));}}}
function updateLineWidgets(lineView,dims){if(lineView.alignable)lineView.alignable=null;for(var node=lineView.node.firstChild,next;node;node=next){var next=node.nextSibling;if(node.className=="CodeMirror-linewidget")
lineView.node.removeChild(node);}
insertLineWidgets(lineView,dims);}
function buildLineElement(cm,lineView,lineN,dims){var built=getLineContent(cm,lineView);lineView.text=lineView.node=built.pre;if(built.bgClass)lineView.bgClass=built.bgClass;if(built.textClass)lineView.textClass=built.textClass;updateLineClasses(lineView);updateLineGutter(cm,lineView,lineN,dims);insertLineWidgets(lineView,dims);return lineView.node;}
function insertLineWidgets(lineView,dims){insertLineWidgetsFor(lineView.line,lineView,dims,true);if(lineView.rest)for(var i=0;i<lineView.rest.length;i++)
insertLineWidgetsFor(lineView.rest[i],lineView,dims,false);}
function insertLineWidgetsFor(line,lineView,dims,allowAbove){if(!line.widgets)return;var wrap=ensureLineWrapped(lineView);for(var i=0,ws=line.widgets;i<ws.length;++i){var widget=ws[i],node=elt("div",[widget.node],"CodeMirror-linewidget");if(!widget.handleMouseEvents)node.ignoreEvents=true;positionLineWidget(widget,node,lineView,dims);if(allowAbove&&widget.above)
wrap.insertBefore(node,lineView.gutter||lineView.text);else
wrap.appendChild(node);signalLater(widget,"redraw");}}
function positionLineWidget(widget,node,lineView,dims){if(widget.noHScroll){(lineView.alignable||(lineView.alignable=[])).push(node);var width=dims.wrapperWidth;node.style.left=dims.fixedPos+"px";if(!widget.coverGutter){width-=dims.gutterTotalWidth;node.style.paddingLeft=dims.gutterTotalWidth+"px";}
node.style.width=width+"px";}
if(widget.coverGutter){node.style.zIndex=5;node.style.position="relative";if(!widget.noHScroll)node.style.marginLeft=-dims.gutterTotalWidth+"px";}}
var Pos=CodeMirror.Pos=function(line,ch){if(!(this instanceof Pos))return new Pos(line,ch);this.line=line;this.ch=ch;};var cmp=CodeMirror.cmpPos=function(a,b){return a.line-b.line||a.ch-b.ch;};function copyPos(x){return Pos(x.line,x.ch);}
function maxPos(a,b){return cmp(a,b)<0?b:a;}
function minPos(a,b){return cmp(a,b)<0?a:b;}
function Selection(ranges,primIndex){this.ranges=ranges;this.primIndex=primIndex;}
Selection.prototype={primary:function(){return this.ranges[this.primIndex];},equals:function(other){if(other==this)return true;if(other.primIndex!=this.primIndex||other.ranges.length!=this.ranges.length)return false;for(var i=0;i<this.ranges.length;i++){var here=this.ranges[i],there=other.ranges[i];if(cmp(here.anchor,there.anchor)!=0||cmp(here.head,there.head)!=0)return false;}
return true;},deepCopy:function(){for(var out=[],i=0;i<this.ranges.length;i++)
out[i]=new Range(copyPos(this.ranges[i].anchor),copyPos(this.ranges[i].head));return new Selection(out,this.primIndex);},somethingSelected:function(){for(var i=0;i<this.ranges.length;i++)
if(!this.ranges[i].empty())return true;return false;},contains:function(pos,end){if(!end)end=pos;for(var i=0;i<this.ranges.length;i++){var range=this.ranges[i];if(cmp(end,range.from())>=0&&cmp(pos,range.to())<=0)
return i;}
return-1;}};function Range(anchor,head){this.anchor=anchor;this.head=head;}
Range.prototype={from:function(){return minPos(this.anchor,this.head);},to:function(){return maxPos(this.anchor,this.head);},empty:function(){return this.head.line==this.anchor.line&&this.head.ch==this.anchor.ch;}};function normalizeSelection(ranges,primIndex){var prim=ranges[primIndex];ranges.sort(function(a,b){return cmp(a.from(),b.from());});primIndex=indexOf(ranges,prim);for(var i=1;i<ranges.length;i++){var cur=ranges[i],prev=ranges[i-1];if(cmp(prev.to(),cur.from())>=0){var from=minPos(prev.from(),cur.from()),to=maxPos(prev.to(),cur.to());var inv=prev.empty()?cur.from()==cur.head:prev.from()==prev.head;if(i<=primIndex)--primIndex;ranges.splice(--i,2,new Range(inv?to:from,inv?from:to));}}
return new Selection(ranges,primIndex);}
function simpleSelection(anchor,head){return new Selection([new Range(anchor,head||anchor)],0);}
function clipLine(doc,n){return Math.max(doc.first,Math.min(n,doc.first+doc.size-1));}
function clipPos(doc,pos){if(pos.line<doc.first)return Pos(doc.first,0);var last=doc.first+doc.size-1;if(pos.line>last)return Pos(last,getLine(doc,last).text.length);return clipToLen(pos,getLine(doc,pos.line).text.length);}
function clipToLen(pos,linelen){var ch=pos.ch;if(ch==null||ch>linelen)return Pos(pos.line,linelen);else if(ch<0)return Pos(pos.line,0);else return pos;}
function isLine(doc,l){return l>=doc.first&&l<doc.first+doc.size;}
function clipPosArray(doc,array){for(var out=[],i=0;i<array.length;i++)out[i]=clipPos(doc,array[i]);return out;}
function extendRange(doc,range,head,other){if(doc.cm&&doc.cm.display.shift||doc.extend){var anchor=range.anchor;if(other){var posBefore=cmp(head,anchor)<0;if(posBefore!=(cmp(other,anchor)<0)){anchor=head;head=other;}else if(posBefore!=(cmp(head,other)<0)){head=other;}}
return new Range(anchor,head);}else{return new Range(other||head,head);}}
function extendSelection(doc,head,other,options){setSelection(doc,new Selection([extendRange(doc,doc.sel.primary(),head,other)],0),options);}
function extendSelections(doc,heads,options){for(var out=[],i=0;i<doc.sel.ranges.length;i++)
out[i]=extendRange(doc,doc.sel.ranges[i],heads[i],null);var newSel=normalizeSelection(out,doc.sel.primIndex);setSelection(doc,newSel,options);}
function replaceOneSelection(doc,i,range,options){var ranges=doc.sel.ranges.slice(0);ranges[i]=range;setSelection(doc,normalizeSelection(ranges,doc.sel.primIndex),options);}
function setSimpleSelection(doc,anchor,head,options){setSelection(doc,simpleSelection(anchor,head),options);}
function filterSelectionChange(doc,sel){var obj={ranges:sel.ranges,update:function(ranges){this.ranges=[];for(var i=0;i<ranges.length;i++)
this.ranges[i]=new Range(clipPos(doc,ranges[i].anchor),clipPos(doc,ranges[i].head));}};signal(doc,"beforeSelectionChange",doc,obj);if(doc.cm)signal(doc.cm,"beforeSelectionChange",doc.cm,obj);if(obj.ranges!=sel.ranges)return normalizeSelection(obj.ranges,obj.ranges.length-1);else return sel;}
function setSelectionReplaceHistory(doc,sel,options){var done=doc.history.done,last=lst(done);if(last&&last.ranges){done[done.length-1]=sel;setSelectionNoUndo(doc,sel,options);}else{setSelection(doc,sel,options);}}
function setSelection(doc,sel,options){setSelectionNoUndo(doc,sel,options);addSelectionToHistory(doc,doc.sel,doc.cm?doc.cm.curOp.id:NaN,options);}
function setSelectionNoUndo(doc,sel,options){if(hasHandler(doc,"beforeSelectionChange")||doc.cm&&hasHandler(doc.cm,"beforeSelectionChange"))
sel=filterSelectionChange(doc,sel);var bias=cmp(sel.primary().head,doc.sel.primary().head)<0?-1:1;setSelectionInner(doc,skipAtomicInSelection(doc,sel,bias,true));if(!(options&&options.scroll===false)&&doc.cm)
ensureCursorVisible(doc.cm);}
function setSelectionInner(doc,sel){if(sel.equals(doc.sel))return;doc.sel=sel;if(doc.cm){doc.cm.curOp.updateInput=doc.cm.curOp.selectionChanged=true;signalCursorActivity(doc.cm);}
signalLater(doc,"cursorActivity",doc);}
function reCheckSelection(doc){setSelectionInner(doc,skipAtomicInSelection(doc,doc.sel,null,false),sel_dontScroll);}
function skipAtomicInSelection(doc,sel,bias,mayClear){var out;for(var i=0;i<sel.ranges.length;i++){var range=sel.ranges[i];var newAnchor=skipAtomic(doc,range.anchor,bias,mayClear);var newHead=skipAtomic(doc,range.head,bias,mayClear);if(out||newAnchor!=range.anchor||newHead!=range.head){if(!out)out=sel.ranges.slice(0,i);out[i]=new Range(newAnchor,newHead);}}
return out?normalizeSelection(out,sel.primIndex):sel;}
function skipAtomic(doc,pos,bias,mayClear){var flipped=false,curPos=pos;var dir=bias||1;doc.cantEdit=false;search:for(;;){var line=getLine(doc,curPos.line);if(line.markedSpans){for(var i=0;i<line.markedSpans.length;++i){var sp=line.markedSpans[i],m=sp.marker;if((sp.from==null||(m.inclusiveLeft?sp.from<=curPos.ch:sp.from<curPos.ch))&&(sp.to==null||(m.inclusiveRight?sp.to>=curPos.ch:sp.to>curPos.ch))){if(mayClear){signal(m,"beforeCursorEnter");if(m.explicitlyCleared){if(!line.markedSpans)break;else{--i;continue;}}}
if(!m.atomic)continue;var newPos=m.find(dir<0?-1:1);if(cmp(newPos,curPos)==0){newPos.ch+=dir;if(newPos.ch<0){if(newPos.line>doc.first)newPos=clipPos(doc,Pos(newPos.line-1));else newPos=null;}else if(newPos.ch>line.text.length){if(newPos.line<doc.first+doc.size-1)newPos=Pos(newPos.line+1,0);else newPos=null;}
if(!newPos){if(flipped){if(!mayClear)return skipAtomic(doc,pos,bias,true);doc.cantEdit=true;return Pos(doc.first,0);}
flipped=true;newPos=pos;dir=-dir;}}
curPos=newPos;continue search;}}}
return curPos;}}
function updateSelection(cm){var display=cm.display,doc=cm.doc;var curFragment=document.createDocumentFragment();var selFragment=document.createDocumentFragment();for(var i=0;i<doc.sel.ranges.length;i++){var range=doc.sel.ranges[i];var collapsed=range.empty();if(collapsed||cm.options.showCursorWhenSelecting)
drawSelectionCursor(cm,range,curFragment);if(!collapsed)
drawSelectionRange(cm,range,selFragment);}
if(cm.options.moveInputWithCursor){var headPos=cursorCoords(cm,doc.sel.primary().head,"div");var wrapOff=display.wrapper.getBoundingClientRect(),lineOff=display.lineDiv.getBoundingClientRect();var top=Math.max(0,Math.min(display.wrapper.clientHeight-10,headPos.top+lineOff.top-wrapOff.top));var left=Math.max(0,Math.min(display.wrapper.clientWidth-10,headPos.left+lineOff.left-wrapOff.left));display.inputDiv.style.top=top+"px";display.inputDiv.style.left=left+"px";}
removeChildrenAndAdd(display.cursorDiv,curFragment);removeChildrenAndAdd(display.selectionDiv,selFragment);}
function drawSelectionCursor(cm,range,output){var pos=cursorCoords(cm,range.head,"div");var cursor=output.appendChild(elt("div","\u00a0","CodeMirror-cursor"));cursor.style.left=pos.left+"px";cursor.style.top=pos.top+"px";cursor.style.height=Math.max(0,pos.bottom-pos.top)*cm.options.cursorHeight+"px";if(pos.other){var otherCursor=output.appendChild(elt("div","\u00a0","CodeMirror-cursor CodeMirror-secondarycursor"));otherCursor.style.display="";otherCursor.style.left=pos.other.left+"px";otherCursor.style.top=pos.other.top+"px";otherCursor.style.height=(pos.other.bottom-pos.other.top)*.85+"px";}}
function drawSelectionRange(cm,range,output){var display=cm.display,doc=cm.doc;var fragment=document.createDocumentFragment();var padding=paddingH(cm.display),leftSide=padding.left,rightSide=display.lineSpace.offsetWidth-padding.right;function add(left,top,width,bottom){if(top<0)top=0;top=Math.round(top);bottom=Math.round(bottom);fragment.appendChild(elt("div",null,"CodeMirror-selected","position: absolute; left: "+left+"px; top: "+top+"px; width: "+(width==null?rightSide-left:width)+"px; height: "+(bottom-top)+"px"));}
function drawForLine(line,fromArg,toArg){var lineObj=getLine(doc,line);var lineLen=lineObj.text.length;var start,end;function coords(ch,bias){return charCoords(cm,Pos(line,ch),"div",lineObj,bias);}
iterateBidiSections(getOrder(lineObj),fromArg||0,toArg==null?lineLen:toArg,function(from,to,dir){var leftPos=coords(from,"left"),rightPos,left,right;if(from==to){rightPos=leftPos;left=right=leftPos.left;}else{rightPos=coords(to-1,"right");if(dir=="rtl"){var tmp=leftPos;leftPos=rightPos;rightPos=tmp;}
left=leftPos.left;right=rightPos.right;}
if(fromArg==null&&from==0)left=leftSide;if(rightPos.top-leftPos.top>3){add(left,leftPos.top,null,leftPos.bottom);left=leftSide;if(leftPos.bottom<rightPos.top)add(left,leftPos.bottom,null,rightPos.top);}
if(toArg==null&&to==lineLen)right=rightSide;if(!start||leftPos.top<start.top||leftPos.top==start.top&&leftPos.left<start.left)
start=leftPos;if(!end||rightPos.bottom>end.bottom||rightPos.bottom==end.bottom&&rightPos.right>end.right)
end=rightPos;if(left<leftSide+1)left=leftSide;add(left,rightPos.top,right-left,rightPos.bottom);});return{start:start,end:end};}
var sFrom=range.from(),sTo=range.to();if(sFrom.line==sTo.line){drawForLine(sFrom.line,sFrom.ch,sTo.ch);}else{var fromLine=getLine(doc,sFrom.line),toLine=getLine(doc,sTo.line);var singleVLine=visualLine(fromLine)==visualLine(toLine);var leftEnd=drawForLine(sFrom.line,sFrom.ch,singleVLine?fromLine.text.length+1:null).end;var rightStart=drawForLine(sTo.line,singleVLine?0:null,sTo.ch).start;if(singleVLine){if(leftEnd.top<rightStart.top-2){add(leftEnd.right,leftEnd.top,null,leftEnd.bottom);add(leftSide,rightStart.top,rightStart.left,rightStart.bottom);}else{add(leftEnd.right,leftEnd.top,rightStart.left-leftEnd.right,leftEnd.bottom);}}
if(leftEnd.bottom<rightStart.top)
add(leftSide,leftEnd.bottom,null,rightStart.top);}
output.appendChild(fragment);}
function restartBlink(cm){if(!cm.state.focused)return;var display=cm.display;clearInterval(display.blinker);var on=true;display.cursorDiv.style.visibility="";if(cm.options.cursorBlinkRate>0)
display.blinker=setInterval(function(){display.cursorDiv.style.visibility=(on=!on)?"":"hidden";},cm.options.cursorBlinkRate);}
function startWorker(cm,time){if(cm.doc.mode.startState&&cm.doc.frontier<cm.display.viewTo)
cm.state.highlight.set(time,bind(highlightWorker,cm));}
function highlightWorker(cm){var doc=cm.doc;if(doc.frontier<doc.first)doc.frontier=doc.first;if(doc.frontier>=cm.display.viewTo)return;var end=+new Date+cm.options.workTime;var state=copyState(doc.mode,getStateBefore(cm,doc.frontier));runInOp(cm,function(){doc.iter(doc.frontier,Math.min(doc.first+doc.size,cm.display.viewTo+500),function(line){if(doc.frontier>=cm.display.viewFrom){var oldStyles=line.styles;var highlighted=highlightLine(cm,line,state,true);line.styles=highlighted.styles;if(highlighted.classes)line.styleClasses=highlighted.classes;else if(line.styleClasses)line.styleClasses=null;var ischange=!oldStyles||oldStyles.length!=line.styles.length;for(var i=0;!ischange&&i<oldStyles.length;++i)ischange=oldStyles[i]!=line.styles[i];if(ischange)regLineChange(cm,doc.frontier,"text");line.stateAfter=copyState(doc.mode,state);}else{processLine(cm,line.text,state);line.stateAfter=doc.frontier%5==0?copyState(doc.mode,state):null;}
++doc.frontier;if(+new Date>end){startWorker(cm,cm.options.workDelay);return true;}});});}
function findStartLine(cm,n,precise){var minindent,minline,doc=cm.doc;var lim=precise?-1:n-(cm.doc.mode.innerMode?1000:100);for(var search=n;search>lim;--search){if(search<=doc.first)return doc.first;var line=getLine(doc,search-1);if(line.stateAfter&&(!precise||search<=doc.frontier))return search;var indented=countColumn(line.text,null,cm.options.tabSize);if(minline==null||minindent>indented){minline=search-1;minindent=indented;}}
return minline;}
function getStateBefore(cm,n,precise){var doc=cm.doc,display=cm.display;if(!doc.mode.startState)return true;var pos=findStartLine(cm,n,precise),state=pos>doc.first&&getLine(doc,pos-1).stateAfter;if(!state)state=startState(doc.mode);else state=copyState(doc.mode,state);doc.iter(pos,n,function(line){processLine(cm,line.text,state);var save=pos==n-1||pos%5==0||pos>=display.viewFrom&&pos<display.viewTo;line.stateAfter=save?copyState(doc.mode,state):null;++pos;});if(precise)doc.frontier=pos;return state;}
function paddingTop(display){return display.lineSpace.offsetTop;}
function paddingVert(display){return display.mover.offsetHeight-display.lineSpace.offsetHeight;}
function paddingH(display){if(display.cachedPaddingH)return display.cachedPaddingH;var e=removeChildrenAndAdd(display.measure,elt("pre","x"));var style=window.getComputedStyle?window.getComputedStyle(e):e.currentStyle;var data={left:parseInt(style.paddingLeft),right:parseInt(style.paddingRight)};if(!isNaN(data.left)&&!isNaN(data.right))display.cachedPaddingH=data;return data;}
function ensureLineHeights(cm,lineView,rect){var wrapping=cm.options.lineWrapping;var curWidth=wrapping&&cm.display.scroller.clientWidth;if(!lineView.measure.heights||wrapping&&lineView.measure.width!=curWidth){var heights=lineView.measure.heights=[];if(wrapping){lineView.measure.width=curWidth;var rects=lineView.text.firstChild.getClientRects();for(var i=0;i<rects.length-1;i++){var cur=rects[i],next=rects[i+1];if(Math.abs(cur.bottom-next.bottom)>2)
heights.push((cur.bottom+next.top)/2-rect.top);}}
heights.push(rect.bottom-rect.top);}}
function mapFromLineView(lineView,line,lineN){if(lineView.line==line)
return{map:lineView.measure.map,cache:lineView.measure.cache};for(var i=0;i<lineView.rest.length;i++)
if(lineView.rest[i]==line)
return{map:lineView.measure.maps[i],cache:lineView.measure.caches[i]};for(var i=0;i<lineView.rest.length;i++)
if(lineNo(lineView.rest[i])>lineN)
return{map:lineView.measure.maps[i],cache:lineView.measure.caches[i],before:true};}
function updateExternalMeasurement(cm,line){line=visualLine(line);var lineN=lineNo(line);var view=cm.display.externalMeasured=new LineView(cm.doc,line,lineN);view.lineN=lineN;var built=view.built=buildLineContent(cm,view);view.text=built.pre;removeChildrenAndAdd(cm.display.lineMeasure,built.pre);return view;}
function measureChar(cm,line,ch,bias){return measureCharPrepared(cm,prepareMeasureForLine(cm,line),ch,bias);}
function findViewForLine(cm,lineN){if(lineN>=cm.display.viewFrom&&lineN<cm.display.viewTo)
return cm.display.view[findViewIndex(cm,lineN)];var ext=cm.display.externalMeasured;if(ext&&lineN>=ext.lineN&&lineN<ext.lineN+ext.size)
return ext;}
function prepareMeasureForLine(cm,line){var lineN=lineNo(line);var view=findViewForLine(cm,lineN);if(view&&!view.text)
view=null;else if(view&&view.changes)
updateLineForChanges(cm,view,lineN,getDimensions(cm));if(!view)
view=updateExternalMeasurement(cm,line);var info=mapFromLineView(view,line,lineN);return{line:line,view:view,rect:null,map:info.map,cache:info.cache,before:info.before,hasHeights:false};}
function measureCharPrepared(cm,prepared,ch,bias){if(prepared.before)ch=-1;var key=ch+(bias||""),found;if(prepared.cache.hasOwnProperty(key)){found=prepared.cache[key];}else{if(!prepared.rect)
prepared.rect=prepared.view.text.getBoundingClientRect();if(!prepared.hasHeights){ensureLineHeights(cm,prepared.view,prepared.rect);prepared.hasHeights=true;}
found=measureCharInner(cm,prepared,ch,bias);if(!found.bogus)prepared.cache[key]=found;}
return{left:found.left,right:found.right,top:found.top,bottom:found.bottom};}
var nullRect={left:0,right:0,top:0,bottom:0};function measureCharInner(cm,prepared,ch,bias){var map=prepared.map;var node,start,end,collapse;for(var i=0;i<map.length;i+=3){var mStart=map[i],mEnd=map[i+1];if(ch<mStart){start=0;end=1;collapse="left";}else if(ch<mEnd){start=ch-mStart;end=start+1;}else if(i==map.length-3||ch==mEnd&&map[i+3]>ch){end=mEnd-mStart;start=end-1;if(ch>=mEnd)collapse="right";}
if(start!=null){node=map[i+2];if(mStart==mEnd&&bias==(node.insertLeft?"left":"right"))
collapse=bias;if(bias=="left"&&start==0)
while(i&&map[i-2]==map[i-3]&&map[i-1].insertLeft){node=map[(i-=3)+2];collapse="left";}
if(bias=="right"&&start==mEnd-mStart)
while(i<map.length-3&&map[i+3]==map[i+4]&&!map[i+5].insertLeft){node=map[(i+=3)+2];collapse="right";}
break;}}
var rect;if(node.nodeType==3){while(start&&isExtendingChar(prepared.line.text.charAt(mStart+start)))--start;while(mStart+end<mEnd&&isExtendingChar(prepared.line.text.charAt(mStart+end)))++end;if(ie_upto8&&start==0&&end==mEnd-mStart){rect=node.parentNode.getBoundingClientRect();}else if(ie&&cm.options.lineWrapping){var rects=range(node,start,end).getClientRects();if(rects.length)
rect=rects[bias=="right"?rects.length-1:0];else
rect=nullRect;}else{rect=range(node,start,end).getBoundingClientRect()||nullRect;}}else{if(start>0)collapse=bias="right";var rects;if(cm.options.lineWrapping&&(rects=node.getClientRects()).length>1)
rect=rects[bias=="right"?rects.length-1:0];else
rect=node.getBoundingClientRect();}
if(ie_upto8&&!start&&(!rect||!rect.left&&!rect.right)){var rSpan=node.parentNode.getClientRects()[0];if(rSpan)
rect={left:rSpan.left,right:rSpan.left+charWidth(cm.display),top:rSpan.top,bottom:rSpan.bottom};else
rect=nullRect;}
var top,bot=(rect.bottom+rect.top)/2-prepared.rect.top;var heights=prepared.view.measure.heights;for(var i=0;i<heights.length-1;i++)
if(bot<heights[i])break;top=i?heights[i-1]:0;bot=heights[i];var result={left:(collapse=="right"?rect.right:rect.left)-prepared.rect.left,right:(collapse=="left"?rect.left:rect.right)-prepared.rect.left,top:top,bottom:bot};if(!rect.left&&!rect.right)result.bogus=true;return result;}
function clearLineMeasurementCacheFor(lineView){if(lineView.measure){lineView.measure.cache={};lineView.measure.heights=null;if(lineView.rest)for(var i=0;i<lineView.rest.length;i++)
lineView.measure.caches[i]={};}}
function clearLineMeasurementCache(cm){cm.display.externalMeasure=null;removeChildren(cm.display.lineMeasure);for(var i=0;i<cm.display.view.length;i++)
clearLineMeasurementCacheFor(cm.display.view[i]);}
function clearCaches(cm){clearLineMeasurementCache(cm);cm.display.cachedCharWidth=cm.display.cachedTextHeight=cm.display.cachedPaddingH=null;if(!cm.options.lineWrapping)cm.display.maxLineChanged=true;cm.display.lineNumChars=null;}
function pageScrollX(){return window.pageXOffset||(document.documentElement||document.body).scrollLeft;}
function pageScrollY(){return window.pageYOffset||(document.documentElement||document.body).scrollTop;}
function intoCoordSystem(cm,lineObj,rect,context){if(lineObj.widgets)for(var i=0;i<lineObj.widgets.length;++i)if(lineObj.widgets[i].above){var size=widgetHeight(lineObj.widgets[i]);rect.top+=size;rect.bottom+=size;}
if(context=="line")return rect;if(!context)context="local";var yOff=heightAtLine(lineObj);if(context=="local")yOff+=paddingTop(cm.display);else yOff-=cm.display.viewOffset;if(context=="page"||context=="window"){var lOff=cm.display.lineSpace.getBoundingClientRect();yOff+=lOff.top+(context=="window"?0:pageScrollY());var xOff=lOff.left+(context=="window"?0:pageScrollX());rect.left+=xOff;rect.right+=xOff;}
rect.top+=yOff;rect.bottom+=yOff;return rect;}
function fromCoordSystem(cm,coords,context){if(context=="div")return coords;var left=coords.left,top=coords.top;if(context=="page"){left-=pageScrollX();top-=pageScrollY();}else if(context=="local"||!context){var localBox=cm.display.sizer.getBoundingClientRect();left+=localBox.left;top+=localBox.top;}
var lineSpaceBox=cm.display.lineSpace.getBoundingClientRect();return{left:left-lineSpaceBox.left,top:top-lineSpaceBox.top};}
function charCoords(cm,pos,context,lineObj,bias){if(!lineObj)lineObj=getLine(cm.doc,pos.line);return intoCoordSystem(cm,lineObj,measureChar(cm,lineObj,pos.ch,bias),context);}
function cursorCoords(cm,pos,context,lineObj,preparedMeasure){lineObj=lineObj||getLine(cm.doc,pos.line);if(!preparedMeasure)preparedMeasure=prepareMeasureForLine(cm,lineObj);function get(ch,right){var m=measureCharPrepared(cm,preparedMeasure,ch,right?"right":"left");if(right)m.left=m.right;else m.right=m.left;return intoCoordSystem(cm,lineObj,m,context);}
function getBidi(ch,partPos){var part=order[partPos],right=part.level%2;if(ch==bidiLeft(part)&&partPos&&part.level<order[partPos-1].level){part=order[--partPos];ch=bidiRight(part)-(part.level%2?0:1);right=true;}else if(ch==bidiRight(part)&&partPos<order.length-1&&part.level<order[partPos+1].level){part=order[++partPos];ch=bidiLeft(part)-part.level%2;right=false;}
if(right&&ch==part.to&&ch>part.from)return get(ch-1);return get(ch,right);}
var order=getOrder(lineObj),ch=pos.ch;if(!order)return get(ch);var partPos=getBidiPartAt(order,ch);var val=getBidi(ch,partPos);if(bidiOther!=null)val.other=getBidi(ch,bidiOther);return val;}
function estimateCoords(cm,pos){var left=0,pos=clipPos(cm.doc,pos);if(!cm.options.lineWrapping)left=charWidth(cm.display)*pos.ch;var lineObj=getLine(cm.doc,pos.line);var top=heightAtLine(lineObj)+paddingTop(cm.display);return{left:left,right:left,top:top,bottom:top+lineObj.height};}
function PosWithInfo(line,ch,outside,xRel){var pos=Pos(line,ch);pos.xRel=xRel;if(outside)pos.outside=true;return pos;}
function coordsChar(cm,x,y){var doc=cm.doc;y+=cm.display.viewOffset;if(y<0)return PosWithInfo(doc.first,0,true,-1);var lineN=lineAtHeight(doc,y),last=doc.first+doc.size-1;if(lineN>last)
return PosWithInfo(doc.first+doc.size-1,getLine(doc,last).text.length,true,1);if(x<0)x=0;var lineObj=getLine(doc,lineN);for(;;){var found=coordsCharInner(cm,lineObj,lineN,x,y);var merged=collapsedSpanAtEnd(lineObj);var mergedPos=merged&&merged.find(0,true);if(merged&&(found.ch>mergedPos.from.ch||found.ch==mergedPos.from.ch&&found.xRel>0))
lineN=lineNo(lineObj=mergedPos.to.line);else
return found;}}
function coordsCharInner(cm,lineObj,lineNo,x,y){var innerOff=y-heightAtLine(lineObj);var wrongLine=false,adjust=2*cm.display.wrapper.clientWidth;var preparedMeasure=prepareMeasureForLine(cm,lineObj);function getX(ch){var sp=cursorCoords(cm,Pos(lineNo,ch),"line",lineObj,preparedMeasure);wrongLine=true;if(innerOff>sp.bottom)return sp.left-adjust;else if(innerOff<sp.top)return sp.left+adjust;else wrongLine=false;return sp.left;}
var bidi=getOrder(lineObj),dist=lineObj.text.length;var from=lineLeft(lineObj),to=lineRight(lineObj);var fromX=getX(from),fromOutside=wrongLine,toX=getX(to),toOutside=wrongLine;if(x>toX)return PosWithInfo(lineNo,to,toOutside,1);for(;;){if(bidi?to==from||to==moveVisually(lineObj,from,1):to-from<=1){var ch=x<fromX||x-fromX<=toX-x?from:to;var xDiff=x-(ch==from?fromX:toX);while(isExtendingChar(lineObj.text.charAt(ch)))++ch;var pos=PosWithInfo(lineNo,ch,ch==from?fromOutside:toOutside,xDiff<-1?-1:xDiff>1?1:0);return pos;}
var step=Math.ceil(dist/2),middle=from+step;if(bidi){middle=from;for(var i=0;i<step;++i)middle=moveVisually(lineObj,middle,1);}
var middleX=getX(middle);if(middleX>x){to=middle;toX=middleX;if(toOutside=wrongLine)toX+=1000;dist=step;}
else{from=middle;fromX=middleX;fromOutside=wrongLine;dist-=step;}}}
var measureText;function textHeight(display){if(display.cachedTextHeight!=null)return display.cachedTextHeight;if(measureText==null){measureText=elt("pre");for(var i=0;i<49;++i){measureText.appendChild(document.createTextNode("x"));measureText.appendChild(elt("br"));}
measureText.appendChild(document.createTextNode("x"));}
removeChildrenAndAdd(display.measure,measureText);var height=measureText.offsetHeight/50;if(height>3)display.cachedTextHeight=height;removeChildren(display.measure);return height||1;}
function charWidth(display){if(display.cachedCharWidth!=null)return display.cachedCharWidth;var anchor=elt("span","xxxxxxxxxx");var pre=elt("pre",[anchor]);removeChildrenAndAdd(display.measure,pre);var rect=anchor.getBoundingClientRect(),width=(rect.right-rect.left)/10;if(width>2)display.cachedCharWidth=width;return width||10;}
var nextOpId=0;function startOperation(cm){cm.curOp={viewChanged:false,startHeight:cm.doc.height,forceUpdate:false,updateInput:null,typing:false,changeObjs:null,cursorActivityHandlers:null,selectionChanged:false,updateMaxLine:false,scrollLeft:null,scrollTop:null,scrollToPos:null,id:++nextOpId};if(!delayedCallbackDepth++)delayedCallbacks=[];}
function endOperation(cm){var op=cm.curOp,doc=cm.doc,display=cm.display;cm.curOp=null;if(op.updateMaxLine)findMaxLine(cm);if(op.viewChanged||op.forceUpdate||op.scrollTop!=null||op.scrollToPos&&(op.scrollToPos.from.line<display.viewFrom||op.scrollToPos.to.line>=display.viewTo)||display.maxLineChanged&&cm.options.lineWrapping){var updated=updateDisplay(cm,{top:op.scrollTop,ensure:op.scrollToPos},op.forceUpdate);if(cm.display.scroller.offsetHeight)cm.doc.scrollTop=cm.display.scroller.scrollTop;}
if(!updated&&op.selectionChanged)updateSelection(cm);if(!updated&&op.startHeight!=cm.doc.height)updateScrollbars(cm);if(display.wheelStartX!=null&&(op.scrollTop!=null||op.scrollLeft!=null||op.scrollToPos))
display.wheelStartX=display.wheelStartY=null;if(op.scrollTop!=null&&display.scroller.scrollTop!=op.scrollTop){var top=Math.max(0,Math.min(display.scroller.scrollHeight-display.scroller.clientHeight,op.scrollTop));display.scroller.scrollTop=display.scrollbarV.scrollTop=doc.scrollTop=top;}
if(op.scrollLeft!=null&&display.scroller.scrollLeft!=op.scrollLeft){var left=Math.max(0,Math.min(display.scroller.scrollWidth-display.scroller.clientWidth,op.scrollLeft));display.scroller.scrollLeft=display.scrollbarH.scrollLeft=doc.scrollLeft=left;alignHorizontally(cm);}
if(op.scrollToPos){var coords=scrollPosIntoView(cm,clipPos(cm.doc,op.scrollToPos.from),clipPos(cm.doc,op.scrollToPos.to),op.scrollToPos.margin);if(op.scrollToPos.isCursor&&cm.state.focused)maybeScrollWindow(cm,coords);}
if(op.selectionChanged)restartBlink(cm);if(cm.state.focused&&op.updateInput)
resetInput(cm,op.typing);var hidden=op.maybeHiddenMarkers,unhidden=op.maybeUnhiddenMarkers;if(hidden)for(var i=0;i<hidden.length;++i)
if(!hidden[i].lines.length)signal(hidden[i],"hide");if(unhidden)for(var i=0;i<unhidden.length;++i)
if(unhidden[i].lines.length)signal(unhidden[i],"unhide");var delayed;if(!--delayedCallbackDepth){delayed=delayedCallbacks;delayedCallbacks=null;}
if(op.changeObjs)
signal(cm,"changes",cm,op.changeObjs);if(delayed)for(var i=0;i<delayed.length;++i)delayed[i]();if(op.cursorActivityHandlers)
for(var i=0;i<op.cursorActivityHandlers.length;i++)
op.cursorActivityHandlers[i](cm);}
function runInOp(cm,f){if(cm.curOp)return f();startOperation(cm);try{return f();}
finally{endOperation(cm);}}
function operation(cm,f){return function(){if(cm.curOp)return f.apply(cm,arguments);startOperation(cm);try{return f.apply(cm,arguments);}
finally{endOperation(cm);}};}
function methodOp(f){return function(){if(this.curOp)return f.apply(this,arguments);startOperation(this);try{return f.apply(this,arguments);}
finally{endOperation(this);}};}
function docMethodOp(f){return function(){var cm=this.cm;if(!cm||cm.curOp)return f.apply(this,arguments);startOperation(cm);try{return f.apply(this,arguments);}
finally{endOperation(cm);}};}
function LineView(doc,line,lineN){this.line=line;this.rest=visualLineContinued(line);this.size=this.rest?lineNo(lst(this.rest))-lineN+1:1;this.node=this.text=null;this.hidden=lineIsHidden(doc,line);}
function buildViewArray(cm,from,to){var array=[],nextPos;for(var pos=from;pos<to;pos=nextPos){var view=new LineView(cm.doc,getLine(cm.doc,pos),pos);nextPos=pos+view.size;array.push(view);}
return array;}
function regChange(cm,from,to,lendiff){if(from==null)from=cm.doc.first;if(to==null)to=cm.doc.first+cm.doc.size;if(!lendiff)lendiff=0;var display=cm.display;if(lendiff&&to<display.viewTo&&(display.updateLineNumbers==null||display.updateLineNumbers>from))
display.updateLineNumbers=from;cm.curOp.viewChanged=true;if(from>=display.viewTo){if(sawCollapsedSpans&&visualLineNo(cm.doc,from)<display.viewTo)
resetView(cm);}else if(to<=display.viewFrom){if(sawCollapsedSpans&&visualLineEndNo(cm.doc,to+lendiff)>display.viewFrom){resetView(cm);}else{display.viewFrom+=lendiff;display.viewTo+=lendiff;}}else if(from<=display.viewFrom&&to>=display.viewTo){resetView(cm);}else if(from<=display.viewFrom){var cut=viewCuttingPoint(cm,to,to+lendiff,1);if(cut){display.view=display.view.slice(cut.index);display.viewFrom=cut.lineN;display.viewTo+=lendiff;}else{resetView(cm);}}else if(to>=display.viewTo){var cut=viewCuttingPoint(cm,from,from,-1);if(cut){display.view=display.view.slice(0,cut.index);display.viewTo=cut.lineN;}else{resetView(cm);}}else{var cutTop=viewCuttingPoint(cm,from,from,-1);var cutBot=viewCuttingPoint(cm,to,to+lendiff,1);if(cutTop&&cutBot){display.view=display.view.slice(0,cutTop.index).concat(buildViewArray(cm,cutTop.lineN,cutBot.lineN)).concat(display.view.slice(cutBot.index));display.viewTo+=lendiff;}else{resetView(cm);}}
var ext=display.externalMeasured;if(ext){if(to<ext.lineN)
ext.lineN+=lendiff;else if(from<ext.lineN+ext.size)
display.externalMeasured=null;}}
function regLineChange(cm,line,type){cm.curOp.viewChanged=true;var display=cm.display,ext=cm.display.externalMeasured;if(ext&&line>=ext.lineN&&line<ext.lineN+ext.size)
display.externalMeasured=null;if(line<display.viewFrom||line>=display.viewTo)return;var lineView=display.view[findViewIndex(cm,line)];if(lineView.node==null)return;var arr=lineView.changes||(lineView.changes=[]);if(indexOf(arr,type)==-1)arr.push(type);}
function resetView(cm){cm.display.viewFrom=cm.display.viewTo=cm.doc.first;cm.display.view=[];cm.display.viewOffset=0;}
function findViewIndex(cm,n){if(n>=cm.display.viewTo)return null;n-=cm.display.viewFrom;if(n<0)return null;var view=cm.display.view;for(var i=0;i<view.length;i++){n-=view[i].size;if(n<0)return i;}}
function viewCuttingPoint(cm,oldN,newN,dir){var index=findViewIndex(cm,oldN),diff,view=cm.display.view;if(!sawCollapsedSpans||newN==cm.doc.first+cm.doc.size)
return{index:index,lineN:newN};for(var i=0,n=cm.display.viewFrom;i<index;i++)
n+=view[i].size;if(n!=oldN){if(dir>0){if(index==view.length-1)return null;diff=(n+view[index].size)-oldN;index++;}else{diff=n-oldN;}
oldN+=diff;newN+=diff;}
while(visualLineNo(cm.doc,newN)!=newN){if(index==(dir<0?0:view.length-1))return null;newN+=dir*view[index-(dir<0?1:0)].size;index+=dir;}
return{index:index,lineN:newN};}
function adjustView(cm,from,to){var display=cm.display,view=display.view;if(view.length==0||from>=display.viewTo||to<=display.viewFrom){display.view=buildViewArray(cm,from,to);display.viewFrom=from;}else{if(display.viewFrom>from)
display.view=buildViewArray(cm,from,display.viewFrom).concat(display.view);else if(display.viewFrom<from)
display.view=display.view.slice(findViewIndex(cm,from));display.viewFrom=from;if(display.viewTo<to)
display.view=display.view.concat(buildViewArray(cm,display.viewTo,to));else if(display.viewTo>to)
display.view=display.view.slice(0,findViewIndex(cm,to));}
display.viewTo=to;}
function countDirtyView(cm){var view=cm.display.view,dirty=0;for(var i=0;i<view.length;i++){var lineView=view[i];if(!lineView.hidden&&(!lineView.node||lineView.changes))++dirty;}
return dirty;}
function slowPoll(cm){if(cm.display.pollingFast)return;cm.display.poll.set(cm.options.pollInterval,function(){readInput(cm);if(cm.state.focused)slowPoll(cm);});}
function fastPoll(cm){var missed=false;cm.display.pollingFast=true;function p(){var changed=readInput(cm);if(!changed&&!missed){missed=true;cm.display.poll.set(60,p);}
else{cm.display.pollingFast=false;slowPoll(cm);}}
cm.display.poll.set(20,p);}
function readInput(cm){var input=cm.display.input,prevInput=cm.display.prevInput,doc=cm.doc;if(!cm.state.focused||(hasSelection(input)&&!prevInput)||isReadOnly(cm)||cm.options.disableInput)
return false;if(cm.state.pasteIncoming&&cm.state.fakedLastChar){input.value=input.value.substring(0,input.value.length-1);cm.state.fakedLastChar=false;}
var text=input.value;if(text==prevInput&&!cm.somethingSelected())return false;if(ie&&!ie_upto8&&cm.display.inputHasSelection===text){resetInput(cm);return false;}
var withOp=!cm.curOp;if(withOp)startOperation(cm);cm.display.shift=false;if(text.charCodeAt(0)==0x200b&&doc.sel==cm.display.selForContextMenu&&!prevInput)
prevInput="\u200b";var same=0,l=Math.min(prevInput.length,text.length);while(same<l&&prevInput.charCodeAt(same)==text.charCodeAt(same))++same;var inserted=text.slice(same),textLines=splitLines(inserted);var multiPaste=cm.state.pasteIncoming&&textLines.length>1&&doc.sel.ranges.length==textLines.length;for(var i=doc.sel.ranges.length-1;i>=0;i--){var range=doc.sel.ranges[i];var from=range.from(),to=range.to();if(same<prevInput.length)
from=Pos(from.line,from.ch-(prevInput.length-same));else if(cm.state.overwrite&&range.empty()&&!cm.state.pasteIncoming)
to=Pos(to.line,Math.min(getLine(doc,to.line).text.length,to.ch+lst(textLines).length));var updateInput=cm.curOp.updateInput;var changeEvent={from:from,to:to,text:multiPaste?[textLines[i]]:textLines,origin:cm.state.pasteIncoming?"paste":cm.state.cutIncoming?"cut":"+input"};makeChange(cm.doc,changeEvent);signalLater(cm,"inputRead",cm,changeEvent);if(inserted&&!cm.state.pasteIncoming&&cm.options.electricChars&&cm.options.smartIndent&&range.head.ch<100&&(!i||doc.sel.ranges[i-1].head.line!=range.head.line)){var mode=cm.getModeAt(range.head);if(mode.electricChars){for(var j=0;j<mode.electricChars.length;j++)
if(inserted.indexOf(mode.electricChars.charAt(j))>-1){indentLine(cm,range.head.line,"smart");break;}}else if(mode.electricInput){var end=changeEnd(changeEvent);if(mode.electricInput.test(getLine(doc,end.line).text.slice(0,end.ch)))
indentLine(cm,range.head.line,"smart");}}}
ensureCursorVisible(cm);cm.curOp.updateInput=updateInput;cm.curOp.typing=true;if(text.length>1000||text.indexOf("\n")>-1)input.value=cm.display.prevInput="";else cm.display.prevInput=text;if(withOp)endOperation(cm);cm.state.pasteIncoming=cm.state.cutIncoming=false;return true;}
function resetInput(cm,typing){var minimal,selected,doc=cm.doc;if(cm.somethingSelected()){cm.display.prevInput="";var range=doc.sel.primary();minimal=hasCopyEvent&&(range.to().line-range.from().line>100||(selected=cm.getSelection()).length>1000);var content=minimal?"-":selected||cm.getSelection();cm.display.input.value=content;if(cm.state.focused)selectInput(cm.display.input);if(ie&&!ie_upto8)cm.display.inputHasSelection=content;}else if(!typing){cm.display.prevInput=cm.display.input.value="";if(ie&&!ie_upto8)cm.display.inputHasSelection=null;}
cm.display.inaccurateSelection=minimal;}
function focusInput(cm){if(cm.options.readOnly!="nocursor"&&(!mobile||activeElt()!=cm.display.input))
cm.display.input.focus();}
function ensureFocus(cm){if(!cm.state.focused){focusInput(cm);onFocus(cm);}}
function isReadOnly(cm){return cm.options.readOnly||cm.doc.cantEdit;}
function registerEventHandlers(cm){var d=cm.display;on(d.scroller,"mousedown",operation(cm,onMouseDown));if(ie_upto10)
on(d.scroller,"dblclick",operation(cm,function(e){if(signalDOMEvent(cm,e))return;var pos=posFromMouse(cm,e);if(!pos||clickInGutter(cm,e)||eventInWidget(cm.display,e))return;e_preventDefault(e);var word=findWordAt(cm,pos);extendSelection(cm.doc,word.anchor,word.head);}));else
on(d.scroller,"dblclick",function(e){signalDOMEvent(cm,e)||e_preventDefault(e);});on(d.lineSpace,"selectstart",function(e){if(!eventInWidget(d,e))e_preventDefault(e);});if(!captureRightClick)on(d.scroller,"contextmenu",function(e){onContextMenu(cm,e);});on(d.scroller,"scroll",function(){if(d.scroller.clientHeight){setScrollTop(cm,d.scroller.scrollTop);setScrollLeft(cm,d.scroller.scrollLeft,true);signal(cm,"scroll",cm);}});on(d.scrollbarV,"scroll",function(){if(d.scroller.clientHeight)setScrollTop(cm,d.scrollbarV.scrollTop);});on(d.scrollbarH,"scroll",function(){if(d.scroller.clientHeight)setScrollLeft(cm,d.scrollbarH.scrollLeft);});on(d.scroller,"mousewheel",function(e){onScrollWheel(cm,e);});on(d.scroller,"DOMMouseScroll",function(e){onScrollWheel(cm,e);});function reFocus(){if(cm.state.focused)setTimeout(bind(focusInput,cm),0);}
on(d.scrollbarH,"mousedown",reFocus);on(d.scrollbarV,"mousedown",reFocus);on(d.wrapper,"scroll",function(){d.wrapper.scrollTop=d.wrapper.scrollLeft=0;});on(d.input,"keyup",operation(cm,onKeyUp));on(d.input,"input",function(){if(ie&&!ie_upto8&&cm.display.inputHasSelection)cm.display.inputHasSelection=null;fastPoll(cm);});on(d.input,"keydown",operation(cm,onKeyDown));on(d.input,"keypress",operation(cm,onKeyPress));on(d.input,"focus",bind(onFocus,cm));on(d.input,"blur",bind(onBlur,cm));function drag_(e){if(!signalDOMEvent(cm,e))e_stop(e);}
if(cm.options.dragDrop){on(d.scroller,"dragstart",function(e){onDragStart(cm,e);});on(d.scroller,"dragenter",drag_);on(d.scroller,"dragover",drag_);on(d.scroller,"drop",operation(cm,onDrop));}
on(d.scroller,"paste",function(e){if(eventInWidget(d,e))return;cm.state.pasteIncoming=true;focusInput(cm);fastPoll(cm);});on(d.input,"paste",function(){if(webkit&&!cm.state.fakedLastChar&&!(new Date-cm.state.lastMiddleDown<200)){var start=d.input.selectionStart,end=d.input.selectionEnd;d.input.value+="$";d.input.selectionStart=start;d.input.selectionEnd=end;cm.state.fakedLastChar=true;}
cm.state.pasteIncoming=true;fastPoll(cm);});function prepareCopyCut(e){if(cm.somethingSelected()){if(d.inaccurateSelection){d.prevInput="";d.inaccurateSelection=false;d.input.value=cm.getSelection();selectInput(d.input);}}else{var text="",ranges=[];for(var i=0;i<cm.doc.sel.ranges.length;i++){var line=cm.doc.sel.ranges[i].head.line;var lineRange={anchor:Pos(line,0),head:Pos(line+1,0)};ranges.push(lineRange);text+=cm.getRange(lineRange.anchor,lineRange.head);}
if(e.type=="cut"){cm.setSelections(ranges,null,sel_dontScroll);}else{d.prevInput="";d.input.value=text;selectInput(d.input);}}
if(e.type=="cut")cm.state.cutIncoming=true;}
on(d.input,"cut",prepareCopyCut);on(d.input,"copy",prepareCopyCut);if(khtml)on(d.sizer,"mouseup",function(){if(activeElt()==d.input)d.input.blur();focusInput(cm);});}
function onResize(cm){var d=cm.display;d.cachedCharWidth=d.cachedTextHeight=d.cachedPaddingH=null;cm.setSize();}
function eventInWidget(display,e){for(var n=e_target(e);n!=display.wrapper;n=n.parentNode){if(!n||n.ignoreEvents||n.parentNode==display.sizer&&n!=display.mover)return true;}}
function posFromMouse(cm,e,liberal,forRect){var display=cm.display;if(!liberal){var target=e_target(e);if(target==display.scrollbarH||target==display.scrollbarV||target==display.scrollbarFiller||target==display.gutterFiller)return null;}
var x,y,space=display.lineSpace.getBoundingClientRect();try{x=e.clientX-space.left;y=e.clientY-space.top;}
catch(e){return null;}
var coords=coordsChar(cm,x,y),line;if(forRect&&coords.xRel==1&&(line=getLine(cm.doc,coords.line).text).length==coords.ch){var colDiff=countColumn(line,line.length,cm.options.tabSize)-line.length;coords=Pos(coords.line,Math.max(0,Math.round((x-paddingH(cm.display).left)/charWidth(cm.display))-colDiff));}
return coords;}
function onMouseDown(e){if(signalDOMEvent(this,e))return;var cm=this,display=cm.display;display.shift=e.shiftKey;if(eventInWidget(display,e)){if(!webkit){display.scroller.draggable=false;setTimeout(function(){display.scroller.draggable=true;},100);}
return;}
if(clickInGutter(cm,e))return;var start=posFromMouse(cm,e);window.focus();switch(e_button(e)){case 1:if(start)
leftButtonDown(cm,e,start);else if(e_target(e)==display.scroller)
e_preventDefault(e);break;case 2:if(webkit)cm.state.lastMiddleDown=+new Date;if(start)extendSelection(cm.doc,start);setTimeout(bind(focusInput,cm),20);e_preventDefault(e);break;case 3:if(captureRightClick)onContextMenu(cm,e);break;}}
var lastClick,lastDoubleClick;function leftButtonDown(cm,e,start){setTimeout(bind(ensureFocus,cm),0);var now=+new Date,type;if(lastDoubleClick&&lastDoubleClick.time>now-400&&cmp(lastDoubleClick.pos,start)==0){type="triple";}else if(lastClick&&lastClick.time>now-400&&cmp(lastClick.pos,start)==0){type="double";lastDoubleClick={time:now,pos:start};}else{type="single";lastClick={time:now,pos:start};}
var sel=cm.doc.sel,addNew=mac?e.metaKey:e.ctrlKey;if(cm.options.dragDrop&&dragAndDrop&&!addNew&&!isReadOnly(cm)&&type=="single"&&sel.contains(start)>-1&&sel.somethingSelected())
leftButtonStartDrag(cm,e,start);else
leftButtonSelect(cm,e,start,type,addNew);}
function leftButtonStartDrag(cm,e,start){var display=cm.display;var dragEnd=operation(cm,function(e2){if(webkit)display.scroller.draggable=false;cm.state.draggingText=false;off(document,"mouseup",dragEnd);off(display.scroller,"drop",dragEnd);if(Math.abs(e.clientX-e2.clientX)+Math.abs(e.clientY-e2.clientY)<10){e_preventDefault(e2);extendSelection(cm.doc,start);focusInput(cm);if(ie_upto10&&!ie_upto8)
setTimeout(function(){document.body.focus();focusInput(cm);},20);}});if(webkit)display.scroller.draggable=true;cm.state.draggingText=dragEnd;if(display.scroller.dragDrop)display.scroller.dragDrop();on(document,"mouseup",dragEnd);on(display.scroller,"drop",dragEnd);}
function leftButtonSelect(cm,e,start,type,addNew){var display=cm.display,doc=cm.doc;e_preventDefault(e);var ourRange,ourIndex,startSel=doc.sel;if(addNew&&!e.shiftKey){ourIndex=doc.sel.contains(start);if(ourIndex>-1)
ourRange=doc.sel.ranges[ourIndex];else
ourRange=new Range(start,start);}else{ourRange=doc.sel.primary();}
if(e.altKey){type="rect";if(!addNew)ourRange=new Range(start,start);start=posFromMouse(cm,e,true,true);ourIndex=-1;}else if(type=="double"){var word=findWordAt(cm,start);if(cm.display.shift||doc.extend)
ourRange=extendRange(doc,ourRange,word.anchor,word.head);else
ourRange=word;}else if(type=="triple"){var line=new Range(Pos(start.line,0),clipPos(doc,Pos(start.line+1,0)));if(cm.display.shift||doc.extend)
ourRange=extendRange(doc,ourRange,line.anchor,line.head);else
ourRange=line;}else{ourRange=extendRange(doc,ourRange,start);}
if(!addNew){ourIndex=0;setSelection(doc,new Selection([ourRange],0),sel_mouse);startSel=doc.sel;}else if(ourIndex>-1){replaceOneSelection(doc,ourIndex,ourRange,sel_mouse);}else{ourIndex=doc.sel.ranges.length;setSelection(doc,normalizeSelection(doc.sel.ranges.concat([ourRange]),ourIndex),{scroll:false,origin:"*mouse"});}
var lastPos=start;function extendTo(pos){if(cmp(lastPos,pos)==0)return;lastPos=pos;if(type=="rect"){var ranges=[],tabSize=cm.options.tabSize;var startCol=countColumn(getLine(doc,start.line).text,start.ch,tabSize);var posCol=countColumn(getLine(doc,pos.line).text,pos.ch,tabSize);var left=Math.min(startCol,posCol),right=Math.max(startCol,posCol);for(var line=Math.min(start.line,pos.line),end=Math.min(cm.lastLine(),Math.max(start.line,pos.line));line<=end;line++){var text=getLine(doc,line).text,leftPos=findColumn(text,left,tabSize);if(left==right)
ranges.push(new Range(Pos(line,leftPos),Pos(line,leftPos)));else if(text.length>leftPos)
ranges.push(new Range(Pos(line,leftPos),Pos(line,findColumn(text,right,tabSize))));}
if(!ranges.length)ranges.push(new Range(start,start));setSelection(doc,normalizeSelection(startSel.ranges.slice(0,ourIndex).concat(ranges),ourIndex),{origin:"*mouse",scroll:false});cm.scrollIntoView(pos);}else{var oldRange=ourRange;var anchor=oldRange.anchor,head=pos;if(type!="single"){if(type=="double")
var range=findWordAt(cm,pos);else
var range=new Range(Pos(pos.line,0),clipPos(doc,Pos(pos.line+1,0)));if(cmp(range.anchor,anchor)>0){head=range.head;anchor=minPos(oldRange.from(),range.anchor);}else{head=range.anchor;anchor=maxPos(oldRange.to(),range.head);}}
var ranges=startSel.ranges.slice(0);ranges[ourIndex]=new Range(clipPos(doc,anchor),head);setSelection(doc,normalizeSelection(ranges,ourIndex),sel_mouse);}}
var editorSize=display.wrapper.getBoundingClientRect();var counter=0;function extend(e){var curCount=++counter;var cur=posFromMouse(cm,e,true,type=="rect");if(!cur)return;if(cmp(cur,lastPos)!=0){ensureFocus(cm);extendTo(cur);var visible=visibleLines(display,doc);if(cur.line>=visible.to||cur.line<visible.from)
setTimeout(operation(cm,function(){if(counter==curCount)extend(e);}),150);}else{var outside=e.clientY<editorSize.top?-20:e.clientY>editorSize.bottom?20:0;if(outside)setTimeout(operation(cm,function(){if(counter!=curCount)return;display.scroller.scrollTop+=outside;extend(e);}),50);}}
function done(e){counter=Infinity;e_preventDefault(e);focusInput(cm);off(document,"mousemove",move);off(document,"mouseup",up);doc.history.lastSelOrigin=null;}
var move=operation(cm,function(e){if((ie&&!ie_upto9)?!e.buttons:!e_button(e))done(e);else extend(e);});var up=operation(cm,done);on(document,"mousemove",move);on(document,"mouseup",up);}
function gutterEvent(cm,e,type,prevent,signalfn){try{var mX=e.clientX,mY=e.clientY;}
catch(e){return false;}
if(mX>=Math.floor(cm.display.gutters.getBoundingClientRect().right))return false;if(prevent)e_preventDefault(e);var display=cm.display;var lineBox=display.lineDiv.getBoundingClientRect();if(mY>lineBox.bottom||!hasHandler(cm,type))return e_defaultPrevented(e);mY-=lineBox.top-display.viewOffset;for(var i=0;i<cm.options.gutters.length;++i){var g=display.gutters.childNodes[i];if(g&&g.getBoundingClientRect().right>=mX){var line=lineAtHeight(cm.doc,mY);var gutter=cm.options.gutters[i];signalfn(cm,type,cm,line,gutter,e);return e_defaultPrevented(e);}}}
function clickInGutter(cm,e){return gutterEvent(cm,e,"gutterClick",true,signalLater);}
var lastDrop=0;function onDrop(e){var cm=this;if(signalDOMEvent(cm,e)||eventInWidget(cm.display,e))
return;e_preventDefault(e);if(ie)lastDrop=+new Date;var pos=posFromMouse(cm,e,true),files=e.dataTransfer.files;if(!pos||isReadOnly(cm))return;if(files&&files.length&&window.FileReader&&window.File){var n=files.length,text=Array(n),read=0;var loadFile=function(file,i){var reader=new FileReader;reader.onload=operation(cm,function(){text[i]=reader.result;if(++read==n){pos=clipPos(cm.doc,pos);var change={from:pos,to:pos,text:splitLines(text.join("\n")),origin:"paste"};makeChange(cm.doc,change);setSelectionReplaceHistory(cm.doc,simpleSelection(pos,changeEnd(change)));}});reader.readAsText(file);};for(var i=0;i<n;++i)loadFile(files[i],i);}else{if(cm.state.draggingText&&cm.doc.sel.contains(pos)>-1){cm.state.draggingText(e);setTimeout(bind(focusInput,cm),20);return;}
try{var text=e.dataTransfer.getData("Text");if(text){var selected=cm.state.draggingText&&cm.listSelections();setSelectionNoUndo(cm.doc,simpleSelection(pos,pos));if(selected)for(var i=0;i<selected.length;++i)
replaceRange(cm.doc,"",selected[i].anchor,selected[i].head,"drag");cm.replaceSelection(text,"around","paste");focusInput(cm);}}
catch(e){}}}
function onDragStart(cm,e){if(ie&&(!cm.state.draggingText||+new Date-lastDrop<100)){e_stop(e);return;}
if(signalDOMEvent(cm,e)||eventInWidget(cm.display,e))return;e.dataTransfer.setData("Text",cm.getSelection());if(e.dataTransfer.setDragImage&&!safari){var img=elt("img",null,null,"position: fixed; left: 0; top: 0;");img.src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";if(presto){img.width=img.height=1;cm.display.wrapper.appendChild(img);img._top=img.offsetTop;}
e.dataTransfer.setDragImage(img,0,0);if(presto)img.parentNode.removeChild(img);}}
function setScrollTop(cm,val){if(Math.abs(cm.doc.scrollTop-val)<2)return;cm.doc.scrollTop=val;if(!gecko)updateDisplay(cm,{top:val});if(cm.display.scroller.scrollTop!=val)cm.display.scroller.scrollTop=val;if(cm.display.scrollbarV.scrollTop!=val)cm.display.scrollbarV.scrollTop=val;if(gecko)updateDisplay(cm);startWorker(cm,100);}
function setScrollLeft(cm,val,isScroller){if(isScroller?val==cm.doc.scrollLeft:Math.abs(cm.doc.scrollLeft-val)<2)return;val=Math.min(val,cm.display.scroller.scrollWidth-cm.display.scroller.clientWidth);cm.doc.scrollLeft=val;alignHorizontally(cm);if(cm.display.scroller.scrollLeft!=val)cm.display.scroller.scrollLeft=val;if(cm.display.scrollbarH.scrollLeft!=val)cm.display.scrollbarH.scrollLeft=val;}
var wheelSamples=0,wheelPixelsPerUnit=null;if(ie)wheelPixelsPerUnit=-.53;else if(gecko)wheelPixelsPerUnit=15;else if(chrome)wheelPixelsPerUnit=-.7;else if(safari)wheelPixelsPerUnit=-1/3;function onScrollWheel(cm,e){var dx=e.wheelDeltaX,dy=e.wheelDeltaY;if(dx==null&&e.detail&&e.axis==e.HORIZONTAL_AXIS)dx=e.detail;if(dy==null&&e.detail&&e.axis==e.VERTICAL_AXIS)dy=e.detail;else if(dy==null)dy=e.wheelDelta;var display=cm.display,scroll=display.scroller;if(!(dx&&scroll.scrollWidth>scroll.clientWidth||dy&&scroll.scrollHeight>scroll.clientHeight))return;if(dy&&mac&&webkit){outer:for(var cur=e.target,view=display.view;cur!=scroll;cur=cur.parentNode){for(var i=0;i<view.length;i++){if(view[i].node==cur){cm.display.currentWheelTarget=cur;break outer;}}}}
if(dx&&!gecko&&!presto&&wheelPixelsPerUnit!=null){if(dy)
setScrollTop(cm,Math.max(0,Math.min(scroll.scrollTop+dy*wheelPixelsPerUnit,scroll.scrollHeight-scroll.clientHeight)));setScrollLeft(cm,Math.max(0,Math.min(scroll.scrollLeft+dx*wheelPixelsPerUnit,scroll.scrollWidth-scroll.clientWidth)));e_preventDefault(e);display.wheelStartX=null;return;}
if(dy&&wheelPixelsPerUnit!=null){var pixels=dy*wheelPixelsPerUnit;var top=cm.doc.scrollTop,bot=top+display.wrapper.clientHeight;if(pixels<0)top=Math.max(0,top+pixels-50);else bot=Math.min(cm.doc.height,bot+pixels+50);updateDisplay(cm,{top:top,bottom:bot});}
if(wheelSamples<20){if(display.wheelStartX==null){display.wheelStartX=scroll.scrollLeft;display.wheelStartY=scroll.scrollTop;display.wheelDX=dx;display.wheelDY=dy;setTimeout(function(){if(display.wheelStartX==null)return;var movedX=scroll.scrollLeft-display.wheelStartX;var movedY=scroll.scrollTop-display.wheelStartY;var sample=(movedY&&display.wheelDY&&movedY/display.wheelDY)||(movedX&&display.wheelDX&&movedX/display.wheelDX);display.wheelStartX=display.wheelStartY=null;if(!sample)return;wheelPixelsPerUnit=(wheelPixelsPerUnit*wheelSamples+sample)/(wheelSamples+1);++wheelSamples;},200);}else{display.wheelDX+=dx;display.wheelDY+=dy;}}}
function doHandleBinding(cm,bound,dropShift){if(typeof bound=="string"){bound=commands[bound];if(!bound)return false;}
if(cm.display.pollingFast&&readInput(cm))cm.display.pollingFast=false;var prevShift=cm.display.shift,done=false;try{if(isReadOnly(cm))cm.state.suppressEdits=true;if(dropShift)cm.display.shift=false;done=bound(cm)!=Pass;}finally{cm.display.shift=prevShift;cm.state.suppressEdits=false;}
return done;}
function allKeyMaps(cm){var maps=cm.state.keyMaps.slice(0);if(cm.options.extraKeys)maps.push(cm.options.extraKeys);maps.push(cm.options.keyMap);return maps;}
var maybeTransition;function handleKeyBinding(cm,e){var startMap=getKeyMap(cm.options.keyMap),next=startMap.auto;clearTimeout(maybeTransition);if(next&&!isModifierKey(e))maybeTransition=setTimeout(function(){if(getKeyMap(cm.options.keyMap)==startMap){cm.options.keyMap=(next.call?next.call(null,cm):next);keyMapChanged(cm);}},50);var name=keyName(e,true),handled=false;if(!name)return false;var keymaps=allKeyMaps(cm);if(e.shiftKey){handled=lookupKey("Shift-"+name,keymaps,function(b){return doHandleBinding(cm,b,true);})||lookupKey(name,keymaps,function(b){if(typeof b=="string"?/^go[A-Z]/.test(b):b.motion)
return doHandleBinding(cm,b);});}else{handled=lookupKey(name,keymaps,function(b){return doHandleBinding(cm,b);});}
if(handled){e_preventDefault(e);restartBlink(cm);signalLater(cm,"keyHandled",cm,name,e);}
return handled;}
function handleCharBinding(cm,e,ch){var handled=lookupKey("'"+ch+"'",allKeyMaps(cm),function(b){return doHandleBinding(cm,b,true);});if(handled){e_preventDefault(e);restartBlink(cm);signalLater(cm,"keyHandled",cm,"'"+ch+"'",e);}
return handled;}
var lastStoppedKey=null;function onKeyDown(e){var cm=this;ensureFocus(cm);if(signalDOMEvent(cm,e))return;if(ie_upto10&&e.keyCode==27)e.returnValue=false;var code=e.keyCode;cm.display.shift=code==16||e.shiftKey;var handled=handleKeyBinding(cm,e);if(presto){lastStoppedKey=handled?code:null;if(!handled&&code==88&&!hasCopyEvent&&(mac?e.metaKey:e.ctrlKey))
cm.replaceSelection("",null,"cut");}
if(code==18&&!/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
showCrossHair(cm);}
function showCrossHair(cm){var lineDiv=cm.display.lineDiv;addClass(lineDiv,"CodeMirror-crosshair");function up(e){if(e.keyCode==18||!e.altKey){rmClass(lineDiv,"CodeMirror-crosshair");off(document,"keyup",up);off(document,"mouseover",up);}}
on(document,"keyup",up);on(document,"mouseover",up);}
function onKeyUp(e){if(signalDOMEvent(this,e))return;if(e.keyCode==16)this.doc.sel.shift=false;}
function onKeyPress(e){var cm=this;if(signalDOMEvent(cm,e))return;var keyCode=e.keyCode,charCode=e.charCode;if(presto&&keyCode==lastStoppedKey){lastStoppedKey=null;e_preventDefault(e);return;}
if(((presto&&(!e.which||e.which<10))||khtml)&&handleKeyBinding(cm,e))return;var ch=String.fromCharCode(charCode==null?keyCode:charCode);if(handleCharBinding(cm,e,ch))return;if(ie&&!ie_upto8)cm.display.inputHasSelection=null;fastPoll(cm);}
function onFocus(cm){if(cm.options.readOnly=="nocursor")return;if(!cm.state.focused){signal(cm,"focus",cm);cm.state.focused=true;addClass(cm.display.wrapper,"CodeMirror-focused");if(!cm.curOp&&cm.display.selForContextMenu!=cm.doc.sel){resetInput(cm);if(webkit)setTimeout(bind(resetInput,cm,true),0);}}
slowPoll(cm);restartBlink(cm);}
function onBlur(cm){if(cm.state.focused){signal(cm,"blur",cm);cm.state.focused=false;rmClass(cm.display.wrapper,"CodeMirror-focused");}
clearInterval(cm.display.blinker);setTimeout(function(){if(!cm.state.focused)cm.display.shift=false;},150);}
function onContextMenu(cm,e){if(signalDOMEvent(cm,e,"contextmenu"))return;var display=cm.display;if(eventInWidget(display,e)||contextMenuInGutter(cm,e))return;var pos=posFromMouse(cm,e),scrollPos=display.scroller.scrollTop;if(!pos||presto)return;var reset=cm.options.resetSelectionOnContextMenu;if(reset&&cm.doc.sel.contains(pos)==-1)
operation(cm,setSelection)(cm.doc,simpleSelection(pos),sel_dontScroll);var oldCSS=display.input.style.cssText;display.inputDiv.style.position="absolute";display.input.style.cssText="position: fixed; width: 30px; height: 30px; top: "+(e.clientY-5)+"px; left: "+(e.clientX-5)+"px; z-index: 1000; background: "+
(ie?"rgba(255, 255, 255, .05)":"transparent")+"; outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";focusInput(cm);resetInput(cm);if(!cm.somethingSelected())display.input.value=display.prevInput=" ";display.selForContextMenu=cm.doc.sel;clearTimeout(display.detectingSelectAll);function prepareSelectAllHack(){if(display.input.selectionStart!=null){var selected=cm.somethingSelected();var extval=display.input.value="\u200b"+(selected?display.input.value:"");display.prevInput=selected?"":"\u200b";display.input.selectionStart=1;display.input.selectionEnd=extval.length;}}
function rehide(){display.inputDiv.style.position="relative";display.input.style.cssText=oldCSS;if(ie_upto8)display.scrollbarV.scrollTop=display.scroller.scrollTop=scrollPos;slowPoll(cm);if(display.input.selectionStart!=null){if(!ie||ie_upto8)prepareSelectAllHack();var i=0,poll=function(){if(display.selForContextMenu==cm.doc.sel&&display.input.selectionStart==0)
operation(cm,commands.selectAll)(cm);else if(i++<10)display.detectingSelectAll=setTimeout(poll,500);else resetInput(cm);};display.detectingSelectAll=setTimeout(poll,200);}}
if(ie&&!ie_upto8)prepareSelectAllHack();if(captureRightClick){e_stop(e);var mouseup=function(){off(window,"mouseup",mouseup);setTimeout(rehide,20);};on(window,"mouseup",mouseup);}else{setTimeout(rehide,50);}}
function contextMenuInGutter(cm,e){if(!hasHandler(cm,"gutterContextMenu"))return false;return gutterEvent(cm,e,"gutterContextMenu",false,signal);}
var changeEnd=CodeMirror.changeEnd=function(change){if(!change.text)return change.to;return Pos(change.from.line+change.text.length-1,lst(change.text).length+(change.text.length==1?change.from.ch:0));};function adjustForChange(pos,change){if(cmp(pos,change.from)<0)return pos;if(cmp(pos,change.to)<=0)return changeEnd(change);var line=pos.line+change.text.length-(change.to.line-change.from.line)-1,ch=pos.ch;if(pos.line==change.to.line)ch+=changeEnd(change).ch-change.to.ch;return Pos(line,ch);}
function computeSelAfterChange(doc,change){var out=[];for(var i=0;i<doc.sel.ranges.length;i++){var range=doc.sel.ranges[i];out.push(new Range(adjustForChange(range.anchor,change),adjustForChange(range.head,change)));}
return normalizeSelection(out,doc.sel.primIndex);}
function offsetPos(pos,old,nw){if(pos.line==old.line)
return Pos(nw.line,pos.ch-old.ch+nw.ch);else
return Pos(nw.line+(pos.line-old.line),pos.ch);}
function computeReplacedSel(doc,changes,hint){var out=[];var oldPrev=Pos(doc.first,0),newPrev=oldPrev;for(var i=0;i<changes.length;i++){var change=changes[i];var from=offsetPos(change.from,oldPrev,newPrev);var to=offsetPos(changeEnd(change),oldPrev,newPrev);oldPrev=change.to;newPrev=to;if(hint=="around"){var range=doc.sel.ranges[i],inv=cmp(range.head,range.anchor)<0;out[i]=new Range(inv?to:from,inv?from:to);}else{out[i]=new Range(from,from);}}
return new Selection(out,doc.sel.primIndex);}
function filterChange(doc,change,update){var obj={canceled:false,from:change.from,to:change.to,text:change.text,origin:change.origin,cancel:function(){this.canceled=true;}};if(update)obj.update=function(from,to,text,origin){if(from)this.from=clipPos(doc,from);if(to)this.to=clipPos(doc,to);if(text)this.text=text;if(origin!==undefined)this.origin=origin;};signal(doc,"beforeChange",doc,obj);if(doc.cm)signal(doc.cm,"beforeChange",doc.cm,obj);if(obj.canceled)return null;return{from:obj.from,to:obj.to,text:obj.text,origin:obj.origin};}
function makeChange(doc,change,ignoreReadOnly){if(doc.cm){if(!doc.cm.curOp)return operation(doc.cm,makeChange)(doc,change,ignoreReadOnly);if(doc.cm.state.suppressEdits)return;}
if(hasHandler(doc,"beforeChange")||doc.cm&&hasHandler(doc.cm,"beforeChange")){change=filterChange(doc,change,true);if(!change)return;}
var split=sawReadOnlySpans&&!ignoreReadOnly&&removeReadOnlyRanges(doc,change.from,change.to);if(split){for(var i=split.length-1;i>=0;--i)
makeChangeInner(doc,{from:split[i].from,to:split[i].to,text:i?[""]:change.text});}else{makeChangeInner(doc,change);}}
function makeChangeInner(doc,change){if(change.text.length==1&&change.text[0]==""&&cmp(change.from,change.to)==0)return;var selAfter=computeSelAfterChange(doc,change);addChangeToHistory(doc,change,selAfter,doc.cm?doc.cm.curOp.id:NaN);makeChangeSingleDoc(doc,change,selAfter,stretchSpansOverChange(doc,change));var rebased=[];linkedDocs(doc,function(doc,sharedHist){if(!sharedHist&&indexOf(rebased,doc.history)==-1){rebaseHist(doc.history,change);rebased.push(doc.history);}
makeChangeSingleDoc(doc,change,null,stretchSpansOverChange(doc,change));});}
function makeChangeFromHistory(doc,type,allowSelectionOnly){if(doc.cm&&doc.cm.state.suppressEdits)return;var hist=doc.history,event,selAfter=doc.sel;var source=type=="undo"?hist.done:hist.undone,dest=type=="undo"?hist.undone:hist.done;for(var i=0;i<source.length;i++){event=source[i];if(allowSelectionOnly?event.ranges&&!event.equals(doc.sel):!event.ranges)
break;}
if(i==source.length)return;hist.lastOrigin=hist.lastSelOrigin=null;for(;;){event=source.pop();if(event.ranges){pushSelectionToHistory(event,dest);if(allowSelectionOnly&&!event.equals(doc.sel)){setSelection(doc,event,{clearRedo:false});return;}
selAfter=event;}
else break;}
var antiChanges=[];pushSelectionToHistory(selAfter,dest);dest.push({changes:antiChanges,generation:hist.generation});hist.generation=event.generation||++hist.maxGeneration;var filter=hasHandler(doc,"beforeChange")||doc.cm&&hasHandler(doc.cm,"beforeChange");for(var i=event.changes.length-1;i>=0;--i){var change=event.changes[i];change.origin=type;if(filter&&!filterChange(doc,change,false)){source.length=0;return;}
antiChanges.push(historyChangeFromChange(doc,change));var after=i?computeSelAfterChange(doc,change,null):lst(source);makeChangeSingleDoc(doc,change,after,mergeOldSpans(doc,change));if(!i&&doc.cm)doc.cm.scrollIntoView(change);var rebased=[];linkedDocs(doc,function(doc,sharedHist){if(!sharedHist&&indexOf(rebased,doc.history)==-1){rebaseHist(doc.history,change);rebased.push(doc.history);}
makeChangeSingleDoc(doc,change,null,mergeOldSpans(doc,change));});}}
function shiftDoc(doc,distance){if(distance==0)return;doc.first+=distance;doc.sel=new Selection(map(doc.sel.ranges,function(range){return new Range(Pos(range.anchor.line+distance,range.anchor.ch),Pos(range.head.line+distance,range.head.ch));}),doc.sel.primIndex);if(doc.cm){regChange(doc.cm,doc.first,doc.first-distance,distance);for(var d=doc.cm.display,l=d.viewFrom;l<d.viewTo;l++)
regLineChange(doc.cm,l,"gutter");}}
function makeChangeSingleDoc(doc,change,selAfter,spans){if(doc.cm&&!doc.cm.curOp)
return operation(doc.cm,makeChangeSingleDoc)(doc,change,selAfter,spans);if(change.to.line<doc.first){shiftDoc(doc,change.text.length-1-(change.to.line-change.from.line));return;}
if(change.from.line>doc.lastLine())return;if(change.from.line<doc.first){var shift=change.text.length-1-(doc.first-change.from.line);shiftDoc(doc,shift);change={from:Pos(doc.first,0),to:Pos(change.to.line+shift,change.to.ch),text:[lst(change.text)],origin:change.origin};}
var last=doc.lastLine();if(change.to.line>last){change={from:change.from,to:Pos(last,getLine(doc,last).text.length),text:[change.text[0]],origin:change.origin};}
change.removed=getBetween(doc,change.from,change.to);if(!selAfter)selAfter=computeSelAfterChange(doc,change,null);if(doc.cm)makeChangeSingleDocInEditor(doc.cm,change,spans);else updateDoc(doc,change,spans);setSelectionNoUndo(doc,selAfter,sel_dontScroll);}
function makeChangeSingleDocInEditor(cm,change,spans){var doc=cm.doc,display=cm.display,from=change.from,to=change.to;var recomputeMaxLength=false,checkWidthStart=from.line;if(!cm.options.lineWrapping){checkWidthStart=lineNo(visualLine(getLine(doc,from.line)));doc.iter(checkWidthStart,to.line+1,function(line){if(line==display.maxLine){recomputeMaxLength=true;return true;}});}
if(doc.sel.contains(change.from,change.to)>-1)
signalCursorActivity(cm);updateDoc(doc,change,spans,estimateHeight(cm));if(!cm.options.lineWrapping){doc.iter(checkWidthStart,from.line+change.text.length,function(line){var len=lineLength(line);if(len>display.maxLineLength){display.maxLine=line;display.maxLineLength=len;display.maxLineChanged=true;recomputeMaxLength=false;}});if(recomputeMaxLength)cm.curOp.updateMaxLine=true;}
doc.frontier=Math.min(doc.frontier,from.line);startWorker(cm,400);var lendiff=change.text.length-(to.line-from.line)-1;if(from.line==to.line&&change.text.length==1&&!isWholeLineUpdate(cm.doc,change))
regLineChange(cm,from.line,"text");else
regChange(cm,from.line,to.line+1,lendiff);var changesHandler=hasHandler(cm,"changes"),changeHandler=hasHandler(cm,"change");if(changeHandler||changesHandler){var obj={from:from,to:to,text:change.text,removed:change.removed,origin:change.origin};if(changeHandler)signalLater(cm,"change",cm,obj);if(changesHandler)(cm.curOp.changeObjs||(cm.curOp.changeObjs=[])).push(obj);}
cm.display.selForContextMenu=null;}
function replaceRange(doc,code,from,to,origin){if(!to)to=from;if(cmp(to,from)<0){var tmp=to;to=from;from=tmp;}
if(typeof code=="string")code=splitLines(code);makeChange(doc,{from:from,to:to,text:code,origin:origin});}
function maybeScrollWindow(cm,coords){var display=cm.display,box=display.sizer.getBoundingClientRect(),doScroll=null;if(coords.top+box.top<0)doScroll=true;else if(coords.bottom+box.top>(window.innerHeight||document.documentElement.clientHeight))doScroll=false;if(doScroll!=null&&!phantom){var scrollNode=elt("div","\u200b",null,"position: absolute; top: "+
(coords.top-display.viewOffset-paddingTop(cm.display))+"px; height: "+
(coords.bottom-coords.top+scrollerCutOff)+"px; left: "+
coords.left+"px; width: 2px;");cm.display.lineSpace.appendChild(scrollNode);scrollNode.scrollIntoView(doScroll);cm.display.lineSpace.removeChild(scrollNode);}}
function scrollPosIntoView(cm,pos,end,margin){if(margin==null)margin=0;for(;;){var changed=false,coords=cursorCoords(cm,pos);var endCoords=!end||end==pos?coords:cursorCoords(cm,end);var scrollPos=calculateScrollPos(cm,Math.min(coords.left,endCoords.left),Math.min(coords.top,endCoords.top)-margin,Math.max(coords.left,endCoords.left),Math.max(coords.bottom,endCoords.bottom)+margin);var startTop=cm.doc.scrollTop,startLeft=cm.doc.scrollLeft;if(scrollPos.scrollTop!=null){setScrollTop(cm,scrollPos.scrollTop);if(Math.abs(cm.doc.scrollTop-startTop)>1)changed=true;}
if(scrollPos.scrollLeft!=null){setScrollLeft(cm,scrollPos.scrollLeft);if(Math.abs(cm.doc.scrollLeft-startLeft)>1)changed=true;}
if(!changed)return coords;}}
function scrollIntoView(cm,x1,y1,x2,y2){var scrollPos=calculateScrollPos(cm,x1,y1,x2,y2);if(scrollPos.scrollTop!=null)setScrollTop(cm,scrollPos.scrollTop);if(scrollPos.scrollLeft!=null)setScrollLeft(cm,scrollPos.scrollLeft);}
function calculateScrollPos(cm,x1,y1,x2,y2){var display=cm.display,snapMargin=textHeight(cm.display);if(y1<0)y1=0;var screentop=cm.curOp&&cm.curOp.scrollTop!=null?cm.curOp.scrollTop:display.scroller.scrollTop;var screen=display.scroller.clientHeight-scrollerCutOff,result={};var docBottom=cm.doc.height+paddingVert(display);var atTop=y1<snapMargin,atBottom=y2>docBottom-snapMargin;if(y1<screentop){result.scrollTop=atTop?0:y1;}else if(y2>screentop+screen){var newTop=Math.min(y1,(atBottom?docBottom:y2)-screen);if(newTop!=screentop)result.scrollTop=newTop;}
var screenleft=cm.curOp&&cm.curOp.scrollLeft!=null?cm.curOp.scrollLeft:display.scroller.scrollLeft;var screenw=display.scroller.clientWidth-scrollerCutOff;x1+=display.gutters.offsetWidth;x2+=display.gutters.offsetWidth;var gutterw=display.gutters.offsetWidth;var atLeft=x1<gutterw+10;if(x1<screenleft+gutterw||atLeft){if(atLeft)x1=0;result.scrollLeft=Math.max(0,x1-10-gutterw);}else if(x2>screenw+screenleft-3){result.scrollLeft=x2+10-screenw;}
return result;}
function addToScrollPos(cm,left,top){if(left!=null||top!=null)resolveScrollToPos(cm);if(left!=null)
cm.curOp.scrollLeft=(cm.curOp.scrollLeft==null?cm.doc.scrollLeft:cm.curOp.scrollLeft)+left;if(top!=null)
cm.curOp.scrollTop=(cm.curOp.scrollTop==null?cm.doc.scrollTop:cm.curOp.scrollTop)+top;}
function ensureCursorVisible(cm){resolveScrollToPos(cm);var cur=cm.getCursor(),from=cur,to=cur;if(!cm.options.lineWrapping){from=cur.ch?Pos(cur.line,cur.ch-1):cur;to=Pos(cur.line,cur.ch+1);}
cm.curOp.scrollToPos={from:from,to:to,margin:cm.options.cursorScrollMargin,isCursor:true};}
function resolveScrollToPos(cm){var range=cm.curOp.scrollToPos;if(range){cm.curOp.scrollToPos=null;var from=estimateCoords(cm,range.from),to=estimateCoords(cm,range.to);var sPos=calculateScrollPos(cm,Math.min(from.left,to.left),Math.min(from.top,to.top)-range.margin,Math.max(from.right,to.right),Math.max(from.bottom,to.bottom)+range.margin);cm.scrollTo(sPos.scrollLeft,sPos.scrollTop);}}
function indentLine(cm,n,how,aggressive){var doc=cm.doc,state;if(how==null)how="add";if(how=="smart"){if(!cm.doc.mode.indent)how="prev";else state=getStateBefore(cm,n);}
var tabSize=cm.options.tabSize;var line=getLine(doc,n),curSpace=countColumn(line.text,null,tabSize);if(line.stateAfter)line.stateAfter=null;var curSpaceString=line.text.match(/^\s*/)[0],indentation;if(!aggressive&&!/\S/.test(line.text)){indentation=0;how="not";}else if(how=="smart"){indentation=cm.doc.mode.indent(state,line.text.slice(curSpaceString.length),line.text);if(indentation==Pass){if(!aggressive)return;how="prev";}}
if(how=="prev"){if(n>doc.first)indentation=countColumn(getLine(doc,n-1).text,null,tabSize);else indentation=0;}else if(how=="add"){indentation=curSpace+cm.options.indentUnit;}else if(how=="subtract"){indentation=curSpace-cm.options.indentUnit;}else if(typeof how=="number"){indentation=curSpace+how;}
indentation=Math.max(0,indentation);var indentString="",pos=0;if(cm.options.indentWithTabs)
for(var i=Math.floor(indentation/tabSize);i;--i){pos+=tabSize;indentString+="\t";}
if(pos<indentation)indentString+=spaceStr(indentation-pos);if(indentString!=curSpaceString){replaceRange(cm.doc,indentString,Pos(n,0),Pos(n,curSpaceString.length),"+input");}else{for(var i=0;i<doc.sel.ranges.length;i++){var range=doc.sel.ranges[i];if(range.head.line==n&&range.head.ch<curSpaceString.length){var pos=Pos(n,curSpaceString.length);replaceOneSelection(doc,i,new Range(pos,pos));break;}}}
line.stateAfter=null;}
function changeLine(cm,handle,changeType,op){var no=handle,line=handle,doc=cm.doc;if(typeof handle=="number")line=getLine(doc,clipLine(doc,handle));else no=lineNo(handle);if(no==null)return null;if(op(line,no))regLineChange(cm,no,changeType);return line;}
function deleteNearSelection(cm,compute){var ranges=cm.doc.sel.ranges,kill=[];for(var i=0;i<ranges.length;i++){var toKill=compute(ranges[i]);while(kill.length&&cmp(toKill.from,lst(kill).to)<=0){var replaced=kill.pop();if(cmp(replaced.from,toKill.from)<0){toKill.from=replaced.from;break;}}
kill.push(toKill);}
runInOp(cm,function(){for(var i=kill.length-1;i>=0;i--)
replaceRange(cm.doc,"",kill[i].from,kill[i].to,"+delete");ensureCursorVisible(cm);});}
function findPosH(doc,pos,dir,unit,visually){var line=pos.line,ch=pos.ch,origDir=dir;var lineObj=getLine(doc,line);var possible=true;function findNextLine(){var l=line+dir;if(l<doc.first||l>=doc.first+doc.size)return(possible=false);line=l;return lineObj=getLine(doc,l);}
function moveOnce(boundToLine){var next=(visually?moveVisually:moveLogically)(lineObj,ch,dir,true);if(next==null){if(!boundToLine&&findNextLine()){if(visually)ch=(dir<0?lineRight:lineLeft)(lineObj);else ch=dir<0?lineObj.text.length:0;}else return(possible=false);}else ch=next;return true;}
if(unit=="char")moveOnce();else if(unit=="column")moveOnce(true);else if(unit=="word"||unit=="group"){var sawType=null,group=unit=="group";var helper=doc.cm&&doc.cm.getHelper(pos,"wordChars");for(var first=true;;first=false){if(dir<0&&!moveOnce(!first))break;var cur=lineObj.text.charAt(ch)||"\n";var type=isWordChar(cur,helper)?"w":group&&cur=="\n"?"n":!group||/\s/.test(cur)?null:"p";if(group&&!first&&!type)type="s";if(sawType&&sawType!=type){if(dir<0){dir=1;moveOnce();}
break;}
if(type)sawType=type;if(dir>0&&!moveOnce(!first))break;}}
var result=skipAtomic(doc,Pos(line,ch),origDir,true);if(!possible)result.hitSide=true;return result;}
function findPosV(cm,pos,dir,unit){var doc=cm.doc,x=pos.left,y;if(unit=="page"){var pageSize=Math.min(cm.display.wrapper.clientHeight,window.innerHeight||document.documentElement.clientHeight);y=pos.top+dir*(pageSize-(dir<0?1.5:.5)*textHeight(cm.display));}else if(unit=="line"){y=dir>0?pos.bottom+3:pos.top-3;}
for(;;){var target=coordsChar(cm,x,y);if(!target.outside)break;if(dir<0?y<=0:y>=doc.height){target.hitSide=true;break;}
y+=dir*5;}
return target;}
function findWordAt(cm,pos){var doc=cm.doc,line=getLine(doc,pos.line).text;var start=pos.ch,end=pos.ch;if(line){var helper=cm.getHelper(pos,"wordChars");if((pos.xRel<0||end==line.length)&&start)--start;else++end;var startChar=line.charAt(start);var check=isWordChar(startChar,helper)?function(ch){return isWordChar(ch,helper);}:/\s/.test(startChar)?function(ch){return/\s/.test(ch);}:function(ch){return!/\s/.test(ch)&&!isWordChar(ch);};while(start>0&&check(line.charAt(start-1)))--start;while(end<line.length&&check(line.charAt(end)))++end;}
return new Range(Pos(pos.line,start),Pos(pos.line,end));}
CodeMirror.prototype={constructor:CodeMirror,focus:function(){window.focus();focusInput(this);fastPoll(this);},setOption:function(option,value){var options=this.options,old=options[option];if(options[option]==value&&option!="mode")return;options[option]=value;if(optionHandlers.hasOwnProperty(option))
operation(this,optionHandlers[option])(this,value,old);},getOption:function(option){return this.options[option];},getDoc:function(){return this.doc;},addKeyMap:function(map,bottom){this.state.keyMaps[bottom?"push":"unshift"](map);},removeKeyMap:function(map){var maps=this.state.keyMaps;for(var i=0;i<maps.length;++i)
if(maps[i]==map||(typeof maps[i]!="string"&&maps[i].name==map)){maps.splice(i,1);return true;}},addOverlay:methodOp(function(spec,options){var mode=spec.token?spec:CodeMirror.getMode(this.options,spec);if(mode.startState)throw new Error("Overlays may not be stateful.");this.state.overlays.push({mode:mode,modeSpec:spec,opaque:options&&options.opaque});this.state.modeGen++;regChange(this);}),removeOverlay:methodOp(function(spec){var overlays=this.state.overlays;for(var i=0;i<overlays.length;++i){var cur=overlays[i].modeSpec;if(cur==spec||typeof spec=="string"&&cur.name==spec){overlays.splice(i,1);this.state.modeGen++;regChange(this);return;}}}),indentLine:methodOp(function(n,dir,aggressive){if(typeof dir!="string"&&typeof dir!="number"){if(dir==null)dir=this.options.smartIndent?"smart":"prev";else dir=dir?"add":"subtract";}
if(isLine(this.doc,n))indentLine(this,n,dir,aggressive);}),indentSelection:methodOp(function(how){var ranges=this.doc.sel.ranges,end=-1;for(var i=0;i<ranges.length;i++){var range=ranges[i];if(!range.empty()){var start=Math.max(end,range.from().line);var to=range.to();end=Math.min(this.lastLine(),to.line-(to.ch?0:1))+1;for(var j=start;j<end;++j)
indentLine(this,j,how);}else if(range.head.line>end){indentLine(this,range.head.line,how,true);end=range.head.line;if(i==this.doc.sel.primIndex)ensureCursorVisible(this);}}}),getTokenAt:function(pos,precise){var doc=this.doc;pos=clipPos(doc,pos);var state=getStateBefore(this,pos.line,precise),mode=this.doc.mode;var line=getLine(doc,pos.line);var stream=new StringStream(line.text,this.options.tabSize);while(stream.pos<pos.ch&&!stream.eol()){stream.start=stream.pos;var style=readToken(mode,stream,state);}
return{start:stream.start,end:stream.pos,string:stream.current(),type:style||null,state:state};},getTokenTypeAt:function(pos){pos=clipPos(this.doc,pos);var styles=getLineStyles(this,getLine(this.doc,pos.line));var before=0,after=(styles.length-1)/2,ch=pos.ch;var type;if(ch==0)type=styles[2];else for(;;){var mid=(before+after)>>1;if((mid?styles[mid*2-1]:0)>=ch)after=mid;else if(styles[mid*2+1]<ch)before=mid+1;else{type=styles[mid*2+2];break;}}
var cut=type?type.indexOf("cm-overlay "):-1;return cut<0?type:cut==0?null:type.slice(0,cut-1);},getModeAt:function(pos){var mode=this.doc.mode;if(!mode.innerMode)return mode;return CodeMirror.innerMode(mode,this.getTokenAt(pos).state).mode;},getHelper:function(pos,type){return this.getHelpers(pos,type)[0];},getHelpers:function(pos,type){var found=[];if(!helpers.hasOwnProperty(type))return helpers;var help=helpers[type],mode=this.getModeAt(pos);if(typeof mode[type]=="string"){if(help[mode[type]])found.push(help[mode[type]]);}else if(mode[type]){for(var i=0;i<mode[type].length;i++){var val=help[mode[type][i]];if(val)found.push(val);}}else if(mode.helperType&&help[mode.helperType]){found.push(help[mode.helperType]);}else if(help[mode.name]){found.push(help[mode.name]);}
for(var i=0;i<help._global.length;i++){var cur=help._global[i];if(cur.pred(mode,this)&&indexOf(found,cur.val)==-1)
found.push(cur.val);}
return found;},getStateAfter:function(line,precise){var doc=this.doc;line=clipLine(doc,line==null?doc.first+doc.size-1:line);return getStateBefore(this,line+1,precise);},cursorCoords:function(start,mode){var pos,range=this.doc.sel.primary();if(start==null)pos=range.head;else if(typeof start=="object")pos=clipPos(this.doc,start);else pos=start?range.from():range.to();return cursorCoords(this,pos,mode||"page");},charCoords:function(pos,mode){return charCoords(this,clipPos(this.doc,pos),mode||"page");},coordsChar:function(coords,mode){coords=fromCoordSystem(this,coords,mode||"page");return coordsChar(this,coords.left,coords.top);},lineAtHeight:function(height,mode){height=fromCoordSystem(this,{top:height,left:0},mode||"page").top;return lineAtHeight(this.doc,height+this.display.viewOffset);},heightAtLine:function(line,mode){var end=false,last=this.doc.first+this.doc.size-1;if(line<this.doc.first)line=this.doc.first;else if(line>last){line=last;end=true;}
var lineObj=getLine(this.doc,line);return intoCoordSystem(this,lineObj,{top:0,left:0},mode||"page").top+
(end?this.doc.height-heightAtLine(lineObj):0);},defaultTextHeight:function(){return textHeight(this.display);},defaultCharWidth:function(){return charWidth(this.display);},setGutterMarker:methodOp(function(line,gutterID,value){return changeLine(this,line,"gutter",function(line){var markers=line.gutterMarkers||(line.gutterMarkers={});markers[gutterID]=value;if(!value&&isEmpty(markers))line.gutterMarkers=null;return true;});}),clearGutter:methodOp(function(gutterID){var cm=this,doc=cm.doc,i=doc.first;doc.iter(function(line){if(line.gutterMarkers&&line.gutterMarkers[gutterID]){line.gutterMarkers[gutterID]=null;regLineChange(cm,i,"gutter");if(isEmpty(line.gutterMarkers))line.gutterMarkers=null;}
++i;});}),addLineClass:methodOp(function(handle,where,cls){return changeLine(this,handle,"class",function(line){var prop=where=="text"?"textClass":where=="background"?"bgClass":"wrapClass";if(!line[prop])line[prop]=cls;else if(new RegExp("(?:^|\\s)"+cls+"(?:$|\\s)").test(line[prop]))return false;else line[prop]+=" "+cls;return true;});}),removeLineClass:methodOp(function(handle,where,cls){return changeLine(this,handle,"class",function(line){var prop=where=="text"?"textClass":where=="background"?"bgClass":"wrapClass";var cur=line[prop];if(!cur)return false;else if(cls==null)line[prop]=null;else{var found=cur.match(new RegExp("(?:^|\\s+)"+cls+"(?:$|\\s+)"));if(!found)return false;var end=found.index+found[0].length;line[prop]=cur.slice(0,found.index)+(!found.index||end==cur.length?"":" ")+cur.slice(end)||null;}
return true;});}),addLineWidget:methodOp(function(handle,node,options){return addLineWidget(this,handle,node,options);}),removeLineWidget:function(widget){widget.clear();},lineInfo:function(line){if(typeof line=="number"){if(!isLine(this.doc,line))return null;var n=line;line=getLine(this.doc,line);if(!line)return null;}else{var n=lineNo(line);if(n==null)return null;}
return{line:n,handle:line,text:line.text,gutterMarkers:line.gutterMarkers,textClass:line.textClass,bgClass:line.bgClass,wrapClass:line.wrapClass,widgets:line.widgets};},getViewport:function(){return{from:this.display.viewFrom,to:this.display.viewTo};},addWidget:function(pos,node,scroll,vert,horiz){var display=this.display;pos=cursorCoords(this,clipPos(this.doc,pos));var top=pos.bottom,left=pos.left;node.style.position="absolute";display.sizer.appendChild(node);if(vert=="over"){top=pos.top;}else if(vert=="above"||vert=="near"){var vspace=Math.max(display.wrapper.clientHeight,this.doc.height),hspace=Math.max(display.sizer.clientWidth,display.lineSpace.clientWidth);if((vert=='above'||pos.bottom+node.offsetHeight>vspace)&&pos.top>node.offsetHeight)
top=pos.top-node.offsetHeight;else if(pos.bottom+node.offsetHeight<=vspace)
top=pos.bottom;if(left+node.offsetWidth>hspace)
left=hspace-node.offsetWidth;}
node.style.top=top+"px";node.style.left=node.style.right="";if(horiz=="right"){left=display.sizer.clientWidth-node.offsetWidth;node.style.right="0px";}else{if(horiz=="left")left=0;else if(horiz=="middle")left=(display.sizer.clientWidth-node.offsetWidth)/2;node.style.left=left+"px";}
if(scroll)
scrollIntoView(this,left,top,left+node.offsetWidth,top+node.offsetHeight);},triggerOnKeyDown:methodOp(onKeyDown),triggerOnKeyPress:methodOp(onKeyPress),triggerOnKeyUp:methodOp(onKeyUp),execCommand:function(cmd){if(commands.hasOwnProperty(cmd))
return commands[cmd](this);},findPosH:function(from,amount,unit,visually){var dir=1;if(amount<0){dir=-1;amount=-amount;}
for(var i=0,cur=clipPos(this.doc,from);i<amount;++i){cur=findPosH(this.doc,cur,dir,unit,visually);if(cur.hitSide)break;}
return cur;},moveH:methodOp(function(dir,unit){var cm=this;cm.extendSelectionsBy(function(range){if(cm.display.shift||cm.doc.extend||range.empty())
return findPosH(cm.doc,range.head,dir,unit,cm.options.rtlMoveVisually);else
return dir<0?range.from():range.to();},sel_move);}),deleteH:methodOp(function(dir,unit){var sel=this.doc.sel,doc=this.doc;if(sel.somethingSelected())
doc.replaceSelection("",null,"+delete");else
deleteNearSelection(this,function(range){var other=findPosH(doc,range.head,dir,unit,false);return dir<0?{from:other,to:range.head}:{from:range.head,to:other};});}),findPosV:function(from,amount,unit,goalColumn){var dir=1,x=goalColumn;if(amount<0){dir=-1;amount=-amount;}
for(var i=0,cur=clipPos(this.doc,from);i<amount;++i){var coords=cursorCoords(this,cur,"div");if(x==null)x=coords.left;else coords.left=x;cur=findPosV(this,coords,dir,unit);if(cur.hitSide)break;}
return cur;},moveV:methodOp(function(dir,unit){var cm=this,doc=this.doc,goals=[];var collapse=!cm.display.shift&&!doc.extend&&doc.sel.somethingSelected();doc.extendSelectionsBy(function(range){if(collapse)
return dir<0?range.from():range.to();var headPos=cursorCoords(cm,range.head,"div");if(range.goalColumn!=null)headPos.left=range.goalColumn;goals.push(headPos.left);var pos=findPosV(cm,headPos,dir,unit);if(unit=="page"&&range==doc.sel.primary())
addToScrollPos(cm,null,charCoords(cm,pos,"div").top-headPos.top);return pos;},sel_move);if(goals.length)for(var i=0;i<doc.sel.ranges.length;i++)
doc.sel.ranges[i].goalColumn=goals[i];}),toggleOverwrite:function(value){if(value!=null&&value==this.state.overwrite)return;if(this.state.overwrite=!this.state.overwrite)
addClass(this.display.cursorDiv,"CodeMirror-overwrite");else
rmClass(this.display.cursorDiv,"CodeMirror-overwrite");signal(this,"overwriteToggle",this,this.state.overwrite);},hasFocus:function(){return activeElt()==this.display.input;},scrollTo:methodOp(function(x,y){if(x!=null||y!=null)resolveScrollToPos(this);if(x!=null)this.curOp.scrollLeft=x;if(y!=null)this.curOp.scrollTop=y;}),getScrollInfo:function(){var scroller=this.display.scroller,co=scrollerCutOff;return{left:scroller.scrollLeft,top:scroller.scrollTop,height:scroller.scrollHeight-co,width:scroller.scrollWidth-co,clientHeight:scroller.clientHeight-co,clientWidth:scroller.clientWidth-co};},scrollIntoView:methodOp(function(range,margin){if(range==null){range={from:this.doc.sel.primary().head,to:null};if(margin==null)margin=this.options.cursorScrollMargin;}else if(typeof range=="number"){range={from:Pos(range,0),to:null};}else if(range.from==null){range={from:range,to:null};}
if(!range.to)range.to=range.from;range.margin=margin||0;if(range.from.line!=null){resolveScrollToPos(this);this.curOp.scrollToPos=range;}else{var sPos=calculateScrollPos(this,Math.min(range.from.left,range.to.left),Math.min(range.from.top,range.to.top)-range.margin,Math.max(range.from.right,range.to.right),Math.max(range.from.bottom,range.to.bottom)+range.margin);this.scrollTo(sPos.scrollLeft,sPos.scrollTop);}}),setSize:methodOp(function(width,height){function interpret(val){return typeof val=="number"||/^\d+$/.test(String(val))?val+"px":val;}
if(width!=null)this.display.wrapper.style.width=interpret(width);if(height!=null)this.display.wrapper.style.height=interpret(height);if(this.options.lineWrapping)clearLineMeasurementCache(this);this.curOp.forceUpdate=true;signal(this,"refresh",this);}),operation:function(f){return runInOp(this,f);},refresh:methodOp(function(){var oldHeight=this.display.cachedTextHeight;regChange(this);this.curOp.forceUpdate=true;clearCaches(this);this.scrollTo(this.doc.scrollLeft,this.doc.scrollTop);updateGutterSpace(this);if(oldHeight==null||Math.abs(oldHeight-textHeight(this.display))>.5)
estimateLineHeights(this);signal(this,"refresh",this);}),swapDoc:methodOp(function(doc){var old=this.doc;old.cm=null;attachDoc(this,doc);clearCaches(this);resetInput(this);this.scrollTo(doc.scrollLeft,doc.scrollTop);signalLater(this,"swapDoc",this,old);return old;}),getInputField:function(){return this.display.input;},getWrapperElement:function(){return this.display.wrapper;},getScrollerElement:function(){return this.display.scroller;},getGutterElement:function(){return this.display.gutters;}};eventMixin(CodeMirror);var defaults=CodeMirror.defaults={};var optionHandlers=CodeMirror.optionHandlers={};function option(name,deflt,handle,notOnInit){CodeMirror.defaults[name]=deflt;if(handle)optionHandlers[name]=notOnInit?function(cm,val,old){if(old!=Init)handle(cm,val,old);}:handle;}
var Init=CodeMirror.Init={toString:function(){return"CodeMirror.Init";}};option("value","",function(cm,val){cm.setValue(val);},true);option("mode",null,function(cm,val){cm.doc.modeOption=val;loadMode(cm);},true);option("indentUnit",2,loadMode,true);option("indentWithTabs",false);option("smartIndent",true);option("tabSize",4,function(cm){resetModeState(cm);clearCaches(cm);regChange(cm);},true);option("specialChars",/[\t\u0000-\u0019\u00ad\u200b\u2028\u2029\ufeff]/g,function(cm,val){cm.options.specialChars=new RegExp(val.source+(val.test("\t")?"":"|\t"),"g");cm.refresh();},true);option("specialCharPlaceholder",defaultSpecialCharPlaceholder,function(cm){cm.refresh();},true);option("electricChars",true);option("rtlMoveVisually",!windows);option("wholeLineUpdateBefore",true);option("theme","default",function(cm){themeChanged(cm);guttersChanged(cm);},true);option("keyMap","default",keyMapChanged);option("extraKeys",null);option("lineWrapping",false,wrappingChanged,true);option("gutters",[],function(cm){setGuttersForLineNumbers(cm.options);guttersChanged(cm);},true);option("fixedGutter",true,function(cm,val){cm.display.gutters.style.left=val?compensateForHScroll(cm.display)+"px":"0";cm.refresh();},true);option("coverGutterNextToScrollbar",false,updateScrollbars,true);option("lineNumbers",false,function(cm){setGuttersForLineNumbers(cm.options);guttersChanged(cm);},true);option("firstLineNumber",1,guttersChanged,true);option("lineNumberFormatter",function(integer){return integer;},guttersChanged,true);option("showCursorWhenSelecting",false,updateSelection,true);option("resetSelectionOnContextMenu",true);option("readOnly",false,function(cm,val){if(val=="nocursor"){onBlur(cm);cm.display.input.blur();cm.display.disabled=true;}else{cm.display.disabled=false;if(!val)resetInput(cm);}});option("disableInput",false,function(cm,val){if(!val)resetInput(cm);},true);option("dragDrop",true);option("cursorBlinkRate",530);option("cursorScrollMargin",0);option("cursorHeight",1);option("workTime",100);option("workDelay",100);option("flattenSpans",true,resetModeState,true);option("addModeClass",false,resetModeState,true);option("pollInterval",100);option("undoDepth",200,function(cm,val){cm.doc.history.undoDepth=val;});option("historyEventDelay",1250);option("viewportMargin",10,function(cm){cm.refresh();},true);option("maxHighlightLength",10000,resetModeState,true);option("moveInputWithCursor",true,function(cm,val){if(!val)cm.display.inputDiv.style.top=cm.display.inputDiv.style.left=0;});option("tabindex",null,function(cm,val){cm.display.input.tabIndex=val||"";});option("autofocus",null);var modes=CodeMirror.modes={},mimeModes=CodeMirror.mimeModes={};CodeMirror.defineMode=function(name,mode){if(!CodeMirror.defaults.mode&&name!="null")CodeMirror.defaults.mode=name;if(arguments.length>2){mode.dependencies=[];for(var i=2;i<arguments.length;++i)mode.dependencies.push(arguments[i]);}
modes[name]=mode;};CodeMirror.defineMIME=function(mime,spec){mimeModes[mime]=spec;};CodeMirror.resolveMode=function(spec){if(typeof spec=="string"&&mimeModes.hasOwnProperty(spec)){spec=mimeModes[spec];}else if(spec&&typeof spec.name=="string"&&mimeModes.hasOwnProperty(spec.name)){var found=mimeModes[spec.name];if(typeof found=="string")found={name:found};spec=createObj(found,spec);spec.name=found.name;}else if(typeof spec=="string"&&/^[\w\-]+\/[\w\-]+\+xml$/.test(spec)){return CodeMirror.resolveMode("application/xml");}
if(typeof spec=="string")return{name:spec};else return spec||{name:"null"};};CodeMirror.getMode=function(options,spec){var spec=CodeMirror.resolveMode(spec);var mfactory=modes[spec.name];if(!mfactory)return CodeMirror.getMode(options,"text/plain");var modeObj=mfactory(options,spec);if(modeExtensions.hasOwnProperty(spec.name)){var exts=modeExtensions[spec.name];for(var prop in exts){if(!exts.hasOwnProperty(prop))continue;if(modeObj.hasOwnProperty(prop))modeObj["_"+prop]=modeObj[prop];modeObj[prop]=exts[prop];}}
modeObj.name=spec.name;if(spec.helperType)modeObj.helperType=spec.helperType;if(spec.modeProps)for(var prop in spec.modeProps)
modeObj[prop]=spec.modeProps[prop];return modeObj;};CodeMirror.defineMode("null",function(){return{token:function(stream){stream.skipToEnd();}};});CodeMirror.defineMIME("text/plain","null");var modeExtensions=CodeMirror.modeExtensions={};CodeMirror.extendMode=function(mode,properties){var exts=modeExtensions.hasOwnProperty(mode)?modeExtensions[mode]:(modeExtensions[mode]={});copyObj(properties,exts);};CodeMirror.defineExtension=function(name,func){CodeMirror.prototype[name]=func;};CodeMirror.defineDocExtension=function(name,func){Doc.prototype[name]=func;};CodeMirror.defineOption=option;var initHooks=[];CodeMirror.defineInitHook=function(f){initHooks.push(f);};var helpers=CodeMirror.helpers={};CodeMirror.registerHelper=function(type,name,value){if(!helpers.hasOwnProperty(type))helpers[type]=CodeMirror[type]={_global:[]};helpers[type][name]=value;};CodeMirror.registerGlobalHelper=function(type,name,predicate,value){CodeMirror.registerHelper(type,name,value);helpers[type]._global.push({pred:predicate,val:value});};var copyState=CodeMirror.copyState=function(mode,state){if(state===true)return state;if(mode.copyState)return mode.copyState(state);var nstate={};for(var n in state){var val=state[n];if(val instanceof Array)val=val.concat([]);nstate[n]=val;}
return nstate;};var startState=CodeMirror.startState=function(mode,a1,a2){return mode.startState?mode.startState(a1,a2):true;};CodeMirror.innerMode=function(mode,state){while(mode.innerMode){var info=mode.innerMode(state);if(!info||info.mode==mode)break;state=info.state;mode=info.mode;}
return info||{mode:mode,state:state};};var commands=CodeMirror.commands={selectAll:function(cm){cm.setSelection(Pos(cm.firstLine(),0),Pos(cm.lastLine()),sel_dontScroll);},singleSelection:function(cm){cm.setSelection(cm.getCursor("anchor"),cm.getCursor("head"),sel_dontScroll);},killLine:function(cm){deleteNearSelection(cm,function(range){if(range.empty()){var len=getLine(cm.doc,range.head.line).text.length;if(range.head.ch==len&&range.head.line<cm.lastLine())
return{from:range.head,to:Pos(range.head.line+1,0)};else
return{from:range.head,to:Pos(range.head.line,len)};}else{return{from:range.from(),to:range.to()};}});},deleteLine:function(cm){deleteNearSelection(cm,function(range){return{from:Pos(range.from().line,0),to:clipPos(cm.doc,Pos(range.to().line+1,0))};});},delLineLeft:function(cm){deleteNearSelection(cm,function(range){return{from:Pos(range.from().line,0),to:range.from()};});},undo:function(cm){cm.undo();},redo:function(cm){cm.redo();},undoSelection:function(cm){cm.undoSelection();},redoSelection:function(cm){cm.redoSelection();},goDocStart:function(cm){cm.extendSelection(Pos(cm.firstLine(),0));},goDocEnd:function(cm){cm.extendSelection(Pos(cm.lastLine()));},goLineStart:function(cm){cm.extendSelectionsBy(function(range){return lineStart(cm,range.head.line);},sel_move);},goLineStartSmart:function(cm){cm.extendSelectionsBy(function(range){var start=lineStart(cm,range.head.line);var line=cm.getLineHandle(start.line);var order=getOrder(line);if(!order||order[0].level==0){var firstNonWS=Math.max(0,line.text.search(/\S/));var inWS=range.head.line==start.line&&range.head.ch<=firstNonWS&&range.head.ch;return Pos(start.line,inWS?0:firstNonWS);}
return start;},sel_move);},goLineEnd:function(cm){cm.extendSelectionsBy(function(range){return lineEnd(cm,range.head.line);},sel_move);},goLineRight:function(cm){cm.extendSelectionsBy(function(range){var top=cm.charCoords(range.head,"div").top+5;return cm.coordsChar({left:cm.display.lineDiv.offsetWidth+100,top:top},"div");},sel_move);},goLineLeft:function(cm){cm.extendSelectionsBy(function(range){var top=cm.charCoords(range.head,"div").top+5;return cm.coordsChar({left:0,top:top},"div");},sel_move);},goLineUp:function(cm){cm.moveV(-1,"line");},goLineDown:function(cm){cm.moveV(1,"line");},goPageUp:function(cm){cm.moveV(-1,"page");},goPageDown:function(cm){cm.moveV(1,"page");},goCharLeft:function(cm){cm.moveH(-1,"char");},goCharRight:function(cm){cm.moveH(1,"char");},goColumnLeft:function(cm){cm.moveH(-1,"column");},goColumnRight:function(cm){cm.moveH(1,"column");},goWordLeft:function(cm){cm.moveH(-1,"word");},goGroupRight:function(cm){cm.moveH(1,"group");},goGroupLeft:function(cm){cm.moveH(-1,"group");},goWordRight:function(cm){cm.moveH(1,"word");},delCharBefore:function(cm){cm.deleteH(-1,"char");},delCharAfter:function(cm){cm.deleteH(1,"char");},delWordBefore:function(cm){cm.deleteH(-1,"word");},delWordAfter:function(cm){cm.deleteH(1,"word");},delGroupBefore:function(cm){cm.deleteH(-1,"group");},delGroupAfter:function(cm){cm.deleteH(1,"group");},indentAuto:function(cm){cm.indentSelection("smart");},indentMore:function(cm){cm.indentSelection("add");},indentLess:function(cm){cm.indentSelection("subtract");},insertTab:function(cm){cm.replaceSelection("\t");},insertSoftTab:function(cm){var spaces=[],ranges=cm.listSelections(),tabSize=cm.options.tabSize;for(var i=0;i<ranges.length;i++){var pos=ranges[i].from();var col=countColumn(cm.getLine(pos.line),pos.ch,tabSize);spaces.push(new Array(tabSize-col%tabSize+1).join(" "));}
cm.replaceSelections(spaces);},defaultTab:function(cm){if(cm.somethingSelected())cm.indentSelection("add");else cm.execCommand("insertTab");},transposeChars:function(cm){runInOp(cm,function(){var ranges=cm.listSelections(),newSel=[];for(var i=0;i<ranges.length;i++){var cur=ranges[i].head,line=getLine(cm.doc,cur.line).text;if(line){if(cur.ch==line.length)cur=new Pos(cur.line,cur.ch-1);if(cur.ch>0){cur=new Pos(cur.line,cur.ch+1);cm.replaceRange(line.charAt(cur.ch-1)+line.charAt(cur.ch-2),Pos(cur.line,cur.ch-2),cur,"+transpose");}else if(cur.line>cm.doc.first){var prev=getLine(cm.doc,cur.line-1).text;if(prev)
cm.replaceRange(line.charAt(0)+"\n"+prev.charAt(prev.length-1),Pos(cur.line-1,prev.length-1),Pos(cur.line,1),"+transpose");}}
newSel.push(new Range(cur,cur));}
cm.setSelections(newSel);});},newlineAndIndent:function(cm){runInOp(cm,function(){var len=cm.listSelections().length;for(var i=0;i<len;i++){var range=cm.listSelections()[i];cm.replaceRange("\n",range.anchor,range.head,"+input");cm.indentLine(range.from().line+1,null,true);ensureCursorVisible(cm);}});},toggleOverwrite:function(cm){cm.toggleOverwrite();}};var keyMap=CodeMirror.keyMap={};keyMap.basic={"Left":"goCharLeft","Right":"goCharRight","Up":"goLineUp","Down":"goLineDown","End":"goLineEnd","Home":"goLineStartSmart","PageUp":"goPageUp","PageDown":"goPageDown","Delete":"delCharAfter","Backspace":"delCharBefore","Shift-Backspace":"delCharBefore","Tab":"defaultTab","Shift-Tab":"indentAuto","Enter":"newlineAndIndent","Insert":"toggleOverwrite","Esc":"singleSelection"};keyMap.pcDefault={"Ctrl-A":"selectAll","Ctrl-D":"deleteLine","Ctrl-Z":"undo","Shift-Ctrl-Z":"redo","Ctrl-Y":"redo","Ctrl-Home":"goDocStart","Ctrl-Up":"goDocStart","Ctrl-End":"goDocEnd","Ctrl-Down":"goDocEnd","Ctrl-Left":"goGroupLeft","Ctrl-Right":"goGroupRight","Alt-Left":"goLineStart","Alt-Right":"goLineEnd","Ctrl-Backspace":"delGroupBefore","Ctrl-Delete":"delGroupAfter","Ctrl-S":"save","Ctrl-F":"find","Ctrl-G":"findNext","Shift-Ctrl-G":"findPrev","Shift-Ctrl-F":"replace","Shift-Ctrl-R":"replaceAll","Ctrl-[":"indentLess","Ctrl-]":"indentMore","Ctrl-U":"undoSelection","Shift-Ctrl-U":"redoSelection","Alt-U":"redoSelection",fallthrough:"basic"};keyMap.macDefault={"Cmd-A":"selectAll","Cmd-D":"deleteLine","Cmd-Z":"undo","Shift-Cmd-Z":"redo","Cmd-Y":"redo","Cmd-Up":"goDocStart","Cmd-End":"goDocEnd","Cmd-Down":"goDocEnd","Alt-Left":"goGroupLeft","Alt-Right":"goGroupRight","Cmd-Left":"goLineStart","Cmd-Right":"goLineEnd","Alt-Backspace":"delGroupBefore","Ctrl-Alt-Backspace":"delGroupAfter","Alt-Delete":"delGroupAfter","Cmd-S":"save","Cmd-F":"find","Cmd-G":"findNext","Shift-Cmd-G":"findPrev","Cmd-Alt-F":"replace","Shift-Cmd-Alt-F":"replaceAll","Cmd-[":"indentLess","Cmd-]":"indentMore","Cmd-Backspace":"delLineLeft","Cmd-U":"undoSelection","Shift-Cmd-U":"redoSelection",fallthrough:["basic","emacsy"]};keyMap.emacsy={"Ctrl-F":"goCharRight","Ctrl-B":"goCharLeft","Ctrl-P":"goLineUp","Ctrl-N":"goLineDown","Alt-F":"goWordRight","Alt-B":"goWordLeft","Ctrl-A":"goLineStart","Ctrl-E":"goLineEnd","Ctrl-V":"goPageDown","Shift-Ctrl-V":"goPageUp","Ctrl-D":"delCharAfter","Ctrl-H":"delCharBefore","Alt-D":"delWordAfter","Alt-Backspace":"delWordBefore","Ctrl-K":"killLine","Ctrl-T":"transposeChars"};keyMap["default"]=mac?keyMap.macDefault:keyMap.pcDefault;function getKeyMap(val){if(typeof val=="string")return keyMap[val];else return val;}
var lookupKey=CodeMirror.lookupKey=function(name,maps,handle){function lookup(map){map=getKeyMap(map);var found=map[name];if(found===false)return"stop";if(found!=null&&handle(found))return true;if(map.nofallthrough)return"stop";var fallthrough=map.fallthrough;if(fallthrough==null)return false;if(Object.prototype.toString.call(fallthrough)!="[object Array]")
return lookup(fallthrough);for(var i=0;i<fallthrough.length;++i){var done=lookup(fallthrough[i]);if(done)return done;}
return false;}
for(var i=0;i<maps.length;++i){var done=lookup(maps[i]);if(done)return done!="stop";}};var isModifierKey=CodeMirror.isModifierKey=function(event){var name=keyNames[event.keyCode];return name=="Ctrl"||name=="Alt"||name=="Shift"||name=="Mod";};var keyName=CodeMirror.keyName=function(event,noShift){if(presto&&event.keyCode==34&&event["char"])return false;var name=keyNames[event.keyCode];if(name==null||event.altGraphKey)return false;if(event.altKey)name="Alt-"+name;if(flipCtrlCmd?event.metaKey:event.ctrlKey)name="Ctrl-"+name;if(flipCtrlCmd?event.ctrlKey:event.metaKey)name="Cmd-"+name;if(!noShift&&event.shiftKey)name="Shift-"+name;return name;};CodeMirror.fromTextArea=function(textarea,options){if(!options)options={};options.value=textarea.value;if(!options.tabindex&&textarea.tabindex)
options.tabindex=textarea.tabindex;if(!options.placeholder&&textarea.placeholder)
options.placeholder=textarea.placeholder;if(options.autofocus==null){var hasFocus=activeElt();options.autofocus=hasFocus==textarea||textarea.getAttribute("autofocus")!=null&&hasFocus==document.body;}
function save(){textarea.value=cm.getValue();}
if(textarea.form){on(textarea.form,"submit",save);if(!options.leaveSubmitMethodAlone){var form=textarea.form,realSubmit=form.submit;try{var wrappedSubmit=form.submit=function(){save();form.submit=realSubmit;form.submit();form.submit=wrappedSubmit;};}catch(e){}}}
textarea.style.display="none";var cm=CodeMirror(function(node){textarea.parentNode.insertBefore(node,textarea.nextSibling);},options);cm.save=save;cm.getTextArea=function(){return textarea;};cm.toTextArea=function(){save();textarea.parentNode.removeChild(cm.getWrapperElement());textarea.style.display="";if(textarea.form){off(textarea.form,"submit",save);if(typeof textarea.form.submit=="function")
textarea.form.submit=realSubmit;}};return cm;};var StringStream=CodeMirror.StringStream=function(string,tabSize){this.pos=this.start=0;this.string=string;this.tabSize=tabSize||8;this.lastColumnPos=this.lastColumnValue=0;this.lineStart=0;};StringStream.prototype={eol:function(){return this.pos>=this.string.length;},sol:function(){return this.pos==this.lineStart;},peek:function(){return this.string.charAt(this.pos)||undefined;},next:function(){if(this.pos<this.string.length)
return this.string.charAt(this.pos++);},eat:function(match){var ch=this.string.charAt(this.pos);if(typeof match=="string")var ok=ch==match;else var ok=ch&&(match.test?match.test(ch):match(ch));if(ok){++this.pos;return ch;}},eatWhile:function(match){var start=this.pos;while(this.eat(match)){}
return this.pos>start;},eatSpace:function(){var start=this.pos;while(/[\s\u00a0]/.test(this.string.charAt(this.pos)))++this.pos;return this.pos>start;},skipToEnd:function(){this.pos=this.string.length;},skipTo:function(ch){var found=this.string.indexOf(ch,this.pos);if(found>-1){this.pos=found;return true;}},backUp:function(n){this.pos-=n;},column:function(){if(this.lastColumnPos<this.start){this.lastColumnValue=countColumn(this.string,this.start,this.tabSize,this.lastColumnPos,this.lastColumnValue);this.lastColumnPos=this.start;}
return this.lastColumnValue-(this.lineStart?countColumn(this.string,this.lineStart,this.tabSize):0);},indentation:function(){return countColumn(this.string,null,this.tabSize)-
(this.lineStart?countColumn(this.string,this.lineStart,this.tabSize):0);},match:function(pattern,consume,caseInsensitive){if(typeof pattern=="string"){var cased=function(str){return caseInsensitive?str.toLowerCase():str;};var substr=this.string.substr(this.pos,pattern.length);if(cased(substr)==cased(pattern)){if(consume!==false)this.pos+=pattern.length;return true;}}else{var match=this.string.slice(this.pos).match(pattern);if(match&&match.index>0)return null;if(match&&consume!==false)this.pos+=match[0].length;return match;}},current:function(){return this.string.slice(this.start,this.pos);},hideFirstChars:function(n,inner){this.lineStart+=n;try{return inner();}
finally{this.lineStart-=n;}}};var TextMarker=CodeMirror.TextMarker=function(doc,type){this.lines=[];this.type=type;this.doc=doc;};eventMixin(TextMarker);TextMarker.prototype.clear=function(){if(this.explicitlyCleared)return;var cm=this.doc.cm,withOp=cm&&!cm.curOp;if(withOp)startOperation(cm);if(hasHandler(this,"clear")){var found=this.find();if(found)signalLater(this,"clear",found.from,found.to);}
var min=null,max=null;for(var i=0;i<this.lines.length;++i){var line=this.lines[i];var span=getMarkedSpanFor(line.markedSpans,this);if(cm&&!this.collapsed)regLineChange(cm,lineNo(line),"text");else if(cm){if(span.to!=null)max=lineNo(line);if(span.from!=null)min=lineNo(line);}
line.markedSpans=removeMarkedSpan(line.markedSpans,span);if(span.from==null&&this.collapsed&&!lineIsHidden(this.doc,line)&&cm)
updateLineHeight(line,textHeight(cm.display));}
if(cm&&this.collapsed&&!cm.options.lineWrapping)for(var i=0;i<this.lines.length;++i){var visual=visualLine(this.lines[i]),len=lineLength(visual);if(len>cm.display.maxLineLength){cm.display.maxLine=visual;cm.display.maxLineLength=len;cm.display.maxLineChanged=true;}}
if(min!=null&&cm&&this.collapsed)regChange(cm,min,max+1);this.lines.length=0;this.explicitlyCleared=true;if(this.atomic&&this.doc.cantEdit){this.doc.cantEdit=false;if(cm)reCheckSelection(cm.doc);}
if(cm)signalLater(cm,"markerCleared",cm,this);if(withOp)endOperation(cm);if(this.parent)this.parent.clear();};TextMarker.prototype.find=function(side,lineObj){if(side==null&&this.type=="bookmark")side=1;var from,to;for(var i=0;i<this.lines.length;++i){var line=this.lines[i];var span=getMarkedSpanFor(line.markedSpans,this);if(span.from!=null){from=Pos(lineObj?line:lineNo(line),span.from);if(side==-1)return from;}
if(span.to!=null){to=Pos(lineObj?line:lineNo(line),span.to);if(side==1)return to;}}
return from&&{from:from,to:to};};TextMarker.prototype.changed=function(){var pos=this.find(-1,true),widget=this,cm=this.doc.cm;if(!pos||!cm)return;runInOp(cm,function(){var line=pos.line,lineN=lineNo(pos.line);var view=findViewForLine(cm,lineN);if(view){clearLineMeasurementCacheFor(view);cm.curOp.selectionChanged=cm.curOp.forceUpdate=true;}
cm.curOp.updateMaxLine=true;if(!lineIsHidden(widget.doc,line)&&widget.height!=null){var oldHeight=widget.height;widget.height=null;var dHeight=widgetHeight(widget)-oldHeight;if(dHeight)
updateLineHeight(line,line.height+dHeight);}});};TextMarker.prototype.attachLine=function(line){if(!this.lines.length&&this.doc.cm){var op=this.doc.cm.curOp;if(!op.maybeHiddenMarkers||indexOf(op.maybeHiddenMarkers,this)==-1)
(op.maybeUnhiddenMarkers||(op.maybeUnhiddenMarkers=[])).push(this);}
this.lines.push(line);};TextMarker.prototype.detachLine=function(line){this.lines.splice(indexOf(this.lines,line),1);if(!this.lines.length&&this.doc.cm){var op=this.doc.cm.curOp;(op.maybeHiddenMarkers||(op.maybeHiddenMarkers=[])).push(this);}};var nextMarkerId=0;function markText(doc,from,to,options,type){if(options&&options.shared)return markTextShared(doc,from,to,options,type);if(doc.cm&&!doc.cm.curOp)return operation(doc.cm,markText)(doc,from,to,options,type);var marker=new TextMarker(doc,type),diff=cmp(from,to);if(options)copyObj(options,marker,false);if(diff>0||diff==0&&marker.clearWhenEmpty!==false)
return marker;if(marker.replacedWith){marker.collapsed=true;marker.widgetNode=elt("span",[marker.replacedWith],"CodeMirror-widget");if(!options.handleMouseEvents)marker.widgetNode.ignoreEvents=true;if(options.insertLeft)marker.widgetNode.insertLeft=true;}
if(marker.collapsed){if(conflictingCollapsedRange(doc,from.line,from,to,marker)||from.line!=to.line&&conflictingCollapsedRange(doc,to.line,from,to,marker))
throw new Error("Inserting collapsed marker partially overlapping an existing one");sawCollapsedSpans=true;}
if(marker.addToHistory)
addChangeToHistory(doc,{from:from,to:to,origin:"markText"},doc.sel,NaN);var curLine=from.line,cm=doc.cm,updateMaxLine;doc.iter(curLine,to.line+1,function(line){if(cm&&marker.collapsed&&!cm.options.lineWrapping&&visualLine(line)==cm.display.maxLine)
updateMaxLine=true;if(marker.collapsed&&curLine!=from.line)updateLineHeight(line,0);addMarkedSpan(line,new MarkedSpan(marker,curLine==from.line?from.ch:null,curLine==to.line?to.ch:null));++curLine;});if(marker.collapsed)doc.iter(from.line,to.line+1,function(line){if(lineIsHidden(doc,line))updateLineHeight(line,0);});if(marker.clearOnEnter)on(marker,"beforeCursorEnter",function(){marker.clear();});if(marker.readOnly){sawReadOnlySpans=true;if(doc.history.done.length||doc.history.undone.length)
doc.clearHistory();}
if(marker.collapsed){marker.id=++nextMarkerId;marker.atomic=true;}
if(cm){if(updateMaxLine)cm.curOp.updateMaxLine=true;if(marker.collapsed)
regChange(cm,from.line,to.line+1);else if(marker.className||marker.title||marker.startStyle||marker.endStyle)
for(var i=from.line;i<=to.line;i++)regLineChange(cm,i,"text");if(marker.atomic)reCheckSelection(cm.doc);signalLater(cm,"markerAdded",cm,marker);}
return marker;}
var SharedTextMarker=CodeMirror.SharedTextMarker=function(markers,primary){this.markers=markers;this.primary=primary;for(var i=0;i<markers.length;++i)
markers[i].parent=this;};eventMixin(SharedTextMarker);SharedTextMarker.prototype.clear=function(){if(this.explicitlyCleared)return;this.explicitlyCleared=true;for(var i=0;i<this.markers.length;++i)
this.markers[i].clear();signalLater(this,"clear");};SharedTextMarker.prototype.find=function(side,lineObj){return this.primary.find(side,lineObj);};function markTextShared(doc,from,to,options,type){options=copyObj(options);options.shared=false;var markers=[markText(doc,from,to,options,type)],primary=markers[0];var widget=options.widgetNode;linkedDocs(doc,function(doc){if(widget)options.widgetNode=widget.cloneNode(true);markers.push(markText(doc,clipPos(doc,from),clipPos(doc,to),options,type));for(var i=0;i<doc.linked.length;++i)
if(doc.linked[i].isParent)return;primary=lst(markers);});return new SharedTextMarker(markers,primary);}
function findSharedMarkers(doc){return doc.findMarks(Pos(doc.first,0),doc.clipPos(Pos(doc.lastLine())),function(m){return m.parent;});}
function copySharedMarkers(doc,markers){for(var i=0;i<markers.length;i++){var marker=markers[i],pos=marker.find();var mFrom=doc.clipPos(pos.from),mTo=doc.clipPos(pos.to);if(cmp(mFrom,mTo)){var subMark=markText(doc,mFrom,mTo,marker.primary,marker.primary.type);marker.markers.push(subMark);subMark.parent=marker;}}}
function detachSharedMarkers(markers){for(var i=0;i<markers.length;i++){var marker=markers[i],linked=[marker.primary.doc];;linkedDocs(marker.primary.doc,function(d){linked.push(d);});for(var j=0;j<marker.markers.length;j++){var subMarker=marker.markers[j];if(indexOf(linked,subMarker.doc)==-1){subMarker.parent=null;marker.markers.splice(j--,1);}}}}
function MarkedSpan(marker,from,to){this.marker=marker;this.from=from;this.to=to;}
function getMarkedSpanFor(spans,marker){if(spans)for(var i=0;i<spans.length;++i){var span=spans[i];if(span.marker==marker)return span;}}
function removeMarkedSpan(spans,span){for(var r,i=0;i<spans.length;++i)
if(spans[i]!=span)(r||(r=[])).push(spans[i]);return r;}
function addMarkedSpan(line,span){line.markedSpans=line.markedSpans?line.markedSpans.concat([span]):[span];span.marker.attachLine(line);}
function markedSpansBefore(old,startCh,isInsert){if(old)for(var i=0,nw;i<old.length;++i){var span=old[i],marker=span.marker;var startsBefore=span.from==null||(marker.inclusiveLeft?span.from<=startCh:span.from<startCh);if(startsBefore||span.from==startCh&&marker.type=="bookmark"&&(!isInsert||!span.marker.insertLeft)){var endsAfter=span.to==null||(marker.inclusiveRight?span.to>=startCh:span.to>startCh);(nw||(nw=[])).push(new MarkedSpan(marker,span.from,endsAfter?null:span.to));}}
return nw;}
function markedSpansAfter(old,endCh,isInsert){if(old)for(var i=0,nw;i<old.length;++i){var span=old[i],marker=span.marker;var endsAfter=span.to==null||(marker.inclusiveRight?span.to>=endCh:span.to>endCh);if(endsAfter||span.from==endCh&&marker.type=="bookmark"&&(!isInsert||span.marker.insertLeft)){var startsBefore=span.from==null||(marker.inclusiveLeft?span.from<=endCh:span.from<endCh);(nw||(nw=[])).push(new MarkedSpan(marker,startsBefore?null:span.from-endCh,span.to==null?null:span.to-endCh));}}
return nw;}
function stretchSpansOverChange(doc,change){var oldFirst=isLine(doc,change.from.line)&&getLine(doc,change.from.line).markedSpans;var oldLast=isLine(doc,change.to.line)&&getLine(doc,change.to.line).markedSpans;if(!oldFirst&&!oldLast)return null;var startCh=change.from.ch,endCh=change.to.ch,isInsert=cmp(change.from,change.to)==0;var first=markedSpansBefore(oldFirst,startCh,isInsert);var last=markedSpansAfter(oldLast,endCh,isInsert);var sameLine=change.text.length==1,offset=lst(change.text).length+(sameLine?startCh:0);if(first){for(var i=0;i<first.length;++i){var span=first[i];if(span.to==null){var found=getMarkedSpanFor(last,span.marker);if(!found)span.to=startCh;else if(sameLine)span.to=found.to==null?null:found.to+offset;}}}
if(last){for(var i=0;i<last.length;++i){var span=last[i];if(span.to!=null)span.to+=offset;if(span.from==null){var found=getMarkedSpanFor(first,span.marker);if(!found){span.from=offset;if(sameLine)(first||(first=[])).push(span);}}else{span.from+=offset;if(sameLine)(first||(first=[])).push(span);}}}
if(first)first=clearEmptySpans(first);if(last&&last!=first)last=clearEmptySpans(last);var newMarkers=[first];if(!sameLine){var gap=change.text.length-2,gapMarkers;if(gap>0&&first)
for(var i=0;i<first.length;++i)
if(first[i].to==null)
(gapMarkers||(gapMarkers=[])).push(new MarkedSpan(first[i].marker,null,null));for(var i=0;i<gap;++i)
newMarkers.push(gapMarkers);newMarkers.push(last);}
return newMarkers;}
function clearEmptySpans(spans){for(var i=0;i<spans.length;++i){var span=spans[i];if(span.from!=null&&span.from==span.to&&span.marker.clearWhenEmpty!==false)
spans.splice(i--,1);}
if(!spans.length)return null;return spans;}
function mergeOldSpans(doc,change){var old=getOldSpans(doc,change);var stretched=stretchSpansOverChange(doc,change);if(!old)return stretched;if(!stretched)return old;for(var i=0;i<old.length;++i){var oldCur=old[i],stretchCur=stretched[i];if(oldCur&&stretchCur){spans:for(var j=0;j<stretchCur.length;++j){var span=stretchCur[j];for(var k=0;k<oldCur.length;++k)
if(oldCur[k].marker==span.marker)continue spans;oldCur.push(span);}}else if(stretchCur){old[i]=stretchCur;}}
return old;}
function removeReadOnlyRanges(doc,from,to){var markers=null;doc.iter(from.line,to.line+1,function(line){if(line.markedSpans)for(var i=0;i<line.markedSpans.length;++i){var mark=line.markedSpans[i].marker;if(mark.readOnly&&(!markers||indexOf(markers,mark)==-1))
(markers||(markers=[])).push(mark);}});if(!markers)return null;var parts=[{from:from,to:to}];for(var i=0;i<markers.length;++i){var mk=markers[i],m=mk.find(0);for(var j=0;j<parts.length;++j){var p=parts[j];if(cmp(p.to,m.from)<0||cmp(p.from,m.to)>0)continue;var newParts=[j,1],dfrom=cmp(p.from,m.from),dto=cmp(p.to,m.to);if(dfrom<0||!mk.inclusiveLeft&&!dfrom)
newParts.push({from:p.from,to:m.from});if(dto>0||!mk.inclusiveRight&&!dto)
newParts.push({from:m.to,to:p.to});parts.splice.apply(parts,newParts);j+=newParts.length-1;}}
return parts;}
function detachMarkedSpans(line){var spans=line.markedSpans;if(!spans)return;for(var i=0;i<spans.length;++i)
spans[i].marker.detachLine(line);line.markedSpans=null;}
function attachMarkedSpans(line,spans){if(!spans)return;for(var i=0;i<spans.length;++i)
spans[i].marker.attachLine(line);line.markedSpans=spans;}
function extraLeft(marker){return marker.inclusiveLeft?-1:0;}
function extraRight(marker){return marker.inclusiveRight?1:0;}
function compareCollapsedMarkers(a,b){var lenDiff=a.lines.length-b.lines.length;if(lenDiff!=0)return lenDiff;var aPos=a.find(),bPos=b.find();var fromCmp=cmp(aPos.from,bPos.from)||extraLeft(a)-extraLeft(b);if(fromCmp)return-fromCmp;var toCmp=cmp(aPos.to,bPos.to)||extraRight(a)-extraRight(b);if(toCmp)return toCmp;return b.id-a.id;}
function collapsedSpanAtSide(line,start){var sps=sawCollapsedSpans&&line.markedSpans,found;if(sps)for(var sp,i=0;i<sps.length;++i){sp=sps[i];if(sp.marker.collapsed&&(start?sp.from:sp.to)==null&&(!found||compareCollapsedMarkers(found,sp.marker)<0))
found=sp.marker;}
return found;}
function collapsedSpanAtStart(line){return collapsedSpanAtSide(line,true);}
function collapsedSpanAtEnd(line){return collapsedSpanAtSide(line,false);}
function conflictingCollapsedRange(doc,lineNo,from,to,marker){var line=getLine(doc,lineNo);var sps=sawCollapsedSpans&&line.markedSpans;if(sps)for(var i=0;i<sps.length;++i){var sp=sps[i];if(!sp.marker.collapsed)continue;var found=sp.marker.find(0);var fromCmp=cmp(found.from,from)||extraLeft(sp.marker)-extraLeft(marker);var toCmp=cmp(found.to,to)||extraRight(sp.marker)-extraRight(marker);if(fromCmp>=0&&toCmp<=0||fromCmp<=0&&toCmp>=0)continue;if(fromCmp<=0&&(cmp(found.to,from)||extraRight(sp.marker)-extraLeft(marker))>0||fromCmp>=0&&(cmp(found.from,to)||extraLeft(sp.marker)-extraRight(marker))<0)
return true;}}
function visualLine(line){var merged;while(merged=collapsedSpanAtStart(line))
line=merged.find(-1,true).line;return line;}
function visualLineContinued(line){var merged,lines;while(merged=collapsedSpanAtEnd(line)){line=merged.find(1,true).line;(lines||(lines=[])).push(line);}
return lines;}
function visualLineNo(doc,lineN){var line=getLine(doc,lineN),vis=visualLine(line);if(line==vis)return lineN;return lineNo(vis);}
function visualLineEndNo(doc,lineN){if(lineN>doc.lastLine())return lineN;var line=getLine(doc,lineN),merged;if(!lineIsHidden(doc,line))return lineN;while(merged=collapsedSpanAtEnd(line))
line=merged.find(1,true).line;return lineNo(line)+1;}
function lineIsHidden(doc,line){var sps=sawCollapsedSpans&&line.markedSpans;if(sps)for(var sp,i=0;i<sps.length;++i){sp=sps[i];if(!sp.marker.collapsed)continue;if(sp.from==null)return true;if(sp.marker.widgetNode)continue;if(sp.from==0&&sp.marker.inclusiveLeft&&lineIsHiddenInner(doc,line,sp))
return true;}}
function lineIsHiddenInner(doc,line,span){if(span.to==null){var end=span.marker.find(1,true);return lineIsHiddenInner(doc,end.line,getMarkedSpanFor(end.line.markedSpans,span.marker));}
if(span.marker.inclusiveRight&&span.to==line.text.length)
return true;for(var sp,i=0;i<line.markedSpans.length;++i){sp=line.markedSpans[i];if(sp.marker.collapsed&&!sp.marker.widgetNode&&sp.from==span.to&&(sp.to==null||sp.to!=span.from)&&(sp.marker.inclusiveLeft||span.marker.inclusiveRight)&&lineIsHiddenInner(doc,line,sp))return true;}}
var LineWidget=CodeMirror.LineWidget=function(cm,node,options){if(options)for(var opt in options)if(options.hasOwnProperty(opt))
this[opt]=options[opt];this.cm=cm;this.node=node;};eventMixin(LineWidget);function adjustScrollWhenAboveVisible(cm,line,diff){if(heightAtLine(line)<((cm.curOp&&cm.curOp.scrollTop)||cm.doc.scrollTop))
addToScrollPos(cm,null,diff);}
LineWidget.prototype.clear=function(){var cm=this.cm,ws=this.line.widgets,line=this.line,no=lineNo(line);if(no==null||!ws)return;for(var i=0;i<ws.length;++i)if(ws[i]==this)ws.splice(i--,1);if(!ws.length)line.widgets=null;var height=widgetHeight(this);runInOp(cm,function(){adjustScrollWhenAboveVisible(cm,line,-height);regLineChange(cm,no,"widget");updateLineHeight(line,Math.max(0,line.height-height));});};LineWidget.prototype.changed=function(){var oldH=this.height,cm=this.cm,line=this.line;this.height=null;var diff=widgetHeight(this)-oldH;if(!diff)return;runInOp(cm,function(){cm.curOp.forceUpdate=true;adjustScrollWhenAboveVisible(cm,line,diff);updateLineHeight(line,line.height+diff);});};function widgetHeight(widget){if(widget.height!=null)return widget.height;if(!contains(document.body,widget.node))
removeChildrenAndAdd(widget.cm.display.measure,elt("div",[widget.node],null,"position: relative"));return widget.height=widget.node.offsetHeight;}
function addLineWidget(cm,handle,node,options){var widget=new LineWidget(cm,node,options);if(widget.noHScroll)cm.display.alignWidgets=true;changeLine(cm,handle,"widget",function(line){var widgets=line.widgets||(line.widgets=[]);if(widget.insertAt==null)widgets.push(widget);else widgets.splice(Math.min(widgets.length-1,Math.max(0,widget.insertAt)),0,widget);widget.line=line;if(!lineIsHidden(cm.doc,line)){var aboveVisible=heightAtLine(line)<cm.doc.scrollTop;updateLineHeight(line,line.height+widgetHeight(widget));if(aboveVisible)addToScrollPos(cm,null,widget.height);cm.curOp.forceUpdate=true;}
return true;});return widget;}
var Line=CodeMirror.Line=function(text,markedSpans,estimateHeight){this.text=text;attachMarkedSpans(this,markedSpans);this.height=estimateHeight?estimateHeight(this):1;};eventMixin(Line);Line.prototype.lineNo=function(){return lineNo(this);};function updateLine(line,text,markedSpans,estimateHeight){line.text=text;if(line.stateAfter)line.stateAfter=null;if(line.styles)line.styles=null;if(line.order!=null)line.order=null;detachMarkedSpans(line);attachMarkedSpans(line,markedSpans);var estHeight=estimateHeight?estimateHeight(line):1;if(estHeight!=line.height)updateLineHeight(line,estHeight);}
function cleanUpLine(line){line.parent=null;detachMarkedSpans(line);}
function extractLineClasses(type,output){if(type)for(;;){var lineClass=type.match(/(?:^|\s+)line-(background-)?(\S+)/);if(!lineClass)break;type=type.slice(0,lineClass.index)+type.slice(lineClass.index+lineClass[0].length);var prop=lineClass[1]?"bgClass":"textClass";if(output[prop]==null)
output[prop]=lineClass[2];else if(!(new RegExp("(?:^|\s)"+lineClass[2]+"(?:$|\s)")).test(output[prop]))
output[prop]+=" "+lineClass[2];}
return type;}
function callBlankLine(mode,state){if(mode.blankLine)return mode.blankLine(state);if(!mode.innerMode)return;var inner=CodeMirror.innerMode(mode,state);if(inner.mode.blankLine)return inner.mode.blankLine(inner.state);}
function readToken(mode,stream,state){for(var i=0;i<10;i++){var style=mode.token(stream,state);if(stream.pos>stream.start)return style;}
throw new Error("Mode "+mode.name+" failed to advance stream.");}
function runMode(cm,text,mode,state,f,lineClasses,forceToEnd){var flattenSpans=mode.flattenSpans;if(flattenSpans==null)flattenSpans=cm.options.flattenSpans;var curStart=0,curStyle=null;var stream=new StringStream(text,cm.options.tabSize),style;if(text=="")extractLineClasses(callBlankLine(mode,state),lineClasses);while(!stream.eol()){if(stream.pos>cm.options.maxHighlightLength){flattenSpans=false;if(forceToEnd)processLine(cm,text,state,stream.pos);stream.pos=text.length;style=null;}else{style=extractLineClasses(readToken(mode,stream,state),lineClasses);}
if(cm.options.addModeClass){var mName=CodeMirror.innerMode(mode,state).mode.name;if(mName)style="m-"+(style?mName+" "+style:mName);}
if(!flattenSpans||curStyle!=style){if(curStart<stream.start)f(stream.start,curStyle);curStart=stream.start;curStyle=style;}
stream.start=stream.pos;}
while(curStart<stream.pos){var pos=Math.min(stream.pos,curStart+50000);f(pos,curStyle);curStart=pos;}}
function highlightLine(cm,line,state,forceToEnd){var st=[cm.state.modeGen],lineClasses={};runMode(cm,line.text,cm.doc.mode,state,function(end,style){st.push(end,style);},lineClasses,forceToEnd);for(var o=0;o<cm.state.overlays.length;++o){var overlay=cm.state.overlays[o],i=1,at=0;runMode(cm,line.text,overlay.mode,true,function(end,style){var start=i;while(at<end){var i_end=st[i];if(i_end>end)
st.splice(i,1,end,st[i+1],i_end);i+=2;at=Math.min(end,i_end);}
if(!style)return;if(overlay.opaque){st.splice(start,i-start,end,"cm-overlay "+style);i=start+2;}else{for(;start<i;start+=2){var cur=st[start+1];st[start+1]=(cur?cur+" ":"")+"cm-overlay "+style;}}},lineClasses);}
return{styles:st,classes:lineClasses.bgClass||lineClasses.textClass?lineClasses:null};}
function getLineStyles(cm,line){if(!line.styles||line.styles[0]!=cm.state.modeGen){var result=highlightLine(cm,line,line.stateAfter=getStateBefore(cm,lineNo(line)));line.styles=result.styles;if(result.classes)line.styleClasses=result.classes;else if(line.styleClasses)line.styleClasses=null;}
return line.styles;}
function processLine(cm,text,state,startAt){var mode=cm.doc.mode;var stream=new StringStream(text,cm.options.tabSize);stream.start=stream.pos=startAt||0;if(text=="")callBlankLine(mode,state);while(!stream.eol()&&stream.pos<=cm.options.maxHighlightLength){readToken(mode,stream,state);stream.start=stream.pos;}}
var styleToClassCache={},styleToClassCacheWithMode={};function interpretTokenStyle(style,options){if(!style||/^\s*$/.test(style))return null;var cache=options.addModeClass?styleToClassCacheWithMode:styleToClassCache;return cache[style]||(cache[style]=style.replace(/\S+/g,"cm-$&"));}
function buildLineContent(cm,lineView){var content=elt("span",null,null,webkit?"padding-right: .1px":null);var builder={pre:elt("pre",[content]),content:content,col:0,pos:0,cm:cm};lineView.measure={};for(var i=0;i<=(lineView.rest?lineView.rest.length:0);i++){var line=i?lineView.rest[i-1]:lineView.line,order;builder.pos=0;builder.addToken=buildToken;if((ie||webkit)&&cm.getOption("lineWrapping"))
builder.addToken=buildTokenSplitSpaces(builder.addToken);if(hasBadBidiRects(cm.display.measure)&&(order=getOrder(line)))
builder.addToken=buildTokenBadBidi(builder.addToken,order);builder.map=[];insertLineContent(line,builder,getLineStyles(cm,line));if(line.styleClasses){if(line.styleClasses.bgClass)
builder.bgClass=joinClasses(line.styleClasses.bgClass,builder.bgClass||"");if(line.styleClasses.textClass)
builder.textClass=joinClasses(line.styleClasses.textClass,builder.textClass||"");}
if(builder.map.length==0)
builder.map.push(0,0,builder.content.appendChild(zeroWidthElement(cm.display.measure)));if(i==0){lineView.measure.map=builder.map;lineView.measure.cache={};}else{(lineView.measure.maps||(lineView.measure.maps=[])).push(builder.map);(lineView.measure.caches||(lineView.measure.caches=[])).push({});}}
signal(cm,"renderLine",cm,lineView.line,builder.pre);return builder;}
function defaultSpecialCharPlaceholder(ch){var token=elt("span","\u2022","cm-invalidchar");token.title="\\u"+ch.charCodeAt(0).toString(16);return token;}
function buildToken(builder,text,style,startStyle,endStyle,title){if(!text)return;var special=builder.cm.options.specialChars,mustWrap=false;if(!special.test(text)){builder.col+=text.length;var content=document.createTextNode(text);builder.map.push(builder.pos,builder.pos+text.length,content);if(ie_upto8)mustWrap=true;builder.pos+=text.length;}else{var content=document.createDocumentFragment(),pos=0;while(true){special.lastIndex=pos;var m=special.exec(text);var skipped=m?m.index-pos:text.length-pos;if(skipped){var txt=document.createTextNode(text.slice(pos,pos+skipped));if(ie_upto8)content.appendChild(elt("span",[txt]));else content.appendChild(txt);builder.map.push(builder.pos,builder.pos+skipped,txt);builder.col+=skipped;builder.pos+=skipped;}
if(!m)break;pos+=skipped+1;if(m[0]=="\t"){var tabSize=builder.cm.options.tabSize,tabWidth=tabSize-builder.col%tabSize;var txt=content.appendChild(elt("span",spaceStr(tabWidth),"cm-tab"));builder.col+=tabWidth;}else{var txt=builder.cm.options.specialCharPlaceholder(m[0]);if(ie_upto8)content.appendChild(elt("span",[txt]));else content.appendChild(txt);builder.col+=1;}
builder.map.push(builder.pos,builder.pos+1,txt);builder.pos++;}}
if(style||startStyle||endStyle||mustWrap){var fullStyle=style||"";if(startStyle)fullStyle+=startStyle;if(endStyle)fullStyle+=endStyle;var token=elt("span",[content],fullStyle);if(title)token.title=title;return builder.content.appendChild(token);}
builder.content.appendChild(content);}
function buildTokenSplitSpaces(inner){function split(old){var out=" ";for(var i=0;i<old.length-2;++i)out+=i%2?" ":"\u00a0";out+=" ";return out;}
return function(builder,text,style,startStyle,endStyle,title){inner(builder,text.replace(/ {3,}/g,split),style,startStyle,endStyle,title);};}
function buildTokenBadBidi(inner,order){return function(builder,text,style,startStyle,endStyle,title){style=style?style+" cm-force-border":"cm-force-border";var start=builder.pos,end=start+text.length;for(;;){for(var i=0;i<order.length;i++){var part=order[i];if(part.to>start&&part.from<=start)break;}
if(part.to>=end)return inner(builder,text,style,startStyle,endStyle,title);inner(builder,text.slice(0,part.to-start),style,startStyle,null,title);startStyle=null;text=text.slice(part.to-start);start=part.to;}};}
function buildCollapsedSpan(builder,size,marker,ignoreWidget){var widget=!ignoreWidget&&marker.widgetNode;if(widget){builder.map.push(builder.pos,builder.pos+size,widget);builder.content.appendChild(widget);}
builder.pos+=size;}
function insertLineContent(line,builder,styles){var spans=line.markedSpans,allText=line.text,at=0;if(!spans){for(var i=1;i<styles.length;i+=2)
builder.addToken(builder,allText.slice(at,at=styles[i]),interpretTokenStyle(styles[i+1],builder.cm.options));return;}
var len=allText.length,pos=0,i=1,text="",style;var nextChange=0,spanStyle,spanEndStyle,spanStartStyle,title,collapsed;for(;;){if(nextChange==pos){spanStyle=spanEndStyle=spanStartStyle=title="";collapsed=null;nextChange=Infinity;var foundBookmarks=[];for(var j=0;j<spans.length;++j){var sp=spans[j],m=sp.marker;if(sp.from<=pos&&(sp.to==null||sp.to>pos)){if(sp.to!=null&&nextChange>sp.to){nextChange=sp.to;spanEndStyle="";}
if(m.className)spanStyle+=" "+m.className;if(m.startStyle&&sp.from==pos)spanStartStyle+=" "+m.startStyle;if(m.endStyle&&sp.to==nextChange)spanEndStyle+=" "+m.endStyle;if(m.title&&!title)title=m.title;if(m.collapsed&&(!collapsed||compareCollapsedMarkers(collapsed.marker,m)<0))
collapsed=sp;}else if(sp.from>pos&&nextChange>sp.from){nextChange=sp.from;}
if(m.type=="bookmark"&&sp.from==pos&&m.widgetNode)foundBookmarks.push(m);}
if(collapsed&&(collapsed.from||0)==pos){buildCollapsedSpan(builder,(collapsed.to==null?len+1:collapsed.to)-pos,collapsed.marker,collapsed.from==null);if(collapsed.to==null)return;}
if(!collapsed&&foundBookmarks.length)for(var j=0;j<foundBookmarks.length;++j)
buildCollapsedSpan(builder,0,foundBookmarks[j]);}
if(pos>=len)break;var upto=Math.min(len,nextChange);while(true){if(text){var end=pos+text.length;if(!collapsed){var tokenText=end>upto?text.slice(0,upto-pos):text;builder.addToken(builder,tokenText,style?style+spanStyle:spanStyle,spanStartStyle,pos+tokenText.length==nextChange?spanEndStyle:"",title);}
if(end>=upto){text=text.slice(upto-pos);pos=upto;break;}
pos=end;spanStartStyle="";}
text=allText.slice(at,at=styles[i++]);style=interpretTokenStyle(styles[i++],builder.cm.options);}}}
function isWholeLineUpdate(doc,change){return change.from.ch==0&&change.to.ch==0&&lst(change.text)==""&&(!doc.cm||doc.cm.options.wholeLineUpdateBefore);}
function updateDoc(doc,change,markedSpans,estimateHeight){function spansFor(n){return markedSpans?markedSpans[n]:null;}
function update(line,text,spans){updateLine(line,text,spans,estimateHeight);signalLater(line,"change",line,change);}
var from=change.from,to=change.to,text=change.text;var firstLine=getLine(doc,from.line),lastLine=getLine(doc,to.line);var lastText=lst(text),lastSpans=spansFor(text.length-1),nlines=to.line-from.line;if(isWholeLineUpdate(doc,change)){for(var i=0,added=[];i<text.length-1;++i)
added.push(new Line(text[i],spansFor(i),estimateHeight));update(lastLine,lastLine.text,lastSpans);if(nlines)doc.remove(from.line,nlines);if(added.length)doc.insert(from.line,added);}else if(firstLine==lastLine){if(text.length==1){update(firstLine,firstLine.text.slice(0,from.ch)+lastText+firstLine.text.slice(to.ch),lastSpans);}else{for(var added=[],i=1;i<text.length-1;++i)
added.push(new Line(text[i],spansFor(i),estimateHeight));added.push(new Line(lastText+firstLine.text.slice(to.ch),lastSpans,estimateHeight));update(firstLine,firstLine.text.slice(0,from.ch)+text[0],spansFor(0));doc.insert(from.line+1,added);}}else if(text.length==1){update(firstLine,firstLine.text.slice(0,from.ch)+text[0]+lastLine.text.slice(to.ch),spansFor(0));doc.remove(from.line+1,nlines);}else{update(firstLine,firstLine.text.slice(0,from.ch)+text[0],spansFor(0));update(lastLine,lastText+lastLine.text.slice(to.ch),lastSpans);for(var i=1,added=[];i<text.length-1;++i)
added.push(new Line(text[i],spansFor(i),estimateHeight));if(nlines>1)doc.remove(from.line+1,nlines-1);doc.insert(from.line+1,added);}
signalLater(doc,"change",doc,change);}
function LeafChunk(lines){this.lines=lines;this.parent=null;for(var i=0,height=0;i<lines.length;++i){lines[i].parent=this;height+=lines[i].height;}
this.height=height;}
LeafChunk.prototype={chunkSize:function(){return this.lines.length;},removeInner:function(at,n){for(var i=at,e=at+n;i<e;++i){var line=this.lines[i];this.height-=line.height;cleanUpLine(line);signalLater(line,"delete");}
this.lines.splice(at,n);},collapse:function(lines){lines.push.apply(lines,this.lines);},insertInner:function(at,lines,height){this.height+=height;this.lines=this.lines.slice(0,at).concat(lines).concat(this.lines.slice(at));for(var i=0;i<lines.length;++i)lines[i].parent=this;},iterN:function(at,n,op){for(var e=at+n;at<e;++at)
if(op(this.lines[at]))return true;}};function BranchChunk(children){this.children=children;var size=0,height=0;for(var i=0;i<children.length;++i){var ch=children[i];size+=ch.chunkSize();height+=ch.height;ch.parent=this;}
this.size=size;this.height=height;this.parent=null;}
BranchChunk.prototype={chunkSize:function(){return this.size;},removeInner:function(at,n){this.size-=n;for(var i=0;i<this.children.length;++i){var child=this.children[i],sz=child.chunkSize();if(at<sz){var rm=Math.min(n,sz-at),oldHeight=child.height;child.removeInner(at,rm);this.height-=oldHeight-child.height;if(sz==rm){this.children.splice(i--,1);child.parent=null;}
if((n-=rm)==0)break;at=0;}else at-=sz;}
if(this.size-n<25&&(this.children.length>1||!(this.children[0]instanceof LeafChunk))){var lines=[];this.collapse(lines);this.children=[new LeafChunk(lines)];this.children[0].parent=this;}},collapse:function(lines){for(var i=0;i<this.children.length;++i)this.children[i].collapse(lines);},insertInner:function(at,lines,height){this.size+=lines.length;this.height+=height;for(var i=0;i<this.children.length;++i){var child=this.children[i],sz=child.chunkSize();if(at<=sz){child.insertInner(at,lines,height);if(child.lines&&child.lines.length>50){while(child.lines.length>50){var spilled=child.lines.splice(child.lines.length-25,25);var newleaf=new LeafChunk(spilled);child.height-=newleaf.height;this.children.splice(i+1,0,newleaf);newleaf.parent=this;}
this.maybeSpill();}
break;}
at-=sz;}},maybeSpill:function(){if(this.children.length<=10)return;var me=this;do{var spilled=me.children.splice(me.children.length-5,5);var sibling=new BranchChunk(spilled);if(!me.parent){var copy=new BranchChunk(me.children);copy.parent=me;me.children=[copy,sibling];me=copy;}else{me.size-=sibling.size;me.height-=sibling.height;var myIndex=indexOf(me.parent.children,me);me.parent.children.splice(myIndex+1,0,sibling);}
sibling.parent=me.parent;}while(me.children.length>10);me.parent.maybeSpill();},iterN:function(at,n,op){for(var i=0;i<this.children.length;++i){var child=this.children[i],sz=child.chunkSize();if(at<sz){var used=Math.min(n,sz-at);if(child.iterN(at,used,op))return true;if((n-=used)==0)break;at=0;}else at-=sz;}}};var nextDocId=0;var Doc=CodeMirror.Doc=function(text,mode,firstLine){if(!(this instanceof Doc))return new Doc(text,mode,firstLine);if(firstLine==null)firstLine=0;BranchChunk.call(this,[new LeafChunk([new Line("",null)])]);this.first=firstLine;this.scrollTop=this.scrollLeft=0;this.cantEdit=false;this.cleanGeneration=1;this.frontier=firstLine;var start=Pos(firstLine,0);this.sel=simpleSelection(start);this.history=new History(null);this.id=++nextDocId;this.modeOption=mode;if(typeof text=="string")text=splitLines(text);updateDoc(this,{from:start,to:start,text:text});setSelection(this,simpleSelection(start),sel_dontScroll);};Doc.prototype=createObj(BranchChunk.prototype,{constructor:Doc,iter:function(from,to,op){if(op)this.iterN(from-this.first,to-from,op);else this.iterN(this.first,this.first+this.size,from);},insert:function(at,lines){var height=0;for(var i=0;i<lines.length;++i)height+=lines[i].height;this.insertInner(at-this.first,lines,height);},remove:function(at,n){this.removeInner(at-this.first,n);},getValue:function(lineSep){var lines=getLines(this,this.first,this.first+this.size);if(lineSep===false)return lines;return lines.join(lineSep||"\n");},setValue:docMethodOp(function(code){var top=Pos(this.first,0),last=this.first+this.size-1;makeChange(this,{from:top,to:Pos(last,getLine(this,last).text.length),text:splitLines(code),origin:"setValue"},true);setSelection(this,simpleSelection(top));}),replaceRange:function(code,from,to,origin){from=clipPos(this,from);to=to?clipPos(this,to):from;replaceRange(this,code,from,to,origin);},getRange:function(from,to,lineSep){var lines=getBetween(this,clipPos(this,from),clipPos(this,to));if(lineSep===false)return lines;return lines.join(lineSep||"\n");},getLine:function(line){var l=this.getLineHandle(line);return l&&l.text;},getLineHandle:function(line){if(isLine(this,line))return getLine(this,line);},getLineNumber:function(line){return lineNo(line);},getLineHandleVisualStart:function(line){if(typeof line=="number")line=getLine(this,line);return visualLine(line);},lineCount:function(){return this.size;},firstLine:function(){return this.first;},lastLine:function(){return this.first+this.size-1;},clipPos:function(pos){return clipPos(this,pos);},getCursor:function(start){var range=this.sel.primary(),pos;if(start==null||start=="head")pos=range.head;else if(start=="anchor")pos=range.anchor;else if(start=="end"||start=="to"||start===false)pos=range.to();else pos=range.from();return pos;},listSelections:function(){return this.sel.ranges;},somethingSelected:function(){return this.sel.somethingSelected();},setCursor:docMethodOp(function(line,ch,options){setSimpleSelection(this,clipPos(this,typeof line=="number"?Pos(line,ch||0):line),null,options);}),setSelection:docMethodOp(function(anchor,head,options){setSimpleSelection(this,clipPos(this,anchor),clipPos(this,head||anchor),options);}),extendSelection:docMethodOp(function(head,other,options){extendSelection(this,clipPos(this,head),other&&clipPos(this,other),options);}),extendSelections:docMethodOp(function(heads,options){extendSelections(this,clipPosArray(this,heads,options));}),extendSelectionsBy:docMethodOp(function(f,options){extendSelections(this,map(this.sel.ranges,f),options);}),setSelections:docMethodOp(function(ranges,primary,options){if(!ranges.length)return;for(var i=0,out=[];i<ranges.length;i++)
out[i]=new Range(clipPos(this,ranges[i].anchor),clipPos(this,ranges[i].head));if(primary==null)primary=Math.min(ranges.length-1,this.sel.primIndex);setSelection(this,normalizeSelection(out,primary),options);}),addSelection:docMethodOp(function(anchor,head,options){var ranges=this.sel.ranges.slice(0);ranges.push(new Range(clipPos(this,anchor),clipPos(this,head||anchor)));setSelection(this,normalizeSelection(ranges,ranges.length-1),options);}),getSelection:function(lineSep){var ranges=this.sel.ranges,lines;for(var i=0;i<ranges.length;i++){var sel=getBetween(this,ranges[i].from(),ranges[i].to());lines=lines?lines.concat(sel):sel;}
if(lineSep===false)return lines;else return lines.join(lineSep||"\n");},getSelections:function(lineSep){var parts=[],ranges=this.sel.ranges;for(var i=0;i<ranges.length;i++){var sel=getBetween(this,ranges[i].from(),ranges[i].to());if(lineSep!==false)sel=sel.join(lineSep||"\n");parts[i]=sel;}
return parts;},replaceSelection:function(code,collapse,origin){var dup=[];for(var i=0;i<this.sel.ranges.length;i++)
dup[i]=code;this.replaceSelections(dup,collapse,origin||"+input");},replaceSelections:docMethodOp(function(code,collapse,origin){var changes=[],sel=this.sel;for(var i=0;i<sel.ranges.length;i++){var range=sel.ranges[i];changes[i]={from:range.from(),to:range.to(),text:splitLines(code[i]),origin:origin};}
var newSel=collapse&&collapse!="end"&&computeReplacedSel(this,changes,collapse);for(var i=changes.length-1;i>=0;i--)
makeChange(this,changes[i]);if(newSel)setSelectionReplaceHistory(this,newSel);else if(this.cm)ensureCursorVisible(this.cm);}),undo:docMethodOp(function(){makeChangeFromHistory(this,"undo");}),redo:docMethodOp(function(){makeChangeFromHistory(this,"redo");}),undoSelection:docMethodOp(function(){makeChangeFromHistory(this,"undo",true);}),redoSelection:docMethodOp(function(){makeChangeFromHistory(this,"redo",true);}),setExtending:function(val){this.extend=val;},getExtending:function(){return this.extend;},historySize:function(){var hist=this.history,done=0,undone=0;for(var i=0;i<hist.done.length;i++)if(!hist.done[i].ranges)++done;for(var i=0;i<hist.undone.length;i++)if(!hist.undone[i].ranges)++undone;return{undo:done,redo:undone};},clearHistory:function(){this.history=new History(this.history.maxGeneration);},markClean:function(){this.cleanGeneration=this.changeGeneration(true);},changeGeneration:function(forceSplit){if(forceSplit)
this.history.lastOp=this.history.lastOrigin=null;return this.history.generation;},isClean:function(gen){return this.history.generation==(gen||this.cleanGeneration);},getHistory:function(){return{done:copyHistoryArray(this.history.done),undone:copyHistoryArray(this.history.undone)};},setHistory:function(histData){var hist=this.history=new History(this.history.maxGeneration);hist.done=copyHistoryArray(histData.done.slice(0),null,true);hist.undone=copyHistoryArray(histData.undone.slice(0),null,true);},markText:function(from,to,options){return markText(this,clipPos(this,from),clipPos(this,to),options,"range");},setBookmark:function(pos,options){var realOpts={replacedWith:options&&(options.nodeType==null?options.widget:options),insertLeft:options&&options.insertLeft,clearWhenEmpty:false,shared:options&&options.shared};pos=clipPos(this,pos);return markText(this,pos,pos,realOpts,"bookmark");},findMarksAt:function(pos){pos=clipPos(this,pos);var markers=[],spans=getLine(this,pos.line).markedSpans;if(spans)for(var i=0;i<spans.length;++i){var span=spans[i];if((span.from==null||span.from<=pos.ch)&&(span.to==null||span.to>=pos.ch))
markers.push(span.marker.parent||span.marker);}
return markers;},findMarks:function(from,to,filter){from=clipPos(this,from);to=clipPos(this,to);var found=[],lineNo=from.line;this.iter(from.line,to.line+1,function(line){var spans=line.markedSpans;if(spans)for(var i=0;i<spans.length;i++){var span=spans[i];if(!(lineNo==from.line&&from.ch>span.to||span.from==null&&lineNo!=from.line||lineNo==to.line&&span.from>to.ch)&&(!filter||filter(span.marker)))
found.push(span.marker.parent||span.marker);}
++lineNo;});return found;},getAllMarks:function(){var markers=[];this.iter(function(line){var sps=line.markedSpans;if(sps)for(var i=0;i<sps.length;++i)
if(sps[i].from!=null)markers.push(sps[i].marker);});return markers;},posFromIndex:function(off){var ch,lineNo=this.first;this.iter(function(line){var sz=line.text.length+1;if(sz>off){ch=off;return true;}
off-=sz;++lineNo;});return clipPos(this,Pos(lineNo,ch));},indexFromPos:function(coords){coords=clipPos(this,coords);var index=coords.ch;if(coords.line<this.first||coords.ch<0)return 0;this.iter(this.first,coords.line,function(line){index+=line.text.length+1;});return index;},copy:function(copyHistory){var doc=new Doc(getLines(this,this.first,this.first+this.size),this.modeOption,this.first);doc.scrollTop=this.scrollTop;doc.scrollLeft=this.scrollLeft;doc.sel=this.sel;doc.extend=false;if(copyHistory){doc.history.undoDepth=this.history.undoDepth;doc.setHistory(this.getHistory());}
return doc;},linkedDoc:function(options){if(!options)options={};var from=this.first,to=this.first+this.size;if(options.from!=null&&options.from>from)from=options.from;if(options.to!=null&&options.to<to)to=options.to;var copy=new Doc(getLines(this,from,to),options.mode||this.modeOption,from);if(options.sharedHist)copy.history=this.history;(this.linked||(this.linked=[])).push({doc:copy,sharedHist:options.sharedHist});copy.linked=[{doc:this,isParent:true,sharedHist:options.sharedHist}];copySharedMarkers(copy,findSharedMarkers(this));return copy;},unlinkDoc:function(other){if(other instanceof CodeMirror)other=other.doc;if(this.linked)for(var i=0;i<this.linked.length;++i){var link=this.linked[i];if(link.doc!=other)continue;this.linked.splice(i,1);other.unlinkDoc(this);detachSharedMarkers(findSharedMarkers(this));break;}
if(other.history==this.history){var splitIds=[other.id];linkedDocs(other,function(doc){splitIds.push(doc.id);},true);other.history=new History(null);other.history.done=copyHistoryArray(this.history.done,splitIds);other.history.undone=copyHistoryArray(this.history.undone,splitIds);}},iterLinkedDocs:function(f){linkedDocs(this,f);},getMode:function(){return this.mode;},getEditor:function(){return this.cm;}});Doc.prototype.eachLine=Doc.prototype.iter;var dontDelegate="iter insert remove copy getEditor".split(" ");for(var prop in Doc.prototype)if(Doc.prototype.hasOwnProperty(prop)&&indexOf(dontDelegate,prop)<0)
CodeMirror.prototype[prop]=(function(method){return function(){return method.apply(this.doc,arguments);};})(Doc.prototype[prop]);eventMixin(Doc);function linkedDocs(doc,f,sharedHistOnly){function propagate(doc,skip,sharedHist){if(doc.linked)for(var i=0;i<doc.linked.length;++i){var rel=doc.linked[i];if(rel.doc==skip)continue;var shared=sharedHist&&rel.sharedHist;if(sharedHistOnly&&!shared)continue;f(rel.doc,shared);propagate(rel.doc,doc,shared);}}
propagate(doc,null,true);}
function attachDoc(cm,doc){if(doc.cm)throw new Error("This document is already in use.");cm.doc=doc;doc.cm=cm;estimateLineHeights(cm);loadMode(cm);if(!cm.options.lineWrapping)findMaxLine(cm);cm.options.mode=doc.modeOption;regChange(cm);}
function getLine(doc,n){n-=doc.first;if(n<0||n>=doc.size)throw new Error("There is no line "+(n+doc.first)+" in the document.");for(var chunk=doc;!chunk.lines;){for(var i=0;;++i){var child=chunk.children[i],sz=child.chunkSize();if(n<sz){chunk=child;break;}
n-=sz;}}
return chunk.lines[n];}
function getBetween(doc,start,end){var out=[],n=start.line;doc.iter(start.line,end.line+1,function(line){var text=line.text;if(n==end.line)text=text.slice(0,end.ch);if(n==start.line)text=text.slice(start.ch);out.push(text);++n;});return out;}
function getLines(doc,from,to){var out=[];doc.iter(from,to,function(line){out.push(line.text);});return out;}
function updateLineHeight(line,height){var diff=height-line.height;if(diff)for(var n=line;n;n=n.parent)n.height+=diff;}
function lineNo(line){if(line.parent==null)return null;var cur=line.parent,no=indexOf(cur.lines,line);for(var chunk=cur.parent;chunk;cur=chunk,chunk=chunk.parent){for(var i=0;;++i){if(chunk.children[i]==cur)break;no+=chunk.children[i].chunkSize();}}
return no+cur.first;}
function lineAtHeight(chunk,h){var n=chunk.first;outer:do{for(var i=0;i<chunk.children.length;++i){var child=chunk.children[i],ch=child.height;if(h<ch){chunk=child;continue outer;}
h-=ch;n+=child.chunkSize();}
return n;}while(!chunk.lines);for(var i=0;i<chunk.lines.length;++i){var line=chunk.lines[i],lh=line.height;if(h<lh)break;h-=lh;}
return n+i;}
function heightAtLine(lineObj){lineObj=visualLine(lineObj);var h=0,chunk=lineObj.parent;for(var i=0;i<chunk.lines.length;++i){var line=chunk.lines[i];if(line==lineObj)break;else h+=line.height;}
for(var p=chunk.parent;p;chunk=p,p=chunk.parent){for(var i=0;i<p.children.length;++i){var cur=p.children[i];if(cur==chunk)break;else h+=cur.height;}}
return h;}
function getOrder(line){var order=line.order;if(order==null)order=line.order=bidiOrdering(line.text);return order;}
function History(startGen){this.done=[];this.undone=[];this.undoDepth=Infinity;this.lastModTime=this.lastSelTime=0;this.lastOp=null;this.lastOrigin=this.lastSelOrigin=null;this.generation=this.maxGeneration=startGen||1;}
function historyChangeFromChange(doc,change){var histChange={from:copyPos(change.from),to:changeEnd(change),text:getBetween(doc,change.from,change.to)};attachLocalSpans(doc,histChange,change.from.line,change.to.line+1);linkedDocs(doc,function(doc){attachLocalSpans(doc,histChange,change.from.line,change.to.line+1);},true);return histChange;}
function clearSelectionEvents(array){while(array.length){var last=lst(array);if(last.ranges)array.pop();else break;}}
function lastChangeEvent(hist,force){if(force){clearSelectionEvents(hist.done);return lst(hist.done);}else if(hist.done.length&&!lst(hist.done).ranges){return lst(hist.done);}else if(hist.done.length>1&&!hist.done[hist.done.length-2].ranges){hist.done.pop();return lst(hist.done);}}
function addChangeToHistory(doc,change,selAfter,opId){var hist=doc.history;hist.undone.length=0;var time=+new Date,cur;if((hist.lastOp==opId||hist.lastOrigin==change.origin&&change.origin&&((change.origin.charAt(0)=="+"&&doc.cm&&hist.lastModTime>time-doc.cm.options.historyEventDelay)||change.origin.charAt(0)=="*"))&&(cur=lastChangeEvent(hist,hist.lastOp==opId))){var last=lst(cur.changes);if(cmp(change.from,change.to)==0&&cmp(change.from,last.to)==0){last.to=changeEnd(change);}else{cur.changes.push(historyChangeFromChange(doc,change));}}else{var before=lst(hist.done);if(!before||!before.ranges)
pushSelectionToHistory(doc.sel,hist.done);cur={changes:[historyChangeFromChange(doc,change)],generation:hist.generation};hist.done.push(cur);while(hist.done.length>hist.undoDepth){hist.done.shift();if(!hist.done[0].ranges)hist.done.shift();}}
hist.done.push(selAfter);hist.generation=++hist.maxGeneration;hist.lastModTime=hist.lastSelTime=time;hist.lastOp=opId;hist.lastOrigin=hist.lastSelOrigin=change.origin;if(!last)signal(doc,"historyAdded");}
function selectionEventCanBeMerged(doc,origin,prev,sel){var ch=origin.charAt(0);return ch=="*"||ch=="+"&&prev.ranges.length==sel.ranges.length&&prev.somethingSelected()==sel.somethingSelected()&&new Date-doc.history.lastSelTime<=(doc.cm?doc.cm.options.historyEventDelay:500);}
function addSelectionToHistory(doc,sel,opId,options){var hist=doc.history,origin=options&&options.origin;if(opId==hist.lastOp||(origin&&hist.lastSelOrigin==origin&&(hist.lastModTime==hist.lastSelTime&&hist.lastOrigin==origin||selectionEventCanBeMerged(doc,origin,lst(hist.done),sel))))
hist.done[hist.done.length-1]=sel;else
pushSelectionToHistory(sel,hist.done);hist.lastSelTime=+new Date;hist.lastSelOrigin=origin;hist.lastOp=opId;if(options&&options.clearRedo!==false)
clearSelectionEvents(hist.undone);}
function pushSelectionToHistory(sel,dest){var top=lst(dest);if(!(top&&top.ranges&&top.equals(sel)))
dest.push(sel);}
function attachLocalSpans(doc,change,from,to){var existing=change["spans_"+doc.id],n=0;doc.iter(Math.max(doc.first,from),Math.min(doc.first+doc.size,to),function(line){if(line.markedSpans)
(existing||(existing=change["spans_"+doc.id]={}))[n]=line.markedSpans;++n;});}
function removeClearedSpans(spans){if(!spans)return null;for(var i=0,out;i<spans.length;++i){if(spans[i].marker.explicitlyCleared){if(!out)out=spans.slice(0,i);}
else if(out)out.push(spans[i]);}
return!out?spans:out.length?out:null;}
function getOldSpans(doc,change){var found=change["spans_"+doc.id];if(!found)return null;for(var i=0,nw=[];i<change.text.length;++i)
nw.push(removeClearedSpans(found[i]));return nw;}
function copyHistoryArray(events,newGroup,instantiateSel){for(var i=0,copy=[];i<events.length;++i){var event=events[i];if(event.ranges){copy.push(instantiateSel?Selection.prototype.deepCopy.call(event):event);continue;}
var changes=event.changes,newChanges=[];copy.push({changes:newChanges});for(var j=0;j<changes.length;++j){var change=changes[j],m;newChanges.push({from:change.from,to:change.to,text:change.text});if(newGroup)for(var prop in change)if(m=prop.match(/^spans_(\d+)$/)){if(indexOf(newGroup,Number(m[1]))>-1){lst(newChanges)[prop]=change[prop];delete change[prop];}}}}
return copy;}
function rebaseHistSelSingle(pos,from,to,diff){if(to<pos.line){pos.line+=diff;}else if(from<pos.line){pos.line=from;pos.ch=0;}}
function rebaseHistArray(array,from,to,diff){for(var i=0;i<array.length;++i){var sub=array[i],ok=true;if(sub.ranges){if(!sub.copied){sub=array[i]=sub.deepCopy();sub.copied=true;}
for(var j=0;j<sub.ranges.length;j++){rebaseHistSelSingle(sub.ranges[j].anchor,from,to,diff);rebaseHistSelSingle(sub.ranges[j].head,from,to,diff);}
continue;}
for(var j=0;j<sub.changes.length;++j){var cur=sub.changes[j];if(to<cur.from.line){cur.from=Pos(cur.from.line+diff,cur.from.ch);cur.to=Pos(cur.to.line+diff,cur.to.ch);}else if(from<=cur.to.line){ok=false;break;}}
if(!ok){array.splice(0,i+1);i=0;}}}
function rebaseHist(hist,change){var from=change.from.line,to=change.to.line,diff=change.text.length-(to-from)-1;rebaseHistArray(hist.done,from,to,diff);rebaseHistArray(hist.undone,from,to,diff);}
var e_preventDefault=CodeMirror.e_preventDefault=function(e){if(e.preventDefault)e.preventDefault();else e.returnValue=false;};var e_stopPropagation=CodeMirror.e_stopPropagation=function(e){if(e.stopPropagation)e.stopPropagation();else e.cancelBubble=true;};function e_defaultPrevented(e){return e.defaultPrevented!=null?e.defaultPrevented:e.returnValue==false;}
var e_stop=CodeMirror.e_stop=function(e){e_preventDefault(e);e_stopPropagation(e);};function e_target(e){return e.target||e.srcElement;}
function e_button(e){var b=e.which;if(b==null){if(e.button&1)b=1;else if(e.button&2)b=3;else if(e.button&4)b=2;}
if(mac&&e.ctrlKey&&b==1)b=3;return b;}
var on=CodeMirror.on=function(emitter,type,f){if(emitter.addEventListener)
emitter.addEventListener(type,f,false);else if(emitter.attachEvent)
emitter.attachEvent("on"+type,f);else{var map=emitter._handlers||(emitter._handlers={});var arr=map[type]||(map[type]=[]);arr.push(f);}};var off=CodeMirror.off=function(emitter,type,f){if(emitter.removeEventListener)
emitter.removeEventListener(type,f,false);else if(emitter.detachEvent)
emitter.detachEvent("on"+type,f);else{var arr=emitter._handlers&&emitter._handlers[type];if(!arr)return;for(var i=0;i<arr.length;++i)
if(arr[i]==f){arr.splice(i,1);break;}}};var signal=CodeMirror.signal=function(emitter,type){var arr=emitter._handlers&&emitter._handlers[type];if(!arr)return;var args=Array.prototype.slice.call(arguments,2);for(var i=0;i<arr.length;++i)arr[i].apply(null,args);};var delayedCallbacks,delayedCallbackDepth=0;function signalLater(emitter,type){var arr=emitter._handlers&&emitter._handlers[type];if(!arr)return;var args=Array.prototype.slice.call(arguments,2);if(!delayedCallbacks){++delayedCallbackDepth;delayedCallbacks=[];setTimeout(fireDelayed,0);}
function bnd(f){return function(){f.apply(null,args);};};for(var i=0;i<arr.length;++i)
delayedCallbacks.push(bnd(arr[i]));}
function fireDelayed(){--delayedCallbackDepth;var delayed=delayedCallbacks;delayedCallbacks=null;for(var i=0;i<delayed.length;++i)delayed[i]();}
function signalDOMEvent(cm,e,override){signal(cm,override||e.type,cm,e);return e_defaultPrevented(e)||e.codemirrorIgnore;}
function signalCursorActivity(cm){var arr=cm._handlers&&cm._handlers.cursorActivity;if(!arr)return;var set=cm.curOp.cursorActivityHandlers||(cm.curOp.cursorActivityHandlers=[]);for(var i=0;i<arr.length;++i)if(indexOf(set,arr[i])==-1)
set.push(arr[i]);}
function hasHandler(emitter,type){var arr=emitter._handlers&&emitter._handlers[type];return arr&&arr.length>0;}
function eventMixin(ctor){ctor.prototype.on=function(type,f){on(this,type,f);};ctor.prototype.off=function(type,f){off(this,type,f);};}
var scrollerCutOff=30;var Pass=CodeMirror.Pass={toString:function(){return"CodeMirror.Pass";}};var sel_dontScroll={scroll:false},sel_mouse={origin:"*mouse"},sel_move={origin:"+move"};function Delayed(){this.id=null;}
Delayed.prototype.set=function(ms,f){clearTimeout(this.id);this.id=setTimeout(f,ms);};var countColumn=CodeMirror.countColumn=function(string,end,tabSize,startIndex,startValue){if(end==null){end=string.search(/[^\s\u00a0]/);if(end==-1)end=string.length;}
for(var i=startIndex||0,n=startValue||0;;){var nextTab=string.indexOf("\t",i);if(nextTab<0||nextTab>=end)
return n+(end-i);n+=nextTab-i;n+=tabSize-(n%tabSize);i=nextTab+1;}};function findColumn(string,goal,tabSize){for(var pos=0,col=0;;){var nextTab=string.indexOf("\t",pos);if(nextTab==-1)nextTab=string.length;var skipped=nextTab-pos;if(nextTab==string.length||col+skipped>=goal)
return pos+Math.min(skipped,goal-col);col+=nextTab-pos;col+=tabSize-(col%tabSize);pos=nextTab+1;if(col>=goal)return pos;}}
var spaceStrs=[""];function spaceStr(n){while(spaceStrs.length<=n)
spaceStrs.push(lst(spaceStrs)+" ");return spaceStrs[n];}
function lst(arr){return arr[arr.length-1];}
var selectInput=function(node){node.select();};if(ios)
selectInput=function(node){node.selectionStart=0;node.selectionEnd=node.value.length;};else if(ie)
selectInput=function(node){try{node.select();}catch(_e){}};function indexOf(array,elt){for(var i=0;i<array.length;++i)
if(array[i]==elt)return i;return-1;}
if([].indexOf)indexOf=function(array,elt){return array.indexOf(elt);};function map(array,f){var out=[];for(var i=0;i<array.length;i++)out[i]=f(array[i],i);return out;}
if([].map)map=function(array,f){return array.map(f);};function createObj(base,props){var inst;if(Object.create){inst=Object.create(base);}else{var ctor=function(){};ctor.prototype=base;inst=new ctor();}
if(props)copyObj(props,inst);return inst;};function copyObj(obj,target,overwrite){if(!target)target={};for(var prop in obj)
if(obj.hasOwnProperty(prop)&&(overwrite!==false||!target.hasOwnProperty(prop)))
target[prop]=obj[prop];return target;}
function bind(f){var args=Array.prototype.slice.call(arguments,1);return function(){return f.apply(null,args);};}
var nonASCIISingleCaseWordChar=/[\u00df\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;var isWordCharBasic=CodeMirror.isWordChar=function(ch){return/\w/.test(ch)||ch>"\x80"&&(ch.toUpperCase()!=ch.toLowerCase()||nonASCIISingleCaseWordChar.test(ch));};function isWordChar(ch,helper){if(!helper)return isWordCharBasic(ch);if(helper.source.indexOf("\\w")>-1&&isWordCharBasic(ch))return true;return helper.test(ch);}
function isEmpty(obj){for(var n in obj)if(obj.hasOwnProperty(n)&&obj[n])return false;return true;}
var extendingChars=/[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;function isExtendingChar(ch){return ch.charCodeAt(0)>=768&&extendingChars.test(ch);}
function elt(tag,content,className,style){var e=document.createElement(tag);if(className)e.className=className;if(style)e.style.cssText=style;if(typeof content=="string")e.appendChild(document.createTextNode(content));else if(content)for(var i=0;i<content.length;++i)e.appendChild(content[i]);return e;}
var range;if(document.createRange)range=function(node,start,end){var r=document.createRange();r.setEnd(node,end);r.setStart(node,start);return r;};else range=function(node,start,end){var r=document.body.createTextRange();r.moveToElementText(node.parentNode);r.collapse(true);r.moveEnd("character",end);r.moveStart("character",start);return r;};function removeChildren(e){for(var count=e.childNodes.length;count>0;--count)
e.removeChild(e.firstChild);return e;}
function removeChildrenAndAdd(parent,e){return removeChildren(parent).appendChild(e);}
function contains(parent,child){if(parent.contains)
return parent.contains(child);while(child=child.parentNode)
if(child==parent)return true;}
function activeElt(){return document.activeElement;}
if(ie_upto10)activeElt=function(){try{return document.activeElement;}
catch(e){return document.body;}};function classTest(cls){return new RegExp("\\b"+cls+"\\b\\s*");}
function rmClass(node,cls){var test=classTest(cls);if(test.test(node.className))node.className=node.className.replace(test,"");}
function addClass(node,cls){if(!classTest(cls).test(node.className))node.className+=" "+cls;}
function joinClasses(a,b){var as=a.split(" ");for(var i=0;i<as.length;i++)
if(as[i]&&!classTest(as[i]).test(b))b+=" "+as[i];return b;}
function forEachCodeMirror(f){if(!document.body.getElementsByClassName)return;var byClass=document.body.getElementsByClassName("CodeMirror");for(var i=0;i<byClass.length;i++){var cm=byClass[i].CodeMirror;if(cm)f(cm);}}
var globalsRegistered=false;function ensureGlobalHandlers(){if(globalsRegistered)return;registerGlobalHandlers();globalsRegistered=true;}
function registerGlobalHandlers(){var resizeTimer;on(window,"resize",function(){if(resizeTimer==null)resizeTimer=setTimeout(function(){resizeTimer=null;knownScrollbarWidth=null;forEachCodeMirror(onResize);},100);});on(window,"blur",function(){forEachCodeMirror(onBlur);});}
var dragAndDrop=function(){if(ie_upto8)return false;var div=elt('div');return"draggable"in div||"dragDrop"in div;}();var knownScrollbarWidth;function scrollbarWidth(measure){if(knownScrollbarWidth!=null)return knownScrollbarWidth;var test=elt("div",null,null,"width: 50px; height: 50px; overflow-x: scroll");removeChildrenAndAdd(measure,test);if(test.offsetWidth)
knownScrollbarWidth=test.offsetHeight-test.clientHeight;return knownScrollbarWidth||0;}
var zwspSupported;function zeroWidthElement(measure){if(zwspSupported==null){var test=elt("span","\u200b");removeChildrenAndAdd(measure,elt("span",[test,document.createTextNode("x")]));if(measure.firstChild.offsetHeight!=0)
zwspSupported=test.offsetWidth<=1&&test.offsetHeight>2&&!ie_upto7;}
if(zwspSupported)return elt("span","\u200b");else return elt("span","\u00a0",null,"display: inline-block; width: 1px; margin-right: -1px");}
var badBidiRects;function hasBadBidiRects(measure){if(badBidiRects!=null)return badBidiRects;var txt=removeChildrenAndAdd(measure,document.createTextNode("A\u062eA"));var r0=range(txt,0,1).getBoundingClientRect();if(r0.left==r0.right)return false;var r1=range(txt,1,2).getBoundingClientRect();return badBidiRects=(r1.right-r0.right<3);}
var splitLines=CodeMirror.splitLines="\n\nb".split(/\n/).length!=3?function(string){var pos=0,result=[],l=string.length;while(pos<=l){var nl=string.indexOf("\n",pos);if(nl==-1)nl=string.length;var line=string.slice(pos,string.charAt(nl-1)=="\r"?nl-1:nl);var rt=line.indexOf("\r");if(rt!=-1){result.push(line.slice(0,rt));pos+=rt+1;}else{result.push(line);pos=nl+1;}}
return result;}:function(string){return string.split(/\r\n?|\n/);};var hasSelection=window.getSelection?function(te){try{return te.selectionStart!=te.selectionEnd;}
catch(e){return false;}}:function(te){try{var range=te.ownerDocument.selection.createRange();}
catch(e){}
if(!range||range.parentElement()!=te)return false;return range.compareEndPoints("StartToEnd",range)!=0;};var hasCopyEvent=(function(){var e=elt("div");if("oncopy"in e)return true;e.setAttribute("oncopy","return;");return typeof e.oncopy=="function";})();var keyNames={3:"Enter",8:"Backspace",9:"Tab",13:"Enter",16:"Shift",17:"Ctrl",18:"Alt",19:"Pause",20:"CapsLock",27:"Esc",32:"Space",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"Left",38:"Up",39:"Right",40:"Down",44:"PrintScrn",45:"Insert",46:"Delete",59:";",61:"=",91:"Mod",92:"Mod",93:"Mod",107:"=",109:"-",127:"Delete",173:"-",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:"'",63232:"Up",63233:"Down",63234:"Left",63235:"Right",63272:"Delete",63273:"Home",63275:"End",63276:"PageUp",63277:"PageDown",63302:"Insert"};CodeMirror.keyNames=keyNames;(function(){for(var i=0;i<10;i++)keyNames[i+48]=keyNames[i+96]=String(i);for(var i=65;i<=90;i++)keyNames[i]=String.fromCharCode(i);for(var i=1;i<=12;i++)keyNames[i+111]=keyNames[i+63235]="F"+i;})();function iterateBidiSections(order,from,to,f){if(!order)return f(from,to,"ltr");var found=false;for(var i=0;i<order.length;++i){var part=order[i];if(part.from<to&&part.to>from||from==to&&part.to==from){f(Math.max(part.from,from),Math.min(part.to,to),part.level==1?"rtl":"ltr");found=true;}}
if(!found)f(from,to,"ltr");}
function bidiLeft(part){return part.level%2?part.to:part.from;}
function bidiRight(part){return part.level%2?part.from:part.to;}
function lineLeft(line){var order=getOrder(line);return order?bidiLeft(order[0]):0;}
function lineRight(line){var order=getOrder(line);if(!order)return line.text.length;return bidiRight(lst(order));}
function lineStart(cm,lineN){var line=getLine(cm.doc,lineN);var visual=visualLine(line);if(visual!=line)lineN=lineNo(visual);var order=getOrder(visual);var ch=!order?0:order[0].level%2?lineRight(visual):lineLeft(visual);return Pos(lineN,ch);}
function lineEnd(cm,lineN){var merged,line=getLine(cm.doc,lineN);while(merged=collapsedSpanAtEnd(line)){line=merged.find(1,true).line;lineN=null;}
var order=getOrder(line);var ch=!order?line.text.length:order[0].level%2?lineLeft(line):lineRight(line);return Pos(lineN==null?lineNo(line):lineN,ch);}
function compareBidiLevel(order,a,b){var linedir=order[0].level;if(a==linedir)return true;if(b==linedir)return false;return a<b;}
var bidiOther;function getBidiPartAt(order,pos){bidiOther=null;for(var i=0,found;i<order.length;++i){var cur=order[i];if(cur.from<pos&&cur.to>pos)return i;if((cur.from==pos||cur.to==pos)){if(found==null){found=i;}else if(compareBidiLevel(order,cur.level,order[found].level)){if(cur.from!=cur.to)bidiOther=found;return i;}else{if(cur.from!=cur.to)bidiOther=i;return found;}}}
return found;}
function moveInLine(line,pos,dir,byUnit){if(!byUnit)return pos+dir;do pos+=dir;while(pos>0&&isExtendingChar(line.text.charAt(pos)));return pos;}
function moveVisually(line,start,dir,byUnit){var bidi=getOrder(line);if(!bidi)return moveLogically(line,start,dir,byUnit);var pos=getBidiPartAt(bidi,start),part=bidi[pos];var target=moveInLine(line,start,part.level%2?-dir:dir,byUnit);for(;;){if(target>part.from&&target<part.to)return target;if(target==part.from||target==part.to){if(getBidiPartAt(bidi,target)==pos)return target;part=bidi[pos+=dir];return(dir>0)==part.level%2?part.to:part.from;}else{part=bidi[pos+=dir];if(!part)return null;if((dir>0)==part.level%2)
target=moveInLine(line,part.to,-1,byUnit);else
target=moveInLine(line,part.from,1,byUnit);}}}
function moveLogically(line,start,dir,byUnit){var target=start+dir;if(byUnit)while(target>0&&isExtendingChar(line.text.charAt(target)))target+=dir;return target<0||target>line.text.length?null:target;}
var bidiOrdering=(function(){var lowTypes="bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";var arabicTypes="rrrrrrrrrrrr,rNNmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmrrrrrrrnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmNmmmm";function charType(code){if(code<=0xf7)return lowTypes.charAt(code);else if(0x590<=code&&code<=0x5f4)return"R";else if(0x600<=code&&code<=0x6ed)return arabicTypes.charAt(code-0x600);else if(0x6ee<=code&&code<=0x8ac)return"r";else if(0x2000<=code&&code<=0x200b)return"w";else if(code==0x200c)return"b";else return"L";}
var bidiRE=/[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;var isNeutral=/[stwN]/,isStrong=/[LRr]/,countsAsLeft=/[Lb1n]/,countsAsNum=/[1n]/;var outerType="L";function BidiSpan(level,from,to){this.level=level;this.from=from;this.to=to;}
return function(str){if(!bidiRE.test(str))return false;var len=str.length,types=[];for(var i=0,type;i<len;++i)
types.push(type=charType(str.charCodeAt(i)));for(var i=0,prev=outerType;i<len;++i){var type=types[i];if(type=="m")types[i]=prev;else prev=type;}
for(var i=0,cur=outerType;i<len;++i){var type=types[i];if(type=="1"&&cur=="r")types[i]="n";else if(isStrong.test(type)){cur=type;if(type=="r")types[i]="R";}}
for(var i=1,prev=types[0];i<len-1;++i){var type=types[i];if(type=="+"&&prev=="1"&&types[i+1]=="1")types[i]="1";else if(type==","&&prev==types[i+1]&&(prev=="1"||prev=="n"))types[i]=prev;prev=type;}
for(var i=0;i<len;++i){var type=types[i];if(type==",")types[i]="N";else if(type=="%"){for(var end=i+1;end<len&&types[end]=="%";++end){}
var replace=(i&&types[i-1]=="!")||(end<len&&types[end]=="1")?"1":"N";for(var j=i;j<end;++j)types[j]=replace;i=end-1;}}
for(var i=0,cur=outerType;i<len;++i){var type=types[i];if(cur=="L"&&type=="1")types[i]="L";else if(isStrong.test(type))cur=type;}
for(var i=0;i<len;++i){if(isNeutral.test(types[i])){for(var end=i+1;end<len&&isNeutral.test(types[end]);++end){}
var before=(i?types[i-1]:outerType)=="L";var after=(end<len?types[end]:outerType)=="L";var replace=before||after?"L":"R";for(var j=i;j<end;++j)types[j]=replace;i=end-1;}}
var order=[],m;for(var i=0;i<len;){if(countsAsLeft.test(types[i])){var start=i;for(++i;i<len&&countsAsLeft.test(types[i]);++i){}
order.push(new BidiSpan(0,start,i));}else{var pos=i,at=order.length;for(++i;i<len&&types[i]!="L";++i){}
for(var j=pos;j<i;){if(countsAsNum.test(types[j])){if(pos<j)order.splice(at,0,new BidiSpan(1,pos,j));var nstart=j;for(++j;j<i&&countsAsNum.test(types[j]);++j){}
order.splice(at,0,new BidiSpan(2,nstart,j));pos=j;}else++j;}
if(pos<i)order.splice(at,0,new BidiSpan(1,pos,i));}}
if(order[0].level==1&&(m=str.match(/^\s+/))){order[0].from=m[0].length;order.unshift(new BidiSpan(0,0,m[0].length));}
if(lst(order).level==1&&(m=str.match(/\s+$/))){lst(order).to-=m[0].length;order.push(new BidiSpan(0,len-m[0].length,len));}
if(order[0].level!=lst(order).level)
order.push(new BidiSpan(order[0].level,len,len));return order;};})();CodeMirror.version="4.1.1";return CodeMirror;});;CodeMirror.defineMode("css",function(config,parserConfig){"use strict";if(!parserConfig.propertyKeywords)parserConfig=CodeMirror.resolveMode("text/css");var indentUnit=config.indentUnit||config.tabSize||2,hooks=parserConfig.hooks||{},atMediaTypes=parserConfig.atMediaTypes||{},atMediaFeatures=parserConfig.atMediaFeatures||{},propertyKeywords=parserConfig.propertyKeywords||{},colorKeywords=parserConfig.colorKeywords||{},valueKeywords=parserConfig.valueKeywords||{},allowNested=!!parserConfig.allowNested,type=null;function ret(style,tp){type=tp;return style;}
function tokenBase(stream,state){var ch=stream.next();if(hooks[ch]){var result=hooks[ch](stream,state);if(result!==false)return result;}
if(ch=="@"){stream.eatWhile(/[\w\\\-]/);return ret("def",stream.current());}
else if(ch=="=")ret(null,"compare");else if((ch=="~"||ch=="|")&&stream.eat("="))return ret(null,"compare");else if(ch=="\""||ch=="'"){state.tokenize=tokenString(ch);return state.tokenize(stream,state);}
else if(ch=="#"){stream.eatWhile(/[\w\\\-]/);return ret("atom","hash");}
else if(ch=="!"){stream.match(/^\s*\w*/);return ret("keyword","important");}
else if(/\d/.test(ch)||ch=="."&&stream.eat(/\d/)){stream.eatWhile(/[\w.%]/);return ret("number","unit");}
else if(ch==="-"){if(/\d/.test(stream.peek())){stream.eatWhile(/[\w.%]/);return ret("number","unit");}else if(stream.match(/^[^-]+-/)){return ret("meta","meta");}}
else if(/[,+>*\/]/.test(ch)){return ret(null,"select-op");}
else if(ch=="."&&stream.match(/^-?[_a-z][_a-z0-9-]*/i)){return ret("qualifier","qualifier");}
else if(ch==":"){return ret("operator",ch);}
else if(/[;{}\[\]\(\)]/.test(ch)){return ret(null,ch);}
else if(ch=="u"&&stream.match("rl(")){stream.backUp(1);state.tokenize=tokenParenthesized;return ret("property","variable");}
else{stream.eatWhile(/[\w\\\-]/);return ret("property","variable");}}
function tokenString(quote,nonInclusive){return function(stream,state){var escaped=false,ch;while((ch=stream.next())!=null){if(ch==quote&&!escaped)
break;escaped=!escaped&&ch=="\\";}
if(!escaped){if(nonInclusive)stream.backUp(1);state.tokenize=tokenBase;}
return ret("string","string");};}
function tokenParenthesized(stream,state){stream.next();if(!stream.match(/\s*[\"\']/,false))
state.tokenize=tokenString(")",true);else
state.tokenize=tokenBase;return ret(null,"(");}
return{startState:function(base){return{tokenize:tokenBase,baseIndent:base||0,stack:[],lastToken:null};},token:function(stream,state){state.tokenize=state.tokenize||tokenBase;if(state.tokenize==tokenBase&&stream.eatSpace())return null;var style=state.tokenize(stream,state);if(style&&typeof style!="string")style=ret(style[0],style[1]);var context=state.stack[state.stack.length-1];if(style=="variable"){if(type=="variable-definition")state.stack.push("propertyValue");return state.lastToken="variable-2";}else if(style=="property"){var word=stream.current().toLowerCase();if(context=="propertyValue"){if(valueKeywords.hasOwnProperty(word)){style="string-2";}else if(colorKeywords.hasOwnProperty(word)){style="keyword";}else{style="variable-2";}}else if(context=="rule"){if(!propertyKeywords.hasOwnProperty(word)){style+=" error";}}else if(context=="block"){if(propertyKeywords.hasOwnProperty(word)){style="property";}else if(colorKeywords.hasOwnProperty(word)){style="keyword";}else if(valueKeywords.hasOwnProperty(word)){style="string-2";}else{style="tag";}}else if(!context||context=="@media{"){style="tag";}else if(context=="@media"){if(atMediaTypes[stream.current()]){style="attribute";}else if(/^(only|not)$/.test(word)){style="keyword";}else if(word=="and"){style="error";}else if(atMediaFeatures.hasOwnProperty(word)){style="error";}else{style="attribute error";}}else if(context=="@mediaType"){if(atMediaTypes.hasOwnProperty(word)){style="attribute";}else if(word=="and"){style="operator";}else if(/^(only|not)$/.test(word)){style="error";}else{style="error";}}else if(context=="@mediaType("){if(propertyKeywords.hasOwnProperty(word)){}else if(atMediaTypes.hasOwnProperty(word)){style="error";}else if(word=="and"){style="operator";}else if(/^(only|not)$/.test(word)){style="error";}else{style+=" error";}}else if(context=="@import"){style="tag";}else{style="error";}}else if(style=="atom"){if(!context||context=="@media{"||context=="block"){style="builtin";}else if(context=="propertyValue"){if(!/^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/.test(stream.current())){style+=" error";}}else{style="error";}}else if(context=="@media"&&type=="{"){style="error";}
if(type=="{"){if(context=="@media"||context=="@mediaType"){state.stack[state.stack.length-1]="@media{";}
else{var newContext=allowNested?"block":"rule";state.stack.push(newContext);}}
else if(type=="}"){if(context=="interpolation")style="operator";while(state.stack.length){var removed=state.stack.pop();if(removed.indexOf("{")>-1||removed=="block"||removed=="rule"){break;}}}
else if(type=="interpolation")state.stack.push("interpolation");else if(type=="@media")state.stack.push("@media");else if(type=="@import")state.stack.push("@import");else if(context=="@media"&&/\b(keyword|attribute)\b/.test(style))
state.stack[state.stack.length-1]="@mediaType";else if(context=="@mediaType"&&stream.current()==",")
state.stack[state.stack.length-1]="@media";else if(type=="("){if(context=="@media"||context=="@mediaType"){state.stack[state.stack.length-1]="@mediaType";state.stack.push("@mediaType(");}
else state.stack.push("(");}
else if(type==")"){while(state.stack.length){var removed=state.stack.pop();if(removed.indexOf("(")>-1){break;}}}
else if(type==":"&&state.lastToken=="property")state.stack.push("propertyValue");else if(context=="propertyValue"&&type==";")state.stack.pop();else if(context=="@import"&&type==";")state.stack.pop();return state.lastToken=style;},indent:function(state,textAfter){var n=state.stack.length;if(/^\}/.test(textAfter))
n-=state.stack[n-1]=="propertyValue"?2:1;return state.baseIndent+n*indentUnit;},electricChars:"}",blockCommentStart:"/*",blockCommentEnd:"*/",fold:"brace"};});(function(){function keySet(array){var keys={};for(var i=0;i<array.length;++i){keys[array[i]]=true;}
return keys;}
var atMediaTypes=keySet(["all","aural","braille","handheld","print","projection","screen","tty","tv","embossed"]);var atMediaFeatures=keySet(["width","min-width","max-width","height","min-height","max-height","device-width","min-device-width","max-device-width","device-height","min-device-height","max-device-height","aspect-ratio","min-aspect-ratio","max-aspect-ratio","device-aspect-ratio","min-device-aspect-ratio","max-device-aspect-ratio","color","min-color","max-color","color-index","min-color-index","max-color-index","monochrome","min-monochrome","max-monochrome","resolution","min-resolution","max-resolution","scan","grid"]);var propertyKeywords=keySet(["align-content","align-items","align-self","alignment-adjust","alignment-baseline","anchor-point","animation","animation-delay","animation-direction","animation-duration","animation-iteration-count","animation-name","animation-play-state","animation-timing-function","appearance","azimuth","backface-visibility","background","background-attachment","background-clip","background-color","background-image","background-origin","background-position","background-repeat","background-size","baseline-shift","binding","bleed","bookmark-label","bookmark-level","bookmark-state","bookmark-target","border","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius","border-bottom-style","border-bottom-width","border-collapse","border-color","border-image","border-image-outset","border-image-repeat","border-image-slice","border-image-source","border-image-width","border-left","border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color","border-right-style","border-right-width","border-spacing","border-style","border-top","border-top-color","border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width","bottom","box-decoration-break","box-shadow","box-sizing","break-after","break-before","break-inside","caption-side","clear","clip","color","color-profile","column-count","column-fill","column-gap","column-rule","column-rule-color","column-rule-style","column-rule-width","column-span","column-width","columns","content","counter-increment","counter-reset","crop","cue","cue-after","cue-before","cursor","direction","display","dominant-baseline","drop-initial-after-adjust","drop-initial-after-align","drop-initial-before-adjust","drop-initial-before-align","drop-initial-size","drop-initial-value","elevation","empty-cells","fit","fit-position","flex","flex-basis","flex-direction","flex-flow","flex-grow","flex-shrink","flex-wrap","float","float-offset","flow-from","flow-into","font","font-feature-settings","font-family","font-kerning","font-language-override","font-size","font-size-adjust","font-stretch","font-style","font-synthesis","font-variant","font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-ligatures","font-variant-numeric","font-variant-position","font-weight","grid-cell","grid-column","grid-column-align","grid-column-sizing","grid-column-span","grid-columns","grid-flow","grid-row","grid-row-align","grid-row-sizing","grid-row-span","grid-rows","grid-template","hanging-punctuation","height","hyphens","icon","image-orientation","image-rendering","image-resolution","inline-box-align","justify-content","left","letter-spacing","line-break","line-height","line-stacking","line-stacking-ruby","line-stacking-shift","line-stacking-strategy","list-style","list-style-image","list-style-position","list-style-type","margin","margin-bottom","margin-left","margin-right","margin-top","marker-offset","marks","marquee-direction","marquee-loop","marquee-play-count","marquee-speed","marquee-style","max-height","max-width","min-height","min-width","move-to","nav-down","nav-index","nav-left","nav-right","nav-up","opacity","order","orphans","outline","outline-color","outline-offset","outline-style","outline-width","overflow","overflow-style","overflow-wrap","overflow-x","overflow-y","padding","padding-bottom","padding-left","padding-right","padding-top","page","page-break-after","page-break-before","page-break-inside","page-policy","pause","pause-after","pause-before","perspective","perspective-origin","pitch","pitch-range","play-during","position","presentation-level","punctuation-trim","quotes","region-break-after","region-break-before","region-break-inside","region-fragment","rendering-intent","resize","rest","rest-after","rest-before","richness","right","rotation","rotation-point","ruby-align","ruby-overhang","ruby-position","ruby-span","shape-inside","shape-outside","size","speak","speak-as","speak-header","speak-numeral","speak-punctuation","speech-rate","stress","string-set","tab-size","table-layout","target","target-name","target-new","target-position","text-align","text-align-last","text-decoration","text-decoration-color","text-decoration-line","text-decoration-skip","text-decoration-style","text-emphasis","text-emphasis-color","text-emphasis-position","text-emphasis-style","text-height","text-indent","text-justify","text-outline","text-overflow","text-shadow","text-size-adjust","text-space-collapse","text-transform","text-underline-position","text-wrap","top","transform","transform-origin","transform-style","transition","transition-delay","transition-duration","transition-property","transition-timing-function","unicode-bidi","vertical-align","visibility","voice-balance","voice-duration","voice-family","voice-pitch","voice-range","voice-rate","voice-stress","voice-volume","volume","white-space","widows","width","word-break","word-spacing","word-wrap","z-index","zoom","clip-path","clip-rule","mask","enable-background","filter","flood-color","flood-opacity","lighting-color","stop-color","stop-opacity","pointer-events","color-interpolation","color-interpolation-filters","color-profile","color-rendering","fill","fill-opacity","fill-rule","image-rendering","marker","marker-end","marker-mid","marker-start","shape-rendering","stroke","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width","text-rendering","baseline-shift","dominant-baseline","glyph-orientation-horizontal","glyph-orientation-vertical","kerning","text-anchor","writing-mode"]);var colorKeywords=keySet(["aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black","blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse","chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan","darkgoldenrod","darkgray","darkgreen","darkkhaki","darkmagenta","darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue","darkslategray","darkturquoise","darkviolet","deeppink","deepskyblue","dimgray","dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray","grey","green","greenyellow","honeydew","hotpink","indianred","indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgray","lightgreen","lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightsteelblue","lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine","mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue","mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin","navajowhite","navy","oldlace","olive","olivedrab","orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff","peru","pink","plum","powderblue","purple","red","rosybrown","royalblue","saddlebrown","salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue","slategray","snow","springgreen","steelblue","tan","teal","thistle","tomato","turquoise","violet","wheat","white","whitesmoke","yellow","yellowgreen"]);var valueKeywords=keySet(["above","absolute","activeborder","activecaption","afar","after-white-space","ahead","alias","all","all-scroll","alternate","always","amharic","amharic-abegede","antialiased","appworkspace","arabic-indic","armenian","asterisks","auto","avoid","avoid-column","avoid-page","avoid-region","background","backwards","baseline","below","bidi-override","binary","bengali","blink","block","block-axis","bold","bolder","border","border-box","both","bottom","break","break-all","break-word","button","button-bevel","buttonface","buttonhighlight","buttonshadow","buttontext","cambodian","capitalize","caps-lock-indicator","caption","captiontext","caret","cell","center","checkbox","circle","cjk-earthly-branch","cjk-heavenly-stem","cjk-ideographic","clear","clip","close-quote","col-resize","collapse","column","compact","condensed","contain","content","content-box","context-menu","continuous","copy","cover","crop","cross","crosshair","currentcolor","cursive","dashed","decimal","decimal-leading-zero","default","default-button","destination-atop","destination-in","destination-out","destination-over","devanagari","disc","discard","document","dot-dash","dot-dot-dash","dotted","double","down","e-resize","ease","ease-in","ease-in-out","ease-out","element","ellipse","ellipsis","embed","end","ethiopic","ethiopic-abegede","ethiopic-abegede-am-et","ethiopic-abegede-gez","ethiopic-abegede-ti-er","ethiopic-abegede-ti-et","ethiopic-halehame-aa-er","ethiopic-halehame-aa-et","ethiopic-halehame-am-et","ethiopic-halehame-gez","ethiopic-halehame-om-et","ethiopic-halehame-sid-et","ethiopic-halehame-so-et","ethiopic-halehame-ti-er","ethiopic-halehame-ti-et","ethiopic-halehame-tig","ew-resize","expanded","extra-condensed","extra-expanded","fantasy","fast","fill","fixed","flat","footnotes","forwards","from","geometricPrecision","georgian","graytext","groove","gujarati","gurmukhi","hand","hangul","hangul-consonant","hebrew","help","hidden","hide","higher","highlight","highlighttext","hiragana","hiragana-iroha","horizontal","hsl","hsla","icon","ignore","inactiveborder","inactivecaption","inactivecaptiontext","infinite","infobackground","infotext","inherit","initial","inline","inline-axis","inline-block","inline-table","inset","inside","intrinsic","invert","italic","justify","kannada","katakana","katakana-iroha","keep-all","khmer","landscape","lao","large","larger","left","level","lighter","line-through","linear","lines","list-item","listbox","listitem","local","logical","loud","lower","lower-alpha","lower-armenian","lower-greek","lower-hexadecimal","lower-latin","lower-norwegian","lower-roman","lowercase","ltr","malayalam","match","media-controls-background","media-current-time-display","media-fullscreen-button","media-mute-button","media-play-button","media-return-to-realtime-button","media-rewind-button","media-seek-back-button","media-seek-forward-button","media-slider","media-sliderthumb","media-time-remaining-display","media-volume-slider","media-volume-slider-container","media-volume-sliderthumb","medium","menu","menulist","menulist-button","menulist-text","menulist-textfield","menutext","message-box","middle","min-intrinsic","mix","mongolian","monospace","move","multiple","myanmar","n-resize","narrower","ne-resize","nesw-resize","no-close-quote","no-drop","no-open-quote","no-repeat","none","normal","not-allowed","nowrap","ns-resize","nw-resize","nwse-resize","oblique","octal","open-quote","optimizeLegibility","optimizeSpeed","oriya","oromo","outset","outside","outside-shape","overlay","overline","padding","padding-box","painted","page","paused","persian","plus-darker","plus-lighter","pointer","polygon","portrait","pre","pre-line","pre-wrap","preserve-3d","progress","push-button","radio","read-only","read-write","read-write-plaintext-only","rectangle","region","relative","repeat","repeat-x","repeat-y","reset","reverse","rgb","rgba","ridge","right","round","row-resize","rtl","run-in","running","s-resize","sans-serif","scroll","scrollbar","se-resize","searchfield","searchfield-cancel-button","searchfield-decoration","searchfield-results-button","searchfield-results-decoration","semi-condensed","semi-expanded","separate","serif","show","sidama","single","skip-white-space","slide","slider-horizontal","slider-vertical","sliderthumb-horizontal","sliderthumb-vertical","slow","small","small-caps","small-caption","smaller","solid","somali","source-atop","source-in","source-out","source-over","space","square","square-button","start","static","status-bar","stretch","stroke","sub","subpixel-antialiased","super","sw-resize","table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row","table-row-group","telugu","text","text-bottom","text-top","textarea","textfield","thai","thick","thin","threeddarkshadow","threedface","threedhighlight","threedlightshadow","threedshadow","tibetan","tigre","tigrinya-er","tigrinya-er-abegede","tigrinya-et","tigrinya-et-abegede","to","top","transparent","ultra-condensed","ultra-expanded","underline","up","upper-alpha","upper-armenian","upper-greek","upper-hexadecimal","upper-latin","upper-norwegian","upper-roman","uppercase","urdu","url","vertical","vertical-text","visible","visibleFill","visiblePainted","visibleStroke","visual","w-resize","wait","wave","wider","window","windowframe","windowtext","x-large","x-small","xor","xx-large","xx-small"]);function tokenCComment(stream,state){var maybeEnd=false,ch;while((ch=stream.next())!=null){if(maybeEnd&&ch=="/"){state.tokenize=null;break;}
maybeEnd=(ch=="*");}
return["comment","comment"];}
CodeMirror.defineMIME("text/css",{atMediaTypes:atMediaTypes,atMediaFeatures:atMediaFeatures,propertyKeywords:propertyKeywords,colorKeywords:colorKeywords,valueKeywords:valueKeywords,hooks:{"<":function(stream,state){function tokenSGMLComment(stream,state){var dashes=0,ch;while((ch=stream.next())!=null){if(dashes>=2&&ch==">"){state.tokenize=null;break;}
dashes=(ch=="-")?dashes+1:0;}
return["comment","comment"];}
if(stream.eat("!")){state.tokenize=tokenSGMLComment;return tokenSGMLComment(stream,state);}},"/":function(stream,state){if(stream.eat("*")){state.tokenize=tokenCComment;return tokenCComment(stream,state);}
return false;}},name:"css"});CodeMirror.defineMIME("text/x-scss",{atMediaTypes:atMediaTypes,atMediaFeatures:atMediaFeatures,propertyKeywords:propertyKeywords,colorKeywords:colorKeywords,valueKeywords:valueKeywords,allowNested:true,hooks:{":":function(stream){if(stream.match(/\s*{/)){return[null,"{"];}
return false;},"$":function(stream){stream.match(/^[\w-]+/);if(stream.peek()==":"){return["variable","variable-definition"];}
return["variable","variable"];},",":function(stream,state){if(state.stack[state.stack.length-1]=="propertyValue"&&stream.match(/^ *\$/,false)){return["operator",";"];}},"/":function(stream,state){if(stream.eat("/")){stream.skipToEnd();return["comment","comment"];}else if(stream.eat("*")){state.tokenize=tokenCComment;return tokenCComment(stream,state);}else{return["operator","operator"];}},"#":function(stream){if(stream.eat("{")){return["operator","interpolation"];}else{stream.eatWhile(/[\w\\\-]/);return["atom","hash"];}}},name:"css"});})();;CodeMirror.defineMode("javascript",function(config,parserConfig){var indentUnit=config.indentUnit;var statementIndent=parserConfig.statementIndent;var jsonMode=parserConfig.json;var isTS=parserConfig.typescript;var keywords=function(){function kw(type){return{type:type,style:"keyword"};}
var A=kw("keyword a"),B=kw("keyword b"),C=kw("keyword c");var operator=kw("operator"),atom={type:"atom",style:"atom"};var jsKeywords={"if":kw("if"),"while":A,"with":A,"else":B,"do":B,"try":B,"finally":B,"return":C,"break":C,"continue":C,"new":C,"delete":C,"throw":C,"var":kw("var"),"const":kw("var"),"let":kw("var"),"function":kw("function"),"catch":kw("catch"),"for":kw("for"),"switch":kw("switch"),"case":kw("case"),"default":kw("default"),"in":operator,"typeof":operator,"instanceof":operator,"true":atom,"false":atom,"null":atom,"undefined":atom,"NaN":atom,"Infinity":atom,"this":kw("this"),"module":kw("module"),"class":kw("class"),"super":kw("atom"),"yield":C,"export":kw("export"),"import":kw("import"),"extends":C};if(isTS){var type={type:"variable",style:"variable-3"};var tsKeywords={"interface":kw("interface"),"extends":kw("extends"),"constructor":kw("constructor"),"public":kw("public"),"private":kw("private"),"protected":kw("protected"),"static":kw("static"),"string":type,"number":type,"bool":type,"any":type};for(var attr in tsKeywords){jsKeywords[attr]=tsKeywords[attr];}}
return jsKeywords;}();var isOperatorChar=/[+\-*&%=<>!?|~^]/;function nextUntilUnescaped(stream,end){var escaped=false,next;while((next=stream.next())!=null){if(next==end&&!escaped)
return false;escaped=!escaped&&next=="\\";}
return escaped;}
var type,content;function ret(tp,style,cont){type=tp;content=cont;return style;}
function tokenBase(stream,state){var ch=stream.next();if(ch=='"'||ch=="'"){state.tokenize=tokenString(ch);return state.tokenize(stream,state);}else if(ch=="."&&stream.match(/^\d+(?:[eE][+\-]?\d+)?/)){return ret("number","number");}else if(ch=="."&&stream.match("..")){return ret("spread","meta");}else if(/[\[\]{}\(\),;\:\.]/.test(ch)){return ret(ch);}else if(ch=="="&&stream.eat(">")){return ret("=>");}else if(ch=="0"&&stream.eat(/x/i)){stream.eatWhile(/[\da-f]/i);return ret("number","number");}else if(/\d/.test(ch)){stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);return ret("number","number");}else if(ch=="/"){if(stream.eat("*")){state.tokenize=tokenComment;return tokenComment(stream,state);}else if(stream.eat("/")){stream.skipToEnd();return ret("comment","comment");}else if(state.lastType=="operator"||state.lastType=="keyword c"||state.lastType=="sof"||/^[\[{}\(,;:]$/.test(state.lastType)){nextUntilUnescaped(stream,"/");stream.eatWhile(/[gimy]/);return ret("regexp","string-2");}else{stream.eatWhile(isOperatorChar);return ret("operator",null,stream.current());}}else if(ch=="`"){state.tokenize=tokenQuasi;return tokenQuasi(stream,state);}else if(ch=="#"){stream.skipToEnd();return ret("error","error");}else if(isOperatorChar.test(ch)){stream.eatWhile(isOperatorChar);return ret("operator",null,stream.current());}else{stream.eatWhile(/[\w\$_]/);var word=stream.current(),known=keywords.propertyIsEnumerable(word)&&keywords[word];return(known&&state.lastType!=".")?ret(known.type,known.style,word):ret("variable","variable",word);}}
function tokenString(quote){return function(stream,state){if(!nextUntilUnescaped(stream,quote))
state.tokenize=tokenBase;return ret("string","string");};}
function tokenComment(stream,state){var maybeEnd=false,ch;while(ch=stream.next()){if(ch=="/"&&maybeEnd){state.tokenize=tokenBase;break;}
maybeEnd=(ch=="*");}
return ret("comment","comment");}
function tokenQuasi(stream,state){var escaped=false,next;while((next=stream.next())!=null){if(!escaped&&(next=="`"||next=="$"&&stream.eat("{"))){state.tokenize=tokenBase;break;}
escaped=!escaped&&next=="\\";}
return ret("quasi","string-2",stream.current());}
var brackets="([{}])";function findFatArrow(stream,state){if(state.fatArrowAt)state.fatArrowAt=null;var arrow=stream.string.indexOf("=>",stream.start);if(arrow<0)return;var depth=0,sawSomething=false;for(var pos=arrow-1;pos>=0;--pos){var ch=stream.string.charAt(pos);var bracket=brackets.indexOf(ch);if(bracket>=0&&bracket<3){if(!depth){++pos;break;}
if(--depth==0)break;}else if(bracket>=3&&bracket<6){++depth;}else if(/[$\w]/.test(ch)){sawSomething=true;}else if(sawSomething&&!depth){++pos;break;}}
if(sawSomething&&!depth)state.fatArrowAt=pos;}
var atomicTypes={"atom":true,"number":true,"variable":true,"string":true,"regexp":true,"this":true};function JSLexical(indented,column,type,align,prev,info){this.indented=indented;this.column=column;this.type=type;this.prev=prev;this.info=info;if(align!=null)this.align=align;}
function inScope(state,varname){for(var v=state.localVars;v;v=v.next)
if(v.name==varname)return true;for(var cx=state.context;cx;cx=cx.prev){for(var v=cx.vars;v;v=v.next)
if(v.name==varname)return true;}}
function parseJS(state,style,type,content,stream){var cc=state.cc;cx.state=state;cx.stream=stream;cx.marked=null,cx.cc=cc;if(!state.lexical.hasOwnProperty("align"))
state.lexical.align=true;while(true){var combinator=cc.length?cc.pop():jsonMode?expression:statement;if(combinator(type,content)){while(cc.length&&cc[cc.length-1].lex)
cc.pop()();if(cx.marked)return cx.marked;if(type=="variable"&&inScope(state,content))return"variable-2";return style;}}}
var cx={state:null,column:null,marked:null,cc:null};function pass(){for(var i=arguments.length-1;i>=0;i--)cx.cc.push(arguments[i]);}
function cont(){pass.apply(null,arguments);return true;}
function register(varname){function inList(list){for(var v=list;v;v=v.next)
if(v.name==varname)return true;return false;}
var state=cx.state;if(state.context){cx.marked="def";if(inList(state.localVars))return;state.localVars={name:varname,next:state.localVars};}else{if(inList(state.globalVars))return;if(parserConfig.globalVars)
state.globalVars={name:varname,next:state.globalVars};}}
var defaultVars={name:"this",next:{name:"arguments"}};function pushcontext(){cx.state.context={prev:cx.state.context,vars:cx.state.localVars};cx.state.localVars=defaultVars;}
function popcontext(){cx.state.localVars=cx.state.context.vars;cx.state.context=cx.state.context.prev;}
function pushlex(type,info){var result=function(){var state=cx.state,indent=state.indented;if(state.lexical.type=="stat")indent=state.lexical.indented;state.lexical=new JSLexical(indent,cx.stream.column(),type,null,state.lexical,info);};result.lex=true;return result;}
function poplex(){var state=cx.state;if(state.lexical.prev){if(state.lexical.type==")")
state.indented=state.lexical.indented;state.lexical=state.lexical.prev;}}
poplex.lex=true;function expect(wanted){return function(type){if(type==wanted)return cont();else if(wanted==";")return pass();else return cont(arguments.callee);};}
function statement(type,value){if(type=="var")return cont(pushlex("vardef",value.length),vardef,expect(";"),poplex);if(type=="keyword a")return cont(pushlex("form"),expression,statement,poplex);if(type=="keyword b")return cont(pushlex("form"),statement,poplex);if(type=="{")return cont(pushlex("}"),block,poplex);if(type==";")return cont();if(type=="if")return cont(pushlex("form"),expression,statement,poplex,maybeelse);if(type=="function")return cont(functiondef);if(type=="for")return cont(pushlex("form"),forspec,poplex,statement,poplex);if(type=="variable")return cont(pushlex("stat"),maybelabel);if(type=="switch")return cont(pushlex("form"),expression,pushlex("}","switch"),expect("{"),block,poplex,poplex);if(type=="case")return cont(expression,expect(":"));if(type=="default")return cont(expect(":"));if(type=="catch")return cont(pushlex("form"),pushcontext,expect("("),funarg,expect(")"),statement,poplex,popcontext);if(type=="module")return cont(pushlex("form"),pushcontext,afterModule,popcontext,poplex);if(type=="class")return cont(pushlex("form"),className,objlit,poplex);if(type=="export")return cont(pushlex("form"),afterExport,poplex);if(type=="import")return cont(pushlex("form"),afterImport,poplex);return pass(pushlex("stat"),expression,expect(";"),poplex);}
function expression(type){return expressionInner(type,false);}
function expressionNoComma(type){return expressionInner(type,true);}
function expressionInner(type,noComma){if(cx.state.fatArrowAt==cx.stream.start){var body=noComma?arrowBodyNoComma:arrowBody;if(type=="(")return cont(pushcontext,commasep(pattern,")"),expect("=>"),body,popcontext);else if(type=="variable")return pass(pushcontext,pattern,expect("=>"),body,popcontext);}
var maybeop=noComma?maybeoperatorNoComma:maybeoperatorComma;if(atomicTypes.hasOwnProperty(type))return cont(maybeop);if(type=="function")return cont(functiondef);if(type=="keyword c")return cont(noComma?maybeexpressionNoComma:maybeexpression);if(type=="(")return cont(pushlex(")"),maybeexpression,comprehension,expect(")"),poplex,maybeop);if(type=="operator"||type=="spread")return cont(noComma?expressionNoComma:expression);if(type=="[")return cont(pushlex("]"),expressionNoComma,maybeArrayComprehension,poplex,maybeop);if(type=="{")return cont(commasep(objprop,"}"),maybeop);return cont();}
function maybeexpression(type){if(type.match(/[;\}\)\],]/))return pass();return pass(expression);}
function maybeexpressionNoComma(type){if(type.match(/[;\}\)\],]/))return pass();return pass(expressionNoComma);}
function maybeoperatorComma(type,value){if(type==",")return cont(expression);return maybeoperatorNoComma(type,value,false);}
function maybeoperatorNoComma(type,value,noComma){var me=noComma==false?maybeoperatorComma:maybeoperatorNoComma;var expr=noComma==false?expression:expressionNoComma;if(value=="=>")return cont(pushcontext,noComma?arrowBodyNoComma:arrowBody,popcontext);if(type=="operator"){if(/\+\+|--/.test(value))return cont(me);if(value=="?")return cont(expression,expect(":"),expr);return cont(expr);}
if(type=="quasi"){cx.cc.push(me);return quasi(value);}
if(type==";")return;if(type=="(")return cont(commasep(expressionNoComma,")","call"),me);if(type==".")return cont(property,me);if(type=="[")return cont(pushlex("]"),maybeexpression,expect("]"),poplex,me);}
function quasi(value){if(!value)debugger;if(value.slice(value.length-2)!="${")return cont();return cont(expression,continueQuasi);}
function continueQuasi(type){if(type=="}"){cx.marked="string-2";cx.state.tokenize=tokenQuasi;return cont();}}
function arrowBody(type){findFatArrow(cx.stream,cx.state);if(type=="{")return pass(statement);return pass(expression);}
function arrowBodyNoComma(type){findFatArrow(cx.stream,cx.state);if(type=="{")return pass(statement);return pass(expressionNoComma);}
function maybelabel(type){if(type==":")return cont(poplex,statement);return pass(maybeoperatorComma,expect(";"),poplex);}
function property(type){if(type=="variable"){cx.marked="property";return cont();}}
function objprop(type,value){if(type=="variable"){cx.marked="property";if(value=="get"||value=="set")return cont(getterSetter);}else if(type=="number"||type=="string"){cx.marked=type+" property";}else if(type=="["){return cont(expression,expect("]"),afterprop);}
if(atomicTypes.hasOwnProperty(type))return cont(afterprop);}
function getterSetter(type){if(type!="variable")return pass(afterprop);cx.marked="property";return cont(functiondef);}
function afterprop(type){if(type==":")return cont(expressionNoComma);if(type=="(")return pass(functiondef);}
function commasep(what,end,info){function proceed(type){if(type==","){var lex=cx.state.lexical;if(lex.info=="call")lex.pos=(lex.pos||0)+1;return cont(what,proceed);}
if(type==end)return cont();return cont(expect(end));}
return function(type){if(type==end)return cont();if(info===false)return pass(what,proceed);return pass(pushlex(end,info),what,proceed,poplex);};}
function block(type){if(type=="}")return cont();return pass(statement,block);}
function maybetype(type){if(isTS&&type==":")return cont(typedef);}
function typedef(type){if(type=="variable"){cx.marked="variable-3";return cont();}}
function vardef(){return pass(pattern,maybetype,maybeAssign,vardefCont);}
function pattern(type,value){if(type=="variable"){register(value);return cont();}
if(type=="[")return cont(commasep(pattern,"]"));if(type=="{")return cont(commasep(proppattern,"}"));}
function proppattern(type,value){if(type=="variable"&&!cx.stream.match(/^\s*:/,false)){register(value);return cont(maybeAssign);}
if(type=="variable")cx.marked="property";return cont(expect(":"),pattern,maybeAssign);}
function maybeAssign(_type,value){if(value=="=")return cont(expressionNoComma);}
function vardefCont(type){if(type==",")return cont(vardef);}
function maybeelse(type,value){if(type=="keyword b"&&value=="else")return cont(pushlex("form"),statement,poplex);}
function forspec(type){if(type=="(")return cont(pushlex(")"),forspec1,expect(")"));}
function forspec1(type){if(type=="var")return cont(vardef,expect(";"),forspec2);if(type==";")return cont(forspec2);if(type=="variable")return cont(formaybeinof);return pass(expression,expect(";"),forspec2);}
function formaybeinof(_type,value){if(value=="in"||value=="of"){cx.marked="keyword";return cont(expression);}
return cont(maybeoperatorComma,forspec2);}
function forspec2(type,value){if(type==";")return cont(forspec3);if(value=="in"||value=="of"){cx.marked="keyword";return cont(expression);}
return pass(expression,expect(";"),forspec3);}
function forspec3(type){if(type!=")")cont(expression);}
function functiondef(type,value){if(value=="*"){cx.marked="keyword";return cont(functiondef);}
if(type=="variable"){register(value);return cont(functiondef);}
if(type=="(")return cont(pushcontext,commasep(funarg,")"),statement,popcontext);}
function funarg(type){if(type=="spread")return cont(funarg);return pass(pattern,maybetype);}
function className(type,value){if(type=="variable"){register(value);return cont(classNameAfter);}}
function classNameAfter(_type,value){if(value=="extends")return cont(expression);}
function objlit(type){if(type=="{")return cont(commasep(objprop,"}"));}
function afterModule(type,value){if(type=="string")return cont(statement);if(type=="variable"){register(value);return cont(maybeFrom);}}
function afterExport(_type,value){if(value=="*"){cx.marked="keyword";return cont(maybeFrom,expect(";"));}
if(value=="default"){cx.marked="keyword";return cont(expression,expect(";"));}
return pass(statement);}
function afterImport(type){if(type=="string")return cont();return pass(importSpec,maybeFrom);}
function importSpec(type,value){if(type=="{")return cont(commasep(importSpec,"}"));if(type=="variable")register(value);return cont();}
function maybeFrom(_type,value){if(value=="from"){cx.marked="keyword";return cont(expression);}}
function maybeArrayComprehension(type){if(type=="for")return pass(comprehension);if(type==",")return cont(commasep(expressionNoComma,"]",false));return pass(commasep(expressionNoComma,"]",false));}
function comprehension(type){if(type=="for")return cont(forspec,comprehension);if(type=="if")return cont(expression,comprehension);}
return{startState:function(basecolumn){var state={tokenize:tokenBase,lastType:"sof",cc:[],lexical:new JSLexical((basecolumn||0)-indentUnit,0,"block",false),localVars:parserConfig.localVars,context:parserConfig.localVars&&{vars:parserConfig.localVars},indented:0};if(parserConfig.globalVars)state.globalVars=parserConfig.globalVars;return state;},token:function(stream,state){if(stream.sol()){if(!state.lexical.hasOwnProperty("align"))
state.lexical.align=false;state.indented=stream.indentation();findFatArrow(stream,state);}
if(state.tokenize!=tokenComment&&stream.eatSpace())return null;var style=state.tokenize(stream,state);if(type=="comment")return style;state.lastType=type=="operator"&&(content=="++"||content=="--")?"incdec":type;return parseJS(state,style,type,content,stream);},indent:function(state,textAfter){if(state.tokenize==tokenComment)return CodeMirror.Pass;if(state.tokenize!=tokenBase)return 0;var firstChar=textAfter&&textAfter.charAt(0),lexical=state.lexical;for(var i=state.cc.length-1;i>=0;--i){var c=state.cc[i];if(c==poplex)lexical=lexical.prev;else if(c!=maybeelse)break;}
if(lexical.type=="stat"&&firstChar=="}")lexical=lexical.prev;if(statementIndent&&lexical.type==")"&&lexical.prev.type=="stat")
lexical=lexical.prev;var type=lexical.type,closing=firstChar==type;if(type=="vardef")return lexical.indented+(state.lastType=="operator"||state.lastType==","?lexical.info+1:0);else if(type=="form"&&firstChar=="{")return lexical.indented;else if(type=="form")return lexical.indented+indentUnit;else if(type=="stat")
return lexical.indented+(state.lastType=="operator"||state.lastType==","?statementIndent||indentUnit:0);else if(lexical.info=="switch"&&!closing&&parserConfig.doubleIndentSwitch!=false)
return lexical.indented+(/^(?:case|default)\b/.test(textAfter)?indentUnit:2*indentUnit);else if(lexical.align)return lexical.column+(closing?0:1);else return lexical.indented+(closing?0:indentUnit);},electricChars:":{}",blockCommentStart:jsonMode?null:"/*",blockCommentEnd:jsonMode?null:"*/",lineComment:jsonMode?null:"//",fold:"brace",helperType:jsonMode?"json":"javascript",jsonMode:jsonMode};});CodeMirror.defineMIME("text/javascript","javascript");CodeMirror.defineMIME("text/ecmascript","javascript");CodeMirror.defineMIME("application/javascript","javascript");CodeMirror.defineMIME("application/ecmascript","javascript");CodeMirror.defineMIME("application/json",{name:"javascript",json:true});CodeMirror.defineMIME("application/x-json",{name:"javascript",json:true});CodeMirror.defineMIME("text/typescript",{name:"javascript",typescript:true});CodeMirror.defineMIME("application/typescript",{name:"javascript",typescript:true});;CodeMirror.defineMode("xml",function(config,parserConfig){var indentUnit=config.indentUnit;var multilineTagIndentFactor=parserConfig.multilineTagIndentFactor||1;var multilineTagIndentPastTag=parserConfig.multilineTagIndentPastTag||true;var Kludges=parserConfig.htmlMode?{autoSelfClosers:{'area':true,'base':true,'br':true,'col':true,'command':true,'embed':true,'frame':true,'hr':true,'img':true,'input':true,'keygen':true,'link':true,'meta':true,'param':true,'source':true,'track':true,'wbr':true},implicitlyClosed:{'dd':true,'li':true,'optgroup':true,'option':true,'p':true,'rp':true,'rt':true,'tbody':true,'td':true,'tfoot':true,'th':true,'tr':true},contextGrabbers:{'dd':{'dd':true,'dt':true},'dt':{'dd':true,'dt':true},'li':{'li':true},'option':{'option':true,'optgroup':true},'optgroup':{'optgroup':true},'p':{'address':true,'article':true,'aside':true,'blockquote':true,'dir':true,'div':true,'dl':true,'fieldset':true,'footer':true,'form':true,'h1':true,'h2':true,'h3':true,'h4':true,'h5':true,'h6':true,'header':true,'hgroup':true,'hr':true,'menu':true,'nav':true,'ol':true,'p':true,'pre':true,'section':true,'table':true,'ul':true},'rp':{'rp':true,'rt':true},'rt':{'rp':true,'rt':true},'tbody':{'tbody':true,'tfoot':true},'td':{'td':true,'th':true},'tfoot':{'tbody':true},'th':{'td':true,'th':true},'thead':{'tbody':true,'tfoot':true},'tr':{'tr':true}},doNotIndent:{"pre":true},allowUnquoted:true,allowMissing:true}:{autoSelfClosers:{},implicitlyClosed:{},contextGrabbers:{},doNotIndent:{},allowUnquoted:false,allowMissing:false};var alignCDATA=parserConfig.alignCDATA;var tagName,type;function inText(stream,state){function chain(parser){state.tokenize=parser;return parser(stream,state);}
var ch=stream.next();if(ch=="<"){if(stream.eat("!")){if(stream.eat("[")){if(stream.match("CDATA["))return chain(inBlock("atom","]]>"));else return null;}else if(stream.match("--")){return chain(inBlock("comment","-->"));}else if(stream.match("DOCTYPE",true,true)){stream.eatWhile(/[\w\._\-]/);return chain(doctype(1));}else{return null;}}else if(stream.eat("?")){stream.eatWhile(/[\w\._\-]/);state.tokenize=inBlock("meta","?>");return"meta";}else{var isClose=stream.eat("/");tagName="";var c;while((c=stream.eat(/[^\s\u00a0=<>\"\'\/?]/)))tagName+=c;if(!tagName)return"tag error";type=isClose?"closeTag":"openTag";state.tokenize=inTag;return"tag";}}else if(ch=="&"){var ok;if(stream.eat("#")){if(stream.eat("x")){ok=stream.eatWhile(/[a-fA-F\d]/)&&stream.eat(";");}else{ok=stream.eatWhile(/[\d]/)&&stream.eat(";");}}else{ok=stream.eatWhile(/[\w\.\-:]/)&&stream.eat(";");}
return ok?"atom":"error";}else{stream.eatWhile(/[^&<]/);return null;}}
function inTag(stream,state){var ch=stream.next();if(ch==">"||(ch=="/"&&stream.eat(">"))){state.tokenize=inText;type=ch==">"?"endTag":"selfcloseTag";return"tag";}else if(ch=="="){type="equals";return null;}else if(ch=="<"){state.tokenize=inText;var next=state.tokenize(stream,state);return next?next+" error":"error";}else if(/[\'\"]/.test(ch)){state.tokenize=inAttribute(ch);state.stringStartCol=stream.column();return state.tokenize(stream,state);}else{stream.eatWhile(/[^\s\u00a0=<>\"\']/);return"word";}}
function inAttribute(quote){var closure=function(stream,state){while(!stream.eol()){if(stream.next()==quote){state.tokenize=inTag;break;}}
return"string";};closure.isInAttribute=true;return closure;}
function inBlock(style,terminator){return function(stream,state){while(!stream.eol()){if(stream.match(terminator)){state.tokenize=inText;break;}
stream.next();}
return style;};}
function doctype(depth){return function(stream,state){var ch;while((ch=stream.next())!=null){if(ch=="<"){state.tokenize=doctype(depth+1);return state.tokenize(stream,state);}else if(ch==">"){if(depth==1){state.tokenize=inText;break;}else{state.tokenize=doctype(depth-1);return state.tokenize(stream,state);}}}
return"meta";};}
var curState,curStream,setStyle;function pass(){for(var i=arguments.length-1;i>=0;i--)curState.cc.push(arguments[i]);}
function cont(){pass.apply(null,arguments);return true;}
function pushContext(tagName,startOfLine){var noIndent=Kludges.doNotIndent.hasOwnProperty(tagName)||(curState.context&&curState.context.noIndent);curState.context={prev:curState.context,tagName:tagName,indent:curState.indented,startOfLine:startOfLine,noIndent:noIndent};}
function popContext(){if(curState.context)curState.context=curState.context.prev;}
function element(type){if(type=="openTag"){curState.tagName=tagName;curState.tagStart=curStream.column();return cont(attributes,endtag(curState.startOfLine));}else if(type=="closeTag"){var err=false;if(curState.context){if(curState.context.tagName!=tagName){if(Kludges.implicitlyClosed.hasOwnProperty(curState.context.tagName.toLowerCase())){popContext();}
err=!curState.context||curState.context.tagName!=tagName;}}else{err=true;}
if(err)setStyle="error";return cont(endclosetag(err));}
return cont();}
function endtag(startOfLine){return function(type){var tagName=curState.tagName;curState.tagName=curState.tagStart=null;if(type=="selfcloseTag"||(type=="endTag"&&Kludges.autoSelfClosers.hasOwnProperty(tagName.toLowerCase()))){maybePopContext(tagName.toLowerCase());return cont();}
if(type=="endTag"){maybePopContext(tagName.toLowerCase());pushContext(tagName,startOfLine);return cont();}
return cont();};}
function endclosetag(err){return function(type){if(err)setStyle="error";if(type=="endTag"){popContext();return cont();}
setStyle="error";return cont(arguments.callee);};}
function maybePopContext(nextTagName){var parentTagName;while(true){if(!curState.context){return;}
parentTagName=curState.context.tagName.toLowerCase();if(!Kludges.contextGrabbers.hasOwnProperty(parentTagName)||!Kludges.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)){return;}
popContext();}}
function attributes(type){if(type=="word"){setStyle="attribute";return cont(attribute,attributes);}
if(type=="endTag"||type=="selfcloseTag")return pass();setStyle="error";return cont(attributes);}
function attribute(type){if(type=="equals")return cont(attvalue,attributes);if(!Kludges.allowMissing)setStyle="error";else if(type=="word"){setStyle="attribute";return cont(attribute,attributes);}
return(type=="endTag"||type=="selfcloseTag")?pass():cont();}
function attvalue(type){if(type=="string")return cont(attvaluemaybe);if(type=="word"&&Kludges.allowUnquoted){setStyle="string";return cont();}
setStyle="error";return(type=="endTag"||type=="selfCloseTag")?pass():cont();}
function attvaluemaybe(type){if(type=="string")return cont(attvaluemaybe);else return pass();}
return{startState:function(){return{tokenize:inText,cc:[],indented:0,startOfLine:true,tagName:null,tagStart:null,context:null};},token:function(stream,state){if(!state.tagName&&stream.sol()){state.startOfLine=true;state.indented=stream.indentation();}
if(stream.eatSpace())return null;setStyle=type=tagName=null;var style=state.tokenize(stream,state);state.type=type;if((style||type)&&style!="comment"){curState=state;curStream=stream;while(true){var comb=state.cc.pop()||element;if(comb(type||style))break;}}
state.startOfLine=false;if(setStyle)
style=setStyle=="error"?style+" error":setStyle;return style;},indent:function(state,textAfter,fullLine){var context=state.context;if(state.tokenize.isInAttribute){return state.stringStartCol+1;}
if((state.tokenize!=inTag&&state.tokenize!=inText)||context&&context.noIndent)
return fullLine?fullLine.match(/^(\s*)/)[0].length:0;if(state.tagName){if(multilineTagIndentPastTag)
return state.tagStart+state.tagName.length+2;else
return state.tagStart+indentUnit*multilineTagIndentFactor;}
if(alignCDATA&&/<!\[CDATA\[/.test(textAfter))return 0;if(context&&/^<\//.test(textAfter))
context=context.prev;while(context&&!context.startOfLine)
context=context.prev;if(context)return context.indent+indentUnit;else return 0;},electricChars:"/",blockCommentStart:"<!--",blockCommentEnd:"-->",configuration:parserConfig.htmlMode?"html":"xml",helperType:parserConfig.htmlMode?"html":"xml"};});CodeMirror.defineMIME("text/xml","xml");CodeMirror.defineMIME("application/xml","xml");if(!CodeMirror.mimeModes.hasOwnProperty("text/html"))
CodeMirror.defineMIME("text/html",{name:"xml",htmlMode:true});;CodeMirror.defineMode("htmlmixed",function(config,parserConfig){var htmlMode=CodeMirror.getMode(config,{name:"xml",htmlMode:true});var cssMode=CodeMirror.getMode(config,"css");var scriptTypes=[],scriptTypesConf=parserConfig&&parserConfig.scriptTypes;scriptTypes.push({matches:/^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^$/i,mode:CodeMirror.getMode(config,"javascript")});if(scriptTypesConf)for(var i=0;i<scriptTypesConf.length;++i){var conf=scriptTypesConf[i];scriptTypes.push({matches:conf.matches,mode:conf.mode&&CodeMirror.getMode(config,conf.mode)});}
scriptTypes.push({matches:/./,mode:CodeMirror.getMode(config,"text/plain")});function html(stream,state){var tagName=state.htmlState.tagName;var style=htmlMode.token(stream,state.htmlState);if(tagName=="script"&&/\btag\b/.test(style)&&stream.current()==">"){var scriptType=stream.string.slice(Math.max(0,stream.pos-100),stream.pos).match(/\btype\s*=\s*("[^"]+"|'[^']+'|\S+)[^<]*$/i);scriptType=scriptType?scriptType[1]:"";if(scriptType&&/[\"\']/.test(scriptType.charAt(0)))scriptType=scriptType.slice(1,scriptType.length-1);for(var i=0;i<scriptTypes.length;++i){var tp=scriptTypes[i];if(typeof tp.matches=="string"?scriptType==tp.matches:tp.matches.test(scriptType)){if(tp.mode){state.token=script;state.localMode=tp.mode;state.localState=tp.mode.startState&&tp.mode.startState(htmlMode.indent(state.htmlState,""));}
break;}}}else if(tagName=="style"&&/\btag\b/.test(style)&&stream.current()==">"){state.token=css;state.localMode=cssMode;state.localState=cssMode.startState(htmlMode.indent(state.htmlState,""));}
return style;}
function maybeBackup(stream,pat,style){var cur=stream.current();var close=cur.search(pat),m;if(close>-1)stream.backUp(cur.length-close);else if(m=cur.match(/<\/?$/)){stream.backUp(cur.length);if(!stream.match(pat,false))stream.match(cur);}
return style;}
function script(stream,state){if(stream.match(/^<\/\s*script\s*>/i,false)){state.token=html;state.localState=state.localMode=null;return html(stream,state);}
return maybeBackup(stream,/<\/\s*script\s*>/,state.localMode.token(stream,state.localState));}
function css(stream,state){if(stream.match(/^<\/\s*style\s*>/i,false)){state.token=html;state.localState=state.localMode=null;return html(stream,state);}
return maybeBackup(stream,/<\/\s*style\s*>/,cssMode.token(stream,state.localState));}
return{startState:function(){var state=htmlMode.startState();return{token:html,localMode:null,localState:null,htmlState:state};},copyState:function(state){if(state.localState)
var local=CodeMirror.copyState(state.localMode,state.localState);return{token:state.token,localMode:state.localMode,localState:local,htmlState:CodeMirror.copyState(htmlMode,state.htmlState)};},token:function(stream,state){return state.token(stream,state);},indent:function(state,textAfter){if(!state.localMode||/^\s*<\//.test(textAfter))
return htmlMode.indent(state.htmlState,textAfter);else if(state.localMode.indent)
return state.localMode.indent(state.localState,textAfter);else
return CodeMirror.Pass;},electricChars:"/{}:",innerMode:function(state){return{state:state.localState||state.htmlState,mode:state.localMode||htmlMode};}};},"xml","javascript","css");CodeMirror.defineMIME("text/html","htmlmixed");;(function(mod){if(typeof exports=="object"&&typeof module=="object")
mod(require("../../lib/codemirror"));else if(typeof define=="function"&&define.amd)
define(["../../lib/codemirror"],mod);else
mod(CodeMirror);})(function(CodeMirror){var ie_lt8=/MSIE \d/.test(navigator.userAgent)&&(document.documentMode==null||document.documentMode<8);var Pos=CodeMirror.Pos;var matching={"(":")>",")":"(<","[":"]>","]":"[<","{":"}>","}":"{<"};function findMatchingBracket(cm,where,strict,config){var line=cm.getLineHandle(where.line),pos=where.ch-1;var match=(pos>=0&&matching[line.text.charAt(pos)])||matching[line.text.charAt(++pos)];if(!match)return null;var dir=match.charAt(1)==">"?1:-1;if(strict&&(dir>0)!=(pos==where.ch))return null;var style=cm.getTokenTypeAt(Pos(where.line,pos+1));var found=scanForBracket(cm,Pos(where.line,pos+(dir>0?1:0)),dir,style||null,config);return{from:Pos(where.line,pos),to:found&&found.pos,match:found&&found.ch==match.charAt(0),forward:dir>0};}
function scanForBracket(cm,where,dir,style,config){var maxScanLen=(config&&config.maxScanLineLength)||10000;var maxScanLines=(config&&config.maxScanLines)||500;var stack=[];var re=config&&config.bracketRegex?config.bracketRegex:/[(){}[\]]/;var lineEnd=dir>0?Math.min(where.line+maxScanLines,cm.lastLine()+1):Math.max(cm.firstLine()-1,where.line-maxScanLines);for(var lineNo=where.line;lineNo!=lineEnd;lineNo+=dir){var line=cm.getLine(lineNo);if(!line)continue;var pos=dir>0?0:line.length-1,end=dir>0?line.length:-1;if(line.length>maxScanLen)continue;if(lineNo==where.line)pos=where.ch-(dir<0?1:0);for(;pos!=end;pos+=dir){var ch=line.charAt(pos);if(re.test(ch)&&(style===undefined||cm.getTokenTypeAt(Pos(lineNo,pos+1))==style)){var match=matching[ch];if((match.charAt(1)==">")==(dir>0))stack.push(ch);else if(!stack.length)return{pos:Pos(lineNo,pos),ch:ch};else stack.pop();}}}}
function matchBrackets(cm,autoclear,config){var maxHighlightLen=cm.state.matchBrackets.maxHighlightLineLength||1000;var marks=[],ranges=cm.listSelections();for(var i=0;i<ranges.length;i++){var match=ranges[i].empty()&&findMatchingBracket(cm,ranges[i].head,false,config);if(match&&cm.getLine(match.from.line).length<=maxHighlightLen&&match.to&&cm.getLine(match.to.line).length<=maxHighlightLen){var style=match.match?"CodeMirror-matchingbracket":"CodeMirror-nonmatchingbracket";marks.push(cm.markText(match.from,Pos(match.from.line,match.from.ch+1),{className:style}));if(match.to)
marks.push(cm.markText(match.to,Pos(match.to.line,match.to.ch+1),{className:style}));}}
if(marks.length){if(ie_lt8&&cm.state.focused)cm.display.input.focus();var clear=function(){cm.operation(function(){for(var i=0;i<marks.length;i++)marks[i].clear();});};if(autoclear)setTimeout(clear,800);else return clear;}}
var currentlyHighlighted=null;function doMatchBrackets(cm){cm.operation(function(){if(currentlyHighlighted){currentlyHighlighted();currentlyHighlighted=null;}
currentlyHighlighted=matchBrackets(cm,false,cm.state.matchBrackets);});}
CodeMirror.defineOption("matchBrackets",false,function(cm,val,old){if(old&&old!=CodeMirror.Init)
cm.off("cursorActivity",doMatchBrackets);if(val){cm.state.matchBrackets=typeof val=="object"?val:{};cm.on("cursorActivity",doMatchBrackets);}});CodeMirror.defineExtension("matchBrackets",function(){matchBrackets(this,true);});CodeMirror.defineExtension("findMatchingBracket",function(pos,strict,config){return findMatchingBracket(this,pos,strict,config);});CodeMirror.defineExtension("scanForBracket",function(pos,dir,style,config){return scanForBracket(this,pos,dir,style,config);});});;(function(mod){if(typeof exports=="object"&&typeof module=="object")
mod(require("../../lib/codemirror"));else if(typeof define=="function"&&define.amd)
define(["../../lib/codemirror"],mod);else
mod(CodeMirror);})(function(CodeMirror){var DEFAULT_BRACKETS="()[]{}''\"\"";var DEFAULT_EXPLODE_ON_ENTER="[]{}";var SPACE_CHAR_REGEX=/\s/;var Pos=CodeMirror.Pos;CodeMirror.defineOption("autoCloseBrackets",false,function(cm,val,old){if(old!=CodeMirror.Init&&old)
cm.removeKeyMap("autoCloseBrackets");if(!val)return;var pairs=DEFAULT_BRACKETS,explode=DEFAULT_EXPLODE_ON_ENTER;if(typeof val=="string")pairs=val;else if(typeof val=="object"){if(val.pairs!=null)pairs=val.pairs;if(val.explode!=null)explode=val.explode;}
var map=buildKeymap(pairs);if(explode)map.Enter=buildExplodeHandler(explode);cm.addKeyMap(map);});function charsAround(cm,pos){var str=cm.getRange(Pos(pos.line,pos.ch-1),Pos(pos.line,pos.ch+1));return str.length==2?str:null;}
function buildKeymap(pairs){var map={name:"autoCloseBrackets",Backspace:function(cm){if(cm.getOption("disableInput"))return CodeMirror.Pass;var ranges=cm.listSelections();for(var i=0;i<ranges.length;i++){if(!ranges[i].empty())return CodeMirror.Pass;var around=charsAround(cm,ranges[i].head);if(!around||pairs.indexOf(around)%2!=0)return CodeMirror.Pass;}
for(var i=ranges.length-1;i>=0;i--){var cur=ranges[i].head;cm.replaceRange("",Pos(cur.line,cur.ch-1),Pos(cur.line,cur.ch+1));}}};var closingBrackets="";for(var i=0;i<pairs.length;i+=2)(function(left,right){if(left!=right)closingBrackets+=right;map["'"+left+"'"]=function(cm){if(cm.getOption("disableInput"))return CodeMirror.Pass;var ranges=cm.listSelections(),type,next;for(var i=0;i<ranges.length;i++){var range=ranges[i],cur=range.head,curType;if(left=="'"&&cm.getTokenTypeAt(cur)=="comment")
return CodeMirror.Pass;var next=cm.getRange(cur,Pos(cur.line,cur.ch+1));if(!range.empty())
curType="surround";else if(left==right&&next==right){if(cm.getRange(cur,Pos(cur.line,cur.ch+3))==left+left+left)
curType="skipThree";else
curType="skip";}else if(left==right&&cur.ch>1&&cm.getRange(Pos(cur.line,cur.ch-2),cur)==left+left)
curType="addFour";else if(left==right&&CodeMirror.isWordChar(next))
return CodeMirror.Pass;else if(cm.getLine(cur.line).length==cur.ch||closingBrackets.indexOf(next)>=0||SPACE_CHAR_REGEX.test(next))
curType="both";else
return CodeMirror.Pass;if(!type)type=curType;else if(type!=curType)return CodeMirror.Pass;}
cm.operation(function(){if(type=="skip"){cm.execCommand("goCharRight");}else if(type=="skipThree"){for(var i=0;i<3;i++)
cm.execCommand("goCharRight");}else if(type=="surround"){var sels=cm.getSelections();for(var i=0;i<sels.length;i++)
sels[i]=left+sels[i]+right;cm.replaceSelections(sels,"around");}else if(type=="both"){cm.replaceSelection(left+right,null);cm.execCommand("goCharLeft");}else if(type=="addFour"){cm.replaceSelection(left+left+left+left,"before");cm.execCommand("goCharRight");}});};if(left!=right)map["'"+right+"'"]=function(cm){var ranges=cm.listSelections();for(var i=0;i<ranges.length;i++){var range=ranges[i];if(!range.empty()||cm.getRange(range.head,Pos(range.head.line,range.head.ch+1))!=right)
return CodeMirror.Pass;}
cm.execCommand("goCharRight");};})(pairs.charAt(i),pairs.charAt(i+1));return map;}
function buildExplodeHandler(pairs){return function(cm){if(cm.getOption("disableInput"))return CodeMirror.Pass;var ranges=cm.listSelections();for(var i=0;i<ranges.length;i++){if(!ranges[i].empty())return CodeMirror.Pass;var around=charsAround(cm,ranges[i].head);if(!around||pairs.indexOf(around)%2!=0)return CodeMirror.Pass;}
cm.operation(function(){cm.replaceSelection("\n\n",null);cm.execCommand("goCharLeft");ranges=cm.listSelections();for(var i=0;i<ranges.length;i++){var line=ranges[i].head.line;cm.indentLine(line,null,true);cm.indentLine(line+1,null,true);}});};}});;(function(mod){if(typeof exports=="object"&&typeof module=="object")
mod(require("../../lib/codemirror"));else if(typeof define=="function"&&define.amd)
define(["../../lib/codemirror"],mod);else
mod(CodeMirror);})(function(CodeMirror){"use strict";CodeMirror.defineOption("styleSelectedText",false,function(cm,val,old){var prev=old&&old!=CodeMirror.Init;if(val&&!prev){cm.state.markedSelection=[];cm.state.markedSelectionStyle=typeof val=="string"?val:"CodeMirror-selectedtext";reset(cm);cm.on("cursorActivity",onCursorActivity);cm.on("change",onChange);}else if(!val&&prev){cm.off("cursorActivity",onCursorActivity);cm.off("change",onChange);clear(cm);cm.state.markedSelection=cm.state.markedSelectionStyle=null;}});function onCursorActivity(cm){cm.operation(function(){update(cm);});}
function onChange(cm){if(cm.state.markedSelection.length)
cm.operation(function(){clear(cm);});}
var CHUNK_SIZE=8;var Pos=CodeMirror.Pos;var cmp=CodeMirror.cmpPos;function coverRange(cm,from,to,addAt){if(cmp(from,to)==0)return;var array=cm.state.markedSelection;var cls=cm.state.markedSelectionStyle;for(var line=from.line;;){var start=line==from.line?from:Pos(line,0);var endLine=line+CHUNK_SIZE,atEnd=endLine>=to.line;var end=atEnd?to:Pos(endLine,0);var mark=cm.markText(start,end,{className:cls});if(addAt==null)array.push(mark);else array.splice(addAt++,0,mark);if(atEnd)break;line=endLine;}}
function clear(cm){var array=cm.state.markedSelection;for(var i=0;i<array.length;++i)array[i].clear();array.length=0;}
function reset(cm){clear(cm);var ranges=cm.listSelections();for(var i=0;i<ranges.length;i++)
coverRange(cm,ranges[i].from(),ranges[i].to());}
function update(cm){if(!cm.somethingSelected())return clear(cm);if(cm.listSelections().length>1)return reset(cm);var from=cm.getCursor("start"),to=cm.getCursor("end");var array=cm.state.markedSelection;if(!array.length)return coverRange(cm,from,to);var coverStart=array[0].find(),coverEnd=array[array.length-1].find();if(!coverStart||!coverEnd||to.line-from.line<CHUNK_SIZE||cmp(from,coverEnd.to)>=0||cmp(to,coverStart.from)<=0)
return reset(cm);while(cmp(from,coverStart.from)>0){array.shift().clear();coverStart=array[0].find();}
if(cmp(from,coverStart.from)<0){if(coverStart.to.line-from.line<CHUNK_SIZE){array.shift().clear();coverRange(cm,from,coverStart.to,0);}else{coverRange(cm,from,coverStart.from,0);}}
while(cmp(to,coverEnd.to)<0){array.pop().clear();coverEnd=array[array.length-1].find();}
if(cmp(to,coverEnd.to)>0){if(to.line-coverEnd.from.line<CHUNK_SIZE){array.pop().clear();coverRange(cm,coverEnd.from,to);}else{coverRange(cm,coverEnd.to,to);}}}});;(function(mod){if(typeof exports=="object"&&typeof module=="object")
mod(require("../../lib/codemirror"));else if(typeof define=="function"&&define.amd)
define(["../../lib/codemirror"],mod);else
mod(CodeMirror);})(function(CodeMirror){"use strict";var noOptions={};var nonWS=/[^\s\u00a0]/;var Pos=CodeMirror.Pos;function firstNonWS(str){var found=str.search(nonWS);return found==-1?0:found;}
CodeMirror.commands.toggleComment=function(cm){var minLine=Infinity,ranges=cm.listSelections(),mode=null;for(var i=ranges.length-1;i>=0;i--){var from=ranges[i].from(),to=ranges[i].to();if(from.line>=minLine)continue;if(to.line>=minLine)to=Pos(minLine,0);minLine=from.line;if(mode==null){if(cm.uncomment(from,to))mode="un";else{cm.lineComment(from,to);mode="line";}}else if(mode=="un"){cm.uncomment(from,to);}else{cm.lineComment(from,to);}}};CodeMirror.defineExtension("lineComment",function(from,to,options){if(!options)options=noOptions;var self=this,mode=self.getModeAt(from);var commentString=options.lineComment||mode.lineComment;if(!commentString){if(options.blockCommentStart||mode.blockCommentStart){options.fullLines=true;self.blockComment(from,to,options);}
return;}
var firstLine=self.getLine(from.line);if(firstLine==null)return;var end=Math.min(to.ch!=0||to.line==from.line?to.line+1:to.line,self.lastLine()+1);var pad=options.padding==null?" ":options.padding;var blankLines=options.commentBlankLines||from.line==to.line;self.operation(function(){if(options.indent){var baseString=firstLine.slice(0,firstNonWS(firstLine));for(var i=from.line;i<end;++i){var line=self.getLine(i),cut=baseString.length;if(!blankLines&&!nonWS.test(line))continue;if(line.slice(0,cut)!=baseString)cut=firstNonWS(line);self.replaceRange(baseString+commentString+pad,Pos(i,0),Pos(i,cut));}}else{for(var i=from.line;i<end;++i){if(blankLines||nonWS.test(self.getLine(i)))
self.replaceRange(commentString+pad,Pos(i,0));}}});});CodeMirror.defineExtension("blockComment",function(from,to,options){if(!options)options=noOptions;var self=this,mode=self.getModeAt(from);var startString=options.blockCommentStart||mode.blockCommentStart;var endString=options.blockCommentEnd||mode.blockCommentEnd;if(!startString||!endString){if((options.lineComment||mode.lineComment)&&options.fullLines!=false)
self.lineComment(from,to,options);return;}
var end=Math.min(to.line,self.lastLine());if(end!=from.line&&to.ch==0&&nonWS.test(self.getLine(end)))--end;var pad=options.padding==null?" ":options.padding;if(from.line>end)return;self.operation(function(){if(options.fullLines!=false){var lastLineHasText=nonWS.test(self.getLine(end));self.replaceRange(pad+endString,Pos(end));self.replaceRange(startString+pad,Pos(from.line,0));var lead=options.blockCommentLead||mode.blockCommentLead;if(lead!=null)for(var i=from.line+1;i<=end;++i)
if(i!=end||lastLineHasText)
self.replaceRange(lead+pad,Pos(i,0));}else{self.replaceRange(endString,to);self.replaceRange(startString,from);}});});CodeMirror.defineExtension("uncomment",function(from,to,options){if(!options)options=noOptions;var self=this,mode=self.getModeAt(from);var end=Math.min(to.line,self.lastLine()),start=Math.min(from.line,end);var lineString=options.lineComment||mode.lineComment,lines=[];var pad=options.padding==null?" ":options.padding,didSomething;lineComment:{if(!lineString)break lineComment;for(var i=start;i<=end;++i){var line=self.getLine(i);var found=line.indexOf(lineString);if(found>-1&&!/comment/.test(self.getTokenTypeAt(Pos(i,found+1))))found=-1;if(found==-1&&(i!=end||i==start)&&nonWS.test(line))break lineComment;if(found>-1&&nonWS.test(line.slice(0,found)))break lineComment;lines.push(line);}
self.operation(function(){for(var i=start;i<=end;++i){var line=lines[i-start];var pos=line.indexOf(lineString),endPos=pos+lineString.length;if(pos<0)continue;if(line.slice(endPos,endPos+pad.length)==pad)endPos+=pad.length;didSomething=true;self.replaceRange("",Pos(i,pos),Pos(i,endPos));}});if(didSomething)return true;}
var startString=options.blockCommentStart||mode.blockCommentStart;var endString=options.blockCommentEnd||mode.blockCommentEnd;if(!startString||!endString)return false;var lead=options.blockCommentLead||mode.blockCommentLead;var startLine=self.getLine(start),endLine=end==start?startLine:self.getLine(end);var open=startLine.indexOf(startString),close=endLine.lastIndexOf(endString);if(close==-1&&start!=end){endLine=self.getLine(--end);close=endLine.lastIndexOf(endString);}
if(open==-1||close==-1||!/comment/.test(self.getTokenTypeAt(Pos(start,open+1)))||!/comment/.test(self.getTokenTypeAt(Pos(end,close+1))))
return false;self.operation(function(){self.replaceRange("",Pos(end,close-(pad&&endLine.slice(close-pad.length,close)==pad?pad.length:0)),Pos(end,close+endString.length));var openEnd=open+startString.length;if(pad&&startLine.slice(openEnd,openEnd+pad.length)==pad)openEnd+=pad.length;self.replaceRange("",Pos(start,open),Pos(start,openEnd));if(lead)for(var i=start+1;i<=end;++i){var line=self.getLine(i),found=line.indexOf(lead);if(found==-1||nonWS.test(line.slice(0,found)))continue;var foundEnd=found+lead.length;if(pad&&line.slice(foundEnd,foundEnd+pad.length)==pad)foundEnd+=pad.length;self.replaceRange("",Pos(i,found),Pos(i,foundEnd));}});return true;});});;CodeMirror.overlayMode=CodeMirror.overlayParser=function(base,overlay,combine){return{startState:function(){return{base:CodeMirror.startState(base),overlay:CodeMirror.startState(overlay),basePos:0,baseCur:null,overlayPos:0,overlayCur:null};},copyState:function(state){return{base:CodeMirror.copyState(base,state.base),overlay:CodeMirror.copyState(overlay,state.overlay),basePos:state.basePos,baseCur:null,overlayPos:state.overlayPos,overlayCur:null};},token:function(stream,state){if(stream.start==state.basePos){state.baseCur=base.token(stream,state.base);state.basePos=stream.pos;}
if(stream.start==state.overlayPos){stream.pos=stream.start;state.overlayCur=overlay.token(stream,state.overlay);state.overlayPos=stream.pos;}
stream.pos=Math.min(state.basePos,state.overlayPos);if(stream.eol())state.basePos=state.overlayPos=0;if(state.overlayCur==null)return state.baseCur;if(state.baseCur!=null&&combine)return state.baseCur+" "+state.overlayCur;else return state.overlayCur;},indent:base.indent&&function(state,textAfter){return base.indent(state.base,textAfter);},electricChars:base.electricChars,innerMode:function(state){return{state:state.base,mode:base};},blankLine:function(state){if(base.blankLine)base.blankLine(state.base);if(overlay.blankLine)overlay.blankLine(state.overlay);}};};;CodeMirror.defineMode("htmlembedded",function(config,parserConfig){var scriptStartRegex=parserConfig.scriptStartRegex||/^<%/i,scriptEndRegex=parserConfig.scriptEndRegex||/^%>/i;var scriptingMode,htmlMixedMode;function htmlDispatch(stream,state){if(stream.match(scriptStartRegex,false)){state.token=scriptingDispatch;return scriptingMode.token(stream,state.scriptState);}
else
return htmlMixedMode.token(stream,state.htmlState);}
function scriptingDispatch(stream,state){if(stream.match(scriptEndRegex,false)){state.token=htmlDispatch;return htmlMixedMode.token(stream,state.htmlState);}
else
return scriptingMode.token(stream,state.scriptState);}
return{startState:function(){scriptingMode=scriptingMode||CodeMirror.getMode(config,parserConfig.scriptingModeSpec);htmlMixedMode=htmlMixedMode||CodeMirror.getMode(config,"htmlmixed");return{token:parserConfig.startOpen?scriptingDispatch:htmlDispatch,htmlState:CodeMirror.startState(htmlMixedMode),scriptState:CodeMirror.startState(scriptingMode)};},token:function(stream,state){return state.token(stream,state);},indent:function(state,textAfter){if(state.token==htmlDispatch)
return htmlMixedMode.indent(state.htmlState,textAfter);else if(scriptingMode.indent)
return scriptingMode.indent(state.scriptState,textAfter);},copyState:function(state){return{token:state.token,htmlState:CodeMirror.copyState(htmlMixedMode,state.htmlState),scriptState:CodeMirror.copyState(scriptingMode,state.scriptState)};},electricChars:"/{}:",innerMode:function(state){if(state.token==scriptingDispatch)return{state:state.scriptState,mode:scriptingMode};else return{state:state.htmlState,mode:htmlMixedMode};}};},"htmlmixed");CodeMirror.defineMIME("application/x-ejs",{name:"htmlembedded",scriptingModeSpec:"javascript"});CodeMirror.defineMIME("application/x-aspx",{name:"htmlembedded",scriptingModeSpec:"text/x-csharp"});CodeMirror.defineMIME("application/x-jsp",{name:"htmlembedded",scriptingModeSpec:"text/x-java"});CodeMirror.defineMIME("application/x-erb",{name:"htmlembedded",scriptingModeSpec:"ruby"});;CodeMirror.defineMode("clike",function(config,parserConfig){var indentUnit=config.indentUnit,statementIndentUnit=parserConfig.statementIndentUnit||indentUnit,dontAlignCalls=parserConfig.dontAlignCalls,keywords=parserConfig.keywords||{},builtin=parserConfig.builtin||{},blockKeywords=parserConfig.blockKeywords||{},atoms=parserConfig.atoms||{},hooks=parserConfig.hooks||{},multiLineStrings=parserConfig.multiLineStrings;var isOperatorChar=/[+\-*&%=<>!?|\/]/;var curPunc;function tokenBase(stream,state){var ch=stream.next();if(hooks[ch]){var result=hooks[ch](stream,state);if(result!==false)return result;}
if(ch=='"'||ch=="'"){state.tokenize=tokenString(ch);return state.tokenize(stream,state);}
if(/[\[\]{}\(\),;\:\.]/.test(ch)){curPunc=ch;return null;}
if(/\d/.test(ch)){stream.eatWhile(/[\w\.]/);return"number";}
if(ch=="/"){if(stream.eat("*")){state.tokenize=tokenComment;return tokenComment(stream,state);}
if(stream.eat("/")){stream.skipToEnd();return"comment";}}
if(isOperatorChar.test(ch)){stream.eatWhile(isOperatorChar);return"operator";}
stream.eatWhile(/[\w\$_]/);var cur=stream.current();if(keywords.propertyIsEnumerable(cur)){if(blockKeywords.propertyIsEnumerable(cur))curPunc="newstatement";return"keyword";}
if(builtin.propertyIsEnumerable(cur)){if(blockKeywords.propertyIsEnumerable(cur))curPunc="newstatement";return"builtin";}
if(atoms.propertyIsEnumerable(cur))return"atom";return"variable";}
function tokenString(quote){return function(stream,state){var escaped=false,next,end=false;while((next=stream.next())!=null){if(next==quote&&!escaped){end=true;break;}
escaped=!escaped&&next=="\\";}
if(end||!(escaped||multiLineStrings))
state.tokenize=null;return"string";};}
function tokenComment(stream,state){var maybeEnd=false,ch;while(ch=stream.next()){if(ch=="/"&&maybeEnd){state.tokenize=null;break;}
maybeEnd=(ch=="*");}
return"comment";}
function Context(indented,column,type,align,prev){this.indented=indented;this.column=column;this.type=type;this.align=align;this.prev=prev;}
function pushContext(state,col,type){var indent=state.indented;if(state.context&&state.context.type=="statement")
indent=state.context.indented;return state.context=new Context(indent,col,type,null,state.context);}
function popContext(state){var t=state.context.type;if(t==")"||t=="]"||t=="}")
state.indented=state.context.indented;return state.context=state.context.prev;}
return{startState:function(basecolumn){return{tokenize:null,context:new Context((basecolumn||0)-indentUnit,0,"top",false),indented:0,startOfLine:true};},token:function(stream,state){var ctx=state.context;if(stream.sol()){if(ctx.align==null)ctx.align=false;state.indented=stream.indentation();state.startOfLine=true;}
if(stream.eatSpace())return null;curPunc=null;var style=(state.tokenize||tokenBase)(stream,state);if(style=="comment"||style=="meta")return style;if(ctx.align==null)ctx.align=true;if((curPunc==";"||curPunc==":"||curPunc==",")&&ctx.type=="statement")popContext(state);else if(curPunc=="{")pushContext(state,stream.column(),"}");else if(curPunc=="[")pushContext(state,stream.column(),"]");else if(curPunc=="(")pushContext(state,stream.column(),")");else if(curPunc=="}"){while(ctx.type=="statement")ctx=popContext(state);if(ctx.type=="}")ctx=popContext(state);while(ctx.type=="statement")ctx=popContext(state);}
else if(curPunc==ctx.type)popContext(state);else if(((ctx.type=="}"||ctx.type=="top")&&curPunc!=';')||(ctx.type=="statement"&&curPunc=="newstatement"))
pushContext(state,stream.column(),"statement");state.startOfLine=false;return style;},indent:function(state,textAfter){if(state.tokenize!=tokenBase&&state.tokenize!=null)return CodeMirror.Pass;var ctx=state.context,firstChar=textAfter&&textAfter.charAt(0);if(ctx.type=="statement"&&firstChar=="}")ctx=ctx.prev;var closing=firstChar==ctx.type;if(ctx.type=="statement")return ctx.indented+(firstChar=="{"?0:statementIndentUnit);else if(ctx.align&&(!dontAlignCalls||ctx.type!=")"))return ctx.column+(closing?0:1);else if(ctx.type==")"&&!closing)return ctx.indented+statementIndentUnit;else return ctx.indented+(closing?0:indentUnit);},electricChars:"{}",blockCommentStart:"/*",blockCommentEnd:"*/",lineComment:"//",fold:"brace"};});(function(){function words(str){var obj={},words=str.split(" ");for(var i=0;i<words.length;++i)obj[words[i]]=true;return obj;}
var cKeywords="auto if break int case long char register continue return default short do sizeof "+"double static else struct entry switch extern typedef float union for unsigned "+"goto while enum void const signed volatile";function cppHook(stream,state){if(!state.startOfLine)return false;for(;;){if(stream.skipTo("\\")){stream.next();if(stream.eol()){state.tokenize=cppHook;break;}}else{stream.skipToEnd();state.tokenize=null;break;}}
return"meta";}
function tokenAtString(stream,state){var next;while((next=stream.next())!=null){if(next=='"'&&!stream.eat('"')){state.tokenize=null;break;}}
return"string";}
function mimes(ms,mode){for(var i=0;i<ms.length;++i)CodeMirror.defineMIME(ms[i],mode);}
mimes(["text/x-csrc","text/x-c","text/x-chdr"],{name:"clike",keywords:words(cKeywords),blockKeywords:words("case do else for if switch while struct"),atoms:words("null"),hooks:{"#":cppHook}});mimes(["text/x-c++src","text/x-c++hdr"],{name:"clike",keywords:words(cKeywords+" asm dynamic_cast namespace reinterpret_cast try bool explicit new "+"static_cast typeid catch operator template typename class friend private "+"this using const_cast inline public throw virtual delete mutable protected "+"wchar_t"),blockKeywords:words("catch class do else finally for if struct switch try while"),atoms:words("true false null"),hooks:{"#":cppHook}});CodeMirror.defineMIME("text/x-java",{name:"clike",keywords:words("abstract assert boolean break byte case catch char class const continue default "+"do double else enum extends final finally float for goto if implements import "+"instanceof int interface long native new package private protected public "+"return short static strictfp super switch synchronized this throw throws transient "+"try void volatile while"),blockKeywords:words("catch class do else finally for if switch try while"),atoms:words("true false null"),hooks:{"@":function(stream){stream.eatWhile(/[\w\$_]/);return"meta";}}});CodeMirror.defineMIME("text/x-csharp",{name:"clike",keywords:words("abstract as base break case catch checked class const continue"+" default delegate do else enum event explicit extern finally fixed for"+" foreach goto if implicit in interface internal is lock namespace new"+" operator out override params private protected public readonly ref return sealed"+" sizeof stackalloc static struct switch this throw try typeof unchecked"+" unsafe using virtual void volatile while add alias ascending descending dynamic from get"+" global group into join let orderby partial remove select set value var yield"),blockKeywords:words("catch class do else finally for foreach if struct switch try while"),builtin:words("Boolean Byte Char DateTime DateTimeOffset Decimal Double"+" Guid Int16 Int32 Int64 Object SByte Single String TimeSpan UInt16 UInt32"+" UInt64 bool byte char decimal double short int long object"+" sbyte float string ushort uint ulong"),atoms:words("true false null"),hooks:{"@":function(stream,state){if(stream.eat('"')){state.tokenize=tokenAtString;return tokenAtString(stream,state);}
stream.eatWhile(/[\w\$_]/);return"meta";}}});CodeMirror.defineMIME("text/x-scala",{name:"clike",keywords:words("abstract case catch class def do else extends false final finally for forSome if "+"implicit import lazy match new null object override package private protected return "+"sealed super this throw trait try trye type val var while with yield _ : = => <- <: "+"<% >: # @ "+"assert assume require print println printf readLine readBoolean readByte readShort "+"readChar readInt readLong readFloat readDouble "+"AnyVal App Application Array BufferedIterator BigDecimal BigInt Char Console Either "+"Enumeration Equiv Error Exception Fractional Function IndexedSeq Integral Iterable "+"Iterator List Map Numeric Nil NotNull Option Ordered Ordering PartialFunction PartialOrdering "+"Product Proxy Range Responder Seq Serializable Set Specializable Stream StringBuilder "+"StringContext Symbol Throwable Traversable TraversableOnce Tuple Unit Vector :: #:: "+"Boolean Byte Character CharSequence Class ClassLoader Cloneable Comparable "+"Compiler Double Exception Float Integer Long Math Number Object Package Pair Process "+"Runtime Runnable SecurityManager Short StackTraceElement StrictMath String "+"StringBuffer System Thread ThreadGroup ThreadLocal Throwable Triple Void"),blockKeywords:words("catch class do else finally for forSome if match switch try while"),atoms:words("true false null"),hooks:{"@":function(stream){stream.eatWhile(/[\w\$_]/);return"meta";}}});mimes(["x-shader/x-vertex","x-shader/x-fragment"],{name:"clike",keywords:words("float int bool void "+"vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 "+"mat2 mat3 mat4 "+"sampler1D sampler2D sampler3D samplerCube "+"sampler1DShadow sampler2DShadow"+"const attribute uniform varying "+"break continue discard return "+"for while do if else struct "+"in out inout"),blockKeywords:words("for while do if else struct"),builtin:words("radians degrees sin cos tan asin acos atan "+"pow exp log exp2 sqrt inversesqrt "+"abs sign floor ceil fract mod min max clamp mix step smootstep "+"length distance dot cross normalize ftransform faceforward "+"reflect refract matrixCompMult "+"lessThan lessThanEqual greaterThan greaterThanEqual "+"equal notEqual any all not "+"texture1D texture1DProj texture1DLod texture1DProjLod "+"texture2D texture2DProj texture2DLod texture2DProjLod "+"texture3D texture3DProj texture3DLod texture3DProjLod "+"textureCube textureCubeLod "+"shadow1D shadow2D shadow1DProj shadow2DProj "+"shadow1DLod shadow2DLod shadow1DProjLod shadow2DProjLod "+"dFdx dFdy fwidth "+"noise1 noise2 noise3 noise4"),atoms:words("true false "+"gl_FragColor gl_SecondaryColor gl_Normal gl_Vertex "+"gl_MultiTexCoord0 gl_MultiTexCoord1 gl_MultiTexCoord2 gl_MultiTexCoord3 "+"gl_MultiTexCoord4 gl_MultiTexCoord5 gl_MultiTexCoord6 gl_MultiTexCoord7 "+"gl_FogCoord "+"gl_Position gl_PointSize gl_ClipVertex "+"gl_FrontColor gl_BackColor gl_FrontSecondaryColor gl_BackSecondaryColor "+"gl_TexCoord gl_FogFragCoord "+"gl_FragCoord gl_FrontFacing "+"gl_FragColor gl_FragData gl_FragDepth "+"gl_ModelViewMatrix gl_ProjectionMatrix gl_ModelViewProjectionMatrix "+"gl_TextureMatrix gl_NormalMatrix gl_ModelViewMatrixInverse "+"gl_ProjectionMatrixInverse gl_ModelViewProjectionMatrixInverse "+"gl_TexureMatrixTranspose gl_ModelViewMatrixInverseTranspose "+"gl_ProjectionMatrixInverseTranspose "+"gl_ModelViewProjectionMatrixInverseTranspose "+"gl_TextureMatrixInverseTranspose "+"gl_NormalScale gl_DepthRange gl_ClipPlane "+"gl_Point gl_FrontMaterial gl_BackMaterial gl_LightSource gl_LightModel "+"gl_FrontLightModelProduct gl_BackLightModelProduct "+"gl_TextureColor gl_EyePlaneS gl_EyePlaneT gl_EyePlaneR gl_EyePlaneQ "+"gl_FogParameters "+"gl_MaxLights gl_MaxClipPlanes gl_MaxTextureUnits gl_MaxTextureCoords "+"gl_MaxVertexAttribs gl_MaxVertexUniformComponents gl_MaxVaryingFloats "+"gl_MaxVertexTextureImageUnits gl_MaxTextureImageUnits "+"gl_MaxFragmentUniformComponents gl_MaxCombineTextureImageUnits "+"gl_MaxDrawBuffers"),hooks:{"#":cppHook}});}());;CodeMirror.defineMode("coffeescript",function(conf){var ERRORCLASS="error";function wordRegexp(words){return new RegExp("^(("+words.join(")|(")+"))\\b");}
var operators=/^(?:->|=>|\+[+=]?|-[\-=]?|\*[\*=]?|\/[\/=]?|[=!]=|<[><]?=?|>>?=?|%=?|&=?|\|=?|\^=?|\~|!|\?)/;var delimiters=/^(?:[()\[\]{},:`=;]|\.\.?\.?)/;var identifiers=/^[_A-Za-z$][_A-Za-z$0-9]*/;var properties=/^(@|this\.)[_A-Za-z$][_A-Za-z$0-9]*/;var wordOperators=wordRegexp(["and","or","not","is","isnt","in","instanceof","typeof"]);var indentKeywords=["for","while","loop","if","unless","else","switch","try","catch","finally","class"];var commonKeywords=["break","by","continue","debugger","delete","do","in","of","new","return","then","this","throw","when","until"];var keywords=wordRegexp(indentKeywords.concat(commonKeywords));indentKeywords=wordRegexp(indentKeywords);var stringPrefixes=/^('{3}|\"{3}|['\"])/;var regexPrefixes=/^(\/{3}|\/)/;var commonConstants=["Infinity","NaN","undefined","null","true","false","on","off","yes","no"];var constants=wordRegexp(commonConstants);function tokenBase(stream,state){if(stream.sol()){if(state.scope.align===null)state.scope.align=false;var scopeOffset=state.scope.offset;if(stream.eatSpace()){var lineOffset=stream.indentation();if(lineOffset>scopeOffset&&state.scope.type=="coffee"){return"indent";}else if(lineOffset<scopeOffset){return"dedent";}
return null;}else{if(scopeOffset>0){dedent(stream,state);}}}
if(stream.eatSpace()){return null;}
var ch=stream.peek();if(stream.match("####")){stream.skipToEnd();return"comment";}
if(stream.match("###")){state.tokenize=longComment;return state.tokenize(stream,state);}
if(ch==="#"){stream.skipToEnd();return"comment";}
if(stream.match(/^-?[0-9\.]/,false)){var floatLiteral=false;if(stream.match(/^-?\d*\.\d+(e[\+\-]?\d+)?/i)){floatLiteral=true;}
if(stream.match(/^-?\d+\.\d*/)){floatLiteral=true;}
if(stream.match(/^-?\.\d+/)){floatLiteral=true;}
if(floatLiteral){if(stream.peek()=="."){stream.backUp(1);}
return"number";}
var intLiteral=false;if(stream.match(/^-?0x[0-9a-f]+/i)){intLiteral=true;}
if(stream.match(/^-?[1-9]\d*(e[\+\-]?\d+)?/)){intLiteral=true;}
if(stream.match(/^-?0(?![\dx])/i)){intLiteral=true;}
if(intLiteral){return"number";}}
if(stream.match(stringPrefixes)){state.tokenize=tokenFactory(stream.current(),"string");return state.tokenize(stream,state);}
if(stream.match(regexPrefixes)){if(stream.current()!="/"||stream.match(/^.*\//,false)){state.tokenize=tokenFactory(stream.current(),"string-2");return state.tokenize(stream,state);}else{stream.backUp(1);}}
if(stream.match(operators)||stream.match(wordOperators)){return"operator";}
if(stream.match(delimiters)){return"punctuation";}
if(stream.match(constants)){return"atom";}
if(stream.match(keywords)){return"keyword";}
if(stream.match(identifiers)){return"variable";}
if(stream.match(properties)){return"property";}
stream.next();return ERRORCLASS;}
function tokenFactory(delimiter,outclass){var singleline=delimiter.length==1;return function(stream,state){while(!stream.eol()){stream.eatWhile(/[^'"\/\\]/);if(stream.eat("\\")){stream.next();if(singleline&&stream.eol()){return outclass;}}else if(stream.match(delimiter)){state.tokenize=tokenBase;return outclass;}else{stream.eat(/['"\/]/);}}
if(singleline){if(conf.mode.singleLineStringErrors){outclass=ERRORCLASS;}else{state.tokenize=tokenBase;}}
return outclass;};}
function longComment(stream,state){while(!stream.eol()){stream.eatWhile(/[^#]/);if(stream.match("###")){state.tokenize=tokenBase;break;}
stream.eatWhile("#");}
return"comment";}
function indent(stream,state,type){type=type||"coffee";var offset=0,align=false,alignOffset=null;for(var scope=state.scope;scope;scope=scope.prev){if(scope.type==="coffee"){offset=scope.offset+conf.indentUnit;break;}}
if(type!=="coffee"){align=null;alignOffset=stream.column()+stream.current().length;}else if(state.scope.align){state.scope.align=false;}
state.scope={offset:offset,type:type,prev:state.scope,align:align,alignOffset:alignOffset};}
function dedent(stream,state){if(!state.scope.prev)return;if(state.scope.type==="coffee"){var _indent=stream.indentation();var matched=false;for(var scope=state.scope;scope;scope=scope.prev){if(_indent===scope.offset){matched=true;break;}}
if(!matched){return true;}
while(state.scope.prev&&state.scope.offset!==_indent){state.scope=state.scope.prev;}
return false;}else{state.scope=state.scope.prev;return false;}}
function tokenLexer(stream,state){var style=state.tokenize(stream,state);var current=stream.current();if(current==="."){style=state.tokenize(stream,state);current=stream.current();if(/^\.[\w$]+$/.test(current)){return"variable";}else{return ERRORCLASS;}}
if(current==="return"){state.dedent+=1;}
if(((current==="->"||current==="=>")&&!state.lambda&&!stream.peek())||style==="indent"){indent(stream,state);}
var delimiter_index="[({".indexOf(current);if(delimiter_index!==-1){indent(stream,state,"])}".slice(delimiter_index,delimiter_index+1));}
if(indentKeywords.exec(current)){indent(stream,state);}
if(current=="then"){dedent(stream,state);}
if(style==="dedent"){if(dedent(stream,state)){return ERRORCLASS;}}
delimiter_index="])}".indexOf(current);if(delimiter_index!==-1){while(state.scope.type=="coffee"&&state.scope.prev)
state.scope=state.scope.prev;if(state.scope.type==current)
state.scope=state.scope.prev;}
if(state.dedent>0&&stream.eol()&&state.scope.type=="coffee"){if(state.scope.prev)state.scope=state.scope.prev;state.dedent-=1;}
return style;}
var external={startState:function(basecolumn){return{tokenize:tokenBase,scope:{offset:basecolumn||0,type:"coffee",prev:null,align:false},lastToken:null,lambda:false,dedent:0};},token:function(stream,state){var fillAlign=state.scope.align===null&&state.scope;if(fillAlign&&stream.sol())fillAlign.align=false;var style=tokenLexer(stream,state);if(fillAlign&&style&&style!="comment")fillAlign.align=true;state.lastToken={style:style,content:stream.current()};if(stream.eol()&&stream.lambda){state.lambda=false;}
return style;},indent:function(state,text){if(state.tokenize!=tokenBase)return 0;var scope=state.scope;var closer=text&&"])}".indexOf(text.charAt(0))>-1;if(closer)while(scope.type=="coffee"&&scope.prev)scope=scope.prev;var closes=closer&&scope.type===text.charAt(0);if(scope.align)
return scope.alignOffset-(closes?1:0);else
return(closes?scope.prev:scope).offset;},lineComment:"#",fold:"indent"};return external;});CodeMirror.defineMIME("text/x-coffeescript","coffeescript");;(function(){function keywords(str){var obj={},words=str.split(" ");for(var i=0;i<words.length;++i)obj[words[i]]=true;return obj;}
function heredoc(delim){return function(stream,state){if(stream.match(delim))state.tokenize=null;else stream.skipToEnd();return"string";};}
var phpConfig={name:"clike",keywords:keywords("abstract and array as break case catch class clone const continue declare default "+"do else elseif enddeclare endfor endforeach endif endswitch endwhile extends final "+"for foreach function global goto if implements interface instanceof namespace "+"new or private protected public static switch throw trait try use var while xor "+"die echo empty exit eval include include_once isset list require require_once return "+"print unset __halt_compiler self static parent yield insteadof finally"),blockKeywords:keywords("catch do else elseif for foreach if switch try while finally"),atoms:keywords("true false null TRUE FALSE NULL __CLASS__ __DIR__ __FILE__ __LINE__ __METHOD__ __FUNCTION__ __NAMESPACE__ __TRAIT__"),builtin:keywords("func_num_args func_get_arg func_get_args strlen strcmp strncmp strcasecmp strncasecmp each error_reporting define defined trigger_error user_error set_error_handler restore_error_handler get_declared_classes get_loaded_extensions extension_loaded get_extension_funcs debug_backtrace constant bin2hex hex2bin sleep usleep time mktime gmmktime strftime gmstrftime strtotime date gmdate getdate localtime checkdate flush wordwrap htmlspecialchars htmlentities html_entity_decode md5 md5_file crc32 getimagesize image_type_to_mime_type phpinfo phpversion phpcredits strnatcmp strnatcasecmp substr_count strspn strcspn strtok strtoupper strtolower strpos strrpos strrev hebrev hebrevc nl2br basename dirname pathinfo stripslashes stripcslashes strstr stristr strrchr str_shuffle str_word_count strcoll substr substr_replace quotemeta ucfirst ucwords strtr addslashes addcslashes rtrim str_replace str_repeat count_chars chunk_split trim ltrim strip_tags similar_text explode implode setlocale localeconv parse_str str_pad chop strchr sprintf printf vprintf vsprintf sscanf fscanf parse_url urlencode urldecode rawurlencode rawurldecode readlink linkinfo link unlink exec system escapeshellcmd escapeshellarg passthru shell_exec proc_open proc_close rand srand getrandmax mt_rand mt_srand mt_getrandmax base64_decode base64_encode abs ceil floor round is_finite is_nan is_infinite bindec hexdec octdec decbin decoct dechex base_convert number_format fmod ip2long long2ip getenv putenv getopt microtime gettimeofday getrusage uniqid quoted_printable_decode set_time_limit get_cfg_var magic_quotes_runtime set_magic_quotes_runtime get_magic_quotes_gpc get_magic_quotes_runtime import_request_variables error_log serialize unserialize memory_get_usage var_dump var_export debug_zval_dump print_r highlight_file show_source highlight_string ini_get ini_get_all ini_set ini_alter ini_restore get_include_path set_include_path restore_include_path setcookie header headers_sent connection_aborted connection_status ignore_user_abort parse_ini_file is_uploaded_file move_uploaded_file intval floatval doubleval strval gettype settype is_null is_resource is_bool is_long is_float is_int is_integer is_double is_real is_numeric is_string is_array is_object is_scalar ereg ereg_replace eregi eregi_replace split spliti join sql_regcase dl pclose popen readfile rewind rmdir umask fclose feof fgetc fgets fgetss fread fopen fpassthru ftruncate fstat fseek ftell fflush fwrite fputs mkdir rename copy tempnam tmpfile file file_get_contents stream_select stream_context_create stream_context_set_params stream_context_set_option stream_context_get_options stream_filter_prepend stream_filter_append fgetcsv flock get_meta_tags stream_set_write_buffer set_file_buffer set_socket_blocking stream_set_blocking socket_set_blocking stream_get_meta_data stream_register_wrapper stream_wrapper_register stream_set_timeout socket_set_timeout socket_get_status realpath fnmatch fsockopen pfsockopen pack unpack get_browser crypt opendir closedir chdir getcwd rewinddir readdir dir glob fileatime filectime filegroup fileinode filemtime fileowner fileperms filesize filetype file_exists is_writable is_writeable is_readable is_executable is_file is_dir is_link stat lstat chown touch clearstatcache mail ob_start ob_flush ob_clean ob_end_flush ob_end_clean ob_get_flush ob_get_clean ob_get_length ob_get_level ob_get_status ob_get_contents ob_implicit_flush ob_list_handlers ksort krsort natsort natcasesort asort arsort sort rsort usort uasort uksort shuffle array_walk count end prev next reset current key min max in_array array_search extract compact array_fill range array_multisort array_push array_pop array_shift array_unshift array_splice array_slice array_merge array_merge_recursive array_keys array_values array_count_values array_reverse array_reduce array_pad array_flip array_change_key_case array_rand array_unique array_intersect array_intersect_assoc array_diff array_diff_assoc array_sum array_filter array_map array_chunk array_key_exists pos sizeof key_exists assert assert_options version_compare ftok str_rot13 aggregate session_name session_module_name session_save_path session_id session_regenerate_id session_decode session_register session_unregister session_is_registered session_encode session_start session_destroy session_unset session_set_save_handler session_cache_limiter session_cache_expire session_set_cookie_params session_get_cookie_params session_write_close preg_match preg_match_all preg_replace preg_replace_callback preg_split preg_quote preg_grep overload ctype_alnum ctype_alpha ctype_cntrl ctype_digit ctype_lower ctype_graph ctype_print ctype_punct ctype_space ctype_upper ctype_xdigit virtual apache_request_headers apache_note apache_lookup_uri apache_child_terminate apache_setenv apache_response_headers apache_get_version getallheaders mysql_connect mysql_pconnect mysql_close mysql_select_db mysql_create_db mysql_drop_db mysql_query mysql_unbuffered_query mysql_db_query mysql_list_dbs mysql_list_tables mysql_list_fields mysql_list_processes mysql_error mysql_errno mysql_affected_rows mysql_insert_id mysql_result mysql_num_rows mysql_num_fields mysql_fetch_row mysql_fetch_array mysql_fetch_assoc mysql_fetch_object mysql_data_seek mysql_fetch_lengths mysql_fetch_field mysql_field_seek mysql_free_result mysql_field_name mysql_field_table mysql_field_len mysql_field_type mysql_field_flags mysql_escape_string mysql_real_escape_string mysql_stat mysql_thread_id mysql_client_encoding mysql_get_client_info mysql_get_host_info mysql_get_proto_info mysql_get_server_info mysql_info mysql mysql_fieldname mysql_fieldtable mysql_fieldlen mysql_fieldtype mysql_fieldflags mysql_selectdb mysql_createdb mysql_dropdb mysql_freeresult mysql_numfields mysql_numrows mysql_listdbs mysql_listtables mysql_listfields mysql_db_name mysql_dbname mysql_tablename mysql_table_name pg_connect pg_pconnect pg_close pg_connection_status pg_connection_busy pg_connection_reset pg_host pg_dbname pg_port pg_tty pg_options pg_ping pg_query pg_send_query pg_cancel_query pg_fetch_result pg_fetch_row pg_fetch_assoc pg_fetch_array pg_fetch_object pg_fetch_all pg_affected_rows pg_get_result pg_result_seek pg_result_status pg_free_result pg_last_oid pg_num_rows pg_num_fields pg_field_name pg_field_num pg_field_size pg_field_type pg_field_prtlen pg_field_is_null pg_get_notify pg_get_pid pg_result_error pg_last_error pg_last_notice pg_put_line pg_end_copy pg_copy_to pg_copy_from pg_trace pg_untrace pg_lo_create pg_lo_unlink pg_lo_open pg_lo_close pg_lo_read pg_lo_write pg_lo_read_all pg_lo_import pg_lo_export pg_lo_seek pg_lo_tell pg_escape_string pg_escape_bytea pg_unescape_bytea pg_client_encoding pg_set_client_encoding pg_meta_data pg_convert pg_insert pg_update pg_delete pg_select pg_exec pg_getlastoid pg_cmdtuples pg_errormessage pg_numrows pg_numfields pg_fieldname pg_fieldsize pg_fieldtype pg_fieldnum pg_fieldprtlen pg_fieldisnull pg_freeresult pg_result pg_loreadall pg_locreate pg_lounlink pg_loopen pg_loclose pg_loread pg_lowrite pg_loimport pg_loexport http_response_code get_declared_traits getimagesizefromstring socket_import_stream stream_set_chunk_size trait_exists header_register_callback class_uses session_status session_register_shutdown echo print global static exit array empty eval isset unset die include require include_once require_once"),multiLineStrings:true,hooks:{"$":function(stream){stream.eatWhile(/[\w\$_]/);return"variable-2";},"<":function(stream,state){if(stream.match(/<</)){stream.eatWhile(/[\w\.]/);state.tokenize=heredoc(stream.current().slice(3));return state.tokenize(stream,state);}
return false;},"#":function(stream){while(!stream.eol()&&!stream.match("?>",false))stream.next();return"comment";},"/":function(stream){if(stream.eat("/")){while(!stream.eol()&&!stream.match("?>",false))stream.next();return"comment";}
return false;}}};CodeMirror.defineMode("php",function(config,parserConfig){var htmlMode=CodeMirror.getMode(config,"text/html");var phpMode=CodeMirror.getMode(config,phpConfig);function dispatch(stream,state){var isPHP=state.curMode==phpMode;if(stream.sol()&&state.pending!='"')state.pending=null;if(!isPHP){if(stream.match(/^<\?\w*/)){state.curMode=phpMode;state.curState=state.php;return"meta";}
if(state.pending=='"'){while(!stream.eol()&&stream.next()!='"'){}
var style="string";}else if(state.pending&&stream.pos<state.pending.end){stream.pos=state.pending.end;var style=state.pending.style;}else{var style=htmlMode.token(stream,state.curState);}
state.pending=null;var cur=stream.current(),openPHP=cur.search(/<\?/);if(openPHP!=-1){if(style=="string"&&/\"$/.test(cur)&&!/\?>/.test(cur))state.pending='"';else state.pending={end:stream.pos,style:style};stream.backUp(cur.length-openPHP);}
return style;}else if(isPHP&&state.php.tokenize==null&&stream.match("?>")){state.curMode=htmlMode;state.curState=state.html;return"meta";}else{return phpMode.token(stream,state.curState);}}
return{startState:function(){var html=CodeMirror.startState(htmlMode),php=CodeMirror.startState(phpMode);return{html:html,php:php,curMode:parserConfig.startOpen?phpMode:htmlMode,curState:parserConfig.startOpen?php:html,pending:null};},copyState:function(state){var html=state.html,htmlNew=CodeMirror.copyState(htmlMode,html),php=state.php,phpNew=CodeMirror.copyState(phpMode,php),cur;if(state.curMode==htmlMode)cur=htmlNew;else cur=phpNew;return{html:htmlNew,php:phpNew,curMode:state.curMode,curState:cur,pending:state.pending};},token:dispatch,indent:function(state,textAfter){if((state.curMode!=phpMode&&/^\s*<\//.test(textAfter))||(state.curMode==phpMode&&/^\?>/.test(textAfter)))
return htmlMode.indent(state.html,textAfter);return state.curMode.indent(state.curState,textAfter);},electricChars:"/{}:",blockCommentStart:"/*",blockCommentEnd:"*/",lineComment:"//",innerMode:function(state){return{state:state.curState,mode:state.curMode};}};},"htmlmixed","clike");CodeMirror.defineMIME("application/x-httpd-php","php");CodeMirror.defineMIME("application/x-httpd-php-open",{name:"php",startOpen:true});CodeMirror.defineMIME("text/x-php",phpConfig);})();;CodeMirror.defineMode("python",function(conf,parserConf){var ERRORCLASS='error';function wordRegexp(words){return new RegExp("^(("+words.join(")|(")+"))\\b");}
var singleOperators=parserConf.singleOperators||new RegExp("^[\\+\\-\\*/%&|\\^~<>!]");var singleDelimiters=parserConf.singleDelimiters||new RegExp('^[\\(\\)\\[\\]\\{\\}@,:`=;\\.]');var doubleOperators=parserConf.doubleOperators||new RegExp("^((==)|(!=)|(<=)|(>=)|(<>)|(<<)|(>>)|(//)|(\\*\\*))");var doubleDelimiters=parserConf.doubleDelimiters||new RegExp("^((\\+=)|(\\-=)|(\\*=)|(%=)|(/=)|(&=)|(\\|=)|(\\^=))");var tripleDelimiters=parserConf.tripleDelimiters||new RegExp("^((//=)|(>>=)|(<<=)|(\\*\\*=))");var identifiers=parserConf.identifiers||new RegExp("^[_A-Za-z][_A-Za-z0-9]*");var wordOperators=wordRegexp(['and','or','not','is','in']);var commonkeywords=['as','assert','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','lambda','pass','raise','return','try','while','with','yield'];var commonBuiltins=['abs','all','any','bin','bool','bytearray','callable','chr','classmethod','compile','complex','delattr','dict','dir','divmod','enumerate','eval','filter','float','format','frozenset','getattr','globals','hasattr','hash','help','hex','id','input','int','isinstance','issubclass','iter','len','list','locals','map','max','memoryview','min','next','object','oct','open','ord','pow','property','range','repr','reversed','round','set','setattr','slice','sorted','staticmethod','str','sum','super','tuple','type','vars','zip','__import__','NotImplemented','Ellipsis','__debug__'];var py2={'builtins':['apply','basestring','buffer','cmp','coerce','execfile','file','intern','long','raw_input','reduce','reload','unichr','unicode','xrange','False','True','None'],'keywords':['exec','print']};var py3={'builtins':['ascii','bytes','exec','print'],'keywords':['nonlocal','False','True','None']};if(parserConf.extra_keywords!=undefined){commonkeywords=commonkeywords.concat(parserConf.extra_keywords);}
if(parserConf.extra_builtins!=undefined){commonBuiltins=commonBuiltins.concat(parserConf.extra_builtins);}
if(!!parserConf.version&&parseInt(parserConf.version,10)===3){commonkeywords=commonkeywords.concat(py3.keywords);commonBuiltins=commonBuiltins.concat(py3.builtins);var stringPrefixes=new RegExp("^(([rb]|(br))?('{3}|\"{3}|['\"]))","i");}else{commonkeywords=commonkeywords.concat(py2.keywords);commonBuiltins=commonBuiltins.concat(py2.builtins);var stringPrefixes=new RegExp("^(([rub]|(ur)|(br))?('{3}|\"{3}|['\"]))","i");}
var keywords=wordRegexp(commonkeywords);var builtins=wordRegexp(commonBuiltins);var indentInfo=null;function tokenBase(stream,state){if(stream.sol()){var scopeOffset=state.scopes[0].offset;if(stream.eatSpace()){var lineOffset=stream.indentation();if(lineOffset>scopeOffset){indentInfo='indent';}else if(lineOffset<scopeOffset){indentInfo='dedent';}
return null;}else{if(scopeOffset>0){dedent(stream,state);}}}
if(stream.eatSpace()){return null;}
var ch=stream.peek();if(ch==='#'){stream.skipToEnd();return'comment';}
if(stream.match(/^[0-9\.]/,false)){var floatLiteral=false;if(stream.match(/^\d*\.\d+(e[\+\-]?\d+)?/i)){floatLiteral=true;}
if(stream.match(/^\d+\.\d*/)){floatLiteral=true;}
if(stream.match(/^\.\d+/)){floatLiteral=true;}
if(floatLiteral){stream.eat(/J/i);return'number';}
var intLiteral=false;if(stream.match(/^0x[0-9a-f]+/i)){intLiteral=true;}
if(stream.match(/^0b[01]+/i)){intLiteral=true;}
if(stream.match(/^0o[0-7]+/i)){intLiteral=true;}
if(stream.match(/^[1-9]\d*(e[\+\-]?\d+)?/)){stream.eat(/J/i);intLiteral=true;}
if(stream.match(/^0(?![\dx])/i)){intLiteral=true;}
if(intLiteral){stream.eat(/L/i);return'number';}}
if(stream.match(stringPrefixes)){state.tokenize=tokenStringFactory(stream.current());return state.tokenize(stream,state);}
if(stream.match(tripleDelimiters)||stream.match(doubleDelimiters)){return null;}
if(stream.match(doubleOperators)||stream.match(singleOperators)||stream.match(wordOperators)){return'operator';}
if(stream.match(singleDelimiters)){return null;}
if(stream.match(keywords)){return'keyword';}
if(stream.match(builtins)){return'builtin';}
if(stream.match(identifiers)){if(state.lastToken=='def'||state.lastToken=='class'){return'def';}
return'variable';}
stream.next();return ERRORCLASS;}
function tokenStringFactory(delimiter){while('rub'.indexOf(delimiter.charAt(0).toLowerCase())>=0){delimiter=delimiter.substr(1);}
var singleline=delimiter.length==1;var OUTCLASS='string';function tokenString(stream,state){while(!stream.eol()){stream.eatWhile(/[^'"\\]/);if(stream.eat('\\')){stream.next();if(singleline&&stream.eol()){return OUTCLASS;}}else if(stream.match(delimiter)){state.tokenize=tokenBase;return OUTCLASS;}else{stream.eat(/['"]/);}}
if(singleline){if(parserConf.singleLineStringErrors){return ERRORCLASS;}else{state.tokenize=tokenBase;}}
return OUTCLASS;}
tokenString.isString=true;return tokenString;}
function indent(stream,state,type){type=type||'py';var indentUnit=0;if(type==='py'){if(state.scopes[0].type!=='py'){state.scopes[0].offset=stream.indentation();return;}
for(var i=0;i<state.scopes.length;++i){if(state.scopes[i].type==='py'){indentUnit=state.scopes[i].offset+conf.indentUnit;break;}}}else{indentUnit=stream.column()+stream.current().length;}
state.scopes.unshift({offset:indentUnit,type:type});}
function dedent(stream,state,type){type=type||'py';if(state.scopes.length==1)return;if(state.scopes[0].type==='py'){var _indent=stream.indentation();var _indent_index=-1;for(var i=0;i<state.scopes.length;++i){if(_indent===state.scopes[i].offset){_indent_index=i;break;}}
if(_indent_index===-1){return true;}
while(state.scopes[0].offset!==_indent){state.scopes.shift();}
return false;}else{if(type==='py'){state.scopes[0].offset=stream.indentation();return false;}else{if(state.scopes[0].type!=type){return true;}
state.scopes.shift();return false;}}}
function tokenLexer(stream,state){indentInfo=null;var style=state.tokenize(stream,state);var current=stream.current();if(current==='.'){style=stream.match(identifiers,false)?null:ERRORCLASS;if(style===null&&state.lastStyle==='meta'){style='meta';}
return style;}
if(current==='@'){return stream.match(identifiers,false)?'meta':ERRORCLASS;}
if((style==='variable'||style==='builtin')&&state.lastStyle==='meta'){style='meta';}
if(current==='pass'||current==='return'){state.dedent+=1;}
if(current==='lambda')state.lambda=true;if((current===':'&&!state.lambda&&state.scopes[0].type=='py')||indentInfo==='indent'){indent(stream,state);}
var delimiter_index='[({'.indexOf(current);if(delimiter_index!==-1){indent(stream,state,'])}'.slice(delimiter_index,delimiter_index+1));}
if(indentInfo==='dedent'){if(dedent(stream,state)){return ERRORCLASS;}}
delimiter_index='])}'.indexOf(current);if(delimiter_index!==-1){if(dedent(stream,state,current)){return ERRORCLASS;}}
if(state.dedent>0&&stream.eol()&&state.scopes[0].type=='py'){if(state.scopes.length>1)state.scopes.shift();state.dedent-=1;}
return style;}
var external={startState:function(basecolumn){return{tokenize:tokenBase,scopes:[{offset:basecolumn||0,type:'py'}],lastStyle:null,lastToken:null,lambda:false,dedent:0};},token:function(stream,state){var style=tokenLexer(stream,state);state.lastStyle=style;var current=stream.current();if(current&&style){state.lastToken=current;}
if(stream.eol()&&state.lambda){state.lambda=false;}
return style;},indent:function(state){if(state.tokenize!=tokenBase){return state.tokenize.isString?CodeMirror.Pass:0;}
return state.scopes[0].offset;},lineComment:"#",fold:"indent"};return external;});CodeMirror.defineMIME("text/x-python","python");(function(){"use strict";var words=function(str){return str.split(' ');};CodeMirror.defineMIME("text/x-cython",{name:"python",extra_keywords:words("by cdef cimport cpdef ctypedef enum except"+"extern gil include nogil property public"+"readonly struct union DEF IF ELIF ELSE")});})();;CodeMirror.defineMode('shell',function(){var words={};function define(style,string){var split=string.split(' ');for(var i=0;i<split.length;i++){words[split[i]]=style;}};define('atom','true false');define('keyword','if then do else elif while until for in esac fi fin '+'fil done exit set unset export function');define('builtin','ab awk bash beep cat cc cd chown chmod chroot clear cp '+'curl cut diff echo find gawk gcc get git grep kill killall ln ls make '+'mkdir openssl mv nc node npm ping ps restart rm rmdir sed service sh '+'shopt shred source sort sleep ssh start stop su sudo tee telnet top '+'touch vi vim wall wc wget who write yes zsh');function tokenBase(stream,state){var sol=stream.sol();var ch=stream.next();if(ch==='\''||ch==='"'||ch==='`'){state.tokens.unshift(tokenString(ch));return tokenize(stream,state);}
if(ch==='#'){if(sol&&stream.eat('!')){stream.skipToEnd();return'meta';}
stream.skipToEnd();return'comment';}
if(ch==='$'){state.tokens.unshift(tokenDollar);return tokenize(stream,state);}
if(ch==='+'||ch==='='){return'operator';}
if(ch==='-'){stream.eat('-');stream.eatWhile(/\w/);return'attribute';}
if(/\d/.test(ch)){stream.eatWhile(/\d/);if(!/\w/.test(stream.peek())){return'number';}}
stream.eatWhile(/[\w-]/);var cur=stream.current();if(stream.peek()==='='&&/\w+/.test(cur))return'def';return words.hasOwnProperty(cur)?words[cur]:null;}
function tokenString(quote){return function(stream,state){var next,end=false,escaped=false;while((next=stream.next())!=null){if(next===quote&&!escaped){end=true;break;}
if(next==='$'&&!escaped&&quote!=='\''){escaped=true;stream.backUp(1);state.tokens.unshift(tokenDollar);break;}
escaped=!escaped&&next==='\\';}
if(end||!escaped){state.tokens.shift();}
return(quote==='`'||quote===')'?'quote':'string');};};var tokenDollar=function(stream,state){if(state.tokens.length>1)stream.eat('$');var ch=stream.next(),hungry=/\w/;if(ch==='{')hungry=/[^}]/;if(ch==='('){state.tokens[0]=tokenString(')');return tokenize(stream,state);}
if(!/\d/.test(ch)){stream.eatWhile(hungry);stream.eat('}');}
state.tokens.shift();return'def';};function tokenize(stream,state){return(state.tokens[0]||tokenBase)(stream,state);};return{startState:function(){return{tokens:[]};},token:function(stream,state){if(stream.eatSpace())return null;return tokenize(stream,state);}};});CodeMirror.defineMIME('text/x-sh','shell');;WebInspector.CodeMirrorUtils=function()
{WebInspector.InplaceEditor.call(this);}
WebInspector.CodeMirrorUtils.toPos=function(range)
{return{start:new CodeMirror.Pos(range.startLine,range.startColumn),end:new CodeMirror.Pos(range.endLine,range.endColumn)}},WebInspector.CodeMirrorUtils.toRange=function(start,end)
{return new WebInspector.TextRange(start.line,start.ch,end.line,end.ch);},WebInspector.CodeMirrorUtils.prototype={editorContent:function(editingContext){return editingContext.codeMirror.getValue();},_consumeCopy:function(e)
{e.consume();},setUpEditor:function(editingContext)
{var element=editingContext.element;var config=editingContext.config;editingContext.cssLoadView=new WebInspector.CodeMirrorCSSLoadView();editingContext.cssLoadView.show(element);WebInspector.setCurrentFocusElement(element);element.addEventListener("copy",this._consumeCopy,false);var codeMirror=window.CodeMirror(element,{mode:config.mode,lineWrapping:config.lineWrapping,smartIndent:config.smartIndent,autofocus:true,theme:config.theme,value:config.initialValue});codeMirror.getWrapperElement().classList.add("source-code");codeMirror.on("cursorActivity",function(cm){cm.display.cursorDiv.scrollIntoViewIfNeeded(false);});editingContext.codeMirror=codeMirror;},closeEditor:function(editingContext)
{editingContext.element.removeEventListener("copy",this._consumeCopy,false);editingContext.cssLoadView.detach();},cancelEditing:function(editingContext)
{editingContext.codeMirror.setValue(editingContext.oldText);},augmentEditingHandle:function(editingContext,handle)
{function setWidth(editingContext,width)
{var padding=30;var codeMirror=editingContext.codeMirror;codeMirror.getWrapperElement().style.width=(width-codeMirror.getWrapperElement().offsetLeft-padding)+"px";codeMirror.refresh();}
handle.codeMirror=editingContext.codeMirror;handle.setWidth=setWidth.bind(null,editingContext);},__proto__:WebInspector.InplaceEditor.prototype}
WebInspector.CodeMirrorUtils.TokenizerFactory=function(){}
WebInspector.CodeMirrorUtils.TokenizerFactory.prototype={createTokenizer:function(mimeType)
{var mode=CodeMirror.getMode({indentUnit:2},mimeType);var state=CodeMirror.startState(mode);function tokenize(line,callback)
{var stream=new CodeMirror.StringStream(line);while(!stream.eol()){var style=mode.token(stream,state);var value=stream.current();callback(value,style,stream.start,stream.start+value.length);stream.start=stream.pos;}}
return tokenize;}}
WebInspector.CodeMirrorCSSLoadView=function()
{WebInspector.VBox.call(this);this.element.classList.add("hidden");this.registerRequiredCSS("cm/codemirror.css");this.registerRequiredCSS("cm/cmdevtools.css");}
WebInspector.CodeMirrorCSSLoadView.prototype={__proto__:WebInspector.VBox.prototype};WebInspector.CodeMirrorTextEditor=function(url,delegate)
{WebInspector.VBox.call(this);this._delegate=delegate;this._url=url;this.registerRequiredCSS("cm/codemirror.css");this.registerRequiredCSS("cm/cmdevtools.css");this._codeMirror=window.CodeMirror(this.element,{lineNumbers:true,gutters:["CodeMirror-linenumbers"],matchBrackets:true,smartIndent:false,styleSelectedText:true,electricChars:false,});this._codeMirror._codeMirrorTextEditor=this;CodeMirror.keyMap["devtools-common"]={"Left":"goCharLeft","Right":"goCharRight","Up":"goLineUp","Down":"goLineDown","End":"goLineEnd","Home":"goLineStartSmart","PageUp":"goPageUp","PageDown":"goPageDown","Delete":"delCharAfter","Backspace":"delCharBefore","Tab":"defaultTab","Shift-Tab":"indentLess","Enter":"smartNewlineAndIndent","Ctrl-Space":"autocomplete","Esc":"dismissMultipleSelections"};CodeMirror.keyMap["devtools-pc"]={"Ctrl-A":"selectAll","Ctrl-Z":"undoAndReveal","Shift-Ctrl-Z":"redoAndReveal","Ctrl-Y":"redo","Ctrl-Home":"goDocStart","Ctrl-Up":"goDocStart","Ctrl-End":"goDocEnd","Ctrl-Down":"goDocEnd","Ctrl-Left":"goGroupLeft","Ctrl-Right":"goGroupRight","Alt-Left":"goLineStart","Alt-Right":"goLineEnd","Ctrl-Backspace":"delGroupBefore","Ctrl-Delete":"delGroupAfter","Ctrl-/":"toggleComment","Ctrl-D":"selectNextOccurrence","Ctrl-U":"undoLastSelection",fallthrough:"devtools-common"};CodeMirror.keyMap["devtools-mac"]={"Cmd-A":"selectAll","Cmd-Z":"undoAndReveal","Shift-Cmd-Z":"redoAndReveal","Cmd-Up":"goDocStart","Cmd-Down":"goDocEnd","Alt-Left":"goGroupLeft","Alt-Right":"goGroupRight","Cmd-Left":"goLineStartSmart","Cmd-Right":"goLineEnd","Alt-Backspace":"delGroupBefore","Alt-Delete":"delGroupAfter","Cmd-/":"toggleComment","Cmd-D":"selectNextOccurrence","Cmd-U":"undoLastSelection",fallthrough:"devtools-common"};WebInspector.settings.textEditorIndent.addChangeListener(this._updateEditorIndentation,this);this._updateEditorIndentation();WebInspector.settings.showWhitespacesInEditor.addChangeListener(this._updateCodeMirrorMode,this);WebInspector.settings.textEditorBracketMatching.addChangeListener(this._enableBracketMatchingIfNeeded,this);this._enableBracketMatchingIfNeeded();this._codeMirror.setOption("keyMap",WebInspector.isMac()?"devtools-mac":"devtools-pc");this._codeMirror.setOption("flattenSpans",false);this._codeMirror.setOption("maxHighlightLength",WebInspector.CodeMirrorTextEditor.maxHighlightLength);this._codeMirror.setOption("mode",null);this._codeMirror.setOption("crudeMeasuringFrom",1000);this._shouldClearHistory=true;this._lineSeparator="\n";this._autocompleteController=WebInspector.CodeMirrorTextEditor.AutocompleteController.Dummy;this._tokenHighlighter=new WebInspector.CodeMirrorTextEditor.TokenHighlighter(this,this._codeMirror);this._blockIndentController=new WebInspector.CodeMirrorTextEditor.BlockIndentController(this._codeMirror);this._fixWordMovement=new WebInspector.CodeMirrorTextEditor.FixWordMovement(this._codeMirror);this._selectNextOccurrenceController=new WebInspector.CodeMirrorTextEditor.SelectNextOccurrenceController(this,this._codeMirror);this._codeMirror.on("changes",this._changes.bind(this));this._codeMirror.on("gutterClick",this._gutterClick.bind(this));this._codeMirror.on("cursorActivity",this._cursorActivity.bind(this));this._codeMirror.on("beforeSelectionChange",this._beforeSelectionChange.bind(this));this._codeMirror.on("scroll",this._scroll.bind(this));this._codeMirror.on("focus",this._focus.bind(this));this.element.addEventListener("contextmenu",this._contextMenu.bind(this),false);function updateAnticipateJumpFlag(value)
{this._isHandlingMouseDownEvent=value;}
this.element.addEventListener("mousedown",updateAnticipateJumpFlag.bind(this,true),true);this.element.addEventListener("mousedown",updateAnticipateJumpFlag.bind(this,false),false);this.element.style.overflow="hidden";this.element.firstChild.classList.add("source-code");this.element.firstChild.classList.add("fill");this._elementToWidget=new Map();this._nestedUpdatesCounter=0;this.element.addEventListener("focus",this._handleElementFocus.bind(this),false);this.element.addEventListener("keydown",this._handleKeyDown.bind(this),true);this.element.addEventListener("keydown",this._handlePostKeyDown.bind(this),false);this.element.tabIndex=0;this._setupWhitespaceHighlight();}
WebInspector.CodeMirrorTextEditor.BeforeChangeObject;WebInspector.CodeMirrorTextEditor.ChangeObject;WebInspector.CodeMirrorTextEditor.maxHighlightLength=1000;WebInspector.CodeMirrorTextEditor.autocompleteCommand=function(codeMirror)
{codeMirror._codeMirrorTextEditor._autocompleteController.autocomplete();}
CodeMirror.commands.autocomplete=WebInspector.CodeMirrorTextEditor.autocompleteCommand;WebInspector.CodeMirrorTextEditor.undoLastSelectionCommand=function(codeMirror)
{codeMirror._codeMirrorTextEditor._selectNextOccurrenceController.undoLastSelection();}
CodeMirror.commands.undoLastSelection=WebInspector.CodeMirrorTextEditor.undoLastSelectionCommand;WebInspector.CodeMirrorTextEditor.selectNextOccurrenceCommand=function(codeMirror)
{codeMirror._codeMirrorTextEditor._selectNextOccurrenceController.selectNextOccurrence();}
CodeMirror.commands.selectNextOccurrence=WebInspector.CodeMirrorTextEditor.selectNextOccurrenceCommand;CodeMirror.commands.smartNewlineAndIndent=function(codeMirror)
{codeMirror.operation(innerSmartNewlineAndIndent.bind(null,codeMirror));function countIndent(line)
{for(var i=0;i<line.length;++i){if(!WebInspector.TextUtils.isSpaceChar(line[i]))
return i;}
return line.length;}
function innerSmartNewlineAndIndent(codeMirror)
{var cur=codeMirror.getCursor("start");var line=codeMirror.getLine(cur.line);var indent=cur.line>0?countIndent(line):0;if(cur.ch<=indent){codeMirror.replaceSelection("\n"+line.substring(0,cur.ch),"end","+input");codeMirror.setSelection(new CodeMirror.Pos(cur.line+1,cur.ch));}else
codeMirror.execCommand("newlineAndIndent");}}
CodeMirror.commands.undoAndReveal=function(codemirror)
{var scrollInfo=codemirror.getScrollInfo();codemirror.execCommand("undo");var cursor=codemirror.getCursor("start");codemirror._codeMirrorTextEditor._innerRevealLine(cursor.line,scrollInfo);codemirror._codeMirrorTextEditor._autocompleteController.finishAutocomplete();}
CodeMirror.commands.redoAndReveal=function(codemirror)
{var scrollInfo=codemirror.getScrollInfo();codemirror.execCommand("redo");var cursor=codemirror.getCursor("start");codemirror._codeMirrorTextEditor._innerRevealLine(cursor.line,scrollInfo);codemirror._codeMirrorTextEditor._autocompleteController.finishAutocomplete();}
CodeMirror.commands.dismissMultipleSelections=function(codemirror)
{var selections=codemirror.listSelections();var selection=selections[0];if(selections.length===1){if(codemirror._codeMirrorTextEditor._isSearchActive())
return CodeMirror.Pass;if(WebInspector.CodeMirrorUtils.toRange(selection.anchor,selection.head).isEmpty())
return CodeMirror.Pass;codemirror.setSelection(selection.anchor,selection.anchor,{scroll:false});codemirror._codeMirrorTextEditor._revealLine(selection.anchor.line);return;}
codemirror.setSelection(selection.anchor,selection.head,{scroll:false});codemirror._codeMirrorTextEditor._revealLine(selection.anchor.line);}
WebInspector.CodeMirrorTextEditor.LongLineModeLineLengthThreshold=2000;WebInspector.CodeMirrorTextEditor.MaximumNumberOfWhitespacesPerSingleSpan=16;WebInspector.CodeMirrorTextEditor.MaxEditableTextSize=1024*1024*10;WebInspector.CodeMirrorTextEditor.prototype={dispose:function()
{WebInspector.settings.textEditorIndent.removeChangeListener(this._updateEditorIndentation,this);WebInspector.settings.showWhitespacesInEditor.removeChangeListener(this._updateCodeMirrorMode,this);WebInspector.settings.textEditorBracketMatching.removeChangeListener(this._enableBracketMatchingIfNeeded,this);},_enableBracketMatchingIfNeeded:function()
{this._codeMirror.setOption("autoCloseBrackets",WebInspector.settings.textEditorBracketMatching.get()?{explode:false}:false);},wasShown:function()
{if(this._wasOnceShown)
return;this._wasOnceShown=true;this._codeMirror.refresh();},_guessIndentationLevel:function()
{var tabRegex=/^\t+/;var tabLines=0;var indents={};function processLine(lineHandle)
{var text=lineHandle.text;if(text.length===0||!WebInspector.TextUtils.isSpaceChar(text[0]))
return;if(tabRegex.test(text)){++tabLines;return;}
var i=0;while(i<text.length&&WebInspector.TextUtils.isSpaceChar(text[i]))
++i;if(i%2!==0)
return;indents[i]=1+(indents[i]||0);}
this._codeMirror.eachLine(0,1000,processLine);var onePercentFilterThreshold=this.linesCount/100;if(tabLines&&tabLines>onePercentFilterThreshold)
return"\t";var minimumIndent=Infinity;for(var i in indents){if(indents[i]<onePercentFilterThreshold)
continue;var indent=parseInt(i,10);if(minimumIndent>indent)
minimumIndent=indent;}
if(minimumIndent===Infinity)
return WebInspector.TextUtils.Indent.FourSpaces;return new Array(minimumIndent+1).join(" ");},_updateEditorIndentation:function()
{var extraKeys={};var indent=WebInspector.settings.textEditorIndent.get();if(WebInspector.settings.textEditorAutoDetectIndent.get())
indent=this._guessIndentationLevel();if(indent===WebInspector.TextUtils.Indent.TabCharacter){this._codeMirror.setOption("indentWithTabs",true);this._codeMirror.setOption("indentUnit",4);}else{this._codeMirror.setOption("indentWithTabs",false);this._codeMirror.setOption("indentUnit",indent.length);extraKeys.Tab=function(codeMirror)
{if(codeMirror.somethingSelected())
return CodeMirror.Pass;var pos=codeMirror.getCursor("head");codeMirror.replaceRange(indent.substring(pos.ch%indent.length),codeMirror.getCursor());}}
this._codeMirror.setOption("extraKeys",extraKeys);this._indentationLevel=indent;},indent:function()
{return this._indentationLevel;},_isSearchActive:function()
{return!!this._tokenHighlighter.highlightedRegex();},highlightSearchResults:function(regex,range)
{function innerHighlightRegex()
{if(range){this._revealLine(range.startLine);if(range.endColumn>WebInspector.CodeMirrorTextEditor.maxHighlightLength)
this.setSelection(range);else
this.setSelection(WebInspector.TextRange.createFromLocation(range.startLine,range.startColumn));}else{this.setSelection(this.selection().collapseToEnd());}
this._tokenHighlighter.highlightSearchResults(regex,range);}
if(!this._selectionBeforeSearch)
this._selectionBeforeSearch=this.selection();this._codeMirror.operation(innerHighlightRegex.bind(this));},cancelSearchResultsHighlight:function()
{this._codeMirror.operation(this._tokenHighlighter.highlightSelectedTokens.bind(this._tokenHighlighter));if(this._selectionBeforeSearch){this._reportJump(this._selectionBeforeSearch,this.selection());delete this._selectionBeforeSearch;}},undo:function()
{this._codeMirror.undo();},redo:function()
{this._codeMirror.redo();},_setupWhitespaceHighlight:function()
{if(WebInspector.CodeMirrorTextEditor._whitespaceStyleInjected||!WebInspector.settings.showWhitespacesInEditor.get())
return;WebInspector.CodeMirrorTextEditor._whitespaceStyleInjected=true;const classBase=".show-whitespaces .CodeMirror .cm-whitespace-";const spaceChar="·";var spaceChars="";var rules="";for(var i=1;i<=WebInspector.CodeMirrorTextEditor.MaximumNumberOfWhitespacesPerSingleSpan;++i){spaceChars+=spaceChar;var rule=classBase+i+"::before { content: '"+spaceChars+"';}\n";rules+=rule;}
var style=document.createElement("style");style.textContent=rules;document.head.appendChild(style);},_handleKeyDown:function(e)
{if(this._autocompleteController.keyDown(e))
e.consume(true);},_handlePostKeyDown:function(e)
{if(e.defaultPrevented)
e.consume(true);},setCompletionDictionary:function(dictionary)
{this._autocompleteController.dispose();if(dictionary)
this._autocompleteController=new WebInspector.CodeMirrorTextEditor.AutocompleteController(this,this._codeMirror,dictionary);else
this._autocompleteController=WebInspector.CodeMirrorTextEditor.AutocompleteController.Dummy;},cursorPositionToCoordinates:function(lineNumber,column)
{if(lineNumber>=this._codeMirror.lineCount()||lineNumber<0||column<0||column>this._codeMirror.getLine(lineNumber).length)
return null;var metrics=this._codeMirror.cursorCoords(new CodeMirror.Pos(lineNumber,column));return{x:metrics.left,y:metrics.top,height:metrics.bottom-metrics.top};},coordinatesToCursorPosition:function(x,y)
{var element=document.elementFromPoint(x,y);if(!element||!element.isSelfOrDescendant(this._codeMirror.getWrapperElement()))
return null;var gutterBox=this._codeMirror.getGutterElement().boxInWindow();if(x>=gutterBox.x&&x<=gutterBox.x+gutterBox.width&&y>=gutterBox.y&&y<=gutterBox.y+gutterBox.height)
return null;var coords=this._codeMirror.coordsChar({left:x,top:y});return WebInspector.CodeMirrorUtils.toRange(coords,coords);},tokenAtTextPosition:function(lineNumber,column)
{if(lineNumber<0||lineNumber>=this._codeMirror.lineCount())
return null;var token=this._codeMirror.getTokenAt(new CodeMirror.Pos(lineNumber,(column||0)+1));if(!token||!token.type)
return null;return{startColumn:token.start,endColumn:token.end-1,type:token.type};},copyRange:function(textRange)
{var pos=WebInspector.CodeMirrorUtils.toPos(textRange.normalize());return this._codeMirror.getRange(pos.start,pos.end);},isClean:function()
{return this._codeMirror.isClean();},markClean:function()
{this._codeMirror.markClean();},_hasLongLines:function()
{function lineIterator(lineHandle)
{if(lineHandle.text.length>WebInspector.CodeMirrorTextEditor.LongLineModeLineLengthThreshold)
hasLongLines=true;return hasLongLines;}
var hasLongLines=false;this._codeMirror.eachLine(lineIterator);return hasLongLines;},_whitespaceOverlayMode:function(mimeType)
{var modeName=CodeMirror.mimeModes[mimeType]?(CodeMirror.mimeModes[mimeType].name||CodeMirror.mimeModes[mimeType]):CodeMirror.mimeModes["text/plain"];modeName+="+whitespaces";if(CodeMirror.modes[modeName])
return modeName;function modeConstructor(config,parserConfig)
{function nextToken(stream)
{if(stream.peek()===" "){var spaces=0;while(spaces<WebInspector.CodeMirrorTextEditor.MaximumNumberOfWhitespacesPerSingleSpan&&stream.peek()===" "){++spaces;stream.next();}
return"whitespace whitespace-"+spaces;}
while(!stream.eol()&&stream.peek()!==" ")
stream.next();return null;}
var whitespaceMode={token:nextToken};return CodeMirror.overlayMode(CodeMirror.getMode(config,mimeType),whitespaceMode,false);}
CodeMirror.defineMode(modeName,modeConstructor);return modeName;},_enableLongLinesMode:function()
{this._codeMirror.setOption("styleSelectedText",false);this._longLinesMode=true;},_disableLongLinesMode:function()
{this._codeMirror.setOption("styleSelectedText",true);this._longLinesMode=false;},_updateCodeMirrorMode:function()
{var showWhitespaces=WebInspector.settings.showWhitespacesInEditor.get();this.element.classList.toggle("show-whitespaces",showWhitespaces);this._codeMirror.setOption("mode",showWhitespaces?this._whitespaceOverlayMode(this._mimeType):this._mimeType);},setMimeType:function(mimeType)
{this._mimeType=mimeType;if(this._hasLongLines())
this._enableLongLinesMode();else
this._disableLongLinesMode();this._updateCodeMirrorMode();this._autocompleteController.setMimeType(mimeType);},setReadOnly:function(readOnly)
{this.element.classList.toggle("CodeMirror-readonly",readOnly)
this._codeMirror.setOption("readOnly",readOnly);},readOnly:function()
{return!!this._codeMirror.getOption("readOnly");},removeHighlight:function(highlightDescriptor)
{highlightDescriptor.clear();},highlightRange:function(range,cssClass)
{cssClass="CodeMirror-persist-highlight "+cssClass;var pos=WebInspector.CodeMirrorUtils.toPos(range);++pos.end.ch;return this._codeMirror.markText(pos.start,pos.end,{className:cssClass,startStyle:cssClass+"-start",endStyle:cssClass+"-end"});},defaultFocusedElement:function()
{return this.element;},focus:function()
{this._codeMirror.focus();},_handleElementFocus:function()
{this._codeMirror.focus();},beginUpdates:function()
{++this._nestedUpdatesCounter;},endUpdates:function()
{if(!--this._nestedUpdatesCounter)
this._codeMirror.refresh();},_revealLine:function(lineNumber)
{this._innerRevealLine(lineNumber,this._codeMirror.getScrollInfo());},_innerRevealLine:function(lineNumber,scrollInfo)
{var topLine=this._codeMirror.lineAtHeight(scrollInfo.top,"local");var bottomLine=this._codeMirror.lineAtHeight(scrollInfo.top+scrollInfo.clientHeight,"local");var linesPerScreen=bottomLine-topLine+1;if(lineNumber<topLine){var topLineToReveal=Math.max(lineNumber-(linesPerScreen/2)+1,0)|0;this._codeMirror.scrollIntoView(new CodeMirror.Pos(topLineToReveal,0));}else if(lineNumber>bottomLine){var bottomLineToReveal=Math.min(lineNumber+(linesPerScreen/2)-1,this.linesCount-1)|0;this._codeMirror.scrollIntoView(new CodeMirror.Pos(bottomLineToReveal,0));}},_gutterClick:function(instance,lineNumber,gutter,event)
{this.dispatchEventToListeners(WebInspector.TextEditor.Events.GutterClick,{lineNumber:lineNumber,event:event});},_contextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);var target=event.target.enclosingNodeOrSelfWithClass("CodeMirror-gutter-elt");if(target)
this._delegate.populateLineGutterContextMenu(contextMenu,parseInt(target.textContent,10)-1);else
this._delegate.populateTextAreaContextMenu(contextMenu,0);contextMenu.show();},addBreakpoint:function(lineNumber,disabled,conditional)
{if(lineNumber<0||lineNumber>=this._codeMirror.lineCount())
return;var className="cm-breakpoint"+(conditional?" cm-breakpoint-conditional":"")+(disabled?" cm-breakpoint-disabled":"");this._codeMirror.addLineClass(lineNumber,"wrap",className);},removeBreakpoint:function(lineNumber)
{if(lineNumber<0||lineNumber>=this._codeMirror.lineCount())
return;var wrapClasses=this._codeMirror.getLineHandle(lineNumber).wrapClass;if(!wrapClasses)
return;var classes=wrapClasses.split(" ");for(var i=0;i<classes.length;++i){if(classes[i].startsWith("cm-breakpoint"))
this._codeMirror.removeLineClass(lineNumber,"wrap",classes[i]);}},setExecutionLine:function(lineNumber)
{this.clearPositionHighlight();this._executionLine=this._codeMirror.getLineHandle(lineNumber);if(!this._executionLine)
return;this._codeMirror.addLineClass(this._executionLine,"wrap","cm-execution-line");},clearExecutionLine:function()
{this.clearPositionHighlight();if(this._executionLine)
this._codeMirror.removeLineClass(this._executionLine,"wrap","cm-execution-line");delete this._executionLine;},addDecoration:function(lineNumber,element)
{var widget=this._codeMirror.addLineWidget(lineNumber,element);this._elementToWidget.put(element,widget);},removeDecoration:function(lineNumber,element)
{var widget=this._elementToWidget.remove(element);if(widget)
this._codeMirror.removeLineWidget(widget);},revealPosition:function(lineNumber,columnNumber,shouldHighlight)
{lineNumber=Number.constrain(lineNumber,0,this._codeMirror.lineCount()-1);if(typeof columnNumber!=="number")
columnNumber=0;columnNumber=Number.constrain(columnNumber,0,this._codeMirror.getLine(lineNumber).length);this.clearPositionHighlight();this._highlightedLine=this._codeMirror.getLineHandle(lineNumber);if(!this._highlightedLine)
return;this._revealLine(lineNumber);if(shouldHighlight){this._codeMirror.addLineClass(this._highlightedLine,null,"cm-highlight");this._clearHighlightTimeout=setTimeout(this.clearPositionHighlight.bind(this),2000);}
this.setSelection(WebInspector.TextRange.createFromLocation(lineNumber,columnNumber));},clearPositionHighlight:function()
{if(this._clearHighlightTimeout)
clearTimeout(this._clearHighlightTimeout);delete this._clearHighlightTimeout;if(this._highlightedLine)
this._codeMirror.removeLineClass(this._highlightedLine,null,"cm-highlight");delete this._highlightedLine;},elementsToRestoreScrollPositionsFor:function()
{return[];},inheritScrollPositions:function(textEditor)
{},_updatePaddingBottom:function(width,height)
{var scrollInfo=this._codeMirror.getScrollInfo();var newPaddingBottom;var linesElement=this.element.firstElementChild.querySelector(".CodeMirror-lines");var lineCount=this._codeMirror.lineCount();if(lineCount<=1)
newPaddingBottom=0;else
newPaddingBottom=Math.max(scrollInfo.clientHeight-this._codeMirror.getLineHandle(this._codeMirror.lastLine()).height,0);newPaddingBottom+="px";linesElement.style.paddingBottom=newPaddingBottom;this._codeMirror.setSize(width,height);},_resizeEditor:function()
{var parentElement=this.element.parentElement;if(!parentElement||!this.isShowing())
return;var scrollLeft=this._codeMirror.doc.scrollLeft;var scrollTop=this._codeMirror.doc.scrollTop;var width=parentElement.offsetWidth;var height=parentElement.offsetHeight;this._codeMirror.setSize(width,height);this._updatePaddingBottom(width,height);this._codeMirror.scrollTo(scrollLeft,scrollTop);},onResize:function()
{this._autocompleteController.finishAutocomplete();this._resizeEditor();},editRange:function(range,text)
{var pos=WebInspector.CodeMirrorUtils.toPos(range);this._codeMirror.replaceRange(text,pos.start,pos.end);var newRange=WebInspector.CodeMirrorUtils.toRange(pos.start,this._codeMirror.posFromIndex(this._codeMirror.indexFromPos(pos.start)+text.length));this._delegate.onTextChanged(range,newRange);if(WebInspector.settings.textEditorAutoDetectIndent.get())
this._updateEditorIndentation();return newRange;},_wordRangeForCursorPosition:function(lineNumber,column,isWordChar)
{var line=this.line(lineNumber);var wordStart=column;if(column!==0&&isWordChar(line.charAt(column-1))){wordStart=column-1;while(wordStart>0&&isWordChar(line.charAt(wordStart-1)))
--wordStart;}
var wordEnd=column;while(wordEnd<line.length&&isWordChar(line.charAt(wordEnd)))
++wordEnd;return new WebInspector.TextRange(lineNumber,wordStart,lineNumber,wordEnd);},_changeObjectToEditOperation:function(changeObject)
{var oldRange=WebInspector.CodeMirrorUtils.toRange(changeObject.from,changeObject.to);var newRange=oldRange.clone();var linesAdded=changeObject.text.length;if(linesAdded===0){newRange.endLine=newRange.startLine;newRange.endColumn=newRange.startColumn;}else if(linesAdded===1){newRange.endLine=newRange.startLine;newRange.endColumn=newRange.startColumn+changeObject.text[0].length;}else{newRange.endLine=newRange.startLine+linesAdded-1;newRange.endColumn=changeObject.text[linesAdded-1].length;}
return{oldRange:oldRange,newRange:newRange};},_changes:function(codeMirror,changes)
{if(!changes.length)
return;var hasOneLine=this._codeMirror.lineCount()===1;if(hasOneLine!==this._hasOneLine)
this._resizeEditor();this._hasOneLine=hasOneLine;var widgets=this._elementToWidget.values();for(var i=0;i<widgets.length;++i)
this._codeMirror.removeLineWidget(widgets[i]);this._elementToWidget.clear();for(var changeIndex=0;changeIndex<changes.length;++changeIndex){var changeObject=changes[changeIndex];var editInfo=this._changeObjectToEditOperation(changeObject);if(!this._muteTextChangedEvent)
this._delegate.onTextChanged(editInfo.oldRange,editInfo.newRange);}},_cursorActivity:function()
{var start=this._codeMirror.getCursor("anchor");var end=this._codeMirror.getCursor("head");this._delegate.selectionChanged(WebInspector.CodeMirrorUtils.toRange(start,end));if(!this._isSearchActive())
this._codeMirror.operation(this._tokenHighlighter.highlightSelectedTokens.bind(this._tokenHighlighter));},_beforeSelectionChange:function(codeMirror,selection)
{this._selectNextOccurrenceController.selectionWillChange();if(!this._isHandlingMouseDownEvent)
return;if(!selection.ranges.length)
return;var primarySelection=selection.ranges[0];this._reportJump(this.selection(),WebInspector.CodeMirrorUtils.toRange(primarySelection.anchor,primarySelection.head));},_reportJump:function(from,to)
{if(from&&to&&from.equal(to))
return;this._delegate.onJumpToPosition(from,to);},_scroll:function()
{if(this._scrollTimer)
clearTimeout(this._scrollTimer);var topmostLineNumber=this._codeMirror.lineAtHeight(this._codeMirror.getScrollInfo().top,"local");this._scrollTimer=setTimeout(this._delegate.scrollChanged.bind(this._delegate,topmostLineNumber),100);},_focus:function()
{this._delegate.editorFocused();},scrollToLine:function(lineNumber)
{var pos=new CodeMirror.Pos(lineNumber,0);var coords=this._codeMirror.charCoords(pos,"local");this._codeMirror.scrollTo(0,coords.top);},firstVisibleLine:function()
{return this._codeMirror.lineAtHeight(this._codeMirror.getScrollInfo().top,"local");},lastVisibleLine:function()
{var scrollInfo=this._codeMirror.getScrollInfo();return this._codeMirror.lineAtHeight(scrollInfo.top+scrollInfo.clientHeight,"local");},selection:function()
{var start=this._codeMirror.getCursor("anchor");var end=this._codeMirror.getCursor("head");return WebInspector.CodeMirrorUtils.toRange(start,end);},selections:function()
{var selectionList=this._codeMirror.listSelections();var result=[];for(var i=0;i<selectionList.length;++i){var selection=selectionList[i];result.push(WebInspector.CodeMirrorUtils.toRange(selection.anchor,selection.head));}
return result;},lastSelection:function()
{return this._lastSelection;},setSelection:function(textRange)
{this._lastSelection=textRange;var pos=WebInspector.CodeMirrorUtils.toPos(textRange);this._codeMirror.setSelection(pos.start,pos.end);},setSelections:function(ranges,primarySelectionIndex)
{var selections=[];for(var i=0;i<ranges.length;++i){var selection=WebInspector.CodeMirrorUtils.toPos(ranges[i]);selections.push({anchor:selection.start,head:selection.end});}
primarySelectionIndex=primarySelectionIndex||0;this._codeMirror.setSelections(selections,primarySelectionIndex,{scroll:false});},_detectLineSeparator:function(text)
{this._lineSeparator=text.indexOf("\r\n")>=0?"\r\n":"\n";},setText:function(text)
{this._muteTextChangedEvent=true;if(text.length>WebInspector.CodeMirrorTextEditor.MaxEditableTextSize){this._autocompleteController.setEnabled(false);this.setReadOnly(true);}
this._codeMirror.setValue(text);this._updateEditorIndentation();if(this._shouldClearHistory){this._codeMirror.clearHistory();this._shouldClearHistory=false;}
this._detectLineSeparator(text);delete this._muteTextChangedEvent;},text:function()
{return this._codeMirror.getValue().replace(/\n/g,this._lineSeparator);},range:function()
{var lineCount=this.linesCount;var lastLine=this._codeMirror.getLine(lineCount-1);return WebInspector.CodeMirrorUtils.toRange(new CodeMirror.Pos(0,0),new CodeMirror.Pos(lineCount-1,lastLine.length));},line:function(lineNumber)
{return this._codeMirror.getLine(lineNumber);},get linesCount()
{return this._codeMirror.lineCount();},setAttribute:function(line,name,value)
{if(line<0||line>=this._codeMirror.lineCount())
return;var handle=this._codeMirror.getLineHandle(line);if(handle.attributes===undefined)handle.attributes={};handle.attributes[name]=value;},getAttribute:function(line,name)
{if(line<0||line>=this._codeMirror.lineCount())
return null;var handle=this._codeMirror.getLineHandle(line);return handle.attributes&&handle.attributes[name]!==undefined?handle.attributes[name]:null;},removeAttribute:function(line,name)
{if(line<0||line>=this._codeMirror.lineCount())
return;var handle=this._codeMirror.getLineHandle(line);if(handle&&handle.attributes)
delete handle.attributes[name];},textEditorPositionHandle:function(lineNumber,columnNumber)
{return new WebInspector.CodeMirrorPositionHandle(this._codeMirror,new CodeMirror.Pos(lineNumber,columnNumber));},__proto__:WebInspector.VBox.prototype}
WebInspector.CodeMirrorPositionHandle=function(codeMirror,pos)
{this._codeMirror=codeMirror;this._lineHandle=codeMirror.getLineHandle(pos.line);this._columnNumber=pos.ch;}
WebInspector.CodeMirrorPositionHandle.prototype={resolve:function()
{var lineNumber=this._codeMirror.getLineNumber(this._lineHandle);if(typeof lineNumber!=="number")
return null;return{lineNumber:lineNumber,columnNumber:this._columnNumber};},equal:function(positionHandle)
{return positionHandle._lineHandle===this._lineHandle&&positionHandle._columnNumber==this._columnNumber&&positionHandle._codeMirror===this._codeMirror;}}
WebInspector.CodeMirrorTextEditor.TokenHighlighter=function(textEditor,codeMirror)
{this._textEditor=textEditor;this._codeMirror=codeMirror;}
WebInspector.CodeMirrorTextEditor.TokenHighlighter.prototype={highlightSearchResults:function(regex,range)
{var oldRegex=this._highlightRegex;this._highlightRegex=regex;this._highlightRange=range;if(this._searchResultMarker){this._searchResultMarker.clear();delete this._searchResultMarker;}
if(this._highlightDescriptor&&this._highlightDescriptor.selectionStart)
this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line,"wrap","cm-line-with-selection");var selectionStart=this._highlightRange?new CodeMirror.Pos(this._highlightRange.startLine,this._highlightRange.startColumn):null;if(selectionStart)
this._codeMirror.addLineClass(selectionStart.line,"wrap","cm-line-with-selection");if(this._highlightRegex===oldRegex){if(this._highlightDescriptor)
this._highlightDescriptor.selectionStart=selectionStart;}else{this._removeHighlight();this._setHighlighter(this._searchHighlighter.bind(this,this._highlightRegex),selectionStart);}
if(this._highlightRange){var pos=WebInspector.CodeMirrorUtils.toPos(this._highlightRange);this._searchResultMarker=this._codeMirror.markText(pos.start,pos.end,{className:"cm-column-with-selection"});}},highlightedRegex:function()
{return this._highlightRegex;},highlightSelectedTokens:function()
{delete this._highlightRegex;delete this._highlightRange;if(this._highlightDescriptor&&this._highlightDescriptor.selectionStart)
this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line,"wrap","cm-line-with-selection");this._removeHighlight();var selectionStart=this._codeMirror.getCursor("start");var selectionEnd=this._codeMirror.getCursor("end");if(selectionStart.line!==selectionEnd.line)
return;if(selectionStart.ch===selectionEnd.ch)
return;var selections=this._codeMirror.getSelections();if(selections.length>1)
return;var selectedText=selections[0];if(this._isWord(selectedText,selectionStart.line,selectionStart.ch,selectionEnd.ch)){if(selectionStart)
this._codeMirror.addLineClass(selectionStart.line,"wrap","cm-line-with-selection")
this._setHighlighter(this._tokenHighlighter.bind(this,selectedText,selectionStart),selectionStart);}},_isWord:function(selectedText,lineNumber,startColumn,endColumn)
{var line=this._codeMirror.getLine(lineNumber);var leftBound=startColumn===0||!WebInspector.TextUtils.isWordChar(line.charAt(startColumn-1));var rightBound=endColumn===line.length||!WebInspector.TextUtils.isWordChar(line.charAt(endColumn));return leftBound&&rightBound&&WebInspector.TextUtils.isWord(selectedText);},_removeHighlight:function()
{if(this._highlightDescriptor){this._codeMirror.removeOverlay(this._highlightDescriptor.overlay);delete this._highlightDescriptor;}},_searchHighlighter:function(regex,stream)
{if(stream.column()===0)
delete this._searchMatchLength;if(this._searchMatchLength){if(this._searchMatchLength>2){for(var i=0;i<this._searchMatchLength-2;++i)
stream.next();this._searchMatchLength=1;return"search-highlight";}else{stream.next();delete this._searchMatchLength;return"search-highlight search-highlight-end";}}
var match=stream.match(regex,false);if(match){stream.next();var matchLength=match[0].length;if(matchLength===1)
return"search-highlight search-highlight-full";this._searchMatchLength=matchLength;return"search-highlight search-highlight-start";}
while(!stream.match(regex,false)&&stream.next()){};},_tokenHighlighter:function(token,selectionStart,stream)
{var tokenFirstChar=token.charAt(0);if(stream.match(token)&&(stream.eol()||!WebInspector.TextUtils.isWordChar(stream.peek())))
return stream.column()===selectionStart.ch?"token-highlight column-with-selection":"token-highlight";var eatenChar;do{eatenChar=stream.next();}while(eatenChar&&(WebInspector.TextUtils.isWordChar(eatenChar)||stream.peek()!==tokenFirstChar));},_setHighlighter:function(highlighter,selectionStart)
{var overlayMode={token:highlighter};this._codeMirror.addOverlay(overlayMode);this._highlightDescriptor={overlay:overlayMode,selectionStart:selectionStart};}}
WebInspector.CodeMirrorTextEditor.BlockIndentController=function(codeMirror)
{codeMirror.addKeyMap(this);}
WebInspector.CodeMirrorTextEditor.BlockIndentController.prototype={name:"blockIndentKeymap",Enter:function(codeMirror)
{if(codeMirror.somethingSelected())
return CodeMirror.Pass;var cursor=codeMirror.getCursor();if(cursor.ch===0)
return CodeMirror.Pass;var line=codeMirror.getLine(cursor.line);if(line.substr(cursor.ch-1,2)==="{}"){codeMirror.execCommand("newlineAndIndent");codeMirror.setCursor(cursor);codeMirror.execCommand("newlineAndIndent");codeMirror.execCommand("indentMore");}else if(line.substr(cursor.ch-1,1)==="{"){codeMirror.execCommand("newlineAndIndent");codeMirror.execCommand("indentMore");}else
return CodeMirror.Pass;},"'}'":function(codeMirror)
{var cursor=codeMirror.getCursor();var line=codeMirror.getLine(cursor.line);for(var i=0;i<line.length;++i){if(!WebInspector.TextUtils.isSpaceChar(line.charAt(i)))
return CodeMirror.Pass;}
codeMirror.replaceRange("}",cursor);var matchingBracket=codeMirror.findMatchingBracket(cursor);if(!matchingBracket||!matchingBracket.match)
return;line=codeMirror.getLine(matchingBracket.to.line);var desiredIndentation=0;while(desiredIndentation<line.length&&WebInspector.TextUtils.isSpaceChar(line.charAt(desiredIndentation)))
++desiredIndentation;codeMirror.replaceRange(line.substr(0,desiredIndentation)+"}",new CodeMirror.Pos(cursor.line,0),new CodeMirror.Pos(cursor.line,cursor.ch+1));}}
WebInspector.CodeMirrorTextEditor.FixWordMovement=function(codeMirror)
{function moveLeft(shift,codeMirror)
{codeMirror.setExtending(shift);var cursor=codeMirror.getCursor("head");codeMirror.execCommand("goGroupLeft");var newCursor=codeMirror.getCursor("head");if(newCursor.ch===0&&newCursor.line!==0){codeMirror.setExtending(false);return;}
var skippedText=codeMirror.getRange(newCursor,cursor,"#");if(/^\s+$/.test(skippedText))
codeMirror.execCommand("goGroupLeft");codeMirror.setExtending(false);}
function moveRight(shift,codeMirror)
{codeMirror.setExtending(shift);var cursor=codeMirror.getCursor("head");codeMirror.execCommand("goGroupRight");var newCursor=codeMirror.getCursor("head");if(newCursor.ch===0&&newCursor.line!==0){codeMirror.setExtending(false);return;}
var skippedText=codeMirror.getRange(cursor,newCursor,"#");if(/^\s+$/.test(skippedText))
codeMirror.execCommand("goGroupRight");codeMirror.setExtending(false);}
var modifierKey=WebInspector.isMac()?"Alt":"Ctrl";var leftKey=modifierKey+"-Left";var rightKey=modifierKey+"-Right";var keyMap={};keyMap[leftKey]=moveLeft.bind(null,false);keyMap[rightKey]=moveRight.bind(null,false);keyMap["Shift-"+leftKey]=moveLeft.bind(null,true);keyMap["Shift-"+rightKey]=moveRight.bind(null,true);codeMirror.addKeyMap(keyMap);}
WebInspector.CodeMirrorTextEditor.AutocompleteControllerAPI=function(){}
WebInspector.CodeMirrorTextEditor.AutocompleteControllerAPI.prototype={dispose:function(){},setEnabled:function(enabled){},setMimeType:function(mimeType){},autocomplete:function(){},finishAutocomplete:function(){},keyDown:function(e){}}
WebInspector.CodeMirrorTextEditor.DummyAutocompleteController=function(){}
WebInspector.CodeMirrorTextEditor.DummyAutocompleteController.prototype={dispose:function(){},setEnabled:function(enabled){},setMimeType:function(mimeType){},autocomplete:function(){},finishAutocomplete:function(){},keyDown:function(e)
{return false;}}
WebInspector.CodeMirrorTextEditor.AutocompleteController=function(textEditor,codeMirror,dictionary)
{this._textEditor=textEditor;this._codeMirror=codeMirror;this._onScroll=this._onScroll.bind(this);this._onCursorActivity=this._onCursorActivity.bind(this);this._changes=this._changes.bind(this);this._beforeChange=this._beforeChange.bind(this);this._blur=this._blur.bind(this);this._codeMirror.on("scroll",this._onScroll);this._codeMirror.on("cursorActivity",this._onCursorActivity);this._codeMirror.on("changes",this._changes);this._codeMirror.on("beforeChange",this._beforeChange);this._codeMirror.on("blur",this._blur);this._additionalWordChars=WebInspector.CodeMirrorTextEditor._NoAdditionalWordChars;this._enabled=true;this._dictionary=dictionary;this._addTextToCompletionDictionary(this._textEditor.text());}
WebInspector.CodeMirrorTextEditor.AutocompleteController.Dummy=new WebInspector.CodeMirrorTextEditor.DummyAutocompleteController();WebInspector.CodeMirrorTextEditor._NoAdditionalWordChars={};WebInspector.CodeMirrorTextEditor._CSSAdditionalWordChars={".":true,"-":true};WebInspector.CodeMirrorTextEditor.AutocompleteController.prototype={dispose:function()
{this._codeMirror.off("scroll",this._onScroll);this._codeMirror.off("cursorActivity",this._onCursorActivity);this._codeMirror.off("changes",this._changes);this._codeMirror.off("beforeChange",this._beforeChange);this._codeMirror.off("blur",this._blur);},setEnabled:function(enabled)
{if(enabled===this._enabled)
return;this._enabled=enabled;if(!enabled)
this._dictionary.reset();else
this._addTextToCompletionDictionary(this._textEditor.text());},setMimeType:function(mimeType)
{var additionalWordChars=mimeType.indexOf("css")!==-1?WebInspector.CodeMirrorTextEditor._CSSAdditionalWordChars:WebInspector.CodeMirrorTextEditor._NoAdditionalWordChars;if(additionalWordChars!==this._additionalWordChars){this._additionalWordChars=additionalWordChars;this._dictionary.reset();this._addTextToCompletionDictionary(this._textEditor.text());}},_isWordChar:function(char)
{return WebInspector.TextUtils.isWordChar(char)||!!this._additionalWordChars[char];},_shouldProcessWordForAutocompletion:function(word)
{return!!word.length&&(word[0]<'0'||word[0]>'9');},_addTextToCompletionDictionary:function(text)
{if(!this._enabled)
return;var words=WebInspector.TextUtils.textToWords(text,this._isWordChar.bind(this));for(var i=0;i<words.length;++i){if(this._shouldProcessWordForAutocompletion(words[i]))
this._dictionary.addWord(words[i]);}},_removeTextFromCompletionDictionary:function(text)
{if(!this._enabled)
return;var words=WebInspector.TextUtils.textToWords(text,this._isWordChar.bind(this));for(var i=0;i<words.length;++i){if(this._shouldProcessWordForAutocompletion(words[i]))
this._dictionary.removeWord(words[i]);}},_beforeChange:function(codeMirror,changeObject)
{if(!this._enabled)
return;this._updatedLines=this._updatedLines||{};for(var i=changeObject.from.line;i<=changeObject.to.line;++i)
this._updatedLines[i]=this._textEditor.line(i);},_changes:function(codeMirror,changes)
{if(!changes.length||!this._enabled)
return;if(this._updatedLines){for(var lineNumber in this._updatedLines)
this._removeTextFromCompletionDictionary(this._updatedLines[lineNumber]);delete this._updatedLines;}
var linesToUpdate={};var singleCharInput=false;for(var changeIndex=0;changeIndex<changes.length;++changeIndex){var changeObject=changes[changeIndex];singleCharInput=(changeObject.origin==="+input"&&changeObject.text.length===1&&changeObject.text[0].length===1)||(changeObject.origin==="+delete"&&changeObject.removed.length===1&&changeObject.removed[0].length===1);var editInfo=this._textEditor._changeObjectToEditOperation(changeObject);for(var i=editInfo.newRange.startLine;i<=editInfo.newRange.endLine;++i)
linesToUpdate[i]=this._textEditor.line(i);}
for(var lineNumber in linesToUpdate)
this._addTextToCompletionDictionary(linesToUpdate[lineNumber]);if(singleCharInput)
this.autocomplete();},_blur:function()
{this.finishAutocomplete();},_autocompleteWordRange:function(lineNumber,columnNumber)
{return this._textEditor._wordRangeForCursorPosition(lineNumber,columnNumber,this._isWordChar.bind(this));},_validateSelectionsContexts:function(mainSelection,selections)
{var mainSelectionContext=this._textEditor.copyRange(mainSelection);for(var i=0;i<selections.length;++i){var wordRange=this._autocompleteWordRange(selections[i].head.line,selections[i].head.ch);if(!wordRange)
return false;var context=this._textEditor.copyRange(wordRange);if(context!==mainSelectionContext)
return false;}
return true;},autocomplete:function()
{var dictionary=this._dictionary;if(this._codeMirror.somethingSelected()){this.finishAutocomplete();return;}
var selections=this._codeMirror.listSelections().slice();var topSelection=selections.shift();var cursor=topSelection.head;var substituteRange=this._autocompleteWordRange(cursor.line,cursor.ch);if(!substituteRange||substituteRange.startColumn===cursor.ch||!this._validateSelectionsContexts(substituteRange,selections)){this.finishAutocomplete();return;}
var prefixRange=substituteRange.clone();prefixRange.endColumn=cursor.ch;var substituteWord=this._textEditor.copyRange(substituteRange);var hasPrefixInDictionary=dictionary.hasWord(substituteWord);if(hasPrefixInDictionary)
dictionary.removeWord(substituteWord);var wordsWithPrefix=dictionary.wordsWithPrefix(this._textEditor.copyRange(prefixRange));if(hasPrefixInDictionary)
dictionary.addWord(substituteWord);function sortSuggestions(a,b)
{return dictionary.wordCount(b)-dictionary.wordCount(a)||a.length-b.length;}
wordsWithPrefix.sort(sortSuggestions);if(!this._suggestBox)
this._suggestBox=new WebInspector.SuggestBox(this,6);var oldPrefixRange=this._prefixRange;this._prefixRange=prefixRange;if(!oldPrefixRange||prefixRange.startLine!==oldPrefixRange.startLine||prefixRange.startColumn!==oldPrefixRange.startColumn)
this._updateAnchorBox();this._suggestBox.updateSuggestions(this._anchorBox,wordsWithPrefix,0,true,this._textEditor.copyRange(prefixRange));if(!this._suggestBox.visible())
this.finishAutocomplete();},finishAutocomplete:function()
{if(!this._suggestBox)
return;this._suggestBox.hide();this._suggestBox=null;this._prefixRange=null;this._anchorBox=null;},keyDown:function(e)
{if(!this._suggestBox)
return false;if(e.keyCode===WebInspector.KeyboardShortcut.Keys.Esc.code){this.finishAutocomplete();return true;}
if(e.keyCode===WebInspector.KeyboardShortcut.Keys.Tab.code){this._suggestBox.acceptSuggestion();this.finishAutocomplete();return true;}
return this._suggestBox.keyPressed(e);},applySuggestion:function(suggestion,isIntermediateSuggestion)
{this._currentSuggestion=suggestion;},acceptSuggestion:function()
{if(this._prefixRange.endColumn-this._prefixRange.startColumn===this._currentSuggestion.length)
return;var selections=this._codeMirror.listSelections().slice();var prefixLength=this._prefixRange.endColumn-this._prefixRange.startColumn;for(var i=selections.length-1;i>=0;--i){var start=selections[i].head;var end=new CodeMirror.Pos(start.line,start.ch-prefixLength);this._codeMirror.replaceRange(this._currentSuggestion,start,end,"+autocomplete");}},_onScroll:function()
{if(!this._suggestBox)
return;var cursor=this._codeMirror.getCursor();var scrollInfo=this._codeMirror.getScrollInfo();var topmostLineNumber=this._codeMirror.lineAtHeight(scrollInfo.top,"local");var bottomLine=this._codeMirror.lineAtHeight(scrollInfo.top+scrollInfo.clientHeight,"local");if(cursor.line<topmostLineNumber||cursor.line>bottomLine)
this.finishAutocomplete();else{this._updateAnchorBox();this._suggestBox.setPosition(this._anchorBox);}},_onCursorActivity:function()
{if(!this._suggestBox)
return;var cursor=this._codeMirror.getCursor();if(cursor.line!==this._prefixRange.startLine||cursor.ch>this._prefixRange.endColumn||cursor.ch<=this._prefixRange.startColumn)
this.finishAutocomplete();},_updateAnchorBox:function()
{var line=this._prefixRange.startLine;var column=this._prefixRange.startColumn;var metrics=this._textEditor.cursorPositionToCoordinates(line,column);this._anchorBox=metrics?new AnchorBox(metrics.x,metrics.y,0,metrics.height):null;},}
WebInspector.CodeMirrorTextEditor.SelectNextOccurrenceController=function(textEditor,codeMirror)
{this._textEditor=textEditor;this._codeMirror=codeMirror;}
WebInspector.CodeMirrorTextEditor.SelectNextOccurrenceController.prototype={selectionWillChange:function()
{if(!this._muteSelectionListener)
delete this._fullWordSelection;},_findRange:function(selections,range)
{for(var i=0;i<selections.length;++i){if(range.equal(selections[i]))
return true;}
return false;},undoLastSelection:function()
{this._muteSelectionListener=true;this._codeMirror.execCommand("undoSelection");this._muteSelectionListener=false;},selectNextOccurrence:function()
{var selections=this._textEditor.selections();var anyEmptySelection=false;for(var i=0;i<selections.length;++i){var selection=selections[i];anyEmptySelection=anyEmptySelection||selection.isEmpty();if(selection.startLine!==selection.endLine)
return;}
if(anyEmptySelection){this._expandSelectionsToWords(selections);return;}
var last=selections[selections.length-1];var next=last;do{next=this._findNextOccurrence(next,!!this._fullWordSelection);}while(next&&this._findRange(selections,next)&&!next.equal(last));if(!next)
return;selections.push(next);this._muteSelectionListener=true;this._textEditor.setSelections(selections,selections.length-1);delete this._muteSelectionListener;this._textEditor._revealLine(next.startLine);},_expandSelectionsToWords:function(selections)
{var newSelections=[];for(var i=0;i<selections.length;++i){var selection=selections[i];var startRangeWord=this._textEditor._wordRangeForCursorPosition(selection.startLine,selection.startColumn,WebInspector.TextUtils.isWordChar)||WebInspector.TextRange.createFromLocation(selection.startLine,selection.startColumn);var endRangeWord=this._textEditor._wordRangeForCursorPosition(selection.endLine,selection.endColumn,WebInspector.TextUtils.isWordChar)||WebInspector.TextRange.createFromLocation(selection.endLine,selection.endColumn);var newSelection=new WebInspector.TextRange(startRangeWord.startLine,startRangeWord.startColumn,endRangeWord.endLine,endRangeWord.endColumn);newSelections.push(newSelection);}
this._textEditor.setSelections(newSelections,newSelections.length-1);this._fullWordSelection=true;},_findNextOccurrence:function(range,fullWord)
{range=range.normalize();var matchedLineNumber;var matchedColumnNumber;var textToFind=this._textEditor.copyRange(range);function findWordInLine(wordRegex,lineNumber,lineText,from,to)
{if(typeof matchedLineNumber==="number")
return true;wordRegex.lastIndex=from;var result=wordRegex.exec(lineText);if(!result||result.index+textToFind.length>to)
return false;matchedLineNumber=lineNumber;matchedColumnNumber=result.index;return true;}
var iteratedLineNumber;function lineIterator(regex,lineHandle)
{if(findWordInLine(regex,iteratedLineNumber++,lineHandle.text,0,lineHandle.text.length))
return true;}
var regexSource=textToFind.escapeForRegExp();if(fullWord)
regexSource="\\b"+regexSource+"\\b";var wordRegex=new RegExp(regexSource,"gi");var currentLineText=this._codeMirror.getLine(range.startLine);findWordInLine(wordRegex,range.startLine,currentLineText,range.endColumn,currentLineText.length);iteratedLineNumber=range.startLine+1;this._codeMirror.eachLine(range.startLine+1,this._codeMirror.lineCount(),lineIterator.bind(null,wordRegex));iteratedLineNumber=0;this._codeMirror.eachLine(0,range.startLine,lineIterator.bind(null,wordRegex));findWordInLine(wordRegex,range.startLine,currentLineText,0,range.startColumn);if(typeof matchedLineNumber!=="number")
return null;return new WebInspector.TextRange(matchedLineNumber,matchedColumnNumber,matchedLineNumber,matchedColumnNumber+textToFind.length);}}
WebInspector.CodeMirrorTextEditor._overrideModeWithPrefixedTokens=function(modeName,tokenPrefix)
{var oldModeName=modeName+"-old";if(CodeMirror.modes[oldModeName])
return;CodeMirror.defineMode(oldModeName,CodeMirror.modes[modeName]);CodeMirror.defineMode(modeName,modeConstructor);function modeConstructor(config,parserConfig)
{var innerConfig={};for(var i in parserConfig)
innerConfig[i]=parserConfig[i];innerConfig.name=oldModeName;var codeMirrorMode=CodeMirror.getMode(config,innerConfig);codeMirrorMode.name=modeName;codeMirrorMode.token=tokenOverride.bind(null,codeMirrorMode.token);return codeMirrorMode;}
function tokenOverride(superToken,stream,state)
{var token=superToken(stream,state);return token?tokenPrefix+token:token;}}
WebInspector.CodeMirrorTextEditor._overrideModeWithPrefixedTokens("css","css-");WebInspector.CodeMirrorTextEditor._overrideModeWithPrefixedTokens("javascript","js-");WebInspector.CodeMirrorTextEditor._overrideModeWithPrefixedTokens("xml","xml-");(function(){var backgroundColor=InspectorFrontendHost.getSelectionBackgroundColor();var backgroundColorRule=backgroundColor?".CodeMirror .CodeMirror-selected { background-color: "+backgroundColor+";}":"";var foregroundColor=InspectorFrontendHost.getSelectionForegroundColor();var foregroundColorRule=foregroundColor?".CodeMirror .CodeMirror-selectedtext:not(.CodeMirror-persist-highlight) { color: "+foregroundColor+"!important;}":"";if(!foregroundColorRule&&!backgroundColorRule)
return;var style=document.createElement("style");style.textContent=backgroundColorRule+foregroundColorRule;document.head.appendChild(style);})();;WebInspector.SourceFrame=function(contentProvider)
{WebInspector.VBox.call(this);this.element.classList.add("script-view");this._url=contentProvider.contentURL();this._contentProvider=contentProvider;var textEditorDelegate=new WebInspector.TextEditorDelegateForSourceFrame(this);this._textEditor=new WebInspector.CodeMirrorTextEditor(this._url,textEditorDelegate);this._currentSearchResultIndex=-1;this._searchResults=[];this._messages=[];this._rowMessages={};this._messageBubbles={};this._textEditor.setReadOnly(!this.canEditSource());this._shortcuts={};this.element.addEventListener("keydown",this._handleKeyDown.bind(this),false);this._sourcePosition=new WebInspector.StatusBarText("","source-frame-cursor-position");}
WebInspector.SourceFrame.createSearchRegex=function(query,modifiers)
{var regex;modifiers=modifiers||"";try{if(/^\/.+\/$/.test(query)){regex=new RegExp(query.substring(1,query.length-1),modifiers);regex.__fromRegExpQuery=true;}}catch(e){}
if(!regex)
regex=createPlainTextSearchRegex(query,"i"+modifiers);return regex;}
WebInspector.SourceFrame.Events={ScrollChanged:"ScrollChanged",SelectionChanged:"SelectionChanged",JumpHappened:"JumpHappened"}
WebInspector.SourceFrame.prototype={addShortcut:function(key,handler)
{this._shortcuts[key]=handler;},wasShown:function()
{this._ensureContentLoaded();this._textEditor.show(this.element);this._editorAttached=true;this._wasShownOrLoaded();},_isEditorShowing:function()
{return this.isShowing()&&this._editorAttached;},willHide:function()
{WebInspector.View.prototype.willHide.call(this);this._clearPositionToReveal();},statusBarText:function()
{return this._sourcePosition.element;},statusBarItems:function()
{return[];},defaultFocusedElement:function()
{return this._textEditor.defaultFocusedElement();},get loaded()
{return this._loaded;},hasContent:function()
{return true;},get textEditor()
{return this._textEditor;},_ensureContentLoaded:function()
{if(!this._contentRequested){this._contentRequested=true;this._contentProvider.requestContent(this.setContent.bind(this));}},addMessage:function(msg)
{this._messages.push(msg);if(this.loaded)
this.addMessageToSource(msg.line-1,msg);},clearMessages:function()
{for(var line in this._messageBubbles){var bubble=this._messageBubbles[line];var lineNumber=parseInt(line,10);this._textEditor.removeDecoration(lineNumber,bubble);}
this._messages=[];this._rowMessages={};this._messageBubbles={};},revealPosition:function(line,column,shouldHighlight)
{this._clearLineToScrollTo();this._clearSelectionToSet();this._positionToReveal={line:line,column:column,shouldHighlight:shouldHighlight};this._innerRevealPositionIfNeeded();},_innerRevealPositionIfNeeded:function()
{if(!this._positionToReveal)
return;if(!this.loaded||!this._isEditorShowing())
return;this._textEditor.revealPosition(this._positionToReveal.line,this._positionToReveal.column,this._positionToReveal.shouldHighlight);delete this._positionToReveal;},_clearPositionToReveal:function()
{this._textEditor.clearPositionHighlight();delete this._positionToReveal;},scrollToLine:function(line)
{this._clearPositionToReveal();this._lineToScrollTo=line;this._innerScrollToLineIfNeeded();},_innerScrollToLineIfNeeded:function()
{if(typeof this._lineToScrollTo==="number"){if(this.loaded&&this._isEditorShowing()){this._textEditor.scrollToLine(this._lineToScrollTo);delete this._lineToScrollTo;}}},_clearLineToScrollTo:function()
{delete this._lineToScrollTo;},selection:function()
{return this.textEditor.selection();},setSelection:function(textRange)
{this._selectionToSet=textRange;this._innerSetSelectionIfNeeded();},_innerSetSelectionIfNeeded:function()
{if(this._selectionToSet&&this.loaded&&this._isEditorShowing()){this._textEditor.setSelection(this._selectionToSet);delete this._selectionToSet;}},_clearSelectionToSet:function()
{delete this._selectionToSet;},_wasShownOrLoaded:function()
{this._innerRevealPositionIfNeeded();this._innerSetSelectionIfNeeded();this._innerScrollToLineIfNeeded();},onTextChanged:function(oldRange,newRange)
{if(this._searchResultsChangedCallback&&!this._isReplacing)
this._searchResultsChangedCallback();this.clearMessages();},_simplifyMimeType:function(content,mimeType)
{if(!mimeType)
return"";if(mimeType.indexOf("javascript")>=0||mimeType.indexOf("jscript")>=0||mimeType.indexOf("ecmascript")>=0)
return"text/javascript";if(mimeType==="text/x-php"&&content.match(/\<\?.*\?\>/g))
return"application/x-httpd-php";return mimeType;},setHighlighterType:function(highlighterType)
{this._highlighterType=highlighterType;this._updateHighlighterType("");},_updateHighlighterType:function(content)
{this._textEditor.setMimeType(this._simplifyMimeType(content,this._highlighterType));},setContent:function(content)
{if(!this._loaded){this._loaded=true;this._textEditor.setText(content||"");this._textEditor.markClean();}else{var firstLine=this._textEditor.firstVisibleLine();var selection=this._textEditor.selection();this._textEditor.setText(content||"");this._textEditor.scrollToLine(firstLine);this._textEditor.setSelection(selection);}
this._updateHighlighterType(content||"");this._textEditor.beginUpdates();this._setTextEditorDecorations();this._wasShownOrLoaded();if(this._delayedFindSearchMatches){this._delayedFindSearchMatches();delete this._delayedFindSearchMatches;}
this.onTextEditorContentLoaded();this._textEditor.endUpdates();},onTextEditorContentLoaded:function(){},_setTextEditorDecorations:function()
{this._rowMessages={};this._messageBubbles={};this._textEditor.beginUpdates();this._addExistingMessagesToSource();this._textEditor.endUpdates();},performSearch:function(query,shouldJump,jumpBackwards,callback,currentMatchChangedCallback,searchResultsChangedCallback)
{function doFindSearchMatches(query)
{this._currentSearchResultIndex=-1;this._searchResults=[];var regex=WebInspector.SourceFrame.createSearchRegex(query);this._searchRegex=regex;this._searchResults=this._collectRegexMatches(regex);if(!this._searchResults.length)
this._textEditor.cancelSearchResultsHighlight();else if(shouldJump&&jumpBackwards)
this.jumpToPreviousSearchResult();else if(shouldJump)
this.jumpToNextSearchResult();else
this._textEditor.highlightSearchResults(regex,null);callback(this,this._searchResults.length);}
this._resetSearch();this._currentSearchMatchChangedCallback=currentMatchChangedCallback;this._searchResultsChangedCallback=searchResultsChangedCallback;if(this.loaded)
doFindSearchMatches.call(this,query);else
this._delayedFindSearchMatches=doFindSearchMatches.bind(this,query);this._ensureContentLoaded();},_editorFocused:function()
{this._resetCurrentSearchResultIndex();},_resetCurrentSearchResultIndex:function()
{if(!this._searchResults.length)
return;this._currentSearchResultIndex=-1;if(this._currentSearchMatchChangedCallback)
this._currentSearchMatchChangedCallback(this._currentSearchResultIndex);this._textEditor.highlightSearchResults(this._searchRegex,null);},_resetSearch:function()
{delete this._delayedFindSearchMatches;delete this._currentSearchMatchChangedCallback;delete this._searchResultsChangedCallback;this._currentSearchResultIndex=-1;this._searchResults=[];delete this._searchRegex;},searchCanceled:function()
{var range=this._currentSearchResultIndex!==-1?this._searchResults[this._currentSearchResultIndex]:null;this._resetSearch();if(!this.loaded)
return;this._textEditor.cancelSearchResultsHighlight();if(range)
this._textEditor.setSelection(range);},hasSearchResults:function()
{return this._searchResults.length>0;},jumpToFirstSearchResult:function()
{this.jumpToSearchResult(0);},jumpToLastSearchResult:function()
{this.jumpToSearchResult(this._searchResults.length-1);},_searchResultIndexForCurrentSelection:function()
{return insertionIndexForObjectInListSortedByFunction(this._textEditor.selection(),this._searchResults,WebInspector.TextRange.comparator);},jumpToNextSearchResult:function()
{var currentIndex=this._searchResultIndexForCurrentSelection();var nextIndex=this._currentSearchResultIndex===-1?currentIndex:currentIndex+1;this.jumpToSearchResult(nextIndex);},jumpToPreviousSearchResult:function()
{var currentIndex=this._searchResultIndexForCurrentSelection();this.jumpToSearchResult(currentIndex-1);},showingFirstSearchResult:function()
{return this._searchResults.length&&this._currentSearchResultIndex===0;},showingLastSearchResult:function()
{return this._searchResults.length&&this._currentSearchResultIndex===(this._searchResults.length-1);},get currentSearchResultIndex()
{return this._currentSearchResultIndex;},jumpToSearchResult:function(index)
{if(!this.loaded||!this._searchResults.length)
return;this._currentSearchResultIndex=(index+this._searchResults.length)%this._searchResults.length;if(this._currentSearchMatchChangedCallback)
this._currentSearchMatchChangedCallback(this._currentSearchResultIndex);this._textEditor.highlightSearchResults(this._searchRegex,this._searchResults[this._currentSearchResultIndex]);},replaceSelectionWith:function(text)
{var range=this._searchResults[this._currentSearchResultIndex];if(!range)
return;this._textEditor.highlightSearchResults(this._searchRegex,null);this._isReplacing=true;var newRange=this._textEditor.editRange(range,text);delete this._isReplacing;this._textEditor.setSelection(newRange.collapseToEnd());},replaceAllWith:function(query,replacement)
{this._resetCurrentSearchResultIndex();var text=this._textEditor.text();var range=this._textEditor.range();var regex=WebInspector.SourceFrame.createSearchRegex(query,"g");if(regex.__fromRegExpQuery)
text=text.replace(regex,replacement);else
text=text.replace(regex,function(){return replacement;});var ranges=this._collectRegexMatches(regex);if(!ranges.length)
return;var currentRangeIndex=insertionIndexForObjectInListSortedByFunction(this._textEditor.selection(),ranges,WebInspector.TextRange.comparator);var lastRangeIndex=mod(currentRangeIndex-1,ranges.length);var lastRange=ranges[lastRangeIndex];var replacementLineEndings=replacement.lineEndings();var replacementLineCount=replacementLineEndings.length;var lastLineNumber=lastRange.startLine+replacementLineEndings.length-1;var lastColumnNumber=lastRange.startColumn;if(replacementLineEndings.length>1)
lastColumnNumber=replacementLineEndings[replacementLineCount-1]-replacementLineEndings[replacementLineCount-2]-1;this._isReplacing=true;this._textEditor.editRange(range,text);this._textEditor.revealPosition(lastLineNumber,lastColumnNumber);this._textEditor.setSelection(WebInspector.TextRange.createFromLocation(lastLineNumber,lastColumnNumber));delete this._isReplacing;},_collectRegexMatches:function(regexObject)
{var ranges=[];for(var i=0;i<this._textEditor.linesCount;++i){var line=this._textEditor.line(i);var offset=0;do{var match=regexObject.exec(line);if(match){if(match[0].length)
ranges.push(new WebInspector.TextRange(i,offset+match.index,i,offset+match.index+match[0].length));offset+=match.index+1;line=line.substring(match.index+1);}}while(match&&line);}
return ranges;},_addExistingMessagesToSource:function()
{var length=this._messages.length;for(var i=0;i<length;++i)
this.addMessageToSource(this._messages[i].line-1,this._messages[i]);},addMessageToSource:function(lineNumber,msg)
{if(lineNumber>=this._textEditor.linesCount)
lineNumber=this._textEditor.linesCount-1;if(lineNumber<0)
lineNumber=0;var rowMessages=this._rowMessages[lineNumber];if(!rowMessages){rowMessages=[];this._rowMessages[lineNumber]=rowMessages;}
for(var i=0;i<rowMessages.length;++i){if(rowMessages[i].consoleMessage.isEqual(msg)){rowMessages[i].repeatCount++;this._updateMessageRepeatCount(rowMessages[i]);return;}}
var rowMessage={consoleMessage:msg};rowMessages.push(rowMessage);this._textEditor.beginUpdates();var messageBubbleElement=this._messageBubbles[lineNumber];if(!messageBubbleElement){messageBubbleElement=document.createElement("div");messageBubbleElement.className="webkit-html-message-bubble";this._messageBubbles[lineNumber]=messageBubbleElement;this._textEditor.addDecoration(lineNumber,messageBubbleElement);}
var imageElement=document.createElement("div");switch(msg.level){case WebInspector.ConsoleMessage.MessageLevel.Error:messageBubbleElement.classList.add("webkit-html-error-message");imageElement.className="error-icon-small";break;case WebInspector.ConsoleMessage.MessageLevel.Warning:messageBubbleElement.classList.add("webkit-html-warning-message");imageElement.className="warning-icon-small";break;}
var messageLineElement=document.createElement("div");messageLineElement.className="webkit-html-message-line";messageBubbleElement.appendChild(messageLineElement);messageLineElement.appendChild(imageElement);messageLineElement.appendChild(document.createTextNode(msg.messageText));rowMessage.element=messageLineElement;rowMessage.repeatCount=1;this._updateMessageRepeatCount(rowMessage);this._textEditor.endUpdates();},_updateMessageRepeatCount:function(rowMessage)
{if(rowMessage.repeatCount<2)
return;if(!rowMessage.repeatCountElement){var repeatCountElement=document.createElement("span");rowMessage.element.appendChild(repeatCountElement);rowMessage.repeatCountElement=repeatCountElement;}
rowMessage.repeatCountElement.textContent=WebInspector.UIString(" (repeated %d times)",rowMessage.repeatCount);},removeMessageFromSource:function(lineNumber,msg)
{if(lineNumber>=this._textEditor.linesCount)
lineNumber=this._textEditor.linesCount-1;if(lineNumber<0)
lineNumber=0;var rowMessages=this._rowMessages[lineNumber];for(var i=0;rowMessages&&i<rowMessages.length;++i){var rowMessage=rowMessages[i];if(rowMessage.consoleMessage!==msg)
continue;var messageLineElement=rowMessage.element;var messageBubbleElement=messageLineElement.parentElement;messageBubbleElement.removeChild(messageLineElement);rowMessages.remove(rowMessage);if(!rowMessages.length)
delete this._rowMessages[lineNumber];if(!messageBubbleElement.childElementCount){this._textEditor.removeDecoration(lineNumber,messageBubbleElement);delete this._messageBubbles[lineNumber];}
break;}},populateLineGutterContextMenu:function(contextMenu,lineNumber)
{},populateTextAreaContextMenu:function(contextMenu,lineNumber)
{},onJumpToPosition:function(from,to)
{this.dispatchEventToListeners(WebInspector.SourceFrame.Events.JumpHappened,{from:from,to:to});},inheritScrollPositions:function(sourceFrame)
{this._textEditor.inheritScrollPositions(sourceFrame._textEditor);},canEditSource:function()
{return false;},selectionChanged:function(textRange)
{this._updateSourcePosition();this.dispatchEventToListeners(WebInspector.SourceFrame.Events.SelectionChanged,textRange);WebInspector.notifications.dispatchEventToListeners(WebInspector.SourceFrame.Events.SelectionChanged,textRange);},_updateSourcePosition:function()
{var selections=this._textEditor.selections();if(!selections.length)
return;if(selections.length>1){this._sourcePosition.setText(WebInspector.UIString("%d selection regions",selections.length));return;}
var textRange=selections[0];if(textRange.isEmpty()){this._sourcePosition.setText(WebInspector.UIString("Line %d, Column %d",textRange.endLine+1,textRange.endColumn+1));return;}
textRange=textRange.normalize();var selectedText=this._textEditor.copyRange(textRange);if(textRange.startLine===textRange.endLine)
this._sourcePosition.setText(WebInspector.UIString("%d characters selected",selectedText.length));else
this._sourcePosition.setText(WebInspector.UIString("%d lines, %d characters selected",textRange.endLine-textRange.startLine+1,selectedText.length));},scrollChanged:function(lineNumber)
{this.dispatchEventToListeners(WebInspector.SourceFrame.Events.ScrollChanged,lineNumber);},_handleKeyDown:function(e)
{var shortcutKey=WebInspector.KeyboardShortcut.makeKeyFromEvent(e);var handler=this._shortcuts[shortcutKey];if(handler&&handler())
e.consume(true);},__proto__:WebInspector.VBox.prototype}
WebInspector.TextEditorDelegateForSourceFrame=function(sourceFrame)
{this._sourceFrame=sourceFrame;}
WebInspector.TextEditorDelegateForSourceFrame.prototype={onTextChanged:function(oldRange,newRange)
{this._sourceFrame.onTextChanged(oldRange,newRange);},selectionChanged:function(textRange)
{this._sourceFrame.selectionChanged(textRange);},scrollChanged:function(lineNumber)
{this._sourceFrame.scrollChanged(lineNumber);},editorFocused:function()
{this._sourceFrame._editorFocused();},populateLineGutterContextMenu:function(contextMenu,lineNumber)
{this._sourceFrame.populateLineGutterContextMenu(contextMenu,lineNumber);},populateTextAreaContextMenu:function(contextMenu,lineNumber)
{this._sourceFrame.populateTextAreaContextMenu(contextMenu,lineNumber);},createLink:function(hrefValue,isExternal)
{var targetLocation=WebInspector.ParsedURL.completeURL(this._sourceFrame._url,hrefValue);return WebInspector.linkifyURLAsNode(targetLocation||hrefValue,hrefValue,undefined,isExternal);},onJumpToPosition:function(from,to)
{this._sourceFrame.onJumpToPosition(from,to);}}
WebInspector.GoToLineDialog=function(sourceFrame)
{WebInspector.DialogDelegate.call(this);this.element=document.createElement("div");this.element.className="go-to-line-dialog";this.element.createChild("label").textContent=WebInspector.UIString("Go to line: ");this._input=this.element.createChild("input");this._input.setAttribute("type","text");this._input.setAttribute("size",6);this._goButton=this.element.createChild("button");this._goButton.textContent=WebInspector.UIString("Go");this._goButton.addEventListener("click",this._onGoClick.bind(this),false);this._sourceFrame=sourceFrame;}
WebInspector.GoToLineDialog.install=function(panel,sourceFrameGetter)
{var goToLineShortcut=WebInspector.GoToLineDialog.createShortcut();panel.registerShortcuts([goToLineShortcut],WebInspector.GoToLineDialog._show.bind(null,sourceFrameGetter));}
WebInspector.GoToLineDialog._show=function(sourceFrameGetter,event)
{var sourceFrame=sourceFrameGetter();if(!sourceFrame)
return false;WebInspector.Dialog.show(sourceFrame.element,new WebInspector.GoToLineDialog(sourceFrame));return true;}
WebInspector.GoToLineDialog.createShortcut=function()
{return WebInspector.KeyboardShortcut.makeDescriptor("g",WebInspector.KeyboardShortcut.Modifiers.Ctrl);}
WebInspector.GoToLineDialog.prototype={focus:function()
{WebInspector.setCurrentFocusElement(this._input);this._input.select();},_onGoClick:function()
{this._applyLineNumber();WebInspector.Dialog.hide();},_applyLineNumber:function()
{var value=this._input.value;var lineNumber=parseInt(value,10)-1;if(!isNaN(lineNumber)&&lineNumber>=0)
this._sourceFrame.revealPosition(lineNumber,0,true);},onEnter:function()
{this._applyLineNumber();},__proto__:WebInspector.DialogDelegate.prototype};WebInspector.ResourceView=function(resource)
{WebInspector.VBox.call(this);this.registerRequiredCSS("resourceView.css");this.element.classList.add("resource-view");this.resource=resource;}
WebInspector.ResourceView.prototype={hasContent:function()
{return false;},__proto__:WebInspector.VBox.prototype}
WebInspector.ResourceView.hasTextContent=function(resource)
{if(resource.type.isTextType())
return true;if(resource.type===WebInspector.resourceTypes.Other)
return!!resource.content&&!resource.contentEncoded;return false;}
WebInspector.ResourceView.nonSourceViewForResource=function(resource)
{switch(resource.type){case WebInspector.resourceTypes.Image:return new WebInspector.ImageView(resource);case WebInspector.resourceTypes.Font:return new WebInspector.FontView(resource);default:return new WebInspector.ResourceView(resource);}}
WebInspector.ResourceSourceFrame=function(resource)
{this._resource=resource;WebInspector.SourceFrame.call(this,resource);}
WebInspector.ResourceSourceFrame.prototype={get resource()
{return this._resource;},populateTextAreaContextMenu:function(contextMenu,lineNumber)
{contextMenu.appendApplicableItems(this._resource);},__proto__:WebInspector.SourceFrame.prototype}
WebInspector.ResourceSourceFrameFallback=function(resource)
{WebInspector.VBox.call(this);this._resource=resource;this.element.classList.add("script-view");this._content=this.element.createChild("div","script-view-fallback monospace");}
WebInspector.ResourceSourceFrameFallback.prototype={wasShown:function()
{if(!this._contentRequested){this._contentRequested=true;this._resource.requestContent(this._contentLoaded.bind(this));}},_contentLoaded:function(content)
{this._content.textContent=content;},__proto__:WebInspector.VBox.prototype};WebInspector.FontView=function(resource)
{WebInspector.ResourceView.call(this,resource);this.element.classList.add("font");}
WebInspector.FontView._fontPreviewLines=["ABCDEFGHIJKLM","NOPQRSTUVWXYZ","abcdefghijklm","nopqrstuvwxyz","1234567890"];WebInspector.FontView._fontId=0;WebInspector.FontView._measureFontSize=50;WebInspector.FontView.prototype={hasContent:function()
{return true;},_createContentIfNeeded:function()
{if(this.fontPreviewElement)
return;var uniqueFontName="WebInspectorFontPreview"+(++WebInspector.FontView._fontId);this.fontStyleElement=document.createElement("style");this.fontStyleElement.textContent="@font-face { font-family: \""+uniqueFontName+"\"; src: url("+this.resource.url+"); }";document.head.appendChild(this.fontStyleElement);var fontPreview=document.createElement("div");for(var i=0;i<WebInspector.FontView._fontPreviewLines.length;++i){if(i>0)
fontPreview.appendChild(document.createElement("br"));fontPreview.appendChild(document.createTextNode(WebInspector.FontView._fontPreviewLines[i]));}
this.fontPreviewElement=fontPreview.cloneNode(true);this.fontPreviewElement.style.setProperty("font-family",uniqueFontName);this.fontPreviewElement.style.setProperty("visibility","hidden");this._dummyElement=fontPreview;this._dummyElement.style.visibility="hidden";this._dummyElement.style.zIndex="-1";this._dummyElement.style.display="inline";this._dummyElement.style.position="absolute";this._dummyElement.style.setProperty("font-family",uniqueFontName);this._dummyElement.style.setProperty("font-size",WebInspector.FontView._measureFontSize+"px");this.element.appendChild(this.fontPreviewElement);},wasShown:function()
{this._createContentIfNeeded();this.updateFontPreviewSize();},onResize:function()
{if(this._inResize)
return;this._inResize=true;try{this.updateFontPreviewSize();}finally{delete this._inResize;}},_measureElement:function()
{this.element.appendChild(this._dummyElement);var result={width:this._dummyElement.offsetWidth,height:this._dummyElement.offsetHeight};this.element.removeChild(this._dummyElement);return result;},updateFontPreviewSize:function()
{if(!this.fontPreviewElement||!this.isShowing())
return;this.fontPreviewElement.style.removeProperty("visibility");var dimension=this._measureElement();const height=dimension.height;const width=dimension.width;const containerWidth=this.element.offsetWidth-50;const containerHeight=this.element.offsetHeight-30;if(!height||!width||!containerWidth||!containerHeight){this.fontPreviewElement.style.removeProperty("font-size");return;}
var widthRatio=containerWidth/width;var heightRatio=containerHeight/height;var finalFontSize=Math.floor(WebInspector.FontView._measureFontSize*Math.min(widthRatio,heightRatio))-2;this.fontPreviewElement.style.setProperty("font-size",finalFontSize+"px",null);},__proto__:WebInspector.ResourceView.prototype};WebInspector.ImageView=function(resource)
{WebInspector.ResourceView.call(this,resource);this.element.classList.add("image");}
WebInspector.ImageView.prototype={hasContent:function()
{return true;},wasShown:function()
{this._createContentIfNeeded();},_createContentIfNeeded:function()
{if(this._container)
return;var imageContainer=document.createElement("div");imageContainer.className="image";this.element.appendChild(imageContainer);var imagePreviewElement=document.createElement("img");imagePreviewElement.classList.add("resource-image-view");imageContainer.appendChild(imagePreviewElement);imagePreviewElement.addEventListener("contextmenu",this._contextMenu.bind(this),true);this._container=document.createElement("div");this._container.className="info";this.element.appendChild(this._container);var imageNameElement=document.createElement("h1");imageNameElement.className="title";imageNameElement.textContent=this.resource.displayName;this._container.appendChild(imageNameElement);var infoListElement=document.createElement("dl");infoListElement.className="infoList";this.resource.populateImageSource(imagePreviewElement);function onImageLoad()
{var content=this.resource.content;if(content)
var resourceSize=this._base64ToSize(content);else
var resourceSize=this.resource.resourceSize;var imageProperties=[{name:WebInspector.UIString("Dimensions"),value:WebInspector.UIString("%d × %d",imagePreviewElement.naturalWidth,imagePreviewElement.naturalHeight)},{name:WebInspector.UIString("File size"),value:Number.bytesToString(resourceSize)},{name:WebInspector.UIString("MIME type"),value:this.resource.mimeType}];infoListElement.removeChildren();for(var i=0;i<imageProperties.length;++i){var dt=document.createElement("dt");dt.textContent=imageProperties[i].name;infoListElement.appendChild(dt);var dd=document.createElement("dd");dd.textContent=imageProperties[i].value;infoListElement.appendChild(dd);}
var dt=document.createElement("dt");dt.textContent=WebInspector.UIString("URL");infoListElement.appendChild(dt);var dd=document.createElement("dd");var externalResource=true;dd.appendChild(WebInspector.linkifyURLAsNode(this.resource.url,undefined,undefined,externalResource));infoListElement.appendChild(dd);this._container.appendChild(infoListElement);}
imagePreviewElement.addEventListener("load",onImageLoad.bind(this),false);this._imagePreviewElement=imagePreviewElement;},_base64ToSize:function(content)
{if(!content.length)
return 0;var size=(content.length||0)*3/4;if(content.length>0&&content[content.length-1]==="=")
size--;if(content.length>1&&content[content.length-2]==="=")
size--;return size;},_contextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Copy image URL":"Copy Image URL"),this._copyImageURL.bind(this));if(this._imagePreviewElement.src)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Copy image as Data URL":"Copy Image As Data URL"),this._copyImageAsDataURL.bind(this));contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Open image in new tab":"Open Image in New Tab"),this._openInNewTab.bind(this));contextMenu.show();},_copyImageAsDataURL:function()
{InspectorFrontendHost.copyText(this._imagePreviewElement.src);},_copyImageURL:function()
{InspectorFrontendHost.copyText(this.resource.url);},_openInNewTab:function()
{InspectorFrontendHost.openInNewTab(this.resource.url);},__proto__:WebInspector.ResourceView.prototype};