





WebInspector.MemoryStatistics = function(timelinePanel, model, sidebarWidth)
{
this._timelinePanel = timelinePanel;
this._counters = [];

model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);

this._containerAnchor = timelinePanel.element.lastChild;
this._memorySidebarView = new WebInspector.SidebarView(WebInspector.SidebarView.SidebarPosition.Start, undefined, sidebarWidth);
this._memorySidebarView.sidebarElement.addStyleClass("sidebar");
this._memorySidebarView.element.id = "memory-graphs-container";

this._memorySidebarView.addEventListener(WebInspector.SidebarView.EventTypes.Resized, this._sidebarResized.bind(this));

this._canvasContainer = this._memorySidebarView.mainElement;
this._canvasContainer.id = "memory-graphs-canvas-container";
this._createCurrentValuesBar();
this._canvas = this._canvasContainer.createChild("canvas");
this._canvas.id = "memory-counters-graph";
this._lastMarkerXPosition = 0;

this._canvas.addEventListener("mouseover", this._onMouseOver.bind(this), true);
this._canvas.addEventListener("mousemove", this._onMouseMove.bind(this), true);
this._canvas.addEventListener("mouseout", this._onMouseOut.bind(this), true);
this._canvas.addEventListener("click", this._onClick.bind(this), true);

this._timelineGrid = new WebInspector.TimelineGrid();
this._canvasContainer.appendChild(this._timelineGrid.dividersElement);


this._memorySidebarView.sidebarElement.createChild("div", "sidebar-tree sidebar-tree-section").textContent = WebInspector.UIString("COUNTERS");
this._counterUI = this._createCounterUIList();
}


WebInspector.MemoryStatistics.Counter = function(time)
{
this.time = time;
}


WebInspector.SwatchCheckbox = function(title, color)
{
this.element = document.createElement("div");
this._swatch = this.element.createChild("div", "swatch");
this.element.createChild("span", "title").textContent = title;
this._color = color;
this.checked = true;

this.element.addEventListener("click", this._toggleCheckbox.bind(this), true);
}

WebInspector.SwatchCheckbox.Events = {
Changed: "Changed"
}

WebInspector.SwatchCheckbox.prototype = {
get checked()
{
return this._checked;
},

set checked(v)
{
this._checked = v;
if (this._checked)
this._swatch.style.backgroundColor = this._color;
else
this._swatch.style.backgroundColor = "";
},

_toggleCheckbox: function(event)
{
this.checked = !this.checked;
this.dispatchEventToListeners(WebInspector.SwatchCheckbox.Events.Changed);
},

__proto__: WebInspector.Object.prototype
}


WebInspector.CounterUIBase = function(memoryCountersPane, title, graphColor, valueGetter)
{
this._memoryCountersPane = memoryCountersPane;
this.valueGetter = valueGetter;
var container = memoryCountersPane._memorySidebarView.sidebarElement.createChild("div", "memory-counter-sidebar-info");
var swatchColor = graphColor;
this._swatch = new WebInspector.SwatchCheckbox(WebInspector.UIString(title), swatchColor);
this._swatch.addEventListener(WebInspector.SwatchCheckbox.Events.Changed, this._toggleCounterGraph.bind(this));
container.appendChild(this._swatch.element);

this._value = null;
this.graphColor =graphColor;
this.strokeColor = graphColor;
this.graphYValues = [];
}

WebInspector.CounterUIBase.prototype = {
_toggleCounterGraph: function(event)
{
if (this._swatch.checked)
this._value.removeStyleClass("hidden");
else
this._value.addStyleClass("hidden");
this._memoryCountersPane.refresh();
},

updateCurrentValue: function(countersEntry)
{
this._value.textContent = Number.bytesToString(this.valueGetter(countersEntry));
},

clearCurrentValueAndMarker: function(ctx)
{
this._value.textContent = "";
},

get visible()
{
return this._swatch.checked;
},
}

WebInspector.MemoryStatistics.prototype = {
_createCurrentValuesBar: function()
{
throw new Error("Not implemented");
},

_createCounterUIList: function()
{
throw new Error("Not implemented");
},

_onRecordsCleared: function()
{
this._counters = [];
},


setMainTimelineGrid: function(timelineGrid)
{
this._mainTimelineGrid = timelineGrid;
},


setTopPosition: function(top)
{
this._memorySidebarView.element.style.top = top + "px";
this._updateSize();
},


setSidebarWidth: function(width)
{
if (this._ignoreSidebarResize)
return;
this._ignoreSidebarResize = true;
this._memorySidebarView.setSidebarWidth(width);
this._ignoreSidebarResize = false;
},


_sidebarResized: function(event)
{
if (this._ignoreSidebarResize)
return;
this._ignoreSidebarResize = true;
this._timelinePanel.splitView.setSidebarWidth(event.data);
this._ignoreSidebarResize = false;
},

_canvasHeight: function()
{
throw new Error("Not implemented");
},

_updateSize: function()
{
var width = this._mainTimelineGrid.dividersElement.offsetWidth + 1;
this._canvasContainer.style.width = width + "px";

var height = this._canvasHeight();
this._canvas.width = width;
this._canvas.height = height;
},


_onRecordAdded: function(event)
{
throw new Error("Not implemented");
},

_draw: function()
{
this._calculateVisibleIndexes();
this._calculateXValues();
this._clear();

this._setVerticalClip(10, this._canvas.height - 20);
},

_calculateVisibleIndexes: function()
{
var calculator = this._timelinePanel.calculator;
var start = calculator.minimumBoundary() * 1000;
var end = calculator.maximumBoundary() * 1000;
var firstIndex = 0;
var lastIndex = this._counters.length - 1;
for (var i = 0; i < this._counters.length; i++) {
var time = this._counters[i].time;
if (time <= start) {
firstIndex = i;
} else {
if (end < time)
break;
lastIndex = i;
}
}

this._minimumIndex = firstIndex;


this._maximumIndex = lastIndex;


this._minTime = start;
this._maxTime = end;
},


_onClick: function(event)
{
var x = event.x - event.target.offsetParent.offsetLeft;
var i = this._recordIndexAt(x);
var counter = this._counters[i];
if (counter)
this._timelinePanel.revealRecordAt(counter.time / 1000);
},


_onMouseOut: function(event)
{
delete this._markerXPosition;

var ctx = this._canvas.getContext("2d");
this._clearCurrentValueAndMarker(ctx);
},


_clearCurrentValueAndMarker: function(ctx)
{
for (var i = 0; i < this._counterUI.length; i++)
this._counterUI[i].clearCurrentValueAndMarker(ctx);
},


_onMouseOver: function(event)
{
this._onMouseMove(event);
},


_onMouseMove: function(event)
{
var x = event.x - event.target.offsetParent.offsetLeft
this._markerXPosition = x;
this._refreshCurrentValues();
},

_refreshCurrentValues: function()
{
if (!this._counters.length)
return;
if (this._markerXPosition === undefined)
return;
if (this._maximumIndex === -1)
return;
var i = this._recordIndexAt(this._markerXPosition);

this._updateCurrentValue(this._counters[i]);

this._highlightCurrentPositionOnGraphs(this._markerXPosition, i);
},

_updateCurrentValue: function(counterEntry)
{
for (var j = 0; j < this._counterUI.length; j++)
this._counterUI[j].updateCurrentValue(counterEntry);
},

_recordIndexAt: function(x)
{
var i;
for (i = this._minimumIndex + 1; i <= this._maximumIndex; i++) {
var statX = this._counters[i].x;
if (x < statX)
break;
}
i--;
return i;
},

_highlightCurrentPositionOnGraphs: function(x, index)
{
var ctx = this._canvas.getContext("2d");
this._restoreImageUnderMarker(ctx);
this._drawMarker(ctx, x, index);
},

_restoreImageUnderMarker: function(ctx)
{
throw new Error("Not implemented");
},

_drawMarker: function(ctx, x, index)
{
throw new Error("Not implemented");
},

visible: function()
{
return this._memorySidebarView.isShowing();
},

show: function()
{
var anchor =   (this._containerAnchor.nextSibling);
this._memorySidebarView.show(this._timelinePanel.element, anchor);
this._updateSize();
this._refreshDividers();
setTimeout(this._draw.bind(this), 0);
},

refresh: function()
{
this._updateSize();
this._refreshDividers();
this._draw();
this._refreshCurrentValues();
},

hide: function()
{
this._memorySidebarView.detach();
},

_refreshDividers: function()
{
this._timelineGrid.updateDividers(this._timelinePanel.calculator);
},

_setVerticalClip: function(originY, height)
{
this._originY = originY;
this._clippedHeight = height;
},

_calculateXValues: function()
{
if (!this._counters.length)
return;

var width = this._canvas.width;
var xFactor = width / (this._maxTime - this._minTime);

this._counters[this._minimumIndex].x = 0;
for (var i = this._minimumIndex + 1; i < this._maximumIndex; i++)
this._counters[i].x = xFactor * (this._counters[i].time - this._minTime);
this._counters[this._maximumIndex].x = width;
},

_clear: function() {
var ctx = this._canvas.getContext("2d");
ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
this._discardImageUnderMarker();
},

_discardImageUnderMarker: function()
{
throw new Error("Not implemented");
}
}

;



WebInspector.DOMCountersGraph = function(timelinePanel, model, sidebarWidth)
{
WebInspector.MemoryStatistics.call(this, timelinePanel, model, sidebarWidth);
}


WebInspector.DOMCounterUI = function(memoryCountersPane, title, currentValueLabel, rgb, valueGetter)
{
var swatchColor = "rgb(" + rgb.join(",") + ")";
WebInspector.CounterUIBase.call(this, memoryCountersPane, title, swatchColor, valueGetter)
this._range = this._swatch.element.createChild("span");

this._value = memoryCountersPane._currentValuesBar.createChild("span", "memory-counter-value");
this._value.style.color = swatchColor;
this._currentValueLabel = currentValueLabel;

this.graphColor = "rgba(" + rgb.join(",") + ",0.8)";
this.graphYValues = [];
}


WebInspector.DOMCountersGraph.Counter = function(time, documentCount, nodeCount, listenerCount)
{
WebInspector.MemoryStatistics.Counter.call(this, time);
this.documentCount = documentCount;
this.nodeCount = nodeCount;
this.listenerCount = listenerCount;
}

WebInspector.DOMCounterUI.prototype = {

setRange: function(minValue, maxValue)
{
this._range.textContent = WebInspector.UIString("[ %d - %d ]", minValue, maxValue);
},

updateCurrentValue: function(countersEntry)
{
this._value.textContent =  WebInspector.UIString(this._currentValueLabel, this.valueGetter(countersEntry));
},

clearCurrentValueAndMarker: function(ctx)
{
this._value.textContent = "";
this.restoreImageUnderMarker(ctx);
},


saveImageUnderMarker: function(ctx, x, y, radius)
{
const w = radius + 1;
var imageData = ctx.getImageData(x - w, y - w, 2 * w, 2 * w);
this._imageUnderMarker = {
x: x - w,
y: y - w,
imageData: imageData
};
},


restoreImageUnderMarker: function(ctx)
{
if (!this.visible)
return;
if (this._imageUnderMarker)
ctx.putImageData(this._imageUnderMarker.imageData, this._imageUnderMarker.x, this._imageUnderMarker.y);
this.discardImageUnderMarker();
},

discardImageUnderMarker: function()
{
delete this._imageUnderMarker;
},

__proto__: WebInspector.CounterUIBase.prototype
}


WebInspector.DOMCountersGraph.prototype = {
_createCurrentValuesBar: function()
{
this._currentValuesBar = this._canvasContainer.createChild("div");
this._currentValuesBar.id = "counter-values-bar";
this._canvasContainer.addStyleClass("dom-counters");
},


_createCounterUIList: function()
{
function getDocumentCount(entry)
{
return entry.documentCount;
}
function getNodeCount(entry)
{
return entry.nodeCount;
}
function getListenerCount(entry)
{
return entry.listenerCount;
}
return [
new WebInspector.DOMCounterUI(this, "Document Count", "Documents: %d", [100, 0, 0], getDocumentCount),
new WebInspector.DOMCounterUI(this, "DOM Node Count", "Nodes: %d", [0, 100, 0], getNodeCount),
new WebInspector.DOMCounterUI(this, "Event Listener Count", "Listeners: %d", [0, 0, 100], getListenerCount)
];
},

_canvasHeight: function()
{
return this._canvasContainer.offsetHeight - this._currentValuesBar.offsetHeight;
},


_onRecordAdded: function(event)
{
function addStatistics(record)
{
var counters = record["counters"];
if (!counters)
return;
this._counters.push(new WebInspector.DOMCountersGraph.Counter(
record.endTime || record.startTime,
counters["documents"],
counters["nodes"],
counters["jsEventListeners"]
));
}
WebInspector.TimelinePresentationModel.forAllRecords([event.data], null, addStatistics.bind(this));
},

_draw: function()
{
WebInspector.MemoryStatistics.prototype._draw.call(this);
for (var i = 0; i < this._counterUI.length; i++)
this._drawGraph(this._counterUI[i]);
},


_restoreImageUnderMarker: function(ctx)
{
for (var i = 0; i < this._counterUI.length; i++) {
var counterUI = this._counterUI[i];
if (!counterUI.visible)
continue;
counterUI.restoreImageUnderMarker(ctx);
}
},


_saveImageUnderMarker: function(ctx, x, index)
{
const radius = 2;
for (var i = 0; i < this._counterUI.length; i++) {
var counterUI = this._counterUI[i];
if (!counterUI.visible)
continue;
var y = counterUI.graphYValues[index];
counterUI.saveImageUnderMarker(ctx, x, y, radius);
}
},


_drawMarker: function(ctx, x, index)
{
this._saveImageUnderMarker(ctx, x, index);
const radius = 2;
for (var i = 0; i < this._counterUI.length; i++) {
var counterUI = this._counterUI[i];
if (!counterUI.visible)
continue;
var y = counterUI.graphYValues[index];
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2, true);
ctx.lineWidth = 1;
ctx.fillStyle = counterUI.graphColor;
ctx.strokeStyle = counterUI.graphColor;
ctx.fill();
ctx.stroke();
ctx.closePath();
}
},


_drawGraph: function(counterUI)
{
var canvas = this._canvas;
var ctx = canvas.getContext("2d");
var width = canvas.width;
var height = this._clippedHeight;
var originY = this._originY;
var valueGetter = counterUI.valueGetter;

if (!this._counters.length)
return;

var maxValue;
var minValue;
for (var i = this._minimumIndex; i <= this._maximumIndex; i++) {
var value = valueGetter(this._counters[i]);
if (minValue === undefined || value < minValue)
minValue = value;
if (maxValue === undefined || value > maxValue)
maxValue = value;
}

counterUI.setRange(minValue, maxValue);

if (!counterUI.visible)
return;

var yValues = counterUI.graphYValues;
yValues.length = this._counters.length;

var maxYRange = maxValue - minValue;
var yFactor = maxYRange ? height / (maxYRange) : 1;

ctx.beginPath();
var currentY = originY + (height - (valueGetter(this._counters[this._minimumIndex]) - minValue) * yFactor);
ctx.moveTo(0, currentY);
for (var i = this._minimumIndex; i <= this._maximumIndex; i++) {
var x = this._counters[i].x;
ctx.lineTo(x, currentY);
currentY = originY + (height - (valueGetter(this._counters[i]) - minValue) * yFactor);
ctx.lineTo(x, currentY);

yValues[i] = currentY;
}
ctx.lineTo(width, currentY);
ctx.lineWidth = 1;
ctx.strokeStyle = counterUI.graphColor;
ctx.stroke();
ctx.closePath();
},

_discardImageUnderMarker: function()
{
for (var i = 0; i < this._counterUI.length; i++)
this._counterUI[i].discardImageUnderMarker();
},

__proto__: WebInspector.MemoryStatistics.prototype
}

;



WebInspector.NativeMemoryGraph = function(timelinePanel, model, sidebarWidth)
{
WebInspector.MemoryStatistics.call(this, timelinePanel, model, sidebarWidth);
}


WebInspector.NativeMemoryGraph.Counter = function(time, nativeCounters)
{
WebInspector.MemoryStatistics.Counter.call(this, time);
this.nativeCounters = nativeCounters;
}


WebInspector.NativeMemoryCounterUI = function(memoryCountersPane, title, hsl, valueGetter)
{
var swatchColor = this._hslToString(hsl);
WebInspector.CounterUIBase.call(this, memoryCountersPane, title, swatchColor, valueGetter);
this._value = this._swatch.element.createChild("span", "memory-category-value");

const borderLightnessDifference = 3;
hsl[2] -= borderLightnessDifference;
this.strokeColor = this._hslToString(hsl);
this.graphYValues = [];
}

WebInspector.NativeMemoryCounterUI.prototype = {
_hslToString: function(hsl)
{
return "hsl(" + hsl[0] + "," + hsl[1] + "%," + hsl[2] + "%)";
},

updateCurrentValue: function(countersEntry)
{
var bytes = this.valueGetter(countersEntry);
var megabytes =  bytes / (1024 * 1024);
this._value.textContent = WebInspector.UIString("%.1f\u2009MB", megabytes);
},

clearCurrentValueAndMarker: function(ctx)
{
this._value.textContent = "";
},

__proto__: WebInspector.CounterUIBase.prototype
}


