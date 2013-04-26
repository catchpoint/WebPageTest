


WebInspector = {};
WebInspector.UIString = function(s) { return s; };




WebInspector.HeapSnapshotArraySlice = function(array, start, end)
{
this._array = array;
this._start = start;
this.length = end - start;
}

WebInspector.HeapSnapshotArraySlice.prototype = {
item: function(index)
{
return this._array[this._start + index];
},

slice: function(start, end)
{
if (typeof end === "undefined")
end = this.length;
return this._array.subarray(this._start + start, this._start + end);
}
}


WebInspector.HeapSnapshotEdge = function(snapshot, edges, edgeIndex)
{
this._snapshot = snapshot;
this._edges = edges;
this.edgeIndex = edgeIndex || 0;
}

WebInspector.HeapSnapshotEdge.prototype = {
clone: function()
{
return new WebInspector.HeapSnapshotEdge(this._snapshot, this._edges, this.edgeIndex);
},

hasStringName: function()
{
throw new Error("Not implemented");
},

name: function()
{
throw new Error("Not implemented");
},

node: function()
{
return this._snapshot.createNode(this.nodeIndex());
},

nodeIndex: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeToNodeOffset);
},

rawEdges: function()
{
return this._edges;
},

toString: function()
{
return "HeapSnapshotEdge: " + this.name();
},

type: function()
{
return this._snapshot._edgeTypes[this._type()];
},

serialize: function()
{
var node = this.node();
return {
name: this.name(),
node: node.serialize(),
nodeIndex: this.nodeIndex(),
type: this.type(),
distance: node.distance()
};
},

_type: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeTypeOffset);
}
};


WebInspector.HeapSnapshotEdgeIterator = function(edge)
{
this.edge = edge;
}

WebInspector.HeapSnapshotEdgeIterator.prototype = {
rewind: function()
{
this.edge.edgeIndex = 0;
},

hasNext: function()
{
return this.edge.edgeIndex < this.edge._edges.length;
},

index: function()
{
return this.edge.edgeIndex;
},

setIndex: function(newIndex)
{
this.edge.edgeIndex = newIndex;
},

item: function()
{
return this.edge;
},

next: function()
{
this.edge.edgeIndex += this.edge._snapshot._edgeFieldsCount;
}
};


WebInspector.HeapSnapshotRetainerEdge = function(snapshot, retainedNodeIndex, retainerIndex)
{
this._snapshot = snapshot;
this._retainedNodeIndex = retainedNodeIndex;

var retainedNodeOrdinal = retainedNodeIndex / snapshot._nodeFieldCount;
this._firstRetainer = snapshot._firstRetainerIndex[retainedNodeOrdinal];
this._retainersCount = snapshot._firstRetainerIndex[retainedNodeOrdinal + 1] - this._firstRetainer;

this.setRetainerIndex(retainerIndex);
}

WebInspector.HeapSnapshotRetainerEdge.prototype = {
clone: function()
{
return new WebInspector.HeapSnapshotRetainerEdge(this._snapshot, this._retainedNodeIndex, this.retainerIndex());
},

hasStringName: function()
{
return this._edge().hasStringName();
},

name: function()
{
return this._edge().name();
},

node: function()
{
return this._node();
},

nodeIndex: function()
{
return this._nodeIndex;
},

retainerIndex: function()
{
return this._retainerIndex;
},

setRetainerIndex: function(newIndex)
{
if (newIndex !== this._retainerIndex) {
this._retainerIndex = newIndex;
this.edgeIndex = newIndex;
}
},

set edgeIndex(edgeIndex)
{
var retainerIndex = this._firstRetainer + edgeIndex;
this._globalEdgeIndex = this._snapshot._retainingEdges[retainerIndex];
this._nodeIndex = this._snapshot._retainingNodes[retainerIndex];
delete this._edgeInstance;
delete this._nodeInstance;
},

_node: function()
{
if (!this._nodeInstance)
this._nodeInstance = this._snapshot.createNode(this._nodeIndex);
return this._nodeInstance;
},

_edge: function()
{
if (!this._edgeInstance) {
var edgeIndex = this._globalEdgeIndex - this._node()._edgeIndexesStart();
this._edgeInstance = this._snapshot.createEdge(this._node().rawEdges(), edgeIndex);
}
return this._edgeInstance;
},

toString: function()
{
return this._edge().toString();
},

serialize: function()
{
var node = this.node();
return {
name: this.name(),
node: node.serialize(),
nodeIndex: this.nodeIndex(),
type: this.type(),
distance: node.distance()
};
},

type: function()
{
return this._edge().type();
}
}


WebInspector.HeapSnapshotRetainerEdgeIterator = function(retainer)
{
this.retainer = retainer;
}

WebInspector.HeapSnapshotRetainerEdgeIterator.prototype = {
rewind: function()
{
this.retainer.setRetainerIndex(0);
},

hasNext: function()
{
return this.retainer.retainerIndex() < this.retainer._retainersCount;
},

index: function()
{
return this.retainer.retainerIndex();
},

setIndex: function(newIndex)
{
this.retainer.setRetainerIndex(newIndex);
},

item: function()
{
return this.retainer;
},

next: function()
{
this.retainer.setRetainerIndex(this.retainer.retainerIndex() + 1);
}
};


WebInspector.HeapSnapshotNode = function(snapshot, nodeIndex)
{
this._snapshot = snapshot;
this._firstNodeIndex = nodeIndex;
this.nodeIndex = nodeIndex;
}

WebInspector.HeapSnapshotNode.prototype = {
distance: function()
{
return this._snapshot._nodeDistances[this.nodeIndex / this._snapshot._nodeFieldCount];
},

className: function()
{
throw new Error("Not implemented");
},

classIndex: function()
{
throw new Error("Not implemented");
},

dominatorIndex: function()
{
var nodeFieldCount = this._snapshot._nodeFieldCount;
return this._snapshot._dominatorsTree[this.nodeIndex / this._snapshot._nodeFieldCount] * nodeFieldCount;
},

edges: function()
{
return new WebInspector.HeapSnapshotEdgeIterator(this._snapshot.createEdge(this.rawEdges(), 0));
},

edgesCount: function()
{
return (this._edgeIndexesEnd() - this._edgeIndexesStart()) / this._snapshot._edgeFieldsCount;
},

id: function()
{
throw new Error("Not implemented");
},

isRoot: function()
{
return this.nodeIndex === this._snapshot._rootNodeIndex;
},

name: function()
{
return this._snapshot._strings[this._name()];
},

rawEdges: function()
{
return new WebInspector.HeapSnapshotArraySlice(this._snapshot._containmentEdges, this._edgeIndexesStart(), this._edgeIndexesEnd());
},

retainedSize: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeRetainedSizeOffset];
},

retainers: function()
{
return new WebInspector.HeapSnapshotRetainerEdgeIterator(this._snapshot.createRetainingEdge(this.nodeIndex, 0));
},

selfSize: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeSelfSizeOffset];
},

type: function()
{
return this._snapshot._nodeTypes[this._type()];
},

serialize: function()
{
return {
id: this.id(),
name: this.name(),
distance: this.distance(),
nodeIndex: this.nodeIndex,
retainedSize: this.retainedSize(),
selfSize: this.selfSize(),
type: this.type(),
};
},

_name: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeNameOffset];
},

_edgeIndexesStart: function()
{
return this._snapshot._firstEdgeIndexes[this._ordinal()];
},

_edgeIndexesEnd: function()
{
return this._snapshot._firstEdgeIndexes[this._ordinal() + 1];
},

_ordinal: function()
{
return this.nodeIndex / this._snapshot._nodeFieldCount;
},

_nextNodeIndex: function()
{
return this.nodeIndex + this._snapshot._nodeFieldCount;
},

_type: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeTypeOffset];
}
};


WebInspector.HeapSnapshotNodeIterator = function(node)
{
this.node = node;
this._nodesLength = node._snapshot._nodes.length;
}

WebInspector.HeapSnapshotNodeIterator.prototype = {
rewind: function()
{
this.node.nodeIndex = this.node._firstNodeIndex;
},

hasNext: function()
{
return this.node.nodeIndex < this._nodesLength;
},

index: function()
{
return this.node.nodeIndex;
},

setIndex: function(newIndex)
{
this.node.nodeIndex = newIndex;
},

item: function()
{
return this.node;
},

next: function()
{
this.node.nodeIndex = this.node._nextNodeIndex();
}
}


WebInspector.HeapSnapshot = function(profile)
{
this.uid = profile.snapshot.uid;
this._nodes = profile.nodes;
this._containmentEdges = profile.edges;

this._metaNode = profile.snapshot.meta;
this._strings = profile.strings;

this._rootNodeIndex = 0;
if (profile.snapshot.root_index)
this._rootNodeIndex = profile.snapshot.root_index;

this._snapshotDiffs = {};
this._aggregatesForDiff = null;

this._init();
}


function HeapSnapshotMetainfo()
{

this.node_fields = [];
this.node_types = [];
this.edge_fields = [];
this.edge_types = [];
this.type_strings = {};


this.fields = [];
this.types = [];
}


function HeapSnapshotHeader()
{

this.title = "";
this.uid = 0;
this.meta = new HeapSnapshotMetainfo();
this.node_count = 0;
this.edge_count = 0;
}

