WebInspector.AppManifestView=function()
{WebInspector.VBox.call(this,true);this.registerRequiredCSS("resources/appManifestView.css");this._reportView=new WebInspector.ReportView(WebInspector.UIString("App Manifest"));this._reportView.show(this.contentElement);this._errorsSection=this._reportView.appendSection(WebInspector.UIString("Errors and warnings"));this._identitySection=this._reportView.appendSection(WebInspector.UIString("Identity"));var toolbar=this._identitySection.createToolbar();toolbar.renderAsLinks();var addToHomeScreen=new WebInspector.ToolbarButton(WebInspector.UIString("Add to homescreen"),undefined,WebInspector.UIString("Add to homescreen"));addToHomeScreen.addEventListener("click",this._addToHomescreen.bind(this));toolbar.appendToolbarItem(addToHomeScreen);this._presentationSection=this._reportView.appendSection(WebInspector.UIString("Presentation"));this._iconsSection=this._reportView.appendSection(WebInspector.UIString("Icons"));this._nameField=this._identitySection.appendField(WebInspector.UIString("Name"));this._shortNameField=this._identitySection.appendField(WebInspector.UIString("Short name"));this._startURLField=this._presentationSection.appendField(WebInspector.UIString("Start URL"));var themeColorField=this._presentationSection.appendField(WebInspector.UIString("Theme color"));this._themeColorSwatch=WebInspector.ColorSwatch.create();themeColorField.appendChild(this._themeColorSwatch);var backgroundColorField=this._presentationSection.appendField(WebInspector.UIString("Background color"));this._backgroundColorSwatch=WebInspector.ColorSwatch.create();backgroundColorField.appendChild(this._backgroundColorSwatch);this._orientationField=this._presentationSection.appendField(WebInspector.UIString("Orientation"));this._displayField=this._presentationSection.appendField(WebInspector.UIString("Display"));WebInspector.targetManager.observeTargets(this);}
WebInspector.AppManifestView.prototype={targetAdded:function(target)
{if(this._target)
return;this._target=target;this._updateManifest();WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.MainFrameNavigated,this._updateManifest,this);},targetRemoved:function(target)
{},_updateManifest:function()
{this._target.resourceTreeModel.fetchAppManifest(this._renderManifest.bind(this));},_renderManifest:function(url,data,errors)
{this._reportView.setURL(url);this._errorsSection.clearContent();this._errorsSection.element.classList.toggle("hidden",!errors.length);for(var error of errors)
this._errorsSection.appendRow().appendChild(createLabel(error.message,error.critical?"error-icon":"warning-icon"));if(!data)
data="{}";var parsedManifest=JSON.parse(data);this._nameField.textContent=stringProperty("name");this._shortNameField.textContent=stringProperty("short_name");this._startURLField.removeChildren();var startURL=stringProperty("start_url");if(startURL)
this._startURLField.appendChild(WebInspector.linkifyResourceAsNode((WebInspector.ParsedURL.completeURL(url,startURL)),undefined,undefined,undefined,undefined,startURL));this._themeColorSwatch.classList.toggle("hidden",!stringProperty("theme_color"));this._themeColorSwatch.setColorText(stringProperty("theme_color")||"white");this._backgroundColorSwatch.classList.toggle("hidden",!stringProperty("background_color"));this._backgroundColorSwatch.setColorText(stringProperty("background_color")||"white");this._orientationField.textContent=stringProperty("orientation");this._displayField.textContent=stringProperty("display");var icons=parsedManifest["icons"]||[];this._iconsSection.clearContent();for(var icon of icons){var title=(icon["sizes"]||"")+"\n"+(icon["type"]||"");var field=this._iconsSection.appendField(title);var imageElement=field.createChild("img");imageElement.style.maxWidth="200px";imageElement.style.maxHeight="200px";imageElement.src=WebInspector.ParsedURL.completeURL(url,icon["src"]);}
function stringProperty(name)
{var value=parsedManifest[name];if(typeof value!=="string")
return"";return value;}},_addToHomescreen:function()
{var target=WebInspector.targetManager.mainTarget();if(target&&target.isPage()){target.pageAgent().requestAppBanner();WebInspector.console.show();}},__proto__:WebInspector.VBox.prototype};WebInspector.ApplicationCacheItemsView=function(model,frameId)
{WebInspector.VBox.call(this);this._model=model;this.element.classList.add("storage-view","table");this._deleteButton=new WebInspector.ToolbarButton(WebInspector.UIString("Delete"),"delete-toolbar-item");this._deleteButton.setVisible(false);this._deleteButton.addEventListener("click",this._deleteButtonClicked,this);this._connectivityIcon=createElement("label","dt-icon-label");this._connectivityIcon.style.margin="0 2px 0 5px";this._statusIcon=createElement("label","dt-icon-label");this._statusIcon.style.margin="0 2px 0 5px";this._frameId=frameId;this._emptyWidget=new WebInspector.EmptyWidget(WebInspector.UIString("No Application Cache information available."));this._emptyWidget.show(this.element);this._markDirty();var status=this._model.frameManifestStatus(frameId);this.updateStatus(status);this.updateNetworkState(this._model.onLine);this._deleteButton.element.style.display="none";}
WebInspector.ApplicationCacheItemsView.prototype={toolbarItems:function()
{return[this._deleteButton,new WebInspector.ToolbarItem(this._connectivityIcon),new WebInspector.ToolbarSeparator(),new WebInspector.ToolbarItem(this._statusIcon)];},wasShown:function()
{this._maybeUpdate();},willHide:function()
{this._deleteButton.setVisible(false);},_maybeUpdate:function()
{if(!this.isShowing()||!this._viewDirty)
return;this._update();this._viewDirty=false;},_markDirty:function()
{this._viewDirty=true;},updateStatus:function(status)
{var oldStatus=this._status;this._status=status;var statusInformation={};statusInformation[applicationCache.UNCACHED]={type:"red-ball",text:"UNCACHED"};statusInformation[applicationCache.IDLE]={type:"green-ball",text:"IDLE"};statusInformation[applicationCache.CHECKING]={type:"orange-ball",text:"CHECKING"};statusInformation[applicationCache.DOWNLOADING]={type:"orange-ball",text:"DOWNLOADING"};statusInformation[applicationCache.UPDATEREADY]={type:"green-ball",text:"UPDATEREADY"};statusInformation[applicationCache.OBSOLETE]={type:"red-ball",text:"OBSOLETE"};var info=statusInformation[status]||statusInformation[applicationCache.UNCACHED];this._statusIcon.type=info.type;this._statusIcon.textContent=info.text;if(this.isShowing()&&this._status===applicationCache.IDLE&&(oldStatus===applicationCache.UPDATEREADY||!this._resources))
this._markDirty();this._maybeUpdate();},updateNetworkState:function(isNowOnline)
{if(isNowOnline){this._connectivityIcon.type="green-ball";this._connectivityIcon.textContent=WebInspector.UIString("Online");}else{this._connectivityIcon.type="red-ball";this._connectivityIcon.textContent=WebInspector.UIString("Offline");}},_update:function()
{this._model.requestApplicationCache(this._frameId,this._updateCallback.bind(this));},_updateCallback:function(applicationCache)
{if(!applicationCache||!applicationCache.manifestURL){delete this._manifest;delete this._creationTime;delete this._updateTime;delete this._size;delete this._resources;this._emptyWidget.show(this.element);this._deleteButton.setVisible(false);if(this._dataGrid)
this._dataGrid.element.classList.add("hidden");return;}
this._manifest=applicationCache.manifestURL;this._creationTime=applicationCache.creationTime;this._updateTime=applicationCache.updateTime;this._size=applicationCache.size;this._resources=applicationCache.resources;if(!this._dataGrid)
this._createDataGrid();this._populateDataGrid();this._dataGrid.autoSizeColumns(20,80);this._dataGrid.element.classList.remove("hidden");this._emptyWidget.detach();this._deleteButton.setVisible(true);},_createDataGrid:function()
{var columns=[{title:WebInspector.UIString("Resource"),sort:WebInspector.DataGrid.Order.Ascending,sortable:true},{title:WebInspector.UIString("Type"),sortable:true},{title:WebInspector.UIString("Size"),align:WebInspector.DataGrid.Align.Right,sortable:true}];this._dataGrid=new WebInspector.DataGrid(columns);this._dataGrid.asWidget().show(this.element);this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged,this._populateDataGrid,this);},_populateDataGrid:function()
{var selectedResource=this._dataGrid.selectedNode?this._dataGrid.selectedNode.resource:null;var sortDirection=this._dataGrid.isSortOrderAscending()?1:-1;function numberCompare(field,resource1,resource2)
{return sortDirection*(resource1[field]-resource2[field]);}
function localeCompare(field,resource1,resource2)
{return sortDirection*(resource1[field]+"").localeCompare(resource2[field]+"");}
var comparator;switch(parseInt(this._dataGrid.sortColumnIdentifier(),10)){case 0:comparator=localeCompare.bind(null,"name");break;case 1:comparator=localeCompare.bind(null,"type");break;case 2:comparator=numberCompare.bind(null,"size");break;default:localeCompare.bind(null,"resource");}
this._resources.sort(comparator);this._dataGrid.rootNode().removeChildren();var nodeToSelect;for(var i=0;i<this._resources.length;++i){var data={};var resource=this._resources[i];data[0]=resource.url;data[1]=resource.type;data[2]=Number.bytesToString(resource.size);var node=new WebInspector.DataGridNode(data);node.resource=resource;node.selectable=true;this._dataGrid.rootNode().appendChild(node);if(resource===selectedResource){nodeToSelect=node;nodeToSelect.selected=true;}}
if(!nodeToSelect&&this._dataGrid.rootNode().children.length)
this._dataGrid.rootNode().children[0].selected=true;},_deleteButtonClicked:function(event)
{if(!this._dataGrid||!this._dataGrid.selectedNode)
return;this._deleteCallback(this._dataGrid.selectedNode);},_deleteCallback:function(node)
{},__proto__:WebInspector.VBox.prototype};WebInspector.ClearStorageView=function(resourcesPanel)
{WebInspector.VBox.call(this,true);this._resourcesPanel=resourcesPanel;this._reportView=new WebInspector.ReportView(WebInspector.UIString("Clear storage"));this._reportView.registerRequiredCSS("resources/clearStorageView.css");this._reportView.element.classList.add("clear-storage-header");this._reportView.show(this.contentElement);this._settings=new Map();for(var type of[StorageAgent.StorageType.Appcache,StorageAgent.StorageType.Cache_storage,StorageAgent.StorageType.Cookies,StorageAgent.StorageType.Indexeddb,StorageAgent.StorageType.Local_storage,StorageAgent.StorageType.Service_workers,StorageAgent.StorageType.Websql]){this._settings.set(type,WebInspector.settings.createSetting("clear-storage-"+type,true));}
var application=this._reportView.appendSection(WebInspector.UIString("Application"));this._appendItem(application,WebInspector.UIString("Unregister service workers"),"service_workers");var storage=this._reportView.appendSection(WebInspector.UIString("Storage"));this._appendItem(storage,WebInspector.UIString("Local and session storage"),"local_storage");this._appendItem(storage,WebInspector.UIString("Indexed DB"),"indexeddb");this._appendItem(storage,WebInspector.UIString("Web SQL"),"websql");this._appendItem(storage,WebInspector.UIString("Cookies"),"cookies");var caches=this._reportView.appendSection(WebInspector.UIString("Cache"));this._appendItem(caches,WebInspector.UIString("Cache storage"),"cache_storage");this._appendItem(caches,WebInspector.UIString("Application cache"),"appcache");WebInspector.targetManager.observeTargets(this);var footer=this._reportView.appendSection("","clear-storage-button").appendRow();this._clearButton=createTextButton(WebInspector.UIString("Clear selected"),this._clear.bind(this),WebInspector.UIString("Clear selected"));footer.appendChild(this._clearButton);}
WebInspector.ClearStorageView.prototype={_appendItem:function(section,title,settingName)
{var row=section.appendRow();row.appendChild(WebInspector.SettingsUI.createSettingCheckbox(title,this._settings.get(settingName),true));},targetAdded:function(target)
{if(this._target)
return;this._target=target;this._updateOrigin(target.resourceTreeModel.mainFrame?target.resourceTreeModel.mainFrame.url:"");WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.MainFrameNavigated,this._updateFrame,this);},_updateFrame:function(event)
{var frame=(event.data);this._updateOrigin(frame.url);},_updateOrigin:function(url)
{this._securityOrigin=new WebInspector.ParsedURL(url).securityOrigin();this._reportView.setSubtitle(this._securityOrigin);},_clear:function()
{var storageTypes=[];for(var type of this._settings.keys()){if(this._settings.get(type).get())
storageTypes.push(type);}
this._target.storageAgent().clearDataForOrigin(this._securityOrigin,storageTypes.join(","));var set=new Set(storageTypes);var hasAll=set.has(StorageAgent.StorageType.All);if(set.has(StorageAgent.StorageType.Cookies)||hasAll)
this._resourcesPanel.clearCookies(this._securityOrigin);if(set.has(StorageAgent.StorageType.Indexeddb)||hasAll){for(var target of WebInspector.targetManager.targets()){var indexedDBModel=WebInspector.IndexedDBModel.fromTarget(target);if(indexedDBModel)
indexedDBModel.clearForOrigin(this._securityOrigin);}}
if(set.has(StorageAgent.StorageType.Local_storage)||hasAll){var storageModel=WebInspector.DOMStorageModel.fromTarget(this._target);if(storageModel)
storageModel.clearForOrigin(this._securityOrigin);}
if(set.has(StorageAgent.StorageType.Websql)||hasAll){var databaseModel=WebInspector.DatabaseModel.fromTarget(this._target);if(databaseModel){databaseModel.disable();databaseModel.enable();}}
if(set.has(StorageAgent.StorageType.Cache_storage)||hasAll){for(var target of WebInspector.targetManager.targets()){var model=WebInspector.ServiceWorkerCacheModel.fromTarget(target);if(model)
model.clearForOrigin(this._securityOrigin);}}
if(set.has(StorageAgent.StorageType.Appcache)||hasAll){var appcacheModel=WebInspector.ApplicationCacheModel.fromTarget(this._target);if(appcacheModel)
appcacheModel.reset();}
this._clearButton.disabled=true;this._clearButton.textContent=WebInspector.UIString("Clearing...");setTimeout(()=>{this._clearButton.disabled=false;this._clearButton.textContent=WebInspector.UIString("Clear selected");},500);},targetRemoved:function(target)
{},__proto__:WebInspector.VBox.prototype};WebInspector.CookieItemsView=function(treeElement,cookieDomain)
{WebInspector.VBox.call(this);this.element.classList.add("storage-view");this._deleteButton=new WebInspector.ToolbarButton(WebInspector.UIString("Delete"),"delete-toolbar-item");this._deleteButton.setVisible(false);this._deleteButton.addEventListener("click",this._deleteButtonClicked,this);this._clearButton=new WebInspector.ToolbarButton(WebInspector.UIString("Clear"),"clear-toolbar-item");this._clearButton.setVisible(false);this._clearButton.addEventListener("click",this._clearButtonClicked,this);this._refreshButton=new WebInspector.ToolbarButton(WebInspector.UIString("Refresh"),"refresh-toolbar-item");this._refreshButton.addEventListener("click",this._refreshButtonClicked,this);this._treeElement=treeElement;this._cookieDomain=cookieDomain;this._emptyWidget=new WebInspector.EmptyWidget(cookieDomain?WebInspector.UIString("This site has no cookies."):WebInspector.UIString("By default cookies are disabled for local files.\nYou could override this by starting the browser with --enable-file-cookies command line flag."));this._emptyWidget.show(this.element);this.element.addEventListener("contextmenu",this._contextMenu.bind(this),true);}
WebInspector.CookieItemsView.prototype={toolbarItems:function()
{return[this._refreshButton,this._clearButton,this._deleteButton];},wasShown:function()
{this._update();},willHide:function()
{this._deleteButton.setVisible(false);},_update:function()
{WebInspector.Cookies.getCookiesAsync(this._updateWithCookies.bind(this));},_updateWithCookies:function(allCookies)
{this._cookies=this._filterCookiesForDomain(allCookies);if(!this._cookies.length){this._emptyWidget.show(this.element);this._clearButton.setVisible(false);this._deleteButton.setVisible(false);if(this._cookiesTable)
this._cookiesTable.detach();return;}
if(!this._cookiesTable)
this._cookiesTable=new WebInspector.CookiesTable(false,this._update.bind(this),this._showDeleteButton.bind(this));this._cookiesTable.setCookies(this._cookies);this._emptyWidget.detach();this._cookiesTable.show(this.element);this._treeElement.subtitle=String.sprintf(WebInspector.UIString("%d cookies (%s)"),this._cookies.length,Number.bytesToString(this._totalSize));this._clearButton.setVisible(true);this._deleteButton.setVisible(!!this._cookiesTable.selectedCookie());},_filterCookiesForDomain:function(allCookies)
{var cookies=[];var resourceURLsForDocumentURL=[];this._totalSize=0;function populateResourcesForDocuments(resource)
{var url=resource.documentURL.asParsedURL();if(url&&url.securityOrigin()==this._cookieDomain)
resourceURLsForDocumentURL.push(resource.url);}
WebInspector.forAllResources(populateResourcesForDocuments.bind(this));for(var i=0;i<allCookies.length;++i){var pushed=false;var size=allCookies[i].size();for(var j=0;j<resourceURLsForDocumentURL.length;++j){var resourceURL=resourceURLsForDocumentURL[j];if(WebInspector.Cookies.cookieMatchesResourceURL(allCookies[i],resourceURL)){this._totalSize+=size;if(!pushed){pushed=true;cookies.push(allCookies[i]);}}}}
return cookies;},clear:function()
{this._cookiesTable.clear();this._update();},_clearButtonClicked:function()
{this.clear();},_showDeleteButton:function()
{this._deleteButton.setVisible(true);},_deleteButtonClicked:function()
{var selectedCookie=this._cookiesTable.selectedCookie();if(selectedCookie){selectedCookie.remove();this._update();}},_refreshButtonClicked:function(event)
{this._update();},_contextMenu:function(event)
{if(!this._cookies.length){var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Refresh"),this._update.bind(this));contextMenu.show();}},__proto__:WebInspector.VBox.prototype};WebInspector.Database=function(model,id,domain,name,version)
{this._model=model;this._id=id;this._domain=domain;this._name=name;this._version=version;}
WebInspector.Database.prototype={get id()
{return this._id;},get name()
{return this._name;},set name(x)
{this._name=x;},get version()
{return this._version;},set version(x)
{this._version=x;},get domain()
{return this._domain;},set domain(x)
{this._domain=x;},getTableNames:function(callback)
{function sortingCallback(error,names)
{if(!error)
callback(names.sort());}
this._model._agent.getDatabaseTableNames(this._id,sortingCallback);},executeSql:function(query,onSuccess,onError)
{function callback(error,columnNames,values,errorObj)
{if(error){onError(error);return;}
if(errorObj){var message;if(errorObj.message)
message=errorObj.message;else if(errorObj.code==2)
message=WebInspector.UIString("Database no longer has expected version.");else
message=WebInspector.UIString("An unexpected error %s occurred.",errorObj.code);onError(message);return;}
onSuccess(columnNames,values);}
this._model._agent.executeSQL(this._id,query,callback);}}
WebInspector.DatabaseModel=function(target)
{WebInspector.SDKModel.call(this,WebInspector.DatabaseModel,target);this._databases=[];this._agent=target.databaseAgent();this.target().registerDatabaseDispatcher(new WebInspector.DatabaseDispatcher(this));}
WebInspector.DatabaseModel.Events={DatabaseAdded:"DatabaseAdded",DatabasesRemoved:"DatabasesRemoved"}
WebInspector.DatabaseModel.prototype={enable:function()
{if(this._enabled)
return;this._agent.enable();this._enabled=true;},disable:function()
{if(!this._enabled)
return;this._enabled=false;this._databases=[];this._agent.disable();this.dispatchEventToListeners(WebInspector.DatabaseModel.Events.DatabasesRemoved);},databases:function()
{var result=[];for(var database of this._databases)
result.push(database);return result;},_addDatabase:function(database)
{this._databases.push(database);this.dispatchEventToListeners(WebInspector.DatabaseModel.Events.DatabaseAdded,database);},__proto__:WebInspector.SDKModel.prototype}
WebInspector.DatabaseDispatcher=function(model)
{this._model=model;}
WebInspector.DatabaseDispatcher.prototype={addDatabase:function(payload)
{this._model._addDatabase(new WebInspector.Database(this._model,payload.id,payload.domain,payload.name,payload.version));}}
WebInspector.DatabaseModel._symbol=Symbol("DatabaseModel");WebInspector.DatabaseModel.fromTarget=function(target)
{if(!target[WebInspector.DatabaseModel._symbol])
target[WebInspector.DatabaseModel._symbol]=new WebInspector.DatabaseModel(target);return target[WebInspector.DatabaseModel._symbol];};WebInspector.DOMStorage=function(model,securityOrigin,isLocalStorage)
{this._model=model;this._securityOrigin=securityOrigin;this._isLocalStorage=isLocalStorage;}
WebInspector.DOMStorage.storageId=function(securityOrigin,isLocalStorage)
{return{securityOrigin:securityOrigin,isLocalStorage:isLocalStorage};}
WebInspector.DOMStorage.Events={DOMStorageItemsCleared:"DOMStorageItemsCleared",DOMStorageItemRemoved:"DOMStorageItemRemoved",DOMStorageItemAdded:"DOMStorageItemAdded",DOMStorageItemUpdated:"DOMStorageItemUpdated"}
WebInspector.DOMStorage.prototype={get id()
{return WebInspector.DOMStorage.storageId(this._securityOrigin,this._isLocalStorage);},get securityOrigin()
{return this._securityOrigin;},get isLocalStorage()
{return this._isLocalStorage;},getItems:function(callback)
{this._model._agent.getDOMStorageItems(this.id,callback);},setItem:function(key,value)
{this._model._agent.setDOMStorageItem(this.id,key,value);},removeItem:function(key)
{this._model._agent.removeDOMStorageItem(this.id,key);},__proto__:WebInspector.Object.prototype}
WebInspector.DOMStorageModel=function(target)
{WebInspector.SDKModel.call(this,WebInspector.DOMStorageModel,target);this._storages={};this._agent=target.domstorageAgent();}
WebInspector.DOMStorageModel.Events={DOMStorageAdded:"DOMStorageAdded",DOMStorageRemoved:"DOMStorageRemoved"}
WebInspector.DOMStorageModel.prototype={enable:function()
{if(this._enabled)
return;this.target().registerDOMStorageDispatcher(new WebInspector.DOMStorageDispatcher(this));this.target().resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginAdded,this._securityOriginAdded,this);this.target().resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginRemoved,this._securityOriginRemoved,this);this._agent.enable();var securityOrigins=this.target().resourceTreeModel.securityOrigins();for(var i=0;i<securityOrigins.length;++i)
this._addOrigin(securityOrigins[i]);this._enabled=true;},clearForOrigin:function(origin)
{if(!this._enabled)
return;this._removeOrigin(origin);this._addOrigin(origin);},_securityOriginAdded:function(event)
{this._addOrigin((event.data));},_addOrigin:function(securityOrigin)
{var localStorageKey=this._storageKey(securityOrigin,true);console.assert(!this._storages[localStorageKey]);var localStorage=new WebInspector.DOMStorage(this,securityOrigin,true);this._storages[localStorageKey]=localStorage;this.dispatchEventToListeners(WebInspector.DOMStorageModel.Events.DOMStorageAdded,localStorage);var sessionStorageKey=this._storageKey(securityOrigin,false);console.assert(!this._storages[sessionStorageKey]);var sessionStorage=new WebInspector.DOMStorage(this,securityOrigin,false);this._storages[sessionStorageKey]=sessionStorage;this.dispatchEventToListeners(WebInspector.DOMStorageModel.Events.DOMStorageAdded,sessionStorage);},_securityOriginRemoved:function(event)
{this._removeOrigin((event.data));},_removeOrigin:function(securityOrigin)
{var localStorageKey=this._storageKey(securityOrigin,true);var localStorage=this._storages[localStorageKey];console.assert(localStorage);delete this._storages[localStorageKey];this.dispatchEventToListeners(WebInspector.DOMStorageModel.Events.DOMStorageRemoved,localStorage);var sessionStorageKey=this._storageKey(securityOrigin,false);var sessionStorage=this._storages[sessionStorageKey];console.assert(sessionStorage);delete this._storages[sessionStorageKey];this.dispatchEventToListeners(WebInspector.DOMStorageModel.Events.DOMStorageRemoved,sessionStorage);},_storageKey:function(securityOrigin,isLocalStorage)
{return JSON.stringify(WebInspector.DOMStorage.storageId(securityOrigin,isLocalStorage));},_domStorageItemsCleared:function(storageId)
{var domStorage=this.storageForId(storageId);if(!domStorage)
return;var eventData={};domStorage.dispatchEventToListeners(WebInspector.DOMStorage.Events.DOMStorageItemsCleared,eventData);},_domStorageItemRemoved:function(storageId,key)
{var domStorage=this.storageForId(storageId);if(!domStorage)
return;var eventData={key:key};domStorage.dispatchEventToListeners(WebInspector.DOMStorage.Events.DOMStorageItemRemoved,eventData);},_domStorageItemAdded:function(storageId,key,value)
{var domStorage=this.storageForId(storageId);if(!domStorage)
return;var eventData={key:key,value:value};domStorage.dispatchEventToListeners(WebInspector.DOMStorage.Events.DOMStorageItemAdded,eventData);},_domStorageItemUpdated:function(storageId,key,oldValue,value)
{var domStorage=this.storageForId(storageId);if(!domStorage)
return;var eventData={key:key,oldValue:oldValue,value:value};domStorage.dispatchEventToListeners(WebInspector.DOMStorage.Events.DOMStorageItemUpdated,eventData);},storageForId:function(storageId)
{return this._storages[JSON.stringify(storageId)];},storages:function()
{var result=[];for(var id in this._storages)
result.push(this._storages[id]);return result;},__proto__:WebInspector.SDKModel.prototype}
WebInspector.DOMStorageDispatcher=function(model)
{this._model=model;}
WebInspector.DOMStorageDispatcher.prototype={domStorageItemsCleared:function(storageId)
{this._model._domStorageItemsCleared(storageId);},domStorageItemRemoved:function(storageId,key)
{this._model._domStorageItemRemoved(storageId,key);},domStorageItemAdded:function(storageId,key,value)
{this._model._domStorageItemAdded(storageId,key,value);},domStorageItemUpdated:function(storageId,key,oldValue,value)
{this._model._domStorageItemUpdated(storageId,key,oldValue,value);},}
WebInspector.DOMStorageModel._symbol=Symbol("DomStorage");WebInspector.DOMStorageModel.fromTarget=function(target)
{if(!target[WebInspector.DOMStorageModel._symbol])
target[WebInspector.DOMStorageModel._symbol]=new WebInspector.DOMStorageModel(target);return target[WebInspector.DOMStorageModel._symbol];};WebInspector.DOMStorageItemsView=function(domStorage)
{WebInspector.VBox.call(this);this.domStorage=domStorage;this.element.classList.add("storage-view","table");this.deleteButton=new WebInspector.ToolbarButton(WebInspector.UIString("Delete"),"delete-toolbar-item");this.deleteButton.setVisible(false);this.deleteButton.addEventListener("click",this._deleteButtonClicked,this);this.refreshButton=new WebInspector.ToolbarButton(WebInspector.UIString("Refresh"),"refresh-toolbar-item");this.refreshButton.addEventListener("click",this._refreshButtonClicked,this);this.domStorage.addEventListener(WebInspector.DOMStorage.Events.DOMStorageItemsCleared,this._domStorageItemsCleared,this);this.domStorage.addEventListener(WebInspector.DOMStorage.Events.DOMStorageItemRemoved,this._domStorageItemRemoved,this);this.domStorage.addEventListener(WebInspector.DOMStorage.Events.DOMStorageItemAdded,this._domStorageItemAdded,this);this.domStorage.addEventListener(WebInspector.DOMStorage.Events.DOMStorageItemUpdated,this._domStorageItemUpdated,this);}
WebInspector.DOMStorageItemsView.prototype={toolbarItems:function()
{return[this.refreshButton,this.deleteButton];},wasShown:function()
{this._update();},willHide:function()
{this.deleteButton.setVisible(false);},_domStorageItemsCleared:function(event)
{if(!this.isShowing()||!this._dataGrid)
return;this._dataGrid.rootNode().removeChildren();this._dataGrid.addCreationNode(false);this.deleteButton.setVisible(false);event.consume(true);},_domStorageItemRemoved:function(event)
{if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;event.consume(true);for(var i=0;i<children.length;++i){var childNode=children[i];if(childNode.data.key===storageData.key){rootNode.removeChild(childNode);this.deleteButton.setVisible(children.length>1);return;}}},_domStorageItemAdded:function(event)
{if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;event.consume(true);this.deleteButton.setVisible(true);for(var i=0;i<children.length;++i)
if(children[i].data.key===storageData.key)
return;var childNode=new WebInspector.DataGridNode({key:storageData.key,value:storageData.value},false);rootNode.insertChild(childNode,children.length-1);},_domStorageItemUpdated:function(event)
{if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;event.consume(true);var keyFound=false;for(var i=0;i<children.length;++i){var childNode=children[i];if(childNode.data.key===storageData.key){if(keyFound){rootNode.removeChild(childNode);return;}
keyFound=true;if(childNode.data.value!==storageData.value){childNode.data.value=storageData.value;childNode.refresh();childNode.select();childNode.reveal();}
this.deleteButton.setVisible(true);}}},_update:function()
{this.detachChildWidgets();this.domStorage.getItems(this._showDOMStorageItems.bind(this));},_showDOMStorageItems:function(error,items)
{if(error)
return;this._dataGrid=this._dataGridForDOMStorageItems(items);this._dataGrid.asWidget().show(this.element);this.deleteButton.setVisible(this._dataGrid.rootNode().children.length>1);},_dataGridForDOMStorageItems:function(items)
{var columns=[{id:"key",title:WebInspector.UIString("Key"),editable:true,weight:50},{id:"value",title:WebInspector.UIString("Value"),editable:true,weight:50}];var nodes=[];var keys=[];var length=items.length;for(var i=0;i<items.length;i++){var key=items[i][0];var value=items[i][1];var node=new WebInspector.DataGridNode({key:key,value:value},false);node.selectable=true;nodes.push(node);keys.push(key);}
var dataGrid=new WebInspector.DataGrid(columns,this._editingCallback.bind(this),this._deleteCallback.bind(this));dataGrid.setName("DOMStorageItemsView");length=nodes.length;for(var i=0;i<length;++i)
dataGrid.rootNode().appendChild(nodes[i]);dataGrid.addCreationNode(false);if(length>0)
nodes[0].selected=true;return dataGrid;},_deleteButtonClicked:function(event)
{if(!this._dataGrid||!this._dataGrid.selectedNode)
return;this._deleteCallback(this._dataGrid.selectedNode);},_refreshButtonClicked:function(event)
{this._update();},_editingCallback:function(editingNode,columnIdentifier,oldText,newText)
{var domStorage=this.domStorage;if(columnIdentifier==="key"){if(typeof oldText==="string")
domStorage.removeItem(oldText);domStorage.setItem(newText,editingNode.data.value||"");this._removeDupes(editingNode);}else
domStorage.setItem(editingNode.data.key||"",newText);},_removeDupes:function(masterNode)
{var rootNode=this._dataGrid.rootNode();var children=rootNode.children;for(var i=children.length-1;i>=0;--i){var childNode=children[i];if((childNode.data.key===masterNode.data.key)&&(masterNode!==childNode))
rootNode.removeChild(childNode);}},_deleteCallback:function(node)
{if(!node||node.isCreationNode)
return;if(this.domStorage)
this.domStorage.removeItem(node.data.key);},__proto__:WebInspector.VBox.prototype};WebInspector.DatabaseQueryView=function(database)
{WebInspector.VBox.call(this);this.database=database;this.element.classList.add("storage-view","query","monospace");this.element.addEventListener("selectstart",this._selectStart.bind(this),false);this._promptElement=createElement("div");this._promptElement.className="database-query-prompt";this._promptElement.appendChild(createElement("br"));this._promptElement.addEventListener("keydown",this._promptKeyDown.bind(this),true);this.element.appendChild(this._promptElement);this._prompt=new WebInspector.TextPromptWithHistory(this.completions.bind(this)," ");this._proxyElement=this._prompt.attach(this._promptElement);this.element.addEventListener("click",this._messagesClicked.bind(this),true);}
WebInspector.DatabaseQueryView.Events={SchemaUpdated:"SchemaUpdated"}
WebInspector.DatabaseQueryView.prototype={toolbarItems:function()
{return[];},_messagesClicked:function()
{if(!this._prompt.isCaretInsidePrompt()&&this.element.isComponentSelectionCollapsed())
this._prompt.moveCaretToEndOfPrompt();},completions:function(proxyElement,text,cursorOffset,wordRange,force,completionsReadyCallback)
{var prefix=wordRange.toString().toLowerCase();if(!prefix)
return;var results=[];function accumulateMatches(textArray)
{for(var i=0;i<textArray.length;++i){var text=textArray[i].toLowerCase();if(text.length<prefix.length)
continue;if(!text.startsWith(prefix))
continue;results.push(textArray[i]);}}
function tableNamesCallback(tableNames)
{accumulateMatches(tableNames.map(function(name){return name+" ";}));accumulateMatches(["SELECT ","FROM ","WHERE ","LIMIT ","DELETE FROM ","CREATE ","DROP ","TABLE ","INDEX ","UPDATE ","INSERT INTO ","VALUES ("]);completionsReadyCallback(results);}
this.database.getTableNames(tableNamesCallback);},_selectStart:function(event)
{if(this._selectionTimeout)
clearTimeout(this._selectionTimeout);this._prompt.clearAutoComplete();function moveBackIfOutside()
{delete this._selectionTimeout;if(!this._prompt.isCaretInsidePrompt()&&this.element.isComponentSelectionCollapsed())
this._prompt.moveCaretToEndOfPrompt();this._prompt.autoCompleteSoon();}
this._selectionTimeout=setTimeout(moveBackIfOutside.bind(this),100);},_promptKeyDown:function(event)
{if(isEnterKey(event)){this._enterKeyPressed(event);return;}},_enterKeyPressed:function(event)
{event.consume(true);this._prompt.clearAutoComplete(true);var query=this._prompt.text();if(!query.length)
return;this._prompt.pushHistoryItem(query);this._prompt.setText("");this.database.executeSql(query,this._queryFinished.bind(this,query),this._queryError.bind(this,query));},_queryFinished:function(query,columnNames,values)
{var dataGrid=WebInspector.SortableDataGrid.create(columnNames,values);var trimmedQuery=query.trim();if(dataGrid){dataGrid.renderInline();this._appendViewQueryResult(trimmedQuery,dataGrid.asWidget());dataGrid.autoSizeColumns(5);}
if(trimmedQuery.match(/^create /i)||trimmedQuery.match(/^drop table /i))
this.dispatchEventToListeners(WebInspector.DatabaseQueryView.Events.SchemaUpdated,this.database);},_queryError:function(query,errorMessage)
{this._appendErrorQueryResult(query,errorMessage);},_appendViewQueryResult:function(query,view)
{var resultElement=this._appendQueryResult(query);view.show(resultElement);this._promptElement.scrollIntoView(false);},_appendErrorQueryResult:function(query,errorText)
{var resultElement=this._appendQueryResult(query);resultElement.classList.add("error");resultElement.textContent=errorText;this._promptElement.scrollIntoView(false);},_appendQueryResult:function(query)
{var element=createElement("div");element.className="database-user-query";this.element.insertBefore(element,this._proxyElement);var commandTextElement=createElement("span");commandTextElement.className="database-query-text";commandTextElement.textContent=query;element.appendChild(commandTextElement);var resultElement=createElement("div");resultElement.className="database-query-result";element.appendChild(resultElement);return resultElement;},__proto__:WebInspector.VBox.prototype};WebInspector.DatabaseTableView=function(database,tableName)
{WebInspector.VBox.call(this);this.database=database;this.tableName=tableName;this.element.classList.add("storage-view","table");this._visibleColumnsSetting=WebInspector.settings.createSetting("databaseTableViewVisibleColumns",{});this.refreshButton=new WebInspector.ToolbarButton(WebInspector.UIString("Refresh"),"refresh-toolbar-item");this.refreshButton.addEventListener("click",this._refreshButtonClicked,this);this._visibleColumnsInput=new WebInspector.ToolbarInput(WebInspector.UIString("Visible columns"),1);this._visibleColumnsInput.addEventListener(WebInspector.ToolbarInput.Event.TextChanged,this._onVisibleColumnsChanged,this);}
WebInspector.DatabaseTableView.prototype={wasShown:function()
{this.update();},toolbarItems:function()
{return[this.refreshButton,this._visibleColumnsInput];},_escapeTableName:function(tableName)
{return tableName.replace(/\"/g,"\"\"");},update:function()
{this.database.executeSql("SELECT rowid, * FROM \""+this._escapeTableName(this.tableName)+"\"",this._queryFinished.bind(this),this._queryError.bind(this));},_queryFinished:function(columnNames,values)
{this.detachChildWidgets();this.element.removeChildren();this._dataGrid=WebInspector.SortableDataGrid.create(columnNames,values);this._visibleColumnsInput.setVisible(!!this._dataGrid);if(!this._dataGrid){this._emptyWidget=new WebInspector.EmptyWidget(WebInspector.UIString("The “%s”\ntable is empty.",this.tableName));this._emptyWidget.show(this.element);return;}
this._dataGrid.asWidget().show(this.element);this._dataGrid.autoSizeColumns(5);this._columnsMap=new Map();for(var i=1;i<columnNames.length;++i)
this._columnsMap.set(columnNames[i],String(i));this._lastVisibleColumns="";var visibleColumnsText=this._visibleColumnsSetting.get()[this.tableName]||"";this._visibleColumnsInput.setValue(visibleColumnsText);this._onVisibleColumnsChanged();},_onVisibleColumnsChanged:function()
{if(!this._dataGrid)
return;var text=this._visibleColumnsInput.value();var parts=text.split(/[\s,]+/);var matches=new Set();var columnsVisibility={};columnsVisibility["0"]=true;for(var i=0;i<parts.length;++i){var part=parts[i];if(this._columnsMap.has(part)){matches.add(part);columnsVisibility[this._columnsMap.get(part)]=true;}}
var newVisibleColumns=matches.valuesArray().sort().join(", ");if(newVisibleColumns.length===0){for(var v of this._columnsMap.values())
columnsVisibility[v]=true;}
if(newVisibleColumns===this._lastVisibleColumns)
return;var visibleColumnsRegistry=this._visibleColumnsSetting.get();visibleColumnsRegistry[this.tableName]=text;this._visibleColumnsSetting.set(visibleColumnsRegistry);this._dataGrid.setColumnsVisiblity(columnsVisibility);this._lastVisibleColumns=newVisibleColumns;},_queryError:function(error)
{this.detachChildWidgets();this.element.removeChildren();var errorMsgElement=createElement("div");errorMsgElement.className="storage-table-error";errorMsgElement.textContent=WebInspector.UIString("An error occurred trying to\nread the “%s” table.",this.tableName);this.element.appendChild(errorMsgElement);},_refreshButtonClicked:function(event)
{this.update();},__proto__:WebInspector.VBox.prototype};WebInspector.IndexedDBModel=function(target)
{WebInspector.SDKModel.call(this,WebInspector.IndexedDBModel,target);this._agent=target.indexedDBAgent();this._databases=new Map();this._databaseNamesBySecurityOrigin={};}
WebInspector.IndexedDBModel.KeyTypes={NumberType:"number",StringType:"string",DateType:"date",ArrayType:"array"};WebInspector.IndexedDBModel.KeyPathTypes={NullType:"null",StringType:"string",ArrayType:"array"};WebInspector.IndexedDBModel.keyFromIDBKey=function(idbKey)
{if(typeof(idbKey)==="undefined"||idbKey===null)
return null;var key={};switch(typeof(idbKey)){case"number":key.number=idbKey;key.type=WebInspector.IndexedDBModel.KeyTypes.NumberType;break;case"string":key.string=idbKey;key.type=WebInspector.IndexedDBModel.KeyTypes.StringType;break;case"object":if(idbKey instanceof Date){key.date=idbKey.getTime();key.type=WebInspector.IndexedDBModel.KeyTypes.DateType;}else if(Array.isArray(idbKey)){key.array=[];for(var i=0;i<idbKey.length;++i)
key.array.push(WebInspector.IndexedDBModel.keyFromIDBKey(idbKey[i]));key.type=WebInspector.IndexedDBModel.KeyTypes.ArrayType;}
break;default:return null;}
return key;}
WebInspector.IndexedDBModel.keyRangeFromIDBKeyRange=function(idbKeyRange)
{if(typeof idbKeyRange==="undefined"||idbKeyRange===null)
return null;var keyRange={};keyRange.lower=WebInspector.IndexedDBModel.keyFromIDBKey(idbKeyRange.lower);keyRange.upper=WebInspector.IndexedDBModel.keyFromIDBKey(idbKeyRange.upper);keyRange.lowerOpen=idbKeyRange.lowerOpen;keyRange.upperOpen=idbKeyRange.upperOpen;return keyRange;}
WebInspector.IndexedDBModel.idbKeyPathFromKeyPath=function(keyPath)
{var idbKeyPath;switch(keyPath.type){case WebInspector.IndexedDBModel.KeyPathTypes.NullType:idbKeyPath=null;break;case WebInspector.IndexedDBModel.KeyPathTypes.StringType:idbKeyPath=keyPath.string;break;case WebInspector.IndexedDBModel.KeyPathTypes.ArrayType:idbKeyPath=keyPath.array;break;}
return idbKeyPath;}
WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath=function(idbKeyPath)
{if(typeof idbKeyPath==="string")
return"\""+idbKeyPath+"\"";if(idbKeyPath instanceof Array)
return"[\""+idbKeyPath.join("\", \"")+"\"]";return null;}
WebInspector.IndexedDBModel.EventTypes={DatabaseAdded:"DatabaseAdded",DatabaseRemoved:"DatabaseRemoved",DatabaseLoaded:"DatabaseLoaded"}
WebInspector.IndexedDBModel.prototype={enable:function()
{if(this._enabled)
return;this._agent.enable();this.target().resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginAdded,this._securityOriginAdded,this);this.target().resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginRemoved,this._securityOriginRemoved,this);var securityOrigins=this.target().resourceTreeModel.securityOrigins();for(var i=0;i<securityOrigins.length;++i)
this._addOrigin(securityOrigins[i]);this._enabled=true;},clearForOrigin:function(origin)
{if(!this._enabled)
return;this._removeOrigin(origin);this._addOrigin(origin);},refreshDatabaseNames:function()
{for(var securityOrigin in this._databaseNamesBySecurityOrigin)
this._loadDatabaseNames(securityOrigin);},refreshDatabase:function(databaseId)
{this._loadDatabase(databaseId);},clearObjectStore:function(databaseId,objectStoreName,callback)
{this._agent.clearObjectStore(databaseId.securityOrigin,databaseId.name,objectStoreName,callback);},_securityOriginAdded:function(event)
{var securityOrigin=(event.data);this._addOrigin(securityOrigin);},_securityOriginRemoved:function(event)
{var securityOrigin=(event.data);this._removeOrigin(securityOrigin);},_addOrigin:function(securityOrigin)
{console.assert(!this._databaseNamesBySecurityOrigin[securityOrigin]);this._databaseNamesBySecurityOrigin[securityOrigin]=[];this._loadDatabaseNames(securityOrigin);},_removeOrigin:function(securityOrigin)
{console.assert(this._databaseNamesBySecurityOrigin[securityOrigin]);for(var i=0;i<this._databaseNamesBySecurityOrigin[securityOrigin].length;++i)
this._databaseRemoved(securityOrigin,this._databaseNamesBySecurityOrigin[securityOrigin][i]);delete this._databaseNamesBySecurityOrigin[securityOrigin];},_updateOriginDatabaseNames:function(securityOrigin,databaseNames)
{var newDatabaseNames=databaseNames.keySet();var oldDatabaseNames=this._databaseNamesBySecurityOrigin[securityOrigin].keySet();this._databaseNamesBySecurityOrigin[securityOrigin]=databaseNames;for(var databaseName in oldDatabaseNames){if(!newDatabaseNames[databaseName])
this._databaseRemoved(securityOrigin,databaseName);}
for(var databaseName in newDatabaseNames){if(!oldDatabaseNames[databaseName])
this._databaseAdded(securityOrigin,databaseName);}},databases:function()
{var result=[];for(var securityOrigin in this._databaseNamesBySecurityOrigin){var databaseNames=this._databaseNamesBySecurityOrigin[securityOrigin];for(var i=0;i<databaseNames.length;++i){result.push(new WebInspector.IndexedDBModel.DatabaseId(securityOrigin,databaseNames[i]));}}
return result;},_databaseAdded:function(securityOrigin,databaseName)
{var databaseId=new WebInspector.IndexedDBModel.DatabaseId(securityOrigin,databaseName);this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseAdded,databaseId);},_databaseRemoved:function(securityOrigin,databaseName)
{var databaseId=new WebInspector.IndexedDBModel.DatabaseId(securityOrigin,databaseName);this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseRemoved,databaseId);},_loadDatabaseNames:function(securityOrigin)
{function callback(error,databaseNames)
{if(error){console.error("IndexedDBAgent error: "+error);return;}
if(!this._databaseNamesBySecurityOrigin[securityOrigin])
return;this._updateOriginDatabaseNames(securityOrigin,databaseNames);}
this._agent.requestDatabaseNames(securityOrigin,callback.bind(this));},_loadDatabase:function(databaseId)
{function callback(error,databaseWithObjectStores)
{if(error){console.error("IndexedDBAgent error: "+error);return;}
if(!this._databaseNamesBySecurityOrigin[databaseId.securityOrigin])
return;var databaseModel=new WebInspector.IndexedDBModel.Database(databaseId,databaseWithObjectStores.version);this._databases.set(databaseId,databaseModel);for(var i=0;i<databaseWithObjectStores.objectStores.length;++i){var objectStore=databaseWithObjectStores.objectStores[i];var objectStoreIDBKeyPath=WebInspector.IndexedDBModel.idbKeyPathFromKeyPath(objectStore.keyPath);var objectStoreModel=new WebInspector.IndexedDBModel.ObjectStore(objectStore.name,objectStoreIDBKeyPath,objectStore.autoIncrement);for(var j=0;j<objectStore.indexes.length;++j){var index=objectStore.indexes[j];var indexIDBKeyPath=WebInspector.IndexedDBModel.idbKeyPathFromKeyPath(index.keyPath);var indexModel=new WebInspector.IndexedDBModel.Index(index.name,indexIDBKeyPath,index.unique,index.multiEntry);objectStoreModel.indexes[indexModel.name]=indexModel;}
databaseModel.objectStores[objectStoreModel.name]=objectStoreModel;}
this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseLoaded,databaseModel);}
this._agent.requestDatabase(databaseId.securityOrigin,databaseId.name,callback.bind(this));},loadObjectStoreData:function(databaseId,objectStoreName,idbKeyRange,skipCount,pageSize,callback)
{this._requestData(databaseId,databaseId.name,objectStoreName,"",idbKeyRange,skipCount,pageSize,callback);},loadIndexData:function(databaseId,objectStoreName,indexName,idbKeyRange,skipCount,pageSize,callback)
{this._requestData(databaseId,databaseId.name,objectStoreName,indexName,idbKeyRange,skipCount,pageSize,callback);},_requestData:function(databaseId,databaseName,objectStoreName,indexName,idbKeyRange,skipCount,pageSize,callback)
{function innerCallback(error,dataEntries,hasMore)
{if(error){console.error("IndexedDBAgent error: "+error);return;}
if(!this._databaseNamesBySecurityOrigin[databaseId.securityOrigin])
return;var entries=[];for(var i=0;i<dataEntries.length;++i){var key=WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].key));var primaryKey=WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].primaryKey));var value=WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].value));entries.push(new WebInspector.IndexedDBModel.Entry(key,primaryKey,value));}
callback(entries,hasMore);}
var keyRange=WebInspector.IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange);this._agent.requestData(databaseId.securityOrigin,databaseName,objectStoreName,indexName,skipCount,pageSize,keyRange?keyRange:undefined,innerCallback.bind(this));},__proto__:WebInspector.SDKModel.prototype}
WebInspector.IndexedDBModel.Entry=function(key,primaryKey,value)
{this.key=key;this.primaryKey=primaryKey;this.value=value;}
WebInspector.IndexedDBModel.DatabaseId=function(securityOrigin,name)
{this.securityOrigin=securityOrigin;this.name=name;}
WebInspector.IndexedDBModel.DatabaseId.prototype={equals:function(databaseId)
{return this.name===databaseId.name&&this.securityOrigin===databaseId.securityOrigin;},}
WebInspector.IndexedDBModel.Database=function(databaseId,version)
{this.databaseId=databaseId;this.version=version;this.objectStores={};}
WebInspector.IndexedDBModel.ObjectStore=function(name,keyPath,autoIncrement)
{this.name=name;this.keyPath=keyPath;this.autoIncrement=autoIncrement;this.indexes={};}
WebInspector.IndexedDBModel.ObjectStore.prototype={get keyPathString()
{return WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);}}
WebInspector.IndexedDBModel.Index=function(name,keyPath,unique,multiEntry)
{this.name=name;this.keyPath=keyPath;this.unique=unique;this.multiEntry=multiEntry;}
WebInspector.IndexedDBModel.Index.prototype={get keyPathString()
{return WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);}}
WebInspector.IndexedDBModel.fromTarget=function(target)
{var model=(target.model(WebInspector.IndexedDBModel));if(!model)
model=new WebInspector.IndexedDBModel(target);return model;};WebInspector.IDBDatabaseView=function(database)
{WebInspector.VBox.call(this);this.registerRequiredCSS("resources/indexedDBViews.css");this.element.classList.add("indexed-db-database-view");this.element.classList.add("storage-view");this._headersTreeOutline=new TreeOutline();this._headersTreeOutline.element.classList.add("outline-disclosure");this.element.appendChild(this._headersTreeOutline.element);this._headersTreeOutline.expandTreeElementsWhenArrowing=true;this._securityOriginTreeElement=new TreeElement();this._securityOriginTreeElement.selectable=false;this._headersTreeOutline.appendChild(this._securityOriginTreeElement);this._nameTreeElement=new TreeElement();this._nameTreeElement.selectable=false;this._headersTreeOutline.appendChild(this._nameTreeElement);this._versionTreeElement=new TreeElement();this._versionTreeElement.selectable=false;this._headersTreeOutline.appendChild(this._versionTreeElement);this.update(database);}
WebInspector.IDBDatabaseView.prototype={toolbarItems:function()
{return[];},_formatHeader:function(name,value)
{var fragment=createDocumentFragment();fragment.createChild("div","attribute-name").textContent=name+":";fragment.createChild("div","attribute-value source-code").textContent=value;return fragment;},_refreshDatabase:function()
{this._securityOriginTreeElement.title=this._formatHeader(WebInspector.UIString("Security origin"),this._database.databaseId.securityOrigin);this._nameTreeElement.title=this._formatHeader(WebInspector.UIString("Name"),this._database.databaseId.name);this._versionTreeElement.title=this._formatHeader(WebInspector.UIString("Version"),this._database.version);},update:function(database)
{this._database=database;this._refreshDatabase();},__proto__:WebInspector.VBox.prototype}
WebInspector.IDBDataView=function(model,databaseId,objectStore,index)
{WebInspector.VBox.call(this);this.registerRequiredCSS("resources/indexedDBViews.css");this._model=model;this._databaseId=databaseId;this._isIndex=!!index;this.element.classList.add("indexed-db-data-view");this._createEditorToolbar();this._refreshButton=new WebInspector.ToolbarButton(WebInspector.UIString("Refresh"),"refresh-toolbar-item");this._refreshButton.addEventListener("click",this._refreshButtonClicked,this);this._clearButton=new WebInspector.ToolbarButton(WebInspector.UIString("Clear object store"),"clear-toolbar-item");this._clearButton.addEventListener("click",this._clearButtonClicked,this);this._pageSize=50;this._skipCount=0;this.update(objectStore,index);this._entries=[];}
WebInspector.IDBDataView.prototype={_createDataGrid:function()
{var keyPath=this._isIndex?this._index.keyPath:this._objectStore.keyPath;var columns=[];columns.push({id:"number",title:WebInspector.UIString("#"),width:"50px"});columns.push({id:"key",titleDOMFragment:this._keyColumnHeaderFragment(WebInspector.UIString("Key"),keyPath)});if(this._isIndex)
columns.push({id:"primaryKey",titleDOMFragment:this._keyColumnHeaderFragment(WebInspector.UIString("Primary key"),this._objectStore.keyPath)});columns.push({id:"value",title:WebInspector.UIString("Value")});var dataGrid=new WebInspector.DataGrid(columns);return dataGrid;},_keyColumnHeaderFragment:function(prefix,keyPath)
{var keyColumnHeaderFragment=createDocumentFragment();keyColumnHeaderFragment.createTextChild(prefix);if(keyPath===null)
return keyColumnHeaderFragment;keyColumnHeaderFragment.createTextChild(" ("+WebInspector.UIString("Key path: "));if(Array.isArray(keyPath)){keyColumnHeaderFragment.createTextChild("[");for(var i=0;i<keyPath.length;++i){if(i!=0)
keyColumnHeaderFragment.createTextChild(", ");keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPath[i]));}
keyColumnHeaderFragment.createTextChild("]");}else{var keyPathString=(keyPath);keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPathString));}
keyColumnHeaderFragment.createTextChild(")");return keyColumnHeaderFragment;},_keyPathStringFragment:function(keyPathString)
{var keyPathStringFragment=createDocumentFragment();keyPathStringFragment.createTextChild("\"");var keyPathSpan=keyPathStringFragment.createChild("span","source-code indexed-db-key-path");keyPathSpan.textContent=keyPathString;keyPathStringFragment.createTextChild("\"");return keyPathStringFragment;},_createEditorToolbar:function()
{var editorToolbar=new WebInspector.Toolbar("data-view-toolbar",this.element);this._pageBackButton=new WebInspector.ToolbarButton(WebInspector.UIString("Show previous page"),"play-backwards-toolbar-item");this._pageBackButton.addEventListener("click",this._pageBackButtonClicked,this);editorToolbar.appendToolbarItem(this._pageBackButton);this._pageForwardButton=new WebInspector.ToolbarButton(WebInspector.UIString("Show next page"),"play-toolbar-item");this._pageForwardButton.setEnabled(false);this._pageForwardButton.addEventListener("click",this._pageForwardButtonClicked,this);editorToolbar.appendToolbarItem(this._pageForwardButton);this._keyInputElement=editorToolbar.element.createChild("input","key-input");this._keyInputElement.placeholder=WebInspector.UIString("Start from key");this._keyInputElement.addEventListener("paste",this._keyInputChanged.bind(this),false);this._keyInputElement.addEventListener("cut",this._keyInputChanged.bind(this),false);this._keyInputElement.addEventListener("keypress",this._keyInputChanged.bind(this),false);this._keyInputElement.addEventListener("keydown",this._keyInputChanged.bind(this),false);},_pageBackButtonClicked:function()
{this._skipCount=Math.max(0,this._skipCount-this._pageSize);this._updateData(false);},_pageForwardButtonClicked:function()
{this._skipCount=this._skipCount+this._pageSize;this._updateData(false);},_keyInputChanged:function()
{window.setTimeout(this._updateData.bind(this,false),0);},update:function(objectStore,index)
{this._objectStore=objectStore;this._index=index;if(this._dataGrid)
this._dataGrid.asWidget().detach();this._dataGrid=this._createDataGrid();this._dataGrid.asWidget().show(this.element);this._skipCount=0;this._updateData(true);},_parseKey:function(keyString)
{var result;try{result=JSON.parse(keyString);}catch(e){result=keyString;}
return result;},_updateData:function(force)
{var key=this._parseKey(this._keyInputElement.value);var pageSize=this._pageSize;var skipCount=this._skipCount;this._refreshButton.setEnabled(false);this._clearButton.setEnabled(!this._isIndex);if(!force&&this._lastKey===key&&this._lastPageSize===pageSize&&this._lastSkipCount===skipCount)
return;if(this._lastKey!==key||this._lastPageSize!==pageSize){skipCount=0;this._skipCount=0;}
this._lastKey=key;this._lastPageSize=pageSize;this._lastSkipCount=skipCount;function callback(entries,hasMore)
{this._refreshButton.setEnabled(true);this.clear();this._entries=entries;for(var i=0;i<entries.length;++i){var data={};data["number"]=i+skipCount;data["key"]=entries[i].key;data["primaryKey"]=entries[i].primaryKey;data["value"]=entries[i].value;var node=new WebInspector.IDBDataGridNode(data);this._dataGrid.rootNode().appendChild(node);}
this._pageBackButton.setEnabled(!!skipCount);this._pageForwardButton.setEnabled(hasMore);}
var idbKeyRange=key?window.IDBKeyRange.lowerBound(key):null;if(this._isIndex)
this._model.loadIndexData(this._databaseId,this._objectStore.name,this._index.name,idbKeyRange,skipCount,pageSize,callback.bind(this));else
this._model.loadObjectStoreData(this._databaseId,this._objectStore.name,idbKeyRange,skipCount,pageSize,callback.bind(this));},_refreshButtonClicked:function(event)
{this._updateData(true);},_clearButtonClicked:function(event)
{function cleared(){this._clearButton.setEnabled(true);this._updateData(true);}
this._clearButton.setEnabled(false);this._model.clearObjectStore(this._databaseId,this._objectStore.name,cleared.bind(this));},toolbarItems:function()
{return[this._refreshButton,this._clearButton];},clear:function()
{this._dataGrid.rootNode().removeChildren();this._entries=[];},__proto__:WebInspector.VBox.prototype}
WebInspector.IDBDataGridNode=function(data)
{WebInspector.DataGridNode.call(this,data,false);this.selectable=false;}
WebInspector.IDBDataGridNode.prototype={createCell:function(columnIdentifier)
{var cell=WebInspector.DataGridNode.prototype.createCell.call(this,columnIdentifier);var value=this.data[columnIdentifier];switch(columnIdentifier){case"value":case"key":case"primaryKey":cell.removeChildren();var objectElement=WebInspector.ObjectPropertiesSection.defaultObjectPresentation(value,true);cell.appendChild(objectElement);break;default:}
return cell;},__proto__:WebInspector.DataGridNode.prototype};WebInspector.ResourcesPanel=function()
{WebInspector.PanelWithSidebar.call(this,"resources");this.registerRequiredCSS("resources/resourcesPanel.css");this._resourcesLastSelectedItemSetting=WebInspector.settings.createSetting("resourcesLastSelectedItem",{});this._sidebarTree=new TreeOutlineInShadow();this._sidebarTree.element.classList.add("resources-sidebar");this._sidebarTree.registerRequiredCSS("resources/resourcesSidebar.css");this._sidebarTree.element.classList.add("filter-all","outline-disclosure");this.panelSidebarElement().appendChild(this._sidebarTree.element);this.setDefaultFocusedElement(this._sidebarTree.element);this._applicationTreeElement=this._addSidebarSection(WebInspector.UIString("Application"));this._manifestTreeElement=new WebInspector.AppManifestTreeElement(this);this._applicationTreeElement.appendChild(this._manifestTreeElement);this.serviceWorkersTreeElement=new WebInspector.ServiceWorkersTreeElement(this);this._applicationTreeElement.appendChild(this.serviceWorkersTreeElement);var clearStorageTreeElement=new WebInspector.ClearStorageTreeElement(this);this._applicationTreeElement.appendChild(clearStorageTreeElement);var storageTreeElement=this._addSidebarSection(WebInspector.UIString("Storage"));this.localStorageListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Local Storage"),"LocalStorage",["domstorage-storage-tree-item","local-storage"]);storageTreeElement.appendChild(this.localStorageListTreeElement);this.sessionStorageListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Session Storage"),"SessionStorage",["domstorage-storage-tree-item","session-storage"]);storageTreeElement.appendChild(this.sessionStorageListTreeElement);this.indexedDBListTreeElement=new WebInspector.IndexedDBTreeElement(this);storageTreeElement.appendChild(this.indexedDBListTreeElement);this.databasesListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Web SQL"),"Databases",["database-storage-tree-item"]);storageTreeElement.appendChild(this.databasesListTreeElement);this.cookieListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Cookies"),"Cookies",["cookie-storage-tree-item"]);storageTreeElement.appendChild(this.cookieListTreeElement);var cacheTreeElement=this._addSidebarSection(WebInspector.UIString("Cache"));this.cacheStorageListTreeElement=new WebInspector.ServiceWorkerCacheTreeElement(this);cacheTreeElement.appendChild(this.cacheStorageListTreeElement);this.applicationCacheListTreeElement=new WebInspector.StorageCategoryTreeElement(this,WebInspector.UIString("Application Cache"),"ApplicationCache",["application-cache-storage-tree-item"]);cacheTreeElement.appendChild(this.applicationCacheListTreeElement);this.resourcesListTreeElement=this._addSidebarSection(WebInspector.UIString("Frames"));var mainContainer=new WebInspector.VBox();this.storageViews=mainContainer.element.createChild("div","vbox flex-auto");this._storageViewToolbar=new WebInspector.Toolbar("resources-toolbar",mainContainer.element);this.splitWidget().setMainWidget(mainContainer);this._databaseTableViews=new Map();this._databaseQueryViews=new Map();this._databaseTreeElements=new Map();this._domStorageViews=new Map();this._domStorageTreeElements=new Map();this._cookieViews={};this._domains={};this.panelSidebarElement().addEventListener("mousemove",this._onmousemove.bind(this),false);this.panelSidebarElement().addEventListener("mouseleave",this._onmouseleave.bind(this),false);WebInspector.targetManager.observeTargets(this);}
WebInspector.ResourcesPanel.prototype={_addSidebarSection:function(title)
{var treeElement=new TreeElement(title,true);treeElement.listItemElement.classList.add("storage-group-list-item");treeElement.setCollapsible(false);treeElement.selectable=false;this._sidebarTree.appendChild(treeElement);return treeElement;},wasShown:function()
{if(!this._sidebarTree.selectedTreeElement)
this._manifestTreeElement.select();},targetAdded:function(target)
{if(this._target)
return;this._target=target;this._databaseModel=WebInspector.DatabaseModel.fromTarget(target);this._domStorageModel=WebInspector.DOMStorageModel.fromTarget(target);if(target.resourceTreeModel.cachedResourcesLoaded())
this._initialize();target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.Load,this._loadEventFired,this);target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.CachedResourcesLoaded,this._initialize,this);target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.WillLoadCachedResources,this._resetWithFrames,this);this._databaseModel.addEventListener(WebInspector.DatabaseModel.Events.DatabaseAdded,this._databaseAdded,this);this._databaseModel.addEventListener(WebInspector.DatabaseModel.Events.DatabasesRemoved,this._resetWebSQL,this);},targetRemoved:function(target)
{if(target!==this._target)
return;delete this._target;target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.Load,this._loadEventFired,this);target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.CachedResourcesLoaded,this._initialize,this);target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.WillLoadCachedResources,this._resetWithFrames,this);this._databaseModel.removeEventListener(WebInspector.DatabaseModel.Events.DatabaseAdded,this._databaseAdded,this);this._databaseModel.removeEventListener(WebInspector.DatabaseModel.Events.DatabasesRemoved,this._resetWebSQL,this);this._resetWithFrames();},_initialize:function()
{this._databaseModel.enable();this._domStorageModel.enable();var indexedDBModel=WebInspector.IndexedDBModel.fromTarget(this._target);if(indexedDBModel)
indexedDBModel.enable();var cacheStorageModel=WebInspector.ServiceWorkerCacheModel.fromTarget(this._target);if(cacheStorageModel)
cacheStorageModel.enable();if(this._target.isPage())
this._populateResourceTree();this._populateDOMStorageTree();this._populateApplicationCacheTree();this.indexedDBListTreeElement._initialize();this.cacheStorageListTreeElement._initialize();this._initDefaultSelection();this._initialized=true;},_loadEventFired:function()
{this._initDefaultSelection();},_initDefaultSelection:function()
{if(!this._initialized)
return;var itemURL=this._resourcesLastSelectedItemSetting.get();if(itemURL){var rootElement=this._sidebarTree.rootElement();for(var treeElement=rootElement.firstChild();treeElement;treeElement=treeElement.traverseNextTreeElement(false,rootElement,true)){if(treeElement.itemURL===itemURL){treeElement.revealAndSelect(true);return;}}}
var mainResource=this._target.resourceTreeModel.inspectedPageURL()&&this.resourcesListTreeElement&&this.resourcesListTreeElement.expanded?this._target.resourceTreeModel.resourceForURL(this._target.resourceTreeModel.inspectedPageURL()):null;if(mainResource)
this.showResource(mainResource);},_resetWithFrames:function()
{this.resourcesListTreeElement.removeChildren();this._treeElementForFrameId={};this._reset();},_resetWebSQL:function()
{if(this.visibleView instanceof WebInspector.DatabaseQueryView||this.visibleView instanceof WebInspector.DatabaseTableView){this.visibleView.detach();delete this.visibleView;}
var queryViews=this._databaseQueryViews.valuesArray();for(var i=0;i<queryViews.length;++i)
queryViews[i].removeEventListener(WebInspector.DatabaseQueryView.Events.SchemaUpdated,this._updateDatabaseTables,this);this._databaseTableViews.clear();this._databaseQueryViews.clear();this._databaseTreeElements.clear();this.databasesListTreeElement.removeChildren();this.databasesListTreeElement.setExpandable(false);},_resetDOMStorage:function()
{if(this.visibleView instanceof WebInspector.DOMStorageItemsView){this.visibleView.detach();delete this.visibleView;}
this._domStorageViews.clear();this._domStorageTreeElements.clear();this.localStorageListTreeElement.removeChildren();this.sessionStorageListTreeElement.removeChildren();},_resetCookies:function()
{if(this.visibleView instanceof WebInspector.CookieItemsView){this.visibleView.detach();delete this.visibleView;}
this._cookieViews={};this.cookieListTreeElement.removeChildren();},_resetCacheStorage:function()
{if(this.visibleView instanceof WebInspector.ServiceWorkerCacheView){this.visibleView.detach();delete this.visibleView;}
this.cacheStorageListTreeElement.removeChildren();this.cacheStorageListTreeElement.setExpandable(false);},_resetAppCache:function()
{for(var frameId of Object.keys(this._applicationCacheFrameElements))
this._applicationCacheFrameManifestRemoved({data:frameId});this.applicationCacheListTreeElement.setExpandable(false);},_reset:function()
{this._domains={};this._resetWebSQL();this._resetDOMStorage();this._resetCookies();this._resetCacheStorage();if((this.visibleView instanceof WebInspector.ResourceSourceFrame)||(this.visibleView instanceof WebInspector.ImageView)||(this.visibleView instanceof WebInspector.FontView)){this.visibleView.detach();delete this.visibleView;}
this._storageViewToolbar.removeToolbarItems();if(this._sidebarTree.selectedTreeElement)
this._sidebarTree.selectedTreeElement.deselect();},_populateResourceTree:function()
{this._treeElementForFrameId={};this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameAdded,this._frameAdded,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameNavigated,this._frameNavigated,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameDetached,this._frameDetached,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.ResourceAdded,this._resourceAdded,this);function populateFrame(frame)
{this._frameAdded({data:frame});for(var i=0;i<frame.childFrames.length;++i)
populateFrame.call(this,frame.childFrames[i]);var resources=frame.resources();for(var i=0;i<resources.length;++i)
this._resourceAdded({data:resources[i]});}
populateFrame.call(this,this._target.resourceTreeModel.mainFrame);},_frameAdded:function(event)
{var frame=event.data;var parentFrame=frame.parentFrame;var parentTreeElement=parentFrame?this._treeElementForFrameId[parentFrame.id]:this.resourcesListTreeElement;if(!parentTreeElement){console.warn("No frame to route "+frame.url+" to.");return;}
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
applicationCacheFrameTreeElement.frameNavigated(frame);},_databaseAdded:function(event)
{var database=(event.data);this._addDatabase(database);},_addDatabase:function(database)
{var databaseTreeElement=new WebInspector.DatabaseTreeElement(this,database);this._databaseTreeElements.set(database,databaseTreeElement);this.databasesListTreeElement.appendChild(databaseTreeElement);},addDocumentURL:function(url)
{var parsedURL=url.asParsedURL();if(!parsedURL)
return;var domain=parsedURL.securityOrigin();if(!this._domains[domain]){this._domains[domain]=true;var cookieDomainTreeElement=new WebInspector.CookieTreeElement(this,domain);this.cookieListTreeElement.appendChild(cookieDomainTreeElement);}},_domStorageAdded:function(event)
{var domStorage=(event.data);this._addDOMStorage(domStorage);},_addDOMStorage:function(domStorage)
{console.assert(!this._domStorageTreeElements.get(domStorage));var domStorageTreeElement=new WebInspector.DOMStorageTreeElement(this,domStorage,(domStorage.isLocalStorage?"local-storage":"session-storage"));this._domStorageTreeElements.set(domStorage,domStorageTreeElement);if(domStorage.isLocalStorage)
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
{if(resource.hasTextContent()){var treeElement=this._findTreeElementForResource(resource);if(!treeElement)
return null;return treeElement.sourceView();}
switch(resource.resourceType()){case WebInspector.resourceTypes.Image:return new WebInspector.ImageView(resource.mimeType,resource);case WebInspector.resourceTypes.Font:return new WebInspector.FontView(resource.mimeType,resource);default:return new WebInspector.EmptyWidget(resource.url);}},_resourceSourceFrameViewForResource:function(resource)
{var resourceView=this._resourceViewForResource(resource);if(resourceView&&resourceView instanceof WebInspector.ResourceSourceFrame)
return(resourceView);return null;},_showDatabase:function(database,tableName)
{if(!database)
return;var view;if(tableName){var tableViews=this._databaseTableViews.get(database);if(!tableViews){tableViews=({});this._databaseTableViews.set(database,tableViews);}
view=tableViews[tableName];if(!view){view=new WebInspector.DatabaseTableView(database,tableName);tableViews[tableName]=view;}}else{view=this._databaseQueryViews.get(database);if(!view){view=new WebInspector.DatabaseQueryView(database);this._databaseQueryViews.set(database,view);view.addEventListener(WebInspector.DatabaseQueryView.Events.SchemaUpdated,this._updateDatabaseTables,this);}}
this._innerShowView(view);},_showDOMStorage:function(domStorage)
{if(!domStorage)
return;var view;view=this._domStorageViews.get(domStorage);if(!view){view=new WebInspector.DOMStorageItemsView(domStorage);this._domStorageViews.set(domStorage,view);}
this._innerShowView(view);},showCookies:function(treeElement,cookieDomain)
{var view=this._cookieViews[cookieDomain];if(!view){view=new WebInspector.CookieItemsView(treeElement,cookieDomain);this._cookieViews[cookieDomain]=view;}
this._innerShowView(view);},clearCookies:function(cookieDomain)
{if(this._cookieViews[cookieDomain])
this._cookieViews[cookieDomain].clear();},showApplicationCache:function(frameId)
{if(!this._applicationCacheViews[frameId])
this._applicationCacheViews[frameId]=new WebInspector.ApplicationCacheItemsView(this._applicationCacheModel,frameId);this._innerShowView(this._applicationCacheViews[frameId]);},showFileSystem:function(view)
{this._innerShowView(view);},showCategoryView:function(categoryName)
{if(!this._categoryView)
this._categoryView=new WebInspector.StorageCategoryView();this._categoryView.setText(categoryName);this._innerShowView(this._categoryView);},_innerShowView:function(view)
{if(this.visibleView===view)
return;if(this.visibleView)
this.visibleView.detach();view.show(this.storageViews);this.visibleView=view;this._storageViewToolbar.removeToolbarItems();var toolbarItems=view.toolbarItems?view.toolbarItems():null;for(var i=0;toolbarItems&&i<toolbarItems.length;++i)
this._storageViewToolbar.appendToolbarItem(toolbarItems[i]);},closeVisibleView:function()
{if(!this.visibleView)
return;this.visibleView.detach();delete this.visibleView;},_updateDatabaseTables:function(event)
{var database=event.data;if(!database)
return;var databasesTreeElement=this._databaseTreeElements.get(database);if(!databasesTreeElement)
return;databasesTreeElement.invalidateChildren();var tableViews=this._databaseTableViews.get(database);if(!tableViews)
return;var tableNamesHash={};var self=this;function tableNamesCallback(tableNames)
{var tableNamesLength=tableNames.length;for(var i=0;i<tableNamesLength;++i)
tableNamesHash[tableNames[i]]=true;for(var tableName in tableViews){if(!(tableName in tableNamesHash)){if(self.visibleView===tableViews[tableName])
self.closeVisibleView();delete tableViews[tableName];}}}
database.getTableNames(tableNamesCallback);},_populateDOMStorageTree:function()
{this._domStorageModel.storages().forEach(this._addDOMStorage.bind(this));this._domStorageModel.addEventListener(WebInspector.DOMStorageModel.Events.DOMStorageAdded,this._domStorageAdded,this);this._domStorageModel.addEventListener(WebInspector.DOMStorageModel.Events.DOMStorageRemoved,this._domStorageRemoved,this);},_populateApplicationCacheTree:function()
{this._applicationCacheModel=new WebInspector.ApplicationCacheModel(this._target);this._applicationCacheViews={};this._applicationCacheFrameElements={};this._applicationCacheManifestElements={};this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestAdded,this._applicationCacheFrameManifestAdded,this);this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestRemoved,this._applicationCacheFrameManifestRemoved,this);this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestsReset,this._resetAppCache,this);this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestStatusUpdated,this._applicationCacheFrameManifestStatusChanged,this);this._applicationCacheModel.addEventListener(WebInspector.ApplicationCacheModel.EventTypes.NetworkStateChanged,this._applicationCacheNetworkStateChanged,this);},_applicationCacheFrameManifestAdded:function(event)
{var frameId=event.data;var manifestURL=this._applicationCacheModel.frameManifestURL(frameId);var manifestTreeElement=this._applicationCacheManifestElements[manifestURL];if(!manifestTreeElement){manifestTreeElement=new WebInspector.ApplicationCacheManifestTreeElement(this,manifestURL);this.applicationCacheListTreeElement.appendChild(manifestTreeElement);this._applicationCacheManifestElements[manifestURL]=manifestTreeElement;}
var frameTreeElement=new WebInspector.ApplicationCacheFrameTreeElement(this,frameId,manifestURL);manifestTreeElement.appendChild(frameTreeElement);manifestTreeElement.expand();this._applicationCacheFrameElements[frameId]=frameTreeElement;},_applicationCacheFrameManifestRemoved:function(event)
{var frameId=event.data;var frameTreeElement=this._applicationCacheFrameElements[frameId];if(!frameTreeElement)
return;var manifestURL=frameTreeElement.manifestURL;delete this._applicationCacheFrameElements[frameId];delete this._applicationCacheViews[frameId];frameTreeElement.parent.removeChild(frameTreeElement);var manifestTreeElement=this._applicationCacheManifestElements[manifestURL];if(manifestTreeElement.childCount())
return;delete this._applicationCacheManifestElements[manifestURL];manifestTreeElement.parent.removeChild(manifestTreeElement);},_applicationCacheFrameManifestStatusChanged:function(event)
{var frameId=event.data;var status=this._applicationCacheModel.frameManifestStatus(frameId);if(this._applicationCacheViews[frameId])
this._applicationCacheViews[frameId].updateStatus(status);},_applicationCacheNetworkStateChanged:function(event)
{var isNowOnline=event.data;for(var manifestURL in this._applicationCacheViews)
this._applicationCacheViews[manifestURL].updateNetworkState(isNowOnline);},_findTreeElementForResource:function(resource)
{return resource[WebInspector.FrameResourceTreeElement._symbol];},showView:function(view)
{if(view)
this.showResource(view.resource);},_onmousemove:function(event)
{var nodeUnderMouse=event.target;if(!nodeUnderMouse)
return;var listNode=nodeUnderMouse.enclosingNodeOrSelfWithNodeName("li");if(!listNode)
return;var element=listNode.treeElement;if(this._previousHoveredElement===element)
return;if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
if(element instanceof WebInspector.FrameTreeElement){this._previousHoveredElement=element;element.hovered=true;}},_onmouseleave:function(event)
{if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}},__proto__:WebInspector.PanelWithSidebar.prototype}
WebInspector.ResourcesPanel.ResourceRevealer=function()
{}
WebInspector.ResourcesPanel.ResourceRevealer.prototype={reveal:function(resource,lineNumber)
{if(!(resource instanceof WebInspector.Resource))
return Promise.reject(new Error("Internal error: not a resource"));var panel=WebInspector.ResourcesPanel._instance();WebInspector.inspectorView.setCurrentPanel(panel);panel.showResource(resource,lineNumber);return Promise.resolve();}}
WebInspector.BaseStorageTreeElement=function(storagePanel,title,iconClasses,expandable,noIcon)
{TreeElement.call(this,title,expandable);this._storagePanel=storagePanel;for(var i=0;iconClasses&&i<iconClasses.length;++i)
this.listItemElement.classList.add(iconClasses[i]);this._iconClasses=iconClasses;if(!noIcon)
this.createIcon();}
WebInspector.BaseStorageTreeElement.prototype={onselect:function(selectedByUser)
{if(!selectedByUser)
return false;var itemURL=this.itemURL;if(itemURL)
this._storagePanel._resourcesLastSelectedItemSetting.set(itemURL);return false;},__proto__:TreeElement.prototype}
WebInspector.StorageCategoryTreeElement=function(storagePanel,categoryName,settingsKey,iconClasses,noIcon)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,categoryName,iconClasses,false,noIcon);this._expandedSetting=WebInspector.settings.createSetting("resources"+settingsKey+"Expanded",settingsKey==="Frames");this._categoryName=categoryName;}
WebInspector.StorageCategoryTreeElement.prototype={target:function()
{return this._storagePanel._target;},get itemURL()
{return"category://"+this._categoryName;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showCategoryView(this._categoryName);return false;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);if(this._expandedSetting.get())
this.expand();},onexpand:function()
{this._expandedSetting.set(true);},oncollapse:function()
{this._expandedSetting.set(false);},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.FrameTreeElement=function(storagePanel,frame)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,"",["navigator-tree-item","navigator-folder-tree-item"]);this._frame=frame;this.frameNavigated(frame);}
WebInspector.FrameTreeElement.prototype={frameNavigated:function(frame)
{this.removeChildren();this._frameId=frame.id;this.title=frame.displayName();this._categoryElements={};this._treeElementForResource={};this._storagePanel.addDocumentURL(frame.url);},get itemURL()
{return"frame://"+encodeURI(this.titleAsText());},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showCategoryView(this.titleAsText());this.listItemElement.classList.remove("hovered");WebInspector.DOMModel.hideDOMNodeHighlight();return false;},set hovered(hovered)
{if(hovered){this.listItemElement.classList.add("hovered");var domModel=WebInspector.DOMModel.fromTarget(this._frame.target());if(domModel)
domModel.highlightFrame(this._frameId);}else{this.listItemElement.classList.remove("hovered");WebInspector.DOMModel.hideDOMNodeHighlight();}},appendResource:function(resource)
{if(resource.isHidden())
return;var resourceType=resource.resourceType();var categoryName=resourceType.name();var categoryElement=resourceType===WebInspector.resourceTypes.Document?this:this._categoryElements[categoryName];if(!categoryElement){categoryElement=new WebInspector.StorageCategoryTreeElement(this._storagePanel,resource.resourceType().category().title,categoryName,null,true);this._categoryElements[resourceType.name()]=categoryElement;this._insertInPresentationOrder(this,categoryElement);}
var resourceTreeElement=new WebInspector.FrameResourceTreeElement(this._storagePanel,resource);this._insertInPresentationOrder(categoryElement,resourceTreeElement);this._treeElementForResource[resource.url]=resourceTreeElement;},resourceByURL:function(url)
{var treeElement=this._treeElementForResource[url];return treeElement?treeElement._resource:null;},appendChild:function(treeElement)
{this._insertInPresentationOrder(this,treeElement);},_insertInPresentationOrder:function(parentTreeElement,childTreeElement)
{function typeWeight(treeElement)
{if(treeElement instanceof WebInspector.StorageCategoryTreeElement)
return 2;if(treeElement instanceof WebInspector.FrameTreeElement)
return 1;return 3;}
function compare(treeElement1,treeElement2)
{var typeWeight1=typeWeight(treeElement1);var typeWeight2=typeWeight(treeElement2);var result;if(typeWeight1>typeWeight2)
result=1;else if(typeWeight1<typeWeight2)
result=-1;else
result=treeElement1.titleAsText().localeCompare(treeElement2.titleAsText());return result;}
var childCount=parentTreeElement.childCount();var i;for(i=0;i<childCount;++i){if(compare(childTreeElement,parentTreeElement.childAt(i))<0)
break;}
parentTreeElement.insertChild(childTreeElement,i);},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.FrameResourceTreeElement=function(storagePanel,resource)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,resource.displayName,["navigator-tree-item","navigator-file-tree-item","navigator-"+resource.resourceType().name()+"-tree-item"]);this._resource=resource;this.tooltip=resource.url;this._resource[WebInspector.FrameResourceTreeElement._symbol]=this;}
WebInspector.FrameResourceTreeElement._symbol=Symbol("treeElement");WebInspector.FrameResourceTreeElement.prototype={get itemURL()
{return this._resource.url;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel._showResourceView(this._resource);return false;},ondblclick:function(event)
{InspectorFrontendHost.openInNewTab(this._resource.url);return false;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);this.listItemElement.draggable=true;this.listItemElement.addEventListener("dragstart",this._ondragstart.bind(this),false);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_ondragstart:function(event)
{event.dataTransfer.setData("text/plain",this._resource.content||"");event.dataTransfer.effectAllowed="copy";return true;},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendApplicableItems(this._resource);contextMenu.show();},sourceView:function()
{if(!this._sourceView){var sourceFrame=new WebInspector.ResourceSourceFrame(this._resource);sourceFrame.setHighlighterType(this._resource.canonicalMimeType());this._sourceView=sourceFrame;}
return this._sourceView;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.DatabaseTreeElement=function(storagePanel,database)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,database.name,["database-storage-tree-item"],true);this._database=database;}
WebInspector.DatabaseTreeElement.prototype={get itemURL()
{return"database://"+encodeURI(this._database.name);},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel._showDatabase(this._database);return false;},onexpand:function()
{this._updateChildren();},_updateChildren:function()
{this.removeChildren();function tableNamesCallback(tableNames)
{var tableNamesLength=tableNames.length;for(var i=0;i<tableNamesLength;++i)
this.appendChild(new WebInspector.DatabaseTableTreeElement(this._storagePanel,this._database,tableNames[i]));}
this._database.getTableNames(tableNamesCallback.bind(this));},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.DatabaseTableTreeElement=function(storagePanel,database,tableName)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,tableName,["database-table-storage-tree-item"]);this._database=database;this._tableName=tableName;}
WebInspector.DatabaseTableTreeElement.prototype={get itemURL()
{return"database://"+encodeURI(this._database.name)+"/"+encodeURI(this._tableName);},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel._showDatabase(this._database,this._tableName);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.ServiceWorkerCacheTreeElement=function(storagePanel)
{WebInspector.StorageCategoryTreeElement.call(this,storagePanel,WebInspector.UIString("Cache Storage"),"CacheStorage",["service-worker-cache-storage-tree-item"]);}
WebInspector.ServiceWorkerCacheTreeElement.prototype={_initialize:function()
{this._swCacheTreeElements=[];var target=this._storagePanel._target;if(target){var model=WebInspector.ServiceWorkerCacheModel.fromTarget(target);var caches=model.caches();for(var cache of caches)
this._addCache(model,cache);}
WebInspector.targetManager.addModelListener(WebInspector.ServiceWorkerCacheModel,WebInspector.ServiceWorkerCacheModel.EventTypes.CacheAdded,this._cacheAdded,this);WebInspector.targetManager.addModelListener(WebInspector.ServiceWorkerCacheModel,WebInspector.ServiceWorkerCacheModel.EventTypes.CacheRemoved,this._cacheRemoved,this);},onattach:function()
{WebInspector.StorageCategoryTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Refresh Caches"),this._refreshCaches.bind(this));contextMenu.show();},_refreshCaches:function()
{var target=this._storagePanel._target;if(target){var model=WebInspector.ServiceWorkerCacheModel.fromTarget(target);model.refreshCacheNames();}},_cacheAdded:function(event)
{var cache=(event.data);var model=(event.target);this._addCache(model,cache);},_addCache:function(model,cache)
{var swCacheTreeElement=new WebInspector.SWCacheTreeElement(this._storagePanel,model,cache);this._swCacheTreeElements.push(swCacheTreeElement);this.appendChild(swCacheTreeElement);},_cacheRemoved:function(event)
{var cache=(event.data);var model=(event.target);var swCacheTreeElement=this._cacheTreeElement(model,cache);if(!swCacheTreeElement)
return;swCacheTreeElement.clear();this.removeChild(swCacheTreeElement);this._swCacheTreeElements.remove(swCacheTreeElement);},_cacheTreeElement:function(model,cache)
{var index=-1;for(var i=0;i<this._swCacheTreeElements.length;++i){if(this._swCacheTreeElements[i]._cache.equals(cache)&&this._swCacheTreeElements[i]._model===model){index=i;break;}}
if(index!==-1)
return this._swCacheTreeElements[i];return null;},__proto__:WebInspector.StorageCategoryTreeElement.prototype}
WebInspector.SWCacheTreeElement=function(storagePanel,model,cache)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,cache.cacheName+" - "+cache.securityOrigin,["service-worker-cache-tree-item"]);this._model=model;this._cache=cache;}
WebInspector.SWCacheTreeElement.prototype={get itemURL()
{return"cache://"+this._cache.cacheId;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Delete"),this._clearCache.bind(this));contextMenu.show();},_clearCache:function()
{this._model.deleteCache(this._cache);},update:function(cache)
{this._cache=cache;if(this._view)
this._view.update(cache);},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.ServiceWorkerCacheView(this._model,this._cache);this._storagePanel._innerShowView(this._view);return false;},clear:function()
{if(this._view)
this._view.clear();},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.ServiceWorkersTreeElement=function(storagePanel)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,WebInspector.UIString("Service Workers"),[],false,true);}
WebInspector.ServiceWorkersTreeElement.prototype={get itemURL()
{return"service-workers://";},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.ServiceWorkersView();this._storagePanel._innerShowView(this._view);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.AppManifestTreeElement=function(storagePanel)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,WebInspector.UIString("Manifest"),[],false,true);}
WebInspector.AppManifestTreeElement.prototype={get itemURL()
{return"manifest://";},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.AppManifestView();this._storagePanel._innerShowView(this._view);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.ClearStorageTreeElement=function(storagePanel)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,WebInspector.UIString("Clear storage"),[],false,true);}
WebInspector.ClearStorageTreeElement.prototype={get itemURL()
{return"clear-storage://";},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.ClearStorageView(this._storagePanel);this._storagePanel._innerShowView(this._view);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.IndexedDBTreeElement=function(storagePanel)
{WebInspector.StorageCategoryTreeElement.call(this,storagePanel,WebInspector.UIString("IndexedDB"),"IndexedDB",["indexed-db-storage-tree-item"]);}
WebInspector.IndexedDBTreeElement.prototype={_initialize:function()
{WebInspector.targetManager.addModelListener(WebInspector.IndexedDBModel,WebInspector.IndexedDBModel.EventTypes.DatabaseAdded,this._indexedDBAdded,this);WebInspector.targetManager.addModelListener(WebInspector.IndexedDBModel,WebInspector.IndexedDBModel.EventTypes.DatabaseRemoved,this._indexedDBRemoved,this);WebInspector.targetManager.addModelListener(WebInspector.IndexedDBModel,WebInspector.IndexedDBModel.EventTypes.DatabaseLoaded,this._indexedDBLoaded,this);this._idbDatabaseTreeElements=[];var targets=WebInspector.targetManager.targets();for(var i=0;i<targets.length;++i){var indexedDBModel=WebInspector.IndexedDBModel.fromTarget(targets[i]);var databases=indexedDBModel.databases();for(var j=0;j<databases.length;++j)
this._addIndexedDB(indexedDBModel,databases[j]);}},onattach:function()
{WebInspector.StorageCategoryTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Refresh IndexedDB"),this.refreshIndexedDB.bind(this));contextMenu.show();},refreshIndexedDB:function()
{var targets=WebInspector.targetManager.targets();for(var i=0;i<targets.length;++i)
WebInspector.IndexedDBModel.fromTarget(targets[i]).refreshDatabaseNames();},_indexedDBAdded:function(event)
{var databaseId=(event.data);var model=(event.target);this._addIndexedDB(model,databaseId);},_addIndexedDB:function(model,databaseId)
{var idbDatabaseTreeElement=new WebInspector.IDBDatabaseTreeElement(this._storagePanel,model,databaseId);this._idbDatabaseTreeElements.push(idbDatabaseTreeElement);this.appendChild(idbDatabaseTreeElement);model.refreshDatabase(databaseId);},_indexedDBRemoved:function(event)
{var databaseId=(event.data);var model=(event.target);var idbDatabaseTreeElement=this._idbDatabaseTreeElement(model,databaseId)
if(!idbDatabaseTreeElement)
return;idbDatabaseTreeElement.clear();this.removeChild(idbDatabaseTreeElement);this._idbDatabaseTreeElements.remove(idbDatabaseTreeElement);},_indexedDBLoaded:function(event)
{var database=(event.data);var model=(event.target);var idbDatabaseTreeElement=this._idbDatabaseTreeElement(model,database.databaseId);if(!idbDatabaseTreeElement)
return;idbDatabaseTreeElement.update(database);},_idbDatabaseTreeElement:function(model,databaseId)
{var index=-1;for(var i=0;i<this._idbDatabaseTreeElements.length;++i){if(this._idbDatabaseTreeElements[i]._databaseId.equals(databaseId)&&this._idbDatabaseTreeElements[i]._model===model){index=i;break;}}
if(index!==-1)
return this._idbDatabaseTreeElements[i];return null;},__proto__:WebInspector.StorageCategoryTreeElement.prototype}
WebInspector.IDBDatabaseTreeElement=function(storagePanel,model,databaseId)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,databaseId.name+" - "+databaseId.securityOrigin,["indexed-db-storage-tree-item"]);this._model=model;this._databaseId=databaseId;this._idbObjectStoreTreeElements={};}
WebInspector.IDBDatabaseTreeElement.prototype={get itemURL()
{return"indexedDB://"+this._databaseId.securityOrigin+"/"+this._databaseId.name;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Refresh IndexedDB"),this._refreshIndexedDB.bind(this));contextMenu.show();},_refreshIndexedDB:function()
{this._model.refreshDatabaseNames();},update:function(database)
{this._database=database;var objectStoreNames={};for(var objectStoreName in this._database.objectStores){var objectStore=this._database.objectStores[objectStoreName];objectStoreNames[objectStore.name]=true;if(!this._idbObjectStoreTreeElements[objectStore.name]){var idbObjectStoreTreeElement=new WebInspector.IDBObjectStoreTreeElement(this._storagePanel,this._model,this._databaseId,objectStore);this._idbObjectStoreTreeElements[objectStore.name]=idbObjectStoreTreeElement;this.appendChild(idbObjectStoreTreeElement);}
this._idbObjectStoreTreeElements[objectStore.name].update(objectStore);}
for(var objectStoreName in this._idbObjectStoreTreeElements){if(!objectStoreNames[objectStoreName])
this._objectStoreRemoved(objectStoreName);}
if(this._view)
this._view.update(database);this._updateTooltip();},_updateTooltip:function()
{this.tooltip=WebInspector.UIString("Version")+": "+this._database.version;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.IDBDatabaseView(this._database);this._storagePanel._innerShowView(this._view);return false;},_objectStoreRemoved:function(objectStoreName)
{var objectStoreTreeElement=this._idbObjectStoreTreeElements[objectStoreName];objectStoreTreeElement.clear();this.removeChild(objectStoreTreeElement);delete this._idbObjectStoreTreeElements[objectStoreName];},clear:function()
{for(var objectStoreName in this._idbObjectStoreTreeElements)
this._objectStoreRemoved(objectStoreName);},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.IDBObjectStoreTreeElement=function(storagePanel,model,databaseId,objectStore)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,objectStore.name,["indexed-db-object-store-storage-tree-item"]);this._model=model;this._databaseId=databaseId;this._idbIndexTreeElements={};}
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
if(this.childCount())
this.expand();if(this._view)
this._view.update(this._objectStore);this._updateTooltip();},_updateTooltip:function()
{var keyPathString=this._objectStore.keyPathString;var tooltipString=keyPathString!==null?(WebInspector.UIString("Key path: ")+keyPathString):"";if(this._objectStore.autoIncrement)
tooltipString+="\n"+WebInspector.UIString("autoIncrement");this.tooltip=tooltipString;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.IDBDataView(this._model,this._databaseId,this._objectStore,null);this._storagePanel._innerShowView(this._view);return false;},_indexRemoved:function(indexName)
{var indexTreeElement=this._idbIndexTreeElements[indexName];indexTreeElement.clear();this.removeChild(indexTreeElement);delete this._idbIndexTreeElements[indexName];},clear:function()
{for(var indexName in this._idbIndexTreeElements)
this._indexRemoved(indexName);if(this._view)
this._view.clear();},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.IDBIndexTreeElement=function(storagePanel,model,databaseId,objectStore,index)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,index.name,["indexed-db-index-storage-tree-item"]);this._model=model;this._databaseId=databaseId;this._objectStore=objectStore;this._index=index;}
WebInspector.IDBIndexTreeElement.prototype={get itemURL()
{return"indexedDB://"+this._databaseId.securityOrigin+"/"+this._databaseId.name+"/"+this._objectStore.name+"/"+this._index.name;},update:function(index)
{this._index=index;if(this._view)
this._view.update(this._index);this._updateTooltip();},_updateTooltip:function()
{var tooltipLines=[];var keyPathString=this._index.keyPathString;tooltipLines.push(WebInspector.UIString("Key path: ")+keyPathString);if(this._index.unique)
tooltipLines.push(WebInspector.UIString("unique"));if(this._index.multiEntry)
tooltipLines.push(WebInspector.UIString("multiEntry"));this.tooltip=tooltipLines.join("\n");},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);if(!this._view)
this._view=new WebInspector.IDBDataView(this._model,this._databaseId,this._objectStore,this._index);this._storagePanel._innerShowView(this._view);return false;},clear:function()
{if(this._view)
this._view.clear();},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.DOMStorageTreeElement=function(storagePanel,domStorage,className)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,domStorage.securityOrigin?domStorage.securityOrigin:WebInspector.UIString("Local Files"),["domstorage-storage-tree-item",className]);this._domStorage=domStorage;}
WebInspector.DOMStorageTreeElement.prototype={get itemURL()
{return"storage://"+this._domStorage.securityOrigin+"/"+(this._domStorage.isLocalStorage?"local":"session");},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel._showDOMStorage(this._domStorage);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.CookieTreeElement=function(storagePanel,cookieDomain)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,cookieDomain?cookieDomain:WebInspector.UIString("Local Files"),["cookie-storage-tree-item"]);this._cookieDomain=cookieDomain;}
WebInspector.CookieTreeElement.prototype={get itemURL()
{return"cookies://"+this._cookieDomain;},onattach:function()
{WebInspector.BaseStorageTreeElement.prototype.onattach.call(this);this.listItemElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),true);},_handleContextMenuEvent:function(event)
{var contextMenu=new WebInspector.ContextMenu(event);contextMenu.appendItem(WebInspector.UIString("Clear"),this._clearCookies.bind(this));contextMenu.show();},_clearCookies:function(domain)
{this._storagePanel.clearCookies(this._cookieDomain);},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showCookies(this,this._cookieDomain);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.ApplicationCacheManifestTreeElement=function(storagePanel,manifestURL)
{var title=new WebInspector.ParsedURL(manifestURL).displayName;WebInspector.BaseStorageTreeElement.call(this,storagePanel,title,["application-cache-storage-tree-item"]);this.tooltip=manifestURL;this._manifestURL=manifestURL;}
WebInspector.ApplicationCacheManifestTreeElement.prototype={get itemURL()
{return"appcache://"+this._manifestURL;},get manifestURL()
{return this._manifestURL;},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showCategoryView(this._manifestURL);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.ApplicationCacheFrameTreeElement=function(storagePanel,frameId,manifestURL)
{WebInspector.BaseStorageTreeElement.call(this,storagePanel,"",["navigator-tree-item","navigator-folder-tree-item"]);this._frameId=frameId;this._manifestURL=manifestURL;this._refreshTitles();}
WebInspector.ApplicationCacheFrameTreeElement.prototype={get itemURL()
{return"appcache://"+this._manifestURL+"/"+encodeURI(this.titleAsText());},get frameId()
{return this._frameId;},get manifestURL()
{return this._manifestURL;},_refreshTitles:function()
{var frame=this._storagePanel._target.resourceTreeModel.frameForId(this._frameId);this.title=frame.displayName();},frameNavigated:function()
{this._refreshTitles();},onselect:function(selectedByUser)
{WebInspector.BaseStorageTreeElement.prototype.onselect.call(this,selectedByUser);this._storagePanel.showApplicationCache(this._frameId);return false;},__proto__:WebInspector.BaseStorageTreeElement.prototype}
WebInspector.StorageCategoryView=function()
{WebInspector.VBox.call(this);this.element.classList.add("storage-view");this._emptyWidget=new WebInspector.EmptyWidget("");this._emptyWidget.show(this.element);}
WebInspector.StorageCategoryView.prototype={toolbarItems:function()
{return[];},setText:function(text)
{this._emptyWidget.text=text;},__proto__:WebInspector.VBox.prototype}
WebInspector.ResourcesPanel.show=function()
{WebInspector.inspectorView.setCurrentPanel(WebInspector.ResourcesPanel._instance());}
WebInspector.ResourcesPanel._instance=function()
{if(!WebInspector.ResourcesPanel._instanceObject)
WebInspector.ResourcesPanel._instanceObject=new WebInspector.ResourcesPanel();return WebInspector.ResourcesPanel._instanceObject;}
WebInspector.ResourcesPanelFactory=function()
{}
WebInspector.ResourcesPanelFactory.prototype={createPanel:function()
{return WebInspector.ResourcesPanel._instance();}};WebInspector.ServiceWorkerCacheView=function(model,cache)
{WebInspector.VBox.call(this);this.registerRequiredCSS("resources/serviceWorkerCacheViews.css");this._model=model;this.element.classList.add("service-worker-cache-data-view");this.element.classList.add("storage-view");this._createEditorToolbar();this._refreshButton=new WebInspector.ToolbarButton(WebInspector.UIString("Refresh"),"refresh-toolbar-item");this._refreshButton.addEventListener("click",this._refreshButtonClicked,this);this._pageSize=50;this._skipCount=0;this.update(cache);this._entries=[];}
WebInspector.ServiceWorkerCacheView.prototype={_createDataGrid:function()
{var columns=[];columns.push({id:"number",title:WebInspector.UIString("#"),width:"50px"});columns.push({id:"request",title:WebInspector.UIString("Request")});columns.push({id:"response",title:WebInspector.UIString("Response")});var dataGrid=new WebInspector.DataGrid(columns,undefined,this._deleteButtonClicked.bind(this),this._updateData.bind(this,true));return dataGrid;},_createEditorToolbar:function()
{var editorToolbar=new WebInspector.Toolbar("data-view-toolbar",this.element);this._pageBackButton=new WebInspector.ToolbarButton(WebInspector.UIString("Show previous page"),"play-backwards-toolbar-item");this._pageBackButton.addEventListener("click",this._pageBackButtonClicked,this);editorToolbar.appendToolbarItem(this._pageBackButton);this._pageForwardButton=new WebInspector.ToolbarButton(WebInspector.UIString("Show next page"),"play-toolbar-item");this._pageForwardButton.setEnabled(false);this._pageForwardButton.addEventListener("click",this._pageForwardButtonClicked,this);editorToolbar.appendToolbarItem(this._pageForwardButton);},_pageBackButtonClicked:function()
{this._skipCount=Math.max(0,this._skipCount-this._pageSize);this._updateData(false);},_pageForwardButtonClicked:function()
{this._skipCount=this._skipCount+this._pageSize;this._updateData(false);},_deleteButtonClicked:function(node)
{this._model.deleteCacheEntry(this._cache,node.data["request"],node.remove.bind(node));},update:function(cache)
{this._cache=cache;if(this._dataGrid)
this._dataGrid.asWidget().detach();this._dataGrid=this._createDataGrid();this._dataGrid.asWidget().show(this.element);this._skipCount=0;this._updateData(true);},_updateDataCallback(skipCount,entries,hasMore)
{this._refreshButton.setEnabled(true);this.clear();this._entries=entries;for(var i=0;i<entries.length;++i){var data={};data["number"]=i+skipCount;data["request"]=entries[i].request;data["response"]=entries[i].response;var node=new WebInspector.DataGridNode(data);node.selectable=true;this._dataGrid.rootNode().appendChild(node);}
this._pageBackButton.setEnabled(!!skipCount);this._pageForwardButton.setEnabled(hasMore);},_updateData:function(force)
{var pageSize=this._pageSize;var skipCount=this._skipCount;this._refreshButton.setEnabled(false);if(!force&&this._lastPageSize===pageSize&&this._lastSkipCount===skipCount)
return;if(this._lastPageSize!==pageSize){skipCount=0;this._skipCount=0;}
this._lastPageSize=pageSize;this._lastSkipCount=skipCount;this._model.loadCacheData(this._cache,skipCount,pageSize,this._updateDataCallback.bind(this,skipCount));},_refreshButtonClicked:function(event)
{this._updateData(true);},toolbarItems:function()
{return[this._refreshButton];},clear:function()
{this._dataGrid.rootNode().removeChildren();this._entries=[];},__proto__:WebInspector.VBox.prototype};WebInspector.ServiceWorkersView=function()
{WebInspector.VBox.call(this,true);this._reportView=new WebInspector.ReportView(WebInspector.UIString("Service Workers"));this._reportView.show(this.contentElement);this._toolbar=this._reportView.createToolbar();this._sections=new Map();WebInspector.targetManager.observeTargets(this);}
WebInspector.ServiceWorkersView.prototype={targetAdded:function(target)
{if(this._target||!target.serviceWorkerManager)
return;this._target=target;this._manager=this._target.serviceWorkerManager;this._toolbar.appendToolbarItem(WebInspector.NetworkConditionsSelector.createOfflineToolbarCheckbox());var forceUpdate=new WebInspector.ToolbarCheckbox(WebInspector.UIString("Update on reload"),WebInspector.UIString("Force update Service Worker on page reload"),this._manager.forceUpdateOnReloadSetting());this._toolbar.appendToolbarItem(forceUpdate);var fallbackToNetwork=new WebInspector.ToolbarCheckbox(WebInspector.UIString("Bypass for network"),WebInspector.UIString("Bypass Service Worker and load resources from the network"),target.networkManager.bypassServiceWorkerSetting());this._toolbar.appendToolbarItem(fallbackToNetwork);this._toolbar.appendSpacer();this._showAllCheckbox=new WebInspector.ToolbarCheckbox(WebInspector.UIString("Show all"),WebInspector.UIString("Show all Service Workers regardless of the origin"));this._showAllCheckbox.inputElement.addEventListener("change",this._updateSectionVisibility.bind(this),false);this._toolbar.appendToolbarItem(this._showAllCheckbox);for(var registration of this._manager.registrations().values())
this._updateRegistration(registration);this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated,this._registrationUpdated,this);this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationDeleted,this._registrationDeleted,this);this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationErrorAdded,this._registrationErrorAdded,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginAdded,this._updateSectionVisibility,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginRemoved,this._updateSectionVisibility,this);},targetRemoved:function(target)
{if(target!==this._target)
return;delete this._target;},_updateSectionVisibility:function()
{var securityOrigins=new Set(this._target.resourceTreeModel.securityOrigins());for(var section of this._sections.values()){var visible=this._showAllCheckbox.checked()||securityOrigins.has(section._registration.securityOrigin);section._section.element.classList.toggle("hidden",!visible);}},_registrationUpdated:function(event)
{var registration=(event.data);this._updateRegistration(registration);},_registrationErrorAdded:function(event)
{var registration=(event.data["registration"]);var error=(event.data["error"]);var section=this._sections.get(registration);if(!section)
return;section._addError(error);},_updateRegistration:function(registration)
{var section=this._sections.get(registration);if(!section){section=new WebInspector.ServiceWorkersView.Section(this._manager,this._reportView.appendSection(""),registration);this._sections.set(registration,section);}
this._updateSectionVisibility();section._scheduleUpdate();},_registrationDeleted:function(event)
{var registration=(event.data);var section=this._sections.get(registration);if(section)
section._section.remove();this._sections.delete(registration);},__proto__:WebInspector.VBox.prototype}
WebInspector.ServiceWorkersView.Section=function(manager,section,registration)
{this._manager=manager;this._section=section;this._registration=registration;this._toolbar=section.createToolbar();this._toolbar.renderAsLinks();this._updateButton=new WebInspector.ToolbarButton(WebInspector.UIString("Update"),undefined,WebInspector.UIString("Update"));this._updateButton.addEventListener("click",this._updateButtonClicked.bind(this));this._toolbar.appendToolbarItem(this._updateButton);this._pushButton=new WebInspector.ToolbarButton(WebInspector.UIString("Emulate push event"),undefined,WebInspector.UIString("Push"));this._pushButton.addEventListener("click",this._pushButtonClicked.bind(this));this._toolbar.appendToolbarItem(this._pushButton);this._deleteButton=new WebInspector.ToolbarButton(WebInspector.UIString("Unregister service worker"),undefined,WebInspector.UIString("Unregister"));this._deleteButton.addEventListener("click",this._unregisterButtonClicked.bind(this));this._toolbar.appendToolbarItem(this._deleteButton);this._section.appendField(WebInspector.UIString("Source"));this._section.appendField(WebInspector.UIString("Status"));this._section.appendField(WebInspector.UIString("Clients"));this._section.appendField(WebInspector.UIString("Errors"));this._errorsList=this._wrapWidget(this._section.appendRow());this._errorsList.classList.add("service-worker-error-stack","monospace","hidden");this._linkifier=new WebInspector.Linkifier();this._clientInfoCache=new Map();for(var error of registration.errors)
this._addError(error);this._throttler=new WebInspector.Throttler(500);}
WebInspector.ServiceWorkersView.Section.prototype={_scheduleUpdate:function()
{if(WebInspector.ServiceWorkersView._noThrottle){this._update();return;}
this._throttler.schedule(this._update.bind(this));},_update:function()
{var fingerprint=this._registration.fingerprint();if(fingerprint===this._fingerprint)
return Promise.resolve();this._fingerprint=fingerprint;this._toolbar.setEnabled(!this._registration.isDeleted);var versions=this._registration.versionsByMode();var title=this._registration.isDeleted?WebInspector.UIString("%s - deleted",this._registration.scopeURL):this._registration.scopeURL;this._section.setTitle(title);var active=versions.get(WebInspector.ServiceWorkerVersion.Modes.Active);var waiting=versions.get(WebInspector.ServiceWorkerVersion.Modes.Waiting);var installing=versions.get(WebInspector.ServiceWorkerVersion.Modes.Installing);var statusValue=this._wrapWidget(this._section.appendField(WebInspector.UIString("Status")));statusValue.removeChildren();var versionsStack=statusValue.createChild("div","service-worker-version-stack");versionsStack.createChild("div","service-worker-version-stack-bar");if(active){var scriptElement=this._section.appendField(WebInspector.UIString("Source"));scriptElement.removeChildren();var components=WebInspector.ParsedURL.splitURLIntoPathComponents(active.scriptURL);scriptElement.appendChild(WebInspector.linkifyURLAsNode(active.scriptURL,components.peekLast()));scriptElement.createChild("div","report-field-value-subtitle").textContent=WebInspector.UIString("Last modified %s",new Date(active.scriptLastModified*1000).toLocaleString());var activeEntry=versionsStack.createChild("div","service-worker-version");activeEntry.createChild("div","service-worker-active-circle");activeEntry.createChild("span").textContent=WebInspector.UIString("#%s activated and is %s",active.id,active.runningStatus);if(active.isRunning()||active.isStarting()){createLink(activeEntry,WebInspector.UIString("stop"),this._stopButtonClicked.bind(this,active.id));if(!this._manager.targetForVersionId(active.id))
createLink(activeEntry,WebInspector.UIString("inspect"),this._inspectButtonClicked.bind(this,active.id));}else if(active.isStartable()){createLink(activeEntry,WebInspector.UIString("start"),this._startButtonClicked.bind(this));}
var clientsList=this._wrapWidget(this._section.appendField(WebInspector.UIString("Clients")));clientsList.removeChildren();this._section.setFieldVisible(WebInspector.UIString("Clients"),active.controlledClients.length);for(var client of active.controlledClients){var clientLabelText=clientsList.createChild("div","service-worker-client");if(this._clientInfoCache.has(client))
this._updateClientInfo(clientLabelText,(this._clientInfoCache.get(client)));this._manager.getTargetInfo(client,this._onClientInfo.bind(this,clientLabelText));}}
if(waiting){var waitingEntry=versionsStack.createChild("div","service-worker-version");waitingEntry.createChild("div","service-worker-waiting-circle");waitingEntry.createChild("span").textContent=WebInspector.UIString("#%s waiting to activate",waiting.id);createLink(waitingEntry,WebInspector.UIString("skipWaiting"),this._skipButtonClicked.bind(this));waitingEntry.createChild("div","service-worker-subtitle").textContent=new Date(waiting.scriptLastModified*1000).toLocaleString();if(!this._manager.targetForVersionId(waiting.id)&&(waiting.isRunning()||waiting.isStarting()))
createLink(waitingEntry,WebInspector.UIString("inspect"),this._inspectButtonClicked.bind(this,waiting.id));}
if(installing){var installingEntry=versionsStack.createChild("div","service-worker-version");installingEntry.createChild("div","service-worker-installing-circle");installingEntry.createChild("span").textContent=WebInspector.UIString("#%s installing",installing.id);installingEntry.createChild("div","service-worker-subtitle").textContent=new Date(installing.scriptLastModified*1000).toLocaleString();if(!this._manager.targetForVersionId(installing.id)&&(installing.isRunning()||installing.isStarting()))
createLink(installingEntry,WebInspector.UIString("inspect"),this._inspectButtonClicked.bind(this,installing.id));}
this._section.setFieldVisible(WebInspector.UIString("Errors"),!!this._registration.errors.length);var errorsValue=this._wrapWidget(this._section.appendField(WebInspector.UIString("Errors")));var errorsLabel=createLabel(String(this._registration.errors.length),"error-icon");errorsLabel.classList.add("service-worker-errors-label");errorsValue.appendChild(errorsLabel);this._moreButton=createLink(errorsValue,this._errorsList.classList.contains("hidden")?WebInspector.UIString("details"):WebInspector.UIString("hide"),this._moreErrorsButtonClicked.bind(this));createLink(errorsValue,WebInspector.UIString("clear"),this._clearErrorsButtonClicked.bind(this));function createLink(parent,title,listener)
{var span=parent.createChild("span","link");span.textContent=title;span.addEventListener("click",listener,false);return span;}
return Promise.resolve();},_addError:function(error)
{var target=this._manager.targetForVersionId(error.versionId);var message=this._errorsList.createChild("div");if(this._errorsList.childElementCount>100)
this._errorsList.firstElementChild.remove();message.appendChild(this._linkifier.linkifyScriptLocation(target,null,error.sourceURL,error.lineNumber));message.appendChild(createLabel("#"+error.versionId+": "+error.errorMessage,"error-icon"));},_unregisterButtonClicked:function()
{this._manager.deleteRegistration(this._registration.id);},_updateButtonClicked:function()
{this._manager.updateRegistration(this._registration.id);},_pushButtonClicked:function()
{var data="Test push message from DevTools."
this._manager.deliverPushMessage(this._registration.id,data);},_onClientInfo:function(element,targetInfo)
{if(!targetInfo)
return;this._clientInfoCache.set(targetInfo.id,targetInfo);this._updateClientInfo(element,targetInfo);},_updateClientInfo:function(element,targetInfo)
{if(!(targetInfo.isWebContents()||targetInfo.isFrame())){element.createTextChild(WebInspector.UIString("Worker: %s",targetInfo.url));return;}
element.removeChildren();element.createTextChild(targetInfo.url);var focusLabel=element.createChild("label","link");focusLabel.createTextChild("focus");focusLabel.addEventListener("click",this._activateTarget.bind(this,targetInfo.id),true);},_activateTarget:function(targetId)
{this._manager.activateTarget(targetId);},_startButtonClicked:function()
{this._manager.startWorker(this._registration.scopeURL);},_skipButtonClicked:function()
{this._manager.skipWaiting(this._registration.scopeURL);},_stopButtonClicked:function(versionId)
{this._manager.stopWorker(versionId);},_moreErrorsButtonClicked:function()
{var newVisible=this._errorsList.classList.contains("hidden");this._moreButton.textContent=newVisible?WebInspector.UIString("hide"):WebInspector.UIString("details");this._errorsList.classList.toggle("hidden",!newVisible);},_clearErrorsButtonClicked:function()
{this._errorsList.removeChildren();this._registration.clearErrors();this._scheduleUpdate();if(!this._errorsList.classList.contains("hidden"))
this._moreErrorsButtonClicked();},_inspectButtonClicked:function(versionId)
{this._manager.inspectWorker(versionId);},_wrapWidget:function(container)
{var shadowRoot=WebInspector.createShadowRootWithCoreStyles(container);WebInspector.appendStyle(shadowRoot,"resources/serviceWorkersView.css");var contentElement=createElement("div");shadowRoot.appendChild(contentElement);return contentElement;},_dispose:function()
{this._linkifier.dispose();if(this._pendingUpdate)
clearTimeout(this._pendingUpdate);}};Runtime.cachedResources["resources/appManifestView.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n/*# sourceURL=resources/appManifestView.css */";Runtime.cachedResources["resources/clearStorageView.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.report-row {\n    display: flex;\n    align-items: center;\n}\n\n.clear-storage-button .report-row {\n    margin: 0 0 0 20px;\n    display: flex;\n}\n\n.link {\n    margin-left: 10px;\n    display: none;\n}\n\n.report-row:hover .link {\n    display: inline;\n}\n\n/*# sourceURL=resources/clearStorageView.css */";Runtime.cachedResources["resources/indexedDBViews.css"]="/*\n * Copyright (C) 2012 Google Inc. All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions are\n * met:\n *\n *     * Redistributions of source code must retain the above copyright\n * notice, this list of conditions and the following disclaimer.\n *     * Redistributions in binary form must reproduce the above\n * copyright notice, this list of conditions and the following disclaimer\n * in the documentation and/or other materials provided with the\n * distribution.\n *     * Neither the name of Google Inc. nor the names of its\n * contributors may be used to endorse or promote products derived from\n * this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n * \"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.indexed-db-database-view {\n    -webkit-user-select: text;\n    margin-top: 5px;\n}\n\n.indexed-db-database-view .outline-disclosure {\n    padding-left: 0;\n}\n\n.indexed-db-database-view .outline-disclosure li {\n    white-space: nowrap;\n}\n\n.indexed-db-database-view .outline-disclosure .attribute-name {\n    color: rgb(33%, 33%, 33%);\n    display: inline-block;\n    margin-right: 0.5em;\n    font-weight: bold;\n    vertical-align: top;\n}\n\n.indexed-db-database-view .outline-disclosure .attribute-value {\n    display: inline;\n    margin-top: 1px;\n}\n\n.indexed-db-data-view .data-view-toolbar {\n    position: relative;\n    background-color: #eee;\n    border-bottom: 1px solid #ccc;\n}\n\n.indexed-db-data-view .data-view-toolbar .key-input {\n    font-size: 11px;\n    margin: auto 0;\n    width: 200px;\n}\n\n.indexed-db-data-view .data-grid {\n    flex: auto;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-child(even) {\n    background-color: white;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-child(odd) {\n    background-color: #EAF3FF;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-last-child(1) {\n    background-color: white;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-last-child(1) td {\n    border: 0;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-last-child(2) td {\n    border-bottom: 1px solid #aaa;\n}\n\n.indexed-db-data-view .section,\n.indexed-db-data-view .section > .header,\n.indexed-db-data-view .section > .header .title {\n    margin: 0;\n    min-height: inherit;\n    line-height: inherit;\n}\n\n.indexed-db-data-view .primitive-value {\n    padding-top: 1px;\n}\n\n.indexed-db-data-view .data-grid .data-container td .section .header .title {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n.indexed-db-key-path {\n    color: rgb(196, 26, 22);\n    white-space: pre-wrap;\n    unicode-bidi: -webkit-isolate;\n}\n\n/*# sourceURL=resources/indexedDBViews.css */";Runtime.cachedResources["resources/resourcesPanel.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.resources.panel .sidebar {\n    padding-left: 0;\n    z-index: 10;\n    display: block;\n}\n\n.resources.panel .sidebar li {\n    height: 18px;\n    white-space: nowrap;\n    padding-top: 1px;\n    padding: 16px 0;\n}\n\n.resources.panel .sidebar li.selected {\n    color: white;\n}\n\n.resources.panel .sidebar li.selected .selection {\n    background-color: rgb(160, 160, 160);\n    border-top: 1px solid #979797;\n}\n\n.resources.panel .sidebar :focus li.selected .selection {\n    background-color: rgb(56, 121, 217);\n    border-top: 1px solid rgb(68, 128, 200);\n}\n\n.resources.panel .sidebar .icon {\n    width: 16px;\n    height: 16px;\n    position: relative;\n    top: 3px;\n    margin-top: -3px;\n    display: inline-block;\n}\n\n.resources-toolbar {\n    border-top: 1px solid #ccc;\n    background-color: #eee;\n}\n\nli.selected .base-storage-tree-element-subtitle {\n    color: white;\n}\n\n.base-storage-tree-element-subtitle {\n    padding-left: 2px;\n    color: rgb(80, 80, 80);\n    text-shadow: none;\n}\n\n.resources.panel .status {\n    float: right;\n    height: 16px;\n    margin-top: 1px;\n    margin-left: 4px;\n    line-height: 1em;\n}\n\n.storage-view {\n    display: flex;\n    overflow: hidden;\n}\n\n.storage-view {\n    overflow: hidden;\n}\n\n.storage-view .data-grid:not(.inline) {\n    border: none;\n    flex: auto;\n}\n\n.storage-view .storage-table-error {\n    color: rgb(66%, 33%, 33%);\n    font-size: 24px;\n    font-weight: bold;\n    padding: 10px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.storage-view.query {\n    padding: 2px 0;\n    overflow-y: overlay;\n    overflow-x: hidden;\n}\n\n.database-query-prompt {\n    position: relative;\n    padding: 1px 22px 1px 24px;\n    min-height: 16px;\n    white-space: pre-wrap;\n    -webkit-user-modify: read-write-plaintext-only;\n    -webkit-user-select: text;\n}\n\n.database-user-query::before,\n.database-query-prompt::before,\n.database-query-result::before {\n    position: absolute;\n    display: block;\n    content: \"\";\n    left: 7px;\n    top: 0.8em;\n    width: 10px;\n    height: 10px;\n    margin-top: -7px;\n    -webkit-user-select: none;\n    background-image: url(Images/toolbarButtonGlyphs.png);\n    background-size: 352px 168px;\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.5) {\n.database-user-query::before,\n.database-query-prompt::before,\n.database-query-result::before {\n    background-image: url(Images/toolbarButtonGlyphs_2x.png);\n}\n} /* media */\n\n.database-query-prompt::before {\n    background-position: -192px -96px;\n}\n\n.database-user-query {\n    position: relative;\n    border-bottom: 1px solid rgb(245, 245, 245);\n    padding: 1px 22px 1px 24px;\n    min-height: 16px;\n    flex-shrink: 0;\n}\n\n.database-user-query::before {\n    background-position: -192px -107px;\n}\n\n.database-query-text {\n    color: rgb(0, 128, 255);\n    -webkit-user-select: text;\n}\n\n.database-query-result {\n    position: relative;\n    padding: 1px 22px 1px 24px;\n    min-height: 16px;\n    margin-left: -24px;\n    padding-right: 0;\n}\n\n.database-query-result.error {\n    color: red;\n    -webkit-user-select: text;\n}\n\n.database-query-result.error::before {\n    background-position: -213px -96px;\n}\n\n.resource-sidebar-tree-item .icon {\n    content: url(Images/resourcePlainIconSmall.png);\n}\n\n.resource-sidebar-tree-item.resources-type-image .icon {\n    position: relative;\n    background-image: url(Images/resourcePlainIcon.png);\n    background-repeat: no-repeat;\n    content: \"\";\n}\n\n.resources-type-image .image-resource-icon-preview {\n    position: absolute;\n    margin: auto;\n    min-width: 1px;\n    min-height: 1px;\n    top: 2px;\n    bottom: 1px;\n    left: 3px;\n    right: 3px;\n    max-width: 8px;\n    max-height: 11px;\n    overflow: hidden;\n}\n\n.resources-sidebar {\n    padding-left: 0;\n}\n\n/*# sourceURL=resources/resourcesPanel.css */";Runtime.cachedResources["resources/resourcesSidebar.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline {\n    padding-left: 0;\n    color: rgb(90, 90, 90);\n}\n\n.tree-outline > ol {\n    padding-bottom: 10px;\n}\n\n.icon {\n    width: 16px;\n    height: 16px;\n    margin-right: 4px;\n}\n\n.tree-outline-disclosure li {\n    min-height: 20px;\n}\n\nli.storage-group-list-item {\n    border-top: 1px solid rgb(230, 230, 230);\n    padding: 10px 8px 6px 8px;\n}\n\nli.storage-group-list-item::before {\n    display: none;\n}\n\n.navigator-tree-item .icon {\n    -webkit-mask-image: url(Images/toolbarButtonGlyphs.png);\n    -webkit-mask-size: 352px 168px;\n    width: 32px;\n    height: 20px;\n    -webkit-mask-position: -224px -72px;\n    position: relative;\n    top: -2px;\n    margin-right: -3px;\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.5) {\n.navigator-tree-item .icon {\n    -webkit-mask-image: url(Images/toolbarButtonGlyphs_2x.png);\n}\n} /* media */\n\n.navigator-file-tree-item .icon {\n    -webkit-mask-position: -224px -72px;\n    background: linear-gradient(45deg, hsl(0, 0%, 50%), hsl(0, 0%, 70%));\n}\n\n:focus .navigator-file-tree-item.selected .icon {\n    background: white !important;\n}\n\n:focus .navigator-folder-tree-item.selected .icon {\n    background: white !important;\n}\n\n.navigator-folder-tree-item .icon {\n    -webkit-mask-position: -64px -120px;\n    background: linear-gradient(45deg, hsl(210, 82%, 65%), hsl(210, 82%, 80%));\n}\n\n.navigator-domain-tree-item .icon  {\n    -webkit-mask-position: -160px -144px;\n}\n\n.navigator-frame-tree-item .icon {\n    -webkit-mask-position: -256px -144px;\n}\n\n.navigator-script-tree-item .icon {\n    background: linear-gradient(45deg, hsl(48, 70%, 50%), hsl(48, 70%, 70%));\n}\n\n.navigator-stylesheet-tree-item .icon {\n    background: linear-gradient(45deg, hsl(256, 50%, 50%), hsl(256, 50%, 70%));\n}\n\n.navigator-image-tree-item .icon,\n.navigator-font-tree-item .icon {\n    background: linear-gradient(45deg, hsl(109, 33%, 50%), hsl(109, 33%, 70%));\n}\n\n.database-storage-tree-item .icon {\n    content: url(Images/database.png);\n}\n\n.database-table-storage-tree-item .icon {\n    content: url(Images/databaseTable.png);\n}\n\n.indexed-db-storage-tree-item .icon {\n    content: url(Images/indexedDB.png);\n}\n\n.indexed-db-object-store-storage-tree-item .icon {\n    content: url(Images/indexedDBObjectStore.png);\n}\n\n.indexed-db-index-storage-tree-item .icon {\n    content: url(Images/indexedDBIndex.png);\n}\n\n.service-worker-cache-tree-item .icon {\n    content: url(Images/indexedDBObjectStore.png);\n}\n\n.service-worker-cache-storage-tree-item .icon {\n    content: url(Images/indexedDB.png);\n}\n\n.service-workers-tree-item .icon {\n    content: url(Images/serviceWorker.svg);\n}\n\n:focus .service-workers-tree-item.selected .icon {\n    -webkit-filter: invert();\n}\n\n.-theme-with-dark-background .service-workers-tree-item .icon,\n{\n    -webkit-filter: invert(70%);\n}\n\n.domstorage-storage-tree-item.local-storage .icon {\n    content: url(Images/localStorage.png);\n}\n\n.domstorage-storage-tree-item.session-storage .icon {\n    content: url(Images/sessionStorage.png);\n}\n\n.cookie-storage-tree-item .icon {\n    content: url(Images/cookie.png);\n}\n\n.application-cache-storage-tree-item .icon {\n    content: url(Images/applicationCache.png);\n\n/*# sourceURL=resources/resourcesSidebar.css */";Runtime.cachedResources["resources/serviceWorkerCacheViews.css"]="/*\n * Copyright 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.service-worker-cache-data-view .data-view-toolbar {\n    position: relative;\n    background-color: #eee;\n    border-bottom: 1px solid #ccc;\n}\n\n.service-worker-cache-data-view .data-view-toolbar .key-input {\n    font-size: 11px;\n    margin: auto 0;\n    width: 200px;\n}\n\n.service-worker-cache-data-view .data-grid {\n    flex: auto;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-child(even) {\n    background-color: white;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-child(odd) {\n    background-color: #EAF3FF;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-last-child(1) {\n    background-color: white;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-last-child(1) td {\n    border: 0;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-last-child(2) td {\n    border-bottom: 1px solid #aaa;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr.selected {\n    background-color: rgb(212, 212, 212);\n    color: inherit;\n}\n\n.service-worker-cache-data-view .data-grid:focus .data-container tr.selected {\n    background-color: rgb(56, 121, 217);\n    color: white;\n}\n\n.service-worker-cache-data-view .section,\n.service-worker-cache-data-view .section > .header,\n.service-worker-cache-data-view .section > .header .title {\n    margin: 0;\n    min-height: inherit;\n    line-height: inherit;\n}\n\n.service-worker-cache-data-view .primitive-value {\n    padding-top: 1px;\n}\n\n.service-worker-cache-data-view .data-grid .data-container td .section .header .title {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n/*# sourceURL=resources/serviceWorkerCacheViews.css */";Runtime.cachedResources["resources/serviceWorkersView.css"]="/*\n * Copyright 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.service-worker-error-stack {\n    max-height: 200px;\n    overflow: auto;\n    display: flex;\n    flex-direction: column;\n    border: 1px solid #ccc;\n    background-color: #fff0f0;\n    color: red;\n    line-height: 18px;\n    margin: 10px 2px 0 -14px;\n    white-space: initial;\n}\n\n.service-worker-error-stack > div {\n    flex: none;\n    padding: 3px 4px;\n}\n\n.service-worker-error-stack > div:not(:last-child) {\n    border-bottom: 1px solid #ffd7d7;\n}\n\n.service-worker-error-stack label {\n    flex: auto;\n}\n\n.service-worker-error-stack a {\n    float: right;\n    color: rgb(33%, 33%, 33%);\n    cursor: pointer;\n}\n\n.service-worker-version-stack {\n    position: relative;\n}\n\n.service-worker-version-stack-bar {\n    position: absolute;\n    top: 10px;\n    bottom: 20px;\n    left: 4px;\n    content: \"\";\n    border-left: 1px solid #888;\n    z-index: 0;\n}\n\n.service-worker-version:not(:last-child) {\n    margin-bottom: 7px;\n}\n\n.service-worker-active-circle,\n.service-worker-waiting-circle,\n.service-worker-installing-circle {\n    position: relative;\n    display: inline-block;\n    width: 10px;\n    height: 10px;\n    z-index: 10;\n    margin-right: 5px;\n    border-radius: 50%;\n    border: 1px solid #555;\n}\n\n.service-worker-active-circle {\n    background-color: #50B04F;\n}\n.service-worker-waiting-circle {\n    background-color: #F38E24;\n\n}\n.service-worker-installing-circle {\n    background-color: white;\n}\n\n\n.service-worker-subtitle {\n    padding-left: 14px;\n    line-height: 14px;\n    color: #888;\n}\n\n.link {\n    margin-left: 10px;\n}\n\n/*# sourceURL=resources/serviceWorkersView.css */";