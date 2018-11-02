const allDescriptors=[];let applicationDescriptor;const _loadedScripts={};for(const k of[]){}
(function(){const baseUrl=self.location?self.location.origin+self.location.pathname:'';self._importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();const REMOTE_MODULE_FALLBACK_REVISION='@010ddcfda246975d194964ccf20038ebbdec6084';var Runtime=class{constructor(descriptors){this._modules=[];this._modulesMap={};this._extensions=[];this._cachedTypeClasses={};this._descriptorsMap={};for(let i=0;i<descriptors.length;++i)
this._registerModule(descriptors[i]);Runtime._runtimeReadyPromiseCallback();}
static loadResourcePromise(url){return new Promise(load);function load(fulfill,reject){const xhr=new XMLHttpRequest();xhr.open('GET',url,true);xhr.onreadystatechange=onreadystatechange;function onreadystatechange(e){if(xhr.readyState!==XMLHttpRequest.DONE)
return;const status=/^HTTP\/1.1 404/.test(e.target.response)?404:xhr.status;if([0,200,304].indexOf(status)===-1)
reject(new Error('While loading from url '+url+' server responded with a status of '+status));else
fulfill(e.target.response);}
xhr.send(null);}}
static loadResourcePromiseWithFallback(url){return Runtime.loadResourcePromise(url).catch(err=>{const urlWithFallbackVersion=url.replace(/@[0-9a-f]{40}/,REMOTE_MODULE_FALLBACK_REVISION);if(urlWithFallbackVersion===url||!url.includes('audits2_worker_module'))
throw err;return Runtime.loadResourcePromise(urlWithFallbackVersion);});}
static normalizePath(path){if(path.indexOf('..')===-1&&path.indexOf('.')===-1)
return path;const normalizedSegments=[];const segments=path.split('/');for(let i=0;i<segments.length;i++){const segment=segments[i];if(segment==='.')
continue;else if(segment==='..')
normalizedSegments.pop();else if(segment)
normalizedSegments.push(segment);}
let normalizedPath=normalizedSegments.join('/');if(normalizedPath[normalizedPath.length-1]==='/')
return normalizedPath;if(path[0]==='/'&&normalizedPath)
normalizedPath='/'+normalizedPath;if((path[path.length-1]==='/')||(segments[segments.length-1]==='.')||(segments[segments.length-1]==='..'))
normalizedPath=normalizedPath+'/';return normalizedPath;}
static _loadScriptsPromise(scriptNames,base){const promises=[];const urls=[];const sources=new Array(scriptNames.length);let scriptToEval=0;for(let i=0;i<scriptNames.length;++i){const scriptName=scriptNames[i];let sourceURL=(base||self._importScriptPathPrefix)+scriptName;const schemaIndex=sourceURL.indexOf('://')+3;let pathIndex=sourceURL.indexOf('/',schemaIndex);if(pathIndex===-1)
pathIndex=sourceURL.length;sourceURL=sourceURL.substring(0,pathIndex)+Runtime.normalizePath(sourceURL.substring(pathIndex));if(_loadedScripts[sourceURL])
continue;urls.push(sourceURL);const loadResourcePromise=base?Runtime.loadResourcePromiseWithFallback(sourceURL):Runtime.loadResourcePromise(sourceURL);promises.push(loadResourcePromise.then(scriptSourceLoaded.bind(null,i),scriptSourceLoaded.bind(null,i,undefined)));}
return Promise.all(promises).then(undefined);function scriptSourceLoaded(scriptNumber,scriptSource){sources[scriptNumber]=scriptSource||'';while(typeof sources[scriptToEval]!=='undefined'){evaluateScript(urls[scriptToEval],sources[scriptToEval]);++scriptToEval;}}
function evaluateScript(sourceURL,scriptSource){_loadedScripts[sourceURL]=true;if(!scriptSource){console.error('Empty response arrived for script \''+sourceURL+'\'');return;}
self.eval(scriptSource+'\n//# sourceURL='+sourceURL);}}
static _loadResourceIntoCache(url,appendSourceURL){return Runtime.loadResourcePromise(url).then(cacheResource.bind(this,url),cacheResource.bind(this,url,undefined));function cacheResource(path,content){if(!content){console.error('Failed to load resource: '+path);return;}
const sourceURL=appendSourceURL?Runtime.resolveSourceURL(path):'';Runtime.cachedResources[path]=content+sourceURL;}}
static async runtimeReady(){return Runtime._runtimeReadyPromise;}
static async startApplication(appName){console.timeStamp('Runtime.startApplication');const allDescriptorsByName={};for(let i=0;i<allDescriptors.length;++i){const d=allDescriptors[i];allDescriptorsByName[d['name']]=d;}
if(!applicationDescriptor){let data=await Runtime.loadResourcePromise(appName+'.json');applicationDescriptor=JSON.parse(data);let descriptor=applicationDescriptor;while(descriptor.extends){data=await Runtime.loadResourcePromise(descriptor.extends+'.json');descriptor=JSON.parse(data);applicationDescriptor.modules=descriptor.modules.concat(applicationDescriptor.modules);}}
const configuration=applicationDescriptor.modules;const moduleJSONPromises=[];const coreModuleNames=[];for(let i=0;i<configuration.length;++i){const descriptor=configuration[i];const name=descriptor['name'];const moduleJSON=allDescriptorsByName[name];if(moduleJSON)
moduleJSONPromises.push(Promise.resolve(moduleJSON));else
moduleJSONPromises.push(Runtime.loadResourcePromise(name+'/module.json').then(JSON.parse.bind(JSON)));if(descriptor['type']==='autostart')
coreModuleNames.push(name);}
const moduleDescriptors=await Promise.all(moduleJSONPromises);for(let i=0;i<moduleDescriptors.length;++i){moduleDescriptors[i].name=configuration[i]['name'];moduleDescriptors[i].condition=configuration[i]['condition'];moduleDescriptors[i].remote=configuration[i]['type']==='remote';}
self.runtime=new Runtime(moduleDescriptors);if(coreModuleNames)
return(self.runtime._loadAutoStartModules(coreModuleNames));}
static startWorker(appName){return Runtime.startApplication(appName).then(sendWorkerReady);function sendWorkerReady(){self.postMessage('workerReady');}}
static queryParam(name){return Runtime._queryParamsObject[name]||null;}
static queryParamsString(){return location.search;}
static _experimentsSetting(){try{return(JSON.parse(self.localStorage&&self.localStorage['experiments']?self.localStorage['experiments']:'{}'));}catch(e){console.error('Failed to parse localStorage[\'experiments\']');return{};}}
static _assert(value,message){if(value)
return;Runtime._originalAssert.call(Runtime._console,value,message+' '+new Error().stack);}
static setPlatform(platform){Runtime._platform=platform;}
static _isDescriptorEnabled(descriptor){const activatorExperiment=descriptor['experiment'];if(activatorExperiment==='*')
return Runtime.experiments.supportEnabled();if(activatorExperiment&&activatorExperiment.startsWith('!')&&Runtime.experiments.isEnabled(activatorExperiment.substring(1)))
return false;if(activatorExperiment&&!activatorExperiment.startsWith('!')&&!Runtime.experiments.isEnabled(activatorExperiment))
return false;const condition=descriptor['condition'];if(condition&&!condition.startsWith('!')&&!Runtime.queryParam(condition))
return false;if(condition&&condition.startsWith('!')&&Runtime.queryParam(condition.substring(1)))
return false;return true;}
static resolveSourceURL(path){let sourceURL=self.location.href;if(self.location.search)
sourceURL=sourceURL.replace(self.location.search,'');sourceURL=sourceURL.substring(0,sourceURL.lastIndexOf('/')+1)+path;return'\n/*# sourceURL='+sourceURL+' */';}
useTestBase(){Runtime._remoteBase='http://localhost:8000/inspector-sources/';if(Runtime.queryParam('debugFrontend'))
Runtime._remoteBase+='debug/';}
_registerModule(descriptor){const module=new Runtime.Module(this,descriptor);this._modules.push(module);this._modulesMap[descriptor['name']]=module;}
loadModulePromise(moduleName){return this._modulesMap[moduleName]._loadPromise();}
_loadAutoStartModules(moduleNames){const promises=[];for(let i=0;i<moduleNames.length;++i)
promises.push(this.loadModulePromise(moduleNames[i]));return Promise.all(promises);}
_checkExtensionApplicability(extension,predicate){if(!predicate)
return false;const contextTypes=extension.descriptor().contextTypes;if(!contextTypes)
return true;for(let i=0;i<contextTypes.length;++i){const contextType=this._resolve(contextTypes[i]);const isMatching=!!contextType&&predicate(contextType);if(isMatching)
return true;}
return false;}
isExtensionApplicableToContext(extension,context){if(!context)
return true;return this._checkExtensionApplicability(extension,isInstanceOf);function isInstanceOf(targetType){return context instanceof targetType;}}
isExtensionApplicableToContextTypes(extension,currentContextTypes){if(!extension.descriptor().contextTypes)
return true;return this._checkExtensionApplicability(extension,currentContextTypes?isContextTypeKnown:null);function isContextTypeKnown(targetType){return currentContextTypes.has(targetType);}}
extensions(type,context,sortByTitle){return this._extensions.filter(filter).sort(sortByTitle?titleComparator:orderComparator);function filter(extension){if(extension._type!==type&&extension._typeClass()!==type)
return false;if(!extension.enabled())
return false;return!context||extension.isApplicable(context);}
function orderComparator(extension1,extension2){const order1=extension1.descriptor()['order']||0;const order2=extension2.descriptor()['order']||0;return order1-order2;}
function titleComparator(extension1,extension2){const title1=extension1.title()||'';const title2=extension2.title()||'';return title1.localeCompare(title2);}}
extension(type,context){return this.extensions(type,context)[0]||null;}
allInstances(type,context){return Promise.all(this.extensions(type,context).map(extension=>extension.instance()));}
_resolve(typeName){if(!this._cachedTypeClasses[typeName]){const path=typeName.split('.');let object=self;for(let i=0;object&&(i<path.length);++i)
object=object[path[i]];if(object)
this._cachedTypeClasses[typeName]=(object);}
return this._cachedTypeClasses[typeName]||null;}
sharedInstance(constructorFunction){if(Runtime._instanceSymbol in constructorFunction&&Object.getOwnPropertySymbols(constructorFunction).includes(Runtime._instanceSymbol))
return constructorFunction[Runtime._instanceSymbol];const instance=new constructorFunction();constructorFunction[Runtime._instanceSymbol]=instance;return instance;}};Runtime._queryParamsObject={__proto__:null};Runtime._instanceSymbol=Symbol('instance');Runtime.cachedResources={__proto__:null};Runtime._console=console;Runtime._originalAssert=console.assert;Runtime._platform='';Runtime.ModuleDescriptor=class{constructor(){this.name;this.extensions;this.dependencies;this.scripts;this.condition;this.remote;}};Runtime.ExtensionDescriptor=class{constructor(){this.type;this.className;this.factoryName;this.contextTypes;}};Runtime.Module=class{constructor(manager,descriptor){this._manager=manager;this._descriptor=descriptor;this._name=descriptor.name;this._extensions=[];this._extensionsByClassName=new Map();const extensions=(descriptor.extensions);for(let i=0;extensions&&i<extensions.length;++i){const extension=new Runtime.Extension(this,extensions[i]);this._manager._extensions.push(extension);this._extensions.push(extension);}
this._loadedForTest=false;}
name(){return this._name;}
enabled(){return Runtime._isDescriptorEnabled(this._descriptor);}
resource(name){const fullName=this._name+'/'+name;const content=Runtime.cachedResources[fullName];if(!content)
throw new Error(fullName+' not preloaded. Check module.json');return content;}
_loadPromise(){if(!this.enabled())
return Promise.reject(new Error('Module '+this._name+' is not enabled'));if(this._pendingLoadPromise)
return this._pendingLoadPromise;const dependencies=this._descriptor.dependencies;const dependencyPromises=[];for(let i=0;dependencies&&i<dependencies.length;++i)
dependencyPromises.push(this._manager._modulesMap[dependencies[i]]._loadPromise());this._pendingLoadPromise=Promise.all(dependencyPromises).then(this._loadResources.bind(this)).then(this._loadScripts.bind(this)).then(()=>this._loadedForTest=true);return this._pendingLoadPromise;}
_loadResources(){const resources=this._descriptor['resources'];if(!resources||!resources.length)
return Promise.resolve();const promises=[];for(let i=0;i<resources.length;++i){const url=this._modularizeURL(resources[i]);promises.push(Runtime._loadResourceIntoCache(url,true));}
return Promise.all(promises).then(undefined);}
_loadScripts(){if(!this._descriptor.scripts||!this._descriptor.scripts.length)
return Promise.resolve();const specialCases={'sdk':'SDK','js_sdk':'JSSDK','browser_sdk':'BrowserSDK','ui':'UI','object_ui':'ObjectUI','javascript_metadata':'JavaScriptMetadata','perf_ui':'PerfUI','har_importer':'HARImporter','sdk_test_runner':'SDKTestRunner','cpu_profiler_test_runner':'CPUProfilerTestRunner'};const namespace=specialCases[this._name]||this._name.split('_').map(a=>a.substring(0,1).toUpperCase()+a.substring(1)).join('');self[namespace]=self[namespace]||{};return Runtime._loadScriptsPromise(this._descriptor.scripts.map(this._modularizeURL,this),this._remoteBase());}
_modularizeURL(resourceName){return Runtime.normalizePath(this._name+'/'+resourceName);}
_remoteBase(){return!Runtime.queryParam('debugFrontend')&&this._descriptor.remote&&Runtime._remoteBase||undefined;}
substituteURL(value){const base=this._remoteBase()||'';return value.replace(/@url\(([^\)]*?)\)/g,convertURL.bind(this));function convertURL(match,url){return base+this._modularizeURL(url);}}};Runtime.Extension=class{constructor(module,descriptor){this._module=module;this._descriptor=descriptor;this._type=descriptor.type;this._hasTypeClass=this._type.charAt(0)==='@';this._className=descriptor.className||null;this._factoryName=descriptor.factoryName||null;}
descriptor(){return this._descriptor;}
module(){return this._module;}
enabled(){return this._module.enabled()&&Runtime._isDescriptorEnabled(this.descriptor());}
_typeClass(){if(!this._hasTypeClass)
return null;return this._module._manager._resolve(this._type.substring(1));}
isApplicable(context){return this._module._manager.isExtensionApplicableToContext(this,context);}
instance(){return this._module._loadPromise().then(this._createInstance.bind(this));}
canInstantiate(){return!!(this._className||this._factoryName);}
_createInstance(){const className=this._className||this._factoryName;if(!className)
throw new Error('Could not instantiate extension with no class');const constructorFunction=self.eval((className));if(!(constructorFunction instanceof Function))
throw new Error('Could not instantiate: '+className);if(this._className)
return this._module._manager.sharedInstance(constructorFunction);return new constructorFunction(this);}
title(){return this._descriptor['title-'+Runtime._platform]||this._descriptor['title'];}
hasContextType(contextType){const contextTypes=this.descriptor().contextTypes;if(!contextTypes)
return false;for(let i=0;i<contextTypes.length;++i){if(contextType===this._module._manager._resolve(contextTypes[i]))
return true;}
return false;}};Runtime.ExperimentsSupport=class{constructor(){this._supportEnabled=Runtime.queryParam('experiments')!==null;this._experiments=[];this._experimentNames={};this._enabledTransiently={};}
allConfigurableExperiments(){const result=[];for(let i=0;i<this._experiments.length;i++){const experiment=this._experiments[i];if(!this._enabledTransiently[experiment.name])
result.push(experiment);}
return result;}
supportEnabled(){return this._supportEnabled;}
_setExperimentsSetting(value){if(!self.localStorage)
return;self.localStorage['experiments']=JSON.stringify(value);}
register(experimentName,experimentTitle,hidden){Runtime._assert(!this._experimentNames[experimentName],'Duplicate registration of experiment '+experimentName);this._experimentNames[experimentName]=true;this._experiments.push(new Runtime.Experiment(this,experimentName,experimentTitle,!!hidden));}
isEnabled(experimentName){this._checkExperiment(experimentName);if(Runtime._experimentsSetting()[experimentName]===false)
return false;if(this._enabledTransiently[experimentName])
return true;if(!this.supportEnabled())
return false;return!!Runtime._experimentsSetting()[experimentName];}
setEnabled(experimentName,enabled){this._checkExperiment(experimentName);const experimentsSetting=Runtime._experimentsSetting();experimentsSetting[experimentName]=enabled;this._setExperimentsSetting(experimentsSetting);}
setDefaultExperiments(experimentNames){for(let i=0;i<experimentNames.length;++i){this._checkExperiment(experimentNames[i]);this._enabledTransiently[experimentNames[i]]=true;}}
enableForTest(experimentName){this._checkExperiment(experimentName);this._enabledTransiently[experimentName]=true;}
clearForTest(){this._experiments=[];this._experimentNames={};this._enabledTransiently={};}
cleanUpStaleExperiments(){const experimentsSetting=Runtime._experimentsSetting();const cleanedUpExperimentSetting={};for(let i=0;i<this._experiments.length;++i){const experimentName=this._experiments[i].name;if(experimentsSetting[experimentName])
cleanedUpExperimentSetting[experimentName]=true;}
this._setExperimentsSetting(cleanedUpExperimentSetting);}
_checkExperiment(experimentName){Runtime._assert(this._experimentNames[experimentName],'Unknown experiment '+experimentName);}};Runtime.Experiment=class{constructor(experiments,name,title,hidden){this.name=name;this.title=title;this.hidden=hidden;this._experiments=experiments;}
isEnabled(){return this._experiments.isEnabled(this.name);}
setEnabled(enabled){this._experiments.setEnabled(this.name,enabled);}};{(function parseQueryParameters(){const queryParams=Runtime.queryParamsString();if(!queryParams)
return;const params=queryParams.substring(1).split('&');for(let i=0;i<params.length;++i){const pair=params[i].split('=');const name=pair.shift();Runtime._queryParamsObject[name]=pair.join('=');}})();}
Runtime.experiments=new Runtime.ExperimentsSupport();Runtime._runtimeReadyPromiseCallback;Runtime._runtimeReadyPromise=new Promise(fulfil=>Runtime._runtimeReadyPromiseCallback=fulfil);Runtime._remoteBase;(function validateRemoteBase(){if(location.href.startsWith('chrome-devtools://devtools/bundled/')&&Runtime.queryParam('remoteBase')){const versionMatch=/\/serve_file\/(@[0-9a-zA-Z]+)\/?$/.exec(Runtime.queryParam('remoteBase'));if(versionMatch)
Runtime._remoteBase=`${location.origin}/remote/serve_file/${versionMatch[1]}/`;}})();function ServicePort(){}
ServicePort.prototype={setHandlers(messageHandler,closeHandler){},send(message){},close(){}};var runtime;allDescriptors.push(...[{"dependencies":[],"name":"heap_snapshot_model"},{"dependencies":[],"name":"platform"},{"dependencies":["heap_snapshot_model","platform","common"],"name":"heap_snapshot_worker"},{"dependencies":["platform"],"name":"text_utils"},{"dependencies":["text_utils","platform"],"name":"common"}]);applicationDescriptor={"has_html":false,"modules":[{"type":"autostart","name":"heap_snapshot_model"},{"type":"autostart","name":"platform"},{"type":"autostart","name":"heap_snapshot_worker"},{"type":"autostart","name":"text_utils"},{"type":"autostart","name":"common"}]}
self['HeapSnapshotModel']=self['HeapSnapshotModel']||{};HeapSnapshotModel.HeapSnapshotProgressEvent={Update:'ProgressUpdate',BrokenSnapshot:'BrokenSnapshot'};HeapSnapshotModel.baseSystemDistance=100000000;HeapSnapshotModel.AllocationNodeCallers=class{constructor(nodesWithSingleCaller,branchingCallers){this.nodesWithSingleCaller=nodesWithSingleCaller;this.branchingCallers=branchingCallers;}};HeapSnapshotModel.SerializedAllocationNode=class{constructor(nodeId,functionName,scriptName,scriptId,line,column,count,size,liveCount,liveSize,hasChildren){this.id=nodeId;this.name=functionName;this.scriptName=scriptName;this.scriptId=scriptId;this.line=line;this.column=column;this.count=count;this.size=size;this.liveCount=liveCount;this.liveSize=liveSize;this.hasChildren=hasChildren;}};HeapSnapshotModel.AllocationStackFrame=class{constructor(functionName,scriptName,scriptId,line,column){this.functionName=functionName;this.scriptName=scriptName;this.scriptId=scriptId;this.line=line;this.column=column;}};HeapSnapshotModel.Node=class{constructor(id,name,distance,nodeIndex,retainedSize,selfSize,type){this.id=id;this.name=name;this.distance=distance;this.nodeIndex=nodeIndex;this.retainedSize=retainedSize;this.selfSize=selfSize;this.type=type;this.canBeQueried=false;this.detachedDOMTreeNode=false;}};HeapSnapshotModel.Edge=class{constructor(name,node,type,edgeIndex){this.name=name;this.node=node;this.type=type;this.edgeIndex=edgeIndex;}};HeapSnapshotModel.Aggregate=class{constructor(){this.count;this.distance;this.self;this.maxRet;this.type;this.name;this.idxs;}};HeapSnapshotModel.AggregateForDiff=class{constructor(){this.indexes=[];this.ids=[];this.selfSizes=[];}};HeapSnapshotModel.Diff=class{constructor(){this.addedCount=0;this.removedCount=0;this.addedSize=0;this.removedSize=0;this.deletedIndexes=[];this.addedIndexes=[];}};HeapSnapshotModel.DiffForClass=class{constructor(){this.addedCount;this.removedCount;this.addedSize;this.removedSize;this.deletedIndexes;this.addedIndexes;this.countDelta;this.sizeDelta;}};HeapSnapshotModel.ComparatorConfig=class{constructor(){this.fieldName1;this.ascending1;this.fieldName2;this.ascending2;}};HeapSnapshotModel.WorkerCommand=class{constructor(){this.callId;this.disposition;this.objectId;this.newObjectId;this.methodName;this.methodArguments;this.source;}};HeapSnapshotModel.ItemsRange=class{constructor(startPosition,endPosition,totalLength,items){this.startPosition=startPosition;this.endPosition=endPosition;this.totalLength=totalLength;this.items=items;}};HeapSnapshotModel.StaticData=class{constructor(nodeCount,rootNodeIndex,totalSize,maxJSObjectId){this.nodeCount=nodeCount;this.rootNodeIndex=rootNodeIndex;this.totalSize=totalSize;this.maxJSObjectId=maxJSObjectId;}};HeapSnapshotModel.Statistics=class{constructor(){this.total;this.v8heap;this.native;this.code;this.jsArrays;this.strings;this.system;}};HeapSnapshotModel.NodeFilter=class{constructor(minNodeId,maxNodeId){this.minNodeId=minNodeId;this.maxNodeId=maxNodeId;this.allocationNodeId;}
equals(o){return this.minNodeId===o.minNodeId&&this.maxNodeId===o.maxNodeId&&this.allocationNodeId===o.allocationNodeId;}};HeapSnapshotModel.SearchConfig=class{constructor(query,caseSensitive,isRegex,shouldJump,jumpBackward){this.query=query;this.caseSensitive=caseSensitive;this.isRegex=isRegex;this.shouldJump=shouldJump;this.jumpBackward=jumpBackward;}};HeapSnapshotModel.Samples=class{constructor(timestamps,lastAssignedIds,sizes){this.timestamps=timestamps;this.lastAssignedIds=lastAssignedIds;this.sizes=sizes;}};HeapSnapshotModel.Location=class{constructor(scriptId,lineNumber,columnNumber){this.scriptId=scriptId;this.lineNumber=lineNumber;this.columnNumber=columnNumber;}};;self['Platform']=self['Platform']||{};let ArrayLike;function mod(m,n){return((m%n)+n)%n;}
String.prototype.findAll=function(string){const matches=[];let i=this.indexOf(string);while(i!==-1){matches.push(i);i=this.indexOf(string,i+string.length);}
return matches;};String.prototype.reverse=function(){return this.split('').reverse().join('');};String.prototype.replaceControlCharacters=function(){return this.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u0080-\u009f]/g,'�');};String.prototype.isWhitespace=function(){return/^\s*$/.test(this);};String.prototype.computeLineEndings=function(){const endings=this.findAll('\n');endings.push(this.length);return endings;};String.prototype.escapeCharacters=function(chars){let foundChar=false;for(let i=0;i<chars.length;++i){if(this.indexOf(chars.charAt(i))!==-1){foundChar=true;break;}}
if(!foundChar)
return String(this);let result='';for(let i=0;i<this.length;++i){if(chars.indexOf(this.charAt(i))!==-1)
result+='\\';result+=this.charAt(i);}
return result;};String.regexSpecialCharacters=function(){return'^[]{}()\\.^$*+?|-,';};String.prototype.escapeForRegExp=function(){return this.escapeCharacters(String.regexSpecialCharacters());};String.filterRegex=function(query){const toEscape=String.regexSpecialCharacters();let regexString='';for(let i=0;i<query.length;++i){let c=query.charAt(i);if(toEscape.indexOf(c)!==-1)
c='\\'+c;if(i)
regexString+='[^\\0'+c+']*';regexString+=c;}
return new RegExp(regexString,'i');};String.prototype.escapeHTML=function(){return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};String.prototype.unescapeHTML=function(){return this.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#58;/g,':').replace(/&quot;/g,'"').replace(/&#60;/g,'<').replace(/&#62;/g,'>').replace(/&amp;/g,'&');};String.prototype.collapseWhitespace=function(){return this.replace(/[\s\xA0]+/g,' ');};String.prototype.trimMiddle=function(maxLength){if(this.length<=maxLength)
return String(this);let leftHalf=maxLength>>1;let rightHalf=maxLength-leftHalf-1;if(this.codePointAt(this.length-rightHalf-1)>=0x10000){--rightHalf;++leftHalf;}
if(leftHalf>0&&this.codePointAt(leftHalf-1)>=0x10000)
--leftHalf;return this.substr(0,leftHalf)+'\u2026'+this.substr(this.length-rightHalf,rightHalf);};String.prototype.trimEnd=function(maxLength){if(this.length<=maxLength)
return String(this);return this.substr(0,maxLength-1)+'\u2026';};String.prototype.trimURL=function(baseURLDomain){let result=this.replace(/^(https|http|file):\/\//i,'');if(baseURLDomain){if(result.toLowerCase().startsWith(baseURLDomain.toLowerCase()))
result=result.substr(baseURLDomain.length);}
return result;};String.prototype.toTitleCase=function(){return this.substring(0,1).toUpperCase()+this.substring(1);};String.prototype.compareTo=function(other){if(this>other)
return 1;if(this<other)
return-1;return 0;};String.prototype.removeURLFragment=function(){let fragmentIndex=this.indexOf('#');if(fragmentIndex===-1)
fragmentIndex=this.length;return this.substring(0,fragmentIndex);};String.hashCode=function(string){if(!string)
return 0;const p=((1<<30)*4-5);const z=0x5033d967;const z2=0x59d2f15d;let s=0;let zi=1;for(let i=0;i<string.length;i++){const xi=string.charCodeAt(i)*z2;s=(s+zi*xi)%p;zi=(zi*z)%p;}
s=(s+zi*(p-1))%p;return Math.abs(s|0);};String.isDigitAt=function(string,index){const c=string.charCodeAt(index);return(48<=c&&c<=57);};String.prototype.toBase64=function(){function encodeBits(b){return b<26?b+65:b<52?b+71:b<62?b-4:b===62?43:b===63?47:65;}
const encoder=new TextEncoder();const data=encoder.encode(this.toString());const n=data.length;let encoded='';if(n===0)
return encoded;let shift;let v=0;for(let i=0;i<n;i++){shift=i%3;v|=data[i]<<(16>>>shift&24);if(shift===2){encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),encodeBits(v>>>6&63),encodeBits(v&63));v=0;}}
if(shift===0)
encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),61,61);else if(shift===1)
encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),encodeBits(v>>>6&63),61);return encoded;};String.naturalOrderComparator=function(a,b){const chunk=/^\d+|^\D+/;let chunka,chunkb,anum,bnum;while(1){if(a){if(!b)
return 1;}else{if(b)
return-1;else
return 0;}
chunka=a.match(chunk)[0];chunkb=b.match(chunk)[0];anum=!isNaN(chunka);bnum=!isNaN(chunkb);if(anum&&!bnum)
return-1;if(bnum&&!anum)
return 1;if(anum&&bnum){const diff=chunka-chunkb;if(diff)
return diff;if(chunka.length!==chunkb.length){if(!+chunka&&!+chunkb)
return chunka.length-chunkb.length;else
return chunkb.length-chunka.length;}}else if(chunka!==chunkb){return(chunka<chunkb)?-1:1;}
a=a.substring(chunka.length);b=b.substring(chunkb.length);}};String.caseInsensetiveComparator=function(a,b){a=a.toUpperCase();b=b.toUpperCase();if(a===b)
return 0;return a>b?1:-1;};Number.constrain=function(num,min,max){if(num<min)
num=min;else if(num>max)
num=max;return num;};Number.gcd=function(a,b){if(b===0)
return a;else
return Number.gcd(b,a%b);};Number.toFixedIfFloating=function(value){if(!value||isNaN(value))
return value;const number=Number(value);return number%1?number.toFixed(3):String(number);};Date.prototype.isValid=function(){return!isNaN(this.getTime());};Date.prototype.toISO8601Compact=function(){function leadZero(x){return(x>9?'':'0')+x;}
return this.getFullYear()+leadZero(this.getMonth()+1)+leadZero(this.getDate())+'T'+
leadZero(this.getHours())+leadZero(this.getMinutes())+leadZero(this.getSeconds());};Object.defineProperty(Array.prototype,'remove',{value:function(value,firstOnly){let index=this.indexOf(value);if(index===-1)
return false;if(firstOnly){this.splice(index,1);return true;}
for(let i=index+1,n=this.length;i<n;++i){if(this[i]!==value)
this[index++]=this[i];}
this.length=index;return true;}});Object.defineProperty(Array.prototype,'pushAll',{value:function(array){for(let i=0;i<array.length;++i)
this.push(array[i]);}});Object.defineProperty(Array.prototype,'rotate',{value:function(index){const result=[];for(let i=index;i<index+this.length;++i)
result.push(this[i%this.length]);return result;}});Object.defineProperty(Array.prototype,'sortNumbers',{value:function(){function numericComparator(a,b){return a-b;}
this.sort(numericComparator);}});Object.defineProperty(Uint32Array.prototype,'sort',{value:Array.prototype.sort});(function(){const partition={value:function(comparator,left,right,pivotIndex){function swap(array,i1,i2){const temp=array[i1];array[i1]=array[i2];array[i2]=temp;}
const pivotValue=this[pivotIndex];swap(this,right,pivotIndex);let storeIndex=left;for(let i=left;i<right;++i){if(comparator(this[i],pivotValue)<0){swap(this,storeIndex,i);++storeIndex;}}
swap(this,right,storeIndex);return storeIndex;}};Object.defineProperty(Array.prototype,'partition',partition);Object.defineProperty(Uint32Array.prototype,'partition',partition);const sortRange={value:function(comparator,leftBound,rightBound,sortWindowLeft,sortWindowRight){function quickSortRange(array,comparator,left,right,sortWindowLeft,sortWindowRight){if(right<=left)
return;const pivotIndex=Math.floor(Math.random()*(right-left))+left;const pivotNewIndex=array.partition(comparator,left,right,pivotIndex);if(sortWindowLeft<pivotNewIndex)
quickSortRange(array,comparator,left,pivotNewIndex-1,sortWindowLeft,sortWindowRight);if(pivotNewIndex<sortWindowRight)
quickSortRange(array,comparator,pivotNewIndex+1,right,sortWindowLeft,sortWindowRight);}
if(leftBound===0&&rightBound===(this.length-1)&&sortWindowLeft===0&&sortWindowRight>=rightBound)
this.sort(comparator);else
quickSortRange(this,comparator,leftBound,rightBound,sortWindowLeft,sortWindowRight);return this;}};Object.defineProperty(Array.prototype,'sortRange',sortRange);Object.defineProperty(Uint32Array.prototype,'sortRange',sortRange);})();Object.defineProperty(Array.prototype,'stableSort',{value:function(comparator){function defaultComparator(a,b){return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;const indices=new Array(this.length);for(let i=0;i<this.length;++i)
indices[i]=i;const self=this;function indexComparator(a,b){const result=comparator(self[a],self[b]);return result?result:a-b;}
indices.sort(indexComparator);for(let i=0;i<this.length;++i){if(indices[i]<0||i===indices[i])
continue;let cyclical=i;const saved=this[i];while(true){const next=indices[cyclical];indices[cyclical]=-1;if(next===i){this[cyclical]=saved;break;}else{this[cyclical]=this[next];cyclical=next;}}}
return this;}});Object.defineProperty(Array.prototype,'qselect',{value:function(k,comparator){if(k<0||k>=this.length)
return;if(!comparator){comparator=function(a,b){return a-b;};}
let low=0;let high=this.length-1;for(;;){const pivotPosition=this.partition(comparator,low,high,Math.floor((high+low)/2));if(pivotPosition===k)
return this[k];else if(pivotPosition>k)
high=pivotPosition-1;else
low=pivotPosition+1;}}});Object.defineProperty(Array.prototype,'lowerBound',{value:function(object,comparator,left,right){function defaultComparator(a,b){return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;let l=left||0;let r=right!==undefined?right:this.length;while(l<r){const m=(l+r)>>1;if(comparator(object,this[m])>0)
l=m+1;else
r=m;}
return r;}});Object.defineProperty(Array.prototype,'upperBound',{value:function(object,comparator,left,right){function defaultComparator(a,b){return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;let l=left||0;let r=right!==undefined?right:this.length;while(l<r){const m=(l+r)>>1;if(comparator(object,this[m])>=0)
l=m+1;else
r=m;}
return r;}});Object.defineProperty(Uint32Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Uint32Array.prototype,'upperBound',{value:Array.prototype.upperBound});Object.defineProperty(Int32Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Int32Array.prototype,'upperBound',{value:Array.prototype.upperBound});Object.defineProperty(Float64Array.prototype,'lowerBound',{value:Array.prototype.lowerBound});Object.defineProperty(Array.prototype,'binaryIndexOf',{value:function(value,comparator){const index=this.lowerBound(value,comparator);return index<this.length&&comparator(value,this[index])===0?index:-1;}});Object.defineProperty(Array.prototype,'select',{value:function(field){const result=new Array(this.length);for(let i=0;i<this.length;++i)
result[i]=this[i][field];return result;}});Object.defineProperty(Array.prototype,'peekLast',{value:function(){return this[this.length-1];}});(function(){function mergeOrIntersect(array1,array2,comparator,mergeNotIntersect){const result=[];let i=0;let j=0;while(i<array1.length&&j<array2.length){const compareValue=comparator(array1[i],array2[j]);if(mergeNotIntersect||!compareValue)
result.push(compareValue<=0?array1[i]:array2[j]);if(compareValue<=0)
i++;if(compareValue>=0)
j++;}
if(mergeNotIntersect){while(i<array1.length)
result.push(array1[i++]);while(j<array2.length)
result.push(array2[j++]);}
return result;}
Object.defineProperty(Array.prototype,'intersectOrdered',{value:function(array,comparator){return mergeOrIntersect(this,array,comparator,false);}});Object.defineProperty(Array.prototype,'mergeOrdered',{value:function(array,comparator){return mergeOrIntersect(this,array,comparator,true);}});})();String.sprintf=function(format,var_arg){return String.vsprintf(format,Array.prototype.slice.call(arguments,1));};String.tokenizeFormatString=function(format,formatters){const tokens=[];function addStringToken(str){if(!str)
return;if(tokens.length&&tokens[tokens.length-1].type==='string')
tokens[tokens.length-1].value+=str;else
tokens.push({type:'string',value:str});}
function addSpecifierToken(specifier,precision,substitutionIndex){tokens.push({type:'specifier',specifier:specifier,precision:precision,substitutionIndex:substitutionIndex});}
function addAnsiColor(code){const types={3:'color',9:'colorLight',4:'bgColor',10:'bgColorLight'};const colorCodes=['black','red','green','yellow','blue','magenta','cyan','lightGray','','default'];const colorCodesLight=['darkGray','lightRed','lightGreen','lightYellow','lightBlue','lightMagenta','lightCyan','white',''];const colors={color:colorCodes,colorLight:colorCodesLight,bgColor:colorCodes,bgColorLight:colorCodesLight};const type=types[Math.floor(code/10)];if(!type)
return;const color=colors[type][code%10];if(!color)
return;tokens.push({type:'specifier',specifier:'c',value:{description:(type.startsWith('bg')?'background : ':'color: ')+color}});}
let textStart=0;let substitutionIndex=0;const re=new RegExp(`%%|%(?:(\\d+)\\$)?(?:\\.(\\d*))?([${Object.keys(formatters).join('')}])|\\u001b\\[(\\d+)m`,'g');for(let match=re.exec(format);!!match;match=re.exec(format)){const matchStart=match.index;if(matchStart>textStart)
addStringToken(format.substring(textStart,matchStart));if(match[0]==='%%'){addStringToken('%');}else if(match[0].startsWith('%')){const[_,substitionString,precisionString,specifierString]=match;if(substitionString&&Number(substitionString)>0)
substitutionIndex=Number(substitionString)-1;const precision=precisionString?Number(precisionString):-1;addSpecifierToken(specifierString,precision,substitutionIndex);++substitutionIndex;}else{const code=Number(match[4]);addAnsiColor(code);}
textStart=matchStart+match[0].length;}
addStringToken(format.substring(textStart));return tokens;};String.standardFormatters={d:function(substitution){return!isNaN(substitution)?substitution:0;},f:function(substitution,token){if(substitution&&token.precision>-1)
substitution=substitution.toFixed(token.precision);return!isNaN(substitution)?substitution:(token.precision>-1?Number(0).toFixed(token.precision):0);},s:function(substitution){return substitution;}};String.vsprintf=function(format,substitutions){return String.format(format,substitutions,String.standardFormatters,'',function(a,b){return a+b;}).formattedResult;};String.format=function(format,substitutions,formatters,initialValue,append,tokenizedFormat){if(!format||((!substitutions||!substitutions.length)&&format.search(/\u001b\[(\d+)m/)===-1))
return{formattedResult:append(initialValue,format),unusedSubstitutions:substitutions};function prettyFunctionName(){return'String.format("'+format+'", "'+Array.prototype.join.call(substitutions,'", "')+'")';}
function warn(msg){console.warn(prettyFunctionName()+': '+msg);}
function error(msg){console.error(prettyFunctionName()+': '+msg);}
let result=initialValue;const tokens=tokenizedFormat||String.tokenizeFormatString(format,formatters);const usedSubstitutionIndexes={};for(let i=0;i<tokens.length;++i){const token=tokens[i];if(token.type==='string'){result=append(result,token.value);continue;}
if(token.type!=='specifier'){error('Unknown token type "'+token.type+'" found.');continue;}
if(!token.value&&token.substitutionIndex>=substitutions.length){error('not enough substitution arguments. Had '+substitutions.length+' but needed '+
(token.substitutionIndex+1)+', so substitution was skipped.');result=append(result,'%'+(token.precision>-1?token.precision:'')+token.specifier);continue;}
if(!token.value)
usedSubstitutionIndexes[token.substitutionIndex]=true;if(!(token.specifier in formatters)){warn('unsupported format character \u201C'+token.specifier+'\u201D. Treating as a string.');result=append(result,token.value?'':substitutions[token.substitutionIndex]);continue;}
result=append(result,formatters[token.specifier](token.value||substitutions[token.substitutionIndex],token));}
const unusedSubstitutions=[];for(let i=0;i<substitutions.length;++i){if(i in usedSubstitutionIndexes)
continue;unusedSubstitutions.push(substitutions[i]);}
return{formattedResult:result,unusedSubstitutions:unusedSubstitutions};};function createSearchRegex(query,caseSensitive,isRegex){const regexFlags=caseSensitive?'g':'gi';let regexObject;if(isRegex){try{regexObject=new RegExp(query,regexFlags);}catch(e){}}
if(!regexObject)
regexObject=createPlainTextSearchRegex(query,regexFlags);return regexObject;}
function createPlainTextSearchRegex(query,flags){const regexSpecialCharacters=String.regexSpecialCharacters();let regex='';for(let i=0;i<query.length;++i){const c=query.charAt(i);if(regexSpecialCharacters.indexOf(c)!==-1)
regex+='\\';regex+=c;}
return new RegExp(regex,flags||'');}
function countRegexMatches(regex,content){let text=content;let result=0;let match;while(text&&(match=regex.exec(text))){if(match[0].length>0)
++result;text=text.substring(match.index+1);}
return result;}
function spacesPadding(spacesCount){return'\u00a0'.repeat(spacesCount);}
function numberToStringWithSpacesPadding(value,symbolsCount){const numberString=value.toString();const paddingLength=Math.max(0,symbolsCount-numberString.length);return spacesPadding(paddingLength)+numberString;}
Set.prototype.valuesArray=function(){return Array.from(this.values());};Set.prototype.firstValue=function(){if(!this.size)
return null;return this.values().next().value;};Set.prototype.addAll=function(iterable){for(const e of iterable)
this.add(e);};Set.prototype.containsAll=function(iterable){for(const e of iterable){if(!this.has(e))
return false;}
return true;};Map.prototype.remove=function(key){const value=this.get(key);this.delete(key);return value;};Map.prototype.valuesArray=function(){return Array.from(this.values());};Map.prototype.keysArray=function(){return Array.from(this.keys());};Map.prototype.inverse=function(){const result=new Multimap();for(const key of this.keys()){const value=this.get(key);result.set(value,key);}
return result;};var Multimap=function(){this._map=new Map();};Multimap.prototype={set:function(key,value){let set=this._map.get(key);if(!set){set=new Set();this._map.set(key,set);}
set.add(value);},get:function(key){return this._map.get(key)||new Set();},has:function(key){return this._map.has(key);},hasValue:function(key,value){const set=this._map.get(key);if(!set)
return false;return set.has(value);},get size(){return this._map.size;},delete:function(key,value){const values=this.get(key);if(!values)
return false;const result=values.delete(value);if(!values.size)
this._map.delete(key);return result;},deleteAll:function(key){this._map.delete(key);},keysArray:function(){return this._map.keysArray();},valuesArray:function(){const result=[];const keys=this.keysArray();for(let i=0;i<keys.length;++i)
result.pushAll(this.get(keys[i]).valuesArray());return result;},clear:function(){this._map.clear();}};function loadXHR(url){return new Promise(load);function load(successCallback,failureCallback){function onReadyStateChanged(){if(xhr.readyState!==XMLHttpRequest.DONE)
return;if(xhr.status!==200){xhr.onreadystatechange=null;failureCallback(new Error(xhr.status));return;}
xhr.onreadystatechange=null;successCallback(xhr.responseText);}
const xhr=new XMLHttpRequest();xhr.withCredentials=false;xhr.open('GET',url,true);xhr.onreadystatechange=onReadyStateChanged;xhr.send(null);}}
function suppressUnused(value){}
self.setImmediate=function(callback){const args=[...arguments].slice(1);Promise.resolve().then(()=>callback(...args));return 0;};Promise.prototype.spread=function(callback){return this.then(spreadPromise);function spreadPromise(arg){return callback.apply(null,arg);}};Promise.prototype.catchException=function(defaultValue){return this.catch(function(error){console.error(error);return defaultValue;});};Map.prototype.diff=function(other,isEqual){const leftKeys=this.keysArray();const rightKeys=other.keysArray();leftKeys.sort((a,b)=>a-b);rightKeys.sort((a,b)=>a-b);const removed=[];const added=[];const equal=[];let leftIndex=0;let rightIndex=0;while(leftIndex<leftKeys.length&&rightIndex<rightKeys.length){const leftKey=leftKeys[leftIndex];const rightKey=rightKeys[rightIndex];if(leftKey===rightKey&&isEqual(this.get(leftKey),other.get(rightKey))){equal.push(this.get(leftKey));++leftIndex;++rightIndex;continue;}
if(leftKey<=rightKey){removed.push(this.get(leftKey));++leftIndex;continue;}
added.push(other.get(rightKey));++rightIndex;}
while(leftIndex<leftKeys.length){const leftKey=leftKeys[leftIndex++];removed.push(this.get(leftKey));}
while(rightIndex<rightKeys.length){const rightKey=rightKeys[rightIndex++];added.push(other.get(rightKey));}
return{added:added,removed:removed,equal:equal};};function runOnWindowLoad(callback){function windowLoaded(){self.removeEventListener('DOMContentLoaded',windowLoaded,false);callback();}
if(document.readyState==='complete'||document.readyState==='interactive')
callback();else
self.addEventListener('DOMContentLoaded',windowLoaded,false);}
const _singletonSymbol=Symbol('singleton');function singleton(constructorFunction){if(_singletonSymbol in constructorFunction)
return constructorFunction[_singletonSymbol];const instance=new constructorFunction();constructorFunction[_singletonSymbol]=instance;return instance;};self['TextUtils']=self['TextUtils']||{};TextUtils.Text=class{constructor(value){this._value=value;}
lineEndings(){if(!this._lineEndings)
this._lineEndings=this._value.computeLineEndings();return this._lineEndings;}
value(){return this._value;}
lineCount(){const lineEndings=this.lineEndings();return lineEndings.length;}
offsetFromPosition(lineNumber,columnNumber){return(lineNumber?this.lineEndings()[lineNumber-1]+1:0)+columnNumber;}
positionFromOffset(offset){const lineEndings=this.lineEndings();const lineNumber=lineEndings.lowerBound(offset);return{lineNumber:lineNumber,columnNumber:offset-(lineNumber&&(lineEndings[lineNumber-1]+1))};}
lineAt(lineNumber){const lineEndings=this.lineEndings();const lineStart=lineNumber>0?lineEndings[lineNumber-1]+1:0;const lineEnd=lineEndings[lineNumber];let lineContent=this._value.substring(lineStart,lineEnd);if(lineContent.length>0&&lineContent.charAt(lineContent.length-1)==='\r')
lineContent=lineContent.substring(0,lineContent.length-1);return lineContent;}
toSourceRange(range){const start=this.offsetFromPosition(range.startLine,range.startColumn);const end=this.offsetFromPosition(range.endLine,range.endColumn);return new TextUtils.SourceRange(start,end-start);}
toTextRange(sourceRange){const cursor=new TextUtils.TextCursor(this.lineEndings());const result=TextUtils.TextRange.createFromLocation(0,0);cursor.resetTo(sourceRange.offset);result.startLine=cursor.lineNumber();result.startColumn=cursor.columnNumber();cursor.advance(sourceRange.offset+sourceRange.length);result.endLine=cursor.lineNumber();result.endColumn=cursor.columnNumber();return result;}
replaceRange(range,replacement){const sourceRange=this.toSourceRange(range);return this._value.substring(0,sourceRange.offset)+replacement+
this._value.substring(sourceRange.offset+sourceRange.length);}
extract(range){const sourceRange=this.toSourceRange(range);return this._value.substr(sourceRange.offset,sourceRange.length);}};TextUtils.Text.Position;TextUtils.TextCursor=class{constructor(lineEndings){this._lineEndings=lineEndings;this._offset=0;this._lineNumber=0;this._columnNumber=0;}
advance(offset){this._offset=offset;while(this._lineNumber<this._lineEndings.length&&this._lineEndings[this._lineNumber]<this._offset)
++this._lineNumber;this._columnNumber=this._lineNumber?this._offset-this._lineEndings[this._lineNumber-1]-1:this._offset;}
offset(){return this._offset;}
resetTo(offset){this._offset=offset;this._lineNumber=this._lineEndings.lowerBound(offset);this._columnNumber=this._lineNumber?this._offset-this._lineEndings[this._lineNumber-1]-1:this._offset;}
lineNumber(){return this._lineNumber;}
columnNumber(){return this._columnNumber;}};;TextUtils.TextUtils={isStopChar:function(char){return(char>' '&&char<'0')||(char>'9'&&char<'A')||(char>'Z'&&char<'_')||(char>'_'&&char<'a')||(char>'z'&&char<='~');},isWordChar:function(char){return!TextUtils.TextUtils.isStopChar(char)&&!TextUtils.TextUtils.isSpaceChar(char);},isSpaceChar:function(char){return TextUtils.TextUtils._SpaceCharRegex.test(char);},isWord:function(word){for(let i=0;i<word.length;++i){if(!TextUtils.TextUtils.isWordChar(word.charAt(i)))
return false;}
return true;},isOpeningBraceChar:function(char){return char==='('||char==='{';},isClosingBraceChar:function(char){return char===')'||char==='}';},isBraceChar:function(char){return TextUtils.TextUtils.isOpeningBraceChar(char)||TextUtils.TextUtils.isClosingBraceChar(char);},textToWords:function(text,isWordChar,wordCallback){let startWord=-1;for(let i=0;i<text.length;++i){if(!isWordChar(text.charAt(i))){if(startWord!==-1)
wordCallback(text.substring(startWord,i));startWord=-1;}else if(startWord===-1){startWord=i;}}
if(startWord!==-1)
wordCallback(text.substring(startWord));},lineIndent:function(line){let indentation=0;while(indentation<line.length&&TextUtils.TextUtils.isSpaceChar(line.charAt(indentation)))
++indentation;return line.substr(0,indentation);},isUpperCase:function(text){return text===text.toUpperCase();},isLowerCase:function(text){return text===text.toLowerCase();},splitStringByRegexes(text,regexes){const matches=[];const globalRegexes=[];for(let i=0;i<regexes.length;i++){const regex=regexes[i];if(!regex.global)
globalRegexes.push(new RegExp(regex.source,regex.flags?regex.flags+'g':'g'));else
globalRegexes.push(regex);}
doSplit(text,0,0);return matches;function doSplit(text,regexIndex,startIndex){if(regexIndex>=globalRegexes.length){matches.push({value:text,position:startIndex,regexIndex:-1,captureGroups:[]});return;}
const regex=globalRegexes[regexIndex];let currentIndex=0;let result;regex.lastIndex=0;while((result=regex.exec(text))!==null){const stringBeforeMatch=text.substring(currentIndex,result.index);if(stringBeforeMatch)
doSplit(stringBeforeMatch,regexIndex+1,startIndex+currentIndex);const match=result[0];matches.push({value:match,position:startIndex+result.index,regexIndex:regexIndex,captureGroups:result.slice(1)});currentIndex=result.index+match.length;}
const stringAfterMatches=text.substring(currentIndex);if(stringAfterMatches)
doSplit(stringAfterMatches,regexIndex+1,startIndex+currentIndex);}}};TextUtils.FilterParser=class{constructor(keys){this._keys=keys;}
static cloneFilter(filter){return{key:filter.key,text:filter.text,regex:filter.regex,negative:filter.negative};}
parse(query){const splitResult=TextUtils.TextUtils.splitStringByRegexes(query,[TextUtils.TextUtils._keyValueFilterRegex,TextUtils.TextUtils._regexFilterRegex,TextUtils.TextUtils._textFilterRegex]);const filters=[];for(let i=0;i<splitResult.length;i++){const regexIndex=splitResult[i].regexIndex;if(regexIndex===-1)
continue;const result=splitResult[i].captureGroups;if(regexIndex===0){if(this._keys.indexOf((result[1]))!==-1)
filters.push({key:result[1],text:result[2],negative:!!result[0]});else
filters.push({text:result[1]+':'+result[2],negative:!!result[0]});}else if(regexIndex===1){try{filters.push({regex:new RegExp(result[1],'i'),negative:!!result[0]});}catch(e){filters.push({text:'/'+result[1]+'/',negative:!!result[0]});}}else if(regexIndex===2){filters.push({text:result[1],negative:!!result[0]});}}
return filters;}};TextUtils.FilterParser.ParsedFilter;TextUtils.TextUtils._keyValueFilterRegex=/(?:^|\s)(\-)?([\w\-]+):([^\s]+)/;TextUtils.TextUtils._regexFilterRegex=/(?:^|\s)(\-)?\/([^\s]+)\//;TextUtils.TextUtils._textFilterRegex=/(?:^|\s)(\-)?([^\s]+)/;TextUtils.TextUtils._SpaceCharRegex=/\s/;TextUtils.TextUtils.Indent={TwoSpaces:'  ',FourSpaces:'    ',EightSpaces:'        ',TabCharacter:'\t'};TextUtils.TextUtils.BalancedJSONTokenizer=class{constructor(callback,findMultiple){this._callback=callback;this._index=0;this._balance=0;this._buffer='';this._findMultiple=findMultiple||false;this._closingDoubleQuoteRegex=/[^\\](?:\\\\)*"/g;}
write(chunk){this._buffer+=chunk;const lastIndex=this._buffer.length;const buffer=this._buffer;let index;for(index=this._index;index<lastIndex;++index){const character=buffer[index];if(character==='"'){this._closingDoubleQuoteRegex.lastIndex=index;if(!this._closingDoubleQuoteRegex.test(buffer))
break;index=this._closingDoubleQuoteRegex.lastIndex-1;}else if(character==='{'){++this._balance;}else if(character==='}'){--this._balance;if(this._balance<0){this._reportBalanced();return false;}
if(!this._balance){this._lastBalancedIndex=index+1;if(!this._findMultiple)
break;}}else if(character===']'&&!this._balance){this._reportBalanced();return false;}}
this._index=index;this._reportBalanced();return true;}
_reportBalanced(){if(!this._lastBalancedIndex)
return;this._callback(this._buffer.slice(0,this._lastBalancedIndex));this._buffer=this._buffer.slice(this._lastBalancedIndex);this._index-=this._lastBalancedIndex;this._lastBalancedIndex=0;}
remainder(){return this._buffer;}};TextUtils.TokenizerFactory=function(){};TextUtils.TokenizerFactory.prototype={createTokenizer(mimeType){}};TextUtils.isMinified=function(text){const kMaxNonMinifiedLength=500;let linesToCheck=10;let lastPosition=0;do{let eolIndex=text.indexOf('\n',lastPosition);if(eolIndex<0)
eolIndex=text.length;if(eolIndex-lastPosition>kMaxNonMinifiedLength&&text.substr(lastPosition,3)!=='//#')
return true;lastPosition=eolIndex+1;}while(--linesToCheck>=0&&lastPosition<text.length);linesToCheck=10;lastPosition=text.length;do{let eolIndex=text.lastIndexOf('\n',lastPosition);if(eolIndex<0)
eolIndex=0;if(lastPosition-eolIndex>kMaxNonMinifiedLength&&text.substr(lastPosition,3)!=='//#')
return true;lastPosition=eolIndex-1;}while(--linesToCheck>=0&&lastPosition>0);return false;};;TextUtils.TextRange=class{constructor(startLine,startColumn,endLine,endColumn){this.startLine=startLine;this.startColumn=startColumn;this.endLine=endLine;this.endColumn=endColumn;}
static createFromLocation(line,column){return new TextUtils.TextRange(line,column,line,column);}
static fromObject(serializedTextRange){return new TextUtils.TextRange(serializedTextRange.startLine,serializedTextRange.startColumn,serializedTextRange.endLine,serializedTextRange.endColumn);}
static comparator(range1,range2){return range1.compareTo(range2);}
static fromEdit(oldRange,newText){let endLine=oldRange.startLine;let endColumn=oldRange.startColumn+newText.length;const lineEndings=newText.computeLineEndings();if(lineEndings.length>1){endLine=oldRange.startLine+lineEndings.length-1;const len=lineEndings.length;endColumn=lineEndings[len-1]-lineEndings[len-2]-1;}
return new TextUtils.TextRange(oldRange.startLine,oldRange.startColumn,endLine,endColumn);}
isEmpty(){return this.startLine===this.endLine&&this.startColumn===this.endColumn;}
immediatelyPrecedes(range){if(!range)
return false;return this.endLine===range.startLine&&this.endColumn===range.startColumn;}
immediatelyFollows(range){if(!range)
return false;return range.immediatelyPrecedes(this);}
follows(range){return(range.endLine===this.startLine&&range.endColumn<=this.startColumn)||range.endLine<this.startLine;}
get linesCount(){return this.endLine-this.startLine;}
collapseToEnd(){return new TextUtils.TextRange(this.endLine,this.endColumn,this.endLine,this.endColumn);}
collapseToStart(){return new TextUtils.TextRange(this.startLine,this.startColumn,this.startLine,this.startColumn);}
normalize(){if(this.startLine>this.endLine||(this.startLine===this.endLine&&this.startColumn>this.endColumn))
return new TextUtils.TextRange(this.endLine,this.endColumn,this.startLine,this.startColumn);else
return this.clone();}
clone(){return new TextUtils.TextRange(this.startLine,this.startColumn,this.endLine,this.endColumn);}
serializeToObject(){const serializedTextRange={};serializedTextRange.startLine=this.startLine;serializedTextRange.startColumn=this.startColumn;serializedTextRange.endLine=this.endLine;serializedTextRange.endColumn=this.endColumn;return serializedTextRange;}
compareTo(other){if(this.startLine>other.startLine)
return 1;if(this.startLine<other.startLine)
return-1;if(this.startColumn>other.startColumn)
return 1;if(this.startColumn<other.startColumn)
return-1;return 0;}
compareToPosition(lineNumber,columnNumber){if(lineNumber<this.startLine||(lineNumber===this.startLine&&columnNumber<this.startColumn))
return-1;if(lineNumber>this.endLine||(lineNumber===this.endLine&&columnNumber>this.endColumn))
return 1;return 0;}
equal(other){return this.startLine===other.startLine&&this.endLine===other.endLine&&this.startColumn===other.startColumn&&this.endColumn===other.endColumn;}
relativeTo(line,column){const relative=this.clone();if(this.startLine===line)
relative.startColumn-=column;if(this.endLine===line)
relative.endColumn-=column;relative.startLine-=line;relative.endLine-=line;return relative;}
relativeFrom(line,column){const relative=this.clone();if(this.startLine===0)
relative.startColumn+=column;if(this.endLine===0)
relative.endColumn+=column;relative.startLine+=line;relative.endLine+=line;return relative;}
rebaseAfterTextEdit(originalRange,editedRange){console.assert(originalRange.startLine===editedRange.startLine);console.assert(originalRange.startColumn===editedRange.startColumn);const rebase=this.clone();if(!this.follows(originalRange))
return rebase;const lineDelta=editedRange.endLine-originalRange.endLine;const columnDelta=editedRange.endColumn-originalRange.endColumn;rebase.startLine+=lineDelta;rebase.endLine+=lineDelta;if(rebase.startLine===editedRange.endLine)
rebase.startColumn+=columnDelta;if(rebase.endLine===editedRange.endLine)
rebase.endColumn+=columnDelta;return rebase;}
toString(){return JSON.stringify(this);}
containsLocation(lineNumber,columnNumber){if(this.startLine===this.endLine)
return this.startLine===lineNumber&&this.startColumn<=columnNumber&&columnNumber<=this.endColumn;if(this.startLine===lineNumber)
return this.startColumn<=columnNumber;if(this.endLine===lineNumber)
return columnNumber<=this.endColumn;return this.startLine<lineNumber&&lineNumber<this.endLine;}};TextUtils.SourceRange=class{constructor(offset,length){this.offset=offset;this.length=length;}};TextUtils.SourceEdit=class{constructor(sourceURL,oldRange,newText){this.sourceURL=sourceURL;this.oldRange=oldRange;this.newText=newText;}
static comparator(edit1,edit2){return TextUtils.TextRange.comparator(edit1.oldRange,edit2.oldRange);}
newRange(){return TextUtils.TextRange.fromEdit(this.oldRange,this.newText);}};;self['Common']=self['Common']||{};Common.Worker=class{constructor(appName){let url=appName+'.js';url+=Runtime.queryParamsString();this._workerPromise=new Promise(fulfill=>{this._worker=new Worker(url);this._worker.onmessage=onMessage.bind(this);function onMessage(event){console.assert(event.data==='workerReady');this._worker.onmessage=null;fulfill(this._worker);this._worker=null;}});}
postMessage(message){this._workerPromise.then(worker=>{if(!this._disposed)
worker.postMessage(message);});}
dispose(){this._disposed=true;this._workerPromise.then(worker=>worker.terminate());}
terminate(){this.dispose();}
set onmessage(listener){this._workerPromise.then(worker=>worker.onmessage=listener);}
set onerror(listener){this._workerPromise.then(worker=>worker.onerror=listener);}};;Common.TextDictionary=class{constructor(){this._words=new Map();this._index=new Common.Trie();}
addWord(word){let count=this._words.get(word)||0;++count;this._words.set(word,count);this._index.add(word);}
removeWord(word){let count=this._words.get(word)||0;if(!count)
return;if(count===1){this._words.delete(word);this._index.remove(word);return;}
--count;this._words.set(word,count);}
wordsWithPrefix(prefix){return this._index.words(prefix);}
hasWord(word){return this._words.has(word);}
wordCount(word){return this._words.get(word)||0;}
reset(){this._words.clear();this._index.clear();}};;Common.Object=class{constructor(){this._listeners;}
addEventListener(eventType,listener,thisObject){if(!listener)
console.assert(false);if(!this._listeners)
this._listeners=new Map();if(!this._listeners.has(eventType))
this._listeners.set(eventType,[]);this._listeners.get(eventType).push({thisObject:thisObject,listener:listener});return{eventTarget:this,eventType:eventType,thisObject:thisObject,listener:listener};}
once(eventType){return new Promise(resolve=>{const descriptor=this.addEventListener(eventType,event=>{this.removeEventListener(eventType,descriptor.listener);resolve(event.data);});});}
removeEventListener(eventType,listener,thisObject){console.assert(listener);if(!this._listeners||!this._listeners.has(eventType))
return;const listeners=this._listeners.get(eventType);for(let i=0;i<listeners.length;++i){if(listeners[i].listener===listener&&listeners[i].thisObject===thisObject){listeners[i].disposed=true;listeners.splice(i--,1);}}
if(!listeners.length)
this._listeners.delete(eventType);}
hasEventListeners(eventType){return!!(this._listeners&&this._listeners.has(eventType));}
dispatchEventToListeners(eventType,eventData){if(!this._listeners||!this._listeners.has(eventType))
return;const event=({data:eventData});const listeners=this._listeners.get(eventType).slice(0);for(let i=0;i<listeners.length;++i){if(!listeners[i].disposed)
listeners[i].listener.call(listeners[i].thisObject,event);}}};Common.Event;Common.Object._listenerCallbackTuple;Common.EventTarget=function(){};Common.EventTarget.EventDescriptor;Common.EventTarget.removeEventListeners=function(eventList){for(const eventInfo of eventList)
eventInfo.eventTarget.removeEventListener(eventInfo.eventType,eventInfo.listener,eventInfo.thisObject);eventList.splice(0);};Common.EventTarget.prototype={addEventListener(eventType,listener,thisObject){},once(eventType){},removeEventListener(eventType,listener,thisObject){},hasEventListeners(eventType){},dispatchEventToListeners(eventType,eventData){},};;Common.Color=class{constructor(rgba,format,originalText){this._rgba=rgba;this._originalText=originalText||null;this._originalTextIsValid=!!this._originalText;this._format=format;if(typeof this._rgba[3]==='undefined')
this._rgba[3]=1;for(let i=0;i<4;++i){if(this._rgba[i]<0){this._rgba[i]=0;this._originalTextIsValid=false;}
if(this._rgba[i]>1){this._rgba[i]=1;this._originalTextIsValid=false;}}}
static parse(text){const value=text.toLowerCase().replace(/\s+/g,'');const simple=/^(?:#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(\w+))$/i;let match=value.match(simple);if(match){if(match[1]){let hex=match[1].toLowerCase();let format;if(hex.length===3){format=Common.Color.Format.ShortHEX;hex=hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);}else if(hex.length===4){format=Common.Color.Format.ShortHEXA;hex=hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2)+
hex.charAt(3)+hex.charAt(3);}else if(hex.length===6){format=Common.Color.Format.HEX;}else{format=Common.Color.Format.HEXA;}
const r=parseInt(hex.substring(0,2),16);const g=parseInt(hex.substring(2,4),16);const b=parseInt(hex.substring(4,6),16);let a=1;if(hex.length===8)
a=parseInt(hex.substring(6,8),16)/255;return new Common.Color([r/255,g/255,b/255,a],format,text);}
if(match[2]){const nickname=match[2].toLowerCase();if(nickname in Common.Color.Nicknames){const rgba=Common.Color.Nicknames[nickname];const color=Common.Color.fromRGBA(rgba);color._format=Common.Color.Format.Nickname;color._originalText=text;return color;}
return null;}
return null;}
match=text.toLowerCase().match(/^\s*(?:(rgba?)|(hsla?))\((.*)\)\s*$/);if(match){const components=match[3].trim();let values=components.split(/\s*,\s*/);if(values.length===1){values=components.split(/\s+/);if(values[3]==='/'){values.splice(3,1);if(values.length!==4)
return null;}else if((values.length>2&&values[2].indexOf('/')!==-1)||(values.length>3&&values[3].indexOf('/')!==-1)){const alpha=values.slice(2,4).join('');values=values.slice(0,2).concat(alpha.split(/\//)).concat(values.slice(4));}else if(values.length>=4){return null;}}
if(values.length!==3&&values.length!==4||values.indexOf('')>-1)
return null;const hasAlpha=(values[3]!==undefined);if(match[1]){const rgba=[Common.Color._parseRgbNumeric(values[0]),Common.Color._parseRgbNumeric(values[1]),Common.Color._parseRgbNumeric(values[2]),hasAlpha?Common.Color._parseAlphaNumeric(values[3]):1];if(rgba.indexOf(null)>-1)
return null;return new Common.Color(rgba,hasAlpha?Common.Color.Format.RGBA:Common.Color.Format.RGB,text);}
if(match[2]){const hsla=[Common.Color._parseHueNumeric(values[0]),Common.Color._parseSatLightNumeric(values[1]),Common.Color._parseSatLightNumeric(values[2]),hasAlpha?Common.Color._parseAlphaNumeric(values[3]):1];if(hsla.indexOf(null)>-1)
return null;const rgba=[];Common.Color.hsl2rgb(hsla,rgba);return new Common.Color(rgba,hasAlpha?Common.Color.Format.HSLA:Common.Color.Format.HSL,text);}}
return null;}
static fromRGBA(rgba){return new Common.Color([rgba[0]/255,rgba[1]/255,rgba[2]/255,rgba[3]],Common.Color.Format.RGBA);}
static fromHSVA(hsva){const rgba=[];Common.Color.hsva2rgba(hsva,rgba);return new Common.Color(rgba,Common.Color.Format.HSLA);}
static _parsePercentOrNumber(value){if(isNaN(value.replace('%','')))
return null;const parsed=parseFloat(value);if(value.indexOf('%')!==-1){if(value.indexOf('%')!==value.length-1)
return null;return parsed/100;}
return parsed;}
static _parseRgbNumeric(value){const parsed=Common.Color._parsePercentOrNumber(value);if(parsed===null)
return null;if(value.indexOf('%')!==-1)
return parsed;return parsed/255;}
static _parseHueNumeric(value){const angle=value.replace(/(deg|g?rad|turn)$/,'');if(isNaN(angle)||value.match(/\s+(deg|g?rad|turn)/))
return null;const number=parseFloat(angle);if(value.indexOf('turn')!==-1)
return number%1;else if(value.indexOf('grad')!==-1)
return(number/400)%1;else if(value.indexOf('rad')!==-1)
return(number/(2*Math.PI))%1;return(number/360)%1;}
static _parseSatLightNumeric(value){if(value.indexOf('%')!==value.length-1||isNaN(value.replace('%','')))
return null;const parsed=parseFloat(value);return Math.min(1,parsed/100);}
static _parseAlphaNumeric(value){return Common.Color._parsePercentOrNumber(value);}
static _hsva2hsla(hsva,out_hsla){const h=hsva[0];let s=hsva[1];const v=hsva[2];const t=(2-s)*v;if(v===0||s===0)
s=0;else
s*=v/(t<1?t:2-t);out_hsla[0]=h;out_hsla[1]=s;out_hsla[2]=t/2;out_hsla[3]=hsva[3];}
static hsl2rgb(hsl,out_rgb){const h=hsl[0];let s=hsl[1];const l=hsl[2];function hue2rgb(p,q,h){if(h<0)
h+=1;else if(h>1)
h-=1;if((h*6)<1)
return p+(q-p)*h*6;else if((h*2)<1)
return q;else if((h*3)<2)
return p+(q-p)*((2/3)-h)*6;else
return p;}
if(s<0)
s=0;let q;if(l<=0.5)
q=l*(1+s);else
q=l+s-(l*s);const p=2*l-q;const tr=h+(1/3);const tg=h;const tb=h-(1/3);out_rgb[0]=hue2rgb(p,q,tr);out_rgb[1]=hue2rgb(p,q,tg);out_rgb[2]=hue2rgb(p,q,tb);out_rgb[3]=hsl[3];}
static hsva2rgba(hsva,out_rgba){Common.Color._hsva2hsla(hsva,Common.Color.hsva2rgba._tmpHSLA);Common.Color.hsl2rgb(Common.Color.hsva2rgba._tmpHSLA,out_rgba);for(let i=0;i<Common.Color.hsva2rgba._tmpHSLA.length;i++)
Common.Color.hsva2rgba._tmpHSLA[i]=0;}
static luminance(rgba){const rSRGB=rgba[0];const gSRGB=rgba[1];const bSRGB=rgba[2];const r=rSRGB<=0.03928?rSRGB/12.92:Math.pow(((rSRGB+0.055)/1.055),2.4);const g=gSRGB<=0.03928?gSRGB/12.92:Math.pow(((gSRGB+0.055)/1.055),2.4);const b=bSRGB<=0.03928?bSRGB/12.92:Math.pow(((bSRGB+0.055)/1.055),2.4);return 0.2126*r+0.7152*g+0.0722*b;}
static blendColors(fgRGBA,bgRGBA,out_blended){const alpha=fgRGBA[3];out_blended[0]=((1-alpha)*bgRGBA[0])+(alpha*fgRGBA[0]);out_blended[1]=((1-alpha)*bgRGBA[1])+(alpha*fgRGBA[1]);out_blended[2]=((1-alpha)*bgRGBA[2])+(alpha*fgRGBA[2]);out_blended[3]=alpha+(bgRGBA[3]*(1-alpha));}
static calculateContrastRatio(fgRGBA,bgRGBA){Common.Color.blendColors(fgRGBA,bgRGBA,Common.Color.calculateContrastRatio._blendedFg);const fgLuminance=Common.Color.luminance(Common.Color.calculateContrastRatio._blendedFg);const bgLuminance=Common.Color.luminance(bgRGBA);const contrastRatio=(Math.max(fgLuminance,bgLuminance)+0.05)/(Math.min(fgLuminance,bgLuminance)+0.05);for(let i=0;i<Common.Color.calculateContrastRatio._blendedFg.length;i++)
Common.Color.calculateContrastRatio._blendedFg[i]=0;return contrastRatio;}
static desiredLuminance(luminance,contrast,lighter){function computeLuminance(){if(lighter)
return(luminance+0.05)*contrast-0.05;else
return(luminance+0.05)/contrast-0.05;}
let desiredLuminance=computeLuminance();if(desiredLuminance<0||desiredLuminance>1){lighter=!lighter;desiredLuminance=computeLuminance();}
return desiredLuminance;}
static detectColorFormat(color){const cf=Common.Color.Format;let format;const formatSetting=Common.moduleSetting('colorFormat').get();if(formatSetting===cf.Original)
format=cf.Original;else if(formatSetting===cf.RGB)
format=(color.hasAlpha()?cf.RGBA:cf.RGB);else if(formatSetting===cf.HSL)
format=(color.hasAlpha()?cf.HSLA:cf.HSL);else if(formatSetting===cf.HEX)
format=color.detectHEXFormat();else
format=cf.RGBA;return format;}
format(){return this._format;}
hsla(){if(this._hsla)
return this._hsla;const r=this._rgba[0];const g=this._rgba[1];const b=this._rgba[2];const max=Math.max(r,g,b);const min=Math.min(r,g,b);const diff=max-min;const add=max+min;let h;if(min===max)
h=0;else if(r===max)
h=((1/6*(g-b)/diff)+1)%1;else if(g===max)
h=(1/6*(b-r)/diff)+1/3;else
h=(1/6*(r-g)/diff)+2/3;const l=0.5*add;let s;if(l===0)
s=0;else if(l===1)
s=0;else if(l<=0.5)
s=diff/add;else
s=diff/(2-add);this._hsla=[h,s,l,this._rgba[3]];return this._hsla;}
canonicalHSLA(){const hsla=this.hsla();return[Math.round(hsla[0]*360),Math.round(hsla[1]*100),Math.round(hsla[2]*100),hsla[3]];}
hsva(){const hsla=this.hsla();const h=hsla[0];let s=hsla[1];const l=hsla[2];s*=l<0.5?l:1-l;return[h,s!==0?2*s/(l+s):0,(l+s),hsla[3]];}
hasAlpha(){return this._rgba[3]!==1;}
detectHEXFormat(){let canBeShort=true;for(let i=0;i<4;++i){const c=Math.round(this._rgba[i]*255);if(c%17){canBeShort=false;break;}}
const hasAlpha=this.hasAlpha();const cf=Common.Color.Format;if(canBeShort)
return hasAlpha?cf.ShortHEXA:cf.ShortHEX;return hasAlpha?cf.HEXA:cf.HEX;}
asString(format){if(format===this._format&&this._originalTextIsValid)
return this._originalText;if(!format)
format=this._format;function toRgbValue(value){return Math.round(value*255);}
function toHexValue(value){const hex=Math.round(value*255).toString(16);return hex.length===1?'0'+hex:hex;}
function toShortHexValue(value){return(Math.round(value*255)/17).toString(16);}
switch(format){case Common.Color.Format.Original:return this._originalText;case Common.Color.Format.RGB:if(this.hasAlpha())
return null;return String.sprintf('rgb(%d, %d, %d)',toRgbValue(this._rgba[0]),toRgbValue(this._rgba[1]),toRgbValue(this._rgba[2]));case Common.Color.Format.RGBA:return String.sprintf('rgba(%d, %d, %d, %f)',toRgbValue(this._rgba[0]),toRgbValue(this._rgba[1]),toRgbValue(this._rgba[2]),this._rgba[3]);case Common.Color.Format.HSL:if(this.hasAlpha())
return null;const hsl=this.hsla();return String.sprintf('hsl(%d, %d%, %d%)',Math.round(hsl[0]*360),Math.round(hsl[1]*100),Math.round(hsl[2]*100));case Common.Color.Format.HSLA:const hsla=this.hsla();return String.sprintf('hsla(%d, %d%, %d%, %f)',Math.round(hsla[0]*360),Math.round(hsla[1]*100),Math.round(hsla[2]*100),hsla[3]);case Common.Color.Format.HEXA:return String.sprintf('#%s%s%s%s',toHexValue(this._rgba[0]),toHexValue(this._rgba[1]),toHexValue(this._rgba[2]),toHexValue(this._rgba[3])).toLowerCase();case Common.Color.Format.HEX:if(this.hasAlpha())
return null;return String.sprintf('#%s%s%s',toHexValue(this._rgba[0]),toHexValue(this._rgba[1]),toHexValue(this._rgba[2])).toLowerCase();case Common.Color.Format.ShortHEXA:const hexFormat=this.detectHEXFormat();if(hexFormat!==Common.Color.Format.ShortHEXA&&hexFormat!==Common.Color.Format.ShortHEX)
return null;return String.sprintf('#%s%s%s%s',toShortHexValue(this._rgba[0]),toShortHexValue(this._rgba[1]),toShortHexValue(this._rgba[2]),toShortHexValue(this._rgba[3])).toLowerCase();case Common.Color.Format.ShortHEX:if(this.hasAlpha())
return null;if(this.detectHEXFormat()!==Common.Color.Format.ShortHEX)
return null;return String.sprintf('#%s%s%s',toShortHexValue(this._rgba[0]),toShortHexValue(this._rgba[1]),toShortHexValue(this._rgba[2])).toLowerCase();case Common.Color.Format.Nickname:return this.nickname();}
return this._originalText;}
rgba(){return this._rgba.slice();}
canonicalRGBA(){const rgba=new Array(4);for(let i=0;i<3;++i)
rgba[i]=Math.round(this._rgba[i]*255);rgba[3]=this._rgba[3];return rgba;}
nickname(){if(!Common.Color._rgbaToNickname){Common.Color._rgbaToNickname={};for(const nickname in Common.Color.Nicknames){let rgba=Common.Color.Nicknames[nickname];if(rgba.length!==4)
rgba=rgba.concat(1);Common.Color._rgbaToNickname[rgba]=nickname;}}
return Common.Color._rgbaToNickname[this.canonicalRGBA()]||null;}
toProtocolRGBA(){const rgba=this.canonicalRGBA();const result={r:rgba[0],g:rgba[1],b:rgba[2]};if(rgba[3]!==1)
result.a=rgba[3];return result;}
invert(){const rgba=[];rgba[0]=1-this._rgba[0];rgba[1]=1-this._rgba[1];rgba[2]=1-this._rgba[2];rgba[3]=this._rgba[3];return new Common.Color(rgba,Common.Color.Format.RGBA);}
setAlpha(alpha){const rgba=this._rgba.slice();rgba[3]=alpha;return new Common.Color(rgba,Common.Color.Format.RGBA);}
blendWith(fgColor){const rgba=[];Common.Color.blendColors(fgColor._rgba,this._rgba,rgba);return new Common.Color(rgba,Common.Color.Format.RGBA);}};Common.Color.Regex=/((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}|\b[a-zA-Z]+\b(?!-))/g;Common.Color.Format={Original:'original',Nickname:'nickname',HEX:'hex',ShortHEX:'shorthex',HEXA:'hexa',ShortHEXA:'shorthexa',RGB:'rgb',RGBA:'rgba',HSL:'hsl',HSLA:'hsla'};Common.Color.hsva2rgba._tmpHSLA=[0,0,0,0];Common.Color.calculateContrastRatio._blendedFg=[0,0,0,0];Common.Color.Nicknames={'aliceblue':[240,248,255],'antiquewhite':[250,235,215],'aqua':[0,255,255],'aquamarine':[127,255,212],'azure':[240,255,255],'beige':[245,245,220],'bisque':[255,228,196],'black':[0,0,0],'blanchedalmond':[255,235,205],'blue':[0,0,255],'blueviolet':[138,43,226],'brown':[165,42,42],'burlywood':[222,184,135],'cadetblue':[95,158,160],'chartreuse':[127,255,0],'chocolate':[210,105,30],'coral':[255,127,80],'cornflowerblue':[100,149,237],'cornsilk':[255,248,220],'crimson':[237,20,61],'cyan':[0,255,255],'darkblue':[0,0,139],'darkcyan':[0,139,139],'darkgoldenrod':[184,134,11],'darkgray':[169,169,169],'darkgrey':[169,169,169],'darkgreen':[0,100,0],'darkkhaki':[189,183,107],'darkmagenta':[139,0,139],'darkolivegreen':[85,107,47],'darkorange':[255,140,0],'darkorchid':[153,50,204],'darkred':[139,0,0],'darksalmon':[233,150,122],'darkseagreen':[143,188,143],'darkslateblue':[72,61,139],'darkslategray':[47,79,79],'darkslategrey':[47,79,79],'darkturquoise':[0,206,209],'darkviolet':[148,0,211],'deeppink':[255,20,147],'deepskyblue':[0,191,255],'dimgray':[105,105,105],'dimgrey':[105,105,105],'dodgerblue':[30,144,255],'firebrick':[178,34,34],'floralwhite':[255,250,240],'forestgreen':[34,139,34],'fuchsia':[255,0,255],'gainsboro':[220,220,220],'ghostwhite':[248,248,255],'gold':[255,215,0],'goldenrod':[218,165,32],'gray':[128,128,128],'grey':[128,128,128],'green':[0,128,0],'greenyellow':[173,255,47],'honeydew':[240,255,240],'hotpink':[255,105,180],'indianred':[205,92,92],'indigo':[75,0,130],'ivory':[255,255,240],'khaki':[240,230,140],'lavender':[230,230,250],'lavenderblush':[255,240,245],'lawngreen':[124,252,0],'lemonchiffon':[255,250,205],'lightblue':[173,216,230],'lightcoral':[240,128,128],'lightcyan':[224,255,255],'lightgoldenrodyellow':[250,250,210],'lightgreen':[144,238,144],'lightgray':[211,211,211],'lightgrey':[211,211,211],'lightpink':[255,182,193],'lightsalmon':[255,160,122],'lightseagreen':[32,178,170],'lightskyblue':[135,206,250],'lightslategray':[119,136,153],'lightslategrey':[119,136,153],'lightsteelblue':[176,196,222],'lightyellow':[255,255,224],'lime':[0,255,0],'limegreen':[50,205,50],'linen':[250,240,230],'magenta':[255,0,255],'maroon':[128,0,0],'mediumaquamarine':[102,205,170],'mediumblue':[0,0,205],'mediumorchid':[186,85,211],'mediumpurple':[147,112,219],'mediumseagreen':[60,179,113],'mediumslateblue':[123,104,238],'mediumspringgreen':[0,250,154],'mediumturquoise':[72,209,204],'mediumvioletred':[199,21,133],'midnightblue':[25,25,112],'mintcream':[245,255,250],'mistyrose':[255,228,225],'moccasin':[255,228,181],'navajowhite':[255,222,173],'navy':[0,0,128],'oldlace':[253,245,230],'olive':[128,128,0],'olivedrab':[107,142,35],'orange':[255,165,0],'orangered':[255,69,0],'orchid':[218,112,214],'palegoldenrod':[238,232,170],'palegreen':[152,251,152],'paleturquoise':[175,238,238],'palevioletred':[219,112,147],'papayawhip':[255,239,213],'peachpuff':[255,218,185],'peru':[205,133,63],'pink':[255,192,203],'plum':[221,160,221],'powderblue':[176,224,230],'purple':[128,0,128],'rebeccapurple':[102,51,153],'red':[255,0,0],'rosybrown':[188,143,143],'royalblue':[65,105,225],'saddlebrown':[139,69,19],'salmon':[250,128,114],'sandybrown':[244,164,96],'seagreen':[46,139,87],'seashell':[255,245,238],'sienna':[160,82,45],'silver':[192,192,192],'skyblue':[135,206,235],'slateblue':[106,90,205],'slategray':[112,128,144],'slategrey':[112,128,144],'snow':[255,250,250],'springgreen':[0,255,127],'steelblue':[70,130,180],'tan':[210,180,140],'teal':[0,128,128],'thistle':[216,191,216],'tomato':[255,99,71],'turquoise':[64,224,208],'violet':[238,130,238],'wheat':[245,222,179],'white':[255,255,255],'whitesmoke':[245,245,245],'yellow':[255,255,0],'yellowgreen':[154,205,50],'transparent':[0,0,0,0],};Common.Color.PageHighlight={Content:Common.Color.fromRGBA([111,168,220,.66]),ContentLight:Common.Color.fromRGBA([111,168,220,.5]),ContentOutline:Common.Color.fromRGBA([9,83,148]),Padding:Common.Color.fromRGBA([147,196,125,.55]),PaddingLight:Common.Color.fromRGBA([147,196,125,.4]),Border:Common.Color.fromRGBA([255,229,153,.66]),BorderLight:Common.Color.fromRGBA([255,229,153,.5]),Margin:Common.Color.fromRGBA([246,178,107,.66]),MarginLight:Common.Color.fromRGBA([246,178,107,.5]),EventTarget:Common.Color.fromRGBA([255,196,196,.66]),Shape:Common.Color.fromRGBA([96,82,177,0.8]),ShapeMargin:Common.Color.fromRGBA([96,82,127,.6]),CssGrid:Common.Color.fromRGBA([0x4b,0,0x82,1])};Common.Color.Generator=class{constructor(hueSpace,satSpace,lightnessSpace,alphaSpace){this._hueSpace=hueSpace||{min:0,max:360};this._satSpace=satSpace||67;this._lightnessSpace=lightnessSpace||80;this._alphaSpace=alphaSpace||1;this._colors=new Map();}
setColorForID(id,color){this._colors.set(id,color);}
colorForID(id){let color=this._colors.get(id);if(!color){color=this._generateColorForID(id);this._colors.set(id,color);}
return color;}
_generateColorForID(id){const hash=String.hashCode(id);const h=this._indexToValueInSpace(hash,this._hueSpace);const s=this._indexToValueInSpace(hash>>8,this._satSpace);const l=this._indexToValueInSpace(hash>>16,this._lightnessSpace);const a=this._indexToValueInSpace(hash>>24,this._alphaSpace);return`hsla(${h}, ${s}%, ${l}%, ${a})`;}
_indexToValueInSpace(index,space){if(typeof space==='number')
return space;const count=space.count||space.max-space.min;index%=count;return space.min+Math.floor(index/(count-1)*(space.max-space.min));}};;Common.Console=class extends Common.Object{constructor(){super();this._messages=[];}
addMessage(text,level,show){const message=new Common.Console.Message(text,level||Common.Console.MessageLevel.Info,Date.now(),show||false);this._messages.push(message);this.dispatchEventToListeners(Common.Console.Events.MessageAdded,message);}
log(text){this.addMessage(text,Common.Console.MessageLevel.Info);}
warn(text){this.addMessage(text,Common.Console.MessageLevel.Warning);}
error(text){this.addMessage(text,Common.Console.MessageLevel.Error,true);}
messages(){return this._messages;}
show(){this.showPromise();}
showPromise(){return Common.Revealer.reveal(this);}};Common.Console.Events={MessageAdded:Symbol('messageAdded')};Common.Console.MessageLevel={Info:'info',Warning:'warning',Error:'error'};Common.Console.Message=class{constructor(text,level,timestamp,show){this.text=text;this.level=level;this.timestamp=(typeof timestamp==='number')?timestamp:Date.now();this.show=show;}};Common.console=new Common.Console();;Common.ContentProvider=function(){};Common.ContentProvider.prototype={contentURL(){},contentType(){},contentEncoded(){},requestContent(){},searchInContent(query,caseSensitive,isRegex){}};Common.ContentProvider.SearchMatch=class{constructor(lineNumber,lineContent){this.lineNumber=lineNumber;this.lineContent=lineContent;}};Common.ContentProvider.performSearchInContent=function(content,query,caseSensitive,isRegex){const regex=createSearchRegex(query,caseSensitive,isRegex);const text=new TextUtils.Text(content);const result=[];for(let i=0;i<text.lineCount();++i){const lineContent=text.lineAt(i);regex.lastIndex=0;if(regex.exec(lineContent))
result.push(new Common.ContentProvider.SearchMatch(i,lineContent));}
return result;};Common.ContentProvider.contentAsDataURL=function(content,mimeType,contentEncoded,charset){const maxDataUrlSize=1024*1024;if(content===null||content.length>maxDataUrlSize)
return null;return'data:'+mimeType+(charset?';charset='+charset:'')+(contentEncoded?';base64':'')+','+
content;};;Common.ParsedURL=class{constructor(url){this.isValid=false;this.url=url;this.scheme='';this.user='';this.host='';this.port='';this.path='';this.queryParams='';this.fragment='';this.folderPathComponents='';this.lastPathComponent='';const match=url.match(Common.ParsedURL._urlRegex());if(match){this.isValid=true;this.scheme=match[2].toLowerCase();this.user=match[3];this.host=match[4];this.port=match[5];this.path=match[6]||'/';this.queryParams=match[7]||'';this.fragment=match[8];}else{if(this.url.startsWith('data:')){this.scheme='data';return;}
if(this.url==='about:blank'){this.scheme='about';return;}
this.path=this.url;}
const lastSlashIndex=this.path.lastIndexOf('/');if(lastSlashIndex!==-1){this.folderPathComponents=this.path.substring(0,lastSlashIndex);this.lastPathComponent=this.path.substring(lastSlashIndex+1);}else{this.lastPathComponent=this.path;}}
static platformPathToURL(fileSystemPath){fileSystemPath=fileSystemPath.replace(/\\/g,'/');if(!fileSystemPath.startsWith('file://')){if(fileSystemPath.startsWith('/'))
fileSystemPath='file://'+fileSystemPath;else
fileSystemPath='file:///'+fileSystemPath;}
return fileSystemPath;}
static urlToPlatformPath(fileURL,isWindows){console.assert(fileURL.startsWith('file://'),'This must be a file URL.');if(isWindows)
return fileURL.substr('file:///'.length).replace(/\//g,'\\');return fileURL.substr('file://'.length);}
static urlWithoutHash(url){const hashIndex=url.indexOf('#');if(hashIndex!==-1)
return url.substr(0,hashIndex);return url;}
static _urlRegex(){if(Common.ParsedURL._urlRegexInstance)
return Common.ParsedURL._urlRegexInstance;const schemeRegex=/([A-Za-z][A-Za-z0-9+.-]*):\/\//;const userRegex=/(?:([A-Za-z0-9\-._~%!$&'()*+,;=:]*)@)?/;const hostRegex=/((?:\[::\d?\])|(?:[^\s\/:]*))/;const portRegex=/(?::([\d]+))?/;const pathRegex=/(\/[^#?]*)?/;const queryRegex=/(?:\?([^#]*))?/;const fragmentRegex=/(?:#(.*))?/;Common.ParsedURL._urlRegexInstance=new RegExp('^('+schemeRegex.source+userRegex.source+hostRegex.source+portRegex.source+')'+pathRegex.source+
queryRegex.source+fragmentRegex.source+'$');return Common.ParsedURL._urlRegexInstance;}
static extractPath(url){const parsedURL=url.asParsedURL();return parsedURL?parsedURL.path:'';}
static extractOrigin(url){const parsedURL=url.asParsedURL();return parsedURL?parsedURL.securityOrigin():'';}
static extractExtension(url){url=Common.ParsedURL.urlWithoutHash(url);const indexOfQuestionMark=url.indexOf('?');if(indexOfQuestionMark!==-1)
url=url.substr(0,indexOfQuestionMark);const lastIndexOfSlash=url.lastIndexOf('/');if(lastIndexOfSlash!==-1)
url=url.substr(lastIndexOfSlash+1);const lastIndexOfDot=url.lastIndexOf('.');if(lastIndexOfDot!==-1){url=url.substr(lastIndexOfDot+1);const lastIndexOfPercent=url.indexOf('%');if(lastIndexOfPercent!==-1)
return url.substr(0,lastIndexOfPercent);return url;}
return'';}
static extractName(url){let index=url.lastIndexOf('/');const pathAndQuery=index!==-1?url.substr(index+1):url;index=pathAndQuery.indexOf('?');return index<0?pathAndQuery:pathAndQuery.substr(0,index);}
static completeURL(baseURL,href){const trimmedHref=href.trim();if(trimmedHref.startsWith('data:')||trimmedHref.startsWith('blob:')||trimmedHref.startsWith('javascript:'))
return href;const parsedHref=trimmedHref.asParsedURL();if(parsedHref&&parsedHref.scheme)
return trimmedHref;const parsedURL=baseURL.asParsedURL();if(!parsedURL)
return null;if(parsedURL.isDataURL())
return href;if(href.length>1&&href.charAt(0)==='/'&&href.charAt(1)==='/'){return parsedURL.scheme+':'+href;}
const securityOrigin=parsedURL.securityOrigin();const pathText=parsedURL.path;const queryText=parsedURL.queryParams?'?'+parsedURL.queryParams:'';if(!href.length)
return securityOrigin+pathText+queryText;if(href.charAt(0)==='#')
return securityOrigin+pathText+queryText+href;if(href.charAt(0)==='?')
return securityOrigin+pathText+href;let hrefPath=href.match(/^[^#?]*/)[0];const hrefSuffix=href.substring(hrefPath.length);if(hrefPath.charAt(0)!=='/')
hrefPath=parsedURL.folderPathComponents+'/'+hrefPath;return securityOrigin+Runtime.normalizePath(hrefPath)+hrefSuffix;}
static splitLineAndColumn(string){const beforePathMatch=string.match(Common.ParsedURL._urlRegex());let beforePath='';let pathAndAfter=string;if(beforePathMatch){beforePath=beforePathMatch[1];pathAndAfter=string.substring(beforePathMatch[1].length);}
const lineColumnRegEx=/(?::(\d+))?(?::(\d+))?$/;const lineColumnMatch=lineColumnRegEx.exec(pathAndAfter);let lineNumber;let columnNumber;console.assert(lineColumnMatch);if(typeof(lineColumnMatch[1])==='string'){lineNumber=parseInt(lineColumnMatch[1],10);lineNumber=isNaN(lineNumber)?undefined:lineNumber-1;}
if(typeof(lineColumnMatch[2])==='string'){columnNumber=parseInt(lineColumnMatch[2],10);columnNumber=isNaN(columnNumber)?undefined:columnNumber-1;}
return{url:beforePath+pathAndAfter.substring(0,pathAndAfter.length-lineColumnMatch[0].length),lineNumber:lineNumber,columnNumber:columnNumber};}
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
return this.url.substring(this.scheme.length+3);return this.url;}};String.prototype.asParsedURL=function(){const parsedURL=new Common.ParsedURL(this.toString());if(parsedURL.isValid)
return parsedURL;return null;};;Common.Progress=function(){};Common.Progress.prototype={setTotalWork(totalWork){},setTitle(title){},setWorked(worked,title){},worked(worked){},done(){},isCanceled(){return false;},};Common.CompositeProgress=class{constructor(parent){this._parent=parent;this._children=[];this._childrenDone=0;this._parent.setTotalWork(1);this._parent.setWorked(0);}
_childDone(){if(++this._childrenDone!==this._children.length)
return;this._parent.done();}
createSubProgress(weight){const child=new Common.SubProgress(this,weight);this._children.push(child);return child;}
_update(){let totalWeights=0;let done=0;for(let i=0;i<this._children.length;++i){const child=this._children[i];if(child._totalWork)
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
static fromMimeType(mimeType){if(mimeType.startsWith('text/html'))
return Common.resourceTypes.Document;if(mimeType.startsWith('text/css'))
return Common.resourceTypes.Stylesheet;if(mimeType.startsWith('image/'))
return Common.resourceTypes.Image;if(mimeType.startsWith('text/'))
return Common.resourceTypes.Script;if(mimeType.includes('font'))
return Common.resourceTypes.Font;if(mimeType.includes('script'))
return Common.resourceTypes.Script;if(mimeType.includes('octet'))
return Common.resourceTypes.Other;if(mimeType.includes('application'))
return Common.resourceTypes.Script;return Common.resourceTypes.Other;}
static fromURL(url){return Common.ResourceType._resourceTypeByExtension.get(Common.ParsedURL.extractExtension(url))||null;}
static mimeFromURL(url){const name=Common.ParsedURL.extractName(url);if(Common.ResourceType._mimeTypeByName.has(name))
return Common.ResourceType._mimeTypeByName.get(name);const ext=Common.ParsedURL.extractExtension(url).toLowerCase();return Common.ResourceType._mimeTypeByExtension.get(ext);}
static mimeFromExtension(ext){return Common.ResourceType._mimeTypeByExtension.get(ext);}
name(){return this._name;}
title(){return this._title;}
category(){return this._category;}
isTextType(){return this._isTextType;}
isScript(){return this._name==='script'||this._name==='sm-script';}
hasScripts(){return this.isScript()||this.isDocument();}
isStyleSheet(){return this._name==='stylesheet'||this._name==='sm-stylesheet';}
isDocument(){return this._name==='document';}
isDocumentOrScriptOrStyleSheet(){return this.isDocument()||this.isScript()||this.isStyleSheet();}
isFromSourceMap(){return this._name.startsWith('sm-');}
toString(){return this._name;}
canonicalMimeType(){if(this.isDocument())
return'text/html';if(this.isScript())
return'text/javascript';if(this.isStyleSheet())
return'text/css';return'';}};Common.ResourceCategory=class{constructor(title,shortTitle){this.title=title;this.shortTitle=shortTitle;}};Common.resourceCategories={XHR:new Common.ResourceCategory('XHR and Fetch','XHR'),Script:new Common.ResourceCategory('Scripts','JS'),Stylesheet:new Common.ResourceCategory('Stylesheets','CSS'),Image:new Common.ResourceCategory('Images','Img'),Media:new Common.ResourceCategory('Media','Media'),Font:new Common.ResourceCategory('Fonts','Font'),Document:new Common.ResourceCategory('Documents','Doc'),WebSocket:new Common.ResourceCategory('WebSockets','WS'),Manifest:new Common.ResourceCategory('Manifest','Manifest'),Other:new Common.ResourceCategory('Other','Other')};Common.resourceTypes={XHR:new Common.ResourceType('xhr','XHR',Common.resourceCategories.XHR,true),Fetch:new Common.ResourceType('fetch','Fetch',Common.resourceCategories.XHR,true),EventSource:new Common.ResourceType('eventsource','EventSource',Common.resourceCategories.XHR,true),Script:new Common.ResourceType('script','Script',Common.resourceCategories.Script,true),Stylesheet:new Common.ResourceType('stylesheet','Stylesheet',Common.resourceCategories.Stylesheet,true),Image:new Common.ResourceType('image','Image',Common.resourceCategories.Image,false),Media:new Common.ResourceType('media','Media',Common.resourceCategories.Media,false),Font:new Common.ResourceType('font','Font',Common.resourceCategories.Font,false),Document:new Common.ResourceType('document','Document',Common.resourceCategories.Document,true),TextTrack:new Common.ResourceType('texttrack','TextTrack',Common.resourceCategories.Other,true),WebSocket:new Common.ResourceType('websocket','WebSocket',Common.resourceCategories.WebSocket,false),Other:new Common.ResourceType('other','Other',Common.resourceCategories.Other,false),SourceMapScript:new Common.ResourceType('sm-script','Script',Common.resourceCategories.Script,true),SourceMapStyleSheet:new Common.ResourceType('sm-stylesheet','Stylesheet',Common.resourceCategories.Stylesheet,true),Manifest:new Common.ResourceType('manifest','Manifest',Common.resourceCategories.Manifest,true),SignedExchange:new Common.ResourceType('signed-exchange','SignedExchange',Common.resourceCategories.Other,false),};Common.ResourceType._mimeTypeByName=new Map([['Cakefile','text/x-coffeescript']]);Common.ResourceType._resourceTypeByExtension=new Map([['js',Common.resourceTypes.Script],['mjs',Common.resourceTypes.Script],['css',Common.resourceTypes.Stylesheet],['xsl',Common.resourceTypes.Stylesheet],['jpeg',Common.resourceTypes.Image],['jpg',Common.resourceTypes.Image],['svg',Common.resourceTypes.Image],['gif',Common.resourceTypes.Image],['png',Common.resourceTypes.Image],['ico',Common.resourceTypes.Image],['tiff',Common.resourceTypes.Image],['tif',Common.resourceTypes.Image],['bmp',Common.resourceTypes.Image],['webp',Common.resourceTypes.Media],['ttf',Common.resourceTypes.Font],['otf',Common.resourceTypes.Font],['ttc',Common.resourceTypes.Font],['woff',Common.resourceTypes.Font]]);Common.ResourceType._mimeTypeByExtension=new Map([['js','text/javascript'],['mjs','text/javascript'],['css','text/css'],['html','text/html'],['htm','text/html'],['xml','application/xml'],['xsl','application/xml'],['asp','application/x-aspx'],['aspx','application/x-aspx'],['jsp','application/x-jsp'],['c','text/x-c++src'],['cc','text/x-c++src'],['cpp','text/x-c++src'],['h','text/x-c++src'],['m','text/x-c++src'],['mm','text/x-c++src'],['coffee','text/x-coffeescript'],['dart','text/javascript'],['ts','text/typescript'],['tsx','text/typescript-jsx'],['json','application/json'],['gyp','application/json'],['gypi','application/json'],['cs','text/x-csharp'],['java','text/x-java'],['less','text/x-less'],['php','text/x-php'],['phtml','application/x-httpd-php'],['py','text/x-python'],['sh','text/x-sh'],['scss','text/x-scss'],['vtt','text/vtt'],['ls','text/x-livescript'],['md','text/markdown'],['cljs','text/x-clojure'],['cljc','text/x-clojure'],['cljx','text/x-clojure'],['styl','text/x-styl'],['jsx','text/jsx'],['jpeg','image/jpeg'],['jpg','image/jpeg'],['svg','image/svg+xml'],['gif','image/gif'],['webp','image/webp'],['png','image/png'],['ico','image/ico'],['tiff','image/tiff'],['tif','image/tif'],['bmp','image/bmp'],['ttf','font/opentype'],['otf','font/opentype'],['ttc','font/opentype'],['woff','application/font-woff']]);;Common.Settings=class{constructor(globalStorage,localStorage){this._globalStorage=globalStorage;this._localStorage=localStorage;this._sessionStorage=new Common.SettingsStorage({});this._eventSupport=new Common.Object();this._registry=new Map();this._moduleSettings=new Map();self.runtime.extensions('setting').forEach(this._registerModuleSetting.bind(this));}
_registerModuleSetting(extension){const descriptor=extension.descriptor();const settingName=descriptor['settingName'];const isRegex=descriptor['settingType']==='regex';const defaultValue=descriptor['defaultValue'];let storageType;switch(descriptor['storageType']){case('local'):storageType=Common.SettingStorageType.Local;break;case('session'):storageType=Common.SettingStorageType.Session;break;case('global'):storageType=Common.SettingStorageType.Global;break;default:storageType=Common.SettingStorageType.Global;}
const setting=isRegex?this.createRegExpSetting(settingName,defaultValue,undefined,storageType):this.createSetting(settingName,defaultValue,storageType);if(descriptor['title'])
setting.setTitle(descriptor['title']);if(descriptor['userActionCondition'])
setting.setRequiresUserAction(!!Runtime.queryParam(descriptor['userActionCondition']));setting._extension=extension;this._moduleSettings.set(settingName,setting);}
moduleSetting(settingName){const setting=this._moduleSettings.get(settingName);if(!setting)
throw new Error('No setting registered: '+settingName);return setting;}
settingForTest(settingName){const setting=this._registry.get(settingName);if(!setting)
throw new Error('No setting registered: '+settingName);return setting;}
createSetting(key,defaultValue,storageType){const storage=this._storageFromType(storageType);if(!this._registry.get(key))
this._registry.set(key,new Common.Setting(this,key,defaultValue,this._eventSupport,storage));return(this._registry.get(key));}
createLocalSetting(key,defaultValue){return this.createSetting(key,defaultValue,Common.SettingStorageType.Local);}
createRegExpSetting(key,defaultValue,regexFlags,storageType){if(!this._registry.get(key)){this._registry.set(key,new Common.RegExpSetting(this,key,defaultValue,this._eventSupport,this._storageFromType(storageType),regexFlags));}
return(this._registry.get(key));}
clearAll(){this._globalStorage.removeAll();this._localStorage.removeAll();const versionSetting=Common.settings.createSetting(Common.VersionController._currentVersionName,0);versionSetting.set(Common.VersionController.currentVersion);}
_storageFromType(storageType){switch(storageType){case(Common.SettingStorageType.Local):return this._localStorage;case(Common.SettingStorageType.Session):return this._sessionStorage;case(Common.SettingStorageType.Global):return this._globalStorage;}
return this._globalStorage;}};Common.SettingsStorage=class{constructor(object,setCallback,removeCallback,removeAllCallback,storagePrefix){this._object=object;this._setCallback=setCallback||function(){};this._removeCallback=removeCallback||function(){};this._removeAllCallback=removeAllCallback||function(){};this._storagePrefix=storagePrefix||'';}
set(name,value){name=this._storagePrefix+name;this._object[name]=value;this._setCallback(name,value);}
has(name){name=this._storagePrefix+name;return name in this._object;}
get(name){name=this._storagePrefix+name;return this._object[name];}
remove(name){name=this._storagePrefix+name;delete this._object[name];this._removeCallback(name);}
removeAll(){this._object={};this._removeAllCallback();}
_dumpSizes(){Common.console.log('Ten largest settings: ');const sizes={__proto__:null};for(const key in this._object)
sizes[key]=this._object[key].length;const keys=Object.keys(sizes);function comparator(key1,key2){return sizes[key2]-sizes[key1];}
keys.sort(comparator);for(let i=0;i<10&&i<keys.length;++i)
Common.console.log('Setting: \''+keys[i]+'\', size: '+sizes[keys[i]]);}};Common.Setting=class{constructor(settings,name,defaultValue,eventSupport,storage){this._settings=settings;this._name=name;this._defaultValue=defaultValue;this._eventSupport=eventSupport;this._storage=storage;this._title='';this._extension=null;}
addChangeListener(listener,thisObject){this._eventSupport.addEventListener(this._name,listener,thisObject);}
removeChangeListener(listener,thisObject){this._eventSupport.removeEventListener(this._name,listener,thisObject);}
get name(){return this._name;}
title(){return this._title;}
setTitle(title){this._title=title;}
setRequiresUserAction(requiresUserAction){this._requiresUserAction=requiresUserAction;}
get(){if(this._requiresUserAction&&!this._hadUserAction)
return this._defaultValue;if(typeof this._value!=='undefined')
return this._value;this._value=this._defaultValue;if(this._storage.has(this._name)){try{this._value=JSON.parse(this._storage.get(this._name));}catch(e){this._storage.remove(this._name);}}
return this._value;}
set(value){this._hadUserAction=true;this._value=value;try{const settingString=JSON.stringify(value);try{this._storage.set(this._name,settingString);}catch(e){this._printSettingsSavingError(e.message,this._name,settingString);}}catch(e){Common.console.error('Cannot stringify setting with name: '+this._name+', error: '+e.message);}
this._eventSupport.dispatchEventToListeners(this._name,value);}
remove(){this._settings._registry.delete(this._name);this._settings._moduleSettings.delete(this._name);this._storage.remove(this._name);}
extension(){return this._extension;}
_printSettingsSavingError(message,name,value){const errorMessage='Error saving setting with name: '+this._name+', value length: '+value.length+'. Error: '+message;console.error(errorMessage);Common.console.error(errorMessage);this._storage._dumpSizes();}};Common.RegExpSetting=class extends Common.Setting{constructor(settings,name,defaultValue,eventSupport,storage,regexFlags){super(settings,name,defaultValue?[{pattern:defaultValue}]:[],eventSupport,storage);this._regexFlags=regexFlags;}
get(){const result=[];const items=this.getAsArray();for(let i=0;i<items.length;++i){const item=items[i];if(item.pattern&&!item.disabled)
result.push(item.pattern);}
return result.join('|');}
getAsArray(){return super.get();}
set(value){this.setAsArray([{pattern:value}]);}
setAsArray(value){delete this._regex;super.set(value);}
asRegExp(){if(typeof this._regex!=='undefined')
return this._regex;this._regex=null;try{const pattern=this.get();if(pattern)
this._regex=new RegExp(pattern,this._regexFlags||'');}catch(e){}
return this._regex;}};Common.VersionController=class{updateVersion(){const localStorageVersion=window.localStorage?window.localStorage[Common.VersionController._currentVersionName]:0;const versionSetting=Common.settings.createSetting(Common.VersionController._currentVersionName,0);const currentVersion=Common.VersionController.currentVersion;const oldVersion=versionSetting.get()||parseInt(localStorageVersion||'0',10);if(oldVersion===0){versionSetting.set(currentVersion);return;}
const methodsToRun=this._methodsToRunToUpdateVersion(oldVersion,currentVersion);for(let i=0;i<methodsToRun.length;++i)
this[methodsToRun[i]].call(this);versionSetting.set(currentVersion);}
_methodsToRunToUpdateVersion(oldVersion,currentVersion){const result=[];for(let i=oldVersion;i<currentVersion;++i)
result.push('_updateVersionFrom'+i+'To'+(i+1));return result;}
_updateVersionFrom0To1(){this._clearBreakpointsWhenTooMany(Common.settings.createLocalSetting('breakpoints',[]),500000);}
_updateVersionFrom1To2(){Common.settings.createSetting('previouslyViewedFiles',[]).set([]);}
_updateVersionFrom2To3(){Common.settings.createSetting('fileSystemMapping',{}).set({});Common.settings.createSetting('fileMappingEntries',[]).remove();}
_updateVersionFrom3To4(){const advancedMode=Common.settings.createSetting('showHeaSnapshotObjectsHiddenProperties',false);Common.moduleSetting('showAdvancedHeapSnapshotProperties').set(advancedMode.get());advancedMode.remove();}
_updateVersionFrom4To5(){const settingNames={'FileSystemViewSidebarWidth':'fileSystemViewSplitViewState','elementsSidebarWidth':'elementsPanelSplitViewState','StylesPaneSplitRatio':'stylesPaneSplitViewState','heapSnapshotRetainersViewSize':'heapSnapshotSplitViewState','InspectorView.splitView':'InspectorView.splitViewState','InspectorView.screencastSplitView':'InspectorView.screencastSplitViewState','Inspector.drawerSplitView':'Inspector.drawerSplitViewState','layerDetailsSplitView':'layerDetailsSplitViewState','networkSidebarWidth':'networkPanelSplitViewState','sourcesSidebarWidth':'sourcesPanelSplitViewState','scriptsPanelNavigatorSidebarWidth':'sourcesPanelNavigatorSplitViewState','sourcesPanelSplitSidebarRatio':'sourcesPanelDebuggerSidebarSplitViewState','timeline-details':'timelinePanelDetailsSplitViewState','timeline-split':'timelinePanelRecorsSplitViewState','timeline-view':'timelinePanelTimelineStackSplitViewState','auditsSidebarWidth':'auditsPanelSplitViewState','layersSidebarWidth':'layersPanelSplitViewState','profilesSidebarWidth':'profilesPanelSplitViewState','resourcesSidebarWidth':'resourcesPanelSplitViewState'};const empty={};for(const oldName in settingNames){const newName=settingNames[oldName];const oldNameH=oldName+'H';let newValue=null;const oldSetting=Common.settings.createSetting(oldName,empty);if(oldSetting.get()!==empty){newValue=newValue||{};newValue.vertical={};newValue.vertical.size=oldSetting.get();oldSetting.remove();}
const oldSettingH=Common.settings.createSetting(oldNameH,empty);if(oldSettingH.get()!==empty){newValue=newValue||{};newValue.horizontal={};newValue.horizontal.size=oldSettingH.get();oldSettingH.remove();}
if(newValue)
Common.settings.createSetting(newName,{}).set(newValue);}}
_updateVersionFrom5To6(){const settingNames={'debuggerSidebarHidden':'sourcesPanelSplitViewState','navigatorHidden':'sourcesPanelNavigatorSplitViewState','WebInspector.Drawer.showOnLoad':'Inspector.drawerSplitViewState'};for(const oldName in settingNames){const oldSetting=Common.settings.createSetting(oldName,null);if(oldSetting.get()===null){oldSetting.remove();continue;}
const newName=settingNames[oldName];const invert=oldName==='WebInspector.Drawer.showOnLoad';const hidden=oldSetting.get()!==invert;oldSetting.remove();const showMode=hidden?'OnlyMain':'Both';const newSetting=Common.settings.createSetting(newName,{});const newValue=newSetting.get()||{};newValue.vertical=newValue.vertical||{};newValue.vertical.showMode=showMode;newValue.horizontal=newValue.horizontal||{};newValue.horizontal.showMode=showMode;newSetting.set(newValue);}}
_updateVersionFrom6To7(){const settingNames={'sourcesPanelNavigatorSplitViewState':'sourcesPanelNavigatorSplitViewState','elementsPanelSplitViewState':'elementsPanelSplitViewState','stylesPaneSplitViewState':'stylesPaneSplitViewState','sourcesPanelDebuggerSidebarSplitViewState':'sourcesPanelDebuggerSidebarSplitViewState'};const empty={};for(const name in settingNames){const setting=Common.settings.createSetting(name,empty);const value=setting.get();if(value===empty)
continue;if(value.vertical&&value.vertical.size&&value.vertical.size<1)
value.vertical.size=0;if(value.horizontal&&value.horizontal.size&&value.horizontal.size<1)
value.horizontal.size=0;setting.set(value);}}
_updateVersionFrom7To8(){}
_updateVersionFrom8To9(){const settingNames=['skipStackFramesPattern','workspaceFolderExcludePattern'];for(let i=0;i<settingNames.length;++i){const setting=Common.settings.createSetting(settingNames[i],'');let value=setting.get();if(!value)
return;if(typeof value==='string')
value=[value];for(let j=0;j<value.length;++j){if(typeof value[j]==='string')
value[j]={pattern:value[j]};}
setting.set(value);}}
_updateVersionFrom9To10(){if(!window.localStorage)
return;for(const key in window.localStorage){if(key.startsWith('revision-history'))
window.localStorage.removeItem(key);}}
_updateVersionFrom10To11(){const oldSettingName='customDevicePresets';const newSettingName='customEmulatedDeviceList';const oldSetting=Common.settings.createSetting(oldSettingName,undefined);const list=oldSetting.get();if(!Array.isArray(list))
return;const newList=[];for(let i=0;i<list.length;++i){const value=list[i];const device={};device['title']=value['title'];device['type']='unknown';device['user-agent']=value['userAgent'];device['capabilities']=[];if(value['touch'])
device['capabilities'].push('touch');if(value['mobile'])
device['capabilities'].push('mobile');device['screen']={};device['screen']['vertical']={width:value['width'],height:value['height']};device['screen']['horizontal']={width:value['height'],height:value['width']};device['screen']['device-pixel-ratio']=value['deviceScaleFactor'];device['modes']=[];device['show-by-default']=true;device['show']='Default';newList.push(device);}
if(newList.length)
Common.settings.createSetting(newSettingName,[]).set(newList);oldSetting.remove();}
_updateVersionFrom11To12(){this._migrateSettingsFromLocalStorage();}
_updateVersionFrom12To13(){this._migrateSettingsFromLocalStorage();Common.settings.createSetting('timelineOverviewMode','').remove();}
_updateVersionFrom13To14(){const defaultValue={'throughput':-1,'latency':0};Common.settings.createSetting('networkConditions',defaultValue).set(defaultValue);}
_updateVersionFrom14To15(){const setting=Common.settings.createLocalSetting('workspaceExcludedFolders',{});const oldValue=setting.get();const newValue={};for(const fileSystemPath in oldValue){newValue[fileSystemPath]=[];for(const entry of oldValue[fileSystemPath])
newValue[fileSystemPath].push(entry.path);}
setting.set(newValue);}
_updateVersionFrom15To16(){const setting=Common.settings.createSetting('InspectorView.panelOrder',{});const tabOrders=setting.get();for(const key of Object.keys(tabOrders))
tabOrders[key]=(tabOrders[key]+1)*10;setting.set(tabOrders);}
_updateVersionFrom16To17(){const setting=Common.settings.createSetting('networkConditionsCustomProfiles',[]);const oldValue=setting.get();const newValue=[];if(Array.isArray(oldValue)){for(const preset of oldValue){if(typeof preset.title==='string'&&typeof preset.value==='object'&&typeof preset.value.throughput==='number'&&typeof preset.value.latency==='number'){newValue.push({title:preset.title,value:{download:preset.value.throughput,upload:preset.value.throughput,latency:preset.value.latency}});}}}
setting.set(newValue);}
_updateVersionFrom17To18(){const setting=Common.settings.createLocalSetting('workspaceExcludedFolders',{});const oldValue=setting.get();const newValue={};for(const oldKey in oldValue){let newKey=oldKey.replace(/\\/g,'/');if(!newKey.startsWith('file://')){if(newKey.startsWith('/'))
newKey='file://'+newKey;else
newKey='file:///'+newKey;}
newValue[newKey]=oldValue[oldKey];}
setting.set(newValue);}
_updateVersionFrom18To19(){const defaultColumns={status:true,type:true,initiator:true,size:true,time:true};const visibleColumnSettings=Common.settings.createSetting('networkLogColumnsVisibility',defaultColumns);const visibleColumns=visibleColumnSettings.get();visibleColumns.name=true;visibleColumns.timeline=true;const configs={};for(const columnId in visibleColumns){if(!visibleColumns.hasOwnProperty(columnId))
continue;configs[columnId.toLowerCase()]={visible:visibleColumns[columnId]};}
const newSetting=Common.settings.createSetting('networkLogColumns',{});newSetting.set(configs);visibleColumnSettings.remove();}
_updateVersionFrom19To20(){const oldSetting=Common.settings.createSetting('InspectorView.panelOrder',{});const newSetting=Common.settings.createSetting('panel-tabOrder',{});newSetting.set(oldSetting.get());oldSetting.remove();}
_updateVersionFrom20To21(){const networkColumns=Common.settings.createSetting('networkLogColumns',{});const columns=(networkColumns.get());delete columns['timeline'];delete columns['waterfall'];networkColumns.set(columns);}
_updateVersionFrom21To22(){const breakpointsSetting=Common.settings.createLocalSetting('breakpoints',[]);const breakpoints=breakpointsSetting.get();for(const breakpoint of breakpoints){breakpoint['url']=breakpoint['sourceFileId'];delete breakpoint['sourceFileId'];}
breakpointsSetting.set(breakpoints);}
_updateVersionFrom22To23(){}
_updateVersionFrom23To24(){const oldSetting=Common.settings.createSetting('searchInContentScripts',false);const newSetting=Common.settings.createSetting('searchInAnonymousAndContentScripts',false);newSetting.set(oldSetting.get());oldSetting.remove();}
_updateVersionFrom24To25(){const defaultColumns={status:true,type:true,initiator:true,size:true,time:true};const networkLogColumnsSetting=Common.settings.createSetting('networkLogColumns',defaultColumns);const columns=networkLogColumnsSetting.get();delete columns.product;networkLogColumnsSetting.set(columns);}
_updateVersionFrom25To26(){const oldSetting=Common.settings.createSetting('messageURLFilters',{});const urls=Object.keys(oldSetting.get());const textFilter=urls.map(url=>`-url:${url}`).join(' ');if(textFilter){const textFilterSetting=Common.settings.createSetting('console.textFilter','');const suffix=textFilterSetting.get()?` ${textFilterSetting.get()}`:'';textFilterSetting.set(`${textFilter}${suffix}`);}
oldSetting.remove();}
_migrateSettingsFromLocalStorage(){const localSettings=new Set(['advancedSearchConfig','breakpoints','consoleHistory','domBreakpoints','eventListenerBreakpoints','fileSystemMapping','lastSelectedSourcesSidebarPaneTab','previouslyViewedFiles','savedURLs','watchExpressions','workspaceExcludedFolders','xhrBreakpoints']);if(!window.localStorage)
return;for(const key in window.localStorage){if(localSettings.has(key))
continue;const value=window.localStorage[key];window.localStorage.removeItem(key);Common.settings._globalStorage[key]=value;}}
_clearBreakpointsWhenTooMany(breakpointsSetting,maxBreakpointsCount){if(breakpointsSetting.get().length>maxBreakpointsCount)
breakpointsSetting.set([]);}};Common.VersionController._currentVersionName='inspectorVersion';Common.VersionController.currentVersion=26;Common.settings;Common.SettingStorageType={Global:Symbol('Global'),Local:Symbol('Local'),Session:Symbol('Session')};Common.moduleSetting=function(settingName){return Common.settings.moduleSetting(settingName);};Common.settingForTest=function(settingName){return Common.settings.settingForTest(settingName);};;Common.StaticContentProvider=class{constructor(contentURL,contentType,lazyContent){this._contentURL=contentURL;this._contentType=contentType;this._lazyContent=lazyContent;}
static fromString(contentURL,contentType,content){const lazyContent=()=>Promise.resolve(content);return new Common.StaticContentProvider(contentURL,contentType,lazyContent);}
contentURL(){return this._contentURL;}
contentType(){return this._contentType;}
contentEncoded(){return Promise.resolve(false);}
requestContent(){return this._lazyContent();}
async searchInContent(query,caseSensitive,isRegex){const content=await this._lazyContent();return content?Common.ContentProvider.performSearchInContent(content,query,caseSensitive,isRegex):[];}};;Common.OutputStream=function(){};Common.OutputStream.prototype={write(data){},close(){}};Common.StringOutputStream=class{constructor(){this._data='';}
async write(chunk){this._data+=chunk;}
close(){}
data(){return this._data;}};;Common.Segment=class{constructor(begin,end,data){if(begin>end)
console.assert(false,'Invalid segment');this.begin=begin;this.end=end;this.data=data;}
intersects(that){return this.begin<that.end&&that.begin<this.end;}};Common.SegmentedRange=class{constructor(mergeCallback){this._segments=[];this._mergeCallback=mergeCallback;}
append(newSegment){let startIndex=this._segments.lowerBound(newSegment,(a,b)=>a.begin-b.begin);let endIndex=startIndex;let merged=null;if(startIndex>0){const precedingSegment=this._segments[startIndex-1];merged=this._tryMerge(precedingSegment,newSegment);if(merged){--startIndex;newSegment=merged;}else if(this._segments[startIndex-1].end>=newSegment.begin){if(newSegment.end<precedingSegment.end){this._segments.splice(startIndex,0,new Common.Segment(newSegment.end,precedingSegment.end,precedingSegment.data));}
precedingSegment.end=newSegment.begin;}}
while(endIndex<this._segments.length&&this._segments[endIndex].end<=newSegment.end)
++endIndex;if(endIndex<this._segments.length){merged=this._tryMerge(newSegment,this._segments[endIndex]);if(merged){endIndex++;newSegment=merged;}else if(newSegment.intersects(this._segments[endIndex])){this._segments[endIndex].begin=newSegment.end;}}
this._segments.splice(startIndex,endIndex-startIndex,newSegment);}
appendRange(that){that.segments().forEach(segment=>this.append(segment));}
segments(){return this._segments;}
_tryMerge(first,second){const merged=this._mergeCallback&&this._mergeCallback(first,second);if(!merged)
return null;merged.begin=first.begin;merged.end=Math.max(first.end,second.end);return merged;}};;Common.Throttler=class{constructor(timeout){this._timeout=timeout;this._isRunningProcess=false;this._asSoonAsPossible=false;this._process=null;this._lastCompleteTime=0;this._schedulePromise=new Promise(fulfill=>{this._scheduleResolve=fulfill;});}
_processCompleted(){this._lastCompleteTime=this._getTime();this._isRunningProcess=false;if(this._process)
this._innerSchedule(false);this._processCompletedForTests();}
_processCompletedForTests(){}
_onTimeout(){delete this._processTimeout;this._asSoonAsPossible=false;this._isRunningProcess=true;Promise.resolve().then(this._process).catch(console.error.bind(console)).then(this._processCompleted.bind(this)).then(this._scheduleResolve);this._schedulePromise=new Promise(fulfill=>{this._scheduleResolve=fulfill;});this._process=null;}
schedule(process,asSoonAsPossible){this._process=process;const hasScheduledTasks=!!this._processTimeout||this._isRunningProcess;const okToFire=this._getTime()-this._lastCompleteTime>this._timeout;asSoonAsPossible=!!asSoonAsPossible||(!hasScheduledTasks&&okToFire);const forceTimerUpdate=asSoonAsPossible&&!this._asSoonAsPossible;this._asSoonAsPossible=this._asSoonAsPossible||asSoonAsPossible;this._innerSchedule(forceTimerUpdate);return this._schedulePromise;}
_innerSchedule(forceTimerUpdate){if(this._isRunningProcess)
return;if(this._processTimeout&&!forceTimerUpdate)
return;if(this._processTimeout)
this._clearTimeout(this._processTimeout);const timeout=this._asSoonAsPossible?0:this._timeout;this._processTimeout=this._setTimeout(this._onTimeout.bind(this),timeout);}
_clearTimeout(timeoutId){clearTimeout(timeoutId);}
_setTimeout(operation,timeout){return setTimeout(operation,timeout);}
_getTime(){return window.performance.now();}};Common.Throttler.FinishCallback;;Common.Trie=class{constructor(){this.clear();}
add(word){let node=this._root;++this._wordsInSubtree[this._root];for(let i=0;i<word.length;++i){const edge=word[i];let next=this._edges[node][edge];if(!next){if(this._freeNodes.length){next=this._freeNodes.pop();}else{next=this._size++;this._isWord.push(false);this._wordsInSubtree.push(0);this._edges.push({__proto__:null});}
this._edges[node][edge]=next;}
++this._wordsInSubtree[next];node=next;}
this._isWord[node]=true;}
remove(word){if(!this.has(word))
return false;let node=this._root;--this._wordsInSubtree[this._root];for(let i=0;i<word.length;++i){const edge=word[i];const next=this._edges[node][edge];if(!--this._wordsInSubtree[next]){delete this._edges[node][edge];this._freeNodes.push(next);}
node=next;}
this._isWord[node]=false;return true;}
has(word){let node=this._root;for(let i=0;i<word.length;++i){node=this._edges[node][word[i]];if(!node)
return false;}
return this._isWord[node];}
words(prefix){prefix=prefix||'';let node=this._root;for(let i=0;i<prefix.length;++i){node=this._edges[node][prefix[i]];if(!node)
return[];}
const results=[];this._dfs(node,prefix,results);return results;}
_dfs(node,prefix,results){if(this._isWord[node])
results.push(prefix);const edges=this._edges[node];for(const edge in edges)
this._dfs(edges[edge],prefix+edge,results);}
longestPrefix(word,fullWordOnly){let node=this._root;let wordIndex=0;for(let i=0;i<word.length;++i){node=this._edges[node][word[i]];if(!node)
break;if(!fullWordOnly||this._isWord[node])
wordIndex=i+1;}
return word.substring(0,wordIndex);}
clear(){this._size=1;this._root=0;this._edges=[{__proto__:null}];this._isWord=[false];this._wordsInSubtree=[0];this._freeNodes=[];}};;self['Common']=self['Common']||{};Common.UIString=function(string,vararg){return String.vsprintf(Common.localize(string),Array.prototype.slice.call(arguments,1));};Common.localize=function(string){return string;};Common.UIStringFormat=class{constructor(format){this._localizedFormat=Common.localize(format);this._tokenizedFormat=String.tokenizeFormatString(this._localizedFormat,String.standardFormatters);}
static _append(a,b){return a+b;}
format(vararg){return String.format(this._localizedFormat,arguments,String.standardFormatters,'',Common.UIStringFormat._append,this._tokenizedFormat).formattedResult;}};self.ls=function(strings,vararg){if(typeof strings==='string')
return strings;const values=Array.prototype.slice.call(arguments,1);if(!values.length)
return strings[0];let result='';for(let i=0;i<values.length;i++){result+=strings[i];result+=''+values[i];}
return result+strings[values.length];};;Common.Revealer=function(){};Common.Revealer.reveal=function(revealable,omitFocus){if(!revealable)
return Promise.reject(new Error('Can\'t reveal '+revealable));return self.runtime.allInstances(Common.Revealer,revealable).then(reveal);function reveal(revealers){const promises=[];for(let i=0;i<revealers.length;++i)
promises.push(revealers[i].reveal((revealable),omitFocus));return Promise.race(promises);}};Common.Revealer.revealDestination=function(revealable){const extension=self.runtime.extension(Common.Revealer,revealable);if(!extension)
return null;return extension.descriptor()['destination'];};Common.Revealer.prototype={reveal(object,omitFocus){}};Common.App=function(){};Common.App.prototype={presentUI(document){}};Common.AppProvider=function(){};Common.AppProvider.prototype={createApp(){}};Common.QueryParamHandler=function(){};Common.QueryParamHandler.prototype={handleQueryParam(value){}};Common.Runnable=function(){};Common.Runnable.prototype={run(){}};Common.Linkifier=function(){};Common.Linkifier.prototype={linkify(object,options){}};Common.Linkifier.linkify=function(object,options){if(!object)
return Promise.reject(new Error('Can\'t linkify '+object));return self.runtime.extension(Common.Linkifier,object).instance().then(linkifier=>linkifier.linkify(object,options));};Common.Linkifier.Options;Common.JavaScriptMetadata=function(){};Common.JavaScriptMetadata.prototype={signaturesForNativeFunction(name){},signaturesForInstanceMethod(name,receiverClassName){},signaturesForStaticMethod(name,receiverConstructorName){}};;Common.CharacterIdMap=class{constructor(){this._elementToCharacter=new Map();this._characterToElement=new Map();this._charCode=33;}
toChar(object){let character=this._elementToCharacter.get(object);if(!character){if(this._charCode>=0xFFFF)
throw new Error('CharacterIdMap ran out of capacity!');character=String.fromCharCode(this._charCode++);this._elementToCharacter.set(object,character);this._characterToElement.set(character,object);}
return character;}
fromChar(character){const object=this._characterToElement.get(character);if(object===undefined)
return null;return object;}};;self['HeapSnapshotWorker']=self['HeapSnapshotWorker']||{};HeapSnapshotWorker.AllocationProfile=class{constructor(profile,liveObjectStats){this._strings=profile.strings;this._liveObjectStats=liveObjectStats;this._nextNodeId=1;this._functionInfos=[];this._idToNode={};this._idToTopDownNode={};this._collapsedTopNodeIdToFunctionInfo={};this._traceTops=null;this._buildFunctionAllocationInfos(profile);this._traceTree=this._buildAllocationTree(profile,liveObjectStats);}
_buildFunctionAllocationInfos(profile){const strings=this._strings;const functionInfoFields=profile.snapshot.meta.trace_function_info_fields;const functionNameOffset=functionInfoFields.indexOf('name');const scriptNameOffset=functionInfoFields.indexOf('script_name');const scriptIdOffset=functionInfoFields.indexOf('script_id');const lineOffset=functionInfoFields.indexOf('line');const columnOffset=functionInfoFields.indexOf('column');const functionInfoFieldCount=functionInfoFields.length;const rawInfos=profile.trace_function_infos;const infoLength=rawInfos.length;const functionInfos=this._functionInfos=new Array(infoLength/functionInfoFieldCount);let index=0;for(let i=0;i<infoLength;i+=functionInfoFieldCount){functionInfos[index++]=new HeapSnapshotWorker.FunctionAllocationInfo(strings[rawInfos[i+functionNameOffset]],strings[rawInfos[i+scriptNameOffset]],rawInfos[i+scriptIdOffset],rawInfos[i+lineOffset],rawInfos[i+columnOffset]);}}
_buildAllocationTree(profile,liveObjectStats){const traceTreeRaw=profile.trace_tree;const functionInfos=this._functionInfos;const idToTopDownNode=this._idToTopDownNode;const traceNodeFields=profile.snapshot.meta.trace_node_fields;const nodeIdOffset=traceNodeFields.indexOf('id');const functionInfoIndexOffset=traceNodeFields.indexOf('function_info_index');const allocationCountOffset=traceNodeFields.indexOf('count');const allocationSizeOffset=traceNodeFields.indexOf('size');const childrenOffset=traceNodeFields.indexOf('children');const nodeFieldCount=traceNodeFields.length;function traverseNode(rawNodeArray,nodeOffset,parent){const functionInfo=functionInfos[rawNodeArray[nodeOffset+functionInfoIndexOffset]];const id=rawNodeArray[nodeOffset+nodeIdOffset];const stats=liveObjectStats[id];const liveCount=stats?stats.count:0;const liveSize=stats?stats.size:0;const result=new HeapSnapshotWorker.TopDownAllocationNode(id,functionInfo,rawNodeArray[nodeOffset+allocationCountOffset],rawNodeArray[nodeOffset+allocationSizeOffset],liveCount,liveSize,parent);idToTopDownNode[id]=result;functionInfo.addTraceTopNode(result);const rawChildren=rawNodeArray[nodeOffset+childrenOffset];for(let i=0;i<rawChildren.length;i+=nodeFieldCount)
result.children.push(traverseNode(rawChildren,i,result));return result;}
return traverseNode(traceTreeRaw,0,null);}
serializeTraceTops(){if(this._traceTops)
return this._traceTops;const result=this._traceTops=[];const functionInfos=this._functionInfos;for(let i=0;i<functionInfos.length;i++){const info=functionInfos[i];if(info.totalCount===0)
continue;const nodeId=this._nextNodeId++;const isRoot=i===0;result.push(this._serializeNode(nodeId,info,info.totalCount,info.totalSize,info.totalLiveCount,info.totalLiveSize,!isRoot));this._collapsedTopNodeIdToFunctionInfo[nodeId]=info;}
result.sort(function(a,b){return b.size-a.size;});return result;}
serializeCallers(nodeId){let node=this._ensureBottomUpNode(nodeId);const nodesWithSingleCaller=[];while(node.callers().length===1){node=node.callers()[0];nodesWithSingleCaller.push(this._serializeCaller(node));}
const branchingCallers=[];const callers=node.callers();for(let i=0;i<callers.length;i++)
branchingCallers.push(this._serializeCaller(callers[i]));return new HeapSnapshotModel.AllocationNodeCallers(nodesWithSingleCaller,branchingCallers);}
serializeAllocationStack(traceNodeId){let node=this._idToTopDownNode[traceNodeId];const result=[];while(node){const functionInfo=node.functionInfo;result.push(new HeapSnapshotModel.AllocationStackFrame(functionInfo.functionName,functionInfo.scriptName,functionInfo.scriptId,functionInfo.line,functionInfo.column));node=node.parent;}
return result;}
traceIds(allocationNodeId){return this._ensureBottomUpNode(allocationNodeId).traceTopIds;}
_ensureBottomUpNode(nodeId){let node=this._idToNode[nodeId];if(!node){const functionInfo=this._collapsedTopNodeIdToFunctionInfo[nodeId];node=functionInfo.bottomUpRoot();delete this._collapsedTopNodeIdToFunctionInfo[nodeId];this._idToNode[nodeId]=node;}
return node;}
_serializeCaller(node){const callerId=this._nextNodeId++;this._idToNode[callerId]=node;return this._serializeNode(callerId,node.functionInfo,node.allocationCount,node.allocationSize,node.liveCount,node.liveSize,node.hasCallers());}
_serializeNode(nodeId,functionInfo,count,size,liveCount,liveSize,hasChildren){return new HeapSnapshotModel.SerializedAllocationNode(nodeId,functionInfo.functionName,functionInfo.scriptName,functionInfo.scriptId,functionInfo.line,functionInfo.column,count,size,liveCount,liveSize,hasChildren);}};HeapSnapshotWorker.TopDownAllocationNode=class{constructor(id,functionInfo,count,size,liveCount,liveSize,parent){this.id=id;this.functionInfo=functionInfo;this.allocationCount=count;this.allocationSize=size;this.liveCount=liveCount;this.liveSize=liveSize;this.parent=parent;this.children=[];}};HeapSnapshotWorker.BottomUpAllocationNode=class{constructor(functionInfo){this.functionInfo=functionInfo;this.allocationCount=0;this.allocationSize=0;this.liveCount=0;this.liveSize=0;this.traceTopIds=[];this._callers=[];}
addCaller(traceNode){const functionInfo=traceNode.functionInfo;let result;for(let i=0;i<this._callers.length;i++){const caller=this._callers[i];if(caller.functionInfo===functionInfo){result=caller;break;}}
if(!result){result=new HeapSnapshotWorker.BottomUpAllocationNode(functionInfo);this._callers.push(result);}
return result;}
callers(){return this._callers;}
hasCallers(){return this._callers.length>0;}};HeapSnapshotWorker.FunctionAllocationInfo=class{constructor(functionName,scriptName,scriptId,line,column){this.functionName=functionName;this.scriptName=scriptName;this.scriptId=scriptId;this.line=line;this.column=column;this.totalCount=0;this.totalSize=0;this.totalLiveCount=0;this.totalLiveSize=0;this._traceTops=[];}
addTraceTopNode(node){if(node.allocationCount===0)
return;this._traceTops.push(node);this.totalCount+=node.allocationCount;this.totalSize+=node.allocationSize;this.totalLiveCount+=node.liveCount;this.totalLiveSize+=node.liveSize;}
bottomUpRoot(){if(!this._traceTops.length)
return null;if(!this._bottomUpTree)
this._buildAllocationTraceTree();return this._bottomUpTree;}
_buildAllocationTraceTree(){this._bottomUpTree=new HeapSnapshotWorker.BottomUpAllocationNode(this);for(let i=0;i<this._traceTops.length;i++){let node=this._traceTops[i];let bottomUpNode=this._bottomUpTree;const count=node.allocationCount;const size=node.allocationSize;const liveCount=node.liveCount;const liveSize=node.liveSize;const traceId=node.id;while(true){bottomUpNode.allocationCount+=count;bottomUpNode.allocationSize+=size;bottomUpNode.liveCount+=liveCount;bottomUpNode.liveSize+=liveSize;bottomUpNode.traceTopIds.push(traceId);node=node.parent;if(node===null)
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
type(){return this._edge().type();}};HeapSnapshotWorker.HeapSnapshotRetainerEdgeIterator=class{constructor(retainedNode){const snapshot=retainedNode._snapshot;const retainedNodeOrdinal=retainedNode.ordinal();const retainerIndex=snapshot._firstRetainerIndex[retainedNodeOrdinal];this._retainersEnd=snapshot._firstRetainerIndex[retainedNodeOrdinal+1];this.retainer=snapshot.createRetainingEdge(retainerIndex);}
hasNext(){return this.retainer.retainerIndex()<this._retainersEnd;}
item(){return this.retainer;}
next(){this.retainer.setRetainerIndex(this.retainer.retainerIndex()+1);}};HeapSnapshotWorker.HeapSnapshotNode=class{constructor(snapshot,nodeIndex){this._snapshot=snapshot;this.nodeIndex=nodeIndex||0;}
distance(){return this._snapshot._nodeDistances[this.nodeIndex/this._snapshot._nodeFieldCount];}
className(){throw new Error('Not implemented');}
classIndex(){throw new Error('Not implemented');}
dominatorIndex(){const nodeFieldCount=this._snapshot._nodeFieldCount;return this._snapshot._dominatorsTree[this.nodeIndex/this._snapshot._nodeFieldCount]*nodeFieldCount;}
edges(){return new HeapSnapshotWorker.HeapSnapshotEdgeIterator(this);}
edgesCount(){return(this.edgeIndexesEnd()-this.edgeIndexesStart())/this._snapshot._edgeFieldsCount;}
id(){throw new Error('Not implemented');}
isRoot(){return this.nodeIndex===this._snapshot._rootNodeIndex;}
name(){return this._snapshot.strings[this._name()];}
retainedSize(){return this._snapshot._retainedSizes[this.ordinal()];}
retainers(){return new HeapSnapshotWorker.HeapSnapshotRetainerEdgeIterator(this);}
retainersCount(){const snapshot=this._snapshot;const ordinal=this.ordinal();return snapshot._firstRetainerIndex[ordinal+1]-snapshot._firstRetainerIndex[ordinal];}
selfSize(){const snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeSelfSizeOffset];}
type(){return this._snapshot._nodeTypes[this.rawType()];}
traceNodeId(){const snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeTraceNodeIdOffset];}
itemIndex(){return this.nodeIndex;}
serialize(){return new HeapSnapshotModel.Node(this.id(),this.name(),this.distance(),this.nodeIndex,this.retainedSize(),this.selfSize(),this.type());}
_name(){const snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeNameOffset];}
edgeIndexesStart(){return this._snapshot._firstEdgeIndexes[this.ordinal()];}
edgeIndexesEnd(){return this._snapshot._firstEdgeIndexes[this.ordinal()+1];}
ordinal(){return this.nodeIndex/this._snapshot._nodeFieldCount;}
_nextNodeIndex(){return this.nodeIndex+this._snapshot._nodeFieldCount;}
rawType(){const snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeTypeOffset];}};HeapSnapshotWorker.HeapSnapshotNodeIterator=class{constructor(node){this.node=node;this._nodesLength=node._snapshot.nodes.length;}
hasNext(){return this.node.nodeIndex<this._nodesLength;}
item(){return this.node;}
next(){this.node.nodeIndex=this.node._nextNodeIndex();}};HeapSnapshotWorker.HeapSnapshotIndexRangeIterator=class{constructor(itemProvider,indexes){this._itemProvider=itemProvider;this._indexes=indexes;this._position=0;}
hasNext(){return this._position<this._indexes.length;}
item(){const index=this._indexes[this._position];return this._itemProvider.itemForIndex(index);}
next(){++this._position;}};HeapSnapshotWorker.HeapSnapshotFilteredIterator=class{constructor(iterator,filter){this._iterator=iterator;this._filter=filter;this._skipFilteredItems();}
hasNext(){return this._iterator.hasNext();}
item(){return this._iterator.item();}
next(){this._iterator.next();this._skipFilteredItems();}
_skipFilteredItems(){while(this._iterator.hasNext()&&!this._filter(this._iterator.item()))
this._iterator.next();}};HeapSnapshotWorker.HeapSnapshotProgress=class{constructor(dispatcher){this._dispatcher=dispatcher;}
updateStatus(status){this._sendUpdateEvent(Common.UIString(status));}
updateProgress(title,value,total){const percentValue=((total?(value/total):0)*100).toFixed(0);this._sendUpdateEvent(Common.UIString(title,percentValue));}
reportProblem(error){if(this._dispatcher)
this._dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot,error);}
_sendUpdateEvent(text){if(this._dispatcher)
this._dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotProgressEvent.Update,text);}};HeapSnapshotWorker.HeapSnapshotProblemReport=class{constructor(title){this._errors=[title];}
addError(error){if(this._errors.length>100)
return;this._errors.push(error);}
toString(){return this._errors.join('\n  ');}};HeapSnapshotWorker.HeapSnapshot=class{constructor(profile,progress){this.nodes=profile.nodes;this.containmentEdges=profile.edges;this._metaNode=profile.snapshot.meta;this._rawSamples=profile.samples;this._samples=null;this.strings=profile.strings;this._locations=profile.locations;this._progress=progress;this._noDistance=-5;this._rootNodeIndex=0;if(profile.snapshot.root_index)
this._rootNodeIndex=profile.snapshot.root_index;this._snapshotDiffs={};this._aggregatesForDiff=null;this._aggregates={};this._aggregatesSortedFlags={};this._profile=profile;}
initialize(){const meta=this._metaNode;this._nodeTypeOffset=meta.node_fields.indexOf('type');this._nodeNameOffset=meta.node_fields.indexOf('name');this._nodeIdOffset=meta.node_fields.indexOf('id');this._nodeSelfSizeOffset=meta.node_fields.indexOf('self_size');this._nodeEdgeCountOffset=meta.node_fields.indexOf('edge_count');this._nodeTraceNodeIdOffset=meta.node_fields.indexOf('trace_node_id');this._nodeFieldCount=meta.node_fields.length;this._nodeTypes=meta.node_types[this._nodeTypeOffset];this._nodeArrayType=this._nodeTypes.indexOf('array');this._nodeHiddenType=this._nodeTypes.indexOf('hidden');this._nodeObjectType=this._nodeTypes.indexOf('object');this._nodeNativeType=this._nodeTypes.indexOf('native');this._nodeConsStringType=this._nodeTypes.indexOf('concatenated string');this._nodeSlicedStringType=this._nodeTypes.indexOf('sliced string');this._nodeCodeType=this._nodeTypes.indexOf('code');this._nodeSyntheticType=this._nodeTypes.indexOf('synthetic');this._edgeFieldsCount=meta.edge_fields.length;this._edgeTypeOffset=meta.edge_fields.indexOf('type');this._edgeNameOffset=meta.edge_fields.indexOf('name_or_index');this._edgeToNodeOffset=meta.edge_fields.indexOf('to_node');this._edgeTypes=meta.edge_types[this._edgeTypeOffset];this._edgeTypes.push('invisible');this._edgeElementType=this._edgeTypes.indexOf('element');this._edgeHiddenType=this._edgeTypes.indexOf('hidden');this._edgeInternalType=this._edgeTypes.indexOf('internal');this._edgeShortcutType=this._edgeTypes.indexOf('shortcut');this._edgeWeakType=this._edgeTypes.indexOf('weak');this._edgeInvisibleType=this._edgeTypes.indexOf('invisible');const location_fields=meta.location_fields||[];this._locationIndexOffset=location_fields.indexOf('object_index');this._locationScriptIdOffset=location_fields.indexOf('script_id');this._locationLineOffset=location_fields.indexOf('line');this._locationColumnOffset=location_fields.indexOf('column');this._locationFieldCount=location_fields.length;this.nodeCount=this.nodes.length/this._nodeFieldCount;this._edgeCount=this.containmentEdges.length/this._edgeFieldsCount;this._retainedSizes=new Float64Array(this.nodeCount);this._firstEdgeIndexes=new Uint32Array(this.nodeCount+1);this._retainingNodes=new Uint32Array(this._edgeCount);this._retainingEdges=new Uint32Array(this._edgeCount);this._firstRetainerIndex=new Uint32Array(this.nodeCount+1);this._nodeDistances=new Int32Array(this.nodeCount);this._firstDominatedNodeIndex=new Uint32Array(this.nodeCount+1);this._dominatedNodes=new Uint32Array(this.nodeCount-1);this._progress.updateStatus('Building edge indexes\u2026');this._buildEdgeIndexes();this._progress.updateStatus('Building retainers\u2026');this._buildRetainers();this._progress.updateStatus('Calculating node flags\u2026');this.calculateFlags();this._progress.updateStatus('Calculating distances\u2026');this.calculateDistances();this._progress.updateStatus('Building postorder index\u2026');const result=this._buildPostOrderIndex();this._progress.updateStatus('Building dominator tree\u2026');this._dominatorsTree=this._buildDominatorTree(result.postOrderIndex2NodeOrdinal,result.nodeOrdinal2PostOrderIndex);this._progress.updateStatus('Calculating retained sizes\u2026');this._calculateRetainedSizes(result.postOrderIndex2NodeOrdinal);this._progress.updateStatus('Building dominated nodes\u2026');this._buildDominatedNodes();this._progress.updateStatus('Calculating statistics\u2026');this.calculateStatistics();this._progress.updateStatus('Calculating samples\u2026');this._buildSamples();this._progress.updateStatus('Building locations\u2026');this._buildLocationMap();this._progress.updateStatus('Finished processing.');if(this._profile.snapshot.trace_function_count){this._progress.updateStatus('Building allocation statistics\u2026');const nodes=this.nodes;const nodesLength=nodes.length;const nodeFieldCount=this._nodeFieldCount;const node=this.rootNode();const liveObjects={};for(let nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){node.nodeIndex=nodeIndex;const traceNodeId=node.traceNodeId();let stats=liveObjects[traceNodeId];if(!stats)
liveObjects[traceNodeId]=stats={count:0,size:0,ids:[]};stats.count++;stats.size+=node.selfSize();stats.ids.push(node.id());}
this._allocationProfile=new HeapSnapshotWorker.AllocationProfile(this._profile,liveObjects);this._progress.updateStatus('Done');}}
_buildEdgeIndexes(){const nodes=this.nodes;const nodeCount=this.nodeCount;const firstEdgeIndexes=this._firstEdgeIndexes;const nodeFieldCount=this._nodeFieldCount;const edgeFieldsCount=this._edgeFieldsCount;const nodeEdgeCountOffset=this._nodeEdgeCountOffset;firstEdgeIndexes[nodeCount]=this.containmentEdges.length;for(let nodeOrdinal=0,edgeIndex=0;nodeOrdinal<nodeCount;++nodeOrdinal){firstEdgeIndexes[nodeOrdinal]=edgeIndex;edgeIndex+=nodes[nodeOrdinal*nodeFieldCount+nodeEdgeCountOffset]*edgeFieldsCount;}}
_buildRetainers(){const retainingNodes=this._retainingNodes;const retainingEdges=this._retainingEdges;const firstRetainerIndex=this._firstRetainerIndex;const containmentEdges=this.containmentEdges;const edgeFieldsCount=this._edgeFieldsCount;const nodeFieldCount=this._nodeFieldCount;const edgeToNodeOffset=this._edgeToNodeOffset;const firstEdgeIndexes=this._firstEdgeIndexes;const nodeCount=this.nodeCount;for(let toNodeFieldIndex=edgeToNodeOffset,l=containmentEdges.length;toNodeFieldIndex<l;toNodeFieldIndex+=edgeFieldsCount){const toNodeIndex=containmentEdges[toNodeFieldIndex];if(toNodeIndex%nodeFieldCount)
throw new Error('Invalid toNodeIndex '+toNodeIndex);++firstRetainerIndex[toNodeIndex/nodeFieldCount];}
for(let i=0,firstUnusedRetainerSlot=0;i<nodeCount;i++){const retainersCount=firstRetainerIndex[i];firstRetainerIndex[i]=firstUnusedRetainerSlot;retainingNodes[firstUnusedRetainerSlot]=retainersCount;firstUnusedRetainerSlot+=retainersCount;}
firstRetainerIndex[nodeCount]=retainingNodes.length;let nextNodeFirstEdgeIndex=firstEdgeIndexes[0];for(let srcNodeOrdinal=0;srcNodeOrdinal<nodeCount;++srcNodeOrdinal){const firstEdgeIndex=nextNodeFirstEdgeIndex;nextNodeFirstEdgeIndex=firstEdgeIndexes[srcNodeOrdinal+1];const srcNodeIndex=srcNodeOrdinal*nodeFieldCount;for(let edgeIndex=firstEdgeIndex;edgeIndex<nextNodeFirstEdgeIndex;edgeIndex+=edgeFieldsCount){const toNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];if(toNodeIndex%nodeFieldCount)
throw new Error('Invalid toNodeIndex '+toNodeIndex);const firstRetainerSlotIndex=firstRetainerIndex[toNodeIndex/nodeFieldCount];const nextUnusedRetainerSlotIndex=firstRetainerSlotIndex+(--retainingNodes[firstRetainerSlotIndex]);retainingNodes[nextUnusedRetainerSlotIndex]=srcNodeIndex;retainingEdges[nextUnusedRetainerSlotIndex]=edgeIndex;}}}
createNode(nodeIndex){throw new Error('Not implemented');}
createEdge(edgeIndex){throw new Error('Not implemented');}
createRetainingEdge(retainerIndex){throw new Error('Not implemented');}
_allNodes(){return new HeapSnapshotWorker.HeapSnapshotNodeIterator(this.rootNode());}
rootNode(){return this.createNode(this._rootNodeIndex);}
get rootNodeIndex(){return this._rootNodeIndex;}
get totalSize(){return this.rootNode().retainedSize();}
_getDominatedIndex(nodeIndex){if(nodeIndex%this._nodeFieldCount)
throw new Error('Invalid nodeIndex: '+nodeIndex);return this._firstDominatedNodeIndex[nodeIndex/this._nodeFieldCount];}
_createFilter(nodeFilter){const minNodeId=nodeFilter.minNodeId;const maxNodeId=nodeFilter.maxNodeId;const allocationNodeId=nodeFilter.allocationNodeId;let filter;if(typeof allocationNodeId==='number'){filter=this._createAllocationStackFilter(allocationNodeId);filter.key='AllocationNodeId: '+allocationNodeId;}else if(typeof minNodeId==='number'&&typeof maxNodeId==='number'){filter=this._createNodeIdFilter(minNodeId,maxNodeId);filter.key='NodeIdRange: '+minNodeId+'..'+maxNodeId;}
return filter;}
search(searchConfig,nodeFilter){const query=searchConfig.query;function filterString(matchedStringIndexes,string,index){if(string.indexOf(query)!==-1)
matchedStringIndexes.add(index);return matchedStringIndexes;}
const regexp=searchConfig.isRegex?new RegExp(query):createPlainTextSearchRegex(query,'i');function filterRegexp(matchedStringIndexes,string,index){if(regexp.test(string))
matchedStringIndexes.add(index);return matchedStringIndexes;}
const stringFilter=(searchConfig.isRegex||!searchConfig.caseSensitive)?filterRegexp:filterString;const stringIndexes=this.strings.reduce(stringFilter,new Set());if(!stringIndexes.size)
return[];const filter=this._createFilter(nodeFilter);const nodeIds=[];const nodesLength=this.nodes.length;const nodes=this.nodes;const nodeNameOffset=this._nodeNameOffset;const nodeIdOffset=this._nodeIdOffset;const nodeFieldCount=this._nodeFieldCount;const node=this.rootNode();for(let nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){node.nodeIndex=nodeIndex;if(filter&&!filter(node))
continue;if(stringIndexes.has(nodes[nodeIndex+nodeNameOffset]))
nodeIds.push(nodes[nodeIndex+nodeIdOffset]);}
return nodeIds;}
aggregatesWithFilter(nodeFilter){const filter=this._createFilter(nodeFilter);const key=filter?filter.key:'allObjects';return this.aggregates(false,key,filter);}
_createNodeIdFilter(minNodeId,maxNodeId){function nodeIdFilter(node){const id=node.id();return id>minNodeId&&id<=maxNodeId;}
return nodeIdFilter;}
_createAllocationStackFilter(bottomUpAllocationNodeId){const traceIds=this._allocationProfile.traceIds(bottomUpAllocationNodeId);if(!traceIds.length)
return undefined;const set={};for(let i=0;i<traceIds.length;i++)
set[traceIds[i]]=true;function traceIdFilter(node){return!!set[node.traceNodeId()];}
return traceIdFilter;}
aggregates(sortedIndexes,key,filter){let aggregatesByClassName=key&&this._aggregates[key];if(!aggregatesByClassName){const aggregates=this._buildAggregates(filter);this._calculateClassesRetainedSize(aggregates.aggregatesByClassIndex,filter);aggregatesByClassName=aggregates.aggregatesByClassName;if(key)
this._aggregates[key]=aggregatesByClassName;}
if(sortedIndexes&&(!key||!this._aggregatesSortedFlags[key])){this._sortAggregateIndexes(aggregatesByClassName);if(key)
this._aggregatesSortedFlags[key]=sortedIndexes;}
return aggregatesByClassName;}
allocationTracesTops(){return this._allocationProfile.serializeTraceTops();}
allocationNodeCallers(nodeId){return this._allocationProfile.serializeCallers(nodeId);}
allocationStack(nodeIndex){const node=this.createNode(nodeIndex);const allocationNodeId=node.traceNodeId();if(!allocationNodeId)
return null;return this._allocationProfile.serializeAllocationStack(allocationNodeId);}
aggregatesForDiff(){if(this._aggregatesForDiff)
return this._aggregatesForDiff;const aggregatesByClassName=this.aggregates(true,'allObjects');this._aggregatesForDiff={};const node=this.createNode();for(const className in aggregatesByClassName){const aggregate=aggregatesByClassName[className];const indexes=aggregate.idxs;const ids=new Array(indexes.length);const selfSizes=new Array(indexes.length);for(let i=0;i<indexes.length;i++){node.nodeIndex=indexes[i];ids[i]=node.id();selfSizes[i]=node.selfSize();}
this._aggregatesForDiff[className]={indexes:indexes,ids:ids,selfSizes:selfSizes};}
return this._aggregatesForDiff;}
isUserRoot(node){return true;}
forEachRoot(action,userRootsOnly){for(let iter=this.rootNode().edges();iter.hasNext();iter.next()){const node=iter.edge.node();if(!userRootsOnly||this.isUserRoot(node))
action(node);}}
calculateDistances(filter){const nodeCount=this.nodeCount;const distances=this._nodeDistances;const noDistance=this._noDistance;for(let i=0;i<nodeCount;++i)
distances[i]=noDistance;const nodesToVisit=new Uint32Array(this.nodeCount);let nodesToVisitLength=0;function enqueueNode(distance,node){const ordinal=node.ordinal();if(distances[ordinal]!==noDistance)
return;distances[ordinal]=distance;nodesToVisit[nodesToVisitLength++]=node.nodeIndex;}
this.forEachRoot(enqueueNode.bind(null,1),true);this._bfs(nodesToVisit,nodesToVisitLength,distances,filter);nodesToVisitLength=0;this.forEachRoot(enqueueNode.bind(null,HeapSnapshotModel.baseSystemDistance),false);this._bfs(nodesToVisit,nodesToVisitLength,distances,filter);}
_bfs(nodesToVisit,nodesToVisitLength,distances,filter){const edgeFieldsCount=this._edgeFieldsCount;const nodeFieldCount=this._nodeFieldCount;const containmentEdges=this.containmentEdges;const firstEdgeIndexes=this._firstEdgeIndexes;const edgeToNodeOffset=this._edgeToNodeOffset;const edgeTypeOffset=this._edgeTypeOffset;const nodeCount=this.nodeCount;const edgeWeakType=this._edgeWeakType;const noDistance=this._noDistance;let index=0;const edge=this.createEdge(0);const node=this.createNode(0);while(index<nodesToVisitLength){const nodeIndex=nodesToVisit[index++];const nodeOrdinal=nodeIndex/nodeFieldCount;const distance=distances[nodeOrdinal]+1;const firstEdgeIndex=firstEdgeIndexes[nodeOrdinal];const edgesEnd=firstEdgeIndexes[nodeOrdinal+1];node.nodeIndex=nodeIndex;for(let edgeIndex=firstEdgeIndex;edgeIndex<edgesEnd;edgeIndex+=edgeFieldsCount){const edgeType=containmentEdges[edgeIndex+edgeTypeOffset];if(edgeType===edgeWeakType)
continue;const childNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];const childNodeOrdinal=childNodeIndex/nodeFieldCount;if(distances[childNodeOrdinal]!==noDistance)
continue;edge.edgeIndex=edgeIndex;if(filter&&!filter(node,edge))
continue;distances[childNodeOrdinal]=distance;nodesToVisit[nodesToVisitLength++]=childNodeIndex;}}
if(nodesToVisitLength>nodeCount){throw new Error('BFS failed. Nodes to visit ('+nodesToVisitLength+') is more than nodes count ('+nodeCount+')');}}
_buildAggregates(filter){const aggregates={};const aggregatesByClassName={};const classIndexes=[];const nodes=this.nodes;const nodesLength=nodes.length;const nodeNativeType=this._nodeNativeType;const nodeFieldCount=this._nodeFieldCount;const selfSizeOffset=this._nodeSelfSizeOffset;const nodeTypeOffset=this._nodeTypeOffset;const node=this.rootNode();const nodeDistances=this._nodeDistances;for(let nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){node.nodeIndex=nodeIndex;if(filter&&!filter(node))
continue;const selfSize=nodes[nodeIndex+selfSizeOffset];if(!selfSize&&nodes[nodeIndex+nodeTypeOffset]!==nodeNativeType)
continue;const classIndex=node.classIndex();const nodeOrdinal=nodeIndex/nodeFieldCount;const distance=nodeDistances[nodeOrdinal];if(!(classIndex in aggregates)){const nodeType=node.type();const nameMatters=nodeType==='object'||nodeType==='native';const value={count:1,distance:distance,self:selfSize,maxRet:0,type:nodeType,name:nameMatters?node.name():null,idxs:[nodeIndex]};aggregates[classIndex]=value;classIndexes.push(classIndex);aggregatesByClassName[node.className()]=value;}else{const clss=aggregates[classIndex];clss.distance=Math.min(clss.distance,distance);++clss.count;clss.self+=selfSize;clss.idxs.push(nodeIndex);}}
for(let i=0,l=classIndexes.length;i<l;++i){const classIndex=classIndexes[i];aggregates[classIndex].idxs=aggregates[classIndex].idxs.slice();}
return{aggregatesByClassName:aggregatesByClassName,aggregatesByClassIndex:aggregates};}
_calculateClassesRetainedSize(aggregates,filter){const rootNodeIndex=this._rootNodeIndex;const node=this.createNode(rootNodeIndex);const list=[rootNodeIndex];const sizes=[-1];const classes=[];const seenClassNameIndexes={};const nodeFieldCount=this._nodeFieldCount;const nodeTypeOffset=this._nodeTypeOffset;const nodeNativeType=this._nodeNativeType;const dominatedNodes=this._dominatedNodes;const nodes=this.nodes;const firstDominatedNodeIndex=this._firstDominatedNodeIndex;while(list.length){const nodeIndex=list.pop();node.nodeIndex=nodeIndex;let classIndex=node.classIndex();const seen=!!seenClassNameIndexes[classIndex];const nodeOrdinal=nodeIndex/nodeFieldCount;const dominatedIndexFrom=firstDominatedNodeIndex[nodeOrdinal];const dominatedIndexTo=firstDominatedNodeIndex[nodeOrdinal+1];if(!seen&&(!filter||filter(node))&&(node.selfSize()||nodes[nodeIndex+nodeTypeOffset]===nodeNativeType)){aggregates[classIndex].maxRet+=node.retainedSize();if(dominatedIndexFrom!==dominatedIndexTo){seenClassNameIndexes[classIndex]=true;sizes.push(list.length);classes.push(classIndex);}}
for(let i=dominatedIndexFrom;i<dominatedIndexTo;i++)
list.push(dominatedNodes[i]);const l=list.length;while(sizes[sizes.length-1]===l){sizes.pop();classIndex=classes.pop();seenClassNameIndexes[classIndex]=false;}}}
_sortAggregateIndexes(aggregates){const nodeA=this.createNode();const nodeB=this.createNode();for(const clss in aggregates){aggregates[clss].idxs.sort((idxA,idxB)=>{nodeA.nodeIndex=idxA;nodeB.nodeIndex=idxB;return nodeA.id()<nodeB.id()?-1:1;});}}
_isEssentialEdge(nodeIndex,edgeType){return edgeType!==this._edgeWeakType&&(edgeType!==this._edgeShortcutType||nodeIndex===this._rootNodeIndex);}
_buildPostOrderIndex(){const nodeFieldCount=this._nodeFieldCount;const nodeCount=this.nodeCount;const rootNodeOrdinal=this._rootNodeIndex/nodeFieldCount;const edgeFieldsCount=this._edgeFieldsCount;const edgeTypeOffset=this._edgeTypeOffset;const edgeToNodeOffset=this._edgeToNodeOffset;const firstEdgeIndexes=this._firstEdgeIndexes;const containmentEdges=this.containmentEdges;const mapAndFlag=this.userObjectsMapAndFlag();const flags=mapAndFlag?mapAndFlag.map:null;const flag=mapAndFlag?mapAndFlag.flag:0;const stackNodes=new Uint32Array(nodeCount);const stackCurrentEdge=new Uint32Array(nodeCount);const postOrderIndex2NodeOrdinal=new Uint32Array(nodeCount);const nodeOrdinal2PostOrderIndex=new Uint32Array(nodeCount);const visited=new Uint8Array(nodeCount);let postOrderIndex=0;let stackTop=0;stackNodes[0]=rootNodeOrdinal;stackCurrentEdge[0]=firstEdgeIndexes[rootNodeOrdinal];visited[rootNodeOrdinal]=1;let iteration=0;while(true){++iteration;while(stackTop>=0){const nodeOrdinal=stackNodes[stackTop];const edgeIndex=stackCurrentEdge[stackTop];const edgesEnd=firstEdgeIndexes[nodeOrdinal+1];if(edgeIndex<edgesEnd){stackCurrentEdge[stackTop]+=edgeFieldsCount;const edgeType=containmentEdges[edgeIndex+edgeTypeOffset];if(!this._isEssentialEdge(nodeOrdinal*nodeFieldCount,edgeType))
continue;const childNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];const childNodeOrdinal=childNodeIndex/nodeFieldCount;if(visited[childNodeOrdinal])
continue;const nodeFlag=!flags||(flags[nodeOrdinal]&flag);const childNodeFlag=!flags||(flags[childNodeOrdinal]&flag);if(nodeOrdinal!==rootNodeOrdinal&&childNodeFlag&&!nodeFlag)
continue;++stackTop;stackNodes[stackTop]=childNodeOrdinal;stackCurrentEdge[stackTop]=firstEdgeIndexes[childNodeOrdinal];visited[childNodeOrdinal]=1;}else{nodeOrdinal2PostOrderIndex[nodeOrdinal]=postOrderIndex;postOrderIndex2NodeOrdinal[postOrderIndex++]=nodeOrdinal;--stackTop;}}
if(postOrderIndex===nodeCount||iteration>1)
break;const errors=new HeapSnapshotWorker.HeapSnapshotProblemReport(`Heap snapshot: ${
                            nodeCount - postOrderIndex
                          } nodes are unreachable from the root. Following nodes have only weak retainers:`);const dumpNode=this.rootNode();--postOrderIndex;stackTop=0;stackNodes[0]=rootNodeOrdinal;stackCurrentEdge[0]=firstEdgeIndexes[rootNodeOrdinal+1];for(let i=0;i<nodeCount;++i){if(visited[i]||!this._hasOnlyWeakRetainers(i))
continue;stackNodes[++stackTop]=i;stackCurrentEdge[stackTop]=firstEdgeIndexes[i];visited[i]=1;dumpNode.nodeIndex=i*nodeFieldCount;const retainers=[];for(let it=dumpNode.retainers();it.hasNext();it.next())
retainers.push(`${it.item().node().name()}@${it.item().node().id()}.${it.item().name()}`);errors.addError(`${dumpNode.name()} @${dumpNode.id()}  weak retainers: ${retainers.join(', ')}`);}
console.warn(errors.toString());}
if(postOrderIndex!==nodeCount){const errors=new HeapSnapshotWorker.HeapSnapshotProblemReport('Still found '+(nodeCount-postOrderIndex)+' unreachable nodes in heap snapshot:');const dumpNode=this.rootNode();--postOrderIndex;for(let i=0;i<nodeCount;++i){if(visited[i])
continue;dumpNode.nodeIndex=i*nodeFieldCount;errors.addError(dumpNode.name()+' @'+dumpNode.id());nodeOrdinal2PostOrderIndex[i]=postOrderIndex;postOrderIndex2NodeOrdinal[postOrderIndex++]=i;}
nodeOrdinal2PostOrderIndex[rootNodeOrdinal]=postOrderIndex;postOrderIndex2NodeOrdinal[postOrderIndex++]=rootNodeOrdinal;console.warn(errors.toString());}
return{postOrderIndex2NodeOrdinal:postOrderIndex2NodeOrdinal,nodeOrdinal2PostOrderIndex:nodeOrdinal2PostOrderIndex};}
_hasOnlyWeakRetainers(nodeOrdinal){const edgeTypeOffset=this._edgeTypeOffset;const edgeWeakType=this._edgeWeakType;const edgeShortcutType=this._edgeShortcutType;const containmentEdges=this.containmentEdges;const retainingEdges=this._retainingEdges;const beginRetainerIndex=this._firstRetainerIndex[nodeOrdinal];const endRetainerIndex=this._firstRetainerIndex[nodeOrdinal+1];for(let retainerIndex=beginRetainerIndex;retainerIndex<endRetainerIndex;++retainerIndex){const retainerEdgeIndex=retainingEdges[retainerIndex];const retainerEdgeType=containmentEdges[retainerEdgeIndex+edgeTypeOffset];if(retainerEdgeType!==edgeWeakType&&retainerEdgeType!==edgeShortcutType)
return false;}
return true;}
_buildDominatorTree(postOrderIndex2NodeOrdinal,nodeOrdinal2PostOrderIndex){const nodeFieldCount=this._nodeFieldCount;const firstRetainerIndex=this._firstRetainerIndex;const retainingNodes=this._retainingNodes;const retainingEdges=this._retainingEdges;const edgeFieldsCount=this._edgeFieldsCount;const edgeTypeOffset=this._edgeTypeOffset;const edgeToNodeOffset=this._edgeToNodeOffset;const firstEdgeIndexes=this._firstEdgeIndexes;const containmentEdges=this.containmentEdges;const rootNodeIndex=this._rootNodeIndex;const mapAndFlag=this.userObjectsMapAndFlag();const flags=mapAndFlag?mapAndFlag.map:null;const flag=mapAndFlag?mapAndFlag.flag:0;const nodesCount=postOrderIndex2NodeOrdinal.length;const rootPostOrderedIndex=nodesCount-1;const noEntry=nodesCount;const dominators=new Uint32Array(nodesCount);for(let i=0;i<rootPostOrderedIndex;++i)
dominators[i]=noEntry;dominators[rootPostOrderedIndex]=rootPostOrderedIndex;const affected=new Uint8Array(nodesCount);let nodeOrdinal;{nodeOrdinal=this._rootNodeIndex/nodeFieldCount;const endEdgeIndex=firstEdgeIndexes[nodeOrdinal+1];for(let edgeIndex=firstEdgeIndexes[nodeOrdinal];edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){const edgeType=containmentEdges[edgeIndex+edgeTypeOffset];if(!this._isEssentialEdge(this._rootNodeIndex,edgeType))
continue;const childNodeOrdinal=containmentEdges[edgeIndex+edgeToNodeOffset]/nodeFieldCount;affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]]=1;}}
let changed=true;while(changed){changed=false;for(let postOrderIndex=rootPostOrderedIndex-1;postOrderIndex>=0;--postOrderIndex){if(affected[postOrderIndex]===0)
continue;affected[postOrderIndex]=0;if(dominators[postOrderIndex]===rootPostOrderedIndex)
continue;nodeOrdinal=postOrderIndex2NodeOrdinal[postOrderIndex];const nodeFlag=!flags||(flags[nodeOrdinal]&flag);let newDominatorIndex=noEntry;const beginRetainerIndex=firstRetainerIndex[nodeOrdinal];const endRetainerIndex=firstRetainerIndex[nodeOrdinal+1];let orphanNode=true;for(let retainerIndex=beginRetainerIndex;retainerIndex<endRetainerIndex;++retainerIndex){const retainerEdgeIndex=retainingEdges[retainerIndex];const retainerEdgeType=containmentEdges[retainerEdgeIndex+edgeTypeOffset];const retainerNodeIndex=retainingNodes[retainerIndex];if(!this._isEssentialEdge(retainerNodeIndex,retainerEdgeType))
continue;orphanNode=false;const retainerNodeOrdinal=retainerNodeIndex/nodeFieldCount;const retainerNodeFlag=!flags||(flags[retainerNodeOrdinal]&flag);if(retainerNodeIndex!==rootNodeIndex&&nodeFlag&&!retainerNodeFlag)
continue;let retanerPostOrderIndex=nodeOrdinal2PostOrderIndex[retainerNodeOrdinal];if(dominators[retanerPostOrderIndex]!==noEntry){if(newDominatorIndex===noEntry){newDominatorIndex=retanerPostOrderIndex;}else{while(retanerPostOrderIndex!==newDominatorIndex){while(retanerPostOrderIndex<newDominatorIndex)
retanerPostOrderIndex=dominators[retanerPostOrderIndex];while(newDominatorIndex<retanerPostOrderIndex)
newDominatorIndex=dominators[newDominatorIndex];}}
if(newDominatorIndex===rootPostOrderedIndex)
break;}}
if(orphanNode)
newDominatorIndex=rootPostOrderedIndex;if(newDominatorIndex!==noEntry&&dominators[postOrderIndex]!==newDominatorIndex){dominators[postOrderIndex]=newDominatorIndex;changed=true;nodeOrdinal=postOrderIndex2NodeOrdinal[postOrderIndex];const beginEdgeToNodeFieldIndex=firstEdgeIndexes[nodeOrdinal]+edgeToNodeOffset;const endEdgeToNodeFieldIndex=firstEdgeIndexes[nodeOrdinal+1];for(let toNodeFieldIndex=beginEdgeToNodeFieldIndex;toNodeFieldIndex<endEdgeToNodeFieldIndex;toNodeFieldIndex+=edgeFieldsCount){const childNodeOrdinal=containmentEdges[toNodeFieldIndex]/nodeFieldCount;affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]]=1;}}}}
const dominatorsTree=new Uint32Array(nodesCount);for(let postOrderIndex=0,l=dominators.length;postOrderIndex<l;++postOrderIndex){nodeOrdinal=postOrderIndex2NodeOrdinal[postOrderIndex];dominatorsTree[nodeOrdinal]=postOrderIndex2NodeOrdinal[dominators[postOrderIndex]];}
return dominatorsTree;}
_calculateRetainedSizes(postOrderIndex2NodeOrdinal){const nodeCount=this.nodeCount;const nodes=this.nodes;const nodeSelfSizeOffset=this._nodeSelfSizeOffset;const nodeFieldCount=this._nodeFieldCount;const dominatorsTree=this._dominatorsTree;const retainedSizes=this._retainedSizes;for(let nodeOrdinal=0;nodeOrdinal<nodeCount;++nodeOrdinal)
retainedSizes[nodeOrdinal]=nodes[nodeOrdinal*nodeFieldCount+nodeSelfSizeOffset];for(let postOrderIndex=0;postOrderIndex<nodeCount-1;++postOrderIndex){const nodeOrdinal=postOrderIndex2NodeOrdinal[postOrderIndex];const dominatorOrdinal=dominatorsTree[nodeOrdinal];retainedSizes[dominatorOrdinal]+=retainedSizes[nodeOrdinal];}}
_buildDominatedNodes(){const indexArray=this._firstDominatedNodeIndex;const dominatedNodes=this._dominatedNodes;const nodeFieldCount=this._nodeFieldCount;const dominatorsTree=this._dominatorsTree;let fromNodeOrdinal=0;let toNodeOrdinal=this.nodeCount;const rootNodeOrdinal=this._rootNodeIndex/nodeFieldCount;if(rootNodeOrdinal===fromNodeOrdinal)
fromNodeOrdinal=1;else if(rootNodeOrdinal===toNodeOrdinal-1)
toNodeOrdinal=toNodeOrdinal-1;else
throw new Error('Root node is expected to be either first or last');for(let nodeOrdinal=fromNodeOrdinal;nodeOrdinal<toNodeOrdinal;++nodeOrdinal)
++indexArray[dominatorsTree[nodeOrdinal]];let firstDominatedNodeIndex=0;for(let i=0,l=this.nodeCount;i<l;++i){const dominatedCount=dominatedNodes[firstDominatedNodeIndex]=indexArray[i];indexArray[i]=firstDominatedNodeIndex;firstDominatedNodeIndex+=dominatedCount;}
indexArray[this.nodeCount]=dominatedNodes.length;for(let nodeOrdinal=fromNodeOrdinal;nodeOrdinal<toNodeOrdinal;++nodeOrdinal){const dominatorOrdinal=dominatorsTree[nodeOrdinal];let dominatedRefIndex=indexArray[dominatorOrdinal];dominatedRefIndex+=(--dominatedNodes[dominatedRefIndex]);dominatedNodes[dominatedRefIndex]=nodeOrdinal*nodeFieldCount;}}
_buildSamples(){const samples=this._rawSamples;if(!samples||!samples.length)
return;const sampleCount=samples.length/2;const sizeForRange=new Array(sampleCount);const timestamps=new Array(sampleCount);const lastAssignedIds=new Array(sampleCount);const timestampOffset=this._metaNode.sample_fields.indexOf('timestamp_us');const lastAssignedIdOffset=this._metaNode.sample_fields.indexOf('last_assigned_id');for(let i=0;i<sampleCount;i++){sizeForRange[i]=0;timestamps[i]=(samples[2*i+timestampOffset])/1000;lastAssignedIds[i]=samples[2*i+lastAssignedIdOffset];}
const nodes=this.nodes;const nodesLength=nodes.length;const nodeFieldCount=this._nodeFieldCount;const node=this.rootNode();for(let nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){node.nodeIndex=nodeIndex;const nodeId=node.id();if(nodeId%2===0)
continue;const rangeIndex=lastAssignedIds.lowerBound(nodeId);if(rangeIndex===sampleCount){continue;}
sizeForRange[rangeIndex]+=node.selfSize();}
this._samples=new HeapSnapshotModel.Samples(timestamps,lastAssignedIds,sizeForRange);}
_buildLocationMap(){const map=new Map();const locations=this._locations;for(let i=0;i<locations.length;i+=this._locationFieldCount){const nodeIndex=locations[i+this._locationIndexOffset];const scriptId=locations[i+this._locationScriptIdOffset];const line=locations[i+this._locationLineOffset];const col=locations[i+this._locationColumnOffset];map.set(nodeIndex,new HeapSnapshotModel.Location(scriptId,line,col));}
this._locationMap=map;}
getLocation(nodeIndex){return this._locationMap.get(nodeIndex)||null;}
getSamples(){return this._samples;}
calculateFlags(){throw new Error('Not implemented');}
calculateStatistics(){throw new Error('Not implemented');}
userObjectsMapAndFlag(){throw new Error('Not implemented');}
calculateSnapshotDiff(baseSnapshotId,baseSnapshotAggregates){let snapshotDiff=this._snapshotDiffs[baseSnapshotId];if(snapshotDiff)
return snapshotDiff;snapshotDiff={};const aggregates=this.aggregates(true,'allObjects');for(const className in baseSnapshotAggregates){const baseAggregate=baseSnapshotAggregates[className];const diff=this._calculateDiffForClass(baseAggregate,aggregates[className]);if(diff)
snapshotDiff[className]=diff;}
const emptyBaseAggregate=new HeapSnapshotModel.AggregateForDiff();for(const className in aggregates){if(className in baseSnapshotAggregates)
continue;snapshotDiff[className]=this._calculateDiffForClass(emptyBaseAggregate,aggregates[className]);}
this._snapshotDiffs[baseSnapshotId]=snapshotDiff;return snapshotDiff;}
_calculateDiffForClass(baseAggregate,aggregate){const baseIds=baseAggregate.ids;const baseIndexes=baseAggregate.indexes;const baseSelfSizes=baseAggregate.selfSizes;const indexes=aggregate?aggregate.idxs:[];let i=0;let j=0;const l=baseIds.length;const m=indexes.length;const diff=new HeapSnapshotModel.Diff();const nodeB=this.createNode(indexes[j]);while(i<l&&j<m){const nodeAId=baseIds[i];if(nodeAId<nodeB.id()){diff.deletedIndexes.push(baseIndexes[i]);diff.removedCount++;diff.removedSize+=baseSelfSizes[i];++i;}else if(nodeAId>nodeB.id()){diff.addedIndexes.push(indexes[j]);diff.addedCount++;diff.addedSize+=nodeB.selfSize();nodeB.nodeIndex=indexes[++j];}else{++i;nodeB.nodeIndex=indexes[++j];}}
while(i<l){diff.deletedIndexes.push(baseIndexes[i]);diff.removedCount++;diff.removedSize+=baseSelfSizes[i];++i;}
while(j<m){diff.addedIndexes.push(indexes[j]);diff.addedCount++;diff.addedSize+=nodeB.selfSize();nodeB.nodeIndex=indexes[++j];}
diff.countDelta=diff.addedCount-diff.removedCount;diff.sizeDelta=diff.addedSize-diff.removedSize;if(!diff.addedCount&&!diff.removedCount)
return null;return diff;}
_nodeForSnapshotObjectId(snapshotObjectId){for(let it=this._allNodes();it.hasNext();it.next()){if(it.node.id()===snapshotObjectId)
return it.node;}
return null;}
nodeClassName(snapshotObjectId){const node=this._nodeForSnapshotObjectId(snapshotObjectId);if(node)
return node.className();return null;}
idsOfObjectsWithName(name){const ids=[];for(let it=this._allNodes();it.hasNext();it.next()){if(it.item().name()===name)
ids.push(it.item().id());}
return ids;}
createEdgesProvider(nodeIndex){const node=this.createNode(nodeIndex);const filter=this.containmentEdgesFilter();const indexProvider=new HeapSnapshotWorker.HeapSnapshotEdgeIndexProvider(this);return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this,filter,node.edges(),indexProvider);}
createEdgesProviderForTest(nodeIndex,filter){const node=this.createNode(nodeIndex);const indexProvider=new HeapSnapshotWorker.HeapSnapshotEdgeIndexProvider(this);return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this,filter,node.edges(),indexProvider);}
retainingEdgesFilter(){return null;}
containmentEdgesFilter(){return null;}
createRetainingEdgesProvider(nodeIndex){const node=this.createNode(nodeIndex);const filter=this.retainingEdgesFilter();const indexProvider=new HeapSnapshotWorker.HeapSnapshotRetainerEdgeIndexProvider(this);return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this,filter,node.retainers(),indexProvider);}
createAddedNodesProvider(baseSnapshotId,className){const snapshotDiff=this._snapshotDiffs[baseSnapshotId];const diffForClass=snapshotDiff[className];return new HeapSnapshotWorker.HeapSnapshotNodesProvider(this,diffForClass.addedIndexes);}
createDeletedNodesProvider(nodeIndexes){return new HeapSnapshotWorker.HeapSnapshotNodesProvider(this,nodeIndexes);}
createNodesProviderForClass(className,nodeFilter){return new HeapSnapshotWorker.HeapSnapshotNodesProvider(this,this.aggregatesWithFilter(nodeFilter)[className].idxs);}
_maxJsNodeId(){const nodeFieldCount=this._nodeFieldCount;const nodes=this.nodes;const nodesLength=nodes.length;let id=0;for(let nodeIndex=this._nodeIdOffset;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){const nextId=nodes[nodeIndex];if(nextId%2===0)
continue;if(id<nextId)
id=nextId;}
return id;}
updateStaticData(){return new HeapSnapshotModel.StaticData(this.nodeCount,this._rootNodeIndex,this.totalSize,this._maxJsNodeId());}};HeapSnapshotWorker.HeapSnapshot.AggregatedInfo;const HeapSnapshotMetainfo=class{constructor(){this.node_fields=[];this.node_types=[];this.edge_fields=[];this.edge_types=[];this.trace_function_info_fields=[];this.trace_node_fields=[];this.sample_fields=[];this.type_strings={};}};const HeapSnapshotHeader=class{constructor(){this.title='';this.meta=new HeapSnapshotMetainfo();this.node_count=0;this.edge_count=0;this.trace_function_count=0;}};HeapSnapshotWorker.HeapSnapshotItemProvider=class{constructor(iterator,indexProvider){this._iterator=iterator;this._indexProvider=indexProvider;this._isEmpty=!iterator.hasNext();this._iterationOrder=null;this._currentComparator=null;this._sortedPrefixLength=0;this._sortedSuffixLength=0;}
_createIterationOrder(){if(this._iterationOrder)
return;this._iterationOrder=[];for(let iterator=this._iterator;iterator.hasNext();iterator.next())
this._iterationOrder.push(iterator.item().itemIndex());}
isEmpty(){return this._isEmpty;}
serializeItemsRange(begin,end){this._createIterationOrder();if(begin>end)
throw new Error('Start position > end position: '+begin+' > '+end);if(end>this._iterationOrder.length)
end=this._iterationOrder.length;if(this._sortedPrefixLength<end&&begin<this._iterationOrder.length-this._sortedSuffixLength){this.sort(this._currentComparator,this._sortedPrefixLength,this._iterationOrder.length-1-this._sortedSuffixLength,begin,end-1);if(begin<=this._sortedPrefixLength)
this._sortedPrefixLength=end;if(end>=this._iterationOrder.length-this._sortedSuffixLength)
this._sortedSuffixLength=this._iterationOrder.length-begin;}
let position=begin;const count=end-begin;const result=new Array(count);for(let i=0;i<count;++i){const itemIndex=this._iterationOrder[position++];const item=this._indexProvider.itemForIndex(itemIndex);result[i]=item.serialize();}
return new HeapSnapshotModel.ItemsRange(begin,end,this._iterationOrder.length,result);}
sortAndRewind(comparator){this._currentComparator=comparator;this._sortedPrefixLength=0;this._sortedSuffixLength=0;}};HeapSnapshotWorker.HeapSnapshotEdgesProvider=class extends HeapSnapshotWorker.HeapSnapshotItemProvider{constructor(snapshot,filter,edgesIter,indexProvider){const iter=filter?new HeapSnapshotWorker.HeapSnapshotFilteredIterator(edgesIter,(filter)):edgesIter;super(iter,indexProvider);this.snapshot=snapshot;}
sort(comparator,leftBound,rightBound,windowLeft,windowRight){const fieldName1=comparator.fieldName1;const fieldName2=comparator.fieldName2;const ascending1=comparator.ascending1;const ascending2=comparator.ascending2;const edgeA=this._iterator.item().clone();const edgeB=edgeA.clone();const nodeA=this.snapshot.createNode();const nodeB=this.snapshot.createNode();function compareEdgeFieldName(ascending,indexA,indexB){edgeA.edgeIndex=indexA;edgeB.edgeIndex=indexB;if(edgeB.name()==='__proto__')
return-1;if(edgeA.name()==='__proto__')
return 1;const result=edgeA.hasStringName()===edgeB.hasStringName()?(edgeA.name()<edgeB.name()?-1:(edgeA.name()>edgeB.name()?1:0)):(edgeA.hasStringName()?-1:1);return ascending?result:-result;}
function compareNodeField(fieldName,ascending,indexA,indexB){edgeA.edgeIndex=indexA;nodeA.nodeIndex=edgeA.nodeIndex();const valueA=nodeA[fieldName]();edgeB.edgeIndex=indexB;nodeB.nodeIndex=edgeB.nodeIndex();const valueB=nodeB[fieldName]();const result=valueA<valueB?-1:(valueA>valueB?1:0);return ascending?result:-result;}
function compareEdgeAndNode(indexA,indexB){let result=compareEdgeFieldName(ascending1,indexA,indexB);if(result===0)
result=compareNodeField(fieldName2,ascending2,indexA,indexB);if(result===0)
return indexA-indexB;return result;}
function compareNodeAndEdge(indexA,indexB){let result=compareNodeField(fieldName1,ascending1,indexA,indexB);if(result===0)
result=compareEdgeFieldName(ascending2,indexA,indexB);if(result===0)
return indexA-indexB;return result;}
function compareNodeAndNode(indexA,indexB){let result=compareNodeField(fieldName1,ascending1,indexA,indexB);if(result===0)
result=compareNodeField(fieldName2,ascending2,indexA,indexB);if(result===0)
return indexA-indexB;return result;}
if(fieldName1==='!edgeName')
this._iterationOrder.sortRange(compareEdgeAndNode,leftBound,rightBound,windowLeft,windowRight);else if(fieldName2==='!edgeName')
this._iterationOrder.sortRange(compareNodeAndEdge,leftBound,rightBound,windowLeft,windowRight);else
this._iterationOrder.sortRange(compareNodeAndNode,leftBound,rightBound,windowLeft,windowRight);}};HeapSnapshotWorker.HeapSnapshotNodesProvider=class extends HeapSnapshotWorker.HeapSnapshotItemProvider{constructor(snapshot,nodeIndexes){const indexProvider=new HeapSnapshotWorker.HeapSnapshotNodeIndexProvider(snapshot);const it=new HeapSnapshotWorker.HeapSnapshotIndexRangeIterator(indexProvider,nodeIndexes);super(it,indexProvider);this.snapshot=snapshot;}
nodePosition(snapshotObjectId){this._createIterationOrder();const node=this.snapshot.createNode();let i=0;for(;i<this._iterationOrder.length;i++){node.nodeIndex=this._iterationOrder[i];if(node.id()===snapshotObjectId)
break;}
if(i===this._iterationOrder.length)
return-1;const targetNodeIndex=this._iterationOrder[i];let smallerCount=0;const compare=this._buildCompareFunction(this._currentComparator);for(let i=0;i<this._iterationOrder.length;i++){if(compare(this._iterationOrder[i],targetNodeIndex)<0)
++smallerCount;}
return smallerCount;}
_buildCompareFunction(comparator){const nodeA=this.snapshot.createNode();const nodeB=this.snapshot.createNode();const fieldAccessor1=nodeA[comparator.fieldName1];const fieldAccessor2=nodeA[comparator.fieldName2];const ascending1=comparator.ascending1?1:-1;const ascending2=comparator.ascending2?1:-1;function sortByNodeField(fieldAccessor,ascending){const valueA=fieldAccessor.call(nodeA);const valueB=fieldAccessor.call(nodeB);return valueA<valueB?-ascending:(valueA>valueB?ascending:0);}
function sortByComparator(indexA,indexB){nodeA.nodeIndex=indexA;nodeB.nodeIndex=indexB;let result=sortByNodeField(fieldAccessor1,ascending1);if(result===0)
result=sortByNodeField(fieldAccessor2,ascending2);return result||indexA-indexB;}
return sortByComparator;}
sort(comparator,leftBound,rightBound,windowLeft,windowRight){this._iterationOrder.sortRange(this._buildCompareFunction(comparator),leftBound,rightBound,windowLeft,windowRight);}};HeapSnapshotWorker.JSHeapSnapshot=class extends HeapSnapshotWorker.HeapSnapshot{constructor(profile,progress){super(profile,progress);this._nodeFlags={canBeQueried:1,detachedDOMTreeNode:2,pageObject:4};this._lazyStringCache={};this.initialize();}
createNode(nodeIndex){return new HeapSnapshotWorker.JSHeapSnapshotNode(this,nodeIndex===undefined?-1:nodeIndex);}
createEdge(edgeIndex){return new HeapSnapshotWorker.JSHeapSnapshotEdge(this,edgeIndex);}
createRetainingEdge(retainerIndex){return new HeapSnapshotWorker.JSHeapSnapshotRetainerEdge(this,retainerIndex);}
containmentEdgesFilter(){return edge=>!edge.isInvisible();}
retainingEdgesFilter(){const containmentEdgesFilter=this.containmentEdgesFilter();function filter(edge){return containmentEdgesFilter(edge)&&!edge.node().isRoot()&&!edge.isWeak();}
return filter;}
calculateFlags(){this._flags=new Uint32Array(this.nodeCount);this._markDetachedDOMTreeNodes();this._markQueriableHeapObjects();this._markPageOwnedNodes();}
calculateDistances(){function filter(node,edge){if(node.isHidden())
return edge.name()!=='sloppy_function_map'||node.rawName()!=='system / NativeContext';if(node.isArray()){if(node.rawName()!=='(map descriptors)')
return true;const index=edge.name();return index<2||(index%3)!==1;}
return true;}
super.calculateDistances(filter);}
isUserRoot(node){return node.isUserRoot()||node.isDocumentDOMTreesRoot();}
forEachRoot(action,userRootsOnly){function getChildNodeByName(node,name){for(let iter=node.edges();iter.hasNext();iter.next()){const child=iter.edge.node();if(child.name()===name)
return child;}
return null;}
const visitedNodes={};function doAction(node){const ordinal=node.ordinal();if(!visitedNodes[ordinal]){action(node);visitedNodes[ordinal]=true;}}
const gcRoots=getChildNodeByName(this.rootNode(),'(GC roots)');if(!gcRoots)
return;if(userRootsOnly){for(let iter=this.rootNode().edges();iter.hasNext();iter.next()){const node=iter.edge.node();if(this.isUserRoot(node))
doAction(node);}}else{for(let iter=gcRoots.edges();iter.hasNext();iter.next()){const subRoot=iter.edge.node();for(let iter2=subRoot.edges();iter2.hasNext();iter2.next())
doAction(iter2.edge.node());doAction(subRoot);}
for(let iter=this.rootNode().edges();iter.hasNext();iter.next())
doAction(iter.edge.node());}}
userObjectsMapAndFlag(){return{map:this._flags,flag:this._nodeFlags.pageObject};}
_flagsOfNode(node){return this._flags[node.nodeIndex/this._nodeFieldCount];}
_markDetachedDOMTreeNodes(){const nodes=this.nodes;const nodesLength=nodes.length;const nodeFieldCount=this._nodeFieldCount;const nodeNativeType=this._nodeNativeType;const nodeTypeOffset=this._nodeTypeOffset;const flag=this._nodeFlags.detachedDOMTreeNode;const node=this.rootNode();for(let nodeIndex=0,ordinal=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount,ordinal++){const nodeType=nodes[nodeIndex+nodeTypeOffset];if(nodeType!==nodeNativeType)
continue;node.nodeIndex=nodeIndex;if(node.name().startsWith('Detached '))
this._flags[ordinal]|=flag;}}
_markQueriableHeapObjects(){const flag=this._nodeFlags.canBeQueried;const hiddenEdgeType=this._edgeHiddenType;const internalEdgeType=this._edgeInternalType;const invisibleEdgeType=this._edgeInvisibleType;const weakEdgeType=this._edgeWeakType;const edgeToNodeOffset=this._edgeToNodeOffset;const edgeTypeOffset=this._edgeTypeOffset;const edgeFieldsCount=this._edgeFieldsCount;const containmentEdges=this.containmentEdges;const nodeFieldCount=this._nodeFieldCount;const firstEdgeIndexes=this._firstEdgeIndexes;const flags=this._flags;const list=[];for(let iter=this.rootNode().edges();iter.hasNext();iter.next()){if(iter.edge.node().isUserRoot())
list.push(iter.edge.node().nodeIndex/nodeFieldCount);}
while(list.length){const nodeOrdinal=list.pop();if(flags[nodeOrdinal]&flag)
continue;flags[nodeOrdinal]|=flag;const beginEdgeIndex=firstEdgeIndexes[nodeOrdinal];const endEdgeIndex=firstEdgeIndexes[nodeOrdinal+1];for(let edgeIndex=beginEdgeIndex;edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){const childNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];const childNodeOrdinal=childNodeIndex/nodeFieldCount;if(flags[childNodeOrdinal]&flag)
continue;const type=containmentEdges[edgeIndex+edgeTypeOffset];if(type===hiddenEdgeType||type===invisibleEdgeType||type===internalEdgeType||type===weakEdgeType)
continue;list.push(childNodeOrdinal);}}}
_markPageOwnedNodes(){const edgeShortcutType=this._edgeShortcutType;const edgeElementType=this._edgeElementType;const edgeToNodeOffset=this._edgeToNodeOffset;const edgeTypeOffset=this._edgeTypeOffset;const edgeFieldsCount=this._edgeFieldsCount;const edgeWeakType=this._edgeWeakType;const firstEdgeIndexes=this._firstEdgeIndexes;const containmentEdges=this.containmentEdges;const nodeFieldCount=this._nodeFieldCount;const nodesCount=this.nodeCount;const flags=this._flags;const pageObjectFlag=this._nodeFlags.pageObject;const nodesToVisit=new Uint32Array(nodesCount);let nodesToVisitLength=0;const rootNodeOrdinal=this._rootNodeIndex/nodeFieldCount;const node=this.rootNode();for(let edgeIndex=firstEdgeIndexes[rootNodeOrdinal],endEdgeIndex=firstEdgeIndexes[rootNodeOrdinal+1];edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){const edgeType=containmentEdges[edgeIndex+edgeTypeOffset];const nodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];if(edgeType===edgeElementType){node.nodeIndex=nodeIndex;if(!node.isDocumentDOMTreesRoot())
continue;}else if(edgeType!==edgeShortcutType){continue;}
const nodeOrdinal=nodeIndex/nodeFieldCount;nodesToVisit[nodesToVisitLength++]=nodeOrdinal;flags[nodeOrdinal]|=pageObjectFlag;}
while(nodesToVisitLength){const nodeOrdinal=nodesToVisit[--nodesToVisitLength];const beginEdgeIndex=firstEdgeIndexes[nodeOrdinal];const endEdgeIndex=firstEdgeIndexes[nodeOrdinal+1];for(let edgeIndex=beginEdgeIndex;edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){const childNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];const childNodeOrdinal=childNodeIndex/nodeFieldCount;if(flags[childNodeOrdinal]&pageObjectFlag)
continue;const type=containmentEdges[edgeIndex+edgeTypeOffset];if(type===edgeWeakType)
continue;nodesToVisit[nodesToVisitLength++]=childNodeOrdinal;flags[childNodeOrdinal]|=pageObjectFlag;}}}
calculateStatistics(){const nodeFieldCount=this._nodeFieldCount;const nodes=this.nodes;const nodesLength=nodes.length;const nodeTypeOffset=this._nodeTypeOffset;const nodeSizeOffset=this._nodeSelfSizeOffset;const nodeNativeType=this._nodeNativeType;const nodeCodeType=this._nodeCodeType;const nodeConsStringType=this._nodeConsStringType;const nodeSlicedStringType=this._nodeSlicedStringType;const distances=this._nodeDistances;let sizeNative=0;let sizeCode=0;let sizeStrings=0;let sizeJSArrays=0;let sizeSystem=0;const node=this.rootNode();for(let nodeIndex=0;nodeIndex<nodesLength;nodeIndex+=nodeFieldCount){const nodeSize=nodes[nodeIndex+nodeSizeOffset];const ordinal=nodeIndex/nodeFieldCount;if(distances[ordinal]>=HeapSnapshotModel.baseSystemDistance){sizeSystem+=nodeSize;continue;}
const nodeType=nodes[nodeIndex+nodeTypeOffset];node.nodeIndex=nodeIndex;if(nodeType===nodeNativeType)
sizeNative+=nodeSize;else if(nodeType===nodeCodeType)
sizeCode+=nodeSize;else if(nodeType===nodeConsStringType||nodeType===nodeSlicedStringType||node.type()==='string')
sizeStrings+=nodeSize;else if(node.name()==='Array')
sizeJSArrays+=this._calculateArraySize(node);}
this._statistics=new HeapSnapshotModel.Statistics();this._statistics.total=this.totalSize;this._statistics.v8heap=this.totalSize-sizeNative;this._statistics.native=sizeNative;this._statistics.code=sizeCode;this._statistics.jsArrays=sizeJSArrays;this._statistics.strings=sizeStrings;this._statistics.system=sizeSystem;}
_calculateArraySize(node){let size=node.selfSize();const beginEdgeIndex=node.edgeIndexesStart();const endEdgeIndex=node.edgeIndexesEnd();const containmentEdges=this.containmentEdges;const strings=this.strings;const edgeToNodeOffset=this._edgeToNodeOffset;const edgeTypeOffset=this._edgeTypeOffset;const edgeNameOffset=this._edgeNameOffset;const edgeFieldsCount=this._edgeFieldsCount;const edgeInternalType=this._edgeInternalType;for(let edgeIndex=beginEdgeIndex;edgeIndex<endEdgeIndex;edgeIndex+=edgeFieldsCount){const edgeType=containmentEdges[edgeIndex+edgeTypeOffset];if(edgeType!==edgeInternalType)
continue;const edgeName=strings[containmentEdges[edgeIndex+edgeNameOffset]];if(edgeName!=='elements')
continue;const elementsNodeIndex=containmentEdges[edgeIndex+edgeToNodeOffset];node.nodeIndex=elementsNodeIndex;if(node.retainersCount()===1)
size+=node.selfSize();break;}
return size;}
getStatistics(){return this._statistics;}};HeapSnapshotWorker.JSHeapSnapshotNode=class extends HeapSnapshotWorker.HeapSnapshotNode{constructor(snapshot,nodeIndex){super(snapshot,nodeIndex);}
canBeQueried(){const flags=this._snapshot._flagsOfNode(this);return!!(flags&this._snapshot._nodeFlags.canBeQueried);}
rawName(){return super.name();}
name(){const snapshot=this._snapshot;if(this.rawType()===snapshot._nodeConsStringType){let string=snapshot._lazyStringCache[this.nodeIndex];if(typeof string==='undefined'){string=this._consStringName();snapshot._lazyStringCache[this.nodeIndex]=string;}
return string;}
return this.rawName();}
_consStringName(){const snapshot=this._snapshot;const consStringType=snapshot._nodeConsStringType;const edgeInternalType=snapshot._edgeInternalType;const edgeFieldsCount=snapshot._edgeFieldsCount;const edgeToNodeOffset=snapshot._edgeToNodeOffset;const edgeTypeOffset=snapshot._edgeTypeOffset;const edgeNameOffset=snapshot._edgeNameOffset;const strings=snapshot.strings;const edges=snapshot.containmentEdges;const firstEdgeIndexes=snapshot._firstEdgeIndexes;const nodeFieldCount=snapshot._nodeFieldCount;const nodeTypeOffset=snapshot._nodeTypeOffset;const nodeNameOffset=snapshot._nodeNameOffset;const nodes=snapshot.nodes;const nodesStack=[];nodesStack.push(this.nodeIndex);let name='';while(nodesStack.length&&name.length<1024){const nodeIndex=nodesStack.pop();if(nodes[nodeIndex+nodeTypeOffset]!==consStringType){name+=strings[nodes[nodeIndex+nodeNameOffset]];continue;}
const nodeOrdinal=nodeIndex/nodeFieldCount;const beginEdgeIndex=firstEdgeIndexes[nodeOrdinal];const endEdgeIndex=firstEdgeIndexes[nodeOrdinal+1];let firstNodeIndex=0;let secondNodeIndex=0;for(let edgeIndex=beginEdgeIndex;edgeIndex<endEdgeIndex&&(!firstNodeIndex||!secondNodeIndex);edgeIndex+=edgeFieldsCount){const edgeType=edges[edgeIndex+edgeTypeOffset];if(edgeType===edgeInternalType){const edgeName=strings[edges[edgeIndex+edgeNameOffset]];if(edgeName==='first')
firstNodeIndex=edges[edgeIndex+edgeToNodeOffset];else if(edgeName==='second')
secondNodeIndex=edges[edgeIndex+edgeToNodeOffset];}}
nodesStack.push(secondNodeIndex);nodesStack.push(firstNodeIndex);}
return name;}
className(){const type=this.type();switch(type){case'hidden':return'(system)';case'object':case'native':return this.name();case'code':return'(compiled code)';default:return'('+type+')';}}
classIndex(){const snapshot=this._snapshot;const nodes=snapshot.nodes;const type=nodes[this.nodeIndex+snapshot._nodeTypeOffset];if(type===snapshot._nodeObjectType||type===snapshot._nodeNativeType)
return nodes[this.nodeIndex+snapshot._nodeNameOffset];return-1-type;}
id(){const snapshot=this._snapshot;return snapshot.nodes[this.nodeIndex+snapshot._nodeIdOffset];}
isHidden(){return this.rawType()===this._snapshot._nodeHiddenType;}
isArray(){return this.rawType()===this._snapshot._nodeArrayType;}
isSynthetic(){return this.rawType()===this._snapshot._nodeSyntheticType;}
isUserRoot(){return!this.isSynthetic();}
isDocumentDOMTreesRoot(){return this.isSynthetic()&&this.name()==='(Document DOM trees)';}
serialize(){const result=super.serialize();const flags=this._snapshot._flagsOfNode(this);if(flags&this._snapshot._nodeFlags.canBeQueried)
result.canBeQueried=true;if(flags&this._snapshot._nodeFlags.detachedDOMTreeNode)
result.detachedDOMTreeNode=true;return result;}};HeapSnapshotWorker.JSHeapSnapshotEdge=class extends HeapSnapshotWorker.HeapSnapshotEdge{constructor(snapshot,edgeIndex){super(snapshot,edgeIndex);}
clone(){const snapshot=(this._snapshot);return new HeapSnapshotWorker.JSHeapSnapshotEdge(snapshot,this.edgeIndex);}
hasStringName(){if(!this.isShortcut())
return this._hasStringName();return isNaN(parseInt(this._name(),10));}
isElement(){return this.rawType()===this._snapshot._edgeElementType;}
isHidden(){return this.rawType()===this._snapshot._edgeHiddenType;}
isWeak(){return this.rawType()===this._snapshot._edgeWeakType;}
isInternal(){return this.rawType()===this._snapshot._edgeInternalType;}
isInvisible(){return this.rawType()===this._snapshot._edgeInvisibleType;}
isShortcut(){return this.rawType()===this._snapshot._edgeShortcutType;}
name(){const name=this._name();if(!this.isShortcut())
return String(name);const numName=parseInt(name,10);return String(isNaN(numName)?name:numName);}
toString(){const name=this.name();switch(this.type()){case'context':return'->'+name;case'element':return'['+name+']';case'weak':return'[['+name+']]';case'property':return name.indexOf(' ')===-1?'.'+name:'["'+name+'"]';case'shortcut':if(typeof name==='string')
return name.indexOf(' ')===-1?'.'+name:'["'+name+'"]';else
return'['+name+']';case'internal':case'hidden':case'invisible':return'{'+name+'}';}
return'?'+name+'?';}
_hasStringName(){const type=this.rawType();const snapshot=this._snapshot;return type!==snapshot._edgeElementType&&type!==snapshot._edgeHiddenType;}
_name(){return this._hasStringName()?this._snapshot.strings[this._nameOrIndex()]:this._nameOrIndex();}
_nameOrIndex(){return this._edges[this.edgeIndex+this._snapshot._edgeNameOffset];}
rawType(){return this._edges[this.edgeIndex+this._snapshot._edgeTypeOffset];}};HeapSnapshotWorker.JSHeapSnapshotRetainerEdge=class extends HeapSnapshotWorker.HeapSnapshotRetainerEdge{constructor(snapshot,retainerIndex){super(snapshot,retainerIndex);}
clone(){const snapshot=(this._snapshot);return new HeapSnapshotWorker.JSHeapSnapshotRetainerEdge(snapshot,this.retainerIndex());}
isHidden(){return this._edge().isHidden();}
isInternal(){return this._edge().isInternal();}
isInvisible(){return this._edge().isInvisible();}
isShortcut(){return this._edge().isShortcut();}
isWeak(){return this._edge().isWeak();}};(function disableLoggingForTest(){if(self.Runtime&&Runtime.queryParam('test'))
console.warn=()=>undefined;})();;HeapSnapshotWorker.HeapSnapshotLoader=class{constructor(dispatcher){this._reset();this._progress=new HeapSnapshotWorker.HeapSnapshotProgress(dispatcher);}
dispose(){this._reset();}
_reset(){this._json='';this._state='find-snapshot-info';this._snapshot={};}
close(){if(this._json)
this._parseStringsArray();}
buildSnapshot(){this._progress.updateStatus('Processing snapshot\u2026');const result=new HeapSnapshotWorker.JSHeapSnapshot(this._snapshot,this._progress);this._reset();return result;}
_parseUintArray(){let index=0;const char0='0'.charCodeAt(0);const char9='9'.charCodeAt(0);const closingBracket=']'.charCodeAt(0);const length=this._json.length;while(true){while(index<length){const code=this._json.charCodeAt(index);if(char0<=code&&code<=char9){break;}else if(code===closingBracket){this._json=this._json.slice(index+1);return false;}
++index;}
if(index===length){this._json='';return true;}
let nextNumber=0;const startIndex=index;while(index<length){const code=this._json.charCodeAt(index);if(char0>code||code>char9)
break;nextNumber*=10;nextNumber+=(code-char0);++index;}
if(index===length){this._json=this._json.slice(startIndex);return true;}
this._array[this._arrayIndex++]=nextNumber;}}
_parseStringsArray(){this._progress.updateStatus('Parsing strings\u2026');const closingBracketIndex=this._json.lastIndexOf(']');if(closingBracketIndex===-1||this._state!=='accumulate-strings')
throw new Error('Incomplete JSON');this._json=this._json.slice(0,closingBracketIndex+1);this._snapshot.strings=JSON.parse(this._json);}
write(chunk){if(this._json!==null)
this._json+=chunk;while(true){switch(this._state){case'find-snapshot-info':{const snapshotToken='"snapshot"';const snapshotTokenIndex=this._json.indexOf(snapshotToken);if(snapshotTokenIndex===-1)
throw new Error('Snapshot token not found');const json=this._json.slice(snapshotTokenIndex+snapshotToken.length+1);this._state='parse-snapshot-info';this._progress.updateStatus('Loading snapshot info\u2026');this._json=null;this._jsonTokenizer=new TextUtils.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this));chunk=json;}
case'parse-snapshot-info':{this._jsonTokenizer.write(chunk);if(this._jsonTokenizer)
return;break;}
case'find-nodes':{const nodesToken='"nodes"';const nodesTokenIndex=this._json.indexOf(nodesToken);if(nodesTokenIndex===-1)
return;const bracketIndex=this._json.indexOf('[',nodesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);const node_fields_count=this._snapshot.snapshot.meta.node_fields.length;const nodes_length=this._snapshot.snapshot.node_count*node_fields_count;this._array=new Uint32Array(nodes_length);this._arrayIndex=0;this._state='parse-nodes';break;}
case'parse-nodes':{const hasMoreData=this._parseUintArray();this._progress.updateProgress('Loading nodes\u2026 %d%%',this._arrayIndex,this._array.length);if(hasMoreData)
return;this._snapshot.nodes=this._array;this._state='find-edges';this._array=null;break;}
case'find-edges':{const edgesToken='"edges"';const edgesTokenIndex=this._json.indexOf(edgesToken);if(edgesTokenIndex===-1)
return;const bracketIndex=this._json.indexOf('[',edgesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);const edge_fields_count=this._snapshot.snapshot.meta.edge_fields.length;const edges_length=this._snapshot.snapshot.edge_count*edge_fields_count;this._array=new Uint32Array(edges_length);this._arrayIndex=0;this._state='parse-edges';break;}
case'parse-edges':{const hasMoreData=this._parseUintArray();this._progress.updateProgress('Loading edges\u2026 %d%%',this._arrayIndex,this._array.length);if(hasMoreData)
return;this._snapshot.edges=this._array;this._array=null;if(this._snapshot.snapshot.trace_function_count){this._state='find-trace-function-infos';this._progress.updateStatus('Loading allocation traces\u2026');}else if(this._snapshot.snapshot.meta.sample_fields){this._state='find-samples';this._progress.updateStatus('Loading samples\u2026');}else{this._state='find-locations';}
break;}
case'find-trace-function-infos':{const tracesToken='"trace_function_infos"';const tracesTokenIndex=this._json.indexOf(tracesToken);if(tracesTokenIndex===-1)
return;const bracketIndex=this._json.indexOf('[',tracesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);const trace_function_info_field_count=this._snapshot.snapshot.meta.trace_function_info_fields.length;const trace_function_info_length=this._snapshot.snapshot.trace_function_count*trace_function_info_field_count;this._array=new Uint32Array(trace_function_info_length);this._arrayIndex=0;this._state='parse-trace-function-infos';break;}
case'parse-trace-function-infos':{if(this._parseUintArray())
return;this._snapshot.trace_function_infos=this._array;this._array=null;this._state='find-trace-tree';break;}
case'find-trace-tree':{const tracesToken='"trace_tree"';const tracesTokenIndex=this._json.indexOf(tracesToken);if(tracesTokenIndex===-1)
return;const bracketIndex=this._json.indexOf('[',tracesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex);this._state='parse-trace-tree';break;}
case'parse-trace-tree':{const nextToken=this._snapshot.snapshot.meta.sample_fields?'"samples"':'"strings"';const nextTokenIndex=this._json.indexOf(nextToken);if(nextTokenIndex===-1)
return;const bracketIndex=this._json.lastIndexOf(']',nextTokenIndex);this._snapshot.trace_tree=JSON.parse(this._json.substring(0,bracketIndex+1));this._json=this._json.slice(bracketIndex+1);if(this._snapshot.snapshot.meta.sample_fields){this._state='find-samples';this._progress.updateStatus('Loading samples\u2026');}else{this._state='find-strings';this._progress.updateStatus('Loading strings\u2026');}
break;}
case'find-samples':{const samplesToken='"samples"';const samplesTokenIndex=this._json.indexOf(samplesToken);if(samplesTokenIndex===-1)
return;const bracketIndex=this._json.indexOf('[',samplesTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);this._array=[];this._arrayIndex=0;this._state='parse-samples';break;}
case'parse-samples':{if(this._parseUintArray())
return;this._snapshot.samples=this._array;this._array=null;this._state='find-locations';this._progress.updateStatus('Loading locations\u2026');break;}
case'find-locations':{if(!this._snapshot.snapshot.meta.location_fields){this._snapshot.locations=[];this._array=null;this._state='find-strings';break;}
const locationsToken='"locations"';const locationsTokenIndex=this._json.indexOf(locationsToken);if(locationsTokenIndex===-1)
return;const bracketIndex=this._json.indexOf('[',locationsTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex+1);this._array=[];this._arrayIndex=0;this._state='parse-locations';break;}
case'parse-locations':{if(this._parseUintArray())
return;this._snapshot.locations=this._array;this._array=null;this._state='find-strings';this._progress.updateStatus('Loading strings\u2026');break;}
case'find-strings':{const stringsToken='"strings"';const stringsTokenIndex=this._json.indexOf(stringsToken);if(stringsTokenIndex===-1)
return;const bracketIndex=this._json.indexOf('[',stringsTokenIndex);if(bracketIndex===-1)
return;this._json=this._json.slice(bracketIndex);this._state='accumulate-strings';break;}
case'accumulate-strings':return;}}}
_writeBalancedJSON(data){this._json=this._jsonTokenizer.remainder();this._jsonTokenizer=null;this._state='find-nodes';this._snapshot.snapshot=(JSON.parse(data));}};;HeapSnapshotWorker.HeapSnapshotWorkerDispatcher=class{constructor(globalObject,postMessage){this._objects=[];this._global=globalObject;this._postMessage=postMessage;}
_findFunction(name){const path=name.split('.');let result=this._global;for(let i=0;i<path.length;++i)
result=result[path[i]];return result;}
sendEvent(name,data){this._postMessage({eventName:name,data:data});}
dispatchMessage(event){const data=(event.data);const response={callId:data.callId};try{switch(data.disposition){case'create':const constructorFunction=this._findFunction(data.methodName);this._objects[data.objectId]=new constructorFunction(this);break;case'dispose':delete this._objects[data.objectId];break;case'getter':{const object=this._objects[data.objectId];const result=object[data.methodName];response.result=result;break;}
case'factory':{const object=this._objects[data.objectId];const result=object[data.methodName].apply(object,data.methodArguments);if(result)
this._objects[data.newObjectId]=result;response.result=!!result;break;}
case'method':{const object=this._objects[data.objectId];response.result=object[data.methodName].apply(object,data.methodArguments);break;}
case'evaluateForTest':try{response.result=self.eval(data.source);}catch(e){response.result=e.toString();}
break;}}catch(e){response.error=e.toString();response.errorCallStack=e.stack;if(data.methodName)
response.errorMethodName=data.methodName;}
this._postMessage(response);}};;function postMessageWrapper(message){postMessage(message);}
const dispatcher=new HeapSnapshotWorker.HeapSnapshotWorkerDispatcher(this,postMessageWrapper);function installMessageEventListener(listener){self.addEventListener('message',listener,false);}
installMessageEventListener(dispatcher.dispatchMessage.bind(dispatcher));;;;if(!self.Runtime)
self.importScripts('Runtime.js');Runtime.startWorker('heap_snapshot_worker');