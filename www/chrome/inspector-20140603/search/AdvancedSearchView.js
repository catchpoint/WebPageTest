WebInspector.AdvancedSearchView=function()
{WebInspector.VBox.call(this);this._searchId=0;this.element.classList.add("search-view");this._searchPanelElement=this.element.createChild("div","search-drawer-header");this._searchPanelElement.addEventListener("keydown",this._onKeyDown.bind(this),false);this._searchResultsElement=this.element.createChild("div");this._searchResultsElement.className="search-results";this._search=this._searchPanelElement.createChild("input");this._search.placeholder=WebInspector.UIString("Search sources");this._search.setAttribute("type","text");this._search.classList.add("search-config-search");this._search.setAttribute("results","0");this._search.setAttribute("size",30);this._ignoreCaseLabel=this._searchPanelElement.createChild("label");this._ignoreCaseLabel.classList.add("search-config-label");this._ignoreCaseCheckbox=this._ignoreCaseLabel.createChild("input");this._ignoreCaseCheckbox.setAttribute("type","checkbox");this._ignoreCaseCheckbox.classList.add("search-config-checkbox");this._ignoreCaseLabel.appendChild(document.createTextNode(WebInspector.UIString("Ignore case")));this._regexLabel=this._searchPanelElement.createChild("label");this._regexLabel.classList.add("search-config-label");this._regexCheckbox=this._regexLabel.createChild("input");this._regexCheckbox.setAttribute("type","checkbox");this._regexCheckbox.classList.add("search-config-checkbox");this._regexLabel.appendChild(document.createTextNode(WebInspector.UIString("Regular expression")));this._searchStatusBarElement=this.element.createChild("div","search-status-bar-summary");this._searchMessageElement=this._searchStatusBarElement.createChild("span");this._searchResultsMessageElement=document.createElement("span");WebInspector.settings.advancedSearchConfig=WebInspector.settings.createSetting("advancedSearchConfig",new WebInspector.SearchConfig("",true,false).toPlainObject());this._load();}
WebInspector.AdvancedSearchView.prototype={_buildSearchConfig:function()
{return new WebInspector.SearchConfig(this._search.value,this._ignoreCaseCheckbox.checked,this._regexCheckbox.checked);},toggle:function()
{var selection=window.getSelection();var queryCandidate;if(selection.rangeCount)
queryCandidate=selection.toString().replace(/\r?\n.*/,"");if(!this.isShowing())
WebInspector.inspectorView.showViewInDrawer("search");if(queryCandidate)
this._search.value=queryCandidate;this.focus();this._startIndexing();},_onIndexingFinished:function(finished)
{delete this._isIndexing;this._indexingFinished(finished);if(!finished)
delete this._pendingSearchConfig;if(!this._pendingSearchConfig)
return;var searchConfig=this._pendingSearchConfig
delete this._pendingSearchConfig;this._innerStartSearch(searchConfig);},_startIndexing:function()
{this._isIndexing=true;this._currentSearchScope=this._searchScopes()[0];if(this._progressIndicator)
this._progressIndicator.done();this._progressIndicator=new WebInspector.ProgressIndicator();this._indexingStarted(this._progressIndicator);this._currentSearchScope.performIndexing(this._progressIndicator,this._onIndexingFinished.bind(this));},_onSearchResult:function(searchId,searchResult)
{if(searchId!==this._searchId)
return;this._addSearchResult(searchResult);if(!searchResult.searchMatches.length)
return;if(!this._searchResultsPane)
this._searchResultsPane=this._currentSearchScope.createSearchResultsPane(this._searchConfig);this._resetResults();this._searchResultsElement.appendChild(this._searchResultsPane.element);this._searchResultsPane.addSearchResult(searchResult);},_onSearchFinished:function(searchId,finished)
{if(searchId!==this._searchId)
return;if(!this._searchResultsPane)
this._nothingFound();this._searchFinished(finished);delete this._searchConfig;},_startSearch:function(searchConfig)
{this._resetSearch();++this._searchId;if(!this._isIndexing)
this._startIndexing();this._pendingSearchConfig=searchConfig;},_innerStartSearch:function(searchConfig)
{this._searchConfig=searchConfig;this._currentSearchScope=this._searchScopes()[0];if(this._progressIndicator)
this._progressIndicator.done();this._progressIndicator=new WebInspector.ProgressIndicator();this._searchStarted(this._progressIndicator);this._currentSearchScope.performSearch(searchConfig,this._progressIndicator,this._onSearchResult.bind(this,this._searchId),this._onSearchFinished.bind(this,this._searchId));},_resetSearch:function()
{this._stopSearch();if(this._searchResultsPane){this._resetResults();delete this._searchResultsPane;}},_stopSearch:function()
{if(this._progressIndicator)
this._progressIndicator.cancel();if(this._currentSearchScope)
this._currentSearchScope.stopSearch();delete this._searchConfig;},_searchScopes:function()
{return(WebInspector.moduleManager.instances(WebInspector.SearchScope));},_searchStarted:function(progressIndicator)
{this._resetResults();this._resetCounters();this._searchMessageElement.textContent=WebInspector.UIString("Searching...");progressIndicator.show(this._searchStatusBarElement);this._updateSearchResultsMessage();if(!this._searchingView)
this._searchingView=new WebInspector.EmptyView(WebInspector.UIString("Searching..."));this._searchingView.show(this._searchResultsElement);},_indexingStarted:function(progressIndicator)
{this._searchMessageElement.textContent=WebInspector.UIString("Indexing...");progressIndicator.show(this._searchStatusBarElement);},_indexingFinished:function(finished)
{this._searchMessageElement.textContent=finished?"":WebInspector.UIString("Indexing interrupted.");},_updateSearchResultsMessage:function()
{if(this._searchMatchesCount&&this._searchResultsCount)
this._searchResultsMessageElement.textContent=WebInspector.UIString("Found %d matches in %d files.",this._searchMatchesCount,this._nonEmptySearchResultsCount);else
this._searchResultsMessageElement.textContent="";},_resetResults:function()
{if(this._searchingView)
this._searchingView.detach();if(this._notFoundView)
this._notFoundView.detach();this._searchResultsElement.removeChildren();},_resetCounters:function()
{this._searchMatchesCount=0;this._searchResultsCount=0;this._nonEmptySearchResultsCount=0;},_nothingFound:function()
{this._resetResults();if(!this._notFoundView)
this._notFoundView=new WebInspector.EmptyView(WebInspector.UIString("No matches found."));this._notFoundView.show(this._searchResultsElement);this._searchResultsMessageElement.textContent=WebInspector.UIString("No matches found.");},_addSearchResult:function(searchResult)
{this._searchMatchesCount+=searchResult.searchMatches.length;this._searchResultsCount++;if(searchResult.searchMatches.length)
this._nonEmptySearchResultsCount++;this._updateSearchResultsMessage();},_searchFinished:function(finished)
{this._searchMessageElement.textContent=finished?WebInspector.UIString("Search finished."):WebInspector.UIString("Search interrupted.");},focus:function()
{WebInspector.setCurrentFocusElement(this._search);this._search.select();},willHide:function()
{this._stopSearch();},_onKeyDown:function(event)
{switch(event.keyCode){case WebInspector.KeyboardShortcut.Keys.Enter.code:this._onAction();break;}},_save:function()
{WebInspector.settings.advancedSearchConfig.set(this._buildSearchConfig().toPlainObject());},_load:function()
{var searchConfig=WebInspector.SearchConfig.fromPlainObject(WebInspector.settings.advancedSearchConfig.get());this._search.value=searchConfig.query();this._ignoreCaseCheckbox.checked=searchConfig.ignoreCase();this._regexCheckbox.checked=searchConfig.isRegex();},_onAction:function()
{var searchConfig=this._buildSearchConfig();if(!searchConfig.query()||!searchConfig.query().length)
return;this._save();this._startSearch(searchConfig);},__proto__:WebInspector.VBox.prototype}
WebInspector.SearchResultsPane=function(searchConfig)
{this._searchConfig=searchConfig;this.element=document.createElement("div");}
WebInspector.SearchResultsPane.prototype={get searchConfig()
{return this._searchConfig;},addSearchResult:function(searchResult){}}
WebInspector.AdvancedSearchView.ToggleDrawerViewActionDelegate=function()
{}
WebInspector.AdvancedSearchView.ToggleDrawerViewActionDelegate.prototype={handleAction:function()
{var searchView=this._searchView();if(!searchView)
return false;if(!searchView.isShowing()||searchView._search!==document.activeElement){WebInspector.inspectorView.showPanel("sources");searchView.toggle();}else{WebInspector.inspectorView.closeDrawer();}
return true;},_searchView:function()
{if(!this._view){var extensions=WebInspector.moduleManager.extensions("drawer-view");for(var i=0;i<extensions.length;++i){if(extensions[i].descriptor()["name"]==="search"){this._view=extensions[i].instance();break;}}}
return this._view;}}
WebInspector.FileBasedSearchResult=function(uiSourceCode,searchMatches){this.uiSourceCode=uiSourceCode;this.searchMatches=searchMatches;}
WebInspector.SearchScope=function()
{}
WebInspector.SearchScope.prototype={performSearch:function(searchConfig,progress,searchResultCallback,searchFinishedCallback){},performIndexing:function(progress,callback){},stopSearch:function(){},createSearchResultsPane:function(searchConfig){}}
WebInspector.FileBasedSearchResultsPane=function(searchConfig)
{WebInspector.SearchResultsPane.call(this,searchConfig);this._searchResults=[];this.element.id="search-results-pane-file-based";this._treeOutlineElement=document.createElement("ol");this._treeOutlineElement.className="search-results-outline-disclosure";this.element.appendChild(this._treeOutlineElement);this._treeOutline=new TreeOutline(this._treeOutlineElement);this._matchesExpandedCount=0;}
WebInspector.FileBasedSearchResultsPane.matchesExpandedByDefaultCount=20;WebInspector.FileBasedSearchResultsPane.fileMatchesShownAtOnce=20;WebInspector.FileBasedSearchResultsPane.prototype={addSearchResult:function(searchResult)
{this._searchResults.push(searchResult);var uiSourceCode=searchResult.uiSourceCode;if(!uiSourceCode)
return;this._addFileTreeElement(searchResult);},_addFileTreeElement:function(searchResult)
{var fileTreeElement=new WebInspector.FileBasedSearchResultsPane.FileTreeElement(this._searchConfig,searchResult);this._treeOutline.appendChild(fileTreeElement);if(this._matchesExpandedCount<WebInspector.FileBasedSearchResultsPane.matchesExpandedByDefaultCount)
fileTreeElement.expand();this._matchesExpandedCount+=searchResult.searchMatches.length;},__proto__:WebInspector.SearchResultsPane.prototype}
WebInspector.FileBasedSearchResultsPane.FileTreeElement=function(searchConfig,searchResult)
{TreeElement.call(this,"",null,true);this._searchConfig=searchConfig;this._searchResult=searchResult;this.toggleOnClick=true;this.selectable=false;}
WebInspector.FileBasedSearchResultsPane.FileTreeElement.prototype={onexpand:function()
{if(this._initialized)
return;this._updateMatchesUI();this._initialized=true;},_updateMatchesUI:function()
{this.removeChildren();var toIndex=Math.min(this._searchResult.searchMatches.length,WebInspector.FileBasedSearchResultsPane.fileMatchesShownAtOnce);if(toIndex<this._searchResult.searchMatches.length){this._appendSearchMatches(0,toIndex-1);this._appendShowMoreMatchesElement(toIndex-1);}else{this._appendSearchMatches(0,toIndex);}},onattach:function()
{this._updateSearchMatches();},_updateSearchMatches:function()
{this.listItemElement.classList.add("search-result");var fileNameSpan=document.createElement("span");fileNameSpan.className="search-result-file-name";fileNameSpan.textContent=this._searchResult.uiSourceCode.fullDisplayName();this.listItemElement.appendChild(fileNameSpan);var matchesCountSpan=document.createElement("span");matchesCountSpan.className="search-result-matches-count";var searchMatchesCount=this._searchResult.searchMatches.length;if(searchMatchesCount===1)
matchesCountSpan.textContent=WebInspector.UIString("(%d match)",searchMatchesCount);else
matchesCountSpan.textContent=WebInspector.UIString("(%d matches)",searchMatchesCount);this.listItemElement.appendChild(matchesCountSpan);if(this.expanded)
this._updateMatchesUI();},_appendSearchMatches:function(fromIndex,toIndex)
{var searchResult=this._searchResult;var uiSourceCode=searchResult.uiSourceCode;var searchMatches=searchResult.searchMatches;var queries=this._searchConfig.queries();var regexes=[];for(var i=0;i<queries.length;++i)
regexes.push(createSearchRegex(queries[i],!this._searchConfig.ignoreCase(),this._searchConfig.isRegex()));for(var i=fromIndex;i<toIndex;++i){var lineNumber=searchMatches[i].lineNumber;var lineContent=searchMatches[i].lineContent;var matchRanges=[];for(var j=0;j<regexes.length;++j)
matchRanges=matchRanges.concat(this._regexMatchRanges(lineContent,regexes[j]));var anchor=this._createAnchor(uiSourceCode,lineNumber,matchRanges[0].offset);var numberString=numberToStringWithSpacesPadding(lineNumber+1,4);var lineNumberSpan=document.createElement("span");lineNumberSpan.classList.add("search-match-line-number");lineNumberSpan.textContent=numberString;anchor.appendChild(lineNumberSpan);var contentSpan=this._createContentSpan(lineContent,matchRanges);anchor.appendChild(contentSpan);var searchMatchElement=new TreeElement("");searchMatchElement.selectable=false;this.appendChild(searchMatchElement);searchMatchElement.listItemElement.className="search-match source-code";searchMatchElement.listItemElement.appendChild(anchor);}},_appendShowMoreMatchesElement:function(startMatchIndex)
{var matchesLeftCount=this._searchResult.searchMatches.length-startMatchIndex;var showMoreMatchesText=WebInspector.UIString("Show all matches (%d more).",matchesLeftCount);this._showMoreMatchesTreeElement=new TreeElement(showMoreMatchesText);this.appendChild(this._showMoreMatchesTreeElement);this._showMoreMatchesTreeElement.listItemElement.classList.add("show-more-matches");this._showMoreMatchesTreeElement.onselect=this._showMoreMatchesElementSelected.bind(this,startMatchIndex);},_createAnchor:function(uiSourceCode,lineNumber,columnNumber)
{return WebInspector.Linkifier.linkifyUsingRevealer(uiSourceCode.uiLocation(lineNumber,columnNumber),"",uiSourceCode.url,lineNumber);},_createContentSpan:function(lineContent,matchRanges)
{var contentSpan=document.createElement("span");contentSpan.className="search-match-content";contentSpan.textContent=lineContent;WebInspector.highlightRangesWithStyleClass(contentSpan,matchRanges,"highlighted-match");return contentSpan;},_regexMatchRanges:function(lineContent,regex)
{regex.lastIndex=0;var match;var offset=0;var matchRanges=[];while((regex.lastIndex<lineContent.length)&&(match=regex.exec(lineContent)))
matchRanges.push(new WebInspector.SourceRange(match.index,match[0].length));return matchRanges;},_showMoreMatchesElementSelected:function(startMatchIndex)
{this.removeChild(this._showMoreMatchesTreeElement);this._appendSearchMatches(startMatchIndex,this._searchResult.searchMatches.length);return false;},__proto__:TreeElement.prototype};WebInspector.SourcesSearchScope=function()
{this._searchId=0;this._workspace=WebInspector.workspace;}
WebInspector.SourcesSearchScope.prototype={performIndexing:function(progress,indexingFinishedCallback)
{this.stopSearch();var projects=this._projects();var compositeProgress=new WebInspector.CompositeProgress(progress);progress.addEventListener(WebInspector.Progress.Events.Canceled,indexingCanceled);for(var i=0;i<projects.length;++i){var project=projects[i];var projectProgress=compositeProgress.createSubProgress(project.uiSourceCodes().length);project.indexContent(projectProgress);}
compositeProgress.addEventListener(WebInspector.Progress.Events.Done,indexingFinishedCallback.bind(this,true));function indexingCanceled()
{indexingFinishedCallback(false);progress.done();}},_projects:function()
{function filterOutServiceProjects(project)
{return!project.isServiceProject()||project.type()===WebInspector.projectTypes.Formatter;}
function filterOutContentScriptsIfNeeded(project)
{return WebInspector.settings.searchInContentScripts.get()||project.type()!==WebInspector.projectTypes.ContentScripts;}
return this._workspace.projects().filter(filterOutServiceProjects).filter(filterOutContentScriptsIfNeeded);},performSearch:function(searchConfig,progress,searchResultCallback,searchFinishedCallback)
{this.stopSearch();this._searchResultCallback=searchResultCallback;this._searchFinishedCallback=searchFinishedCallback;this._searchConfig=searchConfig;var projects=this._projects();var barrier=new CallbackBarrier();var compositeProgress=new WebInspector.CompositeProgress(progress);for(var i=0;i<projects.length;++i){var project=projects[i];var weight=project.uiSourceCodes().length;var projectProgress=new WebInspector.CompositeProgress(compositeProgress.createSubProgress(weight));var findMatchingFilesProgress=projectProgress.createSubProgress();var searchContentProgress=projectProgress.createSubProgress();var barrierCallback=barrier.createCallback();var callback=this._processMatchingFilesForProject.bind(this,this._searchId,project,searchContentProgress,barrierCallback);project.findFilesMatchingSearchRequest(searchConfig,findMatchingFilesProgress,callback);}
barrier.callWhenDone(this._searchFinishedCallback.bind(this,true));},_processMatchingFilesForProject:function(searchId,project,progress,callback,files)
{if(searchId!==this._searchId){this._searchFinishedCallback(false);return;}
addDirtyFiles.call(this);if(!files.length){progress.done();callback();return;}
progress.setTotalWork(files.length);var fileIndex=0;var maxFileContentRequests=20;var callbacksLeft=0;for(var i=0;i<maxFileContentRequests&&i<files.length;++i)
scheduleSearchInNextFileOrFinish.call(this);function addDirtyFiles()
{var matchingFiles=StringSet.fromArray(files);var uiSourceCodes=project.uiSourceCodes();for(var i=0;i<uiSourceCodes.length;++i){if(!uiSourceCodes[i].isDirty())
continue;var path=uiSourceCodes[i].path();if(!matchingFiles.contains(path)&&this._searchConfig.filePathMatchesFileQuery(path))
files.push(path);}}
function searchInNextFile(path)
{var uiSourceCode=project.uiSourceCode(path);if(!uiSourceCode){--callbacksLeft;progress.worked(1);scheduleSearchInNextFileOrFinish.call(this);return;}
if(uiSourceCode.isDirty())
contentLoaded.call(this,uiSourceCode.path(),uiSourceCode.workingCopy());else
uiSourceCode.checkContentUpdated(contentUpdated.bind(this,uiSourceCode));}
function contentUpdated(uiSourceCode)
{uiSourceCode.requestContent(contentLoaded.bind(this,uiSourceCode.path()));}
function scheduleSearchInNextFileOrFinish()
{if(fileIndex>=files.length){if(!callbacksLeft){progress.done();callback();return;}
return;}
++callbacksLeft;var path=files[fileIndex++];setTimeout(searchInNextFile.bind(this,path),0);}
function contentLoaded(path,content)
{function matchesComparator(a,b)
{return a.lineNumber-b.lineNumber;}
progress.worked(1);var matches=[];var queries=this._searchConfig.queries();if(content!==null){for(var i=0;i<queries.length;++i){var nextMatches=WebInspector.ContentProvider.performSearchInContent(content,queries[i],!this._searchConfig.ignoreCase(),this._searchConfig.isRegex())
matches=matches.mergeOrdered(nextMatches,matchesComparator);}}
var uiSourceCode=project.uiSourceCode(path);if(matches&&uiSourceCode){var searchResult=new WebInspector.FileBasedSearchResult(uiSourceCode,matches);this._searchResultCallback(searchResult);}
--callbacksLeft;scheduleSearchInNextFileOrFinish.call(this);}},stopSearch:function()
{++this._searchId;},createSearchResultsPane:function(searchConfig)
{return new WebInspector.FileBasedSearchResultsPane(searchConfig);}};