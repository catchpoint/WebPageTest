Audits.AuditsPanel=class extends UI.PanelWithSidebar{constructor(){super('audits');this.registerRequiredCSS('ui/panelEnablerView.css');this.registerRequiredCSS('audits/auditsPanel.css');this._sidebarTree=new UI.TreeOutlineInShadow();this._sidebarTree.registerRequiredCSS('audits/auditsSidebarTree.css');this.panelSidebarElement().appendChild(this._sidebarTree.element);this._auditsItemTreeElement=new Audits.AuditsSidebarTreeElement(this);this._sidebarTree.appendChild(this._auditsItemTreeElement);this._auditResultsTreeElement=new UI.TreeElement(Common.UIString('RESULTS'),true);this._auditResultsTreeElement.selectable=false;this._auditResultsTreeElement.listItemElement.classList.add('audits-sidebar-results');this._auditResultsTreeElement.expand();this._auditResultsTreeElement.setCollapsible(false);this._sidebarTree.appendChild(this._auditResultsTreeElement);this._constructCategories();this._auditController=new Audits.AuditController(this);this._launcherView=new Audits.AuditLauncherView(this._auditController);for(var id in this.categoriesById)
this._launcherView.addCategory(this.categoriesById[id]);var extensionCategories=Extensions.extensionServer.auditCategories();for(var i=0;i<extensionCategories.length;++i){var category=extensionCategories[i];this.addCategory(new Audits.AuditExtensionCategory(category.extensionOrigin,category.id,category.displayName,category.ruleCount));}
Extensions.extensionServer.addEventListener(Extensions.ExtensionServer.Events.AuditCategoryAdded,this._extensionAuditCategoryAdded,this);}
static instance(){return(self.runtime.sharedInstance(Audits.AuditsPanel));}
get categoriesById(){return this._auditCategoriesById;}
addCategory(category){this.categoriesById[category.id]=category;this._launcherView.addCategory(category);}
getCategory(id){return this.categoriesById[id];}
_constructCategories(){this._auditCategoriesById={};for(var categoryCtorID in Audits.AuditCategories){var auditCategory=new Audits.AuditCategories[categoryCtorID]();auditCategory._id=categoryCtorID;this.categoriesById[categoryCtorID]=auditCategory;}}
auditFinishedCallback(mainResourceURL,results){var ordinal=1;for(var child of this._auditResultsTreeElement.children()){if(child.mainResourceURL===mainResourceURL)
ordinal++;}
var resultTreeElement=new Audits.AuditResultSidebarTreeElement(this,results,mainResourceURL,ordinal);this._auditResultsTreeElement.appendChild(resultTreeElement);resultTreeElement.revealAndSelect();}
showResults(categoryResults){if(!categoryResults._resultLocation){categoryResults.sort((a,b)=>(a.title||'').localeCompare(b.title||''));var resultView=UI.viewManager.createStackLocation();resultView.widget().element.classList.add('audit-result-view');for(var i=0;i<categoryResults.length;++i)
resultView.showView(new Audits.AuditCategoryResultPane(categoryResults[i]));categoryResults._resultLocation=resultView;}
this.visibleView=categoryResults._resultLocation.widget();}
showLauncherView(){this.visibleView=this._launcherView;}
get visibleView(){return this._visibleView;}
set visibleView(x){if(this._visibleView===x)
return;if(this._visibleView)
this._visibleView.detach();this._visibleView=x;if(x)
this.splitWidget().setMainWidget(x);}
wasShown(){super.wasShown();if(!this._visibleView)
this._auditsItemTreeElement.select();}
focus(){this._sidebarTree.focus();}
clearResults(){this._auditsItemTreeElement.revealAndSelect();this._auditResultsTreeElement.removeChildren();}
_extensionAuditCategoryAdded(event){var category=(event.data);this.addCategory(new Audits.AuditExtensionCategory(category.extensionOrigin,category.id,category.displayName,category.ruleCount));}};Audits.AuditCategoryImpl=class{constructor(displayName){this._displayName=displayName;this._rules=[];}
get id(){return this._id;}
get displayName(){return this._displayName;}
addRule(rule,severity){rule.severity=severity;this._rules.push(rule);}
run(target,requests,ruleResultCallback,progress){this._ensureInitialized();var remainingRulesCount=this._rules.length;progress.setTotalWork(remainingRulesCount);function callbackWrapper(result){ruleResultCallback(result);progress.worked();if(!--remainingRulesCount)
progress.done();}
for(var i=0;i<this._rules.length;++i){if(!progress.isCanceled())
this._rules[i].run(target,requests,callbackWrapper,progress);else
callbackWrapper(null);}}
_ensureInitialized(){if(!this._initialized){if('initialize'in this)
this.initialize();this._initialized=true;}}};Audits.AuditRule=class{constructor(id,displayName){this._id=id;this._displayName=displayName;}
get id(){return this._id;}
get displayName(){return this._displayName;}
set severity(severity){this._severity=severity;}
run(target,requests,callback,progress){if(progress.isCanceled())
return;var result=new Audits.AuditRuleResult(this.displayName);result.severity=this._severity;this.doRun(target,requests,result,callback,progress);}
doRun(target,requests,result,callback,progress){throw new Error('doRun() not implemented');}};Audits.AuditRule.Severity={Info:'info',Warning:'warning',Severe:'severe'};Audits.AuditRule.SeverityOrder={'info':3,'warning':2,'severe':1};Audits.AuditCategoryResult=class{constructor(category){this.title=category.displayName;this.ruleResults=[];}
addRuleResult(ruleResult){this.ruleResults.push(ruleResult);}};Audits.AuditRuleResult=class{constructor(value,expanded,className){this.value=value;this.className=className;this.expanded=expanded;this.violationCount=0;this._formatters={r:Audits.AuditRuleResult.linkifyDisplayName};var standardFormatters=Object.keys(String.standardFormatters);for(var i=0;i<standardFormatters.length;++i)
this._formatters[standardFormatters[i]]=String.standardFormatters[standardFormatters[i]];}
static linkifyDisplayName(url){return Components.Linkifier.linkifyURL(url,Bindings.displayNameForURL(url));}
static resourceDomain(domain){return domain||Common.UIString('[empty domain]');}
addChild(value,expanded,className){if(!this.children)
this.children=[];var entry=new Audits.AuditRuleResult(value,expanded,className);this.children.push(entry);return entry;}
addURL(url){this.addChild(Audits.AuditRuleResult.linkifyDisplayName(url));}
addURLs(urls){for(var i=0;i<urls.length;++i)
this.addURL(urls[i]);}
addSnippet(snippet){this.addChild(snippet,false,'source-code');}
addFormatted(format,vararg){var substitutions=Array.prototype.slice.call(arguments,1);var fragment=createDocumentFragment();function append(a,b){if(!(b instanceof Node))
b=createTextNode(b);a.appendChild(b);return a;}
var formattedResult=String.format(format,substitutions,this._formatters,fragment,append).formattedResult;if(formattedResult instanceof Node)
formattedResult.normalize();return this.addChild(formattedResult);}};Audits.AuditsSidebarTreeElement=class extends UI.TreeElement{constructor(panel){super(Common.UIString('Audits'),false);this.selectable=true;this._panel=panel;this.listItemElement.classList.add('audits-sidebar-header');this.listItemElement.insertBefore(createElementWithClass('div','icon'),this.listItemElement.firstChild);}
onselect(){this._panel.showLauncherView();return true;}};Audits.AuditResultSidebarTreeElement=class extends UI.TreeElement{constructor(panel,results,mainResourceURL,ordinal){super(String.sprintf('%s (%d)',mainResourceURL,ordinal),false);this.selectable=true;this._panel=panel;this.results=results;this.mainResourceURL=mainResourceURL;this.listItemElement.classList.add('audit-result-sidebar-tree-item');this.listItemElement.insertBefore(createElementWithClass('div','icon'),this.listItemElement.firstChild);}
onselect(){this._panel.showResults(this.results);return true;}};Audits.AuditRules={};Audits.AuditCategories={};;Audits.AuditCategory=function(){};Audits.AuditCategory.prototype={get id(){},get displayName(){},run(target,requests,ruleResultCallback,progress){}};;Audits.AuditCategories.PagePerformance=class extends Audits.AuditCategoryImpl{constructor(){super(Audits.AuditCategories.PagePerformance.AuditCategoryName);}
initialize(){this.addRule(new Audits.AuditRules.UnusedCssRule(),Audits.AuditRule.Severity.Warning);this.addRule(new Audits.AuditRules.CssInHeadRule(),Audits.AuditRule.Severity.Severe);this.addRule(new Audits.AuditRules.StylesScriptsOrderRule(),Audits.AuditRule.Severity.Severe);}};Audits.AuditCategories.PagePerformance.AuditCategoryName=Common.UIString('Web Page Performance');Audits.AuditCategories.NetworkUtilization=class extends Audits.AuditCategoryImpl{constructor(){super(Audits.AuditCategories.NetworkUtilization.AuditCategoryName);}
initialize(){this.addRule(new Audits.AuditRules.GzipRule(),Audits.AuditRule.Severity.Severe);this.addRule(new Audits.AuditRules.ImageDimensionsRule(),Audits.AuditRule.Severity.Warning);this.addRule(new Audits.AuditRules.CookieSizeRule(400),Audits.AuditRule.Severity.Warning);this.addRule(new Audits.AuditRules.StaticCookielessRule(5),Audits.AuditRule.Severity.Warning);this.addRule(new Audits.AuditRules.CombineJsResourcesRule(2),Audits.AuditRule.Severity.Severe);this.addRule(new Audits.AuditRules.CombineCssResourcesRule(2),Audits.AuditRule.Severity.Severe);this.addRule(new Audits.AuditRules.MinimizeDnsLookupsRule(4),Audits.AuditRule.Severity.Warning);this.addRule(new Audits.AuditRules.ParallelizeDownloadRule(4,10,0.5),Audits.AuditRule.Severity.Warning);this.addRule(new Audits.AuditRules.BrowserCacheControlRule(),Audits.AuditRule.Severity.Severe);}};Audits.AuditCategories.NetworkUtilization.AuditCategoryName=Common.UIString('Network Utilization');;Audits.AuditController=class{constructor(auditsPanel){this._auditsPanel=auditsPanel;SDK.targetManager.addEventListener(SDK.TargetManager.Events.Load,this._didMainResourceLoad,this);SDK.targetManager.addModelListener(SDK.NetworkManager,SDK.NetworkManager.Events.RequestFinished,this._didLoadResource,this);}
_executeAudit(target,categories,resultCallback){this._progress.setTitle(Common.UIString('Running audit'));function ruleResultReadyCallback(categoryResult,ruleResult){if(ruleResult&&ruleResult.children)
categoryResult.addRuleResult(ruleResult);}
var results=[];var mainResourceURL=target.inspectedURL();var categoriesDone=0;function categoryDoneCallback(){if(++categoriesDone!==categories.length)
return;resultCallback(mainResourceURL,results);}
var requests=NetworkLog.networkLog.requestsForTarget(target).slice();var compositeProgress=new Common.CompositeProgress(this._progress);var subprogresses=[];for(var i=0;i<categories.length;++i)
subprogresses.push(new Common.ProgressProxy(compositeProgress.createSubProgress(),categoryDoneCallback));for(var i=0;i<categories.length;++i){if(this._progress.isCanceled()){subprogresses[i].done();continue;}
var category=categories[i];var result=new Audits.AuditCategoryResult(category);results.push(result);category.run(target,requests,ruleResultReadyCallback.bind(null,result),subprogresses[i]);}}
_auditFinishedCallback(mainResourceURL,results){if(!this._progress.isCanceled())
this._auditsPanel.auditFinishedCallback(mainResourceURL,results);this._progress.done();}
initiateAudit(categoryIds,progress,runImmediately,startedCallback){var target=SDK.targetManager.mainTarget();if(!categoryIds||!categoryIds.length||!target)
return;this._progress=progress;var categories=[];for(var i=0;i<categoryIds.length;++i)
categories.push(this._auditsPanel.categoriesById[categoryIds[i]]);if(runImmediately)
this._startAuditWhenResourcesReady(target,categories,startedCallback);else
this._reloadResources(this._startAuditWhenResourcesReady.bind(this,target,categories,startedCallback));Host.userMetrics.actionTaken(Host.UserMetrics.Action.AuditsStarted);}
_startAuditWhenResourcesReady(target,categories,startedCallback){if(this._progress.isCanceled()){this._progress.done();return;}
startedCallback();this._executeAudit(target,categories,this._auditFinishedCallback.bind(this));}
_reloadResources(callback){this._pageReloadCallback=callback;SDK.targetManager.reloadPage();}
_didLoadResource(){if(this._pageReloadCallback&&this._progress&&this._progress.isCanceled())
this._pageReloadCallback();}
_didMainResourceLoad(){if(this._pageReloadCallback){var callback=this._pageReloadCallback;delete this._pageReloadCallback;callback();}}
clearResults(){this._auditsPanel.clearResults();}};;Audits.AuditFormatters=class{apply(value){var formatter;var type=typeof value;var args;switch(type){case'string':case'boolean':case'number':formatter=Audits.AuditFormatters.Registry.text;args=[value.toString()];break;case'object':if(value instanceof Node)
return value;if(Array.isArray(value)){formatter=Audits.AuditFormatters.Registry.concat;args=value;}else if(value.type&&value.arguments){formatter=Audits.AuditFormatters.Registry[value.type];args=value.arguments;}}
if(!formatter)
throw'Invalid value or formatter: '+type+JSON.stringify(value);return formatter.apply(null,args);}
partiallyApply(formatters,thisArgument,value){if(Array.isArray(value))
return value.map(this.partiallyApply.bind(this,formatters,thisArgument));if(typeof value==='object'&&typeof formatters[value.type]==='function'&&value.arguments)
return formatters[value.type].apply(thisArgument,value.arguments);return value;}};Audits.AuditFormatters.Registry={text:function(text){return createTextNode(text);},snippet:function(snippetText){var div=createElement('div');div.textContent=snippetText;div.className='source-code';return div;},concat:function(){var parent=createElement('span');for(var arg=0;arg<arguments.length;++arg)
parent.appendChild(Audits.auditFormatters.apply(arguments[arg]));return parent;},url:function(url,displayText){return UI.createExternalLink(url,displayText);},resourceLink:function(url,line){return Components.Linkifier.linkifyURL(url,undefined,'resource-url',line);}};Audits.auditFormatters=new Audits.AuditFormatters();;Audits.AuditLauncherView=class extends UI.VBox{constructor(auditController){super();this.setMinimumSize(100,25);this._auditController=auditController;this._categoryIdPrefix='audit-category-item-';this._auditRunning=false;this.element.classList.add('audit-launcher-view');this.element.classList.add('panel-enabler-view');this._contentElement=createElement('div');this._contentElement.className='audit-launcher-view-content';this.element.appendChild(this._contentElement);this._boundCategoryClickListener=this._categoryClicked.bind(this);this._resetResourceCount();this._sortedCategories=[];this._headerElement=createElement('h1');this._headerElement.className='no-audits';this._headerElement.textContent=Common.UIString('No audits to run');this._contentElement.appendChild(this._headerElement);SDK.targetManager.addModelListener(SDK.NetworkManager,SDK.NetworkManager.Events.RequestStarted,this._onRequestStarted,this);SDK.targetManager.addModelListener(SDK.NetworkManager,SDK.NetworkManager.Events.RequestFinished,this._onRequestFinished,this);var defaultSelectedAuditCategory={};defaultSelectedAuditCategory[Audits.AuditLauncherView.AllCategoriesKey]=true;this._selectedCategoriesSetting=Common.settings.createSetting('selectedAuditCategories',defaultSelectedAuditCategory);}
_resetResourceCount(){this._loadedResources=0;this._totalResources=0;}
_onRequestStarted(event){var request=(event.data);if(request.resourceType()===Common.resourceTypes.WebSocket)
return;++this._totalResources;this._updateResourceProgress();}
_onRequestFinished(event){var request=(event.data);if(request.resourceType()===Common.resourceTypes.WebSocket)
return;++this._loadedResources;this._updateResourceProgress();}
addCategory(category){if(!this._sortedCategories.length)
this._createLauncherUI();var selectedCategories=this._selectedCategoriesSetting.get();var categoryElement=this._createCategoryElement(category.displayName,category.id);category._checkboxElement=categoryElement.checkboxElement;if(this._selectAllCheckboxElement.checked||selectedCategories[category.displayName]){category._checkboxElement.checked=true;++this._currentCategoriesCount;}
function compareCategories(a,b){var aTitle=a.displayName||'';var bTitle=b.displayName||'';return aTitle.localeCompare(bTitle);}
var insertBefore=this._sortedCategories.lowerBound(category,compareCategories);this._categoriesElement.insertBefore(categoryElement,this._categoriesElement.children[insertBefore]);this._sortedCategories.splice(insertBefore,0,category);this._selectedCategoriesUpdated();}
_startAudit(){this._auditRunning=true;this._updateButton();this._toggleUIComponents(this._auditRunning);var catIds=[];for(var category=0;category<this._sortedCategories.length;++category){if(this._sortedCategories[category]._checkboxElement.checked)
catIds.push(this._sortedCategories[category].id);}
this._resetResourceCount();this._progressIndicator=new UI.ProgressIndicator();this._buttonContainerElement.appendChild(this._progressIndicator.element);this._displayResourceLoadingProgress=true;function onAuditStarted(){this._displayResourceLoadingProgress=false;}
this._auditController.initiateAudit(catIds,new Common.ProgressProxy(this._progressIndicator,this._auditsDone.bind(this)),this._auditPresentStateElement.checked,onAuditStarted.bind(this));}
_auditsDone(){this._displayResourceLoadingProgress=false;delete this._progressIndicator;this._launchButton.disabled=false;this._auditRunning=false;this._updateButton();this._toggleUIComponents(this._auditRunning);}
_toggleUIComponents(disable){this._selectAllCheckboxElement.disabled=disable;for(var child=this._categoriesElement.firstChild;child;child=child.nextSibling)
child.checkboxElement.disabled=disable;this._auditPresentStateElement.disabled=disable;this._auditReloadedStateElement.disabled=disable;}
_launchButtonClicked(event){if(this._auditRunning){this._launchButton.disabled=true;this._progressIndicator.cancel();return;}
this._startAudit();}
_clearButtonClicked(){this._auditController.clearResults();}
_selectAllClicked(checkCategories,userGesture){var childNodes=this._categoriesElement.childNodes;for(var i=0,length=childNodes.length;i<length;++i)
childNodes[i].checkboxElement.checked=checkCategories;this._currentCategoriesCount=checkCategories?this._sortedCategories.length:0;this._selectedCategoriesUpdated(userGesture);}
_categoryClicked(event){this._currentCategoriesCount+=event.target.checked?1:-1;this._selectAllCheckboxElement.checked=this._currentCategoriesCount===this._sortedCategories.length;this._selectedCategoriesUpdated(true);}
_createCategoryElement(title,id){var labelElement=UI.createCheckboxLabel(title);if(id){labelElement.id=this._categoryIdPrefix+id;labelElement.checkboxElement.addEventListener('click',this._boundCategoryClickListener,false);}
labelElement.__displayName=title;return labelElement;}
_createLauncherUI(){this._headerElement=createElement('h1');this._headerElement.textContent=Common.UIString('Select audits to run');this._contentElement.removeChildren();this._contentElement.appendChild(this._headerElement);function handleSelectAllClick(event){this._selectAllClicked(event.target.checked,true);}
var categoryElement=this._createCategoryElement(Common.UIString('Select All'),'');categoryElement.id='audit-launcher-selectall';this._selectAllCheckboxElement=categoryElement.checkboxElement;this._selectAllCheckboxElement.checked=this._selectedCategoriesSetting.get()[Audits.AuditLauncherView.AllCategoriesKey];this._selectAllCheckboxElement.addEventListener('click',handleSelectAllClick.bind(this),false);this._contentElement.appendChild(categoryElement);this._categoriesElement=this._contentElement.createChild('fieldset','audit-categories-container');this._currentCategoriesCount=0;this._contentElement.createChild('div','flexible-space');this._buttonContainerElement=this._contentElement.createChild('div','button-container');var radio=UI.createRadioLabel('audit-mode',Common.UIString('Audit Present State'),true);this._buttonContainerElement.appendChild(radio);this._auditPresentStateElement=radio.radioElement;radio=UI.createRadioLabel('audit-mode',Common.UIString('Reload Page and Audit on Load'));this._buttonContainerElement.appendChild(radio);this._auditReloadedStateElement=radio.radioElement;this._launchButton=UI.createTextButton(Common.UIString('Run'),this._launchButtonClicked.bind(this));this._buttonContainerElement.appendChild(this._launchButton);this._clearButton=UI.createTextButton(Common.UIString('Clear'),this._clearButtonClicked.bind(this));this._buttonContainerElement.appendChild(this._clearButton);this._selectAllClicked(this._selectAllCheckboxElement.checked);}
_updateResourceProgress(){if(this._displayResourceLoadingProgress){this._progressIndicator.setTitle(Common.UIString('Loading (%d of %d)',this._loadedResources,this._totalResources));}}
_selectedCategoriesUpdated(userGesture){var selectedCategories=userGesture?{}:this._selectedCategoriesSetting.get();var childNodes=this._categoriesElement.childNodes;for(var i=0,length=childNodes.length;i<length;++i)
selectedCategories[childNodes[i].__displayName]=childNodes[i].checkboxElement.checked;selectedCategories[Audits.AuditLauncherView.AllCategoriesKey]=this._selectAllCheckboxElement.checked;this._selectedCategoriesSetting.set(selectedCategories);this._updateButton();}
_updateButton(){this._launchButton.textContent=this._auditRunning?Common.UIString('Stop'):Common.UIString('Run');this._launchButton.disabled=!this._currentCategoriesCount;}};Audits.AuditLauncherView.AllCategoriesKey='__AllCategories';;Audits.AuditCategoryResultPane=class extends UI.SimpleView{constructor(categoryResult){super(categoryResult.title);this._treeOutline=new UI.TreeOutlineInShadow();this._treeOutline.registerRequiredCSS('audits/auditResultTree.css');this._treeOutline.element.classList.add('audit-result-tree');this.element.appendChild(this._treeOutline.element);this._treeOutline.expandTreeElementsWhenArrowing=true;function ruleSorter(a,b){var result=Audits.AuditRule.SeverityOrder[a.severity||0]-Audits.AuditRule.SeverityOrder[b.severity||0];if(!result)
result=(a.value||'').localeCompare(b.value||'');return result;}
categoryResult.ruleResults.sort(ruleSorter);for(var i=0;i<categoryResult.ruleResults.length;++i){var ruleResult=categoryResult.ruleResults[i];var treeElement=this._appendResult(this._treeOutline.rootElement(),ruleResult,ruleResult.severity);treeElement.listItemElement.classList.add('audit-result');}
this.revealView();}
_appendResult(parentTreeNode,result,severity){var title='';if(typeof result.value==='string'){title=result.value;if(result.violationCount)
title=String.sprintf('%s (%d)',title,result.violationCount);}
var titleFragment=createDocumentFragment();if(severity){var severityElement=UI.Icon.create();if(severity===Audits.AuditRule.Severity.Info)
severityElement.setIconType('smallicon-green-ball');else if(severity===Audits.AuditRule.Severity.Warning)
severityElement.setIconType('smallicon-orange-ball');else if(severity===Audits.AuditRule.Severity.Severe)
severityElement.setIconType('smallicon-red-ball');severityElement.classList.add('severity');titleFragment.appendChild(severityElement);}
titleFragment.createTextChild(title);var treeElement=new UI.TreeElement(titleFragment,!!result.children);treeElement.selectable=false;parentTreeNode.appendChild(treeElement);if(result.className)
treeElement.listItemElement.classList.add(result.className);if(typeof result.value!=='string')
treeElement.listItemElement.appendChild(Audits.auditFormatters.apply(result.value));if(result.children){for(var i=0;i<result.children.length;++i)
this._appendResult(treeElement,result.children[i]);}
if(result.expanded){treeElement.listItemElement.classList.remove('parent');treeElement.listItemElement.classList.add('parent-expanded');treeElement.expand();}
return treeElement;}};;Audits.AuditRules.IPAddressRegexp=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;Audits.AuditRules.CacheableResponseCodes={200:true,203:true,206:true,300:true,301:true,410:true,304:true};Audits.AuditRules.getDomainToResourcesMap=function(requests,types,needFullResources){var domainToResourcesMap={};for(var i=0,size=requests.length;i<size;++i){var request=requests[i];if(types&&types.indexOf(request.resourceType())===-1)
continue;var parsedURL=request.url().asParsedURL();if(!parsedURL)
continue;var domain=parsedURL.host;var domainResources=domainToResourcesMap[domain];if(domainResources===undefined){domainResources=([]);domainToResourcesMap[domain]=domainResources;}
domainResources.push(needFullResources?request:request.url());}
return domainToResourcesMap;};Audits.AuditRules.GzipRule=class extends Audits.AuditRule{constructor(){super('network-gzip',Common.UIString('Enable gzip compression'));}
doRun(target,requests,result,callback,progress){var totalSavings=0;var summary=result.addChild('',true);for(var i=0,length=requests.length;i<length;++i){var request=requests[i];if(request.cached()||request.statusCode===304)
continue;if(this._shouldCompress(request)){var size=request.resourceSize;if(this._isCompressed(request))
continue;var savings=2*size/3;totalSavings+=savings;summary.addFormatted('%r could save ~%s',request.url(),Number.bytesToString(savings));result.violationCount++;}}
if(!totalSavings){callback(null);return;}
summary.value=Common.UIString('Compressing the following resources with gzip could reduce their transfer size by about two thirds (~%s):',Number.bytesToString(totalSavings));callback(result);}
_isCompressed(request){var encodingHeader=request.responseHeaderValue('Content-Encoding');if(!encodingHeader)
return false;return/\b(?:gzip|deflate)\b/.test(encodingHeader);}
_shouldCompress(request){return request.resourceType().isTextType()&&request.parsedURL.host&&request.resourceSize!==undefined&&request.resourceSize>150;}};Audits.AuditRules.CombineExternalResourcesRule=class extends Audits.AuditRule{constructor(id,name,type,resourceTypeName,allowedPerDomain){super(id,name);this._type=type;this._resourceTypeName=resourceTypeName;this._allowedPerDomain=allowedPerDomain;}
doRun(target,requests,result,callback,progress){var domainToResourcesMap=Audits.AuditRules.getDomainToResourcesMap(requests,[this._type],false);var penalizedResourceCount=0;var summary=result.addChild('',true);for(var domain in domainToResourcesMap){var domainResources=domainToResourcesMap[domain];var extraResourceCount=domainResources.length-this._allowedPerDomain;if(extraResourceCount<=0)
continue;penalizedResourceCount+=extraResourceCount-1;summary.addChild(Common.UIString('%d %s resources served from %s.',domainResources.length,this._resourceTypeName,Audits.AuditRuleResult.resourceDomain(domain)));result.violationCount+=domainResources.length;}
if(!penalizedResourceCount){callback(null);return;}
summary.value=Common.UIString('There are multiple resources served from same domain. Consider combining them into as few files as possible.');callback(result);}};Audits.AuditRules.CombineJsResourcesRule=class extends Audits.AuditRules.CombineExternalResourcesRule{constructor(allowedPerDomain){super('page-externaljs',Common.UIString('Combine external JavaScript'),Common.resourceTypes.Script,'JavaScript',allowedPerDomain);}};Audits.AuditRules.CombineCssResourcesRule=class extends Audits.AuditRules.CombineExternalResourcesRule{constructor(allowedPerDomain){super('page-externalcss',Common.UIString('Combine external CSS'),Common.resourceTypes.Stylesheet,'CSS',allowedPerDomain);}};Audits.AuditRules.MinimizeDnsLookupsRule=class extends Audits.AuditRule{constructor(hostCountThreshold){super('network-minimizelookups',Common.UIString('Minimize DNS lookups'));this._hostCountThreshold=hostCountThreshold;}
doRun(target,requests,result,callback,progress){var summary=result.addChild('');var domainToResourcesMap=Audits.AuditRules.getDomainToResourcesMap(requests,null,false);for(var domain in domainToResourcesMap){if(domainToResourcesMap[domain].length>1)
continue;var parsedURL=domain.asParsedURL();if(!parsedURL)
continue;if(!parsedURL.host.search(Audits.AuditRules.IPAddressRegexp))
continue;summary.addSnippet(domain);result.violationCount++;}
if(!summary.children||summary.children.length<=this._hostCountThreshold){callback(null);return;}
summary.value=Common.UIString('The following domains only serve one resource each. If possible, avoid the extra DNS lookups by serving these resources from existing domains.');callback(result);}};Audits.AuditRules.ParallelizeDownloadRule=class extends Audits.AuditRule{constructor(optimalHostnameCount,minRequestThreshold,minBalanceThreshold){super('network-parallelizehosts',Common.UIString('Parallelize downloads across hostnames'));this._optimalHostnameCount=optimalHostnameCount;this._minRequestThreshold=minRequestThreshold;this._minBalanceThreshold=minBalanceThreshold;}
doRun(target,requests,result,callback,progress){function hostSorter(a,b){var aCount=domainToResourcesMap[a].length;var bCount=domainToResourcesMap[b].length;return(aCount<bCount)?1:(aCount===bCount)?0:-1;}
var domainToResourcesMap=Audits.AuditRules.getDomainToResourcesMap(requests,[Common.resourceTypes.Stylesheet,Common.resourceTypes.Image],true);var hosts=[];for(var url in domainToResourcesMap)
hosts.push(url);if(!hosts.length){callback(null);return;}
hosts.sort(hostSorter);var optimalHostnameCount=this._optimalHostnameCount;if(hosts.length>optimalHostnameCount)
hosts.splice(optimalHostnameCount);var busiestHostResourceCount=domainToResourcesMap[hosts[0]].length;var requestCountAboveThreshold=busiestHostResourceCount-this._minRequestThreshold;if(requestCountAboveThreshold<=0){callback(null);return;}
var avgResourcesPerHost=0;for(var i=0,size=hosts.length;i<size;++i)
avgResourcesPerHost+=domainToResourcesMap[hosts[i]].length;avgResourcesPerHost/=optimalHostnameCount;avgResourcesPerHost=Math.max(avgResourcesPerHost,1);var pctAboveAvg=(requestCountAboveThreshold/avgResourcesPerHost)-1.0;var minBalanceThreshold=this._minBalanceThreshold;if(pctAboveAvg<minBalanceThreshold){callback(null);return;}
var requestsOnBusiestHost=domainToResourcesMap[hosts[0]];var entry=result.addChild(Common.UIString('This page makes %d parallelizable requests to %s. Increase download parallelization by distributing the following requests across multiple hostnames.',busiestHostResourceCount,hosts[0]),true);for(var i=0;i<requestsOnBusiestHost.length;++i)
entry.addURL(requestsOnBusiestHost[i].url());result.violationCount=requestsOnBusiestHost.length;callback(result);}};Audits.AuditRules.UnusedCssRule=class extends Audits.AuditRule{constructor(){super('page-unusedcss',Common.UIString('Remove unused CSS rules'));}
doRun(target,requests,result,callback,progress){var domModel=target.model(SDK.DOMModel);var cssModel=target.model(SDK.CSSModel);if(!domModel||!cssModel){callback(null);return;}
function evalCallback(styleSheets){if(!styleSheets.length)
return callback(null);var selectors=[];var testedSelectors={};for(var i=0;i<styleSheets.length;++i){var styleSheet=styleSheets[i];for(var curRule=0;curRule<styleSheet.rules.length;++curRule){var selectorText=styleSheet.rules[curRule].selectorText;if(testedSelectors[selectorText])
continue;selectors.push(selectorText);testedSelectors[selectorText]=1;}}
var foundSelectors={};function selectorsCallback(styleSheets){if(progress.isCanceled()){callback(null);return;}
var inlineBlockOrdinal=0;var totalStylesheetSize=0;var totalUnusedStylesheetSize=0;var summary;for(var i=0;i<styleSheets.length;++i){var styleSheet=styleSheets[i];var unusedRules=[];for(var curRule=0;curRule<styleSheet.rules.length;++curRule){var rule=styleSheet.rules[curRule];if(!testedSelectors[rule.selectorText]||foundSelectors[rule.selectorText])
continue;unusedRules.push(rule.selectorText);}
totalStylesheetSize+=styleSheet.rules.length;totalUnusedStylesheetSize+=unusedRules.length;if(!unusedRules.length)
continue;var resource=Bindings.resourceForURL(styleSheet.sourceURL);var isInlineBlock=resource&&resource.request&&resource.request.resourceType()===Common.resourceTypes.Document;var url=!isInlineBlock?Audits.AuditRuleResult.linkifyDisplayName(styleSheet.sourceURL):Common.UIString('Inline block #%d',++inlineBlockOrdinal);var pctUnused=Math.round(100*unusedRules.length/styleSheet.rules.length);if(!summary)
summary=result.addChild('',true);var entry=summary.addFormatted('%s: %d% is not used by the current page.',url,pctUnused);for(var j=0;j<unusedRules.length;++j)
entry.addSnippet(unusedRules[j]);result.violationCount+=unusedRules.length;}
if(!totalUnusedStylesheetSize)
return callback(null);var totalUnusedPercent=Math.round(100*totalUnusedStylesheetSize/totalStylesheetSize);summary.value=Common.UIString('%s rules (%d%) of CSS not used by the current page.',totalUnusedStylesheetSize,totalUnusedPercent);callback(result);}
function queryCallback(boundSelectorsCallback,selector,nodeId){if(nodeId)
foundSelectors[selector]=true;if(boundSelectorsCallback)
boundSelectorsCallback();}
function documentLoaded(selectors,document){var pseudoSelectorRegexp=/::?(?:[\w-]+)(?:\(.*?\))?/g;if(!selectors.length){selectorsCallback([]);return;}
for(var i=0;i<selectors.length;++i){if(progress.isCanceled()){callback(null);return;}
var effectiveSelector=selectors[i].replace(pseudoSelectorRegexp,'');domModel.querySelector(document.id,effectiveSelector,queryCallback.bind(null,i===selectors.length-1?selectorsCallback.bind(null,styleSheets):null,selectors[i]));}}
domModel.requestDocument(documentLoaded.bind(null,selectors));}
var styleSheetInfos=cssModel.allStyleSheets();if(!styleSheetInfos||!styleSheetInfos.length){evalCallback([]);return;}
var styleSheetProcessor=new Audits.AuditRules.StyleSheetProcessor(styleSheetInfos,progress,evalCallback);styleSheetProcessor.run();}};Audits.AuditRules.ParsedStyleSheet;Audits.AuditRules.StyleSheetProcessor=class{constructor(styleSheetHeaders,progress,styleSheetsParsedCallback){this._styleSheetHeaders=styleSheetHeaders;this._progress=progress;this._styleSheets=[];this._styleSheetsParsedCallback=styleSheetsParsedCallback;}
run(){this._processNextStyleSheet();}
_processNextStyleSheet(){if(!this._styleSheetHeaders.length){this._styleSheetsParsedCallback(this._styleSheets);return;}
this._currentStyleSheetHeader=this._styleSheetHeaders.shift();var allRules=[];this._currentStyleSheetHeader.requestContent().then(content=>Common.formatterWorkerPool.parseCSS(content||'',onRulesParsed.bind(this)));function onRulesParsed(isLastChunk,rules){allRules.push(...rules);if(isLastChunk)
this._onStyleSheetParsed(allRules);}}
_onStyleSheetParsed(rules){if(this._progress.isCanceled()){this._styleSheetsParsedCallback(this._styleSheets);return;}
var styleRules=[];for(var i=0;i<rules.length;++i){var rule=rules[i];if(rule.selectorText)
styleRules.push(rule);}
this._styleSheets.push({sourceURL:this._currentStyleSheetHeader.sourceURL,rules:styleRules});this._processNextStyleSheet();}};Audits.AuditRules.CacheControlRule=class extends Audits.AuditRule{constructor(id,name){super(id,name);}
doRun(target,requests,result,callback,progress){var cacheableAndNonCacheableResources=this._cacheableAndNonCacheableResources(requests);if(cacheableAndNonCacheableResources[0].length)
this.runChecks(cacheableAndNonCacheableResources[0],result);this.handleNonCacheableResources(cacheableAndNonCacheableResources[1],result);callback(result);}
handleNonCacheableResources(requests,result){}
_cacheableAndNonCacheableResources(requests){var processedResources=[[],[]];for(var i=0;i<requests.length;++i){var request=requests[i];if(!this.isCacheableResource(request))
continue;if(this._isExplicitlyNonCacheable(request))
processedResources[1].push(request);else
processedResources[0].push(request);}
return processedResources;}
execCheck(messageText,requestCheckFunction,requests,result){var requestCount=requests.length;var urls=[];for(var i=0;i<requestCount;++i){if(requestCheckFunction.call(this,requests[i]))
urls.push(requests[i].url());}
if(urls.length){var entry=result.addChild(messageText,true);entry.addURLs(urls);result.violationCount+=urls.length;}}
freshnessLifetimeGreaterThan(request,timeMs){var dateHeader=this.responseHeader(request,'Date');if(!dateHeader)
return false;var dateHeaderMs=Date.parse(dateHeader);if(isNaN(dateHeaderMs))
return false;var freshnessLifetimeMs;var maxAgeMatch=this.responseHeaderMatch(request,'Cache-Control','max-age=(\\d+)');if(maxAgeMatch){freshnessLifetimeMs=(maxAgeMatch[1])?1000*maxAgeMatch[1]:0;}else{var expiresHeader=this.responseHeader(request,'Expires');if(expiresHeader){var expDate=Date.parse(expiresHeader);if(!isNaN(expDate))
freshnessLifetimeMs=expDate-dateHeaderMs;}}
return(isNaN(freshnessLifetimeMs))?false:freshnessLifetimeMs>timeMs;}
responseHeader(request,header){return request.responseHeaderValue(header);}
hasResponseHeader(request,header){return request.responseHeaderValue(header)!==undefined;}
isCompressible(request){return request.resourceType().isTextType();}
isPubliclyCacheable(request){if(this._isExplicitlyNonCacheable(request))
return false;if(this.responseHeaderMatch(request,'Cache-Control','public'))
return true;return request.url().indexOf('?')===-1&&!this.responseHeaderMatch(request,'Cache-Control','private');}
responseHeaderMatch(request,header,regexp){return request.responseHeaderValue(header)?request.responseHeaderValue(header).match(new RegExp(regexp,'im')):null;}
hasExplicitExpiration(request){return this.hasResponseHeader(request,'Date')&&(this.hasResponseHeader(request,'Expires')||!!this.responseHeaderMatch(request,'Cache-Control','max-age'));}
_isExplicitlyNonCacheable(request){var hasExplicitExp=this.hasExplicitExpiration(request);return!!(!!this.responseHeaderMatch(request,'Cache-Control','(no-cache|no-store)')||!!this.responseHeaderMatch(request,'Pragma','no-cache')||(hasExplicitExp&&!this.freshnessLifetimeGreaterThan(request,0))||(!hasExplicitExp&&request.url()&&request.url().indexOf('?')>=0)||(!hasExplicitExp&&!this.isCacheableResource(request)));}
isCacheableResource(request){return request.statusCode!==undefined&&Audits.AuditRules.CacheableResponseCodes[request.statusCode];}};Audits.AuditRules.CacheControlRule.MillisPerMonth=1000*60*60*24*30;Audits.AuditRules.BrowserCacheControlRule=class extends Audits.AuditRules.CacheControlRule{constructor(){super('http-browsercache',Common.UIString('Leverage browser caching'));}
handleNonCacheableResources(requests,result){if(requests.length){var entry=result.addChild(Common.UIString('The following resources are explicitly non-cacheable. Consider making them cacheable if possible:'),true);result.violationCount+=requests.length;for(var i=0;i<requests.length;++i)
entry.addURL(requests[i].url());}}
runChecks(requests,result,callback){this.execCheck(Common.UIString('The following resources are missing a cache expiration. Resources that do not specify an expiration may not be cached by browsers:'),this._missingExpirationCheck,requests,result);this.execCheck(Common.UIString('The following resources specify a "Vary" header that disables caching in most versions of Internet Explorer:'),this._varyCheck,requests,result);this.execCheck(Common.UIString('The following cacheable resources have a short freshness lifetime:'),this._oneMonthExpirationCheck,requests,result);this.execCheck(Common.UIString('To further improve cache hit rate, specify an expiration one year in the future for the following cacheable resources:'),this._oneYearExpirationCheck,requests,result);}
_missingExpirationCheck(request){return this.isCacheableResource(request)&&!this.hasResponseHeader(request,'Set-Cookie')&&!this.hasExplicitExpiration(request);}
_varyCheck(request){var varyHeader=this.responseHeader(request,'Vary');if(varyHeader){varyHeader=varyHeader.replace(/User-Agent/gi,'');varyHeader=varyHeader.replace(/Accept-Encoding/gi,'');varyHeader=varyHeader.replace(/[, ]*/g,'');}
return varyHeader&&varyHeader.length&&this.isCacheableResource(request)&&this.freshnessLifetimeGreaterThan(request,0);}
_oneMonthExpirationCheck(request){return this.isCacheableResource(request)&&!this.hasResponseHeader(request,'Set-Cookie')&&!this.freshnessLifetimeGreaterThan(request,Audits.AuditRules.CacheControlRule.MillisPerMonth)&&this.freshnessLifetimeGreaterThan(request,0);}
_oneYearExpirationCheck(request){return this.isCacheableResource(request)&&!this.hasResponseHeader(request,'Set-Cookie')&&!this.freshnessLifetimeGreaterThan(request,11*Audits.AuditRules.CacheControlRule.MillisPerMonth)&&this.freshnessLifetimeGreaterThan(request,Audits.AuditRules.CacheControlRule.MillisPerMonth);}};Audits.AuditRules.ImageDimensionsRule=class extends Audits.AuditRule{constructor(){super('page-imagedims',Common.UIString('Specify image dimensions'));}
doRun(target,requests,result,callback,progress){var domModel=target.model(SDK.DOMModel);var cssModel=target.model(SDK.CSSModel);if(!domModel||!cssModel){callback(null);return;}
var urlToNoDimensionCount={};function doneCallback(){for(var url in urlToNoDimensionCount){var entry=entry||result.addChild(Common.UIString('A width and height should be specified for all images in order to speed up page display. The following image(s) are missing a width and/or height:'),true);var format='%r';if(urlToNoDimensionCount[url]>1)
format+=' (%d uses)';entry.addFormatted(format,url,urlToNoDimensionCount[url]);result.violationCount++;}
callback(entry?result:null);}
function imageStylesReady(imageId,styles){if(progress.isCanceled()){callback(null);return;}
const node=domModel.nodeForId(imageId);var src=node.getAttribute('src');if(!src.asParsedURL()){for(var frameOwnerCandidate=node;frameOwnerCandidate;frameOwnerCandidate=frameOwnerCandidate.parentNode){if(frameOwnerCandidate.baseURL){var completeSrc=Common.ParsedURL.completeURL(frameOwnerCandidate.baseURL,src);break;}}}
if(completeSrc)
src=completeSrc;if(styles.computedStyle.get('position')==='absolute')
return;var widthFound=false;var heightFound=false;for(var i=0;!(widthFound&&heightFound)&&i<styles.nodeStyles.length;++i){var style=styles.nodeStyles[i];if(style.getPropertyValue('width')!=='')
widthFound=true;if(style.getPropertyValue('height')!=='')
heightFound=true;}
if(!widthFound||!heightFound){if(src in urlToNoDimensionCount)
++urlToNoDimensionCount[src];else
urlToNoDimensionCount[src]=1;}}
function getStyles(nodeIds){if(progress.isCanceled()){callback(null);return;}
var targetResult={};function matchedCallback(matchedStyleResult){if(!matchedStyleResult)
return;targetResult.nodeStyles=matchedStyleResult.nodeStyles();}
function computedCallback(computedStyle){targetResult.computedStyle=computedStyle;}
if(!nodeIds||!nodeIds.length)
doneCallback();var nodePromises=[];for(var i=0;nodeIds&&i<nodeIds.length;++i){var stylePromises=[cssModel.matchedStylesPromise(nodeIds[i]).then(matchedCallback),cssModel.computedStylePromise(nodeIds[i]).then(computedCallback)];var nodePromise=Promise.all(stylePromises).then(imageStylesReady.bind(null,nodeIds[i],targetResult));nodePromises.push(nodePromise);}
Promise.all(nodePromises).catchException(null).then(doneCallback);}
function onDocumentAvailable(root){if(progress.isCanceled()){callback(null);return;}
domModel.querySelectorAll(root.id,'img[src]',getStyles);}
if(progress.isCanceled()){callback(null);return;}
domModel.requestDocument(onDocumentAvailable);}};Audits.AuditRules.CssInHeadRule=class extends Audits.AuditRule{constructor(){super('page-cssinhead',Common.UIString('Put CSS in the document head'));}
doRun(target,requests,result,callback,progress){var domModel=SDK.DOMModel.fromTarget(target);if(!domModel){callback(null);return;}
function evalCallback(evalResult){if(progress.isCanceled()){callback(null);return;}
if(!evalResult)
return callback(null);var summary=result.addChild('');for(var url in evalResult){var urlViolations=evalResult[url];if(urlViolations[0]){result.addFormatted('%s style block(s) in the %r body should be moved to the document head.',urlViolations[0],url);result.violationCount+=urlViolations[0];}
for(var i=0;i<urlViolations[1].length;++i)
result.addFormatted('Link node %r should be moved to the document head in %r',urlViolations[1][i],url);result.violationCount+=urlViolations[1].length;}
summary.value=Common.UIString('CSS in the document body adversely impacts rendering performance.');callback(result);}
function externalStylesheetsReceived(root,inlineStyleNodeIds,nodeIds){if(progress.isCanceled()){callback(null);return;}
if(!nodeIds)
return;var externalStylesheetNodeIds=nodeIds;var result=null;if(inlineStyleNodeIds.length||externalStylesheetNodeIds.length){var urlToViolationsArray={};var externalStylesheetHrefs=[];for(var j=0;j<externalStylesheetNodeIds.length;++j){var linkNode=domModel.nodeForId(externalStylesheetNodeIds[j]);var completeHref=Common.ParsedURL.completeURL(linkNode.ownerDocument.baseURL,linkNode.getAttribute('href'));externalStylesheetHrefs.push(completeHref||'<empty>');}
urlToViolationsArray[root.documentURL]=[inlineStyleNodeIds.length,externalStylesheetHrefs];result=urlToViolationsArray;}
evalCallback(result);}
function inlineStylesReceived(root,nodeIds){if(progress.isCanceled()){callback(null);return;}
if(!nodeIds)
return;domModel.querySelectorAll(root.id,'body link[rel~=\'stylesheet\'][href]',externalStylesheetsReceived.bind(null,root,nodeIds));}
function onDocumentAvailable(root){if(progress.isCanceled()){callback(null);return;}
domModel.querySelectorAll(root.id,'body style',inlineStylesReceived.bind(null,root));}
domModel.requestDocument(onDocumentAvailable);}};Audits.AuditRules.StylesScriptsOrderRule=class extends Audits.AuditRule{constructor(){super('page-stylescriptorder',Common.UIString('Optimize the order of styles and scripts'));}
doRun(target,requests,result,callback,progress){var domModel=SDK.DOMModel.fromTarget(target);if(!domModel){callback(null);return;}
function evalCallback(resultValue){if(progress.isCanceled()){callback(null);return;}
if(!resultValue)
return callback(null);var lateCssUrls=resultValue[0];var cssBeforeInlineCount=resultValue[1];if(lateCssUrls.length){var entry=result.addChild(Common.UIString('The following external CSS files were included after an external JavaScript file in the document head. To ensure CSS files are downloaded in parallel, always include external CSS before external JavaScript.'),true);entry.addURLs(lateCssUrls);result.violationCount+=lateCssUrls.length;}
if(cssBeforeInlineCount){result.addChild(Common.UIString(' %d inline script block%s found in the head between an external CSS file and another resource. To allow parallel downloading, move the inline script before the external CSS file, or after the next resource.',cssBeforeInlineCount,cssBeforeInlineCount>1?'s were':' was'));result.violationCount+=cssBeforeInlineCount;}
callback(result);}
function cssBeforeInlineReceived(lateStyleIds,nodeIds){if(progress.isCanceled()){callback(null);return;}
if(!nodeIds)
return;var cssBeforeInlineCount=nodeIds.length;var result=null;if(lateStyleIds.length||cssBeforeInlineCount){var lateStyleUrls=[];for(var i=0;i<lateStyleIds.length;++i){var lateStyleNode=domModel.nodeForId(lateStyleIds[i]);var completeHref=Common.ParsedURL.completeURL(lateStyleNode.ownerDocument.baseURL,lateStyleNode.getAttribute('href'));lateStyleUrls.push(completeHref||'<empty>');}
result=[lateStyleUrls,cssBeforeInlineCount];}
evalCallback(result);}
function lateStylesReceived(root,nodeIds){if(progress.isCanceled()){callback(null);return;}
if(!nodeIds)
return;domModel.querySelectorAll(root.id,'head link[rel~=\'stylesheet\'][href] ~ script:not([src])',cssBeforeInlineReceived.bind(null,nodeIds));}
function onDocumentAvailable(root){if(progress.isCanceled()){callback(null);return;}
domModel.querySelectorAll(root.id,'head script[src] ~ link[rel~=\'stylesheet\'][href]',lateStylesReceived.bind(null,root));}
domModel.requestDocument(onDocumentAvailable);}};Audits.AuditRules.CSSRuleBase=class extends Audits.AuditRule{constructor(id,name){super(id,name);}
doRun(target,requests,result,callback,progress){var cssModel=target.model(SDK.CSSModel);if(!cssModel){callback(null);return;}
var headers=cssModel.allStyleSheets();if(!headers.length){callback(null);return;}
var activeHeaders=[];for(var i=0;i<headers.length;++i){if(!headers[i].disabled)
activeHeaders.push(headers[i]);}
var styleSheetProcessor=new Audits.AuditRules.StyleSheetProcessor(activeHeaders,progress,this._styleSheetsLoaded.bind(this,result,callback,progress));styleSheetProcessor.run();}
_styleSheetsLoaded(result,callback,progress,styleSheets){for(var i=0;i<styleSheets.length;++i)
this._visitStyleSheet(styleSheets[i],result);callback(result);}
_visitStyleSheet(styleSheet,result){this.visitStyleSheet(styleSheet,result);for(var i=0;i<styleSheet.rules.length;++i)
this._visitRule(styleSheet,styleSheet.rules[i],result);this.didVisitStyleSheet(styleSheet,result);}
_visitRule(styleSheet,rule,result){this.visitRule(styleSheet,rule,result);var allProperties=rule.properties;for(var i=0;i<allProperties.length;++i)
this.visitProperty(styleSheet,rule,allProperties[i],result);this.didVisitRule(styleSheet,rule,result);}
visitStyleSheet(styleSheet,result){}
didVisitStyleSheet(styleSheet,result){}
visitRule(styleSheet,rule,result){}
didVisitRule(styleSheet,rule,result){}
visitProperty(styleSheet,rule,property,result){}};Audits.AuditRules.CookieRuleBase=class extends Audits.AuditRule{constructor(id,name){super(id,name);}
doRun(target,requests,result,callback,progress){var self=this;function resultCallback(receivedCookies){if(progress.isCanceled()){callback(result);return;}
self.processCookies(receivedCookies,requests,result);callback(result);}
const nonDataUrls=requests.map(r=>r.url()).filter(url=>url&&url.asParsedURL());SDK.CookieModel.fromTarget(target).getCookiesAsync(nonDataUrls,resultCallback);}
mapResourceCookies(requestsByDomain,allCookies,callback){for(var i=0;i<allCookies.length;++i){for(var requestDomain in requestsByDomain){if(SDK.CookieModel.cookieDomainMatchesResourceDomain(allCookies[i].domain(),requestDomain))
this._callbackForResourceCookiePairs(requestsByDomain[requestDomain],allCookies[i],callback);}}}
_callbackForResourceCookiePairs(requests,cookie,callback){if(!requests)
return;for(var i=0;i<requests.length;++i){if(SDK.CookieModel.cookieMatchesResourceURL(cookie,requests[i].url()))
callback(requests[i],cookie);}}};Audits.AuditRules.CookieSizeRule=class extends Audits.AuditRules.CookieRuleBase{constructor(avgBytesThreshold){super('http-cookiesize',Common.UIString('Minimize cookie size'));this._avgBytesThreshold=avgBytesThreshold;this._maxBytesThreshold=1000;}
_average(cookieArray){var total=0;for(var i=0;i<cookieArray.length;++i)
total+=cookieArray[i].size();return cookieArray.length?Math.round(total/cookieArray.length):0;}
_max(cookieArray){var result=0;for(var i=0;i<cookieArray.length;++i)
result=Math.max(cookieArray[i].size(),result);return result;}
processCookies(allCookies,requests,result){function maxSizeSorter(a,b){return b.maxCookieSize-a.maxCookieSize;}
function avgSizeSorter(a,b){return b.avgCookieSize-a.avgCookieSize;}
var cookiesPerResourceDomain={};function collectorCallback(request,cookie){var cookies=cookiesPerResourceDomain[request.parsedURL.host];if(!cookies){cookies=[];cookiesPerResourceDomain[request.parsedURL.host]=cookies;}
cookies.push(cookie);}
if(!allCookies.length)
return;var sortedCookieSizes=[];var domainToResourcesMap=Audits.AuditRules.getDomainToResourcesMap(requests,null,true);this.mapResourceCookies(domainToResourcesMap,allCookies,collectorCallback);for(var requestDomain in cookiesPerResourceDomain){var cookies=cookiesPerResourceDomain[requestDomain];sortedCookieSizes.push({domain:requestDomain,avgCookieSize:this._average(cookies),maxCookieSize:this._max(cookies)});}
var avgAllCookiesSize=this._average(allCookies);var hugeCookieDomains=[];sortedCookieSizes.sort(maxSizeSorter);for(var i=0,len=sortedCookieSizes.length;i<len;++i){var maxCookieSize=sortedCookieSizes[i].maxCookieSize;if(maxCookieSize>this._maxBytesThreshold){hugeCookieDomains.push(Audits.AuditRuleResult.resourceDomain(sortedCookieSizes[i].domain)+': '+
Number.bytesToString(maxCookieSize));}}
var bigAvgCookieDomains=[];sortedCookieSizes.sort(avgSizeSorter);for(var i=0,len=sortedCookieSizes.length;i<len;++i){var domain=sortedCookieSizes[i].domain;var avgCookieSize=sortedCookieSizes[i].avgCookieSize;if(avgCookieSize>this._avgBytesThreshold&&avgCookieSize<this._maxBytesThreshold){bigAvgCookieDomains.push(Audits.AuditRuleResult.resourceDomain(domain)+': '+Number.bytesToString(avgCookieSize));}}
result.addChild(Common.UIString('The average cookie size for all requests on this page is %s',Number.bytesToString(avgAllCookiesSize)));if(hugeCookieDomains.length){var entry=result.addChild(Common.UIString('The following domains have a cookie size in excess of 1KB. This is harmful because requests with cookies larger than 1KB typically cannot fit into a single network packet.'),true);entry.addURLs(hugeCookieDomains);result.violationCount+=hugeCookieDomains.length;}
if(bigAvgCookieDomains.length){var entry=result.addChild(Common.UIString('The following domains have an average cookie size in excess of %d bytes. Reducing the size of cookies for these domains can reduce the time it takes to send requests.',this._avgBytesThreshold),true);entry.addURLs(bigAvgCookieDomains);result.violationCount+=bigAvgCookieDomains.length;}}};Audits.AuditRules.StaticCookielessRule=class extends Audits.AuditRules.CookieRuleBase{constructor(minResources){super('http-staticcookieless',Common.UIString('Serve static content from a cookieless domain'));this._minResources=minResources;}
processCookies(allCookies,requests,result){var domainToResourcesMap=Audits.AuditRules.getDomainToResourcesMap(requests,[Common.resourceTypes.Stylesheet,Common.resourceTypes.Image],true);var totalStaticResources=0;for(var domain in domainToResourcesMap)
totalStaticResources+=domainToResourcesMap[domain].length;if(totalStaticResources<this._minResources)
return;var matchingResourceData={};this.mapResourceCookies(domainToResourcesMap,allCookies,this._collectorCallback.bind(this,matchingResourceData));var badUrls=[];var cookieBytes=0;for(var url in matchingResourceData){badUrls.push(url);cookieBytes+=matchingResourceData[url];}
if(badUrls.length<this._minResources)
return;var entry=result.addChild(Common.UIString('%s of cookies were sent with the following static resources. Serve these static resources from a domain that does not set cookies:',Number.bytesToString(cookieBytes)),true);entry.addURLs(badUrls);result.violationCount=badUrls.length;}
_collectorCallback(matchingResourceData,request,cookie){matchingResourceData[request.url()]=(matchingResourceData[request.url()]||0)+cookie.size();}};;Audits.AuditExtensionCategory=class{constructor(extensionOrigin,id,displayName,ruleCount){this._extensionOrigin=extensionOrigin;this._id=id;this._displayName=displayName;this._ruleCount=ruleCount;}
get id(){return this._id;}
get displayName(){return this._displayName;}
run(target,requests,ruleResultCallback,progress){var results=new Audits.AuditExtensionCategoryResults(this,target,ruleResultCallback,progress);Extensions.extensionServer.startAuditRun(this.id,results);}};Audits.AuditExtensionCategoryResults=class{constructor(category,target,ruleResultCallback,progress){this._target=target;this._category=category;this._ruleResultCallback=ruleResultCallback;this._progress=progress;this._progress.setTotalWork(1);this._expectedResults=category._ruleCount;this._actualResults=0;this._id=category.id+'-'+ ++Audits.AuditExtensionCategoryResults._lastId;}
id(){return this._id;}
done(){Extensions.extensionServer.stopAuditRun(this);this._progress.done();}
addResult(displayName,description,severity,details){var result=new Audits.AuditRuleResult(displayName);if(description)
result.addChild(description);result.severity=severity;if(details)
this._addNode(result,details);this._addResult(result);}
_addNode(parent,node){var contents=Audits.auditFormatters.partiallyApply(Audits.AuditExtensionFormatters,this,node.contents);var addedNode=parent.addChild(contents,node.expanded);if(node.children){for(var i=0;i<node.children.length;++i)
this._addNode(addedNode,node.children[i]);}}
_addResult(result){this._ruleResultCallback(result);++this._actualResults;if(typeof this._expectedResults==='number'){this._progress.setWorked(this._actualResults/this._expectedResults);if(this._actualResults===this._expectedResults)
this.done();}}
updateProgress(progress){this._progress.setWorked(progress);}
evaluate(expression,evaluateOptions,callback){function onEvaluate(error,result,wasThrown){if(wasThrown)
return;var object=this._target.runtimeModel.createRemoteObject(result);callback(object);}
var evaluateCallback=(onEvaluate.bind(this));Extensions.extensionServer.evaluate(expression,false,false,evaluateOptions,this._category._extensionOrigin,evaluateCallback);}};Audits.AuditExtensionFormatters={object:function(expression,title,evaluateOptions){var parentElement=createElement('div');function onEvaluate(remoteObject){var section=new ObjectUI.ObjectPropertiesSection(remoteObject,title);section.expand();section.editable=false;parentElement.appendChild(section.element);}
this.evaluate(expression,evaluateOptions,onEvaluate);return parentElement;},node:function(expression,evaluateOptions){var parentElement=createElement('div');this.evaluate(expression,evaluateOptions,onEvaluate);function onEvaluate(remoteObject){Common.Renderer.renderPromise(remoteObject).then(appendRenderer).then(remoteObject.release.bind(remoteObject));function appendRenderer(element){parentElement.appendChild(element);}}
return parentElement;}};Audits.AuditExtensionCategoryResults._lastId=0;;Runtime.cachedResources["audits/auditsPanel.css"]="/*\n * Copyright (C) 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Google Inc. All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions are\n * met:\n *\n *     * Redistributions of source code must retain the above copyright\n * notice, this list of conditions and the following disclaimer.\n *     * Redistributions in binary form must reproduce the above\n * copyright notice, this list of conditions and the following disclaimer\n * in the documentation and/or other materials provided with the\n * distribution.\n *     * Neither the name of Google Inc. nor the names of its\n * contributors may be used to endorse or promote products derived from\n * this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n * \"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.audit-launcher-view .audit-launcher-view-content {\n    padding: 0 0 0 16px;\n    white-space: nowrap;\n    display: -webkit-flex;\n    text-align: left;\n    -webkit-flex-direction: column;\n    flex: auto;\n}\n\n.audit-launcher-view h1 {\n    padding-top: 15px;\n    -webkit-flex: none;\n}\n\n.audit-launcher-view h1.no-audits {\n    text-align: center;\n    font-style: italic;\n    position: relative;\n    left: -8px;\n}\n\n.audit-launcher-view div.button-container {\n    width: 100%;\n    padding: 16px 0;\n    -webkit-flex: none;\n}\n\n.audit-launcher-view div.button-container > button {\n    -webkit-align-self: flex-start;\n    margin-right: 10px;\n    margin-bottom: 5px;\n    margin-top: 5px;\n}\n\n.audit-launcher-view fieldset.audit-categories-container {\n    position: relative;\n    top: 11px;\n    left: 0;\n    width: 100%;\n    overflow-y: auto;\n    border: 0 none;\n    -webkit-flex: none;\n}\n\n.audit-launcher-view button {\n    margin: 0 5px 0 0;\n}\n\n.audit-result-view {\n    overflow: auto;\n}\n\n.panel-enabler-view.audit-launcher-view label {\n    padding: 0 0 5px 0;\n    margin: 0;\n    display: flex;\n    flex-shrink: 0;\n}\n\n.panel-enabler-view.audit-launcher-view label.disabled {\n    color: rgb(130, 130, 130);\n}\n\n.audit-launcher-view input[type=\"checkbox\"] {\n    margin-left: 0;\n    height: 14px;\n    width: 14px;\n}\n\n.audit-result-tree {\n    margin: 0 0 3px;\n}\n\n.audit-launcher-view .progress-indicator {\n    display: inline-block;\n}\n\n.resource-url {\n    float: right;\n    text-align: right;\n    max-width: 100%;\n    margin-left: 4px;\n}\n\n/*# sourceURL=audits/auditsPanel.css */";Runtime.cachedResources["audits/auditsSidebarTree.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline {\n    padding: 0;\n}\n\n.tree-outline li::before {\n    display: none;\n}\n\n.tree-outline ol {\n    padding-left: 0;\n}\n\n.tree-outline li .tree-element-title {\n    margin-left: 4px;\n}\n\nli.audits-sidebar-header {\n    padding-left: 10px;\n    height: 36px;\n}\n\n.audits-sidebar-header .icon {\n    content: url(Images/resourcesTimeGraphIcon.png);\n}\n\nli.audits-sidebar-results {\n    height: 18px;\n    padding: 1px 10px;\n    margin-top: 1px;\n    color: rgb(92, 110, 129);\n    text-shadow: rgba(255, 255, 255, 0.75) 0 1px 0;\n}\n\nli.audit-result-sidebar-tree-item {\n    padding-left: 10px;\n    height: 36px;\n    margin-top: 1px;\n    line-height: 34px;\n    border-top: 1px solid transparent;\n}\n\n.audit-result-sidebar-tree-item .icon {\n    content: url(Images/resourceDocumentIcon.png);\n}\n\n/*# sourceURL=audits/auditsSidebarTree.css */";Runtime.cachedResources["audits/auditResultTree.css"]="/*\n * Copyright 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.severity {\n    margin-right: 4px;\n}\n\nli {\n    -webkit-user-select: text;\n}\n\n.audit-result {\n    font-weight: bold;\n}\n\n/*# sourceURL=audits/auditResultTree.css */";