WebInspector.HeapSnapshot.prototype = {
_init: function()
{
var meta = this._metaNode;

this._nodeTypeOffset = meta.node_fields.indexOf("type");
this._nodeNameOffset = meta.node_fields.indexOf("name");
this._nodeIdOffset = meta.node_fields.indexOf("id");
this._nodeSelfSizeOffset = meta.node_fields.indexOf("self_size");
this._nodeEdgeCountOffset = meta.node_fields.indexOf("edge_count");
this._nodeFieldCount = meta.node_fields.length;

this._nodeTypes = meta.node_types[this._nodeTypeOffset];
this._nodeHiddenType = this._nodeTypes.indexOf("hidden");
this._nodeObjectType = this._nodeTypes.indexOf("object");
this._nodeNativeType = this._nodeTypes.indexOf("native");
this._nodeCodeType = this._nodeTypes.indexOf("code");
this._nodeSyntheticType = this._nodeTypes.indexOf("synthetic");

this._edgeFieldsCount = meta.edge_fields.length;
this._edgeTypeOffset = meta.edge_fields.indexOf("type");
this._edgeNameOffset = meta.edge_fields.indexOf("name_or_index");
this._edgeToNodeOffset = meta.edge_fields.indexOf("to_node");

this._edgeTypes = meta.edge_types[this._edgeTypeOffset];
this._edgeTypes.push("invisible");
this._edgeElementType = this._edgeTypes.indexOf("element");
this._edgeHiddenType = this._edgeTypes.indexOf("hidden");
this._edgeInternalType = this._edgeTypes.indexOf("internal");
this._edgeShortcutType = this._edgeTypes.indexOf("shortcut");
this._edgeWeakType = this._edgeTypes.indexOf("weak");
this._edgeInvisibleType = this._edgeTypes.indexOf("invisible");

this.nodeCount = this._nodes.length / this._nodeFieldCount;
this._edgeCount = this._containmentEdges.length / this._edgeFieldsCount;

this._buildEdgeIndexes();
this._markInvisibleEdges();
this._buildRetainers();
this._calculateFlags();
this._calculateDistances();
var result = this._buildPostOrderIndex();

this._dominatorsTree = this._buildDominatorTree(result.postOrderIndex2NodeOrdinal, result.nodeOrdinal2PostOrderIndex);
this._calculateRetainedSizes(result.postOrderIndex2NodeOrdinal);
this._buildDominatedNodes();
},

_buildEdgeIndexes: function()
{
var nodes = this._nodes;
var nodeCount = this.nodeCount;
var firstEdgeIndexes = this._firstEdgeIndexes = new Uint32Array(nodeCount + 1);
var nodeFieldCount = this._nodeFieldCount;
var edgeFieldsCount = this._edgeFieldsCount;
var nodeEdgeCountOffset = this._nodeEdgeCountOffset;
firstEdgeIndexes[nodeCount] = this._containmentEdges.length;
for (var nodeOrdinal = 0, edgeIndex = 0; nodeOrdinal < nodeCount; ++nodeOrdinal) {
firstEdgeIndexes[nodeOrdinal] = edgeIndex;
edgeIndex += nodes[nodeOrdinal * nodeFieldCount + nodeEdgeCountOffset] * edgeFieldsCount;
}
},

_buildRetainers: function()
{
var retainingNodes = this._retainingNodes = new Uint32Array(this._edgeCount);
var retainingEdges = this._retainingEdges = new Uint32Array(this._edgeCount);


var firstRetainerIndex = this._firstRetainerIndex = new Uint32Array(this.nodeCount + 1);

var containmentEdges = this._containmentEdges;
var edgeFieldsCount = this._edgeFieldsCount;
var nodeFieldCount = this._nodeFieldCount;
var edgeToNodeOffset = this._edgeToNodeOffset;
var nodes = this._nodes;
var firstEdgeIndexes = this._firstEdgeIndexes;
var nodeCount = this.nodeCount;

for (var toNodeFieldIndex = edgeToNodeOffset, l = containmentEdges.length; toNodeFieldIndex < l; toNodeFieldIndex += edgeFieldsCount) {
var toNodeIndex = containmentEdges[toNodeFieldIndex];
if (toNodeIndex % nodeFieldCount)
throw new Error("Invalid toNodeIndex " + toNodeIndex);
++firstRetainerIndex[toNodeIndex / nodeFieldCount];
}
for (var i = 0, firstUnusedRetainerSlot = 0; i < nodeCount; i++) {
var retainersCount = firstRetainerIndex[i];
firstRetainerIndex[i] = firstUnusedRetainerSlot;
retainingNodes[firstUnusedRetainerSlot] = retainersCount;
firstUnusedRetainerSlot += retainersCount;
}
firstRetainerIndex[nodeCount] = retainingNodes.length;

var nextNodeFirstEdgeIndex = firstEdgeIndexes[0];
for (var srcNodeOrdinal = 0; srcNodeOrdinal < nodeCount; ++srcNodeOrdinal) {
var firstEdgeIndex = nextNodeFirstEdgeIndex;
nextNodeFirstEdgeIndex = firstEdgeIndexes[srcNodeOrdinal + 1];
var srcNodeIndex = srcNodeOrdinal * nodeFieldCount;
for (var edgeIndex = firstEdgeIndex; edgeIndex < nextNodeFirstEdgeIndex; edgeIndex += edgeFieldsCount) {
var toNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
if (toNodeIndex % nodeFieldCount)
throw new Error("Invalid toNodeIndex " + toNodeIndex);
var firstRetainerSlotIndex = firstRetainerIndex[toNodeIndex / nodeFieldCount];
var nextUnusedRetainerSlotIndex = firstRetainerSlotIndex + (--retainingNodes[firstRetainerSlotIndex]);
retainingNodes[nextUnusedRetainerSlotIndex] = srcNodeIndex;
retainingEdges[nextUnusedRetainerSlotIndex] = edgeIndex;
}
}
},


createNode: function(nodeIndex)
{
throw new Error("Not implemented");
},

createEdge: function(edges, edgeIndex)
{
throw new Error("Not implemented");
},

createRetainingEdge: function(retainedNodeIndex, retainerIndex)
{
throw new Error("Not implemented");
},

dispose: function()
{
delete this._nodes;
delete this._strings;
delete this._retainingEdges;
delete this._retainingNodes;
delete this._firstRetainerIndex;
if (this._aggregates) {
delete this._aggregates;
delete this._aggregatesSortedFlags;
}
delete this._dominatedNodes;
delete this._firstDominatedNodeIndex;
delete this._nodeDistances;
delete this._dominatorsTree;
},

_allNodes: function()
{
return new WebInspector.HeapSnapshotNodeIterator(this.rootNode());
},

rootNode: function()
{
return this.createNode(this._rootNodeIndex);
},

get rootNodeIndex()
{
return this._rootNodeIndex;
},

get totalSize()
{
return this.rootNode().retainedSize();
},

_getDominatedIndex: function(nodeIndex)
{
if (nodeIndex % this._nodeFieldCount)
throw new Error("Invalid nodeIndex: " + nodeIndex);
return this._firstDominatedNodeIndex[nodeIndex / this._nodeFieldCount];
},

_dominatedNodesOfNode: function(node)
{
var dominatedIndexFrom = this._getDominatedIndex(node.nodeIndex);
var dominatedIndexTo = this._getDominatedIndex(node._nextNodeIndex());
return new WebInspector.HeapSnapshotArraySlice(this._dominatedNodes, dominatedIndexFrom, dominatedIndexTo);
},


aggregates: function(sortedIndexes, key, filterString)
{
if (!this._aggregates) {
this._aggregates = {};
this._aggregatesSortedFlags = {};
}

var aggregatesByClassName = this._aggregates[key];
if (aggregatesByClassName) {
if (sortedIndexes && !this._aggregatesSortedFlags[key]) {
this._sortAggregateIndexes(aggregatesByClassName);
this._aggregatesSortedFlags[key] = sortedIndexes;
}
return aggregatesByClassName;
}

var filter;
if (filterString)
filter = this._parseFilter(filterString);

var aggregates = this._buildAggregates(filter);
this._calculateClassesRetainedSize(aggregates.aggregatesByClassIndex, filter);
aggregatesByClassName = aggregates.aggregatesByClassName;

if (sortedIndexes)
this._sortAggregateIndexes(aggregatesByClassName);

this._aggregatesSortedFlags[key] = sortedIndexes;
this._aggregates[key] = aggregatesByClassName;

return aggregatesByClassName;
},

aggregatesForDiff: function()
{
if (this._aggregatesForDiff)
return this._aggregatesForDiff;

var aggregatesByClassName = this.aggregates(true, "allObjects");
this._aggregatesForDiff  = {};

var node = this.createNode();
for (var className in aggregatesByClassName) {
var aggregate = aggregatesByClassName[className];
var indexes = aggregate.idxs;
var ids = new Array(indexes.length);
var selfSizes = new Array(indexes.length);
for (var i = 0; i < indexes.length; i++) {
node.nodeIndex = indexes[i];
ids[i] = node.id();
selfSizes[i] = node.selfSize();
}

this._aggregatesForDiff[className] = {
indexes: indexes,
ids: ids,
selfSizes: selfSizes
};
}
return this._aggregatesForDiff;
},

distanceForUserRoot: function(node)
{
return 1;
},

_calculateDistances: function()
{
var nodeFieldCount = this._nodeFieldCount;
var distances = new Uint32Array(this.nodeCount);


var nodesToVisit = new Uint32Array(this.nodeCount);
var nodesToVisitLength = 0;
for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
var node = iter.edge.node();
var distance = this.distanceForUserRoot(node);
if (distance !== -1) {
nodesToVisit[nodesToVisitLength++] = node.nodeIndex;
distances[node.nodeIndex / nodeFieldCount] = distance;
}
}
this._bfs(nodesToVisit, nodesToVisitLength, distances);


nodesToVisitLength = 0;
nodesToVisit[nodesToVisitLength++] = this._rootNodeIndex;
distances[this._rootNodeIndex / nodeFieldCount] = 1;
this._bfs(nodesToVisit, nodesToVisitLength, distances);
this._nodeDistances = distances;
},

_bfs: function(nodesToVisit, nodesToVisitLength, distances)
{

var edgeFieldsCount = this._edgeFieldsCount;
var nodeFieldCount = this._nodeFieldCount;
var containmentEdges = this._containmentEdges;
var firstEdgeIndexes = this._firstEdgeIndexes;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeTypeOffset = this._edgeTypeOffset;
var nodes = this._nodes;
var nodeCount = this.nodeCount;
var containmentEdgesLength = containmentEdges.length;
var edgeWeakType = this._edgeWeakType;

var index = 0;
while (index < nodesToVisitLength) {
var nodeIndex = nodesToVisit[index++]; 
var nodeOrdinal = nodeIndex / nodeFieldCount;
var distance = distances[nodeOrdinal] + 1;
var firstEdgeIndex = firstEdgeIndexes[nodeOrdinal];
var edgesEnd = firstEdgeIndexes[nodeOrdinal + 1];
for (var edgeIndex = firstEdgeIndex; edgeIndex < edgesEnd; edgeIndex += edgeFieldsCount) {
var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
if (edgeType == edgeWeakType)
continue;
var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
var childNodeOrdinal = childNodeIndex / nodeFieldCount;
if (distances[childNodeOrdinal])
continue;
distances[childNodeOrdinal] = distance;
nodesToVisit[nodesToVisitLength++] = childNodeIndex;
}
}
if (nodesToVisitLength > nodeCount)
throw new Error("BFS failed. Nodes to visit (" + nodesToVisitLength + ") is more than nodes count (" + nodeCount + ")");
},

_buildAggregates: function(filter)
{
var aggregates = {};
var aggregatesByClassName = {};
var classIndexes = [];
var nodes = this._nodes;
var mapAndFlag = this.userObjectsMapAndFlag();
var flags = mapAndFlag ? mapAndFlag.map : null;
var flag = mapAndFlag ? mapAndFlag.flag : 0;
var nodesLength = nodes.length;
var nodeNativeType = this._nodeNativeType;
var nodeFieldCount = this._nodeFieldCount;
var selfSizeOffset = this._nodeSelfSizeOffset;
var nodeTypeOffset = this._nodeTypeOffset;
var node = this.rootNode();
var nodeDistances = this._nodeDistances;

for (var nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
var nodeOrdinal = nodeIndex / nodeFieldCount;
if (flags && !(flags[nodeOrdinal] & flag))
continue;
node.nodeIndex = nodeIndex;
if (filter && !filter(node))
continue;
var selfSize = nodes[nodeIndex + selfSizeOffset];
if (!selfSize && nodes[nodeIndex + nodeTypeOffset] !== nodeNativeType)
continue;
var classIndex = node.classIndex();
if (!(classIndex in aggregates)) {
var nodeType = node.type();
var nameMatters = nodeType === "object" || nodeType === "native";
var value = {
count: 1,
distance: nodeDistances[nodeOrdinal],
self: selfSize,
maxRet: 0,
type: nodeType,
name: nameMatters ? node.name() : null,
idxs: [nodeIndex]
};
aggregates[classIndex] = value;
classIndexes.push(classIndex);
aggregatesByClassName[node.className()] = value;
} else {
var clss = aggregates[classIndex];
clss.distance = Math.min(clss.distance, nodeDistances[nodeOrdinal]);
++clss.count;
clss.self += selfSize;
clss.idxs.push(nodeIndex);
}
}


for (var i = 0, l = classIndexes.length; i < l; ++i) {
var classIndex = classIndexes[i];
aggregates[classIndex].idxs = aggregates[classIndex].idxs.slice();
}
return {aggregatesByClassName: aggregatesByClassName, aggregatesByClassIndex: aggregates};
},

_calculateClassesRetainedSize: function(aggregates, filter)
{
var rootNodeIndex = this._rootNodeIndex;
var node = this.createNode(rootNodeIndex);
var list = [rootNodeIndex];
var sizes = [-1];
var classes = [];
var seenClassNameIndexes = {};
var nodeFieldCount = this._nodeFieldCount;
var nodeTypeOffset = this._nodeTypeOffset;
var nodeNativeType = this._nodeNativeType;
var dominatedNodes = this._dominatedNodes;
var nodes = this._nodes;
var mapAndFlag = this.userObjectsMapAndFlag();
var flags = mapAndFlag ? mapAndFlag.map : null;
var flag = mapAndFlag ? mapAndFlag.flag : 0;
var firstDominatedNodeIndex = this._firstDominatedNodeIndex;

while (list.length) {
var nodeIndex = list.pop();
node.nodeIndex = nodeIndex;
var classIndex = node.classIndex();
var seen = !!seenClassNameIndexes[classIndex];
var nodeOrdinal = nodeIndex / nodeFieldCount;
var dominatedIndexFrom = firstDominatedNodeIndex[nodeOrdinal];
var dominatedIndexTo = firstDominatedNodeIndex[nodeOrdinal + 1];

if (!seen &&
(!flags || (flags[nodeOrdinal] & flag)) &&
(!filter || filter(node)) &&
(node.selfSize() || nodes[nodeIndex + nodeTypeOffset] === nodeNativeType)
) {
aggregates[classIndex].maxRet += node.retainedSize();
if (dominatedIndexFrom !== dominatedIndexTo) {
seenClassNameIndexes[classIndex] = true;
sizes.push(list.length);
classes.push(classIndex);
}
}
for (var i = dominatedIndexFrom; i < dominatedIndexTo; i++)
list.push(dominatedNodes[i]);

var l = list.length;
while (sizes[sizes.length - 1] === l) {
sizes.pop();
classIndex = classes.pop();
seenClassNameIndexes[classIndex] = false;
}
}
},

