var allDescriptors=[{"dependencies":[],"name":"platform"},{"dependencies":["platform","dom_extension"],"name":"toolbox_bootstrap"},{"dependencies":["platform"],"name":"dom_extension"}];var applicationDescriptor;var _loadedScripts={};for(var k of[]){}
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
ServicePort.prototype={setHandlers(messageHandler,closeHandler){},send(message){},close(){}};var runtime;self['Platform']=self['Platform']||{};var ArrayLike;function mod(m,n){return((m%n)+n)%n;}
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
self.addEventListener('DOMContentLoaded',windowLoaded,false);};self['DomExtension']=self['DomExtension']||{};Node.prototype.rangeOfWord=function(offset,stopCharacters,stayWithinNode,direction){var startNode;var startOffset=0;var endNode;var endOffset=0;if(!stayWithinNode)
stayWithinNode=this;if(!direction||direction==='backward'||direction==='both'){var node=this;while(node){if(node===stayWithinNode){if(!startNode)
startNode=stayWithinNode;break;}
if(node.nodeType===Node.TEXT_NODE){var start=(node===this?(offset-1):(node.nodeValue.length-1));for(var i=start;i>=0;--i){if(stopCharacters.indexOf(node.nodeValue[i])!==-1){startNode=node;startOffset=i+1;break;}}}
if(startNode)
break;node=node.traversePreviousNode(stayWithinNode);}
if(!startNode){startNode=stayWithinNode;startOffset=0;}}else{startNode=this;startOffset=offset;}
if(!direction||direction==='forward'||direction==='both'){node=this;while(node){if(node===stayWithinNode){if(!endNode)
endNode=stayWithinNode;break;}
if(node.nodeType===Node.TEXT_NODE){var start=(node===this?offset:0);for(var i=start;i<node.nodeValue.length;++i){if(stopCharacters.indexOf(node.nodeValue[i])!==-1){endNode=node;endOffset=i;break;}}}
if(endNode)
break;node=node.traverseNextNode(stayWithinNode);}
if(!endNode){endNode=stayWithinNode;endOffset=stayWithinNode.nodeType===Node.TEXT_NODE?stayWithinNode.nodeValue.length:stayWithinNode.childNodes.length;}}else{endNode=this;endOffset=offset;}
var result=this.ownerDocument.createRange();result.setStart(startNode,startOffset);result.setEnd(endNode,endOffset);return result;};Node.prototype.traverseNextTextNode=function(stayWithin){var node=this.traverseNextNode(stayWithin);if(!node)
return null;var nonTextTags={'STYLE':1,'SCRIPT':1};while(node&&(node.nodeType!==Node.TEXT_NODE||nonTextTags[node.parentElement.nodeName]))
node=node.traverseNextNode(stayWithin);return node;};Element.prototype.positionAt=function(x,y,relativeTo){var shift={x:0,y:0};if(relativeTo)
shift=relativeTo.boxInWindow(this.ownerDocument.defaultView);if(typeof x==='number')
this.style.setProperty('left',(shift.x+x)+'px');else
this.style.removeProperty('left');if(typeof y==='number')
this.style.setProperty('top',(shift.y+y)+'px');else
this.style.removeProperty('top');if(typeof x==='number'||typeof y==='number')
this.style.setProperty('position','absolute');else
this.style.removeProperty('position');};Element.prototype.isScrolledToBottom=function(){return Math.abs(this.scrollTop+this.clientHeight-this.scrollHeight)<=2;};Node.prototype.enclosingNodeOrSelfWithNodeNameInArray=function(nameArray){for(var node=this;node&&node!==this.ownerDocument;node=node.parentNodeOrShadowHost()){for(var i=0;i<nameArray.length;++i){if(node.nodeName.toLowerCase()===nameArray[i].toLowerCase())
return node;}}
return null;};Node.prototype.enclosingNodeOrSelfWithNodeName=function(nodeName){return this.enclosingNodeOrSelfWithNodeNameInArray([nodeName]);};Node.prototype.enclosingNodeOrSelfWithClass=function(className,stayWithin){return this.enclosingNodeOrSelfWithClassList([className],stayWithin);};Node.prototype.enclosingNodeOrSelfWithClassList=function(classNames,stayWithin){for(var node=this;node&&node!==stayWithin&&node!==this.ownerDocument;node=node.parentNodeOrShadowHost()){if(node.nodeType===Node.ELEMENT_NODE){var containsAll=true;for(var i=0;i<classNames.length&&containsAll;++i){if(!node.classList.contains(classNames[i]))
containsAll=false;}
if(containsAll)
return(node);}}
return null;};Node.prototype.parentElementOrShadowHost=function(){var node=this.parentNode;if(!node)
return null;if(node.nodeType===Node.ELEMENT_NODE)
return(node);if(node.nodeType===Node.DOCUMENT_FRAGMENT_NODE)
return(node.host);return null;};Node.prototype.parentNodeOrShadowHost=function(){if(this.parentNode)
return this.parentNode;if(this.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&this.host)
return this.host;return null;};Node.prototype.getComponentSelection=function(){var parent=this.parentNode;while(parent&&parent.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)
parent=parent.parentNode;return parent instanceof ShadowRoot?parent.getSelection():this.window().getSelection();};Node.prototype.isComponentSelectionCollapsed=function(){var selection=this.getComponentSelection();var range=selection&&selection.rangeCount?selection.getRangeAt(0):null;return range?range.collapsed:true;};Node.prototype.hasSelection=function(){var contents=this.querySelectorAll('content');for(var content of contents){if(Array.prototype.some.call(content.getDistributedNodes(),node=>node.hasSelection()))
return true;}
if(this.isComponentSelectionCollapsed())
return false;return this.getComponentSelection().containsNode(this,true);};Node.prototype.getDeepSelection=function(){var activeElement=this.ownerDocument.activeElement;var shadowRoot=null;while(activeElement&&activeElement.shadowRoot){shadowRoot=activeElement.shadowRoot;activeElement=shadowRoot.activeElement;}
return shadowRoot?shadowRoot.getSelection():this.window().getSelection();};Node.prototype.window=function(){return this.ownerDocument.defaultView;};Element.prototype.removeChildren=function(){if(this.firstChild)
this.textContent='';};function createElement(tagName,customElementType){return document.createElement(tagName,customElementType||'');}
function createTextNode(data){return document.createTextNode(data);}
Document.prototype.createElementWithClass=function(elementName,className,customElementType){var element=this.createElement(elementName,customElementType||'');if(className)
element.className=className;return element;};function createElementWithClass(elementName,className,customElementType){return document.createElementWithClass(elementName,className,customElementType);}
Document.prototype.createSVGElement=function(childType,className){var element=this.createElementNS('http://www.w3.org/2000/svg',childType);if(className)
element.setAttribute('class',className);return element;};function createSVGElement(childType,className){return document.createSVGElement(childType,className);}
function createDocumentFragment(){return document.createDocumentFragment();}
Element.prototype.createChild=function(elementName,className,customElementType){var element=this.ownerDocument.createElementWithClass(elementName,className,customElementType);this.appendChild(element);return element;};DocumentFragment.prototype.createChild=Element.prototype.createChild;Element.prototype.createTextChild=function(text){var element=this.ownerDocument.createTextNode(text);this.appendChild(element);return element;};DocumentFragment.prototype.createTextChild=Element.prototype.createTextChild;Element.prototype.createTextChildren=function(var_args){for(var i=0,n=arguments.length;i<n;++i)
this.createTextChild(arguments[i]);};DocumentFragment.prototype.createTextChildren=Element.prototype.createTextChildren;Element.prototype.totalOffsetLeft=function(){return this.totalOffset().left;};Element.prototype.totalOffsetTop=function(){return this.totalOffset().top;};Element.prototype.totalOffset=function(){var rect=this.getBoundingClientRect();return{left:rect.left,top:rect.top};};Element.prototype.createSVGChild=function(childType,className){var child=this.ownerDocument.createSVGElement(childType,className);this.appendChild(child);return child;};var AnchorBox=class{constructor(x,y,width,height){this.x=x||0;this.y=y||0;this.width=width||0;this.height=height||0;}};AnchorBox.prototype.relativeTo=function(box){return new AnchorBox(this.x-box.x,this.y-box.y,this.width,this.height);};AnchorBox.prototype.relativeToElement=function(element){return this.relativeTo(element.boxInWindow(element.ownerDocument.defaultView));};AnchorBox.prototype.equals=function(anchorBox){return!!anchorBox&&this.x===anchorBox.x&&this.y===anchorBox.y&&this.width===anchorBox.width&&this.height===anchorBox.height;};Element.prototype.boxInWindow=function(targetWindow){targetWindow=targetWindow||this.ownerDocument.defaultView;var anchorBox=new AnchorBox();var curElement=this;var curWindow=this.ownerDocument.defaultView;while(curWindow&&curElement){anchorBox.x+=curElement.totalOffsetLeft();anchorBox.y+=curElement.totalOffsetTop();if(curWindow===targetWindow)
break;curElement=curWindow.frameElement;curWindow=curWindow.parent;}
anchorBox.width=Math.min(this.offsetWidth,targetWindow.innerWidth-anchorBox.x);anchorBox.height=Math.min(this.offsetHeight,targetWindow.innerHeight-anchorBox.y);return anchorBox;};Event.prototype.consume=function(preventDefault){this.stopImmediatePropagation();if(preventDefault)
this.preventDefault();this.handled=true;};Text.prototype.select=function(start,end){start=start||0;end=end||this.textContent.length;if(start<0)
start=end+start;var selection=this.getComponentSelection();selection.removeAllRanges();var range=this.ownerDocument.createRange();range.setStart(this,start);range.setEnd(this,end);selection.addRange(range);return this;};Element.prototype.selectionLeftOffset=function(){var selection=this.getComponentSelection();if(!selection.containsNode(this,true))
return null;var leftOffset=selection.anchorOffset;var node=selection.anchorNode;while(node!==this){while(node.previousSibling){node=node.previousSibling;leftOffset+=node.textContent.length;}
node=node.parentNodeOrShadowHost();}
return leftOffset;};Node.prototype.appendChildren=function(var_args){for(var i=0,n=arguments.length;i<n;++i)
this.appendChild(arguments[i]);};Node.prototype.deepTextContent=function(){return this.childTextNodes().map(function(node){return node.textContent;}).join('');};Node.prototype.childTextNodes=function(){var node=this.traverseNextTextNode(this);var result=[];var nonTextTags={'STYLE':1,'SCRIPT':1};while(node){if(!nonTextTags[node.parentElement.nodeName])
result.push(node);node=node.traverseNextTextNode(this);}
return result;};Node.prototype.isAncestor=function(node){if(!node)
return false;var currentNode=node.parentNodeOrShadowHost();while(currentNode){if(this===currentNode)
return true;currentNode=currentNode.parentNodeOrShadowHost();}
return false;};Node.prototype.isDescendant=function(descendant){return!!descendant&&descendant.isAncestor(this);};Node.prototype.isSelfOrAncestor=function(node){return!!node&&(node===this||this.isAncestor(node));};Node.prototype.isSelfOrDescendant=function(node){return!!node&&(node===this||this.isDescendant(node));};Node.prototype.traverseNextNode=function(stayWithin){if(this.shadowRoot)
return this.shadowRoot;var distributedNodes=this.getDistributedNodes?this.getDistributedNodes():[];if(distributedNodes.length)
return distributedNodes[0];if(this.firstChild)
return this.firstChild;var node=this;while(node){if(stayWithin&&node===stayWithin)
return null;var sibling=nextSibling(node);if(sibling)
return sibling;node=insertionPoint(node)||node.parentNodeOrShadowHost();}
function nextSibling(node){var parent=insertionPoint(node);if(!parent)
return node.nextSibling;var distributedNodes=parent.getDistributedNodes?parent.getDistributedNodes():[];var position=Array.prototype.indexOf.call(distributedNodes,node);if(position+1<distributedNodes.length)
return distributedNodes[position+1];return null;}
function insertionPoint(node){var insertionPoints=node.getDestinationInsertionPoints?node.getDestinationInsertionPoints():[];return insertionPoints.length>0?insertionPoints[insertionPoints.length-1]:null;}
return null;};Node.prototype.traversePreviousNode=function(stayWithin){if(stayWithin&&this===stayWithin)
return null;var node=this.previousSibling;while(node&&node.lastChild)
node=node.lastChild;if(node)
return node;return this.parentNodeOrShadowHost();};Node.prototype.setTextContentTruncatedIfNeeded=function(text,placeholder){const maxTextContentLength=10000;if(typeof text==='string'&&text.length>maxTextContentLength){this.textContent=typeof placeholder==='string'?placeholder:text.trimMiddle(maxTextContentLength);return true;}
this.textContent=text;return false;};Event.prototype.deepElementFromPoint=function(){var root=this.target&&this.target.getComponentRoot();return root?root.deepElementFromPoint(this.pageX,this.pageY):null;};Document.prototype.deepElementFromPoint=function(x,y){var container=this;var node=null;while(container){var innerNode=container.elementFromPoint(x,y);if(!innerNode)
break;node=innerNode;container=node.shadowRoot;}
return node;};DocumentFragment.prototype.deepElementFromPoint=Document.prototype.deepElementFromPoint;Document.prototype.deepActiveElement=function(){var activeElement=this.activeElement;while(activeElement&&activeElement.shadowRoot&&activeElement.shadowRoot.activeElement)
activeElement=activeElement.shadowRoot.activeElement;return activeElement;};DocumentFragment.prototype.deepActiveElement=Document.prototype.deepActiveElement;Element.prototype.hasFocus=function(){var root=this.getComponentRoot();return!!root&&this.isSelfOrAncestor(root.activeElement);};Node.prototype.getComponentRoot=function(){var node=this;while(node&&node.nodeType!==Node.DOCUMENT_FRAGMENT_NODE&&node.nodeType!==Node.DOCUMENT_NODE)
node=node.parentNode;return(node);};function isEnterKey(event){return event.keyCode!==229&&event.key==='Enter';}
function isEscKey(event){return event.keyCode===27;};self['ToolboxBootstrap']=self['ToolboxBootstrap']||{};(function(){function toolboxLoaded(){if(!window.opener)
return;var app=window.opener['Emulation']['AdvancedApp']['_instance']();app['toolboxLoaded'](document);}
runOnWindowLoad(toolboxLoaded);})();;applicationDescriptor={"has_html":true,"modules":[{"type":"autostart","name":"platform"},{"type":"autostart","name":"toolbox_bootstrap"},{"type":"autostart","name":"dom_extension"}]};Runtime.startApplication('toolbox');