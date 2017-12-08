WebInspector.CookiesTable=function(expandable,refreshCallback,selectedCallback)
{WebInspector.VBox.call(this);var readOnly=expandable;this._refreshCallback=refreshCallback;var columns=[{id:"name",title:WebInspector.UIString("Name"),sortable:true,disclosure:expandable,sort:WebInspector.DataGrid.Order.Ascending,longText:true,weight:24},{id:"value",title:WebInspector.UIString("Value"),sortable:true,longText:true,weight:34},{id:"domain",title:WebInspector.UIString("Domain"),sortable:true,weight:7},{id:"path",title:WebInspector.UIString("Path"),sortable:true,weight:7},{id:"expires",title:WebInspector.UIString("Expires / Max-Age"),sortable:true,weight:7},{id:"size",title:WebInspector.UIString("Size"),sortable:true,align:WebInspector.DataGrid.Align.Right,weight:7},{id:"httpOnly",title:WebInspector.UIString("HTTP"),sortable:true,align:WebInspector.DataGrid.Align.Center,weight:7},{id:"secure",title:WebInspector.UIString("Secure"),sortable:true,align:WebInspector.DataGrid.Align.Center,weight:7},{id:"firstPartyOnly",title:WebInspector.UIString("First-Party"),sortable:true,align:WebInspector.DataGrid.Align.Center,weight:7}];if(readOnly)
this._dataGrid=new WebInspector.DataGrid(columns);else
this._dataGrid=new WebInspector.DataGrid(columns,undefined,this._onDeleteCookie.bind(this),refreshCallback,this._onContextMenu.bind(this));this._dataGrid.setName("cookiesTable");this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged,this._rebuildTable,this);if(selectedCallback)
this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode,selectedCallback,this);this._nextSelectedCookie=(null);this._dataGrid.show(this.element);this._data=[];}
WebInspector.CookiesTable.prototype={_clearAndRefresh:function(domain)
{this.clear(domain);this._refresh();},_onContextMenu:function(contextMenu,node)
{if(node===this._dataGrid.creationNode)
return;var cookie=node.cookie;var domain=cookie.domain();if(domain)
contextMenu.appendItem(WebInspector.UIString.capitalize("Clear ^all from \"%s\"",domain),this._clearAndRefresh.bind(this,domain));contextMenu.appendItem(WebInspector.UIString.capitalize("Clear ^all"),this._clearAndRefresh.bind(this,null));},setCookies:function(cookies)
{this.setCookieFolders([{cookies:cookies}]);},setCookieFolders:function(cookieFolders)
{this._data=cookieFolders;this._rebuildTable();},selectedCookie:function()
{var node=this._dataGrid.selectedNode;return node?node.cookie:null;},clear:function(domain)
{for(var i=0,length=this._data.length;i<length;++i){var cookies=this._data[i].cookies;for(var j=0,cookieCount=cookies.length;j<cookieCount;++j){if(!domain||cookies[j].domain()===domain)
cookies[j].remove();}}},_rebuildTable:function()
{var selectedCookie=this._nextSelectedCookie||this.selectedCookie();this._nextSelectedCookie=null;this._dataGrid.rootNode().removeChildren();for(var i=0;i<this._data.length;++i){var item=this._data[i];if(item.folderName){var groupData={name:item.folderName,value:"",domain:"",path:"",expires:"",size:this._totalSize(item.cookies),httpOnly:"",secure:"",firstPartyOnly:""};var groupNode=new WebInspector.DataGridNode(groupData);groupNode.selectable=true;this._dataGrid.rootNode().appendChild(groupNode);groupNode.element().classList.add("row-group");this._populateNode(groupNode,item.cookies,selectedCookie);groupNode.expand();}else
this._populateNode(this._dataGrid.rootNode(),item.cookies,selectedCookie);}},_populateNode:function(parentNode,cookies,selectedCookie)
{parentNode.removeChildren();if(!cookies)
return;this._sortCookies(cookies);for(var i=0;i<cookies.length;++i){var cookie=cookies[i];var cookieNode=this._createGridNode(cookie);parentNode.appendChild(cookieNode);if(selectedCookie&&selectedCookie.name()===cookie.name()&&selectedCookie.domain()===cookie.domain()&&selectedCookie.path()===cookie.path())
cookieNode.select();}},_totalSize:function(cookies)
{var totalSize=0;for(var i=0;cookies&&i<cookies.length;++i)
totalSize+=cookies[i].size();return totalSize;},_sortCookies:function(cookies)
{var sortDirection=this._dataGrid.isSortOrderAscending()?1:-1;function compareTo(getter,cookie1,cookie2)
{return sortDirection*(getter.apply(cookie1)+"").compareTo(getter.apply(cookie2)+"");}
function numberCompare(getter,cookie1,cookie2)
{return sortDirection*(getter.apply(cookie1)-getter.apply(cookie2));}
function expiresCompare(cookie1,cookie2)
{if(cookie1.session()!==cookie2.session())
return sortDirection*(cookie1.session()?1:-1);if(cookie1.session())
return 0;if(cookie1.maxAge()&&cookie2.maxAge())
return sortDirection*(cookie1.maxAge()-cookie2.maxAge());if(cookie1.expires()&&cookie2.expires())
return sortDirection*(cookie1.expires()-cookie2.expires());return sortDirection*(cookie1.expires()?1:-1);}
var comparator;switch(this._dataGrid.sortColumnIdentifier()){case"name":comparator=compareTo.bind(null,WebInspector.Cookie.prototype.name);break;case"value":comparator=compareTo.bind(null,WebInspector.Cookie.prototype.value);break;case"domain":comparator=compareTo.bind(null,WebInspector.Cookie.prototype.domain);break;case"path":comparator=compareTo.bind(null,WebInspector.Cookie.prototype.path);break;case"expires":comparator=expiresCompare;break;case"size":comparator=numberCompare.bind(null,WebInspector.Cookie.prototype.size);break;case"httpOnly":comparator=compareTo.bind(null,WebInspector.Cookie.prototype.httpOnly);break;case"secure":comparator=compareTo.bind(null,WebInspector.Cookie.prototype.secure);break;case"firstPartyOnly":comparator=compareTo.bind(null,WebInspector.Cookie.prototype.firstPartyOnly);break;default:compareTo.bind(null,WebInspector.Cookie.prototype.name);}
cookies.sort(comparator);},_createGridNode:function(cookie)
{var data={};data.name=cookie.name();data.value=cookie.value();if(cookie.type()===WebInspector.Cookie.Type.Request){data.domain=WebInspector.UIString("N/A");data.path=WebInspector.UIString("N/A");data.expires=WebInspector.UIString("N/A");}else{data.domain=cookie.domain()||"";data.path=cookie.path()||"";if(cookie.maxAge())
data.expires=Number.secondsToString(parseInt(cookie.maxAge(),10));else if(cookie.expires())
data.expires=new Date(cookie.expires()).toISOString();else
data.expires=WebInspector.UIString("Session");}
data.size=cookie.size();const checkmark="\u2713";data.httpOnly=(cookie.httpOnly()?checkmark:"");data.secure=(cookie.secure()?checkmark:"");data.firstPartyOnly=(cookie.firstPartyOnly()?checkmark:"");var node=new WebInspector.DataGridNode(data);node.cookie=cookie;node.selectable=true;return node;},_onDeleteCookie:function(node)
{var cookie=node.cookie;var neighbour=node.traverseNextNode()||node.traversePreviousNode();if(neighbour)
this._nextSelectedCookie=neighbour.cookie;cookie.remove();this._refresh();},_refresh:function()
{if(this._refreshCallback)
this._refreshCallback();},__proto__:WebInspector.VBox.prototype};WebInspector.FilmStripModel=function(tracingModel)
{this._tracingModel=tracingModel;this._frames=[];var browserProcess=tracingModel.processByName("Browser");if(!browserProcess)
return;var mainThread=browserProcess.threadByName("CrBrowserMain");if(!mainThread)
return;var events=mainThread.events();for(var i=0;i<events.length;++i){if(events[i].category==="disabled-by-default-devtools.screenshot"&&events[i].name==="CaptureFrame"){var data=events[i].args.data;if(!data)
continue;this._frames.push(new WebInspector.FilmStripModel.Frame(this,data,events[i].startTime,this._frames.length));}}}
WebInspector.FilmStripModel.prototype={frames:function()
{return this._frames;},zeroTime:function()
{return this._tracingModel.minimumRecordTime();},firstFrameAfterCommit:function(timestamp)
{var bestIndex=0;var bestDelta=Number.MAX_VALUE;for(var i=0;i<this._frames.length;++i){var delta=this._frames[i].timestamp-timestamp;if(delta<0)
continue;if(delta<bestDelta){bestIndex=i;bestDelta=delta;}}
return bestDelta<10?this._frames[bestIndex]:null;}}
WebInspector.FilmStripModel.Frame=function(model,imageData,timestamp,index)
{this._model=model;this.imageData=imageData;this.timestamp=timestamp;this.index=index;}
WebInspector.FilmStripModel.Frame.prototype={model:function()
{return this._model;}};WebInspector.FilmStripView=function()
{WebInspector.HBox.call(this,true);this.registerRequiredCSS("components_lazy/filmStripView.css");this.contentElement.classList.add("film-strip-view");this.reset();}
WebInspector.FilmStripView.Events={FrameSelected:"FrameSelected",FrameEnter:"FrameEnter",FrameExit:"FrameExit",}
WebInspector.FilmStripView.prototype={setModel:function(filmStripModel,zeroTime)
{var frames=filmStripModel.frames();if(!frames.length){this.reset();return;}
this._zeroTime=zeroTime;this.contentElement.removeChildren();this._label.remove();for(var i=0;i<frames.length;++i){var element=createElementWithClass("div","frame");element.createChild("div","thumbnail").createChild("img").src="data:image/jpg;base64,"+frames[i].imageData;element.createChild("div","time").textContent=Number.millisToString(frames[i].timestamp-zeroTime);element.addEventListener("mousedown",this._onMouseEvent.bind(this,WebInspector.FilmStripView.Events.FrameSelected,frames[i].timestamp),false);element.addEventListener("mouseenter",this._onMouseEvent.bind(this,WebInspector.FilmStripView.Events.FrameEnter,frames[i].timestamp),false);element.addEventListener("mouseout",this._onMouseEvent.bind(this,WebInspector.FilmStripView.Events.FrameExit,frames[i].timestamp),false);element.addEventListener("dblclick",this._onDoubleClick.bind(this,frames[i]),false);this.contentElement.appendChild(element);}},_onMouseEvent:function(eventName,timestamp)
{this.dispatchEventToListeners(eventName,timestamp);},_onDoubleClick:function(filmStripFrame)
{WebInspector.Dialog.show(null,new WebInspector.FilmStripView.DialogDelegate(filmStripFrame,this._zeroTime));},reset:function()
{this._zeroTime=0;this.contentElement.removeChildren();this._label=this.contentElement.createChild("div","label");this._label.textContent=WebInspector.UIString("No frames recorded. Reload page to start recording.");},setRecording:function()
{this.reset();this._label.textContent=WebInspector.UIString("Recording frames...");},setFetching:function()
{this._label.textContent=WebInspector.UIString("Fetching frames...");},__proto__:WebInspector.HBox.prototype}
WebInspector.FilmStripView.DialogDelegate=function(filmStripFrame,zeroTime)
{WebInspector.DialogDelegate.call(this);var shadowRoot=this.element.createShadowRoot();shadowRoot.appendChild(WebInspector.Widget.createStyleElement("components_lazy/filmStripDialog.css"));this._contentElement=shadowRoot.createChild("div","filmstrip-dialog");this._contentElement.tabIndex=0;this._frames=filmStripFrame.model().frames();this._index=filmStripFrame.index;this._zeroTime=zeroTime||filmStripFrame.model().zeroTime();this._imageElement=this._contentElement.createChild("img");var footerElement=this._contentElement.createChild("div","filmstrip-dialog-footer");footerElement.createChild("div","flex-auto");var prevButton=createTextButton("\u25C0",this._onPrevFrame.bind(this),undefined,WebInspector.UIString("Previous frame"));footerElement.appendChild(prevButton);this._timeLabel=footerElement.createChild("div","filmstrip-dialog-label");var nextButton=createTextButton("\u25B6",this._onNextFrame.bind(this),undefined,WebInspector.UIString("Next frame"));footerElement.appendChild(nextButton);footerElement.createChild("div","flex-auto");this._render();this._contentElement.addEventListener("keydown",this._keyDown.bind(this),false);}
WebInspector.FilmStripView.DialogDelegate.prototype={focus:function()
{this._contentElement.focus();},_keyDown:function(event)
{if(event.keyIdentifier==="Left"){if(WebInspector.isMac()&&event.metaKey){this._onFirstFrame();return;}
this._onPrevFrame();return;}
if(event.keyIdentifier==="Right"){if(WebInspector.isMac()&&event.metaKey){this._onLastFrame();return;}
this._onNextFrame();}
if(event.keyIdentifier==="Home"){this._onFirstFrame();return;}
if(event.keyIdentifier==="End"){this._onLastFrame();return;}},_onPrevFrame:function()
{if(this._index>0)
--this._index;this._render();},_onNextFrame:function()
{if(this._index<this._frames.length-1)
++this._index;this._render();},_onFirstFrame:function()
{this._index=0;this._render();},_onLastFrame:function()
{this._index=this._frames.length-1;this._render();},_render:function()
{var frame=this._frames[this._index];this._imageElement.src="data:image/jpg;base64,"+frame.imageData;this._timeLabel.textContent=Number.millisToString(frame.timestamp-this._zeroTime);},__proto__:WebInspector.DialogDelegate.prototype};Runtime.cachedResources["components_lazy/filmStripDialog.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.filmstrip-dialog {\n    margin: 12px;\n}\n\n.filmstrip-dialog > img {\n    border: 1px solid #ddd;\n}\n\n.filmstrip-dialog-footer {\n    display: flex;\n    align-items: center;\n    margin-top: 10px;\n}\n\n.filmstrip-dialog-label {\n    margin: 8px 8px;\n}\n\n/*# sourceURL=components_lazy/filmStripDialog.css */";Runtime.cachedResources["components_lazy/filmStripView.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.film-strip-view {\n    overflow-x: auto;\n    overflow-y: hidden;\n    align-content: flex-start;\n    height: 130px;\n}\n\n.film-strip-view .label {\n    margin: auto;\n    font-size: 18px;\n    color: #999;\n}\n\n.film-strip-view .frame {\n    display: inline-flex;\n    flex-direction: column;\n    align-items: center;\n    padding: 6px 9px 3px 9px;\n    flex: none;\n    height: 114px;\n}\n\n.film-strip-view .frame-limit-reached {\n    font-size: 24px;\n    color: #888;\n    justify-content: center;\n    display: inline-flex;\n    flex-direction: column;\n    flex: none;\n}\n\n.film-strip-view .frame:hover {\n    background-color: #eee;\n}\n\n.film-strip-view .frame .thumbnail {\n    min-width: 48px;\n    display: flex;\n    flex-direction: row;\n    align-items: center;\n    pointer-events: none;\n}\n\n.film-strip-view .frame .thumbnail img {\n    border: solid 1px #ccc;\n    height: auto;\n    width: auto;\n    margin: auto;\n    max-width: 162px;\n    max-height: 90px;\n    box-shadow: 3px 3px 4px rgba(0, 0, 0, 0.5);\n    pointer-events: none;\n}\n\n.film-strip-view .frame .time {\n    font-size: 10px;\n    margin-top: 3px;\n}\n\n/*# sourceURL=components_lazy/filmStripView.css */";