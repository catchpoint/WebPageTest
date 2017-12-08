WebInspector.BezierUI=function(width,height,marginTop,controlPointRadius,linearLine)
{this.width=width;this.height=height;this.marginTop=marginTop;this.radius=controlPointRadius;this.linearLine=linearLine;}
WebInspector.BezierUI.prototype={curveWidth:function()
{return this.width-this.radius*2;},curveHeight:function()
{return this.height-this.radius*2-this.marginTop*2;},_drawLine:function(parentElement,className,x1,y1,x2,y2)
{var line=parentElement.createSVGChild("line",className);line.setAttribute("x1",x1+this.radius);line.setAttribute("y1",y1+this.radius+this.marginTop);line.setAttribute("x2",x2+this.radius);line.setAttribute("y2",y2+this.radius+this.marginTop);},_drawControlPoints:function(parentElement,startX,startY,controlX,controlY)
{this._drawLine(parentElement,"bezier-control-line",startX,startY,controlX,controlY);var circle=parentElement.createSVGChild("circle","bezier-control-circle");circle.setAttribute("cx",controlX+this.radius);circle.setAttribute("cy",controlY+this.radius+this.marginTop);circle.setAttribute("r",this.radius);},drawCurve:function(bezier,svg)
{if(!bezier)
return;var width=this.curveWidth();var height=this.curveHeight();;svg.setAttribute("width",this.width);svg.setAttribute("height",this.height);svg.removeChildren();var group=svg.createSVGChild("g");if(this.linearLine)
this._drawLine(group,"linear-line",0,height,width,0);var curve=group.createSVGChild("path","bezier-path");var curvePoints=[new WebInspector.Geometry.Point(bezier.controlPoints[0].x*width+this.radius,(1-bezier.controlPoints[0].y)*height+this.radius+this.marginTop),new WebInspector.Geometry.Point(bezier.controlPoints[1].x*width+this.radius,(1-bezier.controlPoints[1].y)*height+this.radius+this.marginTop),new WebInspector.Geometry.Point(width+this.radius,this.marginTop+this.radius)];curve.setAttribute("d","M"+this.radius+","+(height+this.radius+this.marginTop)+" C"+curvePoints.join(" "));this._drawControlPoints(group,0,height,bezier.controlPoints[0].x*width,(1-bezier.controlPoints[0].y)*height);this._drawControlPoints(group,width,0,bezier.controlPoints[1].x*width,(1-bezier.controlPoints[1].y)*height);}}
WebInspector.BezierUI.drawVelocityChart=function(bezier,path,width)
{var height=WebInspector.AnimationUI.Options.AnimationHeight;var pathBuilder=["M",0,height];const sampleSize=1/40;var prev=bezier.evaluateAt(0);for(var t=sampleSize;t<1+sampleSize;t+=sampleSize){var current=bezier.evaluateAt(t);var slope=(current.y-prev.y)/(current.x-prev.x);var weightedX=prev.x*(1-t)+current.x*t;slope=Math.tanh(slope/1.5);pathBuilder=pathBuilder.concat(["L",(weightedX*width).toFixed(2),(height-slope*height).toFixed(2)]);prev=current;}
pathBuilder=pathBuilder.concat(["L",width.toFixed(2),height,"Z"]);path.setAttribute("d",pathBuilder.join(" "));};WebInspector.AnimationTimeline=function()
{WebInspector.VBox.call(this,true);this.registerRequiredCSS("elements/animationTimeline.css");this.element.classList.add("animations-timeline");this._grid=this.contentElement.createSVGChild("svg","animation-timeline-grid");this.contentElement.appendChild(this._createScrubber());WebInspector.installDragHandle(this._timelineScrubberHead,this._scrubberDragStart.bind(this),this._scrubberDragMove.bind(this),this._scrubberDragEnd.bind(this),"move");this._timelineScrubberHead.textContent=WebInspector.UIString(Number.millisToString(0));this._animationsPlaybackRate=1;this.contentElement.appendChild(this._createHeader());this._animationsContainer=this.contentElement.createChild("div","animation-timeline-rows");this._duration=this._defaultDuration();this._scrubberRadius=25;this._timelineControlsWidth=200;this._nodesMap=new Map();this._symbol=Symbol("animationTimeline");this._animationsMap=new Map();WebInspector.targetManager.addModelListener(WebInspector.ResourceTreeModel,WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated,this._mainFrameNavigated,this);WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);WebInspector.targetManager.observeTargets(this);}
WebInspector.AnimationTimeline.GlobalPlaybackRates=[0.1,0.25,0.5,1.0];WebInspector.AnimationTimeline.prototype={wasShown:function()
{this._addEventListeners(WebInspector.targetManager.mainTarget());},willHide:function()
{var target=WebInspector.targetManager.mainTarget();if(!target)
return;target.animationModel.removeEventListener(WebInspector.AnimationModel.Events.AnimationPlayerCreated,this._animationCreated,this);target.animationModel.removeEventListener(WebInspector.AnimationModel.Events.AnimationPlayerCanceled,this._animationCanceled,this);},targetAdded:function(target)
{if(target===WebInspector.targetManager.mainTarget())
return;this._addEventListeners(target);},targetRemoved:function(target)
{target.animationModel.removeEventListener(WebInspector.AnimationModel.Events.AnimationPlayerCreated,this._animationCreated,this);target.animationModel.removeEventListener(WebInspector.AnimationModel.Events.AnimationPlayerCanceled,this._animationCanceled,this);},_addEventListeners:function(target)
{if(!target)
return;target.animationModel.ensureEnabled();target.animationModel.addEventListener(WebInspector.AnimationModel.Events.AnimationPlayerCreated,this._animationCreated,this);target.animationModel.addEventListener(WebInspector.AnimationModel.Events.AnimationPlayerCanceled,this._animationCanceled,this);},_createScrubber:function(){this._timelineScrubber=createElementWithClass("div","animation-scrubber hidden");this._timelineScrubber.createChild("div","animation-time-overlay");this._timelineScrubber.createChild("div","animation-scrubber-arrow");this._timelineScrubberHead=this._timelineScrubber.createChild("div","animation-scrubber-head");var timerContainer=this._timelineScrubber.createChild("div","animation-timeline-timer");this._timerSpinner=timerContainer.createChild("div","timer-spinner timer-hemisphere");this._timerFiller=timerContainer.createChild("div","timer-filler timer-hemisphere");this._timerMask=timerContainer.createChild("div","timer-mask");return this._timelineScrubber;},_createHeader:function()
{function playbackSliderInputHandler(event)
{this._animationsPlaybackRate=WebInspector.AnimationTimeline.GlobalPlaybackRates[event.target.value];var target=WebInspector.targetManager.mainTarget();if(target)
target.animationModel.setPlaybackRate(this._animationsPlaybackRate);this._playbackLabel.textContent=this._animationsPlaybackRate+"x";WebInspector.userMetrics.AnimationsPlaybackRateChanged.record();if(this._scrubberPlayer)
this._scrubberPlayer.playbackRate=this._animationsPlaybackRate;}
var container=createElementWithClass("div","animation-timeline-header");var controls=container.createChild("div","animation-controls");container.createChild("div","animation-timeline-markers");var replayButton=controls.createSVGChild("svg","animation-control-replay");replayButton.setAttribute("height",24);replayButton.setAttribute("width",24);var g=replayButton.createSVGChild("g")
var circle=g.createSVGChild("circle");circle.setAttribute("cx",12);circle.setAttribute("cy",12);circle.setAttribute("r",9);var triangle=g.createSVGChild("path");triangle.setAttribute("d","M 10 8 L 10 16 L 16 12 z");replayButton.addEventListener("click",this._replay.bind(this));this._playbackLabel=controls.createChild("div","source-code animation-playback-label");this._playbackLabel.createTextChild("1x");this._playbackSlider=controls.createChild("input","animation-playback-slider");this._playbackSlider.type="range";this._playbackSlider.min=0;this._playbackSlider.max=WebInspector.AnimationTimeline.GlobalPlaybackRates.length-1;this._playbackSlider.value=this._playbackSlider.max;this._playbackSlider.addEventListener("input",playbackSliderInputHandler.bind(this));this._updateAnimationsPlaybackRate();return container;},_updateAnimationsPlaybackRate:function()
{function setPlaybackRate(error,playbackRate)
{this._animationsPlaybackRate=playbackRate;this._playbackSlider.value=WebInspector.AnimationTimeline.GlobalPlaybackRates.indexOf(playbackRate);this._playbackLabel.textContent=playbackRate+"x";}
var target=WebInspector.targetManager.mainTarget();if(target)
target.animationAgent().getPlaybackRate(setPlaybackRate.bind(this));},_replay:function()
{if(this.startTime()===undefined)
return;var targets=WebInspector.targetManager.targets();for(var target of targets)
target.animationAgent().setCurrentTime((this.startTime()));this._animateTime(0);},_defaultDuration:function()
{return 100;},duration:function()
{return this._duration;},setDuration:function(duration)
{this._duration=duration;this.scheduleRedraw();},startTime:function()
{return this._startTime;},_reset:function()
{if(!this._nodesMap.size)
return;this._nodesMap.clear();this._animationsMap.clear();this._animationsContainer.removeChildren();this._duration=this._defaultDuration();delete this._startTime;},_mainFrameNavigated:function(event)
{this._reset();this._addEventListeners(WebInspector.targetManager.mainTarget());this._updateAnimationsPlaybackRate();if(this._scrubberPlayer)
this._scrubberPlayer.cancel();delete this._scrubberPlayer;this._timelineScrubberHead.textContent=WebInspector.UIString(Number.millisToString(0));},_animationCreated:function(event)
{this._addAnimation((event.data.player),event.data.resetTimeline)},_addAnimation:function(animation,resetTimeline)
{function nodeResolved(node)
{uiAnimation.setNode(node);node[this._symbol]=nodeUI;}
if(resetTimeline)
this._reset();if(animation.type()==="WebAnimation"&&animation.source().keyframesRule().keyframes().length===0)
return;if(this._resizeWindow(animation))
this.scheduleRedraw();else
this._resetTimerAnimation();var nodeUI=this._nodesMap.get(animation.source().backendNodeId());if(!nodeUI){nodeUI=new WebInspector.AnimationTimeline.NodeUI(animation.source());this._animationsContainer.appendChild(nodeUI.element);this._nodesMap.set(animation.source().backendNodeId(),nodeUI);}
var nodeRow=nodeUI.findRow(animation);var uiAnimation=new WebInspector.AnimationUI(animation,this,nodeRow.element);animation.source().deferredNode().resolve(nodeResolved.bind(this));nodeRow.animations.push(uiAnimation);this._animationsMap.set(animation.id(),animation);},_animationCanceled:function(event)
{this._cancelAnimation((event.data.playerId));},_cancelAnimation:function(playerId)
{var animation=this._animationsMap.get(playerId);animation.setPlayState("idle");this.scheduleRedraw();},_nodeRemoved:function(event)
{var node=event.data.node;if(node[this._symbol])
node[this._symbol].nodeRemoved();},_renderGrid:function()
{const gridSize=250;this._grid.setAttribute("width",this.width());this._grid.setAttribute("height",this._animationsContainer.offsetHeight+43);this._grid.setAttribute("shape-rendering","crispEdges");this._grid.removeChildren();var lastDraw=undefined;for(var time=0;time<this.duration();time+=gridSize){var line=this._grid.createSVGChild("rect","animation-timeline-grid-line");line.setAttribute("x",time*this.pixelMsRatio());line.setAttribute("y",0);line.setAttribute("height","100%");line.setAttribute("width",1);}
for(var time=0;time<this.duration();time+=gridSize){var gridWidth=time*this.pixelMsRatio();if(time&&(!lastDraw||gridWidth-lastDraw>50)){lastDraw=gridWidth;var label=this._grid.createSVGChild("text","animation-timeline-grid-label");label.setAttribute("x",gridWidth+5);label.setAttribute("y",35);label.innerHTML=WebInspector.UIString(Number.millisToString(time));}}},scheduleRedraw:function(){if(this._redrawing)
return;this._redrawing=true;this._animationsContainer.window().requestAnimationFrame(this._redraw.bind(this));},_redraw:function(timestamp)
{delete this._redrawing;for(var nodeUI of this._nodesMap.values())
nodeUI.redraw();this._renderGrid();},onResize:function()
{this._cachedTimelineWidth=Math.max(0,this._animationsContainer.offsetWidth-this._timelineControlsWidth)||0;this.scheduleRedraw();if(this._scrubberPlayer)
this._animateTime();},width:function()
{return this._cachedTimelineWidth||0;},_resizeWindow:function(animation)
{var resized=false;if(!this._startTime)
this._startTime=animation.startTime();var duration=animation.source().duration()*Math.min(3,animation.source().iterations());var requiredDuration=animation.startTime()+animation.source().delay()+duration+animation.source().endDelay()-this.startTime();if(requiredDuration>this._duration*0.8){resized=true;this._duration=requiredDuration*1.5;this._timelineScrubber.classList.remove("hidden");this._animateTime(animation.startTime()-this.startTime(),true);}
return resized;},_startTimerAnimation:function()
{var timerDuration=1000/this._animationsPlaybackRate;this._timerSpinnerPlayer=this._timerSpinner.animate([{transform:"rotate(0deg)"},{transform:"rotate(360deg)"}],timerDuration);this._timerSpinnerPlayer.onfinish=this._timerFinished.bind(this,this._timerSpinnerPlayer);var keyframes=[{opacity:0},{opacity:1}];this._timerFillerPlayer=this._timerFiller.animate(keyframes,{duration:timerDuration,easing:"steps(1, middle)"});this._timerMaskPlayer=this._timerMask.animate(keyframes,{duration:timerDuration,easing:"steps(1, middle)",direction:"reverse"});},_resetTimerAnimation:function()
{if(!this._timerSpinnerPlayer)
return;this._timerSpinnerPlayer.currentTime=0;this._timerFillerPlayer.currentTime=0;this._timerMaskPlayer.currentTime=0;},_timerFinished:function(timerPlayer)
{if(this._timerSpinnerPlayer!==timerPlayer)
return;this._timelineScrubber.classList.add("animation-timeline-end");delete this._timerSpinnerPlayer;delete this._timerFillerPlayer;delete this._timerMaskPlayer;},_animateTime:function(time,timelineCapturing)
{var oldPlayer=this._scrubberPlayer;this._timelineScrubber.classList.toggle("animation-timeline-capturing",timelineCapturing);if(timelineCapturing)
this._startTimerAnimation();this._scrubberPlayer=this._timelineScrubber.animate([{transform:"translateX(0px)"},{transform:"translateX("+(this.width()-this._scrubberRadius)+"px)"}],{duration:this.duration()-this._scrubberRadius/this.pixelMsRatio(),fill:"forwards"});this._scrubberPlayer.playbackRate=this._animationsPlaybackRate;if(time!==undefined)
this._scrubberPlayer.currentTime=time;else if(oldPlayer.playState==="finished")
this._scrubberPlayer.finish();else
this._scrubberPlayer.startTime=oldPlayer.startTime;if(oldPlayer)
oldPlayer.cancel();this._timelineScrubber.classList.remove("animation-timeline-end");this._timelineScrubberHead.window().requestAnimationFrame(this._updateScrubber.bind(this));},pixelMsRatio:function()
{return this.width()/this.duration()||0;},_updateScrubber:function(timestamp)
{if(!this._scrubberPlayer)
return;this._timelineScrubberHead.textContent=WebInspector.UIString(Number.millisToString(this._scrubberPlayer.currentTime));if(this._scrubberPlayer.playState==="pending"||this._scrubberPlayer.playState==="running"){this._timelineScrubberHead.window().requestAnimationFrame(this._updateScrubber.bind(this));}else if(this._scrubberPlayer.playState==="finished"){this._timelineScrubberHead.textContent=WebInspector.UIString(". . .");if(!this._timerSpinnerPlayer)
this._timelineScrubber.classList.add("animation-timeline-end");}},_scrubberDragStart:function(event)
{if(!this._scrubberPlayer)
return false;this._originalScrubberTime=this._scrubberPlayer.currentTime;this._timelineScrubber.classList.remove("animation-timeline-end");this._timelineScrubber.classList.remove("animation-timeline-capturing");this._scrubberPlayer.pause();this._originalMousePosition=new WebInspector.Geometry.Point(event.x,event.y);var target=WebInspector.targetManager.mainTarget();if(target)
target.animationModel.setPlaybackRate(0);return true;},_scrubberDragMove:function(event)
{var delta=event.x-this._originalMousePosition.x;this._scrubberPlayer.currentTime=Math.min(this._originalScrubberTime+delta/this.pixelMsRatio(),this.duration()-this._scrubberRadius/this.pixelMsRatio());var currentTime=Math.max(0,Math.round(this._scrubberPlayer.currentTime));this._timelineScrubberHead.textContent=WebInspector.UIString(Number.millisToString(currentTime));var targets=WebInspector.targetManager.targets();for(var target of targets)
target.animationAgent().setCurrentTime((this.startTime()+currentTime));},_scrubberDragEnd:function(event)
{if(this._scrubberPlayer.currentTime<this.duration()-this._scrubberRadius/this.pixelMsRatio())
this._scrubberPlayer.play();this._timelineScrubberHead.window().requestAnimationFrame(this._updateScrubber.bind(this));var target=WebInspector.targetManager.mainTarget();if(target)
target.animationModel.setPlaybackRate(this._animationsPlaybackRate);},__proto__:WebInspector.VBox.prototype}
WebInspector.AnimationTimeline.NodeUI=function(animationNode){function nodeResolved(node)
{this._description.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(node));}
this._rows=[];this.element=createElementWithClass("div","animation-node-row");this._description=this.element.createChild("div","animation-node-description");animationNode.deferredNode().resolve(nodeResolved.bind(this));this._timelineElement=this.element.createChild("div","animation-node-timeline");}
WebInspector.AnimationTimeline.NodeRow;WebInspector.AnimationTimeline.NodeUI.prototype={findRow:function(animation)
{var existingRow=this._collapsibleIntoRow(animation);if(existingRow)
return existingRow;var container=this._timelineElement.createChild("div","animation-timeline-row");var nodeRow={element:container,animations:[]};this._rows.push(nodeRow);return nodeRow;},redraw:function()
{for(var nodeRow of this._rows){for(var ui of nodeRow.animations)
ui.redraw();}},_collapsibleIntoRow:function(animation)
{if(animation.endTime()===Infinity)
return null;for(var nodeRow of this._rows){var overlap=false;for(var ui of nodeRow.animations)
overlap|=animation.overlaps(ui.animation());if(!overlap)
return nodeRow;}
return null;},nodeRemoved:function()
{this.element.classList.add("animation-node-removed");}}
WebInspector.AnimationTimeline.StepTimingFunction=function(steps,stepAtPosition)
{this.steps=steps;this.stepAtPosition=stepAtPosition;}
WebInspector.AnimationTimeline.StepTimingFunction.parse=function(text){var match=text.match(/^step-(start|middle|end)$/);if(match)
return new WebInspector.AnimationTimeline.StepTimingFunction(1,match[1]);match=text.match(/^steps\((\d+), (start|middle|end)\)$/);if(match)
return new WebInspector.AnimationTimeline.StepTimingFunction(parseInt(match[1],10),match[2]);return null;}
WebInspector.AnimationUI=function(animation,timeline,parentElement){this._animation=animation;this._timeline=timeline;this._parentElement=parentElement;if(this._animation.source().keyframesRule())
this._keyframes=this._animation.source().keyframesRule().keyframes();this._nameElement=parentElement.createChild("div","animation-name");this._nameElement.textContent=this._animation.name();this._svg=parentElement.createSVGChild("svg","animation-ui");this._svg.setAttribute("height",WebInspector.AnimationUI.Options.AnimationSVGHeight);this._svg.style.marginLeft="-"+WebInspector.AnimationUI.Options.AnimationMargin+"px";this._svg.addEventListener("mousedown",this._mouseDown.bind(this,WebInspector.AnimationUI.MouseEvents.AnimationDrag,null));this._activeIntervalGroup=this._svg.createSVGChild("g");this._cachedElements=[];this._movementInMs=0;this.redraw();}
WebInspector.AnimationUI.MouseEvents={AnimationDrag:"AnimationDrag",KeyframeMove:"KeyframeMove",StartEndpointMove:"StartEndpointMove",FinishEndpointMove:"FinishEndpointMove"}
WebInspector.AnimationUI.prototype={animation:function()
{return this._animation;},setNode:function(node)
{this._node=node;},_createLine:function(parentElement,className)
{var line=parentElement.createSVGChild("line",className);line.setAttribute("x1",WebInspector.AnimationUI.Options.AnimationMargin);line.setAttribute("y1",WebInspector.AnimationUI.Options.AnimationHeight);line.setAttribute("y2",WebInspector.AnimationUI.Options.AnimationHeight);line.style.stroke=this._color();return line;},_drawAnimationLine:function(iteration,parentElement)
{var cache=this._cachedElements[iteration];if(!cache.animationLine)
cache.animationLine=this._createLine(parentElement,"animation-line");cache.animationLine.setAttribute("x2",(this._duration()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin).toFixed(2));},_drawDelayLine:function(parentElement)
{if(!this._delayLine){this._delayLine=this._createLine(parentElement,"animation-delay-line");this._endDelayLine=this._createLine(parentElement,"animation-delay-line");}
this._delayLine.setAttribute("x1",WebInspector.AnimationUI.Options.AnimationMargin);this._delayLine.setAttribute("x2",(this._delay()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin).toFixed(2));var leftMargin=(this._delay()+this._duration()*this._animation.source().iterations())*this._timeline.pixelMsRatio();this._endDelayLine.style.transform="translateX("+Math.min(leftMargin,this._timeline.width()).toFixed(2)+"px)";this._endDelayLine.setAttribute("x1",WebInspector.AnimationUI.Options.AnimationMargin);this._endDelayLine.setAttribute("x2",(this._animation.source().endDelay()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin).toFixed(2));},_drawPoint:function(iteration,parentElement,x,keyframeIndex,attachEvents)
{if(this._cachedElements[iteration].keyframePoints[keyframeIndex]){this._cachedElements[iteration].keyframePoints[keyframeIndex].setAttribute("cx",x.toFixed(2));return;}
var circle=parentElement.createSVGChild("circle",keyframeIndex<=0?"animation-endpoint":"animation-keyframe-point");circle.setAttribute("cx",x.toFixed(2));circle.setAttribute("cy",WebInspector.AnimationUI.Options.AnimationHeight);circle.style.stroke=this._color();circle.setAttribute("r",WebInspector.AnimationUI.Options.AnimationMargin/2);if(keyframeIndex<=0)
circle.style.fill=this._color();this._cachedElements[iteration].keyframePoints[keyframeIndex]=circle;if(!attachEvents)
return;if(keyframeIndex===0){circle.addEventListener("mousedown",this._mouseDown.bind(this,WebInspector.AnimationUI.MouseEvents.StartEndpointMove,keyframeIndex));}else if(keyframeIndex===-1){circle.addEventListener("mousedown",this._mouseDown.bind(this,WebInspector.AnimationUI.MouseEvents.FinishEndpointMove,keyframeIndex));}else{circle.addEventListener("mousedown",this._mouseDown.bind(this,WebInspector.AnimationUI.MouseEvents.KeyframeMove,keyframeIndex));}},_renderKeyframe:function(iteration,keyframeIndex,parentElement,leftDistance,width,easing)
{function createStepLine(parentElement,x,strokeColor)
{var line=parentElement.createSVGChild("line");line.setAttribute("x1",x);line.setAttribute("x2",x);line.setAttribute("y1",WebInspector.AnimationUI.Options.AnimationMargin);line.setAttribute("y2",WebInspector.AnimationUI.Options.AnimationHeight);line.style.stroke=strokeColor;}
var bezier=WebInspector.Geometry.CubicBezier.parse(easing);var cache=this._cachedElements[iteration].keyframeRender;if(!cache[keyframeIndex])
cache[keyframeIndex]=bezier?parentElement.createSVGChild("path","animation-keyframe"):parentElement.createSVGChild("g","animation-keyframe-step");var group=cache[keyframeIndex];group.style.transform="translateX("+leftDistance.toFixed(2)+"px)";if(bezier){group.style.fill=this._color();WebInspector.BezierUI.drawVelocityChart(bezier,group,width);}else{var stepFunction=WebInspector.AnimationTimeline.StepTimingFunction.parse(easing);group.removeChildren();const offsetMap={"start":0,"middle":0.5,"end":1};const offsetWeight=offsetMap[stepFunction.stepAtPosition];for(var i=0;i<stepFunction.steps;i++)
createStepLine(group,(i+offsetWeight)*width/stepFunction.steps,this._color());}},redraw:function()
{var durationWithDelay=this._delay()+this._duration()*this._animation.source().iterations()+this._animation.source().endDelay();var leftMargin=((this._animation.startTime()-this._timeline.startTime())*this._timeline.pixelMsRatio());var maxWidth=this._timeline.width()-WebInspector.AnimationUI.Options.AnimationMargin-leftMargin;var svgWidth=Math.min(maxWidth,durationWithDelay*this._timeline.pixelMsRatio());this._svg.classList.toggle("animation-ui-canceled",this._animation.playState()==="idle");this._svg.setAttribute("width",(svgWidth+2*WebInspector.AnimationUI.Options.AnimationMargin).toFixed(2));this._svg.style.transform="translateX("+leftMargin.toFixed(2)+"px)";this._activeIntervalGroup.style.transform="translateX("+(this._delay()*this._timeline.pixelMsRatio()).toFixed(2)+"px)";this._nameElement.style.transform="translateX("+(leftMargin+this._delay()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin).toFixed(2)+"px)";this._nameElement.style.width=(this._duration()*this._timeline.pixelMsRatio().toFixed(2))+"px";this._drawDelayLine(this._svg);if(this._animation.type()==="CSSTransition"){this._renderTransition();return;}
this._renderIteration(this._activeIntervalGroup,0);if(!this._tailGroup)
this._tailGroup=this._activeIntervalGroup.createSVGChild("g","animation-tail-iterations");var iterationWidth=this._duration()*this._timeline.pixelMsRatio();for(var iteration=1;iteration<this._animation.source().iterations()&&iterationWidth*(iteration-1)<this._timeline.width();iteration++)
this._renderIteration(this._tailGroup,iteration);},_renderTransition:function()
{if(!this._cachedElements[0])
this._cachedElements[0]={animationLine:null,keyframePoints:{},keyframeRender:{},group:null};this._drawAnimationLine(0,this._activeIntervalGroup);this._renderKeyframe(0,0,this._activeIntervalGroup,WebInspector.AnimationUI.Options.AnimationMargin,this._duration()*this._timeline.pixelMsRatio(),this._animation.source().easing());this._drawPoint(0,this._activeIntervalGroup,WebInspector.AnimationUI.Options.AnimationMargin,0,true);this._drawPoint(0,this._activeIntervalGroup,this._duration()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin,-1,true);},_renderIteration:function(parentElement,iteration)
{if(!this._cachedElements[iteration])
this._cachedElements[iteration]={animationLine:null,keyframePoints:{},keyframeRender:{},group:parentElement.createSVGChild("g")};var group=this._cachedElements[iteration].group;group.style.transform="translateX("+(iteration*this._duration()*this._timeline.pixelMsRatio()).toFixed(2)+"px)";this._drawAnimationLine(iteration,group);console.assert(this._keyframes.length>1);for(var i=0;i<this._keyframes.length-1;i++){var leftDistance=this._offset(i)*this._duration()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin;var width=this._duration()*(this._offset(i+1)-this._offset(i))*this._timeline.pixelMsRatio();this._renderKeyframe(iteration,i,group,leftDistance,width,this._keyframes[i].easing());if(i||(!i&&iteration===0))
this._drawPoint(iteration,group,leftDistance,i,iteration===0);}
this._drawPoint(iteration,group,this._duration()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin,-1,iteration===0);},_delay:function()
{var delay=this._animation.source().delay();if(this._mouseEventType===WebInspector.AnimationUI.MouseEvents.AnimationDrag||this._mouseEventType===WebInspector.AnimationUI.MouseEvents.StartEndpointMove)
delay+=this._movementInMs;return Math.max(0,delay);},_duration:function()
{var duration=this._animation.source().duration();if(this._mouseEventType===WebInspector.AnimationUI.MouseEvents.FinishEndpointMove)
duration+=this._movementInMs;else if(this._mouseEventType===WebInspector.AnimationUI.MouseEvents.StartEndpointMove)
duration-=Math.max(this._movementInMs,-this._animation.source().delay());return Math.max(0,duration);},_offset:function(i)
{var offset=this._keyframes[i].offsetAsNumber();if(this._mouseEventType===WebInspector.AnimationUI.MouseEvents.KeyframeMove&&i===this._keyframeMoved){console.assert(i>0&&i<this._keyframes.length-1,"First and last keyframe cannot be moved");offset+=this._movementInMs/this._animation.source().duration();offset=Math.max(offset,this._keyframes[i-1].offsetAsNumber());offset=Math.min(offset,this._keyframes[i+1].offsetAsNumber());}
return offset;},_mouseDown:function(mouseEventType,keyframeIndex,event)
{if(this._animation.playState()==="idle")
return;this._mouseEventType=mouseEventType;this._keyframeMoved=keyframeIndex;this._downMouseX=event.clientX;this._mouseMoveHandler=this._mouseMove.bind(this);this._mouseUpHandler=this._mouseUp.bind(this);this._parentElement.ownerDocument.addEventListener("mousemove",this._mouseMoveHandler);this._parentElement.ownerDocument.addEventListener("mouseup",this._mouseUpHandler);event.preventDefault();event.stopPropagation();if(this._node)
WebInspector.Revealer.reveal(this._node);},_mouseMove:function(event)
{this._movementInMs=(event.clientX-this._downMouseX)/this._timeline.pixelMsRatio();if(this._animation.startTime()+this._delay()+this._duration()-this._timeline.startTime()>this._timeline.duration()*0.8)
this._timeline.setDuration(this._timeline.duration()*1.2);this.redraw();},_mouseUp:function(event)
{this._movementInMs=(event.clientX-this._downMouseX)/this._timeline.pixelMsRatio();if(this._mouseEventType===WebInspector.AnimationUI.MouseEvents.KeyframeMove){this._keyframes[this._keyframeMoved].setOffset(this._offset(this._keyframeMoved));}else{var delay=this._delay();var duration=this._duration();this._setDelay(delay);this._setDuration(duration);if(this._animation.type()!=="CSSAnimation"){var target=WebInspector.targetManager.mainTarget();if(target)
target.animationAgent().setTiming(this._animation.id(),duration,delay);}}
this._movementInMs=0;this.redraw();this._parentElement.ownerDocument.removeEventListener("mousemove",this._mouseMoveHandler);this._parentElement.ownerDocument.removeEventListener("mouseup",this._mouseUpHandler);delete this._mouseMoveHandler;delete this._mouseUpHandler;delete this._mouseEventType;delete this._downMouseX;delete this._keyframeMoved;},_setDelay:function(value)
{if(!this._node||this._animation.source().delay()==this._delay())
return;this._animation.source().setDelay(this._delay());var propertyName;if(this._animation.type()=="CSSTransition")
propertyName="transition-delay";else if(this._animation.type()=="CSSAnimation")
propertyName="animation-delay";else
return;this._setNodeStyle(propertyName,Math.round(value)+"ms");},_setDuration:function(value)
{if(!this._node||this._animation.source().duration()==value)
return;this._animation.source().setDuration(value);var propertyName;if(this._animation.type()=="CSSTransition")
propertyName="transition-duration";else if(this._animation.type()=="CSSAnimation")
propertyName="animation-duration";else
return;this._setNodeStyle(propertyName,Math.round(value)+"ms");},_setNodeStyle:function(name,value)
{var style=this._node.getAttribute("style")||"";if(style)
style=style.replace(new RegExp("\\s*(-webkit-)?"+name+":[^;]*;?\\s*","g"),"");var valueString=name+": "+value;this._node.setAttributeValue("style",style+" "+valueString+"; -webkit-"+valueString+";");},_color:function()
{function hash(string)
{var hash=0;for(var i=0;i<string.length;i++)
hash=(hash<<5)+hash+string.charCodeAt(i);return Math.abs(hash);}
if(!this._selectedColor){var names=Object.keys(WebInspector.AnimationUI.Colors);var color=WebInspector.AnimationUI.Colors[names[hash(this._animation.name()||this._animation.id())%names.length]];this._selectedColor=color.asString(WebInspector.Color.Format.RGB);}
return this._selectedColor;}}
WebInspector.AnimationUI.Options={AnimationHeight:32,AnimationSVGHeight:80,AnimationMargin:7,EndpointsClickRegionSize:10,GridCanvasHeight:40}
WebInspector.AnimationUI.Colors={"Purple":WebInspector.Color.parse("#9C27B0"),"Light Blue":WebInspector.Color.parse("#03A9F4"),"Deep Orange":WebInspector.Color.parse("#FF5722"),"Blue":WebInspector.Color.parse("#5677FC"),"Lime":WebInspector.Color.parse("#CDDC39"),"Blue Grey":WebInspector.Color.parse("#607D8B"),"Pink":WebInspector.Color.parse("#E91E63"),"Green":WebInspector.Color.parse("#0F9D58"),"Brown":WebInspector.Color.parse("#795548"),"Cyan":WebInspector.Color.parse("#00BCD4")};WebInspector.AnimationControlPane=function()
{this._animationsPaused=false;this._animationsPlaybackRate=1;this.element=createElementWithClass("div","styles-animations-controls-pane");this.element.createChild("div").createTextChild("Animations");var container=this.element.createChild("div","animations-controls");var toolbar=new WebInspector.Toolbar();this._animationsPauseButton=new WebInspector.ToolbarButton("","pause-toolbar-item");toolbar.appendToolbarItem(this._animationsPauseButton);this._animationsPauseButton.addEventListener("click",this._pauseButtonHandler.bind(this));container.appendChild(toolbar.element);this._animationsPlaybackSlider=container.createChild("input");this._animationsPlaybackSlider.type="range";this._animationsPlaybackSlider.min=0;this._animationsPlaybackSlider.max=WebInspector.AnimationTimeline.GlobalPlaybackRates.length-1;this._animationsPlaybackSlider.value=this._animationsPlaybackSlider.max;this._animationsPlaybackSlider.addEventListener("input",this._playbackSliderInputHandler.bind(this));this._animationsPlaybackLabel=container.createChild("div","playback-label");this._animationsPlaybackLabel.createTextChild("1x");}
WebInspector.AnimationControlPane.prototype={_playbackSliderInputHandler:function(event)
{this._animationsPlaybackRate=WebInspector.AnimationTimeline.GlobalPlaybackRates[event.target.value];this._target.animationModel.setPlaybackRate(this._animationsPaused?0:this._animationsPlaybackRate);this._animationsPlaybackLabel.textContent=this._animationsPlaybackRate+"x";WebInspector.userMetrics.AnimationsPlaybackRateChanged.record();},_pauseButtonHandler:function()
{this._animationsPaused=!this._animationsPaused;this._target.animationModel.setPlaybackRate(this._animationsPaused?0:this._animationsPlaybackRate);WebInspector.userMetrics.AnimationsPlaybackRateChanged.record();this._animationsPauseButton.element.classList.toggle("pause-toolbar-item");this._animationsPauseButton.element.classList.toggle("play-toolbar-item");},_updateAnimationsPlaybackRate:function(event)
{function setPlaybackRate(error,playbackRate)
{this._animationsPlaybackSlider.value=WebInspector.AnimationTimeline.GlobalPlaybackRates.indexOf(playbackRate);this._animationsPlaybackLabel.textContent=playbackRate+"x";}
if(this._target)
this._target.animationAgent().getPlaybackRate(setPlaybackRate.bind(this));},setNode:function(node)
{if(!node)
return;if(this._target)
this._target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated,this._updateAnimationsPlaybackRate,this);this._target=node.target();this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated,this._updateAnimationsPlaybackRate,this);this._updateAnimationsPlaybackRate();}};WebInspector.StylesPopoverHelper=function()
{this._popover=new WebInspector.Popover();this._popover.setCanShrink(false);this._popover.setNoMargins(true);this._popover.element.addEventListener("mousedown",consumeEvent,false);this._hideProxy=this.hide.bind(this,true);this._boundOnKeyDown=this._onKeyDown.bind(this);this._repositionBound=this._reposition.bind(this);this._boundFocusOut=this._onFocusOut.bind(this);}
WebInspector.StylesPopoverHelper.prototype={_onFocusOut:function(event)
{if(!event.relatedTarget||event.relatedTarget.isSelfOrDescendant(this._view.contentElement))
return;this._hideProxy();},isShowing:function()
{return this._popover.isShowing();},show:function(view,anchorElement,hiddenCallback)
{if(this._popover.isShowing()){if(this._anchorElement===anchorElement)
return;this.hide(true);}
delete this._isHidden;this._anchorElement=anchorElement;this._view=view;this._hiddenCallback=hiddenCallback;this._reposition();var document=this._popover.element.ownerDocument;document.addEventListener("mousedown",this._hideProxy,false);document.defaultView.addEventListener("resize",this._hideProxy,false);this._view.contentElement.addEventListener("keydown",this._boundOnKeyDown,false);this._scrollerElement=anchorElement.enclosingNodeOrSelfWithClass("style-panes-wrapper");if(this._scrollerElement)
this._scrollerElement.addEventListener("scroll",this._repositionBound,false);},_reposition:function(event)
{if(!this._previousFocusElement)
this._previousFocusElement=WebInspector.currentFocusElement();this._view.contentElement.removeEventListener("focusout",this._boundFocusOut,false);this._popover.showView(this._view,this._anchorElement);this._view.contentElement.addEventListener("focusout",this._boundFocusOut,false);WebInspector.setCurrentFocusElement(this._view.contentElement);},hide:function(commitEdit)
{if(this._isHidden)
return;var document=this._popover.element.ownerDocument;this._isHidden=true;this._popover.hide();if(this._scrollerElement)
this._scrollerElement.removeEventListener("scroll",this._repositionBound,false);document.removeEventListener("mousedown",this._hideProxy,false);document.defaultView.removeEventListener("resize",this._hideProxy,false);if(this._hiddenCallback)
this._hiddenCallback.call(null,!!commitEdit);WebInspector.setCurrentFocusElement(this._previousFocusElement);delete this._previousFocusElement;delete this._anchorElement;if(this._view){this._view.detach();this._view.contentElement.removeEventListener("keydown",this._boundOnKeyDown,false);this._view.contentElement.removeEventListener("focusout",this._boundFocusOut,false);delete this._view;}},_onKeyDown:function(event)
{if(event.keyIdentifier==="Enter"){this.hide(true);event.consume(true);return;}
if(event.keyIdentifier==="U+001B"){this.hide(false);event.consume(true);}},__proto__:WebInspector.Object.prototype}
WebInspector.BezierPopoverIcon=function(treeElement,stylesPopoverHelper,text)
{this._treeElement=treeElement;this._stylesPopoverHelper=stylesPopoverHelper;this._createDOM(text);this._boundBezierChanged=this._bezierChanged.bind(this);}
WebInspector.BezierPopoverIcon.prototype={element:function()
{return this._element;},_createDOM:function(text)
{this._element=createElement("nobr");this._iconElement=this._element.createSVGChild("svg","popover-icon bezier-icon");this._iconElement.setAttribute("height",10);this._iconElement.setAttribute("width",10);this._iconElement.addEventListener("click",this._iconClick.bind(this),false);var g=this._iconElement.createSVGChild("g");var path=g.createSVGChild("path");path.setAttribute("d","M2,8 C2,3 8,7 8,2");this._bezierValueElement=this._element.createChild("span");this._bezierValueElement.textContent=text;},_iconClick:function(event)
{event.consume(true);if(this._stylesPopoverHelper.isShowing()){this._stylesPopoverHelper.hide(true);return;}
this._bezierEditor=new WebInspector.BezierEditor();var geometry=WebInspector.Geometry.CubicBezier.parse(this._bezierValueElement.textContent);this._bezierEditor.setBezier(geometry);this._bezierEditor.addEventListener(WebInspector.BezierEditor.Events.BezierChanged,this._boundBezierChanged);this._stylesPopoverHelper.show(this._bezierEditor,this._iconElement,this._onPopoverHidden.bind(this));this._originalPropertyText=this._treeElement.property.propertyText;this._treeElement.parentPane().setEditingStyle(true);},_bezierChanged:function(event)
{this._bezierValueElement.textContent=(event.data);this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(),false);},_onPopoverHidden:function(commitEdit)
{this._bezierEditor.removeEventListener(WebInspector.BezierEditor.Events.BezierChanged,this._boundBezierChanged);delete this._bezierEditor;var propertyText=commitEdit?this._treeElement.renderedPropertyText():this._originalPropertyText;this._treeElement.applyStyleText(propertyText,true);this._treeElement.parentPane().setEditingStyle(false);delete this._originalPropertyText;}}
WebInspector.ColowSwatchPopoverIcon=function(treeElement,stylesPopoverHelper,colorText)
{this._treeElement=treeElement;this._stylesPopoverHelper=stylesPopoverHelper;this._swatch=WebInspector.ColorSwatch.create();this._swatch.setColorText(colorText);this._swatch.setFormat(WebInspector.ColowSwatchPopoverIcon._colorFormat(this._swatch.color()));var shiftClickMessage=WebInspector.UIString("Shift-click to change color format.");this._swatch.iconElement().title=String.sprintf("%s\n%s",WebInspector.UIString("Click to open a colorpicker."),shiftClickMessage);this._swatch.iconElement().addEventListener("click",this._iconClick.bind(this));this._boundSpectrumChanged=this._spectrumChanged.bind(this);}
WebInspector.ColowSwatchPopoverIcon._colorFormat=function(color)
{const cf=WebInspector.Color.Format;var format;var formatSetting=WebInspector.moduleSetting("colorFormat").get();if(formatSetting===cf.Original)
format=cf.Original;else if(formatSetting===cf.RGB)
format=(color.hasAlpha()?cf.RGBA:cf.RGB);else if(formatSetting===cf.HSL)
format=(color.hasAlpha()?cf.HSLA:cf.HSL);else if(!color.hasAlpha())
format=(color.canBeShortHex()?cf.ShortHEX:cf.HEX);else
format=cf.RGBA;return format;}
WebInspector.ColowSwatchPopoverIcon.prototype={element:function()
{return this._swatch;},_iconClick:function(event)
{event.consume(true);if(this._stylesPopoverHelper.isShowing()){this._stylesPopoverHelper.hide(true);return;}
var color=this._swatch.color();var format=this._swatch.format();if(format===WebInspector.Color.Format.Original)
format=color.format();this._spectrum=new WebInspector.Spectrum();this._spectrum.setColor(color);this._spectrum.setColorFormat(format);this._spectrum.addEventListener(WebInspector.Spectrum.Events.ColorChanged,this._boundSpectrumChanged);this._stylesPopoverHelper.show(this._spectrum,this._swatch.iconElement(),this._onPopoverHidden.bind(this));this._originalPropertyText=this._treeElement.property.propertyText;this._treeElement.parentPane().setEditingStyle(true);},_spectrumChanged:function(event)
{var colorString=(event.data);this._swatch.setColorText(colorString);this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(),false);},_onPopoverHidden:function(commitEdit)
{this._spectrum.removeEventListener(WebInspector.Spectrum.Events.ColorChanged,this._boundSpectrumChanged);delete this._spectrum;var propertyText=commitEdit?this._treeElement.renderedPropertyText():this._originalPropertyText;this._treeElement.applyStyleText(propertyText,true);this._treeElement.parentPane().setEditingStyle(false);delete this._originalPropertyText;}};WebInspector.BezierEditor=function()
{WebInspector.VBox.call(this,true);this.registerRequiredCSS("elements/bezierEditor.css");this.contentElement.tabIndex=0;this._previewElement=this.contentElement.createChild("div","bezier-preview-container");this._previewElement.createChild("div","bezier-preview-animation");this._previewElement.addEventListener("click",this._startPreviewAnimation.bind(this));this._previewOnion=this.contentElement.createChild("div","bezier-preview-onion");this._previewOnion.addEventListener("click",this._startPreviewAnimation.bind(this));this._outerContainer=this.contentElement.createChild("div","bezier-container");this._presetsContainer=this._outerContainer.createChild("div","bezier-presets");this._presetUI=new WebInspector.BezierUI(40,40,0,2,false);this._presetCategories=[];for(var i=0;i<WebInspector.BezierEditor.Presets.length;i++){this._presetCategories[i]=this._createCategory(WebInspector.BezierEditor.Presets[i]);this._presetsContainer.appendChild(this._presetCategories[i].icon);}
this._curveUI=new WebInspector.BezierUI(150,250,50,7,true);this._curve=this._outerContainer.createSVGChild("svg","bezier-curve");WebInspector.installDragHandle(this._curve,this._dragStart.bind(this),this._dragMove.bind(this),this._dragEnd.bind(this),"default");this._header=this.contentElement.createChild("div","bezier-header");var minus=this._createPresetModifyIcon(this._header,"bezier-preset-minus","M 12 6 L 8 10 L 12 14");var plus=this._createPresetModifyIcon(this._header,"bezier-preset-plus","M 8 6 L 12 10 L 8 14");minus.addEventListener("click",this._presetModifyClicked.bind(this,false));plus.addEventListener("click",this._presetModifyClicked.bind(this,true));this._label=this._header.createChild("span","source-code bezier-display-value");}
WebInspector.BezierEditor.Events={BezierChanged:"BezierChanged"}
WebInspector.BezierEditor.Presets=[[{name:"ease-in-out",value:"ease-in-out"},{name:"In Out · Sine",value:"cubic-bezier(0.45, 0.05, 0.55, 0.95)"},{name:"In Out · Quadratic",value:"cubic-bezier(0.46, 0.03, 0.52, 0.96)"},{name:"In Out · Cubic",value:"cubic-bezier(0.65, 0.05, 0.36, 1)"},{name:"Fast Out, Slow In",value:"cubic-bezier(0.4, 0, 0.2, 1)"},{name:"In Out · Back",value:"cubic-bezier(0.68, -0.55, 0.27, 1.55)"}],[{name:"Fast Out, Linear In",value:"cubic-bezier(0.4, 0, 1, 1)"},{name:"ease-in",value:"ease-in"},{name:"In · Sine",value:"cubic-bezier(0.47, 0, 0.75, 0.72)"},{name:"In · Quadratic",value:"cubic-bezier(0.55, 0.09, 0.68, 0.53)"},{name:"In · Cubic",value:"cubic-bezier(0.55, 0.06, 0.68, 0.19)"},{name:"In · Back",value:"cubic-bezier(0.6, -0.28, 0.74, 0.05)"}],[{name:"ease-out",value:"ease-out"},{name:"Out · Sine",value:"cubic-bezier(0.39, 0.58, 0.57, 1)"},{name:"Out · Quadratic",value:"cubic-bezier(0.25, 0.46, 0.45, 0.94)"},{name:"Out · Cubic",value:"cubic-bezier(0.22, 0.61, 0.36, 1)"},{name:"Linear Out, Slow In",value:"cubic-bezier(0, 0, 0.2, 1)"},{name:"Out · Back",value:"cubic-bezier(0.18, 0.89, 0.32, 1.28)"}]]
WebInspector.BezierEditor.PresetCategory;WebInspector.BezierEditor.prototype={setBezier:function(bezier)
{if(!bezier)
return;this._bezier=bezier;this._updateUI();},bezier:function()
{return this._bezier;},wasShown:function()
{this._unselectPresets();for(var category of this._presetCategories){for(var i=0;i<category.presets.length;i++){if(this._bezier.asCSSText()===category.presets[i].value){category.presetIndex=i;this._presetCategorySelected(category);}}}
this._updateUI();this._startPreviewAnimation();},_onchange:function()
{this._updateUI();this.dispatchEventToListeners(WebInspector.BezierEditor.Events.BezierChanged,this._bezier.asCSSText());},_updateUI:function()
{var labelText=this._selectedCategory?this._selectedCategory.presets[this._selectedCategory.presetIndex].name:this._bezier.asCSSText().replace(/\s(-\d\.\d)/g,"$1");this._label.textContent=WebInspector.UIString(labelText);this._curveUI.drawCurve(this._bezier,this._curve);this._previewOnion.removeChildren();},_dragStart:function(event)
{this._mouseDownPosition=new WebInspector.Geometry.Point(event.x,event.y);var ui=this._curveUI;this._controlPosition=new WebInspector.Geometry.Point(Number.constrain((event.offsetX-ui.radius)/ui.curveWidth(),0,1),(ui.curveHeight()+ui.marginTop+ui.radius-event.offsetY)/ui.curveHeight());var firstControlPointIsCloser=this._controlPosition.distanceTo(this._bezier.controlPoints[0])<this._controlPosition.distanceTo(this._bezier.controlPoints[1]);this._selectedPoint=firstControlPointIsCloser?0:1;this._bezier.controlPoints[this._selectedPoint]=this._controlPosition;this._unselectPresets();this._onchange();event.consume(true);return true;},_updateControlPosition:function(mouseX,mouseY)
{var deltaX=(mouseX-this._mouseDownPosition.x)/this._curveUI.curveWidth();var deltaY=(mouseY-this._mouseDownPosition.y)/this._curveUI.curveHeight();var newPosition=new WebInspector.Geometry.Point(Number.constrain(this._controlPosition.x+deltaX,0,1),this._controlPosition.y-deltaY);this._bezier.controlPoints[this._selectedPoint]=newPosition;},_dragMove:function(event)
{this._updateControlPosition(event.x,event.y);this._onchange();},_dragEnd:function(event)
{this._updateControlPosition(event.x,event.y);this._onchange();this._startPreviewAnimation();},_createCategory:function(presetGroup)
{var presetElement=createElementWithClass("div","bezier-preset-category");var iconElement=presetElement.createSVGChild("svg","bezier-preset monospace");var category={presets:presetGroup,presetIndex:0,icon:presetElement};this._presetUI.drawCurve(WebInspector.Geometry.CubicBezier.parse(category.presets[0].value),iconElement);iconElement.addEventListener("click",this._presetCategorySelected.bind(this,category));return category;},_createPresetModifyIcon:function(parentElement,className,drawPath)
{var icon=parentElement.createSVGChild("svg","bezier-preset-modify "+className);icon.setAttribute("width",20);icon.setAttribute("height",20);var path=icon.createSVGChild("path");path.setAttribute("d",drawPath);return icon;},_unselectPresets:function()
{for(var category of this._presetCategories)
category.icon.classList.remove("bezier-preset-selected");delete this._selectedCategory;this._header.classList.remove("bezier-header-active");},_presetCategorySelected:function(category,event)
{if(this._selectedCategory===category)
return;this._unselectPresets();this._header.classList.add("bezier-header-active");this._selectedCategory=category;this._selectedCategory.icon.classList.add("bezier-preset-selected");this.setBezier(WebInspector.Geometry.CubicBezier.parse(category.presets[category.presetIndex].value));this._onchange();this._startPreviewAnimation();if(event)
event.consume(true);},_presetModifyClicked:function(intensify,event)
{if(!this._selectedCategory)
return;var length=this._selectedCategory.presets.length;this._selectedCategory.presetIndex=(this._selectedCategory.presetIndex+(intensify?1:-1)+length)%length;this.setBezier(WebInspector.Geometry.CubicBezier.parse(this._selectedCategory.presets[this._selectedCategory.presetIndex].value));this._onchange();this._startPreviewAnimation();},_startPreviewAnimation:function()
{if(this._previewAnimation)
this._previewAnimation.cancel();const animationDuration=1600;const numberOnionSlices=20;var keyframes=[{offset:0,transform:"translateX(0px)",easing:this._bezier.asCSSText(),opacity:1},{offset:0.9,transform:"translateX(218px)",opacity:1},{offset:1,transform:"translateX(218px)",opacity:0}];this._previewAnimation=this._previewElement.animate(keyframes,animationDuration);this._previewOnion.removeChildren();for(var i=0;i<=numberOnionSlices;i++){var slice=this._previewOnion.createChild("div","bezier-preview-animation");var player=slice.animate([{transform:"translateX(0px)",easing:this._bezier.asCSSText()},{transform:"translateX(218px)"}],{duration:animationDuration,fill:"forwards"});player.pause();player.currentTime=animationDuration*i/numberOnionSlices;}},__proto__:WebInspector.VBox.prototype};WebInspector.Spectrum=function()
{function appendSwitcherIcon(parentElement)
{var icon=parentElement.createSVGChild("svg");icon.setAttribute("height",16);icon.setAttribute("width",16);var path=icon.createSVGChild("path");path.setAttribute("d","M5,6 L11,6 L8,2 Z M5,10 L11,10 L8,14 Z");return icon;}
WebInspector.VBox.call(this,true);this.registerRequiredCSS("elements/spectrum.css");this.contentElement.tabIndex=0;this._draggerElement=this.contentElement.createChild("div","spectrum-color");this._dragHelperElement=this._draggerElement.createChild("div","spectrum-sat fill").createChild("div","spectrum-val fill").createChild("div","spectrum-dragger");var toolbar=new WebInspector.Toolbar(this.contentElement);toolbar.element.classList.add("spectrum-eye-dropper");this._colorPickerButton=new WebInspector.ToolbarButton(WebInspector.UIString("Toggle color picker"),"eyedropper-toolbar-item");this._colorPickerButton.setToggled(true);this._colorPickerButton.addEventListener("click",this._toggleColorPicker.bind(this,undefined));toolbar.appendToolbarItem(this._colorPickerButton);var swatchElement=this.contentElement.createChild("span","swatch");this._swatchInnerElement=swatchElement.createChild("span","swatch-inner");this._hueElement=this.contentElement.createChild("div","spectrum-hue");this._hueSlider=this._hueElement.createChild("div","spectrum-slider");this._alphaElement=this.contentElement.createChild("div","spectrum-alpha");this._alphaElementBackground=this._alphaElement.createChild("div","spectrum-alpha-background");this._alphaSlider=this._alphaElement.createChild("div","spectrum-slider");this._currentFormat=WebInspector.Color.Format.HEX;var displaySwitcher=this.contentElement.createChild("div","spectrum-display-switcher");appendSwitcherIcon(displaySwitcher);displaySwitcher.addEventListener("click",this._formatViewSwitch.bind(this));this._displayContainer=this.contentElement.createChild("div","spectrum-text source-code");this._textValues=[];for(var i=0;i<4;++i){var inputValue=this._displayContainer.createChild("span","spectrum-text-value");inputValue.maxLength=4;this._textValues.push(inputValue);inputValue.addEventListener("keydown",this._inputChanged.bind(this));inputValue.addEventListener("mousewheel",this._inputChanged.bind(this));}
this._textLabels=this._displayContainer.createChild("div","spectrum-text-label");this._hexContainer=this.contentElement.createChild("div","spectrum-text spectrum-text-hex source-code");this._hexValue=this._hexContainer.createChild("span","spectrum-text-value");this._hexValue.maxLength=7;this._hexValue.addEventListener("keydown",this._inputChanged.bind(this));this._hexValue.addEventListener("mousewheel",this._inputChanged.bind(this));var label=this._hexContainer.createChild("div","spectrum-text-label");label.textContent="HEX";WebInspector.Spectrum.draggable(this._hueElement,hueDrag.bind(this));WebInspector.Spectrum.draggable(this._alphaElement,alphaDrag.bind(this));WebInspector.Spectrum.draggable(this._draggerElement,colorDrag.bind(this),colorDragStart.bind(this));function hueDrag(element,dragX,dragY)
{this._hsv[0]=(this._hueAlphaWidth-dragX)/this._hueAlphaWidth;this._onchange();}
function alphaDrag(element,dragX,dragY)
{this._hsv[3]=Math.round((dragX/this._hueAlphaWidth)*100)/100;if(this._color().hasAlpha()&&(this._currentFormat===WebInspector.Color.Format.ShortHEX||this._currentFormat===WebInspector.Color.Format.HEX||this._currentFormat===WebInspector.Color.Format.Nickname))
this.setColorFormat(WebInspector.Color.Format.RGB);this._onchange();}
var initialHelperOffset;function colorDragStart()
{initialHelperOffset={x:this._dragHelperElement.offsetLeft,y:this._dragHelperElement.offsetTop};}
function colorDrag(element,dragX,dragY,event)
{if(event.shiftKey){if(Math.abs(dragX-initialHelperOffset.x)>=Math.abs(dragY-initialHelperOffset.y))
dragY=initialHelperOffset.y;else
dragX=initialHelperOffset.x;}
this._hsv[1]=dragX/this.dragWidth;this._hsv[2]=(this.dragHeight-dragY)/this.dragHeight;this._onchange();}};WebInspector.Spectrum.Events={ColorChanged:"ColorChanged"};WebInspector.Spectrum.draggable=function(element,onmove,onstart,onstop){var dragging;var offset;var scrollOffset;var maxHeight;var maxWidth;function consume(e)
{e.consume(true);}
function move(e)
{if(dragging){var dragX=Math.max(0,Math.min(e.pageX-offset.left+scrollOffset.left,maxWidth));var dragY=Math.max(0,Math.min(e.pageY-offset.top+scrollOffset.top,maxHeight));if(onmove)
onmove(element,dragX,dragY,(e));}}
function start(e)
{var mouseEvent=(e);var rightClick=mouseEvent.which?(mouseEvent.which===3):(mouseEvent.button===2);if(!rightClick&&!dragging){if(onstart)
onstart(element,mouseEvent);dragging=true;maxHeight=element.clientHeight;maxWidth=element.clientWidth;scrollOffset=element.scrollOffset();offset=element.totalOffset();element.ownerDocument.addEventListener("selectstart",consume,false);element.ownerDocument.addEventListener("dragstart",consume,false);element.ownerDocument.addEventListener("mousemove",move,false);element.ownerDocument.addEventListener("mouseup",stop,false);move(mouseEvent);consume(mouseEvent);}}
function stop(e)
{if(dragging){element.ownerDocument.removeEventListener("selectstart",consume,false);element.ownerDocument.removeEventListener("dragstart",consume,false);element.ownerDocument.removeEventListener("mousemove",move,false);element.ownerDocument.removeEventListener("mouseup",stop,false);if(onstop)
onstop(element,(e));}
dragging=false;}
element.addEventListener("mousedown",start,false);};WebInspector.Spectrum.prototype={setColor:function(color)
{this._hsv=color.hsva();this._update();},setColorFormat:function(format)
{console.assert(format!==WebInspector.Color.Format.Original,"Spectrum's color format cannot be Original");if(format===WebInspector.Color.Format.RGBA)
format=WebInspector.Color.Format.RGB;else if(format===WebInspector.Color.Format.HSLA)
format=WebInspector.Color.Format.HSL;this._originalFormat=format;this._currentFormat=format;},_color:function()
{return WebInspector.Color.fromHSVA(this._hsv);},colorString:function()
{var cf=WebInspector.Color.Format;var color=this._color();var colorString=color.asString(this._currentFormat);if(colorString)
return colorString;if(this._currentFormat===cf.Nickname||this._currentFormat===cf.ShortHEX){colorString=color.asString(cf.HEX);if(colorString)
return colorString;}
console.assert(color.hasAlpha());return this._currentFormat===cf.HSL?(color.asString(cf.HSLA)):(color.asString(cf.RGBA));},_onchange:function()
{this._update();this._dispatchChangeEvent();},_dispatchChangeEvent:function()
{this.dispatchEventToListeners(WebInspector.Spectrum.Events.ColorChanged,this.colorString());},_update:function()
{this._updateHelperLocations();this._updateUI();this._updateInput();},_updateHelperLocations:function()
{var h=this._hsv[0];var s=this._hsv[1];var v=this._hsv[2];var alpha=this._hsv[3];var dragX=s*this.dragWidth;var dragY=this.dragHeight-(v*this.dragHeight);dragX=Math.max(-this._dragHelperElementHeight,Math.min(this.dragWidth-this._dragHelperElementHeight,dragX-this._dragHelperElementHeight));dragY=Math.max(-this._dragHelperElementHeight,Math.min(this.dragHeight-this._dragHelperElementHeight,dragY-this._dragHelperElementHeight));this._dragHelperElement.positionAt(dragX,dragY);var hueSlideX=(1-h)*this._hueAlphaWidth-this.slideHelperWidth;this._hueSlider.style.left=hueSlideX+"px";var alphaSlideX=alpha*this._hueAlphaWidth-this.slideHelperWidth;this._alphaSlider.style.left=alphaSlideX+"px";},_updateInput:function()
{var cf=WebInspector.Color.Format;if(this._currentFormat===cf.HEX||this._currentFormat===cf.ShortHEX||this._currentFormat===cf.Nickname){this._hexContainer.hidden=false;this._displayContainer.hidden=true;if(this._currentFormat===cf.ShortHEX&&this._color().canBeShortHex())
this._hexValue.textContent=this._color().asString(cf.ShortHEX);else
this._hexValue.textContent=this._color().asString(cf.HEX);}else{this._hexContainer.hidden=true;this._displayContainer.hidden=false;var isRgb=this._currentFormat===cf.RGB;this._textLabels.textContent=isRgb?"RGBA":"HSLA";var colorValues=isRgb?this._color().canonicalRGBA():this._color().canonicalHSLA();for(var i=0;i<3;++i){this._textValues[i].textContent=colorValues[i];if(!isRgb&&(i===1||i===2))
this._textValues[i].textContent+="%";}
this._textValues[3].textContent=Math.round(colorValues[3]*100)/100;}},_updateUI:function()
{var h=WebInspector.Color.fromHSVA([this._hsv[0],1,1,1]);this._draggerElement.style.backgroundColor=(h.asString(WebInspector.Color.Format.RGB));this._swatchInnerElement.style.backgroundColor=(this._color().asString(WebInspector.Color.Format.RGBA));this._swatchInnerElement.classList.toggle("swatch-inner-white",this._color().hsla()[2]>0.9);this._dragHelperElement.style.backgroundColor=(this._color().asString(WebInspector.Color.Format.RGBA));var noAlpha=WebInspector.Color.fromHSVA(this._hsv.slice(0,3).concat(1));this._alphaElementBackground.style.backgroundImage=String.sprintf("linear-gradient(to right, rgba(0,0,0,0), %s)",noAlpha.asString(WebInspector.Color.Format.RGB));},_formatViewSwitch:function()
{var cf=WebInspector.Color.Format;if(this._currentFormat===cf.RGB)
this._currentFormat=cf.HSL;else if(this._currentFormat===cf.HSL&&!this._color().hasAlpha())
this._currentFormat=this._originalFormat===cf.ShortHEX?cf.ShortHEX:cf.HEX;else
this._currentFormat=cf.RGB;this._onchange();},_inputChanged:function(event)
{function elementValue(element)
{return element.textContent;}
var element=(event.currentTarget);WebInspector.handleElementValueModifications(event,element);const cf=WebInspector.Color.Format;var colorString;if(this._currentFormat===cf.HEX||this._currentFormat===cf.ShortHEX){colorString=this._hexValue.textContent;}else{var format=this._currentFormat===cf.RGB?"rgba":"hsla";var values=this._textValues.map(elementValue).join(",");colorString=String.sprintf("%s(%s)",format,values);}
var color=WebInspector.Color.parse(colorString);if(!color)
return;this._hsv=color.hsva();if(this._currentFormat===cf.HEX||this._currentFormat===cf.ShortHEX)
this._currentFormat=color.canBeShortHex()?cf.ShortHEX:cf.HEX;this._dispatchChangeEvent();this._updateHelperLocations();this._updateUI();},wasShown:function()
{this._hueAlphaWidth=this._hueElement.offsetWidth;this.slideHelperWidth=this._hueSlider.offsetWidth/2;this.dragWidth=this._draggerElement.offsetWidth;this.dragHeight=this._draggerElement.offsetHeight;this._dragHelperElementHeight=this._dragHelperElement.offsetHeight/2;this._update();this._toggleColorPicker(true);},willHide:function()
{this._toggleColorPicker(false);WebInspector.targetManager.removeModelListener(WebInspector.ResourceTreeModel,WebInspector.ResourceTreeModel.EventTypes.ColorPicked,this._colorPicked,this);},_toggleColorPicker:function(enabled,event)
{if(enabled===undefined)
enabled=!this._colorPickerButton.toggled();this._colorPickerButton.setToggled(enabled);for(var target of WebInspector.targetManager.targets())
target.pageAgent().setColorPickerEnabled(enabled);},_colorPicked:function(event)
{var rgbColor=(event.data);var rgba=[rgbColor.r,rgbColor.g,rgbColor.b,(rgbColor.a/2.55|0)/100];var color=WebInspector.Color.fromRGBA(rgba);this.setColor(color);this._dispatchChangeEvent();InspectorFrontendHost.bringToFront();},__proto__:WebInspector.VBox.prototype};WebInspector.ElementsBreadcrumbs=function()
{WebInspector.HBox.call(this,true);this.registerRequiredCSS("elements/breadcrumbs.css");this.crumbsElement=this.contentElement.createChild("div","crumbs");this.crumbsElement.addEventListener("mousemove",this._mouseMovedInCrumbs.bind(this),false);this.crumbsElement.addEventListener("mouseleave",this._mouseMovedOutOfCrumbs.bind(this),false);this._nodeSymbol=Symbol("node");}
WebInspector.ElementsBreadcrumbs.Events={NodeSelected:"NodeSelected"}
WebInspector.ElementsBreadcrumbs.prototype={wasShown:function()
{this.update();},updateNodes:function(nodes)
{if(!nodes.length)
return;var crumbs=this.crumbsElement;for(var crumb=crumbs.firstChild;crumb;crumb=crumb.nextSibling){if(nodes.indexOf(crumb[this._nodeSymbol])!==-1){this.update(true);return;}}},setSelectedNode:function(node)
{this._currentDOMNode=node;this.update();},_mouseMovedInCrumbs:function(event)
{var nodeUnderMouse=event.target;var crumbElement=nodeUnderMouse.enclosingNodeOrSelfWithClass("crumb");var node=(crumbElement?crumbElement[this._nodeSymbol]:null);if(node)
node.highlight();},_mouseMovedOutOfCrumbs:function(event)
{if(this._currentDOMNode)
WebInspector.DOMModel.hideDOMNodeHighlight();},update:function(force)
{if(!this.isShowing())
return;var currentDOMNode=this._currentDOMNode;var crumbs=this.crumbsElement;var handled=false;var crumb=crumbs.firstChild;while(crumb){if(crumb[this._nodeSymbol]===currentDOMNode){crumb.classList.add("selected");handled=true;}else{crumb.classList.remove("selected");}
crumb=crumb.nextSibling;}
if(handled&&!force){this.updateSizes();return;}
crumbs.removeChildren();var panel=this;function selectCrumb(event)
{event.preventDefault();var crumb=(event.currentTarget);if(!crumb.classList.contains("collapsed")){this.dispatchEventToListeners(WebInspector.ElementsBreadcrumbs.Events.NodeSelected,crumb[this._nodeSymbol]);return;}
if(crumb===panel.crumbsElement.firstChild){var currentCrumb=crumb;while(currentCrumb){var hidden=currentCrumb.classList.contains("hidden");var collapsed=currentCrumb.classList.contains("collapsed");if(!hidden&&!collapsed)
break;crumb=currentCrumb;currentCrumb=currentCrumb.nextSiblingElement;}}
this.updateSizes(crumb);}
var boundSelectCrumb=selectCrumb.bind(this);for(var current=currentDOMNode;current;current=current.parentNode){if(current.nodeType()===Node.DOCUMENT_NODE)
continue;crumb=createElementWithClass("span","crumb");crumb[this._nodeSymbol]=current;crumb.addEventListener("mousedown",boundSelectCrumb,false);var crumbTitle="";switch(current.nodeType()){case Node.ELEMENT_NODE:if(current.pseudoType())
crumbTitle="::"+current.pseudoType();else
WebInspector.DOMPresentationUtils.decorateNodeLabel(current,crumb);break;case Node.TEXT_NODE:crumbTitle=WebInspector.UIString("(text)");break;case Node.COMMENT_NODE:crumbTitle="<!-->";break;case Node.DOCUMENT_TYPE_NODE:crumbTitle="<!DOCTYPE>";break;case Node.DOCUMENT_FRAGMENT_NODE:crumbTitle=current.shadowRootType()?"#shadow-root":current.nodeNameInCorrectCase();break;default:crumbTitle=current.nodeNameInCorrectCase();}
if(!crumb.childNodes.length){var nameElement=createElement("span");nameElement.textContent=crumbTitle;crumb.appendChild(nameElement);crumb.title=crumbTitle;}
if(current===currentDOMNode)
crumb.classList.add("selected");crumbs.insertBefore(crumb,crumbs.firstChild);}
this.updateSizes();},updateSizes:function(focusedCrumb)
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
collapsedRun=collapsed;if(newEndNeeded){newEndNeeded=false;crumb.classList.add("end");}}else{collapsedRun=true;}
crumb=crumb.nextSibling;}
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
return;collapse(selectedCrumb,true);},__proto__:WebInspector.HBox.prototype};WebInspector.ElementsSidebarPane=function(title)
{WebInspector.SidebarPane.call(this,title);this._node=null;this._updateController=new WebInspector.ElementsSidebarPane._UpdateController(this,this.doUpdate.bind(this));}
WebInspector.ElementsSidebarPane.prototype={node:function()
{return this._node;},setNode:function(node)
{this._node=node;this.update();},doUpdate:function(finishedCallback)
{finishedCallback();},update:function()
{this._updateController.update();},wasShown:function()
{WebInspector.SidebarPane.prototype.wasShown.call(this);this._updateController.viewWasShown();},__proto__:WebInspector.SidebarPane.prototype}
WebInspector.ElementsSidebarPane._UpdateController=function(view,doUpdate)
{this._view=view;this._updateThrottler=new WebInspector.Throttler(100);this._updateWhenVisible=false;this._doUpdate=doUpdate;}
WebInspector.ElementsSidebarPane._UpdateController.prototype={update:function()
{this._updateWhenVisible=!this._view.isShowing();if(this._updateWhenVisible)
return;this._updateThrottler.schedule(innerUpdate.bind(this));function innerUpdate(finishedCallback)
{if(this._view.isShowing())
this._doUpdate.call(null,finishedCallback);else
finishedCallback();}},viewWasShown:function()
{if(this._updateWhenVisible)
this.update();}}
WebInspector.ThrottledElementsSidebarView=function()
{WebInspector.Widget.call(this);this._node=null;this._updateController=new WebInspector.ElementsSidebarPane._UpdateController(this,this.doUpdate.bind(this));}
WebInspector.ThrottledElementsSidebarView.prototype={node:function()
{return this._node;},setNode:function(node)
{this._node=node;this.update();},doUpdate:function(finishedCallback)
{finishedCallback();},update:function()
{this._updateController.update();},wasShown:function()
{WebInspector.Widget.prototype.wasShown.call(this);this._updateController.viewWasShown();},view:function()
{return this;},__proto__:WebInspector.Widget.prototype};WebInspector.ElementsSidebarView=function()
{}
WebInspector.ElementsSidebarView.prototype={setNode:function(node){},view:function(){}}
WebInspector.ElementsSidebarViewWrapperPane=function(title,elementsSidebarView)
{WebInspector.SidebarPane.call(this,title);this._elementsSidebarView=elementsSidebarView;this._elementsSidebarView.view().show(this.element);}
WebInspector.ElementsSidebarViewWrapperPane.prototype={setNode:function(node)
{this._elementsSidebarView.setNode(node);},__proto__:WebInspector.SidebarPane.prototype};WebInspector.ElementsTreeElement=function(node,elementCloseTag)
{TreeElement.call(this);this._node=node;this._elementCloseTag=elementCloseTag;if(this._node.nodeType()==Node.ELEMENT_NODE&&!elementCloseTag)
this._canAddAttributes=true;this._searchQuery=null;this._expandedChildrenLimit=WebInspector.ElementsTreeElement.InitialChildrenLimit;}
WebInspector.ElementsTreeElement.InitialChildrenLimit=500;WebInspector.ElementsTreeElement.ForbiddenClosingTagElements=["area","base","basefont","br","canvas","col","command","embed","frame","hr","img","input","keygen","link","menuitem","meta","param","source","track","wbr"].keySet();WebInspector.ElementsTreeElement.EditTagBlacklist=["html","head","body"].keySet();WebInspector.ElementsTreeElement.animateOnDOMUpdate=function(treeElement)
{var tagName=treeElement.listItemElement.querySelector(".webkit-html-tag-name");WebInspector.runCSSAnimationOnce(tagName||treeElement.listItemElement,"dom-update-highlight");}
WebInspector.ElementsTreeElement.visibleShadowRoots=function(node)
{var roots=node.shadowRoots();if(roots.length&&!WebInspector.moduleSetting("showUAShadowDOM").get())
roots=roots.filter(filter);function filter(root)
{return root.shadowRootType()===WebInspector.DOMNode.ShadowRootTypes.Author;}
return roots;}
WebInspector.ElementsTreeElement.canShowInlineText=function(node)
{if(node.importedDocument()||node.templateContent()||WebInspector.ElementsTreeElement.visibleShadowRoots(node).length||node.hasPseudoElements())
return false;if(node.nodeType()!==Node.ELEMENT_NODE)
return false;if(!node.firstChild||node.firstChild!==node.lastChild||node.firstChild.nodeType()!==Node.TEXT_NODE)
return false;var textChild=node.firstChild;var maxInlineTextChildLength=80;if(textChild.nodeValue().length<maxInlineTextChildLength)
return true;return false;}
WebInspector.ElementsTreeElement.prototype={isClosingTag:function()
{return!!this._elementCloseTag;},node:function()
{return this._node;},isEditing:function()
{return!!this._editing;},highlightSearchResults:function(searchQuery)
{if(this._searchQuery!==searchQuery)
this._hideSearchHighlight();this._searchQuery=searchQuery;this._searchHighlightsVisible=true;this.updateTitle(null,true);},hideSearchHighlights:function()
{delete this._searchHighlightsVisible;this._hideSearchHighlight();},_hideSearchHighlight:function()
{if(!this._highlightResult)
return;function updateEntryHide(entry)
{switch(entry.type){case"added":entry.node.remove();break;case"changed":entry.node.textContent=entry.oldText;break;}}
for(var i=(this._highlightResult.length-1);i>=0;--i)
updateEntryHide(this._highlightResult[i]);delete this._highlightResult;},setInClipboard:function(inClipboard)
{if(this._inClipboard===inClipboard)
return;this._inClipboard=inClipboard;this.listItemElement.classList.toggle("in-clipboard",inClipboard);},get hovered()
{return this._hovered;},set hovered(x)
{if(this._hovered===x)
return;this._hovered=x;if(this.listItemElement){if(x){this.updateSelection();this.listItemElement.classList.add("hovered");}else{this.listItemElement.classList.remove("hovered");}}},expandedChildrenLimit:function()
{return this._expandedChildrenLimit;},setExpandedChildrenLimit:function(expandedChildrenLimit)
{this._expandedChildrenLimit=expandedChildrenLimit;},updateSelection:function()
{var listItemElement=this.listItemElement;if(!listItemElement)
return;if(!this.selectionElement){this.selectionElement=createElement("div");this.selectionElement.className="selection selected";listItemElement.insertBefore(this.selectionElement,listItemElement.firstChild);}
this.selectionElement.style.height=listItemElement.offsetHeight+"px";},onbind:function()
{if(!this._elementCloseTag)
this._node[this.treeOutline.treeElementSymbol()]=this;},onunbind:function()
{if(this._node[this.treeOutline.treeElementSymbol()]===this)
this._node[this.treeOutline.treeElementSymbol()]=null;},onattach:function()
{if(this._hovered){this.updateSelection();this.listItemElement.classList.add("hovered");}
this.updateTitle();this._preventFollowingLinksOnDoubleClick();this.listItemElement.draggable=true;},_preventFollowingLinksOnDoubleClick:function()
{var links=this.listItemElement.querySelectorAll("li .webkit-html-tag > .webkit-html-attribute > .webkit-html-external-link, li .webkit-html-tag > .webkit-html-attribute > .webkit-html-resource-link");if(!links)
return;for(var i=0;i<links.length;++i)
links[i].preventFollowOnDoubleClick=true;},onpopulate:function()
{this.populated=true;this.treeOutline.populateTreeElement(this);},expandRecursively:function()
{function callback()
{TreeElement.prototype.expandRecursively.call(this,Number.MAX_VALUE);}
this._node.getSubtree(-1,callback.bind(this));},onexpand:function()
{if(this._elementCloseTag)
return;this.updateTitle();this.treeOutline.updateSelection();},oncollapse:function()
{if(this._elementCloseTag)
return;this.updateTitle();this.treeOutline.updateSelection();},onreveal:function()
{if(this.listItemElement){var tagSpans=this.listItemElement.getElementsByClassName("webkit-html-tag-name");if(tagSpans.length)
tagSpans[0].scrollIntoViewIfNeeded(true);else
this.listItemElement.scrollIntoViewIfNeeded(true);}},select:function(omitFocus,selectedByUser)
{if(this._editing)
return false;if(selectedByUser&&this.treeOutline.handlePickNode(this.title,this._node))
return true;return TreeElement.prototype.select.call(this,omitFocus,selectedByUser);},onselect:function(selectedByUser)
{this.treeOutline.suppressRevealAndSelect=true;this.treeOutline.selectDOMNode(this._node,selectedByUser);if(selectedByUser)
this._node.highlight();this.updateSelection();this.treeOutline.suppressRevealAndSelect=false;return true;},ondelete:function()
{var startTagTreeElement=this.treeOutline.findTreeElement(this._node);startTagTreeElement?startTagTreeElement.remove():this.remove();return true;},onenter:function()
{if(this._editing)
return false;this._startEditing();return true;},selectOnMouseDown:function(event)
{TreeElement.prototype.selectOnMouseDown.call(this,event);if(this._editing)
return;if(event.detail>=2)
event.preventDefault();},ondblclick:function(event)
{if(this._editing||this._elementCloseTag)
return false;if(this._startEditingTarget((event.target)))
return false;if(this.isExpandable()&&!this.expanded)
this.expand();return false;},hasEditableNode:function()
{return!this._node.isShadowRoot()&&!this._node.ancestorUserAgentShadowRoot();},_insertInLastAttributePosition:function(tag,node)
{if(tag.getElementsByClassName("webkit-html-attribute").length>0)
tag.insertBefore(node,tag.lastChild);else{var nodeName=tag.textContent.match(/^<(.*?)>$/)[1];tag.textContent='';tag.createTextChild('<'+nodeName);tag.appendChild(node);tag.createTextChild('>');}
this.updateSelection();},_startEditingTarget:function(eventTarget)
{if(this.treeOutline.selectedDOMNode()!=this._node)
return false;if(this._node.nodeType()!=Node.ELEMENT_NODE&&this._node.nodeType()!=Node.TEXT_NODE)
return false;if(this.treeOutline.pickNodeMode())
return false;var textNode=eventTarget.enclosingNodeOrSelfWithClass("webkit-html-text-node");if(textNode)
return this._startEditingTextNode(textNode);var attribute=eventTarget.enclosingNodeOrSelfWithClass("webkit-html-attribute");if(attribute)
return this._startEditingAttribute(attribute,eventTarget);var tagName=eventTarget.enclosingNodeOrSelfWithClass("webkit-html-tag-name");if(tagName)
return this._startEditingTagName(tagName);var newAttribute=eventTarget.enclosingNodeOrSelfWithClass("add-attribute");if(newAttribute)
return this._addNewAttribute();return false;},populateTagContextMenu:function(contextMenu,event)
{var treeElement=this._elementCloseTag?this.treeOutline.findTreeElement(this._node):this;contextMenu.appendItem(WebInspector.UIString.capitalize("Add ^attribute"),treeElement._addNewAttribute.bind(treeElement));var attribute=event.target.enclosingNodeOrSelfWithClass("webkit-html-attribute");var newAttribute=event.target.enclosingNodeOrSelfWithClass("add-attribute");if(attribute&&!newAttribute)
contextMenu.appendItem(WebInspector.UIString.capitalize("Edit ^attribute"),this._startEditingAttribute.bind(this,attribute,event.target));contextMenu.appendSeparator();var pseudoSubMenu=contextMenu.appendSubMenuItem(WebInspector.UIString.capitalize("Force ^element ^state"));this._populateForcedPseudoStateItems(pseudoSubMenu,treeElement.node());contextMenu.appendSeparator();this.populateNodeContextMenu(contextMenu);this.populateScrollIntoView(contextMenu);},populateScrollIntoView:function(contextMenu)
{contextMenu.appendSeparator();contextMenu.appendItem(WebInspector.UIString.capitalize("Scroll into ^view"),this._scrollIntoView.bind(this));},_populateForcedPseudoStateItems:function(subMenu,node)
{const pseudoClasses=["active","hover","focus","visited"];var forcedPseudoState=node.getUserProperty(WebInspector.CSSStyleModel.PseudoStatePropertyName)||[];for(var i=0;i<pseudoClasses.length;++i){var pseudoClassForced=forcedPseudoState.indexOf(pseudoClasses[i])>=0;subMenu.appendCheckboxItem(":"+pseudoClasses[i],setPseudoStateCallback.bind(null,pseudoClasses[i],!pseudoClassForced),pseudoClassForced,false);}
function setPseudoStateCallback(pseudoState,enabled)
{WebInspector.CSSStyleModel.fromNode(node).forcePseudoState(node,pseudoState,enabled);}},populateTextContextMenu:function(contextMenu,textNode)
{if(!this._editing)
contextMenu.appendItem(WebInspector.UIString.capitalize("Edit ^text"),this._startEditingTextNode.bind(this,textNode));this.populateNodeContextMenu(contextMenu);},populateNodeContextMenu:function(contextMenu)
{var openTagElement=this._node[this.treeOutline.treeElementSymbol()]||this;var isEditable=this.hasEditableNode();if(isEditable&&!this._editing)
contextMenu.appendItem(WebInspector.UIString("Edit as HTML"),openTagElement.toggleEditAsHTML.bind(openTagElement));var isShadowRoot=this._node.isShadowRoot();if(this._node.nodeType()===Node.ELEMENT_NODE)
contextMenu.appendItem(WebInspector.UIString.capitalize("Copy CSS ^path"),this._copyCSSPath.bind(this));if(!isShadowRoot)
contextMenu.appendItem(WebInspector.UIString("Copy XPath"),this._copyXPath.bind(this));if(!isShadowRoot){var treeOutline=this.treeOutline;contextMenu.appendSeparator();contextMenu.appendItem(WebInspector.UIString("Cut"),treeOutline.performCopyOrCut.bind(treeOutline,true,this._node),!this.hasEditableNode());contextMenu.appendItem(WebInspector.UIString("Copy"),treeOutline.performCopyOrCut.bind(treeOutline,false,this._node));contextMenu.appendItem(WebInspector.UIString("Paste"),treeOutline.pasteNode.bind(treeOutline,this._node),!treeOutline.canPaste(this._node));}
if(isEditable)
contextMenu.appendItem(WebInspector.UIString("Delete"),this.remove.bind(this));contextMenu.appendSeparator();},_startEditing:function()
{if(this.treeOutline.selectedDOMNode()!==this._node)
return;var listItem=this._listItemNode;if(this._canAddAttributes){var attribute=listItem.getElementsByClassName("webkit-html-attribute")[0];if(attribute)
return this._startEditingAttribute(attribute,attribute.getElementsByClassName("webkit-html-attribute-value")[0]);return this._addNewAttribute();}
if(this._node.nodeType()===Node.TEXT_NODE){var textNode=listItem.getElementsByClassName("webkit-html-text-node")[0];if(textNode)
return this._startEditingTextNode(textNode);return;}},_addNewAttribute:function()
{var container=createElement("span");this._buildAttributeDOM(container," ","",null);var attr=container.firstElementChild;attr.style.marginLeft="2px";attr.style.marginRight="2px";var tag=this.listItemElement.getElementsByClassName("webkit-html-tag")[0];this._insertInLastAttributePosition(tag,attr);attr.scrollIntoViewIfNeeded(true);return this._startEditingAttribute(attr,attr);},_triggerEditAttribute:function(attributeName)
{var attributeElements=this.listItemElement.getElementsByClassName("webkit-html-attribute-name");for(var i=0,len=attributeElements.length;i<len;++i){if(attributeElements[i].textContent===attributeName){for(var elem=attributeElements[i].nextSibling;elem;elem=elem.nextSibling){if(elem.nodeType!==Node.ELEMENT_NODE)
continue;if(elem.classList.contains("webkit-html-attribute-value"))
return this._startEditingAttribute(elem.parentNode,elem);}}}},_startEditingAttribute:function(attribute,elementForSelection)
{console.assert(this.listItemElement.isAncestor(attribute));if(WebInspector.isBeingEdited(attribute))
return true;var attributeNameElement=attribute.getElementsByClassName("webkit-html-attribute-name")[0];if(!attributeNameElement)
return false;var attributeName=attributeNameElement.textContent;var attributeValueElement=attribute.getElementsByClassName("webkit-html-attribute-value")[0];elementForSelection=attributeValueElement.isAncestor(elementForSelection)?attributeValueElement:elementForSelection;function removeZeroWidthSpaceRecursive(node)
{if(node.nodeType===Node.TEXT_NODE){node.nodeValue=node.nodeValue.replace(/\u200B/g,"");return;}
if(node.nodeType!==Node.ELEMENT_NODE)
return;for(var child=node.firstChild;child;child=child.nextSibling)
removeZeroWidthSpaceRecursive(child);}
var attributeValue=attributeName&&attributeValueElement?this._node.getAttribute(attributeName):undefined;if(attributeValue!==undefined)
attributeValueElement.setTextContentTruncatedIfNeeded(attributeValue,WebInspector.UIString("<value is too large to edit>"));removeZeroWidthSpaceRecursive(attribute);var config=new WebInspector.InplaceEditor.Config(this._attributeEditingCommitted.bind(this),this._editingCancelled.bind(this),attributeName);function handleKeyDownEvents(event)
{var isMetaOrCtrl=WebInspector.isMac()?event.metaKey&&!event.shiftKey&&!event.ctrlKey&&!event.altKey:event.ctrlKey&&!event.shiftKey&&!event.metaKey&&!event.altKey;if(isEnterKey(event)&&(event.isMetaOrCtrlForTest||!config.multiline||isMetaOrCtrl))
return"commit";else if(event.keyCode===WebInspector.KeyboardShortcut.Keys.Esc.code||event.keyIdentifier==="U+001B")
return"cancel";else if(event.keyIdentifier==="U+0009")
return"move-"+(event.shiftKey?"backward":"forward");else{WebInspector.handleElementValueModifications(event,attribute);return"";}}
config.customFinishHandler=handleKeyDownEvents;this._editing=WebInspector.InplaceEditor.startEditing(attribute,config);this.listItemElement.getComponentSelection().setBaseAndExtent(elementForSelection,0,elementForSelection,1);return true;},_startEditingTextNode:function(textNodeElement)
{if(WebInspector.isBeingEdited(textNodeElement))
return true;var textNode=this._node;if(textNode.nodeType()===Node.ELEMENT_NODE&&textNode.firstChild)
textNode=textNode.firstChild;var container=textNodeElement.enclosingNodeOrSelfWithClass("webkit-html-text-node");if(container)
container.textContent=textNode.nodeValue();var config=new WebInspector.InplaceEditor.Config(this._textNodeEditingCommitted.bind(this,textNode),this._editingCancelled.bind(this));this._editing=WebInspector.InplaceEditor.startEditing(textNodeElement,config);this.listItemElement.getComponentSelection().setBaseAndExtent(textNodeElement,0,textNodeElement,1);return true;},_startEditingTagName:function(tagNameElement)
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
tagNameElement.addEventListener('keyup',keyupListener,false);var config=new WebInspector.InplaceEditor.Config(editingComitted.bind(this),editingCancelled.bind(this),tagName);this._editing=WebInspector.InplaceEditor.startEditing(tagNameElement,config);this.listItemElement.getComponentSelection().setBaseAndExtent(tagNameElement,0,tagNameElement,1);return true;},_startEditingAsHTML:function(commitCallback,error,initialValue)
{if(error)
return;if(this._editing)
return;function consume(event)
{if(event.eventPhase===Event.AT_TARGET)
event.consume(true);}
initialValue=this._convertWhitespaceToEntities(initialValue).text;this._htmlEditElement=createElement("div");this._htmlEditElement.className="source-code elements-tree-editor";var child=this.listItemElement.firstChild;while(child){child.style.display="none";child=child.nextSibling;}
if(this._childrenListNode)
this._childrenListNode.style.display="none";this.listItemElement.appendChild(this._htmlEditElement);this.treeOutline.element.addEventListener("mousedown",consume,false);this.updateSelection();function commit(element,newValue)
{commitCallback(initialValue,newValue);dispose.call(this);}
function dispose()
{delete this._editing;this.treeOutline.setMultilineEditing(null);this.listItemElement.removeChild(this._htmlEditElement);delete this._htmlEditElement;if(this._childrenListNode)
this._childrenListNode.style.removeProperty("display");var child=this.listItemElement.firstChild;while(child){child.style.removeProperty("display");child=child.nextSibling;}
this.treeOutline.element.removeEventListener("mousedown",consume,false);this.updateSelection();this.treeOutline.focus();}
var config=new WebInspector.InplaceEditor.Config(commit.bind(this),dispose.bind(this));config.setMultilineOptions(initialValue,{name:"xml",htmlMode:true},"web-inspector-html",WebInspector.moduleSetting("domWordWrap").get(),true);WebInspector.InplaceEditor.startMultilineEditing(this._htmlEditElement,config).then(markAsBeingEdited.bind(this));function markAsBeingEdited(controller)
{this._editing=(controller);this._editing.setWidth(this.treeOutline.visibleWidth());this.treeOutline.setMultilineEditing(this._editing);}},_attributeEditingCommitted:function(element,newText,oldText,attributeName,moveDirection)
{delete this._editing;var treeOutline=this.treeOutline;function moveToNextAttributeIfNeeded(error)
{if(error)
this._editingCancelled(element,attributeName);if(!moveDirection)
return;treeOutline.runPendingUpdates();var attributes=this._node.attributes();for(var i=0;i<attributes.length;++i){if(attributes[i].name!==attributeName)
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
if((attributeName.trim()||newText.trim())&&oldText!==newText){this._node.setAttribute(attributeName,newText,moveToNextAttributeIfNeeded.bind(this));return;}
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
var newTreeItem=treeOutline.selectNodeAfterEdit(wasExpanded,error,nodeId);moveToNextAttributeIfNeeded.call(newTreeItem);}
this._node.setNodeName(newText,changeTagNameCallback);},_textNodeEditingCommitted:function(textNode,element,newText)
{delete this._editing;function callback()
{this.updateTitle();}
textNode.setNodeValue(newText,callback.bind(this));},_editingCancelled:function(element,context)
{delete this._editing;this.updateTitle();},_distinctClosingTagElement:function()
{if(this.expanded){var closers=this._childrenListNode.querySelectorAll(".close");return closers[closers.length-1];}
var tags=this.listItemElement.getElementsByClassName("webkit-html-tag");return(tags.length===1?null:tags[tags.length-1]);},updateTitle:function(updateRecord,onlySearchQueryChanged)
{if(this._editing)
return;if(onlySearchQueryChanged){this._hideSearchHighlight();}else{var nodeInfo=this._nodeTitleInfo(updateRecord||null);if(this._node.nodeType()===Node.DOCUMENT_FRAGMENT_NODE&&this._node.isInShadowTree()&&this._node.shadowRootType()){this.childrenListElement.classList.add("shadow-root");var depth=4;for(var node=this._node;depth&&node;node=node.parentNode){if(node.nodeType()===Node.DOCUMENT_FRAGMENT_NODE)
depth--;}
if(!depth)
this.childrenListElement.classList.add("shadow-root-deep");else
this.childrenListElement.classList.add("shadow-root-depth-"+depth);}
var highlightElement=createElement("span");highlightElement.className="highlight";highlightElement.appendChild(nodeInfo);this.title=highlightElement;this._updateDecorations();delete this._highlightResult;}
delete this.selectionElement;if(this.selected)
this.updateSelection();this._preventFollowingLinksOnDoubleClick();this._highlightSearchResults();},_createDecoratorElement:function()
{var node=this._node;var decoratorMessages=[];var parentDecoratorMessages=[];var decorators=this.treeOutline.nodeDecorators();for(var i=0;i<decorators.length;++i){var decorator=decorators[i];var message=decorator.decorate(node);if(message){decoratorMessages.push(message);continue;}
if(this.expanded||this._elementCloseTag)
continue;message=decorator.decorateAncestor(node);if(message)
parentDecoratorMessages.push(message)}
if(!decoratorMessages.length&&!parentDecoratorMessages.length)
return null;var decoratorElement=createElement("div");decoratorElement.classList.add("elements-gutter-decoration");if(!decoratorMessages.length)
decoratorElement.classList.add("elements-has-decorated-children");decoratorElement.title=decoratorMessages.concat(parentDecoratorMessages).join("\n");return decoratorElement;},_updateDecorations:function()
{if(this._decoratorElement)
this._decoratorElement.remove();this._decoratorElement=this._createDecoratorElement();if(this._decoratorElement&&this.listItemElement)
this.listItemElement.insertBefore(this._decoratorElement,this.listItemElement.firstChild);},_buildAttributeDOM:function(parentElement,name,value,updateRecord,forceValue,node)
{var closingPunctuationRegex=/[\/;:\)\]\}]/g;var highlightIndex=0;var highlightCount;var additionalHighlightOffset=0;var result;function replacer(match,replaceOffset){while(highlightIndex<highlightCount&&result.entityRanges[highlightIndex].offset<replaceOffset){result.entityRanges[highlightIndex].offset+=additionalHighlightOffset;++highlightIndex;}
additionalHighlightOffset+=1;return match+"\u200B";}
function setValueWithEntities(element,value)
{result=this._convertWhitespaceToEntities(value);highlightCount=result.entityRanges.length;value=result.text.replace(closingPunctuationRegex,replacer);while(highlightIndex<highlightCount){result.entityRanges[highlightIndex].offset+=additionalHighlightOffset;++highlightIndex;}
element.setTextContentTruncatedIfNeeded(value);WebInspector.highlightRangesWithStyleClass(element,result.entityRanges,"webkit-html-entity-value");}
var hasText=(forceValue||value.length>0);var attrSpanElement=parentElement.createChild("span","webkit-html-attribute");var attrNameElement=attrSpanElement.createChild("span","webkit-html-attribute-name");attrNameElement.textContent=name;if(hasText)
attrSpanElement.createTextChild("=\u200B\"");var attrValueElement=attrSpanElement.createChild("span","webkit-html-attribute-value");if(updateRecord&&updateRecord.isAttributeModified(name))
WebInspector.runCSSAnimationOnce(hasText?attrValueElement:attrNameElement,"dom-update-highlight");function linkifyValue(value)
{var rewrittenHref=node.resolveURL(value);if(rewrittenHref===null){var span=createElement("span");setValueWithEntities.call(this,span,value);return span;}
value=value.replace(closingPunctuationRegex,"$&\u200B");if(value.startsWith("data:"))
value=value.trimMiddle(60);var anchor=WebInspector.linkifyURLAsNode(rewrittenHref,value,"",node.nodeName().toLowerCase()==="a");anchor.preventFollow=true;return anchor;}
if(node&&name==="src"||name==="href"){attrValueElement.appendChild(linkifyValue.call(this,value));}else if(node&&node.nodeName().toLowerCase()==="img"&&name==="srcset"){var sources=value.split(",");for(var i=0;i<sources.length;++i){if(i>0)
attrValueElement.createTextChild(", ");var source=sources[i].trim();var indexOfSpace=source.indexOf(" ");var url=source.substring(0,indexOfSpace);var tail=source.substring(indexOfSpace);attrValueElement.appendChild(linkifyValue.call(this,url));attrValueElement.createTextChild(tail);}}else{setValueWithEntities.call(this,attrValueElement,value);}
if(hasText)
attrSpanElement.createTextChild("\"");},_buildPseudoElementDOM:function(parentElement,pseudoElementName)
{var pseudoElement=parentElement.createChild("span","webkit-html-pseudo-element");pseudoElement.textContent="::"+pseudoElementName;parentElement.createTextChild("\u200B");},_buildTagDOM:function(parentElement,tagName,isClosingTag,isDistinctTreeElement,updateRecord)
{var node=this._node;var classes=["webkit-html-tag"];if(isClosingTag&&isDistinctTreeElement)
classes.push("close");var tagElement=parentElement.createChild("span",classes.join(" "));tagElement.createTextChild("<");var tagNameElement=tagElement.createChild("span",isClosingTag?"":"webkit-html-tag-name");tagNameElement.textContent=(isClosingTag?"/":"")+tagName;if(!isClosingTag){if(node.hasAttributes()){var attributes=node.attributes();for(var i=0;i<attributes.length;++i){var attr=attributes[i];tagElement.createTextChild(" ");this._buildAttributeDOM(tagElement,attr.name,attr.value,updateRecord,false,node);}}
if(updateRecord){var hasUpdates=updateRecord.hasRemovedAttributes()||updateRecord.hasRemovedChildren();hasUpdates|=!this.expanded&&updateRecord.hasChangedChildren();if(hasUpdates)
WebInspector.runCSSAnimationOnce(tagNameElement,"dom-update-highlight");}}
tagElement.createTextChild(">");parentElement.createTextChild("\u200B");},_convertWhitespaceToEntities:function(text)
{var result="";var lastIndexAfterEntity=0;var entityRanges=[];var charToEntity=WebInspector.ElementsTreeOutline.MappedCharToEntity;for(var i=0,size=text.length;i<size;++i){var char=text.charAt(i);if(charToEntity[char]){result+=text.substring(lastIndexAfterEntity,i);var entityValue="&"+charToEntity[char]+";";entityRanges.push({offset:result.length,length:entityValue.length});result+=entityValue;lastIndexAfterEntity=i+1;}}
if(result)
result+=text.substring(lastIndexAfterEntity);return{text:result||text,entityRanges:entityRanges};},_nodeTitleInfo:function(updateRecord)
{var node=this._node;var titleDOM=createDocumentFragment();switch(node.nodeType()){case Node.ATTRIBUTE_NODE:this._buildAttributeDOM(titleDOM,(node.name),(node.value),updateRecord,true);break;case Node.ELEMENT_NODE:var pseudoType=node.pseudoType();if(pseudoType){this._buildPseudoElementDOM(titleDOM,pseudoType);break;}
var tagName=node.nodeNameInCorrectCase();if(this._elementCloseTag){this._buildTagDOM(titleDOM,tagName,true,true,updateRecord);break;}
this._buildTagDOM(titleDOM,tagName,false,false,updateRecord);if(this.isExpandable()){if(!this.expanded){var textNodeElement=titleDOM.createChild("span","webkit-html-text-node bogus");textNodeElement.textContent="\u2026";titleDOM.createTextChild("\u200B");this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);}
break;}
if(WebInspector.ElementsTreeElement.canShowInlineText(node)){var textNodeElement=titleDOM.createChild("span","webkit-html-text-node");var result=this._convertWhitespaceToEntities(node.firstChild.nodeValue());textNodeElement.textContent=result.text;WebInspector.highlightRangesWithStyleClass(textNodeElement,result.entityRanges,"webkit-html-entity-value");titleDOM.createTextChild("\u200B");this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);if(updateRecord&&updateRecord.hasChangedChildren())
WebInspector.runCSSAnimationOnce(textNodeElement,"dom-update-highlight");if(updateRecord&&updateRecord.isCharDataModified())
WebInspector.runCSSAnimationOnce(textNodeElement,"dom-update-highlight");break;}
if(this.treeOutline.isXMLMimeType||!WebInspector.ElementsTreeElement.ForbiddenClosingTagElements[tagName])
this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);break;case Node.TEXT_NODE:if(node.parentNode&&node.parentNode.nodeName().toLowerCase()==="script"){var newNode=titleDOM.createChild("span","webkit-html-text-node webkit-html-js-node");newNode.textContent=node.nodeValue();var javascriptSyntaxHighlighter=new WebInspector.DOMSyntaxHighlighter("text/javascript",true);javascriptSyntaxHighlighter.syntaxHighlightNode(newNode).then(updateSearchHighlight.bind(this));}else if(node.parentNode&&node.parentNode.nodeName().toLowerCase()==="style"){var newNode=titleDOM.createChild("span","webkit-html-text-node webkit-html-css-node");newNode.textContent=node.nodeValue();var cssSyntaxHighlighter=new WebInspector.DOMSyntaxHighlighter("text/css",true);cssSyntaxHighlighter.syntaxHighlightNode(newNode).then(updateSearchHighlight.bind(this));}else{titleDOM.createTextChild("\"");var textNodeElement=titleDOM.createChild("span","webkit-html-text-node");var result=this._convertWhitespaceToEntities(node.nodeValue());textNodeElement.textContent=result.text;WebInspector.highlightRangesWithStyleClass(textNodeElement,result.entityRanges,"webkit-html-entity-value");titleDOM.createTextChild("\"");if(updateRecord&&updateRecord.isCharDataModified())
WebInspector.runCSSAnimationOnce(textNodeElement,"dom-update-highlight");}
break;case Node.COMMENT_NODE:var commentElement=titleDOM.createChild("span","webkit-html-comment");commentElement.createTextChild("<!--"+node.nodeValue()+"-->");break;case Node.DOCUMENT_TYPE_NODE:var docTypeElement=titleDOM.createChild("span","webkit-html-doctype");docTypeElement.createTextChild("<!DOCTYPE "+node.nodeName());if(node.publicId){docTypeElement.createTextChild(" PUBLIC \""+node.publicId+"\"");if(node.systemId)
docTypeElement.createTextChild(" \""+node.systemId+"\"");}else if(node.systemId)
docTypeElement.createTextChild(" SYSTEM \""+node.systemId+"\"");if(node.internalSubset)
docTypeElement.createTextChild(" ["+node.internalSubset+"]");docTypeElement.createTextChild(">");break;case Node.CDATA_SECTION_NODE:var cdataElement=titleDOM.createChild("span","webkit-html-text-node");cdataElement.createTextChild("<![CDATA["+node.nodeValue()+"]]>");break;case Node.DOCUMENT_FRAGMENT_NODE:var fragmentElement=titleDOM.createChild("span","webkit-html-fragment");fragmentElement.textContent=node.nodeNameInCorrectCase().collapseWhitespace();break;default:titleDOM.createTextChild(node.nodeNameInCorrectCase().collapseWhitespace());}
function updateSearchHighlight()
{delete this._highlightResult;this._highlightSearchResults();}
return titleDOM;},remove:function()
{if(this._node.pseudoType())
return;var parentElement=this.parent;if(!parentElement)
return;if(!this._node.parentNode||this._node.parentNode.nodeType()===Node.DOCUMENT_NODE)
return;this._node.removeNode();},toggleEditAsHTML:function(callback)
{if(this._editing&&this._htmlEditElement&&WebInspector.isBeingEdited(this._htmlEditElement)){this._editing.commit();return;}
function selectNode(error)
{if(callback)
callback(!error);}
function commitChange(initialValue,value)
{if(initialValue!==value)
node.setOuterHTML(value,selectNode);}
var node=this._node;node.getOuterHTML(this._startEditingAsHTML.bind(this,commitChange));},_copyCSSPath:function()
{InspectorFrontendHost.copyText(WebInspector.DOMPresentationUtils.cssPath(this._node,true));},_copyXPath:function()
{InspectorFrontendHost.copyText(WebInspector.DOMPresentationUtils.xPath(this._node,true));},_highlightSearchResults:function()
{if(!this._searchQuery||!this._searchHighlightsVisible)
return;this._hideSearchHighlight();var text=this.listItemElement.textContent;var regexObject=createPlainTextSearchRegex(this._searchQuery,"gi");var match=regexObject.exec(text);var matchRanges=[];while(match){matchRanges.push(new WebInspector.SourceRange(match.index,match[0].length));match=regexObject.exec(text);}
if(!matchRanges.length)
matchRanges.push(new WebInspector.SourceRange(0,text.length));this._highlightResult=[];WebInspector.highlightSearchResults(this.listItemElement,matchRanges,this._highlightResult);},_scrollIntoView:function()
{function scrollIntoViewCallback(object)
{function scrollIntoView()
{this.scrollIntoViewIfNeeded(true);}
if(object)
object.callFunction(scrollIntoView);}
this._node.resolveToObject("",scrollIntoViewCallback);},__proto__:TreeElement.prototype};WebInspector.ElementsTreeOutline=function(domModel,omitRootDOMNode,selectEnabled)
{this._domModel=domModel;this._treeElementSymbol=Symbol("treeElement");var element=createElement("div");this._shadowRoot=element.createShadowRoot();this._shadowRoot.appendChild(WebInspector.Widget.createStyleElement("elements/elementsTreeOutline.css"));var outlineDisclosureElement=this._shadowRoot.createChild("div","elements-disclosure");WebInspector.installComponentRootStyles(outlineDisclosureElement);TreeOutline.call(this);this._element=this.element;this._element.classList.add("elements-tree-outline","source-code");this._element.addEventListener("mousedown",this._onmousedown.bind(this),false);this._element.addEventListener("mousemove",this._onmousemove.bind(this),false);this._element.addEventListener("mouseleave",this._onmouseleave.bind(this),false);this._element.addEventListener("dragstart",this._ondragstart.bind(this),false);this._element.addEventListener("dragover",this._ondragover.bind(this),false);this._element.addEventListener("dragleave",this._ondragleave.bind(this),false);this._element.addEventListener("drop",this._ondrop.bind(this),false);this._element.addEventListener("dragend",this._ondragend.bind(this),false);this._element.addEventListener("keydown",this._onkeydown.bind(this),false);this._element.addEventListener("webkitAnimationEnd",this._onAnimationEnd.bind(this),false);this._element.addEventListener("contextmenu",this._contextMenuEventFired.bind(this),false);outlineDisclosureElement.appendChild(this._element);this.element=element;this._includeRootDOMNode=!omitRootDOMNode;this._selectEnabled=selectEnabled;this._rootDOMNode=null;this._selectedDOMNode=null;this._visible=false;this._pickNodeMode=false;this._createNodeDecorators();this._popoverHelper=new WebInspector.PopoverHelper(this._element,this._getPopoverAnchor.bind(this),this._showPopover.bind(this));this._popoverHelper.setTimeout(0);this._updateRecords=new Map();this._treeElementsBeingUpdated=new Set();}
WebInspector.ElementsTreeOutline.ClipboardData;WebInspector.ElementsTreeOutline.Events={NodePicked:"NodePicked",SelectedNodeChanged:"SelectedNodeChanged",ElementsTreeUpdated:"ElementsTreeUpdated"}
WebInspector.ElementsTreeOutline.MappedCharToEntity={"\u00a0":"nbsp","\u0093":"#147","\u00ad":"shy","\u2002":"ensp","\u2003":"emsp","\u2009":"thinsp","\u200a":"#8202","\u200b":"#8203","\u200c":"zwnj","\u200d":"zwj","\u200e":"lrm","\u200f":"rlm","\u202a":"#8234","\u202b":"#8235","\u202c":"#8236","\u202d":"#8237","\u202e":"#8238","\ufeff":"#65279"}
WebInspector.ElementsTreeOutline.prototype={treeElementSymbol:function()
{return this._treeElementSymbol;},focus:function()
{this._element.focus();},hasFocus:function()
{return this._element===WebInspector.currentFocusElement();},setWordWrap:function(wrap)
{this._element.classList.toggle("elements-tree-nowrap",!wrap);},_onAnimationEnd:function(event)
{event.target.classList.remove("elements-tree-element-pick-node-1");event.target.classList.remove("elements-tree-element-pick-node-2");},pickNodeMode:function()
{return this._pickNodeMode;},setPickNodeMode:function(value)
{this._pickNodeMode=value;this._element.classList.toggle("pick-node-mode",value);},handlePickNode:function(element,node)
{if(!this._pickNodeMode)
return false;this.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.NodePicked,node);var hasRunningAnimation=element.classList.contains("elements-tree-element-pick-node-1")||element.classList.contains("elements-tree-element-pick-node-2");element.classList.toggle("elements-tree-element-pick-node-1");if(hasRunningAnimation)
element.classList.toggle("elements-tree-element-pick-node-2");return true;},domModel:function()
{return this._domModel;},setMultilineEditing:function(multilineEditing)
{this._multilineEditing=multilineEditing;},visibleWidth:function()
{return this._visibleWidth;},setVisibleWidth:function(width)
{this._visibleWidth=width;if(this._multilineEditing)
this._multilineEditing.setWidth(this._visibleWidth);},nodeDecorators:function()
{return this._nodeDecorators;},_createNodeDecorators:function()
{this._nodeDecorators=[];this._nodeDecorators.push(new WebInspector.ElementsTreeOutline.PseudoStateDecorator());},_setClipboardData:function(data)
{if(this._clipboardNodeData){var treeElement=this.findTreeElement(this._clipboardNodeData.node);if(treeElement)
treeElement.setInClipboard(false);delete this._clipboardNodeData;}
if(data){var treeElement=this.findTreeElement(data.node);if(treeElement)
treeElement.setInClipboard(true);this._clipboardNodeData=data;}},resetClipboardIfNeeded:function(removedNode)
{if(this._clipboardNodeData&&this._clipboardNodeData.node===removedNode)
this._setClipboardData(null);},handleCopyOrCutKeyboardEvent:function(isCut,event)
{this._setClipboardData(null);if(!event.target.isComponentSelectionCollapsed())
return;if(WebInspector.isEditing())
return;var targetNode=this.selectedDOMNode();if(!targetNode)
return;event.clipboardData.clearData();event.preventDefault();this.performCopyOrCut(isCut,targetNode);},performCopyOrCut:function(isCut,node)
{if(isCut&&(node.isShadowRoot()||node.ancestorUserAgentShadowRoot()))
return;node.copyNode();this._setClipboardData({node:node,isCut:isCut});},canPaste:function(targetNode)
{if(targetNode.isShadowRoot()||targetNode.ancestorUserAgentShadowRoot())
return false;if(!this._clipboardNodeData)
return false;var node=this._clipboardNodeData.node;if(this._clipboardNodeData.isCut&&(node===targetNode||node.isAncestor(targetNode)))
return false;if(targetNode.target()!==node.target())
return false;return true;},pasteNode:function(targetNode)
{if(this.canPaste(targetNode))
this._performPaste(targetNode);},handlePasteKeyboardEvent:function(event)
{if(WebInspector.isEditing())
return;var targetNode=this.selectedDOMNode();if(!targetNode||!this.canPaste(targetNode))
return;event.preventDefault();this._performPaste(targetNode);},_performPaste:function(targetNode)
{if(this._clipboardNodeData.isCut){this._clipboardNodeData.node.moveTo(targetNode,null,expandCallback.bind(this));this._setClipboardData(null);}else{this._clipboardNodeData.node.copyTo(targetNode,null,expandCallback.bind(this));}
function expandCallback(error,nodeId)
{if(error)
return;var pastedNode=this._domModel.nodeForId(nodeId);if(!pastedNode)
return;this.selectDOMNode(pastedNode);}},setVisible:function(visible)
{this._visible=visible;if(!this._visible){this._popoverHelper.hidePopover();if(this._multilineEditing)
this._multilineEditing.cancel();return;}
this.runPendingUpdates();if(this._selectedDOMNode)
this._revealAndSelectNode(this._selectedDOMNode,false);},get rootDOMNode()
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
return false;return treeElement.isEditing()||false;},update:function()
{var selectedTreeElement=this.selectedTreeElement;if(!(selectedTreeElement instanceof WebInspector.ElementsTreeElement))
selectedTreeElement=null;var selectedNode=selectedTreeElement?selectedTreeElement.node():null;this.removeChildren();if(!this.rootDOMNode)
return;var treeElement;if(this._includeRootDOMNode){treeElement=this._createElementTreeElement(this.rootDOMNode);this.appendChild(treeElement);}else{var node=this.rootDOMNode.firstChild;while(node){treeElement=this._createElementTreeElement(node);this.appendChild(treeElement);node=node.nextSibling;}}
if(selectedNode)
this._revealAndSelectNode(selectedNode,true);},updateSelection:function()
{if(!this.selectedTreeElement)
return;var element=this.selectedTreeElement;element.updateSelection();},updateOpenCloseTags:function(node)
{var treeElement=this.findTreeElement(node);if(treeElement)
treeElement.updateTitle(this._updateRecordForHighlight(node));var closingTagElement=treeElement.lastChild();if(closingTagElement&&closingTagElement.isClosingTag())
closingTagElement.updateTitle(this._updateRecordForHighlight(node));},_selectedNodeChanged:function()
{this.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged,this._selectedDOMNode);},_fireElementsTreeUpdated:function(nodes)
{this.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.ElementsTreeUpdated,nodes);},findTreeElement:function(node)
{var treeElement=this._lookUpTreeElement(node);if(!treeElement&&node.nodeType()===Node.TEXT_NODE){treeElement=this._lookUpTreeElement(node.parentNode);}
return(treeElement);},_lookUpTreeElement:function(node)
{if(!node)
return null;var cachedElement=node[this._treeElementSymbol];if(cachedElement)
return cachedElement;var ancestors=[];for(var currentNode=node.parentNode;currentNode;currentNode=currentNode.parentNode){ancestors.push(currentNode);if(currentNode[this._treeElementSymbol])
break;}
if(!currentNode)
return null;for(var i=ancestors.length-1;i>=0;--i){var treeElement=ancestors[i][this._treeElementSymbol];if(treeElement)
treeElement.onpopulate();}
return node[this._treeElementSymbol];},createTreeElementFor:function(node)
{var treeElement=this.findTreeElement(node);if(treeElement)
return treeElement;if(!node.parentNode)
return null;treeElement=this.createTreeElementFor(node.parentNode);return treeElement?this._showChild(treeElement,node):null;},set suppressRevealAndSelect(x)
{if(this._suppressRevealAndSelect===x)
return;this._suppressRevealAndSelect=x;},_revealAndSelectNode:function(node,omitFocus)
{if(this._suppressRevealAndSelect)
return;if(!this._includeRootDOMNode&&node===this.rootDOMNode&&this.rootDOMNode)
node=this.rootDOMNode.firstChild;if(!node)
return;var treeElement=this.createTreeElementFor(node);if(!treeElement)
return;treeElement.revealAndSelect(omitFocus);},_treeElementFromEvent:function(event)
{var scrollContainer=this.element.parentElement;var x=scrollContainer.totalOffsetLeft()+scrollContainer.offsetWidth-36;var y=event.pageY;var elementUnderMouse=this.treeElementFromPoint(x,y);var elementAboveMouse=this.treeElementFromPoint(x,y-2);var element;if(elementUnderMouse===elementAboveMouse)
element=elementUnderMouse;else
element=this.treeElementFromPoint(x,y+2);return element;},_getPopoverAnchor:function(element,event)
{var anchor=element.enclosingNodeOrSelfWithClass("webkit-html-resource-link");if(!anchor||!anchor.href)
return;return anchor;},_loadDimensionsForNode:function(node,callback)
{if(!node.nodeName()||node.nodeName().toLowerCase()!=="img"){callback();return;}
node.resolveToObject("",resolvedNode);function resolvedNode(object)
{if(!object){callback();return;}
object.callFunctionJSON(features,undefined,callback);object.release();function features()
{return{offsetWidth:this.offsetWidth,offsetHeight:this.offsetHeight,naturalWidth:this.naturalWidth,naturalHeight:this.naturalHeight,currentSrc:this.currentSrc};}}},_showPopover:function(anchor,popover)
{var listItem=anchor.enclosingNodeOrSelfWithNodeName("li");var node=(listItem.treeElement).node();this._loadDimensionsForNode(node,WebInspector.DOMPresentationUtils.buildImagePreviewContents.bind(WebInspector.DOMPresentationUtils,node.target(),anchor.href,true,showPopover));function showPopover(contents)
{if(!contents)
return;popover.setCanShrink(false);popover.showForAnchor(contents,anchor);}},_onmousedown:function(event)
{var element=this._treeElementFromEvent(event);if(!element||element.isEventWithinDisclosureTriangle(event))
return;element.select();},_onmousemove:function(event)
{var element=this._treeElementFromEvent(event);if(element&&this._previousHoveredElement===element)
return;if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
if(element){element.hovered=true;this._previousHoveredElement=element;}
if(element instanceof WebInspector.ElementsTreeElement){this._domModel.highlightDOMNodeWithConfig(element.node().id,{mode:"all",showInfo:!WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)});return;}
if(element instanceof WebInspector.ElementsTreeOutline.ShortcutTreeElement)
this._domModel.highlightDOMNodeWithConfig(undefined,{mode:"all",showInfo:!WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)},element.backendNodeId());},_onmouseleave:function(event)
{if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
WebInspector.DOMModel.hideDOMNodeHighlight();},_ondragstart:function(event)
{if(!event.target.isComponentSelectionCollapsed())
return false;if(event.target.nodeName==="A")
return false;var treeElement=this._treeElementFromEvent(event);if(!this._isValidDragSourceOrTarget(treeElement))
return false;if(treeElement.node().nodeName()==="BODY"||treeElement.node().nodeName()==="HEAD")
return false;event.dataTransfer.setData("text/plain",treeElement.listItemElement.textContent.replace(/\u200b/g,""));event.dataTransfer.effectAllowed="copyMove";this._treeElementBeingDragged=treeElement;WebInspector.DOMModel.hideDOMNodeHighlight();return true;},_ondragover:function(event)
{if(!this._treeElementBeingDragged)
return false;var treeElement=this._treeElementFromEvent(event);if(!this._isValidDragSourceOrTarget(treeElement))
return false;var node=treeElement.node();while(node){if(node===this._treeElementBeingDragged._node)
return false;node=node.parentNode;}
treeElement.updateSelection();treeElement.listItemElement.classList.add("elements-drag-over");this._dragOverTreeElement=treeElement;event.preventDefault();event.dataTransfer.dropEffect='move';return false;},_ondragleave:function(event)
{this._clearDragOverTreeElementMarker();event.preventDefault();return false;},_isValidDragSourceOrTarget:function(treeElement)
{if(!treeElement)
return false;if(!(treeElement instanceof WebInspector.ElementsTreeElement))
return false;var elementsTreeElement=(treeElement);var node=elementsTreeElement.node();if(!node.parentNode||node.parentNode.nodeType()!==Node.ELEMENT_NODE)
return false;return true;},_ondrop:function(event)
{event.preventDefault();var treeElement=this._treeElementFromEvent(event);if(treeElement)
this._doMove(treeElement);},_doMove:function(treeElement)
{if(!this._treeElementBeingDragged)
return;var parentNode;var anchorNode;if(treeElement.isClosingTag()){parentNode=treeElement.node();}else{var dragTargetNode=treeElement.node();parentNode=dragTargetNode.parentNode;anchorNode=dragTargetNode;}
var wasExpanded=this._treeElementBeingDragged.expanded;this._treeElementBeingDragged._node.moveTo(parentNode,anchorNode,this.selectNodeAfterEdit.bind(this,wasExpanded));delete this._treeElementBeingDragged;},_ondragend:function(event)
{event.preventDefault();this._clearDragOverTreeElementMarker();delete this._treeElementBeingDragged;},_clearDragOverTreeElementMarker:function()
{if(this._dragOverTreeElement){this._dragOverTreeElement.updateSelection();this._dragOverTreeElement.listItemElement.classList.remove("elements-drag-over");delete this._dragOverTreeElement;}},_onkeydown:function(event)
{var keyboardEvent=(event);var node=(this.selectedDOMNode());console.assert(node);var treeElement=node[this._treeElementSymbol];if(!treeElement)
return;if(!treeElement.isEditing()&&WebInspector.KeyboardShortcut.hasNoModifiers(keyboardEvent)&&keyboardEvent.keyCode===WebInspector.KeyboardShortcut.Keys.H.code){this._toggleHideShortcut(node);event.consume(true);return;}},_contextMenuEventFired:function(event)
{var treeElement=this._treeElementFromEvent(event);if(!(treeElement instanceof WebInspector.ElementsTreeElement)||WebInspector.isEditing())
return;var contextMenu=new WebInspector.ContextMenu(event);var isPseudoElement=!!treeElement.node().pseudoType();var isTag=treeElement.node().nodeType()===Node.ELEMENT_NODE&&!isPseudoElement;var textNode=event.target.enclosingNodeOrSelfWithClass("webkit-html-text-node");if(textNode&&textNode.classList.contains("bogus"))
textNode=null;var commentNode=event.target.enclosingNodeOrSelfWithClass("webkit-html-comment");contextMenu.appendApplicableItems(event.target);if(textNode){contextMenu.appendSeparator();treeElement.populateTextContextMenu(contextMenu,textNode);}else if(isTag){contextMenu.appendSeparator();treeElement.populateTagContextMenu(contextMenu,event);}else if(commentNode){contextMenu.appendSeparator();treeElement.populateNodeContextMenu(contextMenu);}else if(isPseudoElement){treeElement.populateScrollIntoView(contextMenu);}
contextMenu.appendApplicableItems(treeElement.node());contextMenu.show();},runPendingUpdates:function()
{this._updateModifiedNodes();},handleShortcut:function(event)
{var node=this.selectedDOMNode();if(!node)
return;var treeElement=node[this._treeElementSymbol];if(!treeElement)
return;if(event.keyIdentifier==="F2"&&treeElement.hasEditableNode()){this._toggleEditAsHTML(node);event.handled=true;return;}
if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)&&node.parentNode){if(event.keyIdentifier==="Up"&&node.previousSibling){node.moveTo(node.parentNode,node.previousSibling,this.selectNodeAfterEdit.bind(this,treeElement.expanded));event.handled=true;return;}
if(event.keyIdentifier==="Down"&&node.nextSibling){node.moveTo(node.parentNode,node.nextSibling.nextSibling,this.selectNodeAfterEdit.bind(this,treeElement.expanded));event.handled=true;return;}}},_toggleEditAsHTML:function(node)
{var treeElement=node[this._treeElementSymbol];if(!treeElement)
return;if(node.pseudoType())
return;var parentNode=node.parentNode;var index=node.index;var wasExpanded=treeElement.expanded;treeElement.toggleEditAsHTML(editingFinished.bind(this));function editingFinished(success)
{if(!success)
return;this.runPendingUpdates();var newNode=parentNode?parentNode.children()[index]||parentNode:null;if(!newNode)
return;this.selectDOMNode(newNode,true);if(wasExpanded){var newTreeItem=this.findTreeElement(newNode);if(newTreeItem)
newTreeItem.expand();}}},selectNodeAfterEdit:function(wasExpanded,error,nodeId)
{if(error)
return null;this.runPendingUpdates();var newNode=nodeId?this._domModel.nodeForId(nodeId):null;if(!newNode)
return null;this.selectDOMNode(newNode,true);var newTreeItem=this.findTreeElement(newNode);if(wasExpanded){if(newTreeItem)
newTreeItem.expand();}
return newTreeItem;},_toggleHideShortcut:function(node,userCallback)
{var pseudoType=node.pseudoType();var effectiveNode=pseudoType?node.parentNode:node;if(!effectiveNode)
return;function resolvedNode(object)
{if(!object)
return;function toggleClassAndInjectStyleRule(pseudoType)
{const classNamePrefix="__web-inspector-hide";const classNameSuffix="-shortcut__";const styleTagId="__web-inspector-hide-shortcut-style__";var selectors=[];selectors.push("html /deep/ .__web-inspector-hide-shortcut__");selectors.push("html /deep/ .__web-inspector-hide-shortcut__ /deep/ *");selectors.push("html /deep/ .__web-inspector-hidebefore-shortcut__::before");selectors.push("html /deep/ .__web-inspector-hideafter-shortcut__::after");var selector=selectors.join(", ");var ruleBody="    visibility: hidden !important;";var rule="\n"+selector+"\n{\n"+ruleBody+"\n}\n";var className=classNamePrefix+(pseudoType||"")+classNameSuffix;this.classList.toggle(className);var style=document.head.querySelector("style#"+styleTagId);if(style)
return;style=document.createElement("style");style.id=styleTagId;style.type="text/css";style.textContent=rule;document.head.appendChild(style);}
object.callFunction(toggleClassAndInjectStyleRule,[{value:pseudoType}],userCallback);object.release();}
effectiveNode.resolveToObject("",resolvedNode);},_reset:function()
{this.rootDOMNode=null;this.selectDOMNode(null,false);this._popoverHelper.hidePopover();delete this._clipboardNodeData;WebInspector.DOMModel.hideDOMNodeHighlight();this._updateRecords.clear();},wireToDOMModel:function()
{this._domModel.addEventListener(WebInspector.DOMModel.Events.NodeInserted,this._nodeInserted,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributeModified,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributeRemoved,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.CharacterDataModified,this._characterDataModified,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.DocumentUpdated,this._documentUpdated,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.ChildNodeCountUpdated,this._childNodeCountUpdated,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.DistributedNodesChanged,this._distributedNodesChanged,this);},unwireFromDOMModel:function()
{this._domModel.removeEventListener(WebInspector.DOMModel.Events.NodeInserted,this._nodeInserted,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributeModified,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributeRemoved,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.CharacterDataModified,this._characterDataModified,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.DocumentUpdated,this._documentUpdated,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.ChildNodeCountUpdated,this._childNodeCountUpdated,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.DistributedNodesChanged,this._distributedNodesChanged,this);},_addUpdateRecord:function(node)
{var record=this._updateRecords.get(node);if(!record){record=new WebInspector.ElementsTreeOutline.UpdateRecord();this._updateRecords.set(node,record);}
return record;},_updateRecordForHighlight:function(node)
{if(!WebInspector.moduleSetting("highlightDOMUpdates").get()||!this._visible)
return null;return this._updateRecords.get(node)||null;},_documentUpdated:function(event)
{var inspectedRootDocument=event.data;this._reset();if(!inspectedRootDocument)
return;this.rootDOMNode=inspectedRootDocument;},_attributeModified:function(event)
{var node=(event.data.node);this._addUpdateRecord(node).attributeModified(event.data.name);this._updateModifiedNodesSoon();},_attributeRemoved:function(event)
{var node=(event.data.node);this._addUpdateRecord(node).attributeRemoved(event.data.name);this._updateModifiedNodesSoon();},_characterDataModified:function(event)
{var node=(event.data);this._addUpdateRecord(node).charDataModified();this._updateModifiedNodesSoon();},_nodeInserted:function(event)
{var node=(event.data);this._addUpdateRecord((node.parentNode)).nodeInserted(node);this._updateModifiedNodesSoon();},_nodeRemoved:function(event)
{var node=(event.data.node);var parentNode=(event.data.parent);this.resetClipboardIfNeeded(node);this._addUpdateRecord(parentNode).nodeRemoved(node);this._updateModifiedNodesSoon();},_childNodeCountUpdated:function(event)
{var node=(event.data);this._addUpdateRecord(node).childrenModified();this._updateModifiedNodesSoon();},_distributedNodesChanged:function(event)
{var node=(event.data);this._addUpdateRecord(node).childrenModified();this._updateModifiedNodesSoon();},_updateModifiedNodesSoon:function()
{if(!this._updateRecords.size)
return;if(this._updateModifiedNodesTimeout)
return;this._updateModifiedNodesTimeout=setTimeout(this._updateModifiedNodes.bind(this),50);},_updateModifiedNodes:function()
{if(this._updateModifiedNodesTimeout){clearTimeout(this._updateModifiedNodesTimeout);delete this._updateModifiedNodesTimeout;}
var updatedNodes=this._updateRecords.keysArray();var hidePanelWhileUpdating=updatedNodes.length>10;if(hidePanelWhileUpdating){var treeOutlineContainerElement=this.element.parentNode;var originalScrollTop=treeOutlineContainerElement?treeOutlineContainerElement.scrollTop:0;this._element.classList.add("hidden");}
if(this._rootDOMNode&&this._updateRecords.get(this._rootDOMNode)&&this._updateRecords.get(this._rootDOMNode).hasChangedChildren()){this.update();}else{for(var node of this._updateRecords.keys()){if(this._updateRecords.get(node).hasChangedChildren())
this._updateModifiedParentNode(node);else
this._updateModifiedNode(node);}}
if(hidePanelWhileUpdating){this._element.classList.remove("hidden");if(originalScrollTop)
treeOutlineContainerElement.scrollTop=originalScrollTop;this.updateSelection();}
this._updateRecords.clear();this._fireElementsTreeUpdated(updatedNodes);},_updateModifiedNode:function(node)
{var treeElement=this.findTreeElement(node);if(treeElement)
treeElement.updateTitle(this._updateRecordForHighlight(node));},_updateModifiedParentNode:function(node)
{var parentTreeElement=this.findTreeElement(node);if(parentTreeElement){parentTreeElement.setExpandable(this._hasVisibleChildren(node));parentTreeElement.updateTitle(this._updateRecordForHighlight(node));if(parentTreeElement.populated)
this._updateChildren(parentTreeElement);}},populateTreeElement:function(treeElement)
{if(treeElement.childCount()||!treeElement.isExpandable())
return;this._updateModifiedParentNode(treeElement.node());},_createElementTreeElement:function(node,closingTag)
{var treeElement=new WebInspector.ElementsTreeElement(node,closingTag);treeElement.setExpandable(!closingTag&&this._hasVisibleChildren(node));treeElement.selectable=this._selectEnabled;return treeElement;},_showChild:function(treeElement,child)
{if(treeElement.isClosingTag())
return null;var index=this._visibleChildren(treeElement.node()).indexOf(child);if(index===-1)
return null;if(index>=treeElement.expandedChildrenLimit())
this.setExpandedChildrenLimit(treeElement,index+1);return(treeElement.childAt(index));},_visibleChildren:function(node)
{var visibleChildren=WebInspector.ElementsTreeElement.visibleShadowRoots(node);if(node.importedDocument())
visibleChildren.push(node.importedDocument());if(node.templateContent())
visibleChildren.push(node.templateContent());var beforePseudoElement=node.beforePseudoElement();if(beforePseudoElement)
visibleChildren.push(beforePseudoElement);if(node.childNodeCount())
visibleChildren=visibleChildren.concat(node.children());var afterPseudoElement=node.afterPseudoElement();if(afterPseudoElement)
visibleChildren.push(afterPseudoElement);return visibleChildren;},_hasVisibleChildren:function(node)
{if(WebInspector.ElementsTreeElement.canShowInlineText(node))
return false;if(node.importedDocument())
return true;if(node.templateContent())
return true;if(node.childNodeCount())
return true;if(WebInspector.ElementsTreeElement.visibleShadowRoots(node).length)
return true;if(node.hasPseudoElements())
return true;if(node.isInsertionPoint())
return true;return false;},_createExpandAllButtonTreeElement:function(treeElement)
{var button=createTextButton("",handleLoadAllChildren.bind(this));button.value="";var expandAllButtonElement=new TreeElement(button);expandAllButtonElement.selectable=false;expandAllButtonElement.expandAllButton=true;expandAllButtonElement.button=button;return expandAllButtonElement;function handleLoadAllChildren(event)
{var visibleChildCount=this._visibleChildren(treeElement.node()).length;this.setExpandedChildrenLimit(treeElement,Math.max(visibleChildCount,treeElement.expandedChildrenLimit()+WebInspector.ElementsTreeElement.InitialChildrenLimit));event.consume();}},setExpandedChildrenLimit:function(treeElement,expandedChildrenLimit)
{if(treeElement.expandedChildrenLimit()===expandedChildrenLimit)
return;treeElement.setExpandedChildrenLimit(expandedChildrenLimit);if(treeElement.treeOutline&&!this._treeElementsBeingUpdated.has(treeElement))
this._updateModifiedParentNode(treeElement.node());},_updateChildren:function(treeElement)
{if(!treeElement.isExpandable()){var selectedTreeElement=treeElement.treeOutline.selectedTreeElement;if(selectedTreeElement&&selectedTreeElement.hasAncestor(treeElement))
treeElement.select(true);treeElement.removeChildren();return;}
console.assert(!treeElement.isClosingTag());treeElement.node().getChildNodes(childNodesLoaded.bind(this));function childNodesLoaded(children)
{if(!children)
return;this._innerUpdateChildren(treeElement);}},insertChildElement:function(treeElement,child,index,closingTag)
{var newElement=this._createElementTreeElement(child,closingTag);treeElement.insertChild(newElement,index);return newElement;},_moveChild:function(treeElement,child,targetIndex)
{if(treeElement.indexOfChild(child)===targetIndex)
return;var wasSelected=child.selected;if(child.parent)
child.parent.removeChild(child);treeElement.insertChild(child,targetIndex);if(wasSelected)
child.select();},_innerUpdateChildren:function(treeElement)
{if(this._treeElementsBeingUpdated.has(treeElement))
return;this._treeElementsBeingUpdated.add(treeElement);var node=treeElement.node();var visibleChildren=this._visibleChildren(node);var visibleChildrenSet=new Set(visibleChildren);var existingTreeElements=new Map();for(var i=treeElement.childCount()-1;i>=0;--i){var existingTreeElement=treeElement.childAt(i);if(!(existingTreeElement instanceof WebInspector.ElementsTreeElement)){treeElement.removeChildAtIndex(i);continue;}
var elementsTreeElement=(existingTreeElement);var existingNode=elementsTreeElement.node();if(visibleChildrenSet.has(existingNode)){existingTreeElements.set(existingNode,existingTreeElement);continue;}
treeElement.removeChildAtIndex(i);}
for(var i=0;i<visibleChildren.length&&i<treeElement.expandedChildrenLimit();++i){var child=visibleChildren[i];var existingTreeElement=existingTreeElements.get(child)||this.findTreeElement(child);if(existingTreeElement&&existingTreeElement!==treeElement){this._moveChild(treeElement,existingTreeElement,i);}else{var newElement=this.insertChildElement(treeElement,child,i);if(this._updateRecordForHighlight(node)&&treeElement.expanded)
WebInspector.ElementsTreeElement.animateOnDOMUpdate(newElement);if(treeElement.childCount()>treeElement.expandedChildrenLimit())
this.setExpandedChildrenLimit(treeElement,treeElement.expandedChildrenLimit()+1);}}
var expandedChildCount=treeElement.childCount();if(visibleChildren.length>expandedChildCount){var targetButtonIndex=expandedChildCount;if(!treeElement.expandAllButtonElement)
treeElement.expandAllButtonElement=this._createExpandAllButtonTreeElement(treeElement);treeElement.insertChild(treeElement.expandAllButtonElement,targetButtonIndex);treeElement.expandAllButtonElement.button.textContent=WebInspector.UIString("Show All Nodes (%d More)",visibleChildren.length-expandedChildCount);}else if(treeElement.expandAllButtonElement){delete treeElement.expandAllButtonElement;}
if(node.isInsertionPoint()){for(var distributedNode of node.distributedNodes())
treeElement.appendChild(new WebInspector.ElementsTreeOutline.ShortcutTreeElement(distributedNode));}
if(node.nodeType()===Node.ELEMENT_NODE&&treeElement.isExpandable())
this.insertChildElement(treeElement,node,treeElement.childCount(),true);this._treeElementsBeingUpdated.delete(treeElement);},__proto__:TreeOutline.prototype}
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
WebInspector.ElementsTreeOutline.UpdateRecord=function()
{}
WebInspector.ElementsTreeOutline.UpdateRecord.prototype={attributeModified:function(attrName)
{if(this._removedAttributes&&this._removedAttributes.has(attrName))
this._removedAttributes.delete(attrName);if(!this._modifiedAttributes)
this._modifiedAttributes=(new Set());this._modifiedAttributes.add(attrName);},attributeRemoved:function(attrName)
{if(this._modifiedAttributes&&this._modifiedAttributes.has(attrName))
this._modifiedAttributes.delete(attrName);if(!this._removedAttributes)
this._removedAttributes=(new Set());this._removedAttributes.add(attrName);},nodeInserted:function(node)
{this._hasChangedChildren=true;},nodeRemoved:function(node)
{this._hasChangedChildren=true;this._hasRemovedChildren=true;},charDataModified:function()
{this._charDataModified=true;},childrenModified:function()
{this._hasChangedChildren=true;},isAttributeModified:function(attributeName)
{return this._modifiedAttributes&&this._modifiedAttributes.has(attributeName);},hasRemovedAttributes:function()
{return!!this._removedAttributes&&!!this._removedAttributes.size;},isCharDataModified:function()
{return!!this._charDataModified;},hasChangedChildren:function()
{return!!this._hasChangedChildren;},hasRemovedChildren:function()
{return!!this._hasRemovedChildren;}}
WebInspector.ElementsTreeOutline.Renderer=function()
{}
WebInspector.ElementsTreeOutline.Renderer.prototype={render:function(object)
{return new Promise(renderPromise);function renderPromise(resolve,reject)
{if(object instanceof WebInspector.DOMNode){onNodeResolved((object));}else if(object instanceof WebInspector.DeferredDOMNode){((object)).resolve(onNodeResolved);}else if(object instanceof WebInspector.RemoteObject){var domModel=WebInspector.DOMModel.fromTarget(((object)).target());if(domModel)
domModel.pushObjectAsNodeToFrontend(object,onNodeResolved);else
reject(new Error("No dom model for given JS object target found."));}else{reject(new Error("Can't reveal not a node."));}
function onNodeResolved(node)
{if(!node){reject(new Error("Could not resolve node."));return;}
var treeOutline=new WebInspector.ElementsTreeOutline(node.domModel(),false,false);treeOutline.rootDOMNode=node;if(!treeOutline.firstChild().isExpandable())
treeOutline._element.classList.add("single-node");treeOutline.setVisible(true);treeOutline.element.treeElementForTest=treeOutline.firstChild();resolve(treeOutline.element);}}}}
WebInspector.ElementsTreeOutline.ShortcutTreeElement=function(nodeShortcut)
{TreeElement.call(this,"");this.listItemElement.createChild("div","selection");var title=this.listItemElement.createChild("span","elements-tree-shortcut-title");var text=nodeShortcut.nodeName.toLowerCase();if(nodeShortcut.nodeType===Node.ELEMENT_NODE)
text="<"+text+">";title.textContent="\u21AA "+text;var link=WebInspector.DOMPresentationUtils.linkifyDeferredNodeReference(nodeShortcut.deferredNode);this.listItemElement.createTextChild(" ");link.classList.add("elements-tree-shortcut-link");link.textContent=WebInspector.UIString("reveal");this.listItemElement.appendChild(link);this._nodeShortcut=nodeShortcut;}
WebInspector.ElementsTreeOutline.ShortcutTreeElement.prototype={get hovered()
{return this._hovered;},set hovered(x)
{if(this._hovered===x)
return;this._hovered=x;this.listItemElement.classList.toggle("hovered",x);},updateSelection:function()
{},backendNodeId:function()
{return this._nodeShortcut.deferredNode.backendNodeId();},onselect:function(selectedByUser)
{if(!selectedByUser)
return true;this._nodeShortcut.deferredNode.highlight();this._nodeShortcut.deferredNode.resolve(resolved.bind(this));function resolved(node)
{if(node){this.treeOutline._selectedDOMNode=node;this.treeOutline._selectedNodeChanged();}}
return true;},__proto__:TreeElement.prototype};WebInspector.EventListenersSidebarPane=function()
{WebInspector.ElementsSidebarPane.call(this,WebInspector.UIString("Event Listeners"));this.registerRequiredCSS("components/objectValue.css");this.bodyElement.classList.add("events-pane");this._treeOutline=new TreeOutline(true);this._treeOutline.element.classList.add("event-listener-tree","outline-disclosure","monospace");this.bodyElement.appendChild(this._treeOutline.element);var refreshButton=this.titleElement.createChild("button","pane-title-button refresh");refreshButton.addEventListener("click",this.update.bind(this),false);refreshButton.title=WebInspector.UIString("Refresh");this.settingsSelectElement=this.titleElement.createChild("select","select-filter");var option=this.settingsSelectElement.createChild("option");option.value="all";option.label=WebInspector.UIString("All Nodes");option=this.settingsSelectElement.createChild("option");option.value="selected";option.label=WebInspector.UIString("Selected Node Only");this._eventListenersFilterSetting=WebInspector.settings.createSetting("eventListenersFilter","all");var filter=this._eventListenersFilterSetting.get();if(filter==="all")
this.settingsSelectElement[0].selected=true;else if(filter==="selected")
this.settingsSelectElement[1].selected=true;this.settingsSelectElement.addEventListener("click",consumeEvent,false);this.settingsSelectElement.addEventListener("change",this._changeSetting.bind(this),false);this._linkifier=new WebInspector.Linkifier();}
WebInspector.EventListenersSidebarPane._objectGroupName="event-listeners-sidebar-pane";WebInspector.EventListenersSidebarPane.prototype={doUpdate:function(finishCallback)
{if(this._lastRequestedNode){this._lastRequestedNode.target().runtimeAgent().releaseObjectGroup(WebInspector.EventListenersSidebarPane._objectGroupName);delete this._lastRequestedNode;}
this._linkifier.reset();var body=this.bodyElement;body.removeChildren();this._treeOutline.removeChildren();var node=this.node();if(!node){finishCallback();return;}
this._lastRequestedNode=node;node.eventListeners(WebInspector.EventListenersSidebarPane._objectGroupName,this._onEventListeners.bind(this,finishCallback));},_onEventListeners:function(finishCallback,eventListeners)
{if(!eventListeners){finishCallback();return;}
var body=this.bodyElement;var node=this.node();var selectedNodeOnly="selected"===this._eventListenersFilterSetting.get();var treeItemMap=new Map();eventListeners.stableSort(compareListeners);function compareListeners(a,b)
{var aType=a.payload().type;var bType=b.payload().type;return aType===bType?0:aType>bType?1:-1;}
for(var i=0;i<eventListeners.length;++i){var eventListener=eventListeners[i];if(selectedNodeOnly&&(node.id!==eventListener.payload().nodeId))
continue;if(eventListener.location().script().isInternalScript())
continue;var type=eventListener.payload().type;var treeItem=treeItemMap.get(type);if(!treeItem){treeItem=new WebInspector.EventListenersTreeElement(type,node.id,this._linkifier);treeItemMap.set(type,treeItem);this._treeOutline.appendChild(treeItem);}
treeItem.addListener(eventListener);}
if(treeItemMap.size===0)
body.createChild("div","info").textContent=WebInspector.UIString("No Event Listeners");else
body.appendChild(this._treeOutline.element);finishCallback();},_changeSetting:function()
{var selectedOption=this.settingsSelectElement[this.settingsSelectElement.selectedIndex];this._eventListenersFilterSetting.set(selectedOption.value);this.update();},__proto__:WebInspector.ElementsSidebarPane.prototype}
WebInspector.EventListenersTreeElement=function(title,nodeId,linkifier)
{this._nodeId=nodeId;this._linkifier=linkifier;TreeElement.call(this,title);this.toggleOnClick=true;this.selectable=false;}
WebInspector.EventListenersTreeElement.prototype={addListener:function(eventListener)
{var treeElement=new WebInspector.EventListenerBar(eventListener,this._nodeId,this._linkifier);this.appendChild(treeElement);},__proto__:TreeElement.prototype}
WebInspector.EventListenerBar=function(eventListener,nodeId,linkifier)
{TreeElement.call(this,"",true);var target=eventListener.target();this._runtimeModel=target.runtimeModel;this._eventListener=eventListener;this._nodeId=nodeId;this._setNodeTitle(linkifier);this.editable=false;}
WebInspector.EventListenerBar.prototype={onpopulate:function()
{function updateWithNodeObject(nodeObject)
{var properties=[];var payload=this._eventListener.payload();properties.push(this._runtimeModel.createRemotePropertyFromPrimitiveValue("useCapture",payload.useCapture));properties.push(this._runtimeModel.createRemotePropertyFromPrimitiveValue("attachment",payload.isAttribute?"attribute":"script"));if(nodeObject)
properties.push(new WebInspector.RemoteObjectProperty("node",nodeObject));if(typeof payload.handler!=="undefined"){var remoteObject=this._runtimeModel.createRemoteObject(payload.handler);properties.push(new WebInspector.RemoteObjectProperty("handler",remoteObject));}
WebInspector.ObjectPropertyTreeElement.populateWithProperties(this,properties,[],true,null);}
this._eventListener.node().resolveToObject(WebInspector.EventListenersSidebarPane._objectGroupName,updateWithNodeObject.bind(this));},_setNodeTitle:function(linkifier)
{var node=this._eventListener.node();if(!node)
return;this.listItemElement.removeChildren();var title=this.listItemElement.createChild("span");var subtitle=this.listItemElement.createChild("span","event-listener-tree-subtitle");subtitle.appendChild(linkifier.linkifyRawLocation(this._eventListener.location(),this._eventListener.sourceName()));if(node.nodeType()===Node.DOCUMENT_NODE){title.textContent="document";return;}
if(node.id===this._nodeId){title.textContent=WebInspector.DOMPresentationUtils.simpleSelector(node);return;}
title.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(node));},__proto__:TreeElement.prototype};WebInspector.MetricsSidebarPane=function()
{WebInspector.ElementsSidebarPane.call(this,WebInspector.UIString("Metrics"));}
WebInspector.MetricsSidebarPane.prototype={setNode:function(node)
{WebInspector.ElementsSidebarPane.prototype.setNode.call(this,node);this._updateTarget(node?node.target():null);},_updateTarget:function(target)
{if(this._target===target)
return;if(this._target){this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded,this.update,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved,this.update,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this.update,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this.update,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.PseudoStateForced,this.update,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributesUpdated,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributesUpdated,this);this._target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized,this.update,this);}
this._target=target;if(target){this._domModel=WebInspector.DOMModel.fromTarget(target);this._cssModel=WebInspector.CSSStyleModel.fromTarget(target);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded,this.update,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved,this.update,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this.update,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this.update,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.PseudoStateForced,this.update,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributesUpdated,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributesUpdated,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized,this.update,this);}},doUpdate:function(finishedCallback)
{if(this._isEditingMetrics){finishedCallback();return;}
var node=this.node();if(!node||node.nodeType()!==Node.ELEMENT_NODE){this.bodyElement.removeChildren();finishedCallback();return;}
function callback(style)
{if(!style||this.node()!==node)
return;this._updateMetrics(style);}
this._cssModel.getComputedStyleAsync(node.id,callback.bind(this));function inlineStyleCallback(style)
{if(style&&this.node()===node)
this.inlineStyle=style;finishedCallback();}
this._cssModel.getInlineStylesAsync(node.id,inlineStyleCallback.bind(this));},_attributesUpdated:function(event)
{if(this.node()!==event.data.node)
return;this.update();},_getPropertyValueAsPx:function(style,propertyName)
{return Number(style.getPropertyValue(propertyName).replace(/px$/,"")||0);},_getBox:function(computedStyle,componentName)
{var suffix=componentName==="border"?"-width":"";var left=this._getPropertyValueAsPx(computedStyle,componentName+"-left"+suffix);var top=this._getPropertyValueAsPx(computedStyle,componentName+"-top"+suffix);var right=this._getPropertyValueAsPx(computedStyle,componentName+"-right"+suffix);var bottom=this._getPropertyValueAsPx(computedStyle,componentName+"-bottom"+suffix);return{left:left,top:top,right:right,bottom:bottom};},_highlightDOMNode:function(showHighlight,mode,event)
{event.consume();if(showHighlight&&this.node()){if(this._highlightMode===mode)
return;this._highlightMode=mode;this.node().highlight(mode);}else{delete this._highlightMode;WebInspector.DOMModel.hideDOMNodeHighlight();}
for(var i=0;this._boxElements&&i<this._boxElements.length;++i){var element=this._boxElements[i];if(!this.node()||mode==="all"||element._name===mode)
element.style.backgroundColor=element._backgroundColor;else
element.style.backgroundColor="";}},_updateMetrics:function(style)
{var metricsElement=createElement("div");metricsElement.className="metrics";var self=this;function createBoxPartElement(style,name,side,suffix)
{var propertyName=(name!=="position"?name+"-":"")+side+suffix;var value=style.getPropertyValue(propertyName);if(value===""||(name!=="position"&&value==="0px"))
value="\u2012";else if(name==="position"&&value==="auto")
value="\u2012";value=value.replace(/px$/,"");value=Number.toFixedIfFloating(value);var element=createElement("div");element.className=side;element.textContent=value;element.addEventListener("dblclick",this.startEditing.bind(this,element,name,propertyName,style),false);return element;}
function getContentAreaWidthPx(style)
{var width=style.getPropertyValue("width").replace(/px$/,"");if(!isNaN(width)&&style.getPropertyValue("box-sizing")==="border-box"){var borderBox=self._getBox(style,"border");var paddingBox=self._getBox(style,"padding");width=width-borderBox.left-borderBox.right-paddingBox.left-paddingBox.right;}
return Number.toFixedIfFloating(width);}
function getContentAreaHeightPx(style)
{var height=style.getPropertyValue("height").replace(/px$/,"");if(!isNaN(height)&&style.getPropertyValue("box-sizing")==="border-box"){var borderBox=self._getBox(style,"border");var paddingBox=self._getBox(style,"padding");height=height-borderBox.top-borderBox.bottom-paddingBox.top-paddingBox.bottom;}
return Number.toFixedIfFloating(height);}
var noMarginDisplayType={"table-cell":true,"table-column":true,"table-column-group":true,"table-footer-group":true,"table-header-group":true,"table-row":true,"table-row-group":true};var noPaddingDisplayType={"table-column":true,"table-column-group":true,"table-footer-group":true,"table-header-group":true,"table-row":true,"table-row-group":true};var noPositionType={"static":true};var boxes=["content","padding","border","margin","position"];var boxColors=[WebInspector.Color.PageHighlight.Content,WebInspector.Color.PageHighlight.Padding,WebInspector.Color.PageHighlight.Border,WebInspector.Color.PageHighlight.Margin,WebInspector.Color.fromRGBA([0,0,0,0])];var boxLabels=[WebInspector.UIString("content"),WebInspector.UIString("padding"),WebInspector.UIString("border"),WebInspector.UIString("margin"),WebInspector.UIString("position")];var previousBox=null;this._boxElements=[];for(var i=0;i<boxes.length;++i){var name=boxes[i];if(name==="margin"&&noMarginDisplayType[style.getPropertyValue("display")])
continue;if(name==="padding"&&noPaddingDisplayType[style.getPropertyValue("display")])
continue;if(name==="position"&&noPositionType[style.getPropertyValue("position")])
continue;var boxElement=createElement("div");boxElement.className=name;boxElement._backgroundColor=boxColors[i].asString(WebInspector.Color.Format.RGBA);boxElement._name=name;boxElement.style.backgroundColor=boxElement._backgroundColor;boxElement.addEventListener("mouseover",this._highlightDOMNode.bind(this,true,name==="position"?"all":name),false);this._boxElements.push(boxElement);if(name==="content"){var widthElement=createElement("span");widthElement.textContent=getContentAreaWidthPx(style);widthElement.addEventListener("dblclick",this.startEditing.bind(this,widthElement,"width","width",style),false);var heightElement=createElement("span");heightElement.textContent=getContentAreaHeightPx(style);heightElement.addEventListener("dblclick",this.startEditing.bind(this,heightElement,"height","height",style),false);boxElement.appendChild(widthElement);boxElement.createTextChild(" \u00D7 ");boxElement.appendChild(heightElement);}else{var suffix=(name==="border"?"-width":"");var labelElement=createElement("div");labelElement.className="label";labelElement.textContent=boxLabels[i];boxElement.appendChild(labelElement);boxElement.appendChild(createBoxPartElement.call(this,style,name,"top",suffix));boxElement.appendChild(createElement("br"));boxElement.appendChild(createBoxPartElement.call(this,style,name,"left",suffix));if(previousBox)
boxElement.appendChild(previousBox);boxElement.appendChild(createBoxPartElement.call(this,style,name,"right",suffix));boxElement.appendChild(createElement("br"));boxElement.appendChild(createBoxPartElement.call(this,style,name,"bottom",suffix));}
previousBox=boxElement;}
metricsElement.appendChild(previousBox);metricsElement.addEventListener("mouseover",this._highlightDOMNode.bind(this,false,"all"),false);this.bodyElement.removeChildren();this.bodyElement.appendChild(metricsElement);},startEditing:function(targetElement,box,styleProperty,computedStyle)
{if(WebInspector.isBeingEdited(targetElement))
return;var context={box:box,styleProperty:styleProperty,computedStyle:computedStyle};var boundKeyDown=this._handleKeyDown.bind(this,context,styleProperty);context.keyDownHandler=boundKeyDown;targetElement.addEventListener("keydown",boundKeyDown,false);this._isEditingMetrics=true;var config=new WebInspector.InplaceEditor.Config(this.editingCommitted.bind(this),this.editingCancelled.bind(this),context);WebInspector.InplaceEditor.startEditing(targetElement,config);targetElement.getComponentSelection().setBaseAndExtent(targetElement,0,targetElement,1);},_handleKeyDown:function(context,styleProperty,event)
{var element=event.currentTarget;function finishHandler(originalValue,replacementString)
{this._applyUserInput(element,replacementString,originalValue,context,false);}
function customNumberHandler(prefix,number,suffix)
{if(styleProperty!=="margin"&&number<0)
number=0;return prefix+number+suffix;}
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
userInput+="px";var styleProperty=context.styleProperty;var computedStyle=context.computedStyle;if(computedStyle.getPropertyValue("box-sizing")==="border-box"&&(styleProperty==="width"||styleProperty==="height")){if(!userInput.match(/px$/)){WebInspector.console.error("For elements with box-sizing: border-box, only absolute content area dimensions can be applied");return;}
var borderBox=this._getBox(computedStyle,"border");var paddingBox=this._getBox(computedStyle,"padding");var userValuePx=Number(userInput.replace(/px$/,""));if(isNaN(userValuePx))
return;if(styleProperty==="width")
userValuePx+=borderBox.left+borderBox.right+paddingBox.left+paddingBox.right;else
userValuePx+=borderBox.top+borderBox.bottom+paddingBox.top+paddingBox.bottom;userInput=userValuePx+"px";}
this.previousPropertyDataCandidate=null;var allProperties=this.inlineStyle.allProperties;for(var i=0;i<allProperties.length;++i){var property=allProperties[i];if(property.name!==context.styleProperty||property.inactive)
continue;this.previousPropertyDataCandidate=property;property.setValue(userInput,commitEditor,true,callback.bind(this));return;}
this.inlineStyle.appendProperty(context.styleProperty,userInput,callback.bind(this));function callback(style)
{if(!style)
return;this.inlineStyle=style;if(!("originalPropertyData"in this))
this.originalPropertyData=this.previousPropertyDataCandidate;if(typeof this._highlightMode!=="undefined")
this._node.highlight(this._highlightMode);if(commitEditor)
this.update();}},editingCommitted:function(element,userInput,previousContent,context)
{this.editingEnded(element,context);this._applyUserInput(element,userInput,previousContent,context,true);},__proto__:WebInspector.ElementsSidebarPane.prototype};WebInspector.PlatformFontsSidebarPane=function()
{WebInspector.ElementsSidebarPane.call(this,WebInspector.UIString("Fonts"));this.element.classList.add("platform-fonts");this._sectionTitle=createElementWithClass("div","sidebar-separator");this.element.insertBefore(this._sectionTitle,this.bodyElement);this._sectionTitle.textContent=WebInspector.UIString("Rendered Fonts");this._fontStatsSection=this.bodyElement.createChild("div","stats-section");}
WebInspector.PlatformFontsSidebarPane.prototype={setNode:function(node)
{WebInspector.ElementsSidebarPane.prototype.setNode.call(this,node);this._updateTarget(node?node.target():null);},_updateTarget:function(target)
{if(this._target===target)
return;if(this._target){this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded,this.update,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved,this.update,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this.update,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this.update,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.PseudoStateForced,this.update,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified,this.update,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved,this.update,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.CharacterDataModified,this.update,this);}
this._target=target;if(target){this._domModel=WebInspector.DOMModel.fromTarget(target);this._cssModel=WebInspector.CSSStyleModel.fromTarget(target);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded,this.update,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved,this.update,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this.update,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this.update,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.PseudoStateForced,this.update,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified,this.update,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved,this.update,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.CharacterDataModified,this.update,this);}},doUpdate:function(finishedCallback)
{if(!this.node())
return;this._cssModel.getPlatformFontsForNode(this.node().id,this._refreshUI.bind(this,(this.node()),finishedCallback));},_refreshUI:function(node,finishedCallback,cssFamilyName,platformFonts)
{if(this.node()!==node){finishedCallback();return;}
this._fontStatsSection.removeChildren();var isEmptySection=!platformFonts||!platformFonts.length;this._sectionTitle.classList.toggle("hidden",isEmptySection);if(isEmptySection){finishedCallback();return;}
platformFonts.sort(function(a,b){return b.glyphCount-a.glyphCount;});for(var i=0;i<platformFonts.length;++i){var fontStatElement=this._fontStatsSection.createChild("div","font-stats-item");var fontNameElement=fontStatElement.createChild("span","font-name");fontNameElement.textContent=platformFonts[i].familyName;var fontDelimeterElement=fontStatElement.createChild("span","delimeter");fontDelimeterElement.textContent="\u2014";var fontUsageElement=fontStatElement.createChild("span","font-usage");var usage=platformFonts[i].glyphCount;fontUsageElement.textContent=usage===1?WebInspector.UIString("%d glyph",usage):WebInspector.UIString("%d glyphs",usage);}
finishedCallback();},__proto__:WebInspector.ElementsSidebarPane.prototype};WebInspector.PropertiesSidebarPane=function()
{WebInspector.ElementsSidebarPane.call(this,WebInspector.UIString("Properties"));WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.AttrModified,this._onNodeChange,this);WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.AttrRemoved,this._onNodeChange,this);WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.CharacterDataModified,this._onNodeChange,this);WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.ChildNodeCountUpdated,this._onNodeChange,this);}
WebInspector.PropertiesSidebarPane._objectGroupName="properties-sidebar-pane";WebInspector.PropertiesSidebarPane.prototype={doUpdate:function(finishCallback)
{if(this._lastRequestedNode){this._lastRequestedNode.target().runtimeAgent().releaseObjectGroup(WebInspector.PropertiesSidebarPane._objectGroupName);delete this._lastRequestedNode;}
var node=this.node();if(!node){this.bodyElement.removeChildren();this.sections=[];finishCallback();return;}
this._lastRequestedNode=node;node.resolveToObject(WebInspector.PropertiesSidebarPane._objectGroupName,nodeResolved.bind(this));function nodeResolved(object)
{if(!object){finishCallback();return;}
function protoList()
{var proto=this;var result={__proto__:null};var counter=1;while(proto){result[counter++]=proto;proto=proto.__proto__;}
return result;}
object.callFunction(protoList,undefined,nodePrototypesReady.bind(this));object.release();}
function nodePrototypesReady(object,wasThrown)
{if(!object||wasThrown){finishCallback();return;}
object.getOwnProperties(fillSection.bind(this));object.release();}
function fillSection(prototypes)
{if(!prototypes){finishCallback();return;}
var expanded=[];var sections=this.sections||[];for(var i=0;i<sections.length;++i)
expanded.push(sections[i].expanded);var body=this.bodyElement;body.removeChildren();this.sections=[];for(var i=0;i<prototypes.length;++i){if(!parseInt(prototypes[i].name,10))
continue;var prototype=prototypes[i].value;var title=prototype.description;title=title.replace(/Prototype$/,"");var section=new WebInspector.ObjectPropertiesSection(prototype,title);this.sections.push(section);body.appendChild(section.element);if(expanded[this.sections.length-1])
section.expand();}
finishCallback();}},_onNodeChange:function(event)
{if(!this.node())
return;var data=event.data;var node=(data instanceof WebInspector.DOMNode?data:data.node);if(this.node()!==node)
return;this.update();},__proto__:WebInspector.ElementsSidebarPane.prototype};WebInspector.StylesSectionModel=function(cascade,rule,style,customSelectorText,inheritedFromNode)
{this._cascade=cascade;this._rule=rule;this._style=style;this._customSelectorText=customSelectorText;this._isAttribute=false;this._editable=!!(this._style&&this._style.styleSheetId);this._inheritedFromNode=inheritedFromNode||null;}
WebInspector.StylesSectionModel.prototype={cascade:function()
{return this._cascade;},hasMatchingSelectors:function()
{return this.rule()?this.rule().matchingSelectors.length>0&&this.mediaMatches():true;},mediaMatches:function()
{var media=this.media();for(var i=0;media&&i<media.length;++i){if(!media[i].active())
return false;}
return true;},inherited:function()
{return!!this._inheritedFromNode;},parentNode:function()
{return this._inheritedFromNode;},selectorText:function()
{if(this._customSelectorText)
return this._customSelectorText;return this.rule()?this.rule().selectorText:"";},editable:function()
{return this._editable;},setEditable:function(editable)
{this._editable=editable;},style:function()
{return this._style;},rule:function()
{return this._rule;},media:function()
{return this.rule()?this.rule().media:null;},isAttribute:function()
{return this._isAttribute;},setIsAttribute:function(isAttribute)
{this._isAttribute=isAttribute;},updateRule:function(rule)
{this._rule=rule;this._style=rule.style;this._cascade._resetUsedProperties();},updateStyleDeclaration:function(style)
{this._style=style;if(this._rule){style.parentRule=this._rule;this._rule.style=style;}
this._cascade._resetUsedProperties();},usedProperties:function()
{return this._cascade._usedPropertiesForModel(this);},isPropertyOverloaded:function(propertyName,isShorthand)
{if(!this.hasMatchingSelectors())
return false;if(this.inherited()&&!WebInspector.CSSMetadata.isPropertyInherited(propertyName)){return false;}
var canonicalName=WebInspector.CSSMetadata.canonicalPropertyName(propertyName);var used=this.usedProperties().has(canonicalName);if(used||!isShorthand)
return!used;var longhandProperties=this.style().longhandProperties(propertyName);for(var j=0;j<longhandProperties.length;++j){var individualProperty=longhandProperties[j];var canonicalPropertyName=WebInspector.CSSMetadata.canonicalPropertyName(individualProperty.name);if(this.usedProperties().has(canonicalPropertyName))
return false;}
return true;}}
WebInspector.SectionCascade=function()
{this._models=[];this._resetUsedProperties();}
WebInspector.SectionCascade.prototype={sectionModels:function()
{return this._models;},appendModelFromRule:function(rule,inheritedFromNode)
{return this._insertModel(new WebInspector.StylesSectionModel(this,rule,rule.style,"",inheritedFromNode));},insertModelFromRule:function(rule,insertAfterStyleRule)
{return this._insertModel(new WebInspector.StylesSectionModel(this,rule,rule.style,"",null),insertAfterStyleRule);},appendModelFromStyle:function(style,selectorText,inheritedFromNode)
{return this._insertModel(new WebInspector.StylesSectionModel(this,null,style,selectorText,inheritedFromNode));},allUsedProperties:function()
{this._recomputeUsedPropertiesIfNeeded();return this._allUsedProperties;},_insertModel:function(model,insertAfter)
{if(insertAfter){var index=this._models.indexOf(insertAfter);console.assert(index!==-1,"The insertAfter anchor could not be found in cascade");this._models.splice(index+1,0,model);}else{this._models.push(model);}
this._resetUsedProperties();return model;},_recomputeUsedPropertiesIfNeeded:function()
{if(this._usedPropertiesPerModel.size>0)
return;var usedProperties=WebInspector.SectionCascade._computeUsedProperties(this._models,this._allUsedProperties);for(var i=0;i<usedProperties.length;++i)
this._usedPropertiesPerModel.set(this._models[i],usedProperties[i]);},_resetUsedProperties:function()
{this._allUsedProperties=new Set();this._usedPropertiesPerModel=new Map();},_usedPropertiesForModel:function(model)
{this._recomputeUsedPropertiesIfNeeded();return(this._usedPropertiesPerModel.get(model));}}
WebInspector.SectionCascade._computeUsedProperties=function(styleRules,allUsedProperties)
{var foundImportantProperties=new Set();var propertyToEffectiveRule=new Map();var inheritedPropertyToNode=new Map();var stylesUsedProperties=[];for(var i=0;i<styleRules.length;++i){var styleRule=styleRules[i];var styleRuleUsedProperties=new Set();stylesUsedProperties.push(styleRuleUsedProperties);if(!styleRule.hasMatchingSelectors())
continue;var style=styleRule.style();var allProperties=style.allProperties;for(var j=0;j<allProperties.length;++j){var property=allProperties[j];if(!property.isLive||!property.parsedOk)
continue;if(styleRule.inherited()&&!WebInspector.CSSMetadata.isPropertyInherited(property.name))
continue;var canonicalName=WebInspector.CSSMetadata.canonicalPropertyName(property.name);if(foundImportantProperties.has(canonicalName))
continue;if(!property.important&&allUsedProperties.has(canonicalName))
continue;var isKnownProperty=propertyToEffectiveRule.has(canonicalName);var parentNode=styleRule.parentNode();if(!isKnownProperty&&parentNode&&!inheritedPropertyToNode.has(canonicalName))
inheritedPropertyToNode.set(canonicalName,parentNode);if(property.important){if(styleRule.inherited()&&isKnownProperty&&styleRule.parentNode()!==inheritedPropertyToNode.get(canonicalName))
continue;foundImportantProperties.add(canonicalName);if(isKnownProperty)
propertyToEffectiveRule.get(canonicalName).delete(canonicalName);}
styleRuleUsedProperties.add(canonicalName);allUsedProperties.add(canonicalName);propertyToEffectiveRule.set(canonicalName,styleRuleUsedProperties);}}
return stylesUsedProperties;};WebInspector.StylesSidebarPane=function(computedStylePane,requestShowCallback)
{WebInspector.ElementsSidebarPane.call(this,WebInspector.UIString("Styles"));this._computedStylePane=computedStylePane;computedStylePane.setHostingPane(this);this.element.addEventListener("contextmenu",this._contextMenuEventFired.bind(this),true);WebInspector.moduleSetting("colorFormat").addChangeListener(this.update.bind(this));WebInspector.moduleSetting("textEditorIndent").addChangeListener(this.update.bind(this));var toolbar=new WebInspector.Toolbar(this.titleElement);toolbar.element.classList.add("styles-pane-toolbar");toolbar.makeNarrow();var addNewStyleRuleButton=new WebInspector.ToolbarButton(WebInspector.UIString("New Style Rule"),"add-toolbar-item");addNewStyleRuleButton.makeLongClickEnabled();addNewStyleRuleButton.addEventListener("click",this._createNewRuleInViaInspectorStyleSheet,this);addNewStyleRuleButton.addEventListener("longClickDown",this._onAddButtonLongClick,this);toolbar.appendToolbarItem(addNewStyleRuleButton);this._elementStateButton=new WebInspector.ToolbarButton(WebInspector.UIString("Toggle Element State"),"element-state-toolbar-item");this._elementStateButton.addEventListener("click",this._toggleElementStatePane,this);toolbar.appendToolbarItem(this._elementStateButton);this._animationsControlButton=new WebInspector.ToolbarButton(WebInspector.UIString("Animations Controls"),"animation-toolbar-item");this._animationsControlButton.addEventListener("click",this._toggleAnimationsControlPane,this);toolbar.appendToolbarItem(this._animationsControlButton);this._requestShowCallback=requestShowCallback;this._createElementStatePane();this.bodyElement.appendChild(this._elementStatePane);this._animationsControlPane=new WebInspector.AnimationControlPane();this.bodyElement.appendChild(this._animationsControlPane.element);this._sectionsContainer=createElement("div");this.bodyElement.appendChild(this._sectionsContainer);this._stylesPopoverHelper=new WebInspector.StylesPopoverHelper();this._linkifier=new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultCSSFormatter());this.element.classList.add("styles-pane");this.element.addEventListener("mousemove",this._mouseMovedOverElement.bind(this),false);this._keyDownBound=this._keyDown.bind(this);this._keyUpBound=this._keyUp.bind(this);}
WebInspector.StylesSidebarPane.PseudoIdNames=["","first-line","first-letter","before","after","backdrop","selection","","-webkit-scrollbar","-webkit-scrollbar-thumb","-webkit-scrollbar-button","-webkit-scrollbar-track","-webkit-scrollbar-track-piece","-webkit-scrollbar-corner","-webkit-resizer"];WebInspector.StylesSidebarPane.Events={SelectorEditingStarted:"SelectorEditingStarted",SelectorEditingEnded:"SelectorEditingEnded"};WebInspector.StylesSidebarPane.createExclamationMark=function(property)
{var exclamationElement=createElement("label","dt-icon-label");exclamationElement.className="exclamation-mark";if(!WebInspector.StylesSidebarPane.ignoreErrorsForProperty(property))
exclamationElement.type="warning-icon";exclamationElement.title=WebInspector.CSSMetadata.cssPropertiesMetainfo.keySet()[property.name.toLowerCase()]?WebInspector.UIString("Invalid property value."):WebInspector.UIString("Unknown property name.");return exclamationElement;}
WebInspector.StylesSidebarPane.ignoreErrorsForProperty=function(property){function hasUnknownVendorPrefix(string)
{return!string.startsWith("-webkit-")&&/^[-_][\w\d]+-\w/.test(string);}
var name=property.name.toLowerCase();if(name.charAt(0)==="_")
return true;if(name==="filter")
return true;if(name.startsWith("scrollbar-"))
return true;if(hasUnknownVendorPrefix(name))
return true;var value=property.value.toLowerCase();if(value.endsWith("\9"))
return true;if(hasUnknownVendorPrefix(value))
return true;return false;}
WebInspector.StylesSidebarPane.prototype={_onAddButtonLongClick:function(event)
{var cssModel=this._cssModel;var headers=cssModel.styleSheetHeaders().filter(styleSheetResourceHeader);var contextMenuDescriptors=[];for(var i=0;i<headers.length;++i){var header=headers[i];var handler=this._createNewRuleInStyleSheet.bind(this,header);contextMenuDescriptors.push({text:WebInspector.displayNameForURL(header.resourceURL()),handler:handler});}
contextMenuDescriptors.sort(compareDescriptors);var contextMenu=new WebInspector.ContextMenu((event.data));for(var i=0;i<contextMenuDescriptors.length;++i){var descriptor=contextMenuDescriptors[i];contextMenu.appendItem(descriptor.text,descriptor.handler);}
if(!contextMenu.isEmpty())
contextMenu.appendSeparator();contextMenu.appendItem("inspector-stylesheet",this._createNewRuleInViaInspectorStyleSheet.bind(this));contextMenu.show();function compareDescriptors(descriptor1,descriptor2)
{return String.naturalOrderComparator(descriptor1.text,descriptor2.text);}
function styleSheetResourceHeader(header)
{return!header.isViaInspector()&&!header.isInline&&!!header.resourceURL();}},updateEditingSelectorForNode:function(node)
{var selectorText=WebInspector.DOMPresentationUtils.simpleSelector(node);if(!selectorText)
return;this._editingSelectorSection.setSelectorText(selectorText);},isEditingSelector:function()
{return!!this._editingSelectorSection;},_startEditingSelector:function(section)
{this._editingSelectorSection=section;this.dispatchEventToListeners(WebInspector.StylesSidebarPane.Events.SelectorEditingStarted);},_finishEditingSelector:function()
{delete this._editingSelectorSection;this.dispatchEventToListeners(WebInspector.StylesSidebarPane.Events.SelectorEditingEnded);},_styleSheetRuleEdited:function(editedRule,oldRange,newRange)
{if(!editedRule.styleSheetId)
return;for(var block of this._sectionBlocks){for(var section of block.sections)
section._styleSheetRuleEdited(editedRule,oldRange,newRange);}},_styleSheetMediaEdited:function(oldMedia,newMedia)
{if(!oldMedia.parentStyleSheetId)
return;for(var block of this._sectionBlocks){for(var section of block.sections)
section._styleSheetMediaEdited(oldMedia,newMedia);}},_contextMenuEventFired:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendApplicableItems((event.target));contextMenu.show();},setFilterBoxContainer:function(matchedStylesElement)
{this._filterInput=WebInspector.StylesSidebarPane.createPropertyFilterElement(WebInspector.UIString("Find in Styles"),this._onFilterChanged.bind(this));matchedStylesElement.appendChild(this._filterInput);},tracePropertyName:function(propertyName)
{this._requestShowCallback();this._filterInput.setFilterValue(WebInspector.CSSMetadata.canonicalPropertyName(propertyName));},_onFilterChanged:function(regex)
{this._filterRegex=regex;this._updateFilter();},_forcedPseudoClasses:function()
{return this.node()?(this.node().getUserProperty(WebInspector.CSSStyleModel.PseudoStatePropertyName)||undefined):undefined;},_updateForcedPseudoStateInputs:function()
{var node=this.node();if(!node)
return;var hasPseudoType=!!node.pseudoType();this._elementStateButton.setEnabled(!hasPseudoType);this._elementStatePane.classList.toggle("expanded",!hasPseudoType&&this._elementStateButton.toggled());var nodePseudoState=this._forcedPseudoClasses();if(!nodePseudoState)
nodePseudoState=[];var inputs=this._elementStatePane.inputs;for(var i=0;i<inputs.length;++i)
inputs[i].checked=nodePseudoState.indexOf(inputs[i].state)>=0;},setNode:function(node)
{var mainFrameNavigated=node&&this.node()&&node.ownerDocument!==this.node().ownerDocument;if(!mainFrameNavigated&&node!==this.node()){this.element.classList.toggle("no-affect",this._isEditingStyle);if(this._isEditingStyle){this._pendingNode=node;return;}}
this._stylesPopoverHelper.hide();if(node&&node.nodeType()===Node.TEXT_NODE&&node.parentNode)
node=node.parentNode;if(node&&node.nodeType()!==Node.ELEMENT_NODE)
node=null;this._updateTarget(node?node.target():null);this._resetCache();this._computedStylePane.setNode(node);this._animationsControlPane.setNode(node);WebInspector.ElementsSidebarPane.prototype.setNode.call(this,node);},_updateTarget:function(target)
{if(this._target===target)
return;if(this._target){this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded,this._styleSheetOrMediaQueryResultChanged,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved,this._styleSheetOrMediaQueryResultChanged,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this._styleSheetOrMediaQueryResultChanged,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this._styleSheetOrMediaQueryResultChanged,this);this._cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.PseudoStateForced,this._styleSheetOrMediaQueryResultChanged,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributeChanged,this);this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributeChanged,this);this._target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized,this._frameResized,this);}
this._target=target;if(target){this._domModel=WebInspector.DOMModel.fromTarget(target);this._cssModel=WebInspector.CSSStyleModel.fromTarget(target);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded,this._styleSheetOrMediaQueryResultChanged,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved,this._styleSheetOrMediaQueryResultChanged,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged,this._styleSheetOrMediaQueryResultChanged,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged,this._styleSheetOrMediaQueryResultChanged,this);this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.PseudoStateForced,this._styleSheetOrMediaQueryResultChanged,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified,this._attributeChanged,this);this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved,this._attributeChanged,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized,this._frameResized,this);}},_refreshUpdate:function(editedSection)
{var node=this.node();if(!node)
return;for(var block of this._sectionBlocks){for(var section of block.sections){if(section.isBlank)
continue;section.update(section===editedSection);}}
this._computedStylePane.update();if(this._filterRegex)
this._updateFilter();this._nodeStylesUpdatedForTest(node,false);},doUpdate:function(finishedCallback)
{this._updateForcedPseudoStateInputs();this._discardElementUnderMouse();this._fetchMatchedCascade().then(this._innerRebuildUpdate.bind(this)).then(finishedCallback).catch((finishedCallback));},_resetCache:function()
{delete this._matchedCascadePromise;this._resetComputedCache();},_resetComputedCache:function()
{delete this._computedStylePromise;},_fetchMatchedCascade:function()
{var node=this.node();if(!node)
return Promise.resolve((null));if(!this._matchedCascadePromise)
this._matchedCascadePromise=new Promise(this._getMatchedStylesForNode.bind(this,node)).then(buildMatchedCascades.bind(this,node));return this._matchedCascadePromise;function buildMatchedCascades(node,payload)
{if(node!==this.node()||!payload.fulfilled())
return null;return{matched:this._buildMatchedRulesSectionCascade(node,payload),pseudo:this._buildPseudoCascades(node,payload)};}},_fetchComputedStyle:function()
{var node=this.node();if(!node)
return Promise.resolve((null));var cssModel=this._cssModel;if(!this._computedStylePromise)
this._computedStylePromise=new Promise(getComputedStyle.bind(null,node)).then(verifyOutdated.bind(this,node));return this._computedStylePromise;function getComputedStyle(node,resolve)
{cssModel.getComputedStyleAsync(node.id,resolve);}
function verifyOutdated(node,style)
{return node!==this.node()?null:style;}},_getMatchedStylesForNode:function(node,callback)
{var target=node.target();this._cssModel.getInlineStylesAsync(node.id,inlineCallback);this._cssModel.getMatchedStylesAsync(node.id,false,false,matchedCallback);var payload=new WebInspector.StylesSidebarPane.MatchedRulesPayload();function inlineCallback(inlineStyle,attributesStyle)
{payload.inlineStyle=(inlineStyle);payload.attributesStyle=(attributesStyle);}
function matchedCallback(matchedResult)
{if(matchedResult){payload.matchedCSSRules=(matchedResult.matchedCSSRules);payload.pseudoElements=(matchedResult.pseudoElements);payload.inherited=(matchedResult.inherited);}
callback(payload);}},setEditingStyle:function(editing)
{if(this._isEditingStyle===editing)
return;this._isEditingStyle=editing;if(!editing&&this._pendingNode){this.setNode(this._pendingNode);delete this._pendingNode;}},_styleSheetOrMediaQueryResultChanged:function()
{if(this._userOperation||this._isEditingStyle){this._resetComputedCache();return;}
this._resetCache();this.update();},_frameResized:function()
{function refreshContents()
{this._styleSheetOrMediaQueryResultChanged();delete this._activeTimer;}
if(this._activeTimer)
clearTimeout(this._activeTimer);this._activeTimer=setTimeout(refreshContents.bind(this),100);},_attributeChanged:function(event)
{if(this._isEditingStyle||this._userOperation){this._resetComputedCache();return;}
if(!this._canAffectCurrentStyles(event.data.node))
return;this._resetCache();this.update();},_canAffectCurrentStyles:function(node)
{var currentNode=this.node();return currentNode&&(currentNode===node||node.parentNode===currentNode.parentNode||node.isAncestor(currentNode));},_innerRebuildUpdate:function(cascades)
{this._linkifier.reset();this._sectionsContainer.removeChildren();this._sectionBlocks=[];var node=this.node();if(!cascades||!node)
return;this._sectionBlocks=this._rebuildSectionsForMatchedStyleRules(cascades.matched);var pseudoIds=cascades.pseudo.keysArray().sort();for(var pseudoId of pseudoIds){var block=WebInspector.SectionBlock.createPseudoIdBlock(pseudoId);var cascade=cascades.pseudo.get(pseudoId);for(var sectionModel of cascade.sectionModels()){var section=new WebInspector.StylePropertiesSection(this,sectionModel);block.sections.push(section);}
this._sectionBlocks.push(block);}
if(!!node.pseudoType())
this._appendTopPadding();for(var block of this._sectionBlocks){var titleElement=block.titleElement();if(titleElement)
this._sectionsContainer.appendChild(titleElement);for(var section of block.sections)
this._sectionsContainer.appendChild(section.element);}
if(this._filterRegex)
this._updateFilter();this._nodeStylesUpdatedForTest(node,true);this._computedStylePane.update();},_buildPseudoCascades:function(node,styles)
{var pseudoCascades=new Map();for(var i=0;i<styles.pseudoElements.length;++i){var pseudoElementCSSRules=styles.pseudoElements[i];var pseudoId=pseudoElementCSSRules.pseudoId;var pseudoElementCascade=new WebInspector.SectionCascade();for(var j=pseudoElementCSSRules.rules.length-1;j>=0;--j){var rule=pseudoElementCSSRules.rules[j];pseudoElementCascade.appendModelFromRule(rule);}
pseudoCascades.set(pseudoId,pseudoElementCascade);}
return pseudoCascades;},_nodeStylesUpdatedForTest:function(node,rebuild)
{},_buildMatchedRulesSectionCascade:function(node,styles)
{var cascade=new WebInspector.SectionCascade();function addAttributesStyle()
{if(!styles.attributesStyle)
return;var selectorText=node.nodeNameInCorrectCase()+"["+WebInspector.UIString("Attributes Style")+"]";cascade.appendModelFromStyle(styles.attributesStyle,selectorText);}
if(styles.inlineStyle&&node.nodeType()===Node.ELEMENT_NODE){var model=cascade.appendModelFromStyle(styles.inlineStyle,"element.style");model.setIsAttribute(true);}
var addedAttributesStyle;for(var i=styles.matchedCSSRules.length-1;i>=0;--i){var rule=styles.matchedCSSRules[i];if((rule.isInjected||rule.isUserAgent)&&!addedAttributesStyle){addedAttributesStyle=true;addAttributesStyle();}
cascade.appendModelFromRule(rule);}
if(!addedAttributesStyle)
addAttributesStyle();var parentNode=node.parentNode;for(var parentOrdinal=0;parentOrdinal<styles.inherited.length;++parentOrdinal){var parentStyles=styles.inherited[parentOrdinal];if(parentStyles.inlineStyle){if(this._containsInherited(parentStyles.inlineStyle)){var model=cascade.appendModelFromStyle(parentStyles.inlineStyle,WebInspector.UIString("Style Attribute"),parentNode);model.setIsAttribute(true);}}
for(var i=parentStyles.matchedCSSRules.length-1;i>=0;--i){var rulePayload=parentStyles.matchedCSSRules[i];if(!this._containsInherited(rulePayload.style))
continue;cascade.appendModelFromRule(rulePayload,parentNode);}
parentNode=parentNode.parentNode;}
return cascade;},_appendTopPadding:function()
{var separatorElement=createElement("div");separatorElement.className="styles-sidebar-placeholder";this._sectionsContainer.appendChild(separatorElement);},_rebuildSectionsForMatchedStyleRules:function(matchedCascade)
{var blocks=[new WebInspector.SectionBlock(null)];var lastParentNode=null;for(var sectionModel of matchedCascade.sectionModels()){var parentNode=sectionModel.parentNode();if(parentNode&&parentNode!==lastParentNode){lastParentNode=parentNode;var block=WebInspector.SectionBlock.createInheritedNodeBlock(lastParentNode);blocks.push(block);}
var section=new WebInspector.StylePropertiesSection(this,sectionModel);blocks.peekLast().sections.push(section);}
return blocks;},_containsInherited:function(style)
{var properties=style.allProperties;for(var i=0;i<properties.length;++i){var property=properties[i];if(property.isLive&&WebInspector.CSSMetadata.isPropertyInherited(property.name))
return true;}
return false;},_createNewRuleInViaInspectorStyleSheet:function()
{var cssModel=this._cssModel;this._userOperation=true;cssModel.requestViaInspectorStylesheet(this.node(),onViaInspectorStyleSheet.bind(this));function onViaInspectorStyleSheet(styleSheetHeader)
{delete this._userOperation;this._createNewRuleInStyleSheet(styleSheetHeader);}},_createNewRuleInStyleSheet:function(styleSheetHeader)
{if(!styleSheetHeader)
return;styleSheetHeader.requestContent(onStyleSheetContent.bind(this,styleSheetHeader.id));function onStyleSheetContent(styleSheetId,text)
{var lines=text.split("\n");var range=WebInspector.TextRange.createFromLocation(lines.length-1,lines[lines.length-1].length);this._addBlankSection(this._sectionBlocks[0].sections[0],styleSheetId,range);}},_addBlankSection:function(insertAfterSection,styleSheetId,ruleLocation)
{this.expand();var node=this.node();var blankSection=new WebInspector.BlankStylePropertiesSection(this,node?WebInspector.DOMPresentationUtils.simpleSelector(node):"",styleSheetId,ruleLocation,insertAfterSection.styleRule);this._sectionsContainer.insertBefore(blankSection.element,insertAfterSection.element.nextSibling);for(var block of this._sectionBlocks){var index=block.sections.indexOf(insertAfterSection);if(index===-1)
continue;block.sections.splice(index+1,0,blankSection);blankSection.startEditingSelector();}},removeSection:function(section)
{for(var block of this._sectionBlocks){var index=block.sections.indexOf(section);if(index===-1)
continue;block.sections.splice(index,1);section.element.remove();}},_toggleElementStatePane:function()
{var buttonToggled=!this._elementStateButton.toggled();if(buttonToggled)
this.expand();this._elementStateButton.setToggled(buttonToggled);this._elementStatePane.classList.toggle("expanded",buttonToggled);if(!Runtime.experiments.isEnabled("animationInspection"))
this._animationsControlButton.setToggled(false);this._animationsControlPane.element.classList.remove("expanded");},_createElementStatePane:function()
{this._elementStatePane=createElement("div");this._elementStatePane.className="styles-element-state-pane source-code";var table=createElement("table");var inputs=[];this._elementStatePane.inputs=inputs;function clickListener(event)
{var node=this.node();if(!node)
return;WebInspector.CSSStyleModel.fromNode(node).forcePseudoState(node,event.target.state,event.target.checked);}
function createCheckbox(state)
{var td=createElement("td");var label=createCheckboxLabel(":"+state);var input=label.checkboxElement;input.state=state;input.addEventListener("click",clickListener.bind(this),false);inputs.push(input);td.appendChild(label);return td;}
var tr=table.createChild("tr");tr.appendChild(createCheckbox.call(this,"active"));tr.appendChild(createCheckbox.call(this,"hover"));tr=table.createChild("tr");tr.appendChild(createCheckbox.call(this,"focus"));tr.appendChild(createCheckbox.call(this,"visited"));this._elementStatePane.appendChild(table);},_toggleAnimationsControlPane:function()
{var buttonToggled=!this._animationsControlButton.toggled();if(buttonToggled)
this.expand();this._animationsControlButton.setToggled(buttonToggled);if(Runtime.experiments.isEnabled("animationInspection")){if(!this._animationTimeline)
this._animationTimeline=new WebInspector.AnimationTimeline();var elementsPanel=WebInspector.ElementsPanel.instance();elementsPanel.setWidgetBelowDOM(buttonToggled?this._animationTimeline:null);}else{this._animationsControlPane.element.classList.toggle("expanded",buttonToggled);this._elementStateButton.setToggled(false);this._elementStatePane.classList.remove("expanded");}},filterRegex:function()
{return this._filterRegex;},_updateFilter:function()
{for(var block of this._sectionBlocks)
block.updateFilter();},wasShown:function()
{WebInspector.ElementsSidebarPane.prototype.wasShown.call(this);this.element.ownerDocument.body.addEventListener("keydown",this._keyDownBound,false);this.element.ownerDocument.body.addEventListener("keyup",this._keyUpBound,false);},willHide:function()
{this.element.ownerDocument.body.removeEventListener("keydown",this._keyDownBound,false);this.element.ownerDocument.body.removeEventListener("keyup",this._keyUpBound,false);this._stylesPopoverHelper.hide();this._discardElementUnderMouse();WebInspector.ElementsSidebarPane.prototype.willHide.call(this);},_discardElementUnderMouse:function()
{if(this._elementUnderMouse)
this._elementUnderMouse.classList.remove("styles-panel-hovered");delete this._elementUnderMouse;},_mouseMovedOverElement:function(event)
{if(this._elementUnderMouse&&event.target!==this._elementUnderMouse)
this._discardElementUnderMouse();this._elementUnderMouse=event.target;if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta((event)))
this._elementUnderMouse.classList.add("styles-panel-hovered");},_keyDown:function(event)
{if((!WebInspector.isMac()&&event.keyCode===WebInspector.KeyboardShortcut.Keys.Ctrl.code)||(WebInspector.isMac()&&event.keyCode===WebInspector.KeyboardShortcut.Keys.Meta.code)){if(this._elementUnderMouse)
this._elementUnderMouse.classList.add("styles-panel-hovered");}},_keyUp:function(event)
{if((!WebInspector.isMac()&&event.keyCode===WebInspector.KeyboardShortcut.Keys.Ctrl.code)||(WebInspector.isMac()&&event.keyCode===WebInspector.KeyboardShortcut.Keys.Meta.code)){this._discardElementUnderMouse();}},__proto__:WebInspector.ElementsSidebarPane.prototype}
WebInspector.StylesSidebarPane.createPropertyFilterElement=function(placeholder,filterCallback)
{var input=createElement("input");input.type="search";input.placeholder=placeholder;function searchHandler()
{var regex=input.value?new RegExp(input.value.escapeForRegExp(),"i"):null;filterCallback(regex);input.parentNode.classList.toggle("styles-filter-engaged",!!input.value);}
input.addEventListener("input",searchHandler,false);function keydownHandler(event)
{var Esc="U+001B";if(event.keyIdentifier!==Esc||!input.value)
return;event.consume(true);input.value="";searchHandler();}
input.addEventListener("keydown",keydownHandler,false);input.setFilterValue=setFilterValue;function setFilterValue(value)
{input.value=value;input.focus();searchHandler();}
return input;}
WebInspector.SectionBlock=function(titleElement)
{this._titleElement=titleElement;this.sections=[];}
WebInspector.SectionBlock.createPseudoIdBlock=function(pseudoId)
{var separatorElement=createElement("div");separatorElement.className="sidebar-separator";var pseudoName=WebInspector.StylesSidebarPane.PseudoIdNames[pseudoId];if(pseudoName)
separatorElement.textContent=WebInspector.UIString("Pseudo ::%s element",pseudoName);else
separatorElement.textContent=WebInspector.UIString("Pseudo element");return new WebInspector.SectionBlock(separatorElement);}
WebInspector.SectionBlock.createInheritedNodeBlock=function(node)
{var separatorElement=createElement("div");separatorElement.className="sidebar-separator";var link=WebInspector.DOMPresentationUtils.linkifyNodeReference(node);separatorElement.createTextChild(WebInspector.UIString("Inherited from")+" ");separatorElement.appendChild(link);return new WebInspector.SectionBlock(separatorElement);}
WebInspector.SectionBlock.prototype={updateFilter:function()
{var hasAnyVisibleSection=false;for(var section of this.sections)
hasAnyVisibleSection|=section._updateFilter();if(this._titleElement)
this._titleElement.classList.toggle("hidden",!hasAnyVisibleSection);},titleElement:function()
{return this._titleElement;}}
WebInspector.StylePropertiesSection=function(parentPane,styleRule)
{this._parentPane=parentPane;this.styleRule=styleRule;this.editable=styleRule.editable();var rule=styleRule.rule();this.element=createElementWithClass("div","styles-section matched-styles monospace");this.element._section=this;this.titleElement=this.element.createChild("div","styles-section-title "+(rule?"styles-selector":""));this.propertiesTreeOutline=new TreeOutline();this.propertiesTreeOutline.element.classList.add("style-properties","monospace");this.propertiesTreeOutline.section=this;this.element.appendChild(this.propertiesTreeOutline.element);var selectorContainer=createElement("div");this._selectorElement=createElementWithClass("span","selector");this._selectorElement.textContent=styleRule.selectorText();selectorContainer.appendChild(this._selectorElement);var openBrace=createElement("span");openBrace.textContent=" {";selectorContainer.appendChild(openBrace);selectorContainer.addEventListener("mousedown",this._handleEmptySpaceMouseDown.bind(this),false);selectorContainer.addEventListener("click",this._handleSelectorContainerClick.bind(this),false);var closeBrace=createElement("div");closeBrace.textContent="}";this.element.appendChild(closeBrace);if(this.editable&&rule){var newRuleButton=closeBrace.createChild("div","sidebar-pane-button-new-rule");newRuleButton.title=WebInspector.UIString("Insert Style Rule");newRuleButton.addEventListener("click",this._onNewRuleClick.bind(this),false);}
this._selectorElement.addEventListener("click",this._handleSelectorClick.bind(this),false);this.element.addEventListener("mousedown",this._handleEmptySpaceMouseDown.bind(this),false);this.element.addEventListener("click",this._handleEmptySpaceClick.bind(this),false);if(rule){if(rule.isUserAgent||rule.isInjected){this.editable=false;}else{if(rule.styleSheetId)
this.navigable=!!rule.resourceURL();}}
this._selectorRefElement=createElementWithClass("div","styles-section-subtitle");this._mediaListElement=this.titleElement.createChild("div","media-list media-matches");this._updateMediaList();this._updateRuleOrigin();selectorContainer.insertBefore(this._selectorRefElement,selectorContainer.firstChild);this.titleElement.appendChild(selectorContainer);this._selectorContainer=selectorContainer;if(this.navigable)
this.element.classList.add("navigable");if(!this.editable)
this.element.classList.add("read-only");this._markSelectorMatches();this.onpopulate();}
WebInspector.StylePropertiesSection.prototype={firstSibling:function()
{var parent=this.element.parentElement;if(!parent)
return null;var childElement=parent.firstChild;while(childElement){if(childElement._section)
return childElement._section;childElement=childElement.nextSibling;}
return null;},lastSibling:function()
{var parent=this.element.parentElement;if(!parent)
return null;var childElement=parent.lastChild;while(childElement){if(childElement._section)
return childElement._section;childElement=childElement.previousSibling;}
return null;},nextSibling:function()
{var curElement=this.element;do{curElement=curElement.nextSibling;}while(curElement&&!curElement._section);return curElement?curElement._section:null;},previousSibling:function()
{var curElement=this.element;do{curElement=curElement.previousSibling;}while(curElement&&!curElement._section);return curElement?curElement._section:null;},rule:function()
{return this.styleRule.rule();},_onNewRuleClick:function(event)
{event.consume();var rule=this.rule();var range=WebInspector.TextRange.createFromLocation(rule.style.range.endLine,rule.style.range.endColumn+1);this._parentPane._addBlankSection(this,(rule.styleSheetId),range);},_styleSheetRuleEdited:function(editedRule,oldRange,newRange)
{var rule=this.rule();if(!rule||!rule.styleSheetId)
return;if(rule!==editedRule)
rule.sourceStyleSheetEdited((editedRule.styleSheetId),oldRange,newRange);this._updateMediaList();this._updateRuleOrigin();},_styleSheetMediaEdited:function(oldMedia,newMedia)
{var rule=this.rule();if(!rule||!rule.styleSheetId)
return;rule.mediaEdited(oldMedia,newMedia);this._updateMediaList();},_createMediaList:function(mediaRules)
{if(!mediaRules)
return;for(var i=mediaRules.length-1;i>=0;--i){var media=mediaRules[i];var mediaDataElement=this._mediaListElement.createChild("div","media");if(media.sourceURL){var refElement=mediaDataElement.createChild("div","subtitle");var anchor=this._parentPane._linkifier.linkifyMedia(media);refElement.appendChild(anchor);}
var mediaContainerElement=mediaDataElement.createChild("span");var mediaTextElement=mediaContainerElement.createChild("span","media-text");mediaTextElement.title=media.text;switch(media.source){case WebInspector.CSSMedia.Source.LINKED_SHEET:case WebInspector.CSSMedia.Source.INLINE_SHEET:mediaTextElement.textContent="media=\""+media.text+"\"";break;case WebInspector.CSSMedia.Source.MEDIA_RULE:var decoration=mediaContainerElement.createChild("span");mediaContainerElement.insertBefore(decoration,mediaTextElement);decoration.textContent="@media ";decoration.title=media.text;mediaTextElement.textContent=media.text;if(media.parentStyleSheetId){mediaDataElement.classList.add("editable-media");mediaTextElement.addEventListener("click",this._handleMediaRuleClick.bind(this,media,mediaTextElement),false);}
break;case WebInspector.CSSMedia.Source.IMPORT_RULE:mediaTextElement.textContent="@import "+media.text;break;}}},_updateMediaList:function()
{this._mediaListElement.removeChildren();this._createMediaList(this.styleRule.media());},isPropertyInherited:function(propertyName)
{if(this.styleRule.inherited()){return!WebInspector.CSSMetadata.isPropertyInherited(propertyName);}
return false;},nextEditableSibling:function()
{var curSection=this;do{curSection=curSection.nextSibling();}while(curSection&&!curSection.editable);if(!curSection){curSection=this.firstSibling();while(curSection&&!curSection.editable)
curSection=curSection.nextSibling();}
return(curSection&&curSection.editable)?curSection:null;},previousEditableSibling:function()
{var curSection=this;do{curSection=curSection.previousSibling();}while(curSection&&!curSection.editable);if(!curSection){curSection=this.lastSibling();while(curSection&&!curSection.editable)
curSection=curSection.previousSibling();}
return(curSection&&curSection.editable)?curSection:null;},update:function(full)
{if(this.styleRule.selectorText())
this._selectorElement.textContent=this.styleRule.selectorText();this._markSelectorMatches();if(full){this.propertiesTreeOutline.removeChildren();this.onpopulate();}else{var child=this.propertiesTreeOutline.firstChild();while(child){child.setOverloaded(this.styleRule.isPropertyOverloaded(child.name,child.isShorthand));child=child.traverseNextTreeElement(false,null,true);}}
this.afterUpdate();},afterUpdate:function()
{if(this._afterUpdate){this._afterUpdate(this);delete this._afterUpdate;this._afterUpdateFinishedForTest();}},_afterUpdateFinishedForTest:function()
{},onpopulate:function()
{var style=this.styleRule.style();var allProperties=style.allProperties;var styleHasEditableSource=this.editable&&!!style.range;if(styleHasEditableSource){for(var i=0;i<allProperties.length;++i){var property=allProperties[i];if(property.styleBased)
continue;var isShorthand=!!WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(property.name);var inherited=this.isPropertyInherited(property.name);var overloaded=property.inactive||this.styleRule.isPropertyOverloaded(property.name);var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this.styleRule,property,isShorthand,inherited,overloaded);this.propertiesTreeOutline.appendChild(item);}
return;}
var generatedShorthands={};for(var i=0;i<allProperties.length;++i){var property=allProperties[i];var isShorthand=!!WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(property.name);var shorthands=isShorthand?null:WebInspector.CSSMetadata.cssPropertiesMetainfo.shorthands(property.name);var shorthandPropertyAvailable=false;for(var j=0;shorthands&&!shorthandPropertyAvailable&&j<shorthands.length;++j){var shorthand=shorthands[j];if(shorthand in generatedShorthands){shorthandPropertyAvailable=true;continue;}
if(style.getLiveProperty(shorthand)){shorthandPropertyAvailable=true;continue;}
if(!style.shorthandValue(shorthand)){shorthandPropertyAvailable=false;continue;}
var shorthandProperty=new WebInspector.CSSProperty(style,style.allProperties.length,shorthand,style.shorthandValue(shorthand),false,false,true,true);var overloaded=property.inactive||this.styleRule.isPropertyOverloaded(property.name,true);var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this.styleRule,shorthandProperty,true,false,overloaded);this.propertiesTreeOutline.appendChild(item);generatedShorthands[shorthand]=shorthandProperty;shorthandPropertyAvailable=true;}
if(shorthandPropertyAvailable)
continue;var inherited=this.isPropertyInherited(property.name);var overloaded=property.inactive||this.styleRule.isPropertyOverloaded(property.name,isShorthand);var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this.styleRule,property,isShorthand,inherited,overloaded);this.propertiesTreeOutline.appendChild(item);}},_updateFilter:function()
{var hasMatchingChild=false;for(var child of this.propertiesTreeOutline.rootElement().children())
hasMatchingChild|=child._updateFilter();if(this.styleRule.isAttribute())
return true;var regex=this._parentPane.filterRegex();var hideRule=!hasMatchingChild&&regex&&!regex.test(this.element.textContent);this.element.classList.toggle("hidden",hideRule);if(!hideRule&&this.styleRule.rule())
this._markSelectorHighlights();return!hideRule;},_markSelectorMatches:function()
{var rule=this.styleRule.rule();if(!rule)
return;this._mediaListElement.classList.toggle("media-matches",this.styleRule.mediaMatches());if(!this.styleRule.hasMatchingSelectors())
return;var selectors=rule.selectors;var fragment=createDocumentFragment();var currentMatch=0;var matchingSelectors=rule.matchingSelectors;for(var i=0;i<selectors.length;++i){if(i)
fragment.createTextChild(", ");var isSelectorMatching=matchingSelectors[currentMatch]===i;if(isSelectorMatching)
++currentMatch;var matchingSelectorClass=isSelectorMatching?" selector-matches":"";var selectorElement=createElement("span");selectorElement.className="simple-selector"+matchingSelectorClass;if(rule.styleSheetId)
selectorElement._selectorIndex=i;selectorElement.textContent=selectors[i].value;fragment.appendChild(selectorElement);}
this._selectorElement.removeChildren();this._selectorElement.appendChild(fragment);this._markSelectorHighlights();},_markSelectorHighlights:function()
{var selectors=this._selectorElement.getElementsByClassName("simple-selector");var regex=this._parentPane.filterRegex();for(var i=0;i<selectors.length;++i){var selectorMatchesFilter=regex&&regex.test(selectors[i].textContent);selectors[i].classList.toggle("filter-match",selectorMatchesFilter);}},_checkWillCancelEditing:function()
{var willCauseCancelEditing=this._willCauseCancelEditing;delete this._willCauseCancelEditing;return willCauseCancelEditing;},_handleSelectorContainerClick:function(event)
{if(this._checkWillCancelEditing()||!this.editable)
return;if(event.target===this._selectorContainer){this.addNewBlankProperty(0).startEditing();event.consume(true);}},addNewBlankProperty:function(index)
{var property=this.styleRule.style().newBlankProperty(index);var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this.styleRule,property,false,false,false);index=property.index;this.propertiesTreeOutline.insertChild(item,index);item.listItemElement.textContent="";item._newProperty=true;item.updateTitle();return item;},_handleEmptySpaceMouseDown:function()
{this._willCauseCancelEditing=this._parentPane._isEditingStyle;},_handleEmptySpaceClick:function(event)
{if(!this.editable)
return;if(!event.target.isComponentSelectionCollapsed())
return;if(this._checkWillCancelEditing())
return;if(event.target.enclosingNodeOrSelfWithNodeName("a"))
return;if(event.target.classList.contains("header")||this.element.classList.contains("read-only")||event.target.enclosingNodeOrSelfWithClass("media")){event.consume();return;}
this.addNewBlankProperty().startEditing();event.consume(true);},_handleMediaRuleClick:function(media,element,event)
{if(WebInspector.isBeingEdited(element))
return;var config=new WebInspector.InplaceEditor.Config(this._editingMediaCommitted.bind(this,media),this._editingMediaCancelled.bind(this,element),undefined,this._editingMediaBlurHandler.bind(this));WebInspector.InplaceEditor.startEditing(element,config);element.getComponentSelection().setBaseAndExtent(element,0,element,1);this._parentPane.setEditingStyle(true);var parentMediaElement=element.enclosingNodeOrSelfWithClass("media");parentMediaElement.classList.add("editing-media");event.consume(true);},_editingMediaFinished:function(element)
{this._parentPane.setEditingStyle(false);var parentMediaElement=element.enclosingNodeOrSelfWithClass("media");parentMediaElement.classList.remove("editing-media");},_editingMediaCancelled:function(element)
{this._editingMediaFinished(element);this._markSelectorMatches();element.getComponentSelection().collapse(element,0);},_editingMediaBlurHandler:function(editor,blurEvent)
{return true;},_editingMediaCommitted:function(media,element,newContent,oldContent,context,moveDirection)
{this._parentPane.setEditingStyle(false);this._editingMediaFinished(element);if(newContent)
newContent=newContent.trim();function successCallback(newMedia)
{this._parentPane._styleSheetMediaEdited(media,newMedia);this._parentPane._refreshUpdate(this);finishOperation.call(this);}
function finishOperation()
{delete this._parentPane._userOperation;this._editingMediaTextCommittedForTest();}
this._parentPane._userOperation=true;this._parentPane._cssModel.setMediaText(media,newContent,successCallback.bind(this),finishOperation.bind(this));},_editingMediaTextCommittedForTest:function(){},_handleSelectorClick:function(event)
{if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta((event))&&this.navigable&&event.target.classList.contains("simple-selector")){var index=event.target._selectorIndex;var cssModel=this._parentPane._cssModel;var rule=this.rule();var rawLocation=new WebInspector.CSSLocation(cssModel,(rule.styleSheetId),rule.sourceURL,rule.lineNumberInSource(index),rule.columnNumberInSource(index));var uiLocation=WebInspector.cssWorkspaceBinding.rawLocationToUILocation(rawLocation);if(uiLocation)
WebInspector.Revealer.reveal(uiLocation);event.consume(true);return;}
this._startEditingOnMouseEvent();event.consume(true);},_startEditingOnMouseEvent:function()
{if(!this.editable)
return;if(!this.rule()&&!this.propertiesTreeOutline.rootElement().childCount()){this.addNewBlankProperty().startEditing();return;}
if(!this.rule())
return;this.startEditingSelector();},startEditingSelector:function()
{var element=this._selectorElement;if(WebInspector.isBeingEdited(element))
return;element.scrollIntoViewIfNeeded(false);element.textContent=element.textContent;var config=new WebInspector.InplaceEditor.Config(this.editingSelectorCommitted.bind(this),this.editingSelectorCancelled.bind(this),undefined,this._editingSelectorBlurHandler.bind(this));WebInspector.InplaceEditor.startEditing(this._selectorElement,config);element.getComponentSelection().setBaseAndExtent(element,0,element,1);this._parentPane.setEditingStyle(true);this._parentPane._startEditingSelector(this);},setSelectorText:function(text)
{this._selectorElement.textContent=text;this._selectorElement.getComponentSelection().setBaseAndExtent(this._selectorElement,0,this._selectorElement,1);},_editingSelectorBlurHandler:function(editor,blurEvent)
{if(!blurEvent.relatedTarget)
return true;var elementTreeOutline=blurEvent.relatedTarget.enclosingNodeOrSelfWithClass("elements-tree-outline");if(!elementTreeOutline)
return true;editor.focus();return false;},_moveEditorFromSelector:function(moveDirection)
{this._markSelectorMatches();if(!moveDirection)
return;if(moveDirection==="forward"){var firstChild=this.propertiesTreeOutline.firstChild();while(firstChild&&firstChild.inherited())
firstChild=firstChild.nextSibling;if(!firstChild)
this.addNewBlankProperty().startEditing();else
firstChild.startEditing(firstChild.nameElement);}else{var previousSection=this.previousEditableSibling();if(!previousSection)
return;previousSection.addNewBlankProperty().startEditing();}},editingSelectorCommitted:function(element,newContent,oldContent,context,moveDirection)
{this._editingSelectorEnded();if(newContent)
newContent=newContent.trim();if(newContent===oldContent){this._selectorElement.textContent=newContent;this._moveEditorFromSelector(moveDirection);return;}
function successCallback(newRule)
{var doesAffectSelectedNode=newRule.matchingSelectors.length>0;this.element.classList.toggle("no-affect",!doesAffectSelectedNode);var oldSelectorRange=this.rule().selectorRange;this.styleRule.updateRule(newRule);this._parentPane._refreshUpdate(this);this._parentPane._styleSheetRuleEdited(newRule,oldSelectorRange,newRule.selectorRange);finishOperationAndMoveEditor.call(this,moveDirection);}
function finishOperationAndMoveEditor(direction)
{delete this._parentPane._userOperation;this._moveEditorFromSelector(direction);this._editingSelectorCommittedForTest();}
this._parentPane._userOperation=true;var selectedNode=this._parentPane.node();this._parentPane._cssModel.setRuleSelector(this.rule(),selectedNode?selectedNode.id:0,newContent,successCallback.bind(this),finishOperationAndMoveEditor.bind(this,moveDirection));},_editingSelectorCommittedForTest:function(){},_updateRuleOrigin:function()
{this._selectorRefElement.removeChildren();this._selectorRefElement.appendChild(WebInspector.StylePropertiesSection.createRuleOriginNode(this._parentPane._cssModel,this._parentPane._linkifier,this.rule()));},_editingSelectorEnded:function()
{this._parentPane.setEditingStyle(false);this._parentPane._finishEditingSelector();},editingSelectorCancelled:function()
{this._editingSelectorEnded();this._markSelectorMatches();}}
WebInspector.StylePropertiesSection.createRuleOriginNode=function(cssModel,linkifier,rule)
{if(!rule)
return createTextNode("");var firstMatchingIndex=rule.matchingSelectors&&rule.matchingSelectors.length?rule.matchingSelectors[0]:0;var ruleLocation=rule.selectors[firstMatchingIndex].range;var header=rule.styleSheetId?cssModel.styleSheetHeaderForId(rule.styleSheetId):null;if(ruleLocation&&rule.styleSheetId&&header&&header.resourceURL())
return WebInspector.StylePropertiesSection._linkifyRuleLocation(cssModel,linkifier,rule.styleSheetId,ruleLocation);if(rule.isUserAgent)
return createTextNode(WebInspector.UIString("user agent stylesheet"));if(rule.isInjected)
return createTextNode(WebInspector.UIString("injected stylesheet"));if(rule.isViaInspector)
return createTextNode(WebInspector.UIString("via inspector"));if(header&&header.ownerNode){var link=WebInspector.DOMPresentationUtils.linkifyDeferredNodeReference(header.ownerNode);link.textContent="<style>…</style>";return link;}
return createTextNode("");}
WebInspector.StylePropertiesSection._linkifyRuleLocation=function(cssModel,linkifier,styleSheetId,ruleLocation)
{var styleSheetHeader=cssModel.styleSheetHeaderForId(styleSheetId);var sourceURL=styleSheetHeader.resourceURL();var lineNumber=styleSheetHeader.lineNumberInSource(ruleLocation.startLine);var columnNumber=styleSheetHeader.columnNumberInSource(ruleLocation.startLine,ruleLocation.startColumn);var matchingSelectorLocation=new WebInspector.CSSLocation(cssModel,styleSheetId,sourceURL,lineNumber,columnNumber);return linkifier.linkifyCSSLocation(matchingSelectorLocation);}
WebInspector.BlankStylePropertiesSection=function(stylesPane,defaultSelectorText,styleSheetId,ruleLocation,insertAfterStyleRule)
{var dummyCascade=new WebInspector.SectionCascade();var blankSectionModel=dummyCascade.appendModelFromStyle(WebInspector.CSSStyleDeclaration.createDummyStyle(stylesPane._cssModel),defaultSelectorText);blankSectionModel.setEditable(true);WebInspector.StylePropertiesSection.call(this,stylesPane,blankSectionModel);this._ruleLocation=ruleLocation;this._styleSheetId=styleSheetId;this._selectorRefElement.removeChildren();this._selectorRefElement.appendChild(WebInspector.StylePropertiesSection._linkifyRuleLocation(this._parentPane._cssModel,this._parentPane._linkifier,styleSheetId,this._actualRuleLocation()));if(insertAfterStyleRule)
this._createMediaList(insertAfterStyleRule.media());this._insertAfterStyleRule=insertAfterStyleRule;this.element.classList.add("blank-section");}
WebInspector.BlankStylePropertiesSection.prototype={_actualRuleLocation:function()
{var prefix=this._rulePrefix();var lines=prefix.split("\n");var editRange=new WebInspector.TextRange(0,0,lines.length-1,lines.peekLast().length);return this._ruleLocation.rebaseAfterTextEdit(WebInspector.TextRange.createFromLocation(0,0),editRange);},_rulePrefix:function()
{return this._ruleLocation.startLine===0&&this._ruleLocation.startColumn===0?"":"\n\n";},get isBlank()
{return!this._normal;},editingSelectorCommitted:function(element,newContent,oldContent,context,moveDirection)
{if(!this.isBlank){WebInspector.StylePropertiesSection.prototype.editingSelectorCommitted.call(this,element,newContent,oldContent,context,moveDirection);return;}
function successCallback(newRule)
{var doesSelectorAffectSelectedNode=newRule.matchingSelectors.length>0;this._makeNormal(newRule);if(!doesSelectorAffectSelectedNode)
this.element.classList.add("no-affect");var ruleTextLines=ruleText.split("\n");var startLine=this._ruleLocation.startLine;var startColumn=this._ruleLocation.startColumn;var newRange=new WebInspector.TextRange(startLine,startColumn,startLine+ruleTextLines.length-1,startColumn+ruleTextLines[ruleTextLines.length-1].length);this._parentPane._styleSheetRuleEdited(newRule,this._ruleLocation,newRange);this._updateRuleOrigin();if(this.element.parentElement)
this._moveEditorFromSelector(moveDirection);delete this._parentPane._userOperation;this._editingSelectorEnded();this._markSelectorMatches();this._editingSelectorCommittedForTest();}
function failureCallback()
{this.editingSelectorCancelled();this._editingSelectorCommittedForTest();}
if(newContent)
newContent=newContent.trim();this._parentPane._userOperation=true;var cssModel=this._parentPane._cssModel;var ruleText=this._rulePrefix()+newContent+" {}";cssModel.addRule(this._styleSheetId,this._parentPane.node(),ruleText,this._ruleLocation,successCallback.bind(this),failureCallback.bind(this));},editingSelectorCancelled:function()
{delete this._parentPane._userOperation;if(!this.isBlank){WebInspector.StylePropertiesSection.prototype.editingSelectorCancelled.call(this);return;}
this._editingSelectorEnded();this._parentPane.removeSection(this);},_makeNormal:function(newRule)
{this.element.classList.remove("blank-section");var model=this._insertAfterStyleRule.cascade().insertModelFromRule(newRule,this._insertAfterStyleRule);this.styleRule=model;this._normal=true;},__proto__:WebInspector.StylePropertiesSection.prototype}
WebInspector.StylePropertyTreeElement=function(stylesPane,styleRule,property,isShorthand,inherited,overloaded)
{TreeElement.call(this,"",isShorthand);this._styleRule=styleRule;this.property=property;this._inherited=inherited;this._overloaded=overloaded;this.selectable=false;this._parentPane=stylesPane;this.isShorthand=isShorthand;this._applyStyleThrottler=new WebInspector.Throttler(0);}
WebInspector.StylePropertyTreeElement.Context;WebInspector.StylePropertyTreeElement.prototype={style:function()
{return this._styleRule.style();},inherited:function()
{return this._inherited;},overloaded:function()
{return this._overloaded;},setOverloaded:function(x)
{if(x===this._overloaded)
return;this._overloaded=x;this._updateState();},get name()
{return this.property.name;},get value()
{return this.property.value;},_updateFilter:function()
{var regex=this._parentPane.filterRegex();var matches=!!regex&&(regex.test(this.property.name)||regex.test(this.property.value));this.listItemElement.classList.toggle("filter-match",matches);this.onpopulate();var hasMatchingChildren=false;for(var i=0;i<this.childCount();++i)
hasMatchingChildren|=this.childAt(i)._updateFilter();if(!regex){if(this._expandedDueToFilter)
this.collapse();this._expandedDueToFilter=false;}else if(hasMatchingChildren&&!this.expanded){this.expand();this._expandedDueToFilter=true;}else if(!hasMatchingChildren&&this.expanded&&this._expandedDueToFilter){this.collapse();this._expandedDueToFilter=false;}
return matches;},_processColor:function(text)
{var color=WebInspector.Color.parse(text);if(!color)
return createTextNode(text);if(!this._styleRule.editable()){var swatch=WebInspector.ColorSwatch.create();swatch.setColorText(text);return swatch;}
var stylesPopoverHelper=this._parentPane._stylesPopoverHelper;return new WebInspector.ColowSwatchPopoverIcon(this,stylesPopoverHelper,text).element();},renderedPropertyText:function()
{return this.nameElement.textContent+": "+this.valueElement.textContent;},_processBezier:function(text)
{var geometry=WebInspector.Geometry.CubicBezier.parse(text);if(!geometry||!this._styleRule.editable())
return createTextNode(text);var stylesPopoverHelper=this._parentPane._stylesPopoverHelper;return new WebInspector.BezierPopoverIcon(this,stylesPopoverHelper,text).element();},_updateState:function()
{if(!this.listItemElement)
return;if(this.style().isPropertyImplicit(this.name))
this.listItemElement.classList.add("implicit");else
this.listItemElement.classList.remove("implicit");var hasIgnorableError=!this.property.parsedOk&&WebInspector.StylesSidebarPane.ignoreErrorsForProperty(this.property);if(hasIgnorableError)
this.listItemElement.classList.add("has-ignorable-error");else
this.listItemElement.classList.remove("has-ignorable-error");if(this.inherited())
this.listItemElement.classList.add("inherited");else
this.listItemElement.classList.remove("inherited");if(this.overloaded())
this.listItemElement.classList.add("overloaded");else
this.listItemElement.classList.remove("overloaded");if(this.property.disabled)
this.listItemElement.classList.add("disabled");else
this.listItemElement.classList.remove("disabled");},node:function()
{return this._parentPane.node();},parentPane:function()
{return this._parentPane;},section:function()
{return this.treeOutline&&this.treeOutline.section;},_updatePane:function()
{var section=this.section();if(section&&section._parentPane)
section._parentPane._refreshUpdate(section);},_applyNewStyle:function(newStyle)
{var oldStyleRange=(this.style().range);var newStyleRange=(newStyle.range);this._styleRule.updateStyleDeclaration(newStyle);if(this._styleRule.rule())
this._parentPane._styleSheetRuleEdited((this._styleRule.rule()),oldStyleRange,newStyleRange);},_toggleEnabled:function(event)
{var disabled=!event.target.checked;function callback(newStyle)
{delete this._parentPane._userOperation;if(!newStyle)
return;this._applyNewStyle(newStyle);this._updatePane();this.styleTextAppliedForTest();}
this._parentPane._userOperation=true;this.property.setDisabled(disabled,callback.bind(this));event.consume();},onpopulate:function()
{if(this.childCount()||!this.isShorthand)
return;var longhandProperties=this.style().longhandProperties(this.name);for(var i=0;i<longhandProperties.length;++i){var name=longhandProperties[i].name;var inherited=false;var overloaded=false;var section=this.section();if(section){inherited=section.isPropertyInherited(name);overloaded=section.styleRule.isPropertyOverloaded(name);}
var liveProperty=this.style().getLiveProperty(name);if(!liveProperty)
continue;var item=new WebInspector.StylePropertyTreeElement(this._parentPane,this._styleRule,liveProperty,false,inherited,overloaded);this.appendChild(item);}},onattach:function()
{this.updateTitle();this.listItemElement.addEventListener("mousedown",this._mouseDown.bind(this));this.listItemElement.addEventListener("mouseup",this._resetMouseDownElement.bind(this));this.listItemElement.addEventListener("click",this._mouseClick.bind(this));},_mouseDown:function(event)
{if(this._parentPane){this._parentPane._mouseDownTreeElement=this;this._parentPane._mouseDownTreeElementIsName=this.nameElement&&this.nameElement.isSelfOrAncestor(event.target);this._parentPane._mouseDownTreeElementIsValue=this.valueElement&&this.valueElement.isSelfOrAncestor(event.target);}},_resetMouseDownElement:function()
{if(this._parentPane){delete this._parentPane._mouseDownTreeElement;delete this._parentPane._mouseDownTreeElementIsName;delete this._parentPane._mouseDownTreeElementIsValue;}},updateTitle:function()
{this._updateState();this._expandElement=createElement("span");this._expandElement.className="expand-element";var propertyRenderer=new WebInspector.StylesSidebarPropertyRenderer(this._styleRule.rule(),this.node(),this.name,this.value);if(this.property.parsedOk){propertyRenderer.setColorHandler(this._processColor.bind(this));propertyRenderer.setBezierHandler(this._processBezier.bind(this));}
this.listItemElement.removeChildren();this.nameElement=propertyRenderer.renderName();this.nameElement.title=this.property.propertyText;this.valueElement=propertyRenderer.renderValue();if(!this.treeOutline)
return;var indent=WebInspector.moduleSetting("textEditorIndent").get();this.listItemElement.createChild("span","styles-clipboard-only").createTextChild(indent+(this.property.disabled?"/* ":""));this.listItemElement.appendChild(this.nameElement);this.listItemElement.createTextChild(": ");this.listItemElement.appendChild(this._expandElement);this.listItemElement.appendChild(this.valueElement);this.listItemElement.createTextChild(";");if(this.property.disabled)
this.listItemElement.createChild("span","styles-clipboard-only").createTextChild(" */");if(!this.property.parsedOk){this.listItemElement.classList.add("not-parsed-ok");this.listItemElement.insertBefore(WebInspector.StylesSidebarPane.createExclamationMark(this.property),this.listItemElement.firstChild);}
if(this.property.inactive)
this.listItemElement.classList.add("inactive");this._updateFilter();if(this.property.parsedOk&&this.section()&&this.parent.root){var enabledCheckboxElement=createElement("input");enabledCheckboxElement.className="enabled-button";enabledCheckboxElement.type="checkbox";enabledCheckboxElement.checked=!this.property.disabled;enabledCheckboxElement.addEventListener("click",this._toggleEnabled.bind(this),false);this.listItemElement.insertBefore(enabledCheckboxElement,this.listItemElement.firstChild);}},_mouseClick:function(event)
{if(!event.target.isComponentSelectionCollapsed())
return;event.consume(true);if(event.target===this.listItemElement){var section=this.section();if(!section||!section.editable)
return;if(section._checkWillCancelEditing())
return;section.addNewBlankProperty(this.property.index+1).startEditing();return;}
if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta((event))&&this.section().navigable){this._navigateToSource((event.target));return;}
this.startEditing((event.target));},_navigateToSource:function(element)
{console.assert(this.section().navigable);var propertyNameClicked=element===this.nameElement;var uiLocation=WebInspector.cssWorkspaceBinding.propertyUILocation(this.property,propertyNameClicked);if(uiLocation)
WebInspector.Revealer.reveal(uiLocation);},startEditing:function(selectElement)
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
var context={expanded:this.expanded,hasChildren:this.isExpandable(),isEditingName:isEditingName,previousContent:selectElement.textContent};this.setExpandable(false);if(selectElement.parentElement)
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
this._originalPropertyText=this.property.propertyText;this._parentPane.setEditingStyle(true);if(selectElement.parentElement)
selectElement.parentElement.scrollIntoViewIfNeeded(false);var applyItemCallback=!isEditingName?this._applyFreeFlowStyleTextEdit.bind(this):undefined;this._prompt=new WebInspector.StylesSidebarPane.CSSPropertyPrompt(isEditingName?WebInspector.CSSMetadata.cssPropertiesMetainfo:WebInspector.CSSMetadata.keywordsForProperty(this.nameElement.textContent),this,isEditingName);this._prompt.setAutocompletionTimeout(0);if(applyItemCallback){this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemApplied,applyItemCallback,this);this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemAccepted,applyItemCallback,this);}
var proxyElement=this._prompt.attachAndStartEditing(selectElement,blurListener.bind(this,context));proxyElement.addEventListener("keydown",this._editingNameValueKeyDown.bind(this,context),false);proxyElement.addEventListener("keypress",this._editingNameValueKeyPress.bind(this,context),false);proxyElement.addEventListener("input",this._editingNameValueInput.bind(this,context),false);if(isEditingName)
proxyElement.addEventListener("paste",pasteHandler.bind(this,context),false);selectElement.getComponentSelection().setBaseAndExtent(selectElement,0,selectElement,1);},_editingNameValueKeyDown:function(context,event)
{if(event.handled)
return;var result;if(isEnterKey(event)){event.preventDefault();result="forward";}else if(event.keyCode===WebInspector.KeyboardShortcut.Keys.Esc.code||event.keyIdentifier==="U+001B")
result="cancel";else if(!context.isEditingName&&this._newProperty&&event.keyCode===WebInspector.KeyboardShortcut.Keys.Backspace.code){var selection=event.target.getComponentSelection();if(selection.isCollapsed&&!selection.focusOffset){event.preventDefault();result="backward";}}else if(event.keyIdentifier==="U+0009"){result=event.shiftKey?"backward":"forward";event.preventDefault();}
if(result){switch(result){case"cancel":this.editingCancelled(null,context);break;case"forward":case"backward":this.editingCommitted(event.target.textContent,context,result);break;}
event.consume();return;}},_editingNameValueKeyPress:function(context,event)
{function shouldCommitValueSemicolon(text,cursorPosition)
{var openQuote="";for(var i=0;i<cursorPosition;++i){var ch=text[i];if(ch==="\\"&&openQuote!=="")
++i;else if(!openQuote&&(ch==="\""||ch==="'"))
openQuote=ch;else if(openQuote===ch)
openQuote="";}
return!openQuote;}
var keyChar=String.fromCharCode(event.charCode);var isFieldInputTerminated=(context.isEditingName?keyChar===":":keyChar===";"&&shouldCommitValueSemicolon(event.target.textContent,event.target.selectionLeftOffset()));if(isFieldInputTerminated){event.consume(true);this.editingCommitted(event.target.textContent,context,"forward");return;}},_editingNameValueInput:function(context,event)
{if(!context.isEditingName&&(!this._parentPane.node().pseudoType()||this.name!=="content"))
this._applyFreeFlowStyleTextEdit();},_applyFreeFlowStyleTextEdit:function()
{var valueText=this.valueElement.textContent;if(valueText.indexOf(";")===-1)
this.applyStyleText(this.nameElement.textContent+": "+valueText,false);},kickFreeFlowStyleEditForTest:function()
{this._applyFreeFlowStyleTextEdit();},editingEnded:function(context)
{delete this._originalPropertyText;this._resetMouseDownElement();this.setExpandable(context.hasChildren);if(context.expanded)
this.expand();var editedElement=context.isEditingName?this.nameElement:this.valueElement;if(editedElement.parentElement)
editedElement.parentElement.classList.remove("child-editing");this._parentPane.setEditingStyle(false);},editingCancelled:function(element,context)
{this._removePrompt();this._revertStyleUponEditingCanceled();this.editingEnded(context);},_revertStyleUponEditingCanceled:function()
{if(this._propertyHasBeenEditedIncrementally)
this.applyStyleText(this._originalPropertyText,false);else if(this._newProperty)
this.treeOutline.removeChild(this);else
this.updateTitle();},_findSibling:function(moveDirection)
{var target=this;do{target=(moveDirection==="forward"?target.nextSibling:target.previousSibling);}while(target&&target.inherited());return target;},editingCommitted:function(userInput,context,moveDirection)
{this._removePrompt();this.editingEnded(context);var isEditingName=context.isEditingName;var createNewProperty,moveToPropertyName,moveToSelector;var isDataPasted="originalName"in context;var isDirtyViaPaste=isDataPasted&&(this.nameElement.textContent!==context.originalName||this.valueElement.textContent!==context.originalValue);var isPropertySplitPaste=isDataPasted&&isEditingName&&this.valueElement.textContent!==context.originalValue;var moveTo=this;var moveToOther=(isEditingName^(moveDirection==="forward"));var abandonNewProperty=this._newProperty&&!userInput&&(moveToOther||isEditingName);if(moveDirection==="forward"&&(!isEditingName||isPropertySplitPaste)||moveDirection==="backward"&&isEditingName){moveTo=moveTo._findSibling(moveDirection);if(moveTo)
moveToPropertyName=moveTo.name;else if(moveDirection==="forward"&&(!this._newProperty||userInput))
createNewProperty=true;else if(moveDirection==="backward")
moveToSelector=true;}
var moveToIndex=moveTo&&this.treeOutline?this.treeOutline.rootElement().indexOfChild(moveTo):-1;var blankInput=/^\s*$/.test(userInput);var shouldCommitNewProperty=this._newProperty&&(isPropertySplitPaste||moveToOther||(!moveDirection&&!isEditingName)||(isEditingName&&blankInput));var section=(this.section());if(((userInput!==context.previousContent||isDirtyViaPaste)&&!this._newProperty)||shouldCommitNewProperty){section._afterUpdate=moveToNextCallback.bind(this,this._newProperty,!blankInput,section);var propertyText;if(blankInput||(this._newProperty&&/^\s*$/.test(this.valueElement.textContent)))
propertyText="";else{if(isEditingName)
propertyText=userInput+": "+this.property.value;else
propertyText=this.property.name+": "+userInput;}
this.applyStyleText(propertyText,true);}else{if(isEditingName)
this.property.name=userInput;else
this.property.value=userInput;if(!isDataPasted&&!this._newProperty)
this.updateTitle();moveToNextCallback.call(this,this._newProperty,false,section);}
function moveToNextCallback(alreadyNew,valueChanged,section)
{if(!moveDirection)
return;if(moveTo&&moveTo.parent){moveTo.startEditing(!isEditingName?moveTo.nameElement:moveTo.valueElement);return;}
if(moveTo&&!moveTo.parent){var rootElement=section.propertiesTreeOutline.rootElement();if(moveDirection==="forward"&&blankInput&&!isEditingName)
--moveToIndex;if(moveToIndex>=rootElement.childCount()&&!this._newProperty)
createNewProperty=true;else{var treeElement=moveToIndex>=0?rootElement.childAt(moveToIndex):null;if(treeElement){var elementToEdit=!isEditingName||isPropertySplitPaste?treeElement.nameElement:treeElement.valueElement;if(alreadyNew&&blankInput)
elementToEdit=moveDirection==="forward"?treeElement.nameElement:treeElement.valueElement;treeElement.startEditing(elementToEdit);return;}else if(!alreadyNew)
moveToSelector=true;}}
if(createNewProperty){if(alreadyNew&&!valueChanged&&(isEditingName^(moveDirection==="backward")))
return;section.addNewBlankProperty().startEditing();return;}
if(abandonNewProperty){moveTo=this._findSibling(moveDirection);var sectionToEdit=(moveTo||moveDirection==="backward")?section:section.nextEditableSibling();if(sectionToEdit){if(sectionToEdit.rule())
sectionToEdit.startEditingSelector();else
sectionToEdit._moveEditorFromSelector(moveDirection);}
return;}
if(moveToSelector){if(section.rule())
section.startEditingSelector();else
section._moveEditorFromSelector(moveDirection);}}},_removePrompt:function()
{if(this._prompt){this._prompt.detach();delete this._prompt;}},styleTextAppliedForTest:function(){},applyStyleText:function(styleText,majorChange)
{this._applyStyleThrottler.schedule(this._innerApplyStyleText.bind(this,styleText,majorChange));},_innerApplyStyleText:function(styleText,majorChange,finishedCallback)
{if(!this.treeOutline){finishedCallback();return;}
styleText=styleText.replace(/\s/g," ").trim();if(!styleText.length&&majorChange&&this._newProperty&&!this._propertyHasBeenEditedIncrementally){var section=this.section();this.parent.removeChild(this);section.afterUpdate();return;}
var currentNode=this._parentPane.node();this._parentPane._userOperation=true;function callback(newStyle)
{delete this._parentPane._userOperation;if(!newStyle){if(majorChange){this._revertStyleUponEditingCanceled();}
finishedCallback();this.styleTextAppliedForTest();return;}
this._applyNewStyle(newStyle);this._propertyHasBeenEditedIncrementally=true;this.property=newStyle.propertyAt(this.property.index);if(!this._parentPane._isEditingStyle&&currentNode===this.node())
this._updatePane();finishedCallback();this.styleTextAppliedForTest();}
if(styleText.length&&!/;\s*$/.test(styleText))
styleText+=";";var overwriteProperty=!this._newProperty||this._propertyHasBeenEditedIncrementally;this.property.setText(styleText,majorChange,overwriteProperty,callback.bind(this));},ondblclick:function()
{return true;},isEventWithinDisclosureTriangle:function(event)
{return event.target===this._expandElement;},__proto__:TreeElement.prototype}
WebInspector.StylesSidebarPane.CSSPropertyPrompt=function(cssCompletions,treeElement,isEditingName)
{WebInspector.TextPrompt.call(this,this._buildPropertyCompletions.bind(this),WebInspector.StyleValueDelimiters);this.setSuggestBoxEnabled(true);this._cssCompletions=cssCompletions;this._treeElement=treeElement;this._isEditingName=isEditingName;if(!isEditingName)
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
{this._treeElement.applyStyleText(this._treeElement.nameElement.textContent+": "+this._treeElement.valueElement.textContent,false);}
function customNumberHandler(prefix,number,suffix)
{if(number!==0&&!suffix.length&&WebInspector.CSSMetadata.isLengthProperty(this._treeElement.property.name))
suffix="px";return prefix+number+suffix;}
if(!this._isEditingName&&WebInspector.handleElementValueModifications(event,this._treeElement.valueElement,finishHandler.bind(this),this._isValueSuggestion.bind(this),customNumberHandler.bind(this)))
return true;return false;},_isValueSuggestion:function(word)
{if(!word)
return false;word=word.toLowerCase();return this._cssCompletions.keySet().hasOwnProperty(word);},_buildPropertyCompletions:function(proxyElement,wordRange,force,completionsReadyCallback)
{var prefix=wordRange.toString().toLowerCase();if(!prefix&&!force&&(this._isEditingName||proxyElement.textContent.length)){completionsReadyCallback([]);return;}
var results=this._cssCompletions.startsWith(prefix);if(!this._isEditingName&&!results.length&&prefix.length>1&&"!important".startsWith(prefix))
results.push("!important");var userEnteredText=wordRange.toString().replace("-","");if(userEnteredText&&(userEnteredText===userEnteredText.toUpperCase())){for(var i=0;i<results.length;++i)
results[i]=results[i].toUpperCase();}
var selectedIndex=this._cssCompletions.mostUsedOf(results);completionsReadyCallback(results,selectedIndex);},__proto__:WebInspector.TextPrompt.prototype}
WebInspector.StylesSidebarPropertyRenderer=function(rule,node,name,value)
{this._rule=rule;this._node=node;this._propertyName=name;this._propertyValue=value;}
WebInspector.StylesSidebarPropertyRenderer._colorRegex=/((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b\w+\b(?!-))/g;WebInspector.StylesSidebarPropertyRenderer._bezierRegex=/((cubic-bezier\([^)]+\))|\b(linear|ease-in-out|ease-in|ease-out|ease)\b)/g;WebInspector.StylesSidebarPropertyRenderer._urlRegex=function(value)
{if(/url\(\s*'.*\s*'\s*\)/.test(value))
return/url\(\s*('.+')\s*\)/g;if(/url\(\s*".*\s*"\s*\)/.test(value))
return/url\(\s*(".+")\s*\)/g;return/url\(\s*([^)]+)\s*\)/g;}
WebInspector.StylesSidebarPropertyRenderer.prototype={setColorHandler:function(handler)
{this._colorHandler=handler;},setBezierHandler:function(handler)
{this._bezierHandler=handler;},renderName:function()
{var nameElement=createElement("span");nameElement.className="webkit-css-property";nameElement.textContent=this._propertyName;nameElement.normalize();return nameElement;},renderValue:function()
{var valueElement=createElement("span");valueElement.className="value";if(!this._propertyValue)
return valueElement;var formatter=new WebInspector.StringFormatter();formatter.addProcessor(WebInspector.StylesSidebarPropertyRenderer._urlRegex(this._propertyValue),this._processURL.bind(this));if(this._bezierHandler&&WebInspector.CSSMetadata.isBezierAwareProperty(this._propertyName))
formatter.addProcessor(WebInspector.StylesSidebarPropertyRenderer._bezierRegex,this._bezierHandler);if(this._colorHandler&&WebInspector.CSSMetadata.isColorAwareProperty(this._propertyName))
formatter.addProcessor(WebInspector.StylesSidebarPropertyRenderer._colorRegex,this._colorHandler);valueElement.appendChild(formatter.formatText(this._propertyValue));valueElement.normalize();return valueElement;},_processURL:function(url)
{var hrefUrl=url;var match=hrefUrl.match(/['"]?([^'"]+)/);if(match)
hrefUrl=match[1];var container=createDocumentFragment();container.createTextChild("url(");if(this._rule&&this._rule.resourceURL())
hrefUrl=WebInspector.ParsedURL.completeURL(this._rule.resourceURL(),hrefUrl);else if(this._node)
hrefUrl=this._node.resolveURL(hrefUrl);var hasResource=hrefUrl&&!!WebInspector.resourceForURL(hrefUrl);container.appendChild(WebInspector.linkifyURLAsNode(hrefUrl||url,url,undefined,!hasResource));container.createTextChild(")");return container;}}
WebInspector.StylesSidebarPane.MatchedRulesPayload=function()
{this.inlineStyle=null;this.attributesStyle=null;this.matchedCSSRules=null;this.pseudoElements=null;this.inherited=null;}
WebInspector.StylesSidebarPane.MatchedRulesPayload.prototype={fulfilled:function()
{return!!(this.matchedCSSRules&&this.pseudoElements&&this.inherited);}};WebInspector.ComputedStyleSidebarPane=function()
{WebInspector.ElementsSidebarPane.call(this,WebInspector.UIString("Computed Style"));this.registerRequiredCSS("elements/computedStyleSidebarPane.css");this._alwaysShowComputedProperties={"display":true,"height":true,"width":true};this._showInheritedComputedStylePropertiesSetting=WebInspector.settings.createSetting("showInheritedComputedStyleProperties",false);var inheritedCheckBox=WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show inherited properties"),this._showInheritedComputedStylePropertiesSetting,true);inheritedCheckBox.classList.add("checkbox-with-label");this.bodyElement.appendChild(inheritedCheckBox);this.bodyElement.classList.add("computed-style-sidebar-pane");this._showInheritedComputedStylePropertiesSetting.addChangeListener(this._showInheritedComputedStyleChanged.bind(this));this._propertiesContainer=this.bodyElement.createChild("div","monospace");this._propertiesContainer.classList.add("computed-properties");this._onTracePropertyBound=this._onTraceProperty.bind(this);}
WebInspector.ComputedStyleSidebarPane._propertySymbol=Symbol("property");WebInspector.ComputedStyleSidebarPane.prototype={_onTraceProperty:function(event)
{var item=event.target.enclosingNodeOrSelfWithClass("computed-style-property");var property=item&&item[WebInspector.ComputedStyleSidebarPane._propertySymbol];if(!property)
return;this._stylesSidebarPane.tracePropertyName(property.name);},_showInheritedComputedStyleChanged:function()
{this.update();},setNode:function(node)
{if(node)
this._target=node.target();WebInspector.ElementsSidebarPane.prototype.setNode.call(this,node);},doUpdate:function(finishedCallback)
{var promises=[this._stylesSidebarPane._fetchComputedStyle(),this._stylesSidebarPane._fetchMatchedCascade()];Promise.all(promises).spread(this._innerRebuildUpdate.bind(this)).then(finishedCallback);},_processColor:function(text)
{var color=WebInspector.Color.parse(text);if(!color)
return createTextNode(text);var swatch=WebInspector.ColorSwatch.create();swatch.setColorText(text);return swatch;},_innerRebuildUpdate:function(computedStyle,cascades)
{this._propertiesContainer.removeChildren();if(!computedStyle||!cascades)
return;var uniqueProperties=computedStyle.allProperties.slice();uniqueProperties.sort(propertySorter);var showInherited=this._showInheritedComputedStylePropertiesSetting.get();for(var i=0;i<uniqueProperties.length;++i){var property=uniqueProperties[i];var inherited=this._isPropertyInherited(cascades.matched,property.name);if(!showInherited&&inherited&&!(property.name in this._alwaysShowComputedProperties))
continue;var canonicalName=WebInspector.CSSMetadata.canonicalPropertyName(property.name);if(property.name!==canonicalName&&property.value===computedStyle.getPropertyValue(canonicalName))
continue;var item=this._propertiesContainer.createChild("div","computed-style-property");item[WebInspector.ComputedStyleSidebarPane._propertySymbol]=property;item.classList.toggle("computed-style-property-inherited",inherited);var renderer=new WebInspector.StylesSidebarPropertyRenderer(null,this.node(),property.name,property.value);renderer.setColorHandler(this._processColor.bind(this));if(!inherited){var traceButton=item.createChild("div","computed-style-trace-button");traceButton.createChild("div","glyph");traceButton.addEventListener("click",this._onTracePropertyBound,false);}
item.appendChild(renderer.renderName());item.appendChild(createTextNode(": "));item.appendChild(renderer.renderValue());item.appendChild(createTextNode(";"));this._propertiesContainer.appendChild(item);}
function propertySorter(a,b)
{var canonicalName=WebInspector.CSSMetadata.canonicalPropertyName;return canonicalName(a.name).compareTo(canonicalName(b.name));}},_isPropertyInherited:function(matchedCascade,propertyName)
{var canonicalName=WebInspector.CSSMetadata.canonicalPropertyName(propertyName);return!matchedCascade.allUsedProperties().has(canonicalName);},_updateFilter:function(regex)
{for(var i=0;i<this._propertiesContainer.children.length;++i){var item=this._propertiesContainer.children[i];var property=item[WebInspector.ComputedStyleSidebarPane._propertySymbol];var matched=!regex||regex.test(property.name)||regex.test(property.value);item.classList.toggle("hidden",!matched);}},setHostingPane:function(pane)
{this._stylesSidebarPane=pane;},setFilterBoxContainer:function(element)
{element.appendChild(WebInspector.StylesSidebarPane.createPropertyFilterElement(WebInspector.UIString("Filter"),filterCallback.bind(this)));function filterCallback(regex)
{this._filterRegex=regex;this._updateFilter(regex);}},__proto__:WebInspector.ElementsSidebarPane.prototype};WebInspector.ElementsPanel=function()
{WebInspector.Panel.call(this,"elements");this.registerRequiredCSS("elements/elementsPanel.css");this._splitWidget=new WebInspector.SplitWidget(true,true,"elementsPanelSplitViewState",325,325);this._splitWidget.addEventListener(WebInspector.SplitWidget.Events.SidebarSizeChanged,this._updateTreeOutlineVisibleWidth.bind(this));this._splitWidget.show(this.element);this._searchableView=new WebInspector.SearchableView(this);this._searchableView.setMinimumSize(25,19);this._searchableView.setPlaceholder(WebInspector.UIString("Find by string, selector, or XPath"));var stackElement=this._searchableView.element;this._elementsPanelTreeOutilneSplit=new WebInspector.SplitWidget(false,true,"treeOutlineAnimationTimelineWidget",300,300);this._elementsPanelTreeOutilneSplit.hideSidebar();this._elementsPanelTreeOutilneSplit.setMainWidget(this._searchableView);this._splitWidget.setMainWidget(this._elementsPanelTreeOutilneSplit);this._contentElement=stackElement.createChild("div");this._contentElement.id="elements-content";if(WebInspector.moduleSetting("domWordWrap").get())
this._contentElement.classList.add("elements-wrap");WebInspector.moduleSetting("domWordWrap").addChangeListener(this._domWordWrapSettingChanged.bind(this));var crumbsContainer=stackElement.createChild("div");crumbsContainer.id="elements-crumbs";this._breadcrumbs=new WebInspector.ElementsBreadcrumbs();this._breadcrumbs.show(crumbsContainer);this._breadcrumbs.addEventListener(WebInspector.ElementsBreadcrumbs.Events.NodeSelected,this._crumbNodeSelected,this);this.sidebarPanes={};this._elementsSidebarViewWrappers=[];this.sidebarPanes.platformFonts=new WebInspector.PlatformFontsSidebarPane();this.sidebarPanes.computedStyle=new WebInspector.ComputedStyleSidebarPane();this.sidebarPanes.styles=new WebInspector.StylesSidebarPane(this.sidebarPanes.computedStyle,this._showStylesSidebar.bind(this));this.sidebarPanes.styles.addEventListener(WebInspector.StylesSidebarPane.Events.SelectorEditingStarted,this._onEditingSelectorStarted.bind(this));this.sidebarPanes.styles.addEventListener(WebInspector.StylesSidebarPane.Events.SelectorEditingEnded,this._onEditingSelectorEnded.bind(this));this._matchedStylesFilterBoxContainer=createElement("div");this._matchedStylesFilterBoxContainer.className="sidebar-pane-filter-box";this.sidebarPanes.styles.setFilterBoxContainer(this._matchedStylesFilterBoxContainer);this._computedStylesFilterBoxContainer=createElement("div");this._computedStylesFilterBoxContainer.className="sidebar-pane-filter-box";this.sidebarPanes.computedStyle.setFilterBoxContainer(this._computedStylesFilterBoxContainer);this.sidebarPanes.metrics=new WebInspector.MetricsSidebarPane();this.sidebarPanes.properties=new WebInspector.PropertiesSidebarPane();this.sidebarPanes.domBreakpoints=WebInspector.domBreakpointsSidebarPane.createProxy(this);this.sidebarPanes.eventListeners=new WebInspector.EventListenersSidebarPane();WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged,this._dockSideChanged.bind(this));WebInspector.moduleSetting("splitVerticallyWhenDockedToRight").addChangeListener(this._dockSideChanged.bind(this));this._dockSideChanged();this._loadSidebarViews();this._treeOutlines=[];this._modelToTreeOutline=new Map();WebInspector.targetManager.observeTargets(this);WebInspector.moduleSetting("showUAShadowDOM").addChangeListener(this._showUAShadowDOMChanged.bind(this));WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.DocumentUpdated,this._documentUpdatedEvent,this);WebInspector.targetManager.addModelListener(WebInspector.CSSStyleModel,WebInspector.CSSStyleModel.Events.ModelWasEnabled,this._updateSidebars,this);WebInspector.targetManager.addModelListener(WebInspector.CSSStyleModel,WebInspector.CSSStyleModel.Events.PseudoStateForced,this._pseudoStateForced,this);WebInspector.extensionServer.addEventListener(WebInspector.ExtensionServer.Events.SidebarPaneAdded,this._extensionSidebarPaneAdded,this);}
WebInspector.ElementsPanel._elementsSidebarViewTitleSymbol=Symbol("title");WebInspector.ElementsPanel.prototype={_loadSidebarViews:function()
{var extensions=self.runtime.extensions("@WebInspector.ElementsSidebarView");for(var i=0;i<extensions.length;++i){var descriptor=extensions[i].descriptor();var title=WebInspector.UIString(descriptor["title"]);extensions[i].instancePromise().then(addSidebarView.bind(this,title));}
function addSidebarView(title,object)
{var sidebarView=(object);var elementsSidebarViewWrapperPane=new WebInspector.ElementsSidebarViewWrapperPane(title,sidebarView);this._elementsSidebarViewWrappers.push(elementsSidebarViewWrapperPane);if(this.sidebarPaneView)
this.sidebarPaneView.addPane(elementsSidebarViewWrapperPane);sidebarView.setNode(this.selectedDOMNode());}},_onEditingSelectorStarted:function()
{for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].setPickNodeMode(true);},_onEditingSelectorEnded:function()
{for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].setPickNodeMode(false);},targetAdded:function(target)
{var domModel=WebInspector.DOMModel.fromTarget(target);if(!domModel)
return;var treeOutline=new WebInspector.ElementsTreeOutline(domModel,true,true);treeOutline.setWordWrap(WebInspector.moduleSetting("domWordWrap").get());treeOutline.wireToDOMModel();treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged,this._selectedNodeChanged,this);treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.NodePicked,this._onNodePicked,this);treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.ElementsTreeUpdated,this._updateBreadcrumbIfNeeded,this);this._treeOutlines.push(treeOutline);this._modelToTreeOutline.set(domModel,treeOutline);if(this.isShowing())
this.wasShown();},targetRemoved:function(target)
{var domModel=WebInspector.DOMModel.fromTarget(target);if(!domModel)
return;var treeOutline=this._modelToTreeOutline.remove(domModel);treeOutline.unwireFromDOMModel();this._treeOutlines.remove(treeOutline);treeOutline.element.remove();},_updateTreeOutlineVisibleWidth:function()
{if(!this._treeOutlines.length)
return;var width=this._splitWidget.element.offsetWidth;if(this._splitWidget.isVertical())
width-=this._splitWidget.sidebarSize();for(var i=0;i<this._treeOutlines.length;++i){this._treeOutlines[i].setVisibleWidth(width);this._treeOutlines[i].updateSelection();}
this._breadcrumbs.updateSizes();},defaultFocusedElement:function()
{return this._treeOutlines.length?this._treeOutlines[0].element:this.element;},searchableView:function()
{return this._searchableView;},wasShown:function()
{for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.element.parentElement!==this._contentElement)
this._contentElement.appendChild(treeOutline.element);}
WebInspector.Panel.prototype.wasShown.call(this);this._breadcrumbs.update();for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];treeOutline.updateSelection();treeOutline.setVisible(true);if(!treeOutline.rootDOMNode)
if(treeOutline.domModel().existingDocument())
this._documentUpdated(treeOutline.domModel(),treeOutline.domModel().existingDocument());else
treeOutline.domModel().requestDocument();}},willHide:function()
{WebInspector.DOMModel.hideDOMNodeHighlight();for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];treeOutline.setVisible(false);this._contentElement.removeChild(treeOutline.element);}
if(this._popoverHelper)
this._popoverHelper.hidePopover();WebInspector.Panel.prototype.willHide.call(this);},onResize:function()
{this._updateTreeOutlineVisibleWidth();},_pseudoStateForced:function(event)
{var node=(event.data["node"]);this._treeOutlineForNode(node).updateOpenCloseTags(node);},_onNodePicked:function(event)
{if(!this.sidebarPanes.styles.isEditingSelector())
return;this.sidebarPanes.styles.updateEditingSelectorForNode((event.data));},_selectedNodeChanged:function(event)
{var selectedNode=(event.data);for(var i=0;i<this._treeOutlines.length;++i){if(!selectedNode||selectedNode.domModel()!==this._treeOutlines[i].domModel())
this._treeOutlines[i].selectDOMNode(null);}
if(!selectedNode&&this._lastValidSelectedNode)
this._selectedPathOnReset=this._lastValidSelectedNode.path();this._breadcrumbs.setSelectedNode(selectedNode);this._updateSidebars();if(selectedNode){selectedNode.setAsInspectedNode();this._lastValidSelectedNode=selectedNode;}
WebInspector.notifications.dispatchEventToListeners(WebInspector.NotificationService.Events.SelectedNodeChanged);this._selectedNodeChangedForTest();},_selectedNodeChangedForTest:function(){},_updateSidebars:function()
{var selectedDOMNode=this.selectedDOMNode();if(selectedDOMNode&&WebInspector.CSSStyleModel.fromNode(selectedDOMNode).isEnabled()){this.sidebarPanes.styles.setNode(selectedDOMNode);this.sidebarPanes.metrics.setNode(selectedDOMNode);this.sidebarPanes.platformFonts.setNode(selectedDOMNode);}
this.sidebarPanes.properties.setNode(selectedDOMNode);this.sidebarPanes.eventListeners.setNode(selectedDOMNode);for(var sidebarView of this._elementsSidebarViewWrappers)
sidebarView.setNode(selectedDOMNode);},_reset:function()
{delete this.currentQuery;},_documentUpdatedEvent:function(event)
{this._documentUpdated((event.target),(event.data));},_documentUpdated:function(domModel,inspectedRootDocument)
{this._reset();this.searchCanceled();var treeOutline=this._modelToTreeOutline.get(domModel);treeOutline.rootDOMNode=inspectedRootDocument;if(!inspectedRootDocument){if(this.isShowing())
domModel.requestDocument();return;}
WebInspector.domBreakpointsSidebarPane.restoreBreakpoints(domModel);function selectNode(candidateFocusNode)
{if(!candidateFocusNode)
candidateFocusNode=inspectedRootDocument.body||inspectedRootDocument.documentElement;if(!candidateFocusNode)
return;if(!this._pendingNodeReveal){this.selectDOMNode(candidateFocusNode);if(treeOutline.selectedTreeElement)
treeOutline.selectedTreeElement.expand();}}
function selectLastSelectedNode(nodeId)
{if(this.selectedDOMNode()){return;}
var node=nodeId?domModel.nodeForId(nodeId):null;selectNode.call(this,node);}
if(this._omitDefaultSelection)
return;if(this._selectedPathOnReset)
domModel.pushNodeByPathToFrontend(this._selectedPathOnReset,selectLastSelectedNode.bind(this));else
selectNode.call(this,null);delete this._selectedPathOnReset;},searchCanceled:function()
{delete this._searchQuery;this._hideSearchHighlights();this._searchableView.updateSearchMatchesCount(0);delete this._currentSearchResultIndex;delete this._searchResults;WebInspector.DOMModel.cancelSearch();},performSearch:function(searchConfig,shouldJump,jumpBackwards)
{var query=searchConfig.query;this.searchCanceled();const whitespaceTrimmedQuery=query.trim();if(!whitespaceTrimmedQuery.length)
return;this._searchQuery=query;var promises=[];var domModels=WebInspector.DOMModel.instances();for(var domModel of domModels)
promises.push(domModel.performSearchPromise(whitespaceTrimmedQuery,WebInspector.moduleSetting("showUAShadowDOM").get()));Promise.all(promises).then(resultCountCallback.bind(this));function resultCountCallback(resultCounts)
{this._searchResults=[];for(var i=0;i<resultCounts.length;++i){var resultCount=resultCounts[i];for(var j=0;j<resultCount;++j)
this._searchResults.push({domModel:domModels[i],index:j,node:undefined});}
this._searchableView.updateSearchMatchesCount(this._searchResults.length);if(!this._searchResults.length)
return;this._currentSearchResultIndex=-1;if(shouldJump)
this._jumpToSearchResult(jumpBackwards?-1:0);}},_domWordWrapSettingChanged:function(event)
{this._contentElement.classList.toggle("elements-wrap",event.data);for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].setWordWrap((event.data));var selectedNode=this.selectedDOMNode();if(!selectedNode)
return;var treeElement=this._treeElementForNode(selectedNode);if(treeElement)
treeElement.updateSelection();},switchToAndFocus:function(node)
{this._searchableView.cancelSearch();WebInspector.inspectorView.setCurrentPanel(this);this.selectDOMNode(node,true);},_getPopoverAnchor:function(element,event)
{var anchor=element.enclosingNodeOrSelfWithClass("webkit-html-resource-link");if(!anchor||!anchor.href)
return;return anchor;},_showPopover:function(anchor,popover)
{var node=this.selectedDOMNode();if(node)
WebInspector.DOMPresentationUtils.buildImagePreviewContents(node.target(),anchor.href,true,showPopover);function showPopover(contents)
{if(!contents)
return;popover.setCanShrink(false);popover.showForAnchor(contents,anchor);}},_jumpToSearchResult:function(index)
{this._hideSearchHighlights();this._currentSearchResultIndex=(index+this._searchResults.length)%this._searchResults.length;this._highlightCurrentSearchResult();},jumpToNextSearchResult:function()
{if(!this._searchResults)
return;this._jumpToSearchResult(this._currentSearchResultIndex+1);},jumpToPreviousSearchResult:function()
{if(!this._searchResults)
return;this._jumpToSearchResult(this._currentSearchResultIndex-1);},supportsCaseSensitiveSearch:function()
{return false;},supportsRegexSearch:function()
{return false;},_highlightCurrentSearchResult:function()
{var index=this._currentSearchResultIndex;var searchResults=this._searchResults;var searchResult=searchResults[index];if(searchResult.node===null){this._searchableView.updateCurrentMatchIndex(index);return;}
function searchCallback(node)
{searchResult.node=node;this._highlightCurrentSearchResult();}
if(typeof searchResult.node==="undefined"){searchResult.domModel.searchResult(searchResult.index,searchCallback.bind(this));return;}
this._searchableView.updateCurrentMatchIndex(index);var treeElement=this._treeElementForNode(searchResult.node);if(treeElement){treeElement.highlightSearchResults(this._searchQuery);treeElement.reveal();var matches=treeElement.listItemElement.getElementsByClassName(WebInspector.highlightedSearchResultClassName);if(matches.length)
matches[0].scrollIntoViewIfNeeded();}},_hideSearchHighlights:function()
{if(!this._searchResults||!this._searchResults.length||this._currentSearchResultIndex<0)
return;var searchResult=this._searchResults[this._currentSearchResultIndex];if(!searchResult.node)
return;var treeOutline=this._modelToTreeOutline.get(searchResult.node.domModel());var treeElement=treeOutline.findTreeElement(searchResult.node);if(treeElement)
treeElement.hideSearchHighlights();},selectedDOMNode:function()
{for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.selectedDOMNode())
return treeOutline.selectedDOMNode();}
return null;},selectDOMNode:function(node,focus)
{for(var i=0;i<this._treeOutlines.length;++i){var treeOutline=this._treeOutlines[i];if(treeOutline.domModel()===node.domModel())
treeOutline.selectDOMNode(node,focus);else
treeOutline.selectDOMNode(null);}},_updateBreadcrumbIfNeeded:function(event)
{var nodes=(event.data);this._breadcrumbs.updateNodes(nodes);},_crumbNodeSelected:function(event)
{var node=(event.data);this.selectDOMNode(node,true);},handleShortcut:function(event)
{function handleUndoRedo(treeOutline)
{if(WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)&&!event.shiftKey&&event.keyIdentifier==="U+005A"){treeOutline.domModel().undo(this._updateSidebars.bind(this));event.handled=true;return;}
var isRedoKey=WebInspector.isMac()?event.metaKey&&event.shiftKey&&event.keyIdentifier==="U+005A":event.ctrlKey&&event.keyIdentifier==="U+0059";if(isRedoKey){treeOutline.domModel().redo(this._updateSidebars.bind(this));event.handled=true;}}
if(WebInspector.isEditing())
return;var treeOutline=null;for(var i=0;i<this._treeOutlines.length;++i){if(this._treeOutlines[i].selectedDOMNode()===this._lastValidSelectedNode)
treeOutline=this._treeOutlines[i];}
if(!treeOutline)
return;if(!treeOutline.editing()){handleUndoRedo.call(this,treeOutline);if(event.handled)
return;}
treeOutline.handleShortcut(event);if(event.handled)
return;WebInspector.Panel.prototype.handleShortcut.call(this,event);},_treeOutlineForNode:function(node)
{if(!node)
return null;return this._modelToTreeOutline.get(node.domModel())||null;},_focusedTreeOutline:function()
{for(var i=0;i<this._treeOutlines.length;++i){if(this._treeOutlines[i].hasFocus())
return this._treeOutlines[i];}
return null;},_treeElementForNode:function(node)
{var treeOutline=this._treeOutlineForNode(node);return(treeOutline.findTreeElement(node));},handleCopyEvent:function(event)
{var treeOutline=this._focusedTreeOutline();if(treeOutline)
treeOutline.handleCopyOrCutKeyboardEvent(false,event);},handleCutEvent:function(event)
{var treeOutline=this._focusedTreeOutline();if(treeOutline)
treeOutline.handleCopyOrCutKeyboardEvent(true,event);},handlePasteEvent:function(event)
{var treeOutline=this._focusedTreeOutline();if(treeOutline)
treeOutline.handlePasteKeyboardEvent(event);},_leaveUserAgentShadowDOM:function(node)
{var userAgentShadowRoot=node.ancestorUserAgentShadowRoot();return userAgentShadowRoot?(userAgentShadowRoot.parentNode):node;},revealAndSelectNode:function(node)
{if(WebInspector.inspectElementModeController&&WebInspector.inspectElementModeController.enabled()){InspectorFrontendHost.bringToFront();WebInspector.inspectElementModeController.disable();}
this._omitDefaultSelection=true;WebInspector.inspectorView.setCurrentPanel(this);node=WebInspector.moduleSetting("showUAShadowDOM").get()?node:this._leaveUserAgentShadowDOM(node);node.highlightForTwoSeconds();this.selectDOMNode(node,true);delete this._omitDefaultSelection;if(!this._notFirstInspectElement)
InspectorFrontendHost.inspectElementCompleted();this._notFirstInspectElement=true;},appendApplicableItems:function(event,contextMenu,object)
{if(!(object instanceof WebInspector.RemoteObject&&((object)).isNode())&&!(object instanceof WebInspector.DOMNode)&&!(object instanceof WebInspector.DeferredDOMNode)){return;}
if(object instanceof WebInspector.DOMNode){contextMenu.appendSeparator();WebInspector.domBreakpointsSidebarPane.populateNodeContextMenu(object,contextMenu);}
if(this.element.isAncestor((event.target)))
return;var commandCallback=WebInspector.Revealer.reveal.bind(WebInspector.Revealer,object);contextMenu.appendItem(WebInspector.UIString.capitalize("Reveal in Elements ^panel"),commandCallback);},_sidebarContextMenuEventFired:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.show();},_dockSideChanged:function()
{var vertically=WebInspector.dockController.isVertical()&&WebInspector.moduleSetting("splitVerticallyWhenDockedToRight").get();this._splitVertically(vertically);},_showUAShadowDOMChanged:function()
{for(var i=0;i<this._treeOutlines.length;++i)
this._treeOutlines[i].update();},_showStylesSidebar:function()
{this.sidebarPaneView.selectTab(this.sidebarPanes.styles.title());},_splitVertically:function(vertically)
{if(this.sidebarPaneView&&vertically===!this._splitWidget.isVertical())
return;var extensionSidebarPanes=WebInspector.extensionServer.sidebarPanes();if(this.sidebarPaneView&&extensionSidebarPanes.length)
return;if(this.sidebarPaneView){this.sidebarPaneView.detach();this._splitWidget.uninstallResizer(this.sidebarPaneView.headerElement());}
this._splitWidget.setVertical(!vertically);var computedPane=new WebInspector.SidebarPane(WebInspector.UIString("Computed"));computedPane.element.classList.add("composite");computedPane.element.classList.add("fill");computedPane.bodyElement.classList.add("metrics-and-computed");var matchedStylePanesWrapper=createElement("div");matchedStylePanesWrapper.className="style-panes-wrapper";var computedStylePanesWrapper=createElement("div");computedStylePanesWrapper.className="style-panes-wrapper";function showMetrics(inComputedStyle)
{if(inComputedStyle)
this.sidebarPanes.metrics.show(computedStylePanesWrapper,this.sidebarPanes.computedStyle.element);else
this.sidebarPanes.metrics.show(matchedStylePanesWrapper);}
function tabSelected(event)
{var tabId=(event.data.tabId);if(tabId===computedPane.title())
showMetrics.call(this,true);else if(tabId===stylesPane.title())
showMetrics.call(this,false);}
this.sidebarPaneView=new WebInspector.SidebarTabbedPane();this.sidebarPaneView.element.addEventListener("contextmenu",this._sidebarContextMenuEventFired.bind(this),false);if(this._popoverHelper)
this._popoverHelper.hidePopover();this._popoverHelper=new WebInspector.PopoverHelper(this.sidebarPaneView.element,this._getPopoverAnchor.bind(this),this._showPopover.bind(this));this._popoverHelper.setTimeout(0);if(vertically){this._splitWidget.installResizer(this.sidebarPaneView.headerElement());var compositePane=new WebInspector.SidebarPane(this.sidebarPanes.styles.title());compositePane.element.classList.add("composite");compositePane.element.classList.add("fill");var splitWidget=new WebInspector.SplitWidget(true,true,"stylesPaneSplitViewState",215);splitWidget.show(compositePane.bodyElement);var vbox1=new WebInspector.VBox();vbox1.element.appendChild(matchedStylePanesWrapper);vbox1.element.appendChild(this._matchedStylesFilterBoxContainer);splitWidget.setMainWidget(vbox1);var vbox2=new WebInspector.VBox();vbox2.element.appendChild(computedStylePanesWrapper);vbox2.element.appendChild(this._computedStylesFilterBoxContainer);splitWidget.setSidebarWidget(vbox2);computedPane.show(computedStylePanesWrapper);this.sidebarPaneView.addPane(compositePane);}else{var stylesPane=new WebInspector.SidebarPane(this.sidebarPanes.styles.title());stylesPane.element.classList.add("composite");stylesPane.element.classList.add("fill");stylesPane.bodyElement.classList.add("metrics-and-styles");stylesPane.bodyElement.appendChild(matchedStylePanesWrapper);computedPane.bodyElement.appendChild(computedStylePanesWrapper);this.sidebarPaneView.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected,tabSelected,this);stylesPane.bodyElement.appendChild(this._matchedStylesFilterBoxContainer);computedPane.bodyElement.appendChild(this._computedStylesFilterBoxContainer);this.sidebarPaneView.addPane(stylesPane);this.sidebarPaneView.addPane(computedPane);}
this.sidebarPanes.styles.show(matchedStylePanesWrapper);this.sidebarPanes.computedStyle.show(computedStylePanesWrapper);matchedStylePanesWrapper.appendChild(this.sidebarPanes.styles.titleElement);showMetrics.call(this,vertically);this.sidebarPanes.platformFonts.show(computedStylePanesWrapper);this.sidebarPaneView.addPane(this.sidebarPanes.eventListeners);this.sidebarPaneView.addPane(this.sidebarPanes.domBreakpoints);this.sidebarPaneView.addPane(this.sidebarPanes.properties);for(var sidebarViewWrapper of this._elementsSidebarViewWrappers)
this.sidebarPaneView.addPane(sidebarViewWrapper);this._extensionSidebarPanesContainer=this.sidebarPaneView;for(var i=0;i<extensionSidebarPanes.length;++i)
this._addExtensionSidebarPane(extensionSidebarPanes[i]);this._splitWidget.setSidebarWidget(this.sidebarPaneView);this.sidebarPanes.styles.expand();},_extensionSidebarPaneAdded:function(event)
{var pane=(event.data);this._addExtensionSidebarPane(pane);},_addExtensionSidebarPane:function(pane)
{if(pane.panelName()===this.name){this.setHideOnDetach();this._extensionSidebarPanesContainer.addPane(pane);}},setWidgetBelowDOM:function(widget)
{if(widget){this._elementsPanelTreeOutilneSplit.setSidebarWidget(widget);this._elementsPanelTreeOutilneSplit.showBoth(true);}else{this._elementsPanelTreeOutilneSplit.hideSidebar(true);}},__proto__:WebInspector.Panel.prototype}
WebInspector.ElementsPanel.ContextMenuProvider=function()
{}
WebInspector.ElementsPanel.ContextMenuProvider.prototype={appendApplicableItems:function(event,contextMenu,target)
{WebInspector.ElementsPanel.instance().appendApplicableItems(event,contextMenu,target);}}
WebInspector.ElementsPanel.DOMNodeRevealer=function()
{}
WebInspector.ElementsPanel.DOMNodeRevealer.prototype={reveal:function(node)
{var panel=WebInspector.ElementsPanel.instance();panel._pendingNodeReveal=true;return new Promise(revealPromise);function revealPromise(resolve,reject)
{if(node instanceof WebInspector.DOMNode){onNodeResolved((node));}else if(node instanceof WebInspector.DeferredDOMNode){((node)).resolve(onNodeResolved);}else if(node instanceof WebInspector.RemoteObject){var domModel=WebInspector.DOMModel.fromTarget((node).target());if(domModel)
domModel.pushObjectAsNodeToFrontend(node,onNodeResolved);else
reject(new Error("Could not resolve a node to reveal."));}else{reject(new Error("Can't reveal a non-node."));panel._pendingNodeReveal=false;}
function onNodeResolved(resolvedNode)
{panel._pendingNodeReveal=false;if(resolvedNode){panel.revealAndSelectNode(resolvedNode);resolve(undefined);return;}
reject(new Error("Could not resolve node to reveal."));}}}}
WebInspector.ElementsPanel.show=function()
{WebInspector.inspectorView.setCurrentPanel(WebInspector.ElementsPanel.instance());}
WebInspector.ElementsPanel.instance=function()
{if(!WebInspector.ElementsPanel._instanceObject)
WebInspector.ElementsPanel._instanceObject=new WebInspector.ElementsPanel();return WebInspector.ElementsPanel._instanceObject;}
WebInspector.ElementsPanelFactory=function()
{}
WebInspector.ElementsPanelFactory.prototype={createPanel:function()
{return WebInspector.ElementsPanel.instance();}};Runtime.cachedResources["elements/animationTimeline.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.animation-node-row {\n    width: 100%;\n    display: flex;\n    border-bottom: 1px dashed #ccc;\n}\n\n.animation-node-description {\n    display: inline-block;\n    min-width: 200px;\n    max-width: 200px;\n    padding-left: 15px;\n    overflow: hidden;\n    position: relative;\n    transform-style: preserve-3d;\n    line-height: 40px;\n}\n\n.animation-node-row:nth-child(odd) {\n    background-color: hsla(0, 0%, 0%, 0.05);\n}\n\n.animation-timeline-row {\n    height: 40px;\n    position: relative;\n}\n\npath.animation-keyframe {\n    fill-opacity: 0.3;\n}\n\nline.animation-line {\n    stroke-width: 2px;\n    stroke-linecap: round;\n    fill: none;\n}\n\nline.animation-delay-line {\n    stroke-width: 2px;\n    stroke-dasharray: 6, 4;\n}\n\ncircle.animation-endpoint, circle.animation-keyframe-point {\n    stroke-width: 2px;\n}\n\ncircle.animation-endpoint, circle.animation-keyframe-point {\n    transition: transform 100ms cubic-bezier(0, 0, 0.2, 1);\n    transform: scale(1);\n    transform-origin: 50% 50%;\n}\n\ncircle.animation-endpoint:hover, circle.animation-keyframe-point:hover {\n    transform: scale(1.2);\n}\n\ncircle.animation-endpoint:active, circle.animation-keyframe-point:active {\n    transform: scale(1);\n}\n\ncircle.animation-keyframe-point {\n    fill: white;\n}\n\n.animation-name {\n    position: absolute;\n    top: 15px;\n    color: #333;\n    text-align: center;\n    margin-left: -8px;\n}\n\n.animation-timeline-header {\n    height: 44px;\n    border-bottom: 1px solid #ccc;\n    flex-shrink: 0;\n}\n\n.animation-control-replay {\n    float: right;\n}\n\n.animation-control-replay circle {\n    stroke: #666;\n    stroke-width: 2px;\n    fill: none;\n}\n\n.animation-control-replay path {\n    fill: #666;\n}\n\n.animation-control-replay:hover circle {\n    stroke: #333;\n}\n\n.animation-control-replay:hover path {\n    fill: #333;\n}\n\n.animation-controls {\n    width: 200px;\n    max-width: 200px;\n    padding: 10px;\n    height: 100%;\n    line-height: 22px;\n}\n\n.animation-timeline-markers {\n    height: 100%;\n    width: calc(100% - 200px);\n    display: inline-block;\n}\n\n.animation-time-overlay {\n    background-color: black;\n    opacity: 0.05;\n    position: absolute;\n    height: 100%;\n    width: 100%;\n}\n\n.widget.component-root.platform-linux.vbox {\n    overflow: hidden;\n}\n\ninput.animation-playback-slider {\n    float: right;\n    width: 63px;\n    margin-right: 8px;\n}\n\n.animation-playback-label {\n    float: right;\n    margin-right: 8px;\n    line-height: 24px;\n    width: 34px;\n}\n\n.animation-scrubber {\n    opacity: 1;\n    position: absolute;\n    left: 200px;\n    height: calc(100% - 43px);\n    width: calc(100% - 200px);\n    top: 43px;\n    border-left: 1px solid rgba(0,0,0,0.5);\n}\n\n.animation-scrubber-head {\n    background-color: rgba(0, 0, 0, 0.5);\n    width: 50px;\n    height: 23px;\n    color: white;\n    line-height: 23px;\n    text-align: center;\n    border-radius: 5px;\n    position: relative;\n    top: -29px;\n    left: -26px;\n    font-size: 10px;\n    visibility: visible;\n}\n\n.animation-timeline-capturing > .animation-scrubber-head {\n    visibility: hidden;\n}\n\n.animation-timeline-end > .animation-scrubber-head {\n    visibility: visible;\n}\n\n.animation-timeline-end > .animation-scrubber-arrow,\n.animation-timeline-capturing > .animation-scrubber-arrow {\n    visibility: hidden;\n}\n\n.animation-scrubber-arrow {\n    width: 21px;\n    height: 25px;\n    position: absolute;\n    top: -6px;\n    left: -7px;\n    -webkit-clip-path: polygon(0 0, 6px 6px, 12px 0px, 0px 0px);\n    background-color: rgba(0, 0, 0, 0.5);\n}\n\n.animation-timeline-timer {\n    width: 22px;\n    height: 22px;\n    position: relative;\n    top: -51px;\n    left: -11px;\n    border-radius: 22px;\n    border: 1px solid #7B7B7B;\n    visibility: hidden;\n    background-color: white;\n}\n\n.animation-timeline-capturing > .animation-timeline-timer {\n    visibility: visible;\n}\n\n.animation-timeline-end > .animation-timeline-timer {\n    visibility: hidden;\n}\n\n.timer-hemisphere {\n    width: 50%;\n    height: 100%;\n    position: absolute;\n    background: #808080;\n}\n\n.timer-spinner {\n    border-radius: 20px 0 0 20px;\n    z-index: 200;\n    border-right: none;\n    transform-origin: 10px 10px;\n    will-change: transform;\n}\n\n.timer-filler {\n    border-radius: 0 20px 20px 0;\n    z-index: 100;\n    border-left: none;\n    left: 50%;\n    opacity: 0;\n}\n\n.timer-mask {\n    width: 50%;\n    height: 100%;\n    position: absolute;\n    z-index: 300;\n    opacity: 1;\n    background: white;\n    border-radius: 20px 0 0 20px;\n}\n\nsvg.animation-timeline-grid {\n    position: absolute;\n    left: 200px;\n}\n\nrect.animation-timeline-grid-line {\n    fill: #eee;\n}\n\nrect.animation-timeline-grid-line:first-child {\n    fill: #ccc;\n}\n\n.animation-timeline-row > svg.animation-ui {\n    position: absolute;\n}\n\n.animation-node-timeline {\n    flex-grow: 1;\n}\n\n.animation-node-description > div {\n    position: absolute;\n    top: 50%;\n    transform: translateY(-50%);\n    max-height: 100%;\n}\n\n.animation-node-row.animation-node-removed {\n    background-color: #fff0f0;\n}\n\nsvg.animation-ui g:first-child {\n    opacity: 1;\n}\n\n.animation-tail-iterations {\n    opacity: 0.5;\n}\n\nsvg.animation-ui.animation-ui-canceled {\n    -webkit-filter: grayscale(100%);\n    transition: -webkit-filter 100ms cubic-bezier(0, 0, 0.2, 1);\n}\n\n.animation-keyframe-step line {\n    stroke-width: 2;\n    stroke-opacity: 0.3;\n}\n\ntext.animation-timeline-grid-label {\n    font-size: 10px;\n    fill: #999;\n}\n\n.animation-timeline-rows {\n    flex-grow: 1;\n    overflow-y: auto;\n    z-index: 1;\n}\n\n/*# sourceURL=elements/animationTimeline.css */";Runtime.cachedResources["elements/bezierEditor.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    width: 270px;\n    height: 350px;\n    -webkit-user-select: none;\n    padding: 16px;\n    overflow: hidden;\n}\n\n.bezier-preset-selected > svg {\n    background-color: rgb(56, 121, 217);\n}\n\n.bezier-preset-label {\n    font-size: 10px;\n}\n\n.bezier-preset {\n    width: 50px;\n    height: 50px;\n    padding: 5px;\n    margin: auto;\n    background-color: #f5f5f5;\n    border-radius: 3px;\n}\n\n.bezier-preset line.bezier-control-line {\n    stroke: #666;\n    stroke-width: 1;\n    stroke-linecap: round;\n    fill: none;\n}\n\n.bezier-preset circle.bezier-control-circle {\n    fill: #666;\n}\n\n.bezier-preset path.bezier-path {\n    stroke: black;\n    stroke-width: 2;\n    stroke-linecap: round;\n    fill: none;\n}\n\n.bezier-preset-selected path.bezier-path, .bezier-preset-selected line.bezier-control-line {\n    stroke: white;\n}\n\n.bezier-preset-selected circle.bezier-control-circle {\n    fill: white;\n}\n\n.bezier-curve line.linear-line {\n    stroke: #eee;\n    stroke-width: 2;\n    stroke-linecap: round;\n    fill: none;\n}\n\n.bezier-curve line.bezier-control-line {\n    stroke: #9C27B0;\n    stroke-width: 2;\n    stroke-linecap: round;\n    fill: none;\n    opacity: 0.6;\n}\n\n.bezier-curve circle.bezier-control-circle {\n    fill: #9C27B0;\n    cursor: pointer;\n}\n\n.bezier-curve path.bezier-path {\n    stroke: black;\n    stroke-width: 3;\n    stroke-linecap: round;\n    fill: none;\n}\n\n.bezier-preview-container {\n    position: relative;\n    background-color: white;\n    overflow: hidden;\n    border-radius: 20px;\n    width: 200%;\n    height: 20px;\n    z-index: 2;\n    flex-shrink: 0;\n    opacity: 0;\n}\n\n.bezier-preview-animation {\n    background-color: #9C27B0;\n    width: 20px;\n    height: 20px;\n    border-radius: 20px;\n    position: absolute;\n}\n\n.bezier-preview-onion {\n    margin-top: -20px;\n    position: relative;\n    z-index: 1;\n}\n\n.bezier-preview-onion > .bezier-preview-animation {\n    opacity: 0.1;\n}\n\nsvg.bezier-preset-modify {\n    background-color: #f5f5f5;\n    border-radius: 35px;\n    display: inline-block;\n    opacity: 0;\n    transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);\n    cursor: pointer;\n    position: absolute;\n}\n\nsvg.bezier-preset-modify:hover, .bezier-preset:hover {\n    background-color: #999;\n}\n\n.bezier-preset-selected .bezier-preset:hover {\n    background-color: rgb(56, 121, 217);\n}\n\n.bezier-preset-modify path {\n    stroke-width: 2;\n    stroke: black;\n    fill: none;\n}\n\n.bezier-preset-selected .bezier-preset-modify {\n    opacity: 1;\n}\n\n.bezier-preset-category {\n    width: 50px;\n    margin: 20px 0;\n    cursor: pointer;\n    transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);\n}\n\nspan.bezier-display-value {\n    width: 100%;\n    -webkit-user-select: text;\n    display: block;\n    text-align: center;\n    line-height: 20px;\n    height: 20px;\n    cursor: text;\n    white-space: nowrap !important;\n}\n\n.bezier-container {\n    display: flex;\n    margin-top: 38px;\n}\n\nsvg.bezier-curve {\n    margin-left: 32px;\n    margin-top: -8px;\n}\n\nsvg.bezier-preset-modify.bezier-preset-plus {\n    right: 0;\n}\n\n.bezier-header {\n    margin-top: 16px;\n}\n\nsvg.bezier-preset-modify:active {\n    transform: scale(1.1);\n    background-color: rgb(56, 121, 217);\n}\n\n.bezier-preset-category:active {\n    transform: scale(1.05);\n}\n\n.bezier-header-active > svg.bezier-preset-modify {\n    opacity: 1;\n}\n\n.bezier-preset-modify:active path {\n    stroke: white;\n}\n\n/*# sourceURL=elements/bezierEditor.css */";Runtime.cachedResources["elements/breadcrumbs.css"]="/*\n * Copyright 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.crumbs {\n    display: inline-block;\n    pointer-events: auto;\n    cursor: default;\n    font-size: 11px;\n    line-height: 17px;\n}\n\n.crumbs .crumb {\n    display: inline-block;\n    padding: 0 7px;\n    height: 18px;\n    white-space: nowrap;\n}\n\n.crumbs .crumb.collapsed > * {\n    display: none;\n}\n\n.crumbs .crumb.collapsed::before {\n    content: \"\\2026\";\n    font-weight: bold;\n}\n\n.crumbs .crumb.compact .extra {\n    display: none;\n}\n\n.crumbs .crumb.selected, .crumbs .crumb.selected:hover {\n    background-color: rgb(56, 121, 217);\n    color: white;\n    text-shadow: rgba(255, 255, 255, 0.5) 0 0 0;\n}\n\n.crumbs .crumb:hover {\n    background-color: rgb(216, 216, 216);\n}\n\n/*# sourceURL=elements/breadcrumbs.css */";Runtime.cachedResources["elements/computedStyleSidebarPane.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.computed-style-sidebar-pane {\n    padding: 2px 2px 4px 4px;\n}\n\n.computed-properties {\n    -webkit-user-select: text;\n}\n\n.computed-style-property-inherited {\n    opacity: 0.5;\n}\n\n.computed-style-trace-button {\n    display: none;\n    position: absolute;\n    border: 0 transparent none;\n    background-color: transparent;\n    height: 25px;\n    width: 26px;\n    transform: scale(0.75);\n    left: -10px;\n    top: -6px;\n    opacity: 0.5;\n}\n\n.computed-style-property:hover .computed-style-trace-button {\n    display: inline-block;\n}\n\n.computed-style-trace-button:hover {\n    opacity: 1;\n}\n\n.computed-style-trace-button > .glyph {\n    -webkit-mask-image: url(Images/toolbarButtonGlyphs.png);\n    -webkit-mask-size: 320px 144px;\n    -webkit-mask-position: -224px -24px;\n    background-color: rgba(0, 0, 0, 0.75);\n    position: absolute;\n    top: 0;\n    right: 0;\n    bottom: 0;\n    left: 0;\n    margin: 0 -1px;\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.5) {\n.computed-style-trace-button > .glyph {\n    -webkit-mask-image: url(Images/toolbarButtonGlyphs_2x.png);\n}\n} /* media */\n\n.computed-style-property {\n    position: relative;\n    padding-left: 14px;\n}\n\n/*# sourceURL=elements/computedStyleSidebarPane.css */";Runtime.cachedResources["elements/elementsPanel.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n#elements-content {\n    flex: 1 1;\n    overflow: auto;\n    padding: 2px 0 0 0;\n    transform: translateZ(0);\n}\n\n#elements-content:not(.elements-wrap) > div {\n    display: inline-block;\n    min-width: 100%;\n}\n\n#elements-content.elements-wrap {\n    overflow-x: hidden;\n}\n\n#elements-crumbs {\n    flex: 0 0 19px;\n    background-color: white;\n    border-top: 1px solid #ccc;\n    overflow: hidden;\n    height: 19px;\n    width: 100%;\n}\n\n.metrics {\n    padding: 8px;\n    font-size: 10px;\n    text-align: center;\n    white-space: nowrap;\n}\n\n.metrics .label {\n    position: absolute;\n    font-size: 10px;\n    margin-left: 3px;\n    padding-left: 2px;\n    padding-right: 2px;\n}\n\n.metrics .position {\n    border: 1px rgb(66%, 66%, 66%) dotted;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .margin {\n    border: 1px dashed;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .border {\n    border: 1px black solid;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .padding {\n    border: 1px grey dashed;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .content {\n    position: static;\n    border: 1px gray solid;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n    min-width: 80px;\n    overflow: visible;\n}\n\n.metrics .content span {\n    display: inline-block;\n}\n\n.metrics .editing {\n    position: relative;\n    z-index: 100;\n    cursor: text;\n}\n\n.metrics .left {\n    display: inline-block;\n    vertical-align: middle;\n}\n\n.metrics .right {\n    display: inline-block;\n    vertical-align: middle;\n}\n\n.metrics .top {\n    display: inline-block;\n}\n\n.metrics .bottom {\n    display: inline-block;\n}\n\n.styles-section {\n    padding: 2px 2px 4px 4px;\n    min-height: 18px;\n    white-space: nowrap;\n    background-origin: padding;\n    background-clip: padding;\n    -webkit-user-select: text;\n    border-bottom: 1px solid rgb(191, 191, 191);\n    position: relative;\n}\n\n.styles-pane .sidebar-separator {\n    border-top: 0 none;\n}\n\n.styles-sidebar-placeholder {\n    height: 16px;\n}\n\n.styles-section.read-only {\n    background-color: #eee;\n}\n\n.styles-section .style-properties li.not-parsed-ok {\n    margin-left: 0;\n}\n\n.styles-section .style-properties li.filter-match,\n.styles-section .simple-selector.filter-match {\n    background-color: rgba(255, 255, 0, 0.5);\n}\n\n.styles-section .style-properties li.overloaded.filter-match {\n    background-color: rgba(255, 255, 0, 0.25);\n}\n\n.styles-section .style-properties li.not-parsed-ok .exclamation-mark {\n    display: inline-block;\n    position: relative;\n    width: 11px;\n    height: 10px;\n    margin: 0 7px 0 0;\n    top: 1px;\n    left: -36px; /* outdent to compensate for the top-level property indent */\n    -webkit-user-select: none;\n    cursor: default;\n    z-index: 1;\n}\n\n.styles-section-title {\n    background-origin: padding;\n    background-clip: padding;\n    word-wrap: break-word;\n    white-space: normal;\n}\n\n.styles-section-title .media-list {\n    color: #888;\n}\n\n.styles-section-title .media-list.media-matches .media.editable-media {\n    color: #222;\n}\n\n.styles-section-title .media:not(.editing-media),\n.styles-section-title .media:not(.editing-media) .subtitle {\n    overflow: hidden;\n}\n\n.styles-section-title .media .subtitle {\n    float: right;\n    color: rgb(85, 85, 85);\n}\n\n.styles-section-subtitle {\n    color: rgb(85, 85, 85);\n    float: right;\n    margin-left: 5px;\n    max-width: 100%;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n}\n\n.styles-section .styles-section-subtitle a {\n    color: inherit;\n}\n\n.styles-section .selector {\n    color: #888;\n}\n\n.styles-section .simple-selector.selector-matches {\n    color: #222;\n}\n\n.styles-section a[data-uncopyable] {\n    display: inline-block;\n}\n\n.styles-section a[data-uncopyable]::before {\n    content: attr(data-uncopyable);\n    text-decoration: underline;\n}\n\n.styles-section .style-properties {\n    margin: 0;\n    padding: 2px 4px 0 0;\n    list-style: none;\n    clear: both;\n}\n\n.styles-section.matched-styles .style-properties {\n    padding-left: 0;\n}\n\n.no-affect .style-properties li {\n    opacity: 0.5;\n}\n\n.no-affect .style-properties li.editing {\n    opacity: 1.0;\n}\n\n.styles-section .style-properties li {\n    margin-left: 12px;\n    padding-left: 22px;\n    white-space: normal;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    cursor: auto;\n}\n\n.styles-section .style-properties li .webkit-css-property {\n    margin-left: -22px; /* outdent the first line of longhand properties (in an expanded shorthand) to compensate for the \"padding-left\" shift in .styles-section .style-properties li */\n}\n\n.styles-section .style-properties > li {\n    padding-left: 38px;\n}\n\n.styles-section .style-properties > li .webkit-css-property {\n    margin-left: -38px; /* outdent the first line of the top-level properties to compensate for the \"padding-left\" shift in .styles-section .style-properties > li */\n}\n\n.styles-section .style-properties > li.child-editing {\n    padding-left: 8px;\n}\n\n.styles-section .style-properties > li.child-editing .webkit-css-property {\n    margin-left: 0;\n}\n\n.styles-section.matched-styles .style-properties li {\n    margin-left: 0 !important;\n}\n\n.styles-section .style-properties li.child-editing {\n    word-wrap: break-word !important;\n    white-space: normal !important;\n    padding-left: 0;\n}\n\n.styles-section .style-properties ol {\n    display: none;\n    margin: 0;\n    -webkit-padding-start: 12px;\n    list-style: none;\n}\n\n.styles-section .style-properties ol.expanded {\n    display: block;\n}\n\n.styles-section.matched-styles .style-properties li.parent .expand-element {\n    -webkit-user-select: none;\n    background-image: url(Images/toolbarButtonGlyphs.png);\n    background-size: 320px 144px;\n    margin-right: 2px;\n    margin-left: -6px;\n    opacity: 0.55;\n    width: 8px;\n    height: 10px;\n    display: inline-block;\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.5) {\n.styles-section.matched-styles .style-properties li.parent .expand-element {\n    background-image: url(Images/toolbarButtonGlyphs_2x.png);\n}\n} /* media */\n\n.styles-section.matched-styles .style-properties li.parent .expand-element {\n    background-position: -4px -96px;\n}\n\n.styles-section.matched-styles .style-properties li.parent.expanded .expand-element {\n    background-position: -20px -96px;\n}\n\n.styles-section .style-properties li .info {\n    padding-top: 4px;\n    padding-bottom: 3px;\n}\n\n.styles-section.matched-styles:not(.read-only):hover .style-properties .enabled-button {\n    visibility: visible;\n}\n\n.styles-section.matched-styles:not(.read-only) .style-properties li.disabled .enabled-button {\n    visibility: visible;\n}\n\n.styles-section .style-properties .enabled-button {\n    visibility: hidden;\n    float: left;\n    font-size: 10px;\n    margin: 0;\n    vertical-align: top;\n    position: relative;\n    z-index: 1;\n    width: 18px;\n    left: -40px; /* original -2px + (-38px) to compensate for the first line outdent */\n    top: 1px;\n}\n\n.styles-section.matched-styles .style-properties ol.expanded {\n    margin-left: 16px;\n}\n\n.styles-section .style-properties .overloaded:not(.has-ignorable-error),\n.styles-section .style-properties .inactive,\n.styles-section .style-properties .disabled,\n.styles-section .style-properties .not-parsed-ok:not(.has-ignorable-error) {\n    text-decoration: line-through;\n}\n\n.styles-section .style-properties .has-ignorable-error .webkit-css-property {\n    color: inherit;\n}\n\n.styles-section .style-properties .implicit,\n.styles-section .style-properties .inherited {\n    opacity: 0.5;\n}\n\n.styles-section .style-properties .has-ignorable-error {\n    color: gray;\n}\n\n.styles-element-state-pane {\n    overflow: hidden;\n    margin-top: -56px;\n    padding-top: 18px;\n    height: 56px;\n    -webkit-transition: margin-top 0.1s ease-in-out;\n    padding-left: 2px;\n}\n\n.styles-element-state-pane.expanded {\n    border-bottom: 1px solid rgb(189, 189, 189);\n    margin-top: 0;\n}\n\n.styles-element-state-pane > table {\n    width: 100%;\n    border-spacing: 0;\n}\n\n.styles-element-state-pane label {\n    display: flex;\n    margin: 1px;\n}\n\n.styles-animations-controls-pane {\n    overflow: hidden;\n    -webkit-transition: height 0.1s ease-out;\n    height: 0;\n}\n\n.styles-animations-controls-pane > * {\n    margin: 6px 4px;\n}\n\n.styles-animations-controls-pane.expanded {\n    border-bottom: 1px solid rgb(189, 189, 189);\n    height: 56px;\n}\n\n.animations-controls {\n    width: 100%;\n    max-width: 200px;\n    display: flex;\n    align-items: center;\n}\n\n.animations-controls > .toolbar {\n    display: inline-block;\n}\n\n.animations-controls > input {\n    flex-grow: 1;\n    margin-right: 10px;\n}\n\n.animations-controls > .playback-label {\n    width: 35px;\n}\n\n.styles-selector {\n    cursor: text;\n}\n\n.event-listener-tree li {\n    padding: 2px 0 0 5px;\n}\n\n.event-listener-tree {\n    margin-top: 5px;\n}\n\n.event-listener-tree > li {\n    border-top: 1px solid rgb(231, 231, 231);\n}\n\n.event-listener-tree > li:first-of-type {\n    border-top: none;\n}\n\n.event-listener-tree {\n    padding-left: 0 !important;\n}\n\n.event-listener-tree li.parent::before {\n    top: 0 !important;\n}\n\n.event-listener-tree .name {\n    color: rgb(136, 19, 145);\n}\n\n.event-listener-tree-subtitle {\n    float: right;\n}\n\n.image-preview-container {\n    background: transparent;\n    text-align: center;\n}\n\n.image-preview-container img {\n    margin: 2px auto;\n    max-width: 100px;\n    max-height: 100px;\n    background-image: url(Images/checker.png);\n    -webkit-user-select: text;\n    -webkit-user-drag: auto;\n}\n\n.sidebar-pane.composite {\n    position: absolute;\n}\n\n.sidebar-pane.composite > .body {\n    height: 100%;\n}\n\n.sidebar-pane.composite .metrics {\n    border-bottom: 1px solid rgb(64%, 64%, 64%);\n    height: 206px;\n    display: flex;\n    flex-direction: column;\n    -webkit-align-items: center;\n    -webkit-justify-content: center;\n}\n\n.sidebar-pane .metrics-and-styles,\n.sidebar-pane .metrics-and-computed {\n    display: flex !important;\n    flex-direction: column !important;\n    position: relative;\n}\n\n.sidebar-pane .style-panes-wrapper {\n    transform: translateZ(0);\n    flex: 1;\n    overflow-y: auto;\n    position: relative;\n}\n\n.sidebar-pane.composite .metrics-and-computed .sidebar-pane-toolbar,\n.sidebar-pane.composite .metrics-and-styles .sidebar-pane-toolbar {\n    position: absolute;\n}\n\n.sidebar-pane-filter-box {\n    display: flex;\n    border-top: 1px solid rgb(191, 191, 191);\n    flex-basis: 19px;\n    flex-shrink: 0;\n}\n\n.sidebar-pane-filter-box > input {\n    outline: none !important;\n    border: none;\n    width: 100%;\n    margin: 0 4px;\n    background: transparent;\n}\n\n.styles-filter-engaged {\n    background-color: rgba(255, 255, 0, 0.5);\n}\n\n.sidebar-pane.composite .metrics-and-computed .sidebar-pane-toolbar {\n    margin-top: 4px;\n    margin-bottom: -4px;\n    position: relative;\n}\n\n.sidebar-pane.composite .platform-fonts .body {\n    padding: 1ex;\n    -webkit-user-select: text;\n}\n\n.sidebar-pane.composite .platform-fonts .sidebar-separator {\n    border-top: none;\n}\n\n.sidebar-pane.composite .platform-fonts .stats-section {\n    margin-bottom: 5px;\n}\n\n.sidebar-pane.composite .platform-fonts .font-stats-item {\n    padding-left: 1em;\n}\n\n.sidebar-pane.composite .platform-fonts .font-stats-item .delimeter {\n    margin: 0 1ex 0 1ex;\n}\n\n.sidebar-pane.composite .metrics-and-styles .metrics {\n    border-bottom: none;\n}\n\n.sidebar-pane > .body > .split-widget {\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    left: 0;\n    right: 0;\n}\n\n.panel.elements .sidebar-pane-toolbar > select {\n    float: right;\n    width: 23px;\n    height: 17px;\n    color: transparent;\n    background-color: transparent;\n    border: none;\n    background-repeat: no-repeat;\n    margin: 1px 0 0 0;\n    padding: 0;\n    border-radius: 0;\n    -webkit-appearance: none;\n}\n\n.panel.elements .sidebar-pane-toolbar > select:hover {\n    background-position: -23px 0;\n}\n\n.panel.elements .sidebar-pane-toolbar > select:active {\n    background-position: -46px 0;\n}\n\n.panel.elements .sidebar-pane-toolbar > select.select-filter {\n    background-image: url(Images/paneFilterButtons.png);\n}\n.panel.elements .sidebar-pane-toolbar > select > option,\n.panel.elements .sidebar-pane-toolbar > select > hr {\n    color: black;\n}\n\n.styles-section:not(.read-only) .style-properties .webkit-css-property.styles-panel-hovered,\n.styles-section:not(.read-only) .style-properties .value .styles-panel-hovered,\n.styles-section:not(.read-only) .style-properties .value.styles-panel-hovered,\n.styles-section:not(.read-only) span.simple-selector.styles-panel-hovered {\n    text-decoration: underline;\n    cursor: default;\n}\n\n.styles-clipboard-only {\n    display: inline-block;\n    width: 0;\n    opacity: 0;\n    pointer-events: none;\n    white-space: pre;\n}\n\n.popover-icon {\n    margin-left: 1px;\n    margin-right: 2px;\n    width: 10px;\n    height: 10px;\n    position: relative;\n    top: 1px;\n    display: inline-block;\n    line-height: 1px;\n    -webkit-user-select: none;\n}\n\n.bezier-icon {\n    background-color: #9C27B0;\n    border-radius: 2px;\n}\n\n.bezier-icon path {\n    stroke: white;\n    stroke-width: 1.5;\n    stroke-linecap: square;\n    fill: none;\n}\n\n.swatch {\n    background-image: url(Images/checker.png);\n}\n\nli.child-editing .styles-clipboard-only {\n    display: none;\n}\n\nli.editing .swatch,\nli.editing .enabled-button {\n    display: none !important;\n}\n\n.sidebar-separator {\n    background-color: #ddd;\n    padding: 0 5px;\n    border-top: 1px solid #ccc;\n    border-bottom: 1px solid #ccc;\n    color: rgb(50, 50, 50);\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    line-height: 16px;\n}\n\n.swatch-inner {\n    width: 100%;\n    height: 100%;\n    display: inline-block;\n    border: 1px solid rgba(128, 128, 128, 0.6);\n}\n\n.swatch-inner:hover {\n    border: 1px solid rgba(64, 64, 64, 0.8);\n}\n\n.animation-section-body {\n    display: none;\n}\n\n.animation-section-body.expanded {\n    display: block;\n}\n\n.animation-section-body .section {\n    border-bottom: 1px solid rgb(191, 191, 191);\n}\n\n.animationsHeader {\n    padding-top: 23px;\n}\n\n.global-animations-toolbar {\n    position: absolute;\n    top: 0;\n    width: 100%;\n    background-color: #eee;\n    border-bottom: 1px solid rgb(163, 163, 163);\n    padding-left: 10px;\n}\n\nlabel.checkbox-with-label {\n    -webkit-user-select: none;\n}\n\n.events-pane .section:not(:first-of-type) {\n    border-top: 1px solid rgb(231, 231, 231);\n}\n\n.events-pane .section {\n    margin: 0;\n}\n\n.style-properties li.editing {\n    margin-left: 10px;\n    text-overflow: clip;\n}\n\n.style-properties li.editing-sub-part {\n    padding: 3px 6px 8px 18px;\n    margin: -1px -6px -8px -6px;\n    text-overflow: clip;\n}\n\n.styles-pane-toolbar {\n    float: right;\n    margin-top: -3px;\n}\n/*# sourceURL=elements/elementsPanel.css */";Runtime.cachedResources["elements/elementsTreeOutline.css"]="/*\n * Copyright (c) 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.elements-disclosure {\n    width: 100%;\n    display: inline-block;\n    line-height: normal;\n}\n\n.elements-disclosure li {\n    padding: 0 0 0 14px;\n    margin-top: 1px;\n    margin-left: -2px;\n    word-wrap: break-word;\n}\n\n.elements-disclosure li.parent {\n    margin-left: -13px;\n}\n\n.elements-disclosure li.parent::before {\n    float: left;\n    width: 10px;\n    box-sizing: border-box;\n}\n\n.elements-disclosure li.parent::before {\n    -webkit-user-select: none;\n    -webkit-mask-image: url(Images/toolbarButtonGlyphs.png);\n    -webkit-mask-size: 320px 144px;\n    content: \"a\";\n    color: transparent;\n    text-shadow: none;\n    margin-right: 1px;\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.5) {\n.elements-disclosure li.parent::before {\n    -webkit-mask-image: url(Images/toolbarButtonGlyphs_2x.png);\n}\n} /* media */\n\n.elements-disclosure li.parent::before {\n    -webkit-mask-position: -4px -96px;\n    background-color: rgb(110, 110, 110);\n}\n\n.elements-disclosure li .selection {\n    display: none;\n    position: absolute;\n    left: 0;\n    right: 0;\n    height: 15px;\n    z-index: -1;\n}\n\n.elements-disclosure li.hovered:not(.selected) .selection {\n    display: block;\n    left: 3px;\n    right: 3px;\n    background-color: rgba(56, 121, 217, 0.1);\n    border-radius: 5px;\n}\n\n.elements-disclosure li.parent.expanded::before {\n    -webkit-mask-position: -20px -96px;\n}\n\n.elements-disclosure li.selected .selection {\n    display: block;\n    background-color: rgb(212, 212, 212);\n}\n\n.elements-disclosure ol {\n    list-style-type: none;\n    -webkit-padding-start: 12px;\n    margin: 0;\n}\n\n.elements-disclosure ol.children {\n    display: none;\n}\n\n.elements-disclosure ol.children.expanded {\n    display: block;\n}\n\n.elements-disclosure li .webkit-html-tag.close {\n    margin-left: -12px;\n}\n\n.elements-disclosure > ol {\n    position: relative;\n    margin: 0;\n    cursor: default;\n    min-width: 100%;\n    min-height: 100%;\n    -webkit-transform: translateZ(0);\n    padding-left: 2px;\n}\n\n.elements-disclosure ol:focus li.selected {\n    color: white;\n}\n\n.elements-disclosure ol:focus li.parent.selected::before {\n    background-color: white;\n}\n\n.elements-disclosure ol:focus li.selected * {\n    color: inherit;\n}\n\n.elements-disclosure ol:focus li.selected .selection {\n    background-color: rgb(56, 121, 217);\n}\n\n.elements-tree-outline ol.shadow-root {\n    margin-left: 5px;\n    padding-left: 5px;\n    border-left: 1px solid rgb(190, 190, 190);\n}\n\n.elements-tree-outline ol.shadow-root-depth-4 {\n    background-color: rgba(0, 0, 0, 0.04);\n}\n\n.elements-tree-outline ol.shadow-root-depth-3 {\n    background-color: rgba(0, 0, 0, 0.03);\n}\n\n.elements-tree-outline ol.shadow-root-depth-2 {\n    background-color: rgba(0, 0, 0, 0.02);\n}\n\n.elements-tree-outline ol.shadow-root-depth-1 {\n    background-color: rgba(0, 0, 0, 0.01);\n}\n\n.elements-tree-outline ol.shadow-root-deep {\n    background-color: transparent;\n}\n\n.elements-tree-editor {\n    -webkit-user-select: text;\n    -webkit-user-modify: read-write-plaintext-only;\n}\n\n.elements-disclosure li.elements-drag-over .selection {\n    display: block;\n    margin-top: -2px;\n    border-top: 2px solid rgb(56, 121, 217);\n}\n\n.elements-disclosure li.in-clipboard .highlight {\n    outline: 1px dotted darkgrey;\n}\n\n.CodeMirror {\n    /* Consistent with the .editing class in inspector.css */\n    box-shadow: rgba(0, 0, 0, .5) 3px 3px 4px;\n    outline: 1px solid rgb(66%, 66%, 66%) !important;\n    background-color: white;\n}\n\n.CodeMirror-lines {\n    padding: 0;\n}\n\n.CodeMirror pre {\n    padding: 0;\n}\n\nbutton, input, select {\n  font-family: inherit;\n  font-size: inherit;\n}\n\n.editing {\n    -webkit-user-select: text;\n    box-shadow: rgba(0, 0, 0, .5) 3px 3px 4px;\n    outline: 1px solid rgb(66%, 66%, 66%) !important;\n    background-color: white;\n    -webkit-user-modify: read-write-plaintext-only;\n    text-overflow: clip !important;\n    padding-left: 2px;\n    margin-left: -2px;\n    padding-right: 2px;\n    margin-right: -2px;\n    margin-bottom: -1px;\n    padding-bottom: 1px;\n    opacity: 1.0 !important;\n}\n\n.editing,\n.editing * {\n    color: #222 !important;\n    text-decoration: none !important;\n}\n\n.editing br {\n    display: none;\n}\n\n.elements-gutter-decoration {\n    position: absolute;\n    left: 1px;\n    margin-top: 2px;\n    height: 8px;\n    width: 8px;\n    border-radius: 4px;\n    border: 1px solid orange;\n    background-color: orange;\n}\n\n.elements-gutter-decoration.elements-has-decorated-children {\n    opacity: 0.5;\n}\n\n.add-attribute {\n    margin-left: 1px;\n    margin-right: 1px;\n    white-space: nowrap;\n}\n\n.elements-tree-element-pick-node-1 {\n    border-radius: 3px;\n    padding: 1px 0 1px 0;\n    -webkit-animation: elements-tree-element-pick-node-animation-1 0.5s 1;\n}\n\n.elements-tree-element-pick-node-2 {\n    border-radius: 3px;\n    padding: 1px 0 1px 0;\n    -webkit-animation: elements-tree-element-pick-node-animation-2 0.5s 1;\n}\n\n@-webkit-keyframes elements-tree-element-pick-node-animation-1 {\n    from { background-color: rgb(255, 210, 126); }\n    to { background-color: inherit; }\n}\n\n@-webkit-keyframes elements-tree-element-pick-node-animation-2 {\n    from { background-color: rgb(255, 210, 126); }\n    to { background-color: inherit; }\n}\n\n.pick-node-mode {\n    cursor: pointer;\n}\n\n.webkit-html-attribute-value a {\n    cursor: default !important;\n}\n\n.elements-tree-nowrap, .elements-tree-nowrap .li {\n    white-space: pre !important;\n}\n\n.elements-disclosure .elements-tree-nowrap li {\n    word-wrap: normal;\n}\n\n/* DOM update highlight */\n@-webkit-keyframes dom-update-highlight-animation {\n    from {\n        background-color: rgb(158, 54, 153);\n        color: white;\n    }\n    80% {\n        background-color: rgb(245, 219, 244);\n        color: inherit;\n    }\n    to {\n        background-color: inherit;\n    }\n}\n\n.dom-update-highlight {\n    -webkit-animation: dom-update-highlight-animation 1.4s 1 cubic-bezier(0, 0, 0.2, 1);\n    border-radius: 2px;\n}\n\n.elements-disclosure.single-node li {\n    padding-left: 2px;\n}\n\n.elements-tree-shortcut-title {\n    color: rgb(87, 87, 87);\n}\n\nol:hover > li > .elements-tree-shortcut-link {\n    display: initial;\n}\n\n.elements-tree-shortcut-link {\n    color: rgb(87, 87, 87);\n    display: none;\n}\n\n/*# sourceURL=elements/elementsTreeOutline.css */";Runtime.cachedResources["elements/spectrum.css"]="/* https://github.com/bgrins/spectrum */\n:host {\n    width: 226px;\n    height: 240px;\n    -webkit-user-select: none;\n}\n\n.spectrum-color {\n    position: relative;\n    width: 226px;\n    height: 124px;\n    border-radius: 2px 2px 0 0;\n    overflow: hidden;\n}\n\n.spectrum-display-value {\n    -webkit-user-select: text;\n    display: inline-block;\n    padding-left: 2px;\n}\n\n.spectrum-hue {\n    top: 140px;\n}\n\n.spectrum-alpha {\n    top: 159px;\n    background-image: url(Images/checker.png);\n    background-size: 12px 11px;\n}\n\n.spectrum-alpha-background {\n    height: 100%;\n    border-radius: 2px;\n}\n\n.spectrum-hue, .spectrum-alpha {\n    position: absolute;\n    right: 16px;\n    width: 130px;\n    height: 11px;\n    border-radius: 2px;\n}\n\n.spectrum-dragger,\n.spectrum-slider {\n    -webkit-user-select: none;\n}\n\n.spectrum-sat {\n    background-image: linear-gradient(to right, white, rgba(204, 154, 129, 0));\n}\n\n.spectrum-val {\n    background-image: linear-gradient(to top, black, rgba(204, 154, 129, 0));\n}\n\n.spectrum-hue {\n    background: linear-gradient(to left, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);\n}\n\n.spectrum-dragger {\n    border-radius: 12px;\n    height: 12px;\n    width: 12px;\n    border: 1px solid white;\n    cursor: pointer;\n    position: absolute;\n    top: 0;\n    left: 0;\n    background: black;\n    box-shadow: 0 0 2px 0px rgba(0, 0, 0, 0.24);\n}\n\n.spectrum-slider {\n    position: absolute;\n    top: -1px;\n    cursor: pointer;\n    width: 13px;\n    height: 13px;\n    border-radius: 13px;\n    background-color: rgb(248, 248, 248);\n    box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.37);\n}\n\n.swatch {\n    width: 16px;\n    height: 16px;\n    margin: 0;\n    position: absolute;\n    top: 148px;\n    left: 48px;\n    background-image: url(Images/checker.png);\n    border-radius: 16px;\n}\n\n.swatch-inner {\n    width: 100%;\n    height: 100%;\n    display: inline-block;\n    border-radius: 16px;\n}\n\n.swatch-inner-white {\n    border: 1px solid #ddd;\n}\n\n.spectrum-text {\n    position: absolute;\n    top: 184px;\n    left: 16px;\n}\n\n.spectrum-text-value {\n    display: inline-block;\n    width: 36px;\n    max-width: 36px;\n    overflow: hidden;\n    text-align: center;\n    border: 1px solid #dadada;\n    border-radius: 2px;\n    margin-right: 6px;\n    line-height: 20px;\n    font-size: 11px;\n    padding: 0;\n    -webkit-user-modify: read-write-plaintext-only;\n    color: #333;\n}\n\n.spectrum-text-label {\n    letter-spacing: 35.5px;\n    margin-top: 8px;\n    display: block;\n    color: #969696;\n    margin-left: 15px;\n    width: 162px;\n}\n\n.spectrum-text-hex > .spectrum-text-value {\n    width: 162px;\n}\n\n.spectrum-text-hex > .spectrum-text-label {\n    letter-spacing: normal;\n    margin-left: 0px;\n    text-align: center;\n}\n\n.spectrum-palette-value {\n    background-color: rgb(65, 75, 217);\n    border-radius: 2px;\n    margin-top: 12px;\n    margin-left: 12px;\n    width: 12px;\n    height: 12px;\n    display: inline-block;\n}\n\n.spectrum-palette-container {\n    position: absolute;\n    top: 244px;\n}\n\n.spectrum-display-switcher {\n    top: 196px;\n    position: absolute;\n    right: 16px;\n    padding: 2px;\n    border-radius: 2px;\n}\n\n.spectrum-display-switcher:hover {\n    background-color: #EEEEEE;\n}\n\n.spectrum-eye-dropper {\n    width: 16px;\n    height: 16px;\n    position: absolute;\n    left: 16px;\n    top: 148px;\n}\n\n.spectrum-eye-dropper::shadow .toolbar-shadow {\n    height: 16px;\n}\n\n.spectrum-eye-dropper::shadow .toolbar-item {\n    width: 16px;\n    height: 16px;\n}\n\n.spectrum-eye-dropper::shadow .eyedropper-toolbar-item .glyph {\n    width: 16px;\n    height: 16px;\n    -webkit-mask-position: -296px -124px;\n}\n/*# sourceURL=elements/spectrum.css */";