WebInspector.NativeMemoryGraph.prototype = {
_createCurrentValuesBar: function()
{
},

_createCounterUIList: function()
{
var nativeCounters = [
"JSExternalResources",
"CSS",
"GlyphCache",
"Image",
"Resources",
"DOM",
"Rendering",
"Audio",
"WebInspector",
"JSHeap.Used",
"JSHeap.Unused",
"MallocWaste",
"Other",
"PrivateBytes",
];


function getCounterValue(name, entry)
{
return (entry.nativeCounters && entry.nativeCounters[name]) || 0;
}

var list = [];
for (var i = nativeCounters.length - 1; i >= 0; i--) {
var name = nativeCounters[i];
if ("PrivateBytes" === name) {
var counterUI = new WebInspector.NativeMemoryCounterUI(this, "Total", [0, 0, 0], getCounterValue.bind(this, name))
this._privateBytesCounter = counterUI;
} else {
var counterUI = new WebInspector.NativeMemoryCounterUI(this, name, [i * 20, 65, 63], getCounterValue.bind(this, name))
list.push(counterUI);
}
}
return list.reverse();
},

_canvasHeight: function()
{
return this._canvasContainer.offsetHeight;
},


_onRecordAdded: function(event)
{
var statistics = this._counters;
function addStatistics(record)
{
var nativeCounters = record["nativeHeapStatistics"];
if (!nativeCounters)
return;

var knownSize = 0;
for (var name in nativeCounters) {
if (name === "PrivateBytes")
continue;
knownSize += nativeCounters[name];
}
nativeCounters["Other"] = nativeCounters["PrivateBytes"] - knownSize;

statistics.push(new WebInspector.NativeMemoryGraph.Counter(
record.endTime || record.startTime,
nativeCounters
));
}
WebInspector.TimelinePresentationModel.forAllRecords([event.data], null, addStatistics);
},

_draw: function()
{
WebInspector.MemoryStatistics.prototype._draw.call(this);

var maxValue = this._maxCounterValue();
this._resetTotalValues();

var previousCounterUI;
for (var i = 0; i < this._counterUI.length; i++) {
this._drawGraph(this._counterUI[i], previousCounterUI, maxValue);
if (this._counterUI[i].visible)
previousCounterUI = this._counterUI[i];
}
},


_clearCurrentValueAndMarker: function(ctx)
{
WebInspector.MemoryStatistics.prototype._clearCurrentValueAndMarker.call(this, ctx);
this._privateBytesCounter.clearCurrentValueAndMarker(ctx);
},

_updateCurrentValue: function(counterEntry)
{
WebInspector.MemoryStatistics.prototype._updateCurrentValue.call(this, counterEntry);
this._privateBytesCounter.updateCurrentValue(counterEntry);
},


_restoreImageUnderMarker: function(ctx)
{
if (this._imageUnderMarker)
ctx.putImageData(this._imageUnderMarker.imageData, this._imageUnderMarker.x, this._imageUnderMarker.y);
this._discardImageUnderMarker();
},


_saveImageUnderMarker: function(ctx, left, top, right, bottom)
{
var imageData = ctx.getImageData(left, top, right, bottom);
this._imageUnderMarker = {
x: left,
y: top,
imageData: imageData
};
},


_drawMarker: function(ctx, x, index)
{
var left = this._counters[index].x;
var right = index + 1 < this._counters.length ? this._counters[index + 1].x : left;
var top = this._originY;
top = 0;
var bottom = top + this._clippedHeight;
bottom += this._originY;

this._saveImageUnderMarker(ctx, left, top, right, bottom);

ctx.beginPath();
ctx.moveTo(left, top);
ctx.lineTo(right, top);
ctx.lineTo(right, bottom);
ctx.lineTo(left, bottom);
ctx.lineWidth = 1;
ctx.closePath();
ctx.fillStyle = "rgba(220,220,220,0.3)";
ctx.fill();
},


_maxCounterValue: function()
{
if (!this._counters.length)
return 0;

var valueGetter = this._privateBytesCounter.valueGetter;
var result = 0;
for (var i = this._minimumIndex; i < this._maximumIndex; i++) {
var counter = this._counters[i];
var value = valueGetter(counter);
if (value > result)
result = value;
}
return result;
},

_resetTotalValues: function()
{
for (var i = this._minimumIndex; i <= this._maximumIndex; i++) {
var counter = this._counters[i];
counter.total = 0;
}
},


_drawGraph: function(counterUI, previousCounterUI, maxTotalValue)
{
var canvas = this._canvas;
var ctx = canvas.getContext("2d");
var width = canvas.width;
var height = this._clippedHeight;
var originY = this._originY;
var valueGetter = counterUI.valueGetter;

if (!this._counters.length)
return;

if (!counterUI.visible)
return;

for (var i = this._minimumIndex; i <= this._maximumIndex; i++) {
var counter = this._counters[i];
var value = valueGetter(counter);
counter.total += value;
}

var yValues = counterUI.graphYValues;
yValues.length = this._counters.length;

var maxYRange =  maxTotalValue;
var yFactor = maxYRange ? height / (maxYRange) : 1;

ctx.beginPath();
if (previousCounterUI) {
var prevYValues = previousCounterUI.graphYValues;
var currentY = prevYValues[this._maximumIndex];
ctx.moveTo(width, currentY);
var currentX = width;
for (var i = this._maximumIndex - 1; i >= this._minimumIndex; i--) {
currentY = prevYValues[i];
currentX = this._counters[i].x;
ctx.lineTo(currentX, currentY);
}
} else {
var lastY = originY + height;
ctx.moveTo(width, lastY);
ctx.lineTo(0, lastY);
}

var currentY = originY + (height - this._counters[this._minimumIndex].total * yFactor);
ctx.lineTo(0, currentY);
for (var i = this._minimumIndex; i <= this._maximumIndex; i++) {
var counter = this._counters[i];
var x = counter.x;
currentY = originY + (height - counter.total * yFactor);
ctx.lineTo(x, currentY);

yValues[i] = currentY;
}
ctx.lineTo(width, currentY);
ctx.closePath();
ctx.lineWidth = 1;

ctx.strokeStyle = counterUI.strokeColor;
ctx.fillStyle = counterUI.graphColor;
ctx.fill();
ctx.stroke();
},

_discardImageUnderMarker: function()
{
delete this._imageUnderMarker;
},

__proto__: WebInspector.MemoryStatistics.prototype
}

;



WebInspector.TimelineModel = function()
{
this._records = [];
this._stringPool = new StringPool();
this._minimumRecordTime = -1;
this._maximumRecordTime = -1;
this._collectionEnabled = false;

WebInspector.timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineEventRecorded, this._onRecordAdded, this);
}

WebInspector.TimelineModel.TransferChunkLengthBytes = 5000000;

WebInspector.TimelineModel.RecordType = {
Root: "Root",
Program: "Program",
EventDispatch: "EventDispatch",

BeginFrame: "BeginFrame",
ScheduleStyleRecalculation: "ScheduleStyleRecalculation",
RecalculateStyles: "RecalculateStyles",
InvalidateLayout: "InvalidateLayout",
Layout: "Layout",
Paint: "Paint",
Rasterize: "Rasterize",
ScrollLayer: "ScrollLayer",
DecodeImage: "DecodeImage",
ResizeImage: "ResizeImage",
CompositeLayers: "CompositeLayers",

ParseHTML: "ParseHTML",

TimerInstall: "TimerInstall",
TimerRemove: "TimerRemove",
TimerFire: "TimerFire",

XHRReadyStateChange: "XHRReadyStateChange",
XHRLoad: "XHRLoad",
EvaluateScript: "EvaluateScript",

MarkLoad: "MarkLoad",
MarkDOMContent: "MarkDOMContent",

TimeStamp: "TimeStamp",
Time: "Time",
TimeEnd: "TimeEnd",

ScheduleResourceRequest: "ScheduleResourceRequest",
ResourceSendRequest: "ResourceSendRequest",
ResourceReceiveResponse: "ResourceReceiveResponse",
ResourceReceivedData: "ResourceReceivedData",
ResourceFinish: "ResourceFinish",

FunctionCall: "FunctionCall",
GCEvent: "GCEvent",

RequestAnimationFrame: "RequestAnimationFrame",
CancelAnimationFrame: "CancelAnimationFrame",
FireAnimationFrame: "FireAnimationFrame",

WebSocketCreate : "WebSocketCreate",
WebSocketSendHandshakeRequest : "WebSocketSendHandshakeRequest",
WebSocketReceiveHandshakeResponse : "WebSocketReceiveHandshakeResponse",
WebSocketDestroy : "WebSocketDestroy",
}

WebInspector.TimelineModel.Events = {
RecordAdded: "RecordAdded",
RecordsCleared: "RecordsCleared"
}

WebInspector.TimelineModel.startTimeInSeconds = function(record)
{
return record.startTime / 1000;
}

WebInspector.TimelineModel.endTimeInSeconds = function(record)
{
return (typeof record.endTime === "undefined" ? record.startTime : record.endTime) / 1000;
}

WebInspector.TimelineModel.durationInSeconds = function(record)
{
return WebInspector.TimelineModel.endTimeInSeconds(record) - WebInspector.TimelineModel.startTimeInSeconds(record);
}


WebInspector.TimelineModel.aggregateTimeForRecord = function(total, rawRecord)
{
var childrenTime = 0;
var children = rawRecord["children"] || [];
for (var i = 0; i < children.length; ++i) {
WebInspector.TimelineModel.aggregateTimeForRecord(total, children[i]);
childrenTime += WebInspector.TimelineModel.durationInSeconds(children[i]);
}
var categoryName = WebInspector.TimelinePresentationModel.recordStyle(rawRecord).category.name;
var ownTime = WebInspector.TimelineModel.durationInSeconds(rawRecord) - childrenTime;
total[categoryName] = (total[categoryName] || 0) + ownTime;
}


WebInspector.TimelineModel.aggregateTimeByCategory = function(total, addend)
{
for (var category in addend)
total[category] = (total[category] || 0) + addend[category];
}

WebInspector.TimelineModel.prototype = {

startRecord: function(includeDomCounters, includeNativeMemoryStatistics)
{
if (this._collectionEnabled)
return;
this.reset();
var maxStackFrames = WebInspector.settings.timelineLimitStackFramesFlag.get() ? WebInspector.settings.timelineStackFramesToCapture.get() : 30;
WebInspector.timelineManager.start(maxStackFrames, includeDomCounters, includeNativeMemoryStatistics);
this._collectionEnabled = true;
},

stopRecord: function()
{
if (!this._collectionEnabled)
return;
WebInspector.timelineManager.stop();
this._collectionEnabled = false;
},

get records()
{
return this._records;
},

_onRecordAdded: function(event)
{
if (this._collectionEnabled)
this._addRecord(event.data);
},

_addRecord: function(record)
{
this._stringPool.internObjectStrings(record);
this._records.push(record);
this._updateBoundaries(record);
this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordAdded, record);
},


loadFromFile: function(file, progress)
{
var delegate = new WebInspector.TimelineModelLoadFromFileDelegate(this, progress);
var fileReader = this._createFileReader(file, delegate);
var loader = new WebInspector.TimelineModelLoader(this, fileReader, progress);
fileReader.start(loader);
},


loadFromURL: function(url, progress)
{
var delegate = new WebInspector.TimelineModelLoadFromFileDelegate(this, progress);
var urlReader = new WebInspector.ChunkedXHRReader(url, delegate);
var loader = new WebInspector.TimelineModelLoader(this, urlReader, progress);
urlReader.start(loader);
},

_createFileReader: function(file, delegate)
{
return new WebInspector.ChunkedFileReader(file, WebInspector.TimelineModel.TransferChunkLengthBytes, delegate);
},

_createFileWriter: function(fileName, callback)
{
var stream = new WebInspector.FileOutputStream();
stream.open(fileName, callback);
},

saveToFile: function()
{
var now = new Date();
var fileName = "TimelineRawData-" + now.toISO8601Compact() + ".json";
function callback(stream)
{
var saver = new WebInspector.TimelineSaver(stream);
saver.save(this._records, window.navigator.appVersion);
}
this._createFileWriter(fileName, callback.bind(this));
},

reset: function()
{
this._records = [];
this._stringPool.reset();
this._minimumRecordTime = -1;
this._maximumRecordTime = -1;
this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordsCleared);
},

minimumRecordTime: function()
{
return this._minimumRecordTime;
},

maximumRecordTime: function()
{
return this._maximumRecordTime;
},

_updateBoundaries: function(record)
{
var startTime = WebInspector.TimelineModel.startTimeInSeconds(record);
var endTime = WebInspector.TimelineModel.endTimeInSeconds(record);

if (this._minimumRecordTime === -1 || startTime < this._minimumRecordTime)
this._minimumRecordTime = startTime;
if (this._maximumRecordTime === -1 || endTime > this._maximumRecordTime)
this._maximumRecordTime = endTime;
},


recordOffsetInSeconds: function(rawRecord)
{
return WebInspector.TimelineModel.startTimeInSeconds(rawRecord) - this._minimumRecordTime;
},

__proto__: WebInspector.Object.prototype
}


WebInspector.TimelineModelLoader = function(model, reader, progress)
{
this._model = model;
this._reader = reader;
this._progress = progress;
this._buffer = "";
this._firstChunk = true;
}

WebInspector.TimelineModelLoader.prototype = {

write: function(chunk)
{
var data = this._buffer + chunk;
var lastIndex = 0;
var index;
do {
index = lastIndex;
lastIndex = WebInspector.findBalancedCurlyBrackets(data, index);
} while (lastIndex !== -1)

var json = data.slice(0, index) + "]";
this._buffer = data.slice(index);

if (!index)
return;


if (!this._firstChunk)
json = "[0" + json;

var items;
try {
items =   (JSON.parse(json));
} catch (e) {
WebInspector.showErrorMessage("Malformed timeline data.");
this._model.reset();
this._reader.cancel();
this._progress.done();
return;
}

if (this._firstChunk) {
this._version = items[0];
this._firstChunk = false;
this._model.reset();
}


for (var i = 1, size = items.length; i < size; ++i)
this._model._addRecord(items[i]);
},

close: function() { }
}


WebInspector.TimelineModelLoadFromFileDelegate = function(model, progress)
{
this._model = model;
this._progress = progress;
}

WebInspector.TimelineModelLoadFromFileDelegate.prototype = {
onTransferStarted: function()
{
this._progress.setTitle(WebInspector.UIString("Loading\u2026"));
},


onChunkTransferred: function(reader)
{
if (this._progress.isCanceled()) {
reader.cancel();
this._progress.done();
this._model.reset();
return;
}

var totalSize = reader.fileSize();
if (totalSize) {
this._progress.setTotalWork(totalSize);
this._progress.setWorked(reader.loadedSize());
}
},

onTransferFinished: function()
{
this._progress.done();
},


onError: function(reader, event)
{
this._progress.done();
this._model.reset();
switch (event.target.error.code) {
case FileError.NOT_FOUND_ERR:
WebInspector.showErrorMessage(WebInspector.UIString("File \"%s\" not found.", reader.fileName()));
break;
case FileError.NOT_READABLE_ERR:
WebInspector.showErrorMessage(WebInspector.UIString("File \"%s\" is not readable", reader.fileName()));
break;
case FileError.ABORT_ERR:
break;
default:
WebInspector.showErrorMessage(WebInspector.UIString("An error occurred while reading the file \"%s\"", reader.fileName()));
}
}
}


WebInspector.TimelineSaver = function(stream)
{
this._stream = stream;
}

WebInspector.TimelineSaver.prototype = {

save: function(records, version)
{
this._records = records;
this._recordIndex = 0;
this._prologue = "[" + JSON.stringify(version);

this._writeNextChunk(this._stream);
},

_writeNextChunk: function(stream)
{
const separator = ",\n";
var data = [];
var length = 0;

if (this._prologue) {
data.push(this._prologue);
length += this._prologue.length;
delete this._prologue;
} else {
if (this._recordIndex === this._records.length) {
stream.close();
return;
}
data.push("");
}
while (this._recordIndex < this._records.length) {
var item = JSON.stringify(this._records[this._recordIndex]);
var itemLength = item.length + separator.length;
if (length + itemLength > WebInspector.TimelineModel.TransferChunkLengthBytes)
break;
length += itemLength;
data.push(item);
++this._recordIndex;
}
if (this._recordIndex === this._records.length)
data.push(data.pop() + "]");
stream.write(data.join(separator), this._writeNextChunk.bind(this));
}
}
;



WebInspector.TimelineOverviewPane = function(model)
{
WebInspector.View.call(this);
this.element.id = "timeline-overview-panel";

this._windowStartTime = 0;
this._windowEndTime = Infinity;
this._eventDividers = [];

this._model = model;

this._topPaneSidebarElement = document.createElement("div");
this._topPaneSidebarElement.id = "timeline-overview-sidebar";

var overviewTreeElement = document.createElement("ol");
overviewTreeElement.className = "sidebar-tree";
this._topPaneSidebarElement.appendChild(overviewTreeElement);
this.element.appendChild(this._topPaneSidebarElement);

var topPaneSidebarTree = new TreeOutline(overviewTreeElement);

this._overviewItems = {};
this._overviewItems[WebInspector.TimelineOverviewPane.Mode.Events] = new WebInspector.SidebarTreeElement("timeline-overview-sidebar-events",
WebInspector.UIString("Events"));
this._overviewItems[WebInspector.TimelineOverviewPane.Mode.Frames] = new WebInspector.SidebarTreeElement("timeline-overview-sidebar-frames",
WebInspector.UIString("Frames"));
this._overviewItems[WebInspector.TimelineOverviewPane.Mode.Memory] = new WebInspector.SidebarTreeElement("timeline-overview-sidebar-memory",
WebInspector.UIString("Memory"));

for (var mode in this._overviewItems) {
var item = this._overviewItems[mode];
item.onselect = this.setMode.bind(this, mode);
topPaneSidebarTree.appendChild(item);
}

this._overviewGrid = new WebInspector.OverviewGrid("timeline");
this.element.appendChild(this._overviewGrid.element);

var separatorElement = document.createElement("div");
separatorElement.id = "timeline-overview-separator";
this.element.appendChild(separatorElement);

this._innerSetMode(WebInspector.TimelineOverviewPane.Mode.Events);

var categories = WebInspector.TimelinePresentationModel.categories();
for (var category in categories)
categories[category].addEventListener(WebInspector.TimelineCategory.Events.VisibilityChanged, this._onCategoryVisibilityChanged, this);

this._overviewCalculator = new WebInspector.TimelineOverviewCalculator();

model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._reset, this);
this._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
}

WebInspector.TimelineOverviewPane.Mode = {
Events: "Events",
Frames: "Frames",
Memory: "Memory"
};

WebInspector.TimelineOverviewPane.Events = {
ModeChanged: "ModeChanged",
WindowChanged: "WindowChanged"
};

WebInspector.TimelineOverviewPane.prototype = {
wasShown: function()
{
this._update();
},

onResize: function()
{
this._update();
},

setMode: function(newMode)
{
if (this._currentMode === newMode)
return;
this._innerSetMode(newMode);
this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.ModeChanged, this._currentMode);
this._update();
},

_innerSetMode: function(newMode)
{
if (this._overviewControl)
this._overviewControl.detach();

this._currentMode = newMode;
this._overviewControl = this._createOverviewControl();
this._overviewControl.show(this._overviewGrid.element);
this._overviewItems[this._currentMode].revealAndSelect(false);
},


_createOverviewControl: function()
{
switch (this._currentMode) {
case WebInspector.TimelineOverviewPane.Mode.Events:
return new WebInspector.TimelineEventOverview(this._model);
case WebInspector.TimelineOverviewPane.Mode.Frames:
return new WebInspector.TimelineFrameOverview(this._model);
case WebInspector.TimelineOverviewPane.Mode.Memory:
return new WebInspector.TimelineMemoryOverview(this._model);
}
throw new Error("Invalid overview mode: " + this._currentMode);
},

_onCategoryVisibilityChanged: function(event)
{
this._overviewControl.categoryVisibilityChanged();
},

_update: function()
{
delete this._refreshTimeout;

this._updateWindow();
this._overviewCalculator.setWindow(this._model.minimumRecordTime(), this._model.maximumRecordTime());
this._overviewCalculator.setDisplayWindow(0, this._overviewGrid.clientWidth());

this._overviewControl.update();
this._overviewGrid.updateDividers(this._overviewCalculator);
this._updateEventDividers();
},

_updateEventDividers: function()
{
var records = this._eventDividers;
this._overviewGrid.removeEventDividers();
var dividers = [];
for (var i = 0; i < records.length; ++i) {
var record = records[i];
var positions = this._overviewCalculator.computeBarGraphPercentages(record);
var dividerPosition = Math.round(positions.start * 10);
if (dividers[dividerPosition])
continue;
var divider = WebInspector.TimelinePresentationModel.createEventDivider(record.type);
divider.style.left = positions.start + "%";
dividers[dividerPosition] = divider;
}
this._overviewGrid.addEventDividers(dividers);
},


sidebarResized: function(width)
{
this._overviewGrid.element.style.left = width + "px";
this._topPaneSidebarElement.style.width = width + "px";
this._update();
},


addFrame: function(frame)
{
this._overviewControl.addFrame(frame);
this._scheduleRefresh();
},


zoomToFrame: function(frame)
{
var frameOverview =   (this._overviewControl);
var window = frameOverview.framePosition(frame);
if (!window)
return;

this._overviewGrid.setWindowPosition(window.start, window.end);
},

_onRecordAdded: function(event)
{
var record = event.data;
var eventDividers = this._eventDividers;
function addEventDividers(record)
{
if (WebInspector.TimelinePresentationModel.isEventDivider(record))
eventDividers.push(record);
}
WebInspector.TimelinePresentationModel.forAllRecords([record], addEventDividers);
this._scheduleRefresh();
},

_reset: function()
{
this._windowStartTime = 0;
this._windowEndTime = Infinity;
this._overviewCalculator.reset();
this._overviewGrid.reset();
this._eventDividers = [];
this._overviewGrid.updateDividers(this._overviewCalculator);
this._overviewControl.reset();
this._update();
},

windowStartTime: function()
{
return this._windowStartTime || this._model.minimumRecordTime();
},

windowEndTime: function()
{
return this._windowEndTime < Infinity ? this._windowEndTime : this._model.maximumRecordTime();
},

windowLeft: function()
{
return this._overviewGrid.windowLeft();
},

windowRight: function()
{
return this._overviewGrid.windowRight();
},

