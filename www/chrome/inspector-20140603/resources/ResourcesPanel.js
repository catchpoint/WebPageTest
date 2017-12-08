WebInspector.ApplicationCacheItemsView=function(model,frameId)
{WebInspector.VBox.call(this);this._model=model;this.element.classList.add("storage-view");this.element.classList.add("table");this.deleteButton=new WebInspector.StatusBarButton(WebInspector.UIString("Delete"),"delete-storage-status-bar-item");this.deleteButton.visible=false;this.deleteButton.addEventListener("click",this._deleteButtonClicked,this);this.connectivityIcon=document.createElement("div");this.connectivityMessage=document.createElement("span");this.connectivityMessage.className="storage-application-cache-connectivity";this.connectivityMessage.textContent="";this.divider=document.createElement("span");this.divider.className="status-bar-item status-bar-divider";this.statusIcon=document.createElement("div");this.statusMessage=document.createElement("span");this.statusMessage.className="storage-application-cache-status";this.statusMessage.textContent="";this._frameId=frameId;this._emptyView=new WebInspector.EmptyView(WebInspector.UIString("No Application Cache information available."));this._emptyView.show(this.element);this._markDirty();var status=this._model.frameManifestStatus(frameId);this.updateStatus(status);this.updateNetworkState(this._model.onLine);this.deleteButton.element.style.display="none";}
WebInspector.ApplicationCacheItemsView.prototype={get statusBarItems()
{return[this.deleteButton.element,this.connectivityIcon,this.connectivityMessage,this.divider,this.statusIcon,this.statusMessage];},wasShown:function()
{this._maybeUpdate();},willHide:function()
{this.deleteButton.visible=false;},_maybeUpdate:function()
{if(!this.isShowing()||!this._viewDirty)
return;this._update();this._viewDirty=false;},_markDirty:function()
{this._viewDirty=true;},updateStatus:function(status)
{var oldStatus=this._status;this._status=status;var statusInformation={};statusInformation[applicationCache.UNCACHED]={className:"red-ball",text:"UNCACHED"};statusInformation[applicationCache.IDLE]={className:"green-ball",text:"IDLE"};statusInformation[applicationCache.CHECKING]={className:"orange-ball",text:"CHECKING"};statusInformation[applicationCache.DOWNLOADING]={className:"orange-ball",text:"DOWNLOADING"};statusInformation[applicationCache.UPDATEREADY]={className:"green-ball",text:"UPDATEREADY"};statusInformation[applicationCache.OBSOLETE]={className:"red-ball",text:"OBSOLETE"};var info=statusInformation[status]||statusInformation[applicationCache.UNCACHED];this.statusIcon.className="storage-application-cache-status-icon "+info.className;this.statusMessage.textContent=info.text;if(this.isShowing()&&this._status===applicationCache.IDLE&&(oldStatus===applicationCache.UPDATEREADY||!this._resources))
this._markDirty();this._maybeUpdate();},updateNetworkState:function(isNowOnline)
{if(isNowOnline){this.connectivityIcon.className="storage-application-cache-connectivity-icon green-ball";this.connectivityMessage.textContent=WebInspector.UIString("Online");}else{this.connectivityIcon.className="storage-application-cache-connectivity-icon red-ball";this.connectivityMessage.textContent=WebInspector.UIString("Offline");}},_update:function()
{this._model.requestApplicationCache(this._frameId,this._updateCallback.bind(this));},_updateCallback:function(applicationCache)
{if(!applicationCache||!applicationCache.manifestURL){delete this._manifest;delete this._creationTime;delete this._updateTime;delete this._size;delete this._resources;this._emptyView.show(this.element);this.deleteButton.visible=false;if(this._dataGrid)
this._dataGrid.element.classList.add("hidden");return;}
this._manifest=applicationCache.manifestURL;this._creationTime=applicationCache.creationTime;this._updateTime=applicationCache.updateTime;this._size=applicationCache.size;this._resources=applicationCache.resources;if(!this._dataGrid)
this._createDataGrid();this._populateDataGrid();this._dataGrid.autoSizeColumns(20,80);this._dataGrid.element.classList.remove("hidden");this._emptyView.detach();this.deleteButton.visible=true;},_createDataGrid:function()
{var columns=[{title:WebInspector.UIString("Resource"),sort:WebInspector.DataGrid.Order.Ascending,sortable:true},{title:WebInspector.UIString("Type"),sortable:true},{title:WebInspector.UIString("Size"),align:WebInspector.DataGrid.Align.Right,sortable:true}];this._dataGrid=new WebInspector.DataGrid(columns);this._dataGrid.show(this.element);this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged,this._populateDataGrid,this);},_populateDataGrid:function()
{var selectedResource=this._dataGrid.selectedNode?this._dataGrid.selectedNode.resource:null;var sortDirection=this._dataGrid.isSortOrderAscending()?1:-1;function numberCompare(field,resource1,resource2)
{return sortDirection*(resource1[field]-resource2[field]);}
function localeCompare(field,resource1,resource2)
{return sortDirection*(resource1[field]+"").localeCompare(resource2[field]+"")}
var comparator;switch(parseInt(this._dataGrid.sortColumnIdentifier(),10)){case 0:comparator=localeCompare.bind(null,"name");break;case 1:comparator=localeCompare.bind(null,"type");break;case 2:comparator=numberCompare.bind(null,"size");break;default:localeCompare.bind(null,"resource");}
this._resources.sort(comparator);this._dataGrid.rootNode().removeChildren();var nodeToSelect;for(var i=0;i<this._resources.length;++i){var data={};var resource=this._resources[i];data[0]=resource.url;data[1]=resource.type;data[2]=Number.bytesToString(resource.size);var node=new WebInspector.DataGridNode(data);node.resource=resource;node.selectable=true;this._dataGrid.rootNode().appendChild(node);if(resource===selectedResource){nodeToSelect=node;nodeToSelect.selected=true;}}
if(!nodeToSelect&&this._dataGrid.rootNode().children.length)
this._dataGrid.rootNode().children[0].selected=true;},_deleteButtonClicked:function(event)
{if(!this._dataGrid||!this._dataGrid.selectedNode)
return;this._deleteCallback(this._dataGrid.selectedNode);},_deleteCallback:function(node)
{},__proto__:WebInspector.VBox.prototype};WebInspector.CookieItemsView=function(treeElement,cookieDomain)
{WebInspector.VBox.call(this);this.element.classList.add("storage-view");this._deleteButton=new WebInspector.StatusBarButton(WebInspector.UIString("Delete"),"delete-storage-status-bar-item");this._deleteButton.visible=false;this._deleteButton.addEventListener("click",this._deleteButtonClicked,this);this._clearButton=new WebInspector.StatusBarButton(WebInspector.UIString("Clear"),"clear-storage-status-bar-item");this._clearButton.visible=false;this._clearButton.addEventListener("click",this._clearButtonClicked,this);this._refreshButton=new WebInspector.StatusBarButton(WebInspector.UIString("Refresh"),"refresh-storage-status-bar-item");this._refreshButton.addEventListener("click",this._refreshButtonClicked,this);this._treeElement=treeElement;this._cookieDomain=cookieDomain;this._emptyView=new WebInspector.EmptyView(WebInspector.UIString("This site has no cookies."));this._emptyView.show(this.element);this.element.addEventListener("contextmenu",this._contextMenu.bind(this),true);}
WebInspector.CookieItemsView.prototype={get statusBarItems()
{return[this._refreshButton.element,this._clearButton.element,this._deleteButton.element];},wasShown:function()
{this._update();},willHide:function()
{this._deleteButton.visible=false;},_update:function()
{WebInspector.Cookies.getCookiesAsync(this._updateWithCookies.bind(this));},_updateWithCookies:function(allCookies)
{this._cookies=this._filterCookiesForDomain(allCookies);if(!this._cookies.length){this._emptyView.show(this.element);this._clearButton.visible=false;this._deleteButton.visible=false;if(this._cookiesTable)
this._cookiesTable.detach();return;}
if(!this._cookiesTable)
this._cookiesTable=new WebInspector.CookiesTable(false,this._update.bind(this),this._showDeleteButton.bind(this));this._cookiesTable.setCookies(this._cookies);this._emptyView.detach();this._cookiesTable.show(this.element);this._treeElement.subtitle=String.sprintf(WebInspector.UIString("%d cookies (%s)"),this._cookies.length,Number.bytesToString(this._totalSize));this._clearButton.visible=true;this._deleteButton.visible=!!this._cookiesTable.selectedCookie();},_filterCookiesForDomain:function(allCookies)
{var cookies=[];var resourceURLsForDocumentURL=[];this._totalSize=0;function populateResourcesForDocuments(resource)
{var url=resource.documentURL.asParsedURL();if(url&&url.host==this._cookieDomain)
resourceURLsForDocumentURL.push(resource.url);}
WebInspector.forAllResources(populateResourcesForDocuments.bind(this));for(var i=0;i<allCookies.length;++i){var pushed=false;var size=allCookies[i].size();for(var j=0;j<resourceURLsForDocumentURL.length;++j){var resourceURL=resourceURLsForDocumentURL[j];if(WebInspector.Cookies.cookieMatchesResourceURL(allCookies[i],resourceURL)){this._totalSize+=size;if(!pushed){pushed=true;cookies.push(allCookies[i]);}}}}
return cookies;},clear:function()
{this._cookiesTable.clear();this._update();},_clearButtonClicked:function()
{this.clear();},_showDeleteButton:function()
{this._deleteButton.visible=true;},_deleteButtonClicked:function()
{var selectedCookie=this._cookiesTable.selectedCookie();if(selectedCookie){selectedCookie.remove();this._update();}},_refreshButtonClicked:function(event)
{this._update();},_contextMenu:function(event)
{if(!this._cookies.length){var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Refresh"),this._update.bind(this));contextMenu.show();}},__proto__:WebInspector.VBox.prototype};WebInspector.DOMStorageItemsView=function(domStorage)
{WebInspector.VBox.call(this);this.domStorage=domStorage;this.element.classList.add("storage-view");this.element.classList.add("table");this.deleteButton=new WebInspector.StatusBarButton(WebInspector.UIString("Delete"),"delete-storage-status-bar-item");this.deleteButton.visible=false;this.deleteButton.addEventListener("click",this._deleteButtonClicked,this);this.refreshButton=new WebInspector.StatusBarButton(WebInspector.UIString("Refresh"),"refresh-storage-status-bar-item");this.refreshButton.addEventListener("click",this._refreshButtonClicked,this);this.domStorage.addEventListener(WebInspector.DOMStorage.Events.DOMStorageItemsCleared,this._domStorageItemsCleared,this);this.domStorage.addEventListener(WebInspector.DOMStorage.Events.DOMStorageItemRemoved,this._domStorageItemRemoved,this);this.domStorage.addEventListener(WebInspector.DOMStorage.Events.DOMStorageItemAdded,this._domStorageItemAdded,this);this.domStorage.addEventListener(WebInspector.DOMStorage.Events.DOMStorageItemUpdated,this._domStorageItemUpdated,this);}
WebInspector.DOMStorageItemsView.prototype={get statusBarItems()
{return[this.refreshButton.element,this.deleteButton.element];},wasShown:function()
{this._update();},willHide:function()
{this.deleteButton.visible=false;},_domStorageItemsCleared:function(event)
{if(!this.isShowing()||!this._dataGrid)
return;this._dataGrid.rootNode().removeChildren();this._dataGrid.addCreationNode(false);this.deleteButton.visible=false;event.consume(true);},_domStorageItemRemoved:function(event)
{if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;event.consume(true);for(var i=0;i<children.length;++i){var childNode=children[i];if(childNode.data.key===storageData.key){rootNode.removeChild(childNode);this.deleteButton.visible=(children.length>1);return;}}},_domStorageItemAdded:function(event)
{if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;event.consume(true);this.deleteButton.visible=true;for(var i=0;i<children.length;++i)
if(children[i].data.key===storageData.key)
return;var childNode=new WebInspector.DataGridNode({key:storageData.key,value:storageData.value},false);rootNode.insertChild(childNode,children.length-1);},_domStorageItemUpdated:function(event)
{if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;event.consume(true);var keyFound=false;for(var i=0;i<children.length;++i){var childNode=children[i];if(childNode.data.key===storageData.key){if(keyFound){rootNode.removeChild(childNode);return;}
keyFound=true;if(childNode.data.value!==storageData.value){childNode.data.value=storageData.value;childNode.refresh();childNode.select();childNode.reveal();}
this.deleteButton.visible=true;}}},_update:function()
{this.detachChildViews();this.domStorage.getItems(this._showDOMStorageItems.bind(this));},_showDOMStorageItems:function(error,items)
{if(error)
return;this._dataGrid=this._dataGridForDOMStorageItems(items);this._dataGrid.show(this.element);this.deleteButton.visible=(this._dataGrid.rootNode().children.length>1);},_dataGridForDOMStorageItems:function(items)
{var columns=[{id:"key",title:WebInspector.UIString("Key"),editable:true,weight:50},{id:"value",title:WebInspector.UIString("Value"),editable:true,weight:50}];var nodes=[];var keys=[];var length=items.length;for(var i=0;i<items.length;i++){var key=items[i][0];var value=items[i][1];var node=new WebInspector.DataGridNode({key:key,value:value},false);node.selectable=true;nodes.push(node);keys.push(key);}
var dataGrid=new WebInspector.DataGrid(columns,this._editingCallback.bind(this),this._deleteCallback.bind(this));dataGrid.setName("DOMStorageItemsView");length=nodes.length;for(var i=0;i<length;++i)
dataGrid.rootNode().appendChild(nodes[i]);dataGrid.addCreationNode(false);if(length>0)
nodes[0].selected=true;return dataGrid;},_deleteButtonClicked:function(event)
{if(!this._dataGrid||!this._dataGrid.selectedNode)
return;this._deleteCallback(this._dataGrid.selectedNode);this._dataGrid.changeNodeAfterDeletion();},_refreshButtonClicked:function(event)
{this._update();},_editingCallback:function(editingNode,columnIdentifier,oldText,newText)
{var domStorage=this.domStorage;if("key"===columnIdentifier){if(typeof oldText==="string")
domStorage.removeItem(oldText);domStorage.setItem(newText,editingNode.data.value||'');this._removeDupes(editingNode);}else
domStorage.setItem(editingNode.data.key||'',newText);},_removeDupes:function(masterNode)
{var rootNode=this._dataGrid.rootNode();var children=rootNode.children;for(var i=children.length-1;i>=0;--i){var childNode=children[i];if((childNode.data.key===masterNode.data.key)&&(masterNode!==childNode))
rootNode.removeChild(childNode);}},_deleteCallback:function(node)
{if(!node||node.isCreationNode)
return;if(this.domStorage)
this.domStorage.removeItem(node.data.key);},__proto__:WebInspector.VBox.prototype};WebInspector.DatabaseQueryView=function(database)
{WebInspector.VBox.call(this);this.database=database;this.element.classList.add("storage-view");this.element.classList.add("query");this.element.classList.add("monospace");this.element.addEventListener("selectstart",this._selectStart.bind(this),false);this._promptElement=document.createElement("div");this._promptElement.className="database-query-prompt";this._promptElement.appendChild(document.createElement("br"));this._promptElement.addEventListener("keydown",this._promptKeyDown.bind(this),true);this.element.appendChild(this._promptElement);this._prompt=new WebInspector.TextPromptWithHistory(this.completions.bind(this)," ");this._prompt.attach(this._promptElement);this.element.addEventListener("click",this._messagesClicked.bind(this),true);}
WebInspector.DatabaseQueryView.Events={SchemaUpdated:"SchemaUpdated"}
WebInspector.DatabaseQueryView.prototype={_messagesClicked:function()
{if(!this._prompt.isCaretInsidePrompt()&&window.getSelection().isCollapsed)
this._prompt.moveCaretToEndOfPrompt();},completions:function(proxyElement,wordRange,force,completionsReadyCallback)
{var prefix=wordRange.toString().toLowerCase();if(!prefix)
return;var results=[];function accumulateMatches(textArray)
{for(var i=0;i<textArray.length;++i){var text=textArray[i].toLowerCase();if(text.length<prefix.length)
continue;if(!text.startsWith(prefix))
continue;results.push(textArray[i]);}}
function tableNamesCallback(tableNames)
{accumulateMatches(tableNames.map(function(name){return name+" "}));accumulateMatches(["SELECT ","FROM ","WHERE ","LIMIT ","DELETE FROM ","CREATE ","DROP ","TABLE ","INDEX ","UPDATE ","INSERT INTO ","VALUES ("]);completionsReadyCallback(results);}
this.database.getTableNames(tableNamesCallback);},_selectStart:function(event)
{if(this._selectionTimeout)
clearTimeout(this._selectionTimeout);this._prompt.clearAutoComplete();function moveBackIfOutside()
{delete this._selectionTimeout;if(!this._prompt.isCaretInsidePrompt()&&window.getSelection().isCollapsed)
this._prompt.moveCaretToEndOfPrompt();this._prompt.autoCompleteSoon();}
this._selectionTimeout=setTimeout(moveBackIfOutside.bind(this),100);},_promptKeyDown:function(event)
{if(isEnterKey(event)){this._enterKeyPressed(event);return;}},_enterKeyPressed:function(event)
{event.consume(true);this._prompt.clearAutoComplete(true);var query=this._prompt.text;if(!query.length)
return;this._prompt.pushHistoryItem(query);this._prompt.text="";this.database.executeSql(query,this._queryFinished.bind(this,query),this._queryError.bind(this,query));},_queryFinished:function(query,columnNames,values)
{var dataGrid=WebInspector.DataGrid.createSortableDataGrid(columnNames,values);var trimmedQuery=query.trim();if(dataGrid){dataGrid.renderInline();this._appendViewQueryResult(trimmedQuery,dataGrid);dataGrid.autoSizeColumns(5);}
if(trimmedQuery.match(/^create /i)||trimmedQuery.match(/^drop table /i))
this.dispatchEventToListeners(WebInspector.DatabaseQueryView.Events.SchemaUpdated,this.database);},_queryError:function(query,errorMessage)
{this._appendErrorQueryResult(query,errorMessage);},_appendViewQueryResult:function(query,view)
{var resultElement=this._appendQueryResult(query);view.show(resultElement);this._promptElement.scrollIntoView(false);},_appendErrorQueryResult:function(query,errorText)
{var resultElement=this._appendQueryResult(query);resultElement.classList.add("error")
resultElement.textContent=errorText;this._promptElement.scrollIntoView(false);},_appendQueryResult:function(query)
{var element=document.createElement("div");element.className="database-user-query";this.element.insertBefore(element,this._prompt.proxyElement);var commandTextElement=document.createElement("span");commandTextElement.className="database-query-text";commandTextElement.textContent=query;element.appendChild(commandTextElement);var resultElement=document.createElement("div");resultElement.className="database-query-result";element.appendChild(resultElement);return resultElement;},__proto__:WebInspector.VBox.prototype};WebInspector.DatabaseTableView=function(database,tableName)
{WebInspector.VBox.call(this);this.database=database;this.tableName=tableName;this.element.classList.add("storage-view");this.element.classList.add("table");this.refreshButton=new WebInspector.StatusBarButton(WebInspector.UIString("Refresh"),"refresh-storage-status-bar-item");this.refreshButton.addEventListener("click",this._refreshButtonClicked,this);}
WebInspector.DatabaseTableView.prototype={wasShown:function()
{this.update();},get statusBarItems()
{return[this.refreshButton.element];},_escapeTableName:function(tableName)
{return tableName.replace(/\"/g,"\"\"");},update:function()
{this.database.executeSql("SELECT * FROM \""+this._escapeTableName(this.tableName)+"\"",this._queryFinished.bind(this),this._queryError.bind(this));},_queryFinished:function(columnNames,values)
{this.detachChildViews();this.element.removeChildren();var dataGrid=WebInspector.DataGrid.createSortableDataGrid(columnNames,values);if(!dataGrid){this._emptyView=new WebInspector.EmptyView(WebInspector.UIString("The “%s”\ntable is empty.",this.tableName));this._emptyView.show(this.element);return;}
dataGrid.show(this.element);dataGrid.autoSizeColumns(5);},_queryError:function(error)
{this.detachChildViews();this.element.removeChildren();var errorMsgElement=document.createElement("div");errorMsgElement.className="storage-table-error";errorMsgElement.textContent=WebInspector.UIString("An error occurred trying to\nread the “%s” table.",this.tableName);this.element.appendChild(errorMsgElement);},_refreshButtonClicked:function(event)
{this.update();},__proto__:WebInspector.VBox.prototype};WebInspector.DirectoryContentView=function()
{const indexes=WebInspector.DirectoryContentView.columnIndexes;var columns=[{id:indexes.Name,title:WebInspector.UIString("Name"),sortable:true,sort:WebInspector.DataGrid.Order.Ascending,width:"20%"},{id:indexes.URL,title:WebInspector.UIString("URL"),sortable:true,width:"20%"},{id:indexes.Type,title:WebInspector.UIString("Type"),sortable:true,width:"15%"},{id:indexes.Size,title:WebInspector.UIString("Size"),sortable:true,width:"10%"},{id:indexes.ModificationTime,title:WebInspector.UIString("Modification Time"),sortable:true,width:"25%"}];WebInspector.DataGrid.call(this,columns);this.addEventListener(WebInspector.DataGrid.Events.SortingChanged,this._sort,this);}
WebInspector.DirectoryContentView.columnIndexes={Name:"0",URL:"1",Type:"2",Size:"3",ModificationTime:"4"}
WebInspector.DirectoryContentView.prototype={showEntries:function(entries)
{const indexes=WebInspector.DirectoryContentView.columnIndexes;this.rootNode().removeChildren();for(var i=0;i<entries.length;++i)
this.rootNode().appendChild(new WebInspector.DirectoryContentView.Node(entries[i]));},_sort:function()
{var column=(this.sortColumnIdentifier());this.sortNodes(WebInspector.DirectoryContentView.Node.comparator(column,!this.isSortOrderAscending()),false);},__proto__:WebInspector.DataGrid.prototype}
WebInspector.DirectoryContentView.Node=function(entry)
{const indexes=WebInspector.DirectoryContentView.columnIndexes;var data={};data[indexes.Name]=entry.name;data[indexes.URL]=entry.url;data[indexes.Type]=entry.isDirectory?WebInspector.UIString("Directory"):entry.mimeType;data[indexes.Size]="";data[indexes.ModificationTime]="";WebInspector.DataGridNode.call(this,data);this._entry=entry;this._metadata=null;this._entry.requestMetadata(this._metadataReceived.bind(this));}
WebInspector.DirectoryContentView.Node.comparator=function(column,reverse)
{var reverseFactor=reverse?-1:1;const indexes=WebInspector.DirectoryContentView.columnIndexes;switch(column){case indexes.Name:case indexes.URL:return function(x,y)
{return isDirectoryCompare(x,y)||nameCompare(x,y);};case indexes.Type:return function(x,y)
{return isDirectoryCompare(x,y)||typeCompare(x,y)||nameCompare(x,y);};case indexes.Size:return function(x,y)
{return isDirectoryCompare(x,y)||sizeCompare(x,y)||nameCompare(x,y);};case indexes.ModificationTime:return function(x,y)
{return isDirectoryCompare(x,y)||modificationTimeCompare(x,y)||nameCompare(x,y);};}
function isDirectoryCompare(x,y)
{if(x._entry.isDirectory!=y._entry.isDirectory)
return y._entry.isDirectory?1:-1;return 0;}
function nameCompare(x,y)
{return reverseFactor*x._entry.name.compareTo(y._entry.name);}
function typeCompare(x,y)
{return reverseFactor*(x._entry.mimeType||"").compareTo(y._entry.mimeType||"");}
function sizeCompare(x,y)
{return reverseFactor*((x._metadata?x._metadata.size:0)-(y._metadata?y._metadata.size:0));}
function modificationTimeCompare(x,y)
{return reverseFactor*((x._metadata?x._metadata.modificationTime:0)-(y._metadata?y._metadata.modificationTime:0));}}
WebInspector.DirectoryContentView.Node.prototype={_metadataReceived:function(errorCode,metadata)
{const indexes=WebInspector.DirectoryContentView.columnIndexes;if(errorCode!==0)
return;this._metadata=metadata;var data=this.data;if(this._entry.isDirectory)
data[indexes.Size]=WebInspector.UIString("-");else
data[indexes.Size]=Number.bytesToString(metadata.size);data[indexes.ModificationTime]=new Date(metadata.modificationTime).toISOString();this.data=data;},__proto__:WebInspector.DataGridNode.prototype};WebInspector.IDBDatabaseView=function(database)
{WebInspector.VBox.call(this);this.registerRequiredCSS("indexedDBViews.css");this.element.classList.add("indexed-db-database-view");this._headersListElement=this.element.createChild("ol","outline-disclosure");this._headersTreeOutline=new TreeOutline(this._headersListElement);this._headersTreeOutline.expandTreeElementsWhenArrowing=true;this._securityOriginTreeElement=new TreeElement("",null,false);this._securityOriginTreeElement.selectable=false;this._headersTreeOutline.appendChild(this._securityOriginTreeElement);this._nameTreeElement=new TreeElement("",null,false);this._nameTreeElement.selectable=false;this._headersTreeOutline.appendChild(this._nameTreeElement);this._intVersionTreeElement=new TreeElement("",null,false);this._intVersionTreeElement.selectable=false;this._headersTreeOutline.appendChild(this._intVersionTreeElement);this._stringVersionTreeElement=new TreeElement("",null,false);this._stringVersionTreeElement.selectable=false;this._headersTreeOutline.appendChild(this._stringVersionTreeElement);this.update(database);}
WebInspector.IDBDatabaseView.prototype={_formatHeader:function(name,value)
{var fragment=document.createDocumentFragment();fragment.createChild("div","attribute-name").textContent=name+":";fragment.createChild("div","attribute-value source-code").textContent=value;return fragment;},_refreshDatabase:function()
{this._securityOriginTreeElement.title=this._formatHeader(WebInspector.UIString("Security origin"),this._database.databaseId.securityOrigin);this._nameTreeElement.title=this._formatHeader(WebInspector.UIString("Name"),this._database.databaseId.name);this._stringVersionTreeElement.title=this._formatHeader(WebInspector.UIString("String Version"),this._database.version);this._intVersionTreeElement.title=this._formatHeader(WebInspector.UIString("Integer Version"),this._database.intVersion);},update:function(database)
{this._database=database;this._refreshDatabase();},__proto__:WebInspector.VBox.prototype}
WebInspector.IDBDataView=function(model,databaseId,objectStore,index)
{WebInspector.VBox.call(this);this.registerRequiredCSS("indexedDBViews.css");this._model=model;this._databaseId=databaseId;this._isIndex=!!index;this.element.classList.add("indexed-db-data-view");var editorToolbar=this._createEditorToolbar();this.element.appendChild(editorToolbar);this._dataGridContainer=this.element.createChild("div","fill");this._dataGridContainer.classList.add("data-grid-container");this._refreshButton=new WebInspector.StatusBarButton(WebInspector.UIString("Refresh"),"refresh-storage-status-bar-item");this._refreshButton.addEventListener("click",this._refreshButtonClicked,this);this._clearButton=new WebInspector.StatusBarButton(WebInspector.UIString("Clear object store"),"clear-storage-status-bar-item");this._clearButton.addEventListener("click",this._clearButtonClicked,this);this._pageSize=50;this._skipCount=0;this.update(objectStore,index);this._entries=[];}
WebInspector.IDBDataView.prototype={_createDataGrid:function()
{var keyPath=this._isIndex?this._index.keyPath:this._objectStore.keyPath;var columns=[];columns.push({id:"number",title:WebInspector.UIString("#"),width:"50px"});columns.push({id:"key",titleDOMFragment:this._keyColumnHeaderFragment(WebInspector.UIString("Key"),keyPath)});if(this._isIndex)
columns.push({id:"primaryKey",titleDOMFragment:this._keyColumnHeaderFragment(WebInspector.UIString("Primary key"),this._objectStore.keyPath)});columns.push({id:"value",title:WebInspector.UIString("Value")});var dataGrid=new WebInspector.DataGrid(columns);return dataGrid;},_keyColumnHeaderFragment:function(prefix,keyPath)
{var keyColumnHeaderFragment=document.createDocumentFragment();keyColumnHeaderFragment.appendChild(document.createTextNode(prefix));if(keyPath===null)
return keyColumnHeaderFragment;keyColumnHeaderFragment.appendChild(document.createTextNode(" ("+WebInspector.UIString("Key path: ")));if(keyPath instanceof Array){keyColumnHeaderFragment.appendChild(document.createTextNode("["));for(var i=0;i<keyPath.length;++i){if(i!=0)
keyColumnHeaderFragment.appendChild(document.createTextNode(", "));keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPath[i]));}
keyColumnHeaderFragment.appendChild(document.createTextNode("]"));}else{var keyPathString=(keyPath);keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPathString));}
keyColumnHeaderFragment.appendChild(document.createTextNode(")"));return keyColumnHeaderFragment;},_keyPathStringFragment:function(keyPathString)
{var keyPathStringFragment=document.createDocumentFragment();keyPathStringFragment.appendChild(document.createTextNode("\""));var keyPathSpan=keyPathStringFragment.createChild("span","source-code console-formatted-string");keyPathSpan.textContent=keyPathString;keyPathStringFragment.appendChild(document.createTextNode("\""));return keyPathStringFragment;},_createEditorToolbar:function()
{var editorToolbar=document.createElement("div");editorToolbar.classList.add("status-bar");editorToolbar.classList.add("data-view-toolbar");this._pageBackButton=editorToolbar.createChild("button","back-button");this._pageBackButton.classList.add("status-bar-item");this._pageBackButton.title=WebInspector.UIString("Show previous page.");this._pageBackButton.disabled=true;this._pageBackButton.appendChild(document.createElement("img"));this._pageBackButton.addEventListener("click",this._pageBackButtonClicked.bind(this),false);editorToolbar.appendChild(this._pageBackButton);this._pageForwardButton=editorToolbar.createChild("button","forward-button");this._pageForwardButton.classList.add("status-bar-item");this._pageForwardButton.title=WebInspector.UIString("Show next page.");this._pageForwardButton.disabled=true;this._pageForwardButton.appendChild(document.createElement("img"));this._pageForwardButton.addEventListener("click",this._pageForwardButtonClicked.bind(this),false);editorToolbar.appendChild(this._pageForwardButton);this._keyInputElement=editorToolbar.createChild("input","key-input");this._keyInputElement.placeholder=WebInspector.UIString("Start from key");this._keyInputElement.addEventListener("paste",this._keyInputChanged.bind(this));this._keyInputElement.addEventListener("cut",this._keyInputChanged.bind(this));this._keyInputElement.addEventListener("keypress",this._keyInputChanged.bind(this));this._keyInputElement.addEventListener("keydown",this._keyInputChanged.bind(this));return editorToolbar;},_pageBackButtonClicked:function()
{this._skipCount=Math.max(0,this._skipCount-this._pageSize);this._updateData(false);},_pageForwardButtonClicked:function()
{this._skipCount=this._skipCount+this._pageSize;this._updateData(false);},_keyInputChanged:function()
{window.setTimeout(this._updateData.bind(this,false),0);},update:function(objectStore,index)
{this._objectStore=objectStore;this._index=index;if(this._dataGrid)
this._dataGrid.detach();this._dataGrid=this._createDataGrid();this._dataGrid.show(this._dataGridContainer);this._skipCount=0;this._updateData(true);},_parseKey:function(keyString)
{var result;try{result=JSON.parse(keyString);}catch(e){result=keyString;}
return result;},_updateData:function(force)
{var key=this._parseKey(this._keyInputElement.value);var pageSize=this._pageSize;var skipCount=this._skipCount;this._refreshButton.setEnabled(false);this._clearButton.setEnabled(!this._isIndex);if(!force&&this._lastKey===key&&this._lastPageSize===pageSize&&this._lastSkipCount===skipCount)
return;if(this._lastKey!==key||this._lastPageSize!==pageSize){skipCount=0;this._skipCount=0;}
this._lastKey=key;this._lastPageSize=pageSize;this._lastSkipCount=skipCount;function callback(entries,hasMore)
{this._refreshButton.setEnabled(true);this.clear();this._entries=entries;for(var i=0;i<entries.length;++i){var data={};data["number"]=i+skipCount;data["key"]=entries[i].key;data["primaryKey"]=entries[i].primaryKey;data["value"]=entries[i].value;var primaryKey=JSON.stringify(this._isIndex?entries[i].primaryKey:entries[i].key);var node=new WebInspector.IDBDataGridNode(data);this._dataGrid.rootNode().appendChild(node);}
this._pageBackButton.disabled=skipCount===0;this._pageForwardButton.disabled=!hasMore;}
var idbKeyRange=key?window.webkitIDBKeyRange.lowerBound(key):null;if(this._isIndex)
this._model.loadIndexData(this._databaseId,this._objectStore.name,this._index.name,idbKeyRange,skipCount,pageSize,callback.bind(this));else
this._model.loadObjectStoreData(this._databaseId,this._objectStore.name,idbKeyRange,skipCount,pageSize,callback.bind(this));},_refreshButtonClicked:function(event)
{this._updateData(true);},_clearButtonClicked:function(event)
{function cleared(){this._clearButton.setEnabled(true);this._updateData(true);}
this._clearButton.setEnabled(false);this._model.clearObjectStore(this._databaseId,this._objectStore.name,cleared.bind(this));},get statusBarItems()
{return[this._refreshButton.element,this._clearButton.element];},clear:function()
{this._dataGrid.rootNode().removeChildren();for(var i=0;i<this._entries.length;++i){this._entries[i].key.release();this._entries[i].primaryKey.release();this._entries[i].value.release();}
this._entries=[];},__proto__:WebInspector.VBox.prototype}
WebInspector.IDBDataGridNode=function(data)
{WebInspector.DataGridNode.call(this,data,false);this.selectable=false;}
WebInspector.IDBDataGridNode.prototype={createCell:function(columnIdentifier)
{var cell=WebInspector.DataGridNode.prototype.createCell.call(this,columnIdentifier);var value=this.data[columnIdentifier];switch(columnIdentifier){case"value":case"key":case"primaryKey":cell.removeChildren();this._formatValue(cell,value);break;default:}
return cell;},_formatValue:function(cell,value)
{var type=value.subtype||value.type;var contents=cell.createChild("div","source-code console-formatted-"+type);switch(type){case"object":case"array":var section=new WebInspector.ObjectPropertiesSection(value,value.description)
section.editable=false;section.skipProto=true;contents.appendChild(section.element);break;case"string":contents.classList.add("primitive-value");contents.appendChild(document.createTextNode("\""+value.description+"\""));break;default:contents.classList.add("primitive-value");contents.appendChild(document.createTextNode(value.description));}},__proto__:WebInspector.DataGridNode.prototype};WebInspector.FileContentView=function(file)
{WebInspector.VBox.call(this);this._innerView=(null);this._file=file;this._content=null;}
WebInspector.FileContentView.prototype={wasShown:function()
{if(!this._innerView){if(this._file.isTextFile)
this._innerView=new WebInspector.EmptyView("");else
this._innerView=new WebInspector.EmptyView(WebInspector.UIString("Binary File"));this.refresh();}
this._innerView.show(this.element);},_metadataReceived:function(errorCode,metadata)
{if(errorCode||!metadata)
return;if(this._content){if(!this._content.updateMetadata(metadata))
return;var sourceFrame=(this._innerView);this._content.requestContent(sourceFrame.setContent.bind(sourceFrame));}else{this._innerView.detach();this._content=new WebInspector.FileContentView.FileContentProvider(this._file,metadata);var sourceFrame=new WebInspector.SourceFrame(this._content);sourceFrame.setHighlighterType(this._file.resourceType.canonicalMimeType());this._innerView=sourceFrame;this._innerView.show(this.element);}},refresh:function()
{if(!this._innerView)
return;if(this._file.isTextFile)
this._file.requestMetadata(this._metadataReceived.bind(this));},__proto__:WebInspector.VBox.prototype}
WebInspector.FileContentView.FileContentProvider=function(file,metadata)
{this._file=file;this._metadata=metadata;}
WebInspector.FileContentView.FileContentProvider.prototype={contentURL:function()
{return this._file.url;},contentType:function()
{return this._file.resourceType;},requestContent:function(callback)
{var size=(this._metadata.size);this._file.requestFileContent(true,0,size,this._charset||"",this._fileContentReceived.bind(this,callback));},_fileContentReceived:function(callback,errorCode,content,base64Encoded,charset)
{if(errorCode||!content){callback(null);return;}
this._charset=charset;callback(content);},searchInContent:function(query,caseSensitive,isRegex,callback)
{setTimeout(callback.bind(null,[]),0);},updateMetadata:function(metadata)
{if(this._metadata.modificationTime>=metadata.modificationTime)
return false;this._metadata=metadata.modificationTime;return true;}};WebInspector.FileSystemView=function(fileSystem)
{WebInspector.SplitView.call(this,true,false,"fileSystemViewSplitViewState");this.element.classList.add("file-system-view");this.element.classList.add("storage-view");var directoryTreeElement=this.element.createChild("ol","filesystem-directory-tree");this._directoryTree=new TreeOutline(directoryTreeElement);this.sidebarElement().appendChild(directoryTreeElement);this.sidebarElement().classList.add("outline-disclosure","sidebar");var rootItem=new WebInspector.FileSystemView.EntryTreeElement(this,fileSystem.root);rootItem.expanded=true;this._directoryTree.appendChild(rootItem);this._visibleView=null;this._refreshButton=new WebInspector.StatusBarButton(WebInspector.UIString("Refresh"),"refresh-storage-status-bar-item");this._refreshButton.visible=true;this._refreshButton.addEventListener("click",this._refresh,this);this._deleteButton=new WebInspector.StatusBarButton(WebInspector.UIString("Delete"),"delete-storage-status-bar-item");this._deleteButton.visible=true;this._deleteButton.addEventListener("click",this._confirmDelete,this);}
WebInspector.FileSystemView.prototype={get statusBarItems()
{return[this._refreshButton.element,this._deleteButton.element];},get visibleView()
{return this._visibleView;},showView:function(view)
{if(this._visibleView===view)
return;if(this._visibleView)
this._visibleView.detach();this._visibleView=view;view.show(this.mainElement());},_refresh:function()
{this._directoryTree.children[0].refresh();},_confirmDelete:function()
{if(confirm(WebInspector.UIString("Are you sure you want to delete the selected entry?")))
this._delete();},_delete:function()
{this._directoryTree.selectedTreeElement.deleteEntry();},__proto__:WebInspector.SplitView.prototype}
WebInspector.FileSystemView.EntryTreeElement=function(fileSystemView,entry)
{TreeElement.call(this,entry.name,null,entry.isDirectory);this._entry=entry;this._fileSystemView=fileSystemView;}
WebInspector.FileSystemView.EntryTreeElement.prototype={onattach:function()
{var selection=this.listItemElement.createChild("div","selection");this.listItemElement.insertBefore(selection,this.listItemElement.firstChild);},onselect:function()
{if(!this._view){if(this._entry.isDirectory)
this._view=new WebInspector.DirectoryContentView();else{var file=(this._entry);this._view=new WebInspector.FileContentView(file);}}
this._fileSystemView.showView(this._view);this.refresh();return false;},onpopulate:function()
{this.refresh();},_directoryContentReceived:function(errorCode,entries)
{if(errorCode===FileError.NOT_FOUND_ERR){if(this.parent!==this.treeOutline)
this.parent.refresh();return;}
if(errorCode!==0||!entries){console.error("Failed to read directory: "+errorCode);return;}
entries.sort(WebInspector.FileSystemModel.Entry.compare);if(this._view)
this._view.showEntries(entries);var oldChildren=this.children.slice(0);var newEntryIndex=0;var oldChildIndex=0;var currentTreeItem=0;while(newEntryIndex<entries.length&&oldChildIndex<oldChildren.length){var newEntry=entries[newEntryIndex];var oldChild=oldChildren[oldChildIndex];var order=newEntry.name.compareTo(oldChild._entry.name);if(order===0){if(oldChild._entry.isDirectory)
oldChild.shouldRefreshChildren=true;else
oldChild.refresh();++newEntryIndex;++oldChildIndex;++currentTreeItem;continue;}
if(order<0){this.insertChild(new WebInspector.FileSystemView.EntryTreeElement(this._fileSystemView,newEntry),currentTreeItem);++newEntryIndex;++currentTreeItem;continue;}
this.removeChildAtIndex(currentTreeItem);++oldChildIndex;}
for(;newEntryIndex<entries.length;++newEntryIndex)
this.appendChild(new WebInspector.FileSystemView.EntryTreeElement(this._fileSystemView,entries[newEntryIndex]));for(;oldChildIndex<oldChildren.length;++oldChildIndex)
this.removeChild(oldChildren[oldChildIndex]);},refresh:function()
{if(!this._entry.isDirectory){if(this._view&&this._view===this._fileSystemView.visibleView){var fileContentView=(this._view);fileContentView.refresh();}}else
this._entry.requestDirectoryContent(this._directoryContentReceived.bind(this));},deleteEntry:function()
{this._entry.deleteEntry(this._deletionCompleted.bind(this));},_deletionCompleted:function()
{if(this._entry!=this._entry.fileSystem.root)
this.parent.refresh();},__proto__:TreeElement.prototype};WebInspector.ResourcesPanel=function(database)
{WebInspector.PanelWithSidebarTree.call(this,"resources");this.registerRequiredCSS("resourcesPanel.css");WebInspector.settings.resourcesLastSelectedItem=WebInspector.settings.createSetting("resourcesLastSelectedItem",{});this.sidebarElement().classList.add("filter-all","children","small","outline-disclosure");this.sidebarTree.element.classList.remove("sidebar-tree");this.resourcesListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Frames"),"Frames",["frame-storage-tree-item"]);this.sidebarTree.appendChild(this.resourcesListTreeElement);this.databasesListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Web SQL"),"Databases",["database-storage-tree-item"]);this.sidebarTree.appendChild(this.databasesListTreeElement);this.indexedDBListTreeElement=new WebInspector.IndexedDBTreeElement(this);this.sidebarTree.appendChild(this.indexedDBListTreeElement);this.localStorageListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Local Storage"),"LocalStorage",["domstorage-storage-tree-item","local-storage"]);this.sidebarTree.appendChild(this.localStorageListTreeElement);this.sessionStorageListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Session Storage"),"SessionStorage",["domstorage-storage-tree-item","session-storage"]);this.sidebarTree.appendChild(this.sessionStorageListTreeElement);this.cookieListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Cookies"),"Cookies",["cookie-storage-tree-item"]);this.sidebarTree.appendChild(this.cookieListTreeElement);this.applicationCacheListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Application Cache"),"ApplicationCache",["application-cache-storage-tree-item"]);this.sidebarTree.appendChild(this.applicationCacheListTreeElement);if(WebInspector.experimentsSettings.fileSystemInspection.isEnabled()){this.fileSystemListTreeElement=new WebInspector.FileSystemListTreeElement(this);this.sidebarTree.appendChild(this.fileSystemListTreeElement);}
var mainView=new WebInspector.VBox();this.storageViews=mainView.element.createChild("div","resources-main diff-container");var statusBarContainer=mainView.element.createChild("div","resources-status-bar");this.storageViewStatusBarItemsContainer=statusBarContainer.createChild("div","status-bar");mainView.show(this.mainElement());this._databaseTableViews=new Map();this._databaseQueryViews=new Map();this._databaseTreeElements=new Map();this._domStorageViews=new Map();this._domStorageTreeElements=new Map();this._cookieViews={};this._domains={};this.sidebarElement().addEventListener("mousemove",this._onmousemove.bind(this),false);this.sidebarElement().addEventListener("mouseout",this._onmouseout.bind(this),false);function sourceFrameGetter()
{var view=this.visibleView;if(view&&view instanceof WebInspector.SourceFrame)
return(view);return null;}
WebInspector.GoToLineDialog.install(this,sourceFrameGetter.bind(this));if(WebInspector.resourceTreeModel.cachedResourcesLoaded())
this._cachedResourcesLoaded();WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.Load,this._loadEventFired,this);WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.CachedResourcesLoaded,this._cachedResourcesLoaded,this);WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.WillLoadCachedResources,this._resetWithFrames,this);WebInspector.databaseModel.databases().forEach(this._addDatabase.bind(this));WebInspector.databaseModel.addEventListener(WebInspector.DatabaseModel.Events.DatabaseAdded,this._databaseAdded,this);}
WebInspector.ResourcesPanel.prototype={canSearch:function()
{return false;},wasShown:function()
{WebInspector.Panel.prototype.wasShown.call(this);this._initialize();},_initialize:function()
{if(!this._initialized&&this.isShowing()&&this._cachedResourcesWereLoaded){var target=(WebInspector.targetManager.activeTarget());this._populateResourceTree();this._populateDOMStorageTree();this._populateApplicationCacheTree(target);this.indexedDBListTreeElement._initialize();if(WebInspector.experimentsSettings.fileSystemInspection.isEnabled())
this.fileSystemListTreeElement._initialize();this._initDefaultSelection();this._initialized=true;}},_loadEventFired:function()
{this._initDefaultSelection();},_initDefaultSelection:function()
{if(!this._initialized)
return;var itemURL=WebInspector.settings.resourcesLastSelectedItem.get();if(itemURL){for(var treeElement=this.sidebarTree.children[0];treeElement;treeElement=treeElement.traverseNextTreeElement(false,this.sidebarTree,true)){if(treeElement.itemURL===itemURL){treeElement.revealAndSelect(true);return;}}}
var mainResource=WebInspector.resourceTreeModel.inspectedPageURL()&&this.resourcesListTreeElement&&this.resourcesListTreeElement.expanded?WebInspector.resourceTreeModel.resourceForURL(WebInspector.resourceTreeModel.inspectedPageURL()):null;if(mainResource)
this.showResource(mainResource);},_resetWithFrames:function()
{this.resourcesListTreeElement.removeChildren();this._treeElementForFrameId={};this._reset();},_reset:function()
{this._domains={};var queryViews=this._databaseQueryViews.values();for(var i=0;i<queryViews.length;++i)
queryViews[i].removeEventListener(WebInspector.DatabaseQueryView.Events.SchemaUpdated,this._updateDatabaseTables,this);this._databaseTableViews.clear();this._databaseQueryViews.clear();this._databaseTreeElements.clear();this._domStorageViews.clear();this._domStorageTreeElements.clear();this._cookieViews={};this.databasesListTreeElement.removeChildren();this.localStorageListTreeElement.removeChildren();this.sessionStorageListTreeElement.removeChildren();this.cookieListTreeElement.removeChildren();if(this.visibleView&&!(this.visibleView instanceof WebInspector.StorageCategoryView))
this.visibleView.detach();this.storageViewStatusBarItemsContainer.removeChildren();if(this.sidebarTree.selectedTreeElement)
this.sidebarTree.selectedTreeElement.deselect();},_populateResourceTree:function()
{this._treeElementForFrameId={};WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameAdded,this._frameAdded,this);WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameNavigated,this._frameNavigated,this);WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameDetached,this._frameDetached,this);WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.ResourceAdded,this._resourceAdded,this);function populateFrame(frame)
{this._frameAdded({data:frame});for(var i=0;i<frame.childFrames.length;++i)
populateFrame.call(this,frame.childFrames[i]);var resources=frame.resources();for(var i=0;i<resources.length;++i)
this._resourceAdded({data:resources[i]});}
populateFrame.call(this,WebInspector.resourceTreeModel.mainFrame);},_frameAdded:function(event)
{var frame=event.data;var parentFrame=frame.parentFrame;var parentTreeElement=parentFrame?this._treeElementForFrameId[parentFrame.id]:this.resourcesListTreeElement;if(!parentTreeElement){console.warn("No frame to route "+frame.url+" to.")
return;}
var frameTreeElement=new WebInspector.FrameTreeElement(this,frame);this._treeElementForFrameId[frame.id]=frameTreeElement;parentTreeElement.appendChild(frameTreeElement);},_frameDetached:function(event)
{var frame=event.data;var frameTreeElement=this._treeElementForFrameId[frame.id];if(!frameTreeElement)
return;delete this._treeElementForFrameId[frame.id];if(frameTreeElement.parent)
frameTreeElement.parent.removeChild(frameTreeElement);},_resourceAdded:function(event)
{var resource=event.data;var frameId=resource.frameId;if(resource.statusCode>=301&&resource.statusCode<=303)
return;var frameTreeElement=this._treeElementForFrameId[frameId];if(!frameTreeElement){return;}
frameTreeElement.appendResource(resource);},_frameNavigated:function(event)
{var frame=event.data;if(!frame.parentFrame)
this._reset();var frameId=frame.id;var frameTreeElement=this._treeElementForFrameId[frameId];if(frameTreeElement)
frameTreeElement.frameNavigated(frame);var applicationCacheFrameTreeElement=this._applicationCacheFrameElements[frameId];if(applicationCacheFrameTreeElement)
applicationCacheFrameTreeElement.frameNavigated(frame);},_cachedResourcesLoaded:function()
{this._cachedResourcesWereLoaded=true;this._initialize();},_databaseAdded:function(event)
{var database=(event.data);this._addDatabase(database);},_addDatabase:function(database)
{var databaseTreeElement=new WebInspector.DatabaseTreeElement(this,database);this._databaseTreeElements.put(database,databaseTreeElement);this.databasesListTreeElement.appendChild(databaseTreeElement);},addDocumentURL:function(url)
{var parsedURL=url.asParsedURL();if(!parsedURL)
return;var domain=parsedURL.host;if(!this._domains[domain]){this._domains[domain]=true;var cookieDomainTreeElement=new WebInspector.CookieTreeElement(this,domain);this.cookieListTreeElement.appendChild(cookieDomainTreeElement);}},_domStorageAdded:function(event)
{var domStorage=(event.data);this._addDOMStorage(domStorage);},_addDOMStorage:function(domStorage)
{console.assert(!this._domStorageTreeElements.get(domStorage));var domStorageTreeElement=new WebInspector.DOMStorageTreeElement(this,domStorage,(domStorage.isLocalStorage?"local-storage":"session-storage"));this._domStorageTreeElements.put(domStorage,domStorageTreeElement);if(domStorage.isLocalStorage)
this.localStorageListTreeElement.appendChild(domStorageTreeElement);else
this.sessionStorageListTreeElement.appendChild(domStorageTreeElement);},_domStorageRemoved:function(event)
{var domStorage=(event.data);this._removeDOMStorage(domStorage);},_removeDOMStorage:function(domStorage)
{var treeElement=this._domStorageTreeElements.get(domStorage);if(!treeElement)
return;var wasSelected=treeElement.selected;var parentListTreeElement=treeElement.parent;parentListTreeElement.removeChild(treeElement);if(wasSelected)
parentListTreeElement.select();this._domStorageTreeElements.remove(domStorage);this._domStorageViews.remove(domStorage);},selectDatabase:function(database)
{if(database){this._showDatabase(database);this._databaseTreeElements.get(database).select();}},selectDOMStorage:function(domStorage)
{if(domStorage){this._showDOMStorage(domStorage);this._domStorageTreeElements.get(domStorage).select();}},showResource:function(resource,line,column)
{var resourceTreeElement=this._findTreeElementForResource(resource);if(resourceTreeElement)
resourceTreeElement.revealAndSelect(true);if(typeof line==="number"){var resourceSourceFrame=this._resourceSourceFrameViewForResource(resource);if(resourceSourceFrame)
resourceSourceFrame.revealPosition(line,column,true);}
return true;},_showResourceView:function(resource)
{var view=this._resourceViewForResource(resource);if(!view){this.visibleView.detach();return;}
this._innerShowView(view);},_resourceViewForResource:function(resource)
{if(WebInspector.ResourceView.hasTextContent(resource)){var treeElement=this._findTreeElementForResource(resource);if(!treeElement)
return null;return treeElement.sourceView();}
return WebInspector.ResourceView.nonSourceViewForResource(resource);},_resourceSourceFrameViewForResource:function(resource)
{var resourceView=this._resourceViewForResource(resource);if(resourceView&&resourceView instanceof WebInspector.ResourceSourceFrame)
return(resourceView);return null;},_showDatabase:function(database,tableName)
{if(!database)
return;var view;if(tableName){var tableViews=this._databaseTableViews.get(database);if(!tableViews){tableViews=({});this._databaseTableViews.put(database,tableViews);}
view=tableViews[tableName];if(!view){view=new WebInspector.DatabaseTableView(database,tableName);tableViews[tableName]=view;}}else{view=this._databaseQueryViews.get(database);if(!view){view=new WebInspector.DatabaseQueryView(database);this._databaseQueryViews.put(database,view);view.addEventListener(WebInspector.DatabaseQueryView.Events.SchemaUpdated,this._updateDatabaseTables,this);}}
this._innerShowView(view);},showIndexedDB:function(view)
{this._innerShowView(view);},_showDOMStorage:function(domStorage)
{if(!domStorage)
return;var view;view=this._domStorageViews.get(domStorage);if(!view){view=new WebInspector.DOMStorageItemsView(domStorage);this._domStorageViews.put(domStorage,view);}
this._innerShowView(view);},showCookies:function(treeElement,cookieDomain)
{var view=this._cookieViews[cookieDomain];if(!view){view=new WebInspector.CookieItemsView(treeElement,cookieDomain);this._cookieViews[cookieDomain]=view;}
this._innerShowView(view);},clearCookies:function(cookieDomain)
{this._cookieViews[cookieDomain].clear();},showApplicationCache:function(frameId)
{if(!this._applicationCacheViews[frameId])
this._applicationCacheViews[frameId]=new WebInspector.ApplicationCacheItemsView(this._applicationCacheModel,frameId);this._innerShowView(this._applicationCacheViews[frameId]);},showFileSystem:function(view)
{this._innerShowView(view);},showCategoryView:function(categoryName)
{if(!this._categoryView)
this._categoryView=new WebInspector.StorageCategoryView();this._categoryView.setText(categoryName);this._innerShowView(this._categoryView);},_innerShowView:function(view)
{if(this.visibleView===view)
return;if(this.visibleView)
this.visibleView.detach();view.show(this.storageViews);this.visibleView=view;this.storageViewStatusBarItemsContainer.removeChildren();var statusBarItems=view.statusBarItems||[];for(var i=0;i<statusBarItems.length;++i)
this.storageViewStatusBarItemsContainer.appendChild(statusBarItems[i]);},closeVisibleView:function()
{if(!this.visibleView)
return;this.visibleView.detach();delete this.visibleView;},_updateDatabaseTables:function(event)
{var database=event.data;if(!database)
return;var databasesTreeElement=this._databaseTreeElements.get(database);if(!databasesTreeElement)
return;databasesTreeElement.shouldRefreshChildren=true;var tableViews=this._databaseTableViews.get(database);if(!tableViews)
return;var tableNamesHash={};var self=this;function tableNamesCallback(tableNames)
{var tableNamesLength=tableNames.length;for(var i=0;i<tableNamesLength;++i)
tableNamesHash[tableNames[i]]=true;for(var tableName in tableViews){if(!(tableName in tableNamesHash)){if(self.visibleView===tableViews[tableName])
self.closeVisibleView();delete tableViews[tableName];}}}
database.getTableNames(tableNamesCallback);},_populateDOMStorageTree:function()
{WebInspector.domStorageModel.storages().forEach(this._addDOMStorage.bind(this));WebInspector.domStorageModel.addEventListener(WebInspector.DOMStorageModel.Events.DOMStorageAdded,this._domStorageAdded,this);WebInspector.domStorageModel.addEventListener(WebInspector.DOMStorageModel.Events.DOMStorageRemoved,this._domStorageRemoved,this);},_populateApplicationCacheTree:function(target)
{this._applicationCacheModel=new WebInspector.ApplicationCacheModel(target);this._applicationCacheViews={};this._applicationCacheFrameElements={};this._applicationCacheManifestElements={};this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestAdded,this._applicationCacheFrameManifestAdded,this);this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestRemoved,this._applicationCacheFrameManifestRemoved,this);this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestStatusUpdated,this._applicationCacheFrameManifestStatusChanged,this);this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.NetworkStateChanged,this._applicationCacheNetworkStateChanged,this);},_applicationCacheFrameManifestAdded:function(event)
{var frameId=event.data;var manifestURL=this._applicationCacheModel.frameManifestURL(frameId);var status=this._applicationCacheModel.frameManifestStatus(frameId)
var manifestTreeElement=this._applicationCacheManifestElements[manifestURL]
if(!manifestTreeElement){manifestTreeElement=new WebInspector.ApplicationCacheManifestTreeElement(this,manifestURL);this.applicationCacheListTreeElement.appendChild(manifestTreeElement);this._applicationCacheManifestElements[manifestURL]=manifestTreeElement;}
var frameTreeElement=new WebInspector.ApplicationCacheFrameTreeElement(this,frameId,manifestURL);manifestTreeElement.appendChild(frameTreeElement);manifestTreeElement.expand();this._applicationCacheFrameElements[frameId]=frameTreeElement;},_applicationCacheFrameManifestRemoved:function(event)
{var frameId=event.data;var frameTreeElement=this._applicationCacheFrameElements[frameId];if(!frameTreeElement)
return;var manifestURL=frameTreeElement.manifestURL;delete this._applicationCacheFrameElements[frameId];delete this._applicationCacheViews[frameId];frameTreeElement.parent.removeChild(frameTreeElement);var manifestTreeElement=this._applicationCacheManifestElements[manifestURL];if(manifestTreeElement.children.length!==0)
return;delete this._applicationCacheManifestElements[manifestURL];manifestTreeElement.parent.removeChild(manifestTreeElement);},_applicationCacheFrameManifestStatusChanged:function(event)
{var frameId=event.data;var status=this._applicationCacheModel.frameManifestStatus(frameId)
if(this._applicationCacheViews[frameId])
this._applicationCacheViews[frameId].updateStatus(status);},_applicationCacheNetworkStateChanged:function(event)
{var isNowOnline=event.data;for(var manifestURL in this._applicationCacheViews)
this._applicationCacheViews[manifestURL].updateNetworkState(isNowOnline);},_findTreeElementForResource:function(resource)
{function isAncestor(ancestor,object)
{return false;}
function getParent(object)
{return null;}
return this.sidebarTree.findTreeElement(resource,isAncestor,getParent);},showView:function(view)
{if(view)
this.showResource(view.resource);},_onmousemove:function(event)
{var nodeUnderMouse=document.elementFromPoint(event.pageX,event.pageY);if(!nodeUnderMouse)
return;var listNode=nodeUnderMouse.enclosingNodeOrSelfWithNodeName("li");if(!listNode)
return;var element=listNode.treeElement;if(this._previousHoveredElement===element)
return;if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
if(element instanceof WebInspector.FrameTreeElement){this._previousHoveredElement=element;element.hovered=true;}},_onmouseout:function(event)
{if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}},__proto__:WebInspector.PanelWithSidebarTree.prototype}
WebInspector.ResourcesPanel.ResourceRevealer=function()
{}
WebInspector.ResourcesPanel.ResourceRevealer.prototype={reveal:function(resource,lineNumber)
{if(resource instanceof WebInspector.Resource)
(WebInspector.inspectorView.showPanel("resources")).showResource(resource,lineNumber);}}
WebInspector.BaseStorageTreeElement=function(storagePanel,representedObject,title,iconClasses,hasChildren,noIcon)
{TreeElement.call(this,"",representedObject,hasChildren);this._storagePanel=storagePanel;this._titleText=title;this._iconClasses=iconClasses;this._noIcon=noIcon;}
WebInspector.BaseStorageTreeElement.prototype={onattach:function()
{this.listItemElement.removeChildren();if(this._iconClasses){for(var i=0;i<this._iconClasses.length;++i)
this.listItemElement.classList.add(this._iconClasses[i]);}
var selectionElement=document.createElement("div");selectionElement.className="selection";this.listItemElement.appendChild(selectionElement);if(!this._noIcon){this.imageElement=document.createElement("img");this.imageElement.className="icon";this.listItemElement.appendChild(this.imageElement);}
this.titleElement=document.createElement("div");this.titleElement.className="base-storage-tree-element-title";this._titleTextNode=document.createTextNode("");this.titleElement.appendChild(this._titleTextNode);this._updateTitle();this._updateSubtitle();this.listItemElement.appendChild(this.titleElement);},get displayName()
{return this._displayName;},_updateDisplayName:function()
{this._displayName=this._titleText||"";if(this._subtitleText)
this._displayName+=" ("+this._subtitleText+")";},_updateTitle:function()
{this._updateDisplayName();if(!this.titleElement)
return;this._titleTextNode.textContent=this._titleText||"";},_updateSubtitle:function()
{this._updateDisplayName();if(!this.titleElement)
return;if(this._subtitleText){if(!this._subtitleElement){this._subtitleElement=document.createElement("span");this._subtitleElement.className="base-storage-tree-element-subtitle";this.titleElement.appendChild(this._subtitleElement);}
this._subtitleElement.textContent="("+this._subtitleText+")";}else if(this._subtitleElement){this.titleElement.removeChild(this._subtitleElement);delete this._subtitleElement;}},onselect:function(selectedByUser)
{if(!selectedByUser)
return false;var itemURL=this.itemURL;if(itemURL)
WebInspector.settings.resourcesLastSelectedItem.set(itemURL);return false;},onreveal:function()
{if(this.listItemElement)
this.listItemElement.scrollIntoViewIfNeeded(false);},get titleText()
{return this._titleText;},set titleText(titleText)
{this._titleText=titleText;this._updateTitle();},get subtitleText()
{return this._subtitleText;},set subtitleText(subtitleText)
{this._subtitleText=subtitleText;this._updateSubtitle();},__proto__:TreeElement.prototype}
WebInspector.StorageCategoryTreeElement=function(storagePanel,categoryName,settingsKey,iconClasses,noIcon)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,categoryName,iconClasses,false,noIcon);this._expandedSettingKey="resources"+settingsKey+"Expanded";WebInspector.settings[this._expandedSettingKey]=WebInspector.settings.createSetting(this._expandedSettingKey,settingsKey==="Frames");this._categoryName=categoryName;this._target=(WebInspector.targetManager.activeTarget());}
WebInspector.StorageCategoryTreeElement.prototype={target:function()
{return this._target;},get itemURL()
{return"category://"+this._categoryName;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showCategoryView(this._categoryName);return false;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);if(WebInspector.settings[this._expandedSettingKey].get())
this.expand();},onexpand:function()
{WebInspector.settings[this._expandedSettingKey].set(true);},oncollapse:function()
{WebInspector.settings[this._expandedSettingKey].set(false);},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.FrameTreeElement=function(storagePanel,frame)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,"",["frame-storage-tree-item"]);this._frame=frame;this.frameNavigated(frame);}
WebInspector.FrameTreeElement.prototype={frameNavigated:function(frame)
{this.removeChildren();this._frameId=frame.id;this.titleText=frame.name;this.subtitleText=new WebInspector.ParsedURL(frame.url).displayName;this._categoryElements={};this._treeElementForResource={};this._storagePanel.addDocumentURL(frame.url);},get itemURL()
{return"frame://"+encodeURI(this.displayName);},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showCategoryView(this.displayName);this.listItemElement.classList.remove("hovered");DOMAgent.hideHighlight();return false;},set hovered(hovered)
{if(hovered){this.listItemElement.classList.add("hovered");DOMAgent.highlightFrame(this._frameId,WebInspector.Color.PageHighlight.Content.toProtocolRGBA(),WebInspector.Color.PageHighlight.ContentOutline.toProtocolRGBA());}else{this.listItemElement.classList.remove("hovered");DOMAgent.hideHighlight();}},appendResource:function(resource)
{if(resource.isHidden())
return;var categoryName=resource.type.name();var categoryElement=resource.type===WebInspector.resourceTypes.Document?this:this._categoryElements[categoryName];if(!categoryElement){categoryElement=new WebInspector.StorageCategoryTreeElement(this._storagePanel,resource.type.categoryTitle(),categoryName,null,true);this._categoryElements[resource.type.name()]=categoryElement;this._insertInPresentationOrder(this,categoryElement);}
var resourceTreeElement=new WebInspector.FrameResourceTreeElement(this._storagePanel,resource);this._insertInPresentationOrder(categoryElement,resourceTreeElement);this._treeElementForResource[resource.url]=resourceTreeElement;},resourceByURL:function(url)
{var treeElement=this._treeElementForResource[url];return treeElement?treeElement.representedObject:null;},appendChild:function(treeElement)
{this._insertInPresentationOrder(this,treeElement);},_insertInPresentationOrder:function(parentTreeElement,childTreeElement)
{function typeWeight(treeElement)
{if(treeElement instanceof WebInspector.StorageCategoryTreeElement)
return 2;if(treeElement instanceof WebInspector.FrameTreeElement)
return 1;return 3;}
function compare(treeElement1,treeElement2)
{var typeWeight1=typeWeight(treeElement1);var typeWeight2=typeWeight(treeElement2);var result;if(typeWeight1>typeWeight2)
result=1;else if(typeWeight1<typeWeight2)
result=-1;else{var title1=treeElement1.displayName||treeElement1.titleText;var title2=treeElement2.displayName||treeElement2.titleText;result=title1.localeCompare(title2);}
return result;}
var children=parentTreeElement.children;var i;for(i=0;i<children.length;++i){if(compare(childTreeElement,children[i])<0)
break;}
parentTreeElement.insertChild(childTreeElement,i);},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.FrameResourceTreeElement=function(storagePanel,resource)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,resource,resource.displayName,["resource-sidebar-tree-item","resources-type-"+resource.type.name()]);this._resource=resource;this._resource.addEventListener(WebInspector.Resource.Events.MessageAdded,this._consoleMessageAdded,this);this._resource.addEventListener(WebInspector.Resource.Events.MessagesCleared,this._consoleMessagesCleared,this);this.tooltip=resource.url;}
WebInspector.FrameResourceTreeElement.prototype={get itemURL()
{return this._resource.url;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel._showResourceView(this._resource);return false;},ondblclick:function(event)
{InspectorFrontendHost.openInNewTab(this._resource.url);return false;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);if(this._resource.type===WebInspector.resourceTypes.Image){var previewImage=document.createElement("img");previewImage.className="image-resource-icon-preview";this._resource.populateImageSource(previewImage);var iconElement=document.createElement("div");iconElement.className="icon";iconElement.appendChild(previewImage);this.listItemElement.replaceChild(iconElement,this.imageElement);}
this._statusElement=document.createElement("div");this._statusElement.className="status";this.listItemElement.insertBefore(this._statusElement,this.titleElement);this.listItemElement.draggable=true;this.listItemElement.addEventListener("dragstart",this._ondragstart.bind(this),false);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);this._updateErrorsAndWarningsBubbles();},_ondragstart:function(event)
{event.dataTransfer.setData("text/plain",this._resource.content);event.dataTransfer.effectAllowed="copy";return true;},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendApplicableItems(this._resource);contextMenu.show();},_setBubbleText:function(x)
{if(!this._bubbleElement){this._bubbleElement=document.createElement("div");this._bubbleElement.className="bubble";this._statusElement.appendChild(this._bubbleElement);}
this._bubbleElement.textContent=x;},_resetBubble:function()
{if(this._bubbleElement){this._bubbleElement.textContent="";this._bubbleElement.classList.remove("warning");this._bubbleElement.classList.remove("error");}},_updateErrorsAndWarningsBubbles:function()
{if(this._storagePanel.currentQuery)
return;this._resetBubble();if(this._resource.warnings||this._resource.errors)
this._setBubbleText(this._resource.warnings+this._resource.errors);if(this._resource.warnings)
this._bubbleElement.classList.add("warning");if(this._resource.errors)
this._bubbleElement.classList.add("error");},_consoleMessagesCleared:function()
{if(this._sourceView)
this._sourceView.clearMessages();this._updateErrorsAndWarningsBubbles();},_consoleMessageAdded:function(event)
{var msg=event.data;if(this._sourceView)
this._sourceView.addMessage(msg);this._updateErrorsAndWarningsBubbles();},sourceView:function()
{if(!this._sourceView){var sourceFrame=new WebInspector.ResourceSourceFrame(this._resource);sourceFrame.setHighlighterType(this._resource.canonicalMimeType());this._sourceView=sourceFrame;if(this._resource.messages){for(var i=0;i<this._resource.messages.length;i++)
this._sourceView.addMessage(this._resource.messages[i]);}}
return this._sourceView;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.DatabaseTreeElement=function(storagePanel,database)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,database.name,["database-storage-tree-item"],true);this._database=database;}
WebInspector.DatabaseTreeElement.prototype={get itemURL()
{return"database://"+encodeURI(this._database.name);},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel._showDatabase(this._database);return false;},onexpand:function()
{this._updateChildren();},_updateChildren:function()
{this.removeChildren();function tableNamesCallback(tableNames)
{var tableNamesLength=tableNames.length;for(var i=0;i<tableNamesLength;++i)
this.appendChild(new WebInspector.DatabaseTableTreeElement(this._storagePanel,this._database,tableNames[i]));}
this._database.getTableNames(tableNamesCallback.bind(this));},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.DatabaseTableTreeElement=function(storagePanel,database,tableName)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,tableName,["database-storage-tree-item"]);this._database=database;this._tableName=tableName;}
WebInspector.DatabaseTableTreeElement.prototype={get itemURL()
{return"database://"+encodeURI(this._database.name)+"/"+encodeURI(this._tableName);},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel._showDatabase(this._database,this._tableName);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.IndexedDBTreeElement=function(storagePanel)
{WebInspector.StorageCategoryTreeElement.call(this,storagePanel,WebInspector.UIString("IndexedDB"),"IndexedDB",["indexed-db-storage-tree-item"]);}
WebInspector.IndexedDBTreeElement.prototype={_initialize:function()
{this._createIndexedDBModel();},onattach:function()
{WebInspector.StorageCategoryTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Refresh IndexedDB"),this.refreshIndexedDB.bind(this));contextMenu.show();},_createIndexedDBModel:function()
{this._indexedDBModel=new WebInspector.IndexedDBModel(this.target());this._idbDatabaseTreeElements=[];this._indexedDBModel.addEventListener(WebInspector.IndexedDBModel.EventTypes.DatabaseAdded,this._indexedDBAdded,this);this._indexedDBModel.addEventListener(WebInspector.IndexedDBModel.EventTypes.DatabaseRemoved,this._indexedDBRemoved,this);this._indexedDBModel.addEventListener(WebInspector.IndexedDBModel.EventTypes.DatabaseLoaded,this._indexedDBLoaded,this);},refreshIndexedDB:function()
{if(!this._indexedDBModel){this._createIndexedDBModel();return;}
this._indexedDBModel.refreshDatabaseNames();},_indexedDBAdded:function(event)
{var databaseId=(event.data);var idbDatabaseTreeElement=new WebInspector.IDBDatabaseTreeElement(this._storagePanel,this._indexedDBModel,databaseId);this._idbDatabaseTreeElements.push(idbDatabaseTreeElement);this.appendChild(idbDatabaseTreeElement);this._indexedDBModel.refreshDatabase(databaseId);},_indexedDBRemoved:function(event)
{var databaseId=(event.data);var idbDatabaseTreeElement=this._idbDatabaseTreeElement(databaseId)
if(!idbDatabaseTreeElement)
return;idbDatabaseTreeElement.clear();this.removeChild(idbDatabaseTreeElement);this._idbDatabaseTreeElements.remove(idbDatabaseTreeElement);},_indexedDBLoaded:function(event)
{var database=(event.data);var idbDatabaseTreeElement=this._idbDatabaseTreeElement(database.databaseId)
if(!idbDatabaseTreeElement)
return;idbDatabaseTreeElement.update(database);},_idbDatabaseTreeElement:function(databaseId)
{var index=-1;for(var i=0;i<this._idbDatabaseTreeElements.length;++i){if(this._idbDatabaseTreeElements[i]._databaseId.equals(databaseId)){index=i;break;}}
if(index!==-1)
return this._idbDatabaseTreeElements[i];return null;},__proto__:WebInspector.StorageCategoryTreeElement.prototype}
WebInspector.FileSystemListTreeElement=function(storagePanel)
{WebInspector.StorageCategoryTreeElement.call(this,storagePanel,WebInspector.UIString("FileSystem"),"FileSystem",["file-system-storage-tree-item"]);}
WebInspector.FileSystemListTreeElement.prototype={_initialize:function()
{this._refreshFileSystem();},onattach:function()
{WebInspector.StorageCategoryTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles()?"Refresh FileSystem list":"Refresh FileSystem List"),this._refreshFileSystem.bind(this));contextMenu.show();},_fileSystemAdded:function(event)
{var fileSystem=(event.data);var fileSystemTreeElement=new WebInspector.FileSystemTreeElement(this._storagePanel,fileSystem);this.appendChild(fileSystemTreeElement);},_fileSystemRemoved:function(event)
{var fileSystem=(event.data);var fileSystemTreeElement=this._fileSystemTreeElementByName(fileSystem.name);if(!fileSystemTreeElement)
return;fileSystemTreeElement.clear();this.removeChild(fileSystemTreeElement);},_fileSystemTreeElementByName:function(fileSystemName)
{for(var i=0;i<this.children.length;++i){var child=(this.children[i]);if(child.fileSystemName===fileSystemName)
return this.children[i];}
return null;},_refreshFileSystem:function()
{if(!this._fileSystemModel){this._fileSystemModel=new WebInspector.FileSystemModel(this.target());this._fileSystemModel.addEventListener(WebInspector.FileSystemModel.EventTypes.FileSystemAdded,this._fileSystemAdded,this);this._fileSystemModel.addEventListener(WebInspector.FileSystemModel.EventTypes.FileSystemRemoved,this._fileSystemRemoved,this);}
this._fileSystemModel.refreshFileSystemList();},__proto__:WebInspector.StorageCategoryTreeElement.prototype}
WebInspector.IDBDatabaseTreeElement=function(storagePanel,model,databaseId)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,databaseId.name+" - "+databaseId.securityOrigin,["indexed-db-storage-tree-item"]);this._model=model;this._databaseId=databaseId;this._idbObjectStoreTreeElements={};}
WebInspector.IDBDatabaseTreeElement.prototype={get itemURL()
{return"indexedDB://"+this._databaseId.securityOrigin+"/"+this._databaseId.name;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Refresh IndexedDB"),this._refreshIndexedDB.bind(this));contextMenu.show();},_refreshIndexedDB:function()
{this._model.refreshDatabaseNames();},update:function(database)
{this._database=database;var objectStoreNames={};for(var objectStoreName in this._database.objectStores){var objectStore=this._database.objectStores[objectStoreName];objectStoreNames[objectStore.name]=true;if(!this._idbObjectStoreTreeElements[objectStore.name]){var idbObjectStoreTreeElement=new WebInspector.IDBObjectStoreTreeElement(this._storagePanel,this._model,this._databaseId,objectStore);this._idbObjectStoreTreeElements[objectStore.name]=idbObjectStoreTreeElement;this.appendChild(idbObjectStoreTreeElement);}
this._idbObjectStoreTreeElements[objectStore.name].update(objectStore);}
for(var objectStoreName in this._idbObjectStoreTreeElements){if(!objectStoreNames[objectStoreName])
this._objectStoreRemoved(objectStoreName);}
if(this.children.length){this.hasChildren=true;this.expand();}
if(this._view)
this._view.update(database);this._updateTooltip();},_updateTooltip:function()
{this.tooltip=WebInspector.UIString("Version")+": "+this._database.version;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.IDBDatabaseView(this._database);this._storagePanel.showIndexedDB(this._view);return false;},_objectStoreRemoved:function(objectStoreName)
{var objectStoreTreeElement=this._idbObjectStoreTreeElements[objectStoreName];objectStoreTreeElement.clear();this.removeChild(objectStoreTreeElement);delete this._idbObjectStoreTreeElements[objectStoreName];},clear:function()
{for(var objectStoreName in this._idbObjectStoreTreeElements)
this._objectStoreRemoved(objectStoreName);},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.IDBObjectStoreTreeElement=function(storagePanel,model,databaseId,objectStore)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,objectStore.name,["indexed-db-object-store-storage-tree-item"]);this._model=model;this._databaseId=databaseId;this._idbIndexTreeElements={};}
WebInspector.IDBObjectStoreTreeElement.prototype={get itemURL()
{return"indexedDB://"+this._databaseId.securityOrigin+"/"+this._databaseId.name+"/"+this._objectStore.name;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Clear"),this._clearObjectStore.bind(this));contextMenu.show();},_clearObjectStore:function()
{function callback(){this.update(this._objectStore);}
this._model.clearObjectStore(this._databaseId,this._objectStore.name,callback.bind(this));},update:function(objectStore)
{this._objectStore=objectStore;var indexNames={};for(var indexName in this._objectStore.indexes){var index=this._objectStore.indexes[indexName];indexNames[index.name]=true;if(!this._idbIndexTreeElements[index.name]){var idbIndexTreeElement=new WebInspector.IDBIndexTreeElement(this._storagePanel,this._model,this._databaseId,this._objectStore,index);this._idbIndexTreeElements[index.name]=idbIndexTreeElement;this.appendChild(idbIndexTreeElement);}
this._idbIndexTreeElements[index.name].update(index);}
for(var indexName in this._idbIndexTreeElements){if(!indexNames[indexName])
this._indexRemoved(indexName);}
for(var indexName in this._idbIndexTreeElements){if(!indexNames[indexName]){this.removeChild(this._idbIndexTreeElements[indexName]);delete this._idbIndexTreeElements[indexName];}}
if(this.children.length){this.hasChildren=true;this.expand();}
if(this._view)
this._view.update(this._objectStore);this._updateTooltip();},_updateTooltip:function()
{var keyPathString=this._objectStore.keyPathString;var tooltipString=keyPathString!==null?(WebInspector.UIString("Key path: ")+keyPathString):"";if(this._objectStore.autoIncrement)
tooltipString+="\n"+WebInspector.UIString("autoIncrement");this.tooltip=tooltipString},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.IDBDataView(this._model,this._databaseId,this._objectStore,null);this._storagePanel.showIndexedDB(this._view);return false;},_indexRemoved:function(indexName)
{var indexTreeElement=this._idbIndexTreeElements[indexName];indexTreeElement.clear();this.removeChild(indexTreeElement);delete this._idbIndexTreeElements[indexName];},clear:function()
{for(var indexName in this._idbIndexTreeElements)
this._indexRemoved(indexName);if(this._view)
this._view.clear();},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.IDBIndexTreeElement=function(storagePanel,model,databaseId,objectStore,index)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,index.name,["indexed-db-index-storage-tree-item"]);this._model=model;this._databaseId=databaseId;this._objectStore=objectStore;this._index=index;}
WebInspector.IDBIndexTreeElement.prototype={get itemURL()
{return"indexedDB://"+this._databaseId.securityOrigin+"/"+this._databaseId.name+"/"+this._objectStore.name+"/"+this._index.name;},update:function(index)
{this._index=index;if(this._view)
this._view.update(this._index);this._updateTooltip();},_updateTooltip:function()
{var tooltipLines=[];var keyPathString=this._index.keyPathString;tooltipLines.push(WebInspector.UIString("Key path: ")+keyPathString);if(this._index.unique)
tooltipLines.push(WebInspector.UIString("unique"));if(this._index.multiEntry)
tooltipLines.push(WebInspector.UIString("multiEntry"));this.tooltip=tooltipLines.join("\n");},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.IDBDataView(this._model,this._databaseId,this._objectStore,this._index);this._storagePanel.showIndexedDB(this._view);return false;},clear:function()
{if(this._view)
this._view.clear();},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.DOMStorageTreeElement=function(storagePanel,domStorage,className)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,domStorage.securityOrigin?domStorage.securityOrigin:WebInspector.UIString("Local Files"),["domstorage-storage-tree-item",className]);this._domStorage=domStorage;}
WebInspector.DOMStorageTreeElement.prototype={get itemURL()
{return"storage://"+this._domStorage.securityOrigin+"/"+(this._domStorage.isLocalStorage?"local":"session");},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel._showDOMStorage(this._domStorage);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.CookieTreeElement=function(storagePanel,cookieDomain)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,cookieDomain?cookieDomain:WebInspector.UIString("Local Files"),["cookie-storage-tree-item"]);this._cookieDomain=cookieDomain;}
WebInspector.CookieTreeElement.prototype={get itemURL()
{return"cookies://"+this._cookieDomain;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Clear"),this._clearCookies.bind(this));contextMenu.show();},_clearCookies:function(domain)
{this._storagePanel.clearCookies(this._cookieDomain);},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showCookies(this,this._cookieDomain);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.ApplicationCacheManifestTreeElement=function(storagePanel,manifestURL)
{var title=new WebInspector.ParsedURL(manifestURL).displayName;WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,title,["application-cache-storage-tree-item"]);this.tooltip=manifestURL;this._manifestURL=manifestURL;}
WebInspector.ApplicationCacheManifestTreeElement.prototype={get itemURL()
{return"appcache://"+this._manifestURL;},get manifestURL()
{return this._manifestURL;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showCategoryView(this._manifestURL);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.ApplicationCacheFrameTreeElement=function(storagePanel,frameId,manifestURL)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,"",["frame-storage-tree-item"]);this._frameId=frameId;this._manifestURL=manifestURL;this._refreshTitles();}
WebInspector.ApplicationCacheFrameTreeElement.prototype={get itemURL()
{return"appcache://"+this._manifestURL+"/"+encodeURI(this.displayName);},get frameId()
{return this._frameId;},get manifestURL()
{return this._manifestURL;},_refreshTitles:function()
{var frame=WebInspector.resourceTreeModel.frameForId(this._frameId);if(!frame){this.subtitleText=WebInspector.UIString("new frame");return;}
this.titleText=frame.name;this.subtitleText=new WebInspector.ParsedURL(frame.url).displayName;},frameNavigated:function()
{this._refreshTitles();},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showApplicationCache(this._frameId);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.FileSystemTreeElement=function(storagePanel,fileSystem)
{var displayName=fileSystem.type+" - "+fileSystem.origin;WebInspector.BaseStorageTreeElement.call(this,storagePanel,null,displayName,["file-system-storage-tree-item"]);this._fileSystem=fileSystem;}
WebInspector.FileSystemTreeElement.prototype={get fileSystemName()
{return this._fileSystem.name;},get itemURL()
{return"filesystem://"+this._fileSystem.name;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._fileSystemView=new WebInspector.FileSystemView(this._fileSystem);this._storagePanel.showFileSystem(this._fileSystemView);return false;},clear:function()
{if(this.fileSystemView&&this._storagePanel.visibleView===this.fileSystemView)
this._storagePanel.closeVisibleView();},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.StorageCategoryView=function()
{WebInspector.VBox.call(this);this.element.classList.add("storage-view");this._emptyView=new WebInspector.EmptyView("");this._emptyView.show(this.element);}
WebInspector.StorageCategoryView.prototype={setText:function(text)
{this._emptyView.text=text;},__proto__:WebInspector.VBox.prototype}