_sortAggregateIndexes: function(aggregates)
{
var nodeA = this.createNode();
var nodeB = this.createNode();
for (var clss in aggregates)
aggregates[clss].idxs.sort(
function(idxA, idxB) {
nodeA.nodeIndex = idxA;
nodeB.nodeIndex = idxB;
return nodeA.id() < nodeB.id() ? -1 : 1;
});
},

_buildPostOrderIndex: function()
{
var nodeFieldCount = this._nodeFieldCount;
var nodes = this._nodes;
var nodeCount = this.nodeCount;
var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;

var edgeFieldsCount = this._edgeFieldsCount;
var edgeTypeOffset = this._edgeTypeOffset;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeShortcutType = this._edgeShortcutType;
var firstEdgeIndexes = this._firstEdgeIndexes;
var containmentEdges = this._containmentEdges;
var containmentEdgesLength = this._containmentEdges.length;

var mapAndFlag = this.userObjectsMapAndFlag();
var flags = mapAndFlag ? mapAndFlag.map : null;
var flag = mapAndFlag ? mapAndFlag.flag : 0;

var nodesToVisit = new Uint32Array(nodeCount);
var postOrderIndex2NodeOrdinal = new Uint32Array(nodeCount);
var nodeOrdinal2PostOrderIndex = new Uint32Array(nodeCount);
var painted = new Uint8Array(nodeCount);
var nodesToVisitLength = 0;
var postOrderIndex = 0;
var grey = 1;
var black = 2;

nodesToVisit[nodesToVisitLength++] = rootNodeOrdinal;
painted[rootNodeOrdinal] = grey;

while (nodesToVisitLength) {
var nodeOrdinal = nodesToVisit[nodesToVisitLength - 1];

if (painted[nodeOrdinal] === grey) {
painted[nodeOrdinal] = black;
var nodeFlag = !flags || (flags[nodeOrdinal] & flag);
var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
if (nodeOrdinal !== rootNodeOrdinal && containmentEdges[edgeIndex + edgeTypeOffset] === edgeShortcutType)
continue;
var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
var childNodeOrdinal = childNodeIndex / nodeFieldCount;
var childNodeFlag = !flags || (flags[childNodeOrdinal] & flag);


if (nodeOrdinal !== rootNodeOrdinal && childNodeFlag && !nodeFlag)
continue;
if (!painted[childNodeOrdinal]) {
painted[childNodeOrdinal] = grey;
nodesToVisit[nodesToVisitLength++] = childNodeOrdinal;
}
}
} else {
nodeOrdinal2PostOrderIndex[nodeOrdinal] = postOrderIndex;
postOrderIndex2NodeOrdinal[postOrderIndex++] = nodeOrdinal;
--nodesToVisitLength;
}
}

if (postOrderIndex !== nodeCount) {
var dumpNode = this.rootNode();
for (var i = 0; i < nodeCount; ++i) {
if (painted[i] !== black) {
dumpNode.nodeIndex = i * nodeFieldCount;
console.log(JSON.stringify(dumpNode.serialize()));
var retainers = dumpNode.retainers();
while (retainers) {
console.log("edgeName: " + retainers.item().name() + " nodeClassName: " + retainers.item().node().className());
retainers = retainers.item().node().retainers();
}
}
}
throw new Error("Postordering failed. " + (nodeCount - postOrderIndex) + " hanging nodes");
}

return {postOrderIndex2NodeOrdinal: postOrderIndex2NodeOrdinal, nodeOrdinal2PostOrderIndex: nodeOrdinal2PostOrderIndex};
},





_buildDominatorTree: function(postOrderIndex2NodeOrdinal, nodeOrdinal2PostOrderIndex)
{
var nodeFieldCount = this._nodeFieldCount;
var nodes = this._nodes;
var firstRetainerIndex = this._firstRetainerIndex;
var retainingNodes = this._retainingNodes;
var retainingEdges = this._retainingEdges;
var edgeFieldsCount = this._edgeFieldsCount;
var edgeTypeOffset = this._edgeTypeOffset;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeShortcutType = this._edgeShortcutType;
var firstEdgeIndexes = this._firstEdgeIndexes;
var containmentEdges = this._containmentEdges;
var containmentEdgesLength = this._containmentEdges.length;
var rootNodeIndex = this._rootNodeIndex;

var mapAndFlag = this.userObjectsMapAndFlag();
var flags = mapAndFlag ? mapAndFlag.map : null;
var flag = mapAndFlag ? mapAndFlag.flag : 0;

var nodesCount = postOrderIndex2NodeOrdinal.length;
var rootPostOrderedIndex = nodesCount - 1;
var noEntry = nodesCount;
var dominators = new Uint32Array(nodesCount);
for (var i = 0; i < rootPostOrderedIndex; ++i)
dominators[i] = noEntry;
dominators[rootPostOrderedIndex] = rootPostOrderedIndex;



var affected = new Uint8Array(nodesCount);
var nodeOrdinal;

{ 
nodeOrdinal = this._rootNodeIndex / nodeFieldCount;
var beginEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal] + edgeToNodeOffset;
var endEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var toNodeFieldIndex = beginEdgeToNodeFieldIndex;
toNodeFieldIndex < endEdgeToNodeFieldIndex;
toNodeFieldIndex += edgeFieldsCount) {
var childNodeOrdinal = containmentEdges[toNodeFieldIndex] / nodeFieldCount;
affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]] = 1;
}
}

var changed = true;
while (changed) {
changed = false;
for (var postOrderIndex = rootPostOrderedIndex - 1; postOrderIndex >= 0; --postOrderIndex) {
if (affected[postOrderIndex] === 0)
continue;
affected[postOrderIndex] = 0;


if (dominators[postOrderIndex] === rootPostOrderedIndex)
continue;
nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
var nodeFlag = !flags || (flags[nodeOrdinal] & flag);
var newDominatorIndex = noEntry;
var beginRetainerIndex = firstRetainerIndex[nodeOrdinal];
var endRetainerIndex = firstRetainerIndex[nodeOrdinal + 1];
for (var retainerIndex = beginRetainerIndex; retainerIndex < endRetainerIndex; ++retainerIndex) {
var retainerEdgeIndex = retainingEdges[retainerIndex];
var retainerEdgeType = containmentEdges[retainerEdgeIndex + edgeTypeOffset];
var retainerNodeIndex = retainingNodes[retainerIndex];
if (retainerNodeIndex !== rootNodeIndex && retainerEdgeType === edgeShortcutType)
continue;
var retainerNodeOrdinal = retainerNodeIndex / nodeFieldCount;
var retainerNodeFlag = !flags || (flags[retainerNodeOrdinal] & flag);


if (retainerNodeIndex !== rootNodeIndex && nodeFlag && !retainerNodeFlag)
continue;
var retanerPostOrderIndex = nodeOrdinal2PostOrderIndex[retainerNodeOrdinal];
if (dominators[retanerPostOrderIndex] !== noEntry) {
if (newDominatorIndex === noEntry)
newDominatorIndex = retanerPostOrderIndex;
else {
while (retanerPostOrderIndex !== newDominatorIndex) {
while (retanerPostOrderIndex < newDominatorIndex)
retanerPostOrderIndex = dominators[retanerPostOrderIndex];
while (newDominatorIndex < retanerPostOrderIndex)
newDominatorIndex = dominators[newDominatorIndex];
}
}


if (newDominatorIndex === rootPostOrderedIndex)
break;
}
}
if (newDominatorIndex !== noEntry && dominators[postOrderIndex] !== newDominatorIndex) {
dominators[postOrderIndex] = newDominatorIndex;
changed = true;
nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
beginEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal] + edgeToNodeOffset;
endEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var toNodeFieldIndex = beginEdgeToNodeFieldIndex;
toNodeFieldIndex < endEdgeToNodeFieldIndex;
toNodeFieldIndex += edgeFieldsCount) {
var childNodeOrdinal = containmentEdges[toNodeFieldIndex] / nodeFieldCount;
affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]] = 1;
}
}
}
}

var dominatorsTree = new Uint32Array(nodesCount);
for (var postOrderIndex = 0, l = dominators.length; postOrderIndex < l; ++postOrderIndex) {
nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
dominatorsTree[nodeOrdinal] = postOrderIndex2NodeOrdinal[dominators[postOrderIndex]];
}
return dominatorsTree;
},

_calculateRetainedSizes: function(postOrderIndex2NodeOrdinal)
{
var nodeCount = this.nodeCount;
var nodes = this._nodes;
var nodeSelfSizeOffset = this._nodeSelfSizeOffset;
var nodeFieldCount = this._nodeFieldCount;
var dominatorsTree = this._dominatorsTree;

var nodeRetainedSizeOffset = this._nodeRetainedSizeOffset = this._nodeEdgeCountOffset;
delete this._nodeEdgeCountOffset;

for (var nodeIndex = 0, l = nodes.length; nodeIndex < l; nodeIndex += nodeFieldCount)
nodes[nodeIndex + nodeRetainedSizeOffset] = nodes[nodeIndex + nodeSelfSizeOffset];


for (var postOrderIndex = 0; postOrderIndex < nodeCount - 1; ++postOrderIndex) {
var nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
var nodeIndex = nodeOrdinal * nodeFieldCount;
var dominatorIndex = dominatorsTree[nodeOrdinal] * nodeFieldCount;
nodes[dominatorIndex + nodeRetainedSizeOffset] += nodes[nodeIndex + nodeRetainedSizeOffset];
}
},

_buildDominatedNodes: function()
{





var indexArray = this._firstDominatedNodeIndex = new Uint32Array(this.nodeCount + 1);

var dominatedNodes = this._dominatedNodes = new Uint32Array(this.nodeCount - 1);



var nodeFieldCount = this._nodeFieldCount;
var dominatorsTree = this._dominatorsTree;

var fromNodeOrdinal = 0;
var toNodeOrdinal = this.nodeCount;
var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;
if (rootNodeOrdinal === fromNodeOrdinal)
fromNodeOrdinal = 1;
else if (rootNodeOrdinal === toNodeOrdinal - 1)
toNodeOrdinal = toNodeOrdinal - 1;
else
throw new Error("Root node is expected to be either first or last");
for (var nodeOrdinal = fromNodeOrdinal; nodeOrdinal < toNodeOrdinal; ++nodeOrdinal)
++indexArray[dominatorsTree[nodeOrdinal]];


var firstDominatedNodeIndex = 0;
for (var i = 0, l = this.nodeCount; i < l; ++i) {
var dominatedCount = dominatedNodes[firstDominatedNodeIndex] = indexArray[i];
indexArray[i] = firstDominatedNodeIndex;
firstDominatedNodeIndex += dominatedCount;
}
indexArray[this.nodeCount] = dominatedNodes.length;


for (var nodeOrdinal = fromNodeOrdinal; nodeOrdinal < toNodeOrdinal; ++nodeOrdinal) {
var dominatorOrdinal = dominatorsTree[nodeOrdinal];
var dominatedRefIndex = indexArray[dominatorOrdinal];
dominatedRefIndex += (--dominatedNodes[dominatedRefIndex]);
dominatedNodes[dominatedRefIndex] = nodeOrdinal * nodeFieldCount;
}
},

_markInvisibleEdges: function()
{
throw new Error("Not implemented");
},

_numbersComparator: function(a, b)
{
return a < b ? -1 : (a > b ? 1 : 0);
},

_calculateFlags: function()
{
throw new Error("Not implemented");
},

userObjectsMapAndFlag: function()
{
throw new Error("Not implemented");
},