_onWindowChanged: function()
{
if (this._ignoreWindowChangedEvent)
return;
var times = this._overviewControl.windowTimes(this.windowLeft(), this.windowRight());
this._windowStartTime = times.startTime;
this._windowEndTime = times.endTime;
this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.WindowChanged);
},


setWindowTimes: function(left, right)
{
this._windowStartTime = left;
this._windowEndTime = right;
this._updateWindow();
},

_updateWindow: function()
{
var offset = this._model.minimumRecordTime();
var timeSpan = this._model.maximumRecordTime() - offset;
var left = this._windowStartTime ? (this._windowStartTime - offset) / timeSpan : 0;
var right = this._windowEndTime < Infinity ? (this._windowEndTime - offset) / timeSpan : 1;
this._ignoreWindowChangedEvent = true;
this._overviewGrid.setWindow(left, right);
this._ignoreWindowChangedEvent = false;
},

_scheduleRefresh: function()
{
if (this._refreshTimeout)
return;
if (!this.isShowing())
return;
this._refreshTimeout = setTimeout(this._update.bind(this), 300);
},

__proto__: WebInspector.View.prototype
}


WebInspector.TimelineOverviewCalculator = function()
{
}

WebInspector.TimelineOverviewCalculator.prototype = {

computePosition: function(time)
{
return (time - this._minimumBoundary) / this.boundarySpan() * this._workingArea + this.paddingLeft;
},

computeBarGraphPercentages: function(record)
{
var start = (WebInspector.TimelineModel.startTimeInSeconds(record) - this._minimumBoundary) / this.boundarySpan() * 100;
var end = (WebInspector.TimelineModel.endTimeInSeconds(record) - this._minimumBoundary) / this.boundarySpan() * 100;
return {start: start, end: end};
},


setWindow: function(minimum, maximum)
{
this._minimumBoundary = minimum >= 0 ? minimum : undefined;
this._maximumBoundary = maximum >= 0 ? maximum : undefined;
},


setDisplayWindow: function(paddingLeft, clientWidth)
{
this._workingArea = clientWidth - paddingLeft;
this.paddingLeft = paddingLeft;
},

reset: function()
{
this.setWindow();
},

formatTime: function(value)
{
return Number.secondsToString(value);
},

maximumBoundary: function()
{
return this._maximumBoundary;
},

minimumBoundary: function()
{
return this._minimumBoundary;
},

zeroTime: function()
{
return this._minimumBoundary;
},

boundarySpan: function()
{
return this._maximumBoundary - this._minimumBoundary;
}
}


WebInspector.TimelineOverviewBase = function(model)
{
WebInspector.View.call(this);
this._model = model;
this._canvas = this.element.createChild("canvas", "fill");
}

WebInspector.TimelineOverviewBase.prototype = {
update: function() { },
reset: function() { },

categoryVisibilityChanged: function() { },


addFrame: function(frame) { },


windowTimes: function(windowLeft, windowRight)
{
var absoluteMin = this._model.minimumRecordTime();
var absoluteMax = this._model.maximumRecordTime();
return {
startTime: absoluteMin + (absoluteMax - absoluteMin) * windowLeft,
endTime: absoluteMin + (absoluteMax - absoluteMin) * windowRight
};
},

__proto__: WebInspector.View.prototype
}


WebInspector.TimelineMemoryOverview = function(model)
{
WebInspector.TimelineOverviewBase.call(this, model);
this.element.id = "timeline-overview-memory";
this.element.classList.add("fill");

this._maxHeapSizeLabel = this.element.createChild("div", "max memory-graph-label");
this._minHeapSizeLabel = this.element.createChild("div", "min memory-graph-label");
}

WebInspector.TimelineMemoryOverview.prototype = {
update: function()
{
var records = this._model.records;
if (!records.length)
return;

const yPadding = 5;
this._canvas.width = this.element.clientWidth;
this._canvas.height = this.element.clientHeight - yPadding;

const lowerOffset = 3;
var maxUsedHeapSize = 0;
var minUsedHeapSize = 100000000000;
var minTime = this._model.minimumRecordTime();
var maxTime = this._model.maximumRecordTime();;
WebInspector.TimelinePresentationModel.forAllRecords(records, function(r) {
maxUsedHeapSize = Math.max(maxUsedHeapSize, r.usedHeapSize || maxUsedHeapSize);
minUsedHeapSize = Math.min(minUsedHeapSize, r.usedHeapSize || minUsedHeapSize);
});
minUsedHeapSize = Math.min(minUsedHeapSize, maxUsedHeapSize);

var width = this._canvas.width;
var height = this._canvas.height - lowerOffset;
var xFactor = width / (maxTime - minTime);
var yFactor = height / (maxUsedHeapSize - minUsedHeapSize);

var histogram = new Array(width);
WebInspector.TimelinePresentationModel.forAllRecords(records, function(r) {
if (!r.usedHeapSize)
return;
var x = Math.round((WebInspector.TimelineModel.endTimeInSeconds(r) - minTime) * xFactor);
var y = Math.round((r.usedHeapSize - minUsedHeapSize) * yFactor);
histogram[x] = Math.max(histogram[x] || 0, y);
});

var ctx = this._canvas.getContext("2d");
this._clear(ctx);


height = height + 1;

ctx.beginPath();
var initialY = 0;
for (var k = 0; k < histogram.length; k++) {
if (histogram[k]) {
initialY = histogram[k];
break;
}
}
ctx.moveTo(0, height - initialY);

for (var x = 0; x < histogram.length; x++) {
if (!histogram[x])
continue;
ctx.lineTo(x, height - histogram[x]);
}

ctx.lineWidth = 0.5;
ctx.strokeStyle = "rgba(20,0,0,0.8)";
ctx.stroke();

ctx.fillStyle = "rgba(214,225,254, 0.8);";
ctx.lineTo(width, 60);
ctx.lineTo(0, 60);
ctx.lineTo(0, height - initialY);
ctx.fill();
ctx.closePath();

this._maxHeapSizeLabel.textContent = Number.bytesToString(maxUsedHeapSize);
this._minHeapSizeLabel.textContent = Number.bytesToString(minUsedHeapSize);
},

_clear: function(ctx)
{
ctx.fillStyle = "rgba(255,255,255,0.8)";
ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
},

__proto__: WebInspector.TimelineOverviewBase.prototype
}


WebInspector.TimelineEventOverview = function(model)
{
WebInspector.TimelineOverviewBase.call(this, model);

this.element.id = "timeline-overview-events";
this._context = this._canvas.getContext("2d");

this._fillStyles = {};
var categories = WebInspector.TimelinePresentationModel.categories();
for (var category in categories)
this._fillStyles[category] = WebInspector.TimelinePresentationModel.createFillStyleForCategory(this._context, 0, WebInspector.TimelineEventOverview._innerStripHeight, categories[category]);

this._disabledCategoryFillStyle = WebInspector.TimelinePresentationModel.createFillStyle(this._context, 0, WebInspector.TimelineEventOverview._innerStripHeight,
"rgb(218, 218, 218)", "rgb(170, 170, 170)", "rgb(143, 143, 143)");

this._disabledCategoryBorderStyle = "rgb(143, 143, 143)";
}


WebInspector.TimelineEventOverview._canvasHeight = 60;

WebInspector.TimelineEventOverview._numberOfStrips = 3;

WebInspector.TimelineEventOverview._stripHeight = Math.round(WebInspector.TimelineEventOverview._canvasHeight  / WebInspector.TimelineEventOverview._numberOfStrips);

WebInspector.TimelineEventOverview._stripPadding = 4;

WebInspector.TimelineEventOverview._innerStripHeight = WebInspector.TimelineEventOverview._stripHeight - 2 * WebInspector.TimelineEventOverview._stripPadding;

WebInspector.TimelineEventOverview.prototype = {
update: function()
{

this._canvas.width = this.element.parentElement.clientWidth;
this._canvas.height = WebInspector.TimelineEventOverview._canvasHeight;

var timeOffset = this._model.minimumRecordTime();
var timeSpan = this._model.maximumRecordTime() - timeOffset;
var scale = this._canvas.width / timeSpan;

var lastBarByGroup = [];

this._context.fillStyle = "rgba(0, 0, 0, 0.05)";
for (var i = 1; i < WebInspector.TimelineEventOverview._numberOfStrips; i += 2)
this._context.fillRect(0.5, i * WebInspector.TimelineEventOverview._stripHeight + 0.5, this._canvas.width, WebInspector.TimelineEventOverview._stripHeight);

function appendRecord(record)
{
if (record.type === WebInspector.TimelineModel.RecordType.BeginFrame)
return;
var recordStart = Math.floor((WebInspector.TimelineModel.startTimeInSeconds(record) - timeOffset) * scale);
var recordEnd = Math.ceil((WebInspector.TimelineModel.endTimeInSeconds(record) - timeOffset) * scale);
var category = WebInspector.TimelinePresentationModel.categoryForRecord(record);
if (category.overviewStripGroupIndex < 0)
return;
var bar = lastBarByGroup[category.overviewStripGroupIndex];

const barsMergeThreshold = 2;
if (bar && bar.category === category && bar.end + barsMergeThreshold >= recordStart) {
if (recordEnd > bar.end)
bar.end = recordEnd;
return;
}
if (bar)
this._renderBar(bar.start, bar.end, bar.category);
lastBarByGroup[category.overviewStripGroupIndex] = { start: recordStart, end: recordEnd, category: category };
}
WebInspector.TimelinePresentationModel.forAllRecords(this._model.records, appendRecord.bind(this));
for (var i = 0; i < lastBarByGroup.length; ++i) {
if (lastBarByGroup[i])
this._renderBar(lastBarByGroup[i].start, lastBarByGroup[i].end, lastBarByGroup[i].category);
}
},

categoryVisibilityChanged: function()
{
this.update();
},

_renderBar: function(begin, end, category)
{
var x = begin + 0.5;
var y = category.overviewStripGroupIndex * WebInspector.TimelineEventOverview._stripHeight + WebInspector.TimelineEventOverview._stripPadding + 0.5;
var width = Math.max(end - begin, 1);

this._context.save();
this._context.translate(x, y);
this._context.fillStyle = category.hidden ? this._disabledCategoryFillStyle : this._fillStyles[category.name];
this._context.fillRect(0, 0, width, WebInspector.TimelineEventOverview._innerStripHeight);
this._context.strokeStyle = category.hidden ? this._disabledCategoryBorderStyle : category.borderColor;
this._context.strokeRect(0, 0, width, WebInspector.TimelineEventOverview._innerStripHeight);
this._context.restore();
},

__proto__: WebInspector.TimelineOverviewBase.prototype
}


WebInspector.TimelineFrameOverview = function(model)
{
WebInspector.TimelineOverviewBase.call(this, model);
this._canvas.classList.add("timeline-frame-overview-bars");
this.reset();

this._outerPadding = 4;
this._maxInnerBarWidth = 10;


this._actualPadding = 5;
this._actualOuterBarWidth = this._maxInnerBarWidth + this._actualPadding;

this._context = this._canvas.getContext("2d");

this._fillStyles = {};
var categories = WebInspector.TimelinePresentationModel.categories();
for (var category in categories)
this._fillStyles[category] = WebInspector.TimelinePresentationModel.createFillStyleForCategory(this._context, this._maxInnerBarWidth, 0, categories[category]);
}

WebInspector.TimelineFrameOverview.prototype = {
reset: function()
{
this._recordsPerBar = 1;
this._barTimes = [];
this._frames = [];
},

update: function()
{
const minBarWidth = 4;
this._framesPerBar = Math.max(1, this._frames.length * minBarWidth / this.element.clientWidth);
this._barTimes = [];
var visibleFrames = this._aggregateFrames(this._framesPerBar);

const paddingTop = 4;



const targetFPS = 30;
var fullBarLength = 1.0 / targetFPS;
if (fullBarLength < this._medianFrameLength)
fullBarLength = Math.min(this._medianFrameLength * 2, this._maxFrameLength);

var scale = (this._canvas.clientHeight - paddingTop) / fullBarLength;
this._renderBars(visibleFrames, scale);
},


addFrame: function(frame)
{
this._frames.push(frame);
},

framePosition: function(frame)
{
var frameNumber = this._frames.indexOf(frame);
if (frameNumber < 0)
return;
var barNumber = Math.floor(frameNumber / this._framesPerBar);
var firstBar = this._framesPerBar > 1 ? barNumber : Math.max(barNumber - 1, 0);
var lastBar = this._framesPerBar > 1 ? barNumber : Math.min(barNumber + 1, this._barTimes.length - 1);
return {
start: Math.ceil(this._barNumberToScreenPosition(firstBar) - this._actualPadding / 2),
end: Math.floor(this._barNumberToScreenPosition(lastBar + 1) - this._actualPadding / 2)
}
},


_aggregateFrames: function(framesPerBar)
{
var visibleFrames = [];
var durations = [];

this._maxFrameLength = 0;

for (var barNumber = 0, currentFrame = 0; currentFrame < this._frames.length; ++barNumber) {
var barStartTime = this._frames[currentFrame].startTime;
var longestFrame = null;

for (var lastFrame = Math.min(Math.floor((barNumber + 1) * framesPerBar), this._frames.length);
currentFrame < lastFrame; ++currentFrame) {
if (!longestFrame || longestFrame.duration < this._frames[currentFrame].duration)
longestFrame = this._frames[currentFrame];
}
var barEndTime = this._frames[currentFrame - 1].endTime;
if (longestFrame) {
this._maxFrameLength = Math.max(this._maxFrameLength, longestFrame.duration);
visibleFrames.push(longestFrame);
this._barTimes.push({ startTime: barStartTime, endTime: barEndTime });
durations.push(longestFrame.duration);
}
}
this._medianFrameLength = durations.qselect(Math.floor(durations.length / 2));
return visibleFrames;
},


_renderBars: function(frames, scale)
{

this._canvas.width = this._canvas.clientWidth;
this._canvas.height = this._canvas.clientHeight;

const maxPadding = 5;
this._actualOuterBarWidth = Math.min((this._canvas.width - 2 * this._outerPadding) / frames.length, this._maxInnerBarWidth + maxPadding);
this._actualPadding = Math.min(Math.floor(this._actualOuterBarWidth / 3), maxPadding);

var barWidth = this._actualOuterBarWidth - this._actualPadding;
for (var i = 0; i < frames.length; ++i)
this._renderBar(this._barNumberToScreenPosition(i), barWidth, frames[i], scale);

this._drawFPSMarks(scale);
},


_barNumberToScreenPosition: function(n)
{
return this._outerPadding + this._actualOuterBarWidth * n;
},


_drawFPSMarks: function(scale)
{
const fpsMarks = [30, 60];

this._context.save();
this._context.beginPath();
this._context.font = "9px monospace";
this._context.textAlign = "right";
this._context.textBaseline = "top";

const labelPadding = 2;
var lineHeight = 12;
var labelTopMargin = 0;

for (var i = 0; i < fpsMarks.length; ++i) {
var fps = fpsMarks[i];

var y = this._canvas.height - Math.floor(1.0 / fps * scale) - 0.5;
var label = fps + " FPS ";
var labelWidth = this._context.measureText(label).width;
var labelX = this._canvas.width;
var labelY;

if (labelTopMargin < y - lineHeight)
labelY = y - lineHeight;
else if (y + lineHeight < this._canvas.height)
labelY = y;
else
break; 

this._context.moveTo(0, y);
this._context.lineTo(this._canvas.width, y);

this._context.fillStyle = "rgba(255, 255, 255, 0.75)";
this._context.fillRect(labelX - labelWidth - labelPadding, labelY, labelWidth + 2 * labelPadding, lineHeight);
this._context.fillStyle = "rgb(0, 0, 0)";
this._context.fillText(label, labelX, labelY);
labelTopMargin = labelY + lineHeight;
}
this._context.strokeStyle = "rgb(51, 51, 51)";
this._context.stroke();
this._context.restore();
},

_renderBar: function(left, width, frame, scale)
{
var categories = Object.keys(WebInspector.TimelinePresentationModel.categories());
if (!categories.length)
return;
var x = Math.floor(left) + 0.5;
width = Math.floor(width);

for (var i = 0, bottomOffset = this._canvas.height; i < categories.length; ++i) {
var category = categories[i];
var duration = frame.timeByCategory[category];

if (!duration)
continue;
var height = duration * scale;
var y = Math.floor(bottomOffset - height) + 0.5;

this._context.save();
this._context.translate(x, 0);
this._context.scale(width / this._maxInnerBarWidth, 1);
this._context.fillStyle = this._fillStyles[category];
this._context.fillRect(0, y, this._maxInnerBarWidth, Math.floor(height));
this._context.strokeStyle = WebInspector.TimelinePresentationModel.categories()[category].borderColor;
this._context.beginPath();
this._context.moveTo(0, y);
this._context.lineTo(this._maxInnerBarWidth, y);
this._context.stroke();
this._context.restore();

bottomOffset -= height - 1;
}

var y0 = Math.floor(this._canvas.height - frame.duration * scale) + 0.5;
var y1 = this._canvas.height + 0.5;

this._context.strokeStyle = "rgb(90, 90, 90)";
this._context.beginPath();
this._context.moveTo(x, y1);
this._context.lineTo(x, y0);
this._context.lineTo(x + width, y0);
this._context.lineTo(x + width, y1);
this._context.stroke();
},

windowTimes: function(windowLeft, windowRight)
{
var windowSpan = this.element.clientWidth;
var leftOffset = windowLeft * windowSpan - this._outerPadding + this._actualPadding;
var rightOffset = windowRight * windowSpan - this._outerPadding;
var bars = this.element.children;
var firstBar = Math.floor(Math.max(leftOffset, 0) / this._actualOuterBarWidth);
var lastBar = Math.min(Math.floor(rightOffset / this._actualOuterBarWidth), this._barTimes.length - 1);
const snapToRightTolerancePixels = 3;
return {
startTime: firstBar >= this._barTimes.length ? Infinity : this._barTimes[firstBar].startTime,
endTime: rightOffset + snapToRightTolerancePixels > windowSpan ? Infinity : this._barTimes[lastBar].endTime
}
},

__proto__: WebInspector.TimelineOverviewBase.prototype
}


WebInspector.TimelineWindowFilter = function(pane)
{
this._pane = pane;
}

WebInspector.TimelineWindowFilter.prototype = {

accept: function(record)
{
return record.lastChildEndTime >= this._pane._windowStartTime && record.startTime <= this._pane._windowEndTime;
}
}
;



WebInspector.TimelinePresentationModel = function()
{
this._linkifier = new WebInspector.Linkifier();
this._glueRecords = false;
this._filters = [];
this.reset();
}

WebInspector.TimelinePresentationModel.categories = function()
{
if (WebInspector.TimelinePresentationModel._categories)
return WebInspector.TimelinePresentationModel._categories;
WebInspector.TimelinePresentationModel._categories = {
loading: new WebInspector.TimelineCategory("loading", WebInspector.UIString("Loading"), 0, "#5A8BCC", "#8EB6E9", "#70A2E3"),
scripting: new WebInspector.TimelineCategory("scripting", WebInspector.UIString("Scripting"), 1, "#D8AA34", "#F3D07A", "#F1C453"),
rendering: new WebInspector.TimelineCategory("rendering", WebInspector.UIString("Rendering"), 2, "#8266CC", "#AF9AEB", "#9A7EE6"),
painting: new WebInspector.TimelineCategory("painting", WebInspector.UIString("Painting"), 2, "#5FA050", "#8DC286", "#71B363"),
other: new WebInspector.TimelineCategory("other", WebInspector.UIString("Other"), -1, "#BBBBBB", "#DDDDDD", "#EEEEEE")
};
return WebInspector.TimelinePresentationModel._categories;
};


