TimelineModel.TimelineModelFilter=class{accept(event){return true;}};TimelineModel.TimelineVisibleEventsFilter=class extends TimelineModel.TimelineModelFilter{constructor(visibleTypes){super();this._visibleTypes=new Set(visibleTypes);}
accept(event){return this._visibleTypes.has(TimelineModel.TimelineVisibleEventsFilter._eventType(event));}
static _eventType(event){if(event.hasCategory(TimelineModel.TimelineModel.Category.Console))
return TimelineModel.TimelineModel.RecordType.ConsoleTime;if(event.hasCategory(TimelineModel.TimelineModel.Category.UserTiming))
return TimelineModel.TimelineModel.RecordType.UserTiming;if(event.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo))
return TimelineModel.TimelineModel.RecordType.LatencyInfo;return(event.name);}};TimelineModel.ExclusiveNameFilter=class extends TimelineModel.TimelineModelFilter{constructor(excludeNames){super();this._excludeNames=new Set(excludeNames);}
accept(event){return!this._excludeNames.has(event.name);}};TimelineModel.ExcludeTopLevelFilter=class extends TimelineModel.TimelineModelFilter{constructor(){super();}
accept(event){return!SDK.TracingModel.isTopLevelEvent(event);}};;TimelineModel.TracingLayerPayload;TimelineModel.TracingLayerTile;TimelineModel.TracingLayerTree=class extends SDK.LayerTreeBase{constructor(target){super(target);this._tileById=new Map();}
setLayers(root,layers,paints,callback){var idsToResolve=new Set();if(root){this._extractNodeIdsToResolve(idsToResolve,{},root);}else{for(var i=0;i<layers.length;++i)
this._extractNodeIdsToResolve(idsToResolve,{},layers[i]);}
this.resolveBackendNodeIds(idsToResolve,onBackendNodeIdsResolved.bind(this));function onBackendNodeIdsResolved(){var oldLayersById=this._layersById;this._layersById={};this.setContentRoot(null);if(root){var convertedLayers=this._innerSetLayers(oldLayersById,root);this.setRoot(convertedLayers);}else{var processedLayers=layers.map(this._innerSetLayers.bind(this,oldLayersById));var contentRoot=this.contentRoot();this.setRoot(contentRoot);for(var i=0;i<processedLayers.length;++i){if(processedLayers[i].id()!==contentRoot.id())
contentRoot.addChild(processedLayers[i]);}}
this._setPaints(paints);callback();}}
setTiles(tiles){this._tileById=new Map();for(var tile of tiles)
this._tileById.set(tile.id,tile);}
pictureForRasterTile(tileId){var tile=this._tileById.get('cc::Tile/'+tileId);if(!tile){Common.console.error(`Tile ${tileId} is missing`);return(Promise.resolve(null));}
var layer=this.layerById(tile.layer_id);if(!layer){Common.console.error(`Layer ${tile.layer_id} for tile ${tileId} is not found`);return(Promise.resolve(null));}
return layer._pictureForRect(tile.content_rect);}
_setPaints(paints){for(var i=0;i<paints.length;++i){var layer=this._layersById[paints[i].layerId()];if(layer)
layer._addPaintEvent(paints[i]);}}
_innerSetLayers(oldLayersById,payload){var layer=(oldLayersById[payload.layer_id]);if(layer)
layer._reset(payload);else
layer=new TimelineModel.TracingLayer(this.target(),payload);this._layersById[payload.layer_id]=layer;if(payload.owner_node)
layer._setNode(this.backendNodeIdToNode().get(payload.owner_node)||null);if(!this.contentRoot()&&layer.drawsContent())
this.setContentRoot(layer);for(var i=0;payload.children&&i<payload.children.length;++i)
layer.addChild(this._innerSetLayers(oldLayersById,payload.children[i]));return layer;}
_extractNodeIdsToResolve(nodeIdsToResolve,seenNodeIds,payload){var backendNodeId=payload.owner_node;if(backendNodeId&&!this.backendNodeIdToNode().has(backendNodeId))
nodeIdsToResolve.add(backendNodeId);for(var i=0;payload.children&&i<payload.children.length;++i)
this._extractNodeIdsToResolve(nodeIdsToResolve,seenNodeIds,payload.children[i]);}};TimelineModel.TracingLayer=class{constructor(target,payload){this._target=target;this._reset(payload);}
_reset(payload){this._node=null;this._layerId=String(payload.layer_id);this._offsetX=payload.position[0];this._offsetY=payload.position[1];this._width=payload.bounds.width;this._height=payload.bounds.height;this._children=[];this._parentLayerId=null;this._parent=null;this._quad=payload.layer_quad||[];this._createScrollRects(payload);this._compositingReasons=payload.compositing_reasons||[];this._drawsContent=!!payload.draws_content;this._gpuMemoryUsage=payload.gpu_memory_usage;this._paints=[];}
id(){return this._layerId;}
parentId(){return this._parentLayerId;}
parent(){return this._parent;}
isRoot(){return!this.parentId();}
children(){return this._children;}
addChild(child){if(child._parent)
console.assert(false,'Child already has a parent');this._children.push(child);child._parent=this;child._parentLayerId=this._layerId;}
_setNode(node){this._node=node;}
node(){return this._node;}
nodeForSelfOrAncestor(){for(var layer=this;layer;layer=layer._parent){if(layer._node)
return layer._node;}
return null;}
offsetX(){return this._offsetX;}
offsetY(){return this._offsetY;}
width(){return this._width;}
height(){return this._height;}
transform(){return null;}
quad(){return this._quad;}
anchorPoint(){return[0.5,0.5,0];}
invisible(){return false;}
paintCount(){return 0;}
lastPaintRect(){return null;}
scrollRects(){return this._scrollRects;}
gpuMemoryUsage(){return this._gpuMemoryUsage;}
snapshots(){return this._paints.map(paint=>paint.snapshotPromise().then(snapshot=>{if(!snapshot)
return null;var rect={x:snapshot.rect[0],y:snapshot.rect[1],width:snapshot.rect[2],height:snapshot.rect[3]};return{rect:rect,snapshot:snapshot.snapshot};}));}
_pictureForRect(targetRect){return Promise.all(this._paints.map(paint=>paint.picturePromise())).then(pictures=>{var fragments=pictures.filter(picture=>picture&&rectsOverlap(picture.rect,targetRect)).map(picture=>({x:picture.rect[0],y:picture.rect[1],picture:picture.serializedPicture}));if(!fragments.length||!this._target)
return null;var x0=fragments.reduce((min,item)=>Math.min(min,item.x),Infinity);var y0=fragments.reduce((min,item)=>Math.min(min,item.y),Infinity);var rect={x:targetRect[0]-x0,y:targetRect[1]-y0,width:targetRect[2],height:targetRect[3]};return SDK.PaintProfilerSnapshot.loadFromFragments(this._target,fragments).then(snapshot=>snapshot?{rect:rect,snapshot:snapshot}:null);});function segmentsOverlap(a1,a2,b1,b2){console.assert(a1<=a2&&b1<=b2,'segments should be specified as ordered pairs');return a2>b1&&a1<b2;}
function rectsOverlap(a,b){return segmentsOverlap(a[0],a[0]+a[2],b[0],b[0]+b[2])&&segmentsOverlap(a[1],a[1]+a[3],b[1],b[1]+b[3]);}}
_scrollRectsFromParams(params,type){return{rect:{x:params[0],y:params[1],width:params[2],height:params[3]},type:type};}
_createScrollRects(payload){this._scrollRects=[];if(payload.non_fast_scrollable_region){this._scrollRects.push(this._scrollRectsFromParams(payload.non_fast_scrollable_region,SDK.Layer.ScrollRectType.NonFastScrollable.name));}
if(payload.touch_event_handler_region){this._scrollRects.push(this._scrollRectsFromParams(payload.touch_event_handler_region,SDK.Layer.ScrollRectType.TouchEventHandler.name));}
if(payload.wheel_event_handler_region){this._scrollRects.push(this._scrollRectsFromParams(payload.wheel_event_handler_region,SDK.Layer.ScrollRectType.WheelEventHandler.name));}
if(payload.scroll_event_handler_region){this._scrollRects.push(this._scrollRectsFromParams(payload.scroll_event_handler_region,SDK.Layer.ScrollRectType.RepaintsOnScroll.name));}}
_addPaintEvent(paint){this._paints.push(paint);}
requestCompositingReasons(callback){callback(this._compositingReasons);}
drawsContent(){return this._drawsContent;}};;TimelineModel.TimelineModel=class{constructor(){this.reset();}
static forEachEvent(events,onStartEvent,onEndEvent,onInstantEvent,startTime,endTime,filter){startTime=startTime||0;endTime=endTime||Infinity;var stack=[];var startEvent=TimelineModel.TimelineModel._topLevelEventEndingAfter(events,startTime);for(var i=startEvent;i<events.length;++i){var e=events[i];if((e.endTime||e.startTime)<startTime)
continue;if(e.startTime>=endTime)
break;if(SDK.TracingModel.isAsyncPhase(e.phase)||SDK.TracingModel.isFlowPhase(e.phase))
continue;while(stack.length&&stack.peekLast().endTime<=e.startTime)
onEndEvent(stack.pop());if(filter&&!filter(e))
continue;if(e.duration){onStartEvent(e);stack.push(e);}else{onInstantEvent&&onInstantEvent(e,stack.peekLast()||null);}}
while(stack.length)
onEndEvent(stack.pop());}
static _topLevelEventEndingAfter(events,time){var index=events.upperBound(time,(time,event)=>time-event.startTime)-1;while(index>0&&!SDK.TracingModel.isTopLevelEvent(events[index]))
index--;return Math.max(index,0);}
static isVisible(filters,event){for(var i=0;i<filters.length;++i){if(!filters[i].accept(event))
return false;}
return true;}
static isMarkerEvent(event){const recordTypes=TimelineModel.TimelineModel.RecordType;switch(event.name){case recordTypes.TimeStamp:case recordTypes.MarkFirstPaint:case recordTypes.FirstTextPaint:case recordTypes.FirstImagePaint:case recordTypes.FirstMeaningfulPaint:case recordTypes.FirstPaint:case recordTypes.FirstContentfulPaint:return true;case recordTypes.MarkDOMContent:case recordTypes.MarkLoad:return event.args['data']['isMainFrame'];default:return false;}}
static globalEventId(event,field){var data=event.args['data']||event.args['beginData'];var id=data&&data[field];if(!id)
return'';return`${event.thread.process().id()}.${id}`;}
static eventFrameId(event){return TimelineModel.TimelineModel.globalEventId(event,'frame');}
cpuProfiles(){return this._cpuProfiles;}
sessionId(){return this._sessionId;}
targetByEvent(event){var workerId=this._workerIdByThread.get(event.thread);var mainTarget=SDK.targetManager.mainTarget();return workerId?SDK.targetManager.targetById(workerId):mainTarget;}
setEvents(tracingModel,produceTraceStartedInPage){this.reset();this._resetProcessingState();this._minimumRecordTime=tracingModel.minimumRecordTime();this._maximumRecordTime=tracingModel.maximumRecordTime();var metadataEvents=this._processMetadataEvents(tracingModel,!!produceTraceStartedInPage);if(Runtime.experiments.isEnabled('timelineShowAllProcesses')){var lastPageMetaEvent=metadataEvents.page.peekLast();for(var process of tracingModel.sortedProcesses()){for(var thread of process.sortedThreads())
this._processThreadEvents(tracingModel,0,Infinity,thread,thread===lastPageMetaEvent.thread);}}else{var startTime=0;for(var i=0,length=metadataEvents.page.length;i<length;i++){var metaEvent=metadataEvents.page[i];var process=metaEvent.thread.process();var endTime=i+1<length?metadataEvents.page[i+1].startTime:Infinity;this._currentPage=metaEvent.args['data']&&metaEvent.args['data']['page'];for(var thread of process.sortedThreads()){if(thread.name()===TimelineModel.TimelineModel.WorkerThreadName){var workerMetaEvent=metadataEvents.workers.find(e=>e.args['data']['workerThreadId']===thread.id());if(!workerMetaEvent)
continue;var workerId=workerMetaEvent.args['data']['workerId'];if(workerId)
this._workerIdByThread.set(thread,workerId);}
this._processThreadEvents(tracingModel,startTime,endTime,thread,thread===metaEvent.thread);}
startTime=endTime;}}
this._inspectedTargetEvents.sort(SDK.TracingModel.Event.compareStartTime);this._processBrowserEvents(tracingModel);this._buildGPUEvents(tracingModel);this._insertFirstPaintEvent();this._resetProcessingState();}
_processMetadataEvents(tracingModel,produceTraceStartedInPage){var metadataEvents=tracingModel.devToolsMetadataEvents();var pageDevToolsMetadataEvents=[];var workersDevToolsMetadataEvents=[];for(var event of metadataEvents){if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage){pageDevToolsMetadataEvents.push(event);var frames=((event.args['data']&&event.args['data']['frames'])||[]);frames.forEach(payload=>this._addPageFrame(event,payload));}else if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingSessionIdForWorker){workersDevToolsMetadataEvents.push(event);}else if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInBrowser){console.assert(!this._mainFrameNodeId,'Multiple sessions in trace');this._mainFrameNodeId=event.args['frameTreeNodeId'];}}
if(!pageDevToolsMetadataEvents.length){var pageMetaEvent=produceTraceStartedInPage?this._makeMockPageMetadataEvent(tracingModel):null;if(!pageMetaEvent){console.error(TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage+' event not found.');return{page:[],workers:[]};}
pageDevToolsMetadataEvents.push(pageMetaEvent);}
var sessionId=pageDevToolsMetadataEvents[0].args['sessionId']||pageDevToolsMetadataEvents[0].args['data']['sessionId'];this._sessionId=sessionId;var mismatchingIds=new Set();function checkSessionId(event){var args=event.args;if(args['data'])
args=args['data'];var id=args['sessionId'];if(id===sessionId)
return true;mismatchingIds.add(id);return false;}
var result={page:pageDevToolsMetadataEvents.filter(checkSessionId).sort(SDK.TracingModel.Event.compareStartTime),workers:workersDevToolsMetadataEvents.filter(checkSessionId).sort(SDK.TracingModel.Event.compareStartTime)};if(mismatchingIds.size){Common.console.error('Timeline recording was started in more than one page simultaneously. Session id mismatch: '+
this._sessionId+' and '+mismatchingIds.valuesArray()+'.');}
return result;}
_makeMockPageMetadataEvent(tracingModel){var rendererMainThreadName=TimelineModel.TimelineModel.RendererMainThreadName;var process=tracingModel.sortedProcesses().filter(function(p){return p.threadByName(rendererMainThreadName);})[0];var thread=process&&process.threadByName(rendererMainThreadName);if(!thread)
return null;var pageMetaEvent=new SDK.TracingModel.Event(SDK.TracingModel.DevToolsMetadataEventCategory,TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage,SDK.TracingModel.Phase.Metadata,tracingModel.minimumRecordTime(),thread);pageMetaEvent.addArgs({'data':{'sessionId':'mockSessionId'}});return pageMetaEvent;}
_insertFirstPaintEvent(){if(!this._firstCompositeLayers)
return;var recordTypes=TimelineModel.TimelineModel.RecordType;var i=this._inspectedTargetEvents.lowerBound(this._firstCompositeLayers,SDK.TracingModel.Event.compareStartTime);for(;i<this._inspectedTargetEvents.length&&this._inspectedTargetEvents[i].name!==recordTypes.DrawFrame;++i){}
if(i>=this._inspectedTargetEvents.length)
return;var drawFrameEvent=this._inspectedTargetEvents[i];var firstPaintEvent=new SDK.TracingModel.Event(drawFrameEvent.categoriesString,recordTypes.MarkFirstPaint,SDK.TracingModel.Phase.Instant,drawFrameEvent.startTime,drawFrameEvent.thread);this._mainThreadEvents.splice(this._mainThreadEvents.lowerBound(firstPaintEvent,SDK.TracingModel.Event.compareStartTime),0,firstPaintEvent);this._eventDividers.splice(this._eventDividers.lowerBound(firstPaintEvent,SDK.TracingModel.Event.compareStartTime),0,firstPaintEvent);}
_processBrowserEvents(tracingModel){var browserMain=SDK.TracingModel.browserMainThread(tracingModel);if(!browserMain)
return;browserMain.events().forEach(this._processBrowserEvent,this);var asyncEventsByGroup=new Map();this._processAsyncEvents(asyncEventsByGroup,browserMain.asyncEvents());this._mergeAsyncEvents(this._mainThreadAsyncEventsByGroup,asyncEventsByGroup);}
_buildGPUEvents(tracingModel){var thread=tracingModel.threadByName('GPU Process','CrGpuMain');if(!thread)
return;var gpuEventName=TimelineModel.TimelineModel.RecordType.GPUTask;this._gpuEvents=thread.events().filter(event=>event.name===gpuEventName);}
_resetProcessingState(){this._asyncEventTracker=new TimelineModel.TimelineAsyncEventTracker();this._invalidationTracker=new TimelineModel.InvalidationTracker();this._layoutInvalidate={};this._lastScheduleStyleRecalculation={};this._paintImageEventByPixelRefId={};this._lastPaintForLayer={};this._lastRecalculateStylesEvent=null;this._currentScriptEvent=null;this._eventStack=[];this._hadCommitLoad=false;this._firstCompositeLayers=null;this._knownInputEvents=new Set();this._currentPage=null;}
_extractCpuProfile(tracingModel,thread){var events=thread.events();var cpuProfile;var cpuProfileEvent=events.peekLast();if(cpuProfileEvent&&cpuProfileEvent.name===TimelineModel.TimelineModel.RecordType.CpuProfile){var eventData=cpuProfileEvent.args['data'];cpuProfile=(eventData&&eventData['cpuProfile']);}
if(!cpuProfile){cpuProfileEvent=events.find(e=>e.name===TimelineModel.TimelineModel.RecordType.Profile);if(!cpuProfileEvent)
return null;var profileGroup=tracingModel.profileGroup(cpuProfileEvent.id);if(!profileGroup){Common.console.error('Invalid CPU profile format.');return null;}
cpuProfile=({startTime:cpuProfileEvent.args['data']['startTime'],endTime:0,nodes:[],samples:[],timeDeltas:[]});for(var profileEvent of profileGroup.children){var eventData=profileEvent.args['data'];if('startTime'in eventData)
cpuProfile.startTime=eventData['startTime'];if('endTime'in eventData)
cpuProfile.endTime=eventData['endTime'];var nodesAndSamples=eventData['cpuProfile']||{};cpuProfile.nodes.pushAll(nodesAndSamples['nodes']||[]);cpuProfile.samples.pushAll(nodesAndSamples['samples']||[]);cpuProfile.timeDeltas.pushAll(eventData['timeDeltas']||[]);if(cpuProfile.samples.length!==cpuProfile.timeDeltas.length){Common.console.error('Failed to parse CPU profile.');return null;}}
if(!cpuProfile.endTime)
cpuProfile.endTime=cpuProfile.timeDeltas.reduce((x,y)=>x+y,cpuProfile.startTime);}
try{var jsProfileModel=new SDK.CPUProfileDataModel(cpuProfile);this._cpuProfiles.push(jsProfileModel);return jsProfileModel;}catch(e){Common.console.error('Failed to parse CPU profile.');}
return null;}
_injectJSFrameEvents(tracingModel,thread){var jsProfileModel=this._extractCpuProfile(tracingModel,thread);var events=thread.events();var jsSamples=jsProfileModel?TimelineModel.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile(jsProfileModel,thread):null;if(jsSamples&&jsSamples.length)
events=events.mergeOrdered(jsSamples,SDK.TracingModel.Event.orderedCompareStartTime);if(jsSamples||events.some(e=>e.name===TimelineModel.TimelineModel.RecordType.JSSample)){var jsFrameEvents=TimelineModel.TimelineJSProfileProcessor.generateJSFrameEvents(events);if(jsFrameEvents&&jsFrameEvents.length)
events=jsFrameEvents.mergeOrdered(events,SDK.TracingModel.Event.orderedCompareStartTime);}
return events;}
_processThreadEvents(tracingModel,startTime,endTime,thread,isMainThread){var events=this._injectJSFrameEvents(tracingModel,thread);var asyncEvents=thread.asyncEvents();var groupByFrame=isMainThread&&Runtime.experiments.isEnabled('timelinePerFrameTrack');var threadEvents;var threadAsyncEventsByGroup;if(isMainThread){threadEvents=this._mainThreadEvents;threadAsyncEventsByGroup=this._mainThreadAsyncEventsByGroup;}else{var virtualThread=new TimelineModel.TimelineModel.VirtualThread(thread.name());this._virtualThreads.push(virtualThread);threadEvents=virtualThread.events;threadAsyncEventsByGroup=virtualThread.asyncEventsByGroup;}
this._eventStack=[];var eventStack=this._eventStack;var i=events.lowerBound(startTime,(time,event)=>time-event.startTime);var length=events.length;for(;i<length;i++){var event=events[i];if(endTime&&event.startTime>=endTime)
break;while(eventStack.length&&eventStack.peekLast().endTime<=event.startTime)
eventStack.pop();if(!this._processEvent(event))
continue;if(!SDK.TracingModel.isAsyncPhase(event.phase)&&event.duration){if(eventStack.length){var parent=eventStack.peekLast();parent.selfTime-=event.duration;if(parent.selfTime<0)
this._fixNegativeDuration(parent,event);}
event.selfTime=event.duration;if(isMainThread){if(!eventStack.length)
this._mainThreadTasks.push(event);}
eventStack.push(event);}
if(isMainThread&&TimelineModel.TimelineModel.isMarkerEvent(event))
this._eventDividers.push(event);if(groupByFrame){var frameId=TimelineModel.TimelineData.forEvent(event).frameId;var pageFrame=frameId&&this._pageFrames.get(frameId);var isMainFrame=!frameId||!pageFrame||!pageFrame.parent;if(isMainFrame)
frameId=TimelineModel.TimelineModel.PageFrame.mainFrameId;var frameEvents=this._eventsByFrame.get(frameId);if(!frameEvents){frameEvents=[];this._eventsByFrame.set(frameId,frameEvents);}
frameEvents.push(event);}
threadEvents.push(event);this._inspectedTargetEvents.push(event);}
this._processAsyncEvents(threadAsyncEventsByGroup,asyncEvents,startTime,endTime);if(thread.name()==='Compositor'){this._mergeAsyncEvents(this._mainThreadAsyncEventsByGroup,threadAsyncEventsByGroup);threadAsyncEventsByGroup.clear();}}
_fixNegativeDuration(event,child){var epsilon=1e-3;if(event.selfTime<-epsilon){console.error(`Children are longer than parent at ${event.startTime} `+`(${(child.startTime - this.minimumRecordTime()).toFixed(3)} by ${(-event.selfTime).toFixed(3)}`);}
event.selfTime=0;}
_processAsyncEvents(asyncEventsByGroup,asyncEvents,startTime,endTime){var i=startTime?asyncEvents.lowerBound(startTime,function(time,asyncEvent){return time-asyncEvent.startTime;}):0;for(;i<asyncEvents.length;++i){var asyncEvent=asyncEvents[i];if(endTime&&asyncEvent.startTime>=endTime)
break;var asyncGroup=this._processAsyncEvent(asyncEvent);if(!asyncGroup)
continue;var groupAsyncEvents=asyncEventsByGroup.get(asyncGroup);if(!groupAsyncEvents){groupAsyncEvents=[];asyncEventsByGroup.set(asyncGroup,groupAsyncEvents);}
groupAsyncEvents.push(asyncEvent);}}
_processEvent(event){var recordTypes=TimelineModel.TimelineModel.RecordType;var eventStack=this._eventStack;if(!eventStack.length){if(this._currentTaskLayoutAndRecalcEvents&&this._currentTaskLayoutAndRecalcEvents.length){var totalTime=this._currentTaskLayoutAndRecalcEvents.reduce((time,event)=>time+event.duration,0);if(totalTime>TimelineModel.TimelineModel.Thresholds.ForcedLayout){for(var e of this._currentTaskLayoutAndRecalcEvents){let timelineData=TimelineModel.TimelineData.forEvent(e);timelineData.warning=e.name===recordTypes.Layout?TimelineModel.TimelineModel.WarningType.ForcedLayout:TimelineModel.TimelineModel.WarningType.ForcedStyle;}}}
this._currentTaskLayoutAndRecalcEvents=[];}
if(this._currentScriptEvent&&event.startTime>this._currentScriptEvent.endTime)
this._currentScriptEvent=null;var eventData=event.args['data']||event.args['beginData']||{};var timelineData=TimelineModel.TimelineData.forEvent(event);if(eventData['stackTrace'])
timelineData.stackTrace=eventData['stackTrace'];if(timelineData.stackTrace&&event.name!==recordTypes.JSSample){for(var i=0;i<timelineData.stackTrace.length;++i){--timelineData.stackTrace[i].lineNumber;--timelineData.stackTrace[i].columnNumber;}}
var pageFrameId=TimelineModel.TimelineModel.eventFrameId(event);if(!pageFrameId&&eventStack.length)
pageFrameId=TimelineModel.TimelineData.forEvent(eventStack.peekLast()).frameId;timelineData.frameId=pageFrameId||TimelineModel.TimelineModel.PageFrame.mainFrameId;this._asyncEventTracker.processEvent(event);switch(event.name){case recordTypes.ResourceSendRequest:case recordTypes.WebSocketCreate:timelineData.setInitiator(eventStack.peekLast()||null);timelineData.url=eventData['url'];break;case recordTypes.ScheduleStyleRecalculation:this._lastScheduleStyleRecalculation[eventData['frame']]=event;break;case recordTypes.UpdateLayoutTree:case recordTypes.RecalculateStyles:this._invalidationTracker.didRecalcStyle(event);if(event.args['beginData'])
timelineData.setInitiator(this._lastScheduleStyleRecalculation[event.args['beginData']['frame']]);this._lastRecalculateStylesEvent=event;if(this._currentScriptEvent)
this._currentTaskLayoutAndRecalcEvents.push(event);break;case recordTypes.ScheduleStyleInvalidationTracking:case recordTypes.StyleRecalcInvalidationTracking:case recordTypes.StyleInvalidatorInvalidationTracking:case recordTypes.LayoutInvalidationTracking:case recordTypes.LayerInvalidationTracking:case recordTypes.PaintInvalidationTracking:case recordTypes.ScrollInvalidationTracking:this._invalidationTracker.addInvalidation(new TimelineModel.InvalidationTrackingEvent(event));break;case recordTypes.InvalidateLayout:var layoutInitator=event;var frameId=eventData['frame'];if(!this._layoutInvalidate[frameId]&&this._lastRecalculateStylesEvent&&this._lastRecalculateStylesEvent.endTime>event.startTime)
layoutInitator=TimelineModel.TimelineData.forEvent(this._lastRecalculateStylesEvent).initiator();this._layoutInvalidate[frameId]=layoutInitator;break;case recordTypes.Layout:this._invalidationTracker.didLayout(event);var frameId=event.args['beginData']['frame'];timelineData.setInitiator(this._layoutInvalidate[frameId]);if(event.args['endData'])
timelineData.backendNodeId=event.args['endData']['rootNode'];this._layoutInvalidate[frameId]=null;if(this._currentScriptEvent)
this._currentTaskLayoutAndRecalcEvents.push(event);break;case recordTypes.EventDispatch:if(event.duration>TimelineModel.TimelineModel.Thresholds.RecurringHandler)
timelineData.warning=TimelineModel.TimelineModel.WarningType.LongHandler;break;case recordTypes.TimerFire:case recordTypes.FireAnimationFrame:if(event.duration>TimelineModel.TimelineModel.Thresholds.RecurringHandler)
timelineData.warning=TimelineModel.TimelineModel.WarningType.LongRecurringHandler;break;case recordTypes.FunctionCall:if(typeof eventData['scriptName']==='string')
eventData['url']=eventData['scriptName'];if(typeof eventData['scriptLine']==='number')
eventData['lineNumber']=eventData['scriptLine'];case recordTypes.EvaluateScript:case recordTypes.CompileScript:if(typeof eventData['lineNumber']==='number')
--eventData['lineNumber'];if(typeof eventData['columnNumber']==='number')
--eventData['columnNumber'];case recordTypes.RunMicrotasks:if(!this._currentScriptEvent)
this._currentScriptEvent=event;break;case recordTypes.SetLayerTreeId:this._inspectedTargetLayerTreeId=event.args['layerTreeId']||event.args['data']['layerTreeId'];break;case recordTypes.Paint:this._invalidationTracker.didPaint(event);timelineData.backendNodeId=eventData['nodeId'];if(!eventData['layerId'])
break;var layerId=eventData['layerId'];this._lastPaintForLayer[layerId]=event;break;case recordTypes.DisplayItemListSnapshot:case recordTypes.PictureSnapshot:var layerUpdateEvent=this._findAncestorEvent(recordTypes.UpdateLayer);if(!layerUpdateEvent||layerUpdateEvent.args['layerTreeId']!==this._inspectedTargetLayerTreeId)
break;var paintEvent=this._lastPaintForLayer[layerUpdateEvent.args['layerId']];if(paintEvent){TimelineModel.TimelineData.forEvent(paintEvent).picture=(event);}
break;case recordTypes.ScrollLayer:timelineData.backendNodeId=eventData['nodeId'];break;case recordTypes.PaintImage:timelineData.backendNodeId=eventData['nodeId'];timelineData.url=eventData['url'];break;case recordTypes.DecodeImage:case recordTypes.ResizeImage:var paintImageEvent=this._findAncestorEvent(recordTypes.PaintImage);if(!paintImageEvent){var decodeLazyPixelRefEvent=this._findAncestorEvent(recordTypes.DecodeLazyPixelRef);paintImageEvent=decodeLazyPixelRefEvent&&this._paintImageEventByPixelRefId[decodeLazyPixelRefEvent.args['LazyPixelRef']];}
if(!paintImageEvent)
break;var paintImageData=TimelineModel.TimelineData.forEvent(paintImageEvent);timelineData.backendNodeId=paintImageData.backendNodeId;timelineData.url=paintImageData.url;break;case recordTypes.DrawLazyPixelRef:var paintImageEvent=this._findAncestorEvent(recordTypes.PaintImage);if(!paintImageEvent)
break;this._paintImageEventByPixelRefId[event.args['LazyPixelRef']]=paintImageEvent;var paintImageData=TimelineModel.TimelineData.forEvent(paintImageEvent);timelineData.backendNodeId=paintImageData.backendNodeId;timelineData.url=paintImageData.url;break;case recordTypes.MarkDOMContent:case recordTypes.MarkLoad:var page=eventData['page'];if(page&&page!==this._currentPage)
return false;break;case recordTypes.CommitLoad:var frameId=TimelineModel.TimelineModel.eventFrameId(event);var pageFrame=this._pageFrames.get(frameId);if(pageFrame)
pageFrame.update(eventData.name||'',eventData.url||'');else
this._addPageFrame(event,eventData);var page=eventData['page'];if(page&&page!==this._currentPage)
return false;if(!eventData['isMainFrame'])
break;this._hadCommitLoad=true;this._firstCompositeLayers=null;break;case recordTypes.CompositeLayers:if(!this._firstCompositeLayers&&this._hadCommitLoad)
this._firstCompositeLayers=event;break;case recordTypes.FireIdleCallback:if(event.duration>eventData['allottedMilliseconds']+TimelineModel.TimelineModel.Thresholds.IdleCallbackAddon)
timelineData.warning=TimelineModel.TimelineModel.WarningType.IdleDeadlineExceeded;break;}
return true;}
_processBrowserEvent(event){if(event.name!==TimelineModel.TimelineModel.RecordType.LatencyInfoFlow)
return;var frameId=event.args['frameTreeNodeId'];if(typeof frameId==='number'&&frameId===this._mainFrameNodeId)
this._knownInputEvents.add(event.bind_id);}
_processAsyncEvent(asyncEvent){var groups=TimelineModel.TimelineModel.AsyncEventGroup;if(asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.Console))
return groups.console;if(asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.UserTiming))
return groups.userTiming;if(asyncEvent.name===TimelineModel.TimelineModel.RecordType.Animation)
return groups.animation;if(asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)||asyncEvent.name===TimelineModel.TimelineModel.RecordType.ImplSideFling){var lastStep=asyncEvent.steps.peekLast();if(lastStep.phase!==SDK.TracingModel.Phase.AsyncEnd)
return null;var data=lastStep.args['data'];asyncEvent.causedFrame=!!(data&&data['INPUT_EVENT_LATENCY_RENDERER_SWAP_COMPONENT']);if(asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)){if(!this._knownInputEvents.has(lastStep.id))
return null;if(asyncEvent.name===TimelineModel.TimelineModel.RecordType.InputLatencyMouseMove&&!asyncEvent.causedFrame)
return null;var rendererMain=data['INPUT_EVENT_LATENCY_RENDERER_MAIN_COMPONENT'];if(rendererMain){var time=rendererMain['time']/1000;TimelineModel.TimelineData.forEvent(asyncEvent.steps[0]).timeWaitingForMainThread=time-asyncEvent.steps[0].startTime;}}
return groups.input;}
return null;}
_findAncestorEvent(name){for(var i=this._eventStack.length-1;i>=0;--i){var event=this._eventStack[i];if(event.name===name)
return event;}
return null;}
_mergeAsyncEvents(target,source){for(var group of source.keys()){var events=target.get(group)||[];events=events.mergeOrdered(source.get(group)||[],SDK.TracingModel.Event.compareStartAndEndTime);target.set(group,events);}}
_addPageFrame(event,payload){var processId=event.thread.process().id();var pageFrame=new TimelineModel.TimelineModel.PageFrame(this.targetByEvent(event),processId,payload);this._pageFrames.set(pageFrame.id,pageFrame);var parent=payload['parent']&&this._pageFrames.get(`${processId}.${payload['parent']}`);if(parent)
parent.addChild(pageFrame);}
reset(){this._virtualThreads=[];this._mainThreadEvents=[];this._mainThreadAsyncEventsByGroup=new Map();this._inspectedTargetEvents=[];this._mainThreadTasks=[];this._gpuEvents=[];this._eventDividers=[];this._sessionId=null;this._mainFrameNodeId=null;this._cpuProfiles=[];this._workerIdByThread=new WeakMap();this._pageFrames=new Map();this._eventsByFrame=new Map();this._minimumRecordTime=0;this._maximumRecordTime=0;}
minimumRecordTime(){return this._minimumRecordTime;}
maximumRecordTime(){return this._maximumRecordTime;}
inspectedTargetEvents(){return this._inspectedTargetEvents;}
mainThreadEvents(){return this._mainThreadEvents;}
mainThreadAsyncEvents(){return this._mainThreadAsyncEventsByGroup;}
virtualThreads(){return this._virtualThreads;}
isEmpty(){return this.minimumRecordTime()===0&&this.maximumRecordTime()===0;}
mainThreadTasks(){return this._mainThreadTasks;}
gpuEvents(){return this._gpuEvents;}
eventDividers(){return this._eventDividers;}
rootFrames(){return Array.from(this._pageFrames.values()).filter(frame=>!frame.parent);}
pageFrameById(frameId){return frameId?this._pageFrames.get(frameId)||null:null;}
eventsForFrame(frameId){return this._eventsByFrame.get(frameId)||[];}
networkRequests(){var requests=new Map();var requestsList=[];var zeroStartRequestsList=[];var types=TimelineModel.TimelineModel.RecordType;var resourceTypes=new Set([types.ResourceSendRequest,types.ResourceReceiveResponse,types.ResourceReceivedData,types.ResourceFinish]);var events=this.mainThreadEvents();for(var i=0;i<events.length;++i){var e=events[i];if(!resourceTypes.has(e.name))
continue;var id=TimelineModel.TimelineModel.globalEventId(e,'requestId');var request=requests.get(id);if(request){request.addEvent(e);}else{request=new TimelineModel.TimelineModel.NetworkRequest(e);requests.set(id,request);if(request.startTime)
requestsList.push(request);else
zeroStartRequestsList.push(request);}}
return zeroStartRequestsList.concat(requestsList);}};TimelineModel.TimelineModel.RecordType={Task:'Task',Program:'Program',EventDispatch:'EventDispatch',GPUTask:'GPUTask',Animation:'Animation',RequestMainThreadFrame:'RequestMainThreadFrame',BeginFrame:'BeginFrame',NeedsBeginFrameChanged:'NeedsBeginFrameChanged',BeginMainThreadFrame:'BeginMainThreadFrame',ActivateLayerTree:'ActivateLayerTree',DrawFrame:'DrawFrame',HitTest:'HitTest',ScheduleStyleRecalculation:'ScheduleStyleRecalculation',RecalculateStyles:'RecalculateStyles',UpdateLayoutTree:'UpdateLayoutTree',InvalidateLayout:'InvalidateLayout',Layout:'Layout',UpdateLayer:'UpdateLayer',UpdateLayerTree:'UpdateLayerTree',PaintSetup:'PaintSetup',Paint:'Paint',PaintImage:'PaintImage',Rasterize:'Rasterize',RasterTask:'RasterTask',ScrollLayer:'ScrollLayer',CompositeLayers:'CompositeLayers',ScheduleStyleInvalidationTracking:'ScheduleStyleInvalidationTracking',StyleRecalcInvalidationTracking:'StyleRecalcInvalidationTracking',StyleInvalidatorInvalidationTracking:'StyleInvalidatorInvalidationTracking',LayoutInvalidationTracking:'LayoutInvalidationTracking',LayerInvalidationTracking:'LayerInvalidationTracking',PaintInvalidationTracking:'PaintInvalidationTracking',ScrollInvalidationTracking:'ScrollInvalidationTracking',ParseHTML:'ParseHTML',ParseAuthorStyleSheet:'ParseAuthorStyleSheet',TimerInstall:'TimerInstall',TimerRemove:'TimerRemove',TimerFire:'TimerFire',XHRReadyStateChange:'XHRReadyStateChange',XHRLoad:'XHRLoad',CompileScript:'v8.compile',EvaluateScript:'EvaluateScript',CommitLoad:'CommitLoad',MarkLoad:'MarkLoad',MarkDOMContent:'MarkDOMContent',MarkFirstPaint:'MarkFirstPaint',TimeStamp:'TimeStamp',ConsoleTime:'ConsoleTime',UserTiming:'UserTiming',FirstTextPaint:'firstTextPaint',FirstImagePaint:'firstImagePaint',FirstMeaningfulPaint:'firstMeaningfulPaint',FirstPaint:'firstPaint',FirstContentfulPaint:'firstContentfulPaint',ResourceSendRequest:'ResourceSendRequest',ResourceReceiveResponse:'ResourceReceiveResponse',ResourceReceivedData:'ResourceReceivedData',ResourceFinish:'ResourceFinish',RunMicrotasks:'RunMicrotasks',FunctionCall:'FunctionCall',GCEvent:'GCEvent',MajorGC:'MajorGC',MinorGC:'MinorGC',JSFrame:'JSFrame',JSSample:'JSSample',V8Sample:'V8Sample',JitCodeAdded:'JitCodeAdded',JitCodeMoved:'JitCodeMoved',ParseScriptOnBackground:'v8.parseOnBackground',UpdateCounters:'UpdateCounters',RequestAnimationFrame:'RequestAnimationFrame',CancelAnimationFrame:'CancelAnimationFrame',FireAnimationFrame:'FireAnimationFrame',RequestIdleCallback:'RequestIdleCallback',CancelIdleCallback:'CancelIdleCallback',FireIdleCallback:'FireIdleCallback',WebSocketCreate:'WebSocketCreate',WebSocketSendHandshakeRequest:'WebSocketSendHandshakeRequest',WebSocketReceiveHandshakeResponse:'WebSocketReceiveHandshakeResponse',WebSocketDestroy:'WebSocketDestroy',EmbedderCallback:'EmbedderCallback',SetLayerTreeId:'SetLayerTreeId',TracingStartedInPage:'TracingStartedInPage',TracingSessionIdForWorker:'TracingSessionIdForWorker',DecodeImage:'Decode Image',ResizeImage:'Resize Image',DrawLazyPixelRef:'Draw LazyPixelRef',DecodeLazyPixelRef:'Decode LazyPixelRef',LazyPixelRef:'LazyPixelRef',LayerTreeHostImplSnapshot:'cc::LayerTreeHostImpl',PictureSnapshot:'cc::Picture',DisplayItemListSnapshot:'cc::DisplayItemList',LatencyInfo:'LatencyInfo',LatencyInfoFlow:'LatencyInfo.Flow',InputLatencyMouseMove:'InputLatency::MouseMove',InputLatencyMouseWheel:'InputLatency::MouseWheel',ImplSideFling:'InputHandlerProxy::HandleGestureFling::started',GCIdleLazySweep:'ThreadState::performIdleLazySweep',GCCompleteSweep:'ThreadState::completeSweep',GCCollectGarbage:'BlinkGCMarking',CpuProfile:'CpuProfile',Profile:'Profile',AsyncTask:'AsyncTask',};TimelineModel.TimelineModel.Category={Console:'blink.console',UserTiming:'blink.user_timing',LatencyInfo:'latencyInfo'};TimelineModel.TimelineModel.WarningType={ForcedStyle:'ForcedStyle',ForcedLayout:'ForcedLayout',IdleDeadlineExceeded:'IdleDeadlineExceeded',LongHandler:'LongHandler',LongRecurringHandler:'LongRecurringHandler',V8Deopt:'V8Deopt'};TimelineModel.TimelineModel.MainThreadName='main';TimelineModel.TimelineModel.WorkerThreadName='DedicatedWorker Thread';TimelineModel.TimelineModel.RendererMainThreadName='CrRendererMain';TimelineModel.TimelineModel.AsyncEventGroup={animation:Symbol('animation'),console:Symbol('console'),userTiming:Symbol('userTiming'),input:Symbol('input')};TimelineModel.TimelineModel.DevToolsMetadataEvent={TracingStartedInBrowser:'TracingStartedInBrowser',TracingStartedInPage:'TracingStartedInPage',TracingSessionIdForWorker:'TracingSessionIdForWorker',};TimelineModel.TimelineModel.Thresholds={Handler:150,RecurringHandler:50,ForcedLayout:30,IdleCallbackAddon:5};TimelineModel.TimelineModel.VirtualThread=class{constructor(name){this.name=name;this.events=[];this.asyncEventsByGroup=new Map();}
isWorker(){return this.name===TimelineModel.TimelineModel.WorkerThreadName;}};TimelineModel.TimelineModel.MetadataEvents;TimelineModel.TimelineModel.PageFrame=class{constructor(target,pid,payload){this.frameId=payload['frame'];this.url=payload['url']||'';this.name=payload['name'];this.processId=pid;this.children=[];this.parent=null;this.id=`${this.processId}.${this.frameId}`;this.ownerNode=target&&payload['nodeId']?new SDK.DeferredDOMNode(target,payload['nodeId']):null;}
update(name,url){this.name=name;this.url=url;}
addChild(child){this.children.push(child);child.parent=this;}};TimelineModel.TimelineModel.PageFrame.mainFrameId='';TimelineModel.TimelineModel.NetworkRequest=class{constructor(event){this.startTime=event.name===TimelineModel.TimelineModel.RecordType.ResourceSendRequest?event.startTime:0;this.endTime=Infinity;this.encodedDataLength=0;this.decodedBodyLength=0;this.children=[];this.timing;this.mimeType;this.url;this.requestMethod;this.addEvent(event);}
addEvent(event){this.children.push(event);var recordType=TimelineModel.TimelineModel.RecordType;this.startTime=Math.min(this.startTime,event.startTime);var eventData=event.args['data'];if(eventData['mimeType'])
this.mimeType=eventData['mimeType'];if('priority'in eventData)
this.priority=eventData['priority'];if(event.name===recordType.ResourceFinish)
this.endTime=event.startTime;if(eventData['finishTime'])
this.finishTime=eventData['finishTime']*1000;if(!this.responseTime&&(event.name===recordType.ResourceReceiveResponse||event.name===recordType.ResourceReceivedData))
this.responseTime=event.startTime;var encodedDataLength=eventData['encodedDataLength']||0;if(event.name===recordType.ResourceReceiveResponse){if(eventData['fromCache'])
this.fromCache=true;if(eventData['fromServiceWorker'])
this.fromServiceWorker=true;this.encodedDataLength=encodedDataLength;}
if(event.name===recordType.ResourceReceivedData)
this.encodedDataLength+=encodedDataLength;if(event.name===recordType.ResourceFinish&&encodedDataLength)
this.encodedDataLength=encodedDataLength;var decodedBodyLength=eventData['decodedBodyLength'];if(event.name===recordType.ResourceFinish&&decodedBodyLength)
this.decodedBodyLength=decodedBodyLength;if(!this.url)
this.url=eventData['url'];if(!this.requestMethod)
this.requestMethod=eventData['requestMethod'];if(!this.timing)
this.timing=eventData['timing'];if(eventData['fromServiceWorker'])
this.fromServiceWorker=true;}};TimelineModel.InvalidationTrackingEvent=class{constructor(event){this.type=event.name;this.startTime=event.startTime;this._tracingEvent=event;var eventData=event.args['data'];this.frame=eventData['frame'];this.nodeId=eventData['nodeId'];this.nodeName=eventData['nodeName'];this.paintId=eventData['paintId'];this.invalidationSet=eventData['invalidationSet'];this.invalidatedSelectorId=eventData['invalidatedSelectorId'];this.changedId=eventData['changedId'];this.changedClass=eventData['changedClass'];this.changedAttribute=eventData['changedAttribute'];this.changedPseudo=eventData['changedPseudo'];this.selectorPart=eventData['selectorPart'];this.extraData=eventData['extraData'];this.invalidationList=eventData['invalidationList'];this.cause={reason:eventData['reason'],stackTrace:eventData['stackTrace']};if(!this.cause.reason&&this.cause.stackTrace&&this.type===TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking)
this.cause.reason='Layout forced';}};TimelineModel.InvalidationCause;TimelineModel.InvalidationTracker=class{constructor(){this._lastRecalcStyle=null;this._lastPaintWithLayer=null;this._didPaint=false;this._initializePerFrameState();}
static invalidationEventsFor(event){return event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol]||null;}
addInvalidation(invalidation){this._startNewFrameIfNeeded();if(!invalidation.nodeId&&!invalidation.paintId){console.error('Invalidation lacks node information.');console.error(invalidation);return;}
var recordTypes=TimelineModel.TimelineModel.RecordType;if(invalidation.type===recordTypes.PaintInvalidationTracking&&invalidation.nodeId){var invalidations=this._invalidationsByNodeId[invalidation.nodeId]||[];for(var i=0;i<invalidations.length;++i)
invalidations[i].paintId=invalidation.paintId;return;}
if(invalidation.type===recordTypes.StyleRecalcInvalidationTracking&&invalidation.cause.reason==='StyleInvalidator')
return;var styleRecalcInvalidation=(invalidation.type===recordTypes.ScheduleStyleInvalidationTracking||invalidation.type===recordTypes.StyleInvalidatorInvalidationTracking||invalidation.type===recordTypes.StyleRecalcInvalidationTracking);if(styleRecalcInvalidation){var duringRecalcStyle=invalidation.startTime&&this._lastRecalcStyle&&invalidation.startTime>=this._lastRecalcStyle.startTime&&invalidation.startTime<=this._lastRecalcStyle.endTime;if(duringRecalcStyle)
this._associateWithLastRecalcStyleEvent(invalidation);}
if(this._invalidations[invalidation.type])
this._invalidations[invalidation.type].push(invalidation);else
this._invalidations[invalidation.type]=[invalidation];if(invalidation.nodeId){if(this._invalidationsByNodeId[invalidation.nodeId])
this._invalidationsByNodeId[invalidation.nodeId].push(invalidation);else
this._invalidationsByNodeId[invalidation.nodeId]=[invalidation];}}
didRecalcStyle(recalcStyleEvent){this._lastRecalcStyle=recalcStyleEvent;var types=[TimelineModel.TimelineModel.RecordType.ScheduleStyleInvalidationTracking,TimelineModel.TimelineModel.RecordType.StyleInvalidatorInvalidationTracking,TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking];for(var invalidation of this._invalidationsOfTypes(types))
this._associateWithLastRecalcStyleEvent(invalidation);}
_associateWithLastRecalcStyleEvent(invalidation){if(invalidation.linkedRecalcStyleEvent)
return;var recordTypes=TimelineModel.TimelineModel.RecordType;var recalcStyleFrameId=this._lastRecalcStyle.args['beginData']['frame'];if(invalidation.type===recordTypes.StyleInvalidatorInvalidationTracking){this._addSyntheticStyleRecalcInvalidations(this._lastRecalcStyle,recalcStyleFrameId,invalidation);}else if(invalidation.type===recordTypes.ScheduleStyleInvalidationTracking){}else{this._addInvalidationToEvent(this._lastRecalcStyle,recalcStyleFrameId,invalidation);}
invalidation.linkedRecalcStyleEvent=true;}
_addSyntheticStyleRecalcInvalidations(event,frameId,styleInvalidatorInvalidation){if(!styleInvalidatorInvalidation.invalidationList){this._addSyntheticStyleRecalcInvalidation(styleInvalidatorInvalidation._tracingEvent,styleInvalidatorInvalidation);return;}
if(!styleInvalidatorInvalidation.nodeId){console.error('Invalidation lacks node information.');console.error(invalidation);return;}
for(var i=0;i<styleInvalidatorInvalidation.invalidationList.length;i++){var setId=styleInvalidatorInvalidation.invalidationList[i]['id'];var lastScheduleStyleRecalculation;var nodeInvalidations=this._invalidationsByNodeId[styleInvalidatorInvalidation.nodeId]||[];for(var j=0;j<nodeInvalidations.length;j++){var invalidation=nodeInvalidations[j];if(invalidation.frame!==frameId||invalidation.invalidationSet!==setId||invalidation.type!==TimelineModel.TimelineModel.RecordType.ScheduleStyleInvalidationTracking)
continue;lastScheduleStyleRecalculation=invalidation;}
if(!lastScheduleStyleRecalculation){console.error('Failed to lookup the event that scheduled a style invalidator invalidation.');continue;}
this._addSyntheticStyleRecalcInvalidation(lastScheduleStyleRecalculation._tracingEvent,styleInvalidatorInvalidation);}}
_addSyntheticStyleRecalcInvalidation(baseEvent,styleInvalidatorInvalidation){var invalidation=new TimelineModel.InvalidationTrackingEvent(baseEvent);invalidation.type=TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking;if(styleInvalidatorInvalidation.cause.reason)
invalidation.cause.reason=styleInvalidatorInvalidation.cause.reason;if(styleInvalidatorInvalidation.selectorPart)
invalidation.selectorPart=styleInvalidatorInvalidation.selectorPart;this.addInvalidation(invalidation);if(!invalidation.linkedRecalcStyleEvent)
this._associateWithLastRecalcStyleEvent(invalidation);}
didLayout(layoutEvent){var layoutFrameId=layoutEvent.args['beginData']['frame'];for(var invalidation of this._invalidationsOfTypes([TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking])){if(invalidation.linkedLayoutEvent)
continue;this._addInvalidationToEvent(layoutEvent,layoutFrameId,invalidation);invalidation.linkedLayoutEvent=true;}}
didPaint(paintEvent){this._didPaint=true;var layerId=paintEvent.args['data']['layerId'];if(layerId)
this._lastPaintWithLayer=paintEvent;if(!this._lastPaintWithLayer)
return;var effectivePaintId=this._lastPaintWithLayer.args['data']['nodeId'];var paintFrameId=paintEvent.args['data']['frame'];var types=[TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking,TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking,TimelineModel.TimelineModel.RecordType.PaintInvalidationTracking,TimelineModel.TimelineModel.RecordType.ScrollInvalidationTracking];for(var invalidation of this._invalidationsOfTypes(types)){if(invalidation.paintId===effectivePaintId)
this._addInvalidationToEvent(paintEvent,paintFrameId,invalidation);}}
_addInvalidationToEvent(event,eventFrameId,invalidation){if(eventFrameId!==invalidation.frame)
return;if(!event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol])
event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol]=[invalidation];else
event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol].push(invalidation);}
_invalidationsOfTypes(types){var invalidations=this._invalidations;if(!types)
types=Object.keys(invalidations);function*generator(){for(var i=0;i<types.length;++i){var invalidationList=invalidations[types[i]]||[];for(var j=0;j<invalidationList.length;++j)
yield invalidationList[j];}}
return generator();}
_startNewFrameIfNeeded(){if(!this._didPaint)
return;this._initializePerFrameState();}
_initializePerFrameState(){this._invalidations={};this._invalidationsByNodeId={};this._lastRecalcStyle=null;this._lastPaintWithLayer=null;this._didPaint=false;}};TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol=Symbol('invalidationTrackingEvents');TimelineModel.TimelineAsyncEventTracker=class{constructor(){TimelineModel.TimelineAsyncEventTracker._initialize();this._initiatorByType=new Map();for(var initiator of TimelineModel.TimelineAsyncEventTracker._asyncEvents.keys())
this._initiatorByType.set(initiator,new Map());}
static _initialize(){if(TimelineModel.TimelineAsyncEventTracker._asyncEvents)
return;var events=new Map();var type=TimelineModel.TimelineModel.RecordType;events.set(type.TimerInstall,{causes:[type.TimerFire],joinBy:'timerId'});events.set(type.ResourceSendRequest,{causes:[type.ResourceReceiveResponse,type.ResourceReceivedData,type.ResourceFinish],joinBy:'requestId'});events.set(type.RequestAnimationFrame,{causes:[type.FireAnimationFrame],joinBy:'id'});events.set(type.RequestIdleCallback,{causes:[type.FireIdleCallback],joinBy:'id'});events.set(type.WebSocketCreate,{causes:[type.WebSocketSendHandshakeRequest,type.WebSocketReceiveHandshakeResponse,type.WebSocketDestroy],joinBy:'identifier'});TimelineModel.TimelineAsyncEventTracker._asyncEvents=events;TimelineModel.TimelineAsyncEventTracker._typeToInitiator=new Map();for(var entry of events){var types=entry[1].causes;for(type of types)
TimelineModel.TimelineAsyncEventTracker._typeToInitiator.set(type,entry[0]);}}
processEvent(event){var initiatorType=TimelineModel.TimelineAsyncEventTracker._typeToInitiator.get((event.name));var isInitiator=!initiatorType;if(!initiatorType)
initiatorType=(event.name);var initiatorInfo=TimelineModel.TimelineAsyncEventTracker._asyncEvents.get(initiatorType);if(!initiatorInfo)
return;var id=TimelineModel.TimelineModel.globalEventId(event,initiatorInfo.joinBy);if(!id)
return;var initiatorMap=this._initiatorByType.get(initiatorType);if(isInitiator){initiatorMap.set(id,event);return;}
var initiator=initiatorMap.get(id)||null;var timelineData=TimelineModel.TimelineData.forEvent(event);timelineData.setInitiator(initiator);if(!timelineData.frameId&&initiator)
timelineData.frameId=TimelineModel.TimelineModel.eventFrameId(initiator);}};TimelineModel.TimelineData=class{constructor(){this.warning=null;this.previewElement=null;this.url=null;this.backendNodeId=0;this.stackTrace=null;this.picture=null;this._initiator=null;this.frameId='';this.timeWaitingForMainThread;}
setInitiator(initiator){this._initiator=initiator;if(!initiator||this.url)
return;var initiatorURL=TimelineModel.TimelineData.forEvent(initiator).url;if(initiatorURL)
this.url=initiatorURL;}
initiator(){return this._initiator;}
topFrame(){var stackTrace=this.stackTraceForSelfOrInitiator();return stackTrace&&stackTrace[0]||null;}
stackTraceForSelfOrInitiator(){return this.stackTrace||(this._initiator&&TimelineModel.TimelineData.forEvent(this._initiator).stackTrace);}
static forEvent(event){var data=event[TimelineModel.TimelineData._symbol];if(!data){data=new TimelineModel.TimelineData();event[TimelineModel.TimelineData._symbol]=data;}
return data;}};TimelineModel.TimelineData._symbol=Symbol('timelineData');;TimelineModel.TimelineIRModel=class{constructor(){this.reset();}
static phaseForEvent(event){return event[TimelineModel.TimelineIRModel._eventIRPhase];}
populate(inputLatencies,animations){this.reset();if(!inputLatencies)
return;this._processInputLatencies(inputLatencies);if(animations)
this._processAnimations(animations);var range=new Common.SegmentedRange();range.appendRange(this._drags);range.appendRange(this._cssAnimations);range.appendRange(this._scrolls);range.appendRange(this._responses);this._segments=range.segments();}
_processInputLatencies(events){var eventTypes=TimelineModel.TimelineIRModel.InputEvents;var phases=TimelineModel.TimelineIRModel.Phases;var thresholdsMs=TimelineModel.TimelineIRModel._mergeThresholdsMs;var scrollStart;var flingStart;var touchStart;var firstTouchMove;var mouseWheel;var mouseDown;var mouseMove;for(var i=0;i<events.length;++i){var event=events[i];if(i>0&&events[i].startTime<events[i-1].startTime)
console.assert(false,'Unordered input events');var type=this._inputEventType(event.name);switch(type){case eventTypes.ScrollBegin:this._scrolls.append(this._segmentForEvent(event,phases.Scroll));scrollStart=event;break;case eventTypes.ScrollEnd:if(scrollStart)
this._scrolls.append(this._segmentForEventRange(scrollStart,event,phases.Scroll));else
this._scrolls.append(this._segmentForEvent(event,phases.Scroll));scrollStart=null;break;case eventTypes.ScrollUpdate:touchStart=null;this._scrolls.append(this._segmentForEvent(event,phases.Scroll));break;case eventTypes.FlingStart:if(flingStart){Common.console.error(Common.UIString('Two flings at the same time? %s vs %s',flingStart.startTime,event.startTime));break;}
flingStart=event;break;case eventTypes.FlingCancel:if(!flingStart)
break;this._scrolls.append(this._segmentForEventRange(flingStart,event,phases.Fling));flingStart=null;break;case eventTypes.ImplSideFling:this._scrolls.append(this._segmentForEvent(event,phases.Fling));break;case eventTypes.ShowPress:case eventTypes.Tap:case eventTypes.KeyDown:case eventTypes.KeyDownRaw:case eventTypes.KeyUp:case eventTypes.Char:case eventTypes.Click:case eventTypes.ContextMenu:this._responses.append(this._segmentForEvent(event,phases.Response));break;case eventTypes.TouchStart:if(touchStart){Common.console.error(Common.UIString('Two touches at the same time? %s vs %s',touchStart.startTime,event.startTime));break;}
touchStart=event;event.steps[0][TimelineModel.TimelineIRModel._eventIRPhase]=phases.Response;firstTouchMove=null;break;case eventTypes.TouchCancel:touchStart=null;break;case eventTypes.TouchMove:if(firstTouchMove){this._drags.append(this._segmentForEvent(event,phases.Drag));}else if(touchStart){firstTouchMove=event;this._responses.append(this._segmentForEventRange(touchStart,event,phases.Response));}
break;case eventTypes.TouchEnd:touchStart=null;break;case eventTypes.MouseDown:mouseDown=event;mouseMove=null;break;case eventTypes.MouseMove:if(mouseDown&&!mouseMove&&mouseDown.startTime+thresholdsMs.mouse>event.startTime){this._responses.append(this._segmentForEvent(mouseDown,phases.Response));this._responses.append(this._segmentForEvent(event,phases.Response));}else if(mouseDown){this._drags.append(this._segmentForEvent(event,phases.Drag));}
mouseMove=event;break;case eventTypes.MouseUp:this._responses.append(this._segmentForEvent(event,phases.Response));mouseDown=null;break;case eventTypes.MouseWheel:if(mouseWheel&&canMerge(thresholdsMs.mouse,mouseWheel,event))
this._scrolls.append(this._segmentForEventRange(mouseWheel,event,phases.Scroll));else
this._scrolls.append(this._segmentForEvent(event,phases.Scroll));mouseWheel=event;break;}}
function canMerge(threshold,first,second){return first.endTime<second.startTime&&second.startTime<first.endTime+threshold;}}
_processAnimations(events){for(var i=0;i<events.length;++i)
this._cssAnimations.append(this._segmentForEvent(events[i],TimelineModel.TimelineIRModel.Phases.Animation));}
_segmentForEvent(event,phase){this._setPhaseForEvent(event,phase);return new Common.Segment(event.startTime,event.endTime,phase);}
_segmentForEventRange(startEvent,endEvent,phase){this._setPhaseForEvent(startEvent,phase);this._setPhaseForEvent(endEvent,phase);return new Common.Segment(startEvent.startTime,endEvent.endTime,phase);}
_setPhaseForEvent(asyncEvent,phase){asyncEvent.steps[0][TimelineModel.TimelineIRModel._eventIRPhase]=phase;}
interactionRecords(){return this._segments;}
reset(){var thresholdsMs=TimelineModel.TimelineIRModel._mergeThresholdsMs;this._segments=[];this._drags=new Common.SegmentedRange(merge.bind(null,thresholdsMs.mouse));this._cssAnimations=new Common.SegmentedRange(merge.bind(null,thresholdsMs.animation));this._responses=new Common.SegmentedRange(merge.bind(null,0));this._scrolls=new Common.SegmentedRange(merge.bind(null,thresholdsMs.animation));function merge(threshold,first,second){return first.end+threshold>=second.begin&&first.data===second.data?first:null;}}
_inputEventType(eventName){var prefix='InputLatency::';if(!eventName.startsWith(prefix)){if(eventName===TimelineModel.TimelineIRModel.InputEvents.ImplSideFling)
return(eventName);console.error('Unrecognized input latency event: '+eventName);return null;}
return(eventName.substr(prefix.length));}};TimelineModel.TimelineIRModel.Phases={Idle:'Idle',Response:'Response',Scroll:'Scroll',Fling:'Fling',Drag:'Drag',Animation:'Animation',Uncategorized:'Uncategorized'};TimelineModel.TimelineIRModel.InputEvents={Char:'Char',Click:'GestureClick',ContextMenu:'ContextMenu',FlingCancel:'GestureFlingCancel',FlingStart:'GestureFlingStart',ImplSideFling:TimelineModel.TimelineModel.RecordType.ImplSideFling,KeyDown:'KeyDown',KeyDownRaw:'RawKeyDown',KeyUp:'KeyUp',LatencyScrollUpdate:'ScrollUpdate',MouseDown:'MouseDown',MouseMove:'MouseMove',MouseUp:'MouseUp',MouseWheel:'MouseWheel',PinchBegin:'GesturePinchBegin',PinchEnd:'GesturePinchEnd',PinchUpdate:'GesturePinchUpdate',ScrollBegin:'GestureScrollBegin',ScrollEnd:'GestureScrollEnd',ScrollUpdate:'GestureScrollUpdate',ScrollUpdateRenderer:'ScrollUpdate',ShowPress:'GestureShowPress',Tap:'GestureTap',TapCancel:'GestureTapCancel',TapDown:'GestureTapDown',TouchCancel:'TouchCancel',TouchEnd:'TouchEnd',TouchMove:'TouchMove',TouchStart:'TouchStart'};TimelineModel.TimelineIRModel._mergeThresholdsMs={animation:1,mouse:40,};TimelineModel.TimelineIRModel._eventIRPhase=Symbol('eventIRPhase');;TimelineModel.TimelineJSProfileProcessor=class{static generateTracingEventsFromCpuProfile(jsProfileModel,thread){var idleNode=jsProfileModel.idleNode;var programNode=jsProfileModel.programNode;var gcNode=jsProfileModel.gcNode;var samples=jsProfileModel.samples;var timestamps=jsProfileModel.timestamps;var jsEvents=[];var nodeToStackMap=new Map();nodeToStackMap.set(programNode,[]);for(var i=0;i<samples.length;++i){var node=jsProfileModel.nodeByIndex(i);if(!node){console.error(`Node with unknown id ${samples[i]} at index ${i}`);continue;}
if(node===gcNode||node===idleNode)
continue;var callFrames=nodeToStackMap.get(node);if(!callFrames){callFrames=(new Array(node.depth+1));nodeToStackMap.set(node,callFrames);for(var j=0;node.parent;node=node.parent)
callFrames[j++]=(node);}
var jsSampleEvent=new SDK.TracingModel.Event(SDK.TracingModel.DevToolsTimelineEventCategory,TimelineModel.TimelineModel.RecordType.JSSample,SDK.TracingModel.Phase.Instant,timestamps[i],thread);jsSampleEvent.args['data']={stackTrace:callFrames};jsEvents.push(jsSampleEvent);}
return jsEvents;}
static generateJSFrameEvents(events){function equalFrames(frame1,frame2){return frame1.scriptId===frame2.scriptId&&frame1.functionName===frame2.functionName&&frame1.lineNumber===frame2.lineNumber;}
function isJSInvocationEvent(e){switch(e.name){case TimelineModel.TimelineModel.RecordType.RunMicrotasks:case TimelineModel.TimelineModel.RecordType.FunctionCall:case TimelineModel.TimelineModel.RecordType.EvaluateScript:case TimelineModel.TimelineModel.RecordType.EventDispatch:return true;}
return false;}
var jsFrameEvents=[];var jsFramesStack=[];var lockedJsStackDepth=[];var ordinal=0;const showAllEvents=Runtime.experiments.isEnabled('timelineShowAllEvents');const showRuntimeCallStats=Runtime.experiments.isEnabled('timelineV8RuntimeCallStats');const showNativeFunctions=Common.moduleSetting('showNativeFunctionsInJSProfile').get();function onStartEvent(e){e.ordinal=++ordinal;extractStackTrace(e);lockedJsStackDepth.push(jsFramesStack.length);}
function onInstantEvent(e,parent){e.ordinal=++ordinal;if(parent&&isJSInvocationEvent(parent))
extractStackTrace(e);}
function onEndEvent(e){truncateJSStack(lockedJsStackDepth.pop(),e.endTime);}
function truncateJSStack(depth,time){if(lockedJsStackDepth.length){var lockedDepth=lockedJsStackDepth.peekLast();if(depth<lockedDepth){console.error(`Child stack is shallower (${depth}) than the parent stack (${lockedDepth}) at ${time}`);depth=lockedDepth;}}
if(jsFramesStack.length<depth){console.error(`Trying to truncate higher than the current stack size at ${time}`);depth=jsFramesStack.length;}
for(var k=0;k<jsFramesStack.length;++k)
jsFramesStack[k].setEndTime(time);jsFramesStack.length=depth;}
function showNativeName(name){return showRuntimeCallStats&&!!TimelineModel.TimelineJSProfileProcessor.nativeGroup(name);}
function filterStackFrames(stack){if(showAllEvents)
return;var isPreviousFrameNative=false;for(var i=0,j=0;i<stack.length;++i){const frame=stack[i];const url=frame.url;const isNativeFrame=url&&url.startsWith('native ');if(!showNativeFunctions&&isNativeFrame)
continue;if(TimelineModel.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame)&&!showNativeName(frame.functionName))
continue;if(isPreviousFrameNative&&isNativeFrame)
continue;isPreviousFrameNative=isNativeFrame;stack[j++]=frame;}
stack.length=j;}
function extractStackTrace(e){const recordTypes=TimelineModel.TimelineModel.RecordType;const callFrames=e.name===recordTypes.JSSample?e.args['data']['stackTrace'].slice().reverse():jsFramesStack.map(frameEvent=>frameEvent.args['data']);filterStackFrames(callFrames);const endTime=e.endTime||e.startTime;const minFrames=Math.min(callFrames.length,jsFramesStack.length);var i;for(i=lockedJsStackDepth.peekLast()||0;i<minFrames;++i){const newFrame=callFrames[i];const oldFrame=jsFramesStack[i].args['data'];if(!equalFrames(newFrame,oldFrame))
break;jsFramesStack[i].setEndTime(Math.max(jsFramesStack[i].endTime,endTime));}
truncateJSStack(i,e.startTime);for(;i<callFrames.length;++i){const frame=callFrames[i];const jsFrameEvent=new SDK.TracingModel.Event(SDK.TracingModel.DevToolsTimelineEventCategory,recordTypes.JSFrame,SDK.TracingModel.Phase.Complete,e.startTime,e.thread);jsFrameEvent.ordinal=e.ordinal;jsFrameEvent.addArgs({data:frame});jsFrameEvent.setEndTime(endTime);jsFramesStack.push(jsFrameEvent);jsFrameEvents.push(jsFrameEvent);}}
const firstTopLevelEvent=events.find(SDK.TracingModel.isTopLevelEvent);if(firstTopLevelEvent){TimelineModel.TimelineModel.forEachEvent(events,onStartEvent,onEndEvent,onInstantEvent,firstTopLevelEvent.startTime);}
return jsFrameEvents;}
static isNativeRuntimeFrame(frame){return frame.url==='native V8Runtime';}
static nativeGroup(nativeName){var map=TimelineModel.TimelineJSProfileProcessor.nativeGroup._map;if(!map){const nativeGroups=TimelineModel.TimelineJSProfileProcessor.NativeGroups;map=new Map([['Compile',nativeGroups.Compile],['CompileCode',nativeGroups.Compile],['CompileCodeLazy',nativeGroups.Compile],['CompileDeserialize',nativeGroups.Compile],['CompileEval',nativeGroups.Compile],['CompileFullCode',nativeGroups.Compile],['CompileIgnition',nativeGroups.Compile],['CompilerDispatcher',nativeGroups.Compile],['CompileSerialize',nativeGroups.Compile],['ParseProgram',nativeGroups.Parse],['ParseFunction',nativeGroups.Parse],['RecompileConcurrent',nativeGroups.Compile],['RecompileSynchronous',nativeGroups.Compile],['ParseLazy',nativeGroups.Parse]]);TimelineModel.TimelineJSProfileProcessor.nativeGroup._map=map;}
return map.get(nativeName)||null;}
static buildTraceProfileFromCpuProfile(profile){if(!profile)
return[];var events=[];appendEvent('TracingStartedInPage',{'sessionId':'1'},0,0,'M');var idToNode=new Map();var nodes=profile['nodes'];for(var i=0;i<nodes.length;++i)
idToNode.set(nodes[i].id,nodes[i]);var programEvent=null;var functionEvent=null;var nextTime=profile.startTime;var currentTime;var samples=profile['samples'];var timeDeltas=profile['timeDeltas'];for(var i=0;i<samples.length;++i){currentTime=nextTime;nextTime+=timeDeltas[i];var node=idToNode.get(samples[i]);var name=node.callFrame.functionName;if(name==='(idle)'){closeEvents();continue;}
if(!programEvent)
programEvent=appendEvent('MessageLoop::RunTask',{},currentTime,0,'X','toplevel');if(name==='(program)'){if(functionEvent){functionEvent.dur=currentTime-functionEvent.ts;functionEvent=null;}}else{if(!functionEvent)
functionEvent=appendEvent('FunctionCall',{'sessionId':'1'},currentTime);}}
closeEvents();appendEvent('CpuProfile',{'cpuProfile':profile},profile.endTime,0,'I');return events;function closeEvents(){if(programEvent)
programEvent.dur=currentTime-programEvent.ts;if(functionEvent)
functionEvent.dur=currentTime-functionEvent.ts;programEvent=null;functionEvent=null;}
function appendEvent(name,data,ts,dur,ph,cat){var event=({cat:cat||'disabled-by-default-devtools.timeline',name:name,ph:ph||'X',pid:1,tid:1,ts:ts,args:{data:data}});if(dur)
event.dur=dur;events.push(event);return event;}}};TimelineModel.TimelineJSProfileProcessor.NativeGroups={'Compile':'Compile','Parse':'Parse'};;TimelineModel.TimelineFrameModel=class{constructor(categoryMapper){this._categoryMapper=categoryMapper;this.reset();}
frames(){return this._frames;}
filteredFrames(startTime,endTime){function compareStartTime(value,object){return value-object.startTime;}
function compareEndTime(value,object){return value-object.endTime;}
var frames=this._frames;var firstFrame=frames.lowerBound(startTime,compareEndTime);var lastFrame=frames.lowerBound(endTime,compareStartTime);return frames.slice(firstFrame,lastFrame);}
hasRasterTile(rasterTask){var data=rasterTask.args['tileData'];if(!data)
return false;var frameId=data['sourceFrameNumber'];var frame=frameId&&this._frameById[frameId];if(!frame||!frame.layerTree)
return false;return true;}
rasterTilePromise(rasterTask){if(!this._target)
return Promise.resolve(null);var data=rasterTask.args['tileData'];var frameId=data['sourceFrameNumber'];var tileId=data['tileId']&&data['tileId']['id_ref'];var frame=frameId&&this._frameById[frameId];if(!frame||!frame.layerTree||!tileId)
return Promise.resolve(null);return frame.layerTree.layerTreePromise().then(layerTree=>layerTree&&layerTree.pictureForRasterTile(tileId));}
reset(){this._minimumRecordTime=Infinity;this._frames=[];this._frameById={};this._lastFrame=null;this._lastLayerTree=null;this._mainFrameCommitted=false;this._mainFrameRequested=false;this._framePendingCommit=null;this._lastBeginFrame=null;this._lastNeedsBeginFrame=null;this._framePendingActivation=null;this._lastTaskBeginTime=null;this._target=null;this._sessionId=null;this._currentTaskTimeByCategory={};}
handleBeginFrame(startTime){if(!this._lastFrame)
this._startFrame(startTime);this._lastBeginFrame=startTime;}
handleDrawFrame(startTime){if(!this._lastFrame){this._startFrame(startTime);return;}
if(this._mainFrameCommitted||!this._mainFrameRequested){if(this._lastNeedsBeginFrame){var idleTimeEnd=this._framePendingActivation?this._framePendingActivation.triggerTime:(this._lastBeginFrame||this._lastNeedsBeginFrame);if(idleTimeEnd>this._lastFrame.startTime){this._lastFrame.idle=true;this._startFrame(idleTimeEnd);if(this._framePendingActivation)
this._commitPendingFrame();this._lastBeginFrame=null;}
this._lastNeedsBeginFrame=null;}
this._startFrame(startTime);}
this._mainFrameCommitted=false;}
handleActivateLayerTree(){if(!this._lastFrame)
return;if(this._framePendingActivation&&!this._lastNeedsBeginFrame)
this._commitPendingFrame();}
handleRequestMainThreadFrame(){if(!this._lastFrame)
return;this._mainFrameRequested=true;}
handleCompositeLayers(){if(!this._framePendingCommit)
return;this._framePendingActivation=this._framePendingCommit;this._framePendingCommit=null;this._mainFrameRequested=false;this._mainFrameCommitted=true;}
handleLayerTreeSnapshot(layerTree){this._lastLayerTree=layerTree;}
handleNeedFrameChanged(startTime,needsBeginFrame){if(needsBeginFrame)
this._lastNeedsBeginFrame=startTime;}
_startFrame(startTime){if(this._lastFrame)
this._flushFrame(this._lastFrame,startTime);this._lastFrame=new TimelineModel.TimelineFrame(startTime,startTime-this._minimumRecordTime);}
_flushFrame(frame,endTime){frame._setLayerTree(this._lastLayerTree);frame._setEndTime(endTime);if(this._lastLayerTree)
this._lastLayerTree._setPaints(frame._paints);if(this._frames.length&&(frame.startTime!==this._frames.peekLast().endTime||frame.startTime>frame.endTime)){console.assert(false,`Inconsistent frame time for frame ${this._frames.length} (${frame.startTime} - ${frame.endTime})`);}
this._frames.push(frame);if(typeof frame._mainFrameId==='number')
this._frameById[frame._mainFrameId]=frame;}
_commitPendingFrame(){this._lastFrame._addTimeForCategories(this._framePendingActivation.timeByCategory);this._lastFrame._paints=this._framePendingActivation.paints;this._lastFrame._mainFrameId=this._framePendingActivation.mainFrameId;this._framePendingActivation=null;}
addTraceEvents(target,events,sessionId){this._target=target;this._sessionId=sessionId;if(!events.length)
return;if(events[0].startTime<this._minimumRecordTime)
this._minimumRecordTime=events[0].startTime;for(var i=0;i<events.length;++i)
this._addTraceEvent(events[i]);}
_addTraceEvent(event){var eventNames=TimelineModel.TimelineModel.RecordType;if(event.name===eventNames.SetLayerTreeId){var sessionId=event.args['sessionId']||event.args['data']['sessionId'];if(this._sessionId===sessionId)
this._layerTreeId=event.args['layerTreeId']||event.args['data']['layerTreeId'];}else if(event.name===eventNames.TracingStartedInPage){this._mainThread=event.thread;}else if(event.phase===SDK.TracingModel.Phase.SnapshotObject&&event.name===eventNames.LayerTreeHostImplSnapshot&&parseInt(event.id,0)===this._layerTreeId){var snapshot=(event);this.handleLayerTreeSnapshot(new TimelineModel.TracingFrameLayerTree(this._target,snapshot));}else{this._processCompositorEvents(event);if(event.thread===this._mainThread)
this._addMainThreadTraceEvent(event);else if(this._lastFrame&&event.selfTime&&!SDK.TracingModel.isTopLevelEvent(event))
this._lastFrame._addTimeForCategory(this._categoryMapper(event),event.selfTime);}}
_processCompositorEvents(event){var eventNames=TimelineModel.TimelineModel.RecordType;if(event.args['layerTreeId']!==this._layerTreeId)
return;var timestamp=event.startTime;if(event.name===eventNames.BeginFrame)
this.handleBeginFrame(timestamp);else if(event.name===eventNames.DrawFrame)
this.handleDrawFrame(timestamp);else if(event.name===eventNames.ActivateLayerTree)
this.handleActivateLayerTree();else if(event.name===eventNames.RequestMainThreadFrame)
this.handleRequestMainThreadFrame();else if(event.name===eventNames.NeedsBeginFrameChanged)
this.handleNeedFrameChanged(timestamp,event.args['data']&&event.args['data']['needsBeginFrame']);}
_addMainThreadTraceEvent(event){var eventNames=TimelineModel.TimelineModel.RecordType;if(SDK.TracingModel.isTopLevelEvent(event)){this._currentTaskTimeByCategory={};this._lastTaskBeginTime=event.startTime;}
if(!this._framePendingCommit&&TimelineModel.TimelineFrameModel._mainFrameMarkers.indexOf(event.name)>=0){this._framePendingCommit=new TimelineModel.PendingFrame(this._lastTaskBeginTime||event.startTime,this._currentTaskTimeByCategory);}
if(!this._framePendingCommit){this._addTimeForCategory(this._currentTaskTimeByCategory,event);return;}
this._addTimeForCategory(this._framePendingCommit.timeByCategory,event);if(event.name===eventNames.BeginMainThreadFrame&&event.args['data']&&event.args['data']['frameId'])
this._framePendingCommit.mainFrameId=event.args['data']['frameId'];if(event.name===eventNames.Paint&&event.args['data']['layerId']&&TimelineModel.TimelineData.forEvent(event).picture&&this._target)
this._framePendingCommit.paints.push(new TimelineModel.LayerPaintEvent(event,this._target));if(event.name===eventNames.CompositeLayers&&event.args['layerTreeId']===this._layerTreeId)
this.handleCompositeLayers();}
_addTimeForCategory(timeByCategory,event){if(!event.selfTime)
return;var categoryName=this._categoryMapper(event);timeByCategory[categoryName]=(timeByCategory[categoryName]||0)+event.selfTime;}};TimelineModel.TimelineFrameModel._mainFrameMarkers=[TimelineModel.TimelineModel.RecordType.ScheduleStyleRecalculation,TimelineModel.TimelineModel.RecordType.InvalidateLayout,TimelineModel.TimelineModel.RecordType.BeginMainThreadFrame,TimelineModel.TimelineModel.RecordType.ScrollLayer];TimelineModel.TracingFrameLayerTree=class{constructor(target,snapshot){this._target=target;this._snapshot=snapshot;this._paints;}
layerTreePromise(){return this._snapshot.objectPromise().then(result=>{if(!result)
return null;var viewport=result['device_viewport_size'];var tiles=result['active_tiles'];var rootLayer=result['active_tree']['root_layer'];var layers=result['active_tree']['layers'];var layerTree=new TimelineModel.TracingLayerTree(this._target);layerTree.setViewportSize(viewport);layerTree.setTiles(tiles);return new Promise(resolve=>layerTree.setLayers(rootLayer,layers,this._paints||[],()=>resolve(layerTree)));});}
paints(){return this._paints||[];}
_setPaints(paints){this._paints=paints;}};TimelineModel.TimelineFrame=class{constructor(startTime,startTimeOffset){this.startTime=startTime;this.startTimeOffset=startTimeOffset;this.endTime=this.startTime;this.duration=0;this.timeByCategory={};this.cpuTime=0;this.idle=false;this.layerTree=null;this._paints=[];this._mainFrameId=undefined;}
hasWarnings(){return false;}
_setEndTime(endTime){this.endTime=endTime;this.duration=this.endTime-this.startTime;}
_setLayerTree(layerTree){this.layerTree=layerTree;}
_addTimeForCategories(timeByCategory){for(var category in timeByCategory)
this._addTimeForCategory(category,timeByCategory[category]);}
_addTimeForCategory(category,time){this.timeByCategory[category]=(this.timeByCategory[category]||0)+time;this.cpuTime+=time;}};TimelineModel.LayerPaintEvent=class{constructor(event,target){this._event=event;this._target=target;}
layerId(){return this._event.args['data']['layerId'];}
event(){return this._event;}
picturePromise(){var picture=TimelineModel.TimelineData.forEvent(this._event).picture;return picture.objectPromise().then(result=>{if(!result)
return null;var rect=result['params']&&result['params']['layer_rect'];var picture=result['skp64'];return rect&&picture?{rect:rect,serializedPicture:picture}:null;});}
snapshotPromise(){return this.picturePromise().then(picture=>{if(!picture||!this._target)
return null;return SDK.PaintProfilerSnapshot.load(this._target,picture.serializedPicture).then(snapshot=>snapshot?{rect:picture.rect,snapshot:snapshot}:null);});}};TimelineModel.PendingFrame=class{constructor(triggerTime,timeByCategory){this.timeByCategory=timeByCategory;this.paints=[];this.mainFrameId=undefined;this.triggerTime=triggerTime;}};;TimelineModel.TimelineProfileTree={};TimelineModel.TimelineProfileTree.Node=class{constructor(id,event){this.totalTime=0;this.selfTime=0;this.id=id;this.event=event;this.parent;this._groupId='';this._isGroupNode=false;}
isGroupNode(){return this._isGroupNode;}
hasChildren(){throw'Not implemented';}
children(){throw'Not implemented';}
searchTree(matchFunction,results){results=results||[];if(this.event&&matchFunction(this.event))
results.push(this);for(var child of this.children().values())
child.searchTree(matchFunction,results);return results;}};TimelineModel.TimelineProfileTree.TopDownNode=class extends TimelineModel.TimelineProfileTree.Node{constructor(id,event,parent){super(id,event);this._root=parent&&parent._root;this._hasChildren=false;this._children=null;this.parent=parent;}
hasChildren(){return this._hasChildren;}
children(){return this._children||this._buildChildren();}
_buildChildren(){var path=[];for(var node=this;node.parent&&!node._isGroupNode;node=node.parent)
path.push((node));path.reverse();var children=new Map();var self=this;var root=this._root;var startTime=root._startTime;var endTime=root._endTime;var instantEventCallback=root._doNotAggregate?onInstantEvent:undefined;var eventIdCallback=root._doNotAggregate?undefined:TimelineModel.TimelineProfileTree._eventId;var eventGroupIdCallback=root._eventGroupIdCallback;var depth=0;var matchedDepth=0;var currentDirectChild=null;TimelineModel.TimelineModel.forEachEvent(root._events,onStartEvent,onEndEvent,instantEventCallback,startTime,endTime,root._filter);function onStartEvent(e){++depth;if(depth>path.length+2)
return;if(!matchPath(e))
return;var duration=Math.min(endTime,e.endTime)-Math.max(startTime,e.startTime);if(duration<0)
console.error('Negative event duration');processEvent(e,duration);}
function onInstantEvent(e){++depth;if(matchedDepth===path.length&&depth<=path.length+2)
processEvent(e,0);--depth;}
function processEvent(e,duration){if(depth===path.length+2){currentDirectChild._hasChildren=true;currentDirectChild.selfTime-=duration;return;}
var id;var groupId='';if(!eventIdCallback){id=Symbol('uniqueId');}else{id=eventIdCallback(e);groupId=eventGroupIdCallback?eventGroupIdCallback(e):'';if(groupId)
id+='/'+groupId;}
var node=children.get(id);if(!node){node=new TimelineModel.TimelineProfileTree.TopDownNode(id,e,self);node._groupId=groupId;children.set(id,node);}
node.selfTime+=duration;node.totalTime+=duration;currentDirectChild=node;}
function matchPath(e){if(matchedDepth===path.length)
return true;if(matchedDepth!==depth-1)
return false;if(!e.endTime)
return false;if(!eventIdCallback){if(e===path[matchedDepth].event)
++matchedDepth;return false;}
var id=eventIdCallback(e);var groupId=eventGroupIdCallback?eventGroupIdCallback(e):'';if(groupId)
id+='/'+groupId;if(id===path[matchedDepth].id)
++matchedDepth;return false;}
function onEndEvent(e){--depth;if(matchedDepth>depth)
matchedDepth=depth;}
this._children=children;return children;}};TimelineModel.TimelineProfileTree.TopDownRootNode=class extends TimelineModel.TimelineProfileTree.TopDownNode{constructor(events,filters,startTime,endTime,doNotAggregate,eventGroupIdCallback){super('',null,null);this._root=this;this._events=events;this._filter=e=>TimelineModel.TimelineModel.isVisible(filters,e);this._startTime=startTime;this._endTime=endTime;this._eventGroupIdCallback=eventGroupIdCallback;this._doNotAggregate=doNotAggregate;this.totalTime=endTime-startTime;this.selfTime=this.totalTime;}
children(){return this._children||this._grouppedTopNodes();}
_grouppedTopNodes(){var flatNodes=super.children();if(!this._eventGroupIdCallback)
return flatNodes;var groupNodes=new Map();for(var node of flatNodes.values()){var groupId=this._eventGroupIdCallback((node.event));var groupNode=groupNodes.get(groupId);if(!groupNode){groupNode=new TimelineModel.TimelineProfileTree.GroupNode(groupId,this,(node.event));groupNodes.set(groupId,groupNode);}
groupNode.addChild(node,node.selfTime,node.totalTime);}
this._children=groupNodes;return groupNodes;}};TimelineModel.TimelineProfileTree.BottomUpRootNode=class extends TimelineModel.TimelineProfileTree.Node{constructor(events,filters,startTime,endTime,eventGroupIdCallback){super('',null);this._children=null;this._events=events;this._filter=e=>TimelineModel.TimelineModel.isVisible(filters,e);this._startTime=startTime;this._endTime=endTime;this._eventGroupIdCallback=eventGroupIdCallback;this.totalTime=endTime-startTime;}
hasChildren(){return true;}
children(){return this._children||this._grouppedTopNodes();}
_ungrouppedTopNodes(){var root=this;var startTime=this._startTime;var endTime=this._endTime;var nodeById=new Map();var selfTimeStack=[endTime-startTime];var firstNodeStack=[];var totalTimeById=new Map();TimelineModel.TimelineModel.forEachEvent(this._events,onStartEvent,onEndEvent,undefined,startTime,endTime,this._filter);function onStartEvent(e){var duration=Math.min(e.endTime,endTime)-Math.max(e.startTime,startTime);selfTimeStack[selfTimeStack.length-1]-=duration;selfTimeStack.push(duration);var id=TimelineModel.TimelineProfileTree._eventId(e);var noNodeOnStack=!totalTimeById.has(id);if(noNodeOnStack)
totalTimeById.set(id,duration);firstNodeStack.push(noNodeOnStack);}
function onEndEvent(e){var id=TimelineModel.TimelineProfileTree._eventId(e);var node=nodeById.get(id);if(!node){node=new TimelineModel.TimelineProfileTree.BottomUpNode(root,id,e,true,root);nodeById.set(id,node);}
node.selfTime+=selfTimeStack.pop();if(firstNodeStack.pop()){node.totalTime+=totalTimeById.get(id);totalTimeById.delete(id);}}
this.selfTime=selfTimeStack.pop();for(var pair of nodeById){if(pair[1].selfTime<=0)
nodeById.delete((pair[0]));}
return nodeById;}
_grouppedTopNodes(){var flatNodes=this._ungrouppedTopNodes();if(!this._eventGroupIdCallback){this._children=flatNodes;return flatNodes;}
var groupNodes=new Map();for(var node of flatNodes.values()){var groupId=this._eventGroupIdCallback((node.event));var groupNode=groupNodes.get(groupId);if(!groupNode){groupNode=new TimelineModel.TimelineProfileTree.GroupNode(groupId,this,(node.event));groupNodes.set(groupId,groupNode);}
groupNode.addChild(node,node.selfTime,node.selfTime);}
this._children=groupNodes;return groupNodes;}};TimelineModel.TimelineProfileTree.GroupNode=class extends TimelineModel.TimelineProfileTree.Node{constructor(id,parent,event){super(id,event);this._children=new Map();this.parent=parent;this._isGroupNode=true;}
addChild(child,selfTime,totalTime){this._children.set(child.id,child);this.selfTime+=selfTime;this.totalTime+=totalTime;child.parent=this;}
hasChildren(){return true;}
children(){return this._children;}};TimelineModel.TimelineProfileTree.BottomUpNode=class extends TimelineModel.TimelineProfileTree.Node{constructor(root,id,event,hasChildren,parent){super(id,event);this.parent=parent;this._root=root;this._depth=(parent._depth||0)+1;this._cachedChildren=null;this._hasChildren=hasChildren;}
hasChildren(){return this._hasChildren;}
children(){if(this._cachedChildren)
return this._cachedChildren;var selfTimeStack=[0];var eventIdStack=[];var eventStack=[];var nodeById=new Map();var startTime=this._root._startTime;var endTime=this._root._endTime;var lastTimeMarker=startTime;var self=this;TimelineModel.TimelineModel.forEachEvent(this._root._events,onStartEvent,onEndEvent,undefined,startTime,endTime,this._root._filter);function onStartEvent(e){var duration=Math.min(e.endTime,endTime)-Math.max(e.startTime,startTime);if(duration<0)
console.assert(false,'Negative duration of an event');selfTimeStack[selfTimeStack.length-1]-=duration;selfTimeStack.push(duration);var id=TimelineModel.TimelineProfileTree._eventId(e);eventIdStack.push(id);eventStack.push(e);}
function onEndEvent(e){var selfTime=selfTimeStack.pop();var id=eventIdStack.pop();eventStack.pop();for(var node=self;node._depth>1;node=node.parent){if(node.id!==eventIdStack[eventIdStack.length+1-node._depth])
return;}
if(node.id!==id||eventIdStack.length<self._depth)
return;var childId=eventIdStack[eventIdStack.length-self._depth];var node=nodeById.get(childId);if(!node){var event=eventStack[eventStack.length-self._depth];var hasChildren=eventStack.length>self._depth;node=new TimelineModel.TimelineProfileTree.BottomUpNode(self._root,childId,event,hasChildren,self);nodeById.set(childId,node);}
var totalTime=Math.min(e.endTime,endTime)-Math.max(e.startTime,lastTimeMarker);node.selfTime+=selfTime;node.totalTime+=totalTime;lastTimeMarker=Math.min(e.endTime,endTime);}
this._cachedChildren=nodeById;return nodeById;}
searchTree(matchFunction,results){results=results||[];if(this.event&&matchFunction(this.event))
results.push(this);return results;}};TimelineModel.TimelineProfileTree.eventURL=function(event){var data=event.args['data']||event.args['beginData'];if(data&&data['url'])
return data['url'];var frame=TimelineModel.TimelineProfileTree.eventStackFrame(event);while(frame){var url=frame['url'];if(url)
return url;frame=frame.parent;}
return null;};TimelineModel.TimelineProfileTree.eventStackFrame=function(event){if(event.name===TimelineModel.TimelineModel.RecordType.JSFrame)
return(event.args['data']||null);return TimelineModel.TimelineData.forEvent(event).topFrame();};TimelineModel.TimelineProfileTree._eventId=function(event){if(event.name===TimelineModel.TimelineModel.RecordType.TimeStamp)
return`${event.name}:${event.args.data.message}`;if(event.name!==TimelineModel.TimelineModel.RecordType.JSFrame)
return event.name;const frame=event.args['data'];const location=frame['scriptId']||frame['url']||'';const functionName=frame['functionName'];const name=TimelineModel.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame)?TimelineModel.TimelineJSProfileProcessor.nativeGroup(functionName)||functionName:functionName;return`f:${name}@${location}`;};;