calculateSnapshotDiff: function(baseSnapshotId, baseSnapshotAggregates)
{
var snapshotDiff = this._snapshotDiffs[baseSnapshotId];
if (snapshotDiff)
return snapshotDiff;
snapshotDiff = {};

var aggregates = this.aggregates(true, "allObjects");
for (var className in baseSnapshotAggregates) {
var baseAggregate = baseSnapshotAggregates[className];
var diff = this._calculateDiffForClass(baseAggregate, aggregates[className]);
if (diff)
snapshotDiff[className] = diff;
}
var emptyBaseAggregate = { ids: [], indexes: [], selfSizes: [] };
for (var className in aggregates) {
if (className in baseSnapshotAggregates)
continue;
snapshotDiff[className] = this._calculateDiffForClass(emptyBaseAggregate, aggregates[className]);
}

this._snapshotDiffs[baseSnapshotId] = snapshotDiff;
return snapshotDiff;
},

_calculateDiffForClass: function(baseAggregate, aggregate)
{
var baseIds = baseAggregate.ids;
var baseIndexes = baseAggregate.indexes;
var baseSelfSizes = baseAggregate.selfSizes;

var indexes = aggregate ? aggregate.idxs : [];

var i = 0, l = baseIds.length;
var j = 0, m = indexes.length;
var diff = { addedCount: 0,
removedCount: 0,
addedSize: 0,
removedSize: 0,
deletedIndexes: [],
addedIndexes: [] };

var nodeB = this.createNode(indexes[j]);
while (i < l && j < m) {
var nodeAId = baseIds[i];
if (nodeAId < nodeB.id()) {
diff.deletedIndexes.push(baseIndexes[i]);
diff.removedCount++;
diff.removedSize += baseSelfSizes[i];
++i;
} else if (nodeAId > nodeB.id()) { 
diff.addedIndexes.push(indexes[j]);
diff.addedCount++;
diff.addedSize += nodeB.selfSize();
nodeB.nodeIndex = indexes[++j];
} else { 
++i;
nodeB.nodeIndex = indexes[++j];
}
}
while (i < l) {
diff.deletedIndexes.push(baseIndexes[i]);
diff.removedCount++;
diff.removedSize += baseSelfSizes[i];
++i;
}
while (j < m) {
diff.addedIndexes.push(indexes[j]);
diff.addedCount++;
diff.addedSize += nodeB.selfSize();
nodeB.nodeIndex = indexes[++j];
}
diff.countDelta = diff.addedCount - diff.removedCount;
diff.sizeDelta = diff.addedSize - diff.removedSize;
if (!diff.addedCount && !diff.removedCount)
return null;
return diff;
},

_nodeForSnapshotObjectId: function(snapshotObjectId)
{
for (var it = this._allNodes(); it.hasNext(); it.next()) {
if (it.node.id() === snapshotObjectId)
return it.node;
}
return null;
},

nodeClassName: function(snapshotObjectId)
{
var node = this._nodeForSnapshotObjectId(snapshotObjectId);
if (node)
return node.className();
return null;
},

dominatorIdsForNode: function(snapshotObjectId)
{
var node = this._nodeForSnapshotObjectId(snapshotObjectId);
if (!node)
return null;
var result = [];
while (!node.isRoot()) {
result.push(node.id());
node.nodeIndex = node.dominatorIndex();
}
return result;
},

_parseFilter: function(filter)
{
if (!filter)
return null;
var parsedFilter = eval("(function(){return " + filter + "})()");
return parsedFilter.bind(this);
},

createEdgesProvider: function(nodeIndex, showHiddenData)
{
var node = this.createNode(nodeIndex);
var filter = this.containmentEdgesFilter(showHiddenData);
return new WebInspector.HeapSnapshotEdgesProvider(this, filter, node.edges());
},

createEdgesProviderForTest: function(nodeIndex, filter)
{
var node = this.createNode(nodeIndex);
return new WebInspector.HeapSnapshotEdgesProvider(this, filter, node.edges());
},

retainingEdgesFilter: function(showHiddenData)
{
return null;
},

containmentEdgesFilter: function(showHiddenData)
{
return null;
},

createRetainingEdgesProvider: function(nodeIndex, showHiddenData)
{
var node = this.createNode(nodeIndex);
var filter = this.retainingEdgesFilter(showHiddenData);
return new WebInspector.HeapSnapshotEdgesProvider(this, filter, node.retainers());
},

createAddedNodesProvider: function(baseSnapshotId, className)
{
var snapshotDiff = this._snapshotDiffs[baseSnapshotId];
var diffForClass = snapshotDiff[className];
return new WebInspector.HeapSnapshotNodesProvider(this, null, diffForClass.addedIndexes);
},

createDeletedNodesProvider: function(nodeIndexes)
{
return new WebInspector.HeapSnapshotNodesProvider(this, null, nodeIndexes);
},

classNodesFilter: function()
{
return null;
},

createNodesProviderForClass: function(className, aggregatesKey)
{
return new WebInspector.HeapSnapshotNodesProvider(this, this.classNodesFilter(), this.aggregates(false, aggregatesKey)[className].idxs);
},

createNodesProviderForDominator: function(nodeIndex)
{
var node = this.createNode(nodeIndex);
return new WebInspector.HeapSnapshotNodesProvider(this, null, this._dominatedNodesOfNode(node));
},

updateStaticData: function()
{
return {nodeCount: this.nodeCount, rootNodeIndex: this._rootNodeIndex, totalSize: this.totalSize, uid: this.uid};
}
};


WebInspector.HeapSnapshotFilteredOrderedIterator = function(iterator, filter, unfilteredIterationOrder)
{
this._filter = filter;
this._iterator = iterator;
this._unfilteredIterationOrder = unfilteredIterationOrder;
this._iterationOrder = null;
this._position = 0;
this._currentComparator = null;
this._sortedPrefixLength = 0;
}

WebInspector.HeapSnapshotFilteredOrderedIterator.prototype = {
_createIterationOrder: function()
{
if (this._iterationOrder)
return;
if (this._unfilteredIterationOrder && !this._filter) {
this._iterationOrder = this._unfilteredIterationOrder.slice(0);
this._unfilteredIterationOrder = null;
return;
}
this._iterationOrder = [];
var iterator = this._iterator;
if (!this._unfilteredIterationOrder && !this._filter) {
for (iterator.rewind(); iterator.hasNext(); iterator.next())
this._iterationOrder.push(iterator.index());
} else if (!this._unfilteredIterationOrder) {
for (iterator.rewind(); iterator.hasNext(); iterator.next()) {
if (this._filter(iterator.item()))
this._iterationOrder.push(iterator.index());
}
} else {
var order = this._unfilteredIterationOrder.constructor === Array ?
this._unfilteredIterationOrder : this._unfilteredIterationOrder.slice(0);
for (var i = 0, l = order.length; i < l; ++i) {
iterator.setIndex(order[i]);
if (this._filter(iterator.item()))
this._iterationOrder.push(iterator.index());
}
this._unfilteredIterationOrder = null;
}
},

rewind: function()
{
this._position = 0;
},

hasNext: function()
{
return this._position < this._iterationOrder.length;
},

isEmpty: function()
{
if (this._iterationOrder)
return !this._iterationOrder.length;
if (this._unfilteredIterationOrder && !this._filter)
return !this._unfilteredIterationOrder.length;
var iterator = this._iterator;
if (!this._unfilteredIterationOrder && !this._filter) {
iterator.rewind();
return !iterator.hasNext();
} else if (!this._unfilteredIterationOrder) {
for (iterator.rewind(); iterator.hasNext(); iterator.next())
if (this._filter(iterator.item()))
return false;
} else {
var order = this._unfilteredIterationOrder.constructor === Array ?
this._unfilteredIterationOrder : this._unfilteredIterationOrder.slice(0);
for (var i = 0, l = order.length; i < l; ++i) {
iterator.setIndex(order[i]);
if (this._filter(iterator.item()))
return false;
}
}
return true;
},

item: function()
{
this._iterator.setIndex(this._iterationOrder[this._position]);
return this._iterator.item();
},

get length()
{
this._createIterationOrder();
return this._iterationOrder.length;
},

next: function()
{
++this._position;
},


serializeItemsRange: function(begin, end)
{
this._createIterationOrder();
if (begin > end)
throw new Error("Start position > end position: " + begin + " > " + end);
if (end >= this._iterationOrder.length)
end = this._iterationOrder.length;
if (this._sortedPrefixLength < end) {
this.sort(this._currentComparator, this._sortedPrefixLength, this._iterationOrder.length - 1, end - this._sortedPrefixLength);
this._sortedPrefixLength = end;
}

this._position = begin;
var startPosition = this._position;
var count = end - begin;
var result = new Array(count);
for (var i = 0 ; i < count && this.hasNext(); ++i, this.next())
result[i] = this.item().serialize();
result.length = i;
result.totalLength = this._iterationOrder.length;

result.startPosition = startPosition;
result.endPosition = this._position;
return result;
},

sortAll: function()
{
this._createIterationOrder();
if (this._sortedPrefixLength === this._iterationOrder.length)
return;
this.sort(this._currentComparator, this._sortedPrefixLength, this._iterationOrder.length - 1, this._iterationOrder.length);
this._sortedPrefixLength = this._iterationOrder.length;
},

sortAndRewind: function(comparator)
{
this._currentComparator = comparator;
this._sortedPrefixLength = 0;
this.rewind();
}
}

WebInspector.HeapSnapshotFilteredOrderedIterator.prototype.createComparator = function(fieldNames)
{
return {fieldName1: fieldNames[0], ascending1: fieldNames[1], fieldName2: fieldNames[2], ascending2: fieldNames[3]};
}


WebInspector.HeapSnapshotEdgesProvider = function(snapshot, filter, edgesIter)
{
this.snapshot = snapshot;
WebInspector.HeapSnapshotFilteredOrderedIterator.call(this, edgesIter, filter);
}

WebInspector.HeapSnapshotEdgesProvider.prototype = {
sort: function(comparator, leftBound, rightBound, count)
{
var fieldName1 = comparator.fieldName1;
var fieldName2 = comparator.fieldName2;
var ascending1 = comparator.ascending1;
var ascending2 = comparator.ascending2;

var edgeA = this._iterator.item().clone();
var edgeB = edgeA.clone();
var nodeA = this.snapshot.createNode();
var nodeB = this.snapshot.createNode();

function compareEdgeFieldName(ascending, indexA, indexB)
{
edgeA.edgeIndex = indexA;
edgeB.edgeIndex = indexB;
if (edgeB.name() === "__proto__") return -1;
if (edgeA.name() === "__proto__") return 1;
var result =
edgeA.hasStringName() === edgeB.hasStringName() ?
(edgeA.name() < edgeB.name() ? -1 : (edgeA.name() > edgeB.name() ? 1 : 0)) :
(edgeA.hasStringName() ? -1 : 1);
return ascending ? result : -result;
}

function compareNodeField(fieldName, ascending, indexA, indexB)
{
edgeA.edgeIndex = indexA;
nodeA.nodeIndex = edgeA.nodeIndex();
var valueA = nodeA[fieldName]();

edgeB.edgeIndex = indexB;
nodeB.nodeIndex = edgeB.nodeIndex();
var valueB = nodeB[fieldName]();

var result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
return ascending ? result : -result;
}

function compareEdgeAndNode(indexA, indexB) {
var result = compareEdgeFieldName(ascending1, indexA, indexB);
if (result === 0)
result = compareNodeField(fieldName2, ascending2, indexA, indexB);
return result;
}

function compareNodeAndEdge(indexA, indexB) {
var result = compareNodeField(fieldName1, ascending1, indexA, indexB);
if (result === 0)
result = compareEdgeFieldName(ascending2, indexA, indexB);
return result;
}

function compareNodeAndNode(indexA, indexB) {
var result = compareNodeField(fieldName1, ascending1, indexA, indexB);
if (result === 0)
result = compareNodeField(fieldName2, ascending2, indexA, indexB);
return result;
}

if (fieldName1 === "!edgeName")
this._iterationOrder.sortRange(compareEdgeAndNode, leftBound, rightBound, count);
else if (fieldName2 === "!edgeName")
this._iterationOrder.sortRange(compareNodeAndEdge, leftBound, rightBound, count);
else
this._iterationOrder.sortRange(compareNodeAndNode, leftBound, rightBound, count);
},

__proto__: WebInspector.HeapSnapshotFilteredOrderedIterator.prototype
}



