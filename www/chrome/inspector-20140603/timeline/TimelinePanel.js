WebInspector.CPUProfileDataModel=function(profile)
{this.profileHead=profile.head;this.samples=profile.samples;this.timestamps=profile.timestamps;this.profileStartTime=profile.startTime*1000;this.profileEndTime=profile.endTime*1000;this._assignParentsInProfile();if(this.samples){this._normalizeTimestamps();this._buildIdToNodeMap();this._fixMissingSamples();}
this._calculateTimes(profile);}
WebInspector.CPUProfileDataModel.prototype={_calculateTimes:function(profile)
{function totalHitCount(node){var result=node.hitCount;for(var i=0;i<node.children.length;i++)
result+=totalHitCount(node.children[i]);return result;}
profile.totalHitCount=totalHitCount(profile.head);var duration=this.profileEndTime-this.profileStartTime;var samplingInterval=duration/profile.totalHitCount;this.samplingInterval=samplingInterval;function calculateTimesForNode(node){node.selfTime=node.hitCount*samplingInterval;var totalHitCount=node.hitCount;for(var i=0;i<node.children.length;i++)
totalHitCount+=calculateTimesForNode(node.children[i]);node.totalTime=totalHitCount*samplingInterval;return totalHitCount;}
calculateTimesForNode(profile.head);},_assignParentsInProfile:function()
{var head=this.profileHead;head.parent=null;head.depth=-1;this.maxDepth=0;var nodesToTraverse=[head];while(nodesToTraverse.length){var parent=nodesToTraverse.pop();var depth=parent.depth+1;if(depth>this.maxDepth)
this.maxDepth=depth;var children=parent.children;var length=children.length;for(var i=0;i<length;++i){var child=children[i];child.parent=parent;child.depth=depth;if(child.children.length)
nodesToTraverse.push(child);}}},_normalizeTimestamps:function()
{var timestamps=this.timestamps;if(!timestamps){var profileStartTime=this.profileStartTime;var interval=(this.profileEndTime-profileStartTime)/this.samples.length;timestamps=new Float64Array(this.samples.length+1);for(var i=0;i<timestamps.length;++i)
timestamps[i]=profileStartTime+i*interval;this.timestamps=timestamps;return;}
for(var i=0;i<timestamps.length;++i)
timestamps[i]/=1000;var averageSample=(timestamps.peekLast()-timestamps[0])/(timestamps.length-1);this.timestamps.push(timestamps.peekLast()+averageSample);this.profileStartTime=timestamps[0];this.profileEndTime=timestamps.peekLast();},_buildIdToNodeMap:function()
{this._idToNode={};var idToNode=this._idToNode;var stack=[this.profileHead];while(stack.length){var node=stack.pop();idToNode[node.id]=node;for(var i=0;i<node.children.length;i++)
stack.push(node.children[i]);}
var topLevelNodes=this.profileHead.children;for(var i=0;i<topLevelNodes.length&&!(this.gcNode&&this.programNode&&this.idleNode);i++){var node=topLevelNodes[i];if(node.functionName==="(garbage collector)")
this.gcNode=node;else if(node.functionName==="(program)")
this.programNode=node;else if(node.functionName==="(idle)")
this.idleNode=node;}},_fixMissingSamples:function()
{var samples=this.samples;var samplesCount=samples.length;if(!this.programNode||samplesCount<3)
return;var idToNode=this._idToNode;var programNodeId=this.programNode.id;var gcNodeId=this.gcNode?this.gcNode.id:-1;var idleNodeId=this.idleNode?this.idleNode.id:-1;var prevNodeId=samples[0];var nodeId=samples[1];for(var sampleIndex=1;sampleIndex<samplesCount-1;sampleIndex++){var nextNodeId=samples[sampleIndex+1];if(nodeId===programNodeId&&!isSystemNode(prevNodeId)&&!isSystemNode(nextNodeId)&&bottomNode(idToNode[prevNodeId])===bottomNode(idToNode[nextNodeId])){samples[sampleIndex]=prevNodeId;}
prevNodeId=nodeId;nodeId=nextNodeId;}
function bottomNode(node)
{while(node.parent)
node=node.parent;return node;}
function isSystemNode(nodeId)
{return nodeId===programNodeId||nodeId===gcNodeId||nodeId===idleNodeId;}},forEachFrame:function(openFrameCallback,closeFrameCallback,startTime,stopTime)
{if(!this.profileHead)
return;startTime=startTime||0;stopTime=stopTime||Infinity;var samples=this.samples;var timestamps=this.timestamps;var idToNode=this._idToNode;var gcNode=this.gcNode;var samplesCount=samples.length;var startIndex=timestamps.lowerBound(startTime);var stackTop=0;var stackNodes=[];var prevId=this.profileHead.id;var prevHeight=this.profileHead.depth;var sampleTime=timestamps[samplesCount];var gcParentNode=null;if(!this._stackStartTimes)
this._stackStartTimes=new Float64Array(this.maxDepth+2);var stackStartTimes=this._stackStartTimes;if(!this._stackChildrenDuration)
this._stackChildrenDuration=new Float64Array(this.maxDepth+2);var stackChildrenDuration=this._stackChildrenDuration;for(var sampleIndex=startIndex;sampleIndex<samplesCount;sampleIndex++){sampleTime=timestamps[sampleIndex];if(sampleTime>=stopTime)
break;var id=samples[sampleIndex];if(id===prevId)
continue;var node=idToNode[id];var prevNode=idToNode[prevId];if(node===gcNode){gcParentNode=prevNode;openFrameCallback(gcParentNode.depth+1,gcNode,sampleTime);stackStartTimes[++stackTop]=sampleTime;stackChildrenDuration[stackTop]=0;prevId=id;continue;}
if(prevNode===gcNode){var start=stackStartTimes[stackTop];var duration=sampleTime-start;stackChildrenDuration[stackTop-1]+=duration;closeFrameCallback(gcParentNode.depth+1,gcNode,start,duration,duration-stackChildrenDuration[stackTop]);--stackTop;prevNode=gcParentNode;prevId=prevNode.id;gcParentNode=null;}
while(node.depth>prevNode.depth){stackNodes.push(node);node=node.parent;}
while(prevNode!==node){var start=stackStartTimes[stackTop];var duration=sampleTime-start;stackChildrenDuration[stackTop-1]+=duration;closeFrameCallback(prevNode.depth,prevNode,start,duration,duration-stackChildrenDuration[stackTop]);--stackTop;if(node.depth===prevNode.depth){stackNodes.push(node);node=node.parent;}
prevNode=prevNode.parent;}
while(stackNodes.length){node=stackNodes.pop();openFrameCallback(node.depth,node,sampleTime);stackStartTimes[++stackTop]=sampleTime;stackChildrenDuration[stackTop]=0;}
prevId=id;}
if(idToNode[prevId]===gcNode){var start=stackStartTimes[stackTop];var duration=sampleTime-start;stackChildrenDuration[stackTop-1]+=duration;closeFrameCallback(gcParentNode.depth+1,node,start,duration,duration-stackChildrenDuration[stackTop]);--stackTop;}
for(var node=idToNode[prevId];node.parent;node=node.parent){var start=stackStartTimes[stackTop];var duration=sampleTime-start;stackChildrenDuration[stackTop-1]+=duration;closeFrameCallback(node.depth,node,start,duration,duration-stackChildrenDuration[stackTop]);--stackTop;}}};WebInspector.CountersGraph=function(title,delegate,model)
{WebInspector.SplitView.call(this,true,false);this.element.id="memory-graphs-container";this._delegate=delegate;this._model=model;this._calculator=new WebInspector.TimelineCalculator(this._model);this._graphsContainer=this.mainElement();this._createCurrentValuesBar();this._canvasView=new WebInspector.VBoxWithResizeCallback(this._resize.bind(this));this._canvasView.show(this._graphsContainer);this._canvasContainer=this._canvasView.element;this._canvasContainer.id="memory-graphs-canvas-container";this._canvas=this._canvasContainer.createChild("canvas");this._canvas.id="memory-counters-graph";this._canvasContainer.addEventListener("mouseover",this._onMouseMove.bind(this),true);this._canvasContainer.addEventListener("mousemove",this._onMouseMove.bind(this),true);this._canvasContainer.addEventListener("mouseout",this._onMouseOut.bind(this),true);this._canvasContainer.addEventListener("click",this._onClick.bind(this),true);this._timelineGrid=new WebInspector.TimelineGrid();this._canvasContainer.appendChild(this._timelineGrid.dividersElement);this.sidebarElement().createChild("div","sidebar-tree sidebar-tree-section").textContent=title;this._counters=[];this._counterUI=[];}
WebInspector.CountersGraph.prototype={_createCurrentValuesBar:function()
{this._currentValuesBar=this._graphsContainer.createChild("div");this._currentValuesBar.id="counter-values-bar";},createCounter:function(uiName,uiValueTemplate,color)
{var counter=new WebInspector.CountersGraph.Counter();this._counters.push(counter);this._counterUI.push(new WebInspector.CountersGraph.CounterUI(this,uiName,uiValueTemplate,color,counter));return counter;},view:function()
{return this;},dispose:function()
{},reset:function()
{for(var i=0;i<this._counters.length;++i){this._counters[i].reset();this._counterUI[i].reset();}
this.refresh();},_resize:function()
{var parentElement=this._canvas.parentElement;this._canvas.width=parentElement.clientWidth*window.devicePixelRatio;this._canvas.height=parentElement.clientHeight*window.devicePixelRatio;var timelinePaddingLeft=15;this._calculator.setDisplayWindow(timelinePaddingLeft,this._canvas.width);this.refresh();},setWindowTimes:function(startTime,endTime)
{this._calculator.setWindow(startTime,endTime);this.scheduleRefresh();},scheduleRefresh:function()
{WebInspector.invokeOnceAfterBatchUpdate(this,this.refresh);},draw:function()
{for(var i=0;i<this._counters.length;++i){this._counters[i]._calculateVisibleIndexes(this._calculator);this._counters[i]._calculateXValues(this._canvas.width);}
this._clear();for(var i=0;i<this._counterUI.length;i++)
this._counterUI[i]._drawGraph(this._canvas);},_onClick:function(event)
{var x=event.x-this._canvasContainer.totalOffsetLeft();var minDistance=Infinity;var bestTime;for(var i=0;i<this._counterUI.length;++i){var counterUI=this._counterUI[i];if(!counterUI.counter.times.length)
continue;var index=counterUI._recordIndexAt(x);var distance=Math.abs(x*window.devicePixelRatio-counterUI.counter.x[index]);if(distance<minDistance){minDistance=distance;bestTime=counterUI.counter.times[index];}}
if(bestTime!==undefined)
this._revealRecordAt(bestTime);},_revealRecordAt:function(time)
{var recordToReveal;function findRecordToReveal(record)
{if(!this._model.isVisible(record))
return false;if(record.startTime()<=time&&time<=record.endTime()){recordToReveal=record;return true;}
if(!recordToReveal||record.endTime()<time&&recordToReveal.endTime()<record.endTime())
recordToReveal=record;return false;}
this._model.forAllRecords(null,findRecordToReveal.bind(this));this._delegate.select(recordToReveal?WebInspector.TimelineSelection.fromRecord(recordToReveal):null);},_onMouseOut:function(event)
{delete this._markerXPosition;this._clearCurrentValueAndMarker();},_clearCurrentValueAndMarker:function()
{for(var i=0;i<this._counterUI.length;i++)
this._counterUI[i]._clearCurrentValueAndMarker();},_onMouseMove:function(event)
{var x=event.x-this._canvasContainer.totalOffsetLeft();this._markerXPosition=x;this._refreshCurrentValues();},_refreshCurrentValues:function()
{if(this._markerXPosition===undefined)
return;for(var i=0;i<this._counterUI.length;++i)
this._counterUI[i].updateCurrentValue(this._markerXPosition);},refresh:function()
{this._timelineGrid.updateDividers(this._calculator);this.draw();this._refreshCurrentValues();},refreshRecords:function()
{},_clear:function()
{var ctx=this._canvas.getContext("2d");ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);},highlightSearchResult:function(record,regex,selectRecord)
{},setSelection:function(selection)
{},__proto__:WebInspector.SplitView.prototype}
WebInspector.CountersGraph.Counter=function()
{this.times=[];this.values=[];}
WebInspector.CountersGraph.Counter.prototype={appendSample:function(time,value)
{if(this.values.length&&this.values.peekLast()===value)
return;this.times.push(time);this.values.push(value);},reset:function()
{this.times=[];this.values=[];},setLimit:function(value)
{this._limitValue=value;},_calculateBounds:function()
{var maxValue;var minValue;for(var i=this._minimumIndex;i<=this._maximumIndex;i++){var value=this.values[i];if(minValue===undefined||value<minValue)
minValue=value;if(maxValue===undefined||value>maxValue)
maxValue=value;}
minValue=minValue||0;maxValue=maxValue||1;if(this._limitValue){if(maxValue>this._limitValue*0.5)
maxValue=Math.max(maxValue,this._limitValue);minValue=Math.min(minValue,this._limitValue);}
return{min:minValue,max:maxValue};},_calculateVisibleIndexes:function(calculator)
{var start=calculator.minimumBoundary();var end=calculator.maximumBoundary();this._minimumIndex=Number.constrain(this.times.upperBound(start)-1,0,this.times.length-1);this._maximumIndex=Number.constrain(this.times.lowerBound(end),0,this.times.length-1);this._minTime=start;this._maxTime=end;},_calculateXValues:function(width)
{if(!this.values.length)
return;var xFactor=width/(this._maxTime-this._minTime);this.x=new Array(this.values.length);for(var i=this._minimumIndex+1;i<=this._maximumIndex;i++)
this.x[i]=xFactor*(this.times[i]-this._minTime);}}
WebInspector.CountersGraph.CounterUI=function(memoryCountersPane,title,currentValueLabel,graphColor,counter)
{this._memoryCountersPane=memoryCountersPane;this.counter=counter;var container=memoryCountersPane.sidebarElement().createChild("div","memory-counter-sidebar-info");var swatchColor=graphColor;this._swatch=new WebInspector.SwatchCheckbox(WebInspector.UIString(title),swatchColor);this._swatch.addEventListener(WebInspector.SwatchCheckbox.Events.Changed,this._toggleCounterGraph.bind(this));container.appendChild(this._swatch.element);this._range=this._swatch.element.createChild("span");this._value=memoryCountersPane._currentValuesBar.createChild("span","memory-counter-value");this._value.style.color=graphColor;this.graphColor=graphColor;this.limitColor=WebInspector.Color.parse(graphColor).setAlpha(0.3).toString(WebInspector.Color.Format.RGBA);this.graphYValues=[];this._verticalPadding=10;this._currentValueLabel=currentValueLabel;this._marker=memoryCountersPane._canvasContainer.createChild("div","memory-counter-marker");this._marker.style.backgroundColor=graphColor;this._clearCurrentValueAndMarker();}
WebInspector.CountersGraph.CounterUI.prototype={reset:function()
{this._range.textContent="";},setRange:function(minValue,maxValue)
{this._range.textContent=WebInspector.UIString("[%.0f:%.0f]",minValue,maxValue);},_toggleCounterGraph:function(event)
{this._value.classList.toggle("hidden",!this._swatch.checked);this._memoryCountersPane.refresh();},_recordIndexAt:function(x)
{return this.counter.x.upperBound(x*window.devicePixelRatio,null,this.counter._minimumIndex+1,this.counter._maximumIndex+1)-1;},updateCurrentValue:function(x)
{if(!this.visible()||!this.counter.values.length)
return;var index=this._recordIndexAt(x);this._value.textContent=WebInspector.UIString(this._currentValueLabel,this.counter.values[index]);var y=this.graphYValues[index]/window.devicePixelRatio;this._marker.style.left=x+"px";this._marker.style.top=y+"px";this._marker.classList.remove("hidden");},_clearCurrentValueAndMarker:function()
{this._value.textContent="";this._marker.classList.add("hidden");},_drawGraph:function(canvas)
{var ctx=canvas.getContext("2d");var width=canvas.width;var height=canvas.height-2*this._verticalPadding;if(height<=0){this.graphYValues=[];return;}
var originY=this._verticalPadding;var counter=this.counter;var values=counter.values;if(!values.length)
return;var bounds=counter._calculateBounds();var minValue=bounds.min;var maxValue=bounds.max;this.setRange(minValue,maxValue);if(!this.visible())
return;var yValues=this.graphYValues;var maxYRange=maxValue-minValue;var yFactor=maxYRange?height/(maxYRange):1;ctx.save();ctx.lineWidth=window.devicePixelRatio;if(ctx.lineWidth%2)
ctx.translate(0.5,0.5);ctx.beginPath();var value=values[counter._minimumIndex];var currentY=Math.round(originY+height-(value-minValue)*yFactor);ctx.moveTo(0,currentY);for(var i=counter._minimumIndex;i<=counter._maximumIndex;i++){var x=Math.round(counter.x[i]);ctx.lineTo(x,currentY);var currentValue=values[i];if(typeof currentValue!=="undefined")
value=currentValue;currentY=Math.round(originY+height-(value-minValue)*yFactor);ctx.lineTo(x,currentY);yValues[i]=currentY;}
yValues.length=i;ctx.lineTo(width,currentY);ctx.strokeStyle=this.graphColor;ctx.stroke();if(counter._limitValue){var limitLineY=Math.round(originY+height-(counter._limitValue-minValue)*yFactor);ctx.moveTo(0,limitLineY);ctx.lineTo(width,limitLineY);ctx.strokeStyle=this.limitColor;ctx.stroke();}
ctx.closePath();ctx.restore();},visible:function()
{return this._swatch.checked;}}
WebInspector.SwatchCheckbox=function(title,color)
{this.element=document.createElement("div");this._swatch=this.element.createChild("div","swatch");this.element.createChild("span","title").textContent=title;this._color=color;this.checked=true;this.element.addEventListener("click",this._toggleCheckbox.bind(this),true);}
WebInspector.SwatchCheckbox.Events={Changed:"Changed"}
WebInspector.SwatchCheckbox.prototype={get checked()
{return this._checked;},set checked(v)
{this._checked=v;if(this._checked)
this._swatch.style.backgroundColor=this._color;else
this._swatch.style.backgroundColor="";},_toggleCheckbox:function(event)
{this.checked=!this.checked;this.dispatchEventToListeners(WebInspector.SwatchCheckbox.Events.Changed);},__proto__:WebInspector.Object.prototype};WebInspector.Layers3DView=function()
{WebInspector.VBox.call(this);this.element.classList.add("layers-3d-view");this._emptyView=new WebInspector.EmptyView(WebInspector.UIString("Not in the composited mode.\nConsider forcing composited mode in Settings."));this._canvasElement=this.element.createChild("canvas");this._transformController=new WebInspector.TransformController(this._canvasElement);this._transformController.addEventListener(WebInspector.TransformController.Events.TransformChanged,this._update,this);this._canvasElement.addEventListener("dblclick",this._onDoubleClick.bind(this),false);this._canvasElement.addEventListener("mousedown",this._onMouseDown.bind(this),false);this._canvasElement.addEventListener("mouseup",this._onMouseUp.bind(this),false);this._canvasElement.addEventListener("mouseout",this._onMouseMove.bind(this),false);this._canvasElement.addEventListener("mousemove",this._onMouseMove.bind(this),false);this._canvasElement.addEventListener("contextmenu",this._onContextMenu.bind(this),false);this._lastActiveObject={};this._textureForLayer={};this._scrollRectQuadsForLayer={};this._isVisible={};this._layerTree=null;WebInspector.settings.showPaintRects.addChangeListener(this._update,this);}
WebInspector.Layers3DView.ActiveObject;WebInspector.Layers3DView.OutlineType={Hovered:"hovered",Selected:"selected"}
WebInspector.Layers3DView.Events={ObjectHovered:"ObjectHovered",ObjectSelected:"ObjectSelected",LayerSnapshotRequested:"LayerSnapshotRequested"}
WebInspector.Layers3DView.ScrollRectTitles={RepaintsOnScroll:WebInspector.UIString("repaints on scroll"),TouchEventHandler:WebInspector.UIString("touch event listener"),WheelEventHandler:WebInspector.UIString("mousewheel event listener")}
WebInspector.Layers3DView.FragmentShader="\
    precision mediump float;\
    varying vec4 vColor;\
    varying vec2 vTextureCoord;\
    uniform sampler2D uSampler;\
    void main(void)\
    {\
        gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * vColor;\
    }";WebInspector.Layers3DView.VertexShader="\
    attribute vec3 aVertexPosition;\
    attribute vec2 aTextureCoord;\
    attribute vec4 aVertexColor;\
    uniform mat4 uPMatrix;\
    varying vec2 vTextureCoord;\
    varying vec4 vColor;\
    void main(void)\
    {\
        gl_Position = uPMatrix * vec4(aVertexPosition, 1.0);\
        vColor = aVertexColor;\
        vTextureCoord = aTextureCoord;\
    }";WebInspector.Layers3DView.SelectedBackgroundColor=[20,40,110,0.66];WebInspector.Layers3DView.BackgroundColor=[0,0,0,0];WebInspector.Layers3DView.HoveredBorderColor=[0,0,255,1];WebInspector.Layers3DView.BorderColor=[0,0,0,1];WebInspector.Layers3DView.ScrollRectBackgroundColor=[178,0,0,0.4];WebInspector.Layers3DView.SelectedScrollRectBackgroundColor=[178,0,0,0.6];WebInspector.Layers3DView.ScrollRectBorderColor=[178,0,0,1];WebInspector.Layers3DView.LayerSpacing=20;WebInspector.Layers3DView.ScrollRectSpacing=4;WebInspector.Layers3DView.prototype={registerShortcuts:function(registerShortcutDelegate)
{this._transformController.registerShortcuts(registerShortcutDelegate);},onResize:function()
{this._update();},willHide:function()
{},wasShown:function()
{if(this._needsUpdate)
this._update();},_setOutline:function(type,activeObject)
{this._lastActiveObject[type]=activeObject;this._update();},hoverObject:function(activeObject)
{this._setOutline(WebInspector.Layers3DView.OutlineType.Hovered,activeObject);},selectObject:function(activeObject)
{this._setOutline(WebInspector.Layers3DView.OutlineType.Hovered,null);this._setOutline(WebInspector.Layers3DView.OutlineType.Selected,activeObject);},showImageForLayer:function(layer,imageURL)
{var texture=this._gl.createTexture();texture.image=new Image();texture.image.addEventListener("load",this._handleLoadedTexture.bind(this,texture,layer.id()),false);texture.image.src=imageURL;},_initGL:function(canvas)
{var gl=canvas.getContext("webgl");gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.BLEND);gl.clearColor(0.0,0.0,0.0,0.0);gl.enable(gl.DEPTH_TEST);return gl;},_createShader:function(type,script)
{var shader=this._gl.createShader(type);this._gl.shaderSource(shader,script);this._gl.compileShader(shader);this._gl.attachShader(this._shaderProgram,shader);},_enableVertexAttribArray:function(attributeName,glName)
{this._shaderProgram[attributeName]=this._gl.getAttribLocation(this._shaderProgram,glName);this._gl.enableVertexAttribArray(this._shaderProgram[attributeName]);},_initShaders:function()
{this._shaderProgram=this._gl.createProgram();this._createShader(this._gl.FRAGMENT_SHADER,WebInspector.Layers3DView.FragmentShader);this._createShader(this._gl.VERTEX_SHADER,WebInspector.Layers3DView.VertexShader);this._gl.linkProgram(this._shaderProgram);this._gl.useProgram(this._shaderProgram);this._shaderProgram.vertexPositionAttribute=this._gl.getAttribLocation(this._shaderProgram,"aVertexPosition");this._gl.enableVertexAttribArray(this._shaderProgram.vertexPositionAttribute);this._shaderProgram.vertexColorAttribute=this._gl.getAttribLocation(this._shaderProgram,"aVertexColor");this._gl.enableVertexAttribArray(this._shaderProgram.vertexColorAttribute);this._shaderProgram.textureCoordAttribute=this._gl.getAttribLocation(this._shaderProgram,"aTextureCoord");this._gl.enableVertexAttribArray(this._shaderProgram.textureCoordAttribute);this._shaderProgram.pMatrixUniform=this._gl.getUniformLocation(this._shaderProgram,"uPMatrix");this._shaderProgram.samplerUniform=this._gl.getUniformLocation(this._shaderProgram,"uSampler");},_resizeCanvas:function()
{this._canvasElement.width=this._canvasElement.offsetWidth*window.devicePixelRatio;this._canvasElement.height=this._canvasElement.offsetHeight*window.devicePixelRatio;this._gl.viewportWidth=this._canvasElement.width;this._gl.viewportHeight=this._canvasElement.height;},_calculateProjectionMatrix:function()
{var rootLayerPadding=20;var rootWidth=this._layerTree.contentRoot().width();var rootHeight=this._layerTree.contentRoot().height();var canvasWidth=this._canvasElement.width;var canvasHeight=this._canvasElement.height;var scaleX=(canvasWidth-rootLayerPadding)/rootWidth;var scaleY=(canvasHeight-rootLayerPadding)/rootHeight;var viewScale=Math.min(scaleX,scaleY);var scale=this._transformController.scale();var offsetX=this._transformController.offsetX()*window.devicePixelRatio;var offsetY=this._transformController.offsetY()*window.devicePixelRatio;var rotateX=this._transformController.rotateX();var rotateY=this._transformController.rotateY();return new WebKitCSSMatrix().translate(offsetX,offsetY,0).scale(scale,scale,scale).translate(canvasWidth/2,canvasHeight/2,0).rotate(rotateX,rotateY,0).scale(viewScale,viewScale,viewScale).translate(-rootWidth/2,-rootHeight/2,0);},_initProjectionMatrix:function()
{this._pMatrix=new WebKitCSSMatrix().scale(1,-1,-1).translate(-1,-1,0).scale(2/this._canvasElement.width,2/this._canvasElement.height,1/1000000).multiply(this._calculateProjectionMatrix());this._gl.uniformMatrix4fv(this._shaderProgram.pMatrixUniform,false,this._arrayFromMatrix(this._pMatrix));},_handleLoadedTexture:function(texture,layerId)
{this._gl.bindTexture(this._gl.TEXTURE_2D,texture);this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL,true);this._gl.texImage2D(this._gl.TEXTURE_2D,0,this._gl.RGBA,this._gl.RGBA,this._gl.UNSIGNED_BYTE,texture.image);this._gl.texParameteri(this._gl.TEXTURE_2D,this._gl.TEXTURE_MIN_FILTER,this._gl.LINEAR);this._gl.texParameteri(this._gl.TEXTURE_2D,this._gl.TEXTURE_MAG_FILTER,this._gl.LINEAR);this._gl.texParameteri(this._gl.TEXTURE_2D,this._gl.TEXTURE_WRAP_S,this._gl.CLAMP_TO_EDGE);this._gl.texParameteri(this._gl.TEXTURE_2D,this._gl.TEXTURE_WRAP_T,this._gl.CLAMP_TO_EDGE);this._gl.bindTexture(this._gl.TEXTURE_2D,null);this._textureForLayer={};this._textureForLayer[layerId]=texture;this._update();},_initWhiteTexture:function()
{this._whiteTexture=this._gl.createTexture();this._gl.bindTexture(this._gl.TEXTURE_2D,this._whiteTexture);var whitePixel=new Uint8Array([255,255,255,255]);this._gl.texImage2D(this._gl.TEXTURE_2D,0,this._gl.RGBA,1,1,0,this._gl.RGBA,this._gl.UNSIGNED_BYTE,whitePixel);},_initGLIfNecessary:function()
{if(this._gl)
return this._gl;this._gl=this._initGL(this._canvasElement);this._initShaders();this._initWhiteTexture();return this._gl;},_arrayFromMatrix:function(m)
{return new Float32Array([m.m11,m.m12,m.m13,m.m14,m.m21,m.m22,m.m23,m.m24,m.m31,m.m32,m.m33,m.m34,m.m41,m.m42,m.m43,m.m44]);},_makeColorsArray:function(color)
{var colors=[];var normalizedColor=[color[0]/255,color[1]/255,color[2]/255,color[3]];for(var i=0;i<4;i++){colors=colors.concat(normalizedColor);}
return colors;},_setVertexAttribute:function(attribute,array,length)
{var gl=this._gl;var buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(array),gl.STATIC_DRAW);gl.vertexAttribPointer(attribute,length,gl.FLOAT,false,0,0);},_drawRectangle:function(vertices,color,glMode,texture)
{this._setVertexAttribute(this._shaderProgram.vertexPositionAttribute,vertices,3);this._setVertexAttribute(this._shaderProgram.textureCoordAttribute,[0,1,1,1,1,0,0,0],2);if(texture){var white=[255,255,255,1];this._setVertexAttribute(this._shaderProgram.vertexColorAttribute,this._makeColorsArray(white),white.length);this._gl.activeTexture(this._gl.TEXTURE0);this._gl.bindTexture(this._gl.TEXTURE_2D,texture);this._gl.uniform1i(this._shaderProgram.samplerUniform,0);}else{this._setVertexAttribute(this._shaderProgram.vertexColorAttribute,this._makeColorsArray(color),color.length);this._gl.bindTexture(this._gl.TEXTURE_2D,this._whiteTexture);}
var numberOfVertices=4;this._gl.drawArrays(glMode,0,numberOfVertices);},_isObjectActive:function(type,layer,scrollRectIndex)
{var activeObject=this._lastActiveObject[type];return activeObject&&activeObject.layer&&activeObject.layer.id()===layer.id()&&(typeof scrollRectIndex!=="number"||activeObject.scrollRectIndex===scrollRectIndex);},_colorsForLayer:function(layer)
{var isSelected=this._isObjectActive(WebInspector.Layers3DView.OutlineType.Selected,layer);var isHovered=this._isObjectActive(WebInspector.Layers3DView.OutlineType.Hovered,layer);var color=isSelected?WebInspector.Layers3DView.SelectedBackgroundColor:WebInspector.Layers3DView.BackgroundColor;var borderColor=isHovered?WebInspector.Layers3DView.HoveredBorderColor:WebInspector.Layers3DView.BorderColor;return{color:color,borderColor:borderColor};},_calculateVerticesForQuad:function(quad,z)
{return[quad[0],quad[1],z,quad[2],quad[3],z,quad[4],quad[5],z,quad[6],quad[7],z];},_calculatePointOnQuad:function(quad,ratioX,ratioY)
{var x0=quad[0];var y0=quad[1];var x1=quad[2];var y1=quad[3];var x2=quad[4];var y2=quad[5];var x3=quad[6];var y3=quad[7];var firstSidePointX=x0+ratioX*(x1-x0);var firstSidePointY=y0+ratioX*(y1-y0);var thirdSidePointX=x3+ratioX*(x2-x3);var thirdSidePointY=y3+ratioX*(y2-y3);var x=firstSidePointX+ratioY*(thirdSidePointX-firstSidePointX);var y=firstSidePointY+ratioY*(thirdSidePointY-firstSidePointY);return[x,y];},_calculateRectQuad:function(layer,rect)
{var quad=layer.quad();var rx1=rect.x/layer.width();var rx2=(rect.x+rect.width)/layer.width();var ry1=rect.y/layer.height();var ry2=(rect.y+rect.height)/layer.height();return this._calculatePointOnQuad(quad,rx1,ry1).concat(this._calculatePointOnQuad(quad,rx2,ry1)).concat(this._calculatePointOnQuad(quad,rx2,ry2)).concat(this._calculatePointOnQuad(quad,rx1,ry2));},_calculateScrollRectQuadsForLayer:function(layer)
{var quads=[];for(var i=0;i<layer.scrollRects().length;++i)
quads.push(this._calculateRectQuad(layer,layer.scrollRects()[i].rect));return quads;},_calculateScrollRectDepth:function(layer,index)
{return this._depthByLayerId[layer.id()]*WebInspector.Layers3DView.LayerSpacing+index*WebInspector.Layers3DView.ScrollRectSpacing+1;},_drawLayer:function(layer)
{var gl=this._gl;var vertices;if(this._isVisible[layer.id()]){vertices=this._calculateVerticesForQuad(layer.quad(),this._depthByLayerId[layer.id()]*WebInspector.Layers3DView.LayerSpacing);var colors=this._colorsForLayer(layer);this._drawRectangle(vertices,colors.color,gl.TRIANGLE_FAN,this._textureForLayer[layer.id()]);this._drawRectangle(vertices,colors.borderColor,gl.LINE_LOOP);}
this._scrollRectQuadsForLayer[layer.id()]=this._calculateScrollRectQuadsForLayer(layer);var scrollRectQuads=this._scrollRectQuadsForLayer[layer.id()];for(var i=0;i<scrollRectQuads.length;++i){vertices=this._calculateVerticesForQuad(scrollRectQuads[i],this._calculateScrollRectDepth(layer,i));var isSelected=this._isObjectActive(WebInspector.Layers3DView.OutlineType.Selected,layer,i);var color=isSelected?WebInspector.Layers3DView.SelectedScrollRectBackgroundColor:WebInspector.Layers3DView.ScrollRectBackgroundColor;this._drawRectangle(vertices,color,gl.TRIANGLE_FAN);this._drawRectangle(vertices,WebInspector.Layers3DView.ScrollRectBorderColor,gl.LINE_LOOP);}},_calculateDepths:function()
{this._depthByLayerId={};this._isVisible={};var depth=0;var root=this._layerTree.root();var queue=[root];this._depthByLayerId[root.id()]=0;this._isVisible[root.id()]=false;while(queue.length>0){var layer=queue.shift();var children=layer.children();for(var i=0;i<children.length;++i){this._depthByLayerId[children[i].id()]=++depth;this._isVisible[children[i].id()]=children[i]===this._layerTree.contentRoot()||this._isVisible[layer.id()];queue.push(children[i]);}}},setLayerTree:function(layerTree)
{this._layerTree=layerTree;this._update();},_update:function()
{if(!this.isShowing()){this._needsUpdate=true;return;}
var contentRoot=this._layerTree&&this._layerTree.contentRoot();if(!contentRoot||!this._layerTree.root()){this._emptyView.show(this.element);return;}
this._emptyView.detach();var gl=this._initGLIfNecessary();this._resizeCanvas();this._initProjectionMatrix();this._calculateDepths();gl.viewport(0,0,gl.viewportWidth,gl.viewportHeight);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this._layerTree.forEachLayer(this._drawLayer.bind(this));},_intersectLineAndRect:function(vertices,matrix,x0,y0)
{var epsilon=1e-8;var i;var points=[];for(i=0;i<4;++i)
points[i]=WebInspector.Geometry.multiplyVectorByMatrixAndNormalize(new WebInspector.Geometry.Vector(vertices[i*3],vertices[i*3+1],vertices[i*3+2]),matrix);var normal=WebInspector.Geometry.crossProduct(WebInspector.Geometry.subtract(points[1],points[0]),WebInspector.Geometry.subtract(points[2],points[1]));var A=normal.x;var B=normal.y;var C=normal.z;var D=-(A*points[0].x+B*points[0].y+C*points[0].z);var t=-(D+A*x0+B*y0)/C;var pt=new WebInspector.Geometry.Vector(x0,y0,t);var tVects=points.map(WebInspector.Geometry.subtract.bind(null,pt));for(i=0;i<tVects.length;++i){var product=WebInspector.Geometry.scalarProduct(normal,WebInspector.Geometry.crossProduct(tVects[i],tVects[(i+1)%tVects.length]));if(product<0)
return undefined;}
return t;},_layerFromEventPoint:function(event)
{if(!this._layerTree)
return null;var closestIntersectionPoint=Infinity;var closestLayer=null;var projectionMatrix=new WebKitCSSMatrix().scale(1,-1,-1).translate(-1,-1,0).multiply(this._calculateProjectionMatrix());var x0=(event.clientX-this._canvasElement.totalOffsetLeft())*window.devicePixelRatio;var y0=-(event.clientY-this._canvasElement.totalOffsetTop())*window.devicePixelRatio;function checkIntersection(layer)
{var t;if(this._isVisible[layer.id()]){t=this._intersectLineAndRect(this._calculateVerticesForQuad(layer.quad(),this._depthByLayerId[layer.id()]*WebInspector.Layers3DView.LayerSpacing),projectionMatrix,x0,y0);if(t<closestIntersectionPoint){closestIntersectionPoint=t;closestLayer={layer:layer};}}
var scrollRectQuads=this._scrollRectQuadsForLayer[layer.id()];for(var i=0;i<scrollRectQuads.length;++i){t=this._intersectLineAndRect(this._calculateVerticesForQuad(scrollRectQuads[i],this._calculateScrollRectDepth(layer,i)),projectionMatrix,x0,y0);if(t<closestIntersectionPoint){closestIntersectionPoint=t;closestLayer={layer:layer,scrollRectIndex:i};}}}
this._layerTree.forEachLayer(checkIntersection.bind(this));return closestLayer;},_onContextMenu:function(event)
{var layer=this._layerFromEventPoint(event).layer;var node=layer?layer.nodeForSelfOrAncestor():null;var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem("Reset view",this._transformController._resetAndNotify.bind(this._transformController),false);if(node)
contextMenu.appendApplicableItems(node);contextMenu.show();},_onMouseMove:function(event)
{if(event.which)
return;this.dispatchEventToListeners(WebInspector.Layers3DView.Events.ObjectHovered,this._layerFromEventPoint(event));},_onMouseDown:function(event)
{this._mouseDownX=event.clientX;this._mouseDownY=event.clientY;},_onMouseUp:function(event)
{const maxDistanceInPixels=6;if(this._mouseDownX&&Math.abs(event.clientX-this._mouseDownX)<maxDistanceInPixels&&Math.abs(event.clientY-this._mouseDownY)<maxDistanceInPixels)
this.dispatchEventToListeners(WebInspector.Layers3DView.Events.ObjectSelected,this._layerFromEventPoint(event));delete this._mouseDownX;delete this._mouseDownY;},_onDoubleClick:function(event)
{var object=this._layerFromEventPoint(event);if(object&&object.layer)
this.dispatchEventToListeners(WebInspector.Layers3DView.Events.LayerSnapshotRequested,object.layer);event.stopPropagation();},__proto__:WebInspector.VBox.prototype};WebInspector.MemoryCountersGraph=function(delegate,model)
{WebInspector.CountersGraph.call(this,WebInspector.UIString("MEMORY"),delegate,model);this._countersByName={};this._countersByName["jsHeapSizeUsed"]=this.createCounter(WebInspector.UIString("Used JS Heap"),WebInspector.UIString("JS Heap Size: %d"),"hsl(220, 90%, 43%)");this._countersByName["documents"]=this.createCounter(WebInspector.UIString("Documents"),WebInspector.UIString("Documents: %d"),"hsl(0, 90%, 43%)");this._countersByName["nodes"]=this.createCounter(WebInspector.UIString("Nodes"),WebInspector.UIString("Nodes: %d"),"hsl(120, 90%, 43%)");this._countersByName["jsEventListeners"]=this.createCounter(WebInspector.UIString("Listeners"),WebInspector.UIString("Listeners: %d"),"hsl(38, 90%, 43%)");if(WebInspector.experimentsSettings.gpuTimeline.isEnabled()){this._gpuMemoryCounter=this.createCounter(WebInspector.UIString("GPU Memory"),WebInspector.UIString("GPU Memory [KB]: %d"),"hsl(300, 90%, 43%)");this._countersByName["gpuMemoryUsedKB"]=this._gpuMemoryCounter;}}
WebInspector.MemoryCountersGraph.prototype={timelineStarted:function()
{},timelineStopped:function()
{},addRecord:function(record)
{function addStatistics(record)
{if(record.type()!==WebInspector.TimelineModel.RecordType.UpdateCounters)
return;var counters=record.data();for(var name in counters){var counter=this._countersByName[name];if(counter)
counter.appendSample(record.endTime()||record.startTime(),counters[name]);}
var gpuMemoryLimitCounterName="gpuMemoryLimitKB";if(this._gpuMemoryCounter&&(gpuMemoryLimitCounterName in counters))
this._gpuMemoryCounter.setLimit(counters[gpuMemoryLimitCounterName]);}
WebInspector.TimelineModel.forAllRecords([record],null,addStatistics.bind(this));this.scheduleRefresh();},refreshRecords:function()
{this.reset();var records=this._model.records();for(var i=0;i<records.length;++i)
this.addRecord(records[i]);},__proto__:WebInspector.CountersGraph.prototype};WebInspector.TimelineModel=function(timelineManager)
{this._timelineManager=timelineManager;this._filters=[];this._bindings=new WebInspector.TimelineModel.InterRecordBindings();this.reset();this._timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineEventRecorded,this._onRecordAdded,this);this._timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineStarted,this._onStarted,this);this._timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineStopped,this._onStopped,this);this._timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineProgress,this._onProgress,this);}
WebInspector.TimelineModel.TransferChunkLengthBytes=5000000;WebInspector.TimelineModel.RecordType={Root:"Root",Program:"Program",EventDispatch:"EventDispatch",GPUTask:"GPUTask",RequestMainThreadFrame:"RequestMainThreadFrame",BeginFrame:"BeginFrame",ActivateLayerTree:"ActivateLayerTree",DrawFrame:"DrawFrame",ScheduleStyleRecalculation:"ScheduleStyleRecalculation",RecalculateStyles:"RecalculateStyles",InvalidateLayout:"InvalidateLayout",Layout:"Layout",UpdateLayerTree:"UpdateLayerTree",PaintSetup:"PaintSetup",Paint:"Paint",Rasterize:"Rasterize",ScrollLayer:"ScrollLayer",DecodeImage:"DecodeImage",ResizeImage:"ResizeImage",CompositeLayers:"CompositeLayers",ParseHTML:"ParseHTML",TimerInstall:"TimerInstall",TimerRemove:"TimerRemove",TimerFire:"TimerFire",XHRReadyStateChange:"XHRReadyStateChange",XHRLoad:"XHRLoad",EvaluateScript:"EvaluateScript",MarkLoad:"MarkLoad",MarkDOMContent:"MarkDOMContent",MarkFirstPaint:"MarkFirstPaint",TimeStamp:"TimeStamp",ConsoleTime:"ConsoleTime",ResourceSendRequest:"ResourceSendRequest",ResourceReceiveResponse:"ResourceReceiveResponse",ResourceReceivedData:"ResourceReceivedData",ResourceFinish:"ResourceFinish",FunctionCall:"FunctionCall",GCEvent:"GCEvent",JSFrame:"JSFrame",UpdateCounters:"UpdateCounters",RequestAnimationFrame:"RequestAnimationFrame",CancelAnimationFrame:"CancelAnimationFrame",FireAnimationFrame:"FireAnimationFrame",WebSocketCreate:"WebSocketCreate",WebSocketSendHandshakeRequest:"WebSocketSendHandshakeRequest",WebSocketReceiveHandshakeResponse:"WebSocketReceiveHandshakeResponse",WebSocketDestroy:"WebSocketDestroy",EmbedderCallback:"EmbedderCallback",}
WebInspector.TimelineModel.Events={RecordAdded:"RecordAdded",RecordsCleared:"RecordsCleared",RecordingStarted:"RecordingStarted",RecordingStopped:"RecordingStopped",RecordingProgress:"RecordingProgress",RecordFilterChanged:"RecordFilterChanged"}
WebInspector.TimelineModel.forAllRecords=function(recordsArray,preOrderCallback,postOrderCallback)
{function processRecords(records,depth)
{for(var i=0;i<records.length;++i){var record=records[i];if(preOrderCallback&&preOrderCallback(record,depth))
return true;if(processRecords(record.children(),depth+1))
return true;if(postOrderCallback&&postOrderCallback(record,depth))
return true;}
return false;}
return processRecords(recordsArray,0);}
WebInspector.TimelineModel.prototype={target:function()
{return this._timelineManager.target();},loadedFromFile:function()
{return this._loadedFromFile;},forAllRecords:function(preOrderCallback,postOrderCallback)
{WebInspector.TimelineModel.forAllRecords(this._records,preOrderCallback,postOrderCallback);},addFilter:function(filter)
{this._filters.push(filter);filter._model=this;},forAllFilteredRecords:function(callback)
{function processRecord(record,depth)
{var visible=this.isVisible(record);if(visible){if(callback(record,depth))
return true;}
for(var i=0;i<record.children().length;++i){if(processRecord.call(this,record.children()[i],visible?depth+1:depth))
return true;}
return false;}
for(var i=0;i<this._records.length;++i)
processRecord.call(this,this._records[i],0);},isVisible:function(record)
{for(var i=0;i<this._filters.length;++i){if(!this._filters[i].accept(record))
return false;}
return true;},_filterChanged:function()
{this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordFilterChanged);},startRecording:function(captureStacks,captureMemory)
{this._clientInitiatedRecording=true;this.reset();var maxStackFrames=captureStacks?30:0;this._bufferEvents=WebInspector.experimentsSettings.timelineNoLiveUpdate.isEnabled();var includeGPUEvents=WebInspector.experimentsSettings.gpuTimeline.isEnabled();var liveEvents=[WebInspector.TimelineModel.RecordType.BeginFrame,WebInspector.TimelineModel.RecordType.DrawFrame,WebInspector.TimelineModel.RecordType.RequestMainThreadFrame,WebInspector.TimelineModel.RecordType.ActivateLayerTree];this._timelineManager.start(maxStackFrames,this._bufferEvents,liveEvents.join(","),captureMemory,includeGPUEvents,this._fireRecordingStarted.bind(this));},stopRecording:function()
{if(!this._clientInitiatedRecording){this._timelineManager.start(undefined,undefined,undefined,undefined,undefined,stopTimeline.bind(this));return;}
function stopTimeline()
{this._timelineManager.stop(this._fireRecordingStopped.bind(this));}
this._clientInitiatedRecording=false;this._timelineManager.stop(this._fireRecordingStopped.bind(this));},willStartRecordingTraceEvents:function()
{this.reset();this._fireRecordingStarted();},didStopRecordingTraceEvents:function(mainThreadEvents)
{var recordStack=[];for(var i=0,size=mainThreadEvents.length;i<size;++i){var event=mainThreadEvents[i];while(recordStack.length){var top=recordStack.peekLast();if(top._event.endTime>=event.startTime)
break;recordStack.pop();}
var parentRecord=recordStack.peekLast()||null;var record=new WebInspector.TimelineModel.TraceEventRecord(this,event,parentRecord);if(WebInspector.TimelineUIUtils.isEventDivider(record))
this._eventDividerRecords.push(record);if(!recordStack.length)
this._addTopLevelRecord(record);if(event.endTime)
recordStack.push(record);}
this._fireRecordingStopped(null,null);},_addTopLevelRecord:function(record)
{this._updateBoundaries(record);this._records.push(record);if(record.type()===WebInspector.TimelineModel.RecordType.Program)
this._mainThreadTasks.push(record);if(record.type()===WebInspector.TimelineModel.RecordType.GPUTask)
this._gpuThreadTasks.push(record);this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordAdded,record);},records:function()
{return this._records;},_onRecordAdded:function(event)
{if(this._collectionEnabled)
this._addRecord((event.data));},_onStarted:function(event)
{if(event.data){this._fireRecordingStarted();}},_onStopped:function(event)
{if(event.data){this._fireRecordingStopped(null,null);}},_onProgress:function(event)
{this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingProgress,event.data);},_fireRecordingStarted:function()
{this._collectionEnabled=true;this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStarted);},_fireRecordingStopped:function(error,cpuProfile)
{this._bufferEvents=false;this._collectionEnabled=false;if(cpuProfile)
WebInspector.TimelineJSProfileProcessor.mergeJSProfileIntoTimeline(this,cpuProfile);this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStopped);},bufferEvents:function()
{return this._bufferEvents;},_addRecord:function(payload)
{this._internStrings(payload);this._payloads.push(payload);var record=this._innerAddRecord(payload,null);this._updateBoundaries(record);this._records.push(record);if(record.type()===WebInspector.TimelineModel.RecordType.Program)
this._mainThreadTasks.push(record);if(record.type()===WebInspector.TimelineModel.RecordType.GPUTask)
this._gpuThreadTasks.push(record);this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordAdded,record);},_innerAddRecord:function(payload,parentRecord)
{var record=new WebInspector.TimelineModel.RecordImpl(this,payload,parentRecord);if(WebInspector.TimelineUIUtils.isEventDivider(record))
this._eventDividerRecords.push(record);for(var i=0;payload.children&&i<payload.children.length;++i)
this._innerAddRecord.call(this,payload.children[i],record);record._calculateAggregatedStats();if(parentRecord)
parentRecord._selfTime-=record.endTime()-record.startTime();return record;},loadFromFile:function(file,progress)
{var delegate=new WebInspector.TimelineModelLoadFromFileDelegate(this,progress);var fileReader=this._createFileReader(file,delegate);var loader=new WebInspector.TimelineModelLoader(this,fileReader,progress);fileReader.start(loader);},loadFromURL:function(url,progress)
{var delegate=new WebInspector.TimelineModelLoadFromFileDelegate(this,progress);var urlReader=new WebInspector.ChunkedXHRReader(url,delegate);var loader=new WebInspector.TimelineModelLoader(this,urlReader,progress);urlReader.start(loader);},_createFileReader:function(file,delegate)
{return new WebInspector.ChunkedFileReader(file,WebInspector.TimelineModel.TransferChunkLengthBytes,delegate);},_createFileWriter:function()
{return new WebInspector.FileOutputStream();},saveToFile:function()
{var now=new Date();var fileName="TimelineRawData-"+now.toISO8601Compact()+".json";var stream=this._createFileWriter();function callback(accepted)
{if(!accepted)
return;var saver=new WebInspector.TimelineSaver(stream);saver.save(this._payloads,window.navigator.appVersion);}
stream.open(fileName,callback.bind(this));},reset:function()
{this._loadedFromFile=false;this._records=[];this._payloads=[];this._stringPool={};this._minimumRecordTime=-1;this._maximumRecordTime=-1;this._bindings._reset();this._mainThreadTasks=[];this._gpuThreadTasks=[];this._eventDividerRecords=[];this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordsCleared);},minimumRecordTime:function()
{return this._minimumRecordTime;},maximumRecordTime:function()
{return this._maximumRecordTime;},_updateBoundaries:function(record)
{var startTime=record.startTime();var endTime=record.endTime();if(this._minimumRecordTime===-1||startTime<this._minimumRecordTime)
this._minimumRecordTime=startTime;if((this._maximumRecordTime===-1&&endTime)||endTime>this._maximumRecordTime)
this._maximumRecordTime=endTime;},mainThreadTasks:function()
{return this._mainThreadTasks;},gpuThreadTasks:function()
{return this._gpuThreadTasks;},eventDividerRecords:function()
{return this._eventDividerRecords;},_internStrings:function(record)
{for(var name in record){var value=record[name];if(typeof value!=="string")
continue;var interned=this._stringPool[value];if(typeof interned==="string")
record[name]=interned;else
this._stringPool[value]=value;}
var children=record.children;for(var i=0;children&&i<children.length;++i)
this._internStrings(children[i]);},__proto__:WebInspector.Object.prototype}
WebInspector.TimelineModel.InterRecordBindings=function(){this._reset();}
WebInspector.TimelineModel.InterRecordBindings.prototype={_reset:function()
{this._sendRequestRecords={};this._timerRecords={};this._requestAnimationFrameRecords={};this._layoutInvalidate={};this._lastScheduleStyleRecalculation={};this._webSocketCreateRecords={};}}
WebInspector.TimelineModel.Record=function()
{}
WebInspector.TimelineModel.Record.prototype={callSiteStackTrace:function(){},initiator:function(){},target:function(){},selfTime:function(){},children:function(){},category:function(){},title:function(){},startTime:function(){},thread:function(){},endTime:function(){},setEndTime:function(endTime){},data:function(){},type:function(){},frameId:function(){},stackTrace:function(){},getUserObject:function(key){},setUserObject:function(key,value){},aggregatedStats:function(){},warnings:function(){},testContentMatching:function(regExp){}}
WebInspector.TimelineModel.TraceEventRecord=function(model,traceEvent,parentRecord)
{this._model=model;this._event=traceEvent;traceEvent._timelineRecord=this;if(parentRecord){this.parent=parentRecord;parentRecord._children.push(this);}
this._children=[];}
WebInspector.TimelineModel.TraceEventRecord.prototype={callSiteStackTrace:function()
{var initiator=this._event.initiator;return initiator?initiator.stackTrace:null;},initiator:function()
{var initiator=this._event.initiator;return initiator?initiator._timelineRecord:null;},target:function()
{return this._model.target();},selfTime:function()
{return this._event.selfTime/1000;},children:function()
{return this._children;},category:function()
{var style=WebInspector.TimelineUIUtils.styleForTimelineEvent(this._event.name);return style.category;},title:function()
{return WebInspector.TimelineUIUtils.recordTitle(this,this._model);},startTime:function()
{return this._event.startTime/1000;},thread:function()
{return"CPU";},endTime:function()
{return(this._event.endTime||this._event.startTime)/1000;},setEndTime:function(endTime)
{throw new Error("Unsupported operation setEndTime");},data:function()
{return this._event.args.data;},type:function()
{return this._event.name;},frameId:function()
{switch(this._event.name){case WebInspector.TimelineTraceEventBindings.RecordType.ScheduleStyleRecalculation:case WebInspector.TimelineTraceEventBindings.RecordType.RecalculateStyles:case WebInspector.TimelineTraceEventBindings.RecordType.InvalidateLayout:return this._event.args["frameId"];case WebInspector.TimelineTraceEventBindings.RecordType.Layout:return this._event.args["beginData"]["frameId"];default:var data=this._event.args.data;return(data&&data["frame"])||"";}},stackTrace:function()
{return this._event.stackTrace;},getUserObject:function(key)
{if(key==="TimelineUIUtils::preview-element")
return this._event.previewElement;throw new Error("Unexpected key: "+key);},setUserObject:function(key,value)
{if(key!=="TimelineUIUtils::preview-element")
throw new Error("Unexpected key: "+key);this._event.previewElement=(value);},aggregatedStats:function()
{return{};},warnings:function()
{if(this._event.warning)
return[this._event.warning];return null;},testContentMatching:function(regExp)
{var tokens=[this.title()];var data=this._event.args.data;if(data){for(var key in data)
tokens.push(data[key]);}
return regExp.test(tokens.join("|"));}}
WebInspector.TimelineModel.RecordImpl=function(model,timelineEvent,parentRecord)
{this._model=model;var bindings=this._model._bindings;this._aggregatedStats={};this._record=timelineEvent;this._children=[];if(parentRecord){this.parent=parentRecord;parentRecord.children().push(this);}
this._selfTime=this.endTime()-this.startTime();var recordTypes=WebInspector.TimelineModel.RecordType;switch(timelineEvent.type){case recordTypes.ResourceSendRequest:bindings._sendRequestRecords[timelineEvent.data["requestId"]]=this;break;case recordTypes.ResourceReceiveResponse:case recordTypes.ResourceReceivedData:case recordTypes.ResourceFinish:this._initiator=bindings._sendRequestRecords[timelineEvent.data["requestId"]];break;case recordTypes.TimerInstall:bindings._timerRecords[timelineEvent.data["timerId"]]=this;break;case recordTypes.TimerFire:this._initiator=bindings._timerRecords[timelineEvent.data["timerId"]];break;case recordTypes.RequestAnimationFrame:bindings._requestAnimationFrameRecords[timelineEvent.data["id"]]=this;break;case recordTypes.FireAnimationFrame:this._initiator=bindings._requestAnimationFrameRecords[timelineEvent.data["id"]];break;case recordTypes.ScheduleStyleRecalculation:bindings._lastScheduleStyleRecalculation[this.frameId()]=this;break;case recordTypes.RecalculateStyles:this._initiator=bindings._lastScheduleStyleRecalculation[this.frameId()];break;case recordTypes.InvalidateLayout:var layoutInitator=this;if(!bindings._layoutInvalidate[this.frameId()]&&parentRecord.type()===recordTypes.RecalculateStyles)
layoutInitator=parentRecord._initiator;bindings._layoutInvalidate[this.frameId()]=layoutInitator;break;case recordTypes.Layout:this._initiator=bindings._layoutInvalidate[this.frameId()];bindings._layoutInvalidate[this.frameId()]=null;if(this.stackTrace())
this.addWarning(WebInspector.UIString("Forced synchronous layout is a possible performance bottleneck."));break;case recordTypes.WebSocketCreate:bindings._webSocketCreateRecords[timelineEvent.data["identifier"]]=this;break;case recordTypes.WebSocketSendHandshakeRequest:case recordTypes.WebSocketReceiveHandshakeResponse:case recordTypes.WebSocketDestroy:this._initiator=bindings._webSocketCreateRecords[timelineEvent.data["identifier"]];break;}}
WebInspector.TimelineModel.RecordImpl.prototype={callSiteStackTrace:function()
{return this._initiator?this._initiator.stackTrace():null;},initiator:function()
{return this._initiator;},target:function()
{return this._model.target();},selfTime:function()
{return this._selfTime;},children:function()
{return this._children;},category:function()
{return WebInspector.TimelineUIUtils.categoryForRecord(this);},title:function()
{return WebInspector.TimelineUIUtils.recordTitle(this,this._model);},startTime:function()
{return this._record.startTime;},thread:function()
{return this._record.thread;},endTime:function()
{return this._endTime||this._record.endTime||this._record.startTime;},setEndTime:function(endTime)
{this._endTime=endTime;},data:function()
{return this._record.data;},type:function()
{return this._record.type;},frameId:function()
{return this._record.frameId||"";},stackTrace:function()
{if(this._record.stackTrace&&this._record.stackTrace.length)
return this._record.stackTrace;return null;},getUserObject:function(key)
{if(!this._userObjects)
return null;return this._userObjects.get(key);},setUserObject:function(key,value)
{if(!this._userObjects)
this._userObjects=new StringMap();this._userObjects.put(key,value);},_calculateAggregatedStats:function()
{this._aggregatedStats={};for(var index=this._children.length;index;--index){var child=this._children[index-1];for(var category in child._aggregatedStats)
this._aggregatedStats[category]=(this._aggregatedStats[category]||0)+child._aggregatedStats[category];}
this._aggregatedStats[this.category().name]=(this._aggregatedStats[this.category().name]||0)+this._selfTime;},aggregatedStats:function()
{return this._aggregatedStats;},addWarning:function(message)
{if(!this._warnings)
this._warnings=[];this._warnings.push(message);},warnings:function()
{return this._warnings;},testContentMatching:function(regExp)
{var tokens=[this.title()];for(var key in this._record.data)
tokens.push(this._record.data[key])
return regExp.test(tokens.join("|"));}}
WebInspector.TimelineModel.Filter=function()
{this._model;}
WebInspector.TimelineModel.Filter.prototype={accept:function(record)
{return true;},notifyFilterChanged:function()
{this._model._filterChanged();}}
WebInspector.TimelineModelLoader=function(model,reader,progress)
{this._model=model;this._reader=reader;this._progress=progress;this._buffer="";this._firstChunk=true;}
WebInspector.TimelineModelLoader.prototype={write:function(chunk)
{var data=this._buffer+chunk;var lastIndex=0;var index;do{index=lastIndex;lastIndex=WebInspector.TextUtils.findBalancedCurlyBrackets(data,index);}while(lastIndex!==-1)
var json=data.slice(0,index)+"]";this._buffer=data.slice(index);if(!index)
return;if(!this._firstChunk)
json="[0"+json;var items;try{items=(JSON.parse(json));}catch(e){WebInspector.messageSink.addErrorMessage("Malformed timeline data.",true);this._model.reset();this._reader.cancel();this._progress.done();return;}
if(this._firstChunk){this._version=items[0];this._firstChunk=false;this._model.reset();}
for(var i=1,size=items.length;i<size;++i)
this._model._addRecord(items[i]);},close:function()
{this._model._loadedFromFile=true;}}
WebInspector.TimelineModelLoadFromFileDelegate=function(model,progress)
{this._model=model;this._progress=progress;}
WebInspector.TimelineModelLoadFromFileDelegate.prototype={onTransferStarted:function()
{this._progress.setTitle(WebInspector.UIString("Loading\u2026"));},onChunkTransferred:function(reader)
{if(this._progress.isCanceled()){reader.cancel();this._progress.done();this._model.reset();return;}
var totalSize=reader.fileSize();if(totalSize){this._progress.setTotalWork(totalSize);this._progress.setWorked(reader.loadedSize());}},onTransferFinished:function()
{this._progress.done();},onError:function(reader,event)
{this._progress.done();this._model.reset();switch(event.target.error.code){case FileError.NOT_FOUND_ERR:WebInspector.messageSink.addErrorMessage(WebInspector.UIString("File \"%s\" not found.",reader.fileName()),true);break;case FileError.NOT_READABLE_ERR:WebInspector.messageSink.addErrorMessage(WebInspector.UIString("File \"%s\" is not readable",reader.fileName()),true);break;case FileError.ABORT_ERR:break;default:WebInspector.messageSink.addErrorMessage(WebInspector.UIString("An error occurred while reading the file \"%s\"",reader.fileName()),true);}}}
WebInspector.TimelineSaver=function(stream)
{this._stream=stream;}
WebInspector.TimelineSaver.prototype={save:function(payloads,version)
{this._payloads=payloads;this._recordIndex=0;this._prologue="["+JSON.stringify(version);this._writeNextChunk(this._stream);},_writeNextChunk:function(stream)
{const separator=",\n";var data=[];var length=0;if(this._prologue){data.push(this._prologue);length+=this._prologue.length;delete this._prologue;}else{if(this._recordIndex===this._payloads.length){stream.close();return;}
data.push("");}
while(this._recordIndex<this._payloads.length){var item=JSON.stringify(this._payloads[this._recordIndex]);var itemLength=item.length+separator.length;if(length+itemLength>WebInspector.TimelineModel.TransferChunkLengthBytes)
break;length+=itemLength;data.push(item);++this._recordIndex;}
if(this._recordIndex===this._payloads.length)
data.push(data.pop()+"]");stream.write(data.join(separator),this._writeNextChunk.bind(this));}}
WebInspector.TimelineMergingRecordBuffer=function()
{this._backgroundRecordsBuffer=[];}
WebInspector.TimelineMergingRecordBuffer.prototype={process:function(thread,records)
{if(thread){this._backgroundRecordsBuffer=this._backgroundRecordsBuffer.concat(records);return[];}
function recordTimestampComparator(a,b)
{return a.startTime()<b.startTime()?-1:1;}
var result=this._backgroundRecordsBuffer.mergeOrdered(records,recordTimestampComparator);this._backgroundRecordsBuffer=[];return result;}};WebInspector.TimelineJSProfileProcessor={};WebInspector.TimelineJSProfileProcessor.mergeJSProfileIntoTimeline=function(timelineModel,jsProfile)
{if(!jsProfile.samples)
return;var jsProfileModel=new WebInspector.CPUProfileDataModel(jsProfile);var idleNode=jsProfileModel.idleNode;var programNode=jsProfileModel.programNode;var gcNode=jsProfileModel.gcNode;function processRecord(record)
{if(record.type()!==WebInspector.TimelineModel.RecordType.FunctionCall&&record.type()!==WebInspector.TimelineModel.RecordType.EvaluateScript)
return;var recordStartTime=record.startTime();var recordEndTime=record.endTime();var originalChildren=record.children().splice(0);var childIndex=0;function onOpenFrame(depth,node,startTime)
{if(node===idleNode||node===programNode||node===gcNode)
return;var event={type:"JSFrame",data:node,startTime:startTime};putOriginalChildrenUpToTime(startTime);record=new WebInspector.TimelineModel.RecordImpl(timelineModel,event,record);}
function onCloseFrame(depth,node,startTime,totalTime,selfTime)
{if(node===idleNode||node===programNode||node===gcNode)
return;record.setEndTime(Math.min(startTime+totalTime,recordEndTime));record._selfTime=record.endTime()-record.startTime();putOriginalChildrenUpToTime(record.endTime());var deoptReason=node.deoptReason;if(deoptReason&&deoptReason!=="no reason")
record.addWarning(deoptReason);record=record.parent;}
function putOriginalChildrenUpToTime(endTime)
{for(;childIndex<originalChildren.length;++childIndex){var child=originalChildren[childIndex];var midTime=(child.startTime()+child.endTime())/2;if(midTime>=endTime)
break;child.parent=record;record.children().push(child);}}
jsProfileModel.forEachFrame(onOpenFrame,onCloseFrame,recordStartTime,recordEndTime);putOriginalChildrenUpToTime(recordEndTime);}
timelineModel.forAllRecords(processRecord);};WebInspector.TimelineOverviewPane=function(model)
{WebInspector.VBox.call(this);this.element.id="timeline-overview-pane";this._eventDividers=[];this._model=model;this._overviewGrid=new WebInspector.OverviewGrid("timeline");this.element.appendChild(this._overviewGrid.element);this._overviewCalculator=new WebInspector.TimelineOverviewCalculator();model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared,this._reset,this);this._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged,this._onWindowChanged,this);this._overviewControls=[];}
WebInspector.TimelineOverviewPane.Events={WindowChanged:"WindowChanged"};WebInspector.TimelineOverviewPane.prototype={wasShown:function()
{this.update();},onResize:function()
{this.update();},setOverviewControls:function(overviewControls)
{for(var i=0;i<this._overviewControls.length;++i){var overviewControl=this._overviewControls[i];overviewControl.detach();overviewControl.dispose();}
for(var i=0;i<overviewControls.length;++i){overviewControls[i].setOverviewGrid(this._overviewGrid);overviewControls[i].show(this._overviewGrid.element);}
this._overviewControls=overviewControls;this.update();},update:function()
{delete this._refreshTimeout;this._overviewCalculator._setWindow(this._model.minimumRecordTime(),this._model.maximumRecordTime());this._overviewCalculator._setDisplayWindow(0,this._overviewGrid.clientWidth());for(var i=0;i<this._overviewControls.length;++i)
this._overviewControls[i].update();this._overviewGrid.updateDividers(this._overviewCalculator);this._updateEventDividers();this._updateWindow();},_updateEventDividers:function()
{var records=this._eventDividers;this._overviewGrid.removeEventDividers();var dividers=[];for(var i=0;i<records.length;++i){var record=records[i];var positions=this._overviewCalculator.computeBarGraphPercentages(record);var dividerPosition=Math.round(positions.start*10);if(dividers[dividerPosition])
continue;var divider=WebInspector.TimelineUIUtils.createEventDivider(record.type());divider.style.left=positions.start+"%";dividers[dividerPosition]=divider;}
this._overviewGrid.addEventDividers(dividers);},addRecord:function(record)
{var eventDividers=this._eventDividers;function addEventDividers(record)
{if(WebInspector.TimelineUIUtils.isEventDivider(record))
eventDividers.push(record);}
WebInspector.TimelineModel.forAllRecords([record],addEventDividers);this._scheduleRefresh();},_reset:function()
{this._overviewCalculator.reset();this._overviewGrid.reset();this._overviewGrid.setResizeEnabled(false);this._eventDividers=[];this._overviewGrid.updateDividers(this._overviewCalculator);for(var i=0;i<this._overviewControls.length;++i)
this._overviewControls[i].reset();this.update();},_onWindowChanged:function(event)
{if(this._muteOnWindowChanged)
return;if(!this._overviewControls.length)
return;var windowTimes=this._overviewControls[0].windowTimes(this._overviewGrid.windowLeft(),this._overviewGrid.windowRight());this._windowStartTime=windowTimes.startTime;this._windowEndTime=windowTimes.endTime;this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.WindowChanged,windowTimes);},requestWindowTimes:function(startTime,endTime)
{if(startTime===this._windowStartTime&&endTime===this._windowEndTime)
return;this._windowStartTime=startTime;this._windowEndTime=endTime;this._updateWindow();this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.WindowChanged,{startTime:startTime,endTime:endTime});},_updateWindow:function()
{if(!this._overviewControls.length)
return;var windowBoundaries=this._overviewControls[0].windowBoundaries(this._windowStartTime,this._windowEndTime);this._muteOnWindowChanged=true;this._overviewGrid.setWindow(windowBoundaries.left,windowBoundaries.right);this._overviewGrid.setResizeEnabled(!!this._model.records().length);this._muteOnWindowChanged=false;},_scheduleRefresh:function()
{if(this._refreshTimeout)
return;if(!this.isShowing())
return;this._refreshTimeout=setTimeout(this.update.bind(this),300);},__proto__:WebInspector.VBox.prototype}
WebInspector.TimelineOverviewCalculator=function()
{}
WebInspector.TimelineOverviewCalculator.prototype={paddingLeft:function()
{return this._paddingLeft;},computePosition:function(time)
{return(time-this._minimumBoundary)/this.boundarySpan()*this._workingArea+this._paddingLeft;},computeBarGraphPercentages:function(record)
{var start=(record.startTime()-this._minimumBoundary)/this.boundarySpan()*100;var end=(record.endTime()-this._minimumBoundary)/this.boundarySpan()*100;return{start:start,end:end};},_setWindow:function(minimumRecordTime,maximumRecordTime)
{this._minimumBoundary=minimumRecordTime;this._maximumBoundary=maximumRecordTime;},_setDisplayWindow:function(paddingLeft,clientWidth)
{this._workingArea=clientWidth-paddingLeft;this._paddingLeft=paddingLeft;},reset:function()
{this._setWindow(0,1000);},formatTime:function(value,precision)
{return Number.preciseMillisToString(value-this.zeroTime(),precision);},maximumBoundary:function()
{return this._maximumBoundary;},minimumBoundary:function()
{return this._minimumBoundary;},zeroTime:function()
{return this._minimumBoundary;},boundarySpan:function()
{return this._maximumBoundary-this._minimumBoundary;}}
WebInspector.TimelineOverview=function(model)
{}
WebInspector.TimelineOverview.prototype={show:function(parentElement,insertBefore){},setOverviewGrid:function(grid){},update:function(){},dispose:function(){},reset:function(){},windowTimes:function(windowLeft,windowRight){},windowBoundaries:function(startTime,endTime){},}
WebInspector.TimelineOverviewBase=function(model)
{WebInspector.VBox.call(this);this._model=model;this._canvas=this.element.createChild("canvas","fill");this._context=this._canvas.getContext("2d");}
WebInspector.TimelineOverviewBase.prototype={setOverviewGrid:function(grid)
{},update:function()
{this.resetCanvas();},dispose:function()
{},reset:function()
{},timelineStarted:function()
{},timelineStopped:function()
{},windowTimes:function(windowLeft,windowRight)
{var absoluteMin=this._model.minimumRecordTime();var timeSpan=this._model.maximumRecordTime()-absoluteMin;return{startTime:absoluteMin+timeSpan*windowLeft,endTime:absoluteMin+timeSpan*windowRight};},windowBoundaries:function(startTime,endTime)
{var absoluteMin=this._model.minimumRecordTime();var timeSpan=this._model.maximumRecordTime()-absoluteMin;var haveRecords=absoluteMin>=0;return{left:haveRecords&&startTime?Math.min((startTime-absoluteMin)/timeSpan,1):0,right:haveRecords&&endTime<Infinity?(endTime-absoluteMin)/timeSpan:1}},resetCanvas:function()
{this._canvas.width=this.element.clientWidth*window.devicePixelRatio;this._canvas.height=this.element.clientHeight*window.devicePixelRatio;},__proto__:WebInspector.VBox.prototype};WebInspector.TimelinePresentationModel=function(model)
{this._model=model;this._filters=[];this._recordToPresentationRecord=new Map();this.reset();}
WebInspector.TimelinePresentationModel._coalescingRecords={};WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.Layout]=1;WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.Paint]=1;WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.Rasterize]=1;WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.DecodeImage]=1;WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.ResizeImage]=1;WebInspector.TimelinePresentationModel.prototype={setWindowTimes:function(startTime,endTime)
{this._windowStartTime=startTime;this._windowEndTime=endTime;},toPresentationRecord:function(record)
{return record?this._recordToPresentationRecord.get(record)||null:null;},rootRecord:function()
{return this._rootRecord;},reset:function()
{this._recordToPresentationRecord.clear();var rootPayload={type:WebInspector.TimelineModel.RecordType.Root};var rootRecord=new WebInspector.TimelineModel.RecordImpl(this._model,(rootPayload),null);this._rootRecord=new WebInspector.TimelinePresentationModel.Record(rootRecord,null);this._coalescingBuckets={};},addRecord:function(record)
{var records;if(record.type()===WebInspector.TimelineModel.RecordType.Program)
records=record.children();else
records=[record];for(var i=0;i<records.length;++i)
this._innerAddRecord(this._rootRecord,records[i]);},_innerAddRecord:function(parentRecord,record)
{var coalescingBucket;if(parentRecord===this._rootRecord)
coalescingBucket=record.thread()?record.type():"mainThread";var coalescedRecord=this._findCoalescedParent(record,parentRecord,coalescingBucket);if(coalescedRecord)
parentRecord=coalescedRecord;var formattedRecord=new WebInspector.TimelinePresentationModel.Record(record,parentRecord);this._recordToPresentationRecord.put(record,formattedRecord);formattedRecord._collapsed=parentRecord===this._rootRecord;if(coalescingBucket)
this._coalescingBuckets[coalescingBucket]=formattedRecord;for(var i=0;record.children()&&i<record.children().length;++i)
this._innerAddRecord(formattedRecord,record.children()[i]);if(parentRecord._coalesced)
this._updateCoalescingParent(formattedRecord);},_findCoalescedParent:function(record,newParent,bucket)
{const coalescingThresholdMillis=5;var lastRecord=bucket?this._coalescingBuckets[bucket]:newParent._presentationChildren.peekLast();if(lastRecord&&lastRecord._coalesced)
lastRecord=lastRecord._presentationChildren.peekLast();var startTime=record.startTime();var endTime=record.endTime();if(!lastRecord)
return null;if(lastRecord.record().type()!==record.type())
return null;if(!WebInspector.TimelinePresentationModel._coalescingRecords[record.type()])
return null;if(lastRecord.record().endTime()+coalescingThresholdMillis<startTime)
return null;if(endTime+coalescingThresholdMillis<lastRecord.record().startTime())
return null;if(lastRecord.presentationParent()._coalesced)
return lastRecord.presentationParent();return this._replaceWithCoalescedRecord(lastRecord);},_replaceWithCoalescedRecord:function(presentationRecord)
{var record=presentationRecord.record();var rawRecord={type:record.type(),startTime:record.startTime(),data:{}};if(record.thread())
rawRecord.thread="aggregated";if(record.type()===WebInspector.TimelineModel.RecordType.TimeStamp)
rawRecord.data["message"]=record.data().message;var modelRecord=new WebInspector.TimelineModel.RecordImpl(this._model,(rawRecord),null);var coalescedRecord=new WebInspector.TimelinePresentationModel.Record(modelRecord,null);var parent=presentationRecord._presentationParent;coalescedRecord._coalesced=true;coalescedRecord._collapsed=true;coalescedRecord._presentationChildren.push(presentationRecord);presentationRecord._presentationParent=coalescedRecord;if(presentationRecord.hasWarnings()||presentationRecord.childHasWarnings())
coalescedRecord._childHasWarnings=true;coalescedRecord._presentationParent=parent;parent._presentationChildren[parent._presentationChildren.indexOf(presentationRecord)]=coalescedRecord;WebInspector.TimelineUIUtils.aggregateTimeByCategory(modelRecord.aggregatedStats(),record.aggregatedStats());return coalescedRecord;},_updateCoalescingParent:function(presentationRecord)
{var record=presentationRecord.record();var parentRecord=presentationRecord._presentationParent.record();WebInspector.TimelineUIUtils.aggregateTimeByCategory(parentRecord.aggregatedStats(),record.aggregatedStats());if(parentRecord.endTime()<record.endTime())
parentRecord.setEndTime(record.endTime());},setTextFilter:function(textFilter)
{this._textFilter=textFilter;},invalidateFilteredRecords:function()
{delete this._filteredRecords;},filteredRecords:function()
{if(this._filteredRecords)
return this._filteredRecords;var recordsInWindow=[];var stack=[{children:this._rootRecord._presentationChildren,index:0,parentIsCollapsed:false,parentRecord:{}}];var revealedDepth=0;function revealRecordsInStack(){for(var depth=revealedDepth+1;depth<stack.length;++depth){if(stack[depth-1].parentIsCollapsed){stack[depth].parentRecord._presentationParent._expandable=true;return;}
stack[depth-1].parentRecord._collapsed=false;recordsInWindow.push(stack[depth].parentRecord);stack[depth].windowLengthBeforeChildrenTraversal=recordsInWindow.length;stack[depth].parentIsRevealed=true;revealedDepth=depth;}}
while(stack.length){var entry=stack[stack.length-1];var records=entry.children;if(records&&entry.index<records.length){var record=records[entry.index];++entry.index;var rawRecord=record.record();if(rawRecord.startTime()<this._windowEndTime&&rawRecord.endTime()>this._windowStartTime){if(this._model.isVisible(rawRecord)){record._presentationParent._expandable=true;if(this._textFilter)
revealRecordsInStack();if(!entry.parentIsCollapsed){recordsInWindow.push(record);revealedDepth=stack.length;entry.parentRecord._collapsed=false;}}}
record._expandable=false;stack.push({children:record._presentationChildren,index:0,parentIsCollapsed:entry.parentIsCollapsed||(record._collapsed&&(!this._textFilter||record._expandedOrCollapsedWhileFiltered)),parentRecord:record,windowLengthBeforeChildrenTraversal:recordsInWindow.length});}else{stack.pop();revealedDepth=Math.min(revealedDepth,stack.length-1);entry.parentRecord._visibleChildrenCount=recordsInWindow.length-entry.windowLengthBeforeChildrenTraversal;}}
this._filteredRecords=recordsInWindow;return recordsInWindow;},__proto__:WebInspector.Object.prototype}
WebInspector.TimelinePresentationModel.Record=function(record,parentRecord)
{this._record=record;this._presentationChildren=[];if(parentRecord){this._presentationParent=parentRecord;parentRecord._presentationChildren.push(this);}
if(this.hasWarnings()){for(var parent=this._presentationParent;parent&&!parent._childHasWarnings;parent=parent._presentationParent)
parent._childHasWarnings=true;}}
WebInspector.TimelinePresentationModel.Record.prototype={record:function()
{return this._record;},presentationChildren:function()
{return this._presentationChildren;},coalesced:function()
{return this._coalesced;},collapsed:function()
{return this._collapsed;},setCollapsed:function(collapsed)
{this._collapsed=collapsed;this._expandedOrCollapsedWhileFiltered=true;},presentationParent:function()
{return this._presentationParent||null;},visibleChildrenCount:function()
{return this._visibleChildrenCount||0;},expandable:function()
{return!!this._expandable;},hasWarnings:function()
{return!!this._record.warnings();},childHasWarnings:function()
{return this._childHasWarnings;},listRow:function()
{return this._listRow;},setListRow:function(listRow)
{this._listRow=listRow;},graphRow:function()
{return this._graphRow;},setGraphRow:function(graphRow)
{this._graphRow=graphRow;}};WebInspector.TimelineFrameModel=function(model)
{this._model=model;this.reset();var records=model.records();for(var i=0;i<records.length;++i)
this.addRecord(records[i]);}
WebInspector.TimelineFrameModel.Events={FrameAdded:"FrameAdded"}
WebInspector.TimelineFrameModel._mainFrameMarkers=[WebInspector.TimelineModel.RecordType.ScheduleStyleRecalculation,WebInspector.TimelineModel.RecordType.InvalidateLayout,WebInspector.TimelineModel.RecordType.BeginFrame,WebInspector.TimelineModel.RecordType.ScrollLayer];WebInspector.TimelineFrameModel.prototype={target:function()
{return this._model.target();},frames:function()
{return this._frames;},filteredFrames:function(startTime,endTime)
{function compareStartTime(value,object)
{return value-object.startTime;}
function compareEndTime(value,object)
{return value-object.endTime;}
var frames=this._frames;var firstFrame=insertionIndexForObjectInListSortedByFunction(startTime,frames,compareEndTime);var lastFrame=insertionIndexForObjectInListSortedByFunction(endTime,frames,compareStartTime);return frames.slice(firstFrame,lastFrame);},reset:function()
{this._frames=[];this._lastFrame=null;this._lastLayerTree=null;this._hasThreadedCompositing=false;this._mainFrameCommitted=false;this._mainFrameRequested=false;this._aggregatedMainThreadWork=null;this._mergingBuffer=new WebInspector.TimelineMergingRecordBuffer();},addRecord:function(record)
{var recordTypes=WebInspector.TimelineModel.RecordType;var programRecord=record.type()===recordTypes.Program?record:null;if(programRecord){if(!this._aggregatedMainThreadWork&&this._findRecordRecursively(WebInspector.TimelineFrameModel._mainFrameMarkers,programRecord))
this._aggregatedMainThreadWork={};}
var records=[];if(this._model.bufferEvents())
records=[record];else
records=this._mergingBuffer.process(record.thread(),(programRecord?record.children()||[]:[record]));for(var i=0;i<records.length;++i){if(records[i].thread())
this._addBackgroundRecord(records[i]);else
this._addMainThreadRecord(programRecord,records[i]);}},addTraceEvents:function(events,sessionId)
{this._sessionId=sessionId;for(var i=0;i<events.length;++i)
this._addTraceEvent(events[i]);},_addTraceEvent:function(event)
{var eventNames=WebInspector.TimelineTraceEventBindings.RecordType;if(event.name===eventNames.SetLayerTreeId){if(this._sessionId===event.args["sessionId"])
this._layerTreeId=event.args["layerTreeId"];return;}
if(event.phase===WebInspector.TracingModel.Phase.SnapshotObject&&event.name===eventNames.LayerTreeHostImplSnapshot&&parseInt(event.id,0)===this._layerTreeId){this.handleLayerTreeSnapshot(new WebInspector.DeferredTracingLayerTree(this.target(),event.args["snapshot"]["active_tree"]["root_layer"]));return;}
if(event.args["layerTreeId"]!==this._layerTreeId)
return;var timestamp=event.startTime/1000;if(event.name===eventNames.BeginFrame)
this.handleBeginFrame(timestamp);else if(event.name===eventNames.DrawFrame)
this.handleDrawFrame(timestamp);else if(event.name===eventNames.ActivateLayerTree)
this.handleActivateLayerTree();else if(event.name===eventNames.RequestMainThreadFrame)
this.handleRequestMainThreadFrame();else if(event.name===eventNames.CompositeLayers)
this.handleCompositeLayers();},handleBeginFrame:function(startTime)
{if(!this._lastFrame)
this._startBackgroundFrame(startTime);},handleDrawFrame:function(startTime)
{if(!this._lastFrame){this._startBackgroundFrame(startTime);return;}
if(this._mainFrameCommitted||!this._mainFrameRequested)
this._startBackgroundFrame(startTime);this._mainFrameCommitted=false;},handleActivateLayerTree:function()
{if(!this._lastFrame)
return;this._mainFrameRequested=false;this._mainFrameCommitted=true;this._lastFrame._addTimeForCategories(this._aggregatedMainThreadWorkToAttachToBackgroundFrame);this._aggregatedMainThreadWorkToAttachToBackgroundFrame={};},handleRequestMainThreadFrame:function()
{if(!this._lastFrame)
return;this._mainFrameRequested=true;},handleCompositeLayers:function()
{if(!this._hasThreadedCompositing||!this._aggregatedMainThreadWork)
return;this._aggregatedMainThreadWorkToAttachToBackgroundFrame=this._aggregatedMainThreadWork;this._aggregatedMainThreadWork=null;},handleLayerTreeSnapshot:function(layerTree)
{this._lastLayerTree=layerTree;},_addBackgroundRecord:function(record)
{var recordTypes=WebInspector.TimelineModel.RecordType;if(record.type()===recordTypes.BeginFrame)
this.handleBeginFrame(record.startTime());else if(record.type()===recordTypes.DrawFrame)
this.handleDrawFrame(record.startTime());else if(record.type()===recordTypes.RequestMainThreadFrame)
this.handleRequestMainThreadFrame();else if(record.type()===recordTypes.ActivateLayerTree)
this.handleActivateLayerTree();if(this._lastFrame)
this._lastFrame._addTimeFromRecord(record);},_addMainThreadRecord:function(programRecord,record)
{var recordTypes=WebInspector.TimelineModel.RecordType;if(record.type()===recordTypes.UpdateLayerTree&&record.data()["layerTree"])
this.handleLayerTreeSnapshot(new WebInspector.DeferredAgentLayerTree(this.target(),record.data()["layerTree"]));if(!this._hasThreadedCompositing){if(record.type()===recordTypes.BeginFrame)
this._startMainThreadFrame(record.startTime());if(!this._lastFrame)
return;this._lastFrame._addTimeFromRecord(record);if(programRecord.children()[0]===record){this._deriveOtherTime(programRecord,this._lastFrame.timeByCategory);this._lastFrame._updateCpuTime();}
return;}
if(!this._aggregatedMainThreadWork)
return;WebInspector.TimelineUIUtils.aggregateTimeForRecord(this._aggregatedMainThreadWork,record);if(programRecord.children()[0]===record)
this._deriveOtherTime(programRecord,this._aggregatedMainThreadWork);if(record.type()===recordTypes.CompositeLayers)
this.handleCompositeLayers();},_deriveOtherTime:function(programRecord,timeByCategory)
{var accounted=0;for(var i=0;i<programRecord.children().length;++i)
accounted+=programRecord.children()[i].endTime()-programRecord.children()[i].startTime();var otherTime=programRecord.endTime()-programRecord.startTime()-accounted;timeByCategory["other"]=(timeByCategory["other"]||0)+otherTime;},_startBackgroundFrame:function(startTime)
{if(!this._hasThreadedCompositing){this._lastFrame=null;this._hasThreadedCompositing=true;}
if(this._lastFrame)
this._flushFrame(this._lastFrame,startTime);this._lastFrame=new WebInspector.TimelineFrame(startTime,startTime-this._model.minimumRecordTime());},_startMainThreadFrame:function(startTime)
{if(this._lastFrame)
this._flushFrame(this._lastFrame,startTime);this._lastFrame=new WebInspector.TimelineFrame(startTime,startTime-this._model.minimumRecordTime());},_flushFrame:function(frame,endTime)
{frame._setLayerTree(this._lastLayerTree);frame._setEndTime(endTime);this._frames.push(frame);this.dispatchEventToListeners(WebInspector.TimelineFrameModel.Events.FrameAdded,frame);},_findRecordRecursively:function(types,record)
{if(types.indexOf(record.type())>=0)
return record;if(!record.children())
return null;for(var i=0;i<record.children().length;++i){var result=this._findRecordRecursively(types,record.children()[i]);if(result)
return result;}
return null;},__proto__:WebInspector.Object.prototype}
WebInspector.FrameStatistics=function(frames)
{this.frameCount=frames.length;this.minDuration=Infinity;this.maxDuration=0;this.timeByCategory={};this.startOffset=frames[0].startTimeOffset;var lastFrame=frames[this.frameCount-1];this.endOffset=lastFrame.startTimeOffset+lastFrame.duration;var totalDuration=0;var sumOfSquares=0;for(var i=0;i<this.frameCount;++i){var duration=frames[i].duration;totalDuration+=duration;sumOfSquares+=duration*duration;this.minDuration=Math.min(this.minDuration,duration);this.maxDuration=Math.max(this.maxDuration,duration);WebInspector.TimelineUIUtils.aggregateTimeByCategory(this.timeByCategory,frames[i].timeByCategory);}
this.average=totalDuration/this.frameCount;var variance=sumOfSquares/this.frameCount-this.average*this.average;this.stddev=Math.sqrt(variance);}
WebInspector.TimelineFrame=function(startTime,startTimeOffset)
{this.startTime=startTime;this.startTimeOffset=startTimeOffset;this.endTime=this.startTime;this.duration=0;this.timeByCategory={};this.cpuTime=0;this.layerTree=null;}
WebInspector.TimelineFrame.prototype={_setEndTime:function(endTime)
{this.endTime=endTime;this.duration=this.endTime-this.startTime;},_setLayerTree:function(layerTree)
{this.layerTree=layerTree;},_addTimeFromRecord:function(record)
{if(!record.endTime())
return;WebInspector.TimelineUIUtils.aggregateTimeForRecord(this.timeByCategory,record);this._updateCpuTime();},_addTimeForCategories:function(timeByCategory)
{WebInspector.TimelineUIUtils.aggregateTimeByCategory(this.timeByCategory,timeByCategory);this._updateCpuTime();},_updateCpuTime:function()
{this.cpuTime=0;for(var key in this.timeByCategory)
this.cpuTime+=this.timeByCategory[key];}};WebInspector.TimelineEventOverview=function(model)
{WebInspector.TimelineOverviewBase.call(this,model);this.element.id="timeline-overview-events";this._fillStyles={};var categories=WebInspector.TimelineUIUtils.categories();for(var category in categories){this._fillStyles[category]=WebInspector.TimelineUIUtils.createFillStyleForCategory(this._context,0,WebInspector.TimelineEventOverview._stripGradientHeight,categories[category]);categories[category].addEventListener(WebInspector.TimelineCategory.Events.VisibilityChanged,this._onCategoryVisibilityChanged,this);}
this._disabledCategoryFillStyle=WebInspector.TimelineUIUtils.createFillStyle(this._context,0,WebInspector.TimelineEventOverview._stripGradientHeight,"hsl(0, 0%, 85%)","hsl(0, 0%, 67%)","hsl(0, 0%, 56%)");this._disabledCategoryBorderStyle="rgb(143, 143, 143)";}
WebInspector.TimelineEventOverview._numberOfStrips=3;WebInspector.TimelineEventOverview._stripGradientHeight=120;WebInspector.TimelineEventOverview.prototype={dispose:function()
{var categories=WebInspector.TimelineUIUtils.categories();for(var category in categories)
categories[category].removeEventListener(WebInspector.TimelineCategory.Events.VisibilityChanged,this._onCategoryVisibilityChanged,this);},update:function()
{this.resetCanvas();var stripHeight=Math.round(this._canvas.height/WebInspector.TimelineEventOverview._numberOfStrips);var timeOffset=this._model.minimumRecordTime();var timeSpan=this._model.maximumRecordTime()-timeOffset;var scale=this._canvas.width/timeSpan;var lastBarByGroup=[];this._context.fillStyle="rgba(0, 0, 0, 0.05)";for(var i=1;i<WebInspector.TimelineEventOverview._numberOfStrips;i+=2)
this._context.fillRect(0.5,i*stripHeight+0.5,this._canvas.width,stripHeight);function appendRecord(record)
{if(record.type()===WebInspector.TimelineModel.RecordType.BeginFrame)
return;var recordStart=Math.floor((record.startTime()-timeOffset)*scale);var recordEnd=Math.ceil((record.endTime()-timeOffset)*scale);var category=WebInspector.TimelineUIUtils.categoryForRecord(record);if(category.overviewStripGroupIndex<0)
return;var bar=lastBarByGroup[category.overviewStripGroupIndex];if(bar){if(recordEnd<=bar.end)
return;if(bar.category===category&&recordStart<=bar.end){bar.end=recordEnd;return;}
this._renderBar(bar.start,bar.end,stripHeight,bar.category);}
lastBarByGroup[category.overviewStripGroupIndex]={start:recordStart,end:recordEnd,category:category};}
this._model.forAllRecords(appendRecord.bind(this));for(var i=0;i<lastBarByGroup.length;++i){if(lastBarByGroup[i])
this._renderBar(lastBarByGroup[i].start,lastBarByGroup[i].end,stripHeight,lastBarByGroup[i].category);}},_onCategoryVisibilityChanged:function()
{this.update();},_renderBar:function(begin,end,height,category)
{const stripPadding=4*window.devicePixelRatio;const innerStripHeight=height-2*stripPadding;var x=begin;var y=category.overviewStripGroupIndex*height+stripPadding+0.5;var width=Math.max(end-begin,1);this._context.save();this._context.translate(x,y);this._context.beginPath();this._context.scale(1,innerStripHeight/WebInspector.TimelineEventOverview._stripGradientHeight);this._context.fillStyle=category.hidden?this._disabledCategoryFillStyle:this._fillStyles[category.name];this._context.fillRect(0,0,width,WebInspector.TimelineEventOverview._stripGradientHeight);this._context.strokeStyle=category.hidden?this._disabledCategoryBorderStyle:category.borderColor;this._context.moveTo(0,0);this._context.lineTo(width,0);this._context.moveTo(0,WebInspector.TimelineEventOverview._stripGradientHeight);this._context.lineTo(width,WebInspector.TimelineEventOverview._stripGradientHeight);this._context.stroke();this._context.restore();},__proto__:WebInspector.TimelineOverviewBase.prototype};WebInspector.TimelineFrameOverview=function(model,frameModel)
{WebInspector.TimelineOverviewBase.call(this,model);this.element.id="timeline-overview-frames";this._frameModel=frameModel;this.reset();this._outerPadding=4*window.devicePixelRatio;this._maxInnerBarWidth=10*window.devicePixelRatio;this._topPadding=6*window.devicePixelRatio;this._actualPadding=5*window.devicePixelRatio;this._actualOuterBarWidth=this._maxInnerBarWidth+this._actualPadding;this._fillStyles={};var categories=WebInspector.TimelineUIUtils.categories();for(var category in categories)
this._fillStyles[category]=WebInspector.TimelineUIUtils.createFillStyleForCategory(this._context,this._maxInnerBarWidth,0,categories[category]);this._frameTopShadeGradient=this._context.createLinearGradient(0,0,0,this._topPadding);this._frameTopShadeGradient.addColorStop(0,"rgba(255, 255, 255, 0.9)");this._frameTopShadeGradient.addColorStop(1,"rgba(255, 255, 255, 0.2)");}
WebInspector.TimelineFrameOverview.prototype={setOverviewGrid:function(grid)
{this._overviewGrid=grid;this._overviewGrid.element.classList.add("timeline-overview-frames-mode");},dispose:function()
{this._overviewGrid.element.classList.remove("timeline-overview-frames-mode");},reset:function()
{this._recordsPerBar=1;this._barTimes=[];},update:function()
{this.resetCanvas();this._barTimes=[];const minBarWidth=4*window.devicePixelRatio;var frames=this._frameModel.frames();var framesPerBar=Math.max(1,frames.length*minBarWidth/this._canvas.width);var visibleFrames=this._aggregateFrames(frames,framesPerBar);this._context.save();var scale=(this._canvas.height-this._topPadding)/this._computeTargetFrameLength(visibleFrames);this._renderBars(visibleFrames,scale,this._canvas.height);this._context.fillStyle=this._frameTopShadeGradient;this._context.fillRect(0,0,this._canvas.width,this._topPadding);this._drawFPSMarks(scale,this._canvas.height);this._context.restore();},_aggregateFrames:function(frames,framesPerBar)
{var visibleFrames=[];for(var barNumber=0,currentFrame=0;currentFrame<frames.length;++barNumber){var barStartTime=frames[currentFrame].startTime;var longestFrame=null;var longestDuration=0;for(var lastFrame=Math.min(Math.floor((barNumber+1)*framesPerBar),frames.length);currentFrame<lastFrame;++currentFrame){var duration=frames[currentFrame].duration;if(!longestFrame||longestDuration<duration){longestFrame=frames[currentFrame];longestDuration=duration;}}
var barEndTime=frames[currentFrame-1].endTime;if(longestFrame){visibleFrames.push(longestFrame);this._barTimes.push({startTime:barStartTime,endTime:barEndTime});}}
return visibleFrames;},_computeTargetFrameLength:function(frames)
{var durations=[];for(var i=0;i<frames.length;++i){if(frames[i])
durations.push(frames[i].duration);}
var medianFrameLength=durations.qselect(Math.floor(durations.length/2));const targetFPS=20;var result=1000.0/targetFPS;if(result>=medianFrameLength)
return result;var maxFrameLength=Math.max.apply(Math,durations);return Math.min(medianFrameLength*2,maxFrameLength);},_renderBars:function(frames,scale,windowHeight)
{const maxPadding=5*window.devicePixelRatio;this._actualOuterBarWidth=Math.min((this._canvas.width-2*this._outerPadding)/frames.length,this._maxInnerBarWidth+maxPadding);this._actualPadding=Math.min(Math.floor(this._actualOuterBarWidth/3),maxPadding);var barWidth=this._actualOuterBarWidth-this._actualPadding;for(var i=0;i<frames.length;++i){if(frames[i])
this._renderBar(this._barNumberToScreenPosition(i),barWidth,windowHeight,frames[i],scale);}},_barNumberToScreenPosition:function(n)
{return this._outerPadding+this._actualOuterBarWidth*n;},_drawFPSMarks:function(scale,height)
{const fpsMarks=[30,60];this._context.save();this._context.beginPath();this._context.font=(10*window.devicePixelRatio)+"px "+window.getComputedStyle(this.element,null).getPropertyValue("font-family");this._context.textAlign="right";this._context.textBaseline="alphabetic";const labelPadding=4*window.devicePixelRatio;const baselineHeight=3*window.devicePixelRatio;var lineHeight=12*window.devicePixelRatio;var labelTopMargin=0;var labelOffsetY=0;for(var i=0;i<fpsMarks.length;++i){var fps=fpsMarks[i];var y=height-Math.floor(1000.0/fps*scale)-0.5;var label=WebInspector.UIString("%d\u2009fps",fps);var labelWidth=this._context.measureText(label).width+2*labelPadding;var labelX=this._canvas.width;if(!i&&labelTopMargin<y-lineHeight)
labelOffsetY=-lineHeight;var labelY=y+labelOffsetY;if(labelY<labelTopMargin||labelY+lineHeight>height)
break;this._context.moveTo(0,y);this._context.lineTo(this._canvas.width,y);this._context.fillStyle="rgba(255, 255, 255, 0.5)";this._context.fillRect(labelX-labelWidth,labelY,labelWidth,lineHeight);this._context.fillStyle="black";this._context.fillText(label,labelX-labelPadding,labelY+lineHeight-baselineHeight);labelTopMargin=labelY+lineHeight;}
this._context.strokeStyle="rgba(60, 60, 60, 0.4)";this._context.stroke();this._context.restore();},_renderBar:function(left,width,windowHeight,frame,scale)
{var categories=Object.keys(WebInspector.TimelineUIUtils.categories());var x=Math.floor(left)+0.5;width=Math.floor(width);var totalCPUTime=frame.cpuTime;var normalizedScale=scale;if(totalCPUTime>frame.duration)
normalizedScale*=frame.duration/totalCPUTime;for(var i=0,bottomOffset=windowHeight;i<categories.length;++i){var category=categories[i];var duration=frame.timeByCategory[category];if(!duration)
continue;var height=Math.round(duration*normalizedScale);var y=Math.floor(bottomOffset-height)+0.5;this._context.save();this._context.translate(x,0);this._context.scale(width/this._maxInnerBarWidth,1);this._context.fillStyle=this._fillStyles[category];this._context.fillRect(0,y,this._maxInnerBarWidth,Math.floor(height));this._context.strokeStyle=WebInspector.TimelineUIUtils.categories()[category].borderColor;this._context.beginPath();this._context.moveTo(0,y);this._context.lineTo(this._maxInnerBarWidth,y);this._context.stroke();this._context.restore();bottomOffset-=height;}
var y0=Math.floor(windowHeight-frame.duration*scale)+0.5;var y1=windowHeight+0.5;this._context.strokeStyle="rgba(90, 90, 90, 0.3)";this._context.beginPath();this._context.moveTo(x,y1);this._context.lineTo(x,y0);this._context.lineTo(x+width,y0);this._context.lineTo(x+width,y1);this._context.stroke();},windowTimes:function(windowLeft,windowRight)
{if(!this._barTimes.length)
return WebInspector.TimelineOverviewBase.prototype.windowTimes.call(this,windowLeft,windowRight);var windowSpan=this._canvas.width;var leftOffset=windowLeft*windowSpan;var rightOffset=windowRight*windowSpan;var firstBar=Math.floor(Math.max(leftOffset-this._outerPadding+this._actualPadding,0)/this._actualOuterBarWidth);var lastBar=Math.min(Math.floor(Math.max(rightOffset-this._outerPadding,0)/this._actualOuterBarWidth),this._barTimes.length-1);if(firstBar>=this._barTimes.length)
return{startTime:Infinity,endTime:Infinity};const snapTolerancePixels=3;return{startTime:leftOffset>snapTolerancePixels?this._barTimes[firstBar].startTime:this._model.minimumRecordTime(),endTime:(rightOffset+snapTolerancePixels>windowSpan)||(lastBar>=this._barTimes.length)?this._model.maximumRecordTime():this._barTimes[lastBar].endTime}},windowBoundaries:function(startTime,endTime)
{if(this._barTimes.length===0)
return{left:0,right:1};function barStartComparator(time,barTime)
{return time-barTime.startTime;}
function barEndComparator(time,barTime)
{if(time===barTime.endTime)
return 1;return time-barTime.endTime;}
return{left:this._windowBoundaryFromTime(startTime,barEndComparator),right:this._windowBoundaryFromTime(endTime,barStartComparator)}},_windowBoundaryFromTime:function(time,comparator)
{if(time===Infinity)
return 1;var index=this._firstBarAfter(time,comparator);if(!index)
return 0;return(this._barNumberToScreenPosition(index)-this._actualPadding/2)/this._canvas.width;},_firstBarAfter:function(time,comparator)
{return insertionIndexForObjectInListSortedByFunction(time,this._barTimes,comparator);},__proto__:WebInspector.TimelineOverviewBase.prototype};WebInspector.TimelineMemoryOverview=function(model)
{WebInspector.TimelineOverviewBase.call(this,model);this.element.id="timeline-overview-memory";this._heapSizeLabel=this.element.createChild("div","memory-graph-label");}
WebInspector.TimelineMemoryOverview.prototype={resetHeapSizeLabels:function()
{this._heapSizeLabel.textContent="";},update:function()
{this.resetCanvas();var ratio=window.devicePixelRatio;var records=this._model.records();if(!records.length){this.resetHeapSizeLabels();return;}
var lowerOffset=3*ratio;var maxUsedHeapSize=0;var minUsedHeapSize=100000000000;var minTime=this._model.minimumRecordTime();var maxTime=this._model.maximumRecordTime();function calculateMinMaxSizes(record)
{if(record.type()!==WebInspector.TimelineModel.RecordType.UpdateCounters)
return;var counters=record.data();if(!counters.jsHeapSizeUsed)
return;maxUsedHeapSize=Math.max(maxUsedHeapSize,counters.jsHeapSizeUsed);minUsedHeapSize=Math.min(minUsedHeapSize,counters.jsHeapSizeUsed);}
this._model.forAllRecords(calculateMinMaxSizes);minUsedHeapSize=Math.min(minUsedHeapSize,maxUsedHeapSize);var lineWidth=1;var width=this._canvas.width;var height=this._canvas.height-lowerOffset;var xFactor=width/(maxTime-minTime);var yFactor=(height-lineWidth)/Math.max(maxUsedHeapSize-minUsedHeapSize,1);var histogram=new Array(width);function buildHistogram(record)
{if(record.type()!==WebInspector.TimelineModel.RecordType.UpdateCounters)
return;var counters=record.data();if(!counters.jsHeapSizeUsed)
return;var x=Math.round((record.endTime()-minTime)*xFactor);var y=Math.round((counters.jsHeapSizeUsed-minUsedHeapSize)*yFactor);histogram[x]=Math.max(histogram[x]||0,y);}
this._model.forAllRecords(buildHistogram);var ctx=this._context;var heightBeyondView=height+lowerOffset+lineWidth;ctx.translate(0.5,0.5);ctx.beginPath();ctx.moveTo(-lineWidth,heightBeyondView);var y=0;var isFirstPoint=true;var lastX=0;for(var x=0;x<histogram.length;x++){if(typeof histogram[x]==="undefined")
continue;if(isFirstPoint){isFirstPoint=false;y=histogram[x];ctx.lineTo(-lineWidth,height-y);}
var nextY=histogram[x];if(Math.abs(nextY-y)>2&&Math.abs(x-lastX)>1)
ctx.lineTo(x,height-y);y=nextY;ctx.lineTo(x,height-y);lastX=x;}
ctx.lineTo(width+lineWidth,height-y);ctx.lineTo(width+lineWidth,heightBeyondView);ctx.closePath();ctx.fillStyle="hsla(220, 90%, 70%, 0.2)";ctx.fill();ctx.lineWidth=lineWidth;ctx.strokeStyle="hsl(220, 90%, 70%)";ctx.stroke();this._heapSizeLabel.textContent=WebInspector.UIString("%s \u2013 %s",Number.bytesToString(minUsedHeapSize),Number.bytesToString(maxUsedHeapSize));},__proto__:WebInspector.TimelineOverviewBase.prototype};WebInspector.TimelinePowerGraph=function(delegate,model)
{WebInspector.CountersGraph.call(this,WebInspector.UIString("POWER"),delegate,model);this._counter=this.createCounter(WebInspector.UIString("Power"),WebInspector.UIString("Power: %.2f\u2009watts"),"#d00");WebInspector.powerProfiler.addEventListener(WebInspector.PowerProfiler.EventTypes.PowerEventRecorded,this._onRecordAdded,this);}
WebInspector.TimelinePowerGraph.prototype={dispose:function()
{WebInspector.CountersGraph.prototype.dispose.call(this);WebInspector.powerProfiler.removeEventListener(WebInspector.PowerProfiler.EventTypes.PowerEventRecorded,this._onRecordAdded,this);},_onRecordAdded:function(event)
{var record=event.data;if(!this._previousRecord){this._previousRecord=record;return;}
this._counter.appendSample(this._previousRecord.timestamp,record.value);this._previousRecord=record;this.scheduleRefresh();},addRecord:function(record)
{},__proto__:WebInspector.CountersGraph.prototype};WebInspector.TimelinePowerOverviewDataProvider=function()
{this._records=[];this._energies=[];this._times=[];WebInspector.powerProfiler.addEventListener(WebInspector.PowerProfiler.EventTypes.PowerEventRecorded,this._onRecordAdded,this);}
WebInspector.TimelinePowerOverviewDataProvider.prototype={dispose:function()
{WebInspector.powerProfiler.removeEventListener(WebInspector.PowerProfiler.EventTypes.PowerEventRecorded,this._onRecordAdded,this);},records:function()
{return this._records.slice(0,this._records.length-1);},_calculateEnergy:function(minTime,maxTime)
{var times=this._times;var energies=this._energies;var last=times.length-1;if(last<1||minTime>=times[last]||maxTime<=times[0])
return 0;var start=Number.constrain(times.upperBound(minTime)-1,0,last);var end=Number.constrain(times.lowerBound(maxTime),0,last);var startTime=minTime<times[0]?times[0]:minTime;var endTime=maxTime>times[last]?times[last]:maxTime;if(start+1===end)
return(endTime-startTime)/(times[end]-times[start])*(energies[end]-energies[start])/1000;var totalEnergy=0;totalEnergy+=energies[end-1]-energies[start+1];totalEnergy+=(times[start+1]-startTime)/(times[start+1]-times[start])*(energies[start+1]-energies[start]);totalEnergy+=(endTime-times[end-1])/(times[end]-times[end-1])*(energies[end]-energies[end-1]);return totalEnergy/1000;},_onRecordAdded:function(event)
{var record=event.data;var curTime=record.timestamp;var length=this._records.length;var accumulatedEnergy=0;if(length){this._records[length-1].value=record.value;var prevTime=this._records[length-1].timestamp;accumulatedEnergy=this._energies[length-1];accumulatedEnergy+=(curTime-prevTime)*record.value;}
this._energies.push(accumulatedEnergy);this._records.push(record);this._times.push(curTime);},__proto__:WebInspector.Object.prototype}
WebInspector.TimelinePowerOverview=function(model)
{WebInspector.TimelineOverviewBase.call(this,model);this.element.id="timeline-overview-power";this._dataProvider=new WebInspector.TimelinePowerOverviewDataProvider();this._maxPowerLabel=this.element.createChild("div","max memory-graph-label");this._minPowerLabel=this.element.createChild("div","min memory-graph-label");}
WebInspector.TimelinePowerOverview.prototype={dispose:function()
{this._dataProvider.dispose();},timelineStarted:function()
{if(Capabilities.canProfilePower)
WebInspector.powerProfiler.startProfile();},timelineStopped:function()
{if(Capabilities.canProfilePower)
WebInspector.powerProfiler.stopProfile();},_resetPowerLabels:function()
{this._maxPowerLabel.textContent="";this._minPowerLabel.textContent="";},update:function()
{this.resetCanvas();var records=this._dataProvider.records();if(!records.length){this._resetPowerLabels();return;}
const lowerOffset=3;var maxPower=0;var minPower=100000000000;var minTime=this._model.minimumRecordTime();var maxTime=this._model.maximumRecordTime();for(var i=0;i<records.length;i++){var record=records[i];if(record.timestamp<minTime||record.timestamp>maxTime)
continue;maxPower=Math.max(maxPower,record.value);minPower=Math.min(minPower,record.value);}
minPower=Math.min(minPower,maxPower);var width=this._canvas.width;var height=this._canvas.height-lowerOffset;var xFactor=width/(maxTime-minTime);var yFactor=height/Math.max(maxPower-minPower,1);var histogram=new Array(width);for(var i=0;i<records.length-1;i++){var record=records[i];if(record.timestamp<minTime||record.timestamp>maxTime)
continue;var x=Math.round((record.timestamp-minTime)*xFactor);var y=Math.round((record.value-minPower)*yFactor);histogram[x]=Math.max(histogram[x]||0,y);}
var y=0;var isFirstPoint=true;var ctx=this._context;ctx.save();ctx.translate(0.5,0.5);ctx.beginPath();ctx.moveTo(-1,this._canvas.height);for(var x=0;x<histogram.length;x++){if(typeof histogram[x]==="undefined")
continue;if(isFirstPoint){isFirstPoint=false;y=histogram[x];ctx.lineTo(-1,height-y);}
ctx.lineTo(x,height-y);y=histogram[x];ctx.lineTo(x,height-y);}
ctx.lineTo(width,height-y);ctx.lineTo(width,this._canvas.height);ctx.lineTo(-1,this._canvas.height);ctx.closePath();ctx.fillStyle="rgba(255,192,0, 0.8);";ctx.fill();ctx.lineWidth=0.5;ctx.strokeStyle="rgba(20,0,0,0.8)";ctx.stroke();ctx.restore();this._maxPowerLabel.textContent=WebInspector.UIString("%.2f\u2009watts",maxPower);this._minPowerLabel.textContent=WebInspector.UIString("%.2f\u2009watts",minPower);},calculateEnergy:function(minTime,maxTime)
{return this._dataProvider._calculateEnergy(minTime,maxTime);},__proto__:WebInspector.TimelineOverviewBase.prototype};WebInspector.TimelineFlameChartDataProvider=function(model,frameModel)
{WebInspector.FlameChartDataProvider.call(this);this._model=model;this._frameModel=frameModel;this._font="12px "+WebInspector.fontFamily();this._linkifier=new WebInspector.Linkifier();}
WebInspector.TimelineFlameChartDataProvider.prototype={barHeight:function()
{return 20;},textBaseline:function()
{return 6;},textPadding:function()
{return 5;},entryFont:function(entryIndex)
{return this._font;},entryTitle:function(entryIndex)
{var record=this._records[entryIndex];if(record===this._cpuThreadRecord)
return WebInspector.UIString("CPU");else if(record===this._gpuThreadRecord)
return WebInspector.UIString("GPU");var details=WebInspector.TimelineUIUtils.buildDetailsNode(record,this._linkifier,this._model.loadedFromFile());return details?WebInspector.UIString("%s (%s)",record.title(),details.textContent):record.title();},dividerOffsets:function(startTime,endTime)
{return null;},reset:function()
{this._timelineData=null;},timelineData:function()
{if(this._timelineData)
return this._timelineData;this._linkifier.reset();this._timelineData={entryLevels:[],entryTotalTimes:[],entryStartTimes:[]};this._records=[];this._entryThreadDepths={};this._minimumBoundary=Math.max(0,this._model.minimumRecordTime());var cpuThreadRecordPayload={type:WebInspector.TimelineModel.RecordType.Program};this._cpuThreadRecord=new WebInspector.TimelineModel.RecordImpl(this._model,(cpuThreadRecordPayload),null);this._pushRecord(this._cpuThreadRecord,0,this.minimumBoundary(),Math.max(this._model.maximumRecordTime(),this.totalTime()+this.minimumBoundary()));this._gpuThreadRecord=null;var records=this._model.records();for(var i=0;i<records.length;++i){var record=records[i];var thread=record.thread();if(thread==="gpu")
continue;if(!thread){for(var j=0;j<record.children().length;++j)
this._appendRecord(record.children()[j],1);}else{var visible=this._appendRecord(records[i],1);if(visible&&!this._gpuThreadRecord){var gpuThreadRecordPayload={type:WebInspector.TimelineModel.RecordType.Program};this._gpuThreadRecord=new WebInspector.TimelineModel.RecordImpl(this._model,(gpuThreadRecordPayload),null);this._pushRecord(this._gpuThreadRecord,0,this.minimumBoundary(),Math.max(this._model.maximumRecordTime(),this.totalTime()+this.minimumBoundary()));}}}
var cpuStackDepth=Math.max(4,this._entryThreadDepths[undefined]);delete this._entryThreadDepths[undefined];this._maxStackDepth=cpuStackDepth;if(this._gpuThreadRecord){var threadBaselines={};var threadBaseline=cpuStackDepth+2;for(var thread in this._entryThreadDepths){threadBaselines[thread]=threadBaseline;threadBaseline+=this._entryThreadDepths[thread];}
this._maxStackDepth=threadBaseline;for(var i=0;i<this._records.length;++i){var record=this._records[i];var level=this._timelineData.entryLevels[i];if(record===this._cpuThreadRecord)
level=0;else if(record===this._gpuThreadRecord)
level=cpuStackDepth+2;else if(record.thread())
level+=threadBaselines[record.thread()];this._timelineData.entryLevels[i]=level;}}
return this._timelineData;},minimumBoundary:function()
{return this._minimumBoundary;},totalTime:function()
{return Math.max(1000,this._model.maximumRecordTime()-this._model.minimumRecordTime());},maxStackDepth:function()
{return this._maxStackDepth;},_appendRecord:function(record,level)
{var result=false;if(!this._model.isVisible(record)){for(var i=0;i<record.children().length;++i)
result=this._appendRecord(record.children()[i],level)||result;return result;}
this._pushRecord(record,level,record.startTime(),record.endTime());for(var i=0;i<record.children().length;++i)
this._appendRecord(record.children()[i],level+1);return true;},_pushRecord:function(record,level,startTime,endTime)
{var index=this._records.length;this._records.push(record);this._timelineData.entryStartTimes[index]=startTime;this._timelineData.entryLevels[index]=level;this._timelineData.entryTotalTimes[index]=endTime-startTime;this._entryThreadDepths[record.thread()]=Math.max(level,this._entryThreadDepths[record.thread()]||0);return index;},prepareHighlightedEntryInfo:function(entryIndex)
{return null;},canJumpToEntry:function(entryIndex)
{return false;},entryColor:function(entryIndex)
{var record=this._records[entryIndex];if(record===this._cpuThreadRecord||record===this._gpuThreadRecord)
return"#555";if(record.type()===WebInspector.TimelineModel.RecordType.JSFrame)
return WebInspector.TimelineFlameChartDataProvider.jsFrameColorGenerator().colorForID(record.data()["functionName"]);var category=WebInspector.TimelineUIUtils.categoryForRecord(record);return category.fillColorStop1;},decorateEntry:function(entryIndex,context,text,barX,barY,barWidth,barHeight,offsetToPosition)
{if(barWidth<5)
return false;var record=this._records[entryIndex];var timelineData=this._timelineData;var category=WebInspector.TimelineUIUtils.categoryForRecord(record);if(text){context.save();context.fillStyle="white";context.shadowColor="rgba(0, 0, 0, 0.1)";context.shadowOffsetX=1;context.shadowOffsetY=1;context.font=this._font;context.fillText(text,barX+this.textPadding(),barY+barHeight-this.textBaseline());context.restore();}
if(record.children().length){var entryStartTime=timelineData.entryStartTimes[entryIndex];var barSelf=offsetToPosition(entryStartTime+record.selfTime())
context.beginPath();context.fillStyle=category.backgroundColor;context.rect(barSelf,barY,barX+barWidth-barSelf,barHeight);context.fill();if(text){context.save();context.clip();context.fillStyle=category.borderColor;context.shadowColor="rgba(0, 0, 0, 0.1)";context.shadowOffsetX=1;context.shadowOffsetY=1;context.fillText(text,barX+this.textPadding(),barY+barHeight-this.textBaseline());context.restore();}}
if(record.warnings()){context.save();context.rect(barX,barY,barWidth,this.barHeight());context.clip();context.beginPath();context.fillStyle=record.warnings()?"red":"rgba(255, 0, 0, 0.5)";context.moveTo(barX+barWidth-15,barY+1);context.lineTo(barX+barWidth-1,barY+1);context.lineTo(barX+barWidth-1,barY+15);context.fill();context.restore();}
return true;},forceDecoration:function(entryIndex)
{var record=this._records[entryIndex];return!!record.warnings();},highlightTimeRange:function(entryIndex)
{var record=this._records[entryIndex];if(record===this._cpuThreadRecord||record===this._gpuThreadRecord)
return null;return{startTime:record.startTime(),endTime:record.endTime()};},paddingLeft:function()
{return 0;},textColor:function(entryIndex)
{return"white";},createSelection:function(entryIndex)
{var record=this._records[entryIndex];if(record instanceof WebInspector.TimelineModel.RecordImpl){this._lastSelection=new WebInspector.TimelineFlameChart.Selection(WebInspector.TimelineSelection.fromRecord(record),entryIndex);return this._lastSelection.timelineSelection;}
return null;},entryIndexForSelection:function(selection)
{if(!selection||selection.type()!==WebInspector.TimelineSelection.Type.Record)
return-1;var record=(selection.object());if(this._lastSelection&&this._lastSelection.timelineSelection.object()===record)
return this._lastSelection.entryIndex;var entryRecords=this._records;for(var entryIndex=0;entryIndex<entryRecords.length;++entryIndex){if(entryRecords[entryIndex]===record){this._lastSelection=new WebInspector.TimelineFlameChart.Selection(WebInspector.TimelineSelection.fromRecord(record),entryIndex);return entryIndex;}}
return-1;}}
WebInspector.TracingBasedTimelineFlameChartDataProvider=function(model,traceEventBindings,frameModel,target)
{WebInspector.FlameChartDataProvider.call(this);this._model=model;this._traceEventBindings=traceEventBindings;this._frameModel=frameModel;this._target=target;this._font="12px "+WebInspector.fontFamily();this._linkifier=new WebInspector.Linkifier();this._palette=new WebInspector.TraceViewPalette();this._entryIndexToTitle={};}
WebInspector.TracingBasedTimelineFlameChartDataProvider.prototype={barHeight:function()
{return 20;},textBaseline:function()
{return 6;},textPadding:function()
{return 5;},entryFont:function(entryIndex)
{return this._font;},entryTitle:function(entryIndex)
{var event=this._entryEvents[entryIndex];if(event){var name=WebInspector.TimelineUIUtils.styleForTimelineEvent(event.name).title;var details=WebInspector.TimelineUIUtils.buildDetailsNodeForTraceEvent(event,this._linkifier,false,this._traceEventBindings,this._target);return details?WebInspector.UIString("%s (%s)",name,details.textContent):name;}
var title=this._entryIndexToTitle[entryIndex];if(!title){title=WebInspector.UIString("Unexpected entryIndex %d",entryIndex);console.error(title);}
return title;},dividerOffsets:function(startTime,endTime)
{return null;},reset:function()
{this._timelineData=null;this._entryEvents=[];this._entryIndexToTitle={};},timelineData:function()
{if(this._timelineData)
return this._timelineData;this._timelineData={entryLevels:[],entryTotalTimes:[],entryStartTimes:[]};this._currentLevel=0;this._minimumBoundary=this._model.minimumRecordTime()||0;this._timeSpan=Math.max((this._model.maximumRecordTime()||0)-this._minimumBoundary,1000000);this._appendHeaderRecord("CPU");var events=this._traceEventBindings.mainThreadEvents();var maxStackDepth=0;for(var eventIndex=0;eventIndex<events.length;++eventIndex){var event=events[eventIndex];var category=event.category;if(category!=="disabled-by-default-devtools.timeline"&&category!=="devtools")
continue;if(event.duration||event.phase===WebInspector.TracingModel.Phase.Instant){this._appendEvent(event);if(maxStackDepth<event.level)
maxStackDepth=event.level;}}
this._currentLevel+=maxStackDepth+1;this._appendHeaderRecord("GPU");return this._timelineData;},minimumBoundary:function()
{return this._toTimelineTime(this._minimumBoundary);},totalTime:function()
{return this._toTimelineTime(this._timeSpan);},maxStackDepth:function()
{return this._currentLevel;},prepareHighlightedEntryInfo:function(entryIndex)
{return null;},canJumpToEntry:function(entryIndex)
{return false;},entryColor:function(entryIndex)
{var event=this._entryEvents[entryIndex];if(!event)
return"#555";var style=WebInspector.TimelineUIUtils.styleForTimelineEvent(event.name);return style.category.fillColorStop1;},decorateEntry:function(entryIndex,context,text,barX,barY,barWidth,barHeight,offsetToPosition)
{if(barWidth<5)
return false;var timelineData=this._timelineData;if(text){context.save();context.fillStyle="white";context.shadowColor="rgba(0, 0, 0, 0.1)";context.shadowOffsetX=1;context.shadowOffsetY=1;context.font=this._font;context.fillText(text,barX+this.textPadding(),barY+barHeight-this.textBaseline());context.restore();}
var event=this._entryEvents[entryIndex];if(event&&event.warning){context.save();context.rect(barX,barY,barWidth,this.barHeight());context.clip();context.beginPath();context.fillStyle="red";context.moveTo(barX+barWidth-15,barY+1);context.lineTo(barX+barWidth-1,barY+1);context.lineTo(barX+barWidth-1,barY+15);context.fill();context.restore();}
return true;},forceDecoration:function(entryIndex)
{var event=this._entryEvents[entryIndex];if(!event)
return false;return!!event.warning;},highlightTimeRange:function(entryIndex)
{var event=this._entryEvents[entryIndex];if(!event)
return null;return{startTime:this._toTimelineTime(event.startTime),endTime:this._toTimelineTime(event.endTime)}},paddingLeft:function()
{return 0;},textColor:function(entryIndex)
{return"white";},_appendHeaderRecord:function(title)
{var index=this._entryEvents.length;this._entryIndexToTitle[index]=title;this._entryEvents.push(null);this._timelineData.entryLevels[index]=this._currentLevel++;this._timelineData.entryTotalTimes[index]=this._toTimelineTime(this._timeSpan);this._timelineData.entryStartTimes[index]=this._toTimelineTime(this._minimumBoundary);},_appendEvent:function(event)
{var index=this._entryEvents.length;this._entryEvents.push(event);this._timelineData.entryLevels[index]=this._currentLevel+event.level;this._timelineData.entryTotalTimes[index]=this._toTimelineTime(event.duration||1000);this._timelineData.entryStartTimes[index]=this._toTimelineTime(event.startTime);},_toTimelineTime:function(time)
{return time/1000;},createSelection:function(entryIndex)
{var event=this._entryEvents[entryIndex];if(!event)
return null;this._lastSelection=new WebInspector.TimelineFlameChart.Selection(WebInspector.TimelineSelection.fromTraceEvent(event),entryIndex);return this._lastSelection.timelineSelection;},entryIndexForSelection:function(selection)
{if(!selection||selection.type()!==WebInspector.TimelineSelection.Type.TraceEvent)
return-1;var event=(selection.object());if(this._lastSelection&&this._lastSelection.timelineSelection.object()===event)
return this._lastSelection.entryIndex;var entryEvents=this._entryEvents;for(var entryIndex=0;entryIndex<entryEvents.length;++entryIndex){if(entryEvents[entryIndex]===event){this._lastSelection=new WebInspector.TimelineFlameChart.Selection(WebInspector.TimelineSelection.fromTraceEvent(event),entryIndex);return entryIndex;}}
return-1;}}
WebInspector.TimelineFlameChartDataProvider.jsFrameColorGenerator=function()
{if(!WebInspector.TimelineFlameChartDataProvider._jsFrameColorGenerator){var hueSpace={min:30,max:55,count:5};var satSpace={min:70,max:100,count:6};var colorGenerator=new WebInspector.FlameChart.ColorGenerator(hueSpace,satSpace,50);colorGenerator.setColorForID("(idle)","hsl(0, 0%, 60%)");colorGenerator.setColorForID("(program)","hsl(0, 0%, 60%)");colorGenerator.setColorForID("(garbage collector)","hsl(0, 0%, 60%)");WebInspector.TimelineFlameChartDataProvider._jsFrameColorGenerator=colorGenerator;}
return WebInspector.TimelineFlameChartDataProvider._jsFrameColorGenerator;}
WebInspector.TimelineFlameChart=function(delegate,model,tracingModel,traceEventBindings,frameModel)
{WebInspector.VBox.call(this);this.element.classList.add("timeline-flamechart");this.registerRequiredCSS("flameChart.css");this._delegate=delegate;this._model=model;this._dataProvider=tracingModel&&traceEventBindings?new WebInspector.TracingBasedTimelineFlameChartDataProvider(tracingModel,traceEventBindings,frameModel,model.target()):new WebInspector.TimelineFlameChartDataProvider(model,frameModel);this._mainView=new WebInspector.FlameChart(this._dataProvider,this,true);this._mainView.show(this.element);this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted,this._onRecordingStarted,this);this._mainView.addEventListener(WebInspector.FlameChart.Events.EntrySelected,this._onEntrySelected,this);}
WebInspector.TimelineFlameChart.prototype={dispose:function()
{this._model.removeEventListener(WebInspector.TimelineModel.Events.RecordingStarted,this._onRecordingStarted,this);this._mainView.removeEventListener(WebInspector.FlameChart.Events.EntrySelected,this._onEntrySelected,this);},requestWindowTimes:function(windowStartTime,windowEndTime)
{this._delegate.requestWindowTimes(windowStartTime,windowEndTime);},refreshRecords:function(textFilter)
{this._dataProvider.reset();this._mainView._scheduleUpdate();},wasShown:function()
{this._mainView._scheduleUpdate();},view:function()
{return this;},reset:function()
{this._automaticallySizeWindow=true;this._dataProvider.reset();this._mainView.reset();this._mainView.setWindowTimes(0,Infinity);},_onRecordingStarted:function()
{this._automaticallySizeWindow=true;this._mainView.reset();},addRecord:function(record)
{this._dataProvider.reset();if(this._automaticallySizeWindow){var minimumRecordTime=this._model.minimumRecordTime();if(record.startTime()>(minimumRecordTime+1000)){this._automaticallySizeWindow=false;this._delegate.requestWindowTimes(minimumRecordTime,minimumRecordTime+1000);}
this._mainView._scheduleUpdate();}else{if(!this._pendingUpdateTimer)
this._pendingUpdateTimer=window.setTimeout(this._updateOnAddRecord.bind(this),300);}},_updateOnAddRecord:function()
{delete this._pendingUpdateTimer;this._mainView._scheduleUpdate();},setWindowTimes:function(startTime,endTime)
{this._mainView.setWindowTimes(startTime,endTime);this._delegate.select(null);},setSidebarSize:function(width)
{},highlightSearchResult:function(record,regex,selectRecord)
{},setSelection:function(selection)
{var index=this._dataProvider.entryIndexForSelection(selection);this._mainView.setSelectedEntry(index);},_onEntrySelected:function(event)
{var entryIndex=(event.data);var timelineSelection=this._dataProvider.createSelection(entryIndex);if(timelineSelection)
this._delegate.select(timelineSelection);},__proto__:WebInspector.VBox.prototype}
WebInspector.TimelineFlameChart.Selection=function(selection,entryIndex)
{this.timelineSelection=selection;this.entryIndex=entryIndex;}
WebInspector.TimelineFlameChart.SelectionProvider=function(){}
WebInspector.TimelineFlameChart.SelectionProvider.prototype={createSelection:function(entryIndex){},entryIndexForSelection:function(selection){}};WebInspector.TimelineUIUtils=function(){}
WebInspector.TimelineUIUtils.categories=function()
{if(WebInspector.TimelineUIUtils._categories)
return WebInspector.TimelineUIUtils._categories;WebInspector.TimelineUIUtils._categories={loading:new WebInspector.TimelineCategory("loading",WebInspector.UIString("Loading"),0,"hsl(214, 53%, 58%)","hsl(214, 67%, 90%)","hsl(214, 67%, 74%)","hsl(214, 67%, 66%)"),scripting:new WebInspector.TimelineCategory("scripting",WebInspector.UIString("Scripting"),1,"hsl(43, 90%, 45%)","hsl(43, 83%, 90%)","hsl(43, 83%, 72%)","hsl(43, 83%, 64%) "),rendering:new WebInspector.TimelineCategory("rendering",WebInspector.UIString("Rendering"),2,"hsl(256, 50%, 60%)","hsl(256, 67%, 90%)","hsl(256, 67%, 76%)","hsl(256, 67%, 70%)"),painting:new WebInspector.TimelineCategory("painting",WebInspector.UIString("Painting"),2,"hsl(109, 33%, 47%)","hsl(109, 33%, 90%)","hsl(109, 33%, 64%)","hsl(109, 33%, 55%)"),other:new WebInspector.TimelineCategory("other",WebInspector.UIString("Other"),-1,"hsl(0, 0%, 73%)","hsl(0, 0%, 90%)","hsl(0, 0%, 87%)","hsl(0, 0%, 79%)"),idle:new WebInspector.TimelineCategory("idle",WebInspector.UIString("Idle"),-1,"hsl(0, 0%, 87%)","hsl(0, 100%, 100%)","hsl(0, 100%, 100%)","hsl(0, 100%, 100%)")};return WebInspector.TimelineUIUtils._categories;};WebInspector.TimelineUIUtils._initRecordStyles=function()
{if(WebInspector.TimelineUIUtils._recordStylesMap)
return WebInspector.TimelineUIUtils._recordStylesMap;var recordTypes=WebInspector.TimelineModel.RecordType;var categories=WebInspector.TimelineUIUtils.categories();var recordStyles={};recordStyles[recordTypes.Root]={title:"#root",category:categories["loading"]};recordStyles[recordTypes.Program]={title:WebInspector.UIString("Other"),category:categories["other"]};recordStyles[recordTypes.EventDispatch]={title:WebInspector.UIString("Event"),category:categories["scripting"]};recordStyles[recordTypes.BeginFrame]={title:WebInspector.UIString("Frame Start"),category:categories["rendering"]};recordStyles[recordTypes.ScheduleStyleRecalculation]={title:WebInspector.UIString("Schedule Style Recalculation"),category:categories["rendering"]};recordStyles[recordTypes.RecalculateStyles]={title:WebInspector.UIString("Recalculate Style"),category:categories["rendering"]};recordStyles[recordTypes.InvalidateLayout]={title:WebInspector.UIString("Invalidate Layout"),category:categories["rendering"]};recordStyles[recordTypes.Layout]={title:WebInspector.UIString("Layout"),category:categories["rendering"]};recordStyles[recordTypes.UpdateLayerTree]={title:WebInspector.UIString("Update layer tree"),category:categories["rendering"]};recordStyles[recordTypes.PaintSetup]={title:WebInspector.UIString("Paint Setup"),category:categories["painting"]};recordStyles[recordTypes.Paint]={title:WebInspector.UIString("Paint"),category:categories["painting"]};recordStyles[recordTypes.Rasterize]={title:WebInspector.UIString("Paint"),category:categories["painting"]};recordStyles[recordTypes.ScrollLayer]={title:WebInspector.UIString("Scroll"),category:categories["rendering"]};recordStyles[recordTypes.DecodeImage]={title:WebInspector.UIString("Image Decode"),category:categories["painting"]};recordStyles[recordTypes.ResizeImage]={title:WebInspector.UIString("Image Resize"),category:categories["painting"]};recordStyles[recordTypes.CompositeLayers]={title:WebInspector.UIString("Composite Layers"),category:categories["painting"]};recordStyles[recordTypes.ParseHTML]={title:WebInspector.UIString("Parse HTML"),category:categories["loading"]};recordStyles[recordTypes.TimerInstall]={title:WebInspector.UIString("Install Timer"),category:categories["scripting"]};recordStyles[recordTypes.TimerRemove]={title:WebInspector.UIString("Remove Timer"),category:categories["scripting"]};recordStyles[recordTypes.TimerFire]={title:WebInspector.UIString("Timer Fired"),category:categories["scripting"]};recordStyles[recordTypes.XHRReadyStateChange]={title:WebInspector.UIString("XHR Ready State Change"),category:categories["scripting"]};recordStyles[recordTypes.XHRLoad]={title:WebInspector.UIString("XHR Load"),category:categories["scripting"]};recordStyles[recordTypes.EvaluateScript]={title:WebInspector.UIString("Evaluate Script"),category:categories["scripting"]};recordStyles[recordTypes.ResourceSendRequest]={title:WebInspector.UIString("Send Request"),category:categories["loading"]};recordStyles[recordTypes.ResourceReceiveResponse]={title:WebInspector.UIString("Receive Response"),category:categories["loading"]};recordStyles[recordTypes.ResourceFinish]={title:WebInspector.UIString("Finish Loading"),category:categories["loading"]};recordStyles[recordTypes.FunctionCall]={title:WebInspector.UIString("Function Call"),category:categories["scripting"]};recordStyles[recordTypes.ResourceReceivedData]={title:WebInspector.UIString("Receive Data"),category:categories["loading"]};recordStyles[recordTypes.GCEvent]={title:WebInspector.UIString("GC Event"),category:categories["scripting"]};recordStyles[recordTypes.JSFrame]={title:WebInspector.UIString("JS Frame"),category:categories["scripting"]};recordStyles[recordTypes.MarkDOMContent]={title:WebInspector.UIString("DOMContentLoaded event"),category:categories["scripting"]};recordStyles[recordTypes.MarkLoad]={title:WebInspector.UIString("Load event"),category:categories["scripting"]};recordStyles[recordTypes.MarkFirstPaint]={title:WebInspector.UIString("First paint"),category:categories["painting"]};recordStyles[recordTypes.TimeStamp]={title:WebInspector.UIString("Stamp"),category:categories["scripting"]};recordStyles[recordTypes.ConsoleTime]={title:WebInspector.UIString("Console Time"),category:categories["scripting"]};recordStyles[recordTypes.RequestAnimationFrame]={title:WebInspector.UIString("Request Animation Frame"),category:categories["scripting"]};recordStyles[recordTypes.CancelAnimationFrame]={title:WebInspector.UIString("Cancel Animation Frame"),category:categories["scripting"]};recordStyles[recordTypes.FireAnimationFrame]={title:WebInspector.UIString("Animation Frame Fired"),category:categories["scripting"]};recordStyles[recordTypes.WebSocketCreate]={title:WebInspector.UIString("Create WebSocket"),category:categories["scripting"]};recordStyles[recordTypes.WebSocketSendHandshakeRequest]={title:WebInspector.UIString("Send WebSocket Handshake"),category:categories["scripting"]};recordStyles[recordTypes.WebSocketReceiveHandshakeResponse]={title:WebInspector.UIString("Receive WebSocket Handshake"),category:categories["scripting"]};recordStyles[recordTypes.WebSocketDestroy]={title:WebInspector.UIString("Destroy WebSocket"),category:categories["scripting"]};recordStyles[recordTypes.EmbedderCallback]={title:WebInspector.UIString("Embedder Callback"),category:categories["scripting"]};WebInspector.TimelineUIUtils._recordStylesMap=recordStyles;return recordStyles;}
WebInspector.TimelineUIUtils.recordStyle=function(record)
{return WebInspector.TimelineUIUtils.styleForTimelineEvent(record.type());}
WebInspector.TimelineUIUtils.styleForTimelineEvent=function(type)
{var recordStyles=WebInspector.TimelineUIUtils._initRecordStyles();var result=recordStyles[type];if(!result){result={title:WebInspector.UIString("Unknown: %s",type),category:WebInspector.TimelineUIUtils.categories()["other"]};recordStyles[type]=result;}
return result;}
WebInspector.TimelineUIUtils.categoryForRecord=function(record)
{return WebInspector.TimelineUIUtils.recordStyle(record).category;}
WebInspector.TimelineUIUtils.isEventDivider=function(record)
{var recordTypes=WebInspector.TimelineModel.RecordType;if(record.type()===recordTypes.TimeStamp)
return true;if(record.type()===recordTypes.MarkFirstPaint)
return true;if(record.type()===recordTypes.MarkDOMContent||record.type()===recordTypes.MarkLoad)
return record.data()["isMainFrame"];return false;}
WebInspector.TimelineUIUtils.needsPreviewElement=function(recordType)
{if(!recordType)
return false;const recordTypes=WebInspector.TimelineModel.RecordType;switch(recordType){case recordTypes.ResourceSendRequest:case recordTypes.ResourceReceiveResponse:case recordTypes.ResourceReceivedData:case recordTypes.ResourceFinish:return true;default:return false;}}
WebInspector.TimelineUIUtils.createEventDivider=function(recordType,title)
{var eventDivider=document.createElement("div");eventDivider.className="resources-event-divider";var recordTypes=WebInspector.TimelineModel.RecordType;if(recordType===recordTypes.MarkDOMContent)
eventDivider.className+=" resources-blue-divider";else if(recordType===recordTypes.MarkLoad)
eventDivider.className+=" resources-red-divider";else if(recordType===recordTypes.MarkFirstPaint)
eventDivider.className+=" resources-green-divider";else if(recordType===recordTypes.TimeStamp)
eventDivider.className+=" resources-orange-divider";else if(recordType===recordTypes.BeginFrame)
eventDivider.className+=" timeline-frame-divider";if(title)
eventDivider.title=title;return eventDivider;}
WebInspector.TimelineUIUtils.generateMainThreadBarPopupContent=function(model,info)
{var firstTaskIndex=info.firstTaskIndex;var lastTaskIndex=info.lastTaskIndex;var tasks=info.tasks;var messageCount=lastTaskIndex-firstTaskIndex+1;var cpuTime=0;for(var i=firstTaskIndex;i<=lastTaskIndex;++i){var task=tasks[i];cpuTime+=task.endTime-task.startTime;}
var startTime=tasks[firstTaskIndex].startTime;var endTime=tasks[lastTaskIndex].endTime;var duration=endTime-startTime;var contentHelper=new WebInspector.TimelinePopupContentHelper(info.name);var durationText=WebInspector.UIString("%s (at %s)",Number.millisToString(duration,true),Number.millisToString(startTime-model.minimumRecordTime(),true));contentHelper.appendTextRow(WebInspector.UIString("Duration"),durationText);contentHelper.appendTextRow(WebInspector.UIString("CPU time"),Number.millisToString(cpuTime,true));contentHelper.appendTextRow(WebInspector.UIString("Message Count"),messageCount);return contentHelper.contentTable();}
WebInspector.TimelineUIUtils.recordTitle=function(record,model)
{var recordData=record.data();if(record.type()===WebInspector.TimelineModel.RecordType.TimeStamp)
return recordData["message"];if(record.type()===WebInspector.TimelineModel.RecordType.JSFrame)
return recordData["functionName"];if(WebInspector.TimelineUIUtils.isEventDivider(record)){var startTime=Number.millisToString(record.startTime()-model.minimumRecordTime());return WebInspector.UIString("%s at %s",WebInspector.TimelineUIUtils.recordStyle(record).title,startTime,true);}
return WebInspector.TimelineUIUtils.recordStyle(record).title;}
WebInspector.TimelineUIUtils.aggregateTimeByCategory=function(total,addend)
{for(var category in addend)
total[category]=(total[category]||0)+addend[category];}
WebInspector.TimelineUIUtils.aggregateTimeForRecord=function(total,record)
{var childrenTime=0;var children=record.children();for(var i=0;i<children.length;++i){WebInspector.TimelineUIUtils.aggregateTimeForRecord(total,children[i]);childrenTime+=children[i].endTime()-children[i].startTime();}
var categoryName=WebInspector.TimelineUIUtils.recordStyle(record).category.name;var ownTime=record.endTime()-record.startTime()-childrenTime;total[categoryName]=(total[categoryName]||0)+ownTime;}
WebInspector.TimelineUIUtils._generateAggregatedInfo=function(aggregatedStats)
{var cell=document.createElement("span");cell.className="timeline-aggregated-info";for(var index in aggregatedStats){var label=document.createElement("div");label.className="timeline-aggregated-category timeline-"+index;cell.appendChild(label);var text=document.createElement("span");text.textContent=Number.millisToString(aggregatedStats[index],true);cell.appendChild(text);}
return cell;}
WebInspector.TimelineUIUtils.generatePieChart=function(aggregatedStats,selfCategory,selfTime)
{var element=document.createElement("div");element.className="timeline-aggregated-info";var total=0;for(var categoryName in aggregatedStats)
total+=aggregatedStats[categoryName];function formatter(value)
{return Number.millisToString(value,true);}
var pieChart=new WebInspector.PieChart(total,formatter);element.appendChild(pieChart.element);var footerElement=element.createChild("div","timeline-aggregated-info-legend");if(selfCategory&&selfTime){pieChart.addSlice(selfTime,selfCategory.fillColorStop1);var rowElement=footerElement.createChild("div");rowElement.createChild("div","timeline-aggregated-category timeline-"+selfCategory.name);rowElement.createTextChild(WebInspector.UIString("%s %s (Self)",formatter(selfTime),selfCategory.title));var categoryTime=aggregatedStats[selfCategory.name];var value=categoryTime-selfTime;if(value>0){pieChart.addSlice(value,selfCategory.fillColorStop0);rowElement=footerElement.createChild("div");rowElement.createChild("div","timeline-aggregated-category timeline-"+selfCategory.name);rowElement.createTextChild(WebInspector.UIString("%s %s (Children)",formatter(value),selfCategory.title));}}
for(var categoryName in WebInspector.TimelineUIUtils.categories()){var category=WebInspector.TimelineUIUtils.categories()[categoryName];if(category===selfCategory)
continue;var value=aggregatedStats[category.name];if(!value)
continue;pieChart.addSlice(value,category.fillColorStop0);var rowElement=footerElement.createChild("div");rowElement.createChild("div","timeline-aggregated-category timeline-"+category.name);rowElement.createTextChild(WebInspector.UIString("%s %s",formatter(value),category.title));}
return element;}
WebInspector.TimelineUIUtils.generatePopupContentForFrame=function(frameModel,frame)
{var contentHelper=new WebInspector.TimelinePopupContentHelper(WebInspector.UIString("Frame"));var durationInMillis=frame.endTime-frame.startTime;var durationText=WebInspector.UIString("%s (at %s)",Number.millisToString(frame.endTime-frame.startTime,true),Number.millisToString(frame.startTimeOffset,true));contentHelper.appendTextRow(WebInspector.UIString("Duration"),durationText);contentHelper.appendTextRow(WebInspector.UIString("FPS"),Math.floor(1000/durationInMillis));contentHelper.appendTextRow(WebInspector.UIString("CPU time"),Number.millisToString(frame.cpuTime,true));contentHelper.appendElementRow(WebInspector.UIString("Aggregated Time"),WebInspector.TimelineUIUtils._generateAggregatedInfo(frame.timeByCategory));if(WebInspector.experimentsSettings.layersPanel.isEnabled()&&frame.layerTree){contentHelper.appendElementRow(WebInspector.UIString("Layer tree"),WebInspector.Linkifier.linkifyUsingRevealer(frame.layerTree,WebInspector.UIString("show")));}
return contentHelper.contentTable();}
WebInspector.TimelineUIUtils.generatePopupContentForFrameStatistics=function(statistics)
{function formatTimeAndFPS(time)
{return WebInspector.UIString("%s (%.0f FPS)",Number.millisToString(time,true),1/time);}
var contentHelper=new WebInspector.TimelineDetailsContentHelper(null,null,false);contentHelper.appendTextRow(WebInspector.UIString("Minimum Time"),formatTimeAndFPS(statistics.minDuration));contentHelper.appendTextRow(WebInspector.UIString("Average Time"),formatTimeAndFPS(statistics.average));contentHelper.appendTextRow(WebInspector.UIString("Maximum Time"),formatTimeAndFPS(statistics.maxDuration));contentHelper.appendTextRow(WebInspector.UIString("Standard Deviation"),Number.millisToString(statistics.stddev,true));return contentHelper.element;}
WebInspector.TimelineUIUtils.createFillStyle=function(context,width,height,color0,color1,color2)
{var gradient=context.createLinearGradient(0,0,width,height);gradient.addColorStop(0,color0);gradient.addColorStop(0.25,color1);gradient.addColorStop(0.75,color1);gradient.addColorStop(1,color2);return gradient;}
WebInspector.TimelineUIUtils.createFillStyleForCategory=function(context,width,height,category)
{return WebInspector.TimelineUIUtils.createFillStyle(context,width,height,category.fillColorStop0,category.fillColorStop1,category.borderColor);}
WebInspector.TimelineUIUtils.createStyleRuleForCategory=function(category)
{var selector=".timeline-category-"+category.name+" .timeline-graph-bar, "+".panel.timeline .timeline-filters-header .filter-checkbox-filter.filter-checkbox-filter-"+category.name+" .checkbox-filter-checkbox, "+".popover .timeline-"+category.name+", "+".timeline-details-view .timeline-"+category.name+", "+".timeline-category-"+category.name+" .timeline-tree-icon"
return selector+" { background-image: linear-gradient("+
category.fillColorStop0+", "+category.fillColorStop1+" 25%, "+category.fillColorStop1+" 25%, "+category.fillColorStop1+");"+" border-color: "+category.borderColor+"}";}
WebInspector.TimelineUIUtils.generatePopupContent=function(record,model,linkifier,callback,loadedFromFile)
{var imageElement=(record.getUserObject("TimelineUIUtils::preview-element")||null);var relatedNode=null;var recordData=record.data();var barrier=new CallbackBarrier();if(!imageElement&&WebInspector.TimelineUIUtils.needsPreviewElement(record.type()))
WebInspector.DOMPresentationUtils.buildImagePreviewContents(record.target(),recordData["url"],false,barrier.createCallback(saveImage));if(recordData["backendNodeId"])
record.target().domModel.pushNodesByBackendIdsToFrontend([recordData["backendNodeId"]],barrier.createCallback(setRelatedNode));barrier.callWhenDone(callbackWrapper);function saveImage(element)
{imageElement=element||null;record.setUserObject("TimelineUIUtils::preview-element",element);}
function setRelatedNode(nodeIds)
{if(nodeIds)
relatedNode=record.target().domModel.nodeForId(nodeIds[0]);}
function callbackWrapper()
{callback(WebInspector.TimelineUIUtils._generatePopupContentSynchronously(record,model,linkifier,imageElement,relatedNode,loadedFromFile));}}
WebInspector.TimelineUIUtils._generatePopupContentSynchronously=function(record,model,linkifier,imagePreviewElement,relatedNode,loadedFromFile)
{var fragment=document.createDocumentFragment();if(record.children().length)
fragment.appendChild(WebInspector.TimelineUIUtils.generatePieChart(record.aggregatedStats(),record.category(),record.selfTime()));else
fragment.appendChild(WebInspector.TimelineUIUtils.generatePieChart(record.aggregatedStats()));const recordTypes=WebInspector.TimelineModel.RecordType;var callSiteStackTraceLabel;var callStackLabel;var relatedNodeLabel;var contentHelper=new WebInspector.TimelineDetailsContentHelper(record.target(),linkifier,true);contentHelper.appendTextRow(WebInspector.UIString("Self Time"),Number.millisToString(record.selfTime(),true));contentHelper.appendTextRow(WebInspector.UIString("Start Time"),Number.millisToString(record.startTime()-model.minimumRecordTime()));var recordData=record.data();switch(record.type()){case recordTypes.GCEvent:contentHelper.appendTextRow(WebInspector.UIString("Collected"),Number.bytesToString(recordData["usedHeapSizeDelta"]));break;case recordTypes.TimerFire:callSiteStackTraceLabel=WebInspector.UIString("Timer installed");case recordTypes.TimerInstall:case recordTypes.TimerRemove:contentHelper.appendTextRow(WebInspector.UIString("Timer ID"),recordData["timerId"]);if(record.type()===recordTypes.TimerInstall){contentHelper.appendTextRow(WebInspector.UIString("Timeout"),Number.millisToString(recordData["timeout"]));contentHelper.appendTextRow(WebInspector.UIString("Repeats"),!recordData["singleShot"]);}
break;case recordTypes.FireAnimationFrame:callSiteStackTraceLabel=WebInspector.UIString("Animation frame requested");contentHelper.appendTextRow(WebInspector.UIString("Callback ID"),recordData["id"]);break;case recordTypes.FunctionCall:if(recordData["scriptName"])
contentHelper.appendLocationRow(WebInspector.UIString("Location"),recordData["scriptName"],recordData["scriptLine"]);break;case recordTypes.ResourceSendRequest:case recordTypes.ResourceReceiveResponse:case recordTypes.ResourceReceivedData:case recordTypes.ResourceFinish:var url;if(record.type()===recordTypes.ResourceSendRequest)
url=recordData["url"];else if(record.initiator())
url=record.initiator().data()["url"];if(url)
contentHelper.appendElementRow(WebInspector.UIString("Resource"),WebInspector.linkifyResourceAsNode(url));if(imagePreviewElement)
contentHelper.appendElementRow(WebInspector.UIString("Preview"),imagePreviewElement);if(recordData["requestMethod"])
contentHelper.appendTextRow(WebInspector.UIString("Request Method"),recordData["requestMethod"]);if(typeof recordData["statusCode"]==="number")
contentHelper.appendTextRow(WebInspector.UIString("Status Code"),recordData["statusCode"]);if(recordData["mimeType"])
contentHelper.appendTextRow(WebInspector.UIString("MIME Type"),recordData["mimeType"]);if(recordData["encodedDataLength"])
contentHelper.appendTextRow(WebInspector.UIString("Encoded Data Length"),WebInspector.UIString("%d Bytes",recordData["encodedDataLength"]));break;case recordTypes.EvaluateScript:var url=recordData["url"];if(url)
contentHelper.appendLocationRow(WebInspector.UIString("Script"),url,recordData["lineNumber"]);break;case recordTypes.Paint:var clip=recordData["clip"];contentHelper.appendTextRow(WebInspector.UIString("Location"),WebInspector.UIString("(%d, %d)",clip[0],clip[1]));var clipWidth=WebInspector.TimelineUIUtils._quadWidth(clip);var clipHeight=WebInspector.TimelineUIUtils._quadHeight(clip);contentHelper.appendTextRow(WebInspector.UIString("Dimensions"),WebInspector.UIString("%d × %d",clipWidth,clipHeight));case recordTypes.PaintSetup:case recordTypes.Rasterize:case recordTypes.ScrollLayer:relatedNodeLabel=WebInspector.UIString("Layer root");break;case recordTypes.DecodeImage:case recordTypes.ResizeImage:relatedNodeLabel=WebInspector.UIString("Image element");var url=recordData["url"];if(url)
contentHelper.appendElementRow(WebInspector.UIString("Image URL"),WebInspector.linkifyResourceAsNode(url));break;case recordTypes.RecalculateStyles:if(recordData["elementCount"])
contentHelper.appendTextRow(WebInspector.UIString("Elements affected"),recordData["elementCount"]);callStackLabel=WebInspector.UIString("Styles recalculation forced");break;case recordTypes.Layout:if(recordData["dirtyObjects"])
contentHelper.appendTextRow(WebInspector.UIString("Nodes that need layout"),recordData["dirtyObjects"]);if(recordData["totalObjects"])
contentHelper.appendTextRow(WebInspector.UIString("Layout tree size"),recordData["totalObjects"]);if(typeof recordData["partialLayout"]==="boolean"){contentHelper.appendTextRow(WebInspector.UIString("Layout scope"),recordData["partialLayout"]?WebInspector.UIString("Partial"):WebInspector.UIString("Whole document"));}
callSiteStackTraceLabel=WebInspector.UIString("Layout invalidated");callStackLabel=WebInspector.UIString("Layout forced");relatedNodeLabel=WebInspector.UIString("Layout root");break;case recordTypes.ConsoleTime:contentHelper.appendTextRow(WebInspector.UIString("Message"),recordData["message"]);break;case recordTypes.WebSocketCreate:case recordTypes.WebSocketSendHandshakeRequest:case recordTypes.WebSocketReceiveHandshakeResponse:case recordTypes.WebSocketDestroy:var initiatorData=record.initiator()?record.initiator().data():recordData;if(typeof initiatorData["webSocketURL"]!=="undefined")
contentHelper.appendTextRow(WebInspector.UIString("URL"),initiatorData["webSocketURL"]);if(typeof initiatorData["webSocketProtocol"]!=="undefined")
contentHelper.appendTextRow(WebInspector.UIString("WebSocket Protocol"),initiatorData["webSocketProtocol"]);if(typeof recordData["message"]!=="undefined")
contentHelper.appendTextRow(WebInspector.UIString("Message"),recordData["message"]);break;case recordTypes.EmbedderCallback:contentHelper.appendTextRow(WebInspector.UIString("Callback Function"),recordData["callbackName"]);break;default:var detailsNode=WebInspector.TimelineUIUtils.buildDetailsNode(record,linkifier,loadedFromFile);if(detailsNode)
contentHelper.appendElementRow(WebInspector.UIString("Details"),detailsNode);break;}
if(relatedNode)
contentHelper.appendElementRow(relatedNodeLabel||WebInspector.UIString("Related node"),WebInspector.DOMPresentationUtils.linkifyNodeReference(relatedNode));if(recordData["scriptName"]&&record.type()!==recordTypes.FunctionCall)
contentHelper.appendLocationRow(WebInspector.UIString("Function Call"),recordData["scriptName"],recordData["scriptLine"]);var callSiteStackTrace=record.callSiteStackTrace();if(callSiteStackTrace)
contentHelper.appendStackTrace(callSiteStackTraceLabel||WebInspector.UIString("Call Site stack"),callSiteStackTrace);var recordStackTrace=record.stackTrace();if(recordStackTrace)
contentHelper.appendStackTrace(callStackLabel||WebInspector.UIString("Call Stack"),recordStackTrace);if(record.warnings()){var ul=document.createElement("ul");for(var i=0;i<record.warnings().length;++i)
ul.createChild("li").textContent=record.warnings()[i];contentHelper.appendElementRow(WebInspector.UIString("Warning"),ul);}
fragment.appendChild(contentHelper.element);return fragment;}
WebInspector.TimelineUIUtils._quadWidth=function(quad)
{return Math.round(Math.sqrt(Math.pow(quad[0]-quad[2],2)+Math.pow(quad[1]-quad[3],2)));}
WebInspector.TimelineUIUtils.buildTraceEventDetails=function(event,model,linkifier,callback,loadedFromFile,bindings,target)
{var relatedNode=null;var barrier=new CallbackBarrier();if(event.imageURL&&!event.previewElement)
WebInspector.DOMPresentationUtils.buildImagePreviewContents(target,event.imageURL,false,barrier.createCallback(saveImage));if(event.backendNodeId)
target.domModel.pushNodesByBackendIdsToFrontend([event.backendNodeId],barrier.createCallback(setRelatedNode));barrier.callWhenDone(callbackWrapper);function saveImage(element)
{event.previewElement=element||null;}
function setRelatedNode(nodeIds)
{if(nodeIds)
relatedNode=target.domModel.nodeForId(nodeIds[0]);}
function callbackWrapper()
{callback(WebInspector.TimelineUIUtils._buildTraceEventDetailsSynchronously(event,model,linkifier,relatedNode,loadedFromFile,bindings,target));}}
WebInspector.TimelineUIUtils._buildTraceEventDetailsSynchronously=function(event,model,linkifier,relatedNode,loadedFromFile,bindings,target)
{var fragment=document.createDocumentFragment();var stats=WebInspector.TimelineUIUtils._aggregatedStatsForTraceEvent(model,event);var pieChart=stats.hasChildren?WebInspector.TimelineUIUtils.generatePieChart(stats.aggregatedStats,WebInspector.TimelineUIUtils.styleForTimelineEvent(event.name).category,event.selfTime/1000):WebInspector.TimelineUIUtils.generatePieChart(stats.aggregatedStats);fragment.appendChild(pieChart);var recordTypes=WebInspector.TimelineTraceEventBindings.RecordType;var callSiteStackTraceLabel;var callStackLabel;var relatedNodeLabel;var contentHelper=new WebInspector.TimelineDetailsContentHelper(target,linkifier,true);contentHelper.appendTextRow(WebInspector.UIString("Self Time"),Number.millisToString(event.selfTime/1000,true));contentHelper.appendTextRow(WebInspector.UIString("Start Time"),Number.millisToString((event.startTime-model.minimumRecordTime())/1000));var eventData=event.args.data;var initiator=event.initiator;switch(event.name){case recordTypes.GCEvent:var delta=event.args["usedHeapSizeBefore"]-event.args["usedHeapSizeAfter"];contentHelper.appendTextRow(WebInspector.UIString("Collected"),Number.bytesToString(delta));break;case recordTypes.TimerFire:callSiteStackTraceLabel=WebInspector.UIString("Timer installed");case recordTypes.TimerInstall:case recordTypes.TimerRemove:contentHelper.appendTextRow(WebInspector.UIString("Timer ID"),eventData["timerId"]);if(event.name===recordTypes.TimerInstall){contentHelper.appendTextRow(WebInspector.UIString("Timeout"),Number.millisToString(eventData["timeout"]));contentHelper.appendTextRow(WebInspector.UIString("Repeats"),!eventData["singleShot"]);}
break;case recordTypes.FireAnimationFrame:callSiteStackTraceLabel=WebInspector.UIString("Animation frame requested");contentHelper.appendTextRow(WebInspector.UIString("Callback ID"),eventData["id"]);break;case recordTypes.FunctionCall:if(eventData["scriptName"])
contentHelper.appendLocationRow(WebInspector.UIString("Location"),eventData["scriptName"],eventData["scriptLine"]);break;case recordTypes.ResourceSendRequest:case recordTypes.ResourceReceiveResponse:case recordTypes.ResourceReceivedData:case recordTypes.ResourceFinish:var url=(event.name===recordTypes.ResourceSendRequest)?eventData["url"]:initiator.args.data["url"];if(url)
contentHelper.appendElementRow(WebInspector.UIString("Resource"),WebInspector.linkifyResourceAsNode(url));if(event.previewElement)
contentHelper.appendElementRow(WebInspector.UIString("Preview"),event.previewElement);if(eventData["requestMethod"])
contentHelper.appendTextRow(WebInspector.UIString("Request Method"),eventData["requestMethod"]);if(typeof eventData["statusCode"]==="number")
contentHelper.appendTextRow(WebInspector.UIString("Status Code"),eventData["statusCode"]);if(eventData["mimeType"])
contentHelper.appendTextRow(WebInspector.UIString("MIME Type"),eventData["mimeType"]);if(eventData["encodedDataLength"])
contentHelper.appendTextRow(WebInspector.UIString("Encoded Data Length"),WebInspector.UIString("%d Bytes",eventData["encodedDataLength"]));break;case recordTypes.EvaluateScript:var url=eventData["url"];if(url)
contentHelper.appendLocationRow(WebInspector.UIString("Script"),url,eventData["lineNumber"]);break;case recordTypes.Paint:var clip=eventData["clip"];contentHelper.appendTextRow(WebInspector.UIString("Location"),WebInspector.UIString("(%d, %d)",clip[0],clip[1]));var clipWidth=WebInspector.TimelineUIUtils._quadWidth(clip);var clipHeight=WebInspector.TimelineUIUtils._quadHeight(clip);contentHelper.appendTextRow(WebInspector.UIString("Dimensions"),WebInspector.UIString("%d × %d",clipWidth,clipHeight));case recordTypes.PaintSetup:case recordTypes.Rasterize:case recordTypes.ScrollLayer:relatedNodeLabel=WebInspector.UIString("Layer root");break;case recordTypes.PaintImage:case recordTypes.DecodeLazyPixelRef:case recordTypes.DecodeImage:case recordTypes.ResizeImage:case recordTypes.DrawLazyPixelRef:relatedNodeLabel=WebInspector.UIString("Image element");if(event.imageURL)
contentHelper.appendElementRow(WebInspector.UIString("Image URL"),WebInspector.linkifyResourceAsNode(event.imageURL));if(event.previewElement)
contentHelper.appendElementRow(WebInspector.UIString("Preview"),event.previewElement);break;case recordTypes.RecalculateStyles:contentHelper.appendTextRow(WebInspector.UIString("Elements affected"),event.args["elementCount"]);callStackLabel=WebInspector.UIString("Styles recalculation forced");break;case recordTypes.Layout:var beginData=event.args["beginData"];contentHelper.appendTextRow(WebInspector.UIString("Nodes that need layout"),beginData["dirtyObjects"]);contentHelper.appendTextRow(WebInspector.UIString("Layout tree size"),beginData["totalObjects"]);contentHelper.appendTextRow(WebInspector.UIString("Layout scope"),beginData["partialLayout"]?WebInspector.UIString("Partial"):WebInspector.UIString("Whole document"));callSiteStackTraceLabel=WebInspector.UIString("Layout invalidated");callStackLabel=WebInspector.UIString("Layout forced");relatedNodeLabel=WebInspector.UIString("Layout root");break;case recordTypes.ConsoleTime:contentHelper.appendTextRow(WebInspector.UIString("Message"),eventData["message"]);break;case recordTypes.WebSocketCreate:case recordTypes.WebSocketSendHandshakeRequest:case recordTypes.WebSocketReceiveHandshakeResponse:case recordTypes.WebSocketDestroy:var initiatorData=initiator?initiator.args.data:eventData;if(typeof initiatorData["webSocketURL"]!=="undefined")
contentHelper.appendTextRow(WebInspector.UIString("URL"),initiatorData["webSocketURL"]);if(typeof initiatorData["webSocketProtocol"]!=="undefined")
contentHelper.appendTextRow(WebInspector.UIString("WebSocket Protocol"),initiatorData["webSocketProtocol"]);if(typeof eventData["message"]!=="undefined")
contentHelper.appendTextRow(WebInspector.UIString("Message"),eventData["message"]);break;case recordTypes.EmbedderCallback:contentHelper.appendTextRow(WebInspector.UIString("Callback Function"),eventData["callbackName"]);break;default:var detailsNode=WebInspector.TimelineUIUtils.buildDetailsNodeForTraceEvent(event,linkifier,loadedFromFile,bindings,target);if(detailsNode)
contentHelper.appendElementRow(WebInspector.UIString("Details"),detailsNode);break;}
if(relatedNode)
contentHelper.appendElementRow(relatedNodeLabel||WebInspector.UIString("Related node"),WebInspector.DOMPresentationUtils.linkifyNodeReference(relatedNode));if(eventData&&eventData["scriptName"]&&event.name!==recordTypes.FunctionCall)
contentHelper.appendLocationRow(WebInspector.UIString("Function Call"),eventData["scriptName"],eventData["scriptLine"]);if(initiator){var callSiteStackTrace=initiator.stackTrace;if(callSiteStackTrace)
contentHelper.appendStackTrace(callSiteStackTraceLabel||WebInspector.UIString("Call Site stack"),callSiteStackTrace);}
var eventStackTrace=event.stackTrace;if(eventStackTrace)
contentHelper.appendStackTrace(callStackLabel||WebInspector.UIString("Call Stack"),eventStackTrace);var warning=event.warning;if(warning){var div=document.createElement("div");div.textContent=warning;contentHelper.appendElementRow(WebInspector.UIString("Warning"),div);}
fragment.appendChild(contentHelper.element);return fragment;}
WebInspector.TimelineUIUtils._aggregatedStatsForTraceEvent=function(model,event)
{var events=model.inspectedTargetEvents();function eventComparator(startTime,e)
{return startTime-e.startTime;}
var index=events.binaryIndexOf(event.startTime,eventComparator);var hasChildren=false;var aggregatedStats={};var endTime=event.endTime;if(endTime){for(var i=index;i<events.length;i++){var nextEvent=events[i];if(nextEvent.startTime>=endTime)
break;if(!nextEvent.selfTime)
continue;if(i>index)
hasChildren=true;var category=WebInspector.TimelineUIUtils.styleForTimelineEvent(nextEvent.name).category.name;aggregatedStats[category]=(aggregatedStats[category]||0)+nextEvent.selfTime/1000;}}
return{aggregatedStats:aggregatedStats,hasChildren:hasChildren};}
WebInspector.TimelineUIUtils._quadHeight=function(quad)
{return Math.round(Math.sqrt(Math.pow(quad[0]-quad[6],2)+Math.pow(quad[1]-quad[7],2)));}
WebInspector.TimelineUIUtils.buildDetailsNode=function(record,linkifier,loadedFromFile)
{var details;var detailsText;var recordData=record.data();switch(record.type()){case WebInspector.TimelineModel.RecordType.GCEvent:detailsText=WebInspector.UIString("%s collected",Number.bytesToString(recordData["usedHeapSizeDelta"]));break;case WebInspector.TimelineModel.RecordType.TimerFire:detailsText=recordData["timerId"];break;case WebInspector.TimelineModel.RecordType.FunctionCall:details=linkifyLocation(recordData["scriptId"],recordData["scriptName"],recordData["scriptLine"],0);break;case WebInspector.TimelineModel.RecordType.FireAnimationFrame:detailsText=recordData["id"];break;case WebInspector.TimelineModel.RecordType.EventDispatch:detailsText=recordData?recordData["type"]:null;break;case WebInspector.TimelineModel.RecordType.Paint:var width=WebInspector.TimelineUIUtils._quadWidth(recordData.clip);var height=WebInspector.TimelineUIUtils._quadHeight(recordData.clip);if(width&&height)
detailsText=WebInspector.UIString("%d\u2009\u00d7\u2009%d",width,height);break;case WebInspector.TimelineModel.RecordType.TimerInstall:case WebInspector.TimelineModel.RecordType.TimerRemove:details=linkifyTopCallFrame();detailsText=recordData["timerId"];break;case WebInspector.TimelineModel.RecordType.RequestAnimationFrame:case WebInspector.TimelineModel.RecordType.CancelAnimationFrame:details=linkifyTopCallFrame();detailsText=recordData["id"];break;case WebInspector.TimelineModel.RecordType.ParseHTML:case WebInspector.TimelineModel.RecordType.RecalculateStyles:details=linkifyTopCallFrame();break;case WebInspector.TimelineModel.RecordType.EvaluateScript:var url=recordData["url"];if(url)
details=linkifyLocation("",url,recordData["lineNumber"],0);break;case WebInspector.TimelineModel.RecordType.XHRReadyStateChange:case WebInspector.TimelineModel.RecordType.XHRLoad:case WebInspector.TimelineModel.RecordType.ResourceSendRequest:case WebInspector.TimelineModel.RecordType.DecodeImage:case WebInspector.TimelineModel.RecordType.ResizeImage:var url=recordData["url"];if(url)
detailsText=WebInspector.displayNameForURL(url);break;case WebInspector.TimelineModel.RecordType.ResourceReceivedData:case WebInspector.TimelineModel.RecordType.ResourceReceiveResponse:case WebInspector.TimelineModel.RecordType.ResourceFinish:var initiator=record.initiator();if(initiator){var url=initiator.data()["url"];if(url)
detailsText=WebInspector.displayNameForURL(url);}
break;case WebInspector.TimelineModel.RecordType.ConsoleTime:detailsText=recordData["message"];break;case WebInspector.TimelineModel.RecordType.EmbedderCallback:detailsText=recordData["callbackName"];break;default:details=linkifyTopCallFrame();break;}
if(!details&&detailsText)
details=document.createTextNode(detailsText);return details;function linkifyLocation(scriptId,url,lineNumber,columnNumber)
{if(!loadedFromFile&&scriptId!=="0"){var location=new WebInspector.DebuggerModel.Location(record.target(),scriptId,lineNumber-1,(columnNumber||1)-1);return linkifier.linkifyRawLocation(location,"timeline-details");}
if(!url)
return null;columnNumber=columnNumber?columnNumber-1:0;return linkifier.linkifyLocation(record.target(),url,lineNumber-1,columnNumber,"timeline-details");}
function linkifyCallFrame(callFrame)
{return linkifyLocation(callFrame.scriptId,callFrame.url,callFrame.lineNumber,callFrame.columnNumber);}
function linkifyTopCallFrame()
{if(record.stackTrace())
return linkifyCallFrame(record.stackTrace()[0]);if(record.callSiteStackTrace())
return linkifyCallFrame(record.callSiteStackTrace()[0]);return null;}}
WebInspector.TimelineUIUtils.buildDetailsNodeForTraceEvent=function(event,linkifier,loadedFromFile,bindings,target)
{var recordType=WebInspector.TimelineTraceEventBindings.RecordType;var details;var detailsText;var eventData=event.args.data;switch(event.name){case recordType.GCEvent:var delta=event.args["usedHeapSizeBefore"]-event.args["usedHeapSizeAfter"];detailsText=WebInspector.UIString("%s collected",Number.bytesToString(delta));break;case recordType.TimerFire:detailsText=eventData["timerId"];break;case recordType.FunctionCall:details=linkifyLocation(eventData["scriptId"],eventData["scriptName"],eventData["scriptLine"],0);break;case recordType.FireAnimationFrame:detailsText=eventData["id"];break;case recordType.EventDispatch:detailsText=eventData?eventData["type"]:null;break;case recordType.Paint:var width=WebInspector.TimelineUIUtils._quadWidth(eventData.clip);var height=WebInspector.TimelineUIUtils._quadHeight(eventData.clip);if(width&&height)
detailsText=WebInspector.UIString("%d\u2009\u00d7\u2009%d",width,height);break;case recordType.TimerInstall:case recordType.TimerRemove:details=linkifyTopCallFrame();detailsText=eventData["timerId"];break;case recordType.RequestAnimationFrame:case recordType.CancelAnimationFrame:details=linkifyTopCallFrame();detailsText=eventData["id"];break;case recordType.ParseHTML:case recordType.RecalculateStyles:details=linkifyTopCallFrame();break;case recordType.EvaluateScript:var url=eventData["url"];if(url)
details=linkifyLocation("",url,eventData["lineNumber"],0);break;case recordType.XHRReadyStateChange:case recordType.XHRLoad:case recordType.ResourceSendRequest:case recordType.DecodeImage:case recordType.ResizeImage:var url=eventData["url"];if(url)
detailsText=WebInspector.displayNameForURL(url);break;case recordType.ResourceReceivedData:case recordType.ResourceReceiveResponse:case recordType.ResourceFinish:var initiator=event.initiator;if(initiator){var url=initiator.args.data["url"];if(url)
detailsText=WebInspector.displayNameForURL(url);}
break;case recordType.ConsoleTime:detailsText=eventData["message"];break;case recordType.EmbedderCallback:detailsText=eventData["callbackName"];break;case recordType.PaintImage:case recordType.DecodeImage:case recordType.ResizeImage:case recordType.DecodeLazyPixelRef:var url=event.imageURL;if(url)
detailsText=WebInspector.displayNameForURL(url);break;default:details=linkifyTopCallFrame();break;}
if(!details&&detailsText)
details=document.createTextNode(detailsText);return details;function linkifyLocation(scriptId,url,lineNumber,columnNumber)
{if(!loadedFromFile&&scriptId!=="0"){var location=new WebInspector.DebuggerModel.Location(target,scriptId,lineNumber-1,(columnNumber||1)-1);return linkifier.linkifyRawLocation(location,"timeline-details");}
if(!url)
return null;columnNumber=columnNumber?columnNumber-1:0;return linkifier.linkifyLocation(target,url,lineNumber-1,columnNumber,"timeline-details");}
function linkifyCallFrame(callFrame)
{return linkifyLocation(callFrame.scriptId,callFrame.url,callFrame.lineNumber,callFrame.columnNumber);}
function linkifyTopCallFrame()
{if(!bindings)
return null;var stackTrace=event.stackTrace;if(!stackTrace){var initiator=event.initiator;if(initiator)
stackTrace=initiator.stackTrace;}
if(!stackTrace||!stackTrace.length)
return null;return linkifyCallFrame(stackTrace[0]);}}
WebInspector.TimelineCategory=function(name,title,overviewStripGroupIndex,borderColor,backgroundColor,fillColorStop0,fillColorStop1)
{this.name=name;this.title=title;this.overviewStripGroupIndex=overviewStripGroupIndex;this.borderColor=borderColor;this.backgroundColor=backgroundColor;this.fillColorStop0=fillColorStop0;this.fillColorStop1=fillColorStop1;this.hidden=false;}
WebInspector.TimelineCategory.Events={VisibilityChanged:"VisibilityChanged"};WebInspector.TimelineCategory.prototype={get hidden()
{return this._hidden;},set hidden(hidden)
{this._hidden=hidden;this.dispatchEventToListeners(WebInspector.TimelineCategory.Events.VisibilityChanged,this);},__proto__:WebInspector.Object.prototype}
WebInspector.TimelinePopupContentHelper=function(title)
{this._contentTable=document.createElement("table");var titleCell=this._createCell(WebInspector.UIString("%s - Details",title),"timeline-details-title");titleCell.colSpan=2;var titleRow=document.createElement("tr");titleRow.appendChild(titleCell);this._contentTable.appendChild(titleRow);}
WebInspector.TimelinePopupContentHelper.prototype={contentTable:function()
{return this._contentTable;},_createCell:function(content,styleName)
{var text=document.createElement("label");text.appendChild(document.createTextNode(content));var cell=document.createElement("td");cell.className="timeline-details";if(styleName)
cell.className+=" "+styleName;cell.textContent=content;return cell;},appendTextRow:function(title,content)
{var row=document.createElement("tr");row.appendChild(this._createCell(title,"timeline-details-row-title"));row.appendChild(this._createCell(content,"timeline-details-row-data"));this._contentTable.appendChild(row);},appendElementRow:function(title,content)
{var row=document.createElement("tr");var titleCell=this._createCell(title,"timeline-details-row-title");row.appendChild(titleCell);var cell=document.createElement("td");cell.className="details";if(content instanceof Node)
cell.appendChild(content);else
cell.createTextChild(content||"");row.appendChild(cell);this._contentTable.appendChild(row);}}
WebInspector.TimelineDetailsContentHelper=function(target,linkifier,monospaceValues)
{this._linkifier=linkifier;this._target=target;this.element=document.createElement("div");this.element.className="timeline-details-view-block";this._monospaceValues=monospaceValues;}
WebInspector.TimelineDetailsContentHelper.prototype={appendTextRow:function(title,value)
{var rowElement=this.element.createChild("div","timeline-details-view-row");rowElement.createChild("span","timeline-details-view-row-title").textContent=WebInspector.UIString("%s: ",title);rowElement.createChild("span","timeline-details-view-row-value"+(this._monospaceValues?" monospace":"")).textContent=value;},appendElementRow:function(title,content)
{var rowElement=this.element.createChild("div","timeline-details-view-row");rowElement.createChild("span","timeline-details-view-row-title").textContent=WebInspector.UIString("%s: ",title);var valueElement=rowElement.createChild("span","timeline-details-view-row-details"+(this._monospaceValues?" monospace":""));if(content instanceof Node)
valueElement.appendChild(content);else
valueElement.createTextChild(content||"");},appendLocationRow:function(title,url,line)
{if(!this._linkifier||!this._target)
return;this.appendElementRow(title,this._linkifier.linkifyLocation(this._target,url,line-1)||"");},appendStackTrace:function(title,stackTrace)
{if(!this._linkifier||!this._target)
return;var rowElement=this.element.createChild("div","timeline-details-view-row");rowElement.createChild("span","timeline-details-view-row-title").textContent=WebInspector.UIString("%s: ",title);var stackTraceElement=rowElement.createChild("div","timeline-details-view-row-stack-trace monospace");for(var i=0;i<stackTrace.length;++i){var stackFrame=stackTrace[i];var row=stackTraceElement.createChild("div");row.createTextChild(stackFrame.functionName||WebInspector.UIString("(anonymous function)"));row.createTextChild(" @ ");var urlElement=this._linkifier.linkifyLocation(this._target,stackFrame.url,stackFrame.lineNumber-1);row.appendChild(urlElement);}}};WebInspector.TimelineView=function(delegate,model)
{WebInspector.HBox.call(this);this.element.classList.add("timeline-view");this._delegate=delegate;this._model=model;this._presentationModel=new WebInspector.TimelinePresentationModel(model);this._calculator=new WebInspector.TimelineCalculator(model);this._linkifier=new WebInspector.Linkifier();this._frameStripByFrame=new Map();this._boundariesAreValid=true;this._scrollTop=0;this._recordsView=this._createRecordsView();this._recordsView.addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged,this._sidebarResized,this);this._recordsView.show(this.element);this._headerElement=this.element.createChild("div","fill");this._headerElement.id="timeline-graph-records-header";this._cpuBarsElement=this._headerElement.createChild("div","timeline-utilization-strip");if(WebInspector.experimentsSettings.gpuTimeline.isEnabled())
this._gpuBarsElement=this._headerElement.createChild("div","timeline-utilization-strip gpu");this._popoverHelper=new WebInspector.PopoverHelper(this.element,this._getPopoverAnchor.bind(this),this._showPopover.bind(this));this.element.addEventListener("mousemove",this._mouseMove.bind(this),false);this.element.addEventListener("mouseout",this._mouseOut.bind(this),false);this.element.addEventListener("keydown",this._keyDown.bind(this),false);this._expandOffset=15;}
WebInspector.TimelineView.prototype={setFrameModel:function(frameModel)
{this._frameModel=frameModel;},_createRecordsView:function()
{var recordsView=new WebInspector.SplitView(true,false,"timelinePanelRecorsSplitViewState");this._containerElement=recordsView.element;this._containerElement.tabIndex=0;this._containerElement.id="timeline-container";this._containerElement.addEventListener("scroll",this._onScroll.bind(this),false);recordsView.sidebarElement().createChild("div","timeline-records-title").textContent=WebInspector.UIString("RECORDS");this._sidebarListElement=recordsView.sidebarElement().createChild("div","timeline-records-list");this._gridContainer=new WebInspector.VBoxWithResizeCallback(this._onViewportResize.bind(this));this._gridContainer.element.id="resources-container-content";this._gridContainer.show(recordsView.mainElement());this._timelineGrid=new WebInspector.TimelineGrid();this._gridContainer.element.appendChild(this._timelineGrid.element);this._itemsGraphsElement=this._gridContainer.element.createChild("div");this._itemsGraphsElement.id="timeline-graphs";this._topGapElement=this._itemsGraphsElement.createChild("div","timeline-gap");this._graphRowsElement=this._itemsGraphsElement.createChild("div");this._bottomGapElement=this._itemsGraphsElement.createChild("div","timeline-gap");this._expandElements=this._itemsGraphsElement.createChild("div");this._expandElements.id="orphan-expand-elements";return recordsView;},_rootRecord:function()
{return this._presentationModel.rootRecord();},_updateEventDividers:function()
{this._timelineGrid.removeEventDividers();var clientWidth=this._graphRowsElementWidth;var dividers=[];var eventDividerRecords=this._model.eventDividerRecords();for(var i=0;i<eventDividerRecords.length;++i){var record=eventDividerRecords[i];var positions=this._calculator.computeBarGraphWindowPosition(record);var dividerPosition=Math.round(positions.left);if(dividerPosition<0||dividerPosition>=clientWidth||dividers[dividerPosition])
continue;var divider=WebInspector.TimelineUIUtils.createEventDivider(record.type(),WebInspector.TimelineUIUtils.recordTitle(record,this._model));divider.style.left=dividerPosition+"px";dividers[dividerPosition]=divider;}
this._timelineGrid.addEventDividers(dividers);},_updateFrameBars:function(frames)
{var clientWidth=this._graphRowsElementWidth;if(this._frameContainer){this._frameContainer.removeChildren();}else{const frameContainerBorderWidth=1;this._frameContainer=document.createElement("div");this._frameContainer.classList.add("fill");this._frameContainer.classList.add("timeline-frame-container");this._frameContainer.style.height=WebInspector.TimelinePanel.rowHeight+frameContainerBorderWidth+"px";this._frameContainer.addEventListener("dblclick",this._onFrameDoubleClicked.bind(this),false);this._frameContainer.addEventListener("click",this._onFrameClicked.bind(this),false);}
this._frameStripByFrame.clear();var dividers=[];for(var i=0;i<frames.length;++i){var frame=frames[i];var frameStart=this._calculator.computePosition(frame.startTime);var frameEnd=this._calculator.computePosition(frame.endTime);var frameStrip=document.createElement("div");frameStrip.className="timeline-frame-strip";var actualStart=Math.max(frameStart,0);var width=frameEnd-actualStart;frameStrip.style.left=actualStart+"px";frameStrip.style.width=width+"px";frameStrip._frame=frame;this._frameStripByFrame.put(frame,frameStrip);const minWidthForFrameInfo=60;if(width>minWidthForFrameInfo)
frameStrip.textContent=Number.millisToString(frame.endTime-frame.startTime,true);this._frameContainer.appendChild(frameStrip);if(actualStart>0){var frameMarker=WebInspector.TimelineUIUtils.createEventDivider(WebInspector.TimelineModel.RecordType.BeginFrame);frameMarker.style.left=frameStart+"px";dividers.push(frameMarker);}}
this._timelineGrid.addEventDividers(dividers);this._headerElement.appendChild(this._frameContainer);},_onFrameDoubleClicked:function(event)
{var frameBar=event.target.enclosingNodeOrSelfWithClass("timeline-frame-strip");if(!frameBar)
return;this._delegate.requestWindowTimes(frameBar._frame.startTime,frameBar._frame.endTime);},_onFrameClicked:function(event)
{var frameBar=event.target.enclosingNodeOrSelfWithClass("timeline-frame-strip");if(!frameBar)
return;this._delegate.select(WebInspector.TimelineSelection.fromFrame(frameBar._frame));},addRecord:function(record)
{this._presentationModel.addRecord(record);this._invalidateAndScheduleRefresh(false,false);},setSidebarSize:function(width)
{this._recordsView.setSidebarSize(width);},_sidebarResized:function(event)
{this.dispatchEventToListeners(WebInspector.SplitView.Events.SidebarSizeChanged,event.data);},_onViewportResize:function()
{this._resize(this._recordsView.sidebarSize());},_resize:function(sidebarWidth)
{this._closeRecordDetails();this._graphRowsElementWidth=this._graphRowsElement.offsetWidth;this._headerElement.style.left=sidebarWidth+"px";this._headerElement.style.width=this._itemsGraphsElement.offsetWidth+"px";this._scheduleRefresh(false,true);},_resetView:function()
{this._windowStartTime=-1;this._windowEndTime=-1;this._boundariesAreValid=false;this._adjustScrollPosition(0);this._linkifier.reset();this._closeRecordDetails();this._automaticallySizeWindow=true;this._presentationModel.reset();},view:function()
{return this;},dispose:function()
{},reset:function()
{this._resetView();this._invalidateAndScheduleRefresh(true,true);},elementsToRestoreScrollPositionsFor:function()
{return[this._containerElement];},refreshRecords:function(textFilter)
{this._presentationModel.reset();var records=this._model.records();for(var i=0;i<records.length;++i)
this.addRecord(records[i]);this._automaticallySizeWindow=false;this._presentationModel.setTextFilter(textFilter);this._invalidateAndScheduleRefresh(false,true);},willHide:function()
{this._closeRecordDetails();WebInspector.View.prototype.willHide.call(this);},_onScroll:function(event)
{this._closeRecordDetails();this._scrollTop=this._containerElement.scrollTop;var dividersTop=Math.max(0,this._scrollTop);this._timelineGrid.setScrollAndDividerTop(this._scrollTop,dividersTop);this._scheduleRefresh(true,true);},_invalidateAndScheduleRefresh:function(preserveBoundaries,userGesture)
{this._presentationModel.invalidateFilteredRecords();this._scheduleRefresh(preserveBoundaries,userGesture);},_clearSelection:function()
{this._delegate.select(null);},_selectRecord:function(presentationRecord)
{if(presentationRecord.coalesced()){this._innerSetSelectedRecord(presentationRecord);var aggregatedStats={};var presentationChildren=presentationRecord.presentationChildren();for(var i=0;i<presentationChildren.length;++i)
WebInspector.TimelineUIUtils.aggregateTimeByCategory(aggregatedStats,presentationChildren[i].record().aggregatedStats);var idle=presentationRecord.record().endTime()-presentationRecord.record().startTime();for(var category in aggregatedStats)
idle-=aggregatedStats[category];aggregatedStats["idle"]=idle;var pieChart=WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats);this._delegate.showInDetails(WebInspector.TimelineUIUtils.recordStyle(presentationRecord.record()).title,pieChart);return;}
this._delegate.select(WebInspector.TimelineSelection.fromRecord(presentationRecord.record()));},setSelection:function(selection)
{if(!selection){this._innerSetSelectedRecord(null);this._setSelectedFrame(null);return;}
if(selection.type()===WebInspector.TimelineSelection.Type.Record){var record=(selection.object());this._innerSetSelectedRecord(this._presentationModel.toPresentationRecord(record));this._setSelectedFrame(null);}else if(selection.type()===WebInspector.TimelineSelection.Type.Frame){var frame=(selection.object());this._innerSetSelectedRecord(null);this._setSelectedFrame(frame);}},_innerSetSelectedRecord:function(presentationRecord)
{if(presentationRecord===this._lastSelectedRecord)
return;if(this._lastSelectedRecord){if(this._lastSelectedRecord.listRow())
this._lastSelectedRecord.listRow().renderAsSelected(false);if(this._lastSelectedRecord.graphRow())
this._lastSelectedRecord.graphRow().renderAsSelected(false);}
this._lastSelectedRecord=presentationRecord;if(!presentationRecord)
return;this._innerRevealRecord(presentationRecord);if(presentationRecord.listRow())
presentationRecord.listRow().renderAsSelected(true);if(presentationRecord.graphRow())
presentationRecord.graphRow().renderAsSelected(true);},_setSelectedFrame:function(frame)
{if(this._lastSelectedFrame===frame)
return;var oldStripElement=this._lastSelectedFrame&&this._frameStripByFrame.get(this._lastSelectedFrame);if(oldStripElement)
oldStripElement.classList.remove("selected");var newStripElement=frame&&this._frameStripByFrame.get(frame);if(newStripElement)
newStripElement.classList.add("selected");this._lastSelectedFrame=frame;},setWindowTimes:function(startTime,endTime)
{this._windowStartTime=startTime;this._windowEndTime=endTime;this._presentationModel.setWindowTimes(startTime,endTime);this._automaticallySizeWindow=false;this._invalidateAndScheduleRefresh(false,true);this._clearSelection();},_scheduleRefresh:function(preserveBoundaries,userGesture)
{this._closeRecordDetails();this._boundariesAreValid&=preserveBoundaries;if(!this.isShowing())
return;if(preserveBoundaries||userGesture)
this._refresh();else{if(!this._refreshTimeout)
this._refreshTimeout=setTimeout(this._refresh.bind(this),300);}},_refresh:function()
{if(this._refreshTimeout){clearTimeout(this._refreshTimeout);delete this._refreshTimeout;}
var windowStartTime=this._windowStartTime;var windowEndTime=this._windowEndTime;this._timelinePaddingLeft=this._expandOffset;if(windowStartTime===-1)
windowStartTime=this._model.minimumRecordTime();if(windowEndTime===-1)
windowEndTime=this._model.maximumRecordTime();this._calculator.setWindow(windowStartTime,windowEndTime);this._calculator.setDisplayWindow(this._timelinePaddingLeft,this._graphRowsElementWidth);this._refreshRecords();if(!this._boundariesAreValid){this._updateEventDividers();if(this._frameContainer)
this._frameContainer.remove();if(this._frameModel){var frames=this._frameModel.filteredFrames(windowStartTime,windowEndTime);const maxFramesForFrameBars=30;if(frames.length&&frames.length<maxFramesForFrameBars){this._timelineGrid.removeDividers();this._updateFrameBars(frames);}else{this._timelineGrid.updateDividers(this._calculator);}}else
this._timelineGrid.updateDividers(this._calculator);this._refreshAllUtilizationBars();}
this._boundariesAreValid=true;},_innerRevealRecord:function(recordToReveal)
{var needRefresh=false;for(var parent=recordToReveal.presentationParent();parent!==this._rootRecord();parent=parent.presentationParent()){if(!parent.collapsed())
continue;this._presentationModel.invalidateFilteredRecords();parent.setCollapsed(false);needRefresh=true;}
var recordsInWindow=this._presentationModel.filteredRecords();var index=recordsInWindow.indexOf(recordToReveal);var itemOffset=index*WebInspector.TimelinePanel.rowHeight;var visibleTop=this._scrollTop-WebInspector.TimelinePanel.headerHeight;var visibleBottom=visibleTop+this._containerElementHeight-WebInspector.TimelinePanel.rowHeight;if(itemOffset<visibleTop)
this._containerElement.scrollTop=itemOffset;else if(itemOffset>visibleBottom)
this._containerElement.scrollTop=itemOffset-this._containerElementHeight+WebInspector.TimelinePanel.headerHeight+WebInspector.TimelinePanel.rowHeight;else if(needRefresh)
this._refreshRecords();},_refreshRecords:function()
{this._containerElementHeight=this._containerElement.clientHeight;var recordsInWindow=this._presentationModel.filteredRecords();var visibleTop=this._scrollTop;var visibleBottom=visibleTop+this._containerElementHeight;var rowHeight=WebInspector.TimelinePanel.rowHeight;var headerHeight=WebInspector.TimelinePanel.headerHeight;var startIndex=Math.max(0,Math.min(Math.floor((visibleTop-headerHeight)/rowHeight),recordsInWindow.length-1));var endIndex=Math.min(recordsInWindow.length,Math.ceil(visibleBottom/rowHeight));var lastVisibleLine=Math.max(0,Math.floor((visibleBottom-headerHeight)/rowHeight));if(this._automaticallySizeWindow&&recordsInWindow.length>lastVisibleLine){this._automaticallySizeWindow=false;this._clearSelection();var windowStartTime=startIndex?recordsInWindow[startIndex].record().startTime():this._model.minimumRecordTime();var windowEndTime=recordsInWindow[Math.max(0,lastVisibleLine-1)].record().endTime();this._delegate.requestWindowTimes(windowStartTime,windowEndTime);recordsInWindow=this._presentationModel.filteredRecords();endIndex=Math.min(recordsInWindow.length,lastVisibleLine);}
this._topGapElement.style.height=(startIndex*rowHeight)+"px";this._recordsView.sidebarElement().firstElementChild.style.flexBasis=(startIndex*rowHeight+headerHeight)+"px";this._bottomGapElement.style.height=(recordsInWindow.length-endIndex)*rowHeight+"px";var rowsHeight=headerHeight+recordsInWindow.length*rowHeight;var totalHeight=Math.max(this._containerElementHeight,rowsHeight);this._recordsView.mainElement().style.height=totalHeight+"px";this._recordsView.sidebarElement().style.height=totalHeight+"px";this._recordsView.resizerElement().style.height=totalHeight+"px";var listRowElement=this._sidebarListElement.firstChild;var width=this._graphRowsElementWidth;this._itemsGraphsElement.removeChild(this._graphRowsElement);var graphRowElement=this._graphRowsElement.firstChild;var scheduleRefreshCallback=this._invalidateAndScheduleRefresh.bind(this,true,true);var selectRecordCallback=this._selectRecord.bind(this);this._itemsGraphsElement.removeChild(this._expandElements);this._expandElements.removeChildren();for(var i=0;i<endIndex;++i){var record=recordsInWindow[i];if(i<startIndex){var lastChildIndex=i+record.visibleChildrenCount();if(lastChildIndex>=startIndex&&lastChildIndex<endIndex){var expandElement=new WebInspector.TimelineExpandableElement(this._expandElements);var positions=this._calculator.computeBarGraphWindowPosition(record.record());expandElement._update(record,i,positions.left-this._expandOffset,positions.width);}}else{if(!listRowElement){listRowElement=new WebInspector.TimelineRecordListRow(this._linkifier,selectRecordCallback,scheduleRefreshCallback).element;this._sidebarListElement.appendChild(listRowElement);}
if(!graphRowElement){graphRowElement=new WebInspector.TimelineRecordGraphRow(this._itemsGraphsElement,selectRecordCallback,scheduleRefreshCallback).element;this._graphRowsElement.appendChild(graphRowElement);}
listRowElement.row.update(record,visibleTop,this._model.loadedFromFile());graphRowElement.row.update(record,this._calculator,this._expandOffset,i);if(this._lastSelectedRecord===record){listRowElement.row.renderAsSelected(true);graphRowElement.row.renderAsSelected(true);}
listRowElement=listRowElement.nextSibling;graphRowElement=graphRowElement.nextSibling;}}
while(listRowElement){var nextElement=listRowElement.nextSibling;listRowElement.row.dispose();listRowElement=nextElement;}
while(graphRowElement){var nextElement=graphRowElement.nextSibling;graphRowElement.row.dispose();graphRowElement=nextElement;}
this._itemsGraphsElement.insertBefore(this._graphRowsElement,this._bottomGapElement);this._itemsGraphsElement.appendChild(this._expandElements);this._adjustScrollPosition(recordsInWindow.length*rowHeight+headerHeight);return recordsInWindow.length;},_refreshAllUtilizationBars:function()
{this._refreshUtilizationBars(WebInspector.UIString("CPU"),this._model.mainThreadTasks(),this._cpuBarsElement);if(WebInspector.experimentsSettings.gpuTimeline.isEnabled())
this._refreshUtilizationBars(WebInspector.UIString("GPU"),this._model.gpuThreadTasks(),this._gpuBarsElement);},_refreshUtilizationBars:function(name,tasks,container)
{if(!container)
return;const barOffset=3;const minGap=3;var minWidth=WebInspector.TimelineCalculator._minWidth;var widthAdjustment=minWidth/2;var width=this._graphRowsElementWidth;var boundarySpan=this._windowEndTime-this._windowStartTime;var scale=boundarySpan/(width-minWidth-this._timelinePaddingLeft);var startTime=(this._windowStartTime-this._timelinePaddingLeft*scale);var endTime=startTime+width*scale;function compareEndTime(value,task)
{return value<task.endTime()?-1:1;}
var taskIndex=insertionIndexForObjectInListSortedByFunction(startTime,tasks,compareEndTime);var foreignStyle="gpu-task-foreign";var element=container.firstChild;var lastElement;var lastLeft;var lastRight;for(;taskIndex<tasks.length;++taskIndex){var task=tasks[taskIndex];if(task.startTime()>endTime)
break;var left=Math.max(0,this._calculator.computePosition(task.startTime())+barOffset-widthAdjustment);var right=Math.min(width,this._calculator.computePosition(task.endTime()||0)+barOffset+widthAdjustment);if(lastElement){var gap=Math.floor(left)-Math.ceil(lastRight);if(gap<minGap){if(!task.data["foreign"])
lastElement.classList.remove(foreignStyle);lastRight=right;lastElement._tasksInfo.lastTaskIndex=taskIndex;continue;}
lastElement.style.width=(lastRight-lastLeft)+"px";}
if(!element)
element=container.createChild("div","timeline-graph-bar");element.style.left=left+"px";element._tasksInfo={name:name,tasks:tasks,firstTaskIndex:taskIndex,lastTaskIndex:taskIndex};if(task.data["foreign"])
element.classList.add(foreignStyle);lastLeft=left;lastRight=right;lastElement=element;element=element.nextSibling;}
if(lastElement)
lastElement.style.width=(lastRight-lastLeft)+"px";while(element){var nextElement=element.nextSibling;element._tasksInfo=null;container.removeChild(element);element=nextElement;}},_adjustScrollPosition:function(totalHeight)
{if((this._scrollTop+this._containerElementHeight)>totalHeight+1)
this._containerElement.scrollTop=(totalHeight-this._containerElement.offsetHeight);},_getPopoverAnchor:function(element)
{var anchor=element.enclosingNodeOrSelfWithClass("timeline-graph-bar");if(anchor&&anchor._tasksInfo)
return anchor;return null;},_mouseOut:function()
{this._hideQuadHighlight();},_mouseMove:function(e)
{var rowElement=e.target.enclosingNodeOrSelfWithClass("timeline-tree-item");if(!this._highlightQuad(rowElement))
this._hideQuadHighlight();var taskBarElement=e.target.enclosingNodeOrSelfWithClass("timeline-graph-bar");if(taskBarElement&&taskBarElement._tasksInfo){var offset=taskBarElement.offsetLeft;this._timelineGrid.showCurtains(offset>=0?offset:0,taskBarElement.offsetWidth);}else
this._timelineGrid.hideCurtains();},_keyDown:function(event)
{if(!this._lastSelectedRecord||event.shiftKey||event.metaKey||event.ctrlKey)
return;var record=this._lastSelectedRecord;var recordsInWindow=this._presentationModel.filteredRecords();var index=recordsInWindow.indexOf(record);var recordsInPage=Math.floor(this._containerElementHeight/WebInspector.TimelinePanel.rowHeight);var rowHeight=WebInspector.TimelinePanel.rowHeight;if(index===-1)
index=0;switch(event.keyIdentifier){case"Left":if(record.presentationParent()){if((!record.expandable()||record.collapsed())&&record.presentationParent()!==this._presentationModel.rootRecord()){this._selectRecord(record.presentationParent());}else{record.setCollapsed(true);this._invalidateAndScheduleRefresh(true,true);}}
event.consume(true);break;case"Up":if(--index<0)
break;this._selectRecord(recordsInWindow[index]);event.consume(true);break;case"Right":if(record.expandable()&&record.collapsed()){record.setCollapsed(false);this._invalidateAndScheduleRefresh(true,true);}else{if(++index>=recordsInWindow.length)
break;this._selectRecord(recordsInWindow[index]);}
event.consume(true);break;case"Down":if(++index>=recordsInWindow.length)
break;this._selectRecord(recordsInWindow[index]);event.consume(true);break;case"PageUp":index=Math.max(0,index-recordsInPage);this._scrollTop=Math.max(0,this._scrollTop-recordsInPage*rowHeight);this._containerElement.scrollTop=this._scrollTop;this._selectRecord(recordsInWindow[index]);event.consume(true);break;case"PageDown":index=Math.min(recordsInWindow.length-1,index+recordsInPage);this._scrollTop=Math.min(this._containerElement.scrollHeight-this._containerElementHeight,this._scrollTop+recordsInPage*rowHeight);this._containerElement.scrollTop=this._scrollTop;this._selectRecord(recordsInWindow[index]);event.consume(true);break;case"Home":index=0;this._selectRecord(recordsInWindow[index]);event.consume(true);break;case"End":index=recordsInWindow.length-1;this._selectRecord(recordsInWindow[index]);event.consume(true);break;}},_highlightQuad:function(rowElement)
{if(!rowElement||!rowElement.row)
return false;var record=rowElement.row._record.record();if(this._highlightedQuadRecord===record)
return true;this._highlightedQuadRecord=record;var quad=null;var recordTypes=WebInspector.TimelineModel.RecordType;switch(record.type()){case recordTypes.Layout:quad=record.data().root;break;case recordTypes.Paint:quad=record.data().clip;break;default:return false;}
if(!quad)
return false;record.target().domAgent().highlightQuad(quad,WebInspector.Color.PageHighlight.Content.toProtocolRGBA(),WebInspector.Color.PageHighlight.ContentOutline.toProtocolRGBA());return true;},_hideQuadHighlight:function()
{if(this._highlightedQuadRecord){this._highlightedQuadRecord.target().domAgent().hideHighlight();delete this._highlightedQuadRecord;}},_showPopover:function(anchor,popover)
{if(!anchor._tasksInfo)
return;popover.show(WebInspector.TimelineUIUtils.generateMainThreadBarPopupContent(this._model,anchor._tasksInfo),anchor,null,null,WebInspector.Popover.Orientation.Bottom);},_closeRecordDetails:function()
{this._popoverHelper.hidePopover();},highlightSearchResult:function(record,regex,selectRecord)
{if(this._highlightDomChanges)
WebInspector.revertDomChanges(this._highlightDomChanges);this._highlightDomChanges=[];var presentationRecord=this._presentationModel.toPresentationRecord(record);if(!presentationRecord)
return;if(selectRecord)
this._selectRecord(presentationRecord);for(var element=this._sidebarListElement.firstChild;element;element=element.nextSibling){if(element.row._record===presentationRecord){element.row.highlight(regex,this._highlightDomChanges);break;}}},__proto__:WebInspector.HBox.prototype}
WebInspector.TimelineCalculator=function(model)
{this._model=model;}
WebInspector.TimelineCalculator._minWidth=5;WebInspector.TimelineCalculator.prototype={paddingLeft:function()
{return this._paddingLeft;},computePosition:function(time)
{return(time-this._minimumBoundary)/this.boundarySpan()*this._workingArea+this._paddingLeft;},computeBarGraphPercentages:function(record)
{var start=(record.startTime()-this._minimumBoundary)/this.boundarySpan()*100;var end=(record.startTime()+record.selfTime()-this._minimumBoundary)/this.boundarySpan()*100;var cpuWidth=(record.endTime()-record.startTime())/this.boundarySpan()*100;return{start:start,end:end,cpuWidth:cpuWidth};},computeBarGraphWindowPosition:function(record)
{var percentages=this.computeBarGraphPercentages(record);var widthAdjustment=0;var left=this.computePosition(record.startTime());var width=(percentages.end-percentages.start)/100*this._workingArea;if(width<WebInspector.TimelineCalculator._minWidth){widthAdjustment=WebInspector.TimelineCalculator._minWidth-width;width=WebInspector.TimelineCalculator._minWidth;}
var cpuWidth=percentages.cpuWidth/100*this._workingArea+widthAdjustment;return{left:left,width:width,cpuWidth:cpuWidth};},setWindow:function(minimumBoundary,maximumBoundary)
{this._minimumBoundary=minimumBoundary;this._maximumBoundary=maximumBoundary;},setDisplayWindow:function(paddingLeft,clientWidth)
{this._workingArea=clientWidth-WebInspector.TimelineCalculator._minWidth-paddingLeft;this._paddingLeft=paddingLeft;},formatTime:function(value,precision)
{return Number.preciseMillisToString(value-this.zeroTime(),precision);},maximumBoundary:function()
{return this._maximumBoundary;},minimumBoundary:function()
{return this._minimumBoundary;},zeroTime:function()
{return this._model.minimumRecordTime();},boundarySpan:function()
{return this._maximumBoundary-this._minimumBoundary;}}
WebInspector.TimelineRecordListRow=function(linkifier,selectRecord,scheduleRefresh)
{this.element=document.createElement("div");this.element.row=this;this.element.style.cursor="pointer";this.element.addEventListener("click",this._onClick.bind(this),false);this.element.addEventListener("mouseover",this._onMouseOver.bind(this),false);this.element.addEventListener("mouseout",this._onMouseOut.bind(this),false);this._linkifier=linkifier;this._warningElement=this.element.createChild("div","timeline-tree-item-warning hidden");this._expandArrowElement=this.element.createChild("div","timeline-tree-item-expand-arrow");this._expandArrowElement.addEventListener("click",this._onExpandClick.bind(this),false);var iconElement=this.element.createChild("span","timeline-tree-icon");this._typeElement=this.element.createChild("span","type");this._dataElement=this.element.createChild("span","data dimmed");this._scheduleRefresh=scheduleRefresh;this._selectRecord=selectRecord;}
WebInspector.TimelineRecordListRow.prototype={update:function(presentationRecord,offset,loadedFromFile)
{this._record=presentationRecord;var record=presentationRecord.record();this._offset=offset;this.element.className="timeline-tree-item timeline-category-"+record.category().name;var paddingLeft=5;var step=-3;for(var currentRecord=presentationRecord.presentationParent()?presentationRecord.presentationParent().presentationParent():null;currentRecord;currentRecord=currentRecord.presentationParent())
paddingLeft+=12/(Math.max(1,step++));this.element.style.paddingLeft=paddingLeft+"px";if(record.thread())
this.element.classList.add("background");this._typeElement.textContent=record.title();if(this._dataElement.firstChild)
this._dataElement.removeChildren();this._warningElement.classList.toggle("hidden",!presentationRecord.hasWarnings()&&!presentationRecord.childHasWarnings());this._warningElement.classList.toggle("timeline-tree-item-child-warning",presentationRecord.childHasWarnings()&&!presentationRecord.hasWarnings());if(presentationRecord.coalesced()){this._dataElement.createTextChild(WebInspector.UIString("× %d",presentationRecord.presentationChildren().length));}else{var detailsNode=WebInspector.TimelineUIUtils.buildDetailsNode(record,this._linkifier,loadedFromFile);if(detailsNode){this._dataElement.appendChild(document.createTextNode("("));this._dataElement.appendChild(detailsNode);this._dataElement.appendChild(document.createTextNode(")"));}}
this._expandArrowElement.classList.toggle("parent",presentationRecord.expandable());this._expandArrowElement.classList.toggle("expanded",!!presentationRecord.visibleChildrenCount());this._record.setListRow(this);},highlight:function(regExp,domChanges)
{var matchInfo=this.element.textContent.match(regExp);if(matchInfo)
WebInspector.highlightSearchResult(this.element,matchInfo.index,matchInfo[0].length,domChanges);},dispose:function()
{this.element.remove();},_onExpandClick:function(event)
{this._record.setCollapsed(!this._record.collapsed());this._scheduleRefresh();event.consume(true);},_onClick:function(event)
{this._selectRecord(this._record);},renderAsSelected:function(selected)
{this.element.classList.toggle("selected",selected);},_onMouseOver:function(event)
{this.element.classList.add("hovered");if(this._record.graphRow())
this._record.graphRow().element.classList.add("hovered");},_onMouseOut:function(event)
{this.element.classList.remove("hovered");if(this._record.graphRow())
this._record.graphRow().element.classList.remove("hovered");}}
WebInspector.TimelineRecordGraphRow=function(graphContainer,selectRecord,scheduleRefresh)
{this.element=document.createElement("div");this.element.row=this;this.element.addEventListener("mouseover",this._onMouseOver.bind(this),false);this.element.addEventListener("mouseout",this._onMouseOut.bind(this),false);this.element.addEventListener("click",this._onClick.bind(this),false);this._barAreaElement=document.createElement("div");this._barAreaElement.className="timeline-graph-bar-area";this.element.appendChild(this._barAreaElement);this._barCpuElement=document.createElement("div");this._barCpuElement.className="timeline-graph-bar cpu"
this._barCpuElement.row=this;this._barAreaElement.appendChild(this._barCpuElement);this._barElement=document.createElement("div");this._barElement.className="timeline-graph-bar";this._barElement.row=this;this._barAreaElement.appendChild(this._barElement);this._expandElement=new WebInspector.TimelineExpandableElement(graphContainer);this._selectRecord=selectRecord;this._scheduleRefresh=scheduleRefresh;}
WebInspector.TimelineRecordGraphRow.prototype={update:function(presentationRecord,calculator,expandOffset,index)
{this._record=presentationRecord;var record=presentationRecord.record();this.element.className="timeline-graph-side timeline-category-"+record.category().name;if(record.thread())
this.element.classList.add("background");var barPosition=calculator.computeBarGraphWindowPosition(record);this._barElement.style.left=barPosition.left+"px";this._barElement.style.width=barPosition.width+"px";this._barCpuElement.style.left=barPosition.left+"px";this._barCpuElement.style.width=barPosition.cpuWidth+"px";this._expandElement._update(presentationRecord,index,barPosition.left-expandOffset,barPosition.width);this._record.setGraphRow(this);},_onClick:function(event)
{if(this._expandElement._arrow.containsEventPoint(event))
this._expand();this._selectRecord(this._record);},renderAsSelected:function(selected)
{this.element.classList.toggle("selected",selected);},_expand:function()
{this._record.setCollapsed(!this._record.collapsed());this._scheduleRefresh();},_onMouseOver:function(event)
{this.element.classList.add("hovered");if(this._record.listRow())
this._record.listRow().element.classList.add("hovered");},_onMouseOut:function(event)
{this.element.classList.remove("hovered");if(this._record.listRow())
this._record.listRow().element.classList.remove("hovered");},dispose:function()
{this.element.remove();this._expandElement._dispose();}}
WebInspector.TimelineExpandableElement=function(container)
{this._element=container.createChild("div","timeline-expandable");this._element.createChild("div","timeline-expandable-left");this._arrow=this._element.createChild("div","timeline-expandable-arrow");}
WebInspector.TimelineExpandableElement.prototype={_update:function(record,index,left,width)
{const rowHeight=WebInspector.TimelinePanel.rowHeight;if(record.visibleChildrenCount()||record.expandable()){this._element.style.top=index*rowHeight+"px";this._element.style.left=left+"px";this._element.style.width=Math.max(12,width+25)+"px";if(!record.collapsed()){this._element.style.height=(record.visibleChildrenCount()+1)*rowHeight+"px";this._element.classList.add("timeline-expandable-expanded");this._element.classList.remove("timeline-expandable-collapsed");}else{this._element.style.height=rowHeight+"px";this._element.classList.add("timeline-expandable-collapsed");this._element.classList.remove("timeline-expandable-expanded");}
this._element.classList.remove("hidden");}else
this._element.classList.add("hidden");},_dispose:function()
{this._element.remove();}};WebInspector.TimelineTraceEventBindings=function()
{this._reset();}
WebInspector.TimelineTraceEventBindings.RecordType={Program:"Program",EventDispatch:"EventDispatch",GPUTask:"GPUTask",RequestMainThreadFrame:"RequestMainThreadFrame",BeginFrame:"BeginFrame",BeginMainThreadFrame:"BeginMainThreadFrame",ActivateLayerTree:"ActivateLayerTree",DrawFrame:"DrawFrame",ScheduleStyleRecalculation:"ScheduleStyleRecalculation",RecalculateStyles:"RecalculateStyles",InvalidateLayout:"InvalidateLayout",Layout:"Layout",UpdateLayerTree:"UpdateLayerTree",PaintSetup:"PaintSetup",Paint:"Paint",PaintImage:"PaintImage",Rasterize:"Rasterize",RasterTask:"RasterTask",ScrollLayer:"ScrollLayer",CompositeLayers:"CompositeLayers",ParseHTML:"ParseHTML",TimerInstall:"TimerInstall",TimerRemove:"TimerRemove",TimerFire:"TimerFire",XHRReadyStateChange:"XHRReadyStateChange",XHRLoad:"XHRLoad",EvaluateScript:"EvaluateScript",MarkLoad:"MarkLoad",MarkDOMContent:"MarkDOMContent",MarkFirstPaint:"MarkFirstPaint",TimeStamp:"TimeStamp",ConsoleTime:"ConsoleTime",ResourceSendRequest:"ResourceSendRequest",ResourceReceiveResponse:"ResourceReceiveResponse",ResourceReceivedData:"ResourceReceivedData",ResourceFinish:"ResourceFinish",FunctionCall:"FunctionCall",GCEvent:"GCEvent",JSFrame:"JSFrame",UpdateCounters:"UpdateCounters",RequestAnimationFrame:"RequestAnimationFrame",CancelAnimationFrame:"CancelAnimationFrame",FireAnimationFrame:"FireAnimationFrame",WebSocketCreate:"WebSocketCreate",WebSocketSendHandshakeRequest:"WebSocketSendHandshakeRequest",WebSocketReceiveHandshakeResponse:"WebSocketReceiveHandshakeResponse",WebSocketDestroy:"WebSocketDestroy",EmbedderCallback:"EmbedderCallback",CallStack:"CallStack",SetLayerTreeId:"SetLayerTreeId",TracingStartedInPage:"TracingStartedInPage",DecodeImage:"Decode Image",ResizeImage:"Resize Image",DrawLazyPixelRef:"Draw LazyPixelRef",DecodeLazyPixelRef:"Decode LazyPixelRef",LazyPixelRef:"LazyPixelRef",LayerTreeHostImplSnapshot:"cc::LayerTreeHostImpl"};WebInspector.TimelineTraceEventBindings.prototype={mainThreadEvents:function()
{return this._mainThreadEvents;},_reset:function()
{this._resetProcessingState();this._mainThreadEvents=[];},_resetProcessingState:function()
{this._sendRequestEvents={};this._timerEvents={};this._requestAnimationFrameEvents={};this._layoutInvalidate={};this._lastScheduleStyleRecalculation={};this._webSocketCreateEvents={};this._paintImageEventByPixelRefId={};this._lastRecalculateStylesEvent=null;this._currentScriptEvent=null;this._eventStack=[];},setEvents:function(events)
{this._resetProcessingState();for(var i=0,length=events.length;i<length;i++)
this._processEvent(events[i]);this._resetProcessingState();},_processEvent:function(event)
{var recordTypes=WebInspector.TimelineTraceEventBindings.RecordType;var eventStack=this._eventStack;while(eventStack.length&&eventStack.peekLast().endTime<event.startTime)
eventStack.pop();var duration=event.duration;if(duration){if(eventStack.length){var parent=eventStack.peekLast();parent.selfTime-=duration;}
event.selfTime=duration;eventStack.push(event);}
if(this._currentScriptEvent&&event.startTime>this._currentScriptEvent.endTime)
this._currentScriptEvent=null;switch(event.name){case recordTypes.CallStack:var lastMainThreadEvent=this._mainThreadEvents.peekLast();if(lastMainThreadEvent)
lastMainThreadEvent.stackTrace=event.args.stack;break;case recordTypes.ResourceSendRequest:this._sendRequestEvents[event.args.data["requestId"]]=event;event.imageURL=event.args.data["url"];break;case recordTypes.ResourceReceiveResponse:case recordTypes.ResourceReceivedData:case recordTypes.ResourceFinish:event.initiator=this._sendRequestEvents[event.args.data["requestId"]];if(event.initiator)
event.imageURL=event.initiator.imageURL;break;case recordTypes.TimerInstall:this._timerEvents[event.args.data["timerId"]]=event;break;case recordTypes.TimerFire:event.initiator=this._timerEvents[event.args.data["timerId"]];break;case recordTypes.RequestAnimationFrame:this._requestAnimationFrameEvents[event.args.data["id"]]=event;break;case recordTypes.FireAnimationFrame:event.initiator=this._requestAnimationFrameEvents[event.args.data["id"]];break;case recordTypes.ScheduleStyleRecalculation:this._lastScheduleStyleRecalculation[event.args.frame]=event;break;case recordTypes.RecalculateStyles:event.initiator=this._lastScheduleStyleRecalculation[event.args.frame];this._lastRecalculateStylesEvent=event;break;case recordTypes.InvalidateLayout:var layoutInitator=event;var frameId=event.args.frame;if(!this._layoutInvalidate[frameId]&&this._lastRecalculateStylesEvent&&this._lastRecalculateStylesEvent.endTime>event.startTime)
layoutInitator=this._lastRecalculateStylesEvent.initiator;this._layoutInvalidate[frameId]=layoutInitator;break;case recordTypes.Layout:var frameId=event.args["beginData"]["frame"];event.initiator=this._layoutInvalidate[frameId];event.backendNodeId=event.args["endData"]["rootNode"];this._layoutInvalidate[frameId]=null;if(this._currentScriptEvent)
event.warning=WebInspector.UIString("Forced synchronous layout is a possible performance bottleneck.");break;case recordTypes.WebSocketCreate:this._webSocketCreateEvents[event.args.data["identifier"]]=event;break;case recordTypes.WebSocketSendHandshakeRequest:case recordTypes.WebSocketReceiveHandshakeResponse:case recordTypes.WebSocketDestroy:event.initiator=this._webSocketCreateEvents[event.args.data["identifier"]];break;case recordTypes.EvaluateScript:case recordTypes.FunctionCall:if(!this._currentScriptEvent)
this._currentScriptEvent=event;break;case recordTypes.SetLayerTreeId:this._inspectedTargetLayerTreeId=event.args["layerTreeId"];break;case recordTypes.TracingStartedInPage:this._mainThread=event.thread;break;case recordTypes.Paint:case recordTypes.ScrollLayer:event.backendNodeId=event.args["data"]["nodeId"];break;case recordTypes.PaintImage:event.backendNodeId=event.args["data"]["nodeId"];event.imageURL=event.args["data"]["url"];break;case recordTypes.DecodeImage:case recordTypes.ResizeImage:var paintImageEvent=this._findAncestorEvent(recordTypes.PaintImage);if(!paintImageEvent){var decodeLazyPixelRefEvent=this._findAncestorEvent(recordTypes.DecodeLazyPixelRef);paintImageEvent=decodeLazyPixelRefEvent&&this._paintImageEventByPixelRefId[decodeLazyPixelRefEvent.args["LazyPixelRef"]];}
if(!paintImageEvent)
break;event.backendNodeId=paintImageEvent.backendNodeId;event.imageURL=paintImageEvent.imageURL;break;case recordTypes.DrawLazyPixelRef:var paintImageEvent=this._findAncestorEvent(recordTypes.PaintImage);if(!paintImageEvent)
break;this._paintImageEventByPixelRefId[event.args["LazyPixelRef"]]=paintImageEvent;event.backendNodeId=paintImageEvent.backendNodeId;event.imageURL=paintImageEvent.imageURL;break;}
if(this._mainThread===event.thread)
this._mainThreadEvents.push(event);},_findAncestorEvent:function(name)
{for(var i=this._eventStack.length-1;i>=0;--i){var event=this._eventStack[i];if(event.name===name)
return event;}
return null;}};WebInspector.TimelineTracingView=function(delegate,tracingModel,modelForMinimumBoundary)
{WebInspector.VBox.call(this);this._delegate=delegate;this._tracingModel=tracingModel;this.element.classList.add("timeline-flamechart");this.registerRequiredCSS("flameChart.css");this._dataProvider=new WebInspector.TraceViewFlameChartDataProvider(this._tracingModel,modelForMinimumBoundary);this._mainView=new WebInspector.FlameChart(this._dataProvider,this,true);this._mainView.show(this.element);this._mainView.addEventListener(WebInspector.FlameChart.Events.EntrySelected,this._onEntrySelected,this);}
WebInspector.TimelineTracingView.prototype={requestWindowTimes:function(windowStartTime,windowEndTime)
{this._delegate.requestWindowTimes(windowStartTime,windowEndTime);},wasShown:function()
{this._mainView._scheduleUpdate();},view:function()
{return this;},dispose:function()
{},reset:function()
{this._tracingModel.reset();this._dataProvider.reset();this._mainView.setWindowTimes(0,Infinity);},refreshRecords:function(textFilter)
{this._dataProvider.reset();this._mainView._scheduleUpdate();},addRecord:function(record){},highlightSearchResult:function(record,regex,selectRecord){},setWindowTimes:function(startTime,endTime)
{this._mainView.setWindowTimes(startTime,endTime);},setSidebarSize:function(width){},setSelection:function(selection){},_onEntrySelected:function(event)
{var index=(event.data);var record=this._dataProvider._recordAt(index);if(!record||this._dataProvider._isHeaderRecord(record)){this._delegate.showInDetails("",document.createTextNode(""));return;}
var contentHelper=new WebInspector.TimelineDetailsContentHelper(null,null,false);contentHelper.appendTextRow(WebInspector.UIString("Name"),record.name);contentHelper.appendTextRow(WebInspector.UIString("Category"),record.category);contentHelper.appendTextRow(WebInspector.UIString("Start"),Number.millisToString(this._dataProvider._toTimelineTime(record.startTime-this._tracingModel.minimumRecordTime()),true));contentHelper.appendTextRow(WebInspector.UIString("Duration"),Number.millisToString(this._dataProvider._toTimelineTime(record.duration),true));if(!Object.isEmpty(record.args))
contentHelper.appendElementRow(WebInspector.UIString("Arguments"),this._formatArguments(record.args));function reveal()
{WebInspector.Revealer.reveal(new WebInspector.DeferredTracingLayerTree(this._tracingModel.target(),record.args["snapshot"]["active_tree"]["root_layer"]));}
if(record.name==="cc::LayerTreeHostImpl"){var link=document.createElement("span");link.classList.add("revealable-link");link.textContent="show";link.addEventListener("click",reveal.bind(this),false);contentHelper.appendElementRow(WebInspector.UIString("Layer tree"),link);}else if(record.name==="cc::Picture"){var div=document.createElement("div");div.className="image-preview-container";var img=div.createChild("img");contentHelper.appendElementRow("Preview",div);this._requestThumbnail(img,record.args["snapshot"]["skp64"]);}
this._delegate.showInDetails(WebInspector.UIString("Selected Event"),contentHelper.element);},_formatArguments:function(args)
{var table=document.createElement("table");for(var name in args){var row=table.createChild("tr");row.createChild("td","timeline-details-row-title").textContent=name+":";var valueContainer=row.createChild("td","timeline-details-row-data");var value=args[name];if(typeof value==="object"&&value){var localObject=new WebInspector.LocalJSONObject(value);var propertiesSection=new WebInspector.ObjectPropertiesSection(localObject,localObject.description);valueContainer.appendChild(propertiesSection.element);}else{valueContainer.textContent=String(value);}}
return table;},_requestThumbnail:function(img,encodedPicture)
{var snapshotId;LayerTreeAgent.loadSnapshot(encodedPicture,onSnapshotLoaded);function onSnapshotLoaded(error,id)
{if(error){console.error("LayerTreeAgent.loadSnapshot(): "+error);return;}
snapshotId=id;LayerTreeAgent.replaySnapshot(snapshotId,onSnapshotReplayed);}
function onSnapshotReplayed(error,encodedBitmap)
{LayerTreeAgent.releaseSnapshot(snapshotId);if(error){console.error("LayerTreeAgent.replaySnapshot(): "+error);return;}
img.src=encodedBitmap;}},__proto__:WebInspector.VBox.prototype};WebInspector.TraceViewFlameChartDataProvider=function(model,timelineModelForMinimumBoundary)
{WebInspector.FlameChartDataProvider.call(this);this._model=model;this._timelineModelForMinimumBoundary=timelineModelForMinimumBoundary;this._font="12px "+WebInspector.fontFamily();this._palette=new WebInspector.TraceViewPalette();var dummyEventPayload={cat:"dummy",pid:0,tid:0,ts:0,ph:"dummy",name:"dummy",args:{},dur:0,id:0,s:""}
this._processHeaderRecord=new WebInspector.TracingModel.Event(dummyEventPayload,0,null);this._threadHeaderRecord=new WebInspector.TracingModel.Event(dummyEventPayload,0,null);}
WebInspector.TraceViewFlameChartDataProvider.prototype={barHeight:function()
{return 20;},textBaseline:function()
{return 6;},textPadding:function()
{return 5;},entryFont:function(entryIndex)
{return this._font;},entryTitle:function(entryIndex)
{var record=this._records[entryIndex];if(this._isHeaderRecord(record))
return this._headerTitles[entryIndex]
return record.name;},dividerOffsets:function(startTime,endTime)
{return null;},reset:function()
{this._timelineData=null;this._records=[];},timelineData:function()
{if(this._timelineData)
return this._timelineData;this._timelineData={entryLevels:[],entryTotalTimes:[],entryStartTimes:[]};this._currentLevel=0;this._headerTitles={};this._minimumBoundary=this._timelineModelForMinimumBoundary.minimumRecordTime()*1000;this._timeSpan=Math.max((this._model.maximumRecordTime()||0)-this._minimumBoundary,1000000);var processes=this._model.sortedProcesses();for(var processIndex=0;processIndex<processes.length;++processIndex){var process=processes[processIndex];this._appendHeaderRecord(process.name(),this._processHeaderRecord);var objectNames=process.sortedObjectNames();for(var objectNameIndex=0;objectNameIndex<objectNames.length;++objectNameIndex){this._appendHeaderRecord(WebInspector.UIString("Object %s",objectNames[objectNameIndex]),this._threadHeaderRecord);var objects=process.objectsByName(objectNames[objectNameIndex]);for(var objectIndex=0;objectIndex<objects.length;++objectIndex)
this._appendRecord(objects[objectIndex]);++this._currentLevel;}
var threads=process.sortedThreads();for(var threadIndex=0;threadIndex<threads.length;++threadIndex){this._appendHeaderRecord(threads[threadIndex].name(),this._threadHeaderRecord);var events=threads[threadIndex].events();for(var eventIndex=0;eventIndex<events.length;++eventIndex){var event=events[eventIndex];if(event.duration)
this._appendRecord(event);}
this._currentLevel+=threads[threadIndex].maxStackDepth();}
++this._currentLevel;}
return this._timelineData;},minimumBoundary:function()
{return this._toTimelineTime(this._minimumBoundary);},totalTime:function()
{return this._toTimelineTime(this._timeSpan);},maxStackDepth:function()
{return this._currentLevel;},prepareHighlightedEntryInfo:function(entryIndex)
{return null;},canJumpToEntry:function(entryIndex)
{var record=this._records[entryIndex];return record.phase===WebInspector.TracingModel.Phase.SnapshotObject;},entryColor:function(entryIndex)
{var record=this._records[entryIndex];if(record.phase===WebInspector.TracingModel.Phase.SnapshotObject)
return"rgb(20, 150, 20)";if(record===this._processHeaderRecord)
return"#555";if(record===this._threadHeaderRecord)
return"#777";return this._palette.colorForString(record.name);},decorateEntry:function(entryIndex,context,text,barX,barY,barWidth,barHeight,timeToPosition)
{return false;},forceDecoration:function(entryIndex)
{return false;},highlightTimeRange:function(entryIndex)
{var record=this._records[entryIndex];if(!record||this._isHeaderRecord(record))
return null;return{startTime:this._toTimelineTime(record.startTime),endTime:this._toTimelineTime(record.endTime)}},paddingLeft:function()
{return 0;},textColor:function(entryIndex)
{return"white";},_appendHeaderRecord:function(title,record)
{var index=this._records.length;this._records.push(record);this._timelineData.entryLevels[index]=this._currentLevel++;this._timelineData.entryTotalTimes[index]=this.totalTime();this._timelineData.entryStartTimes[index]=this._toTimelineTime(this._minimumBoundary);this._headerTitles[index]=title;},_appendRecord:function(record)
{var index=this._records.length;this._records.push(record);this._timelineData.entryLevels[index]=this._currentLevel+record.level;this._timelineData.entryTotalTimes[index]=this._toTimelineTime(record.phase===WebInspector.TracingModel.Phase.SnapshotObject?NaN:record.duration||0);this._timelineData.entryStartTimes[index]=this._toTimelineTime(record.startTime);},_toTimelineTime:function(time)
{return time/1000;},_isHeaderRecord:function(record)
{return record===this._threadHeaderRecord||record===this._processHeaderRecord;},_recordAt:function(index)
{return this._records[index];}}
WebInspector.TraceViewPalette=function()
{this._palette=WebInspector.TraceViewPalette._paletteBase.map(WebInspector.TraceViewPalette._rgbToString);}
WebInspector.TraceViewPalette._paletteBase=[[138,113,152],[175,112,133],[127,135,225],[93,81,137],[116,143,119],[178,214,122],[87,109,147],[119,155,95],[114,180,160],[132,85,103],[157,210,150],[148,94,86],[164,108,138],[139,191,150],[110,99,145],[80,129,109],[125,140,149],[93,124,132],[140,85,140],[104,163,162],[132,141,178],[131,105,147],[135,183,98],[152,134,177],[141,188,141],[133,160,210],[126,186,148],[112,198,205],[180,122,195],[203,144,152]];WebInspector.TraceViewPalette._stringHash=function(string)
{var hash=0;for(var i=0;i<string.length;++i)
hash=(hash+37*hash+11*string.charCodeAt(i))%0xFFFFFFFF;return hash;}
WebInspector.TraceViewPalette._rgbToString=function(rgb)
{return"rgb("+rgb.join(",")+")";}
WebInspector.TraceViewPalette.prototype={colorForString:function(string)
{var hash=WebInspector.TraceViewPalette._stringHash(string);return this._palette[hash%this._palette.length];}};;WebInspector.TimelineLayersView=function()
{WebInspector.VBox.call(this);this._layers3DView=new WebInspector.Layers3DView();this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectSelected,this._onObjectSelected,this);this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectHovered,this._onObjectHovered,this);this._layers3DView.show(this.element);}
WebInspector.TimelineLayersView.prototype={showLayerTree:function(deferredLayerTree)
{this._target=deferredLayerTree.target();deferredLayerTree.resolve(onLayersReady.bind(this));function onLayersReady(layerTree)
{this._layers3DView.setLayerTree(layerTree);}},_selectObject:function(activeObject)
{var layer=activeObject&&activeObject.layer;if(this._currentlySelectedLayer===activeObject)
return;this._currentlySelectedLayer=activeObject;var node=layer?layer.nodeForSelfOrAncestor():null;if(node)
node.highlightForTwoSeconds();else
this._target.domModel.hideDOMNodeHighlight();this._layers3DView.selectObject(activeObject);},_hoverObject:function(activeObject)
{var layer=activeObject&&activeObject.layer;if(this._currentlyHoveredLayer===activeObject)
return;this._currentlyHoveredLayer=activeObject;var node=layer?layer.nodeForSelfOrAncestor():null;if(node)
node.highlight();else
this._target.domModel.hideDOMNodeHighlight();this._layers3DView.hoverObject(activeObject);},_onObjectSelected:function(event)
{var activeObject=(event.data);this._selectObject(activeObject);},_onObjectHovered:function(event)
{var activeObject=(event.data);this._hoverObject(activeObject);},__proto__:WebInspector.VBox.prototype};WebInspector.TracingModel=function(target)
{WebInspector.TargetAwareObject.call(this,target);this.reset();this._active=false;InspectorBackend.registerTracingDispatcher(new WebInspector.TracingDispatcher(this));}
WebInspector.TracingModel.Events={"BufferUsage":"BufferUsage"}
WebInspector.TracingModel.EventPayload;WebInspector.TracingModel.Phase={Begin:"B",End:"E",Complete:"X",Instant:"i",AsyncBegin:"S",AsyncStepInto:"T",AsyncStepPast:"p",AsyncEnd:"F",FlowBegin:"s",FlowStep:"t",FlowEnd:"f",Metadata:"M",Counter:"C",Sample:"P",CreateObject:"N",SnapshotObject:"O",DeleteObject:"D"};WebInspector.TracingModel.MetadataEvent={ProcessSortIndex:"process_sort_index",ProcessName:"process_name",ThreadSortIndex:"thread_sort_index",ThreadName:"thread_name"}
WebInspector.TracingModel.DevToolsMetadataEventCategory="disabled-by-default-devtools.timeline";WebInspector.TracingModel.FrameLifecycleEventCategory="cc,devtools";WebInspector.TracingModel.DevToolsMetadataEvent={TracingStartedInPage:"TracingStartedInPage",};WebInspector.TracingModel.prototype={inspectedTargetEvents:function()
{return this._inspectedTargetEvents;},start:function(categoryFilter,options,callback)
{this.reset();var bufferUsageReportingIntervalMs=500;function callbackWrapper(error,sessionId)
{this._sessionId=sessionId;if(callback)
callback(error);}
TracingAgent.start(categoryFilter,options,bufferUsageReportingIntervalMs,callbackWrapper.bind(this));this._active=true;},stop:function(callback)
{if(!this._active){callback();return;}
this._pendingStopCallback=callback;TracingAgent.end();},setSessionIdForTest:function(sessionId)
{this._sessionId=sessionId;},sessionId:function()
{return this._sessionId;},_bufferUsage:function(usage)
{this.dispatchEventToListeners(WebInspector.TracingModel.Events.BufferUsage,usage);},_eventsCollected:function(events)
{for(var i=0;i<events.length;++i)
this._addEvent(events[i]);},_tracingComplete:function()
{this._active=false;function compareStartTime(a,b)
{return a.startTime-b.startTime;}
this._inspectedTargetEvents.sort(compareStartTime);if(!this._pendingStopCallback)
return;this._pendingStopCallback();this._pendingStopCallback=null;},reset:function()
{this._processById={};this._minimumRecordTime=null;this._maximumRecordTime=null;this._sessionId=null;this._inspectedTargetProcessId=null;this._inspectedTargetEvents=[];},_addEvent:function(payload)
{var process=this._processById[payload.pid];if(!process){process=new WebInspector.TracingModel.Process(payload.pid);this._processById[payload.pid]=process;}
var thread=process.threadById(payload.tid);if(payload.ph===WebInspector.TracingModel.Phase.SnapshotObject){var event=new WebInspector.TracingModel.Event(payload,0,thread);process.addObject(event);if(payload.pid===this._inspectedTargetProcessId)
this._inspectedTargetEvents.push(event);return;}
if(payload.ph!==WebInspector.TracingModel.Phase.Metadata){var timestamp=payload.ts;if(timestamp&&(!this._minimumRecordTime||timestamp<this._minimumRecordTime))
this._minimumRecordTime=timestamp;if(!this._maximumRecordTime||timestamp>this._maximumRecordTime)
this._maximumRecordTime=timestamp;if(payload.cat===WebInspector.TracingModel.DevToolsMetadataEventCategory)
this._processDevToolsMetadataEvent(payload);var event=thread.addEvent(payload);if(event&&payload.pid===this._inspectedTargetProcessId)
this._inspectedTargetEvents.push(event);return;}
switch(payload.name){case WebInspector.TracingModel.MetadataEvent.ProcessSortIndex:process._setSortIndex(payload.args["sort_index"]);break;case WebInspector.TracingModel.MetadataEvent.ProcessName:process._setName(payload.args["name"]);break;case WebInspector.TracingModel.MetadataEvent.ThreadSortIndex:thread._setSortIndex(payload.args["sort_index"]);break;case WebInspector.TracingModel.MetadataEvent.ThreadName:thread._setName(payload.args["name"]);break;}},_processDevToolsMetadataEvent:function(payload)
{if(payload.args["sessionId"]!==this._sessionId||payload.name!==WebInspector.TracingModel.DevToolsMetadataEvent.TracingStartedInPage)
return;this._inspectedTargetProcessId=payload.pid;},minimumRecordTime:function()
{return this._minimumRecordTime;},maximumRecordTime:function()
{return this._maximumRecordTime;},sortedProcesses:function()
{return WebInspector.TracingModel.NamedObject._sort(Object.values(this._processById));},__proto__:WebInspector.TargetAwareObject.prototype}
WebInspector.TracingModel.Event=function(payload,level,thread)
{this.name=payload.name;this.category=payload.cat;this.startTime=payload.ts;this.args=payload.args;this.phase=payload.ph;this.level=level;if(payload.id)
this.id=payload.id;this.thread=thread;this.warning=null;this.initiator=null;this.stackTrace=null;this.previewElement=null;this.imageURL=null;this.backendNodeId=0;this.selfTime=0;}
WebInspector.TracingModel.Event.prototype={_setDuration:function(duration)
{this.endTime=this.startTime+duration;this.duration=duration;},_complete:function(payload)
{if(this.name!==payload.name){console.assert(false,"Open/close event mismatch: "+this.name+" vs. "+payload.name);return;}
if(payload.args){for(var name in payload.args){if(name in this.args)
console.error("Same argument name ("+name+") is used for begin and end phases of "+this.name);this.args[name]=payload.args[name];}}
var duration=payload.ts-this.startTime;if(duration<0){console.assert(false,"Event out of order: "+this.name);return;}
this._setDuration(duration);}}
WebInspector.TracingModel.NamedObject=function()
{}
WebInspector.TracingModel.NamedObject.prototype={_setName:function(name)
{this._name=name;},name:function()
{return this._name;},_setSortIndex:function(sortIndex)
{this._sortIndex=sortIndex;},}
WebInspector.TracingModel.NamedObject._sort=function(array)
{function comparator(a,b)
{return a._sortIndex!==b._sortIndex?a._sortIndex-b._sortIndex:a.name().localeCompare(b.name());}
return array.sort(comparator);}
WebInspector.TracingModel.Process=function(id)
{WebInspector.TracingModel.NamedObject.call(this);this._setName("Process "+id);this._threads={};this._objects={};}
WebInspector.TracingModel.Process.prototype={threadById:function(id)
{var thread=this._threads[id];if(!thread){thread=new WebInspector.TracingModel.Thread(id);this._threads[id]=thread;}
return thread;},addObject:function(event)
{this.objectsByName(event.name).push(event);},objectsByName:function(name)
{var objects=this._objects[name];if(!objects){objects=[];this._objects[name]=objects;}
return objects;},sortedObjectNames:function()
{return Object.keys(this._objects).sort();},sortedThreads:function()
{return WebInspector.TracingModel.NamedObject._sort(Object.values(this._threads));},__proto__:WebInspector.TracingModel.NamedObject.prototype}
WebInspector.TracingModel.Thread=function(id)
{WebInspector.TracingModel.NamedObject.call(this);this._setName("Thread "+id);this._events=[];this._stack=[];this._maxStackDepth=0;}
WebInspector.TracingModel.Thread.prototype={addEvent:function(payload)
{for(var top=this._stack.peekLast();top&&top.endTime&&top.endTime<=payload.ts;){this._stack.pop();top=this._stack.peekLast();}
if(payload.ph===WebInspector.TracingModel.Phase.End){var openEvent=this._stack.pop();if(openEvent)
openEvent._complete(payload);return null;}
var event=new WebInspector.TracingModel.Event(payload,this._stack.length,this);if(payload.ph===WebInspector.TracingModel.Phase.Begin||payload.ph===WebInspector.TracingModel.Phase.Complete){if(payload.ph===WebInspector.TracingModel.Phase.Complete)
event._setDuration(payload.dur);this._stack.push(event);if(this._maxStackDepth<this._stack.length)
this._maxStackDepth=this._stack.length;}
if(this._events.length&&this._events.peekLast().startTime>event.startTime)
console.assert(false,"Event is our of order: "+event.name);this._events.push(event);return event;},events:function()
{return this._events;},maxStackDepth:function()
{return this._maxStackDepth+1;},__proto__:WebInspector.TracingModel.NamedObject.prototype}
WebInspector.TracingDispatcher=function(tracingModel)
{this._tracingModel=tracingModel;}
WebInspector.TracingDispatcher.prototype={bufferUsage:function(usage)
{this._tracingModel._bufferUsage(usage);},dataCollected:function(data)
{this._tracingModel._eventsCollected(data);},tracingComplete:function()
{this._tracingModel._tracingComplete();}};WebInspector.TransformController=function(element)
{this.element=element;element.addEventListener("mousemove",this._onMouseMove.bind(this),false);element.addEventListener("mousedown",this._onMouseDown.bind(this),false);element.addEventListener("mouseup",this._onMouseUp.bind(this),false);element.addEventListener("mousewheel",this._onMouseWheel.bind(this),false);this._reset();}
WebInspector.TransformController.Events={TransformChanged:"TransformChanged"}
WebInspector.TransformController.prototype={registerShortcuts:function(registerShortcutDelegate)
{registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.ResetView,this._resetAndNotify.bind(this));var zoomFactor=1.1;registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.ZoomIn,this._onKeyboardZoom.bind(this,zoomFactor));registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.ZoomOut,this._onKeyboardZoom.bind(this,1/zoomFactor));var panDistanceInPixels=6;registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.PanUp,this._onPan.bind(this,0,-panDistanceInPixels));registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.PanDown,this._onPan.bind(this,0,panDistanceInPixels));registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.PanLeft,this._onPan.bind(this,-panDistanceInPixels,0));registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.PanRight,this._onPan.bind(this,panDistanceInPixels,0));var rotateDegrees=5;registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.RotateCWX,this._onKeyboardRotate.bind(this,rotateDegrees,0));registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.RotateCCWX,this._onKeyboardRotate.bind(this,-rotateDegrees,0));registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.RotateCWY,this._onKeyboardRotate.bind(this,0,-rotateDegrees));registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.RotateCCWY,this._onKeyboardRotate.bind(this,0,rotateDegrees));},_postChangeEvent:function()
{this.dispatchEventToListeners(WebInspector.TransformController.Events.TransformChanged);},_reset:function()
{this._scale=1;this._offsetX=0;this._offsetY=0;this._rotateX=0;this._rotateY=0;},_resetAndNotify:function(event)
{this._reset();this._postChangeEvent();if(event)
event.preventDefault();},scale:function()
{return this._scale;},offsetX:function()
{return this._offsetX;},offsetY:function()
{return this._offsetY;},rotateX:function()
{return this._rotateX;},rotateY:function()
{return this._rotateY;},_onScale:function(scaleFactor,x,y)
{this._scale*=scaleFactor;this._offsetX-=(x-this._offsetX)*(scaleFactor-1);this._offsetY-=(y-this._offsetY)*(scaleFactor-1);this._postChangeEvent();},_onPan:function(offsetX,offsetY)
{this._offsetX+=offsetX;this._offsetY+=offsetY;this._postChangeEvent();},_onRotate:function(rotateX,rotateY)
{this._rotateX=rotateX;this._rotateY=rotateY;this._postChangeEvent();},_onKeyboardZoom:function(zoomFactor)
{this._onScale(zoomFactor,this.element.clientWidth/2,this.element.clientHeight/2);},_onKeyboardRotate:function(rotateX,rotateY)
{this._onRotate(this._rotateX+rotateX,this._rotateY+rotateY);},_onMouseWheel:function(event)
{if(!event.altKey){var zoomFactor=1.1;var mouseWheelZoomSpeed=1/120;var scaleFactor=Math.pow(zoomFactor,event.wheelDeltaY*mouseWheelZoomSpeed);this._onScale(scaleFactor,event.clientX-this.element.totalOffsetLeft(),event.clientY-this.element.totalOffsetTop());}else{var moveFactor=1/20;this._onPan(event.wheelDeltaX*moveFactor,event.wheelDeltaY*moveFactor);}},_onMouseMove:function(event)
{if(event.which!==1||typeof this._originX!=="number")
return;this._onRotate(this._oldRotateX+(this._originY-event.clientY)/this.element.clientHeight*180,this._oldRotateY-(this._originX-event.clientX)/this.element.clientWidth*180);},_setReferencePoint:function(event)
{this._originX=event.clientX;this._originY=event.clientY;this._oldRotateX=this._rotateX;this._oldRotateY=this._rotateY;},_resetReferencePoint:function()
{delete this._originX;delete this._originY;delete this._oldRotateX;delete this._oldRotateY;},_onMouseDown:function(event)
{if(event.which!==1)
return;this._setReferencePoint(event);},_onMouseUp:function(event)
{if(event.which!==1)
return;this._resetReferencePoint();},__proto__:WebInspector.Object.prototype};WebInspector.TimelinePanel=function()
{WebInspector.Panel.call(this,"timeline");this.registerRequiredCSS("timelinePanel.css");this.registerRequiredCSS("layersPanel.css");this.registerRequiredCSS("filter.css");this.element.addEventListener("contextmenu",this._contextMenu.bind(this),false);this._detailsLinkifier=new WebInspector.Linkifier();this._windowStartTime=0;this._windowEndTime=Infinity;this._model=new WebInspector.TimelineModel(WebInspector.timelineManager);this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted,this._onRecordingStarted,this);this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStopped,this._onRecordingStopped,this);this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared,this._onRecordsCleared,this);this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingProgress,this._onRecordingProgress,this);this._model.addEventListener(WebInspector.TimelineModel.Events.RecordFilterChanged,this._refreshViews,this);this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded,this._onRecordAdded,this);this._model.target().profilingLock.addEventListener(WebInspector.Lock.Events.StateChanged,this._onProfilingStateChanged,this);this._categoryFilter=new WebInspector.TimelineCategoryFilter();this._durationFilter=new WebInspector.TimelineIsLongFilter();this._textFilter=new WebInspector.TimelineTextFilter();this._model.addFilter(new WebInspector.TimelineHiddenFilter());this._model.addFilter(this._categoryFilter);this._model.addFilter(this._durationFilter);this._model.addFilter(this._textFilter);this._currentViews=[];this._overviewModeSetting=WebInspector.settings.createSetting("timelineOverviewMode",WebInspector.TimelinePanel.OverviewMode.Events);this._flameChartEnabledSetting=WebInspector.settings.createSetting("timelineFlameChartEnabled",false);this._createStatusBarItems();this._topPane=new WebInspector.SplitView(true,false);this._topPane.element.id="timeline-overview-panel";this._topPane.show(this.element);this._topPane.addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged,this._sidebarResized,this);this._topPane.setResizable(false);this._createRecordingOptions();this._overviewPane=new WebInspector.TimelineOverviewPane(this._model);this._overviewPane.addEventListener(WebInspector.TimelineOverviewPane.Events.WindowChanged,this._onWindowChanged.bind(this));this._overviewPane.show(this._topPane.mainElement());this._createFileSelector();this._registerShortcuts();WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.WillReloadPage,this._willReloadPage,this);WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.Load,this._loadEventFired,this);this._detailsSplitView=new WebInspector.SplitView(false,true,"timelinePanelDetailsSplitViewState");this._detailsSplitView.element.classList.add("timeline-details-split");this._detailsSplitView.sidebarElement().classList.add("timeline-details");this._detailsView=new WebInspector.TimelineDetailsView();this._detailsSplitView.installResizer(this._detailsView.titleElement());this._detailsView.show(this._detailsSplitView.sidebarElement());this._searchableView=new WebInspector.SearchableView(this);this._searchableView.setMinimumSize(0,25);this._searchableView.element.classList.add("searchable-view");this._searchableView.show(this._detailsSplitView.mainElement());this._stackView=new WebInspector.StackView(false);this._stackView.show(this._searchableView.element);this._stackView.element.classList.add("timeline-view-stack");WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged,this._dockSideChanged.bind(this));WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));this._dockSideChanged();this._onModeChanged();this._detailsSplitView.show(this.element);}
WebInspector.TimelinePanel.OverviewMode={Events:"Events",Frames:"Frames"};WebInspector.TimelinePanel.rowHeight=18;WebInspector.TimelinePanel.headerHeight=20;WebInspector.TimelinePanel.durationFilterPresetsMs=[0,1,15];WebInspector.TimelinePanel.defaultTracingCategoryFilter="*,disabled-by-default-cc.debug,disabled-by-default-devtools.timeline";WebInspector.TimelinePanel.prototype={searchableView:function()
{return this._searchableView;},wasShown:function()
{if(!WebInspector.TimelinePanel._categoryStylesInitialized){WebInspector.TimelinePanel._categoryStylesInitialized=true;var style=document.createElement("style");var categories=WebInspector.TimelineUIUtils.categories();style.textContent=Object.values(categories).map(WebInspector.TimelineUIUtils.createStyleRuleForCategory).join("\n");document.head.appendChild(style);}},_dockSideChanged:function()
{var dockSide=WebInspector.dockController.dockSide();var vertically=false;if(dockSide===WebInspector.DockController.State.DockedToBottom)
vertically=true;else
vertically=!WebInspector.settings.splitVerticallyWhenDockedToRight.get();this._detailsSplitView.setVertical(vertically);this._detailsView.setVertical(vertically);},windowStartTime:function()
{if(this._windowStartTime)
return this._windowStartTime;if(this._model.minimumRecordTime()!=-1)
return this._model.minimumRecordTime();return 0;},windowEndTime:function()
{if(this._windowEndTime<Infinity)
return this._windowEndTime;if(this._model.maximumRecordTime()!=-1)
return this._model.maximumRecordTime();return Infinity;},_sidebarResized:function(event)
{var width=(event.data);this._topPane.setSidebarSize(width);for(var i=0;i<this._currentViews.length;++i)
this._currentViews[i].setSidebarSize(width);},_onWindowChanged:function(event)
{this._windowStartTime=event.data.startTime;this._windowEndTime=event.data.endTime;for(var i=0;i<this._currentViews.length;++i)
this._currentViews[i].setWindowTimes(this._windowStartTime,this._windowEndTime);this._updateSelectedRangeStats();},requestWindowTimes:function(windowStartTime,windowEndTime)
{this._overviewPane.requestWindowTimes(windowStartTime,windowEndTime);},_frameModel:function()
{if(!this._lazyFrameModel){this._lazyFrameModel=new WebInspector.TimelineFrameModel(this._model);if(this._lazyTracingModel)
this._lazyFrameModel.addTraceEvents(this._lazyTracingModel.inspectedTargetEvents(),this._lazyTracingModel.sessionId());}
return this._lazyFrameModel;},_tracingModel:function()
{if(!this._lazyTracingModel){this._lazyTracingModel=new WebInspector.TracingModel(WebInspector.targetManager.activeTarget());this._lazyTracingModel.addEventListener(WebInspector.TracingModel.Events.BufferUsage,this._onTracingBufferUsage,this);}
return this._lazyTracingModel;},_traceEventBindings:function()
{if(!this._lazyTraceEventBindings){this._lazyTraceEventBindings=new WebInspector.TimelineTraceEventBindings();if(this._lazyTracingModel)
this._lazyTraceEventBindings.setEvents(this._lazyTracingModel.inspectedTargetEvents());}
return this._lazyTraceEventBindings;},_timelineView:function()
{if(!this._lazyTimelineView)
this._lazyTimelineView=new WebInspector.TimelineView(this,this._model);return this._lazyTimelineView;},_layersView:function()
{if(this._lazyLayersView)
return this._lazyLayersView;this._lazyLayersView=new WebInspector.TimelineLayersView();return this._lazyLayersView;},_addModeView:function(modeView)
{modeView.setWindowTimes(this.windowStartTime(),this.windowEndTime());modeView.refreshRecords(this._textFilter._regex);modeView.view().setSidebarSize(this._topPane.sidebarSize());this._stackView.appendView(modeView.view(),"timelinePanelTimelineStackSplitViewState");modeView.view().addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged,this._sidebarResized,this);this._currentViews.push(modeView);},_removeAllModeViews:function()
{for(var i=0;i<this._currentViews.length;++i){this._currentViews[i].removeEventListener(WebInspector.SplitView.Events.SidebarSizeChanged,this._sidebarResized,this);this._currentViews[i].dispose();}
this._currentViews=[];this._stackView.detachChildViews();},_createRecordingOptions:function()
{var topPaneSidebarElement=this._topPane.sidebarElement();this._captureStacksSetting=WebInspector.settings.createSetting("timelineCaptureStacks",true);topPaneSidebarElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Capture stacks"),this._captureStacksSetting,true,undefined,WebInspector.UIString("Capture JavaScript stack on every timeline event")));this._captureMemorySetting=WebInspector.settings.createSetting("timelineCaptureMemory",false);topPaneSidebarElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Capture memory"),this._captureMemorySetting,true,undefined,WebInspector.UIString("Capture memory information on every timeline event")));this._captureMemorySetting.addChangeListener(this._onModeChanged,this);if(Capabilities.canProfilePower){this._capturePowerSetting=WebInspector.settings.createSetting("timelineCapturePower",false);topPaneSidebarElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Capture power"),this._capturePowerSetting,true,undefined,WebInspector.UIString("Capture power information")));this._capturePowerSetting.addChangeListener(this._onModeChanged,this);}
if(WebInspector.experimentsSettings.timelineTracingMode.isEnabled()){this._captureTracingSetting=WebInspector.settings.createSetting("timelineCaptureTracing",false);topPaneSidebarElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Capture tracing"),this._captureTracingSetting,true,undefined,WebInspector.UIString("Capture tracing information")));this._captureTracingSetting.addChangeListener(this._onModeChanged,this);}},_createStatusBarItems:function()
{var panelStatusBarElement=this.element.createChild("div","panel-status-bar");this._statusBarButtons=([]);this.toggleTimelineButton=new WebInspector.StatusBarButton("","record-profile-status-bar-item");this.toggleTimelineButton.addEventListener("click",this._toggleTimelineButtonClicked,this);this._statusBarButtons.push(this.toggleTimelineButton);panelStatusBarElement.appendChild(this.toggleTimelineButton.element);this._updateToggleTimelineButton(false);var clearButton=new WebInspector.StatusBarButton(WebInspector.UIString("Clear"),"clear-status-bar-item");clearButton.addEventListener("click",this._onClearButtonClick,this);this._statusBarButtons.push(clearButton);panelStatusBarElement.appendChild(clearButton.element);this._filterBar=this._createFilterBar();panelStatusBarElement.appendChild(this._filterBar.filterButton().element);var garbageCollectButton=new WebInspector.StatusBarButton(WebInspector.UIString("Collect Garbage"),"timeline-garbage-collect-status-bar-item");garbageCollectButton.addEventListener("click",this._garbageCollectButtonClicked,this);this._statusBarButtons.push(garbageCollectButton);panelStatusBarElement.appendChild(garbageCollectButton.element);var framesToggleButton=new WebInspector.StatusBarButton(WebInspector.UIString("Frames mode"),"timeline-frames-status-bar-item");framesToggleButton.toggled=this._overviewModeSetting.get()===WebInspector.TimelinePanel.OverviewMode.Frames;framesToggleButton.addEventListener("click",this._overviewModeChanged.bind(this,framesToggleButton));this._statusBarButtons.push(framesToggleButton);panelStatusBarElement.appendChild(framesToggleButton.element);if(WebInspector.experimentsSettings.timelineFlameChart.isEnabled()){var flameChartToggleButton=new WebInspector.StatusBarButton(WebInspector.UIString("Tracing mode"),"timeline-flame-chart-status-bar-item");flameChartToggleButton.toggled=this._flameChartEnabledSetting.get();flameChartToggleButton.addEventListener("click",this._flameChartEnabledChanged.bind(this,flameChartToggleButton));this._statusBarButtons.push(flameChartToggleButton);panelStatusBarElement.appendChild(flameChartToggleButton.element);}
this._miscStatusBarItems=panelStatusBarElement.createChild("div","status-bar-item");this._filtersContainer=this.element.createChild("div","timeline-filters-header hidden");this._filtersContainer.appendChild(this._filterBar.filtersElement());this._filterBar.addEventListener(WebInspector.FilterBar.Events.FiltersToggled,this._onFiltersToggled,this);this._filterBar.setName("timelinePanel");},_createFilterBar:function()
{this._filterBar=new WebInspector.FilterBar();this._filters={};this._filters._textFilterUI=new WebInspector.TextFilterUI();this._filters._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged,this._textFilterChanged,this);this._filterBar.addFilter(this._filters._textFilterUI);var durationOptions=[];for(var presetIndex=0;presetIndex<WebInspector.TimelinePanel.durationFilterPresetsMs.length;++presetIndex){var durationMs=WebInspector.TimelinePanel.durationFilterPresetsMs[presetIndex];var durationOption={};if(!durationMs){durationOption.label=WebInspector.UIString("All");durationOption.title=WebInspector.UIString("Show all records");}else{durationOption.label=WebInspector.UIString("\u2265 %dms",durationMs);durationOption.title=WebInspector.UIString("Hide records shorter than %dms",durationMs);}
durationOption.value=durationMs;durationOptions.push(durationOption);}
this._filters._durationFilterUI=new WebInspector.ComboBoxFilterUI(durationOptions);this._filters._durationFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged,this._durationFilterChanged,this);this._filterBar.addFilter(this._filters._durationFilterUI);this._filters._categoryFiltersUI={};var categoryTypes=[];var categories=WebInspector.TimelineUIUtils.categories();for(var categoryName in categories){var category=categories[categoryName];if(category.overviewStripGroupIndex<0)
continue;var filter=new WebInspector.CheckboxFilterUI(category.name,category.title);this._filters._categoryFiltersUI[category.name]=filter;filter.addEventListener(WebInspector.FilterUI.Events.FilterChanged,this._categoriesFilterChanged.bind(this,categoryName),this);this._filterBar.addFilter(filter);}
return this._filterBar;},_textFilterChanged:function(event)
{var searchQuery=this._filters._textFilterUI.value();this.searchCanceled();this._textFilter.setRegex(searchQuery?createPlainTextSearchRegex(searchQuery,"i"):null);},_durationFilterChanged:function()
{var duration=this._filters._durationFilterUI.value();var minimumRecordDuration=parseInt(duration,10);this._durationFilter.setMinimumRecordDuration(minimumRecordDuration);},_categoriesFilterChanged:function(name,event)
{var categories=WebInspector.TimelineUIUtils.categories();categories[name].hidden=!this._filters._categoryFiltersUI[name].checked();this._categoryFilter.notifyFilterChanged();},defaultFocusedElement:function()
{return this.element;},_onFiltersToggled:function(event)
{var toggled=(event.data);this._filtersContainer.classList.toggle("hidden",!toggled);this.doResize();},_prepareToLoadTimeline:function()
{if(this._operationInProgress)
return null;if(this._recordingInProgress()){this._updateToggleTimelineButton(false);this._stopRecording();}
var progressIndicator=new WebInspector.ProgressIndicator();progressIndicator.addEventListener(WebInspector.Progress.Events.Done,this._setOperationInProgress.bind(this,null));this._setOperationInProgress(progressIndicator);return progressIndicator;},_setOperationInProgress:function(indicator)
{this._operationInProgress=!!indicator;for(var i=0;i<this._statusBarButtons.length;++i)
this._statusBarButtons[i].setEnabled(!this._operationInProgress);this._miscStatusBarItems.removeChildren();if(indicator)
this._miscStatusBarItems.appendChild(indicator.element);},_registerShortcuts:function()
{this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.StartStopRecording,this._toggleTimelineButtonClicked.bind(this));this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.SaveToFile,this._saveToFile.bind(this));this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.LoadFromFile,this._selectFileToLoad.bind(this));},_createFileSelector:function()
{if(this._fileSelectorElement)
this._fileSelectorElement.remove();this._fileSelectorElement=WebInspector.createFileSelectorElement(this._loadFromFile.bind(this));this.element.appendChild(this._fileSelectorElement);},_contextMenu:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Save Timeline data\u2026":"Save Timeline Data\u2026"),this._saveToFile.bind(this),this._operationInProgress);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Load Timeline data\u2026":"Load Timeline Data\u2026"),this._selectFileToLoad.bind(this),this._operationInProgress);contextMenu.show();},_saveToFile:function()
{if(this._operationInProgress)
return true;this._model.saveToFile();return true;},_selectFileToLoad:function(){this._fileSelectorElement.click();return true;},_loadFromFile:function(file)
{var progressIndicator=this._prepareToLoadTimeline();if(!progressIndicator)
return;this._model.loadFromFile(file,progressIndicator);this._createFileSelector();},loadFromURL:function(url)
{var progressIndicator=this._prepareToLoadTimeline();if(!progressIndicator)
return;this._model.loadFromURL(url,progressIndicator);},_refreshViews:function()
{for(var i=0;i<this._currentViews.length;++i){var view=this._currentViews[i];view.refreshRecords(this._textFilter._regex);}
this._updateSelectedRangeStats();},_overviewModeChanged:function(button)
{var oldMode=this._overviewModeSetting.get();if(oldMode===WebInspector.TimelinePanel.OverviewMode.Events){this._overviewModeSetting.set(WebInspector.TimelinePanel.OverviewMode.Frames);button.toggled=true;}else{this._overviewModeSetting.set(WebInspector.TimelinePanel.OverviewMode.Events);button.toggled=false;}
this._onModeChanged();},_flameChartEnabledChanged:function(button)
{var oldValue=this._flameChartEnabledSetting.get();var newValue=!oldValue;this._flameChartEnabledSetting.set(newValue);button.toggled=newValue;this._onModeChanged();},_onModeChanged:function()
{this._stackView.detach();var isFrameMode=this._overviewModeSetting.get()===WebInspector.TimelinePanel.OverviewMode.Frames;this._removeAllModeViews();this._overviewControls=[];if(isFrameMode)
this._overviewControls.push(new WebInspector.TimelineFrameOverview(this._model,this._frameModel()));else
this._overviewControls.push(new WebInspector.TimelineEventOverview(this._model));var tracingModel=null;var traceEventBindings=null;if(WebInspector.experimentsSettings.timelineOnTraceEvents.isEnabled()){tracingModel=this._tracingModel();traceEventBindings=this._traceEventBindings();}
if(WebInspector.experimentsSettings.timelineFlameChart.isEnabled()&&this._flameChartEnabledSetting.get())
this._addModeView(new WebInspector.TimelineFlameChart(this,this._model,tracingModel,traceEventBindings,this._frameModel()));else
this._addModeView(this._timelineView());if(this._captureMemorySetting.get()){if(!isFrameMode)
this._overviewControls.push(new WebInspector.TimelineMemoryOverview(this._model));this._addModeView(new WebInspector.MemoryCountersGraph(this,this._model));}
if(this._capturePowerSetting&&this._capturePowerSetting.get()){if(!isFrameMode)
this._overviewControls.push(new WebInspector.TimelinePowerOverview(this._model));this._addModeView(new WebInspector.TimelinePowerGraph(this,this._model));}
if(this._captureTracingSetting&&this._captureTracingSetting.get())
this._addModeView(new WebInspector.TimelineTracingView(this,this._tracingModel(),this._model));this._timelineView().setFrameModel(isFrameMode?this._frameModel():null);this._overviewPane.setOverviewControls(this._overviewControls);this.doResize();this._updateSelectedRangeStats();this._stackView.show(this._searchableView.element);},_startRecording:function(userInitiated)
{this._userInitiatedRecording=userInitiated;if(WebInspector.experimentsSettings.timelineOnTraceEvents.isEnabled()){var categories=["disabled-by-default-devtools.timeline","devtools"];if(this._captureStacksSetting.get())
categories.push("disabled-by-default-devtools.timeline.stack");this._model.willStartRecordingTraceEvents();this._tracingModel().start(categories.join(","),"");}else{this._model.startRecording(this._captureStacksSetting.get(),this._captureMemorySetting.get());if(WebInspector.experimentsSettings.timelineTracingMode.isEnabled())
this._tracingModel().start(WebInspector.TimelinePanel.defaultTracingCategoryFilter,"");}
for(var i=0;i<this._overviewControls.length;++i)
this._overviewControls[i].timelineStarted();if(userInitiated)
WebInspector.userMetrics.TimelineStarted.record();},_stopRecording:function()
{this._userInitiatedRecording=false;this._model.stopRecording();if(this._lazyTracingModel)
this._lazyTracingModel.stop(this._onTracingComplete.bind(this));for(var i=0;i<this._overviewControls.length;++i)
this._overviewControls[i].timelineStopped();},_onTracingComplete:function()
{if(this._lazyFrameModel){this._lazyFrameModel.reset();this._lazyFrameModel.addTraceEvents(this._lazyTracingModel.inspectedTargetEvents(),this._lazyTracingModel.sessionId());this._overviewPane.update();}
if(this._lazyTraceEventBindings){this._lazyTraceEventBindings.setEvents(this._lazyTracingModel.inspectedTargetEvents());this._model.didStopRecordingTraceEvents(this._lazyTraceEventBindings.mainThreadEvents());}
this._refreshViews();},_onProfilingStateChanged:function()
{this._updateToggleTimelineButton(this.toggleTimelineButton.toggled);},_updateToggleTimelineButton:function(toggled)
{var enable=toggled||!this._model.target().profilingLock.isAcquired();this.toggleTimelineButton.setEnabled(enable);this.toggleTimelineButton.toggled=toggled;if(enable)
this.toggleTimelineButton.title=toggled?WebInspector.UIString("Stop"):WebInspector.UIString("Record");else
this.toggleTimelineButton.title=WebInspector.UIString("Another profiler is already active");},_toggleTimelineButtonClicked:function()
{if(!this.toggleTimelineButton.enabled())
return true;if(this._operationInProgress)
return true;if(this._recordingInProgress())
this._stopRecording();else
this._startRecording(true);return true;},_garbageCollectButtonClicked:function()
{HeapProfilerAgent.collectGarbage();},_onClearButtonClick:function()
{this._model.reset();},_onRecordsCleared:function()
{this.requestWindowTimes(0,Infinity);delete this._selection;if(this._lazyFrameModel)
this._lazyFrameModel.reset();for(var i=0;i<this._currentViews.length;++i)
this._currentViews[i].reset();for(var i=0;i<this._overviewControls.length;++i)
this._overviewControls[i].reset();this._updateSelectedRangeStats();},_onRecordingStarted:function()
{this._updateToggleTimelineButton(true);if(WebInspector.experimentsSettings.timelineNoLiveUpdate.isEnabled())
this._updateProgress(WebInspector.UIString("%d events collected",0));},_recordingInProgress:function()
{return this.toggleTimelineButton.toggled;},_onRecordingProgress:function(event)
{if(!WebInspector.experimentsSettings.timelineNoLiveUpdate.isEnabled())
return;this._updateProgress(WebInspector.UIString("%d events collected",event.data));},_onTracingBufferUsage:function(event)
{var usage=(event.data);this._updateProgress(WebInspector.UIString("Buffer usage %d%",Math.round(usage*100)));},_updateProgress:function(progressMessage)
{if(!this._progressElement)
this._showProgressPane();this._progressElement.textContent=progressMessage;},_showProgressPane:function()
{this._hideProgressPane();this._progressElement=this._detailsSplitView.mainElement().createChild("div","timeline-progress-pane");},_hideProgressPane:function()
{if(this._progressElement)
this._progressElement.remove();delete this._progressElement;},_onRecordingStopped:function()
{this._updateToggleTimelineButton(false);this._hideProgressPane();},_onRecordAdded:function(event)
{this._addRecord((event.data));},_addRecord:function(record)
{if(this._lazyFrameModel)
this._lazyFrameModel.addRecord(record);for(var i=0;i<this._currentViews.length;++i)
this._currentViews[i].addRecord(record);this._overviewPane.addRecord(record);this._updateSearchHighlight(false,true);},_willReloadPage:function(event)
{if(this._operationInProgress||this._userInitiatedRecording||!this.isShowing())
return;this._startRecording(false);},_loadEventFired:function(event)
{if(!this._recordingInProgress()||this._userInitiatedRecording)
return;this._stopRecording();},jumpToNextSearchResult:function()
{if(!this._searchResults||!this._searchResults.length)
return;var index=this._selectedSearchResult?this._searchResults.indexOf(this._selectedSearchResult):-1;this._jumpToSearchResult(index+1);},jumpToPreviousSearchResult:function()
{if(!this._searchResults||!this._searchResults.length)
return;var index=this._selectedSearchResult?this._searchResults.indexOf(this._selectedSearchResult):0;this._jumpToSearchResult(index-1);},_jumpToSearchResult:function(index)
{this._selectSearchResult((index+this._searchResults.length)%this._searchResults.length);this._currentViews[0].highlightSearchResult(this._selectedSearchResult,this._searchRegex,true);},_selectSearchResult:function(index)
{this._selectedSearchResult=this._searchResults[index];this._searchableView.updateCurrentMatchIndex(index);},_clearHighlight:function()
{this._currentViews[0].highlightSearchResult(null);},_updateSearchHighlight:function(revealRecord,shouldJump,jumpBackwards)
{if(!this._textFilter.isEmpty()||!this._searchRegex){this._clearHighlight();return;}
if(!this._searchResults)
this._updateSearchResults(shouldJump,jumpBackwards);this._currentViews[0].highlightSearchResult(this._selectedSearchResult,this._searchRegex,revealRecord);},_updateSearchResults:function(shouldJump,jumpBackwards)
{var searchRegExp=this._searchRegex;if(!searchRegExp)
return;var matches=[];function processRecord(record)
{if(record.endTime()<this._windowStartTime||record.startTime()>this._windowEndTime)
return;if(record.testContentMatching(searchRegExp))
matches.push(record);}
this._model.forAllFilteredRecords(processRecord.bind(this));var matchesCount=matches.length;if(matchesCount){this._searchResults=matches;this._searchableView.updateSearchMatchesCount(matchesCount);var selectedIndex=matches.indexOf(this._selectedSearchResult);if(shouldJump&&selectedIndex===-1)
selectedIndex=jumpBackwards?this._searchResults.length-1:0;this._selectSearchResult(selectedIndex);}else{this._searchableView.updateSearchMatchesCount(0);delete this._selectedSearchResult;}},searchCanceled:function()
{this._clearHighlight();delete this._searchResults;delete this._selectedSearchResult;delete this._searchRegex;},performSearch:function(query,shouldJump,jumpBackwards)
{this._searchRegex=createPlainTextSearchRegex(query,"i");delete this._searchResults;this._updateSearchHighlight(true,shouldJump,jumpBackwards);},_updateSelectionDetails:function()
{if(!this._selection){this._updateSelectedRangeStats();return;}
switch(this._selection.type()){case WebInspector.TimelineSelection.Type.Record:var record=(this._selection.object());WebInspector.TimelineUIUtils.generatePopupContent(record,this._model,this._detailsLinkifier,this.showInDetails.bind(this,record.title()),this._model.loadedFromFile());break;case WebInspector.TimelineSelection.Type.TraceEvent:var event=(this._selection.object());var title=WebInspector.TimelineUIUtils.styleForTimelineEvent(event.name).title;var tracingModel=this._tracingModel();var bindings=this._traceEventBindings();WebInspector.TimelineUIUtils.buildTraceEventDetails(event,tracingModel,this._detailsLinkifier,this.showInDetails.bind(this,title),false,bindings,this._model.target());break;case WebInspector.TimelineSelection.Type.Frame:var frame=(this._selection.object());if(frame.layerTree){var layersView=this._layersView();layersView.showLayerTree(frame.layerTree);this._detailsView.setChildView(WebInspector.UIString("Frame Layers"),layersView);}else{this.showInDetails(WebInspector.UIString("Frame Statistics"),WebInspector.TimelineUIUtils.generatePopupContentForFrame(this._lazyFrameModel,frame));}
break;}},_updateSelectedRangeStats:function()
{if(this._selection)
return;var startTime=this._windowStartTime;var endTime=this._windowEndTime;if(startTime<0)
return;var aggregatedStats={};function compareEndTime(value,task)
{return value<task.endTime()?-1:1;}
function aggregateTimeForRecordWithinWindow(record)
{if(!record.endTime()||record.endTime()<startTime||record.startTime()>endTime)
return;var childrenTime=0;var children=record.children()||[];for(var i=0;i<children.length;++i){var child=children[i];if(!child.endTime()||child.endTime()<startTime||child.startTime()>endTime)
continue;childrenTime+=Math.min(endTime,child.endTime())-Math.max(startTime,child.startTime());aggregateTimeForRecordWithinWindow(child);}
var categoryName=WebInspector.TimelineUIUtils.categoryForRecord(record).name;var ownTime=Math.min(endTime,record.endTime())-Math.max(startTime,record.startTime())-childrenTime;aggregatedStats[categoryName]=(aggregatedStats[categoryName]||0)+ownTime;}
var mainThreadTasks=this._model.mainThreadTasks();var taskIndex=insertionIndexForObjectInListSortedByFunction(startTime,mainThreadTasks,compareEndTime);for(;taskIndex<mainThreadTasks.length;++taskIndex){var task=mainThreadTasks[taskIndex];if(task.startTime()>endTime)
break;aggregateTimeForRecordWithinWindow(task);}
var aggregatedTotal=0;for(var categoryName in aggregatedStats)
aggregatedTotal+=aggregatedStats[categoryName];aggregatedStats["idle"]=Math.max(0,endTime-startTime-aggregatedTotal);var fragment=document.createDocumentFragment();fragment.appendChild(WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats));var startOffset=startTime-this._model.minimumRecordTime();var endOffset=endTime-this._model.minimumRecordTime();var title=WebInspector.UIString("%s \u2013 %s",Number.millisToString(startOffset),Number.millisToString(endOffset));for(var i=0;i<this._overviewControls.length;++i){if(this._overviewControls[i]instanceof WebInspector.TimelinePowerOverview){var energy=this._overviewControls[i].calculateEnergy(startTime,endTime);title+=WebInspector.UIString("  Energy: %.2f Joules",energy);break;}}
this.showInDetails(title,fragment);},select:function(selection)
{this._detailsLinkifier.reset();this._selection=selection;for(var i=0;i<this._currentViews.length;++i){var view=this._currentViews[i];view.setSelection(selection);}
this._updateSelectionDetails();},showInDetails:function(title,node)
{this._detailsView.setContent(title,node);},__proto__:WebInspector.Panel.prototype}
WebInspector.TimelineDetailsView=function()
{WebInspector.VBox.call(this);this.element.classList.add("timeline-details-view");this._titleElement=this.element.createChild("div","timeline-details-view-title");this._titleElement.textContent=WebInspector.UIString("DETAILS");this._contentElement=this.element.createChild("div","timeline-details-view-body");this._currentChildView=null;}
WebInspector.TimelineDetailsView.prototype={titleElement:function()
{return this._titleElement;},setContent:function(title,node)
{this._titleElement.textContent=WebInspector.UIString("DETAILS: %s",title);this._clearContent();this._contentElement.appendChild(node);},setChildView:function(title,view)
{this._titleElement.textContent=WebInspector.UIString("DETAILS: %s",title);if(this._currentChildView===view)
return;this._clearContent();view.show(this._contentElement);this._currentChildView=view;},_clearContent:function()
{if(this._currentChildView){this._currentChildView.detach();this._currentChildView=null;}
this._contentElement.removeChildren();},setVertical:function(vertical)
{this._contentElement.classList.toggle("hbox",!vertical);this._contentElement.classList.toggle("vbox",vertical);},__proto__:WebInspector.VBox.prototype}
WebInspector.TimelineSelection=function()
{}
WebInspector.TimelineSelection.Type={Record:"Record",Frame:"Frame",TraceEvent:"TraceEvent",};WebInspector.TimelineSelection.fromRecord=function(record)
{var selection=new WebInspector.TimelineSelection();selection._type=WebInspector.TimelineSelection.Type.Record;selection._object=record;return selection;}
WebInspector.TimelineSelection.fromFrame=function(frame)
{var selection=new WebInspector.TimelineSelection();selection._type=WebInspector.TimelineSelection.Type.Frame;selection._object=frame;return selection;}
WebInspector.TimelineSelection.fromTraceEvent=function(event)
{var selection=new WebInspector.TimelineSelection();selection._type=WebInspector.TimelineSelection.Type.TraceEvent;selection._object=event;return selection;}
WebInspector.TimelineSelection.prototype={type:function()
{return this._type;},object:function()
{return this._object;}};WebInspector.TimelineModeView=function()
{}
WebInspector.TimelineModeView.prototype={view:function(){},dispose:function(){},reset:function(){},refreshRecords:function(textFilter){},addRecord:function(record){},highlightSearchResult:function(record,regex,selectRecord){},setWindowTimes:function(startTime,endTime){},setSidebarSize:function(width){},setSelection:function(selection){},}
WebInspector.TimelineModeViewDelegate=function(){}
WebInspector.TimelineModeViewDelegate.prototype={requestWindowTimes:function(startTime,endTime){},select:function(selection){},showInDetails:function(title,node){},}
WebInspector.TimelineCategoryFilter=function()
{WebInspector.TimelineModel.Filter.call(this);}
WebInspector.TimelineCategoryFilter.prototype={accept:function(record)
{return!record.category().hidden;},__proto__:WebInspector.TimelineModel.Filter.prototype}
WebInspector.TimelineIsLongFilter=function()
{WebInspector.TimelineModel.Filter.call(this);this._minimumRecordDuration=0;}
WebInspector.TimelineIsLongFilter.prototype={setMinimumRecordDuration:function(value)
{this._minimumRecordDuration=value;this.notifyFilterChanged();},accept:function(record)
{return this._minimumRecordDuration?((record.endTime()-record.startTime())>=this._minimumRecordDuration):true;},__proto__:WebInspector.TimelineModel.Filter.prototype}
WebInspector.TimelineTextFilter=function()
{WebInspector.TimelineModel.Filter.call(this);}
WebInspector.TimelineTextFilter.prototype={isEmpty:function()
{return!this._regex;},setRegex:function(regex)
{this._regex=regex;this.notifyFilterChanged();},accept:function(record)
{return!this._regex||record.testContentMatching(this._regex);},__proto__:WebInspector.TimelineModel.Filter.prototype}
WebInspector.TimelineHiddenFilter=function()
{WebInspector.TimelineModel.Filter.call(this);this._hiddenRecords={};this._hiddenRecords[WebInspector.TimelineModel.RecordType.MarkDOMContent]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.MarkLoad]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.MarkFirstPaint]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.GPUTask]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.ScheduleStyleRecalculation]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.InvalidateLayout]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.RequestMainThreadFrame]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.ActivateLayerTree]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.DrawFrame]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.BeginFrame]=1;this._hiddenRecords[WebInspector.TimelineModel.RecordType.UpdateCounters]=1;}
WebInspector.TimelineHiddenFilter.prototype={accept:function(record)
{return!this._hiddenRecords[record.type()];},__proto__:WebInspector.TimelineModel.Filter.prototype}