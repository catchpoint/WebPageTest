


const UserInitiatedProfileName = "org.webkit.profiles.user-initiated";


WebInspector.ProfileType = function(id, name)
{
this._id = id;
this._name = name;

this._profiles = [];
this._profilesIdMap = {};

this.treeElement = null;
}

WebInspector.ProfileType.Events = {
AddProfileHeader: "add-profile-header",
RemoveProfileHeader: "remove-profile-header",
ProgressUpdated: "progress-updated",
ViewUpdated: "view-updated"
}

WebInspector.ProfileType.prototype = {

fileExtension: function()
{
return null;
},

get statusBarItems()
{
return [];
},

get buttonTooltip()
{
return "";
},

get id()
{
return this._id;
},

get treeItemTitle()
{
return this._name;
},

get name()
{
return this._name;
},


buttonClicked: function()
{
return false;
},

get description()
{
return "";
},


isInstantProfile: function()
{
return false;
},


getProfiles: function()
{
return this._profiles.filter(function(profile) { return !profile.isTemporary; });
},


decorationElement: function()
{
return null;
},


getProfile: function(uid)
{
return this._profilesIdMap[this._makeKey(uid)];
},



createTemporaryProfile: function(title)
{
throw new Error("Needs implemented.");
},


createProfile: function(profile)
{
throw new Error("Not supported for " + this._name + " profiles.");
},


_makeKey: function(id)
{
return id + '/' + escape(this.id);
},


addProfile: function(profile)
{
this._profiles.push(profile);

this._profilesIdMap[this._makeKey(profile.uid)] = profile;
this.dispatchEventToListeners(WebInspector.ProfileType.Events.AddProfileHeader, profile);
},


removeProfile: function(profile)
{
for (var i = 0; i < this._profiles.length; ++i) {
if (this._profiles[i].uid === profile.uid) {
this._profiles.splice(i, 1);
break;
}
}
delete this._profilesIdMap[this._makeKey(profile.uid)];
},


findTemporaryProfile: function()
{
for (var i = 0; i < this._profiles.length; ++i) {
if (this._profiles[i].isTemporary)
return this._profiles[i];
}
return null;
},

_reset: function()
{
var profiles = this._profiles.slice(0);
for (var i = 0; i < profiles.length; ++i) {
var profile = profiles[i];
var view = profile.existingView();
if (view) {
view.detach();
if ("dispose" in view)
view.dispose();
}
this.dispatchEventToListeners(WebInspector.ProfileType.Events.RemoveProfileHeader, profile);
}
this.treeElement.removeChildren();
this._profiles = [];
this._profilesIdMap = {};
},


_requestProfilesFromBackend: function(populateCallback)
{
},

_populateProfiles: function()
{

function populateCallback(error, profileHeaders) {
if (error)
return;
profileHeaders.sort(function(a, b) { return a.uid - b.uid; });
var count = profileHeaders.length;
for (var i = 0; i < count; ++i)
this.addProfile(this.createProfile(profileHeaders[i]));
}
this._requestProfilesFromBackend(populateCallback.bind(this));
},

__proto__: WebInspector.Object.prototype
}


WebInspector.ProfileHeader = function(profileType, title, uid)
{
this._profileType = profileType;
this.title = title;
this.isTemporary = uid === undefined;
this.uid = this.isTemporary ? -1 : uid;
this._fromFile = false;
}

WebInspector.ProfileHeader.prototype = {

profileType: function()
{
return this._profileType;
},


createSidebarTreeElement: function()
{
throw new Error("Needs implemented.");
},


existingView: function()
{
return this._view;
},


view: function(panel)
{
if (!this._view)
this._view = this.createView(panel);
return this._view;
},


createView: function(panel)
{
throw new Error("Not implemented.");
},

dispose: function()
{
},


load: function(callback)
{
},


canSaveToFile: function()
{
return false;
},

saveToFile: function()
{
throw new Error("Needs implemented");
},


loadFromFile: function(file)
{
throw new Error("Needs implemented");
},


fromFile: function()
{
return this._fromFile;
}
}


WebInspector.ProfilesPanel = function(name, type)
{

var singleProfileMode = typeof name !== "undefined";
name = name || "profiles";
WebInspector.Panel.call(this, name);
this.registerRequiredCSS("panelEnablerView.css");
this.registerRequiredCSS("heapProfiler.css");
this.registerRequiredCSS("profilesPanel.css");

this.createSidebarViewWithTree();

this.profilesItemTreeElement = new WebInspector.ProfilesSidebarTreeElement(this);
this.sidebarTree.appendChild(this.profilesItemTreeElement);

this._singleProfileMode = singleProfileMode;
this._profileTypesByIdMap = {};

this.profileViews = document.createElement("div");
this.profileViews.id = "profile-views";
this.splitView.mainElement.appendChild(this.profileViews);

this._statusBarButtons = [];

this.recordButton = new WebInspector.StatusBarButton("", "record-profile-status-bar-item");
this.recordButton.addEventListener("click", this.toggleRecordButton, this);
this._statusBarButtons.push(this.recordButton);

this.clearResultsButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear all profiles."), "clear-status-bar-item");
this.clearResultsButton.addEventListener("click", this._clearProfiles, this);
this._statusBarButtons.push(this.clearResultsButton);

this._profileTypeStatusBarItemsContainer = document.createElement("div");
this._profileTypeStatusBarItemsContainer.className = "status-bar-items";

this._profileViewStatusBarItemsContainer = document.createElement("div");
this._profileViewStatusBarItemsContainer.className = "status-bar-items";

if (singleProfileMode) {
this._launcherView = this._createLauncherView();
this._registerProfileType(  (type));
this._selectedProfileType = type;
this._updateProfileTypeSpecificUI();
} else {
this._launcherView = new WebInspector.MultiProfileLauncherView(this);
this._launcherView.addEventListener(WebInspector.MultiProfileLauncherView.EventTypes.ProfileTypeSelected, this._onProfileTypeSelected, this);

this._registerProfileType(new WebInspector.CPUProfileType());
if (!WebInspector.WorkerManager.isWorkerFrontend())
this._registerProfileType(new WebInspector.CSSSelectorProfileType());
this._registerProfileType(new WebInspector.HeapSnapshotProfileType());
if (!WebInspector.WorkerManager.isWorkerFrontend() && WebInspector.experimentsSettings.nativeMemorySnapshots.isEnabled()) {
this._registerProfileType(new WebInspector.NativeSnapshotProfileType());
this._registerProfileType(new WebInspector.NativeMemoryProfileType());
}
if (!WebInspector.WorkerManager.isWorkerFrontend() && WebInspector.experimentsSettings.canvasInspection.isEnabled())
this._registerProfileType(new WebInspector.CanvasProfileType());
}

this._reset();

this._createFileSelectorElement();
this.element.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), true);

WebInspector.ContextMenu.registerProvider(this);
}

WebInspector.ProfilesPanel.prototype = {
_createFileSelectorElement: function()
{
if (this._fileSelectorElement)
this.element.removeChild(this._fileSelectorElement);
this._fileSelectorElement = WebInspector.createFileSelectorElement(this._loadFromFile.bind(this));
this.element.appendChild(this._fileSelectorElement);
},


_createLauncherView: function()
{
return new WebInspector.ProfileLauncherView(this);
},

_findProfileTypeByExtension: function(fileName)
{
for (var id in this._profileTypesByIdMap) {
var type = this._profileTypesByIdMap[id];
var extension = type.fileExtension();
if (!extension)
continue;
if (fileName.endsWith(type.fileExtension()))
return type;
}
return null;
},


_loadFromFile: function(file)
{
this._createFileSelectorElement();

var profileType = this._findProfileTypeByExtension(file.name);
if (!profileType) {
var extensions = [];
for (var id in this._profileTypesByIdMap) {
var extension = this._profileTypesByIdMap[id].fileExtension();
if (!extension)
continue;
extensions.push(extension);
}
WebInspector.log(WebInspector.UIString("Can't load file. Only files with extensions '%s' can be loaded.", extensions.join("', '")));
return;
}

if (!!profileType.findTemporaryProfile()) {
WebInspector.log(WebInspector.UIString("Can't load profile when other profile is recording."));
return;
}

var temporaryProfile = profileType.createTemporaryProfile(WebInspector.ProfilesPanelDescriptor.UserInitiatedProfileName + "." + file.name);
profileType.addProfile(temporaryProfile);
temporaryProfile._fromFile = true;
temporaryProfile.loadFromFile(file);
},

get statusBarItems()
{
return this._statusBarButtons.select("element").concat(this._profileTypeStatusBarItemsContainer, this._profileViewStatusBarItemsContainer);
},

toggleRecordButton: function()
{
var isProfiling = this._selectedProfileType.buttonClicked();
this.setRecordingProfile(this._selectedProfileType.id, isProfiling);
},

_populateAllProfiles: function()
{
if (this._profilesWereRequested)
return;
this._profilesWereRequested = true;
for (var typeId in this._profileTypesByIdMap)
this._profileTypesByIdMap[typeId]._populateProfiles();
},

wasShown: function()
{
WebInspector.Panel.prototype.wasShown.call(this);
this._populateAllProfiles();
},


_onProfileTypeSelected: function(event)
{
this._selectedProfileType =   (event.data);
this._updateProfileTypeSpecificUI();
},

_updateProfileTypeSpecificUI: function()
{
this.recordButton.title = this._selectedProfileType.buttonTooltip;

this._profileTypeStatusBarItemsContainer.removeChildren();
var statusBarItems = this._selectedProfileType.statusBarItems;
if (statusBarItems) {
for (var i = 0; i < statusBarItems.length; ++i)
this._profileTypeStatusBarItemsContainer.appendChild(statusBarItems[i]);
}
this._resize(this.splitView.sidebarWidth());
},

_reset: function()
{
WebInspector.Panel.prototype.reset.call(this);

for (var typeId in this._profileTypesByIdMap)
this._profileTypesByIdMap[typeId]._reset();

delete this.visibleView;
delete this.currentQuery;
this.searchCanceled();

this._profileGroups = {};
this._profilesWereRequested = false;
this.recordButton.toggled = false;
if (this._selectedProfileType)
this.recordButton.title = this._selectedProfileType.buttonTooltip;
this._launcherView.profileFinished();

this.sidebarTreeElement.removeStyleClass("some-expandable");

this.profileViews.removeChildren();
this._profileViewStatusBarItemsContainer.removeChildren();

this.removeAllListeners();

this.recordButton.visible = true;
this._profileViewStatusBarItemsContainer.removeStyleClass("hidden");
this.clearResultsButton.element.removeStyleClass("hidden");
this.profilesItemTreeElement.select();
this._showLauncherView();
},

_showLauncherView: function()
{
this.closeVisibleView();
this._profileViewStatusBarItemsContainer.removeChildren();
this._launcherView.show(this.splitView.mainElement);
this.visibleView = this._launcherView;
},

_clearProfiles: function()
{
ProfilerAgent.clearProfiles();
HeapProfilerAgent.clearProfiles();
this._reset();
},

_garbageCollectButtonClicked: function()
{
HeapProfilerAgent.collectGarbage();
},


_registerProfileType: function(profileType)
{
this._profileTypesByIdMap[profileType.id] = profileType;
this._launcherView.addProfileType(profileType);
profileType.treeElement = new WebInspector.SidebarSectionTreeElement(profileType.treeItemTitle, null, true);
profileType.treeElement.hidden = !this._singleProfileMode;
this.sidebarTree.appendChild(profileType.treeElement);
profileType.treeElement.childrenListElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), true);
function onAddProfileHeader(event)
{
this._addProfileHeader(event.data);
}
function onRemoveProfileHeader(event)
{
this._removeProfileHeader(event.data);
}
function onProgressUpdated(event)
{
this._reportProfileProgress(event.data.profile, event.data.done, event.data.total);
}
profileType.addEventListener(WebInspector.ProfileType.Events.ViewUpdated, this._updateProfileTypeSpecificUI, this);
profileType.addEventListener(WebInspector.ProfileType.Events.AddProfileHeader, onAddProfileHeader, this);
profileType.addEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, onRemoveProfileHeader, this);
profileType.addEventListener(WebInspector.ProfileType.Events.ProgressUpdated, onProgressUpdated, this);
},


_handleContextMenuEvent: function(event)
{
var element = event.srcElement;
while (element && !element.treeElement && element !== this.element)
element = element.parentElement;
if (!element)
return;
if (element.treeElement && element.treeElement.handleContextMenuEvent) {
element.treeElement.handleContextMenuEvent(event, this);
return;
}
if (element !== this.element || event.srcElement === this.sidebarElement) {
var contextMenu = new WebInspector.ContextMenu(event);
if (this.visibleView instanceof WebInspector.HeapSnapshotView)
this.visibleView.populateContextMenu(contextMenu, event);
contextMenu.appendItem(WebInspector.UIString("Load\u2026"), this._fileSelectorElement.click.bind(this._fileSelectorElement));
contextMenu.show();
}

},


_makeTitleKey: function(text, profileTypeId)
{
return escape(text) + '/' + escape(profileTypeId);
},


_addProfileHeader: function(profile)
{
if (!profile.isTemporary)
this._removeTemporaryProfile(profile.profileType().id);

var profileType = profile.profileType();
var typeId = profileType.id;
var sidebarParent = profileType.treeElement;
sidebarParent.hidden = false;
var small = false;
var alternateTitle;

if (!WebInspector.ProfilesPanelDescriptor.isUserInitiatedProfile(profile.title) && !profile.isTemporary) {
var profileTitleKey = this._makeTitleKey(profile.title, typeId);
if (!(profileTitleKey in this._profileGroups))
this._profileGroups[profileTitleKey] = [];

var group = this._profileGroups[profileTitleKey];
group.push(profile);
if (group.length === 2) {

group._profilesTreeElement = new WebInspector.ProfileGroupSidebarTreeElement(this, profile.title);


var index = sidebarParent.children.indexOf(group[0]._profilesTreeElement);
sidebarParent.insertChild(group._profilesTreeElement, index);


var selected = group[0]._profilesTreeElement.selected;
sidebarParent.removeChild(group[0]._profilesTreeElement);
group._profilesTreeElement.appendChild(group[0]._profilesTreeElement);
if (selected)
group[0]._profilesTreeElement.revealAndSelect();

group[0]._profilesTreeElement.small = true;
group[0]._profilesTreeElement.mainTitle = WebInspector.UIString("Run %d", 1);

this.sidebarTreeElement.addStyleClass("some-expandable");
}

if (group.length >= 2) {
sidebarParent = group._profilesTreeElement;
alternateTitle = WebInspector.UIString("Run %d", group.length);
small = true;
}
}

var profileTreeElement = profile.createSidebarTreeElement();
profile.sidebarElement = profileTreeElement;
profileTreeElement.small = small;
if (alternateTitle)
profileTreeElement.mainTitle = alternateTitle;
profile._profilesTreeElement = profileTreeElement;

sidebarParent.appendChild(profileTreeElement);
if (!profile.isTemporary) {
if (!this.visibleView)
this._showProfile(profile);
this.dispatchEventToListeners("profile added", {
type: typeId
});
}
},


_removeProfileHeader: function(profile)
{
profile.dispose();
profile.profileType().removeProfile(profile);

var sidebarParent = profile.profileType().treeElement;
var profileTitleKey = this._makeTitleKey(profile.title, profile.profileType().id);
var group = this._profileGroups[profileTitleKey];
if (group) {
group.splice(group.indexOf(profile), 1);
if (group.length === 1) {

var index = sidebarParent.children.indexOf(group._profilesTreeElement);
sidebarParent.insertChild(group[0]._profilesTreeElement, index);
group[0]._profilesTreeElement.small = false;
group[0]._profilesTreeElement.mainTitle = group[0].title;
sidebarParent.removeChild(group._profilesTreeElement);
}
if (group.length !== 0)
sidebarParent = group._profilesTreeElement;
else
delete this._profileGroups[profileTitleKey];
}
sidebarParent.removeChild(profile._profilesTreeElement);



if (!sidebarParent.children.length) {
this.profilesItemTreeElement.select();
this._showLauncherView();
sidebarParent.hidden = !this._singleProfileMode;
}
},


_showProfile: function(profile)
{
if (!profile || profile.isTemporary)
return null;

var view = profile.view(this);
if (view === this.visibleView)
return view;

this.closeVisibleView();

view.show(this.profileViews);

profile._profilesTreeElement._suppressOnSelect = true;
profile._profilesTreeElement.revealAndSelect();
delete profile._profilesTreeElement._suppressOnSelect;

this.visibleView = view;

this._profileViewStatusBarItemsContainer.removeChildren();

var statusBarItems = view.statusBarItems;
if (statusBarItems)
for (var i = 0; i < statusBarItems.length; ++i)
this._profileViewStatusBarItemsContainer.appendChild(statusBarItems[i]);

return view;
},


showObject: function(snapshotObjectId, viewName)
{
var heapProfiles = this.getProfileType(WebInspector.HeapSnapshotProfileType.TypeId).getProfiles();
for (var i = 0; i < heapProfiles.length; i++) {
var profile = heapProfiles[i];

if (profile.maxJSObjectId >= snapshotObjectId) {
this._showProfile(profile);
var view = profile.view(this);
view.changeView(viewName, function() {
view.dataGrid.highlightObjectByHeapSnapshotId(snapshotObjectId);
});
break;
}
}
},


_createTemporaryProfile: function(typeId)
{
var type = this.getProfileType(typeId);
if (!type.findTemporaryProfile())
type.addProfile(type.createTemporaryProfile());
},


_removeTemporaryProfile: function(typeId)
{
var temporaryProfile = this.getProfileType(typeId).findTemporaryProfile();
if (!!temporaryProfile)
this._removeProfileHeader(temporaryProfile);
},


getProfile: function(typeId, uid)
{
return this.getProfileType(typeId).getProfile(uid);
},


showView: function(view)
{
this._showProfile(view.profile);
},


getProfileType: function(typeId)
{
return this._profileTypesByIdMap[typeId];
},


showProfile: function(typeId, uid)
{
return this._showProfile(this.getProfile(typeId, Number(uid)));
},

closeVisibleView: function()
{
if (this.visibleView)
this.visibleView.detach();
delete this.visibleView;
},


performSearch: function(query)
{
this.searchCanceled();

var searchableViews = this._searchableViews();
if (!searchableViews || !searchableViews.length)
return;

var visibleView = this.visibleView;

var matchesCountUpdateTimeout = null;

function updateMatchesCount()
{
WebInspector.searchController.updateSearchMatchesCount(this._totalSearchMatches, this);
WebInspector.searchController.updateCurrentMatchIndex(this._currentSearchResultIndex, this);
matchesCountUpdateTimeout = null;
}

function updateMatchesCountSoon()
{
if (matchesCountUpdateTimeout)
return;

matchesCountUpdateTimeout = setTimeout(updateMatchesCount.bind(this), 500);
}

function finishedCallback(view, searchMatches)
{
if (!searchMatches)
return;

this._totalSearchMatches += searchMatches;
this._searchResults.push(view);

if (this.searchMatchFound)
this.searchMatchFound(view, searchMatches);

updateMatchesCountSoon.call(this);

if (view === visibleView)
view.jumpToFirstSearchResult();
}

var i = 0;
var panel = this;
var boundFinishedCallback = finishedCallback.bind(this);
var chunkIntervalIdentifier = null;




function processChunk()
{
var view = searchableViews[i];

if (++i >= searchableViews.length) {
if (panel._currentSearchChunkIntervalIdentifier === chunkIntervalIdentifier)
delete panel._currentSearchChunkIntervalIdentifier;
clearInterval(chunkIntervalIdentifier);
}

if (!view)
return;

view.currentQuery = query;
view.performSearch(query, boundFinishedCallback);
}

processChunk();

chunkIntervalIdentifier = setInterval(processChunk, 25);
this._currentSearchChunkIntervalIdentifier = chunkIntervalIdentifier;
},

jumpToNextSearchResult: function()
{
if (!this.showView || !this._searchResults || !this._searchResults.length)
return;

var showFirstResult = false;

this._currentSearchResultIndex = this._searchResults.indexOf(this.visibleView);
if (this._currentSearchResultIndex === -1) {
this._currentSearchResultIndex = 0;
showFirstResult = true;
}

var currentView = this._searchResults[this._currentSearchResultIndex];

if (currentView.showingLastSearchResult()) {
if (++this._currentSearchResultIndex >= this._searchResults.length)
this._currentSearchResultIndex = 0;
currentView = this._searchResults[this._currentSearchResultIndex];
showFirstResult = true;
}

WebInspector.searchController.updateCurrentMatchIndex(this._currentSearchResultIndex, this);

if (currentView !== this.visibleView) {
this.showView(currentView);
WebInspector.searchController.showSearchField();
}

if (showFirstResult)
currentView.jumpToFirstSearchResult();
else
currentView.jumpToNextSearchResult();
},

jumpToPreviousSearchResult: function()
{
if (!this.showView || !this._searchResults || !this._searchResults.length)
return;

var showLastResult = false;

this._currentSearchResultIndex = this._searchResults.indexOf(this.visibleView);
if (this._currentSearchResultIndex === -1) {
this._currentSearchResultIndex = 0;
showLastResult = true;
}

var currentView = this._searchResults[this._currentSearchResultIndex];

if (currentView.showingFirstSearchResult()) {
if (--this._currentSearchResultIndex < 0)
this._currentSearchResultIndex = (this._searchResults.length - 1);
currentView = this._searchResults[this._currentSearchResultIndex];
showLastResult = true;
}

WebInspector.searchController.updateCurrentMatchIndex(this._currentSearchResultIndex, this);

if (currentView !== this.visibleView) {
this.showView(currentView);
WebInspector.searchController.showSearchField();
}

if (showLastResult)
currentView.jumpToLastSearchResult();
else
currentView.jumpToPreviousSearchResult();
},


_getAllProfiles: function()
{
var profiles = [];
for (var typeId in this._profileTypesByIdMap)
profiles = profiles.concat(this._profileTypesByIdMap[typeId].getProfiles());
return profiles;
},


_searchableViews: function()
{
var profiles = this._getAllProfiles();
var searchableViews = [];
for (var i = 0; i < profiles.length; ++i) {
var view = profiles[i].view(this);
if (view.performSearch)
searchableViews.push(view)
}
var index = searchableViews.indexOf(this.visibleView);
if (index > 0) {

searchableViews[index] = searchableViews[0];
searchableViews[0] = this.visibleView;
}
return searchableViews;
},

searchMatchFound: function(view, matches)
{
view.profile._profilesTreeElement.searchMatches = matches;
},

searchCanceled: function()
{
if (this._searchResults) {
for (var i = 0; i < this._searchResults.length; ++i) {
var view = this._searchResults[i];
if (view.searchCanceled)
view.searchCanceled();
delete view.currentQuery;
}
}

WebInspector.Panel.prototype.searchCanceled.call(this);

if (this._currentSearchChunkIntervalIdentifier) {
clearInterval(this._currentSearchChunkIntervalIdentifier);
delete this._currentSearchChunkIntervalIdentifier;
}

this._totalSearchMatches = 0;
this._currentSearchResultIndex = 0;
this._searchResults = [];

var profiles = this._getAllProfiles();
for (var i = 0; i < profiles.length; ++i)
profiles[i]._profilesTreeElement.searchMatches = 0;
},


sidebarResized: function(event)
{
var sidebarWidth =   (event.data);
this._resize(sidebarWidth);
},

onResize: function()
{
this._resize(this.splitView.sidebarWidth());
},


_resize: function(sidebarWidth)
{
var lastItemElement = this._statusBarButtons[this._statusBarButtons.length - 1].element;
var left = lastItemElement.totalOffsetLeft() + lastItemElement.offsetWidth;
this._profileTypeStatusBarItemsContainer.style.left = left + "px";
left += this._profileTypeStatusBarItemsContainer.offsetWidth - 1;
this._profileViewStatusBarItemsContainer.style.left = Math.max(left, sidebarWidth) + "px";
},


setRecordingProfile: function(profileType, isProfiling)
{
var profileTypeObject = this.getProfileType(profileType);
this.recordButton.toggled = isProfiling;
this.recordButton.title = profileTypeObject.buttonTooltip;
if (isProfiling) {
this._launcherView.profileStarted();
this._createTemporaryProfile(profileType);
} else
this._launcherView.profileFinished();
},


_reportProfileProgress: function(profile, done, total)
{
profile.sidebarElement.subtitle = WebInspector.UIString("%.0f%", (done / total) * 100);
profile.sidebarElement.wait = true;
},


appendApplicableItems: function(event, contextMenu, target)
{
if (WebInspector.inspectorView.currentPanel() !== this)
return;

var object =   (target);
var objectId = object.objectId;
if (!objectId)
return;

var heapProfiles = this.getProfileType(WebInspector.HeapSnapshotProfileType.TypeId).getProfiles();
if (!heapProfiles.length)
return;

function revealInView(viewName)
{
HeapProfilerAgent.getHeapObjectId(objectId, didReceiveHeapObjectId.bind(this, viewName));
}

function didReceiveHeapObjectId(viewName, error, result)
{
if (WebInspector.inspectorView.currentPanel() !== this)
return;
if (!error)
this.showObject(result, viewName);
}

contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Dominators view" : "Reveal in Dominators View"), revealInView.bind(this, "Dominators"));
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Summary view" : "Reveal in Summary View"), revealInView.bind(this, "Summary"));
},

__proto__: WebInspector.Panel.prototype
}


WebInspector.ProfileSidebarTreeElement = function(profile, titleFormat, className)
{
this.profile = profile;
this._titleFormat = titleFormat;

if (WebInspector.ProfilesPanelDescriptor.isUserInitiatedProfile(this.profile.title))
this._profileNumber = WebInspector.ProfilesPanelDescriptor.userInitiatedProfileIndex(this.profile.title);

WebInspector.SidebarTreeElement.call(this, className, "", "", profile, false);

this.refreshTitles();
}

WebInspector.ProfileSidebarTreeElement.prototype = {
onselect: function()
{
if (!this._suppressOnSelect)
this.treeOutline.panel._showProfile(this.profile);
},

ondelete: function()
{
this.treeOutline.panel._removeProfileHeader(this.profile);
return true;
},

get mainTitle()
{
if (this._mainTitle)
return this._mainTitle;
if (WebInspector.ProfilesPanelDescriptor.isUserInitiatedProfile(this.profile.title))
return WebInspector.UIString(this._titleFormat, this._profileNumber);
return this.profile.title;
},

set mainTitle(x)
{
this._mainTitle = x;
this.refreshTitles();
},

set searchMatches(matches)
{
if (!matches) {
if (!this.bubbleElement)
return;
this.bubbleElement.removeStyleClass("search-matches");
this.bubbleText = "";
return;
}

this.bubbleText = matches;
this.bubbleElement.addStyleClass("search-matches");
},


handleContextMenuEvent: function(event, panel)
{
var profile = this.profile;
var contextMenu = new WebInspector.ContextMenu(event);

contextMenu.appendItem(WebInspector.UIString("Load\u2026"), panel._fileSelectorElement.click.bind(panel._fileSelectorElement));
if (profile.canSaveToFile())
contextMenu.appendItem(WebInspector.UIString("Save\u2026"), profile.saveToFile.bind(profile));
contextMenu.appendItem(WebInspector.UIString("Delete"), this.ondelete.bind(this));
contextMenu.show();
},

__proto__: WebInspector.SidebarTreeElement.prototype
}


WebInspector.ProfileGroupSidebarTreeElement = function(panel, title, subtitle)
{
WebInspector.SidebarTreeElement.call(this, "profile-group-sidebar-tree-item", title, subtitle, null, true);
this._panel = panel;
}

WebInspector.ProfileGroupSidebarTreeElement.prototype = {
onselect: function()
{
if (this.children.length > 0)
this._panel._showProfile(this.children[this.children.length - 1].profile);
},

__proto__: WebInspector.SidebarTreeElement.prototype
}


WebInspector.ProfilesSidebarTreeElement = function(panel)
{
this._panel = panel;
this.small = false;

WebInspector.SidebarTreeElement.call(this, "profile-launcher-view-tree-item", WebInspector.UIString("Profiles"), "", null, false);
}

WebInspector.ProfilesSidebarTreeElement.prototype = {
onselect: function()
{
this._panel._showLauncherView();
},

get selectable()
{
return true;
},

__proto__: WebInspector.SidebarTreeElement.prototype
}



WebInspector.CPUProfilerPanel = function()
{
WebInspector.ProfilesPanel.call(this, "cpu-profiler", new WebInspector.CPUProfileType());
}

WebInspector.CPUProfilerPanel.prototype = {
__proto__: WebInspector.ProfilesPanel.prototype
}



WebInspector.CSSSelectorProfilerPanel = function()
{
WebInspector.ProfilesPanel.call(this, "css-profiler", new WebInspector.CSSSelectorProfileType());
}

WebInspector.CSSSelectorProfilerPanel.prototype = {
__proto__: WebInspector.ProfilesPanel.prototype
}



WebInspector.HeapProfilerPanel = function()
{
WebInspector.ProfilesPanel.call(this, "heap-profiler", new WebInspector.HeapSnapshotProfileType());
}

WebInspector.HeapProfilerPanel.prototype = {
__proto__: WebInspector.ProfilesPanel.prototype
}



WebInspector.CanvasProfilerPanel = function()
{
WebInspector.ProfilesPanel.call(this, "canvas-profiler", new WebInspector.CanvasProfileType());
}

WebInspector.CanvasProfilerPanel.prototype = {
__proto__: WebInspector.ProfilesPanel.prototype
}



WebInspector.MemoryChartProfilerPanel = function()
{
WebInspector.ProfilesPanel.call(this, "memory-chart-profiler", new WebInspector.NativeMemoryProfileType());
}

WebInspector.MemoryChartProfilerPanel.prototype = {
__proto__: WebInspector.ProfilesPanel.prototype
}



WebInspector.NativeMemoryProfilerPanel = function()
{
WebInspector.ProfilesPanel.call(this, "memory-snapshot-profiler", new WebInspector.NativeSnapshotProfileType());
}

WebInspector.NativeMemoryProfilerPanel.prototype = {
__proto__: WebInspector.ProfilesPanel.prototype
}





WebInspector.ProfileDataGridNode = function(profileNode, owningTree, hasChildren)
{
this.profileNode = profileNode;

WebInspector.DataGridNode.call(this, null, hasChildren);

this.tree = owningTree;

this.childrenByCallUID = {};
this.lastComparator = null;

this.callUID = profileNode.callUID;
this.selfTime = profileNode.selfTime;
this.totalTime = profileNode.totalTime;
this.functionName = profileNode.functionName;
this.numberOfCalls = profileNode.numberOfCalls;
this.url = profileNode.url;
}

WebInspector.ProfileDataGridNode.prototype = {
get data()
{
function formatMilliseconds(time)
{
return WebInspector.UIString("%.0f\u2009ms", time);
}

var data = {};

data["function"] = this.functionName;
data["calls"] = this.numberOfCalls;

if (this.tree.profileView.showSelfTimeAsPercent.get())
data["self"] = WebInspector.UIString("%.2f%", this.selfPercent);
else
data["self"] = formatMilliseconds(this.selfTime);

if (this.tree.profileView.showTotalTimeAsPercent.get())
data["total"] = WebInspector.UIString("%.2f%", this.totalPercent);
else
data["total"] = formatMilliseconds(this.totalTime);

if (this.tree.profileView.showAverageTimeAsPercent.get())
data["average"] = WebInspector.UIString("%.2f%", this.averagePercent);
else
data["average"] = formatMilliseconds(this.averageTime);

return data;
},


createCell: function(columnIdentifier)
{
var cell = WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);

if (columnIdentifier === "self" && this._searchMatchedSelfColumn)
cell.addStyleClass("highlight");
else if (columnIdentifier === "total" && this._searchMatchedTotalColumn)
cell.addStyleClass("highlight");
else if (columnIdentifier === "average" && this._searchMatchedAverageColumn)
cell.addStyleClass("highlight");
else if (columnIdentifier === "calls" && this._searchMatchedCallsColumn)
cell.addStyleClass("highlight");

if (columnIdentifier !== "function")
return cell;

if (this.profileNode._searchMatchedFunctionColumn)
cell.addStyleClass("highlight");

if (this.profileNode.url) {

var lineNumber = this.profileNode.lineNumber ? this.profileNode.lineNumber - 1 : 0;
var urlElement = this.tree.profileView._linkifier.linkifyLocation(this.profileNode.url, lineNumber, 0, "profile-node-file");
urlElement.style.maxWidth = "75%";
cell.insertBefore(urlElement, cell.firstChild);
}

return cell;
},

select: function(supressSelectedEvent)
{
WebInspector.DataGridNode.prototype.select.call(this, supressSelectedEvent);
this.tree.profileView._dataGridNodeSelected(this);
},

deselect: function(supressDeselectedEvent)
{
WebInspector.DataGridNode.prototype.deselect.call(this, supressDeselectedEvent);
this.tree.profileView._dataGridNodeDeselected(this);
},


sort: function(comparator, force)
{
var gridNodeGroups = [[this]];

for (var gridNodeGroupIndex = 0; gridNodeGroupIndex < gridNodeGroups.length; ++gridNodeGroupIndex) {
var gridNodes = gridNodeGroups[gridNodeGroupIndex];
var count = gridNodes.length;

for (var index = 0; index < count; ++index) {
var gridNode = gridNodes[index];



if (!force && (!gridNode.expanded || gridNode.lastComparator === comparator)) {
if (gridNode.children.length)
gridNode.shouldRefreshChildren = true;
continue;
}

gridNode.lastComparator = comparator;

var children = gridNode.children;
var childCount = children.length;

if (childCount) {
children.sort(comparator);

for (var childIndex = 0; childIndex < childCount; ++childIndex)
children[childIndex]._recalculateSiblings(childIndex);

gridNodeGroups.push(children);
}
}
}
},


insertChild: function(profileDataGridNode, index)
{
WebInspector.DataGridNode.prototype.insertChild.call(this, profileDataGridNode, index);

this.childrenByCallUID[profileDataGridNode.callUID] = profileDataGridNode;
},


removeChild: function(profileDataGridNode)
{
WebInspector.DataGridNode.prototype.removeChild.call(this, profileDataGridNode);

delete this.childrenByCallUID[profileDataGridNode.callUID];
},

removeChildren: function()
{
WebInspector.DataGridNode.prototype.removeChildren.call(this);

this.childrenByCallUID = {};
},


findChild: function(node)
{
if (!node)
return null;
return this.childrenByCallUID[node.callUID];
},

get averageTime()
{
return this.selfTime / Math.max(1, this.numberOfCalls);
},

get averagePercent()
{
return this.averageTime / this.tree.totalTime * 100.0;
},

get selfPercent()
{
return this.selfTime / this.tree.totalTime * 100.0;
},

get totalPercent()
{
return this.totalTime / this.tree.totalTime * 100.0;
},

get _parent()
{
return this.parent !== this.dataGrid ? this.parent : this.tree;
},

populate: function()
{
if (this._populated)
return;
this._populated = true;

this._sharedPopulate();

if (this._parent) {
var currentComparator = this._parent.lastComparator;

if (currentComparator)
this.sort(currentComparator, true);
}
},



_save: function()
{
if (this._savedChildren)
return;

this._savedSelfTime = this.selfTime;
this._savedTotalTime = this.totalTime;
this._savedNumberOfCalls = this.numberOfCalls;

this._savedChildren = this.children.slice();
},



_restore: function()
{
if (!this._savedChildren)
return;

this.selfTime = this._savedSelfTime;
this.totalTime = this._savedTotalTime;
this.numberOfCalls = this._savedNumberOfCalls;

this.removeChildren();

var children = this._savedChildren;
var count = children.length;

for (var index = 0; index < count; ++index) {
children[index]._restore();
this.appendChild(children[index]);
}
},

_merge: function(child, shouldAbsorb)
{
this.selfTime += child.selfTime;

if (!shouldAbsorb) {
this.totalTime += child.totalTime;
this.numberOfCalls += child.numberOfCalls;
}

var children = this.children.slice();

this.removeChildren();

var count = children.length;

for (var index = 0; index < count; ++index) {
if (!shouldAbsorb || children[index] !== child)
this.appendChild(children[index]);
}

children = child.children.slice();
count = children.length;

for (var index = 0; index < count; ++index) {
var orphanedChild = children[index],
existingChild = this.childrenByCallUID[orphanedChild.callUID];

if (existingChild)
existingChild._merge(orphanedChild, false);
else
this.appendChild(orphanedChild);
}
},

__proto__: WebInspector.DataGridNode.prototype
}


WebInspector.ProfileDataGridTree = function(profileView, rootProfileNode)
{
this.tree = this;
this.children = [];

this.profileView = profileView;

this.totalTime = rootProfileNode.totalTime;
this.lastComparator = null;

this.childrenByCallUID = {};
}

WebInspector.ProfileDataGridTree.prototype = {
get expanded()
{
return true;
},

appendChild: function(child)
{
this.insertChild(child, this.children.length);
},

insertChild: function(child, index)
{
this.children.splice(index, 0, child);
this.childrenByCallUID[child.callUID] = child;
},

removeChildren: function()
{
this.children = [];
this.childrenByCallUID = {};
},

findChild: WebInspector.ProfileDataGridNode.prototype.findChild,
sort: WebInspector.ProfileDataGridNode.prototype.sort,

_save: function()
{
if (this._savedChildren)
return;

this._savedTotalTime = this.totalTime;
this._savedChildren = this.children.slice();
},

restore: function()
{
if (!this._savedChildren)
return;

this.children = this._savedChildren;
this.totalTime = this._savedTotalTime;

var children = this.children;
var count = children.length;

for (var index = 0; index < count; ++index)
children[index]._restore();

this._savedChildren = null;
}
}

WebInspector.ProfileDataGridTree.propertyComparators = [{}, {}];