WebInspector.HeapSnapshotNodesProvider = function(snapshot, filter, nodeIndexes)
{
this.snapshot = snapshot;
WebInspector.HeapSnapshotFilteredOrderedIterator.call(this, snapshot._allNodes(), filter, nodeIndexes);
}

WebInspector.HeapSnapshotNodesProvider.prototype = {
nodePosition: function(snapshotObjectId)
{
this._createIterationOrder();
if (this.isEmpty())
return -1;
this.sortAll();

var node = this.snapshot.createNode();
for (var i = 0; i < this._iterationOrder.length; i++) {
node.nodeIndex = this._iterationOrder[i];
if (node.id() === snapshotObjectId)
return i;
}
return -1;
},

sort: function(comparator, leftBound, rightBound, count)
{
var fieldName1 = comparator.fieldName1;
var fieldName2 = comparator.fieldName2;
var ascending1 = comparator.ascending1;
var ascending2 = comparator.ascending2;

var nodeA = this.snapshot.createNode();
var nodeB = this.snapshot.createNode();

function sortByNodeField(fieldName, ascending)
{
var valueOrFunctionA = nodeA[fieldName];
var valueA = typeof valueOrFunctionA !== "function" ? valueOrFunctionA : valueOrFunctionA.call(nodeA);
var valueOrFunctionB = nodeB[fieldName];
var valueB = typeof valueOrFunctionB !== "function" ? valueOrFunctionB : valueOrFunctionB.call(nodeB);
var result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
return ascending ? result : -result;
}

function sortByComparator(indexA, indexB) {
nodeA.nodeIndex = indexA;
nodeB.nodeIndex = indexB;
var result = sortByNodeField(fieldName1, ascending1);
if (result === 0)
result = sortByNodeField(fieldName2, ascending2);
return result;
}

this._iterationOrder.sortRange(sortByComparator, leftBound, rightBound, count);
},

__proto__: WebInspector.HeapSnapshotFilteredOrderedIterator.prototype
}

;



WebInspector.HeapSnapshotLoader = function()
{
this._reset();
}

WebInspector.HeapSnapshotLoader.prototype = {
dispose: function()
{
this._reset();
},

_reset: function()
{
this._json = "";
this._state = "find-snapshot-info";
this._snapshot = {};
},

close: function()
{
if (this._json)
this._parseStringsArray();
},

buildSnapshot: function(constructorName)
{
var constructor = WebInspector[constructorName];
var result = new constructor(this._snapshot);
this._reset();
return result;
},

_parseUintArray: function()
{
var index = 0;
var char0 = "0".charCodeAt(0), char9 = "9".charCodeAt(0), closingBracket = "]".charCodeAt(0);
var length = this._json.length;
while (true) {
while (index < length) {
var code = this._json.charCodeAt(index);
if (char0 <= code && code <= char9)
break;
else if (code === closingBracket) {
this._json = this._json.slice(index + 1);
return false;
}
++index;
}
if (index === length) {
this._json = "";
return true;
}
var nextNumber = 0;
var startIndex = index;
while (index < length) {
var code = this._json.charCodeAt(index);
if (char0 > code || code > char9)
break;
nextNumber *= 10;
nextNumber += (code - char0);
++index;
}
if (index === length) {
this._json = this._json.slice(startIndex);
return true;
}
this._array[this._arrayIndex++] = nextNumber;
}
},

_parseStringsArray: function()
{
var closingBracketIndex = this._json.lastIndexOf("]");
if (closingBracketIndex === -1)
throw new Error("Incomplete JSON");
this._json = this._json.slice(0, closingBracketIndex + 1);
this._snapshot.strings = JSON.parse(this._json);
},


write: function(chunk)
{
this._json += chunk;
switch (this._state) {
case "find-snapshot-info": {
var snapshotToken = "\"snapshot\"";
var snapshotTokenIndex = this._json.indexOf(snapshotToken);
if (snapshotTokenIndex === -1)
throw new Error("Snapshot token not found");
this._json = this._json.slice(snapshotTokenIndex + snapshotToken.length + 1);
this._state = "parse-snapshot-info";
}
case "parse-snapshot-info": {
var closingBracketIndex = WebInspector.findBalancedCurlyBrackets(this._json);
if (closingBracketIndex === -1)
return;
this._snapshot.snapshot =   (JSON.parse(this._json.slice(0, closingBracketIndex)));
this._json = this._json.slice(closingBracketIndex);
this._state = "find-nodes";
}
case "find-nodes": {
var nodesToken = "\"nodes\"";
var nodesTokenIndex = this._json.indexOf(nodesToken);
if (nodesTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", nodesTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex + 1);
var node_fields_count = this._snapshot.snapshot.meta.node_fields.length;
var nodes_length = this._snapshot.snapshot.node_count * node_fields_count;
this._array = new Uint32Array(nodes_length);
this._arrayIndex = 0;
this._state = "parse-nodes";
}
case "parse-nodes": {
if (this._parseUintArray())
return;
this._snapshot.nodes = this._array;
this._state = "find-edges";
this._array = null;
}
case "find-edges": {
var edgesToken = "\"edges\"";
var edgesTokenIndex = this._json.indexOf(edgesToken);
if (edgesTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", edgesTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex + 1);
var edge_fields_count = this._snapshot.snapshot.meta.edge_fields.length;
var edges_length = this._snapshot.snapshot.edge_count * edge_fields_count;
this._array = new Uint32Array(edges_length);
this._arrayIndex = 0;
this._state = "parse-edges";
}
case "parse-edges": {
if (this._parseUintArray())
return;
this._snapshot.edges = this._array;
this._array = null;
this._state = "find-strings";
}
case "find-strings": {
var stringsToken = "\"strings\"";
var stringsTokenIndex = this._json.indexOf(stringsToken);
if (stringsTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", stringsTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex);
this._state = "accumulate-strings";
break;
}
case "accumulate-strings":
break;
}
}
};
;



WebInspector.HeapSnapshotWorkerDispatcher = function(globalObject, postMessage)
{
this._objects = [];
this._global = globalObject;
this._postMessage = postMessage;
}

WebInspector.HeapSnapshotWorkerDispatcher.prototype = {
_findFunction: function(name)
{
var path = name.split(".");
var result = this._global;
for (var i = 0; i < path.length; ++i)
result = result[path[i]];
return result;
},

dispatchMessage: function(event)
{
var data = event.data;
var response = {callId: data.callId};
try {
switch (data.disposition) {
case "create": {
var constructorFunction = this._findFunction(data.methodName);
this._objects[data.objectId] = new constructorFunction();
break;
}
case "dispose": {
delete this._objects[data.objectId];
break;
}
case "getter": {
var object = this._objects[data.objectId];
var result = object[data.methodName];
response.result = result;
break;
}
case "factory": {
var object = this._objects[data.objectId];
var result = object[data.methodName].apply(object, data.methodArguments);
if (result)
this._objects[data.newObjectId] = result;
response.result = !!result;
break;
}
case "method": {
var object = this._objects[data.objectId];
response.result = object[data.methodName].apply(object, data.methodArguments);
break;
}
}
} catch (e) {
response.error = e.toString();
response.errorCallStack = e.stack;
if (data.methodName)
response.errorMethodName = data.methodName;
}
this._postMessage(response);
}
};
;



WebInspector.JSHeapSnapshot = function(profile)
{
this._nodeFlags = { 
canBeQueried: 1,
detachedDOMTreeNode: 2,
pageObject: 4, 

visitedMarkerMask: 0x0ffff, 
visitedMarker:     0x10000  
};
WebInspector.HeapSnapshot.call(this, profile);
}

WebInspector.JSHeapSnapshot.prototype = {
createNode: function(nodeIndex)
{
return new WebInspector.JSHeapSnapshotNode(this, nodeIndex);
},

createEdge: function(edges, edgeIndex)
{
return new WebInspector.JSHeapSnapshotEdge(this, edges, edgeIndex);
},

createRetainingEdge: function(retainedNodeIndex, retainerIndex)
{
return new WebInspector.JSHeapSnapshotRetainerEdge(this, retainedNodeIndex, retainerIndex);
},

classNodesFilter: function()
{
function filter(node)
{
return node.isUserObject();
}
return filter;
},

containmentEdgesFilter: function(showHiddenData)
{
function filter(edge) {
if (edge.isInvisible())
return false;
if (showHiddenData)
return true;
return !edge.isHidden() && !edge.node().isHidden();
}
return filter;
},

retainingEdgesFilter: function(showHiddenData)
{
var containmentEdgesFilter = this.containmentEdgesFilter(showHiddenData);
function filter(edge) {
if (!containmentEdgesFilter(edge))
return false;
return edge.node().id() !== 1 && !edge.node().isSynthetic() && !edge.isWeak();
}
return filter;
},

dispose: function()
{
WebInspector.HeapSnapshot.prototype.dispose.call(this);
delete this._flags;
},

_markInvisibleEdges: function()
{



for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
var edge = iter.edge;
if (!edge.isShortcut())
continue;
var node = edge.node();
var propNames = {};
for (var innerIter = node.edges(); innerIter.hasNext(); innerIter.next()) {
var globalObjEdge = innerIter.edge;
if (globalObjEdge.isShortcut())
propNames[globalObjEdge._nameOrIndex()] = true;
}
for (innerIter.rewind(); innerIter.hasNext(); innerIter.next()) {
var globalObjEdge = innerIter.edge;
if (!globalObjEdge.isShortcut()
&& globalObjEdge.node().isHidden()
&& globalObjEdge._hasStringName()
&& (globalObjEdge._nameOrIndex() in propNames))
this._containmentEdges[globalObjEdge._edges._start + globalObjEdge.edgeIndex + this._edgeTypeOffset] = this._edgeInvisibleType;
}
}
},

_calculateFlags: function()
{
this._flags = new Uint32Array(this.nodeCount);
this._markDetachedDOMTreeNodes();
this._markQueriableHeapObjects();
this._markPageOwnedNodes();
},

distanceForUserRoot: function(node)
{
if (node.isWindow())
return 1;
if (node.isDocumentDOMTreesRoot())
return 0;
return -1;
},

userObjectsMapAndFlag: function()
{
return {
map: this._flags,
flag: this._nodeFlags.pageObject
};
},

_flagsOfNode: function(node)
{
return this._flags[node.nodeIndex / this._nodeFieldCount];
},

_markDetachedDOMTreeNodes: function()
{
var flag = this._nodeFlags.detachedDOMTreeNode;
var detachedDOMTreesRoot;
for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
var node = iter.edge.node();
if (node.name() === "(Detached DOM trees)") {
detachedDOMTreesRoot = node;
break;
}
}

if (!detachedDOMTreesRoot)
return;

var detachedDOMTreeRE = /^Detached DOM tree/;
for (var iter = detachedDOMTreesRoot.edges(); iter.hasNext(); iter.next()) {
var node = iter.edge.node();
if (detachedDOMTreeRE.test(node.className())) {
for (var edgesIter = node.edges(); edgesIter.hasNext(); edgesIter.next())
this._flags[edgesIter.edge.node().nodeIndex / this._nodeFieldCount] |= flag;
}
}
},

_markQueriableHeapObjects: function()
{



var flag = this._nodeFlags.canBeQueried;
var hiddenEdgeType = this._edgeHiddenType;
var internalEdgeType = this._edgeInternalType;
var invisibleEdgeType = this._edgeInvisibleType;
var weakEdgeType = this._edgeWeakType;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeTypeOffset = this._edgeTypeOffset;
var edgeFieldsCount = this._edgeFieldsCount;
var containmentEdges = this._containmentEdges;
var nodes = this._nodes;
var nodeCount = this.nodeCount;
var nodeFieldCount = this._nodeFieldCount;
var firstEdgeIndexes = this._firstEdgeIndexes;

var flags = this._flags;
var list = [];

for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
if (iter.edge.node().isWindow())
list.push(iter.edge.node().nodeIndex / nodeFieldCount);
}

while (list.length) {
var nodeOrdinal = list.pop();
if (flags[nodeOrdinal] & flag)
continue;
flags[nodeOrdinal] |= flag;
var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
var childNodeOrdinal = childNodeIndex / nodeFieldCount;
if (flags[childNodeOrdinal] & flag)
continue;
var type = containmentEdges[edgeIndex + edgeTypeOffset];
if (type === hiddenEdgeType || type === invisibleEdgeType || type === internalEdgeType || type === weakEdgeType)
continue;
list.push(childNodeOrdinal);
}
}
},

