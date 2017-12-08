WebInspector.EditFileSystemDialog=function(fileSystemPath)
{WebInspector.DialogDelegate.call(this);this._fileSystemPath=fileSystemPath;this.element=document.createElement("div");this.element.className="edit-file-system-dialog";var header=this.element.createChild("div","header");var headerText=header.createChild("span");headerText.textContent=WebInspector.UIString("Edit file system");var closeButton=header.createChild("div","close-button-gray done-button");closeButton.addEventListener("click",this._onDoneClick.bind(this),false);var contents=this.element.createChild("div","contents");WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.FileMappingAdded,this._fileMappingAdded,this);WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.FileMappingRemoved,this._fileMappingRemoved,this);WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.ExcludedFolderAdded,this._excludedFolderAdded,this);WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.ExcludedFolderRemoved,this._excludedFolderRemoved,this);var blockHeader=contents.createChild("div","block-header");blockHeader.textContent=WebInspector.UIString("Mappings");this._fileMappingsSection=contents.createChild("div","section file-mappings-section");this._fileMappingsListContainer=this._fileMappingsSection.createChild("div","settings-list-container");var entries=WebInspector.isolatedFileSystemManager.mapping().mappingEntries(this._fileSystemPath);this._fileMappingsList=new WebInspector.EditableSettingsList(["url","path"],this._fileMappingValuesProvider.bind(this),this._fileMappingValidate.bind(this),this._fileMappingEdit.bind(this));this._fileMappingsList.addEventListener(WebInspector.SettingsList.Events.Removed,this._fileMappingRemovedfromList.bind(this));this._fileMappingsList.element.classList.add("file-mappings-list");this._fileMappingsListContainer.appendChild(this._fileMappingsList.element);this._entries={};for(var i=0;i<entries.length;++i)
this._addMappingRow(entries[i]);blockHeader=contents.createChild("div","block-header");blockHeader.textContent=WebInspector.UIString("Excluded folders");this._excludedFolderListSection=contents.createChild("div","section excluded-folders-section");this._excludedFolderListContainer=this._excludedFolderListSection.createChild("div","settings-list-container");var excludedFolderEntries=WebInspector.isolatedFileSystemManager.mapping().excludedFolders(fileSystemPath);this._excludedFolderList=new WebInspector.EditableSettingsList(["path"],this._excludedFolderValueProvider.bind(this),this._excludedFolderValidate.bind(this),this._excludedFolderEdit.bind(this));this._excludedFolderList.addEventListener(WebInspector.SettingsList.Events.Removed,this._excludedFolderRemovedfromList.bind(this));this._excludedFolderList.element.classList.add("excluded-folders-list");this._excludedFolderListContainer.appendChild(this._excludedFolderList.element);this._excludedFolderEntries=new StringMap();for(var i=0;i<excludedFolderEntries.length;++i)
this._addExcludedFolderRow(excludedFolderEntries[i]);this.element.tabIndex=0;}
WebInspector.EditFileSystemDialog.show=function(element,fileSystemPath)
{WebInspector.Dialog.show(element,new WebInspector.EditFileSystemDialog(fileSystemPath));var glassPane=document.getElementById("glass-pane");glassPane.classList.add("settings-glass-pane");}
WebInspector.EditFileSystemDialog.prototype={show:function(element)
{element.appendChild(this.element);this.element.classList.add("dialog-contents");element.classList.add("settings-dialog");element.classList.add("settings-tab");this._dialogElement=element;},_resize:function()
{if(!this._dialogElement||!this._relativeToElement)
return;const minWidth=200;const minHeight=150;var maxHeight=this._relativeToElement.offsetHeight-10;maxHeight=Math.max(minHeight,maxHeight);var maxWidth=Math.min(540,this._relativeToElement.offsetWidth-10);maxWidth=Math.max(minWidth,maxWidth);this._dialogElement.style.maxHeight=maxHeight+"px";this._dialogElement.style.width=maxWidth+"px";WebInspector.DialogDelegate.prototype.position(this._dialogElement,this._relativeToElement);},position:function(element,relativeToElement)
{this._relativeToElement=relativeToElement;this._resize();},willHide:function(event)
{},_fileMappingAdded:function(event)
{var entry=(event.data);this._addMappingRow(entry);},_fileMappingRemoved:function(event)
{var entry=(event.data);if(this._fileSystemPath!==entry.fileSystemPath)
return;delete this._entries[entry.urlPrefix];if(this._fileMappingsList.itemForId(entry.urlPrefix))
this._fileMappingsList.removeItem(entry.urlPrefix);this._resize();},_fileMappingValuesProvider:function(itemId,columnId)
{if(!itemId)
return"";var entry=this._entries[itemId];switch(columnId){case"url":return entry.urlPrefix;case"path":return entry.pathPrefix;default:console.assert("Should not be reached.");}
return"";},_fileMappingValidate:function(itemId,data)
{var oldPathPrefix=itemId?this._entries[itemId].pathPrefix:null;return this._validateMapping(data["url"],itemId,data["path"],oldPathPrefix);},_fileMappingEdit:function(itemId,data)
{if(itemId){var urlPrefix=itemId;var pathPrefix=this._entries[itemId].pathPrefix;var fileSystemPath=this._entries[itemId].fileSystemPath;WebInspector.isolatedFileSystemManager.mapping().removeFileMapping(fileSystemPath,urlPrefix,pathPrefix);}
this._addFileMapping(data["url"],data["path"]);},_validateMapping:function(urlPrefix,allowedURLPrefix,path,allowedPathPrefix)
{var columns=[];if(!this._checkURLPrefix(urlPrefix,allowedURLPrefix))
columns.push("url");if(!this._checkPathPrefix(path,allowedPathPrefix))
columns.push("path");return columns;},_fileMappingRemovedfromList:function(event)
{var urlPrefix=(event.data);if(!urlPrefix)
return;var entry=this._entries[urlPrefix];WebInspector.isolatedFileSystemManager.mapping().removeFileMapping(entry.fileSystemPath,entry.urlPrefix,entry.pathPrefix);},_addFileMapping:function(urlPrefix,pathPrefix)
{var normalizedURLPrefix=this._normalizePrefix(urlPrefix);var normalizedPathPrefix=this._normalizePrefix(pathPrefix);WebInspector.isolatedFileSystemManager.mapping().addFileMapping(this._fileSystemPath,normalizedURLPrefix,normalizedPathPrefix);this._fileMappingsList.selectItem(normalizedURLPrefix);return true;},_normalizePrefix:function(prefix)
{if(!prefix)
return"";return prefix+(prefix[prefix.length-1]==="/"?"":"/");},_addMappingRow:function(entry)
{var fileSystemPath=entry.fileSystemPath;var urlPrefix=entry.urlPrefix;if(!this._fileSystemPath||this._fileSystemPath!==fileSystemPath)
return;this._entries[urlPrefix]=entry;var fileMappingListItem=this._fileMappingsList.addItem(urlPrefix,null);this._resize();},_excludedFolderAdded:function(event)
{var entry=(event.data);this._addExcludedFolderRow(entry);},_excludedFolderRemoved:function(event)
{var entry=(event.data);var fileSystemPath=entry.fileSystemPath;if(!fileSystemPath||this._fileSystemPath!==fileSystemPath)
return;delete this._excludedFolderEntries[entry.path];if(this._excludedFolderList.itemForId(entry.path))
this._excludedFolderList.removeItem(entry.path);},_excludedFolderValueProvider:function(itemId,columnId)
{return itemId;},_excludedFolderValidate:function(itemId,data)
{var fileSystemPath=this._fileSystemPath;var columns=[];if(!this._validateExcludedFolder(data["path"],itemId))
columns.push("path");return columns;},_validateExcludedFolder:function(path,allowedPath)
{return!!path&&(path===allowedPath||!this._excludedFolderEntries.contains(path));},_excludedFolderEdit:function(itemId,data)
{var fileSystemPath=this._fileSystemPath;if(itemId)
WebInspector.isolatedFileSystemManager.mapping().removeExcludedFolder(fileSystemPath,itemId);var excludedFolderPath=data["path"];WebInspector.isolatedFileSystemManager.mapping().addExcludedFolder(fileSystemPath,excludedFolderPath);},_excludedFolderRemovedfromList:function(event)
{var itemId=(event.data);if(!itemId)
return;WebInspector.isolatedFileSystemManager.mapping().removeExcludedFolder(this._fileSystemPath,itemId);},_addExcludedFolderRow:function(entry)
{var fileSystemPath=entry.fileSystemPath;if(!fileSystemPath||this._fileSystemPath!==fileSystemPath)
return;var path=entry.path;this._excludedFolderEntries.put(path,entry);this._excludedFolderList.addItem(path,null);this._resize();},_checkURLPrefix:function(value,allowedPrefix)
{var prefix=this._normalizePrefix(value);return!!prefix&&(prefix===allowedPrefix||!this._entries[prefix]);},_checkPathPrefix:function(value,allowedPrefix)
{var prefix=this._normalizePrefix(value);if(!prefix)
return false;if(prefix===allowedPrefix)
return true;for(var urlPrefix in this._entries){var entry=this._entries[urlPrefix];if(urlPrefix&&entry.pathPrefix===prefix)
return false;}
return true;},focus:function()
{WebInspector.setCurrentFocusElement(this.element);},_onDoneClick:function()
{WebInspector.Dialog.hide();},onEnter:function()
{},__proto__:WebInspector.DialogDelegate.prototype};WebInspector.SettingsScreen=function(onHide)
{WebInspector.HelpScreen.call(this);this.element.id="settings-screen";this._onHide=onHide;this._tabbedPane=new WebInspector.TabbedPane();this._tabbedPane.element.classList.add("help-window-main");var settingsLabelElement=document.createElement("div");settingsLabelElement.className="help-window-label";settingsLabelElement.createTextChild(WebInspector.UIString("Settings"));this._tabbedPane.element.insertBefore(settingsLabelElement,this._tabbedPane.element.firstChild);this._tabbedPane.element.appendChild(this._createCloseButton());this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.General,WebInspector.UIString("General"),new WebInspector.GenericSettingsTab());this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Workspace,WebInspector.UIString("Workspace"),new WebInspector.WorkspaceSettingsTab());if(WebInspector.experimentsSettings.experimentsEnabled)
this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Experiments,WebInspector.UIString("Experiments"),new WebInspector.ExperimentsSettingsTab());this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Shortcuts,WebInspector.UIString("Shortcuts"),WebInspector.shortcutsScreen.createShortcutsTabView());this._tabbedPane.shrinkableTabs=false;this._tabbedPane.verticalTabLayout=true;this._lastSelectedTabSetting=WebInspector.settings.createSetting("lastSelectedSettingsTab",WebInspector.SettingsScreen.Tabs.General);this.selectTab(this._lastSelectedTabSetting.get());this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected,this._tabSelected,this);this.element.addEventListener("keydown",this._keyDown.bind(this),false);this._developerModeCounter=0;}
WebInspector.SettingsScreen.integerValidator=function(min,max,text)
{var value=Number(text);if(isNaN(value))
return WebInspector.UIString("Invalid number format");if(value<min||value>max)
return WebInspector.UIString("Value is out of range [%d, %d]",min,max);return null;}
WebInspector.SettingsScreen.Tabs={General:"general",Overrides:"overrides",Workspace:"workspace",Experiments:"experiments",Shortcuts:"shortcuts"}
WebInspector.SettingsScreen.prototype={selectTab:function(tabId)
{this._tabbedPane.selectTab(tabId);},_tabSelected:function(event)
{this._lastSelectedTabSetting.set(this._tabbedPane.selectedTabId);},wasShown:function()
{this._tabbedPane.show(this.element);WebInspector.HelpScreen.prototype.wasShown.call(this);},isClosingKey:function(keyCode)
{return[WebInspector.KeyboardShortcut.Keys.Enter.code,WebInspector.KeyboardShortcut.Keys.Esc.code,].indexOf(keyCode)>=0;},willHide:function()
{this._onHide();WebInspector.HelpScreen.prototype.willHide.call(this);},_keyDown:function(event)
{var shiftKeyCode=16;if(event.keyCode===shiftKeyCode&&++this._developerModeCounter>5)
this.element.classList.add("settings-developer-mode");},__proto__:WebInspector.HelpScreen.prototype}
WebInspector.SettingsTab=function(name,id)
{WebInspector.VBox.call(this);this.element.classList.add("settings-tab-container");if(id)
this.element.id=id;var header=this.element.createChild("header");header.createChild("h3").appendChild(document.createTextNode(name));this.containerElement=this.element.createChild("div","help-container-wrapper").createChild("div","settings-tab help-content help-container");}
WebInspector.SettingsTab.prototype={_appendSection:function(name)
{var block=this.containerElement.createChild("div","help-block");if(name)
block.createChild("div","help-section-title").textContent=name;return block;},_createSelectSetting:function(name,options,setting)
{var p=document.createElement("p");var labelElement=p.createChild("label");labelElement.textContent=name;var select=p.createChild("select");var settingValue=setting.get();for(var i=0;i<options.length;++i){var option=options[i];select.add(new Option(option[0],option[1]));if(settingValue===option[1])
select.selectedIndex=i;}
function changeListener(e)
{setting.set(options[select.selectedIndex][1]);}
select.addEventListener("change",changeListener,false);return p;},__proto__:WebInspector.VBox.prototype}
WebInspector.GenericSettingsTab=function()
{WebInspector.SettingsTab.call(this,WebInspector.UIString("General"),"general-tab-content");this._populateSectionsFromExtensions();var restoreDefaults=this._appendSection().createChild("input","settings-tab-text-button");restoreDefaults.type="button";restoreDefaults.value=WebInspector.UIString("Restore defaults and reload");restoreDefaults.addEventListener("click",restoreAndReload);function restoreAndReload()
{if(window.localStorage)
window.localStorage.clear();WebInspector.reload();}}
WebInspector.GenericSettingsTab.prototype={_populateSectionsFromExtensions:function()
{var explicitSectionOrder=["","Appearance","Elements","Sources","Profiler","Console","Extensions"];var allExtensions=WebInspector.moduleManager.extensions("ui-setting");var extensionsBySectionId=new StringMultimap();var childSettingExtensionsByParentName=new StringMultimap();allExtensions.forEach(function(extension){var descriptor=extension.descriptor();var sectionName=descriptor["section"]||"";if(!sectionName&&descriptor["parentSettingName"]){childSettingExtensionsByParentName.put(descriptor["parentSettingName"],extension);return;}
extensionsBySectionId.put(sectionName,extension);});var sectionIds=extensionsBySectionId.keys();var explicitlyOrderedSections={};for(var i=0;i<explicitSectionOrder.length;++i){explicitlyOrderedSections[explicitSectionOrder[i]]=true;var extensions=extensionsBySectionId.get(explicitSectionOrder[i]);if(!extensions.size())
continue;this._addSectionWithExtensionProvidedSettings(explicitSectionOrder[i],extensions.values(),childSettingExtensionsByParentName);}
for(var i=0;i<sectionIds.length;++i){if(explicitlyOrderedSections[sectionIds[i]])
continue;this._addSectionWithExtensionProvidedSettings(sectionIds[i],extensionsBySectionId.get(sectionIds[i]).values(),childSettingExtensionsByParentName);}},_addSectionWithExtensionProvidedSettings:function(sectionName,extensions,childSettingExtensionsByParentName)
{var uiSectionName=sectionName&&WebInspector.UIString(sectionName);var sectionElement=this._appendSection(uiSectionName);extensions.forEach(processSetting.bind(this,null));function processSetting(parentFieldset,extension)
{var descriptor=extension.descriptor();var experimentName=descriptor["experiment"];if(experimentName&&(!WebInspector.experimentsSettings[experimentName]||!WebInspector.experimentsSettings[experimentName].isEnabled()))
return;var settingName=descriptor["settingName"];var setting=WebInspector.settings[settingName];var instance=extension.instance();var settingControl;if(instance&&descriptor["settingType"]==="custom"){settingControl=instance.settingElement();if(!settingControl)
return;}
if(!settingControl){var uiTitle=WebInspector.UIString(descriptor["title"]);settingControl=createSettingControl.call(this,uiTitle,setting,descriptor,instance);}
if(settingName){var childSettings=childSettingExtensionsByParentName.get(settingName);if(childSettings.size()){var fieldSet=WebInspector.SettingsUI.createSettingFieldset(setting);settingControl.appendChild(fieldSet);childSettings.values().forEach(function(item){processSetting.call(this,fieldSet,item);},this);}}
var containerElement=parentFieldset||sectionElement;containerElement.appendChild(settingControl);}
function createSettingControl(uiTitle,setting,descriptor,instance)
{switch(descriptor["settingType"]){case"checkbox":return WebInspector.SettingsUI.createSettingCheckbox(uiTitle,setting);case"select":var descriptorOptions=descriptor["options"]
var options=new Array(descriptorOptions.length);for(var i=0;i<options.length;++i){var optionName=descriptorOptions[i][2]?descriptorOptions[i][0]:WebInspector.UIString(descriptorOptions[i][0]);options[i]=[WebInspector.UIString(descriptorOptions[i][0]),descriptorOptions[i][1]];}
return this._createSelectSetting(uiTitle,options,setting);default:throw"Invalid setting type: "+descriptor["settingType"];}}},_appendDrawerNote:function(p)
{var noteElement=p.createChild("div","help-field-note");noteElement.createTextChild("Hit ");noteElement.createChild("span","help-key").textContent="Esc";noteElement.createTextChild(WebInspector.UIString(" or click the"));noteElement.appendChild(new WebInspector.StatusBarButton(WebInspector.UIString("Drawer"),"console-status-bar-item").element);noteElement.createTextChild(WebInspector.UIString("toolbar item"));},__proto__:WebInspector.SettingsTab.prototype}
WebInspector.WorkspaceSettingsTab=function()
{WebInspector.SettingsTab.call(this,WebInspector.UIString("Workspace"),"workspace-tab-content");WebInspector.isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded,this._fileSystemAdded,this);WebInspector.isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved,this._fileSystemRemoved,this);this._commonSection=this._appendSection(WebInspector.UIString("Common"));var folderExcludePatternInput=WebInspector.SettingsUI.createSettingInputField(WebInspector.UIString("Folder exclude pattern"),WebInspector.settings.workspaceFolderExcludePattern,false,0,"270px",WebInspector.SettingsUI.regexValidator);this._commonSection.appendChild(folderExcludePatternInput);this._fileSystemsSection=this._appendSection(WebInspector.UIString("Folders"));this._fileSystemsListContainer=this._fileSystemsSection.createChild("p","settings-list-container");this._addFileSystemRowElement=this._fileSystemsSection.createChild("div");var addFileSystemButton=this._addFileSystemRowElement.createChild("input","settings-tab-text-button");addFileSystemButton.type="button";addFileSystemButton.value=WebInspector.UIString("Add folder\u2026");addFileSystemButton.addEventListener("click",this._addFileSystemClicked.bind(this));this._editFileSystemButton=this._addFileSystemRowElement.createChild("input","settings-tab-text-button");this._editFileSystemButton.type="button";this._editFileSystemButton.value=WebInspector.UIString("Edit\u2026");this._editFileSystemButton.addEventListener("click",this._editFileSystemClicked.bind(this));this._updateEditFileSystemButtonState();this._reset();}
WebInspector.WorkspaceSettingsTab.prototype={wasShown:function()
{WebInspector.SettingsTab.prototype.wasShown.call(this);this._reset();},_reset:function()
{this._resetFileSystems();},_resetFileSystems:function()
{this._fileSystemsListContainer.removeChildren();var fileSystemPaths=WebInspector.isolatedFileSystemManager.mapping().fileSystemPaths();delete this._fileSystemsList;if(!fileSystemPaths.length){var noFileSystemsMessageElement=this._fileSystemsListContainer.createChild("div","no-file-systems-message");noFileSystemsMessageElement.textContent=WebInspector.UIString("You have no file systems added.");return;}
this._fileSystemsList=new WebInspector.SettingsList(["path"],this._renderFileSystem.bind(this));this._fileSystemsList.element.classList.add("file-systems-list");this._fileSystemsList.addEventListener(WebInspector.SettingsList.Events.Selected,this._fileSystemSelected.bind(this));this._fileSystemsList.addEventListener(WebInspector.SettingsList.Events.Removed,this._fileSystemRemovedfromList.bind(this));this._fileSystemsList.addEventListener(WebInspector.SettingsList.Events.DoubleClicked,this._fileSystemDoubleClicked.bind(this));this._fileSystemsListContainer.appendChild(this._fileSystemsList.element);for(var i=0;i<fileSystemPaths.length;++i)
this._fileSystemsList.addItem(fileSystemPaths[i]);this._updateEditFileSystemButtonState();},_updateEditFileSystemButtonState:function()
{this._editFileSystemButton.disabled=!this._selectedFileSystemPath();},_fileSystemSelected:function(event)
{this._updateEditFileSystemButtonState();},_fileSystemDoubleClicked:function(event)
{var id=(event.data);this._editFileSystem(id);},_editFileSystemClicked:function(event)
{this._editFileSystem(this._selectedFileSystemPath());},_editFileSystem:function(id)
{WebInspector.EditFileSystemDialog.show(WebInspector.inspectorView.element,id);},_createRemoveButton:function(handler)
{var removeButton=document.createElement("button");removeButton.classList.add("button");removeButton.classList.add("remove-item-button");removeButton.value=WebInspector.UIString("Remove");if(handler)
removeButton.addEventListener("click",handler,false);else
removeButton.disabled=true;return removeButton;},_renderFileSystem:function(columnElement,column,id)
{if(!id)
return"";var fileSystemPath=id;var textElement=columnElement.createChild("span","list-column-text");var pathElement=textElement.createChild("span","file-system-path");pathElement.title=fileSystemPath;const maxTotalPathLength=55;const maxFolderNameLength=30;var lastIndexOfSlash=fileSystemPath.lastIndexOf(WebInspector.isWin()?"\\":"/");var folderName=fileSystemPath.substr(lastIndexOfSlash+1);var folderPath=fileSystemPath.substr(0,lastIndexOfSlash+1);folderPath=folderPath.trimMiddle(maxTotalPathLength-Math.min(maxFolderNameLength,folderName.length));folderName=folderName.trimMiddle(maxFolderNameLength);var folderPathElement=pathElement.createChild("span");folderPathElement.textContent=folderPath;var nameElement=pathElement.createChild("span","file-system-path-name");nameElement.textContent=folderName;},_fileSystemRemovedfromList:function(event)
{var id=(event.data);if(!id)
return;WebInspector.isolatedFileSystemManager.removeFileSystem(id);},_addFileSystemClicked:function()
{WebInspector.isolatedFileSystemManager.addFileSystem();},_fileSystemAdded:function(event)
{var fileSystem=(event.data);if(!this._fileSystemsList)
this._reset();else
this._fileSystemsList.addItem(fileSystem.path());},_fileSystemRemoved:function(event)
{var fileSystem=(event.data);var selectedFileSystemPath=this._selectedFileSystemPath();if(this._fileSystemsList.itemForId(fileSystem.path()))
this._fileSystemsList.removeItem(fileSystem.path());if(!this._fileSystemsList.itemIds().length)
this._reset();this._updateEditFileSystemButtonState();},_selectedFileSystemPath:function()
{return this._fileSystemsList?this._fileSystemsList.selectedId():null;},__proto__:WebInspector.SettingsTab.prototype}
WebInspector.ExperimentsSettingsTab=function()
{WebInspector.SettingsTab.call(this,WebInspector.UIString("Experiments"),"experiments-tab-content");var experiments=WebInspector.experimentsSettings.experiments;if(experiments.length){var experimentsSection=this._appendSection();experimentsSection.appendChild(this._createExperimentsWarningSubsection());for(var i=0;i<experiments.length;++i)
experimentsSection.appendChild(this._createExperimentCheckbox(experiments[i]));}}
WebInspector.ExperimentsSettingsTab.prototype={_createExperimentsWarningSubsection:function()
{var subsection=document.createElement("div");var warning=subsection.createChild("span","settings-experiments-warning-subsection-warning");warning.textContent=WebInspector.UIString("WARNING:");subsection.appendChild(document.createTextNode(" "));var message=subsection.createChild("span","settings-experiments-warning-subsection-message");message.textContent=WebInspector.UIString("These experiments could be dangerous and may require restart.");return subsection;},_createExperimentCheckbox:function(experiment)
{var input=document.createElement("input");input.type="checkbox";input.name=experiment.name;input.checked=experiment.isEnabled();function listener()
{experiment.setEnabled(input.checked);}
input.addEventListener("click",listener,false);var p=document.createElement("p");p.className=experiment.hidden&&!experiment.isEnabled()?"settings-experiment-hidden":"";var label=p.createChild("label");label.appendChild(input);label.appendChild(document.createTextNode(WebInspector.UIString(experiment.title)));p.appendChild(label);return p;},__proto__:WebInspector.SettingsTab.prototype}
WebInspector.SettingsController=function()
{this._settingsScreen;window.addEventListener("resize",this._resize.bind(this),true);}
WebInspector.SettingsController.prototype={_onHideSettingsScreen:function()
{delete this._settingsScreenVisible;},showSettingsScreen:function(tabId)
{if(!this._settingsScreen)
this._settingsScreen=new WebInspector.SettingsScreen(this._onHideSettingsScreen.bind(this));if(tabId)
this._settingsScreen.selectTab(tabId);this._settingsScreen.showModal();this._settingsScreenVisible=true;},_resize:function()
{if(this._settingsScreen&&this._settingsScreen.isShowing())
this._settingsScreen.doResize();}}
WebInspector.SettingsController.SettingsScreenActionDelegate=function(){}
WebInspector.SettingsController.SettingsScreenActionDelegate.prototype={handleAction:function()
{WebInspector._settingsController.showSettingsScreen(WebInspector.SettingsScreen.Tabs.General);return true;}}
WebInspector.SettingsList=function(columns,itemRenderer)
{this.element=document.createElement("div");this.element.classList.add("settings-list");this.element.tabIndex=-1;this._itemRenderer=itemRenderer;this._listItems={};this._ids=[];this._columns=columns;}
WebInspector.SettingsList.Events={Selected:"Selected",Removed:"Removed",DoubleClicked:"DoubleClicked",}
WebInspector.SettingsList.prototype={addItem:function(itemId,beforeId)
{var listItem=document.createElement("div");listItem._id=itemId;listItem.classList.add("settings-list-item");if(typeof beforeId!==undefined)
this.element.insertBefore(listItem,this._listItems[beforeId]);else
this.element.appendChild(listItem);var listItemContents=listItem.createChild("div","settings-list-item-contents");var listItemColumnsElement=listItemContents.createChild("div","settings-list-item-columns");listItem.columnElements={};for(var i=0;i<this._columns.length;++i){var columnElement=listItemColumnsElement.createChild("div","list-column");var columnId=this._columns[i];listItem.columnElements[columnId]=columnElement;this._itemRenderer(columnElement,columnId,itemId);}
var removeItemButton=this._createRemoveButton(removeItemClicked.bind(this));listItemContents.addEventListener("click",this.selectItem.bind(this,itemId),false);listItemContents.addEventListener("dblclick",this._onDoubleClick.bind(this,itemId),false);listItemContents.appendChild(removeItemButton);this._listItems[itemId]=listItem;if(typeof beforeId!==undefined)
this._ids.splice(this._ids.indexOf(beforeId),0,itemId);else
this._ids.push(itemId);function removeItemClicked(event)
{removeItemButton.disabled=true;this.removeItem(itemId);this.dispatchEventToListeners(WebInspector.SettingsList.Events.Removed,itemId);event.consume();}
return listItem;},removeItem:function(id)
{this._listItems[id].remove();delete this._listItems[id];this._ids.remove(id);if(id===this._selectedId){delete this._selectedId;if(this._ids.length)
this.selectItem(this._ids[0]);}},itemIds:function()
{return this._ids.slice();},columns:function()
{return this._columns.slice();},selectedId:function()
{return this._selectedId;},selectedItem:function()
{return this._selectedId?this._listItems[this._selectedId]:null;},itemForId:function(itemId)
{return this._listItems[itemId];},_onDoubleClick:function(id,event)
{this.dispatchEventToListeners(WebInspector.SettingsList.Events.DoubleClicked,id);},selectItem:function(id,event)
{if(typeof this._selectedId!=="undefined"){this._listItems[this._selectedId].classList.remove("selected");}
this._selectedId=id;if(typeof this._selectedId!=="undefined"){this._listItems[this._selectedId].classList.add("selected");}
this.dispatchEventToListeners(WebInspector.SettingsList.Events.Selected,id);if(event)
event.consume();},_createRemoveButton:function(handler)
{var removeButton=document.createElement("button");removeButton.classList.add("remove-item-button");removeButton.value=WebInspector.UIString("Remove");removeButton.addEventListener("click",handler,false);return removeButton;},__proto__:WebInspector.Object.prototype}
WebInspector.EditableSettingsList=function(columns,valuesProvider,validateHandler,editHandler)
{WebInspector.SettingsList.call(this,columns,this._renderColumn.bind(this));this._validateHandler=validateHandler;this._editHandler=editHandler;this._valuesProvider=valuesProvider;this._addInputElements={};this._editInputElements={};this._textElements={};this._addMappingItem=this.addItem(null);this._addMappingItem.classList.add("item-editing");this._addMappingItem.classList.add("add-list-item");}
WebInspector.EditableSettingsList.prototype={addItem:function(itemId,beforeId)
{var listItem=WebInspector.SettingsList.prototype.addItem.call(this,itemId,beforeId);listItem.classList.add("editable");return listItem;},_renderColumn:function(columnElement,columnId,itemId)
{columnElement.classList.add("settings-list-column-"+columnId);var placeholder=(columnId==="url")?WebInspector.UIString("URL prefix"):WebInspector.UIString("Folder path");if(itemId===null){var inputElement=columnElement.createChild("input","list-column-editor");inputElement.placeholder=placeholder;inputElement.addEventListener("blur",this._onAddMappingInputBlur.bind(this));inputElement.addEventListener("input",this._validateEdit.bind(this,itemId));this._addInputElements[columnId]=inputElement;return;}
var validItemId=itemId;if(!this._editInputElements[itemId])
this._editInputElements[itemId]={};if(!this._textElements[itemId])
this._textElements[itemId]={};var value=this._valuesProvider(itemId,columnId);var textElement=columnElement.createChild("span","list-column-text");textElement.textContent=value;textElement.title=value;columnElement.addEventListener("click",rowClicked.bind(this),false);this._textElements[itemId][columnId]=textElement;var inputElement=columnElement.createChild("input","list-column-editor");inputElement.value=value;inputElement.addEventListener("blur",this._editMappingBlur.bind(this,itemId));inputElement.addEventListener("input",this._validateEdit.bind(this,itemId));columnElement.inputElement=inputElement;this._editInputElements[itemId][columnId]=inputElement;function rowClicked(event)
{if(itemId===this._editingId)
return;event.consume();console.assert(!this._editingId);this._editingId=validItemId;var listItem=this.itemForId(validItemId);listItem.classList.add("item-editing");var inputElement=event.target.inputElement||this._editInputElements[validItemId][this.columns()[0]];inputElement.focus();inputElement.select();}},_data:function(itemId)
{var inputElements=this._inputElements(itemId);var data={};var columns=this.columns();for(var i=0;i<columns.length;++i)
data[columns[i]]=inputElements[columns[i]].value;return data;},_inputElements:function(itemId)
{if(!itemId)
return this._addInputElements;return this._editInputElements[itemId]||null;},_validateEdit:function(itemId)
{var errorColumns=this._validateHandler(itemId,this._data(itemId));var hasChanges=this._hasChanges(itemId);var columns=this.columns();for(var i=0;i<columns.length;++i){var columnId=columns[i];var inputElement=this._inputElements(itemId)[columnId];if(hasChanges&&errorColumns.indexOf(columnId)!==-1)
inputElement.classList.add("editable-item-error");else
inputElement.classList.remove("editable-item-error");}
return!errorColumns.length;},_hasChanges:function(itemId)
{var hasChanges=false;var columns=this.columns();for(var i=0;i<columns.length;++i){var columnId=columns[i];var oldValue=itemId?this._textElements[itemId][columnId].textContent:"";var newValue=this._inputElements(itemId)[columnId].value;if(oldValue!==newValue){hasChanges=true;break;}}
return hasChanges;},_editMappingBlur:function(itemId,event)
{var inputElements=Object.values(this._editInputElements[itemId]);if(inputElements.indexOf(event.relatedTarget)!==-1)
return;var listItem=this.itemForId(itemId);listItem.classList.remove("item-editing");delete this._editingId;if(!this._hasChanges(itemId))
return;if(!this._validateEdit(itemId)){var columns=this.columns();for(var i=0;i<columns.length;++i){var columnId=columns[i];var inputElement=this._editInputElements[itemId][columnId];inputElement.value=this._textElements[itemId][columnId].textContent;inputElement.classList.remove("editable-item-error");}
return;}
this._editHandler(itemId,this._data(itemId));},_onAddMappingInputBlur:function(event)
{var inputElements=Object.values(this._addInputElements);if(inputElements.indexOf(event.relatedTarget)!==-1)
return;if(!this._hasChanges(null))
return;if(!this._validateEdit(null))
return;this._editHandler(null,this._data(null));var columns=this.columns();for(var i=0;i<columns.length;++i){var columnId=columns[i];var inputElement=this._addInputElements[columnId];inputElement.value="";}},__proto__:WebInspector.SettingsList.prototype}
WebInspector._settingsController=new WebInspector.SettingsController();