WebInspector.ProfileDataGridTree.propertyComparator = function(property, isAscending)
{
var comparator = WebInspector.ProfileDataGridTree.propertyComparators[(isAscending ? 1 : 0)][property];

if (!comparator) {
if (isAscending) {
comparator = function(lhs, rhs)
{
if (lhs[property] < rhs[property])
return -1;

if (lhs[property] > rhs[property])
return 1;

return 0;
}
} else {
comparator = function(lhs, rhs)
{
if (lhs[property] > rhs[property])
return -1;

if (lhs[property] < rhs[property])
return 1;

return 0;
}
}

WebInspector.ProfileDataGridTree.propertyComparators[(isAscending ? 1 : 0)][property] = comparator;
}

return comparator;
}
;









WebInspector.BottomUpProfileDataGridNode = function(profileNode, owningTree)
{
WebInspector.ProfileDataGridNode.call(this, profileNode, owningTree, this._willHaveChildren(profileNode));

this._remainingNodeInfos = [];
}

WebInspector.BottomUpProfileDataGridNode.prototype = {

_takePropertiesFromProfileDataGridNode: function(profileDataGridNode)
{
this._save();

this.selfTime = profileDataGridNode.selfTime;
this.totalTime = profileDataGridNode.totalTime;
this.numberOfCalls = profileDataGridNode.numberOfCalls;
},


_keepOnlyChild: function(child)
{
this._save();

this.removeChildren();
this.appendChild(child);
},

_exclude: function(aCallUID)
{
if (this._remainingNodeInfos)
this.populate();

this._save();

var children = this.children;
var index = this.children.length;

while (index--)
children[index]._exclude(aCallUID);

var child = this.childrenByCallUID[aCallUID];

if (child)
this._merge(child, true);
},

_restore: function()
{
WebInspector.ProfileDataGridNode.prototype._restore();

if (!this.children.length)
this.hasChildren = this._willHaveChildren(this.profileNode);
},


_merge: function(child, shouldAbsorb)
{
this.selfTime -= child.selfTime;

WebInspector.ProfileDataGridNode.prototype._merge.call(this, child, shouldAbsorb);
},

_sharedPopulate: function()
{
var remainingNodeInfos = this._remainingNodeInfos;
var count = remainingNodeInfos.length;

for (var index = 0; index < count; ++index) {
var nodeInfo = remainingNodeInfos[index];
var ancestor = nodeInfo.ancestor;
var focusNode = nodeInfo.focusNode;
var child = this.findChild(ancestor);


if (child) {
var totalTimeAccountedFor = nodeInfo.totalTimeAccountedFor;

child.selfTime += focusNode.selfTime;
child.numberOfCalls += focusNode.numberOfCalls;

if (!totalTimeAccountedFor)
child.totalTime += focusNode.totalTime;
} else {


child = new WebInspector.BottomUpProfileDataGridNode(ancestor, this.tree);

if (ancestor !== focusNode) {

child.selfTime = focusNode.selfTime;
child.totalTime = focusNode.totalTime;
child.numberOfCalls = focusNode.numberOfCalls;
}

this.appendChild(child);
}

var parent = ancestor.parent;
if (parent && parent.parent) {
nodeInfo.ancestor = parent;
child._remainingNodeInfos.push(nodeInfo);
}
}

delete this._remainingNodeInfos;
},

_willHaveChildren: function(profileNode)
{


return !!(profileNode.parent && profileNode.parent.parent);
},

__proto__: WebInspector.ProfileDataGridNode.prototype
}


WebInspector.BottomUpProfileDataGridTree = function(profileView, rootProfileNode)
{
WebInspector.ProfileDataGridTree.call(this, profileView, rootProfileNode);


var profileNodeUIDs = 0;
var profileNodeGroups = [[], [rootProfileNode]];
var visitedProfileNodesForCallUID = {};

this._remainingNodeInfos = [];

for (var profileNodeGroupIndex = 0; profileNodeGroupIndex < profileNodeGroups.length; ++profileNodeGroupIndex) {
var parentProfileNodes = profileNodeGroups[profileNodeGroupIndex];
var profileNodes = profileNodeGroups[++profileNodeGroupIndex];
var count = profileNodes.length;

for (var index = 0; index < count; ++index) {
var profileNode = profileNodes[index];

if (!profileNode.UID)
profileNode.UID = ++profileNodeUIDs;

if (profileNode.head && profileNode !== profileNode.head) {

var visitedNodes = visitedProfileNodesForCallUID[profileNode.callUID];
var totalTimeAccountedFor = false;

if (!visitedNodes) {
visitedNodes = {}
visitedProfileNodesForCallUID[profileNode.callUID] = visitedNodes;
} else {


var parentCount = parentProfileNodes.length;
for (var parentIndex = 0; parentIndex < parentCount; ++parentIndex) {
if (visitedNodes[parentProfileNodes[parentIndex].UID]) {
totalTimeAccountedFor = true;
break;
}
}
}

visitedNodes[profileNode.UID] = true;

this._remainingNodeInfos.push({ ancestor:profileNode, focusNode:profileNode, totalTimeAccountedFor:totalTimeAccountedFor });
}

var children = profileNode.children;
if (children.length) {
profileNodeGroups.push(parentProfileNodes.concat([profileNode]))
profileNodeGroups.push(children);
}
}
}


var any =  (this);
var node =  (any);
WebInspector.BottomUpProfileDataGridNode.prototype.populate.call(node);

return this;
}

WebInspector.BottomUpProfileDataGridTree.prototype = {

focus: function(profileDataGridNode)
{
if (!profileDataGridNode)
return;

this._save();

var currentNode = profileDataGridNode;
var focusNode = profileDataGridNode;

while (currentNode.parent && (currentNode instanceof WebInspector.ProfileDataGridNode)) {
currentNode._takePropertiesFromProfileDataGridNode(profileDataGridNode);

focusNode = currentNode;
currentNode = currentNode.parent;

if (currentNode instanceof WebInspector.ProfileDataGridNode)
currentNode._keepOnlyChild(focusNode);
}

this.children = [focusNode];
this.totalTime = profileDataGridNode.totalTime;
},


exclude: function(profileDataGridNode)
{
if (!profileDataGridNode)
return;

this._save();

var excludedCallUID = profileDataGridNode.callUID;
var excludedTopLevelChild = this.childrenByCallUID[excludedCallUID];



if (excludedTopLevelChild)
this.children.remove(excludedTopLevelChild);

var children = this.children;
var count = children.length;

for (var index = 0; index < count; ++index)
children[index]._exclude(excludedCallUID);

if (this.lastComparator)
this.sort(this.lastComparator, true);
},

_sharedPopulate: WebInspector.BottomUpProfileDataGridNode.prototype._sharedPopulate,

__proto__: WebInspector.ProfileDataGridTree.prototype
}
;



WebInspector.CPUProfileView = function(profileHeader)
{
WebInspector.View.call(this);

this.element.addStyleClass("profile-view");

this.showSelfTimeAsPercent = WebInspector.settings.createSetting("cpuProfilerShowSelfTimeAsPercent", true);
this.showTotalTimeAsPercent = WebInspector.settings.createSetting("cpuProfilerShowTotalTimeAsPercent", true);
this.showAverageTimeAsPercent = WebInspector.settings.createSetting("cpuProfilerShowAverageTimeAsPercent", true);
this._viewType = WebInspector.settings.createSetting("cpuProfilerView", WebInspector.CPUProfileView._TypeHeavy);

var columns = [];
columns.push({id: "self", title: WebInspector.UIString("Self"), width: "72px", sort: WebInspector.DataGrid.Order.Descending, sortable: true});
columns.push({id: "total", title: WebInspector.UIString("Total"), width: "72px", sortable: true});
columns.push({id: "function", title: WebInspector.UIString("Function"), disclosure: true, sortable: true});

this.dataGrid = new WebInspector.DataGrid(columns);
this.dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortProfile, this);
this.dataGrid.element.addEventListener("mousedown", this._mouseDownInDataGrid.bind(this), true);

if (WebInspector.experimentsSettings.cpuFlameChart.isEnabled()) {
this._splitView = new WebInspector.SplitView(false, "flameChartSplitLocation");
this._splitView.show(this.element);

this._flameChart = new WebInspector.FlameChart(this);
this._flameChart.addEventListener(WebInspector.FlameChart.Events.SelectedNode, this._revealProfilerNode.bind(this));
this._flameChart.show(this._splitView.firstElement());

this.dataGrid.show(this._splitView.secondElement());
} else
this.dataGrid.show(this.element);

this.viewSelectComboBox = new WebInspector.StatusBarComboBox(this._changeView.bind(this));

var heavyViewOption = this.viewSelectComboBox.createOption(WebInspector.UIString("Heavy (Bottom Up)"), "", WebInspector.CPUProfileView._TypeHeavy);
var treeViewOption = this.viewSelectComboBox.createOption(WebInspector.UIString("Tree (Top Down)"), "", WebInspector.CPUProfileView._TypeTree);
this.viewSelectComboBox.select(this._viewType.get() === WebInspector.CPUProfileView._TypeHeavy ? heavyViewOption : treeViewOption);

this.percentButton = new WebInspector.StatusBarButton("", "percent-time-status-bar-item");
this.percentButton.addEventListener("click", this._percentClicked, this);

this.focusButton = new WebInspector.StatusBarButton(WebInspector.UIString("Focus selected function."), "focus-profile-node-status-bar-item");
this.focusButton.setEnabled(false);
this.focusButton.addEventListener("click", this._focusClicked, this);

this.excludeButton = new WebInspector.StatusBarButton(WebInspector.UIString("Exclude selected function."), "exclude-profile-node-status-bar-item");
this.excludeButton.setEnabled(false);
this.excludeButton.addEventListener("click", this._excludeClicked, this);

this.resetButton = new WebInspector.StatusBarButton(WebInspector.UIString("Restore all functions."), "reset-profile-status-bar-item");
this.resetButton.visible = false;
this.resetButton.addEventListener("click", this._resetClicked, this);

this.profileHead =   (null);
this.profileHeader = profileHeader;

this._linkifier = new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultFormatter(30));

if (this.profileHeader._profile) 
this._processProfileData(this.profileHeader._profile);
else
ProfilerAgent.getCPUProfile(this.profileHeader.uid, this._getCPUProfileCallback.bind(this));
}

WebInspector.CPUProfileView._TypeTree = "Tree";
WebInspector.CPUProfileView._TypeHeavy = "Heavy";

WebInspector.CPUProfileView.prototype = {

selectRange: function(timeLeft, timeRight)
{
if (!this._flameChart)
return;
this._flameChart.selectRange(timeLeft, timeRight);
},

_revealProfilerNode: function(event)
{
var current = this.profileDataGridTree.children[0];

while (current && current.profileNode !== event.data)
current = current.traverseNextNode(false, null, false);

if (current)
current.revealAndSelect();
},


_getCPUProfileCallback: function(error, profile)
{
if (error)
return;

if (!profile.head) {

return;
}

this._processProfileData(profile);
},

_processProfileData: function(profile)
{
this.profileHead = profile.head;
this.samples = profile.samples;

if (profile.idleTime)
this._injectIdleTimeNode(profile);

this._assignParentsInProfile();
if (this.samples)
this._buildIdToNodeMap();
this._changeView();
this._updatePercentButton();
if (this._flameChart)
this._flameChart.update();
},

get statusBarItems()
{
return [this.viewSelectComboBox.element, this.percentButton.element, this.focusButton.element, this.excludeButton.element, this.resetButton.element];
},


_getBottomUpProfileDataGridTree: function()
{
if (!this._bottomUpProfileDataGridTree)
this._bottomUpProfileDataGridTree = new WebInspector.BottomUpProfileDataGridTree(this, this.profileHead);
return this._bottomUpProfileDataGridTree;
},


_getTopDownProfileDataGridTree: function()
{
if (!this._topDownProfileDataGridTree)
this._topDownProfileDataGridTree = new WebInspector.TopDownProfileDataGridTree(this, this.profileHead);
return this._topDownProfileDataGridTree;
},

willHide: function()
{
this._currentSearchResultIndex = -1;
},

refresh: function()
{
var selectedProfileNode = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.profileNode : null;

this.dataGrid.rootNode().removeChildren();

var children = this.profileDataGridTree.children;
var count = children.length;

for (var index = 0; index < count; ++index)
this.dataGrid.rootNode().appendChild(children[index]);

if (selectedProfileNode)
selectedProfileNode.selected = true;
},

refreshVisibleData: function()
{
var child = this.dataGrid.rootNode().children[0];
while (child) {
child.refresh();
child = child.traverseNextNode(false, null, true);
}
},

refreshShowAsPercents: function()
{
this._updatePercentButton();
this.refreshVisibleData();
},

searchCanceled: function()
{
if (this._searchResults) {
for (var i = 0; i < this._searchResults.length; ++i) {
var profileNode = this._searchResults[i].profileNode;

delete profileNode._searchMatchedSelfColumn;
delete profileNode._searchMatchedTotalColumn;
delete profileNode._searchMatchedAverageColumn;
delete profileNode._searchMatchedCallsColumn;
delete profileNode._searchMatchedFunctionColumn;

profileNode.refresh();
}
}

delete this._searchFinishedCallback;
this._currentSearchResultIndex = -1;
this._searchResults = [];
},

performSearch: function(query, finishedCallback)
{

this.searchCanceled();

query = query.trim();

if (!query.length)
return;

this._searchFinishedCallback = finishedCallback;

var greaterThan = (query.startsWith(">"));
var lessThan = (query.startsWith("<"));
var equalTo = (query.startsWith("=") || ((greaterThan || lessThan) && query.indexOf("=") === 1));
var percentUnits = (query.lastIndexOf("%") === (query.length - 1));
var millisecondsUnits = (query.length > 2 && query.lastIndexOf("ms") === (query.length - 2));
var secondsUnits = (!millisecondsUnits && query.lastIndexOf("s") === (query.length - 1));

var queryNumber = parseFloat(query);
if (greaterThan || lessThan || equalTo) {
if (equalTo && (greaterThan || lessThan))
queryNumber = parseFloat(query.substring(2));
else
queryNumber = parseFloat(query.substring(1));
}

var queryNumberMilliseconds = (secondsUnits ? (queryNumber * 1000) : queryNumber);


if (!isNaN(queryNumber) && !(greaterThan || lessThan))
equalTo = true;

var matcher = new RegExp(query.escapeForRegExp(), "i");

function matchesQuery(  profileDataGridNode)
{
delete profileDataGridNode._searchMatchedSelfColumn;
delete profileDataGridNode._searchMatchedTotalColumn;
delete profileDataGridNode._searchMatchedAverageColumn;
delete profileDataGridNode._searchMatchedCallsColumn;
delete profileDataGridNode._searchMatchedFunctionColumn;

if (percentUnits) {
if (lessThan) {
if (profileDataGridNode.selfPercent < queryNumber)
profileDataGridNode._searchMatchedSelfColumn = true;
if (profileDataGridNode.totalPercent < queryNumber)
profileDataGridNode._searchMatchedTotalColumn = true;
if (profileDataGridNode.averagePercent < queryNumberMilliseconds)
profileDataGridNode._searchMatchedAverageColumn = true;
} else if (greaterThan) {
if (profileDataGridNode.selfPercent > queryNumber)
profileDataGridNode._searchMatchedSelfColumn = true;
if (profileDataGridNode.totalPercent > queryNumber)
profileDataGridNode._searchMatchedTotalColumn = true;
if (profileDataGridNode.averagePercent < queryNumberMilliseconds)
profileDataGridNode._searchMatchedAverageColumn = true;
}

if (equalTo) {
if (profileDataGridNode.selfPercent == queryNumber)
profileDataGridNode._searchMatchedSelfColumn = true;
if (profileDataGridNode.totalPercent == queryNumber)
profileDataGridNode._searchMatchedTotalColumn = true;
if (profileDataGridNode.averagePercent < queryNumberMilliseconds)
profileDataGridNode._searchMatchedAverageColumn = true;
}
} else if (millisecondsUnits || secondsUnits) {
if (lessThan) {
if (profileDataGridNode.selfTime < queryNumberMilliseconds)
profileDataGridNode._searchMatchedSelfColumn = true;
if (profileDataGridNode.totalTime < queryNumberMilliseconds)
profileDataGridNode._searchMatchedTotalColumn = true;
if (profileDataGridNode.averageTime < queryNumberMilliseconds)
profileDataGridNode._searchMatchedAverageColumn = true;
} else if (greaterThan) {
if (profileDataGridNode.selfTime > queryNumberMilliseconds)
profileDataGridNode._searchMatchedSelfColumn = true;
if (profileDataGridNode.totalTime > queryNumberMilliseconds)
profileDataGridNode._searchMatchedTotalColumn = true;
if (profileDataGridNode.averageTime > queryNumberMilliseconds)
profileDataGridNode._searchMatchedAverageColumn = true;
}

if (equalTo) {
if (profileDataGridNode.selfTime == queryNumberMilliseconds)
profileDataGridNode._searchMatchedSelfColumn = true;
if (profileDataGridNode.totalTime == queryNumberMilliseconds)
profileDataGridNode._searchMatchedTotalColumn = true;
if (profileDataGridNode.averageTime == queryNumberMilliseconds)
profileDataGridNode._searchMatchedAverageColumn = true;
}
} else {
if (equalTo && profileDataGridNode.numberOfCalls == queryNumber)
profileDataGridNode._searchMatchedCallsColumn = true;
if (greaterThan && profileDataGridNode.numberOfCalls > queryNumber)
profileDataGridNode._searchMatchedCallsColumn = true;
if (lessThan && profileDataGridNode.numberOfCalls < queryNumber)
profileDataGridNode._searchMatchedCallsColumn = true;
}

if (profileDataGridNode.functionName.match(matcher) || (profileDataGridNode.url && profileDataGridNode.url.match(matcher)))
profileDataGridNode._searchMatchedFunctionColumn = true;

if (profileDataGridNode._searchMatchedSelfColumn ||
profileDataGridNode._searchMatchedTotalColumn ||
profileDataGridNode._searchMatchedAverageColumn ||
profileDataGridNode._searchMatchedCallsColumn ||
profileDataGridNode._searchMatchedFunctionColumn)
{
profileDataGridNode.refresh();
return true;
}

return false;
}

var current = this.profileDataGridTree.children[0];

while (current) {
if (matchesQuery(current)) {
this._searchResults.push({ profileNode: current });
}

current = current.traverseNextNode(false, null, false);
}

finishedCallback(this, this._searchResults.length);
},

jumpToFirstSearchResult: function()
{
if (!this._searchResults || !this._searchResults.length)
return;
this._currentSearchResultIndex = 0;
this._jumpToSearchResult(this._currentSearchResultIndex);
},

jumpToLastSearchResult: function()
{
if (!this._searchResults || !this._searchResults.length)
return;
this._currentSearchResultIndex = (this._searchResults.length - 1);
this._jumpToSearchResult(this._currentSearchResultIndex);
},

jumpToNextSearchResult: function()
{
if (!this._searchResults || !this._searchResults.length)
return;
if (++this._currentSearchResultIndex >= this._searchResults.length)
this._currentSearchResultIndex = 0;
this._jumpToSearchResult(this._currentSearchResultIndex);
},

jumpToPreviousSearchResult: function()
{
if (!this._searchResults || !this._searchResults.length)
return;
if (--this._currentSearchResultIndex < 0)
this._currentSearchResultIndex = (this._searchResults.length - 1);
this._jumpToSearchResult(this._currentSearchResultIndex);
},

showingFirstSearchResult: function()
{
return (this._currentSearchResultIndex === 0);
},

showingLastSearchResult: function()
{
return (this._searchResults && this._currentSearchResultIndex === (this._searchResults.length - 1));
},

_jumpToSearchResult: function(index)
{
var searchResult = this._searchResults[index];
if (!searchResult)
return;

var profileNode = searchResult.profileNode;
profileNode.revealAndSelect();
},

_changeView: function()
{
if (!this.profileHeader)
return;

switch (this.viewSelectComboBox.selectedOption().value) {
case WebInspector.CPUProfileView._TypeTree:
this.profileDataGridTree = this._getTopDownProfileDataGridTree();
this._sortProfile();
this._viewType.set(WebInspector.CPUProfileView._TypeTree);
break;
case WebInspector.CPUProfileView._TypeHeavy:
this.profileDataGridTree = this._getBottomUpProfileDataGridTree();
this._sortProfile();
this._viewType.set(WebInspector.CPUProfileView._TypeHeavy);
}

if (!this.currentQuery || !this._searchFinishedCallback || !this._searchResults)
return;




this._searchFinishedCallback(this, -this._searchResults.length);
this.performSearch(this.currentQuery, this._searchFinishedCallback);
},

_percentClicked: function(event)
{
var currentState = this.showSelfTimeAsPercent.get() && this.showTotalTimeAsPercent.get() && this.showAverageTimeAsPercent.get();
this.showSelfTimeAsPercent.set(!currentState);
this.showTotalTimeAsPercent.set(!currentState);
this.showAverageTimeAsPercent.set(!currentState);
this.refreshShowAsPercents();
},

_updatePercentButton: function()
{
if (this.showSelfTimeAsPercent.get() && this.showTotalTimeAsPercent.get() && this.showAverageTimeAsPercent.get()) {
this.percentButton.title = WebInspector.UIString("Show absolute total and self times.");
this.percentButton.toggled = true;
} else {
this.percentButton.title = WebInspector.UIString("Show total and self times as percentages.");
this.percentButton.toggled = false;
}
},

_focusClicked: function(event)
{
if (!this.dataGrid.selectedNode)
return;

this.resetButton.visible = true;
this.profileDataGridTree.focus(this.dataGrid.selectedNode);
this.refresh();
this.refreshVisibleData();
},

_excludeClicked: function(event)
{
var selectedNode = this.dataGrid.selectedNode

if (!selectedNode)
return;

selectedNode.deselect();

this.resetButton.visible = true;
this.profileDataGridTree.exclude(selectedNode);
this.refresh();
this.refreshVisibleData();
},

_resetClicked: function(event)
{
this.resetButton.visible = false;
this.profileDataGridTree.restore();
this._linkifier.reset();
this.refresh();
this.refreshVisibleData();
},

_dataGridNodeSelected: function(node)
{
this.focusButton.setEnabled(true);
this.excludeButton.setEnabled(true);
},

_dataGridNodeDeselected: function(node)
{
this.focusButton.setEnabled(false);
this.excludeButton.setEnabled(false);
},

_sortProfile: function()
{
var sortAscending = this.dataGrid.isSortOrderAscending();
var sortColumnIdentifier = this.dataGrid.sortColumnIdentifier();
var sortProperty = {
"average": "averageTime",
"self": "selfTime",
"total": "totalTime",
"calls": "numberOfCalls",
"function": "functionName"
}[sortColumnIdentifier];

this.profileDataGridTree.sort(WebInspector.ProfileDataGridTree.propertyComparator(sortProperty, sortAscending));

this.refresh();
},

_mouseDownInDataGrid: function(event)
{
if (event.detail < 2)
return;

var cell = event.target.enclosingNodeOrSelfWithNodeName("td");
if (!cell || (!cell.hasStyleClass("total-column") && !cell.hasStyleClass("self-column") && !cell.hasStyleClass("average-column")))
return;

if (cell.hasStyleClass("total-column"))
this.showTotalTimeAsPercent.set(!this.showTotalTimeAsPercent.get());
else if (cell.hasStyleClass("self-column"))
this.showSelfTimeAsPercent.set(!this.showSelfTimeAsPercent.get());
else if (cell.hasStyleClass("average-column"))
this.showAverageTimeAsPercent.set(!this.showAverageTimeAsPercent.get());

this.refreshShowAsPercents();

event.consume(true);
},

_assignParentsInProfile: function()
{
var head = this.profileHead;
head.parent = null;
head.head = null;
var nodesToTraverse = [ { parent: head, children: head.children } ];
while (nodesToTraverse.length > 0) {
var pair = nodesToTraverse.pop();
var parent = pair.parent;
var children = pair.children;
var length = children.length;
for (var i = 0; i < length; ++i) {
children[i].head = head;
children[i].parent = parent;
if (children[i].children.length > 0)
nodesToTraverse.push({ parent: children[i], children: children[i].children });
}
}
},

_buildIdToNodeMap: function()
{
var idToNode = this._idToNode = {};
var stack = [this.profileHead];
while (stack.length) {
var node = stack.pop();
idToNode[node.id] = node;
for (var i = 0; i < node.children.length; i++)
stack.push(node.children[i]);
}
},


_injectIdleTimeNode: function(profile)
{
var idleTime = profile.idleTime;
var nodes = profile.head.children;

var programNode = {selfTime: 0};
for (var i = nodes.length - 1; i >= 0; --i) {
if (nodes[i].functionName === "(program)") {
programNode = nodes[i];
break;
}
}
var programTime = programNode.selfTime;
if (idleTime > programTime)
idleTime = programTime;
programTime = programTime - idleTime;
programNode.selfTime = programTime;
programNode.totalTime = programTime;
var idleNode = {
functionName: "(idle)",
url: null,
lineNumber: 0,
totalTime: idleTime,
selfTime: idleTime,
numberOfCalls: 0,
visible: true,
callUID: 0,
children: []
};
nodes.push(idleNode);
},

__proto__: WebInspector.View.prototype
}


WebInspector.CPUProfileType = function()
{
WebInspector.ProfileType.call(this, WebInspector.CPUProfileType.TypeId, WebInspector.UIString("Collect JavaScript CPU Profile"));
InspectorBackend.registerProfilerDispatcher(this);
this._recording = false;
WebInspector.CPUProfileType.instance = this;
}

WebInspector.CPUProfileType.TypeId = "CPU";

WebInspector.CPUProfileType.prototype = {

fileExtension: function()
{
return ".cpuprofile";
},

get buttonTooltip()
{
return this._recording ? WebInspector.UIString("Stop CPU profiling.") : WebInspector.UIString("Start CPU profiling.");
},


buttonClicked: function()
{
if (this._recording) {
this.stopRecordingProfile();
return false;
} else {
this.startRecordingProfile();
return true;
}
},

get treeItemTitle()
{
return WebInspector.UIString("CPU PROFILES");
},

get description()
{
return WebInspector.UIString("CPU profiles show where the execution time is spent in your page's JavaScript functions.");
},


addProfileHeader: function(profileHeader)
{
this.addProfile(this.createProfile(profileHeader));
},

isRecordingProfile: function()
{
return this._recording;
},

startRecordingProfile: function()
{
this._recording = true;
WebInspector.userMetrics.ProfilesCPUProfileTaken.record();
ProfilerAgent.start();
},

stopRecordingProfile: function()
{
this._recording = false;
ProfilerAgent.stop();
},


setRecordingProfile: function(isProfiling)
{
this._recording = isProfiling;
},


createTemporaryProfile: function(title)
{
title = title || WebInspector.UIString("Recording\u2026");
return new WebInspector.CPUProfileHeader(this, title);
},


createProfile: function(profile)
{
return new WebInspector.CPUProfileHeader(this, profile.title, profile.uid);
},


removeProfile: function(profile)
{
WebInspector.ProfileType.prototype.removeProfile.call(this, profile);
if (!profile.isTemporary)
ProfilerAgent.removeProfile(this.id, profile.uid);
},


_requestProfilesFromBackend: function(populateCallback)
{
ProfilerAgent.getProfileHeaders(populateCallback);
},


resetProfiles: function()
{
this._reset();
},


addHeapSnapshotChunk: function(uid, chunk)
{
throw new Error("Never called");
},


finishHeapSnapshot: function(uid)
{
throw new Error("Never called");
},


reportHeapSnapshotProgress: function(done, total)
{
throw new Error("Never called");
},

__proto__: WebInspector.ProfileType.prototype
}


WebInspector.CPUProfileHeader = function(type, title, uid)
{
WebInspector.ProfileHeader.call(this, type, title, uid);
}

WebInspector.CPUProfileHeader.prototype = {
onTransferStarted: function()
{
this._jsonifiedProfile = "";
this.sidebarElement.subtitle = WebInspector.UIString("Loading\u2026 %s", Number.bytesToString(this._jsonifiedProfile.length));
},


onChunkTransferred: function(reader)
{
this.sidebarElement.subtitle = WebInspector.UIString("Loading\u2026 %d\%", Number.bytesToString(this._jsonifiedProfile.length));
},

onTransferFinished: function()
{

this.sidebarElement.subtitle = WebInspector.UIString("Parsing\u2026");
this._profile = JSON.parse(this._jsonifiedProfile);
this._jsonifiedProfile = null;
this.sidebarElement.subtitle = WebInspector.UIString("Loaded");
this.isTemporary = false;
},


onError: function(reader, e)
{
switch(e.target.error.code) {
case e.target.error.NOT_FOUND_ERR:
this.sidebarElement.subtitle = WebInspector.UIString("'%s' not found.", reader.fileName());
break;
case e.target.error.NOT_READABLE_ERR:
this.sidebarElement.subtitle = WebInspector.UIString("'%s' is not readable", reader.fileName());
break;
case e.target.error.ABORT_ERR:
break;
default:
this.sidebarElement.subtitle = WebInspector.UIString("'%s' error %d", reader.fileName(), e.target.error.code);
}
},


write: function(text)
{
this._jsonifiedProfile += text;
},

close: function() { },


createSidebarTreeElement: function()
{
return new WebInspector.ProfileSidebarTreeElement(this, WebInspector.UIString("Profile %d"), "profile-sidebar-tree-item");
},


createView: function(profilesPanel)
{
return new WebInspector.CPUProfileView(this);
},


canSaveToFile: function()
{
return true;
},

saveToFile: function()
{
var fileOutputStream = new WebInspector.FileOutputStream();


function getCPUProfileCallback(error, profile)
{
if (error) {
fileOutputStream.close();
return;
}

if (!profile.head) {

fileOutputStream.close();
return;
}

fileOutputStream.write(JSON.stringify(profile), fileOutputStream.close.bind(fileOutputStream));
}

function onOpen()
{
ProfilerAgent.getCPUProfile(this.uid, getCPUProfileCallback.bind(this));
}

this._fileName = this._fileName || "CPU-" + new Date().toISO8601Compact() + this._profileType.fileExtension();
fileOutputStream.open(this._fileName, onOpen.bind(this));
},


loadFromFile: function(file)
{
this.title = file.name;
this.sidebarElement.subtitle = WebInspector.UIString("Loading\u2026");
this.sidebarElement.wait = true;

var fileReader = new WebInspector.ChunkedFileReader(file, 10000000, this);
fileReader.start(this);
},

__proto__: WebInspector.ProfileHeader.prototype
}
;



WebInspector.CSSSelectorDataGridNode = function(profileView, data)
{
WebInspector.DataGridNode.call(this, data, false);
this._profileView = profileView;
}

WebInspector.CSSSelectorDataGridNode.prototype = {
get data()
{
var data = {};
data.selector = this._data.selector;
data.matches = this._data.matchCount;

if (this._profileView.showTimeAsPercent.get())
data.time = Number(this._data.timePercent).toFixed(1) + "%";
else
data.time = Number.secondsToString(this._data.time / 1000, true);

return data;
},

get rawData()
{
return this._data;
},

createCell: function(columnIdentifier)
{
var cell = WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);
if (columnIdentifier === "selector" && cell.firstChild) {
cell.firstChild.title = this.rawData.selector;
return cell;
}

if (columnIdentifier !== "source")
return cell;

cell.removeChildren();

if (this.rawData.url) {
var wrapperDiv = cell.createChild("div");
wrapperDiv.appendChild(WebInspector.linkifyResourceAsNode(this.rawData.url, this.rawData.lineNumber));
}

return cell;
},

__proto__: WebInspector.DataGridNode.prototype
}


WebInspector.CSSSelectorProfileView = function(profile)
{
WebInspector.View.call(this);

this.element.addStyleClass("profile-view");

this.showTimeAsPercent = WebInspector.settings.createSetting("selectorProfilerShowTimeAsPercent", true);

var columns = [
{id: "selector", title: WebInspector.UIString("Selector"), width: "550px", sortable: true},
{id: "source", title: WebInspector.UIString("Source"), width: "100px", sortable: true},
{id: "time", title: WebInspector.UIString("Total"), width: "72px", sort: WebInspector.DataGrid.Order.Descending, sortable: true},
{id: "matches", title: WebInspector.UIString("Matches"), width: "72px", sortable: true}
];

this.dataGrid = new WebInspector.DataGrid(columns);
this.dataGrid.element.addStyleClass("selector-profile-view");
this.dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortProfile, this);
this.dataGrid.element.addEventListener("mousedown", this._mouseDownInDataGrid.bind(this), true);
this.dataGrid.show(this.element);

this.percentButton = new WebInspector.StatusBarButton("", "percent-time-status-bar-item");
this.percentButton.addEventListener("click", this._percentClicked, this);

this.profile = profile;

this._createProfileNodes();
this._sortProfile();
this._updatePercentButton();
}

WebInspector.CSSSelectorProfileView.prototype = {
get statusBarItems()
{
return [this.percentButton.element];
},

get profile()
{
return this._profile;
},

set profile(profile)
{
this._profile = profile;
},

_createProfileNodes: function()
{
var data = this.profile.data;
if (!data) {

return;
}

this.profile.children = [];
for (var i = 0; i < data.length; ++i) {
data[i].timePercent = data[i].time * 100 / this.profile.totalTime;
var node = new WebInspector.CSSSelectorDataGridNode(this, data[i]);
this.profile.children.push(node);
}
},

rebuildGridItems: function()
{
this.dataGrid.rootNode().removeChildren();

var children = this.profile.children;
var count = children.length;

for (var index = 0; index < count; ++index)
this.dataGrid.rootNode().appendChild(children[index]);
},

refreshData: function()
{
var child = this.dataGrid.rootNode().children[0];
while (child) {
child.refresh();
child = child.traverseNextNode(false, null, true);
}
},

refreshShowAsPercents: function()
{
this._updatePercentButton();
this.refreshData();
},

_percentClicked: function(event)
{
this.showTimeAsPercent.set(!this.showTimeAsPercent.get());
this.refreshShowAsPercents();
},

_updatePercentButton: function()
{
if (this.showTimeAsPercent.get()) {
this.percentButton.title = WebInspector.UIString("Show absolute times.");
this.percentButton.toggled = true;
} else {
this.percentButton.title = WebInspector.UIString("Show times as percentages.");
this.percentButton.toggled = false;
}
},

_sortProfile: function()
{
var sortAscending = this.dataGrid.isSortOrderAscending();
var sortColumnIdentifier = this.dataGrid.sortColumnIdentifier();

function selectorComparator(a, b)
{
var result = b.rawData.selector.compareTo(a.rawData.selector);
return sortAscending ? -result : result;
}

function sourceComparator(a, b)
{
var aRawData = a.rawData;
var bRawData = b.rawData;
var result = bRawData.url.compareTo(aRawData.url);
if (!result)
result = bRawData.lineNumber - aRawData.lineNumber;
return sortAscending ? -result : result;
}

function timeComparator(a, b)
{
const result = b.rawData.time - a.rawData.time;
return sortAscending ? -result : result;
}

function matchesComparator(a, b)
{
const result = b.rawData.matchCount - a.rawData.matchCount;
return sortAscending ? -result : result;
}

var comparator;
switch (sortColumnIdentifier) {
case "time":
comparator = timeComparator;
break;
case "matches":
comparator = matchesComparator;
break;
case "selector":
comparator = selectorComparator;
break;
case "source":
comparator = sourceComparator;
break;
}

this.profile.children.sort(comparator);

this.rebuildGridItems();
},

_mouseDownInDataGrid: function(event)
{
if (event.detail < 2)
return;

var cell = event.target.enclosingNodeOrSelfWithNodeName("td");
if (!cell)
return;

if (cell.hasStyleClass("time-column"))
this.showTimeAsPercent.set(!this.showTimeAsPercent.get());
else
return;

this.refreshShowAsPercents();

event.consume(true);
},

__proto__: WebInspector.View.prototype
}


WebInspector.CSSSelectorProfileType = function()
{
WebInspector.ProfileType.call(this, WebInspector.CSSSelectorProfileType.TypeId, WebInspector.UIString("Collect CSS Selector Profile"));
this._recording = false;
this._profileUid = 1;
WebInspector.CSSSelectorProfileType.instance = this;
}

WebInspector.CSSSelectorProfileType.TypeId = "SELECTOR";

WebInspector.CSSSelectorProfileType.prototype = {
get buttonTooltip()
{
return this._recording ? WebInspector.UIString("Stop CSS selector profiling.") : WebInspector.UIString("Start CSS selector profiling.");
},


buttonClicked: function()
{
if (this._recording) {
this._stopRecordingProfile();
return false;
} else {
this._startRecordingProfile();
return true;
}
},

get treeItemTitle()
{
return WebInspector.UIString("CSS SELECTOR PROFILES");
},

get description()
{
return WebInspector.UIString("CSS selector profiles show how long the selector matching has taken in total and how many times a certain selector has matched DOM elements. The results are approximate due to matching algorithm optimizations.");
},

reset: function()
{
this._profileUid = 1;
},

setRecordingProfile: function(isProfiling)
{
this._recording = isProfiling;
},

_startRecordingProfile: function()
{
this._recording = true;
CSSAgent.startSelectorProfiler();
},

_stopRecordingProfile: function()
{

function callback(error, profile)
{
if (error)
return;

var uid = this._profileUid++;
var title = WebInspector.UIString("Profile %d", uid) + String.sprintf(" (%s)", Number.secondsToString(profile.totalTime / 1000));
this.addProfile(new WebInspector.CSSProfileHeader(this, title, uid, profile));
}

this._recording = false;
CSSAgent.stopSelectorProfiler(callback.bind(this));
},


createTemporaryProfile: function(title)
{
title = title || WebInspector.UIString("Recording\u2026");
return new WebInspector.CSSProfileHeader(this, title);
},

__proto__: WebInspector.ProfileType.prototype
}



WebInspector.CSSProfileHeader = function(type, title, uid, protocolData)
{
WebInspector.ProfileHeader.call(this, type, title, uid);
this._protocolData = protocolData;
}

WebInspector.CSSProfileHeader.prototype = {

createSidebarTreeElement: function()
{
return new WebInspector.ProfileSidebarTreeElement(this, this.title, "profile-sidebar-tree-item");
},


createView: function(profilesPanel)
{
var profile =   (this._protocolData);
return new WebInspector.CSSSelectorProfileView(profile);
},

__proto__: WebInspector.ProfileHeader.prototype
}
;