_markPageOwnedNodes: function()
{
var edgeShortcutType = this._edgeShortcutType;
var edgeElementType = this._edgeElementType;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeTypeOffset = this._edgeTypeOffset;
var edgeFieldsCount = this._edgeFieldsCount;
var edgeWeakType = this._edgeWeakType;
var firstEdgeIndexes = this._firstEdgeIndexes;
var containmentEdges = this._containmentEdges;
var containmentEdgesLength = containmentEdges.length;
var nodes = this._nodes;
var nodeFieldCount = this._nodeFieldCount;
var nodesCount = this.nodeCount;

var flags = this._flags;
var flag = this._nodeFlags.pageObject;
var visitedMarker = this._nodeFlags.visitedMarker;
var visitedMarkerMask = this._nodeFlags.visitedMarkerMask;
var markerAndFlag = visitedMarker | flag;

var nodesToVisit = new Uint32Array(nodesCount);
var nodesToVisitLength = 0;

var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;
var node = this.rootNode();
for (var edgeIndex = firstEdgeIndexes[rootNodeOrdinal], endEdgeIndex = firstEdgeIndexes[rootNodeOrdinal + 1];
edgeIndex < endEdgeIndex;
edgeIndex += edgeFieldsCount) {
var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
var nodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
if (edgeType === edgeElementType) {
node.nodeIndex = nodeIndex;
if (!node.isDocumentDOMTreesRoot())
continue;
} else if (edgeType !== edgeShortcutType)
continue;
var nodeOrdinal = nodeIndex / nodeFieldCount;
nodesToVisit[nodesToVisitLength++] = nodeOrdinal;
flags[nodeOrdinal] |= visitedMarker;
}

while (nodesToVisitLength) {
var nodeOrdinal = nodesToVisit[--nodesToVisitLength];
flags[nodeOrdinal] |= flag;
flags[nodeOrdinal] &= visitedMarkerMask;
var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
var childNodeOrdinal = childNodeIndex / nodeFieldCount;
if (flags[childNodeOrdinal] & markerAndFlag)
continue;
var type = containmentEdges[edgeIndex + edgeTypeOffset];
if (type === edgeWeakType)
continue;
nodesToVisit[nodesToVisitLength++] = childNodeOrdinal;
flags[childNodeOrdinal] |= visitedMarker;
}
}
},

__proto__: WebInspector.HeapSnapshot.prototype
};


WebInspector.JSHeapSnapshotNode = function(snapshot, nodeIndex)
{
WebInspector.HeapSnapshotNode.call(this, snapshot, nodeIndex)
}

WebInspector.JSHeapSnapshotNode.prototype = {
canBeQueried: function()
{
var flags = this._snapshot._flagsOfNode(this);
return !!(flags & this._snapshot._nodeFlags.canBeQueried);
},

isUserObject: function()
{
var flags = this._snapshot._flagsOfNode(this);
return !!(flags & this._snapshot._nodeFlags.pageObject);
},

className: function()
{
var type = this.type();
switch (type) {
case "hidden":
return "(system)";
case "object":
case "native":
return this.name();
case "code":
return "(compiled code)";
default:
return "(" + type + ")";
}
},

classIndex: function()
{
var snapshot = this._snapshot;
var nodes = snapshot._nodes;
var type = nodes[this.nodeIndex + snapshot._nodeTypeOffset];;
if (type === snapshot._nodeObjectType || type === snapshot._nodeNativeType)
return nodes[this.nodeIndex + snapshot._nodeNameOffset];
return -1 - type;
},

id: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeIdOffset];
},

isHidden: function()
{
return this._type() === this._snapshot._nodeHiddenType;
},

isSynthetic: function()
{
return this._type() === this._snapshot._nodeSyntheticType;
},

isWindow: function()
{
const windowRE = /^Window/;
return windowRE.test(this.name());
},

isDocumentDOMTreesRoot: function()
{
return this.isSynthetic() && this.name() === "(Document DOM trees)";
},

serialize: function()
{
var result = WebInspector.HeapSnapshotNode.prototype.serialize.call(this);
var flags = this._snapshot._flagsOfNode(this);
if (flags & this._snapshot._nodeFlags.canBeQueried)
result.canBeQueried = true;
if (flags & this._snapshot._nodeFlags.detachedDOMTreeNode)
result.detachedDOMTreeNode = true;
return result;
},

__proto__: WebInspector.HeapSnapshotNode.prototype
};


WebInspector.JSHeapSnapshotEdge = function(snapshot, edges, edgeIndex)
{
WebInspector.HeapSnapshotEdge.call(this, snapshot, edges, edgeIndex);
}

WebInspector.JSHeapSnapshotEdge.prototype = {
clone: function()
{
return new WebInspector.JSHeapSnapshotEdge(this._snapshot, this._edges, this.edgeIndex);
},

hasStringName: function()
{
if (!this.isShortcut())
return this._hasStringName();
return isNaN(parseInt(this._name(), 10));
},

isElement: function()
{
return this._type() === this._snapshot._edgeElementType;
},

isHidden: function()
{
return this._type() === this._snapshot._edgeHiddenType;
},

isWeak: function()
{
return this._type() === this._snapshot._edgeWeakType;
},

isInternal: function()
{
return this._type() === this._snapshot._edgeInternalType;
},

isInvisible: function()
{
return this._type() === this._snapshot._edgeInvisibleType;
},

isShortcut: function()
{
return this._type() === this._snapshot._edgeShortcutType;
},

name: function()
{
if (!this.isShortcut())
return this._name();
var numName = parseInt(this._name(), 10);
return isNaN(numName) ? this._name() : numName;
},

toString: function()
{
var name = this.name();
switch (this.type()) {
case "context": return "->" + name;
case "element": return "[" + name + "]";
case "weak": return "[[" + name + "]]";
case "property":
return name.indexOf(" ") === -1 ? "." + name : "[\"" + name + "\"]";
case "shortcut":
if (typeof name === "string")
return name.indexOf(" ") === -1 ? "." + name : "[\"" + name + "\"]";
else
return "[" + name + "]";
case "internal":
case "hidden":
case "invisible":
return "{" + name + "}";
};
return "?" + name + "?";
},

_hasStringName: function()
{
return !this.isElement() && !this.isHidden() && !this.isWeak();
},

_name: function()
{
return this._hasStringName() ? this._snapshot._strings[this._nameOrIndex()] : this._nameOrIndex();
},

_nameOrIndex: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeNameOffset);
},

_type: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeTypeOffset);
},

__proto__: WebInspector.HeapSnapshotEdge.prototype
};



WebInspector.JSHeapSnapshotRetainerEdge = function(snapshot, retainedNodeIndex, retainerIndex)
{
WebInspector.HeapSnapshotRetainerEdge.call(this, snapshot, retainedNodeIndex, retainerIndex);
}

WebInspector.JSHeapSnapshotRetainerEdge.prototype = {
clone: function()
{
return new WebInspector.JSHeapSnapshotRetainerEdge(this._snapshot, this._retainedNodeIndex, this.retainerIndex());
},

isHidden: function()
{
return this._edge().isHidden();
},

isInternal: function()
{
return this._edge().isInternal();
},

isInvisible: function()
{
return this._edge().isInvisible();
},

isShortcut: function()
{
return this._edge().isShortcut();
},

isWeak: function()
{
return this._edge().isWeak();
},

__proto__: WebInspector.HeapSnapshotRetainerEdge.prototype
}

;



WebInspector.NativeHeapSnapshot = function(profile)
{
WebInspector.HeapSnapshot.call(this, profile);
this._nodeObjectType = this._metaNode.type_strings["object"];
this._edgeWeakType = this._metaNode.type_strings["weak"];
this._edgeElementType = this._metaNode.type_strings["property"];
}

WebInspector.NativeHeapSnapshot.prototype = {
createNode: function(nodeIndex)
{
return new WebInspector.NativeHeapSnapshotNode(this, nodeIndex);
},

createEdge: function(edges, edgeIndex)
{
return new WebInspector.NativeHeapSnapshotEdge(this, edges, edgeIndex);
},

createRetainingEdge: function(retainedNodeIndex, retainerIndex)
{
return new WebInspector.NativeHeapSnapshotRetainerEdge(this, retainedNodeIndex, retainerIndex);
},

_markInvisibleEdges: function()
{
},

_calculateFlags: function()
{
},

userObjectsMapAndFlag: function()
{
return null;
},

images: function()
{
var aggregatesByClassName = this.aggregates(false, "allObjects");
var result = [];
var cachedImages = aggregatesByClassName["WebCore::CachedImage"];
function getImageName(node)
{
return node.name();
}
this._addNodes(cachedImages, getImageName, result);

var canvases = aggregatesByClassName["WebCore::HTMLCanvasElement"];
function getCanvasName(node)
{
return "HTMLCanvasElement";
}
this._addNodes(canvases, getCanvasName, result);
return result;
},

_addNodes: function(classData, nameResolver, result)
{
if (!classData)
return;
var node = this.rootNode();
for (var i = 0; i < classData.idxs.length; i++) {
node.nodeIndex = classData.idxs[i];
result.push({
name: nameResolver(node),
size: node.retainedSize(),
});
}
},

__proto__: WebInspector.HeapSnapshot.prototype
};


WebInspector.NativeHeapSnapshotNode = function(snapshot, nodeIndex)
{
WebInspector.HeapSnapshotNode.call(this, snapshot, nodeIndex)
}

WebInspector.NativeHeapSnapshotNode.prototype = {
className: function()
{
return this._snapshot._strings[this.classIndex()];
},

classIndex: function()
{
return this._snapshot._nodes[this.nodeIndex + this._snapshot._nodeTypeOffset];
},

id: function()
{
return this._snapshot._nodes[this.nodeIndex + this._snapshot._nodeIdOffset];
},

name: function()
{
return this._snapshot._strings[this._snapshot._nodes[this.nodeIndex + this._snapshot._nodeNameOffset]];;
},

serialize: function()
{
return {
id: this.id(),
name: this.className(),
displayName: this.name(),
distance: this.distance(),
nodeIndex: this.nodeIndex,
retainedSize: this.retainedSize(),
selfSize: this.selfSize(),
type: this._snapshot._nodeObjectType
};
},

isHidden: function()
{
return false;
},

isSynthetic: function()
{
return false;
},

__proto__: WebInspector.HeapSnapshotNode.prototype
};


WebInspector.NativeHeapSnapshotEdge = function(snapshot, edges, edgeIndex)
{
WebInspector.HeapSnapshotEdge.call(this, snapshot, edges, edgeIndex);
}

WebInspector.NativeHeapSnapshotEdge.prototype = {
clone: function()
{
return new WebInspector.NativeHeapSnapshotEdge(this._snapshot, this._edges, this.edgeIndex);
},

hasStringName: function()
{
return true;
},

isHidden: function()
{
return false;
},

isWeak: function()
{
return false;
},

isInternal: function()
{
return false;
},

isInvisible: function()
{
return false;
},

isShortcut: function()
{
return false;
},

name: function()
{
return this._snapshot._strings[this._nameOrIndex()];
},

toString: function()
{
return  "NativeHeapSnapshotEdge: " + this.name();
},

_nameOrIndex: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeNameOffset);
},

__proto__: WebInspector.HeapSnapshotEdge.prototype
};



WebInspector.NativeHeapSnapshotRetainerEdge = function(snapshot, retainedNodeIndex, retainerIndex)
{
WebInspector.HeapSnapshotRetainerEdge.call(this, snapshot, retainedNodeIndex, retainerIndex);
}

