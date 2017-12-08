DataGrid.DataGrid=class extends Common.Object{constructor(columnsArray,editCallback,deleteCallback,refreshCallback){super();this.element=createElementWithClass('div','data-grid');UI.appendStyle(this.element,'data_grid/dataGrid.css');this.element.tabIndex=0;this.element.addEventListener('keydown',this._keyDown.bind(this),false);this.element.addEventListener('contextmenu',this._contextMenu.bind(this),true);this._editCallback=editCallback;this._deleteCallback=deleteCallback;this._refreshCallback=refreshCallback;var headerContainer=this.element.createChild('div','header-container');this._headerTable=headerContainer.createChild('table','header');this._headerTableHeaders={};this._scrollContainer=this.element.createChild('div','data-container');this._dataTable=this._scrollContainer.createChild('table','data');if(editCallback)
this._dataTable.addEventListener('dblclick',this._ondblclick.bind(this),false);this._dataTable.addEventListener('mousedown',this._mouseDownInDataTable.bind(this));this._dataTable.addEventListener('click',this._clickInDataTable.bind(this),true);this._inline=false;this._columnsArray=[];this._columns={};this._visibleColumnsArray=columnsArray;columnsArray.forEach(column=>this._innerAddColumn(column));this._cellClass=null;this._headerTableColumnGroup=this._headerTable.createChild('colgroup');this._headerTableBody=this._headerTable.createChild('tbody');this._headerRow=this._headerTableBody.createChild('tr');this._dataTableColumnGroup=this._dataTable.createChild('colgroup');this.dataTableBody=this._dataTable.createChild('tbody');this._topFillerRow=this.dataTableBody.createChild('tr','data-grid-filler-row revealed');this._bottomFillerRow=this.dataTableBody.createChild('tr','data-grid-filler-row revealed');this.setVerticalPadding(0,0);this._refreshHeader();this._editing=false;this.selectedNode=null;this.expandNodesWhenArrowing=false;this.setRootNode((new DataGrid.DataGridNode()));this.indentWidth=15;this._resizers=[];this._columnWidthsInitialized=false;this._cornerWidth=DataGrid.DataGrid.CornerWidth;this._resizeMethod=DataGrid.DataGrid.ResizeMethod.Nearest;this._headerContextMenuCallback=null;this._rowContextMenuCallback=null;}
headerTableBody(){return this._headerTableBody;}
_innerAddColumn(column,position){var columnId=column.id;if(columnId in this._columns)
this._innerRemoveColumn(columnId);if(position===undefined)
position=this._columnsArray.length;this._columnsArray.splice(position,0,column);this._columns[columnId]=column;if(column.disclosure)
this.disclosureColumnId=columnId;var cell=createElement('th');cell.className=columnId+'-column';cell[DataGrid.DataGrid._columnIdSymbol]=columnId;this._headerTableHeaders[columnId]=cell;var div=createElement('div');if(column.titleDOMFragment)
div.appendChild(column.titleDOMFragment);else
div.textContent=column.title;cell.appendChild(div);if(column.sort){cell.classList.add(column.sort);this._sortColumnCell=cell;}
if(column.sortable){cell.addEventListener('click',this._clickInHeaderCell.bind(this),false);cell.classList.add('sortable');var icon=UI.Icon.create('','sort-order-icon');cell.createChild('div','sort-order-icon-container').appendChild(icon);cell[DataGrid.DataGrid._sortIconSymbol]=icon;}}
addColumn(column,position){this._innerAddColumn(column,position);}
_innerRemoveColumn(columnId){var column=this._columns[columnId];if(!column)
return;delete this._columns[columnId];var index=this._columnsArray.findIndex(columnConfig=>columnConfig.id===columnId);this._columnsArray.splice(index,1);var cell=this._headerTableHeaders[columnId];if(cell.parentElement)
cell.parentElement.removeChild(cell);delete this._headerTableHeaders[columnId];}
removeColumn(columnId){this._innerRemoveColumn(columnId);}
setCellClass(cellClass){this._cellClass=cellClass;}
_refreshHeader(){this._headerTableColumnGroup.removeChildren();this._dataTableColumnGroup.removeChildren();this._headerRow.removeChildren();this._topFillerRow.removeChildren();this._bottomFillerRow.removeChildren();for(var i=0;i<this._visibleColumnsArray.length;++i){var column=this._visibleColumnsArray[i];var columnId=column.id;var headerColumn=this._headerTableColumnGroup.createChild('col');var dataColumn=this._dataTableColumnGroup.createChild('col');if(column.width){headerColumn.style.width=column.width;dataColumn.style.width=column.width;}
this._headerRow.appendChild(this._headerTableHeaders[columnId]);this._topFillerRow.createChild('td','top-filler-td');this._bottomFillerRow.createChild('td','bottom-filler-td')[DataGrid.DataGrid._columnIdSymbol]=columnId;}
this._headerRow.createChild('th','corner');this._topFillerRow.createChild('td','corner').classList.add('top-filler-td');this._bottomFillerRow.createChild('td','corner').classList.add('bottom-filler-td');this._headerTableColumnGroup.createChild('col','corner');this._dataTableColumnGroup.createChild('col','corner');}
setVerticalPadding(top,bottom){var topPx=top+'px';var bottomPx=(top||bottom)?bottom+'px':'auto';if(this._topFillerRow.style.height===topPx&&this._bottomFillerRow.style.height===bottomPx)
return;this._topFillerRow.style.height=topPx;this._bottomFillerRow.style.height=bottomPx;this.dispatchEventToListeners(DataGrid.DataGrid.Events.PaddingChanged);}
setRootNode(rootNode){if(this._rootNode){this._rootNode.removeChildren();this._rootNode.dataGrid=null;this._rootNode._isRoot=false;}
this._rootNode=rootNode;rootNode._isRoot=true;rootNode.setHasChildren(false);rootNode._expanded=true;rootNode._revealed=true;rootNode.selectable=false;rootNode.dataGrid=this;}
rootNode(){return this._rootNode;}
_ondblclick(event){if(this._editing||this._editingNode)
return;var columnId=this.columnIdFromNode((event.target));if(!columnId||!this._columns[columnId].editable)
return;this._startEditing((event.target));}
_startEditingColumnOfDataGridNode(node,cellIndex){this._editing=true;this._editingNode=node;this._editingNode.select();var element=this._editingNode._element.children[cellIndex];UI.InplaceEditor.startEditing(element,this._startEditingConfig(element));element.getComponentSelection().selectAllChildren(element);}
startEditingNextEditableColumnOfDataGridNode(node,columnIdentifier){const column=this._columns[columnIdentifier];const cellIndex=this._visibleColumnsArray.indexOf(column);const nextEditableColumn=this._nextEditableColumn(cellIndex);if(nextEditableColumn!==-1)
this._startEditingColumnOfDataGridNode(node,nextEditableColumn);}
_startEditing(target){var element=(target.enclosingNodeOrSelfWithNodeName('td'));if(!element)
return;this._editingNode=this.dataGridNodeFromNode(target);if(!this._editingNode){if(!this.creationNode)
return;this._editingNode=this.creationNode;}
if(this._editingNode.isCreationNode){this._startEditingColumnOfDataGridNode(this._editingNode,this._nextEditableColumn(-1));return;}
this._editing=true;UI.InplaceEditor.startEditing(element,this._startEditingConfig(element));element.getComponentSelection().selectAllChildren(element);}
renderInline(){this.element.classList.add('inline');this._cornerWidth=0;this._inline=true;this.updateWidths();}
_startEditingConfig(element){return new UI.InplaceEditor.Config(this._editingCommitted.bind(this),this._editingCancelled.bind(this),element.textContent);}
_editingCommitted(element,newText,oldText,context,moveDirection){var columnId=this.columnIdFromNode(element);if(!columnId){this._editingCancelled(element);return;}
var column=this._columns[columnId];var cellIndex=this._visibleColumnsArray.indexOf(column);var textBeforeEditing=(this._editingNode.data[columnId]||'');var currentEditingNode=this._editingNode;function moveToNextIfNeeded(wasChange){if(!moveDirection)
return;if(moveDirection==='forward'){var firstEditableColumn=this._nextEditableColumn(-1);if(currentEditingNode.isCreationNode&&cellIndex===firstEditableColumn&&!wasChange)
return;var nextEditableColumn=this._nextEditableColumn(cellIndex);if(nextEditableColumn!==-1){this._startEditingColumnOfDataGridNode(currentEditingNode,nextEditableColumn);return;}
var nextDataGridNode=currentEditingNode.traverseNextNode(true,null,true);if(nextDataGridNode){this._startEditingColumnOfDataGridNode(nextDataGridNode,firstEditableColumn);return;}
if(currentEditingNode.isCreationNode&&wasChange){this.addCreationNode(false);this._startEditingColumnOfDataGridNode(this.creationNode,firstEditableColumn);return;}
return;}
if(moveDirection==='backward'){var prevEditableColumn=this._nextEditableColumn(cellIndex,true);if(prevEditableColumn!==-1){this._startEditingColumnOfDataGridNode(currentEditingNode,prevEditableColumn);return;}
var lastEditableColumn=this._nextEditableColumn(this._visibleColumnsArray.length,true);var nextDataGridNode=currentEditingNode.traversePreviousNode(true,true);if(nextDataGridNode)
this._startEditingColumnOfDataGridNode(nextDataGridNode,lastEditableColumn);return;}}
if(textBeforeEditing===newText){this._editingCancelled(element);moveToNextIfNeeded.call(this,false);return;}
this._editingNode.data[columnId]=newText;this._editCallback(this._editingNode,columnId,textBeforeEditing,newText);if(this._editingNode.isCreationNode)
this.addCreationNode(false);this._editingCancelled(element);moveToNextIfNeeded.call(this,true);}
_editingCancelled(element){this._editing=false;this._editingNode=null;}
_nextEditableColumn(cellIndex,moveBackward){var increment=moveBackward?-1:1;var columns=this._visibleColumnsArray;for(var i=cellIndex+increment;(i>=0)&&(i<columns.length);i+=increment){if(columns[i].editable)
return i;}
return-1;}
sortColumnId(){if(!this._sortColumnCell)
return null;return this._sortColumnCell[DataGrid.DataGrid._columnIdSymbol];}
sortOrder(){if(!this._sortColumnCell||this._sortColumnCell.classList.contains(DataGrid.DataGrid.Order.Ascending))
return DataGrid.DataGrid.Order.Ascending;if(this._sortColumnCell.classList.contains(DataGrid.DataGrid.Order.Descending))
return DataGrid.DataGrid.Order.Descending;return null;}
isSortOrderAscending(){return!this._sortColumnCell||this._sortColumnCell.classList.contains(DataGrid.DataGrid.Order.Ascending);}
_autoSizeWidths(widths,minPercent,maxPercent){if(minPercent)
minPercent=Math.min(minPercent,Math.floor(100/widths.length));var totalWidth=0;for(var i=0;i<widths.length;++i)
totalWidth+=widths[i];var totalPercentWidth=0;for(var i=0;i<widths.length;++i){var width=Math.round(100*widths[i]/totalWidth);if(minPercent&&width<minPercent)
width=minPercent;else if(maxPercent&&width>maxPercent)
width=maxPercent;totalPercentWidth+=width;widths[i]=width;}
var recoupPercent=totalPercentWidth-100;while(minPercent&&recoupPercent>0){for(var i=0;i<widths.length;++i){if(widths[i]>minPercent){--widths[i];--recoupPercent;if(!recoupPercent)
break;}}}
while(maxPercent&&recoupPercent<0){for(var i=0;i<widths.length;++i){if(widths[i]<maxPercent){++widths[i];++recoupPercent;if(!recoupPercent)
break;}}}
return widths;}
autoSizeColumns(minPercent,maxPercent,maxDescentLevel){var widths=[];for(var i=0;i<this._columnsArray.length;++i)
widths.push((this._columnsArray[i].title||'').length);maxDescentLevel=maxDescentLevel||0;var children=this._enumerateChildren(this._rootNode,[],maxDescentLevel+1);for(var i=0;i<children.length;++i){var node=children[i];for(var j=0;j<this._columnsArray.length;++j){var text=node.data[this._columnsArray[j].id];if(text.length>widths[j])
widths[j]=text.length;}}
widths=this._autoSizeWidths(widths,minPercent,maxPercent);for(var i=0;i<this._columnsArray.length;++i)
this._columnsArray[i].weight=widths[i];this._columnWidthsInitialized=false;this.updateWidths();}
_enumerateChildren(rootNode,result,maxLevel){if(!rootNode._isRoot)
result.push(rootNode);if(!maxLevel)
return[];for(var i=0;i<rootNode.children.length;++i)
this._enumerateChildren(rootNode.children[i],result,maxLevel-1);return result;}
onResize(){this.updateWidths();}
updateWidths(){if(!this._columnWidthsInitialized&&this.element.offsetWidth){var tableWidth=this.element.offsetWidth-this._cornerWidth;var cells=this._headerTableBody.rows[0].cells;var numColumns=cells.length-1;for(var i=0;i<numColumns;i++){var column=this._visibleColumnsArray[i];if(!column.weight)
column.weight=100*cells[i].offsetWidth/tableWidth||10;}
this._columnWidthsInitialized=true;}
this._applyColumnWeights();}
setName(name){this._columnWeightsSetting=Common.settings.createSetting('dataGrid-'+name+'-columnWeights',{});this._loadColumnWeights();}
_loadColumnWeights(){if(!this._columnWeightsSetting)
return;var weights=this._columnWeightsSetting.get();for(var i=0;i<this._columnsArray.length;++i){var column=this._columnsArray[i];var weight=weights[column.id];if(weight)
column.weight=weight;}
this._applyColumnWeights();}
_saveColumnWeights(){if(!this._columnWeightsSetting)
return;var weights={};for(var i=0;i<this._columnsArray.length;++i){var column=this._columnsArray[i];weights[column.id]=column.weight;}
this._columnWeightsSetting.set(weights);}
wasShown(){this._loadColumnWeights();}
willHide(){}
_applyColumnWeights(){var tableWidth=this.element.offsetWidth-this._cornerWidth;if(tableWidth<=0)
return;var sumOfWeights=0.0;var fixedColumnWidths=[];for(var i=0;i<this._visibleColumnsArray.length;++i){var column=this._visibleColumnsArray[i];if(column.fixedWidth){var width=this._headerTableColumnGroup.children[i][DataGrid.DataGrid._preferredWidthSymbol]||this._headerTableBody.rows[0].cells[i].offsetWidth;fixedColumnWidths[i]=width;tableWidth-=width;}else{sumOfWeights+=this._visibleColumnsArray[i].weight;}}
var sum=0;var lastOffset=0;for(var i=0;i<this._visibleColumnsArray.length;++i){var column=this._visibleColumnsArray[i];var width;if(column.fixedWidth){width=fixedColumnWidths[i];}else{sum+=column.weight;var offset=(sum*tableWidth/sumOfWeights)|0;width=offset-lastOffset;lastOffset=offset;}
this._setPreferredWidth(i,width);}
this._positionResizers();}
setColumnsVisiblity(columnsVisibility){this._visibleColumnsArray=[];for(var i=0;i<this._columnsArray.length;++i){var column=this._columnsArray[i];if(columnsVisibility[column.id])
this._visibleColumnsArray.push(column);}
this._refreshHeader();this._applyColumnWeights();var nodes=this._enumerateChildren(this.rootNode(),[],-1);for(var i=0;i<nodes.length;++i)
nodes[i].refresh();}
get scrollContainer(){return this._scrollContainer;}
_positionResizers(){var headerTableColumns=this._headerTableColumnGroup.children;var numColumns=headerTableColumns.length-1;var left=[];var resizers=this._resizers;while(resizers.length>numColumns-1)
resizers.pop().remove();for(var i=0;i<numColumns-1;i++){left[i]=(left[i-1]||0)+this._headerTableBody.rows[0].cells[i].offsetWidth;}
for(var i=0;i<numColumns-1;i++){var resizer=resizers[i];if(!resizer){resizer=createElement('div');resizer.__index=i;resizer.classList.add('data-grid-resizer');UI.installDragHandle(resizer,this._startResizerDragging.bind(this),this._resizerDragging.bind(this),this._endResizerDragging.bind(this),'col-resize');this.element.appendChild(resizer);resizers.push(resizer);}
if(resizer.__position!==left[i]){resizer.__position=left[i];resizer.style.left=left[i]+'px';}}}
addCreationNode(hasChildren){if(this.creationNode)
this.creationNode.makeNormal();var emptyData={};for(var column in this._columns)
emptyData[column]=null;this.creationNode=new DataGrid.CreationDataGridNode(emptyData,hasChildren);this.rootNode().appendChild(this.creationNode);}
_keyDown(event){if(!this.selectedNode||event.shiftKey||event.metaKey||event.ctrlKey||this._editing)
return;var handled=false;var nextSelectedNode;if(event.key==='ArrowUp'&&!event.altKey){nextSelectedNode=this.selectedNode.traversePreviousNode(true);while(nextSelectedNode&&!nextSelectedNode.selectable)
nextSelectedNode=nextSelectedNode.traversePreviousNode(true);handled=nextSelectedNode?true:false;}else if(event.key==='ArrowDown'&&!event.altKey){nextSelectedNode=this.selectedNode.traverseNextNode(true);while(nextSelectedNode&&!nextSelectedNode.selectable)
nextSelectedNode=nextSelectedNode.traverseNextNode(true);handled=nextSelectedNode?true:false;}else if(event.key==='ArrowLeft'){if(this.selectedNode.expanded){if(event.altKey)
this.selectedNode.collapseRecursively();else
this.selectedNode.collapse();handled=true;}else if(this.selectedNode.parent&&!this.selectedNode.parent._isRoot){handled=true;if(this.selectedNode.parent.selectable){nextSelectedNode=this.selectedNode.parent;handled=nextSelectedNode?true:false;}else if(this.selectedNode.parent){this.selectedNode.parent.collapse();}}}else if(event.key==='ArrowRight'){if(!this.selectedNode.revealed){this.selectedNode.reveal();handled=true;}else if(this.selectedNode.hasChildren()){handled=true;if(this.selectedNode.expanded){nextSelectedNode=this.selectedNode.children[0];handled=nextSelectedNode?true:false;}else{if(event.altKey)
this.selectedNode.expandRecursively();else
this.selectedNode.expand();}}}else if(event.keyCode===8||event.keyCode===46){if(this._deleteCallback){handled=true;this._deleteCallback(this.selectedNode);}}else if(isEnterKey(event)){if(this._editCallback){handled=true;this._startEditing(this.selectedNode._element.children[this._nextEditableColumn(-1)]);}}
if(nextSelectedNode){nextSelectedNode.reveal();nextSelectedNode.select();}
if(handled)
event.consume(true);}
updateSelectionBeforeRemoval(root,onlyAffectsSubtree){var ancestor=this.selectedNode;while(ancestor&&ancestor!==root)
ancestor=ancestor.parent;if(!ancestor)
return;var nextSelectedNode;for(ancestor=root;ancestor&&!ancestor.nextSibling;ancestor=ancestor.parent){}
if(ancestor)
nextSelectedNode=ancestor.nextSibling;while(nextSelectedNode&&!nextSelectedNode.selectable)
nextSelectedNode=nextSelectedNode.traverseNextNode(true);if(!nextSelectedNode||nextSelectedNode.isCreationNode){nextSelectedNode=root.traversePreviousNode(true);while(nextSelectedNode&&!nextSelectedNode.selectable)
nextSelectedNode=nextSelectedNode.traversePreviousNode(true);}
if(nextSelectedNode){nextSelectedNode.reveal();nextSelectedNode.select();}else{this.selectedNode.deselect();}}
dataGridNodeFromNode(target){var rowElement=target.enclosingNodeOrSelfWithNodeName('tr');return rowElement&&rowElement._dataGridNode;}
columnIdFromNode(target){var cellElement=target.enclosingNodeOrSelfWithNodeName('td');return cellElement&&cellElement[DataGrid.DataGrid._columnIdSymbol];}
_clickInHeaderCell(event){var cell=event.target.enclosingNodeOrSelfWithNodeName('th');if(!cell||(cell[DataGrid.DataGrid._columnIdSymbol]===undefined)||!cell.classList.contains('sortable'))
return;var sortOrder=DataGrid.DataGrid.Order.Ascending;if((cell===this._sortColumnCell)&&this.isSortOrderAscending())
sortOrder=DataGrid.DataGrid.Order.Descending;if(this._sortColumnCell)
this._sortColumnCell.classList.remove(DataGrid.DataGrid.Order.Ascending,DataGrid.DataGrid.Order.Descending);this._sortColumnCell=cell;cell.classList.add(sortOrder);var icon=cell[DataGrid.DataGrid._sortIconSymbol];icon.setIconType(sortOrder===DataGrid.DataGrid.Order.Ascending?'smallicon-triangle-up':'smallicon-triangle-down');this.dispatchEventToListeners(DataGrid.DataGrid.Events.SortingChanged);}
markColumnAsSortedBy(columnId,sortOrder){if(this._sortColumnCell)
this._sortColumnCell.classList.remove(DataGrid.DataGrid.Order.Ascending,DataGrid.DataGrid.Order.Descending);this._sortColumnCell=this._headerTableHeaders[columnId];this._sortColumnCell.classList.add(sortOrder);}
headerTableHeader(columnId){return this._headerTableHeaders[columnId];}
_mouseDownInDataTable(event){var target=(event.target);var gridNode=this.dataGridNodeFromNode(target);if(!gridNode||!gridNode.selectable||gridNode.isEventWithinDisclosureTriangle(event))
return;var columnId=this.columnIdFromNode(target);if(columnId&&this._columns[columnId].nonSelectable)
return;if(event.metaKey){if(gridNode.selected)
gridNode.deselect();else
gridNode.select();}else{gridNode.select();}}
setHeaderContextMenuCallback(callback){this._headerContextMenuCallback=callback;}
setRowContextMenuCallback(callback){this._rowContextMenuCallback=callback;}
_contextMenu(event){var contextMenu=new UI.ContextMenu(event);var target=(event.target);if(target.isSelfOrDescendant(this._headerTableBody)){if(this._headerContextMenuCallback)
this._headerContextMenuCallback(contextMenu);return;}
var gridNode=this.dataGridNodeFromNode(target);if(this._refreshCallback&&(!gridNode||gridNode!==this.creationNode))
contextMenu.appendItem(Common.UIString('Refresh'),this._refreshCallback.bind(this));if(gridNode&&gridNode.selectable&&!gridNode.isEventWithinDisclosureTriangle(event)){if(this._editCallback){if(gridNode===this.creationNode){contextMenu.appendItem(Common.UIString.capitalize('Add ^new'),this._startEditing.bind(this,target));}else{var columnId=this.columnIdFromNode(target);if(columnId&&this._columns[columnId].editable){contextMenu.appendItem(Common.UIString('Edit "%s"',this._columns[columnId].title),this._startEditing.bind(this,target));}}}
if(this._deleteCallback&&gridNode!==this.creationNode)
contextMenu.appendItem(Common.UIString.capitalize('Delete'),this._deleteCallback.bind(this,gridNode));if(this._rowContextMenuCallback)
this._rowContextMenuCallback(contextMenu,gridNode);}
contextMenu.show();}
_clickInDataTable(event){var gridNode=this.dataGridNodeFromNode((event.target));if(!gridNode||!gridNode.hasChildren()||!gridNode.isEventWithinDisclosureTriangle(event))
return;if(gridNode.expanded){if(event.altKey)
gridNode.collapseRecursively();else
gridNode.collapse();}else{if(event.altKey)
gridNode.expandRecursively();else
gridNode.expand();}}
setResizeMethod(method){this._resizeMethod=method;}
_startResizerDragging(event){this._currentResizer=event.target;return true;}
_endResizerDragging(){this._currentResizer=null;this._saveColumnWeights();}
_resizerDragging(event){var resizer=this._currentResizer;if(!resizer)
return;var dragPoint=event.clientX-this.element.totalOffsetLeft();var firstRowCells=this._headerTableBody.rows[0].cells;var leftEdgeOfPreviousColumn=0;var leftCellIndex=resizer.__index;var rightCellIndex=leftCellIndex+1;for(var i=0;i<leftCellIndex;i++)
leftEdgeOfPreviousColumn+=firstRowCells[i].offsetWidth;if(this._resizeMethod===DataGrid.DataGrid.ResizeMethod.Last){rightCellIndex=this._resizers.length;}else if(this._resizeMethod===DataGrid.DataGrid.ResizeMethod.First){leftEdgeOfPreviousColumn+=firstRowCells[leftCellIndex].offsetWidth-firstRowCells[0].offsetWidth;leftCellIndex=0;}
var rightEdgeOfNextColumn=leftEdgeOfPreviousColumn+firstRowCells[leftCellIndex].offsetWidth+firstRowCells[rightCellIndex].offsetWidth;var leftMinimum=leftEdgeOfPreviousColumn+DataGrid.DataGrid.ColumnResizePadding;var rightMaximum=rightEdgeOfNextColumn-DataGrid.DataGrid.ColumnResizePadding;if(leftMinimum>rightMaximum)
return;dragPoint=Number.constrain(dragPoint,leftMinimum,rightMaximum);var position=(dragPoint-DataGrid.DataGrid.CenterResizerOverBorderAdjustment);resizer.__position=position;resizer.style.left=position+'px';this._setPreferredWidth(leftCellIndex,dragPoint-leftEdgeOfPreviousColumn);this._setPreferredWidth(rightCellIndex,rightEdgeOfNextColumn-dragPoint);var leftColumn=this._visibleColumnsArray[leftCellIndex];var rightColumn=this._visibleColumnsArray[rightCellIndex];if(leftColumn.weight||rightColumn.weight){var sumOfWeights=leftColumn.weight+rightColumn.weight;var delta=rightEdgeOfNextColumn-leftEdgeOfPreviousColumn;leftColumn.weight=(dragPoint-leftEdgeOfPreviousColumn)*sumOfWeights/delta;rightColumn.weight=(rightEdgeOfNextColumn-dragPoint)*sumOfWeights/delta;}
this._positionResizers();event.preventDefault();}
_setPreferredWidth(columnIndex,width){var pxWidth=width+'px';this._headerTableColumnGroup.children[columnIndex][DataGrid.DataGrid._preferredWidthSymbol]=width;this._headerTableColumnGroup.children[columnIndex].style.width=pxWidth;this._dataTableColumnGroup.children[columnIndex].style.width=pxWidth;}
columnOffset(columnId){if(!this.element.offsetWidth)
return 0;for(var i=1;i<this._visibleColumnsArray.length;++i){if(columnId===this._visibleColumnsArray[i].id){if(this._resizers[i-1])
return this._resizers[i-1].__position;}}
return 0;}
asWidget(){if(!this._dataGridWidget)
this._dataGridWidget=new DataGrid.DataGridWidget(this);return this._dataGridWidget;}
topFillerRowElement(){return this._topFillerRow;}};DataGrid.DataGrid.CornerWidth=14;DataGrid.DataGrid.ColumnDescriptor;DataGrid.DataGrid.Events={SelectedNode:Symbol('SelectedNode'),DeselectedNode:Symbol('DeselectedNode'),SortingChanged:Symbol('SortingChanged'),PaddingChanged:Symbol('PaddingChanged')};DataGrid.DataGrid.Order={Ascending:'sort-ascending',Descending:'sort-descending'};DataGrid.DataGrid.Align={Center:'center',Right:'right'};DataGrid.DataGrid._preferredWidthSymbol=Symbol('preferredWidth');DataGrid.DataGrid._columnIdSymbol=Symbol('columnId');DataGrid.DataGrid._sortIconSymbol=Symbol('sortIcon');DataGrid.DataGrid.ColumnResizePadding=24;DataGrid.DataGrid.CenterResizerOverBorderAdjustment=3;DataGrid.DataGrid.ResizeMethod={Nearest:'nearest',First:'first',Last:'last'};DataGrid.DataGridNode=class extends Common.Object{constructor(data,hasChildren){super();this._element=null;this._expanded=false;this._selected=false;this._dirty=false;this._inactive=false;this._depth;this._revealed;this._attached=false;this._savedPosition=null;this._shouldRefreshChildren=true;this._data=data||{};this._hasChildren=hasChildren||false;this.children=[];this.dataGrid=null;this.parent=null;this.previousSibling=null;this.nextSibling=null;this.disclosureToggleWidth=10;this.selectable=true;this._isRoot=false;}
element(){if(!this._element){var element=this.createElement();this.createCells(element);}
return(this._element);}
createElement(){this._element=createElement('tr');this._element._dataGridNode=this;if(this._hasChildren)
this._element.classList.add('parent');if(this.expanded)
this._element.classList.add('expanded');if(this.selected)
this._element.classList.add('selected');if(this.revealed)
this._element.classList.add('revealed');if(this.dirty)
this._element.classList.add('dirty');if(this.inactive)
this._element.classList.add('inactive');return this._element;}
existingElement(){return this._element||null;}
resetElement(){this._element=null;}
createCells(element){element.removeChildren();var columnsArray=this.dataGrid._visibleColumnsArray;for(var i=0;i<columnsArray.length;++i)
element.appendChild(this.createCell(columnsArray[i].id));element.appendChild(this._createTDWithClass('corner'));}
get data(){return this._data;}
set data(x){this._data=x||{};this.refresh();}
get revealed(){if(this._revealed!==undefined)
return this._revealed;var currentAncestor=this.parent;while(currentAncestor&&!currentAncestor._isRoot){if(!currentAncestor.expanded){this._revealed=false;return false;}
currentAncestor=currentAncestor.parent;}
this._revealed=true;return true;}
set revealed(x){if(this._revealed===x)
return;this._revealed=x;if(this._element)
this._element.classList.toggle('revealed',this._revealed);for(var i=0;i<this.children.length;++i)
this.children[i].revealed=x&&this.expanded;}
isDirty(){return this._dirty;}
setDirty(dirty){if(this._dirty===dirty)
return;this._dirty=dirty;if(!this._element)
return;if(dirty)
this._element.classList.add('dirty');else
this._element.classList.remove('dirty');}
isInactive(){return this._inactive;}
setInactive(inactive){if(this._inactive===inactive)
return;this._inactive=inactive;if(!this._element)
return;if(inactive)
this._element.classList.add('inactive');else
this._element.classList.remove('inactive');}
hasChildren(){return this._hasChildren;}
setHasChildren(x){if(this._hasChildren===x)
return;this._hasChildren=x;if(!this._element)
return;this._element.classList.toggle('parent',this._hasChildren);this._element.classList.toggle('expanded',this._hasChildren&&this.expanded);}
get depth(){if(this._depth!==undefined)
return this._depth;if(this.parent&&!this.parent._isRoot)
this._depth=this.parent.depth+1;else
this._depth=0;return this._depth;}
get leftPadding(){return this.depth*this.dataGrid.indentWidth;}
get shouldRefreshChildren(){return this._shouldRefreshChildren;}
set shouldRefreshChildren(x){this._shouldRefreshChildren=x;if(x&&this.expanded)
this.expand();}
get selected(){return this._selected;}
set selected(x){if(x)
this.select();else
this.deselect();}
get expanded(){return this._expanded;}
set expanded(x){if(x)
this.expand();else
this.collapse();}
refresh(){if(!this.dataGrid)
this._element=null;if(!this._element)
return;this.createCells(this._element);}
_createTDWithClass(className){var cell=createElementWithClass('td',className);var cellClass=this.dataGrid._cellClass;if(cellClass)
cell.classList.add(cellClass);return cell;}
createTD(columnId){var cell=this._createTDWithClass(columnId+'-column');cell[DataGrid.DataGrid._columnIdSymbol]=columnId;var alignment=this.dataGrid._columns[columnId].align;if(alignment)
cell.classList.add(alignment);if(columnId===this.dataGrid.disclosureColumnId){cell.classList.add('disclosure');if(this.leftPadding)
cell.style.setProperty('padding-left',this.leftPadding+'px');}
return cell;}
createCell(columnId){var cell=this.createTD(columnId);var data=this.data[columnId];if(data instanceof Node){cell.appendChild(data);}else if(data!==null){cell.textContent=data;if(this.dataGrid._columns[columnId].longText)
cell.title=data;}
return cell;}
nodeSelfHeight(){return 20;}
appendChild(child){this.insertChild(child,this.children.length);}
insertChild(child,index){if(!child)
throw'insertChild: Node can\'t be undefined or null.';if(child.parent===this){var currentIndex=this.children.indexOf(child);if(currentIndex<0)
console.assert(false,'Inconsistent DataGrid state');if(currentIndex===index)
return;if(currentIndex<index)
--index;}
child.remove();this.children.splice(index,0,child);this.setHasChildren(true);child.parent=this;child.dataGrid=this.dataGrid;child.recalculateSiblings(index);child._depth=undefined;child._revealed=undefined;child._attached=false;child._shouldRefreshChildren=true;var current=child.children[0];while(current){current.dataGrid=this.dataGrid;current._depth=undefined;current._revealed=undefined;current._attached=false;current._shouldRefreshChildren=true;current=current.traverseNextNode(false,child,true);}
if(this.expanded)
child._attach();if(!this.revealed)
child.revealed=false;}
remove(){if(this.parent)
this.parent.removeChild(this);}
removeChild(child){if(!child)
throw'removeChild: Node can\'t be undefined or null.';if(child.parent!==this)
throw'removeChild: Node is not a child of this node.';if(this.dataGrid)
this.dataGrid.updateSelectionBeforeRemoval(child,false);child._detach();this.children.remove(child,true);if(child.previousSibling)
child.previousSibling.nextSibling=child.nextSibling;if(child.nextSibling)
child.nextSibling.previousSibling=child.previousSibling;child.dataGrid=null;child.parent=null;child.nextSibling=null;child.previousSibling=null;if(this.children.length<=0)
this.setHasChildren(false);}
removeChildren(){if(this.dataGrid)
this.dataGrid.updateSelectionBeforeRemoval(this,true);for(var i=0;i<this.children.length;++i){var child=this.children[i];child._detach();child.dataGrid=null;child.parent=null;child.nextSibling=null;child.previousSibling=null;}
this.children=[];this.setHasChildren(false);}
recalculateSiblings(myIndex){if(!this.parent)
return;var previousChild=this.parent.children[myIndex-1]||null;if(previousChild)
previousChild.nextSibling=this;this.previousSibling=previousChild;var nextChild=this.parent.children[myIndex+1]||null;if(nextChild)
nextChild.previousSibling=this;this.nextSibling=nextChild;}
collapse(){if(this._isRoot)
return;if(this._element)
this._element.classList.remove('expanded');this._expanded=false;for(var i=0;i<this.children.length;++i)
this.children[i].revealed=false;}
collapseRecursively(){var item=this;while(item){if(item.expanded)
item.collapse();item=item.traverseNextNode(false,this,true);}}
populate(){}
expand(){if(!this._hasChildren||this.expanded)
return;if(this._isRoot)
return;if(this.revealed&&!this._shouldRefreshChildren){for(var i=0;i<this.children.length;++i)
this.children[i].revealed=true;}
if(this._shouldRefreshChildren){for(var i=0;i<this.children.length;++i)
this.children[i]._detach();this.populate();if(this._attached){for(var i=0;i<this.children.length;++i){var child=this.children[i];if(this.revealed)
child.revealed=true;child._attach();}}
this._shouldRefreshChildren=false;}
if(this._element)
this._element.classList.add('expanded');this._expanded=true;}
expandRecursively(){var item=this;while(item){item.expand();item=item.traverseNextNode(false,this);}}
reveal(){if(this._isRoot)
return;var currentAncestor=this.parent;while(currentAncestor&&!currentAncestor._isRoot){if(!currentAncestor.expanded)
currentAncestor.expand();currentAncestor=currentAncestor.parent;}
this.element().scrollIntoViewIfNeeded(false);}
select(supressSelectedEvent){if(!this.dataGrid||!this.selectable||this.selected)
return;if(this.dataGrid.selectedNode)
this.dataGrid.selectedNode.deselect();this._selected=true;this.dataGrid.selectedNode=this;if(this._element)
this._element.classList.add('selected');if(!supressSelectedEvent)
this.dataGrid.dispatchEventToListeners(DataGrid.DataGrid.Events.SelectedNode,this);}
revealAndSelect(){if(this._isRoot)
return;this.reveal();this.select();}
deselect(supressDeselectedEvent){if(!this.dataGrid||this.dataGrid.selectedNode!==this||!this.selected)
return;this._selected=false;this.dataGrid.selectedNode=null;if(this._element)
this._element.classList.remove('selected');if(!supressDeselectedEvent)
this.dataGrid.dispatchEventToListeners(DataGrid.DataGrid.Events.DeselectedNode);}
traverseNextNode(skipHidden,stayWithin,dontPopulate,info){if(!dontPopulate&&this._hasChildren)
this.populate();if(info)
info.depthChange=0;var node=(!skipHidden||this.revealed)?this.children[0]:null;if(node&&(!skipHidden||this.expanded)){if(info)
info.depthChange=1;return node;}
if(this===stayWithin)
return null;node=(!skipHidden||this.revealed)?this.nextSibling:null;if(node)
return node;node=this;while(node&&!node._isRoot&&!((!skipHidden||node.revealed)?node.nextSibling:null)&&node.parent!==stayWithin){if(info)
info.depthChange-=1;node=node.parent;}
if(!node)
return null;return(!skipHidden||node.revealed)?node.nextSibling:null;}
traversePreviousNode(skipHidden,dontPopulate){var node=(!skipHidden||this.revealed)?this.previousSibling:null;if(!dontPopulate&&node&&node._hasChildren)
node.populate();while(node&&((!skipHidden||(node.revealed&&node.expanded))?node.children[node.children.length-1]:null)){if(!dontPopulate&&node._hasChildren)
node.populate();node=((!skipHidden||(node.revealed&&node.expanded))?node.children[node.children.length-1]:null);}
if(node)
return node;if(!this.parent||this.parent._isRoot)
return null;return this.parent;}
isEventWithinDisclosureTriangle(event){if(!this._hasChildren)
return false;var cell=event.target.enclosingNodeOrSelfWithNodeName('td');if(!cell||!cell.classList.contains('disclosure'))
return false;var left=cell.totalOffsetLeft()+this.leftPadding;return event.pageX>=left&&event.pageX<=left+this.disclosureToggleWidth;}
_attach(){if(!this.dataGrid||this._attached)
return;this._attached=true;var previousNode=this.traversePreviousNode(true,true);var previousElement=previousNode?previousNode.element():this.dataGrid._topFillerRow;this.dataGrid.dataTableBody.insertBefore(this.element(),previousElement.nextSibling);if(this.expanded){for(var i=0;i<this.children.length;++i)
this.children[i]._attach();}}
_detach(){if(!this._attached)
return;this._attached=false;if(this._element)
this._element.remove();for(var i=0;i<this.children.length;++i)
this.children[i]._detach();this.wasDetached();}
wasDetached(){}
savePosition(){if(this._savedPosition)
return;if(!this.parent)
throw'savePosition: Node must have a parent.';this._savedPosition={parent:this.parent,index:this.parent.children.indexOf(this)};}
restorePosition(){if(!this._savedPosition)
return;if(this.parent!==this._savedPosition.parent)
this._savedPosition.parent.insertChild(this,this._savedPosition.index);this._savedPosition=null;}};DataGrid.CreationDataGridNode=class extends DataGrid.DataGridNode{constructor(data,hasChildren){super(data,hasChildren);this.isCreationNode=true;}
makeNormal(){this.isCreationNode=false;}};DataGrid.DataGridWidget=class extends UI.VBox{constructor(dataGrid){super();this._dataGrid=dataGrid;this.element.appendChild(dataGrid.element);}
wasShown(){this._dataGrid.wasShown();}
willHide(){this._dataGrid.willHide();}
onResize(){this._dataGrid.onResize();}
elementsToRestoreScrollPositionsFor(){return[this._dataGrid._scrollContainer];}
detachChildWidgets(){super.detachChildWidgets();for(var dataGrid of this._dataGrids)
this.element.removeChild(dataGrid.element);this._dataGrids=[];}};;DataGrid.ViewportDataGrid=class extends DataGrid.DataGrid{constructor(columnsArray,editCallback,deleteCallback,refreshCallback){super(columnsArray,editCallback,deleteCallback,refreshCallback);this._onScrollBound=this._onScroll.bind(this);this._scrollContainer.addEventListener('scroll',this._onScrollBound,true);this._visibleNodes=[];this._inline=false;this._stickToBottom=false;this._updateIsFromUser=false;this._atBottom=true;this._lastScrollTop=0;this._firstVisibleIsStriped=false;this.setRootNode(new DataGrid.ViewportDataGridNode());}
setScrollContainer(scrollContainer){this._scrollContainer.removeEventListener('scroll',this._onScrollBound,true);this._scrollContainer=scrollContainer;this._scrollContainer.addEventListener('scroll',this._onScrollBound,true);}
onResize(){if(this._stickToBottom&&this._atBottom)
this._scrollContainer.scrollTop=this._scrollContainer.scrollHeight-this._scrollContainer.clientHeight;this.scheduleUpdate();super.onResize();}
setStickToBottom(stick){this._stickToBottom=stick;}
_onScroll(event){this._atBottom=this._scrollContainer.isScrolledToBottom();if(this._lastScrollTop!==this._scrollContainer.scrollTop)
this.scheduleUpdate(true);}
scheduleUpdateStructure(){this.scheduleUpdate();}
scheduleUpdate(isFromUser){this._updateIsFromUser=this._updateIsFromUser||isFromUser;if(this._updateAnimationFrameId)
return;this._updateAnimationFrameId=this.element.window().requestAnimationFrame(this._update.bind(this));}
updateInstantly(){this._update();}
renderInline(){this._inline=true;super.renderInline();this._update();}
_calculateVisibleNodes(clientHeight,scrollTop){var nodes=this.rootNode().flatChildren();if(this._inline)
return{topPadding:0,bottomPadding:0,contentHeight:0,visibleNodes:nodes,offset:0};var size=nodes.length;var i=0;var y=0;for(;i<size&&y+nodes[i].nodeSelfHeight()<scrollTop;++i)
y+=nodes[i].nodeSelfHeight();var start=i;var topPadding=y;for(;i<size&&y<scrollTop+clientHeight;++i)
y+=nodes[i].nodeSelfHeight();var end=i;var bottomPadding=0;for(;i<size;++i)
bottomPadding+=nodes[i].nodeSelfHeight();return{topPadding:topPadding,bottomPadding:bottomPadding,contentHeight:y-topPadding,visibleNodes:nodes.slice(start,end),offset:start};}
_contentHeight(){var nodes=this.rootNode().flatChildren();var result=0;for(var i=0,size=nodes.length;i<size;++i)
result+=nodes[i].nodeSelfHeight();return result;}
_update(){if(this._updateAnimationFrameId){this.element.window().cancelAnimationFrame(this._updateAnimationFrameId);delete this._updateAnimationFrameId;}
var clientHeight=this._scrollContainer.clientHeight;var scrollTop=this._scrollContainer.scrollTop;var currentScrollTop=scrollTop;var maxScrollTop=Math.max(0,this._contentHeight()-clientHeight);if(!this._updateIsFromUser&&this._stickToBottom&&this._atBottom)
scrollTop=maxScrollTop;this._updateIsFromUser=false;scrollTop=Math.min(maxScrollTop,scrollTop);this._atBottom=scrollTop===maxScrollTop;var viewportState=this._calculateVisibleNodes(clientHeight,scrollTop);var visibleNodes=viewportState.visibleNodes;var visibleNodesSet=new Set(visibleNodes);for(var i=0;i<this._visibleNodes.length;++i){var oldNode=this._visibleNodes[i];if(!visibleNodesSet.has(oldNode)&&oldNode.attached()){var element=oldNode.existingElement();element.remove();oldNode.wasDetached();}}
var previousElement=this.topFillerRowElement();var tBody=this.dataTableBody;var offset=viewportState.offset;if(visibleNodes.length){var nodes=this.rootNode().flatChildren();var index=nodes.indexOf(visibleNodes[0]);if(index!==-1&&!!(index%2)!==this._firstVisibleIsStriped)
offset+=1;}
this._firstVisibleIsStriped=!!(offset%2);for(var i=0;i<visibleNodes.length;++i){var node=visibleNodes[i];var element=node.element();node.willAttach();node.setStriped((offset+i)%2===0);tBody.insertBefore(element,previousElement.nextSibling);node.revealed=true;previousElement=element;}
this.setVerticalPadding(viewportState.topPadding,viewportState.bottomPadding);this._lastScrollTop=scrollTop;if(scrollTop!==currentScrollTop)
this._scrollContainer.scrollTop=scrollTop;var contentFits=viewportState.contentHeight<=clientHeight&&viewportState.topPadding+viewportState.bottomPadding===0;if(contentFits!==this.element.classList.contains('data-grid-fits-viewport')){this.element.classList.toggle('data-grid-fits-viewport',contentFits);this.updateWidths();}
this._visibleNodes=visibleNodes;this.dispatchEventToListeners(DataGrid.ViewportDataGrid.Events.ViewportCalculated);}
_revealViewportNode(node){var nodes=this.rootNode().flatChildren();var index=nodes.indexOf(node);if(index===-1)
return;var fromY=0;for(var i=0;i<index;++i)
fromY+=nodes[i].nodeSelfHeight();var toY=fromY+node.nodeSelfHeight();var scrollTop=this._scrollContainer.scrollTop;if(scrollTop>fromY){scrollTop=fromY;this._atBottom=false;}else if(scrollTop+this._scrollContainer.offsetHeight<toY){scrollTop=toY-this._scrollContainer.offsetHeight;}
this._scrollContainer.scrollTop=scrollTop;}};DataGrid.ViewportDataGrid.Events={ViewportCalculated:Symbol('ViewportCalculated')};DataGrid.ViewportDataGridNode=class extends DataGrid.DataGridNode{constructor(data,hasChildren){super(data,hasChildren);this._stale=false;this._flatNodes=null;this._isStriped=false;}
element(){var existingElement=this.existingElement();var element=existingElement||this.createElement();if(!existingElement||this._stale){this.createCells(element);this._stale=false;}
return element;}
setStriped(isStriped){this._isStriped=isStriped;this.element().classList.toggle('odd',isStriped);}
isStriped(){return this._isStriped;}
clearFlatNodes(){this._flatNodes=null;var parent=(this.parent);if(parent)
parent.clearFlatNodes();}
flatChildren(){if(this._flatNodes)
return this._flatNodes;var flatNodes=[];var children=[this.children];var counters=[0];var depth=0;while(depth>=0){if(children[depth].length<=counters[depth]){depth--;continue;}
var node=children[depth][counters[depth]++];flatNodes.push(node);if(node._expanded&&node.children.length){depth++;children[depth]=node.children;counters[depth]=0;}}
this._flatNodes=flatNodes;return flatNodes;}
insertChild(child,index){this.clearFlatNodes();if(child.parent===this){var currentIndex=this.children.indexOf(child);if(currentIndex<0)
console.assert(false,'Inconsistent DataGrid state');if(currentIndex===index)
return;if(currentIndex<index)
--index;}
child.remove();child.parent=this;child.dataGrid=this.dataGrid;if(!this.children.length)
this.setHasChildren(true);this.children.splice(index,0,child);child.recalculateSiblings(index);if(this._expanded)
this.dataGrid.scheduleUpdateStructure();}
removeChild(child){this.clearFlatNodes();if(this.dataGrid)
this.dataGrid.updateSelectionBeforeRemoval(child,false);if(child.previousSibling)
child.previousSibling.nextSibling=child.nextSibling;if(child.nextSibling)
child.nextSibling.previousSibling=child.previousSibling;if(child.parent!==this)
throw'removeChild: Node is not a child of this node.';child._unlink();this.children.remove(child,true);if(!this.children.length)
this.setHasChildren(false);if(this._expanded)
this.dataGrid.scheduleUpdateStructure();}
removeChildren(){this.clearFlatNodes();if(this.dataGrid)
this.dataGrid.updateSelectionBeforeRemoval(this,true);for(var i=0;i<this.children.length;++i)
this.children[i]._unlink();this.children=[];if(this._expanded)
this.dataGrid.scheduleUpdateStructure();}
_unlink(){if(this.attached()){this.existingElement().remove();this.wasDetached();}
this.dataGrid=null;this.parent=null;this.nextSibling=null;this.previousSibling=null;}
collapse(){if(!this._expanded)
return;this.clearFlatNodes();this._expanded=false;if(this.existingElement())
this.existingElement().classList.remove('expanded');this.dataGrid.scheduleUpdateStructure();}
expand(){if(this._expanded)
return;this.clearFlatNodes();super.expand();this.dataGrid.scheduleUpdateStructure();}
willAttach(){}
attached(){return!!(this.dataGrid&&this.existingElement()&&this.existingElement().parentElement);}
refresh(){if(this.attached()){this._stale=true;this.dataGrid.scheduleUpdate();}else{this.resetElement();}}
reveal(){this.dataGrid._revealViewportNode(this);}
recalculateSiblings(index){this.clearFlatNodes();super.recalculateSiblings(index);}};;DataGrid.SortableDataGrid=class extends DataGrid.ViewportDataGrid{constructor(columnsArray,editCallback,deleteCallback,refreshCallback){super(columnsArray,editCallback,deleteCallback,refreshCallback);this._sortingFunction=DataGrid.SortableDataGrid.TrivialComparator;this.setRootNode((new DataGrid.SortableDataGridNode()));}
static TrivialComparator(a,b){return 0;}
static NumericComparator(columnId,a,b){var aValue=a.data[columnId];var bValue=b.data[columnId];var aNumber=Number(aValue instanceof Node?aValue.textContent:aValue);var bNumber=Number(bValue instanceof Node?bValue.textContent:bValue);return aNumber<bNumber?-1:(aNumber>bNumber?1:0);}
static StringComparator(columnId,a,b){var aValue=a.data[columnId];var bValue=b.data[columnId];var aString=aValue instanceof Node?aValue.textContent:String(aValue);var bString=bValue instanceof Node?bValue.textContent:String(bValue);return aString<bString?-1:(aString>bString?1:0);}
static Comparator(comparator,reverseMode,a,b){return reverseMode?comparator(b,a):comparator(a,b);}
static create(columnNames,values){var numColumns=columnNames.length;if(!numColumns)
return null;var columns=([]);for(var i=0;i<columnNames.length;++i)
columns.push({id:String(i),title:columnNames[i],width:columnNames[i].length,sortable:true});var nodes=[];for(var i=0;i<values.length/numColumns;++i){var data={};for(var j=0;j<columnNames.length;++j)
data[j]=values[numColumns*i+j];var node=new DataGrid.SortableDataGridNode(data);node.selectable=false;nodes.push(node);}
var dataGrid=new DataGrid.SortableDataGrid(columns);var length=nodes.length;var rootNode=dataGrid.rootNode();for(var i=0;i<length;++i)
rootNode.appendChild(nodes[i]);dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged,sortDataGrid);function sortDataGrid(){var nodes=dataGrid.rootNode().children;var sortColumnId=dataGrid.sortColumnId();if(!sortColumnId)
return;var columnIsNumeric=true;for(var i=0;i<nodes.length;i++){var value=nodes[i].data[sortColumnId];if(isNaN(value instanceof Node?value.textContent:value)){columnIsNumeric=false;break;}}
var comparator=columnIsNumeric?DataGrid.SortableDataGrid.NumericComparator:DataGrid.SortableDataGrid.StringComparator;dataGrid.sortNodes(comparator.bind(null,sortColumnId),!dataGrid.isSortOrderAscending());}
return dataGrid;}
insertChild(node){var root=(this.rootNode());root.insertChildOrdered(node);}
sortNodes(comparator,reverseMode){this._sortingFunction=DataGrid.SortableDataGrid.Comparator.bind(null,comparator,reverseMode);this.rootNode().recalculateSiblings(0);this.rootNode()._sortChildren(reverseMode);this.scheduleUpdateStructure();}};DataGrid.SortableDataGridNode=class extends DataGrid.ViewportDataGridNode{constructor(data,hasChildren){super(data,hasChildren);}
insertChildOrdered(node){this.insertChild(node,this.children.upperBound(node,this.dataGrid._sortingFunction));}
_sortChildren(){this.children.sort(this.dataGrid._sortingFunction);for(var i=0;i<this.children.length;++i)
this.children[i].recalculateSiblings(i);for(var child of this.children)
child._sortChildren();}};;DataGrid.ShowMoreDataGridNode=class extends DataGrid.DataGridNode{constructor(callback,startPosition,endPosition,chunkSize){super({summaryRow:true},false);this._callback=callback;this._startPosition=startPosition;this._endPosition=endPosition;this._chunkSize=chunkSize;this.showNext=createElement('button');this.showNext.setAttribute('type','button');this.showNext.addEventListener('click',this._showNextChunk.bind(this),false);this.showNext.textContent=Common.UIString('Show %d before',this._chunkSize);this.showAll=createElement('button');this.showAll.setAttribute('type','button');this.showAll.addEventListener('click',this._showAll.bind(this),false);this.showLast=createElement('button');this.showLast.setAttribute('type','button');this.showLast.addEventListener('click',this._showLastChunk.bind(this),false);this.showLast.textContent=Common.UIString('Show %d after',this._chunkSize);this._updateLabels();this.selectable=false;}
_showNextChunk(){this._callback(this._startPosition,this._startPosition+this._chunkSize);}
_showAll(){this._callback(this._startPosition,this._endPosition);}
_showLastChunk(){this._callback(this._endPosition-this._chunkSize,this._endPosition);}
_updateLabels(){var totalSize=this._endPosition-this._startPosition;if(totalSize>this._chunkSize){this.showNext.classList.remove('hidden');this.showLast.classList.remove('hidden');}else{this.showNext.classList.add('hidden');this.showLast.classList.add('hidden');}
this.showAll.textContent=Common.UIString('Show all %d',totalSize);}
createCells(element){this._hasCells=false;super.createCells(element);}
createCell(columnIdentifier){var cell=this.createTD(columnIdentifier);if(!this._hasCells){this._hasCells=true;if(this.depth)
cell.style.setProperty('padding-left',(this.depth*this.dataGrid.indentWidth)+'px');cell.appendChild(this.showNext);cell.appendChild(this.showAll);cell.appendChild(this.showLast);}
return cell;}
setStartPosition(from){this._startPosition=from;this._updateLabels();}
setEndPosition(to){this._endPosition=to;this._updateLabels();}
nodeSelfHeight(){return 40;}
dispose(){}};;Runtime.cachedResources["data_grid/dataGrid.css"]=".data-grid {\n    position: relative;\n    border: 1px solid #aaa;\n    line-height: 120%;\n}\n\n.data-grid table {\n    table-layout: fixed;\n    border-spacing: 0;\n    border-collapse: separate;\n    height: 100%;\n    width: 100%;\n}\n\n.data-grid .header-container,\n.data-grid .data-container {\n    position: absolute;\n    left: 0;\n    right: 0;\n    overflow-x: hidden;\n}\n\n.data-grid .header-container {\n    top: 0;\n    height: 21px;\n}\n\n.data-grid .data-container {\n    top: 21px;\n    bottom: 0;\n    overflow-y: overlay;\n    transform: translateZ(0);\n}\n\n.data-grid.inline .header-container,\n.data-grid.inline .data-container {\n    position: static;\n}\n\n.data-grid.inline .corner {\n    display: none;\n}\n\n.platform-mac .data-grid .corner,\n.data-grid.data-grid-fits-viewport .corner {\n    display: none;\n}\n\n.data-grid .corner {\n    width: 14px;\n    padding-right: 0;\n    padding-left: 0;\n    border-left: 0 none transparent !important;\n}\n\n.data-grid .top-filler-td,\n.data-grid .bottom-filler-td {\n    height: auto !important;\n    padding: 0 !important;\n}\n\n.data-grid table.data {\n    position: absolute;\n    left: 0;\n    top: 0;\n    right: 0;\n    bottom: 0;\n    border-top: 0 none transparent;\n    background-image: linear-gradient(to bottom, transparent, transparent 50%, hsla(214, 100%, 40%, 0.05) 50%, hsla(214, 100%, 40%, 0.05));\n    background-size: 128px 40px;\n    table-layout: fixed;\n}\n\n.data-grid.inline table.data {\n    position: static;\n}\n\n.data-grid table.data tr {\n    display: none;\n}\n\n.data-grid table.data tr.revealed {\n    display: table-row;\n}\n\n.data-grid td,\n.data-grid th {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    line-height: 18px;\n    height: 18px;\n    border-left: 1px solid #aaa;\n    padding: 1px 4px;\n}\n\n.data-grid th:first-child,\n.data-grid td:first-child {\n    border-left: none !important;\n}\n\n.data-grid td {\n    vertical-align: top;\n    -webkit-user-select: text;\n}\n\n.data-grid th {\n    text-align: left;\n    background-color: #f3f3f3;\n    border-bottom: 1px solid #aaa;\n    font-weight: normal;\n    vertical-align: middle;\n}\n\n.data-grid td > div,\n.data-grid th > div {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n.data-grid td.editing > div {\n    text-overflow: clip;\n}\n\n.data-grid .center {\n    text-align: center;\n}\n\n.data-grid .right {\n    text-align: right;\n}\n\n.data-grid th.sortable {\n    position: relative;\n}\n\n.data-grid th.sortable:active::after {\n    content: \"\";\n    position: absolute;\n    left: 0;\n    right: 0;\n    top: 0;\n    bottom: 0;\n    background-color: rgba(0, 0, 0, 0.15);\n}\n\n.data-grid th .sort-order-icon-container {\n    position: absolute;\n    top: 1px;\n    right: 0;\n    bottom: 1px;\n    display: flex;\n    align-items: center;\n}\n\n.data-grid th .sort-order-icon {\n    margin-right: 4px;\n    margin-bottom: -2px;\n    display: none;\n}\n\n.data-grid th.sort-ascending .sort-order-icon,\n.data-grid th.sort-descending .sort-order-icon {\n    display: block;\n}\n\n.data-grid th:hover {\n    background-color: hsla(0, 0%, 90%, 1);\n}\n\n.data-grid button {\n    line-height: 18px;\n    color: inherit;\n}\n\n.data-grid td.disclosure::before {\n    -webkit-user-select: none;\n    -webkit-mask-image: url(Images/treeoutlineTriangles.png);\n    -webkit-mask-position: 0 0;\n    -webkit-mask-size: 32px 24px;\n    float: left;\n    width: 8px;\n    height: 12px;\n    margin-right: 2px;\n    content: \"\";\n    position: relative;\n    top: 3px;\n    background-color: rgb(110, 110, 110);\n}\n\n.data-grid tr:not(.parent) td.disclosure::before {\n    background-color: transparent;\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.1) {\n.data-grid tr.parent td.disclosure::before {\n    -webkit-mask-image: url(Images/treeoutlineTriangles_2x.png);\n}\n} /* media */\n\n.data-grid tr.expanded td.disclosure::before {\n    -webkit-mask-position: -16px 0;\n}\n\n.data-grid tr.selected {\n    background-color: rgb(212, 212, 212);\n    color: inherit;\n}\n\n.data-grid:focus tr.selected {\n    background-color: rgb(56, 121, 217);\n    color: white;\n}\n\n.data-grid:focus tr.selected .devtools-link {\n    color: white;\n}\n\n.data-grid:focus tr.parent.selected td.disclosure::before {\n    background-color: white;\n    -webkit-mask-position: 0 0;\n}\n\n.data-grid:focus tr.expanded.selected td.disclosure::before {\n    background-color: white;\n    -webkit-mask-position: -16px 0;\n}\n\n.data-grid tr.inactive {\n    color: rgb(128, 128, 128);\n    font-style: italic;\n}\n\n.data-grid tr.dirty {\n    background-color: hsl(0, 100%, 92%);\n    color: red;\n    font-style: normal;\n}\n\n.data-grid:focus tr.selected.dirty {\n    background-color: hsl(0, 100%, 70%);\n}\n\n.data-grid-resizer {\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    width: 5px;\n    z-index: 500;\n}\n\n/*# sourceURL=data_grid/dataGrid.css */";