WebInspector.FlameChart = function(cpuProfileView)
{
WebInspector.View.call(this);
this.registerRequiredCSS("flameChart.css");
this.element.className = "fill";
this.element.id = "cpu-flame-chart";

this._overviewContainer = this.element.createChild("div", "overview-container");
this._overviewGrid = new WebInspector.OverviewGrid("flame-chart");
this._overviewContainer.appendChild(this._overviewGrid.element);
this._overviewCalculator = new WebInspector.FlameChart.OverviewCalculator();
this._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
this._overviewCanvas = this._overviewContainer.createChild("canvas");

this._chartContainer = this.element.createChild("div", "chart-container");
this._timelineGrid = new WebInspector.TimelineGrid();
this._chartContainer.appendChild(this._timelineGrid.element);
this._calculator = new WebInspector.FlameChart.Calculator();

this._canvas = this._chartContainer.createChild("canvas");
WebInspector.installDragHandle(this._canvas, this._startCanvasDragging.bind(this), this._canvasDragging.bind(this), this._endCanvasDragging.bind(this), "col-resize");

this._cpuProfileView = cpuProfileView;
this._windowLeft = 0.0;
this._windowRight = 1.0;
this._barHeight = 15;
this._minWidth = 1;
this._paddingLeft = 15;
this._canvas.addEventListener("mousewheel", this._onMouseWheel.bind(this), false);
this.element.addEventListener("click", this._onClick.bind(this), false);
this._popoverHelper = new WebInspector.PopoverHelper(this._chartContainer, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
this._popoverHelper.setTimeout(250);
this._linkifier = new WebInspector.Linkifier();
this._highlightedNodeIndex = -1;

if (!WebInspector.FlameChart._colorGenerator)
WebInspector.FlameChart._colorGenerator = new WebInspector.FlameChart.ColorGenerator();
}


WebInspector.FlameChart.Calculator = function()
{
}

WebInspector.FlameChart.Calculator.prototype = {

_updateBoundaries: function(flameChart)
{
this._minimumBoundaries = flameChart._windowLeft * flameChart._timelineData.totalTime;
this._maximumBoundaries = flameChart._windowRight * flameChart._timelineData.totalTime;
this.paddingLeft = flameChart._paddingLeft;
this._width = flameChart._canvas.width - this.paddingLeft;
this._timeToPixel = this._width / this.boundarySpan();
},


computePosition: function(time)
{
return (time - this._minimumBoundaries) * this._timeToPixel + this.paddingLeft;
},

formatTime: function(value)
{
return Number.secondsToString((value + this._minimumBoundaries) / 1000);
},

maximumBoundary: function()
{
return this._maximumBoundaries;
},

minimumBoundary: function()
{
return this._minimumBoundaries;
},

zeroTime: function()
{
return 0;
},

boundarySpan: function()
{
return this._maximumBoundaries - this._minimumBoundaries;
}
}


WebInspector.FlameChart.OverviewCalculator = function()
{
}

WebInspector.FlameChart.OverviewCalculator.prototype = {

_updateBoundaries: function(flameChart)
{
this._minimumBoundaries = 0;
this._maximumBoundaries = flameChart._timelineData.totalTime;
this._xScaleFactor = flameChart._canvas.width / flameChart._timelineData.totalTime;
},


computePosition: function(time)
{
return (time - this._minimumBoundaries) * this._xScaleFactor;
},

formatTime: function(value)
{
return Number.secondsToString((value + this._minimumBoundaries) / 1000);
},

maximumBoundary: function()
{
return this._maximumBoundaries;
},

minimumBoundary: function()
{
return this._minimumBoundaries;
},

zeroTime: function()
{
return this._minimumBoundaries;
},

boundarySpan: function()
{
return this._maximumBoundaries - this._minimumBoundaries;
}
}

WebInspector.FlameChart.Events = {
SelectedNode: "SelectedNode"
}


WebInspector.FlameChart.ColorGenerator = function()
{
this._colorPairs = {};
this._currentColorIndex = 0;
}

WebInspector.FlameChart.ColorGenerator.prototype = {

_colorPairForID: function(id)
{
var colorPairs = this._colorPairs;
var colorPair = colorPairs[id];
if (!colorPair) {
var currentColorIndex = ++this._currentColorIndex;
var hue = (currentColorIndex * 5 + 11 * (currentColorIndex % 2)) % 360;
colorPairs[id] = colorPair = {highlighted: "hsla(" + hue + ", 100%, 33%, 0.7)", normal: "hsla(" + hue + ", 100%, 66%, 0.7)"};
}
return colorPair;
}
}


WebInspector.FlameChart.Entry = function(colorPair, depth, duration, startTime, node)
{
this.colorPair = colorPair;
this.depth = depth;
this.duration = duration;
this.startTime = startTime;
this.node = node;
this.selfTime = 0;
}

WebInspector.FlameChart.prototype = {

selectRange: function(timeLeft, timeRight)
{
this._overviewGrid.setWindow(timeLeft / this._totalTime, timeRight / this._totalTime);
},

_onWindowChanged: function(event)
{
this._hidePopover();
this._scheduleUpdate();
},

_startCanvasDragging: function(event)
{
if (!this._timelineData)
return false;
this._isDragging = true;
this._dragStartPoint = event.pageX;
this._dragStartWindowLeft = this._windowLeft;
this._dragStartWindowRight = this._windowRight;
this._hidePopover();
return true;
},

_canvasDragging: function(event)
{
var pixelShift = this._dragStartPoint - event.pageX;
var windowShift = pixelShift / this._totalPixels;

var windowLeft = Math.max(0, this._dragStartWindowLeft + windowShift);
if (windowLeft === this._windowLeft)
return;
windowShift = windowLeft - this._dragStartWindowLeft;

var windowRight = Math.min(1, this._dragStartWindowRight + windowShift);
if (windowRight === this._windowRight)
return;
windowShift = windowRight - this._dragStartWindowRight;
this._overviewGrid.setWindow(this._dragStartWindowLeft + windowShift, this._dragStartWindowRight + windowShift);
},

_endCanvasDragging: function()
{
this._isDragging = false;
},

_calculateTimelineData: function()
{
if (this._cpuProfileView.samples)
return this._calculateTimelineDataForSamples();

if (this._timelineData)
return this._timelineData;

if (!this._cpuProfileView.profileHead)
return null;

var index = 0;
var entries = [];

function appendReversedArray(toArray, fromArray)
{
for (var i = fromArray.length - 1; i >= 0; --i)
toArray.push(fromArray[i]);
}

var stack = [];
appendReversedArray(stack, this._cpuProfileView.profileHead.children);

var levelOffsets =   ([0]);
var levelExitIndexes =   ([0]);
var colorGenerator = WebInspector.FlameChart._colorGenerator;

while (stack.length) {
var level = levelOffsets.length - 1;
var node = stack.pop();
var offset = levelOffsets[level];

var colorPair = colorGenerator._colorPairForID(node.functionName + ":" + node.url + ":" + node.lineNumber);

entries.push(new WebInspector.FlameChart.Entry(colorPair, level, node.totalTime, offset, node));

++index;

levelOffsets[level] += node.totalTime;
if (node.children.length) {
levelExitIndexes.push(stack.length);
levelOffsets.push(offset + node.selfTime / 2);
appendReversedArray(stack, node.children);
}

while (stack.length === levelExitIndexes[levelExitIndexes.length - 1]) {
levelOffsets.pop();
levelExitIndexes.pop();
}
}

this._timelineData = {
entries: entries,
totalTime: this._cpuProfileView.profileHead.totalTime,
}

return this._timelineData;
},

_calculateTimelineDataForSamples: function()
{
if (this._timelineData)
return this._timelineData;

if (!this._cpuProfileView.profileHead)
return null;

var samples = this._cpuProfileView.samples;
var idToNode = this._cpuProfileView._idToNode;
var samplesCount = samples.length;

var index = 0;
var entries =   ([]);

var openIntervals = [];
var stackTrace = [];
var colorGenerator = WebInspector.FlameChart._colorGenerator;
for (var sampleIndex = 0; sampleIndex < samplesCount; sampleIndex++) {
var node = idToNode[samples[sampleIndex]];
stackTrace.length = 0;
while (node) {
stackTrace.push(node);
node = node.parent;
}
stackTrace.pop(); 

var depth = 0;
node = stackTrace.pop();
var intervalIndex;
while (node && depth < openIntervals.length && node === openIntervals[depth].node) {
intervalIndex = openIntervals[depth].index;
entries[intervalIndex].duration += 1;
node = stackTrace.pop();
++depth;
}
if (depth < openIntervals.length)
openIntervals.length = depth;
if (!node) {
entries[intervalIndex].selfTime += 1;
continue;
}

while (node) {
var colorPair = colorGenerator._colorPairForID(node.functionName + ":" + node.url + ":" + node.lineNumber);

entries.push(new WebInspector.FlameChart.Entry(colorPair, depth, 1, sampleIndex, node));
openIntervals.push({node: node, index: index});
++index;

node = stackTrace.pop();
++depth;
}
entries[entries.length - 1].selfTime += 1;
}

this._timelineData = {
entries: entries,
totalTime: samplesCount,
};

return this._timelineData;
},

_getPopoverAnchor: function(element, event)
{
if (this._isDragging)
return null;

var nodeIndex = this._coordinatesToNodeIndex(event.offsetX, event.offsetY);

this._highlightedNodeIndex = nodeIndex;
this.update();

if (nodeIndex === -1)
return null;

var anchorBox = new AnchorBox();
this._entryToAnchorBox(this._timelineData.entries[nodeIndex], anchorBox);
anchorBox.x += event.pageX - event.offsetX;
anchorBox.y += event.pageY - event.offsetY;

return anchorBox;
},

_showPopover: function(anchor, popover)
{
if (this._isDragging)
return;
var entry = this._timelineData.entries[this._highlightedNodeIndex];
var node = entry.node;
if (!node)
return;
var contentHelper = new WebInspector.PopoverContentHelper(node.functionName);
if (this._cpuProfileView.samples) {
contentHelper.appendTextRow(WebInspector.UIString("Self time"), Number.secondsToString(entry.selfTime / 1000, true));
contentHelper.appendTextRow(WebInspector.UIString("Total time"), Number.secondsToString(entry.duration / 1000, true));
}
contentHelper.appendTextRow(WebInspector.UIString("Aggregated self time"), Number.secondsToString(node.selfTime / 1000, true));
contentHelper.appendTextRow(WebInspector.UIString("Aggregated total time"), Number.secondsToString(node.totalTime / 1000, true));
if (node.numberOfCalls)
contentHelper.appendTextRow(WebInspector.UIString("Number of calls"), node.numberOfCalls);
if (node.url) {
var link = this._linkifier.linkifyLocation(node.url, node.lineNumber);
contentHelper.appendElementRow("Location", link);
}

popover.show(contentHelper._contentTable, anchor);
},

_hidePopover: function()
{
this._popoverHelper.hidePopover();
this._linkifier.reset();
},

_onClick: function(e)
{
if (this._highlightedNodeIndex === -1)
return;
var node = this._timelineData.entries[this._highlightedNodeIndex].node;
this.dispatchEventToListeners(WebInspector.FlameChart.Events.SelectedNode, node);
},

_onMouseWheel: function(e)
{
var zoomFactor = (e.wheelDelta > 0) ? 0.9 : 1.1;
var windowPoint = (this._pixelWindowLeft + e.offsetX) / this._totalPixels;
var overviewReferencePoint = Math.floor(windowPoint * this._pixelWindowWidth);
this._overviewGrid.zoom(zoomFactor, overviewReferencePoint);
this._hidePopover();
},


_coordinatesToNodeIndex: function(x, y)
{
var timelineData = this._timelineData;
if (!timelineData)
return -1;
var timelineEntries = timelineData.entries;
var cursorTime = (x + this._pixelWindowLeft - this._paddingLeft) * this._pixelToTime;
var cursorLevel = Math.floor((this._canvas.height - y) / this._barHeight);

for (var i = 0; i < timelineEntries.length; ++i) {
if (cursorTime < timelineEntries[i].startTime)
return -1;
if (cursorTime < (timelineEntries[i].startTime + timelineEntries[i].duration)
&& cursorLevel === timelineEntries[i].depth)
return i;
}
return -1;
},

onResize: function()
{
this._updateOverviewCanvas = true;
this._hidePopover();
this._scheduleUpdate();
},

_drawOverviewCanvas: function(width, height)
{
this._overviewCanvas.width = width;
this._overviewCanvas.height = height;

if (!this._timelineData)
return;

var timelineEntries = this._timelineData.entries;

var drawData = new Uint8Array(width);
var scaleFactor = width / this._totalTime;

for (var nodeIndex = 0; nodeIndex < timelineEntries.length; ++nodeIndex) {
var entry = timelineEntries[nodeIndex];
var start = Math.floor(entry.startTime * scaleFactor);
var finish = Math.floor((entry.startTime + entry.duration) * scaleFactor);
for (var x = start; x < finish; ++x)
drawData[x] = Math.max(drawData[x], entry.depth + 1);
}

var context = this._overviewCanvas.getContext("2d");
var yScaleFactor = 2;
context.lineWidth = 0.5;
context.strokeStyle = "rgba(20,0,0,0.8)";
context.fillStyle="rgba(214,225,254, 0.8)";
context.moveTo(0, height - 1);
for (var x = 0; x < width; ++x)
context.lineTo(x, height - drawData[x] * yScaleFactor - 1);
context.lineTo(width - 1, height - 1);
context.lineTo(0, height - 1);
context.fill();
context.stroke();
context.closePath();
},


_entryToAnchorBox: function(entry, anchorBox)
{
anchorBox.x = Math.floor(entry.startTime * this._timeToPixel) - this._pixelWindowLeft + this._paddingLeft;
anchorBox.y = this._canvas.height - (entry.depth + 1) * this._barHeight;
anchorBox.width = Math.floor(entry.duration * this._timeToPixel);
anchorBox.height = this._barHeight;
if (anchorBox.x < 0) {
anchorBox.width += anchorBox.x;
anchorBox.x = 0;
}
anchorBox.width = Number.constrain(anchorBox.width, 0, this._canvas.width - anchorBox.x);
},


draw: function(width, height)
{
var timelineData = this._calculateTimelineData();
if (!timelineData)
return;
var timelineEntries = timelineData.entries;
this._canvas.height = height;
this._canvas.width = width;
var barHeight = this._barHeight;

var context = this._canvas.getContext("2d");
var textPaddingLeft = 2;
context.font = (barHeight - 3) + "px sans-serif";
context.textBaseline = "top";
this._dotsWidth = context.measureText("\u2026").width;
var visibleTimeLeft = this._timeWindowLeft - this._paddingLeftTime;

var anchorBox = new AnchorBox();
for (var i = 0; i < timelineEntries.length; ++i) {
var entry = timelineEntries[i];
var startTime = entry.startTime;
if (startTime > this._timeWindowRight)
break;
if ((startTime + entry.duration) < visibleTimeLeft)
continue;
this._entryToAnchorBox(entry, anchorBox);
if (anchorBox.width < this._minWidth)
continue;

var colorPair = entry.colorPair;
var color;
if (this._highlightedNodeIndex === i)
color =  colorPair.highlighted;
else
color = colorPair.normal;

context.beginPath();
context.rect(anchorBox.x, anchorBox.y, anchorBox.width - 1, anchorBox.height - 1);
context.fillStyle = color;
context.fill();

var xText = Math.max(0, anchorBox.x);
var widthText = anchorBox.width - textPaddingLeft + anchorBox.x - xText;
var title = this._prepareTitle(context, entry.node.functionName, widthText);
if (title) {
context.fillStyle = "#333";
context.fillText(title, xText + textPaddingLeft, anchorBox.y - 1);
}
}
},

_prepareTitle: function(context, title, maxSize)
{
if (maxSize < this._dotsWidth)
return null;
var titleWidth = context.measureText(title).width;
if (maxSize > titleWidth)
return title;
maxSize -= this._dotsWidth;
var dotRegExp=/[\.\$]/g;
var match = dotRegExp.exec(title);
if (!match) {
var visiblePartSize = maxSize / titleWidth;
var newTextLength = Math.floor(title.length * visiblePartSize) + 1;
var minTextLength = 4;
if (newTextLength < minTextLength)
return null;
var substring;
do {
--newTextLength;
substring = title.substring(0, newTextLength);
} while (context.measureText(substring).width > maxSize);
return title.substring(0, newTextLength) + "\u2026";
}
while (match) {
var substring = title.substring(match.index + 1);
var width = context.measureText(substring).width;
if (maxSize > width)
return "\u2026" + substring;
match = dotRegExp.exec(title);
}
},

_scheduleUpdate: function()
{
if (this._updateTimerId)
return;
this._updateTimerId = setTimeout(this.update.bind(this), 10);
},

_updateBoundaries: function()
{
this._windowLeft = this._overviewGrid.windowLeft();
this._windowRight = this._overviewGrid.windowRight();
this._windowWidth = this._windowRight - this._windowLeft;

this._totalTime = this._timelineData.totalTime;
this._timeWindowLeft = this._windowLeft * this._totalTime;
this._timeWindowRight = this._windowRight * this._totalTime;

this._pixelWindowWidth = this._chartContainer.clientWidth;
this._totalPixels = Math.floor(this._pixelWindowWidth / this._windowWidth);
this._pixelWindowLeft = Math.floor(this._totalPixels * this._windowLeft);
this._pixelWindowRight = Math.floor(this._totalPixels * this._windowRight);

this._timeToPixel = this._totalPixels / this._totalTime;
this._pixelToTime = this._totalTime / this._totalPixels;
this._paddingLeftTime = this._paddingLeft / this._timeToPixel;
},

update: function()
{
this._updateTimerId = 0;
if (!this._timelineData)
this._calculateTimelineData();
if (!this._timelineData)
return;
this._updateBoundaries();
this.draw(this._chartContainer.clientWidth, this._chartContainer.clientHeight);
this._calculator._updateBoundaries(this);
this._overviewCalculator._updateBoundaries(this);
this._timelineGrid.element.style.width = this.element.clientWidth;
this._timelineGrid.updateDividers(this._calculator);
this._overviewGrid.updateDividers(this._overviewCalculator);
if (this._updateOverviewCanvas) {
this._drawOverviewCanvas(this._overviewContainer.clientWidth, this._overviewContainer.clientHeight);
this._updateOverviewCanvas = false;
}
},

__proto__: WebInspector.View.prototype
};
;



WebInspector.HeapSnapshotArraySlice = function(array, start, end)
{
this._array = array;
this._start = start;
this.length = end - start;
}

WebInspector.HeapSnapshotArraySlice.prototype = {
item: function(index)
{
return this._array[this._start + index];
},

slice: function(start, end)
{
if (typeof end === "undefined")
end = this.length;
return this._array.subarray(this._start + start, this._start + end);
}
}


WebInspector.HeapSnapshotEdge = function(snapshot, edges, edgeIndex)
{
this._snapshot = snapshot;
this._edges = edges;
this.edgeIndex = edgeIndex || 0;
}

WebInspector.HeapSnapshotEdge.prototype = {
clone: function()
{
return new WebInspector.HeapSnapshotEdge(this._snapshot, this._edges, this.edgeIndex);
},

hasStringName: function()
{
throw new Error("Not implemented");
},

name: function()
{
throw new Error("Not implemented");
},

node: function()
{
return this._snapshot.createNode(this.nodeIndex());
},

nodeIndex: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeToNodeOffset);
},

rawEdges: function()
{
return this._edges;
},

toString: function()
{
return "HeapSnapshotEdge: " + this.name();
},

type: function()
{
return this._snapshot._edgeTypes[this._type()];
},

serialize: function()
{
var node = this.node();
return {
name: this.name(),
node: node.serialize(),
nodeIndex: this.nodeIndex(),
type: this.type(),
distance: node.distance()
};
},

_type: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeTypeOffset);
}
};


WebInspector.HeapSnapshotEdgeIterator = function(edge)
{
this.edge = edge;
}

WebInspector.HeapSnapshotEdgeIterator.prototype = {
rewind: function()
{
this.edge.edgeIndex = 0;
},

hasNext: function()
{
return this.edge.edgeIndex < this.edge._edges.length;
},

index: function()
{
return this.edge.edgeIndex;
},

setIndex: function(newIndex)
{
this.edge.edgeIndex = newIndex;
},

item: function()
{
return this.edge;
},

next: function()
{
this.edge.edgeIndex += this.edge._snapshot._edgeFieldsCount;
}
};


WebInspector.HeapSnapshotRetainerEdge = function(snapshot, retainedNodeIndex, retainerIndex)
{
this._snapshot = snapshot;
this._retainedNodeIndex = retainedNodeIndex;

var retainedNodeOrdinal = retainedNodeIndex / snapshot._nodeFieldCount;
this._firstRetainer = snapshot._firstRetainerIndex[retainedNodeOrdinal];
this._retainersCount = snapshot._firstRetainerIndex[retainedNodeOrdinal + 1] - this._firstRetainer;

this.setRetainerIndex(retainerIndex);
}

WebInspector.HeapSnapshotRetainerEdge.prototype = {
clone: function()
{
return new WebInspector.HeapSnapshotRetainerEdge(this._snapshot, this._retainedNodeIndex, this.retainerIndex());
},

hasStringName: function()
{
return this._edge().hasStringName();
},

name: function()
{
return this._edge().name();
},

node: function()
{
return this._node();
},

nodeIndex: function()
{
return this._nodeIndex;
},

retainerIndex: function()
{
return this._retainerIndex;
},

setRetainerIndex: function(newIndex)
{
if (newIndex !== this._retainerIndex) {
this._retainerIndex = newIndex;
this.edgeIndex = newIndex;
}
},

set edgeIndex(edgeIndex)
{
var retainerIndex = this._firstRetainer + edgeIndex;
this._globalEdgeIndex = this._snapshot._retainingEdges[retainerIndex];
this._nodeIndex = this._snapshot._retainingNodes[retainerIndex];
delete this._edgeInstance;
delete this._nodeInstance;
},

_node: function()
{
if (!this._nodeInstance)
this._nodeInstance = this._snapshot.createNode(this._nodeIndex);
return this._nodeInstance;
},

_edge: function()
{
if (!this._edgeInstance) {
var edgeIndex = this._globalEdgeIndex - this._node()._edgeIndexesStart();
this._edgeInstance = this._snapshot.createEdge(this._node().rawEdges(), edgeIndex);
}
return this._edgeInstance;
},

toString: function()
{
return this._edge().toString();
},

serialize: function()
{
var node = this.node();
return {
name: this.name(),
node: node.serialize(),
nodeIndex: this.nodeIndex(),
type: this.type(),
distance: node.distance()
};
},

type: function()
{
return this._edge().type();
}
}


WebInspector.HeapSnapshotRetainerEdgeIterator = function(retainer)
{
this.retainer = retainer;
}

WebInspector.HeapSnapshotRetainerEdgeIterator.prototype = {
rewind: function()
{
this.retainer.setRetainerIndex(0);
},

hasNext: function()
{
return this.retainer.retainerIndex() < this.retainer._retainersCount;
},

index: function()
{
return this.retainer.retainerIndex();
},

setIndex: function(newIndex)
{
this.retainer.setRetainerIndex(newIndex);
},

item: function()
{
return this.retainer;
},

next: function()
{
this.retainer.setRetainerIndex(this.retainer.retainerIndex() + 1);
}
};


WebInspector.HeapSnapshotNode = function(snapshot, nodeIndex)
{
this._snapshot = snapshot;
this._firstNodeIndex = nodeIndex;
this.nodeIndex = nodeIndex;
}

WebInspector.HeapSnapshotNode.prototype = {
distance: function()
{
return this._snapshot._nodeDistances[this.nodeIndex / this._snapshot._nodeFieldCount];
},

className: function()
{
throw new Error("Not implemented");
},

classIndex: function()
{
throw new Error("Not implemented");
},

dominatorIndex: function()
{
var nodeFieldCount = this._snapshot._nodeFieldCount;
return this._snapshot._dominatorsTree[this.nodeIndex / this._snapshot._nodeFieldCount] * nodeFieldCount;
},

edges: function()
{
return new WebInspector.HeapSnapshotEdgeIterator(this._snapshot.createEdge(this.rawEdges(), 0));
},

edgesCount: function()
{
return (this._edgeIndexesEnd() - this._edgeIndexesStart()) / this._snapshot._edgeFieldsCount;
},

id: function()
{
throw new Error("Not implemented");
},

isRoot: function()
{
return this.nodeIndex === this._snapshot._rootNodeIndex;
},

name: function()
{
return this._snapshot._strings[this._name()];
},

rawEdges: function()
{
return new WebInspector.HeapSnapshotArraySlice(this._snapshot._containmentEdges, this._edgeIndexesStart(), this._edgeIndexesEnd());
},

retainedSize: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeRetainedSizeOffset];
},

retainers: function()
{
return new WebInspector.HeapSnapshotRetainerEdgeIterator(this._snapshot.createRetainingEdge(this.nodeIndex, 0));
},

selfSize: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeSelfSizeOffset];
},

type: function()
{
return this._snapshot._nodeTypes[this._type()];
},

serialize: function()
{
return {
id: this.id(),
name: this.name(),
distance: this.distance(),
nodeIndex: this.nodeIndex,
retainedSize: this.retainedSize(),
selfSize: this.selfSize(),
type: this.type(),
};
},

_name: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeNameOffset];
},

_edgeIndexesStart: function()
{
return this._snapshot._firstEdgeIndexes[this._ordinal()];
},

_edgeIndexesEnd: function()
{
return this._snapshot._firstEdgeIndexes[this._ordinal() + 1];
},

_ordinal: function()
{
return this.nodeIndex / this._snapshot._nodeFieldCount;
},

_nextNodeIndex: function()
{
return this.nodeIndex + this._snapshot._nodeFieldCount;
},

_type: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeTypeOffset];
}
};


WebInspector.HeapSnapshotNodeIterator = function(node)
{
this.node = node;
this._nodesLength = node._snapshot._nodes.length;
}

WebInspector.HeapSnapshotNodeIterator.prototype = {
rewind: function()
{
this.node.nodeIndex = this.node._firstNodeIndex;
},

hasNext: function()
{
return this.node.nodeIndex < this._nodesLength;
},

index: function()
{
return this.node.nodeIndex;
},

setIndex: function(newIndex)
{
this.node.nodeIndex = newIndex;
},

item: function()
{
return this.node;
},

next: function()
{
this.node.nodeIndex = this.node._nextNodeIndex();
}
}


WebInspector.HeapSnapshot = function(profile)
{
this.uid = profile.snapshot.uid;
this._nodes = profile.nodes;
this._containmentEdges = profile.edges;

this._metaNode = profile.snapshot.meta;
this._strings = profile.strings;

this._rootNodeIndex = 0;
if (profile.snapshot.root_index)
this._rootNodeIndex = profile.snapshot.root_index;

this._snapshotDiffs = {};
this._aggregatesForDiff = null;

this._init();
}


function HeapSnapshotMetainfo()
{

this.node_fields = [];
this.node_types = [];
this.edge_fields = [];
this.edge_types = [];
this.type_strings = {};


this.fields = [];
this.types = [];
}


function HeapSnapshotHeader()
{

this.title = "";
this.uid = 0;
this.meta = new HeapSnapshotMetainfo();
this.node_count = 0;
this.edge_count = 0;
}

WebInspector.HeapSnapshot.prototype = {
_init: function()
{
var meta = this._metaNode;

this._nodeTypeOffset = meta.node_fields.indexOf("type");
this._nodeNameOffset = meta.node_fields.indexOf("name");
this._nodeIdOffset = meta.node_fields.indexOf("id");
this._nodeSelfSizeOffset = meta.node_fields.indexOf("self_size");
this._nodeEdgeCountOffset = meta.node_fields.indexOf("edge_count");
this._nodeFieldCount = meta.node_fields.length;

this._nodeTypes = meta.node_types[this._nodeTypeOffset];
this._nodeHiddenType = this._nodeTypes.indexOf("hidden");
this._nodeObjectType = this._nodeTypes.indexOf("object");
this._nodeNativeType = this._nodeTypes.indexOf("native");
this._nodeCodeType = this._nodeTypes.indexOf("code");
this._nodeSyntheticType = this._nodeTypes.indexOf("synthetic");

this._edgeFieldsCount = meta.edge_fields.length;
this._edgeTypeOffset = meta.edge_fields.indexOf("type");
this._edgeNameOffset = meta.edge_fields.indexOf("name_or_index");
this._edgeToNodeOffset = meta.edge_fields.indexOf("to_node");

this._edgeTypes = meta.edge_types[this._edgeTypeOffset];
this._edgeTypes.push("invisible");
this._edgeElementType = this._edgeTypes.indexOf("element");
this._edgeHiddenType = this._edgeTypes.indexOf("hidden");
this._edgeInternalType = this._edgeTypes.indexOf("internal");
this._edgeShortcutType = this._edgeTypes.indexOf("shortcut");
this._edgeWeakType = this._edgeTypes.indexOf("weak");
this._edgeInvisibleType = this._edgeTypes.indexOf("invisible");

this.nodeCount = this._nodes.length / this._nodeFieldCount;
this._edgeCount = this._containmentEdges.length / this._edgeFieldsCount;

this._buildEdgeIndexes();
this._markInvisibleEdges();
this._buildRetainers();
this._calculateFlags();
this._calculateDistances();
var result = this._buildPostOrderIndex();

this._dominatorsTree = this._buildDominatorTree(result.postOrderIndex2NodeOrdinal, result.nodeOrdinal2PostOrderIndex);
this._calculateRetainedSizes(result.postOrderIndex2NodeOrdinal);
this._buildDominatedNodes();
},

_buildEdgeIndexes: function()
{
var nodes = this._nodes;
var nodeCount = this.nodeCount;
var firstEdgeIndexes = this._firstEdgeIndexes = new Uint32Array(nodeCount + 1);
var nodeFieldCount = this._nodeFieldCount;
var edgeFieldsCount = this._edgeFieldsCount;
var nodeEdgeCountOffset = this._nodeEdgeCountOffset;
firstEdgeIndexes[nodeCount] = this._containmentEdges.length;
for (var nodeOrdinal = 0, edgeIndex = 0; nodeOrdinal < nodeCount; ++nodeOrdinal) {
firstEdgeIndexes[nodeOrdinal] = edgeIndex;
edgeIndex += nodes[nodeOrdinal * nodeFieldCount + nodeEdgeCountOffset] * edgeFieldsCount;
}
},

_buildRetainers: function()
{
var retainingNodes = this._retainingNodes = new Uint32Array(this._edgeCount);
var retainingEdges = this._retainingEdges = new Uint32Array(this._edgeCount);


var firstRetainerIndex = this._firstRetainerIndex = new Uint32Array(this.nodeCount + 1);

var containmentEdges = this._containmentEdges;
var edgeFieldsCount = this._edgeFieldsCount;
var nodeFieldCount = this._nodeFieldCount;
var edgeToNodeOffset = this._edgeToNodeOffset;
var nodes = this._nodes;
var firstEdgeIndexes = this._firstEdgeIndexes;
var nodeCount = this.nodeCount;

for (var toNodeFieldIndex = edgeToNodeOffset, l = containmentEdges.length; toNodeFieldIndex < l; toNodeFieldIndex += edgeFieldsCount) {
var toNodeIndex = containmentEdges[toNodeFieldIndex];
if (toNodeIndex % nodeFieldCount)
throw new Error("Invalid toNodeIndex " + toNodeIndex);
++firstRetainerIndex[toNodeIndex / nodeFieldCount];
}
for (var i = 0, firstUnusedRetainerSlot = 0; i < nodeCount; i++) {
var retainersCount = firstRetainerIndex[i];
firstRetainerIndex[i] = firstUnusedRetainerSlot;
retainingNodes[firstUnusedRetainerSlot] = retainersCount;
firstUnusedRetainerSlot += retainersCount;
}
firstRetainerIndex[nodeCount] = retainingNodes.length;

var nextNodeFirstEdgeIndex = firstEdgeIndexes[0];
for (var srcNodeOrdinal = 0; srcNodeOrdinal < nodeCount; ++srcNodeOrdinal) {
var firstEdgeIndex = nextNodeFirstEdgeIndex;
nextNodeFirstEdgeIndex = firstEdgeIndexes[srcNodeOrdinal + 1];
var srcNodeIndex = srcNodeOrdinal * nodeFieldCount;
for (var edgeIndex = firstEdgeIndex; edgeIndex < nextNodeFirstEdgeIndex; edgeIndex += edgeFieldsCount) {
var toNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
if (toNodeIndex % nodeFieldCount)
throw new Error("Invalid toNodeIndex " + toNodeIndex);
var firstRetainerSlotIndex = firstRetainerIndex[toNodeIndex / nodeFieldCount];
var nextUnusedRetainerSlotIndex = firstRetainerSlotIndex + (--retainingNodes[firstRetainerSlotIndex]);
retainingNodes[nextUnusedRetainerSlotIndex] = srcNodeIndex;
retainingEdges[nextUnusedRetainerSlotIndex] = edgeIndex;
}
}
},


createNode: function(nodeIndex)
{
throw new Error("Not implemented");
},

createEdge: function(edges, edgeIndex)
{
throw new Error("Not implemented");
},

createRetainingEdge: function(retainedNodeIndex, retainerIndex)
{
throw new Error("Not implemented");
},

dispose: function()
{
delete this._nodes;
delete this._strings;
delete this._retainingEdges;
delete this._retainingNodes;
delete this._firstRetainerIndex;
if (this._aggregates) {
delete this._aggregates;
delete this._aggregatesSortedFlags;
}
delete this._dominatedNodes;
delete this._firstDominatedNodeIndex;
delete this._nodeDistances;
delete this._dominatorsTree;
},

_allNodes: function()
{
return new WebInspector.HeapSnapshotNodeIterator(this.rootNode());
},

rootNode: function()
{
return this.createNode(this._rootNodeIndex);
},

get rootNodeIndex()
{
return this._rootNodeIndex;
},

get totalSize()
{
return this.rootNode().retainedSize();
},

_getDominatedIndex: function(nodeIndex)
{
if (nodeIndex % this._nodeFieldCount)
throw new Error("Invalid nodeIndex: " + nodeIndex);
return this._firstDominatedNodeIndex[nodeIndex / this._nodeFieldCount];
},

_dominatedNodesOfNode: function(node)
{
var dominatedIndexFrom = this._getDominatedIndex(node.nodeIndex);
var dominatedIndexTo = this._getDominatedIndex(node._nextNodeIndex());
return new WebInspector.HeapSnapshotArraySlice(this._dominatedNodes, dominatedIndexFrom, dominatedIndexTo);
},


aggregates: function(sortedIndexes, key, filterString)
{
if (!this._aggregates) {
this._aggregates = {};
this._aggregatesSortedFlags = {};
}

var aggregatesByClassName = this._aggregates[key];
if (aggregatesByClassName) {
if (sortedIndexes && !this._aggregatesSortedFlags[key]) {
this._sortAggregateIndexes(aggregatesByClassName);
this._aggregatesSortedFlags[key] = sortedIndexes;
}
return aggregatesByClassName;
}

var filter;
if (filterString)
filter = this._parseFilter(filterString);

var aggregates = this._buildAggregates(filter);
this._calculateClassesRetainedSize(aggregates.aggregatesByClassIndex, filter);
aggregatesByClassName = aggregates.aggregatesByClassName;

if (sortedIndexes)
this._sortAggregateIndexes(aggregatesByClassName);

this._aggregatesSortedFlags[key] = sortedIndexes;
this._aggregates[key] = aggregatesByClassName;

return aggregatesByClassName;
},

aggregatesForDiff: function()
{
if (this._aggregatesForDiff)
return this._aggregatesForDiff;

var aggregatesByClassName = this.aggregates(true, "allObjects");
this._aggregatesForDiff  = {};

var node = this.createNode();
for (var className in aggregatesByClassName) {
var aggregate = aggregatesByClassName[className];
var indexes = aggregate.idxs;
var ids = new Array(indexes.length);
var selfSizes = new Array(indexes.length);
for (var i = 0; i < indexes.length; i++) {
node.nodeIndex = indexes[i];
ids[i] = node.id();
selfSizes[i] = node.selfSize();
}

this._aggregatesForDiff[className] = {
indexes: indexes,
ids: ids,
selfSizes: selfSizes
};
}
return this._aggregatesForDiff;
},

distanceForUserRoot: function(node)
{
return 1;
},

_calculateDistances: function()
{
var nodeFieldCount = this._nodeFieldCount;
var distances = new Uint32Array(this.nodeCount);


var nodesToVisit = new Uint32Array(this.nodeCount);
var nodesToVisitLength = 0;
for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
var node = iter.edge.node();
var distance = this.distanceForUserRoot(node);
if (distance !== -1) {
nodesToVisit[nodesToVisitLength++] = node.nodeIndex;
distances[node.nodeIndex / nodeFieldCount] = distance;
}
}
this._bfs(nodesToVisit, nodesToVisitLength, distances);


nodesToVisitLength = 0;
nodesToVisit[nodesToVisitLength++] = this._rootNodeIndex;
distances[this._rootNodeIndex / nodeFieldCount] = 1;
this._bfs(nodesToVisit, nodesToVisitLength, distances);
this._nodeDistances = distances;
},

_bfs: function(nodesToVisit, nodesToVisitLength, distances)
{

var edgeFieldsCount = this._edgeFieldsCount;
var nodeFieldCount = this._nodeFieldCount;
var containmentEdges = this._containmentEdges;
var firstEdgeIndexes = this._firstEdgeIndexes;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeTypeOffset = this._edgeTypeOffset;
var nodes = this._nodes;
var nodeCount = this.nodeCount;
var containmentEdgesLength = containmentEdges.length;
var edgeWeakType = this._edgeWeakType;

var index = 0;
while (index < nodesToVisitLength) {
var nodeIndex = nodesToVisit[index++]; 
var nodeOrdinal = nodeIndex / nodeFieldCount;
var distance = distances[nodeOrdinal] + 1;
var firstEdgeIndex = firstEdgeIndexes[nodeOrdinal];
var edgesEnd = firstEdgeIndexes[nodeOrdinal + 1];
for (var edgeIndex = firstEdgeIndex; edgeIndex < edgesEnd; edgeIndex += edgeFieldsCount) {
var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
if (edgeType == edgeWeakType)
continue;
var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
var childNodeOrdinal = childNodeIndex / nodeFieldCount;
if (distances[childNodeOrdinal])
continue;
distances[childNodeOrdinal] = distance;
nodesToVisit[nodesToVisitLength++] = childNodeIndex;
}
}
if (nodesToVisitLength > nodeCount)
throw new Error("BFS failed. Nodes to visit (" + nodesToVisitLength + ") is more than nodes count (" + nodeCount + ")");
},