WebInspector.NativeHeapSnapshotRetainerEdge.prototype = {
clone: function()
{
return new WebInspector.NativeHeapSnapshotRetainerEdge(this._snapshot, this._retainedNodeIndex, this.retainerIndex());
},

isHidden: function()
{
return this._edge().isHidden();
},

isInternal: function()
{
return this._edge().isInternal();
},

isInvisible: function()
{
return this._edge().isInvisible();
},

isShortcut: function()
{
return this._edge().isShortcut();
},

isWeak: function()
{
return this._edge().isWeak();
},

__proto__: WebInspector.HeapSnapshotRetainerEdge.prototype
}

;



WebInspector.OutputStreamDelegate = function()
{
}

WebInspector.OutputStreamDelegate.prototype = {
onTransferStarted: function() { },

onTransferFinished: function() { },


onChunkTransferred: function(reader) { },


onError: function(reader, event) { },
}


WebInspector.OutputStream = function()
{
}

WebInspector.OutputStream.prototype = {

write: function(data, callback) { },

close: function() { }
}


WebInspector.ChunkedReader = function()
{
}

WebInspector.ChunkedReader.prototype = {

fileSize: function() { },


loadedSize: function() { },


fileName: function() { },

cancel: function() { }
}


WebInspector.ChunkedFileReader = function(file, chunkSize, delegate)
{
this._file = file;
this._fileSize = file.size;
this._loadedSize = 0;
this._chunkSize = chunkSize;
this._delegate = delegate;
this._isCanceled = false;
}

WebInspector.ChunkedFileReader.prototype = {

start: function(output)
{
this._output = output;

this._reader = new FileReader();
this._reader.onload = this._onChunkLoaded.bind(this);
this._reader.onerror = this._delegate.onError.bind(this._delegate, this);
this._delegate.onTransferStarted();
this._loadChunk();
},

cancel: function()
{
this._isCanceled = true;
},


loadedSize: function()
{
return this._loadedSize;
},


fileSize: function()
{
return this._fileSize;
},


fileName: function()
{
return this._file.name;
},


_onChunkLoaded: function(event)
{
if (this._isCanceled)
return;

if (event.target.readyState !== FileReader.DONE)
return;

var data = event.target.result;
this._loadedSize += data.length;

this._output.write(data);
if (this._isCanceled)
return;
this._delegate.onChunkTransferred(this);

if (this._loadedSize === this._fileSize) {
this._file = null;
this._reader = null;
this._output.close();
this._delegate.onTransferFinished();
return;
}

this._loadChunk();
},

_loadChunk: function()
{
var chunkStart = this._loadedSize;
var chunkEnd = Math.min(this._fileSize, chunkStart + this._chunkSize)
var nextPart = this._file.slice(chunkStart, chunkEnd);
this._reader.readAsText(nextPart);
}
}


WebInspector.ChunkedXHRReader = function(url, delegate)
{
this._url = url;
this._delegate = delegate;
this._fileSize = 0;
this._loadedSize = 0;
this._isCanceled = false;
}

WebInspector.ChunkedXHRReader.prototype = {

start: function(output)
{
this._output = output;

this._xhr = new XMLHttpRequest();
this._xhr.open("GET", this._url, true);
this._xhr.onload = this._onLoad.bind(this);
this._xhr.onprogress = this._onProgress.bind(this);
this._xhr.onerror = this._delegate.onError.bind(this._delegate, this);
this._xhr.send(null);

this._delegate.onTransferStarted();
},

cancel: function()
{
this._isCanceled = true;
this._xhr.abort();
},


loadedSize: function()
{
return this._loadedSize;
},


fileSize: function()
{
return this._fileSize;
},


fileName: function()
{
return this._url;
},


_onProgress: function(event)
{
if (this._isCanceled)
return;

if (event.lengthComputable)
this._fileSize = event.total;

var data = this._xhr.responseText.substring(this._loadedSize);
if (!data.length)
return;

this._loadedSize += data.length;
this._output.write(data);
if (this._isCanceled)
return;
this._delegate.onChunkTransferred(this);
},


_onLoad: function(event)
{
this._onProgress(event);

if (this._isCanceled)
return;

this._output.close();
this._delegate.onTransferFinished();
}
}


WebInspector.createFileSelectorElement = function(callback) {
var fileSelectorElement = document.createElement("input");
fileSelectorElement.type = "file";
fileSelectorElement.setAttribute("tabindex", -1);
fileSelectorElement.style.zIndex = -1;
fileSelectorElement.style.position = "absolute";
fileSelectorElement.onchange = function(event) {
callback(fileSelectorElement.files[0]);
};
return fileSelectorElement;
}


WebInspector.findBalancedCurlyBrackets = function(source, startIndex, lastIndex) {
lastIndex = lastIndex || source.length;
startIndex = startIndex || 0;
var counter = 0;
var inString = false;

for (var index = startIndex; index < lastIndex; ++index) {
var character = source[index];
if (inString) {
if (character === "\\")
++index;
else if (character === "\"")
inString = false;
} else {
if (character === "\"")
inString = true;
else if (character === "{")
++counter;
else if (character === "}") {
if (--counter === 0)
return index + 1;
}
}
}
return -1;
}


WebInspector.FileOutputStream = function()
{
}

WebInspector.FileOutputStream.prototype = {

open: function(fileName, callback)
{
this._closed = false;
this._writeCallbacks = [];
this._fileName = fileName;
function callbackWrapper()
{
WebInspector.fileManager.removeEventListener(WebInspector.FileManager.EventTypes.SavedURL, callbackWrapper, this);
WebInspector.fileManager.addEventListener(WebInspector.FileManager.EventTypes.AppendedToURL, this._onAppendDone, this);
callback(this);
}
WebInspector.fileManager.addEventListener(WebInspector.FileManager.EventTypes.SavedURL, callbackWrapper, this);
WebInspector.fileManager.save(this._fileName, "", true);
},


write: function(data, callback)
{
this._writeCallbacks.push(callback);
WebInspector.fileManager.append(this._fileName, data);
},

close: function()
{
this._closed = true;
if (this._writeCallbacks.length)
return;
WebInspector.fileManager.removeEventListener(WebInspector.FileManager.EventTypes.AppendedToURL, this._onAppendDone, this);
WebInspector.fileManager.close(this._fileName);
},


_onAppendDone: function(event)
{
if (event.data !== this._fileName)
return;
if (!this._writeCallbacks.length) {
if (this._closed) {
WebInspector.fileManager.removeEventListener(WebInspector.FileManager.EventTypes.AppendedToURL, this._onAppendDone, this);
WebInspector.fileManager.close(this._fileName);
}
return;
}
var callback = this._writeCallbacks.shift();
if (callback)
callback(this);
}
}
;


Object.isEmpty = function(obj)
{
for (var i in obj)
return false;
return true;
}

Object.values = function(obj)
{
var keys = Object.keys(obj);
var result = [];

for (var i = 0; i < keys.length; ++i)
result.push(obj[keys[i]]);
return result;
}

String.prototype.hasSubstring = function(string, caseInsensitive)
{
if (!caseInsensitive)
return this.indexOf(string) !== -1;
return this.match(new RegExp(string.escapeForRegExp(), "i"));
}

String.prototype.findAll = function(string)
{
var matches = [];
var i = this.indexOf(string);
while (i !== -1) {
matches.push(i);
i = this.indexOf(string, i + string.length);
}
return matches;
}

String.prototype.lineEndings = function()
{
if (!this._lineEndings) {
this._lineEndings = this.findAll("\n");
this._lineEndings.push(this.length);
}
return this._lineEndings;
}

String.prototype.escapeCharacters = function(chars)
{
var foundChar = false;
for (var i = 0; i < chars.length; ++i) {
if (this.indexOf(chars.charAt(i)) !== -1) {
foundChar = true;
break;
}
}

if (!foundChar)
return String(this);

var result = "";
for (var i = 0; i < this.length; ++i) {
if (chars.indexOf(this.charAt(i)) !== -1)
result += "\\";
result += this.charAt(i);
}

return result;
}

String.regexSpecialCharacters = function()
{
return "^[]{}()\\.$*+?|-,";
}

String.prototype.escapeForRegExp = function()
{
return this.escapeCharacters(String.regexSpecialCharacters);
}

String.prototype.escapeHTML = function()
{
return this.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); 
}

String.prototype.collapseWhitespace = function()
{
return this.replace(/[\s\xA0]+/g, " ");
}

String.prototype.trimMiddle = function(maxLength)
{
if (this.length <= maxLength)
return String(this);
var leftHalf = maxLength >> 1;
var rightHalf = maxLength - leftHalf - 1;
return this.substr(0, leftHalf) + "\u2026" + this.substr(this.length - rightHalf, rightHalf);
}

String.prototype.trimEnd = function(maxLength)
{
if (this.length <= maxLength)
return String(this);
return this.substr(0, maxLength - 1) + "\u2026";
}

