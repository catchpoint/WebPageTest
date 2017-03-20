Coverage.RangeUseCount;Coverage.CoverageSegment;Coverage.CoverageType={CSS:(1<<0),JavaScript:(1<<1),};Coverage.CoverageModel=class extends SDK.SDKModel{constructor(target){super(target);this._cpuProfilerModel=target.model(SDK.CPUProfilerModel);this._cssModel=target.model(SDK.CSSModel);this._debuggerModel=target.model(SDK.DebuggerModel);this._coverageByURL=new Map();}
start(){this._coverageByURL.clear();if(this._cssModel)
this._cssModel.startRuleUsageTracking();if(this._cpuProfilerModel)
this._cpuProfilerModel.startPreciseCoverage();return!!(this._cssModel||this._cpuProfilerModel);}
async stop(){await Promise.all([this._stopCSSCoverage(),this._stopJSCoverage()]);return Array.from(this._coverageByURL.values());}
async _stopJSCoverage(){if(!this._cpuProfilerModel)
return;var coveragePromise=this._cpuProfilerModel.takePreciseCoverage();this._cpuProfilerModel.stopPreciseCoverage();var rawCoverageData=await coveragePromise;this._processJSCoverage(rawCoverageData);}
_processJSCoverage(scriptsCoverage){for(var entry of scriptsCoverage){var script=this._debuggerModel.scriptForId(entry.scriptId);if(!script)
continue;var ranges=[];for(var func of entry.functions){for(var range of func.ranges)
ranges.push(range);}
ranges.sort((a,b)=>a.startOffset-b.startOffset);this._addCoverage(script,script.contentLength,script.lineOffset,script.columnOffset,ranges);}}
static _convertToDisjointSegments(ranges){var result=[];var stack=[];for(var entry of ranges){var top=stack.peekLast();while(top&&top.endOffset<=entry.startOffset){append(top.endOffset,top.count,stack.length);stack.pop();top=stack.peekLast();}
append(entry.startOffset,top?top.count:undefined,stack.length);stack.push(entry);}
while(stack.length){var depth=stack.length;var top=stack.pop();append(top.endOffset,top.count,depth);}
function append(end,count,depth){var last=result.peekLast();if(last){if(last.end===end)
return;if(last.count===count&&last.depth===depth){last.end=end;return;}}
result.push({end:end,count:count,depth:depth});}
return result;}
async _stopCSSCoverage(){if(!this._cssModel)
return[];var rawCoverageData=await this._cssModel.ruleListPromise();this._processCSSCoverage(rawCoverageData);}
_processCSSCoverage(ruleUsageList){var rulesByStyleSheet=new Map();for(var rule of ruleUsageList){var styleSheetHeader=this._cssModel.styleSheetHeaderForId(rule.styleSheetId);if(!styleSheetHeader)
continue;var ranges=rulesByStyleSheet.get(styleSheetHeader);if(!ranges){ranges=[];rulesByStyleSheet.set(styleSheetHeader,ranges);}
ranges.push({startOffset:rule.startOffset,endOffset:rule.endOffset,count:Number(rule.used)});}
for(var entry of rulesByStyleSheet){var styleSheetHeader=(entry[0]);var ranges=(entry[1]);this._addCoverage(styleSheetHeader,styleSheetHeader.contentLength,styleSheetHeader.startLine,styleSheetHeader.startColumn,ranges);}}
_addCoverage(contentProvider,contentLength,startLine,startColumn,ranges){var url=contentProvider.contentURL();if(!url)
return;var entry=this._coverageByURL.get(url);if(!entry){entry=new Coverage.URLCoverageInfo(url);this._coverageByURL.set(url,entry);}
var segments=Coverage.CoverageModel._convertToDisjointSegments(ranges);entry.update(contentProvider,contentLength,startLine,startColumn,segments);}};Coverage.URLCoverageInfo=class{constructor(url){this._url=url;this._coverageInfoByLocation=new Map();this._size=0;this._unusedSize=0;this._usedSize=0;this._type;}
update(contentProvider,contentLength,lineOffset,columnOffset,segments){var key=`${lineOffset}:${columnOffset}`;var entry=this._coverageInfoByLocation.get(key);if(!entry){entry=new Coverage.CoverageInfo(contentProvider,lineOffset,columnOffset);this._coverageInfoByLocation.set(key,entry);this._size+=contentLength;this._type|=entry.type();}
this._usedSize-=entry._usedSize;this._unusedSize-=entry._unusedSize;entry.mergeCoverage(segments);this._usedSize+=entry._usedSize;this._unusedSize+=entry._unusedSize;}
url(){return this._url;}
type(){return this._type;}
size(){return this._size;}
unusedSize(){return this._unusedSize;}
usedSize(){return this._usedSize;}
async buildTextRanges(){var textRangePromises=[];for(var coverageInfo of this._coverageInfoByLocation.values())
textRangePromises.push(coverageInfo.buildTextRanges());var allTextRanges=await Promise.all(textRangePromises);return[].concat(...allTextRanges);}};Coverage.CoverageInfo=class{constructor(contentProvider,lineOffset,columnOffset){this._contentProvider=contentProvider;this._lineOffset=lineOffset;this._columnOffset=columnOffset;this._usedSize=0;this._unusedSize=0;if(contentProvider.contentType().isScript()){this._coverageType=Coverage.CoverageType.JavaScript;}else if(contentProvider.contentType().isStyleSheet()){this._coverageType=Coverage.CoverageType.CSS;}else{console.assert(false,`Unexpected resource type ${contentProvider.contentType().name} for ${contentProvider.contentURL()}`);}
this._segments=[];}
type(){return this._coverageType;}
mergeCoverage(segments){this._segments=Coverage.CoverageInfo._mergeCoverage(this._segments,segments);this._updateStats();}
static _mergeCoverage(segmentsA,segmentsB){var result=[];var indexA=0;var indexB=0;while(indexA<segmentsA.length&&indexB<segmentsB.length){var a=segmentsA[indexA];var b=segmentsB[indexB];var count=typeof a.count==='number'||typeof b.count==='number'?(a.count||0)+(b.count||0):undefined;var depth=Math.max(a.depth,b.depth);var end=Math.min(a.end,b.end);var last=result.peekLast();if(!last||last.count!==count||last.depth!==depth)
result.push({end:end,count:count,depth:depth});else
last.end=end;if(a.end<=b.end)
indexA++;if(a.end>=b.end)
indexB++;}
for(;indexA<segmentsA.length;indexA++)
result.push(segmentsA[indexA]);for(;indexB<segmentsB.length;indexB++)
result.push(segmentsB[indexB]);return result;}
async buildTextRanges(){var contents=await this._contentProvider.requestContent();if(!contents)
return[];var text=new Common.Text(contents);var lastOffset=0;var rangesByDepth=[];for(var segment of this._segments){if(typeof segment.count!=='number'){lastOffset=segment.end;continue;}
var startPosition=text.positionFromOffset(lastOffset);var endPosition=text.positionFromOffset(segment.end);if(!startPosition.lineNumber)
startPosition.columnNumber+=this._columnOffset;startPosition.lineNumber+=this._lineOffset;if(!endPosition.lineNumber)
endPosition.columnNumber+=this._columnOffset;endPosition.lineNumber+=this._lineOffset;var ranges=rangesByDepth[segment.depth-1];if(!ranges){ranges=[];rangesByDepth[segment.depth-1]=ranges;}
ranges.push({count:segment.count,range:new Common.TextRange(startPosition.lineNumber,startPosition.columnNumber,endPosition.lineNumber,endPosition.columnNumber)});lastOffset=segment.end;}
var result=[];for(var ranges of rangesByDepth){for(var r of ranges)
result.push({count:r.count,range:r.range});}
return result;}
_updateStats(){this._usedSize=0;this._unusedSize=0;var last=0;for(var segment of this._segments){if(typeof segment.count==='number'){if(segment.count)
this._usedSize+=segment.end-last;else
this._unusedSize+=segment.end-last;}
last=segment.end;}}};;Coverage.CoverageListView=class extends UI.VBox{constructor(){super(true);this.registerRequiredCSS('coverage/coverageListView.css');var columns=[{id:'url',title:Common.UIString('URL'),width:'300px',fixedWidth:false,sortable:true},{id:'type',title:Common.UIString('Type'),width:'45px',fixedWidth:true,sortable:true},{id:'size',title:Common.UIString('Total Bytes'),width:'60px',fixedWidth:true,sortable:true,align:DataGrid.DataGrid.Align.Right},{id:'unusedSize',title:Common.UIString('Unused Bytes'),width:'60px',fixedWidth:true,sortable:true,align:DataGrid.DataGrid.Align.Right,sort:DataGrid.DataGrid.Order.Descending},{id:'bars',title:'',width:'500px',fixedWidth:false,sortable:false}];this._dataGrid=new DataGrid.SortableDataGrid(columns);this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);this._dataGrid.element.classList.add('flex-auto');this._dataGrid.element.addEventListener('dblclick',this._onDoubleClick.bind(this),false);this._dataGrid.element.addEventListener('keydown',this._onKeyDown.bind(this),false);this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged,this._sortingChanged,this);var dataGridWidget=this._dataGrid.asWidget();dataGridWidget.show(this.contentElement);}
update(coverageInfo){var maxSize=coverageInfo.reduce((acc,entry)=>Math.max(acc,entry.size()),0);var rootNode=this._dataGrid.rootNode();rootNode.removeChildren();for(var entry of coverageInfo)
rootNode.appendChild(new Coverage.CoverageListView.GridNode(entry,maxSize));this._sortingChanged();}
_onDoubleClick(event){if(!event.target||!(event.target instanceof Node))
return;event.consume(true);this._revealSourceForNode(this._dataGrid.dataGridNodeFromNode(event.target));}
_onKeyDown(event){if(!isEnterKey(event))
return;event.consume(true);this._revealSourceForNode(this._dataGrid.selectedNode);}
_revealSourceForNode(node){if(!node)
return;var coverageInfo=(node)._coverageInfo;var sourceCode=Workspace.workspace.uiSourceCodeForURL(coverageInfo.url());if(!sourceCode)
return;Common.Revealer.reveal(sourceCode);}
_sortingChanged(){var columnId=this._dataGrid.sortColumnId();if(!columnId)
return;var sortFunction;switch(columnId){case'url':sortFunction=compareURL;break;case'type':sortFunction=compareNumericField.bind(null,'type');break;case'size':sortFunction=compareNumericField.bind(null,'size');break;case'unusedSize':sortFunction=compareNumericField.bind(null,'unusedSize');break;default:console.assert(false,'Unknown sort field: '+columnId);return;}
this._dataGrid.sortNodes(sortFunction,!this._dataGrid.isSortOrderAscending());function compareURL(a,b){var nodeA=(a);var nodeB=(b);return nodeA._displayURL.localeCompare(nodeB._displayURL);}
function compareNumericField(fieldName,a,b){var nodeA=(a);var nodeB=(b);return nodeA._coverageInfo[fieldName]()-nodeB._coverageInfo[fieldName]();}}
static _typeToString(type){var types=[];if(type&Coverage.CoverageType.CSS)
types.push(Common.UIString('CSS'));if(type&Coverage.CoverageType.JavaScript)
types.push(Common.UIString('JS'));return types.join('+');}};Coverage.CoverageListView.GridNode=class extends DataGrid.SortableDataGridNode{constructor(coverageInfo,maxSize){super();this._coverageInfo=coverageInfo;this._url=coverageInfo.url();this._displayURL=new Common.ParsedURL(this._url).displayName;this._maxSize=maxSize;}
createCell(columnId){var cell=this.createTD(columnId);switch(columnId){case'url':cell.title=this._url;var outer=cell.createChild('div','url-outer');var prefix=outer.createChild('div','url-prefix');var suffix=outer.createChild('div','url-suffix');var splitURL=/^(.*)(\/[^/]*)$/.exec(this._url);prefix.textContent=splitURL?splitURL[1]:this._url;suffix.textContent=splitURL?splitURL[2]:'';break;case'type':cell.textContent=Coverage.CoverageListView._typeToString(this._coverageInfo.type());break;case'size':cell.classList.add('numeric-column');cell.textContent=Number.withThousandsSeparator(this._coverageInfo.size()||0);break;case'unusedSize':cell.classList.add('numeric-column');cell.textContent=Number.withThousandsSeparator(this._coverageInfo.unusedSize()||0);if(this._coverageInfo.size())
cell.title=Math.round(100*this._coverageInfo.unusedSize()/this._coverageInfo.size())+'%';break;case'bars':var barContainer=cell.createChild('div','bar-container');var unusedSizeBar=barContainer.createChild('div','bar bar-unused-size');unusedSizeBar.style.width=Math.ceil(100*this._coverageInfo.unusedSize()/this._maxSize)+'%';var usedSizeBar=barContainer.createChild('div','bar bar-used-size');usedSizeBar.style.width=Math.ceil(100*this._coverageInfo.usedSize()/this._maxSize)+'%';var sizeBar=barContainer.createChild('div','bar bar-slack-size');var slackSize=this._coverageInfo.size()-this._coverageInfo.unusedSize()-this._coverageInfo.usedSize();sizeBar.style.width=Math.ceil(100*slackSize/this._maxSize)+'%';}
return cell;}};;Coverage.CoverageView=class extends UI.VBox{constructor(){super(true);this._model=null;this.registerRequiredCSS('coverage/coverageView.css');var toolbarContainer=this.contentElement.createChild('div','coverage-toolbar-container');var topToolbar=new UI.Toolbar('coverage-toolbar',toolbarContainer);this._toggleRecordAction=(UI.actionRegistry.action('coverage.toggle-recording'));topToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleRecordAction));var clearButton=new UI.ToolbarButton(Common.UIString('Clear all'),'largeicon-clear');clearButton.addEventListener(UI.ToolbarButton.Events.Click,this._reset.bind(this));topToolbar.appendToolbarItem(clearButton);this._coverageResultsElement=this.contentElement.createChild('div','coverage-results');this._progressElement=this._coverageResultsElement.createChild('div','progress-view');this._listView=new Coverage.CoverageListView();this._statusToolbarElement=this.contentElement.createChild('div','coverage-toolbar-summary');this._statusMessageElement=this._statusToolbarElement.createChild('div','coverage-message');}
_reset(){Workspace.workspace.uiSourceCodes().forEach(uiSourceCode=>uiSourceCode.removeDecorationsForType(Coverage.CoverageView.LineDecorator.type));this._listView.detach();this._coverageResultsElement.removeChildren();this._progressElement.textContent='';this._coverageResultsElement.appendChild(this._progressElement);this._statusMessageElement.textContent='';}
_toggleRecording(){var enable=!this._toggleRecordAction.toggled();if(enable)
this._startRecording();else
this._stopRecording();}
_startRecording(){this._reset();var mainTarget=SDK.targetManager.mainTarget();if(!mainTarget)
return;console.assert(!this._model,'Attempting to start coverage twice');var model=new Coverage.CoverageModel(mainTarget);if(!model.start())
return;this._model=model;this._toggleRecordAction.setToggled(true);this._progressElement.textContent=Common.UIString('Recording...');}
async _stopRecording(){this._toggleRecordAction.setToggled(false);this._progressElement.textContent=Common.UIString('Fetching results...');var coverageInfo=await this._model.stop();this._model=null;this._updateViews(coverageInfo);}
async _updateViews(coverageInfo){this._updateStats(coverageInfo);this._coverageResultsElement.removeChildren();this._listView.update(coverageInfo);this._listView.show(this._coverageResultsElement);await Promise.all(coverageInfo.map(entry=>Coverage.CoverageView._updateGutter(entry)));}
_updateStats(coverageInfo){var total=0;var unused=0;for(var info of coverageInfo){total+=info.size();unused+=info.unusedSize();}
var percentUnused=total?Math.round(100*unused/total):0;this._statusMessageElement.textContent=Common.UIString('%s of %s bytes are not used. (%d%%)',Number.bytesToString(unused),Number.bytesToString(total),percentUnused);}
static async _updateGutter(coverageInfo){var uiSourceCode=Workspace.workspace.uiSourceCodeForURL(coverageInfo.url());if(!uiSourceCode)
return;var ranges=await coverageInfo.buildTextRanges();for(var r of ranges)
uiSourceCode.addDecoration(r.range,Coverage.CoverageView.LineDecorator.type,r.count);}};Coverage.CoverageView.LineDecorator=class{decorate(uiSourceCode,textEditor){var gutterType='CodeMirror-gutter-coverage';var decorations=uiSourceCode.decorationsForType(Coverage.CoverageView.LineDecorator.type);textEditor.uninstallGutter(gutterType);if(!decorations||!decorations.size)
return;textEditor.installGutter(gutterType,false);for(var decoration of decorations){for(var line=decoration.range().startLine;line<=decoration.range().endLine;++line){var element=createElementWithClass('div');if(decoration.data())
element.className='text-editor-coverage-used-marker';else
element.className='text-editor-coverage-unused-marker';textEditor.setGutterDecoration(line,gutterType,element);}}}};Coverage.CoverageView.LineDecorator.type='coverage';Coverage.CoverageView.RecordActionDelegate=class{handleAction(context,actionId){var coverageViewId='coverage';UI.viewManager.showView(coverageViewId).then(()=>UI.viewManager.view(coverageViewId).widget()).then(widget=>(widget)._toggleRecording());return true;}};;Runtime.cachedResources["coverage/coverageListView.css"]=".data-grid {\n  border: none;\n}\n\n.data-grid td .url-outer {\n  width: 100%;\n  display: inline-flex;\n  justify-content: flex-start;\n}\n\n.data-grid td .url-prefix {\n  overflow-x: hidden;\n  text-overflow: ellipsis;\n}\n\n.data-grid td .url-suffix {\n  flex: none;\n}\n\n.data-grid td .bar {\n  display: inline-block;\n  height: 8px;\n}\n\n.data-grid .selected td .bar {\n  border-top: 1px white solid;\n  border-bottom: 1px white solid;\n}\n\n.data-grid .selected td .bar:last-child {\n  border-right: 1px white solid;\n}\n\n.data-grid .selected td .bar:first-child {\n  border-left: 1px white solid;\n}\n\n.data-grid td .bar-container {\n}\n\n.data-grid td .bar-slack-size {\n  background-color: rgb(150, 150, 200);\n}\n\n.data-grid td .bar-unused-size {\n  background-color: #E57373;\n}\n\n.data-grid td .bar-used-size {\n  background-color: #81C784;\n}\n\n/*# sourceURL=coverage/coverageListView.css */";Runtime.cachedResources["coverage/coverageView.css"]="/*\n * Copyright (c) 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    overflow: hidden;\n}\n\n.coverage-toolbar-container {\n    display: flex;\n    border-bottom: 1px solid #ccc;\n    flex: 0 0;\n}\n\n.coverage-toolbar {\n    display: inline-block;\n}\n\n.coverage-toolbar-summary {\n    background-color: #eee;\n    border-top: 1px solid #ccc;\n    padding-left: 5px;\n    flex: 0 0 19px;\n    display: flex;\n    padding-right: 5px;\n}\n\n.coverage-toolbar-summary .coverage-message {\n    padding-top: 2px;\n    padding-left: 1ex;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    overflow: hidden;\n}\n\n.coverage-results {\n    overflow-y: auto;\n    display: flex;\n    flex: auto;\n}\n\n.progress-view {\n    position: absolute;\n    top: 50%;\n    left: 50%;\n    transform: translateX(-50%) translateY(-50%);\n    font-size: 30px;\n}\n\n.coverage-results > div {\n    flex: auto;\n}\n\n/*# sourceURL=coverage/coverageView.css */";