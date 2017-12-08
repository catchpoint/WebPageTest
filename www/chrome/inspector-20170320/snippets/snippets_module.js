Snippets.SnippetStorage=class extends Common.Object{constructor(settingPrefix,namePrefix){super();this._snippets=new Map();this._lastSnippetIdentifierSetting=Common.settings.createSetting(settingPrefix+'Snippets_lastIdentifier',0);this._snippetsSetting=Common.settings.createSetting(settingPrefix+'Snippets',[]);this._namePrefix=namePrefix;this._loadSettings();}
get namePrefix(){return this._namePrefix;}
_saveSettings(){var savedSnippets=[];for(var snippet of this._snippets.values())
savedSnippets.push(snippet.serializeToObject());this._snippetsSetting.set(savedSnippets);}
snippets(){return this._snippets.valuesArray();}
snippetForId(id){return this._snippets.get(id);}
snippetForName(name){for(var snippet of this._snippets.values()){if(snippet.name===name)
return snippet;}
return null;}
_loadSettings(){var savedSnippets=this._snippetsSetting.get();for(var i=0;i<savedSnippets.length;++i)
this._snippetAdded(Snippets.Snippet.fromObject(this,savedSnippets[i]));}
deleteSnippet(snippet){this._snippets.delete(snippet.id);this._saveSettings();}
createSnippet(){var nextId=this._lastSnippetIdentifierSetting.get()+1;var snippetId=String(nextId);this._lastSnippetIdentifierSetting.set(nextId);var snippet=new Snippets.Snippet(this,snippetId);this._snippetAdded(snippet);this._saveSettings();return snippet;}
_snippetAdded(snippet){this._snippets.set(snippet.id,snippet);}};Snippets.Snippet=class extends Common.Object{constructor(storage,id,name,content){super();this._storage=storage;this._id=id;this._name=name||storage.namePrefix+id;this._content=content||'';}
static fromObject(storage,serializedSnippet){return new Snippets.Snippet(storage,serializedSnippet.id,serializedSnippet.name,serializedSnippet.content);}
get id(){return this._id;}
get name(){return this._name;}
set name(name){if(this._name===name)
return;this._name=name;this._storage._saveSettings();}
get content(){return this._content;}
set content(content){if(this._content===content)
return;this._content=content;this._storage._saveSettings();}
serializeToObject(){var serializedSnippet={};serializedSnippet.id=this.id;serializedSnippet.name=this.name;serializedSnippet.content=this.content;return serializedSnippet;}};;Snippets.ScriptSnippetModel=class extends Common.Object{constructor(workspace){super();this._workspace=workspace;this._uiSourceCodeForSnippetId={};this._snippetIdForUISourceCode=new Map();this._mappingForDebuggerModel=new Map();this._snippetStorage=new Snippets.SnippetStorage('script','Script snippet #');this._lastSnippetEvaluationIndexSetting=Common.settings.createSetting('lastSnippetEvaluationIndex',0);this._project=new Snippets.SnippetsProject(workspace,this);this._loadSnippets();SDK.targetManager.observeModels(SDK.DebuggerModel,this);}
modelAdded(debuggerModel){this._mappingForDebuggerModel.set(debuggerModel,new Snippets.SnippetScriptMapping(debuggerModel,this));}
modelRemoved(debuggerModel){this._mappingForDebuggerModel.remove(debuggerModel);}
snippetScriptMapping(debuggerModel){return this._mappingForDebuggerModel.get(debuggerModel);}
project(){return this._project;}
_loadSnippets(){for(var snippet of this._snippetStorage.snippets())
this._addScriptSnippet(snippet);}
createScriptSnippet(content){var snippet=this._snippetStorage.createSnippet();snippet.content=content;return this._addScriptSnippet(snippet);}
_addScriptSnippet(snippet){var uiSourceCode=this._project.addSnippet(snippet.name,new Snippets.SnippetContentProvider(snippet));uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._snippetIdForUISourceCode.set(uiSourceCode,snippet.id);var breakpointLocations=this._removeBreakpoints(uiSourceCode);this._restoreBreakpoints(uiSourceCode,breakpointLocations);this._uiSourceCodeForSnippetId[snippet.id]=uiSourceCode;return uiSourceCode;}
_workingCopyChanged(event){var uiSourceCode=(event.data);this._scriptSnippetEdited(uiSourceCode);}
deleteScriptSnippet(uiSourceCode){var snippetId=this._snippetIdForUISourceCode.get(uiSourceCode)||'';var snippet=this._snippetStorage.snippetForId(snippetId);if(!snippet)
return;this._snippetStorage.deleteSnippet(snippet);this._removeBreakpoints(uiSourceCode);this._releaseSnippetScript(uiSourceCode);delete this._uiSourceCodeForSnippetId[snippet.id];this._snippetIdForUISourceCode.remove(uiSourceCode);this._project.removeFile(snippet.name);}
renameScriptSnippet(name,newName,callback){newName=newName.trim();if(!newName||newName.indexOf('/')!==-1||name===newName||this._snippetStorage.snippetForName(newName)){callback(false);return;}
var snippet=this._snippetStorage.snippetForName(name);console.assert(snippet,'Snippet \''+name+'\' was not found.');var uiSourceCode=this._uiSourceCodeForSnippetId[snippet.id];console.assert(uiSourceCode,'No uiSourceCode was found for snippet \''+name+'\'.');var breakpointLocations=this._removeBreakpoints(uiSourceCode);snippet.name=newName;this._restoreBreakpoints(uiSourceCode,breakpointLocations);callback(true,newName);}
_setScriptSnippetContent(name,newContent){var snippet=this._snippetStorage.snippetForName(name);snippet.content=newContent;}
_scriptSnippetEdited(uiSourceCode){var breakpointLocations=this._removeBreakpoints(uiSourceCode);this._releaseSnippetScript(uiSourceCode);this._restoreBreakpoints(uiSourceCode,breakpointLocations);this._mappingForDebuggerModel.valuesArray().forEach(function(mapping){mapping._restoreBreakpoints(uiSourceCode,breakpointLocations);});}
_nextEvaluationIndex(){var evaluationIndex=this._lastSnippetEvaluationIndexSetting.get()+1;this._lastSnippetEvaluationIndexSetting.set(evaluationIndex);return evaluationIndex;}
evaluateScriptSnippet(executionContext,uiSourceCode){console.assert(uiSourceCode.project().type()===Workspace.projectTypes.Snippets);var breakpointLocations=this._removeBreakpoints(uiSourceCode);this._releaseSnippetScript(uiSourceCode);this._restoreBreakpoints(uiSourceCode,breakpointLocations);var runtimeModel=executionContext.runtimeModel;var debuggerModel=executionContext.debuggerModel;var evaluationIndex=this._nextEvaluationIndex();var mapping=this._mappingForDebuggerModel.get(debuggerModel);mapping._setEvaluationIndex(evaluationIndex,uiSourceCode);var evaluationUrl=mapping._evaluationSourceURL(uiSourceCode);uiSourceCode.requestContent().then(compileSnippet.bind(this));function compileSnippet(){var expression=uiSourceCode.workingCopy();Common.console.show();runtimeModel.compileScript(expression,'',true,executionContext.id,compileCallback.bind(this));}
function compileCallback(scriptId,exceptionDetails){if(mapping.evaluationIndex(uiSourceCode)!==evaluationIndex)
return;var script=(debuggerModel.scriptForId((scriptId||exceptionDetails.scriptId)));mapping._addScript(script,uiSourceCode);if(!scriptId){this._printRunOrCompileScriptResultFailure(runtimeModel,(exceptionDetails),evaluationUrl);return;}
var breakpointLocations=this._removeBreakpoints(uiSourceCode);this._restoreBreakpoints(uiSourceCode,breakpointLocations);this._runScript(scriptId,executionContext,evaluationUrl);}}
_runScript(scriptId,executionContext,sourceURL){var runtimeModel=executionContext.runtimeModel;runtimeModel.runScript(scriptId,executionContext.id,'console',false,true,false,true,undefined,runCallback.bind(this));function runCallback(result,exceptionDetails){if(!exceptionDetails)
this._printRunScriptResult(runtimeModel,result,scriptId,sourceURL);else
this._printRunOrCompileScriptResultFailure(runtimeModel,exceptionDetails,sourceURL);}}
_printRunScriptResult(runtimeModel,result,scriptId,sourceURL){var consoleMessage=new ConsoleModel.ConsoleMessage(runtimeModel.target(),ConsoleModel.ConsoleMessage.MessageSource.JS,ConsoleModel.ConsoleMessage.MessageLevel.Info,'',undefined,sourceURL,undefined,undefined,undefined,[result],undefined,undefined,undefined,scriptId);ConsoleModel.consoleModel.addMessage(consoleMessage);}
_printRunOrCompileScriptResultFailure(runtimeModel,exceptionDetails,sourceURL){ConsoleModel.consoleModel.addMessage(ConsoleModel.ConsoleMessage.fromException(runtimeModel,exceptionDetails,undefined,undefined,sourceURL||undefined));}
_removeBreakpoints(uiSourceCode){var breakpointLocations=Bindings.breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);for(var i=0;i<breakpointLocations.length;++i)
breakpointLocations[i].breakpoint.remove();return breakpointLocations;}
_restoreBreakpoints(uiSourceCode,breakpointLocations){for(var i=0;i<breakpointLocations.length;++i){var uiLocation=breakpointLocations[i].uiLocation;var breakpoint=breakpointLocations[i].breakpoint;Bindings.breakpointManager.setBreakpoint(uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber,breakpoint.condition(),breakpoint.enabled());}}
_releaseSnippetScript(uiSourceCode){this._mappingForDebuggerModel.valuesArray().forEach(function(mapping){mapping._releaseSnippetScript(uiSourceCode);});}
_snippetIdForSourceURL(sourceURL){var snippetPrefix=Snippets.ScriptSnippetModel.snippetSourceURLPrefix;if(!sourceURL.startsWith(snippetPrefix))
return null;var splitURL=sourceURL.substring(snippetPrefix.length).split('_');var snippetId=splitURL[0];return snippetId;}};Snippets.ScriptSnippetModel.snippetSourceURLPrefix='snippets:///';Snippets.SnippetScriptMapping=class{constructor(debuggerModel,scriptSnippetModel){this._debuggerModel=debuggerModel;this._scriptSnippetModel=scriptSnippetModel;this._uiSourceCodeForScriptId={};this._scriptForUISourceCode=new Map();this._evaluationIndexForUISourceCode=new Map();debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared,this._reset,this);}
_releaseSnippetScript(uiSourceCode){var script=this._scriptForUISourceCode.get(uiSourceCode);if(!script)
return;delete this._uiSourceCodeForScriptId[script.scriptId];this._scriptForUISourceCode.remove(uiSourceCode);this._evaluationIndexForUISourceCode.remove(uiSourceCode);}
_setEvaluationIndex(evaluationIndex,uiSourceCode){this._evaluationIndexForUISourceCode.set(uiSourceCode,evaluationIndex);}
evaluationIndex(uiSourceCode){return this._evaluationIndexForUISourceCode.get(uiSourceCode);}
_evaluationSourceURL(uiSourceCode){var evaluationSuffix='_'+this._evaluationIndexForUISourceCode.get(uiSourceCode);var snippetId=this._scriptSnippetModel._snippetIdForUISourceCode.get(uiSourceCode);return Snippets.ScriptSnippetModel.snippetSourceURLPrefix+snippetId+evaluationSuffix;}
_reset(){this._uiSourceCodeForScriptId={};this._scriptForUISourceCode.clear();this._evaluationIndexForUISourceCode.clear();}
rawLocationToUILocation(rawLocation){var debuggerModelLocation=(rawLocation);var uiSourceCode=this._uiSourceCodeForScriptId[debuggerModelLocation.scriptId];if(!uiSourceCode)
return null;return uiSourceCode.uiLocation(debuggerModelLocation.lineNumber,debuggerModelLocation.columnNumber||0);}
uiLocationToRawLocation(uiSourceCode,lineNumber,columnNumber){var script=this._scriptForUISourceCode.get(uiSourceCode);if(!script)
return null;return this._debuggerModel.createRawLocation(script,lineNumber,columnNumber);}
_addScript(script,uiSourceCode){console.assert(!this._scriptForUISourceCode.get(uiSourceCode));Bindings.debuggerWorkspaceBinding.setSourceMapping(this._debuggerModel,uiSourceCode,this);this._uiSourceCodeForScriptId[script.scriptId]=uiSourceCode;this._scriptForUISourceCode.set(uiSourceCode,script);Bindings.debuggerWorkspaceBinding.pushSourceMapping(script,this);}
_restoreBreakpoints(uiSourceCode,breakpointLocations){var script=this._scriptForUISourceCode.get(uiSourceCode);if(!script)
return;var rawLocation=(this._debuggerModel.createRawLocation(script,0,0));var scriptUISourceCode=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation).uiSourceCode;if(scriptUISourceCode)
this._scriptSnippetModel._restoreBreakpoints(scriptUISourceCode,breakpointLocations);}
isIdentity(){return false;}
uiLineHasMapping(uiSourceCode,lineNumber){return true;}};Snippets.SnippetContentProvider=class{constructor(snippet){this._snippet=snippet;}
contentURL(){return'';}
contentType(){return Common.resourceTypes.Snippet;}
requestContent(){return Promise.resolve((this._snippet.content));}
searchInContent(query,caseSensitive,isRegex,callback){function performSearch(){callback(Common.ContentProvider.performSearchInContent(this._snippet.content,query,caseSensitive,isRegex));}
window.setTimeout(performSearch.bind(this),0);}};Snippets.SnippetsProject=class extends Bindings.ContentProviderBasedProject{constructor(workspace,model){super(workspace,'snippets:',Workspace.projectTypes.Snippets,'',false);this._model=model;}
addSnippet(name,contentProvider){return this.addContentProvider(name,contentProvider);}
canSetFileContent(){return true;}
setFileContent(uiSourceCode,newContent,callback){this._model._setScriptSnippetContent(uiSourceCode.url(),newContent);callback('');}
canRename(){return true;}
performRename(url,newName,callback){this._model.renameScriptSnippet(url,newName,callback);}
createFile(url,name,content,callback){callback(this._model.createScriptSnippet(content));}
deleteFile(uiSourceCode){this._model.deleteScriptSnippet(uiSourceCode);}};Snippets.scriptSnippetModel=new Snippets.ScriptSnippetModel(Workspace.workspace);;