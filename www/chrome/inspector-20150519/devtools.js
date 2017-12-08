var allDescriptors=[{"dependencies":[],"name":"platform","scripts":[]},{"dependencies":["common","platform"],"name":"host","scripts":[]},{"skip_compilation":["TestBase.js"],"dependencies":["platform"],"name":"common","scripts":[]},{"skip_compilation":["UITests.js"],"dependencies":["common","host","platform"],"name":"devtools_app","scripts":[]}];var applicationDescriptor;var _loadedScripts={};for(var k of[]);function loadResourcePromise(url)
{return new Promise(load);function load(fulfill,reject)
{var xhr=new XMLHttpRequest();xhr.open("GET",url,true);xhr.onreadystatechange=onreadystatechange;function onreadystatechange(e)
{if(xhr.readyState!==4)
return;if([0,200,304].indexOf(xhr.status)===-1)
reject(new Error("While loading from url "+url+" server responded with a status of "+xhr.status));else
fulfill(e.target.response);}
xhr.send(null);}}
function normalizePath(path)
{if(path.indexOf("..")===-1&&path.indexOf('.')===-1)
return path;var normalizedSegments=[];var segments=path.split("/");for(var i=0;i<segments.length;i++){var segment=segments[i];if(segment===".")
continue;else if(segment==="..")
normalizedSegments.pop();else if(segment)
normalizedSegments.push(segment);}
var normalizedPath=normalizedSegments.join("/");if(normalizedPath[normalizedPath.length-1]==="/")
return normalizedPath;if(path[0]==="/"&&normalizedPath)
normalizedPath="/"+normalizedPath;if((path[path.length-1]==="/")||(segments[segments.length-1]===".")||(segments[segments.length-1]===".."))
normalizedPath=normalizedPath+"/";return normalizedPath;}
function loadScriptsPromise(scriptNames,base)
{var promises=[];var urls=[];var sources=new Array(scriptNames.length);var scriptToEval=0;for(var i=0;i<scriptNames.length;++i){var scriptName=scriptNames[i];var sourceURL=(base||self._importScriptPathPrefix)+scriptName;var schemaIndex=sourceURL.indexOf("://")+3;sourceURL=sourceURL.substring(0,schemaIndex)+normalizePath(sourceURL.substring(schemaIndex));if(_loadedScripts[sourceURL])
continue;urls.push(sourceURL);promises.push(loadResourcePromise(sourceURL).then(scriptSourceLoaded.bind(null,i),scriptSourceLoaded.bind(null,i,undefined)));}
return Promise.all(promises).then(undefined);function scriptSourceLoaded(scriptNumber,scriptSource)
{sources[scriptNumber]=scriptSource||"";while(typeof sources[scriptToEval]!=="undefined"){evaluateScript(urls[scriptToEval],sources[scriptToEval]);++scriptToEval;}}
function evaluateScript(sourceURL,scriptSource)
{_loadedScripts[sourceURL]=true;if(!scriptSource){console.error("Empty response arrived for script '"+sourceURL+"'");return;}
self.eval(scriptSource+"\n//# sourceURL="+sourceURL);}}
(function(){var baseUrl=self.location?self.location.origin+self.location.pathname:"";self._importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf("/")+1);})();function Runtime(descriptors,coreModuleNames)
{this._modules=[];this._modulesMap={};this._extensions=[];this._cachedTypeClasses={};this._descriptorsMap={};for(var i=0;i<descriptors.length;++i)
this._registerModule(descriptors[i]);if(coreModuleNames)
this._loadAutoStartModules(coreModuleNames);}
Runtime._queryParamsObject={__proto__:null};Runtime.cachedResources={__proto__:null};Runtime.isReleaseMode=function()
{return!!allDescriptors.length;}
Runtime.startApplication=function(appName)
{console.timeStamp("Runtime.startApplication");var allDescriptorsByName={};for(var i=0;Runtime.isReleaseMode()&&i<allDescriptors.length;++i){var d=allDescriptors[i];allDescriptorsByName[d["name"]]=d;}
var applicationPromise;if(applicationDescriptor)
applicationPromise=Promise.resolve(applicationDescriptor);else
applicationPromise=loadResourcePromise(appName+".json").then(JSON.parse.bind(JSON));applicationPromise.then(parseModuleDescriptors);function parseModuleDescriptors(configuration)
{var moduleJSONPromises=[];var coreModuleNames=[];for(var i=0;i<configuration.length;++i){var descriptor=configuration[i];if(descriptor["type"]==="worker")
continue;var name=descriptor["name"];var moduleJSON=allDescriptorsByName[name];if(moduleJSON)
moduleJSONPromises.push(Promise.resolve(moduleJSON));else
moduleJSONPromises.push(loadResourcePromise(name+"/module.json").then(JSON.parse.bind(JSON)));if(descriptor["type"]==="autostart")
coreModuleNames.push(name);}
Promise.all(moduleJSONPromises).then(instantiateRuntime);function instantiateRuntime(moduleDescriptors)
{for(var i=0;!Runtime.isReleaseMode()&&i<moduleDescriptors.length;++i){moduleDescriptors[i]["name"]=configuration[i]["name"];moduleDescriptors[i]["condition"]=configuration[i]["condition"];}
self.runtime=new Runtime(moduleDescriptors,coreModuleNames);}}}
Runtime.queryParam=function(name)
{return Runtime._queryParamsObject[name]||null;}
Runtime.constructQueryParams=function(banned)
{var params=[];for(var key in Runtime._queryParamsObject){if(!key||banned.indexOf(key)!==-1)
continue;params.push(key+"="+Runtime._queryParamsObject[key]);}
return params.length?"?"+params.join("&"):"";}
Runtime._experimentsSetting=function()
{try{return(JSON.parse(self.localStorage&&self.localStorage["experiments"]?self.localStorage["experiments"]:"{}"));}catch(e){console.error("Failed to parse localStorage['experiments']");return{};}}
Runtime._some=function(promises)
{var all=[];var wasRejected=[];for(var i=0;i<promises.length;++i){var handlerFunction=(handler.bind(promises[i],i));all.push(promises[i].catch(handlerFunction));}
return Promise.all(all).then(filterOutFailuresResults);function filterOutFailuresResults(results)
{var filtered=[];for(var i=0;i<results.length;++i){if(!wasRejected[i])
filtered.push(results[i]);}
return filtered;}
function handler(index,e)
{wasRejected[index]=true;console.error(e.stack);}}
Runtime._console=console;Runtime._originalAssert=console.assert;Runtime._assert=function(value,message)
{if(value)
return;Runtime._originalAssert.call(Runtime._console,value,message+" "+new Error().stack);}
Runtime.prototype={useTestBase:function()
{Runtime._remoteBase="http://localhost:8000/inspector-sources/";},_registerModule:function(descriptor)
{var module=new Runtime.Module(this,descriptor);this._modules.push(module);this._modulesMap[descriptor["name"]]=module;},loadModulePromise:function(moduleName)
{return this._modulesMap[moduleName]._loadPromise();},_loadAutoStartModules:function(moduleNames)
{var promises=[];for(var i=0;i<moduleNames.length;++i){if(Runtime.isReleaseMode())
this._modulesMap[moduleNames[i]]._loaded=true;else
promises.push(this.loadModulePromise(moduleNames[i]));}
return Promise.all(promises);},_checkExtensionApplicability:function(extension,predicate)
{if(!predicate)
return false;var contextTypes=(extension.descriptor().contextTypes);if(!contextTypes)
return true;for(var i=0;i<contextTypes.length;++i){var contextType=this._resolve(contextTypes[i]);var isMatching=!!contextType&&predicate(contextType);if(isMatching)
return true;}
return false;},isExtensionApplicableToContext:function(extension,context)
{if(!context)
return true;return this._checkExtensionApplicability(extension,isInstanceOf);function isInstanceOf(targetType)
{return context instanceof targetType;}},isExtensionApplicableToContextTypes:function(extension,currentContextTypes)
{if(!extension.descriptor().contextTypes)
return true;return this._checkExtensionApplicability(extension,currentContextTypes?isContextTypeKnown:null);function isContextTypeKnown(targetType)
{return currentContextTypes.has(targetType);}},extensions:function(type,context)
{return this._extensions.filter(filter).sort(orderComparator);function filter(extension)
{if(extension._type!==type&&extension._typeClass()!==type)
return false;if(!extension.enabled())
return false;return!context||extension.isApplicable(context);}
function orderComparator(extension1,extension2)
{var order1=extension1.descriptor()["order"]||0;var order2=extension2.descriptor()["order"]||0;return order1-order2;}},extension:function(type,context)
{return this.extensions(type,context)[0]||null;},instancesPromise:function(type,context)
{var extensions=this.extensions(type,context);var promises=[];for(var i=0;i<extensions.length;++i)
promises.push(extensions[i].instancePromise());return Runtime._some(promises);},instancePromise:function(type,context)
{var extension=this.extension(type,context);if(!extension)
return Promise.reject(new Error("No such extension: "+type+" in given context."));return extension.instancePromise();},_resolve:function(typeName)
{if(!this._cachedTypeClasses[typeName]){var path=typeName.split(".");var object=window;for(var i=0;object&&(i<path.length);++i)
object=object[path[i]];if(object)
this._cachedTypeClasses[typeName]=(object);}
return this._cachedTypeClasses[typeName]||null;}}
Runtime.ModuleDescriptor=function()
{this.name;this.extensions;this.dependencies;this.scripts;this.remote;}
Runtime.ExtensionDescriptor=function()
{this.type;this.className;this.contextTypes;}
Runtime.Module=function(manager,descriptor)
{this._manager=manager;this._descriptor=descriptor;this._name=descriptor.name;this._instanceMap={};var extensions=(descriptor.extensions);for(var i=0;extensions&&i<extensions.length;++i)
this._manager._extensions.push(new Runtime.Extension(this,extensions[i]));this._loaded=false;}
Runtime.Module.prototype={name:function()
{return this._name;},enabled:function()
{var activatorExperiment=this._descriptor["experiment"];if(activatorExperiment&&!Runtime.experiments.isEnabled(activatorExperiment))
return false;var condition=this._descriptor["condition"];if(condition&&!Runtime.queryParam(condition))
return false;return true;},resource:function(name)
{var fullName=this._name+"/"+name;var content=Runtime.cachedResources[fullName];if(!content)
throw new Error(fullName+" not preloaded. Check module.json");return content;},_loadPromise:function()
{if(this._loaded)
return Promise.resolve();if(!this.enabled())
return Promise.reject(new Error("Module "+this._name+" is not enabled"));if(this._pendingLoadPromise)
return this._pendingLoadPromise;var dependencies=this._descriptor.dependencies;var dependencyPromises=[];for(var i=0;dependencies&&i<dependencies.length;++i)
dependencyPromises.push(this._manager._modulesMap[dependencies[i]]._loadPromise());this._pendingLoadPromise=Promise.all(dependencyPromises).then(this._loadResources.bind(this)).then(this._loadScripts.bind(this)).then(markAsLoaded.bind(this));return this._pendingLoadPromise;function markAsLoaded()
{delete this._pendingLoadPromise;this._loaded=true;}},_loadResources:function()
{var resources=this._descriptor["resources"];if(!resources)
return Promise.resolve();var promises=[];for(var i=0;i<resources.length;++i){var url=this._modularizeURL(resources[i]);promises.push(loadResourcePromise(url).then(cacheResource.bind(this,url),cacheResource.bind(this,url,undefined)));}
return Promise.all(promises).then(undefined);function cacheResource(path,content)
{if(!content){console.error("Failed to load resource: "+path);return;}
var sourceURL=window.location.href;if(window.location.search)
sourceURL=sourceURL.replace(window.location.search,"");sourceURL=sourceURL.substring(0,sourceURL.lastIndexOf("/")+1)+path;Runtime.cachedResources[path]=content+"\n/*# sourceURL="+sourceURL+" */";}},_loadScripts:function()
{if(!this._descriptor.scripts)
return Promise.resolve();if(Runtime.isReleaseMode()){var useRemote=this._descriptor.remote&&Runtime.experiments.isEnabled("remoteModules");var base=useRemote&&Runtime._remoteBase||undefined;return loadScriptsPromise([this._name+"_module.js"],base);}
return loadScriptsPromise(this._descriptor.scripts.map(this._modularizeURL,this));},_modularizeURL:function(resourceName)
{return normalizePath(this._name+"/"+resourceName);},_instance:function(className)
{if(className in this._instanceMap)
return this._instanceMap[className];var constructorFunction=window.eval(className);if(!(constructorFunction instanceof Function)){this._instanceMap[className]=null;return null;}
var instance=new constructorFunction();this._instanceMap[className]=instance;return instance;}}
Runtime.Extension=function(module,descriptor)
{this._module=module;this._descriptor=descriptor;this._type=descriptor.type;this._hasTypeClass=this._type.charAt(0)==="@";this._className=descriptor.className||null;}
Runtime.Extension.prototype={descriptor:function()
{return this._descriptor;},module:function()
{return this._module;},enabled:function()
{var activatorExperiment=this.descriptor()["experiment"];if(activatorExperiment&&!Runtime.experiments.isEnabled(activatorExperiment))
return false;var condition=this.descriptor()["condition"];if(condition&&!Runtime.queryParam(condition))
return false;return this._module.enabled();},_typeClass:function()
{if(!this._hasTypeClass)
return null;return this._module._manager._resolve(this._type.substring(1));},isApplicable:function(context)
{return this._module._manager.isExtensionApplicableToContext(this,context);},instancePromise:function()
{if(!this._className)
return Promise.reject(new Error("No class name in extension"));var className=this._className;if(this._instance)
return Promise.resolve(this._instance);return this._module._loadPromise().then(constructInstance.bind(this));function constructInstance()
{var result=this._module._instance(className);if(!result)
return Promise.reject("Could not instantiate: "+className);return result;}},title:function(platform)
{return this._descriptor["title-"+platform]||this._descriptor["title"];}}
Runtime.ExperimentsSupport=function()
{this._supportEnabled=Runtime.queryParam("experiments")!==null;this._experiments=[];this._experimentNames={};this._enabledTransiently={};}
Runtime.ExperimentsSupport.prototype={allConfigurableExperiments:function()
{var result=[];for(var i=0;i<this._experiments.length;i++){var experiment=this._experiments[i];if(!this._enabledTransiently[experiment.name])
result.push(experiment);}
return result;},supportEnabled:function()
{return this._supportEnabled;},_setExperimentsSetting:function(value)
{if(!self.localStorage)
return;self.localStorage["experiments"]=JSON.stringify(value);},register:function(experimentName,experimentTitle,hidden)
{Runtime._assert(!this._experimentNames[experimentName],"Duplicate registration of experiment "+experimentName);this._experimentNames[experimentName]=true;this._experiments.push(new Runtime.Experiment(this,experimentName,experimentTitle,!!hidden));},isEnabled:function(experimentName)
{this._checkExperiment(experimentName);if(this._enabledTransiently[experimentName])
return true;if(!this.supportEnabled())
return false;return!!Runtime._experimentsSetting()[experimentName];},setEnabled:function(experimentName,enabled)
{this._checkExperiment(experimentName);var experimentsSetting=Runtime._experimentsSetting();experimentsSetting[experimentName]=enabled;this._setExperimentsSetting(experimentsSetting);},setDefaultExperiments:function(experimentNames)
{for(var i=0;i<experimentNames.length;++i){this._checkExperiment(experimentNames[i]);this._enabledTransiently[experimentNames[i]]=true;}},enableForTest:function(experimentName)
{this._checkExperiment(experimentName);this._enabledTransiently[experimentName]=true;},cleanUpStaleExperiments:function()
{var experimentsSetting=Runtime._experimentsSetting();var cleanedUpExperimentSetting={};for(var i=0;i<this._experiments.length;++i){var experimentName=this._experiments[i].name;if(experimentsSetting[experimentName])
cleanedUpExperimentSetting[experimentName]=true;}
this._setExperimentsSetting(cleanedUpExperimentSetting);},_checkExperiment:function(experimentName)
{Runtime._assert(this._experimentNames[experimentName],"Unknown experiment "+experimentName);}}
Runtime.Experiment=function(experiments,name,title,hidden)
{this.name=name;this.title=title;this.hidden=hidden;this._experiments=experiments;}
Runtime.Experiment.prototype={isEnabled:function()
{return this._experiments.isEnabled(this.name);},setEnabled:function(enabled)
{this._experiments.setEnabled(this.name,enabled);}}
{(function parseQueryParameters()
{var queryParams=location.search;if(!queryParams)
return;var params=queryParams.substring(1).split("&");for(var i=0;i<params.length;++i){var pair=params[i].split("=");var name=pair.shift();Runtime._queryParamsObject[name]=pair.join("=");}})();}
Runtime.experiments=new Runtime.ExperimentsSupport();Runtime.experiments.register("remoteModules","Remote Modules",true);Runtime._remoteBase=Runtime.queryParam("remoteBase");var runtime;console=console;console.__originalAssert=console.assert;console.assert=function(value,message)
{if(value)
return;console.__originalAssert(value,message);}
var ArrayLike;Object.isEmpty=function(obj)
{for(var i in obj)
return false;return true;}
Object.values=function(obj)
{var result=Object.keys(obj);var length=result.length;for(var i=0;i<length;++i)
result[i]=obj[result[i]];return result;}
function mod(m,n)
{return((m%n)+n)%n;}
String.prototype.findAll=function(string)
{var matches=[];var i=this.indexOf(string);while(i!==-1){matches.push(i);i=this.indexOf(string,i+string.length);}
return matches;}
String.prototype.lineEndings=function()
{if(!this._lineEndings){this._lineEndings=this.findAll("\n");this._lineEndings.push(this.length);}
return this._lineEndings;}
String.prototype.lineCount=function()
{var lineEndings=this.lineEndings();return lineEndings.length;}
String.prototype.lineAt=function(lineNumber)
{var lineEndings=this.lineEndings();var lineStart=lineNumber>0?lineEndings[lineNumber-1]+1:0;var lineEnd=lineEndings[lineNumber];var lineContent=this.substring(lineStart,lineEnd);if(lineContent.length>0&&lineContent.charAt(lineContent.length-1)==="\r")
lineContent=lineContent.substring(0,lineContent.length-1);return lineContent;}
String.prototype.escapeCharacters=function(chars)
{var foundChar=false;for(var i=0;i<chars.length;++i){if(this.indexOf(chars.charAt(i))!==-1){foundChar=true;break;}}
if(!foundChar)
return String(this);var result="";for(var i=0;i<this.length;++i){if(chars.indexOf(this.charAt(i))!==-1)
result+="\\";result+=this.charAt(i);}
return result;}
String.regexSpecialCharacters=function()
{return"^[]{}()\\.^$*+?|-,";}
String.prototype.escapeForRegExp=function()
{return this.escapeCharacters(String.regexSpecialCharacters());}
String.prototype.escapeHTML=function()
{return this.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
String.prototype.unescapeHTML=function()
{return this.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#58;/g,":").replace(/&quot;/g,"\"").replace(/&#60;/g,"<").replace(/&#62;/g,">").replace(/&amp;/g,"&");}
String.prototype.collapseWhitespace=function()
{return this.replace(/[\s\xA0]+/g," ");}
String.prototype.trimMiddle=function(maxLength)
{if(this.length<=maxLength)
return String(this);var leftHalf=maxLength>>1;var rightHalf=maxLength-leftHalf-1;return this.substr(0,leftHalf)+"\u2026"+this.substr(this.length-rightHalf,rightHalf);}
String.prototype.trimEnd=function(maxLength)
{if(this.length<=maxLength)
return String(this);return this.substr(0,maxLength-1)+"\u2026";}
String.prototype.trimURL=function(baseURLDomain)
{var result=this.replace(/^(https|http|file):\/\//i,"");if(baseURLDomain){if(result.toLowerCase().startsWith(baseURLDomain.toLowerCase()))
result=result.substr(baseURLDomain.length);}
return result;}
String.prototype.toTitleCase=function()
{return this.substring(0,1).toUpperCase()+this.substring(1);}
String.prototype.compareTo=function(other)
{if(this>other)
return 1;if(this<other)
return-1;return 0;}
function sanitizeHref(href)
{return href&&href.trim().toLowerCase().startsWith("javascript:")?null:href;}
String.prototype.removeURLFragment=function()
{var fragmentIndex=this.indexOf("#");if(fragmentIndex==-1)
fragmentIndex=this.length;return this.substring(0,fragmentIndex);}
String.prototype.startsWith=function(substring)
{return!this.lastIndexOf(substring,0);}
String.prototype.endsWith=function(substring)
{return this.indexOf(substring,this.length-substring.length)!==-1;}
String.hashCode=function(string)
{if(!string)
return 0;var result=0;for(var i=0;i<string.length;++i)
result=(result*3+string.charCodeAt(i))|0;return result;}
String.isDigitAt=function(string,index)
{var c=string.charCodeAt(index);return 48<=c&&c<=57;}
String.prototype.toBase64=function()
{function encodeBits(b)
{return b<26?b+65:b<52?b+71:b<62?b-4:b===62?43:b===63?47:65;}
var encoder=new TextEncoder();var data=encoder.encode(this.toString());var n=data.length;var encoded="";if(n===0)
return encoded;var shift;var v=0;for(var i=0;i<n;i++){shift=i%3;v|=data[i]<<(16>>>shift&24);if(shift===2){encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),encodeBits(v>>>6&63),encodeBits(v&63));v=0;}}
if(shift===0)
encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),61,61);else if(shift===1)
encoded+=String.fromCharCode(encodeBits(v>>>18&63),encodeBits(v>>>12&63),encodeBits(v>>>6&63),61);return encoded;}
String.naturalOrderComparator=function(a,b)
{var chunk=/^\d+|^\D+/;var chunka,chunkb,anum,bnum;while(1){if(a){if(!b)
return 1;}else{if(b)
return-1;else
return 0;}
chunka=a.match(chunk)[0];chunkb=b.match(chunk)[0];anum=!isNaN(chunka);bnum=!isNaN(chunkb);if(anum&&!bnum)
return-1;if(bnum&&!anum)
return 1;if(anum&&bnum){var diff=chunka-chunkb;if(diff)
return diff;if(chunka.length!==chunkb.length){if(!+chunka&&!+chunkb)
return chunka.length-chunkb.length;else
return chunkb.length-chunka.length;}}else if(chunka!==chunkb)
return(chunka<chunkb)?-1:1;a=a.substring(chunka.length);b=b.substring(chunkb.length);}}
Number.constrain=function(num,min,max)
{if(num<min)
num=min;else if(num>max)
num=max;return num;}
Number.gcd=function(a,b)
{if(b===0)
return a;else
return Number.gcd(b,a%b);}
Number.toFixedIfFloating=function(value)
{if(!value||isNaN(value))
return value;var number=Number(value);return number%1?number.toFixed(3):String(number);}
Date.prototype.toISO8601Compact=function()
{function leadZero(x)
{return(x>9?"":"0")+x;}
return this.getFullYear()+
leadZero(this.getMonth()+1)+
leadZero(this.getDate())+"T"+
leadZero(this.getHours())+
leadZero(this.getMinutes())+
leadZero(this.getSeconds());}
Date.prototype.toConsoleTime=function()
{function leadZero2(x)
{return(x>9?"":"0")+x;}
function leadZero3(x)
{return"0".repeat(3-x.toString().length)+x;}
return this.getFullYear()+"-"+
leadZero2(this.getMonth()+1)+"-"+
leadZero2(this.getDate())+" "+
leadZero2(this.getHours())+":"+
leadZero2(this.getMinutes())+":"+
leadZero2(this.getSeconds())+"."+
leadZero3(this.getMilliseconds());}
Object.defineProperty(Array.prototype,"remove",{value:function(value,firstOnly)
{var index=this.indexOf(value);if(index===-1)
return;if(firstOnly){this.splice(index,1);return;}
for(var i=index+1,n=this.length;i<n;++i){if(this[i]!==value)
this[index++]=this[i];}
this.length=index;}});Object.defineProperty(Array.prototype,"keySet",{value:function()
{var keys={};for(var i=0;i<this.length;++i)
keys[this[i]]=true;return keys;}});Object.defineProperty(Array.prototype,"pushAll",{value:function(array)
{Array.prototype.push.apply(this,array);}});Object.defineProperty(Array.prototype,"rotate",{value:function(index)
{var result=[];for(var i=index;i<index+this.length;++i)
result.push(this[i%this.length]);return result;}});Object.defineProperty(Array.prototype,"sortNumbers",{value:function()
{function numericComparator(a,b)
{return a-b;}
this.sort(numericComparator);}});Object.defineProperty(Uint32Array.prototype,"sort",{value:Array.prototype.sort});(function(){var partition={value:function(comparator,left,right,pivotIndex)
{function swap(array,i1,i2)
{var temp=array[i1];array[i1]=array[i2];array[i2]=temp;}
var pivotValue=this[pivotIndex];swap(this,right,pivotIndex);var storeIndex=left;for(var i=left;i<right;++i){if(comparator(this[i],pivotValue)<0){swap(this,storeIndex,i);++storeIndex;}}
swap(this,right,storeIndex);return storeIndex;}};Object.defineProperty(Array.prototype,"partition",partition);Object.defineProperty(Uint32Array.prototype,"partition",partition);var sortRange={value:function(comparator,leftBound,rightBound,sortWindowLeft,sortWindowRight)
{function quickSortRange(array,comparator,left,right,sortWindowLeft,sortWindowRight)
{if(right<=left)
return;var pivotIndex=Math.floor(Math.random()*(right-left))+left;var pivotNewIndex=array.partition(comparator,left,right,pivotIndex);if(sortWindowLeft<pivotNewIndex)
quickSortRange(array,comparator,left,pivotNewIndex-1,sortWindowLeft,sortWindowRight);if(pivotNewIndex<sortWindowRight)
quickSortRange(array,comparator,pivotNewIndex+1,right,sortWindowLeft,sortWindowRight);}
if(leftBound===0&&rightBound===(this.length-1)&&sortWindowLeft===0&&sortWindowRight>=rightBound)
this.sort(comparator);else
quickSortRange(this,comparator,leftBound,rightBound,sortWindowLeft,sortWindowRight);return this;}}
Object.defineProperty(Array.prototype,"sortRange",sortRange);Object.defineProperty(Uint32Array.prototype,"sortRange",sortRange);})();Object.defineProperty(Array.prototype,"stableSort",{value:function(comparator)
{function defaultComparator(a,b)
{return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;var indices=new Array(this.length);for(var i=0;i<this.length;++i)
indices[i]=i;var self=this;function indexComparator(a,b)
{var result=comparator(self[a],self[b]);return result?result:a-b;}
indices.sort(indexComparator);for(var i=0;i<this.length;++i){if(indices[i]<0||i===indices[i])
continue;var cyclical=i;var saved=this[i];while(true){var next=indices[cyclical];indices[cyclical]=-1;if(next===i){this[cyclical]=saved;break;}else{this[cyclical]=this[next];cyclical=next;}}}
return this;}});Object.defineProperty(Array.prototype,"qselect",{value:function(k,comparator)
{if(k<0||k>=this.length)
return;if(!comparator)
comparator=function(a,b){return a-b;}
var low=0;var high=this.length-1;for(;;){var pivotPosition=this.partition(comparator,low,high,Math.floor((high+low)/2));if(pivotPosition===k)
return this[k];else if(pivotPosition>k)
high=pivotPosition-1;else
low=pivotPosition+1;}}});Object.defineProperty(Array.prototype,"lowerBound",{value:function(object,comparator,left,right)
{function defaultComparator(a,b)
{return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;var l=left||0;var r=right!==undefined?right:this.length;while(l<r){var m=(l+r)>>1;if(comparator(object,this[m])>0)
l=m+1;else
r=m;}
return r;}});Object.defineProperty(Array.prototype,"upperBound",{value:function(object,comparator,left,right)
{function defaultComparator(a,b)
{return a<b?-1:(a>b?1:0);}
comparator=comparator||defaultComparator;var l=left||0;var r=right!==undefined?right:this.length;while(l<r){var m=(l+r)>>1;if(comparator(object,this[m])>=0)
l=m+1;else
r=m;}
return r;}});Object.defineProperty(Uint32Array.prototype,"lowerBound",{value:Array.prototype.lowerBound});Object.defineProperty(Uint32Array.prototype,"upperBound",{value:Array.prototype.upperBound});Object.defineProperty(Float64Array.prototype,"lowerBound",{value:Array.prototype.lowerBound});Object.defineProperty(Array.prototype,"binaryIndexOf",{value:function(value,comparator)
{var index=this.lowerBound(value,comparator);return index<this.length&&comparator(value,this[index])===0?index:-1;}});Object.defineProperty(Array.prototype,"select",{value:function(field)
{var result=new Array(this.length);for(var i=0;i<this.length;++i)
result[i]=this[i][field];return result;}});Object.defineProperty(Array.prototype,"peekLast",{value:function()
{return this[this.length-1];}});(function(){function mergeOrIntersect(array1,array2,comparator,mergeNotIntersect)
{var result=[];var i=0;var j=0;while(i<array1.length&&j<array2.length){var compareValue=comparator(array1[i],array2[j]);if(mergeNotIntersect||!compareValue)
result.push(compareValue<=0?array1[i]:array2[j]);if(compareValue<=0)
i++;if(compareValue>=0)
j++;}
if(mergeNotIntersect){while(i<array1.length)
result.push(array1[i++]);while(j<array2.length)
result.push(array2[j++]);}
return result;}
Object.defineProperty(Array.prototype,"intersectOrdered",{value:function(array,comparator)
{return mergeOrIntersect(this,array,comparator,false);}});Object.defineProperty(Array.prototype,"mergeOrdered",{value:function(array,comparator)
{return mergeOrIntersect(this,array,comparator,true);}});}());function insertionIndexForObjectInListSortedByFunction(object,list,comparator,insertionIndexAfter)
{if(insertionIndexAfter)
return list.upperBound(object,comparator);else
return list.lowerBound(object,comparator);}
String.sprintf=function(format,var_arg)
{return String.vsprintf(format,Array.prototype.slice.call(arguments,1));}
String.tokenizeFormatString=function(format,formatters)
{var tokens=[];var substitutionIndex=0;function addStringToken(str)
{tokens.push({type:"string",value:str});}
function addSpecifierToken(specifier,precision,substitutionIndex)
{tokens.push({type:"specifier",specifier:specifier,precision:precision,substitutionIndex:substitutionIndex});}
var index=0;for(var precentIndex=format.indexOf("%",index);precentIndex!==-1;precentIndex=format.indexOf("%",index)){if(format.length===index)
break;addStringToken(format.substring(index,precentIndex));index=precentIndex+1;if(format[index]==="%"){addStringToken("%");++index;continue;}
if(String.isDigitAt(format,index)){var number=parseInt(format.substring(index),10);while(String.isDigitAt(format,index))
++index;if(number>0&&format[index]==="$"){substitutionIndex=(number-1);++index;}}
var precision=-1;if(format[index]==="."){++index;precision=parseInt(format.substring(index),10);if(isNaN(precision))
precision=0;while(String.isDigitAt(format,index))
++index;}
if(!(format[index]in formatters)){addStringToken(format.substring(precentIndex,index+1));++index;continue;}
addSpecifierToken(format[index],precision,substitutionIndex);++substitutionIndex;++index;}
addStringToken(format.substring(index));return tokens;}
String.standardFormatters={d:function(substitution)
{return!isNaN(substitution)?substitution:0;},f:function(substitution,token)
{if(substitution&&token.precision>-1)
substitution=substitution.toFixed(token.precision);return!isNaN(substitution)?substitution:(token.precision>-1?Number(0).toFixed(token.precision):0);},s:function(substitution)
{return substitution;}}
String.vsprintf=function(format,substitutions)
{return String.format(format,substitutions,String.standardFormatters,"",function(a,b){return a+b;}).formattedResult;}
String.format=function(format,substitutions,formatters,initialValue,append,tokenizedFormat)
{if(!format||!substitutions||!substitutions.length)
return{formattedResult:append(initialValue,format),unusedSubstitutions:substitutions};function prettyFunctionName()
{return"String.format(\""+format+"\", \""+Array.prototype.join.call(substitutions,"\", \"")+"\")";}
function warn(msg)
{console.warn(prettyFunctionName()+": "+msg);}
function error(msg)
{console.error(prettyFunctionName()+": "+msg);}
var result=initialValue;var tokens=tokenizedFormat||String.tokenizeFormatString(format,formatters);var usedSubstitutionIndexes={};for(var i=0;i<tokens.length;++i){var token=tokens[i];if(token.type==="string"){result=append(result,token.value);continue;}
if(token.type!=="specifier"){error("Unknown token type \""+token.type+"\" found.");continue;}
if(token.substitutionIndex>=substitutions.length){error("not enough substitution arguments. Had "+substitutions.length+" but needed "+(token.substitutionIndex+1)+", so substitution was skipped.");result=append(result,"%"+(token.precision>-1?token.precision:"")+token.specifier);continue;}
usedSubstitutionIndexes[token.substitutionIndex]=true;if(!(token.specifier in formatters)){warn("unsupported format character \u201C"+token.specifier+"\u201D. Treating as a string.");result=append(result,substitutions[token.substitutionIndex]);continue;}
result=append(result,formatters[token.specifier](substitutions[token.substitutionIndex],token));}
var unusedSubstitutions=[];for(var i=0;i<substitutions.length;++i){if(i in usedSubstitutionIndexes)
continue;unusedSubstitutions.push(substitutions[i]);}
return{formattedResult:result,unusedSubstitutions:unusedSubstitutions};}
function createSearchRegex(query,caseSensitive,isRegex)
{var regexFlags=caseSensitive?"g":"gi";var regexObject;if(isRegex){try{regexObject=new RegExp(query,regexFlags);}catch(e){}}
if(!regexObject)
regexObject=createPlainTextSearchRegex(query,regexFlags);return regexObject;}
function createPlainTextSearchRegex(query,flags)
{var regexSpecialCharacters=String.regexSpecialCharacters();var regex="";for(var i=0;i<query.length;++i){var c=query.charAt(i);if(regexSpecialCharacters.indexOf(c)!=-1)
regex+="\\";regex+=c;}
return new RegExp(regex,flags||"");}
function countRegexMatches(regex,content)
{var text=content;var result=0;var match;while(text&&(match=regex.exec(text))){if(match[0].length>0)
++result;text=text.substring(match.index+1);}
return result;}
function spacesPadding(spacesCount)
{return"\u00a0".repeat(spacesCount);}
function numberToStringWithSpacesPadding(value,symbolsCount)
{var numberString=value.toString();var paddingLength=Math.max(0,symbolsCount-numberString.length);return spacesPadding(paddingLength)+numberString;}
Array.from=function(iterator)
{var values=[];for(var iteratorValue=iterator.next();!iteratorValue.done;iteratorValue=iterator.next())
values.push(iteratorValue.value);return values;}
Set.prototype.valuesArray=function()
{return Array.from(this.values());}
Map.prototype.remove=function(key)
{var value=this.get(key);this.delete(key);return value;}
Map.prototype.valuesArray=function()
{return Array.from(this.values());}
Map.prototype.keysArray=function()
{return Array.from(this.keys());}
var Multimap=function()
{this._map=new Map();}
Multimap.prototype={set:function(key,value)
{var set=this._map.get(key);if(!set){set=new Set();this._map.set(key,set);}
set.add(value);},get:function(key)
{var result=this._map.get(key);if(!result)
result=new Set();return result;},remove:function(key,value)
{var values=this.get(key);values.delete(value);if(!values.size)
this._map.delete(key);},removeAll:function(key)
{this._map.delete(key);},keysArray:function()
{return this._map.keysArray();},valuesArray:function()
{var result=[];var keys=this.keysArray();for(var i=0;i<keys.length;++i)
result.pushAll(this.get(keys[i]).valuesArray());return result;},clear:function()
{this._map.clear();}}
function loadXHR(url)
{return new Promise(load);function load(successCallback,failureCallback)
{function onReadyStateChanged()
{if(xhr.readyState!==XMLHttpRequest.DONE)
return;if(xhr.status!==200){xhr.onreadystatechange=null;failureCallback(new Error(xhr.status));return;}
xhr.onreadystatechange=null;successCallback(xhr.responseText);}
var xhr=new XMLHttpRequest();xhr.withCredentials=false;xhr.open("GET",url,true);xhr.onreadystatechange=onReadyStateChanged;xhr.send(null);}}
function CallbackBarrier()
{this._pendingIncomingCallbacksCount=0;}
CallbackBarrier.prototype={createCallback:function(userCallback)
{console.assert(!this._outgoingCallback,"CallbackBarrier.createCallback() is called after CallbackBarrier.callWhenDone()");++this._pendingIncomingCallbacksCount;return this._incomingCallback.bind(this,userCallback);},callWhenDone:function(callback)
{console.assert(!this._outgoingCallback,"CallbackBarrier.callWhenDone() is called multiple times");this._outgoingCallback=callback;if(!this._pendingIncomingCallbacksCount)
this._outgoingCallback();},_incomingCallback:function(userCallback)
{console.assert(this._pendingIncomingCallbacksCount>0);if(userCallback){var args=Array.prototype.slice.call(arguments,1);userCallback.apply(null,args);}
if(!--this._pendingIncomingCallbacksCount&&this._outgoingCallback)
this._outgoingCallback();}}
function suppressUnused(value)
{}
self.setImmediate=function(callback)
{Promise.resolve().then(callback);return 0;}
Promise.prototype.spread=function(callback)
{return this.then(spreadPromise);function spreadPromise(arg)
{return callback.apply(null,arg);}};Node.prototype.rangeOfWord=function(offset,stopCharacters,stayWithinNode,direction)
{var startNode;var startOffset=0;var endNode;var endOffset=0;if(!stayWithinNode)
stayWithinNode=this;if(!direction||direction==="backward"||direction==="both"){var node=this;while(node){if(node===stayWithinNode){if(!startNode)
startNode=stayWithinNode;break;}
if(node.nodeType===Node.TEXT_NODE){var start=(node===this?(offset-1):(node.nodeValue.length-1));for(var i=start;i>=0;--i){if(stopCharacters.indexOf(node.nodeValue[i])!==-1){startNode=node;startOffset=i+1;break;}}}
if(startNode)
break;node=node.traversePreviousNode(stayWithinNode);}
if(!startNode){startNode=stayWithinNode;startOffset=0;}}else{startNode=this;startOffset=offset;}
if(!direction||direction==="forward"||direction==="both"){node=this;while(node){if(node===stayWithinNode){if(!endNode)
endNode=stayWithinNode;break;}
if(node.nodeType===Node.TEXT_NODE){var start=(node===this?offset:0);for(var i=start;i<node.nodeValue.length;++i){if(stopCharacters.indexOf(node.nodeValue[i])!==-1){endNode=node;endOffset=i;break;}}}
if(endNode)
break;node=node.traverseNextNode(stayWithinNode);}
if(!endNode){endNode=stayWithinNode;endOffset=stayWithinNode.nodeType===Node.TEXT_NODE?stayWithinNode.nodeValue.length:stayWithinNode.childNodes.length;}}else{endNode=this;endOffset=offset;}
var result=this.ownerDocument.createRange();result.setStart(startNode,startOffset);result.setEnd(endNode,endOffset);return result;}
Node.prototype.traverseNextTextNode=function(stayWithin)
{var node=this.traverseNextNode(stayWithin);if(!node)
return null;var nonTextTags={"STYLE":1,"SCRIPT":1};while(node&&(node.nodeType!==Node.TEXT_NODE||nonTextTags[node.parentElement.nodeName]))
node=node.traverseNextNode(stayWithin);return node;}
Element.prototype.positionAt=function(x,y,relativeTo)
{var shift={x:0,y:0};if(relativeTo)
shift=relativeTo.boxInWindow(this.ownerDocument.defaultView);if(typeof x==="number")
this.style.setProperty("left",(shift.x+x)+"px");else
this.style.removeProperty("left");if(typeof y==="number")
this.style.setProperty("top",(shift.y+y)+"px");else
this.style.removeProperty("top");}
Element.prototype.isScrolledToBottom=function()
{return Math.abs(this.scrollTop+this.clientHeight-this.scrollHeight)<=1;}
function removeSubsequentNodes(fromNode,toNode)
{for(var node=fromNode;node&&node!==toNode;){var nodeToRemove=node;node=node.nextSibling;nodeToRemove.remove();}}
Element.prototype.containsEventPoint=function(event)
{var box=this.getBoundingClientRect();return box.left<event.x&&event.x<box.right&&box.top<event.y&&event.y<box.bottom;}
Node.prototype.enclosingNodeOrSelfWithNodeNameInArray=function(nameArray)
{for(var node=this;node&&node!==this.ownerDocument;node=node.parentNodeOrShadowHost()){for(var i=0;i<nameArray.length;++i){if(node.nodeName.toLowerCase()===nameArray[i].toLowerCase())
return node;}}
return null;}
Node.prototype.enclosingNodeOrSelfWithNodeName=function(nodeName)
{return this.enclosingNodeOrSelfWithNodeNameInArray([nodeName]);}
Node.prototype.enclosingNodeOrSelfWithClass=function(className,stayWithin)
{return this.enclosingNodeOrSelfWithClassList([className],stayWithin);}
Node.prototype.enclosingNodeOrSelfWithClassList=function(classNames,stayWithin)
{for(var node=this;node&&node!==stayWithin&&node!==this.ownerDocument;node=node.parentNodeOrShadowHost()){if(node.nodeType===Node.ELEMENT_NODE){var containsAll=true;for(var i=0;i<classNames.length&&containsAll;++i){if(!node.classList.contains(classNames[i]))
containsAll=false;}
if(containsAll)
return(node);}}
return null;}
Node.prototype.parentElementOrShadowHost=function()
{var node=this.parentNode;if(!node)
return null;if(node.nodeType===Node.ELEMENT_NODE)
return(node);if(node.nodeType===Node.DOCUMENT_FRAGMENT_NODE)
return(node.host);return null;}
Node.prototype.parentNodeOrShadowHost=function()
{return this.parentNode||this.host||null;}
Node.prototype.getComponentSelection=function()
{var parent=this.parentNode;while(parent&&parent.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)
parent=parent.parentNode;return parent instanceof ShadowRoot?parent.getSelection():this.window().getSelection();}
Node.prototype.isComponentSelectionCollapsed=function()
{var selection=this.getComponentSelection();return selection&&selection.rangeCount?selection.getRangeAt(0).collapsed:true;}
Node.prototype.getDeepSelection=function()
{var activeElement=this.ownerDocument.activeElement;var shadowRoot=null;while(activeElement&&activeElement.shadowRoot){shadowRoot=activeElement.shadowRoot;activeElement=shadowRoot.activeElement;}
return shadowRoot?shadowRoot.getSelection():this.window().getSelection();}
Node.prototype.window=function()
{return this.ownerDocument.defaultView;}
Element.prototype.query=function(query)
{return this.ownerDocument.evaluate(query,this,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;}
Element.prototype.removeChildren=function()
{if(this.firstChild)
this.textContent="";}
Element.prototype.isInsertionCaretInside=function()
{var selection=this.getComponentSelection();if(!selection.rangeCount||!selection.isCollapsed)
return false;var selectionRange=selection.getRangeAt(0);return selectionRange.startContainer.isSelfOrDescendant(this);}
function createElement(tagName,customElementType)
{return document.createElement(tagName,customElementType||"");}
function createEvent(type,bubbles,cancelable)
{var event=document.createEvent("Event");event.initEvent(type,bubbles,cancelable);return event;}
function createTextNode(data)
{return document.createTextNode(data);}
Document.prototype.createElementWithClass=function(elementName,className,customElementType)
{var element=this.createElement(elementName,customElementType||"");if(className)
element.className=className;return element;}
function createElementWithClass(elementName,className,customElementType)
{return document.createElementWithClass(elementName,className,customElementType);}
Document.prototype.createSVGElement=function(childType,className)
{var element=this.createElementNS("http://www.w3.org/2000/svg",childType);if(className)
element.setAttribute("class",className);return element;}
function createSVGElement(childType,className)
{return document.createSVGElement(childType,className);}
function createDocumentFragment()
{return document.createDocumentFragment();}
Element.prototype.createChild=function(elementName,className,customElementType)
{var element=this.ownerDocument.createElementWithClass(elementName,className,customElementType);this.appendChild(element);return element;}
DocumentFragment.prototype.createChild=Element.prototype.createChild;Element.prototype.createTextChild=function(text)
{var element=this.ownerDocument.createTextNode(text);this.appendChild(element);return element;}
DocumentFragment.prototype.createTextChild=Element.prototype.createTextChild;Element.prototype.createTextChildren=function(var_args)
{for(var i=0,n=arguments.length;i<n;++i)
this.createTextChild(arguments[i]);}
DocumentFragment.prototype.createTextChildren=Element.prototype.createTextChildren;Element.prototype.appendChildren=function(var_args)
{for(var i=0,n=arguments.length;i<n;++i)
this.appendChild(arguments[i]);}
Element.prototype.totalOffsetLeft=function()
{return this.totalOffset().left;}
Element.prototype.totalOffsetTop=function()
{return this.totalOffset().top;}
Element.prototype.totalOffset=function()
{var rect=this.getBoundingClientRect();return{left:rect.left,top:rect.top};}
Element.prototype.scrollOffset=function()
{var curLeft=0;var curTop=0;for(var element=this;element;element=element.scrollParent){curLeft+=element.scrollLeft;curTop+=element.scrollTop;}
return{left:curLeft,top:curTop};}
Element.prototype.createSVGChild=function(childType,className)
{var child=this.ownerDocument.createSVGElement(childType,className);this.appendChild(child);return child;}
function AnchorBox(x,y,width,height)
{this.x=x||0;this.y=y||0;this.width=width||0;this.height=height||0;}
AnchorBox.prototype.relativeTo=function(box)
{return new AnchorBox(this.x-box.x,this.y-box.y,this.width,this.height);}
AnchorBox.prototype.relativeToElement=function(element)
{return this.relativeTo(element.boxInWindow(element.ownerDocument.defaultView));}
AnchorBox.prototype.equals=function(anchorBox)
{return!!anchorBox&&this.x===anchorBox.x&&this.y===anchorBox.y&&this.width===anchorBox.width&&this.height===anchorBox.height;}
Element.prototype.offsetRelativeToWindow=function(targetWindow)
{var elementOffset=new AnchorBox();var curElement=this;var curWindow=this.ownerDocument.defaultView;while(curWindow&&curElement){elementOffset.x+=curElement.totalOffsetLeft();elementOffset.y+=curElement.totalOffsetTop();if(curWindow===targetWindow)
break;curElement=curWindow.frameElement;curWindow=curWindow.parent;}
return elementOffset;}
Element.prototype.boxInWindow=function(targetWindow)
{targetWindow=targetWindow||this.ownerDocument.defaultView;var anchorBox=this.offsetRelativeToWindow(window);anchorBox.width=Math.min(this.offsetWidth,window.innerWidth-anchorBox.x);anchorBox.height=Math.min(this.offsetHeight,window.innerHeight-anchorBox.y);return anchorBox;}
Element.prototype.setTextAndTitle=function(text)
{this.textContent=text;this.title=text;}
KeyboardEvent.prototype.__defineGetter__("data",function()
{switch(this.type){case"keypress":if(!this.ctrlKey&&!this.metaKey)
return String.fromCharCode(this.charCode);else
return"";case"keydown":case"keyup":if(!this.ctrlKey&&!this.metaKey&&!this.altKey)
return String.fromCharCode(this.which);else
return"";}});Event.prototype.consume=function(preventDefault)
{this.stopImmediatePropagation();if(preventDefault)
this.preventDefault();this.handled=true;}
Text.prototype.select=function(start,end)
{start=start||0;end=end||this.textContent.length;if(start<0)
start=end+start;var selection=this.getComponentSelection();selection.removeAllRanges();var range=this.ownerDocument.createRange();range.setStart(this,start);range.setEnd(this,end);selection.addRange(range);return this;}
Element.prototype.selectionLeftOffset=function()
{var selection=this.getComponentSelection();if(!selection.containsNode(this,true))
return null;var leftOffset=selection.anchorOffset;var node=selection.anchorNode;while(node!==this){while(node.previousSibling){node=node.previousSibling;leftOffset+=node.textContent.length;}
node=node.parentNodeOrShadowHost();}
return leftOffset;}
Node.prototype.deepTextContent=function()
{return this.childTextNodes().map(function(node){return node.textContent;}).join("");}
Node.prototype.childTextNodes=function()
{var node=this.traverseNextTextNode(this);var result=[];var nonTextTags={"STYLE":1,"SCRIPT":1};while(node){if(!nonTextTags[node.parentElement.nodeName])
result.push(node);node=node.traverseNextTextNode(this);}
return result;}
Node.prototype.isAncestor=function(node)
{if(!node)
return false;var currentNode=node.parentNodeOrShadowHost();while(currentNode){if(this===currentNode)
return true;currentNode=currentNode.parentNodeOrShadowHost();}
return false;}
Node.prototype.isDescendant=function(descendant)
{return!!descendant&&descendant.isAncestor(this);}
Node.prototype.isSelfOrAncestor=function(node)
{return!!node&&(node===this||this.isAncestor(node));}
Node.prototype.isSelfOrDescendant=function(node)
{return!!node&&(node===this||this.isDescendant(node));}
Node.prototype.traverseNextNode=function(stayWithin)
{if(this.shadowRoot)
return this.shadowRoot;var distributedNodes=this.getDistributedNodes?this.getDistributedNodes():[];if(distributedNodes.length)
return distributedNodes[0];if(this.firstChild)
return this.firstChild;var node=this;while(node){if(stayWithin&&node===stayWithin)
return null;var sibling=nextSibling(node);if(sibling)
return sibling;node=insertionPoint(node)||node.parentNodeOrShadowHost();}
function nextSibling(node)
{var parent=insertionPoint(node);if(!parent)
return node.nextSibling;var distributedNodes=parent.getDistributedNodes?parent.getDistributedNodes():[];var position=Array.prototype.indexOf.call(distributedNodes,node);if(position+1<distributedNodes.length)
return distributedNodes[position+1];return null;}
function insertionPoint(node)
{var insertionPoints=node.getDestinationInsertionPoints?node.getDestinationInsertionPoints():[];return insertionPoints.length>0?insertionPoints[insertionPoints.length-1]:null;}
return null;}
Node.prototype.traversePreviousNode=function(stayWithin)
{if(stayWithin&&this===stayWithin)
return null;var node=this.previousSibling;while(node&&node.lastChild)
node=node.lastChild;if(node)
return node;return this.parentNodeOrShadowHost();}
Node.prototype.setTextContentTruncatedIfNeeded=function(text,placeholder)
{const maxTextContentLength=10000;if(typeof text==="string"&&text.length>maxTextContentLength){this.textContent=typeof placeholder==="string"?placeholder:text.trimMiddle(maxTextContentLength);return true;}
this.textContent=text;return false;}
Event.prototype.deepElementFromPoint=function()
{var node=this.target;while(node&&node.nodeType!==Node.DOCUMENT_FRAGMENT_NODE&&node.nodeType!==Node.DOCUMENT_NODE)
node=node.parentNode;if(!node)
return null;node=node.elementFromPoint(this.pageX,this.pageY);while(node&&node.shadowRoot)
node=node.shadowRoot.elementFromPoint(this.pageX,this.pageY);return node;}
Event.prototype.deepActiveElement=function()
{var activeElement=this.target&&this.target.ownerDocument?this.target.ownerDocument.activeElement:null;while(activeElement&&activeElement.shadowRoot)
activeElement=activeElement.shadowRoot.activeElement;return activeElement;}
Document.prototype.deepElementFromPoint=function(x,y)
{var node=this.elementFromPoint(x,y);while(node&&node.shadowRoot)
node=node.shadowRoot.elementFromPoint(x,y);return node;}
function isEnterKey(event)
{return event.keyCode!==229&&event.keyIdentifier==="Enter";}
function isEscKey(event)
{return event.keyCode===27;}
function consumeEvent(e)
{e.consume();}
function runOnWindowLoad(callback)
{function windowLoaded()
{window.removeEventListener("DOMContentLoaded",windowLoaded,false);callback();}
if(document.readyState==="complete"||document.readyState==="interactive")
callback();else
window.addEventListener("DOMContentLoaded",windowLoaded,false);};var WorkerRuntime={};WorkerRuntime.startSharedWorker=function(moduleName,workerName)
{if(Runtime.isReleaseMode()){try{var worker=new SharedWorker(moduleName+"_module.js",workerName);return Promise.resolve(worker);}catch(e){return Promise.reject(e);}}
return loadResourcePromise(moduleName+"/module.json").then(start,start.bind(null,undefined));function start(content)
{if(!content)
throw new Error("Worker is not defined: "+moduleName+" "+new Error().stack);var scripts=JSON.parse(content)["scripts"];if(scripts.length!==1)
throw new Error("WorkerRuntime.startSharedWorker supports modules with only one script!");return new SharedWorker(moduleName+"/"+scripts[0],workerName);}}
WorkerRuntime.startWorker=function(moduleName)
{if(Runtime.isReleaseMode())
return Promise.resolve(new Worker(moduleName+"_module.js"));var loader=function(){self.onmessage=function(event){self.onmessage=null;var scripts=event.data;for(var i=0;i<scripts.length;++i){var source=scripts[i]["source"];self.eval(source+"\n//# sourceURL="+scripts[i]["url"]);}};};return loadResourcePromise(moduleName+"/module.json").then(start,start.bind(null,undefined));function start(content)
{if(!content)
throw new Error("Worker is not defined: "+moduleName+" "+new Error().stack);var message=[];var scripts=JSON.parse(content)["scripts"];var promise=Promise.resolve();for(var i=0;i<scripts.length;++i){var url=self._importScriptPathPrefix+moduleName+"/"+scripts[i];var parts=url.split("://");url=parts.length===1?url:parts[0]+"://"+normalizePath(parts[1]);promise=promise.then(promiseGetter(loadResourcePromise(moduleName+"/"+scripts[i]))).then(pushSource.bind(null,url),pushSource.bind(null,null,null));}
return promise.then(createWorker);function promiseGetter(promise)
{return function(){return promise;};}
function pushSource(url,source)
{if(!url){console.error("Failed to load "+url);return;}
message.push({source:source,url:url});}
function createWorker()
{var blob=new Blob(["("+loader.toString()+")()\n//# sourceURL="+moduleName],{type:"text/javascript"});var workerURL=window.URL.createObjectURL(blob);try{var worker=new Worker(workerURL);worker.postMessage(message);return worker;}finally{window.URL.revokeObjectURL(workerURL);}}}}
WorkerRuntime.Worker=function(moduleName,workerName)
{this._workerPromise=workerName?WorkerRuntime.startSharedWorker(moduleName,(workerName)):WorkerRuntime.startWorker(moduleName);}
WorkerRuntime.Worker.prototype={postMessage:function(message)
{this._workerPromise.then(postToWorker.bind(this));function postToWorker(worker)
{if(!this._disposed)
worker.postMessage(message);}},dispose:function()
{this._disposed=true;this._workerPromise.then(terminate);function terminate(worker)
{worker.terminate();}},terminate:function()
{this.dispose();},set onmessage(listener)
{this._workerPromise.then(setOnMessage);function setOnMessage(worker)
{worker.onmessage=listener;}},set onerror(listener)
{this._workerPromise.then(setOnError);function setOnError(worker)
{worker.onerror=listener;}},get port()
{return new WorkerRuntime.Worker.FuturePort(this);}}
WorkerRuntime.Worker.FuturePort=function(worker)
{this._worker=worker;}
WorkerRuntime.Worker.FuturePort.prototype={set onmessage(listener)
{this._worker._workerPromise.then(setOnMessage);function setOnMessage(worker)
{worker.port.onmessage=listener;}},set onerror(listener)
{this._worker._workerPromise.then(setOnError);function setOnError(worker)
{worker.port.onerror=listener;}}};self.WebInspector={};WebInspector.TextDictionary=function()
{this._words={};}
WebInspector.TextDictionary.prototype={addWord:function(word)
{if(!this._words[word])
this._words[word]=1;else
++this._words[word];},removeWord:function(word)
{if(!this._words[word])
return;if(this._words[word]===1)
delete this._words[word];else
--this._words[word];},wordsWithPrefix:function(prefix)
{var words=[];for(var i in this._words){if(i.startsWith(prefix))
words.push(i);}
return words;},hasWord:function(word)
{return!!this._words[word];},wordCount:function(word)
{return this._words[word]?this._words[word]:0;},reset:function()
{this._words={};}};WebInspector.Object=function(){}
WebInspector.Object.prototype={addEventListener:function(eventType,listener,thisObject)
{if(!listener)
console.assert(false);if(!this._listeners)
this._listeners=new Map();if(!this._listeners.has(eventType))
this._listeners.set(eventType,[]);this._listeners.get(eventType).push({thisObject:thisObject,listener:listener});},removeEventListener:function(eventType,listener,thisObject)
{console.assert(listener);if(!this._listeners||!this._listeners.has(eventType))
return;var listeners=this._listeners.get(eventType);for(var i=0;i<listeners.length;++i){if(listeners[i].listener===listener&&listeners[i].thisObject===thisObject)
listeners.splice(i--,1);}
if(!listeners.length)
this._listeners.delete(eventType);},removeAllListeners:function()
{delete this._listeners;},hasEventListeners:function(eventType)
{if(!this._listeners||!this._listeners.has(eventType))
return false;return true;},dispatchEventToListeners:function(eventType,eventData)
{if(!this._listeners||!this._listeners.has(eventType))
return false;var event=new WebInspector.Event(this,eventType,eventData);var listeners=this._listeners.get(eventType).slice(0);for(var i=0;i<listeners.length;++i){listeners[i].listener.call(listeners[i].thisObject,event);if(event._stoppedPropagation)
break;}
return event.defaultPrevented;}}
WebInspector.Event=function(target,type,data)
{this.target=target;this.type=type;this.data=data;this.defaultPrevented=false;this._stoppedPropagation=false;}
WebInspector.Event.prototype={stopPropagation:function()
{this._stoppedPropagation=true;},preventDefault:function()
{this.defaultPrevented=true;},consume:function(preventDefault)
{this.stopPropagation();if(preventDefault)
this.preventDefault();}}
WebInspector.EventTarget=function()
{}
WebInspector.EventTarget.prototype={addEventListener:function(eventType,listener,thisObject){},removeEventListener:function(eventType,listener,thisObject){},removeAllListeners:function(){},hasEventListeners:function(eventType){},dispatchEventToListeners:function(eventType,eventData){},};WebInspector.NotificationService=function(){}
WebInspector.NotificationService.prototype={__proto__:WebInspector.Object.prototype}
WebInspector.NotificationService.Events={InspectorAgentEnabledForTests:"InspectorAgentEnabledForTests",SelectedNodeChanged:"SelectedNodeChanged"}
WebInspector.notifications=new WebInspector.NotificationService();;WebInspector.Color=function(rgba,format,originalText)
{this._rgba=rgba;this._originalText=originalText||null;this._format=format;if(typeof this._rgba[3]==="undefined")
this._rgba[3]=1;for(var i=0;i<4;++i){if(this._rgba[i]<0)
this._rgba[i]=0;if(this._rgba[i]>1)
this._rgba[i]=1;}}
WebInspector.Color.Format={Original:"original",Nickname:"nickname",HEX:"hex",ShortHEX:"shorthex",RGB:"rgb",RGBA:"rgba",HSL:"hsl",HSLA:"hsla"}
WebInspector.Color.parse=function(text)
{var value=text.toLowerCase().replace(/\s+/g,"");var simple=/^(?:#([0-9a-f]{3}|[0-9a-f]{6})|rgb\(((?:-?\d+%?,){2}-?\d+%?)\)|(\w+)|hsl\((-?\d+\.?\d*(?:,-?\d+\.?\d*%){2})\))$/i;var match=value.match(simple);if(match){if(match[1]){var hex=match[1].toUpperCase();var format;if(hex.length===3){format=WebInspector.Color.Format.ShortHEX;hex=hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);}else
format=WebInspector.Color.Format.HEX;var r=parseInt(hex.substring(0,2),16);var g=parseInt(hex.substring(2,4),16);var b=parseInt(hex.substring(4,6),16);return new WebInspector.Color([r/255,g/255,b/255,1],format,text);}
if(match[2]){var rgbString=match[2].split(/\s*,\s*/);var rgba=[WebInspector.Color._parseRgbNumeric(rgbString[0]),WebInspector.Color._parseRgbNumeric(rgbString[1]),WebInspector.Color._parseRgbNumeric(rgbString[2]),1];return new WebInspector.Color(rgba,WebInspector.Color.Format.RGB,text);}
if(match[3]){var nickname=match[3].toLowerCase();if(nickname in WebInspector.Color.Nicknames){var rgba=WebInspector.Color.Nicknames[nickname];var color=WebInspector.Color.fromRGBA(rgba);color._format=WebInspector.Color.Format.Nickname;color._originalText=text;return color;}
return null;}
if(match[4]){var hslString=match[4].replace(/%/g,"").split(/\s*,\s*/);var hsla=[WebInspector.Color._parseHueNumeric(hslString[0]),WebInspector.Color._parseSatLightNumeric(hslString[1]),WebInspector.Color._parseSatLightNumeric(hslString[2]),1];var rgba=WebInspector.Color._hsl2rgb(hsla);return new WebInspector.Color(rgba,WebInspector.Color.Format.HSL,text);}
return null;}
var advanced=/^(?:rgba\(((?:-?\d+%?,){3}-?\d+(?:\.\d+)?)\)|hsla\((-?\d+\.?\d*(?:,-?\d+\.?\d*%){2},-?\d+(?:\.\d+)?)\))$/;match=value.match(advanced);if(match){if(match[1]){var rgbaString=match[1].split(/\s*,\s*/);var rgba=[WebInspector.Color._parseRgbNumeric(rgbaString[0]),WebInspector.Color._parseRgbNumeric(rgbaString[1]),WebInspector.Color._parseRgbNumeric(rgbaString[2]),WebInspector.Color._parseAlphaNumeric(rgbaString[3])];return new WebInspector.Color(rgba,WebInspector.Color.Format.RGBA,text);}
if(match[2]){var hslaString=match[2].replace(/%/g,"").split(/\s*,\s*/);var hsla=[WebInspector.Color._parseHueNumeric(hslaString[0]),WebInspector.Color._parseSatLightNumeric(hslaString[1]),WebInspector.Color._parseSatLightNumeric(hslaString[2]),WebInspector.Color._parseAlphaNumeric(hslaString[3])];var rgba=WebInspector.Color._hsl2rgb(hsla);return new WebInspector.Color(rgba,WebInspector.Color.Format.HSLA,text);}}
return null;}
WebInspector.Color.fromRGBA=function(rgba)
{return new WebInspector.Color([rgba[0]/255,rgba[1]/255,rgba[2]/255,rgba[3]],WebInspector.Color.Format.RGBA);}
WebInspector.Color.fromHSVA=function(hsva)
{var h=hsva[0];var s=hsva[1];var v=hsva[2];var t=(2-s)*v;if(v===0||s===0)
s=0;else
s*=v/(t<1?t:2-t);var hsla=[h,s,t/2,hsva[3]];return new WebInspector.Color(WebInspector.Color._hsl2rgb(hsla),WebInspector.Color.Format.HSLA);}
WebInspector.Color.prototype={format:function()
{return this._format;},hsla:function()
{if(this._hsla)
return this._hsla;var r=this._rgba[0];var g=this._rgba[1];var b=this._rgba[2];var max=Math.max(r,g,b);var min=Math.min(r,g,b);var diff=max-min;var add=max+min;if(min===max)
var h=0;else if(r===max)
var h=((1/6*(g-b)/diff)+1)%1;else if(g===max)
var h=(1/6*(b-r)/diff)+1/3;else
var h=(1/6*(r-g)/diff)+2/3;var l=0.5*add;if(l===0)
var s=0;else if(l===1)
var s=1;else if(l<=0.5)
var s=diff/add;else
var s=diff/(2-add);this._hsla=[h,s,l,this._rgba[3]];return this._hsla;},canonicalHSLA:function()
{var hsla=this.hsla();return[Math.round(hsla[0]*360),Math.round(hsla[1]*100),Math.round(hsla[2]*100),hsla[3]];},hsva:function()
{var hsla=this.hsla();var h=hsla[0];var s=hsla[1];var l=hsla[2];s*=l<0.5?l:1-l;return[h,s!==0?2*s/(l+s):0,(l+s),hsla[3]];},hasAlpha:function()
{return this._rgba[3]!==1;},canBeShortHex:function()
{if(this.hasAlpha())
return false;for(var i=0;i<3;++i){var c=Math.round(this._rgba[i]*255);if(c%17)
return false;}
return true;},asString:function(format)
{if(!format)
format=this._format;function toRgbValue(value)
{return Math.round(value*255);}
function toHexValue(value)
{var hex=Math.round(value*255).toString(16);return hex.length===1?"0"+hex:hex;}
function toShortHexValue(value)
{return(Math.round(value*255)/17).toString(16);}
switch(format){case WebInspector.Color.Format.Original:return this._originalText;case WebInspector.Color.Format.RGB:if(this.hasAlpha())
return null;return String.sprintf("rgb(%d, %d, %d)",toRgbValue(this._rgba[0]),toRgbValue(this._rgba[1]),toRgbValue(this._rgba[2]));case WebInspector.Color.Format.RGBA:return String.sprintf("rgba(%d, %d, %d, %f)",toRgbValue(this._rgba[0]),toRgbValue(this._rgba[1]),toRgbValue(this._rgba[2]),this._rgba[3]);case WebInspector.Color.Format.HSL:if(this.hasAlpha())
return null;var hsl=this.hsla();return String.sprintf("hsl(%d, %d%, %d%)",Math.round(hsl[0]*360),Math.round(hsl[1]*100),Math.round(hsl[2]*100));case WebInspector.Color.Format.HSLA:var hsla=this.hsla();return String.sprintf("hsla(%d, %d%, %d%, %f)",Math.round(hsla[0]*360),Math.round(hsla[1]*100),Math.round(hsla[2]*100),hsla[3]);case WebInspector.Color.Format.HEX:if(this.hasAlpha())
return null;return String.sprintf("#%s%s%s",toHexValue(this._rgba[0]),toHexValue(this._rgba[1]),toHexValue(this._rgba[2])).toUpperCase();case WebInspector.Color.Format.ShortHEX:if(!this.canBeShortHex())
return null;return String.sprintf("#%s%s%s",toShortHexValue(this._rgba[0]),toShortHexValue(this._rgba[1]),toShortHexValue(this._rgba[2])).toUpperCase();case WebInspector.Color.Format.Nickname:return this.nickname();}
return this._originalText;},canonicalRGBA:function()
{var rgba=new Array(4);for(var i=0;i<3;++i)
rgba[i]=Math.round(this._rgba[i]*255);rgba[3]=this._rgba[3];return rgba;},nickname:function()
{if(!WebInspector.Color._rgbaToNickname){WebInspector.Color._rgbaToNickname={};for(var nickname in WebInspector.Color.Nicknames){var rgba=WebInspector.Color.Nicknames[nickname];if(rgba.length!==4)
rgba=rgba.concat(1);WebInspector.Color._rgbaToNickname[rgba]=nickname;}}
return WebInspector.Color._rgbaToNickname[this.canonicalRGBA()]||null;},toProtocolRGBA:function()
{var rgba=this.canonicalRGBA();var result={r:rgba[0],g:rgba[1],b:rgba[2]};if(rgba[3]!==1)
result.a=rgba[3];return result;},invert:function()
{var rgba=[];rgba[0]=1-this._rgba[0];rgba[1]=1-this._rgba[1];rgba[2]=1-this._rgba[2];rgba[3]=this._rgba[3];return new WebInspector.Color(rgba,WebInspector.Color.Format.RGBA);},setAlpha:function(alpha)
{var rgba=this._rgba.slice();rgba[3]=alpha;return new WebInspector.Color(rgba,WebInspector.Color.Format.RGBA);}}
WebInspector.Color._parseRgbNumeric=function(value)
{var parsed=parseInt(value,10);if(value.indexOf("%")!==-1)
parsed/=100;else
parsed/=255;return parsed;}
WebInspector.Color._parseHueNumeric=function(value)
{return isNaN(value)?0:(parseFloat(value)/360)%1;}
WebInspector.Color._parseSatLightNumeric=function(value)
{return Math.min(1,parseFloat(value)/100);}
WebInspector.Color._parseAlphaNumeric=function(value)
{return isNaN(value)?0:parseFloat(value);}
WebInspector.Color._hsl2rgb=function(hsl)
{var h=hsl[0];var s=hsl[1];var l=hsl[2];function hue2rgb(p,q,h)
{if(h<0)
h+=1;else if(h>1)
h-=1;if((h*6)<1)
return p+(q-p)*h*6;else if((h*2)<1)
return q;else if((h*3)<2)
return p+(q-p)*((2/3)-h)*6;else
return p;}
if(s<0)
s=0;if(l<=0.5)
var q=l*(1+s);else
var q=l+s-(l*s);var p=2*l-q;var tr=h+(1/3);var tg=h;var tb=h-(1/3);var r=hue2rgb(p,q,tr);var g=hue2rgb(p,q,tg);var b=hue2rgb(p,q,tb);return[r,g,b,hsl[3]];}
WebInspector.Color.Nicknames={"aliceblue":[240,248,255],"antiquewhite":[250,235,215],"aqua":[0,255,255],"aquamarine":[127,255,212],"azure":[240,255,255],"beige":[245,245,220],"bisque":[255,228,196],"black":[0,0,0],"blanchedalmond":[255,235,205],"blue":[0,0,255],"blueviolet":[138,43,226],"brown":[165,42,42],"burlywood":[222,184,135],"cadetblue":[95,158,160],"chartreuse":[127,255,0],"chocolate":[210,105,30],"coral":[255,127,80],"cornflowerblue":[100,149,237],"cornsilk":[255,248,220],"crimson":[237,20,61],"cyan":[0,255,255],"darkblue":[0,0,139],"darkcyan":[0,139,139],"darkgoldenrod":[184,134,11],"darkgray":[169,169,169],"darkgrey":[169,169,169],"darkgreen":[0,100,0],"darkkhaki":[189,183,107],"darkmagenta":[139,0,139],"darkolivegreen":[85,107,47],"darkorange":[255,140,0],"darkorchid":[153,50,204],"darkred":[139,0,0],"darksalmon":[233,150,122],"darkseagreen":[143,188,143],"darkslateblue":[72,61,139],"darkslategray":[47,79,79],"darkslategrey":[47,79,79],"darkturquoise":[0,206,209],"darkviolet":[148,0,211],"deeppink":[255,20,147],"deepskyblue":[0,191,255],"dimgray":[105,105,105],"dimgrey":[105,105,105],"dodgerblue":[30,144,255],"firebrick":[178,34,34],"floralwhite":[255,250,240],"forestgreen":[34,139,34],"fuchsia":[255,0,255],"gainsboro":[220,220,220],"ghostwhite":[248,248,255],"gold":[255,215,0],"goldenrod":[218,165,32],"gray":[128,128,128],"grey":[128,128,128],"green":[0,128,0],"greenyellow":[173,255,47],"honeydew":[240,255,240],"hotpink":[255,105,180],"indianred":[205,92,92],"indigo":[75,0,130],"ivory":[255,255,240],"khaki":[240,230,140],"lavender":[230,230,250],"lavenderblush":[255,240,245],"lawngreen":[124,252,0],"lemonchiffon":[255,250,205],"lightblue":[173,216,230],"lightcoral":[240,128,128],"lightcyan":[224,255,255],"lightgoldenrodyellow":[250,250,210],"lightgreen":[144,238,144],"lightgray":[211,211,211],"lightgrey":[211,211,211],"lightpink":[255,182,193],"lightsalmon":[255,160,122],"lightseagreen":[32,178,170],"lightskyblue":[135,206,250],"lightslategray":[119,136,153],"lightslategrey":[119,136,153],"lightsteelblue":[176,196,222],"lightyellow":[255,255,224],"lime":[0,255,0],"limegreen":[50,205,50],"linen":[250,240,230],"magenta":[255,0,255],"maroon":[128,0,0],"mediumaquamarine":[102,205,170],"mediumblue":[0,0,205],"mediumorchid":[186,85,211],"mediumpurple":[147,112,219],"mediumseagreen":[60,179,113],"mediumslateblue":[123,104,238],"mediumspringgreen":[0,250,154],"mediumturquoise":[72,209,204],"mediumvioletred":[199,21,133],"midnightblue":[25,25,112],"mintcream":[245,255,250],"mistyrose":[255,228,225],"moccasin":[255,228,181],"navajowhite":[255,222,173],"navy":[0,0,128],"oldlace":[253,245,230],"olive":[128,128,0],"olivedrab":[107,142,35],"orange":[255,165,0],"orangered":[255,69,0],"orchid":[218,112,214],"palegoldenrod":[238,232,170],"palegreen":[152,251,152],"paleturquoise":[175,238,238],"palevioletred":[219,112,147],"papayawhip":[255,239,213],"peachpuff":[255,218,185],"peru":[205,133,63],"pink":[255,192,203],"plum":[221,160,221],"powderblue":[176,224,230],"purple":[128,0,128],"rebeccapurple":[102,51,153],"red":[255,0,0],"rosybrown":[188,143,143],"royalblue":[65,105,225],"saddlebrown":[139,69,19],"salmon":[250,128,114],"sandybrown":[244,164,96],"seagreen":[46,139,87],"seashell":[255,245,238],"sienna":[160,82,45],"silver":[192,192,192],"skyblue":[135,206,235],"slateblue":[106,90,205],"slategray":[112,128,144],"slategrey":[112,128,144],"snow":[255,250,250],"springgreen":[0,255,127],"steelblue":[70,130,180],"tan":[210,180,140],"teal":[0,128,128],"thistle":[216,191,216],"tomato":[255,99,71],"turquoise":[64,224,208],"violet":[238,130,238],"wheat":[245,222,179],"white":[255,255,255],"whitesmoke":[245,245,245],"yellow":[255,255,0],"yellowgreen":[154,205,50],"transparent":[0,0,0,0],};WebInspector.Color.PageHighlight={Content:WebInspector.Color.fromRGBA([111,168,220,.66]),ContentLight:WebInspector.Color.fromRGBA([111,168,220,.5]),ContentOutline:WebInspector.Color.fromRGBA([9,83,148]),Padding:WebInspector.Color.fromRGBA([147,196,125,.55]),PaddingLight:WebInspector.Color.fromRGBA([147,196,125,.4]),Border:WebInspector.Color.fromRGBA([255,229,153,.66]),BorderLight:WebInspector.Color.fromRGBA([255,229,153,.5]),Margin:WebInspector.Color.fromRGBA([246,178,107,.66]),MarginLight:WebInspector.Color.fromRGBA([246,178,107,.5]),EventTarget:WebInspector.Color.fromRGBA([255,196,196,.66]),Shape:WebInspector.Color.fromRGBA([96,82,177,0.8]),ShapeMargin:WebInspector.Color.fromRGBA([96,82,127,.6])};WebInspector.Geometry={};WebInspector.Geometry.Rect;WebInspector.Geometry.Insets;WebInspector.Geometry._Eps=1e-5;WebInspector.Geometry.Vector=function(x,y,z)
{this.x=x;this.y=y;this.z=z;}
WebInspector.Geometry.Vector.prototype={length:function()
{return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);},normalize:function()
{var length=this.length();if(length<=WebInspector.Geometry._Eps)
return;this.x/=length;this.y/=length;this.z/=length;}}
WebInspector.Geometry.Point=function(x,y){this.x=x;this.y=y;}
WebInspector.Geometry.Point.prototype={distanceTo:function(p)
{return Math.sqrt(Math.pow(p.x-this.x,2)+Math.pow(p.y-this.y,2));},toString:function()
{return Math.round(this.x*100)/100+", "+Math.round(this.y*100)/100;}}
WebInspector.Geometry.CubicBezier=function(point1,point2)
{this.controlPoints=[point1,point2];}
WebInspector.Geometry.CubicBezier.KeywordValues={"linear":"cubic-bezier(0, 0, 1, 1)","ease":"cubic-bezier(0.25, 0.1, 0.25, 1)","ease-in":"cubic-bezier(0.42, 0, 1, 1)","ease-in-out":"cubic-bezier(0.42, 0, 0.58, 1)","ease-out":"cubic-bezier(0, 0, 0.58, 1)"}
WebInspector.Geometry.CubicBezier.parse=function(text)
{var keywordValues=WebInspector.Geometry.CubicBezier.KeywordValues;var value=text.toLowerCase().replace(/\s+/g,"");if(Object.keys(keywordValues).indexOf(value)!=-1)
return WebInspector.Geometry.CubicBezier.parse(keywordValues[value]);var bezierRegex=/^cubic-bezier\(([^,]+),([^,]+),([^,]+),([^,]+)\)$/;var match=value.match(bezierRegex);if(match){var control1=new WebInspector.Geometry.Point(parseFloat(match[1]),parseFloat(match[2]));var control2=new WebInspector.Geometry.Point(parseFloat(match[3]),parseFloat(match[4]));return new WebInspector.Geometry.CubicBezier(control1,control2);}
return null;}
WebInspector.Geometry.CubicBezier.prototype={evaluateAt:function(t)
{function evaluate(v1,v2,t)
{return 3*(1-t)*(1-t)*t*v1+3*(1-t)*t*t*v2+Math.pow(t,3);}
var x=evaluate(this.controlPoints[0].x,this.controlPoints[1].x,t);var y=evaluate(this.controlPoints[0].y,this.controlPoints[1].y,t);return new WebInspector.Geometry.Point(x,y);},asCSSText:function()
{var raw="cubic-bezier("+this.controlPoints.join(", ")+")";var keywordValues=WebInspector.Geometry.CubicBezier.KeywordValues;for(var keyword in keywordValues){if(raw===keywordValues[keyword])
return keyword;}
return raw;}}
WebInspector.Geometry.EulerAngles=function(alpha,beta,gamma)
{this.alpha=alpha;this.beta=beta;this.gamma=gamma;}
WebInspector.Geometry.EulerAngles.fromRotationMatrix=function(rotationMatrix)
{var beta=Math.atan2(rotationMatrix.m23,rotationMatrix.m33);var gamma=Math.atan2(-rotationMatrix.m13,Math.sqrt(rotationMatrix.m11*rotationMatrix.m11+rotationMatrix.m12*rotationMatrix.m12));var alpha=Math.atan2(rotationMatrix.m12,rotationMatrix.m11);return new WebInspector.Geometry.EulerAngles(WebInspector.Geometry.radToDeg(alpha),WebInspector.Geometry.radToDeg(beta),WebInspector.Geometry.radToDeg(gamma));}
WebInspector.Geometry.scalarProduct=function(u,v)
{return u.x*v.x+u.y*v.y+u.z*v.z;}
WebInspector.Geometry.crossProduct=function(u,v)
{var x=u.y*v.z-u.z*v.y;var y=u.z*v.x-u.x*v.z;var z=u.x*v.y-u.y*v.x;return new WebInspector.Geometry.Vector(x,y,z);}
WebInspector.Geometry.subtract=function(u,v)
{var x=u.x-v.x;var y=u.y-v.y;var z=u.z-v.z;return new WebInspector.Geometry.Vector(x,y,z);}
WebInspector.Geometry.multiplyVectorByMatrixAndNormalize=function(v,m)
{var t=v.x*m.m14+v.y*m.m24+v.z*m.m34+m.m44;var x=(v.x*m.m11+v.y*m.m21+v.z*m.m31+m.m41)/t;var y=(v.x*m.m12+v.y*m.m22+v.z*m.m32+m.m42)/t;var z=(v.x*m.m13+v.y*m.m23+v.z*m.m33+m.m43)/t;return new WebInspector.Geometry.Vector(x,y,z);}
WebInspector.Geometry.calculateAngle=function(u,v)
{var uLength=u.length();var vLength=v.length();if(uLength<=WebInspector.Geometry._Eps||vLength<=WebInspector.Geometry._Eps)
return 0;var cos=WebInspector.Geometry.scalarProduct(u,v)/uLength/vLength;if(Math.abs(cos)>1)
return 0;return WebInspector.Geometry.radToDeg(Math.acos(cos));}
WebInspector.Geometry.radToDeg=function(rad)
{return rad*180/Math.PI;}
WebInspector.Geometry.boundsForTransformedPoints=function(matrix,points,aggregateBounds)
{if(!aggregateBounds)
aggregateBounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};if(points.length%3)
console.assert("Invalid size of points array");for(var p=0;p<points.length;p+=3){var vector=new WebInspector.Geometry.Vector(points[p],points[p+1],points[p+2]);vector=WebInspector.Geometry.multiplyVectorByMatrixAndNormalize(vector,matrix);aggregateBounds.minX=Math.min(aggregateBounds.minX,vector.x);aggregateBounds.maxX=Math.max(aggregateBounds.maxX,vector.x);aggregateBounds.minY=Math.min(aggregateBounds.minY,vector.y);aggregateBounds.maxY=Math.max(aggregateBounds.maxY,vector.y);}
return aggregateBounds;}
function Size(width,height)
{this.width=width;this.height=height;}
Size.prototype.isEqual=function(size)
{return!!size&&this.width===size.width&&this.height===size.height;};Size.prototype.widthToMax=function(size)
{return new Size(Math.max(this.width,(typeof size==="number"?size:size.width)),this.height);};Size.prototype.addWidth=function(size)
{return new Size(this.width+(typeof size==="number"?size:size.width),this.height);};Size.prototype.heightToMax=function(size)
{return new Size(this.width,Math.max(this.height,(typeof size==="number"?size:size.height)));};Size.prototype.addHeight=function(size)
{return new Size(this.width,this.height+(typeof size==="number"?size:size.height));};function Constraints(minimum,preferred)
{this.minimum=minimum||new Size(0,0);this.preferred=preferred||this.minimum;if(this.minimum.width>this.preferred.width||this.minimum.height>this.preferred.height)
throw new Error("Minimum size is greater than preferred.");}
Constraints.prototype.isEqual=function(constraints)
{return!!constraints&&this.minimum.isEqual(constraints.minimum)&&this.preferred.isEqual(constraints.preferred);}
Constraints.prototype.widthToMax=function(value)
{if(typeof value==="number")
return new Constraints(this.minimum.widthToMax(value),this.preferred.widthToMax(value));return new Constraints(this.minimum.widthToMax(value.minimum),this.preferred.widthToMax(value.preferred));}
Constraints.prototype.addWidth=function(value)
{if(typeof value==="number")
return new Constraints(this.minimum.addWidth(value),this.preferred.addWidth(value));return new Constraints(this.minimum.addWidth(value.minimum),this.preferred.addWidth(value.preferred));}
Constraints.prototype.heightToMax=function(value)
{if(typeof value==="number")
return new Constraints(this.minimum.heightToMax(value),this.preferred.heightToMax(value));return new Constraints(this.minimum.heightToMax(value.minimum),this.preferred.heightToMax(value.preferred));}
Constraints.prototype.addHeight=function(value)
{if(typeof value==="number")
return new Constraints(this.minimum.addHeight(value),this.preferred.addHeight(value));return new Constraints(this.minimum.addHeight(value.minimum),this.preferred.addHeight(value.preferred));};WebInspector.Console=function()
{this._messages=[];}
WebInspector.Console.Events={MessageAdded:"messageAdded"}
WebInspector.Console.MessageLevel={Log:"log",Warning:"warning",Error:"error"}
WebInspector.Console.Message=function(text,level,timestamp,show)
{this.text=text;this.level=level;this.timestamp=(typeof timestamp==="number")?timestamp:Date.now();this.show=show;}
WebInspector.Console.UIDelegate=function()
{}
WebInspector.Console.UIDelegate.prototype={showConsole:function(){}}
WebInspector.Console.prototype={setUIDelegate:function(uiDelegate)
{this._uiDelegate=uiDelegate;},addMessage:function(text,level,show)
{var message=new WebInspector.Console.Message(text,level||WebInspector.Console.MessageLevel.Log,Date.now(),show||false);this._messages.push(message);this.dispatchEventToListeners(WebInspector.Console.Events.MessageAdded,message);},log:function(text)
{this.addMessage(text,WebInspector.Console.MessageLevel.Log);},warn:function(text)
{this.addMessage(text,WebInspector.Console.MessageLevel.Warning);},error:function(text)
{this.addMessage(text,WebInspector.Console.MessageLevel.Error,true);},messages:function()
{return this._messages;},show:function()
{this.showPromise();},showPromise:function()
{if(this._uiDelegate)
return this._uiDelegate.showConsole();return Promise.reject();},__proto__:WebInspector.Object.prototype}
WebInspector.console=new WebInspector.Console();;WebInspector.ContentProvider=function(){}
WebInspector.ContentProvider.prototype={contentURL:function(){},contentType:function(){},requestContent:function(callback){},searchInContent:function(query,caseSensitive,isRegex,callback){}}
WebInspector.ContentProvider.SearchMatch=function(lineNumber,lineContent){this.lineNumber=lineNumber;this.lineContent=lineContent;}
WebInspector.ContentProvider.performSearchInContent=function(content,query,caseSensitive,isRegex)
{var regex=createSearchRegex(query,caseSensitive,isRegex);var contentString=new String(content);var result=[];for(var i=0;i<contentString.lineCount();++i){var lineContent=contentString.lineAt(i);regex.lastIndex=0;if(regex.exec(lineContent))
result.push(new WebInspector.ContentProvider.SearchMatch(i,lineContent));}
return result;};WebInspector.ParsedURL=function(url)
{this.isValid=false;this.url=url;this.scheme="";this.host="";this.port="";this.path="";this.queryParams="";this.fragment="";this.folderPathComponents="";this.lastPathComponent="";var match=url.match(/^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^\s\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i);if(match){this.isValid=true;this.scheme=match[1].toLowerCase();this.host=match[2];this.port=match[3];this.path=match[4]||"/";this.fragment=match[5];}else{if(this.url.startsWith("data:")){this.scheme="data";return;}
if(this.url==="about:blank"){this.scheme="about";return;}
this.path=this.url;}
var path=this.path;var indexOfQuery=path.indexOf("?");if(indexOfQuery!==-1){this.queryParams=path.substring(indexOfQuery+1);path=path.substring(0,indexOfQuery);}
var lastSlashIndex=path.lastIndexOf("/");if(lastSlashIndex!==-1){this.folderPathComponents=path.substring(0,lastSlashIndex);this.lastPathComponent=path.substring(lastSlashIndex+1);}else
this.lastPathComponent=path;}
WebInspector.ParsedURL._decodeIfPossible=function(url)
{var decodedURL=url;try{decodedURL=decodeURI(url);}catch(e){}
return decodedURL;}
WebInspector.ParsedURL.splitURLIntoPathComponents=function(url)
{var decodedURL=WebInspector.ParsedURL._decodeIfPossible(url);var parsedURL=new WebInspector.ParsedURL(decodedURL);var origin;var folderPath;var name;if(parsedURL.isValid){origin=parsedURL.scheme+"://"+parsedURL.host;if(parsedURL.port)
origin+=":"+parsedURL.port;folderPath=parsedURL.folderPathComponents;name=parsedURL.lastPathComponent;if(parsedURL.queryParams)
name+="?"+parsedURL.queryParams;}else{origin="";folderPath="";name=url;}
var result=[origin];var splittedPath=folderPath.split("/");for(var i=1;i<splittedPath.length;++i){if(!splittedPath[i])
continue;result.push(splittedPath[i]);}
result.push(name);return result;}
WebInspector.ParsedURL.completeURL=function(baseURL,href)
{if(href){var trimmedHref=href.trim();if(trimmedHref.startsWith("data:")||trimmedHref.startsWith("blob:")||trimmedHref.startsWith("javascript:"))
return href;var parsedHref=trimmedHref.asParsedURL();if(parsedHref&&parsedHref.scheme)
return trimmedHref;}else{return baseURL;}
var parsedURL=baseURL.asParsedURL();if(parsedURL){if(parsedURL.isDataURL())
return href;var path=href;var query=path.indexOf("?");var postfix="";if(query!==-1){postfix=path.substring(query);path=path.substring(0,query);}else{var fragment=path.indexOf("#");if(fragment!==-1){postfix=path.substring(fragment);path=path.substring(0,fragment);}}
if(!path){var basePath=parsedURL.path;if(postfix.charAt(0)==="?"){var baseQuery=parsedURL.path.indexOf("?");if(baseQuery!==-1)
basePath=basePath.substring(0,baseQuery);}
return parsedURL.scheme+"://"+parsedURL.host+(parsedURL.port?(":"+parsedURL.port):"")+basePath+postfix;}else if(path.charAt(0)!=="/"){var prefix=parsedURL.path;var prefixQuery=prefix.indexOf("?");if(prefixQuery!==-1)
prefix=prefix.substring(0,prefixQuery);prefix=prefix.substring(0,prefix.lastIndexOf("/"))+"/";path=prefix+path;}else if(path.length>1&&path.charAt(1)==="/"){return parsedURL.scheme+":"+path+postfix;}
return parsedURL.scheme+"://"+parsedURL.host+(parsedURL.port?(":"+parsedURL.port):"")+normalizePath(path)+postfix;}
return null;}
WebInspector.ParsedURL.prototype={get displayName()
{if(this._displayName)
return this._displayName;if(this.isDataURL())
return this.dataURLDisplayName();if(this.isAboutBlank())
return this.url;this._displayName=this.lastPathComponent;if(!this._displayName)
this._displayName=(this.host||"")+"/";if(this._displayName==="/")
this._displayName=this.url;return this._displayName;},dataURLDisplayName:function()
{if(this._dataURLDisplayName)
return this._dataURLDisplayName;if(!this.isDataURL())
return"";this._dataURLDisplayName=this.url.trimEnd(20);return this._dataURLDisplayName;},isAboutBlank:function()
{return this.url==="about:blank";},isDataURL:function()
{return this.scheme==="data";},lastPathComponentWithFragment:function()
{return this.lastPathComponent+(this.fragment?"#"+this.fragment:"");}}
WebInspector.ParsedURL.splitLineAndColumn=function(string)
{var lineColumnRegEx=/:(\d+)(:(\d+))?$/;var lineColumnMatch=lineColumnRegEx.exec(string);var lineNumber;var columnNumber;if(!lineColumnMatch)
return null;lineNumber=parseInt(lineColumnMatch[1],10);lineNumber=isNaN(lineNumber)?undefined:lineNumber-1;if(typeof(lineColumnMatch[3])==="string"){columnNumber=parseInt(lineColumnMatch[3],10);columnNumber=isNaN(columnNumber)?undefined:columnNumber-1;}
return{url:string.substring(0,string.length-lineColumnMatch[0].length),lineNumber:lineNumber,columnNumber:columnNumber};}
String.prototype.asParsedURL=function()
{var parsedURL=new WebInspector.ParsedURL(this.toString());if(parsedURL.isValid)
return parsedURL;return null;};WebInspector.Progress=function()
{}
WebInspector.Progress.prototype={setTotalWork:function(totalWork){},setTitle:function(title){},setWorked:function(worked,title){},worked:function(worked){},done:function(){},isCanceled:function(){return false;},}
WebInspector.CompositeProgress=function(parent)
{this._parent=parent;this._children=[];this._childrenDone=0;this._parent.setTotalWork(1);this._parent.setWorked(0);}
WebInspector.CompositeProgress.prototype={_childDone:function()
{if(++this._childrenDone!==this._children.length)
return;this._parent.done();},createSubProgress:function(weight)
{var child=new WebInspector.SubProgress(this,weight);this._children.push(child);return child;},_update:function()
{var totalWeights=0;var done=0;for(var i=0;i<this._children.length;++i){var child=this._children[i];if(child._totalWork)
done+=child._weight*child._worked/child._totalWork;totalWeights+=child._weight;}
this._parent.setWorked(done/totalWeights);}}
WebInspector.SubProgress=function(composite,weight)
{this._composite=composite;this._weight=weight||1;this._worked=0;}
WebInspector.SubProgress.prototype={isCanceled:function()
{return this._composite._parent.isCanceled();},setTitle:function(title)
{this._composite._parent.setTitle(title);},done:function()
{this.setWorked(this._totalWork);this._composite._childDone();},setTotalWork:function(totalWork)
{this._totalWork=totalWork;this._composite._update();},setWorked:function(worked,title)
{this._worked=worked;if(typeof title!=="undefined")
this.setTitle(title);this._composite._update();},worked:function(worked)
{this.setWorked(this._worked+(worked||1));}}
WebInspector.ProgressProxy=function(delegate,doneCallback)
{this._delegate=delegate;this._doneCallback=doneCallback;}
WebInspector.ProgressProxy.prototype={isCanceled:function()
{return this._delegate?this._delegate.isCanceled():false;},setTitle:function(title)
{if(this._delegate)
this._delegate.setTitle(title);},done:function()
{if(this._delegate)
this._delegate.done();if(this._doneCallback)
this._doneCallback();},setTotalWork:function(totalWork)
{if(this._delegate)
this._delegate.setTotalWork(totalWork);},setWorked:function(worked,title)
{if(this._delegate)
this._delegate.setWorked(worked,title);},worked:function(worked)
{if(this._delegate)
this._delegate.worked(worked);}};WebInspector.ResourceType=function(name,title,categoryTitle,color,isTextType)
{this._name=name;this._title=title;this._categoryTitle=categoryTitle;this._color=color;this._isTextType=isTextType;}
WebInspector.ResourceType.prototype={name:function()
{return this._name;},title:function()
{return this._title;},categoryTitle:function()
{return this._categoryTitle;},color:function()
{return this._color;},isTextType:function()
{return this._isTextType;},toString:function()
{return this._name;},canonicalMimeType:function()
{if(this===WebInspector.resourceTypes.Document)
return"text/html";if(this===WebInspector.resourceTypes.Script)
return"text/javascript";if(this===WebInspector.resourceTypes.Stylesheet)
return"text/css";return"";}}
WebInspector.resourceTypes={XHR:new WebInspector.ResourceType("xhr","XHR","XHR","rgb(231,231,10)",true),Script:new WebInspector.ResourceType("script","Script","Script","rgb(255,121,0)",true),Stylesheet:new WebInspector.ResourceType("stylesheet","Stylesheet","Style","rgb(157,231,119)",true),Image:new WebInspector.ResourceType("image","Image","Images","rgb(164,60,255)",false),Media:new WebInspector.ResourceType("media","Media","Media","rgb(164,60,255)",false),Font:new WebInspector.ResourceType("font","Font","Fonts","rgb(255,82,62)",false),Document:new WebInspector.ResourceType("document","Document","Documents","rgb(47,102,236)",true),TextTrack:new WebInspector.ResourceType("texttrack","TextTrack","TextTracks","rgb(164,60,255)",true),WebSocket:new WebInspector.ResourceType("websocket","WebSocket","WebSockets","rgb(186,186,186)",false),Other:new WebInspector.ResourceType("other","Other","Other","rgb(186,186,186)",false)}
WebInspector.ResourceType.mimeTypesForExtensions={"js":"text/javascript","css":"text/css","html":"text/html","htm":"text/html","xml":"application/xml","xsl":"application/xml","asp":"application/x-aspx","aspx":"application/x-aspx","jsp":"application/x-jsp","c":"text/x-c++src","cc":"text/x-c++src","cpp":"text/x-c++src","h":"text/x-c++src","m":"text/x-c++src","mm":"text/x-c++src","coffee":"text/x-coffeescript","dart":"text/javascript","ts":"text/typescript","json":"application/json","gyp":"application/json","gypi":"application/json","cs":"text/x-csharp","java":"text/x-java","less":"text/x-less","php":"text/x-php","phtml":"application/x-httpd-php","py":"text/x-python","sh":"text/x-sh","scss":"text/x-scss","vtt":"text/vtt"};WebInspector.Settings=function(prefs)
{this._settingsStorage=prefs;this._eventSupport=new WebInspector.Object();this._registry=new Map();this._moduleSettings=new Map();self.runtime.extensions("setting").forEach(this._registerModuleSetting.bind(this));}
WebInspector.Settings.prototype={_registerModuleSetting:function(extension)
{var descriptor=extension.descriptor();var settingName=descriptor["settingName"];var settingType=descriptor["settingType"];var defaultValue=descriptor["defaultValue"];var isLocal=!!descriptor["local"];var setting=settingType==="regex"?this.createRegExpSetting(settingName,defaultValue,undefined,isLocal):this.createSetting(settingName,defaultValue,isLocal);this._moduleSettings.set(settingName,setting);},moduleSetting:function(settingName)
{var setting=this._moduleSettings.get(settingName);if(!setting)
throw new Error("No setting registered: "+settingName);return setting;},settingForTest:function(settingName)
{var setting=this._registry.get(settingName);if(!setting)
throw new Error("No setting registered: "+settingName);return setting;},createSetting:function(key,defaultValue,isLocal)
{if(!this._registry.get(key))
this._registry.set(key,new WebInspector.Setting(this,key,defaultValue,this._eventSupport,isLocal?(window.localStorage||{}):this._settingsStorage));return(this._registry.get(key));},createLocalSetting:function(key,defaultValue)
{return this.createSetting(key,defaultValue,true);},createRegExpSetting:function(key,defaultValue,regexFlags,isLocal)
{if(!this._registry.get(key))
this._registry.set(key,new WebInspector.RegExpSetting(this,key,defaultValue,this._eventSupport,isLocal?(window.localStorage||{}):this._settingsStorage,regexFlags));return(this._registry.get(key));},clearAll:function()
{if(window.localStorage)
window.localStorage.clear();for(var key in this._settingsStorage)
delete this._settingsStorage[key];var versionSetting=WebInspector.settings.createSetting(WebInspector.VersionController._currentVersionName,0);versionSetting.set(WebInspector.VersionController.currentVersion);}}
WebInspector.Setting=function(settings,name,defaultValue,eventSupport,storage)
{this._settings=settings;this._name=name;this._defaultValue=defaultValue;this._eventSupport=eventSupport;this._storage=storage;}
WebInspector.Setting.prototype={addChangeListener:function(listener,thisObject)
{this._eventSupport.addEventListener(this._name,listener,thisObject);},removeChangeListener:function(listener,thisObject)
{this._eventSupport.removeEventListener(this._name,listener,thisObject);},get name()
{return this._name;},get:function()
{if(typeof this._value!=="undefined")
return this._value;this._value=this._defaultValue;if(this._name in this._storage){try{this._value=JSON.parse(this._storage[this._name]);}catch(e){this.remove();}}
return this._value;},set:function(value)
{this._value=value;try{var settingString=JSON.stringify(value);try{this._storage[this._name]=settingString;}catch(e){this._printSettingsSavingError(e.message,this._name,settingString);}}catch(e){WebInspector.console.error("Cannot stringify setting with name: "+this._name+", error: "+e.message);}
this._eventSupport.dispatchEventToListeners(this._name,value);},remove:function()
{this._settings._registry.delete(this._name);this._settings._moduleSettings.delete(this._name);delete this._storage[this._name];},_printSettingsSavingError:function(message,name,value)
{var errorMessage="Error saving setting with name: "+this._name+", value length: "+value.length+". Error: "+message;console.error(errorMessage);WebInspector.console.error(errorMessage);WebInspector.console.log("Ten largest settings: ");var sizes={__proto__:null};for(var key in this._storage)
sizes[key]=this._storage[key].length;var keys=Object.keys(sizes);function comparator(key1,key2)
{return sizes[key2]-sizes[key1];}
keys.sort(comparator);for(var i=0;i<10&&i<keys.length;++i)
WebInspector.console.log("Setting: '"+keys[i]+"', size: "+sizes[keys[i]]);}}
WebInspector.RegExpSetting=function(settings,name,defaultValue,eventSupport,storage,regexFlags)
{WebInspector.Setting.call(this,settings,name,defaultValue?[{pattern:defaultValue}]:[],eventSupport,storage);this._regexFlags=regexFlags;}
WebInspector.RegExpSetting.prototype={get:function()
{var result=[];var items=this.getAsArray();for(var i=0;i<items.length;++i){var item=items[i];if(item.pattern&&!item.disabled)
result.push(item.pattern);}
return result.join("|");},getAsArray:function()
{return WebInspector.Setting.prototype.get.call(this);},set:function(value)
{this.setAsArray([{pattern:value}]);},setAsArray:function(value)
{delete this._regex;WebInspector.Setting.prototype.set.call(this,value);},asRegExp:function()
{if(typeof this._regex!=="undefined")
return this._regex;this._regex=null;try{var pattern=this.get();if(pattern)
this._regex=new RegExp(pattern,this._regexFlags||"");}catch(e){}
return this._regex;},__proto__:WebInspector.Setting.prototype}
WebInspector.VersionController=function()
{}
WebInspector.VersionController._currentVersionName="inspectorVersion";WebInspector.VersionController.currentVersion=12;WebInspector.VersionController.prototype={updateVersion:function()
{var localStorageVersion=window.localStorage?window.localStorage[WebInspector.VersionController._currentVersionName]:0;var versionSetting=WebInspector.settings.createSetting(WebInspector.VersionController._currentVersionName,0);var currentVersion=WebInspector.VersionController.currentVersion;var oldVersion=parseInt(localStorageVersion||"0",10)||versionSetting.get();if(oldVersion===0){versionSetting.set(currentVersion);return;}
var methodsToRun=this._methodsToRunToUpdateVersion(oldVersion,currentVersion);for(var i=0;i<methodsToRun.length;++i)
this[methodsToRun[i]].call(this);versionSetting.set(currentVersion);},_methodsToRunToUpdateVersion:function(oldVersion,currentVersion)
{var result=[];for(var i=oldVersion;i<currentVersion;++i)
result.push("_updateVersionFrom"+i+"To"+(i+1));return result;},_updateVersionFrom0To1:function()
{this._clearBreakpointsWhenTooMany(WebInspector.settings.createLocalSetting("breakpoints",[]),500000);},_updateVersionFrom1To2:function()
{WebInspector.settings.createSetting("previouslyViewedFiles",[]).set([]);},_updateVersionFrom2To3:function()
{WebInspector.settings.createSetting("fileSystemMapping",{}).set({});WebInspector.settings.createSetting("fileMappingEntries",[]).remove();},_updateVersionFrom3To4:function()
{var advancedMode=WebInspector.settings.createSetting("showHeaSnapshotObjectsHiddenProperties",false);WebInspector.moduleSetting("showAdvancedHeapSnapshotProperties").set(advancedMode.get());advancedMode.remove();},_updateVersionFrom4To5:function()
{var settingNames={"FileSystemViewSidebarWidth":"fileSystemViewSplitViewState","elementsSidebarWidth":"elementsPanelSplitViewState","StylesPaneSplitRatio":"stylesPaneSplitViewState","heapSnapshotRetainersViewSize":"heapSnapshotSplitViewState","InspectorView.splitView":"InspectorView.splitViewState","InspectorView.screencastSplitView":"InspectorView.screencastSplitViewState","Inspector.drawerSplitView":"Inspector.drawerSplitViewState","layerDetailsSplitView":"layerDetailsSplitViewState","networkSidebarWidth":"networkPanelSplitViewState","sourcesSidebarWidth":"sourcesPanelSplitViewState","scriptsPanelNavigatorSidebarWidth":"sourcesPanelNavigatorSplitViewState","sourcesPanelSplitSidebarRatio":"sourcesPanelDebuggerSidebarSplitViewState","timeline-details":"timelinePanelDetailsSplitViewState","timeline-split":"timelinePanelRecorsSplitViewState","timeline-view":"timelinePanelTimelineStackSplitViewState","auditsSidebarWidth":"auditsPanelSplitViewState","layersSidebarWidth":"layersPanelSplitViewState","profilesSidebarWidth":"profilesPanelSplitViewState","resourcesSidebarWidth":"resourcesPanelSplitViewState"};var empty={};for(var oldName in settingNames){var newName=settingNames[oldName];var oldNameH=oldName+"H";var newValue=null;var oldSetting=WebInspector.settings.createSetting(oldName,empty);if(oldSetting.get()!==empty){newValue=newValue||{};newValue.vertical={};newValue.vertical.size=oldSetting.get();oldSetting.remove();}
var oldSettingH=WebInspector.settings.createSetting(oldNameH,empty);if(oldSettingH.get()!==empty){newValue=newValue||{};newValue.horizontal={};newValue.horizontal.size=oldSettingH.get();oldSettingH.remove();}
if(newValue)
WebInspector.settings.createSetting(newName,{}).set(newValue);}},_updateVersionFrom5To6:function()
{var settingNames={"debuggerSidebarHidden":"sourcesPanelSplitViewState","navigatorHidden":"sourcesPanelNavigatorSplitViewState","WebInspector.Drawer.showOnLoad":"Inspector.drawerSplitViewState"};for(var oldName in settingNames){var oldSetting=WebInspector.settings.createSetting(oldName,null);if(oldSetting.get()===null){oldSetting.remove();continue;}
var newName=settingNames[oldName];var invert="WebInspector.Drawer.showOnLoad"===oldName;var hidden=oldSetting.get()!==invert;oldSetting.remove();var showMode=hidden?"OnlyMain":"Both";var newSetting=WebInspector.settings.createSetting(newName,{});var newValue=newSetting.get()||{};newValue.vertical=newValue.vertical||{};newValue.vertical.showMode=showMode;newValue.horizontal=newValue.horizontal||{};newValue.horizontal.showMode=showMode;newSetting.set(newValue);}},_updateVersionFrom6To7:function()
{var settingNames={"sourcesPanelNavigatorSplitViewState":"sourcesPanelNavigatorSplitViewState","elementsPanelSplitViewState":"elementsPanelSplitViewState","stylesPaneSplitViewState":"stylesPaneSplitViewState","sourcesPanelDebuggerSidebarSplitViewState":"sourcesPanelDebuggerSidebarSplitViewState"};var empty={};for(var name in settingNames){var setting=WebInspector.settings.createSetting(name,empty);var value=setting.get();if(value===empty)
continue;if(value.vertical&&value.vertical.size&&value.vertical.size<1)
value.vertical.size=0;if(value.horizontal&&value.horizontal.size&&value.horizontal.size<1)
value.horizontal.size=0;setting.set(value);}},_updateVersionFrom7To8:function()
{},_updateVersionFrom8To9:function()
{var settingNames=["skipStackFramesPattern","workspaceFolderExcludePattern"];for(var i=0;i<settingNames.length;++i){var setting=WebInspector.settings.createSetting(settingNames[i],"");var value=setting.get();if(!value)
return;if(typeof value==="string")
value=[value];for(var j=0;j<value.length;++j){if(typeof value[j]==="string")
value[j]={pattern:value[j]};}
setting.set(value);}},_updateVersionFrom9To10:function()
{if(!window.localStorage)
return;for(var key in window.localStorage){if(key.startsWith("revision-history"))
window.localStorage.removeItem(key);}},_updateVersionFrom10To11:function()
{var oldSettingName="customDevicePresets";var newSettingName="customEmulatedDeviceList";var oldSetting=WebInspector.settings.createSetting(oldSettingName,undefined);var list=oldSetting.get();if(!Array.isArray(list))
return;var newList=[];for(var i=0;i<list.length;++i){var value=list[i];var device={};device["title"]=value["title"];device["type"]="unknown";device["user-agent"]=value["userAgent"];device["capabilities"]=[];if(value["touch"])
device["capabilities"].push("touch");if(value["mobile"])
device["capabilities"].push("mobile");device["screen"]={};device["screen"]["vertical"]={width:value["width"],height:value["height"]};device["screen"]["horizontal"]={width:value["height"],height:value["width"]};device["screen"]["device-pixel-ratio"]=value["deviceScaleFactor"];device["modes"]=[];device["show-by-default"]=true;device["show"]="Default";newList.push(device);}
if(newList.length)
WebInspector.settings.createSetting(newSettingName,[]).set(newList);oldSetting.remove();},_updateVersionFrom11To12:function()
{var localSettings=["advancedSearchConfig","breakpoints","consoleHistory","domBreakpoints","eventListenerBreakpoints","fileSystemMapping","lastSelectedSourcesSidebarPaneTab","previouslyViewedFiles","savedURLs","watchExpressions","workspaceExcludedFolders","xhrBreakpoints"].keySet();if(!window.localStorage)
return;for(var key in window.localStorage){if(key in localSettings)
continue;var value=window.localStorage[key];window.localStorage.removeItem(key);WebInspector.settings._settingsStorage[key]=value;}},_clearBreakpointsWhenTooMany:function(breakpointsSetting,maxBreakpointsCount)
{if(breakpointsSetting.get().length>maxBreakpointsCount)
breakpointsSetting.set([]);}}
WebInspector.settings;WebInspector.moduleSetting=function(settingName)
{return WebInspector.settings.moduleSetting(settingName);}
WebInspector.settingForTest=function(settingName)
{return WebInspector.settings.settingForTest(settingName);};WebInspector.StaticContentProvider=function(contentType,content,contentURL)
{this._content=content;this._contentType=contentType;this._contentURL=contentURL||"";}
WebInspector.StaticContentProvider.searchInContent=function(content,query,caseSensitive,isRegex,callback)
{function performSearch()
{callback(WebInspector.ContentProvider.performSearchInContent(content,query,caseSensitive,isRegex));}
setTimeout(performSearch.bind(null),0);}
WebInspector.StaticContentProvider.prototype={contentURL:function()
{return this._contentURL;},contentType:function()
{return this._contentType;},requestContent:function(callback)
{callback(this._content);},searchInContent:function(query,caseSensitive,isRegex,callback)
{WebInspector.StaticContentProvider.searchInContent(this._content,query,caseSensitive,isRegex,callback);}};WebInspector.OutputStream=function()
{}
WebInspector.OutputStream.prototype={write:function(data,callback){},close:function(){}}
WebInspector.StringOutputStream=function()
{this._data="";}
WebInspector.StringOutputStream.prototype={write:function(chunk,callback)
{this._data+=chunk;},close:function()
{},data:function()
{return this._data;}};WebInspector.TestBase=function(domAutomationController)
{this.domAutomationController_=domAutomationController;this.controlTaken_=false;this.timerId_=-1;};WebInspector.TestBase.prototype.fail=function(message)
{if(this.controlTaken_)
this.reportFailure_(message);else
throw message;};WebInspector.TestBase.prototype.assertEquals=function(expected,actual,opt_message)
{if(expected!==actual){var message="Expected: '"+expected+"', but was '"+actual+"'";if(opt_message)
message=opt_message+"("+message+")";this.fail(message);}};WebInspector.TestBase.prototype.assertTrue=function(value,opt_message)
{this.assertEquals(true,!!value,opt_message);};WebInspector.TestBase.prototype.takeControl=function()
{this.controlTaken_=true;var self=this;this.timerId_=setTimeout(function(){self.reportFailure_("Timeout exceeded: 20 sec");},20000);};WebInspector.TestBase.prototype.releaseControl=function()
{if(this.timerId_!==-1){clearTimeout(this.timerId_);this.timerId_=-1;}
this.reportOk_();};WebInspector.TestBase.prototype.reportOk_=function()
{this.domAutomationController_.send("[OK]");};WebInspector.TestBase.prototype.reportFailure_=function(error)
{if(this.timerId_!==-1){clearTimeout(this.timerId_);this.timerId_=-1;}
this.domAutomationController_.send("[FAILED] "+error);};WebInspector.TestBase.prototype.runTest=function(testName)
{try{this[testName]();if(!this.controlTaken_)
this.reportOk_();}catch(e){this.reportFailure_(e);}};WebInspector.TestBase.prototype.addSniffer=function(receiver,methodName,override,opt_sticky)
{var orig=receiver[methodName];if(typeof orig!=="function")
this.fail("Cannot find method to override: "+methodName);var test=this;receiver[methodName]=function(var_args){try{var result=orig.apply(this,arguments);}finally{if(!opt_sticky)
receiver[methodName]=orig;}
try{override.apply(this,arguments);}catch(e){test.fail("Exception in overriden method '"+methodName+"': "+e);}
return result;};};WebInspector.TestBase.prototype.waitForThrottler=function(throttler,callback)
{var test=this;var scheduleShouldFail=true;test.addSniffer(throttler,"schedule",onSchedule);function hasSomethingScheduled()
{return throttler._isRunningProcess||throttler._process;}
function checkState()
{if(!hasSomethingScheduled()){scheduleShouldFail=false;callback();return;}
test.addSniffer(throttler,"_processCompletedForTests",checkState);}
function onSchedule()
{if(scheduleShouldFail)
test.fail("Unexpected Throttler.schedule");}
checkState();};;WebInspector.TextRange=function(startLine,startColumn,endLine,endColumn)
{this.startLine=startLine;this.startColumn=startColumn;this.endLine=endLine;this.endColumn=endColumn;}
WebInspector.TextRange.createFromLocation=function(line,column)
{return new WebInspector.TextRange(line,column,line,column);}
WebInspector.TextRange.fromObject=function(serializedTextRange)
{return new WebInspector.TextRange(serializedTextRange.startLine,serializedTextRange.startColumn,serializedTextRange.endLine,serializedTextRange.endColumn);}
WebInspector.TextRange.comparator=function(range1,range2)
{return range1.compareTo(range2);}
WebInspector.TextRange.prototype={isEmpty:function()
{return this.startLine===this.endLine&&this.startColumn===this.endColumn;},immediatelyPrecedes:function(range)
{if(!range)
return false;return this.endLine===range.startLine&&this.endColumn===range.startColumn;},immediatelyFollows:function(range)
{if(!range)
return false;return range.immediatelyPrecedes(this);},follows:function(range)
{return(range.endLine===this.startLine&&range.endColumn<=this.startColumn)||range.endLine<this.startLine;},get linesCount()
{return this.endLine-this.startLine;},collapseToEnd:function()
{return new WebInspector.TextRange(this.endLine,this.endColumn,this.endLine,this.endColumn);},collapseToStart:function()
{return new WebInspector.TextRange(this.startLine,this.startColumn,this.startLine,this.startColumn);},normalize:function()
{if(this.startLine>this.endLine||(this.startLine===this.endLine&&this.startColumn>this.endColumn))
return new WebInspector.TextRange(this.endLine,this.endColumn,this.startLine,this.startColumn);else
return this.clone();},clone:function()
{return new WebInspector.TextRange(this.startLine,this.startColumn,this.endLine,this.endColumn);},serializeToObject:function()
{var serializedTextRange={};serializedTextRange.startLine=this.startLine;serializedTextRange.startColumn=this.startColumn;serializedTextRange.endLine=this.endLine;serializedTextRange.endColumn=this.endColumn;return serializedTextRange;},compareTo:function(other)
{if(this.startLine>other.startLine)
return 1;if(this.startLine<other.startLine)
return-1;if(this.startColumn>other.startColumn)
return 1;if(this.startColumn<other.startColumn)
return-1;return 0;},equal:function(other)
{return this.startLine===other.startLine&&this.endLine===other.endLine&&this.startColumn===other.startColumn&&this.endColumn===other.endColumn;},shift:function(lineOffset)
{return new WebInspector.TextRange(this.startLine+lineOffset,this.startColumn,this.endLine+lineOffset,this.endColumn);},rebaseAfterTextEdit:function(originalRange,editedRange)
{console.assert(originalRange.startLine===editedRange.startLine);console.assert(originalRange.startColumn===editedRange.startColumn);var rebase=this.clone();if(!this.follows(originalRange))
return rebase;var lineDelta=editedRange.endLine-originalRange.endLine;var columnDelta=editedRange.endColumn-originalRange.endColumn;rebase.startLine+=lineDelta;rebase.endLine+=lineDelta;if(rebase.startLine===editedRange.endLine)
rebase.startColumn+=columnDelta;if(rebase.endLine===editedRange.endLine)
rebase.endColumn+=columnDelta;return rebase;},toString:function()
{return JSON.stringify(this);}}
WebInspector.SourceRange=function(offset,length)
{this.offset=offset;this.length=length;};WebInspector.TextUtils={isStopChar:function(char)
{return(char>" "&&char<"0")||(char>"9"&&char<"A")||(char>"Z"&&char<"_")||(char>"_"&&char<"a")||(char>"z"&&char<="~");},isWordChar:function(char)
{return!WebInspector.TextUtils.isStopChar(char)&&!WebInspector.TextUtils.isSpaceChar(char);},isSpaceChar:function(char)
{return WebInspector.TextUtils._SpaceCharRegex.test(char);},isWord:function(word)
{for(var i=0;i<word.length;++i){if(!WebInspector.TextUtils.isWordChar(word.charAt(i)))
return false;}
return true;},isOpeningBraceChar:function(char)
{return char==="("||char==="{";},isClosingBraceChar:function(char)
{return char===")"||char==="}";},isBraceChar:function(char)
{return WebInspector.TextUtils.isOpeningBraceChar(char)||WebInspector.TextUtils.isClosingBraceChar(char);},textToWords:function(text,isWordChar,wordCallback)
{var startWord=-1;for(var i=0;i<text.length;++i){if(!isWordChar(text.charAt(i))){if(startWord!==-1)
wordCallback(text.substring(startWord,i));startWord=-1;}else if(startWord===-1)
startWord=i;}
if(startWord!==-1)
wordCallback(text.substring(startWord));},lineIndent:function(line)
{var indentation=0;while(indentation<line.length&&WebInspector.TextUtils.isSpaceChar(line.charAt(indentation)))
++indentation;return line.substr(0,indentation);},isUpperCase:function(text)
{return text===text.toUpperCase();},isLowerCase:function(text)
{return text===text.toLowerCase();}}
WebInspector.TextUtils._SpaceCharRegex=/\s/;WebInspector.TextUtils.Indent={TwoSpaces:"  ",FourSpaces:"    ",EightSpaces:"        ",TabCharacter:"\t"}
WebInspector.TextUtils.BalancedJSONTokenizer=function(callback,findMultiple)
{this._callback=callback;this._index=0;this._balance=0;this._buffer="";this._findMultiple=findMultiple||false;this._closingDoubleQuoteRegex=/[^\\](?:\\\\)*"/g;}
WebInspector.TextUtils.BalancedJSONTokenizer.prototype={write:function(chunk)
{this._buffer+=chunk;var lastIndex=this._buffer.length;var buffer=this._buffer;for(var index=this._index;index<lastIndex;++index){var character=buffer[index];if(character==="\""){this._closingDoubleQuoteRegex.lastIndex=index;if(!this._closingDoubleQuoteRegex.test(buffer))
break;index=this._closingDoubleQuoteRegex.lastIndex-1;}else if(character==="{"){++this._balance;}else if(character==="}"){if(--this._balance===0){this._lastBalancedIndex=index+1;if(!this._findMultiple)
break;}}}
this._index=index;this._reportBalanced();},_reportBalanced:function()
{if(!this._lastBalancedIndex)
return;this._callback(this._buffer.slice(0,this._lastBalancedIndex));this._buffer=this._buffer.slice(this._lastBalancedIndex);this._index-=this._lastBalancedIndex;this._lastBalancedIndex=0;},remainder:function()
{return this._buffer;}};WebInspector.Throttler=function(timeout)
{this._timeout=timeout;this._isRunningProcess=false;this._asSoonAsPossible=false;this._process=null;}
WebInspector.Throttler.prototype={_processCompleted:function(error)
{if(error)
console.error(error);this._isRunningProcess=false;if(this._process)
this._innerSchedule(false);this._processCompletedForTests();},_processCompletedForTests:function()
{},_onTimeout:function()
{delete this._processTimeout;this._asSoonAsPossible=false;this._isRunningProcess=true;var process=this._process;this._process=null;try{process(this._processCompleted.bind(this));}catch(e){if(this._isRunningProcess)
this._processCompleted(e);}},schedule:function(process,asSoonAsPossible)
{this._process=process;var hasScheduledTasks=!!this._processTimeout||this._isRunningProcess;asSoonAsPossible=!!asSoonAsPossible||!hasScheduledTasks;var forceTimerUpdate=asSoonAsPossible&&!this._asSoonAsPossible;this._asSoonAsPossible=this._asSoonAsPossible||asSoonAsPossible;this._innerSchedule(forceTimerUpdate);},_innerSchedule:function(forceTimerUpdate)
{if(this._isRunningProcess)
return;if(this._processTimeout&&!forceTimerUpdate)
return;if(this._processTimeout)
this._clearTimeout(this._processTimeout);var timeout=this._asSoonAsPossible?0:this._timeout;this._processTimeout=this._setTimeout(this._onTimeout.bind(this),timeout);},_clearTimeout:function(timeoutId)
{clearTimeout(timeoutId);},_setTimeout:function(operation,timeout)
{return setTimeout(operation,timeout);}}
WebInspector.Throttler.FinishCallback;;WebInspector.UIString=function(string,vararg)
{return String.vsprintf(WebInspector.localize(string),Array.prototype.slice.call(arguments,1));}
WebInspector.UIString.capitalize=function(string,vararg)
{if(WebInspector._useLowerCaseMenuTitles===undefined)
throw"WebInspector.setLocalizationPlatform() has not been called";var localized=WebInspector.localize(string);var capitalized;if(WebInspector._useLowerCaseMenuTitles)
capitalized=localized.replace(/\^(.)/g,"$1");else
capitalized=localized.replace(/\^(.)/g,function(str,char){return char.toUpperCase();});return String.vsprintf(capitalized,Array.prototype.slice.call(arguments,1));}
WebInspector.setLocalizationPlatform=function(platform)
{WebInspector._useLowerCaseMenuTitles=platform==="windows";}
WebInspector.localize=function(string)
{return string;}
WebInspector.UIStringFormat=function(format)
{this._localizedFormat=WebInspector.localize(format);this._tokenizedFormat=String.tokenizeFormatString(this._localizedFormat,String.standardFormatters);}
WebInspector.UIStringFormat._append=function(a,b)
{return a+b;}
WebInspector.UIStringFormat.prototype={format:function(vararg)
{return String.format(this._localizedFormat,arguments,String.standardFormatters,"",WebInspector.UIStringFormat._append,this._tokenizedFormat).formattedResult;}};WebInspector.Renderer=function()
{}
WebInspector.Renderer.prototype={render:function(object){}}
WebInspector.Renderer.renderPromise=function(object)
{if(!object)
return Promise.reject(new Error("Can't render "+object));return self.runtime.instancePromise(WebInspector.Renderer,object).then(render);function render(renderer)
{return renderer.render(object);}}
WebInspector.Revealer=function()
{}
WebInspector.Revealer.reveal=function(revealable,lineNumber)
{WebInspector.Revealer.revealPromise(revealable,lineNumber);}
WebInspector.Revealer.revealPromise=function(revealable,lineNumber)
{if(!revealable)
return Promise.reject(new Error("Can't reveal "+revealable));return self.runtime.instancesPromise(WebInspector.Revealer,revealable).then(reveal);function reveal(revealers)
{var promises=[];for(var i=0;i<revealers.length;++i)
promises.push(revealers[i].reveal((revealable),lineNumber));return Promise.race(promises);}}
WebInspector.Revealer.prototype={reveal:function(object,lineNumber){}}
WebInspector.App=function()
{}
WebInspector.App.prototype={presentUI:function(document){}}
WebInspector.AppProvider=function()
{}
WebInspector.AppProvider.prototype={createApp:function(){}}
WebInspector.QueryParamHandler=function()
{}
WebInspector.QueryParamHandler.prototype={handleQueryParam:function(value){}};function InspectorFrontendHostAPI()
{this.events;}
InspectorFrontendHostAPI.ContextMenuDescriptor;InspectorFrontendHostAPI.LoadNetworkResourceResult;InspectorFrontendHostAPI.Events={AddExtensions:"addExtensions",AppendedToURL:"appendedToURL",CanceledSaveURL:"canceledSaveURL",ContextMenuCleared:"contextMenuCleared",ContextMenuItemSelected:"contextMenuItemSelected",DeviceCountUpdated:"deviceCountUpdated",DevicesUpdated:"devicesUpdated",DispatchMessage:"dispatchMessage",DispatchMessageChunk:"dispatchMessageChunk",EnterInspectElementMode:"enterInspectElementMode",FileSystemsLoaded:"fileSystemsLoaded",FileSystemRemoved:"fileSystemRemoved",FileSystemAdded:"fileSystemAdded",IndexingTotalWorkCalculated:"indexingTotalWorkCalculated",IndexingWorked:"indexingWorked",IndexingDone:"indexingDone",KeyEventUnhandled:"keyEventUnhandled",RevealSourceLine:"revealSourceLine",SavedURL:"savedURL",SearchCompleted:"searchCompleted",SetInspectedTabId:"setInspectedTabId",SetToolbarColors:"setToolbarColors",SetUseSoftMenu:"setUseSoftMenu",ShowConsole:"showConsole"}
InspectorFrontendHostAPI.EventDescriptors=[[InspectorFrontendHostAPI.Events.AddExtensions,["extensions"]],[InspectorFrontendHostAPI.Events.AppendedToURL,["url"]],[InspectorFrontendHostAPI.Events.CanceledSaveURL,["url"]],[InspectorFrontendHostAPI.Events.ContextMenuCleared,[]],[InspectorFrontendHostAPI.Events.ContextMenuItemSelected,["id"]],[InspectorFrontendHostAPI.Events.DeviceCountUpdated,["count"]],[InspectorFrontendHostAPI.Events.DevicesUpdated,["devices"]],[InspectorFrontendHostAPI.Events.DispatchMessage,["messageObject"]],[InspectorFrontendHostAPI.Events.DispatchMessageChunk,["messageChunk","messageSize"]],[InspectorFrontendHostAPI.Events.EnterInspectElementMode,[]],[InspectorFrontendHostAPI.Events.FileSystemsLoaded,["fileSystems"]],[InspectorFrontendHostAPI.Events.FileSystemRemoved,["fileSystemPath"]],[InspectorFrontendHostAPI.Events.FileSystemAdded,["errorMessage","fileSystem"]],[InspectorFrontendHostAPI.Events.IndexingTotalWorkCalculated,["requestId","fileSystemPath","totalWork"]],[InspectorFrontendHostAPI.Events.IndexingWorked,["requestId","fileSystemPath","worked"]],[InspectorFrontendHostAPI.Events.IndexingDone,["requestId","fileSystemPath"]],[InspectorFrontendHostAPI.Events.KeyEventUnhandled,["event"]],[InspectorFrontendHostAPI.Events.RevealSourceLine,["url","lineNumber","columnNumber"]],[InspectorFrontendHostAPI.Events.SavedURL,["url"]],[InspectorFrontendHostAPI.Events.SearchCompleted,["requestId","fileSystemPath","files"]],[InspectorFrontendHostAPI.Events.SetInspectedTabId,["tabId"]],[InspectorFrontendHostAPI.Events.SetToolbarColors,["backgroundColor","color"]],[InspectorFrontendHostAPI.Events.SetUseSoftMenu,["useSoftMenu"]],[InspectorFrontendHostAPI.Events.ShowConsole,[]]];InspectorFrontendHostAPI.prototype={addFileSystem:function(){},append:function(url,content){},loadCompleted:function(){},indexPath:function(requestId,fileSystemPath){},getSelectionBackgroundColor:function(){},getSelectionForegroundColor:function(){},setInspectedPageBounds:function(bounds){},setWhitelistedShortcuts:function(shortcuts){},inspectElementCompleted:function(){},openInNewTab:function(url){},removeFileSystem:function(fileSystemPath){},requestFileSystems:function(){},save:function(url,content,forceSaveAs){},searchInPath:function(requestId,fileSystemPath,query){},stopIndexing:function(requestId){},bringToFront:function(){},closeWindow:function(){},copyText:function(text){},inspectedURLChanged:function(url){},isolatedFileSystem:function(fileSystemId,registeredName){},loadNetworkResource:function(url,headers,streamId,callback){},getPreferences:function(callback){},setPreference:function(name,value){},removePreference:function(name){},clearPreferences:function(){},upgradeDraggedFileSystemPermissions:function(fileSystem){},platform:function(){},recordEnumeratedHistogram:function(actionName,actionCode,bucketSize){},sendMessageToBackend:function(message){},setDevicesUpdatesEnabled:function(enabled){},setInjectedScriptForOrigin:function(origin,script){},setIsDocked:function(isDocked,callback){},zoomFactor:function(){},zoomIn:function(){},zoomOut:function(){},resetZoom:function(){},showContextMenuAtPoint:function(x,y,items,document){},isUnderTest:function(){},isHostedMode:function(){}}
WebInspector.InspectorFrontendHostStub=function()
{function stopEventPropagation(event)
{var zoomModifier=WebInspector.isMac()?event.metaKey:event.ctrlKey;if(zoomModifier&&(event.keyCode===187||event.keyCode===189))
event.stopPropagation();}
document.addEventListener("keydown",stopEventPropagation,true);}
WebInspector.InspectorFrontendHostStub.prototype={getSelectionBackgroundColor:function()
{return"#6e86ff";},getSelectionForegroundColor:function()
{return"#ffffff";},platform:function()
{var match=navigator.userAgent.match(/Windows NT/);if(match)
return"windows";match=navigator.userAgent.match(/Mac OS X/);if(match)
return"mac";return"linux";},loadCompleted:function()
{},bringToFront:function()
{this._windowVisible=true;},closeWindow:function()
{this._windowVisible=false;},setIsDocked:function(isDocked,callback)
{setTimeout(callback,0);},setInspectedPageBounds:function(bounds)
{},inspectElementCompleted:function()
{},setInjectedScriptForOrigin:function(origin,script)
{},inspectedURLChanged:function(url)
{document.title=WebInspector.UIString("Developer Tools - %s",url);},copyText:function(text)
{WebInspector.console.error("Clipboard is not enabled in hosted mode. Please inspect using chrome://inspect");},openInNewTab:function(url)
{window.open(url,"_blank");},save:function(url,content,forceSaveAs)
{WebInspector.console.error("Saving files is not enabled in hosted mode. Please inspect using chrome://inspect");this.events.dispatchEventToListeners(InspectorFrontendHostAPI.Events.CanceledSaveURL,url);},append:function(url,content)
{WebInspector.console.error("Saving files is not enabled in hosted mode. Please inspect using chrome://inspect");},sendMessageToBackend:function(message)
{},recordEnumeratedHistogram:function(actionName,actionCode,bucketSize)
{},requestFileSystems:function()
{},addFileSystem:function()
{},removeFileSystem:function(fileSystemPath)
{},isolatedFileSystem:function(fileSystemId,registeredName)
{return null;},loadNetworkResource:function(url,headers,streamId,callback)
{loadResourcePromise(url).then(function(text){WebInspector.ResourceLoader.streamWrite(streamId,text);callback({statusCode:200});}).catch(function(){callback({statusCode:404});});},getPreferences:function(callback)
{var prefs={};for(var name in window.localStorage)
prefs[name]=window.localStorage[name];callback(prefs);},setPreference:function(name,value)
{window.localStorage[name]=value;},removePreference:function(name)
{delete window.localStorage[name];},clearPreferences:function()
{window.localStorage.clear();},upgradeDraggedFileSystemPermissions:function(fileSystem)
{},indexPath:function(requestId,fileSystemPath)
{},stopIndexing:function(requestId)
{},searchInPath:function(requestId,fileSystemPath,query)
{},zoomFactor:function()
{return 1;},zoomIn:function()
{},zoomOut:function()
{},resetZoom:function()
{},setWhitelistedShortcuts:function(shortcuts)
{},isUnderTest:function()
{return false;},setDevicesUpdatesEnabled:function(enabled)
{},showContextMenuAtPoint:function(x,y,items,document)
{throw"Soft context menu should be used";},isHostedMode:function()
{return true;}};var InspectorFrontendHost=window.InspectorFrontendHost||null;(function(){function initializeInspectorFrontendHost()
{if(!InspectorFrontendHost){InspectorFrontendHost=new WebInspector.InspectorFrontendHostStub();}else{var proto=WebInspector.InspectorFrontendHostStub.prototype;for(var name in proto){var value=proto[name];if(typeof value!=="function"||InspectorFrontendHost[name])
continue;InspectorFrontendHost[name]=stub.bind(null,name);}}
function stub(name)
{console.error("Incompatible embedder: method InspectorFrontendHost."+name+" is missing. Using stub instead.");var args=Array.prototype.slice.call(arguments,1);return proto[name].apply(InspectorFrontendHost,args);}
InspectorFrontendHost.events=new WebInspector.Object();}
function InspectorFrontendAPIImpl()
{this._debugFrontend=!!Runtime.queryParam("debugFrontend")||(window["InspectorTest"]&&window["InspectorTest"]["debugTest"]);var descriptors=InspectorFrontendHostAPI.EventDescriptors;for(var i=0;i<descriptors.length;++i)
this[descriptors[i][0]]=this._dispatch.bind(this,descriptors[i][0],descriptors[i][1],descriptors[i][2]);}
InspectorFrontendAPIImpl.prototype={_dispatch:function(name,signature,runOnceLoaded)
{var params=Array.prototype.slice.call(arguments,3);if(this._debugFrontend)
setImmediate(innerDispatch);else
innerDispatch();function innerDispatch()
{if(signature.length<2){try{InspectorFrontendHost.events.dispatchEventToListeners(name,params[0]);}catch(e){console.error(e+" "+e.stack);}
return;}
var data={};for(var i=0;i<signature.length;++i)
data[signature[i]]=params[i];try{InspectorFrontendHost.events.dispatchEventToListeners(name,data);}catch(e){console.error(e+" "+e.stack);}}},streamWrite:function(id,chunk)
{WebInspector.ResourceLoader.streamWrite(id,chunk);}}
initializeInspectorFrontendHost();window.InspectorFrontendAPI=new InspectorFrontendAPIImpl();if(!window.DevToolsHost){WebInspector.setLocalizationPlatform(InspectorFrontendHost.platform());}else{WebInspector.setLocalizationPlatform(DevToolsHost.platform());}})();;WebInspector.platform=function()
{if(!WebInspector._platform)
WebInspector._platform=InspectorFrontendHost.platform();return WebInspector._platform;}
WebInspector.isMac=function()
{if(typeof WebInspector._isMac==="undefined")
WebInspector._isMac=WebInspector.platform()==="mac";return WebInspector._isMac;}
WebInspector.isWin=function()
{if(typeof WebInspector._isWin==="undefined")
WebInspector._isWin=WebInspector.platform()==="windows";return WebInspector._isWin;}
WebInspector.fontFamily=function()
{if(WebInspector._fontFamily)
return WebInspector._fontFamily;switch(WebInspector.platform()){case"linux":WebInspector._fontFamily="Ubuntu, Arial, sans-serif";break;case"mac":WebInspector._fontFamily="'Lucida Grande', sans-serif";break;case"windows":WebInspector._fontFamily="'Segoe UI', Tahoma, sans-serif";break;}
return WebInspector._fontFamily;}
WebInspector.monospaceFontFamily=function()
{if(WebInspector._monospaceFontFamily)
return WebInspector._monospaceFontFamily;switch(WebInspector.platform()){case"linux":WebInspector._monospaceFontFamily="dejavu sans mono, monospace";break;case"mac":WebInspector._monospaceFontFamily="Menlo, monospace";break;case"windows":WebInspector._monospaceFontFamily="Consolas, monospace";break;}
return WebInspector._monospaceFontFamily;};WebInspector.ResourceLoader={}
WebInspector.ResourceLoader._lastStreamId=0;WebInspector.ResourceLoader._boundStreams={};WebInspector.ResourceLoader._bindOutputStream=function(stream)
{WebInspector.ResourceLoader._boundStreams[++WebInspector.ResourceLoader._lastStreamId]=stream;return WebInspector.ResourceLoader._lastStreamId;}
WebInspector.ResourceLoader._discardOutputStream=function(id)
{WebInspector.ResourceLoader._boundStreams[id].close();delete WebInspector.ResourceLoader._boundStreams[id];}
WebInspector.ResourceLoader.streamWrite=function(id,chunk)
{WebInspector.ResourceLoader._boundStreams[id].write(chunk);}
WebInspector.ResourceLoader.load=function(url,headers,callback)
{var stream=new WebInspector.StringOutputStream();WebInspector.ResourceLoader.loadAsStream(url,headers,stream,mycallback);function mycallback(statusCode,headers)
{callback(statusCode,headers,stream.data());}}
WebInspector.ResourceLoader.loadAsStream=function(url,headers,stream,callback)
{var streamId=WebInspector.ResourceLoader._bindOutputStream(stream);var parsedURL=new WebInspector.ParsedURL(url);if(parsedURL.isDataURL()){loadXHR(url).then(dataURLDecodeSuccessful).catch(dataURLDecodeFailed);return;}
var rawHeaders=[];if(headers){for(var key in headers)
rawHeaders.push(key+": "+headers[key]);}
InspectorFrontendHost.loadNetworkResource(url,rawHeaders.join("\r\n"),streamId,finishedCallback);function finishedCallback(response)
{if(callback)
callback(response.statusCode,response.headers||{});WebInspector.ResourceLoader._discardOutputStream(streamId);}
function dataURLDecodeSuccessful(text)
{WebInspector.ResourceLoader.streamWrite(streamId,text);finishedCallback(({statusCode:200}));}
function dataURLDecodeFailed()
{finishedCallback(({statusCode:404}));}};WebInspector.UserMetrics=function()
{for(var actionName in WebInspector.UserMetrics._ActionCodes){var actionCode=WebInspector.UserMetrics._ActionCodes[actionName];this[actionName]=new WebInspector.UserMetrics._Recorder(actionCode);}}
WebInspector.UserMetrics._ActionCodes={WindowDocked:1,WindowUndocked:2,ScriptsBreakpointSet:3,TimelineStarted:4,ProfilesCPUProfileTaken:5,ProfilesHeapProfileTaken:6,AuditsStarted:7,ConsoleEvaluated:8,FileSavedInWorkspace:9,DeviceModeEnabled:10,AnimationsPlaybackRateChanged:11,RevisionApplied:12,FileSystemDirectoryContentReceived:13,StyleRuleEdited:14,CommandEvaluatedInConsolePanel:15}
WebInspector.UserMetrics._PanelCodes={elements:1,resources:2,network:3,sources:4,timeline:5,profiles:6,audits:7,console:8,layers:9}
WebInspector.UserMetrics.prototype={panelShown:function(panelName)
{var code=WebInspector.UserMetrics._PanelCodes[panelName]||0;var size=Object.keys(WebInspector.UserMetrics._PanelCodes).length+1;InspectorFrontendHost.recordEnumeratedHistogram("DevTools.PanelShown",code,size);}}
WebInspector.UserMetrics._Recorder=function(actionCode)
{this._actionCode=actionCode;}
WebInspector.UserMetrics._Recorder.prototype={record:function()
{var size=Object.keys(WebInspector.UserMetrics._ActionCodes).length+1;InspectorFrontendHost.recordEnumeratedHistogram("DevTools.ActionTaken",this._actionCode,size);}}
WebInspector.userMetrics=new WebInspector.UserMetrics();;if(window.domAutomationController){var uiTests={};function UITestSuite()
{WebInspector.TestBase.call(this,window.domAutomationController);}
UITestSuite.prototype={__proto__:WebInspector.TestBase.prototype};UITestSuite.prototype.testRemoteWebSocket=function()
{function messageReceived(message)
{var messageObject=JSON.parse(message);url=messageObject[0]["webSocketDebuggerUrl"];this.assertTrue(url.startsWith("ws://"));this.releaseControl();}
function devicesUpdated(devices)
{this.assertEquals(devices.length,1);var browsers=devices[0].browsers;this.assertEquals(browsers.length,1);browserId=browsers[0].id;DevToolsAPI.sendMessageToEmbedder("sendJsonRequest",[browserId,"/json"],messageReceived.bind(this));}
DevToolsAPI.setDevicesUpdatedCallback(devicesUpdated.bind(this));this.takeControl();DevToolsAPI.sendMessageToEmbedder("setDevicesUpdatesEnabled",[true],null);};uiTests._tryRun=function(){if(uiTests._testSuite&&uiTests._pendingTestName){var name=uiTests._pendingTestName;delete uiTests._pendingTestName;if(UITestSuite.prototype.hasOwnProperty(name))
new UITestSuite().runTest(name);else
uiTests._testSuite.runTest(name);}}
uiTests.runTest=function(name)
{uiTests._pendingTestName=name;uiTests._tryRun();};uiTests.testSuiteReady=function(testSuiteConstructor)
{uiTests._testSuite=testSuiteConstructor(window.domAutomationController);uiTests._tryRun();};};function DevToolsAPIImpl()
{this._inspectorWindow;this._pendingDispatches=[];this._lastCallId=0;this._callbacks={};this._devicesUpdatedCallback=null;}
DevToolsAPIImpl.prototype={embedderMessageAck:function(id,arg)
{var callback=this._callbacks[id];delete this._callbacks[id];if(callback)
callback(arg);},sendMessageToEmbedder:function(method,args,callback)
{var callId=++this._lastCallId;if(callback)
this._callbacks[callId]=callback;var message={"id":callId,"method":method};if(args.length)
message.params=args;DevToolsHost.sendMessageToEmbedder(JSON.stringify(message));},setDevicesUpdatedCallback:function(callback)
{this._devicesUpdatedCallback=callback;},setInspectorWindow:function(inspectorWindow)
{this._inspectorWindow=inspectorWindow;if(!inspectorWindow)
return;while(this._pendingDispatches.length)
this._pendingDispatches.shift()(inspectorWindow);},_dispatchOnInspectorWindow:function(callback)
{if(this._inspectorWindow){callback(this._inspectorWindow);}else{this._pendingDispatches.push(callback);}},_dispatchOnInspectorFrontendAPI:function(method,args)
{function dispatch(inspectorWindow)
{var api=inspectorWindow.InspectorFrontendAPI;api[method].apply(api,args);}
this._dispatchOnInspectorWindow(dispatch);},addExtensions:function(extensions)
{function dispatch(inspectorWindow)
{if(inspectorWindow.WebInspector.addExtensions)
inspectorWindow.WebInspector.addExtensions(extensions);else
inspectorWindow.InspectorFrontendAPI.addExtensions(extensions);}
this._dispatchOnInspectorWindow(dispatch);},appendedToURL:function(url)
{this._dispatchOnInspectorFrontendAPI("appendedToURL",[url]);},canceledSaveURL:function(url)
{this._dispatchOnInspectorFrontendAPI("canceledSaveURL",[url]);},contextMenuCleared:function()
{this._dispatchOnInspectorFrontendAPI("contextMenuCleared",[]);},contextMenuItemSelected:function(id)
{this._dispatchOnInspectorFrontendAPI("contextMenuItemSelected",[id]);},deviceCountUpdated:function(count)
{this._dispatchOnInspectorFrontendAPI("deviceCountUpdated",[count]);},devicesUpdated:function(devices)
{if(this._devicesUpdatedCallback)
this._devicesUpdatedCallback.call(null,devices);this._dispatchOnInspectorFrontendAPI("devicesUpdated",[devices]);},dispatchMessage:function(message)
{this._dispatchOnInspectorFrontendAPI("dispatchMessage",[message]);},dispatchMessageChunk:function(messageChunk,messageSize)
{this._dispatchOnInspectorFrontendAPI("dispatchMessageChunk",[messageChunk,messageSize]);},enterInspectElementMode:function()
{this._dispatchOnInspectorFrontendAPI("enterInspectElementMode",[]);},fileSystemsLoaded:function(fileSystems)
{this._dispatchOnInspectorFrontendAPI("fileSystemsLoaded",[fileSystems]);},fileSystemRemoved:function(fileSystemPath)
{this._dispatchOnInspectorFrontendAPI("fileSystemRemoved",[fileSystemPath]);},fileSystemAdded:function(errorMessage,fileSystem)
{this._dispatchOnInspectorFrontendAPI("fileSystemAdded",[errorMessage,fileSystem]);},indexingTotalWorkCalculated:function(requestId,fileSystemPath,totalWork)
{this._dispatchOnInspectorFrontendAPI("indexingTotalWorkCalculated",[requestId,fileSystemPath,totalWork]);},indexingWorked:function(requestId,fileSystemPath,worked)
{this._dispatchOnInspectorFrontendAPI("indexingWorked",[requestId,fileSystemPath,worked]);},indexingDone:function(requestId,fileSystemPath)
{this._dispatchOnInspectorFrontendAPI("indexingDone",[requestId,fileSystemPath]);},keyEventUnhandled:function(event)
{this._dispatchOnInspectorFrontendAPI("keyEventUnhandled",[event]);},revealSourceLine:function(url,lineNumber,columnNumber)
{this._dispatchOnInspectorFrontendAPI("revealSourceLine",[url,lineNumber,columnNumber]);},savedURL:function(url)
{this._dispatchOnInspectorFrontendAPI("savedURL",[url]);},searchCompleted:function(requestId,fileSystemPath,files)
{this._dispatchOnInspectorFrontendAPI("searchCompleted",[requestId,fileSystemPath,files]);},setInspectedTabId:function(tabId)
{function dispatch(inspectorWindow)
{if(inspectorWindow.WebInspector.setInspectedTabId)
inspectorWindow.WebInspector.setInspectedTabId(tabId);else
inspectorWindow.InspectorFrontendAPI.setInspectedTabId(tabId);}
this._dispatchOnInspectorWindow(dispatch);},setToolbarColors:function(backgroundColor,color)
{this._dispatchOnInspectorFrontendAPI("setToolbarColors",[backgroundColor,color]);},setUseSoftMenu:function(useSoftMenu)
{this._dispatchOnInspectorFrontendAPI("setUseSoftMenu",[useSoftMenu]);},showConsole:function()
{this._dispatchOnInspectorFrontendAPI("showConsole",[]);},streamWrite:function(id,chunk)
{this._dispatchOnInspectorFrontendAPI("streamWrite",[id,chunk]);}}
var DevToolsAPI=new DevToolsAPIImpl();;WebInspector.InspectorFrontendHostImpl=function()
{}
WebInspector.InspectorFrontendHostImpl.prototype={getSelectionBackgroundColor:function()
{return DevToolsHost.getSelectionBackgroundColor();},getSelectionForegroundColor:function()
{return DevToolsHost.getSelectionForegroundColor();},platform:function()
{return DevToolsHost.platform();},loadCompleted:function()
{DevToolsAPI.sendMessageToEmbedder("loadCompleted",[],null);},bringToFront:function()
{DevToolsAPI.sendMessageToEmbedder("bringToFront",[],null);},closeWindow:function()
{DevToolsAPI.sendMessageToEmbedder("closeWindow",[],null);},setIsDocked:function(isDocked,callback)
{DevToolsAPI.sendMessageToEmbedder("setIsDocked",[isDocked],callback);},setInspectedPageBounds:function(bounds)
{DevToolsAPI.sendMessageToEmbedder("setInspectedPageBounds",[bounds],null);},inspectElementCompleted:function()
{DevToolsAPI.sendMessageToEmbedder("inspectElementCompleted",[],null);},loadNetworkResource:function(url,headers,streamId,callback)
{DevToolsAPI.sendMessageToEmbedder("loadNetworkResource",[url,headers,streamId],(callback));},getPreferences:function(callback)
{DevToolsAPI.sendMessageToEmbedder("getPreferences",[],(callback));},setPreference:function(name,value)
{DevToolsAPI.sendMessageToEmbedder("setPreference",[name,value],null);},removePreference:function(name)
{DevToolsAPI.sendMessageToEmbedder("removePreference",[name],null);},clearPreferences:function()
{DevToolsAPI.sendMessageToEmbedder("clearPreferences",[],null);},setInjectedScriptForOrigin:function(origin,script)
{DevToolsHost.setInjectedScriptForOrigin(origin,script);},inspectedURLChanged:function(url)
{DevToolsAPI.sendMessageToEmbedder("inspectedURLChanged",[url],null);},copyText:function(text)
{DevToolsHost.copyText(text);},openInNewTab:function(url)
{DevToolsAPI.sendMessageToEmbedder("openInNewTab",[url],null);},save:function(url,content,forceSaveAs)
{DevToolsAPI.sendMessageToEmbedder("save",[url,content,forceSaveAs],null);},append:function(url,content)
{DevToolsAPI.sendMessageToEmbedder("append",[url,content],null);},sendMessageToBackend:function(message)
{DevToolsHost.sendMessageToBackend(message);},recordEnumeratedHistogram:function(actionName,actionCode,bucketSize)
{DevToolsAPI.sendMessageToEmbedder("recordEnumeratedHistogram",[actionName,actionCode,bucketSize],null);},requestFileSystems:function()
{DevToolsAPI.sendMessageToEmbedder("requestFileSystems",[],null);},addFileSystem:function()
{DevToolsAPI.sendMessageToEmbedder("addFileSystem",[],null);},removeFileSystem:function(fileSystemPath)
{DevToolsAPI.sendMessageToEmbedder("removeFileSystem",[fileSystemPath],null);},isolatedFileSystem:function(fileSystemId,registeredName)
{return DevToolsHost.isolatedFileSystem(fileSystemId,registeredName);},upgradeDraggedFileSystemPermissions:function(fileSystem)
{DevToolsHost.upgradeDraggedFileSystemPermissions(fileSystem);},indexPath:function(requestId,fileSystemPath)
{DevToolsAPI.sendMessageToEmbedder("indexPath",[requestId,fileSystemPath],null);},stopIndexing:function(requestId)
{DevToolsAPI.sendMessageToEmbedder("stopIndexing",[requestId],null);},searchInPath:function(requestId,fileSystemPath,query)
{DevToolsAPI.sendMessageToEmbedder("searchInPath",[requestId,fileSystemPath,query],null);},zoomFactor:function()
{return DevToolsHost.zoomFactor();},zoomIn:function()
{DevToolsAPI.sendMessageToEmbedder("zoomIn",[],null);},zoomOut:function()
{DevToolsAPI.sendMessageToEmbedder("zoomOut",[],null);},resetZoom:function()
{DevToolsAPI.sendMessageToEmbedder("resetZoom",[],null);},setWhitelistedShortcuts:function(shortcuts)
{DevToolsAPI.sendMessageToEmbedder("setWhitelistedShortcuts",[shortcuts],null);},isUnderTest:function()
{return DevToolsHost.isUnderTest();},setDevicesUpdatesEnabled:function(enabled)
{DevToolsAPI.sendMessageToEmbedder("setDevicesUpdatesEnabled",[enabled],null);},showContextMenuAtPoint:function(x,y,items,document)
{DevToolsHost.showContextMenuAtPoint(x,y,items,document);},isHostedMode:function()
{return DevToolsHost.isHostedMode();},port:function()
{return"unknown";},setZoomFactor:function(zoomFactor)
{},sendMessageToEmbedder:function()
{},requestSetDockSide:function(dockSide)
{DevToolsAPI.sendMessageToEmbedder("setIsDocked",[dockSide!=="undocked"],null);},supportsFileSystems:function()
{return true;},canInspectWorkers:function()
{return true;},canSaveAs:function()
{return true;},canSave:function()
{return true;},loaded:function()
{},hiddenPanels:function()
{return"";},localizedStringsURL:function()
{return"";},close:function(url)
{},recordActionTaken:function(actionCode)
{this.recordEnumeratedHistogram("DevTools.ActionTaken",actionCode,100);},recordPanelShown:function(panelCode)
{this.recordEnumeratedHistogram("DevTools.PanelShown",panelCode,20);}};WebInspector.DevToolsApp=function()
{if(DevToolsHost.isUnderTest())
self.runtime.useTestBase();this._iframe=document.getElementById("inspector-app-iframe");this._inspectorFrontendHostImpl=new WebInspector.InspectorFrontendHostImpl();this._inspectorWindow=this._iframe.contentWindow;this._inspectorWindow.InspectorFrontendHost=this._inspectorFrontendHostImpl;DevToolsAPI.setInspectorWindow(this._inspectorWindow);this._iframe.focus();this._iframe.addEventListener("load",this._onIframeLoad.bind(this),false);}
WebInspector.DevToolsApp.prototype={_onIframeLoad:function()
{function getValue(property)
{if(property=="padding-left"){return{getFloatValue:function(){return this.__paddingLeft;},__paddingLeft:parseFloat(this.paddingLeft)};}
throw new Error("getPropertyCSSValue is undefined");}
this._iframe.contentWindow.CSSStyleDeclaration.prototype.getPropertyCSSValue=getValue;this._iframe.contentWindow.CSSPrimitiveValue={CSS_PX:"CSS_PX"};var styleElement=this._iframe.contentWindow.document.createElement("style");styleElement.type="text/css";styleElement.textContent="html /deep/ * { min-width: 0; min-height: 0; }";this._iframe.contentWindow.document.head.appendChild(styleElement);}}
runOnWindowLoad(function(){new WebInspector.DevToolsApp();});;applicationDescriptor=[{"type":"autostart","name":"platform"},{"type":"autostart","name":"host"},{"type":"autostart","name":"common"},{"type":"autostart","name":"devtools_app"}];Runtime.startApplication("devtools");