WebInspector.TimelinePresentationModel._initRecordStyles = function()
{
if (WebInspector.TimelinePresentationModel._recordStylesMap)
return WebInspector.TimelinePresentationModel._recordStylesMap;

var recordTypes = WebInspector.TimelineModel.RecordType;
var categories = WebInspector.TimelinePresentationModel.categories();

var recordStyles = {};
recordStyles[recordTypes.Root] = { title: "#root", category: categories["loading"] };
recordStyles[recordTypes.Program] = { title: WebInspector.UIString("Other"), category: categories["other"] };
recordStyles[recordTypes.EventDispatch] = { title: WebInspector.UIString("Event"), category: categories["scripting"] };
recordStyles[recordTypes.BeginFrame] = { title: WebInspector.UIString("Frame Start"), category: categories["rendering"] };
recordStyles[recordTypes.ScheduleStyleRecalculation] = { title: WebInspector.UIString("Schedule Style Recalculation"), category: categories["rendering"] };
recordStyles[recordTypes.RecalculateStyles] = { title: WebInspector.UIString("Recalculate Style"), category: categories["rendering"] };
recordStyles[recordTypes.InvalidateLayout] = { title: WebInspector.UIString("Invalidate Layout"), category: categories["rendering"] };
recordStyles[recordTypes.Layout] = { title: WebInspector.UIString("Layout"), category: categories["rendering"] };
recordStyles[recordTypes.Paint] = { title: WebInspector.UIString("Paint"), category: categories["painting"] };
recordStyles[recordTypes.Rasterize] = { title: WebInspector.UIString("Rasterize"), category: categories["painting"] };
recordStyles[recordTypes.ScrollLayer] = { title: WebInspector.UIString("Scroll"), category: categories["rendering"] };
recordStyles[recordTypes.DecodeImage] = { title: WebInspector.UIString("Image Decode"), category: categories["painting"] };
recordStyles[recordTypes.ResizeImage] = { title: WebInspector.UIString("Image Resize"), category: categories["painting"] };
recordStyles[recordTypes.CompositeLayers] = { title: WebInspector.UIString("Composite Layers"), category: categories["painting"] };
recordStyles[recordTypes.ParseHTML] = { title: WebInspector.UIString("Parse HTML"), category: categories["loading"] };
recordStyles[recordTypes.TimerInstall] = { title: WebInspector.UIString("Install Timer"), category: categories["scripting"] };
recordStyles[recordTypes.TimerRemove] = { title: WebInspector.UIString("Remove Timer"), category: categories["scripting"] };
recordStyles[recordTypes.TimerFire] = { title: WebInspector.UIString("Timer Fired"), category: categories["scripting"] };
recordStyles[recordTypes.XHRReadyStateChange] = { title: WebInspector.UIString("XHR Ready State Change"), category: categories["scripting"] };
recordStyles[recordTypes.XHRLoad] = { title: WebInspector.UIString("XHR Load"), category: categories["scripting"] };
recordStyles[recordTypes.EvaluateScript] = { title: WebInspector.UIString("Evaluate Script"), category: categories["scripting"] };
recordStyles[recordTypes.ResourceSendRequest] = { title: WebInspector.UIString("Send Request"), category: categories["loading"] };
recordStyles[recordTypes.ResourceReceiveResponse] = { title: WebInspector.UIString("Receive Response"), category: categories["loading"] };
recordStyles[recordTypes.ResourceFinish] = { title: WebInspector.UIString("Finish Loading"), category: categories["loading"] };
recordStyles[recordTypes.FunctionCall] = { title: WebInspector.UIString("Function Call"), category: categories["scripting"] };
recordStyles[recordTypes.ResourceReceivedData] = { title: WebInspector.UIString("Receive Data"), category: categories["loading"] };
recordStyles[recordTypes.GCEvent] = { title: WebInspector.UIString("GC Event"), category: categories["scripting"] };
recordStyles[recordTypes.MarkDOMContent] = { title: WebInspector.UIString("DOMContentLoaded event"), category: categories["scripting"] };
recordStyles[recordTypes.MarkLoad] = { title: WebInspector.UIString("Load event"), category: categories["scripting"] };
recordStyles[recordTypes.TimeStamp] = { title: WebInspector.UIString("Stamp"), category: categories["scripting"] };
recordStyles[recordTypes.Time] = { title: WebInspector.UIString("Time"), category: categories["scripting"] };
recordStyles[recordTypes.TimeEnd] = { title: WebInspector.UIString("Time End"), category: categories["scripting"] };
recordStyles[recordTypes.ScheduleResourceRequest] = { title: WebInspector.UIString("Schedule Request"), category: categories["loading"] };
recordStyles[recordTypes.RequestAnimationFrame] = { title: WebInspector.UIString("Request Animation Frame"), category: categories["scripting"] };
recordStyles[recordTypes.CancelAnimationFrame] = { title: WebInspector.UIString("Cancel Animation Frame"), category: categories["scripting"] };
recordStyles[recordTypes.FireAnimationFrame] = { title: WebInspector.UIString("Animation Frame Fired"), category: categories["scripting"] };
recordStyles[recordTypes.WebSocketCreate] = { title: WebInspector.UIString("Create WebSocket"), category: categories["scripting"] };
recordStyles[recordTypes.WebSocketSendHandshakeRequest] = { title: WebInspector.UIString("Send WebSocket Handshake"), category: categories["scripting"] };
recordStyles[recordTypes.WebSocketReceiveHandshakeResponse] = { title: WebInspector.UIString("Receive WebSocket Handshake"), category: categories["scripting"] };
recordStyles[recordTypes.WebSocketDestroy] = { title: WebInspector.UIString("Destroy WebSocket"), category: categories["scripting"] };

WebInspector.TimelinePresentationModel._recordStylesMap = recordStyles;
return recordStyles;
}


WebInspector.TimelinePresentationModel.recordStyle = function(record)
{
var recordStyles = WebInspector.TimelinePresentationModel._initRecordStyles();
var result = recordStyles[record.type];
if (!result) {
result = {
title: WebInspector.UIString("Unknown: %s", record.type),
category: WebInspector.TimelinePresentationModel.categories()["other"]
};
recordStyles[record.type] = result;
}
return result;
}

WebInspector.TimelinePresentationModel.categoryForRecord = function(record)
{
return WebInspector.TimelinePresentationModel.recordStyle(record).category;
}

WebInspector.TimelinePresentationModel.isEventDivider = function(record)
{
var recordTypes = WebInspector.TimelineModel.RecordType;
if (record.type === recordTypes.TimeStamp)
return true;
if (record.type === recordTypes.MarkDOMContent || record.type === recordTypes.MarkLoad) {
if (record.data && ((typeof record.data.isMainFrame) === "boolean"))
return record.data.isMainFrame;
}
return false;
}


WebInspector.TimelinePresentationModel.forAllRecords = function(recordsArray, preOrderCallback, postOrderCallback)
{
if (!recordsArray)
return;
var stack = [{array: recordsArray, index: 0}];
while (stack.length) {
var entry = stack[stack.length - 1];
var records = entry.array;
if (entry.index < records.length) {
var record = records[entry.index];
if (preOrderCallback && preOrderCallback(record))
return;
if (record.children)
stack.push({array: record.children, index: 0, record: record});
else if (postOrderCallback && postOrderCallback(record))
return;
++entry.index;
} else {
if (entry.record && postOrderCallback && postOrderCallback(entry.record))
return;
stack.pop();
}
}
}


WebInspector.TimelinePresentationModel.needsPreviewElement = function(recordType)
{
if (!recordType)
return false;
const recordTypes = WebInspector.TimelineModel.RecordType;
switch (recordType) {
case recordTypes.ScheduleResourceRequest:
case recordTypes.ResourceSendRequest:
case recordTypes.ResourceReceiveResponse:
case recordTypes.ResourceReceivedData:
case recordTypes.ResourceFinish:
return true;
default:
return false;
}
}


WebInspector.TimelinePresentationModel.createEventDivider = function(recordType, title)
{
var eventDivider = document.createElement("div");
eventDivider.className = "resources-event-divider";
var recordTypes = WebInspector.TimelineModel.RecordType;

if (recordType === recordTypes.MarkDOMContent)
eventDivider.className += " resources-blue-divider";
else if (recordType === recordTypes.MarkLoad)
eventDivider.className += " resources-red-divider";
else if (recordType === recordTypes.TimeStamp)
eventDivider.className += " resources-orange-divider";
else if (recordType === recordTypes.BeginFrame)
eventDivider.className += " timeline-frame-divider";

if (title)
eventDivider.title = title;

return eventDivider;
}

WebInspector.TimelinePresentationModel._hiddenRecords = { }
WebInspector.TimelinePresentationModel._hiddenRecords[WebInspector.TimelineModel.RecordType.MarkDOMContent] = 1;
WebInspector.TimelinePresentationModel._hiddenRecords[WebInspector.TimelineModel.RecordType.MarkLoad] = 1;
WebInspector.TimelinePresentationModel._hiddenRecords[WebInspector.TimelineModel.RecordType.ScheduleStyleRecalculation] = 1;
WebInspector.TimelinePresentationModel._hiddenRecords[WebInspector.TimelineModel.RecordType.InvalidateLayout] = 1;

WebInspector.TimelinePresentationModel.prototype = {

addFilter: function(filter)
{
this._filters.push(filter);
},


removeFilter: function(filter)
{
var index = this._filters.indexOf(filter);
if (index !== -1)
this._filters.splice(index, 1);
},

rootRecord: function()
{
return this._rootRecord;
},

frames: function()
{
return this._frames;
},

reset: function()
{
this._linkifier.reset();
this._rootRecord = new WebInspector.TimelinePresentationModel.Record(this, { type: WebInspector.TimelineModel.RecordType.Root }, null, null, null, false);
this._sendRequestRecords = {};
this._scheduledResourceRequests = {};
this._timerRecords = {};
this._requestAnimationFrameRecords = {};
this._eventDividerRecords = [];
this._timeRecords = {};
this._timeRecordStack = [];
this._frames = [];
this._minimumRecordTime = -1;
this._layoutInvalidateStack = {};
this._lastScheduleStyleRecalculation = {};
this._webSocketCreateRecords = {};
this._coalescingBuckets = {};
},

addFrame: function(frame)
{
this._frames.push(frame);
},

addRecord: function(record)
{
if (this._minimumRecordTime === -1 || record.startTime < this._minimumRecordTime)
this._minimumRecordTime = WebInspector.TimelineModel.startTimeInSeconds(record);

var records;
if (record.type === WebInspector.TimelineModel.RecordType.Program)
records = record.children;
else
records = [record];

var formattedRecords = [];
var recordsCount = records.length;
for (var i = 0; i < recordsCount; ++i)
formattedRecords.push(this._innerAddRecord(records[i], this._rootRecord));
return formattedRecords;
},

_innerAddRecord: function(record, parentRecord)
{
const recordTypes = WebInspector.TimelineModel.RecordType;
var isHiddenRecord = record.type in WebInspector.TimelinePresentationModel._hiddenRecords;
var origin;
var coalescingBucket;

if (!isHiddenRecord) {
var newParentRecord = this._findParentRecord(record);
if (newParentRecord) {
origin = parentRecord;
parentRecord = newParentRecord;
}
if (parentRecord === this._rootRecord) {

coalescingBucket = record.thread ? record.type : "mainThread";
var coalescedRecord = this._findCoalescedParent(record, coalescingBucket);
if (coalescedRecord) {
if (!origin)
origin = parentRecord;
parentRecord = coalescedRecord;
}
}
}

var children = record.children;
var scriptDetails;
if (record.data && record.data["scriptName"]) {
scriptDetails = {
scriptName: record.data["scriptName"],
scriptLine: record.data["scriptLine"]
}
};

if ((record.type === recordTypes.TimerFire || record.type === recordTypes.FireAnimationFrame) && children && children.length) {
var childRecord = children[0];
if (childRecord.type === recordTypes.FunctionCall) {
scriptDetails = {
scriptName: childRecord.data["scriptName"],
scriptLine: childRecord.data["scriptLine"]
};
children = childRecord.children.concat(children.slice(1));
}
}

var formattedRecord = new WebInspector.TimelinePresentationModel.Record(this, record, parentRecord, origin, scriptDetails, isHiddenRecord);

if (WebInspector.TimelinePresentationModel.isEventDivider(formattedRecord))
this._eventDividerRecords.push(formattedRecord);

if (isHiddenRecord)
return formattedRecord;

formattedRecord.collapsed = parentRecord === this._rootRecord;
if (coalescingBucket)
this._coalescingBuckets[coalescingBucket] = formattedRecord;

var childrenCount = children ? children.length : 0;
for (var i = 0; i < childrenCount; ++i)
this._innerAddRecord(children[i], formattedRecord);

formattedRecord.calculateAggregatedStats();

if (origin)
this._updateAncestorStats(formattedRecord);

if (parentRecord.coalesced && parentRecord.startTime > formattedRecord.startTime)
parentRecord._record.startTime = record.startTime;

origin = formattedRecord.origin();
if (!origin.isRoot() && !origin.coalesced)
origin.selfTime -= formattedRecord.endTime - formattedRecord.startTime;
return formattedRecord;
},


_updateAncestorStats: function(record)
{
var lastChildEndTime = record.lastChildEndTime;
var aggregatedStats = record.aggregatedStats;
for (var currentRecord = record.parent; currentRecord && !currentRecord.isRoot(); currentRecord = currentRecord.parent) {
currentRecord._cpuTime += record._cpuTime;
if (currentRecord.lastChildEndTime < lastChildEndTime)
currentRecord.lastChildEndTime = lastChildEndTime;
for (var category in aggregatedStats)
currentRecord.aggregatedStats[category] += aggregatedStats[category];
}
},


_findCoalescedParent: function(record, bucket)
{
const coalescingThresholdSeconds = 0.001;

var lastRecord = this._coalescingBuckets[bucket];
var startTime = WebInspector.TimelineModel.startTimeInSeconds(record);
var endTime = WebInspector.TimelineModel.endTimeInSeconds(record);
if (!lastRecord || lastRecord.type !== record.type)
return null;
if (lastRecord.endTime + coalescingThresholdSeconds < startTime)
return null;
if (endTime + coalescingThresholdSeconds < lastRecord.startTime)
return null;
if (lastRecord.parent.coalesced)
return lastRecord.parent;

if (lastRecord.parent !== this._rootRecord)
return null;
return this._replaceWithCoalescedRecord(lastRecord);
},


_replaceWithCoalescedRecord: function(record)
{
var rawRecord = {
type: record._record.type,
startTime: record._record.startTime,
endTime: record._record.endTime,
data: { }
};
if (record._record.thread)
rawRecord.thread = "aggregated";
var coalescedRecord = new WebInspector.TimelinePresentationModel.Record(this, rawRecord, null, null, null, false);
var parent = record.parent;

coalescedRecord.coalesced = true;
coalescedRecord.collapsed = true;
coalescedRecord._children.push(record);
record.parent = coalescedRecord;
coalescedRecord.calculateAggregatedStats();
if (record.hasWarning || record.childHasWarning)
coalescedRecord.childHasWarning = true;

coalescedRecord.parent = parent;
parent._children[parent._children.indexOf(record)] = coalescedRecord;
return coalescedRecord;
},

_findParentRecord: function(record)
{
if (!this._glueRecords)
return null;
var recordTypes = WebInspector.TimelineModel.RecordType;

switch (record.type) {
case recordTypes.ResourceReceiveResponse:
case recordTypes.ResourceFinish:
case recordTypes.ResourceReceivedData:
return this._sendRequestRecords[record.data["requestId"]];

case recordTypes.ResourceSendRequest:
return this._rootRecord;

case recordTypes.TimerFire:
return this._timerRecords[record.data["timerId"]];

case recordTypes.ResourceSendRequest:
return this._scheduledResourceRequests[record.data["url"]];

case recordTypes.FireAnimationFrame:
return this._requestAnimationFrameRecords[record.data["id"]];

case recordTypes.Time:
return this._rootRecord;

case recordTypes.TimeEnd:
return this._timeRecords[record.data["message"]];
}
},

setGlueRecords: function(glue)
{
this._glueRecords = glue;
},

invalidateFilteredRecords: function()
{
delete this._filteredRecords;
},

filteredRecords: function()
{
if (this._filteredRecords)
return this._filteredRecords;

var recordsInWindow = [];

var stack = [{children: this._rootRecord.children, index: 0, parentIsCollapsed: false}];
while (stack.length) {
var entry = stack[stack.length - 1];
var records = entry.children;
if (records && entry.index < records.length) {
var record = records[entry.index];
++entry.index;

if (this.isVisible(record)) {
++record.parent._invisibleChildrenCount;
if (!entry.parentIsCollapsed)
recordsInWindow.push(record);
}

record._invisibleChildrenCount = 0;

stack.push({children: record.children,
index: 0,
parentIsCollapsed: (entry.parentIsCollapsed || record.collapsed),
parentRecord: record,
windowLengthBeforeChildrenTraversal: recordsInWindow.length});
} else {
stack.pop();
if (entry.parentRecord)
entry.parentRecord._visibleChildrenCount = recordsInWindow.length - entry.windowLengthBeforeChildrenTraversal;
}
}

this._filteredRecords = recordsInWindow;
return recordsInWindow;
},

filteredFrames: function(startTime, endTime)
{
function compareStartTime(value, object)
{
return value - object.startTime;
}
function compareEndTime(value, object)
{
return value - object.endTime;
}
var firstFrame = insertionIndexForObjectInListSortedByFunction(startTime, this._frames, compareStartTime);
var lastFrame = insertionIndexForObjectInListSortedByFunction(endTime, this._frames, compareEndTime);
while (lastFrame < this._frames.length && this._frames[lastFrame].endTime <= endTime)
++lastFrame;
return this._frames.slice(firstFrame, lastFrame);
},

eventDividerRecords: function()
{
return this._eventDividerRecords;
},

isVisible: function(record)
{
for (var i = 0; i < this._filters.length; ++i) {
if (!this._filters[i].accept(record))
return false;
}
return true;
},


generateMainThreadBarPopupContent: function(info)
{
var firstTaskIndex = info.firstTaskIndex;
var lastTaskIndex = info.lastTaskIndex;
var tasks = info.tasks;
var messageCount = lastTaskIndex - firstTaskIndex + 1;
var cpuTime = 0;

for (var i = firstTaskIndex; i <= lastTaskIndex; ++i) {
var task = tasks[i];
cpuTime += task.endTime - task.startTime;
}
var startTime = tasks[firstTaskIndex].startTime;
var endTime = tasks[lastTaskIndex].endTime;
var duration = endTime - startTime;
var offset = this._minimumRecordTime;

var contentHelper = new WebInspector.PopoverContentHelper(WebInspector.UIString("CPU"));
var durationText = WebInspector.UIString("%s (at %s)", Number.secondsToString(duration, true),
Number.secondsToString(startTime - offset, true));
contentHelper.appendTextRow(WebInspector.UIString("Duration"), durationText);
contentHelper.appendTextRow(WebInspector.UIString("CPU time"), Number.secondsToString(cpuTime, true));
contentHelper.appendTextRow(WebInspector.UIString("Message Count"), messageCount);
return contentHelper.contentTable();
},

__proto__: WebInspector.Object.prototype
}


