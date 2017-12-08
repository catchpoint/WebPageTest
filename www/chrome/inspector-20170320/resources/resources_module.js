Resources.ApplicationCacheModel=class extends SDK.SDKModel{constructor(target){super(target);target.registerApplicationCacheDispatcher(new Resources.ApplicationCacheDispatcher(this));this._agent=target.applicationCacheAgent();this._agent.enable();var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(target);resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated,this._frameNavigated,this);resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached,this._frameDetached,this);this._statuses={};this._manifestURLsByFrame={};this._mainFrameNavigated();this._onLine=true;}
static fromTarget(target){return target.model(Resources.ApplicationCacheModel);}
_frameNavigated(event){var frame=(event.data);if(frame.isMainFrame()){this._mainFrameNavigated();return;}
this._agent.getManifestForFrame(frame.id,this._manifestForFrameLoaded.bind(this,frame.id));}
_frameDetached(event){var frame=(event.data);this._frameManifestRemoved(frame.id);}
reset(){this._statuses={};this._manifestURLsByFrame={};this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.FrameManifestsReset);}
_mainFrameNavigated(){this._agent.getFramesWithManifests(this._framesWithManifestsLoaded.bind(this));}
_manifestForFrameLoaded(frameId,error,manifestURL){if(error){console.error(error);return;}
if(!manifestURL)
this._frameManifestRemoved(frameId);}
_framesWithManifestsLoaded(error,framesWithManifests){if(error){console.error(error);return;}
for(var i=0;i<framesWithManifests.length;++i){this._frameManifestUpdated(framesWithManifests[i].frameId,framesWithManifests[i].manifestURL,framesWithManifests[i].status);}}
_frameManifestUpdated(frameId,manifestURL,status){if(status===applicationCache.UNCACHED){this._frameManifestRemoved(frameId);return;}
if(!manifestURL)
return;if(this._manifestURLsByFrame[frameId]&&manifestURL!==this._manifestURLsByFrame[frameId])
this._frameManifestRemoved(frameId);var statusChanged=this._statuses[frameId]!==status;this._statuses[frameId]=status;if(!this._manifestURLsByFrame[frameId]){this._manifestURLsByFrame[frameId]=manifestURL;this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.FrameManifestAdded,frameId);}
if(statusChanged)
this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.FrameManifestStatusUpdated,frameId);}
_frameManifestRemoved(frameId){if(!this._manifestURLsByFrame[frameId])
return;delete this._manifestURLsByFrame[frameId];delete this._statuses[frameId];this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.FrameManifestRemoved,frameId);}
frameManifestURL(frameId){return this._manifestURLsByFrame[frameId]||'';}
frameManifestStatus(frameId){return this._statuses[frameId]||applicationCache.UNCACHED;}
get onLine(){return this._onLine;}
_statusUpdated(frameId,manifestURL,status){this._frameManifestUpdated(frameId,manifestURL,status);}
requestApplicationCache(frameId,callback){function callbackWrapper(error,applicationCache){if(error){console.error(error);callback(null);return;}
callback(applicationCache);}
this._agent.getApplicationCacheForFrame(frameId,callbackWrapper);}
_networkStateUpdated(isNowOnline){this._onLine=isNowOnline;this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.NetworkStateChanged,isNowOnline);}};SDK.SDKModel.register(Resources.ApplicationCacheModel,SDK.Target.Capability.DOM);Resources.ApplicationCacheModel.Events={FrameManifestStatusUpdated:Symbol('FrameManifestStatusUpdated'),FrameManifestAdded:Symbol('FrameManifestAdded'),FrameManifestRemoved:Symbol('FrameManifestRemoved'),FrameManifestsReset:Symbol('FrameManifestsReset'),NetworkStateChanged:Symbol('NetworkStateChanged')};Resources.ApplicationCacheDispatcher=class{constructor(applicationCacheModel){this._applicationCacheModel=applicationCacheModel;}
applicationCacheStatusUpdated(frameId,manifestURL,status){this._applicationCacheModel._statusUpdated(frameId,manifestURL,status);}
networkStateUpdated(isNowOnline){this._applicationCacheModel._networkStateUpdated(isNowOnline);}};;Resources.AppManifestView=class extends UI.VBox{constructor(){super(true);this.registerRequiredCSS('resources/appManifestView.css');this._emptyView=new UI.EmptyWidget(Common.UIString('No manifest detected'));var p=this._emptyView.appendParagraph();var linkElement=UI.createExternalLink('https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/?utm_source=devtools',Common.UIString('Read more about the web manifest'));p.appendChild(UI.formatLocalized('A web manifest allows you to control how your app behaves when launched and displayed to the user. %s',[linkElement]));this._emptyView.show(this.contentElement);this._emptyView.hideWidget();this._reportView=new UI.ReportView(Common.UIString('App Manifest'));this._reportView.show(this.contentElement);this._reportView.hideWidget();this._errorsSection=this._reportView.appendSection(Common.UIString('Errors and warnings'));this._identitySection=this._reportView.appendSection(Common.UIString('Identity'));var toolbar=this._identitySection.createToolbar();toolbar.renderAsLinks();var addToHomeScreen=new UI.ToolbarButton(Common.UIString('Add to homescreen'),undefined,Common.UIString('Add to homescreen'));addToHomeScreen.addEventListener(UI.ToolbarButton.Events.Click,this._addToHomescreen,this);toolbar.appendToolbarItem(addToHomeScreen);this._presentationSection=this._reportView.appendSection(Common.UIString('Presentation'));this._iconsSection=this._reportView.appendSection(Common.UIString('Icons'));this._nameField=this._identitySection.appendField(Common.UIString('Name'));this._shortNameField=this._identitySection.appendField(Common.UIString('Short name'));this._startURLField=this._presentationSection.appendField(Common.UIString('Start URL'));var themeColorField=this._presentationSection.appendField(Common.UIString('Theme color'));this._themeColorSwatch=InlineEditor.ColorSwatch.create();themeColorField.appendChild(this._themeColorSwatch);var backgroundColorField=this._presentationSection.appendField(Common.UIString('Background color'));this._backgroundColorSwatch=InlineEditor.ColorSwatch.create();backgroundColorField.appendChild(this._backgroundColorSwatch);this._orientationField=this._presentationSection.appendField(Common.UIString('Orientation'));this._displayField=this._presentationSection.appendField(Common.UIString('Display'));SDK.targetManager.observeTargets(this,SDK.Target.Capability.DOM);}
targetAdded(target){if(this._resourceTreeModel)
return;var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(target);if(!resourceTreeModel)
return;this._resourceTreeModel=resourceTreeModel;this._updateManifest();resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._updateManifest,this);}
targetRemoved(target){var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(target);if(!this._resourceTreeModel||this._resourceTreeModel!==resourceTreeModel)
return;resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._updateManifest,this);delete this._resourceTreeModel;}
_updateManifest(){this._resourceTreeModel.fetchAppManifest(this._renderManifest.bind(this));}
_renderManifest(url,data,errors){if(!data&&!errors.length){this._emptyView.showWidget();this._reportView.hideWidget();return;}
this._emptyView.hideWidget();this._reportView.showWidget();this._reportView.setURL(Components.Linkifier.linkifyURL(url));this._errorsSection.clearContent();this._errorsSection.element.classList.toggle('hidden',!errors.length);for(var error of errors){this._errorsSection.appendRow().appendChild(UI.createLabel(error.message,error.critical?'smallicon-error':'smallicon-warning'));}
if(!data)
return;var parsedManifest=JSON.parse(data);this._nameField.textContent=stringProperty('name');this._shortNameField.textContent=stringProperty('short_name');this._startURLField.removeChildren();var startURL=stringProperty('start_url');if(startURL){this._startURLField.appendChild(Components.Linkifier.linkifyURL((Common.ParsedURL.completeURL(url,startURL)),startURL));}
this._themeColorSwatch.classList.toggle('hidden',!stringProperty('theme_color'));var themeColor=Common.Color.parse(stringProperty('theme_color')||'white')||Common.Color.parse('white');this._themeColorSwatch.setColor((themeColor));this._backgroundColorSwatch.classList.toggle('hidden',!stringProperty('background_color'));var backgroundColor=Common.Color.parse(stringProperty('background_color')||'white')||Common.Color.parse('white');this._backgroundColorSwatch.setColor((backgroundColor));this._orientationField.textContent=stringProperty('orientation');this._displayField.textContent=stringProperty('display');var icons=parsedManifest['icons']||[];this._iconsSection.clearContent();for(var icon of icons){var title=(icon['sizes']||'')+'\n'+(icon['type']||'');var field=this._iconsSection.appendField(title);var imageElement=field.createChild('img');imageElement.style.maxWidth='200px';imageElement.style.maxHeight='200px';imageElement.src=Common.ParsedURL.completeURL(url,icon['src']);}
function stringProperty(name){var value=parsedManifest[name];if(typeof value!=='string')
return'';return value;}}
_addToHomescreen(event){var target=SDK.targetManager.mainTarget();if(target&&target.hasBrowserCapability()){target.pageAgent().requestAppBanner();Common.console.show();}}};;Resources.ApplicationCacheItemsView=class extends UI.SimpleView{constructor(model,frameId){super(Common.UIString('AppCache'));this._model=model;this.element.classList.add('storage-view','table');this._deleteButton=new UI.ToolbarButton(Common.UIString('Delete'),'largeicon-delete');this._deleteButton.setVisible(false);this._deleteButton.addEventListener(UI.ToolbarButton.Events.Click,this._deleteButtonClicked,this);this._connectivityIcon=createElement('label','dt-icon-label');this._connectivityIcon.style.margin='0 2px 0 5px';this._statusIcon=createElement('label','dt-icon-label');this._statusIcon.style.margin='0 2px 0 5px';this._frameId=frameId;this._emptyWidget=new UI.EmptyWidget(Common.UIString('No Application Cache information available.'));this._emptyWidget.show(this.element);this._markDirty();var status=this._model.frameManifestStatus(frameId);this.updateStatus(status);this.updateNetworkState(this._model.onLine);this._deleteButton.element.style.display='none';}
syncToolbarItems(){return[this._deleteButton,new UI.ToolbarItem(this._connectivityIcon),new UI.ToolbarSeparator(),new UI.ToolbarItem(this._statusIcon)];}
wasShown(){this._maybeUpdate();}
willHide(){this._deleteButton.setVisible(false);}
_maybeUpdate(){if(!this.isShowing()||!this._viewDirty)
return;this._update();this._viewDirty=false;}
_markDirty(){this._viewDirty=true;}
updateStatus(status){var oldStatus=this._status;this._status=status;var statusInformation={};statusInformation[applicationCache.UNCACHED]={type:'smallicon-red-ball',text:'UNCACHED'};statusInformation[applicationCache.IDLE]={type:'smallicon-green-ball',text:'IDLE'};statusInformation[applicationCache.CHECKING]={type:'smallicon-orange-ball',text:'CHECKING'};statusInformation[applicationCache.DOWNLOADING]={type:'smallicon-orange-ball',text:'DOWNLOADING'};statusInformation[applicationCache.UPDATEREADY]={type:'smallicon-green-ball',text:'UPDATEREADY'};statusInformation[applicationCache.OBSOLETE]={type:'smallicon-red-ball',text:'OBSOLETE'};var info=statusInformation[status]||statusInformation[applicationCache.UNCACHED];this._statusIcon.type=info.type;this._statusIcon.textContent=info.text;if(this.isShowing()&&this._status===applicationCache.IDLE&&(oldStatus===applicationCache.UPDATEREADY||!this._resources))
this._markDirty();this._maybeUpdate();}
updateNetworkState(isNowOnline){if(isNowOnline){this._connectivityIcon.type='smallicon-green-ball';this._connectivityIcon.textContent=Common.UIString('Online');}else{this._connectivityIcon.type='smallicon-red-ball';this._connectivityIcon.textContent=Common.UIString('Offline');}}
_update(){this._model.requestApplicationCache(this._frameId,this._updateCallback.bind(this));}
_updateCallback(applicationCache){if(!applicationCache||!applicationCache.manifestURL){delete this._manifest;delete this._creationTime;delete this._updateTime;delete this._size;delete this._resources;this._emptyWidget.show(this.element);this._deleteButton.setVisible(false);if(this._dataGrid)
this._dataGrid.element.classList.add('hidden');return;}
this._manifest=applicationCache.manifestURL;this._creationTime=applicationCache.creationTime;this._updateTime=applicationCache.updateTime;this._size=applicationCache.size;this._resources=applicationCache.resources;if(!this._dataGrid)
this._createDataGrid();this._populateDataGrid();this._dataGrid.autoSizeColumns(20,80);this._dataGrid.element.classList.remove('hidden');this._emptyWidget.detach();this._deleteButton.setVisible(true);}
_createDataGrid(){var columns=([{id:'resource',title:Common.UIString('Resource'),sort:DataGrid.DataGrid.Order.Ascending,sortable:true},{id:'type',title:Common.UIString('Type'),sortable:true},{id:'size',title:Common.UIString('Size'),align:DataGrid.DataGrid.Align.Right,sortable:true}]);this._dataGrid=new DataGrid.DataGrid(columns);this._dataGrid.asWidget().show(this.element);this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged,this._populateDataGrid,this);}
_populateDataGrid(){var selectedResource=this._dataGrid.selectedNode?this._dataGrid.selectedNode.resource:null;var sortDirection=this._dataGrid.isSortOrderAscending()?1:-1;function numberCompare(field,resource1,resource2){return sortDirection*(resource1[field]-resource2[field]);}
function localeCompare(field,resource1,resource2){return sortDirection*(resource1[field]+'').localeCompare(resource2[field]+'');}
var comparator;switch(this._dataGrid.sortColumnId()){case'resource':comparator=localeCompare.bind(null,'url');break;case'type':comparator=localeCompare.bind(null,'type');break;case'size':comparator=numberCompare.bind(null,'size');break;default:localeCompare.bind(null,'resource');}
this._resources.sort(comparator);this._dataGrid.rootNode().removeChildren();var nodeToSelect;for(var i=0;i<this._resources.length;++i){var data={};var resource=this._resources[i];data.resource=resource.url;data.type=resource.type;data.size=Number.bytesToString(resource.size);var node=new DataGrid.DataGridNode(data);node.resource=resource;node.selectable=true;this._dataGrid.rootNode().appendChild(node);if(resource===selectedResource){nodeToSelect=node;nodeToSelect.selected=true;}}
if(!nodeToSelect&&this._dataGrid.rootNode().children.length)
this._dataGrid.rootNode().children[0].selected=true;}
_deleteButtonClicked(event){if(!this._dataGrid||!this._dataGrid.selectedNode)
return;this._deleteCallback(this._dataGrid.selectedNode);}
_deleteCallback(node){}};;Resources.ClearStorageView=class extends UI.VBox{constructor(resourcesPanel){super(true);this._resourcesPanel=resourcesPanel;this._reportView=new UI.ReportView(Common.UIString('Clear storage'));this._reportView.registerRequiredCSS('resources/clearStorageView.css');this._reportView.element.classList.add('clear-storage-header');this._reportView.show(this.contentElement);this._settings=new Map();for(var type
of[Protocol.Storage.StorageType.Appcache,Protocol.Storage.StorageType.Cache_storage,Protocol.Storage.StorageType.Cookies,Protocol.Storage.StorageType.Indexeddb,Protocol.Storage.StorageType.Local_storage,Protocol.Storage.StorageType.Service_workers,Protocol.Storage.StorageType.Websql])
this._settings.set(type,Common.settings.createSetting('clear-storage-'+type,true));var application=this._reportView.appendSection(Common.UIString('Application'));this._appendItem(application,Common.UIString('Unregister service workers'),'service_workers');var storage=this._reportView.appendSection(Common.UIString('Storage'));this._appendItem(storage,Common.UIString('Local and session storage'),'local_storage');this._appendItem(storage,Common.UIString('Indexed DB'),'indexeddb');this._appendItem(storage,Common.UIString('Web SQL'),'websql');this._appendItem(storage,Common.UIString('Cookies'),'cookies');var caches=this._reportView.appendSection(Common.UIString('Cache'));this._appendItem(caches,Common.UIString('Cache storage'),'cache_storage');this._appendItem(caches,Common.UIString('Application cache'),'appcache');SDK.targetManager.observeTargets(this,SDK.Target.Capability.Browser);var footer=this._reportView.appendSection('','clear-storage-button').appendRow();this._clearButton=UI.createTextButton(Common.UIString('Clear site data'),this._clear.bind(this),Common.UIString('Clear site data'));footer.appendChild(this._clearButton);}
_appendItem(section,title,settingName){var row=section.appendRow();row.appendChild(UI.SettingsUI.createSettingCheckbox(title,this._settings.get(settingName),true));}
targetAdded(target){if(this._target)
return;this._target=target;var securityOriginManager=SDK.SecurityOriginManager.fromTarget(target);this._updateOrigin(securityOriginManager.mainSecurityOrigin());securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged,this._originChanged,this);}
targetRemoved(target){if(this._target!==target)
return;var securityOriginManager=SDK.SecurityOriginManager.fromTarget(target);securityOriginManager.removeEventListener(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged,this._originChanged,this);}
_originChanged(event){var origin=(event.data);this._updateOrigin(origin);}
_updateOrigin(url){this._securityOrigin=new Common.ParsedURL(url).securityOrigin();this._reportView.setSubtitle(this._securityOrigin);}
_clear(){var storageTypes=[];for(var type of this._settings.keys()){if(this._settings.get(type).get())
storageTypes.push(type);}
this._target.storageAgent().clearDataForOrigin(this._securityOrigin,storageTypes.join(','));var set=new Set(storageTypes);var hasAll=set.has(Protocol.Storage.StorageType.All);if(set.has(Protocol.Storage.StorageType.Cookies)||hasAll)
SDK.CookieModel.fromTarget(this._target).clear();if(set.has(Protocol.Storage.StorageType.Indexeddb)||hasAll){for(var target of SDK.targetManager.targets()){var indexedDBModel=Resources.IndexedDBModel.fromTarget(target);if(indexedDBModel)
indexedDBModel.clearForOrigin(this._securityOrigin);}}
if(set.has(Protocol.Storage.StorageType.Local_storage)||hasAll){var storageModel=Resources.DOMStorageModel.fromTarget(this._target);if(storageModel)
storageModel.clearForOrigin(this._securityOrigin);}
if(set.has(Protocol.Storage.StorageType.Websql)||hasAll){var databaseModel=Resources.DatabaseModel.fromTarget(this._target);if(databaseModel){databaseModel.disable();databaseModel.enable();}}
if(set.has(Protocol.Storage.StorageType.Cache_storage)||hasAll){var target=SDK.targetManager.mainTarget();var model=target&&SDK.ServiceWorkerCacheModel.fromTarget(target);if(model)
model.clearForOrigin(this._securityOrigin);}
if(set.has(Protocol.Storage.StorageType.Appcache)||hasAll){var appcacheModel=Resources.ApplicationCacheModel.fromTarget(this._target);if(appcacheModel)
appcacheModel.reset();}
this._clearButton.disabled=true;var label=this._clearButton.textContent;this._clearButton.textContent=Common.UIString('Clearing...');setTimeout(()=>{this._clearButton.disabled=false;this._clearButton.textContent=label;},500);}};;Resources.StorageItemsView=class extends UI.VBox{constructor(title,filterName){super(false);this._filterRegex=null;this._deleteAllButton=this._addButton(Common.UIString('Clear All'),'largeicon-clear',this.deleteAllItems);this._deleteSelectedButton=this._addButton(Common.UIString('Delete Selected'),'largeicon-delete',this.deleteSelectedItem);this._refreshButton=this._addButton(Common.UIString('Refresh'),'largeicon-refresh',this.refreshItems);this._mainToolbar=new UI.Toolbar('top-resources-toolbar',this.element);this._filterItem=new UI.ToolbarInput(Common.UIString('Filter'),0.4,undefined,true);this._filterItem.addEventListener(UI.ToolbarInput.Event.TextChanged,this._filterChanged,this);var toolbarItems=[this._refreshButton,this._deleteAllButton,this._deleteSelectedButton,this._filterItem];for(var item of toolbarItems)
this._mainToolbar.appendToolbarItem(item);this.element.addEventListener('contextmenu',this._showContextMenu.bind(this),true);}
_addButton(label,glyph,callback){var button=new UI.ToolbarButton(label,glyph);button.addEventListener(UI.ToolbarButton.Events.Click,callback,this);return button;}
_showContextMenu(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Refresh'),this.refreshItems.bind(this));contextMenu.show();}
_filterChanged(event){var text=(event.data);this._filterRegex=text?new RegExp(text.escapeForRegExp(),'i'):null;this.refreshItems();}
filter(items,keyFunction){if(!this._filterRegex)
return items;return items.filter(item=>this._filterRegex.test(keyFunction(item)));}
wasShown(){this.refreshItems();}
setCanDeleteAll(enabled){this._deleteAllButton.setEnabled(enabled);}
setCanDeleteSelected(enabled){this._deleteSelectedButton.setEnabled(enabled);}
setCanRefresh(enabled){this._refreshButton.setEnabled(enabled);}
setCanFilter(enabled){this._filterItem.setEnabled(enabled);}
deleteAllItems(){}
deleteSelectedItem(){}
refreshItems(){}};;Resources.CookieItemsView=class extends Resources.StorageItemsView{constructor(treeElement,model,cookieDomain){super(Common.UIString('Cookies'),'cookiesPanel');this.element.classList.add('storage-view');this._model=model;this._treeElement=treeElement;this._cookieDomain=cookieDomain;this._totalSize=0;this._cookiesTable=null;this.setCookiesDomain(model,cookieDomain);}
setCookiesDomain(model,domain){this._model=model;this._cookieDomain=domain;this.refreshItems();}
_saveCookie(newCookie,oldCookie,callback){if(!this._model){callback(Common.UIString('Unable to save the cookie'));return;}
if(oldCookie&&(newCookie.name()!==oldCookie.name()||newCookie.url()!==oldCookie.url()))
this._model.deleteCookie(oldCookie);this._model.saveCookie(newCookie,callback);}
_deleteCookie(cookie,callback){this._model.deleteCookie(cookie,callback);}
_updateWithCookies(allCookies){this._totalSize=allCookies.reduce((size,cookie)=>size+cookie.size(),0);if(!this._cookiesTable){this._cookiesTable=new CookieTable.CookiesTable(this._saveCookie.bind(this),this.refreshItems.bind(this),()=>this.setCanDeleteSelected(true),this._deleteCookie.bind(this));}
const parsedURL=this._cookieDomain.asParsedURL();const host=parsedURL?parsedURL.host:'';this._cookiesTable.setCookieDomain(host);var shownCookies=this.filter(allCookies,cookie=>`${cookie.name()} ${cookie.value()} ${cookie.domain()}`);this._cookiesTable.setCookies(shownCookies);this._cookiesTable.show(this.element);this.setCanFilter(true);this.setCanDeleteAll(true);this.setCanDeleteSelected(!!this._cookiesTable.selectedCookie());}
deleteAllItems(){this._model.clear(this._cookieDomain,()=>this.refreshItems());}
deleteSelectedItem(){var selectedCookie=this._cookiesTable.selectedCookie();if(selectedCookie)
this._model.deleteCookie(selectedCookie,()=>this.refreshItems());}
refreshItems(){this._model.getCookiesForDomain(this._cookieDomain,cookies=>this._updateWithCookies(cookies));}};;Resources.Database=class{constructor(model,id,domain,name,version){this._model=model;this._id=id;this._domain=domain;this._name=name;this._version=version;}
get id(){return this._id;}
get name(){return this._name;}
set name(x){this._name=x;}
get version(){return this._version;}
set version(x){this._version=x;}
get domain(){return this._domain;}
set domain(x){this._domain=x;}
getTableNames(callback){function sortingCallback(error,names){if(!error)
callback(names.sort());}
this._model._agent.getDatabaseTableNames(this._id,sortingCallback);}
executeSql(query,onSuccess,onError){function callback(error,columnNames,values,errorObj){if(error){onError(error);return;}
if(errorObj){var message;if(errorObj.message)
message=errorObj.message;else if(errorObj.code===2)
message=Common.UIString('Database no longer has expected version.');else
message=Common.UIString('An unexpected error %s occurred.',errorObj.code);onError(message);return;}
onSuccess(columnNames,values);}
this._model._agent.executeSQL(this._id,query,callback);}};Resources.DatabaseModel=class extends SDK.SDKModel{constructor(target){super(target);this._databases=[];this._agent=target.databaseAgent();this.target().registerDatabaseDispatcher(new Resources.DatabaseDispatcher(this));}
static fromTarget(target){return(target.model(Resources.DatabaseModel));}
enable(){if(this._enabled)
return;this._agent.enable();this._enabled=true;}
disable(){if(!this._enabled)
return;this._enabled=false;this._databases=[];this._agent.disable();this.emit(new Resources.DatabaseModel.DatabasesRemovedEvent());}
databases(){var result=[];for(var database of this._databases)
result.push(database);return result;}
_addDatabase(database){this._databases.push(database);this.emit(new Resources.DatabaseModel.DatabaseAddedEvent(database));}};SDK.SDKModel.register(Resources.DatabaseModel,SDK.Target.Capability.None);Resources.DatabaseModel.DatabaseAddedEvent=class{constructor(database){this.database=database;}};Resources.DatabaseModel.DatabasesRemovedEvent=class{};Resources.DatabaseDispatcher=class{constructor(model){this._model=model;}
addDatabase(payload){this._model._addDatabase(new Resources.Database(this._model,payload.id,payload.domain,payload.name,payload.version));}};Resources.DatabaseModel._symbol=Symbol('DatabaseModel');;Resources.DOMStorage=class extends Common.Object{constructor(model,securityOrigin,isLocalStorage){super();this._model=model;this._securityOrigin=securityOrigin;this._isLocalStorage=isLocalStorage;}
static storageId(securityOrigin,isLocalStorage){return{securityOrigin:securityOrigin,isLocalStorage:isLocalStorage};}
get id(){return Resources.DOMStorage.storageId(this._securityOrigin,this._isLocalStorage);}
get securityOrigin(){return this._securityOrigin;}
get isLocalStorage(){return this._isLocalStorage;}
getItems(callback){this._model._agent.getDOMStorageItems(this.id,callback);}
setItem(key,value){this._model._agent.setDOMStorageItem(this.id,key,value);}
removeItem(key){this._model._agent.removeDOMStorageItem(this.id,key);}
clear(){this._model._agent.clear(this.id);}};Resources.DOMStorage.Events={DOMStorageItemsCleared:Symbol('DOMStorageItemsCleared'),DOMStorageItemRemoved:Symbol('DOMStorageItemRemoved'),DOMStorageItemAdded:Symbol('DOMStorageItemAdded'),DOMStorageItemUpdated:Symbol('DOMStorageItemUpdated')};Resources.DOMStorageModel=class extends SDK.SDKModel{constructor(target){super(target);this._securityOriginManager=SDK.SecurityOriginManager.fromTarget(target);this._storages={};this._agent=target.domstorageAgent();}
static fromTarget(target){return(target.model(Resources.DOMStorageModel));}
enable(){if(this._enabled)
return;this.target().registerDOMStorageDispatcher(new Resources.DOMStorageDispatcher(this));this._securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded,this._securityOriginAdded,this);this._securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved,this._securityOriginRemoved,this);for(var securityOrigin of this._securityOriginManager.securityOrigins())
this._addOrigin(securityOrigin);this._agent.enable();this._enabled=true;}
clearForOrigin(origin){if(!this._enabled)
return;for(var isLocal of[true,false]){var key=this._storageKey(origin,isLocal);var storage=this._storages[key];storage.clear();}
this._removeOrigin(origin);this._addOrigin(origin);}
_securityOriginAdded(event){this._addOrigin((event.data));}
_addOrigin(securityOrigin){for(var isLocal of[true,false]){var key=this._storageKey(securityOrigin,isLocal);console.assert(!this._storages[key]);var storage=new Resources.DOMStorage(this,securityOrigin,isLocal);this._storages[key]=storage;this.dispatchEventToListeners(Resources.DOMStorageModel.Events.DOMStorageAdded,storage);}}
_securityOriginRemoved(event){this._removeOrigin((event.data));}
_removeOrigin(securityOrigin){for(var isLocal of[true,false]){var key=this._storageKey(securityOrigin,isLocal);var storage=this._storages[key];console.assert(storage);delete this._storages[key];this.dispatchEventToListeners(Resources.DOMStorageModel.Events.DOMStorageRemoved,storage);}}
_storageKey(securityOrigin,isLocalStorage){return JSON.stringify(Resources.DOMStorage.storageId(securityOrigin,isLocalStorage));}
_domStorageItemsCleared(storageId){var domStorage=this.storageForId(storageId);if(!domStorage)
return;var eventData={};domStorage.dispatchEventToListeners(Resources.DOMStorage.Events.DOMStorageItemsCleared,eventData);}
_domStorageItemRemoved(storageId,key){var domStorage=this.storageForId(storageId);if(!domStorage)
return;var eventData={key:key};domStorage.dispatchEventToListeners(Resources.DOMStorage.Events.DOMStorageItemRemoved,eventData);}
_domStorageItemAdded(storageId,key,value){var domStorage=this.storageForId(storageId);if(!domStorage)
return;var eventData={key:key,value:value};domStorage.dispatchEventToListeners(Resources.DOMStorage.Events.DOMStorageItemAdded,eventData);}
_domStorageItemUpdated(storageId,key,oldValue,value){var domStorage=this.storageForId(storageId);if(!domStorage)
return;var eventData={key:key,oldValue:oldValue,value:value};domStorage.dispatchEventToListeners(Resources.DOMStorage.Events.DOMStorageItemUpdated,eventData);}
storageForId(storageId){return this._storages[JSON.stringify(storageId)];}
storages(){var result=[];for(var id in this._storages)
result.push(this._storages[id]);return result;}};SDK.SDKModel.register(Resources.DOMStorageModel,SDK.Target.Capability.None);Resources.DOMStorageModel.Events={DOMStorageAdded:Symbol('DOMStorageAdded'),DOMStorageRemoved:Symbol('DOMStorageRemoved')};Resources.DOMStorageDispatcher=class{constructor(model){this._model=model;}
domStorageItemsCleared(storageId){this._model._domStorageItemsCleared(storageId);}
domStorageItemRemoved(storageId,key){this._model._domStorageItemRemoved(storageId,key);}
domStorageItemAdded(storageId,key,value){this._model._domStorageItemAdded(storageId,key,value);}
domStorageItemUpdated(storageId,key,oldValue,value){this._model._domStorageItemUpdated(storageId,key,oldValue,value);}};Resources.DOMStorageModel._symbol=Symbol('DomStorage');;Resources.DOMStorageItemsView=class extends Resources.StorageItemsView{constructor(domStorage){super(Common.UIString('DOM Storage'),'domStoragePanel');this._domStorage=domStorage;this.element.classList.add('storage-view','table');var columns=([{id:'key',title:Common.UIString('Key'),sortable:false,editable:true,weight:50},{id:'value',title:Common.UIString('Value'),sortable:false,editable:true,weight:50}]);this._dataGrid=new DataGrid.DataGrid(columns,this._editingCallback.bind(this),this._deleteCallback.bind(this));this._dataGrid.setName('DOMStorageItemsView');this._dataGrid.asWidget().show(this.element);this._listeners=[];this.setStorage(domStorage);}
setStorage(domStorage){Common.EventTarget.removeEventListeners(this._listeners);this._domStorage=domStorage;this._listeners=[this._domStorage.addEventListener(Resources.DOMStorage.Events.DOMStorageItemsCleared,this._domStorageItemsCleared,this),this._domStorage.addEventListener(Resources.DOMStorage.Events.DOMStorageItemRemoved,this._domStorageItemRemoved,this),this._domStorage.addEventListener(Resources.DOMStorage.Events.DOMStorageItemAdded,this._domStorageItemAdded,this),this._domStorage.addEventListener(Resources.DOMStorage.Events.DOMStorageItemUpdated,this._domStorageItemUpdated,this),];this.refreshItems();}
_domStorageItemsCleared(){if(!this.isShowing()||!this._dataGrid)
return;this._dataGrid.rootNode().removeChildren();this._dataGrid.addCreationNode(false);this.setCanDeleteSelected(false);}
_domStorageItemRemoved(event){if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;for(var i=0;i<children.length;++i){var childNode=children[i];if(childNode.data.key===storageData.key){rootNode.removeChild(childNode);this.setCanDeleteSelected(children.length>1);return;}}}
_domStorageItemAdded(event){if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;this.setCanDeleteSelected(true);for(var i=0;i<children.length;++i){if(children[i].data.key===storageData.key)
return;}
var childNode=new DataGrid.DataGridNode({key:storageData.key,value:storageData.value},false);rootNode.insertChild(childNode,children.length-1);}
_domStorageItemUpdated(event){if(!this.isShowing()||!this._dataGrid)
return;var storageData=event.data;var rootNode=this._dataGrid.rootNode();var children=rootNode.children;var keyFound=false;for(var i=0;i<children.length;++i){var childNode=children[i];if(childNode.data.key===storageData.key){if(keyFound){rootNode.removeChild(childNode);return;}
keyFound=true;if(childNode.data.value!==storageData.value){childNode.data.value=storageData.value;childNode.refresh();childNode.select();childNode.reveal();}
this.setCanDeleteSelected(true);}}}
_showDOMStorageItems(error,items){if(error)
return;var rootNode=this._dataGrid.rootNode();var selectedKey=null;for(var node of rootNode.children){if(!node.selected)
continue;selectedKey=node.data.key;break;}
rootNode.removeChildren();var selectedNode=null;var filteredItems=item=>`${item[0]} ${item[1]}`;for(var item of this.filter(items,filteredItems)){var key=item[0];var value=item[1];var node=new DataGrid.DataGridNode({key:key,value:value},false);node.selectable=true;rootNode.appendChild(node);if(!selectedNode||key===selectedKey)
selectedNode=node;}
if(selectedNode)
selectedNode.selected=true;this._dataGrid.addCreationNode(false);this.setCanDeleteSelected(!!selectedNode);}
deleteSelectedItem(){if(!this._dataGrid||!this._dataGrid.selectedNode)
return;this._deleteCallback(this._dataGrid.selectedNode);}
refreshItems(){this._domStorage.getItems((error,items)=>this._showDOMStorageItems(error,items));}
deleteAllItems(){this._domStorage.clear();this._domStorageItemsCleared();}
_editingCallback(editingNode,columnIdentifier,oldText,newText){var domStorage=this._domStorage;if(columnIdentifier==='key'){if(typeof oldText==='string')
domStorage.removeItem(oldText);domStorage.setItem(newText,editingNode.data.value||'');this._removeDupes(editingNode);}else{domStorage.setItem(editingNode.data.key||'',newText);}}
_removeDupes(masterNode){var rootNode=this._dataGrid.rootNode();var children=rootNode.children;for(var i=children.length-1;i>=0;--i){var childNode=children[i];if((childNode.data.key===masterNode.data.key)&&(masterNode!==childNode))
rootNode.removeChild(childNode);}}
_deleteCallback(node){if(!node||node.isCreationNode)
return;if(this._domStorage)
this._domStorage.removeItem(node.data.key);}};;Resources.DatabaseQueryView=class extends UI.VBox{constructor(database){super();this.database=database;this.element.classList.add('storage-view','query','monospace');this.element.addEventListener('selectstart',this._selectStart.bind(this),false);this._promptIcon=UI.Icon.create('smallicon-text-prompt','prompt-icon');this._promptElement=createElement('div');this._promptElement.appendChild(this._promptIcon);this._promptElement.className='database-query-prompt';this._promptElement.appendChild(createElement('br'));this._promptElement.addEventListener('keydown',this._promptKeyDown.bind(this),true);this.element.appendChild(this._promptElement);this._prompt=new UI.TextPrompt();this._prompt.initialize(this.completions.bind(this),' ');this._proxyElement=this._prompt.attach(this._promptElement);this.element.addEventListener('click',this._messagesClicked.bind(this),true);}
_messagesClicked(){if(!this._prompt.isCaretInsidePrompt()&&this.element.isComponentSelectionCollapsed())
this._prompt.moveCaretToEndOfPrompt();}
completions(expression,prefix,force){if(!prefix)
return Promise.resolve([]);var fulfill;var promise=new Promise(x=>fulfill=x);var results=[];prefix=prefix.toLowerCase();function accumulateMatches(textArray){for(var i=0;i<textArray.length;++i){var text=textArray[i].toLowerCase();if(text.length<prefix.length)
continue;if(!text.startsWith(prefix))
continue;results.push(textArray[i]);}}
function tableNamesCallback(tableNames){accumulateMatches(tableNames.map(function(name){return name+' ';}));accumulateMatches(['SELECT ','FROM ','WHERE ','LIMIT ','DELETE FROM ','CREATE ','DROP ','TABLE ','INDEX ','UPDATE ','INSERT INTO ','VALUES (']);fulfill(results.map(completion=>({text:completion})));}
this.database.getTableNames(tableNamesCallback);return promise;}
_selectStart(event){if(this._selectionTimeout)
clearTimeout(this._selectionTimeout);this._prompt.clearAutocomplete();function moveBackIfOutside(){delete this._selectionTimeout;if(!this._prompt.isCaretInsidePrompt()&&this.element.isComponentSelectionCollapsed())
this._prompt.moveCaretToEndOfPrompt();this._prompt.autoCompleteSoon();}
this._selectionTimeout=setTimeout(moveBackIfOutside.bind(this),100);}
_promptKeyDown(event){if(isEnterKey(event)){this._enterKeyPressed(event);return;}}
_enterKeyPressed(event){event.consume(true);this._prompt.clearAutocomplete();var query=this._prompt.text();if(!query.length)
return;this._prompt.setText('');this._promptElement.insertBefore(this._promptIcon,this._promptElement.firstChild);this.database.executeSql(query,this._queryFinished.bind(this,query),this._queryError.bind(this,query));}
_queryFinished(query,columnNames,values){var dataGrid=DataGrid.SortableDataGrid.create(columnNames,values);var trimmedQuery=query.trim();if(dataGrid){dataGrid.renderInline();this._appendViewQueryResult(trimmedQuery,dataGrid.asWidget());dataGrid.autoSizeColumns(5);}
if(trimmedQuery.match(/^create /i)||trimmedQuery.match(/^drop table /i))
this.dispatchEventToListeners(Resources.DatabaseQueryView.Events.SchemaUpdated,this.database);}
_queryError(query,errorMessage){this._appendErrorQueryResult(query,errorMessage);}
_appendViewQueryResult(query,view){var resultElement=this._appendQueryResult(query);view.show(resultElement);this._promptElement.scrollIntoView(false);}
_appendErrorQueryResult(query,errorText){var resultElement=this._appendQueryResult(query);resultElement.classList.add('error');resultElement.appendChild(UI.Icon.create('smallicon-error','prompt-icon'));resultElement.createTextChild(errorText);this._promptElement.scrollIntoView(false);}
_appendQueryResult(query){var element=createElement('div');element.className='database-user-query';element.appendChild(UI.Icon.create('smallicon-user-command','prompt-icon'));this.element.insertBefore(element,this._proxyElement);var commandTextElement=createElement('span');commandTextElement.className='database-query-text';commandTextElement.textContent=query;element.appendChild(commandTextElement);var resultElement=createElement('div');resultElement.className='database-query-result';element.appendChild(resultElement);return resultElement;}};Resources.DatabaseQueryView.Events={SchemaUpdated:Symbol('SchemaUpdated')};;Resources.DatabaseTableView=class extends UI.SimpleView{constructor(database,tableName){super(Common.UIString('Database'));this.database=database;this.tableName=tableName;this.element.classList.add('storage-view','table');this._visibleColumnsSetting=Common.settings.createSetting('databaseTableViewVisibleColumns',{});this.refreshButton=new UI.ToolbarButton(Common.UIString('Refresh'),'largeicon-refresh');this.refreshButton.addEventListener(UI.ToolbarButton.Events.Click,this._refreshButtonClicked,this);this._visibleColumnsInput=new UI.ToolbarInput(Common.UIString('Visible columns'),1);this._visibleColumnsInput.addEventListener(UI.ToolbarInput.Event.TextChanged,this._onVisibleColumnsChanged,this);}
wasShown(){this.update();}
syncToolbarItems(){return[this.refreshButton,this._visibleColumnsInput];}
_escapeTableName(tableName){return tableName.replace(/\"/g,'""');}
update(){this.database.executeSql('SELECT rowid, * FROM "'+this._escapeTableName(this.tableName)+'"',this._queryFinished.bind(this),this._queryError.bind(this));}
_queryFinished(columnNames,values){this.detachChildWidgets();this.element.removeChildren();this._dataGrid=DataGrid.SortableDataGrid.create(columnNames,values);this._visibleColumnsInput.setVisible(!!this._dataGrid);if(!this._dataGrid){this._emptyWidget=new UI.EmptyWidget(Common.UIString('The “%s”\ntable is empty.',this.tableName));this._emptyWidget.show(this.element);return;}
this._dataGrid.asWidget().show(this.element);this._dataGrid.autoSizeColumns(5);this._columnsMap=new Map();for(var i=1;i<columnNames.length;++i)
this._columnsMap.set(columnNames[i],String(i));this._lastVisibleColumns='';var visibleColumnsText=this._visibleColumnsSetting.get()[this.tableName]||'';this._visibleColumnsInput.setValue(visibleColumnsText);this._onVisibleColumnsChanged();}
_onVisibleColumnsChanged(){if(!this._dataGrid)
return;var text=this._visibleColumnsInput.value();var parts=text.split(/[\s,]+/);var matches=new Set();var columnsVisibility={};columnsVisibility['0']=true;for(var i=0;i<parts.length;++i){var part=parts[i];if(this._columnsMap.has(part)){matches.add(part);columnsVisibility[this._columnsMap.get(part)]=true;}}
var newVisibleColumns=matches.valuesArray().sort().join(', ');if(newVisibleColumns.length===0){for(var v of this._columnsMap.values())
columnsVisibility[v]=true;}
if(newVisibleColumns===this._lastVisibleColumns)
return;var visibleColumnsRegistry=this._visibleColumnsSetting.get();visibleColumnsRegistry[this.tableName]=text;this._visibleColumnsSetting.set(visibleColumnsRegistry);this._dataGrid.setColumnsVisiblity(columnsVisibility);this._lastVisibleColumns=newVisibleColumns;}
_queryError(error){this.detachChildWidgets();this.element.removeChildren();var errorMsgElement=createElement('div');errorMsgElement.className='storage-table-error';errorMsgElement.textContent=Common.UIString('An error occurred trying to\nread the “%s” table.',this.tableName);this.element.appendChild(errorMsgElement);}
_refreshButtonClicked(event){this.update();}};;Resources.IndexedDBModel=class extends SDK.SDKModel{constructor(target){super(target);this._securityOriginManager=SDK.SecurityOriginManager.fromTarget(target);this._agent=target.indexedDBAgent();this._databases=new Map();this._databaseNamesBySecurityOrigin={};}
static keyFromIDBKey(idbKey){if(typeof(idbKey)==='undefined'||idbKey===null)
return undefined;var type;var key={};switch(typeof(idbKey)){case'number':key.number=idbKey;type=Resources.IndexedDBModel.KeyTypes.NumberType;break;case'string':key.string=idbKey;type=Resources.IndexedDBModel.KeyTypes.StringType;break;case'object':if(idbKey instanceof Date){key.date=idbKey.getTime();type=Resources.IndexedDBModel.KeyTypes.DateType;}else if(Array.isArray(idbKey)){key.array=[];for(var i=0;i<idbKey.length;++i)
key.array.push(Resources.IndexedDBModel.keyFromIDBKey(idbKey[i]));type=Resources.IndexedDBModel.KeyTypes.ArrayType;}
break;default:return undefined;}
key.type=(type);return key;}
static keyRangeFromIDBKeyRange(idbKeyRange){if(typeof idbKeyRange==='undefined'||idbKeyRange===null)
return null;var keyRange={};keyRange.lower=Resources.IndexedDBModel.keyFromIDBKey(idbKeyRange.lower);keyRange.upper=Resources.IndexedDBModel.keyFromIDBKey(idbKeyRange.upper);keyRange.lowerOpen=!!idbKeyRange.lowerOpen;keyRange.upperOpen=!!idbKeyRange.upperOpen;return keyRange;}
static idbKeyPathFromKeyPath(keyPath){var idbKeyPath;switch(keyPath.type){case Resources.IndexedDBModel.KeyPathTypes.NullType:idbKeyPath=null;break;case Resources.IndexedDBModel.KeyPathTypes.StringType:idbKeyPath=keyPath.string;break;case Resources.IndexedDBModel.KeyPathTypes.ArrayType:idbKeyPath=keyPath.array;break;}
return idbKeyPath;}
static keyPathStringFromIDBKeyPath(idbKeyPath){if(typeof idbKeyPath==='string')
return'"'+idbKeyPath+'"';if(idbKeyPath instanceof Array)
return'["'+idbKeyPath.join('", "')+'"]';return null;}
static fromTarget(target){return(target.model(Resources.IndexedDBModel));}
enable(){if(this._enabled)
return;this._agent.enable();this._securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded,this._securityOriginAdded,this);this._securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved,this._securityOriginRemoved,this);for(var securityOrigin of this._securityOriginManager.securityOrigins())
this._addOrigin(securityOrigin);this._enabled=true;}
clearForOrigin(origin){if(!this._enabled)
return;this._removeOrigin(origin);this._addOrigin(origin);}
deleteDatabase(databaseId){if(!this._enabled)
return;this._agent.deleteDatabase(databaseId.securityOrigin,databaseId.name,error=>{if(error)
console.error('Unable to delete '+databaseId.name,error);this._loadDatabaseNames(databaseId.securityOrigin);});}
refreshDatabaseNames(){for(var securityOrigin in this._databaseNamesBySecurityOrigin)
this._loadDatabaseNames(securityOrigin);}
refreshDatabase(databaseId){this._loadDatabase(databaseId);}
clearObjectStore(databaseId,objectStoreName,callback){this._agent.clearObjectStore(databaseId.securityOrigin,databaseId.name,objectStoreName,callback);}
_securityOriginAdded(event){var securityOrigin=(event.data);this._addOrigin(securityOrigin);}
_securityOriginRemoved(event){var securityOrigin=(event.data);this._removeOrigin(securityOrigin);}
_addOrigin(securityOrigin){console.assert(!this._databaseNamesBySecurityOrigin[securityOrigin]);this._databaseNamesBySecurityOrigin[securityOrigin]=[];this._loadDatabaseNames(securityOrigin);}
_removeOrigin(securityOrigin){console.assert(this._databaseNamesBySecurityOrigin[securityOrigin]);for(var i=0;i<this._databaseNamesBySecurityOrigin[securityOrigin].length;++i)
this._databaseRemoved(securityOrigin,this._databaseNamesBySecurityOrigin[securityOrigin][i]);delete this._databaseNamesBySecurityOrigin[securityOrigin];}
_updateOriginDatabaseNames(securityOrigin,databaseNames){var newDatabaseNames=new Set(databaseNames);var oldDatabaseNames=new Set(this._databaseNamesBySecurityOrigin[securityOrigin]);this._databaseNamesBySecurityOrigin[securityOrigin]=databaseNames;for(var databaseName of oldDatabaseNames){if(!newDatabaseNames.has(databaseName))
this._databaseRemoved(securityOrigin,databaseName);}
for(var databaseName of newDatabaseNames){if(!oldDatabaseNames.has(databaseName))
this._databaseAdded(securityOrigin,databaseName);}}
databases(){var result=[];for(var securityOrigin in this._databaseNamesBySecurityOrigin){var databaseNames=this._databaseNamesBySecurityOrigin[securityOrigin];for(var i=0;i<databaseNames.length;++i)
result.push(new Resources.IndexedDBModel.DatabaseId(securityOrigin,databaseNames[i]));}
return result;}
_databaseAdded(securityOrigin,databaseName){var databaseId=new Resources.IndexedDBModel.DatabaseId(securityOrigin,databaseName);this.dispatchEventToListeners(Resources.IndexedDBModel.Events.DatabaseAdded,{model:this,databaseId:databaseId});}
_databaseRemoved(securityOrigin,databaseName){var databaseId=new Resources.IndexedDBModel.DatabaseId(securityOrigin,databaseName);this.dispatchEventToListeners(Resources.IndexedDBModel.Events.DatabaseRemoved,{model:this,databaseId:databaseId});}
_loadDatabaseNames(securityOrigin){function callback(error,databaseNames){if(error){console.error('IndexedDBAgent error: '+error);return;}
if(!this._databaseNamesBySecurityOrigin[securityOrigin])
return;this._updateOriginDatabaseNames(securityOrigin,databaseNames);}
this._agent.requestDatabaseNames(securityOrigin,callback.bind(this));}
_loadDatabase(databaseId){function callback(error,databaseWithObjectStores){if(error){console.error('IndexedDBAgent error: '+error);return;}
if(!this._databaseNamesBySecurityOrigin[databaseId.securityOrigin])
return;var databaseModel=new Resources.IndexedDBModel.Database(databaseId,databaseWithObjectStores.version);this._databases.set(databaseId,databaseModel);for(var i=0;i<databaseWithObjectStores.objectStores.length;++i){var objectStore=databaseWithObjectStores.objectStores[i];var objectStoreIDBKeyPath=Resources.IndexedDBModel.idbKeyPathFromKeyPath(objectStore.keyPath);var objectStoreModel=new Resources.IndexedDBModel.ObjectStore(objectStore.name,objectStoreIDBKeyPath,objectStore.autoIncrement);for(var j=0;j<objectStore.indexes.length;++j){var index=objectStore.indexes[j];var indexIDBKeyPath=Resources.IndexedDBModel.idbKeyPathFromKeyPath(index.keyPath);var indexModel=new Resources.IndexedDBModel.Index(index.name,indexIDBKeyPath,index.unique,index.multiEntry);objectStoreModel.indexes[indexModel.name]=indexModel;}
databaseModel.objectStores[objectStoreModel.name]=objectStoreModel;}
this.dispatchEventToListeners(Resources.IndexedDBModel.Events.DatabaseLoaded,{model:this,database:databaseModel});}
this._agent.requestDatabase(databaseId.securityOrigin,databaseId.name,callback.bind(this));}
loadObjectStoreData(databaseId,objectStoreName,idbKeyRange,skipCount,pageSize,callback){this._requestData(databaseId,databaseId.name,objectStoreName,'',idbKeyRange,skipCount,pageSize,callback);}
loadIndexData(databaseId,objectStoreName,indexName,idbKeyRange,skipCount,pageSize,callback){this._requestData(databaseId,databaseId.name,objectStoreName,indexName,idbKeyRange,skipCount,pageSize,callback);}
_requestData(databaseId,databaseName,objectStoreName,indexName,idbKeyRange,skipCount,pageSize,callback){function innerCallback(error,dataEntries,hasMore){if(error){console.error('IndexedDBAgent error: '+error);return;}
if(!this._databaseNamesBySecurityOrigin[databaseId.securityOrigin])
return;var entries=[];for(var i=0;i<dataEntries.length;++i){var key=this.target().runtimeModel.createRemoteObject(dataEntries[i].key);var primaryKey=this.target().runtimeModel.createRemoteObject(dataEntries[i].primaryKey);var value=this.target().runtimeModel.createRemoteObject(dataEntries[i].value);entries.push(new Resources.IndexedDBModel.Entry(key,primaryKey,value));}
callback(entries,hasMore);}
var keyRange=Resources.IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange);this._agent.requestData(databaseId.securityOrigin,databaseName,objectStoreName,indexName,skipCount,pageSize,keyRange?keyRange:undefined,innerCallback.bind(this));}};SDK.SDKModel.register(Resources.IndexedDBModel,SDK.Target.Capability.None);Resources.IndexedDBModel.KeyTypes={NumberType:'number',StringType:'string',DateType:'date',ArrayType:'array'};Resources.IndexedDBModel.KeyPathTypes={NullType:'null',StringType:'string',ArrayType:'array'};Resources.IndexedDBModel.Events={DatabaseAdded:Symbol('DatabaseAdded'),DatabaseRemoved:Symbol('DatabaseRemoved'),DatabaseLoaded:Symbol('DatabaseLoaded')};Resources.IndexedDBModel.Entry=class{constructor(key,primaryKey,value){this.key=key;this.primaryKey=primaryKey;this.value=value;}};Resources.IndexedDBModel.DatabaseId=class{constructor(securityOrigin,name){this.securityOrigin=securityOrigin;this.name=name;}
equals(databaseId){return this.name===databaseId.name&&this.securityOrigin===databaseId.securityOrigin;}};Resources.IndexedDBModel.Database=class{constructor(databaseId,version){this.databaseId=databaseId;this.version=version;this.objectStores={};}};Resources.IndexedDBModel.ObjectStore=class{constructor(name,keyPath,autoIncrement){this.name=name;this.keyPath=keyPath;this.autoIncrement=autoIncrement;this.indexes={};}
get keyPathString(){return(Resources.IndexedDBModel.keyPathStringFromIDBKeyPath((this.keyPath)));}};Resources.IndexedDBModel.Index=class{constructor(name,keyPath,unique,multiEntry){this.name=name;this.keyPath=keyPath;this.unique=unique;this.multiEntry=multiEntry;}
get keyPathString(){return(Resources.IndexedDBModel.keyPathStringFromIDBKeyPath((this.keyPath)));}};;Resources.IDBDatabaseView=class extends UI.VBox{constructor(model,database){super();this._model=model;this._reportView=new UI.ReportView(database.databaseId.name);this._reportView.show(this.contentElement);var bodySection=this._reportView.appendSection('');this._securityOriginElement=bodySection.appendField(Common.UIString('Security origin'));this._versionElement=bodySection.appendField(Common.UIString('Version'));var footer=this._reportView.appendSection('').appendRow();this._clearButton=UI.createTextButton(Common.UIString('Delete database'),()=>this._deleteDatabase(),Common.UIString('Delete database'));footer.appendChild(this._clearButton);this.update(database);}
_refreshDatabase(){this._securityOriginElement.textContent=this._database.databaseId.securityOrigin;this._versionElement.textContent=this._database.version;}
update(database){this._database=database;this._refreshDatabase();}
_deleteDatabase(){UI.ConfirmDialog.show(this.element,Common.UIString('Are you sure you want to delete "%s"?',this._database.databaseId.name),()=>this._model.deleteDatabase(this._database.databaseId));}};Resources.IDBDataView=class extends UI.SimpleView{constructor(model,databaseId,objectStore,index){super(Common.UIString('IDB'));this.registerRequiredCSS('resources/indexedDBViews.css');this._model=model;this._databaseId=databaseId;this._isIndex=!!index;this.element.classList.add('indexed-db-data-view');this._createEditorToolbar();this._refreshButton=new UI.ToolbarButton(Common.UIString('Refresh'),'largeicon-refresh');this._refreshButton.addEventListener(UI.ToolbarButton.Events.Click,this._refreshButtonClicked,this);this._clearButton=new UI.ToolbarButton(Common.UIString('Clear object store'),'largeicon-clear');this._clearButton.addEventListener(UI.ToolbarButton.Events.Click,this._clearButtonClicked,this);this._pageSize=50;this._skipCount=0;this.update(objectStore,index);this._entries=[];}
_createDataGrid(){var keyPath=this._isIndex?this._index.keyPath:this._objectStore.keyPath;var columns=([]);columns.push({id:'number',title:Common.UIString('#'),sortable:false,width:'50px'});columns.push({id:'key',titleDOMFragment:this._keyColumnHeaderFragment(Common.UIString('Key'),keyPath),sortable:false});if(this._isIndex){columns.push({id:'primaryKey',titleDOMFragment:this._keyColumnHeaderFragment(Common.UIString('Primary key'),this._objectStore.keyPath),sortable:false});}
columns.push({id:'value',title:Common.UIString('Value'),sortable:false});var dataGrid=new DataGrid.DataGrid(columns);return dataGrid;}
_keyColumnHeaderFragment(prefix,keyPath){var keyColumnHeaderFragment=createDocumentFragment();keyColumnHeaderFragment.createTextChild(prefix);if(keyPath===null)
return keyColumnHeaderFragment;keyColumnHeaderFragment.createTextChild(' ('+Common.UIString('Key path: '));if(Array.isArray(keyPath)){keyColumnHeaderFragment.createTextChild('[');for(var i=0;i<keyPath.length;++i){if(i!==0)
keyColumnHeaderFragment.createTextChild(', ');keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPath[i]));}
keyColumnHeaderFragment.createTextChild(']');}else{var keyPathString=(keyPath);keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPathString));}
keyColumnHeaderFragment.createTextChild(')');return keyColumnHeaderFragment;}
_keyPathStringFragment(keyPathString){var keyPathStringFragment=createDocumentFragment();keyPathStringFragment.createTextChild('"');var keyPathSpan=keyPathStringFragment.createChild('span','source-code indexed-db-key-path');keyPathSpan.textContent=keyPathString;keyPathStringFragment.createTextChild('"');return keyPathStringFragment;}
_createEditorToolbar(){var editorToolbar=new UI.Toolbar('data-view-toolbar',this.element);this._pageBackButton=new UI.ToolbarButton(Common.UIString('Show previous page'),'largeicon-play-back');this._pageBackButton.addEventListener(UI.ToolbarButton.Events.Click,this._pageBackButtonClicked,this);editorToolbar.appendToolbarItem(this._pageBackButton);this._pageForwardButton=new UI.ToolbarButton(Common.UIString('Show next page'),'largeicon-play');this._pageForwardButton.setEnabled(false);this._pageForwardButton.addEventListener(UI.ToolbarButton.Events.Click,this._pageForwardButtonClicked,this);editorToolbar.appendToolbarItem(this._pageForwardButton);this._keyInputElement=editorToolbar.element.createChild('input','key-input');this._keyInputElement.placeholder=Common.UIString('Start from key');this._keyInputElement.addEventListener('paste',this._keyInputChanged.bind(this),false);this._keyInputElement.addEventListener('cut',this._keyInputChanged.bind(this),false);this._keyInputElement.addEventListener('keypress',this._keyInputChanged.bind(this),false);this._keyInputElement.addEventListener('keydown',this._keyInputChanged.bind(this),false);}
_pageBackButtonClicked(event){this._skipCount=Math.max(0,this._skipCount-this._pageSize);this._updateData(false);}
_pageForwardButtonClicked(event){this._skipCount=this._skipCount+this._pageSize;this._updateData(false);}
_keyInputChanged(){window.setTimeout(this._updateData.bind(this,false),0);}
update(objectStore,index){this._objectStore=objectStore;this._index=index;if(this._dataGrid)
this._dataGrid.asWidget().detach();this._dataGrid=this._createDataGrid();this._dataGrid.asWidget().show(this.element);this._skipCount=0;this._updateData(true);}
_parseKey(keyString){var result;try{result=JSON.parse(keyString);}catch(e){result=keyString;}
return result;}
_updateData(force){var key=this._parseKey(this._keyInputElement.value);var pageSize=this._pageSize;var skipCount=this._skipCount;this._refreshButton.setEnabled(false);this._clearButton.setEnabled(!this._isIndex);if(!force&&this._lastKey===key&&this._lastPageSize===pageSize&&this._lastSkipCount===skipCount)
return;if(this._lastKey!==key||this._lastPageSize!==pageSize){skipCount=0;this._skipCount=0;}
this._lastKey=key;this._lastPageSize=pageSize;this._lastSkipCount=skipCount;function callback(entries,hasMore){this._refreshButton.setEnabled(true);this.clear();this._entries=entries;for(var i=0;i<entries.length;++i){var data={};data['number']=i+skipCount;data['key']=entries[i].key;data['primaryKey']=entries[i].primaryKey;data['value']=entries[i].value;var node=new Resources.IDBDataGridNode(data);this._dataGrid.rootNode().appendChild(node);}
this._pageBackButton.setEnabled(!!skipCount);this._pageForwardButton.setEnabled(hasMore);}
var idbKeyRange=key?window.IDBKeyRange.lowerBound(key):null;if(this._isIndex){this._model.loadIndexData(this._databaseId,this._objectStore.name,this._index.name,idbKeyRange,skipCount,pageSize,callback.bind(this));}else{this._model.loadObjectStoreData(this._databaseId,this._objectStore.name,idbKeyRange,skipCount,pageSize,callback.bind(this));}}
_refreshButtonClicked(event){this._updateData(true);}
_clearButtonClicked(event){function cleared(){this._clearButton.setEnabled(true);this._updateData(true);}
this._clearButton.setEnabled(false);this._model.clearObjectStore(this._databaseId,this._objectStore.name,cleared.bind(this));}
syncToolbarItems(){return[this._refreshButton,this._clearButton];}
clear(){this._dataGrid.rootNode().removeChildren();this._entries=[];}};Resources.IDBDataGridNode=class extends DataGrid.DataGridNode{constructor(data){super(data,false);this.selectable=false;}
createCell(columnIdentifier){var cell=super.createCell(columnIdentifier);var value=(this.data[columnIdentifier]);switch(columnIdentifier){case'value':case'key':case'primaryKey':cell.removeChildren();var objectElement=ObjectUI.ObjectPropertiesSection.defaultObjectPresentation(value,undefined,true);cell.appendChild(objectElement);break;default:}
return cell;}};;Resources.ResourcesPanel=class extends UI.PanelWithSidebar{constructor(){super('resources');this.registerRequiredCSS('resources/resourcesPanel.css');this._resourcesLastSelectedItemSetting=Common.settings.createSetting('resourcesLastSelectedItem',{});this._sidebarTree=new UI.TreeOutlineInShadow();this._sidebarTree.element.classList.add('resources-sidebar');this._sidebarTree.registerRequiredCSS('resources/resourcesSidebar.css');this._sidebarTree.element.classList.add('filter-all');this.panelSidebarElement().appendChild(this._sidebarTree.element);this._applicationTreeElement=this._addSidebarSection(Common.UIString('Application'));this._manifestTreeElement=new Resources.AppManifestTreeElement(this);this._applicationTreeElement.appendChild(this._manifestTreeElement);this.serviceWorkersTreeElement=new Resources.ServiceWorkersTreeElement(this);this._applicationTreeElement.appendChild(this.serviceWorkersTreeElement);var clearStorageTreeElement=new Resources.ClearStorageTreeElement(this);this._applicationTreeElement.appendChild(clearStorageTreeElement);var storageTreeElement=this._addSidebarSection(Common.UIString('Storage'));this.localStorageListTreeElement=new Resources.StorageCategoryTreeElement(this,Common.UIString('Local Storage'),'LocalStorage');var localStorageIcon=UI.Icon.create('mediumicon-table','resource-tree-item');this.localStorageListTreeElement.setLeadingIcons([localStorageIcon]);storageTreeElement.appendChild(this.localStorageListTreeElement);this.sessionStorageListTreeElement=new Resources.StorageCategoryTreeElement(this,Common.UIString('Session Storage'),'SessionStorage');var sessionStorageIcon=UI.Icon.create('mediumicon-table','resource-tree-item');this.sessionStorageListTreeElement.setLeadingIcons([sessionStorageIcon]);storageTreeElement.appendChild(this.sessionStorageListTreeElement);this.indexedDBListTreeElement=new Resources.IndexedDBTreeElement(this);storageTreeElement.appendChild(this.indexedDBListTreeElement);this.databasesListTreeElement=new Resources.StorageCategoryTreeElement(this,Common.UIString('Web SQL'),'Databases');var databaseIcon=UI.Icon.create('mediumicon-database','resource-tree-item');this.databasesListTreeElement.setLeadingIcons([databaseIcon]);storageTreeElement.appendChild(this.databasesListTreeElement);this.cookieListTreeElement=new Resources.StorageCategoryTreeElement(this,Common.UIString('Cookies'),'Cookies');var cookieIcon=UI.Icon.create('mediumicon-cookie','resource-tree-item');this.cookieListTreeElement.setLeadingIcons([cookieIcon]);storageTreeElement.appendChild(this.cookieListTreeElement);var cacheTreeElement=this._addSidebarSection(Common.UIString('Cache'));this.cacheStorageListTreeElement=new Resources.ServiceWorkerCacheTreeElement(this);cacheTreeElement.appendChild(this.cacheStorageListTreeElement);this.applicationCacheListTreeElement=new Resources.StorageCategoryTreeElement(this,Common.UIString('Application Cache'),'ApplicationCache');var applicationCacheIcon=UI.Icon.create('mediumicon-table','resource-tree-item');this.applicationCacheListTreeElement.setLeadingIcons([applicationCacheIcon]);cacheTreeElement.appendChild(this.applicationCacheListTreeElement);this._resourcesSection=new Resources.ResourcesSection(this,this._addSidebarSection(Common.UIString('Frames')));var mainContainer=new UI.VBox();this.storageViews=mainContainer.element.createChild('div','vbox flex-auto');this._storageViewToolbar=new UI.Toolbar('resources-toolbar',mainContainer.element);this.splitWidget().setMainWidget(mainContainer);this._databaseTableViews=new Map();this._databaseQueryViews=new Map();this._databaseTreeElements=new Map();this._domStorageTreeElements=new Map();this._domains={};this._domStorageView=null;this._cookieView=null;this.panelSidebarElement().addEventListener('mousemove',this._onmousemove.bind(this),false);this.panelSidebarElement().addEventListener('mouseleave',this._onmouseleave.bind(this),false);SDK.targetManager.observeTargets(this);SDK.targetManager.addModelListener(SDK.ResourceTreeModel,SDK.ResourceTreeModel.Events.FrameNavigated,this._frameNavigated,this);}
static _instance(){return(self.runtime.sharedInstance(Resources.ResourcesPanel));}
_addSidebarSection(title){var treeElement=new UI.TreeElement(title,true);treeElement.listItemElement.classList.add('storage-group-list-item');treeElement.setCollapsible(false);treeElement.selectable=false;this._sidebarTree.appendChild(treeElement);return treeElement;}
targetAdded(target){if(this._target)
return;this._target=target;this._databaseModel=Resources.DatabaseModel.fromTarget(target);this._databaseModel.on(Resources.DatabaseModel.DatabaseAddedEvent,this._databaseAdded,this);this._databaseModel.on(Resources.DatabaseModel.DatabasesRemovedEvent,this._resetWebSQL,this);var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(target);if(!resourceTreeModel)
return;if(resourceTreeModel.cachedResourcesLoaded())
this._initialize();resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded,this._initialize,this);resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.WillLoadCachedResources,this._resetWithFrames,this);}
targetRemoved(target){if(target!==this._target)
return;delete this._target;var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(target);if(resourceTreeModel){resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded,this._initialize,this);resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.WillLoadCachedResources,this._resetWithFrames,this);}
this._databaseModel.off(Resources.DatabaseModel.DatabaseAddedEvent,this._databaseAdded,this);this._databaseModel.off(Resources.DatabaseModel.DatabasesRemovedEvent,this._resetWebSQL,this);this._resetWithFrames();}
focus(){this._sidebarTree.focus();}
_initialize(){for(var frame of SDK.ResourceTreeModel.frames())
this._addCookieDocument(frame);this._databaseModel.enable();var indexedDBModel=Resources.IndexedDBModel.fromTarget(this._target);if(indexedDBModel)
indexedDBModel.enable();var cacheStorageModel=SDK.ServiceWorkerCacheModel.fromTarget(this._target);if(cacheStorageModel)
cacheStorageModel.enable();var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(this._target);if(resourceTreeModel)
this._populateApplicationCacheTree(resourceTreeModel);var domStorageModel=Resources.DOMStorageModel.fromTarget(this._target);if(domStorageModel)
this._populateDOMStorageTree(domStorageModel);this.indexedDBListTreeElement._initialize();this.cacheStorageListTreeElement._initialize();this._initDefaultSelection();}
_initDefaultSelection(){var itemURL=this._resourcesLastSelectedItemSetting.get();if(itemURL){var rootElement=this._sidebarTree.rootElement();for(var treeElement=rootElement.firstChild();treeElement;treeElement=treeElement.traverseNextTreeElement(false,rootElement,true)){if(treeElement.itemURL===itemURL){treeElement.revealAndSelect(true);return;}}}
this._manifestTreeElement.select();}
_resetWithFrames(){this._resourcesSection.reset();this._reset();}
_resetWebSQL(){if(this.visibleView instanceof Resources.DatabaseQueryView||this.visibleView instanceof Resources.DatabaseTableView){this.visibleView.detach();delete this.visibleView;}
var queryViews=this._databaseQueryViews.valuesArray();for(var i=0;i<queryViews.length;++i){queryViews[i].removeEventListener(Resources.DatabaseQueryView.Events.SchemaUpdated,this._updateDatabaseTables,this);}
this._databaseTableViews.clear();this._databaseQueryViews.clear();this._databaseTreeElements.clear();this.databasesListTreeElement.removeChildren();this.databasesListTreeElement.setExpandable(false);}
_resetDOMStorage(){if(this.visibleView===this._domStorageView){this.visibleView.detach();delete this.visibleView;}
this._domStorageTreeElements.clear();this.localStorageListTreeElement.removeChildren();this.sessionStorageListTreeElement.removeChildren();}
_resetCookies(){if(this.visibleView instanceof Resources.CookieItemsView){this.visibleView.detach();delete this.visibleView;}
this.cookieListTreeElement.removeChildren();}
_resetCacheStorage(){if(this.visibleView instanceof Resources.ServiceWorkerCacheView){this.visibleView.detach();delete this.visibleView;}
this.cacheStorageListTreeElement.removeChildren();this.cacheStorageListTreeElement.setExpandable(false);}
_resetAppCache(){for(var frameId of Object.keys(this._applicationCacheFrameElements))
this._applicationCacheFrameManifestRemoved({data:frameId});this.applicationCacheListTreeElement.setExpandable(false);}
_reset(){this._domains={};this._resetWebSQL();this._resetDOMStorage();this._resetCookies();this._resetCacheStorage();if((this.visibleView instanceof SourceFrame.ResourceSourceFrame)||(this.visibleView instanceof SourceFrame.ImageView)||(this.visibleView instanceof SourceFrame.FontView)){this.visibleView.detach();delete this.visibleView;}
this._storageViewToolbar.removeToolbarItems();if(this._sidebarTree.selectedTreeElement)
this._sidebarTree.selectedTreeElement.deselect();}
_frameNavigated(event){var frame=event.data;if(!frame.parentFrame)
this._reset();var applicationCacheFrameTreeElement=this._applicationCacheFrameElements[frame.id];if(applicationCacheFrameTreeElement)
applicationCacheFrameTreeElement.frameNavigated(frame);this._addCookieDocument(frame);}
_databaseAdded(event){var databaseTreeElement=new Resources.DatabaseTreeElement(this,event.database);this._databaseTreeElements.set(event.database,databaseTreeElement);this.databasesListTreeElement.appendChild(databaseTreeElement);}
_addCookieDocument(frame){var parsedURL=frame.url.asParsedURL();if(!parsedURL||(parsedURL.scheme!=='http'&&parsedURL.scheme!=='https'&&parsedURL.scheme!=='file'))
return;var domain=parsedURL.securityOrigin();if(!this._domains[domain]){this._domains[domain]=true;var cookieDomainTreeElement=new Resources.CookieTreeElement(this,frame,domain);this.cookieListTreeElement.appendChild(cookieDomainTreeElement);}}
_domStorageAdded(event){var domStorage=(event.data);this._addDOMStorage(domStorage);}
_addDOMStorage(domStorage){console.assert(!this._domStorageTreeElements.get(domStorage));var domStorageTreeElement=new Resources.DOMStorageTreeElement(this,domStorage);this._domStorageTreeElements.set(domStorage,domStorageTreeElement);if(domStorage.isLocalStorage)
this.localStorageListTreeElement.appendChild(domStorageTreeElement);else
this.sessionStorageListTreeElement.appendChild(domStorageTreeElement);}
_domStorageRemoved(event){var domStorage=(event.data);this._removeDOMStorage(domStorage);}
_removeDOMStorage(domStorage){var treeElement=this._domStorageTreeElements.get(domStorage);if(!treeElement)
return;var wasSelected=treeElement.selected;var parentListTreeElement=treeElement.parent;parentListTreeElement.removeChild(treeElement);if(wasSelected)
parentListTreeElement.select();this._domStorageTreeElements.remove(domStorage);}
selectDatabase(database){if(database){this._showDatabase(database);this._databaseTreeElements.get(database).select();}}
selectDOMStorage(domStorage){if(domStorage){this._showDOMStorage(domStorage);this._domStorageTreeElements.get(domStorage).select();}}
showResource(resource,line,column){var resourceTreeElement=Resources.FrameResourceTreeElement.forResource(resource);if(resourceTreeElement)
resourceTreeElement.revealAndSelect(true);if(typeof line==='number'){var resourceSourceFrame=this._resourceSourceFrameViewForResource(resource);if(resourceSourceFrame)
resourceSourceFrame.revealPosition(line,column,true);}
return true;}
_resourceSourceFrameViewForResource(resource){var resourceView=Resources.FrameResourceTreeElement.resourceViewForResource(resource);if(resourceView&&resourceView instanceof SourceFrame.ResourceSourceFrame)
return(resourceView);return null;}
_showDatabase(database,tableName){if(!database)
return;var view;if(tableName){var tableViews=this._databaseTableViews.get(database);if(!tableViews){tableViews=({});this._databaseTableViews.set(database,tableViews);}
view=tableViews[tableName];if(!view){view=new Resources.DatabaseTableView(database,tableName);tableViews[tableName]=view;}}else{view=this._databaseQueryViews.get(database);if(!view){view=new Resources.DatabaseQueryView(database);this._databaseQueryViews.set(database,view);view.addEventListener(Resources.DatabaseQueryView.Events.SchemaUpdated,this._updateDatabaseTables,this);}}
this._innerShowView(view);}
_showDOMStorage(domStorage){if(!domStorage)
return;if(!this._domStorageView)
this._domStorageView=new Resources.DOMStorageItemsView(domStorage);else
this._domStorageView.setStorage(domStorage);this._innerShowView(this._domStorageView);}
showCookies(treeElement,cookieDomain,cookieFrameTarget){var model=SDK.CookieModel.fromTarget(cookieFrameTarget);if(!this._cookieView)
this._cookieView=new Resources.CookieItemsView(treeElement,model,cookieDomain);else
this._cookieView.setCookiesDomain(model,cookieDomain);this._innerShowView(this._cookieView);}
_clearCookies(target,cookieDomain){SDK.CookieModel.fromTarget(target).clear(cookieDomain,()=>{if(this._cookieView)
this._cookieView.refreshItems();});}
showApplicationCache(frameId){if(!this._applicationCacheViews[frameId]){this._applicationCacheViews[frameId]=new Resources.ApplicationCacheItemsView(this._applicationCacheModel,frameId);}
this._innerShowView(this._applicationCacheViews[frameId]);}
showFileSystem(view){this._innerShowView(view);}
showCategoryView(categoryName){if(!this._categoryView)
this._categoryView=new Resources.StorageCategoryView();this._categoryView.setText(categoryName);this._innerShowView(this._categoryView);}
_innerShowView(view){if(this.visibleView===view)
return;if(this.visibleView)
this.visibleView.detach();view.show(this.storageViews);this.visibleView=view;this._storageViewToolbar.removeToolbarItems();var toolbarItems=(view instanceof UI.SimpleView&&view.syncToolbarItems())||[];for(var i=0;i<toolbarItems.length;++i)
this._storageViewToolbar.appendToolbarItem(toolbarItems[i]);this._storageViewToolbar.element.classList.toggle('hidden',!toolbarItems.length);}
closeVisibleView(){if(!this.visibleView)
return;this.visibleView.detach();delete this.visibleView;}
_updateDatabaseTables(event){var database=event.data;if(!database)
return;var databasesTreeElement=this._databaseTreeElements.get(database);if(!databasesTreeElement)
return;databasesTreeElement.invalidateChildren();var tableViews=this._databaseTableViews.get(database);if(!tableViews)
return;var tableNamesHash={};var self=this;function tableNamesCallback(tableNames){var tableNamesLength=tableNames.length;for(var i=0;i<tableNamesLength;++i)
tableNamesHash[tableNames[i]]=true;for(var tableName in tableViews){if(!(tableName in tableNamesHash)){if(self.visibleView===tableViews[tableName])
self.closeVisibleView();delete tableViews[tableName];}}}
database.getTableNames(tableNamesCallback);}
_populateDOMStorageTree(domStorageModel){domStorageModel.enable();domStorageModel.storages().forEach(this._addDOMStorage.bind(this));domStorageModel.addEventListener(Resources.DOMStorageModel.Events.DOMStorageAdded,this._domStorageAdded,this);domStorageModel.addEventListener(Resources.DOMStorageModel.Events.DOMStorageRemoved,this._domStorageRemoved,this);}
_populateApplicationCacheTree(resourceTreeModel){this._applicationCacheModel=Resources.ApplicationCacheModel.fromTarget(this._target);this._applicationCacheViews={};this._applicationCacheFrameElements={};this._applicationCacheManifestElements={};this._applicationCacheModel.addEventListener(Resources.ApplicationCacheModel.Events.FrameManifestAdded,this._applicationCacheFrameManifestAdded,this);this._applicationCacheModel.addEventListener(Resources.ApplicationCacheModel.Events.FrameManifestRemoved,this._applicationCacheFrameManifestRemoved,this);this._applicationCacheModel.addEventListener(Resources.ApplicationCacheModel.Events.FrameManifestsReset,this._resetAppCache,this);this._applicationCacheModel.addEventListener(Resources.ApplicationCacheModel.Events.FrameManifestStatusUpdated,this._applicationCacheFrameManifestStatusChanged,this);this._applicationCacheModel.addEventListener(Resources.ApplicationCacheModel.Events.NetworkStateChanged,this._applicationCacheNetworkStateChanged,this);}
_applicationCacheFrameManifestAdded(event){var frameId=event.data;var manifestURL=this._applicationCacheModel.frameManifestURL(frameId);var manifestTreeElement=this._applicationCacheManifestElements[manifestURL];if(!manifestTreeElement){manifestTreeElement=new Resources.ApplicationCacheManifestTreeElement(this,manifestURL);this.applicationCacheListTreeElement.appendChild(manifestTreeElement);this._applicationCacheManifestElements[manifestURL]=manifestTreeElement;}
var frameTreeElement=new Resources.ApplicationCacheFrameTreeElement(this,frameId,manifestURL);manifestTreeElement.appendChild(frameTreeElement);manifestTreeElement.expand();this._applicationCacheFrameElements[frameId]=frameTreeElement;}
_applicationCacheFrameManifestRemoved(event){var frameId=event.data;var frameTreeElement=this._applicationCacheFrameElements[frameId];if(!frameTreeElement)
return;var manifestURL=frameTreeElement.manifestURL;delete this._applicationCacheFrameElements[frameId];delete this._applicationCacheViews[frameId];frameTreeElement.parent.removeChild(frameTreeElement);var manifestTreeElement=this._applicationCacheManifestElements[manifestURL];if(manifestTreeElement.childCount())
return;delete this._applicationCacheManifestElements[manifestURL];manifestTreeElement.parent.removeChild(manifestTreeElement);}
_applicationCacheFrameManifestStatusChanged(event){var frameId=event.data;var status=this._applicationCacheModel.frameManifestStatus(frameId);if(this._applicationCacheViews[frameId])
this._applicationCacheViews[frameId].updateStatus(status);}
_applicationCacheNetworkStateChanged(event){var isNowOnline=event.data;for(var manifestURL in this._applicationCacheViews)
this._applicationCacheViews[manifestURL].updateNetworkState(isNowOnline);}
showView(view){if(view)
this.showResource(view.resource);}
_onmousemove(event){var nodeUnderMouse=event.target;if(!nodeUnderMouse)
return;var listNode=nodeUnderMouse.enclosingNodeOrSelfWithNodeName('li');if(!listNode)
return;var element=listNode.treeElement;if(this._previousHoveredElement===element)
return;if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
if(element instanceof Resources.FrameTreeElement){this._previousHoveredElement=element;element.hovered=true;}}
_onmouseleave(event){if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}}};Resources.ResourcesPanel.ResourceRevealer=class{reveal(resource){if(!(resource instanceof SDK.Resource))
return Promise.reject(new Error('Internal error: not a resource'));var panel=Resources.ResourcesPanel._instance();return UI.viewManager.showView('resources').then(panel.showResource.bind(panel,resource));}};Resources.BaseStorageTreeElement=class extends UI.TreeElement{constructor(storagePanel,title,expandable){super(title,expandable);this._storagePanel=storagePanel;}
onselect(selectedByUser){if(!selectedByUser)
return false;var itemURL=this.itemURL;if(itemURL)
this._storagePanel._resourcesLastSelectedItemSetting.set(itemURL);return false;}
showView(view){if(!view){this._storagePanel.visibleView.detach();return;}
this._storagePanel._innerShowView(view);}};Resources.StorageCategoryTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,categoryName,settingsKey){super(storagePanel,categoryName,false);this._expandedSetting=Common.settings.createSetting('resources'+settingsKey+'Expanded',settingsKey==='Frames');this._categoryName=categoryName;}
target(){return this._storagePanel._target;}
get itemURL(){return'category://'+this._categoryName;}
onselect(selectedByUser){super.onselect(selectedByUser);this._storagePanel.showCategoryView(this._categoryName);return false;}
onattach(){super.onattach();if(this._expandedSetting.get())
this.expand();}
onexpand(){this._expandedSetting.set(true);}
oncollapse(){this._expandedSetting.set(false);}};Resources.DatabaseTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,database){super(storagePanel,database.name,true);this._database=database;var icon=UI.Icon.create('mediumicon-database','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'database://'+encodeURI(this._database.name);}
onselect(selectedByUser){super.onselect(selectedByUser);this._storagePanel._showDatabase(this._database);return false;}
onexpand(){this._updateChildren();}
_updateChildren(){this.removeChildren();function tableNamesCallback(tableNames){var tableNamesLength=tableNames.length;for(var i=0;i<tableNamesLength;++i)
this.appendChild(new Resources.DatabaseTableTreeElement(this._storagePanel,this._database,tableNames[i]));}
this._database.getTableNames(tableNamesCallback.bind(this));}};Resources.DatabaseTableTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,database,tableName){super(storagePanel,tableName,false);this._database=database;this._tableName=tableName;var icon=UI.Icon.create('mediumicon-table','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'database://'+encodeURI(this._database.name)+'/'+encodeURI(this._tableName);}
onselect(selectedByUser){super.onselect(selectedByUser);this._storagePanel._showDatabase(this._database,this._tableName);return false;}};Resources.ServiceWorkerCacheTreeElement=class extends Resources.StorageCategoryTreeElement{constructor(storagePanel){super(storagePanel,Common.UIString('Cache Storage'),'CacheStorage');var icon=UI.Icon.create('mediumicon-database','resource-tree-item');this.setLeadingIcons([icon]);}
_initialize(){this._swCacheTreeElements=[];var target=this._storagePanel._target;var model=target&&SDK.ServiceWorkerCacheModel.fromTarget(target);if(model){for(var cache of model.caches())
this._addCache(model,cache);}
SDK.targetManager.addModelListener(SDK.ServiceWorkerCacheModel,SDK.ServiceWorkerCacheModel.Events.CacheAdded,this._cacheAdded,this);SDK.targetManager.addModelListener(SDK.ServiceWorkerCacheModel,SDK.ServiceWorkerCacheModel.Events.CacheRemoved,this._cacheRemoved,this);}
onattach(){super.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Refresh Caches'),this._refreshCaches.bind(this));contextMenu.show();}
_refreshCaches(){var target=this._storagePanel._target;if(target){var model=SDK.ServiceWorkerCacheModel.fromTarget(target);if(!model)
return;model.refreshCacheNames();}}
_cacheAdded(event){var cache=(event.data.cache);var model=(event.data.model);this._addCache(model,cache);}
_addCache(model,cache){var swCacheTreeElement=new Resources.SWCacheTreeElement(this._storagePanel,model,cache);this._swCacheTreeElements.push(swCacheTreeElement);this.appendChild(swCacheTreeElement);}
_cacheRemoved(event){var cache=(event.data.cache);var model=(event.data.model);var swCacheTreeElement=this._cacheTreeElement(model,cache);if(!swCacheTreeElement)
return;swCacheTreeElement.clear();this.removeChild(swCacheTreeElement);this._swCacheTreeElements.remove(swCacheTreeElement);}
_cacheTreeElement(model,cache){var index=-1;for(var i=0;i<this._swCacheTreeElements.length;++i){if(this._swCacheTreeElements[i]._cache.equals(cache)&&this._swCacheTreeElements[i]._model===model){index=i;break;}}
if(index!==-1)
return this._swCacheTreeElements[i];return null;}};Resources.SWCacheTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,model,cache){super(storagePanel,cache.cacheName+' - '+cache.securityOrigin,false);this._model=model;this._cache=cache;var icon=UI.Icon.create('mediumicon-table','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'cache://'+this._cache.cacheId;}
onattach(){super.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Delete'),this._clearCache.bind(this));contextMenu.show();}
_clearCache(){this._model.deleteCache(this._cache);}
update(cache){this._cache=cache;if(this._view)
this._view.update(cache);}
onselect(selectedByUser){super.onselect(selectedByUser);if(!this._view)
this._view=new Resources.ServiceWorkerCacheView(this._model,this._cache);this.showView(this._view);return false;}
clear(){if(this._view)
this._view.clear();}};Resources.ServiceWorkersTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel){super(storagePanel,Common.UIString('Service Workers'),false);var icon=UI.Icon.create('mediumicon-service-worker','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'service-workers://';}
onselect(selectedByUser){super.onselect(selectedByUser);if(!this._view)
this._view=new Resources.ServiceWorkersView();this.showView(this._view);return false;}};Resources.AppManifestTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel){super(storagePanel,Common.UIString('Manifest'),false);var icon=UI.Icon.create('mediumicon-manifest','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'manifest://';}
onselect(selectedByUser){super.onselect(selectedByUser);if(!this._view)
this._view=new Resources.AppManifestView();this.showView(this._view);return false;}};Resources.ClearStorageTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel){super(storagePanel,Common.UIString('Clear storage'),false);var icon=UI.Icon.create('mediumicon-clear-storage','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'clear-storage://';}
onselect(selectedByUser){super.onselect(selectedByUser);if(!this._view)
this._view=new Resources.ClearStorageView(this._storagePanel);this.showView(this._view);return false;}};Resources.IndexedDBTreeElement=class extends Resources.StorageCategoryTreeElement{constructor(storagePanel){super(storagePanel,Common.UIString('IndexedDB'),'IndexedDB');var icon=UI.Icon.create('mediumicon-database','resource-tree-item');this.setLeadingIcons([icon]);}
_initialize(){SDK.targetManager.addModelListener(Resources.IndexedDBModel,Resources.IndexedDBModel.Events.DatabaseAdded,this._indexedDBAdded,this);SDK.targetManager.addModelListener(Resources.IndexedDBModel,Resources.IndexedDBModel.Events.DatabaseRemoved,this._indexedDBRemoved,this);SDK.targetManager.addModelListener(Resources.IndexedDBModel,Resources.IndexedDBModel.Events.DatabaseLoaded,this._indexedDBLoaded,this);this._idbDatabaseTreeElements=[];var targets=SDK.targetManager.targets(SDK.Target.Capability.Browser);for(var i=0;i<targets.length;++i){var indexedDBModel=Resources.IndexedDBModel.fromTarget(targets[i]);var databases=indexedDBModel.databases();for(var j=0;j<databases.length;++j)
this._addIndexedDB(indexedDBModel,databases[j]);}}
onattach(){super.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Refresh IndexedDB'),this.refreshIndexedDB.bind(this));contextMenu.show();}
refreshIndexedDB(){var targets=SDK.targetManager.targets(SDK.Target.Capability.Browser);for(var i=0;i<targets.length;++i)
Resources.IndexedDBModel.fromTarget(targets[i]).refreshDatabaseNames();}
_indexedDBAdded(event){var databaseId=(event.data.databaseId);var model=(event.data.model);this._addIndexedDB(model,databaseId);}
_addIndexedDB(model,databaseId){var idbDatabaseTreeElement=new Resources.IDBDatabaseTreeElement(this._storagePanel,model,databaseId);this._idbDatabaseTreeElements.push(idbDatabaseTreeElement);this.appendChild(idbDatabaseTreeElement);model.refreshDatabase(databaseId);}
_indexedDBRemoved(event){var databaseId=(event.data.databaseId);var model=(event.data.model);var idbDatabaseTreeElement=this._idbDatabaseTreeElement(model,databaseId);if(!idbDatabaseTreeElement)
return;idbDatabaseTreeElement.clear();this.removeChild(idbDatabaseTreeElement);this._idbDatabaseTreeElements.remove(idbDatabaseTreeElement);}
_indexedDBLoaded(event){var database=(event.data.database);var model=(event.data.model);var idbDatabaseTreeElement=this._idbDatabaseTreeElement(model,database.databaseId);if(!idbDatabaseTreeElement)
return;idbDatabaseTreeElement.update(database);}
_idbDatabaseTreeElement(model,databaseId){var index=-1;for(var i=0;i<this._idbDatabaseTreeElements.length;++i){if(this._idbDatabaseTreeElements[i]._databaseId.equals(databaseId)&&this._idbDatabaseTreeElements[i]._model===model){index=i;break;}}
if(index!==-1)
return this._idbDatabaseTreeElements[i];return null;}};Resources.IDBDatabaseTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,model,databaseId){super(storagePanel,databaseId.name+' - '+databaseId.securityOrigin,false);this._model=model;this._databaseId=databaseId;this._idbObjectStoreTreeElements={};var icon=UI.Icon.create('mediumicon-database','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'indexedDB://'+this._databaseId.securityOrigin+'/'+this._databaseId.name;}
onattach(){super.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Refresh IndexedDB'),this._refreshIndexedDB.bind(this));contextMenu.show();}
_refreshIndexedDB(){this._model.refreshDatabaseNames();}
update(database){this._database=database;var objectStoreNames={};for(var objectStoreName in this._database.objectStores){var objectStore=this._database.objectStores[objectStoreName];objectStoreNames[objectStore.name]=true;if(!this._idbObjectStoreTreeElements[objectStore.name]){var idbObjectStoreTreeElement=new Resources.IDBObjectStoreTreeElement(this._storagePanel,this._model,this._databaseId,objectStore);this._idbObjectStoreTreeElements[objectStore.name]=idbObjectStoreTreeElement;this.appendChild(idbObjectStoreTreeElement);}
this._idbObjectStoreTreeElements[objectStore.name].update(objectStore);}
for(var objectStoreName in this._idbObjectStoreTreeElements){if(!objectStoreNames[objectStoreName])
this._objectStoreRemoved(objectStoreName);}
if(this._view)
this._view.update(database);this._updateTooltip();}
_updateTooltip(){this.tooltip=Common.UIString('Version')+': '+this._database.version;}
onselect(selectedByUser){super.onselect(selectedByUser);if(!this._view)
this._view=new Resources.IDBDatabaseView(this._model,this._database);this.showView(this._view);return false;}
_objectStoreRemoved(objectStoreName){var objectStoreTreeElement=this._idbObjectStoreTreeElements[objectStoreName];objectStoreTreeElement.clear();this.removeChild(objectStoreTreeElement);delete this._idbObjectStoreTreeElements[objectStoreName];}
clear(){for(var objectStoreName in this._idbObjectStoreTreeElements)
this._objectStoreRemoved(objectStoreName);}};Resources.IDBObjectStoreTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,model,databaseId,objectStore){super(storagePanel,objectStore.name,false);this._model=model;this._databaseId=databaseId;this._idbIndexTreeElements={};var icon=UI.Icon.create('mediumicon-table','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'indexedDB://'+this._databaseId.securityOrigin+'/'+this._databaseId.name+'/'+
this._objectStore.name;}
onattach(){super.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Clear'),this._clearObjectStore.bind(this));contextMenu.show();}
_clearObjectStore(){function callback(){this.update(this._objectStore);}
this._model.clearObjectStore(this._databaseId,this._objectStore.name,callback.bind(this));}
update(objectStore){this._objectStore=objectStore;var indexNames={};for(var indexName in this._objectStore.indexes){var index=this._objectStore.indexes[indexName];indexNames[index.name]=true;if(!this._idbIndexTreeElements[index.name]){var idbIndexTreeElement=new Resources.IDBIndexTreeElement(this._storagePanel,this._model,this._databaseId,this._objectStore,index);this._idbIndexTreeElements[index.name]=idbIndexTreeElement;this.appendChild(idbIndexTreeElement);}
this._idbIndexTreeElements[index.name].update(index);}
for(var indexName in this._idbIndexTreeElements){if(!indexNames[indexName])
this._indexRemoved(indexName);}
for(var indexName in this._idbIndexTreeElements){if(!indexNames[indexName]){this.removeChild(this._idbIndexTreeElements[indexName]);delete this._idbIndexTreeElements[indexName];}}
if(this.childCount())
this.expand();if(this._view)
this._view.update(this._objectStore);this._updateTooltip();}
_updateTooltip(){var keyPathString=this._objectStore.keyPathString;var tooltipString=keyPathString!==null?(Common.UIString('Key path: ')+keyPathString):'';if(this._objectStore.autoIncrement)
tooltipString+='\n'+Common.UIString('autoIncrement');this.tooltip=tooltipString;}
onselect(selectedByUser){super.onselect(selectedByUser);if(!this._view)
this._view=new Resources.IDBDataView(this._model,this._databaseId,this._objectStore,null);this.showView(this._view);return false;}
_indexRemoved(indexName){var indexTreeElement=this._idbIndexTreeElements[indexName];indexTreeElement.clear();this.removeChild(indexTreeElement);delete this._idbIndexTreeElements[indexName];}
clear(){for(var indexName in this._idbIndexTreeElements)
this._indexRemoved(indexName);if(this._view)
this._view.clear();}};Resources.IDBIndexTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,model,databaseId,objectStore,index){super(storagePanel,index.name,false);this._model=model;this._databaseId=databaseId;this._objectStore=objectStore;this._index=index;}
get itemURL(){return'indexedDB://'+this._databaseId.securityOrigin+'/'+this._databaseId.name+'/'+
this._objectStore.name+'/'+this._index.name;}
update(index){this._index=index;if(this._view)
this._view.update(this._index);this._updateTooltip();}
_updateTooltip(){var tooltipLines=[];var keyPathString=this._index.keyPathString;tooltipLines.push(Common.UIString('Key path: ')+keyPathString);if(this._index.unique)
tooltipLines.push(Common.UIString('unique'));if(this._index.multiEntry)
tooltipLines.push(Common.UIString('multiEntry'));this.tooltip=tooltipLines.join('\n');}
onselect(selectedByUser){super.onselect(selectedByUser);if(!this._view)
this._view=new Resources.IDBDataView(this._model,this._databaseId,this._objectStore,this._index);this.showView(this._view);return false;}
clear(){if(this._view)
this._view.clear();}};Resources.DOMStorageTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,domStorage){super(storagePanel,domStorage.securityOrigin?domStorage.securityOrigin:Common.UIString('Local Files'),false);this._domStorage=domStorage;var icon=UI.Icon.create('mediumicon-table','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'storage://'+this._domStorage.securityOrigin+'/'+
(this._domStorage.isLocalStorage?'local':'session');}
onselect(selectedByUser){super.onselect(selectedByUser);this._storagePanel._showDOMStorage(this._domStorage);return false;}
onattach(){super.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Clear'),()=>this._domStorage.clear());contextMenu.show();}};Resources.CookieTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,frame,cookieDomain){super(storagePanel,cookieDomain?cookieDomain:Common.UIString('Local Files'),false);this._target=frame.target();this._cookieDomain=cookieDomain;var icon=UI.Icon.create('mediumicon-cookie','resource-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'cookies://'+this._cookieDomain;}
onattach(){super.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Clear'),()=>this._storagePanel._clearCookies(this._target,this._cookieDomain));contextMenu.show();}
onselect(selectedByUser){super.onselect(selectedByUser);this._storagePanel.showCookies(this,this._cookieDomain,this._target);return false;}};Resources.ApplicationCacheManifestTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,manifestURL){var title=new Common.ParsedURL(manifestURL).displayName;super(storagePanel,title,false);this.tooltip=manifestURL;this._manifestURL=manifestURL;}
get itemURL(){return'appcache://'+this._manifestURL;}
get manifestURL(){return this._manifestURL;}
onselect(selectedByUser){super.onselect(selectedByUser);this._storagePanel.showCategoryView(this._manifestURL);return false;}};Resources.ApplicationCacheFrameTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,frameId,manifestURL){super(storagePanel,'',false);this._frameId=frameId;this._manifestURL=manifestURL;this._refreshTitles();var icon=UI.Icon.create('largeicon-navigator-folder','navigator-tree-item');icon.classList.add('navigator-folder-tree-item');this.setLeadingIcons([icon]);}
get itemURL(){return'appcache://'+this._manifestURL+'/'+encodeURI(this.titleAsText());}
get frameId(){return this._frameId;}
get manifestURL(){return this._manifestURL;}
_refreshTitles(){var resourceTreeModel=SDK.ResourceTreeModel.fromTarget(this._storagePanel._target);var frame=resourceTreeModel.frameForId(this._frameId);this.title=frame.displayName();}
frameNavigated(){this._refreshTitles();}
onselect(selectedByUser){super.onselect(selectedByUser);this._storagePanel.showApplicationCache(this._frameId);return false;}};Resources.StorageCategoryView=class extends UI.VBox{constructor(){super();this.element.classList.add('storage-view');this._emptyWidget=new UI.EmptyWidget('');this._emptyWidget.show(this.element);}
setText(text){this._emptyWidget.text=text;}};;Resources.ResourcesSection=class{constructor(storagePanel,treeElement){this._panel=storagePanel;this._treeElement=treeElement;this._treeElementForFrameId=new Map();function addListener(eventType,handler,target){SDK.targetManager.addModelListener(SDK.ResourceTreeModel,eventType,event=>handler.call(target,event.data));}
addListener(SDK.ResourceTreeModel.Events.FrameAdded,this._frameAdded,this);addListener(SDK.ResourceTreeModel.Events.FrameNavigated,this._frameNavigated,this);addListener(SDK.ResourceTreeModel.Events.FrameDetached,this._frameDetached,this);addListener(SDK.ResourceTreeModel.Events.ResourceAdded,this._resourceAdded,this);var mainTarget=SDK.targetManager.mainTarget();var resourceTreeModel=mainTarget&&mainTarget.hasDOMCapability()&&SDK.ResourceTreeModel.fromTarget(mainTarget);var mainFrame=resourceTreeModel&&resourceTreeModel.mainFrame;if(mainFrame)
this._populateFrame(mainFrame);}
static _getParentFrame(frame){var parentFrame=frame.parentFrame;if(parentFrame)
return parentFrame;var parentTarget=frame.target().parentTarget();if(!parentTarget)
return null;console.assert(parentTarget.hasDOMCapability());return SDK.ResourceTreeModel.fromTarget(parentTarget).mainFrame;}
_frameAdded(frame){var parentFrame=Resources.ResourcesSection._getParentFrame(frame);var parentTreeElement=parentFrame?this._treeElementForFrameId.get(parentFrame.id):this._treeElement;if(!parentTreeElement){console.warn(`No frame to route ${frame.url} to.`);return;}
var frameTreeElement=new Resources.FrameTreeElement(this._panel,frame);this._treeElementForFrameId.set(frame.id,frameTreeElement);parentTreeElement.appendChild(frameTreeElement);}
_frameDetached(frame){var frameTreeElement=this._treeElementForFrameId.get(frame.id);if(!frameTreeElement)
return;this._treeElementForFrameId.remove(frame.id);if(frameTreeElement.parent)
frameTreeElement.parent.removeChild(frameTreeElement);}
_frameNavigated(frame){if(!Resources.ResourcesSection._getParentFrame(frame))
return;var frameTreeElement=this._treeElementForFrameId.get(frame.id);if(frameTreeElement)
frameTreeElement.frameNavigated(frame);}
_resourceAdded(resource){var statusCode=resource['statusCode'];if(statusCode>=301&&statusCode<=303)
return;var frameTreeElement=this._treeElementForFrameId.get(resource.frameId);if(!frameTreeElement){return;}
frameTreeElement.appendResource(resource);}
reset(){this._treeElement.removeChildren();this._treeElementForFrameId.clear();}
_populateFrame(frame){this._frameAdded(frame);for(var child of frame.childFrames)
this._populateFrame(child);for(var resource of frame.resources())
this._resourceAdded(resource);}};Resources.FrameTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,frame){super(storagePanel,'',false);this._panel=storagePanel;this._frame=frame;this._frameId=frame.id;this._categoryElements={};this._treeElementForResource={};this.frameNavigated(frame);var icon=UI.Icon.create('largeicon-navigator-frame','navigator-tree-item');icon.classList.add('navigator-frame-tree-item');this.setLeadingIcons([icon]);}
frameNavigated(frame){this.removeChildren();this._frameId=frame.id;this.title=frame.displayName();this._categoryElements={};this._treeElementForResource={};}
get itemURL(){return'frame://'+encodeURI(this.titleAsText());}
onselect(selectedByUser){super.onselect(selectedByUser);this._panel.showCategoryView(this.titleAsText());this.listItemElement.classList.remove('hovered');SDK.DOMModel.hideDOMNodeHighlight();return false;}
set hovered(hovered){if(hovered){this.listItemElement.classList.add('hovered');var domModel=SDK.DOMModel.fromTarget(this._frame.target());if(domModel)
domModel.highlightFrame(this._frameId);}else{this.listItemElement.classList.remove('hovered');SDK.DOMModel.hideDOMNodeHighlight();}}
appendResource(resource){var resourceType=resource.resourceType();var categoryName=resourceType.name();var categoryElement=resourceType===Common.resourceTypes.Document?this:this._categoryElements[categoryName];if(!categoryElement){categoryElement=new Resources.StorageCategoryTreeElement(this._panel,resource.resourceType().category().title,categoryName);this._categoryElements[resourceType.name()]=categoryElement;this._insertInPresentationOrder(this,categoryElement);}
var resourceTreeElement=new Resources.FrameResourceTreeElement(this._panel,resource);this._insertInPresentationOrder(categoryElement,resourceTreeElement);this._treeElementForResource[resource.url]=resourceTreeElement;}
resourceByURL(url){var treeElement=this._treeElementForResource[url];return treeElement?treeElement._resource:null;}
appendChild(treeElement){this._insertInPresentationOrder(this,treeElement);}
_insertInPresentationOrder(parentTreeElement,childTreeElement){function typeWeight(treeElement){if(treeElement instanceof Resources.StorageCategoryTreeElement)
return 2;if(treeElement instanceof Resources.FrameTreeElement)
return 1;return 3;}
function compare(treeElement1,treeElement2){var typeWeight1=typeWeight(treeElement1);var typeWeight2=typeWeight(treeElement2);var result;if(typeWeight1>typeWeight2)
result=1;else if(typeWeight1<typeWeight2)
result=-1;else
result=treeElement1.titleAsText().localeCompare(treeElement2.titleAsText());return result;}
var childCount=parentTreeElement.childCount();var i;for(i=0;i<childCount;++i){if(compare(childTreeElement,parentTreeElement.childAt(i))<0)
break;}
parentTreeElement.insertChild(childTreeElement,i);}};Resources.FrameResourceTreeElement=class extends Resources.BaseStorageTreeElement{constructor(storagePanel,resource){super(storagePanel,resource.displayName,false);this._panel=storagePanel;this._resource=resource;this._sourceFrame=null;this.tooltip=resource.url;this._resource[Resources.FrameResourceTreeElement._symbol]=this;var icon=UI.Icon.create('largeicon-navigator-file','navigator-tree-item');icon.classList.add('navigator-file-tree-item');icon.classList.add('navigator-'+resource.resourceType().name()+'-tree-item');this.setLeadingIcons([icon]);}
static forResource(resource){return resource[Resources.FrameResourceTreeElement._symbol];}
static resourceViewForResource(resource){if(resource.hasTextContent()){var treeElement=Resources.FrameResourceTreeElement.forResource(resource);if(!treeElement)
return null;return treeElement._sourceView();}
switch(resource.resourceType()){case Common.resourceTypes.Image:return new SourceFrame.ImageView(resource.mimeType,resource);case Common.resourceTypes.Font:return new SourceFrame.FontView(resource.mimeType,resource);default:return new UI.EmptyWidget(resource.url);}}
get itemURL(){return this._resource.url;}
onselect(selectedByUser){super.onselect(selectedByUser);this.showView(Resources.FrameResourceTreeElement.resourceViewForResource(this._resource));return false;}
ondblclick(event){InspectorFrontendHost.openInNewTab(this._resource.url);return false;}
onattach(){super.onattach();this.listItemElement.draggable=true;this.listItemElement.addEventListener('dragstart',this._ondragstart.bind(this),false);this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_ondragstart(event){event.dataTransfer.setData('text/plain',this._resource.content||'');event.dataTransfer.effectAllowed='copy';return true;}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);contextMenu.appendApplicableItems(this._resource);contextMenu.show();}
_sourceView(){if(!this._sourceFrame){this._sourceFrame=new SourceFrame.ResourceSourceFrame(this._resource);this._sourceFrame.setHighlighterType(this._resource.canonicalMimeType());}
return this._sourceFrame;}};Resources.FrameResourceTreeElement._symbol=Symbol('treeElement');;Resources.ServiceWorkerCacheView=class extends UI.SimpleView{constructor(model,cache){super(Common.UIString('Cache'));this.registerRequiredCSS('resources/serviceWorkerCacheViews.css');this._model=model;this.element.classList.add('service-worker-cache-data-view');this.element.classList.add('storage-view');this._createEditorToolbar();this._refreshButton=new UI.ToolbarButton(Common.UIString('Refresh'),'largeicon-refresh');this._refreshButton.addEventListener(UI.ToolbarButton.Events.Click,this._refreshButtonClicked,this);this._pageSize=50;this._skipCount=0;this.update(cache);this._entries=[];}
_createDataGrid(){var columns=([{id:'number',title:Common.UIString('#'),width:'50px'},{id:'request',title:Common.UIString('Request')},{id:'response',title:Common.UIString('Response')}]);return new DataGrid.DataGrid(columns,undefined,this._deleteButtonClicked.bind(this),this._updateData.bind(this,true));}
_createEditorToolbar(){var editorToolbar=new UI.Toolbar('data-view-toolbar',this.element);this._pageBackButton=new UI.ToolbarButton(Common.UIString('Show previous page'),'largeicon-play-back');this._pageBackButton.addEventListener(UI.ToolbarButton.Events.Click,this._pageBackButtonClicked,this);editorToolbar.appendToolbarItem(this._pageBackButton);this._pageForwardButton=new UI.ToolbarButton(Common.UIString('Show next page'),'largeicon-play');this._pageForwardButton.setEnabled(false);this._pageForwardButton.addEventListener(UI.ToolbarButton.Events.Click,this._pageForwardButtonClicked,this);editorToolbar.appendToolbarItem(this._pageForwardButton);}
_pageBackButtonClicked(event){this._skipCount=Math.max(0,this._skipCount-this._pageSize);this._updateData(false);}
_pageForwardButtonClicked(event){this._skipCount=this._skipCount+this._pageSize;this._updateData(false);}
_deleteButtonClicked(node){this._model.deleteCacheEntry(this._cache,(node.data['request']),node.remove.bind(node));}
update(cache){this._cache=cache;if(this._dataGrid)
this._dataGrid.asWidget().detach();this._dataGrid=this._createDataGrid();this._dataGrid.asWidget().show(this.element);this._skipCount=0;this._updateData(true);}
_updateDataCallback(skipCount,entries,hasMore){this._refreshButton.setEnabled(true);this.clear();this._entries=entries;for(var i=0;i<entries.length;++i){var data={};data['number']=i+skipCount;data['request']=entries[i].request;data['response']=entries[i].response;var node=new DataGrid.DataGridNode(data);node.selectable=true;this._dataGrid.rootNode().appendChild(node);}
this._pageBackButton.setEnabled(!!skipCount);this._pageForwardButton.setEnabled(hasMore);}
_updateData(force){var pageSize=this._pageSize;var skipCount=this._skipCount;this._refreshButton.setEnabled(false);if(!force&&this._lastPageSize===pageSize&&this._lastSkipCount===skipCount)
return;if(this._lastPageSize!==pageSize){skipCount=0;this._skipCount=0;}
this._lastPageSize=pageSize;this._lastSkipCount=skipCount;this._model.loadCacheData(this._cache,skipCount,pageSize,this._updateDataCallback.bind(this,skipCount));}
_refreshButtonClicked(event){this._updateData(true);}
syncToolbarItems(){return[this._refreshButton];}
clear(){this._dataGrid.rootNode().removeChildren();this._entries=[];}};;Resources.ServiceWorkersView=class extends UI.VBox{constructor(){super(true);this._reportView=new UI.ReportView(Common.UIString('Service Workers'));this._reportView.show(this.contentElement);this._toolbar=this._reportView.createToolbar();this._toolbar.makeWrappable(false,true);this._sections=new Map();this._toolbar.appendToolbarItem(NetworkConditions.NetworkConditionsSelector.createOfflineToolbarCheckbox());var updateOnReloadSetting=Common.settings.createSetting('serviceWorkerUpdateOnReload',false);updateOnReloadSetting.setTitle(Common.UIString('Update on reload'));var forceUpdate=new UI.ToolbarSettingCheckbox(updateOnReloadSetting,Common.UIString('Force update Service Worker on page reload'));this._toolbar.appendToolbarItem(forceUpdate);var bypassServiceWorkerSetting=Common.settings.createSetting('bypassServiceWorker',false);bypassServiceWorkerSetting.setTitle(Common.UIString('Bypass for network'));var fallbackToNetwork=new UI.ToolbarSettingCheckbox(bypassServiceWorkerSetting,Common.UIString('Bypass Service Worker and load resources from the network'));this._toolbar.appendToolbarItem(fallbackToNetwork);this._showAllCheckbox=new UI.ToolbarCheckbox(Common.UIString('Show all'),Common.UIString('Show all Service Workers regardless of the origin'));this._showAllCheckbox.setRightAligned(true);this._showAllCheckbox.inputElement.addEventListener('change',this._updateSectionVisibility.bind(this),false);this._toolbar.appendToolbarItem(this._showAllCheckbox);this._eventListeners=new Map();SDK.targetManager.observeModels(SDK.ServiceWorkerManager,this);}
modelAdded(serviceWorkerManager){if(this._manager)
return;this._manager=serviceWorkerManager;this._securityOriginManager=SDK.SecurityOriginManager.fromTarget(serviceWorkerManager.target());for(var registration of this._manager.registrations().values())
this._updateRegistration(registration);this._eventListeners.set(serviceWorkerManager,[this._manager.addEventListener(SDK.ServiceWorkerManager.Events.RegistrationUpdated,this._registrationUpdated,this),this._manager.addEventListener(SDK.ServiceWorkerManager.Events.RegistrationDeleted,this._registrationDeleted,this),this._manager.addEventListener(SDK.ServiceWorkerManager.Events.RegistrationErrorAdded,this._registrationErrorAdded,this),this._securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded,this._updateSectionVisibility,this),this._securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved,this._updateSectionVisibility,this),]);}
modelRemoved(serviceWorkerManager){if(!this._manager||this._manager!==serviceWorkerManager)
return;Common.EventTarget.removeEventListeners(this._eventListeners.get(serviceWorkerManager));this._eventListeners.delete(serviceWorkerManager);this._manager=null;this._securityOriginManager=null;}
_updateSectionVisibility(){var securityOrigins=new Set(this._securityOriginManager.securityOrigins());for(var section of this._sections.values()){var visible=this._showAllCheckbox.checked()||securityOrigins.has(section._registration.securityOrigin);section._section.element.classList.toggle('hidden',!visible);}}
_registrationUpdated(event){var registration=(event.data);this._updateRegistration(registration);this._gcRegistrations();}
_gcRegistrations(){var hasNonDeletedRegistrations=false;var securityOrigins=new Set(this._securityOriginManager.securityOrigins());for(var registration of this._manager.registrations().values()){var visible=this._showAllCheckbox.checked()||securityOrigins.has(registration.securityOrigin);if(!visible)
continue;if(!registration.canBeRemoved()){hasNonDeletedRegistrations=true;break;}}
if(!hasNonDeletedRegistrations)
return;for(var registration of this._manager.registrations().values()){var visible=this._showAllCheckbox.checked()||securityOrigins.has(registration.securityOrigin);if(visible&&registration.canBeRemoved())
this._removeRegistrationFromList(registration);}}
_registrationErrorAdded(event){var registration=(event.data['registration']);var error=(event.data['error']);var section=this._sections.get(registration);if(!section)
return;section._addError(error);}
_updateRegistration(registration){var section=this._sections.get(registration);if(!section){section=new Resources.ServiceWorkersView.Section(this._manager,this._reportView.appendSection(''),registration);this._sections.set(registration,section);}
this._updateSectionVisibility();section._scheduleUpdate();}
_registrationDeleted(event){var registration=(event.data);this._removeRegistrationFromList(registration);}
_removeRegistrationFromList(registration){var section=this._sections.get(registration);if(section)
section._section.remove();this._sections.delete(registration);}};Resources.ServiceWorkersView.Section=class{constructor(manager,section,registration){this._manager=manager;this._section=section;this._registration=registration;this._toolbar=section.createToolbar();this._toolbar.renderAsLinks();this._updateButton=new UI.ToolbarButton(Common.UIString('Update'),undefined,Common.UIString('Update'));this._updateButton.addEventListener(UI.ToolbarButton.Events.Click,this._updateButtonClicked,this);this._toolbar.appendToolbarItem(this._updateButton);this._pushButton=new UI.ToolbarButton(Common.UIString('Emulate push event'),undefined,Common.UIString('Push'));this._pushButton.addEventListener(UI.ToolbarButton.Events.Click,this._pushButtonClicked,this);this._toolbar.appendToolbarItem(this._pushButton);this._syncButton=new UI.ToolbarButton(Common.UIString('Emulate background sync event'),undefined,Common.UIString('Sync'));this._syncButton.addEventListener(UI.ToolbarButton.Events.Click,this._syncButtonClicked,this);this._toolbar.appendToolbarItem(this._syncButton);this._deleteButton=new UI.ToolbarButton(Common.UIString('Unregister service worker'),undefined,Common.UIString('Unregister'));this._deleteButton.addEventListener(UI.ToolbarButton.Events.Click,this._unregisterButtonClicked,this);this._toolbar.appendToolbarItem(this._deleteButton);this._section.appendField(Common.UIString('Source'));this._section.appendField(Common.UIString('Status'));this._section.appendField(Common.UIString('Clients'));this._section.appendField(Common.UIString('Errors'));this._errorsList=this._wrapWidget(this._section.appendRow());this._errorsList.classList.add('service-worker-error-stack','monospace','hidden');this._linkifier=new Components.Linkifier();this._clientInfoCache=new Map();for(var error of registration.errors)
this._addError(error);this._throttler=new Common.Throttler(500);}
_scheduleUpdate(){if(Resources.ServiceWorkersView._noThrottle){this._update();return;}
this._throttler.schedule(this._update.bind(this));}
_targetForVersionId(versionId){var version=this._manager.findVersion(versionId);if(!version||!version.targetId)
return null;return SDK.targetManager.targetById(version.targetId);}
_update(){var fingerprint=this._registration.fingerprint();if(fingerprint===this._fingerprint)
return Promise.resolve();this._fingerprint=fingerprint;this._toolbar.setEnabled(!this._registration.isDeleted);var versions=this._registration.versionsByMode();var title=this._registration.isDeleted?Common.UIString('%s - deleted',this._registration.scopeURL):this._registration.scopeURL;this._section.setTitle(title);var active=versions.get(SDK.ServiceWorkerVersion.Modes.Active);var waiting=versions.get(SDK.ServiceWorkerVersion.Modes.Waiting);var installing=versions.get(SDK.ServiceWorkerVersion.Modes.Installing);var statusValue=this._wrapWidget(this._section.appendField(Common.UIString('Status')));statusValue.removeChildren();var versionsStack=statusValue.createChild('div','service-worker-version-stack');versionsStack.createChild('div','service-worker-version-stack-bar');if(active){var scriptElement=this._section.appendField(Common.UIString('Source'));scriptElement.removeChildren();var fileName=Common.ParsedURL.extractName(active.scriptURL);scriptElement.appendChild(Components.Linkifier.linkifyURL(active.scriptURL,fileName));scriptElement.createChild('div','report-field-value-subtitle').textContent=Common.UIString('Received %s',new Date(active.scriptResponseTime*1000).toLocaleString());var activeEntry=versionsStack.createChild('div','service-worker-version');activeEntry.createChild('div','service-worker-active-circle');activeEntry.createChild('span').textContent=Common.UIString('#%s activated and is %s',active.id,active.runningStatus);if(active.isRunning()||active.isStarting()){createLink(activeEntry,Common.UIString('stop'),this._stopButtonClicked.bind(this,active.id));if(!this._targetForVersionId(active.id))
createLink(activeEntry,Common.UIString('inspect'),this._inspectButtonClicked.bind(this,active.id));}else if(active.isStartable()){createLink(activeEntry,Common.UIString('start'),this._startButtonClicked.bind(this));}
var clientsList=this._wrapWidget(this._section.appendField(Common.UIString('Clients')));clientsList.removeChildren();this._section.setFieldVisible(Common.UIString('Clients'),active.controlledClients.length);for(var client of active.controlledClients){var clientLabelText=clientsList.createChild('div','service-worker-client');if(this._clientInfoCache.has(client)){this._updateClientInfo(clientLabelText,(this._clientInfoCache.get(client)));}
this._manager.target().targetAgent().getTargetInfo(client,this._onClientInfo.bind(this,clientLabelText));}}
if(waiting){var waitingEntry=versionsStack.createChild('div','service-worker-version');waitingEntry.createChild('div','service-worker-waiting-circle');waitingEntry.createChild('span').textContent=Common.UIString('#%s waiting to activate',waiting.id);createLink(waitingEntry,Common.UIString('skipWaiting'),this._skipButtonClicked.bind(this));waitingEntry.createChild('div','service-worker-subtitle').textContent=new Date(waiting.scriptResponseTime*1000).toLocaleString();if(!this._targetForVersionId(waiting.id)&&(waiting.isRunning()||waiting.isStarting()))
createLink(waitingEntry,Common.UIString('inspect'),this._inspectButtonClicked.bind(this,waiting.id));}
if(installing){var installingEntry=versionsStack.createChild('div','service-worker-version');installingEntry.createChild('div','service-worker-installing-circle');installingEntry.createChild('span').textContent=Common.UIString('#%s installing',installing.id);installingEntry.createChild('div','service-worker-subtitle').textContent=new Date(installing.scriptResponseTime*1000).toLocaleString();if(!this._targetForVersionId(installing.id)&&(installing.isRunning()||installing.isStarting()))
createLink(installingEntry,Common.UIString('inspect'),this._inspectButtonClicked.bind(this,installing.id));}
this._section.setFieldVisible(Common.UIString('Errors'),!!this._registration.errors.length);var errorsValue=this._wrapWidget(this._section.appendField(Common.UIString('Errors')));var errorsLabel=UI.createLabel(String(this._registration.errors.length),'smallicon-error');errorsLabel.classList.add('service-worker-errors-label');errorsValue.appendChild(errorsLabel);this._moreButton=createLink(errorsValue,this._errorsList.classList.contains('hidden')?Common.UIString('details'):Common.UIString('hide'),this._moreErrorsButtonClicked.bind(this));createLink(errorsValue,Common.UIString('clear'),this._clearErrorsButtonClicked.bind(this));function createLink(parent,title,listener){var span=parent.createChild('span','link');span.textContent=title;span.addEventListener('click',listener,false);return span;}
return Promise.resolve();}
_addError(error){var target=this._targetForVersionId(error.versionId);var message=this._errorsList.createChild('div');if(this._errorsList.childElementCount>100)
this._errorsList.firstElementChild.remove();message.appendChild(this._linkifier.linkifyScriptLocation(target,null,error.sourceURL,error.lineNumber));message.appendChild(UI.createLabel('#'+error.versionId+': '+error.errorMessage,'smallicon-error'));}
_unregisterButtonClicked(event){this._manager.deleteRegistration(this._registration.id);}
_updateButtonClicked(event){this._manager.updateRegistration(this._registration.id);}
_pushButtonClicked(event){var data='Test push message from DevTools.';this._manager.deliverPushMessage(this._registration.id,data);}
_syncButtonClicked(event){var tag='test-tag-from-devtools';var lastChance=true;this._manager.dispatchSyncEvent(this._registration.id,tag,lastChance);}
_onClientInfo(element,error,targetInfo){if(error||!targetInfo)
return;this._clientInfoCache.set(targetInfo.targetId,targetInfo);this._updateClientInfo(element,targetInfo);}
_updateClientInfo(element,targetInfo){if(targetInfo.type!=='page'&&targetInfo.type==='iframe'){element.createTextChild(Common.UIString('Worker: %s',targetInfo.url));return;}
element.removeChildren();element.createTextChild(targetInfo.url);var focusLabel=element.createChild('label','link');focusLabel.createTextChild('focus');focusLabel.addEventListener('click',this._activateTarget.bind(this,targetInfo.targetId),true);}
_activateTarget(targetId){this._manager.target().targetAgent().activateTarget(targetId);}
_startButtonClicked(){this._manager.startWorker(this._registration.scopeURL);}
_skipButtonClicked(){this._manager.skipWaiting(this._registration.scopeURL);}
_stopButtonClicked(versionId){this._manager.stopWorker(versionId);}
_moreErrorsButtonClicked(){var newVisible=this._errorsList.classList.contains('hidden');this._moreButton.textContent=newVisible?Common.UIString('hide'):Common.UIString('details');this._errorsList.classList.toggle('hidden',!newVisible);}
_clearErrorsButtonClicked(){this._errorsList.removeChildren();this._registration.clearErrors();this._scheduleUpdate();if(!this._errorsList.classList.contains('hidden'))
this._moreErrorsButtonClicked();}
_inspectButtonClicked(versionId){this._manager.inspectWorker(versionId);}
_wrapWidget(container){var shadowRoot=UI.createShadowRootWithCoreStyles(container);UI.appendStyle(shadowRoot,'resources/serviceWorkersView.css');var contentElement=createElement('div');shadowRoot.appendChild(contentElement);return contentElement;}};;Runtime.cachedResources["resources/appManifestView.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n/*# sourceURL=resources/appManifestView.css */";Runtime.cachedResources["resources/clearStorageView.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.report-row {\n    display: flex;\n    align-items: center;\n}\n\n.clear-storage-button .report-row {\n    margin: 0 0 0 20px;\n    display: flex;\n}\n\n.link {\n    margin-left: 10px;\n    display: none;\n}\n\n.report-row:hover .link {\n    display: inline;\n}\n\n/*# sourceURL=resources/clearStorageView.css */";Runtime.cachedResources["resources/indexedDBViews.css"]="/*\n * Copyright (C) 2012 Google Inc. All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions are\n * met:\n *\n *     * Redistributions of source code must retain the above copyright\n * notice, this list of conditions and the following disclaimer.\n *     * Redistributions in binary form must reproduce the above\n * copyright notice, this list of conditions and the following disclaimer\n * in the documentation and/or other materials provided with the\n * distribution.\n *     * Neither the name of Google Inc. nor the names of its\n * contributors may be used to endorse or promote products derived from\n * this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n * \"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.indexed-db-database-view {\n    -webkit-user-select: text;\n    margin-top: 5px;\n}\n\n.indexed-db-data-view .data-view-toolbar {\n    position: relative;\n    background-color: #eee;\n    border-bottom: 1px solid #ccc;\n}\n\n.indexed-db-data-view .data-view-toolbar .key-input {\n    margin: auto 0;\n    width: 200px;\n}\n\n.indexed-db-data-view .data-grid {\n    flex: auto;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-child(even) {\n    background-color: white;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-child(odd) {\n    background-color: #EAF3FF;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-last-child(1) {\n    background-color: white;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-last-child(1) td {\n    border: 0;\n}\n\n.indexed-db-data-view .data-grid .data-container tr:nth-last-child(2) td {\n    border-bottom: 1px solid #aaa;\n}\n\n.indexed-db-data-view .section,\n.indexed-db-data-view .section > .header,\n.indexed-db-data-view .section > .header .title {\n    margin: 0;\n    min-height: inherit;\n    line-height: inherit;\n}\n\n.indexed-db-data-view .primitive-value {\n    padding-top: 1px;\n}\n\n.indexed-db-data-view .data-grid .data-container td .section .header .title {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n.indexed-db-key-path {\n    color: rgb(196, 26, 22);\n    white-space: pre-wrap;\n    unicode-bidi: -webkit-isolate;\n}\n\n/*# sourceURL=resources/indexedDBViews.css */";Runtime.cachedResources["resources/resourcesPanel.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.resources-toolbar {\n    border-top: 1px solid #ccc;\n    background-color: #f3f3f3;\n}\n\n.top-resources-toolbar {\n    border-bottom: 1px solid #ccc;\n    background-color: #f3f3f3;\n}\n\nli.selected .base-storage-tree-element-subtitle {\n    color: white;\n}\n\n.base-storage-tree-element-subtitle {\n    padding-left: 2px;\n    color: rgb(80, 80, 80);\n    text-shadow: none;\n}\n\n.resources.panel .status {\n    float: right;\n    height: 16px;\n    margin-top: 1px;\n    margin-left: 4px;\n    line-height: 1em;\n}\n\n.storage-view {\n    display: flex;\n    overflow: hidden;\n}\n\n.storage-view {\n    overflow: hidden;\n}\n\n.storage-view .data-grid:not(.inline) {\n    border: none;\n    flex: auto;\n}\n\n.storage-view .storage-table-error {\n    color: rgb(66%, 33%, 33%);\n    font-size: 24px;\n    font-weight: bold;\n    padding: 10px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.storage-view.query {\n    padding: 2px 0;\n    overflow-y: overlay;\n    overflow-x: hidden;\n}\n\n.storage-view .filter-bar {\n    border-top: none;\n    border-bottom: 1px solid #dadada;\n}\n\n.database-query-prompt {\n    position: relative;\n    padding: 1px 22px 1px 24px;\n    min-height: 16px;\n    white-space: pre-wrap;\n    -webkit-user-modify: read-write-plaintext-only;\n    -webkit-user-select: text;\n}\n\n.prompt-icon {\n    position: absolute;\n    display: block;\n    left: 7px;\n    top: 0.8em;\n    margin-top: -7px;\n    -webkit-user-select: none;\n}\n\n.database-user-query {\n    position: relative;\n    border-bottom: 1px solid rgb(245, 245, 245);\n    padding: 1px 22px 1px 24px;\n    min-height: 16px;\n    flex-shrink: 0;\n}\n\n.database-query-text {\n    color: rgb(0, 128, 255);\n    -webkit-user-select: text;\n}\n\n.database-query-result {\n    position: relative;\n    padding: 1px 22px 1px 24px;\n    min-height: 16px;\n    margin-left: -24px;\n    padding-right: 0;\n}\n\n.database-query-result.error {\n    color: red;\n    -webkit-user-select: text;\n}\n\n.resource-sidebar-tree-item .icon {\n    content: url(Images/resourcePlainIconSmall.png);\n}\n\n.resource-sidebar-tree-item.resources-type-image .icon {\n    position: relative;\n    background-image: url(Images/resourcePlainIcon.png);\n    background-repeat: no-repeat;\n    content: \"\";\n}\n\n.resources-type-image .image-resource-icon-preview {\n    position: absolute;\n    margin: auto;\n    min-width: 1px;\n    min-height: 1px;\n    top: 2px;\n    bottom: 1px;\n    left: 3px;\n    right: 3px;\n    max-width: 8px;\n    max-height: 11px;\n    overflow: hidden;\n}\n\n.resources-sidebar {\n    padding: 0;\n}\n\n/*# sourceURL=resources/resourcesPanel.css */";Runtime.cachedResources["resources/resourcesSidebar.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline {\n    padding-left: 0;\n    color: rgb(90, 90, 90);\n}\n\n.tree-outline > ol {\n    padding-bottom: 10px;\n}\n\n.tree-outline li {\n    min-height: 20px;\n}\n\nli.storage-group-list-item {\n    border-top: 1px solid rgb(230, 230, 230);\n    padding: 10px 8px 6px 8px;\n}\n\nli.storage-group-list-item::before {\n    display: none;\n}\n\n.navigator-tree-item {\n    margin: -3px -7px -3px -7px;\n}\n\n.navigator-file-tree-item {\n    background: linear-gradient(45deg, hsl(0, 0%, 50%), hsl(0, 0%, 70%));\n}\n\n.navigator-folder-tree-item {\n    background: linear-gradient(45deg, hsl(210, 82%, 65%), hsl(210, 82%, 80%));\n}\n\n.navigator-frame-tree-item {\n    background-color: #5a5a5a;\n}\n\n.navigator-script-tree-item {\n    background: linear-gradient(45deg, hsl(48, 70%, 50%), hsl(48, 70%, 70%));\n}\n\n.navigator-stylesheet-tree-item {\n    background: linear-gradient(45deg, hsl(256, 50%, 50%), hsl(256, 50%, 70%));\n}\n\n.navigator-image-tree-item,\n.navigator-font-tree-item {\n    background: linear-gradient(45deg, hsl(109, 33%, 50%), hsl(109, 33%, 70%));\n}\n\n.resource-tree-item {\n    background: rgba(90, 90, 90, .7);\n}\n\n/*# sourceURL=resources/resourcesSidebar.css */";Runtime.cachedResources["resources/serviceWorkerCacheViews.css"]="/*\n * Copyright 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.service-worker-cache-data-view .data-view-toolbar {\n    position: relative;\n    background-color: #eee;\n    border-bottom: 1px solid #ccc;\n}\n\n.service-worker-cache-data-view .data-view-toolbar .key-input {\n    margin: auto 0;\n    width: 200px;\n}\n\n.service-worker-cache-data-view .data-grid {\n    flex: auto;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-child(even) {\n    background-color: white;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-child(odd) {\n    background-color: #EAF3FF;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-last-child(1) {\n    background-color: white;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-last-child(1) td {\n    border: 0;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr:nth-last-child(2) td {\n    border-bottom: 1px solid #aaa;\n}\n\n.service-worker-cache-data-view .data-grid .data-container tr.selected {\n    background-color: rgb(212, 212, 212);\n    color: inherit;\n}\n\n.service-worker-cache-data-view .data-grid:focus .data-container tr.selected {\n    background-color: rgb(56, 121, 217);\n    color: white;\n}\n\n.service-worker-cache-data-view .section,\n.service-worker-cache-data-view .section > .header,\n.service-worker-cache-data-view .section > .header .title {\n    margin: 0;\n    min-height: inherit;\n    line-height: inherit;\n}\n\n.service-worker-cache-data-view .primitive-value {\n    padding-top: 1px;\n}\n\n.service-worker-cache-data-view .data-grid .data-container td .section .header .title {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n/*# sourceURL=resources/serviceWorkerCacheViews.css */";Runtime.cachedResources["resources/serviceWorkersView.css"]="/*\n * Copyright 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.service-worker-error-stack {\n    max-height: 200px;\n    overflow: auto;\n    display: flex;\n    flex-direction: column;\n    border: 1px solid #ccc;\n    background-color: #fff0f0;\n    color: red;\n    line-height: 18px;\n    margin: 10px 2px 0 -14px;\n    white-space: initial;\n}\n\n.service-worker-error-stack > div {\n    flex: none;\n    padding: 3px 4px;\n}\n\n.service-worker-error-stack > div:not(:last-child) {\n    border-bottom: 1px solid #ffd7d7;\n}\n\n.service-worker-error-stack label {\n    flex: auto;\n}\n\n.service-worker-error-stack .devtools-link {\n    float: right;\n    color: rgb(33%, 33%, 33%);\n    cursor: pointer;\n}\n\n.service-worker-version-stack {\n    position: relative;\n}\n\n.service-worker-version-stack-bar {\n    position: absolute;\n    top: 10px;\n    bottom: 20px;\n    left: 4px;\n    content: \"\";\n    border-left: 1px solid #888;\n    z-index: 0;\n}\n\n.service-worker-version:not(:last-child) {\n    margin-bottom: 7px;\n}\n\n.service-worker-active-circle,\n.service-worker-waiting-circle,\n.service-worker-installing-circle {\n    position: relative;\n    display: inline-block;\n    width: 10px;\n    height: 10px;\n    z-index: 10;\n    margin-right: 5px;\n    border-radius: 50%;\n    border: 1px solid #555;\n}\n\n.service-worker-active-circle {\n    background-color: #50B04F;\n}\n.service-worker-waiting-circle {\n    background-color: #F38E24;\n\n}\n.service-worker-installing-circle {\n    background-color: white;\n}\n\n\n.service-worker-subtitle {\n    padding-left: 14px;\n    line-height: 14px;\n    color: #888;\n}\n\n.link {\n    margin-left: 10px;\n}\n\n/*# sourceURL=resources/serviceWorkersView.css */";