String.prototype.trimURL = function(baseURLDomain)
{
var result = this.replace(/^(https|http|file):\/\//i, "");
if (baseURLDomain)
result = result.replace(new RegExp("^" + baseURLDomain.escapeForRegExp(), "i"), "");
return result;
}

String.prototype.toTitleCase = function()
{
return this.substring(0, 1).toUpperCase() + this.substring(1);
}


String.prototype.compareTo = function(other)
{
if (this > other)
return 1;
if (this < other)
return -1;
return 0;
}


function sanitizeHref(href)
{
return href && href.trim().toLowerCase().startsWith("javascript:") ? "" : href;
}

String.prototype.removeURLFragment = function()
{
var fragmentIndex = this.indexOf("#");
if (fragmentIndex == -1)
fragmentIndex = this.length;
return this.substring(0, fragmentIndex);
}

String.prototype.startsWith = function(substring)
{
return !this.lastIndexOf(substring, 0);
}

String.prototype.endsWith = function(substring)
{
return this.indexOf(substring, this.length - substring.length) !== -1;
}

Number.constrain = function(num, min, max)
{
if (num < min)
num = min;
else if (num > max)
num = max;
return num;
}

Date.prototype.toISO8601Compact = function()
{
function leadZero(x)
{
return x > 9 ? '' + x : '0' + x
}
return this.getFullYear() +
leadZero(this.getMonth() + 1) +
leadZero(this.getDate()) + 'T' +
leadZero(this.getHours()) +
leadZero(this.getMinutes()) +
leadZero(this.getSeconds());
}

Object.defineProperty(Array.prototype, "remove",
{

value: function(value, onlyFirst)
{
if (onlyFirst) {
var index = this.indexOf(value);
if (index !== -1)
this.splice(index, 1);
return;
}

var length = this.length;
for (var i = 0; i < length; ++i) {
if (this[i] === value)
this.splice(i, 1);
}
}
});

Object.defineProperty(Array.prototype, "keySet",
{

value: function()
{
var keys = {};
for (var i = 0; i < this.length; ++i)
keys[this[i]] = true;
return keys;
}
});

Object.defineProperty(Array.prototype, "upperBound",
{

value: function(value)
{
var first = 0;
var count = this.length;
while (count > 0) {
var step = count >> 1;
var middle = first + step;
if (value >= this[middle]) {
first = middle + 1;
count -= step + 1;
} else
count = step;
}
return first;
}
});

Object.defineProperty(Array.prototype, "rotate",
{

value: function(index)
{
var result = [];
for (var i = index; i < index + this.length; ++i)
result.push(this[i % this.length]);
return result;
}
});

Object.defineProperty(Uint32Array.prototype, "sort", {
value: Array.prototype.sort
});

(function() {
var partition = {

value: function(comparator, left, right, pivotIndex)
{
function swap(array, i1, i2)
{
var temp = array[i1];
array[i1] = array[i2];
array[i2] = temp;
}

var pivotValue = this[pivotIndex];
swap(this, right, pivotIndex);
var storeIndex = left;
for (var i = left; i < right; ++i) {
if (comparator(this[i], pivotValue) < 0) {
swap(this, storeIndex, i);
++storeIndex;
}
}
swap(this, right, storeIndex);
return storeIndex;
}
};
Object.defineProperty(Array.prototype, "partition", partition);
Object.defineProperty(Uint32Array.prototype, "partition", partition);

var sortRange = {

value: function(comparator, leftBound, rightBound, k)
{
function quickSortFirstK(array, comparator, left, right, k)
{
if (right <= left)
return;
var pivotIndex = Math.floor(Math.random() * (right - left)) + left;
var pivotNewIndex = array.partition(comparator, left, right, pivotIndex);
quickSortFirstK(array, comparator, left, pivotNewIndex - 1, k);
if (pivotNewIndex < left + k - 1)
quickSortFirstK(array, comparator, pivotNewIndex + 1, right, left + k - 1 - pivotNewIndex);
}

if (leftBound === 0 && rightBound === (this.length - 1) && k >= this.length)
this.sort(comparator);
else
quickSortFirstK(this, comparator, leftBound, rightBound, k);
return this;
}
}
Object.defineProperty(Array.prototype, "sortRange", sortRange);
Object.defineProperty(Uint32Array.prototype, "sortRange", sortRange);
})();

Object.defineProperty(Array.prototype, "qselect",
{

value: function(k, comparator)
{
if (k < 0 || k >= this.length)
return;
if (!comparator)
comparator = function(a, b) { return a - b; }

var low = 0;
var high = this.length - 1;
for (;;) {
var pivotPosition = this.partition(comparator, low, high, Math.floor((high + low) / 2));
if (pivotPosition === k)
return this[k];
else if (pivotPosition > k)
high = pivotPosition - 1;
else
low = pivotPosition + 1;
}
}
});


function binarySearch(object, array, comparator)
{
var first = 0;
var last = array.length - 1;

while (first <= last) {
var mid = (first + last) >> 1;
var c = comparator(object, array[mid]);
if (c > 0)
first = mid + 1;
else if (c < 0)
last = mid - 1;
else
return mid;
}


return -(first + 1);
}

Object.defineProperty(Array.prototype, "binaryIndexOf",
{

value: function(value, comparator)
{
var result = binarySearch(value, this, comparator);
return result >= 0 ? result : -1;
}
});

Object.defineProperty(Array.prototype, "select",
{

value: function(field)
{
var result = new Array(this.length);
for (var i = 0; i < this.length; ++i)
result[i] = this[i][field];
return result;
}
});

Object.defineProperty(Array.prototype, "peekLast",
{

value: function()
{
return this[this.length - 1];
}
});


function insertionIndexForObjectInListSortedByFunction(anObject, aList, aFunction)
{
var index = binarySearch(anObject, aList, aFunction);
if (index < 0)

return -index - 1;
else {

while (index > 0 && aFunction(anObject, aList[index - 1]) === 0)
index--;
return index;
}
}


String.sprintf = function(format, var_arg)
{
return String.vsprintf(format, Array.prototype.slice.call(arguments, 1));
}

String.tokenizeFormatString = function(format, formatters)
{
var tokens = [];
var substitutionIndex = 0;

function addStringToken(str)
{
tokens.push({ type: "string", value: str });
}

function addSpecifierToken(specifier, precision, substitutionIndex)
{
tokens.push({ type: "specifier", specifier: specifier, precision: precision, substitutionIndex: substitutionIndex });
}

function isDigit(c)
{
return !!/[0-9]/.exec(c);
}

var index = 0;
for (var precentIndex = format.indexOf("%", index); precentIndex !== -1; precentIndex = format.indexOf("%", index)) {
addStringToken(format.substring(index, precentIndex));
index = precentIndex + 1;

if (isDigit(format[index])) {

var number = parseInt(format.substring(index), 10);
while (isDigit(format[index]))
++index;



if (number > 0 && format[index] === "$") {
substitutionIndex = (number - 1);
++index;
}
}

var precision = -1;
if (format[index] === ".") {


++index;
precision = parseInt(format.substring(index), 10);
if (isNaN(precision))
precision = 0;

while (isDigit(format[index]))
++index;
}

if (!(format[index] in formatters)) {
addStringToken(format.substring(precentIndex, index + 1));
++index;
continue;
}

addSpecifierToken(format[index], precision, substitutionIndex);

++substitutionIndex;
++index;
}

addStringToken(format.substring(index));

return tokens;
}

String.standardFormatters = {
d: function(substitution)
{
return !isNaN(substitution) ? substitution : 0;
},

f: function(substitution, token)
{
if (substitution && token.precision > -1)
substitution = substitution.toFixed(token.precision);
return !isNaN(substitution) ? substitution : (token.precision > -1 ? Number(0).toFixed(token.precision) : 0);
},

s: function(substitution)
{
return substitution;
}
}

String.vsprintf = function(format, substitutions)
{
return String.format(format, substitutions, String.standardFormatters, "", function(a, b) { return a + b; }).formattedResult;
}

String.format = function(format, substitutions, formatters, initialValue, append)
{
if (!format || !substitutions || !substitutions.length)
return { formattedResult: append(initialValue, format), unusedSubstitutions: substitutions };

function prettyFunctionName()
{
return "String.format(\"" + format + "\", \"" + substitutions.join("\", \"") + "\")";
}

function warn(msg)
{
console.warn(prettyFunctionName() + ": " + msg);
}

function error(msg)
{
console.error(prettyFunctionName() + ": " + msg);
}

var result = initialValue;
var tokens = String.tokenizeFormatString(format, formatters);
var usedSubstitutionIndexes = {};

for (var i = 0; i < tokens.length; ++i) {
var token = tokens[i];

if (token.type === "string") {
result = append(result, token.value);
continue;
}

if (token.type !== "specifier") {
error("Unknown token type \"" + token.type + "\" found.");
continue;
}

if (token.substitutionIndex >= substitutions.length) {


error("not enough substitution arguments. Had " + substitutions.length + " but needed " + (token.substitutionIndex + 1) + ", so substitution was skipped.");
result = append(result, "%" + (token.precision > -1 ? token.precision : "") + token.specifier);
continue;
}

usedSubstitutionIndexes[token.substitutionIndex] = true;

if (!(token.specifier in formatters)) {

warn("unsupported format character \u201C" + token.specifier + "\u201D. Treating as a string.");
result = append(result, substitutions[token.substitutionIndex]);
continue;
}

result = append(result, formatters[token.specifier](substitutions[token.substitutionIndex], token));
}

var unusedSubstitutions = [];
for (var i = 0; i < substitutions.length; ++i) {
if (i in usedSubstitutionIndexes)
continue;
unusedSubstitutions.push(substitutions[i]);
}

return { formattedResult: result, unusedSubstitutions: unusedSubstitutions };
}


function createSearchRegex(query, caseSensitive, isRegex)
{
var regexFlags = caseSensitive ? "g" : "gi";
var regexObject;

if (isRegex) {
try {
regexObject = new RegExp(query, regexFlags);
} catch (e) {

}
}

if (!regexObject)
regexObject = createPlainTextSearchRegex(query, regexFlags);

return regexObject;
}


function createPlainTextSearchRegex(query, flags)
{

var regexSpecialCharacters = String.regexSpecialCharacters();
var regex = "";
for (var i = 0; i < query.length; ++i) {
var c = query.charAt(i);
if (regexSpecialCharacters.indexOf(c) != -1)
regex += "\\";
regex += c;
}
return new RegExp(regex, flags || "");
}


function countRegexMatches(regex, content)
{
var text = content;
var result = 0;
var match;
while (text && (match = regex.exec(text))) {
if (match[0].length > 0)
++result;
text = text.substring(match.index + 1);
}
return result;
}


function numberToStringWithSpacesPadding(value, symbolsCount)
{
var numberString = value.toString();
var paddingLength = Math.max(0, symbolsCount - numberString.length);
var paddingString = Array(paddingLength + 1).join("\u00a0");
return paddingString + numberString;
}


var createObjectIdentifier = function()
{

return '_' + ++createObjectIdentifier._last;
}

createObjectIdentifier._last = 0;


var Set = function()
{

this._set = {};
this._size = 0;
}

Set.prototype = {

add: function(item)
{
var objectIdentifier = item.__identifier;
if (!objectIdentifier) {
objectIdentifier = createObjectIdentifier();
item.__identifier = objectIdentifier;
}
if (!this._set[objectIdentifier])
++this._size;
this._set[objectIdentifier] = item;
},


remove: function(item)
{
if (this._set[item.__identifier]) {
--this._size;
delete this._set[item.__identifier];
}
},


items: function()
{
var result = new Array(this._size);
var i = 0;
for (var objectIdentifier in this._set)
result[i++] = this._set[objectIdentifier];
return result;
},


hasItem: function(item)
{
return this._set[item.__identifier];
},


size: function()
{
return this._size;
},

clear: function()
{
this._set = {};
this._size = 0;
}
}


var Map = function()
{
this._map = {};
this._size = 0;
}

Map.prototype = {

put: function(key, value)
{
var objectIdentifier = key.__identifier;
if (!objectIdentifier) {
objectIdentifier = createObjectIdentifier();
key.__identifier = objectIdentifier;
}
if (!this._map[objectIdentifier])
++this._size;
this._map[objectIdentifier] = [key, value];
},


remove: function(key)
{
var result = this._map[key.__identifier];
if (!result)
return undefined;
--this._size;
delete this._map[key.__identifier];
return result[1];
},


keys: function()
{
return this._list(0);
},

values: function()
{
return this._list(1);
},


_list: function(index)
{
var result = new Array(this._size);
var i = 0;
for (var objectIdentifier in this._map)
result[i++] = this._map[objectIdentifier][index];
return result;
},


get: function(key)
{
var entry = this._map[key.__identifier];
return entry ? entry[1] : undefined;
},


contains: function(key)
{
var entry = this._map[key.__identifier];
return !!entry;
},

size: function()
{
return this._size;
},

clear: function()
{
this._map = {};
this._size = 0;
}
}

function loadXHR(url, async, callback) 
{
function onReadyStateChanged() 
{
if (xhr.readyState !== XMLHttpRequest.DONE)
return;

if (xhr.status === 200) {
callback(xhr.responseText);
return;
}

callback(null); 
}

var xhr = new XMLHttpRequest();
xhr.open("GET", url, async);
if (async)
xhr.onreadystatechange = onReadyStateChanged;        
xhr.send(null);

if (!async) {
if (xhr.status === 200) 
return xhr.responseText;
return null;
}
return null;
}


function StringPool()
{
this.reset();
}

StringPool.prototype = {

intern: function(string)
{

if (string === "__proto__")
return "__proto__";
var result = this._strings[string];
if (result === undefined) {
this._strings[string] = string;
result = string;
}
return result;
},

reset: function()
{
this._strings = Object.create(null);
},


internObjectStrings: function(obj, depthLimit)
{
if (typeof depthLimit !== "number")
depthLimit = 100;
else if (--depthLimit < 0)
throw "recursion depth limit reached in StringPool.deepIntern(), perhaps attempting to traverse cyclical references?";

for (var field in obj) {
switch (typeof obj[field]) {
case "string":
obj[field] = this.intern(obj[field]);
break;
case "object":
this.internObjectStrings(obj[field], depthLimit);
break;
}
}
}
}

var _importedScripts = {};


function importScript(scriptName)
{
if (_importedScripts[scriptName])
return;
var xhr = new XMLHttpRequest();
_importedScripts[scriptName] = true;
if (window.flattenImports)
scriptName = scriptName.split("/").reverse()[0];
xhr.open("GET", scriptName, false);
xhr.send(null);
if (!xhr.responseText)
throw "empty response arrived for script '" + scriptName + "'";
var sourceURL = WebInspector.ParsedURL.completeURL(window.location.href, scriptName); 
window.eval(xhr.responseText + "\n//@ sourceURL=" + sourceURL);
}

var loadScript = importScript;
;

function postMessageWrapper(message)
{
postMessage(message);
}


WebInspector.WorkerConsole = function()
{
}

WebInspector.WorkerConsole.prototype = {

log: function(var_args)
{
this._postMessage("log", Array.prototype.slice.call(arguments));
},


error: function(var_args)
{
this._postMessage("error", Array.prototype.slice.call(arguments));
},


info: function(var_args)
{
this._postMessage("info", Array.prototype.slice.call(arguments));
},

trace: function()
{
this.log(new Error().stack);
},



_postMessage: function(method, args)
{
var rawMessage = {
object: "console",
method: method,
arguments: args
};
postMessageWrapper(rawMessage);
}
};

var dispatcher = new WebInspector.HeapSnapshotWorkerDispatcher(this, postMessageWrapper);
addEventListener("message", dispatcher.dispatchMessage.bind(dispatcher), false);
console = new WebInspector.WorkerConsole();
