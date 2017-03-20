QuickOpen.FilteredListWidget=class extends UI.VBox{constructor(provider,promptHistory){super(true);this._promptHistory=promptHistory||[];this.contentElement.classList.add('filtered-list-widget');this.contentElement.addEventListener('keydown',this._onKeyDown.bind(this),true);this.registerRequiredCSS('quick_open/filteredListWidget.css');this._promptElement=this.contentElement.createChild('div','filtered-list-widget-input');this._promptElement.setAttribute('spellcheck','false');this._promptElement.setAttribute('contenteditable','plaintext-only');this._prompt=new UI.TextPrompt();this._prompt.initialize(()=>Promise.resolve([]));this._prompt.renderAsBlock();var promptProxy=this._prompt.attach(this._promptElement);promptProxy.addEventListener('input',this._onInput.bind(this),false);promptProxy.classList.add('filtered-list-widget-prompt-element');this._bottomElementsContainer=this.contentElement.createChild('div','vbox');this._progressElement=this._bottomElementsContainer.createChild('div','filtered-list-widget-progress');this._progressBarElement=this._progressElement.createChild('div','filtered-list-widget-progress-bar');this._list=new UI.ListControl(this,UI.ListMode.EqualHeightItems);this._itemElementsContainer=this._list.element;this._itemElementsContainer.classList.add('container');this._bottomElementsContainer.appendChild(this._itemElementsContainer);this._notFoundElement=this._bottomElementsContainer.createChild('div','not-found-text');this._notFoundElement.classList.add('hidden');this.setDefaultFocusedElement(this._promptElement);this._provider=provider;}
static filterRegex(query){const toEscape=String.regexSpecialCharacters();var regexString='';for(var i=0;i<query.length;++i){var c=query.charAt(i);if(toEscape.indexOf(c)!==-1)
c='\\'+c;if(i)
regexString+='[^\\0'+c+']*';regexString+=c;}
return new RegExp(regexString,'i');}
static highlightRanges(element,query,caseInsensitive){if(!query)
return false;function rangesForMatch(text,query){var opcodes=Diff.Diff.charDiff(query,text);var offset=0;var ranges=[];for(var i=0;i<opcodes.length;++i){var opcode=opcodes[i];if(opcode[0]===Diff.Diff.Operation.Equal)
ranges.push(new Common.SourceRange(offset,opcode[1].length));else if(opcode[0]!==Diff.Diff.Operation.Insert)
return null;offset+=opcode[1].length;}
return ranges;}
var text=element.textContent;var ranges=rangesForMatch(text,query);if(!ranges||caseInsensitive)
ranges=rangesForMatch(text.toUpperCase(),query.toUpperCase());if(ranges){UI.highlightRangesWithStyleClass(element,ranges,'highlight');return true;}
return false;}
showAsDialog(){this._dialog=new UI.Dialog();this._dialog.setMaxContentSize(new UI.Size(504,340));this._dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SetExactWidthMaxHeight);this._dialog.setContentPosition(null,22);this.show(this._dialog.contentElement);this._dialog.show();}
setProvider(provider){if(provider===this._provider)
return;if(this._provider)
this._provider.detach();this._clearTimers();this._provider=provider;if(this.isShowing())
this._attachProvider();}
_attachProvider(){if(this._provider){this._provider.setRefreshCallback(this._itemsLoaded.bind(this,this._provider));this._provider.attach();}
this._itemsLoaded(this._provider);this._updateShowMatchingItems();}
_value(){return this._prompt.text().trim();}
wasShown(){this._list.invalidateItemHeight();this._attachProvider();}
willHide(){if(this._provider)
this._provider.detach();this._clearTimers();}
_clearTimers(){clearTimeout(this._filterTimer);clearTimeout(this._scoringTimer);clearTimeout(this._loadTimeout);delete this._filterTimer;delete this._scoringTimer;delete this._loadTimeout;delete this._refreshListWithCurrentResult;}
_onEnter(event){event.preventDefault();if(!this._provider||!this._provider.itemCount())
return;var selectedIndexInProvider=this._shouldShowMatchingItems()?this._list.selectedItem():null;if(this._dialog)
this._dialog.hide();this._selectItemWithQuery(selectedIndexInProvider,this._value());}
_itemsLoaded(provider){if(this._loadTimeout||provider!==this._provider)
return;this._loadTimeout=setTimeout(this._updateAfterItemsLoaded.bind(this),0);}
_updateAfterItemsLoaded(){delete this._loadTimeout;this._filterItems();}
createElementForItem(item){var itemElement=createElement('div');itemElement.className='filtered-list-widget-item '+(this._provider.renderAsTwoRows()?'two-rows':'one-row');var titleElement=itemElement.createChild('div','filtered-list-widget-title');var subtitleElement=itemElement.createChild('div','filtered-list-widget-subtitle');subtitleElement.textContent='\u200B';this._provider.renderItem(item,this._value(),titleElement,subtitleElement);itemElement.addEventListener('click',event=>{event.consume(true);if(this._dialog)
this._dialog.hide();this._selectItemWithQuery(item,this._value());},false);return itemElement;}
heightForItem(item){return 0;}
isItemSelectable(item){return true;}
selectedItemChanged(from,to,fromElement,toElement){if(fromElement)
fromElement.classList.remove('selected');if(toElement)
toElement.classList.add('selected');}
setQuery(query){this._prompt.setText(query);this._prompt.autoCompleteSoon(true);this._scheduleFilter();this._updateShowMatchingItems();}
_tabKeyPressed(){var userEnteredText=this._prompt.text();var completion;for(var i=this._promptHistory.length-1;i>=0;i--){if(this._promptHistory[i]!==userEnteredText&&this._promptHistory[i].startsWith(userEnteredText)){completion=this._promptHistory[i];break;}}
if(!completion)
return;this._prompt.setText(completion);this._prompt.setDOMSelection(userEnteredText.length,completion.length);this._scheduleFilter();}
_itemsFilteredForTest(){}
_filterItems(){delete this._filterTimer;if(this._scoringTimer){clearTimeout(this._scoringTimer);delete this._scoringTimer;if(this._refreshListWithCurrentResult)
this._refreshListWithCurrentResult();}
if(!this._provider){this._itemsFilteredForTest();return;}
this._progressBarElement.style.transform='scaleX(0)';this._progressBarElement.classList.remove('filtered-widget-progress-fade');this._progressBarElement.classList.remove('hidden');var query=this._provider.rewriteQuery(this._value());this._query=query;var filterRegex=query?QuickOpen.FilteredListWidget.filterRegex(query):null;var filteredItems=[];var bestScores=[];var bestItems=[];var bestItemsToCollect=100;var minBestScore=0;var overflowItems=[];var scoreStartTime=window.performance.now();var maxWorkItems=Number.constrain(10,500,(this._provider.itemCount()/10)|0);scoreItems.call(this,0);function compareIntegers(a,b){return b-a;}
function scoreItems(fromIndex){delete this._scoringTimer;var workDone=0;for(var i=fromIndex;i<this._provider.itemCount()&&workDone<maxWorkItems;++i){if(filterRegex&&!filterRegex.test(this._provider.itemKeyAt(i)))
continue;var score=this._provider.itemScoreAt(i,query);if(query)
workDone++;if(score>minBestScore||bestScores.length<bestItemsToCollect){var index=bestScores.upperBound(score,compareIntegers);bestScores.splice(index,0,score);bestItems.splice(index,0,i);if(bestScores.length>bestItemsToCollect){overflowItems.push(bestItems.peekLast());bestScores.length=bestItemsToCollect;bestItems.length=bestItemsToCollect;}
minBestScore=bestScores.peekLast();}else{filteredItems.push(i);}}
this._refreshListWithCurrentResult=this._refreshList.bind(this,bestItems,overflowItems,filteredItems);if(i<this._provider.itemCount()){this._scoringTimer=setTimeout(scoreItems.bind(this,i),0);if(window.performance.now()-scoreStartTime>50)
this._progressBarElement.style.transform='scaleX('+i/this._provider.itemCount()+')';return;}
if(window.performance.now()-scoreStartTime>100){this._progressBarElement.style.transform='scaleX(1)';this._progressBarElement.classList.add('filtered-widget-progress-fade');}else{this._progressBarElement.classList.add('hidden');}
this._refreshListWithCurrentResult();}}
_refreshList(bestItems,overflowItems,filteredItems){delete this._refreshListWithCurrentResult;filteredItems=[].concat(bestItems,overflowItems,filteredItems);this._updateNotFoundMessage(!!filteredItems.length);var oldHeight=this._list.element.offsetHeight;this._list.replaceAllItems(filteredItems);if(filteredItems.length)
this._list.selectItem(filteredItems[0]);if(this._list.element.offsetHeight!==oldHeight)
this._list.viewportResized();this._itemsFilteredForTest();}
_updateNotFoundMessage(hasItems){this._list.element.classList.toggle('hidden',!hasItems);this._notFoundElement.classList.toggle('hidden',hasItems);if(!hasItems)
this._notFoundElement.textContent=this._provider.notFoundText();}
_shouldShowMatchingItems(){return!!this._provider&&this._provider.shouldShowMatchingItems(this._value());}
_onInput(){this._updateShowMatchingItems();this._scheduleFilter();}
_updateShowMatchingItems(){var shouldShowMatchingItems=this._shouldShowMatchingItems();this._bottomElementsContainer.classList.toggle('hidden',!shouldShowMatchingItems);}
_onKeyDown(event){var handled=false;switch(event.key){case'Enter':this._onEnter(event);return;case'Tab':this._tabKeyPressed();return;case'ArrowUp':handled=this._list.selectPreviousItem(true,false);break;case'ArrowDown':handled=this._list.selectNextItem(true,false);break;case'PageUp':handled=this._list.selectItemPreviousPage(false);break;case'PageDown':handled=this._list.selectItemNextPage(false);break;}
if(handled)
event.consume(true);}
_scheduleFilter(){if(this._filterTimer)
return;this._filterTimer=setTimeout(this._filterItems.bind(this),0);}
_selectItemWithQuery(itemIndex,promptValue){this._promptHistory.push(promptValue);if(this._promptHistory.length>100)
this._promptHistory.shift();this._provider.selectItem(itemIndex,promptValue);}};QuickOpen.FilteredListWidget.Provider=class{setRefreshCallback(refreshCallback){this._refreshCallback=refreshCallback;}
attach(){}
shouldShowMatchingItems(query){return true;}
itemCount(){return 0;}
itemKeyAt(itemIndex){return'';}
itemScoreAt(itemIndex,query){return 1;}
renderItem(itemIndex,query,titleElement,subtitleElement){}
renderAsTwoRows(){return false;}
selectItem(itemIndex,promptValue){}
refresh(){this._refreshCallback();}
rewriteQuery(query){return query;}
notFoundText(){return Common.UIString('No results found');}
detach(){}};;QuickOpen.CommandMenu=class{constructor(){this._commands=[];this._loadCommands();}
static createCommand(category,keys,title,shortcut,executeHandler,availableHandler){var key=keys.replace(/,/g,'\0');return new QuickOpen.CommandMenu.Command(category,title,key,shortcut,executeHandler,availableHandler);}
static createSettingCommand(extension,title,value){var category=extension.descriptor()['category']||'';var tags=extension.descriptor()['tags']||'';var setting=Common.settings.moduleSetting(extension.descriptor()['settingName']);return QuickOpen.CommandMenu.createCommand(category,tags,title,'',setting.set.bind(setting,value),availableHandler);function availableHandler(){return setting.get()!==value;}}
static createActionCommand(action){var shortcut=UI.shortcutRegistry.shortcutTitleForAction(action.id())||'';return QuickOpen.CommandMenu.createCommand(action.category(),action.tags(),action.title(),shortcut,action.execute.bind(action));}
static createRevealPanelCommand(extension){var panelId=extension.descriptor()['id'];var executeHandler=UI.viewManager.showView.bind(UI.viewManager,panelId);var tags=extension.descriptor()['tags']||'';return QuickOpen.CommandMenu.createCommand(Common.UIString('Panel'),tags,Common.UIString('Show %s',extension.title()),'',executeHandler);}
static createRevealDrawerCommand(extension){var drawerId=extension.descriptor()['id'];var executeHandler=UI.viewManager.showView.bind(UI.viewManager,drawerId);var tags=extension.descriptor()['tags']||'';return QuickOpen.CommandMenu.createCommand(Common.UIString('Drawer'),tags,Common.UIString('Show %s',extension.title()),'',executeHandler);}
_loadCommands(){var viewExtensions=self.runtime.extensions('view');for(var extension of viewExtensions){if(extension.descriptor()['location']==='panel')
this._commands.push(QuickOpen.CommandMenu.createRevealPanelCommand(extension));else if(extension.descriptor()['location']==='drawer-view')
this._commands.push(QuickOpen.CommandMenu.createRevealDrawerCommand(extension));}
var settingExtensions=self.runtime.extensions('setting');for(var extension of settingExtensions){var options=extension.descriptor()['options'];if(!options||!extension.descriptor()['category'])
continue;for(var pair of options)
this._commands.push(QuickOpen.CommandMenu.createSettingCommand(extension,pair['title'],pair['value']));}}
commands(){return this._commands;}};QuickOpen.CommandMenuProvider=class extends QuickOpen.FilteredListWidget.Provider{constructor(){super();this._commands=[];this._appendAvailableCommands();}
_appendAvailableCommands(){var allCommands=QuickOpen.commandMenu.commands();var actions=UI.actionRegistry.availableActions();for(var action of actions){if(action.category())
this._commands.push(QuickOpen.CommandMenu.createActionCommand(action));}
for(var command of allCommands){if(command.available())
this._commands.push(command);}
this._commands=this._commands.sort(commandComparator);function commandComparator(left,right){var cats=left.category().compareTo(right.category());return cats?cats:left.title().compareTo(right.title());}}
itemCount(){return this._commands.length;}
itemKeyAt(itemIndex){return this._commands[itemIndex].key();}
itemScoreAt(itemIndex,query){var command=this._commands[itemIndex];var opcodes=Diff.Diff.charDiff(query.toLowerCase(),command.title().toLowerCase());var score=0;for(var i=0;i<opcodes.length;++i){if(opcodes[i][0]===Diff.Diff.Operation.Equal)
score+=opcodes[i][1].length*opcodes[i][1].length;}
if(command.category().startsWith('Panel'))
score+=2;else if(command.category().startsWith('Drawer'))
score+=1;return score;}
renderItem(itemIndex,query,titleElement,subtitleElement){var command=this._commands[itemIndex];titleElement.removeChildren();var tagElement=titleElement.createChild('span','tag');var index=String.hashCode(command.category())%QuickOpen.CommandMenuProvider.MaterialPaletteColors.length;tagElement.style.backgroundColor=QuickOpen.CommandMenuProvider.MaterialPaletteColors[index];tagElement.textContent=command.category();titleElement.createTextChild(command.title());QuickOpen.FilteredListWidget.highlightRanges(titleElement,query,true);subtitleElement.textContent=command.shortcut();}
selectItem(itemIndex,promptValue){if(itemIndex===null)
return;this._commands[itemIndex].execute();Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectCommandFromCommandMenu);}
notFoundText(){return Common.UIString('No commands found');}};QuickOpen.CommandMenuProvider.MaterialPaletteColors=['#F44336','#E91E63','#9C27B0','#673AB7','#3F51B5','#03A9F4','#00BCD4','#009688','#4CAF50','#8BC34A','#CDDC39','#FFC107','#FF9800','#FF5722','#795548','#9E9E9E','#607D8B'];QuickOpen.CommandMenu.Command=class{constructor(category,title,key,shortcut,executeHandler,availableHandler){this._category=category;this._title=title;this._key=category+'\0'+title+'\0'+key;this._shortcut=shortcut;this._executeHandler=executeHandler;this._availableHandler=availableHandler;}
category(){return this._category;}
title(){return this._title;}
key(){return this._key;}
shortcut(){return this._shortcut;}
available(){return this._availableHandler?this._availableHandler():true;}
execute(){this._executeHandler();}};QuickOpen.commandMenu=new QuickOpen.CommandMenu();QuickOpen.CommandMenu.ShowActionDelegate=class{handleAction(context,actionId){new QuickOpen.FilteredListWidget(new QuickOpen.CommandMenuProvider()).showAsDialog();InspectorFrontendHost.bringToFront();return true;}};;Runtime.cachedResources["quick_open/filteredListWidget.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.filtered-list-widget {\n    display: flex;\n    flex-direction: column;\n    flex: auto;\n}\n\n.filtered-list-widget-prompt-element {\n    flex: 0 0 34px;\n    border: 0;\n    margin: 0;\n    padding: 0 6px;\n    z-index: 1;\n    font-size: inherit;\n}\n\n.filtered-list-widget-input {\n    white-space: pre;\n    height: 18px;\n    margin-top: 12px;\n    overflow: hidden;\n    flex: auto;\n}\n\n.filtered-list-widget-progress {\n    flex: none;\n    background: rgba(0, 0, 0, 0.2);\n    height: 2px;\n}\n\n.filtered-list-widget-progress-bar {\n    background-color: #2196F3;\n    height: 2px;\n    width: 100%;\n    transform: scaleX(0);\n    transform-origin: top left;\n    opacity: 1;\n    transition: none;\n}\n\n.filtered-widget-progress-fade {\n    opacity: 0;\n    transition: opacity 500ms;\n}\n\n.filtered-list-widget > div.container {\n    flex: auto;\n    overflow-y: auto;\n    background: #fbfbfb;\n}\n\n.filtered-list-widget-item {\n    padding: 4px 6px;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    color: rgb(95, 95, 95);\n}\n\n.filtered-list-widget-item.selected {\n    background-color: #f0f0f0;\n}\n\n.filtered-list-widget-item span.highlight {\n    color: #222;\n    font-weight: bold;\n}\n\n.filtered-list-widget-item .filtered-list-widget-title {\n    flex: auto;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.filtered-list-widget-item .filtered-list-widget-subtitle {\n    flex: none;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    color: rgb(155, 155, 155);\n    display: flex;\n}\n\n.filtered-list-widget-item .filtered-list-widget-subtitle .first-part {\n    flex-shrink: 1000;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.filtered-list-widget-item.one-row {\n    display: flex;\n}\n\n.filtered-list-widget-item.two-rows {\n    border-bottom: 1px solid rgb(235, 235, 235);\n}\n\n.tag {\n    color: white;\n    padding: 1px 3px;\n    margin-right: 5px;\n    border-radius: 2px;\n    line-height: 18px;\n}\n\n.filtered-list-widget-item .tag .highlight {\n    color: white;\n}\n\n.not-found-text {\n    height: 34px;\n    line-height: 34px;\n    padding-left: 4px;\n    font-style: italic;\n    color: #888;\n    background: #fbfbfb;\n}\n\n/*# sourceURL=quick_open/filteredListWidget.css */";