_buildAggregates: function(filter)
{
var aggregates = {};
var aggregatesByClassName = {};
var classIndexes = [];
var nodes = this._nodes;
var mapAndFlag = this.userObjectsMapAndFlag();
var flags = mapAndFlag ? mapAndFlag.map : null;
var flag = mapAndFlag ? mapAndFlag.flag : 0;
var nodesLength = nodes.length;
var nodeNativeType = this._nodeNativeType;
var nodeFieldCount = this._nodeFieldCount;
var selfSizeOffset = this._nodeSelfSizeOffset;
var nodeTypeOffset = this._nodeTypeOffset;
var node = this.rootNode();
var nodeDistances = this._nodeDistances;

for (var nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
var nodeOrdinal = nodeIndex / nodeFieldCount;
if (flags && !(flags[nodeOrdinal] & flag))
continue;
node.nodeIndex = nodeIndex;
if (filter && !filter(node))
continue;
var selfSize = nodes[nodeIndex + selfSizeOffset];
if (!selfSize && nodes[nodeIndex + nodeTypeOffset] !== nodeNativeType)
continue;
var classIndex = node.classIndex();
if (!(classIndex in aggregates)) {
var nodeType = node.type();
var nameMatters = nodeType === "object" || nodeType === "native";
var value = {
count: 1,
distance: nodeDistances[nodeOrdinal],
self: selfSize,
maxRet: 0,
type: nodeType,
name: nameMatters ? node.name() : null,
idxs: [nodeIndex]
};
aggregates[classIndex] = value;
classIndexes.push(classIndex);
aggregatesByClassName[node.className()] = value;
} else {
var clss = aggregates[classIndex];
clss.distance = Math.min(clss.distance, nodeDistances[nodeOrdinal]);
++clss.count;
clss.self += selfSize;
clss.idxs.push(nodeIndex);
}
}


for (var i = 0, l = classIndexes.length; i < l; ++i) {
var classIndex = classIndexes[i];
aggregates[classIndex].idxs = aggregates[classIndex].idxs.slice();
}
return {aggregatesByClassName: aggregatesByClassName, aggregatesByClassIndex: aggregates};
},

_calculateClassesRetainedSize: function(aggregates, filter)
{
var rootNodeIndex = this._rootNodeIndex;
var node = this.createNode(rootNodeIndex);
var list = [rootNodeIndex];
var sizes = [-1];
var classes = [];
var seenClassNameIndexes = {};
var nodeFieldCount = this._nodeFieldCount;
var nodeTypeOffset = this._nodeTypeOffset;
var nodeNativeType = this._nodeNativeType;
var dominatedNodes = this._dominatedNodes;
var nodes = this._nodes;
var mapAndFlag = this.userObjectsMapAndFlag();
var flags = mapAndFlag ? mapAndFlag.map : null;
var flag = mapAndFlag ? mapAndFlag.flag : 0;
var firstDominatedNodeIndex = this._firstDominatedNodeIndex;

while (list.length) {
var nodeIndex = list.pop();
node.nodeIndex = nodeIndex;
var classIndex = node.classIndex();
var seen = !!seenClassNameIndexes[classIndex];
var nodeOrdinal = nodeIndex / nodeFieldCount;
var dominatedIndexFrom = firstDominatedNodeIndex[nodeOrdinal];
var dominatedIndexTo = firstDominatedNodeIndex[nodeOrdinal + 1];

if (!seen &&
(!flags || (flags[nodeOrdinal] & flag)) &&
(!filter || filter(node)) &&
(node.selfSize() || nodes[nodeIndex + nodeTypeOffset] === nodeNativeType)
) {
aggregates[classIndex].maxRet += node.retainedSize();
if (dominatedIndexFrom !== dominatedIndexTo) {
seenClassNameIndexes[classIndex] = true;
sizes.push(list.length);
classes.push(classIndex);
}
}
for (var i = dominatedIndexFrom; i < dominatedIndexTo; i++)
list.push(dominatedNodes[i]);

var l = list.length;
while (sizes[sizes.length - 1] === l) {
sizes.pop();
classIndex = classes.pop();
seenClassNameIndexes[classIndex] = false;
}
}
},

_sortAggregateIndexes: function(aggregates)
{
var nodeA = this.createNode();
var nodeB = this.createNode();
for (var clss in aggregates)
aggregates[clss].idxs.sort(
function(idxA, idxB) {
nodeA.nodeIndex = idxA;
nodeB.nodeIndex = idxB;
return nodeA.id() < nodeB.id() ? -1 : 1;
});
},

_buildPostOrderIndex: function()
{
var nodeFieldCount = this._nodeFieldCount;
var nodes = this._nodes;
var nodeCount = this.nodeCount;
var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;

var edgeFieldsCount = this._edgeFieldsCount;
var edgeTypeOffset = this._edgeTypeOffset;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeShortcutType = this._edgeShortcutType;
var firstEdgeIndexes = this._firstEdgeIndexes;
var containmentEdges = this._containmentEdges;
var containmentEdgesLength = this._containmentEdges.length;

var mapAndFlag = this.userObjectsMapAndFlag();
var flags = mapAndFlag ? mapAndFlag.map : null;
var flag = mapAndFlag ? mapAndFlag.flag : 0;

var nodesToVisit = new Uint32Array(nodeCount);
var postOrderIndex2NodeOrdinal = new Uint32Array(nodeCount);
var nodeOrdinal2PostOrderIndex = new Uint32Array(nodeCount);
var painted = new Uint8Array(nodeCount);
var nodesToVisitLength = 0;
var postOrderIndex = 0;
var grey = 1;
var black = 2;

nodesToVisit[nodesToVisitLength++] = rootNodeOrdinal;
painted[rootNodeOrdinal] = grey;

while (nodesToVisitLength) {
var nodeOrdinal = nodesToVisit[nodesToVisitLength - 1];

if (painted[nodeOrdinal] === grey) {
painted[nodeOrdinal] = black;
var nodeFlag = !flags || (flags[nodeOrdinal] & flag);
var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
if (nodeOrdinal !== rootNodeOrdinal && containmentEdges[edgeIndex + edgeTypeOffset] === edgeShortcutType)
continue;
var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
var childNodeOrdinal = childNodeIndex / nodeFieldCount;
var childNodeFlag = !flags || (flags[childNodeOrdinal] & flag);


if (nodeOrdinal !== rootNodeOrdinal && childNodeFlag && !nodeFlag)
continue;
if (!painted[childNodeOrdinal]) {
painted[childNodeOrdinal] = grey;
nodesToVisit[nodesToVisitLength++] = childNodeOrdinal;
}
}
} else {
nodeOrdinal2PostOrderIndex[nodeOrdinal] = postOrderIndex;
postOrderIndex2NodeOrdinal[postOrderIndex++] = nodeOrdinal;
--nodesToVisitLength;
}
}

if (postOrderIndex !== nodeCount) {
var dumpNode = this.rootNode();
for (var i = 0; i < nodeCount; ++i) {
if (painted[i] !== black) {
dumpNode.nodeIndex = i * nodeFieldCount;
console.log(JSON.stringify(dumpNode.serialize()));
var retainers = dumpNode.retainers();
while (retainers) {
console.log("edgeName: " + retainers.item().name() + " nodeClassName: " + retainers.item().node().className());
retainers = retainers.item().node().retainers();
}
}
}
throw new Error("Postordering failed. " + (nodeCount - postOrderIndex) + " hanging nodes");
}

return {postOrderIndex2NodeOrdinal: postOrderIndex2NodeOrdinal, nodeOrdinal2PostOrderIndex: nodeOrdinal2PostOrderIndex};
},





_buildDominatorTree: function(postOrderIndex2NodeOrdinal, nodeOrdinal2PostOrderIndex)
{
var nodeFieldCount = this._nodeFieldCount;
var nodes = this._nodes;
var firstRetainerIndex = this._firstRetainerIndex;
var retainingNodes = this._retainingNodes;
var retainingEdges = this._retainingEdges;
var edgeFieldsCount = this._edgeFieldsCount;
var edgeTypeOffset = this._edgeTypeOffset;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeShortcutType = this._edgeShortcutType;
var firstEdgeIndexes = this._firstEdgeIndexes;
var containmentEdges = this._containmentEdges;
var containmentEdgesLength = this._containmentEdges.length;
var rootNodeIndex = this._rootNodeIndex;

var mapAndFlag = this.userObjectsMapAndFlag();
var flags = mapAndFlag ? mapAndFlag.map : null;
var flag = mapAndFlag ? mapAndFlag.flag : 0;

var nodesCount = postOrderIndex2NodeOrdinal.length;
var rootPostOrderedIndex = nodesCount - 1;
var noEntry = nodesCount;
var dominators = new Uint32Array(nodesCount);
for (var i = 0; i < rootPostOrderedIndex; ++i)
dominators[i] = noEntry;
dominators[rootPostOrderedIndex] = rootPostOrderedIndex;



var affected = new Uint8Array(nodesCount);
var nodeOrdinal;

{ 
nodeOrdinal = this._rootNodeIndex / nodeFieldCount;
var beginEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal] + edgeToNodeOffset;
var endEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var toNodeFieldIndex = beginEdgeToNodeFieldIndex;
toNodeFieldIndex < endEdgeToNodeFieldIndex;
toNodeFieldIndex += edgeFieldsCount) {
var childNodeOrdinal = containmentEdges[toNodeFieldIndex] / nodeFieldCount;
affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]] = 1;
}
}

var changed = true;
while (changed) {
changed = false;
for (var postOrderIndex = rootPostOrderedIndex - 1; postOrderIndex >= 0; --postOrderIndex) {
if (affected[postOrderIndex] === 0)
continue;
affected[postOrderIndex] = 0;


if (dominators[postOrderIndex] === rootPostOrderedIndex)
continue;
nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
var nodeFlag = !flags || (flags[nodeOrdinal] & flag);
var newDominatorIndex = noEntry;
var beginRetainerIndex = firstRetainerIndex[nodeOrdinal];
var endRetainerIndex = firstRetainerIndex[nodeOrdinal + 1];
for (var retainerIndex = beginRetainerIndex; retainerIndex < endRetainerIndex; ++retainerIndex) {
var retainerEdgeIndex = retainingEdges[retainerIndex];
var retainerEdgeType = containmentEdges[retainerEdgeIndex + edgeTypeOffset];
var retainerNodeIndex = retainingNodes[retainerIndex];
if (retainerNodeIndex !== rootNodeIndex && retainerEdgeType === edgeShortcutType)
continue;
var retainerNodeOrdinal = retainerNodeIndex / nodeFieldCount;
var retainerNodeFlag = !flags || (flags[retainerNodeOrdinal] & flag);


if (retainerNodeIndex !== rootNodeIndex && nodeFlag && !retainerNodeFlag)
continue;
var retanerPostOrderIndex = nodeOrdinal2PostOrderIndex[retainerNodeOrdinal];
if (dominators[retanerPostOrderIndex] !== noEntry) {
if (newDominatorIndex === noEntry)
newDominatorIndex = retanerPostOrderIndex;
else {
while (retanerPostOrderIndex !== newDominatorIndex) {
while (retanerPostOrderIndex < newDominatorIndex)
retanerPostOrderIndex = dominators[retanerPostOrderIndex];
while (newDominatorIndex < retanerPostOrderIndex)
newDominatorIndex = dominators[newDominatorIndex];
}
}


if (newDominatorIndex === rootPostOrderedIndex)
break;
}
}
if (newDominatorIndex !== noEntry && dominators[postOrderIndex] !== newDominatorIndex) {
dominators[postOrderIndex] = newDominatorIndex;
changed = true;
nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
beginEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal] + edgeToNodeOffset;
endEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var toNodeFieldIndex = beginEdgeToNodeFieldIndex;
toNodeFieldIndex < endEdgeToNodeFieldIndex;
toNodeFieldIndex += edgeFieldsCount) {
var childNodeOrdinal = containmentEdges[toNodeFieldIndex] / nodeFieldCount;
affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]] = 1;
}
}
}
}

var dominatorsTree = new Uint32Array(nodesCount);
for (var postOrderIndex = 0, l = dominators.length; postOrderIndex < l; ++postOrderIndex) {
nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
dominatorsTree[nodeOrdinal] = postOrderIndex2NodeOrdinal[dominators[postOrderIndex]];
}
return dominatorsTree;
},

_calculateRetainedSizes: function(postOrderIndex2NodeOrdinal)
{
var nodeCount = this.nodeCount;
var nodes = this._nodes;
var nodeSelfSizeOffset = this._nodeSelfSizeOffset;
var nodeFieldCount = this._nodeFieldCount;
var dominatorsTree = this._dominatorsTree;

var nodeRetainedSizeOffset = this._nodeRetainedSizeOffset = this._nodeEdgeCountOffset;
delete this._nodeEdgeCountOffset;

for (var nodeIndex = 0, l = nodes.length; nodeIndex < l; nodeIndex += nodeFieldCount)
nodes[nodeIndex + nodeRetainedSizeOffset] = nodes[nodeIndex + nodeSelfSizeOffset];


for (var postOrderIndex = 0; postOrderIndex < nodeCount - 1; ++postOrderIndex) {
var nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
var nodeIndex = nodeOrdinal * nodeFieldCount;
var dominatorIndex = dominatorsTree[nodeOrdinal] * nodeFieldCount;
nodes[dominatorIndex + nodeRetainedSizeOffset] += nodes[nodeIndex + nodeRetainedSizeOffset];
}
},

_buildDominatedNodes: function()
{





var indexArray = this._firstDominatedNodeIndex = new Uint32Array(this.nodeCount + 1);

var dominatedNodes = this._dominatedNodes = new Uint32Array(this.nodeCount - 1);



var nodeFieldCount = this._nodeFieldCount;
var dominatorsTree = this._dominatorsTree;

var fromNodeOrdinal = 0;
var toNodeOrdinal = this.nodeCount;
var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;
if (rootNodeOrdinal === fromNodeOrdinal)
fromNodeOrdinal = 1;
else if (rootNodeOrdinal === toNodeOrdinal - 1)
toNodeOrdinal = toNodeOrdinal - 1;
else
throw new Error("Root node is expected to be either first or last");
for (var nodeOrdinal = fromNodeOrdinal; nodeOrdinal < toNodeOrdinal; ++nodeOrdinal)
++indexArray[dominatorsTree[nodeOrdinal]];


var firstDominatedNodeIndex = 0;
for (var i = 0, l = this.nodeCount; i < l; ++i) {
var dominatedCount = dominatedNodes[firstDominatedNodeIndex] = indexArray[i];
indexArray[i] = firstDominatedNodeIndex;
firstDominatedNodeIndex += dominatedCount;
}
indexArray[this.nodeCount] = dominatedNodes.length;


for (var nodeOrdinal = fromNodeOrdinal; nodeOrdinal < toNodeOrdinal; ++nodeOrdinal) {
var dominatorOrdinal = dominatorsTree[nodeOrdinal];
var dominatedRefIndex = indexArray[dominatorOrdinal];
dominatedRefIndex += (--dominatedNodes[dominatedRefIndex]);
dominatedNodes[dominatedRefIndex] = nodeOrdinal * nodeFieldCount;
}
},

_markInvisibleEdges: function()
{
throw new Error("Not implemented");
},

_numbersComparator: function(a, b)
{
return a < b ? -1 : (a > b ? 1 : 0);
},

_calculateFlags: function()
{
throw new Error("Not implemented");
},

userObjectsMapAndFlag: function()
{
throw new Error("Not implemented");
},

calculateSnapshotDiff: function(baseSnapshotId, baseSnapshotAggregates)
{
var snapshotDiff = this._snapshotDiffs[baseSnapshotId];
if (snapshotDiff)
return snapshotDiff;
snapshotDiff = {};

var aggregates = this.aggregates(true, "allObjects");
for (var className in baseSnapshotAggregates) {
var baseAggregate = baseSnapshotAggregates[className];
var diff = this._calculateDiffForClass(baseAggregate, aggregates[className]);
if (diff)
snapshotDiff[className] = diff;
}
var emptyBaseAggregate = { ids: [], indexes: [], selfSizes: [] };
for (var className in aggregates) {
if (className in baseSnapshotAggregates)
continue;
snapshotDiff[className] = this._calculateDiffForClass(emptyBaseAggregate, aggregates[className]);
}

this._snapshotDiffs[baseSnapshotId] = snapshotDiff;
return snapshotDiff;
},

_calculateDiffForClass: function(baseAggregate, aggregate)
{
var baseIds = baseAggregate.ids;
var baseIndexes = baseAggregate.indexes;
var baseSelfSizes = baseAggregate.selfSizes;

var indexes = aggregate ? aggregate.idxs : [];

var i = 0, l = baseIds.length;
var j = 0, m = indexes.length;
var diff = { addedCount: 0,
removedCount: 0,
addedSize: 0,
removedSize: 0,
deletedIndexes: [],
addedIndexes: [] };

var nodeB = this.createNode(indexes[j]);
while (i < l && j < m) {
var nodeAId = baseIds[i];
if (nodeAId < nodeB.id()) {
diff.deletedIndexes.push(baseIndexes[i]);
diff.removedCount++;
diff.removedSize += baseSelfSizes[i];
++i;
} else if (nodeAId > nodeB.id()) { 
diff.addedIndexes.push(indexes[j]);
diff.addedCount++;
diff.addedSize += nodeB.selfSize();
nodeB.nodeIndex = indexes[++j];
} else { 
++i;
nodeB.nodeIndex = indexes[++j];
}
}
while (i < l) {
diff.deletedIndexes.push(baseIndexes[i]);
diff.removedCount++;
diff.removedSize += baseSelfSizes[i];
++i;
}
while (j < m) {
diff.addedIndexes.push(indexes[j]);
diff.addedCount++;
diff.addedSize += nodeB.selfSize();
nodeB.nodeIndex = indexes[++j];
}
diff.countDelta = diff.addedCount - diff.removedCount;
diff.sizeDelta = diff.addedSize - diff.removedSize;
if (!diff.addedCount && !diff.removedCount)
return null;
return diff;
},

_nodeForSnapshotObjectId: function(snapshotObjectId)
{
for (var it = this._allNodes(); it.hasNext(); it.next()) {
if (it.node.id() === snapshotObjectId)
return it.node;
}
return null;
},

nodeClassName: function(snapshotObjectId)
{
var node = this._nodeForSnapshotObjectId(snapshotObjectId);
if (node)
return node.className();
return null;
},

dominatorIdsForNode: function(snapshotObjectId)
{
var node = this._nodeForSnapshotObjectId(snapshotObjectId);
if (!node)
return null;
var result = [];
while (!node.isRoot()) {
result.push(node.id());
node.nodeIndex = node.dominatorIndex();
}
return result;
},

_parseFilter: function(filter)
{
if (!filter)
return null;
var parsedFilter = eval("(function(){return " + filter + "})()");
return parsedFilter.bind(this);
},

createEdgesProvider: function(nodeIndex, showHiddenData)
{
var node = this.createNode(nodeIndex);
var filter = this.containmentEdgesFilter(showHiddenData);
return new WebInspector.HeapSnapshotEdgesProvider(this, filter, node.edges());
},

createEdgesProviderForTest: function(nodeIndex, filter)
{
var node = this.createNode(nodeIndex);
return new WebInspector.HeapSnapshotEdgesProvider(this, filter, node.edges());
},

retainingEdgesFilter: function(showHiddenData)
{
return null;
},

containmentEdgesFilter: function(showHiddenData)
{
return null;
},

createRetainingEdgesProvider: function(nodeIndex, showHiddenData)
{
var node = this.createNode(nodeIndex);
var filter = this.retainingEdgesFilter(showHiddenData);
return new WebInspector.HeapSnapshotEdgesProvider(this, filter, node.retainers());
},

createAddedNodesProvider: function(baseSnapshotId, className)
{
var snapshotDiff = this._snapshotDiffs[baseSnapshotId];
var diffForClass = snapshotDiff[className];
return new WebInspector.HeapSnapshotNodesProvider(this, null, diffForClass.addedIndexes);
},

createDeletedNodesProvider: function(nodeIndexes)
{
return new WebInspector.HeapSnapshotNodesProvider(this, null, nodeIndexes);
},

classNodesFilter: function()
{
return null;
},

createNodesProviderForClass: function(className, aggregatesKey)
{
return new WebInspector.HeapSnapshotNodesProvider(this, this.classNodesFilter(), this.aggregates(false, aggregatesKey)[className].idxs);
},

createNodesProviderForDominator: function(nodeIndex)
{
var node = this.createNode(nodeIndex);
return new WebInspector.HeapSnapshotNodesProvider(this, null, this._dominatedNodesOfNode(node));
},

updateStaticData: function()
{
return {nodeCount: this.nodeCount, rootNodeIndex: this._rootNodeIndex, totalSize: this.totalSize, uid: this.uid};
}
};


WebInspector.HeapSnapshotFilteredOrderedIterator = function(iterator, filter, unfilteredIterationOrder)
{
this._filter = filter;
this._iterator = iterator;
this._unfilteredIterationOrder = unfilteredIterationOrder;
this._iterationOrder = null;
this._position = 0;
this._currentComparator = null;
this._sortedPrefixLength = 0;
}

WebInspector.HeapSnapshotFilteredOrderedIterator.prototype = {
_createIterationOrder: function()
{
if (this._iterationOrder)
return;
if (this._unfilteredIterationOrder && !this._filter) {
this._iterationOrder = this._unfilteredIterationOrder.slice(0);
this._unfilteredIterationOrder = null;
return;
}
this._iterationOrder = [];
var iterator = this._iterator;
if (!this._unfilteredIterationOrder && !this._filter) {
for (iterator.rewind(); iterator.hasNext(); iterator.next())
this._iterationOrder.push(iterator.index());
} else if (!this._unfilteredIterationOrder) {
for (iterator.rewind(); iterator.hasNext(); iterator.next()) {
if (this._filter(iterator.item()))
this._iterationOrder.push(iterator.index());
}
} else {
var order = this._unfilteredIterationOrder.constructor === Array ?
this._unfilteredIterationOrder : this._unfilteredIterationOrder.slice(0);
for (var i = 0, l = order.length; i < l; ++i) {
iterator.setIndex(order[i]);
if (this._filter(iterator.item()))
this._iterationOrder.push(iterator.index());
}
this._unfilteredIterationOrder = null;
}
},

rewind: function()
{
this._position = 0;
},

hasNext: function()
{
return this._position < this._iterationOrder.length;
},

isEmpty: function()
{
if (this._iterationOrder)
return !this._iterationOrder.length;
if (this._unfilteredIterationOrder && !this._filter)
return !this._unfilteredIterationOrder.length;
var iterator = this._iterator;
if (!this._unfilteredIterationOrder && !this._filter) {
iterator.rewind();
return !iterator.hasNext();
} else if (!this._unfilteredIterationOrder) {
for (iterator.rewind(); iterator.hasNext(); iterator.next())
if (this._filter(iterator.item()))
return false;
} else {
var order = this._unfilteredIterationOrder.constructor === Array ?
this._unfilteredIterationOrder : this._unfilteredIterationOrder.slice(0);
for (var i = 0, l = order.length; i < l; ++i) {
iterator.setIndex(order[i]);
if (this._filter(iterator.item()))
return false;
}
}
return true;
},

item: function()
{
this._iterator.setIndex(this._iterationOrder[this._position]);
return this._iterator.item();
},

get length()
{
this._createIterationOrder();
return this._iterationOrder.length;
},

next: function()
{
++this._position;
},


serializeItemsRange: function(begin, end)
{
this._createIterationOrder();
if (begin > end)
throw new Error("Start position > end position: " + begin + " > " + end);
if (end >= this._iterationOrder.length)
end = this._iterationOrder.length;
if (this._sortedPrefixLength < end) {
this.sort(this._currentComparator, this._sortedPrefixLength, this._iterationOrder.length - 1, end - this._sortedPrefixLength);
this._sortedPrefixLength = end;
}

this._position = begin;
var startPosition = this._position;
var count = end - begin;
var result = new Array(count);
for (var i = 0 ; i < count && this.hasNext(); ++i, this.next())
result[i] = this.item().serialize();
result.length = i;
result.totalLength = this._iterationOrder.length;

result.startPosition = startPosition;
result.endPosition = this._position;
return result;
},

sortAll: function()
{
this._createIterationOrder();
if (this._sortedPrefixLength === this._iterationOrder.length)
return;
this.sort(this._currentComparator, this._sortedPrefixLength, this._iterationOrder.length - 1, this._iterationOrder.length);
this._sortedPrefixLength = this._iterationOrder.length;
},

sortAndRewind: function(comparator)
{
this._currentComparator = comparator;
this._sortedPrefixLength = 0;
this.rewind();
}
}

WebInspector.HeapSnapshotFilteredOrderedIterator.prototype.createComparator = function(fieldNames)
{
return {fieldName1: fieldNames[0], ascending1: fieldNames[1], fieldName2: fieldNames[2], ascending2: fieldNames[3]};
}


WebInspector.HeapSnapshotEdgesProvider = function(snapshot, filter, edgesIter)
{
this.snapshot = snapshot;
WebInspector.HeapSnapshotFilteredOrderedIterator.call(this, edgesIter, filter);
}

WebInspector.HeapSnapshotEdgesProvider.prototype = {
sort: function(comparator, leftBound, rightBound, count)
{
var fieldName1 = comparator.fieldName1;
var fieldName2 = comparator.fieldName2;
var ascending1 = comparator.ascending1;
var ascending2 = comparator.ascending2;

var edgeA = this._iterator.item().clone();
var edgeB = edgeA.clone();
var nodeA = this.snapshot.createNode();
var nodeB = this.snapshot.createNode();

function compareEdgeFieldName(ascending, indexA, indexB)
{
edgeA.edgeIndex = indexA;
edgeB.edgeIndex = indexB;
if (edgeB.name() === "__proto__") return -1;
if (edgeA.name() === "__proto__") return 1;
var result =
edgeA.hasStringName() === edgeB.hasStringName() ?
(edgeA.name() < edgeB.name() ? -1 : (edgeA.name() > edgeB.name() ? 1 : 0)) :
(edgeA.hasStringName() ? -1 : 1);
return ascending ? result : -result;
}

function compareNodeField(fieldName, ascending, indexA, indexB)
{
edgeA.edgeIndex = indexA;
nodeA.nodeIndex = edgeA.nodeIndex();
var valueA = nodeA[fieldName]();

edgeB.edgeIndex = indexB;
nodeB.nodeIndex = edgeB.nodeIndex();
var valueB = nodeB[fieldName]();

var result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
return ascending ? result : -result;
}

function compareEdgeAndNode(indexA, indexB) {
var result = compareEdgeFieldName(ascending1, indexA, indexB);
if (result === 0)
result = compareNodeField(fieldName2, ascending2, indexA, indexB);
return result;
}

function compareNodeAndEdge(indexA, indexB) {
var result = compareNodeField(fieldName1, ascending1, indexA, indexB);
if (result === 0)
result = compareEdgeFieldName(ascending2, indexA, indexB);
return result;
}

function compareNodeAndNode(indexA, indexB) {
var result = compareNodeField(fieldName1, ascending1, indexA, indexB);
if (result === 0)
result = compareNodeField(fieldName2, ascending2, indexA, indexB);
return result;
}

if (fieldName1 === "!edgeName")
this._iterationOrder.sortRange(compareEdgeAndNode, leftBound, rightBound, count);
else if (fieldName2 === "!edgeName")
this._iterationOrder.sortRange(compareNodeAndEdge, leftBound, rightBound, count);
else
this._iterationOrder.sortRange(compareNodeAndNode, leftBound, rightBound, count);
},

__proto__: WebInspector.HeapSnapshotFilteredOrderedIterator.prototype
}



WebInspector.HeapSnapshotNodesProvider = function(snapshot, filter, nodeIndexes)
{
this.snapshot = snapshot;
WebInspector.HeapSnapshotFilteredOrderedIterator.call(this, snapshot._allNodes(), filter, nodeIndexes);
}

WebInspector.HeapSnapshotNodesProvider.prototype = {
nodePosition: function(snapshotObjectId)
{
this._createIterationOrder();
if (this.isEmpty())
return -1;
this.sortAll();

var node = this.snapshot.createNode();
for (var i = 0; i < this._iterationOrder.length; i++) {
node.nodeIndex = this._iterationOrder[i];
if (node.id() === snapshotObjectId)
return i;
}
return -1;
},

sort: function(comparator, leftBound, rightBound, count)
{
var fieldName1 = comparator.fieldName1;
var fieldName2 = comparator.fieldName2;
var ascending1 = comparator.ascending1;
var ascending2 = comparator.ascending2;

var nodeA = this.snapshot.createNode();
var nodeB = this.snapshot.createNode();

function sortByNodeField(fieldName, ascending)
{
var valueOrFunctionA = nodeA[fieldName];
var valueA = typeof valueOrFunctionA !== "function" ? valueOrFunctionA : valueOrFunctionA.call(nodeA);
var valueOrFunctionB = nodeB[fieldName];
var valueB = typeof valueOrFunctionB !== "function" ? valueOrFunctionB : valueOrFunctionB.call(nodeB);
var result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
return ascending ? result : -result;
}

function sortByComparator(indexA, indexB) {
nodeA.nodeIndex = indexA;
nodeB.nodeIndex = indexB;
var result = sortByNodeField(fieldName1, ascending1);
if (result === 0)
result = sortByNodeField(fieldName2, ascending2);
return result;
}

this._iterationOrder.sortRange(sortByComparator, leftBound, rightBound, count);
},

__proto__: WebInspector.HeapSnapshotFilteredOrderedIterator.prototype
}

;



WebInspector.HeapSnapshotSortableDataGrid = function(columns)
{
WebInspector.DataGrid.call(this, columns);


this._recursiveSortingDepth = 0;

this._highlightedNode = null;

this._populatedAndSorted = false;
this.addEventListener("sorting complete", this._sortingComplete, this);
this.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this.sortingChanged, this);
}

WebInspector.HeapSnapshotSortableDataGrid.Events = {
ContentShown: "ContentShown"
}

WebInspector.HeapSnapshotSortableDataGrid.prototype = {

defaultPopulateCount: function()
{
return 100;
},

dispose: function()
{
var children = this.topLevelNodes();
for (var i = 0, l = children.length; i < l; ++i)
children[i].dispose();
},


wasShown: function()
{
if (this._populatedAndSorted)
this.dispatchEventToListeners(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, this);
},

_sortingComplete: function()
{
this.removeEventListener("sorting complete", this._sortingComplete, this);
this._populatedAndSorted = true;
this.dispatchEventToListeners(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, this);
},


willHide: function()
{
this._clearCurrentHighlight();
},


populateContextMenu: function(profilesPanel, contextMenu, event)
{
var td = event.target.enclosingNodeOrSelfWithNodeName("td");
if (!td)
return;
var node = td.heapSnapshotNode;
if (node instanceof WebInspector.HeapSnapshotInstanceNode || node instanceof WebInspector.HeapSnapshotObjectNode) {
function revealInDominatorsView()
{
profilesPanel.showObject(node.snapshotNodeId, "Dominators");
}
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Dominators view" : "Reveal in Dominators View"), revealInDominatorsView.bind(this));
} else if (node instanceof WebInspector.HeapSnapshotDominatorObjectNode) {
function revealInSummaryView()
{
profilesPanel.showObject(node.snapshotNodeId, "Summary");
}
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Summary view" : "Reveal in Summary View"), revealInSummaryView.bind(this));
}
},

resetSortingCache: function()
{
delete this._lastSortColumnIdentifier;
delete this._lastSortAscending;
},

topLevelNodes: function()
{
return this.rootNode().children;
},


highlightObjectByHeapSnapshotId: function(heapSnapshotObjectId)
{
},


highlightNode: function(node)
{
var prevNode = this._highlightedNode;
this._clearCurrentHighlight();
this._highlightedNode = node;
this._highlightedNode.element.addStyleClass("highlighted-row");

if (node === prevNode) {
var element = node.element;
var parent = element.parentElement;
var nextSibling = element.nextSibling;
parent.removeChild(element);
parent.insertBefore(element, nextSibling);
}
},

nodeWasDetached: function(node)
{
if (this._highlightedNode === node)
this._clearCurrentHighlight();
},

_clearCurrentHighlight: function()
{
if (!this._highlightedNode)
return
this._highlightedNode.element.removeStyleClass("highlighted-row");
this._highlightedNode = null;
},

changeNameFilter: function(filter)
{
filter = filter.toLowerCase();
var children = this.topLevelNodes();
for (var i = 0, l = children.length; i < l; ++i) {
var node = children[i];
if (node.depth === 0)
node.revealed = node._name.toLowerCase().indexOf(filter) !== -1;
}
this.updateVisibleNodes();
},

sortingChanged: function()
{
var sortAscending = this.isSortOrderAscending();
var sortColumnIdentifier = this.sortColumnIdentifier();
if (this._lastSortColumnIdentifier === sortColumnIdentifier && this._lastSortAscending === sortAscending)
return;
this._lastSortColumnIdentifier = sortColumnIdentifier;
this._lastSortAscending = sortAscending;
var sortFields = this._sortFields(sortColumnIdentifier, sortAscending);

function SortByTwoFields(nodeA, nodeB)
{
var field1 = nodeA[sortFields[0]];
var field2 = nodeB[sortFields[0]];
var result = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
if (!sortFields[1])
result = -result;
if (result !== 0)
return result;
field1 = nodeA[sortFields[2]];
field2 = nodeB[sortFields[2]];
result = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
if (!sortFields[3])
result = -result;
return result;
}
this._performSorting(SortByTwoFields);
},

_performSorting: function(sortFunction)
{
this.recursiveSortingEnter();
var children = this._topLevelNodes;
this.rootNode().removeChildren();
children.sort(sortFunction);
for (var i = 0, l = children.length; i < l; ++i) {
var child = children[i];
this.appendChildAfterSorting(child);
if (child.expanded)
child.sort();
}
this.updateVisibleNodes();
this.recursiveSortingLeave();
},

appendChildAfterSorting: function(child)
{
var revealed = child.revealed;
this.rootNode().appendChild(child);
child.revealed = revealed;
},

updateVisibleNodes: function()
{
},

recursiveSortingEnter: function()
{
++this._recursiveSortingDepth;
},

recursiveSortingLeave: function()
{
if (!this._recursiveSortingDepth)
return;
if (!--this._recursiveSortingDepth)
this.dispatchEventToListeners("sorting complete");
},

__proto__: WebInspector.DataGrid.prototype
}




WebInspector.HeapSnapshotViewportDataGrid = function(columns)
{
WebInspector.HeapSnapshotSortableDataGrid.call(this, columns);
this.scrollContainer.addEventListener("scroll", this._onScroll.bind(this), true);
this._topLevelNodes = [];
this._topPadding = new WebInspector.HeapSnapshotPaddingNode();
this._bottomPadding = new WebInspector.HeapSnapshotPaddingNode();

this._nodeToHighlightAfterScroll = null;
}

WebInspector.HeapSnapshotViewportDataGrid.prototype = {
topLevelNodes: function()
{
return this._topLevelNodes;
},

appendChildAfterSorting: function(child)
{

},

updateVisibleNodes: function()
{
var scrollTop = this.scrollContainer.scrollTop;

var viewPortHeight = this.scrollContainer.offsetHeight;

this._removePaddingRows();

var children = this._topLevelNodes;

var i = 0;
var topPadding = 0;
while (i < children.length) {
if (children[i].revealed) {
var newTop = topPadding + children[i].nodeHeight();
if (newTop > scrollTop)
break;
topPadding = newTop;
}
++i;
}

this.rootNode().removeChildren();

var heightToFill = viewPortHeight + (scrollTop - topPadding);
var filledHeight = 0;
while (i < children.length && filledHeight < heightToFill) {
if (children[i].revealed) {
this.rootNode().appendChild(children[i]);
filledHeight += children[i].nodeHeight();
}
++i;
}

var bottomPadding = 0;
while (i < children.length) {
bottomPadding += children[i].nodeHeight();
++i;
}

this._addPaddingRows(topPadding, bottomPadding);
},

appendTopLevelNode: function(node)
{
this._topLevelNodes.push(node);
},

removeTopLevelNodes: function()
{
this.rootNode().removeChildren();
this._topLevelNodes = [];
},


highlightNode: function(node)
{
if (this._isScrolledIntoView(node.element))
WebInspector.HeapSnapshotSortableDataGrid.prototype.highlightNode.call(this, node);
else {
node.element.scrollIntoViewIfNeeded(true);
this._nodeToHighlightAfterScroll = node;
}
},

_isScrolledIntoView: function(element)
{
var viewportTop = this.scrollContainer.scrollTop;
var viewportBottom = viewportTop + this.scrollContainer.clientHeight;
var elemTop = element.offsetTop
var elemBottom = elemTop + element.offsetHeight;
return elemBottom <= viewportBottom && elemTop >= viewportTop;
},

_addPaddingRows: function(top, bottom)
{
if (this._topPadding.element.parentNode !== this.dataTableBody)
this.dataTableBody.insertBefore(this._topPadding.element, this.dataTableBody.firstChild);
if (this._bottomPadding.element.parentNode !== this.dataTableBody)
this.dataTableBody.insertBefore(this._bottomPadding.element, this.dataTableBody.lastChild);
this._topPadding.setHeight(top);
this._bottomPadding.setHeight(bottom);
},

_removePaddingRows: function()
{
this._bottomPadding.removeFromTable();
this._topPadding.removeFromTable();
},

onResize: function()
{
WebInspector.HeapSnapshotSortableDataGrid.prototype.onResize.call(this);
this.updateVisibleNodes();
},

_onScroll: function(event)
{
this.updateVisibleNodes();

if (this._nodeToHighlightAfterScroll) {
WebInspector.HeapSnapshotSortableDataGrid.prototype.highlightNode.call(this, this._nodeToHighlightAfterScroll);
this._nodeToHighlightAfterScroll = null;
}
},

__proto__: WebInspector.HeapSnapshotSortableDataGrid.prototype
}


