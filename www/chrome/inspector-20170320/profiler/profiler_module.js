Profiler.ProfileType=class extends Common.Object{constructor(id,name){super();this._id=id;this._name=name;this._profiles=[];this._profileBeingRecorded=null;this._nextProfileUid=1;if(!window.opener)
window.addEventListener('unload',this._clearTempStorage.bind(this),false);}
typeName(){return'';}
nextProfileUid(){return this._nextProfileUid;}
incrementProfileUid(){return this._nextProfileUid++;}
hasTemporaryView(){return false;}
fileExtension(){return null;}
get buttonTooltip(){return'';}
get id(){return this._id;}
get treeItemTitle(){return this._name;}
get name(){return this._name;}
buttonClicked(){return false;}
get description(){return'';}
isInstantProfile(){return false;}
isEnabled(){return true;}
getProfiles(){function isFinished(profile){return this._profileBeingRecorded!==profile;}
return this._profiles.filter(isFinished.bind(this));}
decorationElement(){return null;}
getProfile(uid){for(var i=0;i<this._profiles.length;++i){if(this._profiles[i].uid===uid)
return this._profiles[i];}
return null;}
loadFromFile(file){var name=file.name;var fileExtension=this.fileExtension();if(fileExtension&&name.endsWith(fileExtension))
name=name.substr(0,name.length-fileExtension.length);var profile=this.createProfileLoadedFromFile(name);profile.setFromFile();this.setProfileBeingRecorded(profile);this.addProfile(profile);profile.loadFromFile(file);}
createProfileLoadedFromFile(title){throw new Error('Needs implemented.');}
addProfile(profile){this._profiles.push(profile);this.dispatchEventToListeners(Profiler.ProfileType.Events.AddProfileHeader,profile);}
removeProfile(profile){var index=this._profiles.indexOf(profile);if(index===-1)
return;this._profiles.splice(index,1);this._disposeProfile(profile);}
_clearTempStorage(){for(var i=0;i<this._profiles.length;++i)
this._profiles[i].removeTempFile();}
profileBeingRecorded(){return this._profileBeingRecorded;}
setProfileBeingRecorded(profile){this._profileBeingRecorded=profile;}
profileBeingRecordedRemoved(){}
reset(target){var profilesLeft=[];for(var profile of this._profiles.slice()){if(!target||profile.target()===target)
this._disposeProfile(profile);else
profilesLeft.push(profile);}
this._profiles=profilesLeft;this._nextProfileUid=1;}
_disposeProfile(profile){this.dispatchEventToListeners(Profiler.ProfileType.Events.RemoveProfileHeader,profile);profile.dispose();if(this._profileBeingRecorded===profile){this.profileBeingRecordedRemoved();this.setProfileBeingRecorded(null);}}};Profiler.ProfileType.Events={AddProfileHeader:Symbol('add-profile-header'),ProfileComplete:Symbol('profile-complete'),RemoveProfileHeader:Symbol('remove-profile-header'),ViewUpdated:Symbol('view-updated')};Profiler.ProfileType.DataDisplayDelegate=function(){};Profiler.ProfileType.DataDisplayDelegate.prototype={showProfile(profile){},showObject(snapshotObjectId,perspectiveName){}};;Profiler.ProfileHeader=class extends Common.Object{constructor(target,profileType,title){super();this._target=target;this._profileType=profileType;this.title=title;this.uid=profileType.incrementProfileUid();this._fromFile=false;}
target(){return this._target;}
profileType(){return this._profileType;}
updateStatus(subtitle,wait){this.dispatchEventToListeners(Profiler.ProfileHeader.Events.UpdateStatus,new Profiler.ProfileHeader.StatusUpdate(subtitle,wait));}
createSidebarTreeElement(dataDisplayDelegate){throw new Error('Needs implemented.');}
createView(dataDisplayDelegate){throw new Error('Not implemented.');}
removeTempFile(){if(this._tempFile)
this._tempFile.remove();}
dispose(){}
canSaveToFile(){return false;}
saveToFile(){throw new Error('Needs implemented');}
loadFromFile(file){throw new Error('Needs implemented');}
fromFile(){return this._fromFile;}
setFromFile(){this._fromFile=true;}};Profiler.ProfileHeader.StatusUpdate=class{constructor(subtitle,wait){this.subtitle=subtitle;this.wait=wait;}};Profiler.ProfileHeader.Events={UpdateStatus:Symbol('UpdateStatus'),ProfileReceived:Symbol('ProfileReceived')};;Profiler.ProfilesPanel=class extends UI.PanelWithSidebar{constructor(name,profileTypes,recordingActionId){super(name);this._profileTypes=profileTypes;this.registerRequiredCSS('ui/panelEnablerView.css');this.registerRequiredCSS('profiler/heapProfiler.css');this.registerRequiredCSS('profiler/profilesPanel.css');this.registerRequiredCSS('object_ui/objectValue.css');var mainContainer=new UI.VBox();this.splitWidget().setMainWidget(mainContainer);this.profilesItemTreeElement=new Profiler.ProfilesSidebarTreeElement(this);this._sidebarTree=new UI.TreeOutlineInShadow();this._sidebarTree.registerRequiredCSS('profiler/profilesSidebarTree.css');this._sidebarTree.element.classList.add('profiles-sidebar-tree-box');this.panelSidebarElement().appendChild(this._sidebarTree.element);this._sidebarTree.appendChild(this.profilesItemTreeElement);this.profileViews=createElement('div');this.profileViews.id='profile-views';this.profileViews.classList.add('vbox');mainContainer.element.appendChild(this.profileViews);this._toolbarElement=createElementWithClass('div','profiles-toolbar');mainContainer.element.insertBefore(this._toolbarElement,mainContainer.element.firstChild);this.panelSidebarElement().classList.add('profiles-tree-sidebar');var toolbarContainerLeft=createElementWithClass('div','profiles-toolbar');this.panelSidebarElement().insertBefore(toolbarContainerLeft,this.panelSidebarElement().firstChild);var toolbar=new UI.Toolbar('',toolbarContainerLeft);this._toggleRecordAction=(UI.actionRegistry.action(recordingActionId));this._toggleRecordButton=UI.Toolbar.createActionButton(this._toggleRecordAction);toolbar.appendToolbarItem(this._toggleRecordButton);this.clearResultsButton=new UI.ToolbarButton(Common.UIString('Clear all profiles'),'largeicon-clear');this.clearResultsButton.addEventListener(UI.ToolbarButton.Events.Click,this._reset,this);toolbar.appendToolbarItem(this.clearResultsButton);toolbar.appendSeparator();toolbar.appendToolbarItem(UI.Toolbar.createActionButtonForId('components.collect-garbage'));this._profileViewToolbar=new UI.Toolbar('',this._toolbarElement);this._profileGroups={};this._launcherView=new Profiler.ProfileLauncherView(this);this._launcherView.addEventListener(Profiler.ProfileLauncherView.Events.ProfileTypeSelected,this._onProfileTypeSelected,this);this._profileToView=[];this._typeIdToSidebarSection={};var types=this._profileTypes;for(var i=0;i<types.length;i++)
this._registerProfileType(types[i]);this._launcherView.restoreSelectedProfileType();this.profilesItemTreeElement.select();this._showLauncherView();this._createFileSelectorElement();this.element.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);this.contentElement.addEventListener('keydown',this._onKeyDown.bind(this),false);SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged,this._onSuspendStateChanged,this);}
_onKeyDown(event){var handled=false;if(event.key==='ArrowDown'&&!event.altKey)
handled=this._sidebarTree.selectNext();else if(event.key==='ArrowUp'&&!event.altKey)
handled=this._sidebarTree.selectPrevious();if(handled)
event.consume(true);}
searchableView(){return this.visibleView&&this.visibleView.searchableView?this.visibleView.searchableView():null;}
_createFileSelectorElement(){if(this._fileSelectorElement)
this.element.removeChild(this._fileSelectorElement);this._fileSelectorElement=UI.createFileSelectorElement(this._loadFromFile.bind(this));Profiler.ProfilesPanel._fileSelectorElement=this._fileSelectorElement;this.element.appendChild(this._fileSelectorElement);}
_findProfileTypeByExtension(fileName){var types=this._profileTypes;for(var i=0;i<types.length;i++){var type=types[i];var extension=type.fileExtension();if(!extension)
continue;if(fileName.endsWith(type.fileExtension()))
return type;}
return null;}
_loadFromFile(file){this._createFileSelectorElement();var profileType=this._findProfileTypeByExtension(file.name);if(!profileType){var extensions=[];var types=this._profileTypes;for(var i=0;i<types.length;i++){var extension=types[i].fileExtension();if(!extension||extensions.indexOf(extension)!==-1)
continue;extensions.push(extension);}
Common.console.error(Common.UIString('Can\'t load file. Only files with extensions \'%s\' can be loaded.',extensions.join('\', \'')));return;}
if(!!profileType.profileBeingRecorded()){Common.console.error(Common.UIString('Can\'t load profile while another profile is recording.'));return;}
profileType.loadFromFile(file);}
toggleRecord(){if(!this._toggleRecordAction.enabled())
return true;var type=this._selectedProfileType;var isProfiling=type.buttonClicked();this._updateToggleRecordAction(isProfiling);if(isProfiling){this._launcherView.profileStarted();if(type.hasTemporaryView())
this.showProfile(type.profileBeingRecorded());}else{this._launcherView.profileFinished();}
return true;}
_onSuspendStateChanged(){this._updateToggleRecordAction(this._toggleRecordAction.toggled());}
_updateToggleRecordAction(toggled){var enable=toggled||!SDK.targetManager.allTargetsSuspended();this._toggleRecordAction.setEnabled(enable);this._toggleRecordAction.setToggled(toggled);if(enable)
this._toggleRecordButton.setTitle(this._selectedProfileType?this._selectedProfileType.buttonTooltip:'');else
this._toggleRecordButton.setTitle(UI.anotherProfilerActiveLabel());if(this._selectedProfileType)
this._launcherView.updateProfileType(this._selectedProfileType,enable);}
_profileBeingRecordedRemoved(){this._updateToggleRecordAction(false);this._launcherView.profileFinished();}
_onProfileTypeSelected(event){this._selectedProfileType=(event.data);this._updateProfileTypeSpecificUI();}
_updateProfileTypeSpecificUI(){this._updateToggleRecordAction(this._toggleRecordAction.toggled());}
_reset(){this._profileTypes.forEach(type=>type.reset());delete this.visibleView;this._profileGroups={};this._updateToggleRecordAction(false);this._launcherView.profileFinished();this._sidebarTree.element.classList.remove('some-expandable');this._launcherView.detach();this.profileViews.removeChildren();this._profileViewToolbar.removeToolbarItems();this.clearResultsButton.element.classList.remove('hidden');this.profilesItemTreeElement.select();this._showLauncherView();}
_showLauncherView(){this.closeVisibleView();this._profileViewToolbar.removeToolbarItems();this._launcherView.show(this.profileViews);this.visibleView=this._launcherView;this._toolbarElement.classList.add('hidden');}
_registerProfileType(profileType){this._launcherView.addProfileType(profileType);var profileTypeSection=new Profiler.ProfileTypeSidebarSection(this,profileType);this._typeIdToSidebarSection[profileType.id]=profileTypeSection;this._sidebarTree.appendChild(profileTypeSection);profileTypeSection.childrenListElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);function onAddProfileHeader(event){this._addProfileHeader((event.data));}
function onRemoveProfileHeader(event){this._removeProfileHeader((event.data));}
function profileComplete(event){this.showProfile((event.data));}
profileType.addEventListener(Profiler.ProfileType.Events.ViewUpdated,this._updateProfileTypeSpecificUI,this);profileType.addEventListener(Profiler.ProfileType.Events.AddProfileHeader,onAddProfileHeader,this);profileType.addEventListener(Profiler.ProfileType.Events.RemoveProfileHeader,onRemoveProfileHeader,this);profileType.addEventListener(Profiler.ProfileType.Events.ProfileComplete,profileComplete,this);var profiles=profileType.getProfiles();for(var i=0;i<profiles.length;i++)
this._addProfileHeader(profiles[i]);}
_handleContextMenuEvent(event){var contextMenu=new UI.ContextMenu(event);if(this.visibleView instanceof Profiler.HeapSnapshotView)
this.visibleView.populateContextMenu(contextMenu,event);if(this.panelSidebarElement().isSelfOrAncestor(event.srcElement)){contextMenu.appendItem(Common.UIString('Load\u2026'),this._fileSelectorElement.click.bind(this._fileSelectorElement));}
contextMenu.show();}
showLoadFromFileDialog(){this._fileSelectorElement.click();}
_addProfileHeader(profile){var profileType=profile.profileType();var typeId=profileType.id;this._typeIdToSidebarSection[typeId].addProfileHeader(profile);if(!this.visibleView||this.visibleView===this._launcherView)
this.showProfile(profile);}
_removeProfileHeader(profile){if(profile.profileType().profileBeingRecorded()===profile)
this._profileBeingRecordedRemoved();var i=this._indexOfViewForProfile(profile);if(i!==-1)
this._profileToView.splice(i,1);var profileType=profile.profileType();var typeId=profileType.id;var sectionIsEmpty=this._typeIdToSidebarSection[typeId].removeProfileHeader(profile);if(sectionIsEmpty){this.profilesItemTreeElement.select();this._showLauncherView();}}
showProfile(profile){if(!profile||(profile.profileType().profileBeingRecorded()===profile)&&!profile.profileType().hasTemporaryView())
return null;var view=this.viewForProfile(profile);if(view===this.visibleView)
return view;this.closeVisibleView();view.show(this.profileViews);view.focus();this._toolbarElement.classList.remove('hidden');this.visibleView=view;var profileTypeSection=this._typeIdToSidebarSection[profile.profileType().id];var sidebarElement=profileTypeSection.sidebarElementForProfile(profile);sidebarElement.revealAndSelect();this._profileViewToolbar.removeToolbarItems();var toolbarItems=view.syncToolbarItems();for(var i=0;i<toolbarItems.length;++i)
this._profileViewToolbar.appendToolbarItem(toolbarItems[i]);return view;}
showObject(snapshotObjectId,perspectiveName){}
viewForProfile(profile){var index=this._indexOfViewForProfile(profile);if(index!==-1)
return this._profileToView[index].view;var view=profile.createView(this);view.element.classList.add('profile-view');this._profileToView.push({profile:profile,view:view});return view;}
_indexOfViewForProfile(profile){for(var i=0;i<this._profileToView.length;i++){if(this._profileToView[i].profile===profile)
return i;}
return-1;}
closeVisibleView(){if(this.visibleView)
this.visibleView.detach();delete this.visibleView;}
focus(){this._sidebarTree.focus();}};Profiler.ProfileTypeSidebarSection=class extends UI.TreeElement{constructor(dataDisplayDelegate,profileType){super(profileType.treeItemTitle.escapeHTML(),true);this.selectable=false;this._dataDisplayDelegate=dataDisplayDelegate;this._profileTreeElements=[];this._profileGroups={};this.expand();this.hidden=true;this.setCollapsible(false);}
addProfileHeader(profile){this.hidden=false;var profileType=profile.profileType();var sidebarParent=this;var profileTreeElement=profile.createSidebarTreeElement(this._dataDisplayDelegate);this._profileTreeElements.push(profileTreeElement);if(!profile.fromFile()&&profileType.profileBeingRecorded()!==profile){var profileTitle=profile.title;var group=this._profileGroups[profileTitle];if(!group){group=new Profiler.ProfileTypeSidebarSection.ProfileGroup();this._profileGroups[profileTitle]=group;}
group.profileSidebarTreeElements.push(profileTreeElement);var groupSize=group.profileSidebarTreeElements.length;if(groupSize===2){group.sidebarTreeElement=new Profiler.ProfileGroupSidebarTreeElement(this._dataDisplayDelegate,profile.title);var firstProfileTreeElement=group.profileSidebarTreeElements[0];var index=this.children().indexOf(firstProfileTreeElement);this.insertChild(group.sidebarTreeElement,index);var selected=firstProfileTreeElement.selected;this.removeChild(firstProfileTreeElement);group.sidebarTreeElement.appendChild(firstProfileTreeElement);if(selected)
firstProfileTreeElement.revealAndSelect();firstProfileTreeElement.setSmall(true);firstProfileTreeElement.setMainTitle(Common.UIString('Run %d',1));this.treeOutline.element.classList.add('some-expandable');}
if(groupSize>=2){sidebarParent=group.sidebarTreeElement;profileTreeElement.setSmall(true);profileTreeElement.setMainTitle(Common.UIString('Run %d',groupSize));}}
sidebarParent.appendChild(profileTreeElement);}
removeProfileHeader(profile){var index=this._sidebarElementIndex(profile);if(index===-1)
return false;var profileTreeElement=this._profileTreeElements[index];this._profileTreeElements.splice(index,1);var sidebarParent=this;var group=this._profileGroups[profile.title];if(group){var groupElements=group.profileSidebarTreeElements;groupElements.splice(groupElements.indexOf(profileTreeElement),1);if(groupElements.length===1){var pos=sidebarParent.children().indexOf((group.sidebarTreeElement));group.sidebarTreeElement.removeChild(groupElements[0]);this.insertChild(groupElements[0],pos);groupElements[0].setSmall(false);groupElements[0].setMainTitle(profile.title);this.removeChild(group.sidebarTreeElement);}
if(groupElements.length!==0)
sidebarParent=group.sidebarTreeElement;}
sidebarParent.removeChild(profileTreeElement);profileTreeElement.dispose();if(this.childCount())
return false;this.hidden=true;return true;}
sidebarElementForProfile(profile){var index=this._sidebarElementIndex(profile);return index===-1?null:this._profileTreeElements[index];}
_sidebarElementIndex(profile){var elements=this._profileTreeElements;for(var i=0;i<elements.length;i++){if(elements[i].profile===profile)
return i;}
return-1;}
onattach(){this.listItemElement.classList.add('profiles-tree-section');}};Profiler.ProfileTypeSidebarSection.ProfileGroup=class{constructor(){this.profileSidebarTreeElements=[];this.sidebarTreeElement=null;}};Profiler.ProfileSidebarTreeElement=class extends UI.TreeElement{constructor(dataDisplayDelegate,profile,className){super('',false);this._iconElement=createElementWithClass('div','icon');this._titlesElement=createElementWithClass('div','titles no-subtitle');this._titleContainer=this._titlesElement.createChild('span','title-container');this._titleElement=this._titleContainer.createChild('span','title');this._subtitleElement=this._titlesElement.createChild('span','subtitle');this._titleElement.textContent=profile.title;this._className=className;this._small=false;this._dataDisplayDelegate=dataDisplayDelegate;this.profile=profile;profile.addEventListener(Profiler.ProfileHeader.Events.UpdateStatus,this._updateStatus,this);if(profile.canSaveToFile())
this._createSaveLink();else
profile.addEventListener(Profiler.ProfileHeader.Events.ProfileReceived,this._onProfileReceived,this);}
_createSaveLink(){this._saveLinkElement=this._titleContainer.createChild('span','save-link');this._saveLinkElement.textContent=Common.UIString('Save');this._saveLinkElement.addEventListener('click',this._saveProfile.bind(this),false);}
_onProfileReceived(event){this._createSaveLink();}
_updateStatus(event){var statusUpdate=event.data;if(statusUpdate.subtitle!==null){this._subtitleElement.textContent=statusUpdate.subtitle||'';this._titlesElement.classList.toggle('no-subtitle',!statusUpdate.subtitle);}
if(typeof statusUpdate.wait==='boolean'&&this.listItemElement)
this.listItemElement.classList.toggle('wait',statusUpdate.wait);}
dispose(){this.profile.removeEventListener(Profiler.ProfileHeader.Events.UpdateStatus,this._updateStatus,this);this.profile.removeEventListener(Profiler.ProfileHeader.Events.ProfileReceived,this._onProfileReceived,this);}
onselect(){this._dataDisplayDelegate.showProfile(this.profile);return true;}
ondelete(){this.profile.profileType().removeProfile(this.profile);return true;}
onattach(){if(this._className)
this.listItemElement.classList.add(this._className);if(this._small)
this.listItemElement.classList.add('small');this.listItemElement.appendChildren(this._iconElement,this._titlesElement);this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),true);}
_handleContextMenuEvent(event){var profile=this.profile;var contextMenu=new UI.ContextMenu(event);contextMenu.appendItem(Common.UIString('Load\u2026'),Profiler.ProfilesPanel._fileSelectorElement.click.bind(Profiler.ProfilesPanel._fileSelectorElement));if(profile.canSaveToFile())
contextMenu.appendItem(Common.UIString('Save\u2026'),profile.saveToFile.bind(profile));contextMenu.appendItem(Common.UIString('Delete'),this.ondelete.bind(this));contextMenu.show();}
_saveProfile(event){this.profile.saveToFile();}
setSmall(small){this._small=small;if(this.listItemElement)
this.listItemElement.classList.toggle('small',this._small);}
setMainTitle(title){this._titleElement.textContent=title;}};Profiler.ProfileGroupSidebarTreeElement=class extends UI.TreeElement{constructor(dataDisplayDelegate,title){super('',true);this.selectable=false;this._dataDisplayDelegate=dataDisplayDelegate;this._title=title;this.expand();this.toggleOnClick=true;}
onselect(){var hasChildren=this.childCount()>0;if(hasChildren)
this._dataDisplayDelegate.showProfile(this.lastChild().profile);return hasChildren;}
onattach(){this.listItemElement.classList.add('profile-group-sidebar-tree-item');this.listItemElement.createChild('div','icon');this.listItemElement.createChild('div','titles no-subtitle').createChild('span','title-container').createChild('span','title').textContent=this._title;}};Profiler.ProfilesSidebarTreeElement=class extends UI.TreeElement{constructor(panel){super('',false);this.selectable=true;this._panel=panel;}
onselect(){this._panel._showLauncherView();return true;}
onattach(){this.listItemElement.classList.add('profile-launcher-view-tree-item');this.listItemElement.createChild('div','icon');this.listItemElement.createChild('div','titles no-subtitle').createChild('span','title-container').createChild('span','title').textContent=Common.UIString('Profiles');}};Profiler.JSProfilerPanel=class extends Profiler.ProfilesPanel{constructor(){var registry=Profiler.ProfileTypeRegistry.instance;super('js_profiler',[registry.cpuProfileType],'profiler.js-toggle-recording');}
wasShown(){UI.context.setFlavor(Profiler.JSProfilerPanel,this);}
willHide(){UI.context.setFlavor(Profiler.JSProfilerPanel,null);}
handleAction(context,actionId){var panel=UI.context.flavor(Profiler.JSProfilerPanel);console.assert(panel&&panel instanceof Profiler.JSProfilerPanel);panel.toggleRecord();return true;}};;Profiler.ProfileView=class extends UI.SimpleView{constructor(){super(Common.UIString('Profile'));this._searchableView=new UI.SearchableView(this);this._searchableView.setPlaceholder(Common.UIString('Find by cost (>50ms), name or file'));this._searchableView.show(this.element);var columns=([]);columns.push({id:'self',title:this.columnHeader('self'),width:'120px',fixedWidth:true,sortable:true,sort:DataGrid.DataGrid.Order.Descending});columns.push({id:'total',title:this.columnHeader('total'),width:'120px',fixedWidth:true,sortable:true});columns.push({id:'function',title:Common.UIString('Function'),disclosure:true,sortable:true});this.dataGrid=new DataGrid.DataGrid(columns);this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged,this._sortProfile,this);this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode,this._nodeSelected.bind(this,true));this.dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode,this._nodeSelected.bind(this,false));this.viewSelectComboBox=new UI.ToolbarComboBox(this._changeView.bind(this));this.focusButton=new UI.ToolbarButton(Common.UIString('Focus selected function'),'largeicon-visibility');this.focusButton.setEnabled(false);this.focusButton.addEventListener(UI.ToolbarButton.Events.Click,this._focusClicked,this);this.excludeButton=new UI.ToolbarButton(Common.UIString('Exclude selected function'),'largeicon-delete');this.excludeButton.setEnabled(false);this.excludeButton.addEventListener(UI.ToolbarButton.Events.Click,this._excludeClicked,this);this.resetButton=new UI.ToolbarButton(Common.UIString('Restore all functions'),'largeicon-refresh');this.resetButton.setEnabled(false);this.resetButton.addEventListener(UI.ToolbarButton.Events.Click,this._resetClicked,this);this._linkifier=new Components.Linkifier(Profiler.ProfileView._maxLinkLength);}
static buildPopoverTable(entryInfo){var table=createElement('table');for(var entry of entryInfo){var row=table.createChild('tr');row.createChild('td').textContent=entry.title;row.createChild('td').textContent=entry.value;}
return table;}
initialize(nodeFormatter,viewTypes){this._nodeFormatter=nodeFormatter;this._viewType=Common.settings.createSetting('profileView',Profiler.ProfileView.ViewTypes.Heavy);viewTypes=viewTypes||[Profiler.ProfileView.ViewTypes.Flame,Profiler.ProfileView.ViewTypes.Heavy,Profiler.ProfileView.ViewTypes.Tree];var optionNames=new Map([[Profiler.ProfileView.ViewTypes.Flame,Common.UIString('Chart')],[Profiler.ProfileView.ViewTypes.Heavy,Common.UIString('Heavy (Bottom Up)')],[Profiler.ProfileView.ViewTypes.Tree,Common.UIString('Tree (Top Down)')],]);var options=new Map(viewTypes.map(type=>[type,this.viewSelectComboBox.createOption(optionNames.get(type),'',type)]));var optionName=this._viewType.get()||viewTypes[0];var option=options.get(optionName)||options.get(viewTypes[0]);this.viewSelectComboBox.select(option);this._changeView();if(this._flameChart)
this._flameChart.update();}
focus(){if(this._flameChart)
this._flameChart.focus();else
super.focus();}
columnHeader(columnId){throw'Not implemented';}
target(){return this._profileHeader.target();}
selectRange(timeLeft,timeRight){if(!this._flameChart)
return;this._flameChart.selectRange(timeLeft,timeRight);}
syncToolbarItems(){return[this.viewSelectComboBox,this.focusButton,this.excludeButton,this.resetButton];}
_getBottomUpProfileDataGridTree(){if(!this._bottomUpProfileDataGridTree){this._bottomUpProfileDataGridTree=new Profiler.BottomUpProfileDataGridTree(this._nodeFormatter,this._searchableView,this.profile.root,this.adjustedTotal);}
return this._bottomUpProfileDataGridTree;}
_getTopDownProfileDataGridTree(){if(!this._topDownProfileDataGridTree){this._topDownProfileDataGridTree=new Profiler.TopDownProfileDataGridTree(this._nodeFormatter,this._searchableView,this.profile.root,this.adjustedTotal);}
return this._topDownProfileDataGridTree;}
willHide(){this._currentSearchResultIndex=-1;}
refresh(){var selectedProfileNode=this.dataGrid.selectedNode?this.dataGrid.selectedNode.profileNode:null;this.dataGrid.rootNode().removeChildren();var children=this.profileDataGridTree.children;var count=children.length;for(var index=0;index<count;++index)
this.dataGrid.rootNode().appendChild(children[index]);if(selectedProfileNode)
selectedProfileNode.selected=true;}
refreshVisibleData(){var child=this.dataGrid.rootNode().children[0];while(child){child.refresh();child=child.traverseNextNode(false,null,true);}}
searchableView(){return this._searchableView;}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return false;}
searchCanceled(){this._searchableElement.searchCanceled();}
performSearch(searchConfig,shouldJump,jumpBackwards){this._searchableElement.performSearch(searchConfig,shouldJump,jumpBackwards);}
jumpToNextSearchResult(){this._searchableElement.jumpToNextSearchResult();}
jumpToPreviousSearchResult(){this._searchableElement.jumpToPreviousSearchResult();}
linkifier(){return this._linkifier;}
createFlameChartDataProvider(){throw'Not implemented';}
_ensureFlameChartCreated(){if(this._flameChart)
return;this._dataProvider=this.createFlameChartDataProvider();this._flameChart=new Profiler.CPUProfileFlameChart(this._searchableView,this._dataProvider);this._flameChart.addEventListener(PerfUI.FlameChart.Events.EntrySelected,this._onEntrySelected.bind(this));}
_onEntrySelected(event){var entryIndex=event.data;var node=this._dataProvider._entryNodes[entryIndex];var debuggerModel=this._profileHeader._debuggerModel;if(!node||!node.scriptId||!debuggerModel)
return;var script=debuggerModel.scriptForId(node.scriptId);if(!script)
return;var location=(debuggerModel.createRawLocation(script,node.lineNumber,node.columnNumber));Common.Revealer.reveal(Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location));}
_changeView(){if(!this.profile)
return;this._searchableView.closeSearch();if(this._visibleView)
this._visibleView.detach();this._viewType.set(this.viewSelectComboBox.selectedOption().value);switch(this._viewType.get()){case Profiler.ProfileView.ViewTypes.Flame:this._ensureFlameChartCreated();this._visibleView=this._flameChart;this._searchableElement=this._flameChart;break;case Profiler.ProfileView.ViewTypes.Tree:this.profileDataGridTree=this._getTopDownProfileDataGridTree();this._sortProfile();this._visibleView=this.dataGrid.asWidget();this._searchableElement=this.profileDataGridTree;break;case Profiler.ProfileView.ViewTypes.Heavy:this.profileDataGridTree=this._getBottomUpProfileDataGridTree();this._sortProfile();this._visibleView=this.dataGrid.asWidget();this._searchableElement=this.profileDataGridTree;break;}
var isFlame=this._viewType.get()===Profiler.ProfileView.ViewTypes.Flame;this.focusButton.setVisible(!isFlame);this.excludeButton.setVisible(!isFlame);this.resetButton.setVisible(!isFlame);this._visibleView.show(this._searchableView.element);}
_nodeSelected(selected){this.focusButton.setEnabled(selected);this.excludeButton.setEnabled(selected);}
_focusClicked(event){if(!this.dataGrid.selectedNode)
return;this.resetButton.setEnabled(true);this.profileDataGridTree.focus(this.dataGrid.selectedNode);this.refresh();this.refreshVisibleData();Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeFocused);}
_excludeClicked(event){var selectedNode=this.dataGrid.selectedNode;if(!selectedNode)
return;selectedNode.deselect();this.resetButton.setEnabled(true);this.profileDataGridTree.exclude(selectedNode);this.refresh();this.refreshVisibleData();Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeExcluded);}
_resetClicked(event){this.resetButton.setEnabled(false);this.profileDataGridTree.restore();this._linkifier.reset();this.refresh();this.refreshVisibleData();}
_sortProfile(){var sortAscending=this.dataGrid.isSortOrderAscending();var sortColumnId=this.dataGrid.sortColumnId();var sortProperty=sortColumnId==='function'?'functionName':sortColumnId||'';this.profileDataGridTree.sort(Profiler.ProfileDataGridTree.propertyComparator(sortProperty,sortAscending));this.refresh();}};Profiler.ProfileView._maxLinkLength=30;Profiler.ProfileView.ViewTypes={Flame:'Flame',Tree:'Tree',Heavy:'Heavy'};Profiler.WritableProfileHeader=class extends Profiler.ProfileHeader{constructor(target,type,title){super(target,type,title||Common.UIString('Profile %d',type.nextProfileUid()));this._debuggerModel=target&&target.model(SDK.DebuggerModel);this._tempFile=null;}
onTransferStarted(){this._jsonifiedProfile='';this.updateStatus(Common.UIString('Loading\u2026 %s',Number.bytesToString(this._jsonifiedProfile.length)),true);}
onChunkTransferred(reader){this.updateStatus(Common.UIString('Loading\u2026 %d%%',Number.bytesToString(this._jsonifiedProfile.length)));}
onTransferFinished(){this.updateStatus(Common.UIString('Parsing\u2026'),true);this._profile=JSON.parse(this._jsonifiedProfile);this._jsonifiedProfile=null;this.updateStatus(Common.UIString('Loaded'),false);if(this.profileType().profileBeingRecorded()===this)
this.profileType().setProfileBeingRecorded(null);}
onError(reader,e){var subtitle;switch(e.target.error.code){case e.target.error.NOT_FOUND_ERR:subtitle=Common.UIString('\'%s\' not found.',reader.fileName());break;case e.target.error.NOT_READABLE_ERR:subtitle=Common.UIString('\'%s\' is not readable',reader.fileName());break;case e.target.error.ABORT_ERR:return;default:subtitle=Common.UIString('\'%s\' error %d',reader.fileName(),e.target.error.code);}
this.updateStatus(subtitle);}
write(text){this._jsonifiedProfile+=text;}
close(){}
dispose(){this.removeTempFile();}
createSidebarTreeElement(panel){return new Profiler.ProfileSidebarTreeElement(panel,this,'profile-sidebar-tree-item');}
canSaveToFile(){return!this.fromFile()&&this._protocolProfile;}
saveToFile(){var fileOutputStream=new Bindings.FileOutputStream();function onOpenForSave(accepted){if(!accepted)
return;function didRead(data){if(data)
fileOutputStream.write(data,fileOutputStream.close.bind(fileOutputStream));else
fileOutputStream.close();}
if(this._failedToCreateTempFile){Common.console.error('Failed to open temp file with heap snapshot');fileOutputStream.close();}else if(this._tempFile){this._tempFile.read(didRead);}else{this._onTempFileReady=onOpenForSave.bind(this,accepted);}}
this._fileName=this._fileName||`${this.profileType().typeName()}-${new Date().toISO8601Compact()}${this.profileType().fileExtension()}`;fileOutputStream.open(this._fileName,onOpenForSave.bind(this));}
loadFromFile(file){this.updateStatus(Common.UIString('Loading\u2026'),true);var fileReader=new Bindings.ChunkedFileReader(file,10000000,this);fileReader.start(this);}
setProtocolProfile(profile){this._protocolProfile=profile;this._saveProfileDataToTempFile(profile);if(this.canSaveToFile())
this.dispatchEventToListeners(Profiler.ProfileHeader.Events.ProfileReceived);}
_saveProfileDataToTempFile(data){var serializedData=JSON.stringify(data);function didCreateTempFile(tempFile){this._writeToTempFile(tempFile,serializedData);}
Bindings.TempFile.create('cpu-profiler',String(this.uid)).then(didCreateTempFile.bind(this));}
_writeToTempFile(tempFile,serializedData){this._tempFile=tempFile;if(!tempFile){this._failedToCreateTempFile=true;this._notifyTempFileReady();return;}
function didWriteToTempFile(fileSize){if(!fileSize)
this._failedToCreateTempFile=true;tempFile.finishWriting();this._notifyTempFileReady();}
tempFile.write([serializedData],didWriteToTempFile.bind(this));}
_notifyTempFileReady(){if(this._onTempFileReady){this._onTempFileReady();this._onTempFileReady=null;}}};;Profiler.ProfileDataGridNode=class extends DataGrid.DataGridNode{constructor(profileNode,owningTree,hasChildren){super(null,hasChildren);this.profileNode=profileNode;this.tree=owningTree;this.childrenByCallUID=new Map();this.lastComparator=null;this.callUID=profileNode.callUID;this.self=profileNode.self;this.total=profileNode.total;this.functionName=UI.beautifyFunctionName(profileNode.functionName);this._deoptReason=profileNode.deoptReason||'';this.url=profileNode.url;}
static sort(gridNodeGroups,comparator,force){for(var gridNodeGroupIndex=0;gridNodeGroupIndex<gridNodeGroups.length;++gridNodeGroupIndex){var gridNodes=gridNodeGroups[gridNodeGroupIndex];var count=gridNodes.length;for(var index=0;index<count;++index){var gridNode=gridNodes[index];if(!force&&(!gridNode.expanded||gridNode.lastComparator===comparator)){if(gridNode.children.length)
gridNode.shouldRefreshChildren=true;continue;}
gridNode.lastComparator=comparator;var children=gridNode.children;var childCount=children.length;if(childCount){children.sort(comparator);for(var childIndex=0;childIndex<childCount;++childIndex)
children[childIndex].recalculateSiblings(childIndex);gridNodeGroups.push(children);}}}}
static merge(container,child,shouldAbsorb){container.self+=child.self;if(!shouldAbsorb)
container.total+=child.total;var children=container.children.slice();container.removeChildren();var count=children.length;for(var index=0;index<count;++index){if(!shouldAbsorb||children[index]!==child)
container.appendChild(children[index]);}
children=child.children.slice();count=children.length;for(var index=0;index<count;++index){var orphanedChild=children[index];var existingChild=container.childrenByCallUID.get(orphanedChild.callUID);if(existingChild)
existingChild.merge((orphanedChild),false);else
container.appendChild(orphanedChild);}}
static populate(container){if(container._populated)
return;container._populated=true;container.populateChildren();var currentComparator=container.tree.lastComparator;if(currentComparator)
container.sort(currentComparator,true);}
createCell(columnId){var cell;switch(columnId){case'self':cell=this._createValueCell(this.self,this.selfPercent);cell.classList.toggle('highlight',this._searchMatchedSelfColumn);break;case'total':cell=this._createValueCell(this.total,this.totalPercent);cell.classList.toggle('highlight',this._searchMatchedTotalColumn);break;case'function':cell=this.createTD(columnId);cell.classList.toggle('highlight',this._searchMatchedFunctionColumn);if(this._deoptReason){cell.classList.add('not-optimized');var warningIcon=UI.Icon.create('smallicon-warning','profile-warn-marker');warningIcon.title=Common.UIString('Not optimized: %s',this._deoptReason);cell.appendChild(warningIcon);}
cell.createTextChild(this.functionName);if(this.profileNode.scriptId==='0')
break;var urlElement=this.tree._formatter.linkifyNode(this);if(!urlElement)
break;urlElement.style.maxWidth='75%';cell.appendChild(urlElement);break;default:cell=super.createCell(columnId);break;}
return cell;}
_createValueCell(value,percent){var cell=createElementWithClass('td','numeric-column');var div=cell.createChild('div','profile-multiple-values');div.createChild('span').textContent=this.tree._formatter.formatValue(value,this);div.createChild('span','percent-column').textContent=this.tree._formatter.formatPercent(percent,this);return cell;}
sort(comparator,force){return Profiler.ProfileDataGridNode.sort([[this]],comparator,force);}
insertChild(profileDataGridNode,index){super.insertChild(profileDataGridNode,index);this.childrenByCallUID.set(profileDataGridNode.callUID,(profileDataGridNode));}
removeChild(profileDataGridNode){super.removeChild(profileDataGridNode);this.childrenByCallUID.delete(((profileDataGridNode)).callUID);}
removeChildren(){super.removeChildren();this.childrenByCallUID.clear();}
findChild(node){if(!node)
return null;return this.childrenByCallUID.get(node.callUID);}
get selfPercent(){return this.self/this.tree.total*100.0;}
get totalPercent(){return this.total/this.tree.total*100.0;}
populate(){Profiler.ProfileDataGridNode.populate(this);}
populateChildren(){}
save(){if(this._savedChildren)
return;this._savedSelf=this.self;this._savedTotal=this.total;this._savedChildren=this.children.slice();}
restore(){if(!this._savedChildren)
return;this.self=this._savedSelf;this.total=this._savedTotal;this.removeChildren();var children=this._savedChildren;var count=children.length;for(var index=0;index<count;++index){children[index].restore();this.appendChild(children[index]);}}
merge(child,shouldAbsorb){Profiler.ProfileDataGridNode.merge(this,child,shouldAbsorb);}};Profiler.ProfileDataGridTree=class{constructor(formatter,searchableView,total){this.tree=this;this.children=[];this._formatter=formatter;this._searchableView=searchableView;this.total=total;this.lastComparator=null;this.childrenByCallUID=new Map();this.deepSearch=true;}
static propertyComparator(property,isAscending){var comparator=Profiler.ProfileDataGridTree.propertyComparators[(isAscending?1:0)][property];if(!comparator){if(isAscending){comparator=function(lhs,rhs){if(lhs[property]<rhs[property])
return-1;if(lhs[property]>rhs[property])
return 1;return 0;};}else{comparator=function(lhs,rhs){if(lhs[property]>rhs[property])
return-1;if(lhs[property]<rhs[property])
return 1;return 0;};}
Profiler.ProfileDataGridTree.propertyComparators[(isAscending?1:0)][property]=comparator;}
return comparator;}
get expanded(){return true;}
appendChild(child){this.insertChild(child,this.children.length);}
insertChild(child,index){this.children.splice(index,0,child);this.childrenByCallUID.set(child.callUID,child);}
removeChildren(){this.children=[];this.childrenByCallUID.clear();}
populateChildren(){}
findChild(node){if(!node)
return null;return this.childrenByCallUID.get(node.callUID);}
sort(comparator,force){return Profiler.ProfileDataGridNode.sort([[this]],comparator,force);}
save(){if(this._savedChildren)
return;this._savedTotal=this.total;this._savedChildren=this.children.slice();}
restore(){if(!this._savedChildren)
return;this.children=this._savedChildren;this.total=this._savedTotal;var children=this.children;var count=children.length;for(var index=0;index<count;++index)
children[index].restore();this._savedChildren=null;}
_matchFunction(searchConfig){var query=searchConfig.query.trim();if(!query.length)
return null;var greaterThan=(query.startsWith('>'));var lessThan=(query.startsWith('<'));var equalTo=(query.startsWith('=')||((greaterThan||lessThan)&&query.indexOf('=')===1));var percentUnits=(query.endsWith('%'));var millisecondsUnits=(query.length>2&&query.endsWith('ms'));var secondsUnits=(!millisecondsUnits&&query.endsWith('s'));var queryNumber=parseFloat(query);if(greaterThan||lessThan||equalTo){if(equalTo&&(greaterThan||lessThan))
queryNumber=parseFloat(query.substring(2));else
queryNumber=parseFloat(query.substring(1));}
var queryNumberMilliseconds=(secondsUnits?(queryNumber*1000):queryNumber);if(!isNaN(queryNumber)&&!(greaterThan||lessThan))
equalTo=true;var matcher=createPlainTextSearchRegex(query,'i');function matchesQuery(profileDataGridNode){delete profileDataGridNode._searchMatchedSelfColumn;delete profileDataGridNode._searchMatchedTotalColumn;delete profileDataGridNode._searchMatchedFunctionColumn;if(percentUnits){if(lessThan){if(profileDataGridNode.selfPercent<queryNumber)
profileDataGridNode._searchMatchedSelfColumn=true;if(profileDataGridNode.totalPercent<queryNumber)
profileDataGridNode._searchMatchedTotalColumn=true;}else if(greaterThan){if(profileDataGridNode.selfPercent>queryNumber)
profileDataGridNode._searchMatchedSelfColumn=true;if(profileDataGridNode.totalPercent>queryNumber)
profileDataGridNode._searchMatchedTotalColumn=true;}
if(equalTo){if(profileDataGridNode.selfPercent===queryNumber)
profileDataGridNode._searchMatchedSelfColumn=true;if(profileDataGridNode.totalPercent===queryNumber)
profileDataGridNode._searchMatchedTotalColumn=true;}}else if(millisecondsUnits||secondsUnits){if(lessThan){if(profileDataGridNode.self<queryNumberMilliseconds)
profileDataGridNode._searchMatchedSelfColumn=true;if(profileDataGridNode.total<queryNumberMilliseconds)
profileDataGridNode._searchMatchedTotalColumn=true;}else if(greaterThan){if(profileDataGridNode.self>queryNumberMilliseconds)
profileDataGridNode._searchMatchedSelfColumn=true;if(profileDataGridNode.total>queryNumberMilliseconds)
profileDataGridNode._searchMatchedTotalColumn=true;}
if(equalTo){if(profileDataGridNode.self===queryNumberMilliseconds)
profileDataGridNode._searchMatchedSelfColumn=true;if(profileDataGridNode.total===queryNumberMilliseconds)
profileDataGridNode._searchMatchedTotalColumn=true;}}
if(profileDataGridNode.functionName.match(matcher)||(profileDataGridNode.url&&profileDataGridNode.url.match(matcher)))
profileDataGridNode._searchMatchedFunctionColumn=true;if(profileDataGridNode._searchMatchedSelfColumn||profileDataGridNode._searchMatchedTotalColumn||profileDataGridNode._searchMatchedFunctionColumn){profileDataGridNode.refresh();return true;}
return false;}
return matchesQuery;}
performSearch(searchConfig,shouldJump,jumpBackwards){this.searchCanceled();var matchesQuery=this._matchFunction(searchConfig);if(!matchesQuery)
return;this._searchResults=[];const deepSearch=this.deepSearch;for(var current=this.children[0];current;current=current.traverseNextNode(!deepSearch,null,!deepSearch)){if(matchesQuery(current))
this._searchResults.push({profileNode:current});}
this._searchResultIndex=jumpBackwards?0:this._searchResults.length-1;this._searchableView.updateSearchMatchesCount(this._searchResults.length);this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);}
searchCanceled(){if(this._searchResults){for(var i=0;i<this._searchResults.length;++i){var profileNode=this._searchResults[i].profileNode;delete profileNode._searchMatchedSelfColumn;delete profileNode._searchMatchedTotalColumn;delete profileNode._searchMatchedFunctionColumn;profileNode.refresh();}}
this._searchResults=[];this._searchResultIndex=-1;}
jumpToNextSearchResult(){if(!this._searchResults||!this._searchResults.length)
return;this._searchResultIndex=(this._searchResultIndex+1)%this._searchResults.length;this._jumpToSearchResult(this._searchResultIndex);}
jumpToPreviousSearchResult(){if(!this._searchResults||!this._searchResults.length)
return;this._searchResultIndex=(this._searchResultIndex-1+this._searchResults.length)%this._searchResults.length;this._jumpToSearchResult(this._searchResultIndex);}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return false;}
_jumpToSearchResult(index){var searchResult=this._searchResults[index];if(!searchResult)
return;var profileNode=searchResult.profileNode;profileNode.revealAndSelect();this._searchableView.updateCurrentMatchIndex(index);}};Profiler.ProfileDataGridTree.propertyComparators=[{},{}];Profiler.ProfileDataGridNode.Formatter=function(){};Profiler.ProfileDataGridNode.Formatter.prototype={formatValue(value,node){},formatPercent(value,node){},linkifyNode(node){}};;Profiler.BottomUpProfileDataGridNode=class extends Profiler.ProfileDataGridNode{constructor(profileNode,owningTree){super(profileNode,owningTree,!!profileNode.parent&&!!profileNode.parent.parent);this._remainingNodeInfos=[];}
static _sharedPopulate(container){var remainingNodeInfos=container._remainingNodeInfos;var count=remainingNodeInfos.length;for(var index=0;index<count;++index){var nodeInfo=remainingNodeInfos[index];var ancestor=nodeInfo.ancestor;var focusNode=nodeInfo.focusNode;var child=container.findChild(ancestor);if(child){var totalAccountedFor=nodeInfo.totalAccountedFor;child.self+=focusNode.self;if(!totalAccountedFor)
child.total+=focusNode.total;}else{child=new Profiler.BottomUpProfileDataGridNode(ancestor,(container.tree));if(ancestor!==focusNode){child.self=focusNode.self;child.total=focusNode.total;}
container.appendChild(child);}
var parent=ancestor.parent;if(parent&&parent.parent){nodeInfo.ancestor=parent;child._remainingNodeInfos.push(nodeInfo);}}
delete container._remainingNodeInfos;}
_takePropertiesFromProfileDataGridNode(profileDataGridNode){this.save();this.self=profileDataGridNode.self;this.total=profileDataGridNode.total;}
_keepOnlyChild(child){this.save();this.removeChildren();this.appendChild(child);}
_exclude(aCallUID){if(this._remainingNodeInfos)
this.populate();this.save();var children=this.children;var index=this.children.length;while(index--)
children[index]._exclude(aCallUID);var child=this.childrenByCallUID.get(aCallUID);if(child)
this.merge(child,true);}
restore(){super.restore();if(!this.children.length)
this.setHasChildren(this._willHaveChildren(this.profileNode));}
merge(child,shouldAbsorb){this.self-=child.self;super.merge(child,shouldAbsorb);}
populateChildren(){Profiler.BottomUpProfileDataGridNode._sharedPopulate(this);}
_willHaveChildren(profileNode){return!!(profileNode.parent&&profileNode.parent.parent);}};Profiler.BottomUpProfileDataGridTree=class extends Profiler.ProfileDataGridTree{constructor(formatter,searchableView,rootProfileNode,total){super(formatter,searchableView,total);this.deepSearch=false;var profileNodeUIDs=0;var profileNodeGroups=[[],[rootProfileNode]];var visitedProfileNodesForCallUID=new Map();this._remainingNodeInfos=[];for(var profileNodeGroupIndex=0;profileNodeGroupIndex<profileNodeGroups.length;++profileNodeGroupIndex){var parentProfileNodes=profileNodeGroups[profileNodeGroupIndex];var profileNodes=profileNodeGroups[++profileNodeGroupIndex];var count=profileNodes.length;for(var index=0;index<count;++index){var profileNode=profileNodes[index];if(!profileNode.UID)
profileNode.UID=++profileNodeUIDs;if(profileNode.parent){var visitedNodes=visitedProfileNodesForCallUID.get(profileNode.callUID);var totalAccountedFor=false;if(!visitedNodes){visitedNodes=new Set();visitedProfileNodesForCallUID.set(profileNode.callUID,visitedNodes);}else{var parentCount=parentProfileNodes.length;for(var parentIndex=0;parentIndex<parentCount;++parentIndex){if(visitedNodes.has(parentProfileNodes[parentIndex].UID)){totalAccountedFor=true;break;}}}
visitedNodes.add(profileNode.UID);this._remainingNodeInfos.push({ancestor:profileNode,focusNode:profileNode,totalAccountedFor:totalAccountedFor});}
var children=profileNode.children;if(children.length){profileNodeGroups.push(parentProfileNodes.concat([profileNode]));profileNodeGroups.push(children);}}}
Profiler.ProfileDataGridNode.populate(this);return this;}
focus(profileDataGridNode){if(!profileDataGridNode)
return;this.save();var currentNode=profileDataGridNode;var focusNode=profileDataGridNode;while(currentNode.parent&&(currentNode instanceof Profiler.ProfileDataGridNode)){currentNode._takePropertiesFromProfileDataGridNode(profileDataGridNode);focusNode=currentNode;currentNode=currentNode.parent;if(currentNode instanceof Profiler.ProfileDataGridNode)
currentNode._keepOnlyChild(focusNode);}
this.children=[focusNode];this.total=profileDataGridNode.total;}
exclude(profileDataGridNode){if(!profileDataGridNode)
return;this.save();var excludedCallUID=profileDataGridNode.callUID;var excludedTopLevelChild=this.childrenByCallUID.get(excludedCallUID);if(excludedTopLevelChild)
this.children.remove(excludedTopLevelChild);var children=this.children;var count=children.length;for(var index=0;index<count;++index)
children[index]._exclude(excludedCallUID);if(this.lastComparator)
this.sort(this.lastComparator,true);}
populateChildren(){Profiler.BottomUpProfileDataGridNode._sharedPopulate(this);}};;Profiler.TopDownProfileDataGridNode=class extends Profiler.ProfileDataGridNode{constructor(profileNode,owningTree){var hasChildren=!!(profileNode.children&&profileNode.children.length);super(profileNode,owningTree,hasChildren);this._remainingChildren=profileNode.children;}
static _sharedPopulate(container){var children=container._remainingChildren;var childrenLength=children.length;for(var i=0;i<childrenLength;++i){container.appendChild(new Profiler.TopDownProfileDataGridNode(children[i],(container.tree)));}
container._remainingChildren=null;}
static _excludeRecursively(container,aCallUID){if(container._remainingChildren)
container.populate();container.save();var children=container.children;var index=container.children.length;while(index--)
Profiler.TopDownProfileDataGridNode._excludeRecursively(children[index],aCallUID);var child=container.childrenByCallUID.get(aCallUID);if(child)
Profiler.ProfileDataGridNode.merge(container,child,true);}
populateChildren(){Profiler.TopDownProfileDataGridNode._sharedPopulate(this);}};Profiler.TopDownProfileDataGridTree=class extends Profiler.ProfileDataGridTree{constructor(formatter,searchableView,rootProfileNode,total){super(formatter,searchableView,total);this._remainingChildren=rootProfileNode.children;Profiler.ProfileDataGridNode.populate(this);}
focus(profileDataGridNode){if(!profileDataGridNode)
return;this.save();profileDataGridNode.savePosition();this.children=[profileDataGridNode];this.total=profileDataGridNode.total;}
exclude(profileDataGridNode){if(!profileDataGridNode)
return;this.save();Profiler.TopDownProfileDataGridNode._excludeRecursively(this,profileDataGridNode.callUID);if(this.lastComparator)
this.sort(this.lastComparator,true);}
restore(){if(!this._savedChildren)
return;this.children[0].restorePosition();super.restore();}
populateChildren(){Profiler.TopDownProfileDataGridNode._sharedPopulate(this);}};;Profiler.ProfileFlameChartDataProvider=class{constructor(){PerfUI.FlameChartDataProvider.call(this);this._colorGenerator=Profiler.ProfileFlameChartDataProvider.colorGenerator();}
static colorGenerator(){if(!Profiler.ProfileFlameChartDataProvider._colorGenerator){var colorGenerator=new PerfUI.FlameChart.ColorGenerator({min:30,max:330},{min:50,max:80,count:5},{min:80,max:90,count:3});colorGenerator.setColorForID('(idle)','hsl(0, 0%, 94%)');colorGenerator.setColorForID('(program)','hsl(0, 0%, 80%)');colorGenerator.setColorForID('(garbage collector)','hsl(0, 0%, 80%)');Profiler.ProfileFlameChartDataProvider._colorGenerator=colorGenerator;}
return Profiler.ProfileFlameChartDataProvider._colorGenerator;}
minimumBoundary(){return this._cpuProfile.profileStartTime;}
totalTime(){return this._cpuProfile.profileHead.total;}
formatValue(value,precision){return Number.preciseMillisToString(value,precision);}
maxStackDepth(){return this._maxStackDepth;}
timelineData(){return this._timelineData||this._calculateTimelineData();}
_calculateTimelineData(){throw'Not implemented.';}
prepareHighlightedEntryInfo(entryIndex){throw'Not implemented.';}
highlightEntry(entryIndex){}
canJumpToEntry(entryIndex){return this._entryNodes[entryIndex].scriptId!=='0';}
entryTitle(entryIndex){var node=this._entryNodes[entryIndex];return UI.beautifyFunctionName(node.functionName);}
entryFont(entryIndex){if(!this._font){this._font='11px '+Host.fontFamily();this._boldFont='bold '+this._font;}
const node=this._entryNodes[entryIndex];return node.deoptReason?this._boldFont:this._font;}
entryColor(entryIndex){var node=this._entryNodes[entryIndex];return this._colorGenerator.colorForID(node.url||(node.scriptId!=='0'?node.scriptId:node.functionName));}
decorateEntry(entryIndex,context,text,barX,barY,barWidth,barHeight){return false;}
forceDecoration(entryIndex){return false;}
textColor(entryIndex){return'#333';}};Profiler.CPUProfileFlameChart=class extends UI.VBox{constructor(searchableView,dataProvider){super();this.element.id='cpu-flame-chart';this._searchableView=searchableView;this._overviewPane=new Profiler.CPUProfileFlameChart.OverviewPane(dataProvider);this._overviewPane.show(this.element);this._mainPane=new PerfUI.FlameChart(dataProvider,this._overviewPane);this._mainPane.setBarHeight(15);this._mainPane.setTextBaseline(4);this._mainPane.setTextPadding(2);this._mainPane.show(this.element);this._mainPane.addEventListener(PerfUI.FlameChart.Events.EntrySelected,this._onEntrySelected,this);this._overviewPane.addEventListener(PerfUI.OverviewGrid.Events.WindowChanged,this._onWindowChanged,this);this._dataProvider=dataProvider;this._searchResults=[];}
focus(){this._mainPane.focus();}
_onWindowChanged(event){var windowLeft=event.data.windowTimeLeft;var windowRight=event.data.windowTimeRight;this._mainPane.setWindowTimes(windowLeft,windowRight);}
selectRange(timeLeft,timeRight){this._overviewPane._selectRange(timeLeft,timeRight);}
_onEntrySelected(event){this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntrySelected,event.data);}
update(){this._overviewPane.update();this._mainPane.update();}
performSearch(searchConfig,shouldJump,jumpBackwards){var matcher=createPlainTextSearchRegex(searchConfig.query,searchConfig.caseSensitive?'':'i');var selectedEntryIndex=this._searchResultIndex!==-1?this._searchResults[this._searchResultIndex]:-1;this._searchResults=[];var entriesCount=this._dataProvider._entryNodes.length;for(var index=0;index<entriesCount;++index){if(this._dataProvider.entryTitle(index).match(matcher))
this._searchResults.push(index);}
if(this._searchResults.length){this._searchResultIndex=this._searchResults.indexOf(selectedEntryIndex);if(this._searchResultIndex===-1)
this._searchResultIndex=jumpBackwards?this._searchResults.length-1:0;this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);}else{this.searchCanceled();}
this._searchableView.updateSearchMatchesCount(this._searchResults.length);this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);}
searchCanceled(){this._mainPane.setSelectedEntry(-1);this._searchResults=[];this._searchResultIndex=-1;}
jumpToNextSearchResult(){this._searchResultIndex=(this._searchResultIndex+1)%this._searchResults.length;this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);}
jumpToPreviousSearchResult(){this._searchResultIndex=(this._searchResultIndex-1+this._searchResults.length)%this._searchResults.length;this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return false;}};Profiler.CPUProfileFlameChart.OverviewCalculator=class{constructor(dataProvider){this._dataProvider=dataProvider;}
_updateBoundaries(overviewPane){this._minimumBoundaries=overviewPane._dataProvider.minimumBoundary();var totalTime=overviewPane._dataProvider.totalTime();this._maximumBoundaries=this._minimumBoundaries+totalTime;this._xScaleFactor=overviewPane._overviewContainer.clientWidth/totalTime;}
computePosition(time){return(time-this._minimumBoundaries)*this._xScaleFactor;}
formatValue(value,precision){return this._dataProvider.formatValue(value-this._minimumBoundaries,precision);}
maximumBoundary(){return this._maximumBoundaries;}
minimumBoundary(){return this._minimumBoundaries;}
zeroTime(){return this._minimumBoundaries;}
boundarySpan(){return this._maximumBoundaries-this._minimumBoundaries;}};Profiler.CPUProfileFlameChart.OverviewPane=class extends UI.VBox{constructor(dataProvider){super();this.element.classList.add('cpu-profile-flame-chart-overview-pane');this._overviewContainer=this.element.createChild('div','cpu-profile-flame-chart-overview-container');this._overviewGrid=new PerfUI.OverviewGrid('cpu-profile-flame-chart');this._overviewGrid.element.classList.add('fill');this._overviewCanvas=this._overviewContainer.createChild('canvas','cpu-profile-flame-chart-overview-canvas');this._overviewContainer.appendChild(this._overviewGrid.element);this._overviewCalculator=new Profiler.CPUProfileFlameChart.OverviewCalculator(dataProvider);this._dataProvider=dataProvider;this._overviewGrid.addEventListener(PerfUI.OverviewGrid.Events.WindowChanged,this._onWindowChanged,this);}
requestWindowTimes(windowStartTime,windowEndTime){this._selectRange(windowStartTime,windowEndTime);}
updateRangeSelection(startTime,endTime){}
_selectRange(timeLeft,timeRight){var startTime=this._dataProvider.minimumBoundary();var totalTime=this._dataProvider.totalTime();this._overviewGrid.setWindow((timeLeft-startTime)/totalTime,(timeRight-startTime)/totalTime);}
_onWindowChanged(event){var startTime=this._dataProvider.minimumBoundary();var totalTime=this._dataProvider.totalTime();var data={windowTimeLeft:startTime+this._overviewGrid.windowLeft()*totalTime,windowTimeRight:startTime+this._overviewGrid.windowRight()*totalTime};this.dispatchEventToListeners(PerfUI.OverviewGrid.Events.WindowChanged,data);}
_timelineData(){return this._dataProvider.timelineData();}
onResize(){this._scheduleUpdate();}
_scheduleUpdate(){if(this._updateTimerId)
return;this._updateTimerId=this.element.window().requestAnimationFrame(this.update.bind(this));}
update(){this._updateTimerId=0;var timelineData=this._timelineData();if(!timelineData)
return;this._resetCanvas(this._overviewContainer.clientWidth,this._overviewContainer.clientHeight-PerfUI.FlameChart.HeaderHeight);this._overviewCalculator._updateBoundaries(this);this._overviewGrid.updateDividers(this._overviewCalculator);this._drawOverviewCanvas();}
_drawOverviewCanvas(){var canvasWidth=this._overviewCanvas.width;var canvasHeight=this._overviewCanvas.height;var drawData=this._calculateDrawData(canvasWidth);var context=this._overviewCanvas.getContext('2d');var ratio=window.devicePixelRatio;var offsetFromBottom=ratio;var lineWidth=1;var yScaleFactor=canvasHeight/(this._dataProvider.maxStackDepth()*1.1);context.lineWidth=lineWidth;context.translate(0.5,0.5);context.strokeStyle='rgba(20,0,0,0.4)';context.fillStyle='rgba(214,225,254,0.8)';context.moveTo(-lineWidth,canvasHeight+lineWidth);context.lineTo(-lineWidth,Math.round(canvasHeight-drawData[0]*yScaleFactor-offsetFromBottom));var value;for(var x=0;x<canvasWidth;++x){value=Math.round(canvasHeight-drawData[x]*yScaleFactor-offsetFromBottom);context.lineTo(x,value);}
context.lineTo(canvasWidth+lineWidth,value);context.lineTo(canvasWidth+lineWidth,canvasHeight+lineWidth);context.fill();context.stroke();context.closePath();}
_calculateDrawData(width){var dataProvider=this._dataProvider;var timelineData=this._timelineData();var entryStartTimes=timelineData.entryStartTimes;var entryTotalTimes=timelineData.entryTotalTimes;var entryLevels=timelineData.entryLevels;var length=entryStartTimes.length;var minimumBoundary=this._dataProvider.minimumBoundary();var drawData=new Uint8Array(width);var scaleFactor=width/dataProvider.totalTime();for(var entryIndex=0;entryIndex<length;++entryIndex){var start=Math.floor((entryStartTimes[entryIndex]-minimumBoundary)*scaleFactor);var finish=Math.floor((entryStartTimes[entryIndex]-minimumBoundary+entryTotalTimes[entryIndex])*scaleFactor);for(var x=start;x<=finish;++x)
drawData[x]=Math.max(drawData[x],entryLevels[entryIndex]+1);}
return drawData;}
_resetCanvas(width,height){var ratio=window.devicePixelRatio;this._overviewCanvas.width=width*ratio;this._overviewCanvas.height=height*ratio;this._overviewCanvas.style.width=width+'px';this._overviewCanvas.style.height=height+'px';}};;Profiler.CPUProfileView=class extends Profiler.ProfileView{constructor(profileHeader){super();this._profileHeader=profileHeader;this.profile=new SDK.CPUProfileDataModel(profileHeader._profile||profileHeader.protocolProfile());this.adjustedTotal=this.profile.profileHead.total;this.adjustedTotal-=this.profile.idleNode?this.profile.idleNode.total:0;this.initialize(new Profiler.CPUProfileView.NodeFormatter(this));}
wasShown(){super.wasShown();var lineLevelProfile=PerfUI.LineLevelProfile.instance();lineLevelProfile.reset();lineLevelProfile.appendCPUProfile(this.profile);}
columnHeader(columnId){switch(columnId){case'self':return Common.UIString('Self Time');case'total':return Common.UIString('Total Time');}
return'';}
createFlameChartDataProvider(){return new Profiler.CPUFlameChartDataProvider(this.profile,this._profileHeader.target());}};Profiler.CPUProfileType=class extends Profiler.ProfileType{constructor(){super(Profiler.CPUProfileType.TypeId,Common.UIString('Record JavaScript CPU Profile'));this._recording=false;Profiler.CPUProfileType.instance=this;SDK.targetManager.addModelListener(SDK.CPUProfilerModel,SDK.CPUProfilerModel.Events.ConsoleProfileFinished,this._consoleProfileFinished,this);}
typeName(){return'CPU';}
fileExtension(){return'.cpuprofile';}
get buttonTooltip(){return this._recording?Common.UIString('Stop CPU profiling'):Common.UIString('Start CPU profiling');}
buttonClicked(){if(this._recording){this.stopRecordingProfile();return false;}else{this.startRecordingProfile();return true;}}
get treeItemTitle(){return Common.UIString('CPU PROFILES');}
get description(){return Common.UIString('CPU profiles show where the execution time is spent in your page\'s JavaScript functions.');}
_consoleProfileFinished(event){var data=(event.data);var cpuProfile=(data.cpuProfile);var profile=new Profiler.CPUProfileHeader(data.scriptLocation.debuggerModel.target(),this,data.title);profile.setProtocolProfile(cpuProfile);this.addProfile(profile);}
startRecordingProfile(){var cpuProfilerModel=UI.context.flavor(SDK.CPUProfilerModel);if(this.profileBeingRecorded()||!cpuProfilerModel)
return;var profile=new Profiler.CPUProfileHeader(cpuProfilerModel.target(),this);this.setProfileBeingRecorded(profile);SDK.targetManager.suspendAllTargets();this.addProfile(profile);profile.updateStatus(Common.UIString('Recording\u2026'));this._recording=true;cpuProfilerModel.startRecording();Host.userMetrics.actionTaken(Host.UserMetrics.Action.ProfilesCPUProfileTaken);}
stopRecordingProfile(){this._recording=false;if(!this.profileBeingRecorded()||!this.profileBeingRecorded().target())
return;var recordedProfile;function didStopProfiling(profile){if(!this.profileBeingRecorded())
return;console.assert(profile);this.profileBeingRecorded().setProtocolProfile(profile);this.profileBeingRecorded().updateStatus('');recordedProfile=this.profileBeingRecorded();this.setProfileBeingRecorded(null);}
function fireEvent(){this.dispatchEventToListeners(Profiler.ProfileType.Events.ProfileComplete,recordedProfile);}
this.profileBeingRecorded().target().model(SDK.CPUProfilerModel).stopRecording().then(didStopProfiling.bind(this)).then(SDK.targetManager.resumeAllTargets.bind(SDK.targetManager)).then(fireEvent.bind(this));}
createProfileLoadedFromFile(title){return new Profiler.CPUProfileHeader(null,this,title);}
profileBeingRecordedRemoved(){this.stopRecordingProfile();}};Profiler.CPUProfileType.TypeId='CPU';Profiler.CPUProfileHeader=class extends Profiler.WritableProfileHeader{constructor(target,type,title){super(target,type,title);}
createView(){return new Profiler.CPUProfileView(this);}
protocolProfile(){return this._protocolProfile;}};Profiler.CPUProfileView.NodeFormatter=class{constructor(profileView){this._profileView=profileView;}
formatValue(value){return Common.UIString('%.1f\u2009ms',value);}
formatPercent(value,node){return node.profileNode===this._profileView.profile.idleNode?'':Common.UIString('%.2f\u2009%%',value);}
linkifyNode(node){return this._profileView.linkifier().maybeLinkifyConsoleCallFrame(this._profileView.target(),node.profileNode.callFrame,'profile-node-file');}};Profiler.CPUFlameChartDataProvider=class extends Profiler.ProfileFlameChartDataProvider{constructor(cpuProfile,target){super();this._cpuProfile=cpuProfile;this._target=target;}
_calculateTimelineData(){var entries=[];var stack=[];var maxDepth=5;function onOpenFrame(){stack.push(entries.length);entries.push(null);}
function onCloseFrame(depth,node,startTime,totalTime,selfTime){var index=stack.pop();entries[index]=new Profiler.CPUFlameChartDataProvider.ChartEntry(depth,totalTime,startTime,selfTime,node);maxDepth=Math.max(maxDepth,depth);}
this._cpuProfile.forEachFrame(onOpenFrame,onCloseFrame);var entryNodes=new Array(entries.length);var entryLevels=new Uint16Array(entries.length);var entryTotalTimes=new Float32Array(entries.length);var entrySelfTimes=new Float32Array(entries.length);var entryStartTimes=new Float64Array(entries.length);for(var i=0;i<entries.length;++i){var entry=entries[i];entryNodes[i]=entry.node;entryLevels[i]=entry.depth;entryTotalTimes[i]=entry.duration;entryStartTimes[i]=entry.startTime;entrySelfTimes[i]=entry.selfTime;}
this._maxStackDepth=maxDepth;this._timelineData=new PerfUI.FlameChart.TimelineData(entryLevels,entryTotalTimes,entryStartTimes,null);this._entryNodes=entryNodes;this._entrySelfTimes=entrySelfTimes;return this._timelineData;}
prepareHighlightedEntryInfo(entryIndex){var timelineData=this._timelineData;var node=this._entryNodes[entryIndex];if(!node)
return null;var entryInfo=[];function pushEntryInfoRow(title,value){entryInfo.push({title:title,value:value});}
function millisecondsToString(ms){if(ms===0)
return'0';if(ms<1000)
return Common.UIString('%.1f\u2009ms',ms);return Number.secondsToString(ms/1000,true);}
var name=UI.beautifyFunctionName(node.functionName);pushEntryInfoRow(Common.UIString('Name'),name);var selfTime=millisecondsToString(this._entrySelfTimes[entryIndex]);var totalTime=millisecondsToString(timelineData.entryTotalTimes[entryIndex]);pushEntryInfoRow(Common.UIString('Self time'),selfTime);pushEntryInfoRow(Common.UIString('Total time'),totalTime);var linkifier=new Components.Linkifier();var link=linkifier.maybeLinkifyConsoleCallFrame(this._target,node.callFrame);if(link)
pushEntryInfoRow(Common.UIString('URL'),link.textContent);linkifier.dispose();pushEntryInfoRow(Common.UIString('Aggregated self time'),Number.secondsToString(node.self/1000,true));pushEntryInfoRow(Common.UIString('Aggregated total time'),Number.secondsToString(node.total/1000,true));if(node.deoptReason)
pushEntryInfoRow(Common.UIString('Not optimized'),node.deoptReason);return Profiler.ProfileView.buildPopoverTable(entryInfo);}};Profiler.CPUFlameChartDataProvider.ChartEntry=class{constructor(depth,duration,startTime,selfTime,node){this.depth=depth;this.duration=duration;this.startTime=startTime;this.selfTime=selfTime;this.node=node;}};;Profiler.HeapProfileView=class extends Profiler.ProfileView{constructor(profileHeader){super();this._profileHeader=profileHeader;this.profile=new Profiler.SamplingHeapProfileModel(profileHeader._profile||profileHeader.protocolProfile());this.adjustedTotal=this.profile.total;var views=[Profiler.ProfileView.ViewTypes.Flame,Profiler.ProfileView.ViewTypes.Heavy,Profiler.ProfileView.ViewTypes.Tree];this.initialize(new Profiler.HeapProfileView.NodeFormatter(this),views);}
columnHeader(columnId){switch(columnId){case'self':return Common.UIString('Self Size (bytes)');case'total':return Common.UIString('Total Size (bytes)');}
return'';}
createFlameChartDataProvider(){return new Profiler.HeapFlameChartDataProvider(this.profile,this._profileHeader.target());}};Profiler.SamplingHeapProfileType=class extends Profiler.ProfileType{constructor(){super(Profiler.SamplingHeapProfileType.TypeId,Common.UIString('Record Allocation Profile'));this._recording=false;Profiler.SamplingHeapProfileType.instance=this;}
typeName(){return'Heap';}
fileExtension(){return'.heapprofile';}
get buttonTooltip(){return this._recording?Common.UIString('Stop heap profiling'):Common.UIString('Start heap profiling');}
buttonClicked(){var wasRecording=this._recording;if(wasRecording)
this.stopRecordingProfile();else
this.startRecordingProfile();return!wasRecording;}
get treeItemTitle(){return Common.UIString('ALLOCATION PROFILES');}
get description(){return Common.UIString('Allocation profiles show memory allocations from your JavaScript functions.');}
startRecordingProfile(){var heapProfilerModel=UI.context.flavor(SDK.HeapProfilerModel);if(this.profileBeingRecorded()||!heapProfilerModel)
return;var profile=new Profiler.SamplingHeapProfileHeader(heapProfilerModel.target(),this);this.setProfileBeingRecorded(profile);SDK.targetManager.suspendAllTargets();this.addProfile(profile);profile.updateStatus(Common.UIString('Recording\u2026'));this._recording=true;heapProfilerModel.startSampling();}
stopRecordingProfile(){this._recording=false;if(!this.profileBeingRecorded()||!this.profileBeingRecorded().target())
return;var recordedProfile;function didStopProfiling(profile){if(!this.profileBeingRecorded())
return;console.assert(profile);this.profileBeingRecorded().setProtocolProfile(profile);this.profileBeingRecorded().updateStatus('');recordedProfile=this.profileBeingRecorded();this.setProfileBeingRecorded(null);}
function fireEvent(){this.dispatchEventToListeners(Profiler.ProfileType.Events.ProfileComplete,recordedProfile);}
var heapProfilerModel=(this.profileBeingRecorded().target().model(SDK.HeapProfilerModel));heapProfilerModel.stopSampling().then(didStopProfiling.bind(this)).then(SDK.targetManager.resumeAllTargets.bind(SDK.targetManager)).then(fireEvent.bind(this));}
createProfileLoadedFromFile(title){return new Profiler.SamplingHeapProfileHeader(null,this,title);}
profileBeingRecordedRemoved(){this.stopRecordingProfile();}};Profiler.SamplingHeapProfileType.TypeId='SamplingHeap';Profiler.SamplingHeapProfileHeader=class extends Profiler.WritableProfileHeader{constructor(target,type,title){super(target,type,title||Common.UIString('Profile %d',type.nextProfileUid()));}
createView(){return new Profiler.HeapProfileView(this);}
protocolProfile(){return this._protocolProfile;}};Profiler.SamplingHeapProfileNode=class extends SDK.ProfileNode{constructor(node){var callFrame=node.callFrame||({functionName:node['functionName'],scriptId:node['scriptId'],url:node['url'],lineNumber:node['lineNumber']-1,columnNumber:node['columnNumber']-1});super(callFrame);this.self=node.selfSize;}};Profiler.SamplingHeapProfileModel=class extends SDK.ProfileTreeModel{constructor(profile){super();this.initialize(translateProfileTree(profile.head));function translateProfileTree(root){var resultRoot=new Profiler.SamplingHeapProfileNode(root);var targetNodeStack=[resultRoot];var sourceNodeStack=[root];while(sourceNodeStack.length){var sourceNode=sourceNodeStack.pop();var parentNode=targetNodeStack.pop();parentNode.children=sourceNode.children.map(child=>new Profiler.SamplingHeapProfileNode(child));sourceNodeStack.push.apply(sourceNodeStack,sourceNode.children);targetNodeStack.push.apply(targetNodeStack,parentNode.children);}
return resultRoot;}}};Profiler.HeapProfileView.NodeFormatter=class{constructor(profileView){this._profileView=profileView;}
formatValue(value){return Number.withThousandsSeparator(value);}
formatPercent(value,node){return Common.UIString('%.2f\u2009%%',value);}
linkifyNode(node){return this._profileView.linkifier().maybeLinkifyConsoleCallFrame(this._profileView.target(),node.profileNode.callFrame,'profile-node-file');}};Profiler.HeapFlameChartDataProvider=class extends Profiler.ProfileFlameChartDataProvider{constructor(profile,target){super();this._profile=profile;this._target=target;}
minimumBoundary(){return 0;}
totalTime(){return this._profile.root.total;}
formatValue(value,precision){return Common.UIString('%s\u2009KB',Number.withThousandsSeparator(value/1e3));}
_calculateTimelineData(){function nodesCount(node){return node.children.reduce((count,node)=>count+nodesCount(node),1);}
var count=nodesCount(this._profile.root);var entryNodes=new Array(count);var entryLevels=new Uint16Array(count);var entryTotalTimes=new Float32Array(count);var entryStartTimes=new Float64Array(count);var depth=0;var maxDepth=0;var position=0;var index=0;function addNode(node){var start=position;entryNodes[index]=node;entryLevels[index]=depth;entryTotalTimes[index]=node.total;entryStartTimes[index]=position;++index;++depth;node.children.forEach(addNode);--depth;maxDepth=Math.max(maxDepth,depth);position=start+node.total;}
addNode(this._profile.root);this._maxStackDepth=maxDepth+1;this._entryNodes=entryNodes;this._timelineData=new PerfUI.FlameChart.TimelineData(entryLevels,entryTotalTimes,entryStartTimes,null);return this._timelineData;}
prepareHighlightedEntryInfo(entryIndex){var node=this._entryNodes[entryIndex];if(!node)
return null;var entryInfo=[];function pushEntryInfoRow(title,value){entryInfo.push({title:title,value:value});}
pushEntryInfoRow(Common.UIString('Name'),UI.beautifyFunctionName(node.functionName));pushEntryInfoRow(Common.UIString('Self size'),Number.bytesToString(node.self));pushEntryInfoRow(Common.UIString('Total size'),Number.bytesToString(node.total));var linkifier=new Components.Linkifier();var link=linkifier.maybeLinkifyConsoleCallFrame(this._target,node.callFrame);if(link)
pushEntryInfoRow(Common.UIString('URL'),link.textContent);linkifier.dispose();return Profiler.ProfileView.buildPopoverTable(entryInfo);}};;Profiler.HeapSnapshotWorkerProxy=class extends Common.Object{constructor(eventHandler){super();this._eventHandler=eventHandler;this._nextObjectId=1;this._nextCallId=1;this._callbacks=new Map();this._previousCallbacks=new Set();this._worker=new Common.Worker('heap_snapshot_worker');this._worker.onmessage=this._messageReceived.bind(this);}
createLoader(profileUid,snapshotReceivedCallback){var objectId=this._nextObjectId++;var proxy=new Profiler.HeapSnapshotLoaderProxy(this,objectId,profileUid,snapshotReceivedCallback);this._postMessage({callId:this._nextCallId++,disposition:'create',objectId:objectId,methodName:'HeapSnapshotWorker.HeapSnapshotLoader'});return proxy;}
dispose(){this._worker.terminate();if(this._interval)
clearInterval(this._interval);}
disposeObject(objectId){this._postMessage({callId:this._nextCallId++,disposition:'dispose',objectId:objectId});}
evaluateForTest(script,callback){var callId=this._nextCallId++;this._callbacks.set(callId,callback);this._postMessage({callId:callId,disposition:'evaluateForTest',source:script});}
callFactoryMethod(callback,objectId,methodName,proxyConstructor){var callId=this._nextCallId++;var methodArguments=Array.prototype.slice.call(arguments,4);var newObjectId=this._nextObjectId++;function wrapCallback(remoteResult){callback(remoteResult?new proxyConstructor(this,newObjectId):null);}
if(callback){this._callbacks.set(callId,wrapCallback.bind(this));this._postMessage({callId:callId,disposition:'factory',objectId:objectId,methodName:methodName,methodArguments:methodArguments,newObjectId:newObjectId});return null;}else{this._postMessage({callId:callId,disposition:'factory',objectId:objectId,methodName:methodName,methodArguments:methodArguments,newObjectId:newObjectId});return new proxyConstructor(this,newObjectId);}}
callMethod(callback,objectId,methodName){var callId=this._nextCallId++;var methodArguments=Array.prototype.slice.call(arguments,3);if(callback)
this._callbacks.set(callId,callback);this._postMessage({callId:callId,disposition:'method',objectId:objectId,methodName:methodName,methodArguments:methodArguments});}
startCheckingForLongRunningCalls(){if(this._interval)
return;this._checkLongRunningCalls();this._interval=setInterval(this._checkLongRunningCalls.bind(this),300);}
_checkLongRunningCalls(){for(var callId of this._previousCallbacks){if(!this._callbacks.has(callId))
this._previousCallbacks.delete(callId);}
var hasLongRunningCalls=!!this._previousCallbacks.size;this.dispatchEventToListeners(Profiler.HeapSnapshotWorkerProxy.Events.Wait,hasLongRunningCalls);for(var callId of this._callbacks.keysArray())
this._previousCallbacks.add(callId);}
_messageReceived(event){var data=event.data;if(data.eventName){if(this._eventHandler)
this._eventHandler(data.eventName,data.data);return;}
if(data.error){if(data.errorMethodName){Common.console.error(Common.UIString('An error occurred when a call to method \'%s\' was requested',data.errorMethodName));}
Common.console.error(data['errorCallStack']);this._callbacks.delete(data.callId);return;}
if(!this._callbacks.has(data.callId))
return;var callback=this._callbacks.get(data.callId);this._callbacks.delete(data.callId);callback(data.result);}
_postMessage(message){this._worker.postMessage(message);}};Profiler.HeapSnapshotWorkerProxy.Events={Wait:Symbol('Wait')};Profiler.HeapSnapshotProxyObject=class{constructor(worker,objectId){this._worker=worker;this._objectId=objectId;}
_callWorker(workerMethodName,args){args.splice(1,0,this._objectId);return this._worker[workerMethodName].apply(this._worker,args);}
dispose(){this._worker.disposeObject(this._objectId);}
disposeWorker(){this._worker.dispose();}
callFactoryMethod(callback,methodName,proxyConstructor,var_args){return this._callWorker('callFactoryMethod',Array.prototype.slice.call(arguments,0));}
callMethod(callback,methodName,var_args){return this._callWorker('callMethod',Array.prototype.slice.call(arguments,0));}
_callMethodPromise(methodName,var_args){function action(args,fulfill){this._callWorker('callMethod',[fulfill].concat(args));}
return new Promise(action.bind(this,Array.prototype.slice.call(arguments)));}};Profiler.HeapSnapshotLoaderProxy=class extends Profiler.HeapSnapshotProxyObject{constructor(worker,objectId,profileUid,snapshotReceivedCallback){super(worker,objectId);this._profileUid=profileUid;this._snapshotReceivedCallback=snapshotReceivedCallback;}
write(chunk,callback){this.callMethod(callback,'write',chunk);}
close(callback){function buildSnapshot(){if(callback)
callback();this.callFactoryMethod(updateStaticData.bind(this),'buildSnapshot',Profiler.HeapSnapshotProxy);}
function updateStaticData(snapshotProxy){this.dispose();snapshotProxy.setProfileUid(this._profileUid);snapshotProxy.updateStaticData(this._snapshotReceivedCallback.bind(this));}
this.callMethod(buildSnapshot.bind(this),'close');}};Profiler.HeapSnapshotProxy=class extends Profiler.HeapSnapshotProxyObject{constructor(worker,objectId){super(worker,objectId);this._staticData=null;}
search(searchConfig,filter){return this._callMethodPromise('search',searchConfig,filter);}
aggregatesWithFilter(filter,callback){this.callMethod(callback,'aggregatesWithFilter',filter);}
aggregatesForDiff(callback){this.callMethod(callback,'aggregatesForDiff');}
calculateSnapshotDiff(baseSnapshotId,baseSnapshotAggregates,callback){this.callMethod(callback,'calculateSnapshotDiff',baseSnapshotId,baseSnapshotAggregates);}
nodeClassName(snapshotObjectId){return this._callMethodPromise('nodeClassName',snapshotObjectId);}
createEdgesProvider(nodeIndex){return this.callFactoryMethod(null,'createEdgesProvider',Profiler.HeapSnapshotProviderProxy,nodeIndex);}
createRetainingEdgesProvider(nodeIndex){return this.callFactoryMethod(null,'createRetainingEdgesProvider',Profiler.HeapSnapshotProviderProxy,nodeIndex);}
createAddedNodesProvider(baseSnapshotId,className){return this.callFactoryMethod(null,'createAddedNodesProvider',Profiler.HeapSnapshotProviderProxy,baseSnapshotId,className);}
createDeletedNodesProvider(nodeIndexes){return this.callFactoryMethod(null,'createDeletedNodesProvider',Profiler.HeapSnapshotProviderProxy,nodeIndexes);}
createNodesProvider(filter){return this.callFactoryMethod(null,'createNodesProvider',Profiler.HeapSnapshotProviderProxy,filter);}
createNodesProviderForClass(className,nodeFilter){return this.callFactoryMethod(null,'createNodesProviderForClass',Profiler.HeapSnapshotProviderProxy,className,nodeFilter);}
allocationTracesTops(callback){this.callMethod(callback,'allocationTracesTops');}
allocationNodeCallers(nodeId,callback){this.callMethod(callback,'allocationNodeCallers',nodeId);}
allocationStack(nodeIndex,callback){this.callMethod(callback,'allocationStack',nodeIndex);}
dispose(){throw new Error('Should never be called');}
get nodeCount(){return this._staticData.nodeCount;}
get rootNodeIndex(){return this._staticData.rootNodeIndex;}
updateStaticData(callback){function dataReceived(staticData){this._staticData=staticData;callback(this);}
this.callMethod(dataReceived.bind(this),'updateStaticData');}
getStatistics(){return this._callMethodPromise('getStatistics');}
getSamples(){return this._callMethodPromise('getSamples');}
get totalSize(){return this._staticData.totalSize;}
get uid(){return this._profileUid;}
setProfileUid(profileUid){this._profileUid=profileUid;}
maxJSObjectId(){return this._staticData.maxJSObjectId;}};Profiler.HeapSnapshotProviderProxy=class extends Profiler.HeapSnapshotProxyObject{constructor(worker,objectId){super(worker,objectId);}
nodePosition(snapshotObjectId){return this._callMethodPromise('nodePosition',snapshotObjectId);}
isEmpty(callback){this.callMethod(callback,'isEmpty');}
serializeItemsRange(startPosition,endPosition,callback){this.callMethod(callback,'serializeItemsRange',startPosition,endPosition);}
sortAndRewind(comparator){return this._callMethodPromise('sortAndRewind',comparator);}};;Profiler.HeapSnapshotSortableDataGrid=class extends DataGrid.DataGrid{constructor(dataDisplayDelegate,columns){super(columns);this._dataDisplayDelegate=dataDisplayDelegate;this._recursiveSortingDepth=0;this._highlightedNode=null;this._populatedAndSorted=false;this._nameFilter=null;this._nodeFilter=new HeapSnapshotModel.NodeFilter();this.addEventListener(Profiler.HeapSnapshotSortableDataGrid.Events.SortingComplete,this._sortingComplete,this);this.addEventListener(DataGrid.DataGrid.Events.SortingChanged,this.sortingChanged,this);}
nodeFilter(){return this._nodeFilter;}
setNameFilter(nameFilter){this._nameFilter=nameFilter;}
defaultPopulateCount(){return 100;}
_disposeAllNodes(){var children=this.topLevelNodes();for(var i=0,l=children.length;i<l;++i)
children[i].dispose();}
wasShown(){if(this._nameFilter){this._nameFilter.addEventListener(UI.ToolbarInput.Event.TextChanged,this._onNameFilterChanged,this);this.updateVisibleNodes(true);}
if(this._populatedAndSorted)
this.dispatchEventToListeners(Profiler.HeapSnapshotSortableDataGrid.Events.ContentShown,this);}
_sortingComplete(){this.removeEventListener(Profiler.HeapSnapshotSortableDataGrid.Events.SortingComplete,this._sortingComplete,this);this._populatedAndSorted=true;this.dispatchEventToListeners(Profiler.HeapSnapshotSortableDataGrid.Events.ContentShown,this);}
willHide(){if(this._nameFilter)
this._nameFilter.removeEventListener(UI.ToolbarInput.Event.TextChanged,this._onNameFilterChanged,this);this._clearCurrentHighlight();}
populateContextMenu(contextMenu,event){var td=event.target.enclosingNodeOrSelfWithNodeName('td');if(!td)
return;var node=td.heapSnapshotNode;function revealInSummaryView(){this._dataDisplayDelegate.showObject(node.snapshotNodeId,'Summary');}
if(node instanceof Profiler.HeapSnapshotRetainingObjectNode)
contextMenu.appendItem(Common.UIString.capitalize('Reveal in Summary ^view'),revealInSummaryView.bind(this));}
resetSortingCache(){delete this._lastSortColumnId;delete this._lastSortAscending;}
topLevelNodes(){return this.rootNode().children;}
revealObjectByHeapSnapshotId(heapSnapshotObjectId){return Promise.resolve((null));}
highlightNode(node){this._clearCurrentHighlight();this._highlightedNode=node;UI.runCSSAnimationOnce(this._highlightedNode.element(),'highlighted-row');}
nodeWasDetached(node){if(this._highlightedNode===node)
this._clearCurrentHighlight();}
_clearCurrentHighlight(){if(!this._highlightedNode)
return;this._highlightedNode.element().classList.remove('highlighted-row');this._highlightedNode=null;}
resetNameFilter(){this._nameFilter.setValue('');}
_onNameFilterChanged(){this.updateVisibleNodes(true);}
sortingChanged(){var sortAscending=this.isSortOrderAscending();var sortColumnId=this.sortColumnId();if(this._lastSortColumnId===sortColumnId&&this._lastSortAscending===sortAscending)
return;this._lastSortColumnId=sortColumnId;this._lastSortAscending=sortAscending;var sortFields=this._sortFields(sortColumnId,sortAscending);function SortByTwoFields(nodeA,nodeB){var field1=nodeA[sortFields[0]];var field2=nodeB[sortFields[0]];var result=field1<field2?-1:(field1>field2?1:0);if(!sortFields[1])
result=-result;if(result!==0)
return result;field1=nodeA[sortFields[2]];field2=nodeB[sortFields[2]];result=field1<field2?-1:(field1>field2?1:0);if(!sortFields[3])
result=-result;return result;}
this._performSorting(SortByTwoFields);}
_performSorting(sortFunction){this.recursiveSortingEnter();var children=this.allChildren(this.rootNode());this.rootNode().removeChildren();children.sort(sortFunction);for(var i=0,l=children.length;i<l;++i){var child=children[i];this.appendChildAfterSorting(child);if(child.expanded)
child.sort();}
this.recursiveSortingLeave();}
appendChildAfterSorting(child){var revealed=child.revealed;this.rootNode().appendChild(child);child.revealed=revealed;}
recursiveSortingEnter(){++this._recursiveSortingDepth;}
recursiveSortingLeave(){if(!this._recursiveSortingDepth)
return;if(--this._recursiveSortingDepth)
return;this.updateVisibleNodes(true);this.dispatchEventToListeners(Profiler.HeapSnapshotSortableDataGrid.Events.SortingComplete);}
updateVisibleNodes(force){}
allChildren(parent){return parent.children;}
insertChild(parent,node,index){parent.insertChild(node,index);}
removeChildByIndex(parent,index){parent.removeChild(parent.children[index]);}
removeAllChildren(parent){parent.removeChildren();}};Profiler.HeapSnapshotSortableDataGrid.Events={ContentShown:Symbol('ContentShown'),SortingComplete:Symbol('SortingComplete')};Profiler.HeapSnapshotViewportDataGrid=class extends Profiler.HeapSnapshotSortableDataGrid{constructor(dataDisplayDelegate,columns){super(dataDisplayDelegate,columns);this.scrollContainer.addEventListener('scroll',this._onScroll.bind(this),true);this._topPaddingHeight=0;this._bottomPaddingHeight=0;}
topLevelNodes(){return this.allChildren(this.rootNode());}
appendChildAfterSorting(child){}
updateVisibleNodes(force){var guardZoneHeight=40;var scrollHeight=this.scrollContainer.scrollHeight;var scrollTop=this.scrollContainer.scrollTop;var scrollBottom=scrollHeight-scrollTop-this.scrollContainer.offsetHeight;scrollTop=Math.max(0,scrollTop-guardZoneHeight);scrollBottom=Math.max(0,scrollBottom-guardZoneHeight);var viewPortHeight=scrollHeight-scrollTop-scrollBottom;if(!force&&scrollTop>=this._topPaddingHeight&&scrollBottom>=this._bottomPaddingHeight)
return;var hysteresisHeight=500;scrollTop-=hysteresisHeight;viewPortHeight+=2*hysteresisHeight;var selectedNode=this.selectedNode;this.rootNode().removeChildren();this._topPaddingHeight=0;this._bottomPaddingHeight=0;this._addVisibleNodes(this.rootNode(),scrollTop,scrollTop+viewPortHeight);this.setVerticalPadding(this._topPaddingHeight,this._bottomPaddingHeight);if(selectedNode){if(selectedNode.parent)
selectedNode.select(true);else
this.selectedNode=selectedNode;}}
_addVisibleNodes(parentNode,topBound,bottomBound){if(!parentNode.expanded)
return 0;var children=this.allChildren(parentNode);var topPadding=0;var nameFilterValue=this._nameFilter?this._nameFilter.value().toLowerCase():'';for(var i=0;i<children.length;++i){var child=children[i];if(nameFilterValue&&child.filteredOut&&child.filteredOut(nameFilterValue))
continue;var newTop=topPadding+this._nodeHeight(child);if(newTop>topBound)
break;topPadding=newTop;}
var position=topPadding;for(;i<children.length&&position<bottomBound;++i){var child=children[i];if(nameFilterValue&&child.filteredOut&&child.filteredOut(nameFilterValue))
continue;var hasChildren=child.hasChildren();child.removeChildren();child.setHasChildren(hasChildren);child.revealed=true;parentNode.appendChild(child);position+=child.nodeSelfHeight();position+=this._addVisibleNodes(child,topBound-position,bottomBound-position);}
var bottomPadding=0;for(;i<children.length;++i){var child=children[i];if(nameFilterValue&&child.filteredOut&&child.filteredOut(nameFilterValue))
continue;bottomPadding+=this._nodeHeight(child);}
this._topPaddingHeight+=topPadding;this._bottomPaddingHeight+=bottomPadding;return position+bottomPadding;}
_nodeHeight(node){if(!node.revealed)
return 0;var result=node.nodeSelfHeight();if(!node.expanded)
return result;var children=this.allChildren(node);for(var i=0;i<children.length;i++)
result+=this._nodeHeight(children[i]);return result;}
revealTreeNode(pathToReveal){var height=this._calculateOffset(pathToReveal);var node=(pathToReveal.peekLast());var scrollTop=this.scrollContainer.scrollTop;var scrollBottom=scrollTop+this.scrollContainer.offsetHeight;if(height>=scrollTop&&height<scrollBottom)
return Promise.resolve(node);var scrollGap=40;this.scrollContainer.scrollTop=Math.max(0,height-scrollGap);return new Promise(this._scrollTo.bind(this,node));}
_scrollTo(node,fulfill){console.assert(!this._scrollToResolveCallback);this._scrollToResolveCallback=fulfill.bind(null,node);}
_calculateOffset(pathToReveal){var parentNode=this.rootNode();var height=0;for(var i=0;i<pathToReveal.length;++i){var node=pathToReveal[i];var children=this.allChildren(parentNode);for(var j=0;j<children.length;++j){var child=children[j];if(node===child){height+=node.nodeSelfHeight();break;}
height+=this._nodeHeight(child);}
parentNode=node;}
return height-pathToReveal.peekLast().nodeSelfHeight();}
allChildren(parent){return parent._allChildren||(parent._allChildren=[]);}
appendNode(parent,node){this.allChildren(parent).push(node);}
insertChild(parent,node,index){this.allChildren(parent).splice(index,0,(node));}
removeChildByIndex(parent,index){this.allChildren(parent).splice(index,1);}
removeAllChildren(parent){parent._allChildren=[];}
removeTopLevelNodes(){this._disposeAllNodes();this.rootNode().removeChildren();this.rootNode()._allChildren=[];}
_isScrolledIntoView(element){var viewportTop=this.scrollContainer.scrollTop;var viewportBottom=viewportTop+this.scrollContainer.clientHeight;var elemTop=element.offsetTop;var elemBottom=elemTop+element.offsetHeight;return elemBottom<=viewportBottom&&elemTop>=viewportTop;}
onResize(){super.onResize();this.updateVisibleNodes(false);}
_onScroll(event){this.updateVisibleNodes(false);if(this._scrollToResolveCallback){this._scrollToResolveCallback();this._scrollToResolveCallback=null;}}};Profiler.HeapSnapshotContainmentDataGrid=class extends Profiler.HeapSnapshotSortableDataGrid{constructor(dataDisplayDelegate,columns){columns=columns||(([{id:'object',title:Common.UIString('Object'),disclosure:true,sortable:true},{id:'distance',title:Common.UIString('Distance'),width:'70px',sortable:true,fixedWidth:true},{id:'shallowSize',title:Common.UIString('Shallow Size'),width:'110px',sortable:true,fixedWidth:true},{id:'retainedSize',title:Common.UIString('Retained Size'),width:'110px',sortable:true,fixedWidth:true,sort:DataGrid.DataGrid.Order.Descending}]));super(dataDisplayDelegate,columns);}
setDataSource(snapshot,nodeIndex){this.snapshot=snapshot;var node={nodeIndex:nodeIndex||snapshot.rootNodeIndex};var fakeEdge={node:node};this.setRootNode(this._createRootNode(snapshot,fakeEdge));this.rootNode().sort();}
_createRootNode(snapshot,fakeEdge){return new Profiler.HeapSnapshotObjectNode(this,snapshot,fakeEdge,null);}
sortingChanged(){var rootNode=this.rootNode();if(rootNode.hasChildren())
rootNode.sort();}};Profiler.HeapSnapshotRetainmentDataGrid=class extends Profiler.HeapSnapshotContainmentDataGrid{constructor(dataDisplayDelegate){var columns=([{id:'object',title:Common.UIString('Object'),disclosure:true,sortable:true},{id:'distance',title:Common.UIString('Distance'),width:'70px',sortable:true,fixedWidth:true,sort:DataGrid.DataGrid.Order.Ascending},{id:'shallowSize',title:Common.UIString('Shallow Size'),width:'110px',sortable:true,fixedWidth:true},{id:'retainedSize',title:Common.UIString('Retained Size'),width:'110px',sortable:true,fixedWidth:true}]);super(dataDisplayDelegate,columns);}
_createRootNode(snapshot,fakeEdge){return new Profiler.HeapSnapshotRetainingObjectNode(this,snapshot,fakeEdge,null);}
_sortFields(sortColumn,sortAscending){return{object:['_name',sortAscending,'_count',false],count:['_count',sortAscending,'_name',true],shallowSize:['_shallowSize',sortAscending,'_name',true],retainedSize:['_retainedSize',sortAscending,'_name',true],distance:['_distance',sortAscending,'_name',true]}[sortColumn];}
reset(){this.rootNode().removeChildren();this.resetSortingCache();}
setDataSource(snapshot,nodeIndex){super.setDataSource(snapshot,nodeIndex);this.rootNode().expand();}};Profiler.HeapSnapshotRetainmentDataGrid.Events={ExpandRetainersComplete:Symbol('ExpandRetainersComplete')};Profiler.HeapSnapshotConstructorsDataGrid=class extends Profiler.HeapSnapshotViewportDataGrid{constructor(dataDisplayDelegate){var columns=([{id:'object',title:Common.UIString('Constructor'),disclosure:true,sortable:true},{id:'distance',title:Common.UIString('Distance'),width:'70px',sortable:true,fixedWidth:true},{id:'count',title:Common.UIString('Objects Count'),width:'100px',sortable:true,fixedWidth:true},{id:'shallowSize',title:Common.UIString('Shallow Size'),width:'110px',sortable:true,fixedWidth:true},{id:'retainedSize',title:Common.UIString('Retained Size'),width:'110px',sort:DataGrid.DataGrid.Order.Descending,sortable:true,fixedWidth:true}]);super(dataDisplayDelegate,columns);this._profileIndex=-1;this._objectIdToSelect=null;}
_sortFields(sortColumn,sortAscending){return{object:['_name',sortAscending,'_count',false],distance:['_distance',sortAscending,'_retainedSize',true],count:['_count',sortAscending,'_name',true],shallowSize:['_shallowSize',sortAscending,'_name',true],retainedSize:['_retainedSize',sortAscending,'_name',true]}[sortColumn];}
revealObjectByHeapSnapshotId(id){if(!this.snapshot){this._objectIdToSelect=id;return Promise.resolve((null));}
function didPopulateNode(nodes){return nodes.length?this.revealTreeNode(nodes):null;}
function didGetClassName(className){if(!className)
return null;var constructorNodes=this.topLevelNodes();for(var i=0;i<constructorNodes.length;i++){var parent=constructorNodes[i];if(parent._name===className)
return parent.populateNodeBySnapshotObjectId(parseInt(id,10)).then(didPopulateNode.bind(this));}
return null;}
return this.snapshot.nodeClassName(parseInt(id,10)).then(didGetClassName.bind(this));}
clear(){this._nextRequestedFilter=null;this._lastFilter=null;this.removeTopLevelNodes();}
setDataSource(snapshot){this.snapshot=snapshot;if(this._profileIndex===-1)
this._populateChildren();if(this._objectIdToSelect){this.revealObjectByHeapSnapshotId(this._objectIdToSelect);this._objectIdToSelect=null;}}
setSelectionRange(minNodeId,maxNodeId){this._nodeFilter=new HeapSnapshotModel.NodeFilter(minNodeId,maxNodeId);this._populateChildren(this._nodeFilter);}
setAllocationNodeId(allocationNodeId){this._nodeFilter=new HeapSnapshotModel.NodeFilter();this._nodeFilter.allocationNodeId=allocationNodeId;this._populateChildren(this._nodeFilter);}
_aggregatesReceived(nodeFilter,aggregates){this._filterInProgress=null;if(this._nextRequestedFilter){this.snapshot.aggregatesWithFilter(this._nextRequestedFilter,this._aggregatesReceived.bind(this,this._nextRequestedFilter));this._filterInProgress=this._nextRequestedFilter;this._nextRequestedFilter=null;}
this.removeTopLevelNodes();this.resetSortingCache();for(var constructor in aggregates){this.appendNode(this.rootNode(),new Profiler.HeapSnapshotConstructorNode(this,constructor,aggregates[constructor],nodeFilter));}
this.sortingChanged();this._lastFilter=nodeFilter;}
_populateChildren(nodeFilter){nodeFilter=nodeFilter||new HeapSnapshotModel.NodeFilter();if(this._filterInProgress){this._nextRequestedFilter=this._filterInProgress.equals(nodeFilter)?null:nodeFilter;return;}
if(this._lastFilter&&this._lastFilter.equals(nodeFilter))
return;this._filterInProgress=nodeFilter;this.snapshot.aggregatesWithFilter(nodeFilter,this._aggregatesReceived.bind(this,nodeFilter));}
filterSelectIndexChanged(profiles,profileIndex){this._profileIndex=profileIndex;this._nodeFilter=undefined;if(profileIndex!==-1){var minNodeId=profileIndex>0?profiles[profileIndex-1].maxJSObjectId:0;var maxNodeId=profiles[profileIndex].maxJSObjectId;this._nodeFilter=new HeapSnapshotModel.NodeFilter(minNodeId,maxNodeId);}
this._populateChildren(this._nodeFilter);}};Profiler.HeapSnapshotDiffDataGrid=class extends Profiler.HeapSnapshotViewportDataGrid{constructor(dataDisplayDelegate){var columns=([{id:'object',title:Common.UIString('Constructor'),disclosure:true,sortable:true},{id:'addedCount',title:Common.UIString('# New'),width:'75px',sortable:true,fixedWidth:true},{id:'removedCount',title:Common.UIString('# Deleted'),width:'75px',sortable:true,fixedWidth:true},{id:'countDelta',title:Common.UIString('# Delta'),width:'65px',sortable:true,fixedWidth:true},{id:'addedSize',title:Common.UIString('Alloc. Size'),width:'75px',sortable:true,fixedWidth:true,sort:DataGrid.DataGrid.Order.Descending},{id:'removedSize',title:Common.UIString('Freed Size'),width:'75px',sortable:true,fixedWidth:true},{id:'sizeDelta',title:Common.UIString('Size Delta'),width:'75px',sortable:true,fixedWidth:true}]);super(dataDisplayDelegate,columns);}
defaultPopulateCount(){return 50;}
_sortFields(sortColumn,sortAscending){return{object:['_name',sortAscending,'_count',false],addedCount:['_addedCount',sortAscending,'_name',true],removedCount:['_removedCount',sortAscending,'_name',true],countDelta:['_countDelta',sortAscending,'_name',true],addedSize:['_addedSize',sortAscending,'_name',true],removedSize:['_removedSize',sortAscending,'_name',true],sizeDelta:['_sizeDelta',sortAscending,'_name',true]}[sortColumn];}
setDataSource(snapshot){this.snapshot=snapshot;}
setBaseDataSource(baseSnapshot){this.baseSnapshot=baseSnapshot;this.removeTopLevelNodes();this.resetSortingCache();if(this.baseSnapshot===this.snapshot){this.dispatchEventToListeners(Profiler.HeapSnapshotSortableDataGrid.Events.SortingComplete);return;}
this._populateChildren();}
_populateChildren(){function aggregatesForDiffReceived(aggregatesForDiff){this.snapshot.calculateSnapshotDiff(this.baseSnapshot.uid,aggregatesForDiff,didCalculateSnapshotDiff.bind(this));function didCalculateSnapshotDiff(diffByClassName){for(var className in diffByClassName){var diff=diffByClassName[className];this.appendNode(this.rootNode(),new Profiler.HeapSnapshotDiffNode(this,className,diff));}
this.sortingChanged();}}
this.baseSnapshot.aggregatesForDiff(aggregatesForDiffReceived.bind(this));}};Profiler.AllocationDataGrid=class extends Profiler.HeapSnapshotViewportDataGrid{constructor(target,dataDisplayDelegate){var columns=([{id:'liveCount',title:Common.UIString('Live Count'),width:'75px',sortable:true,fixedWidth:true},{id:'count',title:Common.UIString('Count'),width:'65px',sortable:true,fixedWidth:true},{id:'liveSize',title:Common.UIString('Live Size'),width:'75px',sortable:true,fixedWidth:true},{id:'size',title:Common.UIString('Size'),width:'75px',sortable:true,fixedWidth:true,sort:DataGrid.DataGrid.Order.Descending},{id:'name',title:Common.UIString('Function'),disclosure:true,sortable:true},]);super(dataDisplayDelegate,columns);this._target=target;this._linkifier=new Components.Linkifier();}
target(){return this._target;}
dispose(){this._linkifier.reset();}
setDataSource(snapshot){this.snapshot=snapshot;this.snapshot.allocationTracesTops(didReceiveAllocationTracesTops.bind(this));function didReceiveAllocationTracesTops(tops){this._topNodes=tops;this._populateChildren();}}
_populateChildren(){this.removeTopLevelNodes();var root=this.rootNode();var tops=this._topNodes;for(var i=0;i<tops.length;i++)
this.appendNode(root,new Profiler.AllocationGridNode(this,tops[i]));this.updateVisibleNodes(true);}
sortingChanged(){this._topNodes.sort(this._createComparator());this.rootNode().removeChildren();this._populateChildren();}
_createComparator(){var fieldName=this.sortColumnId();var compareResult=(this.sortOrder()===DataGrid.DataGrid.Order.Ascending)?+1:-1;function compare(a,b){if(a[fieldName]>b[fieldName])
return compareResult;if(a[fieldName]<b[fieldName])
return-compareResult;return 0;}
return compare;}};;Profiler.HeapSnapshotGridNode=class extends DataGrid.DataGridNode{constructor(tree,hasChildren){super(null,hasChildren);this._dataGrid=tree;this._instanceCount=0;this._savedChildren=null;this._retrievedChildrenRanges=[];this._providerObject=null;this._reachableFromWindow=false;}
static createComparator(fieldNames){return({fieldName1:fieldNames[0],ascending1:fieldNames[1],fieldName2:fieldNames[2],ascending2:fieldNames[3]});}
heapSnapshotDataGrid(){return this._dataGrid;}
createProvider(){throw new Error('Not implemented.');}
retainersDataSource(){return null;}
_provider(){if(!this._providerObject)
this._providerObject=this.createProvider();return this._providerObject;}
createCell(columnId){var cell=super.createCell(columnId);if(this._searchMatched)
cell.classList.add('highlight');return cell;}
collapse(){super.collapse();this._dataGrid.updateVisibleNodes(true);}
expand(){super.expand();this._dataGrid.updateVisibleNodes(true);}
dispose(){if(this._providerObject)
this._providerObject.dispose();for(var node=this.children[0];node;node=node.traverseNextNode(true,this,true)){if(node.dispose)
node.dispose();}}
queryObjectContent(target,callback,objectGroupName){}
wasDetached(){this._dataGrid.nodeWasDetached(this);}
_toPercentString(num){return num.toFixed(0)+'\u2009%';}
_toUIDistance(distance){var baseSystemDistance=HeapSnapshotModel.baseSystemDistance;return distance>=0&&distance<baseSystemDistance?Common.UIString('%d',distance):Common.UIString('\u2212');}
allChildren(){return this._dataGrid.allChildren(this);}
removeChildByIndex(index){this._dataGrid.removeChildByIndex(this,index);}
childForPosition(nodePosition){var indexOfFirstChildInRange=0;for(var i=0;i<this._retrievedChildrenRanges.length;i++){var range=this._retrievedChildrenRanges[i];if(range.from<=nodePosition&&nodePosition<range.to){var childIndex=indexOfFirstChildInRange+nodePosition-range.from;return this.allChildren()[childIndex];}
indexOfFirstChildInRange+=range.to-range.from+1;}
return null;}
_createValueCell(columnId){var cell=createElement('td');cell.className='numeric-column';if(this.dataGrid.snapshot.totalSize!==0){var div=createElement('div');var valueSpan=createElement('span');valueSpan.textContent=this.data[columnId];div.appendChild(valueSpan);var percentColumn=columnId+'-percent';if(percentColumn in this.data){var percentSpan=createElement('span');percentSpan.className='percent-column';percentSpan.textContent=this.data[percentColumn];div.appendChild(percentSpan);div.classList.add('profile-multiple-values');}
cell.appendChild(div);}
return cell;}
populate(){if(this._populated)
return;this._populated=true;this._provider().sortAndRewind(this.comparator()).then(this._populateChildren.bind(this));}
expandWithoutPopulate(){this._populated=true;this.expand();return this._provider().sortAndRewind(this.comparator());}
_populateChildren(fromPosition,toPosition,afterPopulate){fromPosition=fromPosition||0;toPosition=toPosition||fromPosition+this._dataGrid.defaultPopulateCount();var firstNotSerializedPosition=fromPosition;function serializeNextChunk(){if(firstNotSerializedPosition>=toPosition)
return;var end=Math.min(firstNotSerializedPosition+this._dataGrid.defaultPopulateCount(),toPosition);this._provider().serializeItemsRange(firstNotSerializedPosition,end,childrenRetrieved.bind(this));firstNotSerializedPosition=end;}
function insertRetrievedChild(item,insertionIndex){if(this._savedChildren){var hash=this._childHashForEntity(item);if(hash in this._savedChildren){this._dataGrid.insertChild(this,this._savedChildren[hash],insertionIndex);return;}}
this._dataGrid.insertChild(this,this._createChildNode(item),insertionIndex);}
function insertShowMoreButton(from,to,insertionIndex){var button=new DataGrid.ShowMoreDataGridNode(this._populateChildren.bind(this),from,to,this._dataGrid.defaultPopulateCount());this._dataGrid.insertChild(this,button,insertionIndex);}
function childrenRetrieved(itemsRange){var itemIndex=0;var itemPosition=itemsRange.startPosition;var items=itemsRange.items;var insertionIndex=0;if(!this._retrievedChildrenRanges.length){if(itemsRange.startPosition>0){this._retrievedChildrenRanges.push({from:0,to:0});insertShowMoreButton.call(this,0,itemsRange.startPosition,insertionIndex++);}
this._retrievedChildrenRanges.push({from:itemsRange.startPosition,to:itemsRange.endPosition});for(var i=0,l=items.length;i<l;++i)
insertRetrievedChild.call(this,items[i],insertionIndex++);if(itemsRange.endPosition<itemsRange.totalLength)
insertShowMoreButton.call(this,itemsRange.endPosition,itemsRange.totalLength,insertionIndex++);}else{var rangeIndex=0;var found=false;var range;while(rangeIndex<this._retrievedChildrenRanges.length){range=this._retrievedChildrenRanges[rangeIndex];if(range.to>=itemPosition){found=true;break;}
insertionIndex+=range.to-range.from;if(range.to<itemsRange.totalLength)
insertionIndex+=1;++rangeIndex;}
if(!found||itemsRange.startPosition<range.from){this.allChildren()[insertionIndex-1].setEndPosition(itemsRange.startPosition);insertShowMoreButton.call(this,itemsRange.startPosition,found?range.from:itemsRange.totalLength,insertionIndex);range={from:itemsRange.startPosition,to:itemsRange.startPosition};if(!found)
rangeIndex=this._retrievedChildrenRanges.length;this._retrievedChildrenRanges.splice(rangeIndex,0,range);}else{insertionIndex+=itemPosition-range.from;}
while(range.to<itemsRange.endPosition){var skipCount=range.to-itemPosition;insertionIndex+=skipCount;itemIndex+=skipCount;itemPosition=range.to;var nextRange=this._retrievedChildrenRanges[rangeIndex+1];var newEndOfRange=nextRange?nextRange.from:itemsRange.totalLength;if(newEndOfRange>itemsRange.endPosition)
newEndOfRange=itemsRange.endPosition;while(itemPosition<newEndOfRange){insertRetrievedChild.call(this,items[itemIndex++],insertionIndex++);++itemPosition;}
if(nextRange&&newEndOfRange===nextRange.from){range.to=nextRange.to;this.removeChildByIndex(insertionIndex);this._retrievedChildrenRanges.splice(rangeIndex+1,1);}else{range.to=newEndOfRange;if(newEndOfRange===itemsRange.totalLength)
this.removeChildByIndex(insertionIndex);else
this.allChildren()[insertionIndex].setStartPosition(itemsRange.endPosition);}}}
this._instanceCount+=items.length;if(firstNotSerializedPosition<toPosition){serializeNextChunk.call(this);return;}
if(this.expanded)
this._dataGrid.updateVisibleNodes(true);if(afterPopulate)
afterPopulate();this.dispatchEventToListeners(Profiler.HeapSnapshotGridNode.Events.PopulateComplete);}
serializeNextChunk.call(this);}
_saveChildren(){this._savedChildren=null;var children=this.allChildren();for(var i=0,l=children.length;i<l;++i){var child=children[i];if(!child.expanded)
continue;if(!this._savedChildren)
this._savedChildren={};this._savedChildren[this._childHashForNode(child)]=child;}}
sort(){this._dataGrid.recursiveSortingEnter();function afterSort(){this._saveChildren();this._dataGrid.removeAllChildren(this);this._retrievedChildrenRanges=[];function afterPopulate(){var children=this.allChildren();for(var i=0,l=children.length;i<l;++i){var child=children[i];if(child.expanded)
child.sort();}
this._dataGrid.recursiveSortingLeave();}
var instanceCount=this._instanceCount;this._instanceCount=0;this._populateChildren(0,instanceCount,afterPopulate.bind(this));}
this._provider().sortAndRewind(this.comparator()).then(afterSort.bind(this));}};Profiler.HeapSnapshotGridNode.Events={PopulateComplete:Symbol('PopulateComplete')};Profiler.HeapSnapshotGridNode.ChildrenProvider=function(){};Profiler.HeapSnapshotGridNode.ChildrenProvider.prototype={dispose(){},nodePosition(snapshotObjectId){},isEmpty(callback){},serializeItemsRange(startPosition,endPosition,callback){},sortAndRewind(comparator){}};Profiler.HeapSnapshotGenericObjectNode=class extends Profiler.HeapSnapshotGridNode{constructor(dataGrid,node){super(dataGrid,false);if(!node)
return;this._name=node.name;this._type=node.type;this._distance=node.distance;this._shallowSize=node.selfSize;this._retainedSize=node.retainedSize;this.snapshotNodeId=node.id;this.snapshotNodeIndex=node.nodeIndex;if(this._type==='string'){this._reachableFromWindow=true;}else if(this._type==='object'&&this._name.startsWith('Window')){this._name=this.shortenWindowURL(this._name,false);this._reachableFromWindow=true;}else if(node.canBeQueried){this._reachableFromWindow=true;}
if(node.detachedDOMTreeNode)
this.detachedDOMTreeNode=true;var snapshot=dataGrid.snapshot;var shallowSizePercent=this._shallowSize/snapshot.totalSize*100.0;var retainedSizePercent=this._retainedSize/snapshot.totalSize*100.0;this.data={'distance':this._toUIDistance(this._distance),'shallowSize':Number.withThousandsSeparator(this._shallowSize),'retainedSize':Number.withThousandsSeparator(this._retainedSize),'shallowSize-percent':this._toPercentString(shallowSizePercent),'retainedSize-percent':this._toPercentString(retainedSizePercent)};}
retainersDataSource(){return{snapshot:this._dataGrid.snapshot,snapshotNodeIndex:this.snapshotNodeIndex};}
createCell(columnId){var cell=columnId!=='object'?this._createValueCell(columnId):this._createObjectCell();if(this._searchMatched)
cell.classList.add('highlight');return cell;}
_createObjectCell(){var value=this._name;var valueStyle='object';switch(this._type){case'concatenated string':case'string':value='"'+value+'"';valueStyle='string';break;case'regexp':value='/'+value+'/';valueStyle='string';break;case'closure':value=value+'()';valueStyle='function';break;case'number':valueStyle='number';break;case'hidden':valueStyle='null';break;case'array':value=(value||'')+'[]';break;}
if(this._reachableFromWindow)
valueStyle+=' highlight';if(value==='Object')
value='';if(this.detachedDOMTreeNode)
valueStyle+=' detached-dom-tree-node';return this._createObjectCellWithValue(valueStyle,value);}
_createObjectCellWithValue(valueStyle,value){var cell=createElement('td');cell.className='object-column';var div=createElement('div');div.className='source-code event-properties';div.style.overflow='visible';this._prefixObjectCell(div);var valueSpan=createElement('span');valueSpan.className='value object-value-'+valueStyle;valueSpan.textContent=value;div.appendChild(valueSpan);var idSpan=createElement('span');idSpan.className='object-value-id';idSpan.textContent=' @'+this.snapshotNodeId;div.appendChild(idSpan);cell.appendChild(div);cell.classList.add('disclosure');if(this.depth)
cell.style.setProperty('padding-left',(this.depth*this.dataGrid.indentWidth)+'px');cell.heapSnapshotNode=this;return cell;}
_prefixObjectCell(div){}
queryObjectContent(target,callback,objectGroupName){function onResult(object){callback(object||target.runtimeModel.createRemoteObjectFromPrimitiveValue(Common.UIString('Preview is not available')));}
var heapProfilerModel=target.model(SDK.HeapProfilerModel);if(this._type==='string')
onResult(target.runtimeModel.createRemoteObjectFromPrimitiveValue(this._name));else if(!heapProfilerModel)
onResult(null);else
heapProfilerModel.objectForSnapshotObjectId(String(this.snapshotNodeId),objectGroupName).then(onResult);}
updateHasChildren(){function isEmptyCallback(isEmpty){this.setHasChildren(!isEmpty);}
this._provider().isEmpty(isEmptyCallback.bind(this));}
shortenWindowURL(fullName,hasObjectId){var startPos=fullName.indexOf('/');var endPos=hasObjectId?fullName.indexOf('@'):fullName.length;if(startPos!==-1&&endPos!==-1){var fullURL=fullName.substring(startPos+1,endPos).trimLeft();var url=fullURL.trimURL();if(url.length>40)
url=url.trimMiddle(40);return fullName.substr(0,startPos+2)+url+fullName.substr(endPos);}else{return fullName;}}};Profiler.HeapSnapshotObjectNode=class extends Profiler.HeapSnapshotGenericObjectNode{constructor(dataGrid,snapshot,edge,parentObjectNode){super(dataGrid,edge.node);this._referenceName=edge.name;this._referenceType=edge.type;this._edgeIndex=edge.edgeIndex;this._snapshot=snapshot;this._parentObjectNode=parentObjectNode;this._cycledWithAncestorGridNode=this._findAncestorWithSameSnapshotNodeId();if(!this._cycledWithAncestorGridNode)
this.updateHasChildren();var data=this.data;data['count']='';data['addedCount']='';data['removedCount']='';data['countDelta']='';data['addedSize']='';data['removedSize']='';data['sizeDelta']='';}
retainersDataSource(){return{snapshot:this._snapshot,snapshotNodeIndex:this.snapshotNodeIndex};}
createProvider(){return this._snapshot.createEdgesProvider(this.snapshotNodeIndex);}
_findAncestorWithSameSnapshotNodeId(){var ancestor=this._parentObjectNode;while(ancestor){if(ancestor.snapshotNodeId===this.snapshotNodeId)
return ancestor;ancestor=ancestor._parentObjectNode;}
return null;}
_createChildNode(item){return new Profiler.HeapSnapshotObjectNode(this._dataGrid,this._snapshot,item,this);}
_childHashForEntity(edge){return edge.edgeIndex;}
_childHashForNode(childNode){return childNode._edgeIndex;}
comparator(){var sortAscending=this._dataGrid.isSortOrderAscending();var sortColumnId=this._dataGrid.sortColumnId();var sortFields={object:['!edgeName',sortAscending,'retainedSize',false],count:['!edgeName',true,'retainedSize',false],shallowSize:['selfSize',sortAscending,'!edgeName',true],retainedSize:['retainedSize',sortAscending,'!edgeName',true],distance:['distance',sortAscending,'_name',true]}[sortColumnId]||['!edgeName',true,'retainedSize',false];return Profiler.HeapSnapshotGridNode.createComparator(sortFields);}
_prefixObjectCell(div){var name=this._referenceName||'(empty)';var nameClass='name';switch(this._referenceType){case'context':nameClass='object-value-number';break;case'internal':case'hidden':case'weak':nameClass='object-value-null';break;case'element':name='['+name+']';break;}
if(this._cycledWithAncestorGridNode)
div.className+=' cycled-ancessor-node';var nameSpan=createElement('span');nameSpan.className=nameClass;nameSpan.textContent=name;div.appendChild(nameSpan);var separatorSpan=createElement('span');separatorSpan.className='grayed';separatorSpan.textContent=this._edgeNodeSeparator();div.appendChild(separatorSpan);}
_edgeNodeSeparator(){return' :: ';}};Profiler.HeapSnapshotRetainingObjectNode=class extends Profiler.HeapSnapshotObjectNode{constructor(dataGrid,snapshot,edge,parentRetainingObjectNode){super(dataGrid,snapshot,edge,parentRetainingObjectNode);}
createProvider(){return this._snapshot.createRetainingEdgesProvider(this.snapshotNodeIndex);}
_createChildNode(item){return new Profiler.HeapSnapshotRetainingObjectNode(this._dataGrid,this._snapshot,item,this);}
_edgeNodeSeparator(){return' in ';}
expand(){this._expandRetainersChain(20);}
_expandRetainersChain(maxExpandLevels){function populateComplete(){this.removeEventListener(Profiler.HeapSnapshotGridNode.Events.PopulateComplete,populateComplete,this);this._expandRetainersChain(maxExpandLevels);}
if(!this._populated){this.addEventListener(Profiler.HeapSnapshotGridNode.Events.PopulateComplete,populateComplete,this);this.populate();return;}
super.expand();if(--maxExpandLevels>0&&this.children.length>0){var retainer=this.children[0];if(retainer._distance>1){retainer._expandRetainersChain(maxExpandLevels);return;}}
this._dataGrid.dispatchEventToListeners(Profiler.HeapSnapshotRetainmentDataGrid.Events.ExpandRetainersComplete);}};Profiler.HeapSnapshotInstanceNode=class extends Profiler.HeapSnapshotGenericObjectNode{constructor(dataGrid,snapshot,node,isDeletedNode){super(dataGrid,node);this._baseSnapshotOrSnapshot=snapshot;this._isDeletedNode=isDeletedNode;this.updateHasChildren();var data=this.data;data['count']='';data['countDelta']='';data['sizeDelta']='';if(this._isDeletedNode){data['addedCount']='';data['addedSize']='';data['removedCount']='\u2022';data['removedSize']=Number.withThousandsSeparator(this._shallowSize);}else{data['addedCount']='\u2022';data['addedSize']=Number.withThousandsSeparator(this._shallowSize);data['removedCount']='';data['removedSize']='';}}
retainersDataSource(){return{snapshot:this._baseSnapshotOrSnapshot,snapshotNodeIndex:this.snapshotNodeIndex};}
createProvider(){return this._baseSnapshotOrSnapshot.createEdgesProvider(this.snapshotNodeIndex);}
_createChildNode(item){return new Profiler.HeapSnapshotObjectNode(this._dataGrid,this._baseSnapshotOrSnapshot,item,null);}
_childHashForEntity(edge){return edge.edgeIndex;}
_childHashForNode(childNode){return childNode._edgeIndex;}
comparator(){var sortAscending=this._dataGrid.isSortOrderAscending();var sortColumnId=this._dataGrid.sortColumnId();var sortFields={object:['!edgeName',sortAscending,'retainedSize',false],distance:['distance',sortAscending,'retainedSize',false],count:['!edgeName',true,'retainedSize',false],addedSize:['selfSize',sortAscending,'!edgeName',true],removedSize:['selfSize',sortAscending,'!edgeName',true],shallowSize:['selfSize',sortAscending,'!edgeName',true],retainedSize:['retainedSize',sortAscending,'!edgeName',true]}[sortColumnId]||['!edgeName',true,'retainedSize',false];return Profiler.HeapSnapshotGridNode.createComparator(sortFields);}};Profiler.HeapSnapshotConstructorNode=class extends Profiler.HeapSnapshotGridNode{constructor(dataGrid,className,aggregate,nodeFilter){super(dataGrid,aggregate.count>0);this._name=className;this._nodeFilter=nodeFilter;this._distance=aggregate.distance;this._count=aggregate.count;this._shallowSize=aggregate.self;this._retainedSize=aggregate.maxRet;var snapshot=dataGrid.snapshot;var countPercent=this._count/snapshot.nodeCount*100.0;var retainedSizePercent=this._retainedSize/snapshot.totalSize*100.0;var shallowSizePercent=this._shallowSize/snapshot.totalSize*100.0;this.data={'object':className,'count':Number.withThousandsSeparator(this._count),'distance':this._toUIDistance(this._distance),'shallowSize':Number.withThousandsSeparator(this._shallowSize),'retainedSize':Number.withThousandsSeparator(this._retainedSize),'count-percent':this._toPercentString(countPercent),'shallowSize-percent':this._toPercentString(shallowSizePercent),'retainedSize-percent':this._toPercentString(retainedSizePercent)};}
createProvider(){return this._dataGrid.snapshot.createNodesProviderForClass(this._name,this._nodeFilter);}
populateNodeBySnapshotObjectId(snapshotObjectId){function didExpand(){return this._provider().nodePosition(snapshotObjectId).then(didGetNodePosition.bind(this));}
function didGetNodePosition(nodePosition){if(nodePosition===-1){this.collapse();return Promise.resolve([]);}else{function action(fulfill){this._populateChildren(nodePosition,null,didPopulateChildren.bind(this,nodePosition,fulfill));}
return new Promise(action.bind(this));}}
function didPopulateChildren(nodePosition,callback){var node=(this.childForPosition(nodePosition));callback(node?[this,node]:[]);}
this._dataGrid.resetNameFilter();return this.expandWithoutPopulate().then(didExpand.bind(this));}
filteredOut(filterValue){return this._name.toLowerCase().indexOf(filterValue)===-1;}
createCell(columnId){var cell=columnId!=='object'?this._createValueCell(columnId):super.createCell(columnId);if(this._searchMatched)
cell.classList.add('highlight');return cell;}
_createChildNode(item){return new Profiler.HeapSnapshotInstanceNode(this._dataGrid,this._dataGrid.snapshot,item,false);}
comparator(){var sortAscending=this._dataGrid.isSortOrderAscending();var sortColumnId=this._dataGrid.sortColumnId();var sortFields={object:['name',sortAscending,'id',true],distance:['distance',sortAscending,'retainedSize',false],count:['name',true,'id',true],shallowSize:['selfSize',sortAscending,'id',true],retainedSize:['retainedSize',sortAscending,'id',true]}[sortColumnId];return Profiler.HeapSnapshotGridNode.createComparator(sortFields);}
_childHashForEntity(node){return node.id;}
_childHashForNode(childNode){return childNode.snapshotNodeId;}};Profiler.HeapSnapshotDiffNodesProvider=class{constructor(addedNodesProvider,deletedNodesProvider,addedCount,removedCount){this._addedNodesProvider=addedNodesProvider;this._deletedNodesProvider=deletedNodesProvider;this._addedCount=addedCount;this._removedCount=removedCount;}
dispose(){this._addedNodesProvider.dispose();this._deletedNodesProvider.dispose();}
nodePosition(snapshotObjectId){throw new Error('Unreachable');}
isEmpty(callback){callback(false);}
serializeItemsRange(beginPosition,endPosition,callback){function didReceiveAllItems(items){items.totalLength=this._addedCount+this._removedCount;callback(items);}
function didReceiveDeletedItems(addedItems,itemsRange){var items=itemsRange.items;if(!addedItems.items.length)
addedItems.startPosition=this._addedCount+itemsRange.startPosition;for(var i=0;i<items.length;i++){items[i].isAddedNotRemoved=false;addedItems.items.push(items[i]);}
addedItems.endPosition=this._addedCount+itemsRange.endPosition;didReceiveAllItems.call(this,addedItems);}
function didReceiveAddedItems(itemsRange){var items=itemsRange.items;for(var i=0;i<items.length;i++)
items[i].isAddedNotRemoved=true;if(itemsRange.endPosition<endPosition){return this._deletedNodesProvider.serializeItemsRange(0,endPosition-itemsRange.endPosition,didReceiveDeletedItems.bind(this,itemsRange));}
itemsRange.totalLength=this._addedCount+this._removedCount;didReceiveAllItems.call(this,itemsRange);}
if(beginPosition<this._addedCount){this._addedNodesProvider.serializeItemsRange(beginPosition,endPosition,didReceiveAddedItems.bind(this));}else{var emptyRange=new HeapSnapshotModel.ItemsRange(0,0,0,[]);this._deletedNodesProvider.serializeItemsRange(beginPosition-this._addedCount,endPosition-this._addedCount,didReceiveDeletedItems.bind(this,emptyRange));}}
sortAndRewind(comparator){function afterSort(){return this._deletedNodesProvider.sortAndRewind(comparator);}
return this._addedNodesProvider.sortAndRewind(comparator).then(afterSort.bind(this));}};Profiler.HeapSnapshotDiffNode=class extends Profiler.HeapSnapshotGridNode{constructor(dataGrid,className,diffForClass){super(dataGrid,true);this._name=className;this._addedCount=diffForClass.addedCount;this._removedCount=diffForClass.removedCount;this._countDelta=diffForClass.countDelta;this._addedSize=diffForClass.addedSize;this._removedSize=diffForClass.removedSize;this._sizeDelta=diffForClass.sizeDelta;this._deletedIndexes=diffForClass.deletedIndexes;this.data={'object':className,'addedCount':Number.withThousandsSeparator(this._addedCount),'removedCount':Number.withThousandsSeparator(this._removedCount),'countDelta':this._signForDelta(this._countDelta)+Number.withThousandsSeparator(Math.abs(this._countDelta)),'addedSize':Number.withThousandsSeparator(this._addedSize),'removedSize':Number.withThousandsSeparator(this._removedSize),'sizeDelta':this._signForDelta(this._sizeDelta)+Number.withThousandsSeparator(Math.abs(this._sizeDelta))};}
createProvider(){var tree=this._dataGrid;return new Profiler.HeapSnapshotDiffNodesProvider(tree.snapshot.createAddedNodesProvider(tree.baseSnapshot.uid,this._name),tree.baseSnapshot.createDeletedNodesProvider(this._deletedIndexes),this._addedCount,this._removedCount);}
createCell(columnId){var cell=super.createCell(columnId);if(columnId!=='object')
cell.classList.add('numeric-column');return cell;}
_createChildNode(item){if(item.isAddedNotRemoved)
return new Profiler.HeapSnapshotInstanceNode(this._dataGrid,this._dataGrid.snapshot,item,false);else
return new Profiler.HeapSnapshotInstanceNode(this._dataGrid,this._dataGrid.baseSnapshot,item,true);}
_childHashForEntity(node){return node.id;}
_childHashForNode(childNode){return childNode.snapshotNodeId;}
comparator(){var sortAscending=this._dataGrid.isSortOrderAscending();var sortColumnId=this._dataGrid.sortColumnId();var sortFields={object:['name',sortAscending,'id',true],addedCount:['name',true,'id',true],removedCount:['name',true,'id',true],countDelta:['name',true,'id',true],addedSize:['selfSize',sortAscending,'id',true],removedSize:['selfSize',sortAscending,'id',true],sizeDelta:['selfSize',sortAscending,'id',true]}[sortColumnId];return Profiler.HeapSnapshotGridNode.createComparator(sortFields);}
filteredOut(filterValue){return this._name.toLowerCase().indexOf(filterValue)===-1;}
_signForDelta(delta){if(delta===0)
return'';if(delta>0)
return'+';else
return'\u2212';}};Profiler.AllocationGridNode=class extends Profiler.HeapSnapshotGridNode{constructor(dataGrid,data){super(dataGrid,data.hasChildren);this._populated=false;this._allocationNode=data;this.data={'liveCount':Number.withThousandsSeparator(data.liveCount),'count':Number.withThousandsSeparator(data.count),'liveSize':Number.withThousandsSeparator(data.liveSize),'size':Number.withThousandsSeparator(data.size),'name':data.name};}
populate(){if(this._populated)
return;this._populated=true;this._dataGrid.snapshot.allocationNodeCallers(this._allocationNode.id,didReceiveCallers.bind(this));function didReceiveCallers(callers){var callersChain=callers.nodesWithSingleCaller;var parentNode=this;var dataGrid=(this._dataGrid);for(var i=0;i<callersChain.length;i++){var child=new Profiler.AllocationGridNode(dataGrid,callersChain[i]);dataGrid.appendNode(parentNode,child);parentNode=child;parentNode._populated=true;if(this.expanded)
parentNode.expand();}
var callersBranch=callers.branchingCallers;callersBranch.sort(this._dataGrid._createComparator());for(var i=0;i<callersBranch.length;i++)
dataGrid.appendNode(parentNode,new Profiler.AllocationGridNode(dataGrid,callersBranch[i]));dataGrid.updateVisibleNodes(true);}}
expand(){super.expand();if(this.children.length===1)
this.children[0].expand();}
createCell(columnId){if(columnId!=='name')
return this._createValueCell(columnId);var cell=super.createCell(columnId);var allocationNode=this._allocationNode;var target=this._dataGrid.target();if(allocationNode.scriptId){var linkifier=this._dataGrid._linkifier;var urlElement=linkifier.linkifyScriptLocation(target,String(allocationNode.scriptId),allocationNode.scriptName,allocationNode.line-1,allocationNode.column-1,'profile-node-file');urlElement.style.maxWidth='75%';cell.insertBefore(urlElement,cell.firstChild);}
return cell;}
allocationNodeId(){return this._allocationNode.id;}};;Profiler.HeapSnapshotView=class extends UI.SimpleView{constructor(dataDisplayDelegate,profile){super(Common.UIString('Heap Snapshot'));this.element.classList.add('heap-snapshot-view');this._profile=profile;profile.profileType().addEventListener(Profiler.HeapSnapshotProfileType.SnapshotReceived,this._onReceiveSnapshot,this);profile.profileType().addEventListener(Profiler.ProfileType.Events.RemoveProfileHeader,this._onProfileHeaderRemoved,this);var isHeapTimeline=profile.profileType().id===Profiler.TrackingHeapSnapshotProfileType.TypeId;if(isHeapTimeline){this._trackingOverviewGrid=new Profiler.HeapTrackingOverviewGrid(profile);this._trackingOverviewGrid.addEventListener(Profiler.HeapTrackingOverviewGrid.IdsRangeChanged,this._onIdsRangeChanged.bind(this));}
this._parentDataDisplayDelegate=dataDisplayDelegate;this._searchableView=new UI.SearchableView(this);this._searchableView.show(this.element);this._splitWidget=new UI.SplitWidget(false,true,'heapSnapshotSplitViewState',200,200);this._splitWidget.show(this._searchableView.element);this._containmentDataGrid=new Profiler.HeapSnapshotContainmentDataGrid(this);this._containmentDataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode,this._selectionChanged,this);this._containmentWidget=this._containmentDataGrid.asWidget();this._containmentWidget.setMinimumSize(50,25);this._statisticsView=new Profiler.HeapSnapshotStatisticsView();this._constructorsDataGrid=new Profiler.HeapSnapshotConstructorsDataGrid(this);this._constructorsDataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode,this._selectionChanged,this);this._constructorsWidget=this._constructorsDataGrid.asWidget();this._constructorsWidget.setMinimumSize(50,25);this._diffDataGrid=new Profiler.HeapSnapshotDiffDataGrid(this);this._diffDataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode,this._selectionChanged,this);this._diffWidget=this._diffDataGrid.asWidget();this._diffWidget.setMinimumSize(50,25);if(isHeapTimeline&&Common.moduleSetting('recordAllocationStacks').get()){this._allocationDataGrid=new Profiler.AllocationDataGrid(profile.target(),this);this._allocationDataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode,this._onSelectAllocationNode,this);this._allocationWidget=this._allocationDataGrid.asWidget();this._allocationWidget.setMinimumSize(50,25);this._allocationStackView=new Profiler.HeapAllocationStackView(profile.target());this._allocationStackView.setMinimumSize(50,25);this._tabbedPane=new UI.TabbedPane();}
this._retainmentDataGrid=new Profiler.HeapSnapshotRetainmentDataGrid(this);this._retainmentWidget=this._retainmentDataGrid.asWidget();this._retainmentWidget.setMinimumSize(50,21);this._retainmentWidget.element.classList.add('retaining-paths-view');var splitWidgetResizer;if(this._allocationStackView){this._tabbedPane=new UI.TabbedPane();this._tabbedPane.appendTab('retainers',Common.UIString('Retainers'),this._retainmentWidget);this._tabbedPane.appendTab('allocation-stack',Common.UIString('Allocation stack'),this._allocationStackView);splitWidgetResizer=this._tabbedPane.headerElement();this._objectDetailsView=this._tabbedPane;}else{var retainmentViewHeader=createElementWithClass('div','heap-snapshot-view-resizer');var retainingPathsTitleDiv=retainmentViewHeader.createChild('div','title');var retainingPathsTitle=retainingPathsTitleDiv.createChild('span');retainingPathsTitle.textContent=Common.UIString('Retainers');splitWidgetResizer=retainmentViewHeader;this._objectDetailsView=new UI.VBox();this._objectDetailsView.element.appendChild(retainmentViewHeader);this._retainmentWidget.show(this._objectDetailsView.element);}
this._splitWidget.hideDefaultResizer();this._splitWidget.installResizer(splitWidgetResizer);this._retainmentDataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode,this._inspectedObjectChanged,this);this._retainmentDataGrid.reset();this._perspectives=[];this._comparisonPerspective=new Profiler.HeapSnapshotView.ComparisonPerspective();this._perspectives.push(new Profiler.HeapSnapshotView.SummaryPerspective());if(profile.profileType()!==Profiler.ProfileTypeRegistry.instance.trackingHeapSnapshotProfileType)
this._perspectives.push(this._comparisonPerspective);this._perspectives.push(new Profiler.HeapSnapshotView.ContainmentPerspective());if(this._allocationWidget)
this._perspectives.push(new Profiler.HeapSnapshotView.AllocationPerspective());this._perspectives.push(new Profiler.HeapSnapshotView.StatisticsPerspective());this._perspectiveSelect=new UI.ToolbarComboBox(this._onSelectedPerspectiveChanged.bind(this));this._updatePerspectiveOptions();this._baseSelect=new UI.ToolbarComboBox(this._changeBase.bind(this));this._baseSelect.setVisible(false);this._updateBaseOptions();this._filterSelect=new UI.ToolbarComboBox(this._changeFilter.bind(this));this._filterSelect.setVisible(false);this._updateFilterOptions();this._classNameFilter=new UI.ToolbarInput('Class filter');this._classNameFilter.setVisible(false);this._constructorsDataGrid.setNameFilter(this._classNameFilter);this._diffDataGrid.setNameFilter(this._classNameFilter);this._selectedSizeText=new UI.ToolbarText();this._popoverHelper=new UI.PopoverHelper(this.element,true);this._popoverHelper.initializeCallbacks(this._getHoverAnchor.bind(this),this._showObjectPopover.bind(this),this._onHidePopover.bind(this));this._popoverHelper.setHasPadding(true);this.element.addEventListener('scroll',this._popoverHelper.hidePopover.bind(this._popoverHelper),true);this._currentPerspectiveIndex=0;this._currentPerspective=this._perspectives[0];this._currentPerspective.activate(this);this._dataGrid=this._currentPerspective.masterGrid(this);this._populate();this._searchThrottler=new Common.Throttler(0);}
searchableView(){return this._searchableView;}
showProfile(profile){return this._parentDataDisplayDelegate.showProfile(profile);}
showObject(snapshotObjectId,perspectiveName){if(snapshotObjectId<=this._profile.maxJSObjectId)
this.selectLiveObject(perspectiveName,snapshotObjectId);else
this._parentDataDisplayDelegate.showObject(snapshotObjectId,perspectiveName);}
_populate(){this._profile._loadPromise.then(heapSnapshotProxy=>{heapSnapshotProxy.getStatistics().then(this._gotStatistics.bind(this));this._dataGrid.setDataSource(heapSnapshotProxy);if(this._profile.profileType().id===Profiler.TrackingHeapSnapshotProfileType.TypeId&&this._profile.fromFile())
return heapSnapshotProxy.getSamples().then(samples=>this._trackingOverviewGrid._setSamples(samples));}).then(_=>{var list=this._profiles();var profileIndex=list.indexOf(this._profile);this._baseSelect.setSelectedIndex(Math.max(0,profileIndex-1));if(this._trackingOverviewGrid)
this._trackingOverviewGrid._updateGrid();});}
_gotStatistics(statistics){this._statisticsView.setTotal(statistics.total);this._statisticsView.addRecord(statistics.code,Common.UIString('Code'),'#f77');this._statisticsView.addRecord(statistics.strings,Common.UIString('Strings'),'#5e5');this._statisticsView.addRecord(statistics.jsArrays,Common.UIString('JS Arrays'),'#7af');this._statisticsView.addRecord(statistics.native,Common.UIString('Typed Arrays'),'#fc5');this._statisticsView.addRecord(statistics.system,Common.UIString('System Objects'),'#98f');this._statisticsView.addRecord(statistics.total,Common.UIString('Total'));}
_onIdsRangeChanged(event){var minId=event.data.minId;var maxId=event.data.maxId;this._selectedSizeText.setText(Common.UIString('Selected size: %s',Number.bytesToString(event.data.size)));if(this._constructorsDataGrid.snapshot)
this._constructorsDataGrid.setSelectionRange(minId,maxId);}
syncToolbarItems(){var result=[this._perspectiveSelect,this._classNameFilter];if(this._profile.profileType()!==Profiler.ProfileTypeRegistry.instance.trackingHeapSnapshotProfileType)
result.push(this._baseSelect,this._filterSelect);result.push(this._selectedSizeText);return result;}
wasShown(){this._profile._loadPromise.then(this._profile._wasShown.bind(this._profile));}
willHide(){this._currentSearchResultIndex=-1;this._popoverHelper.hidePopover();}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return false;}
searchCanceled(){this._currentSearchResultIndex=-1;this._searchResults=[];}
_selectRevealedNode(node){if(node)
node.select();}
performSearch(searchConfig,shouldJump,jumpBackwards){var nextQuery=new HeapSnapshotModel.SearchConfig(searchConfig.query.trim(),searchConfig.caseSensitive,searchConfig.isRegex,shouldJump,jumpBackwards||false);this._searchThrottler.schedule(this._performSearch.bind(this,nextQuery));}
_performSearch(nextQuery){this.searchCanceled();if(!this._currentPerspective.supportsSearch())
return Promise.resolve();this.currentQuery=nextQuery;var query=nextQuery.query.trim();if(!query)
return Promise.resolve();if(query.charAt(0)==='@'){var snapshotNodeId=parseInt(query.substring(1),10);if(isNaN(snapshotNodeId))
return Promise.resolve();return this._dataGrid.revealObjectByHeapSnapshotId(String(snapshotNodeId)).then(this._selectRevealedNode.bind(this));}
function didSearch(entryIds){this._searchResults=entryIds;this._searchableView.updateSearchMatchesCount(this._searchResults.length);if(this._searchResults.length)
this._currentSearchResultIndex=nextQuery.jumpBackwards?this._searchResults.length-1:0;return this._jumpToSearchResult(this._currentSearchResultIndex);}
return this._profile._snapshotProxy.search(this.currentQuery,this._dataGrid.nodeFilter()).then(didSearch.bind(this));}
jumpToNextSearchResult(){if(!this._searchResults.length)
return;this._currentSearchResultIndex=(this._currentSearchResultIndex+1)%this._searchResults.length;this._searchThrottler.schedule(this._jumpToSearchResult.bind(this,this._currentSearchResultIndex));}
jumpToPreviousSearchResult(){if(!this._searchResults.length)
return;this._currentSearchResultIndex=(this._currentSearchResultIndex+this._searchResults.length-1)%this._searchResults.length;this._searchThrottler.schedule(this._jumpToSearchResult.bind(this,this._currentSearchResultIndex));}
_jumpToSearchResult(searchResultIndex){this._searchableView.updateCurrentMatchIndex(searchResultIndex);return this._dataGrid.revealObjectByHeapSnapshotId(String(this._searchResults[searchResultIndex])).then(this._selectRevealedNode.bind(this));}
refreshVisibleData(){if(!this._dataGrid)
return;var child=this._dataGrid.rootNode().children[0];while(child){child.refresh();child=child.traverseNextNode(false,null,true);}}
_changeBase(){if(this._baseProfile===this._profiles()[this._baseSelect.selectedIndex()])
return;this._baseProfile=this._profiles()[this._baseSelect.selectedIndex()];var dataGrid=(this._dataGrid);if(dataGrid.snapshot)
this._baseProfile._loadPromise.then(dataGrid.setBaseDataSource.bind(dataGrid));if(!this.currentQuery||!this._searchResults)
return;this.performSearch(this.currentQuery,false);}
_changeFilter(){var profileIndex=this._filterSelect.selectedIndex()-1;this._dataGrid.filterSelectIndexChanged(this._profiles(),profileIndex);if(!this.currentQuery||!this._searchResults)
return;this.performSearch(this.currentQuery,false);}
_profiles(){return this._profile.profileType().getProfiles();}
populateContextMenu(contextMenu,event){if(this._dataGrid)
this._dataGrid.populateContextMenu(contextMenu,event);}
_selectionChanged(event){var selectedNode=(event.data);this._setSelectedNodeForDetailsView(selectedNode);this._inspectedObjectChanged(event);}
_onSelectAllocationNode(event){var selectedNode=(event.data);this._constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());this._setSelectedNodeForDetailsView(null);}
_inspectedObjectChanged(event){var selectedNode=(event.data);var target=this._profile.target();var heapProfilerModel=target?target.model(SDK.HeapProfilerModel):null;if(heapProfilerModel&&selectedNode instanceof Profiler.HeapSnapshotGenericObjectNode)
heapProfilerModel.addInspectedHeapObject(String(selectedNode.snapshotNodeId));}
_setSelectedNodeForDetailsView(nodeItem){var dataSource=nodeItem&&nodeItem.retainersDataSource();if(dataSource){this._retainmentDataGrid.setDataSource(dataSource.snapshot,dataSource.snapshotNodeIndex);if(this._allocationStackView)
this._allocationStackView.setAllocatedObject(dataSource.snapshot,dataSource.snapshotNodeIndex);}else{if(this._allocationStackView)
this._allocationStackView.clear();this._retainmentDataGrid.reset();}}
_changePerspectiveAndWait(perspectiveTitle,callback){const perspectiveIndex=this._perspectives.findIndex(perspective=>perspective.title()===perspectiveTitle);if(perspectiveIndex===-1||this._currentPerspectiveIndex===perspectiveIndex){setTimeout(callback,0);return;}
function dataGridContentShown(event){var dataGrid=event.data;dataGrid.removeEventListener(Profiler.HeapSnapshotSortableDataGrid.Events.ContentShown,dataGridContentShown,this);if(dataGrid===this._dataGrid)
callback();}
this._perspectives[perspectiveIndex].masterGrid(this).addEventListener(Profiler.HeapSnapshotSortableDataGrid.Events.ContentShown,dataGridContentShown,this);const option=this._perspectiveSelect.options().find(option=>option.value===perspectiveIndex);this._perspectiveSelect.select((option));this._changePerspective(perspectiveIndex);}
_updateDataSourceAndView(){var dataGrid=this._dataGrid;if(!dataGrid||dataGrid.snapshot)
return;this._profile._loadPromise.then(didLoadSnapshot.bind(this));function didLoadSnapshot(snapshotProxy){if(this._dataGrid!==dataGrid)
return;if(dataGrid.snapshot!==snapshotProxy)
dataGrid.setDataSource(snapshotProxy);if(dataGrid===this._diffDataGrid){if(!this._baseProfile)
this._baseProfile=this._profiles()[this._baseSelect.selectedIndex()];this._baseProfile._loadPromise.then(didLoadBaseSnapshot.bind(this));}}
function didLoadBaseSnapshot(baseSnapshotProxy){if(this._diffDataGrid.baseSnapshot!==baseSnapshotProxy)
this._diffDataGrid.setBaseDataSource(baseSnapshotProxy);}}
_onSelectedPerspectiveChanged(event){this._changePerspective(event.target.selectedOptions[0].value);}
_changePerspective(selectedIndex){if(selectedIndex===this._currentPerspectiveIndex)
return;this._currentPerspectiveIndex=selectedIndex;this._currentPerspective.deactivate(this);var perspective=this._perspectives[selectedIndex];this._currentPerspective=perspective;this._dataGrid=perspective.masterGrid(this);perspective.activate(this);this.refreshVisibleData();if(this._dataGrid)
this._dataGrid.updateWidths();this._updateDataSourceAndView();if(!this.currentQuery||!this._searchResults)
return;this.performSearch(this.currentQuery,false);}
selectLiveObject(perspectiveName,snapshotObjectId){this._changePerspectiveAndWait(perspectiveName,didChangePerspective.bind(this));function didChangePerspective(){this._dataGrid.revealObjectByHeapSnapshotId(snapshotObjectId,didRevealObject);}
function didRevealObject(node){if(node)
node.select();else
Common.console.error('Cannot find corresponding heap snapshot node');}}
_getHoverAnchor(target){var span=target.enclosingNodeOrSelfWithNodeName('span');if(!span)
return;var row=target.enclosingNodeOrSelfWithNodeName('tr');if(!row)
return;span.node=row._dataGridNode;return span;}
_showObjectPopover(element,popover){if(!this._profile.target()||!element.node)
return Promise.resolve(false);var fulfill;var promise=new Promise(x=>fulfill=x);element.node.queryObjectContent(this._profile.target(),onObjectResolved.bind(this),'popover');return promise;function onObjectResolved(result){if(!result){fulfill(false);return;}
ObjectUI.ObjectPopoverHelper.buildObjectPopover(result,popover).then(objectPopoverHelper=>{if(!objectPopoverHelper){this._onHidePopover();fulfill(false);return;}
this._objectPopoverHelper=objectPopoverHelper;fulfill(true);});}}
_onHidePopover(){if(this._objectPopoverHelper){this._objectPopoverHelper.dispose();delete this._objectPopoverHelper;}
this._profile.target().runtimeModel.releaseObjectGroup('popover');}
_updatePerspectiveOptions(){const multipleSnapshots=this._profiles().length>1;this._perspectiveSelect.removeOptions();this._perspectives.forEach((perspective,index)=>{if(multipleSnapshots||perspective!==this._comparisonPerspective)
this._perspectiveSelect.createOption(perspective.title(),'',String(index));});}
_updateBaseOptions(){var list=this._profiles();if(this._baseSelect.size()===list.length)
return;for(var i=this._baseSelect.size(),n=list.length;i<n;++i){var title=list[i].title;this._baseSelect.createOption(title);}}
_updateFilterOptions(){var list=this._profiles();if(this._filterSelect.size()-1===list.length)
return;if(!this._filterSelect.size())
this._filterSelect.createOption(Common.UIString('All objects'));for(var i=this._filterSelect.size()-1,n=list.length;i<n;++i){var title=list[i].title;if(!i)
title=Common.UIString('Objects allocated before %s',title);else
title=Common.UIString('Objects allocated between %s and %s',list[i-1].title,title);this._filterSelect.createOption(title);}}
_updateControls(){this._updatePerspectiveOptions();this._updateBaseOptions();this._updateFilterOptions();}
_onReceiveSnapshot(event){this._updateControls();}
_onProfileHeaderRemoved(event){var profile=event.data;if(this._profile===profile){this.detach();this._profile.profileType().removeEventListener(Profiler.HeapSnapshotProfileType.SnapshotReceived,this._onReceiveSnapshot,this);this._profile.profileType().removeEventListener(Profiler.ProfileType.Events.RemoveProfileHeader,this._onProfileHeaderRemoved,this);this.dispose();}else{this._updateControls();}}
dispose(){if(this._allocationStackView){this._allocationStackView.clear();this._allocationDataGrid.dispose();}
if(this._trackingOverviewGrid)
this._trackingOverviewGrid.dispose();}};Profiler.HeapSnapshotView.Perspective=class{constructor(title){this._title=title;}
activate(heapSnapshotView){}
deactivate(heapSnapshotView){heapSnapshotView._baseSelect.setVisible(false);heapSnapshotView._filterSelect.setVisible(false);heapSnapshotView._classNameFilter.setVisible(false);if(heapSnapshotView._trackingOverviewGrid)
heapSnapshotView._trackingOverviewGrid.detach();if(heapSnapshotView._allocationWidget)
heapSnapshotView._allocationWidget.detach();if(heapSnapshotView._statisticsView)
heapSnapshotView._statisticsView.detach();heapSnapshotView._splitWidget.detach();heapSnapshotView._splitWidget.detachChildWidgets();}
masterGrid(heapSnapshotView){return null;}
title(){return this._title;}
supportsSearch(){return false;}};Profiler.HeapSnapshotView.SummaryPerspective=class extends Profiler.HeapSnapshotView.Perspective{constructor(){super(Common.UIString('Summary'));}
activate(heapSnapshotView){heapSnapshotView._splitWidget.setMainWidget(heapSnapshotView._constructorsWidget);heapSnapshotView._splitWidget.setSidebarWidget(heapSnapshotView._objectDetailsView);heapSnapshotView._splitWidget.show(heapSnapshotView._searchableView.element);heapSnapshotView._filterSelect.setVisible(true);heapSnapshotView._classNameFilter.setVisible(true);if(!heapSnapshotView._trackingOverviewGrid)
return;heapSnapshotView._trackingOverviewGrid.show(heapSnapshotView._searchableView.element,heapSnapshotView._splitWidget.element);heapSnapshotView._trackingOverviewGrid.update();heapSnapshotView._trackingOverviewGrid._updateGrid();}
masterGrid(heapSnapshotView){return heapSnapshotView._constructorsDataGrid;}
supportsSearch(){return true;}};Profiler.HeapSnapshotView.ComparisonPerspective=class extends Profiler.HeapSnapshotView.Perspective{constructor(){super(Common.UIString('Comparison'));}
activate(heapSnapshotView){heapSnapshotView._splitWidget.setMainWidget(heapSnapshotView._diffWidget);heapSnapshotView._splitWidget.setSidebarWidget(heapSnapshotView._objectDetailsView);heapSnapshotView._splitWidget.show(heapSnapshotView._searchableView.element);heapSnapshotView._baseSelect.setVisible(true);heapSnapshotView._classNameFilter.setVisible(true);}
masterGrid(heapSnapshotView){return heapSnapshotView._diffDataGrid;}
supportsSearch(){return true;}};Profiler.HeapSnapshotView.ContainmentPerspective=class extends Profiler.HeapSnapshotView.Perspective{constructor(){super(Common.UIString('Containment'));}
activate(heapSnapshotView){heapSnapshotView._splitWidget.setMainWidget(heapSnapshotView._containmentWidget);heapSnapshotView._splitWidget.setSidebarWidget(heapSnapshotView._objectDetailsView);heapSnapshotView._splitWidget.show(heapSnapshotView._searchableView.element);}
masterGrid(heapSnapshotView){return heapSnapshotView._containmentDataGrid;}};Profiler.HeapSnapshotView.AllocationPerspective=class extends Profiler.HeapSnapshotView.Perspective{constructor(){super(Common.UIString('Allocation'));this._allocationSplitWidget=new UI.SplitWidget(false,true,'heapSnapshotAllocationSplitViewState',200,200);this._allocationSplitWidget.setSidebarWidget(new UI.VBox());}
activate(heapSnapshotView){this._allocationSplitWidget.setMainWidget(heapSnapshotView._allocationWidget);heapSnapshotView._splitWidget.setMainWidget(heapSnapshotView._constructorsWidget);heapSnapshotView._splitWidget.setSidebarWidget(heapSnapshotView._objectDetailsView);var allocatedObjectsView=new UI.VBox();var resizer=createElementWithClass('div','heap-snapshot-view-resizer');var title=resizer.createChild('div','title').createChild('span');title.textContent=Common.UIString('Live objects');this._allocationSplitWidget.hideDefaultResizer();this._allocationSplitWidget.installResizer(resizer);allocatedObjectsView.element.appendChild(resizer);heapSnapshotView._splitWidget.show(allocatedObjectsView.element);this._allocationSplitWidget.setSidebarWidget(allocatedObjectsView);this._allocationSplitWidget.show(heapSnapshotView._searchableView.element);heapSnapshotView._constructorsDataGrid.clear();var selectedNode=heapSnapshotView._allocationDataGrid.selectedNode;if(selectedNode)
heapSnapshotView._constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());}
deactivate(heapSnapshotView){this._allocationSplitWidget.detach();super.deactivate(heapSnapshotView);}
masterGrid(heapSnapshotView){return heapSnapshotView._allocationDataGrid;}};Profiler.HeapSnapshotView.StatisticsPerspective=class extends Profiler.HeapSnapshotView.Perspective{constructor(){super(Common.UIString('Statistics'));}
activate(heapSnapshotView){heapSnapshotView._statisticsView.show(heapSnapshotView._searchableView.element);}
masterGrid(heapSnapshotView){return null;}};Profiler.HeapSnapshotProfileType=class extends Profiler.ProfileType{constructor(id,title){super(id||Profiler.HeapSnapshotProfileType.TypeId,title||Common.UIString('Take Heap Snapshot'));SDK.targetManager.observeModels(SDK.HeapProfilerModel,this);SDK.targetManager.addModelListener(SDK.HeapProfilerModel,SDK.HeapProfilerModel.Events.ResetProfiles,this._resetProfiles,this);SDK.targetManager.addModelListener(SDK.HeapProfilerModel,SDK.HeapProfilerModel.Events.AddHeapSnapshotChunk,this._addHeapSnapshotChunk,this);SDK.targetManager.addModelListener(SDK.HeapProfilerModel,SDK.HeapProfilerModel.Events.ReportHeapSnapshotProgress,this._reportHeapSnapshotProgress,this);}
modelAdded(heapProfilerModel){heapProfilerModel.enable();}
modelRemoved(heapProfilerModel){}
fileExtension(){return'.heapsnapshot';}
get buttonTooltip(){return Common.UIString('Take heap snapshot');}
isInstantProfile(){return true;}
buttonClicked(){this._takeHeapSnapshot(function(){});Host.userMetrics.actionTaken(Host.UserMetrics.Action.ProfilesHeapProfileTaken);return false;}
get treeItemTitle(){return Common.UIString('HEAP SNAPSHOTS');}
get description(){return Common.UIString('Heap snapshot profiles show memory distribution among your page\'s JavaScript objects and related DOM nodes.');}
createProfileLoadedFromFile(title){return new Profiler.HeapProfileHeader(null,this,title);}
_takeHeapSnapshot(callback){if(this.profileBeingRecorded())
return;var heapProfilerModel=UI.context.flavor(SDK.HeapProfilerModel);if(!heapProfilerModel)
return;var profile=new Profiler.HeapProfileHeader(heapProfilerModel.target(),this);this.setProfileBeingRecorded(profile);this.addProfile(profile);profile.updateStatus(Common.UIString('Snapshotting\u2026'));heapProfilerModel.takeHeapSnapshot(true).then(success=>{var profile=this.profileBeingRecorded();profile.title=Common.UIString('Snapshot %d',profile.uid);profile._finishLoad();this.setProfileBeingRecorded(null);this.dispatchEventToListeners(Profiler.ProfileType.Events.ProfileComplete,profile);callback();});}
_addHeapSnapshotChunk(event){if(!this.profileBeingRecorded())
return;var chunk=(event.data);this.profileBeingRecorded().transferChunk(chunk);}
_reportHeapSnapshotProgress(event){var profile=this.profileBeingRecorded();if(!profile)
return;var data=(event.data);profile.updateStatus(Common.UIString('%.0f%%',(data.done/data.total)*100),true);if(data.finished)
profile._prepareToLoad();}
_resetProfiles(event){var heapProfilerModel=(event.data);this.reset(heapProfilerModel.target());}
_snapshotReceived(profile){if(this.profileBeingRecorded()===profile)
this.setProfileBeingRecorded(null);this.dispatchEventToListeners(Profiler.HeapSnapshotProfileType.SnapshotReceived,profile);}};Profiler.HeapSnapshotProfileType.TypeId='HEAP';Profiler.HeapSnapshotProfileType.SnapshotReceived='SnapshotReceived';Profiler.TrackingHeapSnapshotProfileType=class extends Profiler.HeapSnapshotProfileType{constructor(){super(Profiler.TrackingHeapSnapshotProfileType.TypeId,Common.UIString('Record Allocation Timeline'));}
modelAdded(heapProfilerModel){super.modelAdded(heapProfilerModel);heapProfilerModel.addEventListener(SDK.HeapProfilerModel.Events.HeapStatsUpdate,this._heapStatsUpdate,this);heapProfilerModel.addEventListener(SDK.HeapProfilerModel.Events.LastSeenObjectId,this._lastSeenObjectId,this);}
modelRemoved(heapProfilerModel){super.modelRemoved(heapProfilerModel);heapProfilerModel.removeEventListener(SDK.HeapProfilerModel.Events.HeapStatsUpdate,this._heapStatsUpdate,this);heapProfilerModel.removeEventListener(SDK.HeapProfilerModel.Events.LastSeenObjectId,this._lastSeenObjectId,this);}
_heapStatsUpdate(event){if(!this._profileSamples)
return;var samples=(event.data);var index;for(var i=0;i<samples.length;i+=3){index=samples[i];var size=samples[i+2];this._profileSamples.sizes[index]=size;if(!this._profileSamples.max[index])
this._profileSamples.max[index]=size;}}
_lastSeenObjectId(event){var profileSamples=this._profileSamples;if(!profileSamples)
return;var data=(event.data);var currentIndex=Math.max(profileSamples.ids.length,profileSamples.max.length-1);profileSamples.ids[currentIndex]=data.lastSeenObjectId;if(!profileSamples.max[currentIndex]){profileSamples.max[currentIndex]=0;profileSamples.sizes[currentIndex]=0;}
profileSamples.timestamps[currentIndex]=data.timestamp;if(profileSamples.totalTime<data.timestamp-profileSamples.timestamps[0])
profileSamples.totalTime*=2;this.dispatchEventToListeners(Profiler.TrackingHeapSnapshotProfileType.HeapStatsUpdate,this._profileSamples);this.profileBeingRecorded().updateStatus(null,true);}
hasTemporaryView(){return true;}
get buttonTooltip(){return this._recording?Common.UIString('Stop recording heap profile'):Common.UIString('Start recording heap profile');}
isInstantProfile(){return false;}
buttonClicked(){return this._toggleRecording();}
_startRecordingProfile(){if(this.profileBeingRecorded())
return;var heapProfilerModel=this._addNewProfile();if(!heapProfilerModel)
return;var recordAllocationStacks=Common.moduleSetting('recordAllocationStacks').get();heapProfilerModel.startTrackingHeapObjects(recordAllocationStacks);}
_addNewProfile(){var heapProfilerModel=UI.context.flavor(SDK.HeapProfilerModel);if(!heapProfilerModel)
return null;this.setProfileBeingRecorded(new Profiler.HeapProfileHeader(heapProfilerModel.target(),this,undefined));this._profileSamples=new Profiler.TrackingHeapSnapshotProfileType.Samples();this.profileBeingRecorded()._profileSamples=this._profileSamples;this._recording=true;this.addProfile((this.profileBeingRecorded()));this.profileBeingRecorded().updateStatus(Common.UIString('Recording\u2026'));this.dispatchEventToListeners(Profiler.TrackingHeapSnapshotProfileType.TrackingStarted);return heapProfilerModel;}
_stopRecordingProfile(){var heapProfilerModel=(this.profileBeingRecorded().target().model(SDK.HeapProfilerModel));this.profileBeingRecorded().updateStatus(Common.UIString('Snapshotting\u2026'));function didTakeHeapSnapshot(success){var profile=this.profileBeingRecorded();if(!profile)
return;profile._finishLoad();this._profileSamples=null;this.setProfileBeingRecorded(null);this.dispatchEventToListeners(Profiler.ProfileType.Events.ProfileComplete,profile);}
heapProfilerModel.stopTrackingHeapObjects(true).then(didTakeHeapSnapshot.bind(this));this._recording=false;this.dispatchEventToListeners(Profiler.TrackingHeapSnapshotProfileType.TrackingStopped);}
_toggleRecording(){if(this._recording)
this._stopRecordingProfile();else
this._startRecordingProfile();return this._recording;}
fileExtension(){return'.heaptimeline';}
get treeItemTitle(){return Common.UIString('ALLOCATION TIMELINES');}
get description(){return Common.UIString('Allocation timelines show memory allocations from your heap over time. Use this profile type to isolate memory leaks.');}
_resetProfiles(event){var wasRecording=this._recording;this.setProfileBeingRecorded(null);super._resetProfiles(event);this._profileSamples=null;if(wasRecording)
this._addNewProfile();}
profileBeingRecordedRemoved(){this._stopRecordingProfile();this._profileSamples=null;}};Profiler.TrackingHeapSnapshotProfileType.TypeId='HEAP-RECORD';Profiler.TrackingHeapSnapshotProfileType.HeapStatsUpdate='HeapStatsUpdate';Profiler.TrackingHeapSnapshotProfileType.TrackingStarted='TrackingStarted';Profiler.TrackingHeapSnapshotProfileType.TrackingStopped='TrackingStopped';Profiler.TrackingHeapSnapshotProfileType.Samples=class{constructor(){this.sizes=[];this.ids=[];this.timestamps=[];this.max=[];this.totalTime=30000;}};Profiler.HeapProfileHeader=class extends Profiler.ProfileHeader{constructor(target,type,title){super(target,type,title||Common.UIString('Snapshot %d',type.nextProfileUid()));this.maxJSObjectId=-1;this._workerProxy=null;this._receiver=null;this._snapshotProxy=null;this._loadPromise=new Promise(loadResolver.bind(this));this._totalNumberOfChunks=0;this._bufferedWriter=null;function loadResolver(fulfill){this._fulfillLoad=fulfill;}}
createSidebarTreeElement(dataDisplayDelegate){return new Profiler.ProfileSidebarTreeElement(dataDisplayDelegate,this,'heap-snapshot-sidebar-tree-item');}
createView(dataDisplayDelegate){return new Profiler.HeapSnapshotView(dataDisplayDelegate,this);}
_prepareToLoad(){console.assert(!this._receiver,'Already loading');this._setupWorker();this.updateStatus(Common.UIString('Loading\u2026'),true);}
_finishLoad(){if(!this._wasDisposed)
this._receiver.close();if(this._bufferedWriter){this._bufferedWriter.finishWriting(this._didWriteToTempFile.bind(this));this._bufferedWriter=null;}}
_didWriteToTempFile(tempFile){if(this._wasDisposed){if(tempFile)
tempFile.remove();return;}
this._tempFile=tempFile;if(!tempFile)
this._failedToCreateTempFile=true;if(this._onTempFileReady){this._onTempFileReady();this._onTempFileReady=null;}}
_setupWorker(){function setProfileWait(event){this.updateStatus(null,event.data);}
console.assert(!this._workerProxy,'HeapSnapshotWorkerProxy already exists');this._workerProxy=new Profiler.HeapSnapshotWorkerProxy(this._handleWorkerEvent.bind(this));this._workerProxy.addEventListener(Profiler.HeapSnapshotWorkerProxy.Events.Wait,setProfileWait,this);this._receiver=this._workerProxy.createLoader(this.uid,this._snapshotReceived.bind(this));}
_handleWorkerEvent(eventName,data){if(HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot===eventName){var error=(data);Common.console.error(error);return;}
if(HeapSnapshotModel.HeapSnapshotProgressEvent.Update!==eventName)
return;var subtitle=(data);this.updateStatus(subtitle);}
dispose(){if(this._workerProxy)
this._workerProxy.dispose();this.removeTempFile();this._wasDisposed=true;}
_didCompleteSnapshotTransfer(){if(!this._snapshotProxy)
return;this.updateStatus(Number.bytesToString(this._snapshotProxy.totalSize),false);}
transferChunk(chunk){if(!this._bufferedWriter)
this._bufferedWriter=new Bindings.DeferredTempFile('heap-profiler',String(this.uid));this._bufferedWriter.write([chunk]);++this._totalNumberOfChunks;this._receiver.write(chunk);}
_snapshotReceived(snapshotProxy){if(this._wasDisposed)
return;this._receiver=null;this._snapshotProxy=snapshotProxy;this.maxJSObjectId=snapshotProxy.maxJSObjectId();this._didCompleteSnapshotTransfer();this._workerProxy.startCheckingForLongRunningCalls();this.notifySnapshotReceived();}
notifySnapshotReceived(){this._fulfillLoad(this._snapshotProxy);this.profileType()._snapshotReceived(this);if(this.canSaveToFile())
this.dispatchEventToListeners(Profiler.ProfileHeader.Events.ProfileReceived);}
_wasShown(){}
canSaveToFile(){return!this.fromFile()&&!!this._snapshotProxy;}
saveToFile(){var fileOutputStream=new Bindings.FileOutputStream();function onOpen(accepted){if(!accepted)
return;if(this._failedToCreateTempFile){Common.console.error('Failed to open temp file with heap snapshot');fileOutputStream.close();}else if(this._tempFile){var delegate=new Profiler.SaveSnapshotOutputStreamDelegate(this);this._tempFile.copyToOutputStream(fileOutputStream,delegate);}else{this._onTempFileReady=onOpen.bind(this,accepted);this._updateSaveProgress(0,1);}}
this._fileName=this._fileName||'Heap-'+new Date().toISO8601Compact()+this.profileType().fileExtension();fileOutputStream.open(this._fileName,onOpen.bind(this));}
_updateSaveProgress(value,total){var percentValue=((total?(value/total):0)*100).toFixed(0);this.updateStatus(Common.UIString('Saving\u2026 %d%%',percentValue));}
loadFromFile(file){this.updateStatus(Common.UIString('Loading\u2026'),true);this._setupWorker();var delegate=new Profiler.HeapSnapshotLoadFromFileDelegate(this);var fileReader=this._createFileReader(file,delegate);fileReader.start(this._receiver);}
_createFileReader(file,delegate){return new Bindings.ChunkedFileReader(file,10000000,delegate);}};Profiler.HeapSnapshotLoadFromFileDelegate=class{constructor(snapshotHeader){this._snapshotHeader=snapshotHeader;}
onTransferStarted(){}
onChunkTransferred(reader){}
onTransferFinished(){}
onError(reader,e){var subtitle;switch(e.target.error.code){case e.target.error.NOT_FOUND_ERR:subtitle=Common.UIString('\'%s\' not found.',reader.fileName());break;case e.target.error.NOT_READABLE_ERR:subtitle=Common.UIString('\'%s\' is not readable',reader.fileName());break;case e.target.error.ABORT_ERR:return;default:subtitle=Common.UIString('\'%s\' error %d',reader.fileName(),e.target.error.code);}
this._snapshotHeader.updateStatus(subtitle);}};Profiler.SaveSnapshotOutputStreamDelegate=class{constructor(profileHeader){this._profileHeader=profileHeader;}
onTransferStarted(){this._profileHeader._updateSaveProgress(0,1);}
onTransferFinished(){this._profileHeader._didCompleteSnapshotTransfer();}
onChunkTransferred(reader){this._profileHeader._updateSaveProgress(reader.loadedSize(),reader.fileSize());}
onError(reader,event){Common.console.error('Failed to read heap snapshot from temp file: '+(event).message);this.onTransferFinished();}};Profiler.HeapTrackingOverviewGrid=class extends UI.VBox{constructor(heapProfileHeader){super();this.element.id='heap-recording-view';this.element.classList.add('heap-tracking-overview');this._overviewContainer=this.element.createChild('div','heap-overview-container');this._overviewGrid=new PerfUI.OverviewGrid('heap-recording');this._overviewGrid.element.classList.add('fill');this._overviewCanvas=this._overviewContainer.createChild('canvas','heap-recording-overview-canvas');this._overviewContainer.appendChild(this._overviewGrid.element);this._overviewCalculator=new Profiler.HeapTrackingOverviewGrid.OverviewCalculator();this._overviewGrid.addEventListener(PerfUI.OverviewGrid.Events.WindowChanged,this._onWindowChanged,this);this._profileSamples=heapProfileHeader.fromFile()?new Profiler.TrackingHeapSnapshotProfileType.Samples():heapProfileHeader._profileSamples;this._profileType=heapProfileHeader.profileType();if(!heapProfileHeader.fromFile()&&heapProfileHeader.profileType().profileBeingRecorded()===heapProfileHeader){this._profileType.addEventListener(Profiler.TrackingHeapSnapshotProfileType.HeapStatsUpdate,this._onHeapStatsUpdate,this);this._profileType.addEventListener(Profiler.TrackingHeapSnapshotProfileType.TrackingStopped,this._onStopTracking,this);}
this._windowLeft=0.0;this._windowRight=1.0;this._overviewGrid.setWindow(this._windowLeft,this._windowRight);this._yScale=new Profiler.HeapTrackingOverviewGrid.SmoothScale();this._xScale=new Profiler.HeapTrackingOverviewGrid.SmoothScale();}
dispose(){this._onStopTracking();}
_onStopTracking(){this._profileType.removeEventListener(Profiler.TrackingHeapSnapshotProfileType.HeapStatsUpdate,this._onHeapStatsUpdate,this);this._profileType.removeEventListener(Profiler.TrackingHeapSnapshotProfileType.TrackingStopped,this._onStopTracking,this);}
_onHeapStatsUpdate(event){this._profileSamples=event.data;this._scheduleUpdate();}
_setSamples(samples){if(!samples)
return;console.assert(!this._profileSamples.timestamps.length,'Should only call this method when loading from file.');console.assert(samples.timestamps.length);this._profileSamples=new Profiler.TrackingHeapSnapshotProfileType.Samples();this._profileSamples.sizes=samples.sizes;this._profileSamples.ids=samples.lastAssignedIds;this._profileSamples.timestamps=samples.timestamps;this._profileSamples.max=samples.sizes;this._profileSamples.totalTime=(samples.timestamps.peekLast());this.update();}
_drawOverviewCanvas(width,height){if(!this._profileSamples)
return;var profileSamples=this._profileSamples;var sizes=profileSamples.sizes;var topSizes=profileSamples.max;var timestamps=profileSamples.timestamps;var startTime=timestamps[0];var endTime=timestamps[timestamps.length-1];var scaleFactor=this._xScale.nextScale(width/profileSamples.totalTime);var maxSize=0;function aggregateAndCall(sizes,callback){var size=0;var currentX=0;for(var i=1;i<timestamps.length;++i){var x=Math.floor((timestamps[i]-startTime)*scaleFactor);if(x!==currentX){if(size)
callback(currentX,size);size=0;currentX=x;}
size+=sizes[i];}
callback(currentX,size);}
function maxSizeCallback(x,size){maxSize=Math.max(maxSize,size);}
aggregateAndCall(sizes,maxSizeCallback);var yScaleFactor=this._yScale.nextScale(maxSize?height/(maxSize*1.1):0.0);this._overviewCanvas.width=width*window.devicePixelRatio;this._overviewCanvas.height=height*window.devicePixelRatio;this._overviewCanvas.style.width=width+'px';this._overviewCanvas.style.height=height+'px';var context=this._overviewCanvas.getContext('2d');context.scale(window.devicePixelRatio,window.devicePixelRatio);context.beginPath();context.lineWidth=2;context.strokeStyle='rgba(192, 192, 192, 0.6)';var currentX=(endTime-startTime)*scaleFactor;context.moveTo(currentX,height-1);context.lineTo(currentX,0);context.stroke();context.closePath();var gridY;var gridValue;var gridLabelHeight=14;if(yScaleFactor){const maxGridValue=(height-gridLabelHeight)/yScaleFactor;gridValue=Math.pow(1024,Math.floor(Math.log(maxGridValue)/Math.log(1024)));gridValue*=Math.pow(10,Math.floor(Math.log(maxGridValue/gridValue)/Math.LN10));if(gridValue*5<=maxGridValue)
gridValue*=5;gridY=Math.round(height-gridValue*yScaleFactor-0.5)+0.5;context.beginPath();context.lineWidth=1;context.strokeStyle='rgba(0, 0, 0, 0.2)';context.moveTo(0,gridY);context.lineTo(width,gridY);context.stroke();context.closePath();}
function drawBarCallback(x,size){context.moveTo(x,height-1);context.lineTo(x,Math.round(height-size*yScaleFactor-1));}
context.beginPath();context.lineWidth=2;context.strokeStyle='rgba(192, 192, 192, 0.6)';aggregateAndCall(topSizes,drawBarCallback);context.stroke();context.closePath();context.beginPath();context.lineWidth=2;context.strokeStyle='rgba(0, 0, 192, 0.8)';aggregateAndCall(sizes,drawBarCallback);context.stroke();context.closePath();if(gridValue){var label=Number.bytesToString(gridValue);var labelPadding=4;var labelX=0;var labelY=gridY-0.5;var labelWidth=2*labelPadding+context.measureText(label).width;context.beginPath();context.textBaseline='bottom';context.font='10px '+window.getComputedStyle(this.element,null).getPropertyValue('font-family');context.fillStyle='rgba(255, 255, 255, 0.75)';context.fillRect(labelX,labelY-gridLabelHeight,labelWidth,gridLabelHeight);context.fillStyle='rgb(64, 64, 64)';context.fillText(label,labelX+labelPadding,labelY);context.fill();context.closePath();}}
onResize(){this._updateOverviewCanvas=true;this._scheduleUpdate();}
_onWindowChanged(){if(!this._updateGridTimerId)
this._updateGridTimerId=setTimeout(this._updateGrid.bind(this),10);}
_scheduleUpdate(){if(this._updateTimerId)
return;this._updateTimerId=setTimeout(this.update.bind(this),10);}
_updateBoundaries(){this._windowLeft=this._overviewGrid.windowLeft();this._windowRight=this._overviewGrid.windowRight();this._windowWidth=this._windowRight-this._windowLeft;}
update(){this._updateTimerId=null;if(!this.isShowing())
return;this._updateBoundaries();this._overviewCalculator._updateBoundaries(this);this._overviewGrid.updateDividers(this._overviewCalculator);this._drawOverviewCanvas(this._overviewContainer.clientWidth,this._overviewContainer.clientHeight-20);}
_updateGrid(){this._updateGridTimerId=0;this._updateBoundaries();var ids=this._profileSamples.ids;var timestamps=this._profileSamples.timestamps;var sizes=this._profileSamples.sizes;var startTime=timestamps[0];var totalTime=this._profileSamples.totalTime;var timeLeft=startTime+totalTime*this._windowLeft;var timeRight=startTime+totalTime*this._windowRight;var minId=0;var maxId=ids[ids.length-1]+1;var size=0;for(var i=0;i<timestamps.length;++i){if(!timestamps[i])
continue;if(timestamps[i]>timeRight)
break;maxId=ids[i];if(timestamps[i]<timeLeft){minId=ids[i];continue;}
size+=sizes[i];}
this.dispatchEventToListeners(Profiler.HeapTrackingOverviewGrid.IdsRangeChanged,{minId:minId,maxId:maxId,size:size});}};Profiler.HeapTrackingOverviewGrid.IdsRangeChanged='IdsRangeChanged';Profiler.HeapTrackingOverviewGrid.SmoothScale=class{constructor(){this._lastUpdate=0;this._currentScale=0.0;}
nextScale(target){target=target||this._currentScale;if(this._currentScale){var now=Date.now();var timeDeltaMs=now-this._lastUpdate;this._lastUpdate=now;var maxChangePerSec=20;var maxChangePerDelta=Math.pow(maxChangePerSec,timeDeltaMs/1000);var scaleChange=target/this._currentScale;this._currentScale*=Number.constrain(scaleChange,1/maxChangePerDelta,maxChangePerDelta);}else{this._currentScale=target;}
return this._currentScale;}};Profiler.HeapTrackingOverviewGrid.OverviewCalculator=class{_updateBoundaries(chart){this._minimumBoundaries=0;this._maximumBoundaries=chart._profileSamples.totalTime;this._xScaleFactor=chart._overviewContainer.clientWidth/this._maximumBoundaries;}
computePosition(time){return(time-this._minimumBoundaries)*this._xScaleFactor;}
formatValue(value,precision){return Number.secondsToString(value/1000,!!precision);}
maximumBoundary(){return this._maximumBoundaries;}
minimumBoundary(){return this._minimumBoundaries;}
zeroTime(){return this._minimumBoundaries;}
boundarySpan(){return this._maximumBoundaries-this._minimumBoundaries;}};Profiler.HeapSnapshotStatisticsView=class extends UI.VBox{constructor(){super();this.element.classList.add('heap-snapshot-statistics-view');this._pieChart=new PerfUI.PieChart(150,Profiler.HeapSnapshotStatisticsView._valueFormatter,true);this._pieChart.element.classList.add('heap-snapshot-stats-pie-chart');this.element.appendChild(this._pieChart.element);this._labels=this.element.createChild('div','heap-snapshot-stats-legend');}
static _valueFormatter(value){return Common.UIString('%s KB',Number.withThousandsSeparator(Math.round(value/1024)));}
setTotal(value){this._pieChart.setTotal(value);}
addRecord(value,name,color){if(color)
this._pieChart.addSlice(value,color);var node=this._labels.createChild('div');var swatchDiv=node.createChild('div','heap-snapshot-stats-swatch');var nameDiv=node.createChild('div','heap-snapshot-stats-name');var sizeDiv=node.createChild('div','heap-snapshot-stats-size');if(color)
swatchDiv.style.backgroundColor=color;else
swatchDiv.classList.add('heap-snapshot-stats-empty-swatch');nameDiv.textContent=name;sizeDiv.textContent=Profiler.HeapSnapshotStatisticsView._valueFormatter(value);}};Profiler.HeapAllocationStackView=class extends UI.Widget{constructor(target){super();this._target=target;this._linkifier=new Components.Linkifier();}
setAllocatedObject(snapshot,snapshotNodeIndex){this.clear();snapshot.allocationStack(snapshotNodeIndex,this._didReceiveAllocationStack.bind(this));}
clear(){this.element.removeChildren();this._linkifier.reset();}
_didReceiveAllocationStack(frames){if(!frames){var stackDiv=this.element.createChild('div','no-heap-allocation-stack');stackDiv.createTextChild(Common.UIString('Stack was not recorded for this object because it had been allocated before this profile recording started.'));return;}
var stackDiv=this.element.createChild('div','heap-allocation-stack');for(var i=0;i<frames.length;i++){var frame=frames[i];var frameDiv=stackDiv.createChild('div','stack-frame');var name=frameDiv.createChild('div');name.textContent=UI.beautifyFunctionName(frame.functionName);if(frame.scriptId){var urlElement=this._linkifier.linkifyScriptLocation(this._target,String(frame.scriptId),frame.scriptName,frame.line-1,frame.column-1);frameDiv.appendChild(urlElement);}}}};;Profiler.HeapProfilerPanel=class extends Profiler.ProfilesPanel{constructor(){var registry=Profiler.ProfileTypeRegistry.instance;super('heap_profiler',[registry.heapSnapshotProfileType,registry.samplingHeapProfileType,registry.trackingHeapSnapshotProfileType],'profiler.heap-toggle-recording');}
appendApplicableItems(event,contextMenu,target){if(!(target instanceof SDK.RemoteObject))
return;if(!this.isShowing())
return;var object=(target);if(!object.objectId)
return;var objectId=(object.objectId);var heapProfiles=Profiler.ProfileTypeRegistry.instance.heapSnapshotProfileType.getProfiles();if(!heapProfiles.length)
return;var heapProfilerModel=object.runtimeModel().heapProfilerModel();if(!heapProfilerModel)
return;function revealInView(viewName){heapProfilerModel.snapshotObjectIdForObjectId(objectId).then(result=>{if(this.isShowing()&&result)
this.showObject(result,viewName);});}
contextMenu.appendItem(Common.UIString.capitalize('Reveal in Summary ^view'),revealInView.bind(this,'Summary'));}
handleAction(context,actionId){var panel=UI.context.flavor(Profiler.HeapProfilerPanel);console.assert(panel&&panel instanceof Profiler.HeapProfilerPanel);panel.toggleRecord();return true;}
wasShown(){UI.context.setFlavor(Profiler.HeapProfilerPanel,this);}
willHide(){UI.context.setFlavor(Profiler.HeapProfilerPanel,null);}
showObject(snapshotObjectId,perspectiveName){var registry=Profiler.ProfileTypeRegistry.instance;var heapProfiles=registry.heapSnapshotProfileType.getProfiles();for(var i=0;i<heapProfiles.length;i++){var profile=heapProfiles[i];if(profile.maxJSObjectId>=snapshotObjectId){this.showProfile(profile);var view=this.viewForProfile(profile);view.selectLiveObject(perspectiveName,snapshotObjectId);break;}}}};;Profiler.ProfileLauncherView=class extends UI.VBox{constructor(profilesPanel){super();this._panel=profilesPanel;this.element.classList.add('profile-launcher-view','panel-enabler-view');this._contentElement=this.element.createChild('div','profile-launcher-view-content');this._innerContentElement=this._contentElement.createChild('div');var controlDiv=this._contentElement.createChild('div','hbox profile-launcher-control');var targetDiv=controlDiv.createChild('div','hbox profile-launcher-target');targetDiv.createChild('div').textContent=Common.UIString('Target:');var targetsSelect=targetDiv.createChild('select','chrome-select');new Profiler.TargetsComboBoxController(targetsSelect,targetDiv);this._controlButton=UI.createTextButton('',this._controlButtonClicked.bind(this));controlDiv.appendChild(this._controlButton);this._recordButtonEnabled=true;this._loadButton=UI.createTextButton(Common.UIString('Load'),this._loadButtonClicked.bind(this),'load-profile');this._contentElement.appendChild(this._loadButton);this._selectedProfileTypeSetting=Common.settings.createSetting('selectedProfileType','CPU');this._header=this._innerContentElement.createChild('h1');this._profileTypeSelectorForm=this._innerContentElement.createChild('form');this._innerContentElement.createChild('div','flexible-space');this._typeIdToOptionElement=new Map();}
_loadButtonClicked(){this._panel.showLoadFromFileDialog();}
_updateControls(){if(this._isEnabled&&this._recordButtonEnabled)
this._controlButton.removeAttribute('disabled');else
this._controlButton.setAttribute('disabled','');this._controlButton.title=this._recordButtonEnabled?'':UI.anotherProfilerActiveLabel();if(this._isInstantProfile){this._controlButton.classList.remove('running');this._controlButton.textContent=Common.UIString('Take Snapshot');}else if(this._isProfiling){this._controlButton.classList.add('running');this._controlButton.textContent=Common.UIString('Stop');}else{this._controlButton.classList.remove('running');this._controlButton.textContent=Common.UIString('Start');}
for(var item of this._typeIdToOptionElement.values())
item.disabled=!!this._isProfiling;}
profileStarted(){this._isProfiling=true;this._updateControls();}
profileFinished(){this._isProfiling=false;this._updateControls();}
updateProfileType(profileType,recordButtonEnabled){this._isInstantProfile=profileType.isInstantProfile();this._recordButtonEnabled=recordButtonEnabled;this._isEnabled=profileType.isEnabled();this._updateControls();}
addProfileType(profileType){var labelElement=UI.createRadioLabel('profile-type',profileType.name);this._profileTypeSelectorForm.appendChild(labelElement);var optionElement=labelElement.radioElement;this._typeIdToOptionElement.set(profileType.id,optionElement);optionElement._profileType=profileType;optionElement.style.hidden=true;optionElement.addEventListener('change',this._profileTypeChanged.bind(this,profileType),false);var descriptionElement=this._profileTypeSelectorForm.createChild('p');descriptionElement.textContent=profileType.description;var decorationElement=profileType.decorationElement();if(decorationElement)
labelElement.appendChild(decorationElement);if(this._typeIdToOptionElement.size>1)
this._header.textContent=Common.UIString('Select profiling type');else
this._header.textContent=profileType.name;}
restoreSelectedProfileType(){var typeId=this._selectedProfileTypeSetting.get();if(!this._typeIdToOptionElement.has(typeId))
typeId=this._typeIdToOptionElement.keys().next().value;this._typeIdToOptionElement.get(typeId).checked=true;var type=this._typeIdToOptionElement.get(typeId)._profileType;this.dispatchEventToListeners(Profiler.ProfileLauncherView.Events.ProfileTypeSelected,type);}
_controlButtonClicked(){this._panel.toggleRecord();}
_profileTypeChanged(profileType){this.dispatchEventToListeners(Profiler.ProfileLauncherView.Events.ProfileTypeSelected,profileType);this._isInstantProfile=profileType.isInstantProfile();this._isEnabled=profileType.isEnabled();this._updateControls();this._selectedProfileTypeSetting.set(profileType.id);}};Profiler.ProfileLauncherView.Events={ProfileTypeSelected:Symbol('ProfileTypeSelected')};;Profiler.ProfileTypeRegistry=class{constructor(){this.cpuProfileType=new Profiler.CPUProfileType();this.heapSnapshotProfileType=new Profiler.HeapSnapshotProfileType();this.samplingHeapProfileType=new Profiler.SamplingHeapProfileType();this.trackingHeapSnapshotProfileType=new Profiler.TrackingHeapSnapshotProfileType();}};Profiler.ProfileTypeRegistry.instance=new Profiler.ProfileTypeRegistry();;Profiler.TargetsComboBoxController=class{constructor(selectElement,elementToHide){elementToHide.classList.add('hidden');selectElement.addEventListener('change',this._onComboBoxSelectionChange.bind(this),false);this._selectElement=selectElement;this._elementToHide=elementToHide;this._targetToOption=new Map();UI.context.addFlavorChangeListener(SDK.Target,this._targetChangedExternally,this);SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged,this._targetNameChanged,this);SDK.targetManager.observeTargets(this,SDK.Target.Capability.JS);}
targetAdded(target){var option=this._selectElement.createChild('option');option.text=target.name();option.__target=target;this._targetToOption.set(target,option);if(UI.context.flavor(SDK.Target)===target){this._selectElement.selectedIndex=Array.prototype.indexOf.call((this._selectElement),option);UI.context.setFlavor(SDK.HeapProfilerModel,target.model(SDK.HeapProfilerModel));UI.context.setFlavor(SDK.CPUProfilerModel,target.model(SDK.CPUProfilerModel));}
this._updateVisibility();}
targetRemoved(target){var option=this._targetToOption.remove(target);this._selectElement.removeChild(option);this._updateVisibility();}
_targetNameChanged(event){var target=(event.data);var option=this._targetToOption.get(target);option.text=target.name();}
_onComboBoxSelectionChange(){var selectedOption=this._selectElement[this._selectElement.selectedIndex];if(!selectedOption)
return;UI.context.setFlavor(SDK.Target,selectedOption.__target);UI.context.setFlavor(SDK.HeapProfilerModel,selectedOption.__target.model(SDK.HeapProfilerModel));UI.context.setFlavor(SDK.CPUProfilerModel,selectedOption.__target.model(SDK.CPUProfilerModel));}
_updateVisibility(){var hidden=this._selectElement.childElementCount===1;this._elementToHide.classList.toggle('hidden',hidden);}
_targetChangedExternally(event){var target=(event.data);if(!target)
return;var option=this._targetToOption.get(target);if(!option)
return;this._select(option);UI.context.setFlavor(SDK.HeapProfilerModel,target.model(SDK.HeapProfilerModel));UI.context.setFlavor(SDK.CPUProfilerModel,target.model(SDK.CPUProfilerModel));}
_select(option){this._selectElement.selectedIndex=Array.prototype.indexOf.call((this._selectElement),option);}};;Runtime.cachedResources["profiler/heapProfiler.css"]="/*\n * Copyright (C) 2009 Google Inc. All rights reserved.\n * Copyright (C) 2010 Apple Inc. All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions are\n * met:\n *\n *     * Redistributions of source code must retain the above copyright\n * notice, this list of conditions and the following disclaimer.\n *     * Redistributions in binary form must reproduce the above\n * copyright notice, this list of conditions and the following disclaimer\n * in the documentation and/or other materials provided with the\n * distribution.\n *     * Neither the name of Google Inc. nor the names of its\n * contributors may be used to endorse or promote products derived from\n * this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n * \"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.heap-snapshot-view {\n    overflow: hidden;\n}\n\n.heap-snapshot-view .data-grid {\n    border: none;\n}\n\n.heap-snapshot-view .data-grid tr:empty {\n    height: 16px;\n    visibility: hidden;\n}\n\n.heap-snapshot-view .data-grid span.percent-column {\n    width: 35px !important;\n}\n\n.heap-snapshot-view .object-value-object,\n.object-value-node {\n    display: inline;\n    position: static;\n}\n\n.detached-dom-tree-node {\n    background-color: #FF9999;\n}\n\n.heap-snapshot-view .object-value-string {\n    white-space: nowrap;\n}\n\n.heap-snapshot-view tr:not(.selected) .object-value-id {\n    color: grey;\n}\n\n.heap-snapshot-view .data-grid {\n    flex: auto;\n}\n\n.heap-snapshot-view .heap-tracking-overview {\n    flex: 0 0 80px;\n    height: 80px;\n}\n\n.heap-snapshot-view .retaining-paths-view {\n    overflow: hidden;\n}\n\n.heap-snapshot-view .heap-snapshot-view-resizer {\n    background-image: url(Images/toolbarResizerVertical.png);\n    background-color: #eee;\n    border-bottom: 1px solid rgb(179, 179, 179);\n    background-repeat: no-repeat;\n    background-position: right center, center;\n    flex: 0 0 21px;\n}\n\n.heap-snapshot-view .heap-snapshot-view-resizer .title > span {\n    display: inline-block;\n    padding-top: 3px;\n    vertical-align: middle;\n    margin-left: 4px;\n    margin-right: 8px;\n}\n\n.heap-snapshot-view .heap-snapshot-view-resizer * {\n    pointer-events: none;\n}\n\n.heap-snapshot-view tr:not(.selected) td.object-column span.highlight {\n    background-color: rgb(255, 255, 200);\n}\n\n.heap-snapshot-view td.object-column span.grayed {\n    color: gray;\n}\n\n.cycled-ancessor-node {\n    opacity: 0.6;\n}\n\n#heap-recording-view .heap-snapshot-view {\n    top: 80px;\n}\n\n.heap-overview-container {\n    overflow: hidden;\n    position: absolute;\n    top: 0;\n    width: 100%;\n    height: 80px;\n}\n\n#heap-recording-overview-grid .resources-dividers-label-bar {\n    pointer-events: auto;\n}\n\n#heap-recording-overview-container {\n    border-bottom: 1px solid rgba(0, 0, 0, 0.3);\n}\n\n.heap-recording-overview-canvas {\n    position: absolute;\n    top: 20px;\n    left: 0;\n    right: 0;\n    bottom: 0;\n}\n\n.heap-snapshot-statistics-view {\n    overflow: auto;\n}\n\n.heap-snapshot-stats-pie-chart {\n    margin: 12px 30px;\n    flex-shrink: 0;\n}\n\n.heap-snapshot-stats-legend {\n    margin-left: 24px;\n    flex-shrink: 0;\n}\n\n.heap-snapshot-stats-legend > div {\n    margin-top: 1px;\n    width: 170px;\n}\n\n.heap-snapshot-stats-swatch {\n    display: inline-block;\n    width: 10px;\n    height: 10px;\n    border: 1px solid rgba(100, 100, 100, 0.3);\n}\n\n.heap-snapshot-stats-swatch.heap-snapshot-stats-empty-swatch {\n    border: none;\n}\n\n.heap-snapshot-stats-name,\n.heap-snapshot-stats-size {\n    display: inline-block;\n    margin-left: 6px;\n}\n\n.heap-snapshot-stats-size {\n    float: right;\n    text-align: right;\n}\n\n.heap-allocation-stack .stack-frame {\n    display: flex;\n    justify-content: space-between;\n    border-bottom: 1px solid rgb(240, 240, 240);\n    padding: 2px;\n}\n\n.heap-allocation-stack .stack-frame .devtools-link {\n    color: rgb(33%, 33%, 33%);\n}\n\n.no-heap-allocation-stack {\n    padding: 5px;\n}\n\n/*# sourceURL=profiler/heapProfiler.css */";Runtime.cachedResources["profiler/profilesPanel.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n/* Profiler Style */\n\n#profile-views {\n    flex: auto;\n    position: relative;\n}\n\n.profile-view .data-grid table.data {\n    background: white;\n}\n\n.profile-view .data-grid tr:not(.selected) .highlight {\n    background-color: rgb(255, 230, 179);\n}\n\n.profile-view .data-grid tr:hover td:not(.bottom-filler-td) {\n    background-color: rgba(0, 0, 0, 0.1);\n}\n\n.profile-view .data-grid td.numeric-column {\n    text-align: right;\n}\n\n.profile-view .data-grid div.profile-multiple-values {\n    float: right;\n}\n\n.profile-view .data-grid span.percent-column {\n    color: #999;\n    width: 50px;\n    display: inline-block;\n}\n\n.profile-view .data-grid tr.selected span {\n    color: inherit;\n}\n\n.profiles-toolbar {\n    background-color: #f3f3f3;\n    border-bottom: 1px solid #ccc;\n    flex-shrink: 0;\n}\n\n.profiles-tree-sidebar {\n    flex: auto;\n    overflow: hidden;\n}\n\n.profiles-sidebar-tree-box {\n    overflow-y: auto;\n}\n\n.profile-view {\n    display: flex;\n    overflow: hidden;\n}\n\n.profile-view .data-grid {\n    border: none;\n    flex: auto;\n}\n\n.profile-view .data-grid th.self-column,\n.profile-view .data-grid th.total-column {\n    text-align: center;\n}\n\n.profile-node-file {\n    float: right;\n    color: gray;\n}\n\n.profile-warn-marker {\n    vertical-align: -1px;\n    margin-right: 2px;\n}\n\n.data-grid tr.selected .profile-node-file {\n    color: rgb(33%, 33%, 33%);\n}\n\n.data-grid:focus tr.selected .profile-node-file {\n    color: white;\n}\n\n.profile-launcher-view-content {\n    padding: 0 16px;\n    text-align: left;\n}\n\n.profile-launcher-control {\n    align-items: center;\n    flex-wrap: wrap;\n}\n\n.profile-launcher-control > * {\n    margin-top: 10px;\n    margin-right: 6px;\n}\n\n.profile-launcher-control button {\n    min-width: 110px;\n}\n\n.profile-launcher-target {\n    align-items: baseline;\n}\n\n.profile-launcher-target > * {\n    flex: 0 0 auto;\n    margin-right: 8px;\n}\n\n.profile-launcher-view-content h1 {\n    padding: 15px 0 10px;\n}\n\n.panel-enabler-view.profile-launcher-view form {\n    padding: 0;\n    font-size: 13px;\n    width: 100%;\n}\n\n.panel-enabler-view.profile-launcher-view label {\n    margin: 0;\n}\n\n.profile-launcher-view-content p {\n    color: grey;\n    margin-top: 1px;\n    margin-left: 22px;\n}\n\n.profile-launcher-view-content button.running {\n    color: hsl(0, 100%, 58%);\n}\n\n.profile-launcher-view-content button.running:hover {\n    color: hsl(0, 100%, 42%);\n}\n\nbody.inactive .profile-launcher-view-content button.running:not(.toolbar-item) {\n    color: rgb(220, 130, 130);\n}\n\n.highlighted-row {\n    -webkit-animation: row_highlight 2s 0s;\n}\n\n@-webkit-keyframes row_highlight {\n    from {background-color: rgba(255, 255, 120, 1); }\n    to { background-color: rgba(255, 255, 120, 0); }\n}\n\n.profile-canvas-decoration label[is=dt-icon-label] {\n    margin-right: 4px;\n}\n\n.profile-canvas-decoration {\n    color: red;\n    margin: -14px 0 13px 22px;\n    padding-left: 14px;\n}\n\n.profile-canvas-decoration button {\n    margin: 0 0 0 10px !important;\n}\n\n.js_profiler.panel select.chrome-select,\n.heap_profiler.panel select.chrome-select {\n    width: 150px;\n}\n\nbutton.load-profile {\n    margin-top: 10px;\n    min-width: 110px;\n}\n\n\n.cpu-profile-flame-chart-overview-container {\n    overflow: hidden;\n    position: absolute;\n    top: 0;\n    width: 100%;\n    height: 80px;\n}\n\n#cpu-profile-flame-chart-overview-container {\n    border-bottom: 1px solid rgba(0, 0, 0, 0.3);\n}\n\n.cpu-profile-flame-chart-overview-canvas {\n    position: absolute;\n    top: 20px;\n    left: 0;\n    right: 0;\n    bottom: 0;\n}\n\n#cpu-profile-flame-chart-overview-grid .resources-dividers-label-bar {\n    pointer-events: auto;\n}\n\n.cpu-profile-flame-chart-overview-pane {\n    flex: 0 0 80px !important;\n}\n\n/*# sourceURL=profiler/profilesPanel.css */";Runtime.cachedResources["profiler/profilesSidebarTree.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n/* Tree outline overrides */\n\n:host {\n    padding: 0;\n}\n\nol.tree-outline {\n    overflow: auto;\n    flex: auto;\n    padding: 0;\n    margin: 0;\n}\n\n.tree-outline li {\n    height: 36px;\n    padding-right: 5px;\n    margin-top: 1px;\n    line-height: 34px;\n    border-top: 1px solid transparent;\n}\n\n.tree-outline li:not(.parent)::before {\n    display: none;\n}\n\n:host-context(.some-expandable) .tree-outline li:not(.parent) {\n    margin-left: 10px;\n}\n\n.tree-outline li.profiles-tree-section {\n    height: 18px;\n    padding: 0 10px;\n    white-space: nowrap;\n    margin-top: 1px;\n    color: rgb(92, 110, 129);\n    text-shadow: rgba(255, 255, 255, 0.75) 0 1px 0;\n    line-height: 18px;\n}\n\n.tree-outline li.profiles-tree-section::before {\n    display: none;\n}\n\n.tree-outline ol {\n    overflow: hidden;\n}\n\n/* Generic items styling */\n\n.title-container > .save-link {\n    text-decoration: underline;\n    margin-left: auto;\n    display: none;\n}\n\nli.selected .title-container > .save-link {\n    display: block;\n    cursor: pointer;\n}\n\n.tree-outline > .icon {\n    margin-left: 16px;\n}\n\nli .icon {\n    width: 32px;\n    height: 32px;\n    margin-top: 1px;\n    margin-right: 3px;\n    flex: none;\n}\n\nli.wait .icon {\n    content: none;\n}\n\nli.wait .icon::before {\n    display: block;\n    width: 24px;\n    height: 24px;\n    margin: 4px;\n    border: 3px solid grey;\n    border-radius: 12px;\n    clip: rect(0, 15px, 15px, 0);\n    content: \"\";\n    position: absolute;\n    -webkit-animation: spinner-animation 1s linear infinite;\n    box-sizing: border-box;\n}\n\nli.wait.small .icon::before {\n    width: 14px;\n    height: 14px;\n    margin: 1px;\n    clip: rect(0, 9px, 9px, 0);\n    border-width: 2px;\n}\n\nli.wait.selected .icon::before {\n    border-color: white;\n}\n\n@-webkit-keyframes spinner-animation {\n    from { transform: rotate(0); }\n    to { transform: rotate(360deg); }\n}\n\nli.small {\n    height: 20px;\n}\n\nli.small .icon {\n    width: 16px;\n    height: 16px;\n}\n\nli .titles {\n    display: flex;\n    flex-direction: column;\n    top: 5px;\n    line-height: 12px;\n    padding-bottom: 1px;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n    flex: auto;\n}\n\nli .titles > .title-container {\n    display: flex;\n}\n\nli.small .titles {\n    top: 2px;\n    line-height: normal;\n}\n\nli:not(.small) .title::after {\n    content: \"\\A\";\n    white-space: pre;\n}\n\nli .subtitle {\n    font-size: 80%;\n}\n\nli.small .subtitle {\n    display: none;\n}\n\n/* Heap profiles */\n\n.heap-snapshot-sidebar-tree-item .icon {\n    content: url(Images/profileIcon.png);\n}\n\n.heap-snapshot-sidebar-tree-item.small .icon {\n    content: url(Images/profileSmallIcon.png);\n}\n\n/* Launcher */\n\n.profile-launcher-view-tree-item {\n    margin-left: 0 !important;\n}\n\n.profile-launcher-view-tree-item > .icon {\n    width: 8px !important;\n    visibility: hidden;\n}\n\n/* CPU profiles */\n\n.profile-sidebar-tree-item .icon {\n    content: url(Images/profileIcon.png);\n}\n\n.profile-sidebar-tree-item.small .icon {\n    content: url(Images/profileSmallIcon.png);\n}\n\n.profile-group-sidebar-tree-item .icon {\n    content: url(Images/profileGroupIcon.png);\n}\n\n/*# sourceURL=profiler/profilesSidebarTree.css */";