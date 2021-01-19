WebInspector.AuditsPanel=function()
{WebInspector.PanelWithSidebarTree.call(this,"audits");this.registerRequiredCSS("panelEnablerView.css");this.registerRequiredCSS("auditsPanel.css");this.auditsTreeElement=new WebInspector.SidebarSectionTreeElement("",{},true);this.sidebarTree.appendChild(this.auditsTreeElement);this.auditsTreeElement.listItemElement.classList.add("hidden");this.auditsItemTreeElement=new WebInspector.AuditsSidebarTreeElement(this);this.auditsTreeElement.appendChild(this.auditsItemTreeElement);this.auditResultsTreeElement=new WebInspector.SidebarSectionTreeElement(WebInspector.UIString("RESULTS"),{},true);this.sidebarTree.appendChild(this.auditResultsTreeElement);this.auditResultsTreeElement.expand();this._constructCategories();var target=(WebInspector.targetManager.activeTarget());this._auditController=new WebInspector.AuditController(target,this);this._launcherView=new WebInspector.AuditLauncherView(this._auditController);for(var id in this.categoriesById)
this._launcherView.addCategory(this.categoriesById[id]);}
WebInspector.AuditsPanel.prototype={canSearch:function()
{return false;},get categoriesById()
{return this._auditCategoriesById;},addCategory:function(category)
{this.categoriesById[category.id]=category;this._launcherView.addCategory(category);},getCategory:function(id)
{return this.categoriesById[id];},_constructCategories:function()
{this._auditCategoriesById={};for(var categoryCtorID in WebInspector.AuditCategories){var auditCategory=new WebInspector.AuditCategories[categoryCtorID]();auditCategory._id=categoryCtorID;this.categoriesById[categoryCtorID]=auditCategory;}},auditFinishedCallback:function(mainResourceURL,results)
{var children=this.auditResultsTreeElement.children;var ordinal=1;for(var i=0;i<children.length;++i){if(children[i].mainResourceURL===mainResourceURL)
ordinal++;}
var resultTreeElement=new WebInspector.AuditResultSidebarTreeElement(this,results,mainResourceURL,ordinal);this.auditResultsTreeElement.appendChild(resultTreeElement);resultTreeElement.revealAndSelect();},showResults:function(categoryResults)
{if(!categoryResults._resultView)
categoryResults._resultView=new WebInspector.AuditResultView(categoryResults);this.visibleView=categoryResults._resultView;},showLauncherView:function()
{this.visibleView=this._launcherView;},get visibleView()
{return this._visibleView;},set visibleView(x)
{if(this._visibleView===x)
return;if(this._visibleView)
this._visibleView.detach();this._visibleView=x;if(x)
x.show(this.mainElement());},wasShown:function()
{WebInspector.Panel.prototype.wasShown.call(this);if(!this._visibleView)
this.auditsItemTreeElement.select();},clearResults:function()
{this.auditsItemTreeElement.revealAndSelect();this.auditResultsTreeElement.removeChildren();},__proto__:WebInspector.PanelWithSidebarTree.prototype}
WebInspector.AuditCategoryImpl=function(displayName)
{this._displayName=displayName;this._rules=[];}
WebInspector.AuditCategoryImpl.prototype={get id()
{return this._id;},get displayName()
{return this._displayName;},addRule:function(rule,severity)
{rule.severity=severity;this._rules.push(rule);},run:function(target,requests,ruleResultCallback,categoryDoneCallback,progress)
{this._ensureInitialized();var remainingRulesCount=this._rules.length;progress.setTotalWork(remainingRulesCount);function callbackWrapper(result)
{ruleResultCallback(result);progress.worked();if(!--remainingRulesCount)
categoryDoneCallback();}
for(var i=0;i<this._rules.length;++i)
this._rules[i].run(target,requests,callbackWrapper,progress);},_ensureInitialized:function()
{if(!this._initialized){if("initialize"in this)
this.initialize();this._initialized=true;}}}
WebInspector.AuditRule=function(id,displayName)
{this._id=id;this._displayName=displayName;}
WebInspector.AuditRule.Severity={Info:"info",Warning:"warning",Severe:"severe"}
WebInspector.AuditRule.SeverityOrder={"info":3,"warning":2,"severe":1}
WebInspector.AuditRule.prototype={get id()
{return this._id;},get displayName()
{return this._displayName;},set severity(severity)
{this._severity=severity;},run:function(target,requests,callback,progress)
{if(progress.isCanceled())
return;var result=new WebInspector.AuditRuleResult(this.displayName);result.severity=this._severity;this.doRun(target,requests,result,callback,progress);},doRun:function(target,requests,result,callback,progress)
{throw new Error("doRun() not implemented");}}
WebInspector.AuditCategoryResult=function(category)
{this.title=category.displayName;this.ruleResults=[];}
WebInspector.AuditCategoryResult.prototype={addRuleResult:function(ruleResult)
{this.ruleResults.push(ruleResult);}}
WebInspector.AuditRuleResult=function(value,expanded,className)
{this.value=value;this.className=className;this.expanded=expanded;this.violationCount=0;this._formatters={r:WebInspector.AuditRuleResult.linkifyDisplayName};var standardFormatters=Object.keys(String.standardFormatters);for(var i=0;i<standardFormatters.length;++i)
this._formatters[standardFormatters[i]]=String.standardFormatters[standardFormatters[i]];}
WebInspector.AuditRuleResult.linkifyDisplayName=function(url)
{return WebInspector.linkifyURLAsNode(url,WebInspector.displayNameForURL(url));}
WebInspector.AuditRuleResult.resourceDomain=function(domain)
{return domain||WebInspector.UIString("[empty domain]");}
WebInspector.AuditRuleResult.prototype={addChild:function(value,expanded,className)
{if(!this.children)
this.children=[];var entry=new WebInspector.AuditRuleResult(value,expanded,className);this.children.push(entry);return entry;},addURL:function(url)
{this.addChild(WebInspector.AuditRuleResult.linkifyDisplayName(url));},addURLs:function(urls)
{for(var i=0;i<urls.length;++i)
this.addURL(urls[i]);},addSnippet:function(snippet)
{this.addChild(snippet,false,"source-code");},addFormatted:function(format,vararg)
{var substitutions=Array.prototype.slice.call(arguments,1);var fragment=document.createDocumentFragment();function append(a,b)
{if(!(b instanceof Node))
b=document.createTextNode(b);a.appendChild(b);return a;}
var formattedResult=String.format(format,substitutions,this._formatters,fragment,append).formattedResult;if(formattedResult instanceof Node)
formattedResult.normalize();return this.addChild(formattedResult);}}
WebInspector.AuditsSidebarTreeElement=function(panel)
{this._panel=panel;this.small=false;WebInspector.SidebarTreeElement.call(this,"audits-sidebar-tree-item",WebInspector.UIString("Audits"),"",null,false);}
WebInspector.AuditsSidebarTreeElement.prototype={onattach:function()
{WebInspector.SidebarTreeElement.prototype.onattach.call(this);},onselect:function()
{this._panel.showLauncherView();},get selectable()
{return true;},refresh:function()
{this.refreshTitles();},__proto__:WebInspector.SidebarTreeElement.prototype}
WebInspector.AuditResultSidebarTreeElement=function(panel,results,mainResourceURL,ordinal)
{this._panel=panel;this.results=results;this.mainResourceURL=mainResourceURL;WebInspector.SidebarTreeElement.call(this,"audit-result-sidebar-tree-item",String.sprintf("%s (%d)",mainResourceURL,ordinal),"",{},false);}
WebInspector.AuditResultSidebarTreeElement.prototype={onselect:function()
{this._panel.showResults(this.results);},get selectable()
{return true;},__proto__:WebInspector.SidebarTreeElement.prototype}
WebInspector.AuditRules={};WebInspector.AuditCategories={};WebInspector.AuditCategory=function()
{}
WebInspector.AuditCategory.prototype={get id()
{},get displayName()
{},run:function(target,requests,ruleResultCallback,categoryDoneCallback,progress)
{}};WebInspector.AuditCategories.PagePerformance=function(){WebInspector.AuditCategoryImpl.call(this,WebInspector.AuditCategories.PagePerformance.AuditCategoryName);}
WebInspector.AuditCategories.PagePerformance.AuditCategoryName=WebInspector.UIString("Web Page Performance");WebInspector.AuditCategories.PagePerformance.prototype={initialize:function()
{this.addRule(new WebInspector.AuditRules.UnusedCssRule(),WebInspector.AuditRule.Severity.Warning);this.addRule(new WebInspector.AuditRules.CssInHeadRule(),WebInspector.AuditRule.Severity.Severe);this.addRule(new WebInspector.AuditRules.StylesScriptsOrderRule(),WebInspector.AuditRule.Severity.Severe);this.addRule(new WebInspector.AuditRules.VendorPrefixedCSSProperties(),WebInspector.AuditRule.Severity.Warning);},__proto__:WebInspector.AuditCategoryImpl.prototype}
WebInspector.AuditCategories.NetworkUtilization=function(){WebInspector.AuditCategoryImpl.call(this,WebInspector.AuditCategories.NetworkUtilization.AuditCategoryName);}
WebInspector.AuditCategories.NetworkUtilization.AuditCategoryName=WebInspector.UIString("Network Utilization");WebInspector.AuditCategories.NetworkUtilization.prototype={initialize:function()
{this.addRule(new WebInspector.AuditRules.GzipRule(),WebInspector.AuditRule.Severity.Severe);this.addRule(new WebInspector.AuditRules.ImageDimensionsRule(),WebInspector.AuditRule.Severity.Warning);this.addRule(new WebInspector.AuditRules.CookieSizeRule(400),WebInspector.AuditRule.Severity.Warning);this.addRule(new WebInspector.AuditRules.StaticCookielessRule(5),WebInspector.AuditRule.Severity.Warning);this.addRule(new WebInspector.AuditRules.CombineJsResourcesRule(2),WebInspector.AuditRule.Severity.Severe);this.addRule(new WebInspector.AuditRules.CombineCssResourcesRule(2),WebInspector.AuditRule.Severity.Severe);this.addRule(new WebInspector.AuditRules.MinimizeDnsLookupsRule(4),WebInspector.AuditRule.Severity.Warning);this.addRule(new WebInspector.AuditRules.ParallelizeDownloadRule(4,10,0.5),WebInspector.AuditRule.Severity.Warning);this.addRule(new WebInspector.AuditRules.BrowserCacheControlRule(),WebInspector.AuditRule.Severity.Severe);this.addRule(new WebInspector.AuditRules.ProxyCacheControlRule(),WebInspector.AuditRule.Severity.Warning);},__proto__:WebInspector.AuditCategoryImpl.prototype};WebInspector.AuditController=function(target,auditsPanel)
{WebInspector.TargetAware.call(this,target);this._auditsPanel=auditsPanel;this.target().resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.Load,this._didMainResourceLoad,this);}
WebInspector.AuditController.prototype={_executeAudit:function(categories,resultCallback)
{this._progress.setTitle(WebInspector.UIString("Running audit"));function ruleResultReadyCallback(categoryResult,ruleResult)
{if(ruleResult&&ruleResult.children)
categoryResult.addRuleResult(ruleResult);if(this._progress.isCanceled())
this._progress.done();}
var results=[];var mainResourceURL=this.target().resourceTreeModel.inspectedPageURL();var categoriesDone=0;function categoryDoneCallback()
{if(++categoriesDone!==categories.length)
return;this._progress.done();resultCallback(mainResourceURL,results)}
var requests=this.target().networkLog.requests.slice();var compositeProgress=new WebInspector.CompositeProgress(this._progress);var subprogresses=[];for(var i=0;i<categories.length;++i)
subprogresses.push(compositeProgress.createSubProgress());for(var i=0;i<categories.length;++i){var category=categories[i];var result=new WebInspector.AuditCategoryResult(category);results.push(result);category.run(this.target(),requests,ruleResultReadyCallback.bind(this,result),categoryDoneCallback.bind(this),subprogresses[i]);}},_auditFinishedCallback:function(launcherCallback,mainResourceURL,results)
{this._auditsPanel.auditFinishedCallback(mainResourceURL,results);if(!this._progress.isCanceled())
launcherCallback();},initiateAudit:function(categoryIds,progress,runImmediately,startedCallback,finishedCallback)
{if(!categoryIds||!categoryIds.length)
return;this._progress=progress;var categories=[];for(var i=0;i<categoryIds.length;++i)
categories.push(this._auditsPanel.categoriesById[categoryIds[i]]);function startAuditWhenResourcesReady()
{startedCallback();this._executeAudit(categories,this._auditFinishedCallback.bind(this,finishedCallback));}
if(runImmediately)
startAuditWhenResourcesReady.call(this);else
this._reloadResources(startAuditWhenResourcesReady.bind(this));WebInspector.userMetrics.AuditsStarted.record();},_reloadResources:function(callback)
{this._pageReloadCallback=callback;this.target().resourceTreeModel.reloadPage();},_didMainResourceLoad:function()
{if(this._pageReloadCallback){var callback=this._pageReloadCallback;delete this._pageReloadCallback;callback();}},clearResults:function()
{this._auditsPanel.clearResults();},__proto__:WebInspector.TargetAware.prototype};WebInspector.AuditFormatters=function()
{}
WebInspector.AuditFormatters.Registry={text:function(text)
{return document.createTextNode(text);},snippet:function(snippetText)
{var div=document.createElement("div");div.textContent=snippetText;div.className="source-code";return div;},concat:function()
{var parent=document.createElement("span");for(var arg=0;arg<arguments.length;++arg)
parent.appendChild(WebInspector.auditFormatters.apply(arguments[arg]));return parent;},url:function(url,displayText,allowExternalNavigation)
{var a=document.createElement("a");a.href=sanitizeHref(url);a.title=url;a.textContent=displayText||url;if(allowExternalNavigation)
a.target="_blank";return a;},resourceLink:function(url,line)
{return WebInspector.linkifyResourceAsNode(url,line,"console-message-url webkit-html-resource-link");}};WebInspector.AuditFormatters.prototype={apply:function(value)
{var formatter;var type=typeof value;var args;switch(type){case"string":case"boolean":case"number":formatter=WebInspector.AuditFormatters.Registry.text;args=[value.toString()];break;case"object":if(value instanceof Node)
return value;if(value instanceof Array){formatter=WebInspector.AuditFormatters.Registry.concat;args=value;}else if(value.type&&value.arguments){formatter=WebInspector.AuditFormatters.Registry[value.type];args=value.arguments;}}
if(!formatter)
throw"Invalid value or formatter: "+type+JSON.stringify(value);return formatter.apply(null,args);},partiallyApply:function(formatters,thisArgument,value)
{if(value instanceof Array)
return value.map(this.partiallyApply.bind(this,formatters,thisArgument));if(typeof value==="object"&&typeof formatters[value.type]==="function"&&value.arguments)
return formatters[value.type].apply(thisArgument,value.arguments);return value;}}
WebInspector.auditFormatters=new WebInspector.AuditFormatters();;WebInspector.AuditLauncherView=function(auditController)
{WebInspector.VBox.call(this);this.setMinimumSize(100,25);this._auditController=auditController;this._categoryIdPrefix="audit-category-item-";this._auditRunning=false;this.element.classList.add("audit-launcher-view");this.element.classList.add("panel-enabler-view");this._contentElement=document.createElement("div");this._contentElement.className="audit-launcher-view-content";this.element.appendChild(this._contentElement);this._boundCategoryClickListener=this._categoryClicked.bind(this);this._resetResourceCount();this._sortedCategories=[];this._headerElement=document.createElement("h1");this._headerElement.className="no-audits";this._headerElement.textContent=WebInspector.UIString("No audits to run");this._contentElement.appendChild(this._headerElement);var target=this._auditController.target();target.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.RequestStarted,this._onRequestStarted,this);target.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.RequestFinished,this._onRequestFinished,this);target.profilingLock.addEventListener(WebInspector.Lock.Events.StateChanged,this._updateButton,this);var defaultSelectedAuditCategory={};defaultSelectedAuditCategory[WebInspector.AuditLauncherView.AllCategoriesKey]=true;this._selectedCategoriesSetting=WebInspector.settings.createSetting("selectedAuditCategories",defaultSelectedAuditCategory);}
WebInspector.AuditLauncherView.AllCategoriesKey="__AllCategories";WebInspector.AuditLauncherView.prototype={_resetResourceCount:function()
{this._loadedResources=0;this._totalResources=0;},_onRequestStarted:function(event)
{var request=(event.data);if(request.type===WebInspector.resourceTypes.WebSocket)
return;++this._totalResources;this._updateResourceProgress();},_onRequestFinished:function(event)
{var request=(event.data);if(request.type===WebInspector.resourceTypes.WebSocket)
return;++this._loadedResources;this._updateResourceProgress();},addCategory:function(category)
{if(!this._sortedCategories.length)
this._createLauncherUI();var selectedCategories=this._selectedCategoriesSetting.get();var categoryElement=this._createCategoryElement(category.displayName,category.id);category._checkboxElement=categoryElement.firstChild;if(this._selectAllCheckboxElement.checked||selectedCategories[category.displayName]){category._checkboxElement.checked=true;++this._currentCategoriesCount;}
function compareCategories(a,b)
{var aTitle=a.displayName||"";var bTitle=b.displayName||"";return aTitle.localeCompare(bTitle);}
var insertBefore=insertionIndexForObjectInListSortedByFunction(category,this._sortedCategories,compareCategories);this._categoriesElement.insertBefore(categoryElement,this._categoriesElement.children[insertBefore]);this._sortedCategories.splice(insertBefore,0,category);this._selectedCategoriesUpdated();},_setAuditRunning:function(auditRunning)
{if(this._auditRunning===auditRunning)
return;this._auditRunning=auditRunning;this._updateButton();this._toggleUIComponents(this._auditRunning);var target=this._auditController.target();if(this._auditRunning){target.profilingLock.acquire();this._startAudit();}else{this._stopAudit();target.profilingLock.release();}},_startAudit:function()
{var catIds=[];for(var category=0;category<this._sortedCategories.length;++category){if(this._sortedCategories[category]._checkboxElement.checked)
catIds.push(this._sortedCategories[category].id);}
this._resetResourceCount();this._progressIndicator=new WebInspector.ProgressIndicator();this._buttonContainerElement.appendChild(this._progressIndicator.element);this._displayResourceLoadingProgress=true;function onAuditStarted()
{this._displayResourceLoadingProgress=false;}
this._auditController.initiateAudit(catIds,this._progressIndicator,this._auditPresentStateElement.checked,onAuditStarted.bind(this),this._setAuditRunning.bind(this,false));},_stopAudit:function()
{this._displayResourceLoadingProgress=false;this._progressIndicator.cancel();this._progressIndicator.done();delete this._progressIndicator;},_toggleUIComponents:function(disable)
{this._selectAllCheckboxElement.disabled=disable;this._categoriesElement.disabled=disable;this._auditPresentStateElement.disabled=disable;this._auditReloadedStateElement.disabled=disable;},_launchButtonClicked:function(event)
{this._setAuditRunning(!this._auditRunning);},_clearButtonClicked:function()
{this._auditController.clearResults();},_selectAllClicked:function(checkCategories,userGesture)
{var childNodes=this._categoriesElement.childNodes;for(var i=0,length=childNodes.length;i<length;++i)
childNodes[i].firstChild.checked=checkCategories;this._currentCategoriesCount=checkCategories?this._sortedCategories.length:0;this._selectedCategoriesUpdated(userGesture);},_categoryClicked:function(event)
{this._currentCategoriesCount+=event.target.checked?1:-1;this._selectAllCheckboxElement.checked=this._currentCategoriesCount===this._sortedCategories.length;this._selectedCategoriesUpdated(true);},_createCategoryElement:function(title,id)
{var labelElement=document.createElement("label");labelElement.id=this._categoryIdPrefix+id;var element=document.createElement("input");element.type="checkbox";if(id!=="")
element.addEventListener("click",this._boundCategoryClickListener,false);labelElement.appendChild(element);labelElement.appendChild(document.createTextNode(title));labelElement.__displayName=title;return labelElement;},_createLauncherUI:function()
{this._headerElement=document.createElement("h1");this._headerElement.textContent=WebInspector.UIString("Select audits to run");for(var child=0;child<this._contentElement.children.length;++child)
this._contentElement.removeChild(this._contentElement.children[child]);this._contentElement.appendChild(this._headerElement);function handleSelectAllClick(event)
{this._selectAllClicked(event.target.checked,true);}
var categoryElement=this._createCategoryElement(WebInspector.UIString("Select All"),"");categoryElement.id="audit-launcher-selectall";this._selectAllCheckboxElement=categoryElement.firstChild;this._selectAllCheckboxElement.checked=this._selectedCategoriesSetting.get()[WebInspector.AuditLauncherView.AllCategoriesKey];this._selectAllCheckboxElement.addEventListener("click",handleSelectAllClick.bind(this),false);this._contentElement.appendChild(categoryElement);this._categoriesElement=this._contentElement.createChild("fieldset","audit-categories-container");this._currentCategoriesCount=0;this._contentElement.createChild("div","flexible-space");this._buttonContainerElement=this._contentElement.createChild("div","button-container");var labelElement=this._buttonContainerElement.createChild("label");this._auditPresentStateElement=labelElement.createChild("input");this._auditPresentStateElement.name="audit-mode";this._auditPresentStateElement.type="radio";this._auditPresentStateElement.checked=true;this._auditPresentStateLabelElement=document.createTextNode(WebInspector.UIString("Audit Present State"));labelElement.appendChild(this._auditPresentStateLabelElement);labelElement=this._buttonContainerElement.createChild("label");this._auditReloadedStateElement=labelElement.createChild("input");this._auditReloadedStateElement.name="audit-mode";this._auditReloadedStateElement.type="radio";labelElement.appendChild(document.createTextNode("Reload Page and Audit on Load"));this._launchButton=this._buttonContainerElement.createChild("button");this._launchButton.textContent=WebInspector.UIString("Run");this._launchButton.addEventListener("click",this._launchButtonClicked.bind(this),false);this._clearButton=this._buttonContainerElement.createChild("button");this._clearButton.textContent=WebInspector.UIString("Clear");this._clearButton.addEventListener("click",this._clearButtonClicked.bind(this),false);this._selectAllClicked(this._selectAllCheckboxElement.checked);},_updateResourceProgress:function()
{if(this._displayResourceLoadingProgress)
this._progressIndicator.setTitle(WebInspector.UIString("Loading (%d of %d)",this._loadedResources,this._totalResources));},_selectedCategoriesUpdated:function(userGesture)
{var selectedCategories=userGesture?{}:this._selectedCategoriesSetting.get();var childNodes=this._categoriesElement.childNodes;for(var i=0,length=childNodes.length;i<length;++i)
selectedCategories[childNodes[i].__displayName]=childNodes[i].firstChild.checked;selectedCategories[WebInspector.AuditLauncherView.AllCategoriesKey]=this._selectAllCheckboxElement.checked;this._selectedCategoriesSetting.set(selectedCategories);this._updateButton();},_updateButton:function()
{var target=this._auditController.target();var enable=this._auditRunning||(this._currentCategoriesCount&&!target.profilingLock.isAcquired());this._launchButton.textContent=this._auditRunning?WebInspector.UIString("Stop"):WebInspector.UIString("Run");this._launchButton.disabled=!enable;this._launchButton.title=enable?"":WebInspector.UIString("Another profiler is already active");},__proto__:WebInspector.VBox.prototype};WebInspector.AuditResultView=function(categoryResults)
{WebInspector.SidebarPaneStack.call(this);this.setMinimumSize(100,25);this.element.classList.add("audit-result-view","fill");function categorySorter(a,b){return(a.title||"").localeCompare(b.title||"");}
categoryResults.sort(categorySorter);for(var i=0;i<categoryResults.length;++i)
this.addPane(new WebInspector.AuditCategoryResultPane(categoryResults[i]));}
WebInspector.AuditResultView.prototype={__proto__:WebInspector.SidebarPaneStack.prototype}
WebInspector.AuditCategoryResultPane=function(categoryResult)
{WebInspector.SidebarPane.call(this,categoryResult.title);var treeOutlineElement=document.createElement("ol");this.bodyElement.classList.add("audit-result-tree");this.bodyElement.appendChild(treeOutlineElement);this._treeOutline=new TreeOutline(treeOutlineElement);this._treeOutline.expandTreeElementsWhenArrowing=true;function ruleSorter(a,b)
{var result=WebInspector.AuditRule.SeverityOrder[a.severity||0]-WebInspector.AuditRule.SeverityOrder[b.severity||0];if(!result)
result=(a.value||"").localeCompare(b.value||"");return result;}
categoryResult.ruleResults.sort(ruleSorter);for(var i=0;i<categoryResult.ruleResults.length;++i){var ruleResult=categoryResult.ruleResults[i];var treeElement=this._appendResult(this._treeOutline,ruleResult,ruleResult.severity);treeElement.listItemElement.classList.add("audit-result");}
this.expand();}
WebInspector.AuditCategoryResultPane.prototype={_appendResult:function(parentTreeElement,result,severity)
{var title="";if(typeof result.value==="string"){title=result.value;if(result.violationCount)
title=String.sprintf("%s (%d)",title,result.violationCount);}
var titleFragment=document.createDocumentFragment();if(severity){var severityElement=document.createElement("div");severityElement.className="severity-"+severity;titleFragment.appendChild(severityElement);}
titleFragment.appendChild(document.createTextNode(title));var treeElement=new TreeElement(titleFragment,null,!!result.children);parentTreeElement.appendChild(treeElement);if(result.className)
treeElement.listItemElement.classList.add(result.className);if(typeof result.value!=="string")
treeElement.listItemElement.appendChild(WebInspector.auditFormatters.apply(result.value));if(result.children){for(var i=0;i<result.children.length;++i)
this._appendResult(treeElement,result.children[i]);}
if(result.expanded){treeElement.listItemElement.classList.remove("parent");treeElement.listItemElement.classList.add("parent-expanded");treeElement.expand();}
return treeElement;},__proto__:WebInspector.SidebarPane.prototype};WebInspector.AuditRules.IPAddressRegexp=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;WebInspector.AuditRules.CacheableResponseCodes={200:true,203:true,206:true,300:true,301:true,410:true,304:true}
WebInspector.AuditRules.getDomainToResourcesMap=function(requests,types,needFullResources)
{var domainToResourcesMap={};for(var i=0,size=requests.length;i<size;++i){var request=requests[i];if(types&&types.indexOf(request.type)===-1)
continue;var parsedURL=request.url.asParsedURL();if(!parsedURL)
continue;var domain=parsedURL.host;var domainResources=domainToResourcesMap[domain];if(domainResources===undefined){domainResources=[];domainToResourcesMap[domain]=domainResources;}
domainResources.push(needFullResources?request:request.url);}
return domainToResourcesMap;}
WebInspector.AuditRules.GzipRule=function()
{WebInspector.AuditRule.call(this,"network-gzip",WebInspector.UIString("Enable gzip compression"));}
WebInspector.AuditRules.GzipRule.prototype={doRun:function(target,requests,result,callback,progress)
{var totalSavings=0;var compressedSize=0;var candidateSize=0;var summary=result.addChild("",true);for(var i=0,length=requests.length;i<length;++i){var request=requests[i];if(request.cached||request.statusCode===304)
continue;if(this._shouldCompress(request)){var size=request.resourceSize;candidateSize+=size;if(this._isCompressed(request)){compressedSize+=size;continue;}
var savings=2*size/3;totalSavings+=savings;summary.addFormatted("%r could save ~%s",request.url,Number.bytesToString(savings));result.violationCount++;}}
if(!totalSavings){callback(null);return;}
summary.value=WebInspector.UIString("Compressing the following resources with gzip could reduce their transfer size by about two thirds (~%s):",Number.bytesToString(totalSavings));callback(result);},_isCompressed:function(request)
{var encodingHeader=request.responseHeaderValue("Content-Encoding");if(!encodingHeader)
return false;return/\b(?:gzip|deflate)\b/.test(encodingHeader);},_shouldCompress:function(request)
{return request.type.isTextType()&&request.parsedURL.host&&request.resourceSize!==undefined&&request.resourceSize>150;},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.CombineExternalResourcesRule=function(id,name,type,resourceTypeName,allowedPerDomain)
{WebInspector.AuditRule.call(this,id,name);this._type=type;this._resourceTypeName=resourceTypeName;this._allowedPerDomain=allowedPerDomain;}
WebInspector.AuditRules.CombineExternalResourcesRule.prototype={doRun:function(target,requests,result,callback,progress)
{var domainToResourcesMap=WebInspector.AuditRules.getDomainToResourcesMap(requests,[this._type],false);var penalizedResourceCount=0;var summary=result.addChild("",true);for(var domain in domainToResourcesMap){var domainResources=domainToResourcesMap[domain];var extraResourceCount=domainResources.length-this._allowedPerDomain;if(extraResourceCount<=0)
continue;penalizedResourceCount+=extraResourceCount-1;summary.addChild(WebInspector.UIString("%d %s resources served from %s.",domainResources.length,this._resourceTypeName,WebInspector.AuditRuleResult.resourceDomain(domain)));result.violationCount+=domainResources.length;}
if(!penalizedResourceCount){callback(null);return;}
summary.value=WebInspector.UIString("There are multiple resources served from same domain. Consider combining them into as few files as possible.");callback(result);},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.CombineJsResourcesRule=function(allowedPerDomain){WebInspector.AuditRules.CombineExternalResourcesRule.call(this,"page-externaljs",WebInspector.UIString("Combine external JavaScript"),WebInspector.resourceTypes.Script,"JavaScript",allowedPerDomain);}
WebInspector.AuditRules.CombineJsResourcesRule.prototype={__proto__:WebInspector.AuditRules.CombineExternalResourcesRule.prototype}
WebInspector.AuditRules.CombineCssResourcesRule=function(allowedPerDomain){WebInspector.AuditRules.CombineExternalResourcesRule.call(this,"page-externalcss",WebInspector.UIString("Combine external CSS"),WebInspector.resourceTypes.Stylesheet,"CSS",allowedPerDomain);}
WebInspector.AuditRules.CombineCssResourcesRule.prototype={__proto__:WebInspector.AuditRules.CombineExternalResourcesRule.prototype}
WebInspector.AuditRules.MinimizeDnsLookupsRule=function(hostCountThreshold){WebInspector.AuditRule.call(this,"network-minimizelookups",WebInspector.UIString("Minimize DNS lookups"));this._hostCountThreshold=hostCountThreshold;}
WebInspector.AuditRules.MinimizeDnsLookupsRule.prototype={doRun:function(target,requests,result,callback,progress)
{var summary=result.addChild("");var domainToResourcesMap=WebInspector.AuditRules.getDomainToResourcesMap(requests,null,false);for(var domain in domainToResourcesMap){if(domainToResourcesMap[domain].length>1)
continue;var parsedURL=domain.asParsedURL();if(!parsedURL)
continue;if(!parsedURL.host.search(WebInspector.AuditRules.IPAddressRegexp))
continue;summary.addSnippet(domain);result.violationCount++;}
if(!summary.children||summary.children.length<=this._hostCountThreshold){callback(null);return;}
summary.value=WebInspector.UIString("The following domains only serve one resource each. If possible, avoid the extra DNS lookups by serving these resources from existing domains.");callback(result);},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.ParallelizeDownloadRule=function(optimalHostnameCount,minRequestThreshold,minBalanceThreshold)
{WebInspector.AuditRule.call(this,"network-parallelizehosts",WebInspector.UIString("Parallelize downloads across hostnames"));this._optimalHostnameCount=optimalHostnameCount;this._minRequestThreshold=minRequestThreshold;this._minBalanceThreshold=minBalanceThreshold;}
WebInspector.AuditRules.ParallelizeDownloadRule.prototype={doRun:function(target,requests,result,callback,progress)
{function hostSorter(a,b)
{var aCount=domainToResourcesMap[a].length;var bCount=domainToResourcesMap[b].length;return(aCount<bCount)?1:(aCount===bCount)?0:-1;}
var domainToResourcesMap=WebInspector.AuditRules.getDomainToResourcesMap(requests,[WebInspector.resourceTypes.Stylesheet,WebInspector.resourceTypes.Image],true);var hosts=[];for(var url in domainToResourcesMap)
hosts.push(url);if(!hosts.length){callback(null);return;}
hosts.sort(hostSorter);var optimalHostnameCount=this._optimalHostnameCount;if(hosts.length>optimalHostnameCount)
hosts.splice(optimalHostnameCount);var busiestHostResourceCount=domainToResourcesMap[hosts[0]].length;var requestCountAboveThreshold=busiestHostResourceCount-this._minRequestThreshold;if(requestCountAboveThreshold<=0){callback(null);return;}
var avgResourcesPerHost=0;for(var i=0,size=hosts.length;i<size;++i)
avgResourcesPerHost+=domainToResourcesMap[hosts[i]].length;avgResourcesPerHost/=optimalHostnameCount;avgResourcesPerHost=Math.max(avgResourcesPerHost,1);var pctAboveAvg=(requestCountAboveThreshold/avgResourcesPerHost)-1.0;var minBalanceThreshold=this._minBalanceThreshold;if(pctAboveAvg<minBalanceThreshold){callback(null);return;}
var requestsOnBusiestHost=domainToResourcesMap[hosts[0]];var entry=result.addChild(WebInspector.UIString("This page makes %d parallelizable requests to %s. Increase download parallelization by distributing the following requests across multiple hostnames.",busiestHostResourceCount,hosts[0]),true);for(var i=0;i<requestsOnBusiestHost.length;++i)
entry.addURL(requestsOnBusiestHost[i].url);result.violationCount=requestsOnBusiestHost.length;callback(result);},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.UnusedCssRule=function()
{WebInspector.AuditRule.call(this,"page-unusedcss",WebInspector.UIString("Remove unused CSS rules"));}
WebInspector.AuditRules.UnusedCssRule.prototype={doRun:function(target,requests,result,callback,progress)
{function evalCallback(styleSheets){if(!styleSheets.length)
return callback(null);var selectors=[];var testedSelectors={};for(var i=0;i<styleSheets.length;++i){var styleSheet=styleSheets[i];for(var curRule=0;curRule<styleSheet.rules.length;++curRule){var selectorText=styleSheet.rules[curRule].selectorText;if(testedSelectors[selectorText])
continue;selectors.push(selectorText);testedSelectors[selectorText]=1;}}
var foundSelectors={};function selectorsCallback(styleSheets)
{if(progress.isCanceled())
return;var inlineBlockOrdinal=0;var totalStylesheetSize=0;var totalUnusedStylesheetSize=0;var summary;for(var i=0;i<styleSheets.length;++i){var styleSheet=styleSheets[i];var unusedRules=[];for(var curRule=0;curRule<styleSheet.rules.length;++curRule){var rule=styleSheet.rules[curRule];if(!testedSelectors[rule.selectorText]||foundSelectors[rule.selectorText])
continue;unusedRules.push(rule.selectorText);}
totalStylesheetSize+=styleSheet.rules.length;totalUnusedStylesheetSize+=unusedRules.length;if(!unusedRules.length)
continue;var resource=WebInspector.resourceForURL(styleSheet.sourceURL);var isInlineBlock=resource&&resource.request&&resource.request.type===WebInspector.resourceTypes.Document;var url=!isInlineBlock?WebInspector.AuditRuleResult.linkifyDisplayName(styleSheet.sourceURL):WebInspector.UIString("Inline block #%d",++inlineBlockOrdinal);var pctUnused=Math.round(100*unusedRules.length/styleSheet.rules.length);if(!summary)
summary=result.addChild("",true);var entry=summary.addFormatted("%s: %d% is not used by the current page.",url,pctUnused);for(var j=0;j<unusedRules.length;++j)
entry.addSnippet(unusedRules[j]);result.violationCount+=unusedRules.length;}
if(!totalUnusedStylesheetSize)
return callback(null);var totalUnusedPercent=Math.round(100*totalUnusedStylesheetSize/totalStylesheetSize);summary.value=WebInspector.UIString("%s rules (%d%) of CSS not used by the current page.",totalUnusedStylesheetSize,totalUnusedPercent);callback(result);}
function queryCallback(boundSelectorsCallback,selector,nodeId)
{if(nodeId)
foundSelectors[selector]=true;if(boundSelectorsCallback)
boundSelectorsCallback();}
function documentLoaded(selectors,document){var pseudoSelectorRegexp=/::?(?:[\w-]+)(?:\(.*?\))?/g;if(!selectors.length){selectorsCallback([]);return;}
for(var i=0;i<selectors.length;++i){if(progress.isCanceled())
return;var effectiveSelector=selectors[i].replace(pseudoSelectorRegexp,"");target.domModel.querySelector(document.id,effectiveSelector,queryCallback.bind(null,i===selectors.length-1?selectorsCallback.bind(null,styleSheets):null,selectors[i]));}}
target.domModel.requestDocument(documentLoaded.bind(null,selectors));}
var styleSheetInfos=target.cssModel.allStyleSheets();if(!styleSheetInfos||!styleSheetInfos.length){evalCallback([]);return;}
var styleSheetProcessor=new WebInspector.AuditRules.StyleSheetProcessor(styleSheetInfos,progress,evalCallback);styleSheetProcessor.run();},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.ParsedStyleSheet;WebInspector.AuditRules.StyleSheetProcessor=function(styleSheetHeaders,progress,styleSheetsParsedCallback)
{this._styleSheetHeaders=styleSheetHeaders;this._progress=progress;this._styleSheets=[];this._styleSheetsParsedCallback=styleSheetsParsedCallback;}
WebInspector.AuditRules.StyleSheetProcessor.prototype={run:function()
{this._parser=new WebInspector.CSSParser();this._processNextStyleSheet();},_terminateWorker:function()
{if(this._parser){this._parser.dispose();delete this._parser;}},_finish:function()
{this._terminateWorker();this._styleSheetsParsedCallback(this._styleSheets);},_processNextStyleSheet:function()
{if(!this._styleSheetHeaders.length){this._finish();return;}
this._currentStyleSheetHeader=this._styleSheetHeaders.shift();this._parser.fetchAndParse(this._currentStyleSheetHeader,this._onStyleSheetParsed.bind(this));},_onStyleSheetParsed:function(rules)
{if(this._progress.isCanceled()){this._terminateWorker();return;}
var styleRules=[];for(var i=0;i<rules.length;++i){var rule=rules[i];if(rule.selectorText)
styleRules.push(rule);}
this._styleSheets.push({sourceURL:this._currentStyleSheetHeader.sourceURL,rules:styleRules});this._processNextStyleSheet();},}
WebInspector.AuditRules.CacheControlRule=function(id,name)
{WebInspector.AuditRule.call(this,id,name);}
WebInspector.AuditRules.CacheControlRule.MillisPerMonth=1000*60*60*24*30;WebInspector.AuditRules.CacheControlRule.prototype={doRun:function(target,requests,result,callback,progress)
{var cacheableAndNonCacheableResources=this._cacheableAndNonCacheableResources(requests);if(cacheableAndNonCacheableResources[0].length)
this.runChecks(cacheableAndNonCacheableResources[0],result);this.handleNonCacheableResources(cacheableAndNonCacheableResources[1],result);callback(result);},handleNonCacheableResources:function(requests,result)
{},_cacheableAndNonCacheableResources:function(requests)
{var processedResources=[[],[]];for(var i=0;i<requests.length;++i){var request=requests[i];if(!this.isCacheableResource(request))
continue;if(this._isExplicitlyNonCacheable(request))
processedResources[1].push(request);else
processedResources[0].push(request);}
return processedResources;},execCheck:function(messageText,requestCheckFunction,requests,result)
{var requestCount=requests.length;var urls=[];for(var i=0;i<requestCount;++i){if(requestCheckFunction.call(this,requests[i]))
urls.push(requests[i].url);}
if(urls.length){var entry=result.addChild(messageText,true);entry.addURLs(urls);result.violationCount+=urls.length;}},freshnessLifetimeGreaterThan:function(request,timeMs)
{var dateHeader=this.responseHeader(request,"Date");if(!dateHeader)
return false;var dateHeaderMs=Date.parse(dateHeader);if(isNaN(dateHeaderMs))
return false;var freshnessLifetimeMs;var maxAgeMatch=this.responseHeaderMatch(request,"Cache-Control","max-age=(\\d+)");if(maxAgeMatch)
freshnessLifetimeMs=(maxAgeMatch[1])?1000*maxAgeMatch[1]:0;else{var expiresHeader=this.responseHeader(request,"Expires");if(expiresHeader){var expDate=Date.parse(expiresHeader);if(!isNaN(expDate))
freshnessLifetimeMs=expDate-dateHeaderMs;}}
return(isNaN(freshnessLifetimeMs))?false:freshnessLifetimeMs>timeMs;},responseHeader:function(request,header)
{return request.responseHeaderValue(header);},hasResponseHeader:function(request,header)
{return request.responseHeaderValue(header)!==undefined;},isCompressible:function(request)
{return request.type.isTextType();},isPubliclyCacheable:function(request)
{if(this._isExplicitlyNonCacheable(request))
return false;if(this.responseHeaderMatch(request,"Cache-Control","public"))
return true;return request.url.indexOf("?")===-1&&!this.responseHeaderMatch(request,"Cache-Control","private");},responseHeaderMatch:function(request,header,regexp)
{return request.responseHeaderValue(header)?request.responseHeaderValue(header).match(new RegExp(regexp,"im")):null;},hasExplicitExpiration:function(request)
{return this.hasResponseHeader(request,"Date")&&(this.hasResponseHeader(request,"Expires")||!!this.responseHeaderMatch(request,"Cache-Control","max-age"));},_isExplicitlyNonCacheable:function(request)
{var hasExplicitExp=this.hasExplicitExpiration(request);return!!this.responseHeaderMatch(request,"Cache-Control","(no-cache|no-store|must-revalidate)")||!!this.responseHeaderMatch(request,"Pragma","no-cache")||(hasExplicitExp&&!this.freshnessLifetimeGreaterThan(request,0))||(!hasExplicitExp&&!!request.url&&request.url.indexOf("?")>=0)||(!hasExplicitExp&&!this.isCacheableResource(request));},isCacheableResource:function(request)
{return request.statusCode!==undefined&&WebInspector.AuditRules.CacheableResponseCodes[request.statusCode];},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.BrowserCacheControlRule=function()
{WebInspector.AuditRules.CacheControlRule.call(this,"http-browsercache",WebInspector.UIString("Leverage browser caching"));}
WebInspector.AuditRules.BrowserCacheControlRule.prototype={handleNonCacheableResources:function(requests,result)
{if(requests.length){var entry=result.addChild(WebInspector.UIString("The following resources are explicitly non-cacheable. Consider making them cacheable if possible:"),true);result.violationCount+=requests.length;for(var i=0;i<requests.length;++i)
entry.addURL(requests[i].url);}},runChecks:function(requests,result,callback)
{this.execCheck(WebInspector.UIString("The following resources are missing a cache expiration. Resources that do not specify an expiration may not be cached by browsers:"),this._missingExpirationCheck,requests,result);this.execCheck(WebInspector.UIString("The following resources specify a \"Vary\" header that disables caching in most versions of Internet Explorer:"),this._varyCheck,requests,result);this.execCheck(WebInspector.UIString("The following cacheable resources have a short freshness lifetime:"),this._oneMonthExpirationCheck,requests,result);this.execCheck(WebInspector.UIString("To further improve cache hit rate, specify an expiration one year in the future for the following cacheable resources:"),this._oneYearExpirationCheck,requests,result);},_missingExpirationCheck:function(request)
{return this.isCacheableResource(request)&&!this.hasResponseHeader(request,"Set-Cookie")&&!this.hasExplicitExpiration(request);},_varyCheck:function(request)
{var varyHeader=this.responseHeader(request,"Vary");if(varyHeader){varyHeader=varyHeader.replace(/User-Agent/gi,"");varyHeader=varyHeader.replace(/Accept-Encoding/gi,"");varyHeader=varyHeader.replace(/[, ]*/g,"");}
return varyHeader&&varyHeader.length&&this.isCacheableResource(request)&&this.freshnessLifetimeGreaterThan(request,0);},_oneMonthExpirationCheck:function(request)
{return this.isCacheableResource(request)&&!this.hasResponseHeader(request,"Set-Cookie")&&!this.freshnessLifetimeGreaterThan(request,WebInspector.AuditRules.CacheControlRule.MillisPerMonth)&&this.freshnessLifetimeGreaterThan(request,0);},_oneYearExpirationCheck:function(request)
{return this.isCacheableResource(request)&&!this.hasResponseHeader(request,"Set-Cookie")&&!this.freshnessLifetimeGreaterThan(request,11*WebInspector.AuditRules.CacheControlRule.MillisPerMonth)&&this.freshnessLifetimeGreaterThan(request,WebInspector.AuditRules.CacheControlRule.MillisPerMonth);},__proto__:WebInspector.AuditRules.CacheControlRule.prototype}
WebInspector.AuditRules.ProxyCacheControlRule=function(){WebInspector.AuditRules.CacheControlRule.call(this,"http-proxycache",WebInspector.UIString("Leverage proxy caching"));}
WebInspector.AuditRules.ProxyCacheControlRule.prototype={runChecks:function(requests,result,callback)
{this.execCheck(WebInspector.UIString("Resources with a \"?\" in the URL are not cached by most proxy caching servers:"),this._questionMarkCheck,requests,result);this.execCheck(WebInspector.UIString("Consider adding a \"Cache-Control: public\" header to the following resources:"),this._publicCachingCheck,requests,result);this.execCheck(WebInspector.UIString("The following publicly cacheable resources contain a Set-Cookie header. This security vulnerability can cause cookies to be shared by multiple users."),this._setCookieCacheableCheck,requests,result);},_questionMarkCheck:function(request)
{return request.url.indexOf("?")>=0&&!this.hasResponseHeader(request,"Set-Cookie")&&this.isPubliclyCacheable(request);},_publicCachingCheck:function(request)
{return this.isCacheableResource(request)&&!this.isCompressible(request)&&!this.responseHeaderMatch(request,"Cache-Control","public")&&!this.hasResponseHeader(request,"Set-Cookie");},_setCookieCacheableCheck:function(request)
{return this.hasResponseHeader(request,"Set-Cookie")&&this.isPubliclyCacheable(request);},__proto__:WebInspector.AuditRules.CacheControlRule.prototype}
WebInspector.AuditRules.ImageDimensionsRule=function()
{WebInspector.AuditRule.call(this,"page-imagedims",WebInspector.UIString("Specify image dimensions"));}
WebInspector.AuditRules.ImageDimensionsRule.prototype={doRun:function(target,requests,result,callback,progress)
{var urlToNoDimensionCount={};function doneCallback()
{for(var url in urlToNoDimensionCount){var entry=entry||result.addChild(WebInspector.UIString("A width and height should be specified for all images in order to speed up page display. The following image(s) are missing a width and/or height:"),true);var format="%r";if(urlToNoDimensionCount[url]>1)
format+=" (%d uses)";entry.addFormatted(format,url,urlToNoDimensionCount[url]);result.violationCount++;}
callback(entry?result:null);}
function imageStylesReady(imageId,styles,isLastStyle,computedStyle)
{if(progress.isCanceled())
return;const node=target.domModel.nodeForId(imageId);var src=node.getAttribute("src");if(!src.asParsedURL()){for(var frameOwnerCandidate=node;frameOwnerCandidate;frameOwnerCandidate=frameOwnerCandidate.parentNode){if(frameOwnerCandidate.baseURL){var completeSrc=WebInspector.ParsedURL.completeURL(frameOwnerCandidate.baseURL,src);break;}}}
if(completeSrc)
src=completeSrc;if(computedStyle.getPropertyValue("position")==="absolute"){if(isLastStyle)
doneCallback();return;}
if(styles.attributesStyle){var widthFound=!!styles.attributesStyle.getLiveProperty("width");var heightFound=!!styles.attributesStyle.getLiveProperty("height");}
var inlineStyle=styles.inlineStyle;if(inlineStyle){if(inlineStyle.getPropertyValue("width")!=="")
widthFound=true;if(inlineStyle.getPropertyValue("height")!=="")
heightFound=true;}
for(var i=styles.matchedCSSRules.length-1;i>=0&&!(widthFound&&heightFound);--i){var style=styles.matchedCSSRules[i].style;if(style.getPropertyValue("width")!=="")
widthFound=true;if(style.getPropertyValue("height")!=="")
heightFound=true;}
if(!widthFound||!heightFound){if(src in urlToNoDimensionCount)
++urlToNoDimensionCount[src];else
urlToNoDimensionCount[src]=1;}
if(isLastStyle)
doneCallback();}
function getStyles(nodeIds)
{if(progress.isCanceled())
return;var targetResult={};function inlineCallback(inlineStyle,attributesStyle)
{targetResult.inlineStyle=inlineStyle;targetResult.attributesStyle=attributesStyle;}
function matchedCallback(result)
{if(result)
targetResult.matchedCSSRules=result.matchedCSSRules;}
if(!nodeIds||!nodeIds.length)
doneCallback();for(var i=0;nodeIds&&i<nodeIds.length;++i){target.cssModel.getMatchedStylesAsync(nodeIds[i],false,false,matchedCallback);target.cssModel.getInlineStylesAsync(nodeIds[i],inlineCallback);target.cssModel.getComputedStyleAsync(nodeIds[i],imageStylesReady.bind(null,nodeIds[i],targetResult,i===nodeIds.length-1));}}
function onDocumentAvailable(root)
{if(progress.isCanceled())
return;target.domModel.querySelectorAll(root.id,"img[src]",getStyles);}
if(progress.isCanceled())
return;target.domModel.requestDocument(onDocumentAvailable);},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.CssInHeadRule=function()
{WebInspector.AuditRule.call(this,"page-cssinhead",WebInspector.UIString("Put CSS in the document head"));}
WebInspector.AuditRules.CssInHeadRule.prototype={doRun:function(target,requests,result,callback,progress)
{function evalCallback(evalResult)
{if(progress.isCanceled())
return;if(!evalResult)
return callback(null);var summary=result.addChild("");var outputMessages=[];for(var url in evalResult){var urlViolations=evalResult[url];if(urlViolations[0]){result.addFormatted("%s style block(s) in the %r body should be moved to the document head.",urlViolations[0],url);result.violationCount+=urlViolations[0];}
for(var i=0;i<urlViolations[1].length;++i)
result.addFormatted("Link node %r should be moved to the document head in %r",urlViolations[1][i],url);result.violationCount+=urlViolations[1].length;}
summary.value=WebInspector.UIString("CSS in the document body adversely impacts rendering performance.");callback(result);}
function externalStylesheetsReceived(root,inlineStyleNodeIds,nodeIds)
{if(progress.isCanceled())
return;if(!nodeIds)
return;var externalStylesheetNodeIds=nodeIds;var result=null;if(inlineStyleNodeIds.length||externalStylesheetNodeIds.length){var urlToViolationsArray={};var externalStylesheetHrefs=[];for(var j=0;j<externalStylesheetNodeIds.length;++j){var linkNode=target.domModel.nodeForId(externalStylesheetNodeIds[j]);var completeHref=WebInspector.ParsedURL.completeURL(linkNode.ownerDocument.baseURL,linkNode.getAttribute("href"));externalStylesheetHrefs.push(completeHref||"<empty>");}
urlToViolationsArray[root.documentURL]=[inlineStyleNodeIds.length,externalStylesheetHrefs];result=urlToViolationsArray;}
evalCallback(result);}
function inlineStylesReceived(root,nodeIds)
{if(progress.isCanceled())
return;if(!nodeIds)
return;target.domModel.querySelectorAll(root.id,"body link[rel~='stylesheet'][href]",externalStylesheetsReceived.bind(null,root,nodeIds));}
function onDocumentAvailable(root)
{if(progress.isCanceled())
return;target.domModel.querySelectorAll(root.id,"body style",inlineStylesReceived.bind(null,root));}
target.domModel.requestDocument(onDocumentAvailable);},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.StylesScriptsOrderRule=function()
{WebInspector.AuditRule.call(this,"page-stylescriptorder",WebInspector.UIString("Optimize the order of styles and scripts"));}
WebInspector.AuditRules.StylesScriptsOrderRule.prototype={doRun:function(target,requests,result,callback,progress)
{function evalCallback(resultValue)
{if(progress.isCanceled())
return;if(!resultValue)
return callback(null);var lateCssUrls=resultValue[0];var cssBeforeInlineCount=resultValue[1];if(lateCssUrls.length){var entry=result.addChild(WebInspector.UIString("The following external CSS files were included after an external JavaScript file in the document head. To ensure CSS files are downloaded in parallel, always include external CSS before external JavaScript."),true);entry.addURLs(lateCssUrls);result.violationCount+=lateCssUrls.length;}
if(cssBeforeInlineCount){result.addChild(WebInspector.UIString(" %d inline script block%s found in the head between an external CSS file and another resource. To allow parallel downloading, move the inline script before the external CSS file, or after the next resource.",cssBeforeInlineCount,cssBeforeInlineCount>1?"s were":" was"));result.violationCount+=cssBeforeInlineCount;}
callback(result);}
function cssBeforeInlineReceived(lateStyleIds,nodeIds)
{if(progress.isCanceled())
return;if(!nodeIds)
return;var cssBeforeInlineCount=nodeIds.length;var result=null;if(lateStyleIds.length||cssBeforeInlineCount){var lateStyleUrls=[];for(var i=0;i<lateStyleIds.length;++i){var lateStyleNode=target.domModel.nodeForId(lateStyleIds[i]);var completeHref=WebInspector.ParsedURL.completeURL(lateStyleNode.ownerDocument.baseURL,lateStyleNode.getAttribute("href"));lateStyleUrls.push(completeHref||"<empty>");}
result=[lateStyleUrls,cssBeforeInlineCount];}
evalCallback(result);}
function lateStylesReceived(root,nodeIds)
{if(progress.isCanceled())
return;if(!nodeIds)
return;target.domModel.querySelectorAll(root.id,"head link[rel~='stylesheet'][href] ~ script:not([src])",cssBeforeInlineReceived.bind(null,nodeIds));}
function onDocumentAvailable(root)
{if(progress.isCanceled())
return;target.domModel.querySelectorAll(root.id,"head script[src] ~ link[rel~='stylesheet'][href]",lateStylesReceived.bind(null,root));}
target.domModel.requestDocument(onDocumentAvailable);},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.CSSRuleBase=function(id,name)
{WebInspector.AuditRule.call(this,id,name);}
WebInspector.AuditRules.CSSRuleBase.prototype={doRun:function(target,requests,result,callback,progress)
{var headers=target.cssModel.allStyleSheets();if(!headers.length){callback(null);return;}
var activeHeaders=[]
for(var i=0;i<headers.length;++i){if(!headers[i].disabled)
activeHeaders.push(headers[i]);}
var styleSheetProcessor=new WebInspector.AuditRules.StyleSheetProcessor(activeHeaders,progress,this._styleSheetsLoaded.bind(this,result,callback,progress));styleSheetProcessor.run();},_styleSheetsLoaded:function(result,callback,progress,styleSheets)
{for(var i=0;i<styleSheets.length;++i)
this._visitStyleSheet(styleSheets[i],result);callback(result);},_visitStyleSheet:function(styleSheet,result)
{this.visitStyleSheet(styleSheet,result);for(var i=0;i<styleSheet.rules.length;++i)
this._visitRule(styleSheet,styleSheet.rules[i],result);this.didVisitStyleSheet(styleSheet,result);},_visitRule:function(styleSheet,rule,result)
{this.visitRule(styleSheet,rule,result);var allProperties=rule.properties;for(var i=0;i<allProperties.length;++i)
this.visitProperty(styleSheet,rule,allProperties[i],result);this.didVisitRule(styleSheet,rule,result);},visitStyleSheet:function(styleSheet,result)
{},didVisitStyleSheet:function(styleSheet,result)
{},visitRule:function(styleSheet,rule,result)
{},didVisitRule:function(styleSheet,rule,result)
{},visitProperty:function(styleSheet,rule,property,result)
{},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.VendorPrefixedCSSProperties=function()
{WebInspector.AuditRules.CSSRuleBase.call(this,"page-vendorprefixedcss",WebInspector.UIString("Use normal CSS property names instead of vendor-prefixed ones"));this._webkitPrefix="-webkit-";}
WebInspector.AuditRules.VendorPrefixedCSSProperties.supportedProperties=["background-clip","background-origin","background-size","border-radius","border-bottom-left-radius","border-bottom-right-radius","border-top-left-radius","border-top-right-radius","box-shadow","box-sizing","opacity","text-shadow"].keySet();WebInspector.AuditRules.VendorPrefixedCSSProperties.prototype={didVisitStyleSheet:function(styleSheet)
{delete this._styleSheetResult;},visitRule:function(rule)
{this._mentionedProperties={};},didVisitRule:function()
{delete this._ruleResult;delete this._mentionedProperties;},visitProperty:function(styleSheet,rule,property,result)
{if(!property.name.startsWith(this._webkitPrefix))
return;var normalPropertyName=property.name.substring(this._webkitPrefix.length).toLowerCase();if(WebInspector.AuditRules.VendorPrefixedCSSProperties.supportedProperties[normalPropertyName]&&!this._mentionedProperties[normalPropertyName]){this._mentionedProperties[normalPropertyName]=true;if(!this._styleSheetResult)
this._styleSheetResult=result.addChild(styleSheet.sourceURL?WebInspector.linkifyResourceAsNode(styleSheet.sourceURL):WebInspector.UIString("<unknown>"));if(!this._ruleResult){var anchor=WebInspector.linkifyURLAsNode(styleSheet.sourceURL,rule.selectorText);anchor.lineNumber=rule.lineNumber;this._ruleResult=this._styleSheetResult.addChild(anchor);}
++result.violationCount;this._ruleResult.addSnippet(WebInspector.UIString("\"%s%s\" is used, but \"%s\" is supported.",this._webkitPrefix,normalPropertyName,normalPropertyName));}},__proto__:WebInspector.AuditRules.CSSRuleBase.prototype}
WebInspector.AuditRules.CookieRuleBase=function(id,name)
{WebInspector.AuditRule.call(this,id,name);}
WebInspector.AuditRules.CookieRuleBase.prototype={doRun:function(target,requests,result,callback,progress)
{var self=this;function resultCallback(receivedCookies){if(progress.isCanceled())
return;self.processCookies(receivedCookies,requests,result);callback(result);}
WebInspector.Cookies.getCookiesAsync(resultCallback);},mapResourceCookies:function(requestsByDomain,allCookies,callback)
{for(var i=0;i<allCookies.length;++i){for(var requestDomain in requestsByDomain){if(WebInspector.Cookies.cookieDomainMatchesResourceDomain(allCookies[i].domain(),requestDomain))
this._callbackForResourceCookiePairs(requestsByDomain[requestDomain],allCookies[i],callback);}}},_callbackForResourceCookiePairs:function(requests,cookie,callback)
{if(!requests)
return;for(var i=0;i<requests.length;++i){if(WebInspector.Cookies.cookieMatchesResourceURL(cookie,requests[i].url))
callback(requests[i],cookie);}},__proto__:WebInspector.AuditRule.prototype}
WebInspector.AuditRules.CookieSizeRule=function(avgBytesThreshold)
{WebInspector.AuditRules.CookieRuleBase.call(this,"http-cookiesize",WebInspector.UIString("Minimize cookie size"));this._avgBytesThreshold=avgBytesThreshold;this._maxBytesThreshold=1000;}
WebInspector.AuditRules.CookieSizeRule.prototype={_average:function(cookieArray)
{var total=0;for(var i=0;i<cookieArray.length;++i)
total+=cookieArray[i].size();return cookieArray.length?Math.round(total/cookieArray.length):0;},_max:function(cookieArray)
{var result=0;for(var i=0;i<cookieArray.length;++i)
result=Math.max(cookieArray[i].size(),result);return result;},processCookies:function(allCookies,requests,result)
{function maxSizeSorter(a,b)
{return b.maxCookieSize-a.maxCookieSize;}
function avgSizeSorter(a,b)
{return b.avgCookieSize-a.avgCookieSize;}
var cookiesPerResourceDomain={};function collectorCallback(request,cookie)
{var cookies=cookiesPerResourceDomain[request.parsedURL.host];if(!cookies){cookies=[];cookiesPerResourceDomain[request.parsedURL.host]=cookies;}
cookies.push(cookie);}
if(!allCookies.length)
return;var sortedCookieSizes=[];var domainToResourcesMap=WebInspector.AuditRules.getDomainToResourcesMap(requests,null,true);var matchingResourceData={};this.mapResourceCookies(domainToResourcesMap,allCookies,collectorCallback);for(var requestDomain in cookiesPerResourceDomain){var cookies=cookiesPerResourceDomain[requestDomain];sortedCookieSizes.push({domain:requestDomain,avgCookieSize:this._average(cookies),maxCookieSize:this._max(cookies)});}
var avgAllCookiesSize=this._average(allCookies);var hugeCookieDomains=[];sortedCookieSizes.sort(maxSizeSorter);for(var i=0,len=sortedCookieSizes.length;i<len;++i){var maxCookieSize=sortedCookieSizes[i].maxCookieSize;if(maxCookieSize>this._maxBytesThreshold)
hugeCookieDomains.push(WebInspector.AuditRuleResult.resourceDomain(sortedCookieSizes[i].domain)+": "+Number.bytesToString(maxCookieSize));}
var bigAvgCookieDomains=[];sortedCookieSizes.sort(avgSizeSorter);for(var i=0,len=sortedCookieSizes.length;i<len;++i){var domain=sortedCookieSizes[i].domain;var avgCookieSize=sortedCookieSizes[i].avgCookieSize;if(avgCookieSize>this._avgBytesThreshold&&avgCookieSize<this._maxBytesThreshold)
bigAvgCookieDomains.push(WebInspector.AuditRuleResult.resourceDomain(domain)+": "+Number.bytesToString(avgCookieSize));}
result.addChild(WebInspector.UIString("The average cookie size for all requests on this page is %s",Number.bytesToString(avgAllCookiesSize)));var message;if(hugeCookieDomains.length){var entry=result.addChild(WebInspector.UIString("The following domains have a cookie size in excess of 1KB. This is harmful because requests with cookies larger than 1KB typically cannot fit into a single network packet."),true);entry.addURLs(hugeCookieDomains);result.violationCount+=hugeCookieDomains.length;}
if(bigAvgCookieDomains.length){var entry=result.addChild(WebInspector.UIString("The following domains have an average cookie size in excess of %d bytes. Reducing the size of cookies for these domains can reduce the time it takes to send requests.",this._avgBytesThreshold),true);entry.addURLs(bigAvgCookieDomains);result.violationCount+=bigAvgCookieDomains.length;}},__proto__:WebInspector.AuditRules.CookieRuleBase.prototype}
WebInspector.AuditRules.StaticCookielessRule=function(minResources)
{WebInspector.AuditRules.CookieRuleBase.call(this,"http-staticcookieless",WebInspector.UIString("Serve static content from a cookieless domain"));this._minResources=minResources;}
WebInspector.AuditRules.StaticCookielessRule.prototype={processCookies:function(allCookies,requests,result)
{var domainToResourcesMap=WebInspector.AuditRules.getDomainToResourcesMap(requests,[WebInspector.resourceTypes.Stylesheet,WebInspector.resourceTypes.Image],true);var totalStaticResources=0;for(var domain in domainToResourcesMap)
totalStaticResources+=domainToResourcesMap[domain].length;if(totalStaticResources<this._minResources)
return;var matchingResourceData={};this.mapResourceCookies(domainToResourcesMap,allCookies,this._collectorCallback.bind(this,matchingResourceData));var badUrls=[];var cookieBytes=0;for(var url in matchingResourceData){badUrls.push(url);cookieBytes+=matchingResourceData[url]}
if(badUrls.length<this._minResources)
return;var entry=result.addChild(WebInspector.UIString("%s of cookies were sent with the following static resources. Serve these static resources from a domain that does not set cookies:",Number.bytesToString(cookieBytes)),true);entry.addURLs(badUrls);result.violationCount=badUrls.length;},_collectorCallback:function(matchingResourceData,request,cookie)
{matchingResourceData[request.url]=(matchingResourceData[request.url]||0)+cookie.size();},__proto__:WebInspector.AuditRules.CookieRuleBase.prototype};