WebInspector.TimelinePresentationModel.Record = function(presentationModel, record, parentRecord, origin, scriptDetails, hidden)
{
this._linkifier = presentationModel._linkifier;
this._aggregatedStats = {};
this._record = record;
this._children = [];
if (!hidden && parentRecord) {
this.parent = parentRecord;
if (this.isBackground)
WebInspector.TimelinePresentationModel.insertRetrospectiveRecord(parentRecord, this);
else
parentRecord.children.push(this);
}
if (origin)
this._origin = origin;

this._selfTime = this.endTime - this.startTime;
this._lastChildEndTime = this.endTime;
this._startTimeOffset = this.startTime - presentationModel._minimumRecordTime;

if (record.data && record.data["url"])
this.url = record.data["url"];
if (scriptDetails) {
this.scriptName = scriptDetails.scriptName;
this.scriptLine = scriptDetails.scriptLine;
}
if (parentRecord && parentRecord.callSiteStackTrace)
this.callSiteStackTrace = parentRecord.callSiteStackTrace;

var recordTypes = WebInspector.TimelineModel.RecordType;
switch (record.type) {
case recordTypes.ResourceSendRequest:

presentationModel._sendRequestRecords[record.data["requestId"]] = this;
break;

case recordTypes.ScheduleResourceRequest:
presentationModel._scheduledResourceRequests[record.data["url"]] = this;
break;

case recordTypes.ResourceReceiveResponse:
var sendRequestRecord = presentationModel._sendRequestRecords[record.data["requestId"]];
if (sendRequestRecord) { 
this.url = sendRequestRecord.url;

sendRequestRecord._refreshDetails();
if (sendRequestRecord.parent !== presentationModel._rootRecord && sendRequestRecord.parent.type === recordTypes.ScheduleResourceRequest)
sendRequestRecord.parent._refreshDetails();
}
break;

case recordTypes.ResourceReceivedData:
case recordTypes.ResourceFinish:
var sendRequestRecord = presentationModel._sendRequestRecords[record.data["requestId"]];
if (sendRequestRecord) 
this.url = sendRequestRecord.url;
break;

case recordTypes.TimerInstall:
this.timeout = record.data["timeout"];
this.singleShot = record.data["singleShot"];
presentationModel._timerRecords[record.data["timerId"]] = this;
break;

case recordTypes.TimerFire:
var timerInstalledRecord = presentationModel._timerRecords[record.data["timerId"]];
if (timerInstalledRecord) {
this.callSiteStackTrace = timerInstalledRecord.stackTrace;
this.timeout = timerInstalledRecord.timeout;
this.singleShot = timerInstalledRecord.singleShot;
}
break;

case recordTypes.RequestAnimationFrame:
presentationModel._requestAnimationFrameRecords[record.data["id"]] = this;
break;

case recordTypes.FireAnimationFrame:
var requestAnimationRecord = presentationModel._requestAnimationFrameRecords[record.data["id"]];
if (requestAnimationRecord)
this.callSiteStackTrace = requestAnimationRecord.stackTrace;
break;

case recordTypes.Time:
var message = record.data["message"];
var oldReference = presentationModel._timeRecords[message];
if (oldReference)
break;
presentationModel._timeRecords[message] = this;
if (origin)
presentationModel._timeRecordStack.push(this);
break;

case recordTypes.TimeEnd:
var message = record.data["message"];
var timeRecord = presentationModel._timeRecords[message];
delete presentationModel._timeRecords[message];
if (timeRecord) {
this.timeRecord = timeRecord;
timeRecord.timeEndRecord = this;
var intervalDuration = this.startTime - timeRecord.startTime;
this.intervalDuration = intervalDuration;
timeRecord.intervalDuration = intervalDuration;
if (!origin)
break;
var recordStack = presentationModel._timeRecordStack;
recordStack.splice(recordStack.indexOf(timeRecord), 1);
for (var index = recordStack.length; index; --index) {
var openRecord = recordStack[index - 1];
if (openRecord.startTime > timeRecord.startTime)
continue;
WebInspector.TimelinePresentationModel.adoptRecord(openRecord, timeRecord);
break;
}
}
break;

case recordTypes.ScheduleStyleRecalculation:
presentationModel._lastScheduleStyleRecalculation[this.frameId] = this;
break;

case recordTypes.RecalculateStyles:
var scheduleStyleRecalculationRecord = presentationModel._lastScheduleStyleRecalculation[this.frameId];
if (!scheduleStyleRecalculationRecord)
break;
this.callSiteStackTrace = scheduleStyleRecalculationRecord.stackTrace;
break;

case recordTypes.InvalidateLayout:


var styleRecalcStack;
if (!presentationModel._layoutInvalidateStack[this.frameId]) {
for (var outerRecord = parentRecord; outerRecord; outerRecord = record.parent) {
if (outerRecord.type === recordTypes.RecalculateStyles) {
styleRecalcStack = outerRecord.callSiteStackTrace;
break;
}
}
}
presentationModel._layoutInvalidateStack[this.frameId] = styleRecalcStack || this.stackTrace;
break;

case recordTypes.Layout:
var layoutInvalidateStack = presentationModel._layoutInvalidateStack[this.frameId];
if (layoutInvalidateStack)
this.callSiteStackTrace = layoutInvalidateStack;
if (this.stackTrace)
this.setHasWarning();
presentationModel._layoutInvalidateStack[this.frameId] = null;
this.highlightQuad = record.data.root || WebInspector.TimelinePresentationModel.quadFromRectData(record.data);
break;

case recordTypes.Paint:
this.highlightQuad = record.data.clip || WebInspector.TimelinePresentationModel.quadFromRectData(record.data);
break;

case recordTypes.WebSocketCreate:
this.webSocketURL = record.data["url"];
if (typeof record.data["webSocketProtocol"] !== "undefined")
this.webSocketProtocol = record.data["webSocketProtocol"];
presentationModel._webSocketCreateRecords[record.data["identifier"]] = this;
break;

case recordTypes.WebSocketSendHandshakeRequest:
case recordTypes.WebSocketReceiveHandshakeResponse:
case recordTypes.WebSocketDestroy:
var webSocketCreateRecord = presentationModel._webSocketCreateRecords[record.data["identifier"]];
if (webSocketCreateRecord) { 
this.webSocketURL = webSocketCreateRecord.webSocketURL;
if (typeof webSocketCreateRecord.webSocketProtocol !== "undefined")
this.webSocketProtocol = webSocketCreateRecord.webSocketProtocol;
}
break;
}
}

WebInspector.TimelinePresentationModel.adoptRecord = function(newParent, record)
{
record.parent.children.splice(record.parent.children.indexOf(record));
WebInspector.TimelinePresentationModel.insertRetrospectiveRecord(newParent, record);
record.parent = newParent;
}

WebInspector.TimelinePresentationModel.insertRetrospectiveRecord = function(parent, record)
{
function compareStartTime(value, record)
{
return value < record.startTime ? -1 : 1;
}

parent.children.splice(insertionIndexForObjectInListSortedByFunction(record.startTime, parent.children, compareStartTime), 0, record);
}

WebInspector.TimelinePresentationModel.Record.prototype = {
get lastChildEndTime()
{
return this._lastChildEndTime;
},

set lastChildEndTime(time)
{
this._lastChildEndTime = time;
},

get selfTime()
{
return this.coalesced ? this._lastChildEndTime - this.startTime : this._selfTime;
},

set selfTime(time)
{
this._selfTime = time;
},

get cpuTime()
{
return this._cpuTime;
},


isRoot: function()
{
return this.type === WebInspector.TimelineModel.RecordType.Root;
},


origin: function()
{
return this._origin || this.parent;
},


get children()
{
return this._children;
},


get visibleChildrenCount()
{
return this._visibleChildrenCount || 0;
},


get invisibleChildrenCount()
{
return this._invisibleChildrenCount || 0;
},


get category()
{
return WebInspector.TimelinePresentationModel.recordStyle(this._record).category
},


get title()
{
return this.type === WebInspector.TimelineModel.RecordType.TimeStamp ? this._record.data["message"] :
WebInspector.TimelinePresentationModel.recordStyle(this._record).title;
},


get startTime()
{
return WebInspector.TimelineModel.startTimeInSeconds(this._record);
},


get endTime()
{
return WebInspector.TimelineModel.endTimeInSeconds(this._record);
},


get isBackground()
{
return !!this._record.thread;
},


get data()
{
return this._record.data;
},


get type()
{
return this._record.type;
},


get frameId()
{
return this._record.frameId;
},


get usedHeapSizeDelta()
{
return this._record.usedHeapSizeDelta || 0;
},


get usedHeapSize()
{
return this._record.usedHeapSize;
},


get stackTrace()
{
if (this._record.stackTrace && this._record.stackTrace.length)
return this._record.stackTrace;
return null;
},

containsTime: function(time)
{
return this.startTime <= time && time <= this.endTime;
},


generatePopupContent: function(callback)
{
if (WebInspector.TimelinePresentationModel.needsPreviewElement(this.type))
WebInspector.DOMPresentationUtils.buildImagePreviewContents(this.url, false, this._generatePopupContentWithImagePreview.bind(this, callback));
else
this._generatePopupContentWithImagePreview(callback);
},


_generatePopupContentWithImagePreview: function(callback, previewElement)
{
var contentHelper = new WebInspector.PopoverContentHelper(this.title);
var text = WebInspector.UIString("%s (at %s)", Number.secondsToString(this._lastChildEndTime - this.startTime, true),
Number.secondsToString(this._startTimeOffset));
contentHelper.appendTextRow(WebInspector.UIString("Duration"), text);

if (this._children.length) {
if (!this.coalesced)
contentHelper.appendTextRow(WebInspector.UIString("Self Time"), Number.secondsToString(this._selfTime, true));
contentHelper.appendTextRow(WebInspector.UIString("CPU Time"), Number.secondsToString(this._cpuTime, true));
contentHelper.appendElementRow(WebInspector.UIString("Aggregated Time"),
WebInspector.TimelinePresentationModel._generateAggregatedInfo(this._aggregatedStats));
}

if (this.coalesced) {
callback(contentHelper.contentTable());
return;
}
const recordTypes = WebInspector.TimelineModel.RecordType;


var callSiteStackTraceLabel;
var callStackLabel;

switch (this.type) {
case recordTypes.GCEvent:
contentHelper.appendTextRow(WebInspector.UIString("Collected"), Number.bytesToString(this.data["usedHeapSizeDelta"]));
break;
case recordTypes.TimerInstall:
case recordTypes.TimerFire:
case recordTypes.TimerRemove:
contentHelper.appendTextRow(WebInspector.UIString("Timer ID"), this.data["timerId"]);
if (typeof this.timeout === "number") {
contentHelper.appendTextRow(WebInspector.UIString("Timeout"), Number.secondsToString(this.timeout / 1000));
contentHelper.appendTextRow(WebInspector.UIString("Repeats"), !this.singleShot);
}
break;
case recordTypes.FireAnimationFrame:
contentHelper.appendTextRow(WebInspector.UIString("Callback ID"), this.data["id"]);
break;
case recordTypes.FunctionCall:
contentHelper.appendElementRow(WebInspector.UIString("Location"), this._linkifyScriptLocation());
break;
case recordTypes.ScheduleResourceRequest:
case recordTypes.ResourceSendRequest:
case recordTypes.ResourceReceiveResponse:
case recordTypes.ResourceReceivedData:
case recordTypes.ResourceFinish:
contentHelper.appendElementRow(WebInspector.UIString("Resource"), WebInspector.linkifyResourceAsNode(this.url));
if (previewElement)
contentHelper.appendElementRow(WebInspector.UIString("Preview"), previewElement);
if (this.data["requestMethod"])
contentHelper.appendTextRow(WebInspector.UIString("Request Method"), this.data["requestMethod"]);
if (typeof this.data["statusCode"] === "number")
contentHelper.appendTextRow(WebInspector.UIString("Status Code"), this.data["statusCode"]);
if (this.data["mimeType"])
contentHelper.appendTextRow(WebInspector.UIString("MIME Type"), this.data["mimeType"]);
if (this.data["encodedDataLength"])
contentHelper.appendTextRow(WebInspector.UIString("Encoded Data Length"), WebInspector.UIString("%d Bytes", this.data["encodedDataLength"]));
break;
case recordTypes.EvaluateScript:
if (this.data && this.url)
contentHelper.appendElementRow(WebInspector.UIString("Script"), this._linkifyLocation(this.url, this.data["lineNumber"]));
break;
case recordTypes.Paint:
var clip = this.data["clip"];
if (clip) {
contentHelper.appendTextRow(WebInspector.UIString("Location"), WebInspector.UIString("(%d, %d)", clip[0], clip[1]));
var clipWidth = WebInspector.TimelinePresentationModel.quadWidth(clip);
var clipHeight = WebInspector.TimelinePresentationModel.quadHeight(clip);
contentHelper.appendTextRow(WebInspector.UIString("Dimensions"), WebInspector.UIString("%d × %d", clipWidth, clipHeight));
} else {

if (typeof this.data["x"] !== "undefined" && typeof this.data["y"] !== "undefined")
contentHelper.appendTextRow(WebInspector.UIString("Location"), WebInspector.UIString("(%d, %d)", this.data["x"], this.data["y"]));
if (typeof this.data["width"] !== "undefined" && typeof this.data["height"] !== "undefined")
contentHelper.appendTextRow(WebInspector.UIString("Dimensions"), WebInspector.UIString("%d\u2009\u00d7\u2009%d", this.data["width"], this.data["height"]));
}
break;
case recordTypes.RecalculateStyles: 
if (this.data["elementCount"])
contentHelper.appendTextRow(WebInspector.UIString("Elements affected"), this.data["elementCount"]);
callStackLabel = WebInspector.UIString("Styles recalculation forced");
break;
case recordTypes.Layout:
if (this.data["dirtyObjects"])
contentHelper.appendTextRow(WebInspector.UIString("Nodes that need layout"), this.data["dirtyObjects"]);
if (this.data["totalObjects"])
contentHelper.appendTextRow(WebInspector.UIString("Layout tree size"), this.data["totalObjects"]);
if (typeof this.data["partialLayout"] === "boolean") {
contentHelper.appendTextRow(WebInspector.UIString("Layout scope"),
this.data["partialLayout"] ? WebInspector.UIString("Partial") : WebInspector.UIString("Whole document"));
}
callSiteStackTraceLabel = WebInspector.UIString("Layout invalidated");
if (this.stackTrace) {
callStackLabel = WebInspector.UIString("Layout forced");
contentHelper.appendTextRow(WebInspector.UIString("Note"), WebInspector.UIString("Forced synchronous layout is a possible performance bottleneck."));
}
break;
case recordTypes.Time:
case recordTypes.TimeEnd:
contentHelper.appendTextRow(WebInspector.UIString("Message"), this.data["message"]);
if (typeof this.intervalDuration === "number")
contentHelper.appendTextRow(WebInspector.UIString("Interval Duration"), Number.secondsToString(this.intervalDuration, true));
break;
case recordTypes.WebSocketCreate:
case recordTypes.WebSocketSendHandshakeRequest:
case recordTypes.WebSocketReceiveHandshakeResponse:
case recordTypes.WebSocketDestroy:
if (typeof this.webSocketURL !== "undefined")
contentHelper.appendTextRow(WebInspector.UIString("URL"), this.webSocketURL);
if (typeof this.webSocketProtocol !== "undefined")
contentHelper.appendTextRow(WebInspector.UIString("WebSocket Protocol"), this.webSocketProtocol);
if (typeof this.data["message"] !== "undefined")
contentHelper.appendTextRow(WebInspector.UIString("Message"), this.data["message"])
break;
default:
if (this.detailsNode())
contentHelper.appendElementRow(WebInspector.UIString("Details"), this.detailsNode().childNodes[1].cloneNode());
break;
}

if (this.scriptName && this.type !== recordTypes.FunctionCall)
contentHelper.appendElementRow(WebInspector.UIString("Function Call"), this._linkifyScriptLocation());

if (this.usedHeapSize) {
if (this.usedHeapSizeDelta) {
var sign = this.usedHeapSizeDelta > 0 ? "+" : "-";
contentHelper.appendTextRow(WebInspector.UIString("Used Heap Size"),
WebInspector.UIString("%s (%s%s)", Number.bytesToString(this.usedHeapSize), sign, Number.bytesToString(this.usedHeapSizeDelta)));
} else if (this.category === WebInspector.TimelinePresentationModel.categories().scripting)
contentHelper.appendTextRow(WebInspector.UIString("Used Heap Size"), Number.bytesToString(this.usedHeapSize));
}

if (this.callSiteStackTrace)
contentHelper.appendStackTrace(callSiteStackTraceLabel || WebInspector.UIString("Call Site stack"), this.callSiteStackTrace, this._linkifyCallFrame.bind(this));

if (this.stackTrace)
contentHelper.appendStackTrace(callStackLabel || WebInspector.UIString("Call Stack"), this.stackTrace, this._linkifyCallFrame.bind(this));

callback(contentHelper.contentTable());
},

_refreshDetails: function()
{
delete this._detailsNode;
},


detailsNode: function()
{
if (typeof this._detailsNode === "undefined") {
this._detailsNode = this._getRecordDetails();

if (this._detailsNode) {
this._detailsNode.insertBefore(document.createTextNode("("), this._detailsNode.firstChild);
this._detailsNode.appendChild(document.createTextNode(")"));
}
}
return this._detailsNode;
},

_createSpanWithText: function(textContent)
{
var node = document.createElement("span");
node.textContent = textContent;
return node;
},


_getRecordDetails: function()
{
var details;
if (this.coalesced)
return this._createSpanWithText(WebInspector.UIString("× %d", this.children.length));

switch (this.type) {
case WebInspector.TimelineModel.RecordType.GCEvent:
details = WebInspector.UIString("%s collected", Number.bytesToString(this.data["usedHeapSizeDelta"]));
break;
case WebInspector.TimelineModel.RecordType.TimerFire:
details = this._linkifyScriptLocation(this.data["timerId"]);
break;
case WebInspector.TimelineModel.RecordType.FunctionCall:
details = this._linkifyScriptLocation();
break;
case WebInspector.TimelineModel.RecordType.FireAnimationFrame:
details = this._linkifyScriptLocation(this.data["id"]);
break;
case WebInspector.TimelineModel.RecordType.EventDispatch:
details = this.data ? this.data["type"] : null;
break;
case WebInspector.TimelineModel.RecordType.Paint:
var width = this.data.clip ? WebInspector.TimelinePresentationModel.quadWidth(this.data.clip) : this.data.width;
var height = this.data.clip ? WebInspector.TimelinePresentationModel.quadHeight(this.data.clip) : this.data.height;
if (width && height)
details = WebInspector.UIString("%d\u2009\u00d7\u2009%d", width, height);
break;
case WebInspector.TimelineModel.RecordType.DecodeImage:
details = this.data["imageType"];
break;
case WebInspector.TimelineModel.RecordType.ResizeImage:
details = this.data["cached"] ? WebInspector.UIString("cached") : WebInspector.UIString("non-cached");
break;
case WebInspector.TimelineModel.RecordType.TimerInstall:
case WebInspector.TimelineModel.RecordType.TimerRemove:
details = this._linkifyTopCallFrame(this.data["timerId"]);
break;
case WebInspector.TimelineModel.RecordType.RequestAnimationFrame:
case WebInspector.TimelineModel.RecordType.CancelAnimationFrame:
details = this._linkifyTopCallFrame(this.data["id"]);
break;
case WebInspector.TimelineModel.RecordType.ParseHTML:
case WebInspector.TimelineModel.RecordType.RecalculateStyles:
details = this._linkifyTopCallFrame();
break;
case WebInspector.TimelineModel.RecordType.EvaluateScript:
details = this.url ? this._linkifyLocation(this.url, this.data["lineNumber"], 0) : null;
break;
case WebInspector.TimelineModel.RecordType.XHRReadyStateChange:
case WebInspector.TimelineModel.RecordType.XHRLoad:
case WebInspector.TimelineModel.RecordType.ScheduleResourceRequest:
case WebInspector.TimelineModel.RecordType.ResourceSendRequest:
case WebInspector.TimelineModel.RecordType.ResourceReceivedData:
case WebInspector.TimelineModel.RecordType.ResourceReceiveResponse:
case WebInspector.TimelineModel.RecordType.ResourceFinish:
details = WebInspector.displayNameForURL(this.url);
break;
case WebInspector.TimelineModel.RecordType.Time:
case WebInspector.TimelineModel.RecordType.TimeEnd:
case WebInspector.TimelineModel.RecordType.TimeStamp:
details = this.data["message"];
break;
default:
details = this._linkifyScriptLocation() || this._linkifyTopCallFrame() || null;
break;
}

if (details) {
if (details instanceof Node)
details.tabIndex = -1;
else
return this._createSpanWithText("" + details);
}

return details || null;
},


_linkifyLocation: function(url, lineNumber, columnNumber)
{

columnNumber = columnNumber ? columnNumber - 1 : 0;
return this._linkifier.linkifyLocation(url, lineNumber - 1, columnNumber, "timeline-details");
},

_linkifyCallFrame: function(callFrame)
{
return this._linkifyLocation(callFrame.url, callFrame.lineNumber, callFrame.columnNumber);
},


_linkifyTopCallFrame: function(defaultValue)
{
if (this.stackTrace)
return this._linkifyCallFrame(this.stackTrace[0]);
if (this.callSiteStackTrace)
return this._linkifyCallFrame(this.callSiteStackTrace[0]);
return defaultValue;
},


_linkifyScriptLocation: function(defaultValue)
{
if (this.scriptName)
return this._linkifyLocation(this.scriptName, this.scriptLine, 0);
else
return defaultValue ? "" + defaultValue : null;
},

calculateAggregatedStats: function()
{
this._aggregatedStats = {};
this._cpuTime = this._selfTime;

for (var index = this._children.length; index; --index) {
var child = this._children[index - 1];
for (var category in child._aggregatedStats)
this._aggregatedStats[category] = (this._aggregatedStats[category] || 0) + child._aggregatedStats[category];
}
for (var category in this._aggregatedStats)
this._cpuTime += this._aggregatedStats[category];
this._aggregatedStats[this.category.name] = (this._aggregatedStats[this.category.name] || 0) + this._selfTime;
},

get aggregatedStats()
{
return this._aggregatedStats;
},

setHasWarning: function()
{
this.hasWarning = true;
for (var parent = this.parent; parent && !parent.childHasWarning; parent = parent.parent)
parent.childHasWarning = true;
}
}


