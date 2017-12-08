var allDescriptors=[{"name":"worker_service"},{"dependencies":["worker_service"],"extensions":[{"className":"TempStorage","type":"@Service","name":"TempStorage"}],"name":"utility_shared_worker"}];var applicationDescriptor;var _loadedScripts={};for(var k of[]){}
(function(){var baseUrl=self.location?self.location.origin+self.location.pathname:'';self._importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();var Runtime=class{constructor(descriptors){this._modules=[];this._modulesMap={};this._extensions=[];this._cachedTypeClasses={};this._descriptorsMap={};for(var i=0;i<descriptors.length;++i)
this._registerModule(descriptors[i]);}
static loadResourcePromise(url){return new Promise(load);function load(fulfill,reject){var xhr=new XMLHttpRequest();xhr.open('GET',url,true);xhr.onreadystatechange=onreadystatechange;function onreadystatechange(e){if(xhr.readyState!==XMLHttpRequest.DONE)
return;if([0,200,304].indexOf(xhr.status)===-1)
reject(new Error('While loading from url '+url+' server responded with a status of '+xhr.status));else
fulfill(e.target.response);}
xhr.send(null);}}
static normalizePath(path){if(path.indexOf('..')===-1&&path.indexOf('.')===-1)
return path;var normalizedSegments=[];var segments=path.split('/');for(var i=0;i<segments.length;i++){var segment=segments[i];if(segment==='.')
continue;else if(segment==='..')
normalizedSegments.pop();else if(segment)
normalizedSegments.push(segment);}
var normalizedPath=normalizedSegments.join('/');if(normalizedPath[normalizedPath.length-1]==='/')
return normalizedPath;if(path[0]==='/'&&normalizedPath)
normalizedPath='/'+normalizedPath;if((path[path.length-1]==='/')||(segments[segments.length-1]==='.')||(segments[segments.length-1]==='..'))
normalizedPath=normalizedPath+'/';return normalizedPath;}
static _loadScriptsPromise(scriptNames,base){var promises=[];var urls=[];var sources=new Array(scriptNames.length);var scriptToEval=0;for(var i=0;i<scriptNames.length;++i){var scriptName=scriptNames[i];var sourceURL=(base||self._importScriptPathPrefix)+scriptName;var schemaIndex=sourceURL.indexOf('://')+3;var pathIndex=sourceURL.indexOf('/',schemaIndex);if(pathIndex===-1)
pathIndex=sourceURL.length;sourceURL=sourceURL.substring(0,pathIndex)+Runtime.normalizePath(sourceURL.substring(pathIndex));if(_loadedScripts[sourceURL])
continue;urls.push(sourceURL);promises.push(Runtime.loadResourcePromise(sourceURL).then(scriptSourceLoaded.bind(null,i),scriptSourceLoaded.bind(null,i,undefined)));}
return Promise.all(promises).then(undefined);function scriptSourceLoaded(scriptNumber,scriptSource){sources[scriptNumber]=scriptSource||'';while(typeof sources[scriptToEval]!=='undefined'){evaluateScript(urls[scriptToEval],sources[scriptToEval]);++scriptToEval;}}
function evaluateScript(sourceURL,scriptSource){_loadedScripts[sourceURL]=true;if(!scriptSource){console.error('Empty response arrived for script \''+sourceURL+'\'');return;}
self.eval(scriptSource+'\n//# sourceURL='+sourceURL);}}
static _loadResourceIntoCache(url,appendSourceURL){return Runtime.loadResourcePromise(url).then(cacheResource.bind(this,url),cacheResource.bind(this,url,undefined));function cacheResource(path,content){if(!content){console.error('Failed to load resource: '+path);return;}
var sourceURL=appendSourceURL?Runtime.resolveSourceURL(path):'';Runtime.cachedResources[path]=content+sourceURL;}}
static startApplication(appName){console.timeStamp('Runtime.startApplication');var allDescriptorsByName={};for(var i=0;i<allDescriptors.length;++i){var d=allDescriptors[i];allDescriptorsByName[d['name']]=d;}
var applicationPromise;if(applicationDescriptor)
applicationPromise=Promise.resolve(applicationDescriptor);else
applicationPromise=Runtime.loadResourcePromise(appName+'.json').then(JSON.parse.bind(JSON));return applicationPromise.then(parseModuleDescriptors);function parseModuleDescriptors(appDescriptor){var configuration=appDescriptor.modules;var moduleJSONPromises=[];var coreModuleNames=[];for(var i=0;i<configuration.length;++i){var descriptor=configuration[i];var name=descriptor['name'];var moduleJSON=allDescriptorsByName[name];if(moduleJSON)
moduleJSONPromises.push(Promise.resolve(moduleJSON));else
moduleJSONPromises.push(Runtime.loadResourcePromise(name+'/module.json').then(JSON.parse.bind(JSON)));if(descriptor['type']==='autostart')
coreModuleNames.push(name);}
return Promise.all(moduleJSONPromises).then(instantiateRuntime);function instantiateRuntime(moduleDescriptors){for(var i=0;i<moduleDescriptors.length;++i){moduleDescriptors[i].name=configuration[i]['name'];moduleDescriptors[i].condition=configuration[i]['condition'];moduleDescriptors[i].remote=configuration[i]['type']==='remote';}
self.runtime=new Runtime(moduleDescriptors);if(coreModuleNames)
return(self.runtime._loadAutoStartModules(coreModuleNames));return Promise.resolve();}}}
static startWorker(appName){return Runtime.startApplication(appName).then(sendWorkerReady);function sendWorkerReady(){self.postMessage('workerReady');}}
static startSharedWorker(appName){var startPromise=Runtime.startApplication(appName);self.onconnect=function(event){var newPort=(event.ports[0]);startPromise.then(sendWorkerReadyAndContinue);function sendWorkerReadyAndContinue(){newPort.postMessage('workerReady');if(Runtime._sharedWorkerNewPortCallback)
Runtime._sharedWorkerNewPortCallback.call(null,newPort);else
Runtime._sharedWorkerConnectedPorts.push(newPort);}};}
static setSharedWorkerNewPortCallback(callback){Runtime._sharedWorkerNewPortCallback=callback;while(Runtime._sharedWorkerConnectedPorts.length){var port=Runtime._sharedWorkerConnectedPorts.shift();callback.call(null,port);}}
static queryParam(name){return Runtime._queryParamsObject[name]||null;}
static queryParamsString(){return location.search;}
static _experimentsSetting(){try{return(JSON.parse(self.localStorage&&self.localStorage['experiments']?self.localStorage['experiments']:'{}'));}catch(e){console.error('Failed to parse localStorage[\'experiments\']');return{};}}
static _assert(value,message){if(value)
return;Runtime._originalAssert.call(Runtime._console,value,message+' '+new Error().stack);}
static setPlatform(platform){Runtime._platform=platform;}
static _isDescriptorEnabled(descriptor){var activatorExperiment=descriptor['experiment'];if(activatorExperiment==='*')
return Runtime.experiments.supportEnabled();if(activatorExperiment&&activatorExperiment.startsWith('!')&&Runtime.experiments.isEnabled(activatorExperiment.substring(1)))
return false;if(activatorExperiment&&!activatorExperiment.startsWith('!')&&!Runtime.experiments.isEnabled(activatorExperiment))
return false;var condition=descriptor['condition'];if(condition&&!condition.startsWith('!')&&!Runtime.queryParam(condition))
return false;if(condition&&condition.startsWith('!')&&Runtime.queryParam(condition.substring(1)))
return false;return true;}
static resolveSourceURL(path){var sourceURL=self.location.href;if(self.location.search)
sourceURL=sourceURL.replace(self.location.search,'');sourceURL=sourceURL.substring(0,sourceURL.lastIndexOf('/')+1)+path;return'\n/*# sourceURL='+sourceURL+' */';}
useTestBase(){Runtime._remoteBase='http://localhost:8000/inspector-sources/';if(Runtime.queryParam('debugFrontend'))
Runtime._remoteBase+='debug/';}
_registerModule(descriptor){var module=new Runtime.Module(this,descriptor);this._modules.push(module);this._modulesMap[descriptor['name']]=module;}
loadModulePromise(moduleName){return this._modulesMap[moduleName]._loadPromise();}
_loadAutoStartModules(moduleNames){var promises=[];for(var i=0;i<moduleNames.length;++i)
promises.push(this.loadModulePromise(moduleNames[i]));return Promise.all(promises);}
_checkExtensionApplicability(extension,predicate){if(!predicate)
return false;var contextTypes=extension.descriptor().contextTypes;if(!contextTypes)
return true;for(var i=0;i<contextTypes.length;++i){var contextType=this._resolve(contextTypes[i]);var isMatching=!!contextType&&predicate(contextType);if(isMatching)
return true;}
return false;}
isExtensionApplicableToContext(extension,context){if(!context)
return true;return this._checkExtensionApplicability(extension,isInstanceOf);function isInstanceOf(targetType){return context instanceof targetType;}}
isExtensionApplicableToContextTypes(extension,currentContextTypes){if(!extension.descriptor().contextTypes)
return true;return this._checkExtensionApplicability(extension,currentContextTypes?isContextTypeKnown:null);function isContextTypeKnown(targetType){return currentContextTypes.has(targetType);}}
extensions(type,context,sortByTitle){return this._extensions.filter(filter).sort(sortByTitle?titleComparator:orderComparator);function filter(extension){if(extension._type!==type&&extension._typeClass()!==type)
return false;if(!extension.enabled())
return false;return!context||extension.isApplicable(context);}
function orderComparator(extension1,extension2){var order1=extension1.descriptor()['order']||0;var order2=extension2.descriptor()['order']||0;return order1-order2;}
function titleComparator(extension1,extension2){var title1=extension1.title()||'';var title2=extension2.title()||'';return title1.localeCompare(title2);}}
extension(type,context){return this.extensions(type,context)[0]||null;}
allInstances(type,context){return Promise.all(this.extensions(type,context).map(extension=>extension.instance()));}
_resolve(typeName){if(!this._cachedTypeClasses[typeName]){var path=typeName.split('.');var object=self;for(var i=0;object&&(i<path.length);++i)
object=object[path[i]];if(object)
this._cachedTypeClasses[typeName]=(object);}
return this._cachedTypeClasses[typeName]||null;}
sharedInstance(constructorFunction){if(Runtime._instanceSymbol in constructorFunction)
return constructorFunction[Runtime._instanceSymbol];var instance=new constructorFunction();constructorFunction[Runtime._instanceSymbol]=instance;return instance;}};Runtime._queryParamsObject={__proto__:null};Runtime._instanceSymbol=Symbol('instance');Runtime._extensionSymbol=Symbol('extension');Runtime.cachedResources={__proto__:null};Runtime._sharedWorkerNewPortCallback=null;Runtime._sharedWorkerConnectedPorts=[];Runtime._console=console;Runtime._originalAssert=console.assert;Runtime._platform='';Runtime.ModuleDescriptor=class{constructor(){this.name;this.extensions;this.dependencies;this.scripts;this.condition;this.remote;}};Runtime.ExtensionDescriptor=class{constructor(){this.type;this.className;this.factoryName;this.contextTypes;}};Runtime.Module=class{constructor(manager,descriptor){this._manager=manager;this._descriptor=descriptor;this._name=descriptor.name;this._extensions=[];this._extensionsByClassName=new Map();var extensions=(descriptor.extensions);for(var i=0;extensions&&i<extensions.length;++i){var extension=new Runtime.Extension(this,extensions[i]);this._manager._extensions.push(extension);this._extensions.push(extension);}
this._loadedForTest=false;}
name(){return this._name;}
enabled(){return Runtime._isDescriptorEnabled(this._descriptor);}
resource(name){var fullName=this._name+'/'+name;var content=Runtime.cachedResources[fullName];if(!content)
throw new Error(fullName+' not preloaded. Check module.json');return content;}
_loadPromise(){if(!this.enabled())
return Promise.reject(new Error('Module '+this._name+' is not enabled'));if(this._pendingLoadPromise)
return this._pendingLoadPromise;var dependencies=this._descriptor.dependencies;var dependencyPromises=[];for(var i=0;dependencies&&i<dependencies.length;++i)
dependencyPromises.push(this._manager._modulesMap[dependencies[i]]._loadPromise());this._pendingLoadPromise=Promise.all(dependencyPromises).then(this._loadResources.bind(this)).then(this._loadScripts.bind(this)).then(()=>this._loadedForTest=true);return this._pendingLoadPromise;}
_loadResources(){var resources=this._descriptor['resources'];if(!resources||!resources.length)
return Promise.resolve();var promises=[];for(var i=0;i<resources.length;++i){var url=this._modularizeURL(resources[i]);promises.push(Runtime._loadResourceIntoCache(url,true));}
return Promise.all(promises).then(undefined);}
_loadScripts(){if(!this._descriptor.scripts||!this._descriptor.scripts.length)
return Promise.resolve();const specialCases={'sdk':'SDK','ui':'UI','object_ui':'ObjectUI','perf_ui':'PerfUI',};var namespace=specialCases[this._name]||this._name.split('_').map(a=>a.substring(0,1).toUpperCase()+a.substring(1)).join('');self[namespace]=self[namespace]||{};return Runtime._loadScriptsPromise(this._descriptor.scripts.map(this._modularizeURL,this),this._remoteBase());}
_modularizeURL(resourceName){return Runtime.normalizePath(this._name+'/'+resourceName);}
_remoteBase(){return!Runtime.queryParam('debugFrontend')&&this._descriptor.remote&&Runtime._remoteBase||undefined;}
substituteURL(value){var base=this._remoteBase()||'';return value.replace(/@url\(([^\)]*?)\)/g,convertURL.bind(this));function convertURL(match,url){return base+this._modularizeURL(url);}}};Runtime.Extension=class{constructor(module,descriptor){this._module=module;this._descriptor=descriptor;this._type=descriptor.type;this._hasTypeClass=this._type.charAt(0)==='@';this._className=descriptor.className||null;this._factoryName=descriptor.factoryName||null;}
descriptor(){return this._descriptor;}
module(){return this._module;}
enabled(){return this._module.enabled()&&Runtime._isDescriptorEnabled(this.descriptor());}
_typeClass(){if(!this._hasTypeClass)
return null;return this._module._manager._resolve(this._type.substring(1));}
isApplicable(context){return this._module._manager.isExtensionApplicableToContext(this,context);}
instance(){return this._module._loadPromise().then(this._createInstance.bind(this));}
_createInstance(){var className=this._className||this._factoryName;if(!className)
throw new Error('Could not instantiate extension with no class');var constructorFunction=self.eval((className));if(!(constructorFunction instanceof Function))
throw new Error('Could not instantiate: '+className);if(this._className)
return this._module._manager.sharedInstance(constructorFunction);return new constructorFunction(this);}
title(){return this._descriptor['title-'+Runtime._platform]||this._descriptor['title'];}
hasContextType(contextType){var contextTypes=this.descriptor().contextTypes;if(!contextTypes)
return false;for(var i=0;i<contextTypes.length;++i){if(contextType===this._module._manager._resolve(contextTypes[i]))
return true;}
return false;}};Runtime.ExperimentsSupport=class{constructor(){this._supportEnabled=Runtime.queryParam('experiments')!==null;this._experiments=[];this._experimentNames={};this._enabledTransiently={};}
allConfigurableExperiments(){var result=[];for(var i=0;i<this._experiments.length;i++){var experiment=this._experiments[i];if(!this._enabledTransiently[experiment.name])
result.push(experiment);}
return result;}
supportEnabled(){return this._supportEnabled;}
_setExperimentsSetting(value){if(!self.localStorage)
return;self.localStorage['experiments']=JSON.stringify(value);}
register(experimentName,experimentTitle,hidden){Runtime._assert(!this._experimentNames[experimentName],'Duplicate registration of experiment '+experimentName);this._experimentNames[experimentName]=true;this._experiments.push(new Runtime.Experiment(this,experimentName,experimentTitle,!!hidden));}
isEnabled(experimentName){this._checkExperiment(experimentName);if(this._enabledTransiently[experimentName])
return true;if(!this.supportEnabled())
return false;return!!Runtime._experimentsSetting()[experimentName];}
setEnabled(experimentName,enabled){this._checkExperiment(experimentName);var experimentsSetting=Runtime._experimentsSetting();experimentsSetting[experimentName]=enabled;this._setExperimentsSetting(experimentsSetting);}
setDefaultExperiments(experimentNames){for(var i=0;i<experimentNames.length;++i){this._checkExperiment(experimentNames[i]);this._enabledTransiently[experimentNames[i]]=true;}}
enableForTest(experimentName){this._checkExperiment(experimentName);this._enabledTransiently[experimentName]=true;}
clearForTest(){this._experiments=[];this._experimentNames={};this._enabledTransiently={};}
cleanUpStaleExperiments(){var experimentsSetting=Runtime._experimentsSetting();var cleanedUpExperimentSetting={};for(var i=0;i<this._experiments.length;++i){var experimentName=this._experiments[i].name;if(experimentsSetting[experimentName])
cleanedUpExperimentSetting[experimentName]=true;}
this._setExperimentsSetting(cleanedUpExperimentSetting);}
_checkExperiment(experimentName){Runtime._assert(this._experimentNames[experimentName],'Unknown experiment '+experimentName);}};Runtime.Experiment=class{constructor(experiments,name,title,hidden){this.name=name;this.title=title;this.hidden=hidden;this._experiments=experiments;}
isEnabled(){return this._experiments.isEnabled(this.name);}
setEnabled(enabled){this._experiments.setEnabled(this.name,enabled);}};{(function parseQueryParameters(){var queryParams=Runtime.queryParamsString();if(!queryParams)
return;var params=queryParams.substring(1).split('&');for(var i=0;i<params.length;++i){var pair=params[i].split('=');var name=pair.shift();Runtime._queryParamsObject[name]=pair.join('=');}})();}
Runtime.experiments=new Runtime.ExperimentsSupport();Runtime._remoteBase=Runtime.queryParam('remoteBase');{(function validateRemoteBase(){var remoteBaseRegexp=/^https:\/\/chrome-devtools-frontend\.appspot\.com\/serve_file\/@[0-9a-zA-Z]+\/?$/;if(Runtime._remoteBase&&!remoteBaseRegexp.test(Runtime._remoteBase))
Runtime._remoteBase=null;})();}
function ServicePort(){}
ServicePort.prototype={setHandlers(messageHandler,closeHandler){},send(message){},close(){}};var runtime;self['WorkerService']=self['WorkerService']||{};function Service(){}
Service.prototype={dispose(){},setNotify(notify){}};var ServiceDispatcher=class{constructor(port){this._objects=new Map();this._lastObjectId=1;this._port=port;this._port.setHandlers(this._dispatchMessageWrapped.bind(this),this._connectionClosed.bind(this));}
_dispatchMessageWrapped(data){try{var message=JSON.parse(data);if(!(message instanceof Object)){this._sendErrorResponse(message['id'],'Malformed message');return;}
this._dispatchMessage(message);}catch(e){this._sendErrorResponse(message['id'],e.toString());}}
_dispatchMessage(message){var domainAndMethod=message['method'].split('.');var serviceName=domainAndMethod[0];var method=domainAndMethod[1];if(method==='create'){var extensions=self.runtime.extensions(Service).filter(extension=>extension.descriptor()['name']===serviceName);if(!extensions.length){this._sendErrorResponse(message['id'],'Could not resolve service \''+serviceName+'\'');return;}
extensions[0].instance().then(object=>{var id=String(this._lastObjectId++);object.setNotify(this._notify.bind(this,id,serviceName));this._objects.set(id,object);this._sendResponse(message['id'],{id:id});});}else if(method==='dispose'){var object=this._objects.get(message['params']['id']);if(!object){console.error('Could not look up object with id for '+JSON.stringify(message));return;}
this._objects.delete(message['params']['id']);object.dispose().then(()=>this._sendResponse(message['id'],{}));}else{if(!message['params']){console.error('No params in the message: '+JSON.stringify(message));return;}
var object=this._objects.get(message['params']['id']);if(!object){console.error('Could not look up object with id for '+JSON.stringify(message));return;}
var handler=object[method];if(!(handler instanceof Function)){console.error('Handler for \''+method+'\' is missing.');return;}
object[method](message['params']).then(result=>this._sendResponse(message['id'],result));}}
_connectionClosed(){for(var object of this._objects.values())
object.dispose();this._objects.clear();}
_notify(objectId,serviceName,method,params){params['id']=objectId;var message={method:serviceName+'.'+method,params:params};this._port.send(JSON.stringify(message));}
_sendResponse(messageId,result){var message={id:messageId,result:result};this._port.send(JSON.stringify(message));}
_sendErrorResponse(messageId,error){var message={id:messageId,error:error};this._port.send(JSON.stringify(message));}};var WorkerServicePort=class{constructor(port){this._port=port;this._port.onmessage=this._onMessage.bind(this);this._port.onerror=console.error;}
setHandlers(messageHandler,closeHandler){this._messageHandler=messageHandler;this._closeHandler=closeHandler;}
send(data){this._port.postMessage(data);return Promise.resolve();}
close(){return Promise.resolve();}
_onMessage(event){this._messageHandler(event.data);}};var dispatchers=[];if(self.SharedWorkerGlobalScope){function onNewPort(port){var dispatcher=new ServiceDispatcher(new WorkerServicePort(port));dispatchers.push(dispatcher);}
Runtime.setSharedWorkerNewPortCallback(onNewPort);}else{var worker=(self);var servicePort=new WorkerServicePort((worker));dispatchers.push(new ServiceDispatcher(servicePort));};self['UtilitySharedWorker']=self['UtilitySharedWorker']||{};var TempStorage=class{setNotify(notify){}
dispose(){}
clear(){if(!TempStorage._clearPromise)
TempStorage._clearPromise=new Promise(this._innerClear.bind(this));return TempStorage._clearPromise;}
_innerClear(resolve){self.webkitRequestFileSystem(self.TEMPORARY,10,didGetFS,didFail);function didGetFS(fs){fs.root.createReader().readEntries(didReadEntries,didFail);}
function didReadEntries(entries){var remainingEntries=entries.length;if(!remainingEntries){resolve();return;}
function didDeleteEntry(){if(!--remainingEntries)
resolve();}
function failedToDeleteEntry(e){var tempStorageError='Failed to delete entry: '+e.message+' '+e.name;console.error(tempStorageError);didDeleteEntry();}
for(var i=0;i<entries.length;i++){var entry=entries[i];if(entry.isFile)
entry.remove(didDeleteEntry,failedToDeleteEntry);else
entry.removeRecursively(didDeleteEntry,failedToDeleteEntry);}}
function didFail(e){var tempStorageError='Failed to clear temp storage: '+e.message+' '+e.name;console.error(tempStorageError);resolve();}}};;applicationDescriptor={"has_html":false,"modules":[{"type":"autostart","name":"worker_service"},{"type":"autostart","name":"utility_shared_worker"}]};if(!self.Runtime)
self.importScripts('Runtime.js');Runtime.startSharedWorker('utility_shared_worker');