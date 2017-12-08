var allDescriptors=[{"dependencies":[],"name":"platform"},{"skip_compilation":["acorn/acorn.js","../cm_web_modes/css.js","../cm_web_modes/xml.js"],"dependencies":["platform","cm_headless"],"name":"formatter_worker"},{"skip_compilation":["headlesscodemirror.js"],"name":"cm_headless"},{"skip_compilation":["gonzales-scss.js"],"dependencies":["formatter_worker"],"extensions":[{"className":"Gonzales.SCSSParser","mimeType":"text/x-scss","type":"@FormatterWorker.FormatterWorkerContentParser"}],"name":"gonzales","scripts":["gonzales_module.js"]}];var applicationDescriptor;var _loadedScripts={};for(var k of[]){}
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
self.addEventListener('DOMContentLoaded',windowLoaded,false);};self['CmHeadless']=self['CmHeadless']||{};(function(window){window.CodeMirror={};(function(){"use strict";function splitLines(string){return string.split(/\r?\n|\r/);};function StringStream(string){this.pos=this.start=0;this.string=string;this.lineStart=0;}
StringStream.prototype={eol:function(){return this.pos>=this.string.length;},sol:function(){return this.pos==0;},peek:function(){return this.string.charAt(this.pos)||null;},next:function(){if(this.pos<this.string.length)
return this.string.charAt(this.pos++);},eat:function(match){var ch=this.string.charAt(this.pos);if(typeof match=="string")var ok=ch==match;else var ok=ch&&(match.test?match.test(ch):match(ch));if(ok){++this.pos;return ch;}},eatWhile:function(match){var start=this.pos;while(this.eat(match)){}
return this.pos>start;},eatSpace:function(){var start=this.pos;while(/[\s\u00a0]/.test(this.string.charAt(this.pos)))++this.pos;return this.pos>start;},skipToEnd:function(){this.pos=this.string.length;},skipTo:function(ch){var found=this.string.indexOf(ch,this.pos);if(found>-1){this.pos=found;return true;}},backUp:function(n){this.pos-=n;},column:function(){return this.start-this.lineStart;},indentation:function(){return 0;},match:function(pattern,consume,caseInsensitive){if(typeof pattern=="string"){var cased=function(str){return caseInsensitive?str.toLowerCase():str;};var substr=this.string.substr(this.pos,pattern.length);if(cased(substr)==cased(pattern)){if(consume!==false)this.pos+=pattern.length;return true;}}else{var match=this.string.slice(this.pos).match(pattern);if(match&&match.index>0)return null;if(match&&consume!==false)this.pos+=match[0].length;return match;}},current:function(){return this.string.slice(this.start,this.pos);},hideFirstChars:function(n,inner){this.lineStart+=n;try{return inner();}
finally{this.lineStart-=n;}}};CodeMirror.StringStream=StringStream;CodeMirror.startState=function(mode,a1,a2){return mode.startState?mode.startState(a1,a2):true;};var modes=CodeMirror.modes={},mimeModes=CodeMirror.mimeModes={};CodeMirror.defineMode=function(name,mode){if(arguments.length>2)
mode.dependencies=Array.prototype.slice.call(arguments,2);modes[name]=mode;};CodeMirror.defineMIME=function(mime,spec){mimeModes[mime]=spec;};CodeMirror.resolveMode=function(spec){if(typeof spec=="string"&&mimeModes.hasOwnProperty(spec)){spec=mimeModes[spec];}else if(spec&&typeof spec.name=="string"&&mimeModes.hasOwnProperty(spec.name)){spec=mimeModes[spec.name];}
if(typeof spec=="string")return{name:spec};else return spec||{name:"null"};};CodeMirror.getMode=function(options,spec){spec=CodeMirror.resolveMode(spec);var mfactory=modes[spec.name];if(!mfactory)throw new Error("Unknown mode: "+spec);return mfactory(options,spec);};CodeMirror.registerHelper=CodeMirror.registerGlobalHelper=Math.min;CodeMirror.defineMode("null",function(){return{token:function(stream){stream.skipToEnd();}};});CodeMirror.defineMIME("text/plain","null");CodeMirror.runMode=function(string,modespec,callback,options){var mode=CodeMirror.getMode({indentUnit:2},modespec);if(callback.nodeType==1){var tabSize=(options&&options.tabSize)||4;var node=callback,col=0;node.innerHTML="";callback=function(text,style){if(text=="\n"){node.appendChild(document.createElement("br"));col=0;return;}
var content="";for(var pos=0;;){var idx=text.indexOf("\t",pos);if(idx==-1){content+=text.slice(pos);col+=text.length-pos;break;}else{col+=idx-pos;content+=text.slice(pos,idx);var size=tabSize-col%tabSize;col+=size;for(var i=0;i<size;++i)content+=" ";pos=idx+1;}}
if(style){var sp=node.appendChild(document.createElement("span"));sp.className="cm-"+style.replace(/ +/g," cm-");sp.appendChild(document.createTextNode(content));}else{node.appendChild(document.createTextNode(content));}};}
var lines=splitLines(string),state=(options&&options.state)||CodeMirror.startState(mode);for(var i=0,e=lines.length;i<e;++i){if(i)callback("\n");var stream=new CodeMirror.StringStream(lines[i]);if(!stream.string&&mode.blankLine)mode.blankLine(state);while(!stream.eol()){var style=mode.token(stream,state);callback(stream.current(),style,i,stream.start,state);stream.start=stream.pos;}}};})();}(this));self['FormatterWorker']=self['FormatterWorker']||{};(function(mod){if(typeof exports=="object"&&typeof module=="object")
mod(require("../../lib/codemirror"));else if(typeof define=="function"&&define.amd)
define(["../../lib/codemirror"],mod);else
mod(CodeMirror);})(function(CodeMirror){"use strict";CodeMirror.defineMode("css",function(config,parserConfig){var inline=parserConfig.inline
if(!parserConfig.propertyKeywords)parserConfig=CodeMirror.resolveMode("text/css");var indentUnit=config.indentUnit,tokenHooks=parserConfig.tokenHooks,documentTypes=parserConfig.documentTypes||{},mediaTypes=parserConfig.mediaTypes||{},mediaFeatures=parserConfig.mediaFeatures||{},mediaValueKeywords=parserConfig.mediaValueKeywords||{},propertyKeywords=parserConfig.propertyKeywords||{},nonStandardPropertyKeywords=parserConfig.nonStandardPropertyKeywords||{},fontProperties=parserConfig.fontProperties||{},counterDescriptors=parserConfig.counterDescriptors||{},colorKeywords=parserConfig.colorKeywords||{},valueKeywords=parserConfig.valueKeywords||{},allowNested=parserConfig.allowNested,supportsAtComponent=parserConfig.supportsAtComponent===true;var type,override;function ret(style,tp){type=tp;return style;}
function tokenBase(stream,state){var ch=stream.next();if(tokenHooks[ch]){var result=tokenHooks[ch](stream,state);if(result!==false)return result;}
if(ch=="@"){stream.eatWhile(/[\w\\\-]/);return ret("def",stream.current());}else if(ch=="="||(ch=="~"||ch=="|")&&stream.eat("=")){return ret(null,"compare");}else if(ch=="\""||ch=="'"){state.tokenize=tokenString(ch);return state.tokenize(stream,state);}else if(ch=="#"){stream.eatWhile(/[\w\\\-]/);return ret("atom","hash");}else if(ch=="!"){stream.match(/^\s*\w*/);return ret("keyword","important");}else if(/\d/.test(ch)||ch=="."&&stream.eat(/\d/)){stream.eatWhile(/[\w.%]/);return ret("number","unit");}else if(ch==="-"){if(/[\d.]/.test(stream.peek())){stream.eatWhile(/[\w.%]/);return ret("number","unit");}else if(stream.match(/^-[\w\\\-]+/)){stream.eatWhile(/[\w\\\-]/);if(stream.match(/^\s*:/,false))
return ret("variable-2","variable-definition");return ret("variable-2","variable");}else if(stream.match(/^\w+-/)){return ret("meta","meta");}}else if(/[,+>*\/]/.test(ch)){return ret(null,"select-op");}else if(ch=="."&&stream.match(/^-?[_a-z][_a-z0-9-]*/i)){return ret("qualifier","qualifier");}else if(/[:;{}\[\]\(\)]/.test(ch)){return ret(null,ch);}else if((ch=="u"&&stream.match(/rl(-prefix)?\(/))||(ch=="d"&&stream.match("omain("))||(ch=="r"&&stream.match("egexp("))){stream.backUp(1);state.tokenize=tokenParenthesized;return ret("property","word");}else if(/[\w\\\-]/.test(ch)){stream.eatWhile(/[\w\\\-]/);return ret("property","word");}else{return ret(null,null);}}
function tokenString(quote){return function(stream,state){var escaped=false,ch;while((ch=stream.next())!=null){if(ch==quote&&!escaped){if(quote==")")stream.backUp(1);break;}
escaped=!escaped&&ch=="\\";}
if(ch==quote||!escaped&&quote!=")")state.tokenize=null;return ret("string","string");};}
function tokenParenthesized(stream,state){stream.next();if(!stream.match(/\s*[\"\')]/,false))
state.tokenize=tokenString(")");else
state.tokenize=null;return ret(null,"(");}
function Context(type,indent,prev){this.type=type;this.indent=indent;this.prev=prev;}
function pushContext(state,stream,type,indent){state.context=new Context(type,stream.indentation()+(indent===false?0:indentUnit),state.context);return type;}
function popContext(state){if(state.context.prev)
state.context=state.context.prev;return state.context.type;}
function pass(type,stream,state){return states[state.context.type](type,stream,state);}
function popAndPass(type,stream,state,n){for(var i=n||1;i>0;i--)
state.context=state.context.prev;return pass(type,stream,state);}
function wordAsValue(stream){var word=stream.current().toLowerCase();if(valueKeywords.hasOwnProperty(word))
override="atom";else if(colorKeywords.hasOwnProperty(word))
override="keyword";else
override="variable";}
var states={};states.top=function(type,stream,state){if(type=="{"){return pushContext(state,stream,"block");}else if(type=="}"&&state.context.prev){return popContext(state);}else if(supportsAtComponent&&/@component/.test(type)){return pushContext(state,stream,"atComponentBlock");}else if(/^@(-moz-)?document$/.test(type)){return pushContext(state,stream,"documentTypes");}else if(/^@(media|supports|(-moz-)?document|import)$/.test(type)){return pushContext(state,stream,"atBlock");}else if(/^@(font-face|counter-style)/.test(type)){state.stateArg=type;return"restricted_atBlock_before";}else if(/^@(-(moz|ms|o|webkit)-)?keyframes$/.test(type)){return"keyframes";}else if(type&&type.charAt(0)=="@"){return pushContext(state,stream,"at");}else if(type=="hash"){override="builtin";}else if(type=="word"){override="tag";}else if(type=="variable-definition"){return"maybeprop";}else if(type=="interpolation"){return pushContext(state,stream,"interpolation");}else if(type==":"){return"pseudo";}else if(allowNested&&type=="("){return pushContext(state,stream,"parens");}
return state.context.type;};states.block=function(type,stream,state){if(type=="word"){var word=stream.current().toLowerCase();if(propertyKeywords.hasOwnProperty(word)){override="property";return"maybeprop";}else if(nonStandardPropertyKeywords.hasOwnProperty(word)){override="string-2";return"maybeprop";}else if(allowNested){override=stream.match(/^\s*:(?:\s|$)/,false)?"property":"tag";return"block";}else{override+=" error";return"maybeprop";}}else if(type=="meta"){return"block";}else if(!allowNested&&(type=="hash"||type=="qualifier")){override="error";return"block";}else{return states.top(type,stream,state);}};states.maybeprop=function(type,stream,state){if(type==":")return pushContext(state,stream,"prop");return pass(type,stream,state);};states.prop=function(type,stream,state){if(type==";")return popContext(state);if(type=="{"&&allowNested)return pushContext(state,stream,"propBlock");if(type=="}"||type=="{")return popAndPass(type,stream,state);if(type=="(")return pushContext(state,stream,"parens");if(type=="hash"&&!/^#([0-9a-fA-f]{3,4}|[0-9a-fA-f]{6}|[0-9a-fA-f]{8})$/.test(stream.current())){override+=" error";}else if(type=="word"){wordAsValue(stream);}else if(type=="interpolation"){return pushContext(state,stream,"interpolation");}
return"prop";};states.propBlock=function(type,_stream,state){if(type=="}")return popContext(state);if(type=="word"){override="property";return"maybeprop";}
return state.context.type;};states.parens=function(type,stream,state){if(type=="{"||type=="}")return popAndPass(type,stream,state);if(type==")")return popContext(state);if(type=="(")return pushContext(state,stream,"parens");if(type=="interpolation")return pushContext(state,stream,"interpolation");if(type=="word")wordAsValue(stream);return"parens";};states.pseudo=function(type,stream,state){if(type=="word"){override="variable-3";return state.context.type;}
return pass(type,stream,state);};states.documentTypes=function(type,stream,state){if(type=="word"&&documentTypes.hasOwnProperty(stream.current())){override="tag";return state.context.type;}else{return states.atBlock(type,stream,state);}};states.atBlock=function(type,stream,state){if(type=="(")return pushContext(state,stream,"atBlock_parens");if(type=="}"||type==";")return popAndPass(type,stream,state);if(type=="{")return popContext(state)&&pushContext(state,stream,allowNested?"block":"top");if(type=="interpolation")return pushContext(state,stream,"interpolation");if(type=="word"){var word=stream.current().toLowerCase();if(word=="only"||word=="not"||word=="and"||word=="or")
override="keyword";else if(mediaTypes.hasOwnProperty(word))
override="attribute";else if(mediaFeatures.hasOwnProperty(word))
override="property";else if(mediaValueKeywords.hasOwnProperty(word))
override="keyword";else if(propertyKeywords.hasOwnProperty(word))
override="property";else if(nonStandardPropertyKeywords.hasOwnProperty(word))
override="string-2";else if(valueKeywords.hasOwnProperty(word))
override="atom";else if(colorKeywords.hasOwnProperty(word))
override="keyword";else
override="error";}
return state.context.type;};states.atComponentBlock=function(type,stream,state){if(type=="}")
return popAndPass(type,stream,state);if(type=="{")
return popContext(state)&&pushContext(state,stream,allowNested?"block":"top",false);if(type=="word")
override="error";return state.context.type;};states.atBlock_parens=function(type,stream,state){if(type==")")return popContext(state);if(type=="{"||type=="}")return popAndPass(type,stream,state,2);return states.atBlock(type,stream,state);};states.restricted_atBlock_before=function(type,stream,state){if(type=="{")
return pushContext(state,stream,"restricted_atBlock");if(type=="word"&&state.stateArg=="@counter-style"){override="variable";return"restricted_atBlock_before";}
return pass(type,stream,state);};states.restricted_atBlock=function(type,stream,state){if(type=="}"){state.stateArg=null;return popContext(state);}
if(type=="word"){if((state.stateArg=="@font-face"&&!fontProperties.hasOwnProperty(stream.current().toLowerCase()))||(state.stateArg=="@counter-style"&&!counterDescriptors.hasOwnProperty(stream.current().toLowerCase())))
override="error";else
override="property";return"maybeprop";}
return"restricted_atBlock";};states.keyframes=function(type,stream,state){if(type=="word"){override="variable";return"keyframes";}
if(type=="{")return pushContext(state,stream,"top");return pass(type,stream,state);};states.at=function(type,stream,state){if(type==";")return popContext(state);if(type=="{"||type=="}")return popAndPass(type,stream,state);if(type=="word")override="tag";else if(type=="hash")override="builtin";return"at";};states.interpolation=function(type,stream,state){if(type=="}")return popContext(state);if(type=="{"||type==";")return popAndPass(type,stream,state);if(type=="word")override="variable";else if(type!="variable"&&type!="("&&type!=")")override="error";return"interpolation";};return{startState:function(base){return{tokenize:null,state:inline?"block":"top",stateArg:null,context:new Context(inline?"block":"top",base||0,null)};},token:function(stream,state){if(!state.tokenize&&stream.eatSpace())return null;var style=(state.tokenize||tokenBase)(stream,state);if(style&&typeof style=="object"){type=style[1];style=style[0];}
override=style;state.state=states[state.state](type,stream,state);return override;},indent:function(state,textAfter){var cx=state.context,ch=textAfter&&textAfter.charAt(0);var indent=cx.indent;if(cx.type=="prop"&&(ch=="}"||ch==")"))cx=cx.prev;if(cx.prev){if(ch=="}"&&(cx.type=="block"||cx.type=="top"||cx.type=="interpolation"||cx.type=="restricted_atBlock")){cx=cx.prev;indent=cx.indent;}else if(ch==")"&&(cx.type=="parens"||cx.type=="atBlock_parens")||ch=="{"&&(cx.type=="at"||cx.type=="atBlock")){indent=Math.max(0,cx.indent-indentUnit);cx=cx.prev;}}
return indent;},electricChars:"}",blockCommentStart:"/*",blockCommentEnd:"*/",fold:"brace"};});function keySet(array){var keys={};for(var i=0;i<array.length;++i){keys[array[i]]=true;}
return keys;}
var documentTypes_=["domain","regexp","url","url-prefix"],documentTypes=keySet(documentTypes_);var mediaTypes_=["all","aural","braille","handheld","print","projection","screen","tty","tv","embossed"],mediaTypes=keySet(mediaTypes_);var mediaFeatures_=["width","min-width","max-width","height","min-height","max-height","device-width","min-device-width","max-device-width","device-height","min-device-height","max-device-height","aspect-ratio","min-aspect-ratio","max-aspect-ratio","device-aspect-ratio","min-device-aspect-ratio","max-device-aspect-ratio","color","min-color","max-color","color-index","min-color-index","max-color-index","monochrome","min-monochrome","max-monochrome","resolution","min-resolution","max-resolution","scan","grid","orientation","device-pixel-ratio","min-device-pixel-ratio","max-device-pixel-ratio","pointer","any-pointer","hover","any-hover"],mediaFeatures=keySet(mediaFeatures_);var mediaValueKeywords_=["landscape","portrait","none","coarse","fine","on-demand","hover","interlace","progressive"],mediaValueKeywords=keySet(mediaValueKeywords_);var propertyKeywords_=["align-content","align-items","align-self","alignment-adjust","alignment-baseline","anchor-point","animation","animation-delay","animation-direction","animation-duration","animation-fill-mode","animation-iteration-count","animation-name","animation-play-state","animation-timing-function","appearance","azimuth","backface-visibility","background","background-attachment","background-blend-mode","background-clip","background-color","background-image","background-origin","background-position","background-repeat","background-size","baseline-shift","binding","bleed","bookmark-label","bookmark-level","bookmark-state","bookmark-target","border","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius","border-bottom-style","border-bottom-width","border-collapse","border-color","border-image","border-image-outset","border-image-repeat","border-image-slice","border-image-source","border-image-width","border-left","border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color","border-right-style","border-right-width","border-spacing","border-style","border-top","border-top-color","border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width","bottom","box-decoration-break","box-shadow","box-sizing","break-after","break-before","break-inside","caption-side","clear","clip","color","color-profile","column-count","column-fill","column-gap","column-rule","column-rule-color","column-rule-style","column-rule-width","column-span","column-width","columns","content","counter-increment","counter-reset","crop","cue","cue-after","cue-before","cursor","direction","display","dominant-baseline","drop-initial-after-adjust","drop-initial-after-align","drop-initial-before-adjust","drop-initial-before-align","drop-initial-size","drop-initial-value","elevation","empty-cells","fit","fit-position","flex","flex-basis","flex-direction","flex-flow","flex-grow","flex-shrink","flex-wrap","float","float-offset","flow-from","flow-into","font","font-feature-settings","font-family","font-kerning","font-language-override","font-size","font-size-adjust","font-stretch","font-style","font-synthesis","font-variant","font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-ligatures","font-variant-numeric","font-variant-position","font-weight","grid","grid-area","grid-auto-columns","grid-auto-flow","grid-auto-rows","grid-column","grid-column-end","grid-column-gap","grid-column-start","grid-gap","grid-row","grid-row-end","grid-row-gap","grid-row-start","grid-template","grid-template-areas","grid-template-columns","grid-template-rows","hanging-punctuation","height","hyphens","icon","image-orientation","image-rendering","image-resolution","inline-box-align","justify-content","left","letter-spacing","line-break","line-height","line-stacking","line-stacking-ruby","line-stacking-shift","line-stacking-strategy","list-style","list-style-image","list-style-position","list-style-type","margin","margin-bottom","margin-left","margin-right","margin-top","marker-offset","marks","marquee-direction","marquee-loop","marquee-play-count","marquee-speed","marquee-style","max-height","max-width","min-height","min-width","move-to","nav-down","nav-index","nav-left","nav-right","nav-up","object-fit","object-position","opacity","order","orphans","outline","outline-color","outline-offset","outline-style","outline-width","overflow","overflow-style","overflow-wrap","overflow-x","overflow-y","padding","padding-bottom","padding-left","padding-right","padding-top","page","page-break-after","page-break-before","page-break-inside","page-policy","pause","pause-after","pause-before","perspective","perspective-origin","pitch","pitch-range","play-during","position","presentation-level","punctuation-trim","quotes","region-break-after","region-break-before","region-break-inside","region-fragment","rendering-intent","resize","rest","rest-after","rest-before","richness","right","rotation","rotation-point","ruby-align","ruby-overhang","ruby-position","ruby-span","shape-image-threshold","shape-inside","shape-margin","shape-outside","size","speak","speak-as","speak-header","speak-numeral","speak-punctuation","speech-rate","stress","string-set","tab-size","table-layout","target","target-name","target-new","target-position","text-align","text-align-last","text-decoration","text-decoration-color","text-decoration-line","text-decoration-skip","text-decoration-style","text-emphasis","text-emphasis-color","text-emphasis-position","text-emphasis-style","text-height","text-indent","text-justify","text-outline","text-overflow","text-shadow","text-size-adjust","text-space-collapse","text-transform","text-underline-position","text-wrap","top","transform","transform-origin","transform-style","transition","transition-delay","transition-duration","transition-property","transition-timing-function","unicode-bidi","vertical-align","visibility","voice-balance","voice-duration","voice-family","voice-pitch","voice-range","voice-rate","voice-stress","voice-volume","volume","white-space","widows","width","word-break","word-spacing","word-wrap","z-index","clip-path","clip-rule","mask","enable-background","filter","flood-color","flood-opacity","lighting-color","stop-color","stop-opacity","pointer-events","color-interpolation","color-interpolation-filters","color-rendering","fill","fill-opacity","fill-rule","image-rendering","marker","marker-end","marker-mid","marker-start","shape-rendering","stroke","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width","text-rendering","baseline-shift","dominant-baseline","glyph-orientation-horizontal","glyph-orientation-vertical","text-anchor","writing-mode"],propertyKeywords=keySet(propertyKeywords_);var nonStandardPropertyKeywords_=["scrollbar-arrow-color","scrollbar-base-color","scrollbar-dark-shadow-color","scrollbar-face-color","scrollbar-highlight-color","scrollbar-shadow-color","scrollbar-3d-light-color","scrollbar-track-color","shape-inside","searchfield-cancel-button","searchfield-decoration","searchfield-results-button","searchfield-results-decoration","zoom"],nonStandardPropertyKeywords=keySet(nonStandardPropertyKeywords_);var fontProperties_=["font-family","src","unicode-range","font-variant","font-feature-settings","font-stretch","font-weight","font-style"],fontProperties=keySet(fontProperties_);var counterDescriptors_=["additive-symbols","fallback","negative","pad","prefix","range","speak-as","suffix","symbols","system"],counterDescriptors=keySet(counterDescriptors_);var colorKeywords_=["aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black","blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse","chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan","darkgoldenrod","darkgray","darkgreen","darkkhaki","darkmagenta","darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue","darkslategray","darkturquoise","darkviolet","deeppink","deepskyblue","dimgray","dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray","grey","green","greenyellow","honeydew","hotpink","indianred","indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgray","lightgreen","lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightsteelblue","lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine","mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue","mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin","navajowhite","navy","oldlace","olive","olivedrab","orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff","peru","pink","plum","powderblue","purple","rebeccapurple","red","rosybrown","royalblue","saddlebrown","salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue","slategray","snow","springgreen","steelblue","tan","teal","thistle","tomato","turquoise","violet","wheat","white","whitesmoke","yellow","yellowgreen"],colorKeywords=keySet(colorKeywords_);var valueKeywords_=["above","absolute","activeborder","additive","activecaption","afar","after-white-space","ahead","alias","all","all-scroll","alphabetic","alternate","always","amharic","amharic-abegede","antialiased","appworkspace","arabic-indic","armenian","asterisks","attr","auto","avoid","avoid-column","avoid-page","avoid-region","background","backwards","baseline","below","bidi-override","binary","bengali","blink","block","block-axis","bold","bolder","border","border-box","both","bottom","break","break-all","break-word","bullets","button","button-bevel","buttonface","buttonhighlight","buttonshadow","buttontext","calc","cambodian","capitalize","caps-lock-indicator","caption","captiontext","caret","cell","center","checkbox","circle","cjk-decimal","cjk-earthly-branch","cjk-heavenly-stem","cjk-ideographic","clear","clip","close-quote","col-resize","collapse","color","color-burn","color-dodge","column","column-reverse","compact","condensed","contain","content","content-box","context-menu","continuous","copy","counter","counters","cover","crop","cross","crosshair","currentcolor","cursive","cyclic","darken","dashed","decimal","decimal-leading-zero","default","default-button","dense","destination-atop","destination-in","destination-out","destination-over","devanagari","difference","disc","discard","disclosure-closed","disclosure-open","document","dot-dash","dot-dot-dash","dotted","double","down","e-resize","ease","ease-in","ease-in-out","ease-out","element","ellipse","ellipsis","embed","end","ethiopic","ethiopic-abegede","ethiopic-abegede-am-et","ethiopic-abegede-gez","ethiopic-abegede-ti-er","ethiopic-abegede-ti-et","ethiopic-halehame-aa-er","ethiopic-halehame-aa-et","ethiopic-halehame-am-et","ethiopic-halehame-gez","ethiopic-halehame-om-et","ethiopic-halehame-sid-et","ethiopic-halehame-so-et","ethiopic-halehame-ti-er","ethiopic-halehame-ti-et","ethiopic-halehame-tig","ethiopic-numeric","ew-resize","exclusion","expanded","extends","extra-condensed","extra-expanded","fantasy","fast","fill","fixed","flat","flex","flex-end","flex-start","footnotes","forwards","from","geometricPrecision","georgian","graytext","grid","groove","gujarati","gurmukhi","hand","hangul","hangul-consonant","hard-light","hebrew","help","hidden","hide","higher","highlight","highlighttext","hiragana","hiragana-iroha","horizontal","hsl","hsla","hue","icon","ignore","inactiveborder","inactivecaption","inactivecaptiontext","infinite","infobackground","infotext","inherit","initial","inline","inline-axis","inline-block","inline-flex","inline-grid","inline-table","inset","inside","intrinsic","invert","italic","japanese-formal","japanese-informal","justify","kannada","katakana","katakana-iroha","keep-all","khmer","korean-hangul-formal","korean-hanja-formal","korean-hanja-informal","landscape","lao","large","larger","left","level","lighter","lighten","line-through","linear","linear-gradient","lines","list-item","listbox","listitem","local","logical","loud","lower","lower-alpha","lower-armenian","lower-greek","lower-hexadecimal","lower-latin","lower-norwegian","lower-roman","lowercase","ltr","luminosity","malayalam","match","matrix","matrix3d","media-controls-background","media-current-time-display","media-fullscreen-button","media-mute-button","media-play-button","media-return-to-realtime-button","media-rewind-button","media-seek-back-button","media-seek-forward-button","media-slider","media-sliderthumb","media-time-remaining-display","media-volume-slider","media-volume-slider-container","media-volume-sliderthumb","medium","menu","menulist","menulist-button","menulist-text","menulist-textfield","menutext","message-box","middle","min-intrinsic","mix","mongolian","monospace","move","multiple","multiply","myanmar","n-resize","narrower","ne-resize","nesw-resize","no-close-quote","no-drop","no-open-quote","no-repeat","none","normal","not-allowed","nowrap","ns-resize","numbers","numeric","nw-resize","nwse-resize","oblique","octal","open-quote","optimizeLegibility","optimizeSpeed","oriya","oromo","outset","outside","outside-shape","overlay","overline","padding","padding-box","painted","page","paused","persian","perspective","plus-darker","plus-lighter","pointer","polygon","portrait","pre","pre-line","pre-wrap","preserve-3d","progress","push-button","radial-gradient","radio","read-only","read-write","read-write-plaintext-only","rectangle","region","relative","repeat","repeating-linear-gradient","repeating-radial-gradient","repeat-x","repeat-y","reset","reverse","rgb","rgba","ridge","right","rotate","rotate3d","rotateX","rotateY","rotateZ","round","row","row-resize","row-reverse","rtl","run-in","running","s-resize","sans-serif","saturation","scale","scale3d","scaleX","scaleY","scaleZ","screen","scroll","scrollbar","se-resize","searchfield","searchfield-cancel-button","searchfield-decoration","searchfield-results-button","searchfield-results-decoration","semi-condensed","semi-expanded","separate","serif","show","sidama","simp-chinese-formal","simp-chinese-informal","single","skew","skewX","skewY","skip-white-space","slide","slider-horizontal","slider-vertical","sliderthumb-horizontal","sliderthumb-vertical","slow","small","small-caps","small-caption","smaller","soft-light","solid","somali","source-atop","source-in","source-out","source-over","space","space-around","space-between","spell-out","square","square-button","start","static","status-bar","stretch","stroke","sub","subpixel-antialiased","super","sw-resize","symbolic","symbols","table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row","table-row-group","tamil","telugu","text","text-bottom","text-top","textarea","textfield","thai","thick","thin","threeddarkshadow","threedface","threedhighlight","threedlightshadow","threedshadow","tibetan","tigre","tigrinya-er","tigrinya-er-abegede","tigrinya-et","tigrinya-et-abegede","to","top","trad-chinese-formal","trad-chinese-informal","translate","translate3d","translateX","translateY","translateZ","transparent","ultra-condensed","ultra-expanded","underline","up","upper-alpha","upper-armenian","upper-greek","upper-hexadecimal","upper-latin","upper-norwegian","upper-roman","uppercase","urdu","url","var","vertical","vertical-text","visible","visibleFill","visiblePainted","visibleStroke","visual","w-resize","wait","wave","wider","window","windowframe","windowtext","words","wrap","wrap-reverse","x-large","x-small","xor","xx-large","xx-small"],valueKeywords=keySet(valueKeywords_);var allWords=documentTypes_.concat(mediaTypes_).concat(mediaFeatures_).concat(mediaValueKeywords_).concat(propertyKeywords_).concat(nonStandardPropertyKeywords_).concat(colorKeywords_).concat(valueKeywords_);CodeMirror.registerHelper("hintWords","css",allWords);function tokenCComment(stream,state){var maybeEnd=false,ch;while((ch=stream.next())!=null){if(maybeEnd&&ch=="/"){state.tokenize=null;break;}
maybeEnd=(ch=="*");}
return["comment","comment"];}
CodeMirror.defineMIME("text/css",{documentTypes:documentTypes,mediaTypes:mediaTypes,mediaFeatures:mediaFeatures,mediaValueKeywords:mediaValueKeywords,propertyKeywords:propertyKeywords,nonStandardPropertyKeywords:nonStandardPropertyKeywords,fontProperties:fontProperties,counterDescriptors:counterDescriptors,colorKeywords:colorKeywords,valueKeywords:valueKeywords,tokenHooks:{"/":function(stream,state){if(!stream.eat("*"))return false;state.tokenize=tokenCComment;return tokenCComment(stream,state);}},name:"css"});CodeMirror.defineMIME("text/x-scss",{mediaTypes:mediaTypes,mediaFeatures:mediaFeatures,mediaValueKeywords:mediaValueKeywords,propertyKeywords:propertyKeywords,nonStandardPropertyKeywords:nonStandardPropertyKeywords,colorKeywords:colorKeywords,valueKeywords:valueKeywords,fontProperties:fontProperties,allowNested:true,tokenHooks:{"/":function(stream,state){if(stream.eat("/")){stream.skipToEnd();return["comment","comment"];}else if(stream.eat("*")){state.tokenize=tokenCComment;return tokenCComment(stream,state);}else{return["operator","operator"];}},":":function(stream){if(stream.match(/\s*\{/))
return[null,"{"];return false;},"$":function(stream){stream.match(/^[\w-]+/);if(stream.match(/^\s*:/,false))
return["variable-2","variable-definition"];return["variable-2","variable"];},"#":function(stream){if(!stream.eat("{"))return false;return[null,"interpolation"];}},name:"css",helperType:"scss"});CodeMirror.defineMIME("text/x-less",{mediaTypes:mediaTypes,mediaFeatures:mediaFeatures,mediaValueKeywords:mediaValueKeywords,propertyKeywords:propertyKeywords,nonStandardPropertyKeywords:nonStandardPropertyKeywords,colorKeywords:colorKeywords,valueKeywords:valueKeywords,fontProperties:fontProperties,allowNested:true,tokenHooks:{"/":function(stream,state){if(stream.eat("/")){stream.skipToEnd();return["comment","comment"];}else if(stream.eat("*")){state.tokenize=tokenCComment;return tokenCComment(stream,state);}else{return["operator","operator"];}},"@":function(stream){if(stream.eat("{"))return[null,"interpolation"];if(stream.match(/^(charset|document|font-face|import|(-(moz|ms|o|webkit)-)?keyframes|media|namespace|page|supports)\b/,false))return false;stream.eatWhile(/[\w\\\-]/);if(stream.match(/^\s*:/,false))
return["variable-2","variable-definition"];return["variable-2","variable"];},"&":function(){return["atom","atom"];}},name:"css",helperType:"less"});CodeMirror.defineMIME("text/x-gss",{documentTypes:documentTypes,mediaTypes:mediaTypes,mediaFeatures:mediaFeatures,propertyKeywords:propertyKeywords,nonStandardPropertyKeywords:nonStandardPropertyKeywords,fontProperties:fontProperties,counterDescriptors:counterDescriptors,colorKeywords:colorKeywords,valueKeywords:valueKeywords,supportsAtComponent:true,tokenHooks:{"/":function(stream,state){if(!stream.eat("*"))return false;state.tokenize=tokenCComment;return tokenCComment(stream,state);}},name:"css",helperType:"gss"});});;(function(mod){if(typeof exports=="object"&&typeof module=="object")
mod(require("../../lib/codemirror"));else if(typeof define=="function"&&define.amd)
define(["../../lib/codemirror"],mod);else
mod(CodeMirror);})(function(CodeMirror){"use strict";var htmlConfig={autoSelfClosers:{'area':true,'base':true,'br':true,'col':true,'command':true,'embed':true,'frame':true,'hr':true,'img':true,'input':true,'keygen':true,'link':true,'meta':true,'param':true,'source':true,'track':true,'wbr':true,'menuitem':true},implicitlyClosed:{'dd':true,'li':true,'optgroup':true,'option':true,'p':true,'rp':true,'rt':true,'tbody':true,'td':true,'tfoot':true,'th':true,'tr':true},contextGrabbers:{'dd':{'dd':true,'dt':true},'dt':{'dd':true,'dt':true},'li':{'li':true},'option':{'option':true,'optgroup':true},'optgroup':{'optgroup':true},'p':{'address':true,'article':true,'aside':true,'blockquote':true,'dir':true,'div':true,'dl':true,'fieldset':true,'footer':true,'form':true,'h1':true,'h2':true,'h3':true,'h4':true,'h5':true,'h6':true,'header':true,'hgroup':true,'hr':true,'menu':true,'nav':true,'ol':true,'p':true,'pre':true,'section':true,'table':true,'ul':true},'rp':{'rp':true,'rt':true},'rt':{'rp':true,'rt':true},'tbody':{'tbody':true,'tfoot':true},'td':{'td':true,'th':true},'tfoot':{'tbody':true},'th':{'td':true,'th':true},'thead':{'tbody':true,'tfoot':true},'tr':{'tr':true}},doNotIndent:{"pre":true},allowUnquoted:true,allowMissing:true,caseFold:true}
var xmlConfig={autoSelfClosers:{},implicitlyClosed:{},contextGrabbers:{},doNotIndent:{},allowUnquoted:false,allowMissing:false,caseFold:false}
CodeMirror.defineMode("xml",function(editorConf,config_){var indentUnit=editorConf.indentUnit
var config={}
var defaults=config_.htmlMode?htmlConfig:xmlConfig
for(var prop in defaults)config[prop]=defaults[prop]
for(var prop in config_)config[prop]=config_[prop]
var type,setStyle;function inText(stream,state){function chain(parser){state.tokenize=parser;return parser(stream,state);}
var ch=stream.next();if(ch=="<"){if(stream.eat("!")){if(stream.eat("[")){if(stream.match("CDATA["))return chain(inBlock("atom","]]>"));else return null;}else if(stream.match("--")){return chain(inBlock("comment","-->"));}else if(stream.match("DOCTYPE",true,true)){stream.eatWhile(/[\w\._\-]/);return chain(doctype(1));}else{return null;}}else if(stream.eat("?")){stream.eatWhile(/[\w\._\-]/);state.tokenize=inBlock("meta","?>");return"meta";}else{type=stream.eat("/")?"closeTag":"openTag";state.tokenize=inTag;return"tag bracket";}}else if(ch=="&"){var ok;if(stream.eat("#")){if(stream.eat("x")){ok=stream.eatWhile(/[a-fA-F\d]/)&&stream.eat(";");}else{ok=stream.eatWhile(/[\d]/)&&stream.eat(";");}}else{ok=stream.eatWhile(/[\w\.\-:]/)&&stream.eat(";");}
return ok?"atom":"error";}else{stream.eatWhile(/[^&<]/);return null;}}
inText.isInText=true;function inTag(stream,state){var ch=stream.next();if(ch==">"||(ch=="/"&&stream.eat(">"))){state.tokenize=inText;type=ch==">"?"endTag":"selfcloseTag";return"tag bracket";}else if(ch=="="){type="equals";return null;}else if(ch=="<"){state.tokenize=inText;state.state=baseState;state.tagName=state.tagStart=null;var next=state.tokenize(stream,state);return next?next+" tag error":"tag error";}else if(/[\'\"]/.test(ch)){state.tokenize=inAttribute(ch);state.stringStartCol=stream.column();return state.tokenize(stream,state);}else{stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);return"word";}}
function inAttribute(quote){var closure=function(stream,state){while(!stream.eol()){if(stream.next()==quote){state.tokenize=inTag;break;}}
return"string";};closure.isInAttribute=true;return closure;}
function inBlock(style,terminator){return function(stream,state){while(!stream.eol()){if(stream.match(terminator)){state.tokenize=inText;break;}
stream.next();}
return style;};}
function doctype(depth){return function(stream,state){var ch;while((ch=stream.next())!=null){if(ch=="<"){state.tokenize=doctype(depth+1);return state.tokenize(stream,state);}else if(ch==">"){if(depth==1){state.tokenize=inText;break;}else{state.tokenize=doctype(depth-1);return state.tokenize(stream,state);}}}
return"meta";};}
function Context(state,tagName,startOfLine){this.prev=state.context;this.tagName=tagName;this.indent=state.indented;this.startOfLine=startOfLine;if(config.doNotIndent.hasOwnProperty(tagName)||(state.context&&state.context.noIndent))
this.noIndent=true;}
function popContext(state){if(state.context)state.context=state.context.prev;}
function maybePopContext(state,nextTagName){var parentTagName;while(true){if(!state.context){return;}
parentTagName=state.context.tagName;if(!config.contextGrabbers.hasOwnProperty(parentTagName)||!config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)){return;}
popContext(state);}}
function baseState(type,stream,state){if(type=="openTag"){state.tagStart=stream.column();return tagNameState;}else if(type=="closeTag"){return closeTagNameState;}else{return baseState;}}
function tagNameState(type,stream,state){if(type=="word"){state.tagName=stream.current();setStyle="tag";return attrState;}else{setStyle="error";return tagNameState;}}
function closeTagNameState(type,stream,state){if(type=="word"){var tagName=stream.current();if(state.context&&state.context.tagName!=tagName&&config.implicitlyClosed.hasOwnProperty(state.context.tagName))
popContext(state);if((state.context&&state.context.tagName==tagName)||config.matchClosing===false){setStyle="tag";return closeState;}else{setStyle="tag error";return closeStateErr;}}else{setStyle="error";return closeStateErr;}}
function closeState(type,_stream,state){if(type!="endTag"){setStyle="error";return closeState;}
popContext(state);return baseState;}
function closeStateErr(type,stream,state){setStyle="error";return closeState(type,stream,state);}
function attrState(type,_stream,state){if(type=="word"){setStyle="attribute";return attrEqState;}else if(type=="endTag"||type=="selfcloseTag"){var tagName=state.tagName,tagStart=state.tagStart;state.tagName=state.tagStart=null;if(type=="selfcloseTag"||config.autoSelfClosers.hasOwnProperty(tagName)){maybePopContext(state,tagName);}else{maybePopContext(state,tagName);state.context=new Context(state,tagName,tagStart==state.indented);}
return baseState;}
setStyle="error";return attrState;}
function attrEqState(type,stream,state){if(type=="equals")return attrValueState;if(!config.allowMissing)setStyle="error";return attrState(type,stream,state);}
function attrValueState(type,stream,state){if(type=="string")return attrContinuedState;if(type=="word"&&config.allowUnquoted){setStyle="string";return attrState;}
setStyle="error";return attrState(type,stream,state);}
function attrContinuedState(type,stream,state){if(type=="string")return attrContinuedState;return attrState(type,stream,state);}
return{startState:function(baseIndent){var state={tokenize:inText,state:baseState,indented:baseIndent||0,tagName:null,tagStart:null,context:null}
if(baseIndent!=null)state.baseIndent=baseIndent
return state},token:function(stream,state){if(!state.tagName&&stream.sol())
state.indented=stream.indentation();if(stream.eatSpace())return null;type=null;var style=state.tokenize(stream,state);if((style||type)&&style!="comment"){setStyle=null;state.state=state.state(type||style,stream,state);if(setStyle)
style=setStyle=="error"?style+" error":setStyle;}
return style;},indent:function(state,textAfter,fullLine){var context=state.context;if(state.tokenize.isInAttribute){if(state.tagStart==state.indented)
return state.stringStartCol+1;else
return state.indented+indentUnit;}
if(context&&context.noIndent)return CodeMirror.Pass;if(state.tokenize!=inTag&&state.tokenize!=inText)
return fullLine?fullLine.match(/^(\s*)/)[0].length:0;if(state.tagName){if(config.multilineTagIndentPastTag!==false)
return state.tagStart+state.tagName.length+2;else
return state.tagStart+indentUnit*(config.multilineTagIndentFactor||1);}
if(config.alignCDATA&&/<!\[CDATA\[/.test(textAfter))return 0;var tagAfter=textAfter&&/^<(\/)?([\w_:\.-]*)/.exec(textAfter);if(tagAfter&&tagAfter[1]){while(context){if(context.tagName==tagAfter[2]){context=context.prev;break;}else if(config.implicitlyClosed.hasOwnProperty(context.tagName)){context=context.prev;}else{break;}}}else if(tagAfter){while(context){var grabbers=config.contextGrabbers[context.tagName];if(grabbers&&grabbers.hasOwnProperty(tagAfter[2]))
context=context.prev;else
break;}}
while(context&&context.prev&&!context.startOfLine)
context=context.prev;if(context)return context.indent+indentUnit;else return state.baseIndent||0;},electricInput:/<\/[\s\w:]+>$/,blockCommentStart:"<!--",blockCommentEnd:"-->",configuration:config.htmlMode?"html":"xml",helperType:config.htmlMode?"html":"xml",skipAttribute:function(state){if(state.state==attrValueState)
state.state=attrState}};});CodeMirror.defineMIME("text/xml","xml");CodeMirror.defineMIME("application/xml","xml");if(!CodeMirror.mimeModes.hasOwnProperty("text/html"))
CodeMirror.defineMIME("text/html",{name:"xml",htmlMode:true});});;FormatterWorker.ESTreeWalker=class{constructor(beforeVisit,afterVisit){this._beforeVisit=beforeVisit;this._afterVisit=afterVisit||new Function();this._walkNulls=false;}
setWalkNulls(value){this._walkNulls=value;}
walk(ast){this._innerWalk(ast,null);}
_innerWalk(node,parent){if(!node&&parent&&this._walkNulls){var result=({raw:'null',value:null});result.type='Literal';node=(result);}
if(!node)
return;node.parent=parent;if(this._beforeVisit.call(null,node)===FormatterWorker.ESTreeWalker.SkipSubtree){this._afterVisit.call(null,node);return;}
var walkOrder=FormatterWorker.ESTreeWalker._walkOrder[node.type];if(!walkOrder){console.error('Walk order not defined for '+node.type);return;}
if(node.type==='TemplateLiteral'){var templateLiteral=(node);var expressionsLength=templateLiteral.expressions.length;for(var i=0;i<expressionsLength;++i){this._innerWalk(templateLiteral.quasis[i],templateLiteral);this._innerWalk(templateLiteral.expressions[i],templateLiteral);}
this._innerWalk(templateLiteral.quasis[expressionsLength],templateLiteral);}else{for(var i=0;i<walkOrder.length;++i){var entity=node[walkOrder[i]];if(Array.isArray(entity))
this._walkArray(entity,node);else
this._innerWalk(entity,node);}}
this._afterVisit.call(null,node);}
_walkArray(nodeArray,parentNode){for(var i=0;i<nodeArray.length;++i)
this._innerWalk(nodeArray[i],parentNode);}};FormatterWorker.ESTreeWalker.SkipSubtree={};FormatterWorker.ESTreeWalker._walkOrder={'AwaitExpression':['arguments'],'ArrayExpression':['elements'],'ArrowFunctionExpression':['params','body'],'AssignmentExpression':['left','right'],'BinaryExpression':['left','right'],'BlockStatement':['body'],'BreakStatement':['label'],'CallExpression':['callee','arguments'],'CatchClause':['param','body'],'ClassBody':['body'],'ClassDeclaration':['id','superClass','body'],'ClassExpression':['id','superClass','body'],'ConditionalExpression':['test','consequent','alternate'],'ContinueStatement':['label'],'DebuggerStatement':[],'DoWhileStatement':['body','test'],'EmptyStatement':[],'ExpressionStatement':['expression'],'ForInStatement':['left','right','body'],'ForOfStatement':['left','right','body'],'ForStatement':['init','test','update','body'],'FunctionDeclaration':['id','params','body'],'FunctionExpression':['id','params','body'],'Identifier':[],'IfStatement':['test','consequent','alternate'],'LabeledStatement':['label','body'],'Literal':[],'LogicalExpression':['left','right'],'MemberExpression':['object','property'],'MethodDefinition':['key','value'],'NewExpression':['callee','arguments'],'ObjectExpression':['properties'],'Program':['body'],'Property':['key','value'],'ReturnStatement':['argument'],'SequenceExpression':['expressions'],'Super':[],'SwitchCase':['test','consequent'],'SwitchStatement':['discriminant','cases'],'TaggedTemplateExpression':['tag','quasi'],'TemplateElement':[],'TemplateLiteral':['quasis','expressions'],'ThisExpression':[],'ThrowStatement':['argument'],'TryStatement':['block','handler','finalizer'],'UnaryExpression':['argument'],'UpdateExpression':['argument'],'VariableDeclaration':['declarations'],'VariableDeclarator':['id','init'],'WhileStatement':['test','body'],'WithStatement':['object','body'],'YieldExpression':['argument']};;FormatterWorker.createTokenizer=function(mimeType){var mode=CodeMirror.getMode({indentUnit:2},mimeType);var state=CodeMirror.startState(mode);function tokenize(line,callback){var stream=new CodeMirror.StringStream(line);while(!stream.eol()){var style=mode.token(stream,state);var value=stream.current();if(callback(value,style,stream.start,stream.start+value.length)===FormatterWorker.AbortTokenization)
return;stream.start=stream.pos;}}
return tokenize;};FormatterWorker.AbortTokenization={};self.onmessage=function(event){var method=(event.data.method);var params=(event.data.params);if(!method)
return;switch(method){case'format':FormatterWorker.format(params.mimeType,params.content,params.indentString);break;case'parseCSS':FormatterWorker.parseCSS(params.content);break;case'parseSCSS':FormatterWorker.FormatterWorkerContentParser.parse(params.content,'text/x-scss');break;case'javaScriptOutline':FormatterWorker.javaScriptOutline(params.content);break;case'javaScriptIdentifiers':FormatterWorker.javaScriptIdentifiers(params.content);break;case'evaluatableJavaScriptSubstring':FormatterWorker.evaluatableJavaScriptSubstring(params.content);break;case'parseJSONRelaxed':FormatterWorker.parseJSONRelaxed(params.content);break;default:console.error('Unsupport method name: '+method);}};FormatterWorker.parseJSONRelaxed=function(content){postMessage(FormatterWorker.RelaxedJSONParser.parse(content));};FormatterWorker.evaluatableJavaScriptSubstring=function(content){var tokenizer=acorn.tokenizer(content,{ecmaVersion:8});var result='';try{var token=tokenizer.getToken();while(token.type!==acorn.tokTypes.eof&&FormatterWorker.AcornTokenizer.punctuator(token))
token=tokenizer.getToken();var startIndex=token.start;var endIndex=token.end;var openBracketsCounter=0;while(token.type!==acorn.tokTypes.eof){var isIdentifier=FormatterWorker.AcornTokenizer.identifier(token);var isThis=FormatterWorker.AcornTokenizer.keyword(token,'this');var isString=token.type===acorn.tokTypes.string;if(!isThis&&!isIdentifier&&!isString)
break;endIndex=token.end;token=tokenizer.getToken();while(FormatterWorker.AcornTokenizer.punctuator(token,'.[]')){if(FormatterWorker.AcornTokenizer.punctuator(token,'['))
openBracketsCounter++;if(FormatterWorker.AcornTokenizer.punctuator(token,']')){endIndex=openBracketsCounter>0?token.end:endIndex;openBracketsCounter--;}
token=tokenizer.getToken();}}
result=content.substring(startIndex,endIndex);}catch(e){console.error(e);}
postMessage(result);};FormatterWorker.javaScriptIdentifiers=function(content){var root=acorn.parse(content,{ranges:false,ecmaVersion:8});var identifiers=[];var walker=new FormatterWorker.ESTreeWalker(beforeVisit);function isFunction(node){return node.type==='FunctionDeclaration'||node.type==='FunctionExpression'||node.type==='ArrowFunctionExpression';}
function beforeVisit(node){if(isFunction(node)){if(node.id)
identifiers.push(node.id);return FormatterWorker.ESTreeWalker.SkipSubtree;}
if(node.type!=='Identifier')
return;if(node.parent&&node.parent.type==='MemberExpression'&&node.parent.property===node&&!node.parent.computed)
return;identifiers.push(node);}
if(!root||root.type!=='Program'||root.body.length!==1||!isFunction(root.body[0])){postMessage([]);return;}
var functionNode=root.body[0];for(var param of functionNode.params)
walker.walk(param);walker.walk(functionNode.body);var reduced=identifiers.map(id=>({name:id.name,offset:id.start}));postMessage(reduced);};FormatterWorker.format=function(mimeType,text,indentString){indentString=indentString||'    ';var result={};var builder=new FormatterWorker.FormattedContentBuilder(indentString);var lineEndings=text.computeLineEndings();try{switch(mimeType){case'text/html':var formatter=new FormatterWorker.HTMLFormatter(builder);formatter.format(text,lineEndings);break;case'text/css':var formatter=new FormatterWorker.CSSFormatter(builder);formatter.format(text,lineEndings,0,text.length);break;case'text/javascript':var formatter=new FormatterWorker.JavaScriptFormatter(builder);formatter.format(text,lineEndings,0,text.length);break;default:var formatter=new FormatterWorker.IdentityFormatter(builder);formatter.format(text,lineEndings,0,text.length);}
result.mapping=builder.mapping();result.content=builder.content();}catch(e){console.error(e);result.mapping={original:[0],formatted:[0]};result.content=text;}
postMessage(result);};FormatterWorker.FormatterWorkerContentParser=function(){};FormatterWorker.FormatterWorkerContentParser.prototype={parse(content){}};FormatterWorker.FormatterWorkerContentParser.parse=function(content,mimeType){var extension=self.runtime.extensions(FormatterWorker.FormatterWorkerContentParser).find(findExtension);console.assert(extension);extension.instance().then(instance=>instance.parse(content)).catchException(null).then(postMessage);function findExtension(extension){return extension.descriptor()['mimeType']===mimeType;}};;(function(global,factory){typeof exports==='object'&&typeof module!=='undefined'?factory(exports):typeof define==='function'&&define.amd?define(['exports'],factory):(factory((global.acorn=global.acorn||{})));}(this,(function(exports){'use strict';var reservedWords={3:"abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",5:"class enum extends super const export import",6:"enum",strict:"implements interface let package private protected public static yield",strictBind:"eval arguments"}
var ecma5AndLessKeywords="break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this"
var keywords={5:ecma5AndLessKeywords,6:ecma5AndLessKeywords+" const class extends export import super"}
var nonASCIIidentifierStartChars="\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fd5\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ae\ua7b0-\ua7b7\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc"
var nonASCIIidentifierChars="\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d4-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d01-\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8\u1cf9\u1dc0-\u1df5\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f"
var nonASCIIidentifierStart=new RegExp("["+nonASCIIidentifierStartChars+"]")
var nonASCIIidentifier=new RegExp("["+nonASCIIidentifierStartChars+nonASCIIidentifierChars+"]")
nonASCIIidentifierStartChars=nonASCIIidentifierChars=null
var astralIdentifierStartCodes=[0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,17,26,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,26,45,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,785,52,76,44,33,24,27,35,42,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,54,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,86,25,391,63,32,0,449,56,264,8,2,36,18,0,50,29,881,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,881,68,12,0,67,12,65,0,32,6124,20,754,9486,1,3071,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,4149,196,60,67,1213,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42710,42,4148,12,221,3,5761,10591,541]
var astralIdentifierCodes=[509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,1306,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,52,0,13,2,49,13,10,2,4,9,83,11,7,0,161,11,6,9,7,3,57,0,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,87,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,423,9,838,7,2,7,17,9,57,21,2,13,19882,9,135,4,60,6,26,9,1016,45,17,3,19723,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,2214,6,110,6,6,9,792487,239]
function isInAstralSet(code,set){var pos=0x10000
for(var i=0;i<set.length;i+=2){pos+=set[i]
if(pos>code)return false
pos+=set[i+1]
if(pos>=code)return true}}
function isIdentifierStart(code,astral){if(code<65)return code===36
if(code<91)return true
if(code<97)return code===95
if(code<123)return true
if(code<=0xffff)return code>=0xaa&&nonASCIIidentifierStart.test(String.fromCharCode(code))
if(astral===false)return false
return isInAstralSet(code,astralIdentifierStartCodes)}
function isIdentifierChar(code,astral){if(code<48)return code===36
if(code<58)return true
if(code<65)return false
if(code<91)return true
if(code<97)return code===95
if(code<123)return true
if(code<=0xffff)return code>=0xaa&&nonASCIIidentifier.test(String.fromCharCode(code))
if(astral===false)return false
return isInAstralSet(code,astralIdentifierStartCodes)||isInAstralSet(code,astralIdentifierCodes)}
var TokenType=function TokenType(label,conf){if(conf===void 0)conf={};this.label=label
this.keyword=conf.keyword
this.beforeExpr=!!conf.beforeExpr
this.startsExpr=!!conf.startsExpr
this.isLoop=!!conf.isLoop
this.isAssign=!!conf.isAssign
this.prefix=!!conf.prefix
this.postfix=!!conf.postfix
this.binop=conf.binop||null
this.updateContext=null};function binop(name,prec){return new TokenType(name,{beforeExpr:true,binop:prec})}
var beforeExpr={beforeExpr:true};var startsExpr={startsExpr:true};var keywordTypes={}
function kw(name,options){if(options===void 0)options={};options.keyword=name
return keywordTypes[name]=new TokenType(name,options)}
var tt={num:new TokenType("num",startsExpr),regexp:new TokenType("regexp",startsExpr),string:new TokenType("string",startsExpr),name:new TokenType("name",startsExpr),eof:new TokenType("eof"),bracketL:new TokenType("[",{beforeExpr:true,startsExpr:true}),bracketR:new TokenType("]"),braceL:new TokenType("{",{beforeExpr:true,startsExpr:true}),braceR:new TokenType("}"),parenL:new TokenType("(",{beforeExpr:true,startsExpr:true}),parenR:new TokenType(")"),comma:new TokenType(",",beforeExpr),semi:new TokenType(";",beforeExpr),colon:new TokenType(":",beforeExpr),dot:new TokenType("."),question:new TokenType("?",beforeExpr),arrow:new TokenType("=>",beforeExpr),template:new TokenType("template"),ellipsis:new TokenType("...",beforeExpr),backQuote:new TokenType("`",startsExpr),dollarBraceL:new TokenType("${",{beforeExpr:true,startsExpr:true}),eq:new TokenType("=",{beforeExpr:true,isAssign:true}),assign:new TokenType("_=",{beforeExpr:true,isAssign:true}),incDec:new TokenType("++/--",{prefix:true,postfix:true,startsExpr:true}),prefix:new TokenType("prefix",{beforeExpr:true,prefix:true,startsExpr:true}),logicalOR:binop("||",1),logicalAND:binop("&&",2),bitwiseOR:binop("|",3),bitwiseXOR:binop("^",4),bitwiseAND:binop("&",5),equality:binop("==/!=",6),relational:binop("</>",7),bitShift:binop("<</>>",8),plusMin:new TokenType("+/-",{beforeExpr:true,binop:9,prefix:true,startsExpr:true}),modulo:binop("%",10),star:binop("*",10),slash:binop("/",10),starstar:new TokenType("**",{beforeExpr:true}),_break:kw("break"),_case:kw("case",beforeExpr),_catch:kw("catch"),_continue:kw("continue"),_debugger:kw("debugger"),_default:kw("default",beforeExpr),_do:kw("do",{isLoop:true,beforeExpr:true}),_else:kw("else",beforeExpr),_finally:kw("finally"),_for:kw("for",{isLoop:true}),_function:kw("function",startsExpr),_if:kw("if"),_return:kw("return",beforeExpr),_switch:kw("switch"),_throw:kw("throw",beforeExpr),_try:kw("try"),_var:kw("var"),_const:kw("const"),_while:kw("while",{isLoop:true}),_with:kw("with"),_new:kw("new",{beforeExpr:true,startsExpr:true}),_this:kw("this",startsExpr),_super:kw("super",startsExpr),_class:kw("class"),_extends:kw("extends",beforeExpr),_export:kw("export"),_import:kw("import"),_null:kw("null",startsExpr),_true:kw("true",startsExpr),_false:kw("false",startsExpr),_in:kw("in",{beforeExpr:true,binop:7}),_instanceof:kw("instanceof",{beforeExpr:true,binop:7}),_typeof:kw("typeof",{beforeExpr:true,prefix:true,startsExpr:true}),_void:kw("void",{beforeExpr:true,prefix:true,startsExpr:true}),_delete:kw("delete",{beforeExpr:true,prefix:true,startsExpr:true})}
var lineBreak=/\r\n?|\n|\u2028|\u2029/
var lineBreakG=new RegExp(lineBreak.source,"g")
function isNewLine(code){return code===10||code===13||code===0x2028||code===0x2029}
var nonASCIIwhitespace=/[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/
var skipWhiteSpace=/(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g
function isArray(obj){return Object.prototype.toString.call(obj)==="[object Array]"}
function has(obj,propName){return Object.prototype.hasOwnProperty.call(obj,propName)}
var Position=function Position(line,col){this.line=line
this.column=col};Position.prototype.offset=function offset(n){return new Position(this.line,this.column+n)};var SourceLocation=function SourceLocation(p,start,end){this.start=start
this.end=end
if(p.sourceFile!==null)this.source=p.sourceFile};function getLineInfo(input,offset){for(var line=1,cur=0;;){lineBreakG.lastIndex=cur
var match=lineBreakG.exec(input)
if(match&&match.index<offset){++line
cur=match.index+match[0].length}else{return new Position(line,offset-cur)}}}
var defaultOptions={ecmaVersion:7,sourceType:"script",onInsertedSemicolon:null,onTrailingComma:null,allowReserved:null,allowReturnOutsideFunction:false,allowImportExportEverywhere:false,allowHashBang:false,locations:false,onToken:null,onComment:null,ranges:false,program:null,sourceFile:null,directSourceFile:null,preserveParens:false,plugins:{}}
function getOptions(opts){var options={}
for(var opt in defaultOptions)
options[opt]=opts&&has(opts,opt)?opts[opt]:defaultOptions[opt]
if(options.ecmaVersion>=2015)
options.ecmaVersion-=2009
if(options.allowReserved==null)
options.allowReserved=options.ecmaVersion<5
if(isArray(options.onToken)){var tokens=options.onToken
options.onToken=function(token){return tokens.push(token);}}
if(isArray(options.onComment))
options.onComment=pushComment(options,options.onComment)
return options}
function pushComment(options,array){return function(block,text,start,end,startLoc,endLoc){var comment={type:block?'Block':'Line',value:text,start:start,end:end}
if(options.locations)
comment.loc=new SourceLocation(this,startLoc,endLoc)
if(options.ranges)
comment.range=[start,end]
array.push(comment)}}
var plugins={}
function keywordRegexp(words){return new RegExp("^("+words.replace(/ /g,"|")+")$")}
var Parser=function Parser(options,input,startPos){this.options=options=getOptions(options)
this.sourceFile=options.sourceFile
this.keywords=keywordRegexp(keywords[options.ecmaVersion>=6?6:5])
var reserved=""
if(!options.allowReserved){for(var v=options.ecmaVersion;;v--)
if(reserved=reservedWords[v])break
if(options.sourceType=="module")reserved+=" await"}
this.reservedWords=keywordRegexp(reserved)
var reservedStrict=(reserved?reserved+" ":"")+reservedWords.strict
this.reservedWordsStrict=keywordRegexp(reservedStrict)
this.reservedWordsStrictBind=keywordRegexp(reservedStrict+" "+reservedWords.strictBind)
this.input=String(input)
this.containsEsc=false
this.loadPlugins(options.plugins)
if(startPos){this.pos=startPos
this.lineStart=this.input.lastIndexOf("\n",startPos-1)+1
this.curLine=this.input.slice(0,this.lineStart).split(lineBreak).length}else{this.pos=this.lineStart=0
this.curLine=1}
this.type=tt.eof
this.value=null
this.start=this.end=this.pos
this.startLoc=this.endLoc=this.curPosition()
this.lastTokEndLoc=this.lastTokStartLoc=null
this.lastTokStart=this.lastTokEnd=this.pos
this.context=this.initialContext()
this.exprAllowed=true
this.strict=this.inModule=options.sourceType==="module"
this.potentialArrowAt=-1
this.inFunction=this.inGenerator=this.inAsync=false
this.yieldPos=this.awaitPos=0
this.labels=[]
if(this.pos===0&&options.allowHashBang&&this.input.slice(0,2)==='#!')
this.skipLineComment(2)};Parser.prototype.isKeyword=function isKeyword(word){return this.keywords.test(word)};Parser.prototype.isReservedWord=function isReservedWord(word){return this.reservedWords.test(word)};Parser.prototype.extend=function extend(name,f){this[name]=f(this[name])};Parser.prototype.loadPlugins=function loadPlugins(pluginConfigs){var this$1=this;for(var name in pluginConfigs){var plugin=plugins[name]
if(!plugin)throw new Error("Plugin '"+name+"' not found")
plugin(this$1,pluginConfigs[name])}};Parser.prototype.parse=function parse(){var node=this.options.program||this.startNode()
this.nextToken()
return this.parseTopLevel(node)};var pp=Parser.prototype
pp.isUseStrict=function(stmt){return this.options.ecmaVersion>=5&&stmt.type==="ExpressionStatement"&&stmt.expression.type==="Literal"&&stmt.expression.raw.slice(1,-1)==="use strict"}
pp.eat=function(type){if(this.type===type){this.next()
return true}else{return false}}
pp.isContextual=function(name){return this.type===tt.name&&this.value===name}
pp.eatContextual=function(name){return this.value===name&&this.eat(tt.name)}
pp.expectContextual=function(name){if(!this.eatContextual(name))this.unexpected()}
pp.canInsertSemicolon=function(){return this.type===tt.eof||this.type===tt.braceR||lineBreak.test(this.input.slice(this.lastTokEnd,this.start))}
pp.insertSemicolon=function(){if(this.canInsertSemicolon()){if(this.options.onInsertedSemicolon)
this.options.onInsertedSemicolon(this.lastTokEnd,this.lastTokEndLoc)
return true}}
pp.semicolon=function(){if(!this.eat(tt.semi)&&!this.insertSemicolon())this.unexpected()}
pp.afterTrailingComma=function(tokType,notNext){if(this.type==tokType){if(this.options.onTrailingComma)
this.options.onTrailingComma(this.lastTokStart,this.lastTokStartLoc)
if(!notNext)
this.next()
return true}}
pp.expect=function(type){this.eat(type)||this.unexpected()}
pp.unexpected=function(pos){this.raise(pos!=null?pos:this.start,"Unexpected token")}
var DestructuringErrors=function DestructuringErrors(){this.shorthandAssign=0
this.trailingComma=0};pp.checkPatternErrors=function(refDestructuringErrors,andThrow){var trailing=refDestructuringErrors&&refDestructuringErrors.trailingComma
if(!andThrow)return!!trailing
if(trailing)this.raise(trailing,"Comma is not permitted after the rest element")}
pp.checkExpressionErrors=function(refDestructuringErrors,andThrow){var pos=refDestructuringErrors&&refDestructuringErrors.shorthandAssign
if(!andThrow)return!!pos
if(pos)this.raise(pos,"Shorthand property assignments are valid only in destructuring patterns")}
pp.checkYieldAwaitInDefaultParams=function(){if(this.yieldPos&&(!this.awaitPos||this.yieldPos<this.awaitPos))
this.raise(this.yieldPos,"Yield expression cannot be a default value")
if(this.awaitPos)
this.raise(this.awaitPos,"Await expression cannot be a default value")}
var pp$1=Parser.prototype
pp$1.parseTopLevel=function(node){var this$1=this;var first=true,exports={}
if(!node.body)node.body=[]
while(this.type!==tt.eof){var stmt=this$1.parseStatement(true,true,exports)
node.body.push(stmt)
if(first){if(this$1.isUseStrict(stmt))this$1.setStrict(true)
first=false}}
this.next()
if(this.options.ecmaVersion>=6){node.sourceType=this.options.sourceType}
return this.finishNode(node,"Program")}
var loopLabel={kind:"loop"};var switchLabel={kind:"switch"};pp$1.isLet=function(){if(this.type!==tt.name||this.options.ecmaVersion<6||this.value!="let")return false
skipWhiteSpace.lastIndex=this.pos
var skip=skipWhiteSpace.exec(this.input)
var next=this.pos+skip[0].length,nextCh=this.input.charCodeAt(next)
if(nextCh===91||nextCh==123)return true
if(isIdentifierStart(nextCh,true)){for(var pos=next+1;isIdentifierChar(this.input.charCodeAt(pos),true);++pos){}
var ident=this.input.slice(next,pos)
if(!this.isKeyword(ident))return true}
return false}
pp$1.isAsyncFunction=function(){if(this.type!==tt.name||this.options.ecmaVersion<8||this.value!="async")
return false
skipWhiteSpace.lastIndex=this.pos
var skip=skipWhiteSpace.exec(this.input)
var next=this.pos+skip[0].length
return!lineBreak.test(this.input.slice(this.pos,next))&&this.input.slice(next,next+8)==="function"&&(next+8==this.input.length||!isIdentifierChar(this.input.charAt(next+8)))}
pp$1.parseStatement=function(declaration,topLevel,exports){var starttype=this.type,node=this.startNode(),kind
if(this.isLet()){starttype=tt._var
kind="let"}
switch(starttype){case tt._break:case tt._continue:return this.parseBreakContinueStatement(node,starttype.keyword)
case tt._debugger:return this.parseDebuggerStatement(node)
case tt._do:return this.parseDoStatement(node)
case tt._for:return this.parseForStatement(node)
case tt._function:if(!declaration&&this.options.ecmaVersion>=6)this.unexpected()
return this.parseFunctionStatement(node,false)
case tt._class:if(!declaration)this.unexpected()
return this.parseClass(node,true)
case tt._if:return this.parseIfStatement(node)
case tt._return:return this.parseReturnStatement(node)
case tt._switch:return this.parseSwitchStatement(node)
case tt._throw:return this.parseThrowStatement(node)
case tt._try:return this.parseTryStatement(node)
case tt._const:case tt._var:kind=kind||this.value
if(!declaration&&kind!="var")this.unexpected()
return this.parseVarStatement(node,kind)
case tt._while:return this.parseWhileStatement(node)
case tt._with:return this.parseWithStatement(node)
case tt.braceL:return this.parseBlock()
case tt.semi:return this.parseEmptyStatement(node)
case tt._export:case tt._import:if(!this.options.allowImportExportEverywhere){if(!topLevel)
this.raise(this.start,"'import' and 'export' may only appear at the top level")
if(!this.inModule)
this.raise(this.start,"'import' and 'export' may appear only with 'sourceType: module'")}
return starttype===tt._import?this.parseImport(node):this.parseExport(node,exports)
default:if(this.isAsyncFunction()&&declaration){this.next()
return this.parseFunctionStatement(node,true)}
var maybeName=this.value,expr=this.parseExpression()
if(starttype===tt.name&&expr.type==="Identifier"&&this.eat(tt.colon))
return this.parseLabeledStatement(node,maybeName,expr)
else return this.parseExpressionStatement(node,expr)}}
pp$1.parseBreakContinueStatement=function(node,keyword){var this$1=this;var isBreak=keyword=="break"
this.next()
if(this.eat(tt.semi)||this.insertSemicolon())node.label=null
else if(this.type!==tt.name)this.unexpected()
else{node.label=this.parseIdent()
this.semicolon()}
for(var i=0;i<this.labels.length;++i){var lab=this$1.labels[i]
if(node.label==null||lab.name===node.label.name){if(lab.kind!=null&&(isBreak||lab.kind==="loop"))break
if(node.label&&isBreak)break}}
if(i===this.labels.length)this.raise(node.start,"Unsyntactic "+keyword)
return this.finishNode(node,isBreak?"BreakStatement":"ContinueStatement")}
pp$1.parseDebuggerStatement=function(node){this.next()
this.semicolon()
return this.finishNode(node,"DebuggerStatement")}
pp$1.parseDoStatement=function(node){this.next()
this.labels.push(loopLabel)
node.body=this.parseStatement(false)
this.labels.pop()
this.expect(tt._while)
node.test=this.parseParenExpression()
if(this.options.ecmaVersion>=6)
this.eat(tt.semi)
else
this.semicolon()
return this.finishNode(node,"DoWhileStatement")}
pp$1.parseForStatement=function(node){this.next()
this.labels.push(loopLabel)
this.expect(tt.parenL)
if(this.type===tt.semi)return this.parseFor(node,null)
var isLet=this.isLet()
if(this.type===tt._var||this.type===tt._const||isLet){var init$1=this.startNode(),kind=isLet?"let":this.value
this.next()
this.parseVar(init$1,true,kind)
this.finishNode(init$1,"VariableDeclaration")
if((this.type===tt._in||(this.options.ecmaVersion>=6&&this.isContextual("of")))&&init$1.declarations.length===1&&!(kind!=="var"&&init$1.declarations[0].init))
return this.parseForIn(node,init$1)
return this.parseFor(node,init$1)}
var refDestructuringErrors=new DestructuringErrors
var init=this.parseExpression(true,refDestructuringErrors)
if(this.type===tt._in||(this.options.ecmaVersion>=6&&this.isContextual("of"))){this.checkPatternErrors(refDestructuringErrors,true)
this.toAssignable(init)
this.checkLVal(init)
return this.parseForIn(node,init)}else{this.checkExpressionErrors(refDestructuringErrors,true)}
return this.parseFor(node,init)}
pp$1.parseFunctionStatement=function(node,isAsync){this.next()
return this.parseFunction(node,true,false,isAsync)}
pp$1.isFunction=function(){return this.type===tt._function||this.isAsyncFunction()}
pp$1.parseIfStatement=function(node){this.next()
node.test=this.parseParenExpression()
node.consequent=this.parseStatement(!this.strict&&this.isFunction())
node.alternate=this.eat(tt._else)?this.parseStatement(!this.strict&&this.isFunction()):null
return this.finishNode(node,"IfStatement")}
pp$1.parseReturnStatement=function(node){if(!this.inFunction&&!this.options.allowReturnOutsideFunction)
this.raise(this.start,"'return' outside of function")
this.next()
if(this.eat(tt.semi)||this.insertSemicolon())node.argument=null
else{node.argument=this.parseExpression();this.semicolon()}
return this.finishNode(node,"ReturnStatement")}
pp$1.parseSwitchStatement=function(node){var this$1=this;this.next()
node.discriminant=this.parseParenExpression()
node.cases=[]
this.expect(tt.braceL)
this.labels.push(switchLabel)
for(var cur,sawDefault=false;this.type!=tt.braceR;){if(this$1.type===tt._case||this$1.type===tt._default){var isCase=this$1.type===tt._case
if(cur)this$1.finishNode(cur,"SwitchCase")
node.cases.push(cur=this$1.startNode())
cur.consequent=[]
this$1.next()
if(isCase){cur.test=this$1.parseExpression()}else{if(sawDefault)this$1.raiseRecoverable(this$1.lastTokStart,"Multiple default clauses")
sawDefault=true
cur.test=null}
this$1.expect(tt.colon)}else{if(!cur)this$1.unexpected()
cur.consequent.push(this$1.parseStatement(true))}}
if(cur)this.finishNode(cur,"SwitchCase")
this.next()
this.labels.pop()
return this.finishNode(node,"SwitchStatement")}
pp$1.parseThrowStatement=function(node){this.next()
if(lineBreak.test(this.input.slice(this.lastTokEnd,this.start)))
this.raise(this.lastTokEnd,"Illegal newline after throw")
node.argument=this.parseExpression()
this.semicolon()
return this.finishNode(node,"ThrowStatement")}
var empty=[]
pp$1.parseTryStatement=function(node){this.next()
node.block=this.parseBlock()
node.handler=null
if(this.type===tt._catch){var clause=this.startNode()
this.next()
this.expect(tt.parenL)
clause.param=this.parseBindingAtom()
this.checkLVal(clause.param,true)
this.expect(tt.parenR)
clause.body=this.parseBlock()
node.handler=this.finishNode(clause,"CatchClause")}
node.finalizer=this.eat(tt._finally)?this.parseBlock():null
if(!node.handler&&!node.finalizer)
this.raise(node.start,"Missing catch or finally clause")
return this.finishNode(node,"TryStatement")}
pp$1.parseVarStatement=function(node,kind){this.next()
this.parseVar(node,false,kind)
this.semicolon()
return this.finishNode(node,"VariableDeclaration")}
pp$1.parseWhileStatement=function(node){this.next()
node.test=this.parseParenExpression()
this.labels.push(loopLabel)
node.body=this.parseStatement(false)
this.labels.pop()
return this.finishNode(node,"WhileStatement")}
pp$1.parseWithStatement=function(node){if(this.strict)this.raise(this.start,"'with' in strict mode")
this.next()
node.object=this.parseParenExpression()
node.body=this.parseStatement(false)
return this.finishNode(node,"WithStatement")}
pp$1.parseEmptyStatement=function(node){this.next()
return this.finishNode(node,"EmptyStatement")}
pp$1.parseLabeledStatement=function(node,maybeName,expr){var this$1=this;for(var i=0;i<this.labels.length;++i)
if(this$1.labels[i].name===maybeName)this$1.raise(expr.start,"Label '"+maybeName+"' is already declared")
var kind=this.type.isLoop?"loop":this.type===tt._switch?"switch":null
for(var i$1=this.labels.length-1;i$1>=0;i$1--){var label=this$1.labels[i$1]
if(label.statementStart==node.start){label.statementStart=this$1.start
label.kind=kind}else break}
this.labels.push({name:maybeName,kind:kind,statementStart:this.start})
node.body=this.parseStatement(true)
this.labels.pop()
node.label=expr
return this.finishNode(node,"LabeledStatement")}
pp$1.parseExpressionStatement=function(node,expr){node.expression=expr
this.semicolon()
return this.finishNode(node,"ExpressionStatement")}
pp$1.parseBlock=function(allowStrict){var this$1=this;var node=this.startNode(),first=true,oldStrict
node.body=[]
this.expect(tt.braceL)
while(!this.eat(tt.braceR)){var stmt=this$1.parseStatement(true)
node.body.push(stmt)
if(first&&allowStrict&&this$1.isUseStrict(stmt)){oldStrict=this$1.strict
this$1.setStrict(this$1.strict=true)}
first=false}
if(oldStrict===false)this.setStrict(false)
return this.finishNode(node,"BlockStatement")}
pp$1.parseFor=function(node,init){node.init=init
this.expect(tt.semi)
node.test=this.type===tt.semi?null:this.parseExpression()
this.expect(tt.semi)
node.update=this.type===tt.parenR?null:this.parseExpression()
this.expect(tt.parenR)
node.body=this.parseStatement(false)
this.labels.pop()
return this.finishNode(node,"ForStatement")}
pp$1.parseForIn=function(node,init){var type=this.type===tt._in?"ForInStatement":"ForOfStatement"
this.next()
node.left=init
node.right=this.parseExpression()
this.expect(tt.parenR)
node.body=this.parseStatement(false)
this.labels.pop()
return this.finishNode(node,type)}
pp$1.parseVar=function(node,isFor,kind){var this$1=this;node.declarations=[]
node.kind=kind
for(;;){var decl=this$1.startNode()
this$1.parseVarId(decl)
if(this$1.eat(tt.eq)){decl.init=this$1.parseMaybeAssign(isFor)}else if(kind==="const"&&!(this$1.type===tt._in||(this$1.options.ecmaVersion>=6&&this$1.isContextual("of")))){this$1.unexpected()}else if(decl.id.type!="Identifier"&&!(isFor&&(this$1.type===tt._in||this$1.isContextual("of")))){this$1.raise(this$1.lastTokEnd,"Complex binding patterns require an initialization value")}else{decl.init=null}
node.declarations.push(this$1.finishNode(decl,"VariableDeclarator"))
if(!this$1.eat(tt.comma))break}
return node}
pp$1.parseVarId=function(decl){decl.id=this.parseBindingAtom()
this.checkLVal(decl.id,true)}
pp$1.parseFunction=function(node,isStatement,allowExpressionBody,isAsync){this.initFunction(node)
if(this.options.ecmaVersion>=6&&!isAsync)
node.generator=this.eat(tt.star)
if(this.options.ecmaVersion>=8)
node.async=!!isAsync
if(isStatement)
node.id=this.parseIdent()
var oldInGen=this.inGenerator,oldInAsync=this.inAsync,oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos
this.inGenerator=node.generator
this.inAsync=node.async
this.yieldPos=0
this.awaitPos=0
if(!isStatement&&this.type===tt.name)
node.id=this.parseIdent()
this.parseFunctionParams(node)
this.parseFunctionBody(node,allowExpressionBody)
this.inGenerator=oldInGen
this.inAsync=oldInAsync
this.yieldPos=oldYieldPos
this.awaitPos=oldAwaitPos
return this.finishNode(node,isStatement?"FunctionDeclaration":"FunctionExpression")}
pp$1.parseFunctionParams=function(node){this.expect(tt.parenL)
node.params=this.parseBindingList(tt.parenR,false,this.options.ecmaVersion>=8,true)
this.checkYieldAwaitInDefaultParams()}
pp$1.parseClass=function(node,isStatement){var this$1=this;this.next()
this.parseClassId(node,isStatement)
this.parseClassSuper(node)
var classBody=this.startNode()
var hadConstructor=false
classBody.body=[]
this.expect(tt.braceL)
while(!this.eat(tt.braceR)){if(this$1.eat(tt.semi))continue
var method=this$1.startNode()
var isGenerator=this$1.eat(tt.star)
var isAsync=false
var isMaybeStatic=this$1.type===tt.name&&this$1.value==="static"
this$1.parsePropertyName(method)
method.static=isMaybeStatic&&this$1.type!==tt.parenL
if(method.static){if(isGenerator)this$1.unexpected()
isGenerator=this$1.eat(tt.star)
this$1.parsePropertyName(method)}
if(this$1.options.ecmaVersion>=8&&!isGenerator&&!method.computed&&method.key.type==="Identifier"&&method.key.name==="async"&&this$1.type!==tt.parenL&&!this$1.canInsertSemicolon()){isAsync=true
this$1.parsePropertyName(method)}
method.kind="method"
var isGetSet=false
if(!method.computed){var key=method.key;if(!isGenerator&&!isAsync&&key.type==="Identifier"&&this$1.type!==tt.parenL&&(key.name==="get"||key.name==="set")){isGetSet=true
method.kind=key.name
key=this$1.parsePropertyName(method)}
if(!method.static&&(key.type==="Identifier"&&key.name==="constructor"||key.type==="Literal"&&key.value==="constructor")){if(hadConstructor)this$1.raise(key.start,"Duplicate constructor in the same class")
if(isGetSet)this$1.raise(key.start,"Constructor can't have get/set modifier")
if(isGenerator)this$1.raise(key.start,"Constructor can't be a generator")
if(isAsync)this$1.raise(key.start,"Constructor can't be an async method")
method.kind="constructor"
hadConstructor=true}}
this$1.parseClassMethod(classBody,method,isGenerator,isAsync)
if(isGetSet){var paramCount=method.kind==="get"?0:1
if(method.value.params.length!==paramCount){var start=method.value.start
if(method.kind==="get")
this$1.raiseRecoverable(start,"getter should have no params")
else
this$1.raiseRecoverable(start,"setter should have exactly one param")}else{if(method.kind==="set"&&method.value.params[0].type==="RestElement")
this$1.raiseRecoverable(method.value.params[0].start,"Setter cannot use rest params")}}}
node.body=this.finishNode(classBody,"ClassBody")
return this.finishNode(node,isStatement?"ClassDeclaration":"ClassExpression")}
pp$1.parseClassMethod=function(classBody,method,isGenerator,isAsync){method.value=this.parseMethod(isGenerator,isAsync)
classBody.body.push(this.finishNode(method,"MethodDefinition"))}
pp$1.parseClassId=function(node,isStatement){node.id=this.type===tt.name?this.parseIdent():isStatement?this.unexpected():null}
pp$1.parseClassSuper=function(node){node.superClass=this.eat(tt._extends)?this.parseExprSubscripts():null}
pp$1.parseExport=function(node,exports){var this$1=this;this.next()
if(this.eat(tt.star)){this.expectContextual("from")
node.source=this.type===tt.string?this.parseExprAtom():this.unexpected()
this.semicolon()
return this.finishNode(node,"ExportAllDeclaration")}
if(this.eat(tt._default)){this.checkExport(exports,"default",this.lastTokStart)
var parens=this.type==tt.parenL
var expr=this.parseMaybeAssign()
var needsSemi=true
if(!parens&&(expr.type=="FunctionExpression"||expr.type=="ClassExpression")){needsSemi=false
if(expr.id){expr.type=expr.type=="FunctionExpression"?"FunctionDeclaration":"ClassDeclaration"}}
node.declaration=expr
if(needsSemi)this.semicolon()
return this.finishNode(node,"ExportDefaultDeclaration")}
if(this.shouldParseExportStatement()){node.declaration=this.parseStatement(true)
if(node.declaration.type==="VariableDeclaration")
this.checkVariableExport(exports,node.declaration.declarations)
else
this.checkExport(exports,node.declaration.id.name,node.declaration.id.start)
node.specifiers=[]
node.source=null}else{node.declaration=null
node.specifiers=this.parseExportSpecifiers(exports)
if(this.eatContextual("from")){node.source=this.type===tt.string?this.parseExprAtom():this.unexpected()}else{for(var i=0;i<node.specifiers.length;i++){if(this$1.keywords.test(node.specifiers[i].local.name)||this$1.reservedWords.test(node.specifiers[i].local.name)){this$1.unexpected(node.specifiers[i].local.start)}}
node.source=null}
this.semicolon()}
return this.finishNode(node,"ExportNamedDeclaration")}
pp$1.checkExport=function(exports,name,pos){if(!exports)return
if(Object.prototype.hasOwnProperty.call(exports,name))
this.raiseRecoverable(pos,"Duplicate export '"+name+"'")
exports[name]=true}
pp$1.checkPatternExport=function(exports,pat){var this$1=this;var type=pat.type
if(type=="Identifier")
this.checkExport(exports,pat.name,pat.start)
else if(type=="ObjectPattern")
for(var i=0;i<pat.properties.length;++i)
this$1.checkPatternExport(exports,pat.properties[i].value)
else if(type=="ArrayPattern")
for(var i$1=0;i$1<pat.elements.length;++i$1){var elt=pat.elements[i$1]
if(elt)this$1.checkPatternExport(exports,elt)}
else if(type=="AssignmentPattern")
this.checkPatternExport(exports,pat.left)
else if(type=="ParenthesizedExpression")
this.checkPatternExport(exports,pat.expression)}
pp$1.checkVariableExport=function(exports,decls){var this$1=this;if(!exports)return
for(var i=0;i<decls.length;i++)
this$1.checkPatternExport(exports,decls[i].id)}
pp$1.shouldParseExportStatement=function(){return this.type.keyword||this.isLet()||this.isAsyncFunction()}
pp$1.parseExportSpecifiers=function(exports){var this$1=this;var nodes=[],first=true
this.expect(tt.braceL)
while(!this.eat(tt.braceR)){if(!first){this$1.expect(tt.comma)
if(this$1.afterTrailingComma(tt.braceR))break}else first=false
var node=this$1.startNode()
node.local=this$1.parseIdent(this$1.type===tt._default)
node.exported=this$1.eatContextual("as")?this$1.parseIdent(true):node.local
this$1.checkExport(exports,node.exported.name,node.exported.start)
nodes.push(this$1.finishNode(node,"ExportSpecifier"))}
return nodes}
pp$1.parseImport=function(node){this.next()
if(this.type===tt.string){node.specifiers=empty
node.source=this.parseExprAtom()}else{node.specifiers=this.parseImportSpecifiers()
this.expectContextual("from")
node.source=this.type===tt.string?this.parseExprAtom():this.unexpected()}
this.semicolon()
return this.finishNode(node,"ImportDeclaration")}
pp$1.parseImportSpecifiers=function(){var this$1=this;var nodes=[],first=true
if(this.type===tt.name){var node=this.startNode()
node.local=this.parseIdent()
this.checkLVal(node.local,true)
nodes.push(this.finishNode(node,"ImportDefaultSpecifier"))
if(!this.eat(tt.comma))return nodes}
if(this.type===tt.star){var node$1=this.startNode()
this.next()
this.expectContextual("as")
node$1.local=this.parseIdent()
this.checkLVal(node$1.local,true)
nodes.push(this.finishNode(node$1,"ImportNamespaceSpecifier"))
return nodes}
this.expect(tt.braceL)
while(!this.eat(tt.braceR)){if(!first){this$1.expect(tt.comma)
if(this$1.afterTrailingComma(tt.braceR))break}else first=false
var node$2=this$1.startNode()
node$2.imported=this$1.parseIdent(true)
if(this$1.eatContextual("as")){node$2.local=this$1.parseIdent()}else{node$2.local=node$2.imported
if(this$1.isKeyword(node$2.local.name))this$1.unexpected(node$2.local.start)
if(this$1.reservedWordsStrict.test(node$2.local.name))this$1.raiseRecoverable(node$2.local.start,"The keyword '"+node$2.local.name+"' is reserved")}
this$1.checkLVal(node$2.local,true)
nodes.push(this$1.finishNode(node$2,"ImportSpecifier"))}
return nodes}
var pp$2=Parser.prototype
pp$2.toAssignable=function(node,isBinding){var this$1=this;if(this.options.ecmaVersion>=6&&node){switch(node.type){case"Identifier":if(this.inAsync&&node.name==="await")
this.raise(node.start,"Can not use 'await' as identifier inside an async function")
break
case"ObjectPattern":case"ArrayPattern":break
case"ObjectExpression":node.type="ObjectPattern"
for(var i=0;i<node.properties.length;i++){var prop=node.properties[i]
if(prop.kind!=="init")this$1.raise(prop.key.start,"Object pattern can't contain getter or setter")
this$1.toAssignable(prop.value,isBinding)}
break
case"ArrayExpression":node.type="ArrayPattern"
this.toAssignableList(node.elements,isBinding)
break
case"AssignmentExpression":if(node.operator==="="){node.type="AssignmentPattern"
delete node.operator
this.toAssignable(node.left,isBinding)}else{this.raise(node.left.end,"Only '=' operator can be used for specifying default value.")
break}
case"AssignmentPattern":break
case"ParenthesizedExpression":node.expression=this.toAssignable(node.expression,isBinding)
break
case"MemberExpression":if(!isBinding)break
default:this.raise(node.start,"Assigning to rvalue")}}
return node}
pp$2.toAssignableList=function(exprList,isBinding){var this$1=this;var end=exprList.length
if(end){var last=exprList[end-1]
if(last&&last.type=="RestElement"){--end}else if(last&&last.type=="SpreadElement"){last.type="RestElement"
var arg=last.argument
this.toAssignable(arg,isBinding)
if(arg.type!=="Identifier"&&arg.type!=="MemberExpression"&&arg.type!=="ArrayPattern")
this.unexpected(arg.start)
--end}
if(isBinding&&last&&last.type==="RestElement"&&last.argument.type!=="Identifier")
this.unexpected(last.argument.start)}
for(var i=0;i<end;i++){var elt=exprList[i]
if(elt)this$1.toAssignable(elt,isBinding)}
return exprList}
pp$2.parseSpread=function(refDestructuringErrors){var node=this.startNode()
this.next()
node.argument=this.parseMaybeAssign(false,refDestructuringErrors)
return this.finishNode(node,"SpreadElement")}
pp$2.parseRest=function(allowNonIdent){var node=this.startNode()
this.next()
if(allowNonIdent)node.argument=this.type===tt.name?this.parseIdent():this.unexpected()
else node.argument=this.type===tt.name||this.type===tt.bracketL?this.parseBindingAtom():this.unexpected()
return this.finishNode(node,"RestElement")}
pp$2.parseBindingAtom=function(){if(this.options.ecmaVersion<6)return this.parseIdent()
switch(this.type){case tt.name:return this.parseIdent()
case tt.bracketL:var node=this.startNode()
this.next()
node.elements=this.parseBindingList(tt.bracketR,true,true)
return this.finishNode(node,"ArrayPattern")
case tt.braceL:return this.parseObj(true)
default:this.unexpected()}}
pp$2.parseBindingList=function(close,allowEmpty,allowTrailingComma,allowNonIdent){var this$1=this;var elts=[],first=true
while(!this.eat(close)){if(first)first=false
else this$1.expect(tt.comma)
if(allowEmpty&&this$1.type===tt.comma){elts.push(null)}else if(allowTrailingComma&&this$1.afterTrailingComma(close)){break}else if(this$1.type===tt.ellipsis){var rest=this$1.parseRest(allowNonIdent)
this$1.parseBindingListItem(rest)
elts.push(rest)
if(this$1.type===tt.comma)this$1.raise(this$1.start,"Comma is not permitted after the rest element")
this$1.expect(close)
break}else{var elem=this$1.parseMaybeDefault(this$1.start,this$1.startLoc)
this$1.parseBindingListItem(elem)
elts.push(elem)}}
return elts}
pp$2.parseBindingListItem=function(param){return param}
pp$2.parseMaybeDefault=function(startPos,startLoc,left){left=left||this.parseBindingAtom()
if(this.options.ecmaVersion<6||!this.eat(tt.eq))return left
var node=this.startNodeAt(startPos,startLoc)
node.left=left
node.right=this.parseMaybeAssign()
return this.finishNode(node,"AssignmentPattern")}
pp$2.checkLVal=function(expr,isBinding,checkClashes){var this$1=this;switch(expr.type){case"Identifier":if(this.strict&&this.reservedWordsStrictBind.test(expr.name))
this.raiseRecoverable(expr.start,(isBinding?"Binding ":"Assigning to ")+expr.name+" in strict mode")
if(checkClashes){if(has(checkClashes,expr.name))
this.raiseRecoverable(expr.start,"Argument name clash")
checkClashes[expr.name]=true}
break
case"MemberExpression":if(isBinding)this.raiseRecoverable(expr.start,(isBinding?"Binding":"Assigning to")+" member expression")
break
case"ObjectPattern":for(var i=0;i<expr.properties.length;i++)
this$1.checkLVal(expr.properties[i].value,isBinding,checkClashes)
break
case"ArrayPattern":for(var i$1=0;i$1<expr.elements.length;i$1++){var elem=expr.elements[i$1]
if(elem)this$1.checkLVal(elem,isBinding,checkClashes)}
break
case"AssignmentPattern":this.checkLVal(expr.left,isBinding,checkClashes)
break
case"RestElement":this.checkLVal(expr.argument,isBinding,checkClashes)
break
case"ParenthesizedExpression":this.checkLVal(expr.expression,isBinding,checkClashes)
break
default:this.raise(expr.start,(isBinding?"Binding":"Assigning to")+" rvalue")}}
var pp$3=Parser.prototype
pp$3.checkPropClash=function(prop,propHash){if(this.options.ecmaVersion>=6&&(prop.computed||prop.method||prop.shorthand))
return
var key=prop.key;var name
switch(key.type){case"Identifier":name=key.name;break
case"Literal":name=String(key.value);break
default:return}
var kind=prop.kind;if(this.options.ecmaVersion>=6){if(name==="__proto__"&&kind==="init"){if(propHash.proto)this.raiseRecoverable(key.start,"Redefinition of __proto__ property")
propHash.proto=true}
return}
name="$"+name
var other=propHash[name]
if(other){var isGetSet=kind!=="init"
if((this.strict||isGetSet)&&other[kind]||!(isGetSet^other.init))
this.raiseRecoverable(key.start,"Redefinition of property")}else{other=propHash[name]={init:false,get:false,set:false}}
other[kind]=true}
pp$3.parseExpression=function(noIn,refDestructuringErrors){var this$1=this;var startPos=this.start,startLoc=this.startLoc
var expr=this.parseMaybeAssign(noIn,refDestructuringErrors)
if(this.type===tt.comma){var node=this.startNodeAt(startPos,startLoc)
node.expressions=[expr]
while(this.eat(tt.comma))node.expressions.push(this$1.parseMaybeAssign(noIn,refDestructuringErrors))
return this.finishNode(node,"SequenceExpression")}
return expr}
pp$3.parseMaybeAssign=function(noIn,refDestructuringErrors,afterLeftParse){if(this.inGenerator&&this.isContextual("yield"))return this.parseYield()
var ownDestructuringErrors=false
if(!refDestructuringErrors){refDestructuringErrors=new DestructuringErrors
ownDestructuringErrors=true}
var startPos=this.start,startLoc=this.startLoc
if(this.type==tt.parenL||this.type==tt.name)
this.potentialArrowAt=this.start
var left=this.parseMaybeConditional(noIn,refDestructuringErrors)
if(afterLeftParse)left=afterLeftParse.call(this,left,startPos,startLoc)
if(this.type.isAssign){this.checkPatternErrors(refDestructuringErrors,true)
if(!ownDestructuringErrors)DestructuringErrors.call(refDestructuringErrors)
var node=this.startNodeAt(startPos,startLoc)
node.operator=this.value
node.left=this.type===tt.eq?this.toAssignable(left):left
refDestructuringErrors.shorthandAssign=0
this.checkLVal(left)
this.next()
node.right=this.parseMaybeAssign(noIn)
return this.finishNode(node,"AssignmentExpression")}else{if(ownDestructuringErrors)this.checkExpressionErrors(refDestructuringErrors,true)}
return left}
pp$3.parseMaybeConditional=function(noIn,refDestructuringErrors){var startPos=this.start,startLoc=this.startLoc
var expr=this.parseExprOps(noIn,refDestructuringErrors)
if(this.checkExpressionErrors(refDestructuringErrors))return expr
if(this.eat(tt.question)){var node=this.startNodeAt(startPos,startLoc)
node.test=expr
node.consequent=this.parseMaybeAssign()
this.expect(tt.colon)
node.alternate=this.parseMaybeAssign(noIn)
return this.finishNode(node,"ConditionalExpression")}
return expr}
pp$3.parseExprOps=function(noIn,refDestructuringErrors){var startPos=this.start,startLoc=this.startLoc
var expr=this.parseMaybeUnary(refDestructuringErrors,false)
if(this.checkExpressionErrors(refDestructuringErrors))return expr
return this.parseExprOp(expr,startPos,startLoc,-1,noIn)}
pp$3.parseExprOp=function(left,leftStartPos,leftStartLoc,minPrec,noIn){var prec=this.type.binop
if(prec!=null&&(!noIn||this.type!==tt._in)){if(prec>minPrec){var logical=this.type===tt.logicalOR||this.type===tt.logicalAND
var op=this.value
this.next()
var startPos=this.start,startLoc=this.startLoc
var right=this.parseExprOp(this.parseMaybeUnary(null,false),startPos,startLoc,prec,noIn)
var node=this.buildBinary(leftStartPos,leftStartLoc,left,right,op,logical)
return this.parseExprOp(node,leftStartPos,leftStartLoc,minPrec,noIn)}}
return left}
pp$3.buildBinary=function(startPos,startLoc,left,right,op,logical){var node=this.startNodeAt(startPos,startLoc)
node.left=left
node.operator=op
node.right=right
return this.finishNode(node,logical?"LogicalExpression":"BinaryExpression")}
pp$3.parseMaybeUnary=function(refDestructuringErrors,sawUnary){var this$1=this;var startPos=this.start,startLoc=this.startLoc,expr
if(this.inAsync&&this.isContextual("await")){expr=this.parseAwait(refDestructuringErrors)
sawUnary=true}else if(this.type.prefix){var node=this.startNode(),update=this.type===tt.incDec
node.operator=this.value
node.prefix=true
this.next()
node.argument=this.parseMaybeUnary(null,true)
this.checkExpressionErrors(refDestructuringErrors,true)
if(update)this.checkLVal(node.argument)
else if(this.strict&&node.operator==="delete"&&node.argument.type==="Identifier")
this.raiseRecoverable(node.start,"Deleting local variable in strict mode")
else sawUnary=true
expr=this.finishNode(node,update?"UpdateExpression":"UnaryExpression")}else{expr=this.parseExprSubscripts(refDestructuringErrors)
if(this.checkExpressionErrors(refDestructuringErrors))return expr
while(this.type.postfix&&!this.canInsertSemicolon()){var node$1=this$1.startNodeAt(startPos,startLoc)
node$1.operator=this$1.value
node$1.prefix=false
node$1.argument=expr
this$1.checkLVal(expr)
this$1.next()
expr=this$1.finishNode(node$1,"UpdateExpression")}}
if(!sawUnary&&this.eat(tt.starstar))
return this.buildBinary(startPos,startLoc,expr,this.parseMaybeUnary(null,false),"**",false)
else
return expr}
pp$3.parseExprSubscripts=function(refDestructuringErrors){var startPos=this.start,startLoc=this.startLoc
var expr=this.parseExprAtom(refDestructuringErrors)
var skipArrowSubscripts=expr.type==="ArrowFunctionExpression"&&this.input.slice(this.lastTokStart,this.lastTokEnd)!==")"
if(this.checkExpressionErrors(refDestructuringErrors)||skipArrowSubscripts)return expr
return this.parseSubscripts(expr,startPos,startLoc)}
pp$3.parseSubscripts=function(base,startPos,startLoc,noCalls){var this$1=this;for(;;){var maybeAsyncArrow=this$1.options.ecmaVersion>=8&&base.type==="Identifier"&&base.name==="async"&&!this$1.canInsertSemicolon()
if(this$1.eat(tt.dot)){var node=this$1.startNodeAt(startPos,startLoc)
node.object=base
node.property=this$1.parseIdent(true)
node.computed=false
base=this$1.finishNode(node,"MemberExpression")}else if(this$1.eat(tt.bracketL)){var node$1=this$1.startNodeAt(startPos,startLoc)
node$1.object=base
node$1.property=this$1.parseExpression()
node$1.computed=true
this$1.expect(tt.bracketR)
base=this$1.finishNode(node$1,"MemberExpression")}else if(!noCalls&&this$1.eat(tt.parenL)){var refDestructuringErrors=new DestructuringErrors,oldYieldPos=this$1.yieldPos,oldAwaitPos=this$1.awaitPos
this$1.yieldPos=0
this$1.awaitPos=0
var exprList=this$1.parseExprList(tt.parenR,this$1.options.ecmaVersion>=8,false,refDestructuringErrors)
if(maybeAsyncArrow&&!this$1.canInsertSemicolon()&&this$1.eat(tt.arrow)){this$1.checkPatternErrors(refDestructuringErrors,true)
this$1.checkYieldAwaitInDefaultParams()
this$1.yieldPos=oldYieldPos
this$1.awaitPos=oldAwaitPos
return this$1.parseArrowExpression(this$1.startNodeAt(startPos,startLoc),exprList,true)}
this$1.checkExpressionErrors(refDestructuringErrors,true)
this$1.yieldPos=oldYieldPos||this$1.yieldPos
this$1.awaitPos=oldAwaitPos||this$1.awaitPos
var node$2=this$1.startNodeAt(startPos,startLoc)
node$2.callee=base
node$2.arguments=exprList
base=this$1.finishNode(node$2,"CallExpression")}else if(this$1.type===tt.backQuote){var node$3=this$1.startNodeAt(startPos,startLoc)
node$3.tag=base
node$3.quasi=this$1.parseTemplate()
base=this$1.finishNode(node$3,"TaggedTemplateExpression")}else{return base}}}
pp$3.parseExprAtom=function(refDestructuringErrors){var node,canBeArrow=this.potentialArrowAt==this.start
switch(this.type){case tt._super:if(!this.inFunction)
this.raise(this.start,"'super' outside of function or class")
case tt._this:var type=this.type===tt._this?"ThisExpression":"Super"
node=this.startNode()
this.next()
return this.finishNode(node,type)
case tt.name:var startPos=this.start,startLoc=this.startLoc
var id=this.parseIdent(this.type!==tt.name)
if(this.options.ecmaVersion>=8&&id.name==="async"&&!this.canInsertSemicolon()&&this.eat(tt._function))
return this.parseFunction(this.startNodeAt(startPos,startLoc),false,false,true)
if(canBeArrow&&!this.canInsertSemicolon()){if(this.eat(tt.arrow))
return this.parseArrowExpression(this.startNodeAt(startPos,startLoc),[id],false)
if(this.options.ecmaVersion>=8&&id.name==="async"&&this.type===tt.name){id=this.parseIdent()
if(this.canInsertSemicolon()||!this.eat(tt.arrow))
this.unexpected()
return this.parseArrowExpression(this.startNodeAt(startPos,startLoc),[id],true)}}
return id
case tt.regexp:var value=this.value
node=this.parseLiteral(value.value)
node.regex={pattern:value.pattern,flags:value.flags}
return node
case tt.num:case tt.string:return this.parseLiteral(this.value)
case tt._null:case tt._true:case tt._false:node=this.startNode()
node.value=this.type===tt._null?null:this.type===tt._true
node.raw=this.type.keyword
this.next()
return this.finishNode(node,"Literal")
case tt.parenL:return this.parseParenAndDistinguishExpression(canBeArrow)
case tt.bracketL:node=this.startNode()
this.next()
node.elements=this.parseExprList(tt.bracketR,true,true,refDestructuringErrors)
return this.finishNode(node,"ArrayExpression")
case tt.braceL:return this.parseObj(false,refDestructuringErrors)
case tt._function:node=this.startNode()
this.next()
return this.parseFunction(node,false)
case tt._class:return this.parseClass(this.startNode(),false)
case tt._new:return this.parseNew()
case tt.backQuote:return this.parseTemplate()
default:this.unexpected()}}
pp$3.parseLiteral=function(value){var node=this.startNode()
node.value=value
node.raw=this.input.slice(this.start,this.end)
this.next()
return this.finishNode(node,"Literal")}
pp$3.parseParenExpression=function(){this.expect(tt.parenL)
var val=this.parseExpression()
this.expect(tt.parenR)
return val}
pp$3.parseParenAndDistinguishExpression=function(canBeArrow){var this$1=this;var startPos=this.start,startLoc=this.startLoc,val,allowTrailingComma=this.options.ecmaVersion>=8
if(this.options.ecmaVersion>=6){this.next()
var innerStartPos=this.start,innerStartLoc=this.startLoc
var exprList=[],first=true,lastIsComma=false
var refDestructuringErrors=new DestructuringErrors,oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos,spreadStart,innerParenStart
this.yieldPos=0
this.awaitPos=0
while(this.type!==tt.parenR){first?first=false:this$1.expect(tt.comma)
if(allowTrailingComma&&this$1.afterTrailingComma(tt.parenR,true)){lastIsComma=true
break}else if(this$1.type===tt.ellipsis){spreadStart=this$1.start
exprList.push(this$1.parseParenItem(this$1.parseRest()))
if(this$1.type===tt.comma)this$1.raise(this$1.start,"Comma is not permitted after the rest element")
break}else{if(this$1.type===tt.parenL&&!innerParenStart){innerParenStart=this$1.start}
exprList.push(this$1.parseMaybeAssign(false,refDestructuringErrors,this$1.parseParenItem))}}
var innerEndPos=this.start,innerEndLoc=this.startLoc
this.expect(tt.parenR)
if(canBeArrow&&!this.canInsertSemicolon()&&this.eat(tt.arrow)){this.checkPatternErrors(refDestructuringErrors,true)
this.checkYieldAwaitInDefaultParams()
if(innerParenStart)this.unexpected(innerParenStart)
this.yieldPos=oldYieldPos
this.awaitPos=oldAwaitPos
return this.parseParenArrowList(startPos,startLoc,exprList)}
if(!exprList.length||lastIsComma)this.unexpected(this.lastTokStart)
if(spreadStart)this.unexpected(spreadStart)
this.checkExpressionErrors(refDestructuringErrors,true)
this.yieldPos=oldYieldPos||this.yieldPos
this.awaitPos=oldAwaitPos||this.awaitPos
if(exprList.length>1){val=this.startNodeAt(innerStartPos,innerStartLoc)
val.expressions=exprList
this.finishNodeAt(val,"SequenceExpression",innerEndPos,innerEndLoc)}else{val=exprList[0]}}else{val=this.parseParenExpression()}
if(this.options.preserveParens){var par=this.startNodeAt(startPos,startLoc)
par.expression=val
return this.finishNode(par,"ParenthesizedExpression")}else{return val}}
pp$3.parseParenItem=function(item){return item}
pp$3.parseParenArrowList=function(startPos,startLoc,exprList){return this.parseArrowExpression(this.startNodeAt(startPos,startLoc),exprList)}
var empty$1=[]
pp$3.parseNew=function(){var node=this.startNode()
var meta=this.parseIdent(true)
if(this.options.ecmaVersion>=6&&this.eat(tt.dot)){node.meta=meta
node.property=this.parseIdent(true)
if(node.property.name!=="target")
this.raiseRecoverable(node.property.start,"The only valid meta property for new is new.target")
if(!this.inFunction)
this.raiseRecoverable(node.start,"new.target can only be used in functions")
return this.finishNode(node,"MetaProperty")}
var startPos=this.start,startLoc=this.startLoc
node.callee=this.parseSubscripts(this.parseExprAtom(),startPos,startLoc,true)
if(this.eat(tt.parenL))node.arguments=this.parseExprList(tt.parenR,this.options.ecmaVersion>=8,false)
else node.arguments=empty$1
return this.finishNode(node,"NewExpression")}
pp$3.parseTemplateElement=function(){var elem=this.startNode()
elem.value={raw:this.input.slice(this.start,this.end).replace(/\r\n?/g,'\n'),cooked:this.value}
this.next()
elem.tail=this.type===tt.backQuote
return this.finishNode(elem,"TemplateElement")}
pp$3.parseTemplate=function(){var this$1=this;var node=this.startNode()
this.next()
node.expressions=[]
var curElt=this.parseTemplateElement()
node.quasis=[curElt]
while(!curElt.tail){this$1.expect(tt.dollarBraceL)
node.expressions.push(this$1.parseExpression())
this$1.expect(tt.braceR)
node.quasis.push(curElt=this$1.parseTemplateElement())}
this.next()
return this.finishNode(node,"TemplateLiteral")}
pp$3.parseObj=function(isPattern,refDestructuringErrors){var this$1=this;var node=this.startNode(),first=true,propHash={}
node.properties=[]
this.next()
while(!this.eat(tt.braceR)){if(!first){this$1.expect(tt.comma)
if(this$1.afterTrailingComma(tt.braceR))break}else first=false
var prop=this$1.startNode(),isGenerator,isAsync,startPos,startLoc
if(this$1.options.ecmaVersion>=6){prop.method=false
prop.shorthand=false
if(isPattern||refDestructuringErrors){startPos=this$1.start
startLoc=this$1.startLoc}
if(!isPattern)
isGenerator=this$1.eat(tt.star)}
this$1.parsePropertyName(prop)
if(!isPattern&&this$1.options.ecmaVersion>=8&&!isGenerator&&!prop.computed&&prop.key.type==="Identifier"&&prop.key.name==="async"&&this$1.type!==tt.parenL&&this$1.type!==tt.colon&&!this$1.canInsertSemicolon()){isAsync=true
this$1.parsePropertyName(prop,refDestructuringErrors)}else{isAsync=false}
this$1.parsePropertyValue(prop,isPattern,isGenerator,isAsync,startPos,startLoc,refDestructuringErrors)
this$1.checkPropClash(prop,propHash)
node.properties.push(this$1.finishNode(prop,"Property"))}
return this.finishNode(node,isPattern?"ObjectPattern":"ObjectExpression")}
pp$3.parsePropertyValue=function(prop,isPattern,isGenerator,isAsync,startPos,startLoc,refDestructuringErrors){if((isGenerator||isAsync)&&this.type===tt.colon)
this.unexpected()
if(this.eat(tt.colon)){prop.value=isPattern?this.parseMaybeDefault(this.start,this.startLoc):this.parseMaybeAssign(false,refDestructuringErrors)
prop.kind="init"}else if(this.options.ecmaVersion>=6&&this.type===tt.parenL){if(isPattern)this.unexpected()
prop.kind="init"
prop.method=true
prop.value=this.parseMethod(isGenerator,isAsync)}else if(this.options.ecmaVersion>=5&&!prop.computed&&prop.key.type==="Identifier"&&(prop.key.name==="get"||prop.key.name==="set")&&(this.type!=tt.comma&&this.type!=tt.braceR)){if(isGenerator||isAsync||isPattern)this.unexpected()
prop.kind=prop.key.name
this.parsePropertyName(prop)
prop.value=this.parseMethod(false)
var paramCount=prop.kind==="get"?0:1
if(prop.value.params.length!==paramCount){var start=prop.value.start
if(prop.kind==="get")
this.raiseRecoverable(start,"getter should have no params")
else
this.raiseRecoverable(start,"setter should have exactly one param")}else{if(prop.kind==="set"&&prop.value.params[0].type==="RestElement")
this.raiseRecoverable(prop.value.params[0].start,"Setter cannot use rest params")}}else if(this.options.ecmaVersion>=6&&!prop.computed&&prop.key.type==="Identifier"){if(this.keywords.test(prop.key.name)||(this.strict?this.reservedWordsStrict:this.reservedWords).test(prop.key.name)||(this.inGenerator&&prop.key.name=="yield")||(this.inAsync&&prop.key.name=="await"))
this.raiseRecoverable(prop.key.start,"'"+prop.key.name+"' can not be used as shorthand property")
prop.kind="init"
if(isPattern){prop.value=this.parseMaybeDefault(startPos,startLoc,prop.key)}else if(this.type===tt.eq&&refDestructuringErrors){if(!refDestructuringErrors.shorthandAssign)
refDestructuringErrors.shorthandAssign=this.start
prop.value=this.parseMaybeDefault(startPos,startLoc,prop.key)}else{prop.value=prop.key}
prop.shorthand=true}else this.unexpected()}
pp$3.parsePropertyName=function(prop){if(this.options.ecmaVersion>=6){if(this.eat(tt.bracketL)){prop.computed=true
prop.key=this.parseMaybeAssign()
this.expect(tt.bracketR)
return prop.key}else{prop.computed=false}}
return prop.key=this.type===tt.num||this.type===tt.string?this.parseExprAtom():this.parseIdent(true)}
pp$3.initFunction=function(node){node.id=null
if(this.options.ecmaVersion>=6){node.generator=false
node.expression=false}
if(this.options.ecmaVersion>=8)
node.async=false}
pp$3.parseMethod=function(isGenerator,isAsync){var node=this.startNode(),oldInGen=this.inGenerator,oldInAsync=this.inAsync,oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos
this.initFunction(node)
if(this.options.ecmaVersion>=6)
node.generator=isGenerator
if(this.options.ecmaVersion>=8)
node.async=!!isAsync
this.inGenerator=node.generator
this.inAsync=node.async
this.yieldPos=0
this.awaitPos=0
this.expect(tt.parenL)
node.params=this.parseBindingList(tt.parenR,false,this.options.ecmaVersion>=8)
this.checkYieldAwaitInDefaultParams()
this.parseFunctionBody(node,false)
this.inGenerator=oldInGen
this.inAsync=oldInAsync
this.yieldPos=oldYieldPos
this.awaitPos=oldAwaitPos
return this.finishNode(node,"FunctionExpression")}
pp$3.parseArrowExpression=function(node,params,isAsync){var oldInGen=this.inGenerator,oldInAsync=this.inAsync,oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos
this.initFunction(node)
if(this.options.ecmaVersion>=8)
node.async=!!isAsync
this.inGenerator=false
this.inAsync=node.async
this.yieldPos=0
this.awaitPos=0
node.params=this.toAssignableList(params,true)
this.parseFunctionBody(node,true)
this.inGenerator=oldInGen
this.inAsync=oldInAsync
this.yieldPos=oldYieldPos
this.awaitPos=oldAwaitPos
return this.finishNode(node,"ArrowFunctionExpression")}
pp$3.parseFunctionBody=function(node,isArrowFunction){var isExpression=isArrowFunction&&this.type!==tt.braceL
if(isExpression){node.body=this.parseMaybeAssign()
node.expression=true}else{var oldInFunc=this.inFunction,oldLabels=this.labels
this.inFunction=true;this.labels=[]
node.body=this.parseBlock(true)
node.expression=false
this.inFunction=oldInFunc;this.labels=oldLabels}
var useStrict=(!isExpression&&node.body.body.length&&this.isUseStrict(node.body.body[0]))?node.body.body[0]:null
if(useStrict&&this.options.ecmaVersion>=7&&!this.isSimpleParamList(node.params))
this.raiseRecoverable(useStrict.start,"Illegal 'use strict' directive in function with non-simple parameter list")
if(this.strict||useStrict){var oldStrict=this.strict
this.strict=true
if(node.id)
this.checkLVal(node.id,true)
this.checkParams(node)
this.strict=oldStrict}else if(isArrowFunction||!this.isSimpleParamList(node.params)){this.checkParams(node)}}
pp$3.isSimpleParamList=function(params){for(var i=0;i<params.length;i++)
if(params[i].type!=="Identifier")return false
return true}
pp$3.checkParams=function(node){var this$1=this;var nameHash={}
for(var i=0;i<node.params.length;i++)this$1.checkLVal(node.params[i],true,nameHash)}
pp$3.parseExprList=function(close,allowTrailingComma,allowEmpty,refDestructuringErrors){var this$1=this;var elts=[],first=true
while(!this.eat(close)){if(!first){this$1.expect(tt.comma)
if(allowTrailingComma&&this$1.afterTrailingComma(close))break}else first=false
var elt
if(allowEmpty&&this$1.type===tt.comma)
elt=null
else if(this$1.type===tt.ellipsis){elt=this$1.parseSpread(refDestructuringErrors)
if(this$1.type===tt.comma&&refDestructuringErrors&&!refDestructuringErrors.trailingComma){refDestructuringErrors.trailingComma=this$1.start}}else
elt=this$1.parseMaybeAssign(false,refDestructuringErrors)
elts.push(elt)}
return elts}
pp$3.parseIdent=function(liberal){var node=this.startNode()
if(liberal&&this.options.allowReserved=="never")liberal=false
if(this.type===tt.name){if(!liberal&&(this.strict?this.reservedWordsStrict:this.reservedWords).test(this.value)&&(this.options.ecmaVersion>=6||this.input.slice(this.start,this.end).indexOf("\\")==-1))
this.raiseRecoverable(this.start,"The keyword '"+this.value+"' is reserved")
if(this.inGenerator&&this.value==="yield")
this.raiseRecoverable(this.start,"Can not use 'yield' as identifier inside a generator")
if(this.inAsync&&this.value==="await")
this.raiseRecoverable(this.start,"Can not use 'await' as identifier inside an async function")
node.name=this.value}else if(liberal&&this.type.keyword){node.name=this.type.keyword}else{this.unexpected()}
this.next()
return this.finishNode(node,"Identifier")}
pp$3.parseYield=function(){if(!this.yieldPos)this.yieldPos=this.start
var node=this.startNode()
this.next()
if(this.type==tt.semi||this.canInsertSemicolon()||(this.type!=tt.star&&!this.type.startsExpr)){node.delegate=false
node.argument=null}else{node.delegate=this.eat(tt.star)
node.argument=this.parseMaybeAssign()}
return this.finishNode(node,"YieldExpression")}
pp$3.parseAwait=function(){if(!this.awaitPos)this.awaitPos=this.start
var node=this.startNode()
this.next()
node.argument=this.parseMaybeUnary(null,true)
return this.finishNode(node,"AwaitExpression")}
var pp$4=Parser.prototype
pp$4.raise=function(pos,message){var loc=getLineInfo(this.input,pos)
message+=" ("+loc.line+":"+loc.column+")"
var err=new SyntaxError(message)
err.pos=pos;err.loc=loc;err.raisedAt=this.pos
throw err}
pp$4.raiseRecoverable=pp$4.raise
pp$4.curPosition=function(){if(this.options.locations){return new Position(this.curLine,this.pos-this.lineStart)}}
var Node=function Node(parser,pos,loc){this.type=""
this.start=pos
this.end=0
if(parser.options.locations)
this.loc=new SourceLocation(parser,loc)
if(parser.options.directSourceFile)
this.sourceFile=parser.options.directSourceFile
if(parser.options.ranges)
this.range=[pos,0]};var pp$5=Parser.prototype
pp$5.startNode=function(){return new Node(this,this.start,this.startLoc)}
pp$5.startNodeAt=function(pos,loc){return new Node(this,pos,loc)}
function finishNodeAt(node,type,pos,loc){node.type=type
node.end=pos
if(this.options.locations)
node.loc.end=loc
if(this.options.ranges)
node.range[1]=pos
return node}
pp$5.finishNode=function(node,type){return finishNodeAt.call(this,node,type,this.lastTokEnd,this.lastTokEndLoc)}
pp$5.finishNodeAt=function(node,type,pos,loc){return finishNodeAt.call(this,node,type,pos,loc)}
var TokContext=function TokContext(token,isExpr,preserveSpace,override){this.token=token
this.isExpr=!!isExpr
this.preserveSpace=!!preserveSpace
this.override=override};var types={b_stat:new TokContext("{",false),b_expr:new TokContext("{",true),b_tmpl:new TokContext("${",true),p_stat:new TokContext("(",false),p_expr:new TokContext("(",true),q_tmpl:new TokContext("`",true,true,function(p){return p.readTmplToken();}),f_expr:new TokContext("function",true)}
var pp$6=Parser.prototype
pp$6.initialContext=function(){return[types.b_stat]}
pp$6.braceIsBlock=function(prevType){if(prevType===tt.colon){var parent=this.curContext()
if(parent===types.b_stat||parent===types.b_expr)
return!parent.isExpr}
if(prevType===tt._return)
return lineBreak.test(this.input.slice(this.lastTokEnd,this.start))
if(prevType===tt._else||prevType===tt.semi||prevType===tt.eof||prevType===tt.parenR)
return true
if(prevType==tt.braceL)
return this.curContext()===types.b_stat
return!this.exprAllowed}
pp$6.updateContext=function(prevType){var update,type=this.type
if(type.keyword&&prevType==tt.dot)
this.exprAllowed=false
else if(update=type.updateContext)
update.call(this,prevType)
else
this.exprAllowed=type.beforeExpr}
tt.parenR.updateContext=tt.braceR.updateContext=function(){if(this.context.length==1){this.exprAllowed=true
return}
var out=this.context.pop()
if(out===types.b_stat&&this.curContext()===types.f_expr){this.context.pop()
this.exprAllowed=false}else if(out===types.b_tmpl){this.exprAllowed=true}else{this.exprAllowed=!out.isExpr}}
tt.braceL.updateContext=function(prevType){this.context.push(this.braceIsBlock(prevType)?types.b_stat:types.b_expr)
this.exprAllowed=true}
tt.dollarBraceL.updateContext=function(){this.context.push(types.b_tmpl)
this.exprAllowed=true}
tt.parenL.updateContext=function(prevType){var statementParens=prevType===tt._if||prevType===tt._for||prevType===tt._with||prevType===tt._while
this.context.push(statementParens?types.p_stat:types.p_expr)
this.exprAllowed=true}
tt.incDec.updateContext=function(){}
tt._function.updateContext=function(prevType){if(prevType.beforeExpr&&prevType!==tt.semi&&prevType!==tt._else&&!((prevType===tt.colon||prevType===tt.braceL)&&this.curContext()===types.b_stat))
this.context.push(types.f_expr)
this.exprAllowed=false}
tt.backQuote.updateContext=function(){if(this.curContext()===types.q_tmpl)
this.context.pop()
else
this.context.push(types.q_tmpl)
this.exprAllowed=false}
var Token=function Token(p){this.type=p.type
this.value=p.value
this.start=p.start
this.end=p.end
if(p.options.locations)
this.loc=new SourceLocation(p,p.startLoc,p.endLoc)
if(p.options.ranges)
this.range=[p.start,p.end]};var pp$7=Parser.prototype
var isRhino=typeof Packages=="object"&&Object.prototype.toString.call(Packages)=="[object JavaPackage]"
pp$7.next=function(){if(this.options.onToken)
this.options.onToken(new Token(this))
this.lastTokEnd=this.end
this.lastTokStart=this.start
this.lastTokEndLoc=this.endLoc
this.lastTokStartLoc=this.startLoc
this.nextToken()}
pp$7.getToken=function(){this.next()
return new Token(this)}
if(typeof Symbol!=="undefined")
pp$7[Symbol.iterator]=function(){var self=this
return{next:function(){var token=self.getToken()
return{done:token.type===tt.eof,value:token}}}}
pp$7.setStrict=function(strict){var this$1=this;this.strict=strict
if(this.type!==tt.num&&this.type!==tt.string)return
this.pos=this.start
if(this.options.locations){while(this.pos<this.lineStart){this$1.lineStart=this$1.input.lastIndexOf("\n",this$1.lineStart-2)+1
--this$1.curLine}}
this.nextToken()}
pp$7.curContext=function(){return this.context[this.context.length-1]}
pp$7.nextToken=function(){var curContext=this.curContext()
if(!curContext||!curContext.preserveSpace)this.skipSpace()
this.start=this.pos
if(this.options.locations)this.startLoc=this.curPosition()
if(this.pos>=this.input.length)return this.finishToken(tt.eof)
if(curContext.override)return curContext.override(this)
else this.readToken(this.fullCharCodeAtPos())}
pp$7.readToken=function(code){if(isIdentifierStart(code,this.options.ecmaVersion>=6)||code===92)
return this.readWord()
return this.getTokenFromCode(code)}
pp$7.fullCharCodeAtPos=function(){var code=this.input.charCodeAt(this.pos)
if(code<=0xd7ff||code>=0xe000)return code
var next=this.input.charCodeAt(this.pos+1)
return(code<<10)+next-0x35fdc00}
pp$7.skipBlockComment=function(){var this$1=this;var startLoc=this.options.onComment&&this.curPosition()
var start=this.pos,end=this.input.indexOf("*/",this.pos+=2)
if(end===-1)this.raise(this.pos-2,"Unterminated comment")
this.pos=end+2
if(this.options.locations){lineBreakG.lastIndex=start
var match
while((match=lineBreakG.exec(this.input))&&match.index<this.pos){++this$1.curLine
this$1.lineStart=match.index+match[0].length}}
if(this.options.onComment)
this.options.onComment(true,this.input.slice(start+2,end),start,this.pos,startLoc,this.curPosition())}
pp$7.skipLineComment=function(startSkip){var this$1=this;var start=this.pos
var startLoc=this.options.onComment&&this.curPosition()
var ch=this.input.charCodeAt(this.pos+=startSkip)
while(this.pos<this.input.length&&ch!==10&&ch!==13&&ch!==8232&&ch!==8233){++this$1.pos
ch=this$1.input.charCodeAt(this$1.pos)}
if(this.options.onComment)
this.options.onComment(false,this.input.slice(start+startSkip,this.pos),start,this.pos,startLoc,this.curPosition())}
pp$7.skipSpace=function(){var this$1=this;loop:while(this.pos<this.input.length){var ch=this$1.input.charCodeAt(this$1.pos)
switch(ch){case 32:case 160:++this$1.pos
break
case 13:if(this$1.input.charCodeAt(this$1.pos+1)===10){++this$1.pos}
case 10:case 8232:case 8233:++this$1.pos
if(this$1.options.locations){++this$1.curLine
this$1.lineStart=this$1.pos}
break
case 47:switch(this$1.input.charCodeAt(this$1.pos+1)){case 42:this$1.skipBlockComment()
break
case 47:this$1.skipLineComment(2)
break
default:break loop}
break
default:if(ch>8&&ch<14||ch>=5760&&nonASCIIwhitespace.test(String.fromCharCode(ch))){++this$1.pos}else{break loop}}}}
pp$7.finishToken=function(type,val){this.end=this.pos
if(this.options.locations)this.endLoc=this.curPosition()
var prevType=this.type
this.type=type
this.value=val
this.updateContext(prevType)}
pp$7.readToken_dot=function(){var next=this.input.charCodeAt(this.pos+1)
if(next>=48&&next<=57)return this.readNumber(true)
var next2=this.input.charCodeAt(this.pos+2)
if(this.options.ecmaVersion>=6&&next===46&&next2===46){this.pos+=3
return this.finishToken(tt.ellipsis)}else{++this.pos
return this.finishToken(tt.dot)}}
pp$7.readToken_slash=function(){var next=this.input.charCodeAt(this.pos+1)
if(this.exprAllowed){++this.pos;return this.readRegexp()}
if(next===61)return this.finishOp(tt.assign,2)
return this.finishOp(tt.slash,1)}
pp$7.readToken_mult_modulo_exp=function(code){var next=this.input.charCodeAt(this.pos+1)
var size=1
var tokentype=code===42?tt.star:tt.modulo
if(this.options.ecmaVersion>=7&&next===42){++size
tokentype=tt.starstar
next=this.input.charCodeAt(this.pos+2)}
if(next===61)return this.finishOp(tt.assign,size+1)
return this.finishOp(tokentype,size)}
pp$7.readToken_pipe_amp=function(code){var next=this.input.charCodeAt(this.pos+1)
if(next===code)return this.finishOp(code===124?tt.logicalOR:tt.logicalAND,2)
if(next===61)return this.finishOp(tt.assign,2)
return this.finishOp(code===124?tt.bitwiseOR:tt.bitwiseAND,1)}
pp$7.readToken_caret=function(){var next=this.input.charCodeAt(this.pos+1)
if(next===61)return this.finishOp(tt.assign,2)
return this.finishOp(tt.bitwiseXOR,1)}
pp$7.readToken_plus_min=function(code){var next=this.input.charCodeAt(this.pos+1)
if(next===code){if(next==45&&this.input.charCodeAt(this.pos+2)==62&&lineBreak.test(this.input.slice(this.lastTokEnd,this.pos))){this.skipLineComment(3)
this.skipSpace()
return this.nextToken()}
return this.finishOp(tt.incDec,2)}
if(next===61)return this.finishOp(tt.assign,2)
return this.finishOp(tt.plusMin,1)}
pp$7.readToken_lt_gt=function(code){var next=this.input.charCodeAt(this.pos+1)
var size=1
if(next===code){size=code===62&&this.input.charCodeAt(this.pos+2)===62?3:2
if(this.input.charCodeAt(this.pos+size)===61)return this.finishOp(tt.assign,size+1)
return this.finishOp(tt.bitShift,size)}
if(next==33&&code==60&&this.input.charCodeAt(this.pos+2)==45&&this.input.charCodeAt(this.pos+3)==45){if(this.inModule)this.unexpected()
this.skipLineComment(4)
this.skipSpace()
return this.nextToken()}
if(next===61)size=2
return this.finishOp(tt.relational,size)}
pp$7.readToken_eq_excl=function(code){var next=this.input.charCodeAt(this.pos+1)
if(next===61)return this.finishOp(tt.equality,this.input.charCodeAt(this.pos+2)===61?3:2)
if(code===61&&next===62&&this.options.ecmaVersion>=6){this.pos+=2
return this.finishToken(tt.arrow)}
return this.finishOp(code===61?tt.eq:tt.prefix,1)}
pp$7.getTokenFromCode=function(code){switch(code){case 46:return this.readToken_dot()
case 40:++this.pos;return this.finishToken(tt.parenL)
case 41:++this.pos;return this.finishToken(tt.parenR)
case 59:++this.pos;return this.finishToken(tt.semi)
case 44:++this.pos;return this.finishToken(tt.comma)
case 91:++this.pos;return this.finishToken(tt.bracketL)
case 93:++this.pos;return this.finishToken(tt.bracketR)
case 123:++this.pos;return this.finishToken(tt.braceL)
case 125:++this.pos;return this.finishToken(tt.braceR)
case 58:++this.pos;return this.finishToken(tt.colon)
case 63:++this.pos;return this.finishToken(tt.question)
case 96:if(this.options.ecmaVersion<6)break
++this.pos
return this.finishToken(tt.backQuote)
case 48:var next=this.input.charCodeAt(this.pos+1)
if(next===120||next===88)return this.readRadixNumber(16)
if(this.options.ecmaVersion>=6){if(next===111||next===79)return this.readRadixNumber(8)
if(next===98||next===66)return this.readRadixNumber(2)}
case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return this.readNumber(false)
case 34:case 39:return this.readString(code)
case 47:return this.readToken_slash()
case 37:case 42:return this.readToken_mult_modulo_exp(code)
case 124:case 38:return this.readToken_pipe_amp(code)
case 94:return this.readToken_caret()
case 43:case 45:return this.readToken_plus_min(code)
case 60:case 62:return this.readToken_lt_gt(code)
case 61:case 33:return this.readToken_eq_excl(code)
case 126:return this.finishOp(tt.prefix,1)}
this.raise(this.pos,"Unexpected character '"+codePointToString(code)+"'")}
pp$7.finishOp=function(type,size){var str=this.input.slice(this.pos,this.pos+size)
this.pos+=size
return this.finishToken(type,str)}
function tryCreateRegexp(src,flags,throwErrorAt,parser){try{return new RegExp(src,flags)}catch(e){if(throwErrorAt!==undefined){if(e instanceof SyntaxError)parser.raise(throwErrorAt,"Error parsing regular expression: "+e.message)
throw e}}}
var regexpUnicodeSupport=!!tryCreateRegexp("\uffff","u")
pp$7.readRegexp=function(){var this$1=this;var escaped,inClass,start=this.pos
for(;;){if(this$1.pos>=this$1.input.length)this$1.raise(start,"Unterminated regular expression")
var ch=this$1.input.charAt(this$1.pos)
if(lineBreak.test(ch))this$1.raise(start,"Unterminated regular expression")
if(!escaped){if(ch==="[")inClass=true
else if(ch==="]"&&inClass)inClass=false
else if(ch==="/"&&!inClass)break
escaped=ch==="\\"}else escaped=false
++this$1.pos}
var content=this.input.slice(start,this.pos)
++this.pos
var mods=this.readWord1()
var tmp=content,tmpFlags=""
if(mods){var validFlags=/^[gim]*$/
if(this.options.ecmaVersion>=6)validFlags=/^[gimuy]*$/
if(!validFlags.test(mods))this.raise(start,"Invalid regular expression flag")
if(mods.indexOf("u")>=0){if(regexpUnicodeSupport){tmpFlags="u"}else{tmp=tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g,function(_match,code,offset){code=Number("0x"+code)
if(code>0x10FFFF)this$1.raise(start+offset+3,"Code point out of bounds")
return"x"})
tmp=tmp.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,"x")
tmpFlags=tmpFlags.replace("u","")}}}
var value=null
if(!isRhino){tryCreateRegexp(tmp,tmpFlags,start,this)
value=tryCreateRegexp(content,mods)}
return this.finishToken(tt.regexp,{pattern:content,flags:mods,value:value})}
pp$7.readInt=function(radix,len){var this$1=this;var start=this.pos,total=0
for(var i=0,e=len==null?Infinity:len;i<e;++i){var code=this$1.input.charCodeAt(this$1.pos),val
if(code>=97)val=code-97+10
else if(code>=65)val=code-65+10
else if(code>=48&&code<=57)val=code-48
else val=Infinity
if(val>=radix)break
++this$1.pos
total=total*radix+val}
if(this.pos===start||len!=null&&this.pos-start!==len)return null
return total}
pp$7.readRadixNumber=function(radix){this.pos+=2
var val=this.readInt(radix)
if(val==null)this.raise(this.start+2,"Expected number in radix "+radix)
if(isIdentifierStart(this.fullCharCodeAtPos()))this.raise(this.pos,"Identifier directly after number")
return this.finishToken(tt.num,val)}
pp$7.readNumber=function(startsWithDot){var start=this.pos,isFloat=false,octal=this.input.charCodeAt(this.pos)===48
if(!startsWithDot&&this.readInt(10)===null)this.raise(start,"Invalid number")
if(octal&&this.pos==start+1)octal=false
var next=this.input.charCodeAt(this.pos)
if(next===46&&!octal){++this.pos
this.readInt(10)
isFloat=true
next=this.input.charCodeAt(this.pos)}
if((next===69||next===101)&&!octal){next=this.input.charCodeAt(++this.pos)
if(next===43||next===45)++this.pos
if(this.readInt(10)===null)this.raise(start,"Invalid number")
isFloat=true}
if(isIdentifierStart(this.fullCharCodeAtPos()))this.raise(this.pos,"Identifier directly after number")
var str=this.input.slice(start,this.pos),val
if(isFloat)val=parseFloat(str)
else if(!octal||str.length===1)val=parseInt(str,10)
else if(/[89]/.test(str)||this.strict)this.raise(start,"Invalid number")
else val=parseInt(str,8)
return this.finishToken(tt.num,val)}
pp$7.readCodePoint=function(){var ch=this.input.charCodeAt(this.pos),code
if(ch===123){if(this.options.ecmaVersion<6)this.unexpected()
var codePos=++this.pos
code=this.readHexChar(this.input.indexOf('}',this.pos)-this.pos)
++this.pos
if(code>0x10FFFF)this.raise(codePos,"Code point out of bounds")}else{code=this.readHexChar(4)}
return code}
function codePointToString(code){if(code<=0xFFFF)return String.fromCharCode(code)
code-=0x10000
return String.fromCharCode((code>>10)+0xD800,(code&1023)+0xDC00)}
pp$7.readString=function(quote){var this$1=this;var out="",chunkStart=++this.pos
for(;;){if(this$1.pos>=this$1.input.length)this$1.raise(this$1.start,"Unterminated string constant")
var ch=this$1.input.charCodeAt(this$1.pos)
if(ch===quote)break
if(ch===92){out+=this$1.input.slice(chunkStart,this$1.pos)
out+=this$1.readEscapedChar(false)
chunkStart=this$1.pos}else{if(isNewLine(ch))this$1.raise(this$1.start,"Unterminated string constant")
++this$1.pos}}
out+=this.input.slice(chunkStart,this.pos++)
return this.finishToken(tt.string,out)}
pp$7.readTmplToken=function(){var this$1=this;var out="",chunkStart=this.pos
for(;;){if(this$1.pos>=this$1.input.length)this$1.raise(this$1.start,"Unterminated template")
var ch=this$1.input.charCodeAt(this$1.pos)
if(ch===96||ch===36&&this$1.input.charCodeAt(this$1.pos+1)===123){if(this$1.pos===this$1.start&&this$1.type===tt.template){if(ch===36){this$1.pos+=2
return this$1.finishToken(tt.dollarBraceL)}else{++this$1.pos
return this$1.finishToken(tt.backQuote)}}
out+=this$1.input.slice(chunkStart,this$1.pos)
return this$1.finishToken(tt.template,out)}
if(ch===92){out+=this$1.input.slice(chunkStart,this$1.pos)
out+=this$1.readEscapedChar(true)
chunkStart=this$1.pos}else if(isNewLine(ch)){out+=this$1.input.slice(chunkStart,this$1.pos)
++this$1.pos
switch(ch){case 13:if(this$1.input.charCodeAt(this$1.pos)===10)++this$1.pos
case 10:out+="\n"
break
default:out+=String.fromCharCode(ch)
break}
if(this$1.options.locations){++this$1.curLine
this$1.lineStart=this$1.pos}
chunkStart=this$1.pos}else{++this$1.pos}}}
pp$7.readEscapedChar=function(inTemplate){var ch=this.input.charCodeAt(++this.pos)
++this.pos
switch(ch){case 110:return"\n"
case 114:return"\r"
case 120:return String.fromCharCode(this.readHexChar(2))
case 117:return codePointToString(this.readCodePoint())
case 116:return"\t"
case 98:return"\b"
case 118:return"\u000b"
case 102:return"\f"
case 13:if(this.input.charCodeAt(this.pos)===10)++this.pos
case 10:if(this.options.locations){this.lineStart=this.pos;++this.curLine}
return""
default:if(ch>=48&&ch<=55){var octalStr=this.input.substr(this.pos-1,3).match(/^[0-7]+/)[0]
var octal=parseInt(octalStr,8)
if(octal>255){octalStr=octalStr.slice(0,-1)
octal=parseInt(octalStr,8)}
if(octalStr!=="0"&&(this.strict||inTemplate)){this.raise(this.pos-2,"Octal literal in strict mode")}
this.pos+=octalStr.length-1
return String.fromCharCode(octal)}
return String.fromCharCode(ch)}}
pp$7.readHexChar=function(len){var codePos=this.pos
var n=this.readInt(16,len)
if(n===null)this.raise(codePos,"Bad character escape sequence")
return n}
pp$7.readWord1=function(){var this$1=this;this.containsEsc=false
var word="",first=true,chunkStart=this.pos
var astral=this.options.ecmaVersion>=6
while(this.pos<this.input.length){var ch=this$1.fullCharCodeAtPos()
if(isIdentifierChar(ch,astral)){this$1.pos+=ch<=0xffff?1:2}else if(ch===92){this$1.containsEsc=true
word+=this$1.input.slice(chunkStart,this$1.pos)
var escStart=this$1.pos
if(this$1.input.charCodeAt(++this$1.pos)!=117)
this$1.raise(this$1.pos,"Expecting Unicode escape sequence \\uXXXX")
++this$1.pos
var esc=this$1.readCodePoint()
if(!(first?isIdentifierStart:isIdentifierChar)(esc,astral))
this$1.raise(escStart,"Invalid Unicode escape")
word+=codePointToString(esc)
chunkStart=this$1.pos}else{break}
first=false}
return word+this.input.slice(chunkStart,this.pos)}
pp$7.readWord=function(){var word=this.readWord1()
var type=tt.name
if((this.options.ecmaVersion>=6||!this.containsEsc)&&this.keywords.test(word))
type=keywordTypes[word]
return this.finishToken(type,word)}
var version="4.0.3"
function parse(input,options){return new Parser(options,input).parse()}
function parseExpressionAt(input,pos,options){var p=new Parser(options,input,pos)
p.nextToken()
return p.parseExpression()}
function tokenizer(input,options){return new Parser(options,input)}
function addLooseExports(parse,Parser,plugins){exports.parse_dammit=parse
exports.LooseParser=Parser
exports.pluginsLoose=plugins}
exports.version=version;exports.parse=parse;exports.parseExpressionAt=parseExpressionAt;exports.tokenizer=tokenizer;exports.addLooseExports=addLooseExports;exports.Parser=Parser;exports.plugins=plugins;exports.defaultOptions=defaultOptions;exports.Position=Position;exports.SourceLocation=SourceLocation;exports.getLineInfo=getLineInfo;exports.Node=Node;exports.TokenType=TokenType;exports.tokTypes=tt;exports.TokContext=TokContext;exports.tokContexts=types;exports.isIdentifierChar=isIdentifierChar;exports.isIdentifierStart=isIdentifierStart;exports.Token=Token;exports.isNewLine=isNewLine;exports.lineBreak=lineBreak;exports.lineBreakG=lineBreakG;Object.defineProperty(exports,'__esModule',{value:true});})));;FormatterWorker.CSSFormatter=class{constructor(builder){this._builder=builder;}
format(text,lineEndings,fromOffset,toOffset){this._lineEndings=lineEndings;this._fromOffset=fromOffset;this._toOffset=toOffset;this._lastLine=-1;this._state={};var tokenize=FormatterWorker.createTokenizer('text/css');var oldEnforce=this._builder.setEnforceSpaceBetweenWords(false);tokenize(text.substring(this._fromOffset,this._toOffset),this._tokenCallback.bind(this));this._builder.setEnforceSpaceBetweenWords(oldEnforce);}
_tokenCallback(token,type,startPosition){startPosition+=this._fromOffset;var startLine=this._lineEndings.lowerBound(startPosition);if(startLine!==this._lastLine)
this._state.eatWhitespace=true;if(/^property/.test(type)&&!this._state.inPropertyValue)
this._state.seenProperty=true;this._lastLine=startLine;var isWhitespace=/^\s+$/.test(token);if(isWhitespace){if(!this._state.eatWhitespace)
this._builder.addSoftSpace();return;}
this._state.eatWhitespace=false;if(token==='\n')
return;if(token!=='}'){if(this._state.afterClosingBrace)
this._builder.addNewLine(true);this._state.afterClosingBrace=false;}
if(token==='}'){if(this._state.inPropertyValue)
this._builder.addNewLine();this._builder.decreaseNestingLevel();this._state.afterClosingBrace=true;this._state.inPropertyValue=false;}else if(token===':'&&!this._state.inPropertyValue&&this._state.seenProperty){this._builder.addToken(token,startPosition);this._builder.addSoftSpace();this._state.eatWhitespace=true;this._state.inPropertyValue=true;this._state.seenProperty=false;return;}else if(token==='{'){this._builder.addSoftSpace();this._builder.addToken(token,startPosition);this._builder.addNewLine();this._builder.increaseNestingLevel();return;}
this._builder.addToken(token,startPosition);if(type==='comment'&&!this._state.inPropertyValue&&!this._state.seenProperty)
this._builder.addNewLine();if(token===';'&&this._state.inPropertyValue){this._state.inPropertyValue=false;this._builder.addNewLine();}else if(token==='}'){this._builder.addNewLine();}}};;FormatterWorker.AcornTokenizer=class{constructor(content){this._content=content;this._comments=[];this._tokenizer=acorn.tokenizer(this._content,{ecmaVersion:8,onComment:this._comments});this._lineEndings=this._content.computeLineEndings();this._lineNumber=0;this._tokenLineStart=0;this._tokenLineEnd=0;this._nextTokenInternal();}
static punctuator(token,values){return token.type!==acorn.tokTypes.num&&token.type!==acorn.tokTypes.regexp&&token.type!==acorn.tokTypes.string&&token.type!==acorn.tokTypes.name&&!token.type.keyword&&(!values||(token.type.label.length===1&&values.indexOf(token.type.label)!==-1));}
static keyword(token,keyword){return!!token.type.keyword&&token.type!==acorn.tokTypes._true&&token.type!==acorn.tokTypes._false&&token.type!==acorn.tokTypes._null&&(!keyword||token.type.keyword===keyword);}
static identifier(token,identifier){return token.type===acorn.tokTypes.name&&(!identifier||token.value===identifier);}
static lineComment(token){return token.type==='Line';}
static blockComment(token){return token.type==='Block';}
_nextTokenInternal(){if(this._comments.length)
return this._comments.shift();var token=this._bufferedToken;this._bufferedToken=this._tokenizer.getToken();return token;}
_rollLineNumberToPosition(position){while(this._lineNumber+1<this._lineEndings.length&&position>this._lineEndings[this._lineNumber])
++this._lineNumber;return this._lineNumber;}
nextToken(){var token=this._nextTokenInternal();if(token.type===acorn.tokTypes.eof)
return null;this._tokenLineStart=this._rollLineNumberToPosition(token.start);this._tokenLineEnd=this._rollLineNumberToPosition(token.end);this._tokenColumnStart=this._tokenLineStart>0?token.start-this._lineEndings[this._tokenLineStart-1]-1:token.start;return token;}
peekToken(){if(this._comments.length)
return this._comments[0];return this._bufferedToken.type!==acorn.tokTypes.eof?this._bufferedToken:null;}
tokenLineStart(){return this._tokenLineStart;}
tokenLineEnd(){return this._tokenLineEnd;}
tokenColumnStart(){return this._tokenColumnStart;}};;FormatterWorker.JavaScriptFormatter=class{constructor(builder){this._builder=builder;}
format(text,lineEndings,fromOffset,toOffset){this._fromOffset=fromOffset;this._toOffset=toOffset;this._content=text.substring(this._fromOffset,this._toOffset);this._lastLineNumber=0;this._tokenizer=new FormatterWorker.AcornTokenizer(this._content);var ast=acorn.parse(this._content,{ranges:false,ecmaVersion:8});var walker=new FormatterWorker.ESTreeWalker(this._beforeVisit.bind(this),this._afterVisit.bind(this));walker.walk(ast);}
_push(token,format){for(var i=0;i<format.length;++i){if(format[i]==='s'){this._builder.addSoftSpace();}else if(format[i]==='S'){this._builder.addHardSpace();}else if(format[i]==='n'){this._builder.addNewLine();}else if(format[i]==='>'){this._builder.increaseNestingLevel();}else if(format[i]==='<'){this._builder.decreaseNestingLevel();}else if(format[i]==='t'){if(this._tokenizer.tokenLineStart()-this._lastLineNumber>1)
this._builder.addNewLine(true);this._lastLineNumber=this._tokenizer.tokenLineEnd();this._builder.addToken(this._content.substring(token.start,token.end),this._fromOffset+token.start);}}}
_beforeVisit(node){if(!node.parent)
return;while(this._tokenizer.peekToken()&&this._tokenizer.peekToken().start<node.start){var token=(this._tokenizer.nextToken());var format=this._formatToken(node.parent,token);this._push(token,format);}}
_afterVisit(node){while(this._tokenizer.peekToken()&&this._tokenizer.peekToken().start<node.end){var token=(this._tokenizer.nextToken());var format=this._formatToken(node,token);this._push(token,format);}
this._push(null,this._finishNode(node));}
_inForLoopHeader(node){var parent=node.parent;if(!parent)
return false;if(parent.type==='ForStatement')
return node===parent.init||node===parent.test||node===parent.update;if(parent.type==='ForInStatement'||parent.type==='ForOfStatement')
return node===parent.left||parent.right;return false;}
_formatToken(node,token){var AT=FormatterWorker.AcornTokenizer;if(AT.lineComment(token))
return'tn';if(AT.blockComment(token))
return'tn';if(node.type==='ContinueStatement'||node.type==='BreakStatement'){return node.label&&AT.keyword(token)?'ts':'t';}else if(node.type==='Identifier'){return't';}else if(node.type==='ReturnStatement'){if(AT.punctuator(token,';'))
return't';return node.argument?'ts':'t';}else if(node.type==='Property'){if(AT.punctuator(token,':'))
return'ts';return't';}else if(node.type==='ArrayExpression'){if(AT.punctuator(token,','))
return'ts';return't';}else if(node.type==='LabeledStatement'){if(AT.punctuator(token,':'))
return'ts';}else if(node.type==='LogicalExpression'||node.type==='AssignmentExpression'||node.type==='BinaryExpression'){if(AT.punctuator(token)&&!AT.punctuator(token,'()'))
return'sts';}else if(node.type==='ConditionalExpression'){if(AT.punctuator(token,'?:'))
return'sts';}else if(node.type==='VariableDeclarator'){if(AT.punctuator(token,'='))
return'sts';}else if(node.type==='FunctionDeclaration'){if(AT.punctuator(token,',)'))
return'ts';}else if(node.type==='FunctionExpression'){if(AT.punctuator(token,',)'))
return'ts';if(AT.keyword(token,'function'))
return node.id?'ts':'t';}else if(node.type==='WithStatement'){if(AT.punctuator(token,')'))
return node.body&&node.body.type==='BlockStatement'?'ts':'tn>';}else if(node.type==='SwitchStatement'){if(AT.punctuator(token,'{'))
return'tn>';if(AT.punctuator(token,'}'))
return'n<tn';if(AT.punctuator(token,')'))
return'ts';}else if(node.type==='SwitchCase'){if(AT.keyword(token,'case'))
return'n<ts';if(AT.keyword(token,'default'))
return'n<t';if(AT.punctuator(token,':'))
return'tn>';}else if(node.type==='VariableDeclaration'){if(AT.punctuator(token,',')){var allVariablesInitialized=true;var declarations=(node.declarations);for(var i=0;i<declarations.length;++i)
allVariablesInitialized=allVariablesInitialized&&!!declarations[i].init;return!this._inForLoopHeader(node)&&allVariablesInitialized?'nSSts':'ts';}}else if(node.type==='BlockStatement'){if(AT.punctuator(token,'{'))
return node.body.length?'tn>':'t';if(AT.punctuator(token,'}'))
return node.body.length?'n<t':'t';}else if(node.type==='CatchClause'){if(AT.punctuator(token,')'))
return'ts';}else if(node.type==='ObjectExpression'){if(!node.properties.length)
return't';if(AT.punctuator(token,'{'))
return'tn>';if(AT.punctuator(token,'}'))
return'n<t';if(AT.punctuator(token,','))
return'tn';}else if(node.type==='IfStatement'){if(AT.punctuator(token,')'))
return node.consequent&&node.consequent.type==='BlockStatement'?'ts':'tn>';if(AT.keyword(token,'else')){var preFormat=node.consequent&&node.consequent.type==='BlockStatement'?'st':'n<t';var postFormat='n>';if(node.alternate&&(node.alternate.type==='BlockStatement'||node.alternate.type==='IfStatement'))
postFormat='s';return preFormat+postFormat;}}else if(node.type==='CallExpression'){if(AT.punctuator(token,','))
return'ts';}else if(node.type==='SequenceExpression'&&AT.punctuator(token,',')){return node.parent&&node.parent.type==='SwitchCase'?'ts':'tn';}else if(node.type==='ForStatement'||node.type==='ForOfStatement'||node.type==='ForInStatement'){if(AT.punctuator(token,';'))
return'ts';if(AT.keyword(token,'in')||AT.identifier(token,'of'))
return'sts';if(AT.punctuator(token,')'))
return node.body&&node.body.type==='BlockStatement'?'ts':'tn>';}else if(node.type==='WhileStatement'){if(AT.punctuator(token,')'))
return node.body&&node.body.type==='BlockStatement'?'ts':'tn>';}else if(node.type==='DoWhileStatement'){var blockBody=node.body&&node.body.type==='BlockStatement';if(AT.keyword(token,'do'))
return blockBody?'ts':'tn>';if(AT.keyword(token,'while'))
return blockBody?'sts':'n<ts';}else if(node.type==='ClassBody'){if(AT.punctuator(token,'{'))
return'stn>';if(AT.punctuator(token,'}'))
return'<ntn';return't';}else if(node.type==='YieldExpression'){return't';}else if(node.type==='Super'){return't';}
return AT.keyword(token)&&!AT.keyword(token,'this')?'ts':'t';}
_finishNode(node){if(node.type==='WithStatement'){if(node.body&&node.body.type!=='BlockStatement')
return'n<';}else if(node.type==='VariableDeclaration'){if(!this._inForLoopHeader(node))
return'n';}else if(node.type==='ForStatement'||node.type==='ForOfStatement'||node.type==='ForInStatement'){if(node.body&&node.body.type!=='BlockStatement')
return'n<';}else if(node.type==='BlockStatement'){if(node.parent&&node.parent.type==='IfStatement'&&node.parent.alternate&&node.parent.consequent===node)
return'';if(node.parent&&node.parent.type==='FunctionExpression'&&node.parent.parent&&node.parent.parent.type==='Property')
return'';if(node.parent&&node.parent.type==='FunctionExpression'&&node.parent.parent&&node.parent.parent.type==='VariableDeclarator')
return'';if(node.parent&&node.parent.type==='FunctionExpression'&&node.parent.parent&&node.parent.parent.type==='CallExpression')
return'';if(node.parent&&node.parent.type==='DoWhileStatement')
return'';if(node.parent&&node.parent.type==='TryStatement'&&node.parent.block===node)
return's';if(node.parent&&node.parent.type==='CatchClause'&&node.parent.parent.finalizer)
return's';return'n';}else if(node.type==='WhileStatement'){if(node.body&&node.body.type!=='BlockStatement')
return'n<';}else if(node.type==='IfStatement'){if(node.alternate){if(node.alternate.type!=='BlockStatement'&&node.alternate.type!=='IfStatement')
return'<';}else if(node.consequent){if(node.consequent.type!=='BlockStatement')
return'<';}}else if(node.type==='BreakStatement'||node.type==='ContinueStatement'||node.type==='ThrowStatement'||node.type==='ReturnStatement'||node.type==='ExpressionStatement'){return'n';}
return'';}};;FormatterWorker.FormattedContentBuilder=class{constructor(indentString){this._lastOriginalPosition=0;this._formattedContent=[];this._formattedContentLength=0;this._lastFormattedPosition=0;this._mapping={original:[0],formatted:[0]};this._nestingLevel=0;this._indentString=indentString;this._cachedIndents=new Map();this._newLines=0;this._softSpace=false;this._hardSpaces=0;this._enforceSpaceBetweenWords=true;}
setEnforceSpaceBetweenWords(value){var oldValue=this._enforceSpaceBetweenWords;this._enforceSpaceBetweenWords=value;return oldValue;}
addToken(token,offset){var last=this._formattedContent.peekLast();if(this._enforceSpaceBetweenWords&&last&&/\w/.test(last[last.length-1])&&/\w/.test(token))
this.addSoftSpace();this._appendFormatting();this._addMappingIfNeeded(offset);this._addText(token);}
addSoftSpace(){if(!this._hardSpaces)
this._softSpace=true;}
addHardSpace(){this._softSpace=false;++this._hardSpaces;}
addNewLine(noSquash){if(!this._formattedContentLength)
return;if(noSquash)
++this._newLines;else
this._newLines=this._newLines||1;}
increaseNestingLevel(){this._nestingLevel+=1;}
decreaseNestingLevel(){if(this._nestingLevel>0)
this._nestingLevel-=1;}
_appendFormatting(){if(this._newLines){for(var i=0;i<this._newLines;++i)
this._addText('\n');this._addText(this._indent());}else if(this._softSpace){this._addText(' ');}
if(this._hardSpaces){for(var i=0;i<this._hardSpaces;++i)
this._addText(' ');}
this._newLines=0;this._softSpace=false;this._hardSpaces=0;}
content(){return this._formattedContent.join('')+(this._newLines?'\n':'');}
mapping(){return this._mapping;}
_indent(){var cachedValue=this._cachedIndents.get(this._nestingLevel);if(cachedValue)
return cachedValue;var fullIndent='';for(var i=0;i<this._nestingLevel;++i)
fullIndent+=this._indentString;if(this._nestingLevel<=20)
this._cachedIndents.set(this._nestingLevel,fullIndent);return fullIndent;}
_addText(text){this._formattedContent.push(text);this._formattedContentLength+=text.length;}
_addMappingIfNeeded(originalPosition){if(originalPosition-this._lastOriginalPosition===this._formattedContentLength-this._lastFormattedPosition)
return;this._mapping.original.push(originalPosition);this._lastOriginalPosition=originalPosition;this._mapping.formatted.push(this._formattedContentLength);this._lastFormattedPosition=this._formattedContentLength;}};;FormatterWorker.CSSParserStates={Initial:'Initial',Selector:'Selector',Style:'Style',PropertyName:'PropertyName',PropertyValue:'PropertyValue',AtRule:'AtRule'};FormatterWorker.parseCSS=function(text){FormatterWorker._innerParseCSS(text,postMessage);};FormatterWorker._innerParseCSS=function(text,chunkCallback){var chunkSize=100000;var lines=text.split('\n');var rules=[];var processedChunkCharacters=0;var state=FormatterWorker.CSSParserStates.Initial;var rule;var property;var UndefTokenType=new Set();var disabledRules=[];function disabledRulesCallback(chunk){disabledRules=disabledRules.concat(chunk.chunk);}
function processToken(tokenValue,tokenTypes,column,newColumn){var tokenType=tokenTypes?new Set(tokenTypes.split(' ')):UndefTokenType;switch(state){case FormatterWorker.CSSParserStates.Initial:if(tokenType.has('qualifier')||tokenType.has('builtin')||tokenType.has('tag')){rule={selectorText:tokenValue,lineNumber:lineNumber,columnNumber:column,properties:[],};state=FormatterWorker.CSSParserStates.Selector;}else if(tokenType.has('def')){rule={atRule:tokenValue,lineNumber:lineNumber,columnNumber:column,};state=FormatterWorker.CSSParserStates.AtRule;}
break;case FormatterWorker.CSSParserStates.Selector:if(tokenValue==='{'&&tokenType===UndefTokenType){rule.selectorText=rule.selectorText.trim();rule.styleRange=createRange(lineNumber,newColumn);state=FormatterWorker.CSSParserStates.Style;}else{rule.selectorText+=tokenValue;}
break;case FormatterWorker.CSSParserStates.AtRule:if((tokenValue===';'||tokenValue==='{')&&tokenType===UndefTokenType){rule.atRule=rule.atRule.trim();rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}else{rule.atRule+=tokenValue;}
break;case FormatterWorker.CSSParserStates.Style:if(tokenType.has('meta')||tokenType.has('property')){property={name:tokenValue,value:'',range:createRange(lineNumber,column),nameRange:createRange(lineNumber,column)};state=FormatterWorker.CSSParserStates.PropertyName;}else if(tokenValue==='}'&&tokenType===UndefTokenType){rule.styleRange.endLine=lineNumber;rule.styleRange.endColumn=column;rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}else if(tokenType.has('comment')){if(tokenValue.substring(0,2)!=='/*'||tokenValue.substring(tokenValue.length-2)!=='*/')
break;var uncommentedText=tokenValue.substring(2,tokenValue.length-2);var fakeRule='a{\n'+uncommentedText+'}';disabledRules=[];FormatterWorker._innerParseCSS(fakeRule,disabledRulesCallback);if(disabledRules.length===1&&disabledRules[0].properties.length===1){var disabledProperty=disabledRules[0].properties[0];disabledProperty.disabled=true;disabledProperty.range=createRange(lineNumber,column);disabledProperty.range.endColumn=newColumn;var lineOffset=lineNumber-1;var columnOffset=column+2;disabledProperty.nameRange.startLine+=lineOffset;disabledProperty.nameRange.startColumn+=columnOffset;disabledProperty.nameRange.endLine+=lineOffset;disabledProperty.nameRange.endColumn+=columnOffset;disabledProperty.valueRange.startLine+=lineOffset;disabledProperty.valueRange.startColumn+=columnOffset;disabledProperty.valueRange.endLine+=lineOffset;disabledProperty.valueRange.endColumn+=columnOffset;rule.properties.push(disabledProperty);}}
break;case FormatterWorker.CSSParserStates.PropertyName:if(tokenValue===':'&&tokenType===UndefTokenType){property.name=property.name;property.nameRange.endLine=lineNumber;property.nameRange.endColumn=column;property.valueRange=createRange(lineNumber,newColumn);state=FormatterWorker.CSSParserStates.PropertyValue;}else if(tokenType.has('property')){property.name+=tokenValue;}
break;case FormatterWorker.CSSParserStates.PropertyValue:if((tokenValue===';'||tokenValue==='}')&&tokenType===UndefTokenType){property.value=property.value;property.valueRange.endLine=lineNumber;property.valueRange.endColumn=column;property.range.endLine=lineNumber;property.range.endColumn=tokenValue===';'?newColumn:column;rule.properties.push(property);if(tokenValue==='}'){rule.styleRange.endLine=lineNumber;rule.styleRange.endColumn=column;rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}else{state=FormatterWorker.CSSParserStates.Style;}}else if(!tokenType.has('comment')){property.value+=tokenValue;}
break;default:console.assert(false,'Unknown CSS parser state.');}
processedChunkCharacters+=newColumn-column;if(processedChunkCharacters>chunkSize){chunkCallback({chunk:rules,isLastChunk:false});rules=[];processedChunkCharacters=0;}}
var tokenizer=FormatterWorker.createTokenizer('text/css');var lineNumber;for(lineNumber=0;lineNumber<lines.length;++lineNumber){var line=lines[lineNumber];tokenizer(line,processToken);processToken('\n',null,line.length,line.length+1);}
chunkCallback({chunk:rules,isLastChunk:true});function createRange(lineNumber,columnNumber){return{startLine:lineNumber,startColumn:columnNumber,endLine:lineNumber,endColumn:columnNumber};}};;FormatterWorker.HTMLFormatter=class{constructor(builder){this._builder=builder;this._jsFormatter=new FormatterWorker.JavaScriptFormatter(builder);this._cssFormatter=new FormatterWorker.CSSFormatter(builder);}
format(text,lineEndings){this._text=text;this._lineEndings=lineEndings;this._model=new FormatterWorker.HTMLModel(text);this._walk(this._model.document());}
_formatTokensTill(element,offset){while(this._model.peekToken()&&this._model.peekToken().startOffset<offset){var token=this._model.nextToken();this._formatToken(element,token);}}
_walk(element){if(element.parent)
this._formatTokensTill(element.parent,element.openTag.startOffset);this._beforeOpenTag(element);this._formatTokensTill(element,element.openTag.endOffset);this._afterOpenTag(element);for(var i=0;i<element.children.length;++i)
this._walk(element.children[i]);this._formatTokensTill(element,element.closeTag.startOffset);this._beforeCloseTag(element);this._formatTokensTill(element,element.closeTag.endOffset);this._afterCloseTag(element);}
_beforeOpenTag(element){if(!element.children.length||element===this._model.document())
return;this._builder.addNewLine();}
_afterOpenTag(element){if(!element.children.length||element===this._model.document())
return;this._builder.increaseNestingLevel();this._builder.addNewLine();}
_beforeCloseTag(element){if(!element.children.length||element===this._model.document())
return;this._builder.decreaseNestingLevel();this._builder.addNewLine();}
_afterCloseTag(element){this._builder.addNewLine();}
_formatToken(element,token){if(token.value.isWhitespace())
return;if(token.type.has('comment')||token.type.has('meta')){this._builder.addNewLine();this._builder.addToken(token.value.trim(),token.startOffset);this._builder.addNewLine();return;}
var isBodyToken=element.openTag.endOffset<=token.startOffset&&token.startOffset<element.closeTag.startOffset;if(isBodyToken&&element.name==='style'){this._builder.addNewLine();this._builder.increaseNestingLevel();this._cssFormatter.format(this._text,this._lineEndings,token.startOffset,token.endOffset);this._builder.decreaseNestingLevel();return;}
if(isBodyToken&&element.name==='script'){this._builder.addNewLine();this._builder.increaseNestingLevel();var mimeType=element.openTag.attributes.has('type')?element.openTag.attributes.get('type').toLowerCase():null;if(!mimeType||FormatterWorker.HTMLFormatter.SupportedJavaScriptMimeTypes.has(mimeType)){this._jsFormatter.format(this._text,this._lineEndings,token.startOffset,token.endOffset);}else{this._builder.addToken(token.value,token.startOffset);this._builder.addNewLine();}
this._builder.decreaseNestingLevel();return;}
if(!isBodyToken&&token.type.has('attribute'))
this._builder.addSoftSpace();this._builder.addToken(token.value,token.startOffset);}};FormatterWorker.HTMLFormatter.SupportedJavaScriptMimeTypes=new Set(['text/javascript','text/ecmascript','application/javascript','application/ecmascript']);FormatterWorker.HTMLModel=class{constructor(text){this._state=FormatterWorker.HTMLModel.ParseState.Initial;this._document=new FormatterWorker.HTMLModel.Element('document');this._document.openTag=new FormatterWorker.HTMLModel.Tag('document',0,0,new Map(),true,false);this._document.closeTag=new FormatterWorker.HTMLModel.Tag('document',text.length,text.length,new Map(),false,false);this._stack=[this._document];this._tokens=[];this._tokenIndex=0;this._build(text);}
_build(text){var tokenizer=FormatterWorker.createTokenizer('text/html');var lastOffset=0;var lowerCaseText=text.toLowerCase();while(true){tokenizer(text.substring(lastOffset),processToken.bind(this,lastOffset));if(lastOffset>=text.length)
break;var element=this._stack.peekLast();lastOffset=lowerCaseText.indexOf('</'+element.name,lastOffset);if(lastOffset===-1)
lastOffset=text.length;var tokenStart=element.openTag.endOffset;var tokenEnd=lastOffset;var tokenValue=text.substring(tokenStart,tokenEnd);this._tokens.push(new FormatterWorker.HTMLModel.Token(tokenValue,new Set(),tokenStart,tokenEnd));}
while(this._stack.length>1){var element=this._stack.peekLast();this._popElement(new FormatterWorker.HTMLModel.Tag(element.name,text.length,text.length,new Map(),false,false));}
function processToken(baseOffset,tokenValue,type,tokenStart,tokenEnd){tokenStart+=baseOffset;tokenEnd+=baseOffset;lastOffset=tokenEnd;var tokenType=type?new Set(type.split(' ')):new Set();var token=new FormatterWorker.HTMLModel.Token(tokenValue,tokenType,tokenStart,tokenEnd);this._tokens.push(token);this._updateDOM(token);var element=this._stack.peekLast();if(element&&(element.name==='script'||element.name==='style')&&element.openTag.endOffset===lastOffset)
return FormatterWorker.AbortTokenization;}}
_updateDOM(token){var S=FormatterWorker.HTMLModel.ParseState;var value=token.value;var type=token.type;switch(this._state){case S.Initial:if(type.has('bracket')&&(value==='<'||value==='</')){this._onStartTag(token);this._state=S.Tag;}
return;case S.Tag:if(type.has('tag')&&!type.has('bracket')){this._tagName=value.trim().toLowerCase();}else if(type.has('attribute')){this._attributeName=value.trim().toLowerCase();this._attributes.set(this._attributeName,'');this._state=S.AttributeName;}else if(type.has('bracket')&&(value==='>'||value==='/>')){this._onEndTag(token);this._state=S.Initial;}
return;case S.AttributeName:if(!type.size&&value==='='){this._state=S.AttributeValue;}else if(type.has('bracket')&&(value==='>'||value==='/>')){this._onEndTag(token);this._state=S.Initial;}
return;case S.AttributeValue:if(type.has('string')){this._attributes.set(this._attributeName,value);this._state=S.Tag;}else if(type.has('bracket')&&(value==='>'||value==='/>')){this._onEndTag(token);this._state=S.Initial;}
return;}}
_onStartTag(token){this._tagName='';this._tagStartOffset=token.startOffset;this._tagEndOffset=null;this._attributes=new Map();this._attributeName='';this._isOpenTag=token.value==='<';}
_onEndTag(token){this._tagEndOffset=token.endOffset;var selfClosingTag=token.value==='/>'||FormatterWorker.HTMLModel.SelfClosingTags.has(this._tagName);var tag=new FormatterWorker.HTMLModel.Tag(this._tagName,this._tagStartOffset,this._tagEndOffset,this._attributes,this._isOpenTag,selfClosingTag);this._onTagComplete(tag);}
_onTagComplete(tag){if(tag.isOpenTag){var topElement=this._stack.peekLast();if(topElement!==this._document&&topElement.openTag.selfClosingTag)
this._popElement(autocloseTag(topElement,topElement.openTag.endOffset));else if((topElement.name in FormatterWorker.HTMLModel.AutoClosingTags)&&FormatterWorker.HTMLModel.AutoClosingTags[topElement.name].has(tag.name))
this._popElement(autocloseTag(topElement,tag.startOffset));this._pushElement(tag);return;}
while(this._stack.length>1&&this._stack.peekLast().name!==tag.name)
this._popElement(autocloseTag(this._stack.peekLast(),tag.startOffset));if(this._stack.length===1)
return;this._popElement(tag);function autocloseTag(element,offset){return new FormatterWorker.HTMLModel.Tag(element.name,offset,offset,new Map(),false,false);}}
_popElement(closeTag){var element=this._stack.pop();element.closeTag=closeTag;}
_pushElement(openTag){var topElement=this._stack.peekLast();var newElement=new FormatterWorker.HTMLModel.Element(openTag.name);newElement.parent=topElement;topElement.children.push(newElement);newElement.openTag=openTag;this._stack.push(newElement);}
peekToken(){return this._tokenIndex<this._tokens.length?this._tokens[this._tokenIndex]:null;}
nextToken(){return this._tokens[this._tokenIndex++];}
document(){return this._document;}};FormatterWorker.HTMLModel.SelfClosingTags=new Set(['area','base','br','col','command','embed','hr','img','input','keygen','link','meta','param','source','track','wbr']);FormatterWorker.HTMLModel.AutoClosingTags={'head':new Set(['body']),'li':new Set(['li']),'dt':new Set(['dt','dd']),'dd':new Set(['dt','dd']),'p':new Set(['address','article','aside','blockquote','div','dl','fieldset','footer','form','h1','h2','h3','h4','h5','h6','header','hgroup','hr','main','nav','ol','p','pre','section','table','ul']),'rb':new Set(['rb','rt','rtc','rp']),'rt':new Set(['rb','rt','rtc','rp']),'rtc':new Set(['rb','rtc','rp']),'rp':new Set(['rb','rt','rtc','rp']),'optgroup':new Set(['optgroup']),'option':new Set(['option','optgroup']),'colgroup':new Set(['colgroup']),'thead':new Set(['tbody','tfoot']),'tbody':new Set(['tbody','tfoot']),'tfoot':new Set(['tbody']),'tr':new Set(['tr']),'td':new Set(['td','th']),'th':new Set(['td','th']),};FormatterWorker.HTMLModel.ParseState={Initial:'Initial',Tag:'Tag',AttributeName:'AttributeName',AttributeValue:'AttributeValue'};FormatterWorker.HTMLModel.Token=class{constructor(value,type,startOffset,endOffset){this.value=value;this.type=type;this.startOffset=startOffset;this.endOffset=endOffset;}};FormatterWorker.HTMLModel.Tag=class{constructor(name,startOffset,endOffset,attributes,isOpenTag,selfClosingTag){this.name=name;this.startOffset=startOffset;this.endOffset=endOffset;this.attributes=attributes;this.isOpenTag=isOpenTag;this.selfClosingTag=selfClosingTag;}};FormatterWorker.HTMLModel.Element=class{constructor(name){this.name=name;this.children=[];this.parent=null;this.openTag=null;this.closeTag=null;}};;FormatterWorker.IdentityFormatter=class{constructor(builder){this._builder=builder;}
format(text,lineEndings,fromOffset,toOffset){var content=text.substring(fromOffset,toOffset);this._builder.addToken(content,fromOffset);}};;FormatterWorker.javaScriptOutline=function(content){var chunkSize=100000;var outlineChunk=[];var previousIdentifier=null;var previousToken=null;var processedChunkCharacters=0;var addedFunction=false;var isReadingArguments=false;var argumentsText='';var currentFunction=null;var tokenizer=new FormatterWorker.AcornTokenizer(content);var AT=FormatterWorker.AcornTokenizer;while(tokenizer.peekToken()){var token=(tokenizer.nextToken());if(AT.lineComment(token)||AT.blockComment(token))
continue;var tokenValue=content.substring(token.start,token.end);if(AT.identifier(token)&&previousToken&&(AT.identifier(previousToken,'get')||AT.identifier(previousToken,'set'))){currentFunction={line:tokenizer.tokenLineStart(),column:tokenizer.tokenColumnStart(),name:previousToken.value+' '+tokenValue};addedFunction=true;previousIdentifier=null;}else if(AT.identifier(token)){previousIdentifier=tokenValue;if(tokenValue&&previousToken&&AT.keyword(previousToken,'function')){currentFunction={line:tokenizer.tokenLineStart(),column:tokenizer.tokenColumnStart(),name:tokenValue};addedFunction=true;previousIdentifier=null;}}else if(AT.keyword(token,'function')&&previousIdentifier&&previousToken&&AT.punctuator(previousToken,':=')){currentFunction={line:tokenizer.tokenLineStart(),column:tokenizer.tokenColumnStart(),name:previousIdentifier};addedFunction=true;previousIdentifier=null;}else if(AT.punctuator(token,'.')&&previousToken&&AT.identifier(previousToken)){previousIdentifier+='.';}else if(AT.punctuator(token,'(')&&addedFunction){isReadingArguments=true;}
if(isReadingArguments&&tokenValue)
argumentsText+=tokenValue;if(AT.punctuator(token,')')&&isReadingArguments){addedFunction=false;isReadingArguments=false;currentFunction.arguments=argumentsText.replace(/,[\r\n\s]*/g,', ').replace(/([^,])[\r\n\s]+/g,'$1');argumentsText='';outlineChunk.push(currentFunction);}
previousToken=token;processedChunkCharacters+=token.end-token.start;if(processedChunkCharacters>=chunkSize){postMessage({chunk:outlineChunk,isLastChunk:false});outlineChunk=[];processedChunkCharacters=0;}}
postMessage({chunk:outlineChunk,isLastChunk:true});};;FormatterWorker.RelaxedJSONParser={};FormatterWorker.RelaxedJSONParser.States={ExpectKey:'ExpectKey',ExpectValue:'ExpectValue'};FormatterWorker.RelaxedJSONParser.Keywords={'NaN':NaN,'true':true,'false':false,'Infinity':Infinity,'undefined':undefined,'null':null};FormatterWorker.RelaxedJSONParser.parse=function(content){var Keywords=FormatterWorker.RelaxedJSONParser.Keywords;var States=FormatterWorker.RelaxedJSONParser.States;content='('+content+')';try{var root=acorn.parse(content,{});}catch(e){return null;}
var walker=new FormatterWorker.ESTreeWalker(beforeVisit,afterVisit);var rootTip=[];var stack=[];var stackData=({key:0,tip:rootTip,state:States.ExpectValue,parentIsArray:true});walker.setWalkNulls(true);var hasExpression=false;walker.walk(root);if(hasExpression)
return null;return rootTip.length?rootTip[0]:null;function pushStack(newStack){stack.push(stackData);stackData=newStack;}
function popStack(){stackData=stack.pop();}
function applyValue(value){stackData.tip[stackData.key]=value;if(stackData.parentIsArray)
stackData.key++;else
stackData.state=null;}
function beforeVisit(node){switch(node.type){case'ObjectExpression':var newTip={};applyValue(newTip);pushStack(({key:null,tip:newTip,state:null,parentIsArray:false}));break;case'ArrayExpression':var newTip=[];applyValue(newTip);pushStack(({key:0,tip:newTip,state:States.ExpectValue,parentIsArray:true}));break;case'Property':stackData.state=States.ExpectKey;break;case'Literal':if(stackData.state===States.ExpectKey){stackData.key=node.value;stackData.state=States.ExpectValue;}else if(stackData.state===States.ExpectValue){applyValue(extractValue(node));return FormatterWorker.ESTreeWalker.SkipSubtree;}
break;case'Identifier':if(stackData.state===States.ExpectKey){stackData.key=(node.name);stackData.state=States.ExpectValue;}else if(stackData.state===States.ExpectValue){applyValue(extractValue(node));return FormatterWorker.ESTreeWalker.SkipSubtree;}
break;case'UnaryExpression':if(stackData.state===States.ExpectValue){applyValue(extractValue(node));return FormatterWorker.ESTreeWalker.SkipSubtree;}
break;case'Program':case'ExpressionStatement':break;default:if(stackData.state===States.ExpectValue)
applyValue(extractValue(node));return FormatterWorker.ESTreeWalker.SkipSubtree;}}
function afterVisit(node){if(node.type==='ObjectExpression'||node.type==='ArrayExpression')
popStack();}
function extractValue(node){var isNegative=false;var originalNode=node;var value;if(node.type==='UnaryExpression'&&(node.operator==='-'||node.operator==='+')){if(node.operator==='-')
isNegative=true;node=(node.argument);}
if(node.type==='Literal'){value=node.value;}else if(node.type==='Identifier'&&Keywords.hasOwnProperty(node.name)){value=Keywords[node.name];}else{hasExpression=true;return content.substring(originalNode.start,originalNode.end);}
if(isNegative){if(typeof value!=='number'){hasExpression=true;return content.substring(originalNode.start,originalNode.end);}
value=-(value);}
return value;}};FormatterWorker.RelaxedJSONParser.Context;;applicationDescriptor={"has_html":false,"modules":[{"type":"autostart","name":"platform"},{"type":"autostart","name":"formatter_worker"},{"type":"autostart","name":"cm_headless"},{"type":"remote","name":"gonzales"}]};if(!self.Runtime)
self.importScripts('Runtime.js');Runtime.startWorker('formatter_worker');