WebInspector.TimelinePresentationModel._generateAggregatedInfo = function(aggregatedStats)
{
var cell = document.createElement("span");
cell.className = "timeline-aggregated-info";
for (var index in aggregatedStats) {
var label = document.createElement("div");
label.className = "timeline-aggregated-category timeline-" + index;
cell.appendChild(label);
var text = document.createElement("span");
text.textContent = Number.secondsToString(aggregatedStats[index], true);
cell.appendChild(text);
}
return cell;
}

WebInspector.TimelinePresentationModel.generatePopupContentForFrame = function(frame)
{
var contentHelper = new WebInspector.PopoverContentHelper(WebInspector.UIString("Frame"));
var durationInSeconds = frame.endTime - frame.startTime;
var durationText = WebInspector.UIString("%s (at %s)", Number.secondsToString(frame.endTime - frame.startTime, true),
Number.secondsToString(frame.startTimeOffset, true));
contentHelper.appendTextRow(WebInspector.UIString("Duration"), durationText);
contentHelper.appendTextRow(WebInspector.UIString("FPS"), Math.floor(1 / durationInSeconds));
contentHelper.appendTextRow(WebInspector.UIString("CPU time"), Number.secondsToString(frame.cpuTime, true));
contentHelper.appendElementRow(WebInspector.UIString("Aggregated Time"),
WebInspector.TimelinePresentationModel._generateAggregatedInfo(frame.timeByCategory));

return contentHelper.contentTable();
}


WebInspector.TimelinePresentationModel.generatePopupContentForFrameStatistics = function(statistics)
{

function formatTimeAndFPS(time)
{
return WebInspector.UIString("%s (%.0f FPS)", Number.secondsToString(time, true), 1 / time);
}

var contentHelper = new WebInspector.PopoverContentHelper(WebInspector.UIString("Selected Range"));

contentHelper.appendTextRow(WebInspector.UIString("Selected range"), WebInspector.UIString("%s\u2013%s (%d frames)",
Number.secondsToString(statistics.startOffset, true), Number.secondsToString(statistics.endOffset, true), statistics.frameCount));
contentHelper.appendTextRow(WebInspector.UIString("Minimum Time"), formatTimeAndFPS(statistics.minDuration));
contentHelper.appendTextRow(WebInspector.UIString("Average Time"), formatTimeAndFPS(statistics.average));
contentHelper.appendTextRow(WebInspector.UIString("Maximum Time"), formatTimeAndFPS(statistics.maxDuration));
contentHelper.appendTextRow(WebInspector.UIString("Standard Deviation"), Number.secondsToString(statistics.stddev, true));
contentHelper.appendElementRow(WebInspector.UIString("Time by category"),
WebInspector.TimelinePresentationModel._generateAggregatedInfo(statistics.timeByCategory));

return contentHelper.contentTable();
}


WebInspector.TimelinePresentationModel.createFillStyle = function(context, width, height, color0, color1, color2)
{
var gradient = context.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, color0);
gradient.addColorStop(0.25, color1);
gradient.addColorStop(0.75, color1);
gradient.addColorStop(1, color2);
return gradient;
}


WebInspector.TimelinePresentationModel.createFillStyleForCategory = function(context, width, height, category)
{
return WebInspector.TimelinePresentationModel.createFillStyle(context, width, height, category.fillColorStop0, category.fillColorStop1, category.borderColor);
}


WebInspector.TimelinePresentationModel.createStyleRuleForCategory = function(category)
{
var selector = ".timeline-category-" + category.name + " .timeline-graph-bar, " +
".timeline-category-statusbar-item.timeline-category-" + category.name + " .timeline-category-checkbox, " +
".popover .timeline-" + category.name + ", " +
".timeline-category-" + category.name + " .timeline-tree-icon"

return selector + " { background-image: -webkit-linear-gradient(" +
category.fillColorStop0 + ", " + category.fillColorStop1 + " 25%, " + category.fillColorStop1 + " 75%, " + category.borderColor + ");" +
" border-color: " + category.borderColor +
"}";
}


WebInspector.TimelinePresentationModel.quadWidth = function(quad)
{
return Math.round(Math.sqrt(Math.pow(quad[0] - quad[2], 2) + Math.pow(quad[1] - quad[3], 2)));
}


WebInspector.TimelinePresentationModel.quadHeight = function(quad)
{
return Math.round(Math.sqrt(Math.pow(quad[0] - quad[6], 2) + Math.pow(quad[1] - quad[7], 2)));
}


WebInspector.TimelinePresentationModel.quadFromRectData = function(data)
{
if (typeof data["x"] === "undefined" || typeof data["y"] === "undefined")
return null;
var x0 = data["x"];
var x1 = data["x"] + data["width"];
var y0 = data["y"];
var y1 = data["y"] + data["height"];
return [x0, y0, x1, y0, x1, y1, x0, y1];
}


WebInspector.TimelinePresentationModel.Filter = function()
{
}

WebInspector.TimelinePresentationModel.Filter.prototype = {

accept: function(record) { return false; }
}


WebInspector.TimelineCategory = function(name, title, overviewStripGroupIndex, borderColor, fillColorStop0, fillColorStop1)
{
this.name = name;
this.title = title;
this.overviewStripGroupIndex = overviewStripGroupIndex;
this.borderColor = borderColor;
this.fillColorStop0 = fillColorStop0;
this.fillColorStop1 = fillColorStop1;
this.hidden = false;
}

WebInspector.TimelineCategory.Events = {
VisibilityChanged: "VisibilityChanged"
};

WebInspector.TimelineCategory.prototype = {

get hidden()
{
return this._hidden;
},

set hidden(hidden)
{
this._hidden = hidden;
this.dispatchEventToListeners(WebInspector.TimelineCategory.Events.VisibilityChanged, this);
},

__proto__: WebInspector.Object.prototype
}
;



WebInspector.TimelineFrameController = function(model, overviewPane, presentationModel)
{
this._lastFrame = null;
this._model = model;
this._overviewPane = overviewPane;
this._presentationModel = presentationModel;
this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);

var records = model.records;
for (var i = 0; i < records.length; ++i)
this._addRecord(records[i]);
}

WebInspector.TimelineFrameController.prototype = {
_onRecordAdded: function(event)
{
this._addRecord(event.data);
},

_onRecordsCleared: function()
{
this._lastFrame = null;
},

_addRecord: function(record)
{
if (record.isBackground)
return;
var records;
var programRecord;
if (record.type === WebInspector.TimelineModel.RecordType.Program) {
programRecord = record;
if (this._lastFrame)
this._lastFrame.timeByCategory["other"] += WebInspector.TimelineModel.durationInSeconds(programRecord);
records = record["children"] || [];
} else
records = [record];
records.forEach(this._innerAddRecord.bind(this, programRecord));
},


_innerAddRecord: function(programRecord, record)
{
var isFrameRecord = record.type === WebInspector.TimelineModel.RecordType.BeginFrame;
var programTimeCarryover = isFrameRecord && programRecord ? WebInspector.TimelineModel.endTimeInSeconds(programRecord) - WebInspector.TimelineModel.startTimeInSeconds(record) : 0;
if (isFrameRecord && this._lastFrame)
this._flushFrame(record, programTimeCarryover);
else {
if (!this._lastFrame)
this._lastFrame = this._createFrame(record, programTimeCarryover);
if (!record.thread)
WebInspector.TimelineModel.aggregateTimeForRecord(this._lastFrame.timeByCategory, record);
var duration = WebInspector.TimelineModel.durationInSeconds(record);
this._lastFrame.cpuTime += duration;
this._lastFrame.timeByCategory["other"] -= duration;
}
},


_flushFrame: function(record, programTimeCarryover)
{
this._lastFrame.endTime = WebInspector.TimelineModel.startTimeInSeconds(record);
this._lastFrame.duration = this._lastFrame.endTime - this._lastFrame.startTime;
this._lastFrame.timeByCategory["other"] -= programTimeCarryover;


this._lastFrame.cpuTime += this._lastFrame.timeByCategory["other"];
this._overviewPane.addFrame(this._lastFrame);
this._presentationModel.addFrame(this._lastFrame);
this._lastFrame = this._createFrame(record, programTimeCarryover);
},


_createFrame: function(record, programTimeCarryover)
{
var frame = new WebInspector.TimelineFrame();
frame.startTime = WebInspector.TimelineModel.startTimeInSeconds(record);
frame.startTimeOffset = this._model.recordOffsetInSeconds(record);
frame.timeByCategory["other"] = programTimeCarryover;
return frame;
},

dispose: function()
{
this._model.removeEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
this._model.removeEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);
}
}


WebInspector.FrameStatistics = function(frames)
{
this.frameCount = frames.length;
this.minDuration = Infinity;
this.maxDuration = 0;
this.timeByCategory = {};
this.startOffset = frames[0].startTimeOffset;
var lastFrame = frames[this.frameCount - 1];
this.endOffset = lastFrame.startTimeOffset + lastFrame.duration;

var totalDuration = 0;
var sumOfSquares = 0;
for (var i = 0; i < this.frameCount; ++i) {
var duration = frames[i].duration;
totalDuration += duration;
sumOfSquares += duration * duration;
this.minDuration = Math.min(this.minDuration, duration);
this.maxDuration = Math.max(this.maxDuration, duration);
WebInspector.TimelineModel.aggregateTimeByCategory(this.timeByCategory, frames[i].timeByCategory);
}
this.average = totalDuration / this.frameCount;
var variance = sumOfSquares / this.frameCount - this.average * this.average;
this.stddev = Math.sqrt(variance);
}


WebInspector.TimelineFrame = function()
{
this.timeByCategory = {};
this.cpuTime = 0;
}
;


WebInspector.TimelinePanel = function()
{
WebInspector.Panel.call(this, "timeline");
this.registerRequiredCSS("timelinePanel.css");

this._model = new WebInspector.TimelineModel();
this._presentationModel = new WebInspector.TimelinePresentationModel();

this._overviewModeSetting = WebInspector.settings.createSetting("timelineOverviewMode", WebInspector.TimelineOverviewPane.Mode.Events);
this._glueRecordsSetting = WebInspector.settings.createSetting("timelineGlueRecords", false);

this._overviewPane = new WebInspector.TimelineOverviewPane(this._model);
this._overviewPane.addEventListener(WebInspector.TimelineOverviewPane.Events.WindowChanged, this._invalidateAndScheduleRefresh.bind(this, false, true));
this._overviewPane.addEventListener(WebInspector.TimelineOverviewPane.Events.ModeChanged, this._overviewModeChanged, this);
this._overviewPane.show(this.element);

this.element.addEventListener("contextmenu", this._contextMenu.bind(this), false);

this.element.addStyleClass("split-view-vertical");

this._sidebarBackgroundElement = document.createElement("div");
this._sidebarBackgroundElement.className = "sidebar split-view-sidebar split-view-contents-first timeline-sidebar-background";
this.element.appendChild(this._sidebarBackgroundElement);

this.createSidebarViewWithTree();
this.element.appendChild(this.splitView.resizerElement());

this._containerElement = this.splitView.element;
this._containerElement.tabIndex = 0;
this._containerElement.id = "timeline-container";
this._containerElement.addEventListener("scroll", this._onScroll.bind(this), false);

this._timelineMemorySplitter = this.element.createChild("div");
this._timelineMemorySplitter.id = "timeline-memory-splitter";
WebInspector.installDragHandle(this._timelineMemorySplitter, this._startSplitterDragging.bind(this), this._splitterDragging.bind(this), this._endSplitterDragging.bind(this), "ns-resize");
this._timelineMemorySplitter.addStyleClass("hidden");
this._includeDomCounters = false;
this._includeNativeMemoryStatistics = false;
if (WebInspector.experimentsSettings.nativeMemoryTimeline.isEnabled()) {
this._memoryStatistics = new WebInspector.NativeMemoryGraph(this, this._model, this.splitView.sidebarWidth());
this._includeNativeMemoryStatistics = true;
} else {
this._memoryStatistics = new WebInspector.DOMCountersGraph(this, this._model, this.splitView.sidebarWidth());
this._includeDomCounters = true;
}
WebInspector.settings.memoryCounterGraphsHeight = WebInspector.settings.createSetting("memoryCounterGraphsHeight", 150);

var itemsTreeElement = new WebInspector.SidebarSectionTreeElement(WebInspector.UIString("RECORDS"), {}, true);
this.sidebarTree.appendChild(itemsTreeElement);
this.sidebarTree.setFocusable(false);

this._sidebarListElement = document.createElement("div");
this.sidebarElement.appendChild(this._sidebarListElement);

this._containerContentElement = this.splitView.mainElement;
this._containerContentElement.id = "resources-container-content";

this._timelineGrid = new WebInspector.TimelineGrid();
this._itemsGraphsElement = this._timelineGrid.itemsGraphsElement;
this._itemsGraphsElement.id = "timeline-graphs";
this._containerContentElement.appendChild(this._timelineGrid.element);
this._timelineGrid.gridHeaderElement.id = "timeline-grid-header";
this._memoryStatistics.setMainTimelineGrid(this._timelineGrid);
this.element.appendChild(this._timelineGrid.gridHeaderElement);

this._topGapElement = document.createElement("div");
this._topGapElement.className = "timeline-gap";
this._itemsGraphsElement.appendChild(this._topGapElement);

this._graphRowsElement = document.createElement("div");
this._itemsGraphsElement.appendChild(this._graphRowsElement);

this._bottomGapElement = document.createElement("div");
this._bottomGapElement.className = "timeline-gap";
this._itemsGraphsElement.appendChild(this._bottomGapElement);

this._expandElements = document.createElement("div");
this._expandElements.id = "orphan-expand-elements";
this._itemsGraphsElement.appendChild(this._expandElements);

this._calculator = new WebInspector.TimelineCalculator(this._model);
this._createStatusBarItems();

this._frameMode = false;
this._boundariesAreValid = true;
this._scrollTop = 0;

this._popoverHelper = new WebInspector.PopoverHelper(this.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
this.element.addEventListener("mousemove", this._mouseMove.bind(this), false);
this.element.addEventListener("mouseout", this._mouseOut.bind(this), false);


this._durationFilter = new WebInspector.TimelineIsLongFilter();

this._expandOffset = 15;

this._headerLineCount = 1;
this._adjustHeaderHeight();

this._mainThreadTasks =   ([]);
this._cpuBarsElement = this._timelineGrid.gridHeaderElement.createChild("div", "timeline-cpu-bars");
this._mainThreadMonitoringEnabled = WebInspector.settings.showCpuOnTimelineRuler.get();
WebInspector.settings.showCpuOnTimelineRuler.addChangeListener(this._showCpuOnTimelineRulerChanged, this);

this._createFileSelector();

this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onTimelineEventRecorded, this);
this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);

this._registerShortcuts();

this._allRecordsCount = 0;

this._presentationModel.addFilter(new WebInspector.TimelineWindowFilter(this._overviewPane));
this._presentationModel.addFilter(new WebInspector.TimelineCategoryFilter()); 
this._presentationModel.addFilter(this._durationFilter);
}


WebInspector.TimelinePanel.rowHeight = 18;

WebInspector.TimelinePanel.durationFilterPresetsMs = [0, 1, 15];