WebInspector.HeapSnapshotPaddingNode = function()
{
this.element = document.createElement("tr");
this.element.addStyleClass("revealed");
}

WebInspector.HeapSnapshotPaddingNode.prototype = {
setHeight: function(height)
{
this.element.style.height = height + "px";
},
removeFromTable: function()
{
var parent = this.element.parentNode;
if (parent)
parent.removeChild(this.element);
}
}



WebInspector.HeapSnapshotContainmentDataGrid = function(columns)
{
columns = columns || [
{id: "object", title: WebInspector.UIString("Object"), disclosure: true, sortable: true},
{id: "shallowSize", title: WebInspector.UIString("Shallow Size"), width: "120px", sortable: true},
{id: "retainedSize", title: WebInspector.UIString("Retained Size"), width: "120px", sortable: true, sort: WebInspector.DataGrid.Order.Descending}
];
WebInspector.HeapSnapshotSortableDataGrid.call(this, columns);
}

WebInspector.HeapSnapshotContainmentDataGrid.prototype = {
setDataSource: function(snapshot, nodeIndex)
{
this.snapshot = snapshot;
var node = new WebInspector.HeapSnapshotNode(snapshot, nodeIndex || snapshot.rootNodeIndex);
var fakeEdge = { node: node };
this.setRootNode(new WebInspector.HeapSnapshotObjectNode(this, false, fakeEdge, null));
this.rootNode().sort();
},

sortingChanged: function()
{
this.rootNode().sort();
},

__proto__: WebInspector.HeapSnapshotSortableDataGrid.prototype
}



WebInspector.HeapSnapshotRetainmentDataGrid = function()
{
this.showRetainingEdges = true;
var columns = [
{id: "object", title: WebInspector.UIString("Object"), disclosure: true, sortable: true},
{id: "shallowSize", title: WebInspector.UIString("Shallow Size"), width: "120px", sortable: true},
{id: "retainedSize", title: WebInspector.UIString("Retained Size"), width: "120px", sortable: true},
{id: "distance", title: WebInspector.UIString("Distance"), width: "80px", sortable: true, sort: WebInspector.DataGrid.Order.Ascending}
];
WebInspector.HeapSnapshotContainmentDataGrid.call(this, columns);
}

WebInspector.HeapSnapshotRetainmentDataGrid.Events = {
ExpandRetainersComplete: "ExpandRetainersComplete"
}

WebInspector.HeapSnapshotRetainmentDataGrid.prototype = {
_sortFields: function(sortColumn, sortAscending)
{
return {
object: ["_name", sortAscending, "_count", false],
count: ["_count", sortAscending, "_name", true],
shallowSize: ["_shallowSize", sortAscending, "_name", true],
retainedSize: ["_retainedSize", sortAscending, "_name", true],
distance: ["_distance", sortAscending, "_name", true]
}[sortColumn];
},

reset: function()
{
this.rootNode().removeChildren();
this.resetSortingCache();
},


setDataSource: function(snapshot, nodeIndex)
{
WebInspector.HeapSnapshotContainmentDataGrid.prototype.setDataSource.call(this, snapshot, nodeIndex);

var dataGrid = this;
var maxExpandLevels = 20;

function populateComplete()
{
this.removeEventListener(WebInspector.HeapSnapshotGridNode.Events.PopulateComplete, populateComplete, this);
this.expand();
if (--maxExpandLevels > 0 && this.children.length > 0 && (!this._distance || this._distance > 2)) {
var retainer = this.children[0];
retainer.addEventListener(WebInspector.HeapSnapshotGridNode.Events.PopulateComplete, populateComplete, retainer);
retainer.populate();
} else
dataGrid.dispatchEventToListeners(WebInspector.HeapSnapshotRetainmentDataGrid.Events.ExpandRetainersComplete);
}
this.rootNode().addEventListener(WebInspector.HeapSnapshotGridNode.Events.PopulateComplete, populateComplete, this.rootNode());
},

__proto__: WebInspector.HeapSnapshotContainmentDataGrid.prototype
}



WebInspector.HeapSnapshotConstructorsDataGrid = function()
{
var columns = [
{id: "object", title: WebInspector.UIString("Constructor"), disclosure: true, sortable: true},
{id: "distance", title: WebInspector.UIString("Distance"), width: "90px", sortable: true},
{id: "count", title: WebInspector.UIString("Objects Count"), width: "90px", sortable: true},
{id: "shallowSize", title: WebInspector.UIString("Shallow Size"), width: "120px", sortable: true},
{id: "retainedSize", title: WebInspector.UIString("Retained Size"), width: "120px", sort: WebInspector.DataGrid.Order.Descending, sortable: true}
];
WebInspector.HeapSnapshotViewportDataGrid.call(this, columns);
this._profileIndex = -1;
this._topLevelNodes = [];

this._objectIdToSelect = null;
}

WebInspector.HeapSnapshotConstructorsDataGrid.prototype = {
_sortFields: function(sortColumn, sortAscending)
{
return {
object: ["_name", sortAscending, "_count", false],
distance: ["_distance", sortAscending, "_retainedSize", true],
count: ["_count", sortAscending, "_name", true],
shallowSize: ["_shallowSize", sortAscending, "_name", true],
retainedSize: ["_retainedSize", sortAscending, "_name", true]
}[sortColumn];
},


highlightObjectByHeapSnapshotId: function(id)
{
if (!this.snapshot) {
this._objectIdToSelect = id;
return;
}

function didGetClassName(className)
{
var constructorNodes = this.topLevelNodes();
for (var i = 0; i < constructorNodes.length; i++) {
var parent = constructorNodes[i];
if (parent._name === className) {
parent.revealNodeBySnapshotObjectId(parseInt(id, 10));
return;
}
}
}
this.snapshot.nodeClassName(parseInt(id, 10), didGetClassName.bind(this));
},

setDataSource: function(snapshot)
{
this.snapshot = snapshot;
if (this._profileIndex === -1)
this._populateChildren();

if (this._objectIdToSelect) {
this.highlightObjectByHeapSnapshotId(this._objectIdToSelect);
this._objectIdToSelect = null;
}
},

_aggregatesReceived: function(key, aggregates)
{
for (var constructor in aggregates)
this.appendTopLevelNode(new WebInspector.HeapSnapshotConstructorNode(this, constructor, aggregates[constructor], key));
this.sortingChanged();
},

_populateChildren: function()
{

this.dispose();
this.removeTopLevelNodes();
this.resetSortingCache();

var key = this._profileIndex === -1 ? "allObjects" : this._minNodeId + ".." + this._maxNodeId;
var filter = this._profileIndex === -1 ? null : "function(node) { var id = node.id(); return id > " + this._minNodeId + " && id <= " + this._maxNodeId + "; }";

this.snapshot.aggregates(false, key, filter, this._aggregatesReceived.bind(this, key));
},

filterSelectIndexChanged: function(profiles, profileIndex)
{
this._profileIndex = profileIndex;

delete this._maxNodeId;
delete this._minNodeId;

if (this._profileIndex !== -1) {
this._minNodeId = profileIndex > 0 ? profiles[profileIndex - 1].maxJSObjectId : 0;
this._maxNodeId = profiles[profileIndex].maxJSObjectId;
}

this._populateChildren();
},

__proto__: WebInspector.HeapSnapshotViewportDataGrid.prototype
}



WebInspector.HeapSnapshotDiffDataGrid = function()
{
var columns = [
{id: "object", title: WebInspector.UIString("Constructor"), disclosure: true, sortable: true},
{id: "addedCount", title: WebInspector.UIString("# New"), width: "72px", sortable: true},
{id: "removedCount", title: WebInspector.UIString("# Deleted"), width: "72px", sortable: true},
{id: "countDelta", title: "# Delta", width: "64px", sortable: true},
{id: "addedSize", title: WebInspector.UIString("Alloc. Size"), width: "72px", sortable: true, sort: WebInspector.DataGrid.Order.Descending},
{id: "removedSize", title: WebInspector.UIString("Freed Size"), width: "72px", sortable: true},
{id: "sizeDelta", title: "Size Delta", width: "72px", sortable: true}
];
WebInspector.HeapSnapshotViewportDataGrid.call(this, columns);
}

WebInspector.HeapSnapshotDiffDataGrid.prototype = {

defaultPopulateCount: function()
{
return 50;
},

_sortFields: function(sortColumn, sortAscending)
{
return {
object: ["_name", sortAscending, "_count", false],
addedCount: ["_addedCount", sortAscending, "_name", true],
removedCount: ["_removedCount", sortAscending, "_name", true],
countDelta: ["_countDelta", sortAscending, "_name", true],
addedSize: ["_addedSize", sortAscending, "_name", true],
removedSize: ["_removedSize", sortAscending, "_name", true],
sizeDelta: ["_sizeDelta", sortAscending, "_name", true]
}[sortColumn];
},

setDataSource: function(snapshot)
{
this.snapshot = snapshot;
},


setBaseDataSource: function(baseSnapshot)
{
this.baseSnapshot = baseSnapshot;
this.dispose();
this.removeTopLevelNodes();
this.resetSortingCache();
if (this.baseSnapshot === this.snapshot) {
this.dispatchEventToListeners("sorting complete");
return;
}
this._populateChildren();
},

_populateChildren: function()
{
function aggregatesForDiffReceived(aggregatesForDiff)
{
this.snapshot.calculateSnapshotDiff(this.baseSnapshot.uid, aggregatesForDiff, didCalculateSnapshotDiff.bind(this));
function didCalculateSnapshotDiff(diffByClassName)
{
for (var className in diffByClassName) {
var diff = diffByClassName[className];
this.appendTopLevelNode(new WebInspector.HeapSnapshotDiffNode(this, className, diff));
}
this.sortingChanged();
}
}



this.baseSnapshot.aggregatesForDiff(aggregatesForDiffReceived.bind(this));
},

__proto__: WebInspector.HeapSnapshotViewportDataGrid.prototype
}



WebInspector.HeapSnapshotDominatorsDataGrid = function()
{
var columns = [
{id: "object", title: WebInspector.UIString("Object"), disclosure: true, sortable: true},
{id: "shallowSize", title: WebInspector.UIString("Shallow Size"), width: "120px", sortable: true},
{id: "retainedSize", title: WebInspector.UIString("Retained Size"), width: "120px", sort: WebInspector.DataGrid.Order.Descending, sortable: true}
];
WebInspector.HeapSnapshotSortableDataGrid.call(this, columns);
this._objectIdToSelect = null;
}

WebInspector.HeapSnapshotDominatorsDataGrid.prototype = {

defaultPopulateCount: function()
{
return 25;
},

setDataSource: function(snapshot)
{
this.snapshot = snapshot;

var fakeNode = { nodeIndex: this.snapshot.rootNodeIndex };
this.setRootNode(new WebInspector.HeapSnapshotDominatorObjectNode(this, fakeNode));
this.rootNode().sort();

if (this._objectIdToSelect) {
this.highlightObjectByHeapSnapshotId(this._objectIdToSelect);
this._objectIdToSelect = null;
}
},

sortingChanged: function()
{
this.rootNode().sort();
},


highlightObjectByHeapSnapshotId: function(id)
{
if (!this.snapshot) {
this._objectIdToSelect = id;
return;
}

function didGetDominators(dominatorIds)
{
if (!dominatorIds) {
WebInspector.log(WebInspector.UIString("Cannot find corresponding heap snapshot node"));
return;
}
var dominatorNode = this.rootNode();
expandNextDominator.call(this, dominatorIds, dominatorNode);
}

function expandNextDominator(dominatorIds, dominatorNode)
{
if (!dominatorNode) {
console.error("Cannot find dominator node");
return;
}
if (!dominatorIds.length) {
this.highlightNode(dominatorNode);
dominatorNode.element.scrollIntoViewIfNeeded(true);
return;
}
var snapshotObjectId = dominatorIds.pop();
dominatorNode.retrieveChildBySnapshotObjectId(snapshotObjectId, expandNextDominator.bind(this, dominatorIds));
}

this.snapshot.dominatorIdsForNode(parseInt(id, 10), didGetDominators.bind(this));
},

__proto__: WebInspector.HeapSnapshotSortableDataGrid.prototype
}

;



WebInspector.HeapSnapshotGridNode = function(tree, hasChildren)
{
WebInspector.DataGridNode.call(this, null, hasChildren);
this._dataGrid = tree;
this._instanceCount = 0;

this._savedChildren = null;

this._retrievedChildrenRanges = [];
}

WebInspector.HeapSnapshotGridNode.Events = {
PopulateComplete: "PopulateComplete"
}

WebInspector.HeapSnapshotGridNode.prototype = {

createProvider: function()
{
throw new Error("Needs implemented.");
},


_provider: function()
{
if (!this._providerObject)
this._providerObject = this.createProvider();
return this._providerObject;
},

createCell: function(columnIdentifier)
{
var cell = WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);
if (this._searchMatched)
cell.addStyleClass("highlight");
return cell;
},

collapse: function()
{
WebInspector.DataGridNode.prototype.collapse.call(this);
this._dataGrid.updateVisibleNodes();
},

dispose: function()
{
if (this._provider())
this._provider().dispose();
for (var node = this.children[0]; node; node = node.traverseNextNode(true, this, true))
if (node.dispose)
node.dispose();
},

_reachableFromWindow: false,

queryObjectContent: function(callback)
{
},


wasDetached: function()
{
this._dataGrid.nodeWasDetached(this);
},

_toPercentString: function(num)
{
return num.toFixed(0) + "\u2009%"; 
},


childForPosition: function(nodePosition)
{
var indexOfFirsChildInRange = 0;
for (var i = 0; i < this._retrievedChildrenRanges.length; i++) {
var range = this._retrievedChildrenRanges[i];
if (range.from <= nodePosition && nodePosition < range.to) {
var childIndex = indexOfFirsChildInRange + nodePosition - range.from;
return this.children[childIndex];
}
indexOfFirsChildInRange += range.to - range.from + 1;
}
return null;
},

_createValueCell: function(columnIdentifier)
{
var cell = document.createElement("td");
cell.className = columnIdentifier + "-column";
if (this.dataGrid.snapshot.totalSize !== 0) {
var div = document.createElement("div");
var valueSpan = document.createElement("span");
valueSpan.textContent = this.data[columnIdentifier];
div.appendChild(valueSpan);
var percentColumn = columnIdentifier + "-percent";
if (percentColumn in this.data) {
var percentSpan = document.createElement("span");
percentSpan.className = "percent-column";
percentSpan.textContent = this.data[percentColumn];
div.appendChild(percentSpan);
div.addStyleClass("heap-snapshot-multiple-values");
}
cell.appendChild(div);
}
return cell;
},

populate: function(event)
{
if (this._populated)
return;
this._populated = true;

function sorted()
{
this._populateChildren();
}
this._provider().sortAndRewind(this.comparator(), sorted.bind(this));
},

expandWithoutPopulate: function(callback)
{

this._populated = true;
this.expand();
this._provider().sortAndRewind(this.comparator(), callback);
},


_populateChildren: function(fromPosition, toPosition, afterPopulate)
{
fromPosition = fromPosition || 0;
toPosition = toPosition || fromPosition + this._dataGrid.defaultPopulateCount();
var firstNotSerializedPosition = fromPosition;
function serializeNextChunk()
{
if (firstNotSerializedPosition >= toPosition)
return;
var end = Math.min(firstNotSerializedPosition + this._dataGrid.defaultPopulateCount(), toPosition);
this._provider().serializeItemsRange(firstNotSerializedPosition, end, childrenRetrieved.bind(this));
firstNotSerializedPosition = end;
}
function insertRetrievedChild(item, insertionIndex)
{
if (this._savedChildren) {
var hash = this._childHashForEntity(item);
if (hash in this._savedChildren) {
this.insertChild(this._savedChildren[hash], insertionIndex);
return;
}
}
this.insertChild(this._createChildNode(item), insertionIndex);
}
function insertShowMoreButton(from, to, insertionIndex)
{
var button = new WebInspector.ShowMoreDataGridNode(this._populateChildren.bind(this), from, to, this._dataGrid.defaultPopulateCount());
this.insertChild(button, insertionIndex);
}
function childrenRetrieved(items)
{
var itemIndex = 0;
var itemPosition = items.startPosition;
var insertionIndex = 0;

if (!this._retrievedChildrenRanges.length) {
if (items.startPosition > 0) {
this._retrievedChildrenRanges.push({from: 0, to: 0});
insertShowMoreButton.call(this, 0, items.startPosition, insertionIndex++);
}
this._retrievedChildrenRanges.push({from: items.startPosition, to: items.endPosition});
for (var i = 0, l = items.length; i < l; ++i)
insertRetrievedChild.call(this, items[i], insertionIndex++);
if (items.endPosition < items.totalLength)
insertShowMoreButton.call(this, items.endPosition, items.totalLength, insertionIndex++);
} else {
var rangeIndex = 0;
var found = false;
var range;
while (rangeIndex < this._retrievedChildrenRanges.length) {
range = this._retrievedChildrenRanges[rangeIndex];
if (range.to >= itemPosition) {
found = true;
break;
}
insertionIndex += range.to - range.from;

if (range.to < items.totalLength)
insertionIndex += 1;
++rangeIndex;
}

if (!found || items.startPosition < range.from) {

this.children[insertionIndex - 1].setEndPosition(items.startPosition);
insertShowMoreButton.call(this, items.startPosition, found ? range.from : items.totalLength, insertionIndex);
range = {from: items.startPosition, to: items.startPosition};
if (!found)
rangeIndex = this._retrievedChildrenRanges.length;
this._retrievedChildrenRanges.splice(rangeIndex, 0, range);
} else {
insertionIndex += itemPosition - range.from;
}




while (range.to < items.endPosition) {

var skipCount = range.to - itemPosition;
insertionIndex += skipCount;
itemIndex += skipCount;
itemPosition = range.to;


var nextRange = this._retrievedChildrenRanges[rangeIndex + 1];
var newEndOfRange = nextRange ? nextRange.from : items.totalLength;
if (newEndOfRange > items.endPosition)
newEndOfRange = items.endPosition;
while (itemPosition < newEndOfRange) {
insertRetrievedChild.call(this, items[itemIndex++], insertionIndex++);
++itemPosition;
}

if (nextRange && newEndOfRange === nextRange.from) {
range.to = nextRange.to;

this.removeChild(this.children[insertionIndex]);
this._retrievedChildrenRanges.splice(rangeIndex + 1, 1);
} else {
range.to = newEndOfRange;

if (newEndOfRange === items.totalLength)
this.removeChild(this.children[insertionIndex]);
else
this.children[insertionIndex].setStartPosition(items.endPosition);
}
}
}


this._instanceCount += items.length;
if (firstNotSerializedPosition < toPosition) {
serializeNextChunk.call(this);
return;
}

if (afterPopulate)
afterPopulate();
this.dispatchEventToListeners(WebInspector.HeapSnapshotGridNode.Events.PopulateComplete);
}
serializeNextChunk.call(this);
},

_saveChildren: function()
{
this._savedChildren = null;
for (var i = 0, childrenCount = this.children.length; i < childrenCount; ++i) {
var child = this.children[i];
if (!child.expanded)
continue;
if (!this._savedChildren)
this._savedChildren = {};
this._savedChildren[this._childHashForNode(child)] = child;
}
},

sort: function()
{
this._dataGrid.recursiveSortingEnter();
function afterSort()
{
this._saveChildren();
this.removeChildren();
this._retrievedChildrenRanges = [];

function afterPopulate()
{
for (var i = 0, l = this.children.length; i < l; ++i) {
var child = this.children[i];
if (child.expanded)
child.sort();
}
this._dataGrid.recursiveSortingLeave();
}
var instanceCount = this._instanceCount;
this._instanceCount = 0;
this._populateChildren(0, instanceCount, afterPopulate.bind(this));
}

this._provider().sortAndRewind(this.comparator(), afterSort.bind(this));
},

__proto__: WebInspector.DataGridNode.prototype
}



WebInspector.HeapSnapshotGenericObjectNode = function(tree, node)
{
this.snapshotNodeIndex = 0;
WebInspector.HeapSnapshotGridNode.call(this, tree, false);

if (!node)
return;
this._name = node.name;
this._displayName = node.displayName;
this._type = node.type;
this._distance = node.distance;
this._shallowSize = node.selfSize;
this._retainedSize = node.retainedSize;
this.snapshotNodeId = node.id;
this.snapshotNodeIndex = node.nodeIndex;
if (this._type === "string")
this._reachableFromWindow = true;
else if (this._type === "object" && this._name.startsWith("Window")) {
this._name = this.shortenWindowURL(this._name, false);
this._reachableFromWindow = true;
} else if (node.canBeQueried)
this._reachableFromWindow = true;
if (node.detachedDOMTreeNode)
this.detachedDOMTreeNode = true;
};

WebInspector.HeapSnapshotGenericObjectNode.prototype = {
createCell: function(columnIdentifier)
{
var cell = columnIdentifier !== "object" ? this._createValueCell(columnIdentifier) : this._createObjectCell();
if (this._searchMatched)
cell.addStyleClass("highlight");
return cell;
},

_createObjectCell: function()
{
var cell = document.createElement("td");
cell.className = "object-column";
var div = document.createElement("div");
div.className = "source-code event-properties";
div.style.overflow = "visible";

var data = this.data["object"];
if (this._prefixObjectCell)
this._prefixObjectCell(div, data);

var valueSpan = document.createElement("span");
valueSpan.className = "value console-formatted-" + data.valueStyle;
valueSpan.textContent = data.value;
div.appendChild(valueSpan);

if (this.data.displayName) {
var nameSpan = document.createElement("span");
nameSpan.className = "name console-formatted-name";
nameSpan.textContent = " " + this.data.displayName;
div.appendChild(nameSpan);
}

var idSpan = document.createElement("span");
idSpan.className = "console-formatted-id";
idSpan.textContent = " @" + data["nodeId"];
div.appendChild(idSpan);

if (this._postfixObjectCell)
this._postfixObjectCell(div, data);

cell.appendChild(div);
cell.addStyleClass("disclosure");
if (this.depth)
cell.style.setProperty("padding-left", (this.depth * this.dataGrid.indentWidth) + "px");
cell.heapSnapshotNode = this;
return cell;
},

get data()
{
var data = this._emptyData();

var value = this._name;
var valueStyle = "object";
switch (this._type) {
case "string":
value = "\"" + value + "\"";
valueStyle = "string";
break;
case "regexp":
value = "/" + value + "/";
valueStyle = "string";
break;
case "closure":
value = "function" + (value ? " " : "") + value + "()";
valueStyle = "function";
break;
case "number":
valueStyle = "number";
break;
case "hidden":
valueStyle = "null";
break;
case "array":
if (!value)
value = "[]";
else
value += "[]";
break;
};
if (this._reachableFromWindow)
valueStyle += " highlight";
if (value === "Object")
value = "";
if (this.detachedDOMTreeNode)
valueStyle += " detached-dom-tree-node";
data["object"] = { valueStyle: valueStyle, value: value, nodeId: this.snapshotNodeId };

data["displayName"] = this._displayName;
data["distance"] =  this._distance;
data["shallowSize"] = Number.withThousandsSeparator(this._shallowSize);
data["retainedSize"] = Number.withThousandsSeparator(this._retainedSize);
data["shallowSize-percent"] = this._toPercentString(this._shallowSizePercent);
data["retainedSize-percent"] = this._toPercentString(this._retainedSizePercent);

return this._enhanceData ? this._enhanceData(data) : data;
},

queryObjectContent: function(callback, objectGroupName)
{
if (this._type === "string")
callback(WebInspector.RemoteObject.fromPrimitiveValue(this._name));
else {
function formatResult(error, object)
{
if (!error && object.type)
callback(WebInspector.RemoteObject.fromPayload(object), !!error);
else
callback(WebInspector.RemoteObject.fromPrimitiveValue(WebInspector.UIString("Not available")));
}
HeapProfilerAgent.getObjectByHeapObjectId(String(this.snapshotNodeId), objectGroupName, formatResult);
}
},

get _retainedSizePercent()
{
return this._retainedSize / this.dataGrid.snapshot.totalSize * 100.0;
},

get _shallowSizePercent()
{
return this._shallowSize / this.dataGrid.snapshot.totalSize * 100.0;
},

updateHasChildren: function()
{
function isEmptyCallback(isEmpty)
{
this.hasChildren = !isEmpty;
}
this._provider().isEmpty(isEmptyCallback.bind(this));
},

shortenWindowURL: function(fullName, hasObjectId)
{
var startPos = fullName.indexOf("/");
var endPos = hasObjectId ? fullName.indexOf("@") : fullName.length;
if (startPos !== -1 && endPos !== -1) {
var fullURL = fullName.substring(startPos + 1, endPos).trimLeft();
var url = fullURL.trimURL();
if (url.length > 40)
url = url.trimMiddle(40);
return fullName.substr(0, startPos + 2) + url + fullName.substr(endPos);
} else
return fullName;
},

__proto__: WebInspector.HeapSnapshotGridNode.prototype
}


WebInspector.HeapSnapshotObjectNode = function(tree, isFromBaseSnapshot, edge, parentGridNode)
{
WebInspector.HeapSnapshotGenericObjectNode.call(this, tree, edge.node);
this._referenceName = edge.name;
this._referenceType = edge.type;
this._distance = edge.distance;
this.showRetainingEdges = tree.showRetainingEdges;
this._isFromBaseSnapshot = isFromBaseSnapshot;

this._parentGridNode = parentGridNode;
this._cycledWithAncestorGridNode = this._findAncestorWithSameSnapshotNodeId();
if (!this._cycledWithAncestorGridNode)
this.updateHasChildren();
}

WebInspector.HeapSnapshotObjectNode.prototype = {

createProvider: function()
{
var tree = this._dataGrid;
var showHiddenData = WebInspector.settings.showHeapSnapshotObjectsHiddenProperties.get();
var snapshot = this._isFromBaseSnapshot ? tree.baseSnapshot : tree.snapshot;
if (this.showRetainingEdges)
return snapshot.createRetainingEdgesProvider(this.snapshotNodeIndex, showHiddenData);
else
return snapshot.createEdgesProvider(this.snapshotNodeIndex, showHiddenData);
},

_findAncestorWithSameSnapshotNodeId: function()
{
var ancestor = this._parentGridNode;
while (ancestor) {
if (ancestor.snapshotNodeId === this.snapshotNodeId)
return ancestor;
ancestor = ancestor._parentGridNode;
}
return null;
},

_createChildNode: function(item)
{
return new WebInspector.HeapSnapshotObjectNode(this._dataGrid, this._isFromBaseSnapshot, item, this);
},

_childHashForEntity: function(edge)
{
var prefix = this.showRetainingEdges ? edge.node.id + "#" : "";
return prefix + edge.type + "#" + edge.name;
},

_childHashForNode: function(childNode)
{
var prefix = this.showRetainingEdges ? childNode.snapshotNodeId + "#" : "";
return prefix + childNode._referenceType + "#" + childNode._referenceName;
},

comparator: function()
{
var sortAscending = this._dataGrid.isSortOrderAscending();
var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
var sortFields = {
object: ["!edgeName", sortAscending, "retainedSize", false],
count: ["!edgeName", true, "retainedSize", false],
shallowSize: ["selfSize", sortAscending, "!edgeName", true],
retainedSize: ["retainedSize", sortAscending, "!edgeName", true],
distance: ["distance", sortAscending, "_name", true]
}[sortColumnIdentifier] || ["!edgeName", true, "retainedSize", false];
return WebInspector.HeapSnapshotFilteredOrderedIterator.prototype.createComparator(sortFields);
},

_emptyData: function()
{
return { count: "", addedCount: "", removedCount: "", countDelta: "", addedSize: "", removedSize: "", sizeDelta: "" };
},

_enhanceData: function(data)
{
var name = this._referenceName;
if (name === "") name = "(empty)";
var nameClass = "name";
switch (this._referenceType) {
case "context":
nameClass = "console-formatted-number";
break;
case "internal":
case "hidden":
nameClass = "console-formatted-null";
break;
case "element":
name = "[" + name + "]";
break;
}
data["object"].nameClass = nameClass;
data["object"].name = name;
data["distance"] = this._distance;
return data;
},

_prefixObjectCell: function(div, data)
{
if (this._cycledWithAncestorGridNode)
div.className += " cycled-ancessor-node";

var nameSpan = document.createElement("span");
nameSpan.className = data.nameClass;
nameSpan.textContent = data.name;
div.appendChild(nameSpan);

var separatorSpan = document.createElement("span");
separatorSpan.className = "grayed";
separatorSpan.textContent = this.showRetainingEdges ? " in " : " :: ";
div.appendChild(separatorSpan);
},

__proto__: WebInspector.HeapSnapshotGenericObjectNode.prototype
}


WebInspector.HeapSnapshotInstanceNode = function(tree, baseSnapshot, snapshot, node)
{
WebInspector.HeapSnapshotGenericObjectNode.call(this, tree, node);
this._baseSnapshotOrSnapshot = baseSnapshot || snapshot;
this._isDeletedNode = !!baseSnapshot;
this.updateHasChildren();
};

WebInspector.HeapSnapshotInstanceNode.prototype = {
createProvider: function()
{
var showHiddenData = WebInspector.settings.showHeapSnapshotObjectsHiddenProperties.get();
return this._baseSnapshotOrSnapshot.createEdgesProvider(
this.snapshotNodeIndex,
showHiddenData);
},

_createChildNode: function(item)
{
return new WebInspector.HeapSnapshotObjectNode(this._dataGrid, this._isDeletedNode, item, null);
},

_childHashForEntity: function(edge)
{
return edge.type + "#" + edge.name;
},

_childHashForNode: function(childNode)
{
return childNode._referenceType + "#" + childNode._referenceName;
},

comparator: function()
{
var sortAscending = this._dataGrid.isSortOrderAscending();
var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
var sortFields = {
object: ["!edgeName", sortAscending, "retainedSize", false],
distance: ["distance", sortAscending, "retainedSize", false],
count: ["!edgeName", true, "retainedSize", false],
addedSize: ["selfSize", sortAscending, "!edgeName", true],
removedSize: ["selfSize", sortAscending, "!edgeName", true],
shallowSize: ["selfSize", sortAscending, "!edgeName", true],
retainedSize: ["retainedSize", sortAscending, "!edgeName", true]
}[sortColumnIdentifier] || ["!edgeName", true, "retainedSize", false];
return WebInspector.HeapSnapshotFilteredOrderedIterator.prototype.createComparator(sortFields);
},

_emptyData: function()
{
return {count: "", countDelta: "", sizeDelta: ""};
},

_enhanceData: function(data)
{
if (this._isDeletedNode) {
data["addedCount"] = "";
data["addedSize"] = "";
data["removedCount"] = "\u2022";
data["removedSize"] = Number.withThousandsSeparator(this._shallowSize);
} else {
data["addedCount"] = "\u2022";
data["addedSize"] = Number.withThousandsSeparator(this._shallowSize);
data["removedCount"] = "";
data["removedSize"] = "";
}
return data;
},

get isDeletedNode()
{
return this._isDeletedNode;
},

__proto__: WebInspector.HeapSnapshotGenericObjectNode.prototype
}


WebInspector.HeapSnapshotConstructorNode = function(tree, className, aggregate, aggregatesKey)
{
WebInspector.HeapSnapshotGridNode.call(this, tree, aggregate.count > 0);
this._name = className;
this._aggregatesKey = aggregatesKey;
this._distance = aggregate.distance;
this._count = aggregate.count;
this._shallowSize = aggregate.self;
this._retainedSize = aggregate.maxRet;
}

WebInspector.HeapSnapshotConstructorNode.prototype = {

createProvider: function()
{
return this._dataGrid.snapshot.createNodesProviderForClass(this._name, this._aggregatesKey)
},


revealNodeBySnapshotObjectId: function(snapshotObjectId)
{
function didExpand()
{
this._provider().nodePosition(snapshotObjectId, didGetNodePosition.bind(this));
}

function didGetNodePosition(nodePosition)
{
if (nodePosition === -1)
this.collapse();
else
this._populateChildren(nodePosition, null, didPopulateChildren.bind(this, nodePosition));
}

function didPopulateChildren(nodePosition)
{
var indexOfFirsChildInRange = 0;
for (var i = 0; i < this._retrievedChildrenRanges.length; i++) {
var range = this._retrievedChildrenRanges[i];
if (range.from <= nodePosition && nodePosition < range.to) {
var childIndex = indexOfFirsChildInRange + nodePosition - range.from;
var instanceNode = this.children[childIndex];
this._dataGrid.highlightNode(instanceNode);
return;
}
indexOfFirsChildInRange += range.to - range.from + 1;
}
}

this.expandWithoutPopulate(didExpand.bind(this));
},

createCell: function(columnIdentifier)
{
var cell = columnIdentifier !== "object" ? this._createValueCell(columnIdentifier) : WebInspector.HeapSnapshotGridNode.prototype.createCell.call(this, columnIdentifier);
if (this._searchMatched)
cell.addStyleClass("highlight");
return cell;
},

_createChildNode: function(item)
{
return new WebInspector.HeapSnapshotInstanceNode(this._dataGrid, null, this._dataGrid.snapshot, item);
},

comparator: function()
{
var sortAscending = this._dataGrid.isSortOrderAscending();
var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
var sortFields = {
object: ["id", sortAscending, "retainedSize", false],
distance: ["distance", true, "retainedSize", false],
count: ["id", true, "retainedSize", false],
shallowSize: ["selfSize", sortAscending, "id", true],
retainedSize: ["retainedSize", sortAscending, "id", true]
}[sortColumnIdentifier];
return WebInspector.HeapSnapshotFilteredOrderedIterator.prototype.createComparator(sortFields);
},

_childHashForEntity: function(node)
{
return node.id;
},

_childHashForNode: function(childNode)
{
return childNode.snapshotNodeId;
},

get data()
{
var data = { object: this._name };
data["count"] =  Number.withThousandsSeparator(this._count);
data["distance"] =  this._distance;
data["shallowSize"] = Number.withThousandsSeparator(this._shallowSize);
data["retainedSize"] = Number.withThousandsSeparator(this._retainedSize);
data["count-percent"] =  this._toPercentString(this._countPercent);
data["shallowSize-percent"] = this._toPercentString(this._shallowSizePercent);
data["retainedSize-percent"] = this._toPercentString(this._retainedSizePercent);
return data;
},

get _countPercent()
{
return this._count / this.dataGrid.snapshot.nodeCount * 100.0;
},

get _retainedSizePercent()
{
return this._retainedSize / this.dataGrid.snapshot.totalSize * 100.0;
},

get _shallowSizePercent()
{
return this._shallowSize / this.dataGrid.snapshot.totalSize * 100.0;
},

__proto__: WebInspector.HeapSnapshotGridNode.prototype
}



WebInspector.HeapSnapshotDiffNodesProvider = function(addedNodesProvider, deletedNodesProvider, addedCount, removedCount)
{
this._addedNodesProvider = addedNodesProvider;
this._deletedNodesProvider = deletedNodesProvider;
this._addedCount = addedCount;
this._removedCount = removedCount;
}

WebInspector.HeapSnapshotDiffNodesProvider.prototype = {
dispose: function()
{
this._addedNodesProvider.dispose();
this._deletedNodesProvider.dispose();
},

isEmpty: function(callback)
{
callback(false);
},

serializeItemsRange: function(beginPosition, endPosition, callback)
{
function didReceiveAllItems(items)
{
items.totalLength = this._addedCount + this._removedCount;
callback(items);
}

function didReceiveDeletedItems(addedItems, items)
{
if (!addedItems.length)
addedItems.startPosition = this._addedCount + items.startPosition;
for (var i = 0; i < items.length; i++) {
items[i].isAddedNotRemoved = false;
addedItems.push(items[i]);
}
addedItems.endPosition = this._addedCount + items.endPosition;
didReceiveAllItems.call(this, addedItems);
}

function didReceiveAddedItems(items)
{
for (var i = 0; i < items.length; i++)
items[i].isAddedNotRemoved = true;
if (items.endPosition < endPosition)
return this._deletedNodesProvider.serializeItemsRange(0, endPosition - items.endPosition, didReceiveDeletedItems.bind(this, items));

items.totalLength = this._addedCount + this._removedCount;
didReceiveAllItems.call(this, items);
}

if (beginPosition < this._addedCount)
this._addedNodesProvider.serializeItemsRange(beginPosition, endPosition, didReceiveAddedItems.bind(this));
else
this._deletedNodesProvider.serializeItemsRange(beginPosition - this._addedCount, endPosition - this._addedCount, didReceiveDeletedItems.bind(this, []));
},

sortAndRewind: function(comparator, callback)
{
function afterSort()
{
this._deletedNodesProvider.sortAndRewind(comparator, callback);
}
this._addedNodesProvider.sortAndRewind(comparator, afterSort.bind(this));
}
};


WebInspector.HeapSnapshotDiffNode = function(tree, className, diffForClass)
{
WebInspector.HeapSnapshotGridNode.call(this, tree, true);
this._name = className;

this._addedCount = diffForClass.addedCount;
this._removedCount = diffForClass.removedCount;
this._countDelta = diffForClass.countDelta;
this._addedSize = diffForClass.addedSize;
this._removedSize = diffForClass.removedSize;
this._sizeDelta = diffForClass.sizeDelta;
this._deletedIndexes = diffForClass.deletedIndexes;
}

