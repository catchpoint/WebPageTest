WebInspector.AnimationModel=function(target)
{WebInspector.SDKModel.call(this,WebInspector.AnimationModel,target);this._agent=target.animationAgent();target.registerAnimationDispatcher(new WebInspector.AnimationDispatcher(this));this._animationsById=new Map();this._animationGroups=new Map();this._pendingAnimations=[];this._playbackRate=1;target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated,this._reset,this);this._screenshotCapture=new WebInspector.AnimationModel.ScreenshotCapture(target,this);}
WebInspector.AnimationModel.Events={AnimationGroupStarted:"AnimationGroupStarted",ModelReset:"ModelReset"}
WebInspector.AnimationModel.prototype={_reset:function()
{this._animationsById.clear();this._animationGroups.clear();this._pendingAnimations=[];this.dispatchEventToListeners(WebInspector.AnimationModel.Events.ModelReset);},animationCreated:function(id)
{this._pendingAnimations.push(id);},_animationCanceled:function(id)
{this._pendingAnimations.remove(id);this._flushPendingAnimationsIfNeeded();},animationStarted:function(payload)
{var animation=WebInspector.AnimationModel.Animation.parsePayload(this.target(),payload);if(animation.type()==="WebAnimation"&&animation.source().keyframesRule().keyframes().length===0){this._pendingAnimations.remove(animation.id());}else{this._animationsById.set(animation.id(),animation);if(this._pendingAnimations.indexOf(animation.id())===-1)
this._pendingAnimations.push(animation.id());}
this._flushPendingAnimationsIfNeeded();},_flushPendingAnimationsIfNeeded:function()
{for(var id of this._pendingAnimations){if(!this._animationsById.get(id))
return;}
while(this._pendingAnimations.length)
this._matchExistingGroups(this._createGroupFromPendingAnimations());},_matchExistingGroups:function(incomingGroup)
{var matchedGroup=null;for(var group of this._animationGroups.values()){if(group._matches(incomingGroup)){matchedGroup=group;group._update(incomingGroup);break;}}
if(!matchedGroup){this._animationGroups.set(incomingGroup.id(),incomingGroup);this._screenshotCapture.captureScreenshots(incomingGroup.finiteDuration(),incomingGroup._screenshots);}
this.dispatchEventToListeners(WebInspector.AnimationModel.Events.AnimationGroupStarted,matchedGroup||incomingGroup);return!!matchedGroup;},_createGroupFromPendingAnimations:function()
{console.assert(this._pendingAnimations.length);var groupedAnimations=[this._animationsById.get(this._pendingAnimations.shift())];var remainingAnimations=[];for(var id of this._pendingAnimations){var anim=this._animationsById.get(id);if(anim.startTime()===groupedAnimations[0].startTime())
groupedAnimations.push(anim);else
remainingAnimations.push(id);}
this._pendingAnimations=remainingAnimations;return new WebInspector.AnimationModel.AnimationGroup(this,groupedAnimations[0].id(),groupedAnimations);},playbackRatePromise:function()
{function callback(error,playbackRate)
{if(error)
return 1;this._playbackRate=playbackRate;return playbackRate;}
return this._agent.getPlaybackRate(callback.bind(this)).catchException(1);},setPlaybackRate:function(playbackRate)
{this._playbackRate=playbackRate;this._agent.setPlaybackRate(playbackRate);},_releaseAnimations:function(animations)
{this.target().animationAgent().releaseAnimations(animations);},suspendModel:function()
{this._reset();return this._agent.disable();},resumeModel:function()
{if(!this._enabled)
return Promise.resolve();return this._agent.enable();},ensureEnabled:function()
{if(this._enabled)
return;this._agent.enable();this._enabled=true;},__proto__:WebInspector.SDKModel.prototype}
WebInspector.AnimationModel._symbol=Symbol("AnimationModel");WebInspector.AnimationModel.fromTarget=function(target)
{if(!target[WebInspector.AnimationModel._symbol])
target[WebInspector.AnimationModel._symbol]=new WebInspector.AnimationModel(target);return target[WebInspector.AnimationModel._symbol];}
WebInspector.AnimationModel.Animation=function(target,payload)
{WebInspector.SDKObject.call(this,target);this._payload=payload;this._source=new WebInspector.AnimationModel.AnimationEffect(this.target(),this._payload.source);}
WebInspector.AnimationModel.Animation.parsePayload=function(target,payload)
{return new WebInspector.AnimationModel.Animation(target,payload);}
WebInspector.AnimationModel.Animation.Type={CSSTransition:"CSSTransition",CSSAnimation:"CSSAnimation",WebAnimation:"WebAnimation"}
WebInspector.AnimationModel.Animation.prototype={payload:function()
{return this._payload;},id:function()
{return this._payload.id;},name:function()
{return this._payload.name;},paused:function()
{return this._payload.pausedState;},playState:function()
{return this._playState||this._payload.playState;},setPlayState:function(playState)
{this._playState=playState;},playbackRate:function()
{return this._payload.playbackRate;},startTime:function()
{return this._payload.startTime;},endTime:function()
{if(!this.source().iterations)
return Infinity;return this.startTime()+this.source().delay()+this.source().duration()*this.source().iterations()+this.source().endDelay();},_finiteDuration:function()
{var iterations=Math.min(this.source().iterations(),3);return this.source().delay()+this.source().duration()*iterations;},currentTime:function()
{return this._payload.currentTime;},source:function()
{return this._source;},type:function()
{return(this._payload.type);},overlaps:function(animation)
{if(!this.source().iterations()||!animation.source().iterations())
return true;var firstAnimation=this.startTime()<animation.startTime()?this:animation;var secondAnimation=firstAnimation===this?animation:this;return firstAnimation.endTime()>=secondAnimation.startTime();},setTiming:function(duration,delay)
{this._source.node().then(this._updateNodeStyle.bind(this,duration,delay));this._source._duration=duration;this._source._delay=delay;this.target().animationAgent().setTiming(this.id(),duration,delay);},_updateNodeStyle:function(duration,delay,node)
{var animationPrefix;if(this.type()==WebInspector.AnimationModel.Animation.Type.CSSTransition)
animationPrefix="transition-";else if(this.type()==WebInspector.AnimationModel.Animation.Type.CSSAnimation)
animationPrefix="animation-";else
return;var cssModel=WebInspector.CSSStyleModel.fromTarget(node.target());if(!cssModel)
return;cssModel.setEffectivePropertyValueForNode(node.id,animationPrefix+"duration",duration+"ms");cssModel.setEffectivePropertyValueForNode(node.id,animationPrefix+"delay",delay+"ms");},remoteObjectPromise:function()
{function callback(error,payload)
{return!error?this.target().runtimeModel.createRemoteObject(payload):null;}
return this.target().animationAgent().resolveAnimation(this.id(),callback.bind(this));},_cssId:function()
{return this._payload.cssId||"";},__proto__:WebInspector.SDKObject.prototype}
WebInspector.AnimationModel.AnimationEffect=function(target,payload)
{WebInspector.SDKObject.call(this,target);this._payload=payload;if(payload.keyframesRule)
this._keyframesRule=new WebInspector.AnimationModel.KeyframesRule(target,payload.keyframesRule);this._delay=this._payload.delay;this._duration=this._payload.duration;}
WebInspector.AnimationModel.AnimationEffect.prototype={delay:function()
{return this._delay;},endDelay:function()
{return this._payload.endDelay;},playbackRate:function()
{return this._payload.playbackRate;},iterationStart:function()
{return this._payload.iterationStart;},iterations:function()
{if(!this.delay()&&!this.endDelay()&&!this.duration())
return 0;return this._payload.iterations||Infinity;},duration:function()
{return this._duration;},direction:function()
{return this._payload.direction;},fill:function()
{return this._payload.fill;},node:function()
{if(!this._deferredNode)
this._deferredNode=new WebInspector.DeferredDOMNode(this.target(),this.backendNodeId());return this._deferredNode.resolvePromise();},deferredNode:function()
{return new WebInspector.DeferredDOMNode(this.target(),this.backendNodeId());},backendNodeId:function()
{return this._payload.backendNodeId;},keyframesRule:function()
{return this._keyframesRule;},easing:function()
{return this._payload.easing;},__proto__:WebInspector.SDKObject.prototype}
WebInspector.AnimationModel.KeyframesRule=function(target,payload)
{WebInspector.SDKObject.call(this,target);this._payload=payload;this._keyframes=this._payload.keyframes.map(function(keyframeStyle){return new WebInspector.AnimationModel.KeyframeStyle(target,keyframeStyle);});}
WebInspector.AnimationModel.KeyframesRule.prototype={_setKeyframesPayload:function(payload)
{this._keyframes=payload.map(function(keyframeStyle){return new WebInspector.AnimationModel.KeyframeStyle(this._target,keyframeStyle);});},name:function()
{return this._payload.name;},keyframes:function()
{return this._keyframes;},__proto__:WebInspector.SDKObject.prototype}
WebInspector.AnimationModel.KeyframeStyle=function(target,payload)
{WebInspector.SDKObject.call(this,target);this._payload=payload;this._offset=this._payload.offset;}
WebInspector.AnimationModel.KeyframeStyle.prototype={offset:function()
{return this._offset;},setOffset:function(offset)
{this._offset=offset*100+"%";},offsetAsNumber:function()
{return parseFloat(this._offset)/100;},easing:function()
{return this._payload.easing;},__proto__:WebInspector.SDKObject.prototype}
WebInspector.AnimationModel.AnimationGroup=function(model,id,animations)
{WebInspector.SDKObject.call(this,model.target());this._model=model;this._id=id;this._animations=animations;this._paused=false;this._screenshots=[];this._screenshotImages=[];}
WebInspector.AnimationModel.AnimationGroup.prototype={id:function()
{return this._id;},animations:function()
{return this._animations;},release:function()
{this._model._animationGroups.remove(this.id());this._model._releaseAnimations(this._animationIds());},_animationIds:function()
{function extractId(animation)
{return animation.id();}
return this._animations.map(extractId);},startTime:function()
{return this._animations[0].startTime();},finiteDuration:function()
{var maxDuration=0;for(var i=0;i<this._animations.length;++i)
maxDuration=Math.max(maxDuration,this._animations[i]._finiteDuration());return maxDuration;},seekTo:function(currentTime)
{this.target().animationAgent().seekAnimations(this._animationIds(),currentTime);},paused:function()
{return this._paused;},togglePause:function(paused)
{if(paused===this._paused)
return;this._paused=paused;this.target().animationAgent().setPaused(this._animationIds(),paused);},currentTimePromise:function()
{function callback(error,currentTime)
{return!error?currentTime:0;}
return this.target().animationAgent().getCurrentTime(this._animations[0].id(),callback).catchException(0);},_matches:function(group)
{function extractId(anim)
{if(anim.type()===WebInspector.AnimationModel.Animation.Type.WebAnimation)
return anim.type()+anim.id();else
return anim._cssId();}
if(this._animations.length!==group._animations.length)
return false;var left=this._animations.map(extractId).sort();var right=group._animations.map(extractId).sort();for(var i=0;i<left.length;i++){if(left[i]!==right[i])
return false;}
return true;},_update:function(group)
{this._model._releaseAnimations(this._animationIds());this._animations=group._animations;},screenshots:function()
{for(var i=0;i<this._screenshots.length;++i){var image=new Image();image.src="data:image/jpeg;base64,"+this._screenshots[i];this._screenshotImages.push(image);}
this._screenshots=[];return this._screenshotImages;},__proto__:WebInspector.SDKObject.prototype}
WebInspector.AnimationDispatcher=function(animationModel)
{this._animationModel=animationModel;}
WebInspector.AnimationDispatcher.prototype={animationCreated:function(id)
{this._animationModel.animationCreated(id);},animationCanceled:function(id)
{this._animationModel._animationCanceled(id);},animationStarted:function(payload)
{this._animationModel.animationStarted(payload);}}
WebInspector.AnimationModel.ScreenshotCapture=function(target,model)
{this._target=target;this._requests=[];this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.ScreencastFrame,this._screencastFrame,this);this._model=model;this._model.addEventListener(WebInspector.AnimationModel.Events.ModelReset,this._stopScreencast,this);}
WebInspector.AnimationModel.ScreenshotCapture.Request;WebInspector.AnimationModel.ScreenshotCapture.prototype={captureScreenshots:function(duration,screenshots)
{var screencastDuration=Math.min(duration/this._model._playbackRate,3000);var endTime=screencastDuration+window.performance.now();this._requests.push({endTime:endTime,screenshots:screenshots});if(!this._endTime||endTime>this._endTime){clearTimeout(this._stopTimer);this._stopTimer=setTimeout(this._stopScreencast.bind(this),screencastDuration);this._endTime=endTime;}
if(this._capturing)
return;this._capturing=true;this._target.pageAgent().startScreencast("jpeg",80,undefined,300,2);},_screencastFrame:function(event)
{function isAnimating(request)
{return request.endTime>=now;}
if(!this._capturing)
return;var base64Data=(event.data["data"]);var now=window.performance.now();this._requests=this._requests.filter(isAnimating);for(var request of this._requests)
request.screenshots.push(base64Data);},_stopScreencast:function()
{if(!this._capturing)
return;delete this._stopTimer;delete this._endTime;this._requests=[];this._capturing=false;this._target.pageAgent().stopScreencast();}};WebInspector.AnimationGroupPreviewUI=function(model)
{this._model=model;this.element=createElementWithClass("div","animation-buffer-preview");this.element.createChild("div","animation-paused fill");this._removeButton=this.element.createChild("div","animation-remove-button");this._removeButton.textContent="\u2715";this._replayOverlayElement=this.element.createChild("div","animation-buffer-preview-animation");this._svg=this.element.createSVGChild("svg");this._svg.setAttribute("width","100%");this._svg.setAttribute("preserveAspectRatio","none");this._svg.setAttribute("height","100%");this._viewBoxHeight=32;this._svg.setAttribute("viewBox","0 0 100 "+this._viewBoxHeight);this._svg.setAttribute("shape-rendering","crispEdges");this._render();}
WebInspector.AnimationGroupPreviewUI.prototype={_groupDuration:function()
{var duration=0;for(var anim of this._model.animations()){var animDuration=anim.source().delay()+anim.source().duration();if(animDuration>duration)
duration=animDuration;}
return duration;},removeButton:function()
{return this._removeButton;},replay:function()
{this._replayOverlayElement.animate([{offset:0,width:"0%",opacity:1},{offset:0.9,width:"100%",opacity:1},{offset:1,width:"100%",opacity:0}],{duration:200,easing:"cubic-bezier(0, 0, 0.2, 1)"});},_render:function()
{this._svg.removeChildren();var maxToShow=10;var numberOfAnimations=Math.min(this._model.animations().length,maxToShow);var timeToPixelRatio=100/Math.max(this._groupDuration(),750);for(var i=0;i<numberOfAnimations;i++){var effect=this._model.animations()[i].source();var line=this._svg.createSVGChild("line");line.setAttribute("x1",effect.delay()*timeToPixelRatio);line.setAttribute("x2",(effect.delay()+effect.duration())*timeToPixelRatio);var y=Math.floor(this._viewBoxHeight/Math.max(6,numberOfAnimations)*i+1);line.setAttribute("y1",y);line.setAttribute("y2",y);line.style.stroke=WebInspector.AnimationUI.Color(this._model.animations()[i]);}}};WebInspector.AnimationScreenshotPopover=function(images)
{WebInspector.VBox.call(this,true);console.assert(images.length);this.registerRequiredCSS("animation/animationScreenshotPopover.css");this.contentElement.classList.add("animation-screenshot-popover");this._frames=images;for(var image of images){this.contentElement.appendChild(image);image.style.display="none";}
this._currentFrame=0;this._frames[0].style.display="block";this._progressBar=this.contentElement.createChild("div","animation-progress");}
WebInspector.AnimationScreenshotPopover.prototype={wasShown:function()
{this._rafId=this.contentElement.window().requestAnimationFrame(this._changeFrame.bind(this));},willHide:function()
{this.contentElement.window().cancelAnimationFrame(this._rafId);delete this._endDelay;},_changeFrame:function()
{this._rafId=this.contentElement.window().requestAnimationFrame(this._changeFrame.bind(this));if(this._endDelay){this._endDelay--;return;}
this._showFrame=!this._showFrame;if(!this._showFrame)
return;var numFrames=this._frames.length;this._frames[this._currentFrame%numFrames].style.display="none";this._currentFrame++;this._frames[(this._currentFrame)%numFrames].style.display="block";if(this._currentFrame%numFrames===numFrames-1)
this._endDelay=50;this._progressBar.style.width=(this._currentFrame%numFrames+1)/numFrames*100+"%";},__proto__:WebInspector.VBox.prototype};WebInspector.AnimationTimeline=function()
{WebInspector.VBox.call(this,true);this.registerRequiredCSS("animation/animationTimeline.css");this.element.classList.add("animations-timeline");this._grid=this.contentElement.createSVGChild("svg","animation-timeline-grid");this._underlyingPlaybackRate=1;this._createHeader();this._animationsContainer=this.contentElement.createChild("div","animation-timeline-rows");var timelineHint=this.contentElement.createChild("div","animation-timeline-rows-hint");timelineHint.textContent=WebInspector.UIString("Select an effect above to inspect and modify.");this._defaultDuration=100;this._duration=this._defaultDuration;this._timelineControlsWidth=150;this._nodesMap=new Map();this._uiAnimations=[];this._groupBuffer=[];this._previewMap=new Map();this._symbol=Symbol("animationTimeline");this._animationsMap=new Map();WebInspector.targetManager.addModelListener(WebInspector.DOMModel,WebInspector.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);WebInspector.targetManager.observeTargets(this,WebInspector.Target.Type.Page);WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode,this._nodeChanged,this);}
WebInspector.AnimationTimeline.GlobalPlaybackRates=[1,0.25,0.1];WebInspector.AnimationTimeline._ControlState={Play:"play-outline",Replay:"replay-outline",Pause:"pause-outline"}
WebInspector.AnimationTimeline.prototype={wasShown:function()
{for(var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page))
this._addEventListeners(target);},willHide:function()
{for(var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page))
this._removeEventListeners(target);this._popoverHelper.hidePopover();},targetAdded:function(target)
{if(this.isShowing())
this._addEventListeners(target);},targetRemoved:function(target)
{this._removeEventListeners(target);},_addEventListeners:function(target)
{var animationModel=WebInspector.AnimationModel.fromTarget(target);animationModel.ensureEnabled();animationModel.addEventListener(WebInspector.AnimationModel.Events.AnimationGroupStarted,this._animationGroupStarted,this);animationModel.addEventListener(WebInspector.AnimationModel.Events.ModelReset,this._reset,this);},_removeEventListeners:function(target)
{var animationModel=WebInspector.AnimationModel.fromTarget(target);animationModel.removeEventListener(WebInspector.AnimationModel.Events.AnimationGroupStarted,this._animationGroupStarted,this);animationModel.removeEventListener(WebInspector.AnimationModel.Events.ModelReset,this._reset,this);},_nodeChanged:function()
{for(var nodeUI of this._nodesMap.values())
nodeUI._nodeChanged();},_createScrubber:function(){this._timelineScrubber=createElementWithClass("div","animation-scrubber hidden");this._timelineScrubberLine=this._timelineScrubber.createChild("div","animation-scrubber-line");this._timelineScrubberLine.createChild("div","animation-scrubber-head");this._timelineScrubber.createChild("div","animation-time-overlay");return this._timelineScrubber;},_createHeader:function()
{var toolbarContainer=this.contentElement.createChild("div","animation-timeline-toolbar-container");var topToolbar=new WebInspector.Toolbar("animation-timeline-toolbar",toolbarContainer);var clearButton=new WebInspector.ToolbarButton(WebInspector.UIString("Clear all"),"clear-toolbar-item");clearButton.addEventListener("click",this._reset.bind(this));topToolbar.appendToolbarItem(clearButton);topToolbar.appendSeparator();var playbackRateControl=toolbarContainer.createChild("div","animation-playback-rate-control");this._playbackRateButtons=[];for(var playbackRate of WebInspector.AnimationTimeline.GlobalPlaybackRates){var button=playbackRateControl.createChild("div","animation-playback-rate-button");button.textContent=WebInspector.UIString(playbackRate*100+"%");button.playbackRate=playbackRate;button.addEventListener("click",this._setPlaybackRate.bind(this,playbackRate));button.title=WebInspector.UIString("Set speed to ")+button.textContent;this._playbackRateButtons.push(button);}
this._updatePlaybackControls();this._previewContainer=this.contentElement.createChild("div","animation-timeline-buffer");this._popoverHelper=new WebInspector.PopoverHelper(this._previewContainer,this._getPopoverAnchor.bind(this),this._showPopover.bind(this),this._onHidePopover.bind(this),true);this._popoverHelper.setTimeout(0);var emptyBufferHint=this.contentElement.createChild("div","animation-timeline-buffer-hint");emptyBufferHint.textContent=WebInspector.UIString("Listening for animations...");var container=this.contentElement.createChild("div","animation-timeline-header");var controls=container.createChild("div","animation-controls");this._currentTime=controls.createChild("div","animation-timeline-current-time monospace");var toolbar=new WebInspector.Toolbar("animation-controls-toolbar",controls);this._controlButton=new WebInspector.ToolbarButton(WebInspector.UIString("Replay timeline"),"animation-control-toolbar-item");this._controlButton.setState(WebInspector.AnimationTimeline._ControlState.Replay);this._controlButton.addEventListener("click",this._controlButtonToggle.bind(this));toolbar.appendToolbarItem(this._controlButton);var gridHeader=container.createChild("div","animation-grid-header");WebInspector.installDragHandle(gridHeader,this._repositionScrubber.bind(this),this._scrubberDragMove.bind(this),this._scrubberDragEnd.bind(this),"text");container.appendChild(this._createScrubber());WebInspector.installDragHandle(this._timelineScrubberLine,this._scrubberDragStart.bind(this),this._scrubberDragMove.bind(this),this._scrubberDragEnd.bind(this),"col-resize");this._currentTime.textContent="";return container;},_getPopoverAnchor:function(element,event)
{if(element.isDescendant(this._previewContainer))
return element;},_showPopover:function(anchor,popover)
{var animGroup;for(var group of this._previewMap.keysArray()){if(this._previewMap.get(group).element===anchor.parentElement)
animGroup=group;}
console.assert(animGroup);var screenshots=animGroup.screenshots();if(!screenshots.length)
return;var content=new WebInspector.AnimationScreenshotPopover(screenshots);popover.setNoMargins(true);popover.showView(content,anchor);},_onHidePopover:function()
{},_setPlaybackRate:function(playbackRate)
{this._underlyingPlaybackRate=playbackRate;var target=WebInspector.targetManager.mainTarget();if(target)
WebInspector.AnimationModel.fromTarget(target).setPlaybackRate(this._underlyingPlaybackRate);WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.AnimationsPlaybackRateChanged);if(this._scrubberPlayer)
this._scrubberPlayer.playbackRate=this._effectivePlaybackRate();this._updatePlaybackControls();},_updatePlaybackControls:function()
{for(var button of this._playbackRateButtons){var selected=this._underlyingPlaybackRate===button.playbackRate;button.classList.toggle("selected",selected);}},_controlButtonToggle:function()
{if(this._controlButton.state()===WebInspector.AnimationTimeline._ControlState.Play)
this._togglePause(false);else if(this._controlButton.state()===WebInspector.AnimationTimeline._ControlState.Replay)
this._replay();else
this._togglePause(true);},_updateControlButton:function()
{this._controlButton.setEnabled(!!this._selectedGroup);if(this._selectedGroup&&this._selectedGroup.paused()){this._controlButton.setState(WebInspector.AnimationTimeline._ControlState.Play);this._controlButton.setTitle(WebInspector.UIString("Play timeline"));}else if(!this._scrubberPlayer||this._scrubberPlayer.currentTime>=this.duration()){this._controlButton.setState(WebInspector.AnimationTimeline._ControlState.Replay);this._controlButton.setTitle(WebInspector.UIString("Replay timeline"));}else{this._controlButton.setState(WebInspector.AnimationTimeline._ControlState.Pause);this._controlButton.setTitle(WebInspector.UIString("Pause timeline"));}},_updateAnimationsPlaybackRate:function()
{function syncPlaybackRate(playbackRate)
{this._underlyingPlaybackRate=playbackRate||1;this._updatePlaybackControls();}
for(var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page))
WebInspector.AnimationModel.fromTarget(target).playbackRatePromise().then(syncPlaybackRate.bind(this));},_effectivePlaybackRate:function()
{return this._selectedGroup&&this._selectedGroup.paused()?0:this._underlyingPlaybackRate;},_togglePause:function(pause)
{this._selectedGroup.togglePause(pause);if(this._scrubberPlayer)
this._scrubberPlayer.playbackRate=this._effectivePlaybackRate();this._previewMap.get(this._selectedGroup).element.classList.toggle("paused",pause);this._updateControlButton();},_replay:function()
{if(!this._selectedGroup)
return;this._selectedGroup.seekTo(0);this._animateTime(0);this._updateControlButton();},duration:function()
{return this._duration;},setDuration:function(duration)
{this._duration=duration;this.scheduleRedraw();},_clearTimeline:function()
{this._uiAnimations=[];this._nodesMap.clear();this._animationsMap.clear();this._animationsContainer.removeChildren();this._duration=this._defaultDuration;this._timelineScrubber.classList.add("hidden");delete this._selectedGroup;if(this._scrubberPlayer)
this._scrubberPlayer.cancel();delete this._scrubberPlayer;this._currentTime.textContent="";this._updateControlButton();},_reset:function()
{this._clearTimeline();this._updateAnimationsPlaybackRate();for(var group of this._groupBuffer)
group.release();this._groupBuffer=[];this._previewMap.clear();this._previewContainer.removeChildren();this._popoverHelper.hidePopover();this._renderGrid();},_animationGroupStarted:function(event)
{this._addAnimationGroup((event.data));},_addAnimationGroup:function(group)
{function startTimeComparator(left,right)
{return left.startTime()>right.startTime();}
if(this._previewMap.get(group)){if(this._selectedGroup===group)
this._syncScrubber();else
this._previewMap.get(group).replay();return;}
this._groupBuffer.sort(startTimeComparator);var groupsToDiscard=[];var bufferSize=this.width()/50;while(this._groupBuffer.length>bufferSize){var toDiscard=this._groupBuffer.splice(this._groupBuffer[0]===this._selectedGroup?1:0,1);groupsToDiscard.push(toDiscard[0]);}
for(var g of groupsToDiscard){this._previewMap.get(g).element.remove();this._previewMap.delete(g);g.release();}
var preview=new WebInspector.AnimationGroupPreviewUI(group);this._groupBuffer.push(group);this._previewMap.set(group,preview);this._previewContainer.appendChild(preview.element);preview.removeButton().addEventListener("click",this._removeAnimationGroup.bind(this,group));preview.element.addEventListener("click",this._selectAnimationGroup.bind(this,group));},_removeAnimationGroup:function(group,event)
{this._groupBuffer.remove(group);this._previewMap.get(group).element.remove();this._previewMap.delete(group);group.release();event.consume(true);if(this._selectedGroup===group){this._clearTimeline();this._renderGrid();}},_selectAnimationGroup:function(group)
{function applySelectionClass(ui,group)
{ui.element.classList.toggle("selected",this._selectedGroup===group);}
if(this._selectedGroup===group){this._togglePause(false);this._replay();return;}
this._clearTimeline();this._selectedGroup=group;this._previewMap.forEach(applySelectionClass,this);this.setDuration(Math.max(500,group.finiteDuration()+100));for(var anim of group.animations())
this._addAnimation(anim);this.scheduleRedraw();this._timelineScrubber.classList.remove("hidden");this._togglePause(false);this._replay();},_addAnimation:function(animation)
{function nodeResolved(node)
{nodeUI.nodeResolved(node);uiAnimation.setNode(node);if(node)
node[this._symbol]=nodeUI;}
var nodeUI=this._nodesMap.get(animation.source().backendNodeId());if(!nodeUI){nodeUI=new WebInspector.AnimationTimeline.NodeUI(animation.source());this._animationsContainer.appendChild(nodeUI.element);this._nodesMap.set(animation.source().backendNodeId(),nodeUI);}
var nodeRow=nodeUI.createNewRow();var uiAnimation=new WebInspector.AnimationUI(animation,this,nodeRow);animation.source().deferredNode().resolve(nodeResolved.bind(this));this._uiAnimations.push(uiAnimation);this._animationsMap.set(animation.id(),animation);},_nodeRemoved:function(event)
{var node=event.data.node;if(node[this._symbol])
node[this._symbol].nodeRemoved();},_renderGrid:function()
{var gridSize=250;this._grid.setAttribute("width",this.width()+10);this._grid.setAttribute("height",this._cachedTimelineHeight+30);this._grid.setAttribute("shape-rendering","crispEdges");this._grid.removeChildren();var lastDraw=undefined;for(var time=0;time<this.duration();time+=gridSize){var line=this._grid.createSVGChild("rect","animation-timeline-grid-line");line.setAttribute("x",time*this.pixelMsRatio()+10);line.setAttribute("y",23);line.setAttribute("height","100%");line.setAttribute("width",1);}
for(var time=0;time<this.duration();time+=gridSize){var gridWidth=time*this.pixelMsRatio();if(lastDraw===undefined||gridWidth-lastDraw>50){lastDraw=gridWidth;var label=this._grid.createSVGChild("text","animation-timeline-grid-label");label.textContent=WebInspector.UIString(Number.millisToString(time));label.setAttribute("x",gridWidth+10);label.setAttribute("y",16);}}},scheduleRedraw:function()
{this._renderQueue=[];for(var ui of this._uiAnimations)
this._renderQueue.push(ui);if(this._redrawing)
return;this._redrawing=true;this._renderGrid();this._animationsContainer.window().requestAnimationFrame(this._render.bind(this));},_render:function(timestamp)
{while(this._renderQueue.length&&(!timestamp||window.performance.now()-timestamp<50))
this._renderQueue.shift().redraw();if(this._renderQueue.length)
this._animationsContainer.window().requestAnimationFrame(this._render.bind(this));else
delete this._redrawing;},onResize:function()
{this._cachedTimelineWidth=Math.max(0,this._animationsContainer.offsetWidth-this._timelineControlsWidth)||0;this._cachedTimelineHeight=this._animationsContainer.offsetHeight;this.scheduleRedraw();if(this._scrubberPlayer)
this._syncScrubber();delete this._gridOffsetLeft;},width:function()
{return this._cachedTimelineWidth||0;},_resizeWindow:function(animation)
{var resized=false;var duration=animation.source().duration()*Math.min(2,animation.source().iterations());var requiredDuration=animation.source().delay()+duration+animation.source().endDelay();if(requiredDuration>this._duration){resized=true;this._duration=requiredDuration+200;}
return resized;},_syncScrubber:function()
{if(!this._selectedGroup)
return;this._selectedGroup.currentTimePromise().then(this._animateTime.bind(this)).then(this._updateControlButton.bind(this));},_animateTime:function(currentTime)
{if(this._scrubberPlayer)
this._scrubberPlayer.cancel();this._scrubberPlayer=this._timelineScrubber.animate([{transform:"translateX(0px)"},{transform:"translateX("+this.width()+"px)"}],{duration:this.duration(),fill:"forwards"});this._scrubberPlayer.playbackRate=this._effectivePlaybackRate();this._scrubberPlayer.onfinish=this._updateControlButton.bind(this);this._scrubberPlayer.currentTime=currentTime;this.element.window().requestAnimationFrame(this._updateScrubber.bind(this));},pixelMsRatio:function()
{return this.width()/this.duration()||0;},_updateScrubber:function(timestamp)
{if(!this._scrubberPlayer)
return;this._currentTime.textContent=WebInspector.UIString(Number.millisToString(this._scrubberPlayer.currentTime));if(this._scrubberPlayer.playState==="pending"||this._scrubberPlayer.playState==="running"){this.element.window().requestAnimationFrame(this._updateScrubber.bind(this));}else if(this._scrubberPlayer.playState==="finished"){this._currentTime.textContent="";}},_repositionScrubber:function(event)
{if(!this._selectedGroup)
return false;if(!this._gridOffsetLeft)
this._gridOffsetLeft=this._grid.totalOffsetLeft()+10;var seekTime=Math.max(0,event.x-this._gridOffsetLeft)/this.pixelMsRatio();this._selectedGroup.seekTo(seekTime);this._togglePause(true);this._animateTime(seekTime);this._originalScrubberTime=seekTime;this._originalMousePosition=event.x;return true;},_scrubberDragStart:function(event)
{if(!this._scrubberPlayer||!this._selectedGroup)
return false;this._originalScrubberTime=this._scrubberPlayer.currentTime;this._timelineScrubber.classList.remove("animation-timeline-end");this._scrubberPlayer.pause();this._originalMousePosition=event.x;this._togglePause(true);return true;},_scrubberDragMove:function(event)
{var delta=event.x-this._originalMousePosition;var currentTime=Math.max(0,Math.min(this._originalScrubberTime+delta/this.pixelMsRatio(),this.duration()));this._scrubberPlayer.currentTime=currentTime;this._currentTime.textContent=WebInspector.UIString(Number.millisToString(Math.round(currentTime)));this._selectedGroup.seekTo(currentTime);},_scrubberDragEnd:function(event)
{var currentTime=Math.max(0,this._scrubberPlayer.currentTime);this._scrubberPlayer.play();this._scrubberPlayer.currentTime=currentTime;this._currentTime.window().requestAnimationFrame(this._updateScrubber.bind(this));},__proto__:WebInspector.VBox.prototype}
WebInspector.AnimationTimeline.NodeUI=function(animationEffect)
{this.element=createElementWithClass("div","animation-node-row");this._description=this.element.createChild("div","animation-node-description");this._timelineElement=this.element.createChild("div","animation-node-timeline");}
WebInspector.AnimationTimeline.NodeUI.prototype={nodeResolved:function(node)
{if(!node){this._description.createTextChild(WebInspector.UIString("<node>"));return;}
this._node=node;this._nodeChanged();this._description.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(node));if(!node.ownerDocument)
this.nodeRemoved();},createNewRow:function()
{return this._timelineElement.createChild("div","animation-timeline-row");},nodeRemoved:function()
{this.element.classList.add("animation-node-removed");this._node=null;},_nodeChanged:function()
{this.element.classList.toggle("animation-node-selected",this._node&&this._node===WebInspector.context.flavor(WebInspector.DOMNode));}}
WebInspector.AnimationTimeline.StepTimingFunction=function(steps,stepAtPosition)
{this.steps=steps;this.stepAtPosition=stepAtPosition;}
WebInspector.AnimationTimeline.StepTimingFunction.parse=function(text){var match=text.match(/^step-(start|middle|end)$/);if(match)
return new WebInspector.AnimationTimeline.StepTimingFunction(1,match[1]);match=text.match(/^steps\((\d+), (start|middle|end)\)$/);if(match)
return new WebInspector.AnimationTimeline.StepTimingFunction(parseInt(match[1],10),match[2]);return null;}
WebInspector.AnimationTimeline.ButtonProvider=function()
{this._button=new WebInspector.ToolbarButton(WebInspector.UIString("Animations"),"animation-toolbar-item");this._button.addEventListener("click",this._clicked,this);}
WebInspector.AnimationTimeline.ButtonProvider.prototype={_clicked:function()
{WebInspector.inspectorView.showViewInDrawer("animations");},item:function()
{return this._button;}};WebInspector.AnimationUI=function(animation,timeline,parentElement){this._animation=animation;this._timeline=timeline;this._parentElement=parentElement;if(this._animation.source().keyframesRule())
this._keyframes=this._animation.source().keyframesRule().keyframes();this._nameElement=parentElement.createChild("div","animation-name");this._nameElement.textContent=this._animation.name();this._svg=parentElement.createSVGChild("svg","animation-ui");this._svg.setAttribute("height",WebInspector.AnimationUI.Options.AnimationSVGHeight);this._svg.style.marginLeft="-"+WebInspector.AnimationUI.Options.AnimationMargin+"px";this._svg.addEventListener("contextmenu",this._onContextMenu.bind(this));this._activeIntervalGroup=this._svg.createSVGChild("g");WebInspector.installDragHandle(this._activeIntervalGroup,this._mouseDown.bind(this,WebInspector.AnimationUI.MouseEvents.AnimationDrag,null),this._mouseMove.bind(this),this._mouseUp.bind(this),"-webkit-grabbing","-webkit-grab");this._cachedElements=[];this._movementInMs=0;this._color=WebInspector.AnimationUI.Color(this._animation);}
WebInspector.AnimationUI.MouseEvents={AnimationDrag:"AnimationDrag",KeyframeMove:"KeyframeMove",StartEndpointMove:"StartEndpointMove",FinishEndpointMove:"FinishEndpointMove"}
WebInspector.AnimationUI.prototype={animation:function()
{return this._animation;},setNode:function(node)
{this._node=node;},_createLine:function(parentElement,className)
{var line=parentElement.createSVGChild("line",className);line.setAttribute("x1",WebInspector.AnimationUI.Options.AnimationMargin);line.setAttribute("y1",WebInspector.AnimationUI.Options.AnimationHeight);line.setAttribute("y2",WebInspector.AnimationUI.Options.AnimationHeight);line.style.stroke=this._color;return line;},_drawAnimationLine:function(iteration,parentElement)
{var cache=this._cachedElements[iteration];if(!cache.animationLine)
cache.animationLine=this._createLine(parentElement,"animation-line");cache.animationLine.setAttribute("x2",(this._duration()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin).toFixed(2));},_drawDelayLine:function(parentElement)
{if(!this._delayLine){this._delayLine=this._createLine(parentElement,"animation-delay-line");this._endDelayLine=this._createLine(parentElement,"animation-delay-line");}
var fill=this._animation.source().fill();this._delayLine.classList.toggle("animation-fill",fill==="backwards"||fill==="both");var margin=WebInspector.AnimationUI.Options.AnimationMargin;this._delayLine.setAttribute("x1",margin);this._delayLine.setAttribute("x2",(this._delay()*this._timeline.pixelMsRatio()+margin).toFixed(2));var forwardsFill=fill==="forwards"||fill==="both";this._endDelayLine.classList.toggle("animation-fill",forwardsFill);var leftMargin=Math.min(this._timeline.width(),(this._delay()+this._duration()*this._animation.source().iterations())*this._timeline.pixelMsRatio());this._endDelayLine.style.transform="translateX("+leftMargin.toFixed(2)+"px)";this._endDelayLine.setAttribute("x1",margin);this._endDelayLine.setAttribute("x2",forwardsFill?(this._timeline.width()-leftMargin+margin).toFixed(2):(this._animation.source().endDelay()*this._timeline.pixelMsRatio()+margin).toFixed(2));},_drawPoint:function(iteration,parentElement,x,keyframeIndex,attachEvents)
{if(this._cachedElements[iteration].keyframePoints[keyframeIndex]){this._cachedElements[iteration].keyframePoints[keyframeIndex].setAttribute("cx",x.toFixed(2));return;}
var circle=parentElement.createSVGChild("circle",keyframeIndex<=0?"animation-endpoint":"animation-keyframe-point");circle.setAttribute("cx",x.toFixed(2));circle.setAttribute("cy",WebInspector.AnimationUI.Options.AnimationHeight);circle.style.stroke=this._color;circle.setAttribute("r",WebInspector.AnimationUI.Options.AnimationMargin/2);if(keyframeIndex<=0)
circle.style.fill=this._color;this._cachedElements[iteration].keyframePoints[keyframeIndex]=circle;if(!attachEvents)
return;var eventType;if(keyframeIndex===0)
eventType=WebInspector.AnimationUI.MouseEvents.StartEndpointMove;else if(keyframeIndex===-1)
eventType=WebInspector.AnimationUI.MouseEvents.FinishEndpointMove;else
eventType=WebInspector.AnimationUI.MouseEvents.KeyframeMove;WebInspector.installDragHandle(circle,this._mouseDown.bind(this,eventType,keyframeIndex),this._mouseMove.bind(this),this._mouseUp.bind(this),"ew-resize");},_renderKeyframe:function(iteration,keyframeIndex,parentElement,leftDistance,width,easing)
{function createStepLine(parentElement,x,strokeColor)
{var line=parentElement.createSVGChild("line");line.setAttribute("x1",x);line.setAttribute("x2",x);line.setAttribute("y1",WebInspector.AnimationUI.Options.AnimationMargin);line.setAttribute("y2",WebInspector.AnimationUI.Options.AnimationHeight);line.style.stroke=strokeColor;}
var bezier=WebInspector.Geometry.CubicBezier.parse(easing);var cache=this._cachedElements[iteration].keyframeRender;if(!cache[keyframeIndex])
cache[keyframeIndex]=bezier?parentElement.createSVGChild("path","animation-keyframe"):parentElement.createSVGChild("g","animation-keyframe-step");var group=cache[keyframeIndex];group.style.transform="translateX("+leftDistance.toFixed(2)+"px)";if(easing==="linear"){group.style.fill=this._color;var height=WebInspector.BezierUI.Height;group.setAttribute("d",["M",0,height,"L",0,5,"L",width.toFixed(2),5,"L",width.toFixed(2),height,"Z"].join(" "));}else if(bezier){group.style.fill=this._color;WebInspector.BezierUI.drawVelocityChart(bezier,group,width);}else{var stepFunction=WebInspector.AnimationTimeline.StepTimingFunction.parse(easing);group.removeChildren();var offsetMap={"start":0,"middle":0.5,"end":1};var offsetWeight=offsetMap[stepFunction.stepAtPosition];for(var i=0;i<stepFunction.steps;i++)
createStepLine(group,(i+offsetWeight)*width/stepFunction.steps,this._color);}},redraw:function()
{var durationWithDelay=this._delay()+this._duration()*this._animation.source().iterations()+this._animation.source().endDelay();var maxWidth=this._timeline.width()-WebInspector.AnimationUI.Options.AnimationMargin;this._svg.setAttribute("width",(maxWidth+2*WebInspector.AnimationUI.Options.AnimationMargin).toFixed(2));this._activeIntervalGroup.style.transform="translateX("+(this._delay()*this._timeline.pixelMsRatio()).toFixed(2)+"px)";this._nameElement.style.transform="translateX("+(this._delay()*this._timeline.pixelMsRatio()+WebInspector.AnimationUI.Options.AnimationMargin).toFixed(2)+"px)";this._nameElement.style.width=(this._duration()*this._timeline.pixelMsRatio()).toFixed(2)+"px";this._drawDelayLine(this._svg);if(this._animation.type()==="CSSTransition"){this._renderTransition();return;}
this._renderIteration(this._activeIntervalGroup,0);if(!this._tailGroup)
this._tailGroup=this._activeIntervalGroup.createSVGChild("g","animation-tail-iterations");var iterationWidth=this._duration()*this._timeline.pixelMsRatio();for(var iteration=1;iteration<this._animation.source().iterations()&&iterationWidth*(iteration-1)<this._timeline.width();iteration++)
this._renderIteration(this._tailGroup,iteration);while(iteration<this._cachedElements.length)
this._cachedElements.pop().group.remove();},_renderTransition:function()
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
{if(event.buttons==2)
return false;if(this._svg.enclosingNodeOrSelfWithClass("animation-node-removed"))
return false;this._mouseEventType=mouseEventType;this._keyframeMoved=keyframeIndex;this._downMouseX=event.clientX;event.consume(true);if(this._node)
WebInspector.Revealer.reveal(this._node);return true;},_mouseMove:function(event)
{this._movementInMs=(event.clientX-this._downMouseX)/this._timeline.pixelMsRatio();if(this._delay()+this._duration()>this._timeline.duration()*0.8)
this._timeline.setDuration(this._timeline.duration()*1.2);this.redraw();},_mouseUp:function(event)
{this._movementInMs=(event.clientX-this._downMouseX)/this._timeline.pixelMsRatio();if(this._mouseEventType===WebInspector.AnimationUI.MouseEvents.KeyframeMove)
this._keyframes[this._keyframeMoved].setOffset(this._offset(this._keyframeMoved));else
this._animation.setTiming(this._duration(),this._delay());this._movementInMs=0;this.redraw();delete this._mouseEventType;delete this._downMouseX;delete this._keyframeMoved;},_onContextMenu:function(event)
{function showContextMenu(remoteObject)
{if(!remoteObject)
return;var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendApplicableItems(remoteObject);contextMenu.show();}
this._animation.remoteObjectPromise().then(showContextMenu);event.consume(true);}}
WebInspector.AnimationUI.Options={AnimationHeight:26,AnimationSVGHeight:50,AnimationMargin:7,EndpointsClickRegionSize:10,GridCanvasHeight:40}
WebInspector.AnimationUI.Colors={"Purple":WebInspector.Color.parse("#9C27B0"),"Light Blue":WebInspector.Color.parse("#03A9F4"),"Deep Orange":WebInspector.Color.parse("#FF5722"),"Blue":WebInspector.Color.parse("#5677FC"),"Lime":WebInspector.Color.parse("#CDDC39"),"Blue Grey":WebInspector.Color.parse("#607D8B"),"Pink":WebInspector.Color.parse("#E91E63"),"Green":WebInspector.Color.parse("#0F9D58"),"Brown":WebInspector.Color.parse("#795548"),"Cyan":WebInspector.Color.parse("#00BCD4")}
WebInspector.AnimationUI.Color=function(animation)
{var names=Object.keys(WebInspector.AnimationUI.Colors);var color=WebInspector.AnimationUI.Colors[names[String.hashCode(animation.name()||animation.id())%names.length]];return color.asString(WebInspector.Color.Format.RGB);};Runtime.cachedResources["animation/animationScreenshotPopover.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\nimg {\n    max-height: 300px;\n    border-radius: 2px;\n}\n\n.animation-progress {\n    position: absolute;\n    height: 2px;\n    bottom: 0;\n    left: 0;\n    background: hsl(217, 89%, 61%);\n}\n\n/*# sourceURL=animation/animationScreenshotPopover.css */";Runtime.cachedResources["animation/animationTimeline.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    overflow: hidden;\n}\n\n.animation-node-row {\n    width: 100%;\n    display: flex;\n    border-bottom: 1px dashed hsla(0,0%,94%,1);\n}\n\n.animation-node-description {\n    width: 150px;\n    padding-left: 8px;\n    overflow: hidden;\n    position: relative;\n    transform-style: preserve-3d;\n    border-bottom: 1px solid hsl(0, 0%, 90%);\n    margin-bottom: -1px;\n    background-color: hsl(0, 0%, 98%);\n    display: flex;\n    align-items: center;\n    flex: 0 0 150px;\n}\n\n.animation-node-description > * {\n    flex: 0 0 auto;\n}\n\n.animation-timeline-row {\n    height: 32px;\n    position: relative;\n}\n\npath.animation-keyframe {\n    fill-opacity: 0.2;\n}\n\nsvg.animation-ui g:first-child:hover path.animation-keyframe {\n    fill-opacity: 0.4;\n}\n\n.animation-node-selected path.animation-keyframe {\n    fill-opacity: 0.4;\n}\n\nline.animation-line {\n    stroke-width: 2px;\n    stroke-linecap: round;\n    fill: none;\n}\n\nline.animation-delay-line {\n    stroke-width: 2px;\n    stroke-dasharray: 6, 4;\n}\n\nline.animation-delay-line.animation-fill {\n    stroke-dasharray: none;\n}\n\ncircle.animation-endpoint, circle.animation-keyframe-point {\n    stroke-width: 2px;\n    transition: transform 100ms cubic-bezier(0, 0, 0.2, 1);\n    transform: scale(1);\n    transform-origin: 50% 50%;\n}\n\n.animation-ui circle.animation-endpoint:hover, .animation-ui circle.animation-keyframe-point:hover {\n    transform: scale(1.2);\n}\n\ncircle.animation-endpoint:active, circle.animation-keyframe-point:active {\n    transform: scale(1);\n}\n\ncircle.animation-keyframe-point {\n    fill: white;\n}\n\n.animation-name {\n    position: absolute;\n    top: 8px;\n    color: #333;\n    text-align: center;\n    margin-left: -8px;\n    white-space: nowrap;\n}\n\n.animation-timeline-toolbar-container {\n    display: flex;\n    border-bottom: 1px solid #ccc;\n    flex: 0 0;\n}\n\n.animation-timeline-toolbar {\n    display: inline-block;\n}\n\n.animation-timeline-header {\n    height: 28px;\n    border-bottom: 1px solid #ccc;\n    flex-shrink: 0;\n    display: flex;\n}\n\n.animation-timeline-header:after {\n    content: \"\";\n    height: calc(100% - 48px - 28px);\n    position: absolute;\n    width: 150px;\n    left: 0;\n    margin-top: 28px;\n    background-color: hsl(0, 0%, 98%);\n    z-index: 0;\n    border-right: 1px solid hsl(0, 0%, 90%);\n}\n\n.animation-controls {\n    flex: 0 0 150px;\n    position: relative;\n    display: flex;\n    justify-content: flex-end;\n    padding-right: 8px;\n}\n\n.animation-timeline-current-time {flex: 0 0 auto;line-height: 28px;margin-right: 5px;}\n.animation-grid-header {\n    flex: 1 0 auto;\n    z-index: 1;\n    cursor: text;\n}\n\n.animation-timeline-buffer, .animation-timeline-buffer-hint {\n    height: 48px;\n    flex: 0 0 auto;\n    border-bottom: 1px solid #ccc;\n    display: flex;\n    padding: 0 2px;\n}\n\n.animation-timeline-buffer:empty, .animation-timeline-buffer-hint {\n    display: none;\n}\n\n.animation-timeline-buffer:empty ~ .animation-timeline-buffer-hint {\n    align-items: center;\n    justify-content: center;\n    font-size: 14px;\n    z-index: 101;\n    display: flex;\n}\n\n.animation-time-overlay {\n    background-color: black;\n    opacity: 0.05;\n    position: absolute;\n    height: 100%;\n    width: 100%;\n    z-index: -1;\n}\n\n.animation-timeline-end > .animation-time-overlay {\n    visibility: hidden;\n}\n\n.animation-scrubber {\n    opacity: 1;\n    position: absolute;\n    left: 150px;\n    height: calc(100% - 103px);\n    width: calc(100% - 150px);\n    top: 103px;\n    border-left: 1px solid hsla(4,90%,58%,1);\n    z-index: 1;\n}\n\n.animation-scrubber-line {\n    width: 11px;\n    background: linear-gradient(to right, transparent 5px, hsla(4,90%,58%,1) 5px, hsla(4,90%,58%,1) 6px, transparent 6px);\n    position: absolute;\n    top: -28px;\n    height: 28px;\n    left: -6px;\n    padding: 0 5px;\n    z-index: 2;\n}\n\n.animation-scrubber-head {\n    width: 7px;\n    height: 7px;\n    transform: rotate(45deg);\n    background: red;\n    position: absolute;\n    left: 2px;\n    top: 1px;\n}\n\nsvg.animation-timeline-grid {\n    position: absolute;\n    left: 140px;\n    top: 76px;\n    z-index: 0;\n}\n\nrect.animation-timeline-grid-line {\n    fill: hsla(0,0%,93%,1);\n}\n\n.animation-timeline-row > svg.animation-ui {\n    position: absolute;\n}\n\n.animation-node-timeline {\n    flex-grow: 1;\n}\n\n.animation-node-description > div {\n    position: absolute;\n    top: 50%;\n    transform: translateY(-50%);\n    max-height: 100%;\n}\n\n.animation-node-removed {\n    -webkit-filter: saturate(0);\n    cursor: not-allowed;\n}\n\nsvg.animation-ui g:first-child {\n    opacity: 1;\n}\n\n.animation-tail-iterations {\n    opacity: 0.5;\n}\n\n.animation-keyframe-step line {\n    stroke-width: 2;\n    stroke-opacity: 0.3;\n}\n\ntext.animation-timeline-grid-label {\n    font-size: 10px;\n    fill: #5a5a5a;\n    text-anchor: middle;\n}\n\n.animation-timeline-rows, .animation-timeline-rows-hint {\n    flex-grow: 1;\n    overflow-y: auto;\n    z-index: 1;\n    overflow-x: hidden;\n}\n\n.animation-timeline-rows-hint {\n    display: none;\n}\n\n.animation-timeline-buffer:not(:empty) ~ .animation-timeline-rows:empty {\n    flex-grow: 0;\n}\n\n.animation-timeline-buffer:not(:empty) ~ .animation-timeline-rows:empty ~ .animation-timeline-rows-hint {\n    font-size: 14px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    margin-left: 150px;\n    padding: 10px;\n}\n\n.toolbar.animation-controls-toolbar {\n    flex: 0 0 auto;\n}\n\n.animation-node-row.animation-node-selected {\n    background-color: hsla(216, 71%, 53%, 0.08);\n}\n\n.animation-node-selected > .animation-node-description {\n    background-color: #EFF4FD;\n}\n\n.animation-timeline-empty-message {\n    padding-left: 230px;\n    padding-right: 30px;\n    text-align: center;\n    position: absolute;\n    font-size: 20px;\n    line-height: 32px;\n    align-items: center;   justify-content: center;\n    width: 100%;\n    height: calc(100% - 44px);\n    display: flex;\n}\n\n.animation-buffer-preview {\n    height: 40px;\n    margin: 4px 2px;\n    background-color: #F3F3F3;\n    border-radius: 2px;\n    flex: 1 1;\n    padding: 4px;\n    max-width: 100px;\n    animation: newGroupAnim 200ms;\n    position: relative;\n}\n\n.animation-buffer-preview-animation {\n    width: 100%;\n    height: 100%;\n    border-radius: 2px 0 0 2px;\n    position: absolute;\n    top: 0;\n    left: 0;\n    background: hsla(219, 100%, 66%, 0.27);\n    opacity: 0;\n    border-right: 1px solid #A7A7A7;\n    cursor: pointer;\n}\n\n.animation-buffer-preview:not(.selected):hover {\n    background-color: hsla(217,90%,92%,1);\n}\n\n.animation-buffer-preview.selected {\n    background-color: hsl(217, 89%, 61%);\n}\n\n.animation-paused {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background-color: hsla(0,0%,70%,0.5);\n    display: none;\n}\n\n.animation-paused:before, .animation-paused:after {\n    content: \"\";\n    background: hsl(0, 100%, 100%);\n    width: 7px;\n    height: 20px;\n    border-radius: 2px;\n    margin: 2px;\n    border: 1px solid #ccc;\n}\n\n.animation-buffer-preview.paused .animation-paused {\n    display: flex;\n}\n\n.animation-buffer-preview.selected > svg > line {\n    stroke: white !important;\n}\n\n.animation-buffer-preview > svg > line {\n    stroke-width: 1px;\n}\n\n@keyframes newGroupAnim {\n    from {\n        -webkit-clip-path: polygon(0% 0%, 0% 100%, 0% 100%, 0% 0%);\n    }\n    to {\n        -webkit-clip-path: polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%);\n    }\n}\n\n.animation-playback-rate-control {\n    margin: 4px 0 4px 2px;\n    display: flex;\n    width: 120px;\n}\n\n.animation-playback-rate-button:first-child {\n    border-radius: 4px 0 0 4px;\n}\n\n.animation-playback-rate-button:last-child {\n    border-radius: 0 4px 4px 0;\n}\n\n.animation-playback-rate-button {\n    border: 1px solid #ccc;\n    display: inline-block;\n    margin-right: -1px;\n    padding: 1px 4px;\n    background: white;\n    flex: 1 0 auto;\n    text-align: center;\n    cursor: pointer;\n}\n\n.animation-playback-rate-button:not(.selected):hover {\n    background: hsl(211, 100%, 95%);\n}\n\n.animation-playback-rate-button.selected {\n    color: hsl(0, 100%, 100%);\n    background-color: hsl(217, 89%, 61%);\n    border-color: hsl(217, 89%, 61%);\n    z-index: 1;\n}\n\n.animation-playback-rate-button.selected:first-child {\n    color: hsl(217, 89%, 61%);\n    background-color: hsl(217, 89%, 100%);\n}\n\n.animation-remove-button {\n    position: absolute;\n    top: -3px;\n    right: -3px;\n    background: #7B7B7B;\n    border-radius: 12px;\n    height: 16px;\n    width: 16px;\n    align-items: center;\n    font-size: 10px;\n    justify-content: center;\n    box-shadow: 0 1px 4px 0 rgb(185, 185, 185);\n    z-index: 100;\n    display: none;\n    cursor: pointer;\n    font-weight: 700;\n    color: white;\n}\n\n.animation-remove-button:hover {\n    background: #585858;\n}\n\n.animation-buffer-preview:hover .animation-remove-button {\n    display: flex;\n}\n\n/*# sourceURL=animation/animationTimeline.css */";