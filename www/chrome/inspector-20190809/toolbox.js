const allDescriptors=[];let applicationDescriptor;const _loadedScripts={};for(const k of[]){}
(function(){const baseUrl=self.location?self.location.origin+self.location.pathname:'';self._importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();const REMOTE_MODULE_FALLBACK_REVISION='@010ddcfda246975d194964ccf20038ebbdec6084';var Runtime=class{constructor(descriptors){this._modules=[];this._modulesMap={};this._extensions=[];this._cachedTypeClasses={};this._descriptorsMap={};for(let i=0;i<descriptors.length;++i)
this._registerModule(descriptors[i]);}
static loadResourcePromise(url){return new Promise(load);function load(fulfill,reject){const xhr=new XMLHttpRequest();xhr.open('GET',url,true);xhr.onreadystatechange=onreadystatechange;function onreadystatechange(e){if(xhr.readyState!==XMLHttpRequest.DONE)
return;const status=/^HTTP\/1.1 404/.test(e.target.response)?404:xhr.status;if([0,200,304].indexOf(status)===-1)
reject(new Error('While loading from url '+url+' server responded with a status of '+status));else
fulfill(e.target.response);}
xhr.send(null);}}
static loadResourcePromiseWithFallback(url){return Runtime.loadResourcePromise(url).catch(err=>{const urlWithFallbackVersion=url.replace(/@[0-9a-f]{40}/,REMOTE_MODULE_FALLBACK_REVISION);if(urlWithFallbackVersion===url||!url.includes('audits_worker_module'))
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
static async appStarted(){return Runtime._appStartedPromise;}
static async startApplication(appName){console.timeStamp('Runtime.startApplication');const allDescriptorsByName={};for(let i=0;i<allDescriptors.length;++i){const d=allDescriptors[i];allDescriptorsByName[d['name']]=d;}
if(!applicationDescriptor){let data=await Runtime.loadResourcePromise(appName+'.json');applicationDescriptor=JSON.parse(data);let descriptor=applicationDescriptor;while(descriptor.extends){data=await Runtime.loadResourcePromise(descriptor.extends+'.json');descriptor=JSON.parse(data);applicationDescriptor.modules=descriptor.modules.concat(applicationDescriptor.modules);}}
const configuration=applicationDescriptor.modules;const moduleJSONPromises=[];const coreModuleNames=[];for(let i=0;i<configuration.length;++i){const descriptor=configuration[i];const name=descriptor['name'];const moduleJSON=allDescriptorsByName[name];if(moduleJSON)
moduleJSONPromises.push(Promise.resolve(moduleJSON));else
moduleJSONPromises.push(Runtime.loadResourcePromise(name+'/module.json').then(JSON.parse.bind(JSON)));if(descriptor['type']==='autostart')
coreModuleNames.push(name);}
const moduleDescriptors=await Promise.all(moduleJSONPromises);for(let i=0;i<moduleDescriptors.length;++i){moduleDescriptors[i].name=configuration[i]['name'];moduleDescriptors[i].condition=configuration[i]['condition'];moduleDescriptors[i].remote=configuration[i]['type']==='remote';}
self.runtime=new Runtime(moduleDescriptors);if(coreModuleNames)
await self.runtime._loadAutoStartModules(coreModuleNames);Runtime._appStartedPromiseCallback();}
static startWorker(appName){return Runtime.startApplication(appName).then(sendWorkerReady);function sendWorkerReady(){self.postMessage('workerReady');}}
static queryParam(name){return Runtime._queryParamsObject.get(name);}
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
static setL10nCallback(localizationFunction){Runtime._l10nCallback=localizationFunction;}
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
return constructorFunction[Runtime._instanceSymbol];const instance=new constructorFunction();constructorFunction[Runtime._instanceSymbol]=instance;return instance;}};Runtime._queryParamsObject=new URLSearchParams(Runtime.queryParamsString());Runtime._instanceSymbol=Symbol('instance');Runtime.cachedResources={__proto__:null};Runtime._console=console;Runtime._originalAssert=console.assert;Runtime._platform='';Runtime.ModuleDescriptor=class{constructor(){this.name;this.extensions;this.dependencies;this.scripts;this.condition;this.remote;}};Runtime.ExtensionDescriptor=class{constructor(){this.type;this.className;this.factoryName;this.contextTypes;}};Runtime.Module=class{constructor(manager,descriptor){this._manager=manager;this._descriptor=descriptor;this._name=descriptor.name;this._extensions=[];this._extensionsByClassName=new Map();const extensions=(descriptor.extensions);for(let i=0;extensions&&i<extensions.length;++i){const extension=new Runtime.Extension(this,extensions[i]);this._manager._extensions.push(extension);this._extensions.push(extension);}
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
return Promise.resolve();const promises=[];for(let i=0;i<resources.length;++i){const url=this._modularizeURL(resources[i]);const isHtml=url.endsWith('.html');promises.push(Runtime._loadResourceIntoCache(url,!isHtml));}
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
title(){const title=this._descriptor['title-'+Runtime._platform]||this._descriptor['title'];if(title&&Runtime._l10nCallback)
return Runtime._l10nCallback(title);return title;}
hasContextType(contextType){const contextTypes=this.descriptor().contextTypes;if(!contextTypes)
return false;for(let i=0;i<contextTypes.length;++i){if(contextType===this._module._manager._resolve(contextTypes[i]))
return true;}
return false;}};Runtime.ExperimentsSupport=class{constructor(){this._supportEnabled=Runtime.queryParam('experiments')!==null;this._experiments=[];this._experimentNames={};this._enabledTransiently={};this._serverEnabled=new Set();}
allConfigurableExperiments(){const result=[];for(let i=0;i<this._experiments.length;i++){const experiment=this._experiments[i];if(!this._enabledTransiently[experiment.name])
result.push(experiment);}
return result;}
supportEnabled(){return this._supportEnabled;}
_setExperimentsSetting(value){if(!self.localStorage)
return;self.localStorage['experiments']=JSON.stringify(value);}
register(experimentName,experimentTitle,hidden){Runtime._assert(!this._experimentNames[experimentName],'Duplicate registration of experiment '+experimentName);this._experimentNames[experimentName]=true;this._experiments.push(new Runtime.Experiment(this,experimentName,experimentTitle,!!hidden));}
isEnabled(experimentName){this._checkExperiment(experimentName);if(Runtime._experimentsSetting()[experimentName]===false)
return false;if(this._enabledTransiently[experimentName])
return true;if(this._serverEnabled.has(experimentName))
return true;if(!this.supportEnabled())
return false;return!!Runtime._experimentsSetting()[experimentName];}
setEnabled(experimentName,enabled){this._checkExperiment(experimentName);const experimentsSetting=Runtime._experimentsSetting();experimentsSetting[experimentName]=enabled;this._setExperimentsSetting(experimentsSetting);}
setDefaultExperiments(experimentNames){for(let i=0;i<experimentNames.length;++i){this._checkExperiment(experimentNames[i]);this._enabledTransiently[experimentNames[i]]=true;}}
setServerEnabledExperiments(experimentNames){for(const experiment of experimentNames){this._checkExperiment(experiment);this._serverEnabled.add(experiment);}}
enableForTest(experimentName){this._checkExperiment(experimentName);this._enabledTransiently[experimentName]=true;}
clearForTest(){this._experiments=[];this._experimentNames={};this._enabledTransiently={};this._serverEnabled.clear();}
cleanUpStaleExperiments(){const experimentsSetting=Runtime._experimentsSetting();const cleanedUpExperimentSetting={};for(let i=0;i<this._experiments.length;++i){const experimentName=this._experiments[i].name;if(experimentsSetting[experimentName])
cleanedUpExperimentSetting[experimentName]=true;}
this._setExperimentsSetting(cleanedUpExperimentSetting);}
_checkExperiment(experimentName){Runtime._assert(this._experimentNames[experimentName],'Unknown experiment '+experimentName);}};Runtime.Experiment=class{constructor(experiments,name,title,hidden){this.name=name;this.title=title;this.hidden=hidden;this._experiments=experiments;}
isEnabled(){return this._experiments.isEnabled(this.name);}
setEnabled(enabled){this._experiments.setEnabled(this.name,enabled);}};Runtime.experiments=new Runtime.ExperimentsSupport();Runtime._appStartedPromiseCallback;Runtime._appStartedPromise=new Promise(fulfil=>Runtime._appStartedPromiseCallback=fulfil);Runtime._l10nCallback;Runtime._remoteBase;(function validateRemoteBase(){if(location.href.startsWith('devtools://devtools/bundled/')&&Runtime.queryParam('remoteBase')){const versionMatch=/\/serve_file\/(@[0-9a-zA-Z]+)\/?$/.exec(Runtime.queryParam('remoteBase'));if(versionMatch)
Runtime._remoteBase=`${location.origin}/remote/serve_file/${versionMatch[1]}/`;}})();function ServicePort(){}
ServicePort.prototype={setHandlers(messageHandler,closeHandler){},send(message){},close(){}};var runtime;allDescriptors.push(...[{"dependencies":[],"name":"platform"},{"dependencies":["platform","dom_extension"],"name":"toolbox_bootstrap"},{"dependencies":["platform"],"name":"dom_extension"}]);applicationDescriptor={"has_html":true,"modules":[{"type":"autostart","name":"platform"},{"type":"autostart","name":"toolbox_bootstrap"},{"type":"autostart","name":"dom_extension"}]}
self['Platform']=self['Platform']||{};let ArrayLike;function mod(m,n){return((m%n)+n)%n;}
String.prototype.findAll=function(string){const matches=[];let i=this.indexOf(string);while(i!==-1){matches.push(i);i=this.indexOf(string,i+string.length);}
return matches;};String.prototype.reverse=function(){return this.split('').reverse().join('');};String.prototype.replaceControlCharacters=function(){return this.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u0080-\u009f]/g,'�');};String.prototype.isWhitespace=function(){return/^\s*$/.test(this);};String.prototype.computeLineEndings=function(){const endings=this.findAll('\n');endings.push(this.length);return endings;};String.prototype.escapeCharacters=function(chars){let foundChar=false;for(let i=0;i<chars.length;++i){if(this.indexOf(chars.charAt(i))!==-1){foundChar=true;break;}}
if(!foundChar)
return String(this);let result='';for(let i=0;i<this.length;++i){if(chars.indexOf(this.charAt(i))!==-1)
result+='\\';result+=this.charAt(i);}
return result;};String.regexSpecialCharacters=function(){return'^[]{}()\\.^$*+?|-,';};String.prototype.escapeForRegExp=function(){return this.escapeCharacters(String.regexSpecialCharacters());};String.filterRegex=function(query){const toEscape=String.regexSpecialCharacters();let regexString='';for(let i=0;i<query.length;++i){let c=query.charAt(i);if(toEscape.indexOf(c)!==-1)
c='\\'+c;if(i)
regexString+='[^\\0'+c+']*';regexString+=c;}
return new RegExp(regexString,'i');};String.escapeInvalidUnicodeCharacters=function(text){if(!String._invalidCharactersRegExp){let invalidCharacters='';for(let i=0xfffe;i<=0x10ffff;i+=0x10000)
invalidCharacters+=String.fromCodePoint(i,i+1);String._invalidCharactersRegExp=new RegExp(`[${invalidCharacters}\uD800-\uDFFF\uFDD0-\uFDEF]`,'gu');}
let result='';let lastPos=0;while(true){const match=String._invalidCharactersRegExp.exec(text);if(!match)
break;result+=text.substring(lastPos,match.index)+'\\u'+text.charCodeAt(match.index).toString(16);if(match.index+1<String._invalidCharactersRegExp.lastIndex)
result+='\\u'+text.charCodeAt(match.index+1).toString(16);lastPos=String._invalidCharactersRegExp.lastIndex;}
return result+text.substring(lastPos);};String.prototype.escapeHTML=function(){return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};String.prototype.unescapeHTML=function(){return this.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#58;/g,':').replace(/&quot;/g,'"').replace(/&#60;/g,'<').replace(/&#62;/g,'>').replace(/&amp;/g,'&');};String.prototype.collapseWhitespace=function(){return this.replace(/[\s\xA0]+/g,' ');};String.prototype.trimMiddle=function(maxLength){if(this.length<=maxLength)
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
return constructorFunction[_singletonSymbol];const instance=new constructorFunction();constructorFunction[_singletonSymbol]=instance;return instance;}
function base64ToSize(content){if(!content)
return 0;let size=content.length*3/4;if(content[content.length-1]==='=')
size--;if(content.length>1&&content[content.length-2]==='=')
size--;return size;};self['DomExtension']=self['DomExtension']||{};Node.prototype.rangeOfWord=function(offset,stopCharacters,stayWithinNode,direction){let startNode;let startOffset=0;let endNode;let endOffset=0;if(!stayWithinNode)
stayWithinNode=this;if(!direction||direction==='backward'||direction==='both'){let node=this;while(node){if(node===stayWithinNode){if(!startNode)
startNode=stayWithinNode;break;}
if(node.nodeType===Node.TEXT_NODE){const start=(node===this?(offset-1):(node.nodeValue.length-1));for(let i=start;i>=0;--i){if(stopCharacters.indexOf(node.nodeValue[i])!==-1){startNode=node;startOffset=i+1;break;}}}
if(startNode)
break;node=node.traversePreviousNode(stayWithinNode);}
if(!startNode){startNode=stayWithinNode;startOffset=0;}}else{startNode=this;startOffset=offset;}
if(!direction||direction==='forward'||direction==='both'){let node=this;while(node){if(node===stayWithinNode){if(!endNode)
endNode=stayWithinNode;break;}
if(node.nodeType===Node.TEXT_NODE){const start=(node===this?offset:0);for(let i=start;i<node.nodeValue.length;++i){if(stopCharacters.indexOf(node.nodeValue[i])!==-1){endNode=node;endOffset=i;break;}}}
if(endNode)
break;node=node.traverseNextNode(stayWithinNode);}
if(!endNode){endNode=stayWithinNode;endOffset=stayWithinNode.nodeType===Node.TEXT_NODE?stayWithinNode.nodeValue.length:stayWithinNode.childNodes.length;}}else{endNode=this;endOffset=offset;}
const result=this.ownerDocument.createRange();result.setStart(startNode,startOffset);result.setEnd(endNode,endOffset);return result;};Node.prototype.traverseNextTextNode=function(stayWithin){let node=this.traverseNextNode(stayWithin);if(!node)
return null;const nonTextTags={'STYLE':1,'SCRIPT':1};while(node&&(node.nodeType!==Node.TEXT_NODE||nonTextTags[node.parentElement.nodeName]))
node=node.traverseNextNode(stayWithin);return node;};Element.prototype.positionAt=function(x,y,relativeTo){let shift={x:0,y:0};if(relativeTo)
shift=relativeTo.boxInWindow(this.ownerDocument.defaultView);if(typeof x==='number')
this.style.setProperty('left',(shift.x+x)+'px');else
this.style.removeProperty('left');if(typeof y==='number')
this.style.setProperty('top',(shift.y+y)+'px');else
this.style.removeProperty('top');if(typeof x==='number'||typeof y==='number')
this.style.setProperty('position','absolute');else
this.style.removeProperty('position');};Element.prototype.isScrolledToBottom=function(){return Math.abs(this.scrollTop+this.clientHeight-this.scrollHeight)<=2;};Node.prototype.enclosingNodeOrSelfWithNodeNameInArray=function(nameArray){for(let node=this;node&&node!==this.ownerDocument;node=node.parentNodeOrShadowHost()){for(let i=0;i<nameArray.length;++i){if(node.nodeName.toLowerCase()===nameArray[i].toLowerCase())
return node;}}
return null;};Node.prototype.enclosingNodeOrSelfWithNodeName=function(nodeName){return this.enclosingNodeOrSelfWithNodeNameInArray([nodeName]);};Node.prototype.enclosingNodeOrSelfWithClass=function(className,stayWithin){return this.enclosingNodeOrSelfWithClassList([className],stayWithin);};Node.prototype.enclosingNodeOrSelfWithClassList=function(classNames,stayWithin){for(let node=this;node&&node!==stayWithin&&node!==this.ownerDocument;node=node.parentNodeOrShadowHost()){if(node.nodeType===Node.ELEMENT_NODE){let containsAll=true;for(let i=0;i<classNames.length&&containsAll;++i){if(!node.classList.contains(classNames[i]))
containsAll=false;}
if(containsAll)
return(node);}}
return null;};Node.prototype.enclosingShadowRoot=function(){let parentNode=this.parentNodeOrShadowHost();while(parentNode){if(parentNode instanceof ShadowRoot)
return parentNode;parentNode=parentNode.parentNodeOrShadowHost();}
return null;};Node.prototype.hasSameShadowRoot=function(node){return this.enclosingShadowRoot()===node.enclosingShadowRoot();};Node.prototype.parentElementOrShadowHost=function(){if(this.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&this.host)
return(this.host);const node=this.parentNode;if(!node)
return null;if(node.nodeType===Node.ELEMENT_NODE)
return(node);if(node.nodeType===Node.DOCUMENT_FRAGMENT_NODE)
return(node.host);return null;};Node.prototype.parentNodeOrShadowHost=function(){if(this.parentNode)
return this.parentNode;if(this.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&this.host)
return this.host;return null;};Node.prototype.getComponentSelection=function(){let parent=this.parentNode;while(parent&&parent.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)
parent=parent.parentNode;return parent instanceof ShadowRoot?parent.getSelection():this.window().getSelection();};Node.prototype.hasSelection=function(){if(this instanceof Element){const slots=this.querySelectorAll('slot');for(const slot of slots){if(Array.prototype.some.call(slot.assignedNodes(),node=>node.hasSelection()))
return true;}}
const selection=this.getComponentSelection();if(selection.type!=='Range')
return false;return selection.containsNode(this,true)||selection.anchorNode.isSelfOrDescendant(this)||selection.focusNode.isSelfOrDescendant(this);};Node.prototype.window=function(){return(this.ownerDocument.defaultView);};Element.prototype.removeChildren=function(){if(this.firstChild)
this.textContent='';};function createElement(tagName,customElementType){return document.createElement(tagName,{is:customElementType});}
function createTextNode(data){return document.createTextNode(data);}
Document.prototype.createElementWithClass=function(elementName,className,customElementType){const element=this.createElement(elementName,{is:customElementType});if(className)
element.className=className;return element;};function createElementWithClass(elementName,className,customElementType){return document.createElementWithClass(elementName,className,customElementType);}
Document.prototype.createSVGElement=function(childType,className){const element=this.createElementNS('http://www.w3.org/2000/svg',childType);if(className)
element.setAttribute('class',className);return element;};function createSVGElement(childType,className){return document.createSVGElement(childType,className);}
function createDocumentFragment(){return document.createDocumentFragment();}
Element.prototype.createChild=function(elementName,className,customElementType){const element=this.ownerDocument.createElementWithClass(elementName,className,customElementType);this.appendChild(element);return element;};DocumentFragment.prototype.createChild=Element.prototype.createChild;Element.prototype.createTextChild=function(text){const element=this.ownerDocument.createTextNode(text);this.appendChild(element);return element;};DocumentFragment.prototype.createTextChild=Element.prototype.createTextChild;Element.prototype.createTextChildren=function(var_args){for(let i=0,n=arguments.length;i<n;++i)
this.createTextChild(arguments[i]);};DocumentFragment.prototype.createTextChildren=Element.prototype.createTextChildren;Element.prototype.totalOffsetLeft=function(){return this.totalOffset().left;};Element.prototype.totalOffsetTop=function(){return this.totalOffset().top;};Element.prototype.totalOffset=function(){const rect=this.getBoundingClientRect();return{left:rect.left,top:rect.top};};Element.prototype.createSVGChild=function(childType,className){const child=this.ownerDocument.createSVGElement(childType,className);this.appendChild(child);return child;};var AnchorBox=class{constructor(x,y,width,height){this.x=x||0;this.y=y||0;this.width=width||0;this.height=height||0;}
contains(x,y){return x>=this.x&&x<=this.x+this.width&&y>=this.y&&y<=this.y+this.height;}};AnchorBox.prototype.relativeTo=function(box){return new AnchorBox(this.x-box.x,this.y-box.y,this.width,this.height);};AnchorBox.prototype.relativeToElement=function(element){return this.relativeTo(element.boxInWindow(element.ownerDocument.defaultView));};AnchorBox.prototype.equals=function(anchorBox){return!!anchorBox&&this.x===anchorBox.x&&this.y===anchorBox.y&&this.width===anchorBox.width&&this.height===anchorBox.height;};Element.prototype.boxInWindow=function(targetWindow){targetWindow=targetWindow||this.ownerDocument.defaultView;const anchorBox=new AnchorBox();let curElement=this;let curWindow=this.ownerDocument.defaultView;while(curWindow&&curElement){anchorBox.x+=curElement.totalOffsetLeft();anchorBox.y+=curElement.totalOffsetTop();if(curWindow===targetWindow)
break;curElement=curWindow.frameElement;curWindow=curWindow.parent;}
anchorBox.width=Math.min(this.offsetWidth,targetWindow.innerWidth-anchorBox.x);anchorBox.height=Math.min(this.offsetHeight,targetWindow.innerHeight-anchorBox.y);return anchorBox;};Event.prototype.consume=function(preventDefault){this.stopImmediatePropagation();if(preventDefault)
this.preventDefault();this.handled=true;};Text.prototype.select=function(start,end){start=start||0;end=end||this.textContent.length;if(start<0)
start=end+start;const selection=this.getComponentSelection();selection.removeAllRanges();const range=this.ownerDocument.createRange();range.setStart(this,start);range.setEnd(this,end);selection.addRange(range);return this;};Element.prototype.selectionLeftOffset=function(){const selection=this.getComponentSelection();if(!selection.containsNode(this,true))
return null;let leftOffset=selection.anchorOffset;let node=selection.anchorNode;while(node!==this){while(node.previousSibling){node=node.previousSibling;leftOffset+=node.textContent.length;}
node=node.parentNodeOrShadowHost();}
return leftOffset;};Node.prototype.appendChildren=function(var_args){for(let i=0,n=arguments.length;i<n;++i)
this.appendChild(arguments[i]);};Node.prototype.deepTextContent=function(){return this.childTextNodes().map(function(node){return node.textContent;}).join('');};Node.prototype.childTextNodes=function(){let node=this.traverseNextTextNode(this);const result=[];const nonTextTags={'STYLE':1,'SCRIPT':1};while(node){if(!nonTextTags[node.parentElement.nodeName])
result.push(node);node=node.traverseNextTextNode(this);}
return result;};Node.prototype.isAncestor=function(node){if(!node)
return false;let currentNode=node.parentNodeOrShadowHost();while(currentNode){if(this===currentNode)
return true;currentNode=currentNode.parentNodeOrShadowHost();}
return false;};Node.prototype.isDescendant=function(descendant){return!!descendant&&descendant.isAncestor(this);};Node.prototype.isSelfOrAncestor=function(node){return!!node&&(node===this||this.isAncestor(node));};Node.prototype.isSelfOrDescendant=function(node){return!!node&&(node===this||this.isDescendant(node));};Node.prototype.traverseNextNode=function(stayWithin){if(this.shadowRoot)
return this.shadowRoot;const distributedNodes=this instanceof HTMLSlotElement?this.assignedNodes():[];if(distributedNodes.length)
return distributedNodes[0];if(this.firstChild)
return this.firstChild;let node=this;while(node){if(stayWithin&&node===stayWithin)
return null;const sibling=nextSibling(node);if(sibling)
return sibling;node=node.assignedSlot||node.parentNodeOrShadowHost();}
function nextSibling(node){if(!node.assignedSlot)
return node.nextSibling;const distributedNodes=node.assignedSlot.assignedNodes();const position=Array.prototype.indexOf.call(distributedNodes,node);if(position+1<distributedNodes.length)
return distributedNodes[position+1];return null;}
return null;};Node.prototype.traversePreviousNode=function(stayWithin){if(stayWithin&&this===stayWithin)
return null;let node=this.previousSibling;while(node&&node.lastChild)
node=node.lastChild;if(node)
return node;return this.parentNodeOrShadowHost();};Node.prototype.setTextContentTruncatedIfNeeded=function(text,placeholder){const maxTextContentLength=10000;if(typeof text==='string'&&text.length>maxTextContentLength){this.textContent=typeof placeholder==='string'?placeholder:text.trimMiddle(maxTextContentLength);return true;}
this.textContent=text;return false;};Event.prototype.deepElementFromPoint=function(){if(!this.which&&!this.pageX&&!this.pageY&&!this.clientX&&!this.clientY&&!this.movementX&&!this.movementY)
return null;const root=this.target&&this.target.getComponentRoot();return root?root.deepElementFromPoint(this.pageX,this.pageY):null;};Document.prototype.deepElementFromPoint=function(x,y){let container=this;let node=null;while(container){const innerNode=container.elementFromPoint(x,y);if(!innerNode||node===innerNode)
break;node=innerNode;container=node.shadowRoot;}
return node;};DocumentFragment.prototype.deepElementFromPoint=Document.prototype.deepElementFromPoint;Document.prototype.deepActiveElement=function(){let activeElement=this.activeElement;while(activeElement&&activeElement.shadowRoot&&activeElement.shadowRoot.activeElement)
activeElement=activeElement.shadowRoot.activeElement;return activeElement;};DocumentFragment.prototype.deepActiveElement=Document.prototype.deepActiveElement;Element.prototype.hasFocus=function(){const root=this.getComponentRoot();return!!root&&this.isSelfOrAncestor(root.activeElement);};Node.prototype.getComponentRoot=function(){let node=this;while(node&&node.nodeType!==Node.DOCUMENT_FRAGMENT_NODE&&node.nodeType!==Node.DOCUMENT_NODE)
node=node.parentNode;return(node);};function isEnterKey(event){return event.keyCode!==229&&event.key==='Enter';}
function isEscKey(event){return event.keyCode===27;}
(function(){const originalToggle=DOMTokenList.prototype.toggle;DOMTokenList.prototype['toggle']=function(token,force){if(arguments.length===1)
force=!this.contains(token);return originalToggle.call(this,token,!!force);};})();;self['ToolboxBootstrap']=self['ToolboxBootstrap']||{};(function(){function toolboxLoaded(){if(!window.opener)
return;const app=window.opener['Emulation']['AdvancedApp']['_instance']();app['toolboxLoaded'](document);}
runOnWindowLoad(toolboxLoaded);})();;;