WebInspector.HeapSnapshotDiffNode.prototype = {

createProvider: function()
{
var tree = this._dataGrid;
return  new WebInspector.HeapSnapshotDiffNodesProvider(
tree.snapshot.createAddedNodesProvider(tree.baseSnapshot.uid, this._name),
tree.baseSnapshot.createDeletedNodesProvider(this._deletedIndexes),
this._addedCount,
this._removedCount);
},

_createChildNode: function(item)
{
if (item.isAddedNotRemoved)
return new WebInspector.HeapSnapshotInstanceNode(this._dataGrid, null, this._dataGrid.snapshot, item);
else
return new WebInspector.HeapSnapshotInstanceNode(this._dataGrid, this._dataGrid.baseSnapshot, null, item);
},

_childHashForEntity: function(node)
{
return node.id;
},

_childHashForNode: function(childNode)
{
return childNode.snapshotNodeId;
},

comparator: function()
{
var sortAscending = this._dataGrid.isSortOrderAscending();
var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
var sortFields = {
object: ["id", sortAscending, "selfSize", false],
addedCount: ["selfSize", sortAscending, "id", true],
removedCount: ["selfSize", sortAscending, "id", true],
countDelta: ["selfSize", sortAscending, "id", true],
addedSize: ["selfSize", sortAscending, "id", true],
removedSize: ["selfSize", sortAscending, "id", true],
sizeDelta: ["selfSize", sortAscending, "id", true]
}[sortColumnIdentifier];
return WebInspector.HeapSnapshotFilteredOrderedIterator.prototype.createComparator(sortFields);
},

_signForDelta: function(delta)
{
if (delta === 0)
return "";
if (delta > 0)
return "+";
else
return "\u2212";  
},

get data()
{
var data = {object: this._name};

data["addedCount"] = Number.withThousandsSeparator(this._addedCount);
data["removedCount"] = Number.withThousandsSeparator(this._removedCount);
data["countDelta"] = this._signForDelta(this._countDelta) + Number.withThousandsSeparator(Math.abs(this._countDelta));
data["addedSize"] = Number.withThousandsSeparator(this._addedSize);
data["removedSize"] = Number.withThousandsSeparator(this._removedSize);
data["sizeDelta"] = this._signForDelta(this._sizeDelta) + Number.withThousandsSeparator(Math.abs(this._sizeDelta));

return data;
},

__proto__: WebInspector.HeapSnapshotGridNode.prototype
}



WebInspector.HeapSnapshotDominatorObjectNode = function(tree, node)
{
WebInspector.HeapSnapshotGenericObjectNode.call(this, tree, node);
this.updateHasChildren();
};

WebInspector.HeapSnapshotDominatorObjectNode.prototype = {

createProvider: function()
{
return this._dataGrid.snapshot.createNodesProviderForDominator(this.snapshotNodeIndex);
},


retrieveChildBySnapshotObjectId: function(snapshotObjectId, callback)
{
function didExpand()
{
this._provider().nodePosition(snapshotObjectId, didGetNodePosition.bind(this));
}

function didGetNodePosition(nodePosition)
{
if (nodePosition === -1) {
this.collapse();
callback(null);
} else
this._populateChildren(nodePosition, null, didPopulateChildren.bind(this, nodePosition));
}

function didPopulateChildren(nodePosition)
{
var child = this.childForPosition(nodePosition);
callback(child);
}



this.hasChildren = true;
this.expandWithoutPopulate(didExpand.bind(this));
},

_createChildNode: function(item)
{
return new WebInspector.HeapSnapshotDominatorObjectNode(this._dataGrid, item);
},

_childHashForEntity: function(node)
{
return node.id;
},

_childHashForNode: function(childNode)
{
return childNode.snapshotNodeId;
},

comparator: function()
{
var sortAscending = this._dataGrid.isSortOrderAscending();
var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
var sortFields = {
object: ["id", sortAscending, "retainedSize", false],
shallowSize: ["selfSize", sortAscending, "id", true],
retainedSize: ["retainedSize", sortAscending, "id", true]
}[sortColumnIdentifier];
return WebInspector.HeapSnapshotFilteredOrderedIterator.prototype.createComparator(sortFields);
},

_emptyData: function()
{
return {};
},

__proto__: WebInspector.HeapSnapshotGenericObjectNode.prototype
}

;



WebInspector.HeapSnapshotLoader = function()
{
this._reset();
}

WebInspector.HeapSnapshotLoader.prototype = {
dispose: function()
{
this._reset();
},

_reset: function()
{
this._json = "";
this._state = "find-snapshot-info";
this._snapshot = {};
},

close: function()
{
if (this._json)
this._parseStringsArray();
},

buildSnapshot: function(constructorName)
{
var constructor = WebInspector[constructorName];
var result = new constructor(this._snapshot);
this._reset();
return result;
},

_parseUintArray: function()
{
var index = 0;
var char0 = "0".charCodeAt(0), char9 = "9".charCodeAt(0), closingBracket = "]".charCodeAt(0);
var length = this._json.length;
while (true) {
while (index < length) {
var code = this._json.charCodeAt(index);
if (char0 <= code && code <= char9)
break;
else if (code === closingBracket) {
this._json = this._json.slice(index + 1);
return false;
}
++index;
}
if (index === length) {
this._json = "";
return true;
}
var nextNumber = 0;
var startIndex = index;
while (index < length) {
var code = this._json.charCodeAt(index);
if (char0 > code || code > char9)
break;
nextNumber *= 10;
nextNumber += (code - char0);
++index;
}
if (index === length) {
this._json = this._json.slice(startIndex);
return true;
}
this._array[this._arrayIndex++] = nextNumber;
}
},

_parseStringsArray: function()
{
var closingBracketIndex = this._json.lastIndexOf("]");
if (closingBracketIndex === -1)
throw new Error("Incomplete JSON");
this._json = this._json.slice(0, closingBracketIndex + 1);
this._snapshot.strings = JSON.parse(this._json);
},


write: function(chunk)
{
this._json += chunk;
switch (this._state) {
case "find-snapshot-info": {
var snapshotToken = "\"snapshot\"";
var snapshotTokenIndex = this._json.indexOf(snapshotToken);
if (snapshotTokenIndex === -1)
throw new Error("Snapshot token not found");
this._json = this._json.slice(snapshotTokenIndex + snapshotToken.length + 1);
this._state = "parse-snapshot-info";
}
case "parse-snapshot-info": {
var closingBracketIndex = WebInspector.findBalancedCurlyBrackets(this._json);
if (closingBracketIndex === -1)
return;
this._snapshot.snapshot =   (JSON.parse(this._json.slice(0, closingBracketIndex)));
this._json = this._json.slice(closingBracketIndex);
this._state = "find-nodes";
}
case "find-nodes": {
var nodesToken = "\"nodes\"";
var nodesTokenIndex = this._json.indexOf(nodesToken);
if (nodesTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", nodesTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex + 1);
var node_fields_count = this._snapshot.snapshot.meta.node_fields.length;
var nodes_length = this._snapshot.snapshot.node_count * node_fields_count;
this._array = new Uint32Array(nodes_length);
this._arrayIndex = 0;
this._state = "parse-nodes";
}
case "parse-nodes": {
if (this._parseUintArray())
return;
this._snapshot.nodes = this._array;
this._state = "find-edges";
this._array = null;
}
case "find-edges": {
var edgesToken = "\"edges\"";
var edgesTokenIndex = this._json.indexOf(edgesToken);
if (edgesTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", edgesTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex + 1);
var edge_fields_count = this._snapshot.snapshot.meta.edge_fields.length;
var edges_length = this._snapshot.snapshot.edge_count * edge_fields_count;
this._array = new Uint32Array(edges_length);
this._arrayIndex = 0;
this._state = "parse-edges";
}
case "parse-edges": {
if (this._parseUintArray())
return;
this._snapshot.edges = this._array;
this._array = null;
this._state = "find-strings";
}
case "find-strings": {
var stringsToken = "\"strings\"";
var stringsTokenIndex = this._json.indexOf(stringsToken);
if (stringsTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", stringsTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex);
this._state = "accumulate-strings";
break;
}
case "accumulate-strings":
break;
}
}
};
;



WebInspector.HeapSnapshotWorkerWrapper = function()
{
}

WebInspector.HeapSnapshotWorkerWrapper.prototype =  {
postMessage: function(message)
{
},
terminate: function()
{
},

__proto__: WebInspector.Object.prototype
}


WebInspector.HeapSnapshotRealWorker = function()
{
this._worker = new Worker("HeapSnapshotWorker.js");
this._worker.addEventListener("message", this._messageReceived.bind(this), false);
}

WebInspector.HeapSnapshotRealWorker.prototype = {
_messageReceived: function(event)
{
var message = event.data;
if ("callId" in message)
this.dispatchEventToListeners("message", message);
else {
if (message.object !== "console") {
console.log(WebInspector.UIString("Worker asks to call a method '%s' on an unsupported object '%s'.", message.method, message.object));
return;
}
if (message.method !== "log" && message.method !== "info" && message.method !== "error") {
console.log(WebInspector.UIString("Worker asks to call an unsupported method '%s' on the console object.", message.method));
return;
}
console[message.method].apply(window[message.object], message.arguments);
}
},

postMessage: function(message)
{
this._worker.postMessage(message);
},

terminate: function()
{
this._worker.terminate();
},

__proto__: WebInspector.HeapSnapshotWorkerWrapper.prototype
}



WebInspector.AsyncTaskQueue = function()
{
this._queue = [];
this._isTimerSheduled = false;
}

WebInspector.AsyncTaskQueue.prototype = {

addTask: function(task)
{
this._queue.push(task);
this._scheduleTimer();
},

_onTimeout: function()
{
this._isTimerSheduled = false;
var queue = this._queue;
this._queue = [];
for (var i = 0; i < queue.length; i++) {
try {
queue[i]();
} catch (e) {
console.error("Exception while running task: " + e.stack);
}
}
this._scheduleTimer();
},

_scheduleTimer: function()
{
if (this._queue.length && !this._isTimerSheduled) {
setTimeout(this._onTimeout.bind(this), 0);
this._isTimerSheduled = true;
}
}
}


WebInspector.HeapSnapshotFakeWorker = function()
{
this._dispatcher = new WebInspector.HeapSnapshotWorkerDispatcher(window, this._postMessageFromWorker.bind(this));
this._asyncTaskQueue = new WebInspector.AsyncTaskQueue();
}

WebInspector.HeapSnapshotFakeWorker.prototype = {
postMessage: function(message)
{
function dispatch()
{
if (this._dispatcher)
this._dispatcher.dispatchMessage({data: message});
}
this._asyncTaskQueue.addTask(dispatch.bind(this));
},

terminate: function()
{
this._dispatcher = null;
},

_postMessageFromWorker: function(message)
{
function send()
{
this.dispatchEventToListeners("message", message);
}
this._asyncTaskQueue.addTask(send.bind(this));
},

__proto__: WebInspector.HeapSnapshotWorkerWrapper.prototype
}



WebInspector.HeapSnapshotWorker = function()
{
this._nextObjectId = 1;
this._nextCallId = 1;
this._callbacks = [];
this._previousCallbacks = [];

this._worker = typeof InspectorTest === "undefined" ? new WebInspector.HeapSnapshotRealWorker() : new WebInspector.HeapSnapshotFakeWorker();
this._worker.addEventListener("message", this._messageReceived, this);
}

WebInspector.HeapSnapshotWorker.prototype = {
createLoader: function(snapshotConstructorName, proxyConstructor)
{
var objectId = this._nextObjectId++;
var proxy = new WebInspector.HeapSnapshotLoaderProxy(this, objectId, snapshotConstructorName, proxyConstructor);
this._postMessage({callId: this._nextCallId++, disposition: "create", objectId: objectId, methodName: "WebInspector.HeapSnapshotLoader"});
return proxy;
},

dispose: function()
{
this._worker.terminate();
if (this._interval)
clearInterval(this._interval);
},

disposeObject: function(objectId)
{
this._postMessage({callId: this._nextCallId++, disposition: "dispose", objectId: objectId});
},

callGetter: function(callback, objectId, getterName)
{
var callId = this._nextCallId++;
this._callbacks[callId] = callback;
this._postMessage({callId: callId, disposition: "getter", objectId: objectId, methodName: getterName});
},

callFactoryMethod: function(callback, objectId, methodName, proxyConstructor)
{
var callId = this._nextCallId++;
var methodArguments = Array.prototype.slice.call(arguments, 4);
var newObjectId = this._nextObjectId++;
if (callback) {
function wrapCallback(remoteResult)
{
callback(remoteResult ? new proxyConstructor(this, newObjectId) : null);
}
this._callbacks[callId] = wrapCallback.bind(this);
this._postMessage({callId: callId, disposition: "factory", objectId: objectId, methodName: methodName, methodArguments: methodArguments, newObjectId: newObjectId});
return null;
} else {
this._postMessage({callId: callId, disposition: "factory", objectId: objectId, methodName: methodName, methodArguments: methodArguments, newObjectId: newObjectId});
return new proxyConstructor(this, newObjectId);
}
},

callMethod: function(callback, objectId, methodName)
{
var callId = this._nextCallId++;
var methodArguments = Array.prototype.slice.call(arguments, 3);
if (callback)
this._callbacks[callId] = callback;
this._postMessage({callId: callId, disposition: "method", objectId: objectId, methodName: methodName, methodArguments: methodArguments});
},

startCheckingForLongRunningCalls: function()
{
if (this._interval)
return;
this._checkLongRunningCalls();
this._interval = setInterval(this._checkLongRunningCalls.bind(this), 300);
},

_checkLongRunningCalls: function()
{
for (var callId in this._previousCallbacks)
if (!(callId in this._callbacks))
delete this._previousCallbacks[callId];
var hasLongRunningCalls = false;
for (callId in this._previousCallbacks) {
hasLongRunningCalls = true;
break;
}
this.dispatchEventToListeners("wait", hasLongRunningCalls);
for (callId in this._callbacks)
this._previousCallbacks[callId] = true;
},

_findFunction: function(name)
{
var path = name.split(".");
var result = window;
for (var i = 0; i < path.length; ++i)
result = result[path[i]];
return result;
},

_messageReceived: function(event)
{
var data = event.data;
if (event.data.error) {
if (event.data.errorMethodName)
WebInspector.log(WebInspector.UIString("An error happened when a call for method '%s' was requested", event.data.errorMethodName));
WebInspector.log(event.data.errorCallStack);
delete this._callbacks[data.callId];
return;
}
if (!this._callbacks[data.callId])
return;
var callback = this._callbacks[data.callId];
delete this._callbacks[data.callId];
callback(data.result);
},

_postMessage: function(message)
{
this._worker.postMessage(message);
},

__proto__: WebInspector.Object.prototype
}



WebInspector.HeapSnapshotProxyObject = function(worker, objectId)
{
this._worker = worker;
this._objectId = objectId;
}

WebInspector.HeapSnapshotProxyObject.prototype = {
_callWorker: function(workerMethodName, args)
{
args.splice(1, 0, this._objectId);
return this._worker[workerMethodName].apply(this._worker, args);
},

dispose: function()
{
this._worker.disposeObject(this._objectId);
},

disposeWorker: function()
{
this._worker.dispose();
},


callFactoryMethod: function(callback, methodName, proxyConstructor, var_args)
{
return this._callWorker("callFactoryMethod", Array.prototype.slice.call(arguments, 0));
},

callGetter: function(callback, getterName)
{
return this._callWorker("callGetter", Array.prototype.slice.call(arguments, 0));
},


callMethod: function(callback, methodName, var_args)
{
return this._callWorker("callMethod", Array.prototype.slice.call(arguments, 0));
},

get worker() {
return this._worker;
}
};


WebInspector.HeapSnapshotLoaderProxy = function(worker, objectId, snapshotConstructorName, proxyConstructor)
{
WebInspector.HeapSnapshotProxyObject.call(this, worker, objectId);
this._snapshotConstructorName = snapshotConstructorName;
this._proxyConstructor = proxyConstructor;
this._pendingSnapshotConsumers = [];
}

WebInspector.HeapSnapshotLoaderProxy.prototype = {

addConsumer: function(callback)
{
this._pendingSnapshotConsumers.push(callback);
},


write: function(chunk, callback)
{
this.callMethod(callback, "write", chunk);
},

close: function()
{
function buildSnapshot()
{
this.callFactoryMethod(updateStaticData.bind(this), "buildSnapshot", this._proxyConstructor, this._snapshotConstructorName);
}
function updateStaticData(snapshotProxy)
{
this.dispose();
snapshotProxy.updateStaticData(notifyPendingConsumers.bind(this));
}
function notifyPendingConsumers(snapshotProxy)
{
for (var i = 0; i < this._pendingSnapshotConsumers.length; ++i)
this._pendingSnapshotConsumers[i](snapshotProxy);
this._pendingSnapshotConsumers = [];
}
this.callMethod(buildSnapshot.bind(this), "close");
},

__proto__: WebInspector.HeapSnapshotProxyObject.prototype
}



WebInspector.HeapSnapshotProxy = function(worker, objectId)
{
WebInspector.HeapSnapshotProxyObject.call(this, worker, objectId);
}

WebInspector.HeapSnapshotProxy.prototype = {
aggregates: function(sortedIndexes, key, filter, callback)
{
this.callMethod(callback, "aggregates", sortedIndexes, key, filter);
},

aggregatesForDiff: function(callback)
{
this.callMethod(callback, "aggregatesForDiff");
},

calculateSnapshotDiff: function(baseSnapshotId, baseSnapshotAggregates, callback)
{
this.callMethod(callback, "calculateSnapshotDiff", baseSnapshotId, baseSnapshotAggregates);
},

nodeClassName: function(snapshotObjectId, callback)
{
this.callMethod(callback, "nodeClassName", snapshotObjectId);
},

dominatorIdsForNode: function(nodeIndex, callback)
{
this.callMethod(callback, "dominatorIdsForNode", nodeIndex);
},

createEdgesProvider: function(nodeIndex, showHiddenData)
{
return this.callFactoryMethod(null, "createEdgesProvider", WebInspector.HeapSnapshotProviderProxy, nodeIndex, showHiddenData);
},

createRetainingEdgesProvider: function(nodeIndex, showHiddenData)
{
return this.callFactoryMethod(null, "createRetainingEdgesProvider", WebInspector.HeapSnapshotProviderProxy, nodeIndex, showHiddenData);
},

createAddedNodesProvider: function(baseSnapshotId, className)
{
return this.callFactoryMethod(null, "createAddedNodesProvider", WebInspector.HeapSnapshotProviderProxy, baseSnapshotId, className);
},

createDeletedNodesProvider: function(nodeIndexes)
{
return this.callFactoryMethod(null, "createDeletedNodesProvider", WebInspector.HeapSnapshotProviderProxy, nodeIndexes);
},

createNodesProvider: function(filter)
{
return this.callFactoryMethod(null, "createNodesProvider", WebInspector.HeapSnapshotProviderProxy, filter);
},

createNodesProviderForClass: function(className, aggregatesKey)
{
return this.callFactoryMethod(null, "createNodesProviderForClass", WebInspector.HeapSnapshotProviderProxy, className, aggregatesKey);
},

createNodesProviderForDominator: function(nodeIndex)
{
return this.callFactoryMethod(null, "createNodesProviderForDominator", WebInspector.HeapSnapshotProviderProxy, nodeIndex);
},

dispose: function()
{
this.disposeWorker();
},

get nodeCount()
{
return this._staticData.nodeCount;
},

get rootNodeIndex()
{
return this._staticData.rootNodeIndex;
},

updateStaticData: function(callback)
{
function dataReceived(staticData)
{
this._staticData = staticData;
callback(this);
}
this.callMethod(dataReceived.bind(this), "updateStaticData");
},

get totalSize()
{
return this._staticData.totalSize;
},

get uid()
{
return this._staticData.uid;
},

__proto__: WebInspector.HeapSnapshotProxyObject.prototype
}



WebInspector.NativeHeapSnapshotProxy = function(worker, objectId)
{
WebInspector.HeapSnapshotProxy.call(this, worker, objectId);
}

WebInspector.NativeHeapSnapshotProxy.prototype = {
images: function(callback)
{
this.callMethod(callback, "images");
},

__proto__: WebInspector.HeapSnapshotProxy.prototype
}


WebInspector.HeapSnapshotProviderProxy = function(worker, objectId)
{
WebInspector.HeapSnapshotProxyObject.call(this, worker, objectId);
}

WebInspector.HeapSnapshotProviderProxy.prototype = {
nodePosition: function(snapshotObjectId, callback)
{
this.callMethod(callback, "nodePosition", snapshotObjectId);
},

isEmpty: function(callback)
{
this.callMethod(callback, "isEmpty");
},

serializeItemsRange: function(startPosition, endPosition, callback)
{
this.callMethod(callback, "serializeItemsRange", startPosition, endPosition);
},

sortAndRewind: function(comparator, callback)
{
this.callMethod(callback, "sortAndRewind", comparator);
},

__proto__: WebInspector.HeapSnapshotProxyObject.prototype
}

;



WebInspector.HeapSnapshotView = function(parent, profile)
{
WebInspector.View.call(this);

this.element.addStyleClass("heap-snapshot-view");

this.parent = parent;
this.parent.addEventListener("profile added", this._onProfileHeaderAdded, this);

this.viewsContainer = document.createElement("div");
this.viewsContainer.addStyleClass("views-container");
this.element.appendChild(this.viewsContainer);

this.containmentView = new WebInspector.View();
this.containmentView.element.addStyleClass("view");
this.containmentDataGrid = new WebInspector.HeapSnapshotContainmentDataGrid();
this.containmentDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
this.containmentDataGrid.show(this.containmentView.element);
this.containmentDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

this.constructorsView = new WebInspector.View();
this.constructorsView.element.addStyleClass("view");
this.constructorsView.element.appendChild(this._createToolbarWithClassNameFilter());

this.constructorsDataGrid = new WebInspector.HeapSnapshotConstructorsDataGrid();
this.constructorsDataGrid.element.addStyleClass("class-view-grid");
this.constructorsDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
this.constructorsDataGrid.show(this.constructorsView.element);
this.constructorsDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

this.diffView = new WebInspector.View();
this.diffView.element.addStyleClass("view");
this.diffView.element.appendChild(this._createToolbarWithClassNameFilter());

this.diffDataGrid = new WebInspector.HeapSnapshotDiffDataGrid();
this.diffDataGrid.element.addStyleClass("class-view-grid");
this.diffDataGrid.show(this.diffView.element);
this.diffDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

this.dominatorView = new WebInspector.View();
this.dominatorView.element.addStyleClass("view");
this.dominatorDataGrid = new WebInspector.HeapSnapshotDominatorsDataGrid();
this.dominatorDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
this.dominatorDataGrid.show(this.dominatorView.element);
this.dominatorDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

this.retainmentViewHeader = document.createElement("div");
this.retainmentViewHeader.addStyleClass("retainers-view-header");
WebInspector.installDragHandle(this.retainmentViewHeader, this._startRetainersHeaderDragging.bind(this), this._retainersHeaderDragging.bind(this), this._endRetainersHeaderDragging.bind(this), "row-resize");
var retainingPathsTitleDiv = document.createElement("div");
retainingPathsTitleDiv.className = "title";
var retainingPathsTitle = document.createElement("span");
retainingPathsTitle.textContent = WebInspector.UIString("Object's retaining tree");
retainingPathsTitleDiv.appendChild(retainingPathsTitle);
this.retainmentViewHeader.appendChild(retainingPathsTitleDiv);
this.element.appendChild(this.retainmentViewHeader);

this.retainmentView = new WebInspector.View();
this.retainmentView.element.addStyleClass("view");
this.retainmentView.element.addStyleClass("retaining-paths-view");
this.retainmentDataGrid = new WebInspector.HeapSnapshotRetainmentDataGrid();
this.retainmentDataGrid.show(this.retainmentView.element);
this.retainmentDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._inspectedObjectChanged, this);
this.retainmentView.show(this.element);
this.retainmentDataGrid.reset();

this.dataGrid =   (this.constructorsDataGrid);
this.currentView = this.constructorsView;

this.viewSelectElement = document.createElement("select");
this.viewSelectElement.className = "status-bar-item";
this.viewSelectElement.addEventListener("change", this._onSelectedViewChanged.bind(this), false);

this.views = [{title: "Summary", view: this.constructorsView, grid: this.constructorsDataGrid},
{title: "Comparison", view: this.diffView, grid: this.diffDataGrid},
{title: "Containment", view: this.containmentView, grid: this.containmentDataGrid},
{title: "Dominators", view: this.dominatorView, grid: this.dominatorDataGrid}];
this.views.current = 0;
for (var i = 0; i < this.views.length; ++i) {
var view = this.views[i];
var option = document.createElement("option");
option.label = WebInspector.UIString(view.title);
this.viewSelectElement.appendChild(option);
}

this._profileUid = profile.uid;
this._profileTypeId = profile.profileType().id;

this.baseSelectElement = document.createElement("select");
this.baseSelectElement.className = "status-bar-item";
this.baseSelectElement.addEventListener("change", this._changeBase.bind(this), false);
this._updateBaseOptions();

this.filterSelectElement = document.createElement("select");
this.filterSelectElement.className = "status-bar-item";
this.filterSelectElement.addEventListener("change", this._changeFilter.bind(this), false);
this._updateFilterOptions();

this.helpButton = new WebInspector.StatusBarButton("", "heap-snapshot-help-status-bar-item status-bar-item");
this.helpButton.addEventListener("click", this._helpClicked, this);

this._popoverHelper = new WebInspector.ObjectPopoverHelper(this.element, this._getHoverAnchor.bind(this), this._resolveObjectForPopover.bind(this), undefined, true);

this.profile.load(profileCallback.bind(this));

function profileCallback(heapSnapshotProxy)
{
var list = this._profiles();
var profileIndex;
for (var i = 0; i < list.length; ++i) {
if (list[i].uid === this._profileUid) {
profileIndex = i;
break;
}
}

if (profileIndex > 0)
this.baseSelectElement.selectedIndex = profileIndex - 1;
else
this.baseSelectElement.selectedIndex = profileIndex;
this.dataGrid.setDataSource(heapSnapshotProxy);
}
}

WebInspector.HeapSnapshotView.prototype = {
dispose: function()
{
this.profile.dispose();
if (this.baseProfile)
this.baseProfile.dispose();
this.containmentDataGrid.dispose();
this.constructorsDataGrid.dispose();
this.diffDataGrid.dispose();
this.dominatorDataGrid.dispose();
this.retainmentDataGrid.dispose();
},

get statusBarItems()
{

function appendArrowImage(element, hidden)
{
var span = document.createElement("span");
span.className = "status-bar-select-container" + (hidden ? " hidden" : "");
span.appendChild(element);
return span;
}
return [appendArrowImage(this.viewSelectElement), appendArrowImage(this.baseSelectElement, true), appendArrowImage(this.filterSelectElement), this.helpButton.element];
},

get profile()
{
return this.parent.getProfile(this._profileTypeId, this._profileUid);
},

get baseProfile()
{
return this.parent.getProfile(this._profileTypeId, this._baseProfileUid);
},

wasShown: function()
{

this.profile.load(profileCallback1.bind(this));

function profileCallback1() {
if (this.baseProfile)
this.baseProfile.load(profileCallback2.bind(this));
else
profileCallback2.call(this);
}

function profileCallback2() {
this.currentView.show(this.viewsContainer);
}
},

willHide: function()
{
this._currentSearchResultIndex = -1;
this._popoverHelper.hidePopover();
if (this.helpPopover && this.helpPopover.isShowing())
this.helpPopover.hide();
},

onResize: function()
{
var height = this.retainmentView.element.clientHeight;
this._updateRetainmentViewHeight(height);
},

searchCanceled: function()
{
if (this._searchResults) {
for (var i = 0; i < this._searchResults.length; ++i) {
var node = this._searchResults[i].node;
delete node._searchMatched;
node.refresh();
}
}

delete this._searchFinishedCallback;
this._currentSearchResultIndex = -1;
this._searchResults = [];
},

performSearch: function(query, finishedCallback)
{

this.searchCanceled();

query = query.trim();

if (!query.length)
return;
if (this.currentView !== this.constructorsView && this.currentView !== this.diffView)
return;

this._searchFinishedCallback = finishedCallback;

function matchesByName(gridNode) {
return ("_name" in gridNode) && gridNode._name.hasSubstring(query, true);
}

function matchesById(gridNode) {
return ("snapshotNodeId" in gridNode) && gridNode.snapshotNodeId === query;
}

var matchPredicate;
if (query.charAt(0) !== "@")
matchPredicate = matchesByName;
else {
query = parseInt(query.substring(1), 10);
matchPredicate = matchesById;
}

function matchesQuery(gridNode)
{
delete gridNode._searchMatched;
if (matchPredicate(gridNode)) {
gridNode._searchMatched = true;
gridNode.refresh();
return true;
}
return false;
}

var current = this.dataGrid.rootNode().children[0];
var depth = 0;
var info = {};


const maxDepth = 1;

while (current) {
if (matchesQuery(current))
this._searchResults.push({ node: current });
current = current.traverseNextNode(false, null, (depth >= maxDepth), info);
depth += info.depthChange;
}

finishedCallback(this, this._searchResults.length);
},

jumpToFirstSearchResult: function()
{
if (!this._searchResults || !this._searchResults.length)
return;
this._currentSearchResultIndex = 0;
this._jumpToSearchResult(this._currentSearchResultIndex);
},

jumpToLastSearchResult: function()
{
if (!this._searchResults || !this._searchResults.length)
return;
this._currentSearchResultIndex = (this._searchResults.length - 1);
this._jumpToSearchResult(this._currentSearchResultIndex);
},

jumpToNextSearchResult: function()
{
if (!this._searchResults || !this._searchResults.length)
return;
if (++this._currentSearchResultIndex >= this._searchResults.length)
this._currentSearchResultIndex = 0;
this._jumpToSearchResult(this._currentSearchResultIndex);
},

jumpToPreviousSearchResult: function()
{
if (!this._searchResults || !this._searchResults.length)
return;
if (--this._currentSearchResultIndex < 0)
this._currentSearchResultIndex = (this._searchResults.length - 1);
this._jumpToSearchResult(this._currentSearchResultIndex);
},

showingFirstSearchResult: function()
{
return (this._currentSearchResultIndex === 0);
},

showingLastSearchResult: function()
{
return (this._searchResults && this._currentSearchResultIndex === (this._searchResults.length - 1));
},

_jumpToSearchResult: function(index)
{
var searchResult = this._searchResults[index];
if (!searchResult)
return;

var node = searchResult.node;
node.revealAndSelect();
},

refreshVisibleData: function()
{
var child = this.dataGrid.rootNode().children[0];
while (child) {
child.refresh();
child = child.traverseNextNode(false, null, true);
}
},

_changeBase: function()
{
if (this._baseProfileUid === this._profiles()[this.baseSelectElement.selectedIndex].uid)
return;

this._baseProfileUid = this._profiles()[this.baseSelectElement.selectedIndex].uid;
var dataGrid =   (this.dataGrid);

if (dataGrid.snapshot)
this.baseProfile.load(dataGrid.setBaseDataSource.bind(dataGrid));

if (!this.currentQuery || !this._searchFinishedCallback || !this._searchResults)
return;




this._searchFinishedCallback(this, -this._searchResults.length);
this.performSearch(this.currentQuery, this._searchFinishedCallback);
},

_changeFilter: function()
{
var profileIndex = this.filterSelectElement.selectedIndex - 1;
this.dataGrid.filterSelectIndexChanged(this._profiles(), profileIndex);

WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
action: WebInspector.UserMetrics.UserActionNames.HeapSnapshotFilterChanged,
label: this.filterSelectElement[this.filterSelectElement.selectedIndex].label
});

if (!this.currentQuery || !this._searchFinishedCallback || !this._searchResults)
return;




this._searchFinishedCallback(this, -this._searchResults.length);
this.performSearch(this.currentQuery, this._searchFinishedCallback);
},

_createToolbarWithClassNameFilter: function()
{
var toolbar = document.createElement("div");
toolbar.addStyleClass("class-view-toolbar");
var classNameFilter = document.createElement("input");
classNameFilter.addStyleClass("class-name-filter");
classNameFilter.setAttribute("placeholder", WebInspector.UIString("Class filter"));
classNameFilter.addEventListener("keyup", this._changeNameFilter.bind(this, classNameFilter), false);
toolbar.appendChild(classNameFilter);
return toolbar;
},

_changeNameFilter: function(classNameInputElement)
{
var filter = classNameInputElement.value;
this.dataGrid.changeNameFilter(filter);
},


_profiles: function()
{
return this.parent.getProfileType(this._profileTypeId).getProfiles();
},


populateContextMenu: function(contextMenu, event)
{
this.dataGrid.populateContextMenu(this.parent, contextMenu, event);
},

_selectionChanged: function(event)
{
var selectedNode = event.target.selectedNode;
this._setRetainmentDataGridSource(selectedNode);
this._inspectedObjectChanged(event);
},

_inspectedObjectChanged: function(event)
{
var selectedNode = event.target.selectedNode;
if (!this.profile.fromFile() && selectedNode instanceof WebInspector.HeapSnapshotGenericObjectNode)
ConsoleAgent.addInspectedHeapObject(selectedNode.snapshotNodeId);
},

_setRetainmentDataGridSource: function(nodeItem)
{
if (nodeItem && nodeItem.snapshotNodeIndex)
this.retainmentDataGrid.setDataSource(nodeItem.isDeletedNode ? nodeItem.dataGrid.baseSnapshot : nodeItem.dataGrid.snapshot, nodeItem.snapshotNodeIndex);
else
this.retainmentDataGrid.reset();
},

_mouseDownInContentsGrid: function(event)
{
if (event.detail < 2)
return;

var cell = event.target.enclosingNodeOrSelfWithNodeName("td");
if (!cell || (!cell.hasStyleClass("count-column") && !cell.hasStyleClass("shallowSize-column") && !cell.hasStyleClass("retainedSize-column")))
return;

event.consume(true);
},

changeView: function(viewTitle, callback)
{
var viewIndex = null;
for (var i = 0; i < this.views.length; ++i)
if (this.views[i].title === viewTitle) {
viewIndex = i;
break;
}
if (this.views.current === viewIndex) {
setTimeout(callback, 0);
return;
}

function dataGridContentShown(event)
{
var dataGrid = event.data;
dataGrid.removeEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, dataGridContentShown, this);
if (dataGrid === this.dataGrid)
callback();
}
this.views[viewIndex].grid.addEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, dataGridContentShown, this);

this.viewSelectElement.selectedIndex = viewIndex;
this._changeView(viewIndex);
},

_updateDataSourceAndView: function()
{
var dataGrid = this.dataGrid;
if (dataGrid.snapshot)
return;

this.profile.load(didLoadSnapshot.bind(this));
function didLoadSnapshot(snapshotProxy)
{
if (this.dataGrid !== dataGrid)
return;
if (dataGrid.snapshot !== snapshotProxy)
dataGrid.setDataSource(snapshotProxy);
if (dataGrid === this.diffDataGrid) {
if (!this._baseProfileUid)
this._baseProfileUid = this._profiles()[this.baseSelectElement.selectedIndex].uid;
this.baseProfile.load(didLoadBaseSnaphot.bind(this));
}
}

function didLoadBaseSnaphot(baseSnapshotProxy)
{
if (this.diffDataGrid.baseSnapshot !== baseSnapshotProxy)
this.diffDataGrid.setBaseDataSource(baseSnapshotProxy);
}
},

_onSelectedViewChanged: function(event)
{
this._changeView(event.target.selectedIndex);
},

_updateSelectorsVisibility: function()
{
if (this.currentView === this.diffView)
this.baseSelectElement.parentElement.removeStyleClass("hidden");
else
this.baseSelectElement.parentElement.addStyleClass("hidden");

if (this.currentView === this.constructorsView)
this.filterSelectElement.parentElement.removeStyleClass("hidden");
else
this.filterSelectElement.parentElement.addStyleClass("hidden");
},

_changeView: function(selectedIndex)
{
if (selectedIndex === this.views.current)
return;

this.views.current = selectedIndex;
this.currentView.detach();
var view = this.views[this.views.current];
this.currentView = view.view;
this.dataGrid = view.grid;
this.currentView.show(this.viewsContainer);
this.refreshVisibleData();
this.dataGrid.updateWidths();

this._updateSelectorsVisibility();

this._updateDataSourceAndView();

if (!this.currentQuery || !this._searchFinishedCallback || !this._searchResults)
return;




this._searchFinishedCallback(this, -this._searchResults.length);
this.performSearch(this.currentQuery, this._searchFinishedCallback);
},

_getHoverAnchor: function(target)
{
var span = target.enclosingNodeOrSelfWithNodeName("span");
if (!span)
return;
var row = target.enclosingNodeOrSelfWithNodeName("tr");
if (!row)
return;
span.node = row._dataGridNode;
return span;
},

_resolveObjectForPopover: function(element, showCallback, objectGroupName)
{
if (this.profile.fromFile())
return;
element.node.queryObjectContent(showCallback, objectGroupName);
},

_helpClicked: function(event)
{
if (!this._helpPopoverContentElement) {
var refTypes = ["a:", "console-formatted-name", WebInspector.UIString("property"),
"0:", "console-formatted-name", WebInspector.UIString("element"),
"a:", "console-formatted-number", WebInspector.UIString("context var"),
"a:", "console-formatted-null", WebInspector.UIString("system prop")];
var objTypes = [" a ", "console-formatted-object", "Object",
"\"a\"", "console-formatted-string", "String",
"/a/", "console-formatted-string", "RegExp",
"a()", "console-formatted-function", "Function",
"a[]", "console-formatted-object", "Array",
"num", "console-formatted-number", "Number",
" a ", "console-formatted-null", "System"];

var contentElement = document.createElement("table");
contentElement.className = "heap-snapshot-help";
var headerRow = document.createElement("tr");
var propsHeader = document.createElement("th");
propsHeader.textContent = WebInspector.UIString("Property types:");
headerRow.appendChild(propsHeader);
var objsHeader = document.createElement("th");
objsHeader.textContent = WebInspector.UIString("Object types:");
headerRow.appendChild(objsHeader);
contentElement.appendChild(headerRow);

function appendHelp(help, index, cell)
{
var div = document.createElement("div");
div.className = "source-code event-properties";
var name = document.createElement("span");
name.textContent = help[index];
name.className = help[index + 1];
div.appendChild(name);
var desc = document.createElement("span");
desc.textContent = " " + help[index + 2];
div.appendChild(desc);
cell.appendChild(div);
}

var len = Math.max(refTypes.length, objTypes.length);
for (var i = 0; i < len; i += 3) {
var row = document.createElement("tr");
var refCell = document.createElement("td");
if (refTypes[i])
appendHelp(refTypes, i, refCell);
row.appendChild(refCell);
var objCell = document.createElement("td");
if (objTypes[i])
appendHelp(objTypes, i, objCell);
row.appendChild(objCell);
contentElement.appendChild(row);
}
this._helpPopoverContentElement = contentElement;
this.helpPopover = new WebInspector.Popover();
}
if (this.helpPopover.isShowing())
this.helpPopover.hide();
else
this.helpPopover.show(this._helpPopoverContentElement, this.helpButton.element);
},