WebInspector.TimelinePanel.prototype = {
_showCpuOnTimelineRulerChanged: function()
{
var mainThreadMonitoringEnabled = WebInspector.settings.showCpuOnTimelineRuler.get();
if (this._mainThreadMonitoringEnabled !== mainThreadMonitoringEnabled) {
this._mainThreadMonitoringEnabled = mainThreadMonitoringEnabled;
this._refreshMainThreadBars();
}
},


_startSplitterDragging: function(event)
{
this._dragOffset = this._timelineMemorySplitter.offsetTop + 2 - event.pageY;
return true;
},


_splitterDragging: function(event)
{
var top = event.pageY + this._dragOffset
this._setSplitterPosition(top);
event.preventDefault();
},


_endSplitterDragging: function(event)
{
delete this._dragOffset;
this._memoryStatistics.show();
WebInspector.settings.memoryCounterGraphsHeight.set(this.splitView.element.offsetHeight);
},

_setSplitterPosition: function(top)
{
const overviewHeight = 90;
const sectionMinHeight = 100;
top = Number.constrain(top, overviewHeight + sectionMinHeight, this.element.offsetHeight - sectionMinHeight);

this.splitView.element.style.height = (top - overviewHeight) + "px";
this._timelineMemorySplitter.style.top = (top - 2) + "px";
this._memoryStatistics.setTopPosition(top);
this._containerElementHeight = this._containerElement.clientHeight;
this.onResize();
},

get calculator()
{
return this._calculator;
},

get statusBarItems()
{
return this._statusBarItems.select("element").concat([
this._miscStatusBarItems
]);
},

defaultFocusedElement: function()
{
return this.element;
},

_createStatusBarItems: function()
{
this._statusBarItems =   ([]);

this.toggleTimelineButton = new WebInspector.StatusBarButton(WebInspector.UIString("Record"), "record-profile-status-bar-item");
this.toggleTimelineButton.addEventListener("click", this._toggleTimelineButtonClicked, this);
this._statusBarItems.push(this.toggleTimelineButton);

this.clearButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear"), "clear-status-bar-item");
this.clearButton.addEventListener("click", this._clearPanel, this);
this._statusBarItems.push(this.clearButton);

this.garbageCollectButton = new WebInspector.StatusBarButton(WebInspector.UIString("Collect Garbage"), "garbage-collect-status-bar-item");
this.garbageCollectButton.addEventListener("click", this._garbageCollectButtonClicked, this);
this._statusBarItems.push(this.garbageCollectButton);

this._glueParentButton = new WebInspector.StatusBarButton(WebInspector.UIString("Glue asynchronous events to causes"), "glue-async-status-bar-item");
this._glueParentButton.toggled = this._glueRecordsSetting.get();
this._presentationModel.setGlueRecords(this._glueParentButton.toggled);
this._glueParentButton.addEventListener("click", this._glueParentButtonClicked, this);
this._statusBarItems.push(this._glueParentButton);

this._durationFilterSelector = new WebInspector.StatusBarComboBox(this._durationFilterChanged.bind(this));
for (var presetIndex = 0; presetIndex < WebInspector.TimelinePanel.durationFilterPresetsMs.length; ++presetIndex) {
var durationMs = WebInspector.TimelinePanel.durationFilterPresetsMs[presetIndex];
var option = document.createElement("option");
if (!durationMs) {
option.text = WebInspector.UIString("All");
option.title = WebInspector.UIString("Show all records");
} else {
option.text = WebInspector.UIString("\u2265 %dms", durationMs);
option.title = WebInspector.UIString("Hide records shorter than %dms", durationMs);
}
option._durationMs = durationMs;
this._durationFilterSelector.addOption(option);
this._durationFilterSelector.element.title = this._durationFilterSelector.selectedOption().title;
}
this._statusBarItems.push(this._durationFilterSelector);

this._miscStatusBarItems = document.createElement("div");
this._miscStatusBarItems.className = "status-bar-items timeline-misc-status-bar-items";

this._statusBarFilters = this._miscStatusBarItems.createChild("div", "timeline-misc-status-bar-filters");
var categories = WebInspector.TimelinePresentationModel.categories();
for (var categoryName in categories) {
var category = categories[categoryName];
if (category.overviewStripGroupIndex < 0)
continue;
this._statusBarFilters.appendChild(this._createTimelineCategoryStatusBarCheckbox(category, this._onCategoryCheckboxClicked.bind(this, category)));
}

var statsContainer = this._statusBarFilters.createChild("div");
statsContainer.className = "timeline-records-stats-container";

this.recordsCounter = statsContainer.createChild("div");
this.recordsCounter.className = "timeline-records-stats";

this.frameStatistics = statsContainer.createChild("div");
this.frameStatistics.className = "timeline-records-stats hidden";

function getAnchor()
{
return this.frameStatistics;
}
this._frameStatisticsPopoverHelper = new WebInspector.PopoverHelper(this.frameStatistics, getAnchor.bind(this), this._showFrameStatistics.bind(this));
},

_createTimelineCategoryStatusBarCheckbox: function(category, onCheckboxClicked)
{
var labelContainer = document.createElement("div");
labelContainer.addStyleClass("timeline-category-statusbar-item");
labelContainer.addStyleClass("timeline-category-" + category.name);
labelContainer.addStyleClass("status-bar-item");

var label = document.createElement("label");
var checkElement = document.createElement("input");
checkElement.type = "checkbox";
checkElement.className = "timeline-category-checkbox";
checkElement.checked = true;
checkElement.addEventListener("click", onCheckboxClicked, false);
label.appendChild(checkElement);

var typeElement = document.createElement("span");
typeElement.className = "type";
typeElement.textContent = category.title;
label.appendChild(typeElement);

labelContainer.appendChild(label);
return labelContainer;
},

_onCategoryCheckboxClicked: function(category, event)
{
category.hidden = !event.target.checked;
this._invalidateAndScheduleRefresh(true, true);
},


_setOperationInProgress: function(indicator)
{
this._operationInProgress = !!indicator;
for (var i = 0; i < this._statusBarItems.length; ++i)
this._statusBarItems[i].setEnabled(!this._operationInProgress);
this._glueParentButton.setEnabled(!this._operationInProgress && !this._frameController);
this._miscStatusBarItems.removeChildren();
this._miscStatusBarItems.appendChild(indicator ? indicator.element : this._statusBarFilters);
},

_registerShortcuts: function()
{
this.registerShortcuts(WebInspector.TimelinePanelDescriptor.ShortcutKeys.StartStopRecording, this._toggleTimelineButtonClicked.bind(this));
this.registerShortcuts(WebInspector.TimelinePanelDescriptor.ShortcutKeys.SaveToFile, this._saveToFile.bind(this));
this.registerShortcuts(WebInspector.TimelinePanelDescriptor.ShortcutKeys.LoadFromFile, this._selectFileToLoad.bind(this));
},

_createFileSelector: function()
{
if (this._fileSelectorElement)
this.element.removeChild(this._fileSelectorElement);

this._fileSelectorElement = WebInspector.createFileSelectorElement(this._loadFromFile.bind(this));
this.element.appendChild(this._fileSelectorElement);
},

_contextMenu: function(event)
{
var contextMenu = new WebInspector.ContextMenu(event);
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Save Timeline data\u2026" : "Save Timeline Data\u2026"), this._saveToFile.bind(this), this._operationInProgress);
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Load Timeline data\u2026" : "Load Timeline Data\u2026"), this._selectFileToLoad.bind(this), this._operationInProgress);
contextMenu.show();
},


_saveToFile: function(event)
{
if (this._operationInProgress)
return true;
this._model.saveToFile();
return true;
},


_selectFileToLoad: function(event) {
this._fileSelectorElement.click();
return true;
},


_loadFromFile: function(file)
{
var progressIndicator = this._prepareToLoadTimeline();
if (!progressIndicator)
return;
this._model.loadFromFile(file, progressIndicator);
this._createFileSelector();
},


loadFromURL: function(url)
{
var progressIndicator = this._prepareToLoadTimeline();
if (!progressIndicator)
return;
this._model.loadFromURL(url, progressIndicator);
},


_prepareToLoadTimeline: function()
{
if (this._operationInProgress)
return null;
if (this.toggleTimelineButton.toggled) {
this.toggleTimelineButton.toggled = false;
this._model.stopRecord();
}
var progressIndicator = new WebInspector.ProgressIndicator();
progressIndicator.addEventListener(WebInspector.ProgressIndicator.Events.Done, this._setOperationInProgress.bind(this, null));
this._setOperationInProgress(progressIndicator);
return progressIndicator;
},

_rootRecord: function()
{
return this._presentationModel.rootRecord();
},

_updateRecordsCounter: function(recordsInWindowCount)
{
this.recordsCounter.textContent = WebInspector.UIString("%d of %d records shown", recordsInWindowCount, this._allRecordsCount);
},

_updateFrameStatistics: function(frames)
{
if (frames.length) {
this._lastFrameStatistics = new WebInspector.FrameStatistics(frames);
var details = WebInspector.UIString("avg: %s, \u03c3: %s",
Number.secondsToString(this._lastFrameStatistics.average, true), Number.secondsToString(this._lastFrameStatistics.stddev, true));
} else
this._lastFrameStatistics = null;
this.frameStatistics.textContent = WebInspector.UIString("%d of %d frames shown", frames.length, this._presentationModel.frames().length);
if (details) {
this.frameStatistics.appendChild(document.createTextNode(" ("));
this.frameStatistics.createChild("span", "timeline-frames-stats").textContent = details;
this.frameStatistics.appendChild(document.createTextNode(")"));
}
},


_showFrameStatistics: function(anchor, popover)
{
popover.show(WebInspector.TimelinePresentationModel.generatePopupContentForFrameStatistics(this._lastFrameStatistics), anchor);
},

_updateEventDividers: function()
{
this._timelineGrid.removeEventDividers();
var clientWidth = this._graphRowsElementWidth;
var dividers = [];
var eventDividerRecords = this._presentationModel.eventDividerRecords();

for (var i = 0; i < eventDividerRecords.length; ++i) {
var record = eventDividerRecords[i];
var positions = this._calculator.computeBarGraphWindowPosition(record);
var dividerPosition = Math.round(positions.left);
if (dividerPosition < 0 || dividerPosition >= clientWidth || dividers[dividerPosition])
continue;
var divider = WebInspector.TimelinePresentationModel.createEventDivider(record.type, record.title);
divider.style.left = dividerPosition + "px";
dividers[dividerPosition] = divider;
}
this._timelineGrid.addEventDividers(dividers);
},

_updateFrameBars: function(frames)
{
var clientWidth = this._graphRowsElementWidth;
if (this._frameContainer)
this._frameContainer.removeChildren();
else {
const frameContainerBorderWidth = 1;
this._frameContainer = document.createElement("div");
this._frameContainer.addStyleClass("fill");
this._frameContainer.addStyleClass("timeline-frame-container");
this._frameContainer.style.height = this._headerLineCount * WebInspector.TimelinePanel.rowHeight + frameContainerBorderWidth + "px";
this._frameContainer.addEventListener("dblclick", this._onFrameDoubleClicked.bind(this), false);
}

var dividers = [ this._frameContainer ];

for (var i = 0; i < frames.length; ++i) {
var frame = frames[i];
var frameStart = this._calculator.computePosition(frame.startTime);
var frameEnd = this._calculator.computePosition(frame.endTime);

var frameStrip = document.createElement("div");
frameStrip.className = "timeline-frame-strip";
var actualStart = Math.max(frameStart, 0);
var width = frameEnd - actualStart;
frameStrip.style.left = actualStart + "px";
frameStrip.style.width = width + "px";
frameStrip._frame = frame;

const minWidthForFrameInfo = 60;
if (width > minWidthForFrameInfo)
frameStrip.textContent = Number.secondsToString(frame.endTime - frame.startTime, true);

this._frameContainer.appendChild(frameStrip);

if (actualStart > 0) {
var frameMarker = WebInspector.TimelinePresentationModel.createEventDivider(WebInspector.TimelineModel.RecordType.BeginFrame);
frameMarker.style.left = frameStart + "px";
dividers.push(frameMarker);
}
}
this._timelineGrid.addEventDividers(dividers);
},

_onFrameDoubleClicked: function(event)
{
var frameBar = event.target.enclosingNodeOrSelfWithClass("timeline-frame-strip");
if (!frameBar)
return;
this._overviewPane.zoomToFrame(frameBar._frame);
},

_overviewModeChanged: function(event)
{
var mode = event.data;
var shouldShowMemory = mode === WebInspector.TimelineOverviewPane.Mode.Memory;
var frameMode = mode === WebInspector.TimelineOverviewPane.Mode.Frames;
this._overviewModeSetting.set(mode);
if (frameMode !== this._frameMode) {
this._frameMode = frameMode;
this._glueParentButton.setEnabled(!frameMode);
this._presentationModel.setGlueRecords(this._glueParentButton.toggled && !frameMode);
this._repopulateRecords();

if (frameMode) {
this.element.addStyleClass("timeline-frame-overview");
this.recordsCounter.addStyleClass("hidden");
this.frameStatistics.removeStyleClass("hidden");
this._frameController = new WebInspector.TimelineFrameController(this._model, this._overviewPane, this._presentationModel);
} else {
this._frameController.dispose();
this._frameController = null;
this.element.removeStyleClass("timeline-frame-overview");
this.recordsCounter.removeStyleClass("hidden");
this.frameStatistics.addStyleClass("hidden");
}
}
if (shouldShowMemory === this._memoryStatistics.visible())
return;
if (!shouldShowMemory) {
this._timelineMemorySplitter.addStyleClass("hidden");
this._memoryStatistics.hide();
this.splitView.element.style.height = "auto";
this.splitView.element.style.bottom = "0";
this.onResize();
} else {
this._timelineMemorySplitter.removeStyleClass("hidden");
this._memoryStatistics.show();
this.splitView.element.style.bottom = "auto";
this._setSplitterPosition(WebInspector.settings.memoryCounterGraphsHeight.get());
}
},


_toggleTimelineButtonClicked: function()
{
if (this._operationInProgress)
return true;
if (this.toggleTimelineButton.toggled) {
this._model.stopRecord();
this.toggleTimelineButton.title = WebInspector.UIString("Record");
} else {
this._model.startRecord(this._includeDomCounters, this._includeNativeMemoryStatistics);
this.toggleTimelineButton.title = WebInspector.UIString("Stop");
WebInspector.userMetrics.TimelineStarted.record();
}
this.toggleTimelineButton.toggled = !this.toggleTimelineButton.toggled;
return true;
},

_durationFilterChanged: function()
{
var option = this._durationFilterSelector.selectedOption();
var minimumRecordDuration = +option._durationMs / 1000.0;
this._durationFilter.setMinimumRecordDuration(minimumRecordDuration);
this._durationFilterSelector.element.title = option.title;
this._invalidateAndScheduleRefresh(true, true);
},

_garbageCollectButtonClicked: function()
{
HeapProfilerAgent.collectGarbage();
},

_glueParentButtonClicked: function()
{
var newValue = !this._glueParentButton.toggled;
this._glueParentButton.toggled = newValue;
this._presentationModel.setGlueRecords(newValue);
this._glueRecordsSetting.set(newValue);
this._repopulateRecords();
},

_repopulateRecords: function()
{
this._resetPanel();
this._automaticallySizeWindow = false;
var records = this._model.records;
for (var i = 0; i < records.length; ++i)
this._innerAddRecordToTimeline(records[i]);
this._invalidateAndScheduleRefresh(false, true);
},

_onTimelineEventRecorded: function(event)
{
if (this._innerAddRecordToTimeline(event.data))
this._invalidateAndScheduleRefresh(false, false);
},

_innerAddRecordToTimeline: function(record)
{
if (record.type === WebInspector.TimelineModel.RecordType.Program) {
this._mainThreadTasks.push({
startTime: WebInspector.TimelineModel.startTimeInSeconds(record),
endTime: WebInspector.TimelineModel.endTimeInSeconds(record)
});
}

var records = this._presentationModel.addRecord(record);
this._allRecordsCount += records.length;
var hasVisibleRecords = false;
var presentationModel = this._presentationModel;
function checkVisible(record)
{
hasVisibleRecords |= presentationModel.isVisible(record);
}
WebInspector.TimelinePresentationModel.forAllRecords(records, checkVisible);

function isAdoptedRecord(record)
{
return record.parent !== presentationModel.rootRecord;
}

return hasVisibleRecords || records.some(isAdoptedRecord);
},

sidebarResized: function(event)
{
var width = event.data;
this._resize(width);
this._sidebarBackgroundElement.style.width = width + "px";
this._overviewPane.sidebarResized(width);
this._memoryStatistics.setSidebarWidth(width);
this._timelineGrid.gridHeaderElement.style.left = width + "px";
},

onResize: function()
{
this._resize(this.splitView.sidebarWidth());
},


_resize: function(sidebarWidth)
{
this._closeRecordDetails();
this._scheduleRefresh(false, true);
this._graphRowsElementWidth = this._graphRowsElement.offsetWidth;
this._containerElementHeight = this._containerElement.clientHeight;
var lastItemElement = this._statusBarItems[this._statusBarItems.length - 1].element;
var minFloatingStatusBarItemsOffset = lastItemElement.totalOffsetLeft() + lastItemElement.offsetWidth;
this._timelineGrid.gridHeaderElement.style.width = this._itemsGraphsElement.offsetWidth + "px";
this._miscStatusBarItems.style.left = Math.max(minFloatingStatusBarItemsOffset, sidebarWidth) + "px";
},

_clearPanel: function()
{
this._model.reset();
},

_onRecordsCleared: function()
{
this._resetPanel();
this._invalidateAndScheduleRefresh(true, true);
},

_resetPanel: function()
{
this._presentationModel.reset();
this._boundariesAreValid = false;
this._adjustScrollPosition(0);
this._closeRecordDetails();
this._allRecordsCount = 0;
this._automaticallySizeWindow = true;
this._mainThreadTasks = [];
},

elementsToRestoreScrollPositionsFor: function()
{
return [this._containerElement];
},

wasShown: function()
{
WebInspector.Panel.prototype.wasShown.call(this);
if (!WebInspector.TimelinePanel._categoryStylesInitialized) {
WebInspector.TimelinePanel._categoryStylesInitialized = true;
this._injectCategoryStyles();
}
this._overviewPane.setMode(this._overviewModeSetting.get());
this._refresh();
},

willHide: function()
{
this._closeRecordDetails();
WebInspector.Panel.prototype.willHide.call(this);
},

_onScroll: function(event)
{
this._closeRecordDetails();
this._scrollTop = this._containerElement.scrollTop;
var dividersTop = Math.max(0, this._scrollTop);
this._timelineGrid.setScrollAndDividerTop(this._scrollTop, dividersTop);
this._scheduleRefresh(true, true);
},


_invalidateAndScheduleRefresh: function(preserveBoundaries, userGesture)
{
this._presentationModel.invalidateFilteredRecords();
delete this._searchResults;
this._scheduleRefresh(preserveBoundaries, userGesture);
},


_scheduleRefresh: function(preserveBoundaries, userGesture)
{
this._closeRecordDetails();
this._boundariesAreValid &= preserveBoundaries;

if (!this.isShowing())
return;

if (preserveBoundaries || userGesture)
this._refresh();
else {
if (!this._refreshTimeout)
this._refreshTimeout = setTimeout(this._refresh.bind(this), 300);
}
},

_refresh: function()
{
if (this._refreshTimeout) {
clearTimeout(this._refreshTimeout);
delete this._refreshTimeout;
}

this._timelinePaddingLeft = this._expandOffset;
this._calculator.setWindow(this._overviewPane.windowStartTime(), this._overviewPane.windowEndTime());
this._calculator.setDisplayWindow(this._timelinePaddingLeft, this._graphRowsElementWidth);

var recordsInWindowCount = this._refreshRecords();
this._updateRecordsCounter(recordsInWindowCount);
if (!this._boundariesAreValid) {
this._updateEventDividers();
var frames = this._frameController && this._presentationModel.filteredFrames(this._overviewPane.windowStartTime(), this._overviewPane.windowEndTime());
if (frames) {
this._updateFrameStatistics(frames);
const maxFramesForFrameBars = 30;
if  (frames.length && frames.length < maxFramesForFrameBars) {
this._timelineGrid.removeDividers();
this._updateFrameBars(frames);
} else
this._timelineGrid.updateDividers(this._calculator);
} else
this._timelineGrid.updateDividers(this._calculator);
if (this._mainThreadMonitoringEnabled)
this._refreshMainThreadBars();
}
if (this._memoryStatistics.visible())
this._memoryStatistics.refresh();
this._boundariesAreValid = true;
},

revealRecordAt: function(time)
{
var recordToReveal;
function findRecordToReveal(record)
{
if (record.containsTime(time)) {
recordToReveal = record;
return true;
}

if (!recordToReveal || record.endTime < time && recordToReveal.endTime < record.endTime)
recordToReveal = record;
return false;
}
WebInspector.TimelinePresentationModel.forAllRecords(this._presentationModel.rootRecord().children, null, findRecordToReveal);


if (!recordToReveal) {
this._containerElement.scrollTop = 0;
return;
}

this._revealRecord(recordToReveal);
},

_revealRecord: function(recordToReveal)
{

this._recordToHighlight = recordToReveal;
var treeUpdated = false;
for (var parent = recordToReveal.parent; parent !== this._rootRecord(); parent = parent.parent) {
treeUpdated = treeUpdated || parent.collapsed;
parent.collapsed = false;
}
if (treeUpdated)
this._invalidateAndScheduleRefresh(true, true);

var recordsInWindow = this._presentationModel.filteredRecords();
var index = recordsInWindow.indexOf(recordToReveal);
this._containerElement.scrollTop = index * WebInspector.TimelinePanel.rowHeight;
},

_refreshRecords: function()
{
var recordsInWindow = this._presentationModel.filteredRecords();


var visibleTop = this._scrollTop;
var visibleBottom = visibleTop + this._containerElementHeight;

const rowHeight = WebInspector.TimelinePanel.rowHeight;


var startIndex = Math.max(0, Math.min(Math.floor(visibleTop / rowHeight) - this._headerLineCount, recordsInWindow.length - 1));
var endIndex = Math.min(recordsInWindow.length, Math.ceil(visibleBottom / rowHeight));
var lastVisibleLine = Math.max(0, Math.floor(visibleBottom / rowHeight) - this._headerLineCount);
if (this._automaticallySizeWindow && recordsInWindow.length > lastVisibleLine) {
this._automaticallySizeWindow = false;

var windowStartTime = startIndex ? recordsInWindow[startIndex].startTime : this._model.minimumRecordTime();
this._overviewPane.setWindowTimes(windowStartTime, recordsInWindow[Math.max(0, lastVisibleLine - 1)].endTime);
recordsInWindow = this._presentationModel.filteredRecords();
endIndex = Math.min(recordsInWindow.length, lastVisibleLine);
}


this._topGapElement.style.height = (startIndex * rowHeight) + "px";
this.sidebarTreeElement.style.height = ((startIndex + this._headerLineCount) * rowHeight) + "px";
this._bottomGapElement.style.height = (recordsInWindow.length - endIndex) * rowHeight + "px";


var listRowElement = this._sidebarListElement.firstChild;
var width = this._graphRowsElementWidth;
this._itemsGraphsElement.removeChild(this._graphRowsElement);
var graphRowElement = this._graphRowsElement.firstChild;
var scheduleRefreshCallback = this._invalidateAndScheduleRefresh.bind(this, true, true);
this._itemsGraphsElement.removeChild(this._expandElements);
this._expandElements.removeChildren();

this._clearRecordHighlight();
var highlightedRecord = this._recordToHighlight;
delete this._recordToHighlight;

for (var i = 0; i < endIndex; ++i) {
var record = recordsInWindow[i];
var isEven = !(i % 2);

if (i < startIndex) {
var lastChildIndex = i + record.visibleChildrenCount;
if (lastChildIndex >= startIndex && lastChildIndex < endIndex) {
var expandElement = new WebInspector.TimelineExpandableElement(this._expandElements);
var positions = this._calculator.computeBarGraphWindowPosition(record);
expandElement._update(record, i, positions.left - this._expandOffset, positions.width);
}
} else {
if (!listRowElement) {
listRowElement = new WebInspector.TimelineRecordListRow().element;
this._sidebarListElement.appendChild(listRowElement);
}
if (!graphRowElement) {
graphRowElement = new WebInspector.TimelineRecordGraphRow(this._itemsGraphsElement, scheduleRefreshCallback).element;
this._graphRowsElement.appendChild(graphRowElement);
}

if (highlightedRecord === record) {
this._highlightedListRowElement = listRowElement;
this._highlightedGraphRowElement = graphRowElement;
}

listRowElement.row.update(record, isEven, visibleTop);
graphRowElement.row.update(record, isEven, this._calculator, this._expandOffset, i);

listRowElement = listRowElement.nextSibling;
graphRowElement = graphRowElement.nextSibling;
}
}


while (listRowElement) {
var nextElement = listRowElement.nextSibling;
listRowElement.row.dispose();
listRowElement = nextElement;
}
while (graphRowElement) {
var nextElement = graphRowElement.nextSibling;
graphRowElement.row.dispose();
graphRowElement = nextElement;
}

this._itemsGraphsElement.insertBefore(this._graphRowsElement, this._bottomGapElement);
this._itemsGraphsElement.appendChild(this._expandElements);
this._adjustScrollPosition((recordsInWindow.length + this._headerLineCount) * rowHeight);
this._updateSearchHighlight(false);

if (this._highlightedListRowElement) {
this._highlightedListRowElement.addStyleClass("highlighted-timeline-record");
this._highlightedGraphRowElement.addStyleClass("highlighted-timeline-record");
}

return recordsInWindow.length;
},

_clearRecordHighlight: function()
{
if (!this._highlightedListRowElement)
return;
this._highlightedListRowElement.removeStyleClass("highlighted-timeline-record");
delete this._highlightedListRowElement;
this._highlightedGraphRowElement.removeStyleClass("highlighted-timeline-record");
delete this._highlightedGraphRowElement;
},

_refreshMainThreadBars: function()
{
const barOffset = 3;
const minGap = 3;

var minWidth = WebInspector.TimelineCalculator._minWidth;
var widthAdjustment = minWidth / 2;

var width = this._graphRowsElementWidth;
var boundarySpan = this._overviewPane.windowEndTime() - this._overviewPane.windowStartTime();
var scale = boundarySpan / (width - minWidth - this._timelinePaddingLeft);
var startTime = this._overviewPane.windowStartTime() - this._timelinePaddingLeft * scale;
var endTime = startTime + width * scale;

var tasks = this._mainThreadMonitoringEnabled ? this._mainThreadTasks : [];

function compareEndTime(value, task)
{
return value < task.endTime ? -1 : 1;
}

var taskIndex = insertionIndexForObjectInListSortedByFunction(startTime, tasks, compareEndTime);

var container = this._cpuBarsElement;
var element = container.firstChild;
var lastElement;
var lastLeft;
var lastRight;

for (; taskIndex < tasks.length; ++taskIndex) {
var task = tasks[taskIndex];
if (task.startTime > endTime)
break;

var left = Math.max(0, this._calculator.computePosition(task.startTime) + barOffset - widthAdjustment);
var right = Math.min(width, this._calculator.computePosition(task.endTime) + barOffset + widthAdjustment);

if (lastElement) {
var gap = Math.floor(left) - Math.ceil(lastRight);
if (gap < minGap) {
lastRight = right;
lastElement._tasksInfo.lastTaskIndex = taskIndex;
continue;
}
lastElement.style.width = (lastRight - lastLeft) + "px";
}

if (!element)
element = container.createChild("div", "timeline-graph-bar");

element.style.left = left + "px";
element._tasksInfo = {tasks: tasks, firstTaskIndex: taskIndex, lastTaskIndex: taskIndex};
lastLeft = left;
lastRight = right;

lastElement = element;
element = element.nextSibling;
}

if (lastElement)
lastElement.style.width = (lastRight - lastLeft) + "px";

while (element) {
var nextElement = element.nextSibling;
element._tasksInfo = null;
container.removeChild(element);
element = nextElement;
}
},

_adjustHeaderHeight: function()
{
const headerBorderWidth = 1;
const headerMargin = 2;

var headerHeight = this._headerLineCount * WebInspector.TimelinePanel.rowHeight;
this.sidebarElement.firstChild.style.height = headerHeight + "px";
this._timelineGrid.dividersLabelBarElement.style.height = headerHeight + headerMargin + "px";
this._itemsGraphsElement.style.top = headerHeight + headerBorderWidth + "px";
},

_adjustScrollPosition: function(totalHeight)
{

if ((this._scrollTop + this._containerElementHeight) > totalHeight + 1)
this._containerElement.scrollTop = (totalHeight - this._containerElement.offsetHeight);
},

_getPopoverAnchor: function(element)
{
return element.enclosingNodeOrSelfWithClass("timeline-graph-bar") ||
element.enclosingNodeOrSelfWithClass("timeline-tree-item") ||
element.enclosingNodeOrSelfWithClass("timeline-frame-strip");
},

_mouseOut: function(e)
{
this._hideQuadHighlight();
},


_mouseMove: function(e)
{
var anchor = this._getPopoverAnchor(e.target);

if (anchor && anchor.row && anchor.row._record.highlightQuad)
this._highlightQuad(anchor.row._record.highlightQuad);
else
this._hideQuadHighlight();

if (anchor && anchor._tasksInfo) {
var offset = anchor.offsetLeft;
this._timelineGrid.showCurtains(offset >= 0 ? offset : 0, anchor.offsetWidth);
} else
this._timelineGrid.hideCurtains();
},


_highlightQuad: function(quad)
{
if (this._highlightedQuad === quad)
return;
this._highlightedQuad = quad;
DOMAgent.highlightQuad(quad, WebInspector.Color.PageHighlight.Content.toProtocolRGBA(), WebInspector.Color.PageHighlight.ContentOutline.toProtocolRGBA());
},

_hideQuadHighlight: function()
{
if (this._highlightedQuad) {
delete this._highlightedQuad;
DOMAgent.hideHighlight();
}
},


_showPopover: function(anchor, popover)
{
if (anchor.hasStyleClass("timeline-frame-strip")) {
var frame = anchor._frame;
popover.show(WebInspector.TimelinePresentationModel.generatePopupContentForFrame(frame), anchor);
} else {
if (anchor.row && anchor.row._record)
anchor.row._record.generatePopupContent(showCallback);
else if (anchor._tasksInfo)
popover.show(this._presentationModel.generateMainThreadBarPopupContent(anchor._tasksInfo), anchor, null, null, WebInspector.Popover.Orientation.Bottom);
}

function showCallback(popupContent)
{
popover.show(popupContent, anchor);
}
},

_closeRecordDetails: function()
{
this._popoverHelper.hidePopover();
},

_injectCategoryStyles: function()
{
var style = document.createElement("style");
var categories = WebInspector.TimelinePresentationModel.categories();

style.textContent = Object.values(categories).map(WebInspector.TimelinePresentationModel.createStyleRuleForCategory).join("\n");
document.head.appendChild(style);
},

jumpToNextSearchResult: function()
{
this._jumpToAdjacentRecord(1);
},

jumpToPreviousSearchResult: function()
{
this._jumpToAdjacentRecord(-1);
},

_jumpToAdjacentRecord: function(offset)
{
if (!this._searchResults || !this._searchResults.length || !this._selectedSearchResult)
return;
var index = this._searchResults.indexOf(this._selectedSearchResult);
index = (index + offset + this._searchResults.length) % this._searchResults.length;
this._selectSearchResult(index);
this._highlightSelectedSearchResult(true);
},

_selectSearchResult: function(index)
{
this._selectedSearchResult = this._searchResults[index];
WebInspector.searchController.updateCurrentMatchIndex(index, this);
},

_highlightSelectedSearchResult: function(revealRecord)
{
this._clearHighlight();
if (this._searchFilter)
return;

var record = this._selectedSearchResult;
if (!record)
return;

for (var element = this._sidebarListElement.firstChild; element; element = element.nextSibling) {
if (element.row._record === record) {
element.row.highlight(this._searchRegExp, this._highlightDomChanges);
return;
}
}

if (revealRecord)
this._revealRecord(record);
},

_clearHighlight: function()
{
if (this._highlightDomChanges)
WebInspector.revertDomChanges(this._highlightDomChanges);
this._highlightDomChanges = [];
},


_updateSearchHighlight: function(revealRecord)
{
if (this._searchFilter || !this._searchRegExp) {
this._clearHighlight();
return;
}

if (!this._searchResults)
this._updateSearchResults();

this._highlightSelectedSearchResult(revealRecord);
},

_updateSearchResults: function()
{
var searchRegExp = this._searchRegExp;
if (!searchRegExp)
return;

var matches = [];
var presentationModel = this._presentationModel;

function processRecord(record)
{
if (presentationModel.isVisible(record) && WebInspector.TimelineRecordListRow.testContentMatching(record, searchRegExp))
matches.push(record);
return false;
}
WebInspector.TimelinePresentationModel.forAllRecords(presentationModel.rootRecord().children, processRecord);

var matchesCount = matches.length;
if (matchesCount) {
this._searchResults = matches;
WebInspector.searchController.updateSearchMatchesCount(matchesCount, this);

var selectedIndex = matches.indexOf(this._selectedSearchResult);
if (selectedIndex === -1)
selectedIndex = 0;
this._selectSearchResult(selectedIndex);
} else {
WebInspector.searchController.updateSearchMatchesCount(0, this);
delete this._selectedSearchResult;
}
},

searchCanceled: function()
{
this._clearHighlight();
delete this._searchResults;
delete this._selectedSearchResult;
delete this._searchRegExp;
},


canFilter: function()
{
return true;
},

performFilter: function(searchQuery)
{
this._presentationModel.removeFilter(this._searchFilter);
delete this._searchFilter;
this.searchCanceled();
if (searchQuery) {
this._searchFilter = new WebInspector.TimelineSearchFilter(createPlainTextSearchRegex(searchQuery, "i"));
this._presentationModel.addFilter(this._searchFilter);
}
this._invalidateAndScheduleRefresh(true, true);
},

performSearch: function(searchQuery)
{
this._searchRegExp = createPlainTextSearchRegex(searchQuery, "i");
delete this._searchResults;
this._updateSearchHighlight(true);
},

__proto__: WebInspector.Panel.prototype
}


