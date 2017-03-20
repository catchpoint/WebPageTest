var allDescriptors=[{"dependencies":[],"name":"heap_snapshot_model"},{"dependencies":[],"name":"platform"},{"dependencies":["heap_snapshot_model","platform","common"],"name":"heap_snapshot_worker"},{"dependencies":["platform"],"name":"common"}];var applicationDescriptor;var _loadedScripts={};for(var k of[]){}
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
ServicePort.prototype={setHandlers(messageHandler,closeHandler){},send(message){},close(){}};var runtime;self['HeapSnapshotModel']=self['HeapSnapshotModel']||{};HeapSnapshotModel.HeapSnapshotProgressEvent={Update:'ProgressUpdate',BrokenSnapshot:'BrokenSnapshot'};HeapSnapshotModel.baseSystemDistance=100000000;HeapSnapshotModel.AllocationNodeCallers=class{constructor(nodesWithSingleCaller,branchingCallers){this.nodesWithSingleCaller=nodesWithSingleCaller;this.branchingCallers=branchingCallers;}};HeapSnapshotModel.SerializedAllocationNode=class{constructor(nodeId,functionName,scriptName,scriptId,line,column,count,size,liveCount,liveSize,hasChildren){this.id=nodeId;this.name=functionName;this.scriptName=scriptName;this.scriptId=scriptId;this.line=line;this.column=column;this.count=count;this.size=size;this.liveCount=liveCount;this.liveSize=liveSize;this.hasChildren=hasChildren;}};HeapSnapshotModel.AllocationStackFrame=class{constructor(functionName,scriptName,scriptId,line,column){this.functionName=functionName;this.scriptName=scriptName;this.scriptId=scriptId;this.line=line;this.column=column;}};HeapSnapshotModel.Node=class{constructor(id,name,distance,nodeIndex,retainedSize,selfSize,type){this.id=id;this.name=name;this.distance=distance;this.nodeIndex=nodeIndex;this.retainedSize=retainedSize;this.selfSize=selfSize;this.type=type;this.canBeQueried=false;this.detachedDOMTreeNode=false;}};HeapSnapshotModel.Edge=class{constructor(name,node,type,edgeIndex){this.name=name;this.node=node;this.type=type;this.edgeIndex=edgeIndex;}};HeapSnapshotModel.Aggregate=class{constructor(){this.count;this.distance;this.self;this.maxRet;this.type;this.name;this.idxs;}};HeapSnapshotModel.AggregateForDiff=class{constructor(){this.indexes=[];this.ids=[];this.selfSizes=[];}};HeapSnapshotModel.Diff=class{constructor(){this.addedCount=0;this.removedCount=0;this.addedSize=0;this.removedSize=0;this.deletedIndexes=[];this.addedIndexes=[];}};HeapSnapshotModel.DiffForClass=class{constructor(){this.addedCount;this.removedCount;this.addedSize;this.removedSize;this.deletedIndexes;this.addedIndexes;this.countDelta;this.sizeDelta;}};HeapSnapshotModel.ComparatorConfig=class{constructor(){this.fieldName1;this.ascending1;this.fieldName2;this.ascending2;}};HeapSnapshotModel.WorkerCommand=class{constructor(){this.callId;this.disposition;this.objectId;this.newObjectId;this.methodName;this.methodArguments;this.source;}};HeapSnapshotModel.ItemsRange=class{constructor(startPosition,endPosition,totalLength,items){this.startPosition=startPosition;this.endPosition=endPosition;this.totalLength=totalLength;this.items=items;}};HeapSnapshotModel.StaticData=class{constructor(nodeCount,rootNodeIndex,totalSize,maxJSObjectId){this.nodeCount=nodeCount;this.rootNodeIndex=rootNodeIndex;this.totalSize=totalSize;this.maxJSObjectId=maxJSObjectId;}};HeapSnapshotModel.Statistics=class{constructor(){this.total;this.v8heap;this.native;this.code;this.jsArrays;this.strings;this.system;}};HeapSnapshotModel.NodeFilter=class{constructor(minNodeId,maxNodeId){this.minNodeId=minNodeId;this.maxNodeId=maxNodeId;this.allocationNodeId;}
equals(o){return this.minNodeId===o.minNodeId&&this.maxNodeId===o.maxNodeId&&this.allocationNodeId===o.allocationNodeId;}};HeapSnapshotModel.SearchConfig=class{constructor(query,caseSensitive,isRegex,shouldJump,jumpBackward){this.query=query;this.caseSensitive=caseSensitive;this.isRegex=isRegex;this.shouldJump=shouldJump;this.jumpBackward=jumpBackward;}};HeapSnapshotModel.Samples=class{constructor(timestamps,lastAssignedIds,sizes){this.timestamps=timestamps;this.lastAssignedIds=lastAssignedIds;this.sizes=sizes;}};;self['Platform']=self['Platform']||{};var ArrayLike;function mod(m,n){return((m%n)+n)%n;}
String.prototype.findAll=function(string){var matches=[];var i=this.indexOf(string);while(i!==-1){matches.push(i);i=this.indexOf(string,i+string.length);}
return matches;};String.prototype.reverse=function(){return this.split('').reverse().join('');};String.prototype.replaceControlCharacters=function(){return this.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u0080-\u009f]/g,'�');};String.prototype.isWhitespace=function(){return/^\s*$/.test(this);};String.prototype.computeLineEndings=function(){var endings=this.findAll('\n');endings.push(this.length);return endings;};String.prototype.escapeCharacters=function(chars){var foundChar=false;for(var i=0;i<chars.length;++i){if(this.indexOf(chars.charAt(i))!==-1){foundChar=true;break;}}
if(!foundChar)
return String(this);var result='';for(var i=0;i<this.length;++i){if(chars.indexOf(this.charAt(i))!==-1)
result+='\\';result+=this.charAt(i);}
return result;};String.regexSpecialCharacters=function(){return'^[]{}()\\.^$*+?|-,';};String.prototype.escapeForRegExp=function(){return this.escapeCharacters(String.regexSpecialCharacters());};String.prototype.escapeHTML=function(){return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};String.prototype.unescapeHTML=function(){return this.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#58;/g,':').replace(/&quot;/g,'"').replace(/&#60;/g,'<').replace(/&#62;/g,'>').replace(/&amp;/g,'&');};String.prototype.collapseWhitespace=function(){return this.replace(/[\s\xA0]+/g,' ');};String.prototype.trimMiddle=function(maxLength){if(this.length<=maxLength)
return String(this);var leftHalf=maxLength>>1;var rightHalf=maxLength-leftHalf-1;if(this.codePointAt(this.length-rightHalf-1)>=0x10000){--rightHalf;++leftHalf;}
if(leftHalf>0&&this.codePointAt(leftHalf-1)>=0x10000)
--leftHalf;return this.substr(0,leftHalf)+'\u2026'+this.substr(this.length-rightHalf,rightHalf);};String.prototype.trimEnd=function(maxLength){if(this.length<=maxLength)
return String(this);return this.substr(0,maxLength-1)+'\u2026';};String.prototype.trimURL=function(baseURLDomain){var result=this.replace(/^(https|http|file):\/\//i,'');if(baseURLDomain){if(result.toLowerCase().startsWith(baseURLDomain.toLowerCase()))
result=result.substr(baseURLDomain.length);}
return result;};String.prototype.toTitleCase=function(){return this.substring(0,1).toUpperCase()+this.substring(1);};String.prototype.compareTo=function(other){if(this>other)
return 1;if(this<other)
return-1;return 0;};String.prototype.removeURLFragment=function(){var fragmentIndex=this.indexOf('#');if(fragmentIndex===-1)
fragmentIndex=this.length;return this.substring(0,fragmentIndex);};String.hashCode=function(string){if(!string)
return 0;var p=((1<<30)*4-5);var z=0x5033d967;var z2=0x59d2f15d;var s=0;var zi=1;for(var i=0;i<string.length;i++){var xi=string.charCodeAt(i)*z2;s=(s+zi*xi)%p;zi=(zi*z)%p;}
s=(s+zi*(p-1))%p;return Math.abs(s|0);};String.isDigitAt=function(string,index){var c=string.charCodeAt(index);return(48<=c&&c<=57);};String.prototype.toBase64=function(){function encodeBits(b){return b<26?b+65:b<52?b+71:b<62?b-4:b===62?43:b===63?47:65;}
var encoder=new TextEncoder();var data=encoder.encode(this.toString());var n=data.length;var encoded='';if(n===0)
return encoded;var shift;var v=0;for(var i=0;i<n;i++){shift=i%3;v|=data[i]<<(16>>>shift&24);if(shift===2){encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),encodeBits(v>>>6&63),encodeBits(v&63));v=0;}}
if(shift===0)
encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),61,61);else if(shift===1)
encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),encodeBits(v>>>6&63),61);return encoded;};String.naturalOrderComparator=function(a,b){var chunk=/^\d+|^\D+/;var chunka,chunkb,anum,bnum;while(1){if(a){if(!b)
return 1;}else{if(b)
return-1;else
return 0;}
chunka=a.match(chunk)[0];chunkb=b.match(chunk)[0];anum=!isNaN(chunka);bnum=!isNaN(chunkb);if(anum&&!bnum)
return-1;if(bnum&&!anum)
return 1;if(anum&&bnum){var diff=chunka-chunkb;if(diff)
return diff;if(chunka.length!==chunkb.length){if(!+chunka&&!+chunkb)
return chunka.length-chunkb.length;else
return chunkb.length-chunka.length;}}else if(chunka!==chunkb){return(chunka<chunkb)?-1:1;}
a=a.substring(chunka.length);b=b.substring(chunkb.length);}};String.caseInsensetiveComparator=function(a,b){a=a.toUpperCase();b=b.toUpperCase();if(a===b)
return 0;return a>b?1:-1;};Number.constrain=function(num,min,max){if(num<min)
num=min;else if(num>max)
num=max;return num;};Number.gcd=function(a,b){if(b===0)
return a;else
return Number.gcd(b,a%b);};Number.toFixedIfFloating=function(value){if(!value||isNaN(value))
return value;var number=Number(value);return number%1?number.toFixed(3):String(number);};Date.prototype.isValid=function(){return!isNaN(this.getTime());};Date.prototype.toISO8601Compact=function(){function leadZero(x){return(x>9?'':'0')+x;}
return this.getFullYear()+leadZero(this.getMonth()+1)+leadZero(this.getDate())+'T'+
leadZero(this.getHours())+leadZero(this.getMinutes())+leadZero(this.getSeconds());};Object.defineProperty(Array.prototype,'remove',{value:function(value,firstOnly){var index=this.indexOf(value);if(index===-1)
return false;if(firstOnly){this.splice(index,1);return true;}
for(var i=index+1,n=this.length;i<n;++i){if(this[i]!==value)
this[index++]=this[i];}
this.length=index;return true;}});Object.defineProperty(Array.prototype,'pushAll',{value:function(array){for(var i=0;i<array.length;++i)
this.push(array[i]);}});Object.defineProperty(Array.prototype,'rotate',{value:function(index){var result=[];for(var i=index;i<index+this.length;++i)
result.push(this[i%this.length]);return result;}});Object.defineProperty(Array.prototype,'sortNumbers',{value:function(){function numericComparator(a,b){return a-b;}
this.sort(numericComparator);}});Object.defineProperty(Uint32Array.prototype,'sort',{value:Array.prototype.sort});(function(){var partition={value:function(comparator,left,right,pivotIndex){function swap(array,i1,i2){var temp=array[i1];array[i1]=array[i2];array[i2]=temp;}
var pivotValue=this[pivotIndex];swap(this,right,pivotIndex);var storeIndex=left;for(var i=left;i<right;++i){if(comparator(this[i],pivotValue)<0){swap(this,storeIndex,i);++storeIndex;}}
swap(this,right,storeIndex);return storeIndex;}};Object.defineProperty(Array.prototype,'partition',partition);Object.defineProperty(Uint32Array.prototype,'partition',partition);var sortRange={value:function(comparator,leftBound,rightBound,sortWindowLeft,sortWindowRight){function quickSortRange(array,comparator,left,right,sortWindowLeft,sortWindowRight){if(right<=left)
return;var pivotIndex=Math.floor(Math.random()*(right-left))+left;var pivotNewIndex=array.partition(comparator,left,right,pivotIndex);if(sortWindowLeft<pivotNewIndex)
quickSortRange(array,comparator,left,pivotNewIndex-1,sortWindowLeft,sortWindowRight);if(pivotNewIndex<sortWindowRight)
quickSortRange(array,comparator,pivotNewIndex+1,right,sortWindowLeft,sortWindowRight);}
if(leftBound===0&&rightBound===(this.length-1)&&sortWindowLeft===0&&sortWindowRight>=rightBound)
this.sort(comparator);else
quickSortRange(this,comparator,leftBound,rightBound,sortWindowLeft,sortWindowRight);return this;}};Object.defineProperty(Array.prototype,'sortRange',sortRange);Object.defineProperty(Uint32Array.prototype,'sortRange',sortRange);})();Object.defineProperty(Array.prototype,'stableSort',{value:function(comparator){function defaultComparator(a,b){return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;var indices=new Array(this.length);for(var i=0;i<this.length;++i)
indices[i]=i;var self=this;function indexComparator(a,b){var result=comparator(self[a],self[b]);return result?result:a-b;}
indices.sort(indexComparator);for(var i=0;i<this.length;++i){if(indices[i]<0||i===indices[i])
continue;var cyclical=i;var saved=this[i];while(true){var next=indices[cyclical];indices[cyclical]=-1;if(next===i){this[cyclical]=saved;break;}else{this[cyclical]=this[next];cyclical=next;}}}
return this;}});Object.defineProperty(Array.prototype,'qselect',{value:function(k,comparator){if(k<0||k>=this.length)
return;if(!comparator){comparator=function(a,b){return a-b;};}
var low=0;var high=this.length-1;for(;;){var pivotPosition=this.partition(comparator,low,high,Math.floor((high+low)/2));if(pivotPosition===k)
return this[k];else if(pivotPosition>k)
high=pivotPosition-1;else
low=pivotPosition+1;}}});Object.defineProperty(Array.prototype,'lowerBound',{value:function(object,comparator,left,right){function defaultComparator(a,b){return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;var l=left||0;var r=right!==undefined?right:this.length;while(l<r){var m=(l+r)>>1;if(comparator(object,this[m])>0)
l=m+1;else
r=m;}
return r;}});Object.defineProperty(Array.prototype,'upperBound',{value:function(object,comparator,left,right){function defaultComparator(a,b){return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;var l=left||0;var r=right!==undefined?right:this.length;while(l<r){var m=(l+r)>>1;if(comparator(object,this[m])>=0)
l=m+1;else
r=m;}
return r;}});Object.defineProperty(Uint32Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Uint32Array.prototype,'upperBound',{value:Array.prototype.upperBound});Object.defineProperty(Int32Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Int32Array.prototype,'upperBound',{value:Array.prototype.upperBound});Object.defineProperty(Float64Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Array.prototype,'binaryIndexOf',{value:function(value,comparator){var index=this.lowerBound(value,comparator);return index<this.length&&comparator(value,this[index])===0?index:-1;}});Object.defineProperty(Array.prototype,'select',{value:function(field){var result=new Array(this.length);for(var i=0;i<this.length;++i)
result[i]=this[i][field];return result;}});Object.defineProperty(Array.prototype,'peekLast',{value:function(){return this[this.length-1];}});(function(){function mergeOrIntersect(array1,array2,comparator,mergeNotIntersect){var result=[];var i=0;var j=0;while(i<array1.length&&j<array2.length){var compareValue=comparator(array1[i],array2[j]);if(mergeNotIntersect||!compareValue)
result.push(compareValue<=0?array1[i]:array2[j]);if(compareValue<=0)
i++;if(compareValue>=0)
j++;}
if(mergeNotIntersect){while(i<array1.length)
result.push(array1[i++]);while(j<array2.length)
result.push(array2[j++]);}
return result;}
Object.defineProperty(Array.prototype,'intersectOrdered',{value:function(array,comparator){return mergeOrIntersect(this,array,comparator,false);}});Object.defineProperty(Array.prototype,'mergeOrdered',{value:function(array,comparator){return mergeOrIntersect(this,array,comparator,true);}});})();String.sprintf=function(format,var_arg){return String.vsprintf(format,Array.prototype.slice.call(arguments,1));};String.tokenizeFormatString=function(format,formatters){var tokens=[];var substitutionIndex=0;function addStringToken(str){if(tokens.length&&tokens[tokens.length-1].type==='string')
tokens[tokens.length-1].value+=str;else
tokens.push({type:'string',value:str});}
function addSpecifierToken(specifier,precision,substitutionIndex){tokens.push({type:'specifier',specifier:specifier,precision:precision,substitutionIndex:substitutionIndex});}
var index=0;for(var precentIndex=format.indexOf('%',index);precentIndex!==-1;precentIndex=format.indexOf('%',index)){if(format.length===index)
break;addStringToken(format.substring(index,precentIndex));index=precentIndex+1;if(format[index]==='%'){addStringToken('%');++index;continue;}
if(String.isDigitAt(format,index)){var number=parseInt(format.substring(index),10);while(String.isDigitAt(format,index))
++index;if(number>0&&format[index]==='$'){substitutionIndex=(number-1);++index;}}
var precision=-1;if(format[index]==='.'){++index;precision=parseInt(format.substring(index),10);if(isNaN(precision))
precision=0;while(String.isDigitAt(format,index))
++index;}
if(!(format[index]in formatters)){addStringToken(format.substring(precentIndex,index+1));++index;continue;}
addSpecifierToken(format[index],precision,substitutionIndex);++substitutionIndex;++index;}
addStringToken(format.substring(index));return tokens;};String.standardFormatters={d:function(substitution){return!isNaN(substitution)?substitution:0;},f:function(substitution,token){if(substitution&&token.precision>-1)
substitution=substitution.toFixed(token.precision);return!isNaN(substitution)?substitution:(token.precision>-1?Number(0).toFixed(token.precision):0);},s:function(substitution){return substitution;}};String.vsprintf=function(format,substitutions){return String.format(format,substitutions,String.standardFormatters,'',function(a,b){return a+b;}).formattedResult;};String.format=function(format,substitutions,formatters,initialValue,append,tokenizedFormat){if(!format||!substitutions||!substitutions.length)
return{formattedResult:append(initialValue,format),unusedSubstitutions:substitutions};function prettyFunctionName(){return'String.format("'+format+'", "'+Array.prototype.join.call(substitutions,'", "')+'")';}
function warn(msg){console.warn(prettyFunctionName()+': '+msg);}
function error(msg){console.error(prettyFunctionName()+': '+msg);}
var result=initialValue;var tokens=tokenizedFormat||String.tokenizeFormatString(format,formatters);var usedSubstitutionIndexes={};for(var i=0;i<tokens.length;++i){var token=tokens[i];if(token.type==='string'){result=append(result,token.value);continue;}
if(token.type!=='specifier'){error('Unknown token type "'+token.type+'" found.');continue;}
if(token.substitutionIndex>=substitutions.length){error('not enough substitution arguments. Had '+substitutions.length+' but needed '+
(token.substitutionIndex+1)+', so substitution was skipped.');result=append(result,'%'+(token.precision>-1?token.precision:'')+token.specifier);continue;}
usedSubstitutionIndexes[token.substitutionIndex]=true;if(!(token.specifier in formatters)){warn('unsupported format character \u201C'+token.specifier+'\u201D. Treating as a string.');result=append(result,substitutions[token.substitutionIndex]);continue;}
result=append(result,formatters[token.specifier](substitutions[token.substitutionIndex],token));}
var unusedSubstitutions=[];for(var i=0;i<substitutions.length;++i){if(i in usedSubstitutionIndexes)
continue;unusedSubstitutions.push(substitutions[i]);}
return{formattedResult:result,unusedSubstitutions:unusedSubstitutions};};function createSearchRegex(query,caseSensitive,isRegex){var regexFlags=caseSensitive?'g':'gi';var regexObject;if(isRegex){try{regexObject=new RegExp(query,regexFlags);}catch(e){}}
if(!regexObject)
regexObject=createPlainTextSearchRegex(query,regexFlags);return regexObject;}
function createPlainTextSearchRegex(query,flags){var regexSpecialCharacters=String.regexSpecialCharacters();var regex='';for(var i=0;i<query.length;++i){var c=query.charAt(i);if(regexSpecialCharacters.indexOf(c)!==-1)
regex+='\\';regex+=c;}
return new RegExp(regex,flags||'');}
function countRegexMatches(regex,content){var text=content;var result=0;var match;while(text&&(match=regex.exec(text))){if(match[0].length>0)
++result;text=text.substring(match.index+1);}
return result;}
function spacesPadding(spacesCount){return'\u00a0'.repeat(spacesCount);}
function numberToStringWithSpacesPadding(value,symbolsCount){var numberString=value.toString();var paddingLength=Math.max(0,symbolsCount-numberString.length);return spacesPadding(paddingLength)+numberString;}
Set.prototype.valuesArray=function(){return Array.from(this.values());};Set.prototype.addAll=function(iterable){for(var e of iterable)
this.add(e);};Set.prototype.containsAll=function(iterable){for(var e of iterable){if(!this.has(e))
return false;}
return true;};Map.prototype.remove=function(key){var value=this.get(key);this.delete(key);return value;};Map.prototype.valuesArray=function(){return Array.from(this.values());};Map.prototype.keysArray=function(){return Array.from(this.keys());};Map.prototype.inverse=function(){var result=new Multimap();for(var key of this.keys()){var value=this.get(key);result.set(value,key);}
return result;};var Multimap=function(){this._map=new Map();};Multimap.prototype={set:function(key,value){var set=this._map.get(key);if(!set){set=new Set();this._map.set(key,set);}
set.add(value);},get:function(key){var result=this._map.get(key);if(!result)
result=new Set();return result;},has:function(key){return this._map.has(key);},hasValue:function(key,value){var set=this._map.get(key);if(!set)
return false;return set.has(value);},get size(){return this._map.size;},remove:function(key,value){var values=this.get(key);values.delete(value);if(!values.size)
this._map.delete(key);},removeAll:function(key){this._map.delete(key);},keysArray:function(){return this._map.keysArray();},valuesArray:function(){var result=[];var keys=this.keysArray();for(var i=0;i<keys.length;++i)
result.pushAll(this.get(keys[i]).valuesArray());return result;},clear:function(){this._map.clear();}};function loadXHR(url){return new Promise(load);function load(successCallback,failureCallback){function onReadyStateChanged(){if(xhr.readyState!==XMLHttpRequest.DONE)
return;if(xhr.status!==200){xhr.onreadystatechange=null;failureCallback(new Error(xhr.status));return;}
xhr.onreadystatechange=null;successCallback(xhr.responseText);}
var xhr=new XMLHttpRequest();xhr.withCredentials=false;xhr.open('GET',url,true);xhr.onreadystatechange=onReadyStateChanged;xhr.send(null);}}
var CallbackBarrier=class{constructor(){this._pendingIncomingCallbacksCount=0;}
createCallback(userCallback){console.assert(!this._outgoingCallback,'CallbackBarrier.createCallback() is called after CallbackBarrier.callWhenDone()');++this._pendingIncomingCallbacksCount;return this._incomingCallback.bind(this,userCallback);}
callWhenDone(callback){console.assert(!this._outgoingCallback,'CallbackBarrier.callWhenDone() is called multiple times');this._outgoingCallback=callback;if(!this._pendingIncomingCallbacksCount)
this._outgoingCallback();}
donePromise(){return new Promise(promiseConstructor.bind(this));function promiseConstructor(success){this.callWhenDone(success);}}
_incomingCallback(userCallback){console.assert(this._pendingIncomingCallbacksCount>0);if(userCallback){var args=Array.prototype.slice.call(arguments,1);userCallback.apply(null,args);}
if(!--this._pendingIncomingCallbacksCount&&this._outgoingCallback)
this._outgoingCallback();}};function suppressUnused(value){}
self.setImmediate=function(callback){const args=[...arguments].slice(1);Promise.resolve().then(()=>callback(...args));return 0;};Promise.prototype.spread=function(callback){return this.then(spreadPromise);function spreadPromise(arg){return callback.apply(null,arg);}};Promise.prototype.catchException=function(defaultValue){return this.catch(function(error){console.error(error);return defaultValue;});};Map.prototype.diff=function(other,isEqual){var leftKeys=this.keysArray();var rightKeys=other.keysArray();leftKeys.sort((a,b)=>a-b);rightKeys.sort((a,b)=>a-b);var removed=[];var added=[];var equal=[];var leftIndex=0;var rightIndex=0;while(leftIndex<leftKeys.length&&rightIndex<rightKeys.length){var leftKey=leftKeys[leftIndex];var rightKey=rightKeys[rightIndex];if(leftKey===rightKey&&isEqual(this.get(leftKey),other.get(rightKey))){equal.push(this.get(leftKey));++leftIndex;++rightIndex;continue;}
if(leftKey<=rightKey){removed.push(this.get(leftKey));++leftIndex;continue;}
added.push(other.get(rightKey));++rightIndex;}
while(leftIndex<leftKeys.length){var leftKey=leftKeys[leftIndex++];removed.push(this.get(leftKey));}
while(rightIndex<rightKeys.length){var rightKey=rightKeys[rightIndex++];added.push(other.get(rightKey));}
return{added:added,removed:removed,equal:equal};};function runOnWindowLoad(callback){function windowLoaded(){self.removeEventListener('DOMContentLoaded',windowLoaded,false);callback();}
if(document.readyState==='complete'||document.readyState==='interactive')
callback();else
self.addEventListener('DOMContentLoaded',windowLoaded,false);};self['Common']=self['Common']||{};Common.Worker=class{constructor(appName){var url=appName+'.js';url+=Runtime.queryParamsString();this._workerPromise=new Promise(fulfill=>{this._worker=new Worker(url);this._worker.onmessage=onMessage.bind(this);function onMessage(event){console.assert(event.data==='workerReady');this._worker.onmessage=null;fulfill(this._worker);this._worker=null;}});}
postMessage(message){this._workerPromise.then(worker=>{if(!this._disposed)
worker.postMessage(message);});}
dispose(){this._disposed=true;this._workerPromise.then(worker=>worker.terminate());}
terminate(){this.dispose();}
set onmessage(listener){this._workerPromise.then(worker=>worker.onmessage=listener);}
set onerror(listener){this._workerPromise.then(worker=>worker.onerror=listener);}};;Common.TextDictionary=class{constructor(){this._words=new Map();this._index=new Common.Trie();}
addWord(word){var count=this._words.get(word)||0;++count;this._words.set(word,count);this._index.add(word);}
removeWord(word){var count=this._words.get(word)||0;if(!count)
return;if(count===1){this._words.delete(word);this._index.remove(word);return;}
--count;this._words.set(word,count);}
wordsWithPrefix(prefix){return this._index.words(prefix);}
hasWord(word){return this._words.has(word);}
wordCount(word){return this._words.get(word)||0;}
reset(){this._words.clear();this._index.clear();}};;Common.Object=class{constructor(){this._listeners;}
addEventListener(eventType,listener,thisObject){if(!listener)
console.assert(false);if(!this._listeners)
this._listeners=new Map();if(!this._listeners.has(eventType))
this._listeners.set(eventType,[]);this._listeners.get(eventType).push({thisObject:thisObject,listener:listener});return new Common.EventTarget.EventDescriptor(this,eventType,thisObject,listener);}
removeEventListener(eventType,listener,thisObject){console.assert(listener);if(!this._listeners||!this._listeners.has(eventType))
return;var listeners=this._listeners.get(eventType);for(var i=0;i<listeners.length;++i){if(listeners[i].listener===listener&&listeners[i].thisObject===thisObject)
listeners.splice(i--,1);}
if(!listeners.length)
this._listeners.delete(eventType);}
hasEventListeners(eventType){return!!(this._listeners&&this._listeners.has(eventType));}
dispatchEventToListeners(eventType,eventData){if(!this._listeners||!this._listeners.has(eventType))
return;var event=new Common.Event(eventData);var listeners=this._listeners.get(eventType).slice(0);for(var i=0;i<listeners.length;++i)
listeners[i].listener.call(listeners[i].thisObject,event);}
on(eventType,listener,thisObject){if(!this._listeners)
this._listeners=new Map();if(!this._listeners.has(eventType))
this._listeners.set(eventType,[]);this._listeners.get(eventType).push({thisObject:thisObject,listener:listener});return new Common.EventTarget.TypedEventDescriptor(this,eventType,thisObject,listener);}
off(eventType,listener,thisObject){if(!this._listeners||!this._listeners.has(eventType))
return;var listeners=this._listeners.get(eventType);for(var i=0;i<listeners.length;++i){if(listeners[i].listener===listener&&listeners[i].thisObject===thisObject)
listeners.splice(i--,1);}
if(!listeners.length)
this._listeners.delete(eventType);}
emit(event){var eventType=event.constructor;if(!this._listeners||!this._listeners.has(eventType))
return;var listeners=this._listeners.get(eventType).slice(0);for(var i=0;i<listeners.length;++i)
listeners[i].listener.call(listeners[i].thisObject,event);}};Common.Emittable=function(){};Common.Object._listenerCallbackTuple;Common.Event=class{constructor(data){this.data=data;}};Common.EventTarget=function(){};Common.EventTarget.EventDescriptorStruct=class{constructor(){this.eventTarget;this.eventType;this.receiver;this.method;}};Common.EventTarget.EventDescriptor=class{constructor(eventTarget,eventType,receiver,method){this.eventTarget=eventTarget;this.eventType=eventType;this.receiver=receiver;this.method=method;}};Common.EventTarget.TypedEventDescriptor=class{constructor(eventTarget,eventType,receiver,method){this.eventTarget=eventTarget;this.eventType=eventType;this.receiver=receiver;this.method=method;}};Common.EventTarget.removeEventListeners=function(eventList){for(var i=0;i<eventList.length;++i){if(eventList[i]instanceof Common.EventTarget.EventDescriptor){var eventInfo=(eventList[i]);eventInfo.eventTarget.removeEventListener(eventInfo.eventType,eventInfo.method,eventInfo.receiver);}else{var eventInfo=(eventList[i]);eventInfo.eventTarget.off(eventInfo.eventType,eventInfo.method,eventInfo.receiver);}}
eventList.splice(0,eventList.length);};Common.EventTarget.prototype={addEventListener(eventType,listener,thisObject){},removeEventListener(eventType,listener,thisObject){},hasEventListeners(eventType){},dispatchEventToListeners(eventType,eventData){},on(eventType,listener,thisObject){},off(eventType,listener,thisObject){},emit(event){},};;Common.Color=class{constructor(rgba,format,originalText){this._rgba=rgba;this._originalText=originalText||null;this._originalTextIsValid=!!this._originalText;this._format=format;if(typeof this._rgba[3]==='undefined')
this._rgba[3]=1;for(var i=0;i<4;++i){if(this._rgba[i]<0){this._rgba[i]=0;this._originalTextIsValid=false;}
if(this._rgba[i]>1){this._rgba[i]=1;this._originalTextIsValid=false;}}}
static parse(text){var value=text.toLowerCase().replace(/\s+/g,'');var simple=/^(?:#([0-9a-f]{3}|[0-9a-f]{6})|rgb\(((?:-?\d+%?,){2}-?\d+%?)\)|(\w+)|hsl\((-?\d+\.?\d*(?:,-?\d+\.?\d*%){2})\))$/i;var match=value.match(simple);if(match){if(match[1]){var hex=match[1].toLowerCase();var format;if(hex.length===3){format=Common.Color.Format.ShortHEX;hex=hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);}else{format=Common.Color.Format.HEX;}
var r=parseInt(hex.substring(0,2),16);var g=parseInt(hex.substring(2,4),16);var b=parseInt(hex.substring(4,6),16);return new Common.Color([r/255,g/255,b/255,1],format,text);}
if(match[2]){var rgbString=match[2].split(/\s*,\s*/);var rgba=[Common.Color._parseRgbNumeric(rgbString[0]),Common.Color._parseRgbNumeric(rgbString[1]),Common.Color._parseRgbNumeric(rgbString[2]),1];return new Common.Color(rgba,Common.Color.Format.RGB,text);}
if(match[3]){var nickname=match[3].toLowerCase();if(nickname in Common.Color.Nicknames){var rgba=Common.Color.Nicknames[nickname];var color=Common.Color.fromRGBA(rgba);color._format=Common.Color.Format.Nickname;color._originalText=text;return color;}
return null;}
if(match[4]){var hslString=match[4].replace(/%/g,'').split(/\s*,\s*/);var hsla=[Common.Color._parseHueNumeric(hslString[0]),Common.Color._parseSatLightNumeric(hslString[1]),Common.Color._parseSatLightNumeric(hslString[2]),1];var rgba=[];Common.Color.hsl2rgb(hsla,rgba);return new Common.Color(rgba,Common.Color.Format.HSL,text);}
return null;}
var advanced=/^(?:rgba\(((?:-?\d+%?,){3}-?(?:\d+|\d*\.\d+))\)|hsla\((-?(?:\d+|\d*\.\d+)(?:,-?(?:\d+|\d*\.\d+)*%){2},-?(?:\d+|\d*\.\d+))\))$/;match=value.match(advanced);if(match){if(match[1]){var rgbaString=match[1].split(/\s*,\s*/);var rgba=[Common.Color._parseRgbNumeric(rgbaString[0]),Common.Color._parseRgbNumeric(rgbaString[1]),Common.Color._parseRgbNumeric(rgbaString[2]),Common.Color._parseAlphaNumeric(rgbaString[3])];return new Common.Color(rgba,Common.Color.Format.RGBA,text);}
if(match[2]){var hslaString=match[2].replace(/%/g,'').split(/\s*,\s*/);var hsla=[Common.Color._parseHueNumeric(hslaString[0]),Common.Color._parseSatLightNumeric(hslaString[1]),Common.Color._parseSatLightNumeric(hslaString[2]),Common.Color._parseAlphaNumeric(hslaString[3])];var rgba=[];Common.Color.hsl2rgb(hsla,rgba);return new Common.Color(rgba,Common.Color.Format.HSLA,text);}}
return null;}
static fromRGBA(rgba){return new Common.Color([rgba[0]/255,rgba[1]/255,rgba[2]/255,rgba[3]],Common.Color.Format.RGBA);}
static fromHSVA(hsva){var rgba=[];Common.Color.hsva2rgba(hsva,rgba);return new Common.Color(rgba,Common.Color.Format.HSLA);}
static _parseRgbNumeric(value){var parsed=parseInt(value,10);if(value.indexOf('%')!==-1)
parsed/=100;else
parsed/=255;return parsed;}
static _parseHueNumeric(value){return isNaN(value)?0:(parseFloat(value)/360)%1;}
static _parseSatLightNumeric(value){return Math.min(1,parseFloat(value)/100);}
static _parseAlphaNumeric(value){return isNaN(value)?0:parseFloat(value);}
static _hsva2hsla(hsva,out_hsla){var h=hsva[0];var s=hsva[1];var v=hsva[2];var t=(2-s)*v;if(v===0||s===0)
s=0;else
s*=v/(t<1?t:2-t);out_hsla[0]=h;out_hsla[1]=s;out_hsla[2]=t/2;out_hsla[3]=hsva[3];}
static hsl2rgb(hsl,out_rgb){var h=hsl[0];var s=hsl[1];var l=hsl[2];function hue2rgb(p,q,h){if(h<0)
h+=1;else if(h>1)
h-=1;if((h*6)<1)
return p+(q-p)*h*6;else if((h*2)<1)
return q;else if((h*3)<2)
return p+(q-p)*((2/3)-h)*6;else
return p;}
if(s<0)
s=0;if(l<=0.5)
var q=l*(1+s);else
var q=l+s-(l*s);var p=2*l-q;var tr=h+(1/3);var tg=h;var tb=h-(1/3);out_rgb[0]=hue2rgb(p,q,tr);out_rgb[1]=hue2rgb(p,q,tg);out_rgb[2]=hue2rgb(p,q,tb);out_rgb[3]=hsl[3];}
static hsva2rgba(hsva,out_rgba){Common.Color._hsva2hsla(hsva,Common.Color.hsva2rgba._tmpHSLA);Common.Color.hsl2rgb(Common.Color.hsva2rgba._tmpHSLA,out_rgba);for(var i=0;i<Common.Color.hsva2rgba._tmpHSLA.length;i++)
Common.Color.hsva2rgba._tmpHSLA[i]=0;}
static luminance(rgba){var rSRGB=rgba[0];var gSRGB=rgba[1];var bSRGB=rgba[2];var r=rSRGB<=0.03928?rSRGB/12.92:Math.pow(((rSRGB+0.055)/1.055),2.4);var g=gSRGB<=0.03928?gSRGB/12.92:Math.pow(((gSRGB+0.055)/1.055),2.4);var b=bSRGB<=0.03928?bSRGB/12.92:Math.pow(((bSRGB+0.055)/1.055),2.4);return 0.2126*r+0.7152*g+0.0722*b;}
static blendColors(fgRGBA,bgRGBA,out_blended){var alpha=fgRGBA[3];out_blended[0]=((1-alpha)*bgRGBA[0])+(alpha*fgRGBA[0]);out_blended[1]=((1-alpha)*bgRGBA[1])+(alpha*fgRGBA[1]);out_blended[2]=((1-alpha)*bgRGBA[2])+(alpha*fgRGBA[2]);out_blended[3]=alpha+(bgRGBA[3]*(1-alpha));}
static calculateContrastRatio(fgRGBA,bgRGBA){Common.Color.blendColors(fgRGBA,bgRGBA,Common.Color.calculateContrastRatio._blendedFg);var fgLuminance=Common.Color.luminance(Common.Color.calculateContrastRatio._blendedFg);var bgLuminance=Common.Color.luminance(bgRGBA);var contrastRatio=(Math.max(fgLuminance,bgLuminance)+0.05)/(Math.min(fgLuminance,bgLuminance)+0.05);for(var i=0;i<Common.Color.calculateContrastRatio._blendedFg.length;i++)
Common.Color.calculateContrastRatio._blendedFg[i]=0;return contrastRatio;}
static desiredLuminance(luminance,contrast,lighter){function computeLuminance(){if(lighter)
return(luminance+0.05)*contrast-0.05;else
return(luminance+0.05)/contrast-0.05;}
var desiredLuminance=computeLuminance();if(desiredLuminance<0||desiredLuminance>1){lighter=!lighter;desiredLuminance=computeLuminance();}
return desiredLuminance;}
static detectColorFormat(color){const cf=Common.Color.Format;var format;var formatSetting=Common.moduleSetting('colorFormat').get();if(formatSetting===cf.Original)
format=cf.Original;else if(formatSetting===cf.RGB)
format=(color.hasAlpha()?cf.RGBA:cf.RGB);else if(formatSetting===cf.HSL)
format=(color.hasAlpha()?cf.HSLA:cf.HSL);else if(!color.hasAlpha())
format=(color.canBeShortHex()?cf.ShortHEX:cf.HEX);else
format=cf.RGBA;return format;}
format(){return this._format;}
hsla(){if(this._hsla)
return this._hsla;var r=this._rgba[0];var g=this._rgba[1];var b=this._rgba[2];var max=Math.max(r,g,b);var min=Math.min(r,g,b);var diff=max-min;var add=max+min;if(min===max)
var h=0;else if(r===max)
var h=((1/6*(g-b)/diff)+1)%1;else if(g===max)
var h=(1/6*(b-r)/diff)+1/3;else
var h=(1/6*(r-g)/diff)+2/3;var l=0.5*add;if(l===0)
var s=0;else if(l===1)
var s=0;else if(l<=0.5)
var s=diff/add;else
var s=diff/(2-add);this._hsla=[h,s,l,this._rgba[3]];return this._hsla;}
canonicalHSLA(){var hsla=this.hsla();return[Math.round(hsla[0]*360),Math.round(hsla[1]*100),Math.round(hsla[2]*100),hsla[3]];}
hsva(){var hsla=this.hsla();var h=hsla[0];var s=hsla[1];var l=hsla[2];s*=l<0.5?l:1-l;return[h,s!==0?2*s/(l+s):0,(l+s),hsla[3]];}
hasAlpha(){return this._rgba[3]!==1;}
canBeShortHex(){if(this.hasAlpha())
return false;for(var i=0;i<3;++i){var c=Math.round(this._rgba[i]*255);if(c%17)
return false;}
return true;}
asString(format){if(format===this._format&&this._originalTextIsValid)
return this._originalText;if(!format)
format=this._format;function toRgbValue(value){return Math.round(value*255);}
function toHexValue(value){var hex=Math.round(value*255).toString(16);return hex.length===1?'0'+hex:hex;}
function toShortHexValue(value){return(Math.round(value*255)/17).toString(16);}
switch(format){case Common.Color.Format.Original:return this._originalText;case Common.Color.Format.RGB:if(this.hasAlpha())
return null;return String.sprintf('rgb(%d, %d, %d)',toRgbValue(this._rgba[0]),toRgbValue(this._rgba[1]),toRgbValue(this._rgba[2]));case Common.Color.Format.RGBA:return String.sprintf('rgba(%d, %d, %d, %f)',toRgbValue(this._rgba[0]),toRgbValue(this._rgba[1]),toRgbValue(this._rgba[2]),this._rgba[3]);case Common.Color.Format.HSL:if(this.hasAlpha())
return null;var hsl=this.hsla();return String.sprintf('hsl(%d, %d%, %d%)',Math.round(hsl[0]*360),Math.round(hsl[1]*100),Math.round(hsl[2]*100));case Common.Color.Format.HSLA:var hsla=this.hsla();return String.sprintf('hsla(%d, %d%, %d%, %f)',Math.round(hsla[0]*360),Math.round(hsla[1]*100),Math.round(hsla[2]*100),hsla[3]);case Common.Color.Format.HEX:if(this.hasAlpha())
return null;return String.sprintf('#%s%s%s',toHexValue(this._rgba[0]),toHexValue(this._rgba[1]),toHexValue(this._rgba[2])).toLowerCase();case Common.Color.Format.ShortHEX:if(!this.canBeShortHex())
return null;return String.sprintf('#%s%s%s',toShortHexValue(this._rgba[0]),toShortHexValue(this._rgba[1]),toShortHexValue(this._rgba[2])).toLowerCase();case Common.Color.Format.Nickname:return this.nickname();}
return this._originalText;}
rgba(){return this._rgba.slice();}
canonicalRGBA(){var rgba=new Array(4);for(var i=0;i<3;++i)
rgba[i]=Math.round(this._rgba[i]*255);rgba[3]=this._rgba[3];return rgba;}
nickname(){if(!Common.Color._rgbaToNickname){Common.Color._rgbaToNickname={};for(var nickname in Common.Color.Nicknames){var rgba=Common.Color.Nicknames[nickname];if(rgba.length!==4)
rgba=rgba.concat(1);Common.Color._rgbaToNickname[rgba]=nickname;}}
return Common.Color._rgbaToNickname[this.canonicalRGBA()]||null;}
toProtocolRGBA(){var rgba=this.canonicalRGBA();var result={r:rgba[0],g:rgba[1],b:rgba[2]};if(rgba[3]!==1)
result.a=rgba[3];return result;}
invert(){var rgba=[];rgba[0]=1-this._rgba[0];rgba[1]=1-this._rgba[1];rgba[2]=1-this._rgba[2];rgba[3]=this._rgba[3];return new Common.Color(rgba,Common.Color.Format.RGBA);}
setAlpha(alpha){var rgba=this._rgba.slice();rgba[3]=alpha;return new Common.Color(rgba,Common.Color.Format.RGBA);}};Common.Color.Regex=/((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b[a-zA-Z]+\b(?!-))/g;Common.Color.Format={Original:'original',Nickname:'nickname',HEX:'hex',ShortHEX:'shorthex',RGB:'rgb',RGBA:'rgba',HSL:'hsl',HSLA:'hsla'};Common.Color.hsva2rgba._tmpHSLA=[0,0,0,0];Common.Color.calculateContrastRatio._blendedFg=[0,0,0,0];Common.Color.Nicknames={'aliceblue':[240,248,255],'antiquewhite':[250,235,215],'aqua':[0,255,255],'aquamarine':[127,255,212],'azure':[240,255,255],'beige':[245,245,220],'bisque':[255,228,196],'black':[0,0,0],'blanchedalmond':[255,235,205],'blue':[0,0,255],'blueviolet':[138,43,226],'brown':[165,42,42],'burlywood':[222,184,135],'cadetblue':[95,158,160],'chartreuse':[127,255,0],'chocolate':[210,105,30],'coral':[255,127,80],'cornflowerblue':[100,149,237],'cornsilk':[255,248,220],'crimson':[237,20,61],'cyan':[0,255,255],'darkblue':[0,0,139],'darkcyan':[0,139,139],'darkgoldenrod':[184,134,11],'darkgray':[169,169,169],'darkgrey':[169,169,169],'darkgreen':[0,100,0],'darkkhaki':[189,183,107],'darkmagenta':[139,0,139],'darkolivegreen':[85,107,47],'darkorange':[255,140,0],'darkorchid':[153,50,204],'darkred':[139,0,0],'darksalmon':[233,150,122],'darkseagreen':[143,188,143],'darkslateblue':[72,61,139],'darkslategray':[47,79,79],'darkslategrey':[47,79,79],'darkturquoise':[0,206,209],'darkviolet':[148,0,211],'deeppink':[255,20,147],'deepskyblue':[0,191,255],'dimgray':[105,105,105],'dimgrey':[105,105,105],'dodgerblue':[30,144,255],'firebrick':[178,34,34],'floralwhite':[255,250,240],'forestgreen':[34,139,34],'fuchsia':[255,0,255],'gainsboro':[220,220,220],'ghostwhite':[248,248,255],'gold':[255,215,0],'goldenrod':[218,165,32],'gray':[128,128,128],'grey':[128,128,128],'green':[0,128,0],'greenyellow':[173,255,47],'honeydew':[240,255,240],'hotpink':[255,105,180],'indianred':[205,92,92],'indigo':[75,0,130],'ivory':[255,255,240],'khaki':[240,230,140],'lavender':[230,230,250],'lavenderblush':[255,240,245],'lawngreen':[124,252,0],'lemonchiffon':[255,250,205],'lightblue':[173,216,230],'lightcoral':[240,128,128],'lightcyan':[224,255,255],'lightgoldenrodyellow':[250,250,210],'lightgreen':[144,238,144],'lightgray':[211,211,211],'lightgrey':[211,211,211],'lightpink':[255,182,193],'lightsalmon':[255,160,122],'lightseagreen':[32,178,170],'lightskyblue':[135,206,250],'lightslategray':[119,136,153],'lightslategrey':[119,136,153],'lightsteelblue':[176,196,222],'lightyellow':[255,255,224],'lime':[0,255,0],'limegreen':[50,205,50],'linen':[250,240,230],'magenta':[255,0,255],'maroon':[128,0,0],'mediumaquamarine':[102,205,170],'mediumblue':[0,0,205],'mediumorchid':[186,85,211],'mediumpurple':[147,112,219],'mediumseagreen':[60,179,113],'mediumslateblue':[123,104,238],'mediumspringgreen':[0,250,154],'mediumturquoise':[72,209,204],'mediumvioletred':[199,21,133],'midnightblue':[25,25,112],'mintcream':[245,255,250],'mistyrose':[255,228,225],'moccasin':[255,228,181],'navajowhite':[255,222,173],'navy':[0,0,128],'oldlace':[253,245,230],'olive':[128,128,0],'olivedrab':[107,142,35],'orange':[255,165,0],'orangered':[255,69,0],'orchid':[218,112,214],'palegoldenrod':[238,232,170],'palegreen':[152,251,152],'paleturquoise':[175,238,238],'palevioletred':[219,112,147],'papayawhip':[255,239,213],'peachpuff':[255,218,185],'peru':[205,133,63],'pink':[255,192,203],'plum':[221,160,221],'powderblue':[176,224,230],'purple':[128,0,128],'rebeccapurple':[102,51,153],'red':[255,0,0],'rosybrown':[188,143,143],'royalblue':[65,105,225],'saddlebrown':[139,69,19],'salmon':[250,128,114],'sandybrown':[244,164,96],'seagreen':[46,139,87],'seashell':[255,245,238],'sienna':[160,82,45],'silver':[192,192,192],'skyblue':[135,206,235],'slateblue':[106,90,205],'slategray':[112,128,144],'slategrey':[112,128,144],'snow':[255,250,250],'springgreen':[0,255,127],'steelblue':[70,130,180],'tan':[210,180,140],'teal':[0,128,128],'thistle':[216,191,216],'tomato':[255,99,71],'turquoise':[64,224,208],'violet':[238,130,238],'wheat':[245,222,179],'white':[255,255,255],'whitesmoke':[245,245,245],'yellow':[255,255,0],'yellowgreen':[154,205,50],'transparent':[0,0,0,0],};Common.Color.PageHighlight={Content:Common.Color.fromRGBA([111,168,220,.66]),ContentLight:Common.Color.fromRGBA([111,168,220,.5]),ContentOutline:Common.Color.fromRGBA([9,83,148]),Padding:Common.Color.fromRGBA([147,196,125,.55]),PaddingLight:Common.Color.fromRGBA([147,196,125,.4]),Border:Common.Color.fromRGBA([255,229,153,.66]),BorderLight:Common.Color.fromRGBA([255,229,153,.5]),Margin:Common.Color.fromRGBA([246,178,107,.66]),MarginLight:Common.Color.fromRGBA([246,178,107,.5]),EventTarget:Common.Color.fromRGBA([255,196,196,.66]),Shape:Common.Color.fromRGBA([96,82,177,0.8]),ShapeMargin:Common.Color.fromRGBA([96,82,127,.6])};;Common.Console=class extends Common.Object{constructor(){super();this._messages=[];}
addMessage(text,level,show){var message=new Common.Console.Message(text,level||Common.Console.MessageLevel.Info,Date.now(),show||false);this._messages.push(message);this.dispatchEventToListeners(Common.Console.Events.MessageAdded,message);}
log(text){this.addMessage(text,Common.Console.MessageLevel.Info);}
warn(text){this.addMessage(text,Common.Console.MessageLevel.Warning);}
error(text){this.addMessage(text,Common.Console.MessageLevel.Error,true);}
messages(){return this._messages;}
show(){this.showPromise();}
showPromise(){return Common.Revealer.revealPromise(this);}};Common.Console.Events={MessageAdded:Symbol('messageAdded')};Common.Console.MessageLevel={Info:'info',Warning:'warning',Error:'error'};Common.Console.Message=class{constructor(text,level,timestamp,show){this.text=text;this.level=level;this.timestamp=(typeof timestamp==='number')?timestamp:Date.now();this.show=show;}};Common.console=new Common.Console();;Common.ContentProvider=function(){};Common.ContentProvider.prototype={contentURL(){},contentType(){},requestContent(){},searchInContent(query,caseSensitive,isRegex,callback){}};Common.ContentProvider.SearchMatch=class{constructor(lineNumber,lineContent){this.lineNumber=lineNumber;this.lineContent=lineContent;}};Common.ContentProvider.performSearchInContent=function(content,query,caseSensitive,isRegex){var regex=createSearchRegex(query,caseSensitive,isRegex);var text=new Common.Text(content);var result=[];for(var i=0;i<text.lineCount();++i){var lineContent=text.lineAt(i);regex.lastIndex=0;if(regex.exec(lineContent))
result.push(new Common.ContentProvider.SearchMatch(i,lineContent));}
return result;};Common.ContentProvider.contentAsDataURL=function(content,mimeType,contentEncoded,charset){const maxDataUrlSize=1024*1024;if(content===null||content.length>maxDataUrlSize)
return null;return'data:'+mimeType+(charset?';charset='+charset:'')+(contentEncoded?';base64':'')+','+
content;};;Common.ParsedURL=class{constructor(url){this.isValid=false;this.url=url;this.scheme='';this.host='';this.port='';this.path='';this.queryParams='';this.fragment='';this.folderPathComponents='';this.lastPathComponent='';var match=url.match(Common.ParsedURL._urlRegex());if(match){this.isValid=true;this.scheme=match[1].toLowerCase();this.host=match[2];this.port=match[3];this.path=match[4]||'/';this.queryParams=match[5]||'';this.fragment=match[6];}else{if(this.url.startsWith('data:')){this.scheme='data';return;}
if(this.url==='about:blank'){this.scheme='about';return;}
this.path=this.url;}
var lastSlashIndex=this.path.lastIndexOf('/');if(lastSlashIndex!==-1){this.folderPathComponents=this.path.substring(0,lastSlashIndex);this.lastPathComponent=this.path.substring(lastSlashIndex+1);}else{this.lastPathComponent=this.path;}}
static platformPathToURL(fileSystemPath){fileSystemPath=fileSystemPath.replace(/\\/g,'/');if(!fileSystemPath.startsWith('file://')){if(fileSystemPath.startsWith('/'))
fileSystemPath='file://'+fileSystemPath;else
fileSystemPath='file:///'+fileSystemPath;}
return fileSystemPath;}
static _urlRegex(){if(Common.ParsedURL._urlRegexInstance)
return Common.ParsedURL._urlRegexInstance;var schemeRegex=/([A-Za-z][A-Za-z0-9+.-]*):\/\//;var hostRegex=/([^\s\/:]*)/;var portRegex=/(?::([\d]+))?/;var pathRegex=/(\/[^#?]*)?/;var queryRegex=/(?:\?([^#]*))?/;var fragmentRegex=/(?:#(.*))?/;Common.ParsedURL._urlRegexInstance=new RegExp('^'+schemeRegex.source+hostRegex.source+portRegex.source+pathRegex.source+queryRegex.source+
fragmentRegex.source+'$');return Common.ParsedURL._urlRegexInstance;}
static extractPath(url){var parsedURL=url.asParsedURL();return parsedURL?parsedURL.path:'';}
static extractOrigin(url){var parsedURL=url.asParsedURL();return parsedURL?parsedURL.securityOrigin():'';}
static extractExtension(url){var lastIndexOfDot=url.lastIndexOf('.');var extension=lastIndexOfDot!==-1?url.substr(lastIndexOfDot+1):'';var indexOfQuestionMark=extension.indexOf('?');if(indexOfQuestionMark!==-1)
extension=extension.substr(0,indexOfQuestionMark);return extension;}
static extractName(url){var index=url.lastIndexOf('/');return index!==-1?url.substr(index+1):url;}
static completeURL(baseURL,href){var trimmedHref=href.trim();if(trimmedHref.startsWith('data:')||trimmedHref.startsWith('blob:')||trimmedHref.startsWith('javascript:'))
return href;var parsedHref=trimmedHref.asParsedURL();if(parsedHref&&parsedHref.scheme)
return trimmedHref;var parsedURL=baseURL.asParsedURL();if(!parsedURL)
return null;if(parsedURL.isDataURL())
return href;if(href.length>1&&href.charAt(0)==='/'&&href.charAt(1)==='/'){return parsedURL.scheme+':'+href;}
var securityOrigin=parsedURL.securityOrigin();var pathText=parsedURL.path;var queryText=parsedURL.queryParams?'?'+parsedURL.queryParams:'';if(!href.length)
return securityOrigin+pathText+queryText;if(href.charAt(0)==='#')
return securityOrigin+pathText+queryText+href;if(href.charAt(0)==='?')
return securityOrigin+pathText+href;var hrefPath=href.match(/^[^#?]*/)[0];var hrefSuffix=href.substring(hrefPath.length);if(hrefPath.charAt(0)!=='/')
hrefPath=parsedURL.folderPathComponents+'/'+hrefPath;return securityOrigin+Runtime.normalizePath(hrefPath)+hrefSuffix;}
static splitLineAndColumn(string){var lineColumnRegEx=/(?::(\d+))?(?::(\d+))?$/;var lineColumnMatch=lineColumnRegEx.exec(string);var lineNumber;var columnNumber;console.assert(lineColumnMatch);if(typeof(lineColumnMatch[1])==='string'){lineNumber=parseInt(lineColumnMatch[1],10);lineNumber=isNaN(lineNumber)?undefined:lineNumber-1;}
if(typeof(lineColumnMatch[2])==='string'){columnNumber=parseInt(lineColumnMatch[2],10);columnNumber=isNaN(columnNumber)?undefined:columnNumber-1;}
return{url:string.substring(0,string.length-lineColumnMatch[0].length),lineNumber:lineNumber,columnNumber:columnNumber};}
static isRelativeURL(url){return!(/^[A-Za-z][A-Za-z0-9+.-]*:/.test(url));}
get displayName(){if(this._displayName)
return this._displayName;if(this.isDataURL())
return this.dataURLDisplayName();if(this.isAboutBlank())
return this.url;this._displayName=this.lastPathComponent;if(!this._displayName)
this._displayName=(this.host||'')+'/';if(this._displayName==='/')
this._displayName=this.url;return this._displayName;}
dataURLDisplayName(){if(this._dataURLDisplayName)
return this._dataURLDisplayName;if(!this.isDataURL())
return'';this._dataURLDisplayName=this.url.trimEnd(20);return this._dataURLDisplayName;}
isAboutBlank(){return this.url==='about:blank';}
isDataURL(){return this.scheme==='data';}
lastPathComponentWithFragment(){return this.lastPathComponent+(this.fragment?'#'+this.fragment:'');}
domain(){if(this.isDataURL())
return'data:';return this.host+(this.port?':'+this.port:'');}
securityOrigin(){if(this.isDataURL())
return'data:';return this.scheme+'://'+this.domain();}
urlWithoutScheme(){if(this.scheme&&this.url.startsWith(this.scheme+'://'))
return this.url.substring(this.scheme.length+3);return this.url;}};String.prototype.asParsedURL=function(){var parsedURL=new Common.ParsedURL(this.toString());if(parsedURL.isValid)
return parsedURL;return null;};;Common.Progress=function(){};Common.Progress.prototype={setTotalWork(totalWork){},setTitle(title){},setWorked(worked,title){},worked(worked){},done(){},isCanceled(){return false;},};Common.CompositeProgress=class{constructor(parent){this._parent=parent;this._children=[];this._childrenDone=0;this._parent.setTotalWork(1);this._parent.setWorked(0);}
_childDone(){if(++this._childrenDone!==this._children.length)
return;this._parent.done();}
createSubProgress(weight){var child=new Common.SubProgress(this,weight);this._children.push(child);return child;}
_update(){var totalWeights=0;var done=0;for(var i=0;i<this._children.length;++i){var child=this._children[i];if(child._totalWork)
done+=child._weight*child._worked/child._totalWork;totalWeights+=child._weight;}
this._parent.setWorked(done/totalWeights);}};Common.SubProgress=class{constructor(composite,weight){this._composite=composite;this._weight=weight||1;this._worked=0;}
isCanceled(){return this._composite._parent.isCanceled();}
setTitle(title){this._composite._parent.setTitle(title);}
done(){this.setWorked(this._totalWork);this._composite._childDone();}
setTotalWork(totalWork){this._totalWork=totalWork;this._composite._update();}
setWorked(worked,title){this._worked=worked;if(typeof title!=='undefined')
this.setTitle(title);this._composite._update();}
worked(worked){this.setWorked(this._worked+(worked||1));}};Common.ProgressProxy=class{constructor(delegate,doneCallback){this._delegate=delegate;this._doneCallback=doneCallback;}
isCanceled(){return this._delegate?this._delegate.isCanceled():false;}
setTitle(title){if(this._delegate)
this._delegate.setTitle(title);}
done(){if(this._delegate)
this._delegate.done();if(this._doneCallback)
this._doneCallback();}
setTotalWork(totalWork){if(this._delegate)
this._delegate.setTotalWork(totalWork);}
setWorked(worked,title){if(this._delegate)
this._delegate.setWorked(worked,title);}
worked(worked){if(this._delegate)
this._delegate.worked(worked);}};;Common.ResourceType=class{constructor(name,title,category,isTextType){this._name=name;this._title=title;this._category=category;this._isTextType=isTextType;}
static mimeFromURL(url){var name=Common.ParsedURL.extractName(url);if(Common.ResourceType._mimeTypeByName.has(name))
return Common.ResourceType._mimeTypeByName.get(name);var ext=Common.ParsedURL.extractExtension(url).toLowerCase();return Common.ResourceType._mimeTypeByExtension.get(ext);}
name(){return this._name;}
title(){return this._title;}
category(){return this._category;}
isTextType(){return this._isTextType;}
isScript(){return this._name==='script'||this._name==='sm-script'||this._name==='snippet';}
hasScripts(){return this.isScript()||this.isDocument();}
isStyleSheet(){return this._name==='stylesheet'||this._name==='sm-stylesheet';}
isDocument(){return this._name==='document';}
isDocumentOrScriptOrStyleSheet(){return this.isDocument()||this.isScript()||this.isStyleSheet();}
isFromSourceMap(){return this._name.startsWith('sm-');}
toString(){return this._name;}
canonicalMimeType(){if(this.isDocument())
return'text/html';if(this.isScript())
return'text/javascript';if(this.isStyleSheet())
return'text/css';return'';}};Common.ResourceCategory=class{constructor(title,shortTitle){this.title=title;this.shortTitle=shortTitle;}};Common.resourceCategories={XHR:new Common.ResourceCategory('XHR and Fetch','XHR'),Script:new Common.ResourceCategory('Scripts','JS'),Stylesheet:new Common.ResourceCategory('Stylesheets','CSS'),Image:new Common.ResourceCategory('Images','Img'),Media:new Common.ResourceCategory('Media','Media'),Font:new Common.ResourceCategory('Fonts','Font'),Document:new Common.ResourceCategory('Documents','Doc'),WebSocket:new Common.ResourceCategory('WebSockets','WS'),Manifest:new Common.ResourceCategory('Manifest','Manifest'),Other:new Common.ResourceCategory('Other','Other')};Common.resourceTypes={XHR:new Common.ResourceType('xhr','XHR',Common.resourceCategories.XHR,true),Fetch:new Common.ResourceType('fetch','Fetch',Common.resourceCategories.XHR,true),EventSource:new Common.ResourceType('eventsource','EventSource',Common.resourceCategories.XHR,true),Script:new Common.ResourceType('script','Script',Common.resourceCategories.Script,true),Snippet:new Common.ResourceType('snippet','Snippet',Common.resourceCategories.Script,true),Stylesheet:new Common.ResourceType('stylesheet','Stylesheet',Common.resourceCategories.Stylesheet,true),Image:new Common.ResourceType('image','Image',Common.resourceCategories.Image,false),Media:new Common.ResourceType('media','Media',Common.resourceCategories.Media,false),Font:new Common.ResourceType('font','Font',Common.resourceCategories.Font,false),Document:new Common.ResourceType('document','Document',Common.resourceCategories.Document,true),TextTrack:new Common.ResourceType('texttrack','TextTrack',Common.resourceCategories.Other,true),WebSocket:new Common.ResourceType('websocket','WebSocket',Common.resourceCategories.WebSocket,false),Other:new Common.ResourceType('other','Other',Common.resourceCategories.Other,false),SourceMapScript:new Common.ResourceType('sm-script','Script',Common.resourceCategories.Script,false),SourceMapStyleSheet:new Common.ResourceType('sm-stylesheet','Stylesheet',Common.resourceCategories.Stylesheet,false),Manifest:new Common.ResourceType('manifest','Manifest',Common.resourceCategories.Manifest,true),};Common.ResourceType._mimeTypeByName=new Map([['Cakefile','text/x-coffeescript']]);Common.ResourceType._mimeTypeByExtension=new Map([['js','text/javascript'],['css','text/css'],['html','text/html'],['htm','text/html'],['xml','application/xml'],['xsl','application/xml'],['asp','application/x-aspx'],['aspx','application/x-aspx'],['jsp','application/x-jsp'],['c','text/x-c++src'],['cc','text/x-c++src'],['cpp','text/x-c++src'],['h','text/x-c++src'],['m','text/x-c++src'],['mm','text/x-c++src'],['coffee','text/x-coffeescript'],['dart','text/javascript'],['ts','text/typescript'],['tsx','text/typescript'],['json','application/json'],['gyp','application/json'],['gypi','application/json'],['cs','text/x-csharp'],['java','text/x-java'],['less','text/x-less'],['php','text/x-php'],['phtml','application/x-httpd-php'],['py','text/x-python'],['sh','text/x-sh'],['scss','text/x-scss'],['vtt','text/vtt'],['ls','text/x-livescript'],['cljs','text/x-clojure'],['cljc','text/x-clojure'],['cljx','text/x-clojure'],['styl','text/x-styl'],['jsx','text/jsx'],['jpeg','image/jpeg'],['jpg','image/jpeg'],['svg','image/svg'],['gif','image/gif'],['webp','image/webp'],['png','image/png'],['ico','image/ico'],['tiff','image/tiff'],['tif','image/tif'],['bmp','image/bmp'],['ttf','font/opentype'],['otf','font/opentype'],['ttc','font/opentype'],['woff','application/font-woff']]);;Common.Settings=class{constructor(globalStorage,localStorage){this._globalStorage=globalStorage;this._localStorage=localStorage;this._sessionStorage=new Common.SettingsStorage({});this._eventSupport=new Common.Object();this._registry=new Map();this._moduleSettings=new Map();self.runtime.extensions('setting').forEach(this._registerModuleSetting.bind(this));}
_registerModuleSetting(extension){var descriptor=extension.descriptor();var settingName=descriptor['settingName'];var isRegex=descriptor['settingType']==='regex';var defaultValue=descriptor['defaultValue'];var storageType;switch(descriptor['storageType']){case('local'):storageType=Common.SettingStorageType.Local;break;case('session'):storageType=Common.SettingStorageType.Session;break;case('global'):storageType=Common.SettingStorageType.Global;break;default:storageType=Common.SettingStorageType.Global;}
var setting=isRegex?this.createRegExpSetting(settingName,defaultValue,undefined,storageType):this.createSetting(settingName,defaultValue,storageType);if(descriptor['title'])
setting.setTitle(descriptor['title']);this._moduleSettings.set(settingName,setting);}
moduleSetting(settingName){var setting=this._moduleSettings.get(settingName);if(!setting)
throw new Error('No setting registered: '+settingName);return setting;}
settingForTest(settingName){var setting=this._registry.get(settingName);if(!setting)
throw new Error('No setting registered: '+settingName);return setting;}
createSetting(key,defaultValue,storageType){var storage=this._storageFromType(storageType);if(!this._registry.get(key))
this._registry.set(key,new Common.Setting(this,key,defaultValue,this._eventSupport,storage));return(this._registry.get(key));}
createLocalSetting(key,defaultValue){return this.createSetting(key,defaultValue,Common.SettingStorageType.Local);}
createRegExpSetting(key,defaultValue,regexFlags,storageType){if(!this._registry.get(key)){this._registry.set(key,new Common.RegExpSetting(this,key,defaultValue,this._eventSupport,this._storageFromType(storageType),regexFlags));}
return(this._registry.get(key));}
clearAll(){this._globalStorage.removeAll();this._localStorage.removeAll();var versionSetting=Common.settings.createSetting(Common.VersionController._currentVersionName,0);versionSetting.set(Common.VersionController.currentVersion);}
_storageFromType(storageType){switch(storageType){case(Common.SettingStorageType.Local):return this._localStorage;case(Common.SettingStorageType.Session):return this._sessionStorage;case(Common.SettingStorageType.Global):return this._globalStorage;}
return this._globalStorage;}};Common.SettingsStorage=class{constructor(object,setCallback,removeCallback,removeAllCallback,storagePrefix){this._object=object;this._setCallback=setCallback||function(){};this._removeCallback=removeCallback||function(){};this._removeAllCallback=removeAllCallback||function(){};this._storagePrefix=storagePrefix||'';}
set(name,value){name=this._storagePrefix+name;this._object[name]=value;this._setCallback(name,value);}
has(name){name=this._storagePrefix+name;return name in this._object;}
get(name){name=this._storagePrefix+name;return this._object[name];}
remove(name){name=this._storagePrefix+name;delete this._object[name];this._removeCallback(name);}
removeAll(){this._object={};this._removeAllCallback();}
_dumpSizes(){Common.console.log('Ten largest settings: ');var sizes={__proto__:null};for(var key in this._object)
sizes[key]=this._object[key].length;var keys=Object.keys(sizes);function comparator(key1,key2){return sizes[key2]-sizes[key1];}
keys.sort(comparator);for(var i=0;i<10&&i<keys.length;++i)
Common.console.log('Setting: \''+keys[i]+'\', size: '+sizes[keys[i]]);}};Common.Setting=class{constructor(settings,name,defaultValue,eventSupport,storage){this._settings=settings;this._name=name;this._defaultValue=defaultValue;this._eventSupport=eventSupport;this._storage=storage;this._title='';}
addChangeListener(listener,thisObject){this._eventSupport.addEventListener(this._name,listener,thisObject);}
removeChangeListener(listener,thisObject){this._eventSupport.removeEventListener(this._name,listener,thisObject);}
get name(){return this._name;}
title(){return this._title;}
setTitle(title){this._title=title;}
get(){if(typeof this._value!=='undefined')
return this._value;this._value=this._defaultValue;if(this._storage.has(this._name)){try{this._value=JSON.parse(this._storage.get(this._name));}catch(e){this._storage.remove(this._name);}}
return this._value;}
set(value){this._value=value;try{var settingString=JSON.stringify(value);try{this._storage.set(this._name,settingString);}catch(e){this._printSettingsSavingError(e.message,this._name,settingString);}}catch(e){Common.console.error('Cannot stringify setting with name: '+this._name+', error: '+e.message);}
this._eventSupport.dispatchEventToListeners(this._name,value);}
remove(){this._settings._registry.delete(this._name);this._settings._moduleSettings.delete(this._name);this._storage.remove(this._name);}
_printSettingsSavingError(message,name,value){var errorMessage='Error saving setting with name: '+this._name+', value length: '+value.length+'. Error: '+message;console.error(errorMessage);Common.console.error(errorMessage);this._storage._dumpSizes();}};Common.RegExpSetting=class extends Common.Setting{constructor(settings,name,defaultValue,eventSupport,storage,regexFlags){super(settings,name,defaultValue?[{pattern:defaultValue}]:[],eventSupport,storage);this._regexFlags=regexFlags;}
get(){var result=[];var items=this.getAsArray();for(var i=0;i<items.length;++i){var item=items[i];if(item.pattern&&!item.disabled)
result.push(item.pattern);}
return result.join('|');}
getAsArray(){return super.get();}
set(value){this.setAsArray([{pattern:value}]);}
setAsArray(value){delete this._regex;super.set(value);}
asRegExp(){if(typeof this._regex!=='undefined')
return this._regex;this._regex=null;try{var pattern=this.get();if(pattern)
this._regex=new RegExp(pattern,this._regexFlags||'');}catch(e){}
return this._regex;}};Common.VersionController=class{updateVersion(){var localStorageVersion=window.localStorage?window.localStorage[Common.VersionController._currentVersionName]:0;var versionSetting=Common.settings.createSetting(Common.VersionController._currentVersionName,0);var currentVersion=Common.VersionController.currentVersion;var oldVersion=versionSetting.get()||parseInt(localStorageVersion||'0',10);if(oldVersion===0){versionSetting.set(currentVersion);return;}
var methodsToRun=this._methodsToRunToUpdateVersion(oldVersion,currentVersion);for(var i=0;i<methodsToRun.length;++i)
this[methodsToRun[i]].call(this);versionSetting.set(currentVersion);}
_methodsToRunToUpdateVersion(oldVersion,currentVersion){var result=[];for(var i=oldVersion;i<currentVersion;++i)
result.push('_updateVersionFrom'+i+'To'+(i+1));return result;}
_updateVersionFrom0To1(){this._clearBreakpointsWhenTooMany(Common.settings.createLocalSetting('breakpoints',[]),500000);}
_updateVersionFrom1To2(){Common.settings.createSetting('previouslyViewedFiles',[]).set([]);}
_updateVersionFrom2To3(){Common.settings.createSetting('fileSystemMapping',{}).set({});Common.settings.createSetting('fileMappingEntries',[]).remove();}
_updateVersionFrom3To4(){var advancedMode=Common.settings.createSetting('showHeaSnapshotObjectsHiddenProperties',false);Common.moduleSetting('showAdvancedHeapSnapshotProperties').set(advancedMode.get());advancedMode.remove();}
_updateVersionFrom4To5(){var settingNames={'FileSystemViewSidebarWidth':'fileSystemViewSplitViewState','elementsSidebarWidth':'elementsPanelSplitViewState','StylesPaneSplitRatio':'stylesPaneSplitViewState','heapSnapshotRetainersViewSize':'heapSnapshotSplitViewState','InspectorView.splitView':'InspectorView.splitViewState','InspectorView.screencastSplitView':'InspectorView.screencastSplitViewState','Inspector.drawerSplitView':'Inspector.drawerSplitViewState','layerDetailsSplitView':'layerDetailsSplitViewState','networkSidebarWidth':'networkPanelSplitViewState','sourcesSidebarWidth':'sourcesPanelSplitViewState','scriptsPanelNavigatorSidebarWidth':'sourcesPanelNavigatorSplitViewState','sourcesPanelSplitSidebarRatio':'sourcesPanelDebuggerSidebarSplitViewState','timeline-details':'timelinePanelDetailsSplitViewState','timeline-split':'timelinePanelRecorsSplitViewState','timeline-view':'timelinePanelTimelineStackSplitViewState','auditsSidebarWidth':'auditsPanelSplitViewState','layersSidebarWidth':'layersPanelSplitViewState','profilesSidebarWidth':'profilesPanelSplitViewState','resourcesSidebarWidth':'resourcesPanelSplitViewState'};var empty={};for(var oldName in settingNames){var newName=settingNames[oldName];var oldNameH=oldName+'H';var newValue=null;var oldSetting=Common.settings.createSetting(oldName,empty);if(oldSetting.get()!==empty){newValue=newValue||{};newValue.vertical={};newValue.vertical.size=oldSetting.get();oldSetting.remove();}
var oldSettingH=Common.settings.createSetting(oldNameH,empty);if(oldSettingH.get()!==empty){newValue=newValue||{};newValue.horizontal={};newValue.horizontal.size=oldSettingH.get();oldSettingH.remove();}
if(newValue)
Common.settings.createSetting(newName,{}).set(newValue);}}
_updateVersionFrom5To6(){var settingNames={'debuggerSidebarHidden':'sourcesPanelSplitViewState','navigatorHidden':'sourcesPanelNavigatorSplitViewState','WebInspector.Drawer.showOnLoad':'Inspector.drawerSplitViewState'};for(var oldName in settingNames){var oldSetting=Common.settings.createSetting(oldName,null);if(oldSetting.get()===null){oldSetting.remove();continue;}
var newName=settingNames[oldName];var invert=oldName==='WebInspector.Drawer.showOnLoad';var hidden=oldSetting.get()!==invert;oldSetting.remove();var showMode=hidden?'OnlyMain':'Both';var newSetting=Common.settings.createSetting(newName,{});var newValue=newSetting.get()||{};newValue.vertical=newValue.vertical||{};newValue.vertical.showMode=showMode;newValue.horizontal=newValue.horizontal||{};newValue.horizontal.showMode=showMode;newSetting.set(newValue);}}
_updateVersionFrom6To7(){var settingNames={'sourcesPanelNavigatorSplitViewState':'sourcesPanelNavigatorSplitViewState','elementsPanelSplitViewState':'elementsPanelSplitViewState','stylesPaneSplitViewState':'stylesPaneSplitViewState','sourcesPanelDebuggerSidebarSplitViewState':'sourcesPanelDebuggerSidebarSplitViewState'};var empty={};for(var name in settingNames){var setting=Common.settings.createSetting(name,empty);var value=setting.get();if(value===empty)
continue;if(value.vertical&&value.vertical.size&&value.vertical.size<1)
value.vertical.size=0;if(value.horizontal&&value.horizontal.size&&value.horizontal.size<1)
value.horizontal.size=0;setting.set(value);}}
_updateVersionFrom7To8(){}
_updateVersionFrom8To9(){var settingNames=['skipStackFramesPattern','workspaceFolderExcludePattern'];for(var i=0;i<settingNames.length;++i){var setting=Common.settings.createSetting(settingNames[i],'');var value=setting.get();if(!value)
return;if(typeof value==='string')
value=[value];for(var j=0;j<value.length;++j){if(typeof value[j]==='string')
value[j]={pattern:value[j]};}
setting.set(value);}}
_updateVersionFrom9To10(){if(!window.localStorage)
return;for(var key in window.localStorage){if(key.startsWith('revision-history'))
window.localStorage.removeItem(key);}}
_updateVersionFrom10To11(){var oldSettingName='customDevicePresets';var newSettingName='customEmulatedDeviceList';var oldSetting=Common.settings.createSetting(oldSettingName,undefined);var list=oldSetting.get();if(!Array.isArray(list))
return;var newList=[];for(var i=0;i<list.length;++i){var value=list[i];var device={};device['title']=value['title'];device['type']='unknown';device['user-agent']=value['userAgent'];device['capabilities']=[];if(value['touch'])
device['capabilities'].push('touch');if(value['mobile'])
device['capabilities'].push('mobile');device['screen']={};device['screen']['vertical']={width:value['width'],height:value['height']};device['screen']['horizontal']={width:value['height'],height:value['width']};device['screen']['device-pixel-ratio']=value['deviceScaleFactor'];device['modes']=[];device['show-by-default']=true;device['show']='Default';newList.push(device);}
if(newList.length)
Common.settings.createSetting(newSettingName,[]).set(newList);oldSetting.remove();}
_updateVersionFrom11To12(){this._migrateSettingsFromLocalStorage();}
_updateVersionFrom12To13(){this._migrateSettingsFromLocalStorage();Common.settings.createSetting('timelineOverviewMode','').remove();}
_updateVersionFrom13To14(){var defaultValue={'throughput':-1,'latency':0};Common.settings.createSetting('networkConditions',defaultValue).set(defaultValue);}
_updateVersionFrom14To15(){var setting=Common.settings.createLocalSetting('workspaceExcludedFolders',{});var oldValue=setting.get();var newValue={};for(var fileSystemPath in oldValue){newValue[fileSystemPath]=[];for(var entry of oldValue[fileSystemPath])
newValue[fileSystemPath].push(entry.path);}
setting.set(newValue);}
_updateVersionFrom15To16(){var setting=Common.settings.createSetting('InspectorView.panelOrder',{});var tabOrders=setting.get();for(var key of Object.keys(tabOrders))
tabOrders[key]=(tabOrders[key]+1)*10;setting.set(tabOrders);}
_updateVersionFrom16To17(){var setting=Common.settings.createSetting('networkConditionsCustomProfiles',[]);var oldValue=setting.get();var newValue=[];if(Array.isArray(oldValue)){for(var preset of oldValue){if(typeof preset.title==='string'&&typeof preset.value==='object'&&typeof preset.value.throughput==='number'&&typeof preset.value.latency==='number'){newValue.push({title:preset.title,value:{download:preset.value.throughput,upload:preset.value.throughput,latency:preset.value.latency}});}}}
setting.set(newValue);}
_updateVersionFrom17To18(){var setting=Common.settings.createLocalSetting('workspaceExcludedFolders',{});var oldValue=setting.get();var newValue={};for(var oldKey in oldValue){var newKey=oldKey.replace(/\\/g,'/');if(!newKey.startsWith('file://')){if(newKey.startsWith('/'))
newKey='file://'+newKey;else
newKey='file:///'+newKey;}
newValue[newKey]=oldValue[oldKey];}
setting.set(newValue);}
_updateVersionFrom18To19(){var defaultColumns={status:true,type:true,initiator:true,size:true,time:true};var visibleColumnSettings=Common.settings.createSetting('networkLogColumnsVisibility',defaultColumns);var visibleColumns=visibleColumnSettings.get();visibleColumns.name=true;visibleColumns.timeline=true;var configs={};for(var columnId in visibleColumns){if(!visibleColumns.hasOwnProperty(columnId))
continue;configs[columnId.toLowerCase()]={visible:visibleColumns[columnId]};}
var newSetting=Common.settings.createSetting('networkLogColumns',{});newSetting.set(configs);visibleColumnSettings.remove();}
_updateVersionFrom19To20(){var oldSetting=Common.settings.createSetting('InspectorView.panelOrder',{});var newSetting=Common.settings.createSetting('panel-tabOrder',{});newSetting.set(oldSetting.get());oldSetting.remove();}
_updateVersionFrom20To21(){var networkColumns=Common.settings.createSetting('networkLogColumns',{});var columns=(networkColumns.get());delete columns['timeline'];delete columns['waterfall'];networkColumns.set(columns);}
_updateVersionFrom21To22(){var breakpointsSetting=Common.settings.createLocalSetting('breakpoints',[]);var breakpoints=breakpointsSetting.get();for(var breakpoint of breakpoints){breakpoint['url']=breakpoint['sourceFileId'];delete breakpoint['sourceFileId'];}
breakpointsSetting.set(breakpoints);}
_updateVersionFrom22To23(){}
_updateVersionFrom23To24(){var oldSetting=Common.settings.createSetting('searchInContentScripts',false);var newSetting=Common.settings.createSetting('searchInAnonymousAndContentScripts',false);newSetting.set(oldSetting.get());oldSetting.remove();}
_migrateSettingsFromLocalStorage(){var localSettings=new Set(['advancedSearchConfig','breakpoints','consoleHistory','domBreakpoints','eventListenerBreakpoints','fileSystemMapping','lastSelectedSourcesSidebarPaneTab','previouslyViewedFiles','savedURLs','watchExpressions','workspaceExcludedFolders','xhrBreakpoints']);if(!window.localStorage)
return;for(var key in window.localStorage){if(localSettings.has(key))
continue;var value=window.localStorage[key];window.localStorage.removeItem(key);Common.settings._globalStorage[key]=value;}}
_clearBreakpointsWhenTooMany(breakpointsSetting,maxBreakpointsCount){if(breakpointsSetting.get().length>maxBreakpointsCount)
breakpointsSetting.set([]);}};Common.VersionController._currentVersionName='inspectorVersion';Common.VersionController.currentVersion=24;Common.settings;Common.SettingStorageType={Global:Symbol('Global'),Local:Symbol('Local'),Session:Symbol('Session')};Common.moduleSetting=function(settingName){return Common.settings.moduleSetting(settingName);};Common.settingForTest=function(settingName){return Common.settings.settingForTest(settingName);};;Common.StaticContentProvider=class{constructor(contentURL,contentType,lazyContent){this._contentURL=contentURL;this._contentType=contentType;this._lazyContent=lazyContent;}
static fromString(contentURL,contentType,content){var lazyContent=()=>Promise.resolve(content);return new Common.StaticContentProvider(contentURL,contentType,lazyContent);}
contentURL(){return this._contentURL;}
contentType(){return this._contentType;}
requestContent(){return this._lazyContent();}
searchInContent(query,caseSensitive,isRegex,callback){function performSearch(content){if(!content){callback(([]));return;}
callback(Common.ContentProvider.performSearchInContent(content,query,caseSensitive,isRegex));}
this._lazyContent().then(performSearch);}};;Common.OutputStream=function(){};Common.OutputStream.prototype={write(data,callback){},close(){}};Common.StringOutputStream=class{constructor(){this._data='';}
write(chunk,callback){this._data+=chunk;}
close(){}
data(){return this._data;}};;Common.Segment=class{constructor(begin,end,data){if(begin>end)
console.assert(false,'Invalid segment');this.begin=begin;this.end=end;this.data=data;}
intersects(that){return this.begin<that.end&&that.begin<this.end;}};Common.SegmentedRange=class{constructor(mergeCallback){this._segments=[];this._mergeCallback=mergeCallback;}
append(newSegment){var startIndex=this._segments.lowerBound(newSegment,(a,b)=>a.begin-b.begin);var endIndex=startIndex;var merged=null;if(startIndex>0){var precedingSegment=this._segments[startIndex-1];merged=this._tryMerge(precedingSegment,newSegment);if(merged){--startIndex;newSegment=merged;}else if(this._segments[startIndex-1].end>=newSegment.begin){if(newSegment.end<precedingSegment.end){this._segments.splice(startIndex,0,new Common.Segment(newSegment.end,precedingSegment.end,precedingSegment.data));}
precedingSegment.end=newSegment.begin;}}
while(endIndex<this._segments.length&&this._segments[endIndex].end<=newSegment.end)
++endIndex;if(endIndex<this._segments.length){merged=this._tryMerge(newSegment,this._segments[endIndex]);if(merged){endIndex++;newSegment=merged;}else if(newSegment.intersects(this._segments[endIndex])){this._segments[endIndex].begin=newSegment.end;}}
this._segments.splice(startIndex,endIndex-startIndex,newSegment);}
appendRange(that){that.segments().forEach(segment=>this.append(segment));}
segments(){return this._segments;}
_tryMerge(first,second){var merged=this._mergeCallback&&this._mergeCallback(first,second);if(!merged)
return null;merged.begin=first.begin;merged.end=Math.max(first.end,second.end);return merged;}};;self['Common']=self['Common']||{};Common.Text=class{constructor(value){this._value=value;}
lineEndings(){if(!this._lineEndings)
this._lineEndings=this._value.computeLineEndings();return this._lineEndings;}
value(){return this._value;}
lineCount(){var lineEndings=this.lineEndings();return lineEndings.length;}
offsetFromPosition(lineNumber,columnNumber){return(lineNumber?this.lineEndings()[lineNumber-1]+1:0)+columnNumber;}
positionFromOffset(offset){var lineEndings=this.lineEndings();var lineNumber=lineEndings.lowerBound(offset);return{lineNumber:lineNumber,columnNumber:offset-(lineNumber&&(lineEndings[lineNumber-1]+1))};}
lineAt(lineNumber){var lineEndings=this.lineEndings();var lineStart=lineNumber>0?lineEndings[lineNumber-1]+1:0;var lineEnd=lineEndings[lineNumber];var lineContent=this._value.substring(lineStart,lineEnd);if(lineContent.length>0&&lineContent.charAt(lineContent.length-1)==='\r')
lineContent=lineContent.substring(0,lineContent.length-1);return lineContent;}
toSourceRange(range){var start=this.offsetFromPosition(range.startLine,range.startColumn);var end=this.offsetFromPosition(range.endLine,range.endColumn);return new Common.SourceRange(start,end-start);}
toTextRange(sourceRange){var cursor=new Common.TextCursor(this.lineEndings());var result=Common.TextRange.createFromLocation(0,0);cursor.resetTo(sourceRange.offset);result.startLine=cursor.lineNumber();result.startColumn=cursor.columnNumber();cursor.advance(sourceRange.offset+sourceRange.length);result.endLine=cursor.lineNumber();result.endColumn=cursor.columnNumber();return result;}
replaceRange(range,replacement){var sourceRange=this.toSourceRange(range);return this._value.substring(0,sourceRange.offset)+replacement+
this._value.substring(sourceRange.offset+sourceRange.length);}
extract(range){var sourceRange=this.toSourceRange(range);return this._value.substr(sourceRange.offset,sourceRange.length);}};Common.Text.Position;Common.TextCursor=class{constructor(lineEndings){this._lineEndings=lineEndings;this._offset=0;this._lineNumber=0;this._columnNumber=0;}
advance(offset){this._offset=offset;while(this._lineNumber<this._lineEndings.length&&this._lineEndings[this._lineNumber]<this._offset)
++this._lineNumber;this._columnNumber=this._lineNumber?this._offset-this._lineEndings[this._lineNumber-1]-1:this._offset;}
offset(){return this._offset;}
resetTo(offset){this._offset=offset;this._lineNumber=this._lineEndings.lowerBound(offset);this._columnNumber=this._lineNumber?this._offset-this._lineEndings[this._lineNumber-1]-1:this._offset;}
lineNumber(){return this._lineNumber;}
columnNumber(){return this._columnNumber;}};;Common.TextRange=class{constructor(startLine,startColumn,endLine,endColumn){this.startLine=startLine;this.startColumn=startColumn;this.endLine=endLine;this.endColumn=endColumn;}
static createFromLocation(line,column){return new Common.TextRange(line,column,line,column);}
static fromObject(serializedTextRange){return new Common.TextRange(serializedTextRange.startLine,serializedTextRange.startColumn,serializedTextRange.endLine,serializedTextRange.endColumn);}
static comparator(range1,range2){return range1.compareTo(range2);}
static fromEdit(oldRange,newText){var endLine=oldRange.startLine;var endColumn=oldRange.startColumn+newText.length;var lineEndings=newText.computeLineEndings();if(lineEndings.length>1){endLine=oldRange.startLine+lineEndings.length-1;var len=lineEndings.length;endColumn=lineEndings[len-1]-lineEndings[len-2]-1;}
return new Common.TextRange(oldRange.startLine,oldRange.startColumn,endLine,endColumn);}
isEmpty(){return this.startLine===this.endLine&&this.startColumn===this.endColumn;}
immediatelyPrecedes(range){if(!range)
return false;return this.endLine===range.startLine&&this.endColumn===range.startColumn;}
immediatelyFollows(range){if(!range)
return false;return range.immediatelyPrecedes(this);}
follows(range){return(range.endLine===this.startLine&&range.endColumn<=this.startColumn)||range.endLine<this.startLine;}
get linesCount(){return this.endLine-this.startLine;}
collapseToEnd(){return new Common.TextRange(this.endLine,this.endColumn,this.endLine,this.endColumn);}
collapseToStart(){return new Common.TextRange(this.startLine,this.startColumn,this.startLine,this.startColumn);}
normalize(){if(this.startLine>this.endLine||(this.startLine===this.endLine&&this.startColumn>this.endColumn))
return new Common.TextRange(this.endLine,this.endColumn,this.startLine,this.startColumn);else
return this.clone();}
clone(){return new Common.TextRange(this.startLine,this.startColumn,this.endLine,this.endColumn);}
serializeToObject(){var serializedTextRange={};serializedTextRange.startLine=this.startLine;serializedTextRange.startColumn=this.startColumn;serializedTextRange.endLine=this.endLine;serializedTextRange.endColumn=this.endColumn;return serializedTextRange;}
compareTo(other){if(this.startLine>other.startLine)
return 1;if(this.startLine<other.startLine)
return-1;if(this.startColumn>other.startColumn)
return 1;if(this.startColumn<other.startColumn)
return-1;return 0;}
compareToPosition(lineNumber,columnNumber){if(lineNumber<this.startLine||(lineNumber===this.startLine&&columnNumber<this.startColumn))
return-1;if(lineNumber>this.endLine||(lineNumber===this.endLine&&columnNumber>this.endColumn))
return 1;return 0;}
equal(other){return this.startLine===other.startLine&&this.endLine===other.endLine&&this.startColumn===other.startColumn&&this.endColumn===other.endColumn;}
relativeTo(line,column){var relative=this.clone();if(this.startLine===line)
relative.startColumn-=column;if(this.endLine===line)
relative.endColumn-=column;relative.startLine-=line;relative.endLine-=line;return relative;}
rebaseAfterTextEdit(originalRange,editedRange){console.assert(originalRange.startLine===editedRange.startLine);console.assert(originalRange.startColumn===editedRange.startColumn);var rebase=this.clone();if(!this.follows(originalRange))
return rebase;var lineDelta=editedRange.endLine-originalRange.endLine;var columnDelta=editedRange.endColumn-originalRange.endColumn;rebase.startLine+=lineDelta;rebase.endLine+=lineDelta;if(rebase.startLine===editedRange.endLine)
rebase.startColumn+=columnDelta;if(rebase.endLine===editedRange.endLine)
rebase.endColumn+=columnDelta;return rebase;}
toString(){return JSON.stringify(this);}
containsLocation(lineNumber,columnNumber){if(this.startLine===this.endLine)
return this.startLine===lineNumber&&this.startColumn<=columnNumber&&columnNumber<=this.endColumn;if(this.startLine===lineNumber)
return this.startColumn<=columnNumber;if(this.endLine===lineNumber)
return columnNumber<=this.endColumn;return this.startLine<lineNumber&&lineNumber<this.endLine;}};Common.SourceRange=class{constructor(offset,length){this.offset=offset;this.length=length;}};Common.SourceEdit=class{constructor(sourceURL,oldRange,newText){this.sourceURL=sourceURL;this.oldRange=oldRange;this.newText=newText;}
static comparator(edit1,edit2){return Common.TextRange.comparator(edit1.oldRange,edit2.oldRange);}
newRange(){return Common.TextRange.fromEdit(this.oldRange,this.newText);}};;Common.TextUtils={isStopChar:function(char){return(char>' '&&char<'0')||(char>'9'&&char<'A')||(char>'Z'&&char<'_')||(char>'_'&&char<'a')||(char>'z'&&char<='~');},isWordChar:function(char){return!Common.TextUtils.isStopChar(char)&&!Common.TextUtils.isSpaceChar(char);},isSpaceChar:function(char){return Common.TextUtils._SpaceCharRegex.test(char);},isWord:function(word){for(var i=0;i<word.length;++i){if(!Common.TextUtils.isWordChar(word.charAt(i)))
return false;}
return true;},isOpeningBraceChar:function(char){return char==='('||char==='{';},isClosingBraceChar:function(char){return char===')'||char==='}';},isBraceChar:function(char){return Common.TextUtils.isOpeningBraceChar(char)||Common.TextUtils.isClosingBraceChar(char);},textToWords:function(text,isWordChar,wordCallback){var startWord=-1;for(var i=0;i<text.length;++i){if(!isWordChar(text.charAt(i))){if(startWord!==-1)
wordCallback(text.substring(startWord,i));startWord=-1;}else if(startWord===-1){startWord=i;}}
if(startWord!==-1)
wordCallback(text.substring(startWord));},lineIndent:function(line){var indentation=0;while(indentation<line.length&&Common.TextUtils.isSpaceChar(line.charAt(indentation)))
++indentation;return line.substr(0,indentation);},isUpperCase:function(text){return text===text.toUpperCase();},isLowerCase:function(text){return text===text.toLowerCase();},splitStringByRegexes(text,regexes){var matches=[];var globalRegexes=[];for(var i=0;i<regexes.length;i++){var regex=regexes[i];if(!regex.global)
globalRegexes.push(new RegExp(regex.source,regex.flags?regex.flags+'g':'g'));else
globalRegexes.push(regex);}
doSplit(text,0,0);return matches;function doSplit(text,regexIndex,startIndex){if(regexIndex>=globalRegexes.length){matches.push({value:text,position:startIndex,regexIndex:-1});return;}
var regex=globalRegexes[regexIndex];var currentIndex=0;var result;regex.lastIndex=0;while((result=regex.exec(text))!==null){var stringBeforeMatch=text.substring(currentIndex,result.index);if(stringBeforeMatch)
doSplit(stringBeforeMatch,regexIndex+1,startIndex+currentIndex);var match=result[0];matches.push({value:match,position:startIndex+result.index,regexIndex:regexIndex});currentIndex=result.index+match.length;}
var stringAfterMatches=text.substring(currentIndex);if(stringAfterMatches)
doSplit(stringAfterMatches,regexIndex+1,startIndex+currentIndex);}}};Common.TextUtils._SpaceCharRegex=/\s/;Common.TextUtils.Indent={TwoSpaces:'  ',FourSpaces:'    ',EightSpaces:'        ',TabCharacter:'\t'};Common.TextUtils.BalancedJSONTokenizer=class{constructor(callback,findMultiple){this._callback=callback;this._index=0;this._balance=0;this._buffer='';this._findMultiple=findMultiple||false;this._closingDoubleQuoteRegex=/[^\\](?:\\\\)*"/g;}
write(chunk){this._buffer+=chunk;var lastIndex=this._buffer.length;var buffer=this._buffer;for(var index=this._index;index<lastIndex;++index){var character=buffer[index];if(character==='"'){this._closingDoubleQuoteRegex.lastIndex=index;if(!this._closingDoubleQuoteRegex.test(buffer))
break;index=this._closingDoubleQuoteRegex.lastIndex-1;}else if(character==='{'){++this._balance;}else if(character==='}'){--this._balance;if(this._balance<0){this._reportBalanced();return false;}
if(!this._balance){this._lastBalancedIndex=index+1;if(!this._findMultiple)
break;}}else if(character===']'&&!this._balance){this._reportBalanced();return false;}}
this._index=index;this._reportBalanced();return true;}
_reportBalanced(){if(!this._lastBalancedIndex)
return;this._callback(this._buffer.slice(0,this._lastBalancedIndex));this._buffer=this._buffer.slice(this._lastBalancedIndex);this._index-=this._lastBalancedIndex;this._lastBalancedIndex=0;}
remainder(){return this._buffer;}};Common.TokenizerFactory=function(){};Common.TokenizerFactory.prototype={createTokenizer(mimeType){}};;Common.Throttler=class{constructor(timeout){this._timeout=timeout;this._isRunningProcess=false;this._asSoonAsPossible=false;this._process=null;this._lastCompleteTime=0;}
_processCompleted(){this._lastCompleteTime=window.performance.now();this._isRunningProcess=false;if(this._process)
this._innerSchedule(false);this._processCompletedForTests();}
_processCompletedForTests(){}
_onTimeout(){delete this._processTimeout;this._asSoonAsPossible=false;this._isRunningProcess=true;Promise.resolve().then(this._process).catch(console.error.bind(console)).then(this._processCompleted.bind(this));this._process=null;}
schedule(process,asSoonAsPossible){this._process=process;var hasScheduledTasks=!!this._processTimeout||this._isRunningProcess;var okToFire=window.performance.now()-this._lastCompleteTime>this._timeout;asSoonAsPossible=!!asSoonAsPossible||(!hasScheduledTasks&&okToFire);var forceTimerUpdate=asSoonAsPossible&&!this._asSoonAsPossible;this._asSoonAsPossible=this._asSoonAsPossible||asSoonAsPossible;this._innerSchedule(forceTimerUpdate);}
flush(){if(this._process)
this._onTimeout();}
_innerSchedule(forceTimerUpdate){if(this._isRunningProcess)
return;if(this._processTimeout&&!forceTimerUpdate)
return;if(this._processTimeout)
this._clearTimeout(this._processTimeout);var timeout=this._asSoonAsPossible?0:this._timeout;this._processTimeout=this._setTimeout(this._onTimeout.bind(this),timeout);}
_clearTimeout(timeoutId){clearTimeout(timeoutId);}
_setTimeout(operation,timeout){return setTimeout(operation,timeout);}};Common.Throttler.FinishCallback;;Common.Trie=class{constructor(){this.clear();}
add(word){var node=this._root;++this._wordsInSubtree[this._root];for(var i=0;i<word.length;++i){var edge=word[i];var next=this._edges[node][edge];if(!next){if(this._freeNodes.length){next=this._freeNodes.pop();}else{next=this._size++;this._isWord.push(false);this._wordsInSubtree.push(0);this._edges.push({__proto__:null});}
this._edges[node][edge]=next;}
++this._wordsInSubtree[next];node=next;}
this._isWord[node]=true;}
remove(word){if(!this.has(word))
return false;var node=this._root;--this._wordsInSubtree[this._root];for(var i=0;i<word.length;++i){var edge=word[i];var next=this._edges[node][edge];if(!--this._wordsInSubtree[next]){delete this._edges[node][edge];this._freeNodes.push(next);}
node=next;}
this._isWord[node]=false;return true;}
has(word){var node=this._root;for(var i=0;i<word.length;++i){node=this._edges[node][word[i]];if(!node)
return false;}
return this._isWord[node];}
words(prefix){prefix=prefix||'';var node=this._root;for(var i=0;i<prefix.length;++i){node=this._edges[node][prefix[i]];if(!node)
return[];}
var results=[];this._dfs(node,prefix,results);return results;}
_dfs(node,prefix,results){if(this._isWord[node])
results.push(prefix);var edges=this._edges[node];for(var edge in edges)
this._dfs(edges[edge],prefix+edge,results);}
longestPrefix(word,fullWordOnly){var node=this._root;var wordIndex=0;for(var i=0;i<word.length;++i){node=this._edges[node][word[i]];if(!node)
break;if(!fullWordOnly||this._isWord[node])
wordIndex=i+1;}
return word.substring(0,wordIndex);}
clear(){this._size=1;this._root=0;this._edges=[{__proto__:null}];this._isWord=[false];this._wordsInSubtree=[0];this._freeNodes=[];}};;self['Common']=self['Common']||{};Common.UIString=function(string,vararg){return String.vsprintf(Common.localize(string),Array.prototype.slice.call(arguments,1));};Common.UIString.capitalize=function(string,vararg){if(Common._useLowerCaseMenuTitles===undefined)
throw'Common.setLocalizationPlatform() has not been called';var localized=Common.localize(string);var capitalized;if(Common._useLowerCaseMenuTitles){capitalized=localized.replace(/\^(.)/g,'$1');}else{capitalized=localized.replace(/\^(.)/g,function(str,char){return char.toUpperCase();});}
return String.vsprintf(capitalized,Array.prototype.slice.call(arguments,1));};Common.setLocalizationPlatform=function(platform){Common._useLowerCaseMenuTitles=platform==='windows';};Common.localize=function(string){return string;};Common.UIStringFormat=class{constructor(format){this._localizedFormat=Common.localize(format);this._tokenizedFormat=String.tokenizeFormatString(this._localizedFormat,String.standardFormatters);}
static _append(a,b){return a+b;}
format(vararg){return String.format(this._localizedFormat,arguments,String.standardFormatters,'',Common.UIStringFormat._append,this._tokenizedFormat).formattedResult;}};;Common.Renderer=function(){};Common.Renderer.prototype={render(object){}};Common.Renderer.renderPromise=function(object){if(!object)
return Promise.reject(new Error('Can\'t render '+object));return self.runtime.extension(Common.Renderer,object).instance().then(render);function render(renderer){return renderer.render(object);}};Common.Revealer=function(){};Common.Revealer.reveal=function(revealable,omitFocus){Common.Revealer.revealPromise(revealable,omitFocus);};Common.Revealer.revealPromise=function(revealable,omitFocus){if(!revealable)
return Promise.reject(new Error('Can\'t reveal '+revealable));return self.runtime.allInstances(Common.Revealer,revealable).then(reveal);function reveal(revealers){var promises=[];for(var i=0;i<revealers.length;++i)
promises.push(revealers[i].reveal((revealable),omitFocus));return Promise.race(promises);}};Common.Revealer.prototype={reveal(object,omitFocus){}};Common.App=function(){};Common.App.prototype={presentUI(document){}};Common.AppProvider=function(){};Common.AppProvider.prototype={createApp(){}};Common.QueryParamHandler=function(){};Common.QueryParamHandler.prototype={handleQueryParam(value){}};;Common.FormatterWorkerPool=class{constructor(){this._taskQueue=[];this._workerTasks=new Map();}
_createWorker(){var worker=new Common.Worker('formatter_worker');worker.onmessage=this._onWorkerMessage.bind(this,worker);worker.onerror=this._onWorkerError.bind(this,worker);return worker;}
_processNextTask(){if(!this._taskQueue.length)
return;var freeWorker=this._workerTasks.keysArray().find(worker=>!this._workerTasks.get(worker));if(!freeWorker&&this._workerTasks.size<Common.FormatterWorkerPool.MaxWorkers)
freeWorker=this._createWorker();if(!freeWorker)
return;var task=this._taskQueue.shift();this._workerTasks.set(freeWorker,task);freeWorker.postMessage({method:task.method,params:task.params});}
_onWorkerMessage(worker,event){var task=this._workerTasks.get(worker);if(task.isChunked&&event.data&&!event.data['isLastChunk']){task.callback(event.data);return;}
this._workerTasks.set(worker,null);this._processNextTask();task.callback(event.data?event.data:null);}
_onWorkerError(worker,event){console.error(event);var task=this._workerTasks.get(worker);worker.terminate();this._workerTasks.delete(worker);var newWorker=this._createWorker();this._workerTasks.set(newWorker,null);this._processNextTask();task.callback(null);}
_runChunkedTask(methodName,params,callback){var task=new Common.FormatterWorkerPool.Task(methodName,params,onData,true);this._taskQueue.push(task);this._processNextTask();function onData(data){if(!data){callback(true,null);return;}
var isLastChunk=!!data['isLastChunk'];var chunk=data['chunk'];callback(isLastChunk,chunk);}}
_runTask(methodName,params){var callback;var promise=new Promise(fulfill=>callback=fulfill);var task=new Common.FormatterWorkerPool.Task(methodName,params,callback,false);this._taskQueue.push(task);this._processNextTask();return promise;}
parseJSONRelaxed(content){return this._runTask('parseJSONRelaxed',{content:content});}
parseSCSS(content){return this._runTask('parseSCSS',{content:content}).then(rules=>rules||[]);}
format(mimeType,content,indentString){var parameters={mimeType:mimeType,content:content,indentString:indentString};return(this._runTask('format',parameters));}
javaScriptIdentifiers(content){return this._runTask('javaScriptIdentifiers',{content:content}).then(ids=>ids||[]);}
evaluatableJavaScriptSubstring(content){return this._runTask('evaluatableJavaScriptSubstring',{content:content}).then(text=>text||'');}
parseCSS(content,callback){this._runChunkedTask('parseCSS',{content:content},onDataChunk);function onDataChunk(isLastChunk,data){var rules=(data||[]);callback(isLastChunk,rules);}}
javaScriptOutline(content,callback){this._runChunkedTask('javaScriptOutline',{content:content},onDataChunk);function onDataChunk(isLastChunk,data){var items=(data||[]);callback(isLastChunk,items);}}};Common.FormatterWorkerPool.MaxWorkers=2;Common.FormatterWorkerPool.Task=class{constructor(method,params,callback,isChunked){this.method=method;this.params=params;this.callback=callback;this.isChunked=isChunked;}};Common.FormatterWorkerPool.FormatResult=class{constructor(){this.content;this.mapping;}};Common.FormatterWorkerPool.FormatMapping;Common.FormatterWorkerPool.JSOutlineItem=class{constructor(){this.name;this.arguments;this.line;this.column;}};Common.FormatterWorkerPool.TextRange;Common.FormatterWorkerPool.CSSProperty=class{constructor(){this.name;this.nameRange;this.value;this.valueRange;this.range;this.disabled;}};Common.FormatterWorkerPool.CSSStyleRule=class{constructor(){this.selectorText;this.styleRange;this.lineNumber;this.columnNumber;this.properties;}};Common.FormatterWorkerPool.CSSAtRule;Common.FormatterWorkerPool.CSSRule;Common.FormatterWorkerPool.SCSSProperty=class{constructor(){this.range;this.name;this.value;this.disabled;}};Common.FormatterWorkerPool.SCSSRule=class{constructor(){this.selectors;this.properties;this.styleRange;}};Common.formatterWorkerPool;;Common.CharacterIdMap=class{constructor(){this._elementToCharacter=new Map();this._characterToElement=new Map();this._charCode=33;}
toChar(object){var character=this._elementToCharacter.get(object);if(!character){if(this._charCode>=0xFFFF)
throw new Error('CharacterIdMap ran out of capacity!');character=String.fromCharCode(this._charCode++);this._elementToCharacter.set(object,character);this._characterToElement.set(character,object);}
return character;}
fromChar(character){var object=this._characterToElement.get(character);if(object===undefined)
return null;return object;}};;self['HeapSnapshotWorker']=self['HeapSnapshotWorker']||{};HeapSnapshotWorker.AllocationProfile=class{constructor(profile,liveObjectStats){this._strings=profile.strings;this._liveObjectStats=liveObjectStats;this._nextNodeId=1;this._functionInfos=[];this._idToNode={};this._idToTopDownNode={};this._collapsedTopNodeIdToFunctionInfo={};this._traceTops=null;this._buildFunctionAllocationInfos(profile);this._traceTree=this._buildAllocationTree(profile,liveObjectStats);}
_buildFunctionAllocationInfos(profile){var strings=this._strings;var functionInfoFields=profile.snapshot.meta.trace_function_info_fields;var functionNameOffset=functionInfoFields.indexOf('name');var scriptNameOffset=functionInfoFields.indexOf('script_name');var scriptIdOffset=functionInfoFields.indexOf('script_id');var lineOffset=functionInfoFields.indexOf('line');var columnOffset=functionInfoFields.indexOf('column');var functionInfoFieldCount=functionInfoFields.length;var rawInfos=profile.trace_function_infos;var infoLength=rawInfos.length;var functionInfos=this._functionInfos=new Array(infoLength/functionInfoFieldCount);var index=0;for(var i=0;i<infoLength;i+=functionInfoFieldCount){functionInfos[index++]=new HeapSnapshotWorker.FunctionAllocationInfo(strings[rawInfos[i+functionNameOffset]],strings[rawInfos[i+scriptNameOffset]],rawInfos[i+scriptIdOffset],rawInfos[i+lineOffset],rawInfos[i+columnOffset]);}}
_buildAllocationTree(profile,liveObjectStats){var traceTreeRaw=profile.trace_tree;var functionInfos=this._functionInfos;var idToTopDownNode=this._idToTopDownNode;var traceNodeFields=profile.snapshot.meta.trace_node_fields;var nodeIdOffset=traceNodeFields.indexOf('id');var functionInfoIndexOffset=traceNodeFields.indexOf('function_info_index');var allocationCountOffset=traceNodeFields.indexOf('count');var allocationSizeOffset=traceNodeFields.indexOf('size');var childrenOffset=traceNodeFields.indexOf('children');var nodeFieldCount=traceNodeFields.length;function traverseNode(rawNodeArray,nodeOffset,parent){var functionInfo=functionInfos[rawNodeArray[nodeOffset+functionInfoIndexOffset]];var id=rawNodeArray[nodeOffset+nodeIdOffset];var stats=liveObjectStats[id];var liveCount=stats?stats.count:0;var liveSize=stats?stats.size:0;var result=new HeapSnapshotWorker.TopDownAllocationNode(id,functionInfo,rawNodeArray[nodeOffset+allocationCountOffset],rawNodeArray[nodeOffset+allocationSizeOffset],liveCount,liveSize,parent);idToTopDownNode[id]=result;functionInfo.addTraceTopNode(result);var rawChildren=rawNodeArray[nodeOffset+childrenOffset];for(var i=0;i<rawChildren.length;i+=nodeFieldCount)
result.children.push(traverseNode(rawChildren,i,result));return result;}
return traverseNode(traceTreeRaw,0,null);}
serializeTraceTops(){if(this._traceTops)
return this._traceTops;var result=this._traceTops=[];var functionInfos=this._functionInfos;for(var i=0;i<functionInfos.length;i++){var info=functionInfos[i];if(info.totalCount===0)
continue;var nodeId=this._nextNodeId++;var isRoot=i===0;result.push(this._serializeNode(nodeId,info,info.totalCount,info.totalSize,info.totalLiveCount,info.totalLiveSize,!isRoot));this._collapsedTopNodeIdToFunctionInfo[nodeId]=info;}
result.sort(function(a,b){return b.size-a.size;});return result;}
serializeCallers(nodeId){var node=this._ensureBottomUpNode(nodeId);var nodesWithSingleCaller=[];while(node.callers().length===1){node=node.callers()[0];nodesWithSingleCaller.push(this._serializeCaller(node));}
var branchingCallers=[];var callers=node.callers();for(var i=0;i<callers.length;i++)
branchingCallers.push(this._serializeCaller(callers[i]));return new HeapSnapshotModel.AllocationNodeCallers(nodesWithSingleCaller,branchingCallers);}
serializeAllocationStack(traceNodeId){var node=this._idToTopDownNode[traceNodeId];var result=[];while(node){var functionInfo=node.functionInfo;result.push(new HeapSnapshotModel.AllocationStackFrame(functionInfo.functionName,functionInfo.scriptName,functionInfo.scriptId,functionInfo.line,functionInfo.column));node=node.parent;}
return result;}
traceIds(allocationNodeId){return this._ensureBottomUpNode(allocationNodeId).traceTopIds;}
_ensureBottomUpNode(nodeId){var node=this._idToNode[nodeId];if(!node){var functionInfo=this._collapsedTopNodeIdToFunctionInfo[nodeId];node=functionInfo.bottomUpRoot();delete this._collapsedTopNodeIdToFunctionInfo[nodeId];this._idToNode[nodeId]=node;}
return node;}
_serializeCaller(node){var callerId=this._nextNodeId++;this._idToNode[callerId]=node;return this._serializeNode(callerId,node.functionInfo,node.allocationCount,node.allocationSize,node.liveCount,node.liveSize,node.hasCallers());}
_serializeNode(nodeId,functionInfo,count,size,liveCount,liveSize,hasChildren){return new HeapSnapshotModel.SerializedAllocationNode(nodeId,functionInfo.functionName,functionInfo.scriptName,functionInfo.scriptId,functionInfo.line,functionInfo.column,count,size,liveCount,liveSize,hasChildren);}};HeapSnapshotWorker.TopDownAllocationNode=class{constructor(id,functionInfo,count,size,liveCount,liveSize,parent){this.id=id;this.functionInfo=functionInfo;this.allocationCount=count;this.allocationSize=size;this.liveCount=liveCount;this.liveSize=liveSize;this.parent=parent;this.children=[];}};HeapSnapshotWorker.BottomUpAllocationNode=class{constructor(functionInfo){this.functionInfo=functionInfo;this.allocationCount=0;this.allocationSize=0;this.liveCount=0;this.liveSize=0;this.traceTopIds=[];this._callers=[];}
addCaller(traceNode){var functionInfo=traceNode.functionInfo;var result;for(var i=0;i<this._callers.length;i++){var caller=this._callers[i];if(caller.functionInfo===functionInfo){result=caller;break;}}
if(!result){result=new HeapSnapshotWorker.BottomUpAllocationNode(functionInfo);this._callers.push(result);}
return result;}
callers(){return this._callers;}
hasCallers(){return this._callers.length>0;}};HeapSnapshotWorker.FunctionAllocationInfo=class{constructor(functionName,scriptName,scriptId,line,column){this.functionName=functionName;this.scriptName=scriptName;this.scriptId=scriptId;this.line=line;this.column=column;this.totalCount=0;this.totalSize=0;this.totalLiveCount=0;this.totalLiveSize=0;this._traceTops=[];}
addTraceTopNode(node){if(node.allocationCount===0)
return;this._traceTops.push(node);this.totalCount+=node.allocationCount;this.totalSize+=node.allocationSize;this.totalLiveCount+=node.liveCount;this.totalLiveSize+=node.liveSize;}
bottomUpRoot(){if(!this._traceTops.length)
return null;if(!this._bottomUpTree)
this._buildAllocationTraceTree();return this._bottomUpTree;}
_buildAllocationTraceTree(){this._bottomUpTree=new HeapSnapshotWorker.BottomUpAllocationNode(this);for(var i=0;i<this._traceTops.length;i++){var node=this._traceTops[i];var bottomUpNode=this._bottomUpTree;var count=node.allocationCount;var size=node.allocationSize;var liveCount=node.liveCount;var liveSize=node.liveSize;var traceId=node.id;while(true){bottomUpNode.allocationCount+=count;bottomUpNode.allocationSize+=size;bottomUpNode.liveCount+=liveCount;bottomUpNode.liveSize+=liveSize;bottomUpNode.traceTopIds.push(traceId);node=node.parent;if(node===null)
break;bottomUpNode=bottomUpNode.addCaller(node);}}}};;HeapSnapshotWorker.HeapSnapshotItem=function(){};HeapSnapshotWorker.HeapSnapshotItem.prototype={itemIndex(){},serialize(){}};HeapSnapshotWorker.HeapSnapshotEdge=class{constructor(snapshot,edgeIndex){this._snapshot=snapshot;this._edges=snapshot.containmentEdges;this.edgeIndex=edgeIndex||0;}
clone(){return new HeapSnapshotWorker.HeapSnapshotEdge(this._snapshot,this.edgeIndex);}
hasStringName(){throw new Error('Not implemented');}
name(){throw new Error('Not implemented');}
node(){return this._snapshot.createNode(this.nodeIndex());}
nodeIndex(){return this._edges[this.edgeIndex+this._snapshot._edgeToNodeOffset];}
toString(){return'HeapSnapshotEdge: '+this.name();}
type(){return this._snapshot._edgeTypes[this.rawType()];}
itemIndex(){return this.edgeIndex;}
serialize(){return new HeapSnapshotModel.Edge(this.name(),this.node().serialize(),this.type(),this.edgeIndex);}
rawType(){return this._edges[this.edgeIndex+this._snapshot._edgeTypeOffset];}};HeapSnapshotWorker.HeapSnapshotItemIterator=function(){};HeapSnapshotWorker.HeapSnapshotItemIterator.prototype={hasNext(){},item(){},next(){}};HeapSnapshotWorker.HeapSnapshotItemIndexProvider=function(){};HeapSnapshotWorker.HeapSnapshotItemIndexProvider.prototype={itemForIndex(newIndex){},};HeapSnapshotWorker.HeapSnapshotNodeIndexProvider=class{constructor(snapshot){this._node=snapshot.createNode();}
itemForIndex(index){this._node.nodeIndex=index;return this._node;}};HeapSnapshotWorker.HeapSnapshotEdgeIndexProvider=class{constructor(snapshot){this._edge=snapshot.createEdge(0);}
itemForIndex(index){this._edge.edgeIndex=index;return this._edge;}};HeapSnapshotWorker.HeapSnapshotRetainerEdgeIndexProvider=class{constructor(snapshot){this._retainerEdge=snapshot.createRetainingEdge(0);}
itemForIndex(index){this._retainerEdge.setRetainerIndex(index);return this._retainerEdge;}};HeapSnapshotWorker.HeapSnapshotEdgeIterator=class{constructor(node){this._sourceNode=node;this.edge=node._snapshot.createEdge(node.edgeIndexesStart());}
hasNext(){return this.edge.edgeIndex<this._sourceNode.edgeIndexesEnd();}
item(){return this.edge;}
next(){this.edge.edgeIndex+=this.edge._snapshot._edgeFieldsCount;}};HeapSnapshotWorker.HeapSnapshotRetainerEdge=class{constructor(snapshot,retainerIndex){this._snapshot=snapshot;this.setRetainerIndex(retainerIndex);}
clone(){return new HeapSnapshotWorker.HeapSnapshotRetainerEdge(this._snapshot,this.retainerIndex());}
hasStringName(){return this._edge().hasStringName();}
name(){return this._edge().name();}
node(){return this._node();}
nodeIndex(){return this._retainingNodeIndex;}
retainerIndex(){return this._retainerIndex;}
setRetainerIndex(retainerIndex){if(retainerIndex===this._retainerIndex)
return;this._retainerIndex=retainerIndex;this._globalEdgeIndex=this._snapshot._retainingEdges[retainerIndex];this._retainingNodeIndex=this._snapshot._retainingNodes[retainerIndex];this._edgeInstance=null;this._nodeInstance=null;}
set edgeIndex(edgeIndex){this.setRetainerIndex(edgeIndex);}
_node(){if(!this._nodeInstance)
this._nodeInstance=this._snapshot.createNode(this._retainingNodeIndex);return this._nodeInstance;}
_edge(){if(!this._edgeInstance)
this._edgeInstance=this._snapshot.createEdge(this._globalEdgeIndex);return this._edgeInstance;}
toString(){return this._edge().toString();}
itemIndex(){return this._retainerIndex;}
serialize(){return new HeapSnapshotModel.Edge(this.name(),this.node().serialize(),this.type(),this._globalEdgeIndex);}
type(){return this._edge().type();}};HeapSnapshotWorker.HeapSnapshotRetainerEdgeIterator=class{constructor(retainedNode){var snapshot=retainedNode._snapshot;var retainedNodeOrdinal=retainedNode.ordinal();var retainerIndex=snapshot._firstRetainerIndex[retainedNodeOrdinal];this._retainersEnd=snapshot._firstRetainerIndex[retainedNodeOrdinal+1];this.retainer=snapshot.createRetainingEdge(retainerIndex);}
hasNext(){return this.retainer.retainerIndex()<this._retainersEnd;}
item(){return this.retainer;}
next(){this.retainer.setRetainerIndex(this.retainer.retainerIndex()+1);}};HeapSnapshotWorker.HeapSnapshotNode=class{constructor(snapshot,nodeIndex){this._snapshot=snapshot;this.nodeIndex=nodeIndex||0;}
distance(){return this._snapshot._nodeDistances[this.nodeIndex/this._snapshot._nodeFieldCount];}
className(){throw new Error('Not implemented');}
classIndex(){throw new Error('Not implemented');}
dominatorIndex(){var nodeFieldCount=this._snapshot._nodeFieldCount;return this._snapshot._dominatorsTree[this.nodeIndex/this._snapshot._nodeFieldCount]*nodeFieldCount;}
edges(){return new HeapSnapshotWorker.HeapSnapshotEdgeIterator(this);}
edgesCount(){return(this.edgeIndexesEnd()-this.edgeIndexesStart())/this._snapshot._edgeFieldsCount;}
id(){throw new Error('Not implemented');}
isRoot(){return this.nodeIndex===this._snapshot._rootNodeIndex;}
name(){return this._snapshot.strings[this._name()];}
retainedSize(){return this._snapshot._retainedSizes[this.ordinal()];}
retainers(){return new HeapSnapshotWorker.HeapSnapshotRetainerEdgeIterator(this);}
retainersCount(){var snapshot=this._snapshot;var ordinal=this.ordinal();return snapshot._firstRetainerIndex[ordinal+1]-snapshot._firstRetainerIndex[ordinal];}
selfSize(){var snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeSelfSizeOffset];}
type(){return this._snapshot._nodeTypes[this.rawType()];}
traceNodeId(){var snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeTraceNodeIdOffset];}
itemIndex(){return this.nodeIndex;}
serialize(){return new HeapSnapshotModel.Node(this.id(),this.name(),this.distance(),this.nodeIndex,this.retainedSize(),this.selfSize(),this.type());}
_name(){var snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeNameOffset];}
edgeIndexesStart(){return this._snapshot._firstEdgeIndexes[this.ordinal()];}
edgeIndexesEnd(){return this._snapshot._firstEdgeIndexes[this.ordinal()+1];}
ordinal(){return this.nodeIndex/this._snapshot._nodeFieldCount;}
_nextNodeIndex(){return this.nodeIndex+this._snapshot._nodeFieldCount;}
rawType(){var snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeTypeOffset];}};HeapSnapshotWorker.HeapSnapshotNodeIterator=class{constructor(node){this.node=node;this._nodesLength=node._snapshot.nodes.length;}
hasNext(){return this.node.nodeIndex<this._nodesLength;}
item(){return this.node;}
next(){this.node.nodeIndex=this.node._nextNodeIndex();}};HeapSnapshotWorker.HeapSnapshotIndexRangeIterator=class{constructor(itemProvider,indexes){this._itemProvider=itemProvider;this._indexes=indexes;this._position=0;}
hasNext(){return this._position<this._indexes.length;}
item(){var index=this._indexes[this._position];return this._itemProvider.itemForIndex(index);}
next(){++this._position;}};HeapSnapshotWorker.HeapSnapshotFilteredIterator=class{constructor(iterator,filter){this._iterator=iterator;this._filter=filter;this._skipFilteredItems();}
hasNext(){return this._iterator.hasNext();}
item(){return this._iterator.item();}
next(){this._iterator.next();this._skipFilteredItems();}
_skipFilteredItems(){while(this._iterator.hasNext()&&!this._filter(this._iterator.item()))
this._iterator.next();}};HeapSnapshotWorker.HeapSnapshotProgress=class{constructor(dispatcher){this._dispatcher=dispatcher;}
updateStatus(status){this._sendUpdateEvent(Common.UIString(status));}
updateProgress(title,value,total){var percentValue=((total?(value/total):0)*100).toFixed(0);this._sendUpdateEvent(Common.UIString(title,percentValue));}
reportProblem(error){if(this._dispatcher)
this._dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot,error);}
_sendUpdateEvent(text){if(this._dispatcher)
this._dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotProgressEvent.Update,text);}};HeapSnapshotWorker.HeapSnapshotProblemReport=class{constructor(title){this._errors=[title];}
addError(error){if(this._errors.length>100)
return;this._errors.push(error);}
toString(){return this._errors.join('\n  ');}};HeapSnapshotWorker.HeapSnapshot=class{constructor(profile,progress){this.nodes=profile.nodes;this.containmentEdges=profile.edges;this._metaNode=profile.snapshot.meta;this._rawSamples=profile.samples;this._samples=null;this.strings=profile.strings;this._progress=progress;this._noDistance=-5;this._rootNodeIndex=0;if(profile.snapshot.root_index)
this._rootNodeIndex=profile.snapshot.root_index;this._snapshotDiffs={};this._aggregatesForDiff=null;this._aggregates={};this._aggregatesSortedFlags={};this._profile=profile;}
initialize(){var meta=this._metaNode;this._nodeTypeOffset=meta.node_fields.indexOf('type');this._nodeNameOffset=meta.node_fields.indexOf('name');this._nodeIdOffset=meta.node_fields.indexOf('id');this._nodeSelfSizeOffset=meta.node_fields.indexOf('self_size');this._nodeEdgeCountOffset=meta.node_fields.indexOf('edge_count');this._nodeTraceNodeIdOffset=meta.node_fields.indexOf('trace_node_id');this._nodeFieldCount=meta.node_fields.length;this._nodeTypes=meta.node_types[this._nodeTypeOffset];this._nodeArrayType=this._nodeTypes.indexOf('array');this._nodeHiddenType=this._nodeTypes.indexOf('hidden');this._nodeObjectType=this._nodeTypes.indexOf('object');this._nodeNativeType=this._nodeTypes.indexOf('native');this._nodeConsStringType=this._nodeTypes.indexOf('concatenated string');this._nodeSlicedStringType=this._nodeTypes.indexOf('sliced string');this._nodeCodeType=this._nodeTypes.indexOf('code');this._nodeSyntheticType=this._nodeTypes.indexOf('synthetic');this._edgeFieldsCount=meta.edge_fields.length;this._edgeTypeOffset=meta.edge_fields.indexOf('type');this._edgeNameOffset=meta.edge_fields.indexOf('name_or_index');this._edgeToNodeOffset=meta.edge_fields.indexOf('to_node');this._edgeTypes=meta.edge_types[this._edgeTypeOffset];this._edgeTypes.push('invisible');this._edgeElementType=this._edgeTypes.indexOf('element');this._edgeHiddenType=this._edgeTypes.indexOf('hidden');this._edgeInternalType=this._edgeTypes.indexOf('internal');this._edgeShortcutType=this._edgeTypes.indexOf('shortcut');this._edgeWeakType=this._edgeTypes.indexOf('weak');this._edgeInvisibleType=this._edgeTypes.indexOf('invisible');this.nodeCount=this.nodes.length/this._nodeFieldCount;this._edgeCount=this.containmentEdges.length/this._edgeFieldsCount;this._retainedSizes=new Float64Array(this.nodeCount);this._firstEdgeIndexes=new Uint32Array(this.nodeCount+1);this._retainingNodes=new Uint32Array(this._edgeCount);this._retainingEdges=new Uint32Array(this._edgeCount);this._firstRetainerIndex=new Uint32Array(this.nodeCount+1);this._nodeDistances=new Int32Array(this.nodeCount);this._firstDominatedNodeIndex=new Uint32Array(this.nodeCount+1);this._dominatedNodes=new Uint32Array(this.nodeCount-1);this._progress.updateStatus('Building edge indexes\u2026');this._buildEdgeIndexes();this._progress.updateStatus('Building retainers\u2026');this._buildRetainers();this._progress.updateStatus('Calculating node flags\u2026');this.calculateFlags();this._progress.updateStatus('Calculating distances\u2026');this.calculateDistances();this._progress.updateStatus('Building postorder index\u2026');var result=this._buildPostOrderIndex();this._progress.updateStatus('Building dominator tree\u2026');this._dominatorsTree=this._buildDominatorTree(result.postOrderIndex2NodeOrdinal,result.nodeOrdinal2PostOrderIndex);this._progress.updateStatus('Calculating retained sizes\u2026');this._calculateRetainedSizes(result.postOrderIndex2NodeOrdinal);this._progress.updateStatus('Building dominated nodes\u2026');this._buildDominatedNodes();this._progress.updateStatus('Calculating statistics\u2026');this.calculateStatistics();this._progress.updateStatus('Calculating samples\u2026');this._buildSamples();this._progress.updateStatus('Finished processing.');if(this._profile.snapshot.trace_function_count){this._progress.updateStatus('Building allocation statistics\u2026');var nodes=this.nodes;var nodesLength=nodes.length;var nodeFieldCount=this._nodeFieldCount;var node=this.rootNode();var liveObjects={};for(var nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){node.nodeIndex=nodeIndex;var traceNodeId=node.traceNodeId();var stats=liveObjects[traceNodeId];if(!stats)
liveObjects[traceNodeId]=stats={count:0,size:0,ids:[]};stats.count++;stats.size+=node.selfSize();stats.ids.push(node.id());}
this._allocationProfile=new HeapSnapshotWorker.AllocationProfile(this._profile,liveObjects);this._progress.updateStatus('Done');}}
_buildEdgeIndexes(){var nodes=this.nodes;var nodeCount=this.nodeCount;var firstEdgeIndexes=this._firstEdgeIndexes;var nodeFieldCount=this._nodeFieldCount;var edgeFieldsCount=this._edgeFieldsCount;var nodeEdgeCountOffset=this._nodeEdgeCountOffset;firstEdgeIndexes[nodeCount]=this.containmentEdges.length;for(var nodeOrdinal=0,edgeIndex=0;nodeOrdinal<nodeCount;++nodeOrdinal){firstEdgeIndexes[nodeOrdinal]=edgeIndex;edgeIndex+=nodes[nodeOrdinal*nodeFieldCount+nodeEdgeCountOffset]*edgeFieldsCount;}}
_buildRetainers(){var retainingNodes=this._retainingNodes;var retainingEdges=this._retainingEdges;var firstRetainerIndex=this._firstRetainerIndex;var containmentEdges=this.containmentEdges;var edgeFieldsCount=this._edgeFieldsCount;var nodeFieldCount=this._nodeFieldCount;var edgeToNodeOffset=this._edgeToNodeOffset;var firstEdgeIndexes=this._firstEdgeIndexes;var nodeCount=this.nodeCount;for(var toNodeFieldIndex=edgeToNodeOffset,l=containmentEdges.length;toNodeFieldIndex<l;toNodeFieldIndex+=edgeFieldsCount){var toNodeIndex=containmentEdges[toNodeFieldIndex];if(toNodeIndex%nodeFieldCount)
throw new Error('Invalid toNodeIndex '+toNodeIndex);++firstRetainerIndex[toNodeIndex/nodeFieldCount];}
for(var i=0,firstUnusedRetainerSlot=0;i<nodeCount;i++){var retainersCount=firstRetainerIndex[i];firstRetainerIndex[i]=firstUnusedRetainerSlot;retainingNodes[firstUnusedRetainerSlot]=retainersCount;firstUnusedRetainerSlot+=retainersCount;}
firstRetainerIndex[nodeCount]=retainingNodes.length;var nextNodeFirstEdgeIndex=firstEdgeIndexes[0];for(var srcNodeOrdinal=0;srcNodeOrdinal<nodeCount;++srcNodeOrdinal){var firstEdgeIndex=nextNodeFirstEdgeIndex;nextNodeFirstEdgeIndex=firstEdgeIndexes[srcNodeOrdinal+1];var srcNodeIndex=srcNodeOrdinal*nodeFieldCount;for(var edgeIndex=firstEdgeIndex;edgeIndex<nextNodeFirstEdgeIndex;edgeIndex+=edgeFieldsCount){var toNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];if(toNodeIndex%nodeFieldCount)
throw new Error('Invalid toNodeIndex '+toNodeIndex);var firstRetainerSlotIndex=firstRetainerIndex[toNodeIndex/nodeFieldCount];var nextUnusedRetainerSlotIndex=firstRetainerSlotIndex+(--retainingNodes[firstRetainerSlotIndex]);retainingNodes[nextUnusedRetainerSlotIndex]=srcNodeIndex;retainingEdges[nextUnusedRetainerSlotIndex]=edgeIndex;}}}
createNode(nodeIndex){throw new Error('Not implemented');}
createEdge(edgeIndex){throw new Error('Not implemented');}
createRetainingEdge(retainerIndex){throw new Error('Not implemented');}
_allNodes(){return new HeapSnapshotWorker.HeapSnapshotNodeIterator(this.rootNode());}
rootNode(){return this.createNode(this._rootNodeIndex);}
get rootNodeIndex(){return this._rootNodeIndex;}
get totalSize(){return this.rootNode().retainedSize();}
_getDominatedIndex(nodeIndex){if(nodeIndex%this._nodeFieldCount)
throw new Error('Invalid nodeIndex: '+nodeIndex);return this._firstDominatedNodeIndex[nodeIndex/this._nodeFieldCount];}
_createFilter(nodeFilter){var minNodeId=nodeFilter.minNodeId;var maxNodeId=nodeFilter.maxNodeId;var allocationNodeId=nodeFilter.allocationNodeId;var filter;if(typeof allocationNodeId==='number'){filter=this._createAllocationStackFilter(allocationNodeId);filter.key='AllocationNodeId: '+allocationNodeId;}else if(typeof minNodeId==='number'&&typeof maxNodeId==='number'){filter=this._createNodeIdFilter(minNodeId,maxNodeId);filter.key='NodeIdRange: '+minNodeId+'..'+maxNodeId;}
return filter;}
search(searchConfig,nodeFilter){var query=searchConfig.query;function filterString(matchedStringIndexes,string,index){if(string.indexOf(query)!==-1)
matchedStringIndexes.add(index);return matchedStringIndexes;}
var regexp=searchConfig.isRegex?new RegExp(query):createPlainTextSearchRegex(query,'i');function filterRegexp(matchedStringIndexes,string,index){if(regexp.test(string))
matchedStringIndexes.add(index);return matchedStringIndexes;}
var stringFilter=(searchConfig.isRegex||!searchConfig.caseSensitive)?filterRegexp:filterString;var stringIndexes=this.strings.reduce(stringFilter,new Set());if(!stringIndexes.size)
return[];var filter=this._createFilter(nodeFilter);var nodeIds=[];var nodesLength=this.nodes.length;var nodes=this.nodes;var nodeNameOffset=this._nodeNameOffset;var nodeIdOffset=this._nodeIdOffset;var nodeFieldCount=this._nodeFieldCount;var node=this.rootNode();for(var nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){node.nodeIndex=nodeIndex;if(filter&&!filter(node))
continue;if(stringIndexes.has(nodes[nodeIndex+nodeNameOffset]))
nodeIds.push(nodes[nodeIndex+nodeIdOffset]);}
return nodeIds;}
aggregatesWithFilter(nodeFilter){var filter=this._createFilter(nodeFilter);var key=filter?filter.key:'allObjects';return this.aggregates(false,key,filter);}
_createNodeIdFilter(minNodeId,maxNodeId){function nodeIdFilter(node){var id=node.id();return id>minNodeId&&id<=maxNodeId;}
return nodeIdFilter;}
_createAllocationStackFilter(bottomUpAllocationNodeId){var traceIds=this._allocationProfile.traceIds(bottomUpAllocationNodeId);if(!traceIds.length)
return undefined;var set={};for(var i=0;i<traceIds.length;i++)
set[traceIds[i]]=true;function traceIdFilter(node){return!!set[node.traceNodeId()];}
return traceIdFilter;}
aggregates(sortedIndexes,key,filter){var aggregatesByClassName=key&&this._aggregates[key];if(!aggregatesByClassName){var aggregates=this._buildAggregates(filter);this._calculateClassesRetainedSize(aggregates.aggregatesByClassIndex,filter);aggregatesByClassName=aggregates.aggregatesByClassName;if(key)
this._aggregates[key]=aggregatesByClassName;}
if(sortedIndexes&&(!key||!this._aggregatesSortedFlags[key])){this._sortAggregateIndexes(aggregatesByClassName);if(key)
this._aggregatesSortedFlags[key]=sortedIndexes;}
return aggregatesByClassName;}
allocationTracesTops(){return this._allocationProfile.serializeTraceTops();}
allocationNodeCallers(nodeId){return this._allocationProfile.serializeCallers(nodeId);}
allocationStack(nodeIndex){var node=this.createNode(nodeIndex);var allocationNodeId=node.traceNodeId();if(!allocationNodeId)
return null;return this._allocationProfile.serializeAllocationStack(allocationNodeId);}
aggregatesForDiff(){if(this._aggregatesForDiff)
return this._aggregatesForDiff;var aggregatesByClassName=this.aggregates(true,'allObjects');this._aggregatesForDiff={};var node=this.createNode();for(var className in aggregatesByClassName){var aggregate=aggregatesByClassName[className];var indexes=aggregate.idxs;var ids=new Array(indexes.length);var selfSizes=new Array(indexes.length);for(var i=0;i<indexes.length;i++){node.nodeIndex=indexes[i];ids[i]=node.id();selfSizes[i]=node.selfSize();}
this._aggregatesForDiff[className]={indexes:indexes,ids:ids,selfSizes:selfSizes};}
return this._aggregatesForDiff;}
isUserRoot(node){return true;}
forEachRoot(action,userRootsOnly){for(var iter=this.rootNode().edges();iter.hasNext();iter.next()){var node=iter.edge.node();if(!userRootsOnly||this.isUserRoot(node))
action(node);}}
calculateDistances(filter){var nodeCount=this.nodeCount;var distances=this._nodeDistances;var noDistance=this._noDistance;for(var i=0;i<nodeCount;++i)
distances[i]=noDistance;var nodesToVisit=new Uint32Array(this.nodeCount);var nodesToVisitLength=0;function enqueueNode(distance,node){var ordinal=node.ordinal();if(distances[ordinal]!==noDistance)
return;distances[ordinal]=distance;nodesToVisit[nodesToVisitLength++]=node.nodeIndex;}
this.forEachRoot(enqueueNode.bind(null,1),true);this._bfs(nodesToVisit,nodesToVisitLength,distances,filter);nodesToVisitLength=0;this.forEachRoot(enqueueNode.bind(null,HeapSnapshotModel.baseSystemDistance),false);this._bfs(nodesToVisit,nodesToVisitLength,distances,filter);}
_bfs(nodesToVisit,nodesToVisitLength,distances,filter){var edgeFieldsCount=this._edgeFieldsCount;var nodeFieldCount=this._nodeFieldCount;var containmentEdges=this.containmentEdges;var firstEdgeIndexes=this._firstEdgeIndexes;var edgeToNodeOffset=this._edgeToNodeOffset;var edgeTypeOffset=this._edgeTypeOffset;var nodeCount=this.nodeCount;var edgeWeakType=this._edgeWeakType;var noDistance=this._noDistance;var index=0;var edge=this.createEdge(0);var node=this.createNode(0);while(index<nodesToVisitLength){var nodeIndex=nodesToVisit[index++];var nodeOrdinal=nodeIndex/nodeFieldCount;var distance=distances[nodeOrdinal]+1;var firstEdgeIndex=firstEdgeIndexes[nodeOrdinal];var edgesEnd=firstEdgeIndexes[nodeOrdinal+1];node.nodeIndex=nodeIndex;for(var edgeIndex=firstEdgeIndex;edgeIndex<edgesEnd;edgeIndex+=edgeFieldsCount){var edgeType=containmentEdges[edgeIndex+edgeTypeOffset];if(edgeType===edgeWeakType)
continue;var childNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];var childNodeOrdinal=childNodeIndex/nodeFieldCount;if(distances[childNodeOrdinal]!==noDistance)
continue;edge.edgeIndex=edgeIndex;if(filter&&!filter(node,edge))
continue;distances[childNodeOrdinal]=distance;nodesToVisit[nodesToVisitLength++]=childNodeIndex;}}
if(nodesToVisitLength>nodeCount){throw new Error('BFS failed. Nodes to visit ('+nodesToVisitLength+') is more than nodes count ('+nodeCount+')');}}
_buildAggregates(filter){var aggregates={};var aggregatesByClassName={};var classIndexes=[];var nodes=this.nodes;var mapAndFlag=this.userObjectsMapAndFlag();var flags=mapAndFlag?mapAndFlag.map:null;var flag=mapAndFlag?mapAndFlag.flag:0;var nodesLength=nodes.length;var nodeNativeType=this._nodeNativeType;var nodeFieldCount=this._nodeFieldCount;var selfSizeOffset=this._nodeSelfSizeOffset;var nodeTypeOffset=this._nodeTypeOffset;var node=this.rootNode();var nodeDistances=this._nodeDistances;for(var nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){var nodeOrdinal=nodeIndex/nodeFieldCount;if(flags&&!(flags[nodeOrdinal]&flag))
continue;node.nodeIndex=nodeIndex;if(filter&&!filter(node))
continue;var selfSize=nodes[nodeIndex+selfSizeOffset];if(!selfSize&&nodes[nodeIndex+nodeTypeOffset]!==nodeNativeType)
continue;var classIndex=node.classIndex();if(!(classIndex in aggregates)){var nodeType=node.type();var nameMatters=nodeType==='object'||nodeType==='native';var value={count:1,distance:nodeDistances[nodeOrdinal],self:selfSize,maxRet:0,type:nodeType,name:nameMatters?node.name():null,idxs:[nodeIndex]};aggregates[classIndex]=value;classIndexes.push(classIndex);aggregatesByClassName[node.className()]=value;}else{var clss=aggregates[classIndex];clss.distance=Math.min(clss.distance,nodeDistances[nodeOrdinal]);++clss.count;clss.self+=selfSize;clss.idxs.push(nodeIndex);}}
for(var i=0,l=classIndexes.length;i<l;++i){var classIndex=classIndexes[i];aggregates[classIndex].idxs=aggregates[classIndex].idxs.slice();}
return{aggregatesByClassName:aggregatesByClassName,aggregatesByClassIndex:aggregates};}
_calculateClassesRetainedSize(aggregates,filter){var rootNodeIndex=this._rootNodeIndex;var node=this.createNode(rootNodeIndex);var list=[rootNodeIndex];var sizes=[-1];var classes=[];var seenClassNameIndexes={};var nodeFieldCount=this._nodeFieldCount;var nodeTypeOffset=this._nodeTypeOffset;var nodeNativeType=this._nodeNativeType;var dominatedNodes=this._dominatedNodes;var nodes=this.nodes;var mapAndFlag=this.userObjectsMapAndFlag();var flags=mapAndFlag?mapAndFlag.map:null;var flag=mapAndFlag?mapAndFlag.flag:0;var firstDominatedNodeIndex=this._firstDominatedNodeIndex;while(list.length){var nodeIndex=list.pop();node.nodeIndex=nodeIndex;var classIndex=node.classIndex();var seen=!!seenClassNameIndexes[classIndex];var nodeOrdinal=nodeIndex/nodeFieldCount;var dominatedIndexFrom=firstDominatedNodeIndex[nodeOrdinal];var dominatedIndexTo=firstDominatedNodeIndex[nodeOrdinal+1];if(!seen&&(!flags||(flags[nodeOrdinal]&flag))&&(!filter||filter(node))&&(node.selfSize()||nodes[nodeIndex+nodeTypeOffset]===nodeNativeType)){aggregates[classIndex].maxRet+=node.retainedSize();if(dominatedIndexFrom!==dominatedIndexTo){seenClassNameIndexes[classIndex]=true;sizes.push(list.length);classes.push(classIndex);}}
for(var i=dominatedIndexFrom;i<dominatedIndexTo;i++)
list.push(dominatedNodes[i]);var l=list.length;while(sizes[sizes.length-1]===l){sizes.pop();classIndex=classes.pop();seenClassNameIndexes[classIndex]=false;}}}
_sortAggregateIndexes(aggregates){var nodeA=this.createNode();var nodeB=this.createNode();for(var clss in aggregates){aggregates[clss].idxs.sort(function(idxA,idxB){nodeA.nodeIndex=idxA;nodeB.nodeIndex=idxB;return nodeA.id()<nodeB.id()?-1:1;});}}
_isEssentialEdge(nodeIndex,edgeType){return edgeType!==this._edgeWeakType&&(edgeType!==this._edgeShortcutType||nodeIndex===this._rootNodeIndex);}
_buildPostOrderIndex(){var nodeFieldCount=this._nodeFieldCount;var nodeCount=this.nodeCount;var rootNodeOrdinal=this._rootNodeIndex/nodeFieldCount;var edgeFieldsCount=this._edgeFieldsCount;var edgeTypeOffset=this._edgeTypeOffset;var edgeToNodeOffset=this._edgeToNodeOffset;var firstEdgeIndexes=this._firstEdgeIndexes;var containmentEdges=this.containmentEdges;var mapAndFlag=this.userObjectsMapAndFlag();var flags=mapAndFlag?mapAndFlag.map:null;var flag=mapAndFlag?mapAndFlag.flag:0;var stackNodes=new Uint32Array(nodeCount);var stackCurrentEdge=new Uint32Array(nodeCount);var postOrderIndex2NodeOrdinal=new Uint32Array(nodeCount);var nodeOrdinal2PostOrderIndex=new Uint32Array(nodeCount);var visited=new Uint8Array(nodeCount);var postOrderIndex=0;var stackTop=0;stackNodes[0]=rootNodeOrdinal;stackCurrentEdge[0]=firstEdgeIndexes[rootNodeOrdinal];visited[rootNodeOrdinal]=1;var iteration=0;while(true){++iteration;while(stackTop>=0){var nodeOrdinal=stackNodes[stackTop];var edgeIndex=stackCurrentEdge[stackTop];var edgesEnd=firstEdgeIndexes[nodeOrdinal+1];if(edgeIndex<edgesEnd){stackCurrentEdge[stackTop]+=edgeFieldsCount;var edgeType=containmentEdges[edgeIndex+edgeTypeOffset];if(!this._isEssentialEdge(nodeOrdinal*nodeFieldCount,edgeType))
continue;var childNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];var childNodeOrdinal=childNodeIndex/nodeFieldCount;if(visited[childNodeOrdinal])
continue;var nodeFlag=!flags||(flags[nodeOrdinal]&flag);var childNodeFlag=!flags||(flags[childNodeOrdinal]&flag);if(nodeOrdinal!==rootNodeOrdinal&&childNodeFlag&&!nodeFlag)
continue;++stackTop;stackNodes[stackTop]=childNodeOrdinal;stackCurrentEdge[stackTop]=firstEdgeIndexes[childNodeOrdinal];visited[childNodeOrdinal]=1;}else{nodeOrdinal2PostOrderIndex[nodeOrdinal]=postOrderIndex;postOrderIndex2NodeOrdinal[postOrderIndex++]=nodeOrdinal;--stackTop;}}
if(postOrderIndex===nodeCount||iteration>1)
break;var errors=new HeapSnapshotWorker.HeapSnapshotProblemReport(`Heap snapshot: ${nodeCount -
          postOrderIndex} nodes are unreachable from the root. Following nodes have only weak retainers:`);var dumpNode=this.rootNode();--postOrderIndex;stackTop=0;stackNodes[0]=rootNodeOrdinal;stackCurrentEdge[0]=firstEdgeIndexes[rootNodeOrdinal+1];for(var i=0;i<nodeCount;++i){if(visited[i]||!this._hasOnlyWeakRetainers(i))
continue;stackNodes[++stackTop]=i;stackCurrentEdge[stackTop]=firstEdgeIndexes[i];visited[i]=1;dumpNode.nodeIndex=i*nodeFieldCount;var retainers=[];for(var it=dumpNode.retainers();it.hasNext();it.next())
retainers.push(`${it.item().node().name()}@${it.item().node().id()}.${it.item().name()}`);errors.addError(`${dumpNode.name()} @${dumpNode.id()}  weak retainers: ${retainers.join(', ')}`);}
console.warn(errors.toString());}
if(postOrderIndex!==nodeCount){var errors=new HeapSnapshotWorker.HeapSnapshotProblemReport('Still found '+(nodeCount-postOrderIndex)+' unreachable nodes in heap snapshot:');var dumpNode=this.rootNode();--postOrderIndex;for(var i=0;i<nodeCount;++i){if(visited[i])
continue;dumpNode.nodeIndex=i*nodeFieldCount;errors.addError(dumpNode.name()+' @'+dumpNode.id());nodeOrdinal2PostOrderIndex[i]=postOrderIndex;postOrderIndex2NodeOrdinal[postOrderIndex++]=i;}
nodeOrdinal2PostOrderIndex[rootNodeOrdinal]=postOrderIndex;postOrderIndex2NodeOrdinal[postOrderIndex++]=rootNodeOrdinal;console.warn(errors.toString());}
return{postOrderIndex2NodeOrdinal:postOrderIndex2NodeOrdinal,nodeOrdinal2PostOrderIndex:nodeOrdinal2PostOrderIndex};}
_hasOnlyWeakRetainers(nodeOrdinal){var edgeTypeOffset=this._edgeTypeOffset;var edgeWeakType=this._edgeWeakType;var edgeShortcutType=this._edgeShortcutType;var containmentEdges=this.containmentEdges;var retainingEdges=this._retainingEdges;var beginRetainerIndex=this._firstRetainerIndex[nodeOrdinal];var endRetainerIndex=this._firstRetainerIndex[nodeOrdinal+1];for(var retainerIndex=beginRetainerIndex;retainerIndex<endRetainerIndex;++retainerIndex){var retainerEdgeIndex=retainingEdges[retainerIndex];var retainerEdgeType=containmentEdges[retainerEdgeIndex+edgeTypeOffset];if(retainerEdgeType!==edgeWeakType&&retainerEdgeType!==edgeShortcutType)
return false;}
return true;}
_buildDominatorTree(postOrderIndex2NodeOrdinal,nodeOrdinal2PostOrderIndex){var nodeFieldCount=this._nodeFieldCount;var firstRetainerIndex=this._firstRetainerIndex;var retainingNodes=this._retainingNodes;var retainingEdges=this._retainingEdges;var edgeFieldsCount=this._edgeFieldsCount;var edgeTypeOffset=this._edgeTypeOffset;var edgeToNodeOffset=this._edgeToNodeOffset;var firstEdgeIndexes=this._firstEdgeIndexes;var containmentEdges=this.containmentEdges;var rootNodeIndex=this._rootNodeIndex;var mapAndFlag=this.userObjectsMapAndFlag();var flags=mapAndFlag?mapAndFlag.map:null;var flag=mapAndFlag?mapAndFlag.flag:0;var nodesCount=postOrderIndex2NodeOrdinal.length;var rootPostOrderedIndex=nodesCount-1;var noEntry=nodesCount;var dominators=new Uint32Array(nodesCount);for(var i=0;i<rootPostOrderedIndex;++i)
dominators[i]=noEntry;dominators[rootPostOrderedIndex]=rootPostOrderedIndex;var affected=new Uint8Array(nodesCount);var nodeOrdinal;{nodeOrdinal=this._rootNodeIndex/nodeFieldCount;var endEdgeIndex=firstEdgeIndexes[nodeOrdinal+1];for(var edgeIndex=firstEdgeIndexes[nodeOrdinal];edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){var edgeType=containmentEdges[edgeIndex+edgeTypeOffset];if(!this._isEssentialEdge(this._rootNodeIndex,edgeType))
continue;var childNodeOrdinal=containmentEdges[edgeIndex+edgeToNodeOffset]/nodeFieldCount;affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]]=1;}}
var changed=true;while(changed){changed=false;for(var postOrderIndex=rootPostOrderedIndex-1;postOrderIndex>=0;--postOrderIndex){if(affected[postOrderIndex]===0)
continue;affected[postOrderIndex]=0;if(dominators[postOrderIndex]===rootPostOrderedIndex)
continue;nodeOrdinal=postOrderIndex2NodeOrdinal[postOrderIndex];var nodeFlag=!flags||(flags[nodeOrdinal]&flag);var newDominatorIndex=noEntry;var beginRetainerIndex=firstRetainerIndex[nodeOrdinal];var endRetainerIndex=firstRetainerIndex[nodeOrdinal+1];var orphanNode=true;for(var retainerIndex=beginRetainerIndex;retainerIndex<endRetainerIndex;++retainerIndex){var retainerEdgeIndex=retainingEdges[retainerIndex];var retainerEdgeType=containmentEdges[retainerEdgeIndex+edgeTypeOffset];var retainerNodeIndex=retainingNodes[retainerIndex];if(!this._isEssentialEdge(retainerNodeIndex,retainerEdgeType))
continue;orphanNode=false;var retainerNodeOrdinal=retainerNodeIndex/nodeFieldCount;var retainerNodeFlag=!flags||(flags[retainerNodeOrdinal]&flag);if(retainerNodeIndex!==rootNodeIndex&&nodeFlag&&!retainerNodeFlag)
continue;var retanerPostOrderIndex=nodeOrdinal2PostOrderIndex[retainerNodeOrdinal];if(dominators[retanerPostOrderIndex]!==noEntry){if(newDominatorIndex===noEntry){newDominatorIndex=retanerPostOrderIndex;}else{while(retanerPostOrderIndex!==newDominatorIndex){while(retanerPostOrderIndex<newDominatorIndex)
retanerPostOrderIndex=dominators[retanerPostOrderIndex];while(newDominatorIndex<retanerPostOrderIndex)
newDominatorIndex=dominators[newDominatorIndex];}}
if(newDominatorIndex===rootPostOrderedIndex)
break;}}
if(orphanNode)
newDominatorIndex=rootPostOrderedIndex;if(newDominatorIndex!==noEntry&&dominators[postOrderIndex]!==newDominatorIndex){dominators[postOrderIndex]=newDominatorIndex;changed=true;nodeOrdinal=postOrderIndex2NodeOrdinal[postOrderIndex];var beginEdgeToNodeFieldIndex=firstEdgeIndexes[nodeOrdinal]+edgeToNodeOffset;var endEdgeToNodeFieldIndex=firstEdgeIndexes[nodeOrdinal+1];for(var toNodeFieldIndex=beginEdgeToNodeFieldIndex;toNodeFieldIndex<endEdgeToNodeFieldIndex;toNodeFieldIndex+=edgeFieldsCount){var childNodeOrdinal=containmentEdges[toNodeFieldIndex]/nodeFieldCount;affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]]=1;}}}}
var dominatorsTree=new Uint32Array(nodesCount);for(var postOrderIndex=0,l=dominators.length;postOrderIndex<l;++postOrderIndex){nodeOrdinal=postOrderIndex2NodeOrdinal[postOrderIndex];dominatorsTree[nodeOrdinal]=postOrderIndex2NodeOrdinal[dominators[postOrderIndex]];}
return dominatorsTree;}
_calculateRetainedSizes(postOrderIndex2NodeOrdinal){var nodeCount=this.nodeCount;var nodes=this.nodes;var nodeSelfSizeOffset=this._nodeSelfSizeOffset;var nodeFieldCount=this._nodeFieldCount;var dominatorsTree=this._dominatorsTree;var retainedSizes=this._retainedSizes;for(var nodeOrdinal=0;nodeOrdinal<nodeCount;++nodeOrdinal)
retainedSizes[nodeOrdinal]=nodes[nodeOrdinal*nodeFieldCount+nodeSelfSizeOffset];for(var postOrderIndex=0;postOrderIndex<nodeCount-1;++postOrderIndex){var nodeOrdinal=postOrderIndex2NodeOrdinal[postOrderIndex];var dominatorOrdinal=dominatorsTree[nodeOrdinal];retainedSizes[dominatorOrdinal]+=retainedSizes[nodeOrdinal];}}
_buildDominatedNodes(){var indexArray=this._firstDominatedNodeIndex;var dominatedNodes=this._dominatedNodes;var nodeFieldCount=this._nodeFieldCount;var dominatorsTree=this._dominatorsTree;var fromNodeOrdinal=0;var toNodeOrdinal=this.nodeCount;var rootNodeOrdinal=this._rootNodeIndex/nodeFieldCount;if(rootNodeOrdinal===fromNodeOrdinal)
fromNodeOrdinal=1;else if(rootNodeOrdinal===toNodeOrdinal-1)
toNodeOrdinal=toNodeOrdinal-1;else
throw new Error('Root node is expected to be either first or last');for(var nodeOrdinal=fromNodeOrdinal;nodeOrdinal<toNodeOrdinal;++nodeOrdinal)
++indexArray[dominatorsTree[nodeOrdinal]];var firstDominatedNodeIndex=0;for(var i=0,l=this.nodeCount;i<l;++i){var dominatedCount=dominatedNodes[firstDominatedNodeIndex]=indexArray[i];indexArray[i]=firstDominatedNodeIndex;firstDominatedNodeIndex+=dominatedCount;}
indexArray[this.nodeCount]=dominatedNodes.length;for(var nodeOrdinal=fromNodeOrdinal;nodeOrdinal<toNodeOrdinal;++nodeOrdinal){var dominatorOrdinal=dominatorsTree[nodeOrdinal];var dominatedRefIndex=indexArray[dominatorOrdinal];dominatedRefIndex+=(--dominatedNodes[dominatedRefIndex]);dominatedNodes[dominatedRefIndex]=nodeOrdinal*nodeFieldCount;}}
_buildSamples(){var samples=this._rawSamples;if(!samples||!samples.length)
return;var sampleCount=samples.length/2;var sizeForRange=new Array(sampleCount);var timestamps=new Array(sampleCount);var lastAssignedIds=new Array(sampleCount);var timestampOffset=this._metaNode.sample_fields.indexOf('timestamp_us');var lastAssignedIdOffset=this._metaNode.sample_fields.indexOf('last_assigned_id');for(var i=0;i<sampleCount;i++){sizeForRange[i]=0;timestamps[i]=(samples[2*i+timestampOffset])/1000;lastAssignedIds[i]=samples[2*i+lastAssignedIdOffset];}
var nodes=this.nodes;var nodesLength=nodes.length;var nodeFieldCount=this._nodeFieldCount;var node=this.rootNode();for(var nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){node.nodeIndex=nodeIndex;var nodeId=node.id();if(nodeId%2===0)
continue;var rangeIndex=lastAssignedIds.lowerBound(nodeId);if(rangeIndex===sampleCount){continue;}
sizeForRange[rangeIndex]+=node.selfSize();}
this._samples=new HeapSnapshotModel.Samples(timestamps,lastAssignedIds,sizeForRange);}
getSamples(){return this._samples;}
calculateFlags(){throw new Error('Not implemented');}
calculateStatistics(){throw new Error('Not implemented');}
userObjectsMapAndFlag(){throw new Error('Not implemented');}
calculateSnapshotDiff(baseSnapshotId,baseSnapshotAggregates){var snapshotDiff=this._snapshotDiffs[baseSnapshotId];if(snapshotDiff)
return snapshotDiff;snapshotDiff={};var aggregates=this.aggregates(true,'allObjects');for(var className in baseSnapshotAggregates){var baseAggregate=baseSnapshotAggregates[className];var diff=this._calculateDiffForClass(baseAggregate,aggregates[className]);if(diff)
snapshotDiff[className]=diff;}
var emptyBaseAggregate=new HeapSnapshotModel.AggregateForDiff();for(var className in aggregates){if(className in baseSnapshotAggregates)
continue;snapshotDiff[className]=this._calculateDiffForClass(emptyBaseAggregate,aggregates[className]);}
this._snapshotDiffs[baseSnapshotId]=snapshotDiff;return snapshotDiff;}
_calculateDiffForClass(baseAggregate,aggregate){var baseIds=baseAggregate.ids;var baseIndexes=baseAggregate.indexes;var baseSelfSizes=baseAggregate.selfSizes;var indexes=aggregate?aggregate.idxs:[];var i=0,l=baseIds.length;var j=0,m=indexes.length;var diff=new HeapSnapshotModel.Diff();var nodeB=this.createNode(indexes[j]);while(i<l&&j<m){var nodeAId=baseIds[i];if(nodeAId<nodeB.id()){diff.deletedIndexes.push(baseIndexes[i]);diff.removedCount++;diff.removedSize+=baseSelfSizes[i];++i;}else if(nodeAId>nodeB.id()){diff.addedIndexes.push(indexes[j]);diff.addedCount++;diff.addedSize+=nodeB.selfSize();nodeB.nodeIndex=indexes[++j];}else{++i;nodeB.nodeIndex=indexes[++j];}}
while(i<l){diff.deletedIndexes.push(baseIndexes[i]);diff.removedCount++;diff.removedSize+=baseSelfSizes[i];++i;}
while(j<m){diff.addedIndexes.push(indexes[j]);diff.addedCount++;diff.addedSize+=nodeB.selfSize();nodeB.nodeIndex=indexes[++j];}
diff.countDelta=diff.addedCount-diff.removedCount;diff.sizeDelta=diff.addedSize-diff.removedSize;if(!diff.addedCount&&!diff.removedCount)
return null;return diff;}
_nodeForSnapshotObjectId(snapshotObjectId){for(var it=this._allNodes();it.hasNext();it.next()){if(it.node.id()===snapshotObjectId)
return it.node;}
return null;}
nodeClassName(snapshotObjectId){var node=this._nodeForSnapshotObjectId(snapshotObjectId);if(node)
return node.className();return null;}
idsOfObjectsWithName(name){var ids=[];for(var it=this._allNodes();it.hasNext();it.next()){if(it.item().name()===name)
ids.push(it.item().id());}
return ids;}
createEdgesProvider(nodeIndex){var node=this.createNode(nodeIndex);var filter=this.containmentEdgesFilter();var indexProvider=new HeapSnapshotWorker.HeapSnapshotEdgeIndexProvider(this);return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this,filter,node.edges(),indexProvider);}
createEdgesProviderForTest(nodeIndex,filter){var node=this.createNode(nodeIndex);var indexProvider=new HeapSnapshotWorker.HeapSnapshotEdgeIndexProvider(this);return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this,filter,node.edges(),indexProvider);}
retainingEdgesFilter(){return null;}
containmentEdgesFilter(){return null;}
createRetainingEdgesProvider(nodeIndex){var node=this.createNode(nodeIndex);var filter=this.retainingEdgesFilter();var indexProvider=new HeapSnapshotWorker.HeapSnapshotRetainerEdgeIndexProvider(this);return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this,filter,node.retainers(),indexProvider);}
createAddedNodesProvider(baseSnapshotId,className){var snapshotDiff=this._snapshotDiffs[baseSnapshotId];var diffForClass=snapshotDiff[className];return new HeapSnapshotWorker.HeapSnapshotNodesProvider(this,null,diffForClass.addedIndexes);}
createDeletedNodesProvider(nodeIndexes){return new HeapSnapshotWorker.HeapSnapshotNodesProvider(this,null,nodeIndexes);}
classNodesFilter(){return null;}
createNodesProviderForClass(className,nodeFilter){return new HeapSnapshotWorker.HeapSnapshotNodesProvider(this,this.classNodesFilter(),this.aggregatesWithFilter(nodeFilter)[className].idxs);}
_maxJsNodeId(){var nodeFieldCount=this._nodeFieldCount;var nodes=this.nodes;var nodesLength=nodes.length;var id=0;for(var nodeIndex=this._nodeIdOffset;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){var nextId=nodes[nodeIndex];if(nextId%2===0)
continue;if(id<nextId)
id=nextId;}
return id;}
updateStaticData(){return new HeapSnapshotModel.StaticData(this.nodeCount,this._rootNodeIndex,this.totalSize,this._maxJsNodeId());}};var HeapSnapshotMetainfo=class{constructor(){this.node_fields=[];this.node_types=[];this.edge_fields=[];this.edge_types=[];this.trace_function_info_fields=[];this.trace_node_fields=[];this.sample_fields=[];this.type_strings={};}};var HeapSnapshotHeader=class{constructor(){this.title='';this.meta=new HeapSnapshotMetainfo();this.node_count=0;this.edge_count=0;this.trace_function_count=0;}};HeapSnapshotWorker.HeapSnapshotItemProvider=class{constructor(iterator,indexProvider){this._iterator=iterator;this._indexProvider=indexProvider;this._isEmpty=!iterator.hasNext();this._iterationOrder=null;this._currentComparator=null;this._sortedPrefixLength=0;this._sortedSuffixLength=0;}
_createIterationOrder(){if(this._iterationOrder)
return;this._iterationOrder=[];for(var iterator=this._iterator;iterator.hasNext();iterator.next())
this._iterationOrder.push(iterator.item().itemIndex());}
isEmpty(){return this._isEmpty;}
serializeItemsRange(begin,end){this._createIterationOrder();if(begin>end)
throw new Error('Start position > end position: '+begin+' > '+end);if(end>this._iterationOrder.length)
end=this._iterationOrder.length;if(this._sortedPrefixLength<end&&begin<this._iterationOrder.length-this._sortedSuffixLength){this.sort(this._currentComparator,this._sortedPrefixLength,this._iterationOrder.length-1-this._sortedSuffixLength,begin,end-1);if(begin<=this._sortedPrefixLength)
this._sortedPrefixLength=end;if(end>=this._iterationOrder.length-this._sortedSuffixLength)
this._sortedSuffixLength=this._iterationOrder.length-begin;}
var position=begin;var count=end-begin;var result=new Array(count);for(var i=0;i<count;++i){var itemIndex=this._iterationOrder[position++];var item=this._indexProvider.itemForIndex(itemIndex);result[i]=item.serialize();}
return new HeapSnapshotModel.ItemsRange(begin,end,this._iterationOrder.length,result);}
sortAndRewind(comparator){this._currentComparator=comparator;this._sortedPrefixLength=0;this._sortedSuffixLength=0;}};HeapSnapshotWorker.HeapSnapshotEdgesProvider=class extends HeapSnapshotWorker.HeapSnapshotItemProvider{constructor(snapshot,filter,edgesIter,indexProvider){var iter=filter?new HeapSnapshotWorker.HeapSnapshotFilteredIterator(edgesIter,(filter)):edgesIter;super(iter,indexProvider);this.snapshot=snapshot;}
sort(comparator,leftBound,rightBound,windowLeft,windowRight){var fieldName1=comparator.fieldName1;var fieldName2=comparator.fieldName2;var ascending1=comparator.ascending1;var ascending2=comparator.ascending2;var edgeA=this._iterator.item().clone();var edgeB=edgeA.clone();var nodeA=this.snapshot.createNode();var nodeB=this.snapshot.createNode();function compareEdgeFieldName(ascending,indexA,indexB){edgeA.edgeIndex=indexA;edgeB.edgeIndex=indexB;if(edgeB.name()==='__proto__')
return-1;if(edgeA.name()==='__proto__')
return 1;var result=edgeA.hasStringName()===edgeB.hasStringName()?(edgeA.name()<edgeB.name()?-1:(edgeA.name()>edgeB.name()?1:0)):(edgeA.hasStringName()?-1:1);return ascending?result:-result;}
function compareNodeField(fieldName,ascending,indexA,indexB){edgeA.edgeIndex=indexA;nodeA.nodeIndex=edgeA.nodeIndex();var valueA=nodeA[fieldName]();edgeB.edgeIndex=indexB;nodeB.nodeIndex=edgeB.nodeIndex();var valueB=nodeB[fieldName]();var result=valueA<valueB?-1:(valueA>valueB?1:0);return ascending?result:-result;}
function compareEdgeAndNode(indexA,indexB){var result=compareEdgeFieldName(ascending1,indexA,indexB);if(result===0)
result=compareNodeField(fieldName2,ascending2,indexA,indexB);if(result===0)
return indexA-indexB;return result;}
function compareNodeAndEdge(indexA,indexB){var result=compareNodeField(fieldName1,ascending1,indexA,indexB);if(result===0)
result=compareEdgeFieldName(ascending2,indexA,indexB);if(result===0)
return indexA-indexB;return result;}
function compareNodeAndNode(indexA,indexB){var result=compareNodeField(fieldName1,ascending1,indexA,indexB);if(result===0)
result=compareNodeField(fieldName2,ascending2,indexA,indexB);if(result===0)
return indexA-indexB;return result;}
if(fieldName1==='!edgeName')
this._iterationOrder.sortRange(compareEdgeAndNode,leftBound,rightBound,windowLeft,windowRight);else if(fieldName2==='!edgeName')
this._iterationOrder.sortRange(compareNodeAndEdge,leftBound,rightBound,windowLeft,windowRight);else
this._iterationOrder.sortRange(compareNodeAndNode,leftBound,rightBound,windowLeft,windowRight);}};HeapSnapshotWorker.HeapSnapshotNodesProvider=class extends HeapSnapshotWorker.HeapSnapshotItemProvider{constructor(snapshot,filter,nodeIndexes){var indexProvider=new HeapSnapshotWorker.HeapSnapshotNodeIndexProvider(snapshot);var it=new HeapSnapshotWorker.HeapSnapshotIndexRangeIterator(indexProvider,nodeIndexes);if(filter){it=new HeapSnapshotWorker.HeapSnapshotFilteredIterator(it,(filter));}
super(it,indexProvider);this.snapshot=snapshot;}
nodePosition(snapshotObjectId){this._createIterationOrder();var node=this.snapshot.createNode();for(var i=0;i<this._iterationOrder.length;i++){node.nodeIndex=this._iterationOrder[i];if(node.id()===snapshotObjectId)
break;}
if(i===this._iterationOrder.length)
return-1;var targetNodeIndex=this._iterationOrder[i];var smallerCount=0;var compare=this._buildCompareFunction(this._currentComparator);for(var i=0;i<this._iterationOrder.length;i++){if(compare(this._iterationOrder[i],targetNodeIndex)<0)
++smallerCount;}
return smallerCount;}
_buildCompareFunction(comparator){var nodeA=this.snapshot.createNode();var nodeB=this.snapshot.createNode();var fieldAccessor1=nodeA[comparator.fieldName1];var fieldAccessor2=nodeA[comparator.fieldName2];var ascending1=comparator.ascending1?1:-1;var ascending2=comparator.ascending2?1:-1;function sortByNodeField(fieldAccessor,ascending){var valueA=fieldAccessor.call(nodeA);var valueB=fieldAccessor.call(nodeB);return valueA<valueB?-ascending:(valueA>valueB?ascending:0);}
function sortByComparator(indexA,indexB){nodeA.nodeIndex=indexA;nodeB.nodeIndex=indexB;var result=sortByNodeField(fieldAccessor1,ascending1);if(result===0)
result=sortByNodeField(fieldAccessor2,ascending2);return result||indexA-indexB;}
return sortByComparator;}
sort(comparator,leftBound,rightBound,windowLeft,windowRight){this._iterationOrder.sortRange(this._buildCompareFunction(comparator),leftBound,rightBound,windowLeft,windowRight);}};HeapSnapshotWorker.JSHeapSnapshot=class extends HeapSnapshotWorker.HeapSnapshot{constructor(profile,progress){super(profile,progress);this._nodeFlags={canBeQueried:1,detachedDOMTreeNode:2,pageObject:4};this.initialize();this._lazyStringCache={};}
createNode(nodeIndex){return new HeapSnapshotWorker.JSHeapSnapshotNode(this,nodeIndex===undefined?-1:nodeIndex);}
createEdge(edgeIndex){return new HeapSnapshotWorker.JSHeapSnapshotEdge(this,edgeIndex);}
createRetainingEdge(retainerIndex){return new HeapSnapshotWorker.JSHeapSnapshotRetainerEdge(this,retainerIndex);}
classNodesFilter(){var mapAndFlag=this.userObjectsMapAndFlag();if(!mapAndFlag)
return null;var map=mapAndFlag.map;var flag=mapAndFlag.flag;function filter(node){return!!(map[node.ordinal()]&flag);}
return filter;}
containmentEdgesFilter(){return edge=>!edge.isInvisible();}
retainingEdgesFilter(){var containmentEdgesFilter=this.containmentEdgesFilter();function filter(edge){return containmentEdgesFilter(edge)&&!edge.node().isRoot()&&!edge.isWeak();}
return filter;}
calculateFlags(){this._flags=new Uint32Array(this.nodeCount);this._markDetachedDOMTreeNodes();this._markQueriableHeapObjects();this._markPageOwnedNodes();}
calculateDistances(){function filter(node,edge){if(node.isHidden())
return edge.name()!=='sloppy_function_map'||node.rawName()!=='system / NativeContext';if(node.isArray()){if(node.rawName()!=='(map descriptors)')
return true;var index=edge.name();return index<2||(index%3)!==1;}
return true;}
super.calculateDistances(filter);}
isUserRoot(node){return node.isUserRoot()||node.isDocumentDOMTreesRoot();}
forEachRoot(action,userRootsOnly){function getChildNodeByName(node,name){for(var iter=node.edges();iter.hasNext();iter.next()){var child=iter.edge.node();if(child.name()===name)
return child;}
return null;}
var visitedNodes={};function doAction(node){var ordinal=node.ordinal();if(!visitedNodes[ordinal]){action(node);visitedNodes[ordinal]=true;}}
var gcRoots=getChildNodeByName(this.rootNode(),'(GC roots)');if(!gcRoots)
return;if(userRootsOnly){for(var iter=this.rootNode().edges();iter.hasNext();iter.next()){var node=iter.edge.node();if(this.isUserRoot(node))
doAction(node);}}else{for(var iter=gcRoots.edges();iter.hasNext();iter.next()){var subRoot=iter.edge.node();for(var iter2=subRoot.edges();iter2.hasNext();iter2.next())
doAction(iter2.edge.node());doAction(subRoot);}
for(var iter=this.rootNode().edges();iter.hasNext();iter.next())
doAction(iter.edge.node());}}
userObjectsMapAndFlag(){return{map:this._flags,flag:this._nodeFlags.pageObject};}
_flagsOfNode(node){return this._flags[node.nodeIndex/this._nodeFieldCount];}
_markDetachedDOMTreeNodes(){var flag=this._nodeFlags.detachedDOMTreeNode;var detachedDOMTreesRoot;for(var iter=this.rootNode().edges();iter.hasNext();iter.next()){var node=iter.edge.node();if(node.name()==='(Detached DOM trees)'){detachedDOMTreesRoot=node;break;}}
if(!detachedDOMTreesRoot)
return;var detachedDOMTreeRE=/^Detached DOM tree/;for(var iter=detachedDOMTreesRoot.edges();iter.hasNext();iter.next()){var node=iter.edge.node();if(detachedDOMTreeRE.test(node.className())){for(var edgesIter=node.edges();edgesIter.hasNext();edgesIter.next())
this._flags[edgesIter.edge.node().nodeIndex/this._nodeFieldCount]|=flag;}}}
_markQueriableHeapObjects(){var flag=this._nodeFlags.canBeQueried;var hiddenEdgeType=this._edgeHiddenType;var internalEdgeType=this._edgeInternalType;var invisibleEdgeType=this._edgeInvisibleType;var weakEdgeType=this._edgeWeakType;var edgeToNodeOffset=this._edgeToNodeOffset;var edgeTypeOffset=this._edgeTypeOffset;var edgeFieldsCount=this._edgeFieldsCount;var containmentEdges=this.containmentEdges;var nodeFieldCount=this._nodeFieldCount;var firstEdgeIndexes=this._firstEdgeIndexes;var flags=this._flags;var list=[];for(var iter=this.rootNode().edges();iter.hasNext();iter.next()){if(iter.edge.node().isUserRoot())
list.push(iter.edge.node().nodeIndex/nodeFieldCount);}
while(list.length){var nodeOrdinal=list.pop();if(flags[nodeOrdinal]&flag)
continue;flags[nodeOrdinal]|=flag;var beginEdgeIndex=firstEdgeIndexes[nodeOrdinal];var endEdgeIndex=firstEdgeIndexes[nodeOrdinal+1];for(var edgeIndex=beginEdgeIndex;edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){var childNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];var childNodeOrdinal=childNodeIndex/nodeFieldCount;if(flags[childNodeOrdinal]&flag)
continue;var type=containmentEdges[edgeIndex+edgeTypeOffset];if(type===hiddenEdgeType||type===invisibleEdgeType||type===internalEdgeType||type===weakEdgeType)
continue;list.push(childNodeOrdinal);}}}
_markPageOwnedNodes(){var edgeShortcutType=this._edgeShortcutType;var edgeElementType=this._edgeElementType;var edgeToNodeOffset=this._edgeToNodeOffset;var edgeTypeOffset=this._edgeTypeOffset;var edgeFieldsCount=this._edgeFieldsCount;var edgeWeakType=this._edgeWeakType;var firstEdgeIndexes=this._firstEdgeIndexes;var containmentEdges=this.containmentEdges;var nodeFieldCount=this._nodeFieldCount;var nodesCount=this.nodeCount;var flags=this._flags;var pageObjectFlag=this._nodeFlags.pageObject;var nodesToVisit=new Uint32Array(nodesCount);var nodesToVisitLength=0;var rootNodeOrdinal=this._rootNodeIndex/nodeFieldCount;var node=this.rootNode();for(var edgeIndex=firstEdgeIndexes[rootNodeOrdinal],endEdgeIndex=firstEdgeIndexes[rootNodeOrdinal+1];edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){var edgeType=containmentEdges[edgeIndex+edgeTypeOffset];var nodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];if(edgeType===edgeElementType){node.nodeIndex=nodeIndex;if(!node.isDocumentDOMTreesRoot())
continue;}else if(edgeType!==edgeShortcutType){continue;}
var nodeOrdinal=nodeIndex/nodeFieldCount;nodesToVisit[nodesToVisitLength++]=nodeOrdinal;flags[nodeOrdinal]|=pageObjectFlag;}
while(nodesToVisitLength){var nodeOrdinal=nodesToVisit[--nodesToVisitLength];var beginEdgeIndex=firstEdgeIndexes[nodeOrdinal];var endEdgeIndex=firstEdgeIndexes[nodeOrdinal+1];for(var edgeIndex=beginEdgeIndex;edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){var childNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];var childNodeOrdinal=childNodeIndex/nodeFieldCount;if(flags[childNodeOrdinal]&pageObjectFlag)
continue;var type=containmentEdges[edgeIndex+edgeTypeOffset];if(type===edgeWeakType)
continue;nodesToVisit[nodesToVisitLength++]=childNodeOrdinal;flags[childNodeOrdinal]|=pageObjectFlag;}}}
calculateStatistics(){var nodeFieldCount=this._nodeFieldCount;var nodes=this.nodes;var nodesLength=nodes.length;var nodeTypeOffset=this._nodeTypeOffset;var nodeSizeOffset=this._nodeSelfSizeOffset;var nodeNativeType=this._nodeNativeType;var nodeCodeType=this._nodeCodeType;var nodeConsStringType=this._nodeConsStringType;var nodeSlicedStringType=this._nodeSlicedStringType;var distances=this._nodeDistances;var sizeNative=0;var sizeCode=0;var sizeStrings=0;var sizeJSArrays=0;var sizeSystem=0;var node=this.rootNode();for(var nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){var nodeSize=nodes[nodeIndex+nodeSizeOffset];var ordinal=nodeIndex/nodeFieldCount;if(distances[ordinal]>=HeapSnapshotModel.baseSystemDistance){sizeSystem+=nodeSize;continue;}
var nodeType=nodes[nodeIndex+nodeTypeOffset];node.nodeIndex=nodeIndex;if(nodeType===nodeNativeType)
sizeNative+=nodeSize;else if(nodeType===nodeCodeType)
sizeCode+=nodeSize;else if(nodeType===nodeConsStringType||nodeType===nodeSlicedStringType||node.type()==='string')
sizeStrings+=nodeSize;else if(node.name()==='Array')
sizeJSArrays+=this._calculateArraySize(node);}
this._statistics=new HeapSnapshotModel.Statistics();this._statistics.total=this.totalSize;this._statistics.v8heap=this.totalSize-sizeNative;this._statistics.native=sizeNative;this._statistics.code=sizeCode;this._statistics.jsArrays=sizeJSArrays;this._statistics.strings=sizeStrings;this._statistics.system=sizeSystem;}
_calculateArraySize(node){var size=node.selfSize();var beginEdgeIndex=node.edgeIndexesStart();var endEdgeIndex=node.edgeIndexesEnd();var containmentEdges=this.containmentEdges;var strings=this.strings;var edgeToNodeOffset=this._edgeToNodeOffset;var edgeTypeOffset=this._edgeTypeOffset;var edgeNameOffset=this._edgeNameOffset;var edgeFieldsCount=this._edgeFieldsCount;var edgeInternalType=this._edgeInternalType;for(var edgeIndex=beginEdgeIndex;edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){var edgeType=containmentEdges[edgeIndex+edgeTypeOffset];if(edgeType!==edgeInternalType)
continue;var edgeName=strings[containmentEdges[edgeIndex+edgeNameOffset]];if(edgeName!=='elements')
continue;var elementsNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];node.nodeIndex=elementsNodeIndex;if(node.retainersCount()===1)
size+=node.selfSize();break;}
return size;}
getStatistics(){return this._statistics;}};HeapSnapshotWorker.JSHeapSnapshotNode=class extends HeapSnapshotWorker.HeapSnapshotNode{constructor(snapshot,nodeIndex){super(snapshot,nodeIndex);}
canBeQueried(){var flags=this._snapshot._flagsOfNode(this);return!!(flags&this._snapshot._nodeFlags.canBeQueried);}
rawName(){return super.name();}
name(){var snapshot=this._snapshot;if(this.rawType()===snapshot._nodeConsStringType){var string=snapshot._lazyStringCache[this.nodeIndex];if(typeof string==='undefined'){string=this._consStringName();snapshot._lazyStringCache[this.nodeIndex]=string;}
return string;}
return this.rawName();}
_consStringName(){var snapshot=this._snapshot;var consStringType=snapshot._nodeConsStringType;var edgeInternalType=snapshot._edgeInternalType;var edgeFieldsCount=snapshot._edgeFieldsCount;var edgeToNodeOffset=snapshot._edgeToNodeOffset;var edgeTypeOffset=snapshot._edgeTypeOffset;var edgeNameOffset=snapshot._edgeNameOffset;var strings=snapshot.strings;var edges=snapshot.containmentEdges;var firstEdgeIndexes=snapshot._firstEdgeIndexes;var nodeFieldCount=snapshot._nodeFieldCount;var nodeTypeOffset=snapshot._nodeTypeOffset;var nodeNameOffset=snapshot._nodeNameOffset;var nodes=snapshot.nodes;var nodesStack=[];nodesStack.push(this.nodeIndex);var name='';while(nodesStack.length&&name.length<1024){var nodeIndex=nodesStack.pop();if(nodes[nodeIndex+nodeTypeOffset]!==consStringType){name+=strings[nodes[nodeIndex+nodeNameOffset]];continue;}
var nodeOrdinal=nodeIndex/nodeFieldCount;var beginEdgeIndex=firstEdgeIndexes[nodeOrdinal];var endEdgeIndex=firstEdgeIndexes[nodeOrdinal+1];var firstNodeIndex=0;var secondNodeIndex=0;for(var edgeIndex=beginEdgeIndex;edgeIndex<endEdgeIndex&&(!firstNodeIndex||!secondNodeIndex);edgeIndex+=edgeFieldsCount){var edgeType=edges[edgeIndex+edgeTypeOffset];if(edgeType===edgeInternalType){var edgeName=strings[edges[edgeIndex+edgeNameOffset]];if(edgeName==='first')
firstNodeIndex=edges[edgeIndex+edgeToNodeOffset];else if(edgeName==='second')
secondNodeIndex=edges[edgeIndex+edgeToNodeOffset];}}
nodesStack.push(secondNodeIndex);nodesStack.push(firstNodeIndex);}
return name;}
className(){var type=this.type();switch(type){case'hidden':return'(system)';case'object':case'native':return this.name();case'code':return'(compiled code)';default:return'('+type+')';}}
classIndex(){var snapshot=this._snapshot;var nodes=snapshot.nodes;var type=nodes[this.nodeIndex+snapshot._nodeTypeOffset];if(type===snapshot._nodeObjectType||type===snapshot._nodeNativeType)
return nodes[this.nodeIndex+snapshot._nodeNameOffset];return-1-type;}
id(){var snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeIdOffset];}
isHidden(){return this.rawType()===this._snapshot._nodeHiddenType;}
isArray(){return this.rawType()===this._snapshot._nodeArrayType;}
isSynthetic(){return this.rawType()===this._snapshot._nodeSyntheticType;}
isUserRoot(){return!this.isSynthetic();}
isDocumentDOMTreesRoot(){return this.isSynthetic()&&this.name()==='(Document DOM trees)';}
serialize(){var result=super.serialize();var flags=this._snapshot._flagsOfNode(this);if(flags&this._snapshot._nodeFlags.canBeQueried)
result.canBeQueried=true;if(flags&this._snapshot._nodeFlags.detachedDOMTreeNode)
result.detachedDOMTreeNode=true;return result;}};HeapSnapshotWorker.JSHeapSnapshotEdge=class extends HeapSnapshotWorker.HeapSnapshotEdge{constructor(snapshot,edgeIndex){super(snapshot,edgeIndex);}
clone(){var snapshot=(this._snapshot);return new HeapSnapshotWorker.JSHeapSnapshotEdge(snapshot,this.edgeIndex);}
hasStringName(){if(!this.isShortcut())
return this._hasStringName();return isNaN(parseInt(this._name(),10));}
isElement(){return this.rawType()===this._snapshot._edgeElementType;}
isHidden(){return this.rawType()===this._snapshot._edgeHiddenType;}
isWeak(){return this.rawType()===this._snapshot._edgeWeakType;}
isInternal(){return this.rawType()===this._snapshot._edgeInternalType;}
isInvisible(){return this.rawType()===this._snapshot._edgeInvisibleType;}
isShortcut(){return this.rawType()===this._snapshot._edgeShortcutType;}
name(){var name=this._name();if(!this.isShortcut())
return String(name);var numName=parseInt(name,10);return String(isNaN(numName)?name:numName);}
toString(){var name=this.name();switch(this.type()){case'context':return'->'+name;case'element':return'['+name+']';case'weak':return'[['+name+']]';case'property':return name.indexOf(' ')===-1?'.'+name:'["'+name+'"]';case'shortcut':if(typeof name==='string')
return name.indexOf(' ')===-1?'.'+name:'["'+name+'"]';else
return'['+name+']';case'internal':case'hidden':case'invisible':return'{'+name+'}';}
return'?'+name+'?';}
_hasStringName(){var type=this.rawType();var snapshot=this._snapshot;return type!==snapshot._edgeElementType&&type!==snapshot._edgeHiddenType;}
_name(){return this._hasStringName()?this._snapshot.strings[this._nameOrIndex()]:this._nameOrIndex();}
_nameOrIndex(){return this._edges[this.edgeIndex+this._snapshot._edgeNameOffset];}
rawType(){return this._edges[this.edgeIndex+this._snapshot._edgeTypeOffset];}};HeapSnapshotWorker.JSHeapSnapshotRetainerEdge=class extends HeapSnapshotWorker.HeapSnapshotRetainerEdge{constructor(snapshot,retainerIndex){super(snapshot,retainerIndex);}
clone(){var snapshot=(this._snapshot);return new HeapSnapshotWorker.JSHeapSnapshotRetainerEdge(snapshot,this.retainerIndex());}
isHidden(){return this._edge().isHidden();}
isInternal(){return this._edge().isInternal();}
isInvisible(){return this._edge().isInvisible();}
isShortcut(){return this._edge().isShortcut();}
isWeak(){return this._edge().isWeak();}};;HeapSnapshotWorker.HeapSnapshotLoader=class{constructor(dispatcher){this._reset();this._progress=new HeapSnapshotWorker.HeapSnapshotProgress(dispatcher);}
dispose(){this._reset();}
_reset(){this._json='';this._state='find-snapshot-info';this._snapshot={};}
close(){if(this._json)
this._parseStringsArray();}
buildSnapshot(){this._progress.updateStatus('Processing snapshot\u2026');var result=new HeapSnapshotWorker.JSHeapSnapshot(this._snapshot,this._progress);this._reset();return result;}
_parseUintArray(){var index=0;var char0='0'.charCodeAt(0),char9='9'.charCodeAt(0),closingBracket=']'.charCodeAt(0);var length=this._json.length;while(true){while(index<length){var code=this._json.charCodeAt(index);if(char0<=code&&code<=char9){break;}else if(code===closingBracket){this._json=this._json.slice(index+1);return false;}
++index;}
if(index===length){this._json='';return true;}
var nextNumber=0;var startIndex=index;while(index<length){var code=this._json.charCodeAt(index);if(char0>code||code>char9)
break;nextNumber*=10;nextNumber+=(code-char0);++index;}
if(index===length){this._json=this._json.slice(startIndex);return true;}
this._array[this._arrayIndex++]=nextNumber;}}
_parseStringsArray(){this._progress.updateStatus('Parsing strings\u2026');var closingBracketIndex=this._json.lastIndexOf(']');if(closingBracketIndex===-1)
throw new Error('Incomplete JSON');this._json=this._json.slice(0,closingBracketIndex+1);this._snapshot.strings=JSON.parse(this._json);}
write(chunk){if(this._json!==null)
this._json+=chunk;while(true){switch(this._state){case'find-snapshot-info':{var snapshotToken='"snapshot"';var snapshotTokenIndex=this._json.indexOf(snapshotToken);if(snapshotTokenIndex===-1)
throw new Error('Snapshot token not found');var json=this._json.slice(snapshotTokenIndex+snapshotToken.length+1);this._state='parse-snapshot-info';this._progress.updateStatus('Loading snapshot info\u2026');this._json=null;this._jsonTokenizer=new Common.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this));chunk=json;}
case'parse-snapshot-info':{this._jsonTokenizer.write(chunk);if(this._jsonTokenizer)
return;break;}
case'find-nodes':{var nodesToken='"nodes"';var nodesTokenIndex=this._json.indexOf(nodesToken);if(nodesTokenIndex===-1)
return;var bracketIndex=this._json.indexOf('[',nodesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);var node_fields_count=this._snapshot.snapshot.meta.node_fields.length;var nodes_length=this._snapshot.snapshot.node_count*node_fields_count;this._array=new Uint32Array(nodes_length);this._arrayIndex=0;this._state='parse-nodes';break;}
case'parse-nodes':{var hasMoreData=this._parseUintArray();this._progress.updateProgress('Loading nodes\u2026 %d%%',this._arrayIndex,this._array.length);if(hasMoreData)
return;this._snapshot.nodes=this._array;this._state='find-edges';this._array=null;break;}
case'find-edges':{var edgesToken='"edges"';var edgesTokenIndex=this._json.indexOf(edgesToken);if(edgesTokenIndex===-1)
return;var bracketIndex=this._json.indexOf('[',edgesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);var edge_fields_count=this._snapshot.snapshot.meta.edge_fields.length;var edges_length=this._snapshot.snapshot.edge_count*edge_fields_count;this._array=new Uint32Array(edges_length);this._arrayIndex=0;this._state='parse-edges';break;}
case'parse-edges':{var hasMoreData=this._parseUintArray();this._progress.updateProgress('Loading edges\u2026 %d%%',this._arrayIndex,this._array.length);if(hasMoreData)
return;this._snapshot.edges=this._array;this._array=null;if(this._snapshot.snapshot.trace_function_count){this._state='find-trace-function-infos';this._progress.updateStatus('Loading allocation traces\u2026');}else if(this._snapshot.snapshot.meta.sample_fields){this._state='find-samples';this._progress.updateStatus('Loading samples\u2026');}else{this._state='find-strings';}
break;}
case'find-trace-function-infos':{var tracesToken='"trace_function_infos"';var tracesTokenIndex=this._json.indexOf(tracesToken);if(tracesTokenIndex===-1)
return;var bracketIndex=this._json.indexOf('[',tracesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);var trace_function_info_field_count=this._snapshot.snapshot.meta.trace_function_info_fields.length;var trace_function_info_length=this._snapshot.snapshot.trace_function_count*trace_function_info_field_count;this._array=new Uint32Array(trace_function_info_length);this._arrayIndex=0;this._state='parse-trace-function-infos';break;}
case'parse-trace-function-infos':{if(this._parseUintArray())
return;this._snapshot.trace_function_infos=this._array;this._array=null;this._state='find-trace-tree';break;}
case'find-trace-tree':{var tracesToken='"trace_tree"';var tracesTokenIndex=this._json.indexOf(tracesToken);if(tracesTokenIndex===-1)
return;var bracketIndex=this._json.indexOf('[',tracesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex);this._state='parse-trace-tree';break;}
case'parse-trace-tree':{var nextToken=this._snapshot.snapshot.meta.sample_fields?'"samples"':'"strings"';var nextTokenIndex=this._json.indexOf(nextToken);if(nextTokenIndex===-1)
return;var bracketIndex=this._json.lastIndexOf(']',nextTokenIndex);this._snapshot.trace_tree=JSON.parse(this._json.substring(0,bracketIndex+1));this._json=this._json.slice(bracketIndex+1);if(this._snapshot.snapshot.meta.sample_fields){this._state='find-samples';this._progress.updateStatus('Loading samples\u2026');}else{this._state='find-strings';this._progress.updateStatus('Loading strings\u2026');}
break;}
case'find-samples':{var samplesToken='"samples"';var samplesTokenIndex=this._json.indexOf(samplesToken);if(samplesTokenIndex===-1)
return;var bracketIndex=this._json.indexOf('[',samplesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);this._array=[];this._arrayIndex=0;this._state='parse-samples';break;}
case'parse-samples':{if(this._parseUintArray())
return;this._snapshot.samples=this._array;this._array=null;this._state='find-strings';this._progress.updateStatus('Loading strings\u2026');break;}
case'find-strings':{var stringsToken='"strings"';var stringsTokenIndex=this._json.indexOf(stringsToken);if(stringsTokenIndex===-1)
return;var bracketIndex=this._json.indexOf('[',stringsTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex);this._state='accumulate-strings';break;}
case'accumulate-strings':return;}}}
_writeBalancedJSON(data){this._json=this._jsonTokenizer.remainder();this._jsonTokenizer=null;this._state='find-nodes';this._snapshot.snapshot=(JSON.parse(data));}};;HeapSnapshotWorker.HeapSnapshotWorkerDispatcher=class{constructor(globalObject,postMessage){this._objects=[];this._global=globalObject;this._postMessage=postMessage;}
_findFunction(name){var path=name.split('.');var result=this._global;for(var i=0;i<path.length;++i)
result=result[path[i]];return result;}
sendEvent(name,data){this._postMessage({eventName:name,data:data});}
dispatchMessage(event){var data=(event.data);var response={callId:data.callId};try{switch(data.disposition){case'create':var constructorFunction=this._findFunction(data.methodName);this._objects[data.objectId]=new constructorFunction(this);break;case'dispose':delete this._objects[data.objectId];break;case'getter':var object=this._objects[data.objectId];var result=object[data.methodName];response.result=result;break;case'factory':var object=this._objects[data.objectId];var result=object[data.methodName].apply(object,data.methodArguments);if(result)
this._objects[data.newObjectId]=result;response.result=!!result;break;case'method':var object=this._objects[data.objectId];response.result=object[data.methodName].apply(object,data.methodArguments);break;case'evaluateForTest':try{response.result=self.eval(data.source);}catch(e){response.result=e.toString();}
break;}}catch(e){response.error=e.toString();response.errorCallStack=e.stack;if(data.methodName)
response.errorMethodName=data.methodName;}
this._postMessage(response);}};;function postMessageWrapper(message){postMessage(message);}
var dispatcher=new HeapSnapshotWorker.HeapSnapshotWorkerDispatcher(this,postMessageWrapper);function installMessageEventListener(listener){self.addEventListener('message',listener,false);}
installMessageEventListener(dispatcher.dispatchMessage.bind(dispatcher));;applicationDescriptor={"has_html":false,"modules":[{"type":"autostart","name":"heap_snapshot_model"},{"type":"autostart","name":"platform"},{"type":"autostart","name":"heap_snapshot_worker"},{"type":"autostart","name":"common"}]};if(!self.Runtime)
self.importScripts('Runtime.js');Runtime.startWorker('heap_snapshot_worker');