_startRetainersHeaderDragging: function(event)
{
if (!this.isShowing())
return false;

this._previousDragPosition = event.pageY;
return true;
},

_retainersHeaderDragging: function(event)
{
var height = this.retainmentView.element.clientHeight;
height += this._previousDragPosition - event.pageY;
this._previousDragPosition = event.pageY;
this._updateRetainmentViewHeight(height);
event.consume(true);
},

_endRetainersHeaderDragging: function(event)
{
delete this._previousDragPosition;
event.consume();
},

_updateRetainmentViewHeight: function(height)
{
height = Number.constrain(height, Preferences.minConsoleHeight, this.element.clientHeight - Preferences.minConsoleHeight);
this.viewsContainer.style.bottom = (height + this.retainmentViewHeader.clientHeight) + "px";
this.retainmentView.element.style.height = height + "px";
this.retainmentViewHeader.style.bottom = height + "px";
this.currentView.doResize();
},

_updateBaseOptions: function()
{
var list = this._profiles();

if (this.baseSelectElement.length === list.length)
return;

for (var i = this.baseSelectElement.length, n = list.length; i < n; ++i) {
var baseOption = document.createElement("option");
var title = list[i].title;
if (WebInspector.ProfilesPanelDescriptor.isUserInitiatedProfile(title))
title = WebInspector.UIString("Snapshot %d", WebInspector.ProfilesPanelDescriptor.userInitiatedProfileIndex(title));
baseOption.label = title;
this.baseSelectElement.appendChild(baseOption);
}
},

_updateFilterOptions: function()
{
var list = this._profiles();

if (this.filterSelectElement.length - 1 === list.length)
return;

if (!this.filterSelectElement.length) {
var filterOption = document.createElement("option");
filterOption.label = WebInspector.UIString("All objects");
this.filterSelectElement.appendChild(filterOption);
}

if (this.profile.fromFile())
return;
for (var i = this.filterSelectElement.length - 1, n = list.length; i < n; ++i) {
var profile = list[i];
var filterOption = document.createElement("option");
var title = list[i].title;
if (WebInspector.ProfilesPanelDescriptor.isUserInitiatedProfile(title)) {
var profileIndex = WebInspector.ProfilesPanelDescriptor.userInitiatedProfileIndex(title);
if (!i)
title = WebInspector.UIString("Objects allocated before Snapshot %d", profileIndex);
else
title = WebInspector.UIString("Objects allocated between Snapshots %d and %d", profileIndex - 1, profileIndex);
}
filterOption.label = title;
this.filterSelectElement.appendChild(filterOption);
}
},


_onProfileHeaderAdded: function(event)
{
if (!event.data || event.data.type !== this._profileTypeId)
return;
this._updateBaseOptions();
this._updateFilterOptions();
},

__proto__: WebInspector.View.prototype
}



WebInspector.HeapSnapshotProfileType = function()
{
WebInspector.ProfileType.call(this, WebInspector.HeapSnapshotProfileType.TypeId, WebInspector.UIString("Take Heap Snapshot"));
InspectorBackend.registerHeapProfilerDispatcher(this);
}

WebInspector.HeapSnapshotProfileType.TypeId = "HEAP";

WebInspector.HeapSnapshotProfileType.prototype = {

fileExtension: function()
{
return ".heapsnapshot";
},

get buttonTooltip()
{
return WebInspector.UIString("Take heap snapshot.");
},


isInstantProfile: function()
{
return true;
},


buttonClicked: function()
{
this._takeHeapSnapshot();
return false;
},

get treeItemTitle()
{
return WebInspector.UIString("HEAP SNAPSHOTS");
},

get description()
{
return WebInspector.UIString("Heap snapshot profiles show memory distribution among your page's JavaScript objects and related DOM nodes.");
},


createTemporaryProfile: function(title)
{
title = title || WebInspector.UIString("Snapshotting\u2026");
return new WebInspector.HeapProfileHeader(this, title);
},


createProfile: function(profile)
{
return new WebInspector.HeapProfileHeader(this, profile.title, profile.uid, profile.maxJSObjectId || 0);
},

_takeHeapSnapshot: function()
{
var temporaryProfile = this.findTemporaryProfile();
if (!temporaryProfile)
this.addProfile(this.createTemporaryProfile());
HeapProfilerAgent.takeHeapSnapshot(true, function() {});
WebInspector.userMetrics.ProfilesHeapProfileTaken.record();
},


addProfileHeader: function(profileHeader)
{
this.addProfile(this.createProfile(profileHeader));
},


addHeapSnapshotChunk: function(uid, chunk)
{
var profile = this._profilesIdMap[this._makeKey(uid)];
if (profile)
profile.transferChunk(chunk);
},


finishHeapSnapshot: function(uid)
{
var profile = this._profilesIdMap[this._makeKey(uid)];
if (profile)
profile.finishHeapSnapshot();
},


reportHeapSnapshotProgress: function(done, total)
{
var profile = this.findTemporaryProfile();
if (profile)
this.dispatchEventToListeners(WebInspector.ProfileType.Events.ProgressUpdated, {"profile": profile, "done": done, "total": total});
},


resetProfiles: function()
{
this._reset();
},


removeProfile: function(profile)
{
WebInspector.ProfileType.prototype.removeProfile.call(this, profile);
if (!profile.isTemporary)
HeapProfilerAgent.removeProfile(profile.uid);
},


_requestProfilesFromBackend: function(populateCallback)
{
HeapProfilerAgent.getProfileHeaders(populateCallback);
},

__proto__: WebInspector.ProfileType.prototype
}


WebInspector.HeapProfileHeader = function(type, title, uid, maxJSObjectId)
{
WebInspector.ProfileHeader.call(this, type, title, uid);
this.maxJSObjectId = maxJSObjectId;

this._receiver = null;

this._snapshotProxy = null;
this._totalNumberOfChunks = 0;
}

WebInspector.HeapProfileHeader.prototype = {

createSidebarTreeElement: function()
{
return new WebInspector.ProfileSidebarTreeElement(this, WebInspector.UIString("Snapshot %d"), "heap-snapshot-sidebar-tree-item");
},


createView: function(profilesPanel)
{
return new WebInspector.HeapSnapshotView(profilesPanel, this);
},


load: function(callback)
{
if (this._snapshotProxy) {
callback(this._snapshotProxy);
return;
}

this._numberOfChunks = 0;
this._savedChunks = 0;
this._savingToFile = false;
if (!this._receiver) {
this._setupWorker();
this.sidebarElement.subtitle = WebInspector.UIString("Loading\u2026");
this.sidebarElement.wait = true;
this.startSnapshotTransfer();
}
var loaderProxy =   (this._receiver);
loaderProxy.addConsumer(callback);
},

startSnapshotTransfer: function()
{
HeapProfilerAgent.getHeapSnapshot(this.uid);
},

snapshotConstructorName: function()
{
return "JSHeapSnapshot";
},

snapshotProxyConstructor: function()
{
return WebInspector.HeapSnapshotProxy;
},

_setupWorker: function()
{
function setProfileWait(event)
{
this.sidebarElement.wait = event.data;
}
var worker = new WebInspector.HeapSnapshotWorker();
worker.addEventListener("wait", setProfileWait, this);
var loaderProxy = worker.createLoader(this.snapshotConstructorName(), this.snapshotProxyConstructor());
loaderProxy.addConsumer(this._snapshotReceived.bind(this));
this._receiver = loaderProxy;
},


dispose: function()
{
if (this._receiver)
this._receiver.close();
else if (this._snapshotProxy)
this._snapshotProxy.dispose();
},


_updateTransferProgress: function(value, maxValue)
{
var percentValue = ((maxValue ? (value / maxValue) : 0) * 100).toFixed(0);
if (this._savingToFile)
this.sidebarElement.subtitle = WebInspector.UIString("Saving\u2026 %d\%", percentValue);
else
this.sidebarElement.subtitle = WebInspector.UIString("Loading\u2026 %d\%", percentValue);
},

_updateSnapshotStatus: function()
{
this.sidebarElement.subtitle = Number.bytesToString(this._snapshotProxy.totalSize);
this.sidebarElement.wait = false;
},


transferChunk: function(chunk)
{
++this._numberOfChunks;
this._receiver.write(chunk, callback.bind(this));
function callback()
{
this._updateTransferProgress(++this._savedChunks, this._totalNumberOfChunks);
if (this._totalNumberOfChunks === this._savedChunks) {
if (this._savingToFile)
this._updateSnapshotStatus();
else
this.sidebarElement.subtitle = WebInspector.UIString("Parsing\u2026");

this._receiver.close();
}
}
},

_snapshotReceived: function(snapshotProxy)
{
this._receiver = null;
if (snapshotProxy)
this._snapshotProxy = snapshotProxy;
this._updateSnapshotStatus();
var worker =   (this._snapshotProxy.worker);
this.isTemporary = false;
worker.startCheckingForLongRunningCalls();
},

finishHeapSnapshot: function()
{
this._totalNumberOfChunks = this._numberOfChunks;
},


canSaveToFile: function()
{
return !this.fromFile() && !!this._snapshotProxy && !this._receiver;
},


saveToFile: function()
{
this._numberOfChunks = 0;

var fileOutputStream = new WebInspector.FileOutputStream();
function onOpen()
{
this._receiver = fileOutputStream;
this._savedChunks = 0;
this._updateTransferProgress(0, this._totalNumberOfChunks);
HeapProfilerAgent.getHeapSnapshot(this.uid);
}
this._savingToFile = true;
this._fileName = this._fileName || "Heap-" + new Date().toISO8601Compact() + this._profileType.fileExtension();
fileOutputStream.open(this._fileName, onOpen.bind(this));
},


loadFromFile: function(file)
{
this.title = file.name;
this.sidebarElement.subtitle = WebInspector.UIString("Loading\u2026");
this.sidebarElement.wait = true;
this._setupWorker();
this._numberOfChunks = 0;
this._savingToFile = false;

var delegate = new WebInspector.HeapSnapshotLoadFromFileDelegate(this);
var fileReader = this._createFileReader(file, delegate);
fileReader.start(this._receiver);
},

_createFileReader: function(file, delegate)
{
return new WebInspector.ChunkedFileReader(file, 10000000, delegate);
},

__proto__: WebInspector.ProfileHeader.prototype
}


WebInspector.HeapSnapshotLoadFromFileDelegate = function(snapshotHeader)
{
this._snapshotHeader = snapshotHeader;
}

WebInspector.HeapSnapshotLoadFromFileDelegate.prototype = {
onTransferStarted: function()
{
},


onChunkTransferred: function(reader)
{
this._snapshotHeader._updateTransferProgress(reader.loadedSize(), reader.fileSize());
},

onTransferFinished: function()
{
this._snapshotHeader.finishHeapSnapshot();
},


onError: function (reader, e)
{
switch(e.target.error.code) {
case e.target.error.NOT_FOUND_ERR:
this._snapshotHeader.sidebarElement.subtitle = WebInspector.UIString("'%s' not found.", reader.fileName());
break;
case e.target.error.NOT_READABLE_ERR:
this._snapshotHeader.sidebarElement.subtitle = WebInspector.UIString("'%s' is not readable", reader.fileName());
break;
case e.target.error.ABORT_ERR:
break;
default:
this._snapshotHeader.sidebarElement.subtitle = WebInspector.UIString("'%s' error %d", reader.fileName(), e.target.error.code);
}
}
}
;



WebInspector.HeapSnapshotWorkerDispatcher = function(globalObject, postMessage)
{
this._objects = [];
this._global = globalObject;
this._postMessage = postMessage;
}

WebInspector.HeapSnapshotWorkerDispatcher.prototype = {
_findFunction: function(name)
{
var path = name.split(".");
var result = this._global;
for (var i = 0; i < path.length; ++i)
result = result[path[i]];
return result;
},

dispatchMessage: function(event)
{
var data = event.data;
var response = {callId: data.callId};
try {
switch (data.disposition) {
case "create": {
var constructorFunction = this._findFunction(data.methodName);
this._objects[data.objectId] = new constructorFunction();
break;
}
case "dispose": {
delete this._objects[data.objectId];
break;
}
case "getter": {
var object = this._objects[data.objectId];
var result = object[data.methodName];
response.result = result;
break;
}
case "factory": {
var object = this._objects[data.objectId];
var result = object[data.methodName].apply(object, data.methodArguments);
if (result)
this._objects[data.newObjectId] = result;
response.result = !!result;
break;
}
case "method": {
var object = this._objects[data.objectId];
response.result = object[data.methodName].apply(object, data.methodArguments);
break;
}
}
} catch (e) {
response.error = e.toString();
response.errorCallStack = e.stack;
if (data.methodName)
response.errorMethodName = data.methodName;
}
this._postMessage(response);
}
};
;



WebInspector.JSHeapSnapshot = function(profile)
{
this._nodeFlags = { 
canBeQueried: 1,
detachedDOMTreeNode: 2,
pageObject: 4, 

visitedMarkerMask: 0x0ffff, 
visitedMarker:     0x10000  
};
WebInspector.HeapSnapshot.call(this, profile);
}

WebInspector.JSHeapSnapshot.prototype = {
createNode: function(nodeIndex)
{
return new WebInspector.JSHeapSnapshotNode(this, nodeIndex);
},

createEdge: function(edges, edgeIndex)
{
return new WebInspector.JSHeapSnapshotEdge(this, edges, edgeIndex);
},

createRetainingEdge: function(retainedNodeIndex, retainerIndex)
{
return new WebInspector.JSHeapSnapshotRetainerEdge(this, retainedNodeIndex, retainerIndex);
},

classNodesFilter: function()
{
function filter(node)
{
return node.isUserObject();
}
return filter;
},

containmentEdgesFilter: function(showHiddenData)
{
function filter(edge) {
if (edge.isInvisible())
return false;
if (showHiddenData)
return true;
return !edge.isHidden() && !edge.node().isHidden();
}
return filter;
},

retainingEdgesFilter: function(showHiddenData)
{
var containmentEdgesFilter = this.containmentEdgesFilter(showHiddenData);
function filter(edge) {
if (!containmentEdgesFilter(edge))
return false;
return edge.node().id() !== 1 && !edge.node().isSynthetic() && !edge.isWeak();
}
return filter;
},

dispose: function()
{
WebInspector.HeapSnapshot.prototype.dispose.call(this);
delete this._flags;
},

_markInvisibleEdges: function()
{



for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
var edge = iter.edge;
if (!edge.isShortcut())
continue;
var node = edge.node();
var propNames = {};
for (var innerIter = node.edges(); innerIter.hasNext(); innerIter.next()) {
var globalObjEdge = innerIter.edge;
if (globalObjEdge.isShortcut())
propNames[globalObjEdge._nameOrIndex()] = true;
}
for (innerIter.rewind(); innerIter.hasNext(); innerIter.next()) {
var globalObjEdge = innerIter.edge;
if (!globalObjEdge.isShortcut()
&& globalObjEdge.node().isHidden()
&& globalObjEdge._hasStringName()
&& (globalObjEdge._nameOrIndex() in propNames))
this._containmentEdges[globalObjEdge._edges._start + globalObjEdge.edgeIndex + this._edgeTypeOffset] = this._edgeInvisibleType;
}
}
},

_calculateFlags: function()
{
this._flags = new Uint32Array(this.nodeCount);
this._markDetachedDOMTreeNodes();
this._markQueriableHeapObjects();
this._markPageOwnedNodes();
},

distanceForUserRoot: function(node)
{
if (node.isWindow())
return 1;
if (node.isDocumentDOMTreesRoot())
return 0;
return -1;
},

userObjectsMapAndFlag: function()
{
return {
map: this._flags,
flag: this._nodeFlags.pageObject
};
},

_flagsOfNode: function(node)
{
return this._flags[node.nodeIndex / this._nodeFieldCount];
},

_markDetachedDOMTreeNodes: function()
{
var flag = this._nodeFlags.detachedDOMTreeNode;
var detachedDOMTreesRoot;
for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
var node = iter.edge.node();
if (node.name() === "(Detached DOM trees)") {
detachedDOMTreesRoot = node;
break;
}
}

if (!detachedDOMTreesRoot)
return;

var detachedDOMTreeRE = /^Detached DOM tree/;
for (var iter = detachedDOMTreesRoot.edges(); iter.hasNext(); iter.next()) {
var node = iter.edge.node();
if (detachedDOMTreeRE.test(node.className())) {
for (var edgesIter = node.edges(); edgesIter.hasNext(); edgesIter.next())
this._flags[edgesIter.edge.node().nodeIndex / this._nodeFieldCount] |= flag;
}
}
},

_markQueriableHeapObjects: function()
{



var flag = this._nodeFlags.canBeQueried;
var hiddenEdgeType = this._edgeHiddenType;
var internalEdgeType = this._edgeInternalType;
var invisibleEdgeType = this._edgeInvisibleType;
var weakEdgeType = this._edgeWeakType;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeTypeOffset = this._edgeTypeOffset;
var edgeFieldsCount = this._edgeFieldsCount;
var containmentEdges = this._containmentEdges;
var nodes = this._nodes;
var nodeCount = this.nodeCount;
var nodeFieldCount = this._nodeFieldCount;
var firstEdgeIndexes = this._firstEdgeIndexes;

var flags = this._flags;
var list = [];

for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
if (iter.edge.node().isWindow())
list.push(iter.edge.node().nodeIndex / nodeFieldCount);
}

while (list.length) {
var nodeOrdinal = list.pop();
if (flags[nodeOrdinal] & flag)
continue;
flags[nodeOrdinal] |= flag;
var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
var childNodeOrdinal = childNodeIndex / nodeFieldCount;
if (flags[childNodeOrdinal] & flag)
continue;
var type = containmentEdges[edgeIndex + edgeTypeOffset];
if (type === hiddenEdgeType || type === invisibleEdgeType || type === internalEdgeType || type === weakEdgeType)
continue;
list.push(childNodeOrdinal);
}
}
},

_markPageOwnedNodes: function()
{
var edgeShortcutType = this._edgeShortcutType;
var edgeElementType = this._edgeElementType;
var edgeToNodeOffset = this._edgeToNodeOffset;
var edgeTypeOffset = this._edgeTypeOffset;
var edgeFieldsCount = this._edgeFieldsCount;
var edgeWeakType = this._edgeWeakType;
var firstEdgeIndexes = this._firstEdgeIndexes;
var containmentEdges = this._containmentEdges;
var containmentEdgesLength = containmentEdges.length;
var nodes = this._nodes;
var nodeFieldCount = this._nodeFieldCount;
var nodesCount = this.nodeCount;

var flags = this._flags;
var flag = this._nodeFlags.pageObject;
var visitedMarker = this._nodeFlags.visitedMarker;
var visitedMarkerMask = this._nodeFlags.visitedMarkerMask;
var markerAndFlag = visitedMarker | flag;

var nodesToVisit = new Uint32Array(nodesCount);
var nodesToVisitLength = 0;

var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;
var node = this.rootNode();
for (var edgeIndex = firstEdgeIndexes[rootNodeOrdinal], endEdgeIndex = firstEdgeIndexes[rootNodeOrdinal + 1];
edgeIndex < endEdgeIndex;
edgeIndex += edgeFieldsCount) {
var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
var nodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
if (edgeType === edgeElementType) {
node.nodeIndex = nodeIndex;
if (!node.isDocumentDOMTreesRoot())
continue;
} else if (edgeType !== edgeShortcutType)
continue;
var nodeOrdinal = nodeIndex / nodeFieldCount;
nodesToVisit[nodesToVisitLength++] = nodeOrdinal;
flags[nodeOrdinal] |= visitedMarker;
}

while (nodesToVisitLength) {
var nodeOrdinal = nodesToVisit[--nodesToVisitLength];
flags[nodeOrdinal] |= flag;
flags[nodeOrdinal] &= visitedMarkerMask;
var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
var childNodeOrdinal = childNodeIndex / nodeFieldCount;
if (flags[childNodeOrdinal] & markerAndFlag)
continue;
var type = containmentEdges[edgeIndex + edgeTypeOffset];
if (type === edgeWeakType)
continue;
nodesToVisit[nodesToVisitLength++] = childNodeOrdinal;
flags[childNodeOrdinal] |= visitedMarker;
}
}
},

__proto__: WebInspector.HeapSnapshot.prototype
};


WebInspector.JSHeapSnapshotNode = function(snapshot, nodeIndex)
{
WebInspector.HeapSnapshotNode.call(this, snapshot, nodeIndex)
}

WebInspector.JSHeapSnapshotNode.prototype = {
canBeQueried: function()
{
var flags = this._snapshot._flagsOfNode(this);
return !!(flags & this._snapshot._nodeFlags.canBeQueried);
},

isUserObject: function()
{
var flags = this._snapshot._flagsOfNode(this);
return !!(flags & this._snapshot._nodeFlags.pageObject);
},

className: function()
{
var type = this.type();
switch (type) {
case "hidden":
return "(system)";
case "object":
case "native":
return this.name();
case "code":
return "(compiled code)";
default:
return "(" + type + ")";
}
},

classIndex: function()
{
var snapshot = this._snapshot;
var nodes = snapshot._nodes;
var type = nodes[this.nodeIndex + snapshot._nodeTypeOffset];;
if (type === snapshot._nodeObjectType || type === snapshot._nodeNativeType)
return nodes[this.nodeIndex + snapshot._nodeNameOffset];
return -1 - type;
},

id: function()
{
var snapshot = this._snapshot;
return snapshot._nodes[this.nodeIndex + snapshot._nodeIdOffset];
},

isHidden: function()
{
return this._type() === this._snapshot._nodeHiddenType;
},

isSynthetic: function()
{
return this._type() === this._snapshot._nodeSyntheticType;
},

isWindow: function()
{
const windowRE = /^Window/;
return windowRE.test(this.name());
},

isDocumentDOMTreesRoot: function()
{
return this.isSynthetic() && this.name() === "(Document DOM trees)";
},

serialize: function()
{
var result = WebInspector.HeapSnapshotNode.prototype.serialize.call(this);
var flags = this._snapshot._flagsOfNode(this);
if (flags & this._snapshot._nodeFlags.canBeQueried)
result.canBeQueried = true;
if (flags & this._snapshot._nodeFlags.detachedDOMTreeNode)
result.detachedDOMTreeNode = true;
return result;
},

__proto__: WebInspector.HeapSnapshotNode.prototype
};


WebInspector.JSHeapSnapshotEdge = function(snapshot, edges, edgeIndex)
{
WebInspector.HeapSnapshotEdge.call(this, snapshot, edges, edgeIndex);
}

WebInspector.JSHeapSnapshotEdge.prototype = {
clone: function()
{
return new WebInspector.JSHeapSnapshotEdge(this._snapshot, this._edges, this.edgeIndex);
},

hasStringName: function()
{
if (!this.isShortcut())
return this._hasStringName();
return isNaN(parseInt(this._name(), 10));
},

isElement: function()
{
return this._type() === this._snapshot._edgeElementType;
},

isHidden: function()
{
return this._type() === this._snapshot._edgeHiddenType;
},

isWeak: function()
{
return this._type() === this._snapshot._edgeWeakType;
},

isInternal: function()
{
return this._type() === this._snapshot._edgeInternalType;
},

isInvisible: function()
{
return this._type() === this._snapshot._edgeInvisibleType;
},

isShortcut: function()
{
return this._type() === this._snapshot._edgeShortcutType;
},

name: function()
{
if (!this.isShortcut())
return this._name();
var numName = parseInt(this._name(), 10);
return isNaN(numName) ? this._name() : numName;
},

toString: function()
{
var name = this.name();
switch (this.type()) {
case "context": return "->" + name;
case "element": return "[" + name + "]";
case "weak": return "[[" + name + "]]";
case "property":
return name.indexOf(" ") === -1 ? "." + name : "[\"" + name + "\"]";
case "shortcut":
if (typeof name === "string")
return name.indexOf(" ") === -1 ? "." + name : "[\"" + name + "\"]";
else
return "[" + name + "]";
case "internal":
case "hidden":
case "invisible":
return "{" + name + "}";
};
return "?" + name + "?";
},

_hasStringName: function()
{
return !this.isElement() && !this.isHidden() && !this.isWeak();
},

_name: function()
{
return this._hasStringName() ? this._snapshot._strings[this._nameOrIndex()] : this._nameOrIndex();
},

_nameOrIndex: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeNameOffset);
},

_type: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeTypeOffset);
},

__proto__: WebInspector.HeapSnapshotEdge.prototype
};



WebInspector.JSHeapSnapshotRetainerEdge = function(snapshot, retainedNodeIndex, retainerIndex)
{
WebInspector.HeapSnapshotRetainerEdge.call(this, snapshot, retainedNodeIndex, retainerIndex);
}

WebInspector.JSHeapSnapshotRetainerEdge.prototype = {
clone: function()
{
return new WebInspector.JSHeapSnapshotRetainerEdge(this._snapshot, this._retainedNodeIndex, this.retainerIndex());
},

isHidden: function()
{
return this._edge().isHidden();
},

isInternal: function()
{
return this._edge().isInternal();
},

isInvisible: function()
{
return this._edge().isInvisible();
},

isShortcut: function()
{
return this._edge().isShortcut();
},

isWeak: function()
{
return this._edge().isWeak();
},

__proto__: WebInspector.HeapSnapshotRetainerEdge.prototype
}

;



WebInspector.NativeHeapSnapshot = function(profile)
{
WebInspector.HeapSnapshot.call(this, profile);
this._nodeObjectType = this._metaNode.type_strings["object"];
this._edgeWeakType = this._metaNode.type_strings["weak"];
this._edgeElementType = this._metaNode.type_strings["property"];
}

WebInspector.NativeHeapSnapshot.prototype = {
createNode: function(nodeIndex)
{
return new WebInspector.NativeHeapSnapshotNode(this, nodeIndex);
},

createEdge: function(edges, edgeIndex)
{
return new WebInspector.NativeHeapSnapshotEdge(this, edges, edgeIndex);
},

createRetainingEdge: function(retainedNodeIndex, retainerIndex)
{
return new WebInspector.NativeHeapSnapshotRetainerEdge(this, retainedNodeIndex, retainerIndex);
},

_markInvisibleEdges: function()
{
},

_calculateFlags: function()
{
},

userObjectsMapAndFlag: function()
{
return null;
},

images: function()
{
var aggregatesByClassName = this.aggregates(false, "allObjects");
var result = [];
var cachedImages = aggregatesByClassName["WebCore::CachedImage"];
function getImageName(node)
{
return node.name();
}
this._addNodes(cachedImages, getImageName, result);

var canvases = aggregatesByClassName["WebCore::HTMLCanvasElement"];
function getCanvasName(node)
{
return "HTMLCanvasElement";
}
this._addNodes(canvases, getCanvasName, result);
return result;
},

_addNodes: function(classData, nameResolver, result)
{
if (!classData)
return;
var node = this.rootNode();
for (var i = 0; i < classData.idxs.length; i++) {
node.nodeIndex = classData.idxs[i];
result.push({
name: nameResolver(node),
size: node.retainedSize(),
});
}
},

__proto__: WebInspector.HeapSnapshot.prototype
};


WebInspector.NativeHeapSnapshotNode = function(snapshot, nodeIndex)
{
WebInspector.HeapSnapshotNode.call(this, snapshot, nodeIndex)
}

WebInspector.NativeHeapSnapshotNode.prototype = {
className: function()
{
return this._snapshot._strings[this.classIndex()];
},

classIndex: function()
{
return this._snapshot._nodes[this.nodeIndex + this._snapshot._nodeTypeOffset];
},

id: function()
{
return this._snapshot._nodes[this.nodeIndex + this._snapshot._nodeIdOffset];
},

name: function()
{
return this._snapshot._strings[this._snapshot._nodes[this.nodeIndex + this._snapshot._nodeNameOffset]];;
},

serialize: function()
{
return {
id: this.id(),
name: this.className(),
displayName: this.name(),
distance: this.distance(),
nodeIndex: this.nodeIndex,
retainedSize: this.retainedSize(),
selfSize: this.selfSize(),
type: this._snapshot._nodeObjectType
};
},

isHidden: function()
{
return false;
},

isSynthetic: function()
{
return false;
},

__proto__: WebInspector.HeapSnapshotNode.prototype
};


WebInspector.NativeHeapSnapshotEdge = function(snapshot, edges, edgeIndex)
{
WebInspector.HeapSnapshotEdge.call(this, snapshot, edges, edgeIndex);
}

WebInspector.NativeHeapSnapshotEdge.prototype = {
clone: function()
{
return new WebInspector.NativeHeapSnapshotEdge(this._snapshot, this._edges, this.edgeIndex);
},

hasStringName: function()
{
return true;
},

isHidden: function()
{
return false;
},

isWeak: function()
{
return false;
},

isInternal: function()
{
return false;
},

isInvisible: function()
{
return false;
},

isShortcut: function()
{
return false;
},

name: function()
{
return this._snapshot._strings[this._nameOrIndex()];
},

toString: function()
{
return  "NativeHeapSnapshotEdge: " + this.name();
},

_nameOrIndex: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeNameOffset);
},

__proto__: WebInspector.HeapSnapshotEdge.prototype
};



WebInspector.NativeHeapSnapshotRetainerEdge = function(snapshot, retainedNodeIndex, retainerIndex)
{
WebInspector.HeapSnapshotRetainerEdge.call(this, snapshot, retainedNodeIndex, retainerIndex);
}

WebInspector.NativeHeapSnapshotRetainerEdge.prototype = {
clone: function()
{
return new WebInspector.NativeHeapSnapshotRetainerEdge(this._snapshot, this._retainedNodeIndex, this.retainerIndex());
},

isHidden: function()
{
return this._edge().isHidden();
},

isInternal: function()
{
return this._edge().isInternal();
},

isInvisible: function()
{
return this._edge().isInvisible();
},

isShortcut: function()
{
return this._edge().isShortcut();
},

isWeak: function()
{
return this._edge().isWeak();
},

__proto__: WebInspector.HeapSnapshotRetainerEdge.prototype
}

;



WebInspector.NativeMemorySnapshotView = function(profile)
{
WebInspector.View.call(this);
this.registerRequiredCSS("nativeMemoryProfiler.css");

this.element.addStyleClass("native-snapshot-view");
this._containmentDataGrid = new WebInspector.NativeSnapshotDataGrid(profile);
this._containmentDataGrid.show(this.element);
}

WebInspector.NativeMemorySnapshotView.prototype = {
__proto__: WebInspector.View.prototype
}



WebInspector.NativeSnapshotDataGrid = function(profile)
{
var columns = [
{id: "name", title: WebInspector.UIString("Object"), width: "200px", disclosure: true, sortable: true},
{id: "size", title: WebInspector.UIString("Size"), sortable: true, sort: WebInspector.DataGrid.Order.Descending},
];
WebInspector.DataGrid.call(this, columns);
this._profile = profile;
this._totalNode = new WebInspector.NativeSnapshotNode(profile._memoryBlock, profile);
if (WebInspector.settings.showNativeSnapshotUninstrumentedSize.get()) {
this.setRootNode(new WebInspector.DataGridNode(null, true));
this.rootNode().appendChild(this._totalNode)
this._totalNode.expand();
} else {
this.setRootNode(this._totalNode);
this._totalNode.populate();
}
this.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this.sortingChanged.bind(this), this);
}

WebInspector.NativeSnapshotDataGrid.prototype = {
sortingChanged: function()
{
var expandedNodes = {};
this._totalNode._storeState(expandedNodes);
this._totalNode.removeChildren();
this._totalNode._populated = false;
this._totalNode.populate();
this._totalNode._shouldRefreshChildren = true;
this._totalNode._restoreState(expandedNodes);
},


_sortingFunction: function(nodeA, nodeB)
{
var sortColumnIdentifier = this.sortColumnIdentifier();
var sortAscending = this.isSortOrderAscending();
var field1 = nodeA[sortColumnIdentifier];
var field2 = nodeB[sortColumnIdentifier];
var result = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
if (!sortAscending)
result = -result;
return result;
},

__proto__: WebInspector.DataGrid.prototype
}


WebInspector.NativeSnapshotNode = function(nodeData, profile)
{
this._nodeData = nodeData;
this._profile = profile;
var viewProperties = WebInspector.MemoryBlockViewProperties._forMemoryBlock(nodeData);
var data = { name: viewProperties._description, size: this._nodeData.size };
var hasChildren = this._addChildrenFromGraph();
WebInspector.DataGridNode.call(this, data, hasChildren);
}

WebInspector.NativeSnapshotNode.prototype = {

createCell: function(columnIdentifier)
{
var cell = columnIdentifier === "size" ?
this._createSizeCell(columnIdentifier) :
WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);
return cell;
},


_storeState: function(expandedNodes)
{
if (!this.expanded)
return;
expandedNodes[this.uid()] = true;
for (var i in this.children)
this.children[i]._storeState(expandedNodes);
},


_restoreState: function(expandedNodes)
{
if (!expandedNodes[this.uid()])
return;
this.expand();
for (var i in this.children)
this.children[i]._restoreState(expandedNodes);
},


uid: function()
{
if (!this._uid)
this._uid = (!this.parent || !this.parent.uid ? "" : this.parent.uid() || "") + "/" + this._nodeData.name;
return this._uid;
},


_createSizeCell: function(columnIdentifier)
{
var node = this;
var viewProperties = null;
var dimmed = false;
while (!viewProperties || viewProperties._fillStyle === "inherit") {
viewProperties = WebInspector.MemoryBlockViewProperties._forMemoryBlock(node._nodeData);
if (viewProperties._fillStyle === "inherit")
dimmed = true;
node = node.parent;
}

var sizeKB = this._nodeData.size / 1024;
var totalSize = this._profile._memoryBlock.size;
var percentage = this._nodeData.size / totalSize  * 100;

var cell = document.createElement("td");
cell.className = columnIdentifier + "-column";

var textDiv = document.createElement("div");
textDiv.textContent = Number.withThousandsSeparator(sizeKB.toFixed(0)) + "\u2009" + WebInspector.UIString("KB");
textDiv.className = "size-text";
cell.appendChild(textDiv);

var barDiv = document.createElement("div");
barDiv.className = "size-bar";
barDiv.style.width = percentage + "%";
barDiv.style.backgroundColor = viewProperties._fillStyle;

var fillerDiv = document.createElement("div");
fillerDiv.className = "percent-text"
barDiv.appendChild(fillerDiv);
var percentDiv = document.createElement("div");
percentDiv.textContent = percentage.toFixed(1) + "%";
percentDiv.className = "percent-text"
barDiv.appendChild(percentDiv);

var barHolderDiv = document.createElement("div");
if (dimmed)
barHolderDiv.className = "dimmed";
barHolderDiv.appendChild(barDiv);
cell.appendChild(barHolderDiv);

return cell;
},

populate: function() {
if (this._populated)
return;
this._populated = true;
if (this._nodeData.children)
this._addChildren();
},

_addChildren: function()
{
this._nodeData.children.sort(this.dataGrid._sortingFunction.bind(this.dataGrid));

for (var node in this._nodeData.children) {
var nodeData = this._nodeData.children[node];
if (WebInspector.settings.showNativeSnapshotUninstrumentedSize.get() || nodeData.name !== "Other")
this.appendChild(new WebInspector.NativeSnapshotNode(nodeData, this._profile));
}
},

_addChildrenFromGraph: function()
{
var memoryBlock = this._nodeData;
if (memoryBlock.children)
return memoryBlock.children.length > 0;
if (memoryBlock.name === "Image") {
this._addImageDetails();
return true;
}
return false;
},

_addImageDetails: function()
{

function didLoad(proxy)
{
function didReceiveImages(result)
{
this._nodeData.children = result;
if (this.expanded)
this._addChildren();
}
proxy.images(didReceiveImages.bind(this));

}
this._profile.load(didLoad.bind(this));
},

__proto__: WebInspector.DataGridNode.prototype
}



WebInspector.MemoryAgentDispatcher = function()
{
InspectorBackend.registerMemoryDispatcher(this);
this._currentProfileHeader = null;
}

WebInspector.MemoryAgentDispatcher.instance = function()
{
if (!WebInspector.MemoryAgentDispatcher._instance)
WebInspector.MemoryAgentDispatcher._instance = new WebInspector.MemoryAgentDispatcher();
return WebInspector.MemoryAgentDispatcher._instance;
}

WebInspector.MemoryAgentDispatcher.prototype = {

addNativeSnapshotChunk: function(chunk)
{
if (this._currentProfileHeader)
this._currentProfileHeader.addNativeSnapshotChunk(chunk);
},

_onRemoveProfileHeader: function(event)
{
if (event.data === this._currentProfileHeader)
this._currentProfileHeader = null;
}
};



WebInspector.NativeProfileTypeBase = function(profileHeaderConstructor, id, name)
{
WebInspector.ProfileType.call(this, id, name);
this._profileHeaderConstructor = profileHeaderConstructor;
this._nextProfileUid = 1;
this.addEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader,
WebInspector.MemoryAgentDispatcher.prototype._onRemoveProfileHeader,
WebInspector.MemoryAgentDispatcher.instance());
}