WebInspector.TimelineCalculator = function(model)
{
this._model = model;
}

WebInspector.TimelineCalculator._minWidth = 5;

WebInspector.TimelineCalculator.prototype = {

computePosition: function(time)
{
return (time - this._minimumBoundary) / this.boundarySpan() * this._workingArea + this.paddingLeft;
},

computeBarGraphPercentages: function(record)
{
var start = (record.startTime - this._minimumBoundary) / this.boundarySpan() * 100;
var end = (record.startTime + record.selfTime - this._minimumBoundary) / this.boundarySpan() * 100;
var endWithChildren = (record.lastChildEndTime - this._minimumBoundary) / this.boundarySpan() * 100;
var cpuWidth = record.coalesced ? endWithChildren - start : record.cpuTime / this.boundarySpan() * 100;
return {start: start, end: end, endWithChildren: endWithChildren, cpuWidth: cpuWidth};
},

computeBarGraphWindowPosition: function(record)
{
var percentages = this.computeBarGraphPercentages(record);
var widthAdjustment = 0;

var left = this.computePosition(record.startTime);
var width = (percentages.end - percentages.start) / 100 * this._workingArea;
if (width < WebInspector.TimelineCalculator._minWidth) {
widthAdjustment = WebInspector.TimelineCalculator._minWidth - width;
left -= widthAdjustment / 2;
width += widthAdjustment;
}
var widthWithChildren = (percentages.endWithChildren - percentages.start) / 100 * this._workingArea + widthAdjustment;
var cpuWidth = percentages.cpuWidth / 100 * this._workingArea + widthAdjustment;
if (percentages.endWithChildren > percentages.end)
widthWithChildren += widthAdjustment;
return {left: left, width: width, widthWithChildren: widthWithChildren, cpuWidth: cpuWidth};
},

setWindow: function(minimumBoundary, maximumBoundary)
{
this._minimumBoundary = minimumBoundary;
this._maximumBoundary = maximumBoundary;
},


setDisplayWindow: function(paddingLeft, clientWidth)
{
this._workingArea = clientWidth - WebInspector.TimelineCalculator._minWidth - paddingLeft;
this.paddingLeft = paddingLeft;
},

formatTime: function(value)
{
return Number.secondsToString(value + this._minimumBoundary - this._model.minimumRecordTime());
},

maximumBoundary: function()
{
return this._maximumBoundary;
},

minimumBoundary: function()
{
return this._minimumBoundary;
},

zeroTime: function()
{
return this._model.minimumRecordTime();
},

boundarySpan: function()
{
return this._maximumBoundary - this._minimumBoundary;
}
}


WebInspector.TimelineRecordListRow = function()
{
this.element = document.createElement("div");
this.element.row = this;
this.element.style.cursor = "pointer";
var iconElement = document.createElement("span");
iconElement.className = "timeline-tree-icon";
this.element.appendChild(iconElement);

this._typeElement = document.createElement("span");
this._typeElement.className = "type";
this.element.appendChild(this._typeElement);

var separatorElement = document.createElement("span");
separatorElement.className = "separator";
separatorElement.textContent = " ";

this._dataElement = document.createElement("span");
this._dataElement.className = "data dimmed";

this.element.appendChild(separatorElement);
this.element.appendChild(this._dataElement);
}

WebInspector.TimelineRecordListRow.prototype = {
update: function(record, isEven, offset)
{
this._record = record;
this._offset = offset;

this.element.className = "timeline-tree-item timeline-category-" + record.category.name;
if (isEven)
this.element.addStyleClass("even");
if (record.hasWarning)
this.element.addStyleClass("warning");
else if (record.childHasWarning)
this.element.addStyleClass("child-warning");
if (record.isBackground)
this.element.addStyleClass("background");

this._typeElement.textContent = record.title;

if (this._dataElement.firstChild)
this._dataElement.removeChildren();

if (record.detailsNode())
this._dataElement.appendChild(record.detailsNode());
},

highlight: function(regExp, domChanges)
{
var matchInfo = this.element.textContent.match(regExp);
if (matchInfo)
WebInspector.highlightSearchResult(this.element, matchInfo.index, matchInfo[0].length, domChanges);
},

dispose: function()
{
this.element.parentElement.removeChild(this.element);
}
}


WebInspector.TimelineRecordListRow.testContentMatching = function(record, regExp)
{
var toSearchText = record.title;
if (record.detailsNode())
toSearchText += " " + record.detailsNode().textContent;
return regExp.test(toSearchText);
}


WebInspector.TimelineRecordGraphRow = function(graphContainer, scheduleRefresh)
{
this.element = document.createElement("div");
this.element.row = this;

this._barAreaElement = document.createElement("div");
this._barAreaElement.className = "timeline-graph-bar-area";
this.element.appendChild(this._barAreaElement);

this._barWithChildrenElement = document.createElement("div");
this._barWithChildrenElement.className = "timeline-graph-bar with-children";
this._barWithChildrenElement.row = this;
this._barAreaElement.appendChild(this._barWithChildrenElement);

this._barCpuElement = document.createElement("div");
this._barCpuElement.className = "timeline-graph-bar cpu"
this._barCpuElement.row = this;
this._barAreaElement.appendChild(this._barCpuElement);

this._barElement = document.createElement("div");
this._barElement.className = "timeline-graph-bar";
this._barElement.row = this;
this._barAreaElement.appendChild(this._barElement);

this._expandElement = new WebInspector.TimelineExpandableElement(graphContainer);
this._expandElement._element.addEventListener("click", this._onClick.bind(this));

this._scheduleRefresh = scheduleRefresh;
}

WebInspector.TimelineRecordGraphRow.prototype = {
update: function(record, isEven, calculator, expandOffset, index)
{
this._record = record;
this.element.className = "timeline-graph-side timeline-category-" + record.category.name;
if (isEven)
this.element.addStyleClass("even");
if (record.isBackground)
this.element.addStyleClass("background");

var barPosition = calculator.computeBarGraphWindowPosition(record);
this._barWithChildrenElement.style.left = barPosition.left + "px";
this._barWithChildrenElement.style.width = barPosition.widthWithChildren + "px";
this._barElement.style.left = barPosition.left + "px";
this._barElement.style.width = barPosition.width + "px";
this._barCpuElement.style.left = barPosition.left + "px";
this._barCpuElement.style.width = barPosition.cpuWidth + "px";
this._expandElement._update(record, index, barPosition.left - expandOffset, barPosition.width);
},

_onClick: function(event)
{
this._record.collapsed = !this._record.collapsed;
this._scheduleRefresh(false, true);
},

dispose: function()
{
this.element.parentElement.removeChild(this.element);
this._expandElement._dispose();
}
}


WebInspector.TimelineExpandableElement = function(container)
{
this._element = document.createElement("div");
this._element.className = "timeline-expandable";

var leftBorder = document.createElement("div");
leftBorder.className = "timeline-expandable-left";
this._element.appendChild(leftBorder);

container.appendChild(this._element);
}

WebInspector.TimelineExpandableElement.prototype = {
_update: function(record, index, left, width)
{
const rowHeight = WebInspector.TimelinePanel.rowHeight;
if (record.visibleChildrenCount || record.invisibleChildrenCount) {
this._element.style.top = index * rowHeight + "px";
this._element.style.left = left + "px";
this._element.style.width = Math.max(12, width + 25) + "px";
if (!record.collapsed) {
this._element.style.height = (record.visibleChildrenCount + 1) * rowHeight + "px";
this._element.addStyleClass("timeline-expandable-expanded");
this._element.removeStyleClass("timeline-expandable-collapsed");
} else {
this._element.style.height = rowHeight + "px";
this._element.addStyleClass("timeline-expandable-collapsed");
this._element.removeStyleClass("timeline-expandable-expanded");
}
this._element.removeStyleClass("hidden");
} else
this._element.addStyleClass("hidden");
},

_dispose: function()
{
this._element.parentElement.removeChild(this._element);
}
}


WebInspector.TimelineCategoryFilter = function()
{
}

WebInspector.TimelineCategoryFilter.prototype = {

accept: function(record)
{
return !record.category.hidden && record.type !== WebInspector.TimelineModel.RecordType.BeginFrame;
}
}


WebInspector.TimelineIsLongFilter = function()
{
this._minimumRecordDuration = 0;
}

WebInspector.TimelineIsLongFilter.prototype = {

setMinimumRecordDuration: function(value)
{
this._minimumRecordDuration = value;
},


accept: function(record)
{
return this._minimumRecordDuration ? ((record.lastChildEndTime - record.startTime) >= this._minimumRecordDuration) : true;
}
}


WebInspector.TimelineSearchFilter = function(regExp)
{
this._regExp = regExp;
}

WebInspector.TimelineSearchFilter.prototype = {


accept: function(record)
{
return WebInspector.TimelineRecordListRow.testContentMatching(record, this._regExp);
}
}