WebInspector.NativeProfileTypeBase.prototype = {

isInstantProfile: function()
{
return true;
},


buttonClicked: function()
{
if (WebInspector.MemoryAgentDispatcher.instance()._currentProfileHeader)
return false;

var profileHeader = new this._profileHeaderConstructor(this, WebInspector.UIString("Snapshot %d", this._nextProfileUid), this._nextProfileUid);
++this._nextProfileUid;
profileHeader.isTemporary = true;
this.addProfile(profileHeader);
WebInspector.MemoryAgentDispatcher.instance()._currentProfileHeader = profileHeader;
profileHeader.load(function() { });



function didReceiveMemorySnapshot(error, memoryBlock, graphMetaInformation)
{
console.assert(this === WebInspector.MemoryAgentDispatcher.instance()._currentProfileHeader);
WebInspector.MemoryAgentDispatcher.instance()._currentProfileHeader = null;
this._didReceiveMemorySnapshot(error, memoryBlock, graphMetaInformation);
}
MemoryAgent.getProcessMemoryDistribution(true, didReceiveMemorySnapshot.bind(profileHeader));
return false;
},


removeProfile: function(profile)
{
if (WebInspector.MemoryAgentDispatcher.instance()._currentProfileHeader === profile)
WebInspector.MemoryAgentDispatcher.instance()._currentProfileHeader = null;
WebInspector.ProfileType.prototype.removeProfile.call(this, profile);
},


createTemporaryProfile: function(title)
{
title = title || WebInspector.UIString("Snapshotting\u2026");
return new this._profileHeaderConstructor(this, title);
},


createProfile: function(profile)
{
return new this._profileHeaderConstructor(this, profile.title, -1);
},

__proto__: WebInspector.ProfileType.prototype
}


WebInspector.NativeSnapshotProfileType = function()
{
WebInspector.NativeProfileTypeBase.call(this, WebInspector.NativeSnapshotProfileHeader,  WebInspector.NativeSnapshotProfileType.TypeId, WebInspector.UIString("Take Native Heap Snapshot"));
}

WebInspector.NativeSnapshotProfileType.TypeId = "NATIVE_SNAPSHOT";

WebInspector.NativeSnapshotProfileType.prototype = {
get buttonTooltip()
{
return WebInspector.UIString("Capture native heap graph.");
},

get treeItemTitle()
{
return WebInspector.UIString("NATIVE SNAPSHOT");
},

get description()
{
return WebInspector.UIString("Native memory snapshot profiles show native heap graph.");
},

__proto__: WebInspector.NativeProfileTypeBase.prototype
}



WebInspector.NativeSnapshotProfileHeader = function(type, title, uid)
{
WebInspector.HeapProfileHeader.call(this, type, title, uid, 0);
this._strings = [];
this._nodes = [];
this._edges = [];
this._baseToRealNodeId = [];
}

WebInspector.NativeSnapshotProfileHeader.prototype = {

createView: function(profilesPanel)
{
return new WebInspector.NativeHeapSnapshotView(profilesPanel, this);
},

startSnapshotTransfer: function()
{
},

snapshotConstructorName: function()
{
return "NativeHeapSnapshot";
},

snapshotProxyConstructor: function()
{
return WebInspector.NativeHeapSnapshotProxy;
},

addNativeSnapshotChunk: function(chunk)
{
this._strings = this._strings.concat(chunk.strings);
this._nodes = this._nodes.concat(chunk.nodes);
this._edges = this._edges.concat(chunk.edges);
this._baseToRealNodeId = this._baseToRealNodeId.concat(chunk.baseToRealNodeId);
},


_didReceiveMemorySnapshot: function(error, memoryBlock, graphMetaInformation)
{
var metaInformation =   (graphMetaInformation);
this.isTemporary = false;

var edgeFieldCount = metaInformation.edge_fields.length;
var nodeFieldCount = metaInformation.node_fields.length;
var nodeIdFieldOffset = metaInformation.node_fields.indexOf("id");
var toNodeIdFieldOffset = metaInformation.edge_fields.indexOf("to_node");

var baseToRealNodeIdMap = {};
for (var i = 0; i < this._baseToRealNodeId.length; i += 2)
baseToRealNodeIdMap[this._baseToRealNodeId[i]] = this._baseToRealNodeId[i + 1];

var nodeId2NodeIndex = {};
for (var i = nodeIdFieldOffset; i < this._nodes.length; i += nodeFieldCount)
nodeId2NodeIndex[this._nodes[i]] = i - nodeIdFieldOffset;


var edges = this._edges;
for (var i = toNodeIdFieldOffset; i < edges.length; i += edgeFieldCount) {
if (edges[i] in baseToRealNodeIdMap)
edges[i] = baseToRealNodeIdMap[edges[i]];
edges[i] = nodeId2NodeIndex[edges[i]];
}

var heapSnapshot = {
"snapshot": {
"meta": metaInformation,
node_count: this._nodes.length / nodeFieldCount,
edge_count: this._edges.length / edgeFieldCount,
root_index: this._nodes.length - nodeFieldCount
},
nodes: this._nodes,
edges: this._edges,
strings: this._strings
};

var chunk = JSON.stringify(heapSnapshot);
this.transferChunk(chunk);
this.finishHeapSnapshot();
},

__proto__: WebInspector.HeapProfileHeader.prototype
}



WebInspector.NativeHeapSnapshotView = function(parent, profile)
{
this._profile = profile;
WebInspector.HeapSnapshotView.call(this, parent, profile);
}


WebInspector.NativeHeapSnapshotView.prototype = {
get profile()
{
return this._profile;
},

__proto__: WebInspector.HeapSnapshotView.prototype
};



WebInspector.NativeMemoryProfileType = function()
{
WebInspector.NativeProfileTypeBase.call(this, WebInspector.NativeMemoryProfileHeader, WebInspector.NativeMemoryProfileType.TypeId, WebInspector.UIString("Capture Native Memory Distribution"));
}

WebInspector.NativeMemoryProfileType.TypeId = "NATIVE_MEMORY_DISTRIBUTION";

WebInspector.NativeMemoryProfileType.prototype = {
get buttonTooltip()
{
return WebInspector.UIString("Capture native memory distribution.");
},

get treeItemTitle()
{
return WebInspector.UIString("MEMORY DISTRIBUTION");
},

get description()
{
return WebInspector.UIString("Native memory snapshot profiles show memory distribution among browser subsystems.");
},

__proto__: WebInspector.NativeProfileTypeBase.prototype
}


WebInspector.NativeMemoryProfileHeader = function(type, title, uid)
{
WebInspector.NativeSnapshotProfileHeader.call(this, type, title, uid);


this._memoryBlock = null;
}

WebInspector.NativeMemoryProfileHeader.prototype = {

createSidebarTreeElement: function()
{
return new WebInspector.ProfileSidebarTreeElement(this, WebInspector.UIString("Snapshot %d"), "heap-snapshot-sidebar-tree-item");
},


createView: function(profilesPanel)
{
return new WebInspector.NativeMemorySnapshotView(this);
},


_updateSnapshotStatus: function()
{
WebInspector.NativeSnapshotProfileHeader.prototype._updateSnapshotStatus.call(this);
this.sidebarElement.subtitle = Number.bytesToString(  (this._memoryBlock.size));
},


_didReceiveMemorySnapshot: function(error, memoryBlock, graphMetaInformation)
{
WebInspector.NativeSnapshotProfileHeader.prototype._didReceiveMemorySnapshot.call(this, error, memoryBlock, graphMetaInformation);
if (memoryBlock.size && memoryBlock.children) {
var knownSize = 0;
for (var i = 0; i < memoryBlock.children.length; i++) {
var size = memoryBlock.children[i].size;
if (size)
knownSize += size;
}
var otherSize = memoryBlock.size - knownSize;

if (otherSize) {
memoryBlock.children.push({
name: "Other",
size: otherSize
});
}
}
this._memoryBlock = memoryBlock;
},

__proto__: WebInspector.NativeSnapshotProfileHeader.prototype
}


WebInspector.MemoryBlockViewProperties = function(fillStyle, name, description)
{
this._fillStyle = fillStyle;
this._name = name;
this._description = description;
}


WebInspector.MemoryBlockViewProperties._standardBlocks = null;

WebInspector.MemoryBlockViewProperties._initialize = function()
{
if (WebInspector.MemoryBlockViewProperties._standardBlocks)
return;
WebInspector.MemoryBlockViewProperties._standardBlocks = {};
function addBlock(fillStyle, name, description)
{
WebInspector.MemoryBlockViewProperties._standardBlocks[name] = new WebInspector.MemoryBlockViewProperties(fillStyle, name, WebInspector.UIString(description));
}
addBlock("hsl(  0,  0%,  60%)", "ProcessPrivateMemory", "Total");
addBlock("hsl(  0,  0%,  80%)", "OwnersTypePlaceholder", "OwnersTypePlaceholder");
addBlock("hsl(  0,  0%,  60%)", "Other", "Other");
addBlock("hsl(220, 80%,  70%)", "Image", "Images");
addBlock("hsl(100, 60%,  50%)", "JSHeap", "JavaScript heap");
addBlock("hsl( 90, 40%,  80%)", "JSExternalResources", "JavaScript external resources");
addBlock("hsl( 90, 60%,  80%)", "CSS", "CSS");
addBlock("hsl(  0, 50%,  60%)", "DOM", "DOM");
addBlock("hsl(  0, 80%,  60%)", "WebInspector", "Inspector data");
addBlock("hsl( 36, 90%,  50%)", "Resources", "Resources");
addBlock("hsl( 40, 80%,  80%)", "GlyphCache", "Glyph cache resources");
addBlock("hsl( 35, 80%,  80%)", "DOMStorageCache", "DOM storage cache");
addBlock("hsl( 60, 80%,  60%)", "RenderTree", "Render tree");
addBlock("hsl( 20, 80%,  50%)", "MallocWaste", "Memory allocator waste");
}

WebInspector.MemoryBlockViewProperties._forMemoryBlock = function(memoryBlock)
{
WebInspector.MemoryBlockViewProperties._initialize();
var result = WebInspector.MemoryBlockViewProperties._standardBlocks[memoryBlock.name];
if (result)
return result;
return new WebInspector.MemoryBlockViewProperties("inherit", memoryBlock.name, memoryBlock.name);
}

;



WebInspector.ProfileLauncherView = function(profilesPanel)
{
WebInspector.View.call(this);

this._panel = profilesPanel;

this.element.addStyleClass("profile-launcher-view");
this.element.addStyleClass("panel-enabler-view");

this._contentElement = this.element.createChild("div", "profile-launcher-view-content");
this._innerContentElement = this._contentElement.createChild("div");

this._controlButton = this._contentElement.createChild("button", "control-profiling");
this._controlButton.addEventListener("click", this._controlButtonClicked.bind(this), false);
}

WebInspector.ProfileLauncherView.prototype = {

addProfileType: function(profileType)
{
var descriptionElement = this._innerContentElement.createChild("h1");
descriptionElement.textContent = profileType.description;
var decorationElement = profileType.decorationElement();
if (decorationElement)
this._innerContentElement.appendChild(decorationElement);
this._isInstantProfile = profileType.isInstantProfile();
},

_controlButtonClicked: function()
{
this._panel.toggleRecordButton();
},

_updateControls: function()
{
if (this._isInstantProfile) {
this._controlButton.removeStyleClass("running");
this._controlButton.textContent = WebInspector.UIString("Take Snapshot");
} else if (this._isProfiling) {
this._controlButton.addStyleClass("running");
this._controlButton.textContent = WebInspector.UIString("Stop");
} else {
this._controlButton.removeStyleClass("running");
this._controlButton.textContent = WebInspector.UIString("Start");
}
},

profileStarted: function()
{
this._isProfiling = true;
this._updateControls();
},

profileFinished: function()
{
this._isProfiling = false;
this._updateControls();
},

__proto__: WebInspector.View.prototype
}



WebInspector.MultiProfileLauncherView = function(profilesPanel)
{
WebInspector.ProfileLauncherView.call(this, profilesPanel);

var header = this._innerContentElement.createChild("h1");
header.textContent = WebInspector.UIString("Select profiling type");

this._profileTypeSelectorForm = this._innerContentElement.createChild("form");

this._innerContentElement.createChild("div", "flexible-space");
}

WebInspector.MultiProfileLauncherView.EventTypes = {
ProfileTypeSelected: "profile-type-selected"
}

WebInspector.MultiProfileLauncherView.prototype = {

addProfileType: function(profileType)
{
var checked = !this._profileTypeSelectorForm.children.length;
var labelElement = this._profileTypeSelectorForm.createChild("label");
labelElement.textContent = profileType.name;
var optionElement = document.createElement("input");
labelElement.insertBefore(optionElement, labelElement.firstChild);
optionElement.type = "radio";
optionElement.name = "profile-type";
optionElement.style.hidden = true;
if (checked) {
optionElement.checked = checked;
this.dispatchEventToListeners(WebInspector.MultiProfileLauncherView.EventTypes.ProfileTypeSelected, profileType);
}
optionElement.addEventListener("change", this._profileTypeChanged.bind(this, profileType), false);
var descriptionElement = labelElement.createChild("p");
descriptionElement.textContent = profileType.description;
var decorationElement = profileType.decorationElement();
if (decorationElement)
labelElement.appendChild(decorationElement);
},

_controlButtonClicked: function()
{
this._panel.toggleRecordButton();
},

_updateControls: function()
{
WebInspector.ProfileLauncherView.prototype._updateControls.call(this);
var items = this._profileTypeSelectorForm.elements;
for (var i = 0; i < items.length; ++i) {
if (items[i].type === "radio")
items[i].disabled = this._isProfiling;
}
},


_profileTypeChanged: function(profileType, event)
{
this.dispatchEventToListeners(WebInspector.MultiProfileLauncherView.EventTypes.ProfileTypeSelected, profileType);
this._isInstantProfile = profileType.isInstantProfile();
this._updateControls();
},

profileStarted: function()
{
this._isProfiling = true;
this._updateControls();
},

profileFinished: function()
{
this._isProfiling = false;
this._updateControls();
},

__proto__: WebInspector.ProfileLauncherView.prototype
}

;



WebInspector.TopDownProfileDataGridNode = function(profileNode, owningTree)
{
var hasChildren = !!(profileNode.children && profileNode.children.length);

WebInspector.ProfileDataGridNode.call(this, profileNode, owningTree, hasChildren);

this._remainingChildren = profileNode.children;
}

WebInspector.TopDownProfileDataGridNode.prototype = {
_sharedPopulate: function()
{
var children = this._remainingChildren;
var childrenLength = children.length;

for (var i = 0; i < childrenLength; ++i)
this.appendChild(new WebInspector.TopDownProfileDataGridNode(children[i], this.tree));

this._remainingChildren = null;
},

_exclude: function(aCallUID)
{
if (this._remainingChildren)
this.populate();

this._save();

var children = this.children;
var index = this.children.length;

while (index--)
children[index]._exclude(aCallUID);

var child = this.childrenByCallUID[aCallUID];

if (child)
this._merge(child, true);
},

__proto__: WebInspector.ProfileDataGridNode.prototype
}


WebInspector.TopDownProfileDataGridTree = function(profileView, rootProfileNode)
{
WebInspector.ProfileDataGridTree.call(this, profileView, rootProfileNode);

this._remainingChildren = rootProfileNode.children;

var any =  (this);
var node =  (any);
WebInspector.TopDownProfileDataGridNode.prototype.populate.call(node);
}

WebInspector.TopDownProfileDataGridTree.prototype = {

focus: function(profileDataGridNode)
{
if (!profileDataGridNode)
return;

this._save();
profileDataGridNode.savePosition();

this.children = [profileDataGridNode];
this.totalTime = profileDataGridNode.totalTime;
},


exclude: function(profileDataGridNode)
{
if (!profileDataGridNode)
return;

this._save();

var excludedCallUID = profileDataGridNode.callUID;

var any =  (this);
var node =  (any);
WebInspector.TopDownProfileDataGridNode.prototype._exclude.call(node, excludedCallUID);

if (this.lastComparator)
this.sort(this.lastComparator, true);
},

restore: function()
{
if (!this._savedChildren)
return;

this.children[0].restorePosition();

WebInspector.ProfileDataGridTree.prototype.restore.call(this);
},

_merge: WebInspector.TopDownProfileDataGridNode.prototype._merge,

_sharedPopulate: WebInspector.TopDownProfileDataGridNode.prototype._sharedPopulate,

__proto__: WebInspector.ProfileDataGridTree.prototype
}
;



WebInspector.CanvasProfileView = function(profile)
{
WebInspector.View.call(this);
this.registerRequiredCSS("canvasProfiler.css");
this._profile = profile;
this._traceLogId = profile.traceLogId();
this.element.addStyleClass("canvas-profile-view");

this._linkifier = new WebInspector.Linkifier();
this._splitView = new WebInspector.SplitView(false, "canvasProfileViewSplitLocation", 300);

var replayImageContainer = this._splitView.firstElement();
replayImageContainer.id = "canvas-replay-image-container";
this._replayImageElement = replayImageContainer.createChild("image", "canvas-replay-image");
this._debugInfoElement = replayImageContainer.createChild("div", "canvas-debug-info hidden");
this._spinnerIcon = replayImageContainer.createChild("img", "canvas-spinner-icon hidden");

var replayInfoContainer = this._splitView.secondElement();
var controlsContainer = replayInfoContainer.createChild("div", "status-bar");
var logGridContainer = replayInfoContainer.createChild("div", "canvas-replay-log");

this._createControlButton(controlsContainer, "canvas-replay-first-step", WebInspector.UIString("First call."), this._onReplayFirstStepClick.bind(this));
this._createControlButton(controlsContainer, "canvas-replay-prev-step", WebInspector.UIString("Previous call."), this._onReplayStepClick.bind(this, false));
this._createControlButton(controlsContainer, "canvas-replay-next-step", WebInspector.UIString("Next call."), this._onReplayStepClick.bind(this, true));
this._createControlButton(controlsContainer, "canvas-replay-prev-draw", WebInspector.UIString("Previous drawing call."), this._onReplayDrawingCallClick.bind(this, false));
this._createControlButton(controlsContainer, "canvas-replay-next-draw", WebInspector.UIString("Next drawing call."), this._onReplayDrawingCallClick.bind(this, true));
this._createControlButton(controlsContainer, "canvas-replay-last-step", WebInspector.UIString("Last call."), this._onReplayLastStepClick.bind(this));

this._replayContextSelector = new WebInspector.StatusBarComboBox(this._onReplayContextChanged.bind(this));
this._replayContextSelector.createOption("<screenshot auto>", WebInspector.UIString("Show screenshot of the last replayed resource."), "");
controlsContainer.appendChild(this._replayContextSelector.element);


this._replayContexts = {};

this._currentResourceStates = {};

var columns = [
{title: "#", sortable: true, width: "5%"},
{title: WebInspector.UIString("Call"), sortable: true, width: "75%", disclosure: true},
{title: WebInspector.UIString("Location"), sortable: true, width: "20%"}
];

this._logGrid = new WebInspector.DataGrid(columns);
this._logGrid.element.addStyleClass("fill");
this._logGrid.show(logGridContainer);
this._logGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._replayTraceLog.bind(this));

this._splitView.show(this.element);
this._requestTraceLog(0);
}


WebInspector.CanvasProfileView.TraceLogPollingInterval = 500;

WebInspector.CanvasProfileView.prototype = {
dispose: function()
{
this._linkifier.reset();
},

get statusBarItems()
{
return [];
},

get profile()
{
return this._profile;
},


elementsToRestoreScrollPositionsFor: function()
{
return [this._logGrid.scrollContainer];
},


_createControlButton: function(parent, className, title, clickCallback)
{
var button = new WebInspector.StatusBarButton(title, className);
button.element.addEventListener("click", clickCallback, false);
parent.appendChild(button.element);
},

_onReplayContextChanged: function()
{

function didReceiveResourceState(error, resourceState)
{
this._enableWaitIcon(false);
if (error)
return;

this._currentResourceStates[resourceState.id] = resourceState;

var selectedContextId = this._replayContextSelector.selectedOption().value;
if (selectedContextId === resourceState.id)
this._replayImageElement.src = resourceState.imageURL;
}

var selectedContextId = this._replayContextSelector.selectedOption().value || "auto";
var resourceState = this._currentResourceStates[selectedContextId];
if (resourceState)
this._replayImageElement.src = resourceState.imageURL;
else {
this._enableWaitIcon(true);
this._replayImageElement.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="; 
CanvasAgent.getResourceState(this._traceLogId, selectedContextId, didReceiveResourceState.bind(this));
}
},


_onReplayStepClick: function(forward)
{
var selectedNode = this._logGrid.selectedNode;
if (!selectedNode)
return;
var nextNode = forward ? selectedNode.traverseNextNode(false) : selectedNode.traversePreviousNode(false);
(nextNode || selectedNode).revealAndSelect();
},


_onReplayDrawingCallClick: function(forward)
{
var selectedNode = this._logGrid.selectedNode;
if (!selectedNode)
return;
var nextNode = selectedNode;
while (nextNode) {
var sibling = forward ? nextNode.nextSibling : nextNode.previousSibling;
if (sibling) {
nextNode = sibling;
if (nextNode.hasChildren || nextNode.call.isDrawingCall)
break;
} else {
nextNode = nextNode.parent;
if (!forward)
break;
}
}
if (!nextNode && forward)
this._onReplayLastStepClick();
else
(nextNode || selectedNode).revealAndSelect();
},

_onReplayFirstStepClick: function()
{
var firstNode = this._logGrid.rootNode().children[0];
if (firstNode)
firstNode.revealAndSelect();
},

_onReplayLastStepClick: function()
{
var lastNode = this._logGrid.rootNode().children.peekLast();
if (!lastNode)
return;
while (lastNode.expanded) {
var lastChild = lastNode.children.peekLast();
if (!lastChild)
break;
lastNode = lastChild;
}
lastNode.revealAndSelect();
},


_enableWaitIcon: function(enable)
{
this._spinnerIcon.enableStyleClass("hidden", !enable);
this._debugInfoElement.enableStyleClass("hidden", enable);
},

_replayTraceLog: function()
{
if (this._pendingReplayTraceLogEvent)
return;
var index = this._selectedCallIndex();
if (index === -1 || index === this._lastReplayCallIndex)
return;
this._lastReplayCallIndex = index;
this._pendingReplayTraceLogEvent = true;
var time = Date.now();

function didReplayTraceLog(error, resourceState)
{
delete this._pendingReplayTraceLogEvent;

if (index !== this._selectedCallIndex()) {
this._replayTraceLog();
return;
}

this._enableWaitIcon(false);
if (error)
return;

this._currentResourceStates = {};
this._currentResourceStates["auto"] = resourceState;
this._currentResourceStates[resourceState.id] = resourceState;

this._debugInfoElement.textContent = "Replay time: " + (Date.now() - time) + "ms";
this._onReplayContextChanged();
}
this._enableWaitIcon(true);
CanvasAgent.replayTraceLog(this._traceLogId, index, didReplayTraceLog.bind(this));
},


_didReceiveTraceLog: function(error, traceLog)
{
this._enableWaitIcon(false);
if (error || !traceLog)
return;
var callNodes = [];
var calls = traceLog.calls;
var index = traceLog.startOffset;
for (var i = 0, n = calls.length; i < n; ++i) {
var call = calls[i];
this._requestReplayContextInfo(call.contextId);
var gridNode = this._createCallNode(index++, call);
callNodes.push(gridNode);
}
this._appendCallNodes(callNodes);
if (traceLog.alive)
setTimeout(this._requestTraceLog.bind(this, index), WebInspector.CanvasProfileView.TraceLogPollingInterval);
else
this._flattenSingleFrameNode();
this._profile._updateCapturingStatus(traceLog);
this._onReplayLastStepClick(); 
},


_requestTraceLog: function(offset)
{
this._enableWaitIcon(true);
CanvasAgent.getTraceLog(this._traceLogId, offset, undefined, this._didReceiveTraceLog.bind(this));
},


_requestReplayContextInfo: function(contextId)
{
if (this._replayContexts[contextId])
return;
this._replayContexts[contextId] = true;

function didReceiveResourceInfo(error, resourceInfo)
{
if (error) {
delete this._replayContexts[contextId];
return;
}
this._replayContextSelector.createOption(resourceInfo.description, WebInspector.UIString("Show screenshot of this context's canvas."), contextId);
}
CanvasAgent.getResourceInfo(contextId, didReceiveResourceInfo.bind(this));
},


_selectedCallIndex: function()
{
var node = this._logGrid.selectedNode;
return node ? this._peekLastRecursively(node).index : -1;
},


_peekLastRecursively: function(node)
{
var lastChild;
while ((lastChild = node.children.peekLast()))
node =   (lastChild);
return node;
},


_appendCallNodes: function(callNodes)
{
var rootNode = this._logGrid.rootNode();
var frameNode =   (rootNode.children.peekLast());
if (frameNode && this._peekLastRecursively(frameNode).call.isFrameEndCall)
frameNode = null;
for (var i = 0, n = callNodes.length; i < n; ++i) {
if (!frameNode) {
var index = rootNode.children.length;
var data = {};
data[0] = "";
data[1] = "Frame #" + (index + 1);
data[2] = "";
frameNode = new WebInspector.DataGridNode(data);
frameNode.selectable = true;
rootNode.appendChild(frameNode);
}
var nextFrameCallIndex = i + 1;
while (nextFrameCallIndex < n && !callNodes[nextFrameCallIndex - 1].call.isFrameEndCall)
++nextFrameCallIndex;
this._appendCallNodesToFrameNode(frameNode, callNodes, i, nextFrameCallIndex);
i = nextFrameCallIndex - 1;
frameNode = null;
}
},


_appendCallNodesToFrameNode: function(frameNode, callNodes, fromIndex, toIndex)
{
var self = this;
function appendDrawCallGroup()
{
var index = self._drawCallGroupsCount || 0;
var data = {};
data[0] = "";
data[1] = "Draw call group #" + (index + 1);
data[2] = "";
var node = new WebInspector.DataGridNode(data);
node.selectable = true;
self._drawCallGroupsCount = index + 1;
frameNode.appendChild(node);
return node;
}

function splitDrawCallGroup(drawCallGroup)
{
var splitIndex = 0;
var splitNode;
while ((splitNode = drawCallGroup.children[splitIndex])) {
if (splitNode.call.isDrawingCall)
break;
++splitIndex;
}
var newDrawCallGroup = appendDrawCallGroup();
var lastNode;
while ((lastNode = drawCallGroup.children[splitIndex + 1]))
newDrawCallGroup.appendChild(lastNode);
return newDrawCallGroup;
}

var drawCallGroup = frameNode.children.peekLast();
var groupHasDrawCall = false;
if (drawCallGroup) {
for (var i = 0, n = drawCallGroup.children.length; i < n; ++i) {
if (drawCallGroup.children[i].call.isDrawingCall) {
groupHasDrawCall = true;
break;
}
}
} else
drawCallGroup = appendDrawCallGroup();

for (var i = fromIndex; i < toIndex; ++i) {
var node = callNodes[i];
drawCallGroup.appendChild(node);
if (node.call.isDrawingCall) {
if (groupHasDrawCall)
drawCallGroup = splitDrawCallGroup(drawCallGroup);
else
groupHasDrawCall = true;
}
}
},


_createCallNode: function(index, call)
{
var data = {};
data[0] = index + 1;
data[1] = call.functionName || "context." + call.property;
data[2] = "";
if (call.sourceURL) {

var lineNumber = Math.max(0, call.lineNumber - 1) || 0;
var columnNumber = Math.max(0, call.columnNumber - 1) || 0;
data[2] = this._linkifier.linkifyLocation(call.sourceURL, lineNumber, columnNumber);
}

if (call.arguments) {
var args = call.arguments.map(function(argument) {
return argument.description;
});
data[1] += "(" + args.join(", ") + ")";
} else
data[1] += " = " + call.value.description;

if (typeof call.result !== "undefined")
data[1] += " => " + call.result.description;

var node = new WebInspector.DataGridNode(data);
node.index = index;
node.selectable = true;
node.call = call;
return node;
},

_flattenSingleFrameNode: function()
{
var rootNode = this._logGrid.rootNode();
if (rootNode.children.length !== 1)
return;
var frameNode = rootNode.children[0];
while (frameNode.children[0])
rootNode.appendChild(frameNode.children[0]);
rootNode.removeChild(frameNode);
},

__proto__: WebInspector.View.prototype
}


WebInspector.CanvasProfileType = function()
{
WebInspector.ProfileType.call(this, WebInspector.CanvasProfileType.TypeId, WebInspector.UIString("Capture Canvas Frame"));
this._nextProfileUid = 1;
this._recording = false;
this._lastProfileHeader = null;

this._capturingModeSelector = new WebInspector.StatusBarComboBox(this._dispatchViewUpdatedEvent.bind(this));
this._capturingModeSelector.element.title = WebInspector.UIString("Canvas capture mode.");
this._capturingModeSelector.createOption(WebInspector.UIString("Single Frame"), WebInspector.UIString("Capture a single canvas frame."), "");
this._capturingModeSelector.createOption(WebInspector.UIString("Consecutive Frames"), WebInspector.UIString("Capture consecutive canvas frames."), "1");


this._frameOptions = {};


this._framesWithCanvases = {};

this._frameSelector = new WebInspector.StatusBarComboBox(this._dispatchViewUpdatedEvent.bind(this));
this._frameSelector.element.title = WebInspector.UIString("Frame containing the canvases to capture.");
this._frameSelector.element.addStyleClass("hidden");
WebInspector.runtimeModel.contextLists().forEach(this._addFrame, this);
WebInspector.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.FrameExecutionContextListAdded, this._frameAdded, this);
WebInspector.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.FrameExecutionContextListRemoved, this._frameRemoved, this);

this._decorationElement = document.createElement("div");
this._decorationElement.addStyleClass("profile-canvas-decoration");
this._decorationElement.addStyleClass("hidden");
this._decorationElement.textContent = WebInspector.UIString("There is an uninstrumented canvas on the page. Reload the page to instrument it.");
var reloadPageButton = this._decorationElement.createChild("button");
reloadPageButton.type = "button";
reloadPageButton.textContent = WebInspector.UIString("Reload");
reloadPageButton.addEventListener("click", this._onReloadPageButtonClick.bind(this), false);

this._dispatcher = new WebInspector.CanvasDispatcher(this);


CanvasAgent.enable(this._updateDecorationElement.bind(this));
WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._updateDecorationElement, this);
}

WebInspector.CanvasProfileType.TypeId = "CANVAS_PROFILE";

WebInspector.CanvasProfileType.prototype = {
get statusBarItems()
{
return [this._capturingModeSelector.element, this._frameSelector.element];
},

get buttonTooltip()
{
if (this._isSingleFrameMode())
return WebInspector.UIString("Capture next canvas frame.");
else
return this._recording ? WebInspector.UIString("Stop capturing canvas frames.") : WebInspector.UIString("Start capturing canvas frames.");
},


buttonClicked: function()
{
if (this._recording) {
this._recording = false;
this._stopFrameCapturing();
} else if (this._isSingleFrameMode()) {
this._recording = false;
this._runSingleFrameCapturing();
} else {
this._recording = true;
this._startFrameCapturing();
}
return this._recording;
},

_runSingleFrameCapturing: function()
{
var frameId = this._selectedFrameId();
CanvasAgent.captureFrame(frameId, this._didStartCapturingFrame.bind(this, frameId));
},

_startFrameCapturing: function()
{
var frameId = this._selectedFrameId();
CanvasAgent.startCapturing(frameId, this._didStartCapturingFrame.bind(this, frameId));
},

_stopFrameCapturing: function()
{
if (!this._lastProfileHeader)
return;
var profileHeader = this._lastProfileHeader;
var traceLogId = profileHeader.traceLogId();
this._lastProfileHeader = null;
function didStopCapturing()
{
profileHeader._updateCapturingStatus();
}
CanvasAgent.stopCapturing(traceLogId, didStopCapturing.bind(this));
},


_didStartCapturingFrame: function(frameId, error, traceLogId)
{
if (error || this._lastProfileHeader && this._lastProfileHeader.traceLogId() === traceLogId)
return;
var profileHeader = new WebInspector.CanvasProfileHeader(this, WebInspector.UIString("Trace Log %d", this._nextProfileUid), this._nextProfileUid, traceLogId, frameId);
++this._nextProfileUid;
this._lastProfileHeader = profileHeader;
this.addProfile(profileHeader);
profileHeader._updateCapturingStatus();
},

get treeItemTitle()
{
return WebInspector.UIString("CANVAS PROFILE");
},

get description()
{
return WebInspector.UIString("Canvas calls instrumentation");
},


decorationElement: function()
{
return this._decorationElement;
},


_reset: function()
{
WebInspector.ProfileType.prototype._reset.call(this);
this._nextProfileUid = 1;
},


removeProfile: function(profile)
{
WebInspector.ProfileType.prototype.removeProfile.call(this, profile);
if (this._recording && profile === this._lastProfileHeader)
this._recording = false;
},

setRecordingProfile: function(isProfiling)
{
this._recording = isProfiling;
},


createTemporaryProfile: function(title)
{
title = title || WebInspector.UIString("Capturing\u2026");
return new WebInspector.CanvasProfileHeader(this, title);
},


createProfile: function(profile)
{
return new WebInspector.CanvasProfileHeader(this, profile.title, -1);
},

_updateDecorationElement: function()
{

function callback(error, result)
{
var hideWarning = (error || !result);
this._decorationElement.enableStyleClass("hidden", hideWarning);
}
CanvasAgent.hasUninstrumentedCanvases(callback.bind(this));
},


_onReloadPageButtonClick: function(event)
{
PageAgent.reload(event.shiftKey);
},


_isSingleFrameMode: function()
{
return !this._capturingModeSelector.selectedOption().value;
},


_frameAdded: function(event)
{
var contextList =   (event.data);
this._addFrame(contextList);
},


_addFrame: function(contextList)
{
var frameId = contextList.frameId;
var option = document.createElement("option");
option.text = contextList.displayName;
option.title = contextList.url;
option.value = frameId;

this._frameOptions[frameId] = option;

if (this._framesWithCanvases[frameId]) {
this._frameSelector.addOption(option);
this._dispatchViewUpdatedEvent();
}
},


_frameRemoved: function(event)
{
var contextList =   (event.data);
var frameId = contextList.frameId;
var option = this._frameOptions[frameId];
if (option && this._framesWithCanvases[frameId]) {
this._frameSelector.removeOption(option);
this._dispatchViewUpdatedEvent();
}
delete this._frameOptions[frameId];
delete this._framesWithCanvases[frameId];
},


_contextCreated: function(frameId)
{
if (this._framesWithCanvases[frameId])
return;
this._framesWithCanvases[frameId] = true;
var option = this._frameOptions[frameId];
if (option) {
this._frameSelector.addOption(option);
this._dispatchViewUpdatedEvent();
}
},


_traceLogsRemoved: function(frameId, traceLogId)
{
var sidebarElementsToDelete = [];
var sidebarElements =   ((this.treeElement && this.treeElement.children) || []);
for (var i = 0, n = sidebarElements.length; i < n; ++i) {
var header =   (sidebarElements[i].profile);
if (!header)
continue;
if (frameId && frameId !== header.frameId())
continue;
if (traceLogId && traceLogId !== header.traceLogId())
continue;
sidebarElementsToDelete.push(sidebarElements[i]);
}
for (var i = 0, n = sidebarElementsToDelete.length; i < n; ++i)
sidebarElementsToDelete[i].ondelete();
},


_selectedFrameId: function()
{
var option = this._frameSelector.selectedOption();
return option ? option.value : undefined;
},

_dispatchViewUpdatedEvent: function()
{
this._frameSelector.element.enableStyleClass("hidden", this._frameSelector.size() <= 1);
this.dispatchEventToListeners(WebInspector.ProfileType.Events.ViewUpdated);
},

__proto__: WebInspector.ProfileType.prototype
}


WebInspector.CanvasDispatcher = function(profileType)
{
this._profileType = profileType;
InspectorBackend.registerCanvasDispatcher(this);
}

WebInspector.CanvasDispatcher.prototype = {

contextCreated: function(frameId)
{
this._profileType._contextCreated(frameId);
},


traceLogsRemoved: function(frameId, traceLogId)
{
this._profileType._traceLogsRemoved(frameId, traceLogId);
}
}


WebInspector.CanvasProfileHeader = function(type, title, uid, traceLogId, frameId)
{
WebInspector.ProfileHeader.call(this, type, title, uid);

this._traceLogId = traceLogId || "";
this._frameId = frameId;
this._alive = true;
this._traceLogSize = 0;
}

WebInspector.CanvasProfileHeader.prototype = {

traceLogId: function()
{
return this._traceLogId;
},


frameId: function()
{
return this._frameId;
},


createSidebarTreeElement: function()
{
return new WebInspector.ProfileSidebarTreeElement(this, WebInspector.UIString("Trace Log %d"), "profile-sidebar-tree-item");
},


createView: function(profilesPanel)
{
return new WebInspector.CanvasProfileView(this);
},


dispose: function()
{
if (this._traceLogId) {
CanvasAgent.dropTraceLog(this._traceLogId);
clearTimeout(this._requestStatusTimer);
this._alive = false;
}
},


_updateCapturingStatus: function(traceLog)
{
if (!this.sidebarElement || !this._traceLogId)
return;

if (traceLog) {
this._alive = traceLog.alive;
this._traceLogSize = traceLog.totalAvailableCalls;
}

this.sidebarElement.subtitle = this._alive ? WebInspector.UIString("Capturing\u2026 %d calls", this._traceLogSize) : WebInspector.UIString("Captured %d calls", this._traceLogSize);
this.sidebarElement.wait = this._alive;

if (this._alive) {
clearTimeout(this._requestStatusTimer);
this._requestStatusTimer = setTimeout(this._requestCapturingStatus.bind(this), WebInspector.CanvasProfileView.TraceLogPollingInterval);
}
},

_requestCapturingStatus: function()
{

function didReceiveTraceLog(error, traceLog)
{
if (error)
return;
this._alive = traceLog.alive;
this._traceLogSize = traceLog.totalAvailableCalls;
this._updateCapturingStatus();
}
CanvasAgent.getTraceLog(this._traceLogId, 0, 0, didReceiveTraceLog.bind(this));
},

__proto__: WebInspector.ProfileHeader.prototype
}
;
